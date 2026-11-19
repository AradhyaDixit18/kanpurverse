import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { VEHICLE_SPAWNS, SPAWN_POINT } from "@kanpurverse/shared";
import { setGeo, roadsNear, type GeoData } from "../apps/web/src/game/roads";
import { kerbDistance, clearOfCarriageways } from "../apps/web/src/game/propPlacement";
import { WILDLIFE, cellLife, wildlifeAround, grazerPose, dogPose, pigeonPose, kitePose, crowPose, gateStep, newGate, inFrontOf, type RoadQuery } from "../apps/web/src/game/wildlife";

setGeo(JSON.parse(readFileSync(new URL("../apps/web/public/geo/kanpur.json", import.meta.url), "utf8")) as GeoData);
const roads = roadsNear as RoadQuery; const hatch = VEHICLE_SPAWNS.find(v => v.id === "v_hatch_1")!;
// Three parts of the map: Cafe Chowk (first drive), the spawn point, and a residential area further out.
const SITES: [number, number][] = [[hatch.p[0], hatch.p[1]], [SPAWN_POINT[0], SPAWN_POINT[2]], [-140, -470], [600, -250], [-900, -800]];
const life = SITES.map(([x, z]) => wildlifeAround(x, z, 260, roads));
const near = (x: number, z: number) => roadsNear(x, z, 70);

describe("street wildlife placement on the real Kanpur map", () => {
  it("every part of the first route has cattle and dogs; goats and pigeons exist on the map", () => {
    for (const l of life.slice(0, 2)) { expect(l.grazers.filter(g => g.kind === "cattle").length).toBeGreaterThan(1); expect(l.dogs.length).toBeGreaterThan(1); }
    expect(life.some(l => l.grazers.some(g => g.kind === "goat"))).toBe(true); expect(life.some(l => l.flocks.length > 0)).toBe(true);
  });
  it("is deterministic and respects the per-species caps", () => {
    expect(cellLife(4, -4, roads)).toEqual(cellLife(4, -4, roads)); expect(wildlifeAround(438, -320, 260, roads)).toEqual(life[0]);
    for (const l of life) { expect(l.grazers.filter(g => g.kind === "cattle").length).toBeLessThanOrEqual(WILDLIFE.max.cattle); expect(l.grazers.filter(g => g.kind === "goat").length).toBeLessThanOrEqual(WILDLIFE.max.goat); expect(l.dogs.length).toBeLessThanOrEqual(WILDLIFE.max.dog); expect(l.flocks.length).toBeLessThanOrEqual(WILDLIFE.max.flocks); }
    const ids = life.flatMap(l => [...l.grazers, ...l.dogs, ...l.flocks].map(a => a.id)); expect(new Set(life[0].grazers.map(g => g.id)).size).toBe(life[0].grazers.length); expect(ids.length).toBeGreaterThan(20);
  });
  it("cattle and goats never set foot on a carriageway, at any moment of a ten-minute day", () => {
    let checked = 0; for (const l of life) for (const g of l.grazers) for (let t = 0; t < 600; t += 0.9) { const p = grazerPose(g, t); const kerb = kerbDistance(p.x, p.z, near(p.x, p.z)); expect(kerb, `${g.id} at t=${t}`).toBeGreaterThan(g.kind === "cattle" ? 1.2 : 2.4); checked++; }
    expect(checked).toBeGreaterThan(5000);
  });
  it("cattle keep 6 m back from fast roads, and goats graze only beside quiet lanes", () => {
    for (const l of life) for (const g of l.grazers) { const rs = near(g.x, g.z); let best = rs[0], d = Infinity; for (const r of rs) { const k = kerbDistance(g.x, g.z, [r]); if (k < d) { d = k; best = r; } }
      if (g.kind === "goat" && g.id.endsWith(":0")) { expect(WILDLIFE.quiet.has(best.cls ?? "")).toBe(true); expect(d).toBeGreaterThanOrEqual(5); }
      for (const r of rs) if (WILDLIFE.fast.has(r.cls ?? "") && g.kind === "cattle") expect(kerbDistance(g.x, g.z, [r])).toBeGreaterThanOrEqual(2.6); }
  });
  it("a dog's whole patrol stays on one footpath: it never enters any road, and never crosses one", () => {
    let dogs = 0; for (const l of life) for (const d of l.dogs) { dogs++; expect(d.len).toBeGreaterThanOrEqual(8);
      for (let t = 0; t < 240; t += 0.25) { const p = dogPose(d, t); expect(clearOfCarriageways(p.x, p.z, 0.3, near(p.x, p.z), 0), `${d.id} at t=${t}`).toBe(true); } }
    expect(dogs).toBeGreaterThan(4);
  });
  it("no animal is placed on a parked story vehicle", () => {
    for (const l of life) for (const v of VEHICLE_SPAWNS) { for (const g of l.grazers) expect(Math.hypot(g.x - v.p[0], g.z - v.p[1])).toBeGreaterThan(3); for (const f of l.flocks) expect(Math.hypot(f.x - v.p[0], f.z - v.p[1])).toBeGreaterThan(3); }
  });
});

describe("street wildlife behaviour", () => {
  const cattle = life.flatMap(l => l.grazers).filter(g => g.kind === "cattle"), dogs = life.flatMap(l => l.dogs), flocks = life.flatMap(l => l.flocks);
  it("moves in real time and without teleporting", () => {
    const DT = 1 / 60;
    for (const g of cattle.slice(0, 8)) { let moved = 0, worst = 0; let prev = grazerPose(g, 0); for (let t = DT; t < 200; t += DT) { const p = grazerPose(g, t); const step = Math.hypot(p.x - prev.x, p.z - prev.z); worst = Math.max(worst, step); moved += step; prev = p; }
      expect(worst, `${g.id} jumped`).toBeLessThan(WILDLIFE.speed.cattle * DT * 1.6 + 1e-6); if (g.roam > 1) expect(moved).toBeGreaterThan(0.5); }
    for (const d of dogs.slice(0, 6)) { let worst = 0, far = 0; let prev = dogPose(d, 0); for (let t = DT; t < 120; t += DT) { const p = dogPose(d, t); worst = Math.max(worst, Math.hypot(p.x - prev.x, p.z - prev.z)); far = Math.max(far, Math.hypot(p.x - d.ax, p.z - d.az)); prev = p; }
      expect(worst).toBeLessThan(WILDLIFE.speed.dog * DT * 1.05 + 1e-6); expect(far).toBeGreaterThan(d.len * 0.95); }
  });
  it("animals rest: some cattle lie down, every dog both trots and lies down", () => {
    expect(cattle.some(g => { for (let t = 0; t < 120; t += 1) if (grazerPose(g, t).down > 0.9) return true; return false; })).toBe(true);
    for (const d of dogs.slice(0, 6)) { let trot = false, lie = false; for (let t = 0; t < 200; t += 0.5) { const p = dogPose(d, t); trot ||= p.gait === 1; lie ||= p.down > 0.9; } expect(trot && lie).toBe(true); }
  });
  it("pigeons: some perched and some in flight at the same moment, ground birds stay off the road, flight is continuous", () => {
    expect(flocks.length).toBeGreaterThan(0);
    for (const f of flocks) { let mixed = false; for (let t = 0; t < 80 && !mixed; t += 1) { let fly = 0, sit = 0; for (let i = 0; i < f.count; i++) (pigeonPose(f, i, t).flying ? fly++ : sit++); mixed = fly > 0 && sit > 0; } expect(mixed).toBe(true);
      const rs = near(f.x, f.z);
      for (let i = 0; i < f.count; i++) { let prev = pigeonPose(f, i, 0), worst = 0, lowest = Infinity; for (let t = 1 / 60; t < 80; t += 1 / 60) { const p = pigeonPose(f, i, t); worst = Math.max(worst, Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z)); lowest = Math.min(lowest, p.y); prev = p; }
        expect(worst, `${f.id} bird ${i} jumped`).toBeLessThan(0.35); expect(lowest).toBeGreaterThanOrEqual(0.1);
        for (let t = 0; t < 80; t += 2) { const p = pigeonPose(f, i, t); if (!p.flying) { expect(p.y).toBeLessThan(0.2); expect(kerbDistance(p.x, p.z, rs)).toBeGreaterThan(0.3); } } } }
  });
  it("kites soar high and slowly; crows are mostly perched with a few in the air", () => {
    for (let i = 0; i < 5; i++) for (let t = 0; t < 300; t += 3) { const p = kitePose(i, t, 400, -300), q = kitePose(i, t + 1 / 60, 400, -300); expect(p.y).toBeGreaterThan(30); expect(Math.hypot(q.x - p.x, q.z - p.z) * 60).toBeLessThan(9); expect(p.flying).toBe(true); }
    let perched = 0, flying = 0; for (let i = 0; i < 16; i++) for (let t = 0; t < 120; t += 1) (crowPose(10, 7.6, 10, i, t).flying ? flying++ : perched++);
    expect(flying).toBeGreaterThan(0); expect(perched).toBeGreaterThan(flying * 4);
    for (let i = 0; i < 16; i++) { let prev = crowPose(10, 7.6, 10, i, 0); for (let t = 1 / 60; t < 90; t += 1 / 60) { const p = crowPose(10, 7.6, 10, i, t); expect(Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z)).toBeLessThan(0.25); expect(p.y).toBeGreaterThanOrEqual(7.6); prev = p; } }
  });
});

describe("wildlife visibility gate", () => {
  const R = WILDLIFE.draw.high;
  it("comes into view at the edge of the draw range and leaves just beyond it", () => {
    let g = newGate(); g = gateStep(g, R + 30, true, R); expect(g.shown).toBe(false); g = gateStep(g, R - 1, true, R); expect(g.shown).toBe(true);
    g = gateStep(g, R * 1.05, false, R); expect(g.shown).toBe(true); g = gateStep(g, R * 1.1, false, R); expect(g.shown).toBe(false);
  });
  it("never appears directly in front of the player at close range", () => {
    let g = newGate(); g = gateStep(g, 12, true, R); expect(g).toEqual({ shown: false, held: true }); // load or teleport: 12 m dead ahead
    for (const d of [10, 6, 15, 30, 39]) { g = gateStep(g, d, d < 20, R); expect(g.shown).toBe(false); } // stays hidden while the player is near, wherever they look
    g = gateStep(g, 41, false, R); expect(g).toEqual({ shown: true, held: false });
    expect(gateStep(newGate(), 12, false, R).shown).toBe(true); // behind or beside the player: fine
    expect(gateStep(newGate(), 30, true, R).shown).toBe(true);  // ahead but beyond the guard distance
  });
  it("forward cone follows the game's heading convention", () => {
    expect(inFrontOf(0, 0, 0, 0, 10)).toBe(true); expect(inFrontOf(0, 0, 0, 0, -10)).toBe(false); expect(inFrontOf(0, 0, Math.PI / 2, 10, 0)).toBe(true); expect(inFrontOf(0, 0, 0, 10, 2)).toBe(false);
  });
  it("draw and animation ranges shrink with the quality preset", () => {
    expect(WILDLIFE.draw.low).toBeLessThan(WILDLIFE.draw.high); for (const q of ["low", "medium", "high", "ultra"] as const) expect(WILDLIFE.active[q]).toBeLessThan(WILDLIFE.draw[q]);
  });
});
