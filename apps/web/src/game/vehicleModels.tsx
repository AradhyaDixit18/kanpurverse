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

export interface VehicleVisualState { speed: number; steer: number; brake: boolean; accel?: number; lat?: number; lights?: boolean; indicator?: -1 | 0 | 1 | 2 }

// ───────────────────────────── shared materials ─────────────────────────────
const matCache = new Map<string, THREE.Material>();
function mat<T extends THREE.Material>(key: string, make: () => T): T { let m = matCache.get(key) as T | undefined; if (!m) { m = make(); matCache.set(key, m); } return m; }
export function paintMat(color: number) { return mat(`paint:${color}`, () => new THREE.MeshPhysicalMaterial({ color, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 })); }
const M = {
  trim: () => mat("trim", () => new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.55, metalness: 0.2 })),
  plastic: () => mat("plastic", () => new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.85 })),
  chrome: () => mat("chrome", () => new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.12, metalness: 1 })),
  glass: () => mat("glass", () => new THREE.MeshPhysicalMaterial({ color: 0x1d2a33, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.62, depthWrite: false, envMapIntensity: 1.6 })),
  tyre: () => mat("tyre", () => new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.92 })),
  rim: () => mat("rim", () => new THREE.MeshStandardMaterial({ color: 0xb9bec6, roughness: 0.28, metalness: 0.9 })),
  seat: () => mat("seat", () => new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 0.8 })),
  canvas: () => mat("canvas", () => new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.95 })),
  plate: () => mat("plate", () => new THREE.MeshStandardMaterial({ color: 0xf2f2ec, roughness: 0.5 })),
  plateY: () => mat("plateY", () => new THREE.MeshStandardMaterial({ color: 0xf2c400, roughness: 0.5 })),
  wood: () => mat("wood", () => new THREE.MeshStandardMaterial({ color: 0x7a4a24, roughness: 0.85 })),
  steel: () => mat("steel", () => new THREE.MeshStandardMaterial({ color: 0x70757c, roughness: 0.45, metalness: 0.8 })),
};
/** Light materials are per vehicle instance because their emissive level is animated. */
function useLightMats() {
  const m = useMemo(() => ({
    head: new THREE.MeshStandardMaterial({ color: 0xf4f6ff, emissive: 0xfff3d6, emissiveIntensity: 0.3, roughness: 0.1, metalness: 0.3 }),
    tail: new THREE.MeshStandardMaterial({ color: 0x5a0710, emissive: 0xd0102a, emissiveIntensity: 0.25, roughness: 0.2 }),
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
function Wheel({ x, y, z, R, width, front, spokes = 5, wheels, fronts, i }: { x: number; y: number; z: number; R: number; width: number; front?: boolean; spokes?: number; wheels: RefObject<THREE.Group[]>; fronts: RefObject<THREE.Group[]>; i: number }) {
  const side = Math.sign(x) || 1;
  return <group position={[x, y, z]} ref={el => { if (el && front) fronts.current[i] = el; }}>
    <group ref={el => { if (el) wheels.current[i] = el; }}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={M.tyre()} castShadow><cylinderGeometry args={[R, R, width, 22]} /></mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[side * (width / 2 + 0.002), 0, 0]} material={M.rim()}><cylinderGeometry args={[R * 0.62, R * 0.62, 0.02, 18]} /></mesh>
      <group>{Array.from({ length: spokes }, (_, k) => <mesh key={k} position={[side * (width / 2 + 0.012), 0, 0]} rotation={[(k / spokes) * Math.PI * 2, 0, 0]} material={M.trim()}><boxGeometry args={[0.012, R * 1.1, 0.05]} /></mesh>)}</group>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[side * (width / 2 + 0.02), 0, 0]} material={M.chrome()}><cylinderGeometry args={[R * 0.14, R * 0.14, 0.02, 10]} /></mesh>
    </group>
  </group>;
}
function TwoWheel({ z, y, R, wheels, fronts, i, front, width = 0.1 }: { z: number; y: number; R: number; wheels: RefObject<THREE.Group[]>; fronts: RefObject<THREE.Group[]>; i: number; front?: boolean; width?: number }) {
  return <group position={[0, y, z]} ref={el => { if (el && front) fronts.current[i] = el; }}>
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
    <Box p={[0, gy + p.clearance + 0.13, L + 0.085]} s={[0.5, 0.12, 0.012]} m={isTaxi ? M.plateY() : M.plate()} />
    <Box p={[0, tailY - 0.22, -L - 0.035]} s={[0.5, 0.12, 0.012]} m={isTaxi ? M.plateY() : M.plate()} />
    {/* lamps: headlights, DRL, tail, reverse, indicators */}
    {[-1, 1].map(sx => <group key={sx}>
      <Box p={[sx * (w / 2 - 0.26), lampY, L + 0.005]} s={[0.36, 0.13, 0.08]} m={lm.head} />
      <Box p={[sx * (w / 2 - 0.12), lampY - 0.1, L + 0.03]} s={[0.12, 0.05, 0.04]} m={sx > 0 ? lm.indL : lm.indR} />
      <Box p={[sx * (w / 2 - 0.2), tailY, -L - 0.01]} s={[0.3, 0.14, 0.06]} m={lm.tail} />
      <Box p={[sx * (w / 2 - 0.42), tailY, -L - 0.012]} s={[0.1, 0.1, 0.05]} m={lm.rev} />
      <Box p={[sx * (w / 2 - 0.2), tailY + 0.1, -L - 0.012]} s={[0.24, 0.04, 0.05]} m={sx > 0 ? lm.indL : lm.indR} />
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
    </group>
    {scooter ? <>
      <Box p={[0, gy + R + 0.48, half - 0.3]} s={[0.46, 0.85, 0.14]} r={[0.25, 0, 0]} m={paint} cast />
      <Box p={[0, gy + R + 0.92, half - 0.18]} s={[0.3, 0.1, 0.22]} m={paint} />
      <Box p={[0, gy + R + 0.86, half - 0.08]} s={[0.22, 0.09, 0.04]} m={lm.head} />
      <Box p={[0, gy + 0.32, -0.05]} s={[0.36, 0.06, 0.62]} m={M.plastic()} />
      <Box p={[0, gy + R + 0.28, -half + 0.28]} s={[0.4, 0.42, 0.8]} m={paint} cast />
      <Box p={[0, gy + R + 0.53, -half + 0.32]} s={[0.32, 0.09, 0.74]} m={M.seat()} />
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
    <Box p={[0, gy + R + (scooter ? 0.6 : 0.62), -half - 0.05]} s={[0.14, 0.06, 0.04]} m={lm.tail} />
    <group ref={detail}>{[-1, 1].map(sx => <Box key={sx} p={[sx * 0.13, gy + R + 0.55, -half - 0.02]} s={[0.05, 0.03, 0.04]} m={sx > 0 ? lm.indL : lm.indR} />)}
      <Box p={[0, gy + R + 0.4, -half - 0.12]} s={[0.2, 0.1, 0.01]} m={M.plate()} /></group>
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
      {!pedal && <Box p={[0, gy + 0.32, -L - 0.005]} s={[0.36, 0.1, 0.01]} m={M.plateY()} />}</group>
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
      <Box p={[0, gy + h - 0.28, L + 0.03]} s={[w * 0.7, 0.3, 0.03]} m={mat("route", () => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff8a1c, emissiveIntensity: 0.9 }))} />
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
        <Box p={[0, floor + 0.5, -L - 0.01]} s={[w * 0.9, 0.5, 0.03]} m={mat("hornplease", () => new THREE.MeshStandardMaterial({ color: 0x1b6e3a, roughness: 0.6 }))} />
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
      <Box p={[0, floor - 0.02, L + 0.06]} s={[0.5, 0.12, 0.012]} m={M.plateY()} />
      <mesh position={[w * 0.28, floor + 0.85, L - 0.55]} rotation={[-0.9, 0, 0]} material={M.trim()}><torusGeometry args={[0.22, 0.025, 8, 20]} /></mesh>
    </group>
    {[fz, rz, ...(kind === "bus" ? [rz + 1.2] : [])].flatMap((z, ai) => [-1, 1].map((sx, k) => <Wheel key={`${ai}:${k}`} i={ai * 2 + k} x={sx * (w / 2 - 0.2)} y={gy + R} z={z} R={R} width={0.32} front={ai === 0} spokes={8} wheels={wheels} fronts={fronts} />))}
  </group>;
}

// ───────────────────────────── public mesh ─────────────────────────────
const _cam = new THREE.Vector3(), _me = new THREE.Vector3();
export function VehicleModel({ kind, color, state, wheelSpin, stoppedRef, lightsRef }: { kind: VehicleKind; color: number; state?: RefObject<VehicleVisualState>; wheelSpin?: boolean; stoppedRef?: RefObject<boolean>; lightsRef?: RefObject<boolean> }) {
  const s = VEHICLE_SPECS[kind]; const lm = useLightMats(); const wheels = useRef<THREE.Group[]>([]); const fronts = useRef<THREE.Group[]>([]); const detail = useRef<THREE.Group | null>(null);
  const body = useRef<THREE.Group>(null); const spin = useRef(0); const susp = useRef({ pitch: 0, roll: 0 });
  useFrame(({ camera, clock }, dt) => {
    const st = state?.current; const sp = st?.speed ?? (wheelSpin && !stoppedRef?.current ? 8 : 0); spin.current += sp * dt / s.wheelR;
    for (const g of wheels.current) if (g) g.rotation.x = spin.current;
    const steer = st?.steer ?? 0; for (const g of fronts.current) if (g) g.rotation.y = -steer * s.steerLock;
    // suspension: pitch under acceleration/braking, roll in corners; two-wheelers lean into the turn instead
    if (body.current) {
      const two = s.cls === "two" || s.cls === "pedal"; const a = THREE.MathUtils.clamp(st?.accel ?? 0, -12, 12), lat = THREE.MathUtils.clamp(st?.lat ?? 0, -12, 12);
      const tp = two ? -a * 0.003 : -a * 0.0045 * (s.cls === "heavy" ? 0.6 : 1), tr = two ? THREE.MathUtils.clamp(lat / 9.81, -0.55, 0.55) : -lat * (s.cls === "heavy" ? 0.004 : 0.006);
      const k = 1 - Math.exp(-dt * 6); susp.current.pitch += (tp - susp.current.pitch) * k; susp.current.roll += (tr - susp.current.roll) * k;
      body.current.rotation.x = susp.current.pitch; body.current.rotation.z = susp.current.roll;
    }
    const lights = lightsRef?.current ?? st?.lights ?? false; const braking = !!st?.brake || !!stoppedRef?.current;
    lm.head.emissiveIntensity = lights ? 3.2 : 0.25; lm.tail.emissiveIntensity = braking ? 3 : lights ? 0.9 : 0.25; lm.rev.emissiveIntensity = (st?.speed ?? 0) < -0.2 ? 2 : 0;
    const ind = st?.indicator ?? 0; const blink = Math.floor(clock.elapsedTime * 2.6) % 2 === 0;
    lm.indL.emissiveIntensity = blink && (ind === -1 || ind === 2) ? 3 : 0; lm.indR.emissiveIntensity = blink && (ind === 1 || ind === 2) ? 3 : 0;
    if (detail.current && body.current) { body.current.getWorldPosition(_me); camera.getWorldPosition(_cam); detail.current.visible = _me.distanceToSquared(_cam) < 45 * 45; }
  });
  const props = { kind, color, lm, wheels, fronts, detail };
  return <group ref={body}>{s.cls === "car" ? <Car {...props} /> : s.cls === "two" ? <TwoWheeler {...props} /> : s.cls === "heavy" ? <Heavy {...props} /> : <ThreeWheeler {...props} />}</group>;
}

/** Test hook: bounds of the extruded car body + greenhouse, for every car class. */
export function carBodyBounds(kind: VehicleKind) { const b = new THREE.Box3(); for (const g of [carGeometry(kind), greenhouseGeometry(kind)]) { g.computeBoundingBox(); b.union(g.boundingBox!); } return b; }
export const CAR_KINDS = Object.keys(PROFILES) as VehicleKind[];
