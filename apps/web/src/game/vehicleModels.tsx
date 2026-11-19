"use client";
/**
 * Original Velto Studios vehicle models, built in code (no downloaded or branded assets).
 *
 * Cars use a side-profile extrusion with real wheel-arch cut-outs, bevelled edges and a separate greenhouse, so every
 * class has its own silhouette (hatch, notchback sedan, boxy SUV, MPV, off-roader, taxi). Two-wheelers, three-wheelers,
 * the cycle rickshaw and heavy vehicles each have purpose-built geometry. Geometry is cached per class and materials per
 * colour, so 36 traffic vehicles share a handful of GPU programs. A distance LOD hides small detail beyond ~45 m.
 */
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { VEHICLE_SPECS, type VehicleKind } from "@kanpurverse/shared";
import { graphicsNow } from "../state/store";
import { vehicleCullDistance } from "./graphics";
import { roadWheelAngle } from "./driving";
import { attitudeTarget, bodyPose, wheelLocalMatrix, limitToArch, type BodyPose, type SuspensionClass } from "./suspension";

export interface VehicleVisualState { speed: number; steer: number; brake: boolean; accel?: number; lat?: number; lights?: boolean; indicator?: -1 | 0 | 1 | 2 }

// ───────────────────────────── shared materials ─────────────────────────────
const matCache = new Map<string, THREE.Material>();
function mat<T extends THREE.Material>(key: string, make: () => T): T { let m = matCache.get(key) as T | undefined; if (!m) { m = make(); matCache.set(key, m); } return m; }
export function paintMat(color: number) { return mat(`paint:${color}`, () => new THREE.MeshPhysicalMaterial({ color, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 })); }
const M = {
  trim: () => mat("trim", () => new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.55, metalness: 0.2 })),
  plastic: () => mat("plastic", () => new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.85 })),
  chrome: () => mat("chrome", () => new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.12, metalness: 1 })),
  glass: () => mat("glass", () => new THREE.MeshPhysicalMaterial({ color: 0x0c161d, roughness: 0.05, metalness: 0.25, transparent: true, opacity: 0.8, depthWrite: false, envMapIntensity: 1.8, clearcoat: 1, clearcoatRoughness: 0.02 })),
  tyre: () => mat("tyre", () => new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.92 })),
  rim: () => mat("rim", () => new THREE.MeshStandardMaterial({ color: 0xb9bec6, roughness: 0.28, metalness: 0.9 })),
  seat: () => mat("seat", () => new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 0.8 })),
  canvas: () => mat("canvas", () => new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.95 })),
  plate: () => mat("plate", () => new THREE.MeshStandardMaterial({ color: 0xf2f2ec, roughness: 0.5 })),
  plateY: () => mat("plateY", () => new THREE.MeshStandardMaterial({ color: 0xf2c400, roughness: 0.5 })),
  wood: () => mat("wood", () => new THREE.MeshStandardMaterial({ color: 0x7a4a24, roughness: 0.85 })),
  steel: () => mat("steel", () => new THREE.MeshStandardMaterial({ color: 0x70757c, roughness: 0.45, metalness: 0.8 })),
};
/** Canvas texture drawn once (client only: these factories run at render time, never at import). */
const texCache = new Map<string, THREE.CanvasTexture>();
function paintedTex(key: string, w: number, h: number, draw: (x: CanvasRenderingContext2D, w: number, h: number) => void) {
  let t = texCache.get(key); if (!t) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d")!, w, h); t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache.set(key, t); } return t;
}
const SIGN_FONT = "'Mukta','Noto Sans Devanagari','Kohinoor Devanagari',sans-serif";
/** Registration plate in the Indian layout: IND strip, state and district code (UP 78 is Kanpur Nagar), series and number. Invented numbers. */
export function plateText(kind: string, color: number) { const n = (Math.imul(color ^ 0x9e3779b9, 2654435761) >>> 0) + kind.length * 7919; const A = "ABCDEFGHJKLMNPRSTUVWXYZ"; return `UP 78 ${A[n % 23]}${A[(n >>> 5) % 23]} ${String(1000 + (n >>> 9) % 9000)}`; }
function plateMat(text: string, yellow: boolean) {
  return mat(`plate:${text}:${yellow}`, () => new THREE.MeshStandardMaterial({ roughness: 0.45, map: paintedTex(`plate:${text}:${yellow}`, 256, 64, (x, w, h) => {
    x.fillStyle = yellow ? "#f2c400" : "#f4f4ee"; x.fillRect(0, 0, w, h); x.strokeStyle = "#111"; x.lineWidth = 4; x.strokeRect(3, 3, w - 6, h - 6); x.fillStyle = "#1c3f94"; x.fillRect(6, 6, 22, h - 12); x.fillStyle = "#fff"; x.font = "700 9px sans-serif"; x.textAlign = "center"; x.fillText("IND", 17, h - 12);
    x.fillStyle = "#111"; x.textBaseline = "middle"; let size = 30; x.font = `800 ${size}px 'Mukta',monospace`; const room = w - 46; const tw = x.measureText(text).width; if (tw > room) { size = Math.floor(size * room / tw); x.font = `800 ${size}px 'Mukta',monospace`; } x.fillText(text, w / 2 + 13, h / 2 + 2); }) })); // sized to fit: at 34 px the first and last characters were cut off
}
/** Two-line plate for two- and three-wheelers. */
function plateMat2(text: string, yellow: boolean) {
  return mat(`plate2:${text}:${yellow}`, () => new THREE.MeshStandardMaterial({ roughness: 0.45, map: paintedTex(`plate2:${text}:${yellow}`, 128, 80, (x, w, h) => {
    x.fillStyle = yellow ? "#f2c400" : "#f4f4ee"; x.fillRect(0, 0, w, h); x.strokeStyle = "#111"; x.lineWidth = 4; x.strokeRect(3, 3, w - 6, h - 6); x.fillStyle = "#111"; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "800 30px 'Mukta',monospace"; x.fillText(text.slice(0, 5), w / 2, 24); x.font = "800 27px 'Mukta',monospace"; x.fillText(text.slice(6), w / 2, 56); }) }));
}
/** Back flap of an auto-rickshaw or e-rickshaw hood: a clear plastic window and a hand-painted line. */
function hoodFlapMat(auto: boolean) { const key = auto ? "flap:auto" : "flap:erick";
  return mat(key, () => new THREE.MeshStandardMaterial({ roughness: 0.9, map: paintedTex(key, 256, 256, (x, w, h) => {
    x.fillStyle = auto ? "#1b1b1d" : "#f1f3f5"; x.fillRect(0, 0, w, h); x.fillStyle = auto ? "#f2c200" : "#1d7a46"; x.fillRect(0, h - 26, w, 26); x.fillRect(0, 0, w, 8);
    x.fillStyle = auto ? "rgba(150,170,185,0.55)" : "rgba(120,150,170,0.5)"; x.beginPath(); x.roundRect(58, 34, 140, 74, 10); x.fill(); x.strokeStyle = auto ? "#3a3a3d" : "#c9ced3"; x.lineWidth = 5; x.stroke();
    x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = auto ? "#f2c200" : "#1d7a46"; x.font = `800 44px ${SIGN_FONT}`; x.fillText(auto ? "फिर मिलेंगे" : "ई-रिक्शा", w / 2, 160); x.font = `700 22px ${SIGN_FONT}`; x.fillStyle = auto ? "#e8e2c6" : "#333"; x.fillText(auto ? "कानपुर · सवारी ऑटो" : "कानपुर · बैटरी से चलता है", w / 2, 204); }) })); }
const reflectorMat = () => mat("reflector", () => new THREE.MeshStandardMaterial({ color: 0xb01020, emissive: 0x7a0812, emissiveIntensity: 0.35, roughness: 0.25 }));

/** Truck art: the hand-painted tailboard every Indian goods truck carries. */
function tailboardMat() { return mat("tailboard", () => new THREE.MeshStandardMaterial({ roughness: 0.6, map: paintedTex("tailboard", 512, 128, (x, w, h) => {
  x.fillStyle = "#17603a"; x.fillRect(0, 0, w, h); x.fillStyle = "#f2b705"; x.fillRect(0, 0, w, 10); x.fillRect(0, h - 10, w, 10); x.fillStyle = "#c8102e"; for (let k = 0; k < w; k += 32) { x.beginPath(); x.moveTo(k, 10); x.lineTo(k + 16, 26); x.lineTo(k + 32, 10); x.fill(); x.beginPath(); x.moveTo(k, h - 10); x.lineTo(k + 16, h - 26); x.lineTo(k + 32, h - 10); x.fill(); }
  x.textAlign = "center"; x.textBaseline = "middle"; x.font = "800 44px 'Mukta',sans-serif"; x.fillStyle = "#111"; x.fillText("HORN  OK  PLEASE", w / 2 + 2, h / 2 + 3); x.fillStyle = "#ffe9a8"; x.fillText("HORN  OK  PLEASE", w / 2, h / 2); }) })); }
function sloganMat() { return mat("slogan", () => new THREE.MeshStandardMaterial({ roughness: 0.6, map: paintedTex("slogan", 512, 96, (x, w, h) => {
  x.fillStyle = "#f2b705"; x.fillRect(0, 0, w, h); x.strokeStyle = "#c8102e"; x.lineWidth = 6; x.strokeRect(5, 5, w - 10, h - 10); x.fillStyle = "#7a1010"; x.textAlign = "center"; x.textBaseline = "middle"; x.font = `800 50px ${SIGN_FONT}`; x.fillText("मेरा भारत महान", w / 2, h / 2 + 3); }) })); }
function routeBoardMat() { const draw = (x: CanvasRenderingContext2D, w: number, h: number) => { x.fillStyle = "#0c0c0c"; x.fillRect(0, 0, w, h); x.fillStyle = "#ffa32b"; x.textAlign = "center"; x.textBaseline = "middle"; x.font = `800 46px ${SIGN_FONT}`; x.fillText("12  कानपुर सेंट्रल", w / 2, h / 2 + 3); };
  return mat("route", () => { const t = paintedTex("route", 512, 96, draw); return new THREE.MeshStandardMaterial({ color: 0xffffff, map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.85, roughness: 0.4 }); }); }

/**
 * Wheel geometry, cached per size. The tyre is a lathe profile (rounded shoulders, sidewall bulge, two tread grooves)
 * instead of a plain cylinder; the rim is a dished alloy face with a lip. Both are built with the axle along x and the
 * outer face towards +x; the left-hand wheels are mirrored.
 */
const wheelGeo = new Map<string, { tyre: THREE.BufferGeometry; rim: THREE.BufferGeometry }>();
export function wheelGeometry(R: number, width: number) {
  const key = `${R}:${width}`; let g = wheelGeo.get(key); if (g) return g; const hw = width / 2; const V = (r: number, a: number) => new THREE.Vector2(r, a);
  const tyre = new THREE.LatheGeometry([V(R * 0.63, -hw * 0.86), V(R * 0.74, -hw), V(R * 0.9, -hw * 1.03), V(R * 0.975, -hw * 0.84), V(R, -hw * 0.62), V(R, -hw * 0.3), V(R * 0.972, -hw * 0.25), V(R * 0.972, -hw * 0.17), V(R, -hw * 0.12),
    V(R, hw * 0.12), V(R * 0.972, hw * 0.17), V(R * 0.972, hw * 0.25), V(R, hw * 0.3), V(R, hw * 0.62), V(R * 0.975, hw * 0.84), V(R * 0.9, hw * 1.03), V(R * 0.74, hw), V(R * 0.63, hw * 0.86)], 28);
  const rim = new THREE.LatheGeometry([V(0, hw * 0.52), V(R * 0.14, hw * 0.56), V(R * 0.17, hw * 0.46), V(R * 0.5, hw * 0.5), V(R * 0.58, hw * 0.74), V(R * 0.64, hw * 0.9), V(R * 0.655, hw * 0.78), V(R * 0.64, -hw * 0.8)], 24);
  for (const geo of [tyre, rim]) { geo.rotateZ(-Math.PI / 2); geo.computeVertexNormals(); }
  g = { tyre, rim }; wheelGeo.set(key, g); return g;
}
/** Soft dark patch under a vehicle: grounds it at any sun angle and when ambient occlusion is off. */
let shadowBlob: { geo: THREE.PlaneGeometry; mat: THREE.MeshBasicMaterial } | null = null;
function contactShadow() {
  if (!shadowBlob) { const t = paintedTex("contact", 128, 128, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, w * 0.12, w / 2, h / 2, w * 0.5); g.addColorStop(0, "rgba(0,0,0,0.62)"); g.addColorStop(0.55, "rgba(0,0,0,0.34)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); });
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2); shadowBlob = { geo, mat: new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8, toneMapped: false, color: 0x000000 }) }; }
  return shadowBlob;
}

/** Light materials are per vehicle instance because their emissive level is animated. */
function useLightMats() {
  const m = useMemo(() => ({
    head: new THREE.MeshStandardMaterial({ color: 0xf4f6ff, emissive: 0xfff3d6, emissiveIntensity: 0.3, roughness: 0.1, metalness: 0.3 }),
    tail: new THREE.MeshStandardMaterial({ color: 0x9a0c18, emissive: 0xd0102a, emissiveIntensity: 0.45, roughness: 0.2 }),
    rev: new THREE.MeshStandardMaterial({ color: 0xdedede, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.2 }),
    indL: new THREE.MeshStandardMaterial({ color: 0x8a5a00, emissive: 0xffa000, emissiveIntensity: 0, roughness: 0.3 }),
    indR: new THREE.MeshStandardMaterial({ color: 0x8a5a00, emissive: 0xffa000, emissiveIntensity: 0, roughness: 0.3 }),
  }), []);
  useEffect(() => () => { for (const x of Object.values(m)) x.dispose(); }, [m]);
  return m;
}
type LightMats = ReturnType<typeof useLightMats>;

// ───────────────────────────── car profiles ─────────────────────────────
interface CarProfile { clearance: number; belt: number; nose: number; tail: number; ws: number; wsTop: number; roofEnd: number; rearGlass: number; deck?: number; roofH: number; frontOH: number; boxy: number }
const PROFILES: Partial<Record<VehicleKind, CarProfile>> = {
  //            ground clearance, beltline (fraction of height), nose/tail heights, windshield base/top, roof end, rear glass base (z as fraction of half-length)
  hatchback:  { clearance: 0.16, belt: 0.56, nose: 0.42, tail: 0.6, ws: 0.36, wsTop: 0.02, roofEnd: -0.72, rearGlass: -0.93, roofH: 1, frontOH: 0.72, boxy: 0.25 },
  taxi:       { clearance: 0.16, belt: 0.56, nose: 0.42, tail: 0.6, ws: 0.34, wsTop: 0.0, roofEnd: -0.72, rearGlass: -0.92, roofH: 1, frontOH: 0.74, boxy: 0.3 },
  sedan:      { clearance: 0.16, belt: 0.55, nose: 0.42, tail: 0.58, ws: 0.38, wsTop: 0.06, roofEnd: -0.38, rearGlass: -0.62, deck: -0.98, roofH: 0.98, frontOH: 0.76, boxy: 0.2 },
  compactsuv: { clearance: 0.21, belt: 0.58, nose: 0.52, tail: 0.64, ws: 0.4, wsTop: 0.12, roofEnd: -0.8, rearGlass: -0.94, roofH: 1, frontOH: 0.76, boxy: 0.45 },
  suv:        { clearance: 0.23, belt: 0.58, nose: 0.56, tail: 0.66, ws: 0.44, wsTop: 0.24, roofEnd: -0.9, rearGlass: -0.97, roofH: 1, frontOH: 0.84, boxy: 0.8 },
  muv:        { clearance: 0.19, belt: 0.55, nose: 0.5, tail: 0.62, ws: 0.52, wsTop: 0.22, roofEnd: -0.88, rearGlass: -0.96, roofH: 1, frontOH: 0.86, boxy: 0.55 },
  offroader:  { clearance: 0.26, belt: 0.6, nose: 0.6, tail: 0.66, ws: 0.36, wsTop: 0.3, roofEnd: -0.92, rearGlass: -0.98, roofH: 1, frontOH: 0.66, boxy: 1 },
};
const geoCache = new Map<string, THREE.BufferGeometry>();
function cached(key: string, make: () => THREE.BufferGeometry) { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; }
/** Extrude a side profile (x = forward, y = up) across the vehicle width and centre it on the chassis. */
function extrudeSide(pts: [number, number][], width: number, bevel: number) {
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 1 });
  g.translate(0, 0, -(width - bevel * 2) / 2); g.rotateY(-Math.PI / 2); g.computeVertexNormals(); return g;
}
function axles(kind: VehicleKind) { const s = VEHICLE_SPECS[kind]; const l = s.size[2]; const p = PROFILES[kind]; const front = l / 2 - (p?.frontOH ?? (l - s.wheelBase) / 2); return { front, rear: front - s.wheelBase }; }
function carGeometry(kind: VehicleKind) {
  return cached(`car:${kind}`, () => {
    const s = VEHICLE_SPECS[kind], p = PROFILES[kind]!; const [w, h, l] = s.size; const L = l / 2, gy = -h / 2, R = s.wheelR, ar = R + 0.06;
    const { front, rear } = axles(kind); const sill = gy + p.clearance; const belt = gy + h * p.belt;
    const pts: [number, number][] = [];
    pts.push([L, sill + 0.14]);
    const arch = (zc: number) => { for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI; pts.push([zc + ar * Math.cos(a), Math.max(sill, gy + R + ar * Math.sin(a) * 0.98)]); } };
    pts.push([front + ar + 0.04, sill]); arch(front); pts.push([rear + ar + 0.04, sill]); pts.push([rear + ar, sill]); arch(rear); pts.push([-L + 0.12, sill]);
    pts.push([-L, sill + 0.14]); pts.push([-L - 0.02, gy + h * p.tail * (0.75 + p.boxy * 0.2)]);
    if (p.deck) { pts.push([-L + 0.05, belt + 0.04]); pts.push([L * p.rearGlass, belt]); }
    else pts.push([-L + 0.06, belt]);
    pts.push([L * p.ws, belt]); pts.push([L - 0.2 - (1 - p.boxy) * 0.25, gy + h * (p.nose + 0.06)]); pts.push([L, gy + h * p.nose]);
    return extrudeSide(pts, w, 0.07);
  });
}
function greenhouseGeometry(kind: VehicleKind) {
  return cached(`gh:${kind}`, () => {
    const s = VEHICLE_SPECS[kind], p = PROFILES[kind]!; const [w, h, l] = s.size; const L = l / 2, gy = -h / 2; const belt = gy + h * p.belt, roof = gy + h * p.roofH - 0.05;
    const rearBase = p.deck ? L * p.rearGlass : -L + 0.06;
    const pts: [number, number][] = [[L * p.ws, belt], [L * p.wsTop, roof], [L * p.roofEnd, roof], [rearBase, belt]];
    return extrudeSide(pts, w * 0.86, 0.03);
  });
}

// ───────────────────────────── shared parts ─────────────────────────────
const fineGroups = new WeakMap<THREE.Group[], THREE.Group[]>();
/**
 * Wheel anchors (one per wheel: the group that holds the axle position and the steering yaw), keyed by the model's
 * wheel list. The frame loop keeps these on the road while the chassis pitches and rolls (see suspension.ts).
 */
interface WheelAnchor { g: THREE.Group; front: boolean; rest?: THREE.Matrix4; staticInv?: THREE.Matrix4 }
const anchorGroups = new WeakMap<THREE.Group[], WheelAnchor[]>();
function registerAnchor(key: THREE.Group[] | null, g: THREE.Group | null, front: boolean) {
  if (!g || !key) return; const list = anchorGroups.get(key) ?? []; if (!list.some(a => a.g === g)) list.push({ g, front }); anchorGroups.set(key, list);
}
/** Capture an anchor's level-chassis matrix in the vehicle frame, plus the inverse of any fixed groups above it. */
function initAnchor(a: WheelAnchor, body: THREE.Object3D) {
  const chain = new THREE.Matrix4(); let o = a.g.parent;
  while (o && o !== body) { o.updateMatrix(); chain.premultiply(o.matrix); o = o.parent; }
  a.g.updateMatrix(); a.rest = chain.clone().multiply(a.g.matrix); a.staticInv = chain.clone().invert();
}
function Wheel({ x, y, z, R, width, front, spokes = 5, wheels, fronts, i }: { x: number; y: number; z: number; R: number; width: number; front?: boolean; spokes?: number; wheels: RefObject<THREE.Group[]>; fronts: RefObject<THREE.Group[]>; i: number }) {
  void fronts; // wheels register as anchors now; `fronts` carries only extra steering assemblies (forks, handlebars)
  const register = (g: THREE.Group | null) => { if (!g || !wheels.current) return; const list = fineGroups.get(wheels.current) ?? []; if (!list.includes(g)) list.push(g); fineGroups.set(wheels.current, list); };
  const side = Math.sign(x) || 1; const wg = wheelGeometry(R, width);
  return <group position={[x, y, z]} ref={el => registerAnchor(wheels.current, el, !!front)}>
    <group ref={el => { if (el) wheels.current[i] = el; }}>
      <mesh geometry={wg.tyre} material={M.tyre()} castShadow />
      <mesh geometry={wg.rim} scale={[side, 1, 1]} material={M.rim()} />
      <group ref={register}>{Array.from({ length: spokes }, (_, k) => <mesh key={k} position={[side * width * 0.262, 0, 0]} rotation={[(k / spokes) * Math.PI * 2, 0, 0]} material={M.trim()}><boxGeometry args={[0.012, R * 0.98, R * 0.13]} /></mesh>)}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[side * width * 0.285, 0, 0]} material={M.chrome()}><cylinderGeometry args={[R * 0.13, R * 0.15, 0.03, 12]} /></mesh></group>
    </group>
  </group>;
}
function TwoWheel({ z, y, R, wheels, fronts, i, front, width = 0.1 }: { z: number; y: number; R: number; wheels: RefObject<THREE.Group[]>; fronts: RefObject<THREE.Group[]>; i: number; front?: boolean; width?: number }) {
  void fronts;
  return <group position={[0, y, z]} ref={el => registerAnchor(wheels.current, el, !!front)}>
    <group ref={el => { if (el) wheels.current[i] = el; }}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={M.tyre()} castShadow><torusGeometry args={[R - width * 0.45, width * 0.48, 10, 26]} /></mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} material={M.rim()}><torusGeometry args={[R - width * 0.95, 0.014, 6, 24]} /></mesh>
      {Array.from({ length: 8 }, (_, k) => <mesh key={k} rotation={[(k / 8) * Math.PI, 0, 0]} material={M.steel()}><boxGeometry args={[0.01, (R - width) * 2, 0.008]} /></mesh>)}
      <mesh rotation={[0, 0, Math.PI / 2]} material={M.chrome()}><cylinderGeometry args={[0.05, 0.05, width + 0.04, 10]} /></mesh>
    </group>
  </group>;
}
const Box = ({ p, s, m, r, cast }: { p: [number, number, number]; s: [number, number, number]; m: THREE.Material; r?: [number, number, number]; cast?: boolean }) => <mesh position={p} rotation={r} material={m} castShadow={cast}><boxGeometry args={s} /></mesh>;
const Cyl = ({ p, r = [0, 0, 0], rt, rb, h, m, seg = 12 }: { p: [number, number, number]; r?: [number, number, number]; rt: number; rb?: number; h: number; m: THREE.Material; seg?: number }) => <mesh position={p} rotation={r} material={m}><cylinderGeometry args={[rt, rb ?? rt, h, seg]} /></mesh>;
/**
 * Bodywork a box cannot give: a side profile (z forward, y up; a smooth closed curve through `pts`) swept across the
 * vehicle's width with rounded edges. Cached per key; the scooter's body, apron and seat are built from these.
 */
const profileCache = new Map<string, THREE.BufferGeometry>();
export function profileGeometry(key: string, pts: [number, number][], width: number, bevel = 0.03): THREE.BufferGeometry {
  let g = profileCache.get(key); if (g) return g;
  const shape = new THREE.Shape(); shape.moveTo(pts[0][0], pts[0][1]); shape.splineThru(pts.slice(1).map(q => new THREE.Vector2(q[0], q[1]))); shape.closePath();
  const depth = Math.max(0.01, width - bevel * 2);
  g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 3, curveSegments: 16 });
  g.rotateY(-Math.PI / 2); g.translate(depth / 2, 0, 0); profileCache.set(key, g); return g;
}
const Profile = ({ k, pts, w, bevel, m, y = 0, cast }: { k: string; pts: [number, number][]; w: number; bevel?: number; m: THREE.Material; y?: number; cast?: boolean }) => <mesh geometry={profileGeometry(k, pts, w, bevel)} material={m} position={[0, y, 0]} castShadow={cast} />;
/** Thin box spanning two points on one side of the car (pillars, rails). */
function Strut({ a, b, x, t, m }: { a: [number, number]; b: [number, number]; x: number; t: number; m: THREE.Material }) {
  const dz = b[0] - a[0], dy = b[1] - a[1]; const len = Math.hypot(dz, dy);
  return <mesh position={[x, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2]} rotation={[-Math.atan2(dy, dz), 0, 0]} material={m}><boxGeometry args={[0.06, t, len + 0.02]} /></mesh>;
}

// ───────────────────────────── cars ─────────────────────────────
function Car({ kind, color, lm, wheels, fronts, detail }: { kind: VehicleKind; color: number; lm: LightMats; wheels: RefObject<THREE.Group[]>; fronts: RefObject<THREE.Group[]>; detail: RefObject<THREE.Group | null> }) {
  const s = VEHICLE_SPECS[kind], p = PROFILES[kind]!; const [w, h, l] = s.size; const L = l / 2, gy = -h / 2, R = s.wheelR; const { front, rear } = axles(kind);
  const paint = paintMat(color); const belt = gy + h * p.belt, roof = gy + h * p.roofH - 0.05; const xs = w * 0.43;
  const wsA: [number, number] = [L * p.ws, belt], wsB: [number, number] = [L * p.wsTop, roof], rB: [number, number] = [L * p.roofEnd, roof], rA: [number, number] = [p.deck ? L * p.rearGlass : -L + 0.06, belt];
  const lampY = gy + h * p.nose - 0.08, tailY = gy + h * p.tail * 0.9 - 0.08; const isTaxi = kind === "taxi";
  return <group>
    <mesh geometry={carGeometry(kind)} material={paint} castShadow receiveShadow />
    <mesh geometry={greenhouseGeometry(kind)} material={M.glass()} />
    {/* roof skin and pillars (A, B, C) */}
    <Box p={[0, roof + 0.02, (wsB[0] + rB[0]) / 2]} s={[w * 0.87, 0.06, wsB[0] - rB[0] + 0.06]} m={paint} cast />
    {[-1, 1].map(sx => <group key={sx}><Strut a={wsA} b={wsB} x={sx * xs} t={0.07} m={paint} /><Strut a={rB} b={rA} x={sx * xs} t={p.boxy > 0.5 ? 0.1 : 0.16} m={paint} />
      <Box p={[sx * xs, (belt + roof) / 2, wsB[0] * 0.3 + rB[0] * 0.7 + 0.15]} s={[0.06, roof - belt, 0.09]} m={M.trim()} /></group>)}
    {/* bumpers, grille, plates */}
    <Box p={[0, gy + p.clearance + 0.12, L + 0.02]} s={[w * 0.98, 0.2, 0.12]} m={M.plastic()} />
    <Box p={[0, gy + p.clearance + 0.12, -L - 0.02]} s={[w * 0.98, 0.2, 0.12]} m={M.plastic()} />
    <Box p={[0, lampY - 0.02, L + 0.03]} s={[w * (0.38 + p.boxy * 0.2), 0.16 + p.boxy * 0.08, 0.05]} m={M.trim()} />
    <Box p={[0, lampY + 0.03, L + 0.058]} s={[w * 0.36, 0.02, 0.01]} m={M.chrome()} />
    <Box p={[0, gy + p.clearance + 0.13, L + 0.085]} s={[0.5, 0.125, 0.012]} m={plateMat(plateText(kind, color), isTaxi)} />
    <Box p={[0, gy + p.clearance + 0.13, -L - 0.086]} s={[0.5, 0.125, 0.012]} m={plateMat(plateText(kind, color), isTaxi)} />{/* on the bumper: at tailgate height it sat inside the bodywork and never showed */}
    {/* lamps: headlights, DRL, tail, reverse, indicators */}
    {[-1, 1].map(sx => <group key={sx}>
      <Box p={[sx * (w / 2 - 0.26), lampY, L + 0.005]} s={[0.36, 0.13, 0.08]} m={lm.head} />
      <Box p={[sx * (w / 2 - 0.12), lampY - 0.1, L + 0.03]} s={[0.12, 0.05, 0.04]} m={sx > 0 ? lm.indL : lm.indR} />
      <Box p={[sx * (w / 2 - 0.2), tailY, -L - 0.045]} s={[0.3, 0.14, 0.06]} m={lm.tail} />
      <Box p={[sx * (w / 2 - 0.42), tailY, -L - 0.047]} s={[0.1, 0.1, 0.05]} m={lm.rev} />
      <Box p={[sx * (w / 2 - 0.2), tailY + 0.1, -L - 0.047]} s={[0.24, 0.04, 0.05]} m={sx > 0 ? lm.indL : lm.indR} />
    </group>)}
    <group ref={detail}>
      {/* mirrors, handles, door shut lines, interior dash and steering wheel */}
      {[-1, 1].map(sx => <group key={sx}>
        <Box p={[sx * (w / 2 + 0.08), belt + 0.08, wsA[0] - 0.12]} s={[0.14, 0.1, 0.18]} m={paint} />
        <Box p={[sx * (w / 2 + 0.002), belt - 0.08, 0.05]} s={[0.01, 0.022, 0.14]} m={M.chrome()} />
        <Box p={[sx * (w / 2 + 0.002), belt - 0.08, -0.85]} s={[0.01, 0.022, 0.14]} m={M.chrome()} />
        <Box p={[sx * (w / 2 + 0.004), (belt + gy + p.clearance) / 2 + 0.02, wsA[0] - 0.05]} s={[0.006, belt - gy - p.clearance - 0.1, 0.012]} m={M.trim()} />
        <Box p={[sx * (w / 2 + 0.004), (belt + gy + p.clearance) / 2 + 0.02, -0.35]} s={[0.006, belt - gy - p.clearance - 0.1, 0.012]} m={M.trim()} />
      </group>)}
      <Box p={[0, belt + 0.02, wsA[0] - 0.22]} s={[w * 0.8, 0.16, 0.36]} m={M.plastic()} />
      <mesh position={[w * 0.23, belt + 0.12, wsA[0] - 0.45]} rotation={[-0.35, 0, 0]} material={M.trim()}><torusGeometry args={[0.18, 0.025, 8, 20]} /></mesh>
      {(kind === "suv" || kind === "muv" || kind === "compactsuv") && [-1, 1].map(sx => <Box key={sx} p={[sx * w * 0.36, roof + 0.08, (wsB[0] + rB[0]) / 2]} s={[0.04, 0.04, (wsB[0] - rB[0]) * 0.9]} m={M.steel()} />)}
      {kind === "offroader" && <><Cyl p={[0, tailY - 0.05, -L - 0.17]} r={[Math.PI / 2, 0, 0]} rt={R * 1.05} h={0.24} m={M.tyre()} seg={20} /><Box p={[0, gy + h * 0.72, L * 0.05]} s={[w * 0.9, 0.05, 0.05]} m={M.trim()} /></>}
      {isTaxi && <Box p={[0, roof + 0.16, (wsB[0] + rB[0]) / 2]} s={[0.62, 0.2, 0.26]} m={mat("taxisign", () => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd23f, emissiveIntensity: 0.9 }))} />}
      {/* wipers, aerial, exhaust, mud flaps, side mouldings, fog lamps, rear reflectors */}
      <Box p={[w * 0.17, belt + 0.035, wsA[0] + 0.02]} s={[w * 0.32, 0.012, 0.022]} r={[0, 0.06, 0]} m={M.trim()} /><Box p={[-w * 0.2, belt + 0.035, wsA[0] + 0.02]} s={[w * 0.32, 0.012, 0.022]} r={[0, 0.06, 0]} m={M.trim()} />
      <Cyl p={[w * 0.3, roof + 0.2, rB[0] + 0.3]} r={[-0.5, 0, 0]} rt={0.006} h={0.42} m={M.trim()} seg={5} />
      <Cyl p={[-w * 0.28, gy + p.clearance + 0.03, -L - 0.05]} r={[Math.PI / 2, 0, 0]} rt={0.03} h={0.18} m={M.chrome()} seg={10} />
      {[front, rear].flatMap(z => [-1, 1].map(sx => <Box key={`flap:${z}:${sx}`} p={[sx * (w / 2 - 0.13), gy + R * 0.55, z - R - 0.075]} s={[0.2, R * 0.7, 0.012]} m={M.plastic()} />))}
      {[-1, 1].map(sx => <group key={`trim:${sx}`}>
        <Box p={[sx * (w / 2 + 0.005), gy + p.clearance + 0.21, (front + rear) / 2]} s={[0.014, 0.05, s.wheelBase - 2 * R - 0.24]} m={M.plastic()} />
        <Box p={[sx * (w / 2 - 0.3), gy + p.clearance + 0.13, L + 0.086]} s={[0.12, 0.055, 0.02]} m={lm.head} />
        <Box p={[sx * (w / 2 - 0.22), gy + p.clearance + 0.13, -L - 0.086]} s={[0.15, 0.04, 0.012]} m={reflectorMat()} />
      </group>)}
      {/* wheel-arch liners */}
      {[front, rear].flatMap(z => [-1, 1].map(sx => <mesh key={`${z}:${sx}`} position={[sx * (w / 2 - 0.12), gy + R, z]} rotation={[0, Math.PI / 2, 0]} material={M.plastic()}><torusGeometry args={[R + 0.07, 0.035, 6, 16, Math.PI]} /></mesh>))}
    </group>
    {[front, rear].flatMap((z, ai) => [-1, 1].map((sx, k) => <Wheel key={`${ai}:${k}`} i={ai * 2 + k} x={sx * (w / 2 - 0.13)} y={gy + R} z={z} R={R} width={0.21} front={ai === 0} wheels={wheels} fronts={fronts} />))}
  </group>;
}

// ───────────────────────────── two-wheelers ─────────────────────────────
function TwoWheeler({ kind, color, lm, wheels, fronts, detail }: { kind: VehicleKind; color: number; lm: LightMats; wheels: RefObject<THREE.Group[]>; fronts: RefObject<THREE.Group[]>; detail: RefObject<THREE.Group | null> }) {
  const s = VEHICLE_SPECS[kind]; const [, h] = s.size; const R = s.wheelR, gy = -h / 2, wy = gy + R; const half = s.wheelBase / 2;
  const paint = paintMat(color); const sport = kind === "sportbike", cruiser = kind === "cruiser", scooter = kind === "scooter";
  const forkTopY = gy + R + 0.62;
  return <group>
    <TwoWheel z={half} y={wy} R={R} wheels={wheels} fronts={fronts} i={0} front width={scooter ? 0.11 : sport ? 0.12 : 0.1} />
    <TwoWheel z={-half} y={wy} R={R} wheels={wheels} fronts={fronts} i={1} width={scooter ? 0.12 : sport ? 0.17 : 0.12} />
    {/* steering assembly turns with the front wheel group */}
    <group ref={el => { if (el) fronts.current[2] = el; }} position={[0, 0, half]}>
      {[-1, 1].map(sx => <Cyl key={sx} p={[sx * 0.075, (wy + forkTopY) / 2, -0.09]} r={[-0.42, 0, 0]} rt={0.022} h={0.66} m={sport ? M.chrome() : M.steel()} />)}
      <Cyl p={[0, forkTopY + 0.08, -0.22]} r={[0, 0, Math.PI / 2]} rt={0.018} h={sport ? 0.6 : 0.72} m={cruiser ? M.chrome() : M.trim()} />
      {[-1, 1].map(sx => <Box key={sx} p={[sx * 0.3, forkTopY + 0.17, -0.25]} s={[0.07, 0.05, 0.02]} m={M.chrome()} />)}
      {sport ? <Box p={[0, forkTopY - 0.02, -0.02]} s={[0.34, 0.26, 0.2]} r={[-0.5, 0, 0]} m={paint} /> : scooter ? null : <mesh position={[0, forkTopY - 0.05, -0.05]} rotation={[Math.PI / 2, 0, 0]} material={cruiser ? M.chrome() : M.trim()}><cylinderGeometry args={[0.1, 0.11, 0.12, 18]} /></mesh>}
      {!scooter && <Box p={[0, forkTopY - 0.04, sport ? 0.09 : 0.02]} s={[sport ? 0.2 : 0.14, 0.06, 0.02]} m={lm.head} />}
      {!scooter && <mesh position={[0, wy + R * 0.95, 0]} rotation={[0, Math.PI / 2, 0]} material={cruiser ? paint : M.plastic()}><torusGeometry args={[R + 0.03, 0.04, 6, 14, Math.PI * 0.7]} /></mesh>}
      {/* mirrors on stalks, instrument pod, front indicators: all turn with the handlebar */}
      {[-1, 1].map(sx => <group key={`m${sx}`}><Cyl p={[sx * 0.27, forkTopY + 0.2, -0.22]} r={[0, 0, -sx * 0.25]} rt={0.008} h={0.24} m={M.trim()} seg={5} />
        <mesh position={[sx * 0.3, forkTopY + 0.33, -0.21]} rotation={[Math.PI / 2, 0, 0]} material={M.chrome()}><cylinderGeometry args={[0.055, 0.055, 0.014, 12]} /></mesh>
        <Box p={[sx * (scooter ? 0.2 : 0.17), forkTopY + (scooter ? 0.07 : -0.05), scooter ? -0.18 : 0.0]} s={[0.05, 0.035, 0.04]} m={sx > 0 ? lm.indL : lm.indR} /></group>)}
      <Box p={[0, forkTopY + 0.13, -0.17]} s={[0.17, 0.06, 0.09]} r={[-0.5, 0, 0]} m={M.plastic()} />
      {scooter && <><mesh position={[0, forkTopY + 0.07, -0.2]} scale={[0.2, 0.075, 0.1]} material={paint}><sphereGeometry args={[1, 14, 10]} /></mesh><Box p={[0, forkTopY + 0.065, -0.105]} s={[0.15, 0.07, 0.03]} m={lm.head} /></>}
    </group>
    {scooter ? <>
      {/* swept bodywork (profiles are z forward, y above the ground line): tail and engine cover, leg shield, seat */}
      <Profile k="scooter-body" y={gy} w={0.42} bevel={0.06} m={paint} cast pts={[[-0.04, 0.3], [-0.1, 0.56], [-0.2, 0.73], [-0.5, 0.76], [-0.8, 0.74], [-0.93, 0.66], [-0.94, 0.56], [-0.84, 0.45], [-0.62, 0.39], [-0.3, 0.31]]} />
      <Profile k="scooter-apron" y={gy} w={0.46} bevel={0.02} m={paint} cast pts={[[0.2, 0.3], [0.27, 0.5], [0.31, 0.72], [0.325, 0.9], [0.385, 0.92], [0.4, 0.72], [0.37, 0.5], [0.3, 0.3]]} />
      <Profile k="scooter-seat" y={gy} w={0.31} bevel={0.03} m={M.seat()} pts={[[-0.04, 0.75], [-0.1, 0.82], [-0.42, 0.835], [-0.74, 0.87], [-0.84, 0.84], [-0.8, 0.76], [-0.4, 0.745]]} />
      <Box p={[0, gy + 0.32, 0.08]} s={[0.36, 0.06, 0.4]} m={M.plastic()} />
      <Box p={[0, gy + 0.23, -0.12]} s={[0.26, 0.14, 0.56]} m={M.trim()} />
      {/* horn grille and a chrome brow on the leg shield; the headlamp is in the handlebar cowl and turns with it */}
      <Box p={[0, gy + 0.6, 0.385]} s={[0.07, 0.2, 0.02]} m={M.trim()} />
      <Box p={[0, gy + 0.8, 0.392]} s={[0.22, 0.012, 0.02]} m={M.chrome()} />
      {/* chrome strip and a vent down each side panel */}
      {[-1, 1].map(sx => <group key={sx}><Box p={[sx * 0.212, gy + 0.6, -0.52]} s={[0.006, 0.014, 0.5]} m={M.chrome()} /><Box p={[sx * 0.212, gy + 0.5, -0.62]} s={[0.006, 0.05, 0.14]} m={M.trim()} /></group>)}
      <mesh position={[0, wy + 0.04, half]} rotation={[0, Math.PI / 2, 0]} material={paint}><torusGeometry args={[R + 0.05, 0.05, 6, 14, Math.PI * 0.8]} /></mesh>
    </> : <>
      {/* tank, seat, frame, engine, exhaust, side panels */}
      <mesh position={[0, gy + R + 0.6, 0.18]} scale={[sport ? 0.2 : 0.17, 0.13, sport ? 0.32 : 0.27]} material={paint} castShadow><sphereGeometry args={[1, 18, 12]} /></mesh>
      {cruiser && <Box p={[0, gy + R + 0.68, 0.18]} s={[0.02, 0.02, 0.46]} m={M.chrome()} />}
      <Box p={[0, gy + R + (sport ? 0.62 : 0.55), -0.28]} s={[0.26, 0.08, sport ? 0.5 : 0.62]} r={[sport ? -0.12 : 0, 0, 0]} m={M.seat()} />
      <Cyl p={[0, gy + R + 0.42, 0.25]} r={[0.9, 0, 0]} rt={0.03} h={0.55} m={M.trim()} />
      <Cyl p={[0, gy + R + 0.35, -0.3]} r={[-0.55, 0, 0]} rt={0.025} h={0.6} m={M.trim()} />
      <Box p={[0, gy + R + 0.2, 0.06]} s={[0.26, 0.3, 0.34]} m={cruiser ? M.steel() : M.trim()} cast />
      {cruiser && Array.from({ length: 5 }, (_, k) => <Box key={k} p={[0, gy + R + 0.3 + k * 0.03, 0.06]} s={[0.3, 0.012, 0.3]} m={M.chrome()} />)}
      <Cyl p={[0.16, gy + R + (sport ? 0.25 : 0.06), -0.42]} r={[Math.PI / 2 - (sport ? 0.5 : 0.08), 0, 0]} rt={sport ? 0.06 : 0.045} rb={0.04} h={sport ? 0.4 : 0.85} m={M.chrome()} />
      {[-1, 1].map(sx => <Box key={sx} p={[sx * 0.13, gy + R + 0.4, -0.28]} s={[0.04, 0.16, 0.3]} m={paint} />)}
      {sport && <Box p={[0, gy + R + 0.66, -0.6]} s={[0.18, 0.1, 0.32]} r={[-0.3, 0, 0]} m={paint} />}
      <mesh position={[0, wy + 0.04, -half]} rotation={[0, Math.PI / 2, 0]} material={cruiser ? paint : M.plastic()}><torusGeometry args={[R + 0.04, 0.05, 6, 14, Math.PI * 0.6]} /></mesh>
    </>}
    <Box p={scooter ? [0, gy + 0.62, -0.945] : [0, gy + R + 0.62, -half - 0.05]} s={scooter ? [0.2, 0.08, 0.04] : [0.14, 0.06, 0.04]} m={lm.tail} />
    <group ref={detail}>{[-1, 1].map(sx => <Box key={sx} p={scooter ? [sx * 0.15, gy + 0.6, -0.935] : [sx * 0.13, gy + R + 0.55, -half - 0.02]} s={[0.05, 0.03, 0.04]} m={sx > 0 ? lm.indL : lm.indR} />)}
      <Box p={scooter ? [0, gy + 0.46, -0.925] : [0, gy + R + 0.4, -half - 0.12]} s={[0.2, 0.125, 0.01]} m={plateMat2(plateText(kind, color), false)} />
      {/* grab rail, foot pegs, side stand; rear shocks and a crash guard on the motorcycles */}
      <Cyl p={scooter ? [0, gy + 0.86, -0.9] : [0, gy + R + 0.63, -half + 0.04]} r={[0, 0, Math.PI / 2]} rt={0.012} h={0.3} m={M.steel()} seg={6} />
      {[-1, 1].map(sx => <group key={`d${sx}`}><Cyl p={scooter ? [sx * 0.15, gy + 0.83, -0.79] : [sx * 0.15, gy + R + 0.6, -half + 0.16]} r={[Math.PI / 2 - 0.2, 0, 0]} rt={0.011} h={0.26} m={M.steel()} seg={6} />
        <Box p={[sx * 0.19, gy + R + 0.04, scooter ? -0.3 : -0.08]} s={[0.1, 0.02, 0.045]} m={M.trim()} />
        {!scooter && <Cyl p={[sx * 0.1, gy + R + 0.27, -half + 0.13]} r={[-0.4, 0, 0]} rt={0.022} h={0.44} m={M.chrome()} seg={8} />}
        {!scooter && !sport && <><Cyl p={[sx * 0.2, gy + R + 0.22, 0.27]} r={[0, 0, sx * 0.55]} rt={0.013} h={0.3} m={M.steel()} seg={6} /><Cyl p={[sx * 0.27, gy + R + 0.1, 0.27]} rt={0.013} h={0.16} m={M.steel()} seg={6} /></>}
      </group>)}
      <Cyl p={[0.14, gy + R - 0.1, -0.12]} r={[0, 0, -0.5]} rt={0.01} h={0.3} m={M.steel()} seg={5} /></group>
  </group>;
}

// ───────────────────────────── three-wheelers and pedal rickshaw ─────────────────────────────
function ThreeWheeler({ kind, color, lm, wheels, fronts, detail }: { kind: VehicleKind; color: number; lm: LightMats; wheels: RefObject<THREE.Group[]>; fronts: RefObject<THREE.Group[]>; detail: RefObject<THREE.Group | null> }) {
  const s = VEHICLE_SPECS[kind]; const [w, h, l] = s.size; const R = s.wheelR, gy = -h / 2, wy = gy + R, L = l / 2; const paint = paintMat(color);
  const auto = kind === "auto", pedal = kind === "cyclerickshaw"; const fz = L - 0.32, rz = fz - s.wheelBase;
  const hood = auto ? M.canvas() : pedal ? mat("rickhood", () => new THREE.MeshStandardMaterial({ color: 0x1d3f8a, roughness: 0.9 })) : paintMat(0xf3f5f7);
  const yellow = mat("autoyellow", () => new THREE.MeshPhysicalMaterial({ color: 0xf2c200, roughness: 0.35, clearcoat: 0.8 }));
  return <group>
    <TwoWheel z={fz} y={wy} R={R} wheels={wheels} fronts={fronts} i={0} front width={0.11} />
    {[-1, 1].map((sx, k) => <group key={sx} position={[sx * (w / 2 - 0.1), 0, 0]}><TwoWheel z={rz} y={wy} R={R} wheels={wheels} fronts={fronts} i={1 + k} width={pedal ? 0.06 : 0.13} /></group>)}
    {pedal ? <>
      <Cyl p={[0, wy + 0.36, fz - 0.35]} r={[1.1, 0, 0]} rt={0.025} h={0.8} m={paint} />
      <Cyl p={[0, wy + 0.25, (fz + rz) / 2 + 0.25]} r={[Math.PI / 2, 0, 0]} rt={0.03} h={1.3} m={paint} />
      <Box p={[0, wy + 0.72, fz - 0.55]} s={[0.2, 0.06, 0.26]} m={M.seat()} />
      <Cyl p={[0, wy + 0.82, fz - 0.05]} r={[0, 0, Math.PI / 2]} rt={0.015} h={0.56} m={M.chrome()} />
      <Box p={[0, wy + 0.2, rz + 0.1]} s={[w * 0.9, 0.08, 0.9]} m={M.wood()} cast />
      <Box p={[0, wy + 0.5, rz + 0.05]} s={[w * 0.82, 0.12, 0.5]} m={paint} />
      <Box p={[0, wy + 0.8, rz - 0.22]} s={[w * 0.82, 0.5, 0.08]} m={paint} />
      <mesh position={[0, wy + 1.0, rz + 0.05]} rotation={[0, 0, Math.PI / 2]} material={hood}><cylinderGeometry args={[0.6, 0.6, w * 0.88, 14, 1, true, 0, Math.PI]} /></mesh>
    </> : <>
      <Box p={[0, gy + 0.36, -0.15]} s={[w * 0.98, 0.32, l * 0.72]} m={paint} cast />
      <mesh position={[0, gy + 0.62, fz - 0.05]} scale={[w * 0.32, 0.55, 0.32]} material={auto ? yellow : paint} castShadow><sphereGeometry args={[1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <Box p={[0, gy + 0.98, fz - 0.15]} s={[w * 0.62, 0.42, 0.04]} r={[-0.18, 0, 0]} m={M.glass()} />
      <Box p={[0, gy + 0.9, fz - 0.45]} s={[w * 0.5, 0.3, 0.24]} m={M.plastic()} />
      <Cyl p={[0, gy + 1.0, fz - 0.42]} r={[0, 0, Math.PI / 2]} rt={0.018} h={0.6} m={M.chrome()} />
      <Box p={[0, gy + 0.62, rz + 0.05]} s={[w * 0.9, 0.16, 0.6]} m={M.seat()} />
      <Box p={[0, gy + 0.88, rz - 0.22]} s={[w * 0.9, 0.42, 0.1]} m={M.seat()} />
      {/* canopy frame and hood */}
      {[-1, 1].flatMap(sx => [fz - 0.25, rz - 0.3].map(z => <Cyl key={`${sx}:${z}`} p={[sx * (w / 2 - 0.04), gy + 1.15, z]} rt={0.02} h={1.0} m={M.steel()} />))}
      <Box p={[0, gy + h - 0.04, (fz + rz) / 2 - 0.15]} s={[w + 0.06, 0.07, l * 0.86]} m={hood} cast />
      <mesh position={[0, gy + h - 0.1, (fz + rz) / 2 - 0.15]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.25]} material={hood}><cylinderGeometry args={[w / 2 + 0.02, w / 2 + 0.02, l * 0.86, 14, 1, true, Math.PI / 2, Math.PI]} /></mesh>
      {auto && <Box p={[0, gy + 0.26, -0.15]} s={[w * 1.0, 0.07, l * 0.72]} m={yellow} />}
      {!auto && [-1, 1].map(sx => <Box key={sx} p={[sx * (w / 2 + 0.01), gy + 0.75, rz + 0.1]} s={[0.02, 0.06, 0.9]} m={M.steel()} />)}
      <mesh position={[0, gy + 0.62, fz + 0.24]} rotation={[Math.PI / 2, 0, 0]} material={lm.head}><cylinderGeometry args={[0.08, 0.08, 0.06, 14]} /></mesh>
    </>}
    {[-1, 1].map(sx => <group key={sx}><Box p={[sx * (w / 2 - 0.12), gy + 0.42, -L + 0.02]} s={[0.14, 0.1, 0.04]} m={lm.tail} /></group>)}
    <group ref={detail}>{[-1, 1].map(sx => <Box key={sx} p={[sx * (w / 2 - 0.05), gy + 0.55, fz]} s={[0.05, 0.05, 0.05]} m={sx > 0 ? lm.indL : lm.indR} />)}
      {!pedal && <>
        <Box p={[0, gy + 0.3, -L - 0.006]} s={[0.24, 0.15, 0.01]} m={plateMat2(plateText(kind, color), true)} />
        <Box p={[0, gy + 1.12, -L + 0.05]} s={[w * 0.94, 1.0, 0.03]} m={hoodFlapMat(auto)} />
        {[-1, 1].map(sx => <group key={`tw${sx}`}><Cyl p={[sx * (w / 2 + 0.03), gy + 1.02, fz - 0.2]} r={[0, 0, -sx * 0.7]} rt={0.008} h={0.2} m={M.trim()} seg={5} /><Box p={[sx * (w / 2 + 0.1), gy + 1.1, fz - 0.2]} s={[0.02, 0.12, 0.09]} m={M.chrome()} /></group>)}
        <Box p={[w * 0.08, gy + 0.86, fz - 0.105]} s={[w * 0.3, 0.012, 0.02]} r={[-0.18, 0, 0.5]} m={M.trim()} />
        <Cyl p={[0, gy + 0.24, fz + 0.3]} r={[0, 0, Math.PI / 2]} rt={0.02} h={w * 0.7} m={M.steel()} seg={8} /><Cyl p={[0, gy + 0.26, -L - 0.04]} r={[0, 0, Math.PI / 2]} rt={0.022} h={w * 0.96} m={M.steel()} seg={8} />
        <Cyl p={[0, gy + 1.06, 0.12]} r={[0, 0, Math.PI / 2]} rt={0.015} h={w * 0.9} m={M.steel()} seg={8} />
        {auto && <Box p={[w * 0.2, gy + 1.0, fz - 0.4]} s={[0.12, 0.16, 0.08]} m={M.trim()} />}
      </>}
      {pedal && <>{[-0.25, 0.05, 0.35].map(dz => <mesh key={dz} position={[0, wy + 1.0, rz + dz]} rotation={[0, Math.PI / 2, 0]} material={M.steel()}><torusGeometry args={[0.6, 0.012, 5, 14, Math.PI]} /></mesh>)}
        <Box p={[0, wy + 0.57, rz + 0.05]} s={[w * 0.78, 0.07, 0.46]} m={mat("rickseat", () => new THREE.MeshStandardMaterial({ color: 0xa3261e, roughness: 0.8 }))} /><Box p={[0, wy + 0.22, rz + 0.62]} s={[w * 0.7, 0.03, 0.28]} m={M.steel()} />
        <mesh position={[0.09, wy + 0.02, fz - 0.62]} rotation={[0, Math.PI / 2, 0]} material={M.steel()}><torusGeometry args={[0.1, 0.012, 5, 14]} /></mesh></>}</group>
  </group>;
}

// ───────────────────────────── heavy vehicles ─────────────────────────────
function Heavy({ kind, color, lm, wheels, fronts, detail }: { kind: VehicleKind; color: number; lm: LightMats; wheels: RefObject<THREE.Group[]>; fronts: RefObject<THREE.Group[]>; detail: RefObject<THREE.Group | null> }) {
  const s = VEHICLE_SPECS[kind]; const [w, h, l] = s.size; const R = s.wheelR, gy = -h / 2, L = l / 2; const paint = paintMat(color);
  const bus = kind === "bus" || kind === "schoolbus", van = kind === "van"; const fz = L - (bus ? 1.6 : 0.95), rz = fz - s.wheelBase;
  const floor = gy + R + 0.25;
  const cabLen = van ? 1.3 : 1.8; const cabTop = van ? gy + h : gy + h * 0.9;
  const band = mat(`band:${kind}`, () => new THREE.MeshStandardMaterial({ color: kind === "schoolbus" ? 0x111111 : kind === "bus" ? 0xf2f2f2 : 0xc8102e, roughness: 0.5 }));
  return <group>
    {bus ? <>
      <Box p={[0, (floor + gy + h) / 2, 0]} s={[w, gy + h - floor, l]} m={paint} cast />
      <Box p={[0, floor + (gy + h - floor) * 0.62, 0]} s={[w + 0.01, (gy + h - floor) * 0.36, l - 0.5]} m={M.glass()} />
      {Array.from({ length: Math.floor(l / 1.2) }, (_, k) => -L + 0.6 + k * 1.2).map(z => [-1, 1].map(sx => <Box key={`${z}:${sx}`} p={[sx * (w / 2 + 0.008), floor + (gy + h - floor) * 0.62, z]} s={[0.02, (gy + h - floor) * 0.36, 0.1]} m={paint} />))}
      <Box p={[0, floor + 0.35, 0]} s={[w + 0.012, 0.16, l - 0.1]} m={band} />
      <Box p={[0, floor + (gy + h - floor) * 0.6, L + 0.01]} s={[w * 0.92, (gy + h - floor) * 0.48, 0.04]} m={M.glass()} />
      <Box p={[0, gy + h - 0.28, L + 0.03]} s={[w * 0.74, 0.3, 0.03]} m={kind === "bus" ? routeBoardMat() : mat("route-plain", () => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff8a1c, emissiveIntensity: 0.9 }))} />
      <Box p={[-(w / 2 + 0.01), floor + 0.8, L - 1.0]} s={[0.02, 1.6, 0.9]} m={M.trim()} />
      <Box p={[0, gy + h + 0.06, 0]} s={[w * 0.8, 0.12, l * 0.5]} m={M.steel()} />
    </> : <>
      {/* cab */}
      <Box p={[0, (floor + cabTop) / 2, L - cabLen / 2]} s={[w, cabTop - floor, cabLen]} m={paint} cast />
      <Box p={[0, floor + (cabTop - floor) * 0.68, L + 0.005]} s={[w * 0.88, (cabTop - floor) * 0.4, 0.04]} m={M.glass()} />
      {[-1, 1].map(sx => <Box key={sx} p={[sx * (w / 2 + 0.005), floor + (cabTop - floor) * 0.68, L - cabLen * 0.45]} s={[0.02, (cabTop - floor) * 0.36, cabLen * 0.55]} m={M.glass()} />)}
      <Box p={[0, floor + 0.12, L + 0.02]} s={[w, 0.18, 0.06]} m={band} />
      {/* goods body: painted wooden truck body, or the mini truck's open bed */}
      {van ? <>
        <Box p={[0, floor + 0.05, -cabLen / 2 + 0.05]} s={[w, 0.12, l - cabLen - 0.1]} m={M.steel()} cast />
        {[-1, 1].map(sx => <Box key={sx} p={[sx * (w / 2 - 0.02), floor + 0.32, -cabLen / 2 + 0.05]} s={[0.04, 0.45, l - cabLen - 0.1]} m={paint} />)}
        <Box p={[0, floor + 0.32, -L + 0.03]} s={[w, 0.45, 0.04]} m={paint} />
      </> : <>
        <Box p={[0, (floor + gy + h) / 2, -cabLen / 2 + 0.05]} s={[w + 0.04, gy + h - floor, l - cabLen - 0.05]} m={M.wood()} cast />
        <Box p={[0, gy + h - 0.25, -cabLen / 2 + 0.05]} s={[w + 0.06, 0.32, l - cabLen]} m={mat("truckpaint", () => new THREE.MeshStandardMaterial({ color: 0xe0491b, roughness: 0.6 }))} />
        <Box p={[0, floor + 0.55, -L - 0.01]} s={[w * 0.92, 0.55, 0.03]} m={tailboardMat()} /><Box p={[0, cabTop - 0.16, L + 0.03]} s={[w * 0.82, 0.26, 0.03]} m={sloganMat()} />
      </>}
    </>}
    <Box p={[0, gy + R + 0.12, 0]} s={[w * 0.7, 0.16, l * 0.9]} m={M.trim()} />
    {[-1, 1].map(sx => <group key={sx}>
      <Box p={[sx * (w / 2 - 0.3), floor + 0.3, L + 0.02]} s={[0.32, 0.18, 0.05]} m={lm.head} />
      <Box p={[sx * (w / 2 - 0.12), floor + 0.12, L + 0.04]} s={[0.12, 0.08, 0.04]} m={sx > 0 ? lm.indL : lm.indR} />
      <Box p={[sx * (w / 2 - 0.25), floor + 0.25, -L - 0.03]} s={[0.26, 0.18, 0.05]} m={lm.tail} />
      <Box p={[sx * (w / 2 - 0.55), floor + 0.25, -L - 0.03]} s={[0.12, 0.12, 0.05]} m={lm.rev} />
    </group>)}
    <group ref={detail}>
      {[-1, 1].map(sx => <group key={sx}><Cyl p={[sx * (w / 2 + 0.18), floor + 1.2, L - 0.2]} rt={0.015} h={0.5} m={M.trim()} /><Box p={[sx * (w / 2 + 0.2), floor + 1.0, L - 0.2]} s={[0.05, 0.32, 0.18]} m={M.trim()} /></group>)}
      <Box p={[0, floor - 0.02, L + 0.06]} s={[0.5, 0.125, 0.012]} m={plateMat(plateText(kind, color), true)} /><Box p={[0, floor - 0.02, -L - 0.045]} s={[0.5, 0.125, 0.012]} m={plateMat(plateText(kind, color), true)} />
      <mesh position={[w * 0.28, floor + 0.85, L - 0.55]} rotation={[-0.9, 0, 0]} material={M.trim()}><torusGeometry args={[0.22, 0.025, 8, 20]} /></mesh>
    </group>
    {[fz, rz, ...(kind === "bus" ? [rz + 1.2] : [])].flatMap((z, ai) => [-1, 1].map((sx, k) => <Wheel key={`${ai}:${k}`} i={ai * 2 + k} x={sx * (w / 2 - 0.2)} y={gy + R} z={z} R={R} width={0.32} front={ai === 0} spokes={8} wheels={wheels} fronts={fronts} />))}
  </group>;
}

// ───────────────────────────── public mesh ─────────────────────────────
const _cam = new THREE.Vector3(), _me = new THREE.Vector3(), _wm = new THREE.Matrix4(), _ws = new THREE.Vector3();
export function VehicleModel({ kind, color, state, wheelSpin, stoppedRef, lightsRef, poseRef }: { kind: VehicleKind; color: number; state?: RefObject<VehicleVisualState>; wheelSpin?: boolean; stoppedRef?: RefObject<boolean>; lightsRef?: RefObject<boolean>; /** Receives the chassis pose each frame so riders can lean with the frame. */ poseRef?: RefObject<BodyPose> }) {
  const s = VEHICLE_SPECS[kind]; const lm = useLightMats(); const wheels = useRef<THREE.Group[]>([]); const fronts = useRef<THREE.Group[]>([]); const detail = useRef<THREE.Group | null>(null);
  const body = useRef<THREE.Group>(null); const spin = useRef(0); const susp = useRef({ pitch: 0, roll: 0, posed: false });
  useFrame(({ camera, clock }, dt) => {
    // Wheel rotation follows the simulated travel speed and its sign: forwards rolls the tread forwards, reverse rolls it
    // back, and a stationary vehicle's wheels do not turn. Wrapped so the angle keeps float precision on long drives.
    const st = state?.current; const sp = st?.speed ?? (wheelSpin && !stoppedRef?.current ? 8 : 0); spin.current = (spin.current + sp * dt / s.wheelR) % (Math.PI * 2);
    for (const g of wheels.current) if (g) g.rotation.x = spin.current;
    // Front wheels show the road-wheel angle the tyre model is using (lock fades with speed), not the raw key position.
    const steerYaw = -roadWheelAngle(s, st?.steer ?? 0, st?.speed ?? 0); for (const g of fronts.current) if (g) g.rotation.y = steerYaw;
    // Suspension: the chassis pitches under throttle/brake and rolls in corners (two-wheelers lean about the tyre contact
    // line); wheels stay planted on the road, so the wheel-arch gap is what moves. See suspension.ts.
    if (body.current) {
      const cls = s.cls as SuspensionClass; const tgt = attitudeTarget(cls, st?.accel ?? 0, st?.lat ?? 0);
      const k = 1 - Math.exp(-Math.min(dt, 0.1) * 6); susp.current.pitch += (tgt.pitch - susp.current.pitch) * k; susp.current.roll += (tgt.roll - susp.current.roll) * k;
      const anchors = anchorGroups.get(wheels.current) ?? []; let axle = 0, halfTrack = 0;
      for (const a of anchors) { if (!a.rest) initAnchor(a, body.current); const e = a.rest!.elements; axle = Math.max(axle, Math.abs(e[14])); halfTrack = Math.max(halfTrack, Math.abs(e[12])); }
      const lim = cls === "two" ? susp.current : limitToArch(susp.current.pitch, susp.current.roll, axle, halfTrack); // arches never close onto a tyre
      const pose = bodyPose(cls, lim.pitch, lim.roll, s.size[1] / 2);
      body.current.rotation.x = pose.pitch; body.current.rotation.z = pose.roll; body.current.position.set(pose.x, pose.y, 0);
      if (poseRef?.current) { poseRef.current.pitch = pose.pitch; poseRef.current.roll = pose.roll; poseRef.current.x = pose.x; poseRef.current.y = pose.y; }
      const active = Math.abs(pose.pitch) + Math.abs(pose.roll) + Math.abs(steerYaw) > 1e-5;
      if (active || susp.current.posed) { // parked and traffic vehicles sit level: skip the matrix work until something moves
        for (const a of anchors) wheelLocalMatrix(_wm, pose, cls === "two", a.rest!, a.staticInv!, a.front ? steerYaw : 0).decompose(a.g.position, a.g.quaternion, _ws);
        susp.current.posed = active;
      }
    }
    const lights = lightsRef?.current ?? st?.lights ?? false; const braking = !!st?.brake || !!stoppedRef?.current;
    lm.head.emissiveIntensity = lights ? 3.2 : 0.25; lm.tail.emissiveIntensity = braking ? 3 : lights ? 0.9 : 0.5; lm.rev.emissiveIntensity = (st?.speed ?? 0) < -0.2 ? 2 : 0;
    const ind = st?.indicator ?? 0; const blink = Math.floor(clock.elapsedTime * 2.6) % 2 === 0;
    lm.indL.emissiveIntensity = blink && (ind === -1 || ind === 2) ? 3 : 0; lm.indR.emissiveIntensity = blink && (ind === 1 || ind === 2) ? 3 : 0;
    if (body.current) { body.current.getWorldPosition(_me); camera.getWorldPosition(_cam); const d2 = _me.distanceToSquared(_cam);
      const far = vehicleCullDistance(graphicsNow().viewDistance); const shown = d2 < far * far; if (body.current.visible !== shown) body.current.visible = shown; if (!shown) return;
      if (detail.current) detail.current.visible = d2 < 45 * 45;
      const fine = d2 < 28 * 28; for (const g of fineGroups.get(wheels.current) ?? []) if (g.visible !== fine) g.visible = fine; } // spokes/hubs: 24 meshes per car
  });
  const props = { kind, color, lm, wheels, fronts, detail };
  const blob = contactShadow();
  return <group ref={body}><mesh geometry={blob.geo} material={blob.mat} position={[0, -s.size[1] / 2 + 0.02, 0]} scale={[s.size[0] * 1.55, 1, s.size[2] * 1.22]} renderOrder={2} />{s.cls === "car" ? <Car {...props} /> : s.cls === "two" ? <TwoWheeler {...props} /> : s.cls === "heavy" ? <Heavy {...props} /> : <ThreeWheeler {...props} />}</group>;
}

/** Test hook: bounds of the extruded car body + greenhouse, for every car class. */
export function carBodyBounds(kind: VehicleKind) { const b = new THREE.Box3(); for (const g of [carGeometry(kind), greenhouseGeometry(kind)]) { g.computeBoundingBox(); b.union(g.boundingBox!); } return b; }
export const CAR_KINDS = Object.keys(PROFILES) as VehicleKind[];
