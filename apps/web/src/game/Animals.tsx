"use client";
/** Street life: cows that wander and sit, stray dogs that trot, pigeon flocks circling, crows on wires. Deterministic on the shared clock. */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { renderWorldTime } from "./syncedClock";
import * as THREE from "three";
import { LANDMARKS, SPAWN_POINT } from "@kanpurverse/shared";
import { getRoads, roadsNear, segPoint, segYaw, type Seg } from "./roads";
import { useStore } from "../state/store";
import { playerPos } from "./refs";

const seeded = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; };

export function Animals() {
  const q = useStore(s => s.settings.quality);
  const S: [number, number] = [SPAWN_POINT[0], SPAWN_POINT[2]];
  const cows = useMemo(() => { const rnd = seeded(11); const spots: [number, number][] = [[S[0] - 30, S[1] + 36], [S[0] + 20, S[1] - 40], [S[0] - 150, S[1] + 100], [S[0] + 100, S[1] + 100], [S[0] - 200, S[1] - 150], [S[0] + 150, S[1] - 60], [S[0] + 60, S[1] + 150], [S[0] - 100, S[1] + 150]]; return spots.slice(0, q === "low" ? 4 : 8).map((p, i) => ({ p, color: ["#f5f0e6", "#d9c2a3", "#f5f0e6", "#8b6b4a", "#e8e4dc"][i % 5], phase: rnd() * 100, sits: i % 3 === 0 })); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const dogs = useMemo(() => { const rnd = seeded(31); const pool = roadsNear(S[0], S[1], 300).filter(s => s.len > 30); const segs = pool.length ? pool : getRoads(); if (!segs.length) return []; return Array.from({ length: q === "low" ? 3 : 6 }, (_, i) => ({ seg: segs[(i * 11) % segs.length], side: i % 2 ? 1 : -1, start: rnd() * 400, speed: 2.2 + rnd(), color: ["#c9a66b", "#3b2f2f", "#e8e4dc", "#8b6b4a"][i % 4] })); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  return <>
    {cows.map((c, i) => <Cow key={i} {...c} />)}
    {dogs.map((d, i) => <Dog key={i} {...d} />)}
    <Pigeons count={q === "low" ? 10 : 24} center={[S[0] + 40, S[1] - 60]} />
    <Pigeons count={q === "low" ? 8 : 18} center={[S[0] - 120, S[1] + 60]} />
    <Crows />
  </>;
}

function Cow({ p, color, phase, sits }: { p: [number, number]; color: string; phase: number; sits: boolean }) {
  const g = useRef<THREE.Group>(null); const legs = useRef<THREE.Group[]>([]); const head = useRef<THREE.Group>(null); const tail = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const t = renderWorldTime.v * 86400 + phase; if (!g.current) return;
    const dPlayer = Math.hypot(playerPos.x - p[0], playerPos.z - p[1]);
    if (sits) { g.current.position.set(p[0], 0.15, p[1]); g.current.rotation.y = phase; legs.current.forEach(l => { if (l) l.rotation.x = 1.4; }); if (head.current) head.current.rotation.y = Math.sin(t * 0.3) * 0.3; }
    else { const r = 6; const a = t * 0.08; const wobble = Math.sin(t * 0.5) > 0.6; // walk in a slow loop, pause often
      const x = p[0] + Math.cos(a) * r, z = p[1] + Math.sin(a) * r; g.current.position.set(x, 0.75, z); g.current.rotation.y = -a + (wobble ? 0 : 0);
      legs.current.forEach((l, i) => { if (l) l.rotation.x = wobble ? 0 : Math.sin(t * 4 + i * Math.PI / 2) * 0.35; }); if (head.current) head.current.rotation.x = wobble ? 0.5 : 0.1; }
    if (tail.current) tail.current.rotation.z = Math.sin(t * 2.5) * 0.4; if (head.current && dPlayer < 5) head.current.rotation.y = Math.atan2(playerPos.x - g.current.position.x, playerPos.z - g.current.position.z) - g.current.rotation.y;
  });
  return <group ref={g}>
    <mesh position={[0, 0.9, 0]} castShadow><boxGeometry args={[1.0, 0.9, 2.0, 2, 2, 2]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
    <mesh position={[0, 1.35, -0.3]}><boxGeometry args={[0.5, 0.35, 0.8]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>{/* hump */}
    <mesh position={[0, 0.5, -0.4]}><sphereGeometry args={[0.28, 10, 8]} /><meshStandardMaterial color="#e8b4b8" /></mesh>{/* udder */}
    <group ref={head} position={[0, 1.15, 1.1]}>
      <mesh castShadow><boxGeometry args={[0.45, 0.5, 0.7]} /><meshStandardMaterial color={color} roughness={0.9} /></mesh>
      <mesh position={[0, -0.1, 0.4]}><boxGeometry args={[0.35, 0.3, 0.2]} /><meshStandardMaterial color="#d8a7a0" /></mesh>
      {[-0.22, 0.22].map(x => <mesh key={x} position={[x, 0.32, -0.1]} rotation={[0, 0, x > 0 ? -0.5 : 0.5]}><coneGeometry args={[0.05, 0.4, 6]} /><meshStandardMaterial color="#e6d5b8" /></mesh>)}
      {[-0.3, 0.3].map(x => <mesh key={x} position={[x, 0.05, 0]} rotation={[0, 0, x > 0 ? 1.2 : -1.2]}><boxGeometry args={[0.25, 0.08, 0.12]} /><meshStandardMaterial color={color} /></mesh>)}
      {[-0.12, 0.12].map(x => <mesh key={x} position={[x, 0.08, 0.36]}><sphereGeometry args={[0.04]} /><meshBasicMaterial color="#111" /></mesh>)}
    </group>
    {[[-0.35, 0.7], [0.35, 0.7], [-0.35, -0.7], [0.35, -0.7]].map(([x, z], i) => <group key={i} ref={el => { if (el) legs.current[i] = el; }} position={[x, 0.5, z]}><mesh position={[0, -0.3, 0]}><boxGeometry args={[0.18, 0.7, 0.2]} /><meshStandardMaterial color={color} /></mesh><mesh position={[0, -0.68, 0]}><boxGeometry args={[0.19, 0.1, 0.22]} /><meshStandardMaterial color="#333" /></mesh></group>)}
    <mesh ref={tail} position={[0, 1.1, -1.05]} rotation={[0.3, 0, 0]}><cylinderGeometry args={[0.03, 0.05, 0.9]} /><meshStandardMaterial color={color} /></mesh>
  </group>;
}

function Dog({ seg, side, start, speed, color }: { seg: Seg; side: number; start: number; speed: number; color: string }) {
  const g = useRef<THREE.Group>(null); const legs = useRef<THREE.Mesh[]>([]); const len = seg.len; const off = (seg.w / 2 + 2.2) * side;
  useFrame(() => { const t = renderWorldTime.v * 86400; if (!g.current) return; const d = (start + t * speed) % (len * 2); const fwd = d < len; const s = fwd ? d : len * 2 - d; const resting = Math.floor(t / 40 + start) % 4 === 0; const ss = resting ? Math.min(s, len - 1) : s;
    const [x, z] = segPoint(seg, ss, off); g.current.position.set(x, resting ? 0.2 : 0.42, z); g.current.rotation.y = segYaw(seg, fwd);
    legs.current.forEach((l, i) => { if (l) l.rotation.x = resting ? 1.3 : Math.sin(t * 9 + i * 1.5) * 0.6; }); });
  return <group ref={g}>
    <mesh position={[0, 0.2, 0]} castShadow><boxGeometry args={[0.3, 0.3, 0.8]} /><meshStandardMaterial color={color} /></mesh>
    <mesh position={[0, 0.35, 0.5]}><boxGeometry args={[0.24, 0.24, 0.32]} /><meshStandardMaterial color={color} /></mesh>
    {[-0.08, 0.08].map(x => <mesh key={x} position={[x, 0.5, 0.42]}><boxGeometry args={[0.06, 0.12, 0.04]} /><meshStandardMaterial color={color} /></mesh>)}
    {[[-0.1, 0.3], [0.1, 0.3], [-0.1, -0.3], [0.1, -0.3]].map(([x, z], i) => <mesh key={i} ref={el => { if (el) legs.current[i] = el; }} position={[x, 0.05, z]}><boxGeometry args={[0.07, 0.4, 0.07]} /><meshStandardMaterial color={color} /></mesh>)}
    <mesh position={[0, 0.35, -0.5]} rotation={[0.8, 0, 0]}><cylinderGeometry args={[0.02, 0.03, 0.3]} /><meshStandardMaterial color={color} /></mesh>
  </group>;
}

/** A flock circling above a landmark; lands and takes off in waves. */
function Pigeons({ count, center }: { count: number; center: [number, number] }) {
  const mesh = useMemo(() => { const g = new THREE.BufferGeometry(); const v = new Float32Array([-0.35, 0, 0, 0, 0.05, 0.15, 0, 0, -0.12, 0.35, 0, 0, 0, 0.05, 0.15, 0, 0, -0.12]); g.setAttribute("position", new THREE.BufferAttribute(v, 3)); g.computeVertexNormals(); const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0x6b6f78, side: THREE.DoubleSide }), count); m.frustumCulled = false; return m; }, [count]);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => { const t = renderWorldTime.v * 86400; const landed = Math.floor(t / 25) % 3 === 0; for (let i = 0; i < count; i++) { const a = t * 0.9 + i * 0.5, r = 10 + (i % 5) * 2; const flap = Math.sin(t * 14 + i) * 0.5;
      if (landed) { o.position.set(center[0] + Math.cos(i * 1.7) * 6, 0.15, center[1] + Math.sin(i * 2.3) * 6); o.rotation.set(0, i, 0); o.scale.setScalar(0.8); } else { o.position.set(center[0] + Math.cos(a) * r, 8 + Math.sin(t * 0.7 + i) * 2 + (i % 3), center[1] + Math.sin(a) * r); o.rotation.set(0, -a + Math.PI / 2, flap); o.scale.setScalar(1); }
      o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); } mesh.instanceMatrix.needsUpdate = true; });
  return <primitive object={mesh} />;
}

function Crows() {
  const spots = useMemo(() => LANDMARKS.filter(l => l.kind === "cafe" || l.kind === "market" || l.kind === "temple").flatMap(l => [0, 1, 2].map(k => [l.p[0] + k * 2 - 2, l.p[1] - 6] as [number, number])), []);
  return <>{spots.map((p, i) => <group key={i} position={[p[0], 7.55, p[1]]}><mesh><boxGeometry args={[0.16, 0.14, 0.3]} /><meshStandardMaterial color="#111" /></mesh><mesh position={[0, 0.1, 0.17]}><boxGeometry args={[0.1, 0.1, 0.12]} /><meshStandardMaterial color="#111" /></mesh></group>)}</>;
}
