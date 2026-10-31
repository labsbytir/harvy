import { createHash } from 'node:crypto';

/**
 * Bounded, resumable orchestration; adapters own approved source/proxy access.
 * store.withLease(key, callback) MUST exclusively lease the key across processes.
 * store.load/save MUST be durable; save must honor the lease (fencing on expiry).
 * persistPage MUST await durable, idempotent publication of ALL page records and
 * artifacts before resolving. A failed save replays the same page identity.
 * fetchPage uses [start, end) and returns { records, nextCursor: string | null }.
 * Adapters must honor AbortSignal and bound response bytes; never log payloads.
 */
export async function runBackfill(config, adapters) {
  const { sourceId, scopeId, start, end, windowMs, maxPages, pageSize, deadlineMs } = config;
  const startMs = Date.parse(start), endMs = Date.parse(end);
  if (![sourceId, scopeId].every(v => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(v)) ||
      ![start, end].every(v => typeof v === 'string' && v.endsWith('Z')) ||
      !Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= endMs ||
      ![windowMs, maxPages, pageSize, deadlineMs].every(v => Number.isSafeInteger(v) && v > 0) ||
      maxPages > 10000 || pageSize > 10000 || deadlineMs > 3600000) {
    throw new Error('Invalid bounded backfill configuration');
  }
  const { store, preflight, fetchPage, persistPage } = adapters;
  if (![store?.withLease, store?.load, store?.save, preflight, fetchPage, persistPage].every(v => typeof v === 'function')) {
    throw new Error('Backfill requires durable leased checkpoints, preflight, fetch and publication adapters');
  }
  // Include bounds and pagination shape so a different job cannot reuse a cursor.
  const identity = JSON.stringify([1, sourceId, scopeId, startMs, endMs, windowMs, pageSize]);
  const jobKey = createHash('sha256').update(identity).digest('hex');
  const signal = AbortSignal.timeout(deadlineMs);
  return store.withLease(jobKey, async () => {
    signal.throwIfAborted();
    await preflight({ sourceId, scopeId, signal });
    let state = await store.load(jobKey, { signal }) ?? { version: 1, nextStart: startMs, cursor: null };
    if (state.version !== 1 || !Number.isSafeInteger(state.nextStart) || state.nextStart < startMs ||
        state.nextStart > endMs || (state.nextStart !== endMs && (state.nextStart - startMs) % windowMs !== 0) ||
        !(state.cursor === null || (typeof state.cursor === 'string' && state.cursor.length > 0 && state.cursor.length <= 8192)) ||
        (state.nextStart === endMs && state.cursor !== null)) {
      throw new Error('Invalid checkpoint; refusing to skip history');
    }
    let pages = 0, records = 0;
    const seen = new Set();
    while (state.nextStart < endMs && pages < maxPages) {
      signal.throwIfAborted();
      const windowEnd = Math.min(state.nextStart + windowMs, endMs);
      const pageKey = createHash('sha256').update(JSON.stringify([jobKey, state.nextStart, state.cursor])).digest('hex');
      const request = { sourceId, scopeId, start: new Date(state.nextStart).toISOString(),
        end: new Date(windowEnd).toISOString(), cursor: state.cursor, pageSize, signal };
      const page = await fetchPage(request);
      signal.throwIfAborted();
      if (!page || !Array.isArray(page.records) || page.records.length > pageSize ||
          !(page.nextCursor === null || (typeof page.nextCursor === 'string' && page.nextCursor.length > 0 && page.nextCursor.length <= 8192))) {
        throw new Error('Invalid or unbounded source page');
      }
      const tokenKey = JSON.stringify([state.nextStart, page.nextCursor]);
      if (page.nextCursor !== null && (page.nextCursor === state.cursor || seen.has(tokenKey))) {
        throw new Error('Source pagination did not advance');
      }
      // No retry loop here: the caller owns retries, resuming the durable cursor.
      await persistPage({ ...request, records: page.records, idempotencyKey: pageKey });
      signal.throwIfAborted();
      const next = { version: 1, nextStart: page.nextCursor === null ? windowEnd : state.nextStart, cursor: page.nextCursor };
      await store.save(jobKey, next, { signal });
      seen.add(JSON.stringify([state.nextStart, state.cursor]));
      state = next;
      pages += 1;
      records += page.records.length;
    }
    return { jobKey, status: state.nextStart === endMs ? 'complete' : 'partial', pages,
      records, coveredThrough: new Date(state.nextStart).toISOString(), hasMore: state.nextStart < endMs };
  }, { signal });
}
