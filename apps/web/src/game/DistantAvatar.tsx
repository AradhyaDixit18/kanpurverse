"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Appearance, AnimState } from "@kanpurverse/shared";
import { SKIN, TOPS, BOTTOMS, HAIR_COLORS } from "./avatarPalette";
/** Six cheap submissions beyond facial reading distance; nearest avatars retain the complete articulated rig. */
export function DistantAvatar({ appearance: a, anim }: { appearance: Appearance; anim: AnimState }) {
  const limbs = useRef<(THREE.Group | null)[]>([]);
  const body = useMemo(() => {
    const boxes: THREE.BufferGeometry[] = [];
    const add = (size: [number,number,number], p: [number,number,number], color: number) => { const g = new THREE.BoxGeometry(...size).toNonIndexed(); g.translate(...p); const c = new THREE.Color(color), colours = new Float32Array(g.getAttribute("position").count * 3); for (let i = 0; i < colours.length; i += 3) { colours[i] = c.r; colours[i+1] = c.g; colours[i+2] = c.b; } g.setAttribute("color",new THREE.BufferAttribute(colours,3)); boxes.push(g); };
    add([.44,.62,.27],[0,1.15,0],TOPS[a.top]); add([.3,.3,.29],[0,1.69,0],SKIN[a.skin]); add([.31,.09,.3],[0,1.85,0],HAIR_COLORS[a.hairColor]);
    const result = mergeGeometries(boxes); boxes.forEach(g => g.dispose()); return result;
  }, [a.top,a.skin,a.hairColor]);
  useEffect(() => () => body.dispose(), [body]);
  useFrame(({ clock }) => { const move = anim === "walk" || anim === "run" || anim === "sprint"; const swing = move ? Math.sin(clock.elapsedTime * (anim === "walk" ? 7 : 10)) * .45 : 0; limbs.current.forEach((m,i) => { if(m) m.rotation.x = (i % 2 ? 1 : -1) * swing * (i < 2 ? -1 : 1); }); });
  return <><mesh geometry={body}><meshStandardMaterial vertexColors roughness={.9} /></mesh>{[-1,1].map((side,i)=><group key={`arm${i}`} ref={m => { limbs.current[i] = m; }} position={[side * .3,1.4,0]}><mesh position={[0,-.27,0]}><boxGeometry args={[.13,.57,.14]} /><meshStandardMaterial color={TOPS[a.top]} roughness={.9} /></mesh></group>)}{[-1,1].map((side,i)=><group key={`leg${i}`} ref={m => { limbs.current[i+2] = m; }} position={[side * .12,.78,0]}><mesh position={[0,-.375,0]}><boxGeometry args={[.17,.75,.19]} /><meshStandardMaterial color={BOTTOMS[a.bottom]} roughness={.9} /></mesh></group>)}</>;
}
