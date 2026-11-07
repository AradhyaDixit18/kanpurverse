"use client";
/** Vehicles: procedural Indian-city vehicle meshes (auto, hatchback, sedan, SUV, bike, scooter) with spinning wheels, steering,
 * brake/head lights. Driver runs an arcade model on a Rapier dynamic body and streams state; others interpolate. */
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { VEHICLE_SPAWNS, type VehicleKind, type VehicleSnapshot } from "@kanpurverse/shared";
import { useStore } from "../state/store";
import { net, vehicleBuf } from "../net/client";
import { input, pollKeys, once, camYaw } from "./input";
import { sfx } from "../audio/sfx";
import { NameTag } from "./Avatar";

export const SPECS: Record<VehicleKind, { accel: number; max: number; turn: number; size: [number, number, number]; seats: number; wheelR: number }> = {
  hatchback: { accel: 10, max: 26, turn: 2.0, size: [1.75, 1.45, 3.8], seats: 2, wheelR: 0.32 }, sedan: { accel: 11, max: 32, turn: 1.8, size: [1.85, 1.4, 4.6], seats: 2, wheelR: 0.33 }, suv: { accel: 9.5, max: 30, turn: 1.7, size: [2.05, 1.85, 4.8], seats: 2, wheelR: 0.4 },
  bike: { accel: 13, max: 36, turn: 2.7, size: [0.7, 1.1, 2.1], seats: 2, wheelR: 0.32 }, scooter: { accel: 8, max: 20, turn: 2.9, size: [0.7, 1.1, 1.8], seats: 2, wheelR: 0.26 }, auto: { accel: 7, max: 17, turn: 2.5, size: [1.45, 1.75, 2.8], seats: 2, wheelR: 0.28 },
};
import { vehicleTelemetry } from "./refs";
export { vehicleTelemetry };

export function Vehicles() { const vehicles = useStore(s => s.vehicles); return <>{Object.values(vehicles).map(v => <Vehicle key={v.id} snap={v} />)}</>; }

function Vehicle({ snap }: { snap: VehicleSnapshot }) {
  const body = useRef<RapierRigidBody>(null); const vis = useRef<THREE.Group>(null); const selfId = useStore(s => s.selfId); const isDriver = snap.driver === selfId;
  const speed = useRef(0); const steer = useRef(0); const yaw = useRef(Math.atan2(2 * (snap.q[3] * snap.q[1]), 1 - 2 * snap.q[1] * snap.q[1])); const spec = SPECS[snap.kind]; const color = VEHICLE_SPAWNS.find(s => s.id === snap.id)?.color ?? 0xffffff;
  const lastHorn = useRef(0); const q = useMemo(() => new THREE.Quaternion(), []); const state = useRef({ speed: 0, steer: 0, brake: false });
  useEffect(() => { if (!isDriver) { speed.current = 0; } return () => { if (isDriver) { sfx.engine(false); vehicleTelemetry.kind = ""; } }; }, [isDriver]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05); const rb = body.current; if (!rb) return; const s = useStore.getState();
    if (isDriver) {
      pollKeys(); const paused = s.paused || !!s.dialogue;
      const fwd = paused ? 0 : input.fwd, st = paused ? 0 : input.right; const brake = input.jump && !paused;
      // feedback from the physics step: if a wall/car stopped us, the commanded speed follows the real velocity (speedo stays honest)
      { const lv = rb.linvel(); const actual = lv.x * Math.sin(yaw.current) + lv.z * Math.cos(yaw.current); if (Math.abs(actual) < Math.abs(speed.current) - 2) speed.current = THREE.MathUtils.lerp(speed.current, actual, 0.6); }
      // smooth throttle: accelerate toward target, natural drag, strong handbrake
      const drag = 0.9 + Math.abs(speed.current) * 0.06; const target = fwd > 0 ? spec.max : fwd < 0 ? -spec.max * 0.4 : 0;
      if (fwd !== 0 && !brake) speed.current += Math.sign(target - speed.current) * spec.accel * dt * (Math.abs(speed.current) < Math.abs(target) ? 1 : 0.5); else speed.current -= Math.sign(speed.current) * Math.min(Math.abs(speed.current), (brake ? 22 : drag) * dt);
      speed.current = THREE.MathUtils.clamp(speed.current, -spec.max * 0.4, spec.max); if (Math.abs(speed.current) < 0.03) speed.current = 0;
      steer.current = THREE.MathUtils.lerp(steer.current, st, 1 - Math.exp(-dt * 10));
      const grip = Math.min(1, Math.abs(speed.current) / 5); yaw.current -= steer.current * spec.turn * dt * grip * Math.sign(speed.current || 1) * (1 - Math.min(0.45, Math.abs(speed.current) / spec.max * 0.45));
      const vx = Math.sin(yaw.current) * speed.current, vz = Math.cos(yaw.current) * speed.current;
      const vyNow = rb.linvel().y; rb.setLinvel({ x: vx, y: Math.max(-25, Math.min(vyNow, 1.5)), z: vz }, true); // never launch upward: clamp vertical velocity q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current); rb.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
      const p = rb.translation(); net.sendVehicle(snap.id, [p.x, p.y, p.z], [q.x, q.y, q.z, q.w], speed.current);
      sfx.engine(true, Math.abs(speed.current)); vehicleTelemetry.speed = Math.abs(speed.current); vehicleTelemetry.kind = snap.kind;
      if ((input.horn || once("KeyH")) && performance.now() - lastHorn.current > 600) { lastHorn.current = performance.now(); sfx.horn(); }
      if (!s.settings.reduceMotion && Math.abs(speed.current) > 2) camYaw.v = lerpAngle(camYaw.v, yaw.current + Math.PI, 1 - Math.exp(-dt * 2.2));
      if (vis.current) { vis.current.position.set(p.x, p.y, p.z); vis.current.quaternion.copy(q); vis.current.rotation.z = -steer.current * 0.03 * grip; }
      state.current = { speed: speed.current, steer: steer.current, brake };
    } else {
      const buf = vehicleBuf.get(snap.id); const tgt = buf?.length ? buf[buf.length - 1] : { p: snap.p, q: snap.q, v: snap.v };
      const cur = rb.translation(); const t = 1 - Math.exp(-dt * 10);
      const nx = THREE.MathUtils.lerp(cur.x, tgt.p[0], t), ny = Math.max(spec.size[1] / 2 + 0.05, THREE.MathUtils.lerp(cur.y, tgt.p[1], t)), nz = THREE.MathUtils.lerp(cur.z, tgt.p[2], t);
      rb.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
      const cq = rb.rotation(); const tq = new THREE.Quaternion(tgt.q[0], tgt.q[1], tgt.q[2], tgt.q[3]); const nq = new THREE.Quaternion(cq.x, cq.y, cq.z, cq.w).slerp(tq, t); rb.setNextKinematicRotation({ x: nq.x, y: nq.y, z: nq.z, w: nq.w });
      if (vis.current) { vis.current.position.set(nx, ny, nz); vis.current.quaternion.copy(nq); }
      state.current = { speed: tgt.v, steer: 0, brake: false };
    }
  });

  const driverName = useStore(s => snap.driver ? s.players[snap.driver]?.name : undefined);
  return (
    <>
      <RigidBody ref={body} key={isDriver ? "dyn" : "kin"} type={isDriver ? "dynamic" : "kinematicPosition"} colliders={false} position={[snap.p[0], Math.max(snap.p[1], spec.size[1] / 2 + 0.05), snap.p[2]]} quaternion={snap.q} mass={900} linearDamping={0.6} angularDamping={5} enabledRotations={[false, true, false]} ccd>
        <CuboidCollider args={[spec.size[0] / 2, spec.size[1] / 2, spec.size[2] / 2]} />
      </RigidBody>
      <group ref={vis} position={snap.p}><VehicleMesh kind={snap.kind} color={color} state={state} />{driverName && <NameTag text={driverName} y={spec.size[1] + 0.7} />}</group>
    </>
  );
}

/** Procedural vehicle. `state` (optional ref) drives wheel spin, steering and brake lights; `wheelSpin` spins wheels constantly (traffic). */
export function VehicleMesh({ kind, color, state, wheelSpin, stoppedRef }: { kind: VehicleKind; color: number; state?: React.RefObject<{ speed: number; steer: number; brake: boolean }>; wheelSpin?: boolean; stoppedRef?: React.RefObject<boolean> }) {
  const spec = SPECS[kind]; const [w, h, l] = spec.size; const R = spec.wheelR;
  const paint = useMemo(() => new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.3 }), [color]);
  const trim = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.6, metalness: 0.3 }), []);
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x8ec5ff, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.7 }), []);
  const tyre = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 }), []); const rim = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xc9ccd1, metalness: 0.8, roughness: 0.3 }), []);
  const brake = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x6b0c1b, emissive: 0xc8102e, emissiveIntensity: 0.4 }), []);
  const head = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2cc, emissiveIntensity: 1.2 }), []);
  const wheels = useRef<THREE.Group[]>([]); const fronts = useRef<THREE.Group[]>([]); const spin = useRef(0);
  useFrame((_, dt) => {
    const sp = state?.current?.speed ?? (wheelSpin && !stoppedRef?.current ? 8 : 0); spin.current += sp * dt / R;
    for (const g of wheels.current) if (g) g.rotation.x = spin.current;
    const st = state?.current?.steer ?? 0; for (const g of fronts.current) if (g) g.rotation.y = -st * 0.45;
    const night = (() => { const t = useStore.getState().worldTime; return t < 0.23 || t > 0.77; })();
    brake.emissiveIntensity = state?.current?.brake || stoppedRef?.current ? 2.2 : night ? 0.8 : 0.3; head.emissiveIntensity = night ? 2.5 : 0.6;
  });
  const Wheel = ({ x, z, i, front, width = 0.26 }: { x: number; z: number; i: number; front?: boolean; width?: number }) => (
    <group position={[x, -h / 2 + R, z]} ref={el => { if (el && front) fronts.current[i] = el; }}>
      <group ref={el => { if (el) wheels.current[i] = el; }}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={tyre} castShadow><cylinderGeometry args={[R, R, width, 16]} /></mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} material={rim}><cylinderGeometry args={[R * 0.55, R * 0.55, width + 0.02, 8]} /></mesh>
      </group>
    </group>);
  if (kind === "bike" || kind === "scooter") {
    const sc = kind === "scooter";
    return <group>
      <mesh position={[0, 0.05, 0]} material={paint} castShadow><boxGeometry args={[0.36, 0.3, l * 0.55]} /></mesh>
      {sc && <mesh position={[0, -0.1, l * 0.1]} material={paint}><boxGeometry args={[0.5, 0.12, l * 0.5]} /></mesh>}
      <mesh position={[0, 0.3, -l * 0.12]} material={trim}><boxGeometry args={[0.42, 0.14, 0.75]} /></mesh>{/* seat */}
      <mesh position={[0, 0.25, l * 0.3]} material={trim}><cylinderGeometry args={[0.04, 0.04, 0.5]} /></mesh>{/* steering column */}
      <mesh position={[0, 0.45, l * 0.3]} rotation={[0, 0, Math.PI / 2]} material={trim}><cylinderGeometry args={[0.025, 0.025, 0.62]} /></mesh>{/* handlebar */}
      {sc && <mesh position={[0, 0.15, l * 0.36]} material={paint}><boxGeometry args={[0.5, 0.5, 0.12]} /></mesh>}
      <mesh position={[0, 0.3, l * 0.42]} material={head}><sphereGeometry args={[0.07]} /></mesh>
      <mesh position={[0, 0.2, -l * 0.46]} material={brake}><boxGeometry args={[0.12, 0.08, 0.03]} /></mesh>
      <Wheel x={0} z={l * 0.38} i={0} front width={0.12} /><Wheel x={0} z={-l * 0.38} i={1} width={0.14} />
    </group>;
  }
  if (kind === "auto") return <group>
    <mesh position={[0, -0.25, 0]} material={paint} castShadow><boxGeometry args={[w, h * 0.45, l]} /></mesh>{/* lower body */}
    <mesh position={[0, h * 0.2, -0.25]} material={trim}><boxGeometry args={[w * 0.96, h * 0.1, l * 0.78]} /></mesh>
    <mesh position={[0, h * 0.5, -0.35]}><boxGeometry args={[w * 0.1, h * 0.5, l * 0.05]} /><primitive object={trim} attach="material" /></mesh>
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * (w / 2 - 0.03), h * 0.42, -0.9]} material={trim}><boxGeometry args={[0.06, h * 0.55, 0.08]} /></mesh>)}
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * (w / 2 - 0.03), h * 0.42, 0.5]} material={trim}><boxGeometry args={[0.06, h * 0.55, 0.08]} /></mesh>)}
    <mesh position={[0, h * 0.42, l * 0.42]} material={glass}><boxGeometry args={[w * 0.9, h * 0.5, 0.05]} /></mesh>{/* windshield */}
    <mesh position={[0, h * 0.72, -0.2]}><boxGeometry args={[w + 0.08, 0.07, l * 0.9]} /><meshStandardMaterial color="#f2b134" roughness={0.6} /></mesh>{/* canopy */}
    <mesh position={[0, h * 0.72 + 0.1, -0.2]}><boxGeometry args={[w * 0.5, 0.14, l * 0.4]} /><meshStandardMaterial color="#1a1a1c" /></mesh>
    <mesh position={[0, -0.05, l * 0.5]} material={head}><sphereGeometry args={[0.12]} /></mesh>
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * (w / 2 - 0.2), -0.15, -l / 2 - 0.01]} material={brake}><boxGeometry args={[0.2, 0.12, 0.04]} /></mesh>)}
    <Wheel x={0} z={l * 0.4} i={0} front width={0.16} /><Wheel x={-w / 2 + 0.12} z={-l * 0.3} i={1} width={0.18} /><Wheel x={w / 2 - 0.12} z={-l * 0.3} i={2} width={0.18} />
  </group>;
  const cab = kind === "suv" ? 0.62 : 0.55; const cabH = kind === "suv" ? 0.55 : 0.5;
  return <group>
    <mesh position={[0, -0.12, 0]} material={paint} castShadow><boxGeometry args={[w, h * 0.48, l, 1, 1, 1]} /></mesh>{/* body */}
    <mesh position={[0, -0.36, 0]} material={trim}><boxGeometry args={[w + 0.02, 0.12, l + 0.02]} /></mesh>{/* sill */}
    <mesh position={[0, h * cabH * 0.5 + 0.02, -0.15]} material={paint} castShadow><boxGeometry args={[w * 0.88, h * cabH, l * cab]} /></mesh>{/* cabin */}
    <mesh position={[0, h * cabH * 0.5 + 0.05, l * cab / 2 - 0.15 + 0.01]} rotation={[-0.35, 0, 0]} material={glass}><boxGeometry args={[w * 0.82, h * cabH * 0.9, 0.04]} /></mesh>{/* windshield */}
    <mesh position={[0, h * cabH * 0.5 + 0.05, -l * cab / 2 - 0.15 - 0.01]} rotation={[0.3, 0, 0]} material={glass}><boxGeometry args={[w * 0.82, h * cabH * 0.8, 0.04]} /></mesh>
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * (w * 0.44 + 0.005), h * cabH * 0.55, -0.15]} material={glass}><boxGeometry args={[0.02, h * cabH * 0.6, l * cab * 0.8]} /></mesh>)}
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * (w / 2 - 0.25), -0.08, l / 2 + 0.01]} material={head}><boxGeometry args={[0.32, 0.14, 0.05]} /></mesh>)}
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * (w / 2 - 0.25), -0.08, -l / 2 - 0.01]} material={brake}><boxGeometry args={[0.32, 0.14, 0.05]} /></mesh>)}
    <mesh position={[0, -0.2, l / 2 + 0.02]} material={trim}><boxGeometry args={[w * 0.5, 0.14, 0.04]} /></mesh>{/* grille */}
    <Wheel x={-w / 2} z={l * 0.32} i={0} front /><Wheel x={w / 2} z={l * 0.32} i={1} front /><Wheel x={-w / 2} z={-l * 0.32} i={2} /><Wheel x={w / 2} z={-l * 0.32} i={3} />
  </group>;
}
function lerpAngle(a: number, b: number, t: number) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; }
