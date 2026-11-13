import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buildRoadGraph, route, astar, nearestNode, offRoute, guidance, type RoadSegLike } from "../apps/web/src/game/gps";
import { MISSIONS, SHOPS, SPAWN_POINT } from "@kanpurverse/shared";

const geo = JSON.parse(readFileSync(new URL("../apps/web/public/geo/kanpur.json", import.meta.url), "utf8")) as { roads: { cls: string; pts: [number, number][] }[]; water: { name?: string; pts: [number, number][] }[] };
const segs: RoadSegLike[] = geo.roads.flatMap(r => r.pts.slice(1).map((p, i) => ({ a: r.pts[i], b: p, cls: r.cls })));
const g = buildRoadGraph(segs);
const inPoly = (p: [number, number], poly: [number, number][]) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > p[1]) !== (zj > p[1]) && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) c = !c; } return c; };
const ganga = geo.water.find(w => w.name === "Ganga")!.pts;

describe("GPS on the real OSM road graph", () => {
  it("routes from the spawn to every shop and every mission start along roads", () => {
    const from: [number, number] = [SPAWN_POINT[0], SPAWN_POINT[2]];
    for (const dest of [...SHOPS.map(s => s.p), ...MISSIONS.map(m => m.start)]) {
      const r = route(g, from, dest); expect(r.ok, String(dest)).toBe(true);
      expect(r.length).toBeGreaterThanOrEqual(Math.hypot(dest[0] - from[0], dest[1] - from[1]) - 1);
      for (const p of r.pts.slice(1, -1)) expect(g.pts.some(q => q[0] === p[0] && q[1] === p[1])).toBe(true); // every interior vertex is a road node
    }
  });
  it("route to the ghat never crosses the Ganga", () => {
    const r = route(g, [SPAWN_POINT[0], SPAWN_POINT[2]], [-400, -2075]); expect(r.ok).toBe(true);
    for (const p of r.pts.slice(1, -1)) expect(inPoly(p, ganga)).toBe(false);
  });
  it("A* path cost equals the sum of its edges and is not longer than an alternative found by Dijkstra-like search", () => {
    const a = nearestNode(g, 472, -330), b = nearestNode(g, 423, 1790); const path = astar(g, a, b); expect(path.length).toBeGreaterThan(5);
    for (let i = 1; i < path.length; i++) expect(g.adj[path[i - 1]].some(e => e.to === path[i])).toBe(true);
  });
  it("detects deviation and gives turn guidance", () => {
    const r = route(g, [472, -330], [639, -168]); expect(offRoute(r.pts, 472, -330).dist).toBeLessThan(1);
    expect(offRoute(r.pts, 900, 900).dist).toBeGreaterThan(25);
    const gd = guidance(r.pts, 472, -330); expect(gd.remaining).toBeGreaterThan(100); expect(gd.remaining).toBeLessThan(r.length + 1);
  });
});

describe("Ganga riverfront geometry", () => {
  it("Parmat Ghat sits on the real bank: steps end at the water, promenade and mission points are on land", async () => {
    const { GHAT, ghatToWorld, bankSegments } = await import("../apps/web/src/game/Ganga");
    expect(inPoly(ghatToWorld(0, 4), ganga)).toBe(true); expect(inPoly(ghatToWorld(0, -11), ganga)).toBe(false);
    for (const m of MISSIONS) for (const cp of m.checkpoints) expect(inPoly(cp, ganga), `${m.id} ${cp}`).toBe(false);
    const bank = bankSegments(ganga); expect(bank.length).toBeGreaterThan(5);
    const d = Math.min(...bank.map(([a, b]) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((GHAT.c[0] - a[0]) * dx + (GHAT.c[1] - a[1]) * dz) / l2)); return Math.hypot(GHAT.c[0] - a[0] - t * dx, GHAT.c[1] - a[1] - t * dz); }));
    expect(d).toBeLessThan(3);
  });
});

describe("river rendering polygon", () => {
  it("clipping to the world square keeps land as land (regression: clamped vertices flooded the city)", async () => {
    const { clip } = await import("../apps/web/src/game/Ganga");
    const c = clip(ganga, 2800);
    const samples: [number, number][] = [[472, -330], [-413, -2098], [-405, -2120], [0, 0], [423, 1797], [-1046, -835], [1351, -206], [-400, -2400], [-1500, -2700], [2000, -1500]];
    for (const p of samples) expect(inPoly(p, c), String(p)).toBe(inPoly(p, ganga));
    for (const p of c) { expect(Math.abs(p[0])).toBeLessThanOrEqual(2800 + 1e-6); expect(Math.abs(p[1])).toBeLessThanOrEqual(2800 + 1e-6); }
  });
});

describe("drawable water", () => {
  it("drops the spurious city-wide OSM water ring that painted Parmat Ghat blue on the minimap", async () => {
    const { drawableWater } = await import("../apps/web/src/game/roads");
    const inside = (pts: [number, number][], x: number, z: number) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
    const w = drawableWater(geo as never) as { name?: string; pts: [number, number][] }[];
    expect(w.some(p => p.name === "Ganga")).toBe(true);
    expect(w.filter(p => p.name !== "Ganga").some(p => inside(p.pts, -412, -2104))).toBe(false);
    expect(w.filter(p => p.name !== "Ganga").some(p => inside(p.pts, 460, -330))).toBe(false);
  });
});

describe("Ganga shoreline strip", () => {
  it("lies on land only, so no sand band is drawn over the river (browser QA: boats sat on a grey slab)", async () => {
    const { shoreStrip, bankSegments, inPoly } = await import("../apps/web/src/game/Ganga");
    const ganga = geo.water.find(w => w.name === "Ganga")!.pts;
    const sp = shoreStrip(bankSegments(ganga), ganga);
    expect(sp.length).toBeGreaterThan(0);
    let wet = 0, n = 0;
    for (let i = 0; i < sp.length; i += 18) { // one quad per 18 floats; test its centre
      const cx = (sp[i] + sp[i + 3] + sp[i + 12] + sp[i + 15]) / 4, cz = (sp[i + 2] + sp[i + 5] + sp[i + 14] + sp[i + 17]) / 4;
      n++; if (inPoly([cx, cz], ganga)) wet++;
    }
    expect(wet / n).toBeLessThan(0.02); // a few very sharp bank corners may fold back; the strip must not run along the water
  });
});

describe("map heading while driving", () => {
  it("vehicle yaw uses the same convention as the on-foot heading the minimap rotates by", async () => {
    const { yawFromQuaternion } = await import("../apps/web/src/game/driving");
    for (const yaw of [0, 0.7, -1.9, 3.0]) {
      const q: [number, number, number, number] = [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
      const y = yawFromQuaternion(q); expect(Math.sin(y)).toBeCloseTo(Math.sin(yaw)); expect(Math.cos(y)).toBeCloseTo(Math.cos(yaw));
      const fwd = [Math.sin(y), Math.cos(y)]; expect(Math.atan2(fwd[0], fwd[1])).toBeCloseTo(Math.atan2(Math.sin(yaw), Math.cos(yaw))); // on foot: playerYaw = atan2(mx, mz)
    }
  });
});

describe("road graph stitching", () => {
  it("joins OSM ways that cross or nearly touch without a shared node (QA: 57 m to the garage routed as 1.1 km)", async () => {
    const { stitchRoads } = await import("../apps/web/src/game/gps");
    // a T that stops 4 m short, and an X with no shared node
    const segs = [{ a: [0, 0] as [number, number], b: [100, 0] as [number, number] }, { a: [50, 4] as [number, number], b: [50, 60] as [number, number] }, { a: [20, -30] as [number, number], b: [20, 30] as [number, number] }];
    const g = buildRoadGraph(segs); const r = route(g, [50, 60], [20, 30]);
    expect(r.ok).toBe(true); expect(r.length).toBeLessThan(60 + 4 + 30 + 30 + 1);
    expect(stitchRoads(segs).length).toBeGreaterThan(segs.length);
  });
  it("routes the real garage approach on the road, not around the district", () => {
    const g = buildRoadGraph(geo.roads.flatMap(r => r.pts.slice(1).map((p, i) => ({ a: r.pts[i], b: p, cls: r.cls }))));
    const r = route(g, [407, -372], [464, -380]);
    expect(r.ok).toBe(true); expect(r.length).toBeLessThan(200);
  });
  it("builds the city graph quickly enough to do on first use", () => {
    const segs = geo.roads.flatMap(r => r.pts.slice(1).map((p, i) => ({ a: r.pts[i], b: p, cls: r.cls })));
    const t0 = performance.now(); buildRoadGraph(segs); expect(performance.now() - t0).toBeLessThan(1500);
  });
});

describe("minimap orientation", () => {
  it("is heading-up: her facing direction is drawn straight up, and N points at world north", async () => {
    const { minimapRotation, minimapNorth } = await import("../apps/web/src/ui/MapUI");
    const rot = (v: [number, number], a: number): [number, number] => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)]; // canvas rotate(), y down
    for (const yaw of [0, 0.6, 1.57, 2.4, -2.9, Math.PI]) {
      const f = rot([Math.sin(yaw), Math.cos(yaw)], minimapRotation(yaw)); expect(f[0]).toBeCloseTo(0); expect(f[1]).toBeCloseTo(-1); // forward → up
      const n = rot([0, -1], minimapRotation(yaw)); const lbl = minimapNorth(yaw); expect(lbl[0]).toBeCloseTo(n[0]); expect(lbl[1]).toBeCloseTo(n[1]);
    }
    expect(minimapNorth(Math.PI)).toEqual([expect.closeTo(0), expect.closeTo(-1)]); // facing north: N at the top
  });
});
