import { describe, it, expect } from "vitest";
import { SPECIES, SPECIES_LIST, blueprint, fruitRipeness, seasonFromMonth, stopColour, FRUIT_STAGES, treeSites, pickSpecies, ROAD_WEIGHTS, rng, pointInPoly, type Season, type SiteInput } from "../packages/shared/src/trees";

const seasons: Season[] = ["summer", "monsoon", "winter"];

describe("seasons", () => {
  it("maps months to Kanpur's three seasons", () => {
    expect(seasonFromMonth(3)).toBe("summer"); expect(seasonFromMonth(6)).toBe("monsoon"); expect(seasonFromMonth(10)).toBe("winter"); expect(seasonFromMonth(0)).toBe("winter"); expect(seasonFromMonth(-1)).toBe("winter");
  });
  it("only fruiting species have a ripeness, and only in their seasons", () => {
    expect(fruitRipeness("neem", "monsoon")).toBeNull(); expect(fruitRipeness("mango", "winter")).toBeNull(); expect(fruitRipeness("jamun", "summer")).toBeNull();
    expect(fruitRipeness("mango", "summer")![1]).toBeLessThan(fruitRipeness("mango", "monsoon")![0] + 0.3); expect(fruitRipeness("guava", "winter")).not.toBeNull();
  });
});

describe("blueprint", () => {
  it("is deterministic for a seed and varies between seeds", () => {
    expect(blueprint("neem", 5, "monsoon")).toEqual(blueprint("neem", 5, "monsoon")); expect(blueprint("neem", 5, "monsoon")).not.toEqual(blueprint("neem", 6, "monsoon"));
  });
  it("builds a sane tree for every species and season", () => {
    for (const sp of SPECIES_LIST) for (const se of seasons) for (let seed = 0; seed < 8; seed++) {
      const b = blueprint(sp, seed, se); expect(b.blobs.length, sp).toBe(SPECIES[sp].blobs); expect(b.trunk.h).toBeGreaterThan(1); expect(b.trunk.r).toBeGreaterThan(0.05);
      for (const bl of b.blobs) { expect(bl.p[1], sp).toBeGreaterThan(b.trunk.h * 0.9); expect(bl.p[1] - bl.s[1], sp).toBeGreaterThanOrEqual(SPECIES[sp].clear - 1e-6); expect(bl.color).toMatch(/^#[0-9a-f]{6}$/); }
      for (const br of b.branches) expect(br.r).toBeGreaterThan(0);
    }
  });
  it("gives street-tree crowns room under the chase camera", () => {
    for (const sp of ["neem", "peepal", "mango", "jamun", "gulmohar", "amaltas"] as const) for (let seed = 0; seed < 20; seed++) { const b = blueprint(sp, seed, "monsoon", 0.82); for (const bl of b.blobs) expect(bl.p[1] - bl.s[1], `${sp} ${seed}`).toBeGreaterThan(3.4); }
  });
  it("makes mango and jamun fruit in season, hanging below the crown centre, and none out of season", () => {
    const m = blueprint("mango", 3, "monsoon"); expect(m.fruit.length).toBeGreaterThan(8); expect(m.fruit.every(f => f.p[1] < Math.max(...m.blobs.map(b => b.p[1])))).toBe(true);
    expect(blueprint("jamun", 3, "monsoon").fruit.length).toBeGreaterThan(15); expect(blueprint("jamun", 3, "summer").fruit.length).toBe(0); expect(blueprint("mango", 3, "winter").fruit.length).toBe(0); expect(blueprint("neem", 3, "monsoon").fruit.length).toBe(0);
  });
  it("shows raw green mangoes in summer and ripe ones in the monsoon", () => {
    const avg = (s: Season) => { const f = blueprint("mango", 11, s).fruit; return f.reduce((a, x) => a + x.stage, 0) / f.length; };
    expect(avg("summer")).toBeLessThan(0.35); expect(avg("monsoon")).toBeGreaterThan(0.55);
  });
  it("flowers gulmohar red and amaltas yellow in summer only", () => {
    const red = (s: Season) => blueprint("gulmohar", 9, s).blobs.filter(b => /^#(d|e|c)/.test(b.color)).length;
    expect(red("summer")).toBeGreaterThan(red("monsoon")); expect(blueprint("amaltas", 4, "summer").blobs.some(b => /^#(e|d|f)/.test(b.color))).toBe(true);
  });
  it("gives the banyan aerial roots and a wide flat crown", () => {
    const b = blueprint("banyan", 2, "monsoon"); expect(b.roots.length).toBeGreaterThan(5); const w = Math.max(...b.blobs.map(x => Math.abs(x.p[0]))); expect(w).toBeGreaterThan(1); expect(b.blobs[0].s[1]).toBeLessThan(b.blobs[0].s[0]);
  });
  it("keeps fruit colours on their ripeness ramp", () => { expect(stopColour(FRUIT_STAGES.jamun, 0)).toBe(FRUIT_STAGES.jamun[0]); expect(stopColour(FRUIT_STAGES.jamun, 1)).toBe(FRUIT_STAGES.jamun[3]); });
});

describe("species choice", () => {
  it("honours the weights over many draws", () => {
    const r = rng(1); const n: Record<string, number> = {}; for (let i = 0; i < 4000; i++) { const s = pickSpecies(r(), ROAD_WEIGHTS); n[s] = (n[s] ?? 0) + 1; }
    expect(n.neem).toBeGreaterThan(n.jamun); expect(n.banyan).toBeUndefined(); expect(Object.keys(n).length).toBe(Object.keys(ROAD_WEIGHTS).length);
  });
});

const sq = (x0: number, z0: number, x1: number, z1: number): [number, number][] => [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]];
const base = (): SiteInput => ({ roads: [{ id: 1, cls: "secondary", w: 12, pts: [[-300, 0], [300, 0]] }, { id: 2, cls: "residential", w: 7, pts: [[0, -300], [0, -20]] }], buildings: [{ pts: sq(40, 12, 70, 40) }], rails: [{ pts: [[-300, 120], [300, 120]] }], water: [{ pts: sq(-200, -60, -160, -30) }], parks: [{ id: 9, pts: sq(100, 100, 220, 220) }], avoid: [{ x: 150, z: 0, r: 20 }] });

describe("treeSites", () => {
  const sites = treeSites(base(), 3);
  it("is deterministic", () => { expect(treeSites(base(), 3)).toEqual(sites); expect(treeSites(base(), 4)).not.toEqual(sites); });
  it("plants street trees beside the road and park trees inside the park", () => {
    const road = sites.filter(s => s.where === "road"), park = sites.filter(s => s.where === "park");
    expect(road.length).toBeGreaterThan(10); expect(park.length).toBeGreaterThan(5);
    for (const s of park) expect(pointInPoly([s.x, s.z], sq(100, 100, 220, 220))).toBe(true);
  });
  it("never plants on a road, in a building, on rails, in water or in a reserved area", () => {
    for (const s of sites) {
      if (s.where === "road") { const d1 = Math.abs(s.z), onMain = Math.abs(s.x) <= 300; if (onMain && Math.abs(s.x) > 8) expect(d1, `${s.x},${s.z}`).toBeGreaterThan(6 + 1.3 - 0.01); }
      expect(pointInPoly([s.x, s.z], sq(40, 12, 70, 40))).toBe(false); expect(Math.abs(s.z - 120)).toBeGreaterThanOrEqual(6); expect(pointInPoly([s.x, s.z], sq(-200, -60, -160, -30))).toBe(false); expect(Math.hypot(s.x - 150, s.z)).toBeGreaterThanOrEqual(20);
    }
  });
  it("keeps trunks at least 7 m apart", () => { for (let i = 0; i < sites.length; i++) for (let j = i + 1; j < sites.length; j++) expect(Math.hypot(sites[i].x - sites[j].x, sites[i].z - sites[j].z)).toBeGreaterThanOrEqual(7 - 1e-6); });
  it("plants avenues: neighbouring street trees often share a species", () => {
    const row = sites.filter(s => s.where === "road" && Math.abs(s.z) < 12 && s.z > 0).sort((a, b) => a.x - b.x); let same = 0; for (let i = 1; i < row.length; i++) if (row[i].species === row[i - 1].species) same++;
    expect(same / Math.max(1, row.length - 1)).toBeGreaterThan(0.45);
  });
  it("skips bridges and unlisted road classes", () => {
    const i = base(); i.roads = [{ id: 5, cls: "service", w: 5, pts: [[0, 0], [200, 0]] }, { id: 6, cls: "primary", w: 16, bridge: true, pts: [[0, 50], [200, 50]] }]; i.parks = []; expect(treeSites(i, 1)).toHaveLength(0);
  });
});
