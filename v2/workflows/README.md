# Harvy n8n workflow starters

The canonical [n8n standard](../../docs/DEVELOPMENT.md#18-uniform-n8n-integration-standard) and [single project plan](../../docs/PLAN.md) govern these files. `scrape-v1.template.json` is an **inactive, unverified starter** for the installed n8n instance. It calls a proposed Automation endpoint; that endpoint is not implemented or deployed by this template. n8n never receives Spider or Webshare secrets. Automation must validate the connector, scope, source permission, and target URL, then verify Spider Unlimited and Webshare configuration before requesting a page. A JSON field saying `required_proxy: webshare` is a requirement declaration, not proof of egress.

## Available Inactive Workflow Starters
- `scrape-v1.template.json`: Single-page scrape starter via Spider Unlimited & Webshare proxy.
- `api-poll-v1.template.json`: Scheduled REST / GeoJSON municipal and event polling template.
- `crawl-v1.template.json`: Multi-page public portal crawl template (capped at 5 pages).

Before any import or run, compare node versions with the installed n8n version; preserve existing workflows; replace the placeholder internal host, connector ID, source scope ID, access scope ID, and public page URL; create a scoped **HTTP Header Auth** credential in n8n; and review the body and schedule. Do not put the credential value in the export, expression, command, or Git. Keep the workflow inactive until a bounded source-specific verification and operator review. The template uses a manual trigger to avoid accidental collection. An accepted HTTP response means the job was submitted; inspect the canonical Automation run status and artifacts before reporting success.

The proposed Automation API is `POST /internal/v1/scrape-runs`. It accepts a versioned control envelope with `connector_id`, `source_scope_id`, `access_scope_id`, `target_url`, `mode`, `provider`, `required_proxy`, `max_pages`, `deadline_seconds`, and `idempotency_key`; it returns a run ID and status URL. A retry with the same key must return the same logical run. Automation owns Spider `/unlimited/scrape`, `/unlimited/crawl`, or `/unlimited/links`, the approved Webshare path, raw/processed artifacts, source provenance, and final status. Source-facing endpoint details remain in the registered connector, not in n8n.

The first code slice is [`v2/shared/automation-run.ts`](../shared/automation-run.ts): it validates the versioned control envelope and run status transitions. It does not implement the proposed endpoint, source authorization, proxy egress, or persisted run state. Its bounds are MVP defaults to review against connector policy before live dispatch.

## Generic n8n HTTP Request node for a Harvy API

For a fixed, approved API operation, add an **HTTP Request** node after a validated trigger or Code node:

```text
Method: POST
URL: https://REPLACE_WITH_INTERNAL_HARVY_API/api/v1/runs
Authentication: Generic Credential Type → Header Auth (configure in n8n)
Send Body: true
Body Content Type: JSON
Specify Body: JSON
JSON Body: ={{ JSON.stringify({
  connector_id: $json.connector_id,
  source_scope_id: $json.source_scope_id,
  access_scope_id: $json.access_scope_id,
  idempotency_key: $json.idempotency_key,
  input: $json.input
}) }}
Timeout: 30000 ms
```

This is a **generic calling pattern**, not a claim that `/api/v1/runs` is implemented. The receiving API authenticates the service, authorizes the target scope and connector, validates bounds, and submits to Automation. Do not point the n8n node directly at an arbitrary third-party API; external source access belongs in Automation's connector. For a GET request, use the same credential pattern, a registered read endpoint, allowlisted query parameters, and pagination. Keep large data in R2 and pass artifact references rather than workflow item arrays. [n8n HTTP Request documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
