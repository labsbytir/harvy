# Harvy engineering and contribution standard

Status: adopted target requirements, with enforcement gaps listed below. MUST denotes a release requirement; SHOULD requires a documented reason to depart. A documented gate is not an implemented check. This file is the canonical engineering standard for all Harvy products, extensions, human contributors, and agents. Product direction and architecture live in `docs/ROADMAP.md` (the former root `HARVY-ARCHITECTURE.md` is merged there as an appendix); implementation work is tracked in `docs/ROADMAP.md`. Keep decisions here instead of creating competing standards or plans.

**Terminology (2026-10-30):** source integrations are called **workflows** in docs, UI, comments, and paths; legacy identifiers (`connector_id`, `src_<slug>`, `v2/catalog/connectors/` reference code) stay until a reviewed migration. Never write artifacts, SDK files, or downloads to the repo root — workflow definitions belong in `v2/workflows/`; R2 is the only artifact store.

## 1. Repository, issues, branches, forks, and merges

Harvy V2 is the runtime base. The OpenTIR and Civic checkouts are reference sources; importing their behavior requires contract mapping and license review. Develop within the actual Git root returned by `git rev-parse --show-toplevel`; do not hard-code a developer's filesystem path. Keep production code under `v2/`.

- Every substantive change MUST reference an issue or recorded user task containing the problem, desired behavior, acceptance criteria, affected contracts, data/access impact, owner, and exclusions. Security reports use the private reporting procedure rather than public issue payloads. Existing bug, workflow, API, and feature issue forms remain the entry points.
- Keep `main` releasable. Use short-lived `codex/<issue-or-task>-<slug>` branches for agent work and `feat/`, `fix/`, or `docs/` for other contributors. Each branch has one accountable owner. Use separate worktrees for parallel write tasks and record their base revisions.
- Forks are for external contributions or intentional experiments, with a documented upstream/base and license provenance. They MUST NOT become competing production cores. Fork PRs receive no production secrets, privileged runners, or write tokens. Never run untrusted fork code with privileged `pull_request_target` credentials.
- A PR has one coherent outcome, a linked task, a description of observed behavior, affected contracts, evidence, migration/recovery instructions, and documentation changes. Open a draft while incomplete; unresolved required checks mean it remains unmergeable.
- Default merge strategy is squash with a Conventional Commit title, such as `feat(newsk): add source-scoped historical queries`. Preserve issue and contributor attribution. Rebase only a branch you own; coordinate shared branches and never rewrite `main`. Resolve conflicts by checking both intended behaviors and rerunning affected checks.
- Require at least one independent human approval. Auth, tenancy, secrets, schema migrations, AI permissions, build/release tooling, and shared contract changes additionally require the relevant code owner; one person may satisfy both roles. An AI review is evidence, not human approval. Dismiss stale approvals when the reviewed change is materially altered.
- Protect `main` using required PRs, trusted status checks, code-owner review, resolved discussions, and protection against force-push/deletion. Keep CODEOWNERS entries tied to actual maintainers rather than placeholder handles. GitHub settings and CODEOWNERS ownership remain rollout tasks until configured and verified.
- Check the proposed merge result against current `main`. Use a merge queue when available; otherwise refresh the base and rerun checks before merge. An old green branch run does not establish compatibility with a newer base.
- Releases identify the commit, immutable build artifact, contract versions, migration set, feature state, and recovery target. Merging does not itself authorize production deployment, remote migration, purchases, or account changes. Use explicit user authorization or a separately approved release policy.

## 2. Coding standard and shared source

Python is preferred for Automation processing; TypeScript is preferred for Workers, browser code, and shared typed clients. Node.js is a runtime, not another schema language. Pin supported runtime/tool versions and use committed lockfiles. Do not install or execute floating `latest` tooling in CI. Upstream tool updates use dependency PRs with license and behavior review.

- TypeScript uses strict typing. Treat external data as `unknown` until validated; avoid unchecked `any`, suppressed errors, or non-null assertions at boundaries. Python uses type annotations for public boundaries and typed models generated from shared schemas. Apply ESLint/Prettier to JS/TS and Ruff plus a pinned Python type checker to Python when the lint rollout is installed.
- Use UTF-8, LF, final newlines, two-space JS/TS/JSON/YAML indentation and four-space Python indentation. Match existing code when an unrelated file differs; do not combine mass formatting with a feature. Public JSON uses `snake_case`; generated adapters map internal language conventions without rewriting payload semantics.
- Keep business rules in domain services, boundary validation in adapters, and configuration in the shared config package. Reuse existing functions and libraries before adding a framework. Handle errors explicitly; never swallow failures, log credentials, or label incomplete work as success.
- Use parameterized database queries, bounded resource use, cancellation/deadlines, and explicit input/output schemas. Every network call has a timeout and a declared retry policy. User-controlled URLs need SSRF protection, including redirects and private/link-local targets.
- Comments explain non-obvious reasons; public contract documentation explains behavior, examples, constraints, and failures. Generated files carry a generation command and source reference and MUST NOT be hand-edited.
- Tests verify behavior and risks: authorization, data integrity, retries, compatibility, and meaningful user outcomes. Fixes include a regression case where practical. Do not pad coverage with assertions that restate the implementation.

The shared configuration source is designated `v2/shared/src/config/`; shared contract definitions live in `v2/shared/schemas/`. These are target locations, not a claim that the packages exist. Generate TypeScript and Python consumers from the same schema and approved defaults. The corresponding `docs/` pages explain each variable but are never parsed as runtime configuration.

Each variable declares its type, owner, default, valid range, sensitivity, restart/reload behavior, and whether tenants may override it. Resolution order is approved defaults → validated environment config → authorized tenant preferences; security limits remain caps that a tenant cannot raise. Secrets are references resolved separately. Validate required values at startup and reject unknown configuration keys in production. A global configuration revision is attached to jobs and releases for reproducibility. All products use this resolver; they do not read arbitrary environment variables throughout their code.

## 3. Expandable repository filesystem

This tree designates ownership and extension points. Existing files remain where they are until moved with their callers and build configuration. Create directories when a component needs them; do not scaffold empty services or rename live resources to match a diagram.

```text
AGENTS.md                       # short instructions linking this standard
CONTRIBUTING.md                  # submission entry point
.github/                        # PR/issue templates, ownership, existing CI
docs/                           # canonical human and machine-readable documentation sources
  DEVELOPMENT.md                # this standard
  ROADMAP.md                       # single implementation backlog and decision status
v2/
  shared/
    schemas/                    # config, manifests, records, events, HQL, tool schemas
    src/                        # shared TS libraries, config, generated client entry points
    python/                     # generated Python models and shared adapters
  catalog/
    workflows/<workflow>/     # manifest, config schema, adapter source, fixtures
    components/                 # product/domain/agent/tool registrations
  automation/                   # external-server executor and workflow host
  api/                          # Harvy product API Worker; target for Newsk
  auth/                        # existing Better Auth integration
  ontology/                    # Ontoly model, actions, queries
  projector/                   # existing analytical projections
  products/<product>/          # Tower, Ops, Civic, Newsk domain/UI compositions
  cli/                         # Harvy operator/developer client
  mcp/                         # MCP adapter to the same authorized domain services
  migrations/                  # existing D1 ledger; future engine ledgers isolated beneath it
  scripts/                     # generation, preflight, build, migration utilities
  tests/                       # shared contract and integration fixtures
styles/                        # existing CSS source
tests/                         # existing Python and cross-cutting tests
```

Every module follows its registered contract and declares exports, dependencies, owner, and tests. Prevent circular imports and product-to-product implementation imports. Filesystem paths are not permissions. Large source data, generated evidence, runtime uploads, secrets, local agent memory, and build caches do not belong in Git. Keep only small synthetic fixtures with declared provenance.

## 4. Core database and safe table expansion

Production topology: Cloudflare hosts the web, auth, and API Workers plus R2; PostgreSQL runs on the user's database server and is reached from Workers through Hyperdrive; the separate VPS n8n system executes workflow workflows. D1 is only the current local/test adapter, not the production authority. The Wrangler configs now declare a `HYPERDRIVE_PRIVATE` binding (`v2/auth/wrangler.jsonc:18-23`, `v2/api/wrangler.jsonc:20-25`) and `v2/shared/sql-database.ts:160-187` implements a tested dedicated-client batch path, but the Better Auth adapter is still D1-bound (`v2/auth/auth.ts:199-208` returns an empty `drizzleAdapter` when `HARVY_D1` is absent) and no database connection is provisioned or verified, so auth/API deployment remains blocked until the adapter, migrations, and secure connection are implemented. Do not deploy a second D1 authority. [Hyperdrive documentation](https://developers.cloudflare.com/hyperdrive/)

Partition the target database by ownership. Table names below are a logical contract to implement, not a migration to run against existing D1:

| Schema/domain | Core entities and constraints |
|---|---|
| Identity | Better Auth owns users, accounts, sessions, organizations, and membership internals. Map existing provider/auth IDs to HarvyDex IDs through a unique identity mapping; do not rewrite authentication IDs in place. |
| `core` | Tenants, workspaces, access scopes, global record identities, component/schema registry revisions, configuration revisions, and identity mappings. Every tenant workspace belongs to exactly one tenant. |
| `access` | Permissions, roles, role-permission links, scoped principal-role grants, resource grants, policy revisions, feature definitions, plan entitlements, and rollout revisions. Membership alone does not grant every resource permission. |
| `ontoly` | Object/link type versions, objects, links, external identifiers, observations, evidence, source references, and revision/lineage records. Tenant-owned objects and shared canonical objects have explicit distinct access scopes. |
| `ops_runtime` | Connector registrations, runs, attempts, checkpoints, upload sessions/parts, artifact manifests, publication releases, idempotency records, and durable outbox entries. |
| `audit` | Actor, action, scope, target, timestamp, decision, trace, and safe change references. Append-only under normal operation with governed retention/redaction. No secret payloads. |
| `ext_<domain>` | Product extensions such as Newsk assignments or Civic meeting details. They reference shared identities and own their tables, migrations, indexes, and retention rules. |

Persistent domain rows have `id` (HarvyDex UUID), explicit `scope_id`, schema version, timestamps, and revision where mutable. Represent a scope as either tenant-owned (required tenant ID, optional valid workspace) or explicitly shared (approved shared policy); enforce the allowed combinations with database constraints. Missing scope is invalid. Shared observations do not make tenant notes or saved queries shared. A record-identity registry provides a consistent UUID/type/scope reference; benchmark its indexes and partitioning before scale, and retain existing IDs during migration.

Enforce cross-scope references with composite unique keys and foreign keys such as `(scope_id, object_id)`. Links across an explicitly shared scope use a documented sharing relation and authorization check, never a guessed tenant ID. A domain can add a typed extension table keyed to an existing Ontoly object; it cannot add arbitrary product columns to core tables or write another domain's tables. Core exposes stable actions and views. JSON properties are schema-validated for flexible attributes, not a substitute for ownership, keys, or required constraints.

Use database row-level policies as defense in depth in PostgreSQL, alongside application enforcement. The runtime role must not own protected tables or have bypass privileges. Bind the verified scope inside each transaction, reset scope on pooled connections, and test concurrent reuse across tenants. Scope-dependent queries must not use Hyperdrive query caching unless its cache semantics are proven safe for that context; disable it for those paths by default. Apply D1 scope predicates explicitly during the transition rather than assuming D1 has PostgreSQL row-level security.

New-table acceptance requires an owner, schema/version registration, scope and authorization rules, primary/foreign keys, indexes tied to expected queries, retention/deletion behavior, size/growth estimate, migration, and permissions tests. Database roles prevent extension authors from altering core schemas. Adding a table does not automatically expose it through HQL, APIs, or MCP. Customer data has no export/download surface.

Migrations use expand → backfill → switch → contract. Apply additive changes first, bound batches and locks, preserve UUIDs, verify counts/integrity, and only remove old structures after all readers and in-flight work migrate. Never modify a migration already applied to an environment. Keep separate engine-specific migration ledgers and one deployment sequence. Define backup/restore and forward-recovery procedures; reversing application code does not reverse stored data. Rehearse migrations locally or in an isolated environment before production authorization.

## 5. Data filesystem: raw, processed, query

Use logical stages independent of physical bucket names. The V2 target uses `harvy-raw`, `harvy-artifacts` for processed records, and a separate Basin catalog bucket; the catalog bucket name must be confirmed before provisioning. Bucket and prefix selection comes from shared configuration. An artifact catalog maps logical URIs to actual objects; customers see authorized records in-app, never raw object handles or bucket credentials.

```text
<stage>/<environment>/<scope>/<source_id>/<schema_version>/<YYYY-MM-DD>/<run_id>/<artifact_id>.<format>
```

`stage` is `raw`, `processed`, or `query`; `scope` is an opaque tenant/workspace or approved shared-scope identifier. Use safe registered IDs, never personal names, access tokens, caller-supplied paths, or traversal sequences. Partition on bounded fields such as date/source; avoid tiny files or one partition per record. These prefixes organize objects and do not enforce tenant security.

| Stage | Representation | Publication rule |
|---|---|---|
| Raw | Original bytes; JSON/NDJSON where the source actually uses JSON, otherwise preserve the original PDF, HTML, image, audio, or other format. | Write a capture manifest with source, scope, times, media type, byte length, hash, and source-use policy. Append new versions instead of replacing evidence, except governed deletion. |
| Processed | Validated normalized JSON/NDJSON plus extraction/media artifacts when needed. | Record input artifact IDs, transformer/version, schema, counts, invalid-row disposition, time/units, and confidence/provenance. Preserve source and derived values separately. |
| Query | Typed Parquet data files in catalog-managed Iceberg tables for analytics. | Convert validated JSON/NDJSON with explicit field/null/time/decimal rules. Publish through the catalog transaction/snapshot only after validation; a loose Parquet file is not automatically a queryable table. |

Basin Pipelines/Catalog/SQL provide the analytics path; actual object layout for catalog-owned tables follows the catalog's writer, with the logical artifact mapping recording its location. Do not manually rewrite catalog-owned files or metadata to force the prefix convention. Preserve lineage from snapshot to processed and raw artifacts. File conversion is bounded and chunked; compaction targets are configured and measured rather than assumed. [Basin overview](https://developers.cloudflare.com/basin/)

Every release manifest records schema and transform versions, scope, files, size/hash, row counts, source coverage, allowed use, and publication status. Validate decimal precision, timestamp zones, nested values, missing/null semantics, and rejected-row counts during JSON-to-Parquet conversion. Query results identify the snapshot/freshness used. Parquet analytics can lag operational writes; expose that lag. Do not use analytics as the authority for access revocations.

Enforce isolation when writing, reading, and caching all three stages. Customer-facing product data has no export/download path or raw R2 object handles; authorized query responses are limited to in-app rendering. Tenant deletion and source corrections cover derived files and historical snapshots according to policy; old Iceberg snapshots must not remain a public route to removed data. Record any required physical cleanup separately from immediate access denial. Staging and quarantined objects have expiry and never appear in regular queries.

## 6. Streaming upload and ingestion rules

All uploads start with an authorized upload-session request that allocates an ID, scope, destination, permitted media types, byte/part limits, expiry, quota reservation, and idempotency key. Support direct R2 multipart upload through short-lived signed requests for large objects, or a streaming Worker path when appropriate. Never read an unbounded body into a string, JSON value, or memory buffer. R2 multipart uploads support resuming failed parts; provider limits are checked against current docs during implementation. [R2 upload methods](https://developers.cloudflare.com/r2/objects/upload-objects/)

1. Preflight validates authentication, upload permission, entitlement, storage quota, accepted format, allowed size, and expected metadata. Content length is a hint until enforced against observed bytes. Check authorization again at completion.
2. Reserve a server-generated key and issue part grants limited to that upload. Signed URLs are bearer capabilities: keep expiry short and never log them. Client input cannot choose another tenant's prefix or completion manifest.
3. Stream with backpressure and bounded concurrency, per-part buffers, timeouts, retries with jitter, cancellation, and progress checkpoints. Limits include expanded archive bytes, nesting, file count, decompression ratio, and processing CPU/time. Unknown-length streams stop at the approved byte ceiling.
4. Track part numbers and provider ETags durably. ETags are not assumed to be whole-file SHA-256 values. Verify expected length and cryptographic integrity using supported checksums or a bounded verification pass; a client-supplied hash alone is insufficient.
5. Complete once, idempotently, against the authorized part list. Reconcile an interrupted completion by inspecting durable upload/object state. Upload state follows `created → uploading → verifying → ready`, or `failed`, `aborted`, `expired`, or `quarantined`. Processing/publication has a separate state and cannot be inferred from HTTP upload success.
6. Scan and validate before exposing content; parsers run with restricted resources and no arbitrary egress. Publish the artifact manifest and durable ingestion event only after acceptance. Queue retries reuse the same artifact identity. Garbage-collect expired multipart sessions and abandoned staging objects with an audited cleanup job.

Use configured limits per plan/source; the standard does not grant unlimited upload sizes. An upload's signed URL revocation limitations are reflected in its expiry; removing application access immediately prevents completion and read access even if a previously signed part URL remains temporarily usable.

## 7. Endpoint, HQL, CLI, and OpenAPI management

One operation registry owns stable operation IDs, routes, input/output schemas, permissions, feature keys, idempotency, cost/size bounds, error codes, pagination, lifecycle status, and owner. Public product endpoints use `/api/v1/`. Existing internal routes and protocol-owned callbacks are inventoried and adapted deliberately; Better Auth callbacks and MCP transport are not arbitrarily rewritten as product resources.

Generate OpenAPI, typed clients, CLI bindings, and MCP operation mappings from the shared contracts. Select and pin a supported OpenAPI release in the generator configuration; upgrade it only with generator/client compatibility evidence. Do not make builds follow a moving `latest` specification. CI compares the route inventory, schemas, examples, and generated output to detect undocumented endpoints or drift. [OpenAPI specification](https://spec.openapis.org/oas/latest.html)

Common middleware establishes request/trace IDs, authentication, trusted scope, authorization, entitlements, input limits/validation, quotas, idempotency, audit, and safe error output. Handler services receive this context explicitly. Responses define HTTP status semantics, cursor limits, stable ordering, timestamps, and safe error details. Webhooks require signature validation, timestamps/replay limits, and idempotent processing. Async operations return a run reference; cancellation and status endpoints follow the same permissions.

Unknown organization roles receive no capabilities. The local D1 run registry currently enforces 20 attempts and 500 registered page units per tenant per UTC hour (100 pages maximum per run); failed attempts count, while idempotency retries reuse one row. It claims dispatch for 30 seconds to prevent concurrent duplicate sends. These are conservative code defaults, not measured provider quotas; validate them against approved source and provider budgets before enablement.

Run recovery contract: repeat an ambiguous submission with the same idempotency key and canonical run ID; n8n must deduplicate by run ID. n8n owns provider-call retries: at most one retry for a transient 429/5xx/network error when `Retry-After` fits within the 300-second run deadline; do not retry permanent auth, permission, schema, or other 4xx failures. A terminal failed/partial run is never reopened. An explicit retry creates a new run linked to its predecessor, uses the same immutable source snapshot only while the source remains approved, enabled, and on the same config revision, and consumes the normal tenant quota. Do not expose run cancellation until the existing n8n workflow supports an authenticated cancellation request and acknowledgment; pausing a source prevents new dispatches but does not claim to stop an active run. The local API now leaves ambiguous transport failures queued as `dispatch_unconfirmed` and supports same-key redispatch after the lease; the n8n deduplication contract and provider retry remain unverified live, and linked terminal retry is still pending.

Only source rows with an approved status, approver, and timestamp can be enabled. Tenant owners/admins may pause or resume an already approved monitor using an expected revision; each state change is audited. The API does not let tenant users create or approve targets. For initial launch, collect bounded real observations through the existing workflow before finalizing cross-source identity, merge, duplicate, contradiction, or correction rules; preserve each observation and its provenance meanwhile.

HQL is a versioned, typed JSON query document over registered Ontoly semantics. It declares object types, selected properties, predicates, relationships, measures, grouping, ordering, page cursor, snapshot/as-of requirements, and resource bounds. The grammar permits only registered operators/functions; no raw SQL strings, arbitrary code, tenant overrides, or model-generated executable fragments. Drizzle Cube builds these documents. Backend compilers map them to transactional or analytical engines after permission filtering. Reject unsupported cross-engine joins explicitly until a bounded, governed federation implementation exists.

The Harvy CLI is a client of the same API/domain operations, not a customer-data export surface. Target commands may include `harvy auth`, `harvy workflows`, `harvy runs`, `harvy features`, and `harvy doctor`; do not add query-result file/NDJSON output or data download commands. These names are a CLI specification, not currently installed commands. Require explicit environment selection for writes, progress on stderr, stable exit codes, pagination, cancellation where supported, and dry-run support for consequential operations. Credentials come from an approved OS credential store or secret injection, never source files or CLI arguments. CLI authentication cannot bypass tenant policy or protected deployment approval.

## 8. Multi-tenancy and granular permissions

An organization is the customer tenant. Workspaces subdivide a tenant; development/staging/production are deployment environments and MUST NOT be overloaded as customer IDs. Explicitly approved shared Ontoly data may be read by authorized tenants; their private objects, overlays, monitors, uploads, prompts, notes, and derived outputs remain private. A matching public entity name never promotes private data into the shared dataset.

Use RBAC for job roles and granular resource/attribute policy for specific actions. Suggested built-in role bundles are tenant owner, tenant admin, editor/analyst, viewer, and service operator. They map to registered permissions such as `ontoly.object.read`, `ontoly.object.update`, `workflow.run`, `member.manage`, and `feature.manage`; no customer-data export permission exists. The bundles must not hard-code product-specific superuser bypasses.

An authorization decision evaluates principal, tenant membership, workspace scope, action, object/property access, source restrictions, and applicable policy conditions. Missing grants deny access; explicit deny overrides allow. Field masking, row filters, and relationship traversal apply to HQL, APIs, CLI, MCP, agents, caches, and background tasks. No customer-data export is allowed through any of these surfaces. Organization admin status does not automatically grant platform administration or provider secrets.

Service principals receive expiring, bounded grants. Async jobs retain actor attribution and reauthorize when permissions change. Platform support access is explicit, time-limited, reasoned, audited, and revocable. Test cross-tenant UUID guessing, shared/private links, upload completion, denied export attempts, pooled DB connections, search facets/counts, cache keys, agent memory, and derived artifacts for leakage.

## 9. Uniform feature management

Keep feature definitions in the shared catalog: stable key, owner, purpose, product, dependencies, required permissions, default, lifecycle, rollout method, kill switch, and audit policy. Separate a customer's purchased entitlement from operational rollout and user authorization.

Access is granted only when authorization AND source rights AND entitlement AND rollout allow it. Emergency disable wins. Within allowed entitlements, apply documented environment/cohort rules and authorized tenant/user overrides; a flag override cannot expand a permission or purchased plan. Deterministic cohort hashing uses a stable opaque ID and a versioned rule. Preview flags have owners and removal dates.

Evaluate on the server and return a safe capability view to the UI. Cache decisions only for an approved bounded TTL with policy/entitlement revision and tenant context; invalidate on revocation. Sensitive operations recheck current authority. Log decision reason codes and revision without sensitive targeting data. Record flag changes, actor, before/after, and rollout/recovery outcome. Better Auth supplies identity; Harvy owns these feature semantics. In the current V2, product grants are changed only for users allowlisted by `HARVY_ADMIN_USER_IDS`; organization ownership alone cannot grant a product. The grant audit table is local code, not a live audit service.

## 10. Keys, secrets, and outbound collection mandate

Cloudflare Secrets Store is the configured managed secret source; workloads receive scoped bindings or approved short-lived injection. Automation uses an authenticated secret delivery mechanism appropriate to the external host; do not assume it can directly use a Workers binding. Credential metadata (owner, scope, provider, expiry, rotation status) lives in the registry; secret values do not.

Separate development, staging, production, platform, and tenant credentials. Use least privilege, expiry, rotation with overlap where necessary, audited retrieval, and immediate revocation procedures. Store a non-reversible verifier for Harvy-issued API keys; third-party credentials that must be recovered require managed encryption/secret storage. Keep secret material out of client bundles, docs, traces, prompts, compression caches, exception strings, and URLs. Secret scans run before submission and in CI. Never print a proxy URL containing credentials during diagnosis.

**Every crawl/scrape/link-discovery run MUST pass the VPS n8n workflow's Spider and Webshare preflight before starting.** The run contract requires preflight and sets `direct_fallback_allowed: false`; the workflow must reject any request without verified proxy egress. Check workflow registration, bounded target/scope, source access, secret references, Spider Unlimited route, concurrency/rate allowance, validated proxy configuration, and a safe proxy connectivity check. Use `/unlimited/scrape`, `/unlimited/crawl`, or `/unlimited/links` as applicable; honor `429` and retry guidance. No silent fallback to direct crawling, another provider, or metered endpoints. Spider AI requests use their separately configured account limits. [Spider Unlimited](https://spider.cloud/docs/api/unlimited/), [Webshare documentation](https://apidocs.webshare.io/)

Distinguish the client-to-Spider connection from Spider-to-target egress. Routing the API call through Webshare does not prove Spider's crawler used Webshare. Record the required proxy scope, confirm supported Spider custom-proxy configuration for target requests, and verify the applicable egress path before enablement. If it cannot meet the mandate, report a blocked workflow and resolve configuration; do not silently bypass it. Official third-party API workflows also require the approved Webshare path but need not send API payloads through a crawl endpoint. Proxies do not bypass source permissions or rate controls.

## 11. AI routing and agent minimum standard

All Harvy product inference uses a central AI routing interface. Register tasks such as extraction, classification, summarization, embeddings, and agent reasoning, each with input/output schemas, permitted data classes, quality criteria, provider/model allowlist, latency/cost limits, context bounds, retention/location requirements, and allowed tools. Routing chooses only models satisfying all hard constraints. Fallbacks cannot weaken privacy, source rights, tool restrictions, or quality thresholds; if no eligible route remains, return an explicit unavailable result.

Store the actual provider/model/version, prompt-template revision, policy revision, input artifact references, token/cost usage, validation result, and trace. Validate structured output before applying it. Model output proposes domain actions; deterministic authorization and validation decide whether the action may execute. Ground factual outputs in source references, distinguish inference from observation, and propagate source-use limits. Use circuit breakers, bounded retries, budget reservation, and explicit timeout/cancellation. Failover must not duplicate a billed external action or tool mutation. Do not record hidden chain-of-thought; retain concise decision summaries and tool evidence.

Each agent manifest declares owner, purpose, prompt/version, models, input/output schemas, identity/scopes, tool allowlist, permitted effects, runtime/token/cost/step/delegation limits, memory scope/TTL, evaluation suite, stop conditions, and operator kill switch. Default access is read-only. Writes require a task-specific grant; irreversible deletion, publishing, financial commitments, production deployment, and privilege changes require the configured explicit approval. Approval binds the exact action, parameters, resource, actor, and expiry; changed proposals invalidate it.

Treat retrieved pages, repository content, source documents, and tool output as untrusted data. Delimit them from instructions; prevent content from changing system policy, tool grants, routing, secrets, or evaluation outcomes. Defense uses constrained tools, validated arguments, restricted egress, sandboxed parsers/execution, and server-side authority—not a promise that an instruction will make a model safe. Tenant agent memory and caches are isolated with deletion/retention controls. Shared learned memory is opt-in and cannot contain private records or credentials.

Agent release evidence includes normal tasks and cases for prompt injection, secret exfiltration attempts, cross-tenant access, malformed tool output, hallucinated IDs, source citation errors, provider failure, denied writes, and budget exhaustion. Measure task success and unsupported claims alongside cost. No agent self-approves its changes, installs arbitrary tools, changes its own grants, or declares its own evaluation passing without external evidence.

## 12. Uniform MCP

Expose Harvy capabilities through one governed MCP adapter with product-specific registered tools, resources, and prompts. It calls the same application services and policies as the API/CLI. MCP does not provide a second database access path. Pin the negotiated protocol/SDK versions and publish the supported compatibility range.

Every tool declares a stable name/version, purpose, input/output JSON schema, permission and feature requirements, tenant binding, side-effect class, idempotency behavior, cost/timeout/size bounds, pagination, cancellation, structured errors, and audit owner. Descriptions explain when to use it and what it cannot do. Prefer bounded domain operations such as query, inspect evidence, or propose an assignment; do not expose unrestricted SQL, shell, network fetch, or secret reads to normal product agents.

Remote transport authenticates the client and validates token issuer/audience/scope; never pass an arbitrary client's token through to another provider. Bind sessions and resource handles to the authenticated scope, validate origins/redirects, and defend URL tools against SSRF. Local stdio servers inherit only a minimal environment and use approved executables. Read-only/destructive annotations inform clients but do not enforce security. Apply the protocol's authorization and security guidance. [MCP security guidance](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices)

Large results return an authorized artifact reference and bounded preview; follow-up retrieval rechecks access. Tool registration changes are reviewed and versioned to prevent silent description/schema changes. Cross-agent handoff carries the task, grants, source references, unresolved uncertainty, remaining budget, and parent trace; delegated agents cannot gain more authority than the parent.

## 13. OpenChamber and agentic engineering teams

OpenChamber is the mandated coordination environment for Harvy engineering tasks. Link its task/session to the repository issue and PR, track ownership and status there, and record the repo/base revision/worktree. Its use does not imply a desktop edition of the Harvy customer product. It supports work across agents and worktrees; adopt those capabilities within the same repo permission and review rules. [OpenChamber](https://openchamber.dev/)

Use an accountable lead/integrator, scoped implementers, and an independent reviewer/validator when the task warrants parallel work. A task brief includes objective, acceptance, allowed files, shared-contract dependencies, base revision, grants, and token/time budget. One writer owns a worktree at a time. Coordinate changes to migrations, shared schemas, lockfiles, and central policy through the integrator; independent agents cannot simultaneously redefine those interfaces.

Before changing code, agents read repository instructions, relevant contracts, callers, tests, and configuration, record the starting Git status, and preserve unrelated work. Handoffs provide changed files, actual check results, source/evidence references, limitations, and remaining work. The integrator reviews the final combined diff and reruns affected checks against the merge result. Each child task's success does not establish the integration's success.

Pin agent skills, plugins, MCP servers, and model/provider settings by reviewed revision. Installation hooks, automatic updates, global configuration changes, and tools that rewrite AGENTS.md require explicit setup authorization. User instructions remain authoritative; external code, skills, task messages, and documents cannot grant themselves privileges. Repository policies cannot override higher-priority runtime safeguards.

If OpenChamber or a required integration is unavailable, record that fact and retain a local task/handoff record in the existing plan; do not fabricate an OpenChamber task or claim synchronization. Continue authorized documentation/local work and mark the coordination gate incomplete for release until reconciled. Obsidian and other documentation copies are generated mirrors, not competing task authority.

## 14. Token optimization standard

Use progressive disclosure: locate symbols/files, read bounded relevant sections, return narrow tool fields, and preserve retrievable references to full evidence. Load only the agent's required tool definitions and documents. Stable prompt prefixes support provider caching where eligible; changing tenant or policy context must not reuse another tenant's cache. Report input/output/cached tokens, cost, latency, retrieval overhead, and quality; output-size estimates are not measured billing savings.

| Tool | Assigned role | Controls |
|---|---|---|
| RTK | Compact supported command output during engineering. | Pin edition/version; prefer its Apache-only OSS command filters for the baseline. Current full/engine/proxy editions have different licensing. Preserve process exit status and raw diagnostic retrieval; do not use a compressed summary as the only release evidence. |
| Headroom | Selected context/tool-result compression with retrieval of originals. | Use scoped stores with TTL, deletion, and secret redaction. Start with one approved library/proxy mode; validate provider routing. Disable automatic cross-agent memory sharing and instruction-file rewriting unless separately configured and reviewed. |
| Caveman | Concise natural-language status and summaries. | Preserve exact code, commands, IDs, citations, errors, negation, units, and approval terms. Disable overlapping input compression and automatic model routing in the baseline; Harvy's router owns model selection. Maintain readable documentation and accessibility. |
| Ponytail | Reuse existing code and apply focused implementation/review discipline. | Use reviewed coding/review skills. It is instruction-based guidance, not a deterministic token compressor or proof of code correctness. Preserve validation, security, and meaningful tests. |

Do not stack transformations blindly. The baseline uses RTK on shell output, Headroom only on eligible context not already reduced unless separately evaluated, Caveman for prose, and Ponytail for coding discipline. A compression record tracks original reference/hash, method/version, scope, token estimates, and retrieval path. Exact schemas, approval requests, policy constraints, critical error details, and source quotations must remain available without lossy transformation. Missing originals force an explicit incomplete-evidence result rather than fabricated reconstruction.

Validate against an uncompressed baseline using representative Harvy coding, querying, extraction, and security tasks. Adoption requires no regression in required security/contract cases and a documented acceptable task-quality threshold. Savings goals are measured targets, not upstream marketing guarantees. Stop a compression/routing experiment if failures, total cost, or latency outweigh its benefit. Pin licenses and upstream revision before installing hooks or shipping any optimizer in Harvy.

Sources reviewed: [RTK](https://github.com/rtk-ai/rtk), [Headroom](https://github.com/headroomlabs-ai/headroom), [Caveman](https://github.com/JuliusBrussee/caveman), [Ponytail](https://github.com/DietrichGebert/ponytail). This standard assigns integration roles; it does not assert that these tools are installed or jointly verified.

## 15. Documentation for people and language-model consumers

Write one canonical page per concept with stable URLs, clear names, a direct answer, scope, definitions, a working example, constraints, errors, source references, version, and last-reviewed date. Distinguish implemented behavior from preview, proposed, deprecated, or unavailable capability. Keep product names and API terminology consistent across UI, docs, OpenAPI, CLI help, and MCP descriptions.

Publish accessible rendered HTML and equivalent Markdown, an index/sitemap, per-version API docs, generated schemas, and curated `/llms.txt` links to authoritative public pages. Treat llms.txt as an emerging discovery convention, not an authorization mechanism or a guarantee of search ranking/model ingestion. Use relevant structured metadata only when it accurately describes the visible page. Do not invent credentials, citations, reviews, or capabilities to improve discovery. [llms.txt proposal](https://llmstxt.org/)

Organize topic-sized pages so a model can retrieve the needed context without loading the entire repository. Use explicit units, timestamps, null semantics, runnable synthetic examples, and stable links. Private tenant documentation and records remain authenticated and excluded from public indexes. Public documentation never exposes internal keys, private endpoints, incident data, or tenant information. Generate references from shared contracts and reject stale examples during checks.

## 16. Preflight, lint, and submission procedure

The target unified commands are `npm run lint`, `npm run preflight -- --profile <docs|code|core>`, and a full CI gate. They must be implemented with pinned tools and shared check definitions; they are not present merely because this standard names them. A required checker that is missing or unable to run reports BLOCKED and a nonzero status, never PASS. Reports distinguish PASS, FAIL, BLOCKED, and justified NOT_APPLICABLE, with commit/base, tool versions, command, duration, and artifact references.

| Gate | Required checks |
|---|---|
| Startup | Correct repo/worktree, task scope, applicable AGENTS.md, toolchain/lockfile consistency, existing modifications, secrets/config availability by reference, no unintended live targets. |
| Docs | Markdown/link checks, examples/schema references, terminology/status consistency, secret scan, and diff whitespace checks. |
| Code | Docs gate where affected; ESLint/Prettier, Ruff/Python typing, TypeScript checks, unit/regression tests, relevant builds, generated-file drift, dependency/license and secret scans. |
| Core/security/data | Code gate plus schema/API/HQL/MCP compatibility, tenant/role/flag negatives, upload/retry integrity, migration rehearsal/recovery, and affected agent adversarial evaluations. |
| Integration/release | Check the combined merge revision; verify artifact provenance, actual CODEOWNERS approvals, unresolved findings, migration/runbook completeness, staging evidence, and explicit release authority. |

Local hooks provide early feedback; trusted CI enforces release policy because hooks can be skipped. Checks must inspect the actual final diff and dependent modules, not just files named by the author. Prevent shell pipelines or output compressors from converting a failed command into a passing check. Keep full sanitized logs as access-controlled artifacts for a defined retention period. Test selection is based on impact; broad suites rerun when shared contracts or new failures justify them.

Submission sequence:

1. Read the issue/user task and capture acceptance criteria. Record base revision and existing work; choose the branch/worktree and OpenChamber task ownership.
2. Inspect affected callers, schemas, tests, configuration, and source terms. Record contract/data changes and recovery in the existing plan or issue before broad implementation.
3. Implement the smallest complete change, update fixtures/contracts/generated outputs, and add meaningful tests for new behavior and risk. Update canonical docs and changelog when user behavior changes.
4. Run the applicable preflight profile or the available individual commands below during rollout. Capture exact results and explicitly identify missing gates; do not label a partial check set as a full preflight pass.
5. Review the entire diff for unintended changes, secrets, unsafe permissions, stale examples, licenses, and unbounded resource use. Conduct the Ponytail review with its installed approved skill and retain actionable findings. An unavailable skill is reported, not simulated as a completed review.
6. Submit a PR when authorized, using the template. Include issue/task, problem and resulting behavior, changed contracts, tenant/AI/source impact, check evidence, migrations/recovery, documentation, and known limits. Disclose material agent-generated changes and tools used without dumping private prompts.
7. Resolve review comments, rerun affected checks after edits, and obtain required independent approval on the current revision. Merge only through protected checks. Record the resulting commit and release state back to the task.
8. Deployment is a separate authorized step: promote the reviewed artifact, run approved migrations, observe agreed health/quality criteria, and apply the recovery plan if needed. Close the task only when its stated acceptance criteria are actually met.

## 17. Adoption status and verified gaps

As inspected on 2026-10-29: `npm run check:local` runs main/API/auth/client typechecks, V2/auth tests, and the web build. The API and client typechecks are local additions; they do not establish unified lint/preflight, OpenAPI compatibility, secret/dependency scans, deployed-route checks, or production migration/security gates. No root ESLint/Ruff/Prettier configuration was found. Remote branch protection and installed agent tools were not verified.

The existing `v2/migrations/0006_ontology_and_dashboards.sql` uses D1 text IDs, JSON attributes, and `environment_id` with a `shared` default for observations/links. New local product tables in `0007_harvy_product_core.sql` add explicit tenant/workspace/product scopes and composite references; a local SQLite test rejects cross-tenant and cross-product evidence links. The migration has not been applied remotely and no two-live-tenant API/Worker test exists. Existing records must be classified before private multi-tenant behavior can be claimed. The D1 config is not a deployed PostgreSQL/Hyperdrive implementation.

OpenChamber remains the required coordination target; this implementation is tracked as an unfinished project todo. HQL has a bounded local Events/Evidence compiler, but OpenAPI generation, broader schema/config generation, the PostgreSQL adapter and provisioning needed for launch, CLI/MCP, streaming uploads, and the full preflight pipeline remain tracked work in `docs/ROADMAP.md`. Local tests do not enforce production policy.

## 18. Uniform n8n integration standard

The user already has n8n installed. Reuse that instance and its existing workflows after inventory; do not reinstall, change its database, rotate its encryption key, or introduce a new workflow engine as part of routine workflow onboarding. Installed version, edition, node packages, persistence, access controls, and active workflows must be inspected before assuming compatibility. The hackathon's time-bounded capability scope is recorded in ROADMAP.md and does not waive this section's security/data rules. [n8n installation options](https://docs.n8n.io/deploy/host-n8n/install-options)

### Ownership and boundaries

n8n is the user's VPS-hosted Automation runtime. Harvy's API/domain services own identity, tenant authorization, feature decisions, canonical run state, HQL, and record publication. The existing n8n workflows execute approved Spider Unlimited requests through Webshare or structured API requests through the approved proxy, perform source-specific normalization, store raw/processed artifacts in R2, and post signed status/publication callbacks. They must use only the validated run envelope and registered source configuration; they cannot grant product access or choose arbitrary targets.

Use one scheduler per monitor and one retry owner per operation. For the hackathon, n8n owns the selected monitor schedules; disable conflicting timers only after inventory and explicit activation review. Cloudflare Queues/Workflows can retain existing delivery and durable execution responsibilities. n8n must not start a second run merely because a response was delayed. Retry a dispatch with the same idempotency key and reconcile the canonical run before resubmission.

Customers use Harvy screens and APIs. They do not receive n8n editor access, workflow JSON editing, arbitrary node configuration, or direct n8n API credentials. n8n's current licensing guidance distinguishes internally controlled backend workflows from customer workflow construction/configuration, including through custom UI or agents. Verify the installed edition/license and the intended use before exposing such functionality; hiding the editor alone does not resolve this distinction. Customer monitor parameters remain validated domain inputs to fixed, team-owned jobs, not arbitrary n8n workflow definitions. [n8n license FAQ](https://docs.n8n.io/n8n-community-license/community-license/license-faq.md)

### One workflow contract

Use a registered workflow definition key, such as `harvy.automation.workflow.source_ingest`, independent of deployment. Runtime labels include environment and contract version, such as `harvy-dev-source-ingest-v1`. Keep sanitized exports and sidecar metadata under the existing `v2/workflows/`; record workflow ID, component key, owner, purpose, source commit, n8n/node versions, environment, credential references, schedules, and rollback revision. Workflow instances and executions map to HarvyDex records; retain n8n execution IDs as external identifiers.

Every dispatch uses the same validated control envelope: `contract_version`, `run_id`, `connector_id`, `source_scope_id`, `access_scope_id`, `config_revision`, `idempotency_key`, `trace_id`, deadline, and bounded input artifact references. An authenticated service grant determines allowed scopes; merely supplying a scope ID does not authorize it. Return an accepted run reference promptly; long tasks execute in the VPS n8n workflow and publish status via authenticated, replay-protected callbacks or bounded polling. Result metadata includes status, counts, artifact references, coverage/freshness, and safe errors.

Keep control messages small (initial Harvy policy: 64 KiB maximum, configurable downward) and pass references for source bodies or binaries. Credentials, large JSON lists, archives, video, and raw documents never travel as ordinary workflow item payloads. n8n must stream raw and processed objects directly to the approved R2 path instead of carrying large bodies through in-memory nodes. Harvy validates manifests and publishes scoped records; n8n never writes directly to Ontoly/D1 tables.

### Standard flow and failure behavior

Reuse or repair an existing suitable flow. The approved shape is:

```text
Internal schedule / authenticated Harvy trigger
  → validate job and service scope
  → submit idempotent Automation run
  → bounded status wait or authenticated completion callback
  → inspect canonical succeeded / partial / failed / cancelled status
  → record operational outcome and notify the owner when actionable
```

Every n8n source workflow must verify Spider Unlimited availability and the approved Webshare egress before collection. Structured API calls must also route through the approved Webshare proxy; no direct-network fallback is allowed. Keep workflow logic within the user's existing n8n workflows, use scoped credentials, preserve source provenance, and avoid importing a parallel workflow or adding unreviewed community packages.

Set explicit execution deadlines, retry ceilings, per-provider concurrency, polling backoff, and cancellation behavior. Handle 429/5xx/network failures by the established retry owner; route permanent auth/schema failures to a blocked run. If continuing after an item error, aggregate failures and mark the canonical result partial/failed as appropriate. `continueOnFail` must not turn failed collection/storage into a successful workflow. Cancellation stops new dispatches and requests cancellation of the actual Automation run; stopping n8n alone does not prove the remote job stopped.

### Secrets, persistence, and operational safety

Restrict the editor to authorized operators over an authenticated TLS access path. Webhooks require service authentication or signatures with replay limits and validated input; an obscure URL is not authentication. Keep execution histories redacted and pruned to a declared retention period. Never pin real customer payloads into exported workflows.

Store the existing n8n credential-encryption key through the approved secret process and preserve it during backup/restore. Do not generate a new key over existing credentials. A complete backup must include the appropriate database, configuration/key, and referenced persistent storage; a workflow JSON export alone is insufficient. Rehearse a restore to an isolated destination, without activating restored schedules. Keep encrypted credential backups out of Git as well. [Credential encryption](https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/configuration-examples/set-a-custom-encryption-key.md), [backup and restore](https://docs.n8n.io/deploy/host-n8n/keep-n8n-running/backup-and-restore.md)

Preserve the installed execution mode for the hackathon if it meets the bounded workload. Queue-mode expansion introduces Redis and shared execution state; it is not a drop-in replacement with Cloudflare Queues. Do not introduce Redis, change the n8n database, or assume filesystem binary storage is supported across queue workers merely to fit an architecture diagram. Use artifact references to avoid the large-payload path. Reassess scaling after measured bottlenecks. [n8n queue mode](https://docs.n8n.io/deploy/host-n8n/configure-n8n/scaling/enable-queue-mode.md)

Exports must be reviewed for credential values in expressions, auth headers, signed URLs, pinned execution samples, private identifiers, and deployment-specific settings. Map credential references during controlled import. Do not assume paid Git/source-control/project features are available; a reviewed sanitized export/import procedure is acceptable for the MVP. Keep workflows inactive until the responsible operator has reviewed the diff, restore point, schedule ownership, and bounded verification evidence.

### Acceptance and the existing workflow

Before activation, verify import/node compatibility, validated dispatch, tenant denial, unavailable proxy/source behavior, duplicate trigger idempotency, correct partial/failure reporting, restart/recovery, scope-safe logs, and graceful cancellation. Retain n8n execution and Harvy run IDs together. Ops monitors queue/run age, last success, failure reasons, and quota instead of relying only on an n8n green execution indicator.

The repository's existing `v2/workflows/openstates-ingest.json` is a legacy reference, not proof of the installed instance's capabilities. It declares Function nodes, an `n8n-nodes-base.r2` node type, and `continueOnFail` paths; the inspected JSON does not explicitly configure Spider/Webshare. Verify node availability, source/container format, and error semantics before reuse. Reuse the user's existing n8n workflows and change only the bounded source steps needed; do not import it blindly or write a parallel bulk-ingestion system.

## 19. Database, object storage, and Cloudflare deployment map

This section makes the target buildable from the core schema and data lifecycle sections above. It records three statuses: **configured in checkout**, **target**, and **live unverified**. A Wrangler binding is evidence of local configuration, not a deployed or healthy service. The supervisor is legacy and is not part of this target map.

| Service | Harvy owner and responsibility | Status and MVP decision |
|---|---|---|
| Workers | `v2/api/` exposes `/api/v1/` auth-aware product and operator operations; existing `v2/auth/` owns Better Auth. Frontend assets use the existing build path. | Prior `harvy` and `harvy-auth` deployments exist; `harvy-api` does not. Routes target `harvy.dev` in local configs but are not verified remotely. |
| D1 | Local/test adapter only. Preserve migration history and explicit scope checks. | Still used by current source/config; not the production authority. |
| Hyperdrive + PostgreSQL | Intended launch transactional core on the user's database server, connected from Cloudflare Workers through Hyperdrive. | Partially implemented, not deployed: `HYPERDRIVE_PRIVATE` binding declared in both Wrangler configs and the dedicated batch client is tested (`v2/shared/sql-database.ts:160-187`); the Better Auth PostgreSQL adapter (`v2/auth/auth.ts:199-208`), a provisioned endpoint/connection, and remote schema migrations remain blockers. |
| R2 | Three-bucket target: `harvy-raw` for source captures, `harvy-artifacts` for normalized/processed objects, and a separate Basin catalog bucket for catalog-managed analytical tables. Access through scoped artifact manifests. | Only `harvy-raw` currently appears among these target buckets in the account inventory; processed and catalog bucket provisioning/bindings remain unverified. |
| Basin Pipelines/Catalog/SQL | Convert validated processed records into catalog-managed Iceberg/Parquet analytical releases, then query them; keep raw lineage. | Target analytical path; one bounded slice is optional for hackathon, not assumed live. |
| K2 Streams | Durable change/lifecycle event log and independent downstream subscribers. Record IDs, scope, schema, trace. | Legacy config references a stream; target integration and live status unverified. Do not add it to a minimal job if no second consumer needs it. |
| Queues | Buffer bounded work between API, Automation handoff, and projections if measured/reliability need exists; dead-letter failures with replay policy. | Legacy V2 binding exists; new API use is optional and unverified. n8n is not the same queue. |
| Workflows | Durable multi-step Harvy-side orchestration only when a job requires waits/checkpoints beyond Automation; avoid duplicate schedules with n8n. | Legacy V2 config exists; not a requirement for the first live source. |
| Workers KV | Read-heavy public configuration/cache and safe feature snapshots. Do not use as the transactional authority for tenant permissions or run outcomes. | Legacy V2 binding exists; new API use is optional. |
| Containers | Isolated workloads needing a full runtime, such as large conversion or model processing, only after capacity/need is measured. | Target capacity, no verified MVP binding. Automation remains the current external processing server. |
| Secrets Store | Scoped references for Worker secrets; approved injection into Automation/n8n via their appropriate credential systems. No raw values in manifests. | Some templates have local bindings; account resource access and Automation delivery unverified. |
| Email Service | Transactional invite, verification, and notification mail after domain and delivery configuration. | Target; Better Auth email is currently disabled in its local config. Use operator-created pilot invites until email delivery is verified. |
| Cache | Cache only safe public/source-scoped responses with declared keys and invalidation; private queries remain scope-isolated. | Target behavior; no representative hit-rate verification. |

The PostgreSQL **core schema contract** is `core.tenants`, `core.workspaces`, `core.record_ids`, `access.roles`, `access.permissions`, `access.grants`, `access.features`, `ontoly.object_types`, `ontoly.objects`, `ontoly.links`, `ontoly.observations`, `ops_runtime.connector_runs`, `ops_runtime.artifacts`, and `audit.events`. Domain expansion uses `ext_<domain>` tables that reference existing record IDs. Each private row carries tenant/workspace scope, while explicitly shared records carry a separate shared policy. `core.record_ids` enforces unique HarvyDex UUID, semantic type, scope, and current schema version; it does not make a separate physical copy of every object. All IDs and foreign keys use compatible UUID types in PostgreSQL. Role grants include scope and expiry; no global admin role is inferred from a tenant membership. These table names are a design contract, not deployed DDL.

The first migration design uses these minimum columns and constraints. `scope_id` refers to a registered scope whose kind and tenant/workspace ownership are enforced centrally; a nullable tenant ID must never mean public access. All mutable rows also carry `created_at`, `updated_at`, and a revision unless stated otherwise.

| Table | Minimum columns and keys | Essential constraint/read path |
|---|---|---|
| `core.tenants`, `core.workspaces` | UUID `id`; workspace `tenant_id`, slug, state | Unique `(tenant_id, slug)`; workspace cannot move tenants implicitly. |
| `core.record_ids` | UUID `id`, `scope_id`, semantic type, schema version, state | Unique ID and `(scope_id, id)`; UUID is the HarvyDex identity across products. |
| `access.roles`, `access.permissions`, `access.grants` | Role/permission IDs; grant principal, role, `scope_id`, resource selector, expiry | Unique active grant identity; validate scope and permission on server for every operation. |
| `access.features` | Feature key, version, plan/tenant overrides, rollout state | One effective revision per scope; evaluate server-side with recorded policy revision. |
| `ontoly.object_types` | Type key, version, property schema, lifecycle | Unique `(type_key, version)`; additive schema change with explicit migration. |
| `ontoly.objects` | UUID `id`, `scope_id`, type/version, validated properties, source lineage | `(scope_id, id)` references record registry; index scope/type/time and approved search fields. |
| `ontoly.links` | UUID `id`, `scope_id`, type/version, from/to object IDs, evidence | Composite scope-safe references or an explicit approved cross-scope relation. |
| `ontoly.observations` | UUID `id`, `scope_id`, object ID, observed time, value, source/artifact IDs | Preserve source value and provenance; idempotency on source observation identity. |
| `ops_runtime.connector_runs` | UUID `id`, `scope_id`, workflow/version, source scope, status, attempt, idempotency key, deadline | Unique `(scope_id, connector_id, idempotency_key)`; explicit status transitions and failure reason. |
| `ops_runtime.artifacts` | UUID `id`, `scope_id`, run ID, stage, logical URI, object key, hash, bytes, media type, policy | Unique immutable artifact identity; authorized lookup by scope and run, never raw bucket access. |
| `audit.events` | UUID `id`, actor, action, `scope_id`, target ID, decision, trace, occurred time | Append-only service write path; retention and redaction policy. |

Add `core.scopes`, auth-ID mapping, role-permission links, workflow registrations, idempotency, and outbox support tables in the actual migration; they are required dependencies of the rows above. Freeze exact DDL after the Better Auth/PostgreSQL adapter mapping and database endpoint are verified. Do not apply this table sketch as a migration.

The first PostgreSQL migration must create schemas and restricted runtime roles before moving data. Migrate Better Auth via a reviewed adapter/mapping instead of rewriting its internal IDs. Use additive migrations and scope-preserving backfill. Establish an outbox for state transitions before introducing cross-service event delivery. Keep raw captures immutable except governed deletion and store object keys/hashes in `ops_runtime.artifacts`; operational tables hold references, not arbitrary file bytes. Basin owns analytical table snapshots. Do not write a single transaction that assumes D1, PostgreSQL, R2, and K2 commit atomically; use durable state plus retriable publication and reconciliation.

The data path is:

```text
Approved source → Automation workflow (Spider/Webshare when crawling)
  → R2 raw capture + manifest
  → validated Ontoly observation + R2 processed JSON/NDJSON
  → scoped API/HQL operational read
  → optional Basin pipeline/catalog snapshot → Parquet query view
```

For the five-day MVP, each new dependency must name its binding, resource owner, environment, scoped credential, quota, local fixture, live verification, failure mode, and recovery. Ops records deployment inventory before any live demo. Missing infrastructure remains a blocker, not a placeholder success.

## 20. Shared UI and tool wrapper

[`v2/shared/ui/HarvyShell.tsx`](../v2/shared/ui/HarvyShell.tsx) is a starter visual wrapper for React/MUI product screens. It defines `product` (Tower, Ops, Civic, Newsk), `tool` (query, map, graph, media, forms, agent), a trusted session/workspace context supplied by the server, state (`ready`, `loading`, `empty`, `stale`, `error`, `denied`), and stable semantic UI tags. It is source code, not wired into the current graph entry point; the existing `v2/graph/src/main.tsx` has its own ThemeProvider. Reuse the existing theme tokens and mount the shared wrapper only after a signed-in API bootstrap supplies the context. Do not hard-code a tenant or infer authorization from a hidden button.

Every tool surface follows the same contract: `ToolManifest` (registered ID, product availability, required capability and feature key, input/output schema, supported media types, owner), `ToolContext` (principal, tenant, workspace, permissions, feature revision, HQL/ontology versions, trace), `ToolState` (loading/ready/empty/stale/partial/error/denied), and `ToolOutput` (data or authorized artifact reference, provenance, update time, source coverage, and safe error). The wrapper owns navigation, header, responsive layout, feedback states, accessibility, and tags; a tool owns its specialized visualization and interaction. A tool cannot call another tool's private data store. Use registered HQL/API operations through one scoped client.

| Slot | Implementation direction | Shared contract |
|---|---|---|
| Query | Drizzle Cube over HQL | Authorized in-app result view, result bounds, query/version/snapshot; no data export capability. |
| Map | Protomaps | Registered geospatial layer and location precision; source scope and attribution. |
| Graph | Reagraph | Ontoly object/link IDs, evidence, depth limit, and permissions. |
| Media | Video.js plus allowed YouTube metadata/playback | Original source reference, rights, playback state, captions/attribution. |
| Forms | Formbricks integration where licensed/approved | Schema, submit permission, retention, tenant and callback scope. |
| Agent | Harvy AI routing and MCP | Tool allowlist, budget, grounded citations, proposed actions and approval state. |

The UI may render capability flags for discoverability, but server-side auth/entitlements and source rights decide access. Make an approved source's age, gaps, citations, and run state visible in the same shell across products. Register tool IDs and tags centrally; avoid embedding external-provider names in customer UI unless attribution is required. Before promoting this starter to shared production code, integrate it with Better Auth bootstrap, MUI theme, API error types, feature registry, and accessibility checks, then migrate the graph screen as the first consumer.

## Repository layout

- `v2/`: product API target, workflows, portal shell, shared contracts, authentication, migrations, and operational scripts. Existing supervisor code is legacy and not the target path.
- `tests/`: Python tests for V2 tooling and shared logic; `v2/tests/`: Worker contract tests.
- `pages/`, `styles/`, `static/`: static source, canonical CSS, and generated assets.
- `docs/`: operator, developer, API, support, and planning documentation.
- Retired notebook guides remain recoverable in Git history and are not active instructions.

Keep Workers, workflows, and Wrangler configs under `v2/`. Do not add a second platform root.

## Local checks

```sh
npm ci
npm run build:templates
python3 -m unittest discover tests
npm run typecheck:v2
npm run test:v2
npm run test:auth-consent
```

`npm run build:templates` typechecks and builds the V2 auth client, graph bundle, and static pages. Python tests use the standard library; `requirements.txt` contains the optional NudeNet prescan dependency for local media-safety workflows.

For a local D1 migration test, use `--local` and the V2 Wrangler config. Never use `--remote` without an explicit backup and approval.

## Deployment boundaries

Each Worker has an explicit Wrangler config under `v2/`. The `deploy:*` npm scripts make live Cloudflare changes; dry-run the specific config and obtain approval before running them. Remote database migrations are separate from Worker deployment. Do not claim a source collection or full coverage from a dry run, typecheck, health response, or single-record sample.

## Documentation mirrors

Repository files are canonical. Run `npm run sync:vault-guides` to refresh the Obsidian guide mirror. The `sync:harvy-docs` script copies current docs but does not prune every removed guide in the separate repository; review that destination before running it. Do not edit generated mirrors as a substitute for repository changes.
