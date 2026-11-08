"use client";
/** Real Kanpur from the OpenStreetMap extract (© OpenStreetMap contributors, ODbL): roads as textured ribbons with pavements and
 * markings, buildings extruded from footprints with procedural facades, railway lines with sleepers/rails, level crossings at OSM
 * crossing nodes, stations/platforms, water, parks with trees. Tiled (250 m) and streamed around the player; colliders only nearby. */
import { FacadeDetails } from "./FacadeDetails";
import type { FacadeBuilding } from "./facadeKit";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ribbon, building } from "./worldGeometry";
import { RigidBody, TrimeshCollider } from "@react-three/rapier";
import { Text as DreiText } from "@react-three/drei";
import { getGeo, loadGeo, type GeoData } from "./roads";
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
    for (const w of geo.water) if (Math.abs(w.pts[0][0]) < 6000) get(mid(w.pts)).water.push(w); for (const p of geo.parks) get(mid(p.pts)).parks.push(p); for (const p of geo.platforms) get(mid(p.pts)).platforms.push(p);
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
function facadeTex(style: number) { const hit = facadeCache.get(style); if (hit) return hit; const c = document.createElement("canvas"); c.width = 256; c.height = 256; const x = c.getContext("2d")!;
  const base = ["#e9c6a0", "#f2d9b1", "#d7b8c9", "#c9d9e8", "#f6e3a1", "#d9cfc0", "#e4b7a0", "#cfd6c2", "#a95c43"][style % 9]; x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(60,40,20,${hash(style*2500+i)*0.08})`; x.fillRect(hash(i*3+style)*256, hash(i*7+style)*256, 2, 2); }
  // one bay (256 px wide) × one floor (256 px tall): window with sill + grille, balcony on alternate styles
  x.fillStyle = "rgba(0,0,0,0.14)"; x.fillRect(0, 250, 256, 6); x.fillStyle = "#26304a"; x.fillRect(70, 60, 116, 120); x.fillStyle = "rgba(150,200,255,0.35)"; x.fillRect(74, 64, 52, 50); x.fillStyle = base; x.fillRect(126, 60, 5, 120); x.fillStyle = "#ece6d8"; x.fillRect(62, 180, 132, 10);
  if (style % 2 === 1) { x.fillStyle = "rgba(0,0,0,0.22)"; x.fillRect(30, 190, 196, 40); x.fillStyle = "#8a7a66"; for (let k = 0; k < 10; k++) x.fillRect(34 + k * 20, 194, 3, 32); x.fillRect(30, 192, 196, 3); }
  if (style % 3 === 2) { x.fillStyle = "#cfd3d8"; x.fillRect(200, 100, 40, 32); x.fillStyle = "#777"; x.fillRect(206, 108, 28, 16); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; facadeCache.set(style, t); return t; }
function shopfrontTex() { const key = 99; const hit = facadeCache.get(key); if (hit) return hit; const c = document.createElement("canvas"); c.width = 256; c.height = 256; const x = c.getContext("2d")!; x.fillStyle = "#e9c6a0"; x.fillRect(0, 0, 256, 256);
  x.fillStyle = "#c8102e"; x.fillRect(8, 8, 240, 44); x.fillStyle = "#fff"; x.font = "bold 26px sans-serif"; x.fillText("दुकान", 20, 40); x.fillStyle = "#2a2f3a"; x.fillRect(16, 64, 224, 180); x.fillStyle = "rgba(255,220,150,0.45)"; x.fillRect(24, 72, 208, 150); for (const [k, col] of ["#c8102e", "#2e8b57", "#f2b134", "#3d8bff"].entries()) { x.fillStyle = col; x.fillRect(36 + k * 50, 120, 36, 36); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; facadeCache.set(key, t); return t; }

type TileTex = { asphalt: THREE.Texture; asphaltN: THREE.Texture; pave: THREE.Texture; grass: THREE.Texture; concrete: THREE.Texture; plasterN: THREE.Texture };
function Tile({ id, t, collide, tex }: { id: string; tex: TileTex; t: { roads: GeoData["roads"]; buildings: GeoData["buildings"]; rails: GeoData["rails"]; water: GeoData["water"]; parks: GeoData["parks"]; platforms: GeoData["platforms"] }; collide: boolean }) {
  const { asphalt, asphaltN, pave, grass, concrete, plasterN } = tex;
  const quality = useStore(s => s.settings.quality); const lang = useStore(s => s.settings.lang);
  const geo = useMemo(() => {
    const road = merge(t.roads.map(r => ribbon(r.pts, r.w, 0.06))); const pavement = merge(t.roads.filter(r => r.cls !== "service").map(r => ribbon(r.pts, r.w + 4.4, 0.03, 4)));
    const marks = merge(t.roads.filter(r => r.cls !== "service" && r.cls !== "living_street" && r.w >= 8).map(r => ribbon(r.pts, 0.22, 0.08, 4)));
    const railBed = merge(t.rails.map(r => ribbon(r.pts, 4.2 * r.tracks, 0.04, 2))); const railL = merge(t.rails.flatMap(r => r.tracks > 1 ? [ribbon(offset(r.pts, -1.9), 0.09, 0.2), ribbon(offset(r.pts, -0.5), 0.09, 0.2), ribbon(offset(r.pts, 0.5), 0.09, 0.2), ribbon(offset(r.pts, 1.9), 0.09, 0.2)] : [ribbon(offset(r.pts, -0.72), 0.09, 0.2), ribbon(offset(r.pts, 0.72), 0.09, 0.2)]));
    const sleepers = merge(t.rails.map(r => ribbon(r.pts, 2.6 * r.tracks, 0.1, 0.7)));
    const byStyle: Record<number, { walls: THREE.BufferGeometry[]; roofs: THREE.BufferGeometry[] }> = {}; const shops: THREE.BufferGeometry[] = []; const facades: FacadeBuilding[] = []; const boxes: { x: number; z: number; w: number; d: number; h: number }[] = [];
    for (const b of t.buildings) { if (b.pts.length < 4) continue; const h = buildingHeight(b); const st = b.kind === "train_station" ? 8 : Math.floor(hash(b.id + 7) * 8); facades.push({pts:b.pts,h,style:st,shop:hash(b.id+3)<.45&&h<20&&b.kind!=="train_station",kind:b.kind}); const { walls, roof } = building(b.pts, h); (byStyle[st] ??= { walls: [], roofs: [] }); byStyle[st].walls.push(walls); byStyle[st].roofs.push(roof);
      if (hash(b.id + 3) < 0.45 && h < 20 && b.kind !== "train_station") { const g = building(b.pts, 3.4, 0.0); shops.push(g.walls); g.roof.dispose(); } const bb = bbox(b.pts); boxes.push({ x: (bb.x0 + bb.x1) / 2, z: (bb.z0 + bb.z1) / 2, w: bb.x1 - bb.x0, d: bb.z1 - bb.z0, h }); }
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
          const poly = rectPoly(cx, cz, width, depth, yaw); const st = Math.floor(hash(cx * 7 + cz * 13) * 8); facades.push({pts:poly,h,style:st,shop:r.cls!=="residential"&&hash(cx+1)<.7}); const g = building(poly, h); (byStyle[st] ??= { walls: [], roofs: [] }); byStyle[st].walls.push(g.walls); byStyle[st].roofs.push(g.roof);
          if (r.cls !== "residential" && hash(cx + 1) < 0.7) { const sg = building(poly, 3.4); shops.push(sg.walls); sg.roof.dispose(); }
          osmBoxes.push({ x: cx, z: cz, w: width, d: depth, h }); boxes.push({ x: cx, z: cz, w: Math.max(width, depth), d: Math.max(width, depth), h }); lots++; } } }
    const styles = Object.entries(byStyle).map(([s, g]) => ({ style: Number(s), walls: merge(g.walls)!, roofs: merge(g.roofs)! })); const shop = merge(shops);
    const water = t.water.filter(w => w.pts.length >= 4).map(w => { const sh = new THREE.Shape(w.pts.map(p => new THREE.Vector2(p[0], -p[1]))); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.translate(0, 0.05, 0); return g; });
    const parks = t.parks.filter(p => p.pts.length >= 4).map(p => { const sh = new THREE.Shape(p.pts.map(q => new THREE.Vector2(q[0], -q[1]))); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.translate(0, 0.04, 0); const uv = g.getAttribute("uv"); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 8, uv.getY(i) / 8); return { g, pts: p.pts, name: p.name }; });
    const platforms = merge(t.platforms.map(p => ribbon(p.pts, 6, 0.9, 4)));
    if (process.env.NEXT_PUBLIC_QA === "1") console.info("[KanpurVerse] tile built", id, { roads: t.roads.length, bld: t.buildings.length, lots, styles: Object.keys(byStyle).length, hasRoad: !!road });
    return { road, pavement, marks, railBed, railL, sleepers, styles, shop, water, parks, boxes, platforms, facades };
  }, [t, id]);
  useEffect(() => () => {
    for (const g of [geo.road, geo.pavement, geo.marks, geo.railBed, geo.railL, geo.sleepers, geo.shop, geo.platforms, ...geo.water, ...geo.parks.map(p => p.g), ...geo.styles.flatMap(s => [s.walls, s.roofs])]) g?.dispose();
  }, [geo]);
  const names = useMemo(() => t.roads.filter(r => r.name && r.pts.length > 1).filter((r, i, arr) => arr.findIndex(x => x.name === r.name) === i).slice(0, 6), [t]);
  const trees = useMemo(() => { const out: [number, number][] = []; for (const p of geo.parks) { const bb = bbox(p.pts); const n = Math.min(40, Math.floor(polyArea(p.pts) / 400)); let tries = 0; while (out.length < n && tries++ < n * 6) { const x = bb.x0 + Math.random() * (bb.x1 - bb.x0), z = bb.z0 + Math.random() * (bb.z1 - bb.z0); if (inPoly([x, z], p.pts)) out.push([x, z]); } } return out; }, [geo]);
  void id;
  return <group name={"tile:" + id}>
    {geo.pavement && <mesh geometry={geo.pavement} receiveShadow><meshStandardMaterial map={pave} roughness={0.95} color="#b8b0a2" /></mesh>}
    {geo.road && <mesh geometry={geo.road} receiveShadow><meshStandardMaterial map={asphalt} normalMap={asphaltN} normalScale={new THREE.Vector2(0.5, 0.5)} roughness={0.9} /></mesh>}
    {geo.marks && quality !== "low" && <mesh geometry={geo.marks}><meshBasicMaterial color="#e8e2c6" /></mesh>}
    {geo.railBed && <mesh geometry={geo.railBed} receiveShadow><meshStandardMaterial color="#6e6a63" roughness={1} /></mesh>}
    {geo.sleepers && <mesh geometry={geo.sleepers}><meshStandardMaterial color="#5a4632" roughness={1} /></mesh>}
    {geo.railL && <mesh geometry={geo.railL}><meshStandardMaterial color="#9a9ea6" metalness={0.8} roughness={0.35} /></mesh>}
    {geo.platforms && <mesh geometry={geo.platforms} castShadow receiveShadow><meshStandardMaterial map={concrete} color="#cfc9bd" /></mesh>}
    {geo.styles.map(s => <group key={s.style}><mesh geometry={s.walls} castShadow receiveShadow><meshStandardMaterial map={facadeTex(s.style)} normalMap={plasterN} normalScale={new THREE.Vector2(0.25, 0.25)} roughness={0.92} /></mesh><mesh geometry={s.roofs} receiveShadow><meshStandardMaterial map={concrete} color="#8e867a" roughness={1} /></mesh></group>)}
    {geo.shop && <mesh geometry={geo.shop} position={[0, 0.02, 0]}><meshStandardMaterial map={shopfrontTex()} roughness={0.9} polygonOffset polygonOffsetFactor={-1} /></mesh>}
    {geo.water.map((g, i) => <mesh key={"w" + i} geometry={g}><meshStandardMaterial color="#2f6f8f" roughness={0.12} metalness={0.5} transparent opacity={0.92} /></mesh>)}
    {geo.parks.map((p, i) => <group key={"p" + i}><mesh geometry={p.g} receiveShadow><meshStandardMaterial map={grass} color="#8fb86a" roughness={1} /></mesh>{p.name && <Suspense fallback={null}><Text position={[(bbox(p.pts).x0 + bbox(p.pts).x1) / 2, 6, (bbox(p.pts).z0 + bbox(p.pts).z1) / 2]} fontSize={3} color="#ffd23f" outlineWidth={0.12} outlineColor="#0b0b0d" anchorX="center">{p.name}</Text></Suspense>}</group>)}
    {collide && <FacadeDetails buildings={geo.facades} />}<Trees pts={trees} />
    {quality !== "low" && names.map((r, i) => { const m = r.pts[Math.floor(r.pts.length / 2)]; return <group key={i} position={[m[0], 0, m[1]]}><mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.05, 0.06, 3.2]} /><meshStandardMaterial color="#2e5e3a" /></mesh><mesh position={[0, 3.2, 0]}><boxGeometry args={[Math.min(12, 1 + (r.name!.length) * 0.55), 1.1, 0.06]} /><meshStandardMaterial color="#1f6f45" /></mesh><Suspense fallback={null}><Text position={[0, 3.2, 0.05]} fontSize={0.7} color="#fff" anchorX="center" anchorY="middle">{lang === "english" ? r.name : (r.nameHi ?? r.name)}</Text></Suspense></group>; })}
    {collide && <RigidBody type="fixed" colliders={false}>{geo.styles.map(s => { const pos = s.walls.getAttribute("position").array as Float32Array; const idx = s.walls.getIndex()!.array as Uint32Array | Uint16Array; return <TrimeshCollider key={s.style} args={[pos, idx instanceof Uint32Array ? idx : new Uint32Array(idx)]} />; })}</RigidBody>}
  </group>;
}
function distToSeg(p: [number, number], a: [number, number], b: [number, number]) { const dx = b[0] - a[0], dz = b[1] - a[1]; const l2 = dx * dx + dz * dz || 1; const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)); return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dz)); }
function rectPoly(cx: number, cz: number, w: number, d: number, yaw: number): [number, number][] { const c = Math.cos(yaw), s = Math.sin(yaw); const pts: [number, number][] = []; for (const [u, v] of [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]) pts.push([cx + u * s + v * c, cz + u * c - v * s]); return pts; }
function offset(pts: [number, number][], d: number): [number, number][] { return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; return [p[0] - dz / l * d, p[1] + dx / l * d]; }); }
function inPoly(p: [number, number], poly: [number, number][]) { let inside = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1]; if ((zi > p[1]) !== (zj > p[1]) && p[0] < (xj - xi) * (p[1] - zi) / (zj - zi) + xi) inside = !inside; } return inside; }

function Trees({ pts }: { pts: [number, number][] }) {
  const trunk = useMemo(() => { const m = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.4, 3.5, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a2b }), Math.max(1, pts.length)); const o = new THREE.Object3D(); pts.forEach((p, i) => { o.position.set(p[0], 1.7, p[1]); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.count = pts.length; m.castShadow = true; return m; }, [pts]);
  const crown = useMemo(() => { const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.6, 1), new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 1, flatShading: true }), Math.max(1, pts.length)); const o = new THREE.Object3D(); pts.forEach((p, i) => { o.position.set(p[0], 4.6, p[1]); o.scale.setScalar(0.8 + hash(i) * 0.6); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.count = pts.length; m.castShadow = true; return m; }, [pts]);
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
