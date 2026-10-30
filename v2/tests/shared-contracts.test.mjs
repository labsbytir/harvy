import test from "node:test";
import assert from "node:assert/strict";
import { parseHarvyDexRecord, isScopeId } from "../shared/harvydex.ts";
import { parseHqlQuery } from "../shared/hql.ts";
import { parseArtifactManifest } from "../shared/artifacts.ts";
import { getCacheHeader } from "../shared/cache-policy.ts";
import { parseAutomationRunRequest } from "../shared/automation-run.ts";
import { isDashboardConfig, isPersistedDashboardConfig, isSavedViewConfig } from "../shared/dashboard-config.ts";

test("dashboard and saved-view configs have bounded, distinct schemas", () => {
  const dashboard = {
    portlets: [{ id: "events", title: "Events", query: JSON.stringify({ measures: ["Events.count"] }), chartType: "bar", w: 6, h: 4, x: 0, y: 0 }],
    layoutMode: "grid", grid: { cols: 12, rowHeight: 80, minW: 2, minH: 2 },
  };
  const savedView = { kind: "saved_view", hql_version: 1, filters: { query: "city council", source_id: "", from: "", to: "", status: "all" } };
  assert.equal(isDashboardConfig(dashboard), true);
  assert.equal(isDashboardConfig({ ...dashboard, features: { xlsExport: { enabled: true }, dashboardImportExport: { enabled: true } } }), false);
  assert.equal(isDashboardConfig({ ...dashboard, sql: "select * from users" }), false);
  assert.equal(isDashboardConfig({ ...dashboard, portlets: [{ ...dashboard.portlets[0], query: JSON.stringify({ sql: "drop table events" }) }] }), false);
  assert.equal(isSavedViewConfig(savedView), true);
  assert.equal(isDashboardConfig(savedView), false);
  assert.equal(isPersistedDashboardConfig(savedView), true);
  assert.equal(isSavedViewConfig({ ...savedView, filters: { ...savedView.filters, status: "admin" } }), false);
});

test("scope IDs require explicit tenant or shared", () => {
  assert.equal(isScopeId("tenant-1"), true);
  assert.equal(isScopeId("shared"), true);
  assert.equal(isScopeId("1"), false);
  assert.equal(isScopeId(""), false);
});

test("harvydex record requires uuid, scope, type, and timestamps", () => {
  const good = {
    harvydex_id: "123e4567-e89b-42d3-a456-426614174000",
    scope_id: "tenant-1",
    entity_type: "Story",
    external_ids: { gdelt: "abc" },
    created_at: new Date().toISOString(),
  };
  assert.deepEqual(parseHarvyDexRecord(good), good);
  assert.equal(parseHarvyDexRecord({ ...good, harvydex_id: "nope" }), null);
  assert.equal(parseHarvyDexRecord({ ...good, scope_id: "raw" }), null);
});

test("hql rejects raw sql and unbounded limits", () => {
  const good = {
    hql_version: 1, cube: "stories",
    dimensions: ["source"], measures: ["count"],
    filters: [{ field: "source", operator: "eq", value: "gdelt" }],
    limit: 50,
  };
  assert.deepEqual(parseHqlQuery(good)?.cube, "stories");
  assert.equal(parseHqlQuery({ ...good, limit: 5000 }), null);
  assert.equal(parseHqlQuery({ ...good, cube: "stories; DROP TABLE x" }), null);
});

test("artifact manifest requires r2 uri and sha256", () => {
  const good = {
    artifact_id: "a1", stage: "raw", source_scope_id: "scope-a",
    access_scope_id: "tenant-1", run_id: "r1",
    storage_uri: "r2://harvy-raw/x.json",
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    byte_count: 10, capture_time: new Date().toISOString(),
  };
  assert.deepEqual(parseArtifactManifest(good), good);
  assert.equal(parseArtifactManifest({ ...good, storage_uri: "https://evil/x" }), null);
});

test("tenant routes are never publicly cached", () => {
  assert.equal(getCacheHeader("public"), "public, max-age=300, stale-while-revalidate=60");
  assert.equal(getCacheHeader("tenant"), "private, no-cache, no-store");
  assert.equal(getCacheHeader("none"), "private, no-cache, no-store");
});

test("automation envelope rejects internal targets", () => {
  const base = {
    contract_version: 1, run_id: "123e4567-e89b-42d3-a456-426614174000", trace_id: "123e4567-e89b-42d3-a456-426614174001", config_revision: "1", connector_id: "approved-news",
    source_scope_id: "publisher-feed", access_scope_id: "tenant-1",
    target_url: "https://example.org/news", mode: "scrape",
		provider: "spider_unlimited", required_proxy: "webshare", preflight_required: true, direct_fallback_allowed: false,
    max_pages: 1, deadline_seconds: 60, idempotency_key: "job-12345",
  };
  for (const target_url of [
    "https://127.0.0.1/x", "https://10.0.0.5/x", "https://192.168.1.1/x",
    "https://172.16.0.1/x", "https://svc.internal/x", "https://app.localhost/x",
  ]) {
    assert.equal(parseAutomationRunRequest({ ...base, target_url }), null, target_url);
  }
  assert.notEqual(parseAutomationRunRequest(base), null);
});
