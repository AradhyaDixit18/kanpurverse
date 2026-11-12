"use client";
/** Vehicles: procedural Indian-city vehicle meshes (auto, hatchback, sedan, SUV, bike, scooter) with spinning wheels, steering,
 * brake/head lights. Driver runs an arcade model on a Rapier dynamic body and streams state; others interpolate. */
import { VehicleModel, type VehicleVisualState } from "./vehicleModels";
import { VEHICLE_INFO, TWO_WHEELERS } from "@kanpurverse/shared";
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
  const lastHorn = useRef(0); const q = useMemo(() => new THREE.Quaternion(), []); const state = useRef<VehicleVisualState>({ speed: 0, steer: 0, brake: false }); const slip = useRef(0); const yawRate = useRef(0); const indicator = useRef<-1 | 0 | 1 | 2>(0); const lastSkid = useRef(0);
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
      pollKeys(); const paused = s.paused || !!s.dialogue || !!s.cutscene || !!s.credits;
      const fwd = paused ? 0 : input.fwd, st = paused ? 0 : input.right; const handbrake = input.jump && !paused;
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
      const impact = Math.abs(speed.current) - Math.abs(actual);
      if (impact > 3.5 && Math.abs(speed.current) > 4) { sfx.crash(Math.min(1, impact / 12)); s.set({ vehicleCondition: Math.max(0, (s.vehicleCondition ?? 100) - Math.round(impact * 1.5)) }); }
      const next = stepDriving({ speed: speed.current, steer: steer.current, yaw: yaw.current, slip: slip.current, yawRate: yawRate.current }, spec, { throttle: fwd, steer: st, brake: false, handbrake }, actual, dt);
      speed.current = next.speed; steer.current = next.steer; yaw.current = next.yaw; slip.current = next.slip ?? 0; yawRate.current = next.yawRate ?? 0;
      const brake = handbrake || (fwd < 0 && speed.current > 0.5) || (fwd > 0 && speed.current < -0.5);
      if (!paused) { if (once("KeyL")) { const m = s.settings.headlights ?? "auto"; const nm = m === "auto" ? "on" : m === "on" ? "off" : "auto"; s.setSettings({ headlights: nm }); s.toast(`Headlights: ${nm}`); }
        if (once("KeyZ")) indicator.current = indicator.current === -1 ? 0 : -1; if (once("KeyX")) indicator.current = indicator.current === 1 ? 0 : 1; if (once("KeyB")) indicator.current = indicator.current === 2 ? 0 : 2; }
      if (indicator.current === -1 && steer.current < -0.5 || indicator.current === 1 && steer.current > 0.5) indicator.current = 0;
      if ((Math.abs(slip.current) > 1.5 || handbrake && Math.abs(speed.current) > 6) && performance.now() - lastSkid.current > 260 && spec.cls !== "pedal") { lastSkid.current = performance.now(); sfx.skid(Math.min(1, Math.abs(speed.current) / 20)); }
      const grip = Math.min(1, Math.abs(speed.current) / 5);
      applyVehicleMotion(rb, next);
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw.current);
      const p = rb.translation(); net.sendVehicle(snap.id, [p.x, p.y, p.z], [q.x, q.y, q.z, q.w], speed.current);
      sfx.engine(true, Math.abs(speed.current), spec.cls, kindEngine(snap.kind), Math.max(0, fwd)); vehicleTelemetry.speed = Math.abs(speed.current); vehicleTelemetry.kind = snap.kind; vehicleTelemetry.reverse = speed.current < -0.2; vehicleTelemetry.indicator = indicator.current; vehicleTelemetry.name = VEHICLE_INFO[snap.kind].name;
      if ((handbrake && Math.abs(speed.current) > 6) || Math.abs(slip.current) > 1.2) { if (Math.random() < 0.3) puff(p.x - Math.sin(yaw.current) * spec.size[2] * 0.35, p.y - spec.size[1] / 2, p.z - Math.cos(yaw.current) * spec.size[2] * 0.35, 1.2); }
      if ((input.horn || once("KeyH")) && performance.now() - lastHorn.current > 600) { lastHorn.current = performance.now(); sfx.horn(); }
      if (once("KeyR")) { const p0 = rb.translation(); rb.setTranslation({ x: p0.x, y: spec.size[1] / 2 + 0.6, z: p0.z }, true); rb.setLinvel({ x: 0, y: 0, z: 0 }, true); speed.current = 0; s.toast("Vehicle reset"); }
      if (!s.settings.reduceMotion && Math.abs(speed.current) > 2) camYaw.v = lerpAngle(camYaw.v, yaw.current + Math.PI, 1 - Math.exp(-dt * 2.2));
      if (vis.current) { vis.current.position.set(p.x, p.y, p.z); vis.current.quaternion.copy(q); void grip; void TWO_WHEELERS; }
      const hl = s.settings.headlights ?? "auto"; const t = s.worldTime;
      state.current = { speed: speed.current, steer: steer.current, brake, accel: next.accel, lat: next.lat, indicator: indicator.current, lights: hl === "on" || (hl === "auto" && (t < 0.26 || t > 0.74)) };
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
      <group ref={vis} position={initialPose.current.p} quaternion={initialPose.current.q}><VehicleMesh kind={snap.kind} color={color} state={state} />{isDriver && <Headlamps kind={snap.kind} state={state} />}<VehicleOccupants vehicle={snap} />{driverName && <NameTag text={driverName} y={spec.size[1] + 0.7} />}</group>
    </>
  );
}

/** Procedural vehicle mesh (original models in vehicleModels.tsx). Kept as the public name used by traffic and QA pages. */
export function VehicleMesh({ kind, color, state, wheelSpin, stoppedRef }: { kind: VehicleKind; color: number; state?: React.RefObject<VehicleVisualState>; wheelSpin?: boolean; stoppedRef?: React.RefObject<boolean> }) {
  const night = useRef(false); useFrame(() => { const t = useStore.getState().worldTime; night.current = t < 0.24 || t > 0.76; });
  return <VehicleModel kind={kind} color={color} state={state} wheelSpin={wheelSpin} stoppedRef={stoppedRef} lightsRef={state ? undefined : night} />;
}
function lerpAngle(a: number, b: number, t: number) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t; }

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
  return <group name={`occupant:${id}:${seat}`} ref={group} position={pose.p}><Avatar appearance={appearance} anim={seat === "driver" ? "drive" : "sit"} scale={pose.scale} protagonist={self} /></group>;
}

function kindEngine(kind: VehicleKind) { return kind === "erickshaw" ? "electric" : kind === "cruiser" ? "thump" : kind === "sportbike" ? "rev" : kind === "auto" ? "putt" : "std"; }
/** Real light for the player's own vehicle only (two unshadowed spot lights) so night driving lights the road. */
function Headlamps({ kind, state }: { kind: VehicleKind; state: React.RefObject<VehicleVisualState> }) {
  const [w, h, l] = SPECS[kind].size; const a = useRef<THREE.SpotLight>(null); const b = useRef<THREE.SpotLight>(null); const ta = useMemo(() => new THREE.Object3D(), []); const tb = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => { const on = !!state.current?.lights; for (const l2 of [a.current, b.current]) if (l2) { l2.visible = on; l2.target = l2 === a.current ? ta : tb; } });
  const two = SPECS[kind].cls === "two"; const xs = two ? [0] : [-w * 0.3, w * 0.3];
  return <>{xs.map((x, i) => <group key={i}><spotLight ref={i ? b : a} position={[x, -h * 0.1, l / 2]} angle={0.5} penumbra={0.6} intensity={two ? 60 : 45} distance={45} decay={1.4} color="#fff1d6" castShadow={false} /><primitive object={i ? tb : ta} position={[x * 1.4, -h / 2, l / 2 + 14]} /></group>)}</>;
}
