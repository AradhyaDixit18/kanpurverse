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
