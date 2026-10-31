# Harvy n8n workflow starters

## Local repair status — 2026-10-30

Run `npm run validate:workflows` before import. It checks JSON parsing, embedded
JavaScript syntax, unique node identities, and graph references across this
directory and the legacy `n8n/workflows/` directory. Passing does not verify n8n
node parameters, expression evaluation, installed node versions, credentials,
source endpoints, pagination, proxy egress, or storage. All exports remain inactive.

Nine malformed exports were repaired. The FEMA export had embedded serialized
workflow text inside its purported completion code; it is now a narrow run
submission draft using the existing API contract, with organization/domain
placeholders and a disabled schedule. Its completion step explicitly fails until
canonical status reconciliation is connected. EU sanctions uses the same scoped
submission pattern and cannot claim ingestion success from submission alone.

GDACS drafts no longer reset a rolling seven-day cursor or call unverified
`n8n-workflow` checkpoint helpers. Their checkpoint steps fail explicitly pending
durable integration. GDACS simulated R2/PostgreSQL writes and UN Data simulated
Basin ingestion also fail explicitly. These drafts are not ready to activate.

`v2/automation/backfill.mjs` provides bounded orchestration with fixed historical
bounds, half-open date windows, pagination, page limits, lease-protected checkpoint
adapter contracts, and publication-before-checkpoint ordering. Failed checkpoint
writes replay the same page idempotency key. Provider adapters must map these
bounds to actual source semantics and implement approved proxy preflight. Storage
adapters must durably publish artifacts/records and deduplicate before resolving;
checkpoint adapters must implement durable storage and exclusive, fenced leases.
No production adapter or live execution is provided by this local module. Call it
from the authorized Automation runtime after verifying the installed n8n execution
capabilities; do not paste its Node imports into a restricted n8n Code node.

After the server MCP is attached: inventory installed version/nodes and existing
workflows, preserve recoverable revisions, inspect one real failed execution,
connect source/publication/checkpoint adapters, verify bounded ingestion and
replay, and query stored counts plus min/max source dates. Preserve existing
schedules and configured source ranges during this inspection.

Use this compact task envelope for an agent after server access is available:

```text
Repair source <ID> in the existing installed workflow; preserve unrelated work.
Historical bounds: <START UTC> to <END UTC>; records/page: <N>; pages/run: <N>.
Read repository guidance and only the relevant adapter, workflow and contracts.
Inspect the actual failed execution. Reuse approved credentials and proxy path.
Implement historical pagination, durable leased checkpoints, idempotent storage,
bounded retries and canonical status reconciliation. Preserve existing schedules.
Use code for ingestion; return payload references rather than source data to AI.
Completion evidence: execution/run IDs, durable raw+processed references, stored
count, min/max source dates, replay result and a successful storage query.
If evidence is unavailable, report the exact blocker; never invent success.
Perform live changes only within the user's current authorization.
```

The canonical [n8n standard](../../docs/DEVELOPMENT.md#18-uniform-n8n-integration-standard) and [single project plan](../../docs/ROADMAP.md) govern these files. The templates are **inactive and not verified against the installed n8n instance**. They submit approved source IDs to Harvy's `/api/v1/runs`; they are not the live scraper workflows. The VPS-hosted n8n instance is Harvy's Automation system: it receives Harvy's validated run envelope, calls Spider Unlimited with the approved Webshare proxy or calls a registered structured API through that proxy, normalizes results, stores artifacts in R2, and posts signed callbacks. The live n8n instance and its credentials are not connected to this checkout, so that execution path is unverified. A template or green n8n execution is not proof of proxy egress or collection success.

## Available Inactive Workflow Starters
- `scrape-v1.template.json`: Inactive manual run-submission starter; it does not contain the live Spider execution workflow.
- `api-poll-v1.template.json`: Inactive REST / GeoJSON run-submission starter; structured API retrieval belongs in the VPS n8n workflow and must use the approved Webshare path.
- `crawl-v1.template.json`: Inactive bounded crawl run-submission starter; it does not contain the live Spider execution workflow.

Before import or activation, inventory the existing instance and compare node versions; preserve existing workflows; replace the Harvy domain, approved source ID, and organization ID; configure a scoped **HTTP Header Auth** credential for the Better Auth API key in n8n; and review the body and schedule. The organization ID is a placeholder in the export, not an authorization grant; the API verifies that the key belongs to that organization. Do not put credential values in the export, expression, command, or Git. Keep workflows inactive until source-specific bounded verification and operator review. An accepted HTTP response means a run was submitted, not completed; inspect Harvy's canonical run status and artifact references.

Harvy's local `POST /api/v1/runs` accepts `source_id` and `idempotency_key`, resolves the caller's organization and enabled product on the server, persists the canonical run, then dispatches the registered workflow configuration to the configured VPS n8n webhook at `/webhook/internal/v1/scrape-runs`. The envelope uses `tenant-<organization-id>` as its opaque `access_scope_id`; n8n must copy that exact scope and the registered `source_scope_id` to both artifact manifests. The URL/token are not configured in this checkout, so a run correctly fails closed with 503. The target URL comes only from the approved source row; Spider/Webshare secrets are injected into n8n credentials or scoped environment and never copied into the envelope or workflow export.

The local run contract is [`v2/shared/automation-run.ts`](../shared/automation-run.ts); the API route, scoped run registry, signed callback validation, and artifact publication path are in `v2/api/worker.ts`. The n8n webhook receiver and its Spider/API execution are hosted outside this repository and have not been inspected or verified here.

The API Worker expects `AUTOMATION_URL` (HTTPS host only; the Worker appends the n8n `/webhook/internal/v1/scrape-runs` path), `AUTOMATION_DISPATCH_TOKEN` (outbound bearer grant), and `AUTOMATION_CALLBACK_SECRET` (HMAC callback key), plus `HARVY_RAW` and `HARVY_ARTIFACTS` R2 bindings. Values belong in approved scoped configuration/secret injection, never in workflow exports or Git. Both artifact buckets and the VPS endpoint must be verified before deployment; `harvy-artifacts` was not present in the last account inventory.

After collection, the n8n workflow posts run status to `/internal/v1/automation-callback` and manifests/events to `/internal/v1/automation-publications` with `x-harvy-timestamp` and `x-harvy-signature` HMAC headers. Publication is accepted only for the registered run/source/product, requires raw and processed manifests, checks object size and R2 `customMetadata.sha256`, and writes evidence with idempotent scoped keys. Do not call these callbacks a working pipeline until the VPS can reach the configured API route and both R2 bindings are verified.

## Generic n8n HTTP Request node for a Harvy API

For a fixed, approved API operation, add an **HTTP Request** node after a validated trigger or Code node:

```text
Method: POST
URL: https://REPLACE_WITH_HARVY_DOMAIN/api/v1/runs
Authentication: Generic Credential Type → Header Auth (configure in n8n)
Header: x-harvy-organization-id = REPLACE_WITH_ORGANIZATION_ID
Send Body: true
Body Content Type: JSON
Specify Body: JSON
JSON Body: ={{ JSON.stringify({
  source_id: $json.source_id,
  idempotency_key: $json.idempotency_key
}) }}
Timeout: 30000 ms
```

This is the local run-submission pattern; the route is not deployed and requires a scoped credential plus an approved source ID. Harvy resolves scopes and dispatches a bounded run to the VPS n8n webhook. Do not point a workflow at an arbitrary third-party API; source access must use the registered target and approved proxy path. Keep large data in R2 and pass artifact references rather than workflow item arrays. [n8n HTTP Request documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
