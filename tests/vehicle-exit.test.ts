import { beforeAll, describe, expect, it, afterEach } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { VEHICLE_SPECS, vehicleExitCandidates, DEFAULT_APPEARANCE, type VehicleSnapshot, type S2C } from "../packages/shared/src/index";
import { CHARACTER, createCharacterController, moveCharacter, placeCharacter } from "../apps/web/src/game/characterPhysics";
import { findClearVehicleExit } from "../apps/web/src/game/vehicleExit";
import { createExitBlocker, polygonBlocksPoint, loadExitBlocker } from "../apps/server/src/worldSafety";
import { Room, Player } from "../apps/server/src/room";
import type { Storage } from "../apps/server/src/storage";
import type { WebSocket } from "ws";
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
const rooms: Room[] = []; afterEach(() => { rooms.splice(0).forEach(r => r.destroy()); });
function setup(blocked = (_p: [number, number, number], _r: number) => false) {
  const room = new Room("exit-test", { putPlayer: async () => {} } as unknown as Storage, 8, blocked); rooms.push(room);
  const messages: S2C[] = []; const ws = { OPEN: 1, readyState: 1, send: (raw: string) => messages.push(JSON.parse(raw)) } as unknown as WebSocket;
  const p = new Player(ws, { _id: "tester", name: "tester", appearance: DEFAULT_APPEARANCE, lang: "english", coins: 200, xp: 0, level: 1, missionsCompleted: [], unlocked: [], friends: [], blocked: [], playtimeSec: 0, createdAt: 0, lastSeenAt: 0, reports: 0 });
  room.players.set(p.id, p); const vehicle = [...room.vehicles.values()][0]; vehicle.p = [0, 1, 0];
  p.p = [...vehicle.p]; room.enterVehicle(p, vehicle.id, "driver"); return { room, vehicle, p, messages };
}
it("server retains seat ownership when every exit is blocked", () => {
  const { room, vehicle, p, messages } = setup(() => true); room.exitVehicle(p);
  expect(p.vehicle).toBe(vehicle.id); expect(vehicle.driver).toBe(p.id); expect(messages.at(-1)).toMatchObject({ t: "error", code: "exit_blocked" });
});
it("server rejects arbitrary exit teleports and vertical spoofing", () => {
  const { room, vehicle, p, messages } = setup(); room.exitVehicle(p, [900, 0, 900]);
  expect(p.vehicle).toBe(vehicle.id); expect(messages.at(-1)).toMatchObject({ code: "exit_blocked" });
  const candidate = vehicleExitCandidates(vehicle.kind, vehicle.p, vehicle.q, "driver")[0]; candidate[1] = 30; room.exitVehicle(p, candidate);
  expect(p.vehicle).toBe(vehicle.id);
});
it("moving vehicles reject exit; disconnect still releases a blocked seat", () => {
  const { room, vehicle, p, messages } = setup(() => true); vehicle.v = 10; room.exitVehicle(p);
  expect(messages.at(-1)).toMatchObject({ code: "vehicle_moving" }); expect(vehicle.driver).toBe(p.id);
  room.leave(p); expect(vehicle.driver).toBeUndefined(); expect(room.players.has(p.id)).toBe(false);
});
it("polygon checks preserve narrow roads beside diagonal buildings", () => {
  const polygon: [number, number][] = [[0, 0], [10, 10], [12, 8], [2, -2]];
  expect(polygonBlocksPoint([0, 0, 8], 0.4, polygon)).toBe(false);
  expect(polygonBlocksPoint([5, 0, 4], 0.4, polygon)).toBe(true);
  expect(createExitBlocker([polygon])([5, 0, 4], 0.4)).toBe(true);
});
it("production geometry loader reads the checked-in extract without credentials", () => {
  expect(typeof loadExitBlocker()).toBe("function");
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
