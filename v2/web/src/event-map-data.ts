import type { HarvyEvent } from "./api";

type LocatedEvent = Pick<HarvyEvent, "id" | "title" | "last_seen_at" | "evidence_count"> & {
  latitude?: unknown;
  longitude?: unknown;
};

export interface EventPoint {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { eventId: string; title: string; lastSeenAt: number; evidenceCount: number; weight: 1 };
}

export interface EventPoints {
  type: "FeatureCollection";
  features: EventPoint[];
}

export function toEventPoints(events: readonly LocatedEvent[]): EventPoints {
  return {
    type: "FeatureCollection",
    features: events.flatMap((event) => {
      const latitude = event.latitude;
      const longitude = event.longitude;
      if (typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
          typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return [];
      return [{
        type: "Feature",
        id: event.id,
        geometry: { type: "Point", coordinates: [longitude, latitude] },
        properties: { eventId: event.id, title: event.title, lastSeenAt: event.last_seen_at, evidenceCount: event.evidence_count, weight: 1 },
      }];
    }),
  };
}

export const syntheticRadarPreview: LocatedEvent[] = [
  { id: "preview-1", title: "Synthetic event A", last_seen_at: 0, evidence_count: 1, longitude: -98.4, latitude: 39.2 },
  { id: "preview-2", title: "Synthetic event B", last_seen_at: 0, evidence_count: 1, longitude: -98.1, latitude: 39.4 },
  { id: "preview-3", title: "Synthetic event C", last_seen_at: 0, evidence_count: 1, longitude: -98.0, latitude: 38.9 },
  { id: "preview-4", title: "Synthetic event D", last_seen_at: 0, evidence_count: 1, longitude: -97.7, latitude: 39.1 },
  { id: "preview-5", title: "Synthetic event E", last_seen_at: 0, evidence_count: 1, longitude: -74.1, latitude: 40.7 },
  { id: "preview-6", title: "Synthetic event F", last_seen_at: 0, evidence_count: 1, longitude: -123.1, latitude: 49.3 },
];
