import test from "node:test";
import assert from "node:assert/strict";
import BATCH1_SOURCES, { BATCH1_SOURCES as NAMED } from "../catalog/connectors/sources/index.ts";
import {
  OPENAPI_FAMILY_MAX_RECORDS,
  stableEventId,
  isStableEventId,
  requestLimit,
  buildRequest,
  normalizeResponse,
  buildIdempotencyKey,
  mapProviderError,
  validateSourceConfig,
} from "../catalog/connectors/openapi.ts";

const FETCHED_AT = "2026-10-30T00:00:00.000Z";
const CRED_HEADER = /authorization|api[-_]?key|token|secret/i;

test("batch1 registry exports 11 sources", () => {
  assert.equal(BATCH1_SOURCES.length, 11);
  assert.equal(NAMED.length, 11);
});

for (const config of BATCH1_SOURCES) {
  test(`${config.source_id}: static config validates clean`, () => {
    assert.deepEqual(validateSourceConfig(config), []);
  });

  test(`${config.source_id}: identity, url, method`, () => {
    assert.match(config.source_id, /^src_[a-z0-9-]+$/);
    assert.ok(config.target_url.startsWith("https://"));
    assert.ok(config.method === "GET" || config.method === "POST");
  });

  test(`${config.source_id}: bound within family max`, () => {
    assert.ok(Number.isInteger(config.max_records) && config.max_records >= 1 && config.max_records <= OPENAPI_FAMILY_MAX_RECORDS);
    const limit = requestLimit(config);
    assert.ok(limit !== null && limit >= 1 && limit <= config.max_records);
  });

  test(`${config.source_id}: stable event id`, () => {
    const a = stableEventId(config.source_id, "ext-1");
    assert.equal(a, stableEventId(config.source_id, "ext-1"));
    assert.ok(isStableEventId(a));
    assert.equal(buildIdempotencyKey(config), buildIdempotencyKey(config));
  });

  test(`${config.source_id}: bounded request without credentials`, () => {
    const req = buildRequest(config);
    assert.equal(req.method, config.method);
    assert.ok(req.url.includes(config.target_url));
    if (config.method === "GET") {
      const url = new URL(req.url);
      for (const [k, v] of Object.entries(config.default_params)) assert.equal(url.searchParams.get(k), String(v));
    }
    for (const key of Object.keys(req.headers)) assert.doesNotMatch(key, CRED_HEADER);
  });

  test(`${config.source_id}: provenance from inline fixture`, () => {
    const events = normalizeResponse(config, config.sample_payload, FETCHED_AT);
    assert.ok(events.length >= 1);
    assert.ok(events.length <= config.max_records);
    for (const event of events) {
      assert.ok(isStableEventId(event.harvydex_id));
      assert.ok(event.title.length > 0);
      const [ev] = event.evidence;
      assert.ok(ev.source_url.length > 0);
      assert.equal(ev.publisher, config.publisher);
      assert.ok(Number.isFinite(Date.parse(ev.captured_at)));
      assert.ok(ev.coverage.length > 0);
      assert.equal(ev.method, config.method);
    }
  });
}

test("source_id values are unique", () => {
  const ids = BATCH1_SOURCES.map((s) => s.source_id);
  assert.equal(new Set(ids).size, ids.length);
});

test("error taxonomy: retryable vs terminal", () => {
  const limited = mapProviderError({ status: 429 });
  assert.equal(limited.error.code, "upstream_rate_limited");
  assert.equal(limited.error.retryable, true);
  assert.equal(mapProviderError({ status: 500 }).error.retryable, true);
  const forbidden = mapProviderError({ status: 403 });
  assert.equal(forbidden.error.code, "upstream_forbidden");
  assert.equal(forbidden.error.retryable, false);
});
