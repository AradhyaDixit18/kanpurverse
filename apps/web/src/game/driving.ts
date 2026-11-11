/** Metres, seconds, radians; advanced once per physics tick, independent of rendering. */
export interface Handling { accel: number; max: number; turn: number }
export interface DriveState { speed: number; steer: number; yaw: number }
export function yawFromQuaternion(q: readonly number[]) {
  return Math.atan2(2 * (q[3] * q[1] + q[0] * q[2]), 1 - 2 * (q[1] ** 2 + q[2] ** 2));
}
export function stepDriving(state: DriveState, spec: Handling, input: { throttle: number; steer: number; brake: boolean }, actualSpeed: number, dt: number): DriveState {
  // Use the solver's result each tick: collisions cannot leave hidden commanded momentum.
  let speed = actualSpeed;
  const target = input.throttle > 0 ? spec.max : input.throttle < 0 ? -spec.max * 0.4 : 0;
  const decel = input.brake ? 22 : input.throttle === 0 ? 0.9 + Math.abs(speed) * 0.06 : spec.accel;
  const wanted = input.brake ? 0 : target;
  speed += Math.sign(wanted - speed) * Math.min(Math.abs(wanted - speed), decel * dt);
  speed = Math.max(-spec.max * 0.4, Math.min(spec.max, speed));
  if (Math.abs(speed) < 0.03) speed = 0;
  const steer = state.steer + (input.steer - state.steer) * (1 - Math.exp(-dt * 10));
  const grip = Math.min(1, Math.abs(speed) / 5);
  const yaw = state.yaw - steer * spec.turn * dt * grip * Math.sign(speed || 1) * (1 - Math.min(0.45, Math.abs(speed) / spec.max * 0.45));
  return { speed, steer, yaw };
}

/** Chassis, rendered heading and transmitted orientation must share this same yaw. */
export function applyVehicleMotion(body: import("@dimforge/rapier3d-compat").RigidBody, next: DriveState) {
  body.setLinvel({ x: Math.sin(next.yaw) * next.speed, y: body.linvel().y, z: Math.cos(next.yaw) * next.speed }, true);
  body.setRotation({ x: 0, y: Math.sin(next.yaw / 2), z: 0, w: Math.cos(next.yaw / 2) }, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}
