import { expect, it } from "vitest";
import { Quaternion, Vector3 } from "three";
import { VEHICLE_SPECS, vehicleSeatPose, vehicleLocalToWorld } from "../packages/shared/src/index";
for (const kind of Object.keys(VEHICLE_SPECS) as (keyof typeof VEHICLE_SPECS)[]) {
  it(`${kind}: driver/passenger roots occupy distinct valid parts of the chassis`, () => {
    const driver = vehicleSeatPose(kind, "driver"), passenger = vehicleSeatPose(kind, "passenger"); const [w, , l] = VEHICLE_SPECS[kind].size;
    expect(new Vector3(...driver.p).distanceTo(new Vector3(...passenger.p))).toBeGreaterThan(0.35);
    for (const pose of [driver, passenger]) { expect(pose.p.every(Number.isFinite)).toBe(true); expect(Math.abs(pose.p[0]) + 0.24 * pose.scale).toBeLessThan(w / 2); expect(Math.abs(pose.p[2])).toBeLessThan(l / 2); }
  });
  it(`${kind}: both seat roots follow the real chassis quaternion without independent interpolation`, () => {
    for (const yaw of [-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI]) for (const seat of ["driver", "passenger"] as const) {
      const local = vehicleSeatPose(kind, seat).p; const origin = [476, 1, -330];
      const expected = new Vector3(...local).applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw)).add(new Vector3(...origin));
      const actual = vehicleLocalToWorld(origin, yaw, local);
      actual.forEach((value, i) => expect(value).toBeCloseTo(expected.getComponent(i), 8));
    }
  });
}
