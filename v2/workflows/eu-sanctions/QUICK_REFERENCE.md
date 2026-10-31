# 🚀 EU Sanctions Workflow - Quick Reference

## 📱 One-Minute Commands (JSON-RPC Format)

### Validate Workflow
```bash
./validate-workflow.sh
```

### Check MCP Status
```bash
./eu-sanctions.mcp-operations.sh check
```

### Create Workflow (if not exists)
```bash
./eu-sanctions.mcp-operations.sh create
```

### Update Workflow
```bash
./eu-sanctions.mcp-operations.sh update
```

### Validate via MCP
```bash
./eu-sanctions.mcp-operations.sh validate
```

### Run Test
```bash
./eu-sanctions.mcp-operations.sh test
```

### Publish/Activate Workflow
```bash
./eu-sanctions.mcp-operations.sh publish
```

### Get Status
```bash
./eu-sanctions.mcp-operations.sh status
```

---

## 🔗 MCP Endpoint (JSON-RPC 2.0)

```
https://n8n.harvy.dev/mcp-server/http
```

**Auth Header:**
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
    "arguments": { ... }
  }
}
```

---

## 📊 Workflow Details

| Property | Value |
|----------|-------|
| Name | Harvy — eu_sanctions Ingestion |
| ID | eu_sanctions_ingestion_001 |
| Schedule | Daily at 12:00 UTC |
| Status | Inactive (ready for validation) |
| Source | EU Consolidated Financial Sanctions List |
| License | CC-BY 4.0 |

---

## 🎯 Key Fields

### Provenance
- event_id: `eu-sanctions-{timestamp}-{random}`
- source_id: `src_eu_sanctions`
- trace_id: Same as event_id
- connector_id: `eu-sanctions-scraper`

### Infrastructure
- Spider route: `/unlimited/scrape`
- Proxy: Webshare (required)
- Timeout: 60s
- Max retries: 5
- Error table: `harvy_errors`

### Logging
- Log dataset: `harvy-automation`
- Trace dataset: `harvy-traces`
- Service: `eu-sanctions-ingestion`

---

## 📝 Notes

### MCP Tools Available (JSON-RPC)

| Tool Name | Description |
|-----------|-------------|
| `tools/list` | List available tools |
| `get_workflow_details` | Get workflow details |
| `create_workflow_from_code` | Create workflow from JSON |
| `update_workflow` | Update existing workflow |
| `validate_workflow` | Validate workflow structure |
| `test_workflow` | Run bounded manual test |
| `publish_workflow` | Publish/activate workflow |

### First-Time Setup
1. Ensure `WEBSHARE_PROXY_URL` is set in environment
2. Ensure `~/.config/harvy/n8n_mcp_key` exists
3. Run `./validate-workflow.sh` to verify structure
4. Run `./eu-sanctions.mcp-operations.sh check` to see if workflow exists
5. Run `./eu-sanctions.mcp-operations.sh create` if not exists, or `update` if exists
6. Run `./eu-sanctions.mcp-operations.sh validate` to validate
7. Run `./eu-sanctions.mcp-operations.sh test` for bounded test
8. Run `./eu-sanctions.mcp-operations.sh publish` to enable

### Monitoring
After activation, monitor:
- OpenObserve: `harvy-automation` dataset
- Harvy API: `/api/v1/runs?source_id=src_eu_sanctions`
- R2: `s3://harvy-raw/eu-sanctions/`

### Expected Data Volume
- Raw artifacts: ~1,000+ records
- Processed: ~1,000+ records
- Evidence: ~1,000+ records

---

## 🆘 Troubleshooting

### MCP Connection Issues
```bash
# Test connectivity
curl -sS -X POST https://n8n.harvy.dev/mcp-server/http \
  -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  --data '{"jsonrpc":"2.0","id":"1","method":"tools/list","params":{}}'
```

**Expected**: `{"result":{"tools":[...],"tools.length":58}}`

### Workflow Not Found
- First run: Expected behavior
- Run `create` command to create workflow

### Validation Failures
- Check JSON structure with `validate-workflow.sh`
- Review MCP response for error details

---

## 📚 Documentation

- **Full Docs**: README.md
- **MCP Operations**: See README.md for JSON-RPC format details
- **Source**: docs/CONNECTOR-CANDIDATES.md (#53)

---

**Last Updated**: 2026-10-30  
**Status**: Ready for Validation ✅
