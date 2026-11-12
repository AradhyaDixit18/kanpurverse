"use client";
/** Ambient traffic: autos, cars and bikes looping on the road grid. Deterministic from the shared world clock, so every
 * client sees the same traffic with zero network cost. Near traffic uses swept chassis contacts and stops for obstacles; route decisions are client-local. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider, useBeforePhysicsStep, useRapier, type RapierRigidBody } from "@react-three/rapier";
import { trafficPose, trafficStepClear } from "./trafficMotion";
import { SPECS } from "./vehicleSpecs";
import { type VehicleKind } from "@kanpurverse/shared";
import { getRoads, roadsNear, roadsVersion, onRoadsChange, type Seg } from "./roads";
import { VehicleMesh } from "./Vehicles";
import { useStore, useGraphics } from "../state/store";
import { playerPos } from "./refs";

interface Car { kind: VehicleKind; color: number; seg: Seg; lane: 1 | -1; offset: number; speed: number }
const KINDS: VehicleKind[] = ["auto", "erickshaw", "hatchback", "scooter", "bike", "sedan", "compactsuv", "bus", "taxi", "cruiser", "van", "erickshaw", "muv", "scooter", "cyclerickshaw", "suv", "sportbike", "auto", "schoolbus", "hatchback", "truck", "offroader"];
const COLORS = [0x2e8b57, 0xf2b134, 0xd8d8d8, 0x3d8bff, 0xc8102e, 0x1c1d22, 0x8fd1ff, 0xf5f5f5];

export function Traffic() {
  const traffic = useGraphics().traffic; const [ver, setVer] = useState(roadsVersion()); useEffect(() => onRoadsChange(() => setVer(roadsVersion())), []);
  const [center, setCenter] = useState<[number, number]>([playerPos.x, playerPos.z]); useFrame(() => { if (Math.hypot(playerPos.x - center[0], playerPos.z - center[1]) > 150) setCenter([playerPos.x, playerPos.z]); });
  const cars = useMemo<Car[]>(() => { const n = traffic; const pool = roadsNear(center[0], center[1], 320).filter(s => s.len > 25 && s.cls !== "service" && s.cls !== "living_street"); const segs = pool.length ? pool : getRoads(); if (!segs.length) return [];
    return Array.from({ length: n }, (_, i) => ({ kind: KINDS[i % KINDS.length], color: COLORS[(i * 5) % COLORS.length], seg: segs[(i * 7) % segs.length], lane: i % 2 === 0 ? 1 : -1, offset: (i * 137) % 500, speed: 6 + (i % 4) * 2 })); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traffic, ver, center]);
  return <>{cars.map((c, i) => <Car key={i + ":" + c.seg.a[0]} car={c} />)}</>;
}

function Car({ car }: { car: Car }) {
  const {world,rapier}=useRapier(),body=useRef<RapierRigidBody>(null),spec=SPECS[car.kind];
  const distance=useRef(car.offset+useStore.getState().worldTime*86400*car.speed+(car.lane<0?car.seg.len:0));
  const initial=useRef(trafficPose(car.seg,distance.current)),position=useRef<[number,number,number]>([initial.current.x,spec.size[1]/2+.08,initial.current.z]);
  const rotation=useRef<[number,number,number,number]>([0,Math.sin(initial.current.yaw/2),0,Math.cos(initial.current.yaw/2)]),stopped=useRef(false),state=useRef({speed:0,steer:0,brake:false});
  const shape=useMemo(()=>new rapier.Cuboid(spec.size[0]/2+.05,spec.size[1]/2,spec.size[2]/2+.05),[rapier,spec]);
  useBeforePhysicsStep(()=>{
    const rb=body.current;if(!rb)return;const dt=world.timestep,next=trafficPose(car.seg,distance.current+car.speed*dt),target={...next,y:position.current[1]};
    const near=Math.hypot(playerPos.x-rb.translation().x,playerPos.z-rb.translation().z)<110;rb.collider(0).setEnabled(near);
    if(near&&!trafficStepClear(world,rb,shape,target)){stopped.current=true;state.current.speed=0;state.current.brake=true;return;}
    const previous=trafficPose(car.seg,distance.current);let turn=next.yaw-previous.yaw;while(turn>Math.PI)turn-=2*Math.PI;while(turn< -Math.PI)turn+=2*Math.PI;
    distance.current+=car.speed*dt;stopped.current=false;state.current={speed:car.speed,steer:Math.max(-1,Math.min(1,-turn/dt*.15)),brake:false};
    rb.setNextKinematicTranslation(target);rb.setNextKinematicRotation({x:0,y:Math.sin(next.yaw/2),z:0,w:Math.cos(next.yaw/2)});
  });
  return <RigidBody ref={body} type="kinematicPosition" colliders={false} position={position.current} quaternion={rotation.current} ccd><CuboidCollider args={[spec.size[0]/2,spec.size[1]/2,spec.size[2]/2]} restitution={0}/><VehicleMesh kind={car.kind} color={car.color} state={state} stoppedRef={stopped}/></RigidBody>;
}
