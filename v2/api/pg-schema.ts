import { doublePrecision, integer, pgTable, text } from "drizzle-orm/pg-core";

export const pgEvents = pgTable("harvy_v2_events", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  product: text("product").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  status: text("status").notNull(),
  firstSeenAt: doublePrecision("first_seen_at").notNull(),
  lastSeenAt: doublePrecision("last_seen_at").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  createdAt: doublePrecision("created_at").notNull(),
  updatedAt: doublePrecision("updated_at").notNull(),
});

export const pgEvidence = pgTable("harvy_v2_evidence", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  product: text("product").notNull(),
  eventId: text("event_id").notNull(),
  sourceId: text("source_id").notNull(),
  sourceUrl: text("source_url").notNull(),
  publisher: text("publisher").notNull(),
  headline: text("headline").notNull(),
  excerpt: text("excerpt").notNull(),
  capturedAt: doublePrecision("captured_at").notNull(),
  artifactId: text("artifact_id"),
  createdAt: doublePrecision("created_at").notNull(),
});

export const pgSources = pgTable("harvy_v2_sources", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  connectorId: text("connector_id").notNull(),
  product: text("product").notNull(),
  publisher: text("publisher").notNull(),
  label: text("label").notNull(),
  targetUrl: text("target_url").notNull(),
  sourceScopeId: text("source_scope_id").notNull(),
  mode: text("mode").notNull(),
  maxPages: integer("max_pages").notNull(),
  configRevision: text("config_revision").notNull(),
  enabled: integer("enabled").notNull(),
  createdAt: doublePrecision("created_at").notNull(),
  updatedAt: doublePrecision("updated_at").notNull(),
});

export const pgApiSchema = { events: pgEvents, evidence: pgEvidence, sources: pgSources };
