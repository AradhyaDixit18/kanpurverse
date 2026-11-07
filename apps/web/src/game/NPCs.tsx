"use client";
/** NPC pedestrians & shopkeepers: path-following, player-facing when near, idle barks with subtitles. */
import { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NPCS, type NpcDef, type Appearance, type AnimState, type DialogueLine } from "@kanpurverse/shared";
import { Avatar } from "./Avatar";
import { playerPos } from "./Player";
import { useStore } from "../state/store";
import { useDialogueLines } from "./dialogueData";
import { speak } from "../audio/voice";

export const npcPositions = new Map<string, { x: number; z: number }>();

function appearanceFor(seed: number, role: NpcDef["role"], female: boolean): Appearance {
  const r = (n: number) => (seed * 9301 + n * 49297) % 233280 / 233280;
  return { body: female ? "f" : "m", skin: 1 + Math.floor(r(1) * 4), hair: female ? 2 : Math.floor(r(2) * 2), hairColor: Math.floor(r(3) * 2),
    top: role === "police" ? 1 : role === "shopkeeper" ? 5 : role === "auto" ? 3 : Math.floor(r(4) * 5), bottom: role === "police" ? 1 : Math.floor(r(5) * 4), shoes: Math.floor(r(6) * 3), accessory: role === "auto" ? 3 : role === "police" ? 2 : 0 };
}

export function NPCs() { return <>{NPCS.map(n => <NPC key={n.id} def={n} />)}</>; }

function NPC({ def }: { def: NpcDef }) {
  const g = useRef<THREE.Group>(null); const idx = useRef(1); const [anim, setAnim] = useState<AnimState>("idle"); const barkAt = useRef(performance.now() + 8000 + Math.random() * 15000);
  const female = /priya|sunita|rekha/.test(def.id);
  const app = useMemo(() => appearanceFor(def.appearanceSeed, def.role, female), [def, female]);
  const pos = useRef(new THREE.Vector3(def.path[0][0], 0, def.path[0][1])); const lines = useDialogueLines();
  const lastBump = useRef(0);
  useEffect(() => { npcPositions.set(def.id, { x: pos.current.x, z: pos.current.z }); }, [def.id]);

  useFrame((_, dt) => {
    const p = pos.current; const dPlayer = Math.hypot(playerPos.x - p.x, playerPos.z - p.z); const s = useStore.getState();
    const talking = s.dialogue?.npc === def.id;
    if (talking || dPlayer < 2.2) { // face the player
      if (g.current) g.current.rotation.y = Math.atan2(playerPos.x - p.x, playerPos.z - p.z);
      if (anim !== (talking ? "talk" : "idle")) setAnim(talking ? "talk" : "idle");
      if (dPlayer < 0.9 && performance.now() - lastBump.current > 6000 && !talking && s.settings.subtitles) { lastBump.current = performance.now(); const l = pick(lines, "any", "reaction"); if (l) speak(l, def.id); }
    } else if (def.speed > 0 && def.path.length > 1) {
      const t = def.path[idx.current]; const dx = t[0] - p.x, dz = t[1] - p.z; const d = Math.hypot(dx, dz);
      if (d < 0.5) idx.current = (idx.current + 1) % def.path.length; else { p.x += dx / d * def.speed * dt; p.z += dz / d * def.speed * dt; if (g.current) g.current.rotation.y = Math.atan2(dx, dz); }
      if (anim !== "walk") setAnim("walk");
      npcPositions.set(def.id, { x: p.x, z: p.z });
    } else if (anim !== "idle") setAnim("idle");
    if (g.current) g.current.position.copy(p);
    // idle barks when player is within earshot
    if (performance.now() > barkAt.current) { barkAt.current = performance.now() + 20000 + Math.random() * 25000; if (dPlayer < 14 && !s.dialogue && s.settings.subtitles) { const l = pick(lines, def.id, "idle") ?? pick(lines, "any", "idle"); if (l) speak(l, def.id); } }
  });
  const label = useStore(s => s.settings.lang === "english" ? def.name : def.nameHi);
  return <group ref={g}><Avatar appearance={app} anim={anim} name={label} nameColor={def.role === "guide" ? "#ffd23f" : "#cfd3da"} /></group>;
}
function pick(lines: DialogueLine[], npc: string, cat: DialogueLine["category"]) { const pool = lines.filter(l => l.category === cat && l.npc === npc); return pool.length ? pool[Math.floor(Math.random() * pool.length)] : undefined; }
