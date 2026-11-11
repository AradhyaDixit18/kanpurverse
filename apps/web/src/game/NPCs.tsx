"use client";
/** NPC pedestrians & shopkeepers: path-following, player-facing when near, idle barks with subtitles. */
import { useMemo, useRef, useState, useEffect } from "react";
import { RigidBody, CapsuleCollider, useBeforePhysicsStep } from "@react-three/rapier";
import { usePedestrianBody } from "./usePedestrianBody";
import { CHARACTER } from "./characterPhysics";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NPCS, type NpcDef, type Appearance, type AnimState, type DialogueLine } from "@kanpurverse/shared";
import { roadsNear, getRoads, segPoint, segYaw, roadsVersion, onRoadsChange, type Seg } from "./roads";
import { Avatar } from "./Avatar";
import { playerPos } from "./Player";
import { useStore } from "../state/store";
import { useDialogueLines } from "./dialogueData";
import { speak } from "../audio/voice";

import { streetRuntime } from "./streetRuntime";
import { npcPositions } from "./refs";
export { npcPositions };

function appearanceFor(seed: number, role: NpcDef["role"], female: boolean): Appearance {
  const r = (n: number) => (seed * 9301 + n * 49297) % 233280 / 233280;
  return { body: female ? "f" : "m", skin: 1 + Math.floor(r(1) * 4), hair: female ? 2 : Math.floor(r(2) * 2), hairColor: Math.floor(r(3) * 2),
    top: role === "police" ? 1 : role === "shopkeeper" ? 5 : role === "auto" ? 3 : Math.floor(r(4) * 5), bottom: role === "police" ? 1 : Math.floor(r(5) * 4), shoes: Math.floor(r(6) * 3), accessory: role === "auto" ? 3 : role === "police" ? 2 : 0 };
}

export function NPCs() { const q = useStore(s => s.settings.quality); return <>{NPCS.map(n => <NPC key={n.id} def={n} />)}<Crowd n={q === "low" ? 8 : q === "medium" ? 18 : 28} /></>; }

/** Ambient pedestrians walking the pavements near the player (no dialogue, deterministic). */
function Crowd({ n }: { n: number }) {
  const [ver, setVer] = useState(roadsVersion()); useEffect(() => onRoadsChange(() => setVer(roadsVersion())), []);
  const [center, setCenter] = useState<[number, number]>([playerPos.x, playerPos.z]); useFrame(() => { if (Math.hypot(playerPos.x - center[0], playerPos.z - center[1]) > 120) setCenter([playerPos.x, playerPos.z]); });
  const walkers = useMemo(() => { const pool = roadsNear(center[0], center[1], 220).filter(s => s.len > 20 && s.cls !== "service"); const segs = pool.length ? pool : getRoads(); if (!segs.length) return [];
    return Array.from({ length: n }, (_, i) => { const seg = segs[(i * 5) % segs.length]; const side = i % 2 ? 1 : -1; return { seg, off: (seg.w / 2 + 1.6) * side, start: (i * 83) % seg.len, speed: 1 + (i % 3) * 0.25, dir: i % 3 === 0 ? -1 : 1, app: appearanceFor(100 + i, "pedestrian", i % 2 === 1) }; }); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, ver, center]);
  return <>{walkers.map((w, i) => <Walker key={i + ":" + w.seg.a[0]} w={w} />)}</>;
}
function Walker({ w }: { w: { seg: Seg; off: number; start: number; speed: number; dir: number; app: Appearance } }) {
  const g=useRef<THREE.Group>(null),distance=useRef(w.start+useStore.getState().worldTime*86400*w.speed);
  const sample=(d:number)=>{const path=((d%(w.seg.len*2))+w.seg.len*2)%(w.seg.len*2),fwd=path<w.seg.len,s=fwd?path:w.seg.len*2-path,forward=(fwd?1:-1)*w.dir>0;const [x,z]=segPoint(w.seg,w.dir>0?s:w.seg.len-s,w.off);return {x,y:0,z,yaw:segYaw(w.seg,forward)};};
  const initial=useRef(sample(distance.current)),motion=usePedestrianBody([initial.current.x,0,initial.current.z]),[anim,setAnim]=useState<AnimState>("walk");
  useBeforePhysicsStep(()=>{const next=sample(distance.current+w.speed*motion.world.timestep),moved=motion.resolve(next);if(moved>.001)distance.current+=w.speed*motion.world.timestep;if(g.current){g.current.position.set(next.x,next.y,next.z);g.current.rotation.y=next.yaw;}const want=moved>.001?"walk":"idle";if(anim!==want)setAnim(want);});
  return <><RigidBody ref={motion.body} type="kinematicPosition" colliders={false} position={motion.pose}><CapsuleCollider args={[CHARACTER.halfHeight,CHARACTER.radius]}/></RigidBody><group ref={g} position={[initial.current.x,0,initial.current.z]}><Avatar appearance={w.app} anim={anim}/></group></>;
}
function NPC({ def }: { def: NpcDef }) {
  const g = useRef<THREE.Group>(null); const idx = useRef(1); const [anim, setAnim] = useState<AnimState>("idle"); const barkAt = useRef(performance.now() + 8000 + Math.random() * 15000);
  const female = /priya|sunita|rekha/.test(def.id);
  const app = useMemo(() => appearanceFor(def.appearanceSeed, def.role, female), [def, female]);
  const pos = useRef(new THREE.Vector3(def.path[0][0], 0, def.path[0][1])); const lines = useDialogueLines();
  const lastBump = useRef(0); const greetAt = useRef(-99999); const blocked = useRef(0);
  const motion=usePedestrianBody([def.path[0][0],0,def.path[0][1]]);
  useEffect(() => { npcPositions.set(def.id, { x: pos.current.x, z: pos.current.z }); }, [def.id]);

  useBeforePhysicsStep(() => {
    const dt=motion.world.timestep; let walking=false;
    const p = pos.current; const dPlayer = Math.hypot(playerPos.x - p.x, playerPos.z - p.z); const s = useStore.getState();
    const active=dPlayer<110; motion.enable(active); if(!active)return;
    const talking = s.dialogue?.npc === def.id;
    const face = (yaw: number) => { if (!g.current) return; let d = yaw - g.current.rotation.y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; g.current.rotation.y += d * (1 - Math.exp(-dt * 8)); };
    const mood = streetRuntime.moods.get(def.id); const reacting = !!mood && performance.now() < mood.until;
    if (reacting && mood.leaving) {
      const away = new THREE.Vector2(p.x-playerPos.x,p.z-playerPos.z).normalize(); p.x += away.x * dt * 1.4; p.z += away.y * dt * 1.4; face(Math.atan2(away.x,away.y)); if(anim!=="walk")setAnim("walk");
    } else if (reacting) { face(Math.atan2(playerPos.x-p.x,playerPos.z-p.z)); const want = mood.anger > 0 ? "talk" : "laugh"; if(anim!==want)setAnim(want);
    } else if (talking || dPlayer < 3.5) { // face the player, greet with a wave once
      face(Math.atan2(playerPos.x - p.x, playerPos.z - p.z));
      const want: AnimState = talking ? "talk" : (performance.now() - greetAt.current < 1800 ? "wave" : "idle");
      if (!talking && dPlayer < 3.5 && performance.now() - greetAt.current > 15000) greetAt.current = performance.now();
      if (anim !== want) setAnim(want);
      if (dPlayer < 0.9 && performance.now() - lastBump.current > 6000 && !talking && s.settings.subtitles) { lastBump.current = performance.now(); const l = pick(lines, "any", "reaction"); if (l) speak(l, def.id); }
    } else if (def.speed > 0 && def.path.length > 1) {
      const t = def.path[idx.current]; const dx = t[0] - p.x, dz = t[1] - p.z; const d = Math.hypot(dx, dz);
      if (d < 0.5) idx.current = (idx.current + 1) % def.path.length; else { walking=true; p.x += dx / d * def.speed * dt; p.z += dz / d * def.speed * dt; face(Math.atan2(dx, dz)); }

    } else { const fid = Math.floor(performance.now() / 9000 + def.appearanceSeed) % 7 === 0 && (performance.now() % 9000) < 2200 ? "laugh" : "idle"; if (anim !== fid) setAnim(fid); }
    const moved=motion.resolve(p);npcPositions.set(def.id,{x:p.x,z:p.z});
    if(walking){const want=moved>.001?"walk":"idle";if(anim!==want)setAnim(want);blocked.current=moved>.001?0:blocked.current+dt;if(blocked.current>1.2){idx.current=(idx.current+1)%def.path.length;blocked.current=0;}}
    if (g.current) g.current.position.copy(p);
    // idle barks when player is within earshot
    if (performance.now() > barkAt.current) { barkAt.current = performance.now() + 20000 + Math.random() * 25000; if (dPlayer < 14 && !s.dialogue && s.settings.subtitles) { const l = pick(lines, def.id, "idle") ?? pick(lines, "any", "idle"); if (l) speak(l, def.id); } }
  });
  const label = useStore(s => s.settings.lang === "english" ? def.name : def.nameHi);
  return <><RigidBody ref={motion.body} type="kinematicPosition" colliders={false} position={motion.pose}><CapsuleCollider args={[CHARACTER.halfHeight,CHARACTER.radius]}/></RigidBody><group ref={g} position={[def.path[0][0],0,def.path[0][1]]}><Avatar appearance={app} anim={anim} name={label} nameColor={def.role === "guide" ? "#ffd23f" : "#cfd3da"} /></group></>;
}
function pick(lines: DialogueLine[], npc: string, cat: DialogueLine["category"]) { const pool = lines.filter(l => l.category === cat && l.npc === npc); return pool.length ? pool[Math.floor(Math.random() * pool.length)] : undefined; }
