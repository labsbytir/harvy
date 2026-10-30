/** CFPB consumer complaint database, Socrata API (batch 1). Keyless JSON. */
import type { OpenApiSourceConfig } from "../openapi.ts";

export const cfpb: OpenApiSourceConfig = {
  source_id: "src_cfpb",
  source_scope_id: "scope-cfpb",
  publisher: "U.S. CFPB",
  target_url: "https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/",
  method: "GET",
  default_params: { size: 5, sort: "created_date_desc" },
  max_records: 5,
  limit_keys: ["size"],
  record_path: "hits.hits",
  fields: {
    id: "_id",
    title: ["_source.product", "_source.issue"],
    summary: ["_source.complaint_what_happened", "_source.issue"],
    time: "_source.date_sent_to_company",
  },
  coverage_note: "latest complaints, newest first",
  sample_payload: {
    hits: {
      total: { value: 2 },
      hits: [
        {
          _id: "9990001",
          _source: {
            product: "Credit reporting",
            issue: "Sample issue one",
            complaint_what_happened: "Sample narrative one.",
            date_sent_to_company: "2026-10-28",
          },
        },
        {
          _id: "9990002",
          _source: {
            product: "Debt collection",
            issue: "Sample issue two",
            complaint_what_happened: "Sample narrative two.",
            date_sent_to_company: "2026-10-27",
          },
        },
      ],
    },
  },
};

export default cfpb;
