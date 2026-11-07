"use client";
/** Local player: Rapier kinematic character controller + third-person camera with collision + interaction probe + network send. */
import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, CapsuleCollider, useRapier, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { SPAWN_POINT, NPCS, LANDMARKS, MISSIONS, type AnimState } from "@kanpurverse/shared";
import { Avatar } from "./Avatar";
import { input, pollKeys, once, consumeLook, consumeZoom, clearOnce, camYaw } from "./input";
export { camYaw };
import { useStore } from "../state/store";
import { net, correction } from "../net/client";
import { sfx } from "../audio/sfx";
import { npcPositions } from "./refs";

const WALK = 3.2, RUN = 5.5, SPRINT = 8.5, JUMP_V = 6.5, GRAV = -18;
import { playerPos as refPos, playerYaw, vehicleTelemetry as _vt } from "./refs";
void _vt;
/** Live player position as a Vector3 for 3D code; mirrored into refs.playerPos for UI code. */
export const playerPos = new THREE.Vector3(...SPAWN_POINT);
export { playerYaw };

export function Player() {
  const body = useRef<RapierRigidBody>(null); const vis = useRef<THREE.Group>(null);
  const { rapier, world } = useRapier(); const { camera, gl } = useThree();
  const anim = useRef<AnimState>("idle"); const vel = useRef({ x: 0, z: 0 }); const [animState, setAnimState] = useState<AnimState>("idle"); const seat = useStore(s => s.seat); const vy = useRef(0); const grounded = useRef(true); const emoteUntil = useRef(0); const stepT = useRef(0);
  const controller = useRef<ReturnType<typeof world.createCharacterController> | null>(null);
  const appearance = useStore(s => s.appearance); const name = useStore(s => s.name); const inVehicle = useStore(s => s.inVehicle);
  const camTarget = useRef(new THREE.Vector3()); const rayDir = useRef(new THREE.Vector3());

  useEffect(() => { const c = world.createCharacterController(0.05); c.enableAutostep(0.45, 0.2, true); c.enableSnapToGround(0.3); c.setMaxSlopeClimbAngle(50 * Math.PI / 180); controller.current = c; return () => { world.removeCharacterController(c); }; }, [world]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05); const s = useStore.getState(); const rb = body.current; const c = controller.current; if (!rb || !c) return;
    pollKeys();
    const paused = s.paused || !!s.dialogue; const sens = s.settings.sensitivity * (s.settings.invertY ? -1 : 1);
    // camera orbit
    const look = consumeLook(); if (!paused) { camYaw.v -= look.dx * 0.0025 * s.settings.sensitivity; camYaw.pitch = THREE.MathUtils.clamp(camYaw.pitch + look.dy * 0.0025 * sens, -0.6, 1.1); }
    camYaw.dist = THREE.MathUtils.clamp(camYaw.dist + consumeZoom() * 0.6, 2.5, 12);

    if (inVehicle) { // vehicle handles position; keep avatar hidden/in car
      const v = s.vehicles[inVehicle]; if (v) { playerPos.set(v.p[0], v.p[1], v.p[2]); refPos.set(v.p[0], v.p[1], v.p[2]); rb.setNextKinematicTranslation({ x: v.p[0], y: v.p[1] + 0.3, z: v.p[2] }); }
      if (once("KeyF") || once("KeyE")) { net.send({ t: "vehicle.exit" }); sfx.doorOpen(); sfx.engine(false); }
      if (animState !== (seat === "driver" ? "drive" : "sit")) setAnimState(seat === "driver" ? "drive" : "sit");
      placeCamera(camera, world, rapier, playerPos, s.settings.reduceMotion ? 1 : 0.15, 1.4);
      return;
    }

    // movement relative to camera yaw
    let mx = 0, mz = 0; const fwd = paused ? 0 : input.fwd, right = paused ? 0 : input.right;
    if (fwd || right) { const len = Math.hypot(fwd, right) || 1; const f = fwd / len, r = right / len; const cy = camYaw.v; mx = -Math.sin(cy) * f + Math.cos(cy) * r; mz = -Math.cos(cy) * f - Math.sin(cy) * r; }
    const moving = !!(mx || mz); const speed = input.sprint ? SPRINT : (Math.hypot(fwd, right) > 0.75 ? RUN : WALK);
    if (moving) { playerYaw.v = Math.atan2(mx, mz); emoteUntil.current = 0; }
    // gravity / jump
    if (grounded.current && input.jump && !paused) { vy.current = JUMP_V; grounded.current = false; sfx.step(); }
    vy.current += GRAV * dt;
    // smooth acceleration/deceleration so starts, stops and turns don't snap
    const k = 1 - Math.exp(-dt * (moving ? 9 : 14)); vel.current.x += (mx * speed - vel.current.x) * k; vel.current.z += (mz * speed - vel.current.z) * k;
    const desired = { x: vel.current.x * dt, y: vy.current * dt, z: vel.current.z * dt };
    const col = rb.collider(0); c.computeColliderMovement(col, desired); const mv = c.computedMovement();
    const p = rb.translation(); const np = { x: p.x + mv.x, y: p.y + mv.y, z: p.z + mv.z };
    grounded.current = c.computedGrounded(); if (grounded.current && vy.current < 0) vy.current = -0.5;
    rb.setNextKinematicTranslation(np); playerPos.set(np.x, np.y - 0.95, np.z);
    // animation state
    const now = performance.now();
    const movingVis = Math.hypot(vel.current.x, vel.current.z) > 0.4;
    if (emoteUntil.current > now) { /* keep emote */ } else if (!grounded.current) anim.current = vy.current > 0 ? "jump" : "fall"; else if (movingVis) anim.current = input.sprint && moving ? "sprint" : Math.hypot(vel.current.x, vel.current.z) > WALK + 0.5 ? "run" : "walk"; else anim.current = "idle";
    if (moving && grounded.current) { stepT.current += dt * speed; if (stepT.current > 2.2) { stepT.current = 0; sfx.step(); } }
    if (vis.current) { vis.current.position.copy(playerPos); vis.current.rotation.y = THREE.MathUtils.lerp(vis.current.rotation.y, playerYaw.v, 0.25) + 0 ; vis.current.rotation.y = lerpAngle(vis.current.rotation.y, playerYaw.v, 0.3); }
    // emotes
    const em: [string, AnimState][] = [["Digit1", "wave"], ["Digit2", "dance"], ["Digit3", "laugh"], ["Digit4", "celebrate"], ["Digit5", "highfive"], ["Digit6", "sit"]];
    for (const [k, a] of em) if (once(k) && !paused) { anim.current = a; emoteUntil.current = now + 2500; net.send({ t: "emote", anim: a }); }
    // interaction probe
    probe(s, np);
    if ((once("KeyE") || once("KeyF")) && !paused) interact(s);
    // server correction (if server snapped us back)
    // reconciliation: an explicit server correction always wins (snap, then keep predicting from there)
    if (correction.p) { const c = correction.p; correction.p = null; rb.setNextKinematicTranslation({ x: c[0], y: c[1] + 0.95, z: c[2] }); playerPos.set(c[0], c[1], c[2]); vel.current.x = 0; vel.current.z = 0; }
    const self = s.selfId ? s.players[s.selfId] : undefined;
    if (self && Math.hypot(self.p[0] - np.x, self.p[2] - np.z) > 6) { rb.setNextKinematicTranslation({ x: self.p[0], y: self.p[1] + 0.95, z: self.p[2] }); playerPos.set(self.p[0], self.p[1], self.p[2]); }
    if (anim.current !== animState) setAnimState(anim.current);
    refPos.set(playerPos.x, playerPos.y, playerPos.z);
    net.sendState([playerPos.x, playerPos.y, playerPos.z], playerYaw.v, anim.current);
    placeCamera(camera, world, rapier, playerPos, s.settings.reduceMotion ? 1 : 0.18, 1.6);
    if (s.settings.touch) clearOnce();
  });

  function placeCamera(cam: THREE.Camera, w: typeof world, r: typeof rapier, target: THREE.Vector3, smooth: number, h: number) {
    camTarget.current.set(target.x, target.y + h, target.z);
    const dir = rayDir.current.set(Math.sin(camYaw.v) * Math.cos(camYaw.pitch), Math.sin(camYaw.pitch), Math.cos(camYaw.v) * Math.cos(camYaw.pitch));
    let dist = camYaw.dist;
    const ray = new r.Ray(camTarget.current, dir); const hit = w.castRay(ray, dist, true, undefined, undefined, undefined, body.current ?? undefined);
    if (hit && hit.timeOfImpact < dist) dist = Math.max(0.8, hit.timeOfImpact - 0.3);
    const want = camTarget.current.clone().addScaledVector(dir, dist);
    cam.position.lerp(want, smooth); cam.lookAt(camTarget.current);
  }
  function probe(s: ReturnType<typeof useStore.getState>, p: { x: number; z: number }) {
    let best: typeof s.nearby | undefined; let bd = 3.2;
    for (const n of NPCS) { const q = npcPositions.get(n.id) ?? { x: n.path[0][0], z: n.path[0][1] }; const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; best = { kind: "npc", id: n.id, label: s.settings.lang === "english" ? `Talk to ${n.name}` : `${n.nameHi} से बात करो` }; } }
    for (const v of Object.values(s.vehicles)) { const d = Math.hypot(v.p[0] - p.x, v.p[2] - p.z); if (d < Math.max(bd, 4.5) && !best) { bd = d; best = { kind: "vehicle", id: v.id, label: v.driver ? (s.settings.lang === "english" ? "Ride along" : "सवारी बनो") : (s.settings.lang === "english" ? `Drive ${v.kind}` : `${v.kind} चलाओ`) }; } }
    const m = s.mission; if (m && (m.def.kind === "photo" || m.def.kind === "social")) { const cp = m.def.checkpoints[m.index]; if (cp && Math.hypot(cp[0] - p.x, cp[1] - p.z) < m.def.radius) best = { kind: "checkpoint", id: m.def.id, label: m.def.kind === "photo" ? (s.settings.lang === "english" ? "Take photo" : "फ़ोटो लो") : (s.settings.lang === "english" ? "Sit together" : "साथ बैठो") }; }
    if (!best) { for (const l of LANDMARKS) if (l.kind !== "park" && l.kind !== "ghat" && Math.hypot(l.p[0] - p.x, l.p[1] - p.z) < Math.min(l.r, 12) + 2) { best = { kind: "landmark", id: l.id, label: s.settings.lang === "english" ? l.name : l.nameHi }; break; } }
    if (best?.id !== s.nearby?.id || best?.label !== s.nearby?.label) s.set({ nearby: best });
  }
  function interact(s: ReturnType<typeof useStore.getState>) {
    const n = s.nearby; if (!n) return;
    if (n.kind === "npc") { s.set({ dialogue: { npc: n.id, lineId: "" } }); if (document.pointerLockElement) document.exitPointerLock(); }
    else if (n.kind === "vehicle") { const v = s.vehicles[n.id]; net.send({ t: "vehicle.enter", id: n.id, seat: v?.driver ? "passenger" : "driver" }); sfx.doorOpen(); }
    else if (n.kind === "checkpoint" && s.mission) { net.send({ t: "mission.checkpoint", id: s.mission.def.id, index: s.mission.index, p: [playerPos.x, playerPos.y, playerPos.z] }); if (s.mission.def.kind === "photo") { sfx.camera(); s.set({ toasts: s.toasts }); flash(); } }
    else if (n.kind === "landmark") { const l = LANDMARKS.find(x => x.id === n.id)!; s.toast(s.settings.lang === "english" ? l.blurb : l.blurbHi); if (n.id === "naveen_market" || n.id === "garage") s.set({ paused: true, screen: "play" }); if (n.id === "naveen_market") window.dispatchEvent(new CustomEvent("kv:shop")); if (n.id === "garage") window.dispatchEvent(new CustomEvent("kv:garage")); }
    void MISSIONS;
  }
  useEffect(() => { gl.domElement.tabIndex = 0; }, [gl]);
  // QA hook (only when NEXT_PUBLIC_QA=1): lets automated browser tests teleport and read state. Server still validates speed, so
  // a teleport is followed by a server snap unless the test moves gradually; tests use small hops.
  useEffect(() => { if (process.env.NEXT_PUBLIC_QA !== "1") return; (window as unknown as { __kv?: unknown }).__kv = {
    pos: () => [playerPos.x, playerPos.y, playerPos.z], hop: (x: number, z: number) => { const rb = body.current; if (rb) { rb.setNextKinematicTranslation({ x, y: 1.95, z }); playerPos.set(x, 1, z); } },
    state: () => { const s = useStore.getState(); return { screen: s.screen, players: Object.keys(s.players).length, nearby: s.nearby, mission: s.mission?.def.id, coins: s.profile?.coins, inVehicle: s.inVehicle, dialogue: s.dialogue, fps: s.fps, ping: s.ping }; } }; }, []);

  return (
    <>
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[SPAWN_POINT[0], SPAWN_POINT[1] + 1, SPAWN_POINT[2]]} enabledRotations={[false, false, false]}>
        <CapsuleCollider args={[0.55, 0.35]} />
      </RigidBody>
      <group ref={vis} visible={!inVehicle || seat === "passenger"}><Avatar appearance={appearance} anim={animState} name={name} nameColor="#ffd23f" /></group>
    </>
  );
}
function lerpAngle(a: number, b: number, t: number) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; }
function flash() { const el = document.createElement("div"); el.style.cssText = "position:fixed;inset:0;background:#fff;opacity:.9;z-index:50;pointer-events:none;transition:opacity .35s"; document.body.appendChild(el); requestAnimationFrame(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 400); }); }
