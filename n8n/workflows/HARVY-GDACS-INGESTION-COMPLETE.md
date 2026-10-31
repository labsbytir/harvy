# Harvy — GDACS Ingestion Workflow

## Overview

This document describes the complete "Harvy — gdacs Ingestion" workflow for harvesting disaster alert data from the Global Disaster Alert and Coordination System (GDACS) API.

## Workflow ID

Once created via MCP: `workflow-gdacs-ingestion-001` (example)

## Version

v1.0.0

## Project

Project ID: `NiDaApcjYhqmh8Wp`

## Workflow Structure

### 1. Trigger Node
- **Type**: Cron Trigger
- **Schedule**: `0 */2 * * *` (every 2 hours)
- **Purpose**: Schedule regular GDACS data ingestion

### 2. Metadata Generation Node
- **Type**: Function Node
- **Purpose**: Generate deterministic event IDs and timestamps
- **Output**: 
  ```json
  {
    "eventId": "gdacs-ingestion-{timestamp}-{random}",
    "workflowName": "Harvy — gdacs Ingestion",
    "timestamp": "ISO8601",
    "source": "gdacs"
  }
  ```

### 3. Configuration Setup Node
- **Type**: Function Node
- **Purpose**: Set up GDACS API configuration and Webshare proxy
- **Configuration**:
  ```javascript
  {
    "gdacsApi": "https://www.gdacs.org/api/v2/alerts",
    "proxy": {
      "host": "WEBSHARE_PROXY_URL",
      "port": "WEBSHARE_PROXY_PORT"
    }
  }
  ```

### 4. Backfill Cursor Node
- **Type**: Function Node
- **Purpose**: Manage backfill cursor for incremental ingestion
- **Logic**:
  - If cursor exists: use existing
  - If no cursor: start from 7 days ago
- **Output**: `{ backfillCursor, forwardWatermark }`

### 5. Fetch GDACS Alerts Node
- **Type**: HTTP Request Node
- **URL**: `{{$node["Setup Configuration"].json["gdacsApi"]}}?startDate={{$node["Get Backfill Cursor"].json["backfillCursor"]}}&endDate={{$node["Get Backfill Cursor"].json["forwardWatermark"]}}&format=json`
- **Method**: GET
- **Authentication**: None (public API)
- **Headers**:
  - `User-Agent`: `Harvy-GDACS-Connector/1.0`
  - `Accept`: `application/json`
- **Proxy**: Configured Webshare proxy
- **Timeout**: 30 seconds

### 6. Process Alerts Node
- **Type**: Function Node
- **Purpose**: Add provenance, metadata, and deduplication keys
- **Processing per alert**:
  ```javascript
  {
    ...alert,
    eventId: `gdacs-alert-${alert.id}-${alert.timestamp}`,
    workflowName: 'Harvy — gdacs Ingestion',
    ingestionTimestamp: new Date().toISOString(),
    provenance: {
      source: 'gdacs.org',
      retrievedAt: new Date().toISOString(),
      license: 'CC-BY-4.0',
      attribution: 'Global Disaster Alert and Coordination System (GDACS)',
      dataQuality: 'machine-readable-api'
    },
    dedupeKey: `${alert.id}-${alert.timestamp}`
  }
  ```

### 7. Deduplication Check Node
- **Type**: Function Node
- **Purpose**: Filter out duplicate alerts using data table
- **Logic**:
  - Check each alert against `gdacs_dedupe_table`
  - If exists: log as duplicate and skip
  - If new: process further
- **Output**: `{ uniqueAlerts, duplicateCount }`

### 8. Prepare Data Node
- **Type**: Function Node
- **Purpose**: Transform data for storage
- **Raw Data (R2)**:
  ```json
  {
    "eventId": "...",
    "source": "gdacs",
    "rawJson": "{...}",
    "timestamp": "...",
    "ingestionTimestamp": "...",
    "provenance": "{...}"
  }
  ```
- **Processed Data (PostgreSQL)**:
  ```json
  {
    "eventId": "...",
    "alertId": "...",
    "title": "...",
    "severity": "...",
    "timestamp": "...",
    "location": "{...}",
    "affectedPopulation": "...",
    "evacuation": "...",
    "workflowName": "...",
    "ingestionTimestamp": "..."
  }
  ```

### 9. Write to R2 Node
- **Type**: Function Node (MCP tools.automation)
- **Purpose**: Store raw JSON in R2 bucket `harvy-raw`
- **Path Pattern**: `gdacs/{date}/{eventId}.json`
- **Metadata**:
  - source: `gdacs`
  - workflow: `Harvy — gdacs Ingestion`
  - eventId: `{eventId}`

### 10. Write to PostgreSQL Node
- **Type**: Function Node (MCP tools.automation)
- **Purpose**: Store processed data in PostgreSQL table `gdacs_alerts`
- **Table Schema**: See above for processed data structure

### 11. Update Backfill Cursor Node
- **Type**: Function Node (MCP tools.automation)
- **Purpose**: Update cursor to forward watermark for next run
- **Storage**: `gdacs_backfill_cursor` data table

### 12. Logging Nodes
- **OpenObserve Logger**: Log success/failure to OpenObserve
- **Error Logging**: Log errors to `harvy_errors` table

## Configuration Requirements

### Environment Variables

```bash
# Webshare Proxy (required for scraping)
WEBSHARE_PROXY_URL=http://proxy.webshare.io:80
WEBSHARE_PROXY_USER=your_username
WEBSHARE_PROXY_PASS=your_password

# GDACS API (public, no key required)
# No additional configuration needed
```

### Data Tables

1. **gdacs_dedupe_table**: Stores dedupe keys to prevent duplicates
2. **gdacs_backfill_cursor**: Stores last ingestion timestamp
3. **harvy_errors**: Logs errors and warnings

### Storage

1. **R2 Bucket**: `harvy-raw`
   - Path: `gdacs/{date}/{eventId}.json`
   - Format: Raw JSON
   
2. **PostgreSQL**: Table `gdacs_alerts`
   - Schema: Processed alert data

## Provenance Tracking

Each alert includes:
- `source`: `gdacs.org`
- `retrievedAt`: ISO8601 timestamp
- `license`: `CC-BY-4.0`
- `attribution`: `Global Disaster Alert and Coordination System (GDACS)`
- `dataQuality`: `machine-readable-api`

## Deduplication

- **Key**: `{alert.id}-{alert.timestamp}`
- **Storage**: `gdacs_dedupe_table`
- **Behavior**: Skip duplicates, log to OpenObserve

## Error Handling

- Empty results: Log warning to `harvy_errors`
- API failures: Log error with retry context
- Dedupe failures: Continue with warning

## Monitoring

- **OpenObserve**: Logs and traces
- **Metrics**: Alert counts, duplicate counts, error counts
- **Traces**: End-to-end workflow execution

## Activation Checklist

- [ ] Webshare proxy configured and verified
- [ ] MCP API key available at `~/.config/harvy/n8n_mcp_key`
- [ ] R2 bucket `harvy-raw` exists
- [ ] PostgreSQL table `gdacs_alerts` created
- [ ] Data tables (`gdacs_dedupe_table`, `gdacs_backfill_cursor`) created
- [ ] Environment variables set
- [ ] Workflow deployed via MCP
- [ ] Workflow validated
- [ ] Bounded test executed successfully
- [ ] Test results reviewed in OpenObserve
- [ ] Workflow activated

## MCP Commands

### Create Workflow
```bash
curl -X POST https://n8n.harvy.dev/mcp-server/http/tools/automation.workflows.create_workflow_from_code \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "NiDaApcjYhqmh8Wp",
    "workflowName": "Harvy — gdacs Ingestion",
    "workflowJson": { ...full workflow JSON... },
    "active": false
  }'
```

### Validate Workflow
```bash
curl -X POST https://n8n.harvy.dev/mcp-server/http/tools/automation.workflows.validate_workflow \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "NiDaApcjYhqmh8Wp",
    "workflowId": "workflow-id-from-create"
  }'
```

### Test Workflow
```bash
curl -X POST https://n8n.harvy.dev/mcp-server/http/tools/automation.workflows.test_workflow \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "NiDaApcjYhqmh8Wp",
    "workflowId": "workflow-id-from-create",
    "testData": {
      "backfillCursor": "2024-10-23T00:00:00Z",
      "forwardWatermark": "2024-10-30T00:00:00Z"
    },
    "bounded": true,
    "maxExecutions": 10
  }'
```

## Expected Output

### Successful Execution
```json
{
  "success": true,
  "workflowId": "workflow-id",
  "versionId": "1.0.0",
  "executionId": "execution-id",
  "rowCounts": {
    "alerts": 42,
    "duplicates": 3,
    "errors": 0
  }
}
```

### Data Flow
1. Cron trigger → Metadata generation → Configuration setup → Cursor retrieval
2. HTTP Request → Alert processing → Deduplication → Data preparation
3. R2 storage → PostgreSQL storage → Cursor update → Logging

## References

- GDACS API Documentation: https://www.gdacs.org/api/v2/
- n8n MCP Server: https://n8n.harvy.dev/mcp-server/http
- Harvy Documentation: /docs/CONNECTOR-CANDIDATES.md
- Project Memory: #918, #945, #946

## Notes

- All MCP tool calls require Bearer token authentication
- Webshare proxy is mandatory for scraping compliance
- GDACS data is CC-BY-4.0 licensed
- Maximum 50 in-flight Spider Unlimited requests across all workflows
- Bounded tests should process < 100 records for verification
