# Harvy v2 repository and infrastructure index

Status: updated 2026-10-29. This index distinguishes the **required target stack** from local code and previously inspected Cloudflare inventory. Local source and tests are not proof of deployed services or live collection.

## System boundary

Harvy is one system and one shared ontology. Ontoly is the raw dataset product. Civic, Tower, Ops, and Newsk are modes of Harvy; they share HarvyDex identity, HQL, permissions, feature flags, API, storage, and UI. Automation is the external Python/TypeScript connector execution server, using Spider Cloud Unlimited and Webshare proxy as required. Installed n8n coordinates internal Automation workflows.

## Actual clean repository

Git root: this repository (`labsbytir/harvy`, `main` at `92aecaa` when inspected). The moved `harvy-platform`, `opentir`, and `civontology` directories in the parent workspace are reference checkouts, not active source roots for this repo.

| Area | Files present | Implementation state |
|---|---|---|
| Web | `v2/web/src/App.tsx`, `Workspace.tsx`, `AnalysisDesk.tsx`, `OpsDesk.tsx`, `worker.ts`, `wrangler.jsonc` | Public preview plus authenticated four-mode shell, product-scoped event/evidence views, Drizzle Cube dashboard, Newsk story/brief flow, and Ops action queue. Static Worker routing is configured locally but not deployed; sign-in needs deployed Auth/API Workers. |
| Shared contract | `v2/shared/` | Automation, HQL, HarvyDex, artifact, error, and cache-policy contracts with bounded validation and local tests. |
| API | `v2/api/worker.ts`, `analytics.ts`, `schema.ts`, `wrangler.jsonc` | Local D1-backed API; Better Auth service binding; product entitlements; scoped events, evidence, stories, briefs, dashboards, run dispatch/callbacks, and Ops handoffs. No live domain route or service binding is verified. |
| Auth/database | `v2/auth/`, `v2/migrations/0007_harvy_product_core.sql` | Better Auth source and organization actor resolution are present. New scoped tables are only migration source; remote D1 was not migrated. |
| Automation/n8n | External Automation service plus inactive `v2/workflows/` templates | API dispatch and signed publication/status contracts exist locally. Automation and the installed n8n instance were not inspected or connected. |
| Tests/CI | `v2/tests/`, `v2/auth/*.test.mjs`, `.github/workflows/ci.yml` | Local API, analytics, contract, auth-consent tests, typechecks, and web build. No live connector, deployed tenant-isolation, or provider egress proof. |

## Required target stack and current account evidence

| Service | Harvy v2 role | Current evidence / next implementation need |
|---|---|---|
| Workers | Shared web and `/api/v1/` runtime; Better Auth and authorized HQL/API operations | `harvy` is deployed as a web preview. Other `harvy-*` Workers are older deployments, not the clean v2 implementation. Build the API/auth boundary. |
| PostgreSQL + Hyperdrive | Priority transactional database and pooled Worker connection for HarvyDex, ontology, tenancy, permissions, features, run registry | No Hyperdrive configuration listed. PostgreSQL host/connection and core migrations remain to implement. |
| D1 | Cloudflare operational/index or specifically owned state where selected in the v2 design | No D1 database listed by the current CLI. Do not describe the legacy `harvy-platform-v2` binding as a live database. |
| R2 | `harvy-raw` source captures; `harvy-artifacts` processed objects; separate Basin catalog bucket for catalog-managed analytical tables | The API Wrangler config names `harvy-raw` and `harvy-artifacts` bindings; the last account inventory listed only `harvy-raw`. `harvy-artifacts` and the catalog bucket must be verified/provisioned before deployment. Other existing buckets are not substitutes without a reviewed mapping. |
| Basin Pipelines/Catalog/SQL | Ingest processed data into catalog-managed Iceberg/Parquet and serve historical analytics | No pipeline/catalog listed. Name and provision the catalog bucket and analytical resources deliberately. |
| K2 Streams | Shared durable event stream for record/run lifecycle and downstream consumers | No stream listed. Define event contract and subscribers before activation. |
| Queues | Bounded asynchronous Harvy jobs, retries, and dead-letter handling | Older Harvy queues exist, including excluded Telegram and legacy v2 work. Reconcile before selecting the shared v2 queue(s). |
| Workflows | Durable multi-step Harvy execution where needed | Three older Harvy Workflows exist; one has a schedule. Reconcile schedule ownership with n8n and Automation. |
| Workers KV | Shared read-heavy configuration/cache and safe feature snapshots | No namespace listed. Define keys, TTL, invalidation, and ownership before provisioning. |
| Containers | Isolated large conversion/model workloads when part of the processing path | One unrelated-looking `harvesting-harvestingprocessor` application is listed with zero active instances; ownership unverified. |
| Secrets Store | Scoped Worker secrets; Automation and n8n use approved secret injection/credential stores | Account default store exists; contents and bindings not audited. |
| Email Service | Transactional verification, invite, and notification email | Account/domain sending readiness not audited. |
| n8n + Automation + Spider + Webshare | External connectors and internal schedule/control flow | n8n instance and Automation host are user-reported; not accessible/verified from this checkout. |

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

Read-only shallow revisions reviewed on 2026-10-28: `harvyalpha-deprecated` `c0d1d7e`, `civontology` `4367e90`, and `opentir` `09bf508`. The deprecated Harvy repo has no project-wide license declaration; Civic's inspected root also has no license file; OpenTIR declares AGPL-3.0-only. No connector or runtime code was copied from these three checkouts. Their manifests, catalogs, and source-specific adapters remain candidates for individually reviewed ports through the Automation boundary; the old runtimes and storage stacks do not match the V2 plan.
