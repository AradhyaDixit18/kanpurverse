"use client";
/** Remote players rendered from interpolated snapshots. */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RigidBody, CapsuleCollider, useBeforePhysicsStep, type RapierRigidBody } from "@react-three/rapier";
import { CHARACTER } from "./characterPhysics";
import type { PlayerSnapshot } from "@kanpurverse/shared";
import { Avatar } from "./Avatar";
import { useStore } from "../state/store";
import { remoteBuf } from "../net/client";

export function RemotePlayers() {
  const players = useStore(s => s.players); const selfId = useStore(s => s.selfId);
  return <>{Object.values(players).filter(p => p.id !== selfId).map(p => <Remote key={p.id} snap={p} />)}</>;
}
function Remote({ snap }: { snap: PlayerSnapshot }) {
  const g = useRef<THREE.Group>(null); const body=useRef<RapierRigidBody>(null),initial=useRef<[number,number,number]>([...snap.p]),bodyInitial=useRef<[number,number,number]>([snap.p[0],snap.p[1]+CHARACTER.feetOffset,snap.p[2]]); const party = useStore(s => s.party); const friends = useStore(s => s.profile?.friends ?? []);
  useFrame((_, dt) => {
    const b = remoteBuf.get(snap.id); const target = b?.length ? b[b.length - 1] : { p: snap.p, ry: snap.ry }; if (!g.current) return;
    const t = THREE.MathUtils.clamp(dt * 12, 0, 1);
    g.current.position.lerp(new THREE.Vector3(target.p[0], target.p[1], target.p[2]), t);
    let d = target.ry - g.current.rotation.y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; g.current.rotation.y += d * t;
  });
  const seated = useStore(s => Object.values(s.vehicles).some(v => v.driver === snap.id || v.passenger === snap.id));
  useBeforePhysicsStep(()=>{const rb=body.current;if(!rb||!g.current)return;rb.collider(0).setEnabled(!snap.vehicle&&!seated);rb.setNextKinematicTranslation({x:g.current.position.x,y:g.current.position.y+CHARACTER.feetOffset,z:g.current.position.z});});
  const color = party.includes(snap.id) ? "#3d8bff" : friends.includes(snap.id) ? "#2e8b57" : "#fff";
  return <><RigidBody ref={body} type="kinematicPosition" colliders={false} position={bodyInitial.current}><CapsuleCollider args={[CHARACTER.halfHeight,CHARACTER.radius]}/></RigidBody><group ref={g} position={initial.current} visible={!snap.vehicle && !seated}><Avatar appearance={snap.appearance} anim={snap.anim} name={snap.name} nameColor={color} /></group></>;
}
