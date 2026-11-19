import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { VEHICLE_SPAWNS, NPCS } from "@kanpurverse/shared";
import { setGeo, getRoads, roadsNear, segPoint, type GeoData } from "../apps/web/src/game/roads";
import { propSpotClear, clearOfCarriageways, clearOfParkedVehicles, clearOfStandingPeople, kerbDistance, distToRoad, PROP_RADIUS, stallPeople } from "../apps/web/src/game/propPlacement";

setGeo(JSON.parse(readFileSync(new URL("../apps/web/public/geo/kanpur.json", import.meta.url), "utf8")) as GeoData);
const cross = [{ a: [-50, 0] as [number, number], b: [50, 0] as [number, number], w: 10 }, { a: [0, -50] as [number, number], b: [0, 50] as [number, number], w: 8 }];

describe("roadside prop placement", () => {
  it("rejects a stall that would stand in a crossing road's lane and accepts one on the footpath", () => {
    expect(clearOfCarriageways(2, 6.8, PROP_RADIUS.stall, cross)).toBe(false); // beside road A but inside road B
    expect(clearOfCarriageways(20, 6.8, PROP_RADIUS.stall, cross)).toBe(true);
    expect(clearOfCarriageways(20, 5.5, PROP_RADIUS.stall, cross)).toBe(false); // overhangs the kerb
    expect(distToRoad(0, 60, cross[1])).toBeCloseTo(10, 9); expect(kerbDistance(20, 9, cross)).toBeCloseTo(4, 9); expect(kerbDistance(20, 0, cross)).toBeLessThan(0);
  });
  it("keeps every parked story vehicle and standing character clear", () => {
    for (const v of VEHICLE_SPAWNS) { expect(clearOfParkedVehicles(v.p[0], v.p[1], PROP_RADIUS.stall)).toBe(false); expect(clearOfParkedVehicles(v.p[0] + 1.5, v.p[1] + 1.5, PROP_RADIUS.stall)).toBe(false); }
    expect(clearOfParkedVehicles(10_000, 10_000, PROP_RADIUS.stall)).toBe(true);
    const standing = NPCS.filter(n => n.speed === 0); expect(standing.length).toBeGreaterThan(3);
    for (const n of standing) expect(clearOfStandingPeople(n.path[0][0] + 0.5, n.path[0][1], PROP_RADIUS.stall)).toBe(false);
  });
  it("on the real Kanpur map, no generated stall or pole near Cafe Chowk sits in a lane or inside a parked vehicle", () => {
    // Same generator as Props.tsx: stalls every 44 m at kerb + 1.8 m, poles every 36 m at kerb + 2.9 m.
    const hatch = VEHICLE_SPAWNS.find(v => v.id === "v_hatch_1")!; const segs = roadsNear(hatch.p[0], hatch.p[1], 260).filter(s => s.len > 18 && s.cls !== "service");
    expect(segs.length).toBeGreaterThan(20); let kept = 0, dropped = 0, onCar = 0;
    for (const r of segs) for (let d = 22; d < r.len; d += 44) for (const side of [1, -1]) { const p = segPoint(r, d, side * (r.w / 2 + 1.8)); const near = roadsNear(p[0], p[1], 40);
      if (!clearOfParkedVehicles(p[0], p[1], PROP_RADIUS.stall)) onCar++;
      if (propSpotClear(p[0], p[1], PROP_RADIUS.stall, near)) { kept++; expect(kerbDistance(p[0], p[1], near)).toBeGreaterThanOrEqual(PROP_RADIUS.stall + 0.3 - 1e-9); for (const v of VEHICLE_SPAWNS) expect(Math.hypot(v.p[0] - p[0], v.p[1] - p[1])).toBeGreaterThan(3); } else dropped++; }
    expect(kept).toBeGreaterThan(40); // the street stays dressed
    expect(dropped).toBeGreaterThan(0); expect(onCar).toBeGreaterThan(0); // the old generator did put stalls on parked vehicles here
    for (const r of segs) for (let d = 14; d < r.len; d += 36) { const p = segPoint(r, d, r.w / 2 + 2.9); const near = roadsNear(p[0], p[1], 40); if (clearOfCarriageways(p[0], p[1], PROP_RADIUS.pole, near)) expect(kerbDistance(p[0], p[1], near)).toBeGreaterThan(0.4); }
    expect(getRoads().length).toBeGreaterThan(1000);
  });
  it("stands a vendor behind each stall and customers in front, never in the carriageway", () => {
    // Same generator as Props.tsx, including the turn that makes far-side stalls face their road.
    const hatch = VEHICLE_SPAWNS.find(v => v.id === "v_hatch_1")!; const segs = roadsNear(hatch.p[0], hatch.p[1], 260).filter(s => s.len > 18 && s.cls !== "service"); let vendors = 0, customers = 0;
    for (const r of segs) for (let d = 22; d < r.len; d += 44) for (const side of [1, -1]) { const p = segPoint(r, d, side * (r.w / 2 + 1.8)); const near = roadsNear(p[0], p[1], 40); if (!propSpotClear(p[0], p[1], PROP_RADIUS.stall, near)) continue;
      const rot = Math.atan2(r.dx, r.dz) + Math.PI / 2 + (side < 0 ? Math.PI : 0); const seed = Math.abs(Math.round(p[0] * 13 + p[1] * 7));
      expect(stallPeople({ p, rot, kind: "cycle" }, seed)).toEqual([]);
      for (const who of stallPeople({ p, rot, kind: "chai" }, seed)) { const own = distToRoad(who.x, who.z, r) - r.w / 2;
        if (who.role === "vendor") { vendors++; expect(own).toBeGreaterThan(2.5); expect(who.yaw).toBeCloseTo(rot, 9); } else { customers++; expect(own).toBeGreaterThan(0.3); expect(own).toBeLessThan(1.8); }
        expect(Math.hypot(who.x - p[0], who.z - p[1])).toBeGreaterThan(0.9); } }
    expect(vendors).toBeGreaterThan(40); expect(customers).toBeGreaterThan(vendors * 0.4); expect(customers).toBeLessThan(vendors);
  });
});
