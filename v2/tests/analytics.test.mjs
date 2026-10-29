import test from "node:test";
import assert from "node:assert/strict";
import { hqlToSemanticQuery, normalizeCubeQuery } from "../api/analytics.ts";
import { parseHqlQuery } from "../shared/hql.ts";

test("HQL maps only registered event and evidence fields to Drizzle Cube queries", () => {
  const query = parseHqlQuery({
    hql_version: 1,
    cube: "events",
    dimensions: ["status"],
    measures: ["count"],
    filters: [{ field: "status", operator: "eq", value: "new" }],
    limit: 25,
  });
  assert.deepEqual(hqlToSemanticQuery(query), {
    dimensions: ["Events.status"],
    measures: ["Events.count"],
    filters: [{ member: "Events.status", operator: "equals", values: ["new"] }],
    order: { "Events.status": "asc" },
    timeDimensions: [],
    limit: 25,
  });
  assert.equal(hqlToSemanticQuery({ ...query, dimensions: ["private_notes"] }), null);
});

test("Drizzle Cube requests allow only registered members and bounded operations", () => {
  const safe = {
    measures: ["Events.count"],
    dimensions: ["Events.status"],
    filters: [{ member: "Events.status", operator: "equals", values: ["new"] }],
    limit: 20,
  };
  assert.equal(normalizeCubeQuery(safe)?.limit, 20);
  assert.equal(normalizeCubeQuery({ ...safe, dimensions: ["Users.email"] }), null);
  assert.equal(normalizeCubeQuery({ ...safe, limit: 201 }), null);
  assert.equal(normalizeCubeQuery({ ...safe, sql: "SELECT *" }), null);
  assert.equal(normalizeCubeQuery({ ...safe, filters: [{ member: "Events.title", operator: "regex", values: [".*"] }] }), null);
  assert.equal(normalizeCubeQuery({ dimensions: ["Evidence.publisher"], ungrouped: true, total: true, limit: 20 })?.ungrouped, true);
  assert.equal(normalizeCubeQuery({ dimensions: ["Evidence.publisher"], ungrouped: "yes" }), null);
});

test("Drizzle Cube analytics layer registers tenant-scoped event and evidence schemas", async () => {
  const { createAnalyticsLayer } = await import("../api/analytics.ts");
  const calls = [];
  const db = {
    prepare(sql) {
      const call = { sql, params: [] };
      calls.push(call);
      return {
        bind(...params) { call.params = params; return this; },
        async all() { return { results: [] }; },
        async raw() { return []; },
        async first() { return null; },
        async run() { return { success: true, meta: { changes: 0 } }; },
      };
    },
    async batch() { return []; },
    exec() {},
  };
  const layer = createAnalyticsLayer(db);
  const scope = { tenantId: "tenant-a", workspaceId: "workspace-a", products: ["Newsk"] };
  assert.deepEqual(layer.getMetadata(scope).map((cube) => cube.name), ["Events", "Evidence"]);
  await layer.execute({ measures: ["Events.count"], dimensions: ["Events.status"], limit: 50 }, scope);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /tenant_id/);
  assert.match(calls[0].sql, /workspace_id/);
  assert.ok(calls[0].params.includes("tenant-a"));
  assert.ok(calls[0].params.includes("workspace-a"));
  assert.ok(calls[0].sql.includes("product"));
  assert.ok(calls[0].params.includes("Newsk"));
});
