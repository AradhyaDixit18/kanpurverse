import { beforeAll, describe, expect, it } from "vitest";
import RAPIER from "@dimforge/rapier3d-compat";
import { applyVehicleMotion, stepDriving, yawFromQuaternion, type DriveState } from "../apps/web/src/game/driving";
import { SPECS } from "../apps/web/src/game/vehicleSpecs";

beforeAll(async () => { await RAPIER.init(); });
const DT = 1 / 60;

describe("vehicle physics regressions (real Rapier WASM)", () => {
  for (const [kind, spec] of Object.entries(SPECS)) {
    it(`${kind}: chassis turns with travel direction; brakes, reverses and stays grounded`, () => {
      const world = new RAPIER.World({ x: 0, y: -18, z: 0 }); world.timestep = DT;
      try {
        world.createCollider(RAPIER.ColliderDesc.cuboid(100, 1, 100).setTranslation(0, -1, 0));
        const car = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, spec.size[1] / 2 + 0.05, 0).enabledRotations(false, true, false).setCcdEnabled(true));
        world.createCollider(RAPIER.ColliderDesc.cuboid(spec.size[0] / 2, spec.size[1] / 2, spec.size[2] / 2).setMass(900).setFriction(0).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setRestitution(0), car);
        let state: DriveState = { speed: 0, steer: 0, yaw: 1.1 };
        const tick = (throttle: number, steer: number, brake = false) => {
          const v = car.linvel(); const actual = v.x * Math.sin(state.yaw) + v.z * Math.cos(state.yaw);
          state = stepDriving(state, spec, { throttle, steer, brake }, actual, DT);
          applyVehicleMotion(car, state); world.step();
        };
        for (let i = 0; i < 90; i++) tick(1, 0.6);
        const q = car.rotation();
        expect(yawFromQuaternion([q.x, q.y, q.z, q.w])).toBeCloseTo(state.yaw, 3);
        expect(Math.abs(state.yaw - 1.1)).toBeGreaterThan(0.1);
        expect(car.translation().y).toBeCloseTo(spec.size[1] / 2, 1);
        expect(state.speed).toBeGreaterThan(2);
        for (let i = 0; i < 120; i++) tick(0, 0, true);
        expect(Math.abs(state.speed)).toBeLessThan(0.05);
        for (let i = 0; i < 60; i++) tick(-1, 0);
        expect(state.speed).toBeLessThan(-1);
        expect(state.speed).toBeGreaterThanOrEqual(-spec.max * 0.4);
      } finally { world.free(); }
    });
    it(`${kind}: CCD chassis cannot drive through a solid wall at maximum speed`, () => {
      const world = new RAPIER.World({ x: 0, y: -18, z: 0 }); world.timestep = DT;
      try {
        world.createCollider(RAPIER.ColliderDesc.cuboid(100, 1, 100).setTranslation(0, -1, 0));
        world.createCollider(RAPIER.ColliderDesc.cuboid(20, 5, 0.1).setTranslation(0, 5, 12));
        const car = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, spec.size[1] / 2 + 0.05, 0).enabledRotations(false, true, false).setCcdEnabled(true));
        world.createCollider(RAPIER.ColliderDesc.cuboid(spec.size[0] / 2, spec.size[1] / 2, spec.size[2] / 2).setMass(900).setFriction(0).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min).setRestitution(0), car);
        let state = { speed: spec.max, steer: 0, yaw: 0 };
        car.setLinvel({ x: 0, y: 0, z: spec.max }, true);
        for (let i = 0; i < 180; i++) {
          state = stepDriving(state, spec, { throttle: 1, steer: 0, brake: false }, car.linvel().z, DT);
          applyVehicleMotion(car, state); world.step();
        }
        expect(car.translation().z + spec.size[2] / 2).toBeLessThan(12.03);
        expect(car.translation().z).toBeGreaterThan(1);
      } finally { world.free(); }
    });
  }
  it("fixed physics ticks yield identical driving at 30, 60 and 144 render FPS", () => {
    const simulate = (fps: number) => {
      let state: DriveState = { speed: 0, steer: 0, yaw: 0 }, accumulator = 0;
      let x = 0, z = 0, ticks = 0;
      for (let frame = 0; frame < fps * 4; frame++) {
        accumulator += 1 / fps;
        while (accumulator + 1e-10 >= DT) {
          state = stepDriving(state, SPECS.hatchback, { throttle: 1, steer: 0.4, brake: false }, state.speed, DT);
          x += Math.sin(state.yaw) * state.speed * DT; z += Math.cos(state.yaw) * state.speed * DT;
          accumulator -= DT; ticks++;
        }
      }
      return { state, x, z, ticks };
    };
    expect(simulate(30)).toEqual(simulate(60)); expect(simulate(144)).toEqual(simulate(60));
  });
  it("a wall-stopped vehicle cannot retain commanded speed", () => {
    const state = stepDriving({ speed: 26, steer: 0, yaw: 0 }, SPECS.hatchback, { throttle: 1, steer: 0, brake: false }, 0, DT);
    expect(state.speed).toBeLessThan(0.2);
  });
});

import { CHARACTER, createCharacterController, moveCharacter, turnLean } from "../apps/web/src/game/characterPhysics";
describe("character collision regressions (real Rapier WASM)", () => {
  it("walks into a wall without penetrating; jumps and returns to aligned ground contact", () => {
    const world = new RAPIER.World({ x: 0, y: -18, z: 0 }); world.timestep = DT;
    try {
      world.createCollider(RAPIER.ColliderDesc.cuboid(30, 1, 30).setTranslation(0, -1, 0));
      world.createCollider(RAPIER.ColliderDesc.cuboid(5, 3, 0.2).setTranslation(0, 3, 3));
      const player = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, CHARACTER.feetOffset, 0));
      world.createCollider(RAPIER.ColliderDesc.capsule(CHARACTER.halfHeight, CHARACTER.radius), player);
      const c = createCharacterController(world); let vy = 0, grounded = false;
      for (let i = 0; i < 90; i++) {
        vy -= 18 * DT; const result = moveCharacter(player, c, { x: 0, y: vy * DT, z: 5.5 * DT });
        grounded = result.grounded; if (grounded) vy = -0.5; world.step();
      }
      expect(grounded).toBe(true); expect(player.translation().z + CHARACTER.radius).toBeLessThan(2.81);
      expect(player.translation().y - CHARACTER.feetOffset).toBeCloseTo(0, 2);
      vy = 6.5; let peak = player.translation().y;
      for (let i = 0; i < 120; i++) {
        vy -= 18 * DT; const result = moveCharacter(player, c, { x: 0, y: vy * DT, z: 0 });
        if (result.grounded && vy < 0) vy = -0.5; world.step(); peak = Math.max(peak, player.translation().y);
      }
      expect(peak - CHARACTER.feetOffset).toBeGreaterThan(0.9);
      expect(player.translation().y - CHARACTER.feetOffset).toBeCloseTo(0, 2);
      world.removeCharacterController(c);
    } finally { world.free(); }
  });
  it("occupant collider can be disabled inside chassis and re-enabled only after exit", () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    try {
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());
      const collider = world.createCollider(RAPIER.ColliderDesc.capsule(CHARACTER.halfHeight, CHARACTER.radius), body);
      collider.setEnabled(false); world.step(); expect(collider.isEnabled()).toBe(false);
      body.setTranslation({ x: 2.2, y: CHARACTER.feetOffset, z: 0 }, true); collider.setEnabled(true); world.step();
      expect(collider.isEnabled()).toBe(true); expect(body.translation().x).toBeCloseTo(2.2);
    } finally { world.free(); }
  });
  it("turning cannot roll the character beyond ten degrees at any supported frame rate", () => {
    for (const fps of [20, 30, 60, 144]) {
      expect(Math.abs(turnLean(Math.PI, 1 / fps, 8.5))).toBeLessThanOrEqual(0.18);
      expect(turnLean(0, 1 / fps, 8.5)).toBeCloseTo(0);
    }
  });
});


describe("player / vehicle contact (real Rapier WASM)", () => {
  for (const [kind, spec] of Object.entries(SPECS)) {
    it(`${kind}: character cannot walk through a parked chassis`, () => {
      const world = new RAPIER.World({ x: 0, y: -18, z: 0 }); world.timestep = DT;
      try {
        world.createCollider(RAPIER.ColliderDesc.cuboid(40, 1, 40).setTranslation(0, -1, 0));
        const car = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, spec.size[1] / 2 + 0.05, 8));
        world.createCollider(RAPIER.ColliderDesc.cuboid(spec.size[0] / 2, spec.size[1] / 2, spec.size[2] / 2), car);
        const player = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, CHARACTER.feetOffset, 0));
        world.createCollider(RAPIER.ColliderDesc.capsule(CHARACTER.halfHeight, CHARACTER.radius), player);
        const c = createCharacterController(world);
        for (let i = 0; i < 150; i++) { moveCharacter(player, c, { x: 0, y: -0.5 * DT, z: 8.5 * DT }); world.step(); }
        expect(player.translation().z + CHARACTER.radius).toBeLessThan(8 - spec.size[2] / 2 + 0.02);
        world.removeCharacterController(c);
      } finally { world.free(); }
    });
    it(`${kind}: driven chassis cannot pass through a stationary on-foot capsule`, () => {
      const world = new RAPIER.World({ x: 0, y: -18, z: 0 }); world.timestep = DT;
      try {
        world.createCollider(RAPIER.ColliderDesc.cuboid(40, 1, 40).setTranslation(0, -1, 0));
        const player = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, CHARACTER.feetOffset, 12));
        world.createCollider(RAPIER.ColliderDesc.capsule(CHARACTER.halfHeight, CHARACTER.radius), player);
        const car = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, spec.size[1] / 2 + 0.05, 0).enabledRotations(false, true, false).setCcdEnabled(true));
        world.createCollider(RAPIER.ColliderDesc.cuboid(spec.size[0] / 2, spec.size[1] / 2, spec.size[2] / 2).setMass(900).setFriction(0).setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min), car);
        let state = { speed: 0, steer: 0, yaw: 0 };
        for (let i = 0; i < 240; i++) {
          state = stepDriving(state, spec, { throttle: 1, steer: 0, brake: false }, car.linvel().z, DT);
          applyVehicleMotion(car, state); world.step();
        }
        expect(car.translation().z + spec.size[2] / 2).toBeLessThan(12 - CHARACTER.radius + 0.06);
        expect(car.translation().z).toBeGreaterThan(1);
      } finally { world.free(); }
    });
  }
});
