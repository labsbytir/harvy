import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

// CourtListener REST API workflow (source_id: src_courtlistener_api, product: Civic)
// Uses CourtListener REST API with verified Webshare proxy egress.
// API docs: https://www.courtlistener.com/api/rest-info/
// Rate limit: 100 requests per 10 seconds per IP

const everyHour = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Hourly CourtListener API Poll',
    parameters: {
      rule: { interval: [ { field: 'cronExpression', expression: '0 * * * *' } ] },
      misfirePolicy: 'coalesce',
    },
  },
});

const manual = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Manual Trigger' },
});

const errTrigger = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'Error Trigger' },
});

// Receive Harvy Automation envelope
const receiveEnvelope = node({
  type: 'n8n-nodes-base.webhook',
  version: 1,
  config: {
    name: 'Receive Automation Envelope',
    parameters: {
      httpMethod: 'POST',
      path: 'webhook/internal/v1/scrape-runs',
      responseMode: 'responseNode',
    },
  },
});

// Validate envelope
const validateEnvelope = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Validate Envelope',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "const body = $input.first().json || {};
const required = ['contract_version', 'run_id', 'trace_id', 'connector_id', 'source_scope_id', 'access_scope_id', 'target_url', 'mode', 'provider', 'required_proxy', 'preflight_required', 'direct_fallback_allowed', 'max_pages', 'deadline_seconds', 'idempotency_key'];
const missing = required.filter(key => !(key in body));
if (missing.length > 0) throw new Error('Missing fields: ' + missing.join(', '));
if (body.contract_version !== 1) throw new Error('Unsupported contract version');
if (body.required_proxy !== 'webshare') throw new Error('Required proxy must be webshare');
if (body.preflight_required !== true) throw new Error('Preflight must be required');
if (body.direct_fallback_allowed !== false) throw new Error('Direct fallback must be disabled');
return [{ json: body }];",
    },
  },
});

// Check connector type
const checkConnector = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Check Connector',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "const body = $input.first().json || {};
if (body.connector_id !== 'courtlistener' && body.connector_id !== 'courtlistener_api' && body.connector_id !== 'src_courtlistener') {
  throw new Error('This workflow only handles CourtListener requests. Received: ' + body.connector_id);
}
return [{ json: body }];",
    },
  },
});

// Parse target URL to extract query parameters
const parseTarget = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Parse Target URL',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "const body = $input.first().json || {};
const url = new URL(body.target_url);
const params = Object.fromEntries(url.searchParams.entries());

// CourtListener API endpoint: https://www.courtlistener.com/api/rest/v3/
// Common endpoints: cases/, opinions/, recap/
const endpoint = url.pathname.replace(/\/api\/rest\/v3\//, '');

// Extract date range from URL or use defaults (last 24 hours)
const dateFiledGte = params.date_filed__gte || params.date_filed_min || '';
const dateFiledLte = params.date_filed__lte || params.date_filed_max || '';

// Validate date range is within bounds: 2023-01-01 to 2026-09-30
const startDate = new Date('2023-01-01T00:00:00Z');
const endDate = new Date('2026-09-30T23:59:59Z');

let fromDate = dateFiledGte ? new Date(dateFiledGte) : new Date(Date.now() - 24 * 60 * 60 * 1000);
let toDate = dateFiledLte ? new Date(dateFiledLte) : new Date();

if (fromDate < startDate) fromDate = startDate;
if (toDate > endDate) toDate = endDate;
if (fromDate > toDate) [fromDate, toDate] = [toDate, fromDate];

return [{ json: {
  ...body,
  endpoint: endpoint,
  params: params,
  date_filed_gte: fromDate.toISOString().split('T')[0],
  date_filed_lte: toDate.toISOString().split('T')[0],
  max_pages: Math.min(body.max_pages || 10, 10), // Limit to 10 pages for API
} }];",
    },
  },
});

// Build CourtListener API request
const buildApiRequest = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build API Request',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "const body = $input.first().json || {};

// CourtListener API base URL
const baseUrl = 'https://www.courtlistener.com/api/rest/v3/';

// Build query parameters
const params = new URLSearchParams();

// Add date range
if (body.date_filed_gte) params.set('date_filed__gte', body.date_filed_gte);
if (body.date_filed_lte) params.set('date_filed__lte', body.date_filed_lte);

// Add pagination
params.set('page_size', String(Math.min(body.max_pages * 25, 250))); // Max 250 per page

// Add ordering
params.set('ordering', '-date_filed');

// Build URL based on endpoint
let url;
switch (body.endpoint) {
  case 'cases':
    url = `${baseUrl}cases/?${params.toString()}`;
    break;
  case 'opinions':
    url = `${baseUrl}opinions/?${params.toString()}`;
    break;
  case 'recap':
    url = `${baseUrl}recap/?${params.toString()}`;
    break;
  default:
    // Default to cases
    url = `${baseUrl}cases/?${params.toString()}`;
}

return [{ json: { ...body, api_url: url } }];",
    },
  },
});

// Fetch from CourtListener API with Webshare proxy
const fetchFromApi = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Fetch CourtListener API',
    parameters: {
      method: 'GET',
      url: expr('{{ $json.api_url }}'),
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'Authorization', value: expr('{{ $vars.COURTLISTENER_API_TOKEN }}') },
        ],
      },
      options: { 
        timeout: 30000,
        proxy: expr('{{ $vars.WEBSHARE_PROXY_URL }}'),
      },
    },
  },
});

// Parse API response
const parseResponse = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Parse API Response',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "const body = $input.first().json || {};
const apiResponse = body.json || {};

// CourtListener API response format
// {
//   count: number,
//   next: url,
//   previous: url,
//   results: [...]
// }

if (!apiResponse.results || !Array.isArray(apiResponse.results)) {
  throw new Error('Invalid API response format: missing results array');
}

const results = apiResponse.results;
const envelope = $input.first().json || {};

// Transform each result to Harvy event
const events = results.map((result, index) => {
  const crypto = require('crypto');
  
  // Create event ID from case ID or opinion ID
  const idSource = result.case_id || result.id || result.docket_number || String(index);
  const hash = crypto.createHash('sha256').update(String(idSource)).digest('hex').slice(0, 16);
  const eventId = 'src_courtlistener_' + hash;
  
  // Extract relevant fields based on result type
  let title, summary, metadata;
  
  if (result.case_name) {
    // Case record
    title = result.case_name;
    summary = `Case ${result.docket_number || result.case_id || idSource} in ${result.court || 'unknown'} court`;
    metadata = {
      case_id: result.case_id,
      docket_number: result.docket_number,
      court: result.court,
      date_filed: result.date_filed,
      date_terminated: result.date_terminated,
      nature_of_suit: result.nature_of_suit,
      status: result.status,
      source: 'courtlistener_cases',
    };
  } else if (result.cluster_id) {
    // Opinion record
    title = result.case_name || 'Opinion';
    summary = `Opinion in case ${result.docket_number || result.case_id || idSource}`;
    metadata = {
      opinion_id: result.id,
      cluster_id: result.cluster_id,
      case_id: result.case_id,
      docket_number: result.docket_number,
      court: result.court,
      date_filed: result.date_filed,
      date_issued: result.date_issued,
      source: 'courtlistener_opinions',
    };
  } else {
    // Generic RECAP document
    title = result.description || 'Court Document';
    summary = `Document ${result.document_number || result.id || idSource} from ${result.court || 'unknown'} court`;
    metadata = {
      document_id: result.id,
      document_number: result.document_number,
      court: result.court,
      date_filed: result.date_filed,
      description: result.description,
      source: 'courtlistener_recap',
    };
  }
  
  return {
    id: eventId,
    event_id: eventId,
    source_id: 'src_courtlistener',
    publisher: 'CourtListener',
    product: 'Civic',
    tenant_id: envelope.access_scope_id?.replace('tenant-', '') || 'shared',
    workspace_id: envelope.access_scope_id?.replace('tenant-', '') || 'shared',
    title: title,
    summary: summary,
    status: 'new',
    first_seen_at: result.date_filed || result.date_issued || new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    run_id: envelope.run_id,
    trace_id: envelope.trace_id,
    source_scope_id: envelope.source_scope_id,
    access_scope_id: envelope.access_scope_id,
    metadata: metadata,
  };
});

return events.map(event => ({ json: event }));",
    },
  },
});

// Upload raw artifact
const uploadRawArtifact = node({
  type: 'n8n-nodes-base.s3',
  version: 1,
  config: {
    name: 'Upload Raw Artifact',
    parameters: {
      resource: 'file',
      operation: 'upload',
      bucketName: 'harvy-raw',
      fileName: expr('{{ `courtlistener/raw/${$json.run_id}/${$json.id}.json` }}'),
      binaryData: false,
      fileContent: expr('{{ JSON.stringify($json, null, 2) }}'),
      additionalFields: { 
        contentType: 'application/json',
        customMetadata: JSON.stringify({ 
          run_id: $json.run_id, 
          trace_id: $json.trace_id,
          source: $json.metadata?.source || 'courtlistener',
        }),
      },
    },
    credentials: { s3: { id: '2Kmi5XH0BesB1EXN', name: 'S3 account' } },
  },
});

// Upload processed artifact
const uploadProcessedArtifact = node({
  type: 'n8n-nodes-base.s3',
  version: 1,
  config: {
    name: 'Upload Processed Artifact',
    parameters: {
      resource: 'file',
      operation: 'upload',
      bucketName: 'harvy-artifacts',
      fileName: expr('{{ `courtlistener/processed/${$json.run_id}/${$json.id}.json` }}'),
      binaryData: false,
      fileContent: expr('{{ JSON.stringify($json, null, 2) }}'),
      additionalFields: { 
        contentType: 'application/json',
        customMetadata: JSON.stringify({ 
          run_id: $json.run_id, 
          trace_id: $json.trace_id,
          event_id: $json.id,
          source: $json.metadata?.source || 'courtlistener',
        }),
      },
    },
    credentials: { s3: { id: '2Kmi5XH0BesB1EXN', name: 'S3 account' } },
  },
});

// Post status callback
const postStatusCallback = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Post Status Callback',
    parameters: {
      method: 'POST',
      url: 'https://harvy.dev/internal/v1/automation-callback',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'X-Harvy-Timestamp', value: expr('{{ Date.now() }}') },
          { name: 'X-Harvy-Signature', value: expr('{{ $vars.AUTOMATION_CALLBACK_SIGNATURE }}') },
        ],
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr('{{ { run_id: $json.run_id, status: "succeeded", error_code: null } }}'),
      options: { timeout: 30000 },
    },
  },
});

// Post publication callback
const postPublicationCallback = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Post Publication Callback',
    parameters: {
      method: 'POST',
      url: 'https://harvy.dev/internal/v1/automation-publications',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: 'X-Harvy-Timestamp', value: expr('{{ Date.now() }}') },
          { name: 'X-Harvy-Signature', value: expr('{{ $vars.AUTOMATION_CALLBACK_SIGNATURE }}') },
        ],
      },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr('{{ {
        run_id: $json.run_id,
        raw_manifests: [
          {
            stage: "raw",
            scope: $json.access_scope_id,
            source_id: "src_courtlistener",
            path: `courtlistener/raw/${$json.run_id}/${$json.id}.json`,
            size: JSON.stringify($json).length,
            sha256: "placeholder",
            timestamp: $json.first_seen_at,
          }
        ],
        processed_manifests: [
          {
            stage: "processed",
            scope: $json.access_scope_id,
            source_id: "src_courtlistener",
            path: `courtlistener/processed/${$json.run_id}/${$json.id}.json`,
            size: JSON.stringify($json).length,
            sha256: "placeholder",
            timestamp: new Date().toISOString(),
          }
        ],
        event_count: 1,
        evidence_count: 0,
      } }}'),
      options: { timeout: 30000 },
    },
  },
});

// Respond with 202 Accepted
const respondAccepted = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1,
  config: {
    name: 'Respond 202 Accepted',
    parameters: {
      options: {
        responseCode: 202,
        responseData: '{ "status": "queued", "message": "CourtListener API request accepted" }',
      },
    },
  },
});

// Format error
const formatError = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Format Error',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "const body = $input.first().json || {};
const exec = body.execution || body;
const lastNode = (exec.lastNode && exec.lastNode.name) || null;
const errObj = exec.error || {};
const message = errObj.message || errObj.description || JSON.stringify(body).slice(0, 500);
return [{ json: { error: message, last_node: lastNode, timestamp: new Date().toISOString() } }];",
    },
  },
});

export default workflow('courtlistener-api', 'CourtListener REST API Workflow')
  .add(everyHour).to(receiveEnvelope)
  .add(manual).to(receiveEnvelope)
  .to(validateEnvelope).to(checkConnector).to(parseTarget).to(buildApiRequest)
  .to(fetchFromApi).to(parseResponse).to(uploadRawArtifact).to(uploadProcessedArtifact)
  .to(postStatusCallback).to(postPublicationCallback).to(respondAccepted)
  .add(errTrigger).to(formatError)
  .group('CourtListener API Pipeline', [receiveEnvelope, validateEnvelope, checkConnector, parseTarget, buildApiRequest, fetchFromApi, parseResponse, uploadRawArtifact, uploadProcessedArtifact, postStatusCallback, postPublicationCallback, respondAccepted], {
    description: 'Receive CourtListener API request, fetch data, transform, upload artifacts, and post callbacks',
  })
  .group('Error Handling', [formatError], {
    description: 'Format and log workflow errors',
  });
