import type { HarvyRun, Source } from "./api";
import { locatedCoordinates } from "./event-map-data.ts";

// Grid cell size for the regional concentration ranking. Concentration is
// relative to the located events on the loaded page; it is not a risk score.
export const REGION_CELL_DEGREES = 10;

export interface RegionRank {
  key: string;
  label: string;
  count: number;
  share: number; // 0..1 of located events
  latitude: number; // centroid of located events in the cell
  longitude: number;
}

export interface RegionRanking {
  regions: RegionRank[]; // sorted by count desc, then key
  located: number;
  total: number;
}

export function regionKey(latitude: number, longitude: number, cellDegrees = REGION_CELL_DEGREES): string {
  const latBand = Math.floor(latitude / cellDegrees) * cellDegrees;
  const lonBand = Math.floor(longitude / cellDegrees) * cellDegrees;
  return `${latBand}:${lonBand}`;
}

export function regionLabel(key: string, cellDegrees = REGION_CELL_DEGREES): string {
  const [latBand, lonBand] = key.split(":").map(Number);
  const lat = latBand + cellDegrees / 2;
  const lon = lonBand + cellDegrees / 2;
  return `${Math.abs(lat).toFixed(0)}°${lat >= 0 ? "N" : "S"} ${Math.abs(lon).toFixed(0)}°${lon >= 0 ? "E" : "W"}`;
}

export function rankRegions(events: readonly { latitude?: unknown; longitude?: unknown }[], cellDegrees = REGION_CELL_DEGREES): RegionRanking {
  const buckets = new Map<string, { count: number; latSum: number; lonSum: number }>();
  let located = 0;
  for (const event of events) {
    const coordinates = locatedCoordinates(event);
    if (!coordinates) continue;
    located += 1;
    const [longitude, latitude] = coordinates;
    const key = regionKey(latitude, longitude, cellDegrees);
    const bucket = buckets.get(key) ?? { count: 0, latSum: 0, lonSum: 0 };
    bucket.count += 1;
    bucket.latSum += latitude;
    bucket.lonSum += longitude;
    buckets.set(key, bucket);
  }
  const regions = [...buckets.entries()].map(([key, bucket]) => ({
    key,
    label: regionLabel(key, cellDegrees),
    count: bucket.count,
    share: located ? bucket.count / located : 0,
    latitude: bucket.latSum / bucket.count,
    longitude: bucket.lonSum / bucket.count,
  })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return { regions, located, total: events.length };
}

export function formatLocatedCount(ranking: RegionRanking): string {
  return `${ranking.located} of ${ranking.total} events located`;
}

export type FreshnessState = HarvyRun["status"] | "never";

export interface FreshnessEntry {
  sourceId: string;
  label: string;
  publisher: string;
  enabled: boolean;
  state: FreshnessState;
  lastRun: HarvyRun | null;
  ageMs: number | null;
}

export function latestRunForSource(runs: readonly HarvyRun[], sourceId: string): HarvyRun | null {
  let latest: HarvyRun | null = null;
  for (const run of runs) {
    if (run.source_id !== sourceId) continue;
    if (!latest || run.updated_at > latest.updated_at || (run.updated_at === latest.updated_at && run.created_at > latest.created_at)) latest = run;
  }
  return latest;
}

// Sources carry no expected-cadence field, so this reports the latest run's
// outcome and age only — never a fresh/stale verdict.
export function freshnessStrip(sources: readonly Source[], runs: readonly HarvyRun[], now = Date.now()): FreshnessEntry[] {
  return [...sources].map((source) => {
    const lastRun = latestRunForSource(runs, source.id);
    return {
      sourceId: source.id,
      label: source.label,
      publisher: source.publisher,
      enabled: source.enabled,
      state: (lastRun?.status ?? "never") as FreshnessState,
      lastRun,
      ageMs: lastRun ? Math.max(0, now - lastRun.updated_at) : null,
    };
  }).sort((a, b) => a.label.localeCompare(b.label));
}

export function formatAge(ageMs: number): string {
  const seconds = Math.max(0, Math.round(ageMs / 1000));
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
