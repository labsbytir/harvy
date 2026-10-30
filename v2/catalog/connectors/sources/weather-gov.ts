/** National Weather Service active alerts, GeoJSON (batch 1). Keyless; User-Agent required. */
import type { OpenApiSourceConfig } from "../openapi.ts";

export const weatherGov: OpenApiSourceConfig = {
  source_id: "src_weather-gov",
  source_scope_id: "scope-weather-gov",
  publisher: "U.S. National Weather Service",
  target_url: "https://api.weather.gov/alerts/active",
  method: "GET",
  headers: {
    Accept: "application/geo+json",
    "User-Agent": "Harvy research (https://example.org/contact)",
  },
  default_params: { limit: 5 },
  max_records: 5,
  limit_keys: ["limit"],
  record_path: "features",
  fields: {
    id: "properties.id",
    title: ["properties.headline", "properties.event"],
    summary: "properties.description",
    time: "properties.sent",
    url: "properties.id",
  },
  coverage_note: "currently active alerts only; history via NCEI GHCN",
  sample_payload: {
    features: [
      {
        properties: {
          id: "https://api.weather.gov/alerts/NWS-IDP-PROD-1",
          event: "Heat Advisory",
          headline: "Heat Advisory issued for the sample area",
          description: "High temperatures expected.",
          sent: "2026-10-29T12:00:00-04:00",
        },
      },
      {
        properties: {
          id: "https://api.weather.gov/alerts/NWS-IDP-PROD-2",
          event: "Flood Watch",
          headline: "Flood Watch issued for the sample area",
          description: "Heavy rain possible.",
          sent: "2026-10-29T10:00:00-04:00",
        },
      },
    ],
  },
};

export default weatherGov;
