/** CDC PLACES local health data, Socrata API (batch 1). Keyless JSON. */
import type { OpenApiSourceConfig } from "../openapi.ts";

export const cdcPlaces: OpenApiSourceConfig = {
  source_id: "src_cdc-places",
  source_scope_id: "scope-cdc-places",
  publisher: "U.S. CDC PLACES",
  target_url: "https://data.cdc.gov/resource/6vp6-wxuq.json",
  method: "GET",
  default_params: { $limit: 5 },
  max_records: 5,
  limit_keys: ["$limit"],
  record_path: "",
  fields: {
    id: ["locationid", "measureid"],
    title: ["measure", "locationname"],
    summary: ["data_value", "measure"],
  },
  coverage_note: "sample PLACES rows; geography-bounded extracts only",
  sample_payload: [
    {
      locationid: "01",
      locationname: "Alabama",
      measureid: "ARTHRITIS",
      measure: "Arthritis among adults",
      data_value: "28.4",
    },
    {
      locationid: "02",
      locationname: "Alaska",
      measureid: "ARTHRITIS",
      measure: "Arthritis among adults",
      data_value: "24.1",
    },
  ],
};

export default cdcPlaces;
