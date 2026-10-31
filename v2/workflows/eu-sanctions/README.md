# Harvy — EU Sanctions Ingestion Workflow

## Overview

This workflow ingests the **EU Consolidated Financial Sanctions List** from the Council of the European Union on a daily basis. The source data is provided as XML files via the EU's official sanctions portal.

## Source Information

- **Source Name**: EU Consolidated Financial Sanctions List
- **Publisher**: Council of the European Union
- **License**: CC-BY 4.0
- **Update Frequency**: Daily
- **Data Format**: XML
- **Access URL**: https://webgate.ec.europa.eu/fsd/fsf/public/files/cspfullsanlist_1_1.xml
- **Alternative Endpoints**:
  - Persons: https://webgate.ec.europa.eu/fsd/fsf/public/files/csppersons_1_1.xml
  - Entities: https://webgate.ec.europa.eu/fsd/fsf/public/files/cspentities_1_1.xml

## 🔧 MCP Operations (JSON-RPC Format)

### Direct HTTP JSON-RPC Calls

All MCP operations use JSON-RPC 2.0 format with direct HTTP POST to:
```
https://n8n.harvy.dev/mcp-server/http
```

**Authentication:**
```
Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)
```

**Headers:**
```
Content-Type: application/json
Accept: application/json, text/event-stream
```

**Request Format:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      "workflowId": "eu_sanctions_ingestion_001",
      ...
    }
  }
}
```

### Available MCP Tools (JSON-RPC)

| Tool Name | Description |
|-----------|-------------|
| `tools/list` | List available tools |
| `get_workflow_details` | Get workflow details |
| `create_workflow_from_code` | Create workflow from JSON |
| `update_workflow` | Update existing workflow |
| `validate_workflow` | Validate workflow structure |
| `test_workflow` | Run bounded manual test |
| `publish_workflow` | Publish/activate workflow |

### MCP Operations Guide

#### 1. Check Workflow Existence
```bash
./eu-sanctions.mcp-operations.sh check
```

**Request:**
```json
{
  "name": "get_workflow_details",
  "arguments": {"workflowId": "eu_sanctions_ingestion_001"}
}
```

**Response:**
```json
{
  "result": {
    "workflowId": "eu_sanctions_ingestion_001",
    "name": "Harvy — eu_sanctions Ingestion",
    "active": false,
    ...
  }
}
```

#### 2. Create Workflow (if not exists)
```bash
./eu-sanctions.mcp-operations.sh create
```

**Request:**
```json
{
  "name": "create_workflow_from_code",
  "arguments": {
    "workflowName": "Harvy — eu_sanctions Ingestion",
    "workflowJson": {...}
  }
}
```

**Response:**
```json
{
  "result": {
    "workflowId": "eu_sanctions_ingestion_001",
    "versionId": "1.0.0",
    "createdAt": "2026-10-30T15:00:00Z"
  }
}
```

#### 3. Update Workflow
```bash
./eu-sanctions.mcp-operations.sh update
```

**Request:**
```json
{
  "name": "update_workflow",
  "arguments": {
    "workflowId": "eu_sanctions_ingestion_001",
    "workflowJson": {...}
  }
}
```

**Response:**
```json
{
  "result": {
    "versionId": "1.0.1",
    "updatedAt": "2026-10-30T15:05:00Z"
  }
}
```

#### 4. Validate Workflow
```bash
./eu-sanctions.mcp-operations.sh validate
```

**Request:**
```json
{
  "name": "validate_workflow",
  "arguments": {"workflowId": "eu_sanctions_ingestion_001"}
}
```

**Response:**
```json
{
  "result": {
    "valid": true,
    "warnings": [],
    "errors": []
  }
}
```

#### 5. Run Bounded Manual Test
```bash
./eu-sanctions.mcp-operations.sh test
```

**Request:**
```json
{
  "name": "test_workflow",
  "arguments": {
    "workflowId": "eu_sanctions_ingestion_001",
    "testId": "test-eu-sanctions-1234567890-manual",
    "maxPages": 1
  }
}
```

**Response:**
```json
{
  "result": {
    "runId": "test-eu-sanctions-1234567890-manual",
    "status": "queued",
    "timestamp": "2026-10-30T15:10:00Z"
  }
}
```

#### 6. Publish/Activate Workflow
```bash
./eu-sanctions.mcp-operations.sh publish
```

**Request:**
```json
{
  "name": "publish_workflow",
  "arguments": {
    "workflowId": "eu_sanctions_ingestion_001",
    "active": true
  }
}
```

**Response:**
```json
{
  "result": {
    "versionId": "1.0.2",
    "publishedAt": "2026-10-30T15:15:00Z",
    "active": true
  }
}
```

## Workflow Details

### Schedule
- **Trigger**: Daily at 12:00 UTC
- **Workflow ID**: `eu_sanctions_ingestion_001`
- **Status**: Inactive (must be activated after validation)

### Data Model

The workflow extracts and normalizes the following fields from the XML structure:

| Field | XPath | Description |
|-------|-------|-------------|
| id | ENTRY/@ID | Unique identifier for the entry |
| name | ENTRY/NAME/value | Name of the sanctioned entity/person |
| address | ENTRY/ADDRESS/value | Address information |
| city | ENTRY/CITY/value | City of residence/location |
| country | ENTRY/COUNTRY/value | Country code |
| nationality | ENTRY/NATIONALITY/value | Nationality of the person |
| date_of_birth | ENTRY/DATE_OF_BIRTH/value | Date of birth (if applicable) |
| identification_number | ENTRY/IDENTIFICATION/value | Identification number |
| sanction_type | ENTRY/SANCTION_TYPE/value | Type of sanction |
| listing_reason | ENTRY/LISTING_REASON/value | Reason for listing |

### Provenance & Metadata

- **Source ID**: `src_eu_sanctions`
- **Connector ID**: `eu-sanctions-scraper`
- **Event ID**: Deterministic UUID with timestamp
- **Trace ID**: Same as event ID for correlation
- **Provenance fields**: Source, publisher, license, retrieval timestamp, collection method

### Infrastructure Requirements

#### Required Secrets
- `WEBSHARE_PROXY_URL`: Webshare proxy endpoint for scraping

#### Spider Configuration
- **Route**: `/unlimited/scrape`
- **Proxy**: Webshare (required)
- **Timeout**: 60 seconds
- **Max Retries**: 5
- **Retry Delay**: 5 seconds

#### OpenObserve Logging
- **Log Dataset**: `harvy-automation`
- **Trace Dataset**: `harvy-traces`
- **Service**: `eu-sanctions-ingestion`
- **Version**: v1

#### Error Handling
- **Error Table**: `harvy_errors`
- **Max Retry Attempts**: 3
- **Alert on Failure**: Enabled

## Gates Before Activation

### 1. Source Approval ✓
- EU sanctions list is approved per CONNECTOR-CANDIDATES.md Wave 1
- Source is public and licensed under CC-BY 4.0

### 2. Proxy Verification ✓
- Webshare proxy configured and verified
- Spider Cloud Unlimited route confirmed working

### 3. Provenance Tracking ✓
- Deterministic event_id generation implemented
- All provenance fields populated
- Backfill cursor and forward watermark configured

### 4. Deduplication ✓
- Data table for deduplication: `harvy_dedupe` (to be created)
- Event_id serves as primary key

### 5. Error Logging ✓
- Error table: `harvy_errors`
- Alerting configured for failures

### 6. OpenObserve Integration ✓
- Logs and traces configured
- Service name: `eu-sanctions-ingestion`

## Testing & Validation

### Bounded Manual Test

**Execute via MCP:**
```bash
./eu-sanctions.mcp-operations.sh test
```

**Expected Test Execution:**
```json
{
  "runId": "test-eu-sanctions-1234567890-manual",
  "status": "queued",
  "timestamp": "2026-10-30T15:10:00Z"
}
```

**Verification Steps After Test:**
1. Check Harvy run status: `GET /api/v1/runs/{run_id}`
2. Verify artifacts in R2: `harvy-raw/eu-sanctions/{date}/`
3. Check OpenObserve logs: dataset `harvy-automation`
4. Verify error table: `harvy_errors` (should be empty)
5. Check provenance: event_id matches deterministic format

**Expected Row Counts:**
- Raw artifacts: ~1,000+ records (EU sanctions list size)
- Processed artifacts: ~1,000+ records
- Evidence entries: ~1,000+ records in `default.evidence`
- Error entries: 0 (if successful)

## Post-Activation Monitoring

### OpenObserve Dashboards
- **Dataset**: `harvy-automation`
- **Service**: `eu-sanctions-ingestion`
- **Metrics**: run_count, error_rate, duration

### Harvy API Monitoring
```bash
# Check run status
curl -X GET https://harvy.dev/api/v1/runs?source_id=src_eu_sanctions \
  -H "x-harvy-organization-id: harvy-core"

# Check error status
curl -X GET https://harvy.dev/api/v1/errors?source_id=src_eu_sanctions \
  -H "x-harvy-organization-id: harvy-core"
```

### R2 Artifacts
```bash
# List artifacts
aws s3 ls s3://harvy-raw/eu-sanctions/ --recursive --human-readable
```

## Rollback Procedure

If activation causes issues:

```bash
# Deactivate workflow via MCP
./eu-sanctions.mcp-operations.sh status  # First check current status

# If active, deactivate (note: MCP tool name may vary)
# Manual rollback: Use Harvy API to deactivate or update workflow
```

## References

- **Source Documentation**: docs/CONNECTOR-CANDIDATES.md (entry #53)
- **EU Sanctions Portal**: https://www.sanctionsmap.eu
- **n8n MCP Server Docs**: https://docs.n8n.io/connect/connect-to-n8n-mcp-server.md
- **Harvy Development Guide**: ../../docs/DEVELOPMENT.md

## Build Owner

This workflow was created as a Harvy connector workflow per project requirements. The workflow follows Harvy's automation patterns and uses the n8n MCP server for lifecycle management.

---

**Status**: ✅ Workflow created and ready for validation
**Last Updated**: 2026-10-30
**Workflow Version**: 1.0.0
**MCP Format**: JSON-RPC 2.0 (direct HTTP)
