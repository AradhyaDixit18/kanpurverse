"use client";
/** Procedural Kanpur-inspired district: roads, instanced buildings with signs, landmarks, lake, ghat, trees, street lights. Static colliders via Rapier. */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { Text as DreiText } from "@react-three/drei";
const FONT = "/fonts/NotoSansDevanagari-400.woff";
const Text = (props: React.ComponentProps<typeof DreiText>) => <DreiText font={FONT} {...props} />;
import { ROADS, LANDMARKS, generateBuildings, WORLD_SIZE, type Building } from "@kanpurverse/shared";
import { useStore } from "../state/store";

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
      <Furniture />
      <WorldBounds />
    </group>
  );
}

function Ground() {
  const tex = useMemo(() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d")!; x.fillStyle = "#8f8d6c"; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${60 + Math.random() * 60},${70 + Math.random() * 50},${30 + Math.random() * 30},${0.12 + Math.random() * 0.2})`; x.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 3); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(90, 90); t.colorSpace = THREE.SRGBColorSpace; return t; }, []);
  return (
    <RigidBody type="fixed" colliders={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}><planeGeometry args={[WORLD_SIZE + 400, WORLD_SIZE + 400]} /><meshStandardMaterial map={tex} roughness={1} /></mesh>
      <CuboidCollider args={[WORLD_SIZE, 0.5, WORLD_SIZE]} position={[0, -0.5, 0]} />
    </RigidBody>
  );
}

const asphaltTex = (() => { let t: THREE.Texture | null = null; return () => { if (t) return t; const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d")!; x.fillStyle = "#3b3b40"; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 1800; i++) { x.fillStyle = `rgba(${40 + Math.random() * 50},${40 + Math.random() * 50},${44 + Math.random() * 50},0.35)`; x.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 1.5); } t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; }; })();
const paveTex = (() => { let t: THREE.Texture | null = null; return () => { if (t) return t; const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d")!; x.fillStyle = "#a39c8e"; x.fillRect(0, 0, 64, 64); x.strokeStyle = "#8a8275"; x.lineWidth = 2; x.strokeRect(1, 1, 30, 30); x.strokeRect(33, 1, 30, 30); x.strokeRect(1, 33, 30, 30); x.strokeRect(33, 33, 30, 30); t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; }; })();

function Road({ a, b, w, name }: { a: [number, number]; b: [number, number]; w: number; name?: string }) {
  const horizontal = a[1] === b[1]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
  const dashes = useMemo(() => { const n = Math.floor(len / 8); return Array.from({ length: n }, (_, i) => -len / 2 + 4 + i * 8); }, [len]);
  const road = useMemo(() => { const t = asphaltTex().clone(); t.needsUpdate = true; t.repeat.set(len / 6, w / 6); return t; }, [len, w]);
  const pave = useMemo(() => { const t = paveTex().clone(); t.needsUpdate = true; t.repeat.set(len / 2, 1.5); return t; }, [len]);
  // zebra crossings at every intersection with a crossing road
  const crossings = useMemo(() => ROADS.filter(r => (r.a[1] === r.b[1]) !== horizontal).map(r => horizontal ? r.a[0] - cx : r.a[1] - cz).filter(x => Math.abs(x) < len / 2 - 5), [horizontal, cx, cz, len]);
  return (
    <group position={[cx, 0.02, cz]} rotation={[0, horizontal ? 0 : Math.PI / 2, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[len, w]} /><meshStandardMaterial map={road} roughness={0.95} /></mesh>
      {[1, -1].map(sg => <group key={sg}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, sg * (w / 2 + 1.6)]} receiveShadow><planeGeometry args={[len, 3.2]} /><meshStandardMaterial map={pave} roughness={0.9} /></mesh>
        <mesh position={[0, 0.07, sg * (w / 2 + 0.08)]}><boxGeometry args={[len, 0.14, 0.18]} /><meshStandardMaterial color="#cfc8ba" /></mesh>{/* kerb */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, sg * (w / 2 - 0.3)]}><planeGeometry args={[len, 0.12]} /><meshBasicMaterial color="#d9d2b4" /></mesh>{/* edge line */}
      </group>)}
      {dashes.map((x, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, 0]}><planeGeometry args={[3.5, 0.22]} /><meshBasicMaterial color="#e8e2c6" /></mesh>)}
      {crossings.map((x, i) => <group key={"z" + i}>{Array.from({ length: Math.floor(w / 1.2) }, (_, k) => <mesh key={k} rotation={[-Math.PI / 2, 0, 0]} position={[x + (horizontal ? 0 : 0) + 9, 0.035, -w / 2 + 0.9 + k * 1.2]}><planeGeometry args={[2.2, 0.6]} /><meshBasicMaterial color="#efe9d2" /></mesh>)}</group>)}
      {name && <Text position={[-len / 2 + 20, 3.2, w / 2 + 2.2]} rotation={[0, Math.PI, 0]} fontSize={1.0} color="#ffffff" outlineWidth={0.05} outlineColor="#0b0b0d" anchorX="center">{name}</Text>}
      {name && <><mesh position={[-len / 2 + 20, 1.6, w / 2 + 2.2]}><cylinderGeometry args={[0.05, 0.06, 3.2]} /><meshStandardMaterial color="#2e5e3a" /></mesh><mesh position={[-len / 2 + 20, 3.2, w / 2 + 2.2]}><boxGeometry args={[7.5, 1.3, 0.06]} /><meshStandardMaterial color="#1f6f45" /></mesh></>}
    </group>
  );
}

/** Per-building facade texture: window grid by floors, ground-floor shutters/shopfront, AC units, grime. Cached by key. */
const facadeCache = new Map<string, THREE.Texture>();
function facadeTexture(style: number, floors: number, cols: number, shop: boolean): THREE.Texture {
  const key = `${style}-${floors}-${cols}-${shop ? 1 : 0}`; const hit = facadeCache.get(key); if (hit) return hit;
  const W = 64 * cols, H = 48 * floors; const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d")!;
  const base = ["#d9c9b0", "#e8d8c3", "#c9b8a3", "#bfb3a6", "#e3c9a6"][style]; x.fillStyle = base; x.fillRect(0, 0, W, H);
  for (let i = 0; i < W * H / 40; i++) { x.fillStyle = `rgba(60,40,20,${Math.random() * 0.08})`; x.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
  for (let f = 0; f < floors; f++) { const y0 = H - (f + 1) * 48; // floor f from ground
    x.fillStyle = "rgba(0,0,0,0.12)"; x.fillRect(0, y0 + 46, W, 2); // slab line
    for (let k = 0; k < cols; k++) { const x0 = k * 64;
      if (f === 0 && shop) { x.fillStyle = ["#c8102e", "#1a3c8c", "#2e8b57", "#7b2cbf", "#f2b134"][(k + style) % 5]; x.fillRect(x0 + 4, y0 + 2, 56, 12); x.fillStyle = "#6b6f7a"; x.fillRect(x0 + 8, y0 + 16, 48, 30); x.fillStyle = "rgba(255,255,255,0.08)"; for (let s = 0; s < 6; s++) x.fillRect(x0 + 8, y0 + 18 + s * 5, 48, 1); }
      else { x.fillStyle = "#2b3550"; x.fillRect(x0 + 16, y0 + 10, 32, 26); x.fillStyle = "rgba(140,190,255,0.35)"; x.fillRect(x0 + 18, y0 + 12, 13, 10); x.fillStyle = "#e9e2d2"; x.fillRect(x0 + 14, y0 + 36, 36, 3); x.fillStyle = base; x.fillRect(x0 + 31, y0 + 10, 2, 26);
        if ((k * 7 + f * 3 + style) % 5 === 0) { x.fillStyle = "#cfd3d8"; x.fillRect(x0 + 50, y0 + 20, 10, 8); x.fillStyle = "#777"; x.fillRect(x0 + 52, y0 + 22, 6, 4); } // AC unit
        if ((k + f) % 3 === 1 && f > 0) { x.fillStyle = "rgba(0,0,0,0.18)"; x.fillRect(x0 + 10, y0 + 38, 44, 8); x.fillStyle = "#8a7a66"; x.fillRect(x0 + 10, y0 + 40, 44, 2); } // balcony rail
      } } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; facadeCache.set(key, t); return t;
}

function Buildings({ list }: { list: Building[] }) {
  const items = useMemo(() => list.map(b => { const floors = Math.max(2, Math.round(b.h / 3.2)); const cols = Math.max(2, Math.round(b.w / 4)); const shop = !!b.sign || b.style % 2 === 0;
    const front = facadeTexture(b.style, floors, cols, shop); const side = facadeTexture(b.style, floors, Math.max(2, Math.round(b.d / 4)), false);
    const roof = new THREE.MeshStandardMaterial({ color: 0x7a736a, roughness: 1 }); const mf = new THREE.MeshStandardMaterial({ map: front, roughness: 0.9 }); const ms = new THREE.MeshStandardMaterial({ map: side, roughness: 0.9 });
    return { b, mats: [ms, ms, roof, roof, mf, mf] as THREE.Material[], floors }; }), [list]);
  return (
    <group>
      {items.map(({ b, mats, floors }, i) => <group key={i} position={[b.p[0], 0, b.p[1]]}>
        <mesh position={[0, b.h / 2, 0]} material={mats} castShadow receiveShadow><boxGeometry args={[b.w, b.h, b.d]} /></mesh>
        <mesh position={[0, b.h + 0.3, 0]}><boxGeometry args={[b.w + 0.3, 0.6, b.d + 0.3]} /><meshStandardMaterial color="#b9ad99" /></mesh>{/* parapet */}
        {i % 2 === 0 && <mesh position={[b.w * 0.25, b.h + 1.1, -b.d * 0.2]}><cylinderGeometry args={[0.7, 0.7, 1.2, 10]} /><meshStandardMaterial color="#111" /></mesh>}{/* water tank */}
        {i % 3 === 0 && <mesh position={[-b.w * 0.25, b.h + 0.9, b.d * 0.2]}><boxGeometry args={[1.6, 0.6, 1.2]} /><meshStandardMaterial color="#6a7280" /></mesh>}
        {b.sign && <mesh position={[0, 3.1, b.p[1] > 0 ? -b.d / 2 - 0.6 : b.d / 2 + 0.6]} rotation={[0.25 * (b.p[1] > 0 ? -1 : 1), 0, 0]}><boxGeometry args={[Math.min(b.w - 1, 8), 0.06, 1.4]} /><meshStandardMaterial color={["#c8102e", "#2e8b57", "#f2b134", "#1a3c8c"][floors % 4]} /></mesh>}{/* awning */}
      </group>)}
      <RigidBody type="fixed" colliders={false}>
        {list.map((b, i) => <CuboidCollider key={i} args={[b.w / 2, b.h / 2, b.d / 2]} position={[b.p[0], b.h / 2, b.p[1]]} />)}
      </RigidBody>
    </group>
  );
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
      case "lake": return <group key={l.id}><Water position={[l.p[0], 0.05, l.p[1]]} shape="circle" size={l.r} color="#2b6b8c" />
        <mesh position={[l.p[0], 0.04, l.p[1]]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[l.r, l.r + 2.5, 48]} /><meshStandardMaterial color="#c9b79c" /></mesh>{/* promenade */}
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
      case "ghat": return <group key={l.id}><Water position={[0, 0.02, -300]} shape="plane" size={800} depth={120} color="#3a7f9f" />
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

function Furniture() {
  const spots = useMemo(() => { const out: { p: [number, number]; r: number; kind: "bench" | "stall" | "bin" }[] = [];
    for (const l of LANDMARKS) if (l.kind === "park") for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; out.push({ p: [l.p[0] + Math.cos(a) * (l.r - 6), l.p[1] + Math.sin(a) * (l.r - 6)], r: -a + Math.PI / 2, kind: "bench" }); }
    for (const r of ROADS) { const len = Math.hypot(r.b[0] - r.a[0], r.b[1] - r.a[1]); for (let d = 40; d < len; d += 70) { const x = r.a[0] + (r.b[0] - r.a[0]) * d / len, z = r.a[1] + (r.b[1] - r.a[1]) * d / len; const h = r.a[1] === r.b[1]; out.push({ p: h ? [x, z - r.w / 2 - 2.4] : [x - r.w / 2 - 2.4, z], r: h ? 0 : Math.PI / 2, kind: d % 140 === 40 ? "stall" : "bin" }); } }
    return out; }, []);
  return <group>{spots.map((s, i) => <group key={i} position={[s.p[0], 0, s.p[1]]} rotation={[0, s.r, 0]}>
    {s.kind === "bench" && <><mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[1.8, 0.08, 0.5]} /><meshStandardMaterial color="#8b5a2b" /></mesh><mesh position={[0, 0.75, -0.22]}><boxGeometry args={[1.8, 0.5, 0.06]} /><meshStandardMaterial color="#8b5a2b" /></mesh>{[-0.7, 0.7].map(x => <mesh key={x} position={[x, 0.22, 0]}><boxGeometry args={[0.08, 0.45, 0.45]} /><meshStandardMaterial color="#333" /></mesh>)}</>}
    {s.kind === "bin" && <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.28, 0.24, 0.9, 10]} /><meshStandardMaterial color="#2e7d4f" /></mesh>}
    {s.kind === "stall" && <><mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[1.8, 1, 1]} /><meshStandardMaterial color="#5a7fb8" /></mesh><mesh position={[0, 1.95, 0]}><boxGeometry args={[2.2, 0.06, 1.6]} /><meshStandardMaterial color="#f2b134" /></mesh>{[-0.9, 0.9].map(x => <mesh key={x} position={[x, 1.45, 0.6]}><cylinderGeometry args={[0.03, 0.03, 1.1]} /><meshStandardMaterial color="#333" /></mesh>)}{[-0.7, 0.7].map(x => <mesh key={x} position={[x, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.2, 0.2, 0.1, 10]} /><meshStandardMaterial color="#111" /></mesh>)}</>}
  </group>)}</group>;
}

/** Animated water: scrolling procedural ripple normal map on a reflective standard material. */
function Water({ position, shape, size, depth = size, color }: { position: [number, number, number]; shape: "circle" | "plane"; size: number; depth?: number; color: string }) {
  const tex = useMemo(() => { const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d")!; x.fillStyle = "#8080ff"; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 900; i++) { const r = 2 + Math.random() * 6; const g = x.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, `rgba(${110 + Math.random() * 40},${110 + Math.random() * 40},255,0.5)`); g.addColorStop(1, "rgba(128,128,255,0)"); x.save(); x.translate(Math.random() * 128, Math.random() * 128); x.fillStyle = g; x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.fill(); x.restore(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(size / 10, depth / 10); return t; }, [size, depth]);
  const tex2 = useMemo(() => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(size / 16, depth / 16); return t; }, [tex, size, depth]);
  const m = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((_, dt) => { tex.offset.x += dt * 0.02; tex.offset.y += dt * 0.013; tex2.offset.x -= dt * 0.01; });
  return <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>{shape === "circle" ? <circleGeometry args={[size, 48]} /> : <planeGeometry args={[size, depth]} />}<meshStandardMaterial ref={m} color={color} roughness={0.12} metalness={0.55} normalMap={tex} normalScale={new THREE.Vector2(0.35, 0.35)} transparent opacity={0.94} /></mesh>;
}
