/** Federal Register documents API (batch 1). Keyless JSON; Automation fetches target_url. */
import type { OpenApiSourceConfig } from "../openapi.ts";

export const federalRegister: OpenApiSourceConfig = {
  source_id: "src_federal-register",
  source_scope_id: "scope-federal-register",
  publisher: "U.S. Federal Register",
  target_url: "https://www.federalregister.gov/api/v1/documents.json",
  method: "GET",
  default_params: { per_page: 5, order: "newest" },
  max_records: 5,
  limit_keys: ["per_page"],
  record_path: "results",
  fields: {
    id: "document_number",
    title: "title",
    summary: "abstract",
    time: "publication_date",
    url: "html_url",
  },
  coverage_note: "latest published documents, newest first",
  sample_payload: {
    count: 2,
    results: [
      {
        document_number: "2026-12345",
        title: "Sample final rule",
        abstract: "Summary of the sample rule.",
        publication_date: "2026-10-29",
        html_url: "https://www.federalregister.gov/documents/2026/10/29/2026-12345/sample-rule",
      },
      {
        document_number: "2026-12346",
        title: "Sample proposed rule",
        abstract: "Summary of the sample proposal.",
        publication_date: "2026-10-28",
        html_url: "https://www.federalregister.gov/documents/2026/10/28/2026-12346/sample-proposal",
      },
    ],
  },
};

export default federalRegister;
