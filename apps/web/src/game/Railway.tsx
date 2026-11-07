"use client";
/** Railway line (Kanpur is a railway city): twin tracks across the district, level crossings with striped barriers and blinking
 * signals at every road, and a passenger train that runs on the shared Kanpur clock. Barriers close when the train is near. */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { ROADS, WORLD_SIZE, RAIL_Z as RZ } from "@kanpurverse/shared";
import { useStore } from "../state/store";

export const RAIL_Z = RZ;              // runs east–west between Birhana Road (120) and Station Road (230)
const HALF = WORLD_SIZE / 2 + 60;
const CROSSINGS = ROADS.filter(r => r.a[0] === r.b[0]).map(r => ({ x: r.a[0], w: r.w })); // every north–south road crosses the line

export function Railway() {
  const quality = useStore(s => s.settings.quality);
  const sleepers = useMemo(() => { const m = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.12, 0.26), new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 }), Math.floor(HALF * 2 / 0.7)); const o = new THREE.Object3D(); let i = 0; for (let x = -HALF; x < HALF; x += 0.7) { o.position.set(x, 0.1, RAIL_Z); o.updateMatrix(); m.setMatrixAt(i++, o.matrix); } m.count = i; return m; }, []);
  return <group>
    {/* ballast */}
    <mesh position={[0, 0.04, RAIL_Z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[HALF * 2, 5]} /><meshStandardMaterial color="#6e6a63" roughness={1} /></mesh>
    <primitive object={sleepers} />
    {[-0.72, 0.72].map(dz => <mesh key={dz} position={[0, 0.2, RAIL_Z + dz]}><boxGeometry args={[HALF * 2, 0.12, 0.08]} /><meshStandardMaterial color="#9a9ea6" metalness={0.8} roughness={0.35} /></mesh>)}
    {/* fence posts along the line, broken at crossings */}
    {quality !== "low" && Array.from({ length: Math.floor(HALF * 2 / 12) }, (_, i) => -HALF + i * 12).filter(x => !CROSSINGS.some(c => Math.abs(c.x - x) < c.w / 2 + 6)).map(x => <group key={x}>{[-4, 4].map(dz => <mesh key={dz} position={[x, 0.7, RAIL_Z + dz]}><boxGeometry args={[0.12, 1.4, 0.12]} /><meshStandardMaterial color="#8c8c8c" /></mesh>)}</group>)}
    {CROSSINGS.map(c => <Crossing key={c.x} x={c.x} w={c.w} />)}
    <Train />
    {/* keep players off the ballast outside crossings (low wall), with gaps at roads */}
    <RigidBody type="fixed" colliders={false}>{segmentsBetweenCrossings().map(([a, b], i) => <group key={i}>{[-3.2, 3.2].map(dz => <CuboidCollider key={dz} args={[(b - a) / 2, 0.6, 0.1]} position={[(a + b) / 2, 0.6, RAIL_Z + dz]} />)}</group>)}</RigidBody>
  </group>;
}
function segmentsBetweenCrossings(): [number, number][] { const xs = [-HALF, ...CROSSINGS.flatMap(c => [c.x - c.w / 2 - 3, c.x + c.w / 2 + 3]), HALF]; const out: [number, number][] = []; for (let i = 0; i < xs.length; i += 2) out.push([xs[i], xs[i + 1]]); return out; }

/** Train position on the shared clock: 300 m loop at ~14 m/s, pauses 25 s at each end (station halt feel). */
export function trainX(worldTime: number): { x: number; dir: number } {
  const t = worldTime * 86400; const period = 2 * (HALF * 2 / 14 + 25); const p = t % period; const leg = HALF * 2 / 14;
  if (p < leg) return { x: -HALF + p * 14, dir: 1 }; if (p < leg + 25) return { x: HALF, dir: 1 };
  if (p < 2 * leg + 25) return { x: HALF - (p - leg - 25) * 14, dir: -1 }; return { x: -HALF, dir: -1 };
}

function Crossing({ x, w }: { x: number; w: number }) {
  const gates = useRef<THREE.Group[]>([]); const lamps = useRef<THREE.Mesh[]>([]); const ang = useRef(0); const bell = useRef(0);
  useFrame((_, dt) => {
    const { x: tx } = trainX(useStore.getState().worldTime); const near = Math.abs(tx - x) < 90; const target = near ? 0 : Math.PI / 2 - 0.05; // 0 = horizontal (closed)
    ang.current += (target - ang.current) * (1 - Math.exp(-dt * 1.8)); gates.current.forEach(g => { if (g) g.rotation.z = ang.current; });
    bell.current += dt; const blink = near && Math.floor(bell.current * 2) % 2 === 0; lamps.current.forEach((m, i) => { if (m) (m.material as THREE.MeshStandardMaterial).emissiveIntensity = near ? (blink === (i % 2 === 0) ? 2.5 : 0.1) : 0; });
  });
  const Post = ({ side }: { side: 1 | -1 }) => (
    <group position={[x + side * (w / 2 + 1.2), 0, RAIL_Z - side * 5]}>
      <mesh position={[0, 1.4, 0]}><boxGeometry args={[0.3, 2.8, 0.3]} /><meshStandardMaterial color="#e9e4d4" /></mesh>
      <mesh position={[0, 2.5, 0.2]}><boxGeometry args={[0.45, 0.9, 0.12]} /><meshStandardMaterial color="#1a1a1c" /></mesh>
      {[0, 1].map(k => <mesh key={k} ref={el => { if (el) lamps.current[k + (side === 1 ? 0 : 2)] = el; }} position={[k ? 0.12 : -0.12, 2.5, 0.28]}><sphereGeometry args={[0.07]} /><meshStandardMaterial color="#5a0b16" emissive="#ff2b3a" emissiveIntensity={0} /></mesh>)}
      <group ref={el => { if (el) gates.current[side === 1 ? 0 : 1] = el; }} position={[0, 1.1, 0]} rotation={[0, side === 1 ? Math.PI : 0, Math.PI / 2 - 0.05]}>
        <mesh position={[(w / 2 + 0.6) / 2, 0, 0]}><boxGeometry args={[w / 2 + 0.6, 0.12, 0.08]} /><meshStandardMaterial color="#fff" /></mesh>
        {Array.from({ length: Math.ceil((w / 2 + 0.6) / 1.2) }, (_, i) => <mesh key={i} position={[0.6 + i * 1.2, 0, 0.01]}><boxGeometry args={[0.6, 0.13, 0.09]} /><meshStandardMaterial color="#c8102e" /></mesh>)}
      </group>
    </group>);
  return <group>
    <Post side={1} /><Post side={-1} />
    <mesh position={[x, 0.05, RAIL_Z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w + 2, 5.2]} /><meshStandardMaterial color="#3d3d42" /></mesh>{/* road deck over tracks */}
    {[-0.72, 0.72].map(dz => <mesh key={dz} position={[x, 0.2, RAIL_Z + dz]}><boxGeometry args={[w + 2, 0.12, 0.08]} /><meshStandardMaterial color="#9a9ea6" metalness={0.8} roughness={0.35} /></mesh>)}
    {[-1, 1].map(s => <mesh key={s} position={[x, 0.06, RAIL_Z + s * 3.6]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w + 2, 0.5]} /><meshBasicMaterial color="#f2e9c9" /></mesh>)}
    {[-1, 1].map(s => <mesh key={"x" + s} position={[x + s * (w / 2 + 1.2), 3.4, RAIL_Z + s * 5]}><boxGeometry args={[1.2, 0.9, 0.05]} /><meshStandardMaterial color="#f2b134" /></mesh>)}{/* warning board */}
  </group>;
}

function Train() {
  const g = useRef<THREE.Group>(null); const wheels = useRef<THREE.Mesh[]>([]); const spin = useRef(0);
  const colors = ["#0b3d91", "#1a56c4", "#1a56c4", "#1a56c4", "#1a56c4", "#0b3d91"]; // blue ICF-style rake
  useFrame((_, dt) => { const { x, dir } = trainX(useStore.getState().worldTime); if (!g.current) return; g.current.position.set(x, 0.2, RAIL_Z); g.current.rotation.y = dir > 0 ? 0 : Math.PI; spin.current += dt * 14 / 0.5; wheels.current.forEach(w => { if (w) w.rotation.x = spin.current; }); });
  return <group ref={g}>
    {colors.map((c, i) => <group key={i} position={[-(i - colors.length / 2 + 0.5) * 14.5, 0, 0]}>
      <mesh position={[0, 1.9, 0]} castShadow><boxGeometry args={[14, 3.2, 3]} /><meshStandardMaterial color={c} roughness={0.5} metalness={0.2} /></mesh>
      <mesh position={[0, 3.55, 0]}><boxGeometry args={[14.2, 0.3, 3.1]} /><meshStandardMaterial color="#bfc4cc" /></mesh>
      <mesh position={[0, 2.05, 0]}><boxGeometry args={[14.05, 0.9, 3.05]} /><meshStandardMaterial color="#8fd0ff" metalness={0.8} roughness={0.1} /></mesh>{/* window band */}
      <mesh position={[0, 1.0, 0]}><boxGeometry args={[14.05, 0.18, 3.05]} /><meshStandardMaterial color="#f2b134" /></mesh>{/* yellow stripe */}
      {[-5, 5].map(dx => [-1.2, 1.2].map(dz => <mesh key={dx + "_" + dz} ref={el => { if (el) wheels.current.push(el); }} position={[dx, 0.45, dz]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.45, 0.45, 0.2, 14]} /><meshStandardMaterial color="#222" /></mesh>))}
      {i === 0 && <><mesh position={[7.1, 1.3, 0]} rotation={[0, 0, 0]}><boxGeometry args={[0.3, 2.2, 2.8]} /><meshStandardMaterial color="#c8102e" /></mesh><mesh position={[7.2, 1.2, 0]}><sphereGeometry args={[0.25]} /><meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} /></mesh></>}
    </group>)}
  </group>;
}
