/**
 * Vehicle handling model. Pure and deterministic: metres, seconds, radians, advanced once per fixed physics tick.
 * Input handling lives in Vehicles.tsx/input.ts; this file only turns throttle/brake/steer into motion.
 *
 * Longitudinal: torque that fades towards top speed, service brake, separate reverse gear, rolling resistance and
 * aerodynamic drag. Lateral: kinematic bicycle model (yaw rate = v·tan(δ)/wheelbase) with speed-sensitive steering,
 * a tyre-grip ceiling on lateral acceleration (understeer instead of impossible turns), mass-dependent yaw response
 * and a handbrake that lowers rear grip so the tail can slide (slip decays back with grip).
 */
export interface Handling {
  accel: number; max: number; turn: number;
  size?: [number, number, number];
  /** Metres between axles. Defaults to ~60% of body length. */
  wheelBase?: number;
  /** Maximum road-wheel angle (rad). */
  steerLock?: number;
  /** Service-brake deceleration (m/s²). */
  brake?: number;
  /** Peak lateral grip in g. */
  grip?: number;
  /** Aerodynamic drag coefficient per (m/s)². */
  drag?: number;
  /** Yaw response rate (1/s): light vehicles react fast, buses slowly. */
  response?: number;
  /** Speed (m/s) at which steering authority has halved. */
  steerFade?: number;
}
export interface DriveState {
  speed: number; steer: number; yaw: number;
  /** Lateral (sideways) velocity in m/s; positive is towards the outside of a right-hand turn. */
  slip?: number; yawRate?: number;
  /** Last longitudinal and lateral acceleration, for suspension pitch/roll and audio. */
  accel?: number; lat?: number;
}
export interface DriveInput { throttle: number; steer: number; brake: boolean; handbrake?: boolean; /** 1 on asphalt, ~0.7 on grass/dirt. */ surface?: number; /** Two-wheelers never slide sideways. */ noSlide?: boolean }

const G = 9.81;
export function yawFromQuaternion(q: readonly number[]) {
  return Math.atan2(2 * (q[3] * q[1] + q[0] * q[2]), 1 - 2 * (q[1] ** 2 + q[2] ** 2));
}
const approach = (v: number, target: number, rate: number) => v + Math.sign(target - v) * Math.min(Math.abs(target - v), rate);

export function stepDriving(state: DriveState, spec: Handling, input: DriveInput, actualSpeed: number, dt: number): DriveState {
  // Use the solver's result each tick: collisions cannot leave hidden commanded momentum.
  let speed = actualSpeed;
  const reverseMax = spec.max * 0.35;
  const brakeDecel = Math.max(10, spec.brake ?? 10);
  const drag = spec.drag ?? 0.0016;
  const handbrake = !!input.handbrake;
  const before = speed;

  if (input.brake) speed = approach(speed, 0, brakeDecel * dt);
  else if (input.throttle > 0 && speed < -0.5) speed = approach(speed, 0, brakeDecel * dt);              // S→W while reversing: brake first
  else if (input.throttle < 0 && speed > 0.5) speed = approach(speed, 0, brakeDecel * input.throttle * -1 * dt); // S while rolling forward: brake
  else if (input.throttle > 0) {
    const torque = spec.accel * input.throttle * Math.max(0.08, 1 - Math.pow(Math.max(0, speed) / spec.max, 1.8));
    speed = Math.min(spec.max, speed + torque * dt - drag * speed * speed * dt);
  } else if (input.throttle < 0) {
    speed = Math.max(-reverseMax, speed - spec.accel * 0.6 * -input.throttle * dt);
  } else {
    speed = approach(speed, 0, (0.55 + drag * speed * speed + Math.abs(speed) * 0.025) * dt);           // coasting
  }
  if (handbrake) speed = approach(speed, 0, 5.5 * dt);
  speed = Math.max(-reverseMax, Math.min(spec.max, speed));
  if (Math.abs(speed) < 0.03 && input.throttle === 0) speed = 0;

  // Steering wheel: heavy vehicles turn the wheel more slowly; always self-centres.
  const response = spec.response ?? 8;
  const steer = state.steer + (input.steer - state.steer) * (1 - Math.exp(-dt * Math.min(10, response + 2)));

  const len = spec.size?.[2] ?? 4;
  const wheelBase = spec.wheelBase ?? len * 0.6;
  const lock = spec.steerLock ?? 0.5;
  const fade = spec.steerFade ?? 18;
  const speedFactor = Math.max(0.22, 1 / (1 + (speed / fade) ** 2));
  const delta = steer * lock * speedFactor;
  let target = speed * Math.tan(delta) / wheelBase;                                                       // kinematic yaw rate
  const surface = input.surface ?? 1;
  const baseGrip = (spec.grip ?? 0.9) * surface;
  const grip = baseGrip * (handbrake ? 1.9 : 1);
  const maxYaw = grip * G / Math.max(Math.abs(speed), 1);
  // Rear axle slide (oversteer) feeds extra rotation into the turn; counter-steer (wheel against the slide) recovers.
  let slip = state.slip ?? 0;
  const counter = Math.sign(steer) !== 0 && Math.sign(steer) === -Math.sign(slip) && Math.abs(steer) > 0.15;
  target = Math.max(-maxYaw, Math.min(maxYaw, target)) + (input.noSlide ? 0 : slip * 0.32 / Math.max(1, wheelBase));
  const prevRate = state.yawRate ?? 0;
  const yawRate = prevRate + (target - prevRate) * (1 - Math.exp(-dt * response));
  const yaw = state.yaw - yawRate * dt;

  // Lateral demand vs rear grip: handbrake, power-on at the limit or a slippery surface break the rear loose.
  const lat = speed * yawRate, demand = Math.abs(lat) / G, rearGrip = baseGrip * (handbrake ? 0.45 : input.throttle > 0.6 && Math.abs(speed) > 9 ? 0.82 : 1) * (surface < 0.95 ? 0.7 : 1); // loose surfaces let the rear go first
  if (!input.noSlide && Math.abs(speed) > 4) {
    if (handbrake) slip += Math.sign(yawRate * speed) * Math.min(6, Math.abs(lat) * 0.5) * dt;
    else if (demand > rearGrip) slip += Math.sign(yawRate * speed) * (demand - rearGrip) * G * 0.9 * dt;
  }
  const recovery = handbrake ? 1.4 : counter ? 9 * baseGrip : demand > rearGrip ? 1.2 : 7 * baseGrip;
  slip *= Math.exp(-dt * recovery);
  slip = Math.max(-9, Math.min(9, slip));
  if (Math.abs(slip) < 0.01 || input.noSlide) slip = 0;

  return { speed, steer, yaw, slip, yawRate, accel: (speed - before) / dt, lat: speed * yawRate };
}

/** Chassis, rendered heading and transmitted orientation must share this same yaw. */
export function applyVehicleMotion(body: import("@dimforge/rapier3d-compat").RigidBody, next: DriveState) {
  const s = next.slip ?? 0, sy = Math.sin(next.yaw), cy = Math.cos(next.yaw);
  body.setLinvel({ x: sy * next.speed + cy * s, y: body.linvel().y, z: cy * next.speed - sy * s }, true);
  body.setRotation({ x: 0, y: Math.sin(next.yaw / 2), z: 0, w: Math.cos(next.yaw / 2) }, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

/** Turning radius (m) at walking pace with full lock: used by tests and the vehicle info card. */
export function turningRadius(spec: Handling) { const len = spec.size?.[2] ?? 4; return (spec.wheelBase ?? len * 0.6) / Math.tan(spec.steerLock ?? 0.5); }

/** Slip angle (rad) between heading and travel direction; |β| above ~0.2 with speed is a drift. */
export const slipAngle = (s: DriveState) => Math.atan2(s.slip ?? 0, Math.max(0.5, Math.abs(s.speed)));
export const isDrifting = (s: DriveState) => Math.abs(s.speed) > 7 && Math.abs(slipAngle(s)) > 0.2;
