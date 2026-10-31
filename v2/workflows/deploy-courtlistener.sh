#!/bin/bash

# CourtListener Bulk Data Ingestion - Deployment Script
# This script deploys the workflow to n8n.harvy.dev

set -e

# Configuration
WORKFLOW_FILE="/Users/pen/Desktop/harvy-new/v2/workflows/courtlistener-bulk-ingestion.json"
N8N_URL="https://n8n.harvy.dev"

# Check if API key is provided
if [ -z "$N8N_API_KEY" ]; then
    echo "Error: N8N_API_KEY environment variable is required"
    echo "Usage: N8N_API_KEY=your-api-key ./deploy-courtlistener.sh"
    exit 1
fi

# Check if workflow file exists
if [ ! -f "$WORKFLOW_FILE" ]; then
    echo "Error: Workflow file not found: $WORKFLOW_FILE"
    exit 1
fi

echo "🚀 Deploying CourtListener workflow to n8n..."
echo "   Workflow file: $WORKFLOW_FILE"
echo "   n8n URL: $N8N_URL"
echo ""

# Step 1: Import workflow
echo "📥 Importing workflow..."
IMPORT_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${N8N_URL}/api/v1/workflows/import" \
  -H "Authorization: Bearer $N8N_API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F "data=@$WORKFLOW_FILE" \
  -F "separate=true")

HTTP_CODE=$(echo "$IMPORT_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$IMPORT_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
    echo "❌ Failed to import workflow: HTTP $HTTP_CODE"
    echo "$RESPONSE_BODY"
    exit 1
fi

echo "✅ Workflow imported successfully"
WORKFLOW_ID=$(echo "$RESPONSE_BODY" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data',{}).get('id',''))" 2>/dev/null)

if [ -z "$WORKFLOW_ID" ]; then
    echo "⚠️  Could not extract workflow ID from response"
    echo "Response: $RESPONSE_BODY"
    WORKFLOW_ID="courtlistener-bulk-ingestion-v1"
fi

echo "   Workflow ID: $WORKFLOW_ID"
echo ""

# Step 2: Update workflow (set to inactive by default)
echo "🔧 Updating workflow configuration..."
UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X PATCH "${N8N_URL}/api/v1/workflows/$WORKFLOW_ID" \
  -H "Authorization: Bearer $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": false, "name": "Harvy - CourtListener Bulk Data Ingestion"}')

HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    echo "⚠️  Failed to update workflow: HTTP $HTTP_CODE"
    echo "$RESPONSE_BODY"
else
    echo "✅ Workflow updated successfully"
fi

echo ""
echo "📋 Deployment Summary:"
echo "   ✅ Workflow imported: $WORKFLOW_ID"
echo "   ✅ Workflow is INACTIVE (safe by default)"
echo "   ⚠️  You must configure credentials and variables before activation"
echo ""
echo "🎯 Next Steps:"
echo "   1. Open n8n dashboard: $N8N_URL"
echo "   2. Find workflow: $WORKFLOW_ID"
echo "   3. Configure credentials (R2, Harvy API)"
echo "   4. Set environment variables (SPIDER_API_KEY, WEBSHARE_PROXY_URL, etc.)"
echo "   5. Replace placeholders (REPLACE_WITH_HARVY_DOMAIN, REPLACE_WITH_ORGANIZATION_ID)"
echo "   6. Test with a single file"
echo "   7. Activate workflow"
echo ""
echo "✅ Deployment complete!"
