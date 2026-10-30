# Harvy V2 Master Plan

This is the single project plan. It supersedes older plans and implementation notes; verified behavior must be separated from proposals.

The full API/source inventories and connector adoption sequence are in [CONNECTOR_PLAN.md](CONNECTOR_PLAN.md). Its four in-repo reference inputs include the OpenTIR source-by-source catalog and the prior Harvy/Civic manifests; candidate entries are not live integrations.

**System boundary:** Harvy is the single system and its ontology is shared across every use case. Ontoly is the product for the raw dataset. Civic, Tower, Ops, and Newsk are modes of the Harvy ontology, not separate systems, deployments, databases, or Cloudflare resource stacks. Cloudflare hosts the web/auth/API Workers and R2 on `harvy.dev`; PostgreSQL runs on the user's database server through Hyperdrive; the separate VPS n8n runtime executes approved connector workflows, normalizes results, stores artifacts, and calls Harvy's signed endpoints.

Reusable implementation starters live outside this plan: [inactive n8n scrape JSON](../v2/workflows/scrape-v1.template.json), [n8n API calling pattern](../v2/workflows/README.md), [15-question MCP agent intake](../v2/workflows/N8N-MCP-INTAKE.md), and [shared UI frame](../v2/shared/ui/HarvyShell.tsx). The [engineering standard](DEVELOPMENT.md#19-database-object-storage-and-cloudflare-deployment-map) maps PostgreSQL, object storage, Cloudflare services, and tool slots. These artifacts are starters; they are not installed, connected, or deployed by inclusion in the repository.

The [UI and Drizzle Cube specification](UI_SPEC.md) defines the website, application shell, screen inventory, component contracts, persistence, and acceptance checks. The [copyable build-agent prompt](BUILD_AGENT_PROMPT.md) directs an agent to implement this plan in verified slices and run local checks as it builds. Both are subordinate to this single plan and neither establishes a deployed capability.

Local implementation now includes the authenticated API Worker, organization/workspace actor resolution through Better Auth, explicit Harvy-admin-managed product grants with revisioned audit records, tenant-scoped events/evidence/stories/dashboards/actions, bounded HQL→Drizzle Cube queries, hourly tenant run quotas with idempotent leased dispatch, and signed n8n status/publication callbacks. Tenant owners/admins can pause or resume only pre-approved monitors through revision-checked audited state updates; source drafting and approval remain unavailable. Raw/processed manifests are validated. Newsk has a newsroom/story/brief flow; Tower has saved source/time/keyword watchlists and Ops handoff; Civic has a scoped event view; Ops has an action queue. Event UUIDs are HarvyDex IDs; details show source observations and revision-checked self-assignment/status activity, but generic Ontoly links, source-claim correction history, teammate assignment, and duplicate/contradiction analysis remain unimplemented. DataBrowser, schema exploration, bounded global search, and a Harvy-admin-only metadata audit view use scoped APIs; it covers product grants, monitor state, and dashboard create/update/delete metadata without storing dashboard contents. Dashboard configs and saved filter views use distinct bounded schemas; owners may share read-only dashboards within their workspace, with revision-checked edits/deletes and audited visibility changes. Global search covers events, evidence text (without returning excerpts), stories, visible dashboards, and Ops actions. Cloudflare inventory review found prior `harvy` and `harvy-auth` deployments but no `harvy-api`; route attachments remain unverified. The configured D1 database is missing, no Hyperdrive config exists, `harvy-raw` exists but `harvy-artifacts` does not, and the n8n webhook/workflows, product grants, and approved sources remain unverified. No live connector is verified.

On 2026-10-28 the old supervisor/API, connector deployment, hosting/infrastructure, intro/messaging/logging/support, OpenStates agent/workflow, upload Worker, Basin runbook, and duplicate planning guides were removed from the active repository tree. Git history preserves them. Current source of truth is this plan, [DEVELOPMENT.md](DEVELOPMENT.md), [UI_SPEC.md](UI_SPEC.md), [BUILD_AGENT_PROMPT.md](BUILD_AGENT_PROMPT.md), the retained Better Auth and legal/security references, and connector source research. The separate docs/Obsidian mirrors were not changed by this local cleanup.

## Five-day hackathon: 2026-10-28 through 2026-11-01

This is the active delivery sequence for the hackathon; the long-term work sequence and foundation backlog below remain the post-MVP roadmap. Day 1 is Wednesday, October 28, in America/New_York. The schedule assumes five consecutive eight-hour workdays, including the weekend, three developers plus one ops/sales/support/junior-engineering teammate (four people). Use elapsed hours from today's actual kickoff; do not assume elapsed morning hours are still available. If fewer hours remain today, keep the first integration milestone and reforecast capacity explicitly.

### Outcome and scope freeze

Deliver an invite-only Newsk pilot on the shared Harvy foundation: sign in, select an approved monitor/source, inspect incoming news/events, filter by source/time/keyword, open attributed evidence, save a story with notes/status, and produce a source-linked shift brief. Reuse shared records to demonstrate one Civic or Tower context relationship. The interface must distinguish live observations, historical records, stale data, empty results, partial runs, and failures.

User-confirmed target: **adopt at least 50% of the full legacy catalog**, not 50% of a smaller MVP shortlist. This is a stretch delivery target whose feasibility depends on today's deduplication, provider access, and adapter-reuse audit. The five-day plan is not a guarantee that unknown, unlicensed, or inaccessible integrations can be made operational.

The customer experience remains small while connector work expands through common adapters. Do not attempt four complete products, a new ontology platform, open signup/billing, a customer workflow builder, broad historical backfills, or a full database migration in this sprint.

Tower's business intelligence mode remains in scope after the Newsk vertical slice: market, competitor, sector, and risk watchlists use shared Ontoly/HQL evidence, with authorized operational handoffs into Ops. The concrete screen and component requirements are in UI_SPEC.md; do not collapse Tower into Ops.

### Define and freeze the full-catalog denominator

Observed local inputs on October 28:

| Input | Observed size | Interpretation |
|---|---|---|
| Workspace `CONNECTOR-CANDIDATES.md` | 147 entries / 146 distinct IDs | Contains a duplicate ID and three remaining SAM-family entries, which the user already excluded. Removing those leaves 143 distinct IDs in this input alone. Its older 149-ID header describes the upstream snapshot, not the current document. |
| `v2/catalog/connectors/upstream-manifest.json` | 108 entries | Overlaps the other lists and contains specifications/reference entries; not 108 verified implementations. |
| `v2/catalog/connector-scopes.json` | 99 streams, 53 requested scopes, 7 portals, 3 bulk entries, 2 named connectors, 11 references | Reconcile overlap, exclusions, and references before counting; do not add every category blindly. |
| Civic `shared/source-catalog.json` | 7 directory records | May be source definitions or seeds for existing adapters; classify and map explicitly. |

Developer B and Ops produce a single deduplicated ledger by Day 1 hour 2, with Developer A approving the mapping. Inspect the reference repositories for additional concrete connector definitions before freezing. Required fields: original repository/path/ID, canonical connector/source-scope ID, aliases, required scope, adapter family, product value, credentials/access status, exclusion reason, owner, estimate, status, evidence run IDs, and last verification time. Record the roster revision.

Let `N` be all distinct in-scope legacy connector/source-scope definitions and `T = ceil(N / 2)`. Duplicate aliases, non-connector documentation, and the user's expressly excluded sources are removed with an auditable mapping. Access-blocked or difficult sources stay in N. Do not shrink N because a provider is unavailable. Distinct legacy scopes may share one adapter but each counted scope needs its own evidence; also report the number of reusable adapter implementations separately. A provider adapter, its workflow, and its feed URLs cannot be counted as three connectors. New sources discovered after roster freeze are reported separately.

For orientation only: 143 entries would require 72 adopted connectors. That is not the combined-catalog target; N may be larger or smaller after cross-repository reconciliation. Report both the live numerator and denominator on the demo slide, with the roster revision and explicit verification scope. Never substitute registered/configured counts for adoption.

### Adoption acceptance and throughput gate

Track `inventoried → mapped → runnable → live_verified → adopted`, plus explicit blocked/failed states. Count a connector as adopted only when all apply:

- A real bounded provider response passes through the VPS n8n Automation workflow using the required approved proxy path and Spider where crawling applies; access/terms/configuration are recorded.
- Outputs validate against the shared schema with source IDs, HarvyDex identity, provenance, time, scope, and raw/processed artifact references, and are visible through the authorized query path/UI.
- Two successful bounded runs, including a scheduled run where supported, show correct retry/deduplication behavior. Empty valid responses may pass only if the request scope and response are verified; simulated payloads are separately labeled fixtures and never count as live verification.
- The shared adapter's failure/retry/invalid-input checks apply to this configuration, and source-specific field mapping, completeness, and limits receive a review. A partial run cannot satisfy scope completion.
- Health/freshness, pause/disable, and recovery ownership exist; Ops records evidence and another developer accepts the mapping.

Baseline live adoption is **not yet audited**. At the hour-2 roster freeze, publish T, available approved credentials, and counts by reusable family. At end of Day 1 measure the first adapter's actual configuration/review time and project remaining work. The target is credible only if the remaining estimate fits the allocated hours and at least T sources have viable access paths. If not, escalate that day with a quantified requirement for more connector engineers/provider access or a changed deadline. Preserve the user's 50% target as unmet; do not redefine it as catalog import or silently reduce the denominator.

Plan against 120 developer-hours and 40 Ops-hours. Allocate approximately 20 developer-hours to API/identity/data basics, 18 to UI, 22 to adapter/ingestion foundations, 20 to bulk source configuration, 20 to verification/integration, and 20 to contingency. This assumes adapter reuse works. For T=72, the 40 configuration/verification hours allow about 33 minutes per connector on average, which rules out dozens of bespoke integrations. These are budget constraints for the feasibility gate, not effort estimates proven by the repository.

### Architecture that fits the deadline

- Production topology is Cloudflare for the web/auth/API Workers and R2, PostgreSQL on the user's database server through Hyperdrive, and the separate VPS n8n system for connector execution. The current V2 code and configs still use D1 and no production PostgreSQL/Hyperdrive connection exists; port auth/API and migrations before deploying those Workers. The user-facing domain is `harvy.dev`. Verify tenant/workspace isolation before external invitations.
- Better Auth is ported locally and resolves verified organization membership; basic role capabilities, explicit product entitlements, Harvy-admin-only grant management, and grant audit records are implemented locally. Live grant provisioning, revocation tests, and production auth routing remain pending.
- The bounded HQL subset maps registered event/evidence fields and product scope to the installed Drizzle Cube 0.12.2 semantic layer. Search/time/source/status filters, stable event pagination, bounded dashboard/saved-view validation, and audited private/workspace dashboard CRUD are implemented; OpenAPI generation and broader query grammar remain pending. Customer data export is prohibited, not a deferred feature. One cube registry (`v2/shared/cubes.ts`) now feeds both engines: Events stays on Postgres, Evidence is engine-marked `basin` and compiled by `v2/api/basin-compiler.ts` — UNVERIFIED against live Basin (no Basin Catalog on harvy-production/harvy-public/harvy-raw as of 2026-10-30; unit-tested against generated SQL only, fails closed 503 until BASIN_ACCOUNT_ID/BASIN_BUCKET/BASIN_SQL_TOKEN are set).
- Raw/processed manifests are validated and scoped in the local API path, which checks R2 object size before publication. The two R2 bindings are not configured here; Basin/Parquet, streaming customer uploads, video, relation graphs, forecasting, and bulk archives remain pending. The workspace event radar (Map surface on non-Ops products, OpenFreeMap light/dark basemap, heatmap density over source-provided coordinates only) is implemented locally with migration 0009 geometry columns; actual browser tile verification is pending because local sign-in and the deployed harvy-api are not yet available.
- Use the user's VPS-hosted n8n as the Automation execution runtime, following the n8n standard in DEVELOPMENT.md. One schedule owner per monitor. Fixed n8n workflows receive Harvy's validated bounded run envelope, execute Spider/Webshare or registered API requests, normalize results, and store artifacts; they do not create unregistered targets or bypass Harvy authorization. Do not introduce a competing scheduler for the same job.
- One AI provider/model route and one optional source-grounded briefing action are enough. Apply budgets, schema validation, tool restrictions, and citations. If AI blocks completion, ship an extractive source-linked brief and label it accurately. Full multi-provider routing, autonomous agents, broad MCP/CLI rollout, and optimizer installation experiments wait until after the core works.

### User-directed launch decisions

- Prioritize one approved, bounded real collection through the existing n8n workflow, then analyze and sift the captured observations. Preserve source evidence and provenance; finalize cross-source identity, merge, duplicate, contradiction, and correction rules only after representative data has been reviewed. Replay idempotency is still required from the first run.
- Customer source/derived records are view-only in Harvy: no download/export UI, endpoint, CLI/MCP result dump, or direct R2 object handle. Scoped query responses remain available only as needed to render authorized in-app views.
- Run recovery: retry an ambiguous submission with the same idempotency key/run; n8n must deduplicate by run ID. n8n owns at most one bounded retry per transient provider 429/5xx/network error, honoring `Retry-After` within the 300-second run deadline; permanent auth/policy/schema/4xx errors are not retried. Terminal failed/partial runs are immutable. An explicit retry creates a new run linked to its predecessor, uses the same source snapshot only while that source revision remains approved and enabled, and consumes normal quota. Do not expose run cancellation until the existing workflow has a verified cancel-and-acknowledge contract. The local API now leaves ambiguous transport failures queued as `dispatch_unconfirmed` and supports same-key redispatch after the lease; live n8n deduplication/provider retry and the linked terminal-retry action remain unverified or unimplemented.
- PostgreSQL on the user's database server via Hyperdrive is the intended launch operational store. D1 is local/test-only; the current D1-bound auth/API code must be ported before production deployment. The database endpoint and Hyperdrive config remain unprovisioned.

The hackathon narrows capabilities; it does not waive tenant isolation, credentials hygiene, required source/proxy access, truthful run status, bounded resource use, or independent review. Manual evidence can temporarily replace unbuilt automation checks, recorded as such. An unavailable required security check or failing isolation blocks customer release.

### Connector factory and batch ordering

Build reusable families, then configure sources from the frozen ledger. Prioritize reusable CourtListener bulk, Media Cloud/SocketNews API, and Spider-backed public-page adapters; extend to weather and other approved JSON/GeoJSON, CKAN, Socrata, and bounded CSV/NDJSON sources. This adapter work order does not replace the first-run gate below. Survey actual family counts and avoid building an adapter unless it unlocks enough ledger entries to justify it. Fixed n8n nodes must use registered source configuration and cannot bypass Webshare preflight, provenance, or tenant checks. RSS is excluded from the Newsk path.

First collect one bounded request from an already approved source through the existing VPS n8n workflow; select the source that is actually configured and authorized, and analyze its returned observations before broadening collection. Do not create a replacement workflow or start bulk history before proxy preflight, artifact publication, signed callbacks, and replay behavior pass. After this vertical path passes, prioritize CourtListener bulk ingestion, then news, then weather; see repository issues #28, #20, and #29. No provider is counted as verified from this plan. Facebook, X, Reddit, YouTube, and other gated services retain their ledger rows; they advance only when access, allowed use, quota, and source-specific behavior are settled. Do not add RSS as a Newsk dependency.

Share one input/output envelope, idempotency implementation, artifact writer, validation suite, run/health registry, and error taxonomy. Ops can prepare and verify config fixtures; Developer B reviews mappings and code. Developer A takes a second family after the core boundary works; Developer C contributes to batch acceptance after the UI slice works. Bespoke or uncertain adapters get a two-hour investigation ceiling before being recorded blocked and the next accessible family is attempted.

### Five-day milestones

| Day | Developers | Ops/support | Exit evidence |
|---|---|---|---|
| 1 — Wed Oct 28 | Freeze contracts/roster, establish Harvy API→Automation job boundary with n8n coordinating scheduled jobs, deliver one real source through API to UI; second source if the path is stable. | Inventory installed n8n/access, reconcile sources, define demo use case, prepare QA ledger. | Frozen N/T, one end-to-end source, scope-denial check, restart/retry evidence, measured throughput and blocker forecast. |
| 2 — Thu Oct 29 | Finish minimum auth/query/story workflow; implement the highest-yield remaining adapter families and run config batches. | Validate field mappings and source links, gather source access, perform acceptance cases with two test tenants. | Working monitored-source desk; adopted count at least `ceil(0.30 × T)` as a stretch progress gate. |
| 3 — Fri Oct 30 | Finish candidate batches, saved story/briefing, first hardening pass; one Parquet analytical slice only if core is green. | Review source evidence, freshness, run failures, and onboarding/help content. | At least `ceil(0.70 × T)` adopted; remaining required sources runnable with access resolved. |
| 4 — Sat Oct 31 | Reach T adopted, freeze new feature work, fix recovery/permissions/performance defects and rehearse rollback. | Schedule monitoring/soak checks, independently audit adoption count, run demo/support rehearsal. | T adopted with evidence; stable demo route; no unresolved tenant/security/data-loss blocker. |
| 5 — Sun Nov 1 | Verify final revision, fix release blockers, deploy only under recorded authorization, preserve reproducible demo evidence. | Onboarding/demo script, FAQs, known limitations, feedback capture, roster/evidence report. | Invite-only MVP and an honest `adopted/N` report. If below T, record missed target and exact remaining blockers. |

The numerical progress gates are forecasts, not claims of completion. Missing one triggers an immediate staffing/access/scope conversation; the team does not spend Day 5 discovering a known shortfall. No new feature branches after Day 4 kickoff unless they remove a release blocker.

### Day 1 assignments — today

| Owner | Primary work and owned files | End-of-day deliverable |
|---|---|---|
| Developer A — technical lead / platform | Own `v2/shared/`, the new `v2/api/` Worker, auth integration, migrations, minimal HQL, and CI/lint setup. Freeze the first schemas; all schema changes go through A. | Authenticated source/run/query endpoints using a trusted tenant context, a denied cross-tenant case, idempotent run registration, and runnable checks for changed modules. |
| Developer B — Automation / ingestion | Own connector adapters, Automation executor, and reviewed n8n exports under `v2/workflows/`. Pair with Ops for the catalog audit. | One approved source adapter and real source run, raw/processed manifests, proxy proof, bounded failure handling, plus measured bulk-adoption throughput. |
| Developer C — product / UI | Own the Newsk screen and shared UI integration. Build against the frozen synthetic contract first, then switch to the real API. | Sign-in flow plus source/monitor list, result list, evidence drawer, freshness/error states, and source/time filter. Fixture mode is visibly marked until live integration. |
| Ops / sales / support / junior engineer | Own source ledger, credentials availability by reference, n8n inventory/backup checklist, acceptance evidence, customer story, and issues. Escalate provider/admin changes to the responsible developer. | Deduplicated roster with blocker status, a five-step customer demo, acceptance notes, and three prioritized feedback questions. Draft outreach only; send when authorized. |

Use one worktree per developer. Ops edits the roster/task notes and supplies changes via their own branch or through the integrator; never share concurrent writers on the same checkout. Review rotation: A reviews B, B reviews C, C reviews A; core/auth changes still receive a relevant qualified reviewer. Record actual names at kickoff.

| Elapsed time | Team action and handoff |
|---|---|
| 0:00–0:30 | Kickoff: agree demo user/problem, confirm four-person capacity, establish OpenChamber task links, review current Git state, assign ownership, inspect available environment. |
| 0:30–2:00 | A freezes scope/run/artifact/HQL/error schemas and endpoint stubs; B+Ops reconcile the full catalog and inspect n8n/version/credentials/backup; C builds the shell against a synthetic contract. Publish N/T and access-blocked counts at hour 2. |
| 2:00–4:00 | A implements scoped API/run persistence and a minimal permission check; B adapts the existing orchestration pattern to submit one bounded Automation job with Spider/Webshare preflight; C wires result/evidence UI; Ops checks source terms, attribution, and fixture mappings. |
| 4:00–4:30 | First integration checkpoint: real source → Automation → raw/processed artifacts → authorized query → UI. Pair on the broken seam immediately. If it is not working, pause connector breadth until it is. |
| 4:30–6:00 | B repeats the run, checks deduplication, and attempts the second source through the same adapter family; A verifies tenant denial and errors; C completes empty/stale/failure states; Ops captures evidence and tries the customer path without coaching. |
| 6:00–7:00 | Independent reviews, applicable lint/type/tests, failure simulation, callback/authentication check, n8n pause/recovery check, and updated adoption effort estimate. Preserve an hour for unexpected integration failures. |
| 7:00–8:00 | Demo the actual path, record PASS/FAIL/BLOCKED for each acceptance item, merge only reviewed passing work, and assign tomorrow's adapter batches. Publish target forecast and unblock decisions before everyone leaves. |

Day 1 minimum acceptance: one real source observable in Newsk with its source URL/time, one raw and one normalized artifact, one stable logical run across a retry, no duplicate entity on replay, a failed request visibly failed, and a proven unauthorized tenant denial. n8n's green execution alone is insufficient. If auth/isolation cannot be proven today, continue in a controlled internal demo environment and do not invite customer tenants.

### Decisions and blockers requiring explicit tracking

- **Full catalog scope:** the user requires 50%, but the denominator is not yet trustworthy. `docs/CONNECTOR-CANDIDATES.md` currently has 147 entries/146 unique IDs (one duplicate and three unexplained numbering gaps); its cited source revision returned 404 on 2026-10-29. The two accessible reference snapshots contain 108 upstream connector IDs and 99 stream IDs; exact normalized overlaps are 65 (candidate/upstream), 95 (upstream/streams), and 62 (candidate/streams), yielding 193 raw IDs across those three sets before policy exclusions or semantic alias review. The separate Civic catalog has seven source instances; requested scopes, portals, and reference pages are different counting units. Three SAM.gov candidate IDs were excluded by policy; the exclusion was lifted by direct user directive on 2026-10-30 (see AGENTS.md and v2/catalog/reference/official-sources-ledger.json n=15). No canonical N/T or adopted connector count is claimed until those units and missing source records are reconciled; do not use the earlier proposed 6-of-12 target.
- **Installed n8n:** reported by the user, not inspected live in this planning session. Ops must record URL, hosting method, version, edition, active workflows, credential names, persistence, and schedule ownership.
- **Automation/Spider/Webshare:** verify credentials and each applicable egress path early. If inaccessible or incompatible, source adoption is blocked; no silent bypass.
- **Frontend/auth state:** repository source is not proof that the hosted routes work. Verify in the first integration checkpoint.
- **Coordination:** implementation is tracked in the existing OpenChamber todo. No external issue, outreach, installation, deployment, remote migration, or workflow activation is claimed.
- **Deadline risk:** full-catalog 50% and a usable SaaS in five days is conditional on configuration reuse and available provider access. If the audit exposes mostly bespoke or gated connectors, additional connector engineering or a revised deadline is necessary; no claim of guaranteed delivery is justified.

### Missing Day 1 gates found in the repo audit

These checks precede the first end-to-end integration. Developer A owns the Harvy runtime seam; Developer B owns Automation/n8n; Ops records the outcome and escalation. They are critical-path work, not optional polish.

| Gate | Current evidence and required decision | Deadline |
|---|---|---|
| Real execution route | A local `v2/api/` Worker registers bounded runs, dispatches to the VPS n8n production webhook using a configured bearer secret, and accepts signed status/publication callbacks. The n8n webhook/workflow is not connected or inspected live; do not count these local routes as execution evidence. | Hour 2 contract; hour 4 live path |
| Hosted app and database | The web/auth/API Workers target `harvy.dev`; prior `harvy` and `harvy-auth` deployments exist, but `harvy-api` does not. Routes are unverified. Auth/API configs still bind a missing D1 database; no Hyperdrive connection to the user's PostgreSQL server exists. `harvy-artifacts` is missing; the VPS n8n webhook is unverified. Do not claim a working hosted app until database, routes, secrets, and callback origins are verified. | Deployment blocked on database adapter/connection and live resource checks |
| Tenant scope in old records | `0006_ontology_and_dashboards.sql` still gives legacy observations/links an `environment_id` default of `shared`, while legacy `harvy_objects` has no tenant scope. New product tables in `0007_harvy_product_core.sql` use explicit tenant/workspace/product scope; a local SQLite test rejects cross-tenant/product evidence links. The migration is unapplied and no two-live-tenant API/Worker test exists. Private pilot remains blocked until isolation is verified. | Hour 4 first check; Day 2 release gate |
| n8n state and license | User reports an installed instance; version, active workflows, backup, key, edition, and job ownership are unverified. Its license permits company-controlled backend workflows, but customers configuring workflow logic could require a commercial license. Confirm the chosen fixed-workflow/validated-parameter pattern and record the result. | Hour 2 |
| Source and egress | Spider/Webshare credentials, the approved proxy path at both Automation-to-Spider and Spider-to-target layers, provider scopes, and quotas are not verified. Test on one approved bounded source before launching the connector batch. | Hour 3 |
| Release evidence | `npm run check:local` now includes main/API/auth/client typechecks, tests, and the web build. Unified lint/preflight, deployed-route verification, two-tenant live checks, and n8n recovery tests remain absent. Keep a known-good local build and recovery steps; no invitation until live permission, failed-ingest, retry, and stale-data scenarios pass. | Hour 6 local; Day 4 hosted rehearsal |

At hour 3, if the required credentials or live deployment path are absent, continue building with labeled fixtures and an isolated local environment. Do not call fixture-backed UI a live pilot or count its connector entries. Give the team a concrete unblock owner and time estimate. A real source response is needed before a live-data demo claim.

### Startup outcome alongside the connector target

The first buyer hypothesis is a small or midsize newsroom/editorial desk that must notice a developing local story, verify source claims, and hand off an attributed brief. It is a hypothesis until a newsroom confirms the workflow. Newsk is the first customer-facing wedge; Ontoly, Tower, Ops, and Civic supply shared capability and evidence, not four separate go-to-market messages this week.

At kickoff, the founder and Ops choose one beat/geography and one named decision maker or editor role. Record their current workflow, sources, alert volume, time spent verifying, and what would make them use or pay for Harvy. With authorization for outreach, arrange at least two short discovery/demo sessions by Day 3 and seek three concrete reactions by Day 5. Ops drafts the invitation and records notes; the founder or designated sales owner runs the conversations. No external message is sent merely because it appears in this plan.

Customer success for the five-day pilot is observable: an editor can find one relevant developing story, inspect at least two attributable sources, save an evidence-backed brief, and complete the handoff with less manual searching than their current process. Record time-to-first-useful-story, false or irrelevant alerts, source freshness, evidence-link failures, and whether the editor requests another session. If possible, ask for a pilot commitment with a stated price range and scope, without presenting an unvalidated price as fact.

Track a separate provider-economics sheet: per-source requests, Spider/proxy usage, VPS n8n runtime, storage and AI calls, median and worst observed latency, and expected pilot volume. A connector can pass technical adoption and still be too expensive or slow for the first customer. Cap pilot use before enabling broad schedules. Provide a visible source coverage statement and support contact; do not imply complete news coverage.

The demo has a primary live route and a clearly labeled fallback using a timestamped, previously captured real source artifact from a successful run. The fallback demonstrates UI behavior without claiming current ingestion. Present current limitations, support ownership, coverage, and reproducible setup in the demo UI; do not provide downloadable customer records or evidence payloads. Keep provider credentials, private source records, and unreviewed AI claims out of sales material.

At the end of Day 1, report three separate statuses: (1) the customer workflow's end-to-end readiness, (2) connector adoption `adopted/N` and feasibility forecast, and (3) commercial signal from conversations or pending outreach. A high connector count cannot substitute for an editor finding the product useful. If the catalog target competes with the working customer path, escalate the resource conflict explicitly while preserving the user's 50% requirement in the report.

## Canonical layout

- V2 source, Workers, connectors, migrations, and Wrangler configs live under root `v2/`.
- Do not create or document a duplicate root tree. V2 source lives only under `v2/`.
- Keep existing Cloudflare resource identifiers unchanged unless a separately reviewed migration requires a rename.
- Repository docs are canonical. The retired notebook guides are no longer part of the active documentation set; inspect mirror destinations before syncing.

## Verified status (2026-10-29)

- Legacy excluded-source code in the checkout is not approved for enablement. The user's source exclusions override earlier onboarding plans.
- CourtListener bulk import is not implemented. Port targeted search into V2 before claiming that capability is available.
- No remote Workers, queues, VPS processes, or stored data were changed by the V2 conversion; reconcile any still-running external consumers separately before decommissioning them.
- Better Auth source and auth migrations exist under `v2/auth/` and `v2/migrations/`; isolated auth/client typechecks pass locally. Browser sessions require active organization membership and create a default workspace. Unknown membership roles fail closed. A `HARVY_ADMIN_USER_IDS` allowlist can manage product grants; its API-key path is limited to entitlement management when the administrator is not a tenant member. Prior `harvy` and `harvy-auth` Workers have deployments in Cloudflare; `harvy-api` has none, and route attachment and database behavior remain unverified.
- The reference checkout's `0006_ontology_and_dashboards.sql` is a migration candidate, not a schema in this clean repository or a remotely applied migration.
- The target R2 layout has three buckets: `harvy-raw` for source captures, `harvy-artifacts` for validated/normalized records, and a separate Basin catalog bucket for catalog-managed analytical tables. The account has `harvy-raw`; `harvy-artifacts` is missing and the Basin bucket name/bindings require confirmation. The configured `harvy-platform-v2` D1 database is missing remotely and is not the production database target.
- The 75% cache-hit target applies only to eligible public responses and has not been measured on a representative workload.

## Consolidated sprint track (2026-10-30)

Integrator track for the main checkout (replaces two plan sessions that hit a usage limit). Local gates pass: `typecheck`, `typecheck:api`, `npm test` 67/67, `build`, `git diff --check`.

Commit gates landed in the single gated local commit:

- `v2/web/src/Workspace.tsx`: the event scope key now includes user id and active organization, and `onUser` invalidates `eventGuard` on identity switch, so in-flight responses from a previous principal cannot land (filter races were already token-covered).
- `v2/tests/migrations.test.mjs`: real SQLite (`node:sqlite`) round-trip for the pair-safe coordinate upsert in `v2/api/worker.ts` — a null coordinate pair never erases a stored pair and a complete new pair replaces it atomically; also covers the migration 0009 `latitude`/`longitude` columns.
- `v2/web/src/InvestigationsDesk.tsx`: `reload` now uses the same `EventRequestGuard` stale-guard pattern as the workspace event feed.
- `v2/web/src/RadarMap.tsx`: empty-map copy no longer claims the event data contract lacks locations (migration 0009 added optional geometry).

Release blockers — documented as unverified, NOT blocking the local commit, never claimed done: P0 `v2/auth/worker.ts:28-149` reads `env.HARVY_D1` while `v2/auth/wrangler.jsonc:18-23` declares only `HYPERDRIVE_PRIVATE`; P1 `v2/shared/sql-database.ts:136-187` shared PgClient `batch` BEGIN/COMMIT interleave risk with no concurrency test. Also pending: Hyperdrive live connection, R2 bindings, hosted routes, `harvy-api` deploy, live n8n, two-tenant isolation, browser tile evidence, cache-rate measurement.

Dependency order: (a) commit gates above; (b) honest PG/auth migration status (this section plus the Work sequence item 8); (c) ONE gated local commit with gates green, `.cortexkit/` left untracked, no push/deploy — a commit gate is not a release gate; (d) production readiness after the commit; (e) then ONE bounded existing-n8n source run before any connector breadth. The auth/PG port is not sequenced behind map polish.

## Work sequence

1. [x] **Complete the V2-only conversion.** V2 remains under `/v2/`. Build and surviving tests/typechecks passed locally.
2. **Add V2 application routes.** Local API/auth Workers exist with scoped API tests and a built Newsk/Ops shell; prior web/auth deployments exist, but the API Worker does not. `harvy.dev` route attachment, external bindings, database behavior, and live end-to-end behavior remain unverified; do not claim them available.
3. **Reconcile excluded legacy connectors.** Inventory remaining code, scripts, and any remote consumers without enabling them; remove or retire them only with preserved work and an explicit remote decommission plan where needed.
4. **Add approved V2 connectors.** Implement scoped Facebook Page monitoring only through authorized platform access and port targeted CourtListener REST search under `v2/`; preserve access limits, provenance, completeness signals, and bounded tests. Do not assume generic profile/group collection is available.
5. **Implement CourtListener bulk import.** Stream `.csv.bz2` snapshots, validate schema and counts, checkpoint resumably, filter the agreed 2023-01-01–2026-09-30 filing window, and write raw/normalized outputs to the separate R2 buckets. Benchmark on the authorized VPS before a full run; use Basin only for historical analytics.
6. **Finish approved connector onboarding.** Prioritize the Newsk shortlist and enable only sources passing source-specific access, Spider/Webshare, schema, and bounded validation gates. Excluded sources remain excluded.
7. **Measure caching.** Instrument eligible public endpoints, separate cacheable from private/scoped responses, and pursue the 75% target only after measuring a representative workload.
8. **Complete the database/auth cutover deliberately.** Port D1-bound auth/API persistence to the user's PostgreSQL server through Hyperdrive, verify the `harvy.dev` origins and bindings, back up any existing data, and test recovery and consent behavior. Deployment to `harvy.dev` is authorized; remote migrations still require explicit approval.

## Contradiction audit

- V2 implementations and configs are under `v2/`. Do not document a second root or a root Worker.
- `harvy-raw` / `harvy-artifacts` are the required logical buckets. The API config binds both, but account inventory shows only `harvy-raw`; `harvy-artifacts` and the Basin catalog bucket remain unprovisioned/unverified.
- Auth migrations live under `v2/migrations/`. Wrangler confirms the configured `harvy-platform-v2` D1 database is missing; no Hyperdrive config or PostgreSQL connection is present.
- The legacy supervisor is outside the target architecture. A local `v2/api/` Worker exists and has bounded tests, but has no verified live route or connection to the VPS n8n webhook.
- Facebook and CourtListener functionality has no complete V2 equivalent. Those ports are explicit work items above, not capabilities to assume from the catalog.
- The Obsidian plan mirror at `/Users/pen/Documents/Notes/harvy/Planning/PLAN.md` is generated by `npm run sync:vault-guides` from this canonical plan.

## Operating constraints

- Use Spider Unlimited by default; do not switch to metered endpoints without explicit authorization. Serialize AI Studio calls to the account limit and bound each run.
- Keep credentials in environment variables or Cloudflare Secrets Store. Never put secret values in source, docs, notebooks, logs, or command arguments.
- PostgreSQL on the user's database server through Hyperdrive is the intended launch operational store. The current D1-only application adapter, schema migrations, database endpoint, and Hyperdrive config must be completed before API/Auth deployment. R2 retains raw and normalized artifacts, and Basin handles historical analytics. Preserve attribution and evidence; a name match is not a verified identity.
- Reconcile any VPS or other external consumer before changing its remote queue or service; preserve queued work and do not delete remote resources as part of local cleanup.
- Do not deploy, run remote migrations, or alter provider settings without explicit authorization. A local test or health response is not proof of collection completeness.

## Engineering foundation adoption (2026-10-28)

Canonical specification: [engineering standard](DEVELOPMENT.md). The documentation, agent instructions, submission entry point, PR template, feature issue fields, and EditorConfig are authored locally. Runtime enforcement remains incomplete. OpenChamber tracks this implementation as an unfinished project todo; no Obsidian mirror sync was performed, so reconcile that mirror before release.

| Sequence | Deliverable | Acceptance evidence | State |
|---|---|---|---|
| 1 | Repo ownership and protected submissions | Real CODEOWNERS, verified branch rules, trusted required checks, fork isolation, and OpenChamber task linkage | Pending |
| 2 | Pin tooling and establish lint/preflight | Shared check definitions, ESLint/Prettier/Ruff/type tooling, docs checks, nonzero missing-gate behavior, CI using the same commands | Pending |
| 3 | Canonical schemas/config and component catalog | Versioned schemas; generated TS/Python consumers; no duplicated universal variables; manifest validation | Pending |
| 4 | PostgreSQL core and tenancy migration | Port D1-bound auth/API to the user's server-hosted PostgreSQL through Hyperdrive; schema constraints, scoped roles/RLS, Better Auth mapping, backup/recovery rehearsal, pooled-connection isolation checks | Pre-launch blocker |
| 5 | Unified authorization and feature evaluation | Better Auth membership and product grants are checked in local API/HQL/actions; revocation and CLI/MCP/jobs/cache enforcement remain; product data export is prohibited | Partial |
| 6 | API/OpenAPI/HQL contracts | Local bounded API routes and HQL→Drizzle Cube adapter; operation registry, generated OpenAPI/clients, compatibility gates remain | Partial |
| 7 | Artifact lifecycle and streaming uploads | Local raw/processed manifests, scoped publication, and R2 head/size checks; multipart, quarantine, retention, and Basin lineage remain | Partial |
| 8 | Automation enforcement | Local signed dispatch/status/publication paths; Automation host, Spider/Webshare preflight, source gates, and live recovery remain | Partial |
| 9 | CLI and MCP adapters | Same domain policy as API, bounded tools, validated auth/scopes, consistent errors and command outputs | Pending |
| 10 | AI routing and agent policy | Allowed routes, task budgets, constrained tools, isolated memory, adversarial evaluations, action approval and stop controls | Pending |
| 11 | Token tool integration | Pinned licenses/versions; RTK/Headroom/Caveman/Ponytail profiles; preserved originals; measured quality/cost comparisons | Pending |
| 12 | Documentation discovery and mirrors | Generated public HTML/Markdown/schema indexes and llms.txt; no private content; verified task/doc mirror sync | Pending |

Implement in dependency order and use one bounded vertical slice before broad connector/product expansion. A suitable first slice is an approved feed through Automation, scoped raw/processed artifacts, one Ontoly type, authorized HQL/API output, and a shared UI view. No provider subscriptions, installations, production migrations, or deployments are authorized solely by this backlog.
