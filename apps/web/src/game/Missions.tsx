"use client";
/** 3D markers: active checkpoint beam + mission giver icons. */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MISSIONS, chapterFor, storyUnlocked, sideMissionsOpen } from "@kanpurverse/shared";
import { useStore } from "../state/store";

const EMPTY_MISSIONS: string[] = [];
export function MissionMarkers() {
  const mission = useStore(s => s.mission); const done = useStore(s => s.profile?.missionsCompleted ?? EMPTY_MISSIONS);
  return <>
    {mission && <Beam p={mission.def.checkpoints[mission.index]} r={mission.def.radius} compact={mission.def.id === "laddoo_chakkar" || !!mission.def.enemies?.some(e => e.index === mission.index)} />}
    {!mission && MISSIONS.filter(m => !done.includes(m.id) && (chapterFor(m.id) ? storyUnlocked(m.id, done) : sideMissionsOpen(done))).map(m => <GiverIcon key={m.id} p={m.start} />)}
  </>;
}
function Beam({ p, r, compact=false }: { p: [number, number]; r: number; compact?: boolean }) {
  const ref = useRef<THREE.Mesh>(null); useFrame((st) => { if (ref.current) { ref.current.rotation.y = st.clock.elapsedTime; (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(st.clock.elapsedTime * 3) * 0.1; } });
  return <group position={[p[0], 0, p[1]]}><mesh ref={ref} visible={!compact} position={[0, 20, 0]}><cylinderGeometry args={[r * 0.5, r, 40, 16, 1, true]} /><meshBasicMaterial color="#ffd23f" transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}><ringGeometry args={[r - 0.4, r, 32]} /><meshBasicMaterial color="#ffd23f" /></mesh></group>;
}
function GiverIcon({ p }: { p: [number, number] }) {
  const ref = useRef<THREE.Mesh>(null); useFrame((st) => { if (ref.current) { ref.current.position.y = 3.1 + Math.sin(st.clock.elapsedTime * 2) * 0.15; ref.current.rotation.y = st.clock.elapsedTime * 1.5; } });
  return <mesh ref={ref} position={[p[0], 3.1, p[1]]}><octahedronGeometry args={[0.35]} /><meshStandardMaterial color="#ffd23f" emissive="#ffd23f" emissiveIntensity={0.8} /></mesh>;
}
