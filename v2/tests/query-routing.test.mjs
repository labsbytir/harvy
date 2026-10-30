import test from "node:test";
import assert from "node:assert/strict";
import { parseHqlQuery } from "../shared/hql.ts";
import { BasinError, basinConfigFromEnv, compileHqlToBasinSql, compileSemanticToBasinSql, runBasinQuery } from "../api/basin-compiler.ts";
import worker from "../api/worker.ts";

const scope = { tenantId: "org-a", workspaceId: "ws-a", products: ["Newsk"] };

const evidenceQuery = (overrides = {}) => parseHqlQuery({
  hql_version: 1, cube: "evidence", product: "Newsk",
  dimensions: ["publisher"], measures: ["count"], filters: [], limit: 25, ...overrides,
});

test("HQL compiles to Basin SQL for every supported operator", () => {
  const cases = [
    [{ field: "publisher", operator: "eq", value: "BBC" }, `"t"."publisher" = 'BBC'`],
    [{ field: "publisher", operator: "neq", value: "BBC" }, `"t"."publisher" <> 'BBC'`],
    [{ field: "captured_at", operator: "gt", value: 1700000000 }, `"t"."captured_at" > 1700000000`],
    [{ field: "captured_at", operator: "gte", value: 1700000000 }, `"t"."captured_at" >= 1700000000`],
    [{ field: "captured_at", operator: "lt", value: 1700000000 }, `"t"."captured_at" < 1700000000`],
    [{ field: "captured_at", operator: "lte", value: 1700000000 }, `"t"."captured_at" <= 1700000000`],
    [{ field: "headline", operator: "contains", value: "budget" }, `strpos("t"."headline", 'budget') > 0`],
    [{ field: "source_id", operator: "in", value: ["src-a", "src-b"] }, `"t"."source_id" IN ('src-a', 'src-b')`],
  ];
  for (const [filter, fragment] of cases) {
    const { sql } = compileHqlToBasinSql(evidenceQuery({ filters: [filter] }), scope);
    assert.ok(sql.includes(fragment), `missing ${fragment} in: ${sql}`);
  }
  assert.ok(compileHqlToBasinSql(evidenceQuery({ filters: [{ field: "source_id", operator: "in", value: [] }] }), scope).sql.includes("FALSE"));
});

test("HQL time_range, order_by, and limit compile to a full representative statement", () => {
  const query = evidenceQuery({
    dimensions: ["publisher", "product"],
    filters: [
      { field: "headline", operator: "contains", value: "budget" },
      { field: "source_id", operator: "in", value: ["src-a", "src-b"] },
    ],
    order_by: [{ field: "publisher", direction: "desc" }],
    limit: 50,
    time_range: { from: "2026-10-01T00:00:00Z", to: "2026-10-30T00:00:00Z" },
  });
  const { sql } = compileHqlToBasinSql(query, scope);
  assert.equal(sql, `SELECT "t"."publisher" AS "Evidence.publisher", "t"."product" AS "Evidence.product", COUNT(*) AS "Evidence.count" FROM "default"."evidence" AS "t" WHERE "t"."tenant_id" = 'org-a' AND "t"."workspace_id" = 'ws-a' AND "t"."product" IN ('Newsk') AND "t"."captured_at" >= '2026-10-01T00:00:00.000Z' AND "t"."captured_at" <= '2026-10-30T00:00:00.000Z' AND strpos("t"."headline", 'budget') > 0 AND "t"."source_id" IN ('src-a', 'src-b') GROUP BY 1, 2 ORDER BY 1 DESC LIMIT 50`);
});

test("tenant/workspace/product scope is injected first and cannot be bypassed", () => {
  const { sql } = compileHqlToBasinSql(evidenceQuery({ filters: [{ field: "publisher", operator: "eq", value: "x' OR '1'='1" }] }), scope);
  const scopeSql = `WHERE "t"."tenant_id" = 'org-a' AND "t"."workspace_id" = 'ws-a' AND "t"."product" IN ('Newsk') AND`;
  assert.ok(sql.startsWith(`SELECT`), "sanity");
  assert.ok(sql.includes(scopeSql), `scope must come first: ${sql}`);
  const where = sql.slice(sql.indexOf("WHERE"));
  assert.ok(where.indexOf('"t"."tenant_id"') < where.indexOf('"t"."publisher"'), "scope precedes user filter in WHERE");
  assert.ok(sql.includes(`"t"."publisher" = 'x'' OR ''1''=''1'`), "user value is quote-escaped");
  assert.ok(!sql.includes(`OR '1'='1'`), "no unescaped injection");
  const evilScope = { tenantId: `org' OR '1'='1`, workspaceId: "ws-a", products: ["Newsk"] };
  const evil = compileHqlToBasinSql(evidenceQuery(), evilScope).sql;
  assert.ok(evil.includes(`"t"."tenant_id" = 'org'' OR ''1''=''1'`), "scope id is quote-escaped");
  assert.throws(() => compileHqlToBasinSql(evidenceQuery(), { tenantId: "", workspaceId: "ws-a", products: ["Newsk"] }), (e) => e instanceof BasinError && e.code === "invalid_scope");
  assert.throws(() => compileHqlToBasinSql(evidenceQuery(), { tenantId: "org-a", workspaceId: "ws-a", products: [] }), (e) => e instanceof BasinError && e.code === "invalid_scope");
});

test("unsupported operators, joins, cubes, and fields are rejected with typed errors", () => {
  assert.throws(() => compileHqlToBasinSql({ ...evidenceQuery(), filters: [{ field: "publisher", operator: "regex", value: ".*" }] }, scope),
    (e) => e instanceof BasinError && e.code === "unsupported_operator");
  assert.throws(() => compileHqlToBasinSql({ ...evidenceQuery(), joins: [{ relationship: "hasMany" }] }, scope),
    (e) => e instanceof BasinError && e.code === "unsupported_join");
  assert.throws(() => compileHqlToBasinSql(evidenceQuery({ dimensions: ["private_notes"] }), scope),
    (e) => e instanceof BasinError && e.code === "unknown_field");
  assert.throws(() => compileHqlToBasinSql(evidenceQuery({ dimensions: [], measures: [] }), scope),
    (e) => e instanceof BasinError && e.code === "invalid_selection");
  assert.throws(() => compileHqlToBasinSql(parseHqlQuery({ hql_version: 1, cube: "events", dimensions: ["status"], measures: ["count"], filters: [], limit: 5 }), scope),
    (e) => e instanceof BasinError && e.code === "cube_not_on_basin");
  assert.throws(() => compileHqlToBasinSql({ ...evidenceQuery(), cube: "users" }, scope),
    (e) => e instanceof BasinError && e.code === "unknown_cube");
  // Cross-cube member on the Postgres cube's HQL alias is a join: rejected explicitly on Basin.
  assert.throws(() => compileSemanticToBasinSql({
    dimensions: ["Evidence.publisher"], measures: ["Evidence.count"],
    filters: [{ member: "Events.status", operator: "equals", values: ["new"] }], limit: 10,
  }, scope), (e) => e instanceof BasinError && e.code === "unsupported_join");
});

test("Drizzle Cube query shape compiles to Basin SQL with filters, time range, order, offset", () => {
  const { sql } = compileSemanticToBasinSql({
    measures: ["Evidence.count"], dimensions: ["Evidence.publisher"],
    filters: [
      { member: "Evidence.headline", operator: "contains", values: ["budget"] },
      { member: "Evidence.sourceId", operator: "in", values: ["s1", "s2"] },
      { member: "Evidence.eventId", operator: "notSet", values: [] },
    ],
    timeDimensions: [{ dimension: "Evidence.capturedAt", dateRange: ["2026-10-01T00:00:00Z", "2026-10-31T00:00:00Z"] }],
    order: { "Evidence.publisher": "desc" }, limit: 25, offset: 5,
  }, scope);
  assert.ok(sql.includes(`FROM "default"."evidence" AS "t"`));
  assert.ok(sql.includes(`WHERE "t"."tenant_id" = 'org-a' AND "t"."workspace_id" = 'ws-a' AND "t"."product" IN ('Newsk') AND`));
  assert.ok(sql.includes(`"t"."captured_at" >= '2026-10-01T00:00:00.000Z' AND "t"."captured_at" <= '2026-10-31T00:00:00.000Z'`));
  assert.ok(sql.includes(`strpos("t"."headline", 'budget') > 0`));
  assert.ok(sql.includes(`"t"."source_id" IN ('s1', 's2')`));
  assert.ok(sql.includes(`"t"."event_id" IS NULL`));
  assert.ok(sql.includes("GROUP BY 1 ORDER BY 1 DESC LIMIT 25 OFFSET 5"));
  const ungrouped = compileSemanticToBasinSql({ dimensions: ["Evidence.id"], ungrouped: true, limit: 10 }, scope).sql;
  assert.ok(!ungrouped.includes("GROUP BY") && ungrouped.includes(`"t"."id" AS "Evidence.id"`));
  assert.throws(() => compileSemanticToBasinSql({ dimensions: ["Evidence.publisher"], timeDimensions: [{ dimension: "Evidence.capturedAt", dateRange: ["2026-10-01T00:00:00Z", "2026-10-31T00:00:00Z"], granularity: "day" }], limit: 10 }, scope),
    (e) => e instanceof BasinError && e.code === "unsupported_feature");
  assert.throws(() => compileSemanticToBasinSql({ dimensions: ["Evidence.publisher"], total: true, limit: 10 }, scope),
    (e) => e instanceof BasinError && e.code === "unsupported_feature");
  assert.throws(() => compileSemanticToBasinSql({ dimensions: ["Evidence.publisher"], filters: [{ member: "Evidence.headline", operator: "inDateRange", values: ["last 7 days"] }], limit: 10 }, scope),
    (e) => e instanceof BasinError && e.code === "unsupported_operator");
});

test("Basin execution fails closed without credentials and maps REST responses", async () => {
  await assert.rejects(() => runBasinQuery({}, "SELECT 1"), (e) => e instanceof BasinError && e.code === "not_provisioned");
  await assert.rejects(() => runBasinQuery({ BASIN_ACCOUNT_ID: "not-an-account", BASIN_BUCKET: "harvy-raw", BASIN_SQL_TOKEN: "t" }, "SELECT 1"),
    (e) => e instanceof BasinError && e.code === "not_provisioned");
  assert.equal(basinConfigFromEnv({}), null);
  const env = { BASIN_ACCOUNT_ID: "a".repeat(32), BASIN_BUCKET: "harvy-raw", BASIN_SQL_TOKEN: "tok" };
  assert.ok(basinConfigFromEnv(env));
  const seen = [];
  const okFetch = async (url, init) => {
    seen.push({ url, init });
    return Response.json({ success: true, result: { rows: [{ "Evidence.count": 3 }] } });
  };
  assert.deepEqual(await runBasinQuery(env, "SELECT COUNT(*) AS c FROM t", okFetch), [{ "Evidence.count": 3 }]);
  assert.equal(seen[0].url, `https://api.sql.cloudflarestorage.com/api/v1/accounts/${"a".repeat(32)}/basin-sql/query/harvy-raw`);
  assert.equal(seen[0].init.headers.Authorization, "Bearer tok");
  assert.deepEqual(JSON.parse(seen[0].init.body), { query: "SELECT COUNT(*) AS c FROM t" });
  await assert.rejects(() => runBasinQuery(env, "SELECT 1", async () => Response.json({ success: false, errors: [{ message: "boom" }] })),
    (e) => e instanceof BasinError && e.code === "basin_query_failed" && e.message.includes("boom"));
  await assert.rejects(() => runBasinQuery(env, "SELECT 1", async () => new Response("not json", { status: 500 })),
    (e) => e instanceof BasinError && e.code === "basin_query_failed");
});

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

test("query route sends Basin-flagged cubes to the Basin path and fails closed when unprovisioned", async () => {
  const body = JSON.stringify({ hql_version: 1, cube: "evidence", product: "Newsk", dimensions: ["publisher"], measures: ["count"], filters: [], limit: 10 });
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/query", { method: "POST", headers: { "Content-Type": "application/json" }, body }),
    { HARVY_D1: fakeDb({ products: ["Newsk"] }), AUTH: auth });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "unavailable");
});

test("cube/load routes Evidence to Basin (503 unprovisioned) and keeps Events on Postgres", async () => {
  const load = (query) => `https://harvy.test/api/v1/cube/load?${new URLSearchParams({ query })}`;
  const basinRes = await worker.fetch(new Request(load(JSON.stringify({ dimensions: ["Evidence.publisher"], measures: ["Evidence.count"], limit: 10 })), { headers: { "x-harvy-product": "Newsk" } }),
    { HARVY_D1: fakeDb({ products: ["Newsk"] }), AUTH: auth });
  assert.equal(basinRes.status, 503);
  const pgRes = await worker.fetch(new Request(load(JSON.stringify({ dimensions: ["Events.status"], measures: ["Events.count"], limit: 10 })), { headers: { "x-harvy-product": "Newsk" } }),
    { HARVY_D1: fakeDb({ products: ["Newsk"] }), AUTH: auth });
  assert.equal(pgRes.status, 200);
  const eventsRes = await worker.fetch(new Request("https://harvy.test/api/v1/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hql_version: 1, cube: "events", product: "Newsk", dimensions: ["status"], measures: ["count"], filters: [], limit: 10 }) }),
    { HARVY_D1: fakeDb({ products: ["Newsk"] }), AUTH: auth });
  assert.equal(eventsRes.status, 200);
});
