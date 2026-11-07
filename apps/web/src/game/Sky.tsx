"use client";
/** Day/night cycle driven by the server's world clock (0..1). Sun/moon, sky colour, fog, ambient. */
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "../state/store";
import { playerPos } from "./Player";

const DAY = new THREE.Color("#8fc8ff"), DUSK = new THREE.Color("#f08a4b"), NIGHT = new THREE.Color("#0b1026");
export function Sky() {
  const sun = useRef<THREE.DirectionalLight>(null); const amb = useRef<THREE.AmbientLight>(null); const hemi = useRef<THREE.HemisphereLight>(null); const { scene } = useThree();
  const target = useRef(new THREE.Object3D()); const quality = useStore(s => s.settings.quality);
  useFrame(() => {
    const t = useStore.getState().worldTime; const a = t * Math.PI * 2 - Math.PI / 2; // 0.25 = noon
    const elev = Math.sin(a); const day = THREE.MathUtils.clamp(elev * 2 + 0.3, 0, 1); const dusk = Math.exp(-((elev - 0.05) ** 2) / 0.02);
    const col = NIGHT.clone().lerp(DAY, day).lerp(DUSK, dusk * 0.6);
    scene.background = col; (scene.fog as THREE.Fog | null)?.color.copy(col);
    if (sun.current) { sun.current.position.set(playerPos.x + Math.cos(a) * 120, Math.max(5, elev * 150), playerPos.z + 60); sun.current.intensity = 0.2 + day * 2.2; sun.current.color.set(elev > 0.2 ? "#fff6e0" : "#ffb070"); target.current.position.copy(playerPos); sun.current.target = target.current; }
    if (amb.current) amb.current.intensity = 0.15 + day * 0.45;
    if (hemi.current) hemi.current.intensity = 0.2 + day * 0.5;
  });
  return <>
    <fog attach="fog" args={["#8fc8ff", 60, quality === "low" ? 180 : 320]} />
    <ambientLight ref={amb} intensity={0.5} />
    <hemisphereLight ref={hemi} args={["#bcd8ff", "#6b5a3a", 0.6]} />
    <directionalLight ref={sun} castShadow={quality !== "low"} intensity={2} shadow-mapSize={quality === "high" ? [2048, 2048] : [1024, 1024]} shadow-camera-left={-60} shadow-camera-right={60} shadow-camera-top={60} shadow-camera-bottom={-60} shadow-camera-far={400} shadow-bias={-0.0005} />
    <primitive object={target.current} />
    <Stars />
  </>;
}
function Stars() {
  const t = useStore(s => s.worldTime); const night = t < 0.22 || t > 0.78;
  const geo = useRef<THREE.BufferGeometry | null>(null);
  if (!geo.current) { const g = new THREE.BufferGeometry(); const n = 600; const arr = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.5; arr[i * 3] = Math.cos(th) * Math.cos(ph) * 900; arr[i * 3 + 1] = Math.sin(ph) * 900 + 50; arr[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * 900; } g.setAttribute("position", new THREE.BufferAttribute(arr, 3)); geo.current = g; }
  return <points geometry={geo.current} visible={night} position={[playerPos.x, 0, playerPos.z]}><pointsMaterial color="#fff" size={2} sizeAttenuation={false} /></points>;
}
