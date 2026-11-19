"use client";
/** Real Kanpur from the OpenStreetMap extract (© OpenStreetMap contributors, ODbL): roads as textured ribbons with pavements and
 * markings, buildings extruded from footprints with procedural facades, railway lines with sleepers/rails, level crossings at OSM
 * crossing nodes, stations/platforms, water, parks with trees. Tiled (250 m) and streamed around the player; colliders only nearby. */
import { FacadeDetails } from "./FacadeDetails";
import type { FacadeBuilding } from "./facadeKit";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { drawFacade, drawShopfronts, FACADE_CELL } from "./facadeArt";
import { foliageGeometry, crownColour } from "./foliage";
import { LAYER, OFFSET } from "./layers";
import { ribbon, building, platformSlab, dashPolylines } from "./worldGeometry";
import { RigidBody, TrimeshCollider, CuboidCollider } from "@react-three/rapier";
import { Text as DreiText } from "@react-three/drei";
import { getGeo, loadGeo, drawableWater, type GeoData } from "./roads";
import { clearZones } from "@kanpurverse/shared";
import { useStore } from "../state/store";
import { playerPos } from "./refs";
import { Crossing, OsmTrain } from "./RailwayOsm";
import { Boundary } from "./Boundary";
const FONT = "/fonts/NotoSansDevanagari-400.woff";
const Text = (props: React.ComponentProps<typeof DreiText>) => <DreiText font={FONT} {...props} />;

const TILE = 250; const LOAD_R = 2, COLLIDE_R = 1; // tiles
let extraClear: { x: number; z: number; r: number }[] = []; // station footprints etc. (set when the extract is bucketed)
const tileKey = (x: number, z: number) => `${Math.floor(x / TILE)},${Math.floor(z / TILE)}`;

/** Hook: load the extract once; returns null while loading / if missing. */
export function useGeo() { const [g, setG] = useState<GeoData | null>(getGeo()); useEffect(() => { let on = true; loadGeo().then(d => { if (on) setG(d); }); return () => { on = false; }; }, []); return g; }

function useTex(path: string, rep: number, color = true) { const { gl } = useThree(); const t = useLoader(THREE.TextureLoader, path); useMemo(() => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); if (color) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy()); }, [t, rep, color, gl]); return t; }

export function OsmCity({ geo }: { geo: GeoData }) {
  const quality = useStore(s => s.settings.quality);
  // bucket everything into tiles once
  const tiles = useMemo(() => {
    const m = new Map<string, { roads: GeoData["roads"]; buildings: GeoData["buildings"]; rails: GeoData["rails"]; water: GeoData["water"]; parks: GeoData["parks"]; platforms: GeoData["platforms"]; cx: number; cz: number }>();
    const get = (p: [number, number]) => { const k = tileKey(p[0], p[1]); let t = m.get(k); if (!t) { t = { roads: [], buildings: [], rails: [], water: [], parks: [], platforms: [], cx: (Math.floor(p[0] / TILE) + 0.5) * TILE, cz: (Math.floor(p[1] / TILE) + 0.5) * TILE }; m.set(k, t); } return t; };
    const mid = (pts: [number, number][]) => pts[Math.floor(pts.length / 2)];
    extraClear = geo.stations.filter(st => /^Kanpur/.test(st.name ?? "")).map(st => ({ x: st.p[0], z: st.p[1], r: st.name === "Kanpur Central" ? 95 : 40 }));
    for (const r of geo.roads) get(mid(r.pts)).roads.push(r); for (const b of geo.buildings) get(mid(b.pts)).buildings.push(b); for (const r of geo.rails) get(mid(r.pts)).rails.push(r);
    for (const w of drawableWater(geo)) if ((w as { name?: string }).name !== "Ganga") get(mid(w.pts)).water.push(w); // the Ganga is rendered once by Ganga.tsx
    for (const p of geo.parks) get(mid(p.pts)).parks.push(p); for (const p of geo.platforms) get(mid(p.pts)).platforms.push(p);
    return m;
  }, [geo]);
  // Textures are loaded ONCE here (suspending at the Canvas root boundary) and passed down, so a Tile never suspends:
  // a suspended tile re-runs its heavy geometry useMemo on every retry and never commits (v0.5.1 "empty city" bug).
  const tex: TileTex = { asphalt: useTex("/tex/asphalt/color.jpg", 1), asphaltN: useTex("/tex/asphalt/normal.jpg", 1, false), pave: useTex("/tex/pavement/color.jpg", 1), grass: useTex("/tex/grass/color.jpg", 1), concrete: useTex("/tex/concrete/color.jpg", 1), plasterN: useTex("/tex/plaster/normal.jpg", 1, false) };
  const [active, setActive] = useState<string[]>([]); const [near, setNear] = useState<string[]>([]); const last = useRef("");
  const pending = useRef<string[]>([]); const mounted = useRef<string[]>([]); const nextAt = useRef(0);
  useFrame(() => {
    const base = tileKey(playerPos.x, playerPos.z), key = `${base}:${quality}`;
    if (key !== last.current) {
      last.current = key; const [tx, tz] = base.split(",").map(Number); const wanted: { key: string; distance: number }[] = [], n: string[] = [];
      const R = quality === "low" ? 1 : LOAD_R;
      for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) { const k = `${tx + dx},${tz + dz}`; if (tiles.has(k)) { wanted.push({ key: k, distance: dx * dx + dz * dz }); if (Math.abs(dx) <= COLLIDE_R && Math.abs(dz) <= COLLIDE_R) n.push(k); } }
      wanted.sort((a, b) => a.distance - b.distance);
      const keys = new Set(wanted.map(t => t.key)); mounted.current = mounted.current.filter(k => keys.has(k));
      pending.current = wanted.map(t => t.key).filter(k => !mounted.current.includes(k)); setActive([...mounted.current]); setNear(n);
    }
    // One upload/build per interval, nearest first. Never unmount/rebuild retained neighbours.
    const now = performance.now(); if (pending.current.length && now >= nextAt.current) { mounted.current.push(pending.current.shift()!); setActive([...mounted.current]); nextAt.current = now + 40; }
  });
  return <group name="osm-city">
    <GroundPlane />
    {active.map(k => <Boundary key={k} name={"tile " + k}><Tile id={k} t={tiles.get(k)!} collide={near.includes(k)} tex={tex} /></Boundary>)}
    <Crossings geo={geo} />
    <Stations geo={geo} />
    <OsmTrain geo={geo} />
    <Attribution />
  </group>;
}

function GroundPlane() {
  const dirt = useTex("/tex/dirt/color.jpg", 600); const n = useTex("/tex/dirt/normal.jpg", 600, false);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[12000, 12000]} /><meshStandardMaterial map={dirt} normalMap={n} normalScale={new THREE.Vector2(0.4, 0.4)} roughness={1} color="#cfc3a6" /></mesh>;
}

function merge(gsIn: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  const gs = gsIn.filter(g => g.getAttribute("position") && g.getIndex() && g.getAttribute("uv") && g.getAttribute("normal")); if (!gs.length) return null; let n = 0, m = 0; for (const g of gs) { n += g.getAttribute("position").count; m += g.getIndex()!.count; }
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), nor = new Float32Array(n * 3), idx = new Uint32Array(m); let vo = 0, io = 0;
  for (const g of gs) { const p = g.getAttribute("position"), u = g.getAttribute("uv"), nn = g.getAttribute("normal"), ii = g.getIndex()!; pos.set(p.array as Float32Array, vo * 3); uv.set(u.array as Float32Array, vo * 2); nor.set(nn.array as Float32Array, vo * 3); for (let k = 0; k < ii.count; k++) idx[io + k] = ii.getX(k) + vo; vo += p.count; io += ii.count; g.dispose(); }
  const out = new THREE.BufferGeometry(); out.setAttribute("position", new THREE.BufferAttribute(pos, 3)); out.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); out.setAttribute("normal", new THREE.BufferAttribute(nor, 3)); out.setIndex(new THREE.BufferAttribute(idx, 1)); return out;
}
const hash = (n: number) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
export function buildingHeight(b: GeoData["buildings"][number]) { if (b.levels > 0) return b.levels * 3.2; if (b.kind === "train_station") return 9.6; const kind = b.kind ?? "yes"; const r = hash(b.id); const area = polyArea(b.pts);
  if (kind === "house" || kind === "residential") return 6 + Math.floor(r * 3) * 3.2; if (kind === "commercial" || kind === "retail" || kind === "office" || kind === "hotel") return 9.6 + Math.floor(r * 4) * 3.2; if (kind === "industrial" || kind === "warehouse") return 7; if (kind === "apartments") return 12.8 + Math.floor(r * 5) * 3.2; if (kind === "temple" || kind === "place_of_worship" || kind === "church") return 12;
  return area > 1500 ? 12.8 + Math.floor(r * 4) * 3.2 : area > 300 ? 6.4 + Math.floor(r * 4) * 3.2 : 6.4 + Math.floor(r * 2) * 3.2; }
function polyArea(pts: [number, number][]) { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; }
function bbox(pts: [number, number][]) { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } return { x0, x1, z0, z1 }; }

/** Procedural facade atlas shared by all OSM buildings: 4 m bay × 3.2 m floor per UV unit; 5 palette variants selected per building via vertex colour-free trick: separate materials per palette. */
const facadeCache = new Map<number, THREE.Texture>();
/** Facade tile: 2 bays × 2 floors of hand-drawn detail (facadeArt.ts), repeated at half scale so one UV unit is still one bay × one floor. */
function facadeTex(style: number) { const hit = facadeCache.get(style); if (hit) return hit; const c = document.createElement("canvas"); c.width = c.height = FACADE_CELL * 2; drawFacade(c.getContext("2d")!, style);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.5, 0.5); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; facadeCache.set(style, t); return t; }
/** Night window mask: a 4-bay × 3-floor tile so lit windows vary instead of repeating every bay (own texture transform). */
function windowGlowTex(style: number) { const key = 200 + style; const hit = facadeCache.get(key); if (hit) return hit; const c = document.createElement("canvas"); c.width = 256; c.height = 192; const x = c.getContext("2d")!; x.fillStyle = "#000"; x.fillRect(0, 0, 256, 192);
  const warm = ["#ffd9a0", "#ffe7b8", "#ffc777", "#fff1d0", "#bcd4ff"];
  for (let bx = 0; bx < 4; bx++) for (let fy = 0; fy < 3; fy++) { const r = hash(style * 97 + bx * 13 + fy * 7); if (r < 0.48) continue; x.fillStyle = warm[Math.floor(hash(r * 31 + style) * warm.length)]; x.globalAlpha = 0.55 + r * 0.45; x.fillRect(bx * 64 + 18.5, fy * 64 + 16, 28, 29); }
  x.globalAlpha = 1; const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.25, 1 / 3); t.colorSpace = THREE.SRGBColorSpace; facadeCache.set(key, t); return t; }
function shopGlowTex() { const key = 299; const hit = facadeCache.get(key); if (hit) return hit; const c = document.createElement("canvas"); c.width = FACADE_CELL * 4; c.height = FACADE_CELL; drawShopfronts(c.getContext("2d")!, true);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.25, 1); t.colorSpace = THREE.SRGBColorSpace; facadeCache.set(key, t); return t; }
const nightMats = new Set<THREE.MeshStandardMaterial>(); const matCache = new Map<string, THREE.MeshStandardMaterial>();
/** Shared per-style facade material (one GPU program per style for the whole city, not per tile). */
function facadeMat(style: number, plasterN: THREE.Texture) { const k = `f${style}`; let m = matCache.get(k); if (!m) { m = new THREE.MeshStandardMaterial({ map: facadeTex(style), normalMap: plasterN, normalScale: new THREE.Vector2(0.25, 0.25), roughness: 0.92, emissive: 0xffffff, emissiveMap: windowGlowTex(style), emissiveIntensity: 0 }); matCache.set(k, m); nightMats.add(m); } return m; }
function shopMat() { let m = matCache.get("shop"); if (!m) { m = new THREE.MeshStandardMaterial({ map: shopfrontTex(), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1, emissive: 0xffffff, emissiveMap: shopGlowTex(), emissiveIntensity: 0 }); matCache.set("shop", m); nightMats.add(m); } return m; }
/** Called every frame by NightLights with the 0..1 night factor. */
export function setCityNight(k: number) { for (const m of nightMats) m.emissiveIntensity = m === matCache.get("shop") ? k * 1.6 : k * 1.15; }
/** Four distinct shops per four bays, each with its own Hindi signboard and stock (facadeArt.ts). */
function shopfrontTex() { const key = 99; const hit = facadeCache.get(key); if (hit) return hit; const c = document.createElement("canvas"); c.width = FACADE_CELL * 4; c.height = FACADE_CELL; drawShopfronts(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.25, 1); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; facadeCache.set(key, t); return t; }

type TileTex = { asphalt: THREE.Texture; asphaltN: THREE.Texture; pave: THREE.Texture; grass: THREE.Texture; concrete: THREE.Texture; plasterN: THREE.Texture };
function Tile({ id, t, collide, tex }: { id: string; tex: TileTex; t: { roads: GeoData["roads"]; buildings: GeoData["buildings"]; rails: GeoData["rails"]; water: GeoData["water"]; parks: GeoData["parks"]; platforms: GeoData["platforms"] }; collide: boolean }) {
  const { asphalt, asphaltN, pave, grass, concrete, plasterN } = tex;
  const quality = useStore(s => s.settings.quality); const lang = useStore(s => s.settings.lang);
  const geo = useMemo(() => {
    const road = worldUV(merge(t.roads.map(r => ribbon(r.pts, r.w, LAYER.road))), 8); const pavement = worldUV(merge(t.roads.filter(r => r.cls !== "service").map(r => ribbon(r.pts, r.w + 4.4, LAYER.pavement, 4))), 4);
    const marked = t.roads.filter(r => r.cls !== "service" && r.cls !== "living_street" && r.w >= 8);
    // Dashed centre line plus a solid edge line each side on the wider roads; everything stops short of junctions.
    const wide = marked.filter(r => r.w >= 10); const kerbAt = (r: typeof wide[number], side: number) => (l: [number, number][]) => ribbon(offset(l, side * (r.w / 2 + 0.14)), 0.26, LAYER.marks, 4);
    // Painted kerb stones along the wider roads: white blocks join the marking mesh, black blocks are their own.
    const kerbWhite = wide.flatMap(r => [1, -1].flatMap(side => dashPolylines(r.pts, 2, 2, 8).map(kerbAt(r, side)))); const kerbBlack = merge(wide.flatMap(r => [1, -1].flatMap(side => dashPolylines(r.pts, 2, 2, 10).map(kerbAt(r, side)))));
    // Zebra crossing at the start of each long, wide road: 3 m bars across the carriageway, 4.5 m in from the junction.
    const zebra = wide.flatMap(r => dashPolylines(r.pts, 3, 1e6, 4.5).slice(0, 1).flatMap(l => { const n = Math.floor((r.w - 1) / 1.0); return Array.from({ length: n }, (_, k) => ribbon(offset(l, (k - (n - 1) / 2) * 1.0), 0.5, LAYER.marks, 4)); }));
    const marks = merge([...zebra, ...marked.flatMap(r => dashPolylines(r.pts).map(l => ribbon(l, 0.18, LAYER.marks, 4))), ...wide.flatMap(r => dashPolylines(r.pts, 1e6, 0, 8).flatMap(l => [1, -1].map(side => ribbon(offset(l, side * (r.w / 2 - 0.35)), 0.12, LAYER.marks, 4)))), ...kerbWhite]);
    const railBed = merge(t.rails.map(r => ribbon(r.pts, 4.2 * r.tracks, LAYER.rail, 2))); const railL = merge(t.rails.flatMap(r => r.tracks > 1 ? [ribbon(offset(r.pts, -1.9), 0.09, 0.2), ribbon(offset(r.pts, -0.5), 0.09, 0.2), ribbon(offset(r.pts, 0.5), 0.09, 0.2), ribbon(offset(r.pts, 1.9), 0.09, 0.2)] : [ribbon(offset(r.pts, -0.72), 0.09, 0.2), ribbon(offset(r.pts, 0.72), 0.09, 0.2)]));
    const sleepers = merge(t.rails.map(r => ribbon(r.pts, 2.6 * r.tracks, 0.1, 0.7)));
    const byStyle: Record<number, { walls: THREE.BufferGeometry[]; roofs: THREE.BufferGeometry[] }> = {}; const shops: THREE.BufferGeometry[] = []; const roofBits: THREE.BufferGeometry[] = [], tanks: THREE.BufferGeometry[] = []; const facades: FacadeBuilding[] = []; const boxes: { x: number; z: number; w: number; d: number; h: number }[] = [];
    for (const b of t.buildings) { if (b.pts.length < 4) continue; const h = buildingHeight(b); const st = b.kind === "train_station" ? 8 : Math.floor(hash(b.id + 7) * 8); facades.push({pts:b.pts,h,style:st,shop:hash(b.id+3)<.45&&h<20&&b.kind!=="train_station",kind:b.kind}); const { walls, roof } = building(b.pts, h); (byStyle[st] ??= { walls: [], roofs: [] }); byStyle[st].walls.push(walls); byStyle[st].roofs.push(roof);
      roofKit(b.pts, h, b.id, roofBits, tanks);
      if (hash(b.id + 3) < 0.45 && h < 20 && b.kind !== "train_station") { const g = building(inflate(b.pts, 0.05), 3.4, 0.0); shops.push(g.walls); g.roof.dispose(); } const bb = bbox(b.pts); boxes.push({ x: (bb.x0 + bb.x1) / 2, z: (bb.z0 + bb.z1) / 2, w: bb.x1 - bb.x0, d: bb.z1 - bb.z0, h }); }
    // procedural infill: lots along real roads where OSM has no footprint (typical Kanpur: continuous shophouses on main roads, homes on residential lanes)
    const osmBoxes = boxes.slice(); let lots = 0;
    for (const r of t.roads) { if (!["residential", "tertiary", "secondary", "unclassified", "living_street", "primary"].includes(r.cls)) continue;
      for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len, nx = -dz, nz = dx;
        for (let d = 8; d < len - 8 && lots < 160; d += 13) for (const side of [1, -1]) { const h1 = hash(r.id * 31 + i * 7 + d + side); if (h1 < 0.18) continue; const depth = 9 + h1 * 6, width = 11 + hash(r.id + d) * 3; const setback = r.w / 2 + 3.2 + depth / 2; const cx = a[0] + dx * d + nx * setback * side, cz = a[1] + dz * d + nz * setback * side;
          if (osmBoxes.some(o => Math.abs(o.x - cx) < (o.w + width) / 2 + 1 && Math.abs(o.z - cz) < (o.d + depth) / 2 + 1)) continue;
          if (t.roads.some(o => o !== r && o.pts.some((q, k) => k + 1 < o.pts.length && distToSeg([cx, cz], q, o.pts[k + 1]) < o.w / 2 + 6))) continue;
          if (t.parks.some(p => inPoly([cx, cz], p.pts)) || t.water.some(w => inPoly([cx, cz], w.pts))) continue;
          if (clearZones().some(z => Math.hypot(z.x - cx, z.z - cz) < z.r + Math.max(width, depth) / 2) || extraClear.some(z => Math.hypot(z.x - cx, z.z - cz) < z.r + Math.max(width, depth) / 2)) continue;
          const yaw = Math.atan2(dx, dz); const h = (r.cls === "residential" || r.cls === "living_street") ? 6.4 + Math.floor(hash(cx * 3 + cz) * 3) * 3.2 : 9.6 + Math.floor(hash(cx + cz * 3) * 3) * 3.2;
          const poly = rectPoly(cx, cz, width, depth, yaw); const st = Math.floor(hash(cx * 7 + cz * 13) * 8); facades.push({pts:poly,h,style:st,shop:r.cls!=="residential"&&hash(cx+1)<.7}); const g = building(poly, h); (byStyle[st] ??= { walls: [], roofs: [] }); byStyle[st].walls.push(g.walls); byStyle[st].roofs.push(g.roof); roofKit(poly, h, Math.round(cx * 31 + cz * 17), roofBits, tanks);
          if (r.cls !== "residential" && hash(cx + 1) < 0.7) { const sg = building(inflate(poly, 0.05), 3.4); shops.push(sg.walls); sg.roof.dispose(); }
          osmBoxes.push({ x: cx, z: cz, w: width, d: depth, h }); boxes.push({ x: cx, z: cz, w: Math.max(width, depth), d: Math.max(width, depth), h }); lots++; } } }
    const styles = Object.entries(byStyle).map(([s, g]) => ({ style: Number(s), walls: merge(g.walls)!, roofs: merge(g.roofs)! })); const shop = merge(shops);
    const water = t.water.filter(w => w.pts.length >= 4).map(w => { const sh = new THREE.Shape(w.pts.map(p => new THREE.Vector2(p[0], -p[1]))); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.translate(0, LAYER.water, 0); return g; });
    const parks = t.parks.filter(p => p.pts.length >= 4).map(p => { const sh = new THREE.Shape(p.pts.map(q => new THREE.Vector2(q[0], -q[1]))); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.translate(0, LAYER.park, 0); const uv = g.getAttribute("uv"); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 8, uv.getY(i) / 8); return { g, pts: p.pts, name: p.name }; });
    const slabs = t.platforms.map(p => platformSlab(p.pts)); const platforms = merge(slabs.map(x => x.geo)); const platformBoxes = slabs.flatMap(x => x.boxes);
    if (process.env.NEXT_PUBLIC_QA === "1") console.info("[KanpurVerse] tile built", id, { roads: t.roads.length, bld: t.buildings.length, lots, styles: Object.keys(byStyle).length, hasRoad: !!road });
    return { road, pavement, marks, kerbBlack, roofBits: merge(roofBits), tanks: merge(tanks), railBed, railL, sleepers, styles, shop, water, parks, boxes, platforms, platformBoxes, facades };
  }, [t, id]);
  useEffect(() => () => {
    for (const g of [geo.road, geo.pavement, geo.marks, geo.kerbBlack, geo.roofBits, geo.tanks, geo.railBed, geo.railL, geo.sleepers, geo.shop, geo.platforms, ...geo.water, ...geo.parks.map(p => p.g), ...geo.styles.flatMap(s => [s.walls, s.roofs])]) g?.dispose();
  }, [geo]);
  const names = useMemo(() => t.roads.filter(r => r.name && r.pts.length > 1).filter((r, i, arr) => arr.findIndex(x => x.name === r.name) === i).slice(0, 6), [t]);
  const trees = useMemo(() => { const out: [number, number][] = []; for (const p of geo.parks) { const bb = bbox(p.pts); const n = Math.min(40, Math.floor(polyArea(p.pts) / 400)); let tries = 0; while (out.length < n && tries++ < n * 6) { const x = bb.x0 + Math.random() * (bb.x1 - bb.x0), z = bb.z0 + Math.random() * (bb.z1 - bb.z0); if (inPoly([x, z], p.pts)) out.push([x, z]); } } return out; }, [geo]);
  void id;
  return <group name={"tile:" + id}>
    {geo.pavement && <mesh geometry={geo.pavement} receiveShadow><meshStandardMaterial map={pave} roughness={0.95} color="#b8b0a2" polygonOffset polygonOffsetFactor={OFFSET.pavement} polygonOffsetUnits={OFFSET.pavement} /></mesh>}
    {geo.road && <mesh geometry={geo.road} receiveShadow><meshStandardMaterial map={asphalt} normalMap={asphaltN} normalScale={new THREE.Vector2(0.5, 0.5)} roughness={0.9} polygonOffset polygonOffsetFactor={OFFSET.road} polygonOffsetUnits={OFFSET.road} /></mesh>}
    {geo.marks && quality !== "low" && <mesh geometry={geo.marks} receiveShadow><meshStandardMaterial color="#d8d2bb" roughness={0.75} polygonOffset polygonOffsetFactor={OFFSET.marks} polygonOffsetUnits={OFFSET.marks} /></mesh>}
    {geo.railBed && <mesh geometry={geo.railBed} receiveShadow><meshStandardMaterial color="#6e6a63" roughness={1} polygonOffset polygonOffsetFactor={OFFSET.rail} polygonOffsetUnits={OFFSET.rail} /></mesh>}
    {geo.sleepers && <mesh geometry={geo.sleepers}><meshStandardMaterial color="#5a4632" roughness={1} /></mesh>}
    {geo.railL && <mesh geometry={geo.railL}><meshStandardMaterial color="#9a9ea6" metalness={0.8} roughness={0.35} /></mesh>}
    {geo.platforms && <mesh geometry={geo.platforms} castShadow receiveShadow><meshStandardMaterial map={concrete} color="#cfc9bd" side={THREE.DoubleSide} /></mesh>}
    {geo.styles.map(s => <group key={s.style}><mesh geometry={s.walls} material={facadeMat(s.style, plasterN)} castShadow receiveShadow /><mesh geometry={s.roofs} receiveShadow><meshStandardMaterial map={concrete} color="#8e867a" roughness={1} /></mesh></group>)}
    {geo.shop && <mesh geometry={geo.shop} position={[0, 0.02, 0]} material={shopMat()} />}
    {geo.kerbBlack && quality !== "low" && <mesh geometry={geo.kerbBlack} receiveShadow><meshStandardMaterial color="#1c1c1e" roughness={0.8} polygonOffset polygonOffsetFactor={OFFSET.marks} polygonOffsetUnits={OFFSET.marks} /></mesh>}
    {geo.roofBits && <mesh geometry={geo.roofBits} castShadow receiveShadow><meshStandardMaterial map={concrete} color="#bdb5a6" roughness={1} /></mesh>}
    {geo.tanks && <mesh geometry={geo.tanks} castShadow><meshStandardMaterial color="#17181a" roughness={0.5} /></mesh>}
    {geo.water.map((g, i) => <mesh key={"w" + i} geometry={g}><meshStandardMaterial color="#2f6f8f" roughness={0.12} metalness={0.5} transparent opacity={0.92} /></mesh>)}
    {geo.parks.map((p, i) => <group key={"p" + i}><mesh geometry={p.g} receiveShadow><meshStandardMaterial map={grass} color="#8fb86a" roughness={1} polygonOffset polygonOffsetFactor={OFFSET.park} polygonOffsetUnits={OFFSET.park} /></mesh>{p.name && <Suspense fallback={null}><Text position={[(bbox(p.pts).x0 + bbox(p.pts).x1) / 2, 6, (bbox(p.pts).z0 + bbox(p.pts).z1) / 2]} fontSize={3} color="#ffd23f" outlineWidth={0.12} outlineColor="#0b0b0d" anchorX="center">{p.name}</Text></Suspense>}</group>)}
    {collide && <FacadeDetails buildings={geo.facades} />}<Trees pts={trees} />
    {quality !== "low" && names.map((r, i) => { const m = r.pts[Math.floor(r.pts.length / 2)]; return <group key={i} position={[m[0], 0, m[1]]}><mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.05, 0.06, 3.2]} /><meshStandardMaterial color="#2e5e3a" /></mesh><mesh position={[0, 3.2, 0]}><boxGeometry args={[Math.min(12, 1 + (r.name!.length) * 0.55), 1.1, 0.06]} /><meshStandardMaterial color="#1f6f45" /></mesh><Suspense fallback={null}><Text position={[0, 3.2, 0.05]} fontSize={0.7} color="#fff" anchorX="center" anchorY="middle">{lang === "english" ? r.name : (r.nameHi ?? r.name)}</Text></Suspense></group>; })}
    {collide && geo.platformBoxes.length > 0 && <RigidBody type="fixed" colliders={false}>{geo.platformBoxes.map((b, i) => <CuboidCollider key={i} args={b.half} position={b.c} rotation={[0, b.yaw, 0]} />)}</RigidBody>}
    {collide && <RigidBody type="fixed" colliders={false}>{geo.styles.map(s => { const pos = s.walls.getAttribute("position").array as Float32Array; const idx = s.walls.getIndex()!.array as Uint32Array | Uint16Array; return <TrimeshCollider key={s.style} args={[pos, idx instanceof Uint32Array ? idx : new Uint32Array(idx)]} />; })}</RigidBody>}
  </group>;
}
function distToSeg(p: [number, number], a: [number, number], b: [number, number]) { const dx = b[0] - a[0], dz = b[1] - a[1]; const l2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)); return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dz)); }
/** Rooftop kit for one building: a parapet wall round the terrace, a black water tank on its stand, and on some a stair room. */
/** Largest roof (m²) that carries a water tank and stair room. */
export const ROOF_KIT_MAX_AREA = 5000;
function roofKit(pts: [number, number][], h: number, id: number, roofBits: THREE.BufferGeometry[], tanks: THREE.BufferGeometry[]) {
  if (h < 6 || h >= 40 || polyArea(pts) <= 50) return; const par = building(pts, 0.9, h); roofBits.push(par.walls); par.roof.dispose();
  // A mall or stadium footprint is drawn as a walk-in shell with people standing inside it and a roof that only faces up: a tank on it would hang in their sky.
  if (polyArea(pts) > ROOF_KIT_MAX_AREA) return;
  const rb = bbox(pts); const rcx = (rb.x0 + rb.x1) / 2, rcz = (rb.z0 + rb.z1) / 2, r1 = hash(id + 11), r2 = hash(id + 17);
  const tx = rcx + (r1 - 0.5) * (rb.x1 - rb.x0) * 0.4, tz = rcz + (r2 - 0.5) * (rb.z1 - rb.z0) * 0.4;
  if (inPoly([tx, tz], pts)) { const tr = 0.55 + r1 * 0.25, th = 1.0 + r2 * 0.4; const stand = new THREE.BoxGeometry(tr * 1.7, 0.5, tr * 1.7); stand.translate(tx, h + 0.25, tz); roofBits.push(stand); const tank = new THREE.CylinderGeometry(tr, tr, th, 12); tank.translate(tx, h + 0.5 + th / 2, tz); tanks.push(tank); const lid = new THREE.CylinderGeometry(tr * 0.35, tr * 0.55, 0.14, 10); lid.translate(tx, h + 0.5 + th + 0.07, tz); tanks.push(lid); }
  if (r1 > 0.45) { const mx = rcx - (r2 - 0.5) * (rb.x1 - rb.x0) * 0.45, mz = rcz - (r1 - 0.5) * (rb.z1 - rb.z0) * 0.45; if (inPoly([mx, mz], pts) && Math.hypot(mx - tx, mz - tz) > 2.6) { const room = new THREE.BoxGeometry(2.6, 2.4, 2.4); room.translate(mx, h + 1.2, mz); roofBits.push(room); } }
}
function rectPoly(cx: number, cz: number, w: number, d: number, yaw: number): [number, number][] { const c = Math.cos(yaw), s = Math.sin(yaw); const pts: [number, number][] = []; for (const [u, v] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]) pts.push([cx + u * s + v * c, cz + u * c - v * s]); return pts; }
function offset(pts: [number, number][], d: number): [number, number][] { return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; return [p[0] - dz / l * d, p[1] + dx / l * d]; }); }
function inPoly(p: [number, number], poly: [number, number][]) { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1]; if ((zi > p[1]) !== (zj > p[1]) && p[0] < (xj - xi) * (p[1] - zi) / (zj - zi) + xi) inside = !inside; } return inside; }

function Trees({ pts }: { pts: [number, number][] }) {
  const trunk = useMemo(() => { const m = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.4, 3.5, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a2b }), Math.max(1, pts.length)); const o = new THREE.Object3D(); pts.forEach((p, i) => { o.position.set(p[0], 1.7, p[1]); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.count = pts.length; m.castShadow = true; return m; }, [pts]);
  const crown = useMemo(() => { const m = new THREE.InstancedMesh(foliageGeometry(), new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.96 }), Math.max(1, pts.length * 4)); const o = new THREE.Object3D(), c = new THREE.Color();
    pts.forEach((p, i) => { const s0 = 0.8 + hash(i) * 0.6; for (let j = 0; j < 4; j++) { const a = j * 2.2 + i, r = j ? 1.5 * s0 : 0; o.position.set(p[0] + Math.cos(a) * r, 4.5 + (j % 3) * 0.7 * s0, p[1] + Math.sin(a) * r); const sc = (j ? 1.7 : 2.3) * s0; o.scale.set(sc, sc * 0.85, sc); o.rotation.y = a; o.updateMatrix(); m.setMatrixAt(i * 4 + j, o.matrix); m.setColorAt(i * 4 + j, c.set(crownColour(i + 3, j))); } });
    m.count = pts.length * 4; m.castShadow = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; return m; }, [pts]);
  useEffect(() => () => { trunk.geometry.dispose(); (trunk.material as THREE.Material).dispose(); crown.geometry.dispose(); (crown.material as THREE.Material).dispose(); }, [trunk, crown]);
  return <><primitive object={trunk} /><primitive object={crown} /></>;
}

function Crossings({ geo }: { geo: GeoData }) {
  // orient each OSM level crossing by the nearest road segment direction; de-duplicate crossings closer than 12 m
  const list = useMemo(() => { const out: { p: [number, number]; yaw: number; w: number }[] = []; for (const c of geo.crossings) { if (c.kind !== "level_crossing") continue; if (out.some(o => Math.hypot(o.p[0] - c.p[0], o.p[1] - c.p[1]) < 12)) continue; let best: { d: number; yaw: number; w: number } | null = null;
      for (const r of geo.roads) for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1]; const d = Math.hypot((a[0] + b[0]) / 2 - c.p[0], (a[1] + b[1]) / 2 - c.p[1]); if (d < 60 && (!best || d < best.d)) best = { d, yaw: Math.atan2(b[0] - a[0], b[1] - a[1]), w: r.w }; }
      out.push({ p: c.p, yaw: best?.yaw ?? 0, w: best?.w ?? 8 }); } return out; }, [geo]);
  return <>{list.map((c, i) => <Crossing key={i} p={c.p} yaw={c.yaw} w={c.w} geo={geo} />)}</>;
}

function Stations({ geo }: { geo: GeoData }) {
  const lang = useStore(s => s.settings.lang);
  const facade = useMemo(() => facadeTex(8), []);
  // Stylised Indo-Saracenic station building (FICTIONALIZED APPROXIMATION of Kanpur Central's red-brick facade): arcaded ground floor,
  // central clock tower with dome, two side towers, cream trim, bilingual board, platform canopies behind. Not a replica.
  return <>{geo.stations.filter((s, i, a) => a.findIndex(x => x.name === s.name) === i && /^Kanpur/.test(s.name ?? "")).map(s => { const big = s.name === "Kanpur Central"; const W = big ? 64 : 34, H = big ? 13 : 9, D = 16; const name = (lang === "english" ? s.name : (s.nameHi ?? s.name)) ?? ""; return <group key={s.id} position={[s.p[0], 0, s.p[1]]}>
    <mesh position={[0, H / 2, 0]} castShadow receiveShadow><boxGeometry args={[W, H, D]} /><meshStandardMaterial color="#9c3b2b" map={facade} roughness={0.9} /></mesh>
    <mesh position={[0, H + 0.5, 0]}><boxGeometry args={[W + 2, 1, D + 2]} /><meshStandardMaterial color="#e8dcc0" /></mesh>
    <mesh position={[0, 3.6, D / 2 + 0.05]}><boxGeometry args={[W - 2, 0.5, 0.1]} /><meshStandardMaterial color="#e8dcc0" /></mesh>
    {Array.from({ length: Math.floor((W - 6) / 5) }, (_, i) => { const x = -(W - 6) / 2 + 2.5 + i * 5; return <group key={i} position={[x, 0, D / 2 + 0.2]}>
      <mesh position={[0, 1.6, 0]}><boxGeometry args={[2.6, 3.2, 0.3]} /><meshStandardMaterial color="#2a1a14" /></mesh>
      <mesh position={[0, 3.2, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.3, 1.3, 0.3, 16, 1, false, 0, Math.PI]} /><meshStandardMaterial color="#2a1a14" /></mesh>
      <mesh position={[0, 3.25, -0.05]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.45, 0.14, 8, 16, Math.PI]} /><meshStandardMaterial color="#e8dcc0" /></mesh>
      <mesh position={[0, H - 3.2, 0]}><boxGeometry args={[1.8, 3.4, 0.2]} /><meshStandardMaterial color="#1a2a3a" roughness={0.2} metalness={0.3} /></mesh>
    </group>; })}
    {big && <group position={[0, 0, 0]}>
      <mesh position={[0, H + 5, 0]} castShadow><boxGeometry args={[12, 10, D + 2]} /><meshStandardMaterial color="#9c3b2b" map={facade} /></mesh>
      <mesh position={[0, H + 10.4, 0]}><boxGeometry args={[13, 0.8, D + 3]} /><meshStandardMaterial color="#e8dcc0" /></mesh>
      <mesh position={[0, H + 13.5, 0]}><sphereGeometry args={[5.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#e8dcc0" roughness={0.6} /></mesh>
      <mesh position={[0, H + 7.5, D / 2 + 1.1]}><cylinderGeometry args={[2.2, 2.2, 0.3, 24]} /><meshStandardMaterial color="#fff6e0" /></mesh>
      <mesh position={[0, H + 7.5, D / 2 + 1.3]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[2.2, 2.2, 0.1, 24]} /><meshStandardMaterial color="#fff6e0" /></mesh>
      <mesh position={[0, H + 7.5, D / 2 + 1.4]}><boxGeometry args={[0.2, 1.6, 0.05]} /><meshStandardMaterial color="#111" /></mesh>
    </group>}
    {[-W / 2 + 4, W / 2 - 4].map(x => <group key={x}><mesh position={[x, H + 3, 0]} castShadow><boxGeometry args={[7, 6, D + 1]} /><meshStandardMaterial color="#9c3b2b" map={facade} /></mesh><mesh position={[x, H + 7.5, 0]}><sphereGeometry args={[3.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#e8dcc0" /></mesh></group>)}
    <mesh position={[0, H - 1.6, D / 2 + 0.3]}><boxGeometry args={[Math.min(W - 10, 34), 2.6, 0.3]} /><meshStandardMaterial color="#ffd23f" /></mesh>
    <Suspense fallback={null}><Text position={[0, H - 1.6, D / 2 + 0.5]} fontSize={1.5} color="#0b0b0d" anchorX="center" anchorY="middle" maxWidth={Math.min(W - 12, 32)}>{name.toUpperCase()}</Text></Suspense>
    <Suspense fallback={null}><Text position={[0, 4.6, D / 2 + 0.4]} fontSize={0.9} color="#e8dcc0" anchorX="center" anchorY="middle">{lang === "english" ? "उत्तर मध्य रेलवे · NORTH CENTRAL RAILWAY" : "उत्तर मध्य रेलवे"}</Text></Suspense>
    {/* platform canopies behind the building (towards the tracks, -Z) */}
    {[-1, 1].map(side => <group key={side} position={[0, 0, -D / 2 - 8 - (side > 0 ? 10 : 0)]}>
      <mesh position={[0, 5.4, 0]} castShadow><boxGeometry args={[W + 20, 0.3, 7]} /><meshStandardMaterial color="#6b6f75" metalness={0.3} roughness={0.6} /></mesh>
      {Array.from({ length: Math.floor((W + 20) / 8) }, (_, i) => <mesh key={i} position={[-(W + 20) / 2 + 4 + i * 8, 2.7, 0]}><cylinderGeometry args={[0.18, 0.18, 5.4, 8]} /><meshStandardMaterial color="#4a4e55" /></mesh>)}
    </group>)}
  </group>; })}</>;
}

function Attribution() { return <Suspense fallback={null}><Text position={[0, 0.5, 0]} fontSize={0.001} color="#000">© OpenStreetMap contributors (ODbL)</Text></Suspense>; }

/** Push a footprint outward by d metres (from its centroid) so overlay shells never sit coplanar with walls. */
function inflate(pts: [number, number][], d: number): [number, number][] { const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length; return pts.map(([x, z]) => { const dx = x - cx, dz = z - cz, l = Math.hypot(dx, dz) || 1; return [x + dx / l * d, z + dz / l * d]; }); }
/** Planar world-space UVs: overlapping ribbons at junctions sample identical texels, so depth ties cannot shimmer. */
function worldUV(g: THREE.BufferGeometry | null, scale: number) { if (!g) return g; const p = g.getAttribute("position"), uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / scale; uv[i * 2 + 1] = p.getZ(i) / scale; } g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); return g; }
