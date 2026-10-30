import test from "node:test";
import assert from "node:assert/strict";
import worker from "../api/worker.ts";

function fakeDb({ products = [] } = {}) {
  return {
    prepare(sql) {
      return {
        bind() { return this; },
        async all() { return { results: sql.includes("enabled = 1") ? products.map((product) => ({ product })) : [] }; },
        async first() { return null; },
        async raw() { return []; },
        async run() { return { meta: { changes: 0 } }; },
      };
    },
  };
}
const auth = { async fetch() { return Response.json({ id: "user-1", tenantId: "org-a", workspaceId: "org-a", tenantName: "Workspace A", role: "member", harvyAdmin: false }); } };

test("query route serves the evidence cube from Postgres/Hyperdrive (Basin paused)", async () => {
  const body = JSON.stringify({ hql_version: 1, cube: "evidence", product: "Newsk", dimensions: ["publisher"], measures: ["count"], filters: [], limit: 10 });
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/query", { method: "POST", headers: { "Content-Type": "application/json" }, body }),
    { HARVY_D1: fakeDb({ products: ["Newsk"] }), AUTH: auth });
  assert.equal(response.status, 200);
});

test("cube/load serves both Evidence and Events from Postgres", async () => {
  const load = (query) => `https://harvy.test/api/v1/cube/load?${new URLSearchParams({ query })}`;
  const evidenceRes = await worker.fetch(new Request(load(JSON.stringify({ dimensions: ["Evidence.publisher"], measures: ["Evidence.count"], limit: 10 })), { headers: { "x-harvy-product": "Newsk" } }),
    { HARVY_D1: fakeDb({ products: ["Newsk"] }), AUTH: auth });
  assert.equal(evidenceRes.status, 200);
  const pgRes = await worker.fetch(new Request(load(JSON.stringify({ dimensions: ["Events.status"], measures: ["Events.count"], limit: 10 })), { headers: { "x-harvy-product": "Newsk" } }),
    { HARVY_D1: fakeDb({ products: ["Newsk"] }), AUTH: auth });
  assert.equal(pgRes.status, 200);
  const eventsRes = await worker.fetch(new Request("https://harvy.test/api/v1/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hql_version: 1, cube: "events", product: "Newsk", dimensions: ["status"], measures: ["count"], filters: [], limit: 10 }) }),
    { HARVY_D1: fakeDb({ products: ["Newsk"] }), AUTH: auth });
  assert.equal(eventsRes.status, 200);
});
