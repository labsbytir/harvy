import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

// GDELT DOC 2.0 news connector (source_id src_gdelt, product newsk).
// spider-concurrency<=50 (GDELT is a direct structured API; no Spider used).

const every6h = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Every 6 Hours',
    parameters: {
      rule: { interval: [ { field: 'cronExpression', expression: '0 */6 * * *' } ] },
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

const fetch = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Fetch GDELT Articles',
    parameters: {
      method: 'GET',
      url: 'https://api.gdeltproject.org/api/v2/doc/doc?query=natural%20disaster&mode=artlist&maxrecords=50&format=json&timespan=1d',
      options: { timeout: 60000, proxy: expr('{{ $vars.WEBSHARE_PROXY_URL }}') },
    },
  },
});

const build = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build basin_event',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "const crypto = require('crypto');\nconst resp = $input.first().json || {};\nconst articles = Array.isArray(resp.articles) ? resp.articles : [];\nconst out = [];\nfor (let i = 0; i < articles.length; i++) {\n  const a = articles[i] || {};\n  if (!a.url) continue;\n  const hash = crypto.createHash('sha256').update(String(a.url)).digest('hex').slice(0, 16);\n  const event_id = 'src_gdelt_' + hash;\n  const captured = a.seendate || new Date().toISOString();\n  const publisher = 'GDELT ' + (a.domain || '');\n  const basin_event = { id: event_id, event_id: event_id, source_id: 'src_gdelt', publisher: publisher, headline: a.title || event_id, product: 'newsk', tenant_id: 'shared', workspace_id: 'shared', captured_at: captured };\n  const artifact = { schema_version: 1, event_id: event_id, source_id: 'src_gdelt', run_id: String($execution.id), collected_at: new Date().toISOString(), source_url: a.url, domain: a.domain || null, title: a.title || null, seendate: a.seendate || null, publisher: publisher, provenance: { api: 'gdelt_doc_2' } };\n  out.push({ json: { event_id: event_id, artifact_path: 'gdelt/' + event_id + '.json', basin_event: basin_event, artifact: artifact } });\n}\nif (out.length === 0) { out.push({ json: { _empty: true } }); }\nreturn out;",
    },
  },
});

const uploadR2 = node({
  type: 'n8n-nodes-base.s3',
  version: 1,
  config: {
    name: 'Upload to R2',
    parameters: {
      resource: 'file',
      operation: 'upload',
      bucketName: 'harvy-artifacts',
      fileName: expr('{{ $json.artifact_path }}'),
      binaryData: false,
      fileContent: expr('{{ JSON.stringify($json.artifact, null, 2) }}'),
      additionalFields: { contentType: 'application/json' },
    },
    credentials: { s3: { id: '2Kmi5XH0BesB1EXN', name: 'S3 account' } },
  },
});

const collect = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Collect basin_events',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "const items = $('Build basin_event').all();\nconst basin_events = [];\nfor (let i = 0; i < items.length; i++) {\n  const j = items[i].json || {};\n  if (j.basin_event) basin_events.push(j.basin_event);\n}\nreturn [{ json: { basin_events: basin_events, count: basin_events.length } }];",
    },
  },
});

const ingestBasin = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Ingest Basin',
    parameters: {
      method: 'POST',
      url: 'https://e05a3ed89b654c2797dcff2cbd22c8ef.ingest.cloudflare.com',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr('{{ $json.basin_events }}'),
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: {
        parameters: [
          { name: 'Authorization', value: expr("{{ 'Bearer ' + $vars.BASIN_SEND_TOKEN }}") },
          { name: 'Content-Type', value: 'application/json' },
        ],
      },
      options: { timeout: 30000 },
    },
  },
});

const verifyBasin = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Verify Basin',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "const body = $input.first().json || {};\nlet committed = 0;\nif (body.result && typeof body.result.committed === 'number') { committed = body.result.committed; }\nelse if (typeof body.committed === 'number') { committed = body.committed; }\nelse if (typeof body.accepted === 'number') { committed = body.accepted; }\nconst collect = $('Collect basin_events').first().json || {};\nconst expected = collect.count || 0;\nif (committed < 1) { throw new Error('Basin committed < 1: ' + JSON.stringify(body).slice(0, 300)); }\nconst envelope = { platform: 'v2', event_type: 'gdelt_ingested', connector: 'gdelt', source_id: 'src_gdelt', run_id: String($execution.id), environment_id: 'shared', occurred_at: new Date().toISOString(), payload: { committed: committed, expected: expected, basin_ingested: true } };\nconst k2_content = Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');\nreturn [{ json: { committed: committed, expected: expected, ok: true, k2_content: k2_content } }];",
    },
  },
});

const markIngested = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Mark Ingested',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: 'https://e8073c59caed4ee193cd995aa457b21a.k2.cloudflarestorage.com/produce',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'cloudflareApi',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr('{{ { records: [{ content: $json.k2_content, headers: { platform: "v2", "event-type": "gdelt_ingested", connector: "gdelt", source_id: "src_gdelt" } }] } }}'),
      options: { timeout: 30000 },
    },
    credentials: { cloudflareApi: { id: 'sJmRXLeWmtTdfC6k', name: 'Cloudflare account' } },
  },
});

const formatErr = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Format gdelt Error',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: "const src = $input.first().json || {};\nconst exec = src.execution || src;\nconst lastNode = (exec.lastNode && exec.lastNode.name) || null;\nconst errObj = exec.error || {};\nconst message = errObj.message || errObj.description || JSON.stringify(src).slice(0, 500);\nconst envelope = { platform: 'v2', event_type: 'gdelt_errors', connector: 'gdelt', source_id: 'src_gdelt', run_id: String($execution.id), environment_id: 'shared', occurred_at: new Date().toISOString(), payload: { last_node: lastNode, message: String(message).slice(0, 800) } };\nconst k2_content = Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64');\nreturn [{ json: { k2_content: k2_content } }];",
    },
  },
});

const logErr = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Log gdelt Error',
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: 'https://e8073c59caed4ee193cd995aa457b21a.k2.cloudflarestorage.com/produce',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'cloudflareApi',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr('{{ { records: [{ content: $json.k2_content, headers: { platform: "v2", "event-type": "gdelt_errors", connector: "gdelt", source_id: "src_gdelt" } }] } }}'),
      options: { timeout: 30000 },
    },
    credentials: { cloudflareApi: { id: 'sJmRXLeWmtTdfC6k', name: 'Cloudflare account' } },
  },
});

export default workflow('gdelt', 'gdelt - GDELT DOC 2.0 news connector')
  .add(every6h).to(fetch)
  .add(manual).to(fetch)
  .to(build).to(uploadR2).to(collect).to(ingestBasin).to(verifyBasin).to(markIngested)
  .add(errTrigger).to(formatErr).to(logErr)
  .group('GDELT ingest pipeline', [fetch, build, uploadR2, collect, ingestBasin, verifyBasin, markIngested], {
    description: 'Fetch GDELT articles, write R2 artifacts, ingest to Basin, record ingestion',
  })
  .group('Error logging', [formatErr, logErr], {
    description: 'Format workflow errors and emit gdelt_errors events',
  });
