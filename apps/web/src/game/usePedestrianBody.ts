"use client";
import { useEffect, useRef } from "react";
import { useRapier, type RapierRigidBody } from "@react-three/rapier";
import type { KinematicCharacterController } from "@dimforge/rapier3d-compat";
import { createCharacterController, CHARACTER } from "./characterPhysics";
import { advancePedestrian } from "./pedestrianPhysics";
export function usePedestrianBody(initial:[number,number,number]){
 const {world}=useRapier(),body=useRef<RapierRigidBody>(null),controller=useRef<KinematicCharacterController|null>(null),vy=useRef(0),pose=useRef<[number,number,number]>([initial[0],initial[1]+CHARACTER.feetOffset,initial[2]]);
 useEffect(()=>{const c=createCharacterController(world);controller.current=c;return()=>world.removeCharacterController(c);},[world]);
 return {body,pose:pose.current,world,enable(enabled:boolean){body.current?.collider(0).setEnabled(enabled);},resolve(target:{x:number;y:number;z:number}){if(!body.current||!controller.current)return 0;const r=advancePedestrian(body.current,controller.current,target,vy.current,world.timestep);vy.current=r.verticalSpeed;Object.assign(target,r.feet);return r.moved;}};
}
