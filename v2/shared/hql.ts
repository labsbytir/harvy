/** HQL: versioned typed JSON query over registered Ontoly semantics. No raw SQL. */
export interface HqlFilter {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";
  value: string | number | boolean | readonly (string | number)[];
}

export interface HqlQuery {
  hql_version: 1;
  cube: string;
  dimensions: readonly string[];
  measures: readonly string[];
  filters: readonly HqlFilter[];
  limit: number;
  time_range?: { from: string; to: string };
}

const NAME = /^[a-z][a-z0-9_]{0,63}$/;

export function parseHqlQuery(value: unknown): HqlQuery | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (v.hql_version !== 1 || typeof v.cube !== "string" || !NAME.test(v.cube)) return null;
  if (!Array.isArray(v.dimensions) || !Array.isArray(v.measures) || !Array.isArray(v.filters)) return null;
  for (const d of [...v.dimensions, ...v.measures]) {
    if (typeof d !== "string" || !NAME.test(d)) return null;
  }
  for (const f of v.filters as unknown[]) {
    if (typeof f !== "object" || f === null || Array.isArray(f)) return null;
    const fl = f as Record<string, unknown>;
    if (typeof fl.field !== "string" || !NAME.test(fl.field)) return null;
    if (!["eq","neq","gt","gte","lt","lte","contains","in"].includes(String(fl.operator))) return null;
    const val = fl.value;
    const okVal = typeof val === "string" || typeof val === "number" || typeof val === "boolean" ||
      (Array.isArray(val) && val.every((x) => typeof x === "string" || typeof x === "number"));
    if (!okVal) return null;
  }
  if (!Number.isInteger(v.limit) || (v.limit as number) < 1 || (v.limit as number) > 500) return null;
  if (v.time_range !== undefined) {
    const t = v.time_range as Record<string, unknown>;
    if (typeof t !== "object" || t === null || typeof t.from !== "string" || typeof t.to !== "string") return null;
    if (Number.isNaN(Date.parse(t.from)) || Number.isNaN(Date.parse(t.to))) return null;
  }
  return value as unknown as HqlQuery;
}
