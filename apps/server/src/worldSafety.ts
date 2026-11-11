/** Conservative flat-world exit checks. Detailed local contact still uses the client's Rapier scene. */
import { readFileSync } from "node:fs";
import { WORLD_SIZE, VEHICLE_SPECS, vehicleYaw, type VehicleSnapshot, type Vec3 } from "@kanpurverse/shared";
type Point = [number, number];
export type ExitBlocker = (p: Vec3, radius: number) => boolean;
export function polygonBlocksPoint(p: Vec3, radius: number, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i];
    if ((a[1] > p[2]) !== (b[1] > p[2]) && p[0] < (b[0] - a[0]) * (p[2] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[2] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
    if (Math.hypot(p[0] - a[0] - t * dx, p[2] - a[1] - t * dz) <= radius) return true;
  }
  return inside;
}
export function vehicleBlocksPoint(p: Vec3, radius: number, v: VehicleSnapshot) {
  const yaw = vehicleYaw(v.q), dx = p[0] - v.p[0], dz = p[2] - v.p[2];
  const x = dx * Math.cos(yaw) - dz * Math.sin(yaw), z = dx * Math.sin(yaw) + dz * Math.cos(yaw);
  const [w, , l] = VEHICLE_SPECS[v.kind].size;
  return Math.hypot(Math.max(0, Math.abs(x) - w / 2), Math.max(0, Math.abs(z) - l / 2)) <= radius;
}
export function createExitBlocker(polygons: Point[][]): ExitBlocker {
  // Coarse grid avoids scanning the city for each door request; preserve polygon boundaries, not AABB walls.
  const cells = new Map<string, Point[][]>(); const cell = 50;
  for (const poly of polygons) {
    const xs = poly.map(p => p[0]), zs = poly.map(p => p[1]);
    for (let x = Math.floor(Math.min(...xs) / cell); x <= Math.floor(Math.max(...xs) / cell); x++)
      for (let z = Math.floor(Math.min(...zs) / cell); z <= Math.floor(Math.max(...zs) / cell); z++) { const k = `${x},${z}`; const list = cells.get(k) ?? []; list.push(poly); cells.set(k, list); }
  }
  return (p, radius) => {
    if (!p.every(Number.isFinite) || Math.abs(p[0]) + radius > WORLD_SIZE / 2 || Math.abs(p[2]) + radius > WORLD_SIZE / 2 || p[1] < -0.2 || p[1] > 0.45) return true;
    const nearby = new Set<Point[]>();
    for (let x = Math.floor((p[0] - radius) / cell); x <= Math.floor((p[0] + radius) / cell); x++)
      for (let z = Math.floor((p[2] - radius) / cell); z <= Math.floor((p[2] + radius) / cell); z++) for (const poly of cells.get(`${x},${z}`) ?? []) nearby.add(poly);
    return [...nearby].some(poly => polygonBlocksPoint(p, radius, poly));
  };
}
export function loadExitBlocker(): ExitBlocker {
  const geo = JSON.parse(readFileSync(new URL("../../web/public/geo/kanpur.json", import.meta.url), "utf8")) as { buildings: { pts: Point[] }[]; water: { pts: Point[] }[] };
  return createExitBlocker([...geo.buildings, ...geo.water].map(b => b.pts).filter(p => p.length >= 3));
}
