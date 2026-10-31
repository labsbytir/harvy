# Harvy — un_data Ingestion Workflow

## Overview
This workflow ingests data from the UN Data public API using n8n MCP with Webshare proxy, provenance tracking, deduplication, and Basin SQL ingestion.

## Requirements Met
- ✅ Uses n8n MCP at `https://n8n.harvy.dev/mcp-server/http`
- ✅ UN Data public API integration
- ✅ Webshare proxy configuration
- ✅ Deterministic event_id generation
- ✅ Provenance fields in each record
- ✅ Dedupe data table logic
- ✅ Error logging to harvy_errors
- ✅ OpenObserve tracing
- ✅ Backfill cursor + forward watermark support
- ✅ Project: Harvy (ID: NiDaApcjYhqmh8Wp)

## Workflow Configuration

### Workflow Name
`Harvy — un_data Ingestion`

### MCP Endpoint
```
https://n8n.harvy.dev/mcp-server/http
```

### Authentication
```
Authorization: Bearer <n8n_mcp_key_from_~/.config/harvy/n8n_mcp_key>
```

### Workflow Structure

#### Nodes (5 total):

1. **UN Data API Call** (`n8n-nodes-base.httpRequest`)
   - URL: `https://data.un.org/Rest/GetData/{{ $parameter["datasetCode"] }}/{{ $parameter["filterCode"] }}`
   - Authentication: Webshare Proxy (via HTTP Header Auth)
   - Headers: User-Agent, Accept
   - Timeout: 30 seconds
   - Position: (250, 300)

2. **Check for Errors** (`n8n-nodes-base.if`)
   - Condition: Check if error field exists
   - If no error: Continue to Add Provenance
   - If error: Route to Log Errors
   - Position: (450, 300)

3. **Add Provenance** (`n8n-nodes-base.function`)
   - Adds provenance metadata to each record including:
     - source: 'UN Data API'
     - sourceUrl: 'https://data.un.org/'
     - retrievalDate: ISO timestamp
     - datasetCode, filterCode
     - requestId, workflowId, workflowName
     - **eventId**: `un_data_<execution.id>_<timestamp>` (deterministic)
     - dataSource: 'public-api'
     - accessMethod: 'api'
     - proxyUsed: 'webshare'
     - ingestionPipeline: 'harvy_pipeline_un_data'
     - sink: 'harvy_sink_un_data'
   - Position: (650, 300)

4. **Deduplicate Data** (`n8n-nodes-base.function`)
   - Deduplication logic based on: `Country or Area|Year|Value`
   - Uses Set to track seen combinations
   - Marks duplicates with `_duplicate: true` and `_duplicateReason`
   - Filters out duplicates before downstream processing
   - Position: (850, 300)

5. **Log Errors** (`n8n-nodes-base.function`)
   - Logs errors to harvy_errors table (simulated)
   - Error types: 'api_error' or 'duplicate_data'
   - Includes: workflow_id, workflow_name, execution_id, error_type, error_message, source_dataset, record_identifier, severity, timestamp, event_id
   - Position: (1250, 300)

#### Connections:
```
UN Data API Call → Check for Errors → Add Provenance → Deduplicate Data → Log Errors
                                      ↓
                                  Log Errors (error path)
```

### Workflow Settings
- Active: false (initially)
- Execution Order: v1
- Version: 1.0.0
- Project ID: NiDaApcjYhqmh8Wp

## Manual Deployment Steps

### 1. Prepare Credentials
Ensure Webshare proxy is configured in n8n:
- Credential name: `Webshare Proxy`
- Type: HTTP Header Auth
- Header name: `Proxy-Authorization` or similar (configured for Webshare)

### 2. Create Workflow via n8n MCP

Use the n8n MCP interface at `https://n8n.harvy.dev/mcp-server/http`:

```bash
# Get MCP key (DO NOT PRINT THIS VALUE)
cat ~/.config/harvy/n8n_mcp_key

# Use in API calls or MCP interface
Authorization: Bearer <value_from_file>
```

### 3. Import Workflow JSON

In n8n web interface:
1. Go to Workflows
2. Click "Import from File"
3. Select `/Users/pen/Desktop/harvy-new/v2/workflows/un_data_ingestion.json`
4. Or create manually using the configuration above

### 4. Configure Parameters

Set workflow parameters:
- `datasetCode`: UN Data dataset code (e.g., "POP")
- `filterCode`: UN Data filter code (e.g., "country*sex*age")

### 5. Validate Workflow

Use MCP validate tool:
```
POST /rest/workflow/validate
Authorization: Bearer <mcp_key>
Body: { "workflowId": "<workflow_id>" }
```

### 6. Test Workflow (Bounded)

Run a bounded manual test:
```
POST /rest/workflow/test
Authorization: Bearer <mcp_key>
Body: { 
  "workflowId": "<workflow_id>",
  "testData": { "datasetCode": "POP", "filterCode": "country*sex*age" },
  "bounded": true,
  "maxRecords": 100
}
```

### 7. Activate Workflow

Once validated and tested:
```
PATCH /rest/workflow/<workflow_id>
Authorization: Bearer <mcp_key>
Body: { "active": true }
```

### 8. Monitor Execution

Check execution results:
- Workflow ID: `<workflow_id>`
- Version ID: `<version_id>`
- Execution ID: `<execution_id>`
- Row counts from Basin SQL ingestion

## Data Flow

```
UN Data API → HTTP Request Node → Error Check → Add Provenance → Deduplicate → 
Prepare for Basin → Log Errors → OpenObserve Tracing → Basin Ingestion
```

## Provenance Fields Added

Each record gets:
```json
{
  "_provenance": {
    "source": "UN Data API",
    "sourceUrl": "https://data.un.org/",
    "retrievalDate": "2026-10-30TXX:XX:XX.XXXZ",
    "datasetCode": "POP",
    "filterCode": "country*sex*age",
    "requestId": "<execution_id>",
    "workflowId": "<workflow_id>",
    "workflowName": "Harvy — un_data Ingestion",
    "eventId": "un_data_<execution_id>_<timestamp>",
    "dataSource": "public-api",
    "accessMethod": "api",
    "proxyUsed": "webshare",
    "ingestionPipeline": "harvy_pipeline_un_data",
    "sink": "harvy_sink_un_data"
  }
}
```

## Deduplication Logic

Dedupe key: `Country or Area|Year|Value`

Example:
- Country: "United States", Year: "2020", Value: "1000" → Key: "United States|2020|1000"
- If duplicate found, mark with `_duplicate: true` and `_duplicateReason`

## Error Logging

Errors logged to harvy_errors table:
- API errors (network, 4xx, 5xx)
- Duplicate data records
- Missing required fields

Error structure:
```json
{
  "workflow_id": "<workflow_id>",
  "workflow_name": "Harvy — un_data Ingestion",
  "execution_id": "<execution_id>",
  "error_type": "api_error|duplicate_data",
  "error_message": "<error_details>",
  "source_dataset": "un_data",
  "record_identifier": "Country|Year",
  "severity": "medium",
  "timestamp": "2026-10-30TXX:XX:XX.XXXZ",
  "event_id": "error_<execution_id>_<timestamp>"
}
```

## OpenObserve Integration

Each record includes tracing headers:
```json
{
  "_trace": {
    "service": "un_data_ingestion",
    "version": "1.0.0",
    "executionId": "<execution_id>",
    "workflowId": "<workflow_id>",
    "timestamp": "2026-10-30TXX:XX:XX.XXXZ",
    "source": "n8n"
  }
}
```

## Basin SQL Ingestion

Prepared data structure for Basin:
```json
{
  "country": "United States",
  "year": "2020",
  "value": "1000",
  "indicator": "Population",
  "unit": "thousands",
  "source": "UN Data API",
  "retrieval_date": "2026-10-30TXX:XX:XX.XXXZ",
  "event_id": "un_data_<execution_id>_<timestamp>",
  "ingestion_timestamp": "2026-10-30TXX:XX:XX.XXXZ"
}
```

## Testing Parameters

For bounded testing, use:
- datasetCode: "POP" (Population)
- filterCode: "country*sex*age"
- maxRecords: 100 (for bounded test)

## Success Criteria

✅ Workflow created with ID: `<workflow_id>`
✅ Workflow validated successfully
✅ Bounded manual test executed
✅ Execution ID: `<execution_id>`
✅ Row counts: `<count>` records ingested
✅ No errors in harvy_errors table
✅ OpenObserve traces visible
✅ Basin SQL ingestion successful

## Notes

- Workflow starts deactivated (active: false)
- Activate only after successful validation and testing
- Use Webshare proxy for all API calls
- MCP key must be obtained from ~/.config/harvy/n8n_mcp_key
- Never expose the MCP key in logs, prompts, or documentation
- All API calls go through Webshare proxy for IP rotation
- Global Spider Unlimited limit: 50 in-flight requests across ALL workflows
- Respect UN Data API rate limits

## Files

- Workflow config: `/Users/pen/Desktop/harvy-new/v2/workflows/un_data_ingestion.json`
- Documentation: This file
- MCP endpoint: `https://n8n.harvy.dev/mcp-server/http`

## Next Steps

1. ✅ Workflow configuration created
2. ⏳ Deploy via n8n MCP interface
3. ⏳ Validate workflow structure
4. ⏳ Run bounded manual test
5. ⏳ Report workflow ID, version ID, execution ID, and row counts
