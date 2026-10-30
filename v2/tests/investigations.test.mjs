import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import worker from "../api/worker.ts";

const migrations = join(process.cwd(), "v2/migrations");
const ids = {
  event: "123e4567-e89b-42d3-a456-426614174000",
  evidence: "123e4567-e89b-42d3-a456-426614174001",
};

function setup() {
  const sql = new DatabaseSync(":memory:");
  sql.exec("PRAGMA foreign_keys=ON");
  for (const file of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort()) sql.exec(readFileSync(join(migrations, file), "utf8"));
  const insertWorkspace = sql.prepare("INSERT INTO harvy_v2_workspaces (id, tenant_id, name, created_at) VALUES (?, ?, ?, 1)");
  insertWorkspace.run("org-a", "org-a", "A");
  insertWorkspace.run("org-b", "org-b", "B");
  for (const tenant of ["org-a", "org-b"]) sql.prepare("INSERT INTO harvy_v2_product_entitlements (tenant_id, product, enabled, revision, updated_at) VALUES (?, 'Civic', 1, 1, 1)").run(tenant);
  sql.prepare("INSERT INTO harvy_v2_sources (id, tenant_id, workspace_id, connector_id, product, publisher, label, target_url, source_scope_id, mode, approval_status, approved_by, approved_at, enabled, created_at, updated_at) VALUES ('source-a', 'org-a', 'org-a', 'civic_feed', 'Civic', 'Public records', 'Public records', 'https://records.example.org', 'scope.civic', 'api', 'approved', 'admin', 1, 1, 1, 1)").run();
  sql.prepare("INSERT INTO harvy_v2_events (id, tenant_id, workspace_id, product, title, summary, status, first_seen_at, last_seen_at, created_at, updated_at) VALUES (?, 'org-a', 'org-a', 'Civic', 'Contract award', 'Award record', 'new', 1, 1, 1, 1)").run(ids.event);
  sql.prepare("INSERT INTO harvy_v2_evidence (id, tenant_id, workspace_id, product, event_id, source_id, source_url, publisher, headline, excerpt, captured_at, created_at) VALUES (?, 'org-a', 'org-a', 'Civic', ?, 'source-a', 'https://records.example.org/award', 'Public records', 'Award notice', 'Published award notice', 1, 1)").run(ids.evidence, ids.event);

  const HARVY_D1 = {
    prepare(query) {
      const statement = sql.prepare(query);
      let params = [];
      return {
        bind(...values) { params = values; return this; },
        async first() { return statement.get(...params) ?? null; },
        async all() { return { results: statement.all(...params) }; },
        async run() { return { meta: { changes: statement.run(...params).changes } }; },
      };
    },
    async batch(statements) {
      sql.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sql.exec("COMMIT");
        return results;
      } catch (error) {
        sql.exec("ROLLBACK");
        throw error;
      }
    },
  };
  const state = { actor: { id: "analyst-a", tenantId: "org-a", workspaceId: "org-a", tenantName: "A", role: "analyst", harvyAdmin: false } };
  const AUTH = { async fetch() { return Response.json(state.actor); } };
  return { sql, env: { HARVY_D1, AUTH }, state };
}

function request(path, method = "GET", body) {
  return new Request(`https://harvy.test${path}`, {
    method,
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
}

test("investigations, entities, and evidence-backed graph stay tenant and product scoped", async () => {
  const { sql, env, state } = setup();
  const created = await worker.fetch(request("/api/v1/investigations", "POST", { product: "Civic", title: "Award review", summary: "Trace the award notice." }), env);
  assert.equal(created.status, 201);
  const casebook = await created.json();

  const entityAResponse = await worker.fetch(request("/api/v1/entities", "POST", { product: "Civic", entity_type: "organization", display_name: "Northwind Group", description: "Entity candidate." }), env);
  const entityBResponse = await worker.fetch(request("/api/v1/entities", "POST", { product: "Civic", entity_type: "public_body", display_name: "City Office", description: "Entity candidate." }), env);
  assert.equal(entityAResponse.status, 201);
  assert.equal(entityBResponse.status, 201);
  const entityA = await entityAResponse.json();
  const entityB = await entityBResponse.json();

  const unsupportedProduct = await worker.fetch(request("/api/v1/entities?product=Ops"), env);
  assert.equal(unsupportedProduct.status, 403);
  const missingEvidence = await worker.fetch(request("/api/v1/relationships", "POST", {
    product: "Civic", from_entity_id: entityA.id, to_entity_id: entityB.id, relationship_type: "received_award", interpretation: "observed",
  }), env);
  assert.equal(missingEvidence.status, 400);
  const wrongEvidenceScope = await worker.fetch(request("/api/v1/relationships", "POST", {
    product: "Civic", from_entity_id: entityA.id, to_entity_id: entityB.id, relationship_type: "received_award", interpretation: "observed", evidence_id: "123e4567-e89b-42d3-a456-426614174099",
  }), env);
  assert.equal(wrongEvidenceScope.status, 404);

  const relation = await worker.fetch(request("/api/v1/relationships", "POST", {
    product: "Civic", from_entity_id: entityA.id, to_entity_id: entityB.id, relationship_type: "received_award", interpretation: "inferred", evidence_id: ids.evidence, notes: "The source names both parties.",
  }), env);
  assert.equal(relation.status, 201);
  const edge = await relation.json();
  const addNote = await worker.fetch(request(`/api/v1/investigations/${casebook.id}/items?product=Civic`, "POST", {
    kind: "note", title: "Initial review", note: "Names are not identity proof.", expected_revision: 1,
  }), env);
  assert.equal(addNote.status, 201);
  const addRelation = await worker.fetch(request(`/api/v1/investigations/${casebook.id}/items?product=Civic`, "POST", {
    kind: "relationship", target_id: edge.id, title: "Award relationship", expected_revision: 2,
  }), env);
  assert.equal(addRelation.status, 201);
  const graph = await worker.fetch(request(`/api/v1/graph?product=Civic&investigation_id=${casebook.id}`), env);
  assert.equal(graph.status, 200);
  const graphValue = await graph.json();
  assert.equal(graphValue.nodes.length, 2);
  assert.equal(graphValue.edges[0].interpretation, "inferred");
  assert.equal(graphValue.edges[0].source_url, "https://records.example.org/award");

  state.actor = { ...state.actor, tenantId: "org-b", workspaceId: "org-b" };
  const hiddenCasebook = await worker.fetch(request(`/api/v1/investigations/${casebook.id}?product=Civic`), env);
  const hiddenEntity = await worker.fetch(request(`/api/v1/entities/${entityA.id}?product=Civic`), env);
  assert.equal(hiddenCasebook.status, 404);
  assert.equal(hiddenEntity.status, 404);
  sql.close();
});

test("investigation writes require edit capability and reject stale revisions", async () => {
  const { sql, env, state } = setup();
  const created = await worker.fetch(request("/api/v1/investigations", "POST", { product: "Civic", title: "Source review" }), env);
  const casebook = await created.json();
  const stale = await worker.fetch(request(`/api/v1/investigations/${casebook.id}?product=Civic`, "PATCH", { expected_revision: 2, status: "archived" }), env);
  assert.equal(stale.status, 409);
  state.actor = { ...state.actor, role: "viewer" };
  const denied = await worker.fetch(request("/api/v1/entities", "POST", { product: "Civic", entity_type: "person", display_name: "Read only" }), env);
  assert.equal(denied.status, 403);
  const visible = await worker.fetch(request("/api/v1/investigations?product=Civic"), env);
  assert.equal(visible.status, 200);
  sql.close();
});

test("database foreign keys reject cross-tenant entity links and casebook items", () => {
  const { sql } = setup();
  const entityA = "123e4567-e89b-42d3-a456-426614174010";
  const entityB = "123e4567-e89b-42d3-a456-426614174011";
  const casebook = "123e4567-e89b-42d3-a456-426614174012";
  const insertEntity = sql.prepare("INSERT INTO harvy_v2_entities (id, tenant_id, workspace_id, product, entity_type, display_name, created_by, created_at, updated_at) VALUES (?, ?, ?, 'Civic', 'organization', ?, 'analyst', 1, 1)");
  insertEntity.run(entityA, "org-a", "org-a", "A entity");
  insertEntity.run(entityB, "org-b", "org-b", "B entity");
  sql.prepare("INSERT INTO harvy_v2_investigations (id, tenant_id, workspace_id, product, title, created_by, created_at, updated_at) VALUES (?, 'org-a', 'org-a', 'Civic', 'Casebook', 'analyst-a', 1, 1)").run(casebook);

  assert.throws(() => sql.prepare("INSERT INTO harvy_v2_relationships (id, tenant_id, workspace_id, product, from_entity_id, to_entity_id, relationship_type, interpretation, evidence_id, created_by, created_at) VALUES ('123e4567-e89b-42d3-a456-426614174013', 'org-a', 'org-a', 'Civic', ?, ?, 'associated_with', 'observed', ?, 'analyst-a', 1)")
    .run(entityA, entityB, ids.evidence), /FOREIGN KEY constraint failed/);
  assert.throws(() => sql.prepare("INSERT INTO harvy_v2_investigation_items (id, tenant_id, workspace_id, product, investigation_id, item_kind, target_entity_id, title, created_by, created_at) VALUES ('123e4567-e89b-42d3-a456-426614174014', 'org-a', 'org-a', 'Civic', ?, 'entity', ?, 'Other tenant entity', 'analyst-a', 1)")
    .run(casebook, entityB), /FOREIGN KEY constraint failed/);
  sql.close();
});
