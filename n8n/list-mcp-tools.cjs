#!/usr/bin/env node

/**
 * List available MCP tools
 */

const path = require('path');

const MCP_ENDPOINT = 'https://n8n.harvy.dev/mcp-server/http';
const MCP_API_KEY_PATH = path.join(process.env.HOME, '.config/harvy/n8n_mcp_key');

// Read MCP API key
let mcpApiKey;
try {
  mcpApiKey = require('fs').readFileSync(MCP_API_KEY_PATH, 'utf8').trim();
} catch (error) {
  console.error('❌ Failed to read MCP API key from:', MCP_API_KEY_PATH);
  process.exit(1);
}

// Simple MCP call to list tools
async function listTools() {
  console.log('🔍 Listing available MCP tools...\n');
  
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };
  
  try {
    const response = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mcpApiKey}`,
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify(request)
    });
    
    const text = await response.text();
    let result;
    
    try {
      result = JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/data:\s*({[\s\S]*})/);
      if (jsonMatch && jsonMatch[1]) {
        result = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error(`Failed to parse: ${text.substring(0, 500)}`);
      }
    }
    
    if (result.error) {
      console.error('❌ Error:', result.error.message);
      return;
    }
    
    const tools = result.result || [];
    
    console.log(`Found ${tools.length} tools:\n`);
    
    tools.forEach((tool, index) => {
      console.log(`${index + 1}. ${tool.name}`);
      if (tool.description) {
        console.log(`   ${tool.description}`);
      }
      console.log('');
    });
    
    // Filter for workflow-related tools
    console.log('\n🔎 Workflow-related tools:');
    const workflowTools = tools.filter(t => t.name.includes('workflow') || t.name.includes('Workflow'));
    workflowTools.forEach(tool => {
      console.log(`  - ${tool.name}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to list tools:', error.message);
    console.error('\nTry: curl -v -H "Authorization: Bearer $(cat ~/.config/harvy/n8n_mcp_key)"', MCP_ENDPOINT);
    process.exit(1);
  }
}

listTools();
