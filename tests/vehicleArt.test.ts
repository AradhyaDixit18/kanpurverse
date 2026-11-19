import { describe, it, expect } from "vitest";
import { VEHICLE_SPECS, VEHICLE_SPAWNS, vehicleSeatPose, type VehicleKind } from "@kanpurverse/shared";
import { plateText, wheelGeometry, profileGeometry } from "../apps/web/src/game/vehicleModels";

describe("vehicle detail", () => {
  it("registration plates use the Kanpur Nagar code in the Indian layout", () => {
    const seen = new Set<string>(); for (const v of VEHICLE_SPAWNS) { const t = plateText(v.kind, v.color); expect(t).toMatch(/^UP 78 [A-HJ-NPR-Z]{2} \d{4}$/); seen.add(t); }
    expect(seen.size).toBeGreaterThan(VEHICLE_SPAWNS.length * 0.7); expect(plateText("hatchback", 0xc8102e)).toBe(plateText("hatchback", 0xc8102e));
  });
  it("tyre and rim geometry: axle along x, tread at the wheel radius, rim inside the tyre", () => {
    for (const k of Object.keys(VEHICLE_SPECS) as VehicleKind[]) { const R = VEHICLE_SPECS[k].wheelR, width = VEHICLE_SPECS[k].cls === "heavy" ? 0.32 : 0.21; const g = wheelGeometry(R, width);
      const radius = (geo: typeof g.tyre) => { const p = geo.getAttribute("position"); let max = 0, x0 = Infinity, x1 = -Infinity; for (let i = 0; i < p.count; i++) { max = Math.max(max, Math.hypot(p.getY(i), p.getZ(i))); x0 = Math.min(x0, p.getX(i)); x1 = Math.max(x1, p.getX(i)); } return { max, x0, x1 }; };
      const t = radius(g.tyre), r = radius(g.rim); expect(t.max).toBeCloseTo(R, 5); expect(t.x1).toBeLessThanOrEqual(width / 2 * 1.031); expect(t.x0).toBeGreaterThanOrEqual(-width / 2 * 1.031);
      expect(r.max).toBeLessThan(R * 0.67); expect(r.max).toBeGreaterThan(R * 0.6); expect(r.x1).toBeLessThan(width / 2); expect(wheelGeometry(R, width)).toBe(g); }
  });
  it("car occupants sit above the cabin floor, so no feet show under the sill", () => {
    for (const k of Object.keys(VEHICLE_SPECS) as VehicleKind[]) { const s = VEHICLE_SPECS[k]; if (s.cls !== "car") continue;
      for (const seat of ["driver", "passenger"] as const) { const p = vehicleSeatPose(k, seat); expect(p.p[1] + s.size[1] / 2).toBeGreaterThanOrEqual(0.22); expect(p.p[1] + s.size[1] / 2 + 1.12 * p.scale).toBeLessThan(s.size[1] - 0.04); } }
  });
  it("swept bodywork keeps to its drawn profile and width, with outward faces", () => {
    const pts: [number, number][] = [[-0.04, 0.3], [-0.1, 0.56], [-0.2, 0.73], [-0.5, 0.76], [-0.8, 0.74], [-0.93, 0.66], [-0.94, 0.56], [-0.84, 0.45], [-0.62, 0.39], [-0.3, 0.31]];
    const g = profileGeometry("test-body", pts, 0.42, 0.06); g.computeBoundingBox(); const b = g.boundingBox!;
    expect(b.max.x).toBeCloseTo(0.21, 2); expect(b.min.x).toBeCloseTo(-0.21, 2);
    // the curve may bulge a little between points, never by more than a few centimetres
    expect(b.min.z).toBeGreaterThan(-1.0); expect(b.min.z).toBeLessThan(-0.9); expect(b.max.z).toBeLessThan(0.02); expect(b.min.y).toBeGreaterThan(0.24); expect(b.max.y).toBeLessThan(0.8);
    expect(profileGeometry("test-body", pts, 0.42, 0.06)).toBe(g);
    // closed and outward-facing: signed volume is positive and about profile area times width
    const p = g.getAttribute("position"); let vol = 0; const idx = g.getIndex(); const n = idx ? idx.count : p.count; const at = (k: number) => { const i = idx ? idx.getX(k) : k; return [p.getX(i), p.getY(i), p.getZ(i)]; };
    for (let k = 0; k < n; k += 3) { const [ax, ay, az] = at(k), [bx, by, bz] = at(k + 1), [cx, cy, cz] = at(k + 2); vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6; }
    expect(vol).toBeGreaterThan(0.08); expect(vol).toBeLessThan(0.16);
  });
});
