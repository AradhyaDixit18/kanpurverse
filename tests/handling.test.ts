import { describe, it, expect } from "vitest";
import { stepDriving, turningRadius, type DriveState } from "../apps/web/src/game/driving";
import { SPECS } from "../apps/web/src/game/vehicleSpecs";
import { VEHICLE_INFO, VEHICLE_SPAWNS, type VehicleKind } from "@kanpurverse/shared";
import { carBodyBounds, CAR_KINDS } from "../apps/web/src/game/vehicleModels";

const DT = 1 / 60;
function run(kind: VehicleKind, seconds: number, input: { throttle: number; steer: number; brake?: boolean; handbrake?: boolean }, from: DriveState = { speed: 0, steer: 0, yaw: 0 }) {
  let s = from; const spec = SPECS[kind];
  for (let i = 0; i < seconds * 60; i++) s = stepDriving(s, spec, { brake: false, ...input }, s.speed, DT);
  return s;
}
const time0to = (kind: VehicleKind, v: number) => { let s: DriveState = { speed: 0, steer: 0, yaw: 0 }; for (let i = 1; i < 60 * 60; i++) { s = stepDriving(s, SPECS[kind], { throttle: 1, steer: 0, brake: false }, s.speed, DT); if (s.speed >= v) return i * DT; } return Infinity; };

describe("vehicle handling classes", () => {
  it("every vehicle class has catalogue info and at least one parked example", () => {
    for (const k of Object.keys(SPECS) as VehicleKind[]) { expect(VEHICLE_INFO[k].name.length).toBeGreaterThan(2); expect(VEHICLE_SPAWNS.some(v => v.kind === k)).toBe(true); }
  });
  it("sport bike out-accelerates a hatchback, which out-accelerates an e-rickshaw and a bus", () => {
    expect(time0to("sportbike", 6)).toBeLessThan(time0to("hatchback", 6));
    expect(time0to("hatchback", 6)).toBeLessThan(time0to("bus", 6));
    expect(time0to("erickshaw", 6)).toBeGreaterThan(time0to("hatchback", 6));
    expect(SPECS.erickshaw.max).toBeLessThan(SPECS.auto.max); expect(SPECS.cyclerickshaw.max).toBeLessThan(SPECS.erickshaw.max);
  });
  it("heavy vehicles need much wider turns than cars, cars wider than scooters", () => {
    expect(turningRadius(SPECS.bus)).toBeGreaterThan(10); expect(turningRadius(SPECS.hatchback)).toBeLessThan(6);
    expect(turningRadius(SPECS.truck)).toBeGreaterThan(turningRadius(SPECS.suv)); expect(turningRadius(SPECS.suv)).toBeGreaterThan(turningRadius(SPECS.scooter));
  });
  it("S brakes first when rolling forward, then engages reverse", () => {
    const moving = run("hatchback", 3, { throttle: 1, steer: 0 });
    const braking = run("hatchback", 0.5, { throttle: -1, steer: 0 }, moving);
    expect(braking.speed).toBeLessThan(moving.speed); expect(braking.speed).toBeGreaterThan(0);
    const reversing = run("hatchback", 3, { throttle: -1, steer: 0 }, moving);
    expect(reversing.speed).toBeLessThan(0); expect(reversing.speed).toBeGreaterThanOrEqual(-SPECS.hatchback.max * 0.35);
  });
  it("speed-sensitive steering and the grip ceiling keep high-speed turns physically plausible", () => {
    const fast = run("hatchback", 0.6, { throttle: 0, steer: 1 }, { speed: 28, steer: 0, yaw: 0 });
    expect(Math.abs(fast.lat ?? 0)).toBeLessThanOrEqual(SPECS.hatchback.grip * 9.81 + 0.01);
    const slow = run("hatchback", 0.6, { throttle: 0, steer: 1 }, { speed: 6, steer: 0, yaw: 0 });
    expect(Math.abs(slow.yawRate ?? 0)).toBeGreaterThan(Math.abs(fast.yawRate ?? 0) * 0.8);
  });
  it("handbrake slides the tail and slows the car; normal driving keeps slip near zero", () => {
    const corner = run("hatchback", 0.8, { throttle: 0, steer: 1, handbrake: true }, { speed: 18, steer: 0, yaw: 0 });
    expect(Math.abs(corner.slip ?? 0)).toBeGreaterThan(0.5); expect(corner.speed).toBeLessThan(18);
    const tidy = run("hatchback", 0.8, { throttle: 0, steer: 1 }, { speed: 18, steer: 0, yaw: 0 });
    expect(Math.abs(tidy.slip ?? 0)).toBeLessThan(0.05);
  });
  it("heavier vehicles respond more slowly to the same steering input", () => {
    const car = run("hatchback", 0.25, { throttle: 0, steer: 1 }, { speed: 8, steer: 0, yaw: 0 });
    const bus = run("bus", 0.25, { throttle: 0, steer: 1 }, { speed: 8, steer: 0, yaw: 0 });
    expect(Math.abs(car.yaw)).toBeGreaterThan(Math.abs(bus.yaw) * 1.5);
  });
});

describe("original car body geometry", () => {
  it("every car body fits its collider box and has real volume", () => {
    for (const k of CAR_KINDS) {
      const [w, h, l] = SPECS[k].size; const b = carBodyBounds(k);
      expect(Number.isFinite(b.min.x + b.max.y + b.min.z)).toBe(true);
      expect(b.max.x - b.min.x).toBeLessThanOrEqual(w + 0.02); expect(b.max.z - b.min.z).toBeGreaterThan(l * 0.9); expect(b.max.z - b.min.z).toBeLessThanOrEqual(l + 0.2);
      expect(b.max.y).toBeLessThanOrEqual(h / 2 + 0.05); expect(b.min.y).toBeGreaterThan(-h / 2);
    }
  });
});

describe("drifting comes from the tyre model", () => {
  it("handbrake at speed builds a slip angle; counter-steer recovers faster than holding the turn", () => {
    let s: DriveState = { speed: 22, steer: 0, yaw: 0 };
    for (let i = 0; i < 40; i++) s = stepDriving(s, SPECS.hatchback, { throttle: 0.7, steer: 1, brake: false, handbrake: true }, s.speed, DT);
    expect(Math.abs(s.slip ?? 0)).toBeGreaterThan(1);
    let hold = s, counter = s;
    for (let i = 0; i < 30; i++) { hold = stepDriving(hold, SPECS.hatchback, { throttle: 0.5, steer: 1, brake: false }, hold.speed, DT); counter = stepDriving(counter, SPECS.hatchback, { throttle: 0.5, steer: -Math.sign(counter.slip ?? 1) * 0.6, brake: false }, counter.speed, DT); }
    expect(Math.abs(counter.slip ?? 0)).toBeLessThan(Math.abs(hold.slip ?? 0));
  });
  it("power at the limit on a loose surface steps the rear out without a handbrake", () => {
    let road: DriveState = { speed: 20, steer: 0, yaw: 0 }, dirt: DriveState = { speed: 20, steer: 0, yaw: 0 };
    for (let i = 0; i < 60; i++) { road = stepDriving(road, SPECS.sedan, { throttle: 1, steer: 1, brake: false, surface: 1 }, road.speed, DT); dirt = stepDriving(dirt, SPECS.sedan, { throttle: 1, steer: 1, brake: false, surface: 0.6 }, dirt.speed, DT); }
    expect(Math.abs(dirt.slip ?? 0)).toBeGreaterThan(Math.abs(road.slip ?? 0));
  });
  it("two-wheelers never slide sideways", () => {
    let s: DriveState = { speed: 18, steer: 0, yaw: 0 };
    for (let i = 0; i < 60; i++) s = stepDriving(s, SPECS.sportbike, { throttle: 1, steer: 1, brake: false, handbrake: true, noSlide: true }, s.speed, DT);
    expect(s.slip ?? 0).toBe(0);
  });
});
