"use client";
/** Procedural Kanpur-inspired district: roads, instanced buildings with signs, landmarks, lake, ghat, trees, street lights. Static colliders via Rapier. */
import { useMemo } from "react";
import * as THREE from "three";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { Text as DreiText } from "@react-three/drei";
const FONT = "/fonts/NotoSansDevanagari-400.woff";
const Text = (props: React.ComponentProps<typeof DreiText>) => <DreiText font={FONT} {...props} />;
import { ROADS, LANDMARKS, generateBuildings, WORLD_SIZE, type Building } from "@kanpurverse/shared";
import { useStore } from "../state/store";

const STYLE_COLORS = [0xd9c9b0, 0xe8d8c3, 0xc9b8a3, 0xbfb3a6, 0xe3c9a6];
const SIGN_COLORS = ["#c8102e", "#1a3c8c", "#2e8b57", "#f2b134", "#7b2cbf"];

export function City() {
  const quality = useStore(s => s.settings.quality);
  const buildings = useMemo(() => generateBuildings(7), []);
  return (
    <group>
      <Ground />
      {ROADS.map((r, i) => <Road key={i} a={r.a} b={r.b} w={r.w} name={r.name} />)}
      <Buildings list={buildings} />
      {quality !== "low" && <Signs list={buildings} />}
      <Landmarks />
      <Trees count={quality === "low" ? 60 : quality === "medium" ? 140 : 240} />
      <StreetLights />
      <WorldBounds />
    </group>
  );
}

function Ground() {
  return (
    <RigidBody type="fixed" colliders={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}><planeGeometry args={[WORLD_SIZE + 400, WORLD_SIZE + 400]} /><meshStandardMaterial color="#8a8f6a" roughness={1} /></mesh>
      <CuboidCollider args={[WORLD_SIZE, 0.5, WORLD_SIZE]} position={[0, -0.5, 0]} />
    </RigidBody>
  );
}

function Road({ a, b, w, name }: { a: [number, number]; b: [number, number]; w: number; name?: string }) {
  const horizontal = a[1] === b[1]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
  const dashes = useMemo(() => { const n = Math.floor(len / 8); return Array.from({ length: n }, (_, i) => -len / 2 + 4 + i * 8); }, [len]);
  return (
    <group position={[cx, 0.02, cz]} rotation={[0, horizontal ? 0 : Math.PI / 2, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[len, w]} /><meshStandardMaterial color="#3a3a3e" roughness={0.95} /></mesh>
      {/* pavements */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, w / 2 + 1.5]}><planeGeometry args={[len, 3]} /><meshStandardMaterial color="#9a9488" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, -w / 2 - 1.5]}><planeGeometry args={[len, 3]} /><meshStandardMaterial color="#9a9488" /></mesh>
      {dashes.map((x, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, 0]}><planeGeometry args={[4, 0.25]} /><meshBasicMaterial color="#e8e8d8" /></mesh>)}
      {name && <Text position={[-len / 2 + 20, 3.2, w / 2 + 2.2]} rotation={[0, Math.PI, 0]} fontSize={1.1} color="#ffffff" outlineWidth={0.05} outlineColor="#0b0b0d" anchorX="center">{name}</Text>}
      {name && <mesh position={[-len / 2 + 20, 1.6, w / 2 + 2.2]}><cylinderGeometry args={[0.06, 0.06, 3.2]} /><meshStandardMaterial color="#444" /></mesh>}
    </group>
  );
}

function Buildings({ list }: { list: Building[] }) {
  const groups = useMemo(() => { const g: Record<number, Building[]> = {}; for (const b of list) (g[b.style] ??= []).push(b); return g; }, [list]);
  const windowTex = useMemo(() => { const c = document.createElement("canvas"); c.width = 64; c.height = 64; const x = c.getContext("2d")!; x.fillStyle = "#0000"; x.clearRect(0, 0, 64, 64); x.fillStyle = "rgba(40,50,70,0.85)"; x.fillRect(12, 12, 16, 20); x.fillRect(36, 12, 16, 20); x.fillRect(12, 40, 16, 20); x.fillRect(36, 40, 16, 20); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }, []);
  return (
    <group>
      {Object.entries(groups).map(([style, bs]) => <InstancedBuildings key={style} color={STYLE_COLORS[Number(style)]} list={bs} tex={windowTex} />)}
      <RigidBody type="fixed" colliders={false}>
        {list.map((b, i) => <CuboidCollider key={i} args={[b.w / 2, b.h / 2, b.d / 2]} position={[b.p[0], b.h / 2, b.p[1]]} />)}
      </RigidBody>
    </group>
  );
}
function InstancedBuildings({ color, list, tex }: { color: number; list: Building[]; tex: THREE.Texture }) {
  const ref = useMemo(() => { const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color, roughness: 0.9, map: tex }), list.length); const o = new THREE.Object3D(); list.forEach((b, i) => { o.position.set(b.p[0], b.h / 2, b.p[1]); o.scale.set(b.w, b.h, b.d); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.instanceMatrix.needsUpdate = true; m.castShadow = true; m.receiveShadow = true; return m; }, [color, list, tex]);
  return <primitive object={ref} />;
}
function Signs({ list }: { list: Building[] }) {
  const lang = useStore(s => s.settings.lang);
  return <group>{list.filter(b => b.sign).map((b, i) => {
    const onNorth = b.p[1] > 0; const z = b.p[1] + (onNorth ? -b.d / 2 - 0.05 : b.d / 2 + 0.05);
    return <group key={i} position={[b.p[0], Math.min(b.h - 1, 4.2), z]} rotation={[0, onNorth ? Math.PI : 0, 0]}>
      <mesh><boxGeometry args={[Math.min(b.w - 1, 9), 1.2, 0.08]} /><meshStandardMaterial color={SIGN_COLORS[i % SIGN_COLORS.length]} /></mesh>
      <Text position={[0, 0, 0.06]} fontSize={0.55} color="#fff" anchorX="center" anchorY="middle" maxWidth={Math.min(b.w - 1.5, 8.5)}>{lang === "english" ? b.sign : b.signHi}</Text>
    </group>; })}</group>;
}

function Landmarks() {
  const lang = useStore(s => s.settings.lang);
  return <group>{LANDMARKS.map(l => {
    const label = <group position={[l.p[0], 9, l.p[1]]}><Text fontSize={2.2} color="#ffd23f" outlineWidth={0.1} outlineColor="#0b0b0d" anchorX="center">{lang === "english" ? l.name : l.nameHi}</Text></group>;
    switch (l.kind) {
      case "lake": return <group key={l.id}><mesh position={[l.p[0], 0.05, l.p[1]]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[l.r, 48]} /><meshStandardMaterial color="#2f6f8f" roughness={0.2} metalness={0.3} /></mesh>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[l.r * 0.72, 1, l.r * 0.72]} position={[l.p[0], -0.4, l.p[1]]} /></RigidBody>{label}</group>;
      case "park": return <mesh key={l.id} position={[l.p[0], 0.03, l.p[1]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[l.r, 40]} /><meshStandardMaterial color="#5f8f4a" /></mesh>;
      case "mall": return <group key={l.id}><RigidBody type="fixed"><mesh position={[l.p[0], 14, l.p[1]]} castShadow><boxGeometry args={[l.r * 1.6, 28, l.r * 1.2]} /><meshStandardMaterial color="#d7dde6" metalness={0.4} roughness={0.3} /></mesh></RigidBody>
        <mesh position={[l.p[0], 20, l.p[1] + l.r * 0.6 + 0.1]}><boxGeometry args={[l.r * 1.2, 4, 0.2]} /><meshStandardMaterial color="#c8102e" emissive="#c8102e" emissiveIntensity={0.4} /></mesh>
        <Text position={[l.p[0], 20, l.p[1] + l.r * 0.6 + 0.3]} fontSize={2.4} color="#fff" anchorX="center" anchorY="middle">{lang === "english" ? l.name : l.nameHi}</Text>{label}</group>;
      case "market": return <group key={l.id}>{Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; const x = l.p[0] + Math.cos(a) * l.r * 0.6, z = l.p[1] + Math.sin(a) * l.r * 0.6; return <RigidBody key={i} type="fixed"><group position={[x, 0, z]} rotation={[0, -a, 0]}><mesh position={[0, 1.1, 0]} castShadow><boxGeometry args={[3, 2.2, 2]} /><meshStandardMaterial color={["#c8102e", "#f2b134", "#2e8b57", "#3d8bff"][i % 4]} /></mesh><mesh position={[0, 2.5, 0]}><boxGeometry args={[3.6, 0.1, 2.6]} /><meshStandardMaterial color="#f5efe0" /></mesh></group></RigidBody>; })}{label}</group>;
      case "temple": return <group key={l.id}><RigidBody type="fixed"><mesh position={[l.p[0], 6, l.p[1]]} castShadow><boxGeometry args={[22, 12, 22]} /><meshStandardMaterial color="#f4f1ea" /></mesh></RigidBody>
        <mesh position={[l.p[0], 19, l.p[1]]} castShadow><coneGeometry args={[7, 14, 8]} /><meshStandardMaterial color="#f4f1ea" /></mesh>
        {[-8, 8].map(x => <mesh key={x} position={[l.p[0] + x, 15, l.p[1] - 8]}><coneGeometry args={[3.5, 8, 8]} /><meshStandardMaterial color="#f4f1ea" /></mesh>)}
        <mesh position={[l.p[0], 27, l.p[1]]}><sphereGeometry args={[1]} /><meshStandardMaterial color="#ffd23f" metalness={0.8} roughness={0.2} /></mesh>{label}</group>;
      case "station": return <group key={l.id}><RigidBody type="fixed"><mesh position={[l.p[0], 7, l.p[1] + 10]} castShadow><boxGeometry args={[110, 14, 16]} /><meshStandardMaterial color="#b43a2a" /></mesh></RigidBody>
        {[-40, 0, 40].map(x => <mesh key={x} position={[l.p[0] + x, 18, l.p[1] + 10]}><boxGeometry args={[10, 8, 10]} /><meshStandardMaterial color="#b43a2a" /></mesh>)}
        <mesh position={[l.p[0], 9, l.p[1] + 1.8]}><boxGeometry args={[40, 4, 0.3]} /><meshStandardMaterial color="#ffd23f" /></mesh>
        <Text position={[l.p[0], 9, l.p[1] + 1.6]} rotation={[0, Math.PI, 0]} fontSize={2.6} color="#0b0b0d" anchorX="center" anchorY="middle">{lang === "english" ? "KANPUR CENTRAL" : "कानपुर सेंट्रल"}</Text>
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[120, 10, 5]} position={[l.p[0], 5, l.p[1] + 28]} /></RigidBody>
        {/* decorative train */}
        <group position={[l.p[0] - 30, 1.5, l.p[1] + 24]}>{Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[i * 14, 0, 0]}><boxGeometry args={[13, 3.2, 3]} /><meshStandardMaterial color={i === 0 ? "#c8102e" : "#1a3c8c"} /></mesh>)}</group></group>;
      case "ghat": return <group key={l.id}><mesh position={[0, 0.02, -300]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[800, 120]} /><meshStandardMaterial color="#3b7a9a" roughness={0.15} metalness={0.3} /></mesh>
        {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[0, 0.12 + i * 0.35, -241 - i * 1.2]} receiveShadow><boxGeometry args={[520, 0.35, 1.2]} /><meshStandardMaterial color="#c9b79c" /></mesh>)}
        <RigidBody type="fixed" colliders={false}><CuboidCollider args={[400, 2, 1]} position={[0, 1, -248]} /></RigidBody>
        {[-120, -40, 40, 120].map(x => <mesh key={x} position={[x, 3, -244]}><cylinderGeometry args={[0.3, 0.3, 6]} /><meshStandardMaterial color="#8b5a2b" /></mesh>)}{label}</group>;
      case "cafe": return <group key={l.id}><mesh position={[l.p[0], 2.6, l.p[1]]}><cylinderGeometry args={[4, 4, 0.1, 8]} /><meshStandardMaterial color="#c8102e" /></mesh><mesh position={[l.p[0], 1.3, l.p[1]]}><cylinderGeometry args={[0.1, 0.1, 2.6]} /><meshStandardMaterial color="#444" /></mesh>
        {[[-2, 0], [2, 0], [0, 2], [0, -2]].map(([dx, dz], i) => <group key={i} position={[l.p[0] + dx, 0, l.p[1] + dz]}><mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.5, 0.5, 0.06]} /><meshStandardMaterial color="#f5efe0" /></mesh><mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.05, 0.05, 0.5]} /><meshStandardMaterial color="#333" /></mesh></group>)}
        <Text position={[l.p[0], 4, l.p[1]]} fontSize={1} color="#fff" outlineWidth={0.05} outlineColor="#0b0b0d" anchorX="center">{lang === "english" ? l.name : l.nameHi}</Text></group>;
      case "viewpoint": return <group key={l.id}><mesh position={[l.p[0], 0.3, l.p[1]]}><cylinderGeometry args={[4, 4.5, 0.6, 12]} /><meshStandardMaterial color="#c9b79c" /></mesh><Text position={[l.p[0], 3, l.p[1]]} fontSize={0.9} color="#ffd23f" outlineWidth={0.05} outlineColor="#0b0b0d" anchorX="center">{lang === "english" ? l.name : l.nameHi}</Text></group>;
      case "garage": return <group key={l.id}><RigidBody type="fixed"><mesh position={[l.p[0], 3, l.p[1] - 14]} castShadow><boxGeometry args={[30, 6, 8]} /><meshStandardMaterial color="#4a4e57" /></mesh></RigidBody><Text position={[l.p[0], 7.5, l.p[1] - 9.9]} fontSize={1.6} color="#ffd23f" anchorX="center">{lang === "english" ? l.name : l.nameHi}</Text></group>;
      case "college": return <group key={l.id}><RigidBody type="fixed"><mesh position={[l.p[0], 5, l.p[1]]} castShadow><boxGeometry args={[4, 10, 1.5]} /><meshStandardMaterial color="#b43a2a" /></mesh></RigidBody><RigidBody type="fixed"><mesh position={[l.p[0] + 14, 5, l.p[1]]} castShadow><boxGeometry args={[4, 10, 1.5]} /><meshStandardMaterial color="#b43a2a" /></mesh></RigidBody><mesh position={[l.p[0] + 7, 10.5, l.p[1]]}><boxGeometry args={[18, 1.4, 1.6]} /><meshStandardMaterial color="#b43a2a" /></mesh>{label}</group>;
      default: return null;
    }
  })}</group>;
}

function Trees({ count }: { count: number }) {
  const trunk = useMemo(() => new THREE.CylinderGeometry(0.25, 0.35, 3, 6), []); const crown = useMemo(() => new THREE.IcosahedronGeometry(2.2, 0), []);
  const items = useMemo(() => { let s = 99; const r = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; const out: [number, number, number][] = []; const bs = generateBuildings(7);
    while (out.length < count) { const x = (r() - 0.5) * WORLD_SIZE, z = (r() - 0.5) * WORLD_SIZE; if (ROADS.some(rd => rd.a[0] === rd.b[0] ? Math.abs(x - rd.a[0]) < rd.w / 2 + 3 : Math.abs(z - rd.a[1]) < rd.w / 2 + 3)) continue; if (bs.some(b => Math.abs(b.p[0] - x) < b.w / 2 + 2 && Math.abs(b.p[1] - z) < b.d / 2 + 2)) continue; if (LANDMARKS.some(l => (l.kind === "lake" || l.kind === "mall" || l.kind === "station" || l.kind === "temple" || l.kind === "market" || l.kind === "cafe") && Math.hypot(l.p[0] - x, l.p[1] - z) < l.r + 4)) continue; if (z < -235) continue; out.push([x, 0, z]); } return out; }, [count]);
  const trunkMesh = useMemo(() => { const m = new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ color: 0x6b4a2b }), items.length); const o = new THREE.Object3D(); items.forEach((p, i) => { o.position.set(p[0], 1.5, p[2]); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.castShadow = true; return m; }, [items, trunk]);
  const crownMesh = useMemo(() => { const m = new THREE.InstancedMesh(crown, new THREE.MeshStandardMaterial({ color: 0x3f7a3a, flatShading: true }), items.length); const o = new THREE.Object3D(); items.forEach((p, i) => { o.position.set(p[0], 4, p[2]); const sc = 0.8 + ((i * 37) % 10) / 20; o.scale.setScalar(sc); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.castShadow = true; return m; }, [items, crown]);
  return <group><primitive object={trunkMesh} /><primitive object={crownMesh} /><RigidBody type="fixed" colliders={false}>{items.map((p, i) => <CuboidCollider key={i} args={[0.35, 2, 0.35]} position={[p[0], 2, p[2]]} />)}</RigidBody></group>;
}

function StreetLights() {
  const t = useStore(s => s.worldTime); const night = t < 0.22 || t > 0.78;
  const posts = useMemo(() => { const out: [number, number, number, number][] = []; for (const r of ROADS) { const len = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]); for (let d = 25; d < len; d += 50) { const x = r.a[0] + (r.b[0] - r.a[0]) * d / len, z = r.a[1] + (r.b[1] - r.a[1]) * d / len; if (r.a[1] === r.b[1]) out.push([x, z + r.w / 2 + 1.2, 0, 1]); else out.push([x + r.w / 2 + 1.2, z, 0, 1]); } } return out; }, []);
  const mesh = useMemo(() => { const m = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 6), new THREE.MeshStandardMaterial({ color: 0x555a60 }), posts.length); const o = new THREE.Object3D(); posts.forEach((p, i) => { o.position.set(p[0], 3, p[1]); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); return m; }, [posts]);
  const lamps = useMemo(() => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3), new THREE.MeshStandardMaterial({ color: 0xffe9b0, emissive: 0xffd27a, emissiveIntensity: 1.5 }), posts.length); const o = new THREE.Object3D(); posts.forEach((p, i) => { o.position.set(p[0], 6, p[1]); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); return m; }, [posts]);
  (lamps.material as THREE.MeshStandardMaterial).emissiveIntensity = night ? 2 : 0;
  return <group><primitive object={mesh} /><primitive object={lamps} /></group>;
}

function WorldBounds() {
  const h = WORLD_SIZE / 2;
  return <RigidBody type="fixed" colliders={false}><CuboidCollider args={[h, 20, 1]} position={[0, 10, h]} /><CuboidCollider args={[h, 20, 1]} position={[0, 10, -h - 40]} /><CuboidCollider args={[1, 20, h + 40]} position={[h, 10, 0]} /><CuboidCollider args={[1, 20, h + 40]} position={[-h, 10, 0]} /></RigidBody>;
}
