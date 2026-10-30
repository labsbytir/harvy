/** NHTSA vehicle complaints (batch 1). Keyless JSON. */
import type { OpenApiSourceConfig } from "../openapi.ts";

export const nhtsa: OpenApiSourceConfig = {
  source_id: "src_nhtsa",
  source_scope_id: "scope-nhtsa",
  publisher: "U.S. NHTSA",
  target_url: "https://api.nhtsa.gov/complaints/complaintsByVehicle",
  method: "GET",
  default_params: { make: "honda", model: "civic", modelYear: 2022 },
  max_records: 10,
  limit_keys: [],
  record_path: "results",
  response_bounded: true,
  fields: {
    id: "odiNumber",
    title: ["components", "summary"],
    summary: "summary",
  },
  coverage_note: "single make/model/year complaint window; capped client-side",
  sample_payload: {
    count: 2,
    results: [
      {
        odiNumber: "11500001",
        components: "BRAKES",
        summary: "Sample brake complaint.",
      },
      {
        odiNumber: "11500002",
        components: "ENGINE",
        summary: "Sample engine complaint.",
      },
    ],
  },
};

export default nhtsa;
