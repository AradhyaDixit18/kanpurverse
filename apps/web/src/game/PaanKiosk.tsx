"use client";
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { NameTag } from './Avatar';
/** Original code-built kiosk beside the existing Mall Road spawn; no brand advertising. */
export function PaanKiosk(){return <group position={[480,0,-324]}>
 <RigidBody type="fixed" colliders={false}><CuboidCollider args={[1.8,1.2,.65]} position={[0,1.2,0]}/></RigidBody>
 <mesh position={[0,1.1,0]} castShadow><boxGeometry args={[3.6,2.2,1.3]}/><meshStandardMaterial color="#255c4f" roughness={.9}/></mesh>
 <mesh position={[0,2.45,-.3]} rotation={[-.1,0,0]} castShadow><boxGeometry args={[4,.15,2.4]}/><meshStandardMaterial color="#a94933"/></mesh>
 <mesh position={[0,1.1,-.85]}><boxGeometry args={[3.8,.14,.6]}/><meshStandardMaterial color="#d0b080"/></mesh>
 {[-1.2,-.7,.7,1.2].map(x=><mesh key={x} position={[x,1.7,-.68]}><boxGeometry args={[.25,.35,.06]}/><meshStandardMaterial color={x<0?'#c4a46c':'#bd704a'}/></mesh>)}
 <NameTag text="NUKKAD PAAN · FICTIONAL" color="#ffd23f" y={2.85}/>
 </group>;}
