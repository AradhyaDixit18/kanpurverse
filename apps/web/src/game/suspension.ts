/**
 * Visual suspension. The chassis moves on its springs (pitch under throttle/brake, roll in corners, lean for
 * two-wheelers) while every wheel stays where the road is: wheel centres remain on their axle lines, tyres neither
 * float nor sink, and the gap in the wheel arch is what changes. Pure maths, unit-tested in tests/suspension.test.ts.
 *
 * Vehicle frame: +z forward, +y up, so the right-hand side is −x. Positive roll leans the roof to the right.
 */
import * as THREE from "three";

export type SuspensionClass = "car" | "two" | "three" | "heavy" | "pedal";
export interface BodyPose { pitch: number; roll: number; x: number; y: number }

/**
 * Attitude limits. A car's arch sits 6 cm above the tyre (vehicleModels: `ar = R + 0.06`), so pitch and roll are
 * capped to keep the arch from closing onto a planted tyre: 0.028 rad × ~1.25 m half wheelbase ≈ 3.5 cm and
 * 0.032 rad × ~0.75 m half track ≈ 2.4 cm, 5.9 cm when both peak together.
 */
export const SUSPENSION = { pitchMax: 0.028, rollMax: 0.032, leanMax: 0.55, bikePitchMax: 0.03, archClearance: 0.06 } as const;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Target chassis pitch and roll (rad) from the last simulated longitudinal and lateral acceleration (m/s²). */
export function attitudeTarget(cls: SuspensionClass, accel: number, lat: number): { pitch: number; roll: number } {
  const a = clamp(accel, -12, 12), l = clamp(lat, -12, 12);
  if (cls === "two") return { pitch: clamp(-a * 0.003, -SUSPENSION.bikePitchMax, SUSPENSION.bikePitchMax), roll: clamp(l / 9.81, -SUSPENSION.leanMax, SUSPENSION.leanMax) };
  const k = cls === "heavy" ? 0.6 : 1;
  return { pitch: clamp(-a * 0.0045 * k, -SUSPENSION.pitchMax, SUSPENSION.pitchMax), roll: clamp(-l * 0.006 * k, -SUSPENSION.rollMax, SUSPENSION.rollMax) };
}

/**
 * Chassis pose for a given pitch and roll. A two-wheeler leans about the line its tyres touch the road on
 * (`halfHeight` below the body origin), not about its centre, so the contact patch does not swing sideways.
 */
export function bodyPose(cls: SuspensionClass, pitch: number, roll: number, halfHeight: number): BodyPose {
  if (cls !== "two") return { pitch, roll, x: 0, y: 0 };
  const gy = -halfHeight; return { pitch, roll, x: gy * Math.sin(roll), y: gy * (1 - Math.cos(roll)) };
}

const _b = new THREE.Matrix4(), _d = new THREE.Matrix4(), _r = new THREE.Matrix4(), _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
/** Chassis matrix in the vehicle frame: translate, then pitch about x, then roll about z (three.js XYZ order). */
export function bodyMatrix(out: THREE.Matrix4, pose: BodyPose) { return out.compose(_p.set(pose.x, pose.y, 0), _q.setFromEuler(_e.set(pose.pitch, 0, pose.roll, "XYZ")), _one); }

/**
 * Local matrix for a wheel anchor that is a descendant of the (tilting) chassis group.
 * `rest` is the anchor's matrix in the vehicle frame with the chassis level; `staticInv` undoes any fixed groups
 * between the chassis and the anchor. `leans` is true for two-wheelers, whose wheels lean with the frame but still
 * ignore pitch, so the front tyre does not dig into the road under braking. `steerYaw` is the three.js y rotation.
 */
export function wheelLocalMatrix(out: THREE.Matrix4, pose: BodyPose, leans: boolean, rest: THREE.Matrix4, staticInv: THREE.Matrix4, steerYaw: number, travel = 0) {
  if (leans) _d.compose(_p.set(pose.x, pose.y, 0), _q.setFromEuler(_e.set(0, 0, pose.roll, "XYZ")), _one); else _d.identity();
  _d.multiply(rest);
  if (travel) _d.multiply(_r.makeTranslation(0, travel, 0));
  if (steerYaw) _d.multiply(_r.makeRotationY(steerYaw));
  bodyMatrix(_b, pose).invert();
  return out.copy(staticInv).multiply(_b).multiply(_d);
}

/**
 * Scale pitch and roll down together so no arch closes more than `limit` onto a planted tyre. `axle` is the furthest
 * axle from the body centre and `halfTrack` the furthest wheel from the centre line (both read from the model).
 */
export function limitToArch(pitch: number, roll: number, axle: number, halfTrack: number, limit = 0.05): { pitch: number; roll: number } {
  const c = archClosure(pitch, roll, axle, halfTrack); if (c <= limit || c === 0) return { pitch, roll }; const k = limit / c; return { pitch: pitch * k, roll: roll * k };
}

/** Largest amount (m) any wheel arch closes onto its tyre for this attitude; must stay under SUSPENSION.archClearance. */
export function archClosure(pitch: number, roll: number, halfWheelBase: number, halfTrack: number) { return Math.abs(Math.sin(pitch)) * halfWheelBase + Math.abs(Math.sin(roll)) * halfTrack; }
