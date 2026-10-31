import test from 'node:test';
import assert from 'node:assert/strict';
import { runBackfill } from '../automation/backfill.mjs';

const config = { sourceId: 'src_test', scopeId: 'tenant_test', start: '2020-01-01T00:00:00Z',
  end: '2020-01-03T00:00:00Z', windowMs: 86400000, maxPages: 10, pageSize: 2, deadlineMs: 10000 };
function fixture() {
  const checkpoints = new Map(), requests = [], publications = new Map();
  const adapters = {
    store: {
      withLease: async (_key, fn) => fn(), // Synthetic single-process store, not production persistence.
      load: async key => checkpoints.get(key),
      save: async (key, value) => { checkpoints.set(key, structuredClone(value)); },
    },
    preflight: async () => {},
    fetchPage: async request => {
      requests.push(request);
      return { records: [{ id: `${request.start}-${request.cursor}` }], nextCursor: request.cursor === null ? 'page2' : null };
    },
    persistPage: async page => { publications.set(page.idempotencyKey, page.records); },
  };
  return { adapters, checkpoints, requests, publications };
}
test('historical pagination resumes within a window, then advances to the fixed end', async () => {
  const f = fixture();
  const first = await runBackfill({ ...config, maxPages: 1 }, f.adapters);
  assert.equal(first.status, 'partial');
  assert.equal(first.coveredThrough, '2020-01-01T00:00:00.000Z');
  const second = await runBackfill(config, f.adapters);
  assert.equal(second.status, 'complete');
  assert.deepEqual(f.requests.map(r => [r.start, r.cursor]), [
    ['2020-01-01T00:00:00.000Z', null], ['2020-01-01T00:00:00.000Z', 'page2'],
    ['2020-01-02T00:00:00.000Z', null], ['2020-01-02T00:00:00.000Z', 'page2'],
  ]);
  const replay = await runBackfill(config, f.adapters);
  assert.equal(replay.pages, 0);
  assert.equal(f.publications.size, 4);
});
test('failed publication never advances the checkpoint', async () => {
  const f = fixture();
  f.adapters.persistPage = async () => { throw new Error('storage unavailable'); };
  await assert.rejects(runBackfill(config, f.adapters), /storage unavailable/);
  assert.equal(f.checkpoints.size, 0);
});
test('checkpoint failure replays the same idempotency key after publication', async () => {
  const f = fixture(), save = f.adapters.store.save;
  f.adapters.store.save = async () => { throw new Error('checkpoint unavailable'); };
  await assert.rejects(runBackfill(config, f.adapters), /checkpoint unavailable/);
  const key = [...f.publications.keys()][0];
  f.adapters.store.save = save;
  await runBackfill({ ...config, maxPages: 1 }, f.adapters);
  assert.deepEqual([...f.publications.keys()], [key]);
});
test('preflight failure prevents collection', async () => {
  const f = fixture();
  f.adapters.preflight = async () => { throw new Error('proxy unavailable'); };
  await assert.rejects(runBackfill(config, f.adapters), /proxy unavailable/);
  assert.equal(f.requests.length, 0);
});
test('repeated pagination cursor fails before publishing or skipping the window', async () => {
  const f = fixture();
  f.adapters.fetchPage = async () => ({ records: [], nextCursor: 'same' });
  await assert.rejects(runBackfill(config, f.adapters), /did not advance/);
  assert.equal(f.publications.size, 1);
  assert.equal([...f.checkpoints.values()][0].nextStart, Date.parse(config.start));
});
test('scope and fixed bounds isolate checkpoints', async () => {
  const f = fixture();
  const a = await runBackfill(config, f.adapters);
  const b = await runBackfill({ ...config, scopeId: 'tenant_other' }, f.adapters);
  const c = await runBackfill({ ...config, end: '2020-01-04T00:00:00Z' }, f.adapters);
  assert.equal(new Set([a.jobKey, b.jobKey, c.jobKey]).size, 3);
});
test('rejects corrupt checkpoints and unbounded responses', async () => {
  const f = fixture();
  f.adapters.store.load = async () => ({ version: 1, nextStart: Date.parse(config.end) + 1, cursor: null });
  await assert.rejects(runBackfill(config, f.adapters), /Invalid checkpoint/);
  assert.equal(f.requests.length, 0);
  f.adapters.store.load = async () => null;
  f.adapters.fetchPage = async () => ({ records: [1, 2, 3], nextCursor: null });
  await assert.rejects(runBackfill(config, f.adapters), /unbounded source page/);
  assert.equal(f.publications.size, 0);
});
