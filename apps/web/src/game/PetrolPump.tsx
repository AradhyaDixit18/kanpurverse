"use client";
/**
 * Velto Petroleum: a fuel station on the first drive out of Cafe Chowk. Original, code-built geometry and an invented
 * brand (teal and yellow); prices are fictional. Canopy, four columns, two pump islands with twin dispensers, a price
 * totem at the road, a cashier's kiosk, an air tower, fire buckets and oil drums. Columns, islands, kiosk and totem
 * are solid. Canopy lights and dispenser screens come up at dusk with the rest of the city.
 */
import { Suspense, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { PETROL_PUMP } from "@kanpurverse/shared";
import { useStore } from "../state/store";
import { nightFactor } from "./NightLights";

const TEAL = "#0e6f6a", YELLOW = "#f2b705", WHITE = "#f1efe8", CONCRETE = "#8f8c86";
type V3 = [number, number, number];
const B = ({ p, s, c, r, cast, m }: { p: V3; s: V3; c?: string; r?: V3; cast?: boolean; m?: THREE.Material }) => <mesh position={p} rotation={r} castShadow={cast} receiveShadow material={m}><boxGeometry args={s} />{!m && <meshStandardMaterial color={c} roughness={0.85} />}</mesh>;

export function PetrolPump() {
  const en = useStore(s => s.settings.lang === "english");
  const mats = useMemo(() => ({ lamp: new THREE.MeshStandardMaterial({ color: "#fff6dc", emissive: "#ffe9b0", emissiveIntensity: 0.2 }), screen: new THREE.MeshStandardMaterial({ color: "#12202a", emissive: "#6fe0c8", emissiveIntensity: 0.5 }), glass: new THREE.MeshStandardMaterial({ color: "#20303c", roughness: 0.15, metalness: 0.4, emissive: "#ffd9a0", emissiveIntensity: 0 }) }), []);
  useFrame(() => { const k = nightFactor(); mats.lamp.emissiveIntensity = 0.2 + k * 3.2; mats.screen.emissiveIntensity = 0.5 + k * 1.2; mats.glass.emissiveIntensity = k * 0.9; });
  const { x, z, yaw } = PETROL_PUMP; const rot = yaw - Math.PI / 2; // local +z faces the road, local +x runs along it
  const columns: V3[] = [[-5.6, 2.6, -2.1], [5.6, 2.6, -2.1], [-5.6, 2.6, 3.1], [5.6, 2.6, 3.1]]; const islands = [-3.4, 3.4];
  return <group name="petrol-pump" position={[x, 0, z]} rotation={[0, rot, 0]}>
    {/* forecourt and the apron down to the kerb, with painted bay lines and entry/exit arrows */}
    <B p={[0, 0.03, 1.4]} s={[27, 0.1, 19.6]} c={CONCRETE} />
    {[-9, -3.4, 3.4, 9].map(lx => <B key={lx} p={[lx + (lx < 0 ? 2.8 : -2.8), 0.085, 0.5]} s={[0.12, 0.01, 6.4]} c="#e9e4cf" />)}
    {[-11.2, 11.2].map(lx => <group key={lx} position={[lx, 0.085, 8.6]}><B p={[0, 0, 0]} s={[0.35, 0.01, 2.2]} c={YELLOW} /><B p={[0.45, 0, lx < 0 ? -0.8 : 0.8]} s={[0.35, 0.01, 1]} c={YELLOW} r={[0, lx < 0 ? 0.7 : -0.7, 0]} /><B p={[-0.45, 0, lx < 0 ? -0.8 : 0.8]} s={[0.35, 0.01, 1]} c={YELLOW} r={[0, lx < 0 ? -0.7 : 0.7, 0]} /></group>)}
    {/* canopy: deck, teal fascia with a yellow stripe, light panels underneath */}
    <B p={[0, 5.5, 0.5]} s={[15, 0.5, 8.6]} c={WHITE} cast />
    {([[0, 5.5, 4.85, 15.3, 0.9, 0.12], [0, 5.5, -3.85, 15.3, 0.9, 0.12], [7.6, 5.5, 0.5, 0.12, 0.9, 8.8], [-7.6, 5.5, 0.5, 0.12, 0.9, 8.8]] as number[][]).map((f, i) => <group key={i}><B p={[f[0], f[1], f[2]]} s={[f[3], f[4], f[5]]} c={TEAL} /><B p={[f[0], f[1] - 0.3, f[2] + (f[5] < 1 ? Math.sign(f[2] - 0.5) * 0.01 : 0)]} s={[f[3] + 0.02, 0.14, f[5] + 0.02]} c={YELLOW} /></group>)}
    {[-4.6, 0, 4.6].flatMap(lx => [-1.4, 2.4].map(lz => <B key={`${lx}:${lz}`} p={[lx, 5.22, lz]} s={[2.2, 0.06, 0.7]} m={mats.lamp} />))}
    <Suspense fallback={null}><Text position={[0, 5.52, 4.93]} fontSize={0.56} color="#ffffff" anchorX="center" anchorY="middle" letterSpacing={0.04}>{en ? "VELTO PETROLEUM" : "वेल्टो पेट्रोलियम"}</Text></Suspense>
    {columns.map((c, i) => <group key={i}><B p={c} s={[0.45, 5.2, 0.45]} c={WHITE} cast /><B p={[c[0], 0.6, c[2]]} s={[0.5, 1.2, 0.5]} c={TEAL} /><B p={[c[0], 1.26, c[2]]} s={[0.52, 0.12, 0.52]} c={YELLOW} /></group>)}
    {/* pump islands: kerbed plinth, two dispensers each, hoses and bollards */}
    {islands.map(ix => <group key={ix} position={[ix, 0, 0.5]}>
      <B p={[0, 0.19, 0]} s={[1.15, 0.22, 4.6]} c="#c9c5bb" /><B p={[0, 0.31, 2.2]} s={[1.17, 0.03, 0.22]} c={YELLOW} /><B p={[0, 0.31, -2.2]} s={[1.17, 0.03, 0.22]} c={YELLOW} />
      {[-1.05, 1.05].map(dz => <group key={dz} position={[0, 0.3, dz]}>
        <B p={[0, 0.5, 0]} s={[0.78, 1.0, 0.5]} c={TEAL} cast /><B p={[0, 1.38, 0]} s={[0.78, 0.76, 0.5]} c={WHITE} cast /><B p={[0, 1.82, 0]} s={[0.84, 0.12, 0.56]} c={YELLOW} />
        {[-1, 1].map(side => <group key={side}><B p={[side * 0.4, 1.42, 0]} s={[0.02, 0.36, 0.34]} m={mats.screen} /><B p={[side * 0.43, 0.86, 0.14]} s={[0.07, 0.3, 0.09]} c="#16181b" /><B p={[side * 0.43, 0.86, -0.14]} s={[0.07, 0.3, 0.09]} c="#16181b" />
          <mesh position={[side * 0.47, 0.72, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.36, 0.022, 6, 14, Math.PI]} /><meshStandardMaterial color="#111" roughness={0.6} /></mesh></group>)}
      </group>)}
      {[-2.55, 2.55].map(bz => <mesh key={bz} position={[0, 0.62, bz]} castShadow><cylinderGeometry args={[0.07, 0.07, 0.9, 10]} /><meshStandardMaterial color={YELLOW} roughness={0.6} /></mesh>)}
    </group>)}
    {/* cashier's kiosk at the back: glazed front, name board on the roof */}
    <B p={[0, 1.65, -6.4]} s={[8.4, 3.3, 2.8]} c="#e6dfd0" cast /><B p={[0, 3.36, -6.4]} s={[8.9, 0.14, 3.3]} c="#cfc7b6" /><B p={[-1.6, 1.75, -4.98]} s={[4.2, 1.9, 0.06]} m={mats.glass} /><B p={[2.6, 1.25, -4.98]} s={[1.1, 2.3, 0.06]} c="#5a4632" />
    <B p={[0, 3.95, -5.4]} s={[6.4, 0.95, 0.14]} c={TEAL} /><B p={[0, 3.44, -5.4]} s={[6.5, 0.1, 0.16]} c={YELLOW} />
    <Suspense fallback={null}><Text position={[0, 4.0, -5.32]} fontSize={0.5} color="#fff" anchorX="center" anchorY="middle">{en ? "VELTO PETROLEUM" : "वेल्टो पेट्रोलियम"}</Text><Text position={[0, 3.62, -5.32]} fontSize={0.2} color={YELLOW} anchorX="center" anchorY="middle">{en ? "AIR · WATER · 24 HOURS" : "हवा · पानी · 24 घंटे"}</Text></Suspense>
    {/* price totem at the road */}
    <group position={[-10.6, 0, 9.2]}><B p={[0, 1.4, 0]} s={[0.28, 2.8, 0.28]} c="#6f7376" cast /><B p={[0, 4.3, 0]} s={[2.0, 3.2, 0.3]} c={TEAL} cast /><B p={[0, 5.6, 0]} s={[2.06, 0.5, 0.34]} c={YELLOW} />
      {[1, -1].map(f => <Suspense key={f} fallback={null}><group rotation={[0, f > 0 ? 0 : Math.PI, 0]}><Text position={[0, 5.6, 0.18]} fontSize={0.3} color="#1a1a1a" anchorX="center" anchorY="middle">{en ? "VELTO" : "वेल्टो"}</Text><Text position={[0, 4.75, 0.16]} fontSize={0.3} color="#fff" anchorX="center" anchorY="middle">{en ? "PETROL  96.40" : "पेट्रोल  96.40"}</Text><Text position={[0, 4.15, 0.16]} fontSize={0.3} color="#fff" anchorX="center" anchorY="middle">{en ? "DIESEL  89.60" : "डीज़ल  89.60"}</Text><Text position={[0, 3.45, 0.16]} fontSize={0.2} color={YELLOW} anchorX="center" anchorY="middle">{en ? "PURE · FULL MEASURE" : "शुद्ध · पूरा नाप"}</Text></group></Suspense>)}</group>
    {/* air tower, fire buckets on their stand, oil drums */}
    <group position={[10.4, 0, -2.6]}><B p={[0, 0.9, 0]} s={[0.36, 1.8, 0.3]} c="#c62828" cast /><B p={[0, 1.95, 0]} s={[0.5, 0.36, 0.34]} c={WHITE} /><Suspense fallback={null}><Text position={[0, 1.95, 0.18]} fontSize={0.16} color="#c62828" anchorX="center" anchorY="middle">{en ? "AIR" : "हवा"}</Text></Suspense></group>
    <group position={[8.2, 0, -5.9]}><B p={[0, 1.1, 0]} s={[2.4, 0.08, 0.08]} c="#444" /><B p={[-1.2, 0.6, 0]} s={[0.08, 1.2, 0.08]} c="#444" /><B p={[1.2, 0.6, 0]} s={[0.08, 1.2, 0.08]} c="#444" />{[-0.8, -0.27, 0.27, 0.8].map(bx => <mesh key={bx} position={[bx, 0.86, 0]}><cylinderGeometry args={[0.17, 0.12, 0.34, 12]} /><meshStandardMaterial color="#c62828" roughness={0.5} /></mesh>)}</group>
    {([[-9.4, -6.2, "#1f5fa8"], [-8.5, -6.5, "#c62828"], [-9.9, -5.3, "#1f5fa8"]] as [number, number, string][]).map(([dx, dz, c], i) => <mesh key={i} position={[dx, 0.52, dz]} castShadow><cylinderGeometry args={[0.3, 0.3, 0.92, 14]} /><meshStandardMaterial color={c} roughness={0.55} metalness={0.3} /></mesh>)}
    <RigidBody type="fixed" colliders={false}>
      {columns.map((c, i) => <CuboidCollider key={i} args={[0.26, 2.6, 0.26]} position={c} />)}
      {islands.map(ix => <CuboidCollider key={ix} args={[0.6, 1.1, 2.7]} position={[ix, 1.1, 0.5]} />)}
      <CuboidCollider args={[4.2, 1.7, 1.4]} position={[0, 1.7, -6.4]} /><CuboidCollider args={[0.2, 2.8, 0.2]} position={[-10.6, 2.8, 9.2]} /><CuboidCollider args={[0.25, 1, 0.2]} position={[10.4, 1, -2.6]} /><CuboidCollider args={[1.3, 0.6, 0.2]} position={[8.2, 0.6, -5.9]} /><CuboidCollider args={[0.9, 0.5, 0.8]} position={[-9.2, 0.5, -6]} />
    </RigidBody>
  </group>;
}
