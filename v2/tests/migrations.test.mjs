import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const migrations = join(process.cwd(), "v2/migrations");

test("product records cannot point across tenant, workspace, or product scopes", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const file of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort()) {
    db.exec(readFileSync(join(migrations, file), "utf8"));
  }
  db.prepare("INSERT INTO harvy_v2_workspaces (id, tenant_id, name, created_at) VALUES (?, ?, ?, ?)").run("org-a", "org-a", "A", 1);
  db.prepare("INSERT INTO harvy_v2_workspaces (id, tenant_id, name, created_at) VALUES (?, ?, ?, ?)").run("org-b", "org-b", "B", 1);
  const source = db.prepare("INSERT INTO harvy_v2_sources (id, tenant_id, workspace_id, connector_id, product, publisher, label, target_url, source_scope_id, mode, max_pages, config_revision, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'api', 1, '1', 1, 1, 1)");
  source.run("source-a", "org-a", "org-a", "news_feed", "Newsk", "Publisher", "Feed", "https://example.org", "scope.news");
  source.run("source-b", "org-b", "org-b", "civic_feed", "Civic", "Publisher", "Feed", "https://example.org", "scope.civic");
  db.prepare("INSERT INTO harvy_v2_events (id, tenant_id, workspace_id, product, title, summary, status, first_seen_at, last_seen_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, '', 'new', 1, 1, 1, 1)")
    .run("123e4567-e89b-42d3-a456-426614174000", "org-a", "org-a", "Newsk", "Event");
  const evidence = db.prepare("INSERT INTO harvy_v2_evidence (id, tenant_id, workspace_id, product, event_id, source_id, source_url, publisher, headline, excerpt, captured_at, artifact_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', 1, NULL, 1)");
  evidence.run("evidence-a", "org-a", "org-a", "Newsk", "123e4567-e89b-42d3-a456-426614174000", "source-a", "https://example.org/story", "Publisher", "Headline");
  assert.throws(() => evidence.run("evidence-b", "org-a", "org-a", "Newsk", "123e4567-e89b-42d3-a456-426614174000", "source-b", "https://example.org/story", "Publisher", "Headline"), /FOREIGN KEY constraint failed/);
  assert.throws(() => evidence.run("evidence-c", "org-b", "org-b", "Newsk", "123e4567-e89b-42d3-a456-426614174000", "source-b", "https://example.org/story", "Publisher", "Headline"), /FOREIGN KEY constraint failed/);
  assert.throws(() => evidence.run("evidence-d", "org-a", "org-a", "Civic", "123e4567-e89b-42d3-a456-426614174000", "source-a", "https://example.org/story", "Publisher", "Headline"), /FOREIGN KEY constraint failed/);
  db.close();
});
