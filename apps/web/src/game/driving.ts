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
export interface DriveInput { throttle: number; steer: number; brake: boolean; handbrake?: boolean }

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
  const grip = (spec.grip ?? 0.9) * (handbrake ? 1.9 : 1);
  const maxYaw = grip * G / Math.max(Math.abs(speed), 1);
  target = Math.max(-maxYaw, Math.min(maxYaw, target));                                                   // understeer at the limit
  const prevRate = state.yawRate ?? 0;
  const yawRate = prevRate + (target - prevRate) * (1 - Math.exp(-dt * response));
  const yaw = state.yaw - yawRate * dt;

  // Lateral slip: handbrake turns break the rear loose; otherwise grip pulls the car back into line.
  let slip = state.slip ?? 0;
  if (handbrake && Math.abs(speed) > 4) slip += Math.sign(yawRate * speed) * Math.min(6, Math.abs(yawRate * speed) * 0.5) * dt;
  slip *= Math.exp(-dt * (handbrake ? 1.4 : 7 * (spec.grip ?? 0.9)));
  if (Math.abs(slip) < 0.01) slip = 0;

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
