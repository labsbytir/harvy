import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const EXCLUDED = ["telegram", "judyrecords", "truthsocial", "truth-social", "sam-gov", "samgov"];

function scanJson(path) {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, "utf8").toLowerCase();
  return EXCLUDED.filter((id) => {
    if (!raw.includes(`"${id}"`)) return false;
    // An entry explicitly marked excluded with a reason is an audit trail, not activation.
    const idx = raw.indexOf(`"${id}"`);
    const window = raw.slice(Math.max(0, idx - 400), idx + 600);
    return !(window.includes('"excluded"') || window.includes("exclusion_reason"));
  });
}

test("excluded legacy connectors stay out of the active catalog", () => {
  for (const path of [
    "v2/catalog/reference/harvy-upstream-manifest.json",
    "v2/catalog/reference/harvy-connector-scopes.json",
    "v2/catalog/reference/civic-source-catalog.json",
  ]) {
    const hits = scanJson(path);
    if (hits === null) continue;
    assert.deepEqual(hits, [], `${path} must not contain excluded connectors`);
  }
});
