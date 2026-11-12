"use client";
/**
 * Mission enemies ("लालटेन सेठ के गुंडे"): physical capsule characters that chase, punch, react to hits, get stunned
 * by pepper spray and are knocked out (never killed). They exist only while a mission objective needs them; when all
 * are down the objective is marked cleared so the mission can advance.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { RigidBody, CapsuleCollider, useBeforePhysicsStep } from "@react-three/rapier";
import * as THREE from "three";
import { DEFAULT_APPEARANCE, type AnimState, type Appearance } from "@kanpurverse/shared";
import { Avatar } from "./Avatar";
import { usePedestrianBody } from "./usePedestrianBody";
import { CHARACTER } from "./characterPhysics";
import { useStore, tl } from "../state/store";
import { playerPos } from "./refs";
import { enemies, hurtPlayer } from "./combatRuntime";
import { sfx } from "../audio/sfx";

export const ENEMY = { health: 60, speed: 3.6, aggro: 24, reach: 1.45, damage: 7, attackEvery: 1300 };

export function Enemies() {
  const mission = useStore(s => s.mission); const cleared = useStore(s => s.cleared);
  const spec = mission?.def.enemies?.find(e => e.index === mission.index);
  const key = mission && spec ? `${mission.def.id}:${mission.index}` : "";
  if (!mission || !spec || cleared.includes(key)) return null;
  return <Squad key={key + mission.startedAt} id={key} at={spec.at} count={spec.count} />;
}
function Squad({ id, at, count }: { id: string; at: [number, number]; count: number }) {
  const ids = useMemo(() => Array.from({ length: count }, (_, i) => `${id}#${i}`), [id, count]);
  const [down, setDown] = useState(0);
  useEffect(() => { useStore.getState().toast(tl("सेठ के गुंडे सामने हैं! T से हथियार, क्लिक से वार।", "The Seth's goons! T to equip, click to attack."), "error"); return () => { for (const k of ids) enemies.delete(k); }; }, [ids]);
  useEffect(() => { if (down >= count) { const s = useStore.getState(); s.set({ cleared: [...s.cleared, id] }); s.toast(tl("सब बेहोश! आगे बढ़ो।", "All knocked out! Move on."), "reward"); } }, [down, count, id]);
  return <>{ids.map((k, i) => <Goon key={k} id={k} start={[at[0] + Math.cos(i * 2.1) * 4, at[1] + Math.sin(i * 2.1) * 4]} seed={i} onDown={() => setDown(d => d + 1)} />)}</>;
}
function Goon({ id, start, seed, onDown }: { id: string; start: [number, number]; seed: number; onDown: () => void }) {
  const motion = usePedestrianBody([start[0], 0, start[1]]); const vis = useRef<THREE.Group>(null); const [anim, setAnim] = useState<AnimState>("idle");
  const state = useMemo(() => { const e = { id, mission: id.split(":")[0], pos: new THREE.Vector3(start[0], 0, start[1]), health: ENEMY.health, stunUntil: 0, knockedAt: 0, hitAt: 0, attackAt: 0 }; enemies.set(id, e); return e; }, [id, start]);
  const look: Appearance = useMemo(() => ({ ...DEFAULT_APPEARANCE, body: "m", skin: 2 + (seed % 3), hair: [0, 3, 5][seed % 3], hairColor: 0, top: [7, 0, 4][seed % 3], bottom: 4, shoes: 0, accessory: seed % 2 ? 1 : 0 }), [seed]);
  const reported = useRef(false); const lastAnim = useRef<AnimState>("idle");
  useBeforePhysicsStep(() => {
    const s = useStore.getState(); if (s.paused || s.dialogue || s.cutscene || s.dead || s.shop) return;
    const now = performance.now(); const dt = motion.world.timestep; const e = state;
    let want: AnimState = "idle";
    if (e.knockedAt) { want = "knockdown"; motion.enable(false); if (!reported.current) { reported.current = true; sfx.hit(); onDown(); } }
    else if (now < e.stunUntil) want = "stunned";
    else if (now - e.hitAt < 380) want = "hit";
    else {
      const dx = playerPos.x - e.pos.x, dz = playerPos.z - e.pos.z, d = Math.hypot(dx, dz);
      if (d < ENEMY.aggro && !s.inVehicle) {
        if (vis.current) vis.current.rotation.y = Math.atan2(dx, dz);
        if (d > ENEMY.reach) { motion.resolve({ x: e.pos.x + dx / d * ENEMY.speed * dt, y: e.pos.y, z: e.pos.z + dz / d * ENEMY.speed * dt }); want = "run"; }
        else { want = "punch"; if (now - e.attackAt > ENEMY.attackEvery) { e.attackAt = now; setTimeout(() => { if (!e.knockedAt && now >= e.stunUntil && Math.hypot(playerPos.x - e.pos.x, playerPos.z - e.pos.z) < ENEMY.reach + 0.4) hurtPlayer(ENEMY.damage, "enemy"); }, 380); } }
      }
      const b = motion.body.current?.translation(); if (b) e.pos.set(b.x, b.y - CHARACTER.feetOffset, b.z);
    }
    if (vis.current) vis.current.position.copy(e.pos);
    if (want !== lastAnim.current) { lastAnim.current = want; setAnim(want); }
  });
  return <><RigidBody ref={motion.body} type="kinematicPosition" colliders={false} position={motion.pose} enabledRotations={[false, false, false]}><CapsuleCollider args={[CHARACTER.halfHeight, CHARACTER.radius]} /></RigidBody>
    <group ref={vis} position={[start[0], 0, start[1]]}><Avatar appearance={look} anim={anim} speed={anim === "run" ? ENEMY.speed : undefined} name={tl("गुंडा", "Goon")} nameColor="#ff6a5c" /><HealthBar e={state} /></group></>;
}
function HealthBar({ e }: { e: { health: number; knockedAt: number } }) {
  const bar = useRef<THREE.Mesh>(null); const back = useRef<THREE.Group>(null);
  useBeforePhysicsStep(() => { if (bar.current) { const k = Math.max(0.001, e.health / ENEMY.health); bar.current.scale.x = k; bar.current.position.x = -(1 - k) * 0.4; } if (back.current) back.current.visible = !e.knockedAt; });
  return <group ref={back} position={[0, 2.45, 0]}><mesh><planeGeometry args={[0.84, 0.1]} /><meshBasicMaterial color="#1a1a1a" side={THREE.DoubleSide} /></mesh><mesh ref={bar} position={[0, 0, 0.005]}><planeGeometry args={[0.8, 0.07]} /><meshBasicMaterial color="#e5483a" side={THREE.DoubleSide} /></mesh></group>;
}
