# Basin Provisioning

> Status: UNPROVISIONED as of 2026-10-30 — `v2/shared/cubes.ts` assumes `default.events` / `default.evidence`; no live Catalog verified.

## 1. Command sequence

Do not run without bucket decision in §2. Run in order.

### 1.1 Create artifact bucket
```bash
npx wrangler r2 bucket create harvy-artifacts
```
**Requires user decision** — bucket name/choice (§2) sets billing and Catalog binding.

### 1.2 Enable Basin Catalog on analytical bucket
```bash
npx wrangler basin catalog enable harvy-artifacts   # positional arg, verified against wrangler 4.152.0
```
**Requires user decision** — enables billing/retention on chosen bucket; irreversible config.

### 1.3 Get warehouse name + catalog URI
```bash
npx wrangler basin catalog get harvy-artifacts   # verified: `describe` does not exist; `get` is the status command
```
**Safe to run now** — read-only lookup, no state change.

### 1.4 Create read-only query token
Dashboard: Cloudflare → Basin / API Tokens → scoped read-only token for Catalog warehouse. No stable `wrangler` equivalent.
**Requires user decision** — creates credential; scope/expiry need approval.

### 1.5 Set Worker secrets (API Worker)
```bash
npx wrangler secret put BASIN_ACCOUNT_ID
npx wrangler secret put BASIN_BUCKET
npx wrangler secret put BASIN_SQL_TOKEN
```
**Requires user decision** — writes secrets to Worker environment; confirm target env (`--env production`).

## 2. Bucket choice (USER DECISION — present, do not decide)

- `harvy-artifacts`: isolates analytical/Iceberg data from prod R2; costs one more bucket.
- `harvy-production`: reuses existing bucket; mixes raw artifacts with Iceberg tables and broadens blast radius.
- New dedicated bucket (e.g. `harvy-basin`): cleanest isolation/naming; adds bucket to manage.

Suggestion (not a decision): use `harvy-artifacts` — matches secret name `BASIN_BUCKET` and keeps analytical data separate without new naming.

## 3. JSON artifacts to Iceberg

UNVERIFIED — requires checking https://developers.cloudflare.com/basin-pipelines/

## 4. Iceberg schema spec

Source: `v2/shared/cubes.ts`. Assumes namespace `default`. `kind: string` → Iceberg `string`; `kind: time` → Iceberg `timestamptz` (UNVERIFIED — confirm against live Catalog; header notes schema UNVERIFIED 2026-10-30).

| namespace | table | column | type |
|---|---|---|---|
| default | events | id | string |
| default | events | title | string |
| default | events | summary | string |
| default | events | status | string |
| default | events | product | string |
| default | events | first_seen_at | timestamptz |
| default | events | last_seen_at | timestamptz |
| default | evidence | id | string |
| default | evidence | event_id | string |
| default | evidence | source_id | string |
| default | evidence | publisher | string |
| default | evidence | headline | string |
| default | evidence | product | string |
| default | evidence | captured_at | timestamptz |

Note: `events.joinedFields.source_id` is cross-cube alias to `Evidence.sourceId`, not physical column in `default.events`.

## 5. Verification checklist

- `SELECT count(*) FROM default.events;` — failure/empty: Catalog/namespace wrong or no pipeline load yet.
- `SELECT count(*) FROM default.evidence;` — failure/empty: `evidence` table missing or pipeline not writing.
- `SELECT id, captured_at FROM default.evidence ORDER BY captured_at DESC LIMIT 5;` — failure: `captured_at` type/mapping wrong.
- `SELECT status, count(*) FROM default.events GROUP BY status;` — failure: `status` column missing or case mismatch.
- Run app evidence query via Basin compiler path; compare count to Postgres `harvy_v2_evidence` — mismatch: pipeline lag or scope leak.
