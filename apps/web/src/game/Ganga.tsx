"use client";
/**
 * The Ganga and Parmat Ghat. The river is the OSM "Ganga" polygon clipped to the playable square and rendered once
 * (not per streaming tile) with an animated two-scale normal field, environment reflections and a fresnel tint, plus
 * a wet-sand shoreline. An invisible wall follows the real bank so nobody walks or drives into the water.
 * Parmat Ghat is built in a frame aligned to the real bank line: land-side stairs, a raised stone promenade, ghat
 * steps down to the water, chhatris, lamps, a diya stall, benches and moored boats.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { Text as DreiText } from "@react-three/drei";
import * as THREE from "three";
import { GEO_WORLD_SIZE, DEFAULT_APPEARANCE } from "@kanpurverse/shared";
import { getGeo, onRoadsChange, roadsVersion } from "./roads";
import { nightFactor } from "./NightLights";
import { Avatar } from "./Avatar";
import { useState } from "react";

const HALF = GEO_WORLD_SIZE / 2; export const RIVER_Y = 0.12;
/** Parmat Ghat frame: centre on the bank, along-bank unit vector and the unit normal pointing into the river. */
export const GHAT = { c: [-400, -2130] as [number, number], along: [0.908, 0.419] as [number, number], into: [0.419, -0.908] as [number, number], width: 110 };
/** Ghat-local (x along the bank, z toward the water) → world, matching the group rotation below. */
export const ghatToWorld = (lx: number, lz: number): [number, number] => [GHAT.c[0] - GHAT.along[0] * lx + GHAT.into[0] * lz, GHAT.c[1] - GHAT.along[1] * lx + GHAT.into[1] * lz];
const ghatYaw = Math.atan2(GHAT.into[0], GHAT.into[1]); // local +Z → into the river

/**
 * Sutherland–Hodgman clip of the river polygon to the playable square. (Clamping vertices instead — the first version —
 * created long diagonal edges that flooded half the city in the browser test.)
 */
export function clip(pts: [number, number][], L = HALF + 200): [number, number][] {
  type P = [number, number]; let out: P[] = pts.slice();
  const edges: [(p: P) => boolean, (a: P, b: P) => P][] = [
    [p => p[0] >= -L, (a, b) => { const t = (-L - a[0]) / (b[0] - a[0]); return [-L, a[1] + t * (b[1] - a[1])]; }],
    [p => p[0] <= L, (a, b) => { const t = (L - a[0]) / (b[0] - a[0]); return [L, a[1] + t * (b[1] - a[1])]; }],
    [p => p[1] >= -L, (a, b) => { const t = (-L - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), -L]; }],
    [p => p[1] <= L, (a, b) => { const t = (L - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), L]; }],
  ];
  for (const [inside, cut] of edges) { const src = out; out = []; for (let i = 0; i < src.length; i++) { const cur = src[i], prev = src[(i + src.length - 1) % src.length]; if (inside(cur)) { if (!inside(prev)) out.push(cut(prev, cur)); out.push(cur); } else if (inside(prev)) out.push(cut(prev, cur)); } }
  return out;
}
/** The bank: polygon edges that lie inside the playable square (the river polygon's land boundary). */
export function bankSegments(poly: [number, number][]) { const out: [[number, number], [number, number]][] = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const inside = (p: [number, number]) => Math.abs(p[0]) < HALF + 150 && Math.abs(p[1]) < HALF + 150; if (inside(a) && inside(b) && Math.abs(a[0]) < 4900 && Math.abs(b[0]) < 4900 && a[1] > -4900 && b[1] > -4900) out.push([a, b]); } return out; }

/**
 * Wet-sand strip along the bank, on the LAND side only. (The first version extended 7 m to both sides and, with its
 * polygon offset, painted a sand band over the river that the moored boats appeared to sit on.)
 */
export function shoreStrip(bank: [[number, number], [number, number]][], poly: [number, number][], width = 7, y = 0.1): number[] {
  const sp: number[] = [];
  for (const [a, b] of bank) {
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; let nx = -dz / l, nz = dx / l;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; if (inPoly([mx + nx * 2, mz + nz * 2], poly)) { nx = -nx; nz = -nz; }
    const a2: [number, number] = [a[0] + nx * width, a[1] + nz * width], b2: [number, number] = [b[0] + nx * width, b[1] + nz * width];
    sp.push(a[0], y, a[1], a2[0], y, a2[1], b[0], y, b[1], a2[0], y, a2[1], b2[0], y, b2[1], b[0], y, b[1]);
  }
  return sp;
}

function waterNormals() {
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d")!; const img = x.createImageData(256, 256);
  const h = (u: number, v: number) => Math.sin(u * 0.11 + Math.sin(v * 0.07) * 2) * 0.5 + Math.sin(v * 0.17 + u * 0.05) * 0.35 + Math.sin((u + v) * 0.31) * 0.15;
  for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) { const dx = h(i + 1, j) - h(i - 1, j), dz = h(i, j + 1) - h(i, j - 1); const n = new THREE.Vector3(-dx * 2.2, -dz * 2.2, 1).normalize(); const o = (j * 256 + i) * 4; img.data[o] = (n.x * 0.5 + 0.5) * 255; img.data[o + 1] = (n.y * 0.5 + 0.5) * 255; img.data[o + 2] = (n.z * 0.5 + 0.5) * 255; img.data[o + 3] = 255; }
  x.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(160, 160); return t;
}

export function Ganga() {
  const [ver, setVer] = useState(roadsVersion()); useEffect(() => onRoadsChange(() => setVer(roadsVersion())), []);
  const river = useMemo(() => { void ver; const g = getGeo(); const w = g?.water.find(x => (x as { name?: string }).name === "Ganga"); if (!w) return null;
    const pts = clip(w.pts); const shape = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], -p[1]))); const geo = new THREE.ShapeGeometry(shape); geo.rotateX(-Math.PI / 2); geo.translate(0, RIVER_Y, 0);
    const uv = geo.getAttribute("uv"); const pos = geo.getAttribute("position"); for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 25, pos.getZ(i) / 25);
    const bank = bankSegments(w.pts);
    const sp = shoreStrip(bank, w.pts);
    const shore = new THREE.BufferGeometry(); shore.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3)); shore.setAttribute("normal", new THREE.Float32BufferAttribute(sp.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    return { geo, bank, shore, poly: w.pts };
  }, [ver]);
  const mat = useMemo(() => { const n = waterNormals(); const n2 = n.clone(); n2.repeat.set(37, 37); return { a: new THREE.MeshStandardMaterial({ color: 0x2f5a52, roughness: 0.07, metalness: 0.35, normalMap: n, normalScale: new THREE.Vector2(0.55, 0.55), transparent: true, opacity: 0.95, envMapIntensity: 1.6 }), n, n2 }; }, []);
  useEffect(() => () => { river?.geo.dispose(); river?.shore.dispose(); mat.a.dispose(); mat.n.dispose(); }, [river, mat]);
  useFrame((_, dt) => { mat.n.offset.x += dt * 0.006; mat.n.offset.y += dt * 0.011; const k = nightFactor(); mat.a.color.setRGB(0.18 - k * 0.12, 0.35 - k * 0.24, 0.32 - k * 0.18); });
  if (!river) return null;
  return <group name="ganga">
    <mesh geometry={river.geo} material={mat.a} receiveShadow renderOrder={1} />
    <mesh geometry={river.shore}><meshStandardMaterial color="#8a7a5c" roughness={0.35} metalness={0.05} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} /></mesh>
    <RigidBody type="fixed" colliders={false}>{river.bank.map(([a, b], i) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); let nx = dz / l, nz = -dx / l; const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; if (!inPoly([mx + nx * 3, mz + nz * 3], river.poly)) { nx = -nx; nz = -nz; } const off = 2.6; return <CuboidCollider key={i} args={[l / 2 + 1, 2, 0.5]} position={[(a[0] + b[0]) / 2 + nx * off, 2, (a[1] + b[1]) / 2 + nz * off]} rotation={[0, Math.atan2(dx, dz) + Math.PI / 2, 0]} />; })}</RigidBody>
    <ParmatGhat />
  </group>;
}

const stone = new THREE.MeshStandardMaterial({ color: 0xc9a77c, roughness: 0.82 }), stoneDark = new THREE.MeshStandardMaterial({ color: 0xa88a64, roughness: 0.9 }), marble = new THREE.MeshStandardMaterial({ color: 0xf1ebe0, roughness: 0.45 });
const saffron = new THREE.MeshStandardMaterial({ color: 0xff8a1c, roughness: 0.7, side: THREE.DoubleSide }), wood = new THREE.MeshStandardMaterial({ color: 0x5b3a20, roughness: 0.8 }), boatPaint = new THREE.MeshStandardMaterial({ color: 0x2f6f9f, roughness: 0.6 });
const FONT = "/fonts/NotoSansDevanagari-400.woff";
const TOP = 1.6, STEPS = 8, STEP_D = 0.75; // promenade height, ghat steps toward the water

function ParmatGhat() {
  const W = GHAT.width; const lampMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffc070, emissiveIntensity: 0.2 }), []);
  const diyaMat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff9a2a, emissiveIntensity: 0.3 }), []);
  const boats = useRef<THREE.Group>(null);
  useFrame(({ clock }) => { const k = nightFactor(); lampMat.emissiveIntensity = 0.2 + k * 3.5; diyaMat.emissiveIntensity = 0.3 + k * 4; if (boats.current) boats.current.children.forEach((b, i) => { b.position.y = RIVER_Y + 0.05 + Math.sin(clock.elapsedTime * 1.3 + i) * 0.05; b.rotation.z = Math.sin(clock.elapsedTime * 0.9 + i * 2) * 0.03; }); });
  const steps = Array.from({ length: STEPS }, (_, i) => ({ y: TOP - (i + 1) * (TOP - 0.22) / STEPS, z: -STEPS * STEP_D + i * STEP_D + STEP_D / 2 }));
  const landSteps = Array.from({ length: 6 }, (_, i) => ({ y: (i + 1) * TOP / 7, z: -STEPS * STEP_D - 10 - 3 + i * 0.5 }));
  const [cx, cz] = GHAT.c;
  return <group position={[cx, 0, cz]} rotation={[0, ghatYaw, 0]} name="parmat-ghat">
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[W / 2, TOP / 2, 5]} position={[0, TOP / 2, -STEPS * STEP_D - 5]} />
      {steps.map((s, i) => <CuboidCollider key={i} args={[W / 2, s.y / 2, STEP_D / 2]} position={[0, s.y / 2, s.z]} />)}
      {landSteps.map((s, i) => <CuboidCollider key={"l" + i} args={[W / 2, s.y / 2, 0.25]} position={[0, s.y / 2, s.z]} />)}
      <CuboidCollider args={[W / 2, 2, 0.4]} position={[0, 2, 0.9]} />
    </RigidBody>
    {/* promenade, ghat steps, land stairs */}
    <mesh position={[0, TOP / 2, -STEPS * STEP_D - 5]} material={stone} receiveShadow castShadow><boxGeometry args={[W, TOP, 10]} /></mesh>
    {steps.map((s, i) => <mesh key={i} position={[0, s.y / 2, s.z]} material={i % 2 ? stone : stoneDark} receiveShadow><boxGeometry args={[W, s.y, STEP_D]} /></mesh>)}
    {landSteps.map((s, i) => <mesh key={"l" + i} position={[0, s.y / 2, s.z]} material={i % 2 ? stone : stoneDark} receiveShadow><boxGeometry args={[W, s.y, 0.5]} /></mesh>)}
    {/* chhatris (domed pavilions) on the promenade */}
    {[-40, -15, 15, 40].map(x => <group key={x} position={[x, TOP, -STEPS * STEP_D - 4]}>
      {[[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]].map(([px, pz], i) => <mesh key={i} position={[px, 1.6, pz]} material={marble} castShadow><cylinderGeometry args={[0.16, 0.2, 3.2, 10]} /></mesh>)}
      <mesh position={[0, 3.3, 0]} material={marble} castShadow><boxGeometry args={[3.4, 0.25, 3.4]} /></mesh>
      <mesh position={[0, 3.45, 0]} material={marble} castShadow><sphereGeometry args={[1.45, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <mesh position={[0, 5.05, 0]} material={saffron}><coneGeometry args={[0.12, 0.6, 8]} /></mesh>
      <mesh position={[0.35, 5.6, 0]} material={saffron}><planeGeometry args={[0.6, 0.35]} /></mesh>
    </group>)}
    {/* lamps and railing along the land edge of the promenade */}
    {Array.from({ length: 12 }, (_, i) => -W / 2 + 4 + i * ((W - 8) / 11)).map(x => <group key={x} position={[x, TOP, -STEPS * STEP_D - 9.6]}>
      <mesh position={[0, 1.6, 0]} material={stoneDark}><cylinderGeometry args={[0.06, 0.08, 3.2, 8]} /></mesh><mesh position={[0, 3.3, 0]} material={lampMat}><sphereGeometry args={[0.22, 12, 8]} /></mesh></group>)}
    {/* diya seller's stall with lamps */}
    <group position={[8, TOP, -STEPS * STEP_D - 2.2]}>
      <mesh position={[0, 0.45, 0]} material={wood} castShadow><boxGeometry args={[2.4, 0.9, 0.9]} /></mesh>
      {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[-1 + (i % 6) * 0.4, 0.95, -0.2 + Math.floor(i / 6) * 0.4]} material={diyaMat}><cylinderGeometry args={[0.07, 0.05, 0.06, 8]} /></mesh>)}
      <mesh position={[0, 1.8, 0]} rotation={[0.15, 0, 0]} material={saffron}><boxGeometry args={[2.8, 0.05, 1.6]} /></mesh>
      <group position={[0, 0, -1.1]}><Avatar appearance={{ ...DEFAULT_APPEARANCE, body: "f", skin: 3, hair: 2, top: 3, bottom: 2 }} anim="idle" name="दीये वाली अम्मा" nameColor="#ffd23f" /></group>
    </group>
    {/* benches */}
    {[-28, 28].map(x => <group key={x} position={[x, TOP, -STEPS * STEP_D - 7]}><mesh position={[0, 0.45, 0]} material={wood} castShadow><boxGeometry args={[2.2, 0.08, 0.5]} /></mesh>{[-0.9, 0.9].map(z => <mesh key={z} position={[z, 0.22, 0]} material={stoneDark}><boxGeometry args={[0.1, 0.44, 0.45]} /></mesh>)}</group>)}
    {/* moored boats */}
    <group ref={boats}>{[-30, -12, 22, 36].map((x, i) => <group key={x} position={[x, RIVER_Y, 3.2 + (i % 2) * 2]} rotation={[0, 0.2 * (i % 2 ? 1 : -1), 0]}>
      <mesh material={boatPaint} castShadow><boxGeometry args={[1.5, 0.45, 5.4]} /></mesh>
      <mesh position={[0, 0.24, 0]} material={wood}><boxGeometry args={[1.3, 0.06, 5]} /></mesh>
      {[-2.7, 2.7].map(z => <mesh key={z} position={[0, 0.25, z]} rotation={[z > 0 ? -0.5 : 0.5, 0, 0]} material={boatPaint}><boxGeometry args={[1.2, 0.3, 0.9]} /></mesh>)}
    </group>)}</group>
    {/* name board */}
    <group position={[0, TOP + 3.2, -STEPS * STEP_D - 9.8]}><mesh material={wood}><boxGeometry args={[7, 1.2, 0.15]} /></mesh>
      <DreiText font={FONT} position={[0, 0.12, -0.09]} rotation={[0, Math.PI, 0]} fontSize={0.55} color="#ffe6a8" anchorX="center" anchorY="middle">परमट घाट</DreiText>
      <DreiText font={FONT} position={[0, -0.36, -0.09]} rotation={[0, Math.PI, 0]} fontSize={0.22} color="#f1e3c2" anchorX="center" anchorY="middle">Parmat Ghat · गंगा मैया</DreiText></group>
  </group>;
}

export function inPoly(p: [number, number], poly: [number, number][]) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > p[1]) !== (zj > p[1]) && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) c = !c; } return c; }
