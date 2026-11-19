import { describe, it, expect } from "vitest";
import { VEHICLE_SPECS } from "@kanpurverse/shared";
import { SHOTS, shotFrame, at, pursue, type Subject, type Shot } from "../apps/web/src/game/cinematics";
import { stepDriving, type DriveState } from "../apps/web/src/game/driving";

const spec = VEHICLE_SPECS.hatchback; const [w, h, l] = spec.size;
const subject = (x = 0, z = 0, yaw = 0): Subject => ({ x, y: h / 2, z, yaw, w, h, l, wheelBase: spec.wheelBase, wheelR: spec.wheelR });

describe("cinematic shots", () => {
  it("every shot keeps the camera above the road, off the bodywork and aimed at the car", () => {
    for (const name of SHOTS) for (const side of [1, -1] as const) for (const yaw of [0, 1.1, -2.4]) for (const t of [0, 2, 6, 15]) {
      const s = subject(40 + t * 9 * Math.sin(yaw), -30 + t * 9 * Math.cos(yaw), yaw); const shot: Shot = { name, side, anchor: subject(40, -30, yaw) }; const f = shotFrame(shot, s, t);
      expect(f.pos[1], `${name} camera height`).toBeGreaterThan(0.2); expect(f.fov).toBeGreaterThanOrEqual(30); expect(f.fov).toBeLessThanOrEqual(55);
      const dist = Math.hypot(f.pos[0] - s.x, f.pos[1] - s.y, f.pos[2] - s.z); expect(dist, `${name} too close`).toBeGreaterThan(2);
      if (name !== "street_static" && name !== "ground_static") { expect(dist).toBeLessThan(20); const toLook = Math.hypot(f.look[0] - s.x, f.look[2] - s.z); expect(toLook).toBeLessThan(5); }
    }
  });
  it("the low tracking shot looks at the front wheel hub from just above the road", () => {
    const s = subject(10, 5, 0.7); const f = shotFrame({ name: "low_wheel", side: 1, anchor: s }, s, 3);
    const hub = at(s, w / 2 - 0.1, -h / 2 + spec.wheelR, spec.wheelBase / 2); expect(f.look).toEqual(hub); expect(f.look[1]).toBeCloseTo(spec.wheelR, 9);
    expect(f.pos[1]).toBeLessThan(0.5); expect(Math.hypot(f.pos[0] - hub[0], f.pos[2] - hub[2])).toBeLessThan(2.6);
  });
  it("tracking shots move rigidly with the car; fixed shots stay where they were set", () => {
    const a = subject(0, 0, 0), b = subject(0, 30, 0);
    for (const name of ["low_wheel", "chase_wide", "front_quarter", "side_track"] as const) { const fa = shotFrame({ name, side: 1, anchor: a }, a, 0), fb = shotFrame({ name, side: 1, anchor: a }, b, 2); expect(fb.pos[2] - fa.pos[2]).toBeCloseTo(30, 9); expect(fb.pos[0]).toBeCloseTo(fa.pos[0], 9); }
    for (const name of ["street_static", "ground_static"] as const) expect(shotFrame({ name, side: 1, anchor: a }, b, 2).pos).toEqual(shotFrame({ name, side: 1, anchor: a }, a, 0).pos);
  });
  it("vehicle-local axes: +z is ahead of the car and +x is its left", () => {
    const s = subject(0, 0, Math.PI / 2); // facing +x
    expect(at(s, 0, 0, 5)[0]).toBeCloseTo(5, 9); expect(at(s, 0, 0, 5)[2]).toBeCloseTo(0, 9); expect(at(s, 2, 0, 0)[2]).toBeCloseTo(-2, 9);
  });
});

describe("capture autopilot", () => {
  /** Drive the real handling model along a route under the autopilot. */
  function drive(pts: [number, number][], kmh: number, seconds: number) {
    let st: DriveState = { speed: 0, steer: 0, yaw: Math.atan2(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) }, x = pts[0][0], z = pts[0][1], index = 0, worst = 0, top = 0, done = false; const DT = 1 / 60;
    for (let i = 0; i < seconds * 60 && !done; i++) { const p = pursue(pts, x, z, st.yaw, st.speed, kmh / 3.6, index); index = p.index; done ||= p.done; worst = Math.max(worst, p.crossTrack); top = Math.max(top, st.speed);
      st = stepDriving(st, spec, { throttle: p.throttle, steer: p.steer, brake: false }, st.speed, DT); x += Math.sin(st.yaw) * st.speed * DT; z += Math.cos(st.yaw) * st.speed * DT; }
    return { x, z, worst, top, done, speed: st.speed };
  }
  it("follows a straight road, holds the target speed and stops at the end", () => {
    const r = drive([[0, 0], [0, 200]], 40, 60); expect(r.done).toBe(true); expect(r.worst).toBeLessThan(0.3); expect(r.top).toBeGreaterThan(10); expect(r.top).toBeLessThan(40 / 3.6 + 0.6);
    expect(r.speed).toBeGreaterThanOrEqual(0); expect(r.speed).toBeLessThan(0.7); expect(Math.hypot(r.x, r.z - 200)).toBeLessThan(6); expect(r.z).toBeLessThanOrEqual(200.5); // stops short of the end, never past it
  });
  it("takes left and right junction turns and an S-bend without leaving a 7 m carriageway", () => {
    for (const pts of [[[0, 0], [0, 80], [80, 80], [80, 160]], [[0, 0], [0, 80], [-80, 80], [-80, 0]], [[0, 0], [10, 40], [-10, 80], [10, 120], [0, 160]]] as [number, number][][]) {
      const r = drive(pts, 32, 90); expect(r.done).toBe(true); expect(r.worst, JSON.stringify(pts)).toBeLessThan(3.2); const end = pts[pts.length - 1]; expect(Math.hypot(r.x - end[0], r.z - end[1])).toBeLessThan(8); }
  });
  it("steers right when the line is to the right and left when it is to the left", () => {
    // Heading +z, so +x is the car's left. At x = +3 the line is to the right: steer right (positive, like the D key).
    expect(pursue([[0, 0], [0, 50]], 3, 0, 0, 8, 10).steer).toBeGreaterThan(0.2); expect(pursue([[0, 0], [0, 50]], -3, 0, 0, 8, 10).steer).toBeLessThan(-0.2);
    expect(pursue([[0, 0], [0, 50]], 0, 0, 0, 8, 10).steer).toBeCloseTo(0, 9);
  });
  it("never selects reverse and stops for a one-point route", () => {
    for (const v of [0, 0.3, 0.6]) expect(pursue([[0, 0], [0, 50]], 0, 49.5, 0, v, 10).throttle).toBe(0);
    expect(pursue([[0, 0]], 0, 0, 0, 5, 10)).toMatchObject({ done: true, throttle: -1 }); expect(pursue([[0, 0]], 0, 0, 0, 0, 10).throttle).toBe(0);
  });
});
