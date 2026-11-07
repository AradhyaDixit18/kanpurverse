"use client";
/** Procedural low-poly humanoid built from primitives; animated by code (no external rigs). Used for players and NPCs. */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Appearance, AnimState } from "@kanpurverse/shared";

export const SKIN = [0xf1c9a5, 0xe0ac7e, 0xc68642, 0xa5673f, 0x8d5524, 0x5c3a21];
export const HAIR_COLORS = [0x1a1a1a, 0x3b2314, 0x6b3e1e, 0x8c8c8c, 0xb5121b];
export const TOPS = [0xc8102e, 0x3d8bff, 0xffffff, 0x2e8b57, 0xffd23f, 0xf2f2f2 /* kurta */, 0x1a3c8c /* jersey */, 0x2b2b2b /* jacket */];
export const BOTTOMS = [0x1c1d22, 0x2f4a7a, 0x6b6b6b, 0xd9c7a0, 0x3a3a3a, 0xffffff];
export const SHOES = [0x111111, 0xffffff, 0x8b4513, 0xc8102e];

export function Avatar({ appearance, anim, name, scale = 1, nameColor = "#fff" }: { appearance: Appearance; anim: AnimState; name?: string; scale?: number; nameColor?: string }) {
  const g = useRef<THREE.Group>(null); const lArm = useRef<THREE.Group>(null); const rArm = useRef<THREE.Group>(null); const lLeg = useRef<THREE.Group>(null); const rLeg = useRef<THREE.Group>(null); const body = useRef<THREE.Group>(null); const head = useRef<THREE.Group>(null);
  const t = useRef(Math.random() * 10);
  const appKey = JSON.stringify(appearance);
  const mats = useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({ color: SKIN[appearance.skin], roughness: 0.8 }),
    hair: new THREE.MeshStandardMaterial({ color: HAIR_COLORS[appearance.hairColor], roughness: 0.9 }),
    top: new THREE.MeshStandardMaterial({ color: TOPS[appearance.top], roughness: 0.7 }),
    bottom: new THREE.MeshStandardMaterial({ color: BOTTOMS[appearance.bottom], roughness: 0.8 }),
    shoe: new THREE.MeshStandardMaterial({ color: SHOES[appearance.shoes], roughness: 0.6 }),
    acc: new THREE.MeshStandardMaterial({ color: appearance.accessory === 1 ? 0x111111 : appearance.accessory === 2 ? 0xc8102e : 0xffd23f, roughness: 0.5 }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [appKey]);
  const female = appearance.body === "f";

  useFrame((_, dt) => {
    t.current += dt; const T = t.current;
    const set = (r: React.RefObject<THREE.Group | null>, x: number, z = 0) => { if (r.current) { r.current.rotation.x = x; r.current.rotation.z = z; } };
    const speed = anim === "walk" ? 6 : anim === "run" ? 9 : anim === "sprint" ? 12 : 0; const amp = anim === "walk" ? 0.6 : anim === "sprint" ? 1.1 : 0.9;
    if (body.current) body.current.position.y = 0; if (head.current) head.current.rotation.set(0, 0, 0);
    switch (anim) {
      case "walk": case "run": case "sprint": { const s = Math.sin(T * speed); set(lLeg, s * amp); set(rLeg, -s * amp); set(lArm, -s * amp * 0.8); set(rArm, s * amp * 0.8); if (body.current) body.current.position.y = Math.abs(Math.cos(T * speed)) * 0.05; break; }
      case "jump": case "fall": set(lLeg, -0.4); set(rLeg, 0.3); set(lArm, -2.6); set(rArm, -2.6); break;
      case "sit": case "drive": set(lLeg, -1.5); set(rLeg, -1.5); set(lArm, anim === "drive" ? -1.2 : -0.5); set(rArm, anim === "drive" ? -1.2 : -0.5); if (body.current) body.current.position.y = -0.35; break;
      case "wave": set(lArm, 0); set(rArm, -2.8, Math.sin(T * 8) * 0.4); set(lLeg, 0); set(rLeg, 0); break;
      case "dance": { set(lArm, -1.5 + Math.sin(T * 7) * 1, Math.sin(T * 7) * 0.6); set(rArm, -1.5 - Math.sin(T * 7) * 1, -Math.sin(T * 7) * 0.6); set(lLeg, Math.sin(T * 7) * 0.4); set(rLeg, -Math.sin(T * 7) * 0.4); if (body.current) { body.current.position.y = Math.abs(Math.sin(T * 7)) * 0.12; body.current.rotation.y = Math.sin(T * 3.5) * 0.3; } break; }
      case "laugh": set(lArm, -0.3); set(rArm, -0.3); if (head.current) head.current.rotation.x = -0.2 + Math.sin(T * 12) * 0.08; if (body.current) body.current.position.y = Math.abs(Math.sin(T * 12)) * 0.03; break;
      case "celebrate": set(lArm, -3, 0.3); set(rArm, -3, -0.3); if (body.current) body.current.position.y = Math.abs(Math.sin(T * 6)) * 0.25; set(lLeg, 0); set(rLeg, 0); break;
      case "highfive": set(rArm, -2.4, -0.5); set(lArm, 0); set(lLeg, 0); set(rLeg, 0); break;
      case "talk": set(lArm, -0.4 + Math.sin(T * 4) * 0.2); set(rArm, -0.3 + Math.cos(T * 3) * 0.2); set(lLeg, 0); set(rLeg, 0); if (head.current) head.current.rotation.y = Math.sin(T * 1.5) * 0.15; break;
      case "punch": set(rArm, -1.6 + Math.sin(T * 14) * 0.5); set(lArm, -1.2); break;
      default: { const b = Math.sin(T * 2) * 0.03; set(lArm, b); set(rArm, -b); set(lLeg, 0); set(rLeg, 0); if (body.current) body.current.position.y = Math.sin(T * 2) * 0.01; }
    }
  });

  return (
    <group ref={g} scale={scale}>
      <group ref={body}>
        {/* torso */}
        <mesh position={[0, 1.15, 0]} material={mats.top} castShadow><boxGeometry args={[female ? 0.42 : 0.5, 0.6, 0.26]} /></mesh>
        {appearance.top === 5 && <mesh position={[0, 0.82, 0]} material={mats.top}><boxGeometry args={[0.5, 0.2, 0.3]} /></mesh>}
        {/* hips */}
        <mesh position={[0, 0.8, 0]} material={mats.bottom}><boxGeometry args={[0.46, 0.14, 0.26]} /></mesh>
        {/* head */}
        <group ref={head} position={[0, 1.65, 0]}>
          <mesh material={mats.skin} castShadow><boxGeometry args={[0.3, 0.32, 0.3]} /></mesh>
          <mesh position={[0, 0.12, -0.02]} material={mats.hair}><boxGeometry args={[0.33, appearance.hair === 0 ? 0.06 : appearance.hair === 3 ? 0.26 : 0.14, appearance.hair === 4 ? 0.36 : 0.33]} /></mesh>
          {appearance.hair === 2 && <mesh position={[0, -0.1, -0.2]} material={mats.hair}><boxGeometry args={[0.2, 0.4, 0.08]} /></mesh>}
          {appearance.hair === 5 && <mesh position={[0, -0.05, 0.1]} material={mats.hair}><boxGeometry args={[0.2, 0.1, 0.12]} /></mesh>}
          <mesh position={[-0.07, 0.03, 0.155]}><boxGeometry args={[0.05, 0.05, 0.01]} /><meshBasicMaterial color="#111" /></mesh>
          <mesh position={[0.07, 0.03, 0.155]}><boxGeometry args={[0.05, 0.05, 0.01]} /><meshBasicMaterial color="#111" /></mesh>
          {appearance.accessory === 1 && <mesh position={[0, 0.03, 0.16]} material={mats.acc}><boxGeometry args={[0.28, 0.08, 0.03]} /></mesh>}
          {appearance.accessory === 2 && <mesh position={[0, 0.19, 0.02]} material={mats.acc}><boxGeometry args={[0.34, 0.08, 0.36]} /></mesh>}
          {appearance.accessory === 3 && <mesh position={[0, -0.2, 0]} material={mats.acc}><boxGeometry args={[0.36, 0.08, 0.3]} /></mesh>}
        </group>
        {/* arms */}
        <group ref={lArm} position={[-0.33, 1.4, 0]}><mesh position={[0, -0.28, 0]} material={mats.top}><boxGeometry args={[0.14, 0.3, 0.14]} /></mesh><mesh position={[0, -0.55, 0]} material={mats.skin}><boxGeometry args={[0.13, 0.26, 0.13]} /></mesh></group>
        <group ref={rArm} position={[0.33, 1.4, 0]}><mesh position={[0, -0.28, 0]} material={mats.top}><boxGeometry args={[0.14, 0.3, 0.14]} /></mesh><mesh position={[0, -0.55, 0]} material={mats.skin}><boxGeometry args={[0.13, 0.26, 0.13]} /></mesh></group>
        {/* legs */}
        <group ref={lLeg} position={[-0.13, 0.75, 0]}><mesh position={[0, -0.33, 0]} material={mats.bottom}><boxGeometry args={[0.18, 0.66, 0.18]} /></mesh><mesh position={[0, -0.7, 0.03]} material={mats.shoe}><boxGeometry args={[0.19, 0.1, 0.26]} /></mesh></group>
        <group ref={rLeg} position={[0.13, 0.75, 0]}><mesh position={[0, -0.33, 0]} material={mats.bottom}><boxGeometry args={[0.18, 0.66, 0.18]} /></mesh><mesh position={[0, -0.7, 0.03]} material={mats.shoe}><boxGeometry args={[0.19, 0.1, 0.26]} /></mesh></group>
      </group>
      {name && <NameTag text={name} color={nameColor} />}
    </group>
  );
}

/** Canvas-texture name tag (billboarded sprite). */
export function NameTag({ text, color = "#fff", y = 2.15 }: { text: string; color?: string; y?: number }) {
  const tex = useMemo(() => { const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d")!; x.fillStyle = "rgba(11,11,13,0.55)"; x.roundRect(8, 10, 240, 44, 10); x.fill(); x.font = "bold 28px Inter, system-ui, sans-serif"; x.textAlign = "center"; x.fillStyle = color; x.fillText(text.slice(0, 16), 128, 42); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }, [text, color]);
  return <sprite position={[0, y, 0]} scale={[1.6, 0.4, 1]}><spriteMaterial map={tex} transparent depthWrite={false} /></sprite>;
}
