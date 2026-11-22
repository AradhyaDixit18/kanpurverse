/**
 * Tree species, blueprints and placement. Pure and deterministic (no three.js, no React, no Math.random), so the same seed
 * always grows the same tree and the whole module is unit-tested.
 *
 * Species are the trees seen on North Indian streets and in parks. Sizes, colours and fruiting seasons are typical for the
 * species, simplified for a game; they are not botanical measurements. Fruiting is seasonal: mango and jamun fruit in
 * summer and the early monsoon, guava in the monsoon and winter. Gulmohar and amaltas flower in summer.
 */
export type Species = "neem" | "peepal" | "banyan" | "mango" | "ashoka" | "gulmohar" | "amaltas" | "jamun" | "eucalyptus" | "guava";
export type Season = "summer" | "monsoon" | "winter";
export type FruitKind = "mango" | "jamun" | "guava";
export type V3 = [number, number, number];

export interface SpeciesSpec {
  name: string; nameHi: string;
  trunkH: [number, number]; trunkR: [number, number]; trunkColor: string;
  /** Number of leaf masses, their spread around the trunk (m), radius range (m) and vertical squash (1 = round). */
  blobs: number; spread: number; blobR: [number, number]; squash: number;
  /** Crown centre height above the trunk top, as a multiple of the blob radius. */
  lift: number;
  greens: string[];
  /** Flowering: in these seasons `share` of the leaf masses turn these colours. */
  flower?: { seasons: Season[]; colors: string[]; share: number };
  fruit?: { kind: FruitKind; perBlob: [number, number]; size: number; seasons: Season[] };
  /** Hanging aerial roots (banyan). */
  roots?: boolean;
  /** Lowest the underside of the crown may hang (m). Street trees stay above 3.5 m so buses and the chase camera pass beneath. */
  clear: number;
}

export const SPECIES: Record<Species, SpeciesSpec> = {
  neem:       { name: "Neem", nameHi: "नीम", trunkH: [3.2, 4.2], trunkR: [0.22, 0.34], trunkColor: "#6a5646", blobs: 5, spread: 1.5, blobR: [1.5, 2.1], squash: 0.82, lift: 0.9, greens: ["#4f7a38", "#5b8740", "#456f33", "#668f45"] , clear: 3.5 },
  peepal:     { name: "Peepal", nameHi: "पीपल", trunkH: [3.6, 4.8], trunkR: [0.26, 0.4], trunkColor: "#8a8478", blobs: 6, spread: 1.9, blobR: [1.6, 2.3], squash: 0.8, lift: 0.8, greens: ["#6f9a3e", "#7aa545", "#5f8a38", "#84ad4a"] , clear: 3.5 },
  banyan:     { name: "Banyan", nameHi: "बरगद", trunkH: [2.8, 3.4], trunkR: [0.5, 0.7], trunkColor: "#7d7466", blobs: 8, spread: 3.6, blobR: [2.0, 2.8], squash: 0.52, lift: 0.7, greens: ["#3f6b30", "#4a7736", "#385f2b"], roots: true , clear: 3.2 },
  mango:      { name: "Mango", nameHi: "आम", trunkH: [2.4, 3.2], trunkR: [0.28, 0.42], trunkColor: "#4e3a2b", blobs: 5, spread: 1.5, blobR: [1.7, 2.3], squash: 0.85, lift: 0.8, greens: ["#2f5a2a", "#386532", "#2a5126", "#3f7036"], fruit: { kind: "mango", perBlob: [3, 6], size: 1, seasons: ["summer", "monsoon"] } , clear: 3.5 },
  ashoka:     { name: "Ashoka", nameHi: "अशोक", trunkH: [2.6, 3.4], trunkR: [0.16, 0.24], trunkColor: "#5d4a3a", blobs: 4, spread: 0.45, blobR: [1.0, 1.35], squash: 1.5, lift: 1.4, greens: ["#2f5f33", "#376b3a", "#2a5530"] , clear: 3.2 },
  gulmohar:   { name: "Gulmohar", nameHi: "गुलमोहर", trunkH: [3.0, 3.8], trunkR: [0.22, 0.32], trunkColor: "#6e5b49", blobs: 6, spread: 2.3, blobR: [1.5, 2.0], squash: 0.6, lift: 0.8, greens: ["#6d9a3c", "#78a443", "#5f8b36"], flower: { seasons: ["summer"], colors: ["#d8472b", "#e8642a", "#cf3a2a"], share: 0.8 } , clear: 3.5 },
  amaltas:    { name: "Amaltas", nameHi: "अमलतास", trunkH: [2.8, 3.6], trunkR: [0.16, 0.26], trunkColor: "#6a5a49", blobs: 5, spread: 1.7, blobR: [1.2, 1.7], squash: 0.75, lift: 0.9, greens: ["#7aa545", "#86af4c", "#6f9a3e"], flower: { seasons: ["summer"], colors: ["#e8c433", "#dcae2a", "#f0d04a"], share: 0.85 } , clear: 3.5 },
  jamun:      { name: "Jamun", nameHi: "जामुन", trunkH: [3.0, 4.0], trunkR: [0.24, 0.36], trunkColor: "#5a4a3c", blobs: 5, spread: 1.3, blobR: [1.5, 2.1], squash: 1.0, lift: 1.0, greens: ["#2d5a33", "#356638", "#285029", "#3b6e3c"], fruit: { kind: "jamun", perBlob: [6, 11], size: 1, seasons: ["monsoon"] } , clear: 3.5 },
  eucalyptus: { name: "Eucalyptus", nameHi: "सफ़ेदा", trunkH: [5.4, 7.4], trunkR: [0.14, 0.22], trunkColor: "#cdc5b4", blobs: 3, spread: 0.9, blobR: [1.0, 1.4], squash: 1.15, lift: 1.0, greens: ["#6f8f78", "#7b9a82", "#668670"] , clear: 4.0 },
  guava:      { name: "Guava", nameHi: "अमरूद", trunkH: [1.5, 2.1], trunkR: [0.1, 0.16], trunkColor: "#8b7358", blobs: 4, spread: 0.8, blobR: [0.9, 1.25], squash: 0.85, lift: 0.8, greens: ["#82ad4e", "#8ab655", "#779f47"], fruit: { kind: "guava", perBlob: [2, 4], size: 1, seasons: ["monsoon", "winter"] } , clear: 1.2 },
};
export const SPECIES_LIST = Object.keys(SPECIES) as Species[];

export const SEASONS: readonly Season[] = ["summer", "monsoon", "winter"];
/** Kanpur: hot dry summer March to May, monsoon June to September, cooler winter October to February. */
export function seasonFromMonth(month0: number): Season { const m = ((month0 % 12) + 12) % 12; return m >= 2 && m <= 4 ? "summer" : m >= 5 && m <= 8 ? "monsoon" : "winter"; }

/** Fruit size in metres (long axis). Slightly exaggerated so fruit reads from the street. */
export const FRUIT_SIZE: Record<FruitKind, number> = { mango: 0.2, jamun: 0.07, guava: 0.11 };
/** Colour stops from unripe (0) to ripe (1). */
export const FRUIT_STAGES: Record<FruitKind, string[]> = {
  mango: ["#6b9a2e", "#a9bf37", "#e0b52c", "#e08a26"],
  jamun: ["#5f8a3a", "#a8466e", "#5a1f4a", "#241033"],
  guava: ["#8fb446", "#b3c944", "#d6d452"],
};
/** Ripeness range of the crop for a species in a season, or null when the tree carries no fruit. */
export function fruitRipeness(sp: Species, season: Season): [number, number] | null {
  const f = SPECIES[sp].fruit; if (!f || !f.seasons.includes(season)) return null;
  if (f.kind === "mango") return season === "summer" ? [0, 0.3] : [0.55, 1];
  if (f.kind === "jamun") return [0.25, 1];
  return season === "monsoon" ? [0.1, 0.7] : [0.4, 1];
}

/** Small fast deterministic generator (mulberry32). */
export function rng(seed: number): () => number {
  let a = (seed | 0) + 0x6d2b79f5;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const range = (r: () => number, [a, b]: [number, number]) => lerp(a, b, r());
function hex(c: string): [number, number, number] { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function toHex(c: [number, number, number]) { return "#" + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join(""); }
/** Colour along a list of stops, t in [0, 1]. */
export function stopColour(stops: string[], t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i, a = hex(stops[i]), b = hex(stops[i + 1]);
  return toHex([lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)]);
}
/** Brighten or darken a hex colour by a factor around 1. */
export function shade(c: string, k: number) { const a = hex(c); return toHex([a[0] * k, a[1] * k, a[2] * k]); }

export interface Blob { p: V3; s: V3; color: string }
export interface Branch { from: V3; to: V3; r: number }
export interface Fruit { p: V3; size: number; color: string; stage: number }
export interface Root { p: V3; h: number; r: number }
export interface TreeBlueprint {
  species: Species; trunk: { h: number; r: number; color: string };
  branches: Branch[]; blobs: Blob[]; fruit: Fruit[]; roots: Root[];
}

/** Local-space blueprint of one tree (origin at the foot of the trunk, y up). `scale` is the age and vigour of the tree. */
export function blueprint(species: Species, seed: number, season: Season, scale = 1): TreeBlueprint {
  const sp = SPECIES[species], r = rng(seed);
  let h = range(r, sp.trunkH) * scale; const tr = range(r, sp.trunkR) * scale;
  const blobs: Blob[] = [], branches: Branch[] = [], fruit: Fruit[] = [], roots: Root[] = [];
  const flowering = !!sp.flower && sp.flower.seasons.includes(season);
  const lean = (r() - 0.5) * 0.5; // the crown drifts a little off the trunk line
  for (let j = 0; j < sp.blobs; j++) {
    const ang = j * 2.399963 + r() * 0.9, rad = j === 0 ? 0 : sp.spread * Math.sqrt((j + r() * 0.6) / sp.blobs) * (0.7 + 0.5 * r()) * scale;
    const br = range(r, sp.blobR) * scale * (j === 0 ? 1.12 : 0.95);
    const stack = species === "ashoka" || species === "eucalyptus" ? (j - (sp.blobs - 1) / 2) * br * 0.95 : (j % 3) * 0.3 * br * (species === "banyan" ? 0.2 : 1);
    const p: V3 = [Math.cos(ang) * rad + lean, h + br * sp.lift + stack, Math.sin(ang) * rad];
    const s: V3 = [br, br * sp.squash, br];
    const bloom = flowering && r() < sp.flower!.share;
    const color = bloom ? sp.flower!.colors[Math.floor(r() * sp.flower!.colors.length)] : shade(sp.greens[Math.floor(r() * sp.greens.length)], 0.92 + r() * 0.16);
    blobs.push({ p, s, color });
  }
  // Keep the underside of the crown above the clearance: lift the crown and lengthen the trunk by the shortfall.
  const shortfall = Math.max(0, sp.clear - Math.min(...blobs.map(b => b.p[1] - b.s[1])));
  h += shortfall; for (const b of blobs) b.p[1] += shortfall;
  blobs.forEach((b, j) => { if (j > 0 || species === "ashoka") branches.push({ from: [0, h * (0.78 + 0.2 * r()), 0], to: [b.p[0] * 0.8, b.p[1] - b.s[1] * 0.45, b.p[2] * 0.8], r: Math.max(0.04, tr * (0.42 - 0.04 * j)) }); });
  const ripe = fruitRipeness(species, season);
  if (sp.fruit && ripe) {
    const kind = sp.fruit.kind, base = FRUIT_SIZE[kind];
    for (const b of blobs) {
      const n = Math.round(range(r, sp.fruit.perBlob)); const bunch = kind === "jamun" ? 3 : 1;
      for (let k = 0; k < n; k += bunch) {
        const th = r() * Math.PI * 2, el = -(0.12 + 0.75 * r()), dx = Math.cos(th) * Math.cos(el), dy = Math.sin(el), dz = Math.sin(th) * Math.cos(el);
        const stage = lerp(ripe[0], ripe[1], r());
        for (let q = 0; q < bunch && k + q < n; q++) {
          const jx = (r() - 0.5) * 0.22, jy = (r() - 0.5) * 0.18, jz = (r() - 0.5) * 0.22; // a bunch hangs together
          fruit.push({ p: [b.p[0] + dx * b.s[0] * 0.93 + jx, b.p[1] + dy * b.s[1] * 0.93 + jy, b.p[2] + dz * b.s[2] * 0.93 + jz], size: base * (0.85 + 0.3 * r()) * sp.fruit.size, color: stopColour(FRUIT_STAGES[kind], Math.min(1, Math.max(0, stage + (r() - 0.5) * 0.2))), stage });
        }
      }
    }
  }
  if (sp.roots) { const n = 7 + Math.floor(r() * 4); for (let k = 0; k < n; k++) { const b = blobs[1 + Math.floor(r() * (blobs.length - 1))], ang = r() * Math.PI * 2, d = r() * b.s[0] * 0.7; const x = b.p[0] + Math.cos(ang) * d, z = b.p[2] + Math.sin(ang) * d; roots.push({ p: [x, 0, z], h: b.p[1] - b.s[1] * 0.5, r: 0.05 + r() * 0.07 }); } }
  return { species, trunk: { h, r: tr, color: sp.trunkColor }, branches, blobs, fruit, roots };
}

/** Weighted species choice. */
export const ROAD_WEIGHTS: Partial<Record<Species, number>> = { neem: 28, peepal: 10, mango: 8, ashoka: 14, gulmohar: 10, amaltas: 7, jamun: 5, eucalyptus: 9 };
export const PARK_WEIGHTS: Partial<Record<Species, number>> = { neem: 16, peepal: 12, banyan: 5, mango: 14, jamun: 12, guava: 10, ashoka: 10, gulmohar: 8, amaltas: 6, eucalyptus: 4 };
export function pickSpecies(u: number, weights: Partial<Record<Species, number>>): Species {
  const entries = Object.entries(weights) as [Species, number][]; const total = entries.reduce((s, e) => s + e[1], 0); let x = u * total;
  for (const [sp, w] of entries) { if ((x -= w) < 0) return sp; } return entries[entries.length - 1][0];
}

// ---- geometry helpers (also used by placement) ----
export type P2 = [number, number];
export function pointInPoly(p: P2, poly: P2[]) { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > p[1]) !== (zj > p[1]) && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) inside = !inside; } return inside; }
export function polyArea(poly: P2[]) { let a = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]); return Math.abs(a / 2); }
export function bbox(poly: P2[]) { let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity; for (const [x, z] of poly) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z; } return { x0, z0, x1, z1 }; }
export function distToSegment(p: P2, a: P2, b: P2) { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz); }
/** Smooth value noise in [0, 1] on a coarse grid, for neighbourhood-scale density. */
export function valueNoise(x: number, z: number, seed = 0) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const h = (a: number, b: number) => rng(a * 73856093 ^ b * 19349663 ^ seed)();
  return lerp(lerp(h(ix, iz), h(ix + 1, iz), sx), lerp(h(ix, iz + 1), h(ix + 1, iz + 1), sx), sz);
}

export interface TreeSite { x: number; z: number; species: Species; seed: number; scale: number; where: "road" | "park" }
export interface SiteRoad { id: number; cls: string; w: number; pts: P2[]; bridge?: boolean }
export interface SiteInput { roads: SiteRoad[]; buildings: { pts: P2[] }[]; rails: { pts: P2[] }[]; water: { pts: P2[] }[]; parks: { id?: number; pts: P2[] }[]; avoid: { x: number; z: number; r: number }[] }

const SPACING: Record<string, number> = { primary: 24, secondary: 21, tertiary: 18, unclassified: 19, residential: 15, living_street: 13 };

class Grid<T> {
  private m = new Map<string, T[]>();
  constructor(private cell: number) {}
  key(cx: number, cz: number) { return cx + "," + cz; }
  add(x0: number, z0: number, x1: number, z1: number, v: T) { for (let cx = Math.floor(x0 / this.cell); cx <= Math.floor(x1 / this.cell); cx++) for (let cz = Math.floor(z0 / this.cell); cz <= Math.floor(z1 / this.cell); cz++) { const k = this.key(cx, cz); (this.m.get(k) ?? this.m.set(k, []).get(k)!).push(v); } }
  at(x: number, z: number): T[] { return this.m.get(this.key(Math.floor(x / this.cell), Math.floor(z / this.cell))) ?? []; }
}

/**
 * Where trees stand. Street trees line the roads in avenues (a stretch of road mostly shares one species) just outside the
 * carriageway, thinner in some neighbourhoods than others. Park trees fill the parks. Nothing grows on a road, inside a
 * building, on a railway, in water, or inside a reserved gameplay area, and no two trunks are closer than 7 m.
 */
export function treeSites(inp: SiteInput, seed = 1): TreeSite[] {
  const roadGrid = new Grid<{ a: P2; b: P2; w: number; id: number }>(48); const bGrid = new Grid<P2[]>(48); const railGrid = new Grid<{ a: P2; b: P2 }>(48);
  for (const r of inp.roads) for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1]; roadGrid.add(Math.min(a[0], b[0]) - 8, Math.min(a[1], b[1]) - 8, Math.max(a[0], b[0]) + 8, Math.max(a[1], b[1]) + 8, { a, b, w: r.w, id: r.id }); }
  for (const b of inp.buildings) { const bb = bbox(b.pts); bGrid.add(bb.x0 - 1, bb.z0 - 1, bb.x1 + 1, bb.z1 + 1, b.pts); }
  for (const r of inp.rails) for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1]; railGrid.add(Math.min(a[0], b[0]) - 8, Math.min(a[1], b[1]) - 8, Math.max(a[0], b[0]) + 8, Math.max(a[1], b[1]) + 8, { a, b }); }
  const taken = new Grid<P2>(8); const out: TreeSite[] = [];
  const free = (x: number, z: number, ownRoad: number | null): boolean => {
    const p: P2 = [x, z];
    for (const s of roadGrid.at(x, z)) { if (s.id === ownRoad) continue; if (distToSegment(p, s.a, s.b) < s.w / 2 + 1.3) return false; }
    for (const poly of bGrid.at(x, z)) if (pointInPoly(p, poly)) return false;
    for (const s of railGrid.at(x, z)) if (distToSegment(p, s.a, s.b) < 6) return false;
    for (const w of inp.water) { const bb = bbox(w.pts); if (x > bb.x0 - 1 && x < bb.x1 + 1 && z > bb.z0 - 1 && z < bb.z1 + 1 && pointInPoly(p, w.pts)) return false; }
    for (const a of inp.avoid) if (Math.hypot(a.x - x, a.z - z) < a.r + 2) return false;
    for (const t of taken.at(x, z)) if (Math.hypot(t[0] - x, t[1] - z) < 7) return false;
    return true;
  };
  const place = (x: number, z: number, species: Species, rr: () => number, where: "road" | "park", own: number | null) => {
    if (!free(x, z, own)) return; taken.add(x - 7, z - 7, x + 7, z + 7, [x, z]);
    out.push({ x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, species, seed: Math.floor(rr() * 1e9), scale: 0.82 + rr() * 0.4, where });
  };
  for (const r of inp.roads) {
    const spacing = SPACING[r.cls]; if (!spacing || r.bridge || r.pts.length < 2) continue;
    const rr = rng(seed * 7919 + r.id); let carried = rr() * spacing, along = 0;
    for (let i = 0; i + 1 < r.pts.length; i++) {
      const a = r.pts[i], b = r.pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 1e-3) continue;
      const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len, nx = -dz, nz = dx; let d = carried;
      while (d < len) {
        const x = a[0] + dx * d, z = a[1] + dz * d, avenue = Math.floor((along + d) / 130), ar = rng(seed * 31 + r.id * 977 + avenue);
        const density = 0.2 + 0.8 * valueNoise(x / 170, z / 170, seed); // some neighbourhoods are leafy, some are not
        const sp = rr() < 0.85 ? pickSpecies(ar(), ROAD_WEIGHTS) : pickSpecies(rr(), ROAD_WEIGHTS);
        for (const side of [1, -1]) { if (rr() > density * (r.cls === "primary" ? 0.8 : 1)) continue; const off = r.w / 2 + 1.5 + rr() * 0.6, slide = (rr() - 0.5) * 1.4; place(x + nx * off * side + dx * slide, z + nz * off * side + dz * slide, sp, rr, "road", r.id); }
        d += spacing * (0.8 + 0.4 * rr());
      }
      carried = d - len; along += len;
    }
  }
  for (const p of inp.parks) {
    const bb = bbox(p.pts), area = polyArea(p.pts), n = Math.min(60, Math.floor(area / 260)); if (n < 1) continue;
    const rr = rng(seed * 104729 + Math.round(bb.x0 * 3 + bb.z0 * 7)); let tries = 0, made = 0;
    while (made < n && tries++ < n * 12) { const x = lerp(bb.x0, bb.x1, rr()), z = lerp(bb.z0, bb.z1, rr()); if (!pointInPoly([x, z], p.pts)) continue; const before = out.length; place(x, z, pickSpecies(rr(), PARK_WEIGHTS), rr, "park", null); if (out.length > before) made++; }
  }
  return out;
}
