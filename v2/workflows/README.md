# Harvy n8n workflow starters

The canonical [n8n standard](../../docs/DEVELOPMENT.md#18-uniform-n8n-integration-standard) and [single project plan](../../docs/PLAN.md) govern these files. The templates are **inactive and not verified against the installed n8n instance**. They submit approved source IDs to Harvy's `/api/v1/runs`; they are not the live scraper workflows. The VPS-hosted n8n instance is Harvy's Automation system: it receives Harvy's validated run envelope, calls Spider Unlimited with the approved Webshare proxy or calls a registered structured API through that proxy, normalizes results, stores artifacts in R2, and posts signed callbacks. The live n8n instance and its credentials are not connected to this checkout, so that execution path is unverified. A template or green n8n execution is not proof of proxy egress or collection success.

## Available Inactive Workflow Starters
- `scrape-v1.template.json`: Inactive manual run-submission starter; it does not contain the live Spider execution workflow.
- `api-poll-v1.template.json`: Inactive REST / GeoJSON run-submission starter; structured API retrieval belongs in the VPS n8n workflow and must use the approved Webshare path.
- `crawl-v1.template.json`: Inactive bounded crawl run-submission starter; it does not contain the live Spider execution workflow.

Before import or activation, inventory the existing instance and compare node versions; preserve existing workflows; replace the Harvy domain, approved source ID, and organization ID; configure a scoped **HTTP Header Auth** credential for the Better Auth API key in n8n; and review the body and schedule. The organization ID is a placeholder in the export, not an authorization grant; the API verifies that the key belongs to that organization. Do not put credential values in the export, expression, command, or Git. Keep workflows inactive until source-specific bounded verification and operator review. An accepted HTTP response means a run was submitted, not completed; inspect Harvy's canonical run status and artifact references.

Harvy's local `POST /api/v1/runs` accepts `source_id` and `idempotency_key`, resolves the caller's organization and enabled product on the server, persists the canonical run, then dispatches the registered connector configuration to the configured VPS n8n webhook at `/webhook/internal/v1/scrape-runs`. The envelope uses `tenant-<organization-id>` as its opaque `access_scope_id`; n8n must copy that exact scope and the registered `source_scope_id` to both artifact manifests. The URL/token are not configured in this checkout, so a run correctly fails closed with 503. The target URL comes only from the approved source row; Spider/Webshare secrets are injected into n8n credentials or scoped environment and never copied into the envelope or workflow export.

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
