"use client";
/** NPC pedestrians & shopkeepers: path-following, player-facing when near, idle barks with subtitles. */
import { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NPCS, ROADS, type NpcDef, type Appearance, type AnimState, type DialogueLine } from "@kanpurverse/shared";
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

export function NPCs() { const q = useStore(s => s.settings.quality); return <>{NPCS.map(n => <NPC key={n.id} def={n} />)}<Crowd n={q === "low" ? 6 : q === "medium" ? 14 : 22} /></>; }

/** Ambient pedestrians walking the pavements (no dialogue, deterministic). */
function Crowd({ n }: { n: number }) {
  const walkers = useMemo(() => Array.from({ length: n }, (_, i) => { const road = ROADS[i % ROADS.length]; const side = i % 2 ? 1 : -1; const h = road.a[1] === road.b[1]; const off = (road.w / 2 + 1.6) * side; const len = Math.hypot(road.b[0] - road.a[0], road.b[1] - road.a[1]);
    return { road, h, off, len, start: (i * 83) % len, speed: 1 + (i % 3) * 0.25, dir: i % 3 === 0 ? -1 : 1, app: appearanceFor(100 + i, "pedestrian", i % 2 === 1) }; }), [n]);
  return <>{walkers.map((w, i) => <Walker key={i} w={w} />)}</>;
}
function Walker({ w }: { w: { road: typeof ROADS[number]; h: boolean; off: number; len: number; start: number; speed: number; dir: number; app: Appearance } }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => { if (!g.current) return; const t = useStore.getState().worldTime * 1200; const d = (w.start + t * w.speed) % (w.len * 2); const fwd = d < w.len; const s = fwd ? d : w.len * 2 - d; const dir = (fwd ? 1 : -1) * w.dir;
    const x = w.h ? w.road.a[0] + (w.dir > 0 ? s : w.len - s) : w.road.a[0] + w.off, z = w.h ? w.road.a[1] + w.off : w.road.a[1] + (w.dir > 0 ? s : w.len - s);
    g.current.position.set(x, 0, z); g.current.rotation.y = w.h ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI); });
  return <group ref={g}><Avatar appearance={w.app} anim="walk" /></group>;
}

function NPC({ def }: { def: NpcDef }) {
  const g = useRef<THREE.Group>(null); const idx = useRef(1); const [anim, setAnim] = useState<AnimState>("idle"); const barkAt = useRef(performance.now() + 8000 + Math.random() * 15000);
  const female = /priya|sunita|rekha/.test(def.id);
  const app = useMemo(() => appearanceFor(def.appearanceSeed, def.role, female), [def, female]);
  const pos = useRef(new THREE.Vector3(def.path[0][0], 0, def.path[0][1])); const lines = useDialogueLines();
  const lastBump = useRef(0); const greetAt = useRef(-99999);
  useEffect(() => { npcPositions.set(def.id, { x: pos.current.x, z: pos.current.z }); }, [def.id]);

  useFrame((_, dt) => {
    const p = pos.current; const dPlayer = Math.hypot(playerPos.x - p.x, playerPos.z - p.z); const s = useStore.getState();
    const talking = s.dialogue?.npc === def.id;
    const face = (yaw: number) => { if (!g.current) return; let d = yaw - g.current.rotation.y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; g.current.rotation.y += d * (1 - Math.exp(-dt * 8)); };
    if (talking || dPlayer < 3.5) { // face the player, greet with a wave once
      face(Math.atan2(playerPos.x - p.x, playerPos.z - p.z));
      const want: AnimState = talking ? "talk" : (performance.now() - greetAt.current < 1800 ? "wave" : "idle");
      if (!talking && dPlayer < 3.5 && performance.now() - greetAt.current > 15000) greetAt.current = performance.now();
      if (anim !== want) setAnim(want);
      if (dPlayer < 0.9 && performance.now() - lastBump.current > 6000 && !talking && s.settings.subtitles) { lastBump.current = performance.now(); const l = pick(lines, "any", "reaction"); if (l) speak(l, def.id); }
    } else if (def.speed > 0 && def.path.length > 1) {
      const t = def.path[idx.current]; const dx = t[0] - p.x, dz = t[1] - p.z; const d = Math.hypot(dx, dz);
      if (d < 0.5) idx.current = (idx.current + 1) % def.path.length; else { p.x += dx / d * def.speed * dt; p.z += dz / d * def.speed * dt; face(Math.atan2(dx, dz)); }
      if (anim !== "walk") setAnim("walk");
      npcPositions.set(def.id, { x: p.x, z: p.z });
    } else { const fid = Math.floor(performance.now() / 9000 + def.appearanceSeed) % 7 === 0 && (performance.now() % 9000) < 2200 ? "laugh" : "idle"; if (anim !== fid) setAnim(fid); }
    if (g.current) g.current.position.copy(p);
    // idle barks when player is within earshot
    if (performance.now() > barkAt.current) { barkAt.current = performance.now() + 20000 + Math.random() * 25000; if (dPlayer < 14 && !s.dialogue && s.settings.subtitles) { const l = pick(lines, def.id, "idle") ?? pick(lines, "any", "idle"); if (l) speak(l, def.id); } }
  });
  const label = useStore(s => s.settings.lang === "english" ? def.name : def.nameHi);
  return <group ref={g}><Avatar appearance={app} anim={anim} name={label} nameColor={def.role === "guide" ? "#ffd23f" : "#cfd3da"} /></group>;
}
function pick(lines: DialogueLine[], npc: string, cat: DialogueLine["category"]) { const pool = lines.filter(l => l.category === cat && l.npc === npc); return pool.length ? pool[Math.floor(Math.random() * pool.length)] : undefined; }
