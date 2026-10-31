#!/usr/bin/env node

/**
 * GDACS Ingestion Workflow Deployment Script
 * 
 * This script deploys the "Harvy — gdacs Ingestion" workflow to n8n.harvy.dev
 * using the n8n MCP server.
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

// HTTP client using fetch API (available in Node.js 24)
async function httpRequest(url, options = {}) {
  const { method = 'POST', headers = {}, body, timeout = 30000 } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mcpApiKey}`,
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// MCP Tools
const MCP_TOOLS = {
  createWorkflow: async (workflowData) => {
    return httpRequest(
      `${MCP_ENDPOINT}/tools/automation.workflows.create_workflow_from_code`,
      {
        body: {
          projectId: PROJECT_ID,
          workflowName: workflowData.name,
          workflowJson: workflowData,
          active: false
        }
      }
    );
  },
  
  validateWorkflow: async (workflowId) => {
    return httpRequest(
      `${MCP_ENDPOINT}/tools/automation.workflows.validate_workflow`,
      {
        body: {
          projectId: PROJECT_ID,
          workflowId: workflowId
        }
      }
    );
  },
  
  testWorkflow: async (workflowId, testData = {}) => {
    return httpRequest(
      `${MCP_ENDPOINT}/tools/automation.workflows.test_workflow`,
      {
        body: {
          projectId: PROJECT_ID,
          workflowId: workflowId,
          testData: testData,
          bounded: true,
          maxExecutions: 10
        }
      }
    );
  },
  
  getWorkflowDetails: async (workflowId) => {
    return httpRequest(
      `${MCP_ENDPOINT}/tools/automation.workflows.get_workflow`,
      {
        body: {
          projectId: PROJECT_ID,
          workflowId: workflowId
        }
      }
    );
  }
};

// Main deployment function
async function deployWorkflow() {
  console.log('🚀 Starting GDACS Ingestion Workflow Deployment');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Create workflow
    console.log('\n📝 Step 1/4: Creating workflow...');
    console.log(`   Workflow name: ${workflow.name}`);
    console.log(`   Project ID: ${PROJECT_ID}`);
    
    const createResponse = await MCP_TOOLS.createWorkflow(workflow);
    
    if (!createResponse.success || !createResponse.workflowId) {
      throw new Error(`Workflow creation failed: ${createResponse.message || 'Unknown error'}`);
    }
    
    const workflowId = createResponse.workflowId;
    const versionId = createResponse.versionId || '1.0.0';
    
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
    
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors?.join(', ') || 'Unknown errors'}`);
    }
    
    console.log('✅ Workflow validation passed!');
    console.log(`   Validations: ${validation.validations?.length || 0}`);
    
    // Step 4: Test workflow with bounded manual test
    console.log('\n🧪 Step 4/4: Running bounded manual test...');
    const testData = {
      backfillCursor: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      forwardWatermark: new Date().toISOString()
    };
    
    const testResponse = await MCP_TOOLS.testWorkflow(workflowId, testData);
    
    if (!testResponse.success) {
      throw new Error(`Test execution failed: ${testResponse.message || 'Unknown error'}`);
    }
    
    const executionId = testResponse.executionId;
    const rowCounts = testResponse.rowCounts || { alerts: 0, duplicates: 0, errors: 0 };
    
    console.log('✅ Bounded test completed successfully!');
    console.log(`   Execution ID: ${executionId}`);
    console.log(`   Alerts processed: ${rowCounts.alerts || 0}`);
    console.log(`   Duplicates skipped: ${rowCounts.duplicates || 0}`);
    console.log(`   Errors logged: ${rowCounts.errors || 0}`);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DEPLOYMENT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Workflow Created: ${workflow.name}`);
    console.log(`   Workflow ID: ${workflowId}`);
    console.log(`   Version ID: ${versionId}`);
    console.log(`   Execution ID: ${executionId}`);
    console.log(`   Status: Ready for activation`);
    console.log('\n📝 Next Steps:');
    console.log('   1. Review test execution results in OpenObserve');
    console.log('   2. Activate workflow when ready');
    console.log('   3. Monitor execution metrics');
    console.log('   4. Verify data in R2 and PostgreSQL');
    console.log('\n🎯 Workflow Features:');
    console.log('   • GDACS API integration with Webshare proxy');
    console.log('   • Deterministic event_id generation');
    console.log('   • Provenance tracking');
    console.log('   • Deduplication with data table');
    console.log('   • Error logging to harvy_errors');
    console.log('   • OpenObserve integration for logs/traces');
    console.log('   • Backfill cursor + forward watermark');
    console.log('   • R2 raw storage + PostgreSQL processed storage');
    
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
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    if (error.cause) {
      console.error('\nCause:', error.cause);
    }
    console.error('\nStack trace:');
    console.error(error.stack);
    
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
