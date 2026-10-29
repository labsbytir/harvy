import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { createDrizzleSemanticLayer, type Cube, type DrizzleDatabase, type SecurityContext, type SemanticQuery } from "drizzle-cube/server";
import type { D1Database } from "@cloudflare/workers-types";
import type { HqlQuery } from "../shared/hql.ts";
import { events, evidence, apiSchema } from "./schema.ts";

export interface QueryScope { tenantId: string; workspaceId: string; products: string[] }

export function createAnalyticsLayer(database: D1Database) {
  const db = drizzle(database, { schema: apiSchema });
  const layer = createDrizzleSemanticLayer({ drizzle: db as unknown as DrizzleDatabase, schema: apiSchema });
  const scopeFrom = (context: SecurityContext): QueryScope => {
    if (typeof context.tenantId !== "string" || typeof context.workspaceId !== "string" ||
        !Array.isArray(context.products) || context.products.length === 0 || context.products.some((product) => typeof product !== "string")) throw new Error("Missing trusted query scope");
    return { tenantId: context.tenantId, workspaceId: context.workspaceId, products: context.products as string[] };
  }
  layer.registerCube({
    name: "Events",
    title: "Events",
    description: "Organization-scoped observed events.",
    sql: ({ securityContext }) => ({
      from: events,
      where: (() => { const scope = scopeFrom(securityContext); return and(eq(events.tenantId, scope.tenantId), eq(events.workspaceId, scope.workspaceId), inArray(events.product, scope.products)); })(),
    }),
    dimensions: {
      id: { name: "id", title: "Event ID", type: "string", sql: events.id, primaryKey: true, shown: false },
      title: { name: "title", title: "Title", type: "string", sql: events.title },
      summary: { name: "summary", title: "Summary", type: "string", sql: events.summary },
      status: { name: "status", title: "Status", type: "string", sql: events.status },
      product: { name: "product", title: "Mode", type: "string", sql: events.product },
      firstSeenAt: { name: "firstSeenAt", title: "First seen", type: "time", sql: sql`datetime(${events.firstSeenAt} / 1000, 'unixepoch')` },
      lastSeenAt: { name: "lastSeenAt", title: "Last seen", type: "time", sql: sql`datetime(${events.lastSeenAt} / 1000, 'unixepoch')` },
    },
    measures: {
      count: { name: "count", title: "Events", type: "count", sql: events.id },
    },
    joins: {
      Evidence: {
        targetCube: "Evidence",
        relationship: "hasMany",
        on: [
          { source: events.id, target: evidence.eventId },
          { source: events.tenantId, target: evidence.tenantId },
          { source: events.workspaceId, target: evidence.workspaceId },
        ],
      },
    },
  } satisfies Cube);
  layer.registerCube({
    name: "Evidence",
    title: "Evidence",
    description: "Source-attributed observations attached to events.",
    sql: ({ securityContext }) => ({
      from: evidence,
      where: (() => { const scope = scopeFrom(securityContext); return and(eq(evidence.tenantId, scope.tenantId), eq(evidence.workspaceId, scope.workspaceId), inArray(evidence.product, scope.products)); })(),
    }),
    dimensions: {
      id: { name: "id", title: "Evidence ID", type: "string", sql: evidence.id, primaryKey: true, shown: false },
      eventId: { name: "eventId", title: "Event ID", type: "string", sql: evidence.eventId },
      sourceId: { name: "sourceId", title: "Source ID", type: "string", sql: evidence.sourceId },
      publisher: { name: "publisher", title: "Publisher", type: "string", sql: evidence.publisher },
      headline: { name: "headline", title: "Headline", type: "string", sql: evidence.headline },
      product: { name: "product", title: "Mode", type: "string", sql: evidence.product },
      capturedAt: { name: "capturedAt", title: "Captured", type: "time", sql: sql`datetime(${evidence.capturedAt} / 1000, 'unixepoch')` },
    },
    measures: {
      count: { name: "count", title: "Evidence items", type: "count", sql: evidence.id },
    },
  } satisfies Cube);
  layer.validateCubeReferences();
  return layer;
}

const EVENT_FIELDS: Record<string, string> = {
  id: "Events.id", title: "Events.title", summary: "Events.summary",
  status: "Events.status", product: "Events.product", first_seen_at: "Events.firstSeenAt", last_seen_at: "Events.lastSeenAt", source_id: "Evidence.sourceId",
};
const EVIDENCE_FIELDS: Record<string, string> = {
  id: "Evidence.id", event_id: "Evidence.eventId", source_id: "Evidence.sourceId",
  publisher: "Evidence.publisher", headline: "Evidence.headline", product: "Evidence.product", captured_at: "Evidence.capturedAt",
};
const OPERATORS = { eq: "equals", neq: "notEquals", gt: "gt", gte: "gte", lt: "lt", lte: "lte", contains: "contains", in: "in" } as const;

const CUBE_MEMBERS = new Set([
  "Events.id", "Events.title", "Events.summary", "Events.status", "Events.product", "Events.firstSeenAt", "Events.lastSeenAt", "Events.count",
  "Evidence.id", "Evidence.eventId", "Evidence.sourceId", "Evidence.publisher", "Evidence.headline", "Evidence.product", "Evidence.capturedAt", "Evidence.count",
]);
const CUBE_FILTERS = new Set(["equals", "notEquals", "contains", "gt", "gte", "lt", "lte", "in"]);
const RELATIVE_RANGE = /^(?:this|last) (?:day|week|month|quarter|year|\d{1,3} days?|\d{1,2} weeks?|\d{1,2} months?|\d years?)$/i;

function validDateRange(value: unknown): boolean {
  return typeof value === "string" && (Number.isFinite(Date.parse(value)) || RELATIVE_RANGE.test(value));
}

export function normalizeCubeQuery(value: unknown): SemanticQuery | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const allowed = new Set(["measures", "dimensions", "filters", "timeDimensions", "order", "limit", "offset", "ungrouped", "total"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) return null;
  const listOfMembers = (name: "measures" | "dimensions") => {
    const items = input[name] ?? [];
    return Array.isArray(items) && items.length <= 20 && items.every((item) => typeof item === "string" && CUBE_MEMBERS.has(item)) ? items as string[] : null;
  };
  const measures = listOfMembers("measures");
  const dimensions = listOfMembers("dimensions");
  if (!measures || !dimensions || measures.length + dimensions.length === 0) return null;
  if ((input.ungrouped !== undefined && typeof input.ungrouped !== "boolean") ||
      (input.total !== undefined && typeof input.total !== "boolean")) return null;
  const filters = input.filters ?? [];
  if (!Array.isArray(filters) || filters.length > 50) return null;
  const safeFilters: NonNullable<SemanticQuery["filters"]> = [];
  for (const filter of filters) {
    if (typeof filter !== "object" || filter === null || Array.isArray(filter)) return null;
    const f = filter as Record<string, unknown>;
    if (typeof f.member !== "string" || !CUBE_MEMBERS.has(f.member) || !CUBE_FILTERS.has(String(f.operator)) ||
        !Array.isArray(f.values) || f.values.length > 100 || f.values.some((v) =>
          !(typeof v === "string" && v.length <= 1000) && typeof v !== "number" && typeof v !== "boolean")) return null;
    safeFilters.push({ member: f.member, operator: f.operator as NonNullable<SemanticQuery["filters"]>[number] extends { operator: infer O } ? O : never, values: f.values });
  }
  const timeDimensions = input.timeDimensions ?? [];
  if (!Array.isArray(timeDimensions) || timeDimensions.length > 2) return null;
  const safeTimes: NonNullable<SemanticQuery["timeDimensions"]> = [];
  for (const td of timeDimensions) {
    if (typeof td !== "object" || td === null || Array.isArray(td)) return null;
    const t = td as Record<string, unknown>;
    if (typeof t.dimension !== "string" || !["Events.firstSeenAt", "Events.lastSeenAt", "Evidence.capturedAt"].includes(t.dimension)) return null;
    const range = t.dateRange;
    if (range !== undefined && !(typeof range === "string" ? validDateRange(range) : Array.isArray(range) && range.length === 2 && range.every(validDateRange))) return null;
    if (t.granularity !== undefined && !["day", "week", "month", "quarter", "year"].includes(String(t.granularity))) return null;
    safeTimes.push({ dimension: t.dimension, dateRange: range as string | string[] | undefined, granularity: t.granularity as "day" | "week" | "month" | "quarter" | "year" | undefined });
  }
  const limit = input.limit ?? 100;
  const offset = input.offset ?? 0;
  if (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 200 ||
      !Number.isInteger(offset) || (offset as number) < 0 || (offset as number) > 10_000) return null;
  const order = input.order;
  if (order !== undefined && (typeof order !== "object" || order === null || Array.isArray(order) ||
      Object.entries(order).some(([key, direction]) => !CUBE_MEMBERS.has(key) || (direction !== "asc" && direction !== "desc")))) return null;
  return {
    measures, dimensions, filters: safeFilters, timeDimensions: safeTimes,
    order: order as Record<string, "asc" | "desc"> | undefined,
    ungrouped: input.ungrouped as boolean | undefined, total: input.total as boolean | undefined,
    limit: limit as number, offset: offset as number,
  };
}

export function hqlToSemanticQuery(query: HqlQuery): SemanticQuery | null {
  const map = query.cube === "events" ? EVENT_FIELDS : query.cube === "evidence" ? EVIDENCE_FIELDS : null;
  const cubeName = query.cube === "events" ? "Events" : query.cube === "evidence" ? "Evidence" : null;
  if (!map || !cubeName) return null;
  const dimensions = query.dimensions.map((name) => map[name]);
  const measures = query.measures.map((name) => name === "count" ? `${cubeName}.count` : undefined);
  if (dimensions.some((value) => !value) || measures.some((value) => !value)) return null;
  const filters = query.filters.map((filter) => {
    const member = map[filter.field];
    const operator = OPERATORS[filter.operator as keyof typeof OPERATORS];
    const values = Array.isArray(filter.value) ? [...filter.value] : [filter.value];
    return member && operator ? { member, operator, values } : null;
  });
  if (filters.some((filter) => filter === null)) return null;
  const orderEntries = query.order_by?.map(({ field, direction }) => [map[field], direction] as const) ||
    query.dimensions.map((field) => [map[field], "asc"] as const);
  if (orderEntries.some(([field]) => !field)) return null;
  const order = Object.fromEntries(orderEntries) as Record<string, "asc" | "desc">;
  const timeDimensions: NonNullable<SemanticQuery["timeDimensions"]> = [];
  if (query.time_range) timeDimensions.push({
    dimension: query.cube === "events" ? "Events.lastSeenAt" : "Evidence.capturedAt",
    dateRange: [query.time_range.from, query.time_range.to],
  });
  return { dimensions: dimensions as string[], measures: measures as string[], filters: filters as NonNullable<SemanticQuery["filters"]>, timeDimensions, order, limit: query.limit };
}
