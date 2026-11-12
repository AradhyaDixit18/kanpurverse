"use client";
/**
 * Real-time main-menu backdrop rendered with the game's own assets: Kanupriya (rigged, idle) beside a parked
 * hatchback on a Mall Road kerb at golden hour, a Kanpur skyline (clock tower, temple shikhara, domes, apartment
 * blocks, water tank), street lamps that glow, passing auto-rickshaw, drifting birds, and a slow cinematic dolly.
 */
import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HumanAvatar } from "../game/HumanAvatar";
import { VehicleMesh } from "../game/Vehicles";
import { PROTAGONIST_LOOK, useStore } from "../state/store";
import { readSoloSave } from "../state/soloSave";
import type { Outfit } from "@kanpurverse/shared";

const skyVert = `varying vec3 vP; void main(){ vP = (modelMatrix * vec4(position,1.)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP,1.); }`;
const skyFrag = `varying vec3 vP; void main(){ vec3 d = normalize(vP - cameraPosition); float h = clamp(d.y*1.6+0.05,0.,1.); vec3 top = vec3(.16,.13,.33), mid = vec3(.95,.48,.27), low = vec3(1.,.78,.45);
  vec3 c = mix(low, mid, smoothstep(0.,.25,h)); c = mix(c, top, smoothstep(.25,1.,h)); float sun = pow(max(dot(d, normalize(vec3(-.55,.12,-1.))),0.), 300.); c += vec3(1.,.85,.6)*sun*3. + vec3(1.,.5,.2)*pow(max(dot(d, normalize(vec3(-.55,.12,-1.))),0.),8.)*.35; gl_FragColor = vec4(c,1.); }`;

function Skyline() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x3a2a35, roughness: 1 }), []); const lit = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xffd28a, emissive: 0xffb860, emissiveIntensity: 1.6 }), []);
  const blocks = useMemo(() => { const r = (i: number) => (Math.sin(i * 91.7) * 43758.5) % 1; return Array.from({ length: 46 }, (_, i) => ({ x: -90 + i * 4 + Math.abs(r(i)) * 2, h: 6 + Math.abs(r(i + 7)) * 16, w: 3 + Math.abs(r(i + 3)) * 3, z: -60 - Math.abs(r(i + 11)) * 25 })); }, []);
  return <group>
    {blocks.map((b, i) => <group key={i} position={[b.x, b.h / 2, b.z]}><mesh material={mat}><boxGeometry args={[b.w, b.h, 4]} /></mesh>{Array.from({ length: Math.floor(b.h / 3) }, (_, k) => (i * 7 + k) % 3 === 0 ? <mesh key={k} position={[0, -b.h / 2 + 2 + k * 3, 2.01]} material={lit}><planeGeometry args={[0.8, 0.9]} /></mesh> : null)}</group>)}
    <group position={[-22, 0, -48]}><mesh position={[0, 11, 0]} material={mat}><boxGeometry args={[4, 22, 4]} /></mesh><mesh position={[0, 23.5, 0]} material={mat}><coneGeometry args={[2.8, 5, 4]} /></mesh><mesh position={[0, 19, 2.05]} material={lit}><circleGeometry args={[1.1, 24]} /></mesh></group>
    <group position={[24, 0, -55]}><mesh position={[0, 6, 0]} material={mat}><boxGeometry args={[9, 12, 7]} /></mesh><mesh position={[0, 17, 0]} material={mat}><coneGeometry args={[3.6, 12, 8]} /></mesh><mesh position={[0, 24, 0]} material={lit}><sphereGeometry args={[0.4]} /></mesh></group>
    <group position={[48, 0, -66]}><mesh position={[0, 8, 0]} material={mat}><boxGeometry args={[12, 16, 8]} /></mesh>{[-3.5, 0, 3.5].map(x => <mesh key={x} position={[x, 17.5, 0]} material={mat}><sphereGeometry args={[x ? 1.8 : 2.8, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>)}</group>
    <group position={[-48, 0, -58]}><mesh position={[0, 9, 0]} material={mat}><cylinderGeometry args={[0.6, 0.8, 18, 8]} /></mesh><mesh position={[0, 19.5, 0]} material={mat}><cylinderGeometry args={[3.4, 2.6, 3, 16]} /></mesh></group>
  </group>;
}
function Lamps() { const head = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffc070, emissiveIntensity: 2.4 }), []);
  return <>{[-14, -2, 10, 22].map(x => <group key={x} position={[x, 0, -3.2]}><mesh position={[0, 3, 0]}><cylinderGeometry args={[0.07, 0.09, 6, 8]} /><meshStandardMaterial color="#2c2c30" /></mesh><mesh position={[0.6, 6, 0]}><boxGeometry args={[1.3, 0.08, 0.08]} /><meshStandardMaterial color="#2c2c30" /></mesh><mesh position={[1.2, 5.85, 0]} material={head}><boxGeometry args={[0.4, 0.14, 0.25]} /></mesh><pointLight position={[1.2, 5.4, 0]} intensity={14} distance={10} decay={1.6} color="#ffbf73" /></group>)}</>; }
function PassingAuto() { const g = useRef<THREE.Group>(null); useFrame(({ clock }) => { if (g.current) g.current.position.x = ((clock.elapsedTime * 7) % 90) - 45; });
  return <group ref={g} position={[0, 0.9, 4.5]} rotation={[0, Math.PI / 2, 0]}><VehicleMesh kind="auto" color={0x2e8b57} wheelSpin /></group>; }
function Birds() { const g = useRef<THREE.Group>(null); useFrame(({ clock }) => { if (!g.current) return; g.current.position.x = Math.sin(clock.elapsedTime * 0.07) * 30; g.current.children.forEach((b, i) => { b.rotation.z = Math.sin(clock.elapsedTime * 6 + i) * 0.5; }); });
  return <group ref={g} position={[0, 24, -40]}>{Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[i * 2.2 - 6, Math.sin(i) * 1.5, i % 2]}><boxGeometry args={[0.9, 0.04, 0.2]} /><meshBasicMaterial color="#2a1a20" /></mesh>)}</group>; }
function Rig() { useFrame(({ camera, clock }) => { const t = clock.elapsedTime; camera.position.set(5.5 + Math.sin(t * 0.06) * 2.2, 1.9 + Math.sin(t * 0.09) * 0.25, 8.5 + Math.cos(t * 0.05) * 1.2); camera.lookAt(-0.8, 1.35, 0); }); return null; }

export default function MenuScene() {
  const live = useStore(s => s.game.outfit); const outfit = useMemo(() => (readSoloSave()?.game?.outfit as Outfit | undefined) ?? live, [live]);
  return <Canvas className="menu-scene" shadows dpr={[1, 1.5]} camera={{ fov: 38, near: 0.3, far: 400, position: [6, 2, 9] }} gl={{ antialias: true, powerPreference: "high-performance" }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}>
    <mesh scale={300}><sphereGeometry args={[1, 32, 16]} /><shaderMaterial vertexShader={skyVert} fragmentShader={skyFrag} side={THREE.BackSide} depthWrite={false} /></mesh>
    <fog attach="fog" args={["#d98a63", 30, 120]} />
    <hemisphereLight args={["#ffd2a8", "#3a2a30", 0.7]} />
    <directionalLight position={[-14, 9, -18]} intensity={2.2} color="#ffb070" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-0.0004} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[400, 400]} /><meshStandardMaterial color="#3b3530" roughness={0.95} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 3]} receiveShadow><planeGeometry args={[200, 7]} /><meshStandardMaterial color="#2a2a2e" roughness={0.6} metalness={0.1} /></mesh>
    <mesh position={[0, 0.08, -1.3]} receiveShadow><boxGeometry args={[200, 0.16, 3.4]} /><meshStandardMaterial color="#8a8274" roughness={0.9} /></mesh>
    <Skyline /><Lamps /><Birds /><Rig />
    <Suspense fallback={null}>
      <group position={[-0.6, 0.16, -0.9]} rotation={[0, 0.5, 0]}><HumanAvatar appearance={PROTAGONIST_LOOK} anim="idle" protagonist outfit={outfit} /></group>
      <group position={[-4.2, 0.84, 1.2]} rotation={[0, Math.PI / 2 - 0.25, 0]}><VehicleMesh kind="hatchback" color={0xb3122e} /></group>
      <PassingAuto />
    </Suspense>
  </Canvas>;
}
