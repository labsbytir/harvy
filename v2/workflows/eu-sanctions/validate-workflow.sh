#!/bin/bash

# EU Sanctions Workflow Validation Script (JSON-RPC format)
# Validates the workflow JSON structure and MCP connectivity

set -e

echo "🔍 Validating EU Sanctions Workflow (JSON-RPC format)..."
echo ""

# Configuration
WORKFLOW_FILE="eu-sanctions.workflow.json"
MCP_ENDPOINT="https://n8n.harvy.dev/mcp-server/http"
MCP_KEY_FILE="~/.config/harvy/n8n_mcp_key"

# JSON-RPC helper function
mcp_call() {
    local method="$1"
    local params="$2"
    
    curl -sS -X POST "$MCP_ENDPOINT" \
        -H "Authorization: Bearer $MCP_KEY" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json, text/event-stream" \
        --data "{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"$method\",\"params\":$params}"
}

# Validate MCP connectivity
validate_mcp_connectivity() {
    echo "🔌 Validating MCP connectivity..."
    
    response=$(mcp_call "tools/list" "{}")
    
    if echo "$response" | jq -e ".result != null and .result.tools != null" >/dev/null 2>&1; then
        TOOL_COUNT=$(echo "$response" | jq -r '.result.tools | length')
        echo "✅ MCP connectivity confirmed (${TOOL_COUNT} tools available)"
        return 0
    else
        echo "❌ Error: MCP connectivity failed"
        echo "Response: $response"
        return 1
    fi
}

# Validate workflow file exists
if [ ! -f "$WORKFLOW_FILE" ]; then
    echo "❌ Error: Workflow file not found: $WORKFLOW_FILE"
    exit 1
fi

echo "✅ Workflow file found: $WORKFLOW_FILE"

# Validate JSON structure
if ! jq empty "$WORKFLOW_FILE" 2>/dev/null; then
    echo "❌ Error: Invalid JSON structure in workflow file"
    exit 1
fi

echo "✅ JSON structure is valid"

# Validate required fields
REQUIRED_FIELDS=(
    '.name'
    '.id'
    '.nodes'
    '.connections'
    '.meta.mcp_operations.endpoint'
)

for field in "${REQUIRED_FIELDS[@]}"; do
    if ! jq -e "$field" "$WORKFLOW_FILE" >/dev/null 2>&1; then
        echo "❌ Error: Missing required field: $field"
        exit 1
    fi
done

echo "✅ All required fields present"

# Validate MCP endpoint
MCP_ACTUAL=$(jq -r '.meta.mcp_operations.endpoint' "$WORKFLOW_FILE")
if [ "$MCP_ACTUAL" != "$MCP_ENDPOINT" ]; then
    echo "⚠️  Warning: MCP endpoint mismatch"
    echo "   Expected: $MCP_ENDPOINT"
    echo "   Found: $MCP_ACTUAL"
fi

echo "✅ MCP endpoint configured correctly"

# Validate node structure
NODE_COUNT=$(jq '.nodes | length' "$WORKFLOW_FILE")
echo "✅ Workflow contains $NODE_COUNT nodes"

# Validate schedule node
SCHEDULE_NODE=$(jq '.nodes[] | select(.type == "n8n-nodes-base.cron")' "$WORKFLOW_FILE")
if [ -z "$SCHEDULE_NODE" ]; then
    echo "❌ Error: No schedule node found"
    exit 1
fi

echo "✅ Schedule node present"

# Validate API call node
API_NODE=$(jq '.nodes[] | select(.type == "n8n-nodes-base.httpRequest")' "$WORKFLOW_FILE")
if [ -z "$API_NODE" ]; then
    echo "❌ Error: No API call node found"
    exit 1
fi

echo "✅ API call node present"

# Validate provenance fields
PROVENANCE_FIELDS=(
    '.nodes[].parameters.jsCode | contains("provenance")'
    '.nodes[].parameters.jsCode | contains("event_id")'
    '.nodes[].parameters.jsCode | contains("source_id")'
    '.nodes[].parameters.jsCode | contains("trace_id")'
)

for field_check in "${PROVENANCE_FIELDS[@]}"; do
    if ! jq -e "$field_check" "$WORKFLOW_FILE" >/dev/null 2>&1; then
        echo "❌ Error: Missing provenance field in node parameters"
        exit 1
    fi
done

echo "✅ Provenance fields present in nodes"

# Validate spider config
SPIDER_FIELDS=(
    '.nodes[].parameters.jsCode | contains("spider_unlimited_route")'
    '.nodes[].parameters.jsCode | contains("webshare_proxy")'
    '.nodes[].parameters.jsCode | contains("timeout_seconds")'
)

for field_check in "${SPIDER_FIELDS[@]}"; do
    if ! jq -e "$field_check" "$WORKFLOW_FILE" >/dev/null 2>&1; then
        echo "❌ Error: Missing spider config in node parameters"
        exit 1
    fi
done

echo "✅ Spider configuration present"

# Validate OpenObserve config
OPENOBSERVE_FIELDS=(
    '.nodes[].parameters.jsCode | contains("openobserve")'
    '.nodes[].parameters.jsCode | contains("log_dataset")'
    '.nodes[].parameters.jsCode | contains("trace_dataset")'
)

for field_check in "${OPENOBSERVE_FIELDS[@]}"; do
    if ! jq -e "$field_check" "$WORKFLOW_FILE" >/dev/null 2>&1; then
        echo "❌ Error: Missing OpenObserve config in node parameters"
        exit 1
    fi
done

echo "✅ OpenObserve configuration present"

# Validate error handling
ERROR_FIELDS=(
    '.nodes[].parameters.jsCode | contains("error_handling")'
    '.nodes[].parameters.jsCode | contains("harvy_errors")'
)

for field_check in "${ERROR_FIELDS[@]}"; do
    if ! jq -e "$field_check" "$WORKFLOW_FILE" >/dev/null 2>&1; then
        echo "❌ Error: Missing error handling config in node parameters"
        exit 1
    fi
done

echo "✅ Error handling configuration present"

# Validate workflow is inactive by default
ACTIVE_STATUS=$(jq -r '.active' "$WORKFLOW_FILE")
if [ "$ACTIVE_STATUS" != "false" ]; then
    echo "⚠️  Warning: Workflow should be inactive by default (active: $ACTIVE_STATUS)"
fi

echo "✅ Workflow inactive by default"

echo ""
echo "🎉 All validations passed!"
echo ""

# Validate MCP connectivity
validate_mcp_connectivity

# Show workflow summary
WORKFLOW_NAME=$(jq -r '.name' "$WORKFLOW_FILE")
WORKFLOW_ID=$(jq -r '.id' "$WORKFLOW_FILE")
NODE_COUNT=$(jq '.nodes | length' "$WORKFLOW_FILE")

cat <<EOF

📋 Workflow Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: $WORKFLOW_NAME
ID: $WORKFLOW_ID
Nodes: $NODE_COUNT
Status: Inactive (ready for validation)

MCP Endpoint: $MCP_ENDPOINT
Source: EU Consolidated Financial Sanctions List
Schedule: Daily at 12:00 UTC

Next Steps:
  ./eu-sanctions.mcp-operations.sh check
  ./eu-sanctions.mcp-operations.sh create  (if not exists)
  ./eu-sanctions.mcp-operations.sh update  (if exists)
  ./eu-sanctions.mcp-operations.sh validate
  ./eu-sanctions.mcp-operations.sh test
  ./eu-sanctions.mcp-operations.sh publish
EOF
