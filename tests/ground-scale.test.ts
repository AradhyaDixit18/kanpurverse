import { beforeAll, expect, it } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { CHARACTER, createCharacterController, moveCharacter, placeCharacter } from "../apps/web/src/game/characterPhysics";
beforeAll(async () => { await RAPIER.init(); });
import { GROUND_TILE_SIZE, groundTileCenters, groundTileKey } from "../apps/web/src/game/groundTiles";
it.each([[474.425, -329.696], [512, -384], [512.01, -383.99], [2500, -2400], [-2500, 2400]])("streamed ground keeps feet aligned at (%s,%s), including tile seams", (x, z) => {
  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  try {
    for (const [cx, cz] of groundTileCenters(...groundTileKey(x, z))) world.createCollider(RAPIER.ColliderDesc.cuboid(GROUND_TILE_SIZE / 2, 1, GROUND_TILE_SIZE / 2).setTranslation(cx, -1, cz));
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x - 2, CHARACTER.feetOffset, z));
    const col = world.createCollider(RAPIER.ColliderDesc.capsule(CHARACTER.halfHeight, CHARACTER.radius), body);
    const c = createCharacterController(world); world.step(); moveCharacter(body, c, { x: 0, y: -0.01, z: 0 }); world.step();
    col.setEnabled(false); body.setNextKinematicTranslation({ x, y: 1.024, z }); world.step();
    col.setEnabled(true); placeCharacter(world, body, [x, 0, z]);
    for (let i = 0; i < 60; i++) { moveCharacter(body, c, { x: 0.01, y: -0.005, z: 0 }); world.step(); expect(body.translation().y).toBeGreaterThan(0.93); }
    expect(body.translation().y).toBeCloseTo(CHARACTER.feetOffset, 2); world.removeCharacterController(c);
  } finally { world.free(); }
});
