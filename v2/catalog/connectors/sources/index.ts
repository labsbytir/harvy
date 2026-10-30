/** Batch 1 registry: all verified keyless JSON APIs from the ledger. */
import { cdcPlaces } from "./cdc-places.ts";
import { cfpb } from "./cfpb.ts";
import { cms } from "./cms.ts";
import { federalRegister } from "./federal-register.ts";
import { nhtsa } from "./nhtsa.ts";
import { openFda } from "./openfda.ts";
import { openFema } from "./openfema.ts";
import { secEdgar } from "./sec-edgar.ts";
import { usaspending } from "./usaspending.ts";
import { usgs } from "./usgs.ts";
import { weatherGov } from "./weather-gov.ts";
import type { OpenApiSourceConfig } from "../openapi.ts";

export const BATCH1_SOURCES: OpenApiSourceConfig[] = [
  federalRegister,
  secEdgar,
  cdcPlaces,
  openFda,
  weatherGov,
  usaspending,
  usgs,
  openFema,
  cms,
  nhtsa,
  cfpb,
];

export default BATCH1_SOURCES;
