import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { VEHICLE_SPECS, type VehicleKind } from "@kanpurverse/shared";
import { attitudeTarget, bodyPose, bodyMatrix, wheelLocalMatrix, archClosure, limitToArch, SUSPENSION, type SuspensionClass } from "../apps/web/src/game/suspension";
import { roadWheelAngle, steerSpeedFactor, stepDriving } from "../apps/web/src/game/driving";

const kinds = Object.keys(VEHICLE_SPECS) as VehicleKind[];
const I = new THREE.Matrix4();
/** Where a wheel anchor ends up in the vehicle frame once the chassis pose and the anchor's local matrix are applied. */
function wheelInVehicle(cls: SuspensionClass, pitch: number, roll: number, h: number, rest: THREE.Vector3, steer = 0) {
  const pose = bodyPose(cls, pitch, roll, h / 2); const restM = new THREE.Matrix4().makeTranslation(rest.x, rest.y, rest.z);
  const local = wheelLocalMatrix(new THREE.Matrix4(), pose, cls === "two", restM, I, steer);
  return bodyMatrix(new THREE.Matrix4(), pose).multiply(local);
}

describe("visual suspension keeps wheels on the road", () => {
  it("car, three-wheeler, pedal and heavy wheels do not move when the chassis pitches and rolls", () => {
    for (const k of kinds) { const s = VEHICLE_SPECS[k]; if (s.cls === "two") continue; const [w, h] = s.size;
      const rest = new THREE.Vector3(w / 2 - 0.13, -h / 2 + s.wheelR, s.wheelBase / 2);
      for (const [a, l] of [[12, 0], [-12, 0], [0, 12], [-10, -11], [6, 9]]) { const t = attitudeTarget(s.cls as SuspensionClass, a, l);
        const m = wheelInVehicle(s.cls as SuspensionClass, t.pitch, t.roll, h, rest); const p = new THREE.Vector3().setFromMatrixPosition(m);
        expect(p.distanceTo(rest), `${k} wheel centre left its axle`).toBeLessThan(1e-9);
        const up = new THREE.Vector3(0, 1, 0).transformDirection(m); expect(up.y, `${k} wheel tilted with the body`).toBeGreaterThan(1 - 1e-9); // upright: no camber from body roll
      } }
  });
  it("the tyre's lowest point stays exactly at road height: no floating and no ground penetration", () => {
    for (const k of kinds) { const s = VEHICLE_SPECS[k]; const [, h] = s.size; const cls = s.cls as SuspensionClass; const road = -h / 2;
      for (const z of [s.wheelBase / 2, -s.wheelBase / 2]) for (const [a, l] of [[12, 12], [-12, -12], [-12, 5], [0, -12]]) {
        const t = attitudeTarget(cls, a, l); const rest = new THREE.Vector3(0, road + s.wheelR, z); const m = wheelInVehicle(cls, t.pitch, t.roll, h, rest);
        const centre = new THREE.Vector3().setFromMatrixPosition(m); const up = new THREE.Vector3(0, 1, 0).transformDirection(m);
        const contact = centre.clone().addScaledVector(up, -s.wheelR); // bottom of a thin wheel disc
        expect(Math.abs(contact.y - road), `${k} tyre contact height`).toBeLessThan(1e-6);
        if (cls === "two") expect(Math.abs(contact.x), `${k} contact patch swung sideways in a lean`).toBeLessThan(1e-6);
      } }
  });
  it("a two-wheeler's wheels lean with the frame but ignore pitch", () => {
    const s = VEHICLE_SPECS.cruiser; const [, h] = s.size; const t = attitudeTarget("two", -12, 9);
    expect(t.roll).toBeGreaterThan(0.5); expect(t.pitch).toBeGreaterThan(0); // braking dives the nose; right turn leans right
    const m = wheelInVehicle("two", t.pitch, t.roll, h, new THREE.Vector3(0, -h / 2 + s.wheelR, s.wheelBase / 2));
    const up = new THREE.Vector3(0, 1, 0).transformDirection(m), fwd = new THREE.Vector3(0, 0, 1).transformDirection(m);
    expect(Math.atan2(-up.x, up.y)).toBeCloseTo(t.roll, 6); expect(fwd.y).toBeCloseTo(0, 9);
  });
  it("only the cycle rickshaw's rider pedals: three wheels never lean like a bike", () => {
    expect(Math.abs(attitudeTarget("pedal", 0, 12).roll)).toBeLessThanOrEqual(SUSPENSION.rollMax);
    expect(Math.abs(attitudeTarget("three", 0, -12).roll)).toBeLessThanOrEqual(SUSPENSION.rollMax);
  });
  it("body movement never closes a wheel arch onto its tyre", () => {
    for (const k of kinds) { const s = VEHICLE_SPECS[k]; if (s.cls === "two") continue; const t = attitudeTarget(s.cls as SuspensionClass, -12, 12);
      expect(Math.abs(t.pitch)).toBeLessThanOrEqual(SUSPENSION.pitchMax); expect(Math.abs(t.roll)).toBeLessThanOrEqual(SUSPENSION.rollMax);
      const axle = s.size[2] / 2, halfTrack = s.size[0] / 2; // no axle or wheel can sit outside the body
      const l = limitToArch(t.pitch, t.roll, axle, halfTrack); expect(archClosure(l.pitch, l.roll, axle, halfTrack), `${k} arch closure`).toBeLessThanOrEqual(0.05 + 1e-4); // sin() is not linear: scaling the angles lands within 0.1 mm
      expect(archClosure(l.pitch, l.roll, axle, halfTrack)).toBeLessThan(SUSPENSION.archClearance);
      expect(Math.sign(l.pitch)).toBe(Math.sign(t.pitch)); expect(Math.sign(l.roll)).toBe(Math.sign(t.roll)); }
    expect(limitToArch(0.01, 0.01, 1, 0.7)).toEqual({ pitch: 0.01, roll: 0.01 }); // inside the limit: untouched
  });
  it("accelerating squats the tail, braking dives the nose, and a car rolls away from the turn", () => {
    expect(attitudeTarget("car", 6, 0).pitch).toBeLessThan(0); expect(attitudeTarget("car", -8, 0).pitch).toBeGreaterThan(0);
    expect(attitudeTarget("car", 0, 6).roll).toBeLessThan(0); expect(attitudeTarget("two", 0, 6).roll).toBeGreaterThan(0);
    expect(Math.abs(attitudeTarget("heavy", 0, 6).roll)).toBeLessThan(Math.abs(attitudeTarget("car", 0, 6).roll));
  });
  it("a fixed group between the chassis and the wheel (three-wheeler rear axle) is undone", () => {
    const pose = bodyPose("three", 0.02, -0.03, 0.9); const offset = new THREE.Matrix4().makeTranslation(0.6, 0, 0);
    const rest = offset.clone().multiply(new THREE.Matrix4().makeTranslation(0, -0.6, -1)); // vehicle-frame rest
    const local = wheelLocalMatrix(new THREE.Matrix4(), pose, false, rest, offset.clone().invert(), 0);
    const p = new THREE.Vector3().setFromMatrixPosition(bodyMatrix(new THREE.Matrix4(), pose).multiply(offset).multiply(local));
    expect(p.distanceTo(new THREE.Vector3(0.6, -0.6, -1))).toBeLessThan(1e-9);
  });
});

describe("steering the player sees is the steering the tyres use", () => {
  it("full lock at walking pace, half at the fade speed, never under 22%", () => {
    for (const k of kinds) { const s = VEHICLE_SPECS[k];
      expect(roadWheelAngle(s, 1, 0)).toBeCloseTo(s.steerLock, 9); expect(steerSpeedFactor(s, s.steerFade)).toBeCloseTo(0.5, 9);
      expect(steerSpeedFactor(s, 200)).toBeCloseTo(0.22, 9); expect(roadWheelAngle(s, -1, 5)).toBeLessThan(0);
      expect(Math.abs(roadWheelAngle(s, 1, s.max))).toBeLessThan(Math.abs(roadWheelAngle(s, 1, 3))); }
  });
  it("the drawn angle reproduces the simulated yaw rate below the grip limit", () => {
    const s = VEHICLE_SPECS.hatchback; let st = { speed: 6, steer: 0.3, yaw: 0, yawRate: 0, slip: 0 };
    for (let i = 0; i < 240; i++) st = { ...st, ...stepDriving(st, s, { throttle: 0.35, steer: 0.3, brake: false }, st.speed, 1 / 60) } as typeof st;
    const kinematic = st.speed * Math.tan(roadWheelAngle(s, st.steer, st.speed)) / s.wheelBase;
    expect(st.yawRate).toBeCloseTo(kinematic, 2);
  });
});
