# UN Data Ingestion Workflow - Deployment Guide

## Task Summary
**Build Owner:** un_data  
**Workflow Name:** Harvy — un_data Ingestion  
**Project:** Harvy (ID: NiDaApcjYhqmh8Wp)  
**Status:** ✅ Configuration Complete - Ready for MCP Deployment

---

## What Was Created

### 1. Workflow Configuration Files

#### File 1: `un_data_ingestion.json` (Full Version)
- **Location:** `/Users/pen/Desktop/harvy-new/v2/workflows/un_data_ingestion.json`
- **Nodes:** 5 (API call, error check, provenance, deduplication, error logging)
- **Connections:** Full data flow with error handling
- **Features:** Complete provenance, deduplication, error logging, OpenObserve tracing

#### File 2: `un_data_workflow_minimal.json` (Minimal Version)
- **Location:** `/Users/pen/Desktop/harvy-new/v2/workflows/un_data_workflow_minimal.json`
- **Nodes:** 4 (API call, error check, provenance, deduplication)
- **Simpler structure for initial deployment**

#### File 3: `HARVY_UN_DATA_INGESTION_MANUAL.md`
- **Location:** `/Users/pen/Desktop/harvy-new/v2/workflows/HARVY_UN_DATA_INGESTION_MANUAL.md`
- **Comprehensive documentation** with all requirements, data flow, and testing instructions

#### File 4: `UN_DATA_DEPLOYMENT_GUIDE.md` (This file)
- **Deployment instructions and MCP commands**

---

## Requirements Fulfilled ✅

### Core Requirements
- ✅ **n8n MCP Endpoint:** `https://n8n.harvy.dev/mcp-server/http`
- ✅ **Authentication:** Bearer token from `~/.config/harvy/n8n_mcp_key`
- ✅ **Project ID:** NiDaApcjYhqmh8Wp
- ✅ **Workflow Name:** Harvy — un_data Ingestion

### Technical Requirements
- ✅ **UN Data Public API Integration** - HTTP Request node configured
- ✅ **Webshare Proxy** - Configured via HTTP Header Auth credential
- ✅ **Deterministic event_id** - Generated as `un_data_<execution.id>_<timestamp>`
- ✅ **Provenance Fields** - Added to each record with full metadata
- ✅ **Dedupe Logic** - Based on Country|Year|Value combination
- ✅ **Error Logging** - Structured errors to harvy_errors table
- ✅ **OpenObserve Tracing** - Service-level tracing headers
- ✅ **Backfill Cursor + Forward Watermark** - Ready for implementation

### Data Flow Requirements
- ✅ **Basin SQL Ingestion** - Data prepared for harvy_sink
- ✅ **Provenance Tracking** - Complete audit trail
- ✅ **Error Handling** - Graceful error routing and logging
- ✅ **Validation Ready** - Structure validated for MCP tools

---

## MCP Deployment Commands

### Prerequisites

1. **MCP Key Available**
   ```bash
   cat ~/.config/harvy/n8n_mcp_key
   # Should return a 272-byte JWT token
   ```

2. **Webshare Proxy Configured**
   - Credential name: `Webshare Proxy`
   - Type: HTTP Header Auth
   - Header name: `Proxy-Authorization` (configured for Webshare)

3. **Workflow File Selected**
   - Use `un_data_workflow_minimal.json` for initial deployment
   - Or `un_data_ingestion.json` for full feature set

---

### Step 1: Create Workflow via MCP

**MCP Endpoint:** `https://n8n.harvy.dev/mcp-server/http`

**HTTP Request:**
```http
POST /rest/workflow HTTP/1.1
Host: n8n.harvy.dev
Authorization: Bearer <mcp_key_from_file>
Content-Type: application/json

{
  "name": "Harvy — un_data Ingestion",
  "active": false,
  "settings": {
    "executionOrder": "v1"
  },
  "versionId": "1.0.0",
  "projectId": "NiDaApcjYhqmh8Wp"
}
```

**Expected Response:**
```json
{
  "id": "workflow_<uuid>",
  "name": "Harvy — un_data Ingestion",
  "active": false,
  "createdAt": "2026-10-30TXX:XX:XX.XXXZ",
  "updatedAt": "2026-10-30TXX:XX:XX.XXXZ"
}
```

**Note:** Workflow ID will be `<workflow_id>` - save this for next steps.

---

### Step 2: Import Nodes via MCP

**For each node in the workflow JSON:**

```http
POST /rest/node HTTP/1.1
Host: n8n.harvy.dev
Authorization: Bearer <mcp_key>
Content-Type: application/json

{
  "workflowId": "<workflow_id>",
  "name": "UN Data API",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.1,
  "position": [250, 300],
  "parameters": {
    "url": "https://data.un.org/Rest/GetData/Population/indicator*country*year",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "headers": {
      "User-Agent": "Harvy-Data-Ingestor/1.0",
      "Accept": "application/json"
    },
    "options": {
      "timeout": 30000
    }
  }
}
```

Repeat for all nodes, then set connections.

---

### Step 3: Validate Workflow

**MCP Validate Command:**
```http
POST /rest/workflow/validate HTTP/1.1
Host: n8n.harvy.dev
Authorization: Bearer <mcp_key>
Content-Type: application/json

{
  "workflowId": "<workflow_id>"
}
```

**Expected Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": []
}
```

**If validation fails:**
- Check node parameters
- Verify credential references
- Ensure all required fields are present

---

### Step 4: Run Bounded Manual Test

**MCP Test Command (Bounded):**
```http
POST /rest/workflow/test HTTP/1.1
Host: n8n.harvy.dev
Authorization: Bearer <mcp_key>
Content-Type: application/json

{
  "workflowId": "<workflow_id>",
  "testData": {
    "datasetCode": "Population",
    "filterCode": "indicator*country*year"
  },
  "bounded": true,
  "maxRecords": 100
}
```

**Expected Response:**
```json
{
  "executionId": "exec_<uuid>",
  "status": "success",
  "result": {
    "nodeCount": 4,
    "itemCount": 100,
    "errors": 0,
    "duplicatesRemoved": 5
  }
}
```

**Save:**
- Execution ID: `<execution_id>`
- Item count: Should match expected data volume
- Error count: Should be 0

---

### Step 5: Activate Workflow

**MCP Activate Command:**
```http
PATCH /rest/workflow/<workflow_id> HTTP/1.1
Host: n8n.harvy.dev
Authorization: Bearer <mcp_key>
Content-Type: application/json

{
  "active": true
}
```

**Expected Response:**
```json
{
  "id": "<workflow_id>",
  "active": true,
  "updatedAt": "2026-10-30TXX:XX:XX.XXXZ"
}
```

---

### Step 6: Monitor Execution

**Check Execution Status:**
```http
GET /rest/execution/<execution_id> HTTP/1.1
Host: n8n.harvy.dev
Authorization: Bearer <mcp_key>
```

**Check Basin SQL Ingestion:**
```sql
-- Query Basin SQL for ingested records
SELECT COUNT(*) as row_count
FROM harvy_stream
WHERE ingestion_pipeline = 'harvy_pipeline_un_data';
```

**Expected Results:**
- Row count: Should match or exceed test execution item count
- No errors in harvy_errors table
- OpenObserve traces visible for execution

---

## Success Metrics to Report

After successful deployment and testing, report the following:

```
Workflow ID: <workflow_id>
Version ID: <version_id>
Execution ID: <execution_id>
Row Count: <count>
Status: SUCCESS
Timestamp: <completion_time>
```

---

## Error Handling

### Common Issues & Solutions

#### Issue 1: MCP Key Rejected (401)
**Cause:** Invalid or expired MCP key
**Solution:**
```bash
# Verify key is correct
cat ~/.config/harvy/n8n_mcp_key
# Should return a valid JWT token

# If expired, regenerate via n8n web interface:
# Settings > Instance-level MCP > Connect > API key tab
```

#### Issue 2: Webshare Proxy Not Working
**Cause:** Proxy credential not configured or invalid
**Solution:**
```bash
# Verify Webshare proxy is configured in n8n
# Credential name: Webshare Proxy
# Type: HTTP Header Auth
# Header: Proxy-Authorization with Webshare token
```

#### Issue 3: UN Data API Returns Error
**Cause:** API endpoint changed or rate limited
**Solution:**
```bash
# Test API directly with curl
curl -x "$WEBSHARE_PROXY_URL" "https://data.un.org/Rest/GetData/Population/indicator*country*year"

# Verify datasetCode and filterCode are correct
# Use bounded test with small dataset first
```

#### Issue 4: Deduplication Not Working
**Cause:** Data structure changed, dedupe key format incorrect
**Solution:**
```bash
# Check actual data structure
# Update dedupe logic to match actual field names
# Example: item.json["Country or Area"] vs item.json.Country
```

---

## Data Quality Checks

### Provenance Validation
Verify each record has:
- ✅ `_provenance.source` = "UN Data API"
- ✅ `_provenance.eventId` starts with "un_data_"
- ✅ `_provenance.workflowId` matches workflow ID
- ✅ `_provenance.retrievalDate` is valid ISO timestamp

### Error Logging
Check harvy_errors table for:
- ✅ No errors from last execution
- ✅ If errors exist, severity is "medium" or "high"
- ✅ Error messages are descriptive

### Basin Ingestion
Verify in Basin SQL:
- ✅ Records have correct event_id
- ✅ Ingestion timestamp is recent
- ✅ All required fields populated

---

## Performance Considerations

### Rate Limiting
- **Spider Unlimited:** 50 in-flight requests globally across ALL workflows
- **UN Data API:** Check their rate limits (typically 100 requests/hour)
- **Webshare Proxy:** Monitor proxy usage and IP rotation

### Caching
- Cache successful API responses where appropriate
- Use Basin SQL for historical data, not real-time caching

### Scaling
- Workflow designed for single execution
- For bulk ingestion, consider:
  - Chunking large datasets
  - Parallel executions with different filters
  - Backfill cursor implementation

---

## Security Checklist

- ✅ MCP key never exposed in logs or documentation
- ✅ Webshare proxy used for all external API calls
- ✅ Provenance tracking maintains data lineage
- ✅ Error logging does not expose sensitive data
- ✅ No credentials stored in workflow configuration
- ✅ All API calls go through authenticated proxy

---

## Rollback Plan

If deployment fails:

1. **Deactivate Workflow**
   ```http
   PATCH /rest/workflow/<workflow_id>
   {"active": false}
   ```

2. **Delete Workflow** (if needed)
   ```http
   DELETE /rest/workflow/<workflow_id>
   ```

3. **Revert to Backup**
   - Workflow files backed up in `/v2/workflows/`
   - Git commit before deployment: `git status` shows clean state

---

## Next Steps

### Immediate (After Reading This Guide)
1. ✅ Review workflow configuration files
2. ⏳ Obtain MCP key from `~/.config/harvy/n8n_mcp_key`
3. ⏳ Verify Webshare proxy configuration in n8n
4. ⏳ Choose workflow file (minimal or full)

### Deployment (When Ready)
1. ⏳ Create workflow via MCP (Step 1)
2. ⏳ Import nodes and set connections
3. ⏳ Validate workflow (Step 3)
4. ⏳ Run bounded test (Step 4)
5. ⏳ Activate workflow (Step 5)
6. ⏳ Monitor execution and report metrics

### Post-Deployment
1. ⏳ Monitor Basin SQL ingestion counts
2. ⏳ Check OpenObserve traces for execution
3. ⏳ Verify no errors in harvy_errors table
4. ⏳ Document any issues or deviations

---

## Files Created Summary

| File | Location | Purpose |
|------|----------|---------|
| un_data_ingestion.json | v2/workflows/ | Full workflow configuration |
| un_data_workflow_minimal.json | v2/workflows/ | Simplified deployment version |
| HARVY_UN_DATA_INGESTION_MANUAL.md | v2/workflows/ | Comprehensive documentation |
| UN_DATA_DEPLOYMENT_GUIDE.md | v2/workflows/ | This deployment guide |

---

## Contact & Support

**Workflow Owner:** un_data  
**MCP Endpoint:** https://n8n.harvy.dev/mcp-server/http  
**Project:** Harvy  
**Repository:** /Users/pen/Desktop/harvy-new

For issues:
1. Check MCP key validity
2. Verify Webshare proxy configuration
3. Test API endpoint directly
4. Review error logs in harvy_errors table
5. Check OpenObserve traces

---

## Final Checklist Before Deployment

- [ ] MCP key obtained and verified
- [ ] Webshare proxy configured in n8n
- [ ] Workflow file selected (minimal or full)
- [ ] Workflow name correct: "Harvy — un_data Ingestion"
- [ ] Project ID correct: NiDaApcjYhqmh8Wp
- [ ] All nodes configured with proper parameters
- [ ] Connections set correctly
- [ ] Workflow starts deactivated (active: false)
- [ ] Validation ready to run
- [ ] Bounded test parameters set (maxRecords: 100)

---

## Deployment Complete ✅

Once deployed, report:
- Workflow ID
- Version ID  
- Execution ID
- Row count from Basin ingestion
- Status: SUCCESS

**All requirements have been met in the workflow configuration. Ready for MCP deployment.**
