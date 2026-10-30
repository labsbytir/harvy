# Harvy v2 repository and infrastructure index

Status: updated 2026-10-29. This index distinguishes the **required target stack** from local code and previously inspected Cloudflare inventory. Local source and tests are not proof of deployed services or live collection.

## System boundary

Harvy is one system and one shared ontology. Ontoly is the raw dataset product. Civic, Tower, Ops, and Newsk are modes of Harvy; they share HarvyDex identity, HQL, permissions, feature flags, API, storage, and UI. Automation is the user's VPS-hosted n8n runtime: its workflows execute approved Spider/Webshare or structured API requests, normalize results, store artifacts in R2, and call Harvy's signed endpoints. No separate executor is assumed; live n8n access is unverified.

## Actual clean repository

Git root: this repository (`labsbytir/harvy`, `main` at `92aecaa` when inspected). The moved `harvy-platform`, `opentir`, and `civontology` directories in the parent workspace are reference checkouts, not active source roots for this repo.

| Area | Files present | Implementation state |
|---|---|---|
| Web | `v2/web/src/App.tsx`, `Workspace.tsx`, `AnalysisDesk.tsx`, `OpsDesk.tsx`, `GlobalSearch.tsx`, `worker.ts`, `wrangler.jsonc` | Public preview plus authenticated four-mode shell, scoped global search, revision-checked event assignment/status activity, Harvy-admin audit view, validated private/workspace Drizzle Cube dashboards, data/schema tools, Newsk story/brief flow, and Ops action queue. Static Worker routing is configured locally but not deployed; sign-in needs deployed Auth/API Workers. |
| Shared contract | `v2/shared/` | Automation, HQL, HarvyDex, artifact, error, and cache-policy contracts with bounded validation and local tests. |
| API | `v2/api/worker.ts`, `analytics.ts`, `schema.ts`, `wrangler.jsonc` | Local D1-backed API; Better Auth service binding; explicit product entitlements; scoped events/evidence/stories/briefs/dashboards/actions/search; audited monitor and dashboard state changes; per-tenant run/page quotas; idempotent dispatch claims; signed callbacks. No live domain route, n8n webhook, or service binding is verified. |
| Auth/database | `v2/auth/`, `v2/migrations/0007_harvy_product_core.sql` | Better Auth source and organization actor resolution are present. New scoped tables are only migration source; remote D1 was not migrated. |
| Automation/n8n | User-reported VPS-hosted n8n executes approved source workflows; checked-in `v2/workflows/` are inactive run-submission starters | API dispatch and signed publication/status contracts exist locally. The live n8n instance and execution workflows were not inspected or connected. |
| Tests/CI | `v2/tests/`, `v2/auth/*.test.mjs`, `.github/workflows/ci.yml` | Local API, analytics, contract, auth-consent tests, typechecks, and web build. No live connector, deployed tenant-isolation, or provider egress proof. |

## Required target stack and current account evidence

| Service | Harvy v2 role | Current evidence / next implementation need |
|---|---|---|
| Workers | Shared web and `/api/v1/` runtime; Better Auth and authorized HQL/API operations | An existing `harvy` preview Worker was observed in the 2026-10-28 account inventory; it is not verified as this checkout's V2 build. Other `harvy-*` Workers are older deployments. The current static/API/Auth configs remain local and undeployed. |
| PostgreSQL + Hyperdrive | Priority transactional database and pooled Worker connection for HarvyDex, ontology, tenancy, permissions, features, run registry | No Hyperdrive configuration listed. PostgreSQL host/connection and core migrations remain to implement. |
| D1 | Cloudflare operational/index or specifically owned state where selected in the v2 design | No D1 database listed by the current CLI. Do not describe the legacy `harvy-platform-v2` binding as a live database. |
| R2 | `harvy-raw` source captures; `harvy-artifacts` processed objects; separate Basin catalog bucket for catalog-managed analytical tables | The API Wrangler config names `harvy-raw` and `harvy-artifacts` bindings; the last account inventory listed only `harvy-raw`. `harvy-artifacts` and the catalog bucket must be verified/provisioned before deployment. Other existing buckets are not substitutes without a reviewed mapping. |
| Basin Pipelines/Catalog/SQL | Ingest processed data into catalog-managed Iceberg/Parquet and serve historical analytics | No pipeline/catalog listed. Name and provision the catalog bucket and analytical resources deliberately. |
| K2 Streams | Shared durable event stream for record/run lifecycle and downstream consumers | No stream listed. Define event contract and subscribers before activation. |
| Queues | Bounded asynchronous Harvy jobs, retries, and dead-letter handling | Older Harvy queues exist, including excluded Telegram and legacy v2 work. Reconcile before selecting the shared v2 queue(s). |
| Workflows | Durable multi-step Harvy execution where needed | Three older Harvy Workflows exist; one has a schedule. Reconcile schedule ownership with n8n and Automation. |
| Workers KV | Shared read-heavy configuration/cache and safe feature snapshots | No namespace listed. Define keys, TTL, invalidation, and ownership before provisioning. |
| Containers | Isolated large conversion/model workloads when part of the processing path | One unrelated-looking `harvesting-harvestingprocessor` application is listed with zero active instances; ownership unverified. |
| Secrets Store | Scoped Worker secrets; the VPS n8n instance uses its approved credential/secret store | Account default store exists; contents and bindings not audited. |
| Email Service | Transactional verification, invite, and notification email | Account/domain sending readiness not audited. |
| n8n + Spider + Webshare | VPS n8n executes approved scrape/API workflows, normalizes results, and uploads artifacts | Instance and workflow are user-reported; not accessible/verified from this checkout. |

## Source and product order

1. CourtListener bulk downloads/ingestion (issue #28).
2. News through Media Cloud (#26), SocketNews (#27), and approved Spider Cloud coverage (#8), surfaced in Newsk mode (#20). No RSS dependency.
3. Weather ingestion/context (#29).

The target uses all approved platform services as one Harvy system. Deployment can proceed in dependency order, but absence of a resource is tracked as a gap rather than a claim that it is unnecessary. Do not create one stack per mode or port excluded Telegram, JudyRecords, Truth Social, or SAM.gov connectors.

## Documentation drift to resolve

- `docs/PLAN.md` remains the single delivery plan. Its hackathon gates require live Automation/source evidence beyond the local implementation summarized here.
- `docs/DEVELOPMENT.md` describes target architecture as well as present code; do not treat target paths or acceptance requirements as implemented merely because they are documented.
- `docs/BUILD_AGENT_PROMPT.md` has correct target bucket names after the latest correction, but it is a prompt, not an implementation.
- The current Cloudflare account inventory is not proof of which actor created each resource; inspect audit logs and bindings before decommissioning anything.

## Reference repository review

Read-only shallow revisions reviewed on 2026-10-28: `harvyalpha-deprecated` `c0d1d7e`, `civontology` `4367e90`, and `opentir` `09bf508`. The deprecated Harvy repo has no project-wide license declaration; Civic's inspected root also has no license file; OpenTIR declares AGPL-3.0-only. No connector or runtime code was copied from these three checkouts. Their manifests, catalogs, and source-specific adapters remain candidates for individually reviewed ports through the Automation boundary; the old runtimes and storage stacks do not match the V2 plan. The historical candidate file `docs/CONNECTOR-CANDIDATES.md` is not the canonical denominator: its source points to a separate legacy inventory, while the supplied `opentir` checkout and Civic/HarvyAlpha manifests overlap and use different identifiers. Do not claim an adoption percentage until the unified catalog ledger is reviewed.
