#!/bin/bash
# MCP Operations for fema-openfema workflow (ID: 7OucM9UE1R9UG594)
# Run these commands from a trusted terminal with MCP access

set -euo pipefail

# Configuration - DO NOT COMMIT VALUES
N8N_MCP_URL="https://n8n.harvy.dev/mcp-server/http"
N8N_MCP_KEY_FILE="$HOME/.config/harvy/n8n_mcp_key"
WORKFLOW_FILE="fema-openfema.workflow.json"
WORKFLOW_ID="7OucM9UE1R9UG594"

# Load MCP key (do not print)
if [ ! -f "$N8N_MCP_KEY_FILE" ]; then
  echo "ERROR: MCP key file not found: $N8N_MCP_KEY_FILE" >&2
  exit 1
fi
N8N_MCP_KEY=$(cat "$N8N_MCP_KEY_FILE")

# Validate MCP key works
validate_mcp_connection() {
  echo "[1/6] Validating MCP connection..."
  curl -s -X POST "$N8N_MCP_URL/tools/list" \
    -H "Authorization: Bearer $N8N_MCP_KEY" \
    -H "Content-Type: application/json" \
    -d '{}' \
  | jq -e '.tools | length > 0' > /dev/null
  
  if [ $? -eq 0 ]; then
    echo "✓ MCP connection validated"
  else
    echo "✗ MCP connection failed"
    exit 1
  fi
}

# List current workflows to find existing fema-openfema
list_workflows() {
  echo "[2/6] Listing existing workflows..."
  curl -s -X POST "$N8N_MCP_URL/tools/automation.listWorkflows" \
    -H "Authorization: Bearer $N8N_MCP_KEY" \
    -H "Content-Type: application/json" \
    -d '{}' \
  | jq -r '.workflows[] | select(.id == "'"$WORKFLOW_ID"'") | .name' || echo "No existing workflow found"
}

# Update workflow via MCP
update_workflow() {
  echo "[3/6] Updating workflow via MCP..."
  
  # Read the workflow file
  WORKFLOW_JSON=$(cat "$WORKFLOW_FILE" | jq 'del(.active, .meta.created)' | jq '.meta.updated = "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"')
  
  curl -s -X POST "$N8N_MCP_URL/tools/automation.updateWorkflow" \
    -H "Authorization: Bearer $N8N_MCP_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"workflow_id\": \"$WORKFLOW_ID\", \"workflow_json\": $WORKFLOW_JSON}" \
  | jq '.'
}

# Validate workflow structure
validate_workflow() {
  echo "[4/6] Validating workflow structure..."
  
  curl -s -X POST "$N8N_MCP_URL/tools/automation.validateWorkflow" \
    -H "Authorization: Bearer $N8N_MCP_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"workflow_id\": \"$WORKFLOW_ID\"}" \
  | jq '.'
}

# Execute bounded manual test (one run)
execute_bounded_test() {
  echo "[5/6] Executing bounded manual test..."
  
  TEST_PAYLOAD=$(jq -n \
    --arg event_id "test-fema-$(date +%s)-$(head -c 8 /dev/urandom | base64 | tr -dc 'a-z0-9' | head -c 9)" \
    --arg source_id "src_openfema" \
    --arg source_scope_id "scope-openfema" \
    --arg access_scope_id "tenant-harvy-core" \
    '{
      event_id: $event_id,
      source_id: $source_id,
      source_scope_id: $source_scope_id,
      access_scope_id: $access_scope_id,
      target_url: "https://api.fema.gov/open/v2/DisasterDeclarations",
      mode: "api",
      provider: "registered_api",
      required_proxy: "webshare",
      preflight_required: true,
      direct_fallback_allowed: false,
      max_pages: 5,
      deadline_seconds: 300,
      idempotency_key: "test-'$(date +%s)'",
      config_revision: "v1"
    }')
  
  echo "Test payload:"
  echo "$TEST_PAYLOAD" | jq '.'
  
  # This would submit to Harvy API which dispatches to n8n
  # For actual test, we'd call:
  # curl -X POST https://harvy.dev/api/v1/runs \
  #   -H "x-harvy-organization-id: harvy-core" \
  #   -H "Content-Type: application/json" \
  #   -d "$TEST_PAYLOAD"
  
  echo "⚠ Manual test requires Harvy API call (not executed here)"
  echo "  Expected execution ID: test-run-$(date +%s)"
}

# Activate workflow (only after successful test)
activate_workflow() {
  echo "[6/6] Activating workflow..."
  
  curl -s -X POST "$N8N_MCP_URL/tools/automation.activateWorkflow" \
    -H "Authorization: Bearer $N8N_MCP_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"workflow_id\": \"$WORKFLOW_ID\", \"active\": true}" \
  | jq '.'
}

# Main execution
main() {
  echo "=== fema-openfema MCP Operations ==="
  echo "Workflow ID: $WORKFLOW_ID"
  echo "Workflow File: $WORKFLOW_FILE"
  echo ""
  
  validate_mcp_connection
  list_workflows
  echo ""
  
  echo "READY TO UPDATE WORKFLOW"
  echo "Next steps:"
  echo "1. Review workflow file: $WORKFLOW_FILE"
  echo "2. Run: ./fema-openfema.mcp-operations.sh update"
  echo "3. Run: ./fema-openfema.mcp-operations.sh validate"
  echo "4. Run bounded manual test via Harvy API"
  echo "5. If test passes, run: ./fema-openfema.mcp-operations.sh activate"
  echo ""
  echo "Available commands:"
  echo "  update    - Update workflow via MCP"
  echo "  validate  - Validate workflow structure"
  echo "  test      - Execute bounded manual test (simulated)"
  echo "  activate  - Activate workflow"
  echo "  all       - Run all steps (update -> validate -> test -> activate)"
}

# Command dispatch
case "${1:-}" in
  update)
    update_workflow
    ;;
  validate)
    validate_workflow
    ;;
  test)
    execute_bounded_test
    ;;
  activate)
    activate_workflow
    ;;
  all)
    validate_mcp_connection
    update_workflow
    validate_workflow
    execute_bounded_test
    echo ""
    echo "⚠️  Manual verification required before activation"
    echo "Run: ./fema-openfema.mcp-operations.sh activate"
    ;;
  *)
    main
    ;;
esac
