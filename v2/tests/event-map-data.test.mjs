import assert from "node:assert/strict";
import test from "node:test";
import { toEventPoints } from "../web/src/event-map-data.ts";

const event = (id, location = {}) => ({
  id, title: id, last_seen_at: 1, evidence_count: 1,
  ...location,
});

test("radar points require explicit finite in-range latitude and longitude", () => {
  const result = toEventPoints([
    event("valid", { latitude: 40, longitude: -75 }),
    event("unknown"),
    event("string", { latitude: "40", longitude: "-75" }),
    event("bad-lat", { latitude: 91, longitude: 0 }),
    event("bad-lon", { latitude: 0, longitude: -181 }),
    event("not-finite", { latitude: Number.NaN, longitude: 0 }),
  ]);
  assert.deepEqual(result.features.map((feature) => feature.id), ["valid"]);
  assert.deepEqual(result.features[0].geometry.coordinates, [-75, 40]);
  assert.equal(result.features[0].properties.weight, 1);
});

test("equatorial zero coordinates are accepted only when explicitly present", () => {
  assert.deepEqual(toEventPoints([event("explicit-origin", { latitude: 0, longitude: 0 })]).features[0].geometry.coordinates, [0, 0]);
  assert.equal(toEventPoints([event("unknown")]).features.length, 0);
});
