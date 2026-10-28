# Harvy v2 repository and infrastructure index

Status: inspected 2026-10-28. This index distinguishes the **required target stack** from code in this clean repository and resources currently visible in the TIR LABS Cloudflare account. A missing live resource is an implementation gap, not a decision to omit the service.

## System boundary

Harvy is one system and one shared ontology. Ontoly is the raw dataset product. Civic, Tower, Ops, and Newsk are modes of Harvy; they share HarvyDex identity, HQL, permissions, feature flags, API, storage, and UI. Automation is the external Python/TypeScript connector execution server, using Spider Cloud Unlimited and Webshare proxy as required. Installed n8n coordinates internal Automation workflows.

## Actual clean repository

Git root: this repository (`labsbytir/harvy`, `main` at `92aecaa` when inspected). The moved `harvy-platform`, `opentir`, and `civontology` directories in the parent workspace are reference checkouts, not active source roots for this repo.

| Area | Files present | Implementation state |
|---|---|---|
| Web | `v2/web/src/App.tsx`, `main.tsx`, `theme.ts`, Vite config | Responsive preview; no authenticated Harvy API integration. A second root Vite entry/config is currently uncommitted and must be reconciled. |
| Shared contract | `v2/shared/automation-run.ts` | Typed Automation run/status validation only; no executor or deployed endpoint. |
| Shared UI | `v2/shared/ui/HarvyShell.tsx` | Starter component; not wired into the web entry. |
| n8n | `v2/workflows/` | Inactive starter exports. The prior untracked RSS starter was removed; source-specific CourtListener/news/weather templates remain to build. |
| Tests/CI | `v2/tests/automation-run.test.mjs`, `.github/workflows/ci.yml` | Local contract/build checks; no live integration or tenant isolation proof. |
| API/auth/database/Automation | No `v2/api/`, `v2/auth/`, `v2/automation/`, or `v2/migrations/` in this clean repo | Required implementation gaps. References to existing auth code, D1 migrations, supervisor, or connector implementations in older copied docs describe the moved reference checkout, not this active repo. |

## Required target stack and current account evidence

| Service | Harvy v2 role | Current evidence / next implementation need |
|---|---|---|
| Workers | Shared web and `/api/v1/` runtime; Better Auth and authorized HQL/API operations | `harvy` is deployed as a web preview. Other `harvy-*` Workers are older deployments, not the clean v2 implementation. Build the API/auth boundary. |
| PostgreSQL + Hyperdrive | Priority transactional database and pooled Worker connection for HarvyDex, ontology, tenancy, permissions, features, run registry | No Hyperdrive configuration listed. PostgreSQL host/connection and core migrations remain to implement. |
| D1 | Cloudflare operational/index or specifically owned state where selected in the v2 design | No D1 database listed by the current CLI. Do not describe the legacy `harvy-platform-v2` binding as a live database. |
| R2 | `harvy-raw` source captures; `harvy-artifacts` processed objects; separate Basin catalog bucket for analytical tables | `harvy-raw` exists; `harvy-artifacts` and the catalog bucket are not listed. `harvy-public` and `harvy-production` exist but are not substitutes without a reviewed mapping. |
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

- `docs/PLAN.md` still contains some older feed-slice and D1/auth/supervisor language from the moved checkout; reconcile those passages against this index and `CONNECTOR_PLAN.md` before implementation.
- `docs/DEVELOPMENT.md` still describes old `v2/auth/`, `v2/migrations/`, `v2/projector/`, and static page paths as present, and its local check commands do not match this repo's `package.json`.
- `docs/BUILD_AGENT_PROMPT.md` has correct target bucket names after the latest correction, but it is a prompt, not an implementation.
- The current Cloudflare account inventory is not proof of which actor created each resource; inspect audit logs and bindings before decommissioning anything.
