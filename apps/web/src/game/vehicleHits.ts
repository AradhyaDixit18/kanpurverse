/**
 * What happens when the player's vehicle meets something soft: a person or a small tree. Pure geometry plus a small state
 * machine, with no three.js and no React, so it is unit-tested (tests/vehicleHits.test.ts).
 *
 * People are not physical obstacles for vehicles (their colliders sit in their own collision group); instead each person
 * reads the car's footprint every step. A car aimed at someone makes them step aside; a car that reaches them knocks them
 * down: they are thrown along the car's path, fall, lie still for a moment, and get up. The car loses some speed.
 */
import { VEHICLE_SPECS } from "@kanpurverse/shared";
import { drivenRender, vehicleTelemetry, playerYaw } from "./refs";

/** Collision group for people on foot. Vehicles filter it out, so a car is never stopped dead by a person. */
export const PEOPLE_GROUP = 5;

export interface CarPose { x: number; z: number; yaw: number; speed: number; halfW: number; halfL: number }

/** The player's vehicle, if one is being driven right now. Forward is (sin yaw, cos yaw), matching driving.ts. */
export function drivenCar(now = typeof performance !== "undefined" ? performance.now() : 0): CarPose | null {
  if (!vehicleTelemetry.kind || now - drivenRender.at > 400) return null;
  const spec = VEHICLE_SPECS[vehicleTelemetry.kind as keyof typeof VEHICLE_SPECS]; if (!spec) return null;
  return { x: drivenRender.x, z: drivenRender.z, yaw: playerYaw.v, speed: vehicleTelemetry.speed * (vehicleTelemetry.reverse ? -1 : 1), halfW: spec.size[0] / 2, halfL: spec.size[2] / 2 };
}

export interface Relation { f: number; l: number; hit: boolean; threat: boolean; side: 1 | -1 }
/** Where point (x, z) sits relative to the car: `f` metres ahead, `l` metres to the right. */
export function relation(x: number, z: number, c: CarPose, radius = 0.3): Relation {
  const dx = x - c.x, dz = z - c.z, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
  const f = dx * fx + dz * fz, l = dx * fz - dz * fx, sp = Math.abs(c.speed), dir = c.speed >= 0 ? 1 : -1, ahead = f * dir;
  const hit = sp > 1.5 && Math.abs(l) < c.halfW + radius && Math.abs(f) < c.halfL + radius;
  const threat = !hit && sp > 2.5 && ahead > c.halfL - 0.2 && ahead < c.halfL + 1.5 + sp * 1.1 && Math.abs(l) < c.halfW + 1.4;
  return { f, l, hit, threat, side: l >= 0 ? 1 : -1 };
}

/** Direction a struck person is thrown: mostly along the car's travel, partly out to the side they were on. */
export function throwDir(rel: Relation, c: CarPose): [number, number] {
  const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw), dir = c.speed >= 0 ? 1 : -1;
  const x = fx * dir * 0.8 + rx * rel.side * 0.6, z = fz * dir * 0.8 + rz * rel.side * 0.6, n = Math.hypot(x, z) || 1; return [x / n, z / n];
}

export interface ReactionOut { dx: number; dz: number; lie: number; facing: number | null; struck: boolean; busy: boolean }
const FALL = 0.25, DOWN = 2.4, UP = 0.6;

/** Per-person reaction state. Call `step` every physics tick with the person's position. */
export class HitReaction {
  private knock: { t: number; dir: [number, number]; v: number } | null = null;
  private dodged = 0;
  t = 0;
  step(x: number, z: number, dt: number, car: CarPose | null): ReactionOut {
    this.t += dt; const out: ReactionOut = { dx: 0, dz: 0, lie: 0, facing: null, struck: false, busy: false };
    if (this.knock) {
      const e = this.t - this.knock.t, v = this.knock.v * Math.exp(-e * 4);
      out.dx = this.knock.dir[0] * v * dt; out.dz = this.knock.dir[1] * v * dt; out.busy = true;
      out.lie = e < FALL ? e / FALL : e < DOWN ? 1 : e < DOWN + UP ? 1 - (e - DOWN) / UP : 0;
      out.facing = Math.atan2(-this.knock.dir[0], -this.knock.dir[1]); // faces where the car came from, so they fall away from it
      if (e >= DOWN + UP) { this.knock = null; this.dodged = 0; }
      return out;
    }
    if (!car) { this.dodged = Math.max(0, this.dodged - dt * 0.5); return out; }
    const rel = relation(x, z, car);
    if (rel.hit) { this.knock = { t: this.t, dir: throwDir(rel, car), v: Math.min(9, Math.max(2.5, Math.abs(car.speed) * 0.55)) }; out.struck = true; out.busy = true; return out; }
    if (rel.threat && this.dodged < 3) { const rx = Math.cos(car.yaw), rz = -Math.sin(car.yaw), s = 3.4 * dt; out.dx = rx * rel.side * s; out.dz = rz * rel.side * s; this.dodged += s; out.busy = true; out.facing = Math.atan2(rx * rel.side, rz * rel.side); }
    else if (!rel.threat) this.dodged = Math.max(0, this.dodged - dt * 0.5); // the budget only recovers once the car is no longer coming
    return out;
  }
  get down() { return !!this.knock; }
}

/** One-shot nudge to the driven vehicle's speed (1 = none). Vehicles.tsx consumes and resets it each step. */
export const vehicleImpulse = { scale: 1, at: 0 };
export function slowCar(k: number) { vehicleImpulse.scale = Math.min(vehicleImpulse.scale, k); }
