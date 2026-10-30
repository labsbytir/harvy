/**
 * HQL / Drizzle Cube query -> Basin SQL compiler.
 *
 * UNVERIFIED against live Basin: no Basin Catalog exists on harvy-production, harvy-public,
 * or harvy-raw (checked 2026-10-30). Unit-tested against generated SQL text only. Until
 * BASIN_ACCOUNT_ID / BASIN_BUCKET / BASIN_SQL_TOKEN are set, execution fails closed with a
 * "not_provisioned" error (HTTP 503) — never an empty result set.
 *
 * Basin SQL (Apache DataFusion over Iceberg) is queried over REST with no bind parameters,
 * so every value is emitted as a strictly encoded SQL literal and identifiers come only from
 * the registered cube definitions in v2/shared/cubes.ts. The tenant/workspace/product scope
 * predicate is always injected FIRST, before any user filter or time range.
 */
import type { SemanticQuery } from "drizzle-cube/server";
import type { HqlFilter, HqlQuery } from "../shared/hql.ts";
import { cubeByHqlName, cubeByMember, type CubeDefinition, type CubeField } from "../shared/cubes.ts";

export type BasinErrorCode =
  | "unknown_cube" | "cube_not_on_basin" | "unknown_field" | "unsupported_operator"
  | "unsupported_join" | "unsupported_feature" | "invalid_time_range" | "invalid_selection"
  | "invalid_scope" | "not_provisioned" | "basin_query_failed";

export class BasinError extends Error {
  readonly code: BasinErrorCode;
  constructor(code: BasinErrorCode, message: string) {
    super(message);
    this.name = "BasinError";
    this.code = code;
  }
}

export interface BasinScope { tenantId: string; workspaceId: string; products: string[] }
export interface BasinEnv { BASIN_ACCOUNT_ID?: string; BASIN_BUCKET?: string; BASIN_SQL_TOKEN?: string }
export interface BasinConfig { accountId: string; bucket: string; token: string }

// Scope columns carried by the Iceberg tables (assumed schema, unverified against live Basin).
const SCOPE_COLUMNS = { tenant: "tenant_id", workspace: "workspace_id", product: "product" } as const;
const TABLE_ALIAS = "t";
const MAX_LIMIT = 10_000; // Basin SQL caps LIMIT at 10,000.

const ident = (name: string): string => `"${name.replace(/"/g, '""')}"`;
const col = (field: CubeField): string => `${ident(TABLE_ALIAS)}.${ident(field.basinColumn)}`;

/** Basin SQL has no bind parameters: encode every value as a safe literal. */
function literal(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new BasinError("invalid_selection", "Non-finite numeric value cannot be compiled to SQL.");
    return String(value);
  }
  return `'${value.replace(/'/g, "''")}'`;
}

function isoLiteral(value: string): string {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) throw new BasinError("invalid_time_range", "Time range bound is not a parseable timestamp.");
  return literal(new Date(time).toISOString()); // Basin timestamps need an RFC3339 timezone.
}

function scopePredicate(scope: BasinScope): string {
  if (typeof scope.tenantId !== "string" || !scope.tenantId ||
      typeof scope.workspaceId !== "string" || !scope.workspaceId ||
      !Array.isArray(scope.products) || scope.products.length === 0 ||
      scope.products.some((product) => typeof product !== "string" || !product)) {
    throw new BasinError("invalid_scope", "Missing trusted tenant/workspace/product scope.");
  }
  return [
    `${ident(TABLE_ALIAS)}.${ident(SCOPE_COLUMNS.tenant)} = ${literal(scope.tenantId)}`,
    `${ident(TABLE_ALIAS)}.${ident(SCOPE_COLUMNS.workspace)} = ${literal(scope.workspaceId)}`,
    `${ident(TABLE_ALIAS)}.${ident(SCOPE_COLUMNS.product)} IN (${scope.products.map(literal).join(", ")})`,
  ].join(" AND ");
}

function basinCubeForHql(query: HqlQuery): CubeDefinition {
  if ("joins" in query) throw new BasinError("unsupported_join", "The Basin compiler serves one cube per query; joins are not supported.");
  const def = cubeByHqlName(query.cube);
  if (!def) throw new BasinError("unknown_cube", `Cube "${query.cube}" is not registered.`);
  if (def.engine !== "basin") throw new BasinError("cube_not_on_basin", `Cube "${def.name}" is served by ${def.engine}, not Basin.`);
  return def;
}

function resolveField(def: CubeDefinition, field: string): CubeField {
  const own = def.fields[field];
  if (own) return own;
  if (def.joinedFields[field]) throw new BasinError("unsupported_join", `Field "${field}" belongs to a joined cube; the Basin compiler rejects cross-cube members.`);
  throw new BasinError("unknown_field", `Field "${field}" is not a registered member of cube "${def.name}".`);
}

function memberField(def: CubeDefinition, member: string): CubeField {
  const field = Object.values(def.fields).find((f) => f.member === member);
  if (field) return field;
  if (Object.values(def.joinedFields).includes(member)) throw new BasinError("unsupported_join", `Member "${member}" belongs to a joined cube; the Basin compiler rejects cross-cube members.`);
  throw new BasinError("unknown_field", `Member "${member}" is not registered on cube "${def.name}".`);
}

const scalar = (filter: { value: unknown }): string => literal(filter.value as string | number | boolean);

const HQL_OPS: Record<string, (column: string, filter: HqlFilter) => string> = {
  eq: (c, f) => `${c} = ${scalar(f)}`,
  neq: (c, f) => `${c} <> ${scalar(f)}`,
  gt: (c, f) => `${c} > ${scalar(f)}`,
  gte: (c, f) => `${c} >= ${scalar(f)}`,
  lt: (c, f) => `${c} < ${scalar(f)}`,
  lte: (c, f) => `${c} <= ${scalar(f)}`,
  contains: (c, f) => `strpos(${c}, ${literal(String(f.value))}) > 0`,
  in: (c, f) => {
    const values = Array.isArray(f.value) ? f.value : [f.value];
    return values.length === 0 ? "FALSE" : `${c} IN (${values.map(literal).join(", ")})`;
  },
};

function hqlPredicate(def: CubeDefinition, filter: HqlFilter): string {
  const op = HQL_OPS[filter.operator];
  if (!op) throw new BasinError("unsupported_operator", `Operator "${String(filter.operator)}" is not supported by the Basin compiler.`);
  return op(col(resolveField(def, filter.field)), filter);
}

type SemanticFilter = NonNullable<SemanticQuery["filters"]>[number];
// Cube filters may also be logical groups (and/or/not); the Basin compiler rejects those explicitly.
interface MemberFilter { member: string; operator: string; values: (string | number | boolean)[] }
function asMemberFilter(filter: SemanticFilter): MemberFilter {
  const f = filter as Partial<MemberFilter>;
  if (typeof f.member !== "string" || typeof f.operator !== "string" || !Array.isArray(f.values)) {
    throw new BasinError("unsupported_operator", "Logical filter groups (and/or/not) are not supported by the Basin compiler.");
  }
  return f as MemberFilter;
}
const value0 = (filter: MemberFilter): string | number | boolean => filter.values[0];

const SEMANTIC_OPS: Record<string, (column: string, filter: MemberFilter) => string> = {
  equals: (c, f) => `${c} = ${literal(value0(f))}`,
  notEquals: (c, f) => `${c} <> ${literal(value0(f))}`,
  gt: (c, f) => `${c} > ${literal(value0(f))}`,
  gte: (c, f) => `${c} >= ${literal(value0(f))}`,
  lt: (c, f) => `${c} < ${literal(value0(f))}`,
  lte: (c, f) => `${c} <= ${literal(value0(f))}`,
  contains: (c, f) => `strpos(${c}, ${literal(String(value0(f)))}) > 0`,
  notContains: (c, f) => `strpos(${c}, ${literal(String(value0(f)))}) = 0`,
  in: (c, f) => (f.values.length === 0 ? "FALSE" : `${c} IN (${f.values.map(literal).join(", ")})`),
  notIn: (c, f) => (f.values.length === 0 ? "TRUE" : `${c} NOT IN (${f.values.map(literal).join(", ")})`),
  set: (c) => `${c} IS NOT NULL`,
  notSet: (c) => `${c} IS NULL`,
};

function semanticPredicate(def: CubeDefinition, raw: SemanticFilter): string {
  const filter = asMemberFilter(raw);
  const op = SEMANTIC_OPS[filter.operator];
  if (!op) throw new BasinError("unsupported_operator", `Cube filter operator "${String(filter.operator)}" is not supported by the Basin compiler.`);
  return op(col(memberField(def, filter.member)), filter);
}

interface Compiled {
  select: string[];
  where: string[];
  groupBy: number[];
  order: { ordinal: number; direction: "asc" | "desc" }[];
  limit: number;
  offset: number;
}

function fromClause(def: CubeDefinition): string {
  const [namespace, table] = def.basinTable.split(".");
  if (!namespace || !table) throw new BasinError("unknown_cube", `Basin table reference "${def.basinTable}" is malformed.`);
  return `${ident(namespace)}.${ident(table)} AS ${ident(TABLE_ALIAS)}`;
}

function buildSql(def: CubeDefinition, compiled: Compiled): string {
  const parts = [
    `SELECT ${compiled.select.join(", ")}`,
    `FROM ${fromClause(def)}`,
    `WHERE ${compiled.where.join(" AND ")}`,
  ];
  if (compiled.groupBy.length > 0) parts.push(`GROUP BY ${compiled.groupBy.join(", ")}`);
  if (compiled.order.length > 0) parts.push(`ORDER BY ${compiled.order.map((o) => `${o.ordinal} ${o.direction.toUpperCase()}`).join(", ")}`);
  parts.push(`LIMIT ${compiled.limit}`);
  if (compiled.offset > 0) parts.push(`OFFSET ${compiled.offset}`);
  return parts.join(" ");
}

function checkLimit(limit: number): number {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) throw new BasinError("invalid_selection", `Limit must be an integer between 1 and ${MAX_LIMIT}.`);
  return limit;
}

/** Compile an HQL document to Basin SQL. Throws a typed BasinError on anything unsupported. */
export function compileHqlToBasinSql(query: HqlQuery, scope: BasinScope): { sql: string } {
  const def = basinCubeForHql(query);
  const dimensions = query.dimensions.map((name) => resolveField(def, name));
  const badMeasure = query.measures.find((name) => name !== "count");
  if (badMeasure !== undefined) throw new BasinError("unknown_field", `Measure "${badMeasure}" is not registered on cube "${def.name}".`);
  if (dimensions.length + query.measures.length === 0) throw new BasinError("invalid_selection", "Query must select at least one dimension or measure.");
  const select = [
    ...dimensions.map((field) => `${col(field)} AS ${ident(field.member)}`),
    ...query.measures.map(() => `COUNT(*) AS ${ident(def.countMeasure.member)}`),
  ];
  const memberOrdinal = new Map<string, number>();
  [...dimensions.map((f) => f.member), ...query.measures.map(() => def.countMeasure.member)].forEach((member, i) => memberOrdinal.set(member, i + 1));
  const where = [scopePredicate(scope)]; // scope FIRST, before any user predicate
  if (query.time_range) {
    const time = resolveField(def, def.timeField);
    where.push(`${col(time)} >= ${isoLiteral(query.time_range.from)}`, `${col(time)} <= ${isoLiteral(query.time_range.to)}`);
  }
  for (const filter of query.filters) where.push(hqlPredicate(def, filter));
  const groupBy = dimensions.map((_, i) => i + 1);
  let order: Compiled["order"];
  if (query.order_by && query.order_by.length > 0) {
    order = [];
    for (const { field, direction } of query.order_by) {
      const ordinal = memberOrdinal.get(resolveField(def, field).member);
      if (ordinal === undefined) {
        if (dimensions.length === 0) continue; // single aggregate row; ordering is identity
        throw new BasinError("invalid_selection", `order_by field "${field}" must be selected when the query groups.`);
      }
      order.push({ ordinal, direction });
    }
  } else {
    order = dimensions.map((_, i) => ({ ordinal: i + 1, direction: "asc" as const })); // mirror the Postgres default
  }
  return { sql: buildSql(def, { select, where, groupBy, order, limit: checkLimit(query.limit), offset: 0 }) };
}

/** Compile a normalized Drizzle Cube query (the /api/v1/cube/load shape) to Basin SQL. */
export function compileSemanticToBasinSql(query: SemanticQuery, scope: BasinScope): { sql: string } {
  const members = [
    ...(query.measures ?? []), ...(query.dimensions ?? []),
    ...(query.filters ?? []).map((f) => asMemberFilter(f).member), ...(query.timeDimensions ?? []).map((t) => t.dimension),
  ];
  const first = members[0];
  if (!first) throw new BasinError("invalid_selection", "Query must reference at least one registered member.");
  const def = cubeByMember(first);
  if (!def) throw new BasinError("unknown_cube", `Member "${first}" belongs to no registered cube.`);
  if (def.engine !== "basin") throw new BasinError("cube_not_on_basin", `Cube "${def.name}" is served by ${def.engine}, not Basin.`);
  if (members.some((member) => cubeByMember(member) !== def)) {
    throw new BasinError("unsupported_join", "Query mixes cubes; the Basin compiler rejects cross-cube joins.");
  }
  if (query.total) throw new BasinError("unsupported_feature", "total=true is not supported by the Basin compiler.");
  const dimensions = (query.dimensions ?? []).map((member) => memberField(def, member));
  const measures = (query.measures ?? []).map((member) => {
    if (member !== def.countMeasure.member) throw new BasinError("unknown_field", `Measure "${member}" is not registered on cube "${def.name}".`);
    return def.countMeasure;
  });
  if (dimensions.length + measures.length === 0) throw new BasinError("invalid_selection", "Query must select at least one dimension or measure.");
  const select = [
    ...dimensions.map((field) => `${col(field)} AS ${ident(field.member)}`),
    ...measures.map((measure) => `COUNT(*) AS ${ident(measure.member)}`),
  ];
  const memberOrdinal = new Map<string, number>();
  [...dimensions.map((f) => f.member), ...measures.map((m) => m.member)].forEach((member, i) => memberOrdinal.set(member, i + 1));
  const where = [scopePredicate(scope)]; // scope FIRST, before any user predicate
  for (const time of query.timeDimensions ?? []) {
    const field = memberField(def, time.dimension);
    if (time.granularity) throw new BasinError("unsupported_feature", "Time granularity is not supported by the Basin compiler.");
    if (time.dateRange !== undefined) {
      if (!Array.isArray(time.dateRange) || time.dateRange.length !== 2) {
        throw new BasinError("unsupported_feature", "Single-string date ranges are not supported; use [from, to].");
      }
      where.push(`${col(field)} >= ${isoLiteral(time.dateRange[0])}`, `${col(field)} <= ${isoLiteral(time.dateRange[1])}`);
    }
  }
  for (const filter of query.filters ?? []) where.push(semanticPredicate(def, filter));
  const grouped = query.ungrouped !== true && dimensions.length > 0;
  const groupBy = grouped ? dimensions.map((_, i) => i + 1) : [];
  let order: Compiled["order"] = [];
  const requested = Object.entries(query.order ?? {});
  if (requested.length > 0) {
    for (const [member, direction] of requested) {
      const ordinal = memberOrdinal.get(member);
      if (ordinal === undefined) {
        if (!grouped) continue; // ungrouped/aggregate rows: column ordering still valid only when selected
        throw new BasinError("invalid_selection", `Order member "${member}" must be selected when the query groups.`);
      }
      order.push({ ordinal, direction });
    }
  } else if (grouped) {
    order = dimensions.map((_, i) => ({ ordinal: i + 1, direction: "asc" as const }));
  }
  const limit = checkLimit(query.limit ?? 100);
  const offset = query.offset ?? 0;
  if (!Number.isInteger(offset) || offset < 0 || offset > MAX_LIMIT) throw new BasinError("invalid_selection", "Offset must be an integer between 0 and 10000.");
  return { sql: buildSql(def, { select, where, groupBy, order, limit, offset }) };
}

const ACCOUNT_ID = /^[a-f0-9]{32}$/;
const BUCKET_NAME = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

/** Fail closed: missing or malformed Basin credentials return null, never a partial config. */
export function basinConfigFromEnv(env: BasinEnv): BasinConfig | null {
  const accountId = env.BASIN_ACCOUNT_ID ?? "";
  const bucket = env.BASIN_BUCKET ?? "";
  const token = env.BASIN_SQL_TOKEN ?? "";
  if (!ACCOUNT_ID.test(accountId) || !BUCKET_NAME.test(bucket) || token.length === 0 || token.length > 512) return null;
  return { accountId, bucket, token };
}

/**
 * Execute compiled SQL against Basin SQL over REST (there is no Workers binding).
 * Throws BasinError "not_provisioned" when credentials are absent — never an empty result.
 */
export async function runBasinQuery(env: BasinEnv, sql: string, fetchImpl: typeof fetch = fetch): Promise<Record<string, unknown>[]> {
  const config = basinConfigFromEnv(env);
  if (!config) throw new BasinError("not_provisioned", "Basin analytics is not provisioned: set BASIN_ACCOUNT_ID, BASIN_BUCKET, and BASIN_SQL_TOKEN.");
  const url = `https://api.sql.cloudflarestorage.com/api/v1/accounts/${config.accountId}/basin-sql/query/${config.bucket}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const body = await response.json().catch(() => null) as
    { success?: boolean; result?: { rows?: Record<string, unknown>[] }; errors?: { message?: string }[] } | null;
  if (!response.ok || !body || body.success !== true || !body.result) {
    const message = body?.errors?.[0]?.message ?? `HTTP ${response.status}`;
    throw new BasinError("basin_query_failed", `Basin SQL query failed: ${String(message).slice(0, 200)}`);
  }
  return body.result.rows ?? [];
}
