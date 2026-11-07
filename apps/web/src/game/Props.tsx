"use client";
/** Indian street dressing: electric poles with sagging wires, rooftop hoardings, festival bunting across streets, thela carts,
 * chai stalls, parked cycle-rickshaws, parked cycles, auto stand, temple bells. Deterministic placement along the road grid. */
import { useMemo } from "react";
import * as THREE from "three";
import { Text as DreiText } from "@react-three/drei";
import { ROADS, LANDMARKS, generateBuildings, RAIL_Z } from "@kanpurverse/shared";
import { useStore } from "../state/store";
const FONT = "/fonts/NotoSansDevanagari-400.woff";
const Text = (props: React.ComponentProps<typeof DreiText>) => <DreiText font={FONT} {...props} />;

const ADS: [string, string, string][] = [["ठग्गू के लड्डू", "Thaggu ke Laddu", "#c8102e"], ["कानपुर का स्वाद", "Kanpur ka Swaad", "#f2b134"], ["मोबाइल रिचार्ज", "Mobile Recharge", "#3d8bff"], ["बिग सेल 50% OFF", "Big Sale 50% OFF", "#7b2cbf"], ["Green Park Match", "Green Park Match", "#2e8b57"], ["नई सिम सिर्फ़ ₹99", "New SIM just ₹99", "#ff5a3c"], ["पान भंडार", "Paan Bhandar", "#1a3c8c"], ["चाय ₹10", "Chai ₹10", "#8b4513"]];
const seeded = (seed: number) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; };

export function Props() {
  const quality = useStore(s => s.settings.quality); const en = useStore(s => s.settings.lang === "english");
  const dense = quality !== "low";
  const poles = useMemo(() => { const out: { p: [number, number]; rot: number }[] = []; for (const r of ROADS) { const h = r.a[1] === r.b[1]; const len = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]); for (let d = 18; d < len; d += 36) { const x = r.a[0] + (r.b[0] - r.a[0]) * d / len, z = r.a[1] + (r.b[1] - r.a[1]) * d / len; if (Math.abs(z - RAIL_Z) < 8) continue; out.push({ p: h ? [x, z + r.w / 2 + 2.9] : [x + r.w / 2 + 2.9, z], rot: h ? 0 : Math.PI / 2 }); } } return out; }, []);
  const wires = useMemo(() => { const geo: THREE.BufferGeometry[] = []; for (const r of ROADS) { const h = r.a[1] === r.b[1]; const len = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]); const pts = poles.filter(p => h ? Math.abs(p.p[1] - (r.a[1] + r.w / 2 + 2.9)) < 0.01 : Math.abs(p.p[0] - (r.a[0] + r.w / 2 + 2.9)) < 0.01).sort((a, b) => h ? a.p[0] - b.p[0] : a.p[1] - b.p[1]); void len;
    for (let i = 0; i + 1 < pts.length; i++) for (const dy of [0, -0.35]) { const a = pts[i].p, b = pts[i + 1].p; const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(a[0], 7.6 + dy, a[1]), new THREE.Vector3((a[0] + b[0]) / 2, 6.6 + dy, (a[1] + b[1]) / 2), new THREE.Vector3(b[0], 7.6 + dy, b[1])); geo.push(new THREE.BufferGeometry().setFromPoints(curve.getPoints(12))); } } return geo; }, [poles]);
  const buildings = useMemo(() => generateBuildings(7), []);
  const hoardings = useMemo(() => buildings.filter((_, i) => i % 3 === 0).slice(0, 14).map((b, i) => ({ b, ad: ADS[i % ADS.length] })), [buildings]);
  const bunting = useMemo(() => { const out: { a: [number, number, number]; b: [number, number, number]; colors: string[] }[] = []; const rnd = seeded(21); for (const r of ROADS.filter(r => r.a[1] === r.b[1]).slice(0, 3)) { for (let x = -200; x < 200; x += 60) { if (Math.abs(x) < 30 && r.a[1] === 0) continue; const cols = Array.from({ length: 18 }, () => ["#ff5a3c", "#ffd23f", "#2e8b57", "#3d8bff", "#fff", "#ff8fb1"][Math.floor(rnd() * 6)]); out.push({ a: [x, 6.2, r.a[1] - r.w / 2 - 1], b: [x, 6.2, r.a[1] + r.w / 2 + 1], colors: cols }); } } return out; }, []);
  const stalls = useMemo(() => { const out: { p: [number, number]; rot: number; kind: "thela" | "chai" | "rickshaw" | "cycle" | "cart" }[] = []; const rnd = seeded(5); for (const r of ROADS) { const h = r.a[1] === r.b[1]; const len = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]); for (let d = 30; d < len; d += 44) { const x = r.a[0] + (r.b[0] - r.a[0]) * d / len, z = r.a[1] + (r.b[1] - r.a[1]) * d / len; if (Math.abs(z - RAIL_Z) < 10) continue; if (LANDMARKS.some(l => (l.kind === "lake") && Math.hypot(l.p[0] - x, l.p[1] - z) < l.r + 6)) continue; const side = rnd() < 0.5 ? 1 : -1; const kinds = ["thela", "chai", "rickshaw", "cycle", "cart", "thela"] as const; out.push({ p: h ? [x, z + side * (r.w / 2 + 1.6)] : [x + side * (r.w / 2 + 1.6), z], rot: h ? 0 : Math.PI / 2, kind: kinds[Math.floor(rnd() * kinds.length)] }); } } return out; }, []);
  return <group>
    {/* electric poles + wires */}
    {poles.map((p, i) => <group key={"p" + i} position={[p.p[0], 0, p.p[1]]} rotation={[0, p.rot, 0]}>
      <mesh position={[0, 4, 0]} castShadow><boxGeometry args={[0.22, 8, 0.22]} /><meshStandardMaterial color="#6f6a63" /></mesh>
      <mesh position={[0, 7.6, 0]}><boxGeometry args={[1.4, 0.08, 0.08]} /><meshStandardMaterial color="#3a3a3a" /></mesh>
      <mesh position={[0, 7.25, 0]}><boxGeometry args={[1.2, 0.08, 0.08]} /><meshStandardMaterial color="#3a3a3a" /></mesh>
      {i % 4 === 0 && <mesh position={[0, 5.2, 0.3]}><boxGeometry args={[0.5, 0.7, 0.4]} /><meshStandardMaterial color="#8a8f96" /></mesh>}{/* transformer box */}
    </group>)}
    {dense && wires.map((g, i) => <line key={"w" + i}><primitive object={g} attach="geometry" /><lineBasicMaterial color="#1a1a1a" /></line>)}
    {/* rooftop hoardings */}
    {hoardings.map(({ b, ad }, i) => <group key={"h" + i} position={[b.p[0], b.h + 2.6, b.p[1] + (b.p[1] > 0 ? -b.d / 2 + 0.4 : b.d / 2 - 0.4)]} rotation={[0, b.p[1] > 0 ? Math.PI : 0, 0]}>
      <mesh castShadow><boxGeometry args={[Math.min(b.w - 1, 10), 3.4, 0.12]} /><meshStandardMaterial color={ad[2]} /></mesh>
      <mesh position={[0, 0, 0.07]}><planeGeometry args={[Math.min(b.w - 1, 10) - 0.4, 3]} /><meshStandardMaterial color="#fffaf0" /></mesh>
      <Text position={[0, 0.3, 0.1]} fontSize={0.9} color={ad[2]} anchorX="center" anchorY="middle" maxWidth={Math.min(b.w - 1, 10) - 0.8}>{en ? ad[1] : ad[0]}</Text>
      <Text position={[0, -0.9, 0.1]} fontSize={0.4} color="#555" anchorX="center" anchorY="middle">{en ? "Kanpur · since 1947" : "कानपुर · सन् 1947 से"}</Text>
      {[-1, 1].map(s => <mesh key={s} position={[s * (Math.min(b.w - 1, 10) / 2 - 0.3), -2.4, -0.2]}><boxGeometry args={[0.1, 2.2, 0.1]} /><meshStandardMaterial color="#444" /></mesh>)}
    </group>)}
    {/* bunting across streets */}
    {dense && bunting.map((bn, i) => <group key={"b" + i}>
      <line><bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array([...bn.a, bn.a[0], bn.a[1] - 0.5, (bn.a[2] + bn.b[2]) / 2, ...bn.b]), 3]} /></bufferGeometry><lineBasicMaterial color="#222" /></line>
      {bn.colors.map((c, k) => { const t = (k + 0.5) / bn.colors.length; const z = bn.a[2] + (bn.b[2] - bn.a[2]) * t; const y = bn.a[1] - 0.5 * Math.sin(t * Math.PI); return <mesh key={k} position={[bn.a[0], y - 0.3, z]} rotation={[0, Math.PI / 2, Math.PI]}><coneGeometry args={[0.22, 0.6, 3]} /><meshStandardMaterial color={c} side={THREE.DoubleSide} /></mesh>; })}
    </group>)}
    {/* stalls & carts */}
    {stalls.map((s, i) => <group key={"s" + i} position={[s.p[0], 0, s.p[1]]} rotation={[0, s.rot, 0]}><Stall kind={s.kind} seed={i} en={en} /></group>)}
    {/* auto stand board at Cafe Chowk */}
    <group position={[46, 0, 16]}><mesh position={[0, 1.6, 0]}><boxGeometry args={[0.08, 3.2, 0.08]} /><meshStandardMaterial color="#444" /></mesh><mesh position={[0, 3, 0]}><boxGeometry args={[2.4, 0.9, 0.06]} /><meshStandardMaterial color="#f2b134" /></mesh><Text position={[0, 3, 0.05]} fontSize={0.45} color="#111" anchorX="center" anchorY="middle">{en ? "AUTO STAND" : "ऑटो स्टैंड"}</Text></group>
  </group>;
}

function Stall({ kind, seed, en }: { kind: "thela" | "chai" | "rickshaw" | "cycle" | "cart"; seed: number; en: boolean }) {
  const rnd = seeded(seed + 1); const fruit = ["#ff8c00", "#e63946", "#ffd23f", "#4caf50", "#8e44ad"][seed % 5];
  if (kind === "chai") return <group>
    <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[2.2, 1, 1.1]} /><meshStandardMaterial color="#3b6ea5" /></mesh>
    <mesh position={[0, 1.12, 0]}><boxGeometry args={[2.3, 0.06, 1.2]} /><meshStandardMaterial color="#d9c7a0" /></mesh>
    <mesh position={[0.6, 1.3, 0.2]}><cylinderGeometry args={[0.18, 0.15, 0.3, 10]} /><meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.3} /></mesh>{/* kettle */}
    <mesh position={[-0.5, 1.22, 0.2]}><cylinderGeometry args={[0.25, 0.22, 0.14, 12]} /><meshStandardMaterial color="#1a1a1a" /></mesh>{/* stove */}
    {[-0.3, -0.1, 0.1].map(x => <mesh key={x} position={[x, 1.2, -0.3]}><cylinderGeometry args={[0.04, 0.03, 0.08, 8]} /><meshStandardMaterial color="#e8d8c3" /></mesh>)}{/* kulhads */}
    <mesh position={[0, 2.35, 0]}><boxGeometry args={[2.8, 0.06, 1.8]} /><meshStandardMaterial color={rnd() < 0.5 ? "#c8102e" : "#2e8b57"} /></mesh>
    {[-1.3, 1.3].map(x => <mesh key={x} position={[x, 1.7, 0.8]}><cylinderGeometry args={[0.03, 0.03, 1.3]} /><meshStandardMaterial color="#333" /></mesh>)}
    <mesh position={[0, 2.0, 0.92]}><boxGeometry args={[2.4, 0.5, 0.04]} /><meshStandardMaterial color="#fff8e1" /></mesh>
    <Text position={[0, 2.0, 0.95]} fontSize={0.28} color="#c8102e" anchorX="center" anchorY="middle">{en ? "Munna Tea Stall · chai ₹10" : "मुन्ना टी स्टॉल · चाय ₹10"}</Text>
    <mesh position={[1.6, 0.25, 0.4]}><boxGeometry args={[0.4, 0.5, 0.4]} /><meshStandardMaterial color="#c8102e" /></mesh>{/* plastic stool */}
    <mesh position={[-1.7, 0.25, 0.3]}><boxGeometry args={[0.4, 0.5, 0.4]} /><meshStandardMaterial color="#3d8bff" /></mesh>
  </group>;
  if (kind === "thela" || kind === "cart") return <group>
    <mesh position={[0, 0.75, 0]} castShadow><boxGeometry args={[1.8, 0.14, 1.0]} /><meshStandardMaterial color="#8b5a2b" /></mesh>
    {[-0.6, 0.6].map(x => <mesh key={x} position={[x, 0.42, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.42, 0.42, 0.08, 14]} /><meshStandardMaterial color="#222" /></mesh>)}
    <mesh position={[1.1, 0.75, 0]} rotation={[0, 0, 0.1]}><boxGeometry args={[0.8, 0.06, 0.08]} /><meshStandardMaterial color="#8b5a2b" /></mesh>
    {Array.from({ length: 10 }, (_, k) => <mesh key={k} position={[-0.6 + (k % 5) * 0.3, 0.95 + Math.floor(k / 5) * 0.15, -0.25 + Math.floor(k / 5) * 0.4]}><sphereGeometry args={[0.12, 8, 8]} /><meshStandardMaterial color={kind === "cart" ? "#4caf50" : fruit} /></mesh>)}
    <mesh position={[0, 1.85, 0]}><boxGeometry args={[2.2, 0.04, 1.4]} /><meshStandardMaterial color={rnd() < 0.5 ? "#3d8bff" : "#ffd23f"} side={THREE.DoubleSide} /></mesh>
    {[-1, 1].map(x => <mesh key={x} position={[x, 1.3, 0.6]}><cylinderGeometry args={[0.025, 0.025, 1.1]} /><meshStandardMaterial color="#333" /></mesh>)}
  </group>;
  if (kind === "rickshaw") return <group rotation={[0, rnd() * 0.6 - 0.3, 0]}>
    <mesh position={[0, 0.9, -0.3]} castShadow><boxGeometry args={[1.0, 0.5, 0.9]} /><meshStandardMaterial color="#1a3c8c" /></mesh>{/* seat */}
    <mesh position={[0, 1.35, -0.55]}><boxGeometry args={[1.0, 0.6, 0.1]} /><meshStandardMaterial color="#1a3c8c" /></mesh>
    <mesh position={[0, 1.9, -0.3]} rotation={[0.2, 0, 0]}><boxGeometry args={[1.1, 0.05, 1.0]} /><meshStandardMaterial color="#c8102e" /></mesh>{/* hood */}
    {[-0.55, 0.55].map(x => <mesh key={x} position={[x, 0.45, -0.3]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.45, 0.45, 0.05, 16]} /><meshStandardMaterial color="#222" /></mesh>)}
    <mesh position={[0, 0.4, 0.9]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.4, 0.4, 0.05, 16]} /><meshStandardMaterial color="#222" /></mesh>
    <mesh position={[0, 0.9, 0.55]} rotation={[0.3, 0, 0]}><cylinderGeometry args={[0.03, 0.03, 1.0]} /><meshStandardMaterial color="#555" /></mesh>
    <mesh position={[0, 1.3, 0.75]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.02, 0.02, 0.6]} /><meshStandardMaterial color="#555" /></mesh>
  </group>;
  return <group rotation={[0, rnd() * 0.5, 0]}>{/* cycle */}
    {[-0.5, 0.5].map(z => <mesh key={z} position={[0, 0.35, z]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.33, 0.03, 8, 20]} /><meshStandardMaterial color="#222" /></mesh>)}
    <mesh position={[0, 0.6, 0]} rotation={[0.6, 0, 0]}><cylinderGeometry args={[0.02, 0.02, 1.0]} /><meshStandardMaterial color="#1a3c8c" /></mesh>
    <mesh position={[0, 0.8, -0.1]}><boxGeometry args={[0.1, 0.06, 0.25]} /><meshStandardMaterial color="#111" /></mesh>
    <mesh position={[0, 0.85, 0.45]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.02, 0.02, 0.5]} /><meshStandardMaterial color="#555" /></mesh>
  </group>;
}
