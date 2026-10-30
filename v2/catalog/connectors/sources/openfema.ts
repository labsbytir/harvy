/** OpenFEMA disaster declarations (batch 1). Keyless JSON. */
import type { OpenApiSourceConfig } from "../openapi.ts";

export const openFema: OpenApiSourceConfig = {
  source_id: "src_openfema",
  source_scope_id: "scope-openfema",
  publisher: "U.S. FEMA OpenFEMA",
  target_url: "https://api.fema.gov/open/v2/DisasterDeclarations",
  method: "GET",
  default_params: { $top: 5, $orderby: "declarationDate desc" },
  max_records: 5,
  limit_keys: ["$top"],
  record_path: "DisasterDeclarations",
  fields: {
    id: "disasterNumber",
    title: "title",
    summary: "incidentType",
    time: "declarationDate",
  },
  coverage_note: "latest disaster declarations, newest first",
  sample_payload: {
    DisasterDeclarations: [
      {
        disasterNumber: 4001,
        title: "Sample Major Disaster",
        incidentType: "Severe Storms",
        declarationDate: "2026-10-20T00:00:00.000Z",
      },
      {
        disasterNumber: 4002,
        title: "Sample Emergency",
        incidentType: "Flooding",
        declarationDate: "2026-10-18T00:00:00.000Z",
      },
    ],
  },
};

export default openFema;
