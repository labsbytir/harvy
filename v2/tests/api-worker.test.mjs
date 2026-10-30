import test from "node:test";
import assert from "node:assert/strict";
import worker from "../api/worker.ts";

function fakeDb({ products = [], first = null, entitlements = products.map((product) => ({ product, enabled: 1, revision: 1 })) } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const query = { sql, params: [] };
      calls.push(query);
      return {
        bind(...params) { query.params = params; return this; },
        async all() {
          if (sql.includes("harvy_v2_product_entitlements") && sql.includes("enabled = 1")) return { results: products.map((product) => ({ product })) };
          if (sql.includes("harvy_v2_product_entitlements")) return { results: entitlements };
          return { results: [] };
        },
        async raw() { return []; },
        async first() { return first; },
        async run() { return { meta: { changes: 0 } }; },
      };
    },
  };
}

function auth(actor = null) {
  return { async fetch() { return actor ? Response.json(actor) : new Response(null, { status: 403 }); } };
}
const actor = { id: "user-1", tenantId: "org-a", workspaceId: "org-a", tenantName: "Workspace A", role: "member", harvyAdmin: false };

test("health is public and does not expose account state", async () => {
  const response = await worker.fetch(new Request("https://harvy.test/health"), {});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, "ok");
});

test("API denies missing organization membership", async () => {
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/context"), { HARVY_D1: fakeDb(), AUTH: auth() });
  assert.equal(response.status, 401);
});

test("unknown organization roles default to read-only capabilities", async () => {
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/runs", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source_id: "source-x", idempotency_key: "unknown-role-123" }),
  }), { HARVY_D1: fakeDb(), AUTH: auth({ ...actor, role: "custom-role" }), AUTOMATION_URL: "https://automation.example.org", AUTOMATION_DISPATCH_TOKEN: "unit-test-placeholder" });
  assert.equal(response.status, 403);
  const context = await worker.fetch(new Request("https://harvy.test/api/v1/context"), { HARVY_D1: fakeDb(), AUTH: auth({ ...actor, role: "custom-role" }) });
  assert.deepEqual((await context.json()).capabilities, []);
});

test("product context returns only explicitly enabled entitlements", async () => {
  const db = fakeDb({ products: ["Newsk"] });
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/context"), { HARVY_D1: db, AUTH: auth(actor) });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).allowedProducts, ["Newsk"]);
  assert.deepEqual(db.calls[0].params, ["org-a"]);
});

test("feature revision includes changes that disable a product", async () => {
  const db = fakeDb({ products: ["Newsk"], first: { revision: 8 } });
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/context"), { HARVY_D1: db, AUTH: auth(actor) });
  assert.equal((await response.json()).featureRevision, "8");
  const revisionQuery = db.calls.find(({ sql }) => sql.includes("SUM(revision)"));
  assert.ok(revisionQuery);
  assert.doesNotMatch(revisionQuery.sql, /enabled\s*=\s*1/i);
});

test("Newsk entitlement does not authorize Tower data", async () => {
  const db = fakeDb({ products: ["Newsk"] });
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/events?product=Tower"), { HARVY_D1: db, AUTH: auth(actor) });
  assert.equal(response.status, 403);
  assert.equal(db.calls.some(({ sql }) => sql.includes("FROM harvy_v2_events e")), false);
});

test("workspace search returns scoped events, evidence metadata, stories, and visible dashboards", async () => {
  const calls = [];
  const db = {
    prepare(sql) {
      const query = { sql, params: [] };
      calls.push(query);
      return {
        bind(...params) { query.params = params; return this; },
        async all() {
          if (sql.includes("harvy_v2_product_entitlements") && sql.includes("enabled = 1")) return { results: [{ product: "Newsk" }] };
          if (sql.includes("FROM harvy_v2_events e WHERE")) return { results: [{ id: "event-1", product: "Newsk", title: "Needle event", summary: "Evidence summary", status: "new", first_seen_at: 100, last_seen_at: 300, evidence_count: 1 }] };
          if (sql.includes("SELECT e.id, ev.id AS event_id")) return { results: [{ id: "evidence-1", event_id: "event-1", product: "Newsk", title: "Needle evidence", publisher: "Publisher", event_title: "Needle event", updated_at: 250 }] };
          if (sql.includes("FROM harvy_v2_stories")) return { results: [{ id: "story-1", product: "Newsk", event_id: "event-1", title: "Needle story", description: "Notes", updated_at: 200 }] };
          if (sql.includes("FROM harvy_v2_dashboards")) return { results: [{ id: "dashboard-1", product: "Newsk", title: "Needle view", description: "Saved dashboard", config_json: JSON.stringify({ portlets: [] }), updated_at: 100 }] };
          return { results: [] };
        },
        async first() { return null; },
        async run() { return { meta: { changes: 0 } }; },
      };
    },
  };
  const from = Date.parse("2026-10-01T00:00:00.000Z");
  const to = Date.parse("2026-10-29T00:00:00.000Z");
  const response = await worker.fetch(new Request(`https://harvy.test/api/v1/search?product=Newsk&q=needle&limit=4&from=${encodeURIComponent(new Date(from).toISOString())}&to=${encodeURIComponent(new Date(to).toISOString())}`), { HARVY_D1: db, AUTH: auth(actor) });
  assert.equal(response.status, 200);
  const items = (await response.json()).items;
  assert.deepEqual(items.map(({ type, id }) => [type, id]), [
    ["event", "event-1"], ["evidence", "evidence-1"], ["story", "story-1"], ["dashboard", "dashboard-1"],
  ]);
  assert.deepEqual(items[1], { type: "evidence", id: "evidence-1", event_id: "event-1", product: "Newsk", title: "Needle evidence", description: "Publisher · Needle event", updated_at: 250 });
  const eventQuery = calls.find(({ sql }) => sql.includes("FROM harvy_v2_events e WHERE"));
  const evidenceQuery = calls.find(({ sql }) => sql.includes("SELECT e.id, ev.id AS event_id"));
  const storyQuery = calls.find(({ sql }) => sql.includes("FROM harvy_v2_stories"));
  const dashboardQuery = calls.find(({ sql }) => sql.includes("FROM harvy_v2_dashboards"));
  assert.ok(eventQuery.sql.includes("e.tenant_id = ?") && eventQuery.sql.includes("e.workspace_id = ?"));
  assert.deepEqual(eventQuery.params.slice(4, 6), [from, to]);
  assert.ok(evidenceQuery.sql.includes("e.tenant_id = ?") && evidenceQuery.sql.includes("e.workspace_id = ?"));
  assert.deepEqual(evidenceQuery.params.slice(0, 4), ["org-a", "org-a", "Newsk", "Newsk"]);
  assert.deepEqual(evidenceQuery.params.slice(4, 10), ["needle", from, from, to, to, 4]);
  assert.deepEqual(storyQuery.params.slice(3, 7), [from, from, to, to]);
  assert.match(dashboardQuery.sql, /visibility = 'workspace' OR owner_principal_id = \?/);
  assert.deepEqual(dashboardQuery.params.slice(0, 4), ["org-a", "org-a", "Newsk", "user-1"]);
  assert.deepEqual(dashboardQuery.params.slice(5, 9), [from, from, to, to]);
});

test("workspace search rejects inverted time bounds", async () => {
  const db = fakeDb({ products: ["Newsk"] });
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/search?product=Newsk&q=needle&from=2026-10-29T00%3A00%3A00.000Z&to=2026-10-01T00%3A00%3A00.000Z"), { HARVY_D1: db, AUTH: auth(actor) });
  assert.equal(response.status, 400);
  assert.equal(db.calls.length, 1);
});

test("dashboard create and update reject malformed configs while saved views remain valid", async () => {
  const invalidCreate = await worker.fetch(new Request("https://harvy.test/api/v1/dashboards", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Bad config", product: "Newsk", config: { portlets: "not-an-array" } }),
  }), { HARVY_D1: fakeDb({ products: ["Newsk"] }), AUTH: auth(actor) });
  assert.equal(invalidCreate.status, 400);

  const invalidUpdate = await worker.fetch(new Request("https://harvy.test/api/v1/dashboards/123e4567-e89b-42d3-a456-426614174000", {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision: 1, title: "Bad config", config: { portlets: [{ id: "x", sql: "drop table events" }] } }),
  }), { HARVY_D1: fakeDb({ products: ["Newsk"] }), AUTH: auth(actor) });
  assert.equal(invalidUpdate.status, 400);

  const invalidVisibility = await worker.fetch(new Request("https://harvy.test/api/v1/dashboards/123e4567-e89b-42d3-a456-426614174000", {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision: 1, title: "Bad visibility", config: { portlets: [] }, visibility: "public" }),
  }), { HARVY_D1: fakeDb({ products: ["Newsk"] }), AUTH: auth(actor) });
  assert.equal(invalidVisibility.status, 400);

  const validView = await worker.fetch(new Request("https://harvy.test/api/v1/dashboards", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Council watchlist", product: "Newsk", config: { kind: "saved_view", hql_version: 1, filters: { query: "council", source_id: "", from: "", to: "", status: "all" } } }),
  }), { HARVY_D1: fakeDb({ products: ["Newsk"] }), AUTH: auth(actor) });
  assert.equal(validView.status, 201);
});

test("organization owners cannot grant themselves product entitlements", async () => {
  const db = fakeDb({ products: ["Newsk"] });
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/entitlements"), { HARVY_D1: db, AUTH: auth({ ...actor, role: "owner" }) });
  assert.equal(response.status, 403);
  assert.equal(db.calls.some(({ sql }) => sql.includes("UPDATE harvy_v2_product_entitlements")), false);
});

test("entitlement manager lists explicit states for all four modes", async () => {
  const owner = { ...actor, role: "owner", harvyAdmin: true };
  const db = fakeDb({ products: ["Newsk"], entitlements: [
    { product: "Newsk", enabled: 1, revision: 3 }, { product: "Tower", enabled: 0, revision: 2 },
  ] });
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/entitlements"), { HARVY_D1: db, AUTH: auth(owner) });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).items, [
    { product: "Newsk", enabled: true, revision: 3 },
    { product: "Tower", enabled: false, revision: 2 },
    { product: "Ops", enabled: false, revision: 0 },
    { product: "Civic", enabled: false, revision: 0 },
  ]);
});

test("a platform admin scoped without tenant membership can manage grants but not read tenant data", async () => {
  const platformAdmin = { ...actor, role: "platform_admin", harvyAdmin: true };
  const db = fakeDb({ products: ["Newsk"] });
  const context = await worker.fetch(new Request("https://harvy.test/api/v1/context"), { HARVY_D1: db, AUTH: auth(platformAdmin) });
  assert.deepEqual((await context.json()).capabilities, ["entitlements.manage"]);
  const events = await worker.fetch(new Request("https://harvy.test/api/v1/events?product=Newsk"), { HARVY_D1: db, AUTH: auth(platformAdmin) });
  assert.equal(events.status, 403);
  assert.equal(db.calls.some(({ sql }) => sql.includes("FROM harvy_v2_events e")), false);
});

test("entitlement changes require current revision and record an audit event", async () => {
  const owner = { ...actor, role: "admin", harvyAdmin: true };
  const calls = [];
  let row = { enabled: 0, revision: 2 };
  const db = {
    prepare(sql) {
      const call = { sql, params: [] };
      const statement = {
        sql,
        get params() { return call.params; },
        bind(...params) { call.params = params; return this; },
        async first() { return sql.includes("SELECT enabled, revision") ? row : null; },
      };
      calls.push(statement);
      return statement;
    },
    async batch(statements) {
      calls.push(...statements);
      row = { enabled: statements[0].params[0], revision: statements[0].params[1] };
      return [{ meta: { changes: 1 } }, { meta: { changes: 1 } }];
    },
  };
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/entitlements", {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product: "Tower", enabled: true, expected_revision: 2 }),
  }), { HARVY_D1: db, AUTH: auth(owner) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { product: "Tower", enabled: true, revision: 3 });
  assert.ok(calls.some(({ sql, params }) => sql.includes("UPDATE harvy_v2_product_entitlements") && params.includes("org-a")));
  assert.ok(calls.some(({ sql, params }) => sql.includes("INSERT OR IGNORE INTO harvy_v2_product_entitlement_audit") && params.includes(owner.id)));
});

test("only tenant admins can change approved monitor state with an audited revision", async () => {
  const source = { id: "123e4567-e89b-42d3-a456-426614174099", enabled: 1, revision: 4 };
  const db = {
    calls: [],
    prepare(sql) {
      const call = { sql, params: [] };
      this.calls.push(call);
      return {
        get sql() { return call.sql; },
        get params() { return call.params; },
        bind(...params) { call.params = params; return this; },
        async all() { return sql.includes("product_entitlements") ? { results: [{ product: "Newsk" }] } : { results: [] }; },
        async first() { return sql.includes("harvy_v2_sources") ? { ...source } : null; },
        async run() {
          if (sql.startsWith("UPDATE harvy_v2_sources")) {
            source.enabled = call.params[0];
            source.revision++;
            source.state_changed_by = call.params[2];
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        },
      };
    },
  };
  const response = await worker.fetch(new Request(`https://harvy.test/api/v1/sources/${source.id}?product=Newsk`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: false, expected_revision: 4 }),
  }), { HARVY_D1: db, AUTH: auth({ ...actor, role: "owner" }) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { id: source.id, enabled: false, revision: 5 });
  const update = db.calls.find(({ sql }) => sql.startsWith("UPDATE harvy_v2_sources"));
  assert.ok(update);
  assert.match(update.sql, /tenant_id = \? AND workspace_id = \? AND product = \?.*revision = \?/);
  assert.match(update.sql, /state_changed_by = \?/);
  assert.equal(update.params[2], "user-1");

  const memberDb = fakeDb({ products: ["Newsk"] });
  const denied = await worker.fetch(new Request(`https://harvy.test/api/v1/sources/${source.id}?product=Newsk`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: false, expected_revision: 5 }),
  }), { HARVY_D1: memberDb, AUTH: auth(actor) });
  assert.equal(denied.status, 403);
  assert.equal(memberDb.calls.length, 0);
});

test("audit feed is bounded, metadata-only, and restricted to Harvy admins", async () => {
  const rows = [
    { id: "ent-1", kind: "product_entitlement", tenant_id: "org-a", workspace_id: null, product: "Tower", subject_id: "Tower", subject_label: "Tower", enabled: 1, revision: 2, changed_by: "admin-1", changed_at: 200 },
    { id: "source-1:4", kind: "monitor_state", tenant_id: "org-b", workspace_id: "workspace-b", product: "Civic", subject_id: "source-1", subject_label: "Civic source", enabled: 0, revision: 4, changed_by: "admin-1", changed_at: 100 },
  ];
  const calls = [];
  const db = { prepare(sql) {
    const call = { sql, params: [] }; calls.push(call);
    return { bind(...params) { call.params = params; return this; }, async all() { return { results: rows }; } };
  } };
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/admin/audit?limit=2"), {
    HARVY_D1: db, AUTH: auth({ ...actor, harvyAdmin: true }),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.items.map(({ kind, enabled }) => [kind, enabled]), [["product_entitlement", true], ["monitor_state", false]]);
  assert.deepEqual(calls[0].params, [2]);
  assert.doesNotMatch(calls[0].sql, /target_url|config_json|source_snapshot/i);

  const deniedDb = fakeDb();
  const denied = await worker.fetch(new Request("https://harvy.test/api/v1/admin/audit"), {
    HARVY_D1: deniedDb, AUTH: auth({ ...actor, role: "owner", harvyAdmin: false }),
  });
  assert.equal(denied.status, 403);
  assert.equal(deniedDb.calls.length, 0);

  const invalid = await worker.fetch(new Request("https://harvy.test/api/v1/admin/audit?limit=101"), {
    HARVY_D1: db, AUTH: auth({ ...actor, harvyAdmin: true }),
  });
  assert.equal(invalid.status, 400);
});

test("monitor managers see paused approved sources while members only see active ones", async () => {
  const paused = { id: "123e4567-e89b-42d3-a456-426614174099", product: "Newsk", enabled: 0, revision: 2 };
  const sourceDb = () => ({
    calls: [],
    prepare(sql) {
      const call = { sql, params: [] };
      this.calls.push(call);
      return {
        bind(...params) { call.params = params; return this; },
        async all() {
          if (sql.includes("product_entitlements")) return { results: [{ product: "Newsk" }] };
          if (sql.includes("harvy_v2_sources")) return { results: sql.includes("enabled = 1") ? [] : [paused] };
          return { results: [] };
        },
        async first() { return null; },
        async run() { return { meta: { changes: 0 } }; },
      };
    },
  });
  const admin = sourceDb();
  const adminResponse = await worker.fetch(new Request("https://harvy.test/api/v1/sources?product=Newsk"), { HARVY_D1: admin, AUTH: auth({ ...actor, role: "owner" }) });
  assert.equal((await adminResponse.json()).items[0].enabled, 0);
  assert.match(admin.calls.find(({ sql }) => sql.includes("harvy_v2_sources")).sql, /approval_status = 'approved'/);

  const member = sourceDb();
  const memberResponse = await worker.fetch(new Request("https://harvy.test/api/v1/sources?product=Newsk"), { HARVY_D1: member, AUTH: auth(actor) });
  assert.deepEqual((await memberResponse.json()).items, []);
});

test("stale product-entitlement revisions are rejected without a write", async () => {
  const owner = { ...actor, role: "owner", harvyAdmin: true };
  let batchCalled = false;
  const db = {
    prepare(sql) {
      return {
        bind() { return this; },
        async first() { return sql.includes("SELECT enabled, revision") ? { enabled: 0, revision: 3 } : null; },
      };
    },
    async batch() { batchCalled = true; return []; },
  };
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/entitlements", {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product: "Tower", enabled: true, expected_revision: 2 }),
  }), { HARVY_D1: db, AUTH: auth(owner) });
  assert.equal(response.status, 409);
  assert.equal(batchCalled, false);
});

test("multi-product event queries require an entitled product selection", async () => {
  const db = fakeDb({ products: ["Tower", "Ops"] });
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/events"), { HARVY_D1: db, AUTH: auth(actor) });
  assert.equal(response.status, 403);
  assert.equal(db.calls.some(({ sql }) => sql.includes("FROM harvy_v2_events e")), false);
});

test("event list query is bound to the authenticated tenant and workspace", async () => {
  const db = fakeDb({ products: ["Newsk"] });
  const request = new Request("https://harvy.test/api/v1/events?product=Newsk&source_id=source-x&q=budget");
  const response = await worker.fetch(request, { HARVY_D1: db, AUTH: auth(actor) });
  assert.equal(response.status, 200);
  const query = db.calls.find(({ sql }) => sql.includes("FROM harvy_v2_events e"));
  assert.ok(query);
  assert.deepEqual(query.params.slice(0, 5), ["org-a", "org-a", "Newsk", "budget", "source-x"]);
  assert.match(query.sql, /e\.tenant_id = \?/);
  assert.match(query.sql, /e\.workspace_id = \?/);
});

test("HQL endpoint executes the bounded query through the tenant-scoped semantic layer", async () => {
  const db = fakeDb({ products: ["Newsk"] });
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/query", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hql_version: 1, cube: "events", product: "Newsk", dimensions: ["status"], measures: ["count"], filters: [], limit: 10 }),
  }), { HARVY_D1: db, AUTH: auth(actor) });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).rows, []);
  const query = db.calls.find(({ sql }) => sql.toLowerCase().includes("from \"harvy_v2_events\""));
  assert.ok(query);
  assert.ok(query.params.includes("org-a"));
});

test("Drizzle Cube DataBrowser ungrouped rows remain bound to tenant and product", async () => {
  const db = fakeDb({ products: ["Newsk"] });
  const query = JSON.stringify({ dimensions: ["Events.id", "Events.title"], ungrouped: true, total: true, limit: 25, offset: 0 });
  const url = `https://harvy.test/api/v1/cube/load?${new URLSearchParams({ query })}`;
  const response = await worker.fetch(new Request(url, { headers: { "x-harvy-product": "Newsk" } }), { HARVY_D1: db, AUTH: auth(actor) });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, []);
  const queryCall = db.calls.find(({ sql }) => sql.toLowerCase().includes("from \"harvy_v2_events\""));
  assert.ok(queryCall.params.includes("org-a"));
  assert.ok(queryCall.params.includes("Newsk"));
});

test("object write endpoints reject null JSON instead of throwing", async () => {
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/stories", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "null",
  }), { HARVY_D1: fakeDb({ products: ["Newsk"] }), AUTH: auth(actor) });
  assert.equal(response.status, 400);
});

test("chunked JSON bodies are capped without trusting Content-Length", async () => {
  const payload = JSON.stringify({ event_id: "x", title: "x", notes: "x".repeat(70_000) });
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/stories", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: payload,
  }), { HARVY_D1: fakeDb({ products: ["Newsk"] }), AUTH: auth(actor) });
  assert.equal(response.status, 413);
});

test("run submission fails closed when Automation is not configured", async () => {
  const db = fakeDb();
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/runs", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_id: "source-x", idempotency_key: "job-123456" }),
  }), { HARVY_D1: db, AUTH: auth(actor) });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error.message, /no run was started/i);
  assert.equal(db.calls.length, 0);
});

test("run submission returns 429 when the tenant quota trigger declines registration", async () => {
  const db = {
    prepare(sql) {
      return {
        bind() { return this; },
        async all() { return { results: sql.includes("product_entitlements") ? [{ product: "Newsk" }] : [] }; },
        async first() {
          return sql.includes("FROM harvy_v2_sources WHERE id")
            ? { id: "source-x", product: "Newsk", connector_id: "news_feed", target_url: "https://example.org", source_scope_id: "scope.news", mode: "crawl", max_pages: 100, config_revision: "1" }
            : null;
        },
        async run() { return { meta: { changes: 0 } }; },
      };
    },
  };
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/runs", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_id: "source-x", idempotency_key: "over-quota-run-123" }),
  }), { HARVY_D1: db, AUTH: auth(actor), AUTOMATION_URL: "https://automation.example.org", AUTOMATION_DISPATCH_TOKEN: "unit-test-placeholder" });
  assert.equal(response.status, 429);
  assert.equal((await response.json()).error.code, "run_quota_exceeded");
});

test("run dispatch sends the persisted, versioned source snapshot to the configured Automation host", async () => {
  const run = {
    id: "123e4567-e89b-42d3-a456-426614174099", source_id: "source-x", product: "Newsk", config_revision: "7",
    source_snapshot_json: JSON.stringify({ connector_id: "news_feed", product: "Newsk", target_url: "https://example.org/feed", source_scope_id: "scope.news", mode: "crawl", max_pages: 4 }),
    status: "queued", error_code: null, idempotency_key: "n8n-execution-123", dispatch_claimed_at: null, trace_id: "123e4567-e89b-42d3-a456-426614174098", created_at: Date.now(),
  };
  const db = {
    calls: [],
    prepare(sql) {
      const call = { sql, params: [] };
      this.calls.push(call);
      return {
        bind(...params) { call.params = params; return this; },
        async all() { return { results: sql.includes("product_entitlements") ? [{ product: "Newsk" }] : [] }; },
        async first() {
          if (sql.includes("FROM harvy_v2_sources WHERE id")) return { id: "source-x", product: "Newsk", connector_id: "news_feed", target_url: "https://example.org/feed", source_scope_id: "scope.news", mode: "crawl", max_pages: 4, config_revision: "7" };
          if (sql.includes("FROM harvy_v2_runs WHERE tenant_id")) return run;
          return null;
        },
        async run() {
          if (sql.includes("SET dispatch_claimed_at")) {
            const cutoff = call.params[4];
            if (run.dispatch_claimed_at !== null && run.dispatch_claimed_at > cutoff) return { meta: { changes: 0 } };
            run.dispatch_claimed_at = call.params[0];
          }
          if (sql.includes("SET error_code = 'dispatch_unconfirmed'")) run.error_code = "dispatch_unconfirmed";
          if (sql.includes("SET error_code = NULL")) run.error_code = null;
          return { meta: { changes: 1 } };
        },
      };
    },
  };
  const originalFetch = globalThis.fetch;
  let dispatched;
  let dispatchCount = 0;
  let failNextDispatch = false;
  globalThis.fetch = async (input, init) => {
    dispatchCount++;
    if (failNextDispatch) { failNextDispatch = false; throw new Error("network timeout"); }
    const request = new Request(input, init);
    dispatched = { url: request.url, authorization: request.headers.get("authorization"), body: await request.json() };
    return new Response(null, { status: 202 });
  };
  try {
    const response = await worker.fetch(new Request("https://harvy.test/api/v1/runs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_id: "source-x", idempotency_key: "n8n-execution-123" }),
    }), { HARVY_D1: db, AUTH: auth(actor), AUTOMATION_URL: "https://automation.example.org", AUTOMATION_DISPATCH_TOKEN: "secret-for-test" });
    assert.equal(response.status, 202);
    assert.equal(dispatched.url, "https://automation.example.org/webhook/internal/v1/scrape-runs");
    assert.equal(dispatched.authorization, "Bearer secret-for-test");
    assert.equal(dispatched.body.run_id, run.id);
    assert.equal(dispatched.body.access_scope_id, "tenant-org-a");
    assert.equal(dispatched.body.trace_id, run.trace_id);
    assert.equal(dispatched.body.config_revision, "7");
    assert.equal(dispatched.body.target_url, "https://example.org/feed");
    assert.equal(dispatched.body.max_pages, 4);
    assert.equal(dispatched.body.preflight_required, true);
    assert.equal(dispatched.body.direct_fallback_allowed, false);
    assert.equal("tenant_id" in dispatched.body, false);
    const retry = await worker.fetch(new Request("https://harvy.test/api/v1/runs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_id: "source-x", idempotency_key: "n8n-execution-123" }),
    }), { HARVY_D1: db, AUTH: auth(actor), AUTOMATION_URL: "https://automation.example.org", AUTOMATION_DISPATCH_TOKEN: "unit-test-placeholder" });
    assert.equal(retry.status, 202);
    assert.equal(dispatchCount, 1, "an idempotent retry must not dispatch an already-claimed run");

    run.dispatch_claimed_at = 0;
    failNextDispatch = true;
    const uncertain = await worker.fetch(new Request("https://harvy.test/api/v1/runs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_id: "source-x", idempotency_key: "n8n-execution-123" }),
    }), { HARVY_D1: db, AUTH: auth(actor), AUTOMATION_URL: "https://automation.example.org", AUTOMATION_DISPATCH_TOKEN: "unit-test-placeholder" });
    assert.equal(uncertain.status, 202);
    const uncertainBody = await uncertain.json();
    assert.equal(uncertainBody.error_code, "dispatch_unconfirmed");
    assert.equal(uncertainBody.idempotency_key, "n8n-execution-123");
    assert.equal(run.status, "queued", "an ambiguous transport failure must not terminalize a possibly accepted run");

    run.dispatch_claimed_at = 0;
    const resumed = await worker.fetch(new Request("https://harvy.test/api/v1/runs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_id: "source-x", idempotency_key: "n8n-execution-123" }),
    }), { HARVY_D1: db, AUTH: auth(actor), AUTOMATION_URL: "https://automation.example.org", AUTOMATION_DISPATCH_TOKEN: "unit-test-placeholder" });
    assert.equal(resumed.status, 202);
    assert.equal(run.id, dispatched.body.run_id, "same-key recovery must reuse the canonical run ID");
    assert.equal(dispatched.body.idempotency_key, "n8n-execution-123");
    assert.equal(run.error_code, null);
    assert.equal(dispatchCount, 3);
  } finally { globalThis.fetch = originalFetch; }
});

test("Ops action updates require an entitled product, capability, and current revision", async () => {
  const db = {
    calls: [],
  };
  db.prepare = (sql) => {
    const call = { sql, params: [] };
    db.calls.push(call);
    return {
      bind(...params) { call.params = params; return this; },
      async first() { return sql.includes("SELECT status, revision, source_story_id") ? { status: "open", revision: 1, source_story_id: "story", source_event_id: "event", source_product: "Newsk" } : { id: "123e4567-e89b-42d3-a456-426614174099", source_story_id: "story", status: "in_progress", revision: 2 }; },
      async run() { return { meta: { changes: 1 } }; },
      async all() { return { results: sql.includes("harvy_v2_product_entitlements") ? [{ product: "Ops" }] : [] }; },
    };
  };
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/actions/123e4567-e89b-42d3-a456-426614174099", {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision: 1, status: "in_progress" }),
  }), { HARVY_D1: db, AUTH: auth(actor) });
  assert.equal(response.status, 200);
  assert.deepEqual(db.calls.find(({ sql }) => sql.includes("UPDATE harvy_v2_ops_actions")).params.slice(-3), ["org-a", "org-a", 1]);
});

test("Tower handoff creates one evidence-backed, product-scoped Ops action", async () => {
  const calls = [];
  let action = null;
  const db = {
    prepare(sql) {
      const call = { sql, params: [] };
      calls.push(call);
      return {
        bind(...params) { call.params = params; return this; },
        async all() { return { results: sql.includes("product_entitlements") ? [{ product: "Tower" }, { product: "Ops" }] : [] }; },
        async first() {
          if (sql.includes("FROM harvy_v2_events WHERE id")) return { id: "123e4567-e89b-42d3-a456-426614174020" };
          if (sql.includes("SELECT COUNT(*) AS count FROM harvy_v2_evidence")) return { count: 1 };
          if (sql.includes("source_story_id IS NULL")) return action;
          return null;
        },
        async run() {
          if (sql.includes("INSERT OR IGNORE INTO harvy_v2_ops_actions")) {
            action = { id: call.params[0], status: "open" };
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        },
      };
    },
  };
  const url = "https://harvy.test/api/v1/events/123e4567-e89b-42d3-a456-426614174020/handoff?product=Tower";
  const options = { HARVY_D1: db, AUTH: auth(actor) };
  const first = await worker.fetch(new Request(url, { method: "POST" }), options);
  assert.equal(first.status, 201);
  assert.ok(calls.find(({ sql }) => sql.includes("INSERT OR IGNORE INTO harvy_v2_ops_actions")).params.includes("Tower"));
  const retry = await worker.fetch(new Request(url, { method: "POST" }), options);
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).action_id, action.id);
});

test("signed Automation callback advances only valid run states", async () => {
  const db = fakeDb({ first: { status: "queued" } });
  db.prepare = (sql) => ({
    bind(...params) { this.params = params; return this; },
    async first() { return { status: "queued" }; },
    async run() { return { meta: { changes: 1 } }; },
  });
  const secret = "test-callback-secret";
  const timestamp = Date.now();
  const payload = JSON.stringify({ run_id: "123e4567-e89b-42d3-a456-426614174000", status: "running" });
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`)));
  const signature = [...mac].map((v) => v.toString(16).padStart(2, "0")).join("");
  const response = await worker.fetch(new Request("https://harvy.test/internal/v1/automation-callback", {
    method: "POST", headers: { "x-harvy-timestamp": String(timestamp), "x-harvy-signature": signature }, body: payload,
  }), { HARVY_D1: db, AUTH: auth(), AUTOMATION_CALLBACK_SECRET: secret });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { accepted: true, status: "running" });
});

test("signed Automation publication checks R2 manifests and writes only the run's tenant scope", async () => {
  const db = {
    calls: [],
    prepare(sql) {
      const call = { sql, params: [] };
      this.calls.push(call);
      return {
        call,
        bind(...params) { call.params = params; return this; },
        async first() {
          if (sql.includes("FROM harvy_v2_runs WHERE id")) return {
            id: "123e4567-e89b-42d3-a456-426614174000", tenant_id: "org-a", workspace_id: "org-a",
            source_id: "source-x", status: "running", source_scope_id: "scope.news", product: "Newsk",
          };
          return null;
        },
      };
    },
    async batch(statements) {
      this.calls.push(...statements.map((statement) => statement.call));
      return statements.map(() => ({ meta: { changes: 1 } }));
    },
  };
  const artifacts = [
    { artifact_id: "raw-artifact-1", stage: "raw", source_scope_id: "scope.news", access_scope_id: "tenant-org-a", run_id: "123e4567-e89b-42d3-a456-426614174000", storage_uri: "r2://harvy-raw/tenant/raw.json", sha256: "a".repeat(64), byte_count: 10, capture_time: new Date().toISOString() },
    { artifact_id: "processed-artifact-1", stage: "processed", source_scope_id: "scope.news", access_scope_id: "tenant-org-a", run_id: "123e4567-e89b-42d3-a456-426614174000", storage_uri: "r2://harvy-artifacts/tenant/processed.json", sha256: "b".repeat(64), byte_count: 20, capture_time: new Date().toISOString() },
  ];
  const payload = JSON.stringify({
    run_id: "123e4567-e89b-42d3-a456-426614174000",
    artifacts,
    events: [{
      harvydex_id: "123e4567-e89b-42d3-a456-426614174001", title: "Verified event", summary: "A bounded event.",
      first_seen_at: Date.now(), last_seen_at: Date.now(),
      evidence: [{ source_url: "https://example.org/story", publisher: "Example", headline: "Reported event", excerpt: "Source text", captured_at: Date.now(), artifact_id: "processed-artifact-1" }],
    }],
  });
  const secret = "test-callback-secret";
  const timestamp = Date.now();
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${payload}`)));
  const signature = [...mac].map((v) => v.toString(16).padStart(2, "0")).join("");
  const response = await worker.fetch(new Request("https://harvy.test/internal/v1/automation-publications", {
    method: "POST", headers: { "x-harvy-timestamp": String(timestamp), "x-harvy-signature": signature }, body: payload,
  }), {
    HARVY_D1: db, AUTH: auth(), AUTOMATION_CALLBACK_SECRET: secret,
    HARVY_RAW: { async head() { return { size: 10, customMetadata: { sha256: "a".repeat(64) } }; } },
    HARVY_ARTIFACTS: { async head() { return { size: 20, customMetadata: { sha256: "b".repeat(64) } }; } },
  });
  assert.equal(response.status, 202);
  assert.match((await response.json()).run_id, /123e4567/);
  assert.ok(db.calls.some((call) => call.sql.includes("INSERT INTO harvy_v2_events") && call.params.includes("org-a")));
  assert.ok(db.calls.some((call) => call.sql.includes("INSERT OR IGNORE INTO harvy_v2_evidence") && call.params.includes("org-a")));
});
