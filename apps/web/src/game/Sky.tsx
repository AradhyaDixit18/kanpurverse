"use client";
/** Day/night: gradient sky dome (shader), sun/moon discs, drifting clouds, fog + lights keyed to the server world clock. */
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "../state/store";
import { playerPos } from "./Player";

const K = {
  night: { top: "#060a1c", horizon: "#1a2240", fog: "#141a30", sun: "#8fa3ff", amb: 0.18 },
  dawn: { top: "#3b4f8a", horizon: "#f3a06b", fog: "#d9a07c", sun: "#ffb27a", amb: 0.45 },
  day: { top: "#3d8bff", horizon: "#bfe0ff", fog: "#c8dcea", sun: "#fff4dc", amb: 0.7 },
  dusk: { top: "#2d3566", horizon: "#f07a3a", fog: "#d98a63", sun: "#ff9a4a", amb: 0.42 },
};
function phase(t: number) { // returns weights for night/dawn/day/dusk from world time 0..1
  const h = t * 24; const w = { night: 0, dawn: 0, day: 0, dusk: 0 };
  const tri = (c: number, r: number) => Math.max(0, 1 - Math.abs(((h - c + 36) % 24) - 12) / r);
  w.dawn = tri(6.3, 1.6); w.dusk = tri(18.2, 1.6); w.day = THREE.MathUtils.smoothstep(h, 5.5, 8) * (1 - THREE.MathUtils.smoothstep(h, 17, 19.5)); w.night = Math.max(0, 1 - w.dawn - w.dusk - w.day);
  const s = w.night + w.dawn + w.day + w.dusk; return { night: w.night / s, dawn: w.dawn / s, day: w.day / s, dusk: w.dusk / s };
}
const mix = (key: "top" | "horizon" | "fog" | "sun", w: ReturnType<typeof phase>, out: THREE.Color) => { out.set(0, 0, 0); for (const k of ["night", "dawn", "day", "dusk"] as const) out.add(new THREE.Color(K[k][key]).multiplyScalar(w[k])); return out; };

const skyVert = `varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const skyFrag = `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; uniform float sunGlow; uniform float stars; varying vec3 vWorld;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void main(){ vec3 d = normalize(vWorld - cameraPosition); float h = clamp(d.y, 0.0, 1.0); vec3 col = mix(horizon, top, pow(h, 0.55));
  float s = max(dot(d, sunDir), 0.0); col += sunColor * (pow(s, 240.0) * 1.2 + pow(s, 12.0) * 0.25 * sunGlow);
  if (stars > 0.0 && d.y > 0.02) { vec2 g = floor(d.xz / max(d.y, 0.05) * 60.0); float r = hash(g); float tw = step(0.985, r) * (0.5 + 0.5 * sin(r * 100.0)); col += vec3(tw) * stars * d.y; }
  gl_FragColor = vec4(col, 1.0); }`;

export function Sky() {
  const sun = useRef<THREE.DirectionalLight>(null); const amb = useRef<THREE.AmbientLight>(null); const hemi = useRef<THREE.HemisphereLight>(null); const { scene } = useThree();
  const target = useRef(new THREE.Object3D()); const quality = useStore(s => s.settings.quality); const dome = useRef<THREE.Mesh>(null); const sunMesh = useRef<THREE.Mesh>(null); const moon = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({ top: { value: new THREE.Color(K.day.top) }, horizon: { value: new THREE.Color(K.day.horizon) }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunColor: { value: new THREE.Color(K.day.sun) }, sunGlow: { value: 1 }, stars: { value: 0 } }), []);
  const tmp = useMemo(() => ({ a: new THREE.Color(), b: new THREE.Color(), c: new THREE.Color() }), []);
  const clouds = useMemo(() => Array.from({ length: quality === "low" ? 10 : 22 }, (_, i) => ({ x: (i * 97) % 700 - 350, z: (i * 61) % 700 - 350, y: 120 + (i * 13) % 40, s: 28 + (i * 7) % 30, o: 0.5 + (i % 3) * 0.12 })), [quality]);

  useFrame(() => {
    const t = useStore.getState().worldTime; const a = t * Math.PI * 2 - Math.PI / 2; const elev = Math.sin(a); const w = phase(t);
    const dir = new THREE.Vector3(Math.cos(a) * 0.8, Math.max(-0.3, elev), 0.5).normalize();
    uniforms.sunDir.value.copy(dir); mix("top", w, uniforms.top.value); mix("horizon", w, uniforms.horizon.value); mix("sun", w, uniforms.sunColor.value); uniforms.sunGlow.value = w.dawn + w.dusk + 0.4 * w.day; uniforms.stars.value = w.night * 0.9;
    const fogC = mix("fog", w, tmp.c); (scene.fog as THREE.Fog | null)?.color.copy(fogC);
    const dayLight = THREE.MathUtils.clamp(elev * 1.6 + 0.25, 0, 1);
    if (sun.current) { sun.current.position.set(playerPos.x + dir.x * 140, Math.max(6, dir.y * 160), playerPos.z + dir.z * 140); sun.current.intensity = 0.25 + dayLight * 2.6; sun.current.color.copy(uniforms.sunColor.value); target.current.position.copy(playerPos); sun.current.target = target.current; }
    if (amb.current) amb.current.intensity = K.night.amb * w.night + K.dawn.amb * w.dawn + K.day.amb * w.day + K.dusk.amb * w.dusk;
    if (hemi.current) { hemi.current.intensity = 0.25 + dayLight * 0.55; hemi.current.color.copy(uniforms.top.value); }
    if (dome.current) dome.current.position.copy(playerPos);
    if (sunMesh.current) { sunMesh.current.position.set(playerPos.x + dir.x * 600, dir.y * 600, playerPos.z + dir.z * 600); sunMesh.current.visible = dir.y > -0.05; }
    if (moon.current) { moon.current.position.set(playerPos.x - dir.x * 600, -dir.y * 600 + 80, playerPos.z - dir.z * 600); moon.current.visible = w.night > 0.2; }
  });
  return <>
    <fog attach="fog" args={["#c8dcea", quality === "low" ? 70 : 110, quality === "low" ? 220 : 380]} />
    <mesh ref={dome} frustumCulled={false}><sphereGeometry args={[800, 32, 16]} /><shaderMaterial uniforms={uniforms} vertexShader={skyVert} fragmentShader={skyFrag} side={THREE.BackSide} depthWrite={false} fog={false} /></mesh>
    <mesh ref={sunMesh}><sphereGeometry args={[18, 16, 16]} /><meshBasicMaterial color="#fff2cc" fog={false} /></mesh>
    <mesh ref={moon}><sphereGeometry args={[12, 16, 16]} /><meshBasicMaterial color="#e9eefc" fog={false} /></mesh>
    <Clouds items={clouds} />
    <ambientLight ref={amb} intensity={0.5} />
    <hemisphereLight ref={hemi} args={["#bcd8ff", "#7a6a4a", 0.6]} />
    <directionalLight ref={sun} castShadow={quality !== "low"} intensity={2} shadow-mapSize={quality === "high" ? [2048, 2048] : [1024, 1024]} shadow-camera-left={-70} shadow-camera-right={70} shadow-camera-top={70} shadow-camera-bottom={-70} shadow-camera-far={450} shadow-bias={-0.0004} shadow-normalBias={0.02} />
    <primitive object={target.current} />
  </>;
}

function Clouds({ items }: { items: { x: number; z: number; y: number; s: number; o: number }[] }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => { if (!g.current) return; g.current.position.x += dt * 1.2; if (g.current.position.x > 350) g.current.position.x = -350; const n = useStore.getState().worldTime; const night = n < 0.22 || n > 0.78; g.current.children.forEach(c => { const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial; m.color.set(night ? "#2a3150" : "#ffffff"); }); });
  return <group ref={g}>{items.map((c, i) => <mesh key={i} position={[c.x, c.y, c.z]} scale={[c.s, c.s * 0.35, c.s * 0.7]}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#ffffff" transparent opacity={c.o} roughness={1} flatShading /></mesh>)}</group>;
}
