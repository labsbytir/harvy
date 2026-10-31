#!/bin/bash

# EU Sanctions Workflow MCP Operations
# Manages the lifecycle of the EU sanctions ingestion workflow via n8n MCP

set -e

# Configuration
WORKFLOW_FILE="eu-sanctions.workflow.json"
WORKFLOW_NAME="Harvy — eu_sanctions Ingestion"
WORKFLOW_ID="eu_sanctions_ingestion_001"
MCP_ENDPOINT="https://n8n.harvy.dev/mcp-server/http"
MCP_KEY_FILE="~/.config/harvy/n8n_mcp_key"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if MCP key exists
if [ ! -f "$MCP_KEY_FILE" ]; then
    echo -e "${RED}❌ Error: MCP key file not found: $MCP_KEY_FILE${NC}"
    echo "Please ensure you have access to the n8n MCP server."
    exit 1
fi

MCP_KEY=$(cat "$MCP_KEY_FILE")

# Usage function
usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  validate     - Validate workflow JSON structure"
    echo "  check        - Check if workflow exists"
    echo "  update       - Update workflow via MCP"
    echo "  validate-mcp  - Validate workflow via MCP"
    echo "  test         - Run bounded manual test"
    echo "  activate     - Activate workflow (after validation)"
    echo "  deactivate   - Deactivate workflow"
    echo "  status       - Get workflow status"
    echo ""
}

# Validate workflow JSON
validate_json() {
    echo -e "${BLUE}🔍 Validating workflow JSON...${NC}"
    
    if [ ! -f "$WORKFLOW_FILE" ]; then
        echo -e "${RED}❌ Error: Workflow file not found: $WORKFLOW_FILE${NC}"
        exit 1
    fi
    
    if ! jq empty "$WORKFLOW_FILE" 2>/dev/null; then
        echo -e "${RED}❌ Error: Invalid JSON structure${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Workflow JSON is valid${NC}"
}

# Check if workflow exists
check_workflow() {
    echo -e "${BLUE}🔍 Checking if workflow exists...${NC}"
    
    response=$(curl -s -X POST "$MCP_ENDPOINT/tools/automation.listWorkflows" \
        -H "Authorization: Bearer $MCP_KEY" \
        -H "Content-Type: application/json" \
        -d '{}')
    
    if echo "$response" | jq -e ".workflows[] | select(.id == \"$WORKFLOW_ID\")" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Workflow exists: $WORKFLOW_ID${NC}"
        echo "$response" | jq -r ".workflows[] | select(.id == \"$WORKFLOW_ID\") | "
        return 0
    else
        echo -e "${YELLOW}⚠️  Workflow not found: $WORKFLOW_ID${NC}"
        return 1
    fi
}

# Update workflow via MCP
update_workflow() {
    echo -e "${BLUE}🔄 Updating workflow via MCP...${NC}"
    
    # Read workflow JSON
    workflow_json=$(cat "$WORKFLOW_FILE")
    
    response=$(curl -s -X POST "$MCP_ENDPOINT/tools/automation.updateWorkflow" \
        -H "Authorization: Bearer $MCP_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"workflow_id\": \"$WORKFLOW_ID\",
            \"workflow_json\": $workflow_json
        }")
    
    if echo "$response" | jq -e ".success == true" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Workflow updated successfully${NC}"
        echo "$response" | jq -r '.version_id, .updated_at'
        return 0
    else
        echo -e "${RED}❌ Error updating workflow${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Validate workflow via MCP
validate_mcp() {
    echo -e "${BLUE}🔍 Validating workflow via MCP...${NC}"
    
    response=$(curl -s -X POST "$MCP_ENDPOINT/tools/automation.validateWorkflow" \
        -H "Authorization: Bearer $MCP_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"workflow_id\": \"$WORKFLOW_ID\"
        }")
    
    if echo "$response" | jq -e ".valid == true" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Workflow validation passed${NC}"
        echo "$response" | jq -r '.warnings, .errors'
        return 0
    else
        echo -e "${RED}❌ Workflow validation failed${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Run bounded manual test
run_test() {
    echo -e "${BLUE}🧪 Running bounded manual test...${NC}"
    
    # Generate test run ID
    TEST_ID="test-eu-sanctions-$(date +%s)-manual"
    
    response=$(curl -s -X POST "https://harvy.dev/api/v1/runs" \
        -H "x-harvy-organization-id: harvy-core" \
        -H "x-harvy-product: automation" \
        -H "Content-Type: application/json" \
        -d "{
            \"contract_version\": 1,
            \"run_id\": \"$TEST_ID\",
            \"trace_id\": \"$TEST_ID\",
            \"config_revision\": \"v1\",
            \"connector_id\": \"eu-sanctions-scraper\",
            \"source_scope_id\": \"scope-eu-sanctions\",
            \"access_scope_id\": \"tenant-harvy-core\",
            \"target_url\": \"https://webgate.ec.europa.eu/fsd/fsf/public/files/cspfullsanlist_1_1.xml\",
            \"mode\": \"api\",
            \"provider\": \"registered_api\",
            \"required_proxy\": \"webshare\",
            \"preflight_required\": true,
            \"direct_fallback_allowed\": false,
            \"max_pages\": 1,
            \"deadline_seconds\": 600,
            \"idempotency_key\": \"$TEST_ID\"
        }")
    
    if echo "$response" | jq -e ".run_id" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Test execution started${NC}"
        echo "Test Run ID: $TEST_ID"
        echo "Response: $response" | jq -r '.status, .timestamp'
        return 0
    else
        echo -e "${RED}❌ Test execution failed${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Activate workflow
activate_workflow() {
    echo -e "${BLUE}🚀 Activating workflow...${NC}"
    
    response=$(curl -s -X POST "$MCP_ENDPOINT/tools/automation.activateWorkflow" \
        -H "Authorization: Bearer $MCP_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"workflow_id\": \"$WORKFLOW_ID\",
            \"active\": true
        }")
    
    if echo "$response" | jq -e ".success == true and .active == true" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Workflow activated successfully${NC}"
        echo "$response" | jq -r '.activated_at'
        return 0
    else
        echo -e "${RED}❌ Error activating workflow${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Deactivate workflow
deactivate_workflow() {
    echo -e "${BLUE}🛑 Deactivating workflow...${NC}"
    
    response=$(curl -s -X POST "$MCP_ENDPOINT/tools/automation.deactivateWorkflow" \
        -H "Authorization: Bearer $MCP_KEY" \
        -H "Content-Type: application/json" \
        -d "{
            \"workflow_id\": \"$WORKFLOW_ID\",
            \"active\": false
        }")
    
    if echo "$response" | jq -e ".success == true and .active == false" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Workflow deactivated successfully${NC}"
        echo "$response" | jq -r '.deactivated_at'
        return 0
    else
        echo -e "${RED}❌ Error deactivating workflow${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Get workflow status
get_status() {
    echo -e "${BLUE}📊 Getting workflow status...${NC}"
    
    response=$(curl -s -X POST "$MCP_ENDPOINT/tools/automation.listWorkflows" \
        -H "Authorization: Bearer $MCP_KEY" \
        -H "Content-Type: application/json" \
        -d '{}')
    
    if echo "$response" | jq -e ".workflows[] | select(.id == \"$WORKFLOW_ID\")" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Workflow found${NC}"
        echo "$response" | jq -r ".workflows[] | select(.id == \"$WORKFLOW_ID\")"
    else
        echo -e "${YELLOW}⚠️  Workflow not found${NC}"
        return 1
    fi
}

# Main command dispatch
case "${1:-}" in
    validate)
        validate_json
        ;;
    check)
        check_workflow
        ;;
    update)
        validate_json
        update_workflow
        ;;
    validate-mcp)
        validate_json
        validate_mcp
        ;;
    test)
        validate_json
        run_test
        ;;
    activate)
        validate_json
        activate_workflow
        ;;
    deactivate)
        validate_json
        deactivate_workflow
        ;;
    status)
        get_status
        ;;
    *)
        usage
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Operation completed${NC}"
