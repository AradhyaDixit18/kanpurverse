"use client";
/** One physical festival marshal, not a real police/evasion simulation. The caper is a staged fairground game. */
import {useRef,useEffect} from 'react';
import {RigidBody,CapsuleCollider,useBeforePhysicsStep} from '@react-three/rapier';
import * as THREE from 'three';
import {Avatar} from './Avatar';
import {DEFAULT_APPEARANCE} from '@kanpurverse/shared';
import {usePedestrianBody} from './usePedestrianBody';
import {CHARACTER} from './characterPhysics';
import {useStore} from '../state/store';
import {playerPos} from './refs';
import {net} from '../net/client';
import {sfx} from '../audio/sfx';
export function FestivalChase(){const mission=useStore(s=>s.mission),active=mission?.def.id==='laddoo_chakkar'&&mission.index===2;return active?<Marshal key={mission.startedAt}/> :null;}
function Marshal(){const motion=usePedestrianBody([491.4,0,-309]),vis=useRef<THREE.Group>(null),p=useRef({x:491.4,y:0,z:-309}),began=useRef(performance.now()),announced=useRef(false);useEffect(()=>{if(announced.current)return;announced.current=true;sfx.horn();useStore.getState().toast('मेले का खेल! Marshal से दूरी रखो और राजू तक पहुँचो।');},[]);
 useBeforePhysicsStep(()=>{const s=useStore.getState(),m=s.mission;if(!m||s.paused||s.dialogue)return;const dx=playerPos.x-p.current.x,dz=playerPos.z-p.current.z,d=Math.hypot(dx,dz),dt=motion.world.timestep;if(performance.now()-began.current>1800){motion.resolve({x:p.current.x+dx/(d||1)*2.7*dt,y:p.current.y,z:p.current.z+dz/(d||1)*2.7*dt});const b=motion.body.current?.translation();if(b){p.current={x:b.x,y:b.y-CHARACTER.feetOffset,z:b.z};}if(d<1.3){net.recoverCaper();}}if(vis.current){vis.current.position.set(p.current.x,p.current.y,p.current.z);vis.current.rotation.y=Math.atan2(dx,dz);}});
 return <><RigidBody ref={motion.body} type="kinematicPosition" colliders={false} position={motion.pose} enabledRotations={[false,false,false]}><CapsuleCollider args={[CHARACTER.halfHeight,CHARACTER.radius]}/></RigidBody><group ref={vis}><Avatar appearance={{...DEFAULT_APPEARANCE,top:3,bottom:2,accessory:2}} anim="run" name="Festival marshal"/></group></>;}
