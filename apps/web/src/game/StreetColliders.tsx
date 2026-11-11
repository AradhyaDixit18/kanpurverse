"use client";
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { playerPos } from "./refs";
import { stallCollision, type StallKind } from "./propCollisions";
export interface StreetStall {p:[number,number];rot:number;kind:StallKind}
/** Visual props cover a wide area; nearby contacts stream independently so moving within a visual chunk never loses contacts. */
export function StreetColliders({poles,stalls}:{poles:{p:[number,number];rot:number}[];stalls:StreetStall[]}){
 const [centre,setCentre]=useState(()=>[playerPos.x,playerPos.z]),last=useRef(centre);
 useFrame(()=>{if(Math.hypot(playerPos.x-last.current[0],playerPos.z-last.current[1])>24){last.current=[playerPos.x,playerPos.z];setCentre(last.current);}});
 const near=(p:[number,number])=>Math.hypot(p[0]-centre[0],p[1]-centre[1])<110;
 return <group name="street-contacts">{poles.filter(p=>near(p.p)).map(p=><RigidBody key={`pole:${p.p}`} type="fixed" colliders={false} position={[p.p[0],0,p.p[1]]} rotation={[0,p.rot,0]}><CuboidCollider args={[.11,4,.11]} position={[0,4,0]}/></RigidBody>)}{stalls.map((s,i)=>({s,i})).filter(({s})=>near(s.p)).map(({s,i})=>{const shape=stallCollision(s.kind,i);return <RigidBody key={`stall:${s.p}:${s.kind}`} type="fixed" colliders={false} position={[s.p[0],0,s.p[1]]} rotation={[0,s.rot+shape.yaw,0]}>{shape.boxes.map((b,j)=><CuboidCollider key={j} args={b.half} position={b.p}/>)}</RigidBody>;})}</group>;
}
