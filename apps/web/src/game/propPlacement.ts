/**
 * Placement rules for generated roadside props (stalls, carts, poles) and street animals. Pure and unit-tested
 * (tests/propPlacement.test.ts). Props are generated beside one road segment; without these checks a stall beside
 * road A can land in road B's lane at a junction, or on top of a parked story vehicle (the fruit cart that sat
 * inside the red hatchback at Cafe Chowk).
 */
import { VEHICLE_SPAWNS, VEHICLE_SPECS, NPCS, PETROL_PUMP } from "@kanpurverse/shared";

export interface RoadLike { a: [number, number]; b: [number, number]; w: number }
export function distToRoad(x: number, z: number, r: RoadLike) {
  const dx = r.b[0] - r.a[0], dz = r.b[1] - r.a[1]; const l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - r.a[0]) * dx + (z - r.a[1]) * dz) / l2)); return Math.hypot(x - r.a[0] - t * dx, z - r.a[1] - t * dz);
}
/** No part of a prop of radius `radius` may reach into any carriageway (plus a small kerb margin). */
export function clearOfCarriageways(x: number, z: number, radius: number, roads: readonly RoadLike[], margin = 0.3) {
  for (const r of roads) if (distToRoad(x, z, r) < r.w / 2 + radius + margin) return false; return true;
}
/** Distance from the edge of the nearest carriageway (negative when on the road). Infinity when no road is near. */
export function kerbDistance(x: number, z: number, roads: readonly RoadLike[]) { let d = Infinity; for (const r of roads) d = Math.min(d, distToRoad(x, z, r) - r.w / 2); return d; }
const vehicleRadius = (kind: keyof typeof VEHICLE_SPECS) => { const [w, , l] = VEHICLE_SPECS[kind].size; return Math.hypot(w / 2, l / 2); };
/** Parked story vehicles keep a clear apron so nothing spawns inside them or blocks their doors. */
export function clearOfParkedVehicles(x: number, z: number, radius: number, gap = 0.6) {
  for (const v of VEHICLE_SPAWNS) if (Math.hypot(v.p[0] - x, v.p[1] - z) < vehicleRadius(v.kind) + radius + gap) return false; return true;
}
/** Standing characters (shopkeepers, the chai stall, the auto stand) are not buried in props either. */
export function clearOfStandingPeople(x: number, z: number, radius: number, gap = 1) {
  for (const n of NPCS) if (n.speed === 0 && Math.hypot(n.path[0][0] - x, n.path[0][1] - z) < radius + gap) return false; return true;
}
/** Built sites (the fuel station forecourt) take no generated props or animals. */
export function clearOfReserved(x: number, z: number, radius: number) { return Math.hypot(PETROL_PUMP.x - x, PETROL_PUMP.z - z) > PETROL_PUMP.r + radius; }
export function propSpotClear(x: number, z: number, radius: number, nearRoads: readonly RoadLike[]) {
  return clearOfCarriageways(x, z, radius, nearRoads) && clearOfParkedVehicles(x, z, radius) && clearOfStandingPeople(x, z, radius) && clearOfReserved(x, z, radius);
}
/** Footprint radii (m) used for the checks above. */
export const PROP_RADIUS = { stall: 1.2, pole: 0.2 } as const;

/**
 * The utility poles Props.tsx actually built, published so other systems (crows perch on the cross-arms) use real
 * poles rather than regenerating a list that could disagree with what is drawn. `version` bumps on every rebuild.
 */
export const streetPoles: { list: { p: [number, number]; rot: number }[]; version: number } = { list: [], version: 0 };
