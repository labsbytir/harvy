/** openFDA drug enforcement reports (batch 1). Keyless JSON. */
import type { OpenApiSourceConfig } from "../openapi.ts";

export const openFda: OpenApiSourceConfig = {
  source_id: "src_openfda",
  source_scope_id: "scope-openfda",
  publisher: "U.S. FDA openFDA",
  target_url: "https://api.fda.gov/drug/enforcement.json",
  method: "GET",
  default_params: { limit: 5 },
  max_records: 5,
  limit_keys: ["limit"],
  record_path: "results",
  fields: {
    id: "recall_number",
    title: "recalling_firm",
    summary: "reason_for_recall",
    time: "report_date",
  },
  coverage_note: "latest drug enforcement reports",
  sample_payload: {
    results: [
      {
        recall_number: "D-0001-2026",
        recalling_firm: "Sample Firm Inc.",
        reason_for_recall: "Mislabeled product.",
        report_date: "20261028",
      },
      {
        recall_number: "D-0002-2026",
        recalling_firm: "Example Labs LLC",
        reason_for_recall: "Subpotent batch.",
        report_date: "20261025",
      },
    ],
  },
};

export default openFda;
