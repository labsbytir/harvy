import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const events = sqliteTable("harvy_v2_events", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  product: text("product").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  status: text("status").notNull(),
  firstSeenAt: integer("first_seen_at").notNull(),
  lastSeenAt: integer("last_seen_at").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const evidence = sqliteTable("harvy_v2_evidence", {
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
  capturedAt: integer("captured_at").notNull(),
  artifactId: text("artifact_id"),
  createdAt: integer("created_at").notNull(),
});

export const sources = sqliteTable("harvy_v2_sources", {
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
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const apiSchema = { events, evidence, sources };
