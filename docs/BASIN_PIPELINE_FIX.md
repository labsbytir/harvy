# Basin pipeline fix — completion plan (plan only, nothing mutated)

Verified live state on 2026-10-30 (read-only commands run for this doc):

- `wrangler basin catalog get harvy-basin` → **Status: active**. Catalog URI
  `https://catalog.cloudflarestorage.com/9061d93166998cf39e011a52b369b812/harvy-basin`,
  **Warehouse: `9061d93166998cf39e011a52b369b812_harvy-basin`**.
  ⚠️ This contradicts the earlier session note "Catalog is NOT enabled" — the catalog
  IS enabled now (also contradicts the stale comment in `v2/shared/cubes.ts` line 6).
- Pipeline `harvy_pipeline` (id `1272118915c94972970bf6982bf05373`) is `running`,
  SQL `INSERT INTO harvy_sink SELECT * FROM harvy_stream;`, stream `harvy_stream`
  (single `value json` column), sink `harvy_sink` (type Basin Catalog → `default.analyze`,
  parquet/zstd).
- Stream `harvy_evidence_stream` (id `e05a3ed89b654c2797dcff2cbd22c8ef`) exists with the
  9-column schema: `id, event_id, source_id, publisher, headline (optional), product,
  tenant_id, workspace_id, captured_at (timestamp)`, all required except `headline`.
  HTTP ingest **enabled with authentication**: `https://e05a3ed89b654c2797dcff2cbd22c8ef.ingest.cloudflare.com`.
- The 9 columns cover everything `v2/api/basin-compiler.ts` needs: cube fields
  (`id, event_id, source_id, publisher, headline, product, captured_at`) plus the scope
  columns `SCOPE_COLUMNS = { tenant_id, workspace_id, product }` (basin-compiler.ts line 37).
- wrangler 4.152.0. `sinks create` accepts `--type` choices `r2 | r2-data-catalog`
  (the newer docs name `basin-catalog` is NOT in this wrangler's choices — use `r2-data-catalog`).

## 1. Ordered commands

0. **Verify catalog (safe-to-run, read-only):**
   ```bash
   wrangler basin catalog get harvy-basin
   ```
   Expect `Status: active` and Warehouse `9061d93166998cf39e011a52b369b812_harvy-basin`.
   The `enable` step is therefore **already done — do not re-run `catalog enable`**; if it
   ever reports inactive, the enabling command is
   `wrangler basin catalog enable harvy-basin` (safe-to-run, idempotent-ish, but only run
   if `get` shows inactive). Docs: https://developers.cloudflare.com/basin-sql/get-started/

1. **Obtain a catalog token — REQUIRES-USER-DECISION (user action, credential never stored in repo):**
   There is **no wrangler CLI command for catalog tokens** (`wrangler basin catalog --help`
   shows only enable/disable/get/compaction/snapshot-expiration). Create an **Account API
   token** in the Cloudflare dashboard: R2 → Manage API tokens → Create Account API token,
   permission **Admin Read & Write** (this also grants Basin SQL Read). Alternatively a
   custom token with Basin Catalog Edit + Workers R2 Storage Edit (+ Basin SQL Read for
   querying). Docs: https://developers.cloudflare.com/basin-pipelines/getting-started/ step 1.
   Pass it only as a shell/env value (`--catalog-token "$BASIN_CATALOG_TOKEN"`), never into a
   file, per repo secret rules.

2. **Create the evidence sink — REQUIRES-USER-DECISION (mutating; needs the token from step 1):**
   ```bash
   wrangler basin pipelines sinks create harvy_evidence_sink \
     --type r2-data-catalog \
     --bucket harvy-basin \
     --namespace default \
     --table evidence \
     --format parquet \
     --compression zstd \
     --path evidence \
     --catalog-token "$BASIN_CATALOG_TOKEN"
   ```
   Notes: the sink creates namespace/table if absent; it **cannot** be created over an
   existing Iceberg table (`default.evidence` does not exist yet — verified via the failed
   earlier attempt only when catalog was off; re-check with a query in §5 before creating).
   Docs: https://developers.cloudflare.com/basin-pipelines/sinks/available-sinks/r2-data-catalog/
   Pipelines auto-append an `__ingest_ts` column (DAY-partitioned) — harmless extra column.

3. **Create the pipeline — REQUIRES-USER-DECISION (mutating):**
   ```bash
   wrangler basin pipelines create harvy_evidence_pipeline \
     --sql "INSERT INTO harvy_evidence_sink SELECT * FROM harvy_evidence_stream;"
   ```
   Safe-to-run once sink exists; creating it before the sink fails, so order matters.

## 2. Matching `default.events` stream/sink — USER DECISION

Optional. `v2/shared/cubes.ts` declares `events.basinTable = "default.events"` but sets
`engine: "postgres"`, and the compiler rejects non-Basin cubes (`cube_not_on_basin`), so
the Events cube is served from Postgres today; a Basin `default.events` table is only
needed if you later flip `events.engine` to `"basin"`. Tradeoff: building it costs a second
stream+sink+pipeline and duplicate storage/write load; not building it means the
`default.events` reference in cubes.ts stays dead config. **Decision belongs to the user.**

## 3. Old `harvy_pipeline` / `harvy_stream` / `harvy_sink` (`default.analyze`) — USER DECISION, do NOT delete

- **Keep:** risk = ongoing duplicate write cost into `harvy-basin` and a stale json-blob
  `default.analyze` table that nothing queries (compiler only reads `default.evidence`).
- **Migrate** (point a new pipeline at the 9-column schema): risk = schema mismatch on old
  json rows and backfill complexity; no consumer of `default.analyze` exists in code.
- **Delete:** risk = permanent loss of whatever landed in `default.analyze` and ingest
  downtime if anything still posts to `harvy_stream`'s endpoint.

## 4. Ingest body for the evidence stream

POST a **JSON array of objects** (one object per row) with a Bearer token that has
**Basin Pipelines Send** permission (stream has authentication enabled).
Docs: https://developers.cloudflare.com/basin-pipelines/streams/writing-to-streams/

```bash
curl -X POST https://e05a3ed89b654c2797dcff2cbd22c8ef.ingest.cloudflare.com \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BASIN_PIPELINES_SEND_TOKEN" \
  -d '[
    {
      "id": "ev_01J9X8Q2M4K7",
      "event_id": "evt_01J9X8P9VN2B",
      "source_id": "src_reuters-world",
      "publisher": "Reuters",
      "headline": "Example headline for verification row",
      "product": "newsk",
      "tenant_id": "tn_acme",
      "workspace_id": "ws_main",
      "captured_at": "2026-10-30T07:30:00Z"
    }
  ]'
```

Schema rules (docs, "Schema validation"): `captured_at` accepts RFC 3339 strings (or Unix
time per unit); `headline` may be omitted (optional). **Events that violate the schema are
accepted then silently dropped** — validate before sending and monitor user error metrics
via GraphQL if counts look wrong.

## 5. Verification sequence after first ingest

Basin SQL requires the **warehouse name as the first positional arg**, discovered via
`wrangler basin catalog get harvy-basin` → Warehouse `9061d93166998cf39e011a52b369b812_harvy-basin`.
Wrangler reads the query token from `WRANGLER_BASIN_SQL_AUTH_TOKEN`.
Docs: https://developers.cloudflare.com/basin-sql/query-data/ and
https://developers.cloudflare.com/basin-sql/reference/wrangler-commands/

```bash
export WRANGLER_BASIN_SQL_AUTH_TOKEN="$BASIN_CATALOG_TOKEN"   # same R2 Admin R&W token works
W=9061d93166998cf39e011a52b369b812_harvy-basin

wrangler basin sql query "$W" "SELECT count(*) AS n FROM default.evidence"
wrangler basin sql query "$W" "SELECT publisher, count(*) AS n FROM default.evidence GROUP BY publisher ORDER BY n DESC"
wrangler basin sql query "$W" "SELECT id, publisher, captured_at FROM default.evidence WHERE tenant_id = 'tn_acme' AND workspace_id = 'ws_main' AND product IN ('newsk') LIMIT 10"
```

Failure meanings:

- `count(*) = 0` / table not found → pipeline not running, wrong sink name in SQL, or the
  first batch hasn't committed yet (default roll interval is 300 s / 100 MB — **wait ~5 min**
  after ingest before concluding failure; docs confirm first data lands a few minutes after
  first events).
- count = 0 but table exists → events were dropped by schema validation (check user error
  metrics) or the POST auth failed (401/403).
- GROUP BY publisher returns unexpected/empty groups → column mapping drift between stream
  schema and Iceberg table.
- tenant/workspace filter returns 0 rows while count > 0 → scope predicate mismatch: compiler
  filters `tenant_id`, `workspace_id`, `product IN (...)` (basin-compiler.ts `SCOPE_COLUMNS`),
  so those three columns must land with exactly those names/types.

## 6. UNVERIFIED items

- Whether `default.analyze` (written by the old sink) already contains rows — not queried
  (would need a Basin SQL run, left out to keep this plan read-only on data).
- Exact `--type` acceptance of `basin-catalog` in wrangler 4.152.0: CLI help lists only
  `r2` and `r2-data-catalog`, so this plan uses `r2-data-catalog` (docs say the legacy value
  remains valid); if it errors, retry with `--type basin-catalog` per
  https://developers.cloudflare.com/basin-pipelines/sinks/available-sinks/r2-data-catalog/.
- Token TTL/rotation policy — dashboard-side, not inspected.
