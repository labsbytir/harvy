import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Resource bindings are only ever used through a binding method; plain vars and
// secrets are read as strings and stay out of this check.
const BINDING_USE = /env\.([A-Z][A-Z0-9_]*)\??\.(?:prepare|fetch|get|put|head|delete|list|listObjects|connectionString)\b/g;
const BINDING_SECTIONS = [
  "d1_databases", "hyperdrive", "r2_buckets", "kv_namespaces", "services",
  "durable_objects", "queues", "queues_producers", "queues_consumers",
  "dispatch_namespaces", "analytics_engine_datasets", "vectorize", "workflows",
  "secrets_store_secrets",
];

function stripJsonc(text) {
  // Strip comments without touching // inside string literals.
  let output = "";
  let quote = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      output += char;
      if (char === "\\") { output += text[++i] ?? ""; continue; }
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") { quote = char; output += char; continue; }
    if (char === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; output += "\n"; continue; }
    if (char === "/" && text[i + 1] === "*") { i += 2; while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++; i++; continue; }
    output += char;
  }
  return output;
}

function declaredBindings(config) {
  const names = new Set(Object.keys(config.vars ?? {}));
  if (config.assets?.binding) names.add(config.assets.binding);
  for (const section of BINDING_SECTIONS) {
    const entries = config[section];
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (entry && typeof entry === "object" && typeof entry.binding === "string") names.add(entry.binding);
      }
    }
  }
  return names;
}

const workers = [
  ["v2/auth/worker.ts", "v2/auth/wrangler.jsonc"],
  ["v2/api/worker.ts", "v2/api/wrangler.jsonc"],
  ["v2/web/worker.ts", "v2/web/wrangler.jsonc"],
];

for (const [source, configPath] of workers) {
  test(`${source} only uses resource bindings declared in ${configPath}`, () => {
    const sourceText = readFileSync(new URL(`../../${source}`, import.meta.url), "utf8");
    const config = JSON.parse(stripJsonc(readFileSync(new URL(`../../${configPath}`, import.meta.url), "utf8")));
    const declared = declaredBindings(config);
    const referenced = new Set([...sourceText.matchAll(BINDING_USE)].map((match) => match[1]));
    assert.ok(referenced.size > 0, "test must observe at least one binding usage");
    for (const name of referenced) {
      assert.ok(declared.has(name), `env.${name} is used in ${source} but not declared in ${configPath}`);
    }
  });
}
