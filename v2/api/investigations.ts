import type { SqlDatabase } from "../shared/sql-database.ts";
import { isHarvyDexId } from "../shared/harvydex.ts";
import { harvyErrorResponse } from "../shared/errors.ts";

type Product = "Newsk" | "Tower" | "Civic";
type ItemKind = "note" | "event" | "evidence" | "entity" | "relationship";
type EntityType = "person" | "organization" | "place" | "asset" | "public_body" | "other";
type Interpretation = "observed" | "inferred" | "disputed";

interface ActorScope { id: string; tenantId: string; workspaceId: string }

const PRODUCTS: Product[] = ["Newsk", "Tower", "Civic"];
const now = () => Date.now();
const likePattern = (value: string) => `%${value.replace(/[\\%_]/g, "\\$&")}%`;
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
const fail = (code: string, message: string, status: number, trace: string) => harvyErrorResponse(code, message, status, trace);

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) return {};
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16_384) { await reader.cancel(); throw new Error("too_large"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("invalid_json");
    return value as Record<string, unknown>;
  } catch { throw new Error("invalid_json"); }
}

function productFor(url: URL, body: Record<string, unknown> | null, allowed: readonly string[]): Product | null {
  const requested = body && typeof body.product === "string" ? body.product : url.searchParams.get("product");
  if (requested) return PRODUCTS.includes(requested as Product) && allowed.includes(requested) ? requested as Product : null;
  const available = PRODUCTS.filter((product) => allowed.includes(product));
  return available.length === 1 ? available[0] : null;
}

function text(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.trim().length >= min && value.length <= max;
}

export async function handleInvestigations(
  request: Request,
  db: SqlDatabase,
  actor: ActorScope,
  allowed: readonly string[],
  canRead: boolean,
  canEdit: boolean,
  trace: string,
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!/^\/api\/v1\/(investigations|entities|relationships|graph)(?:\/|$)/.test(path)) return null;
  if (!canRead) return fail("forbidden", "Investigation access denied.", 403, trace);

  const mutating = request.method === "POST" || request.method === "PATCH" || request.method === "DELETE";
  if (mutating && !canEdit) return fail("forbidden", "Investigation editing denied.", 403, trace);
  let body: Record<string, unknown> | null = null;
  if (request.method === "POST" || request.method === "PATCH" || request.method === "DELETE") {
    try { body = await readBody(request); }
    catch (error) { return fail(error instanceof Error && error.message === "too_large" ? "too_large" : "invalid_request", "Request body must be bounded JSON.", error instanceof Error && error.message === "too_large" ? 413 : 400, trace); }
  }
  const product = productFor(url, body, allowed);
  if (!product) return fail("forbidden", "Choose a product enabled for this organization.", 403, trace);
  const payload = body ?? {};
  const scope = [actor.tenantId, actor.workspaceId, product] as const;
  const investigation = path.match(/^\/api\/v1\/investigations\/([a-f0-9-]{36})$/i);
  const investigationItems = path.match(/^\/api\/v1\/investigations\/([a-f0-9-]{36})\/items(?:\/([a-f0-9-]{36}))?$/i);
  const entity = path.match(/^\/api\/v1\/entities\/([a-f0-9-]{36})$/i);

  if (path === "/api/v1/investigations" && request.method === "GET") {
    const rows = await db.prepare(`
      SELECT i.id, i.product, i.title, i.summary, i.status, i.revision, i.created_by, i.created_at, i.updated_at,
        COUNT(ii.id) AS item_count
      FROM harvy_v2_investigations i
      LEFT JOIN harvy_v2_investigation_items ii ON ii.tenant_id = i.tenant_id AND ii.workspace_id = i.workspace_id AND ii.product = i.product AND ii.investigation_id = i.id
      WHERE i.tenant_id = ? AND i.workspace_id = ? AND i.product = ?
      GROUP BY i.id ORDER BY i.updated_at DESC, i.id DESC LIMIT 100
    `).bind(...scope).all();
    return json({ items: rows.results });
  }

  if (path === "/api/v1/investigations" && request.method === "POST") {
    if (!text(payload.title, 1, 240) || (payload.summary !== undefined && !text(payload.summary, 0, 2000))) return fail("invalid_investigation", "Investigation title or summary is invalid.", 400, trace);
    const id = crypto.randomUUID();
    const timestamp = now();
    await db.prepare("INSERT INTO harvy_v2_investigations (id, tenant_id, workspace_id, product, title, summary, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, ...scope, payload.title.trim(), typeof payload.summary === "string" ? payload.summary : "", actor.id, timestamp, timestamp).run();
    const saved = await db.prepare("SELECT id, product, title, summary, status, revision, created_by, created_at, updated_at FROM harvy_v2_investigations WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ?")
      .bind(id, ...scope).first();
    return json(saved, 201);
  }

  if (investigation && request.method === "GET") {
    if (!isHarvyDexId(investigation[1])) return fail("not_found", "Investigation not found.", 404, trace);
    const saved = await db.prepare("SELECT id, product, title, summary, status, revision, created_by, created_at, updated_at FROM harvy_v2_investigations WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ?")
      .bind(investigation[1], ...scope).first();
    if (!saved) return fail("not_found", "Investigation not found.", 404, trace);
    const items = await db.prepare(`
      SELECT i.id, i.item_kind, i.target_event_id, i.target_evidence_id, i.target_entity_id, i.target_relationship_id,
        i.title, i.note, i.created_by, i.created_at,
        ev.title AS event_title, evidence.headline AS evidence_headline, evidence.publisher, evidence.source_url, evidence.captured_at,
        entity.display_name AS entity_name, relation.relationship_type
      FROM harvy_v2_investigation_items i
      LEFT JOIN harvy_v2_events ev ON ev.id = i.target_event_id AND ev.tenant_id = i.tenant_id AND ev.workspace_id = i.workspace_id AND ev.product = i.product
      LEFT JOIN harvy_v2_evidence evidence ON evidence.id = i.target_evidence_id AND evidence.tenant_id = i.tenant_id AND evidence.workspace_id = i.workspace_id AND evidence.product = i.product
      LEFT JOIN harvy_v2_entities entity ON entity.id = i.target_entity_id AND entity.tenant_id = i.tenant_id AND entity.workspace_id = i.workspace_id AND entity.product = i.product
      LEFT JOIN harvy_v2_relationships relation ON relation.id = i.target_relationship_id AND relation.tenant_id = i.tenant_id AND relation.workspace_id = i.workspace_id AND relation.product = i.product
      WHERE i.investigation_id = ? AND i.tenant_id = ? AND i.workspace_id = ? AND i.product = ?
      ORDER BY i.created_at DESC, i.id DESC LIMIT 100
    `).bind(investigation[1], ...scope).all();
    return json({ ...saved, items: items.results });
  }

  if (investigation && request.method === "PATCH") {
    if (!isHarvyDexId(investigation[1]) || !Number.isSafeInteger(payload.expected_revision) || (payload.expected_revision as number) < 1 ||
        Object.keys(payload).some((key) => !["product", "title", "summary", "status", "expected_revision"].includes(key)) ||
        (payload.title !== undefined && !text(payload.title, 1, 240)) || (payload.summary !== undefined && !text(payload.summary, 0, 2000)) ||
        (payload.status !== undefined && !["active", "archived"].includes(String(payload.status)))) return fail("invalid_investigation", "Investigation fields or revision are invalid.", 400, trace);
    const current = await db.prepare("SELECT title, summary, status, revision FROM harvy_v2_investigations WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ?")
      .bind(investigation[1], ...scope).first<{ title: string; summary: string; status: string; revision: number }>();
    if (!current) return fail("not_found", "Investigation not found.", 404, trace);
    if (current.revision !== payload.expected_revision) return fail("revision_conflict", "Investigation changed elsewhere; reload before saving.", 409, trace);
    const updated = await db.prepare("UPDATE harvy_v2_investigations SET title = ?, summary = ?, status = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ? AND revision = ?")
      .bind(typeof payload.title === "string" ? payload.title.trim() : current.title, typeof payload.summary === "string" ? payload.summary : current.summary,
        typeof payload.status === "string" ? payload.status : current.status, now(), investigation[1], ...scope, current.revision).run();
    if (!updated.meta.changes) return fail("revision_conflict", "Investigation changed elsewhere; reload before saving.", 409, trace);
    return json(await db.prepare("SELECT id, product, title, summary, status, revision, created_by, created_at, updated_at FROM harvy_v2_investigations WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ?")
      .bind(investigation[1], ...scope).first());
  }

  if (investigationItems && request.method === "POST" && !investigationItems[2]) {
    if (!isHarvyDexId(investigationItems[1]) || !text(body?.kind, 1, 20) || !["note", "event", "evidence", "entity", "relationship"].includes(String(body.kind)) ||
        !text(body?.title, 1, 240) || (body.note !== undefined && !text(body.note, 0, 5000))) return fail("invalid_investigation_item", "Investigation item is invalid.", 400, trace);
    const kind = body.kind as ItemKind;
    const targetId = body.target_id;
    if (kind === "note" ? targetId !== undefined && targetId !== null : !isHarvyDexId(targetId)) return fail("invalid_investigation_item", "A valid scoped item is required.", 400, trace);
    const casebook = await db.prepare("SELECT revision FROM harvy_v2_investigations WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ? AND status = 'active'")
      .bind(investigationItems[1], ...scope).first<{ revision: number }>();
    if (!casebook) return fail("not_found", "Active investigation not found.", 404, trace);
    const expectedRevision = body.expected_revision;
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== casebook.revision) return fail("revision_conflict", "Investigation changed elsewhere; reload before saving.", 409, trace);
    const targetColumn: Record<Exclude<ItemKind, "note">, string> = { event: "target_event_id", evidence: "target_evidence_id", entity: "target_entity_id", relationship: "target_relationship_id" };
    if (kind !== "note") {
      const table = { event: "harvy_v2_events", evidence: "harvy_v2_evidence", entity: "harvy_v2_entities", relationship: "harvy_v2_relationships" }[kind];
      const found = await db.prepare(`SELECT id FROM ${table} WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ?`)
        .bind(targetId as string, ...scope).first();
      if (!found) return fail("not_found", "The selected item is not available in this workspace.", 404, trace);
      const exists = await db.prepare(`SELECT id FROM harvy_v2_investigation_items WHERE investigation_id = ? AND tenant_id = ? AND workspace_id = ? AND product = ? AND ${targetColumn[kind] as string} = ?`)
        .bind(investigationItems[1], ...scope, targetId as string).first();
      if (exists) return json({ id: (exists as { id: string }).id, unchanged: true });
    }
    const itemId = crypto.randomUUID();
    const timestamp = now();
    const values: Record<string, string | null> = { target_event_id: null, target_evidence_id: null, target_entity_id: null, target_relationship_id: null };
    if (kind !== "note") values[targetColumn[kind] as string] = targetId as string;
    const results = await db.batch([
      db.prepare("UPDATE harvy_v2_investigations SET revision = revision + 1, updated_at = ? WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ? AND revision = ? AND status = 'active'")
        .bind(timestamp, investigationItems[1], ...scope, casebook.revision),
      db.prepare(`INSERT INTO harvy_v2_investigation_items (id, tenant_id, workspace_id, product, investigation_id, item_kind, target_event_id, target_evidence_id, target_entity_id, target_relationship_id, title, note, created_by, created_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE changes() = 1`)
        .bind(itemId, ...scope, investigationItems[1], kind, values.target_event_id, values.target_evidence_id, values.target_entity_id, values.target_relationship_id,
          body.title.trim(), typeof body.note === "string" ? body.note : "", actor.id, timestamp),
    ]);
    if (!results[0]?.meta.changes || !results[1]?.meta.changes) return fail("revision_conflict", "Investigation changed elsewhere; reload before saving.", 409, trace);
    return json({ id: itemId, revision: casebook.revision + 1 }, 201);
  }

  if (investigationItems && request.method === "DELETE" && investigationItems[2]) {
    if (!isHarvyDexId(investigationItems[1]) || !isHarvyDexId(investigationItems[2]) || !Number.isSafeInteger(payload.expected_revision)) return fail("invalid_investigation_item", "Investigation item or revision is invalid.", 400, trace);
    const current = await db.prepare("SELECT revision FROM harvy_v2_investigations WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ? AND status = 'active'")
      .bind(investigationItems[1], ...scope).first<{ revision: number }>();
    if (!current) return fail("not_found", "Active investigation not found.", 404, trace);
    if (current.revision !== payload.expected_revision) return fail("revision_conflict", "Investigation changed elsewhere; reload before saving.", 409, trace);
    const results = await db.batch([
      db.prepare("UPDATE harvy_v2_investigations SET revision = revision + 1, updated_at = ? WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ? AND revision = ? AND status = 'active'")
        .bind(now(), investigationItems[1], ...scope, current.revision),
      db.prepare("DELETE FROM harvy_v2_investigation_items WHERE id = ? AND investigation_id = ? AND tenant_id = ? AND workspace_id = ? AND product = ? AND changes() = 1")
        .bind(investigationItems[2], investigationItems[1], ...scope),
    ]);
    if (!results[0]?.meta.changes) return fail("revision_conflict", "Investigation changed elsewhere; reload before saving.", 409, trace);
    if (!results[1]?.meta.changes) return fail("not_found", "Investigation item not found.", 404, trace);
    return json({ deleted: true, revision: current.revision + 1 });
  }

  if (path === "/api/v1/entities" && request.method === "GET") {
    const query = url.searchParams.get("q")?.trim() || "";
    if (query.length > 120) return fail("invalid_search", "Entity search is limited to 120 characters.", 400, trace);
    const rows = await db.prepare(`SELECT id, product, entity_type, display_name, description, revision, created_by, created_at, updated_at
      FROM harvy_v2_entities WHERE tenant_id = ? AND workspace_id = ? AND product = ? AND (? = '' OR lower(display_name || ' ' || description) LIKE lower(?) ESCAPE '\\')
      ORDER BY display_name LIMIT 100`).bind(...scope, query, likePattern(query)).all();
    return json({ items: rows.results });
  }

  if (path === "/api/v1/entities" && request.method === "POST") {
    if (!text(body?.display_name, 1, 200) || (body.description !== undefined && !text(body.description, 0, 2000)) ||
        !["person", "organization", "place", "asset", "public_body", "other"].includes(String(body.entity_type))) return fail("invalid_entity", "Entity fields are invalid.", 400, trace);
    const id = crypto.randomUUID();
    const timestamp = now();
    await db.prepare("INSERT INTO harvy_v2_entities (id, tenant_id, workspace_id, product, entity_type, display_name, description, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, ...scope, body.entity_type, body.display_name.trim(), typeof body.description === "string" ? body.description : "", actor.id, timestamp, timestamp).run();
    return json(await db.prepare("SELECT id, product, entity_type, display_name, description, revision, created_by, created_at, updated_at FROM harvy_v2_entities WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ?")
      .bind(id, ...scope).first(), 201);
  }

  if (entity && request.method === "GET") {
    if (!isHarvyDexId(entity[1])) return fail("not_found", "Entity not found.", 404, trace);
    const saved = await db.prepare("SELECT id, product, entity_type, display_name, description, revision, created_by, created_at, updated_at FROM harvy_v2_entities WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ?")
      .bind(entity[1], ...scope).first();
    if (!saved) return fail("not_found", "Entity not found.", 404, trace);
    const relations = await db.prepare(`SELECT r.id, r.from_entity_id, r.to_entity_id, r.relationship_type, r.interpretation, r.notes, r.evidence_id, r.created_by, r.created_at,
      e.headline, e.publisher, e.source_url, e.captured_at
      FROM harvy_v2_relationships r JOIN harvy_v2_evidence e ON e.id = r.evidence_id AND e.tenant_id = r.tenant_id AND e.workspace_id = r.workspace_id AND e.product = r.product
      WHERE r.tenant_id = ? AND r.workspace_id = ? AND r.product = ? AND (r.from_entity_id = ? OR r.to_entity_id = ?) ORDER BY r.created_at DESC LIMIT 100`)
      .bind(...scope, entity[1], entity[1]).all();
    return json({ ...saved, relationships: relations.results });
  }

  if (path === "/api/v1/relationships" && request.method === "POST") {
    if (!isHarvyDexId(body?.from_entity_id) || !isHarvyDexId(body?.to_entity_id) || body.from_entity_id === body.to_entity_id ||
        !isHarvyDexId(body?.evidence_id) || !text(body.relationship_type, 1, 80) ||
        !["observed", "inferred", "disputed"].includes(String(body.interpretation)) ||
        (body.notes !== undefined && !text(body.notes, 0, 2000))) return fail("invalid_relationship", "A relationship requires two distinct entities, source evidence, and a supported interpretation.", 400, trace);
    const ids = [body.from_entity_id, body.to_entity_id] as string[];
    const found = await db.prepare("SELECT COUNT(*) AS count FROM harvy_v2_entities WHERE tenant_id = ? AND workspace_id = ? AND product = ? AND id IN (?, ?)")
      .bind(...scope, ...ids).first<{ count: number }>();
    if (found?.count !== 2) return fail("not_found", "Both entities must be in this workspace and product.", 404, trace);
    const evidence = await db.prepare("SELECT id FROM harvy_v2_evidence WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ?")
      .bind(body.evidence_id, ...scope).first();
    if (!evidence) return fail("not_found", "Source evidence is not available in this workspace.", 404, trace);
    const id = crypto.randomUUID();
    await db.prepare("INSERT INTO harvy_v2_relationships (id, tenant_id, workspace_id, product, from_entity_id, to_entity_id, relationship_type, interpretation, evidence_id, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, ...scope, body.from_entity_id, body.to_entity_id, body.relationship_type.trim(), body.interpretation, body.evidence_id,
        typeof body.notes === "string" ? body.notes : "", actor.id, now()).run();
    return json({ id, product, from_entity_id: body.from_entity_id, to_entity_id: body.to_entity_id, relationship_type: body.relationship_type.trim(), interpretation: body.interpretation, evidence_id: body.evidence_id }, 201);
  }

  if (path === "/api/v1/graph" && request.method === "GET") {
    const investigationId = url.searchParams.get("investigation_id");
    if (investigationId && !isHarvyDexId(investigationId)) return fail("invalid_graph_filter", "Investigation ID is invalid.", 400, trace);
    if (investigationId) {
      const casebook = await db.prepare("SELECT id FROM harvy_v2_investigations WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ?")
        .bind(investigationId, ...scope).first();
      if (!casebook) return fail("not_found", "Investigation not found.", 404, trace);
    }
    const edges = await db.prepare(`SELECT r.id, r.from_entity_id, r.to_entity_id, r.relationship_type, r.interpretation, r.evidence_id, r.notes,
      ev.headline, ev.publisher, ev.source_url, ev.captured_at
      FROM harvy_v2_relationships r JOIN harvy_v2_evidence ev ON ev.id = r.evidence_id AND ev.tenant_id = r.tenant_id AND ev.workspace_id = r.workspace_id AND ev.product = r.product
      WHERE r.tenant_id = ? AND r.workspace_id = ? AND r.product = ?
        AND (? IS NULL OR EXISTS (SELECT 1 FROM harvy_v2_investigation_items i WHERE i.investigation_id = ? AND i.tenant_id = r.tenant_id AND i.workspace_id = r.workspace_id AND i.product = r.product AND (i.target_relationship_id = r.id OR i.target_entity_id IN (r.from_entity_id, r.to_entity_id))))
      ORDER BY r.created_at DESC LIMIT 100`).bind(...scope, investigationId, investigationId).all<Record<string, unknown>>();
    const ids = [...new Set(edges.results.flatMap((edge) => [edge.from_entity_id as string, edge.to_entity_id as string]))];
    const nodes = ids.length ? await db.prepare(`SELECT id, entity_type, display_name, description, revision FROM harvy_v2_entities WHERE tenant_id = ? AND workspace_id = ? AND product = ? AND id IN (${ids.map(() => "?").join(",")}) ORDER BY display_name`)
      .bind(...scope, ...ids).all() : { results: [] };
    return json({ nodes: nodes.results, edges: edges.results, capped: edges.results.length === 100 });
  }

  return fail("not_found", "Unknown investigation route.", 404, trace);
}
