# n8n Webhook Setup for Harvy Automation

This document describes how to configure the n8n instance at `https://n8n.harvy.dev` to receive Automation dispatch requests from the Harvy API Worker.

## Overview

The Harvy API Worker (`harvy-api`) dispatches run requests to n8n via a webhook at:
```
POST /webhook/internal/v1/scrape-runs
```

The n8n workflow must:
1. Receive and validate the AutomationRunRequest envelope
2. Execute the appropriate collection logic (Spider/Webshare for scraping, direct API for structured endpoints)
3. Normalize results to Harvy event format
4. Upload raw and processed artifacts to R2
5. Post signed callbacks to Harvy for status and publication updates

## Prerequisites

### n8n Instance
- URL: `https://n8n.harvy.dev` (DNS: `n8n.harvy.dev` → `85.9.193.113`)
- Must be accessible from the internet
- Must have the following nodes installed:
  - HTTP Request (v4.5+)
  - Code (v2+)
  - S3 (v1+)
  - Webhook (v1+)
  - Schedule Trigger (v1.4+)
  - Manual Trigger (v1+)
  - Error Trigger (v1+)

### Credentials Required

1. **R2 Credentials** (for `harvy-raw` and `harvy-artifacts` buckets):
   - Access Key ID: Configured in n8n
   - Secret Access Key: Configured in n8n
   - Region: `auto` (Cloudflare R2)
   - Endpoint: `https://<account-id>.r2.cloudflarestorage.com`

2. **Webshare Proxy URL**:
   - Environment variable: `WEBSHARE_PROXY_URL`
   - Format: `http://user:pass@proxy.webshare.io:port` or `https://...`

3. **Harvy Callback Authentication**:
   - Environment variable: `AUTOMATION_CALLBACK_SIGNATURE`
   - This is the HMAC signature key for posting back to Harvy
   - Must match the `AUTOMATION_CALLBACK_SECRET` configured in the Harvy API Worker

4. **Source-Specific API Keys** (as needed):
   - CourtListener: `COURTLISTENER_API_TOKEN`
   - GDELT: `GDELT_API_KEY`
   - etc.

## Webhook Configuration

### Step 1: Create Webhook Node

Create a new workflow with a Webhook node:
- **Path**: `/webhook/internal/v1/scrape-runs`
- **HTTP Method**: `POST`
- **Response Mode**: `responseNode` (to send custom responses)

### Step 2: Validate Incoming Request

Add a Code node to validate the AutomationRunRequest envelope:

```javascript
const body = $input.first().json || {};
const required = [
  'contract_version', 'run_id', 'trace_id', 'config_revision',
  'connector_id', 'source_scope_id', 'access_scope_id', 'target_url',
  'mode', 'provider', 'required_proxy', 'preflight_required',
  'direct_fallback_allowed', 'max_pages', 'deadline_seconds', 'idempotency_key'
];
const missing = required.filter(key => !(key in body));
if (missing.length > 0) {
  throw new Error('Missing required fields: ' + missing.join(', '));
}
if (body.contract_version !== 1) {
  throw new Error('Unsupported contract version: ' + body.contract_version);
}
if (body.required_proxy !== 'webshare') {
  throw new Error('Required proxy must be webshare');
}
if (body.preflight_required !== true) {
  throw new Error('Preflight must be required');
}
if (body.direct_fallback_allowed !== false) {
  throw new Error('Direct fallback must be disabled');
}
return [{ json: { ...body, validated: true } }];
```

### Step 3: Route by Connector

Add a Switch node to route to the appropriate workflow based on `connector_id`:
- `courtlistener` or `courtlistener_api` → CourtListener workflow
- `gdelt` → GDELT workflow
- `usgs` → USGS workflow
- etc.

### Step 4: Execute Collection

For each connector type, implement the appropriate collection logic:

#### Spider-Based Connectors (scrape/crawl/links modes)
- Use HTTP Request node with Webshare proxy
- Set `proxy` option to `$vars.WEBSHARE_PROXY_URL`
- Respect `max_pages` limit
- Honor `deadline_seconds` timeout

#### API-Based Connectors (api mode)
- Use HTTP Request node with appropriate authentication
- Still use Webshare proxy for egress
- Respect rate limits and quotas

### Step 5: Normalize to Harvy Events

Transform collected data to Harvy event format:

```javascript
const crypto = require('crypto');
const item = $input.first().json || {};
const envelope = $input.first().json || {};

// Create HarvyDex event ID
const idSource = item.id || item.case_id || item.docket_number || String(Math.random());
const hash = crypto.createHash('sha256').update(String(idSource)).digest('hex').slice(0, 16);
const eventId = 'src_' + envelope.connector_id + '_' + hash;

const event = {
  id: eventId,
  event_id: eventId,
  source_id: envelope.connector_id,
  publisher: 'Source Name',
  product: 'Newsk', // or 'Civic', 'Tower', 'Ops'
  tenant_id: envelope.access_scope_id.replace('tenant-', ''),
  workspace_id: envelope.access_scope_id.replace('tenant-', ''),
  title: item.title || item.name || 'Untitled',
  summary: item.description || item.summary || '',
  status: 'new',
  first_seen_at: item.date || item.published_at || new Date().toISOString(),
  last_seen_at: new Date().toISOString(),
  run_id: envelope.run_id,
  trace_id: envelope.trace_id,
  source_scope_id: envelope.source_scope_id,
  access_scope_id: envelope.access_scope_id,
  metadata: { ...item, _normalized: true },
};

return [{ json: event }];
```

### Step 6: Upload Artifacts to R2

#### Raw Artifact
- **Bucket**: `harvy-raw`
- **Path**: `{connector}/{run_id}/{event_id}.json`
- **Content**: Original source data
- **Metadata**: `run_id`, `trace_id`, `source`

#### Processed Artifact
- **Bucket**: `harvy-artifacts`
- **Path**: `{connector}/processed/{run_id}/{event_id}.json`
- **Content**: Normalized Harvy event
- **Metadata**: `run_id`, `trace_id`, `event_id`, `source`

### Step 7: Post Status Callback

Use HTTP Request node to post status updates:
- **URL**: `https://harvy.dev/internal/v1/automation-callback`
- **Method**: `POST`
- **Headers**:
  - `X-Harvy-Timestamp`: Current timestamp (milliseconds)
  - `X-Harvy-Signature`: HMAC-SHA256 of `{timestamp}.{body}` using `AUTOMATION_CALLBACK_SECRET`
- **Body**:
  ```json
  {
    "run_id": "{{$json.run_id}}",
    "status": "succeeded",
    "error_code": null
  }
  ```

Valid status values: `running`, `succeeded`, `partial`, `failed`, `cancelled`

### Step 8: Post Publication Callback

Use HTTP Request node to post artifact manifests:
- **URL**: `https://harvy.dev/internal/v1/automation-publications`
- **Method**: `POST`
- **Headers**: Same as status callback
- **Body**:
  ```json
  {
    "run_id": "{{$json.run_id}}",
    "raw_manifests": [
      {
        "stage": "raw",
        "scope": "{{$json.access_scope_id}}",
        "source_id": "{{$json.source_id}}",
        "path": "{{$json.raw_path}}",
        "size": {{ $json.raw_size }},
        "sha256": "{{$json.raw_sha256}}",
        "timestamp": "{{$json.raw_timestamp}}"
      }
    ],
    "processed_manifests": [
      {
        "stage": "processed",
        "scope": "{{$json.access_scope_id}}",
        "source_id": "{{$json.source_id}}",
        "path": "{{$json.processed_path}}",
        "size": {{ $json.processed_size }},
        "sha256": "{{$json.processed_sha256}}",
        "timestamp": "{{$json.processed_timestamp}}"
      }
    ],
    "event_count": {{ $json.event_count }},
    "evidence_count": {{ $json.evidence_count }}
  }
  ```

### Step 9: Respond to Webhook

Use Respond to Webhook node:
- **Response Code**: `202` (Accepted)
- **Response Body**:
  ```json
  {
    "status": "queued",
    "message": "Request accepted and queued for processing"
  }
  ```

## Callback Signature Generation

The Harvy API Worker validates callbacks using HMAC-SHA256. To generate the signature:

```javascript
const crypto = require('crypto');

function generateSignature(body, secret, timestamp) {
  const data = `${timestamp}.${body}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return hmac.digest('hex');
}

// Example usage:
const timestamp = Date.now();
const body = JSON.stringify({ run_id: '...', status: 'succeeded', error_code: null });
const signature = generateSignature(body, process.env.AUTOMATION_CALLBACK_SECRET, timestamp);
```

## Error Handling

1. **Validation Errors**: Return 400 with error details
2. **Authentication Errors**: Return 401
3. **Transient Errors**: Return 502 or 503, Harvy will mark as `dispatch_unconfirmed`
4. **Permanent Errors**: Return 400+, Harvy will mark as `failed`

## Available Workflow Templates

The following workflow templates are available in `v2/workflows/`:

1. **courtlistener-bulk.workflow.ts** - CourtListener bulk CSV.bz2 import
2. **courtlistener-api.workflow.ts** - CourtListener REST API polling
3. **gdelt.workflow.ts** - GDELT DOC 2.0 news workflow

These are TypeScript workflow definitions that can be imported into n8n.

## Testing

To test the webhook:

```bash
curl -X POST https://n8n.harvy.dev/webhook/internal/v1/scrape-runs \
  -H "Content-Type: application/json" \
  -d '{
    "contract_version": 1,
    "run_id": "test-run-001",
    "trace_id": "test-trace-001",
    "config_revision": "1",
    "connector_id": "courtlistener",
    "source_scope_id": "src_courtlistener",
    "access_scope_id": "tenant-test",
    "target_url": "https://www.courtlistener.com/api/rest/v3/cases/",
    "mode": "api",
    "provider": "registered_api",
    "required_proxy": "webshare",
    "preflight_required": true,
    "direct_fallback_allowed": false,
    "max_pages": 10,
    "deadline_seconds": 300,
    "idempotency_key": "test-idempotency-001"
  }'
```

## Monitoring

Monitor the following:
1. Webhook response times and error rates
2. R2 upload success/failure
3. Callback success/failure
4. Run processing latency
5. Quota usage (20 runs/hour, 500 quota units/hour per tenant)

## Security

- All requests to n8n must go through the configured webhook path
- All outbound requests from n8n must use the Webshare proxy
- Never store credentials in workflow JSON
- Use n8n credential store for all secrets
- Validate all incoming requests against the AutomationRunRequest schema
- Sign all callbacks with HMAC-SHA256

## References

- [Automation Run Contract](v2/shared/automation-run.ts)
- [Harvy API Worker](v2/api/worker.ts)
- [n8n HTTP Request Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
- [n8n Webhook Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
