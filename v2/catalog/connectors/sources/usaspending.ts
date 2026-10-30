/** USAspending award search (batch 1). Keyless JSON, POST-only endpoint. */
import type { OpenApiSourceConfig } from "../openapi.ts";

export const usaspending: OpenApiSourceConfig = {
  source_id: "src_usaspending",
  source_scope_id: "scope-usaspending",
  publisher: "U.S. USAspending",
  target_url: "https://api.usaspending.gov/api/v2/search/spending_by_award/",
  method: "POST",
  default_params: {},
  default_body: {
    filters: { award_type_codes: ["A"] },
    fields: ["Award ID", "Recipient Name", "Award Description", "Award Amount", "Start Date"],
    sort: "Award Amount",
    order: "desc",
    limit: 5,
    page: 1,
  },
  max_records: 5,
  limit_keys: ["body.limit"],
  record_path: "results",
  fields: {
    id: "Award ID",
    title: "Recipient Name",
    summary: "Award Description",
    time: "Start Date",
  },
  coverage_note: "bounded contract-award search, one page",
  sample_payload: {
    results: [
      {
        "Award ID": "123456",
        "Recipient Name": "Sample Corp",
        "Award Description": "Sample services contract.",
        "Award Amount": 1000000,
        "Start Date": "2026-01-15",
      },
      {
        "Award ID": "123457",
        "Recipient Name": "Example LLC",
        "Award Description": "Sample supplies contract.",
        "Award Amount": 500000,
        "Start Date": "2026-02-01",
      },
    ],
  },
};

export default usaspending;
