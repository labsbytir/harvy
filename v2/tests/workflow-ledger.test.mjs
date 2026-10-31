import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildLedger, normalizeId, LEDGER_PATH, LEDGER_REVISION } from "../scripts/build_workflow_ledger.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const ledger = buildLedger(root);
const byId = new Map(ledger.rows.map((row) => [row.id, row]));

test("committed ledger is present and matches the generator", () => {
  const target = `${root}/${LEDGER_PATH}`;
  assert.ok(existsSync(target), `${LEDGER_PATH} must exist; run node v2/scripts/build_workflow_ledger.mjs`);
  const committed = JSON.parse(readFileSync(target, "utf8"));
  assert.equal(committed.revision, LEDGER_REVISION);
  // Regeneration must be byte-identical: the ledger is frozen, not narrated.
  assert.deepEqual(committed, ledger, `${LEDGER_PATH} is stale; regenerate with node v2/scripts/build_workflow_ledger.mjs`);
});

test("normalization reproduces the roadmap's documented overlaps", () => {
  // docs/ROADMAP.md: candidate/upstream=65, upstream/streams=95, candidate/streams=62, union=193.
  const md = readFileSync(`${root}/docs/CONNECTOR-CANDIDATES.md`, "utf8");
  const candidateIds = new Set(
    [...md.matchAll(/^### \d+\. `([^`]+)`/gm)].map((m) => normalizeId(m[1])),
  );
  const upstreamIds = new Set(
    JSON.parse(readFileSync(`${root}/v2/catalog/reference/harvy-upstream-manifest.json`, "utf8")).connectors.map((c) => normalizeId(c.id)),
  );
  const streamIds = new Set(
    JSON.parse(readFileSync(`${root}/v2/catalog/reference/harvy-connector-scopes.json`, "utf8")).streams.map((s) => normalizeId(s.source_id)),
  );

  const overlap = (a, b) => [...a].filter((x) => b.has(x)).length;
  assert.equal(overlap(candidateIds, upstreamIds), 65, "candidate/upstream overlap drifted from the roadmap");
  assert.equal(overlap(upstreamIds, streamIds), 95, "upstream/streams overlap drifted from the roadmap");
  assert.equal(overlap(candidateIds, streamIds), 62, "candidate/streams overlap drifted from the roadmap");
  assert.equal(new Set([...candidateIds, ...upstreamIds, ...streamIds]).size, 193, "union drifted from the roadmap's 193");
  assert.equal(ledger.input_record_counts.normalized_union_before_alias_merge, 193);
});

test("every input record is accounted for exactly once", () => {
  const provenance = ledger.rows.flatMap((row) => row.provenance.map((p) => `${p.input}:${p.original_id}`));
  const candidates = ledger.rows.flatMap((row) => row.provenance.filter((p) => p.input === "candidates"));
  // 147 numbered entries, two of which repeat entso_e_outages.
  assert.equal(candidates.length, 147);
  assert.equal(ledger.input_record_counts.candidates_entries, 147);
  assert.equal(ledger.input_record_counts.candidates_unique_ids, 146);
  assert.deepEqual(ledger.gaps.duplicate_candidate_ids, ["entso_e_outages"]);
  // 147 + 108 upstream + 99 streams + 11 references + 3 named + 7 civic.
  assert.equal(provenance.length, 375);
  const seen = new Set();
  const repeats = [];
  for (const key of provenance) {
    if (seen.has(key)) repeats.push(key);
    seen.add(key);
  }
  // The only permitted repeat is the declared candidate duplicate.
  assert.deepEqual(repeats, ["candidates:entso_e_outages"]);
});

test("canonical IDs are unique and stable", () => {
  const ids = ledger.rows.map((row) => row.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.equal(normalizeId(id), id, `${id} is not normalized`);
});

test("counting is internally consistent", () => {
  const { n, t, row_total: total, kind_counts: kinds, segments } = ledger.counting;
  assert.equal(ledger.rows.length, total);
  assert.equal(n, kinds.candidate);
  assert.equal(n + kinds.directory + kinds.reference_only + kinds.placeholder + kinds.excluded, total);
  assert.equal(t, Math.ceil(n / 2));
  assert.equal(segments.buildable_now + segments.gated_access_review + segments.blocked_excluded_access_path, n);
  // The frozen figures. Changing them requires a revision bump and new evidence.
  assert.equal(n, 158);
  assert.equal(t, 79);
});

test("only candidates are counted; every other kind is excluded from N", () => {
  for (const row of ledger.rows) {
    if (row.kind === "candidate") continue;
    assert.notEqual(row.kind, undefined);
    assert.ok(["directory", "reference_only", "placeholder", "excluded"].includes(row.kind));
  }
});

test("the entso_e_outages duplicate resolves to one row with both entry aliases", () => {
  const row = byId.get("entso_e_outages");
  assert.ok(row, "entso_e_outages must be one canonical row");
  const entries = row.provenance.filter((p) => p.input === "candidates").map((p) => p.path);
  assert.equal(entries.length, 2, "both candidate entries must be recorded");
  assert.deepEqual(entries.sort(), ["docs/CONNECTOR-CANDIDATES.md#122", "docs/CONNECTOR-CANDIDATES.md#40"]);
  assert.equal(row.kind, "candidate");
});

test("policy exclusions are applied and carry a reason", () => {
  for (const id of ["rsshub_news", "rsshub_cyber", "rsshub_disasters"]) {
    const row = byId.get(id);
    assert.equal(row.kind, "excluded", `${id} must be excluded`);
    assert.equal(row.excluded, true);
    assert.match(row.exclusion_reason, /RSSHub/);
    assert.equal(row.gate, null, "an excluded row is not a gated candidate");
  }
  assert.deepEqual(
    ledger.rows.filter((row) => row.kind === "excluded").map((row) => row.id).sort(),
    ["rsshub_cyber", "rsshub_disasters", "rsshub_news"],
  );
});

test("directive-approved sources are not excluded and keep their scope record", () => {
  const sam = byId.get("sam_gov");
  assert.equal(sam.excluded, false);
  assert.equal(sam.directive_approved, true);
  const telegram = byId.get("telegram");
  assert.equal(telegram.excluded, false);
  assert.equal(telegram.directive_approved, true);
  assert.equal(telegram.gate, "access_review", "Telegram needs the user's approved app session before build");
  assert.match(ledger.policy.directive_approved.telegram, /configured channel list|channels joined/);
});

test("a reference page never silently demotes a real source", () => {
  for (const id of ["ourworldindata", "traintrackr", "travic"]) {
    const row = byId.get(id);
    assert.equal(row.kind, "candidate", `${id} has a source record and must stay a candidate`);
    assert.ok(row.review_flags.some((flag) => flag.startsWith("reference-conflict")), `${id} must record the conflict`);
  }
  // Explicit artifact decisions still win over an upstream spec record.
  assert.equal(byId.get("owid_browser_semantic_search").kind, "reference_only");
  assert.equal(byId.get("situation_watch").kind, "reference_only");
});

test("RSSHub-path rows stay counted but blocked from build", () => {
  const xGov = byId.get("x_gov_uk");
  assert.equal(xGov.kind, "candidate");
  assert.equal(xGov.gate, "access_review");
  assert.equal(xGov.access_path, "rsshub");
  assert.match(xGov.access_path_excluded, /RSSHub/);
  for (const row of ledger.rows.filter((r) => r.access_path_excluded && r.kind === "candidate")) {
    assert.ok(row.gate, `${row.id} carries an excluded access path and must be gated`);
  }
});

test("merges are declared, one-directional, and keep every alias", () => {
  for (const row of ledger.rows) {
    if (!row.merged_from.length) continue;
    assert.ok(row.merge, `${row.id} has merged aliases but no rationale`);
    assert.ok(row.merge.rationale.length > 20, `${row.id} merge needs a real rationale`);
    for (const alias of row.merged_from) {
      assert.ok(!byId.has(alias), `${alias} was merged into ${row.id} but still exists as a row`);
      assert.equal(normalizeId(alias), alias);
    }
    for (const alias of row.aliases) assert.ok(alias.length > 0);
  }
  // Different publishers must never collapse into one row.
  assert.ok(byId.has("poweroutage_us") && byId.has("usoutage"), "poweroutage.us and USOutage.com are different publishers");
  assert.ok(byId.has("legistar") && byId.has("legistar_nyc"), "a generic adapter and a configured jurisdiction are different sources");
  assert.ok(byId.has("worldbank_api") && byId.has("financesone") && byId.has("microdata_rtdi"));
});

test("no row claims an adoption status it has no evidence for", () => {
  for (const row of ledger.rows) {
    assert.equal(row.status, "inventoried", `${row.id} cannot claim ${row.status} without run evidence`);
    assert.deepEqual(row.status_evidence, []);
  }
  assert.match(ledger.purpose, /never a live workflow/);
});

test("every row records the fields still pending before it can be built", () => {
  const required = ["publisher", "modes", "access_terms", "schema_mapping", "license", "owner", "last_verified_at"];
  for (const row of ledger.rows) {
    for (const field of required) {
      assert.ok(row.pending_fields.includes(field), `${row.id} lost pending field ${field}`);
    }
  }
});

test("inputs are pinned by hash so the ledger can be audited", () => {
  assert.equal(ledger.inputs.length, 4);
  for (const input of ledger.inputs) {
    assert.match(input.sha256, /^[0-9a-f]{64}$/);
    assert.ok(existsSync(`${root}/${input.path}`), `${input.path} is missing`);
  }
});
