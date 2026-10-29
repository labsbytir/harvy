# Harvy n8n workflow starters

The canonical [n8n standard](../../docs/DEVELOPMENT.md#18-uniform-n8n-integration-standard) and [single project plan](../../docs/PLAN.md) govern these files. The templates are **inactive and not verified against the installed n8n instance**. They call Harvy's local `/api/v1/runs` operation using an approved source ID; the deployed route, service credential, and Automation binding remain unconfigured. n8n never receives Spider or Webshare secrets. Automation must validate connector/source scope and verify Spider Unlimited and Webshare configuration before requesting a page. A template or green n8n execution is not proof of egress or collection success.

## Available Inactive Workflow Starters
- `scrape-v1.template.json`: Inactive single-page scrape control template; Harvy resolves the registered source and Automation applies Spider/Webshare policy.
- `api-poll-v1.template.json`: Inactive REST / GeoJSON poll control flow; Harvy and Automation resolve the registered API connector and approved Webshare path (Spider is not used for ordinary structured API requests).
- `crawl-v1.template.json`: Multi-page public portal crawl template (capped at 5 pages).

Before import or activation, inventory the existing instance and compare node versions; preserve existing workflows; replace the Harvy domain, approved source ID, and organization ID; configure a scoped **HTTP Header Auth** credential for the Better Auth API key in n8n; and review the body and schedule. The organization ID is a placeholder in the export, not an authorization grant; the API verifies that the key belongs to that organization. Do not put credential values in the export, expression, command, or Git. Keep workflows inactive until source-specific bounded verification and operator review. An accepted HTTP response means a run was submitted, not completed; inspect Harvy's canonical run status and artifact references.

Harvy's local `POST /api/v1/runs` accepts `source_id` and `idempotency_key`, resolves the caller's organization and enabled product on the server, persists the canonical run, then dispatches the registered connector configuration to Automation over a configured HTTPS URL. The envelope uses `tenant-<organization-id>` as its opaque `access_scope_id`; Automation must copy that exact scope and the registered `source_scope_id` to both artifact manifests. The URL/token are not configured in this checkout, so a run correctly fails closed with 503. Automation owns Spider `/unlimited/scrape`, `/unlimited/crawl`, or `/unlimited/links`, API requests, the approved Webshare path, raw/processed artifacts, provenance, and signed status/publication callbacks. Source URLs and proxy settings stay out of n8n workflow payloads.

The local control contract is [`v2/shared/automation-run.ts`](../shared/automation-run.ts); the API route, scoped run registry, signed callback validation, and artifact publication path are in `v2/api/worker.ts`. None proves the external Automation service, R2 bindings, proxy egress, or live source access.

The API Worker expects `AUTOMATION_URL` (HTTPS host only), `AUTOMATION_DISPATCH_TOKEN` (outbound bearer grant), and `AUTOMATION_CALLBACK_SECRET` (HMAC callback key), plus `HARVY_RAW` and `HARVY_ARTIFACTS` R2 bindings. Values belong in approved scoped configuration/secret injection, never in workflow exports or Git. Both artifact buckets and the VPS endpoint must be verified before deployment; `harvy-artifacts` was not present in the last account inventory.

After collection, Automation posts run status to `/internal/v1/automation-callback` and manifests/events to `/internal/v1/automation-publications` with `x-harvy-timestamp` and `x-harvy-signature` HMAC headers. Publication is accepted only for the registered run/source/product, requires raw and processed manifests, checks object size and R2 `customMetadata.sha256`, and writes evidence with idempotent scoped keys. Do not call these callbacks a working pipeline until the VPS can reach the configured API route and both R2 bindings are verified.

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

This is the local control pattern; the route is not deployed and requires a scoped credential plus an approved source ID. Harvy resolves scopes and submits the bounded run to Automation. Do not point n8n at an arbitrary third-party API; source access belongs in Automation. Keep large data in R2 and pass artifact references rather than workflow item arrays. [n8n HTTP Request documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
