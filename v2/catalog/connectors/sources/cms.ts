/** CMS dataset index (batch 1). Keyless JSON via the data-api dataset endpoint. */
import type { OpenApiSourceConfig } from "../openapi.ts";

export const cms: OpenApiSourceConfig = {
  source_id: "src_cms",
  source_scope_id: "scope-cms",
  publisher: "U.S. CMS Data",
  target_url: "https://data.cms.gov/api/v1/dataset",
  method: "GET",
  default_params: { conditions: "[keyword]=hospital", limit: 5, offset: 0 },
  max_records: 5,
  limit_keys: ["limit"],
  record_path: "data",
  fields: {
    id: "uuid",
    title: "title",
    summary: "description",
    time: "modified",
  },
  coverage_note: "keyword-bounded dataset index page, not full catalog",
  sample_payload: {
    data: [
      {
        uuid: "11111111-2222-4333-8444-555555555555",
        title: "Sample Hospital Dataset",
        description: "Sample hospital quality data.",
        modified: "2026-10-01",
      },
      {
        uuid: "66666666-7777-4888-8999-000000000000",
        title: "Sample Provider Dataset",
        description: "Sample provider data.",
        modified: "2026-09-15",
      },
    ],
  },
};

export default cms;
