/**
 * Cinematic capture maths: camera shots and a road-following autopilot. Pure and unit-tested (tests/cinematics.test.ts).
 *
 * These are capture-only settings. They never touch the live chase camera (`camYaw` in input.ts) or the handling
 * model: the rig in qa/CinematicRig.tsx applies a shot on top of the gameplay camera only while a shot is selected
 * on a page opened with `?capture=1`, and the autopilot drives through the same analogue input path as the touch
 * joystick. Motion blur for footage is added in the edit by blending 60 fps capture down to 30 fps, so none of it
 * can affect how the game plays.
 */
export interface Subject { x: number; y: number; z: number; yaw: number; w: number; h: number; l: number; wheelBase: number; wheelR: number }
export interface CamFrame { pos: [number, number, number]; look: [number, number, number]; fov: number }
export const SHOTS = ["low_wheel", "chase_wide", "front_quarter", "side_track", "crane", "orbit", "street_static", "ground_static"] as const;
export type ShotName = typeof SHOTS[number];
export interface Shot { name: ShotName; /** +1 films from the vehicle's left, −1 from its right */ side: 1 | -1; /** subject pose when the shot started (fixed cameras stand relative to this) */ anchor: Subject }

/** Vehicle-local point (x to the vehicle's left, y up from the body centre, z forward) in world space. */
export function at(s: Subject, lx: number, ly: number, lz: number): [number, number, number] { const c = Math.cos(s.yaw), n = Math.sin(s.yaw); return [s.x + lx * c + lz * n, s.y + ly, s.z - lx * n + lz * c]; }
const ease = (k: number) => { const u = Math.min(1, Math.max(0, k)); return u * u * (3 - 2 * u); };
const mix = (a: [number, number, number], b: [number, number, number], k: number): [number, number, number] => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** Camera position, look-at point and field of view for a shot `t` seconds after it started. */
export function shotFrame(shot: Shot, s: Subject, t: number): CamFrame {
  const g = -s.h / 2, d = shot.side, A = shot.anchor;
  switch (shot.name) {
    case "low_wheel": return { pos: at(s, d * (s.w / 2 + 1.9), g + 0.32, s.wheelBase / 2 + 0.9), look: at(s, d * (s.w / 2 - 0.1), g + s.wheelR, s.wheelBase / 2), fov: 38 }; // tyre rotation, steering and suspension over the road surface
    case "chase_wide": return { pos: at(s, d * 0.6, s.h / 2 + 2.2, -(s.l / 2 + 7.5)), look: at(s, 0, 0.3, 4), fov: 52 };
    case "front_quarter": return { pos: at(s, d * 2.6, g + 1.15, s.l / 2 + 5.2), look: at(s, 0, 0, 0.3), fov: 42 };
    case "side_track": return { pos: at(s, d * 6.5, g + 1.3, 0.4), look: at(s, 0, 0.05, 0.4), fov: 40 };
    case "crane": return { pos: mix(at(s, d * 3, s.h / 2 + 9, -(s.l / 2 + 12)), at(s, d * 1.2, s.h / 2 + 1.4, -(s.l / 2 + 5)), ease(t / 6)), look: at(s, 0, 0.2, 2), fov: 50 };
    case "orbit": { const a = s.yaw + Math.PI + t * 0.35 * d; return { pos: [s.x + Math.sin(a) * 8, s.y + g + 2.4, s.z + Math.cos(a) * 8], look: [s.x, s.y, s.z], fov: 45 }; }
    case "street_static": return { pos: at(A, d * 4.2, -A.h / 2 + 5.5, 26), look: [s.x, s.y, s.z], fov: 34 }; // long lens down the street: storefronts, traffic and wildlife in frame as the car comes through
    case "ground_static": return { pos: at(A, d * 2.6, -A.h / 2 + 0.22, 18), look: [s.x, s.y + g + 0.6, s.z], fov: 30 };
  }
}

// ───────────────────────── autopilot ─────────────────────────
const wrap = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
export interface Pursuit { /** analogue steering, positive = right (same sign as the D key) */ steer: number; /** positive accelerates, negative brakes */ throttle: number; done: boolean; index: number; crossTrack: number }
/**
 * Pure-pursuit steering along a polyline with speed control. `index` is the segment the vehicle was last on (pass the
 * returned value back in). Heading follows the game's convention: forward = (sin yaw, cos yaw), and steering right
 * lowers yaw.
 */
export function pursue(pts: readonly [number, number][], x: number, z: number, yaw: number, speed: number, targetSpeed: number, index = 0): Pursuit {
  if (pts.length < 2) return { steer: 0, throttle: speed > 0.3 ? -1 : 0, done: true, index: 0, crossTrack: 0 };
  // closest point on the path, searching forward from the last segment so the car cannot snap back at a crossing
  let bi = index, bt = 0, bd = Infinity;
  for (let i = Math.max(0, index); i < Math.min(pts.length - 1, index + 4); i++) { const ax = pts[i][0], az = pts[i][1], dx = pts[i + 1][0] - ax, dz = pts[i + 1][1] - az; const l2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)); const d = Math.hypot(x - ax - t * dx, z - az - t * dz); if (d < bd - 1e-9) { bd = d; bi = i; bt = t; } }
  // walk the look-ahead distance along the path from there
  let ahead = Math.min(16, Math.max(5, 4 + speed * 0.6)), i = bi, t = bt, tx = pts[pts.length - 1][0], tz = pts[pts.length - 1][1], remaining = 0;
  for (let k = bi; k < pts.length - 1; k++) remaining += Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]) * (k === bi ? 1 - bt : 1);
  while (i < pts.length - 1) { const len = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]), left = len * (1 - t); if (ahead <= left) { const u = t + ahead / (len || 1); tx = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u; tz = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u; break; } ahead -= left; i++; t = 0; }
  const err = wrap(Math.atan2(tx - x, tz - z) - yaw); const steer = Math.max(-1, Math.min(1, -err * 2.2));
  // End of the route: brake at a comfortable 6 m/s² (throttle −0.6 on a 10 m/s² service brake) and report done once stopped.
  // Below 0.6 m/s the pedal is released instead, because a negative throttle at rest selects reverse.
  const stopping = speed * speed / (2 * 6);
  if (remaining < stopping + 1.5) return { steer, throttle: speed > 0.6 ? -0.6 : 0, done: speed <= 0.6, index: bi, crossTrack: bd };
  const want = targetSpeed * Math.max(0.35, Math.min(1, 1 - Math.abs(err) * 0.9));
  return { steer, throttle: Math.max(speed > 0.6 ? -1 : 0, Math.min(1, (want - speed) * 0.5)), done: false, index: bi, crossTrack: bd };
}
