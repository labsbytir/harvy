# fema-openfema Workflow Deployment Guide

## Workflow Overview
- **Workflow ID**: `7OucM9UE1R9UG594`
- **Workflow Name**: Harvy — fema-openfema Ingestion
- **Status**: Inactive (ready for import and activation)
- **Purpose**: Ingest disaster declarations from FEMA OpenFEMA API
- **Source ID**: `src_openfema`
- **Source Scope ID**: `scope-openfema`
- **Access Scope ID**: `tenant-harvy-core`

## Prerequisites

### 1. Spider Unlimited Preflight ✓
- **Route**: `/unlimited/scrape`
- **Proxy**: Webshare residential proxy configured in n8n credentials
- **Verification**: Target egress must resolve to Webshare IP ranges
- **Rate Limit**: Global ceiling of 50 in-flight requests across ALL workflows

### 2. Credentials Required
- **WEBSHARE_PROXY_URL**: Residential proxy endpoint
- **Harvy API Key**: For `/api/v1/runs` endpoint authentication
- **OpenObserve API Key**: For logging and tracing (if direct integration)

### 3. Source Approval ✓
- **Source**: U.S. FEMA OpenFEMA (API endpoint: `https://api.fema.gov/open/v2/`)
- **Access Class**: `open_api` (no API key required)
- **Verified**: 200 OK response from VPS
- **Record Path**: `DisasterDeclarations`
- **Fields**:
  - `disasterNumber` → id
  - `title` → title
  - `incidentType` → summary
  - `declarationDate` → time

### 4. Provenance & Deterministic IDs
- **Event ID Format**: `fema-{timestamp}-{random}`
- **Idempotency Key**: `fema-{timestamp}`
- **Trace ID**: Same as event_id (deterministic)
- **Run ID**: Same as event_id
- **Provenance Fields**:
  - source: U.S. FEMA OpenFEMA
  - publisher: U.S. FEMA
  - license: Public Domain
  - collection_method: api-poll
  - api_endpoint: https://api.fema.gov/open/v2/DisasterDeclarations

## Workflow Structure

### Nodes
1. **Schedule: Every Hour** (`fema-trigger-001`)
   - Cron trigger: hourly execution
   - Type: n8n-nodes-base.cron

2. **Set Job Parameters** (`fema-setup-002`)
   - Sets deterministic event_id, provenance, spider config
   - Type: n8n-nodes-base.code

3. **Submit to Harvy API** (`fema-submit-003`)
   - POST to `https://harvy.dev/api/v1/runs`
   - Authentication: HTTP Header Auth with x-harvy-organization-id
   - Type: n8n-nodes-base.httpRequest

4. **Wait for Completion** (`fema-wait-004`)
   - Pauses execution for Harvy automation callback
   - Type: n8n-nodes-base.code

5. **Post-process Results** (`fema-postprocess-005`)
   - Verifies provenance, logs to OpenObserve
   - Type: n8n-nodes-base.code

6. **Handle Errors** (`fema-error-handler-006`)
   - Error handling and alerting
   - Type: n8n-nodes-base.code

## Gates Before Activation

### ✓ Source Approved
- OpenFEMA API verified (200 OK from VPS)
- Source ID registered: `src_openfema`
- Source scope: `scope-openfema`
- No API key required (public domain data)

### ✓ Secrets from n8n Variables Only
- `WEBSHARE_PROXY_URL` (n8n credential)
- Harvy API key (n8n credential)
- OpenObserve API key (if used)

### ✓ Proxy Verification
- Webshare residential proxy configured
- Target egress verified
- Rate limits respected (50 in-flight max)

### ✓ Spider Cloud Unlimited Only
- Route: `/unlimited/scrape`
- No metered/PAYG fallback
- Provenance tracking enabled

### ✓ Deterministic event_id
- Format: `fema-{timestamp}-{random}`
- Stable across retries
- Used for idempotency

### ✓ Dedupe Data Table
- Harvy API handles deduplication via idempotency_key
- Error table: `harvy_errors`
- OpenObserve datasets: `harvy-automation`, `harvy-traces`

## Configuration Checklist

### n8n Workflow Import
```bash
# Import the workflow JSON
curl -X POST https://n8n.harvy.dev/rest/workflows/import \
  -H "Authorization: Bearer $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary @fema-openfema.workflow.json
```

### Required Credentials in n8n
1. **Webshare Proxy Credential**
   - Type: HTTP Request / Generic Credential
   - Name: `webshare-residential-proxy`
   - Configuration: Proxy URL with authentication

2. **Harvy API Credential**
   - Type: HTTP Header Auth
   - Name: `harvy-api-auth`
   - Header: `x-harvy-organization-id: harvy-core`
   - API Key: From Better Auth

3. **OpenObserve Credential** (optional)
   - Type: HTTP Request
   - Name: `openobserve-logs`
   - Endpoint: `https://eu1-api.openobserve.ai/api/default/harvy-automation/logs`

### Environment Variables
```bash
# In n8n .env or workflow settings
WEBSHARE_PROXY_URL=https://proxy.webshare.io:80
HARVY_API_URL=https://harvy.dev
OPENOBSERVE_ENDPOINT=https://eu1-api.openobserve.ai
```

## Verification Steps

### 1. Pre-Activation Checks
- [ ] Workflow JSON validates in n8n
- [ ] All credentials configured in n8n
- [ ] Webshare proxy egress verified
- [ ] Harvy API reachable from n8n
- [ ] OpenObserve endpoint accessible

### 2. Bounded Manual Test
```bash
# Trigger workflow manually in n8n
curl -X POST https://n8n.harvy.dev/webhook/fema-hourly-trigger \
  -H "Authorization: Bearer $N8N_MCP_KEY"
```

### 3. Verify Persisted Counts
- Check Harvy run status: `GET /api/v1/runs/{run_id}`
- Verify artifacts in R2: `harvy-raw/fema-openfema/`
- Check OpenObserve logs: dataset `harvy-automation`
- Verify error table: `harvy_errors` (should be empty for success)

### 4. Trace ID Verification
- Each run should have unique trace_id matching event_id
- Logs should show: `event_id`, `run_id`, `trace_id` correlation
- OpenObserve traces should link to Harvy API calls

## Expected Output

### Successful Run
```json
{
  "event_id": "fema-1730265600000-abc123",
  "run_id": "fema-1730265600000-abc123",
  "trace_id": "fema-1730265600000-abc123",
  "status": "succeeded",
  "artifacts": [
    {
      "type": "raw",
      "path": "harvy-raw/fema-openfema/2026/10/30/run-fema-1730265600000-abc123.json",
      "sha256": "...",
      "size_bytes": 12345
    },
    {
      "type": "processed",
      "path": "harvy-artifacts/fema-openfema/2026/10/30/run-fema-1730265600000-abc123.json",
      "sha256": "...",
      "size_bytes": 8765
    }
  ],
  "provenance": {
    "source_count": 5,
    "fields_mapped": {
      "id": "disasterNumber",
      "title": "title",
      "summary": "incidentType",
      "time": "declarationDate"
    }
  }
}
```

### Error Handling
- Errors logged to `harvy_errors` table
- Alert triggered if max retries exceeded (3 attempts)
- Workflow continues to next scheduled run

## Monitoring & Alerts

### OpenObserve Dashboards
- Dataset: `harvy-automation`
- Metrics: run_count, error_rate, duration
- Service: `fema-openfema-ingestion`

### Error Conditions
- **Max retries exceeded**: Alert to operator
- **Harvy API 503**: Retry with backoff
- **Webshare proxy failure**: Switch to backup proxy
- **Provenance mismatch**: Manual review required

## Rollback Steps

### If Issues Detected
1. Deactivate workflow in n8n
2. Revert to previous workflow version
3. Investigate error logs in OpenObserve
4. Check harvy_errors table
5. Verify source data integrity

### Emergency Stop
```bash
# Deactivate workflow via n8n API
curl -X PATCH https://n8n.harvy.dev/rest/workflows/7OucM9UE1R9UG594 \
  -H "Authorization: Bearer $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": false}'
```

## Two Real Scheduled Cycles Required

Before marking workflow as healthy:
1. **First cycle**: Manual trigger, verify all gates pass
2. **Second cycle**: Automatic hourly trigger, verify persistence
3. **Documentation**: Update this file with actual run metrics

## Notes

- **Workflow is inactive** until all gates pass
- **Do not activate** without verifying all prerequisites
- **Source data is public domain** - no licensing restrictions
- **Rate limit**: 50 in-flight requests across ALL workflows
- **Timeout**: 300 seconds (5 minutes) per run
- **Max pages**: 5 records per run (configurable)

## References

- [Harvy Automation Contract](../shared/automation-run.ts)
- [OpenFEMA Connector](../catalog/connectors/sources/openfema.ts)
- [Official Sources Ledger](../catalog/reference/official-sources-ledger.json)
- [n8n MCP Documentation](../../docs/DEVELOPMENT.md#n8n-mcp-integration)
