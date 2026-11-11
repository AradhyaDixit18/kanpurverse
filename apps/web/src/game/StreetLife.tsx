"use client";
import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRapier } from '@react-three/rapier';
import * as THREE from 'three';
import { STREET } from '@kanpurverse/shared';
import { playerPos, playerYaw } from './refs';
import { reactToSpit, streetRuntime } from './streetRuntime';
import { sfx } from '../audio/sfx';

interface Stain { id:number; p:THREE.Vector3; q:THREE.Quaternion; until:number }
/** Swept segments against Rapier geometry avoid tunnelling at low frame rates. One projectile, bounded stains. */
export function StreetLife() {
 const {world,rapier}=useRapier(); const dot=useRef<THREE.Mesh>(null); const projectile=useRef<{p:THREE.Vector3;v:THREE.Vector3;age:number}|null>(null);
 const [stains,setStains]=useState<Stain[]>([]); const nextCleanup=useRef(0);
 useEffect(()=>{
  const fire=()=>{ const d=new THREE.Vector3(Math.sin(playerYaw.v),0,Math.cos(playerYaw.v));
   // Begin at mouth, not beyond a nearby wall. Sweep includes the first forward offset.
   projectile.current={p:new THREE.Vector3(playerPos.x,playerPos.y+1.6,playerPos.z),v:d.multiplyScalar(7).setY(.8),age:0}; sfx.spit(); };
  window.addEventListener('kv:spit',fire); return()=>{window.removeEventListener('kv:spit',fire);streetRuntime.stains=0;};
 },[]);
 useFrame((_,rawDt)=>{
  const now=performance.now(); if(now>nextCleanup.current){nextCleanup.current=now+200;setStains(old=>{const next=old.filter(s=>s.until>now);streetRuntime.stains=next.length;return next.length===old.length?old:next;});}
  const b=projectile.current; if(dot.current)dot.current.visible=!!b; if(!b)return;
  const dt=Math.min(rawDt,.1); b.age+=dt; const delta=b.v.clone().multiplyScalar(dt); const len=delta.length();
  const hit=world.castRayAndGetNormal(new rapier.Ray(b.p,delta.clone().normalize()),len,true,undefined,undefined,undefined,undefined,c=>{const p=c.parent();return p?.bodyType()!==rapier.RigidBodyType.KinematicPositionBased;});
  if(hit){const n=new THREE.Vector3(hit.normal.x,hit.normal.y,hit.normal.z);const p=b.p.clone().addScaledVector(delta.clone().normalize(),hit.timeOfImpact).addScaledVector(n,.012);
   setStains(old=>{const next=[...old.slice(-(STREET.maxStains-1)),{id:now,p,q:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),n),until:now+STREET.stainMs}];streetRuntime.stains=next.length;return next;});
   streetRuntime.impacts++;reactToSpit(p.x,p.z);projectile.current=null;if(dot.current)dot.current.visible=false;
  }else{b.p.add(delta);b.v.y-=9*dt;if(dot.current)dot.current.position.copy(b.p);if(b.age>2.5)projectile.current=null;}
 });
 return <><mesh ref={dot} visible={false}><sphereGeometry args={[.035,6,4]}/><meshBasicMaterial color="#9b4532"/></mesh>{stains.map(s=><mesh key={s.id} position={s.p} quaternion={s.q} scale={[1,.65,1]}><circleGeometry args={[.16,9]}/><meshBasicMaterial color="#853f2b" transparent opacity={.65} depthWrite={false} polygonOffset polygonOffsetFactor={-2}/></mesh>)}</>;
}
