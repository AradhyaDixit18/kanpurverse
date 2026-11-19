import { describe, it, expect } from "vitest";
import { VEHICLE_SPECS, VEHICLE_SPAWNS, vehicleSeatPose, type VehicleKind } from "@kanpurverse/shared";
import { plateText, wheelGeometry } from "../apps/web/src/game/vehicleModels";

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
});
