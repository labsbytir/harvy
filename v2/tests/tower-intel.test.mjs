import assert from "node:assert/strict";
import test from "node:test";
import { EventRequestGuard, runScopedLoad } from "../web/src/event-scope.ts";
import { formatAge, formatLocatedCount, freshnessStrip, latestRunForSource, rankRegions, regionKey, regionLabel } from "../web/src/tower-intel.ts";

const event = (id, location = {}) => ({ id, title: id, last_seen_at: 1, evidence_count: 1, ...location });

const source = (id, label, enabled = true) => ({ id, product: "Tower", publisher: `pub-${id}`, label, enabled, revision: 1, created_at: 0 });
const run = (id, sourceId, status, updatedAt) => ({ id, source_id: sourceId, idempotency_key: null, status, error_code: null, created_at: updatedAt - 1, updated_at: updatedAt });

test("rankRegions buckets nearby located events and ranks by count with honest shares", () => {
  const ranking = rankRegions([
    event("a", { latitude: 39.2, longitude: -98.4 }),
    event("b", { latitude: 39.9, longitude: -98.0 }),
    event("c", { latitude: 40.7, longitude: -74.1 }),
    event("no-coords"),
    event("bad", { latitude: 999, longitude: 0 }),
    event("string", { latitude: "40", longitude: "-75" }),
  ]);
  assert.equal(ranking.located, 3);
  assert.equal(ranking.total, 6);
  assert.deepEqual(ranking.regions.map((region) => region.count), [2, 1]);
  assert.equal(ranking.regions[0].label, regionLabel(ranking.regions[0].key));
  assert.equal(ranking.regions[0].label, "35°N 95°W");
  const shareSum = ranking.regions.reduce((sum, region) => sum + region.share, 0);
  assert.ok(Math.abs(shareSum - 1) < 1e-9);
  assert.equal(ranking.regions[0].share, 2 / 3);
  assert.equal(formatLocatedCount(ranking), "3 of 6 events located");
});

test("region ranking is deterministic on ties and handles an empty page", () => {
  const ranking = rankRegions([event("x", { latitude: 10, longitude: 10 }), event("y", { latitude: -10, longitude: -10 })]);
  assert.deepEqual(ranking.regions.map((region) => region.count), [1, 1]);
  assert.ok(ranking.regions[0].key < ranking.regions[1].key || ranking.regions[0].key.localeCompare(ranking.regions[1].key) < 0);
  const empty = rankRegions([event("z")]);
  assert.deepEqual(empty.regions, []);
  assert.equal(empty.located, 0);
  assert.equal(formatLocatedCount(empty), "0 of 1 events located");
  assert.equal(regionKey(39.2, -98.4), regionKey(39.9, -98.0));
  assert.notEqual(regionKey(39.2, -98.4), regionKey(40.7, -74.1));
});

test("freshnessStrip picks the latest run per source and marks never-run monitors", () => {
  const sources = [source("s2", "Beta", false), source("s1", "Alpha")];
  const runs = [
    run("r1", "s1", "succeeded", 2000),
    run("r2", "s1", "failed", 9000),
    run("r3", "s9", "running", 10000), // run for an unknown source is ignored
  ];
  const strip = freshnessStrip(sources, runs, 10000);
  assert.deepEqual(strip.map((entry) => entry.sourceId), ["s1", "s2"]); // sorted by label
  assert.equal(strip[0].state, "failed");
  assert.equal(strip[0].lastRun.id, "r2");
  assert.equal(strip[0].ageMs, 1000);
  assert.equal(strip[0].enabled, true);
  assert.equal(strip[1].state, "never");
  assert.equal(strip[1].lastRun, null);
  assert.equal(strip[1].ageMs, null);
  assert.equal(strip[1].enabled, false);
  assert.equal(latestRunForSource(runs, "s1")?.id, "r2");
  assert.equal(latestRunForSource(runs, "missing"), null);
});

test("formatAge buckets ages and clamps clock skew", () => {
  assert.equal(formatAge(0), "just now");
  assert.equal(formatAge(44_000), "just now");
  assert.equal(formatAge(59_000), "just now");
  assert.equal(formatAge(60_000), "1m ago");
  assert.equal(formatAge(5 * 60_000), "5m ago");
  assert.equal(formatAge(3 * 3_600_000), "3h ago");
  assert.equal(formatAge(2 * 86_400_000), "2d ago");
  assert.equal(formatAge(-5000), "just now");
});

test("a filter change mid-flight invalidates the in-flight intel load through the shared guard", async () => {
  const guard = new EventRequestGuard();
  // Same scope-key shape Workspace.reload uses: identity + product + filters.
  const scopeKey = ["user-1", "org-1", "Tower", "", "", "", "all"].join("|");
  guard.setScope(scopeKey);
  const applied = [];
  let finish;
  const pending = new Promise((resolve) => { finish = resolve; });
  const load = runScopedLoad(
    guard,
    scopeKey,
    async (isCurrent) => {
      const page = await pending;
      return isCurrent() ? rankRegions(page) : null;
    },
    (value) => { if (value) applied.push(value); },
    () => { throw new Error("stale load must not surface an error"); },
    () => {},
  );
  guard.setScope(["user-1", "org-1", "Tower", "supply chain", "", "", "all"].join("|"));
  finish([event("late", { latitude: 10, longitude: 10 })]);
  await load;
  assert.deepEqual(applied, []);
  const token = guard.begin();
  assert.equal(guard.isCurrent(token), true);
});
