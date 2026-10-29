/** HQL: versioned typed JSON query over registered Ontoly semantics. No raw SQL. */
export interface HqlFilter {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";
  value: string | number | boolean | readonly (string | number)[];
}

export interface HqlQuery {
  hql_version: 1;
  cube: string;
  product?: "Newsk" | "Tower" | "Ops" | "Civic";
  dimensions: readonly string[];
  measures: readonly string[];
  filters: readonly HqlFilter[];
  order_by?: readonly { field: string; direction: "asc" | "desc" }[];
  limit: number;
  time_range?: { from: string; to: string };
}

const NAME = /^[a-z][a-z0-9_]{0,63}$/;

export function parseHqlQuery(value: unknown): HqlQuery | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const fields = new Set(["hql_version", "cube", "product", "dimensions", "measures", "filters", "order_by", "limit", "time_range"]);
  if (Object.keys(v).some((key) => !fields.has(key))) return null;
  if (v.hql_version !== 1 || typeof v.cube !== "string" || !NAME.test(v.cube)) return null;
  if (v.product !== undefined && !["Newsk", "Tower", "Ops", "Civic"].includes(String(v.product))) return null;
  if (!Array.isArray(v.dimensions) || v.dimensions.length > 20 || !Array.isArray(v.measures) || v.measures.length > 20 ||
      !Array.isArray(v.filters) || v.filters.length > 50) return null;
  for (const d of [...v.dimensions, ...v.measures]) {
    if (typeof d !== "string" || !NAME.test(d)) return null;
  }
  for (const f of v.filters as unknown[]) {
    if (typeof f !== "object" || f === null || Array.isArray(f)) return null;
    const fl = f as Record<string, unknown>;
    if (typeof fl.field !== "string" || !NAME.test(fl.field)) return null;
    if (!["eq","neq","gt","gte","lt","lte","contains","in"].includes(String(fl.operator))) return null;
    const val = fl.value;
    const okVal = (typeof val === "string" && val.length <= 1000) || (typeof val === "number" && Number.isFinite(val)) || typeof val === "boolean" ||
      (Array.isArray(val) && val.length <= 100 && val.every((x) => (typeof x === "string" && x.length <= 1000) || (typeof x === "number" && Number.isFinite(x))));
    if (!okVal) return null;
  }
  if (v.order_by !== undefined && (!Array.isArray(v.order_by) || v.order_by.length > 20 || v.order_by.some((item) =>
    typeof item !== "object" || item === null || Array.isArray(item) || typeof (item as Record<string, unknown>).field !== "string" ||
    !NAME.test((item as Record<string, unknown>).field as string) || !["asc", "desc"].includes(String((item as Record<string, unknown>).direction))))) return null;
  if (!Number.isInteger(v.limit) || (v.limit as number) < 1 || (v.limit as number) > 500) return null;
  if (v.time_range !== undefined) {
    const t = v.time_range as Record<string, unknown>;
    if (typeof t !== "object" || t === null || typeof t.from !== "string" || typeof t.to !== "string") return null;
    const from = Date.parse(t.from);
    const to = Date.parse(t.to);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) return null;
  }
  return value as unknown as HqlQuery;
}
