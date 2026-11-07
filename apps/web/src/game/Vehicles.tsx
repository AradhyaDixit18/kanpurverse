"use client";
/** Vehicles: procedural Indian-city vehicle meshes (auto, hatchback, sedan, SUV, bike, scooter) with spinning wheels, steering,
 * brake/head lights. Driver runs an arcade model on a Rapier dynamic body and streams state; others interpolate. */
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider, type RapierRigidBody, useBeforePhysicsStep, useRapier } from "@react-three/rapier";
import * as THREE from "three";
import { VEHICLE_SPAWNS, type VehicleKind, type VehicleSnapshot, vehicleSeatPose } from "@kanpurverse/shared";
import { useStore } from "../state/store";
import { net, vehicleBuf, vehicleCorrections } from "../net/client";
import { input, pollKeys, once, camYaw } from "./input";
import { sfx } from "../audio/sfx";
import { puff } from "./Dust";
import { Avatar, NameTag } from "./Avatar";

import { SPECS } from "./vehicleSpecs";
export { SPECS } from "./vehicleSpecs";
import { stepDriving, applyVehicleMotion, yawFromQuaternion } from "./driving";
import { vehicleTelemetry, vehicleRuntime } from "./refs";
export { vehicleTelemetry };

export function Vehicles() { const vehicles = useStore(s => s.vehicles); const selfId = useStore(s => s.selfId); return <>{Object.values(vehicles).map(v => <Vehicle key={v.id + ":" + (v.driver === selfId)} snap={v} />)}</>; }

function Vehicle({ snap }: { snap: VehicleSnapshot }) {
  const body = useRef<RapierRigidBody>(null); const vis = useRef<THREE.Group>(null); const selfId = useStore(s => s.selfId); const isDriver = snap.driver === selfId;
  const initialPose = useRef({ p: snap.p, q: snap.q });
  const { world, rapier } = useRapier();
  const speed = useRef(0); const steer = useRef(0); const yaw = useRef(yawFromQuaternion(snap.q)); const spec = SPECS[snap.kind]; const color = VEHICLE_SPAWNS.find(s => s.id === snap.id)?.color ?? 0xffffff;
  const lastHorn = useRef(0); const q = useMemo(() => new THREE.Quaternion(), []); const state = useRef({ speed: 0, steer: 0, brake: false });
  useEffect(() => {
    vehicleBuf.delete(snap.id);
    return () => {
      vehicleRuntime.delete(snap.id); vehicleCorrections.delete(snap.id);
      if (isDriver) { sfx.engine(false); vehicleTelemetry.kind = ""; }
    };
  }, [isDriver, snap.id]);

  useBeforePhysicsStep(() => {
    const dt = world.timestep; const rb = body.current; if (!rb) return; const s = useStore.getState();
    if (isDriver) {
      pollKeys(); const paused = s.paused || !!s.dialogue;
      const fwd = paused ? 0 : input.fwd, st = paused ? 0 : input.right; const brake = input.jump && !paused;
      const correction = vehicleCorrections.get(snap.id);
      if (correction) {
        vehicleCorrections.delete(snap.id);
        rb.setTranslation({ x: correction.p[0], y: correction.p[1], z: correction.p[2] }, true);
        rb.setRotation({ x: correction.q[0], y: correction.q[1], z: correction.q[2], w: correction.q[3] }, true);
        rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
        yaw.current = yawFromQuaternion(correction.q);
      }
      const lv = rb.linvel();
      const actual = lv.x * Math.sin(yaw.current) + lv.z * Math.cos(yaw.current);
      const next = stepDriving({ speed: speed.current, steer: steer.current, yaw: yaw.current }, spec, { throttle: fwd, steer: st, brake }, actual, dt);
      speed.current = next.speed; steer.current = next.steer; yaw.current = next.yaw;
      const grip = Math.min(1, Math.abs(speed.current) / 5);
      applyVehicleMotion(rb, next);
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw.current);
      const p = rb.translation(); net.sendVehicle(snap.id, [p.x, p.y, p.z], [q.x, q.y, q.z, q.w], speed.current);
      sfx.engine(true, Math.abs(speed.current)); vehicleTelemetry.speed = Math.abs(speed.current); vehicleTelemetry.kind = snap.kind;
      if ((brake && Math.abs(speed.current) > 6) || Math.abs(steer.current) > 0.8 && Math.abs(speed.current) > 12) { if (Math.random() < 0.3) puff(p.x - Math.sin(yaw.current) * spec.size[2] * 0.35, p.y - spec.size[1] / 2, p.z - Math.cos(yaw.current) * spec.size[2] * 0.35, 1.2); }
      if ((input.horn || once("KeyH")) && performance.now() - lastHorn.current > 600) { lastHorn.current = performance.now(); sfx.horn(); }
      if (once("KeyR")) { const p0 = rb.translation(); rb.setTranslation({ x: p0.x, y: spec.size[1] / 2 + 0.6, z: p0.z }, true); rb.setLinvel({ x: 0, y: 0, z: 0 }, true); speed.current = 0; s.toast("Vehicle reset"); }
      if (!s.settings.reduceMotion && Math.abs(speed.current) > 2) camYaw.v = lerpAngle(camYaw.v, yaw.current + Math.PI, 1 - Math.exp(-dt * 2.2));
      if (vis.current) { vis.current.position.set(p.x, p.y, p.z); vis.current.quaternion.copy(q); vis.current.rotation.z = (snap.kind === "bike" || snap.kind === "scooter") ? -steer.current * 0.12 * grip : 0; }
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
    const p = isDriver ? rb.translation() : rb.nextTranslation();
    vehicleRuntime.set(snap.id, { x: p.x, y: p.y, z: p.z, handle: rb.handle });
  });

  const driverName = useStore(s => snap.driver ? s.players[snap.driver]?.name : undefined);
  return (
    <>
      <RigidBody ref={body} key={isDriver ? "dyn" : "kin"} type={isDriver ? "dynamic" : "kinematicPosition"} colliders={false} position={[initialPose.current.p[0], Math.max(initialPose.current.p[1], spec.size[1] / 2 + 0.05), initialPose.current.p[2]]} quaternion={initialPose.current.q} mass={900} linearDamping={0} angularDamping={5} enabledRotations={[false, true, false]} ccd>
        {/* Arcade traction is controlled by driving.ts. Chassis-ground friction must not act as a brake;
            use Min so the road's default friction does not restore sliding drag. */}
        <CuboidCollider args={[spec.size[0] / 2, spec.size[1] / 2, spec.size[2] / 2]} friction={0} frictionCombineRule={rapier.CoefficientCombineRule.Min} restitution={0} />
      </RigidBody>
      <group ref={vis} position={initialPose.current.p} quaternion={initialPose.current.q}><VehicleMesh kind={snap.kind} color={color} state={state} /><VehicleOccupants vehicle={snap} />{driverName && <NameTag text={driverName} y={spec.size[1] + 0.7} />}</group>
    </>
  );
}

/** Procedural vehicle. `state` (optional ref) drives wheel spin, steering and brake lights; `wheelSpin` spins wheels constantly (traffic). */
export function VehicleMesh({ kind, color, state, wheelSpin, stoppedRef }: { kind: VehicleKind; color: number; state?: React.RefObject<{ speed: number; steer: number; brake: boolean }>; wheelSpin?: boolean; stoppedRef?: React.RefObject<boolean> }) {
  const spec = SPECS[kind]; const [w, h, l] = spec.size; const R = spec.wheelR;
  const paint = useMemo(() => new THREE.MeshStandardMaterial({ color, metalness: 0.6, roughness: 0.3 }), [color]);
  const trim = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.6, metalness: 0.3 }), []);
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x8ec5ff, metalness: 0.05, roughness: 0.15, transparent: true, opacity: 0.28, depthWrite: false }), []);
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
  if (kind === "bike" || kind === "scooter") {
    const sc = kind === "scooter";
    return <group>
      <mesh position={[0, 0.05, 0]} material={paint} castShadow><boxGeometry args={[0.36, 0.3, l * 0.55]} /></mesh>
      {sc && <mesh position={[0, -0.1, l * 0.1]} material={paint}><boxGeometry args={[0.5, 0.12, l * 0.5]} /></mesh>}
      <mesh position={[0, 0.3, -l * 0.12]} material={trim}><boxGeometry args={[0.42, 0.14, l * 0.5]} /></mesh>{/* seat */}
      <mesh position={[0, 0.25, l * 0.3]} material={trim}><cylinderGeometry args={[0.04, 0.04, 0.5]} /></mesh>{/* steering column */}
      <mesh position={[0, 0.45, l * 0.3]} rotation={[0, 0, Math.PI / 2]} material={trim}><cylinderGeometry args={[0.025, 0.025, 0.62]} /></mesh>{/* handlebar */}
      {sc && <mesh position={[0, 0.15, l * 0.36]} material={paint}><boxGeometry args={[0.5, 0.5, 0.12]} /></mesh>}
      <mesh position={[0, 0.3, l * 0.42]} material={head}><sphereGeometry args={[0.07]} /></mesh>
      <mesh position={[0, 0.2, -l * 0.46]} material={brake}><boxGeometry args={[0.12, 0.08, 0.03]} /></mesh>
      <VehicleWheel h={h} R={R} tyre={tyre} rim={rim} wheels={wheels} fronts={fronts} x={0} z={l * 0.38} i={0} front width={0.12} /><VehicleWheel h={h} R={R} tyre={tyre} rim={rim} wheels={wheels} fronts={fronts} x={0} z={-l * 0.38} i={1} width={0.14} />
    </group>;
  }
  if (kind === "auto") return <group>
    <mesh position={[0, -0.25, 0]} material={paint} castShadow><boxGeometry args={[w, h * 0.45, l]} /></mesh>{/* lower body */}
    <mesh position={[0, -0.08, -0.25]} material={trim}><boxGeometry args={[w * 0.96, 0.14, l * 0.78]} /></mesh>
    <mesh position={[0, h * 0.5, -0.35]}><boxGeometry args={[w * 0.1, h * 0.5, l * 0.05]} /><primitive object={trim} attach="material" /></mesh>
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * (w / 2 - 0.03), h * 0.42, -0.9]} material={trim}><boxGeometry args={[0.06, h * 0.55, 0.08]} /></mesh>)}
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * (w / 2 - 0.03), h * 0.42, 0.5]} material={trim}><boxGeometry args={[0.06, h * 0.55, 0.08]} /></mesh>)}
    <mesh position={[0, h * 0.42, l * 0.42]} material={glass}><boxGeometry args={[w * 0.9, h * 0.5, 0.05]} /></mesh>{/* windshield */}
    <mesh position={[0, h * 0.72, -0.2]}><boxGeometry args={[w + 0.08, 0.07, l * 0.9]} /><meshStandardMaterial color="#f2b134" roughness={0.6} /></mesh>{/* canopy */}
    <mesh position={[0, h * 0.72 + 0.1, -0.2]}><boxGeometry args={[w * 0.5, 0.14, l * 0.4]} /><meshStandardMaterial color="#1a1a1c" /></mesh>
    <mesh position={[0, -0.05, l * 0.5]} material={head}><sphereGeometry args={[0.12]} /></mesh>
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * (w / 2 - 0.2), -0.15, -l / 2 - 0.01]} material={brake}><boxGeometry args={[0.2, 0.12, 0.04]} /></mesh>)}
    <VehicleWheel h={h} R={R} tyre={tyre} rim={rim} wheels={wheels} fronts={fronts} x={0} z={l * 0.4} i={0} front width={0.16} /><VehicleWheel h={h} R={R} tyre={tyre} rim={rim} wheels={wheels} fronts={fronts} x={-w / 2 + 0.12} z={-l * 0.3} i={1} width={0.18} /><VehicleWheel h={h} R={R} tyre={tyre} rim={rim} wheels={wheels} fronts={fronts} x={w / 2 - 0.12} z={-l * 0.3} i={2} width={0.18} />
  </group>;
  if (kind === "erickshaw") return <group>
    <mesh position={[0, -0.3, 0]} material={paint} castShadow><boxGeometry args={[w, h * 0.35, l]} /></mesh>
    <mesh position={[0, -0.08, -0.3]} material={trim}><boxGeometry args={[w * 0.94, 0.14, l * 0.7]} /></mesh>{/* bench */}
    {[-1, 1].map(sx => [-1.1, 0.9].map(z => <mesh key={sx + "_" + z} position={[sx * (w / 2 - 0.04), h * 0.4, z]} material={trim}><boxGeometry args={[0.06, h * 0.75, 0.06]} /></mesh>))}
    <mesh position={[0, h * 0.78, -0.1]}><boxGeometry args={[w + 0.1, 0.07, l * 0.9]} /><meshStandardMaterial color="#2f6fb0" roughness={0.6} /></mesh>{/* canopy */}
    <mesh position={[0, h * 0.4, l * 0.44]} material={glass}><boxGeometry args={[w * 0.9, h * 0.5, 0.05]} /></mesh>
    <mesh position={[0, h * 0.45, -l * 0.46]}><boxGeometry args={[w * 0.9, h * 0.5, 0.05]} /><meshStandardMaterial color="#e8f0ff" /></mesh>
    <mesh position={[0, -0.1, l * 0.5]} material={head}><sphereGeometry args={[0.12]} /></mesh>
    <VehicleWheel h={h} R={R} tyre={tyre} rim={rim} wheels={wheels} fronts={fronts} x={0} z={l * 0.42} i={0} front width={0.12} /><VehicleWheel h={h} R={R} tyre={tyre} rim={rim} wheels={wheels} fronts={fronts} x={-w / 2 + 0.12} z={-l * 0.32} i={1} width={0.14} /><VehicleWheel h={h} R={R} tyre={tyre} rim={rim} wheels={wheels} fronts={fronts} x={w / 2 - 0.12} z={-l * 0.32} i={2} width={0.14} />
  </group>;
  if (kind === "bus" || kind === "truck") { const isBus = kind === "bus"; return <group>
    <mesh position={[0, -0.55, isBus ? 0 : l * 0.3]} material={paint} castShadow><boxGeometry args={[w, h * (isBus ? 0.38 : 0.35), isBus ? l : l * 0.3]} /></mesh>
    <mesh position={[0, h / 2, isBus ? 0 : l * 0.3]} material={paint} castShadow><boxGeometry args={[w, 0.12, isBus ? l : l * 0.3]} /></mesh>
    {[-1, 1].flatMap(side => (isBus ? [-0.45, -0.30, -0.15, 0, 0.15, 0.30, 0.45] : [0.16, 0.44]).map((z, i) => <mesh key={`${side}:${i}`} position={[side * (w / 2 - 0.04), h * 0.26, z * l]} material={paint}><boxGeometry args={[0.08, h * 0.5, 0.08]} /></mesh>))}
    {!isBus && [-1, 1].map(side => <mesh key={side} position={[side * (w / 2 + 0.01), h * 0.18, l * 0.3]} material={glass}><boxGeometry args={[0.02, h * 0.38, l * 0.24]} /></mesh>)}{/* body / cab */}
    {!isBus && <mesh position={[0, 0.1, -l * 0.2]} castShadow><boxGeometry args={[w, h * 0.8, l * 0.6]} /><meshStandardMaterial color="#c9ccd1" roughness={0.8} /></mesh>}{/* cargo */}
    {!isBus && <mesh position={[0, 0.1, -l * 0.2]}><boxGeometry args={[w + 0.02, h * 0.82, l * 0.61]} /><meshStandardMaterial color="#8a4a1a" transparent opacity={0.3} /></mesh>}
    {isBus && <mesh position={[0, h * 0.2, 0]} material={glass}><boxGeometry args={[w + 0.02, h * 0.35, l * 0.96]} /></mesh>}{/* window band */}
    {isBus && <mesh position={[0, -0.25, 0]}><boxGeometry args={[w + 0.02, 0.22, l * 0.96]} /><meshStandardMaterial color="#ffd23f" /></mesh>}{/* yellow band */}
    {isBus && <mesh position={[0, h * 0.5, l / 2 - 0.02]}><boxGeometry args={[w * 0.6, 0.4, 0.05]} /><meshStandardMaterial color="#111" emissive="#f2b134" emissiveIntensity={0.8} /></mesh>}{/* route board */}
    <mesh position={[0, h * 0.15, (isBus ? l / 2 : l * 0.45) + 0.01]} material={glass}><boxGeometry args={[w * 0.85, h * 0.4, 0.05]} /></mesh>
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * (w / 2 - 0.35), -0.3, (isBus ? l / 2 : l * 0.45) + 0.02]} material={head}><boxGeometry args={[0.35, 0.2, 0.05]} /></mesh>)}
    {[-1, 1].map(sx => <mesh key={"b" + sx} position={[sx * (w / 2 - 0.35), -0.3, -l / 2 - 0.02]} material={brake}><boxGeometry args={[0.35, 0.2, 0.05]} /></mesh>)}
    <VehicleWheel h={h} R={R} tyre={tyre} rim={rim} wheels={wheels} fronts={fronts} x={-w / 2} z={l * 0.36} i={0} front width={0.35} /><VehicleWheel h={h} R={R} tyre={tyre} rim={rim} wheels={wheels} fronts={fronts} x={w / 2} z={l * 0.36} i={1} front width={0.35} /><VehicleWheel h={h} R={R} tyre={tyre} rim={rim} wheels={wheels} fronts={fronts} x={-w / 2} z={-l * 0.3} i={2} width={0.35} /><VehicleWheel h={h} R={R} tyre={tyre} rim={rim} wheels={wheels} fronts={fronts} x={w / 2} z={-l * 0.3} i={3} width={0.35} />
    {isBus && <><VehicleWheel h={h} R={R} tyre={tyre} rim={rim} wheels={wheels} fronts={fronts} x={-w / 2} z={-l * 0.18} i={4} width={0.35} /><VehicleWheel h={h} R={R} tyre={tyre} rim={rim} wheels={wheels} fronts={fronts} x={w / 2} z={-l * 0.18} i={5} width={0.35} /></>}
  </group>; }
  const cab = kind === "suv" ? 0.62 : 0.55; const cabH = kind === "suv" ? 0.55 : 0.5;
  return <group>
    <mesh position={[0, -0.12, 0]} material={paint} castShadow><boxGeometry args={[w, h * 0.48, l, 1, 1, 1]} /></mesh>{/* body */}
    <mesh position={[0, -0.36, 0]} material={trim}><boxGeometry args={[w + 0.02, 0.12, l + 0.02]} /></mesh>{/* sill */}
    <mesh position={[0, h * cabH + 0.02, -0.15]} material={paint} castShadow><boxGeometry args={[w * 0.88, 0.08, l * cab]} /></mesh>
    {[-1, 1].flatMap(side => [-1, 1].map(end => <mesh key={`${side}:${end}`} position={[side * w * 0.42, h * cabH * 0.5 + 0.02, end * l * cab / 2 - 0.15]} material={paint}><boxGeometry args={[0.07, h * cabH, 0.07]} /></mesh>))}{/* cabin */}
    <mesh position={[0, h * cabH * 0.5 + 0.05, l * cab / 2 - 0.15 + 0.01]} rotation={[-0.35, 0, 0]} material={glass}><boxGeometry args={[w * 0.82, h * cabH * 0.9, 0.04]} /></mesh>{/* windshield */}
    <mesh position={[0, h * cabH * 0.5 + 0.05, -l * cab / 2 - 0.15 - 0.01]} rotation={[0.3, 0, 0]} material={glass}><boxGeometry args={[w * 0.82, h * cabH * 0.8, 0.04]} /></mesh>
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * (w * 0.44 + 0.005), h * cabH * 0.55, -0.15]} material={glass}><boxGeometry args={[0.02, h * cabH * 0.6, l * cab * 0.8]} /></mesh>)}
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * (w / 2 - 0.25), -0.08, l / 2 + 0.01]} material={head}><boxGeometry args={[0.32, 0.14, 0.05]} /></mesh>)}
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * (w / 2 - 0.25), -0.08, -l / 2 - 0.01]} material={brake}><boxGeometry args={[0.32, 0.14, 0.05]} /></mesh>)}
    <mesh position={[0, -0.2, l / 2 + 0.02]} material={trim}><boxGeometry args={[w * 0.5, 0.14, 0.04]} /></mesh>{/* grille */}
    {kind === "taxi" && <mesh position={[0, h * cabH + 0.2, -0.15]}><boxGeometry args={[0.6, 0.22, 0.25]} /><meshStandardMaterial color="#111" emissive="#ffd23f" emissiveIntensity={0.9} /></mesh>}
    <VehicleWheel h={h} R={R} tyre={tyre} rim={rim} wheels={wheels} fronts={fronts} x={-w / 2} z={l * 0.32} i={0} front /><VehicleWheel h={h} R={R} tyre={tyre} rim={rim} wheels={wheels} fronts={fronts} x={w / 2} z={l * 0.32} i={1} front /><VehicleWheel h={h} R={R} tyre={tyre} rim={rim} wheels={wheels} fronts={fronts} x={-w / 2} z={-l * 0.32} i={2} /><VehicleWheel h={h} R={R} tyre={tyre} rim={rim} wheels={wheels} fronts={fronts} x={w / 2} z={-l * 0.32} i={3} />
  </group>;
}
function lerpAngle(a: number, b: number, t: number) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; }

/** Stable component identity keeps wheel transforms mounted across 20 Hz snapshots. */
function VehicleWheel({ x, z, i, front, width = 0.26, h, R, tyre, rim, wheels, fronts }: {
  x: number; z: number; i: number; front?: boolean; width?: number; h: number; R: number;
  tyre: THREE.Material; rim: THREE.Material; wheels: React.RefObject<THREE.Group[]>; fronts: React.RefObject<THREE.Group[]>;
}) {
  return <group position={[x, -h / 2 + R, z]} ref={el => { if (el && front) fronts.current[i] = el; }}>
    <group ref={el => { if (el) wheels.current[i] = el; }}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={tyre} castShadow><cylinderGeometry args={[R, R, width, 16]} /></mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} material={rim}><cylinderGeometry args={[R * 0.55, R * 0.55, width + 0.02, 8]} /></mesh>
    </group>
  </group>;
}

/** Occupants share the vehicle's predicted/interpolated parent transform; no duplicate body collider. */
function VehicleOccupants({ vehicle }: { vehicle: VehicleSnapshot }) {
  const players = useStore(s => s.players); const selfId = useStore(s => s.selfId);
  return <>{(["driver", "passenger"] as const).map(seat => {
    const id = vehicle[seat], player = id ? players[id] : undefined; if (!player || !id) return null;
    const pose = vehicleSeatPose(vehicle.kind, seat);
    return <SeatedOccupant key={id} id={id} self={id === selfId} seat={seat} pose={pose} appearance={player.appearance} />;
  })}</>;
}
function SeatedOccupant({ id, self, seat, pose, appearance }: { id: string; self: boolean; seat: "driver" | "passenger"; pose: ReturnType<typeof vehicleSeatPose>; appearance: import("@kanpurverse/shared").Appearance }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => { if (group.current) group.current.visible = !self || camYaw.mode !== 3; });
  return <group name={`occupant:${id}:${seat}`} ref={group} position={pose.p}><Avatar appearance={appearance} anim={seat === "driver" ? "drive" : "sit"} scale={pose.scale} /></group>;
}
