/**
 * Vehicle chase-camera boom. Pure and unit-tested (tests/chaseCamera.test.ts).
 *
 * On foot the camera snaps in when a wall is behind the player. Behind a moving vehicle that rule made the view pop:
 * every pole, sign or stall the car passed crossed the camera ray for a frame or two and the camera jumped to it and
 * drifted back. The boom below never teleports. It shortens quickly but continuously for a real obstruction, eases
 * back out slowly, and while the vehicle is moving it ignores obstructions that last less than BOOM.debounce seconds.
 */
import { cameraClampDistance } from "./characterPhysics";

export const BOOM = { inRate: 14, outRate: 2.5, debounce: 0.12, debounceSpeed: 4 } as const;
export interface Boom { dist: number; blockedFor: number }
export const newBoom = (dist = 6): Boom => ({ dist, blockedFor: 0 });

/**
 * @param want  unobstructed boom length (m)
 * @param toi   distance to the first obstruction along the boom, or null when clear
 * @param speed vehicle speed (m/s, absolute)
 */
export function stepBoom(b: Boom, want: number, toi: number | null, dt: number, speed: number): Boom {
  const hit = toi !== null && toi < want;
  const blockedFor = hit ? b.blockedFor + dt : 0;
  const passing = hit && speed > BOOM.debounceSpeed && blockedFor < BOOM.debounce;
  const target = hit && !passing ? Math.min(want, cameraClampDistance(toi!)) : want;
  const rate = target < b.dist ? BOOM.inRate : BOOM.outRate;
  const dist = b.dist + (target - b.dist) * (1 - Math.exp(-Math.min(dt, 0.1) * rate));
  return { dist: Math.min(Math.max(dist, 0.3), Math.max(want, 0.3)), blockedFor };
}

/** Use the drawn (render-interpolated) vehicle position when it is fresh; otherwise the last physics position. */
export function chaseTarget<T extends { x: number; y: number; z: number }>(physics: T, drawn: { id: string; x: number; y: number; z: number; at: number }, vehicleId: string | null | undefined, now: number): { x: number; y: number; z: number } {
  return vehicleId && drawn.id === vehicleId && now - drawn.at < 250 ? drawn : physics;
}
