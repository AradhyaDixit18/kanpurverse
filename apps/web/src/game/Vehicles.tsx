"use client";
/** Vehicles: procedural car/auto/bike meshes. Driver runs a simple arcade model on a Rapier dynamic body and streams state; others interpolate. */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { VEHICLE_SPAWNS, type VehicleKind, type VehicleSnapshot } from "@kanpurverse/shared";
import { useStore } from "../state/store";
import { net, vehicleBuf } from "../net/client";
import { input, pollKeys, once, camYaw } from "./input";
import { sfx } from "../audio/sfx";
import { NameTag } from "./Avatar";

const SPECS: Record<VehicleKind, { accel: number; max: number; turn: number; size: [number, number, number]; seats: number }> = {
  hatchback: { accel: 9, max: 24, turn: 1.9, size: [1.8, 1.4, 3.8], seats: 2 }, sedan: { accel: 10, max: 30, turn: 1.7, size: [1.9, 1.35, 4.6], seats: 2 }, suv: { accel: 8.5, max: 28, turn: 1.6, size: [2.1, 1.8, 4.8], seats: 2 },
  bike: { accel: 12, max: 34, turn: 2.6, size: [0.7, 1.1, 2.1], seats: 2 }, scooter: { accel: 7, max: 18, turn: 2.8, size: [0.7, 1.1, 1.8], seats: 2 }, auto: { accel: 6, max: 16, turn: 2.4, size: [1.5, 1.7, 2.8], seats: 2 },
};

export function Vehicles() { const vehicles = useStore(s => s.vehicles); return <>{Object.values(vehicles).map(v => <Vehicle key={v.id} snap={v} />)}</>; }

function Vehicle({ snap }: { snap: VehicleSnapshot }) {
  const body = useRef<RapierRigidBody>(null); const vis = useRef<THREE.Group>(null); const selfId = useStore(s => s.selfId); const isDriver = snap.driver === selfId;
  const speed = useRef(0); const yaw = useRef(Math.atan2(2 * (snap.q[3] * snap.q[1]), 1 - 2 * snap.q[1] * snap.q[1])); const spec = SPECS[snap.kind]; const color = VEHICLE_SPAWNS.find(s => s.id === snap.id)?.color ?? 0xffffff;
  const lastHorn = useRef(0); const q = useMemo(() => new THREE.Quaternion(), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05); const rb = body.current; if (!rb) return; const s = useStore.getState();
    if (isDriver) {
      pollKeys(); const paused = s.paused || !!s.dialogue;
      const fwd = paused ? 0 : input.fwd, steer = paused ? 0 : input.right;
      const brake = input.jump; // space = handbrake
      speed.current += (fwd * spec.accel - Math.sign(speed.current) * (brake ? 20 : 1.5)) * dt;
      speed.current = THREE.MathUtils.clamp(speed.current, -spec.max * 0.4, spec.max);
      if (Math.abs(speed.current) < 0.05) speed.current = 0;
      yaw.current -= steer * spec.turn * dt * Math.min(1, Math.abs(speed.current) / 6) * Math.sign(speed.current || 1);
      const vx = Math.sin(yaw.current) * speed.current, vz = Math.cos(yaw.current) * speed.current;
      rb.setLinvel({ x: vx, y: rb.linvel().y, z: vz }, true);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current); rb.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
      const p = rb.translation();
      net.sendVehicle(snap.id, [p.x, p.y, p.z], [q.x, q.y, q.z, q.w], speed.current);
      sfx.engine(true, Math.abs(speed.current));
      if ((input.horn || once("KeyH")) && performance.now() - lastHorn.current > 600) { lastHorn.current = performance.now(); sfx.horn(); }
      // keep camera following vehicle heading loosely
      if (!s.settings.reduceMotion && Math.abs(speed.current) > 2) camYaw.v = lerpAngle(camYaw.v, yaw.current + Math.PI, 0.04);
      if (vis.current) { vis.current.position.set(p.x, p.y, p.z); vis.current.quaternion.copy(q); }
    } else {
      // interpolate from buffer (100 ms behind)
      const buf = vehicleBuf.get(snap.id); const target = buf?.length ? buf[buf.length - 1] : { p: snap.p, q: snap.q, v: snap.v };
      const cur = rb.translation(); const t = THREE.MathUtils.clamp(dt * 10, 0, 1);
      const nx = THREE.MathUtils.lerp(cur.x, target.p[0], t), ny = THREE.MathUtils.lerp(cur.y, target.p[1], t), nz = THREE.MathUtils.lerp(cur.z, target.p[2], t);
      rb.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
      const cq = rb.rotation(); const tq = new THREE.Quaternion(target.q[0], target.q[1], target.q[2], target.q[3]); const nq = new THREE.Quaternion(cq.x, cq.y, cq.z, cq.w).slerp(tq, t); rb.setNextKinematicRotation({ x: nq.x, y: nq.y, z: nq.z, w: nq.w });
      if (vis.current) { vis.current.position.set(nx, ny, nz); vis.current.quaternion.copy(nq); }
      if (snap.passenger === selfId || snap.driver === selfId) { /* handled */ }
    }
  });

  const driverName = useStore(s => snap.driver ? s.players[snap.driver]?.name : undefined);
  return (
    <>
      <RigidBody ref={body} key={isDriver ? "dyn" : "kin"} type={isDriver ? "dynamic" : "kinematicPosition"} colliders={false} position={snap.p} quaternion={snap.q} mass={900} linearDamping={0.6} angularDamping={5} enabledRotations={[false, true, false]} ccd>
        <CuboidCollider args={[spec.size[0] / 2, spec.size[1] / 2, spec.size[2] / 2]} />
      </RigidBody>
      <group ref={vis} position={snap.p}><VehicleMesh kind={snap.kind} color={color} />{driverName && <NameTag text={driverName} y={spec.size[1] + 0.6} />}</group>
    </>
  );
}

export function VehicleMesh({ kind, color }: { kind: VehicleKind; color: number }) {
  const spec = SPECS[kind]; const [w, h, l] = spec.size; const paint = useMemo(() => new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.35 }), [color]);
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x9fd3ff, metalness: 0.8, roughness: 0.1, transparent: true, opacity: 0.8 }), []);
  const tyre = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }), []);
  const Wheel = ({ x, z }: { x: number; z: number }) => <mesh position={[x, -h / 2 + 0.3, z]} rotation={[0, 0, Math.PI / 2]} material={tyre} castShadow><cylinderGeometry args={[0.32, 0.32, 0.25, 12]} /></mesh>;
  if (kind === "bike" || kind === "scooter") return <group position={[0, 0, 0]}>
    <mesh position={[0, 0, 0]} material={paint} castShadow><boxGeometry args={[0.4, 0.4, l * 0.6]} /></mesh>
    <mesh position={[0, 0.25, -l * 0.15]} material={tyre}><boxGeometry args={[0.45, 0.15, 0.7]} /></mesh>
    <mesh position={[0, 0.35, l * 0.32]} material={paint}><boxGeometry args={[0.6, 0.08, 0.1]} /></mesh>
    <mesh position={[0, -h / 2 + 0.3, l * 0.38]} rotation={[0, 0, Math.PI / 2]} material={tyre}><cylinderGeometry args={[0.3, 0.3, 0.12, 12]} /></mesh>
    <mesh position={[0, -h / 2 + 0.3, -l * 0.38]} rotation={[0, 0, Math.PI / 2]} material={tyre}><cylinderGeometry args={[0.3, 0.3, 0.12, 12]} /></mesh>
    <mesh position={[0, 0.1, l * 0.42]}><sphereGeometry args={[0.08]} /><meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={1} /></mesh></group>;
  if (kind === "auto") return <group>
    <mesh position={[0, -0.1, 0]} material={paint} castShadow><boxGeometry args={[w, h * 0.55, l]} /></mesh>
    <mesh position={[0, h * 0.3, -0.2]} material={paint}><boxGeometry args={[w, h * 0.5, l * 0.8]} /></mesh>
    <mesh position={[0, h * 0.25, l * 0.38]} material={glass}><boxGeometry args={[w * 0.9, h * 0.4, 0.05]} /></mesh>
    <mesh position={[0, h * 0.58, -0.2]}><boxGeometry args={[w + 0.1, 0.06, l * 0.85]} /><meshStandardMaterial color="#f2b134" /></mesh>
    <Wheel x={0} z={l * 0.4} /><Wheel x={-w / 2 + 0.1} z={-l * 0.3} /><Wheel x={w / 2 - 0.1} z={-l * 0.3} /></group>;
  return <group>
    <mesh position={[0, -0.15, 0]} material={paint} castShadow><boxGeometry args={[w, h * 0.5, l]} /></mesh>
    <mesh position={[0, h * 0.25, -0.2]} material={paint} castShadow><boxGeometry args={[w * 0.9, h * 0.5, l * 0.55]} /></mesh>
    <mesh position={[0, h * 0.25, l * 0.08]} material={glass}><boxGeometry args={[w * 0.85, h * 0.4, 0.06]} /></mesh>
    <mesh position={[0, h * 0.25, -l * 0.48]} material={glass}><boxGeometry args={[w * 0.85, h * 0.35, 0.06]} /></mesh>
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * (w / 2 - 0.3), -0.1, l / 2 + 0.01]}><boxGeometry args={[0.3, 0.15, 0.05]} /><meshStandardMaterial color="#fff" emissive="#ffffff" emissiveIntensity={1.2} /></mesh>)}
    {[-1, 1].map(sx => <mesh key={sx} position={[sx * (w / 2 - 0.3), -0.1, -l / 2 - 0.01]}><boxGeometry args={[0.3, 0.15, 0.05]} /><meshStandardMaterial color="#c8102e" emissive="#c8102e" emissiveIntensity={1} /></mesh>)}
    <Wheel x={-w / 2} z={l * 0.32} /><Wheel x={w / 2} z={l * 0.32} /><Wheel x={-w / 2} z={-l * 0.32} /><Wheel x={w / 2} z={-l * 0.32} /></group>;
}
function lerpAngle(a: number, b: number, t: number) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; }
