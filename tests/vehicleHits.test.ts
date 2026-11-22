import { describe, it, expect } from "vitest";
import { relation, throwDir, HitReaction, type CarPose } from "../apps/web/src/game/vehicleHits";

const car = (o: Partial<CarPose> = {}): CarPose => ({ x: 0, z: 0, yaw: 0, speed: 10, halfW: 0.86, halfL: 1.95, ...o }); // yaw 0 drives towards +z

describe("relation", () => {
  it("measures ahead and to the right", () => { const r = relation(1, 5, car()); expect(r.f).toBeCloseTo(5); expect(r.l).toBeCloseTo(1); expect(r.side).toBe(1); });
  it("hits a person inside the footprint only when moving", () => { expect(relation(0.3, 1.5, car()).hit).toBe(true); expect(relation(0.3, 1.5, car({ speed: 0.5 })).hit).toBe(false); expect(relation(2, 0, car()).hit).toBe(false); });
  it("threatens a person in the path ahead, not one behind or well to the side", () => {
    expect(relation(0.5, 6, car()).threat).toBe(true); expect(relation(0.5, -6, car()).threat).toBe(false); expect(relation(4, 6, car()).threat).toBe(false);
  });
  it("treats behind as ahead when reversing", () => { expect(relation(0, -5, car({ speed: -6 })).threat).toBe(true); });
  it("respects heading", () => { const r = relation(6, 0, car({ yaw: Math.PI / 2 })); expect(r.f).toBeCloseTo(6); expect(r.threat).toBe(true); });
});

describe("throwDir", () => {
  it("throws forward and out to the person's side, as a unit vector", () => { const c = car(), d = throwDir(relation(0.5, 1, c), c); expect(Math.hypot(d[0], d[1])).toBeCloseTo(1); expect(d[1]).toBeGreaterThan(0); expect(d[0]).toBeGreaterThan(0); });
});

describe("HitReaction", () => {
  it("steps aside from an approaching car, away from its path", () => {
    const h = new HitReaction(); let x = 0.5; const o = h.step(x, 6, 1 / 60, car()); x += o.dx; expect(o.busy).toBe(true); expect(o.dx).toBeGreaterThan(0); expect(o.lie).toBe(0);
  });
  it("stops dodging after a few metres", () => { const h = new HitReaction(); let moved = 0; for (let i = 0; i < 600; i++) moved += Math.abs(h.step(0.5, 6, 1 / 60, car()).dx); expect(moved).toBeLessThan(3.2); });
  it("is knocked down, slides, lies still, then gets up", () => {
    const h = new HitReaction(); const first = h.step(0.2, 1.2, 1 / 60, car()); expect(first.struck).toBe(true);
    let slide = 0, maxLie = 0, t = 0, last = 1; while (t < 4) { const o = h.step(0, 0, 1 / 60, null); slide += Math.hypot(o.dx, o.dz); maxLie = Math.max(maxLie, o.lie); t += 1 / 60; last = o.lie; }
    expect(maxLie).toBe(1); expect(slide).toBeGreaterThan(0.5); expect(slide).toBeLessThan(3); expect(last).toBe(0); expect(h.down).toBe(false);
  });
  it("cannot be struck again while already down", () => { const h = new HitReaction(); h.step(0.2, 1.2, 1 / 60, car()); const o = h.step(0.2, 1.2, 1 / 60, car()); expect(o.struck).toBe(false); expect(o.busy).toBe(true); });
  it("does nothing with no car nearby", () => { const o = new HitReaction().step(0, 0, 1 / 60, null); expect(o).toMatchObject({ dx: 0, dz: 0, lie: 0, busy: false, struck: false }); });
});
