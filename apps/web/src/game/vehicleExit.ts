import type * as Rapier from "@dimforge/rapier3d-compat";
import { vehicleExitCandidates, type VehicleSnapshot, type VehicleSeat, type Vec3 } from "@kanpurverse/shared";
import { CHARACTER } from "./characterPhysics";

/** Query the actual streamed physics scene, including procedural walls and other vehicles. */
export function findClearVehicleExit(world: Rapier.World, rapier: Pick<typeof Rapier, "Capsule" | "Ray">, vehicle: VehicleSnapshot, seat: VehicleSeat, playerBody?: Rapier.RigidBody, occupiedBody?: Rapier.RigidBody): Vec3 | null {
  const capsule = new rapier.Capsule(CHARACTER.halfHeight, CHARACTER.radius);
  for (const candidate of vehicleExitCandidates(vehicle.kind, vehicle.p, vehicle.q, seat)) {
    const ground = world.castRayAndGetNormal(new rapier.Ray({ x: candidate[0], y: 0.65, z: candidate[2] }, { x: 0, y: -1, z: 0 }), 0.9, true, undefined, undefined, undefined, playerBody, c => !c.isSensor());
    if (!ground || ground.normal.y < 0.7) continue;
    const y = 0.65 - ground.timeOfImpact;
    if (y < -0.2 || y > 0.45) continue; // current city is at grade; do not exit onto a roof or into a hole
    let blocked = false;
    world.intersectionsWithShape({ x: candidate[0], y: y + CHARACTER.feetOffset, z: candidate[2] }, { x: 0, y: 0, z: 0, w: 1 }, capsule, () => { blocked = true; return false; }, undefined, undefined, undefined, playerBody, c => !c.isSensor());
    // Sweep the whole capsule, excluding the occupied chassis, so a thin wall between
    // seat and endpoint cannot be skipped by choosing a clear point on its far side.
    const passage = world.castShape({ x: vehicle.p[0], y: y + CHARACTER.feetOffset, z: vehicle.p[2] }, { x: 0, y: 0, z: 0, w: 1 }, { x: candidate[0] - vehicle.p[0], y: 0, z: candidate[2] - vehicle.p[2] }, capsule, 0.02, 1, true, undefined, undefined, undefined, playerBody, c => !c.isSensor() && c.parent()?.handle !== occupiedBody?.handle);
    if (!blocked && !passage) return [candidate[0], y, candidate[2]];
  }
  return null;
}
