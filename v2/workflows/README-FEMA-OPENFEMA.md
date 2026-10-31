# fema-openfema Workflow - Quick Start Guide

## 🎯 Objective
Create and deploy the "Harvy — fema-openfema Ingestion" workflow (ID: `7OucM9UE1R9UG594`) using n8n MCP tools.

## ✅ Status
**Workflow Status:** ✅ Ready for MCP Operations
**Files Created:** 4 files (1,405 lines total)
**MCP Integration:** ✅ Configured and documented
**Gates Verified:** ✅ All prerequisites documented

---

## 📋 Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `fema-openfema.workflow.json` | 325 | Complete n8n workflow definition |
| `fema-openfema.DEPLOYMENT.md` | 264 | Deployment checklist and verification steps |
| `fema-openfema.mcp-operations.sh` | 176 | Executable MCP operations script |
| `MCP-COMMANDS.md` | 377 | Detailed MCP command reference |
| `CHANGES-SUMMARY.md` | 263 | Complete change summary |

---

## 🚀 Quick Start (Copy-Paste Commands)

### Step 1: Prepare Environment
```bash
# Navigate to workflows directory
cd /Users/pen/Desktop/harvy-new/v2/workflows

# Make script executable
chmod +x fema-openfema.mcp-operations.sh
```

### Step 2: Update Workflow via MCP
```bash
./fema-openfema.mcp-operations.sh update
```

**Expected Output:**
```
✓ MCP connection validated
✓ Workflow updated successfully
Version ID: 1.0.1
Updated at: 2026-10-30T14:30:00Z
```

### Step 3: Validate Workflow Structure
```bash
./fema-openfema.mcp-operations.sh validate
```

**Expected Output:**
```
✓ Workflow structure validated
✓ All nodes configured correctly
✓ No errors detected
```

### Step 4: Execute Bounded Manual Test
```bash
# Option A: Use the script (simulated)
./fema-openfema.mcp-operations.sh test

# Option B: Execute via Harvy API (recommended)
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

**Expected Response:**
```json
{
  "run_id": "test-fema-1234567890-manual",
  "status": "queued",
  "source_id": "src_openfema",
  "timestamp": "2026-10-30T15:00:00Z"
}
```

### Step 5: Verify Test Results
```bash
# Check Harvy run status
curl -X GET https://harvy.dev/api/v1/runs/test-fema-1234567890-manual \
  -H "x-harvy-organization-id: harvy-core"

# Check R2 artifacts
aws s3 ls s3://harvy-raw/fema-openfema/2026/10/30/ --recursive

# Check OpenObserve logs
echo "Check OpenObserve dataset: harvy-automation"

# Check errors (should be empty)
curl -X GET https://harvy.dev/api/v1/errors?source_id=src_openfema \
  -H "x-harvy-organization-id: harvy-core"
```

**Verification Checklist:**
- [ ] Fetch: API call to FEMA succeeded
- [ ] Normalize: 5 records returned and mapped
- [ ] Dedupe: No duplicate disasterNumbers
- [ ] Error path: No errors logged
- [ ] Provenance: All fields correct
- [ ] OpenObserve: Logs and traces recorded

### Step 6: Activate Workflow (Only If Test Passes)
```bash
./fema-openfema.mcp-operations.sh activate
```

**Expected Output:**
```
✓ Workflow activated successfully
Active: true
Activated at: 2026-10-30T15:05:00Z
```

---

## 📊 Expected Results After Activation

### Hourly Run Metrics
- **Runs per day:** 24
- **Records per run:** 5 (configurable)
- **Daily records:** ~120
- **Artifacts:** Raw + processed in R2
- **Evidence:** 5 entries in PostgreSQL

### Data Flow
```
FEMA API (https://api.fema.gov/open/v2/DisasterDeclarations)
    ↓
Harvy API (/api/v1/runs) [x-harvy-organization-id: harvy-core]
    ↓
n8n Workflow (7OucM9UE1R9UG594)
    ↓
Spider Unlimited (/unlimited/scrape) [Webshare Proxy]
    ↓
R2: harvy-raw/fema-openfema/{date}/run-{id}.json
    ↓
R2: harvy-artifacts/fema-openfema/{date}/run-{id}.json
    ↓
PostgreSQL: default.evidence (5 records)
    ↓
OpenObserve: harvy-automation dataset
```

---

## 🔍 Verification Commands

### Check Workflow Status
```bash
# Via n8n MCP
curl -X POST https://n8n.harvy.dev/mcp-server/http/tools/automation.listWorkflows \
  -H "Authorization: Bearer $N8N_MCP_KEY" \
  -d '{}' | jq '.workflows[] | select(.id == "7OucM9UE1R9UG594")'

# Via n8n REST API
curl -X GET https://n8n.harvy.dev/rest/workflows/7OucM9UE1R9UG594 \
  -H "Authorization: Bearer $N8N_API_KEY"
```

### Check Recent Runs
```bash
# Check Harvy runs
curl -X GET "https://harvy.dev/api/v1/runs?source_id=src_openfema&limit=10" \
  -H "x-harvy-organization-id: harvy-core"

# Check R2 artifacts
s3cmd ls s3://harvy-raw/fema-openfema/2026/10/30/ | tail -20
```

### Check OpenObserve
```bash
# Query logs
echo "Dataset: harvy-automation"
echo "Service: fema-openfema-ingestion"
echo "Time range: last 1 hour"
```

---

## ⚠️ Important Notes

### Do NOT Activate Until:
1. ✅ Bounded manual test executed
2. ✅ Fetch path verified (API call succeeds)
3. ✅ Normalize path verified (records mapped correctly)
4. ✅ Dedupe verified (no duplicates)
5. ✅ Error path verified (no errors)
6. ✅ Provenance verified (all fields correct)
7. ✅ Row counts match expectations

### Workflow is INACTIVE Until Activated
- Current state: `active: false`
- Will not run on schedule until activated
- Safe to test without affecting production

### Rate Limits
- **Global ceiling:** 50 in-flight requests across ALL workflows
- **Timeout:** 300 seconds (5 minutes) per run
- **Max pages:** 5 records per run (configurable)
- **Schedule:** Hourly (24 runs per day)

### Secrets Management
- **Never commit secrets** to repository
- **Use n8n credentials:**
  - `webshare-residential-proxy`
  - `harvy-api-auth`
  - `openobserve-logs`
- **Environment variables** in n8n .env file

---

## 📚 Documentation

### Primary Docs
- **[CHANGES-SUMMARY.md](CHANGES-SUMMARY.md)** - Complete change summary
- **[MCP-COMMANDS.md](MCP-COMMANDS.md)** - All MCP commands with examples
- **[fema-openfema.DEPLOYMENT.md](fema-openfema.DEPLOYMENT.md)** - Full deployment guide

### Related Files
- **[openfema.ts](../catalog/connectors/sources/openfema.ts)** - OpenFEMA connector config
- **[automation-run.ts](../shared/automation-run.ts)** - Automation contract
- **[official-sources-ledger.json](../catalog/reference/official-sources-ledger.json)** - Source registry

---

## 🎯 Success Criteria

### Before Activation
- [ ] MCP update command executed successfully
- [ ] MCP validate command executed successfully
- [ ] Bounded manual test executed
- [ ] All verification checks pass

### After Activation
- [ ] First scheduled run completes successfully
- [ ] Row counts match expectations (~5 records)
- [ ] No errors in harvy_errors table
- [ ] OpenObserve traces recorded
- [ ] Two real scheduled cycles completed
- [ ] Workflow marked as healthy

---

## 🆘 Troubleshooting

### MCP Connection Issues
```bash
# Check MCP key
cat ~/.config/harvy/n8n_mcp_key

# Test MCP connection
curl -X POST https://n8n.harvy.dev/mcp-server/http/tools/list \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" \
  -d '{}' | jq '.tools | length'
```

### Workflow Not Found
```bash
# List all workflows
./fema-openfema.mcp-operations.sh

# Check if workflow ID exists
curl -X POST https://n8n.harvy.dev/mcp-server/http/tools/automation.listWorkflows \
  -H "Authorization: Bearer $N8N_MCP_KEY" \
  -d '{}' | jq '.workflows[] | select(.id == "7OucM9UE1R9UG594")'
```

### Test Execution Issues
```bash
# Check Harvy API status
curl -X GET https://harvy.dev/health

# Check R2 connectivity
aws s3 ls s3://harvy-raw/ --debug

# Check OpenObserve
echo "Verify endpoint: https://eu1-api.openobserve.ai/api/default/harvy-automation/logs"
```

---

## 📞 Support

### Questions?
- Read **[MCP-COMMANDS.md](MCP-COMMANDS.md)** - All commands documented
- Read **[fema-openfema.DEPLOYMENT.md](fema-openfema.DEPLOYMENT.md)** - Full deployment guide
- Check **[CHANGES-SUMMARY.md](CHANGES-SUMMARY.md)** - What was changed

### Need Help?
```bash
# Check MCP tools available
curl -X POST https://n8n.harvy.dev/mcp-server/http/tools/list \
  -H "Authorization: Bearer $N8N_MCP_KEY" \
  -d '{}' | jq '.tools | sort'
```

---

## ✨ Summary

**Workflow ID:** `7OucM9UE1R9UG594`
**Workflow Name:** Harvy — fema-openfema Ingestion
**Status:** ✅ Ready for MCP Operations
**Files:** 5 files (1,405 lines)
**MCP Integration:** ✅ Configured
**Next Step:** Run `./fema-openfema.mcp-operations.sh update`

---

**Created:** 2026-10-30 16:25 UTC
**Last Updated:** 2026-10-30 16:25 UTC
**Status:** Ready for execution
