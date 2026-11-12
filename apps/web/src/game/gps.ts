/**
 * GPS: A* over the real OSM road graph (the same segments the city is built from), so routes follow drivable roads
 * and never cut through buildings or the Ganga. Nodes are segment endpoints welded at 0.5 m; junctions shared by OSM
 * ways become graph junctions. Pure functions plus a tiny cache; the GPS component (GpsRuntime.tsx) owns recalculation.
 */
export interface RoadSegLike { a: [number, number]; b: [number, number]; cls?: string }
export interface RoadGraph { pts: [number, number][]; adj: { to: number; w: number }[][]; grid: Map<string, number[]>; /** connected-component id per node; 0 is the largest network */ comp: Int32Array }
const key = (x: number, z: number) => `${Math.round(x * 2)}:${Math.round(z * 2)}`;
const cell = (x: number, z: number) => `${Math.floor(x / 60)}:${Math.floor(z / 60)}`;

/**
 * OSM ways often cross, or stop a few metres short of another road, without sharing a node. Left as is, the graph has
 * no junction there and routes detour (final QA: 57 m to the garage became a 1.1 km loop). Split segments at real
 * crossings and join dangling ends to a road they nearly touch. Motorway/trunk crossings are left alone (flyovers).
 */
export function stitchRoads(segsIn: RoadSegLike[], snap = 6): RoadSegLike[] {
  const segs = segsIn.filter(s => s.cls !== "footway" && s.cls !== "path" && s.cls !== "steps" && (s.a[0] !== s.b[0] || s.a[1] !== s.b[1]));
  const C = 60; const grid = new Map<string, number[]>(); const cuts: number[][] = segs.map(() => []); const extra: RoadSegLike[] = [];
  segs.forEach((s, i) => { const x0 = Math.floor((Math.min(s.a[0], s.b[0]) - snap) / C), x1 = Math.floor((Math.max(s.a[0], s.b[0]) + snap) / C), z0 = Math.floor((Math.min(s.a[1], s.b[1]) - snap) / C), z1 = Math.floor((Math.max(s.a[1], s.b[1]) + snap) / C); for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const k = `${x}:${z}`; (grid.get(k) ?? grid.set(k, []).get(k)!).push(i); } });
  const ends = new Map<string, number>(); for (const s of segs) for (const p of [s.a, s.b]) { const k = key(p[0], p[1]); ends.set(k, (ends.get(k) ?? 0) + 1); }
  const fly = (s: RoadSegLike) => s.cls === "motorway" || s.cls === "trunk";
  const seen = new Set<string>();
  for (const cellList of grid.values()) for (let m = 0; m < cellList.length; m++) for (let n = m + 1; n < cellList.length; n++) {
    const i = cellList[m], j = cellList[n]; const pk = i < j ? `${i},${j}` : `${j},${i}`; if (seen.has(pk)) continue; seen.add(pk);
    const A = segs[i], B = segs[j]; const rx = A.b[0] - A.a[0], rz = A.b[1] - A.a[1], sx = B.b[0] - B.a[0], sz = B.b[1] - B.a[1]; const den = rx * sz - rz * sx;
    if (Math.abs(den) > 1e-9 && !(fly(A) || fly(B))) { const qx = B.a[0] - A.a[0], qz = B.a[1] - A.a[1]; const t = (qx * sz - qz * sx) / den, u = (qx * rz - qz * rx) / den; if (t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999) { cuts[i].push(t); cuts[j].push(u); continue; } }
    // dangling end of one segment close to the interior of the other
    for (const [P, Q, qi] of [[A, B, j], [B, A, i]] as [RoadSegLike, RoadSegLike, number][]) for (const e of [P.a, P.b]) {
      if ((ends.get(key(e[0], e[1])) ?? 0) > 1) continue; const dx = Q.b[0] - Q.a[0], dz = Q.b[1] - Q.a[1], l2 = dx * dx + dz * dz; if (!l2) continue;
      const t = ((e[0] - Q.a[0]) * dx + (e[1] - Q.a[1]) * dz) / l2; if (t <= 0.001 || t >= 0.999) continue; const px = Q.a[0] + t * dx, pz = Q.a[1] + t * dz; const d = Math.hypot(e[0] - px, e[1] - pz);
      if (d <= snap) { cuts[qi].push(t); if (d > 0.01) extra.push({ a: [e[0], e[1]], b: [px, pz], cls: P.cls }); } // always bridge: 0.5 m welding can still split a 0.2 m gap
    }
  }
  const out: RoadSegLike[] = [];
  segs.forEach((s, i) => { if (!cuts[i].length) { out.push(s); return; } const ts = [0, ...cuts[i].sort((x, y) => x - y), 1]; let prev: [number, number] = s.a; for (let k = 1; k < ts.length; k++) { const t = ts[k]; const p: [number, number] = k === ts.length - 1 ? s.b : [s.a[0] + (s.b[0] - s.a[0]) * t, s.a[1] + (s.b[1] - s.a[1]) * t]; if (Math.hypot(p[0] - prev[0], p[1] - prev[1]) > 0.05) { out.push({ a: prev, b: p, cls: s.cls }); prev = p; } } });
  return out.concat(extra);
}

export function buildRoadGraph(segsRaw: RoadSegLike[]): RoadGraph {
  const segs = stitchRoads(segsRaw);
  const index = new Map<string, number>(); const pts: [number, number][] = []; const adj: { to: number; w: number }[][] = []; const grid = new Map<string, number[]>();
  const node = (p: [number, number]) => { const k = key(p[0], p[1]); let i = index.get(k); if (i === undefined) { i = pts.length; index.set(k, i); pts.push([p[0], p[1]]); adj.push([]); const c = cell(p[0], p[1]); (grid.get(c) ?? grid.set(c, []).get(c)!).push(i); } return i; };
  for (const s of segs) { if (s.cls === "footway" || s.cls === "path" || s.cls === "steps") continue; const a = node(s.a), b = node(s.b); if (a === b) continue; const w = Math.hypot(s.a[0] - s.b[0], s.a[1] - s.b[1]); adj[a].push({ to: b, w }); adj[b].push({ to: a, w }); }
  // Label connected components so endpoints always snap onto the main network (OSM has many isolated stubs).
  const comp = new Int32Array(pts.length).fill(-1); const sizes: number[] = [];
  for (let i = 0; i < pts.length; i++) { if (comp[i] >= 0) continue; const id = sizes.length; let n = 0; const stack = [i]; comp[i] = id; while (stack.length) { const c = stack.pop()!; n++; for (const e of adj[c]) if (comp[e.to] < 0) { comp[e.to] = id; stack.push(e.to); } } sizes.push(n); }
  const main = sizes.indexOf(Math.max(...sizes, 0)); for (let i = 0; i < comp.length; i++) comp[i] = comp[i] === main ? 0 : comp[i] + 1;
  return { pts, adj, grid, comp };
}
export function nearestNode(g: RoadGraph, x: number, z: number, maxR = 900): number {
  let best = -1, bd = Infinity; const cx = Math.floor(x / 60), cz = Math.floor(z / 60);
  for (let r = 0; r * 60 <= maxR && best < 0; r++) for (let i = cx - r; i <= cx + r; i++) for (let j = cz - r; j <= cz + r; j++) { if (Math.max(Math.abs(i - cx), Math.abs(j - cz)) !== r) continue; for (const n of g.grid.get(`${i}:${j}`) ?? []) { if (!g.adj[n].length || g.comp[n] !== 0) continue; const d = Math.hypot(g.pts[n][0] - x, g.pts[n][1] - z); if (d < bd) { bd = d; best = n; } } }
  return best;
}
/** A* with a straight-line heuristic. Returns node indices or [] when unreachable. */
export function astar(g: RoadGraph, start: number, goal: number, maxVisits = 60000): number[] {
  if (start < 0 || goal < 0) return []; if (start === goal) return [start];
  const h = (n: number) => Math.hypot(g.pts[n][0] - g.pts[goal][0], g.pts[n][1] - g.pts[goal][1]);
  const gs = new Map<number, number>([[start, 0]]); const came = new Map<number, number>(); const open = new MinHeap(); open.push(start, h(start)); const closed = new Set<number>(); let visits = 0;
  while (open.size && visits++ < maxVisits) {
    const cur = open.pop()!; if (cur === goal) { const path = [cur]; let c = cur; while (came.has(c)) { c = came.get(c)!; path.push(c); } return path.reverse(); }
    if (closed.has(cur)) continue; closed.add(cur); const base = gs.get(cur)!;
    for (const e of g.adj[cur]) { const t = base + e.w; if (t < (gs.get(e.to) ?? Infinity)) { gs.set(e.to, t); came.set(e.to, cur); open.push(e.to, t + h(e.to)); } }
  }
  return [];
}
export interface Route { from: [number, number]; to: [number, number]; pts: [number, number][]; length: number; ok: boolean }
/** Route between two world points along roads; endpoints are joined to the nearest road node. */
export function route(g: RoadGraph, from: [number, number], to: [number, number]): Route {
  const a = nearestNode(g, from[0], from[1]), b = nearestNode(g, to[0], to[1]); const nodes = astar(g, a, b);
  if (!nodes.length) return { from, to, pts: [from, to], length: Math.hypot(to[0] - from[0], to[1] - from[1]), ok: false };
  const pts: [number, number][] = [from, ...nodes.map(n => g.pts[n]), to]; let length = 0; for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return { from, to, pts, length, ok: true };
}
/** Distance from a point to a polyline, and the index of the closest segment. */
export function offRoute(pts: [number, number][], x: number, z: number) {
  let best = Infinity, at = 0; for (let i = 0; i + 1 < pts.length; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)); const d = Math.hypot(x - ax - t * dx, z - az - t * dz); if (d < best) { best = d; at = i; } }
  return { dist: best, seg: at };
}
/** Remaining distance from the closest point on the route, and the next turn (≥35°) ahead. */
export function guidance(pts: [number, number][], x: number, z: number) {
  const { seg } = offRoute(pts, x, z); let remaining = Math.hypot(pts[seg + 1]?.[0] - x, pts[seg + 1]?.[1] - z) || 0;
  for (let i = seg + 1; i + 1 < pts.length; i++) remaining += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  let along = Math.hypot(pts[seg + 1]?.[0] - x, pts[seg + 1]?.[1] - z) || 0;
  for (let i = seg + 1; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], [cx, cz] = pts[i + 1]; const ux = bx - ax, uz = bz - az, vx = cx - bx, vz = cz - bz;
    const lu = Math.hypot(ux, uz), lv = Math.hypot(vx, vz); if (lu < 0.5 || lv < 0.5) { along += lv; continue; }
    const ang = Math.acos(Math.max(-1, Math.min(1, (ux * vx + uz * vz) / (lu * lv))));
    if (ang > 0.61) { const cross = ux * vz - uz * vx; return { remaining, turn: { in: along, dir: (cross > 0 ? "right" : "left") as "left" | "right" } }; }
    along += lv;
  }
  return { remaining, turn: undefined };
}

class MinHeap { private a: { n: number; f: number }[] = []; get size() { return this.a.length; }
  push(n: number, f: number) { const a = this.a; a.push({ n, f }); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a; if (!a.length) return undefined; const top = a[0].n; const last = a.pop()!; if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; } }
