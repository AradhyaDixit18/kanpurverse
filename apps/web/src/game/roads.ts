"use client";
/** Road network used by traffic, crowds, props and the minimap. Starts as the hand-authored fallback grid; replaced by OSM segments when the extract loads. */
import { RoadIndex } from "./roadIndex";
import { ROADS } from "@kanpurverse/shared";

export interface Seg { a: [number, number]; b: [number, number]; w: number; name?: string; cls?: string; len: number; dx: number; dz: number; nx: number; nz: number }
export interface GeoData {
  roads: { id: number; name?: string; nameHi?: string; cls: string; w: number; lanes: number; oneway: boolean; bridge: boolean; pts: [number, number][] }[];
  rails: { id: number; name?: string; pts: [number, number][]; tracks: number }[];
  platforms: { id: number; pts: [number, number][] }[];
  buildings: { id: number; name?: string; kind?: string; levels: number; pts: [number, number][] }[];
  water: { id: number; name?: string; pts: [number, number][]; river: boolean }[];
  parks: { id: number; name?: string; kind: string; pts: [number, number][] }[];
  pois: { id: number; name: string; nameHi?: string; kind: string; p: [number, number] }[];
  crossings: { id: number; p: [number, number]; kind: string }[];
  stations: { id: number; name?: string; nameHi?: string; p: [number, number] }[];
  source: string; fetchedAt: string;
}

function mk(a: [number, number], b: [number, number], w: number, name?: string, cls?: string): Seg { const dx = b[0] - a[0], dz = b[1] - a[1]; const len = Math.hypot(dx, dz) || 1; return { a, b, w, name, cls, len, dx: dx / len, dz: dz / len, nx: -dz / len, nz: dx / len }; }

let segs: Seg[] = ROADS.map(r => mk(r.a, r.b, r.w, r.name));
let index = new RoadIndex(segs);
let geo: GeoData | null = null; let version = 0; const listeners = new Set<() => void>();
export const getRoads = () => segs; export const getGeo = () => geo; export const roadsVersion = () => version;
export function onRoadsChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

export function setGeo(g: GeoData) {
  geo = g; const out: Seg[] = [];
  for (const r of g.roads) { if (r.cls === "service" && r.pts.length < 3) continue; for (let i = 0; i + 1 < r.pts.length; i++) { const s = mk(r.pts[i], r.pts[i + 1], r.w, r.name, r.cls); if (s.len >= 6) out.push(s); } }
  segs = out; index = new RoadIndex(segs); version++; listeners.forEach(f => f());
}
/** Segments near a point (cheap filter; callers memoise). */
export function roadsNear(x: number, z: number, r: number) { return index.near(x, z, r); }
/** Point along a segment with lateral lane offset. */
export function segPoint(s: Seg, t: number, lateral: number): [number, number] { return [s.a[0] + s.dx * t + s.nx * lateral, s.a[1] + s.dz * t + s.nz * lateral]; }
export const segYaw = (s: Seg, forward: boolean) => Math.atan2(forward ? s.dx : -s.dx, forward ? s.dz : -s.dz);

let loading: Promise<GeoData | null> | null = null;
export function loadGeo(): Promise<GeoData | null> {
  if (geo) return Promise.resolve(geo); if (loading) return loading;
  loading = fetch("/geo/kanpur.json", { cache: "force-cache" }).then(r => r.ok ? r.json() : null).then((g: GeoData | null) => { if (g && g.roads?.length) setGeo(g); return g; }).catch(() => null);
  return loading;
}

/**
 * Water polygons safe to draw. The OSM extract contains one unnamed multipolygon (183 points, spanning ~8 km) whose
 * outer ring was assembled across land; it painted Parmat Ghat's streets blue on the minimap. The Ganga is drawn by
 * Ganga.tsx; small named/unnamed water bodies remain.
 */
export function drawableWater(g: GeoData | null) { if (!g) return []; return g.water.filter(w => { const xs = w.pts.map(p => p[0]), zs = w.pts.map(p => p[1]); const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)); return (w as { name?: string }).name === "Ganga" || span < 2500; }); }
