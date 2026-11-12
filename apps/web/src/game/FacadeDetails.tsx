"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { facadeParts, type FacadeBuilding, type FacadePart } from "./facadeKit";
import { playerPos } from "./refs";
import { useStore } from "../state/store";
const unit = new THREE.BoxGeometry(1,1,1);
const materials = { trim: new THREE.MeshStandardMaterial({roughness:.78}), glass: new THREE.MeshStandardMaterial({color:"#c6d9da",metalness:.65,roughness:.19,envMapIntensity:1.2}), metal:new THREE.MeshStandardMaterial({metalness:.72,roughness:.4}), shade:new THREE.MeshStandardMaterial({roughness:.92}) };
function Batch({ parts, shadow, layer }: { parts: FacadePart[]; shadow: boolean; layer: keyof typeof materials }) {
  const mesh=useMemo(()=>{const m=new THREE.InstancedMesh(unit,materials[layer],Math.max(parts.length,1)),o=new THREE.Object3D(),color=new THREE.Color(); m.count=parts.length;parts.forEach((p,i)=>{o.position.set(...p.p);o.rotation.set(0,p.yaw,0);o.scale.set(...p.size);o.updateMatrix();m.setMatrixAt(i,o.matrix);m.setColorAt(i,color.set(p.color));});m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.computeBoundingSphere();m.castShadow=shadow;m.receiveShadow=true;return m;},[parts,shadow,layer]);
  useEffect(()=>()=>{mesh.dispose();},[mesh]);return <primitive object={mesh} />;
}
export function FacadeDetails({ buildings }: { buildings: FacadeBuilding[] }) {
  const q=useStore(s=>s.settings.quality),[cell,setCell]=useState(()=>[Math.floor(playerPos.x/48),Math.floor(playerPos.z/48)]),last=useRef(cell.join(','));
  useFrame(()=>{const c=[Math.floor(playerPos.x/48),Math.floor(playerPos.z/48)],k=c.join(',');if(k!==last.current){last.current=k;setCell(c);}});
  const parts=useMemo(()=>{if(q==='low')return facadeParts([]);const x=(cell[0]+.5)*48,z=(cell[1]+.5)*48,range=q==='ultra'?190:q==='high'?150:110;const near=buildings.map(b=>({b,d:Math.min(...b.pts.map((p,i)=>{const a=b.pts[(i+1)%b.pts.length],dx=a[0]-p[0],dz=a[1]-p[1],t=Math.max(0,Math.min(1,((x-p[0])*dx+(z-p[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-p[0]-dx*t,z-p[1]-dz*t);}))})).filter(b=>b.d<range).sort((a,b)=>a.d-b.d).slice(0,q==='ultra'?26:18).map(b=>b.b);return facadeParts(near);},[buildings,cell,q]);
  return <group name="near-architecture">{Object.entries(parts).map(([k,p])=><Batch key={k} layer={k as keyof typeof materials} parts={p} shadow={k==='trim'&&q!=='low'} />)}</group>;
}
