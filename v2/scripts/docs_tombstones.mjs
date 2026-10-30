import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";

const config = YAML.parse(readFileSync("quartz.config.yaml", "utf8"));
const excluded = config.configuration.ignorePatterns.filter((name) => name.endsWith(".md"));
for (const name of excluded) {
  const slug = path.basename(name, ".md").toLowerCase();
  writeFileSync(path.join("dist/docs", `${slug}.html`),
    '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Not published</title><body><p>This page is not part of the public developer documentation. <a href="/">Back to docs</a>.</p></body></html>\n');
}
console.log(`Replaced ${excluded.length} previously published operational routes`);
