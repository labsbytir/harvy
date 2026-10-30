import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import worker from "../api/worker.ts";

const migrations = join(process.cwd(), "v2/migrations");

test("product records cannot point across tenant, workspace, or product scopes", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const file of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort()) {
    db.exec(readFileSync(join(migrations, file), "utf8"));
  }
  db.prepare("INSERT INTO harvy_v2_workspaces (id, tenant_id, name, created_at) VALUES (?, ?, ?, ?)").run("org-a", "org-a", "A", 1);
  db.prepare("INSERT INTO harvy_v2_workspaces (id, tenant_id, name, created_at) VALUES (?, ?, ?, ?)").run("org-b", "org-b", "B", 1);
  const source = db.prepare("INSERT INTO harvy_v2_sources (id, tenant_id, workspace_id, connector_id, product, publisher, label, target_url, source_scope_id, mode, max_pages, config_revision, approval_status, approved_by, approved_at, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'api', 1, '1', 'approved', 'platform-admin', 1, 1, 1, 1)");
  source.run("source-a", "org-a", "org-a", "news_feed", "Newsk", "Publisher", "Feed", "https://example.org", "scope.news");
  source.run("source-b", "org-b", "org-b", "civic_feed", "Civic", "Publisher", "Feed", "https://example.org", "scope.civic");
  const pendingSource = db.prepare("INSERT INTO harvy_v2_sources (id, tenant_id, workspace_id, connector_id, product, publisher, label, target_url, source_scope_id, mode, created_at, updated_at) VALUES ('source-pending', 'org-a', 'org-a', 'news_feed', 'Newsk', 'Publisher', 'Pending', 'https://example.org', 'scope.news', 'api', 1, 1)");
  pendingSource.run();
  assert.throws(() => db.prepare("UPDATE harvy_v2_sources SET enabled = 1 WHERE id = 'source-pending'").run(), /CHECK constraint failed/);
  const stateUpdate = db.prepare("UPDATE harvy_v2_sources SET enabled = 0, revision = revision + 1, state_changed_by = 'admin-a', updated_at = 2 WHERE id = 'source-a' AND revision = 1 AND approval_status = 'approved'");
  assert.equal(stateUpdate.run().changes, 1);
  assert.equal(stateUpdate.run().changes, 0, "stale monitor revisions do not update state");
  assert.equal(db.prepare("SELECT changed_by, revision, enabled FROM harvy_v2_source_state_audit WHERE source_id = 'source-a'").get().changed_by, "admin-a");
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM harvy_v2_source_state_audit").get().count, 1);
  db.prepare("INSERT INTO harvy_v2_events (id, tenant_id, workspace_id, product, title, summary, status, first_seen_at, last_seen_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, '', 'new', 1, 1, 1, 1)")
    .run("123e4567-e89b-42d3-a456-426614174000", "org-a", "org-a", "Newsk", "Event");
  const evidence = db.prepare("INSERT INTO harvy_v2_evidence (id, tenant_id, workspace_id, product, event_id, source_id, source_url, publisher, headline, excerpt, captured_at, artifact_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', 1, NULL, 1)");
  evidence.run("evidence-a", "org-a", "org-a", "Newsk", "123e4567-e89b-42d3-a456-426614174000", "source-a", "https://example.org/story", "Publisher", "Headline");
  assert.throws(() => evidence.run("evidence-b", "org-a", "org-a", "Newsk", "123e4567-e89b-42d3-a456-426614174000", "source-b", "https://example.org/story", "Publisher", "Headline"), /FOREIGN KEY constraint failed/);
  assert.throws(() => evidence.run("evidence-c", "org-b", "org-b", "Newsk", "123e4567-e89b-42d3-a456-426614174000", "source-b", "https://example.org/story", "Publisher", "Headline"), /FOREIGN KEY constraint failed/);
  assert.throws(() => evidence.run("evidence-d", "org-a", "org-a", "Civic", "123e4567-e89b-42d3-a456-426614174000", "source-a", "https://example.org/story", "Publisher", "Headline"), /FOREIGN KEY constraint failed/);
  db.prepare("INSERT INTO harvy_v2_product_entitlements (tenant_id, product, enabled, revision, updated_at) VALUES ('org-a', 'Newsk', 1, 1, 1)").run();
  const grantAudit = db.prepare("INSERT INTO harvy_v2_product_entitlement_audit (id, tenant_id, product, enabled, revision, changed_by, changed_at) VALUES (?, 'org-a', 'Newsk', 1, 1, 'admin-a', 1)");
  grantAudit.run("grant-a");
  assert.throws(() => grantAudit.run("grant-b"), /UNIQUE constraint failed/);
  db.close();
});

test("run quota is tenant-wide per UTC hour and charges the registered page limit", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const file of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort()) {
    db.exec(readFileSync(join(migrations, file), "utf8"));
  }
  const workspace = db.prepare("INSERT INTO harvy_v2_workspaces (id, tenant_id, name, created_at) VALUES (?, 'org-a', ?, 1)");
  workspace.run("org-a", "A");
  workspace.run("org-a-2", "A2");
  const source = db.prepare("INSERT INTO harvy_v2_sources (id, tenant_id, workspace_id, connector_id, product, publisher, label, target_url, source_scope_id, mode, max_pages, config_revision, approval_status, approved_by, approved_at, enabled, created_at, updated_at) VALUES (?, 'org-a', ?, 'test', 'Newsk', 'Publisher', ?, 'https://example.org', 'scope.news', 'crawl', 100, '1', 'approved', 'platform-admin', 1, 1, 1, 1)");
  source.run("source-a", "org-a", "A");
  source.run("source-a2", "org-a-2", "A2");
  const insertRun = db.prepare("INSERT OR IGNORE INTO harvy_v2_runs (id, tenant_id, workspace_id, product, source_id, source_scope_id, config_revision, source_snapshot_json, requested_by, idempotency_key, status, quota_units, trace_id, created_at, updated_at) VALUES (?, 'org-a', ?, 'Newsk', ?, 'scope.news', '1', '{}', 'user-1', ?, 'queued', ?, 'trace', ?, ?)");
  const hour = Math.floor(Date.now() / 3_600_000) * 3_600_000;
  const addRun = (prefix, count, at, units, workspaceId, sourceId) => {
    for (let i = 0; i < count; i++) {
      const createdAt = at;
      const result = insertRun.run(`${prefix}-${i}`, workspaceId, sourceId, `${prefix}-key-${i}`, units, createdAt, createdAt);
      assert.equal(result.changes, 1);
    }
  };
  addRun("pages", 5, hour, 100, "org-a", "source-a");
  assert.equal(insertRun.run("pages-over", "org-a-2", "source-a2", "pages-over-key", 1, hour, hour).changes, 0);
  addRun("runs", 10, hour + 3_600_000, 1, "org-a", "source-a");
  addRun("runs-other-workspace", 10, hour + 3_600_000, 1, "org-a-2", "source-a2");
  assert.equal(insertRun.run("runs-over", "org-a", "source-a", "runs-over-key", 1, hour + 3_600_000, hour + 3_600_000).changes, 0);
  db.close();
});

test("platform audit endpoint reads real migration audit rows without source configuration", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const file of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort()) {
    db.exec(readFileSync(join(migrations, file), "utf8"));
  }
  db.prepare("INSERT INTO harvy_v2_workspaces (id, tenant_id, name, created_at) VALUES ('org-a', 'org-a', 'A', 1)").run();
  db.prepare("INSERT INTO harvy_v2_sources (id, tenant_id, workspace_id, connector_id, product, publisher, label, target_url, source_scope_id, mode, approval_status, approved_by, approved_at, enabled, created_at, updated_at) VALUES ('source-a', 'org-a', 'org-a', 'news_feed', 'Newsk', 'Publisher', 'Feed', 'https://example.org/private-config', 'scope.news', 'api', 'approved', 'platform-admin', 1, 1, 1, 1)").run();
  db.prepare("UPDATE harvy_v2_sources SET enabled = 0, revision = 2, state_changed_by = 'platform-admin', updated_at = 3 WHERE id = 'source-a'").run();
  db.prepare("INSERT INTO harvy_v2_product_entitlements (tenant_id, product, enabled, revision, updated_at) VALUES ('org-a', 'Tower', 1, 2, 2)").run();
  db.prepare("INSERT INTO harvy_v2_product_entitlement_audit (id, tenant_id, product, enabled, revision, changed_by, changed_at) VALUES ('grant-a', 'org-a', 'Tower', 1, 2, 'platform-admin', 2)").run();
  db.prepare("INSERT INTO harvy_v2_dashboards (id, tenant_id, workspace_id, owner_principal_id, product, title, config_json, visibility, revision, state_changed_by, created_at, updated_at) VALUES ('dashboard-a', 'org-a', 'org-a', 'owner-a', 'Newsk', 'Dashboard', '{\"portlets\":[]}', 'private', 1, 'owner-a', 4, 4)").run();
  db.prepare("UPDATE harvy_v2_dashboards SET title = 'Dashboard revised', revision = 2, state_changed_by = 'editor-a', updated_at = 5 WHERE id = 'dashboard-a'").run();
  db.prepare("UPDATE harvy_v2_dashboards SET deleted_at = 6, revision = 3, state_changed_by = 'editor-a', updated_at = 6 WHERE id = 'dashboard-a'").run();

  const HARVY_D1 = { prepare(sql) {
    const statement = db.prepare(sql);
    let params = [];
    return { bind(...values) { params = values; return this; }, async all() { return { results: statement.all(...params) }; } };
  } };
  const AUTH = { async fetch() { return Response.json({ id: "platform-admin", tenantId: "org-a", workspaceId: "org-a", tenantName: "A", role: "member", harvyAdmin: true }); } };
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/admin/audit?limit=10"), { HARVY_D1, AUTH });
  assert.equal(response.status, 200);
  const { items } = await response.json();
  assert.deepEqual(items.map(({ kind, subject_label, action }) => [kind, subject_label, action]), [
    ["dashboard_state", "Dashboard revised", "deleted"],
    ["dashboard_state", "Dashboard revised", "updated"],
    ["dashboard_state", "Dashboard", "created"],
    ["monitor_state", "Feed", "paused"],
    ["product_entitlement", "Tower", "granted"],
  ]);
  assert.equal("target_url" in items[0], false);
  assert.equal("config_json" in items[0], false);
  db.close();
});

test("dashboard lifecycle audit records the authenticated actor without config contents", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const file of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort()) db.exec(readFileSync(join(migrations, file), "utf8"));
  db.prepare("INSERT INTO harvy_v2_workspaces (id, tenant_id, name, created_at) VALUES ('org-a', 'org-a', 'A', 1)").run();
  db.prepare("INSERT INTO harvy_v2_product_entitlements (tenant_id, product, enabled, revision, updated_at) VALUES ('org-a', 'Newsk', 1, 1, 1)").run();
  const HARVY_D1 = { prepare(sql) {
    const statement = db.prepare(sql);
    let params = [];
    return {
      bind(...values) { params = values; return this; },
      async all() { return { results: statement.all(...params) }; },
      async first() { return statement.get(...params) ?? null; },
      async run() { return { meta: { changes: statement.run(...params).changes } }; },
    };
  } };
  let currentActor = { id: "dashboard-owner", tenantId: "org-a", workspaceId: "org-a", tenantName: "A", role: "owner", harvyAdmin: false };
  const AUTH = { async fetch() { return Response.json(currentActor); } };
  const post = await worker.fetch(new Request("https://harvy.test/api/v1/dashboards", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product: "Newsk", title: "Dashboard", config: { portlets: [] } }),
  }), { HARVY_D1, AUTH });
  assert.equal(post.status, 201);
  const { id } = await post.json();
  const patch = await worker.fetch(new Request(`https://harvy.test/api/v1/dashboards/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision: 1, title: "Dashboard revised", config: { portlets: [] }, visibility: "workspace" }),
  }), { HARVY_D1, AUTH });
  assert.equal(patch.status, 200);
  currentActor = { ...currentActor, id: "workspace-member", role: "member" };
  const shared = await worker.fetch(new Request("https://harvy.test/api/v1/dashboards"), { HARVY_D1, AUTH });
  assert.deepEqual((await shared.json()).results.map(({ id: dashboardId, can_edit }) => [dashboardId, can_edit]), [[id, false]]);
  currentActor = { ...currentActor, id: "dashboard-owner", role: "owner" };
  const makePrivate = await worker.fetch(new Request(`https://harvy.test/api/v1/dashboards/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ revision: 2, title: "Dashboard private", config: { portlets: [] }, visibility: "private" }),
  }), { HARVY_D1, AUTH });
  assert.equal(makePrivate.status, 200);
  currentActor = { ...currentActor, id: "workspace-member", role: "member" };
  const privateList = await worker.fetch(new Request("https://harvy.test/api/v1/dashboards"), { HARVY_D1, AUTH });
  assert.deepEqual((await privateList.json()).results, []);
  currentActor = { ...currentActor, id: "dashboard-owner", role: "owner" };
  const staleDelete = await worker.fetch(new Request(`https://harvy.test/api/v1/dashboards/${id}`, {
    method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expected_revision: 2 }),
  }), { HARVY_D1, AUTH });
  assert.equal(staleDelete.status, 409);
  const deleted = await worker.fetch(new Request(`https://harvy.test/api/v1/dashboards/${id}`, {
    method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expected_revision: 3 }),
  }), { HARVY_D1, AUTH });
  assert.equal(deleted.status, 200);

  const audit = db.prepare("SELECT operation, label, revision, changed_by FROM harvy_v2_dashboard_audit WHERE dashboard_id = ? ORDER BY revision").all(id);
  assert.deepEqual(audit.map(({ operation, label, revision, changed_by }) => [operation, label, revision, changed_by]), [
    ["created", "Dashboard", 1, "dashboard-owner"],
    ["shared", "Dashboard revised", 2, "dashboard-owner"],
    ["made_private", "Dashboard private", 3, "dashboard-owner"],
    ["deleted", "Dashboard private", 4, "dashboard-owner"],
  ]);
  currentActor = { ...currentActor, id: "platform-admin", harvyAdmin: true };
  const response = await worker.fetch(new Request("https://harvy.test/api/v1/admin/audit?limit=10"), { HARVY_D1, AUTH });
  const { items } = await response.json();
  assert.ok(items.some((entry) => entry.kind === "dashboard_state" && entry.action === "deleted"));
  assert.ok(items.some((entry) => entry.kind === "dashboard_state" && entry.action === "shared"));
  assert.ok(items.every((entry) => !("config_json" in entry)));
  db.close();
});

test("event assignment and status updates are scope-bound, revision-checked, and audited", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const file of readdirSync(migrations).filter((name) => name.endsWith(".sql")).sort()) db.exec(readFileSync(join(migrations, file), "utf8"));
  const eventId = "123e4567-e89b-42d3-a456-426614174000";
  db.prepare("INSERT INTO harvy_v2_workspaces (id, tenant_id, name, created_at) VALUES ('org-a', 'org-a', 'A', 1)").run();
  db.prepare("INSERT INTO harvy_v2_product_entitlements (tenant_id, product, enabled, revision, updated_at) VALUES ('org-a', 'Newsk', 1, 1, 1)").run();
  db.prepare("INSERT INTO harvy_v2_events (id, tenant_id, workspace_id, product, title, first_seen_at, last_seen_at, created_at, updated_at) VALUES (?, 'org-a', 'org-a', 'Newsk', 'Event', 1, 1, 1, 1)").run(eventId);
  const HARVY_D1 = {
    prepare(sql) {
      const statement = db.prepare(sql);
      let params = [];
      return {
        bind(...values) { params = values; return this; },
        async first() { return statement.get(...params) ?? null; },
        async all() { return { results: statement.all(...params) }; },
        async run() { return { meta: { changes: Number(statement.run(...params).changes) } }; },
      };
    },
    async batch(statements) {
      db.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
  const AUTH = { async fetch() { return Response.json({ id: "user-a", tenantId: "org-a", workspaceId: "org-a", tenantName: "A", role: "member", harvyAdmin: false }); } };
  const patch = (body) => worker.fetch(new Request(`https://harvy.test/api/v1/events/${eventId}?product=Newsk`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }), { HARVY_D1, AUTH });

  const saved = await patch({ status: "reviewing", assigned_to: "user-a", expected_revision: 1 });
  assert.equal(saved.status, 200);
  const result = await saved.json();
  assert.equal(result.revision, 2);
  assert.equal(result.assigned_to, "user-a");
  assert.deepEqual(result.activity.map(({ revision, changed_by }) => [revision, changed_by]), [[2, "user-a"]]);
  assert.equal((await patch({ status: "closed", expected_revision: 1 })).status, 409);
  assert.equal((await patch({ assigned_to: "user-b", expected_revision: 2 })).status, 400);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM harvy_v2_event_activity").get().count, 1);
  assert.equal(db.prepare("SELECT status, assigned_to, revision FROM harvy_v2_events WHERE id = ?").get(eventId).status, "reviewing");
  db.close();
});
