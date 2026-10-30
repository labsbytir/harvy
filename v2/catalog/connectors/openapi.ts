/** Open JSON API adapter family (CONNECTOR_PLAN batches C/D/E batch 1).
 * One bounded GET/POST fetch -> normalized Harvy events with provenance.
 * No network calls here; Automation performs the fetch off the registered
 * target_url. No credentials anywhere: only descriptive headers. */
import { isSafeSourceUrl } from "../../shared/automation-run.ts";
import { harvyError, type HarvyError } from "../../shared/errors.ts";

export const OPENAPI_FAMILY_MAX_RECORDS = 10;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type OpenApiMethod = "GET" | "POST";

export interface OpenApiFieldMapping {
  id: string | string[];
  title: string | string[];
  summary: string | string[];
  time?: string | string[];
  url?: string;
}

export interface TransposeSpec {
  path: string;
  keys: string[];
}

export interface OpenApiSourceConfig {
  source_id: string;
  source_scope_id: string;
  publisher: string;
  target_url: string;
  method: OpenApiMethod;
  headers?: Record<string, string>;
  default_params: Record<string, string | number>;
  default_body?: Record<string, unknown>;
  max_records: number;
  limit_keys: string[];
  record_path: string;
  transpose?: TransposeSpec;
  /** Fixed-endpoint sources with uncapped server responses: cap client-side. */
  response_bounded?: boolean;
  fields: OpenApiFieldMapping;
  coverage_note: string;
  /** Full-shape fixture of one bounded response; tests normalize this, never live fetch. */
  sample_payload: unknown;
}

export interface NormalizedEvidence {
  source_url: string;
  publisher: string;
  headline: string;
  excerpt: string;
  captured_at: string;
  method: OpenApiMethod;
  coverage: string;
}

export interface NormalizedEvent {
  harvydex_id: string;
  title: string;
  summary: string;
  first_seen_at: number;
  last_seen_at: number;
  evidence: [NormalizedEvidence];
}

/** Smallest read helper: dot path with numeric array indices. */
export function getPath(record: unknown, path: string): unknown {
  if (!path) return record;
  let current = record;
  for (const part of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[Array.isArray(current) && /^\d+$/.test(part) ? Number(part) : part];
  }
  return current;
}

function fnv1a(input: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable HarvyDex-shaped UUID for one external record; same input always wins. */
export function stableEventId(sourceId: string, externalId: string): string {
  const base = `${sourceId}:${externalId}`;
  const hex = [0x811c9dc5, 0x01000193, 0xdeadbeef, 0x41c6ce57]
    .map((seed) => fnv1a(base, seed).toString(16).padStart(8, "0")).join("").split("");
  hex[12] = "4";
  hex[16] = "8";
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

export function isStableEventId(value: unknown): value is string {
  return typeof value === "string" && UUID_V4.test(value);
}

function resolveLimit(config: OpenApiSourceConfig, key: string): number | null {
  const raw = key.startsWith("body.")
    ? getPath(config.default_body, key.slice(5))
    : config.default_params[key];
  return typeof raw === "number" && Number.isInteger(raw) ? raw : null;
}

/** The effective record bound carried by the default query/body. */
export function requestLimit(config: OpenApiSourceConfig): number | null {
  for (const key of config.limit_keys) {
    const limit = resolveLimit(config, key);
    if (limit !== null) return limit;
  }
  if (config.response_bounded) return config.max_records;
  return null;
}

export interface BuiltRequest {
  url: string;
  method: OpenApiMethod;
  headers: Record<string, string>;
  bodyText?: string;
}

/** Deterministic bounded request; no network. */
export function buildRequest(config: OpenApiSourceConfig): BuiltRequest {
  const headers = { Accept: "application/json", ...(config.headers ?? {}) };
  if (config.method === "POST") {
    return { url: config.target_url, method: "POST", headers, bodyText: JSON.stringify(config.default_body ?? {}) };
  }
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(config.default_params)) query.set(key, String(value));
  const suffix = query.size ? `?${query}` : "";
  return { url: `${config.target_url}${suffix}`, method: "GET", headers };
}

export function extractRecords(config: OpenApiSourceConfig, payload: unknown): unknown[] {
  if (config.transpose) {
    const table = getPath(payload, config.transpose.path);
    if (table === null || typeof table !== "object" || Array.isArray(table)) return [];
    const columns = config.transpose.keys.map((key) => (table as Record<string, unknown>)[key]);
    if (!columns.every((column) => Array.isArray(column))) return [];
    const length = Math.min(...columns.map((column) => (column as unknown[]).length), config.max_records);
    return Array.from({ length }, (_, index) =>
      Object.fromEntries(config.transpose!.keys.map((key, position) => [key, (columns[position] as unknown[])[index]])));
  }
  if (!config.record_path) return Array.isArray(payload) ? payload : [payload];
  const found = getPath(payload, config.record_path);
  return Array.isArray(found) ? found : [];
}

const pick = (record: unknown, path: string | string[] | undefined): unknown =>
  Array.isArray(path) ? path.map((option) => getPath(record, option)).find((value) => value !== undefined && value !== null && value !== "") : path ? getPath(record, path) : undefined;

const asText = (value: unknown, max: number): string =>
  value === undefined || value === null ? "" : String(Array.isArray(value) ? value.filter((part) => part !== null && part !== undefined && part !== "").join("; ") : value).slice(0, max);

function asTimeMs(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === "string" && value) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/** Pure normalization: records -> events with full provenance. */
export function normalizeResponse(
  config: OpenApiSourceConfig,
  payload: unknown,
  fetchedAt: string,
): NormalizedEvent[] {
  const fetchedMs = Number.isFinite(Date.parse(fetchedAt)) ? Date.parse(fetchedAt) : Date.now();
  const request = buildRequest(config);
  return extractRecords(config, payload).slice(0, config.max_records).map((record, index) => {
    const externalId = asText(pick(record, config.fields.id), 200) || `#${index}`;
    const title = asText(pick(record, config.fields.title), 500) || externalId;
    const summary = asText(pick(record, config.fields.summary), 4000);
    const seenAt = asTimeMs(config.fields.time ? pick(record, config.fields.time) : undefined, fetchedMs);
    const sourceUrl = asText(config.fields.url ? pick(record, config.fields.url) : undefined, 2048);
    return {
      harvydex_id: stableEventId(config.source_id, externalId),
      title,
      summary,
      first_seen_at: Math.min(seenAt, fetchedMs),
      last_seen_at: fetchedMs,
      evidence: [{
        source_url: sourceUrl.startsWith("https://") ? sourceUrl : request.url,
        publisher: config.publisher,
        headline: title,
        excerpt: summary,
        captured_at: new Date(fetchedMs).toISOString(),
        method: config.method,
        coverage: `${config.coverage_note}; limit ${config.max_records}`,
      }],
    };
  });
}

/** Stable idempotency key for one bounded poll of this source. */
export function buildIdempotencyKey(config: OpenApiSourceConfig): string {
  const request = buildRequest(config);
  const digest = fnv1a(`${request.url}|${request.bodyText ?? ""}`, 0x811c9dc5).toString(16).padStart(8, "0");
  return `${config.source_id}:${digest}`;
}

/** Run-registration target mirroring the harvy_v2_sources row for this config. */
export function toRunTarget(config: OpenApiSourceConfig): {
  connector_id: string;
  target_url: string;
  source_scope_id: string;
  mode: "api";
  max_pages: number;
  config_revision: string;
} {
  return {
    connector_id: "openapi",
    target_url: config.target_url,
    source_scope_id: config.source_scope_id,
    mode: "api",
    max_pages: 1,
    config_revision: "1",
  };
}

export interface ArtifactPairInput {
  run_id: string;
  source_scope_id: string;
  access_scope_id: string;
  raw_sha256: string;
  raw_byte_count: number;
  processed_sha256: string;
  processed_byte_count: number;
  capture_time: string;
}

/** Raw + processed manifest pair shaped for parseArtifactManifest. */
export function buildArtifactManifests(input: ArtifactPairInput): [
  { artifact_id: string; stage: "raw"; source_scope_id: string; access_scope_id: string; run_id: string; storage_uri: string; sha256: string; byte_count: number; capture_time: string },
  { artifact_id: string; stage: "processed"; source_scope_id: string; access_scope_id: string; run_id: string; storage_uri: string; sha256: string; byte_count: number; capture_time: string },
] {
  return [
    {
      artifact_id: `${input.run_id}-raw`, stage: "raw", source_scope_id: input.source_scope_id,
      access_scope_id: input.access_scope_id, run_id: input.run_id,
      storage_uri: `r2://harvy-raw/${input.source_scope_id}/${input.run_id}-raw.json`,
      sha256: input.raw_sha256, byte_count: input.raw_byte_count, capture_time: input.capture_time,
    },
    {
      artifact_id: `${input.run_id}-processed`, stage: "processed", source_scope_id: input.source_scope_id,
      access_scope_id: input.access_scope_id, run_id: input.run_id,
      storage_uri: `r2://harvy-artifacts/${input.source_scope_id}/${input.run_id}-processed.json`,
      sha256: input.processed_sha256, byte_count: input.processed_byte_count, capture_time: input.capture_time,
    },
  ];
}

/** Provider failure -> shared error taxonomy; 429/5xx/timeout retry. */
export function mapProviderError(input: { status?: number; code?: string }, traceId = "local"): HarvyError {
  const status = input.status;
  if (input.code === "timeout" || input.code === "aborted" || status === 408)
    return harvyError("upstream_timeout", "Upstream API timed out.", traceId, true);
  if (status === 429) return harvyError("upstream_rate_limited", "Upstream API rate limit reached.", traceId, true);
  if (typeof status === "number" && status >= 500)
    return harvyError("upstream_unavailable", "Upstream API is unavailable.", traceId, true);
  if (status === 401 || status === 403)
    return harvyError("upstream_forbidden", "Upstream API refused the request.", traceId, false);
  if (status === 404) return harvyError("upstream_not_found", "Upstream API has no such record.", traceId, false);
  if (typeof status === "number" && status >= 400)
    return harvyError("upstream_bad_request", "Upstream API rejected the request.", traceId, false);
  return harvyError("upstream_failed", "Upstream API call failed.", traceId, false);
}

const CREDENTIAL_HEADER = /authorization|api[-_]?key|x[-_]?api[-_]?key|token|secret|cookie|bearer/i;

/** Static config check: identity, safe URL, bound, mapping, no credentials. */
export function validateSourceConfig(config: OpenApiSourceConfig): string[] {
  const problems: string[] = [];
  if (!/^src_[a-z0-9-]+$/.test(config.source_id)) problems.push("source_id must look like src_<slug>");
  if (!/^[a-zA-Z0-9_-][a-zA-Z0-9._:-]{0,127}$/.test(config.source_scope_id)) problems.push("bad source_scope_id");
  if (!config.publisher.trim()) problems.push("publisher is required");
  if (!isSafeSourceUrl(config.target_url)) problems.push("target_url is not a safe https URL");
  if (config.method !== "GET" && config.method !== "POST") problems.push("method must be GET or POST");
  if (config.method === "POST" && !config.default_body) problems.push("POST needs default_body");
  if (!Number.isInteger(config.max_records) || config.max_records < 1 || config.max_records > OPENAPI_FAMILY_MAX_RECORDS)
    problems.push(`max_records must be 1..${OPENAPI_FAMILY_MAX_RECORDS}`);
  for (const [key, value] of Object.entries(config.headers ?? {})) {
    if (CREDENTIAL_HEADER.test(key) || CREDENTIAL_HEADER.test(value)) problems.push(`credential-like header: ${key}`);
  }
  if (!config.limit_keys.length && !config.response_bounded) problems.push("limit_keys must name the bound");
  const limit = requestLimit(config);
  if (limit === null || limit < 1 || limit > config.max_records) problems.push("default query/body limit must be within max_records");
  const fieldPath = (value: string | string[] | undefined): string =>
    Array.isArray(value) ? value.map(String).join("|") : String(value ?? "");
  if (!fieldPath(config.fields.id).trim() || !fieldPath(config.fields.title).trim() || !fieldPath(config.fields.summary).trim())
    problems.push("fields need id, title, and summary paths");
  if (typeof config.record_path !== "string") problems.push("record_path must be a string");
  if (!config.coverage_note.trim()) problems.push("coverage_note is required");
  if (typeof config.sample_payload === "undefined") problems.push("sample_payload fixture is required");
  return problems;
}
