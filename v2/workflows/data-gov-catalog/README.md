# Harvy - data-gov-catalog Ingestion Workflow

Workflow ID: `Wjlut8nGEQCg6DT8`

## Overview

This workflow handles continuous ingestion of data.gov catalog datasets using Spider Unlimited via Webshare proxy. The workflow follows the proven pattern from CKAN Generic Ingestion (`msNQRk0FLpHzfhMq`).

## MCP Operations

### Prerequisites

1. **n8n MCP Server**: `https://n8n.harvy.dev/mcp-server/http`
2. **MCP Authorization**: Bearer token from `~/.config/harvy/n8n_mcp_key`
3. **Source Approval**: Must be listed in `v2/catalog/reference/harvy-upstream-manifest.json`
4. **Proxy Verification**: Webshare proxy must pass preflight via `ipv4.webshare.io`
5. **Spider Unlimited**: Only `/unlimited/scrape`, `/unlimited/crawl`, `/unlimited/links` endpoints
6. **Global Limits**: spider-concurrency <= 50 across all workflows

### Required n8n Variables

- `WEBSHARE_PROXY_URL`: Verified proxy URL (e.g., `http://user:pass@p.webshare.io:80`)
- `BASIN_SEND_TOKEN`: Bearer token for Basin SQL ingestion
- `N8N_MCP_KEY`: MCP authentication token
- `OPENOBSERVE_TRACE_ID`: Trace ID for OpenObserve correlation

### Required Data Tables

- `connector_errors` (id: `92T2flIyNQfnxntj`): Workflow error logging

### MCP Tools Available

```
workflows.create_workflow
workflows.update_workflow
workflows.validate_workflow
workflows.execute_workflow
workflows.search_workflows
workflows.get_workflow
workflows.activate_workflow
workflows.deactivate_workflow
workflows.publish_workflow
```

## Workflow Structure

### Nodes

1. **Cron Trigger**: Scheduled runs (daily at 00:00 UTC)
2. **Build Catalog Job**: Creates job envelope with provenance tracking
3. **Submit to Harvy Automation**: POSTs to Harvy API `/api/v1/runs`
4. **Error Trigger**: Catches workflow failures
5. **Log Error to connector_errors**: Records errors with trace IDs
6. **Post Error Callback**: Sends error notifications

### Provenance Tracking

- `source_id`: `src_data-gov-catalog`
- `event_id`: Deterministic format `src_data-gov-catalog_<timestamp>_<random>`
- `idempotency_key`: `n8n-catalog-<execution.id>`
- `workflow_id`: `Wjlut8nGEQCg6DT8`
- `spider_request_id`: Unique per request

### Error Handling

- All errors logged to `connector_errors` table
- Includes: workflow_id, workflow_name, execution_id, error_message, occurred_at, source_id, severity, trace_id
- Error callback posts to `/internal/v1/automation-callback` with HMAC signature

## Gates Checklist (Before Activation)

- [ ] Source approved in `harvy-upstream-manifest.json`
- [ ] All secrets in n8n variables (no hardcoded values)
- [ ] Webshare proxy preflight passed (egress IP verified)
- [ ] Spider Unlimited only (no metered fallback)
- [ ] Provenance tracking configured (event_id, workflow_id)
- [ ] Deterministic event_id format verified
- [ ] connector_errors data table exists
- [ ] OpenObserve tracing configured (service=n8n)
- [ ] Basin send token configured
- [ ] Spider concurrency <= 50 (global ceiling)

## Verification Steps

### 1. Validate Workflow Structure

```bash
# Validate the workflow JSON
npx n8n-nodes-base.workflow-validator validate v2/workflows/data-gov-catalog.full.workflow.json
```

### 2. Create/Update via MCP

```javascript
// MCP operations to perform:
await tools.mcp.call("workflows.update_workflow", {
  workflowId: "Wjlut8nGEQCg6DT8",
  workflowJson: workflowJson,
  active: false
});
```

### 3. Manual Test Execution

```bash
# Execute workflow manually (inactive mode)
# Expected: Should submit to Harvy API and return 200/201
# Verify: Check Harvy API run status and Basin evidence table
```

### 4. Verify Provenance

```sql
-- Check Basin evidence table for new rows
SELECT id, event_id, source_id, publisher, headline, product, tenant_id, workspace_id, captured_at
FROM default.evidence
WHERE source_id = 'src_data-gov-catalog'
ORDER BY captured_at DESC
LIMIT 10;
```

### 5. Verify Error Handling

```bash
# Force an error scenario
# Check connector_errors table for error logging
```

## Expected Outcomes

### Success Criteria

- [ ] Workflow validates without errors
- [ ] Manual execution succeeds (returns 200/201 from Harvy API)
- [ ] Basin evidence table receives rows (src_data-gov-catalog)
- [ ] R2 artifacts created (harvy-artifacts/data-gov-catalog/...)
- [ ] Idempotency verified (re-run processes 0 new rows)
- [ ] Error trigger logs to connector_errors table
- [ ] OpenObserve traces captured (service=n8n)

### Metrics to Verify

- Cache hit rate: Target >= 75% for public cacheable endpoints
- Row counts: Verify after 300s sink flush
- Idempotency: Re-run should process 0 new rows
- Error rate: 0 errors in production

## References

- Proven pattern: CKAN Generic Ingestion (`msNQRk0FLpHzfhMq`)
- Basin pipeline: `harvy_evidence_stream` -> `default.evidence`
- R2 buckets: `harvy-raw`, `harvy-artifacts`
- OpenObserve: `eu1-api.openobserve.ai`
- Spider Unlimited: `/unlimited/scrape`, `/unlimited/crawl`, `/unlimited/links`

## Troubleshooting

### Common Issues

1. **401 on MCP calls**: Check N8N_MCP_KEY is valid and not expired
2. **Proxy 403 errors**: Target site blocking Webshare datacenter IP; use Spider Unlimited directly
3. **Basin ingestion failures**: Verify BASIN_SEND_TOKEN has Send permission
4. **Missing rows**: Check sink flush interval (300s/100MB)
5. **Duplicate rows**: Verify event_id format is deterministic and unique

### Logs to Check

- n8n application logs (service=n8n)
- OpenObserve traces (correlation: execution_id)
- Basin SQL evidence table
- R2 artifact listings
- connector_errors data table

## Activation Checklist

Before activating the workflow:

- [ ] All gates passed (see above)
- [ ] Manual test executed successfully
- [ ] Idempotency verified
- [ ] Error handling tested
- [ ] OpenObserve traces confirmed
- [ ] Documentation updated
- [ ] Supervisor review completed

## Post-Activation Monitoring

- Monitor Basin evidence table growth
- Check R2 artifact creation
- Verify OpenObserve traces
- Monitor connector_errors table
- Track execution counts and durations
- Verify cache hit rates

---

**Created**: 2026-10-30  
**Pattern**: mirrors-proven-ckan-generic  
**Status**: Inactive (ready for MCP deployment)
