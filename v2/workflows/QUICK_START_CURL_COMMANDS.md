# Quick Start: Direct HTTP Calls to n8n MCP

## Overview
This guide provides the exact `curl` commands to deploy the **Harvy — un_data Ingestion** workflow using direct HTTP calls to the n8n MCP endpoint.

**Endpoint:** `https://n8n.harvy.dev/mcp-server/http`

---

## Prerequisites

### 1. MCP Key
```bash
# Get your MCP key (DO NOT PRINT THIS VALUE)
cat ~/.config/harvy/n8n_mcp_key

# Should return a JWT token (272 bytes)
```

### 2. Workflow File
Choose which workflow file to deploy:
- **Minimal:** `un_data_workflow_minimal.json` (4 nodes, quick start)
- **Full:** `un_data_ingestion.json` (5 nodes, all features)

### 3. Tools
```bash
# Install jq for JSON parsing (recommended)
brew install jq

# Or use grep/awk if jq not available
```

---

## Step-by-Step Curl Commands

### Step 1: Create Workflow

**Command:**
```bash
WORKFLOW_ID=$(curl -sS -X POST https://n8n.harvy.dev/mcp-server/http/rest/workflow \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "name": "Harvy — un_data Ingestion",
    "active": false,
    "settings": {"executionOrder": "v1"},
    "projectId": "NiDaApcjYhqmh8Wp"
  }' | jq -r '.id')

echo "Workflow ID: $WORKFLOW_ID"
```

**Expected Output:**
```
Workflow ID: cJwQTqru5zPBkj3y
```

**Verify:**
```bash
curl -sS -X GET https://n8n.harvy.dev/mcp-server/http/rest/workflow/$WORKFLOW_ID \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" | jq '.name, .active'
```

---

### Step 2: Import Nodes (Manual in n8n Web UI)

**Note:** Nodes can be imported manually via the n8n web interface:
1. Go to: `https://n8n.harvy.dev/`
2. Select your workflow
3. Click "Import from File"
4. Choose: `un_data_workflow_minimal.json` or `un_data_ingestion.json`

**Alternative:** Use MCP node creation API for each node

---

### Step 3: Validate Workflow

**Command:**
```bash
VALIDATION=$(curl -sS -X POST https://n8n.harvy.dev/mcp-server/http/rest/workflow/validate \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" \
  -H "Content-Type: application/json" \
  -d "{\"workflowId\":\"$WORKFLOW_ID\"}")

echo "Validation Response:"
echo "$VALIDATION" | jq '.valid, .errors, .warnings'
```

**Expected Output:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

**If validation fails:**
```bash
echo "$VALIDATION" | jq '.errors'
echo "$VALIDATION" | jq '.warnings'
```

---

### Step 4: Test Workflow (Bounded)

**Command:**
```bash
EXECUTION=$(curl -sS -X POST https://n8n.harvy.dev/mcp-server/http/rest/workflow/test \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" \
  -H "Content-Type: application/json" \
  -d "{\"workflowId\":\"$WORKFLOW_ID\",\"bounded\":true,\"maxRecords\":100}")

echo "Test Response:"
echo "$EXECUTION" | jq '.executionId, .status, .result'
```

**Expected Output:**
```json
{
  "executionId": "exec_abc123def456",
  "status": "success",
  "result": {
    "nodeCount": 4,
    "itemCount": 100,
    "errors": 0,
    "duplicatesRemoved": 5
  }
}
```

**Save Execution ID:**
```bash
EXECUTION_ID=$(echo "$EXECUTION" | jq -r '.executionId')
echo "Execution ID: $EXECUTION_ID"
```

---

### Step 5: Get Execution Results

**Command:**
```bash
RESULTS=$(curl -sS -X GET https://n8n.harvy.dev/mcp-server/http/rest/execution/$EXECUTION_ID \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" \
  -H "Content-Type: application/json")

echo "Execution Results:"
echo "$RESULTS" | jq '.data.itemCount, .data.errorCount, .data.duplicatesRemoved'
```

**Expected Output:**
```json
{
  "itemCount": 100,
  "errorCount": 0,
  "duplicatesRemoved": 5
}
```

---

### Step 6: Activate Workflow

**Command:**
```bash
ACTIVATION=$(curl -sS -X PATCH https://n8n.harvy.dev/mcp-server/http/rest/workflow/$WORKFLOW_ID \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" \
  -H "Content-Type: application/json" \
  -d '{"active": true}')

echo "Activation Response:"
echo "$ACTIVATION" | jq '.active, .updatedAt'
```

**Expected Output:**
```json
{
  "active": true,
  "updatedAt": "2026-10-30TXX:XX:XX.XXXZ"
}
```

---

### Step 7: Get Version ID

**Command:**
```bash
VERSION_INFO=$(curl -sS -X GET https://n8n.harvy.dev/mcp-server/http/rest/workflow/$WORKFLOW_ID \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" \
  -H "Content-Type: application/json")

VERSION_ID=$(echo "$VERSION_INFO" | jq -r '.versionId')
echo "Version ID: $VERSION_ID"
```

**Expected Output:**
```
Version ID: 1.0.0
```

---

### Step 8: Check Basin SQL Ingestion

**Note:** This requires direct Basin SQL access. In production, run:

```sql
-- Query Basin SQL for ingested records
SELECT COUNT(*) as row_count
FROM harvy_stream
WHERE ingestion_pipeline = 'harvy_pipeline_un_data';
```

**Or via n8n MCP (if Basin connector available):**
```bash
# This would use Basin MCP tools
# Not implemented in this quick start
```

---

## Complete One-Liner Deployment Script

Save this as `deploy_quick.sh` and run:

```bash
#!/bin/bash
set -e

echo "Starting deployment..."

# Step 1: Create
WORKFLOW_ID=$(curl -sS -X POST https://n8n.harvy.dev/mcp-server/http/rest/workflow \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" \
  -H "Content-Type: application/json" \
  -d '{"name":"Harvy — un_data Ingestion","active":false,"settings":{"executionOrder":"v1"},"projectId":"NiDaApcjYhqmh8Wp"}' | jq -r '.id')

echo "✓ Workflow created: $WORKFLOW_ID"

# Step 2: Validate
curl -sS -X POST https://n8n.harvy.dev/mcp-server/http/rest/workflow/validate \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" \
  -H "Content-Type: application/json" \
  -d "{\"workflowId\":\"$WORKFLOW_ID\"}" | jq '.valid'

echo "✓ Workflow validated"

# Step 3: Test
EXECUTION_ID=$(curl -sS -X POST https://n8n.harvy.dev/mcp-server/http/rest/workflow/test \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" \
  -H "Content-Type: application/json" \
  -d "{\"workflowId\":\"$WORKFLOW_ID\",\"bounded\":true,\"maxRecords\":100}" | jq -r '.executionId')

echo "✓ Test executed: $EXECUTION_ID"

# Step 4: Activate
curl -sS -X PATCH https://n8n.harvy.dev/mcp-server/http/rest/workflow/$WORKFLOW_ID \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" \
  -H "Content-Type: application/json" \
  -d '{"active":true}' | jq '.active'

echo "✓ Workflow activated"

# Step 5: Get version
VERSION_ID=$(curl -sS -X GET https://n8n.harvy.dev/mcp-server/http/rest/workflow/$WORKFLOW_ID \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" | jq -r '.versionId')

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "Workflow ID: $WORKFLOW_ID"
echo "Version ID: $VERSION_ID"
echo "Execution ID: $EXECUTION_ID"
echo "Status: SUCCESS"
```

**Run it:**
```bash
chmod +x deploy_quick.sh
./deploy_quick.sh
```

---

## Error Handling

### Common Issues & Solutions

#### Issue 1: 401 Unauthorized
**Cause:** Invalid MCP key
**Fix:**
```bash
# Verify key is correct
cat ~/.config/harvy/n8n_mcp_key

# If expired, regenerate via n8n web interface
# Settings > Instance-level MCP > Connect > API key tab
```

#### Issue 2: 404 Not Found
**Cause:** Workflow doesn't exist or endpoint wrong
**Fix:**
```bash
# Verify endpoint
curl -I https://n8n.harvy.dev/mcp-server/http/rest/workflow

# Should return 200 OK
```

#### Issue 3: Workflow validation fails
**Cause:** Node configuration issues
**Fix:**
```bash
# Check validation response
curl -sS -X POST https://n8n.harvy.dev/mcp-server/http/rest/workflow/validate \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" \
  -d "{\"workflowId\":\"$WORKFLOW_ID\"}" | jq '.errors'

# Fix node configuration in n8n web UI
```

#### Issue 4: Test returns errors
**Cause:** API issues or data problems
**Fix:**
```bash
# Check execution results
curl -sS -X GET https://n8n.harvy.dev/mcp-server/http/rest/execution/$EXECUTION_ID \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" | jq '.data'

# Verify Webshare proxy is working
curl -x "$WEBSHARE_PROXY_URL" "https://data.un.org/Rest/GetData/Population/indicator*country*year"
```

---

## Monitoring Commands

### Check Active Workflows
```bash
curl -sS -X GET https://n8n.harvy.dev/mcp-server/http/rest/workflows \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" | jq '.data[] | {id, name, active}'
```

### Check Execution Status
```bash
curl -sS -X GET https://n8n.harvy.dev/mcp-server/http/rest/execution/$EXECUTION_ID \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" | jq '.status, .data.itemCount, .data.errorCount'
```

### Check Workflow Details
```bash
curl -sS -X GET https://n8n.harvy.dev/mcp-server/http/rest/workflow/$WORKFLOW_ID \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" | jq '.name, .active, .versionId'
```

---

## Success Criteria Checklist

After deployment, verify:

- [ ] Workflow ID obtained and saved
- [ ] Workflow validated (valid: true, errors: [])
- [ ] Bounded test executed successfully
- [ ] Execution ID obtained and saved
- [ ] Workflow activated (active: true)
- [ ] Version ID obtained
- [ ] Row counts verified in Basin SQL
- [ ] No errors in harvy_errors table
- [ ] OpenObserve traces visible

---

## Quick Reference

| Step | Command Type | Endpoint | Data |
|------|--------------|----------|------|
| Create | POST | /rest/workflow | name, active, projectId |
| Validate | POST | /rest/workflow/validate | workflowId |
| Test | POST | /rest/workflow/test | workflowId, bounded, maxRecords |
| Activate | PATCH | /rest/workflow/{id} | active: true |
| Get Details | GET | /rest/workflow/{id} | - |
| Get Execution | GET | /rest/execution/{id} | - |

---

## Notes

- **Never print the MCP key** in logs, files, or documentation
- **Use Webshare proxy** for all external API calls
- **Start with bounded tests** (maxRecords: 100) before full runs
- **Monitor rate limits** (Spider Unlimited: 50 in-flight requests globally)
- **Check Basin SQL** for actual ingestion counts
- **Review harvy_errors** table for any issues

---

## Questions?

Check the full documentation:
- `UN_DATA_DEPLOYMENT_GUIDE.md` - Step-by-step guide
- `HARVY_UN_DATA_INGESTION_MANUAL.md` - Complete documentation
- `DEPLOYMENT_SUMMARY.md` - Executive summary

---

**MCP Endpoint:** `https://n8n.harvy.dev/mcp-server/http`  
**Project:** Harvy  
**Workflow:** Harvy — un_data Ingestion  
**Status:** Ready for deployment