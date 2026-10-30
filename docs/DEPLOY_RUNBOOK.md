# Deploy Runbook — harvy.dev

Authored 2026-10-30 on branch `codex/osint-postgres-port` (HEAD `99406dd`). This is a **runbook, not a deployment**: no Worker was deployed, no secret set, no bucket created, no DNS changed while writing it. All account-state claims below were verified read-only via `wrangler deployments list`, `wrangler hyperdrive list`, `wrangler r2 bucket list`, and read-only Cloudflare API GETs (`curl`) using the wrangler OAuth token (value never printed).

## 0. Verified current state (2026-10-30)

| Item | State | Evidence |
|---|---|---|
| Account | TIR LABS `9061d93166998cf39e011a52b369b812`, OAuth user pen@trytir.com | `wrangler whoami` |
| Zone `harvy.dev` | **active in this account**, zone id `b08bdd9ce052b6c03735323e32b187d6`, NS `yolanda/ignacio.ns.cloudflare.com` | API `GET /zones?name=harvy.dev` |
| DNS at apex | NS records exist; **no A/AAAA**; `https://harvy.dev` does not serve yet | `dig +short harvy.dev A/AAAA/NS`, `curl -sI https://harvy.dev/` |
| Worker routes on zone | **zero routes currently attached** to harvy.dev | API `GET /zones/<id>/workers/routes` |
| Worker `harvy-auth` | exists, last deploy 2026-10-26 | `wrangler deployments list --name harvy-auth` |
| Worker `harvy-api` | **does not exist** (API 404 on deployments) | `wrangler deployments list --name harvy-api` |
| Worker `harvy` (web) | **exists** — note the name is `harvy`, not `harvy-web`; last deploy 2026-10-26 04:54. It also serves `harvybot.com` as a custom domain (different zone `8f463095…`), so redeploying it manages only the routes declared in its config | `wrangler deployments list --name harvy`, API `GET /accounts/<id>/workers/domains` |
| R2 buckets | `harvy-raw`, `harvy-production`, `harvy-public`, `harvy-basin` exist; **`harvy-artifacts` does not** | `wrangler r2 bucket list` |
| Hyperdrive | `7160e37343ae4a0ba67e5b881342d99f` → `85.9.196.97:5432`, db `harvy`, user `harvy` (PostgreSQL); bound as `HYPERDRIVE_PRIVATE` in both auth and api configs | `wrangler hyperdrive list` |
| Migrations | 9 SQL files in `v2/migrations/`; per prior verification all 9 applied to that Hyperdrive (not re-queried via psql here) | `ls v2/migrations` |
| Web assets | `dist/web/` exists (`index.html`, `assets/`); build is `npm run build` → `vite build --config v2/web/vite.config.ts` with `outDir: ../../dist/web` | filesystem, `v2/web/vite.config.ts` |

Route map declared in configs (most specific pattern wins on the zone):

- `harvy.dev/api/better-auth/*` → `harvy-auth` (v2/auth/wrangler.jsonc)
- `harvy.dev/api/v1/*`, `harvy.dev/health`, `harvy.dev/internal/v1/automation-*` → `harvy-api` (v2/api/wrangler.jsonc)
- `harvy.dev/*` → `harvy` (v2/web/wrangler.jsonc, assets with SPA fallback)

## 1. Ordered deploy checklist

Run all commands from the repo root `/Users/pen/Desktop/harvy-new`. Config paths are given explicitly because `main`/`assets` are resolved relative to the config file.

### Step 0 — pre-flight (no mutations)

- [ ] Zone `harvy.dev` is active in account `9061d931…` — **already verified** (section 0). If re-checking later: `npx wrangler whoami` for the account, then read-only `curl -H "Authorization: Bearer <wrangler-oauth-token>" "https://api.cloudflare.com/client/v4/zones?name=harvy.dev"` (extract the token from `~/.wrangler/config/default.toml` key `oauth_token`; never print it), or in the dashboard: **Websites → check `harvy.dev` is listed in this account and status is Active**. `wrangler` 4.152 has no `zones list` command.
- [ ] `npm run build` so `dist/web/` is current (required before the web deploy; the assets directory must exist or upload fails).
- [ ] Resolve the bucket decision in section 3 **before** deploying `harvy-api`.

### Step 1 — deploy `harvy-auth` FIRST

Why first: the web sign-in flow calls `harvy.dev/api/better-auth/*`, and `harvy-api` resolves actors by calling the `AUTH` service binding (`harvy-auth`) at `/__internal/actor` (v2/api/worker.ts:87-97). Auth must serve its route before web can sign anyone in and before api can authorize anyone.

1. Set the one required secret (prompts for the value on stdin; never echo it):
   ```sh
   npx wrangler secret put BETTER_AUTH_SECRET --name harvy-auth --config v2/auth/wrangler.jsonc
   ```
   Generate the value out-of-band, e.g. `openssl rand -base64 32`.
2. Optionally set the admin allowlist (non-secret, comma-separated Better Auth user IDs):
   ```sh
   npx wrangler secret put HARVY_ADMIN_USER_IDS --name harvy-auth --config v2/auth/wrangler.jsonc
   ```
3. Deploy:
   ```sh
   npx wrangler deploy --config v2/auth/wrangler.jsonc
   ```

Must be true before this deploy: zone active in the account (routes attach on deploy; `workers_dev` is false so there is no workers.dev fallback). Without `BETTER_AUTH_SECRET` the deploy succeeds but every route 503s except `/api/better-auth/config` (v2/auth/worker.ts:16-18) — so set the secret first.

### Step 2 — deploy `harvy-api` SECOND

Why second: its `services` binding `AUTH → harvy-auth` and its actor checks depend on auth being live; its R2 binding depends on the bucket decision.

1. Create the missing bucket **or** apply the section-3 decision (mutating — operator action, outside this runbook).
2. Set secrets (one prompt each, values from the n8n credential store / Basin, never from git):
   ```sh
   npx wrangler secret put AUTOMATION_DISPATCH_TOKEN --name harvy-api --config v2/api/wrangler.jsonc
   npx wrangler secret put AUTOMATION_CALLBACK_SECRET --name harvy-api --config v2/api/wrangler.jsonc
   npx wrangler secret put BASIN_SQL_TOKEN        --name harvy-api --config v2/api/wrangler.jsonc
   ```
3. Set non-secret vars (use `--var` on the deploy command or the dashboard; do not commit them to wrangler.jsonc):
   ```sh
   npx wrangler deploy --config v2/api/wrangler.jsonc \
     --var AUTOMATION_URL:"https://<n8n-vps-host>" \
     --var BASIN_ACCOUNT_ID:"9061d93166998cf39e011a52b369b812" \
     --var BASIN_BUCKET:"harvy-basin"
   ```
   (`AUTOMATION_URL` must be an HTTPS origin only — the Worker appends `/webhook/internal/v1/scrape-runs`, v2/api/worker.ts:139-145.)

Must be true before this deploy: `harvy-auth` deployed (service binding target exists); Hyperdrive binding id `7160e373…` present (verified); **bucket decision resolved — otherwise `wrangler deploy` fails hard** because `HARVY_ARTIFACTS` points at the nonexistent `harvy-artifacts` bucket.

### Step 3 — deploy `harvy` (web) LAST

Why last: it owns the catch-all `harvy.dev/*`. Deploying it before auth/api would serve a login page whose API calls 401/503.

```sh
npm run build
npx wrangler deploy --config v2/web/wrangler.jsonc
```

Must be true: `dist/web/` built in step 0. Caution: the existing `harvy` Worker also serves `harvybot.com` as a custom domain; this deploy manages only the routes in the config file.

### Step 4 — verify routes attached

```sh
curl -s -H "Authorization: Bearer <wrangler-oauth-token>" \
  "https://api.cloudflare.com/client/v4/zones/b08bdd9ce052b6c03735323e32b187d6/workers/routes"
```
Expect 4 patterns (auth ×1, api ×3, web ×1). Dashboard equivalent: zone → **Workers Routes**.

## 2. The 8 unconfigured bindings/secrets

None of these make `wrangler deploy` itself fail — the Worker uploads fine and degrades at request time, except as noted. Code references are to `v2/api/worker.ts` / `v2/auth/worker.ts` / `v2/api/basin-compiler.ts`.

| # | Name | Worker | What it is / where the value comes from | vars or `secret put` | Behavior if missing |
|---|---|---|---|---|---|
| 1 | `BETTER_AUTH_SECRET` | harvy-auth | Better Auth signing/encryption secret; operator-generated random value stored in the Worker secret store | **`secret put`** | Deploy OK, but **every route 503s** except `GET /api/better-auth/config`, which reports `"enabled": false` (auth/worker.ts:16-18). Sign-in impossible → functionally required before serving |
| 2 | `HARVY_ADMIN_USER_IDS` | harvy-auth | Comma-separated Better Auth user IDs allowed `entitlements.manage`; server-configured allowlist, default-deny (auth/worker.ts:30, api capabilities) | `vars` entry (non-secret IDs) or `secret put` | Degrades: empty allowlist = no one gets Harvy-admin capabilities; everything else works |
| 3 | `AUTOMATION_URL` | harvy-api | HTTPS origin of the VPS n8n host (no path; Worker appends the fixed webhook path, worker.ts:139-145); from n8n/ops config | `vars` entry | Degrades: `POST /api/v1/runs` → 503 `automation_unavailable` (worker.ts:728-729); `/api/v1/context` reports `serviceHealth.automation: "unavailable"` (worker.ts:311) |
| 4 | `AUTOMATION_DISPATCH_TOKEN` | harvy-api | Bearer token n8n expects on run dispatch; lives in n8n's credential store | **`secret put`** | Same degrade as #3 (checked together at worker.ts:729) |
| 5 | `AUTOMATION_CALLBACK_SECRET` | harvy-api | HMAC-SHA256 key n8n uses for `x-harvy-signature` on callbacks; shared secret in n8n's credential store | **`secret put`** | Degrades: `/internal/v1/automation-callback` and `/internal/v1/automation-publications` → 503 `unavailable` (worker.ts:860); run state never advances from queued |
| 6 | `BASIN_ACCOUNT_ID` | harvy-api | Cloudflare account ID for the Basin SQL REST API (`9061d931…`) | `vars` entry | Degrades, fail-closed: Basin-engine cube/HQL queries → 503 `not_provisioned` (basin-compiler.ts:288-301); Postgres-backed queries unaffected |
| 7 | `BASIN_BUCKET` | harvy-api | R2 bucket backing the Basin table; `harvy-basin` exists | `vars` entry | Same degrade as #6 |
| 8 | `BASIN_SQL_TOKEN` | harvy-api | Basin SQL API token; from the Basin provisioning (docs/BASIN_PROVISIONING.md) | **`secret put`** | Same fail-closed degrade as #6 |

Summary: secrets via `wrangler secret put` = #1, #4, #5, #8 (values are credentials). Plain `vars` = #2, #3, #6, #7 (non-secret). Required for a usable deployment: #1. Everything else can be added after first deploy without redeploying code — just `secret put` / set vars and the next request picks them up.

## 3. Bucket decision — `harvy-artifacts` vs `harvy-production` (USER DECISION)

`v2/api/wrangler.jsonc` binds `HARVY_ARTIFACTS → harvy-artifacts`, which does not exist, so **deploying `harvy-api` fails hard until this is resolved**. The code also hardcodes the bucket names in the publication path: raw artifacts must be `r2://harvy-raw/…`, processed artifacts must be `r2://harvy-artifacts/…`, and both bucket bindings must be present (worker.ts:876, 896, 933-934).

- **Option A — create `harvy-artifacts`** (`npx wrangler r2 bucket create harvy-artifacts`). No config or code change; keeps the raw/processed stage separation the code enforces. Smallest change.
- **Option B — rebind `HARVY_ARTIFACTS` to an existing bucket** (e.g. `harvy-production`). Requires editing `wrangler.jsonc` **and** the bucket-name literals in `v2/api/worker.ts`, plus deciding what `harvy-production` is otherwise used for. More change, collision risk.

**Decision owner: the user.** This runbook changes nothing; it records both options.

## 4. DNS prerequisite

Requirement: the `harvy.dev` zone must exist and be **active in the account the Workers deploy to** (`9061d931…`), because `routes` in wrangler.jsonc attach to a zone in that account. An apex A/AAAA record is **not** required — Worker routes serve the hostname directly.

Status: **verified satisfied.** API `GET /zones?name=harvy.dev` (read-only, 2026-10-30) returned zone `b08bdd9ce052b6c03735323e32b187d6`, `status: active`, account `9061d931…`, NS `ignacio/yolanda.ns.cloudflare.com` (matching `dig +short harvy.dev NS`). Apex A/AAAA are absent and `https://harvy.dev` does not answer yet — expected, because zero Worker routes are currently attached to the zone (also verified). To re-verify without the API: `npx wrangler whoami` (account) + dashboard **Websites** list (zone present and Active). If the zone were not in the account, `wrangler deploy` fails with a route/zone error (1001/1014-class) and the fix is moving/adding the zone to the account — a dashboard/DNS-registrar action, not a repo change.

## 5. Smoke tests after deploy

Run in this order; expected codes assume steps 1–3 completed.

```sh
# 1. API worker up, DB path not needed for /health
curl -s -w '\nHTTP %{http_code}\n' https://harvy.dev/health
# expect: 200 {"status":"ok","time":"..."}
# 404/524 -> harvy-api route not attached; 503 -> no database (Hyperdrive binding) — should not happen, binding verified

# 2. Auth worker up and secret set
curl -s -w '\nHTTP %{http_code}\n' https://harvy.dev/api/better-auth/config
# expect: 200 JSON with "enabled":true
# "enabled":false -> BETTER_AUTH_SECRET not set; 524 -> harvy-auth route not attached

# 3. API + auth service binding + Postgres, signed out
curl -s -w '\nHTTP %{http_code}\n' https://harvy.dev/api/v1/context
# expect: 401 {"code":"unauthorized",...}  (signed-out is the healthy answer)
# 503 -> database not configured (Hyperdrive missing); 404 -> api route not attached; 500 -> Postgres unreachable via Hyperdrive

# 4. Web worker serving the SPA (this is the sign-in page load)
curl -s -o /dev/null -w 'HTTP %{http_code}\n' https://harvy.dev/
# expect: 200 text/html (dist/web/index.html, SPA fallback)

# 5. Optional end-to-end sign-in probe (anonymous sign-in requires privacyAccepted:true, auth/worker.ts:107-114)
curl -s -i -X POST https://harvy.dev/api/better-auth/sign-in/anonymous \
  -H 'content-type: application/json' -d '{"privacyAccepted":true}'
# expect: 200 with set-cookie session header; then re-run test 3 with the cookie -> 200 context JSON
```

Failure code cheat sheet: `524`/`404` on any of the above = the matching Worker route is not attached (re-check section 1 step 4); Cloudflare error `1001`/`1003` = DNS/zone not on Cloudflare for this account (contradicted by section 4 — would mean the zone moved).

## Appendix — corrections to the brief and things not verifiable from the CLI

- The web Worker is named **`harvy`**, not `harvy-web`, and it **already exists** (deploy 2026-10-26 04:54) — only `harvy-api` is absent. It also serves `harvybot.com` as a custom domain.
- `harvy.dev` does have NS delegation to Cloudflare nameservers; what it lacks is A/AAAA records and attached Worker routes (both verified). Saying it "does not resolve in DNS at all" is only true for A/AAAA lookups.
- `CLOUDFLARE_API_TOKEN` is not set in this environment; read-only API verification used the wrangler OAuth token from `~/.wrangler/config/default.toml` (value never printed). `wrangler` 4.152 has no `zones list` command, so zone verification went through `client/v4`.
- Migration application count (9/9 on Hyperdrive `7160e373…`) comes from prior verification and the 9 files in `v2/migrations/`; it was not re-queried against Postgres here (psql was outside the allowed read-only set).
- Uncommitted files from other sessions (v2/api/analytics.ts, v2/api/worker.ts, v2/shared/cubes.ts, v2/api/basin-compiler.ts, web sources, tests, docs/PLAN.md, NOTICE, docs/BASIN_PROVISIONING.md) were left untouched; deploy as-is or commit first per repo rules — this runbook only documents.
