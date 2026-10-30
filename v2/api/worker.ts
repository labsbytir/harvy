/** Harvy API: authenticated, tenant-scoped product operations and Automation dispatch. */
import type { D1Database, Fetcher } from "@cloudflare/workers-types";
import { canTransitionAutomationRun, isSafeSourceUrl, parseAutomationRunRequest } from "../shared/automation-run.ts";
import { harvyErrorResponse } from "../shared/errors.ts";
import { parseHqlQuery } from "../shared/hql.ts";
import { isHarvyDexId } from "../shared/harvydex.ts";
import { parseArtifactManifest, type ArtifactManifest } from "../shared/artifacts.ts";
import { isDashboardConfig, isPersistedDashboardConfig } from "../shared/dashboard-config.ts";
import { createAnalyticsLayer, hqlToSemanticQuery, normalizeCubeQuery } from "./analytics.ts";

interface Actor { id: string; tenantId: string; workspaceId: string; tenantName: string; role: string; harvyAdmin: boolean }
interface Env {
  HARVY_D1: D1Database;
  AUTH: Fetcher;
  AUTOMATION_URL?: string;
  AUTOMATION_DISPATCH_TOKEN?: string;
  AUTOMATION_CALLBACK_SECRET?: string;
  HARVY_RAW?: R2Bucket;
  HARVY_ARTIFACTS?: R2Bucket;
}

const PRODUCTS = ["Newsk", "Tower", "Ops", "Civic"] as const;
type Product = typeof PRODUCTS[number];
type RunStatus = "queued" | "running" | "succeeded" | "partial" | "failed" | "cancelled";
const now = () => Date.now();
const DISPATCH_CLAIM_LEASE_MS = 30_000;
const traceId = () => crypto.randomUUID();
const json = (data: unknown, status = 200, headers: HeadersInit = {}) => Response.json(data, {
  status, headers: { "Cache-Control": "private, no-store", ...headers },
});
const fail = (code: string, message: string, status: number, trace: string) => harvyErrorResponse(code, message, status, trace);

async function bodyJson(request: Request, maxBytes = 65_536): Promise<Record<string, unknown>> {
  const text = await readBoundedText(request, maxBytes);
  let value: unknown;
  try { value = JSON.parse(text) as unknown; } catch { throw new Error("invalid_json"); }
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("invalid_json");
  return value as Record<string, unknown>;
}

async function readBoundedText(request: Request, maxBytes: number): Promise<string> {
  if (Number(request.headers.get("content-length") || 0) > maxBytes) throw new Error("too_large");
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("too_large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

async function actor(request: Request, env: Env): Promise<Actor | null> {
  try {
    const authRequest = new Request("https://auth.internal/__internal/actor", { headers: request.headers });
    const response = await env.AUTH.fetch(authRequest);
    if (!response.ok) return null;
    const value = await response.json() as Partial<Actor>;
    if (typeof value.id !== "string" || typeof value.tenantId !== "string" ||
        typeof value.workspaceId !== "string" || typeof value.tenantName !== "string" || typeof value.role !== "string") return null;
    return { ...value, harvyAdmin: value.harvyAdmin === true } as Actor;
  } catch { return null; }
}

function capabilities(role: string, harvyAdmin = false): string[] {
  const read = ["query.view", "events.view", "evidence.view", "stories.view", "dashboards.view", "monitors.view", "runs.view", "ops.actions.view"];
  const platform = harvyAdmin ? ["entitlements.manage"] : [];
  if (role === "platform_admin") return platform;
  if (["owner", "admin"].includes(role)) return [...read, "events.edit", "stories.edit", "stories.handoff", "events.handoff", "ops.actions.edit", "monitors.manage", "runs.manage", "dashboards.edit", "members.manage", ...platform];
  if (role === "viewer") return [...read, ...platform];
  if (["member", "editor", "analyst"].includes(role)) return [...read, "events.edit", "stories.edit", "stories.handoff", "events.handoff", "ops.actions.edit", "runs.manage", "dashboards.edit", ...platform];
  return platform;
}

async function allowedProducts(db: D1Database, tenantId: string): Promise<Product[]> {
  const result = await db.prepare(
    "SELECT product FROM harvy_v2_product_entitlements WHERE tenant_id = ? AND enabled = 1",
  ).bind(tenantId).all<{ product: string }>();
  const products = result.results.map((row) => row.product).filter((p): p is Product => PRODUCTS.includes(p as Product));
  return products;
}

async function entitlementRevision(db: D1Database, tenantId: string): Promise<number> {
  const row = await db.prepare("SELECT SUM(revision) AS revision FROM harvy_v2_product_entitlements WHERE tenant_id = ?")
    .bind(tenantId).first<{ revision: number | null }>();
  return Math.max(1, row?.revision || 1);
}

async function entitledProduct(db: D1Database, tenantId: string, requested: string | null): Promise<Product | null> {
  const products = await allowedProducts(db, tenantId);
  if (requested) return PRODUCTS.includes(requested as Product) && products.includes(requested as Product) ? requested as Product : null;
  return products.length === 1 ? products[0] : null;
}

function has(actor: Actor, capability: string): boolean {
  return capabilities(actor.role, actor.harvyAdmin).includes(capability);
}

function parseTime(value: string | null): number | null | false {
  if (value === null) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : false;
}

function automationEndpoint(value: string | undefined): URL | null {
  if (!value || !isSafeSourceUrl(value)) return null;
  try {
    const url = new URL(value);
    return url.pathname === "/" && !url.search ? new URL("/webhook/internal/v1/scrape-runs", url.origin) : null;
  } catch { return null; }
}

async function eventDetail(db: D1Database, a: Actor, id: string, product: Product) {
  const event = await db.prepare(
    "SELECT id, product, title, summary, status, assigned_to, revision, first_seen_at, last_seen_at FROM harvy_v2_events WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ?",
  ).bind(id, a.tenantId, a.workspaceId, product).first();
  if (!event) return null;
  const evidence = await db.prepare(
    "SELECT id, source_id, source_url, publisher, headline, excerpt, captured_at, artifact_id FROM harvy_v2_evidence WHERE event_id = ? AND tenant_id = ? AND workspace_id = ? AND product = ? ORDER BY captured_at DESC LIMIT 100",
  ).bind(id, a.tenantId, a.workspaceId, product).all();
  const activity = await db.prepare(
    "SELECT revision, status, assigned_to, changed_by, changed_at FROM harvy_v2_event_activity WHERE event_id = ? AND tenant_id = ? AND workspace_id = ? AND product = ? ORDER BY revision DESC LIMIT 50",
  ).bind(id, a.tenantId, a.workspaceId, product).all();
  return { ...event, evidence: evidence.results, activity: activity.results };
}

async function listEvents(request: Request, db: D1Database, a: Actor, product: Product) {
  const q = new URL(request.url).searchParams;
  const search = q.get("q")?.trim() || "";
  if (search.length > 200) return { error: "invalid_search" as const };
  const from = parseTime(q.get("from"));
  const to = parseTime(q.get("to"));
  if (from === false || to === false || (from !== null && to !== null && from > to)) return { error: "invalid_time_range" as const };
  const status = q.get("status");
  if (status && !["new", "reviewing", "saved", "closed"].includes(status)) return { error: "invalid_status" as const };
  const source = q.get("source_id");
  const limit = Math.min(100, Math.max(1, Number.parseInt(q.get("limit") || "50", 10) || 50));
  const cursor = q.get("before");
  const [cursorTimeText, cursorId, ...extraCursorParts] = cursor?.split(":") || [];
  const cursorTime = cursor ? Number(cursorTimeText) : null;
  if (cursor && (!Number.isSafeInteger(cursorTime) || cursorTime! < 0 || !/^[a-f0-9-]{36}$/i.test(cursorId || "") || extraCursorParts.length)) return { error: "invalid_cursor" as const };
  const where = ["e.tenant_id = ?", "e.workspace_id = ?", "e.product = ?"];
  const args: (string | number)[] = [a.tenantId, a.workspaceId, product];
  if (search) { where.push("instr(lower(e.title || ' ' || e.summary), lower(?)) > 0"); args.push(search); }
  if (from !== null) { where.push("e.last_seen_at >= ?"); args.push(from); }
  if (to !== null) { where.push("e.last_seen_at <= ?"); args.push(to); }
  if (status) { where.push("e.status = ?"); args.push(status); }
  if (source) {
    where.push("EXISTS (SELECT 1 FROM harvy_v2_evidence ev WHERE ev.event_id = e.id AND ev.tenant_id = e.tenant_id AND ev.workspace_id = e.workspace_id AND ev.product = e.product AND ev.source_id = ?)");
    args.push(source);
  }
  if (cursorTime !== null) { where.push("(e.last_seen_at < ? OR (e.last_seen_at = ? AND e.id < ?))"); args.push(cursorTime, cursorTime, cursorId); }
  args.push(limit + 1);
  const rows = await db.prepare(
    `SELECT e.id, e.product, e.title, e.summary, e.status, e.assigned_to, e.revision, e.first_seen_at, e.last_seen_at,
      (SELECT COUNT(*) FROM harvy_v2_evidence ev WHERE ev.event_id = e.id AND ev.tenant_id = e.tenant_id AND ev.workspace_id = e.workspace_id) AS evidence_count
     FROM harvy_v2_events e WHERE ${where.join(" AND ")} ORDER BY e.last_seen_at DESC, e.id DESC LIMIT ?`,
  ).bind(...args).all<Record<string, unknown>>();
  const hasMore = rows.results.length > limit;
  const items = rows.results.slice(0, limit);
  const last = items[items.length - 1] as { last_seen_at?: number; id?: string } | undefined;
  return { items, next_cursor: hasMore && last ? `${last.last_seen_at}:${last.id}` : null };
}

async function updateStory(db: D1Database, a: Actor, id: string, body: Record<string, unknown>) {
  if (!has(a, "stories.edit")) return { status: 403 as const, code: "forbidden" };
  const current = await db.prepare(
    "SELECT revision, status FROM harvy_v2_stories WHERE id = ? AND tenant_id = ? AND workspace_id = ?",
  ).bind(id, a.tenantId, a.workspaceId).first<{ revision: number; status: string }>();
  if (!current) return { status: 404 as const, code: "not_found" };
  if (current.status === "handed_off") return { status: 409 as const, code: "story_handed_off" };
  if (!Number.isInteger(body.revision) || body.revision !== current.revision) return { status: 409 as const, code: "revision_conflict" };
  const title = body.title;
  const notes = body.notes;
  const status = body.status;
  if (typeof title !== "string" || title.trim().length < 1 || title.length > 240 ||
      typeof notes !== "string" || notes.length > 20_000 ||
      !["draft", "ready", "archived"].includes(String(status))) return { status: 400 as const, code: "invalid_story" };
  const updated = now();
  const result = await db.prepare(
    "UPDATE harvy_v2_stories SET title = ?, notes = ?, status = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND revision = ?",
  ).bind(title.trim(), notes, status, updated, id, a.tenantId, a.workspaceId, current.revision).run();
  if (!result.meta.changes) return { status: 409 as const, code: "revision_conflict" };
  return { status: 200 as const, story: await db.prepare(
    "SELECT id, event_id, title, notes, status, revision, created_at, updated_at FROM harvy_v2_stories WHERE id = ? AND tenant_id = ? AND workspace_id = ?",
  ).bind(id, a.tenantId, a.workspaceId).first() };
}

async function markDispatchFailure(db: D1Database, runId: string, tenantId: string, traceId: string, code: string, message: string) {
  const result = await db.prepare("UPDATE harvy_v2_runs SET status = 'failed', error_code = ?, updated_at = ? WHERE id = ? AND tenant_id = ? AND status = 'queued'")
    .bind(code, now(), runId, tenantId).run();
  if (result.meta.changes) return fail(code, message, 502, traceId);
  const current = await db.prepare("SELECT status, trace_id FROM harvy_v2_runs WHERE id = ? AND tenant_id = ?")
    .bind(runId, tenantId).first<{ status: RunStatus; trace_id: string }>();
  return current ? json({ run_id: runId, status: current.status, trace_id: current.trace_id }, 202) : fail("run_not_found", "Run state was lost.", 500, traceId);
}

async function markDispatchUnconfirmed(db: D1Database, runId: string, tenantId: string, traceId: string, idempotencyKey: string) {
  const result = await db.prepare("UPDATE harvy_v2_runs SET error_code = 'dispatch_unconfirmed', updated_at = ? WHERE id = ? AND tenant_id = ? AND status = 'queued'")
    .bind(now(), runId, tenantId).run();
  if (result.meta.changes) return json({ run_id: runId, status: "queued", error_code: "dispatch_unconfirmed", idempotency_key: idempotencyKey, trace_id: traceId }, 202);
  const current = await db.prepare("SELECT status, error_code, trace_id FROM harvy_v2_runs WHERE id = ? AND tenant_id = ?")
    .bind(runId, tenantId).first<{ status: RunStatus; error_code: string | null; trace_id: string }>();
  return current ? json({ run_id: runId, status: current.status, error_code: current.error_code, idempotency_key: idempotencyKey, trace_id: current.trace_id }, 202) : fail("run_not_found", "Run state was lost.", 500, traceId);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const trace = traceId();
    const { pathname } = url;

    if (pathname === "/health" && request.method === "GET") return json({ status: "ok", time: new Date().toISOString() }, 200, { "Cache-Control": "no-store" });
    if (pathname === "/internal/v1/automation-callback" && request.method === "POST") return automationCallback(request, env, trace);
    if (pathname === "/internal/v1/automation-publications" && request.method === "POST") return automationPublication(request, env, trace);

    if (!pathname.startsWith("/api/v1/")) return fail("not_found", "Unknown route.", 404, trace);
    if (!env.HARVY_D1) return fail("unavailable", "Harvy storage is not configured.", 503, trace);
    const a = await actor(request, env);
    if (!a) return fail("unauthorized", "Sign in and select an organization.", 401, trace);
    const db = env.HARVY_D1;

    const cubeRoute = pathname.match(/^\/api\/v1\/cube\/(meta|load)$/);
    if (cubeRoute && (request.method === "GET" || request.method === "POST")) {
      if (!has(a, "query.view")) return fail("forbidden", "Analytics access denied.", 403, trace);
      const product = await entitledProduct(db, a.tenantId, request.headers.get("x-harvy-product"));
      if (!product) return fail("forbidden", "Choose a product enabled for this organization.", 403, trace);
      const layer = createAnalyticsLayer(db);
      const scope = { tenantId: a.tenantId, workspaceId: a.workspaceId, products: [product] };
      if (cubeRoute[1] === "meta" && request.method === "GET") return json({ cubes: layer.getMetadata(scope) });
      let rawQuery: unknown;
      if (request.method === "GET") {
        const encoded = url.searchParams.get("query");
        if (!encoded || new TextEncoder().encode(encoded).byteLength > 65_536) return fail("invalid_query", "Cube query is missing or too large.", 400, trace);
        try { rawQuery = JSON.parse(encoded); } catch { return fail("invalid_query", "Cube query must be JSON.", 400, trace); }
      } else {
        try { rawQuery = await bodyJson(request); } catch (e) { return fail("invalid_query", "Cube query must be bounded JSON.", e instanceof Error && e.message === "too_large" ? 413 : 400, trace); }
      }
      const query = normalizeCubeQuery(rawQuery);
      if (!query) return fail("invalid_query", "Cube query is outside the supported, bounded query contract.", 400, trace);
      try { return json(await layer.execute(query, scope)); }
      catch { return fail("query_failed", "The authorized analytics query failed.", 400, trace); }
    }

    if (pathname === "/api/v1/context" && request.method === "GET") {
      const products = await allowedProducts(db, a.tenantId);
      return json({
        principalId: a.id, tenantId: a.tenantId, workspaceId: a.workspaceId, tenantName: a.tenantName,
        role: a.role, allowedProducts: products, capabilities: capabilities(a.role, a.harvyAdmin),
        featureRevision: String(await entitlementRevision(db, a.tenantId)), ontologySchemaRevision: "1", hqlVersion: 1,
        serviceHealth: { api: "available", automation: automationEndpoint(env.AUTOMATION_URL) && env.AUTOMATION_DISPATCH_TOKEN ? "configured" : "unavailable" },
      });
    }

    if (pathname === "/api/v1/entitlements" && (request.method === "GET" || request.method === "PUT")) {
      if (!has(a, "entitlements.manage")) return fail("forbidden", "Harvy platform administration is required to manage product access.", 403, trace);
      if (request.method === "GET") {
        const rows = await db.prepare("SELECT product, enabled, revision FROM harvy_v2_product_entitlements WHERE tenant_id = ?")
          .bind(a.tenantId).all<{ product: string; enabled: number; revision: number }>();
        const current = new Map(rows.results.map((row) => [row.product, row]));
        return json({ items: PRODUCTS.map((product) => {
          const row = current.get(product);
          return { product, enabled: row?.enabled === 1, revision: row?.revision ?? 0 };
        }) });
      }
      let body: unknown;
      try { body = await bodyJson(request); } catch (e) { return fail("invalid_request", "Invalid entitlement request.", e instanceof Error && e.message === "too_large" ? 413 : 400, trace); }
      const b = body as Record<string, unknown>;
      if (Object.keys(b).some((key) => !["product", "enabled", "expected_revision"].includes(key)) ||
          !PRODUCTS.includes(b.product as Product) || typeof b.enabled !== "boolean" ||
          !Number.isSafeInteger(b.expected_revision) || (b.expected_revision as number) < 0) {
        return fail("invalid_entitlement", "Product, enabled state, and expected revision are required.", 400, trace);
      }
      const product = b.product as Product;
      const enabled = b.enabled as boolean;
      const expected = b.expected_revision as number;
      const current = await db.prepare("SELECT enabled, revision FROM harvy_v2_product_entitlements WHERE tenant_id = ? AND product = ?")
        .bind(a.tenantId, product).first<{ enabled: number; revision: number }>();
      if (current?.enabled === Number(enabled)) return json({ product, enabled, revision: current.revision });
      if ((current?.revision ?? 0) !== expected) return fail("revision_conflict", "Product access changed elsewhere; reload before saving.", 409, trace);
      const revision = (current?.revision ?? 0) + 1;
      const changedAt = now();
      const entitlementWrite = current
        ? db.prepare("UPDATE harvy_v2_product_entitlements SET enabled = ?, revision = ?, updated_at = ? WHERE tenant_id = ? AND product = ? AND revision = ?")
          .bind(Number(enabled), revision, changedAt, a.tenantId, product, expected)
        : db.prepare("INSERT OR IGNORE INTO harvy_v2_product_entitlements (tenant_id, product, enabled, revision, updated_at) VALUES (?, ?, ?, 1, ?)")
          .bind(a.tenantId, product, Number(enabled), changedAt);
      const auditWrite = db.prepare("INSERT OR IGNORE INTO harvy_v2_product_entitlement_audit (id, tenant_id, product, enabled, revision, changed_by, changed_at) SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM harvy_v2_product_entitlements WHERE tenant_id = ? AND product = ? AND enabled = ? AND revision = ?)")
        .bind(crypto.randomUUID(), a.tenantId, product, Number(enabled), revision, a.id, changedAt, a.tenantId, product, Number(enabled), revision);
      const results = await db.batch([entitlementWrite, auditWrite]);
      if (!results[0]?.meta.changes) {
        const latest = await db.prepare("SELECT enabled, revision FROM harvy_v2_product_entitlements WHERE tenant_id = ? AND product = ?")
          .bind(a.tenantId, product).first<{ enabled: number; revision: number }>();
        if (latest?.enabled === Number(enabled)) return json({ product, enabled, revision: latest.revision });
        return fail("revision_conflict", "Product access changed elsewhere; reload before saving.", 409, trace);
      }
      return json({ product, enabled, revision });
    }

    if (pathname === "/api/v1/admin/audit" && request.method === "GET") {
      if (!has(a, "entitlements.manage")) return fail("forbidden", "Harvy platform administration is required to view audit records.", 403, trace);
      const limit = Number(url.searchParams.get("limit") ?? 50);
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) return fail("invalid_audit_query", "Audit limit must be between 1 and 100.", 400, trace);
      type AuditRow = { id: string; kind: "product_entitlement" | "monitor_state" | "dashboard_state"; tenant_id: string; workspace_id: string | null; product: Product; subject_id: string; subject_label: string; enabled: number | null; action: string; revision: number; changed_by: string; changed_at: number };
      const rows = await db.prepare(`
        SELECT * FROM (
          SELECT id, 'product_entitlement' AS kind, tenant_id, NULL AS workspace_id, product, product AS subject_id, product AS subject_label, enabled, CASE WHEN enabled = 1 THEN 'granted' ELSE 'revoked' END AS action, revision, changed_by, changed_at
          FROM harvy_v2_product_entitlement_audit
          UNION ALL
          SELECT a.source_id || ':' || a.revision AS id, 'monitor_state' AS kind, a.tenant_id, a.workspace_id, s.product, a.source_id AS subject_id, s.label AS subject_label, a.enabled, CASE WHEN a.enabled = 1 THEN 'resumed' ELSE 'paused' END AS action, a.revision, a.changed_by, a.changed_at
          FROM harvy_v2_source_state_audit a
          JOIN harvy_v2_sources s ON s.tenant_id = a.tenant_id AND s.workspace_id = a.workspace_id AND s.id = a.source_id
          UNION ALL
          SELECT d.dashboard_id || ':' || d.revision AS id, 'dashboard_state' AS kind, d.tenant_id, d.workspace_id, d.product, d.dashboard_id AS subject_id, d.label AS subject_label, NULL AS enabled, d.operation AS action, d.revision, d.changed_by, d.changed_at
          FROM harvy_v2_dashboard_audit d
        ) ORDER BY changed_at DESC, id DESC LIMIT ?
      `).bind(limit).all<AuditRow>();
      return json({ items: rows.results.map((row) => ({ ...row, enabled: row.enabled === null ? null : row.enabled === 1 })) });
    }

    if (pathname === "/api/v1/sources" && request.method === "GET") {
      if (!has(a, "monitors.view")) return fail("forbidden", "Source access denied.", 403, trace);
      const product = await entitledProduct(db, a.tenantId, url.searchParams.get("product"));
      if (!product) return fail("forbidden", "Choose a product enabled for this organization.", 403, trace);
      const sourceFilter = has(a, "monitors.manage") ? "" : "AND enabled = 1";
      const rows = await db.prepare(
        `SELECT id, product, publisher, label, enabled, revision, created_at, updated_at FROM harvy_v2_sources WHERE tenant_id = ? AND workspace_id = ? AND product = ? AND approval_status = 'approved' AND approved_at IS NOT NULL ${sourceFilter} ORDER BY label LIMIT 200`,
      ).bind(a.tenantId, a.workspaceId, product).all();
      return json({ items: rows.results });
    }

    const sourceStateMatch = pathname.match(/^\/api\/v1\/sources\/([a-f0-9-]{36})$/i);
    if (sourceStateMatch && request.method === "PATCH") {
      if (!has(a, "monitors.manage")) return fail("forbidden", "Monitor access denied.", 403, trace);
      const product = await entitledProduct(db, a.tenantId, url.searchParams.get("product"));
      if (!product) return fail("forbidden", "Choose a product enabled for this organization.", 403, trace);
      let body: unknown;
      try { body = await bodyJson(request); } catch (e) { return fail("invalid_request", "Invalid request body.", e instanceof Error && e.message === "too_large" ? 413 : 400, trace); }
      const b = body as Record<string, unknown>;
      if (typeof b.enabled !== "boolean" || !Number.isInteger(b.expected_revision) || (b.expected_revision as number) < 1) return fail("invalid_source_state", "Enabled state and expected revision are required.", 400, trace);
      const current = await db.prepare("SELECT enabled, revision FROM harvy_v2_sources WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ? AND approval_status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL")
        .bind(sourceStateMatch[1], a.tenantId, a.workspaceId, product).first<{ enabled: number; revision: number }>();
      if (!current) return fail("not_found", "Approved monitor not found.", 404, trace);
      if (current.revision !== b.expected_revision) return fail("revision_conflict", "Monitor changed elsewhere; reload before saving.", 409, trace);
      if (current.enabled === Number(b.enabled)) return json({ id: sourceStateMatch[1], enabled: b.enabled, revision: current.revision });
      const changedAt = now();
      const result = await db.prepare("UPDATE harvy_v2_sources SET enabled = ?, revision = revision + 1, updated_at = ?, state_changed_by = ? WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ? AND approval_status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL AND revision = ?")
        .bind(Number(b.enabled), changedAt, a.id, sourceStateMatch[1], a.tenantId, a.workspaceId, product, current.revision).run();
      if (!result.meta.changes) return fail("revision_conflict", "Monitor changed elsewhere; reload before saving.", 409, trace);
      return json({ id: sourceStateMatch[1], enabled: b.enabled, revision: current.revision + 1 });
    }

    if (pathname === "/api/v1/search" && request.method === "GET") {
      if (!has(a, "query.view")) return fail("forbidden", "Workspace search is not allowed.", 403, trace);
      const product = await entitledProduct(db, a.tenantId, url.searchParams.get("product"));
      if (!product) return fail("forbidden", "Choose a product enabled for this organization.", 403, trace);
      const term = url.searchParams.get("q")?.trim() || "";
      const rawLimit = url.searchParams.get("limit");
      const limit = rawLimit === null ? 10 : Number(rawLimit);
      if (term.length > 120 || !Number.isInteger(limit) || limit < 1 || limit > 20) return fail("invalid_search", "Search is limited to 120 characters and 20 results.", 400, trace);
      if (term.length < 2) return json({ items: [] });
      const from = parseTime(url.searchParams.get("from"));
      const to = parseTime(url.searchParams.get("to"));
      if (from === false || to === false || (from !== null && to !== null && from > to)) return fail("invalid_time_range", "Search time bounds are invalid.", 400, trace);

      const eventUrl = new URL("/api/v1/events", url.origin);
      eventUrl.searchParams.set("product", product);
      eventUrl.searchParams.set("q", term);
      eventUrl.searchParams.set("limit", String(limit));
      if (url.searchParams.has("from")) eventUrl.searchParams.set("from", url.searchParams.get("from")!);
      if (url.searchParams.has("to")) eventUrl.searchParams.set("to", url.searchParams.get("to")!);
      const [eventResult, evidence, stories, dashboards, actions] = await Promise.all([
        listEvents(new Request(eventUrl), db, a, product),
        db.prepare("SELECT e.id, ev.id AS event_id, ev.product, e.headline AS title, e.publisher, ev.title AS event_title, e.captured_at AS updated_at FROM harvy_v2_evidence e JOIN harvy_v2_events ev ON ev.id = e.event_id AND ev.tenant_id = e.tenant_id AND ev.workspace_id = e.workspace_id AND ev.product = e.product WHERE e.tenant_id = ? AND e.workspace_id = ? AND e.product = ? AND ev.product = ? AND instr(lower(e.headline || ' ' || e.publisher || ' ' || e.excerpt), lower(?)) > 0 AND (? IS NULL OR e.captured_at >= ?) AND (? IS NULL OR e.captured_at <= ?) ORDER BY e.captured_at DESC LIMIT ?")
          .bind(a.tenantId, a.workspaceId, product, product, term, from, from, to, to, limit).all<{ id: string; event_id: string; product: string; title: string; publisher: string; event_title: string; updated_at: number }>(),
        product === "Newsk"
          ? db.prepare("SELECT id, product, event_id, title, notes AS description, updated_at FROM harvy_v2_stories WHERE tenant_id = ? AND workspace_id = ? AND instr(lower(title || ' ' || notes), lower(?)) > 0 AND (? IS NULL OR updated_at >= ?) AND (? IS NULL OR updated_at <= ?) ORDER BY updated_at DESC LIMIT ?")
            .bind(a.tenantId, a.workspaceId, term, from, from, to, to, limit).all<{ id: string; product: string; event_id: string; title: string; description: string; updated_at: number }>()
          : Promise.resolve({ results: [] as Array<{ id: string; product: string; event_id: string; title: string; description: string; updated_at: number }> }),
        db.prepare("SELECT id, product, title, description, config_json, updated_at FROM harvy_v2_dashboards WHERE tenant_id = ? AND workspace_id = ? AND product = ? AND deleted_at IS NULL AND (visibility = 'workspace' OR owner_principal_id = ?) AND instr(lower(title || ' ' || description), lower(?)) > 0 AND (? IS NULL OR updated_at >= ?) AND (? IS NULL OR updated_at <= ?) ORDER BY updated_at DESC LIMIT ?")
          .bind(a.tenantId, a.workspaceId, product, a.id, term, from, from, to, to, limit).all<{ id: string; product: string; title: string; description: string; config_json: string; updated_at: number }>(),
        product === "Ops"
          ? db.prepare("SELECT a.id, a.source_event_id AS event_id, a.source_product, COALESCE(s.title, e.title) AS title, e.summary AS description, a.updated_at FROM harvy_v2_ops_actions a JOIN harvy_v2_events e ON e.id = a.source_event_id AND e.tenant_id = a.tenant_id AND e.workspace_id = a.workspace_id AND e.product = a.source_product LEFT JOIN harvy_v2_stories s ON s.id = a.source_story_id AND s.tenant_id = a.tenant_id AND s.workspace_id = a.workspace_id AND s.product = a.source_product AND s.event_id = a.source_event_id WHERE a.tenant_id = ? AND a.workspace_id = ? AND instr(lower(COALESCE(s.title, '') || ' ' || e.title || ' ' || e.summary), lower(?)) > 0 AND (? IS NULL OR a.updated_at >= ?) AND (? IS NULL OR a.updated_at <= ?) ORDER BY a.updated_at DESC LIMIT ?")
            .bind(a.tenantId, a.workspaceId, term, from, from, to, to, limit).all<{ id: string; event_id: string; source_product: Product; title: string; description: string; updated_at: number }>()
          : Promise.resolve({ results: [] as Array<{ id: string; event_id: string; source_product: Product; title: string; description: string; updated_at: number }> }),
      ]);
      if ("error" in eventResult) return fail("invalid_search", "Search filters are invalid.", 400, trace);
      const eventItems = eventResult.items as Array<{ id: string; product: string; title: string; summary: string; last_seen_at: number }>;
      const dashboardItems = dashboards.results.flatMap((item) => {
        try { return isDashboardConfig(JSON.parse(item.config_json)) ? [{ type: "dashboard", id: item.id, product: item.product, title: item.title, description: item.description, updated_at: item.updated_at }] : []; }
        catch { return []; }
      });
      const items = [
        ...eventItems.map((item) => ({ type: "event", id: item.id, product: item.product, title: item.title, description: item.summary, updated_at: item.last_seen_at })),
        ...evidence.results.map((item) => ({ type: "evidence", id: item.id, event_id: item.event_id, product: item.product, title: item.title, description: `${item.publisher} · ${item.event_title}`, updated_at: item.updated_at })),
        ...stories.results.map((item) => ({ type: "story", ...item })),
        ...dashboardItems,
        ...actions.results.map((item) => ({ type: "action", id: item.id, product: "Ops", event_id: item.event_id, source_product: item.source_product, title: item.title, description: item.description, updated_at: item.updated_at })),
      ].sort((left, right) => right.updated_at - left.updated_at || left.title.localeCompare(right.title)).slice(0, limit);
      return json({ items });
    }

    if (pathname === "/api/v1/events" && request.method === "GET") {
      if (!has(a, "events.view")) return fail("forbidden", "Event access denied.", 403, trace);
      const product = await entitledProduct(db, a.tenantId, url.searchParams.get("product"));
      if (!product) return fail("forbidden", "Choose a product enabled for this organization.", 403, trace);
      const result = await listEvents(request, db, a, product);
      if ("error" in result && result.error) return fail(result.error, "Event filters are invalid.", 400, trace);
      return json(result);
    }

    const eventMatch = pathname.match(/^\/api\/v1\/events\/([a-f0-9-]{36})$/i);
    if (eventMatch && request.method === "GET") {
      if (!has(a, "evidence.view")) return fail("forbidden", "Evidence access denied.", 403, trace);
      const product = await entitledProduct(db, a.tenantId, url.searchParams.get("product"));
      if (!product) return fail("forbidden", "Choose a product enabled for this organization.", 403, trace);
      const result = await eventDetail(db, a, eventMatch[1], product);
      return result ? json(result) : fail("not_found", "Event not found.", 404, trace);
    }
    if (eventMatch && request.method === "PATCH") {
      if (!has(a, "events.edit")) return fail("forbidden", "Event updates denied.", 403, trace);
      const product = await entitledProduct(db, a.tenantId, url.searchParams.get("product"));
      if (!product) return fail("forbidden", "Choose a product enabled for this organization.", 403, trace);
      let body: unknown;
      try { body = await bodyJson(request); } catch (e) { return fail(e instanceof Error && e.message === "too_large" ? "too_large" : "invalid_request", "Invalid request body.", e instanceof Error && e.message === "too_large" ? 413 : 400, trace); }
      if (typeof body !== "object" || body === null || Array.isArray(body)) return fail("invalid_event_update", "Event status, assignment, and revision are invalid.", 400, trace);
      const update = body as Record<string, unknown>;
      const allowed = ["status", "assigned_to", "expected_revision"];
      if (Object.keys(update).some((key) => !allowed.includes(key)) || !Number.isSafeInteger(update.expected_revision) || (update.expected_revision as number) < 1) {
        return fail("invalid_event_update", "Event status, assignment, and revision are invalid.", 400, trace);
      }
      const hasStatus = Object.hasOwn(update, "status");
      const hasAssignee = Object.hasOwn(update, "assigned_to");
      if (!hasStatus && !hasAssignee) return fail("invalid_event_update", "An event status or assignment change is required.", 400, trace);
      const current = await db.prepare("SELECT status, assigned_to, revision FROM harvy_v2_events WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ?")
        .bind(eventMatch[1], a.tenantId, a.workspaceId, product).first<{ status: string; assigned_to: string | null; revision: number }>();
      if (!current) return fail("not_found", "Event not found.", 404, trace);
      if (current.revision !== update.expected_revision) return fail("revision_conflict", "Event changed elsewhere; reload it before saving.", 409, trace);
      const status = hasStatus ? update.status : current.status;
      const assignedTo = hasAssignee ? update.assigned_to : current.assigned_to;
      if (typeof status !== "string" || !["new", "reviewing", "saved", "closed"].includes(status) ||
          !(assignedTo === null || assignedTo === a.id)) return fail("invalid_event_update", "Event status or assignment is invalid.", 400, trace);
      if (hasAssignee && assignedTo === null && current.assigned_to !== null && current.assigned_to !== a.id) return fail("forbidden", "Only the assigned member can clear this assignment.", 403, trace);
      if (status === current.status && assignedTo === current.assigned_to) return json(await eventDetail(db, a, eventMatch[1], product));
      const changedAt = now();
      const nextRevision = current.revision + 1;
      const results = await db.batch([
        db.prepare("UPDATE harvy_v2_events SET status = ?, assigned_to = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ? AND revision = ?")
          .bind(status, assignedTo, changedAt, eventMatch[1], a.tenantId, a.workspaceId, product, current.revision),
        db.prepare("INSERT INTO harvy_v2_event_activity (tenant_id, workspace_id, product, event_id, revision, status, assigned_to, changed_by, changed_at) SELECT tenant_id, workspace_id, product, id, revision, status, assigned_to, ?, ? FROM harvy_v2_events WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ? AND revision = ? AND changes() = 1")
          .bind(a.id, changedAt, eventMatch[1], a.tenantId, a.workspaceId, product, nextRevision),
      ]);
      if (!results[0]?.meta.changes) return fail("revision_conflict", "Event changed elsewhere; reload it before saving.", 409, trace);
      const saved = await eventDetail(db, a, eventMatch[1], product);
      return saved ? json(saved) : fail("not_found", "Event not found.", 404, trace);
    }
    const eventHandoffMatch = pathname.match(/^\/api\/v1\/events\/([a-f0-9-]{36})\/handoff$/i);
    if (eventHandoffMatch && request.method === "POST") {
      if (!has(a, "events.handoff")) return fail("forbidden", "Event handoff is not allowed.", 403, trace);
      const products = await allowedProducts(db, a.tenantId);
      const product = await entitledProduct(db, a.tenantId, url.searchParams.get("product"));
      if (!product || !["Tower", "Civic"].includes(product) || !products.includes("Ops")) return fail("forbidden", "An enabled Tower or Civic mode and Ops are required.", 403, trace);
      const event = await db.prepare("SELECT id FROM harvy_v2_events WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = ?")
        .bind(eventHandoffMatch[1], a.tenantId, a.workspaceId, product).first();
      if (!event) return fail("not_found", "Event not found.", 404, trace);
      const evidence = await db.prepare("SELECT COUNT(*) AS count FROM harvy_v2_evidence WHERE event_id = ? AND tenant_id = ? AND workspace_id = ? AND product = ?")
        .bind(eventHandoffMatch[1], a.tenantId, a.workspaceId, product).first<{ count: number }>();
      if (!evidence?.count) return fail("insufficient_evidence", "An Ops handoff needs source evidence.", 409, trace);
      const existing = await db.prepare("SELECT id, status FROM harvy_v2_ops_actions WHERE tenant_id = ? AND workspace_id = ? AND source_product = ? AND source_event_id = ? AND source_story_id IS NULL")
        .bind(a.tenantId, a.workspaceId, product, eventHandoffMatch[1]).first<{ id: string; status: string }>();
      if (existing) return json({ action_id: existing.id, event_id: eventHandoffMatch[1], status: existing.status }, 200);
      const actionId = crypto.randomUUID();
      const time = now();
      const result = await db.prepare("INSERT OR IGNORE INTO harvy_v2_ops_actions (id, tenant_id, workspace_id, source_story_id, source_event_id, source_product, created_by, status, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?, 'open', ?, ?)")
        .bind(actionId, a.tenantId, a.workspaceId, eventHandoffMatch[1], product, a.id, time, time).run();
      if (result.meta.changes) return json({ action_id: actionId, event_id: eventHandoffMatch[1], status: "open" }, 201);
      const concurrent = await db.prepare("SELECT id, status FROM harvy_v2_ops_actions WHERE tenant_id = ? AND workspace_id = ? AND source_product = ? AND source_event_id = ? AND source_story_id IS NULL")
        .bind(a.tenantId, a.workspaceId, product, eventHandoffMatch[1]).first<{ id: string; status: string }>();
      return concurrent ? json({ action_id: concurrent.id, event_id: eventHandoffMatch[1], status: concurrent.status }, 200) : fail("handoff_failed", "The Ops action could not be created.", 500, trace);
    }

    if (pathname === "/api/v1/stories" && request.method === "GET") {
      if (!(await allowedProducts(db, a.tenantId)).includes("Newsk")) return fail("forbidden", "Newsk is not enabled for this organization.", 403, trace);
      if (!has(a, "stories.view")) return fail("forbidden", "Story access denied.", 403, trace);
      const result = await db.prepare(
        "SELECT id, event_id, title, notes, status, revision, created_at, updated_at FROM harvy_v2_stories WHERE tenant_id = ? AND workspace_id = ? ORDER BY updated_at DESC, id DESC LIMIT 100",
      ).bind(a.tenantId, a.workspaceId).all();
      return json({ items: result.results });
    }
    const storyReadMatch = pathname.match(/^\/api\/v1\/stories\/([a-f0-9-]{36})$/i);
    if (storyReadMatch && request.method === "GET") {
      if (!(await allowedProducts(db, a.tenantId)).includes("Newsk")) return fail("forbidden", "Newsk is not enabled for this organization.", 403, trace);
      if (!has(a, "stories.view")) return fail("forbidden", "Story access denied.", 403, trace);
      const saved = await db.prepare("SELECT id, event_id, title, notes, status, revision, created_at, updated_at FROM harvy_v2_stories WHERE id = ? AND tenant_id = ? AND workspace_id = ?")
        .bind(storyReadMatch[1], a.tenantId, a.workspaceId).first();
      return saved ? json(saved) : fail("not_found", "Story not found.", 404, trace);
    }

    if (pathname === "/api/v1/stories" && request.method === "POST") {
      if (!(await allowedProducts(db, a.tenantId)).includes("Newsk")) return fail("forbidden", "Newsk is not enabled for this organization.", 403, trace);
      if (!has(a, "stories.edit")) return fail("forbidden", "Story editing denied.", 403, trace);
      let body: unknown;
      try { body = await bodyJson(request); } catch (e) { return fail("invalid_request", "Invalid request body.", e instanceof Error && e.message === "too_large" ? 413 : 400, trace); }
      const b = body as Record<string, unknown>;
      if (typeof b.event_id !== "string" || typeof b.title !== "string" || b.title.trim().length < 1 || b.title.length > 240 || typeof b.notes !== "string" || b.notes.length > 20_000) return fail("invalid_story", "Story fields are invalid.", 400, trace);
      const event = await db.prepare("SELECT id FROM harvy_v2_events WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND product = 'Newsk'")
        .bind(b.event_id, a.tenantId, a.workspaceId).first();
      if (!event) return fail("not_found", "Event not found.", 404, trace);
      const id = crypto.randomUUID();
      const time = now();
      await db.prepare("INSERT INTO harvy_v2_stories (id, tenant_id, workspace_id, owner_principal_id, event_id, title, notes, status, revision, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?)")
        .bind(id, a.tenantId, a.workspaceId, a.id, b.event_id, b.title.trim(), b.notes, time, time).run();
      return json(await db.prepare("SELECT id, event_id, title, notes, status, revision, created_at, updated_at FROM harvy_v2_stories WHERE id = ? AND tenant_id = ? AND workspace_id = ?")
        .bind(id, a.tenantId, a.workspaceId).first(), 201);
    }
    const storyMatch = pathname.match(/^\/api\/v1\/stories\/([a-f0-9-]{36})$/i);
    if (storyMatch && request.method === "PATCH") {
      if (!(await allowedProducts(db, a.tenantId)).includes("Newsk")) return fail("forbidden", "Newsk is not enabled for this organization.", 403, trace);
      let body: unknown;
      try { body = await bodyJson(request); } catch (e) { return fail("invalid_request", "Invalid request body.", e instanceof Error && e.message === "too_large" ? 413 : 400, trace); }
      const result = await updateStory(db, a, storyMatch[1], body as Record<string, unknown>);
      if ("code" in result && result.code) return fail(result.code, result.code === "revision_conflict" ? "Story changed elsewhere; reload before saving." : "Story update failed.", result.status || 400, trace);
      return json(result.story);
    }

    const handoffMatch = pathname.match(/^\/api\/v1\/stories\/([a-f0-9-]{36})\/handoff$/i);
    if (handoffMatch && request.method === "POST") {
      if (!has(a, "stories.handoff")) return fail("forbidden", "Story handoff is not allowed.", 403, trace);
      const products = await allowedProducts(db, a.tenantId);
      if (!products.includes("Newsk") || !products.includes("Ops")) return fail("forbidden", "Newsk and Ops must both be enabled.", 403, trace);
      const story = await db.prepare("SELECT id, event_id, status, revision FROM harvy_v2_stories WHERE id = ? AND tenant_id = ? AND workspace_id = ?")
        .bind(handoffMatch[1], a.tenantId, a.workspaceId).first<{ id: string; event_id: string; status: string; revision: number }>();
      if (!story) return fail("not_found", "Story not found.", 404, trace);
      if (story.status !== "ready") return fail("invalid_state", "Mark the story ready before handing it to Ops.", 409, trace);
      const evidence = await db.prepare("SELECT COUNT(*) AS count FROM harvy_v2_evidence WHERE event_id = ? AND tenant_id = ? AND workspace_id = ? AND product = 'Newsk'")
        .bind(story.event_id, a.tenantId, a.workspaceId).first<{ count: number }>();
      if (!evidence?.count) return fail("insufficient_evidence", "A handoff needs source evidence.", 409, trace);
      const actionId = crypto.randomUUID();
      const time = now();
      const results = await db.batch([
        db.prepare("UPDATE harvy_v2_stories SET status = 'handed_off', revision = revision + 1, updated_at = ? WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND status = 'ready' AND revision = ?")
          .bind(time, story.id, a.tenantId, a.workspaceId, story.revision),
        db.prepare("INSERT OR IGNORE INTO harvy_v2_ops_actions (id, tenant_id, workspace_id, source_story_id, source_event_id, source_product, created_by, status, created_at, updated_at) SELECT ?, ?, ?, ?, ?, 'Newsk', ?, 'open', ?, ? WHERE EXISTS (SELECT 1 FROM harvy_v2_stories WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND status = 'handed_off' AND revision = ?)")
          .bind(actionId, a.tenantId, a.workspaceId, story.id, story.event_id, a.id, time, time, story.id, a.tenantId, a.workspaceId, story.revision + 1),
      ]);
      if (!results[0]?.meta.changes) return fail("revision_conflict", "Story changed before handoff; reload it.", 409, trace);
      if (!results[1]?.meta.changes) return fail("handoff_failed", "The Ops action could not be created.", 500, trace);
      return json({ action_id: actionId, story_id: story.id, status: "open", created_at: time }, 201);
    }

    if (pathname === "/api/v1/actions" && request.method === "GET") {
      if (!(await allowedProducts(db, a.tenantId)).includes("Ops")) return fail("forbidden", "Ops is not enabled for this organization.", 403, trace);
      if (!has(a, "ops.actions.view")) return fail("forbidden", "Ops action access denied.", 403, trace);
      const actions = await db.prepare("SELECT a.id, a.source_story_id, a.source_event_id AS event_id, a.source_product, a.status, a.revision, a.created_at, a.updated_at, s.title AS story_title, e.title AS event_title, (SELECT ev.source_url FROM harvy_v2_evidence ev WHERE ev.event_id = e.id AND ev.tenant_id = e.tenant_id AND ev.workspace_id = e.workspace_id AND ev.product = e.product ORDER BY ev.captured_at DESC LIMIT 1) AS source_url, (SELECT ev.publisher FROM harvy_v2_evidence ev WHERE ev.event_id = e.id AND ev.tenant_id = e.tenant_id AND ev.workspace_id = e.workspace_id AND ev.product = e.product ORDER BY ev.captured_at DESC LIMIT 1) AS publisher FROM harvy_v2_ops_actions a LEFT JOIN harvy_v2_stories s ON s.id = a.source_story_id AND s.tenant_id = a.tenant_id AND s.workspace_id = a.workspace_id AND s.product = a.source_product AND s.event_id = a.source_event_id JOIN harvy_v2_events e ON e.id = a.source_event_id AND e.tenant_id = a.tenant_id AND e.workspace_id = a.workspace_id AND e.product = a.source_product WHERE a.tenant_id = ? AND a.workspace_id = ? ORDER BY a.updated_at DESC LIMIT 100")
        .bind(a.tenantId, a.workspaceId).all();
      return json({ items: actions.results });
    }
    const actionMatch = pathname.match(/^\/api\/v1\/actions\/([a-f0-9-]{36})$/i);
    if (actionMatch && request.method === "PATCH") {
      if (!(await allowedProducts(db, a.tenantId)).includes("Ops")) return fail("forbidden", "Ops is not enabled for this organization.", 403, trace);
      if (!has(a, "ops.actions.edit")) return fail("forbidden", "Ops action editing denied.", 403, trace);
      let body: unknown;
      try { body = await bodyJson(request); } catch (e) { return fail("invalid_request", "Invalid request body.", e instanceof Error && e.message === "too_large" ? 413 : 400, trace); }
      const b = body as Record<string, unknown>;
      if (!Number.isInteger(b.revision) || !["open", "in_progress", "done", "cancelled"].includes(String(b.status))) return fail("invalid_action", "Action status or revision is invalid.", 400, trace);
      const current = await db.prepare("SELECT status, revision, source_story_id, source_event_id, source_product FROM harvy_v2_ops_actions WHERE id = ? AND tenant_id = ? AND workspace_id = ?")
        .bind(actionMatch[1], a.tenantId, a.workspaceId).first<{ status: string; revision: number; source_story_id: string | null; source_event_id: string; source_product: Product }>();
      if (!current) return fail("not_found", "Ops action not found.", 404, trace);
      if (current.revision !== b.revision) return fail("revision_conflict", "Action changed elsewhere; reload it.", 409, trace);
      if (current.status === b.status) return json({ id: actionMatch[1], source_story_id: current.source_story_id, event_id: current.source_event_id, product: current.source_product, status: current.status, revision: current.revision });
      const allowedNext: Record<string, string[]> = { open: ["in_progress", "cancelled"], in_progress: ["open", "done", "cancelled"], done: [], cancelled: ["open"] };
      if (current.status !== b.status && !allowedNext[current.status]?.includes(String(b.status))) return fail("invalid_transition", "Action cannot move to that status.", 409, trace);
      const result = await db.prepare("UPDATE harvy_v2_ops_actions SET status = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND revision = ?")
        .bind(b.status, now(), actionMatch[1], a.tenantId, a.workspaceId, b.revision).run();
      if (!result.meta.changes) return fail("revision_conflict", "Action changed elsewhere; reload it.", 409, trace);
      return json(await db.prepare("SELECT id, source_story_id, source_event_id AS event_id, source_product AS product, status, revision, created_at, updated_at FROM harvy_v2_ops_actions WHERE id = ? AND tenant_id = ? AND workspace_id = ?")
        .bind(actionMatch[1], a.tenantId, a.workspaceId).first());
    }

    if (pathname === "/api/v1/briefs" && request.method === "POST") {
      if (!(await allowedProducts(db, a.tenantId)).includes("Newsk")) return fail("forbidden", "Newsk is not enabled for this organization.", 403, trace);
      if (!has(a, "stories.edit")) return fail("forbidden", "Brief creation denied.", 403, trace);
      let body: unknown;
      try { body = await bodyJson(request); } catch (e) { return fail("invalid_request", "Invalid request body.", e instanceof Error && e.message === "too_large" ? 413 : 400, trace); }
      const storyId = (body as Record<string, unknown>)?.story_id;
      if (typeof storyId !== "string") return fail("invalid_request", "A story_id is required.", 400, trace);
      const story = await db.prepare("SELECT id, event_id, title, notes FROM harvy_v2_stories WHERE id = ? AND tenant_id = ? AND workspace_id = ?")
        .bind(storyId, a.tenantId, a.workspaceId).first<{ id: string; event_id: string; title: string; notes: string }>();
      if (!story) return fail("not_found", "Story not found.", 404, trace);
      const event = await eventDetail(db, a, story.event_id, "Newsk") as { evidence: Array<{ source_url: string; publisher: string; headline: string; captured_at: number }> } | null;
      if (!event || event.evidence.length === 0) return fail("insufficient_evidence", "A brief needs at least one source citation.", 409, trace);
      const citations = event.evidence.map((ev) => ({ url: ev.source_url, publisher: ev.publisher, headline: ev.headline, captured_at: ev.captured_at }));
      const bodyText = [story.notes.trim(), "Sources:", ...citations.map((c, i) => `[${i + 1}] ${c.headline} — ${c.publisher} (${new Date(c.captured_at).toISOString()}) ${c.url}`)].filter(Boolean).join("\n\n");
      const id = crypto.randomUUID();
      const time = now();
      await db.prepare("INSERT INTO harvy_v2_briefs (id, tenant_id, workspace_id, owner_principal_id, story_id, title, body, citations_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(id, a.tenantId, a.workspaceId, a.id, story.id, story.title, bodyText, JSON.stringify(citations), time, time).run();
      return json({ id, title: story.title, body: bodyText, citations, generated_by: "extractive", created_at: time }, 201);
    }
    if (pathname === "/api/v1/briefs" && request.method === "GET") {
      if (!(await allowedProducts(db, a.tenantId)).includes("Newsk")) return fail("forbidden", "Newsk is not enabled for this organization.", 403, trace);
      if (!has(a, "stories.view")) return fail("forbidden", "Brief access denied.", 403, trace);
      return json(await db.prepare("SELECT id, story_id, title, body, citations_json, created_at, updated_at FROM harvy_v2_briefs WHERE tenant_id = ? AND workspace_id = ? ORDER BY updated_at DESC LIMIT 100")
        .bind(a.tenantId, a.workspaceId).all());
    }

    if (pathname === "/api/v1/dashboards" && request.method === "GET") {
      if (!has(a, "dashboards.view")) return fail("forbidden", "Dashboard access denied.", 403, trace);
      const products = await allowedProducts(db, a.tenantId);
      if (!products.length) return json({ results: [] });
      const marks = products.map(() => "?").join(",");
      const rows = await db.prepare(`SELECT id, product, title, description, config_json, schema_version, hql_version, visibility, CASE WHEN owner_principal_id = ? THEN 1 ELSE 0 END AS can_edit, revision, created_at, updated_at FROM harvy_v2_dashboards WHERE tenant_id = ? AND workspace_id = ? AND deleted_at IS NULL AND product IN (${marks}) AND (visibility = 'workspace' OR owner_principal_id = ?) ORDER BY updated_at DESC LIMIT 100`)
        .bind(a.id, a.tenantId, a.workspaceId, ...products, a.id).all<{ can_edit: number }>();
      return json({ results: rows.results.map((dashboard) => ({ ...dashboard, can_edit: dashboard.can_edit === 1 })) });
    }
    if (pathname === "/api/v1/dashboards" && request.method === "POST") {
      if (!has(a, "dashboards.edit")) return fail("forbidden", "Dashboard editing denied.", 403, trace);
      let body: unknown;
      try { body = await bodyJson(request); } catch (e) { return fail("invalid_request", "Invalid request body.", e instanceof Error && e.message === "too_large" ? 413 : 400, trace); }
      const b = body as Record<string, unknown>;
      if (typeof b.title !== "string" || !b.title.trim() || b.title.length > 160 || !PRODUCTS.includes(b.product as Product) || typeof b.config !== "object" || b.config === null || !isPersistedDashboardConfig(b.config) || JSON.stringify(b.config).length > 32_000 || !["private", "workspace"].includes(String(b.visibility || "private"))) return fail("invalid_dashboard", "Dashboard fields are invalid.", 400, trace);
      if (!(await allowedProducts(db, a.tenantId)).includes(b.product as Product)) return fail("forbidden", "This product is not enabled for the organization.", 403, trace);
      const id = crypto.randomUUID();
      const time = now();
      await db.prepare("INSERT INTO harvy_v2_dashboards (id, tenant_id, workspace_id, owner_principal_id, product, title, description, config_json, visibility, revision, state_changed_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)")
        .bind(id, a.tenantId, a.workspaceId, a.id, b.product, b.title.trim(), typeof b.description === "string" ? b.description.slice(0, 1000) : "", JSON.stringify(b.config), b.visibility || "private", a.id, time, time).run();
      return json({ id, revision: 1, created_at: time, updated_at: time }, 201);
    }
    const dashboardMatch = pathname.match(/^\/api\/v1\/dashboards\/([a-f0-9-]{36})$/i);
    if (dashboardMatch && request.method === "PATCH") {
      if (!has(a, "dashboards.edit")) return fail("forbidden", "Dashboard editing denied.", 403, trace);
      let body: unknown;
      try { body = await bodyJson(request); } catch (e) { return fail("invalid_request", "Invalid request body.", e instanceof Error && e.message === "too_large" ? 413 : 400, trace); }
      const b = body as Record<string, unknown>;
      if (!Number.isSafeInteger(b.revision) || (b.revision as number) < 1 || typeof b.title !== "string" || !b.title.trim() || b.title.length > 160 || typeof b.config !== "object" || b.config === null || !isPersistedDashboardConfig(b.config) || JSON.stringify(b.config).length > 32_000 || (b.visibility !== undefined && !["private", "workspace"].includes(String(b.visibility)))) return fail("invalid_dashboard", "Dashboard fields are invalid.", 400, trace);
      const products = await allowedProducts(db, a.tenantId);
      if (!products.length) return fail("not_found", "Dashboard not found.", 404, trace);
      const marks = products.map(() => "?").join(",");
      const result = await db.prepare(`UPDATE harvy_v2_dashboards SET title = ?, description = ?, config_json = ?, visibility = COALESCE(?, visibility), revision = revision + 1, state_changed_by = ?, updated_at = ? WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND owner_principal_id = ? AND revision = ? AND deleted_at IS NULL AND product IN (${marks})`)
        .bind(b.title.trim(), typeof b.description === "string" ? b.description.slice(0, 1000) : "", JSON.stringify(b.config), b.visibility ?? null, a.id, now(), dashboardMatch[1], a.tenantId, a.workspaceId, a.id, b.revision, ...products).run();
      if (!result.meta.changes) return fail("revision_conflict", "Dashboard changed or is not available; reload it.", 409, trace);
      return json(await db.prepare("SELECT id, title, description, config_json, visibility, revision, updated_at FROM harvy_v2_dashboards WHERE id = ? AND tenant_id = ? AND workspace_id = ?")
        .bind(dashboardMatch[1], a.tenantId, a.workspaceId).first());
    }
    if (dashboardMatch && request.method === "DELETE") {
      if (!has(a, "dashboards.edit")) return fail("forbidden", "Dashboard editing denied.", 403, trace);
      let body: unknown;
      try { body = await bodyJson(request); } catch (e) { return fail("invalid_request", "Invalid request body.", e instanceof Error && e.message === "too_large" ? 413 : 400, trace); }
      const b = body as Record<string, unknown>;
      if (!Number.isSafeInteger(b.expected_revision) || (b.expected_revision as number) < 1) return fail("invalid_dashboard", "Expected dashboard revision is invalid.", 400, trace);
      const products = await allowedProducts(db, a.tenantId);
      if (!products.length) return fail("not_found", "Dashboard not found.", 404, trace);
      const marks = products.map(() => "?").join(",");
      const time = now();
      const result = await db.prepare(`UPDATE harvy_v2_dashboards SET deleted_at = ?, revision = revision + 1, state_changed_by = ?, updated_at = ? WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND owner_principal_id = ? AND revision = ? AND deleted_at IS NULL AND product IN (${marks})`)
        .bind(time, a.id, time, dashboardMatch[1], a.tenantId, a.workspaceId, a.id, b.expected_revision, ...products).run();
      return result.meta.changes ? json({ deleted: true }) : fail("revision_conflict", "Dashboard changed or is not available; reload it before deleting.", 409, trace);
    }

    if (pathname === "/api/v1/runs" && request.method === "POST") {
      if (!has(a, "runs.manage")) return fail("forbidden", "Run access denied.", 403, trace);
      const automationUrl = automationEndpoint(env.AUTOMATION_URL);
      if (!automationUrl || !env.AUTOMATION_DISPATCH_TOKEN) return fail("automation_unavailable", "Automation is not configured; no run was started.", 503, trace);
      let body: unknown;
      try { body = await bodyJson(request); } catch (e) { return fail("invalid_request", "Invalid request body.", e instanceof Error && e.message === "too_large" ? 413 : 400, trace); }
      const b = body as Record<string, unknown>;
      if (typeof b.source_id !== "string" || typeof b.idempotency_key !== "string" || b.idempotency_key.length < 8 || b.idempotency_key.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(b.idempotency_key)) return fail("invalid_request", "Source and idempotency key are required.", 400, trace);
      const source = await db.prepare("SELECT id, product, connector_id, target_url, source_scope_id, mode, max_pages, config_revision FROM harvy_v2_sources WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND enabled = 1 AND approval_status = 'approved' AND approved_at IS NOT NULL")
        .bind(b.source_id, a.tenantId, a.workspaceId).first<{ id: string; product: Product; connector_id: string; target_url: string; source_scope_id: string; mode: "scrape" | "crawl" | "links" | "api"; max_pages: number; config_revision: string }>();
      if (!source || !(await allowedProducts(db, a.tenantId)).includes(source.product)) return fail("not_found", "Approved source not found.", 404, trace);
      if (!isSafeSourceUrl(source.target_url)) return fail("invalid_source", "Registered source target is unsafe.", 400, trace);
      const id = crypto.randomUUID();
      const time = now();
      const sourceSnapshot = JSON.stringify({ connector_id: source.connector_id, product: source.product, target_url: source.target_url, source_scope_id: source.source_scope_id, mode: source.mode, max_pages: source.max_pages });
      const registration = await db.prepare("INSERT OR IGNORE INTO harvy_v2_runs (id, tenant_id, workspace_id, product, source_id, source_scope_id, config_revision, source_snapshot_json, requested_by, idempotency_key, status, quota_units, trace_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?)")
        .bind(id, a.tenantId, a.workspaceId, source.product, source.id, source.source_scope_id, source.config_revision, sourceSnapshot, a.id, b.idempotency_key, source.max_pages, trace, time, time).run();
      const existing = await db.prepare("SELECT id, product, source_id, source_scope_id, config_revision, source_snapshot_json, status, dispatch_claimed_at, error_code, trace_id, created_at FROM harvy_v2_runs WHERE tenant_id = ? AND workspace_id = ? AND idempotency_key = ?")
        .bind(a.tenantId, a.workspaceId, b.idempotency_key).first<{ id: string; product: Product; source_id: string; source_scope_id: string; config_revision: string; source_snapshot_json: string; status: RunStatus; dispatch_claimed_at: number | null; error_code: string | null; trace_id: string; created_at: number }>();
      if (!existing) return registration.meta.changes === 0
        ? fail("run_quota_exceeded", "Workspace run quota reached for this UTC hour.", 429, trace)
        : fail("run_registration_failed", "Run could not be registered.", 500, trace);
      if (existing.source_id !== source.id) return fail("idempotency_conflict", "This idempotency key belongs to a different source.", 409, trace);
      if (existing.status !== "queued") return json({ run_id: existing.id, status: existing.status, error_code: existing.error_code, idempotency_key: b.idempotency_key, trace_id: existing.trace_id }, 200);
      const runId = existing.id;
      const runTrace = existing.trace_id;
      const claimed = await db.prepare("UPDATE harvy_v2_runs SET dispatch_claimed_at = ? WHERE id = ? AND tenant_id = ? AND workspace_id = ? AND status = 'queued' AND (dispatch_claimed_at IS NULL OR dispatch_claimed_at <= ?)")
        .bind(time, runId, a.tenantId, a.workspaceId, time - DISPATCH_CLAIM_LEASE_MS).run();
      if (!claimed.meta.changes) return json({ run_id: runId, status: "queued", error_code: existing.error_code, idempotency_key: b.idempotency_key, trace_id: runTrace }, 202);
      let snapshot: unknown;
      try { snapshot = JSON.parse(existing.source_snapshot_json) as unknown; } catch { return fail("invalid_run_snapshot", "Stored run configuration is invalid.", 500, trace); }
      if (typeof snapshot !== "object" || snapshot === null || Array.isArray(snapshot)) return fail("invalid_run_snapshot", "Stored run configuration is invalid.", 500, trace);
      const savedSource = snapshot as Record<string, unknown>;
      const envelope = {
        contract_version: 1, run_id: runId, trace_id: runTrace, config_revision: existing.config_revision,
        connector_id: savedSource.connector_id, source_scope_id: savedSource.source_scope_id, access_scope_id: `tenant-${a.tenantId}`,
        target_url: savedSource.target_url, mode: savedSource.mode,
        provider: savedSource.mode === "api" ? "registered_api" : "spider_unlimited", required_proxy: "webshare",
        preflight_required: true, direct_fallback_allowed: false,
        max_pages: savedSource.max_pages, deadline_seconds: 300, idempotency_key: b.idempotency_key,
      };
      if (!parseAutomationRunRequest(envelope)) {
        await db.prepare("UPDATE harvy_v2_runs SET status = 'failed', error_code = 'invalid_registered_source', updated_at = ? WHERE id = ? AND tenant_id = ?")
          .bind(now(), runId, a.tenantId).run();
        return fail("invalid_source", "Registered source does not satisfy the run contract.", 400, trace);
      }
      try {
        const dispatched = await fetch(automationUrl, {
          method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.AUTOMATION_DISPATCH_TOKEN}`, "X-Harvy-Trace-Id": runTrace },
          body: JSON.stringify(envelope), signal: AbortSignal.timeout(15_000),
        });
        await dispatched.body?.cancel().catch(() => undefined);
        if (!dispatched.ok) {
          if (dispatched.status === 408 || dispatched.status >= 500) return markDispatchUnconfirmed(db, runId, a.tenantId, runTrace, b.idempotency_key);
          return markDispatchFailure(db, runId, a.tenantId, trace, "automation_rejected", "Automation did not accept the run.");
        }
      } catch {
        return markDispatchUnconfirmed(db, runId, a.tenantId, runTrace, b.idempotency_key);
      }
      await db.prepare("UPDATE harvy_v2_runs SET error_code = NULL WHERE id = ? AND tenant_id = ? AND status = 'queued'")
        .bind(runId, a.tenantId).run();
      return json({ run_id: runId, status: "queued", idempotency_key: b.idempotency_key, trace_id: runTrace }, 202);
    }
    if (pathname === "/api/v1/runs" && request.method === "GET") {
      if (!has(a, "runs.view")) return fail("forbidden", "Run access denied.", 403, trace);
      const product = await entitledProduct(db, a.tenantId, url.searchParams.get("product"));
      if (!product) return fail("forbidden", "Choose a product enabled for this organization.", 403, trace);
      const result = await db.prepare("SELECT r.id, r.source_id, r.status, r.trace_id, r.error_code, r.created_at, r.updated_at, CASE WHEN ? = 1 THEN r.idempotency_key ELSE NULL END AS idempotency_key FROM harvy_v2_runs r WHERE r.tenant_id = ? AND r.workspace_id = ? AND r.product = ? ORDER BY r.created_at DESC LIMIT 100")
        .bind(has(a, "runs.manage") ? 1 : 0, a.tenantId, a.workspaceId, product).all();
      return json({ items: result.results });
    }
    const runMatch = pathname.match(/^\/api\/v1\/runs\/([a-f0-9-]{36})$/i);
    if (runMatch && request.method === "GET") {
      if (!has(a, "runs.view")) return fail("forbidden", "Run access denied.", 403, trace);
      const product = await entitledProduct(db, a.tenantId, url.searchParams.get("product"));
      if (!product) return fail("not_found", "Run not found.", 404, trace);
      const result = await db.prepare("SELECT r.id, r.source_id, r.status, r.trace_id, r.error_code, r.created_at, r.updated_at FROM harvy_v2_runs r WHERE r.id = ? AND r.tenant_id = ? AND r.workspace_id = ? AND r.product = ?")
        .bind(runMatch[1], a.tenantId, a.workspaceId, product).first();
      return result ? json(result) : fail("not_found", "Run not found.", 404, trace);
    }

    if (pathname === "/api/v1/query" && request.method === "POST") {
      if (!has(a, "query.view")) return fail("forbidden", "Query access denied.", 403, trace);
      let body: unknown;
      try { body = await bodyJson(request); } catch (e) { return fail("invalid_request", "Request body must be bounded JSON.", e instanceof Error && e.message === "too_large" ? 413 : 400, trace); }
      const query = parseHqlQuery(body);
      const semantic = query && hqlToSemanticQuery(query);
      if (!query || !semantic) return fail("invalid_query", "HQL query is unsupported or failed validation.", 400, trace);
      const product = await entitledProduct(db, a.tenantId, query.product || null);
      if (!product) return fail("forbidden", "HQL requires one product enabled for this organization.", 403, trace);
      try {
        const result = await createAnalyticsLayer(db).execute(semantic, { tenantId: a.tenantId, workspaceId: a.workspaceId, products: [product] });
        return json({ rows: result.data, annotation: result.annotation, query, snapshot: null, trace_id: trace });
      } catch {
        return fail("query_failed", "The authorized HQL query failed.", 400, trace);
      }
    }

    return fail("not_found", "Unknown route.", 404, trace);
  },
};

async function automationCallback(request: Request, env: Env, trace: string): Promise<Response> {
  const raw = await verifiedAutomationBody(request, env, trace);
  if (raw instanceof Response) return raw;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail("invalid_request", "Callback body must be JSON.", 400, trace); }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return fail("invalid_callback", "Callback body is invalid.", 400, trace);
  const b = value as Record<string, unknown>;
  const callbackFields = new Set(["run_id", "status", "error_code"]);
  if (Object.keys(b).some((key) => !callbackFields.has(key)) || typeof b.run_id !== "string" || !isHarvyDexId(b.run_id) ||
      !["running", "succeeded", "partial", "failed", "cancelled"].includes(String(b.status)) ||
      (b.error_code !== undefined && (typeof b.error_code !== "string" || b.error_code.length > 64))) return fail("invalid_callback", "Callback state is invalid.", 400, trace);
  if (!env.HARVY_D1) return fail("unavailable", "Harvy storage is not configured.", 503, trace);
  const db = env.HARVY_D1;
  const current = await db.prepare("SELECT status FROM harvy_v2_runs WHERE id = ?").bind(b.run_id).first<{ status: RunStatus }>();
  if (!current) return fail("not_found", "Run not found.", 404, trace);
  const next = b.status as RunStatus;
  if (current.status === next) return json({ accepted: true, status: next });
  if (!canTransitionAutomationRun(current.status, next)) return fail("invalid_transition", "Run state cannot move to that status.", 409, trace);
  const result = await db.prepare("UPDATE harvy_v2_runs SET status = ?, error_code = ?, updated_at = ? WHERE id = ? AND status = ?")
    .bind(next, next === "failed" && typeof b.error_code === "string" ? b.error_code.slice(0, 64) : null, now(), b.run_id, current.status).run();
  return result.meta.changes ? json({ accepted: true, status: next }) : fail("revision_conflict", "Run state changed concurrently.", 409, trace);
}

async function verifiedAutomationBody(request: Request, env: Env, trace: string): Promise<string | Response> {
  if (!env.AUTOMATION_CALLBACK_SECRET) return fail("unavailable", "Automation callback is not configured.", 503, trace);
  const timestamp = Number(request.headers.get("x-harvy-timestamp"));
  const signature = request.headers.get("x-harvy-signature") || "";
  if (!Number.isSafeInteger(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60_000 || !/^[0-9a-f]{64}$/i.test(signature)) return fail("unauthorized", "Invalid callback authentication.", 401, trace);
  let raw: string;
  try { raw = await readBoundedText(request, 65_536); }
  catch (error) { return error instanceof Error && error.message === "too_large" ? fail("too_large", "Callback payload is too large.", 413, trace) : fail("invalid_request", "Callback body could not be read.", 400, trace); }
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.AUTOMATION_CALLBACK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`)));
  const expected = [...bytes].map((v) => v.toString(16).padStart(2, "0")).join("");
  return constantTimeEqual(signature.toLowerCase(), expected) ? raw : fail("unauthorized", "Invalid callback authentication.", 401, trace);
}

async function automationPublication(request: Request, env: Env, trace: string): Promise<Response> {
  const raw = await verifiedAutomationBody(request, env, trace);
  if (raw instanceof Response) return raw;
  if (!env.HARVY_D1 || !env.HARVY_RAW || !env.HARVY_ARTIFACTS) return fail("unavailable", "Run storage and both artifact stores must be configured.", 503, trace);
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail("invalid_request", "Publication body must be JSON.", 400, trace); }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return fail("invalid_publication", "Publication body is invalid.", 400, trace);
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["run_id", "artifacts", "events"].includes(key)) ||
      typeof body.run_id !== "string" || !isHarvyDexId(body.run_id) || !Array.isArray(body.artifacts) ||
      body.artifacts.length < 2 || body.artifacts.length > 100 || !Array.isArray(body.events) || body.events.length > 50) {
    return fail("invalid_publication", "Publication envelope is outside the contract bounds.", 400, trace);
  }
  const db = env.HARVY_D1;
  const run = await db.prepare("SELECT id, tenant_id, workspace_id, source_id, source_scope_id, status, product FROM harvy_v2_runs WHERE id = ?")
    .bind(body.run_id).first<{ id: string; tenant_id: string; workspace_id: string; source_id: string; status: RunStatus; product: Product; source_scope_id: string }>();
  if (!run) return fail("not_found", "Run not found.", 404, trace);
  if (run.status !== "queued" && run.status !== "running") return fail("invalid_run_state", "Only an active run can publish artifacts.", 409, trace);

  const manifests: ArtifactManifest[] = [];
  const seenArtifacts = new Set<string>();
  for (const item of body.artifacts) {
    const manifest = parseArtifactManifest(item);
    if (!manifest || manifest.run_id !== run.id || manifest.source_scope_id !== run.source_scope_id || manifest.access_scope_id !== `tenant-${run.tenant_id}` || seenArtifacts.has(manifest.artifact_id)) return fail("invalid_manifest", "Artifact manifest scope, run, or identity is invalid.", 400, trace);
    const bucketName = manifest.stage === "raw" ? "harvy-raw" : "harvy-artifacts";
    if (!manifest.storage_uri.startsWith(`r2://${bucketName}/`)) return fail("invalid_manifest", "Artifact is in the wrong storage stage.", 400, trace);
    seenArtifacts.add(manifest.artifact_id);
    manifests.push(manifest);
  }
  if (!manifests.some((manifest) => manifest.stage === "raw") || !manifests.some((manifest) => manifest.stage === "processed")) return fail("invalid_manifest", "A publication requires raw and processed artifacts.", 400, trace);

  const processedIds = new Set(manifests.filter((manifest) => manifest.stage === "processed").map((manifest) => manifest.artifact_id));
  const acceptedEvents: Array<{ id: string; title: string; summary: string; first: number; last: number; evidence: Array<{ url: string; publisher: string; headline: string; excerpt: string; captured: number; artifactId: string }> }> = [];
  const seenEvents = new Set<string>();
  const maxTime = Date.now() + 24 * 60 * 60 * 1000;
  for (const item of body.events) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return fail("invalid_event", "Event record is invalid.", 400, trace);
    const event = item as Record<string, unknown>;
    if (Object.keys(event).some((key) => !["harvydex_id", "title", "summary", "first_seen_at", "last_seen_at", "evidence"].includes(key)) ||
        !isHarvyDexId(event.harvydex_id) || seenEvents.has(event.harvydex_id) || typeof event.title !== "string" || !event.title.trim() || event.title.length > 500 ||
        typeof event.summary !== "string" || event.summary.length > 4000 || !Number.isSafeInteger(event.first_seen_at) ||
        !Number.isSafeInteger(event.last_seen_at) || (event.first_seen_at as number) < 0 || (event.first_seen_at as number) > (event.last_seen_at as number) ||
        (event.last_seen_at as number) > maxTime || !Array.isArray(event.evidence) || event.evidence.length < 1 || event.evidence.length > 20) return fail("invalid_event", "Event record is outside the contract bounds.", 400, trace);
    const evidenceItems: Array<{ url: string; publisher: string; headline: string; excerpt: string; captured: number; artifactId: string }> = [];
    for (const itemEvidence of event.evidence) {
      if (typeof itemEvidence !== "object" || itemEvidence === null || Array.isArray(itemEvidence)) return fail("invalid_evidence", "Evidence record is invalid.", 400, trace);
      const ev = itemEvidence as Record<string, unknown>;
      if (Object.keys(ev).some((key) => !["source_url", "publisher", "headline", "excerpt", "captured_at", "artifact_id"].includes(key)) ||
          !isSafeSourceUrl(ev.source_url) || typeof ev.publisher !== "string" || !ev.publisher.trim() || ev.publisher.length > 200 ||
          typeof ev.headline !== "string" || !ev.headline.trim() || ev.headline.length > 500 ||
          typeof ev.excerpt !== "string" || ev.excerpt.length > 4000 || !Number.isSafeInteger(ev.captured_at) ||
          (ev.captured_at as number) < 0 || (ev.captured_at as number) > maxTime || typeof ev.artifact_id !== "string" || !processedIds.has(ev.artifact_id)) return fail("invalid_evidence", "Evidence is missing a safe source, timestamp, or processed artifact.", 400, trace);
      evidenceItems.push({ url: ev.source_url, publisher: ev.publisher.trim(), headline: ev.headline.trim(), excerpt: ev.excerpt, captured: ev.captured_at as number, artifactId: ev.artifact_id as string });
    }
    seenEvents.add(event.harvydex_id);
    acceptedEvents.push({ id: event.harvydex_id, title: event.title.trim(), summary: event.summary, first: event.first_seen_at as number, last: event.last_seen_at as number, evidence: evidenceItems });
  }

  for (const manifest of manifests) {
    const bucket = manifest.stage === "raw" ? env.HARVY_RAW : env.HARVY_ARTIFACTS;
    const objectKey = manifest.storage_uri.slice(`r2://${manifest.stage === "raw" ? "harvy-raw" : "harvy-artifacts"}/`.length);
    const object = await bucket.head(objectKey);
    if (!object || object.size !== manifest.byte_count || object.customMetadata?.sha256?.toLowerCase() !== manifest.sha256.toLowerCase()) return fail("artifact_missing", "R2 object size or SHA-256 metadata does not match the manifest.", 409, trace);
    const existing = await db.prepare("SELECT tenant_id, workspace_id, run_id, stage, storage_uri, sha256, byte_count, source_scope_id FROM harvy_v2_artifact_manifests WHERE id = ?")
      .bind(manifest.artifact_id).first<Record<string, unknown>>();
    if (existing && (existing.tenant_id !== run.tenant_id || existing.workspace_id !== run.workspace_id || existing.run_id !== run.id || existing.stage !== manifest.stage || existing.storage_uri !== manifest.storage_uri || existing.sha256 !== manifest.sha256 || existing.byte_count !== manifest.byte_count || existing.source_scope_id !== manifest.source_scope_id)) return fail("artifact_conflict", "Artifact ID already belongs to different evidence.", 409, trace);
  }

  await db.batch(manifests.map((manifest) => db.prepare("INSERT OR IGNORE INTO harvy_v2_artifact_manifests (id, tenant_id, workspace_id, run_id, source_scope_id, stage, storage_uri, sha256, byte_count, capture_time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(manifest.artifact_id, run.tenant_id, run.workspace_id, run.id, manifest.source_scope_id, manifest.stage, manifest.storage_uri, manifest.sha256, manifest.byte_count, manifest.capture_time, now())));

  for (const event of acceptedEvents) {
    const statements = [db.prepare("INSERT INTO harvy_v2_events (id, tenant_id, workspace_id, product, title, summary, status, first_seen_at, last_seen_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, summary = excluded.summary, first_seen_at = MIN(harvy_v2_events.first_seen_at, excluded.first_seen_at), last_seen_at = MAX(harvy_v2_events.last_seen_at, excluded.last_seen_at), updated_at = excluded.updated_at WHERE harvy_v2_events.tenant_id = excluded.tenant_id AND harvy_v2_events.workspace_id = excluded.workspace_id AND harvy_v2_events.product = excluded.product")
      .bind(event.id, run.tenant_id, run.workspace_id, run.product, event.title, event.summary, event.first, event.last, now(), now()),
      ...event.evidence.map((ev) => db.prepare("INSERT OR IGNORE INTO harvy_v2_evidence (id, tenant_id, workspace_id, product, event_id, source_id, source_url, publisher, headline, excerpt, captured_at, artifact_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), run.tenant_id, run.workspace_id, run.product, event.id, run.source_id, ev.url, ev.publisher, ev.headline, ev.excerpt, ev.captured, ev.artifactId, now())),
    ];
    await db.batch(statements);
  }
  return json({ accepted: true, artifact_count: manifests.length, event_count: acceptedEvents.length, run_id: run.id }, 202);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
