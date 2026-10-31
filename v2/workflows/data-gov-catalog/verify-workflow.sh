#!/bin/bash

# Harvy - data-gov-catalog Workflow Verification Script
# Workflow ID: Wjlut8nGEQCg6DT8
# Purpose: Validate workflow structure and MCP operations

set -e

echo "=========================================="
echo "Harvy data-gov-catalog Workflow Verification"
echo "=========================================="
echo ""

# Configuration
WORKFLOW_FILE="data-gov-catalog.full.workflow.json"
WORKFLOW_ID="Wjlut8nGEQCg6DT8"
MCP_ENDPOINT="https://n8n.harvy.dev/mcp-server/http"
N8N_MCP_KEY_FILE="~/.config/harvy/n8n_mcp_key"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if workflow file exists
if [ ! -f "$WORKFLOW_FILE" ]; then
    echo -e "${RED}✗ Workflow file not found: $WORKFLOW_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Workflow file exists: $WORKFLOW_FILE${NC}"

# Validate JSON syntax
if ! jq empty "$WORKFLOW_FILE" 2>/dev/null; then
    echo -e "${RED}✗ Invalid JSON syntax in workflow file${NC}"
    exit 1
fi

echo -e "${GREEN}✓ JSON syntax is valid${NC}"

# Check required fields
REQUIRED_FIELDS=(
    "name"
    "nodes"
    "connections"
    "active"
    "meta.workflowId"
    "meta.source"
    "meta.mcp_endpoint"
    "meta.mcp_auth"
    "meta.mcp_operations"
    "meta.gates_before_activation"
)

for field in "${REQUIRED_FIELDS[@]}"; do
    if ! jq -e ".$field" "$WORKFLOW_FILE" >/dev/null 2>&1; then
        echo -e "${RED}✗ Missing required field: $field${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ All required fields present${NC}"

# Validate workflow ID
WORKFLOW_ID_CHECK=$(jq -r ".meta.workflowId" "$WORKFLOW_FILE")
if [ "$WORKFLOW_ID_CHECK" != "$WORKFLOW_ID" ]; then
    echo -e "${RED}✗ Workflow ID mismatch: expected $WORKFLOW_ID, got $WORKFLOW_ID_CHECK${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Workflow ID matches: $WORKFLOW_ID${NC}"

# Check nodes
NODE_COUNT=$(jq '.nodes | length' "$WORKFLOW_FILE")
echo -e "${YELLOW}⚠ Node count: $NODE_COUNT${NC}"

if [ "$NODE_COUNT" -lt 4 ]; then
    echo -e "${RED}✗ Insufficient nodes (minimum 4 required)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node count sufficient: $NODE_COUNT nodes${NC}"

# Validate MCP endpoint
MCP_ENDPOINT_CHECK=$(jq -r ".meta.mcp_endpoint" "$WORKFLOW_FILE")
if [ "$MCP_ENDPOINT_CHECK" != "$MCP_ENDPOINT" ]; then
    echo -e "${RED}✗ MCP endpoint mismatch${NC}"
    exit 1
fi

echo -e "${GREEN}✓ MCP endpoint configured: $MCP_ENDPOINT${NC}"

# Check MCP operations
MCP_OPS_COUNT=$(jq '.meta.mcp_operations | length' "$WORKFLOW_FILE")
echo -e "${YELLOW}⚠ MCP operations defined: $MCP_OPS_COUNT${NC}"

if [ "$MCP_OPS_COUNT" -lt 5 ]; then
    echo -e "${RED}✗ Insufficient MCP operations (minimum 5 required)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ MCP operations sufficient: $MCP_OPS_COUNT operations${NC}"

# Validate gates checklist
GATES_COUNT=$(jq '.meta.gates_before_activation | length' "$WORKFLOW_FILE")
echo -e "${YELLOW}⚠ Gates checklist items: $GATES_COUNT${NC}"

if [ "$GATES_COUNT" -lt 8 ]; then
    echo -e "${RED}✗ Insufficient gates (minimum 8 required)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Gates checklist sufficient: $GATES_COUNT gates${NC}"

# Check provenance fields in nodes
PROVENANCE_NODES=(
    "Build Catalog Job"
    "Log Error to connector_errors"
)

for node_name in "${PROVENANCE_NODES[@]}"; do
    NODE=$(jq -r --arg name "$node_name" '.nodes[] | select(.name == $name)' "$WORKFLOW_FILE")
    if [ -n "$NODE" ]; then
        echo -e "${GREEN}✓ Provenance node found: $node_name${NC}"
    else
        echo -e "${YELLOW}⚠ Provenance node not found: $node_name (may be optional)${NC}"
    fi
done

# Validate error handling
ERROR_NODES=("Error Trigger" "Log Error to connector_errors" "Post Error Callback")
for node_name in "${ERROR_NODES[@]}"; do
    NODE=$(jq -r --arg name "$node_name" '.nodes[] | select(.name == $name)' "$WORKFLOW_FILE")
    if [ -n "$NODE" ]; then
        echo -e "${GREEN}✓ Error handling node found: $node_name${NC}"
    else
        echo -e "${RED}✗ Missing error handling node: $node_name${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ All error handling nodes present${NC}"

# Check OpenObserve configuration
if jq -e '.meta.openobserve_config' "$WORKFLOW_FILE" >/dev/null 2>&1; then
    echo -e "${GREEN}✓ OpenObserve configuration present${NC}"
else
    echo -e "${YELLOW}⚠ OpenObserve configuration not found (optional)${NC}"
fi

# Summary
echo ""
echo "=========================================="
echo -e "${GREEN}✓ Workflow verification PASSED${NC}"
echo "=========================================="
echo ""
echo "Workflow ID: $WORKFLOW_ID"
echo "File: $WORKFLOW_FILE"
echo "Nodes: $NODE_COUNT"
echo "MCP Operations: $MCP_OPS_COUNT"
echo "Gates Checklist: $GATES_COUNT"
echo ""
echo "Next steps:"
echo "1. Deploy to n8n via MCP: update_workflow"
echo "2. Validate via MCP: validate_workflow"
echo "3. Manual test execution"
echo "4. Activate after success"
echo ""

exit 0
