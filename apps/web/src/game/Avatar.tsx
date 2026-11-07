"use client";
/** Procedural stylised humanoid (rounded primitives), code-driven animation with damped blending between poses. Used for players and NPCs. */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import type { Appearance, AnimState } from "@kanpurverse/shared";

export const SKIN = [0xf1c9a5, 0xe0ac7e, 0xc68642, 0xa5673f, 0x8d5524, 0x5c3a21];
export const HAIR_COLORS = [0x1a1a1a, 0x3b2314, 0x6b3e1e, 0x8c8c8c, 0xb5121b];
export const TOPS = [0xc8102e, 0x3d8bff, 0xf4f4f4, 0x2e8b57, 0xffd23f, 0xf7efe2 /* kurta */, 0x1a3c8c /* jersey */, 0x2b2b2b /* jacket */];
export const BOTTOMS = [0x1c1d22, 0x2f4a7a, 0x6b6b6b, 0xd9c7a0, 0x3a3a3a, 0xffffff];
export const SHOES = [0x111111, 0xffffff, 0x8b4513, 0xc8102e];

/** Pose = target rotations (x,z) for limbs + body offset/rotation + head rotation. Blended with exponential damping. */
interface Pose { la: [number, number]; ra: [number, number]; ll: number; rl: number; lk: number; rk: number; le: number; re: number; by: number; bry: number; brx: number; hx: number; hy: number }
const REST: Pose = { la: [0, 0.08], ra: [0, -0.08], ll: 0, rl: 0, lk: 0, rk: 0, le: 0, re: 0, by: 0, bry: 0, brx: 0, hx: 0, hy: 0 };

function poseFor(anim: AnimState, T: number, blend: { walk: number }): Pose {
  const p: Pose = { ...REST, la: [...REST.la], ra: [...REST.ra] };
  const idleB = Math.sin(T * 1.6) * 0.02; p.la = [idleB, 0.08]; p.ra = [-idleB, -0.08]; p.by = Math.sin(T * 1.6) * 0.008; p.hy = Math.sin(T * 0.7) * 0.08;
  switch (anim) {
    case "walk": case "run": case "sprint": {
      const f = anim === "walk" ? 7 : anim === "run" ? 10 : 12.5, amp = anim === "walk" ? 0.55 : anim === "run" ? 0.85 : 1.05; const s = Math.sin(T * f), c = Math.cos(T * f);
      p.ll = s * amp; p.rl = -s * amp; p.lk = Math.max(0, -c) * amp * 0.9; p.rk = Math.max(0, c) * amp * 0.9;
      p.la = [-s * amp * 0.75, 0.12]; p.ra = [s * amp * 0.75, -0.12]; p.le = Math.max(0, s) * 0.6 + 0.3; p.re = Math.max(0, -s) * 0.6 + 0.3;
      p.by = Math.abs(c) * (anim === "walk" ? 0.035 : 0.06); p.brx = anim === "sprint" ? 0.22 : anim === "run" ? 0.12 : 0.04; p.bry = -s * 0.06; blend.walk = 1; break; }
    case "jump": p.ll = -0.5; p.rl = 0.25; p.lk = 0.9; p.rk = 0.3; p.la = [-2.4, 0.35]; p.ra = [-2.4, -0.35]; p.brx = -0.08; break;
    case "fall": p.ll = -0.2; p.rl = 0.1; p.lk = 0.5; p.rk = 0.4; p.la = [-1.6, 0.9]; p.ra = [-1.6, -0.9]; break;
    case "sit": p.ll = -1.55; p.rl = -1.55; p.lk = 1.5; p.rk = 1.5; p.la = [-0.45, 0.1]; p.ra = [-0.45, -0.1]; p.le = 0.8; p.re = 0.8; p.by = -0.42; break;
    case "drive": p.ll = -1.35; p.rl = -1.35; p.lk = 1.1; p.rk = 1.1; p.la = [-1.25, 0.25]; p.ra = [-1.25, -0.25]; p.le = 0.5; p.re = 0.5; p.by = -0.42; break;
    case "wave": p.ra = [-2.9, -0.3 + Math.sin(T * 9) * 0.35]; p.re = 0.5; p.hy = 0.15; break;
    case "dance": { const s = Math.sin(T * 7), c = Math.cos(T * 7); p.la = [-1.4 + s, 0.9 + s * 0.4]; p.ra = [-1.4 - s, -0.9 + s * 0.4]; p.le = 1.2; p.re = 1.2; p.ll = s * 0.35; p.rl = -s * 0.35; p.lk = Math.abs(c) * 0.4; p.rk = Math.abs(s) * 0.4; p.by = Math.abs(s) * 0.1; p.bry = Math.sin(T * 3.5) * 0.35; p.hy = -Math.sin(T * 3.5) * 0.3; break; }
    case "laugh": p.la = [-0.35, 0.2]; p.ra = [-0.35, -0.2]; p.le = 1.4; p.re = 1.4; p.hx = -0.22 + Math.sin(T * 12) * 0.08; p.brx = -0.1; p.by = Math.abs(Math.sin(T * 12)) * 0.02; break;
    case "celebrate": p.la = [-3, 0.4]; p.ra = [-3, -0.4]; p.by = Math.abs(Math.sin(T * 6)) * 0.22; p.hx = -0.25; p.lk = Math.abs(Math.sin(T * 6)) * 0.3; p.rk = p.lk; break;
    case "highfive": p.ra = [-2.3, -0.6]; p.re = 0.2; p.brx = 0.05; break;
    case "talk": p.la = [-0.5 + Math.sin(T * 4) * 0.2, 0.25]; p.ra = [-0.35 + Math.cos(T * 3) * 0.2, -0.25]; p.le = 0.9 + Math.sin(T * 4) * 0.3; p.re = 0.8; p.hy = Math.sin(T * 1.5) * 0.15; p.hx = Math.sin(T * 2.3) * 0.05; break;
    case "punch": p.ra = [-1.6 + Math.sin(T * 14) * 0.5, -0.1]; p.la = [-1.2, 0.3]; p.le = 1.5; p.re = Math.max(0, Math.sin(T * 14)) * 1.2; p.bry = Math.sin(T * 14) * 0.15; break;
    default: break;
  }
  return p;
}

export function Avatar({ appearance, anim, name, scale = 1, nameColor = "#fff" }: { appearance: Appearance; anim: AnimState; name?: string; scale?: number; nameColor?: string }) {
  const refs = { lArm: useRef<THREE.Group>(null), rArm: useRef<THREE.Group>(null), lFore: useRef<THREE.Group>(null), rFore: useRef<THREE.Group>(null), lLeg: useRef<THREE.Group>(null), rLeg: useRef<THREE.Group>(null), lShin: useRef<THREE.Group>(null), rShin: useRef<THREE.Group>(null), body: useRef<THREE.Group>(null), head: useRef<THREE.Group>(null) };
  const eyes = useRef<THREE.Group>(null); const blinkAt = useRef(2 + Math.random() * 4);
  const t = useRef(Math.random() * 10); const cur = useRef<Pose>(poseFor(anim, 0, { walk: 0 })); const blend = useRef({ walk: 0 });
  const appKey = JSON.stringify(appearance);
  const mats = useMemo(() => ({
    skin: new THREE.MeshStandardMaterial({ color: SKIN[appearance.skin], roughness: 0.75 }),
    hair: new THREE.MeshStandardMaterial({ color: HAIR_COLORS[appearance.hairColor], roughness: 0.95 }),
    top: new THREE.MeshStandardMaterial({ color: TOPS[appearance.top], roughness: appearance.top === 7 ? 0.35 : 0.8, metalness: appearance.top === 7 ? 0.2 : 0 }),
    topDark: new THREE.MeshStandardMaterial({ color: new THREE.Color(TOPS[appearance.top]).multiplyScalar(0.82), roughness: 0.85 }),
    bottom: new THREE.MeshStandardMaterial({ color: BOTTOMS[appearance.bottom], roughness: 0.9 }),
    shoe: new THREE.MeshStandardMaterial({ color: SHOES[appearance.shoes], roughness: 0.55 }),
    acc: new THREE.MeshStandardMaterial({ color: appearance.accessory === 1 ? 0x111111 : appearance.accessory === 2 ? 0xc8102e : 0xe8b04b, roughness: 0.5 }),
    acc2: new THREE.MeshStandardMaterial({ color: [0xff8fb1, 0xffd23f, 0x3d8bff, 0x2e8b57, 0xffffff][appearance.bottom % 5], roughness: 0.9, side: THREE.DoubleSide }),
    eye: new THREE.MeshBasicMaterial({ color: 0x151515 }), white: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [appKey]);
  const female = appearance.body === "f";

  useFrame((_, dt) => {
    t.current += dt; const T = t.current; const target = poseFor(anim, T, blend.current);
    const k = 1 - Math.exp(-dt * (anim === "walk" || anim === "run" || anim === "sprint" ? 18 : 12)); const c = cur.current; const L = THREE.MathUtils.lerp;
    c.la = [L(c.la[0], target.la[0], k), L(c.la[1], target.la[1], k)]; c.ra = [L(c.ra[0], target.ra[0], k), L(c.ra[1], target.ra[1], k)];
    c.ll = L(c.ll, target.ll, k); c.rl = L(c.rl, target.rl, k); c.lk = L(c.lk, target.lk, k); c.rk = L(c.rk, target.rk, k); c.le = L(c.le, target.le, k); c.re = L(c.re, target.re, k);
    c.by = L(c.by, target.by, k); c.bry = L(c.bry, target.bry, k); c.brx = L(c.brx, target.brx, k); c.hx = L(c.hx, target.hx, k); c.hy = L(c.hy, target.hy, k);
    const R = refs;
    if (R.lArm.current) R.lArm.current.rotation.set(c.la[0], 0, c.la[1]); if (R.rArm.current) R.rArm.current.rotation.set(c.ra[0], 0, c.ra[1]);
    if (R.lFore.current) R.lFore.current.rotation.x = -c.le; if (R.rFore.current) R.rFore.current.rotation.x = -c.re;
    if (R.lLeg.current) R.lLeg.current.rotation.x = c.ll; if (R.rLeg.current) R.rLeg.current.rotation.x = c.rl;
    if (R.lShin.current) R.lShin.current.rotation.x = c.lk; if (R.rShin.current) R.rShin.current.rotation.x = c.rk;
    if (R.body.current) { R.body.current.position.y = c.by; R.body.current.rotation.set(c.brx, c.bry, 0); }
    if (R.head.current) R.head.current.rotation.set(c.hx, c.hy, 0);
    if (eyes.current) { const since = T - blinkAt.current; if (since > 0) { eyes.current.scale.y = since < 0.08 ? 0.1 : 1; if (since > 0.16) blinkAt.current = T + 2.5 + Math.random() * 4; } }
    // jump squash/stretch and landing crouch
    if (R.body.current) { const sy = anim === "jump" ? 1.06 : anim === "fall" ? 1.03 : 1; R.body.current.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy)); }
  });

  const torsoW = female ? 0.4 : 0.48, hipW = female ? 0.42 : 0.4;
  return (
    <group scale={scale}>
      <group ref={refs.body}>
        {/* torso */}
        <RoundedBox position={[0, 1.17, 0]} material={mats.top} castShadow args={[torsoW, 0.56, 0.27]} radius={0.09} smoothness={4} />
        <mesh position={[0, 1.43, 0.02]} material={mats.topDark}><torusGeometry args={[0.09, 0.025, 6, 14]} /></mesh>{/* collar */}
        <RoundedBox position={[0, 1.42, 0]} material={mats.top} args={[torsoW + 0.08, 0.1, 0.28]} radius={0.045} smoothness={3} />{/* shoulders */}
        {appearance.top === 5 && <RoundedBox position={[0, 0.84, 0]} material={mats.top} args={[hipW + 0.1, 0.22, 0.3]} radius={0.045} smoothness={3} />}{/* kurta hem */}
        {female && <RoundedBox position={[0, 0.78, 0]} material={mats.top} args={[hipW + 0.14, 0.3, 0.32]} radius={0.05} />}{/* kurti flare */}
        {female && <mesh position={[0.12, 1.25, 0.08]} rotation={[0, 0, -0.5]} material={mats.acc2}><boxGeometry args={[0.16, 0.7, 0.03]} /></mesh>}{/* dupatta */}
        {female && <mesh position={[-0.2, 1.05, -0.12]} rotation={[0.2, 0, 0.3]} material={mats.acc2}><boxGeometry args={[0.14, 0.5, 0.03]} /></mesh>}
        {appearance.top === 6 && <RoundedBox position={[0, 1.2, 0.135]} material={mats.topDark} args={[0.16, 0.3, 0.01]} radius={0.045} smoothness={3} />}{/* jersey stripe */}
        {appearance.top === 7 && <RoundedBox position={[0, 1.2, 0.135]} material={mats.topDark} args={[0.06, 0.5, 0.01]} radius={0.045} smoothness={3} />}{/* jacket zip */}
        <mesh position={[0, 1.48, 0]} material={mats.skin}><cylinderGeometry args={[0.07, 0.08, 0.1, 10]} /></mesh>{/* neck */}
        {/* hips */}
        <RoundedBox position={[0, 0.84, 0]} material={mats.bottom} args={[hipW, 0.16, 0.26]} radius={0.045} smoothness={3} />
        {/* head */}
        <group ref={refs.head} position={[0, 1.7, 0]}>
          <RoundedBox material={mats.skin} castShadow args={[0.3, 0.33, 0.3]} radius={0.1} smoothness={4} />
          <RoundedBox position={[0, 0.135, -0.015]} material={mats.hair} args={[0.33, appearance.hair === 0 ? 0.05 : appearance.hair === 3 ? 0.24 : 0.13, appearance.hair === 4 ? 0.35 : 0.33]} radius={0.045} smoothness={3} />
          {appearance.hair !== 0 && <RoundedBox position={[0, 0.02, -0.14]} material={mats.hair} args={[0.32, 0.22, 0.06]} radius={0.045} smoothness={3} />}
          {appearance.hair === 2 && <RoundedBox position={[0, -0.12, -0.19]} material={mats.hair} args={[0.2, 0.42, 0.08]} radius={0.045} smoothness={3} />}
          {appearance.hair === 5 && <RoundedBox position={[0, -0.04, 0.1]} material={mats.hair} args={[0.22, 0.1, 0.12]} radius={0.045} smoothness={3} />}
          <group ref={eyes}>{[-0.07, 0.07].map(x => <group key={x}><mesh position={[x, 0.03, 0.152]} material={mats.white}><boxGeometry args={[0.06, 0.05, 0.01]} /></mesh><mesh position={[x + 0.012, 0.03, 0.158]} material={mats.eye}><sphereGeometry args={[0.016]} /></mesh></group>)}</group>
          <RoundedBox position={[0, -0.02, 0.155]} material={mats.skin} args={[0.05, 0.07, 0.03]} radius={0.045} smoothness={3} />{/* nose */}
          <mesh position={[0, -0.075, 0.152]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.035, 0.008, 6, 10, Math.PI]} /><meshBasicMaterial color="#7a3b3b" /></mesh>{/* smile */}
          {[-0.07, 0.07].map(x => <mesh key={"b" + x} position={[x, 0.085, 0.152]} rotation={[0, 0, x > 0 ? -0.15 : 0.15]} material={mats.hair}><boxGeometry args={[0.07, 0.012, 0.01]} /></mesh>)}{/* eyebrows */}
          {female && <mesh position={[0, 0.0, 0.16]}><sphereGeometry args={[0.012]} /><meshBasicMaterial color="#c8102e" /></mesh>}{/* bindi */}
          {female && appearance.hair !== 0 && <RoundedBox position={[0, -0.12, -0.17]} material={mats.hair} args={[0.26, 0.5, 0.1]} radius={0.04} />}{/* long hair */}
          {appearance.accessory === 1 && <mesh position={[0, 0.03, 0.165]} material={mats.acc}><boxGeometry args={[0.3, 0.075, 0.03]} /></mesh>}
          {appearance.accessory === 2 && <><mesh position={[0, 0.2, 0.02]} material={mats.acc}><boxGeometry args={[0.34, 0.08, 0.36]} /></mesh><mesh position={[0, 0.17, 0.22]} material={mats.acc}><boxGeometry args={[0.3, 0.02, 0.14]} /></mesh></>}
          {appearance.accessory === 3 && <mesh position={[0, -0.21, 0.02]} material={mats.acc}><boxGeometry args={[0.38, 0.09, 0.32]} /></mesh>}
        </group>
        {/* arms: upper + forearm pivots */}
        {([["lArm", "lFore", -1], ["rArm", "rFore", 1]] as const).map(([a, f, sx]) => (
          <group key={a} ref={refs[a]} position={[sx * (torsoW / 2 + 0.08), 1.42, 0]}>
            <RoundedBox position={[0, -0.15, 0]} material={mats.top} args={[0.14, 0.32, 0.14]} radius={0.065} smoothness={4} />
            <group ref={refs[f]} position={[0, -0.3, 0]}>
              <mesh position={[0, -0.13, 0]} material={appearance.top === 7 || appearance.top === 5 ? mats.top : mats.skin}><boxGeometry args={[0.12, 0.26, 0.12]} /></mesh>
              <RoundedBox position={[0, -0.3, 0]} material={mats.skin} args={[0.11, 0.1, 0.09]} radius={0.045} smoothness={3} />
            </group>
          </group>))}
        {/* legs: thigh + shin pivots */}
        {([["lLeg", "lShin", -1], ["rLeg", "rShin", 1]] as const).map(([l, s, sx]) => (
          <group key={l} ref={refs[l]} position={[sx * 0.12, 0.78, 0]}>
            <RoundedBox position={[0, -0.18, 0]} material={mats.bottom} args={[0.17, 0.38, 0.18]} radius={0.08} smoothness={4} />
            <group ref={refs[s]} position={[0, -0.36, 0]}>
              <RoundedBox position={[0, -0.17, 0]} material={mats.bottom} args={[0.15, 0.34, 0.16]} radius={0.07} smoothness={4} />
              <RoundedBox position={[0, -0.37, 0.04]} material={mats.shoe} args={[0.17, 0.09, 0.27]} radius={0.045} smoothness={3} />
            </group>
          </group>))}
      </group>
      {name && <NameTag text={name} color={nameColor} />}
    </group>
  );
}

/** Canvas-texture name tag (billboarded sprite). */
export function NameTag({ text, color = "#fff", y = 2.2 }: { text: string; color?: string; y?: number }) {
  const tex = useMemo(() => { const c = document.createElement("canvas"); c.width = 256; c.height = 64; const x = c.getContext("2d")!; x.fillStyle = "rgba(11,11,13,0.6)"; x.roundRect(8, 10, 240, 44, 12); x.fill(); x.font = "600 26px Inter, system-ui, sans-serif"; x.textAlign = "center"; x.fillStyle = color; x.fillText(text.slice(0, 16), 128, 41); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }, [text, color]);
  return <sprite position={[0, y, 0]} scale={[1.5, 0.375, 1]}><spriteMaterial map={tex} transparent depthWrite={false} /></sprite>;
}
