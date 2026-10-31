import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { validateWorkflow } from '../scripts/validate_workflows.mjs';

for (const dir of ['../workflows/', '../../n8n/workflows/']) {
  const url = new URL(dir, import.meta.url);
  for (const file of (await readdir(url)).filter(f => f.endsWith('.json'))) {
    test(`workflow export parses, code compiles and graph resolves: ${dir}${file}`, async () => {
      const workflow = JSON.parse(await readFile(new URL(file, url), 'utf8'));
      assert.deepEqual(validateWorkflow(workflow), []);
      assert.equal(workflow.active, false);
    });
  }
}
test('validator rejects invalid code and dangling graph edges', () => {
  const errors = validateWorkflow({ nodes: [{ name: 'start', id: '1', type: 'code', typeVersion: 2,
    parameters: { jsCode: 'return }' } }], connections: { start: { main: [[{ node: 'missing' }]] } } });
  assert.equal(errors.length, 2);
});

test('unfinished persistence and cursor stages fail instead of reporting success', async () => {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  for (const [file, names] of [
    ['../../n8n/workflows/gdacs-ingestion-simple.json', ['Get Backfill Cursor', 'Write to R2', 'Write to PostgreSQL', 'Update Backfill Cursor']],
    ['../../n8n/workflows/gdacs-ingestion.json', ['Get Backfill Cursor', 'Update Backfill Cursor']],
    ['../workflows/un_data_ingestion.json', ['Basin Ingestion']],
    ['../workflows/fema-openfema.workflow.json', ['Wait for Completion']],
    ['../workflows/eu-sanctions.workflow.json', ['Log Execution']],
  ]) {
    const workflow = JSON.parse(await readFile(new URL(file, import.meta.url), 'utf8'));
    for (const name of names) {
      const node = workflow.nodes.find(node => node.name === name);
      assert.ok(node, name);
      await assert.rejects(new AsyncFunction(node.parameters.jsCode ?? node.parameters.functionCode)(), /BLOCKED:/);
    }
  }
});
