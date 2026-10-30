/** USGS water services instant values, WaterML JSON (batch 1). Keyless. */
import type { OpenApiSourceConfig } from "../openapi.ts";

export const usgs: OpenApiSourceConfig = {
  source_id: "src_usgs",
  source_scope_id: "scope-usgs",
  publisher: "U.S. USGS Water Services",
  target_url: "https://waterservices.usgs.gov/nwis/iv/",
  method: "GET",
  default_params: { format: "json", sites: "01646500", parameterCd: "00060", period: "PT2H" },
  max_records: 10,
  limit_keys: [],
  record_path: "value.timeSeries",
  transpose: undefined,
  response_bounded: true,
  fields: {
    id: ["name", "sourceInfo.siteCode.0.value"],
    title: ["variable.variableDescription", "name"],
    summary: ["variable.variableDescription", "values.0.value.0.value"],
    time: "values.0.value.0.dateTime",
  },
  coverage_note: "single gage, 2-hour window; bounded client-side from one WaterML response",
  sample_payload: {
    value: {
      timeSeries: [
        {
          name: "USGS:01646500:00060",
          sourceInfo: { siteCode: [{ value: "01646500" }] },
          variable: { variableDescription: "Discharge, cubic feet per second" },
          values: [{ value: [{ value: "1234", dateTime: "2026-10-29T12:00:00.000-04:00" }] }],
        },
      ],
    },
  },
};

export default usgs;
