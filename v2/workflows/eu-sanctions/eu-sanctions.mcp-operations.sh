#!/bin/bash

# EU Sanctions Workflow MCP Operations (Direct HTTP JSON-RPC)
# Manages the lifecycle of the EU sanctions ingestion workflow via n8n MCP
# Uses JSON-RPC 2.0 format with direct HTTP calls

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
    echo "  check        - Check if workflow exists"
    echo "  create       - Create workflow (if not exists)"
    echo "  update       - Update existing workflow"
    echo "  validate     - Validate workflow structure"
    echo "  test         - Run bounded manual test"
    echo "  publish      - Publish/activate workflow"
    echo "  status       - Get workflow status"
    echo ""
}

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

# Check if workflow exists
check_workflow() {
    echo -e "${BLUE}🔍 Checking if workflow exists...${NC}"
    
    response=$(mcp_call "tools/call" "{\"name\":\"get_workflow_details\",\"arguments\":{\"workflowId\":\"$WORKFLOW_ID\"}}")
    
    if echo "$response" | jq -e ".result != null" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Workflow exists: $WORKFLOW_ID${NC}"
        echo "$response" | jq -r '.result'
        return 0
    else
        echo -e "${YELLOW}⚠️  Workflow not found: $WORKFLOW_ID${NC}"
        return 1
    fi
}

# Create workflow from code
create_workflow() {
    echo -e "${BLUE}🆕 Creating workflow via create_workflow_from_code...${NC}"
    
    # Read workflow JSON
    workflow_json=$(cat "$WORKFLOW_FILE")
    
    response=$(mcp_call "tools/call" "{\"name\":\"create_workflow_from_code\",\"arguments\":{\"workflowName\":\"$WORKFLOW_NAME\",\"workflowJson\":$workflow_json}}")
    
    if echo "$response" | jq -e ".result != null" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Workflow created successfully${NC}"
        echo "$response" | jq -r '.result.workflowId, .result.versionId, .result.createdAt'
        return 0
    else
        echo -e "${RED}❌ Error creating workflow${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Update workflow
update_workflow() {
    echo -e "${BLUE}🔄 Updating workflow via update_workflow...${NC}"
    
    # Read workflow JSON
    workflow_json=$(cat "$WORKFLOW_FILE")
    
    response=$(mcp_call "tools/call" "{\"name\":\"update_workflow\",\"arguments\":{\"workflowId\":\"$WORKFLOW_ID\",\"workflowJson\":$workflow_json}}")
    
    if echo "$response" | jq -e ".result != null" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Workflow updated successfully${NC}"
        echo "$response" | jq -r '.result.versionId, .result.updatedAt'
        return 0
    else
        echo -e "${RED}❌ Error updating workflow${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Validate workflow
validate_workflow() {
    echo -e "${BLUE}🔍 Validating workflow via validate_workflow...${NC}"
    
    response=$(mcp_call "tools/call" "{\"name\":\"validate_workflow\",\"arguments\":{\"workflowId\":\"$WORKFLOW_ID\"}}")
    
    if echo "$response" | jq -e ".result.valid == true" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Workflow validation passed${NC}"
        echo "$response" | jq -r '.result.warnings, .result.errors'
        return 0
    else
        echo -e "${RED}❌ Workflow validation failed${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Run bounded manual test
run_test() {
    echo -e "${BLUE}🧪 Running bounded manual test via test_workflow...${NC}"
    
    # Generate test run ID
    TEST_ID="test-eu-sanctions-$(date +%s)-manual"
    
    response=$(mcp_call "tools/call" "{\"name\":\"test_workflow\",\"arguments\":{\"workflowId\":\"$WORKFLOW_ID\",\"testId\":\"$TEST_ID\",\"maxPages\":1}}")
    
    if echo "$response" | jq -e ".result != null" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Test execution started${NC}"
        echo "Test Run ID: $TEST_ID"
        echo "Response:"
        echo "$response" | jq -r '.result'
        return 0
    else
        echo -e "${RED}❌ Test execution failed${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Publish/activate workflow
publish_workflow() {
    echo -e "${BLUE}🚀 Publishing workflow via publish_workflow...${NC}"
    
    response=$(mcp_call "tools/call" "{\"name\":\"publish_workflow\",\"arguments\":{\"workflowId\":\"$WORKFLOW_ID\",\"active\":true}}")
    
    if echo "$response" | jq -e ".result != null" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Workflow published successfully${NC}"
        echo "$response" | jq -r '.result.versionId, .result.publishedAt'
        return 0
    else
        echo -e "${RED}❌ Error publishing workflow${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Get workflow status
get_status() {
    echo -e "${BLUE}📊 Getting workflow status...${NC}"
    
    response=$(mcp_call "tools/call" "{\"name\":\"get_workflow_details\",\"arguments\":{\"workflowId\":\"$WORKFLOW_ID\"}}")
    
    if echo "$response" | jq -e ".result != null" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Workflow found${NC}"
        echo "$response" | jq -r '.result'
    else
        echo -e "${YELLOW}⚠️  Workflow not found${NC}"
        return 1
    fi
}

# Main command dispatch
case "${1:-}" in
    check)
        check_workflow
        ;;
    create)
        validate_json
        create_workflow
        ;;
    update)
        validate_json
        update_workflow
        ;;
    validate)
        validate_json
        validate_workflow
        ;;
    test)
        validate_json
        run_test
        ;;
    publish)
        validate_json
        publish_workflow
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
