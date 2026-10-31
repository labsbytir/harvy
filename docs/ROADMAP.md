# Harvy roadmap

This is the single roadmap. It supersedes older plans and implementation notes; verified behavior must be separated from proposals.

## Terminology and user-directed operating rules (2026-10-30)

- Source integrations are called **workflows** in docs, UI, comments, and paths (`v2/connectors/` → `v2/workflows/`). "Connector" survives only as legacy wire/DB identifiers (`connector_id`, `src_<slug>`, `CONNECTOR_*.md` logs, `v2/catalog/connectors/` reference code) until a reviewed migration renames them. The n8n MCP endpoint is `https://n8n.harvy.dev`.
- Ingestion/collection never runs on Cloudflare Workers; all external collection runs in the VPS n8n runtime with mandatory Webshare proxy egress and Spider Unlimited-only endpoints (`/unlimited/scrape`, `/unlimited/crawl`, `/unlimited/links`).
- Storage: PostgreSQL via Hyperdrive is the operational store; raw captures are JSON in R2 `harvy-raw`, finalized data in R2 `harvy-artifacts` (user-reported existing 2026-10-30; not verifiable from agent sessions). Basin writes are paused until further notice.
- All servers/workflows ship logs and traces to OpenObserve (`eu1-api.openobserve.ai`).
- Cloudflare is consent-only; never delete a Cloudflare resource. Per task: GitHub issue with goals, new branch (never `main`), documented close-out. `main` protection is enforced (required check `CI`, admins, no force-push — issue #31).
- n8n workflow standard enforced at creation/change: existing VPS workflows only, one scheduler + one retry owner, idempotency keys, signed callbacks, approved libraries only (deviations need explicit approval).

The full API/source inventories and workflow adoption sequence are in [CONNECTOR_PLAN.md](CONNECTOR_PLAN.md). Its four in-repo reference inputs include the OpenTIR source-by-source catalog and the prior Harvy/Civic manifests; candidate entries are not live integrations.

**System boundary:** Harvy is the single system and its ontology is shared across every use case. Ontoly is the product for the raw dataset. Civic, Tower, Ops, and Newsk are modes of the Harvy ontology, not separate systems, deployments, databases, or Cloudflare resource stacks. Cloudflare hosts the web/auth/API Workers and R2 on `harvy.dev`; PostgreSQL runs on the user's database server through Hyperdrive; the separate VPS n8n runtime executes approved workflow workflows, normalizes results, stores artifacts, and calls Harvy's signed endpoints.

Reusable implementation starters live outside this plan: [inactive n8n scrape JSON](../v2/workflows/scrape-v1.template.json), [n8n API calling pattern](../v2/workflows/README.md), [15-question MCP agent intake](../v2/workflows/N8N-MCP-INTAKE.md), and [shared UI frame](../v2/shared/ui/HarvyShell.tsx). The [engineering standard](DEVELOPMENT.md#19-database-object-storage-and-cloudflare-deployment-map) maps PostgreSQL, object storage, Cloudflare services, and tool slots. These artifacts are starters; they are not installed, connected, or deployed by inclusion in the repository.

The [UI and Drizzle Cube specification](UI_SPEC.md) defines the website, application shell, screen inventory, component contracts, persistence, and acceptance checks. The [copyable build-agent prompt](BUILD_AGENT_PROMPT.md) directs an agent to implement this plan in verified slices and run local checks as it builds. Both are subordinate to this single roadmap and neither establishes a deployed capability.

Local implementation now includes the authenticated API Worker, organization/workspace actor resolution through Better Auth, explicit Harvy-admin-managed product grants with revisioned audit records, tenant-scoped events/evidence/stories/dashboards/actions, bounded HQL→Drizzle Cube queries, hourly tenant run quotas with idempotent leased dispatch, and signed n8n status/publication callbacks. Tenant owners/admins can pause or resume only pre-approved monitors through revision-checked audited state updates; source drafting and approval remain unavailable. Raw/processed manifests are validated. Newsk has a newsroom/story/brief flow; Tower has saved source/time/keyword watchlists and Ops handoff; Civic has a scoped event view; Ops has an action queue. Event UUIDs are HarvyDex IDs; details show source observations and revision-checked self-assignment/status activity, but generic Ontoly links, source-claim correction history, teammate assignment, and duplicate/contradiction analysis remain unimplemented. DataBrowser, schema exploration, bounded global search, and a Harvy-admin-only metadata audit view use scoped APIs; it covers product grants, monitor state, and dashboard create/update/delete metadata without storing dashboard contents. Dashboard configs and saved filter views use distinct bounded schemas; owners may share read-only dashboards within their workspace, with revision-checked edits/deletes and audited visibility changes. Global search covers events, evidence text (without returning excerpts), stories, visible dashboards, and Ops actions. Cloudflare inventory review found prior `harvy` and `harvy-auth` deployments but no `harvy-api`; route attachments remain unverified. The configured D1 database is missing; the `HYPERDRIVE_PRIVATE` binding is now declared in both `v2/auth/wrangler.jsonc:18-23` and `v2/api/wrangler.jsonc:20-25`, but its remote provisioning and live connection remain unverified. `harvy-raw` exists but `harvy-artifacts` does not, and the n8n webhook/workflows, product grants, and approved sources remain unverified. Bounded source ingestion is verified for batch 1 on the fresh VPS n8n instance at `n8n.harvy.dev` (2026-10-30, after an instance reset that voided prior Basin/R2 feed history — earlier counts are historical evidence only): 6 active workflows (usgs-earthquakes, nws-alerts, fema_openfema, worldbank, blockchair, data-gov) with 46 verified manual executions and DB-level UNIQUE `event_id` dedupe indexes on every ingested table, but with only the first scheduled cycles verified so far (usgs +14 → 234, nws +113 → 316, dedupe holding; health bar: two real scheduled cycles per workflow); Basin stays paused (read-only verify only) and R2/PostgreSQL publication is blocked on credentials/network; full workflow adoption (approved path, UI/query visibility, independent review per source) is not claimed.

On 2026-10-28 the old supervisor/API, workflow deployment, hosting/infrastructure, intro/messaging/logging/support, OpenStates agent/workflow, upload Worker, Basin runbook, and duplicate planning guides were removed from the active repository tree. Git history preserves them. Current source of truth is this plan, [DEVELOPMENT.md](DEVELOPMENT.md), [UI_SPEC.md](UI_SPEC.md), [BUILD_AGENT_PROMPT.md](BUILD_AGENT_PROMPT.md), the retained Better Auth and legal/security references, and workflow source research. The separate docs/Obsidian mirrors were not changed by this local cleanup.

## Five-day hackathon: 2026-10-28 through 2026-11-01

This is the active delivery sequence for the hackathon; the long-term work sequence and foundation backlog below remain the post-MVP roadmap. Day 1 is Wednesday, October 28, in America/New_York. The schedule assumes five consecutive eight-hour workdays, including the weekend, three developers plus one ops/sales/support/junior-engineering teammate (four people). Use elapsed hours from today's actual kickoff; do not assume elapsed morning hours are still available. If fewer hours remain today, keep the first integration milestone and reforecast capacity explicitly.

### Outcome and scope freeze

Deliver an invite-only Newsk pilot on the shared Harvy foundation: sign in, select an approved monitor/source, inspect incoming news/events, filter by source/time/keyword, open attributed evidence, save a story with notes/status, and produce a source-linked shift brief. Reuse shared records to demonstrate one Civic or Tower context relationship. The interface must distinguish live observations, historical records, stale data, empty results, partial runs, and failures.

User-confirmed target: **adopt at least 50% of the full legacy catalog**, not 50% of a smaller MVP shortlist. This is a stretch delivery target whose feasibility depends on today's deduplication, provider access, and adapter-reuse audit. The five-day plan is not a guarantee that unknown, unlicensed, or inaccessible integrations can be made operational.

The customer experience remains small while workflow work expands through common adapters. Do not attempt four complete products, a new ontology platform, open signup/billing, a customer workflow builder, broad historical backfills, or a full database migration in this sprint.

Tower's business intelligence mode remains in scope after the Newsk vertical slice: market, competitor, sector, and risk watchlists use shared Ontoly/HQL evidence, with authorized operational handoffs into Ops. The concrete screen and component requirements are in UI_SPEC.md; do not collapse Tower into Ops.

### Define and freeze the full-catalog denominator

Observed local inputs on October 28:

| Input | Observed size | Interpretation |
|---|---|---|
| Workspace `CONNECTOR-CANDIDATES.md` | 147 entries / 146 distinct IDs | Contains a duplicate ID and three SAM-family entries whose policy exclusion was lifted by direct user directive on 2026-10-30 (AGENTS.md; `v2/catalog/reference/official-sources-ledger.json`); the earlier derived 143-distinct-ID figure (146 minus those three) no longer reflects current policy. Its older 149-ID header describes the upstream snapshot, not the current document. |
| `v2/catalog/connectors/upstream-manifest.json` | 108 entries | Overlaps the other lists and contains specifications/reference entries; not 108 verified implementations. |
| `v2/catalog/workflow-scopes.json` | 99 streams, 53 requested scopes, 7 portals, 3 bulk entries, 2 named workflows, 11 references | Reconcile overlap, exclusions, and references before counting; do not add every category blindly. |
| Civic `shared/source-catalog.json` | 7 directory records | May be source definitions or seeds for existing adapters; classify and map explicitly. |

Developer B and Ops produce a single deduplicated ledger by Day 1 hour 2, with Developer A approving the mapping. Inspect the reference repositories for additional concrete workflow definitions before freezing. Required fields: original repository/path/ID, canonical workflow/source-scope ID, aliases, required scope, adapter family, product value, credentials/access status, exclusion reason, owner, estimate, status, evidence run IDs, and last verification time. Record the roster revision.

Let `N` be all distinct in-scope legacy workflow/source-scope definitions and `T = ceil(N / 2)`. Duplicate aliases, non-workflow documentation, and the user's expressly excluded sources are removed with an auditable mapping. Access-blocked or difficult sources stay in N. Do not shrink N because a provider is unavailable. Distinct legacy scopes may share one adapter but each counted scope needs its own evidence; also report the number of reusable adapter implementations separately. A provider adapter, its workflow, and its feed URLs cannot be counted as three workflows. New sources discovered after roster freeze are reported separately.

For orientation only: 143 entries would require 72 adopted workflows. That is not the combined-catalog target; N may be larger or smaller after cross-repository reconciliation. Report both the live numerator and denominator on the demo slide, with the roster revision and explicit verification scope. Never substitute registered/configured counts for adoption.

**Frozen 2026-10-30, revision `2026-10-30.1`:** `v2/catalog/workflow-ledger.json` reconciles all four inputs and fixes **N = 158, T = 79**. The generator (`v2/scripts/build_workflow_ledger.mjs`) reproduces the 65/95/62 overlaps and the 193-ID union recorded above, then applies 20 declared semantic merges and the policy exclusions; the ledger holds 182 rows — 158 counted candidates, 13 reference-only, 7 Civic directory, 3 RSSHub rows excluded by policy, and 1 placeholder. Gated sources stay inside N as required, and the ledger separates 117 buildable rows, 17 needing an access decision, and 24 whose only inventoried path is the policy-excluded RSSHub route. Semantic merges still need reviewer sign-off, and numbers 61, 112, and 145 remain without a recorded disposition. `adopted/158` is now the only admissible adoption figure; the denominator does not shrink because a provider is unavailable.

### Adoption acceptance and throughput gate

Track `inventoried → mapped → runnable → live_verified → adopted`, plus explicit blocked/failed states. Count a workflow as adopted only when all apply:

- A real bounded provider response passes through the VPS n8n Automation workflow using the required approved proxy path and Spider where crawling applies; access/terms/configuration are recorded.
- Outputs validate against the shared schema with source IDs, HarvyDex identity, provenance, time, scope, and raw/processed artifact references, and are visible through the authorized query path/UI.
- Two successful bounded runs, including a scheduled run where supported, show correct retry/deduplication behavior. Empty valid responses may pass only if the request scope and response are verified; simulated payloads are separately labeled fixtures and never count as live verification.
- The shared adapter's failure/retry/invalid-input checks apply to this configuration, and source-specific field mapping, completeness, and limits receive a review. A partial run cannot satisfy scope completion.
- Health/freshness, pause/disable, and recovery ownership exist; Ops records evidence and another developer accepts the mapping.

Baseline live adoption is **not yet audited**. At the hour-2 roster freeze, publish T, available approved credentials, and counts by reusable family. At end of Day 1 measure the first adapter's actual configuration/review time and project remaining work. The target is credible only if the remaining estimate fits the allocated hours and at least T sources have viable access paths. If not, escalate that day with a quantified requirement for more workflow engineers/provider access or a changed deadline. Preserve the user's 50% target as unmet; do not redefine it as catalog import or silently reduce the denominator.

Plan against 120 developer-hours and 40 Ops-hours. Allocate approximately 20 developer-hours to API/identity/data basics, 18 to UI, 22 to adapter/ingestion foundations, 20 to bulk source configuration, 20 to verification/integration, and 20 to contingency. This assumes adapter reuse works. For T=72, the 40 configuration/verification hours allow about 33 minutes per workflow on average, which rules out dozens of bespoke integrations. These are budget constraints for the feasibility gate, not effort estimates proven by the repository.

### Architecture that fits the deadline

- Production topology is Cloudflare for the web/auth/API Workers and R2, PostgreSQL on the user's database server through Hyperdrive, and the separate VPS n8n system for workflow execution. The current V2 code is partially ported (the SQL layer runs PostgreSQL via `HYPERDRIVE_PRIVATE`, with a tested dedicated batch client), but the Better Auth adapter is still D1-bound (`v2/auth/auth.ts:199-208`) and no production PostgreSQL/Hyperdrive connection is verified; complete the adapter port and migrations before deploying those Workers. The user-facing domain is `harvy.dev`. Verify tenant/workspace isolation before external invitations.
- Better Auth is ported locally and resolves verified organization membership; basic role capabilities, explicit product entitlements, Harvy-admin-only grant management, and grant audit records are implemented locally. Live grant provisioning, revocation tests, and production auth routing remain pending.
- The bounded HQL subset maps registered event/evidence fields and product scope to the installed Drizzle Cube 0.12.2 semantic layer. Search/time/source/status filters, stable event pagination, bounded dashboard/saved-view validation, and audited private/workspace dashboard CRUD are implemented; OpenAPI generation and broader query grammar remain pending. Customer data export is prohibited, not a deferred feature. One cube registry (`v2/shared/cubes.ts`) now feeds both engines: Events stays on Postgres, Evidence is engine-marked `basin` and compiled by `v2/api/basin-compiler.ts` — UNVERIFIED against live Basin (no Basin Catalog on harvy-production/harvy-public/harvy-raw as of 2026-10-30; unit-tested against generated SQL only, fails closed 503 until BASIN_ACCOUNT_ID/BASIN_BUCKET/BASIN_SQL_TOKEN are set).
- Raw/processed manifests are validated and scoped in the local API path, which checks R2 object size before publication. The two R2 bindings are not configured here; Basin/Parquet, streaming customer uploads, video, relation graphs, forecasting, and bulk archives remain pending. The workspace event radar (Map surface on non-Ops products, OpenFreeMap light/dark basemap, heatmap density over source-provided coordinates only) is implemented locally with migration 0009 geometry columns; actual browser tile verification is pending because local sign-in and the deployed harvy-api are not yet available.
- Use the user's VPS-hosted n8n as the Automation execution runtime, following the n8n standard in DEVELOPMENT.md. One schedule owner per monitor. Fixed n8n workflows receive Harvy's validated bounded run envelope, execute Spider/Webshare or registered API requests, normalize results, and store artifacts; they do not create unregistered targets or bypass Harvy authorization. Do not introduce a competing scheduler for the same job.
- One AI provider/model route and one optional source-grounded briefing action are enough. Apply budgets, schema validation, tool restrictions, and citations. If AI blocks completion, ship an extractive source-linked brief and label it accurately. Full multi-provider routing, autonomous agents, broad MCP/CLI rollout, and optimizer installation experiments wait until after the core works.

### User-directed launch decisions

- Prioritize one approved, bounded real collection through the existing n8n workflow, then analyze and sift the captured observations. Preserve source evidence and provenance; finalize cross-source identity, merge, duplicate, contradiction, and correction rules only after representative data has been reviewed. Replay idempotency is still required from the first run.
- Customer source/derived records are view-only in Harvy: no download/export UI, endpoint, CLI/MCP result dump, or direct R2 object handle. Scoped query responses remain available only as needed to render authorized in-app views.
- Run recovery: retry an ambiguous submission with the same idempotency key/run; n8n must deduplicate by run ID. n8n owns at most one bounded retry per transient provider 429/5xx/network error, honoring `Retry-After` within the 300-second run deadline; permanent auth/policy/schema/4xx errors are not retried. Terminal failed/partial runs are immutable. An explicit retry creates a new run linked to its predecessor, uses the same source snapshot only while that source revision remains approved and enabled, and consumes normal quota. Do not expose run cancellation until the existing workflow has a verified cancel-and-acknowledge contract. The local API now leaves ambiguous transport failures queued as `dispatch_unconfirmed` and supports same-key redispatch after the lease; live n8n deduplication/provider retry and the linked terminal-retry action remain unverified or unimplemented.
- PostgreSQL on the user's database server via Hyperdrive is the intended launch operational store. D1 is local/test-only; the current D1-bound auth adapter must be ported before production deployment. The database endpoint and a provisioned Hyperdrive connection remain unverified.

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
| Developer B — Automation / ingestion | Own workflow adapters, Automation executor, and reviewed n8n exports under `v2/workflows/`. Pair with Ops for the catalog audit. | One approved source adapter and real source run, raw/processed manifests, proxy proof, bounded failure handling, plus measured bulk-adoption throughput. |
| Developer C — product / UI | Own the Newsk screen and shared UI integration. Build against the frozen synthetic contract first, then switch to the real API. | Sign-in flow plus source/monitor list, result list, evidence drawer, freshness/error states, and source/time filter. Fixture mode is visibly marked until live integration. |
| Ops / sales / support / junior engineer | Own source ledger, credentials availability by reference, n8n inventory/backup checklist, acceptance evidence, customer story, and issues. Escalate provider/admin changes to the responsible developer. | Deduplicated roster with blocker status, a five-step customer demo, acceptance notes, and three prioritized feedback questions. Draft outreach only; send when authorized. |

Use one worktree per developer. Ops edits the roster/task notes and supplies changes via their own branch or through the integrator; never share concurrent writers on the same checkout. Review rotation: A reviews B, B reviews C, C reviews A; core/auth changes still receive a relevant qualified reviewer. Record actual names at kickoff.

| Elapsed time | Team action and handoff |
|---|---|
| 0:00–0:30 | Kickoff: agree demo user/problem, confirm four-person capacity, establish OpenChamber task links, review current Git state, assign ownership, inspect available environment. |
| 0:30–2:00 | A freezes scope/run/artifact/HQL/error schemas and endpoint stubs; B+Ops reconcile the full catalog and inspect n8n/version/credentials/backup; C builds the shell against a synthetic contract. Publish N/T and access-blocked counts at hour 2. |
| 2:00–4:00 | A implements scoped API/run persistence and a minimal permission check; B adapts the existing orchestration pattern to submit one bounded Automation job with Spider/Webshare preflight; C wires result/evidence UI; Ops checks source terms, attribution, and fixture mappings. |
| 4:00–4:30 | First integration checkpoint: real source → Automation → raw/processed artifacts → authorized query → UI. Pair on the broken seam immediately. If it is not working, pause workflow breadth until it is. |
| 4:30–6:00 | B repeats the run, checks deduplication, and attempts the second source through the same adapter family; A verifies tenant denial and errors; C completes empty/stale/failure states; Ops captures evidence and tries the customer path without coaching. |
| 6:00–7:00 | Independent reviews, applicable lint/type/tests, failure simulation, callback/authentication check, n8n pause/recovery check, and updated adoption effort estimate. Preserve an hour for unexpected integration failures. |
| 7:00–8:00 | Demo the actual path, record PASS/FAIL/BLOCKED for each acceptance item, merge only reviewed passing work, and assign tomorrow's adapter batches. Publish target forecast and unblock decisions before everyone leaves. |

Day 1 minimum acceptance: one real source observable in Newsk with its source URL/time, one raw and one normalized artifact, one stable logical run across a retry, no duplicate entity on replay, a failed request visibly failed, and a proven unauthorized tenant denial. n8n's green execution alone is insufficient. If auth/isolation cannot be proven today, continue in a controlled internal demo environment and do not invite customer tenants.

### Decisions and blockers requiring explicit tracking

- **Full catalog scope:** the user requires 50%. The denominator is now **frozen at N = 158 / T = 79** by `v2/catalog/workflow-ledger.json` (revision `2026-10-30.1`, generated by `v2/scripts/build_workflow_ledger.mjs`, enforced by `v2/tests/workflow-ledger.test.mjs`). `docs/CONNECTOR-CANDIDATES.md` has 147 entries/146 unique IDs (one duplicate and three unexplained numbering gaps, numbers 61/112/145 still without a disposition); its cited source revision returned 404 on 2026-10-29. The two reference snapshots contain 108 upstream workflow IDs and 99 stream IDs; normalized overlaps are 65 (candidate/upstream), 95 (upstream/streams), and 62 (candidate/streams), giving the 193-ID union the freeze starts from. The 20 semantic merges and the exclusion set are declared per row in the ledger and still need reviewer sign-off. The separate Civic catalog has seven directory rows, requested scopes/portals/references are indexed as attributes and not counted, and the SAM.gov IDs are inside N after the 2026-10-30 directive (AGENTS.md; v2/catalog/reference/official-sources-ledger.json n=15). Do not use the earlier proposed 6-of-12 target, and do not restate the 143-entry orientation figure as a target.
- **Installed n8n:** reported by the user, not inspected live in this planning session. Ops must record URL, hosting method, version, edition, active workflows, credential names, persistence, and schedule ownership.
- **Automation/Spider/Webshare:** verify credentials and each applicable egress path early. If inaccessible or incompatible, source adoption is blocked; no silent bypass.
- **Frontend/auth state:** repository source is not proof that the hosted routes work. Verify in the first integration checkpoint.
- **Coordination:** implementation is tracked in the existing OpenChamber todo. No external issue, outreach, installation, deployment, remote migration, or workflow activation is claimed.
- **Deadline risk:** full-catalog 50% and a usable SaaS in five days is conditional on configuration reuse and available provider access. If the audit exposes mostly bespoke or gated workflows, additional workflow engineering or a revised deadline is necessary; no claim of guaranteed delivery is justified.

### Missing Day 1 gates found in the repo audit

These checks precede the first end-to-end integration. Developer A owns the Harvy runtime seam; Developer B owns Automation/n8n; Ops records the outcome and escalation. They are critical-path work, not optional polish.

| Gate | Current evidence and required decision | Deadline |
|---|---|---|
| Real execution route | A local `v2/api/` Worker registers bounded runs, dispatches to the VPS n8n production webhook using a configured bearer secret, and accepts signed status/publication callbacks. The n8n webhook/workflow is not connected or inspected live; do not count these local routes as execution evidence. | Hour 2 contract; hour 4 live path |
| Hosted app and database | The web/auth/API Workers target `harvy.dev`; prior `harvy` and `harvy-auth` deployments exist, but `harvy-api` does not. Routes are unverified. Auth/API configs declare a `HYPERDRIVE_PRIVATE` binding but no provisioned Hyperdrive connection to the user's PostgreSQL server is verified; code fallback paths still reference `HARVY_D1` (`v2/auth/worker.ts:5-7`, `v2/auth/auth.ts:199-208`). `harvy-artifacts` is missing; the VPS n8n webhook is unverified. Do not claim a working hosted app until database, routes, secrets, and callback origins are verified. | Deployment blocked on database adapter/connection and live resource checks |
| Tenant scope in old records | `0006_ontology_and_dashboards.sql` still gives legacy observations/links an `environment_id` default of `shared`, while legacy `harvy_objects` has no tenant scope. New product tables in `0007_harvy_product_core.sql` use explicit tenant/workspace/product scope; a local SQLite test rejects cross-tenant/product evidence links. The migration is unapplied and no two-live-tenant API/Worker test exists. Private pilot remains blocked until isolation is verified. | Hour 4 first check; Day 2 release gate |
| n8n state and license | User reports an installed instance; version, active workflows, backup, key, edition, and job ownership are unverified. Its license permits company-controlled backend workflows, but customers configuring workflow logic could require a commercial license. Confirm the chosen fixed-workflow/validated-parameter pattern and record the result. | Hour 2 |
| Source and egress | Spider/Webshare credentials, the approved proxy path at both Automation-to-Spider and Spider-to-target layers, provider scopes, and quotas are not verified. Test on one approved bounded source before launching the workflow batch. | Hour 3 |
| Release evidence | `npm run check:local` now includes main/API/auth/client typechecks, tests, and the web build. Unified lint/preflight, deployed-route verification, two-tenant live checks, and n8n recovery tests remain absent. Keep a known-good local build and recovery steps; no invitation until live permission, failed-ingest, retry, and stale-data scenarios pass. | Hour 6 local; Day 4 hosted rehearsal |

At hour 3, if the required credentials or live deployment path are absent, continue building with labeled fixtures and an isolated local environment. Do not call fixture-backed UI a live pilot or count its workflow entries. Give the team a concrete unblock owner and time estimate. A real source response is needed before a live-data demo claim.

### Startup outcome alongside the workflow target

The first buyer hypothesis is a small or midsize newsroom/editorial desk that must notice a developing local story, verify source claims, and hand off an attributed brief. It is a hypothesis until a newsroom confirms the workflow. Newsk is the first customer-facing wedge; Ontoly, Tower, Ops, and Civic supply shared capability and evidence, not four separate go-to-market messages this week.

At kickoff, the founder and Ops choose one beat/geography and one named decision maker or editor role. Record their current workflow, sources, alert volume, time spent verifying, and what would make them use or pay for Harvy. With authorization for outreach, arrange at least two short discovery/demo sessions by Day 3 and seek three concrete reactions by Day 5. Ops drafts the invitation and records notes; the founder or designated sales owner runs the conversations. No external message is sent merely because it appears in this plan.

Customer success for the five-day pilot is observable: an editor can find one relevant developing story, inspect at least two attributable sources, save an evidence-backed brief, and complete the handoff with less manual searching than their current process. Record time-to-first-useful-story, false or irrelevant alerts, source freshness, evidence-link failures, and whether the editor requests another session. If possible, ask for a pilot commitment with a stated price range and scope, without presenting an unvalidated price as fact.

Track a separate provider-economics sheet: per-source requests, Spider/proxy usage, VPS n8n runtime, storage and AI calls, median and worst observed latency, and expected pilot volume. A workflow can pass technical adoption and still be too expensive or slow for the first customer. Cap pilot use before enabling broad schedules. Provide a visible source coverage statement and support contact; do not imply complete news coverage.

The demo has a primary live route and a clearly labeled fallback using a timestamped, previously captured real source artifact from a successful run. The fallback demonstrates UI behavior without claiming current ingestion. Present current limitations, support ownership, coverage, and reproducible setup in the demo UI; do not provide downloadable customer records or evidence payloads. Keep provider credentials, private source records, and unreviewed AI claims out of sales material.

At the end of Day 1, report three separate statuses: (1) the customer workflow's end-to-end readiness, (2) workflow adoption `adopted/N` and feasibility forecast, and (3) commercial signal from conversations or pending outreach. A high workflow count cannot substitute for an editor finding the product useful. If the catalog target competes with the working customer path, escalate the resource conflict explicitly while preserving the user's 50% requirement in the report.

## Canonical layout

- V2 source, Workers, workflows, migrations, and Wrangler configs live under root `v2/`.
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

Release blockers — documented as unverified, NOT blocking the local commit, never claimed done (audited 2026-10-30 against HEAD 9d22091): former P1 `v2/shared/sql-database.ts` batch interleave is **resolved** — `v2/shared/sql-database.ts:160-187` runs each batch on a dedicated client (BEGIN/COMMIT/ROLLBACK) and `v2/tests/sql-database.test.mjs:63-86` proves an interleaved query cannot join the transaction. P0 persists in a new form: `v2/auth/worker.ts:5-7` resolves `HYPERDRIVE_PRIVATE` for SQL queries and both Wrangler configs declare the binding, but `v2/auth/auth.ts:199-208` installs a real Better Auth adapter only on the `HARVY_D1` path and otherwise returns `drizzleAdapter({} as any, { provider: "sqlite" })` with an empty handle — Better Auth on PostgreSQL is still invalid. Also pending: Hyperdrive live provisioning/connection, R2 bindings, hosted routes, `harvy-api` deploy, live n8n, two-tenant isolation, browser tile evidence, cache-rate measurement.

### Contradiction audit — 2026-10-30 (HEAD 9d22091)

Assertions in this plan were reconciled against code, tests, Wrangler configs, CI, and live queries:

- **Binding declared:** `v2/auth/wrangler.jsonc:18-23` and `v2/api/wrangler.jsonc:20-25` both declare `HYPERDRIVE_PRIVATE` (id `7160e37343ae4a0ba67e5b881342d99f`); earlier "no Hyperdrive config exists" text was stale and is corrected above.
- **Dedicated batch client tested:** `v2/shared/sql-database.ts:160-187` + `v2/tests/sql-database.test.mjs:63-86` (dedicated client, interleaved-query isolation test). The former interleave-risk blocker is closed.
- **Better Auth PostgreSQL adapter still invalid:** `v2/auth/auth.ts:199-208` (empty `drizzleAdapter` fallback when `HARVY_D1` is absent) despite the declared binding — the P0 defect recorded in governance todo `76ae3cd7-6158-4e93-8a0d-add0f2ba70ac`.
- **Deployment/remote provision unverified:** no deployed `harvy-api`; Hyperdrive provisioning/connection, hosted routes, `harvy-artifacts` bucket, and live n8n remain unverified. CI runs `npm ci` + `npm run check:local` (`.github/workflows/ci.yml:20-21`); GitHub `main` is unprotected with empty rulesets (verified via API 2026-10-30), so merge gates are governance-declared, not enforced.
- **SAM-count policy:** the 143-distinct figure subtracted three SAM-family entries under the exclusion lifted 2026-10-30; corrected in the table above and in the scope section.
- **Live-workflow blanket claims:** replaced with evidence-bounded counts (this plan, implementation summary); no full-adoption claim is made anywhere in this plan.

Dependency order: (a) commit gates above; (b) honest PG/auth migration status (this section plus the Work sequence item 8); (c) ONE gated local commit with gates green, `.cortexkit/` left untracked, no push/deploy — a commit gate is not a release gate; (d) production readiness after the commit; (e) then ONE bounded existing-n8n source run before any workflow breadth. The auth/PG port is not sequenced behind map polish.

## Work sequence

1. [x] **Complete the V2-only conversion.** V2 remains under `/v2/`. Build and surviving tests/typechecks passed locally.
2. **Add V2 application routes.** Local API/auth Workers exist with scoped API tests and a built Newsk/Ops shell; prior web/auth deployments exist, but the API Worker does not. `harvy.dev` route attachment, external bindings, database behavior, and live end-to-end behavior remain unverified; do not claim them available.
3. **Reconcile excluded legacy workflows.** Inventory remaining code, scripts, and any remote consumers without enabling them; remove or retire them only with preserved work and an explicit remote decommission plan where needed.
4. **Add approved V2 workflows.** Implement scoped Facebook Page monitoring only through authorized platform access and port targeted CourtListener REST search under `v2/`; preserve access limits, provenance, completeness signals, and bounded tests. Do not assume generic profile/group collection is available.
5. **Implement CourtListener bulk import.** Stream `.csv.bz2` snapshots, validate schema and counts, checkpoint resumably, filter the agreed 2023-01-01–2026-09-30 filing window, and write raw/normalized outputs to the separate R2 buckets. Benchmark on the authorized VPS before a full run; use Basin only for historical analytics.
6. **Finish approved workflow onboarding.** Prioritize the Newsk shortlist and enable only sources passing source-specific access, Spider/Webshare, schema, and bounded validation gates. Excluded sources remain excluded.
7. **Measure caching.** Instrument eligible public endpoints, separate cacheable from private/scoped responses, and pursue the 75% target only after measuring a representative workload.
8. **Complete the database/auth cutover deliberately.** Port D1-bound auth/API persistence to the user's PostgreSQL server through Hyperdrive, verify the `harvy.dev` origins and bindings, back up any existing data, and test recovery and consent behavior. Deployment to `harvy.dev` is authorized; remote migrations still require explicit approval.

## Contradiction audit

- V2 implementations and configs are under `v2/`. Do not document a second root or a root Worker.
- `harvy-raw` / `harvy-artifacts` are the required logical buckets. The API config binds both, but account inventory shows only `harvy-raw`; `harvy-artifacts` and the Basin catalog bucket remain unprovisioned/unverified.
- Auth migrations live under `v2/migrations/`. Wrangler confirms the configured `harvy-platform-v2` D1 database is missing; a `HYPERDRIVE_PRIVATE` binding is declared in both Wrangler configs (`v2/auth/wrangler.jsonc:18-23`, `v2/api/wrangler.jsonc:20-25`) but no provisioned Hyperdrive/PostgreSQL connection is verified.
- The legacy supervisor is outside the target architecture. A local `v2/api/` Worker exists and has bounded tests, but has no verified live route or connection to the VPS n8n webhook.
- Facebook and CourtListener functionality has no complete V2 equivalent. Those ports are explicit work items above, not capabilities to assume from the catalog.
- The Obsidian plan mirror at `/Users/pen/Documents/Notes/harvy/Planning/ROADMAP.md` is generated by `npm run sync:vault-guides` from this canonical plan.

## Operating constraints

- Use Spider Unlimited by default; do not switch to metered endpoints without explicit authorization. Serialize AI Studio calls to the account limit and bound each run.
- Keep credentials in environment variables or Cloudflare Secrets Store. Never put secret values in source, docs, notebooks, logs, or command arguments.
- PostgreSQL on the user's database server through Hyperdrive is the intended launch operational store. The Better Auth D1-only adapter (`v2/auth/auth.ts:199-208`), remote schema migrations, and a verified database endpoint/Hyperdrive connection must be completed before API/Auth deployment. R2 retains raw and normalized artifacts, and Basin handles historical analytics. Preserve attribution and evidence; a name match is not a verified identity.
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

Implement in dependency order and use one bounded vertical slice before broad workflow/product expansion. A suitable first slice is an approved feed through Automation, scoped raw/processed artifacts, one Ontoly type, authorized HQL/API output, and a shared UI view. No provider subscriptions, installations, production migrations, or deployments are authorized solely by this backlog.

## Appendix: architecture direction (merged from the former root HARVY-ARCHITECTURE.md, 2026-10-30)


This file records the user's authoritative direction for the Harvy SaaS integration. It takes precedence over architecture claims in source repositories when they conflict.

The detailed repository engineering standard is maintained in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md), with implementation/adoption tracked in the repository's [single roadmap](docs/ROADMAP.md). It defines repository/agent contribution rules, expandable source and database ownership, raw/processed/query artifacts, streaming uploads, universal configuration, secrets, API/HQL/CLI/OpenAPI/MCP, feature/tenant permissions, AI routing/safety, documentation discovery, and token optimization. OpenChamber is the mandated engineering coordination environment; Spider Cloud and Webshare preflight is mandatory before crawling. These are requirements; see the adoption status for enforcement that remains to be built.

## Product structure

- **Harvy** is the SaaS ecosystem.
- **Ontoly** is the shared, operational ontology at the foundation of every product and use case. It models real-world entities, properties, relationships, evidence, actions, functions, and governance.
- **Tower** is Harvy's global intelligence product, built on Ontoly.
- **Ops** is Harvy's business product, built on Ontoly.
- **Civic** is Harvy's civic product line, built on Ontoly.
- **Newsk** is the newsroom intelligence mode and first customer workflow. It shares Ontoly, HQL, HarvyDex, permissions, and UI foundations with Tower, Ops, and Civic, but does not inherit their entitlements.
- **HarvyDex** assigns and manages a global UUID for every record in Harvy.
- **HQL** is the shared query protocol across Harvy products and product lines.

## Product integration rules

- The existing OpenTIR frontend is discarded. Do not carry it into Harvy or treat it as the target frontend.
- The API surface to consider from OpenTIR is `api/v1/` only. Do not assume other API routes or frontend-specific APIs are part of the integration.
- Call data-source integrations **workflows**, not fetchers. (2026-10-30: renamed to "workflows" by user directive; "connector" survives only in legacy wire/DB identifiers.)
- Harvy does not use ClickHouse.
- Harvy does not use Cloudflare Search.
- Harvy is web SaaS only; do not include OpenTIR's Tauri desktop app or desktop packaging.

## Harvy platform

Harvy uses Cloudflare services, including:

- Workers
- Workers KV
- Basin
- Containers
- Queues
- Workflows
- Email Service for transactional email
- R2
- D1
- K2 Streams
- Secrets Store
- Hyperdrive as the preferred database connectivity layer for Workers
- Better Auth as the existing Harvy authentication foundation

Use these as the platform vocabulary and target architecture when evaluating the codebases. Do not reintroduce products explicitly excluded above.

## Frontend

Use React with MUI as Harvy's preferred frontend component system. Build Harvy's visual identity through a shared theme and reusable components; use MUI's production-ready React components as the base UI toolkit.

Assign every reusable and user-facing UI element a stable, globally unique semantic element tag. Keep tag definitions in a shared registry and use them consistently across Tower, Ops, Civic, and Newsk. Tags should support design-system traceability, accessibility review, product analytics, support diagnostics, and UI automation without exposing user data. Feature availability is decided by the feature-flag and entitlement manager, not by the tag itself.

Provide a Harvy-managed feature-flag and entitlement service for controlling feature access by product, plan, organization, user, environment, and rollout cohort. It should support server-enforced checks, safe client visibility, gradual rollout, explicit overrides, audit history, and fail-safe defaults. Better Auth remains the identity, session, organization, and authorization foundation; it can provide principals and role/permission checks but is not itself a feature-flag manager. Integrate feature decisions with Better Auth identity and organization context while keeping the flag registry and evaluation policy in Harvy.

Use Bulma for the Harvy documentation site. Keep this scoped to documentation pages; the main SaaS application uses React and MUI.

Use Formbricks for Harvy forms and surveys, integrated with Harvy accounts and workflows. Its Community Edition is self-hosted under AGPLv3; confirm license compatibility and hosting/data boundaries before selecting a deployment or embedding it in Harvy.

Use Drizzle Cube as the core analysis and query interface/framework for HQL. Its semantic query model and React analysis components provide the user-facing query builder and analytics experience over Ontoly. HQL remains Harvy's shared query protocol; Drizzle Cube is the framework/interface used to author and execute those queries.

Use Protomaps as Harvy's maps engine. Its mapping stack includes PMTiles archives, tools for creating and serving tile data, and an OpenStreetMap-based basemap. Select the rendering library and tile hosting arrangement to fit Harvy's frontend and Cloudflare platform.

Use Reagraph for interactive network-graph visualization in the React application. It renders Ontoly objects and links for exploration; Ontoly remains the source of graph semantics, evidence, and permissions.

Use Video.js as Harvy's video player framework. Use the YouTube Data API key for YouTube search and metadata integrations; keep it server-side in Cloudflare Secrets Store and account for API quota. Use an appropriate Video.js YouTube integration for playback. Video.js handles playback/UI; the YouTube API provides data and discovery.

Use Google DeepMind WeatherNext as Harvy's weather forecasting model family. Treat the open repository as research/model code, not a hosted forecast API. Decide whether Automation has suitable accelerator capacity for inference or whether Harvy should consume an available WeatherNext forecast feed. Keep forecast model/version, initialization time, valid time, resolution, and uncertainty/probability metadata attached to resulting Ontoly records. Review model and input-data licenses before distribution or production use.

Use Open-Detector as a candidate model for AI-writing-style analysis on academic text, running the Python/PyTorch BERT model through Automation. Its scope is stylometric classification, not verification of factual accuracy, citation authenticity, or hallucinations. Treat output as an uncertain signal with model/version and provenance; do not present a detector score as proof of AI authorship or misconduct. Validate performance on Harvy's intended content and languages before production use.

## External processing server

Harvy currently has one external server, named **Automation**. It connects to third-party APIs and handles:

- scraping
- mining
- crawling
- searching
- transforming
- ingestion for external APIs

The existing n8n installation is an internal orchestration component of Automation. Follow the [uniform n8n standard](docs/DEVELOPMENT.md#18-uniform-n8n-integration-standard): team-owned workflows coordinate bounded jobs through the same connector/run contracts, with one schedule owner, scoped credentials, idempotency, and verified Spider/Webshare preflight. Harvy owns tenant policy and canonical records; n8n is not a customer workflow builder or a separate source-ingestion system. The [five-day hackathon plan](docs/PLAN.md#five-day-hackathon-2026-10-28-through-2026-11-01) takes delivery priority over broad platform migration this week while retaining the full-legacy-catalog 50% adoption target.

Automation uses Spider Cloud's API, including the Unlimited endpoint and AI endpoint. The Unlimited API exposes `/unlimited/scrape`, `/unlimited/crawl`, and `/unlimited/links` (aliases under `/v1/unlimited/...`); the user refers to these operationally as `/scrape`, `/scrawl`, and `/links`. Verify exact route/version against Spider's current docs when implementing. Spider's docs describe the route as `crawl` (not `scrawl`) and document concurrency limits and immediate `429` responses with `Retry-After` when capacity is full.

All connectors require a Webshare proxy. Treat proxy configuration and use as a connector requirement, including for third-party API access, and keep credentials in the configured secrets system rather than source code.

## Preferred implementation languages

Prioritize these languages, in order of project fit:

1. Python
2. TypeScript
3. Node.js

Use these for new Harvy code and connector implementations where practical.

Treat this server as the current execution environment for those workloads unless the user updates the architecture.

## Integration implications

- Review OpenTIR's `api/v1/` endpoints and the domain capabilities behind them as potential API/product features.
- Evaluate connectors independently from the discarded frontend.
- Map source-repository storage, queues, search, and ingestion assumptions onto Harvy's Cloudflare services and the external processing server.
- Route third-party API and web extraction work through Automation, using Spider Cloud and the required Webshare proxy for connectors.
- Treat repository documentation that names ClickHouse, Cloudflare Search, or fetchers as legacy/source-project context, not Harvy requirements.

## Ontoly foundation

Ontoly is the core model and operational layer for all Harvy use cases. Applications and product lines should work through this shared model rather than maintaining separate domain silos. The design inspiration is the ontology overview in [Palantir Foundry documentation](https://www.palantir.com/docs/foundry/ontology/overview): map data to real-world objects, properties, and links, and include governed actions and functions so the model can support operational workflows as well as analysis. Harvy should adopt the useful concepts, not assume Palantir's implementation or copy its product.

- **Object types** define kinds of real-world entities and their typed properties.
- **Link types** define relationships between entities and preserve their direction, meaning, and evidence.
- **Observations and evidence** preserve source-backed claims and their time, provenance, and uncertainty; they do not turn a source assertion into verified identity by default.
- **Actions** are governed, auditable changes or workflow submissions against ontology objects.
- **Functions** provide reusable business logic, derivations, and queries over ontology data.
- **Interfaces** define shared capabilities or shapes across compatible object types.
- **Governance** defines authorization, visibility, validation, versioning, and review for objects, links, and actions.
- **Applications** such as Tower, Ops, Civic, and Newsk present use-case-specific workflows over the same Ontoly model.

HQL is the shared query protocol for applications to query Ontoly consistently. Drizzle Cube is the designated framework and user interface for analysis and query authoring within HQL. Its semantic layer should map to Ontoly's object types, relationships, measures, dimensions, and governed access context. HarvyDex provides stable global record identity across ingestors, object types, evidence, and product surfaces.

- Global situation map and globe with geospatial event exploration.
- News and event monitoring with search, filters, story views, and source attribution.
- Conflict, unrest, and positive-event tracking.
- Aviation and maritime monitoring, including aircraft, vessels, and AIS data.
- Military and space monitoring, including military flights, satellites, and GPS jamming.
- Markets and economic data, including stocks, commodities, trade, and prediction markets.
- Energy and infrastructure monitoring, including power outages and infrastructure signals.
- Environment and disaster monitoring, including climate, wildfire, earthquakes, and severe weather.
- Cyber, supply-chain, and company signals.
- Research and data discovery, including source catalogs and connector-backed search.
- AI-assisted search and answers with citations, implemented through Harvy's chosen services and Automation where appropriate; do not use Cloudflare Search.
- User accounts and API access, including passkeys, TOTP, recovery, and API tokens, subject to Harvy's product and security design.
- Configurable product workspaces for full, technology, finance, positive-events, and commodity monitoring; treat OpenTIR's variants as layout/product presets to evaluate, not separate desktop builds.
- Live television and broadcast monitoring, including a curated live-channel directory and supported stream playback; Newsk is the natural product surface, with shared source and media objects in Ontoly.
- Humanitarian and displacement monitoring as a distinct intelligence domain, linked to events, locations, and organizations with source and uncertainty context.
- Satellite imagery discovery and imagery-derived observations, kept distinct from existing satellite tracking and fire-detection signals.

## Civic product line

The following civic capabilities are part of Harvy's **Civic** product line. Integrate them into Harvy's web SaaS and Ontoly model. **Link tips are excluded.**

- Municipality directory with search, filters, detailed records, agency coverage, source provenance, and explicit coverage gaps.
- Civic source discovery for governments and related institutions, including police, fire, EMS, schools, and other civic organizations. Discovered sources remain candidates until reviewed or verified.
- Town website monitoring and change tracking for pages and documents such as agendas, minutes, notices, ordinances, budgets, bids, and calendars.
- Document search and evidence with municipality, source, capture date, hashes, citations, and storage-protection state.
- Shared municipal event calendars plus private per-user saved events; automated extraction and cross-source deduplication are capabilities to develop.
- YouTube/Vimeo video catalog with searchable metadata, municipal/channel associations, and supported in-app playback. Video downloading and processing are excluded.
- Community mapping for local subreddits and public Facebook groups, with evidence-backed validation and administrator approval before collection.
- Research capabilities: saved searches, map views, dashboards, investigations, watchlists, public-records requests, people and institution records, nonprofit data, comparisons, relationship graphs, and evidence verification.
- Accounts and collaboration: shared-data suggestions, organization controls, and privileged review workflows. Define Harvy's own roles and authorization model.
- Public finance and procurement: budgets and line items, debt, check registers, vendors, contracts, campaign contributions, grants, and bid analysis.
- Public accountability: meeting roll calls and attendance, appointments, payroll and pensions, licenses, ethics disclosures, lobbying, candidate filings, court appearances, and official contact records.
- Property and development: parcel ownership, assessments and taxes, redevelopment and PILOT agreements, zoning, auctions, housing obligations, and regulated licenses.
- Public safety and infrastructure: police and emergency-service data, civil-rights oversight, utilities, water quality and PFAS, Superfund sites, storms and FEMA activity, and emergency alerts.
- Schools, counties, and local institutions: education and district records, county-level agencies, and other public institutions connected to municipalities.
- Document intelligence: OCR, table extraction, redaction-aware handling, document diffs, and transcript-synchronized video evidence.
- Monitoring and publishing: source outage and link-rot detection, website technology changes, query digests, citation exports, chain-of-custody records, and storylines linking evidence over time.
- Nationwide records and benchmarking: state and federal sources, cross-municipality comparisons, and comparable measures with definitions and provenance.

Treat these as Civic capabilities to model through Ontoly rather than an instruction to copy another implementation. Apply Harvy's platform choices, including Automation for external processing and the required Webshare proxy for connectors. Keep implementation status explicit when planning or building each capability.

## Newsk newsroom intelligence

Newsk should turn selected social signals and other Ontoly evidence into a source-linked newsroom workflow. The main unit of work is a **story** with a timeline of claims, events, entities, locations, source observations, and editorial decisions; individual posts remain attributed evidence linked to that story.

### Initial scoped monitoring

Begin with monitors explicitly configured by a newsroom workspace:

- **Facebook:** selected Pages and specific public content only when the newsroom and Harvy have the required authorized API access. Do not assume broad public search, profile monitoring, or group monitoring is available.
- **X:** selected accounts, lists, keywords, and query rules using the official API endpoints available to Harvy's approved access plan. Record endpoint, query, quota, and coverage limits with each monitor.
- **Reddit:** selected subreddits and search scopes through approved Data API access. Because Harvy is a commercial SaaS, secure the required written commercial agreement before production access or display to customers.

Each monitor should store its owner/workspace, chosen source IDs and query, geography and time bounds where relevant, permitted data fields, schedule/latency target, provider limits, allowed use, retention/deletion rule, and current authorization status. Let workspace admins pause, edit, and remove monitors. Do not silently broaden a monitor's scope or impersonate users, evade rate limits, or use a proxy to bypass platform controls. The required Webshare proxy remains a connector requirement, subject to each provider's approved access method and terms; if an approved API path is incompatible with that requirement, treat the connector as blocked pending an authorized solution.

### Connector priorities for Newsk

The source catalogs in the original codebases are discovery inputs, not proof that a source is licensed, available, or implemented. The current Harvy connector catalog does not yet provide an operational Newsk news and social monitoring set. Build and verify these through Automation's Connectors, with source-specific access, Webshare proxy configuration, credentials, quotas, retention, and deletion behavior recorded before enabling them:

| Priority | Connector family | Newsk use | Notes and gates |
|---|---|---|---|
| 1 | Publisher RSS and official newsroom feeds | Reliable first-party article discovery for selected outlets and beats | Prefer direct publisher feeds over RSSHub routes. Confirm each publisher's terms, attribution, and permitted storage; ingest metadata and excerpts only as allowed. |
| 1 | GDELT | Broad international article and event discovery; useful for finding stories beyond a newsroom's watchlist | The existing source catalog suggests a bounded recent English query. Treat it as discovery and a coverage signal, not a complete or authoritative news archive; validate relevance, duplicates, language coverage, and latency. |
| 1 | Public agency, municipality, and civic sources | Press releases, emergency notices, meeting agendas, public records, and local developments | Reuse Civic's source coverage as newsroom beats: agencies, municipalities, schools, public meetings, and official pages. Prefer official APIs and feeds; use Spider Cloud extraction only for permitted public pages. |
| 1, gated | X, Facebook, and Reddit | Scoped account, Page, keyword, and subreddit monitoring | Implement separate connectors and entitlements. Use approved platform APIs and agreements only; no generic scraping or unofficial RSSHub proxy. Reddit commercial access must be contractually cleared before production. |
| 2 | YouTube Data API and curated live-channel directory | Discover live broadcasts and attach source-linked video references to stories | The source catalog lists 29 international channels, but those listings are candidates. Verify channel identity and availability; use supported embeds/playback and preserve the original source link rather than rehosting streams. |
| 2, contextual | USGS, NOAA/NWS, GDACS, NASA FIRMS, FEMA | Add verified event context to breaking-news stories (earthquakes, warnings, fires, disasters) | These are strong signal and corroboration sources, not article-feed replacements. Label source observations and event data separately from newsroom reporting. |
| Evaluate, gated | SocketNews | Possible low-latency international news stream with country/language channels and pre-extracted summaries, facts, entities, and topics | Its terms allow commercial integration but prohibit redistributing data in a way that substantially replicates SocketNews or creates a competing equivalent service based primarily on its data. Since Newsk is itself news monitoring, get written approval for the exact embedded SaaS use, customer display, retention, and onward use before production. It does not provide original articles, full text, or source links, and warns outputs can be incomplete or inaccurate; require independent citations and verification. Also confirm the Socket.IO stream can meet Harvy's required Webshare proxy path. |
| Hold pending written clarification | MediaCloud | Aggregate news search and narrative/attention analysis | Its terms allow lawful use but say the platform is designed for academic, nonprofit, and journalistic research, not as a commercial tool for market/brand research; users may not sell, lease, or sublicense platform/API access. Media Cloud does not grant rights to third-party story content. Ask MediaCloud about a commercial SaaS integration and customer-facing output before using it as a Harvy backend; it is better suited to research and aggregated discovery than an embedded content feed. |
| Hold / fallback | RSSHub | Feed normalization where a direct source feed is unavailable | It is an intermediary, and the catalog includes publisher and Reddit routes. Prefer direct publisher feeds and official platform APIs; validate RSSHub hosting, route stability, and terms before any limited use. |

Do not prioritize generic sentiment or social-mention connectors as source-of-record. They can be added later as derived analysis when inputs and methods are transparent. Every Newsk connector must expose coverage and freshness so a newsroom can tell which sources it actually checked and where the gaps are.

### Newsroom capabilities to add

- **Story desk:** group related posts, documents, videos, and events into persistent story records; show why evidence was grouped and let editors split or merge stories with an audit trail.
- **Breaking-news triage:** prioritize incoming items by configured topic, location, source, recency, and observed activity. Show the signal and rule that triggered each alert; let desks tune, snooze, and assign alerts.
- **Storyline timeline:** order source observations and event updates by published and captured time, distinguish the two, preserve edits/deletions where the platform permits, and flag gaps or contradictory timestamps.
- **Verification workspace:** compare claims across independent sources, retain exact citations and original links, label corroborated, disputed, unverified, and corrected claims, and keep editorial review separate from automated confidence signals.
- **Geographic desk:** map story locations and affected Ontoly objects with Protomaps; preserve geocoding confidence and avoid implying a precise location when the source is vague.
- **Media references:** attach allowed image, video, livestream, and transcript references to a story; use the existing Video.js direction for supported playback and preserve the source's attribution and link.
- **Assignment and handoff:** support desk ownership, assignment, internal notes, status, review history, and source-linked handoff between Tower, Civic, Ops, and Newsk users.
- **Briefings and query views:** save HQL views and create in-app shift briefs grouped by topic, region, source, or story status. Make every generated summary traceable to citations and require editorial review before publication.
- **Source health and coverage:** show monitor freshness, API quota, errors, known gaps, rate limits, and source-specific coverage; never label an incomplete feed as comprehensive.
- **Corrections and removal handling:** propagate permitted provider edits, deletions, access revocation, and retention deadlines through derived story views and caches, with auditable cleanup status.

### Shared Ontoly records

Model candidate shared types such as `NewsroomMonitor`, `SocialSource`, `SocialPost`, `Story`, `Claim`, `Evidence`, `EditorialAssignment`, `Alert`, and `MediaReference` in Ontoly. Social posts should preserve platform IDs as external identifiers and use HarvyDex for Harvy record identity. Keep original source text and provider payloads separate from derived summaries, translations, labels, and editorial notes. AI summarization, translation, or transformation is enabled only where the applicable source agreement allows it; do not use monitored social content to train models without explicit rights.

### Access and data-use gates

Treat each platform as a separate connector and entitlement. Meta describes unauthorized automated collection as a terms violation; Facebook monitoring must use an approved access path and applicable permissions, not generic scraping ([Meta: How We Combat Scraping](https://about.fb.com/news/2021/04/how-we-combat-scraping/amp/)). X API access depends on developer enrollment and endpoint access; record the current plan, quota, and costs before enabling a monitor ([X Developer Platform](https://developer.x.com/), [X API tools](https://developer.x.com/apitools/api?endpoint=%2F2%2Ftweets&method=get)). Reddit's current Data API and Developer Terms require a separate agreement for commercial use not expressly permitted, prohibit use beyond the approved scope, and restrict AI training absent permission ([Reddit Data API Terms](https://redditinc.com/policies/data-api-terms), [Reddit Developer Terms](https://redditinc.com/policies/developer-terms)). These terms can change, so verify them during connector onboarding and renewal.

Gate Facebook, X, and Reddit independently through Harvy's feature-flag and entitlement manager. A source can remain unavailable for a tenant or environment until access approval, credentials, product terms, rate limits, retention, attribution, and deletion behavior are recorded and verified. Reddit AI-derived summaries should remain disabled unless the required agreement expressly permits that use.

### Competitive review: gaps Newsk should address

Public evidence across these products is uneven: vendor pages describe intended capabilities, while several newer products have few independent reviews. Treat the observations below as design signals, not a representative market survey.

| Product or category | Publicly visible limitation signal | Newsk response |
|---|---|---|
| Quorum | Capterra reviewers mention deeper cross-platform collaboration becoming less intuitive, high cost, and promised capabilities not always matching delivery. The review sample is small. | Make collaboration and handoff native to story records; clearly label shipped, preview, and planned capability; make plan limits and source coverage visible. |
| Dataminr-style alerting | G2 feedback includes alerts that can be irrelevant or numerous and require filtering; other users value speed and accept high alert volume. | Deduplicate into story clusters, show why an alert fired, make user triage dispositions feed explainable tuning, and let desks set quiet periods and alert-volume controls. |
| Enterprise newsroom systems | A Google News Initiative review of Atex describes slow implementations, scaling difficulty, older architecture, and friction sharing content across publications. | Use modular Workers/Automation integrations, shared Ontoly story objects, reusable global UI tags, and open HQL/API handoffs; avoid a monolithic CMS replacement as Newsk's first release. |
| Real-time situation dashboards | Monitor the Situation discloses changing source delays, incomplete coverage, stale positions, and errors in AI summaries or inferred locations. | Put observed time, capture time, source delay, location precision, coverage status, and uncertainty on the story itself; never imply total coverage. |
| Editorial intelligence and verification | OSINT613's published method separates confirmed, reported, and assessed information, requires corroboration for confirmation, and documents corrections. | Provide explicit claim states, independent-source checks, attributable evidence, human review, and a visible correction history. |
| AI-generated monitoring and briefs | Marketing claims commonly emphasize automatic summaries/digests, while public feedback is sparse for newer products such as Cotera, MediaThrive, and MediaWatcher. Gartner lists only one MediaWatcher rating, describing a customizable dashboard alongside onboarding challenges, so it is too little evidence to generalize. | Keep generated summaries citation-first, easy to compare with source text, and editor-approved; do not equate a polished summary with verification. |
| Proactive signal detection | Galileo Signals is an AI observability product rather than a newsroom monitor, and its public page provides no newsroom customer-feedback sample. Its useful pattern is surfacing recurring, previously unseen patterns and learning from historical examples. | Apply that pattern to source-backed story anomalies and emerging narratives, with examples, confidence, review dispositions, and history visible to editors. |
| Integration-heavy newsroom platforms | Ring Publishing and Atex emphasize editorial workflow, permissions, multichannel publishing, and CMS integration. | Add assignment and approved export/CMS handoff after monitoring and verification work reliably; keep publishing controlled by newsroom policy and explicit approval. |

Prioritize these improvements for Newsk:

1. **Monitor setup that proves its scope:** a source-specific query builder, test/preview results, matched and excluded examples, source availability, quota/cost estimate, and an explicit statement of blind spots before activation.
2. **A low-noise story queue:** collapse reposts and duplicate coverage, distinguish new story from update, rank with visible reasons, and let journalists tune alerts without hiding unreviewed evidence.
3. **Evidence-led verification:** show which claims each source supports or contradicts, whether sources are genuinely independent, where a location/time was inferred, and what is still unknown.
4. **Shift-ready collaboration:** assignments, desk queues, saved HQL views, handoff notes, in-app alerts, and concise citation-linked briefings; keep source feeds, editorial notes, and publication decisions separate.
5. **Coverage and freshness accountability:** show last successful check, observed source lag, API limits, missing intervals, language/location coverage, and recovery status. Give admins a monitor-health view as well as the journalist-facing story view.
6. **Proactive story discovery:** detect meaningful cross-source changes and emerging topics beyond a user's exact query, but explain the pattern, confidence, and supporting records. Allow each newsroom to mute or promote a signal and inspect how the system learned from prior decisions.
7. **Interoperability before CMS replacement:** support source-linked exports and integrations with newsroom tools while leaving article authoring and publication in the newsroom's chosen CMS. Consider automated publishing only as a later, explicitly governed option.

Evidence reviewed: [Quorum News Monitoring](https://www.quorum.us/products/news-monitoring/) and [Capterra reviews](https://www.capterra.com/p/169973/Quorum/reviews/); [Dataminr for News](https://www.dataminr.com/products/dataminr-for-news/) and [G2 reviews](https://www.g2.com/products/dataminr/reviews); [Atex review by Google News Initiative](https://newsinitiative.withgoogle.com/cms-providers/atex/); [Monitor the Situation methodology and limitations](https://monitor-the-situation.com/about); [OSINT613 sourcing, verification, and correction method](https://www.osint613.com/methodology); [Ring Publishing newsroom efficiency](https://ringpublishing.com/solutions-by-use-case/newsroom-efficiency); [Cotera News Intelligence Monitor](https://cotera.co/solutions/ops/news-intelligence-monitor); [MediaThrive monitoring](https://mediathrive.com/product/monitoring); [MediaWatcher Gartner reviews](https://www.gartner.com/reviews/market/sentiment-analysis-tools/vendor/media-watcher); [Pubilot](https://pubilot.com/); [Galileo Signals](https://galileo.ai/signals); [Xberg documentation](https://docs.xberg.io/). Xberg is a content extraction/crawling toolkit, not a newsroom monitoring product; its relevant role is an optional Automation processing component, subject to the existing vendor and proxy requirements.

## Shared Ontoly and Civic platform capabilities

The following cross-cutting capabilities apply across Ontoly, Tower, Ops, Civic, Newsk, and future Harvy product lines. Preserve status distinctions between planned, implemented, and live-verified.

- **Common observation and event model:** Normalize incoming signals into shared records with time, location, source, evidence, and lifecycle status so product lines can correlate information.
- **Entity resolution and relationship graph:** Link people, places, organizations, companies, agencies, vessels, events, documents, and sources across domains. Preserve aliases, provenance, match confidence, and human review for uncertain matches.
- **Evidence lifecycle:** Track discovery, validation, corroboration, contradiction, review, correction, and version history while preserving original evidence and citations.
- **Temporal history:** Retain changes to entities, relationships, events, and sources so users can inspect what changed and what was known at a given time.
- **Cross-domain alerts:** Allow users to monitor topics, entities, locations, and sources, and notify them when related signals or meaningful changes appear.
- **Explainable scoring:** Where trust, risk, or confidence scores are used, show contributing evidence and rules, expose uncertainty, and retain score history.
- **Data quality and correction:** Support duplicate, stale, and incorrect-record review; preserve correction history and avoid silently replacing conflicting evidence.
- **Customer monitoring rules:** Let teams configure topics, locations, entities, and sources to monitor, with workspace-level sharing and access controls.
- **Shared geospatial services:** Reuse municipal and regional boundaries, geocoding, location matching, and map filters across Civic and Ontoly domains.
- **Document processing pipeline:** Provide file intake, preflight, bounded transfer, extraction, indexing, evidence linking, and verified storage state using Harvy's selected storage architecture.
- **Durable job coordination:** Support resumable collection and transformation through checkpoints, retries, leases, interruption recovery, and explicit partial/failure outcomes, coordinated across Automation and Harvy's Workers, Queues, Workflows, and K2 Streams.

## Data platform operations

Build internal operator capabilities for managing connectors, sources, and data quality:

- **Connector/source catalog:** Track connector and source ownership, supported data, credential requirements, proxy requirements, limitations, schedules, and health. All connectors must use the required Webshare proxy.
- **Run history and observability:** Show per-connector freshness, coverage, counts, status, error reasons, retries, and provider usage/cost where measurable. Distinguish measured, provider-reported, estimated, unavailable, and not-applicable values.
- **Review queues:** Route uncertain entity matches, conflicting claims, source changes, and data corrections for appropriate human review.
- **Replay and recovery:** Provide controlled replay and recovery for failed or interrupted ingestion and transformation jobs, preserving operation identity and audit history.
- **Retention and deletion:** Apply source terms, legal requirements, and customer settings to data retention and deletion, with auditable outcomes.
- **Storage verification:** For any configured multi-destination storage policy, track each destination independently and only report full protection after required copies are verified.

These operations and shared capabilities support Harvy's products. Ontoly is the shared foundation; Tower, Ops, Civic, and Newsk use it for their respective workflows.

## Internal engineering tools

- **Herdr** is a candidate internal tool for running and coordinating coding-agent terminal sessions across local and remote machines. It is developer infrastructure, not a Harvy SaaS runtime dependency. Its repository is Apache-2.0 licensed.

## Consolidation and preservation strategy

Treat Harvy's V2 platform as the runtime base, and bring forward the strongest domain models, source coverage, and workflows from the other codebases behind Harvy's shared Ontoly model. Port capabilities and validated contracts; do not combine the three repositories' competing runtimes or frontends.

| Source | Preserve or adapt | Do not carry forward as Harvy's target |
|---|---|---|
| Harvy V2 | Better Auth identity, existing React/MUI direction, connector run contracts, bounded Queue/Workflow execution, D1 run state, K2 lifecycle events, R2 evidence artifacts, Basin analytics, ontology/query modules, and explicit source registration. | Retired V1 paths and duplicate legacy application surfaces. HarvyDex and HQL are still target requirements; do not imply they are already fully implemented. |
| OpenTIR | The useful `api/v1/` response shapes and domain coverage: events/news, sources, search, markets, aviation, maritime, trust scoring, and source-health concepts. Convert the data and API contracts to Ontoly objects and HQL. | Its frontend/desktop app and its legacy storage, search, and ingestion topology. Keep its connector/source catalog as candidates until reviewed, licensed, and implemented through Automation. |
| Civic | Nationwide municipality and agency discovery; document/site monitoring; evidence and provenance; maps and map releases; civic research workflows; people, organizations, budgets, public records, and relationship graph capabilities; strong operational telemetry and recovery ideas. | A separate Civic runtime, a second identity system, the existing query-protocol name, direct source scraping in Workers, and Cloudflare Search bindings. Implement the valuable Civic workflows as Ontoly-backed Civic product surfaces. |

### Harvy target architecture

1. **One ontology and identity layer:** define shared object/link types, observations, evidence, actions, permissions, and temporal history. Give every record a HarvyDex UUID at the ingestion boundary and preserve source IDs as external identifiers.
2. **One ingestion boundary:** VPS-hosted n8n Automation workflows own third-party API access and web extraction. Their connectors use the required Webshare proxy and Spider Unlimited where applicable. Harvy Workers, Queues, and Workflows coordinate Harvy-side authorization, jobs, and state; they do not become a second scraping system.
3. **One data path:** retain raw source captures and normalized evidence in R2; keep operational job and registration state in the appropriate database; emit lifecycle events to K2 Streams; use Basin for analytical telemetry and aggregate analysis. PostgreSQL through Hyperdrive is the transactional target; the hosting provider and migration from current direct D1 access still need implementation decisions. Database ownership, scope constraints, extension tables, and raw/processed/query stages follow the engineering standard.
4. **One query contract:** translate useful Civic query semantics and OpenTIR API filters into versioned HQL. Drizzle Cube is the analysis/query authoring UI; it must use Ontoly metadata and enforce the same permissions as APIs.
5. **One design system and entitlement path:** MUI components use stable global UI element tags. Better Auth supplies identity and organization context; Harvy's feature-flag manager evaluates product, plan, organization, user, environment, and rollout access on the server.
6. **Product surfaces share the foundation:** Tower, Ops, Civic, and Newsk are role- and use-case-specific views over Ontoly and HQL. Do not fork source records, identity, query semantics, or authorization by product line.

### Uniform component contract

Uniformity means shared contracts and operating rules, not identical product behavior. Tower, Ops, Civic, Newsk, and future products may have distinct workflows, but each component must connect through the same identity, ontology, API, event, query, UI, and operations contracts. A component that cannot satisfy these contracts remains an isolated prototype until an adapter or approved exception is defined.

| Contract area | Required shared rule | Allowed extension |
|---|---|---|
| Identity and tenancy | Every request and job carries an authenticated Harvy principal, organization/workspace, authorization context, environment, and correlation/trace ID. Enforce tenant boundaries server-side. | Product roles and scoped permissions can be added through the shared authorization model. |
| Component identity | Every deployable or reusable component has a stable namespaced ID, owner, purpose, lifecycle status, supported contract versions, dependencies, and operational contact. | Product-specific metadata may extend the manifest without changing shared fields. |
| Records and provenance | Every Harvy record receives a HarvyDex UUID. Shared Ontoly objects use registered types and links, with source IDs, tenant scope, observed/published times, provenance, and schema version where applicable. | Product domains may register new object/link types; they must reuse shared primitives and pass ontology review. |
| APIs | All product APIs use the versioned `api/v1/` surface, common auth and authorization middleware, common pagination/filter conventions, and a common error envelope. Breaking changes require a new version; additive changes remain backward-compatible. | Domain routes and request/response fields are allowed within the shared envelope and naming rules. |
| Connectors and jobs | Every connector is registered in Automation and declares its owner, source, permissions, secret references, required Webshare proxy, inputs, outputs, schedule/trigger, limits, retry/idempotency behavior, retention, health checks, and supported versions. Runs expose queued/running/succeeded/partial/failed/cancelled states and stable run IDs. | Source-specific adapters may add fields and transformations; they must emit the shared normalized records and run lifecycle. |
| Events and queues | Cross-component events use a versioned envelope with event ID, type, schema version, occurred/observed time, tenant, producer, trace ID, and payload reference. Consumers must be idempotent and tolerate retries, duplicates, and out-of-order delivery. | New event types can be registered without changing transport-level fields. |
| HQL and permissions | Product query UIs and APIs compile to versioned HQL over Ontoly metadata. Permission filtering and tenant scoping apply at execution, not only in the UI. | Product-specific query templates and semantic models may be added as registered HQL extensions. |
| UI and accessibility | Shared React/MUI theme, primitives, navigation patterns, accessibility behavior, and global semantic UI tags. Each tag is stable, namespaced, registered, and free of user data. | Product-specific screens compose shared primitives and add registered tags; do not fork common controls or theme tokens. |
| Feature access | Features are registered with stable keys and evaluated through the server-side entitlement/flag service using product, plan, tenant, user, environment, and rollout context. Client flags control presentation only. | New flags can add product-specific rollout rules but cannot bypass authorization. |
| Operations and data lifecycle | Components emit structured logs, metrics, traces, health/freshness/coverage state, and auditable lifecycle transitions. Data changes honor source terms, retention, correction, deletion, and tenant boundaries. | Domain-specific measures may be added alongside the common operational fields. |

#### 1. Register components and their contracts

The following requirements define the target standard. They are architecture decisions to implement; the registry, SDKs, and automated gates described here are not yet established by this document.

Maintain one version-controlled contract catalog in Harvy's runtime repository. It contains component manifests and the definitions of Ontoly types, actions, HQL capabilities, API operations, events, UI tags, permissions, and feature keys. Generate runtime registry views and documentation from this catalog. Product lines may organize their definitions in separate directories, but must use the same schema and registration process.

**Identity rules:** Each registry record has a HarvyDex UUID and a unique, immutable semantic key. Use `harvy.<scope>.<domain>.<name>` for keys; scopes include `platform`, `ontoly`, `automation`, `tower`, `ops`, `civic`, and `newsk`. Shared functionality belongs to its shared scope: for example, `harvy.automation.connector.gdelt` can serve several products. Product availability is declared separately from component ownership. Display labels may change; UUIDs and semantic keys are never recycled. A key identifies a definition, while a HarvyDex UUID identifies an individual persisted record. Source IDs remain external identifiers.

Every component manifest must declare:

| Manifest group | Required information |
|---|---|
| Identity | HarvyDex UUID, semantic key, kind, display name, purpose, accountable owner, code location, and consuming products. |
| Kind and runtime | Product module, domain module, API service, connector, job/workflow, UI component, or infrastructure adapter; execution environment and applicable conformance profiles. A reusable UI component need not be a separately deployed service. |
| Contracts | Manifest schema version, implementation version, provided/consumed contract IDs and version ranges, input/output schema references, and declared dependencies. |
| Access | Required permissions and feature keys, supported organization/workspace scopes, permitted service principals, and whether explicitly approved shared data is supported. |
| Data | Ontoly types read/written, authoritative write owner, source provenance, classification, retention/deletion policy references, and source-use restrictions where applicable. |
| Operations | Applicable runtime limits, timeouts, concurrency, retry policy, idempotency scope, checkpoints, health signals, operational owner, and recovery/rollback instructions. |
| Configuration | Typed configuration schema, defaults, environment overrides, and secret references. Secret values and tenant credentials never belong in the catalog. |
| Lifecycle | Candidate, preview, stable, deprecated, or retired; release artifact reference; evidence for conformance; replacement and deprecation dates where applicable. |

Use language-neutral schemas for exchanged data, with generated TypeScript types/clients and Python models/clients from the same definitions. JSON Schema is the baseline for payloads and configuration; OpenAPI describes HTTP operations using the same data definitions. Runtime validation is required at trust boundaries even when a generated client is used. Node.js is the runtime for TypeScript/JavaScript components where needed; it does not define a separate protocol.

Publish shared libraries for identity context, authorization integration, schema validation, HarvyDex, HQL, errors, telemetry, and connector execution. Keep domain rules in their owning modules. Dependency direction is product modules → shared domain/platform interfaces → infrastructure adapters. Shared modules must not import a product's implementation. Products interact with another domain through its declared actions, queries, or events; they do not write directly to its tables.

**Registration acceptance:** The component owner supplies the manifest and schemas; the owner of each affected shared contract reviews its semantics. Automated validation checks references, uniqueness, dependency compatibility, and completeness. Assign these responsibilities to named maintainers; one person may hold several roles. A candidate registration records intent and does not grant production access or prove implementation. Every deployed release must resolve to a specific accepted manifest and contract revision.

#### 2. Meet the shared contract

Apply requirements by component kind. An API or connector must enforce runtime security; a UI primitive must meet design and accessibility rules. Mark an inapplicable requirement explicitly with a reason rather than adding meaningless tenant fields or fabricated health metrics to every component. Reuse the same libraries and middleware wherever a requirement applies.

| Area | Concrete behavior required |
|---|---|
| Request and job context | Establish principal, organization, workspace where applicable, environment, request ID, trace ID, and delegated permissions from trusted authentication. Never trust caller-supplied tenant or role headers as authorization. Async jobs carry bounded delegation, and workers recheck current permission and entitlement before protected work. |
| Authorization and features | A feature is usable only when authorization, entitlement, rollout, and source access all allow it. Evaluate these conditions on the server for reads, actions, exports, subscriptions, and jobs. An unavailable evaluator cannot grant new access. Browser visibility is derived from the same decision and never substitutes for it. |
| HarvyDex and record ownership | Assign a UUID on first persistence and retain it through retries, product views, and migrations. Allocate a new UUID for a genuinely new persisted record. Declare uniqueness rules using source, external ID, record type, and scope where applicable. Re-ingesting the same source record must not silently create another entity. Entity merges preserve aliases and evidence with an audit trail. |
| Ontoly semantics | Register property types, units, allowed values, nullability, relationships, validation, and permitted actions. Separate a real-world object from an observation or claim about it. Preserve conflicting observations as attributed evidence; do not overwrite a fact merely because a later connector disagrees. |
| Time and change | Exchange timestamps in UTC with an explicit offset. Distinguish event time, publication time, observation time, and ingestion time; retain unknown values as unknown. Use record revisions for concurrent edits, reject stale updates with an explicit conflict, and record correction history subject to deletion requirements. |
| API behavior | Keep public product routes under `/api/v1/`. Publish request/response schemas, bounded page sizes, opaque cursors, deterministic sort/tie-breaking rules, and allowed filters. Use a common error shape containing `code`, safe `message`, `request_id`, `retryable`, and structured field details when applicable. Preserve appropriate HTTP status codes. Long-running operations return a run reference with status and cancellation operations. |
| Safe retries | Mutating operations that may be retried accept a scoped idempotency key. Store its association with the operation and payload fingerprint for a declared retention window. The same key and payload returns the existing result/run; the same key with different input produces a conflict. Expiry and replay behavior are documented. |
| Connector execution | Automation authenticates the job, validates configuration and source permissions, resolves secrets, applies the required Webshare proxy, and runs bounded work. Each run records a checkpoint, provider limits, counts, coverage, errors, and output references. Rate limits honor provider retry guidance. Permanent authorization/configuration failures require intervention rather than unlimited retries. |
| Event delivery | Events carry `event_id`, `event_type`, `schema_version`, `producer`, `occurred_at`, `recorded_at`, `trace_id`, `causation_id` where applicable, explicit access scope, and a validated payload or authorized payload reference. Deduplicate by event ID; use aggregate revision/sequence where order matters. Missing tenant information never implies globally shared data. |
| Durable state and events | A committed state change and its required event must remain recoverable together, using a transactional outbox or an equivalent durable handoff. Consumers acknowledge work after their effects are durable. Design for repeated delivery; do not claim exactly-once side effects from transport delivery alone. |
| HQL execution | Validate against registered Ontoly fields and actions, apply row/property permissions, bind parameters safely, and enforce time, row, and resource limits. Saved queries declare their HQL/ontology version dependencies. Cached results include tenant and permission context and are invalidated when access changes. |
| UI behavior | Use shared MUI tokens and components for spacing, typography, color, forms, navigation, and feedback. Specify loading, empty, stale, partial, error, and permission-denied states. Global UI tags identify semantic controls; repeated rendered instances use separate instance identifiers. Tags are not DOM IDs and contain no personal data. Support keyboard use, focus management, and accessible labels. |
| Operations | Propagate trace IDs from API to Automation and downstream jobs. Report latency, errors, throughput, queue lag, last success, and source freshness where relevant. Separate process health from successful collection. Redact secrets and sensitive payloads from logs. A zero-item successful check must be distinguishable from a failed check. |
| Data lifecycle | Carry source/use restrictions into derived records, caches, exports, and aggregates as applicable. Track deletion and correction propagation across stored copies and derived artifacts. Explicitly govern shared datasets and tenant-owned data; a common ontology does not imply universal data access. |

For connector runs, use `queued → running → succeeded | partial | failed | cancelled`. A retry remains an attempt within the same logical run and records its own attempt identity. `partial` means some outputs were durably committed and the run's declared scope was not completed. `succeeded` means the requested scope and required writes completed, not merely that the process exited without an exception. Cancellation is a request until the executor confirms it; report any work already committed. A replay of a terminal run creates a linked new run and preserves the prior outcome.

Use shared conformance suites to verify observable behavior rather than duplicating each component's implementation. Applicable checks include schema compatibility, cross-tenant denial, permission/flag enforcement, duplicate delivery, stale update conflicts, retry after interruption, partial results, retention propagation, and UI accessibility/states. Connector validation also covers the proxy path, provider limits, provenance, and source coverage. These are required engineering gates to build; documenting them does not mean they have passed.

**Release acceptance:** CI provides contract and applicable behavior evidence; the component owner supplies operating limits and recovery instructions; the release owner enables a bounded preview through the shared flag service. Stable release requires evidence that the preview meets declared success, freshness, and failure-handling criteria. Record the release, owner, contract revision, evidence, and rollback target. Exceptions must name a responsible owner, affected contracts, expiry, and remediation; tenant isolation and required authorization cannot be waived through a product flag.

#### 3. Extend components compatibly

Choose an extension point in this order: typed configuration for an existing capability; a new connector or adapter for another source; a registered Ontoly type/action or HQL capability for new semantics; a product workflow or UI composition; then a shared platform change when the earlier options cannot express the need. Extensions still satisfy the applicable registration and conformance requirements.

| Change | Compatibility rule |
|---|---|
| Optional field with unchanged meaning and defaults | May be a minor contract release if existing readers tolerate it and validation confirms old payloads still work. A field is not harmless merely because it is optional; assess privacy and authorization too. |
| New source connector or product screen | Register a new component and reuse current contracts. It need not change shared schema versions unless it introduces new semantics. |
| New enum member, event type, or error code | Check consumer handling of unknown values. Treat it as breaking where an existing consumer cannot safely handle it. |
| Required field, removed/renamed field, changed units, changed ID meaning, altered default behavior | Breaking contract change; provide a migration or adapter and explicit version negotiation. Never silently reinterpret existing stored data. |
| Changed permissions or entitlement meaning | Perform an access-impact review. Preserve least privilege, migrate affected assignments explicitly, and invalidate relevant sessions/caches as needed. |
| Database schema or storage implementation change | Keep public contracts stable where possible. Use additive schema migration and backfill before switching readers/writers; retain recovery until migration evidence permits retirement. |

Use semantic versions for contract packages: major for incompatible behavior, minor for compatible additions, patch for corrections that preserve documented behavior. Track implementation releases separately. A contract package major change does not automatically create a new public API path: preserve `/api/v1/` semantics using adapters, or record an explicit public API version decision before exposing a breaking route. Producers and consumers declare supported versions; reject unsupported versions clearly rather than guessing their meaning.

Every breaking change follows this sequence:

1. Identify impacted consumers, saved HQL queries, stored records, background jobs, integrations, and source obligations. Name the migration owner and measurable completion criteria.
2. Publish the replacement contract and mapping. Deploy support for both versions where necessary, with a stated compatibility window and removal date. Old in-flight jobs must finish safely or be explicitly migrated/cancelled.
3. Backfill or adapt data using checkpointed, idempotent work. Preserve HarvyDex identities and provenance. Compare results and permission behavior before switching traffic.
4. Enable a limited cohort with flags, observe the declared criteria, and expand only as evidence supports it. Reverting application code must remain compatible with already-written data; otherwise use a documented forward recovery plan.
5. Deprecate the old contract, notify affected consumers, and record migration progress. Retire it only after active consumers and in-flight work are accounted for, required history is preserved, and removal is approved by the accountable owner. Keep retired keys reserved.

For example, a Newsk historical-analysis capability would register an Automation connector for an approved Media Cloud integration, map permitted outputs into existing Ontoly evidence/observation types, expose research through HQL, and compose shared query and timeline UI components. It would declare its source-access gate and feature key, retain source URLs where supplied, and add a new ontology type only if the existing semantics cannot represent the output. Tower or Civic could then use the same connector and records subject to their permissions and source-use rights.

**Extension acceptance:** An extension ships when its new registrations are accepted, its supported consumers remain compatible, its source and access constraints are satisfied, and its release/migration evidence is recorded. Adoption of a new platform primitive additionally records why existing contracts are insufficient, its operating owner, dependency cost, and effect on current products.

### Migration order

1. Inventory source capabilities and classify each as implemented, bounded-verified, candidate, legacy, or excluded. Record source, license/terms, owner, proxy and secret needs, coverage, data shape, and verification evidence.
2. Freeze Harvy's shared contracts first: HarvyDex UUID rules, Ontoly object/link/evidence schemas, connector protocol, HQL versioning, identity/authorization context, global UI tags, and feature-flag evaluation.
3. Keep the existing V2 execution model where useful, then connect it to Automation through a narrow, authenticated job/connector interface. Avoid building parallel schedulers or source-specific logic into product Workers.
4. Map OpenTIR and Civic records into Ontoly incrementally, preserving source IDs, timestamps, citations, uncertainty, and original evidence. Add deduplication and entity resolution only with reviewable provenance.
5. Rebuild product queries and screens on HQL and the shared UI system. Release features through entitlements and flags; keep each feature's implementation status visible to operators.
6. Retire duplicate paths only after their data, users, schedules, and recovery procedures have been accounted for. Do not copy source code until its license and obligations are confirmed.

### Repository conflicts verified against current files

- Harvy's existing Worker configurations still bind D1 directly and do not configure Hyperdrive. The legacy supervisor config is outside the target architecture; the auth Worker remains relevant. The user's Hyperdrive-first direction therefore remains a migration requirement, not a current implementation claim.
- Civic defines a separate `cql/v1` protocol in `civontology/shared/query-spec.mjs`. Harvy's shared protocol is HQL, so retain useful query validation and safe-field allowlisting while adapting it to HQL.
- Civic's Worker config includes an `AI_SEARCH` binding in `civontology/wrangler.app.jsonc`. Harvy explicitly excludes Cloudflare Search, so do not port that binding or rely on it for Harvy search.
- Civic's Worker config owns browser and source-job infrastructure in `civontology/wrangler.app.jsonc`; the user has assigned scraping, crawling, searching, transformation, and external ingestion to Automation. Port source definitions and workflow requirements, then run external access through Automation.
- OpenTIR's source infrastructure and documentation include legacy fetcher terminology and storage/search systems that conflict with Harvy's connector vocabulary and Cloudflare/Automation boundaries. Only carry over the useful `api/v1/` product contracts and domain data after mapping them to the target architecture.
- Harvy V2 already has Better Auth and an ontology/query implementation (`harvy-platform/v2/auth/`, `harvy-platform/v2/ontology/`, and migration `0006_ontology_and_dashboards.sql`), but the repository does not yet establish HarvyDex as the global record identity or HQL as a complete shared protocol. Treat those as gaps to close, not reasons to introduce another ontology service.

OpenTIR is AGPL-3.0 licensed. The Civic source checkout has no root `LICENSE` file. Treat both repositories as feature references until code reuse rights and obligations are established; prefer independently implementing mapped behavior where licensing is unclear.
# Local workflow repair task — 2026-10-30

User task: repair local workflow/backfill defects before attaching the server MCP.
Owner: current Codex session; branch `codex/repair-workflow-backfill`. Scope:
malformed exports, invalid embedded code/graph references, simulated success,
bounded historical pagination and checkpoint orchestration. No live activation,
deployment, source collection, or migration is part of this local repair.

Nine malformed JSON exports repaired; all fifteen local exports now receive static
validation via `npm run validate:workflows`. FEMA is reconstructed as an inactive
API submission draft; GDACS/UN Data placeholder persistence and unverified cursor
helpers fail closed. The adapter-based backfill runner and regression tests cover
resume, publication failure, checkpoint replay, bounds and scope separation.
Live storage, source/proxy adapters, installed n8n compatibility and query visibility
remain pending server MCP access. See `v2/workflows/README.md` for integration gaps.
OpenChamber and reviewed Ponytail tools are unavailable in this session; no task,
issue, PR or coordination mirror was synchronized. Existing unrelated changes
were preserved. Validation: `npm run validate:workflows` passed for all 15 exports; `npm test` passed (178 tests at the first full run). A final targeted regression additionally checks that incomplete persistence/cursor steps throw. No live source data or installed n8n execution was tested.
