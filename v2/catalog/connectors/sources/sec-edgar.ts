/** SEC EDGAR company submissions (batch 1). Keyless JSON, descriptive User-Agent required. */
import type { OpenApiSourceConfig } from "../openapi.ts";

export const secEdgar: OpenApiSourceConfig = {
  source_id: "src_sec-edgar",
  source_scope_id: "scope-sec-edgar",
  publisher: "U.S. SEC EDGAR",
  target_url: "https://data.sec.gov/submissions/CIK0000320193.json",
  method: "GET",
  headers: { "User-Agent": "Harvy research (https://example.org/contact)" },
  default_params: {},
  max_records: 10,
  limit_keys: [],
  record_path: "",
  transpose: {
    path: "filings.recent",
    keys: ["accessionNumber", "form", "filingDate", "primaryDocument"],
  },
  response_bounded: true,
  fields: {
    id: "accessionNumber",
    title: "form",
    summary: "primaryDocument",
    time: "filingDate",
  },
  coverage_note: "single issuer recent filings (Apple CIK 320193); parallel arrays transposed client-side",
  sample_payload: {
    cik: "320193",
    name: "Apple Inc.",
    filings: {
      recent: {
        accessionNumber: ["0000320193-26-000001", "0000320193-26-000002"],
        form: ["10-K", "8-K"],
        filingDate: ["2026-10-28", "2026-10-20"],
        primaryDocument: ["aapl-20260927.htm", "aapl-20261020.htm"],
      },
    },
  },
};

export default secEdgar;
