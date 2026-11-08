"use client";
/** Level crossings at OSM crossing nodes (barriers, blinking lights, bell) and a passenger train that follows the real OSM track
 * polyline through Kanpur Central on the shared Kanpur clock (so every player sees the same train). */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { renderWorldTime } from "./syncedClock";
import * as THREE from "three";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import type { GeoData } from "./roads";
import { playerPos } from "./refs";
import { sfx } from "../audio/sfx";

/** Build the longest connected rail polyline (greedy chaining of OSM ways by shared endpoints). */
function buildMainLine(geo: GeoData): [number, number][] {
  const ways = geo.rails.map(r => r.pts.slice()).filter(p => p.length > 1); if (!ways.length) return [];
  const key = (p: [number, number]) => `${Math.round(p[0] / 3)},${Math.round(p[1] / 3)}`;
  let best: [number, number][] = [];
  for (let start = 0; start < Math.min(ways.length, 60); start++) {
    const used = new Set<number>([start]); let line = ways[start].slice();
    for (let guard = 0; guard < 400; guard++) { const end = line[line.length - 1]; let found = false;
      for (let i = 0; i < ways.length; i++) { if (used.has(i)) continue; const w = ways[i]; if (key(w[0]) === key(end)) { line = line.concat(w.slice(1)); used.add(i); found = true; break; } if (key(w[w.length - 1]) === key(end)) { line = line.concat(w.slice(0, -1).reverse()); used.add(i); found = true; break; } }
      if (!found) break; }
    if (line.length > best.length) best = line;
  }
  return best;
}
const routeCache = new WeakMap<GeoData, [number, number][]>();
const distanceCache = new WeakMap<[number, number][], number[]>();
/** A route is immutable for one loaded geographic extract; all crossings share it. */
export function mainLine(geo: GeoData): [number, number][] {
  let line = routeCache.get(geo); if (!line) { line = buildMainLine(geo); routeCache.set(geo, line); } return line;
}
function cumulative(pts: [number, number][]) { const hit = distanceCache.get(pts); if (hit) return hit; const d = [0]; for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); distanceCache.set(pts, d); return d; }
export function sample(pts: [number, number][], cum: number[], s: number): { x: number; z: number; yaw: number } {
  const L = cum[cum.length - 1]; s = Math.max(0, Math.min(L, s)); let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const a = pts[i - 1], b = pts[i]; const t = (s - cum[i - 1]) / Math.max(0.001, cum[i] - cum[i - 1]);
  return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, yaw: Math.atan2(b[0] - a[0], b[1] - a[1]) };
}
/** Train schedule on the shared clock: runs end-to-end at 18 m/s with 40 s halts at each station on the line. */
interface Schedule { L: number; V: number; HALT: number; legs: { from: number; to: number; dur: number }[]; at?: number; state?: { s: number; dir: number; halted: boolean; speed: number } | null }
const schedules = new WeakMap<GeoData, WeakMap<[number, number][], Schedule>>();
function scheduleFor(geo: GeoData, line: [number, number][], cum: number[]): Schedule {
  let byLine = schedules.get(geo); if (!byLine) { byLine = new WeakMap(); schedules.set(geo, byLine); }
  const hit = byLine.get(line); if (hit) return hit;
  const L = cum[cum.length - 1];
  const stops = geo.stations.map(st => { let best = 0, bd = Infinity; for (let i = 0; i < line.length; i++) { const d = Math.hypot(line[i][0] - st.p[0], line[i][1] - st.p[1]); if (d < bd) { bd = d; best = i; } } return bd < 120 ? cum[best] : -1; }).filter(s => s >= 0).sort((a, b) => a - b);
  const V = 18, HALT = 40, legs: { from: number; to: number; dur: number }[] = []; const pts = [0, ...stops.filter(s => s > 50 && s < L - 50), L];
  for (let i = 0; i + 1 < pts.length; i++) legs.push({ from: pts[i], to: pts[i + 1], dur: (pts[i + 1] - pts[i]) / V });
  const out = { L, V, HALT, legs }; byLine.set(line, out); return out;
}
function evaluateSchedule({ L, V, HALT, legs }: Schedule, worldTime: number) {
  if (L < 100) return null;
  const oneWay = legs.reduce((a, l) => a + l.dur + HALT, 0); const period = oneWay * 2; let p = (worldTime * 86400) % period; let dir = 1; if (p > oneWay) { p -= oneWay; dir = -1; }
  const seq = dir > 0 ? legs : legs.slice().reverse().map(l => ({ from: l.to, to: l.from, dur: l.dur }));
  for (const leg of seq) { if (p < leg.dur) { const k = p / leg.dur; const e = k < 0.15 ? (k / 0.15) * (k / 0.15) * 0.15 : k > 0.85 ? 1 - ((1 - k) / 0.15) * ((1 - k) / 0.15) * 0.15 : k; return { s: leg.from + (leg.to - leg.from) * e, dir, halted: false, speed: V }; } p -= leg.dur; if (p < HALT) return { s: leg.to, dir, halted: true, speed: 0 }; p -= HALT; }
  return { s: dir > 0 ? L : 0, dir, halted: true, speed: 0 };
}

/** Cached once per shared clock value; clients retain identical deterministic state. */
export function trainState(geo: GeoData, line: [number, number][], cum: number[], worldTime: number) {
  const schedule = scheduleFor(geo, line, cum);
  if (schedule.at !== worldTime) { schedule.at = worldTime; schedule.state = evaluateSchedule(schedule, worldTime); }
  return schedule.state ?? null;
}

/** Keep every coach centre inside the extracted track, including terminal reversals. */
export function coachPoses(line: [number, number][], cum: number[], centre: number, dir: number, count: number) {
  const extent = (count - 1) * 15 / 2 + 7;
  const L = cum[cum.length - 1], middle = Math.max(Math.min(extent, L / 2), Math.min(L - extent, centre));
  return Array.from({ length: count }, (_, i) => { const p = sample(line, cum, middle - dir * (i - (count - 1) / 2) * 15); return { ...p, yaw: p.yaw - Math.PI / 2 + (dir < 0 ? Math.PI : 0) }; });
}

export function OsmTrain({ geo }: { geo: GeoData }) {
  const line = useMemo(() => mainLine(geo), [geo]); const cum = useMemo(() => cumulative(line), [line]);
  const g = useRef<THREE.Group>(null); const wheels = useRef<THREE.Mesh[]>([]); const spin = useRef(0); const hornAt = useRef(0); const doors = useRef<THREE.Mesh[]>([]);
  const colors = ["#0b3d91", "#1a56c4", "#1a56c4", "#1a56c4", "#1a56c4", "#1a56c4", "#0b3d91"];
  useFrame((_, dt) => { if (!g.current || line.length < 2) return; const st = trainState(geo, line, cum, renderWorldTime.v); if (!st) return;
    const poses = coachPoses(line, cum, st.s, st.dir, colors.length);
    const head = poses[0]; g.current.position.set(head.x, 0.25, head.z); g.current.rotation.y = 0;
    // Children are world-space track offsets under an unrotated root; X is the coach's long axis.
    g.current.children.forEach((c, i) => { const p = poses[i]; c.position.set(p.x - head.x, 0, p.z - head.z); c.rotation.y = p.yaw; });
    spin.current += st.speed * dt / 0.5; wheels.current.forEach(w => { if (w) w.rotation.set(Math.PI / 2, spin.current, 0); });
    doors.current.forEach(d => { if (d) d.position.x = THREE.MathUtils.lerp(d.position.x, (d.userData.closedX as number) + (st.halted ? 1.3 : 0), 1 - Math.exp(-dt * 3)); });
    const dPlayer = Math.hypot(playerPos.x - head.x, playerPos.z - head.z); if (dPlayer < 140 && !st.halted && performance.now() - hornAt.current > 25000) { hornAt.current = performance.now(); sfx.trainHorn(); } });
  if (line.length < 2) return null;
  return <group ref={g}>
    {colors.map((c, i) => <group key={i}>
      <mesh position={[0, 1.9, 0]} castShadow><boxGeometry args={[14, 3.2, 3]} /><meshStandardMaterial color={c} roughness={0.5} metalness={0.2} /></mesh>
      <mesh position={[0, 3.55, 0]}><boxGeometry args={[14.2, 0.3, 3.1]} /><meshStandardMaterial color="#bfc4cc" /></mesh>
      <mesh position={[0, 2.05, 0]}><boxGeometry args={[14.05, 0.9, 3.05]} /><meshStandardMaterial color="#8fd0ff" metalness={0.8} roughness={0.1} /></mesh>
      <mesh position={[0, 1.0, 0]}><boxGeometry args={[14.05, 0.18, 3.05]} /><meshStandardMaterial color="#f2b134" /></mesh>
      {[-5.5, 5.5].map((dx, j) => <mesh key={dx} userData={{ closedX: dx }} ref={el => { if (el) doors.current[i*2+j] = el; }} position={[dx, 1.5, 1.53]}><boxGeometry args={[1.2, 2.2, 0.06]} /><meshStandardMaterial color="#0b3d91" /></mesh>)}
      {[-5, 5].map((dx, ax) => [-1.2, 1.2].map((dz, side) => <mesh key={dx + "_" + dz} ref={el => { if (el) wheels.current[i*4+ax*2+side] = el; }} position={[dx, 0.45, dz]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.45, 0.45, 0.2, 14]} /><meshStandardMaterial color="#222" /></mesh>))}
      {i === 0 && <><mesh position={[7.1, 1.3, 0]}><boxGeometry args={[0.3, 2.2, 2.8]} /><meshStandardMaterial color="#c8102e" /></mesh><mesh position={[7.2, 1.2, 0]}><sphereGeometry args={[0.25]} /><meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={2} /></mesh></>}
    </group>)}
  </group>;
}

export function Crossing({ p, yaw, w, geo }: { p: [number, number]; yaw: number; w: number; geo: GeoData }) {
  const line = useMemo(() => mainLine(geo), [geo]); const cum = useMemo(() => cumulative(line), [line]);
  const myS = useMemo(() => { let best = 0, bd = Infinity; for (let i = 0; i < line.length; i++) { const d = Math.hypot(line[i][0] - p[0], line[i][1] - p[1]); if (d < bd) { bd = d; best = i; } } return bd < 40 ? cum[best] : -1; }, [line, cum, p]);
  const gates = useRef<THREE.Group[]>([]); const lamps = useRef<THREE.Mesh[]>([]); const ang = useRef(Math.PI / 2 - 0.05); const bell = useRef(0); const closed = useRef(false); const lastBell = useRef(0);
  useFrame((_, dt) => { let near = false; if (myS >= 0) { const st = trainState(geo, line, cum, renderWorldTime.v); if (st) near = Math.abs(st.s - myS) < 160; }
    closed.current = near; const target = near ? 0 : Math.PI / 2 - 0.05; ang.current += (target - ang.current) * (1 - Math.exp(-dt * 1.6)); gates.current.forEach(g => { if (g) g.rotation.z = ang.current; });
    bell.current += dt; const blink = Math.floor(bell.current * 2) % 2 === 0; lamps.current.forEach((m, i) => { if (m) (m.material as THREE.MeshStandardMaterial).emissiveIntensity = near ? (blink === (i % 2 === 0) ? 2.5 : 0.1) : 0; });
    if (near && Math.hypot(playerPos.x - p[0], playerPos.z - p[1]) < 60 && performance.now() - lastBell.current > 1000) { lastBell.current = performance.now(); sfx.crossingBell(); } });
  const post = (side: 1 | -1) => (
    <group key={side} position={[(w / 2 + 1.2) * side, 0, -side * 6]}>
      <mesh position={[0, 1.4, 0]}><boxGeometry args={[0.3, 2.8, 0.3]} /><meshStandardMaterial color="#e9e4d4" /></mesh>
      <mesh position={[0, 2.5, 0.2]}><boxGeometry args={[0.45, 0.9, 0.12]} /><meshStandardMaterial color="#1a1a1c" /></mesh>
      {[0, 1].map(k => <mesh key={k} ref={el => { if (el) lamps.current[k + (side === 1 ? 0 : 2)] = el; }} position={[k ? 0.12 : -0.12, 2.5, 0.28]}><sphereGeometry args={[0.07]} /><meshStandardMaterial color="#5a0b16" emissive="#ff2b3a" emissiveIntensity={0} /></mesh>)}
      <group ref={el => { if (el) gates.current[side === 1 ? 0 : 1] = el; }} position={[0, 1.1, 0]} rotation={[0, side === 1 ? Math.PI : 0, Math.PI / 2 - 0.05]}>
        <mesh position={[(w / 2 + 0.6) / 2, 0, 0]}><boxGeometry args={[w / 2 + 0.6, 0.12, 0.08]} /><meshStandardMaterial color="#fff" /></mesh>
        {Array.from({ length: Math.ceil((w / 2 + 0.6) / 1.2) }, (_, i) => <mesh key={i} position={[0.6 + i * 1.2, 0, 0.01]}><boxGeometry args={[0.6, 0.13, 0.09]} /><meshStandardMaterial color="#c8102e" /></mesh>)}
      </group>
      <mesh position={[0, 3.4, 0]}><boxGeometry args={[1.2, 0.9, 0.05]} /><meshStandardMaterial color="#f2b134" /></mesh>
    </group>);
  return <group position={[p[0], 0, p[1]]} rotation={[0, yaw, 0]}>
    {post(1)}{post(-1)}
    <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w + 2, 5.4]} /><meshStandardMaterial color="#3d3d42" /></mesh>
    {[-1, 1].map(s => <mesh key={s} position={[0, 0.08, s * 3.8]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[w + 2, 0.5]} /><meshBasicMaterial color="#f2e9c9" /></mesh>)}
    {/* closed barrier physically blocks the road (collider toggles with the gate) */}
    <GateCollider w={w} closedRef={closed} />
  </group>;
}
function GateCollider({ w, closedRef }: { w: number; closedRef: React.RefObject<boolean> }) {
  const [on, setOn] = useStateSafe(false); useFrame(() => { if (closedRef.current !== on) setOn(!!closedRef.current); });
  return on ? <RigidBody type="fixed" colliders={false}>{[-1, 1].map(s => <CuboidCollider key={s} args={[w / 2 + 1, 1, 0.15]} position={[0, 1, s * 6]} />)}</RigidBody> : null;
}
import { useState } from "react";
function useStateSafe<T>(v: T) { return useState(v); }
