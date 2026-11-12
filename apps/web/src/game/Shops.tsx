"use client";
/**
 * Enterable businesses: weapon store, clothing house, garage, hospital, vehicle showroom. Each is a real walk-in room:
 * solid walls with a door gap (Rapier colliders), sliding doors that open as the player approaches, an interior fitted
 * to the trade, a lit sign in Devanagari, and a rigged shopkeeper behind the counter who turns to face the player.
 * Interaction (E at the counter) opens the shop interface; see ui/ShopPanel.tsx.
 */
import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { Text as DreiText } from "@react-three/drei";
import * as THREE from "three";
import { SHOPS, SHOP_SIZE, DEFAULT_APPEARANCE, type ShopSite, type Appearance } from "@kanpurverse/shared";
import { Avatar } from "./Avatar";
import { playerPos } from "./refs";
import { useStore } from "../state/store";
import { VehicleMesh } from "./Vehicles";
import { nightFactor } from "./NightLights";

const FONT = "/fonts/NotoSansDevanagari-400.woff";
const Text = (props: React.ComponentProps<typeof DreiText>) => <DreiText font={FONT} {...props} />;
const { w: W, d: D, h: H, door: DOOR } = SHOP_SIZE;
const T = 0.25; // wall thickness

const mats = new Map<string, THREE.Material>();
const m = (key: string, make: () => THREE.Material) => { let x = mats.get(key); if (!x) { x = make(); mats.set(key, x); } return x; };
const plaster = (c: number) => m(`pl:${c}`, () => new THREE.MeshStandardMaterial({ color: c, roughness: 0.88 }));
const MAT = {
  floor: () => m("floor", () => new THREE.MeshStandardMaterial({ color: 0xcfc6b4, roughness: 0.55, metalness: 0.05 })),
  wood: () => m("wood", () => new THREE.MeshStandardMaterial({ color: 0x6b4426, roughness: 0.7 })),
  dark: () => m("dark", () => new THREE.MeshStandardMaterial({ color: 0x23252a, roughness: 0.6, metalness: 0.3 })),
  steel: () => m("steel", () => new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.35, metalness: 0.85 })),
  glass: () => m("glass", () => new THREE.MeshPhysicalMaterial({ color: 0xa8c4cc, roughness: 0.05, transparent: true, opacity: 0.28, depthWrite: false })),
  white: () => m("white", () => new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.8 })),
  tile: () => m("tile", () => new THREE.MeshStandardMaterial({ color: 0xe9e6de, roughness: 0.3, metalness: 0.05 })),
  red: () => m("red", () => new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.5, emissive: 0x400008, emissiveIntensity: 0.4 })),
};
const Box = ({ p, s, mat, r, cast = true }: { p: [number, number, number]; s: [number, number, number]; mat: THREE.Material; r?: [number, number, number]; cast?: boolean }) => <mesh position={p} rotation={r} material={mat} castShadow={cast} receiveShadow><boxGeometry args={s} /></mesh>;

export function Shops() { return <>{SHOPS.map(s => <Shop key={s.id} site={s} />)}</>; }

function keeperLook(site: ShopSite): Appearance { const r = (k: number) => Math.floor(((site.keeper.seed * 9301 + k * 49297) % 233280) / 233280 * 6); return { ...DEFAULT_APPEARANCE, body: site.keeper.body, skin: 1 + (r(1) % 4), hair: r(2) % 6, hairColor: r(3) % 3, top: r(4) % 5, bottom: r(5) % 6, shoes: r(6) % 4, accessory: 0 }; }

function Shop({ site }: { site: ShopSite }) {
  const wallMat = useMemo(() => plaster(site.type === "hospital" ? 0xf1efe8 : site.type === "garage" ? 0xb9b1a3 : 0xe7d6b8), [site.type]);
  const accent = useMemo(() => m(`acc:${site.color}`, () => new THREE.MeshStandardMaterial({ color: site.color, roughness: 0.6 })), [site.color]);
  const signGlow = useMemo(() => new THREE.MeshStandardMaterial({ color: site.color, emissive: site.color, emissiveIntensity: 0.4, roughness: 0.5 }), [site.color]);
  const doorL = useRef<THREE.Group>(null), doorR = useRef<THREE.Group>(null), keeper = useRef<THREE.Group>(null), lamp = useRef<THREE.PointLight>(null);
  const open = useRef(0); const garage = site.type === "garage"; const half = (W - DOOR) / 2;
  useFrame((_, dt) => {
    const c = Math.cos(site.yaw), n = Math.sin(site.yaw); const dx = playerPos.x - site.p[0], dz = playerPos.z - site.p[1];
    const lx = dx * c - dz * n, lz = dx * n + dz * c; // player in shop space
    const near = Math.abs(lx) < W / 2 + 2 && lz > -D / 2 && lz < D / 2 + 4.5;
    open.current += ((near ? 1 : 0) - open.current) * (1 - Math.exp(-dt * 6));
    if (doorL.current) doorL.current.position.x = -DOOR / 4 - open.current * DOOR / 2; if (doorR.current) doorR.current.position.x = DOOR / 4 + open.current * DOOR / 2;
    if (keeper.current) { const want = Math.abs(lx) < W / 2 && lz > -D / 2 && lz < D / 2 + 3 ? Math.atan2(lx - 0, lz + 2.4) : 0; keeper.current.rotation.y += (want - keeper.current.rotation.y) * (1 - Math.exp(-dt * 4)); }
    if (lamp.current) lamp.current.intensity = 6 + nightFactor() * 10; signGlow.emissiveIntensity = 0.3 + nightFactor() * 1.8;
  });
  const talking = useStore(s => s.shop === site.id);
  return <group position={[site.p[0], 0, site.p[1]]} rotation={[0, site.yaw, 0]} name={`shop:${site.id}`}>
    {/* colliders: back, sides, front wall pieces either side of the door, counter */}
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[W / 2, H / 2, T / 2]} position={[0, H / 2, -D / 2]} />
      <CuboidCollider args={[T / 2, H / 2, D / 2]} position={[-W / 2, H / 2, 0]} />
      <CuboidCollider args={[T / 2, H / 2, D / 2]} position={[W / 2, H / 2, 0]} />
      {!garage && <><CuboidCollider args={[half / 2, H / 2, T / 2]} position={[-(DOOR / 2 + half / 2), H / 2, D / 2]} /><CuboidCollider args={[half / 2, H / 2, T / 2]} position={[DOOR / 2 + half / 2, H / 2, D / 2]} /></>}
      <CuboidCollider args={[2.2, 0.55, 0.35]} position={[0, 0.55, -1.9]} />
    </RigidBody>
    {/* shell */}
    <Box p={[0, 0.06, 0]} s={[W, 0.12, D]} mat={site.type === "hospital" ? MAT.tile() : MAT.floor()} cast={false} />
    <Box p={[0, H / 2, -D / 2]} s={[W, H, T]} mat={wallMat} />
    <Box p={[-W / 2, H / 2, 0]} s={[T, H, D]} mat={wallMat} /><Box p={[W / 2, H / 2, 0]} s={[T, H, D]} mat={wallMat} />
    <Box p={[0, H + 0.1, 0]} s={[W + 0.6, 0.2, D + 0.6]} mat={MAT.dark()} />
    {garage ? <Box p={[0, H - 0.35, D / 2]} s={[W, 0.7, T]} mat={accent} /> : <>
      <Box p={[-(DOOR / 2 + half / 2), H / 2, D / 2]} s={[half, H, T]} mat={site.type === "dealership" ? MAT.glass() : wallMat} />
      <Box p={[DOOR / 2 + half / 2, H / 2, D / 2]} s={[half, H, T]} mat={site.type === "dealership" ? MAT.glass() : wallMat} />
      <Box p={[0, H - 0.5, D / 2]} s={[DOOR, 1.0, T]} mat={wallMat} />
      {site.type !== "dealership" && [-1, 1].map(sx => <Box key={sx} p={[sx * (DOOR / 2 + half / 2), 1.7, D / 2 + 0.02]} s={[half * 0.6, 1.4, 0.04]} mat={MAT.glass()} cast={false} />)}
      {/* sliding doors */}
      <group position={[0, 0, D / 2 + 0.05]}>
        <group ref={doorL}><Box p={[0, 1.25, 0]} s={[DOOR / 2, 2.5, 0.05]} mat={MAT.glass()} cast={false} /><Box p={[0, 1.25, 0.03]} s={[0.05, 2.5, 0.02]} mat={MAT.steel()} /></group>
        <group ref={doorR}><Box p={[0, 1.25, 0]} s={[DOOR / 2, 2.5, 0.05]} mat={MAT.glass()} cast={false} /><Box p={[0, 1.25, 0.03]} s={[0.05, 2.5, 0.02]} mat={MAT.steel()} /></group>
      </group>
    </>}
    {/* awning + sign */}
    <Box p={[0, H - 0.9, D / 2 + 0.9]} s={[W + 0.4, 0.08, 1.8]} r={[0.12, 0, 0]} mat={accent} />
    <Box p={[0, H + 0.6, D / 2 + 0.1]} s={[W * 0.86, 1.0, 0.12]} mat={signGlow} />
    <Text position={[0, H + 0.72, D / 2 + 0.18]} fontSize={0.52} color="#fff6e0" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#1a1208">{site.sign}</Text>
    <Text position={[0, H + 0.28, D / 2 + 0.18]} fontSize={0.2} color="#f1e3c2" anchorX="center" anchorY="middle">{site.name}</Text>
    {/* counter + keeper */}
    <Box p={[0, 0.55, -1.9]} s={[4.4, 1.1, 0.7]} mat={site.type === "weapons" ? MAT.glass() : MAT.wood()} />
    <Box p={[0, 1.12, -1.9]} s={[4.5, 0.06, 0.8]} mat={MAT.dark()} />
    <group ref={keeper} position={[0, 0.12, -2.7]}><Avatar appearance={keeperLook(site)} anim={talking ? "talk" : "idle"} name={site.keeper.nameHi} nameColor="#ffd23f" /></group>
    {/* interior light */}
    <pointLight ref={lamp} position={[0, H - 0.6, 0]} intensity={8} distance={14} decay={1.6} color="#fff0d8" />
    <Box p={[0, H - 0.04, 0]} s={[W * 0.6, 0.04, 0.6]} mat={m("panel", () => new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3dc, emissiveIntensity: 1.4 }))} cast={false} />
    <Interior site={site} accent={accent} />
  </group>;
}

function Shelf({ x, z, ry = 0, children }: { x: number; z: number; ry?: number; children?: ReactNode }) {
  return <group position={[x, 0, z]} rotation={[0, ry, 0]}>{[0.4, 1.1, 1.8].map(y => <Box key={y} p={[0, y, 0]} s={[2.2, 0.06, 0.5]} mat={MAT.wood()} />)}{[-1.08, 1.08].map(sx => <Box key={sx} p={[sx, 1.1, 0]} s={[0.06, 2.2, 0.5]} mat={MAT.wood()} />)}{children}</group>;
}

function Interior({ site, accent }: { site: ShopSite; accent: THREE.Material }) {
  switch (site.type) {
    case "weapons": return <>
      {/* wall racks: lathis and bats on pegs, safety gear in boxes */}
      <group position={[0, 0, -D / 2 + 0.3]}>{Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[-3.2 + i * 0.8, 2.1, 0]} rotation={[0, 0, 0.12]} material={i % 3 === 1 ? MAT.wood() : m("bamboo", () => new THREE.MeshStandardMaterial({ color: 0xc9a861, roughness: 0.6 }))} castShadow><cylinderGeometry args={[0.03, 0.035, 1.5, 8]} /></mesh>)}</group>
      <Shelf x={-W / 2 + 0.5} z={0.5} ry={Math.PI / 2}>{[0.55, 1.25, 1.95].flatMap(y => [-0.7, 0, 0.7].map(x => <Box key={`${x}:${y}`} p={[x, y, 0]} s={[0.45, 0.22, 0.3]} mat={accent} />))}</Shelf>
      <Shelf x={W / 2 - 0.5} z={0.5} ry={-Math.PI / 2}>{[0.55, 1.25, 1.95].flatMap(y => [-0.6, 0.2].map(x => <Box key={`${x}:${y}`} p={[x, y, 0]} s={[0.6, 0.25, 0.35]} mat={MAT.dark()} />))}</Shelf>
      {[-1.4, 0, 1.4].map(x => <Box key={x} p={[x, 0.9, -1.9]} s={[0.6, 0.12, 0.3]} mat={MAT.steel()} />)}
      <Box p={[0, 2.6, -D / 2 + 0.16]} s={[3.2, 0.5, 0.04]} mat={MAT.red()} />
    </>;
    case "clothing": return <>
      {[-2.6, 2.6].map(x => <group key={x} position={[x, 0, 0.6]}><Box p={[0, 1.55, 0]} s={[0.04, 0.04, 2.6]} mat={MAT.steel()} />{[-1, 1].map(z => <Box key={z} p={[0, 0.78, z * 1.25]} s={[0.04, 1.56, 0.04]} mat={MAT.steel()} />)}
        {Array.from({ length: 8 }, (_, i) => <Box key={i} p={[0, 1.05, -1.1 + i * 0.32]} s={[0.5, 0.9, 0.06]} mat={plaster([0x1f6f78, 0x7a1f2b, 0xd29a1e, 0xf1efe9, 0x3e5f8a, 0x2b4f7e, 0xcdb48a, 0x56603a][(i + (x > 0 ? 3 : 0)) % 8])} />)}</group>)}
      <Box p={[-W / 2 + 0.15, 1.3, -1.5]} s={[0.04, 2.2, 1.0]} mat={m("mirror", () => new THREE.MeshStandardMaterial({ color: 0xdfe8ee, roughness: 0.02, metalness: 1 }))} />
      <Shelf x={0} z={-D / 2 + 0.4}>{[0.55, 1.25, 1.95].flatMap(y => [-0.7, 0, 0.7].map(x => <Box key={`${x}:${y}`} p={[x, y, 0]} s={[0.5, 0.18, 0.35]} mat={plaster([0xc9a13b, 0x5a3a22, 0xf2f0ea][Math.round(x + 1) % 3])} />))}</Shelf>
    </>;
    case "garage": return <>
      <Box p={[1.8, 0.15, 1.2]} s={[2.4, 0.3, 4.0]} mat={MAT.steel()} />
      {[0, 1, 2, 3].map(i => <mesh key={i} position={[-W / 2 + 0.7, 0.18 + i * 0.3, -1.2]} rotation={[Math.PI / 2, 0, 0]} material={m("tyre", () => new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 }))} castShadow><torusGeometry args={[0.32, 0.11, 8, 18]} /></mesh>)}
      {[0, 1].map(i => <mesh key={i} position={[W / 2 - 0.7, 0.45, -1.4 + i * 0.75]} material={i ? MAT.red() : accent} castShadow><cylinderGeometry args={[0.3, 0.3, 0.9, 14]} /></mesh>)}
      <Box p={[0, 1.6, -D / 2 + 0.15]} s={[5, 1.4, 0.06]} mat={m("pegboard", () => new THREE.MeshStandardMaterial({ color: 0x8a6c45, roughness: 0.9 }))} />
      {Array.from({ length: 10 }, (_, i) => <Box key={i} p={[-2.2 + i * 0.48, 1.6 + (i % 2) * 0.3, -D / 2 + 0.22]} s={[0.06, 0.4, 0.04]} mat={MAT.steel()} />)}
    </>;
    case "hospital": return <>
      {[-2.5, 2.5].map(x => <group key={x} position={[x, 0, 1.4]}><Box p={[0, 0.45, 0]} s={[2.2, 0.08, 0.5]} mat={m("bench", () => new THREE.MeshStandardMaterial({ color: 0x3b6e8f, roughness: 0.6 }))} />{[-0.9, 0.9].map(z => <Box key={z} p={[z, 0.22, 0]} s={[0.06, 0.44, 0.45]} mat={MAT.steel()} />)}</group>)}
      <group position={[0, 2.7, -D / 2 + 0.16]}><Box p={[0, 0, 0]} s={[1.0, 0.3, 0.04]} mat={MAT.red()} /><Box p={[0, 0, 0]} s={[0.3, 1.0, 0.04]} mat={MAT.red()} /></group>
      <Box p={[W / 2 - 0.6, 0.6, -2.4]} s={[0.9, 1.2, 0.6]} mat={MAT.white()} />
      <Box p={[-W / 2 + 0.8, 0.5, -2.6]} s={[1.0, 0.6, 1.9]} mat={MAT.white()} />
    </>;
    case "dealership": return <ShowroomCar />;
    default: return null;
  }
}
function ShowroomCar() {
  const g = useRef<THREE.Group>(null); useFrame((_, dt) => { if (g.current) g.current.rotation.y += dt * 0.25; });
  return <group position={[0, 0.12, 1.2]}><mesh position={[0, 0.05, 0]} receiveShadow material={MAT.steel()}><cylinderGeometry args={[2.6, 2.6, 0.1, 40]} /></mesh>
    <group ref={g} position={[0, 0.84, 0]}><VehicleMesh kind="compactsuv" color={0xb3122e} /></group></group>;
}
