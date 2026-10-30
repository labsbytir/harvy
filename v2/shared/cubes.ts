/**
 * Shared cube registry: ONE definition per cube. All cubes are served from the
 * operational SQL store (Postgres via Hyperdrive in prod, D1/SQLite locally)
 * through Drizzle Cube (v2/api/analytics.ts). Basin is paused (2026-10-30 directive).
 */

export interface CubeField {
  /** HQL field alias, e.g. "status". */
  field: string;
  /** Drizzle Cube member, e.g. "Events.status". */
  member: string;
  title: string;
  kind: "string" | "time";
  /** Column in the operational Postgres/D1 table. */
  postgresColumn: string;
}

export interface CubeDefinition {
  /** Drizzle Cube name, e.g. "Events". */
  name: string;
  /** HQL cube name, e.g. "events". */
  hql: string;
  title: string;
  description: string;
  postgresTable: string;
  /** Keyed by HQL field name. */
  fields: Record<string, CubeField>;
  /** Cross-cube HQL aliases served via joins on Postgres. */
  joinedFields: Record<string, string>;
  countMeasure: { member: string; title: string };
  /** HQL field that time_range applies to. */
  timeField: string;
}

const events: CubeDefinition = {
  name: "Events",
  hql: "events",
  title: "Events",
  description: "Organization-scoped observed events.",
  postgresTable: "harvy_v2_events",
  fields: {
    id: { field: "id", member: "Events.id", title: "Event ID", kind: "string", postgresColumn: "id" },
    title: { field: "title", member: "Events.title", title: "Title", kind: "string", postgresColumn: "title" },
    summary: { field: "summary", member: "Events.summary", title: "Summary", kind: "string", postgresColumn: "summary" },
    status: { field: "status", member: "Events.status", title: "Status", kind: "string", postgresColumn: "status" },
    product: { field: "product", member: "Events.product", title: "Mode", kind: "string", postgresColumn: "product" },
    first_seen_at: { field: "first_seen_at", member: "Events.firstSeenAt", title: "First seen", kind: "time", postgresColumn: "first_seen_at" },
    last_seen_at: { field: "last_seen_at", member: "Events.lastSeenAt", title: "Last seen", kind: "time", postgresColumn: "last_seen_at" },
  },
  joinedFields: { source_id: "Evidence.sourceId" },
  countMeasure: { member: "Events.count", title: "Events" },
  timeField: "last_seen_at",
};

const evidence: CubeDefinition = {
  name: "Evidence",
  hql: "evidence",
  title: "Evidence",
  description: "Source-attributed observations attached to events.",
  postgresTable: "harvy_v2_evidence",
  fields: {
    id: { field: "id", member: "Evidence.id", title: "Evidence ID", kind: "string", postgresColumn: "id" },
    event_id: { field: "event_id", member: "Evidence.eventId", title: "Event ID", kind: "string", postgresColumn: "event_id" },
    source_id: { field: "source_id", member: "Evidence.sourceId", title: "Source ID", kind: "string", postgresColumn: "source_id" },
    publisher: { field: "publisher", member: "Evidence.publisher", title: "Publisher", kind: "string", postgresColumn: "publisher" },
    headline: { field: "headline", member: "Evidence.headline", title: "Headline", kind: "string", postgresColumn: "headline" },
    product: { field: "product", member: "Evidence.product", title: "Mode", kind: "string", postgresColumn: "product" },
    captured_at: { field: "captured_at", member: "Evidence.capturedAt", title: "Captured", kind: "time", postgresColumn: "captured_at" },
  },
  joinedFields: {},
  countMeasure: { member: "Evidence.count", title: "Evidence items" },
  timeField: "captured_at",
};

export const CUBE_LIST: readonly CubeDefinition[] = [events, evidence];
export const CUBES: Record<string, CubeDefinition> = Object.fromEntries(CUBE_LIST.map((def) => [def.hql, def]));

export function cubeByHqlName(hql: string): CubeDefinition | null {
  return CUBES[hql] ?? null;
}

/** "Evidence.publisher" -> the Evidence definition. */
export function cubeByMember(member: string): CubeDefinition | null {
  return CUBE_LIST.find((def) => member === def.name || member.startsWith(`${def.name}.`)) ?? null;
}

/** HQL field alias -> Cube member, including cross-cube joined aliases. */
export function hqlFieldMap(def: CubeDefinition): Record<string, string> {
  const map: Record<string, string> = {};
  for (const field of Object.values(def.fields)) map[field.field] = field.member;
  Object.assign(map, def.joinedFields);
  return map;
}

/** All registered Cube members (fields, joined aliases, count measures). */
export function cubeMembers(): Set<string> {
  const members = new Set<string>();
  for (const def of CUBE_LIST) {
    for (const field of Object.values(def.fields)) members.add(field.member);
    for (const member of Object.values(def.joinedFields)) members.add(member);
    members.add(def.countMeasure.member);
  }
  return members;
}
