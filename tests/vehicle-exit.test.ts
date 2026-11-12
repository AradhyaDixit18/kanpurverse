import { beforeAll, describe, expect, it, afterEach } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { VEHICLE_SPECS, vehicleExitCandidates, DEFAULT_APPEARANCE, type VehicleSnapshot } from "../packages/shared/src/index";
import { CHARACTER, createCharacterController, moveCharacter, placeCharacter } from "../apps/web/src/game/characterPhysics";
import { findClearVehicleExit } from "../apps/web/src/game/vehicleExit";
beforeAll(async () => { await RAPIER.init(); });
describe("safe exits in the actual Rapier scene", () => {
  for (const [kind, spec] of Object.entries(VEHICLE_SPECS)) {
    const fixture = () => {
      const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
      world.createCollider(RAPIER.ColliderDesc.cuboid(100, 1, 100).setTranslation(0, -1, 0));
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, spec.size[1] / 2 + 0.05, 0));
      world.createCollider(RAPIER.ColliderDesc.cuboid(...spec.size.map(n => n / 2) as [number, number, number]), body);
      const v: VehicleSnapshot = { id: "test", kind: kind as VehicleSnapshot["kind"], p: [0, spec.size[1] / 2 + 0.05, 0], q: [0, 0, 0, 1], v: 0 };
      return { world, body, v };
    };
    it(`${kind}: uses the opposite door when a wall blocks the preferred door`, () => {
      const { world, body, v } = fixture();
      try {
        world.createCollider(RAPIER.ColliderDesc.cuboid(0.06, 3, spec.size[2]).setTranslation(spec.size[0] / 2 + 0.12, 3, 0)); world.step();
        const exit = findClearVehicleExit(world, RAPIER, v, "driver", undefined, body);
        expect(exit).not.toBeNull(); expect(exit![0]).toBeLessThan(0); expect(exit![1]).toBeCloseTo(0);
      } finally { world.free(); }
    });
    it(`${kind}: refuses to exit a fully blocked chassis`, () => {
      const { world, body, v } = fixture();
      try {
        for (const side of [-1, 1]) {
          world.createCollider(RAPIER.ColliderDesc.cuboid(0.06, 3, spec.size[2] + 1).setTranslation(side * (spec.size[0] / 2 + 0.12), 3, 0));
          world.createCollider(RAPIER.ColliderDesc.cuboid(spec.size[0] + 1, 3, 0.06).setTranslation(0, 3, side * (spec.size[2] / 2 + 0.12)));
        }
        world.step(); expect(findClearVehicleExit(world, RAPIER, v, "passenger", undefined, body)).toBeNull();
      } finally { world.free(); }
    });
  }
});
it("exiting a disabled occupant capsule refreshes queries before ground snapping", () => {
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  try {
    world.createCollider(RAPIER.ColliderDesc.cuboid(20, 1, 20).setTranslation(0, -1, 0));
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, CHARACTER.feetOffset, 0));
    const col = world.createCollider(RAPIER.ColliderDesc.capsule(CHARACTER.halfHeight, CHARACTER.radius), body);
    const c = createCharacterController(world); world.step(); moveCharacter(body, c, { x: 0, y: -0.01, z: 0 }); world.step();
    col.setEnabled(false); body.setNextKinematicTranslation({ x: 3, y: 1.2, z: 0 }); world.step();
    col.setEnabled(true); placeCharacter(world, body, [4, 0, 0]);
    for (let i = 0; i < 60; i++) { moveCharacter(body, c, { x: 0, y: -0.5 / 60, z: 0 }); world.step(); expect(body.translation().y).toBeGreaterThan(0.93); }
    expect(body.translation().y).toBeCloseTo(CHARACTER.feetOffset, 2); world.removeCharacterController(c);
  } finally { world.free(); }
});
