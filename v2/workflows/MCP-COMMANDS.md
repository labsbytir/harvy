# n8n MCP Commands for fema-openfema Workflow

## Overview
Workflow ID: `7OucM9UE1R9UG594`
Workflow Name: Harvy — fema-openfema Ingestion
MCP Server: `https://n8n.harvy.dev/mcp-server/http`
Authentication: Bearer token from `~/.config/harvy/n8n_mcp_key`

---

## Required MCP Tools

### Available Tools (from tools/list)
```json
{
  "tools": [
    "automation.listWorkflows",
    "automation.getWorkflow",
    "automation.createWorkflow",
    "automation.updateWorkflow",
    "automation.deleteWorkflow",
    "automation.activateWorkflow",
    "automation.deactivateWorkflow",
    "automation.executeWorkflow",
    "automation.validateWorkflow",
    "automation.getWorkflowExecution",
    "automation.listWorkflowExecutions"
  ]
}
```

---

## Step-by-Step MCP Operations

### Step 1: Validate MCP Connection

**Command:** `tools.list`

```bash
curl -X POST https://n8n.harvy.dev/mcp-server/http/tools/list \
  -H "Authorization: Bearer $N8N_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
```json
{
  "tools": [...],
  "tools.length": 58
}
```

---

### Step 2: Check if Workflow Exists

**Command:** `automation.listWorkflows`

```bash
curl -X POST https://n8n.harvy.dev/mcp-server/http/tools/automation.listWorkflows \
  -H "Authorization: Bearer $N8N_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Filter for:** `workflows[].id == "7OucM9UE1R9UG594"`

**Expected Response:**
```json
{
  "workflows": [
    {
      "id": "7OucM9UE1R9UG594",
      "name": "Harvy — fema-openfema Ingestion",
      "active": false,
      "updatedAt": "...",
      "createdAt": "..."
    }
  ]
}
```

---

### Step 3: Update Workflow via MCP

**Command:** `automation.updateWorkflow`

**Payload:** `v2/workflows/fema-openfema.workflow.json`

```bash
curl -X POST https://n8n.harvy.dev/mcp-server/http/tools/automation.updateWorkflow \
  -H "Authorization: Bearer $N8N_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "7OucM9UE1R9UG594",
    "workflow_json": {
      "name": "Harvy — fema-openfema Ingestion",
      "id": "7OucM9UE1R9UG594",
      "nodes": [...],
      "connections": {...},
      "settings": {...},
      "active": false,
      "meta": {...}
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "workflow_id": "7OucM9UE1R9UG594",
  "version_id": "1.0.1",
  "updated_at": "2026-10-30T14:30:00Z"
}
```

**Files to Update:**
- `v2/workflows/fema-openfema.workflow.json` (this file)

**Changes Applied:**
- Added MCP metadata to meta.mcp_operations
- Set active: false (workflow inactive until tests pass)
- Added provenance tracking fields
- Added deterministic event_id generation
- Added error handling to harvy_errors
- Added OpenObserve logging configuration

---

### Step 4: Validate Workflow Structure

**Command:** `automation.validateWorkflow`

```bash
curl -X POST https://n8n.harvy.dev/mcp-server/http/tools/automation.validateWorkflow \
  -H "Authorization: Bearer $N8N_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "7OucM9UE1R9UG594"
  }'
```

**Validation Checks:**
- ✓ Workflow JSON is valid
- ✓ All required nodes exist
- ✓ Connections are properly configured
- ✓ Credentials reference valid credential types
- ✓ No circular dependencies
- ✓ Timeout values within bounds (max 3600s)

**Expected Response:**
```json
{
  "valid": true,
  "warnings": [],
  "errors": []
}
```

---

### Step 5: Execute Bounded Manual Test

**Command:** `automation.executeWorkflow` (or via Harvy API)

#### Option A: Execute via n8n MCP (if supported)
```bash
curl -X POST https://n8n.harvy.dev/mcp-server/http/tools/automation.executeWorkflow \
  -H "Authorization: Bearer $N8N_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "7OucM9UE1R9UG594",
    "trigger": "manual",
    "inputs": {
      "source_id": "src_openfema",
      "idempotency_key": "test-fema-$(date +%s)"
    }
  }'
```

#### Option B: Execute via Harvy API (primary method)
```bash
curl -X POST https://harvy.dev/api/v1/runs \
  -H "x-harvy-organization-id: harvy-core" \
  -H "x-harvy-product: automation" \
  -H "Content-Type: application/json" \
  -d '{
    "contract_version": 1,
    "run_id": "test-fema-$(date +%s)-manual",
    "trace_id": "test-fema-$(date +%s)-manual",
    "config_revision": "v1",
    "connector_id": "fema-openfema-scraper",
    "source_scope_id": "scope-openfema",
    "access_scope_id": "tenant-harvy-core",
    "target_url": "https://api.fema.gov/open/v2/DisasterDeclarations",
    "mode": "api",
    "provider": "registered_api",
    "required_proxy": "webshare",
    "preflight_required": true,
    "direct_fallback_allowed": false,
    "max_pages": 5,
    "deadline_seconds": 300,
    "idempotency_key": "test-fema-$(date +%s)-manual"
  }'
```

**Expected Test Execution:**
```json
{
  "run_id": "test-fema-1234567890-manual",
  "status": "queued",
  "source_id": "src_openfema",
  "timestamp": "2026-10-30T14:35:00Z"
}
```

**Verification Steps After Test:**
1. Check Harvy run status: `GET /api/v1/runs/{run_id}`
2. Verify artifacts in R2: `harvy-raw/fema-openfema/{date}/`
3. Check OpenObserve logs: dataset `harvy-automation`
4. Verify error table: `harvy_errors` (should be empty)
5. Check provenance: event_id matches deterministic format

---

### Step 6: Verify Test Results

**Command:** `automation.getWorkflowExecution`

```bash
curl -X POST https://n8n.harvy.dev/mcp-server/http/tools/automation.getWorkflowExecution \
  -H "Authorization: Bearer $N8N_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "7OucM9UE1R9UG594",
    "execution_id": "test-fema-1234567890-manual"
  }'
```

**Expected Verification:**
- ✓ Fetch: API call to FEMA succeeded
- ✓ Normalize: 5 records returned and mapped correctly
- ✓ Dedupe: No duplicate disasterNumbers
- ✓ Error path: No errors logged to harvy_errors
- ✓ Provenance: All fields present and correct
- ✓ OpenObserve: Logs and traces recorded

**Row Counts Expected:**
- Raw artifacts: 5 records (or fewer if API returns less)
- Processed artifacts: 5 records
- Evidence entries: 5 records in default.evidence
- Error entries: 0

---

### Step 7: Activate Workflow (Only After Successful Test)

**Command:** `automation.activateWorkflow`

```bash
curl -X POST https://n8n.harvy.dev/mcp-server/http/tools/automation.activateWorkflow \
  -H "Authorization: Bearer $N8N_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "7OucM9UE1R9UG594",
    "active": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "workflow_id": "7OucM9UE1R9UG594",
  "active": true,
  "activated_at": "2026-10-30T14:40:00Z"
}
```

---

## MCP Command Summary

| Step | MCP Command | File/Action | Status |
|------|-------------|-------------|--------|
| 1 | tools.list | Validate connection | ✓ Required |
| 2 | automation.listWorkflows | Check existing | ✓ Required |
| 3 | automation.updateWorkflow | Update workflow | ✓ Ready |
| 4 | automation.validateWorkflow | Validate structure | ✓ Ready |
| 5 | automation.executeWorkflow | Bounded test | ✓ Ready |
| 6 | automation.getWorkflowExecution | Verify results | ✓ Ready |
| 7 | automation.activateWorkflow | Activate | ✓ Ready |

---

## Post-Activation Verification

After activation, monitor:

### OpenObserve Dashboards
- Dataset: `harvy-automation`
- Service: `fema-openfema-ingestion`
- Metrics: run_count, error_rate, duration

### Harvy API
```bash
# Check run status
curl -X GET https://harvy.dev/api/v1/runs?source_id=src_openfema \
  -H "x-harvy-organization-id: harvy-core"
```

### R2 Artifacts
```bash
# List artifacts
aws s3 ls s3://harvy-raw/fema-openfema/ --recursive --human-readable
```

### Error Tracking
```bash
# Check error table (via Harvy API or direct query)
curl -X GET https://harvy.dev/api/v1/errors?source_id=src_openfema \
  -H "x-harvy-organization-id: harvy-core"
```

---

## Rollback Procedure

If activation causes issues:

```bash
# Deactivate workflow
curl -X POST https://n8n.harvy.dev/mcp-server/http/tools/automation.deactivateWorkflow \
  -H "Authorization: Bearer $N8N_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "7OucM9UE1R9UG594",
    "active": false
  }'
```

---

## References

- [Harvy Automation Contract](../shared/automation-run.ts)
- [OpenFEMA Connector](../catalog/connectors/sources/openfema.ts)
- [n8n MCP Server Docs](https://docs.n8n.io/connect/connect-to-n8n-mcp-server.md)
- [Harvy Development Guide](../../docs/DEVELOPMENT.md)

---

## Quick Start Commands

```bash
# Make executable
chmod +x v2/workflows/fema-openfema.mcp-operations.sh

# Update workflow
./v2/workflows/fema-openfema.mcp-operations.sh update

# Validate workflow
./v2/workflows/fema-openfema.mcp-operations.sh validate

# Run bounded test (via Harvy API)
curl -X POST https://harvy.dev/api/v1/runs \
  -H "x-harvy-organization-id: harvy-core" \
  -H "Content-Type: application/json" \
  -d @test-payload.json

# Activate workflow
./v2/workflows/fema-openfema.mcp-operations.sh activate
```
