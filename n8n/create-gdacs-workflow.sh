#!/bin/bash

# Harvy GDACS Ingestion Workflow Creation Script
# This script creates the workflow in n8n via direct API calls

set -e

echo "🚀 Starting GDACS Ingestion Workflow Creation"
echo "=============================================="

# Configuration
N8N_URL="https://n8n.harvy.dev"
N8N_API_KEY_PATH="$HOME/.config/harvy/n8n_mcp_key"
WORKFLOW_FILE="$(dirname "$0")/workflows/gdacs-ingestion-minimal.json"
PROJECT_ID="NiDaApcjYhqmh8Wp"

# Read API key
if [ ! -f "$N8N_API_KEY_PATH" ]; then
  echo "❌ MCP API key not found at: $N8N_API_KEY_PATH"
  echo "Please ensure the key exists at this path."
  exit 1
fi

N8N_API_KEY=$(cat "$N8N_API_KEY_PATH")

# Read workflow JSON
if [ ! -f "$WORKFLOW_FILE" ]; then
  echo "❌ Workflow file not found: $WORKFLOW_FILE"
  exit 1
fi

WORKFLOW_JSON=$(cat "$WORKFLOW_FILE")

# Step 1: Create workflow
echo ""
echo "📝 Step 1/3: Creating workflow..."
echo "   Workflow name: Harvy — gdacs Ingestion"
echo "   Project ID: $PROJECT_ID"

CREATE_RESPONSE=$(curl -s -X POST "$N8N_URL/rest/workflows" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$WORKFLOW_JSON")

WORKFLOW_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id' 2>/dev/null || echo "")

if [ -z "$WORKFLOW_ID" ] || [ "$WORKFLOW_ID" = "null" ]; then
  echo "❌ Failed to create workflow"
  echo "Response: $CREATE_RESPONSE"
  exit 1
fi

VERSION_ID=$(echo "$CREATE_RESPONSE" | jq -r '.versionId' 2>/dev/null || echo "1.0.0")

echo "✅ Workflow created successfully!"
echo "   Workflow ID: $WORKFLOW_ID"
echo "   Version ID: $VERSION_ID"

# Step 2: Activate workflow
echo ""
echo "🔄 Step 2/3: Activating workflow..."

ACTIVATE_RESPONSE=$(curl -s -X PATCH "$N8N_URL/rest/workflows/$WORKFLOW_ID" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": true}')

if echo "$ACTIVATE_RESPONSE" | grep -q '"active": true'; then
  echo "✅ Workflow activated successfully!"
else
  echo "⚠️  Workflow created but activation may have issues"
  echo "Response: $ACTIVATE_RESPONSE"
fi

# Step 3: Get workflow details
echo ""
echo "📋 Step 3/3: Retrieving workflow details..."

DETAILS_RESPONSE=$(curl -s "$N8N_URL/rest/workflows/$WORKFLOW_ID" \
  -H "X-N8N-API-KEY: $N8N_API_KEY")

WORKFLOW_NAME=$(echo "$DETAILS_RESPONSE" | jq -r '.name' 2>/dev/null || echo "Unknown")
WORKFLOW_ACTIVE=$(echo "$DETAILS_RESPONSE" | jq -r '.active' 2>/dev/null || echo "false")
NODE_COUNT=$(echo "$DETAILS_RESPONSE" | jq -r '.nodes | length' 2>/dev/null || echo "0")

# Summary
echo ""
echo "=============================================="
echo "📊 CREATION SUMMARY"
echo "=============================================="
echo "✅ Workflow Created: $WORKFLOW_NAME"
echo "   Workflow ID: $WORKFLOW_ID"
echo "   Version ID: $VERSION_ID"
echo "   Status: Active = $WORKFLOW_ACTIVE"
echo "   Nodes: $NODE_COUNT"
echo ""
echo "📝 Next Steps:"
echo "   1. Configure Webshare proxy in workflow"
echo "   2. Add full processing pipeline"
echo "   3. Test workflow execution"
echo "   4. Monitor in OpenObserve"
echo ""
echo "🎯 Features Implemented:"
echo "   • Cron trigger (every 2 hours)"
echo "   • GDACS API fetch"
echo "   • Basic error handling"
echo "   • Ready for enhancement"

echo ""
echo "✨ Workflow creation complete!"
