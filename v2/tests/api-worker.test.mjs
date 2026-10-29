import test from "node:test";
import assert from "node:assert/strict";
import worker from "../api/worker.ts";

function fakeDb({ products = [], first = null } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const query = { sql, params: [] };
      calls.push(query);
      return {
        bind(...params) { query.params = params; return this; },
        async all() {
          if (sql.includes("harvy_v2_product_entitlements")) return { results: products.map((product) => ({ product })) };
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
const actor = { id: "user-1", tenantId: "org-a", workspaceId: "org-a", tenantName: "Workspace A", role: "member" };

test("health is public and does not expose account state", async () => {
  const response = await worker.fetch(new Request("https://harvy.test/health"), {});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, "ok");
});

test("API denies missing organization membership", async () => {
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/context"), { HARVY_D1: fakeDb(), AUTH: auth() });
  assert.equal(response.status, 401);
});

test("Newsk premium entitlement includes all product modes", async () => {
  const db = fakeDb({ products: ["Newsk"] });
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/context"), { HARVY_D1: db, AUTH: auth(actor) });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).allowedProducts, ["Newsk", "Tower", "Ops", "Civic"]);
  assert.deepEqual(db.calls[0].params, ["org-a"]);
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

test("run dispatch sends the persisted, versioned source snapshot to the configured Automation host", async () => {
  const run = {
    id: "123e4567-e89b-42d3-a456-426614174099", source_id: "source-x", product: "Newsk", config_revision: "7",
    source_snapshot_json: JSON.stringify({ connector_id: "news_feed", product: "Newsk", target_url: "https://example.org/feed", source_scope_id: "scope.news", mode: "crawl", max_pages: 4 }),
    status: "queued", trace_id: "123e4567-e89b-42d3-a456-426614174098", created_at: Date.now(),
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
        async run() { return { meta: { changes: 1 } }; },
      };
    },
  };
  const originalFetch = globalThis.fetch;
  let dispatched;
  globalThis.fetch = async (input, init) => {
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
    assert.equal(dispatched.url, "https://automation.example.org/internal/v1/scrape-runs");
    assert.equal(dispatched.authorization, "Bearer secret-for-test");
    assert.equal(dispatched.body.run_id, run.id);
    assert.equal(dispatched.body.access_scope_id, "tenant-org-a");
    assert.equal(dispatched.body.trace_id, run.trace_id);
    assert.equal(dispatched.body.config_revision, "7");
    assert.equal(dispatched.body.target_url, "https://example.org/feed");
    assert.equal(dispatched.body.max_pages, 4);
    assert.equal("tenant_id" in dispatched.body, false);
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
