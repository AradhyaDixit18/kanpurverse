import type { VehicleKind } from "./protocol";
export const VEHICLE_SPECS: Record<VehicleKind, { accel: number; max: number; turn: number; size: [number, number, number]; seats: number; wheelR: number }> = {
  hatchback: { accel: 10, max: 26, turn: 2.0, size: [1.75, 1.45, 3.8], seats: 2, wheelR: 0.32 }, sedan: { accel: 11, max: 32, turn: 1.8, size: [1.85, 1.4, 4.6], seats: 2, wheelR: 0.33 }, suv: { accel: 9.5, max: 30, turn: 1.7, size: [2.05, 1.85, 4.8], seats: 2, wheelR: 0.4 },
  bike: { accel: 13, max: 36, turn: 2.7, size: [0.7, 1.1, 2.1], seats: 2, wheelR: 0.32 }, scooter: { accel: 8, max: 20, turn: 2.9, size: [0.7, 1.1, 1.8], seats: 2, wheelR: 0.26 }, auto: { accel: 7, max: 17, turn: 2.5, size: [1.45, 1.75, 2.8], seats: 2, wheelR: 0.28 },
  erickshaw: { accel: 5, max: 11, turn: 2.6, size: [1.3, 1.8, 2.9], seats: 2, wheelR: 0.3 }, bus: { accel: 5, max: 22, turn: 1.2, size: [2.5, 3.1, 10.5], seats: 2, wheelR: 0.5 }, truck: { accel: 6, max: 24, turn: 1.3, size: [2.4, 2.8, 7.5], seats: 2, wheelR: 0.5 }, taxi: { accel: 10, max: 26, turn: 2.0, size: [1.75, 1.45, 3.9], seats: 2, wheelR: 0.32 },
};


export type VehicleSeat = "driver" | "passenger";
/** Seat roots are local to the chassis. Avatar hips in a seated pose are 0.42m above its root. */
export function vehicleSeatPose(kind: VehicleKind, seat: VehicleSeat): { p: [number, number, number]; scale: number } {
  const [w, h, l] = VEHICLE_SPECS[kind].size;
  const driver = seat === "driver";
  if (kind === "bike" || kind === "scooter") return { p: [0, 0.07, driver ? -l * 0.10 : -l * 0.35], scale: 0.85 };
  if (kind === "auto" || kind === "erickshaw") return { p: [0, -0.30, driver ? l * 0.21 : -l * 0.26], scale: 0.85 };
  if (kind === "bus") return { p: [(driver ? 1 : -1) * w * 0.25, -h / 2 + 0.85, driver ? l * 0.37 : l * 0.12], scale: 0.85 };
  if (kind === "truck") return { p: [(driver ? 1 : -1) * w * 0.25, -h / 2 + 0.5, l * 0.29], scale: 0.85 };
  return { p: [(driver ? 1 : -1) * w * 0.23, -h / 2 + 0.10, l * 0.08], scale: 0.82 };
}
export function vehicleYaw(q: readonly number[]) { return Math.atan2(2 * (q[3] * q[1] + q[0] * q[2]), 1 - 2 * (q[1] ** 2 + q[2] ** 2)); }
export function vehicleLocalToWorld(p: readonly number[], yaw: number, local: readonly number[]): [number, number, number] {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return [p[0] + local[0] * c + local[2] * s, p[1] + local[1], p[2] - local[0] * s + local[2] * c];
}
/** Both doors, then front and rear. The capsule clears the full chassis, including buses/trucks. */
export function vehicleExitCandidates(kind: VehicleKind, p: readonly number[], q: readonly number[], seat: VehicleSeat): [number, number, number][] {
  const [w, , l] = VEHICLE_SPECS[kind].size;
  const doorZ = vehicleSeatPose(kind, seat).p[2]; const side = seat === "driver" ? 1 : -1;
  const sideX = w / 2 + 0.35 + 0.35;
  const offsets = [[sideX * side, 0, doorZ], [-sideX * side, 0, doorZ], [0, 0, l / 2 + 0.7], [0, 0, -l / 2 - 0.7]];
  return offsets.map(local => { const pos = vehicleLocalToWorld(p, vehicleYaw(q), local); pos[1] = 0; return pos; });
}
