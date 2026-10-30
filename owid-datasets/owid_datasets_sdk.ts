import { workflow, node, trigger, ifElse, expr } from '@n8n/workflow-sdk';

const manualTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Manual Trigger', position: [0, 0] },
  output: [{}]
});

const scheduleTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Every 6 Hours',
    position: [0, 200],
    parameters: {
      rule: {
        interval: [
          {
            field: 'hours',
            hoursInterval: 6
          }
        ]
      }
    }
  },
  output: [{}]
});

const fetchPrimaryCsv = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Fetch Annual CO2 CSV',
    position: [240, 100],
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: 'https://ourworldindata.org/grapher/annual-co2-emissions.csv?csvType=full',
      options: {
        proxy: '={{ $vars.WEBSHARE_PROXY_URL }}',
        timeout: 30000,
        response: {
          response: {
            responseFormat: 'text'
          }
        }
      }
    }
  },
  output: [{ data: 'Entity,Code,Year,Annual CO₂ emissions\nAfghanistan,AFG,1949,14656' }]
});

const csvUsable = ifElse({
  version: 2.4,
  config: {
    name: 'CSV Usable?',
    position: [480, 100],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [
          {
            leftValue: expr('{{ ($json.data || "") }}'),
            rightValue: 'Entity,',
            operator: { type: 'string', operation: 'startsWith' }
          }
        ],
        combinator: 'and'
      }
    }
  }
});

const fetchFallbackCsv = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Fetch Fallback Per-Capita CSV',
    position: [480, 300],
    parameters: {
      method: 'GET',
      url: 'https://ourworldindata.org/grapher/co2-emissions-per-capita.csv?csvType=full',
      options: {
        proxy: '={{ $vars.WEBSHARE_PROXY_URL }}',
        timeout: 30000,
        response: {
          response: {
            responseFormat: 'text'
          }
        }
      }
    }
  },
  output: [{ data: 'Entity,Code,Year,CO₂ emissions per capita\nAfghanistan,AFG,1949,0.0019921463' }]
});

const normalizeRows = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Normalize CO2 Rows',
    position: [720, 200],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "const item = $input.first().json;\nconst csv = typeof item.data === 'string' ? item.data : '';\nif (csv.slice(0, 11) !== 'Entity,Code') {\n  throw new Error('No OWID CSV payload on input: ' + JSON.stringify(item).slice(0, 200));\n}\nconst primaryUrl = 'https://ourworldindata.org/grapher/annual-co2-emissions.csv?csvType=full';\nconst fallbackUrl = 'https://ourworldindata.org/grapher/co2-emissions-per-capita.csv?csvType=full';\nconst sourceUrl = $('Fetch Annual CO2 CSV').isExecuted && $('Fetch Annual CO2 CSV').item.json.data ? primaryUrl : fallbackUrl;\nconst lines = csv.trim().split(/\\r?\\n/);\nconst out = [];\nfor (let i = 1; i < lines.length && out.length < 100; i++) {\n  const parts = lines[i].split(',');\n  if (parts.length < 4) continue;\n  const entity = parts[0];\n  const code = parts[1];\n  const year = parts[2];\n  const value = parts.slice(3).join(',');\n  if (!entity || !year) continue;\n  const idPart = code || entity.replace(/[^A-Za-z0-9]+/g, '_');\n  const event_id = 'src_owid_datasets_co2_' + idPart + '_' + year;\n  const captured_at = year + '-01-01T00:00:00Z';\n  out.push({\n    json: {\n      event_id,\n      raw_record: {\n        id: event_id,\n        entity,\n        code,\n        year,\n        value,\n        source_url: sourceUrl,\n        captured_at\n      },\n      basin_event: {\n        id: event_id,\n        event_id,\n        source_id: 'src_owid_datasets',\n        publisher: 'Our World in Data',\n        headline: 'CO2 - ' + entity + ' ' + year + ': ' + value,\n        product: 'ops',\n        tenant_id: 'shared',\n        workspace_id: 'shared',\n        captured_at\n      }\n    }\n  });\n}\nif (out.length === 0) {\n  throw new Error('OWID CSV parsed 0 rows');\n}\nreturn out;\n"
    }
  },
  output: [
    {
      event_id: 'src_owid_datasets_co2_AFG_1949',
      raw_record: { id: 'src_owid_datasets_co2_AFG_1949', entity: 'Afghanistan', code: 'AFG', year: '1949', value: '14656' },
      basin_event: {
        id: 'src_owid_datasets_co2_AFG_1949',
        event_id: 'src_owid_datasets_co2_AFG_1949',
        source_id: 'src_owid_datasets',
        publisher: 'Our World in Data',
        headline: 'CO2 - Afghanistan 1949: 14656',
        product: 'ops',
        tenant_id: 'shared',
        workspace_id: 'shared',
        captured_at: '1949-01-01T00:00:00Z'
      }
    }
  ]
});

const filterNewRows = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Filter Already Ingested',
    position: [960, 200],
    parameters: {
      resource: 'row',
      operation: 'rowNotExists',
      dataTableId: {
        __rl: true,
        mode: 'id',
        value: 'I53AZa8obhi4jtJE'
      },
      matchType: 'allConditions',
      filters: {
        conditions: [
          {
            keyName: 'event_id',
            keyValue: '={{ $json.event_id }}'
          }
        ]
      }
    }
  },
  output: [{ event_id: 'src_owid_datasets_co2_AFG_1949' }]
});

const uploadToS3 = node({
  type: 'n8n-nodes-base.s3',
  version: 1,
  config: {
    name: 'Upload Artifact to S3',
    position: [1200, 200],
    parameters: {
      resource: 'file',
      operation: 'upload',
      bucketName: 'harvy-artifacts',
      fileName: '={{ "owid_datasets/" + $json.event_id + ".json" }}',
      binaryData: false,
      fileContent: '={{ JSON.stringify($json.raw_record, null, 2) }}',
      additionalFields: {
        contentType: 'application/json'
      }
    },
    credentials: {
      s3: newCredential('S3 account')
    }
  },
  output: [{ success: true, fileName: 'owid_datasets/src_owid_datasets_co2_AFG_1949.json' }]
});

const ingestBasin = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.2,
  config: {
    name: 'Ingest to Basin',
    position: [1440, 200],
    parameters: {
      method: 'POST',
      url: 'https://e05a3ed89b654c2797dcff2cbd22c8ef.ingest.cloudflare.com',
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: {
        parameters: [
          {
            name: 'Authorization',
            value: "={{ 'Bearer ' + $vars.BASIN_SEND_TOKEN }}"
          },
          {
            name: 'Content-Type',
            value: 'application/json'
          }
        ]
      },
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: '={{ [ $json.basin_event || $("Normalize CO2 Rows").item.json.basin_event ] }}',
      options: {
        timeout: 30000,
        response: {
          response: {
            fullResponse: true
          }
        }
      }
    }
  },
  output: [{ statusCode: 200, body: { success: true, result: { committed: 1 } } }]
});

const verifyBasin = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Verify Basin Ingest',
    position: [1680, 200],
    parameters: {
      mode: 'runOnceForEachItem',
      language: 'javaScript',
      jsCode: "const body = $json.body ?? $json;\nif (body?.result?.committed >= 1 || body?.success === true) {\n  return { json: { event_id: $('Normalize CO2 Rows').item.json.event_id, committed: true } };\n}\nthrow new Error('Basin ingest uncommitted: ' + JSON.stringify(body));\n"
    }
  },
  output: [{ event_id: 'src_owid_datasets_co2_AFG_1949', committed: true }]
});

const recordIngested = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Record Ingested Event',
    position: [1920, 200],
    parameters: {
      resource: 'row',
      operation: 'insert',
      dataTableId: {
        __rl: true,
        mode: 'id',
        value: 'I53AZa8obhi4jtJE'
      },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          event_id: '={{ $json.event_id }}'
        },
        schema: [
          {
            id: 'event_id',
            displayName: 'event_id',
            required: true,
            defaultMatch: true,
            display: true,
            type: 'string',
            canBeUsedToMatch: true
          }
        ]
      }
    }
  },
  output: [{ event_id: 'src_owid_datasets_co2_AFG_1949' }]
});

const errorTrigger = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'Error Trigger', position: [0, -300] },
  output: [{ execution: { id: '123' }, workflow: { id: 'abc', name: 'OWID Datasets Ingestion (owid_datasets)' }, error: { message: 'boom' } }]
});

const formatError = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Format Error Row',
    position: [240, -300],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "const err = $input.first().json;\nreturn [{\n  json: {\n    workflow_id: err.workflow?.id ?? $workflow.id,\n    workflow_name: err.workflow?.name ?? $workflow.name,\n    execution_id: err.execution?.id ?? $execution.id,\n    error_message: JSON.stringify(err.error ?? err).slice(0, 900),\n    occurred_at: new Date().toISOString()\n  }\n}];\n"
    }
  },
  output: [
    {
      workflow_id: 'abc',
      workflow_name: 'OWID Datasets Ingestion (owid_datasets)',
      execution_id: '123',
      error_message: '{"message":"boom"}',
      occurred_at: '2026-10-30T10:00:00.000Z'
    }
  ]
});

const logError = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Log Workflow Error',
    position: [480, -300],
    parameters: {
      resource: 'row',
      operation: 'insert',
      dataTableId: {
        __rl: true,
        mode: 'id',
        value: 'A5GNAdOVATFlintz'
      },
      columns: {
        mappingMode: 'defineBelow',
        value: {
          workflow_id: '={{ $json.workflow_id }}',
          workflow_name: '={{ $json.workflow_name }}',
          execution_id: '={{ $json.execution_id }}',
          error_message: '={{ $json.error_message }}',
          occurred_at: '={{ $json.occurred_at }}'
        }
      }
    }
  },
  output: [{ inserted: true }]
});

export default workflow('owid_datasets', 'OWID Datasets Ingestion (owid_datasets)')
  .add(manualTrigger)
  .to(fetchPrimaryCsv)
  .add(scheduleTrigger)
  .to(fetchPrimaryCsv)
  .to(csvUsable
    .onTrue(normalizeRows
      .to(filterNewRows)
      .to(uploadToS3)
      .to(ingestBasin)
      .to(verifyBasin)
      .to(recordIngested))
    .onFalse(fetchFallbackCsv.to(normalizeRows)))
  .add(errorTrigger)
  .to(formatError)
  .to(logError);
