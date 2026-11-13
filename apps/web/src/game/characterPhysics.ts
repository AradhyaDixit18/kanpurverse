import type { World, RigidBody, KinematicCharacterController } from "@dimforge/rapier3d-compat";
export const CHARACTER = { halfHeight: 0.55, radius: 0.35, offset: 0.05, feetOffset: 0.95 };
export function createCharacterController(world: World) {
  const c = world.createCharacterController(CHARACTER.offset);
  c.enableAutostep(0.45, 0.2, true); c.enableSnapToGround(0.3);
  c.setMaxSlopeClimbAngle(50 * Math.PI / 180);
  return c;
}
export function moveCharacter(body: RigidBody, controller: KinematicCharacterController, desired: { x: number; y: number; z: number }) {
  controller.computeColliderMovement(body.collider(0), desired);
  const mv = controller.computedMovement(), p = body.translation();
  const next = { x: p.x + mv.x, y: p.y + mv.y, z: p.z + mv.z };
  body.setNextKinematicTranslation(next);
  return { next, grounded: controller.computedGrounded() };
}
export function turnLean(deltaYaw: number, dt: number, speed: number) {
  return Math.max(-0.18, Math.min(0.18, -deltaYaw / Math.max(dt, 1e-6) * 0.04)) * Math.min(1, speed / 5);
}

/** Rapier collider/query transforms lag setTranslation until propagated; queries must see the new pose. */
export function placeCharacter(world: World, body: RigidBody, feet: readonly number[]) {
  const p = { x: feet[0], y: feet[1] + CHARACTER.feetOffset, z: feet[2] };
  body.setTranslation(p, true); body.setNextKinematicTranslation(p);
  world.propagateModifiedBodyPositionsToColliders(); world.updateSceneQueries();
}

/** Third-person camera distance when the view ray hits geometry at `toi`: always on the player's side of the hit. */
export function cameraClampDistance(toi: number, gap = 0.25, min = 0.3) { return Math.max(Math.min(min, toi * 0.85), toi - gap); }

/** Load position for a saved pose: lifted 0.6 m so a save made on a 0.4 m platform (or older saves at y≈0 there) never starts inside a collider. */
export function spawnLift(p: readonly number[]): [number, number, number] { return [p[0], Math.max(0, p[1] ?? 0) + 0.6, p[2]]; }

/** How far above her feet the "am I standing inside something walkable?" probe starts (just above the 0.45 m autostep). */
export const EMBED_PROBE = 0.55;
/** New feet height when the downward probe from feet+EMBED_PROBE hit a surface above her feet (toi = distance travelled), else null. */
export function embeddedLift(feet: number, toi: number | null, probe = EMBED_PROBE): number | null { if (toi === null || toi <= 0.001) return null; const top = feet + probe - toi; return top > feet + 0.03 ? top : null; }
