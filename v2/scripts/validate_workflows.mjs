import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
export function validateWorkflow(workflow) {
  const errors = [];
  if (!workflow || !Array.isArray(workflow.nodes) || !workflow.connections || typeof workflow.connections !== 'object') {
    return ['Expected nodes array and connections object'];
  }
  const names = new Set(), ids = new Set();
  for (const node of workflow.nodes) {
    if (!node.name || names.has(node.name)) errors.push('Missing or duplicate node name');
    if (!node.id || ids.has(node.id)) errors.push(`${node.name}: missing or duplicate ID`);
    names.add(node.name); ids.add(node.id);
    if (!node.type || !Number.isFinite(node.typeVersion)) errors.push(`${node.name}: missing type/version`);
    for (const key of ['jsCode', 'functionCode']) {
      const code = node.parameters?.[key];
      if (code !== undefined) {
        try { new AsyncFunction(code); }
        catch { errors.push(`${node.name}: invalid ${key} JavaScript`); }
      }
    }
  }
  for (const [source, outputs] of Object.entries(workflow.connections)) {
    if (!names.has(source)) errors.push(`Unknown connection source: ${source}`);
    for (const groups of Object.values(outputs)) {
      if (!Array.isArray(groups)) { errors.push(`${source}: invalid output groups`); continue; }
      for (const group of groups) {
        if (!Array.isArray(group)) { errors.push(`${source}: invalid connection group`); continue; }
        for (const target of group) if (!names.has(target?.node)) errors.push(`${source}: unknown destination`);
      }
    }
  }
  return errors;
}

async function main() {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  let checked = 0, failed = 0;
  for (const directory of ['v2/workflows', 'n8n/workflows']) {
    const dir = path.join(root, directory);
    for (const file of (await readdir(dir)).filter(file => file.endsWith('.json')).sort()) {
      let errors;
      try { errors = validateWorkflow(JSON.parse(await readFile(path.join(dir, file), 'utf8'))); }
      catch { errors = ['Invalid JSON']; }
      checked += 1;
      if (errors.length) { failed += 1; console.error(`${directory}/${file}: ${errors.join('; ')}`); }
    }
  }
  console.log(`${checked} workflow exports checked; ${failed} failed. Static validation only; runtime compatibility, source access and publication remain unverified.`);
  if (failed) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
