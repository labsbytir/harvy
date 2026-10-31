#!/usr/bin/env node

/**
 * GDACS Ingestion Workflow Deployment Script (MCP Direct HTTP)
 * 
 * This script deploys the "Harvy — gdacs Ingestion" workflow to n8n.harvy.dev
 * using the n8n MCP server via direct HTTP JSON-RPC calls.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const MCP_ENDPOINT = 'https://n8n.harvy.dev/mcp-server/http';
const MCP_API_KEY_PATH = path.join(process.env.HOME, '.config/harvy/n8n_mcp_key');
const WORKFLOW_FILE = path.join(__dirname, 'workflows', 'gdacs-ingestion-minimal.json');
const PROJECT_ID = 'NiDaApcjYhqmh8Wp';

// Read MCP API key
let mcpApiKey;
try {
  mcpApiKey = fs.readFileSync(MCP_API_KEY_PATH, 'utf8').trim();
} catch (error) {
  console.error('❌ Failed to read MCP API key from:', MCP_API_KEY_PATH);
  console.error('Please ensure the key exists at this path.');
  process.exit(1);
}

// Read workflow JSON
let workflowJson;
try {
  workflowJson = fs.readFileSync(WORKFLOW_FILE, 'utf8');
} catch (error) {
  console.error('❌ Failed to read workflow file:', WORKFLOW_FILE);
  process.exit(1);
}

const workflow = JSON.parse(workflowJson);

// JSON-RPC request helper (handles both JSON and SSE responses)
async function mcpRequest(method, params = {}, id = Date.now()) {
  const request = {
    jsonrpc: '2.0',
    id: id,
    method: `tools/call`,
    params: {
      name: method,
      arguments: params
    }
  };
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const response = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mcpApiKey}`,
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }
    
    // Try to parse as JSON first
    const text = await response.text();
    
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      // If JSON parsing fails, try to extract JSON from SSE format
      const jsonMatch = text.match(/data:\s*({[\s\S]*})/);
      if (jsonMatch && jsonMatch[1]) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error(`Failed to parse response: ${text.substring(0, 200)}`);
      }
    }
    
    if (result.error) {
      throw new Error(`MCP Error: ${result.error.message} (code: ${result.error.code})`);
    }
    
    return result.result || result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// MCP Tools (using correct tool names from MCP output)
const MCP_TOOLS = {
  createWorkflow: async (workflowData) => {
    return mcpRequest(
      'automation.workflows.create_workflow_from_code',
      {
        projectId: PROJECT_ID,
        workflowName: workflowData.name,
        workflowJson: workflowData,
        active: false
      }
    );
  },
  
  getWorkflowDetails: async (workflowId) => {
    return mcpRequest(
      'automation.workflows.get_workflow',
      {
        projectId: PROJECT_ID,
        workflowId: workflowId
      }
    );
  },
  
  updateWorkflow: async (workflowId, updates) => {
    return mcpRequest(
      'automation.workflows.update_workflow',
      {
        workflowId: workflowId,
        ...updates,
        versionName: 'Enhancement',
        versionDescription: 'Added GDACS processing pipeline'
      }
    );
  },
  
  validateWorkflow: async (workflowId) => {
    return mcpRequest(
      'automation.workflows.validate_workflow',
      {
        projectId: PROJECT_ID,
        workflowId: workflowId
      }
    );
  },
  
  testWorkflow: async (workflowId, testData = {}) => {
    return mcpRequest(
      'automation.workflows.test_workflow',
      {
        projectId: PROJECT_ID,
        workflowId: workflowId,
        testData: testData,
        bounded: true,
        maxExecutions: 10
      }
    );
  }
};

// Main deployment function
async function deployWorkflow() {
  console.log('🚀 Starting GDACS Ingestion Workflow Deployment (MCP Direct)');
  console.log('='.repeat(70));
  
  let workflowId = null;
  let versionId = '1.0.0';
  let executionId = null;
  let rowCounts = { alerts: 0, duplicates: 0, errors: 0 };
  
  try {
    // Step 1: Create workflow
    console.log('\n📝 Step 1/4: Creating workflow...');
    console.log(`   Workflow name: ${workflow.name}`);
    console.log(`   Project ID: ${PROJECT_ID}`);
    
    const createResponse = await MCP_TOOLS.createWorkflow(workflow);
    
    if (!createResponse || !createResponse.workflowId) {
      throw new Error(`Workflow creation failed: ${createResponse?.message || 'Unknown error'}`);
    }
    
    workflowId = createResponse.workflowId;
    versionId = createResponse.versionId || '1.0.0';
    
    console.log('✅ Workflow created successfully!');
    console.log(`   Workflow ID: ${workflowId}`);
    console.log(`   Version ID: ${versionId}`);
    
    // Step 2: Get workflow details
    console.log('\n📋 Step 2/4: Retrieving workflow details...');
    const details = await MCP_TOOLS.getWorkflowDetails(workflowId);
    console.log(`   Workflow name: ${details.name}`);
    console.log(`   Active: ${details.active}`);
    console.log(`   Nodes: ${details.nodes?.length || 0}`);
    
    // Step 3: Validate workflow
    console.log('\n✅ Step 3/4: Validating workflow...');
    const validation = await MCP_TOOLS.validateWorkflow(workflowId);
    
    if (!validation?.valid) {
      const errors = validation?.errors?.join(', ') || 'Unknown errors';
      throw new Error(`Validation failed: ${errors}`);
    }
    
    console.log('✅ Workflow validation passed!');
    console.log(`   Validations performed: ${validation.validations?.length || 0}`);
    
    // Step 4: Test workflow with bounded manual test
    console.log('\n🧪 Step 4/4: Running bounded manual test...');
    const testData = {
      backfillCursor: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      forwardWatermark: new Date().toISOString()
    };
    
    const testResponse = await MCP_TOOLS.testWorkflow(workflowId, testData);
    
    if (!testResponse?.success) {
      throw new Error(`Test execution failed: ${testResponse?.message || 'Unknown error'}`);
    }
    
    executionId = testResponse.executionId;
    rowCounts = testResponse.rowCounts || { alerts: 0, duplicates: 0, errors: 0 };
    
    console.log('✅ Bounded test completed successfully!');
    console.log(`   Execution ID: ${executionId}`);
    console.log(`   Alerts processed: ${rowCounts.alerts || 0}`);
    console.log(`   Duplicates skipped: ${rowCounts.duplicates || 0}`);
    console.log(`   Errors logged: ${rowCounts.errors || 0}`);
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 DEPLOYMENT SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Workflow Created: ${workflow.name}`);
    console.log(`   Workflow ID: ${workflowId}`);
    console.log(`   Version ID: ${versionId}`);
    console.log(`   Execution ID: ${executionId}`);
    console.log(`   Status: Ready for enhancement and activation`);
    console.log('\n📝 Next Steps:');
    console.log('   1. Review test execution results in OpenObserve');
    console.log('   2. Enhance workflow with full processing pipeline');
    console.log('   3. Add Webshare proxy configuration');
    console.log('   4. Add provenance tracking');
    console.log('   5. Add deduplication');
    console.log('   6. Add R2 and PostgreSQL storage nodes');
    console.log('   7. Activate workflow when ready');
    console.log('   8. Monitor execution metrics');
    console.log('   9. Verify data in R2 and PostgreSQL');
    console.log('\n🎯 Workflow Features (to be implemented):');
    console.log('   • GDACS API integration with Webshare proxy');
    console.log('   • Deterministic event_id generation');
    console.log('   • Provenance tracking');
    console.log('   • Deduplication with data table');
    console.log('   • Error logging to harvy_errors');
    console.log('   • OpenObserve integration for logs/traces');
    console.log('   • Backfill cursor + forward watermark');
    console.log('   • R2 raw storage + PostgreSQL processed storage');
    console.log('\n📚 Documentation:');
    console.log('   • See: n8n/workflows/HARVY-GDACS-INGESTION-COMPLETE.md');
    console.log('   • MCP Endpoint: https://n8n.harvy.dev/mcp-server/http');
    console.log('   • Project ID: NiDaApcjYhqmh8Wp');
    console.log('   • Tool: automation.workflows.create_workflow_from_code');
    console.log('   • Tool: automation.workflows.validate_workflow');
    console.log('   • Tool: automation.workflows.test_workflow');
    
    console.log('\n' + '='.repeat(70));
    console.log('✨ Deployment complete! Workflow is ready for enhancement.');
    console.log('='.repeat(70));
    console.log('\n💡 IMPORTANT:');
    console.log('   The minimal workflow has been created. You now need to:');
    console.log('   1. Manually enhance it in the n8n editor');
    console.log('   2. Add the full GDACS processing pipeline');
    console.log('   3. Configure Webshare proxy');
    console.log('   4. Add provenance tracking, deduplication, storage nodes');
    console.log('   5. Test thoroughly before activation');
    
    return {
      success: true,
      workflowId,
      versionId,
      executionId,
      rowCounts,
      workflowName: workflow.name,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('\n❌ DEPLOYMENT FAILED');
    console.error('='.repeat(70));
    console.error('Error:', error.message);
    
    if (error.cause) {
      console.error('\nCause:', error.cause);
    }
    
    console.error('\nStack trace:');
    console.error(error.stack);
    
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Verify MCP API key exists at:', MCP_API_KEY_PATH);
    console.error('   2. Check MCP endpoint is reachable:', MCP_ENDPOINT);
    console.error('   3. Verify project ID is correct:', PROJECT_ID);
    console.error('   4. Check n8n instance is running');
    console.error('   5. Verify API key has sufficient permissions');
    console.error('   6. Test with: curl -v -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)"', MCP_ENDPOINT);
    
    process.exit(1);
  }
}

// Execute deployment
if (require.main === module) {
  deployWorkflow().then(result => {
    process.exit(0);
  }).catch(error => {
    process.exit(1);
  });
}

module.exports = { deployWorkflow };
