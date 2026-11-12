"use client";
/** Original fictional festival set. No real business name, logo or endorsement. Walk-through front stays open. */
import { Suspense, useMemo, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import * as THREE from "three";
import { useStore, tl } from "../state/store";
import { playerPos } from "./refs";
import { StaticBatch } from "./StaticBatch";
import { Avatar } from "./Avatar";
import { DEFAULT_APPEARANCE } from "@kanpurverse/shared";
import { net } from "../net/client";
const font = "/fonts/NotoSansDevanagari-400.woff";
const brass = new THREE.MeshStandardMaterial({
  color: "#d4a35c",
  metalness: 0.78,
  roughness: 0.26,
});
const stone = new THREE.MeshStandardMaterial({
  color: "#e6cba5",
  roughness: 0.7,
});
const wood = new THREE.MeshStandardMaterial({
  color: "#1a4a44",
  roughness: 0.42,
});
const glass = new THREE.MeshPhysicalMaterial({
  color: "#b0d2c7",
  metalness: 0.1,
  roughness: 0.12,
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
});
function Box({
  p,
  s,
  m = stone,
}: {
  p: [number, number, number];
  s: [number, number, number];
  m?: THREE.Material;
}) {
  return (
    <mesh position={p} material={m} castShadow receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}
function Label({
  p,
  text,
  size = 0.45,
  color = "#f9dd9c",
}: {
  p: [number, number, number];
  text: string;
  size?: number;
  color?: string;
}) {
  return (
    <Suspense fallback={null}>
      <Text
        font={font}
        position={p}
        rotation={[0, Math.PI, 0]}
        fontSize={size}
        color={color}
        maxWidth={9}
        textAlign="center"
        anchorX="center"
      >
        {text}
      </Text>
    </Suspense>
  );
}
export function StoryWorld() {
  const mission = useStore((s) => s.mission),
    collected = useStore((s) => s.collectibles);
  const gem = useRef<THREE.Group>(null),
    [near, setNear] = useState(false);
  useFrame((_, dt) => {
    if (gem.current) gem.current.rotation.y += dt * 0.65;
    const n = Math.hypot(playerPos.x - 489, playerPos.z + 306) < 18;
    if (n !== near) setNear(n);
  });
  const sweets = useMemo(
    () =>
      Array.from({ length: 72 }, (_, i) => ({
        x: -3.2 + (i % 12) * 0.58,
        z: -1.9 + Math.floor(i / 12) * 0.3,
      })),
    [],
  );
  return (
    <>
      <group position={[489, 0, -306]} name="sunehri-mithai-story-set">
        <StaticBatch><RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[5, 0.12, 5]} position={[0, -0.12, 0]} />
          <CuboidCollider args={[0.16, 2.5, 5]} position={[-5, 2.5, 0]} />
          <CuboidCollider args={[0.16, 2.5, 5]} position={[5, 2.5, 0]} />
          <CuboidCollider args={[5, 2.5, 0.16]} position={[0, 2.5, 5]} />
          <CuboidCollider args={[3.6, 0.6, 0.65]} position={[0, 0.6, 1.4]} />
        </RigidBody>
        <Box p={[0, 0, 0]} s={[10, 0.15, 10]} />
        <Box p={[-5, 2.5, 0]} s={[0.3, 5, 10]} />
        <Box p={[5, 2.5, 0]} s={[0.3, 5, 10]} />
        <Box p={[0, 2.5, 5]} s={[10, 5, 0.3]} />
        <Box p={[0, 5, 0]} s={[10.6, 0.35, 10.6]} />
        <Box p={[0, 4.15, -5.08]} s={[10.5, 1.3, 0.3]} m={wood} />
        <Label p={[0, 4.25, -5.26]} text="सुनहरी मिठाई" size={0.78} />
        <Label
          p={[0, 3.72, -5.27]}
          text="SUNEHRI  •  MITHAI ATELIER  •  KANPUR"
          size={0.19}
        />
        <Label
          p={[0, 0.38, -5.3]}
          text="काल्पनिक दुकान · FICTIONAL FESTIVAL SET"
          size={0.18}
        />
        {[-4.6, -2.8, 2.8, 4.6].map((x, i) => (
          <group key={i}>
            <Box p={[x, 1.8, -4.85]} s={[0.22, 3.6, 0.28]} m={brass} />
            <mesh
              position={[x, 3.25, -5]}
              rotation={[Math.PI / 2, 0, 0]}
              material={brass}
            >
              <torusGeometry args={[0.72, 0.07, 6, 20, Math.PI]} />
            </mesh>
          </group>
        ))}
        <Box p={[0, 1, 1.4]} s={[7.2, 1.5, 1.3]} m={wood} />
        <Box p={[0, 1.82, 1.4]} s={[7.5, 0.12, 1.5]} m={brass} />
        <Box p={[0, 2.1, 1.4]} s={[7.2, 0.5, 1.3]} m={glass} />
        {sweets.map((p, i) => (
          <mesh key={i} position={[p.x, 1.95, p.z + 3.1]} castShadow>
            <sphereGeometry args={[0.15, 10, 8]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? "#edc76b" : "#c97220"}
              roughness={0.65}
            />
          </mesh>
        ))}
        {[-3.5, 0, 3.5].map((x) => (
          <group key={x}>
            <Box p={[x, 2.6, 4.65]} s={[2.6, 2.6, 0.25]} m={wood} />
            {[1.5, 2.4, 3.3].map((y) => (
              <Box key={y} p={[x, y, 4.38]} s={[2.5, 0.08, 0.6]} m={brass} />
            ))}
            <mesh position={[x, 4.5, 0]}>
              <sphereGeometry args={[0.18, 12, 8]} />
              <meshStandardMaterial
                color="#ffdf9e"
                emissive="#ffb45e"
                emissiveIntensity={3}
              />
            </mesh>
          </group>
        ))}
        <pointLight
          position={[0, 3.7, 0]}
          intensity={26}
          color="#ffc47d"
          distance={13}
          decay={2}
        />
        <Label p={[0, 3.4, 4.42]} text="खुशियों का सुनहरा चक्कर" size={0.32} />
        </StaticBatch>
      {(!mission ||
          mission.def.id !== "laddoo_chakkar" ||
          mission.index < 2) && (
          <group ref={gem} position={[0, 1.3, -0.4]}>
            <mesh material={brass} castShadow>
              <icosahedronGeometry args={[0.38, 2]} />
            </mesh>
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, -0.25, 0]}
              material={brass}
            >
              <torusGeometry args={[0.6, 0.04, 8, 32]} />
            </mesh>
          </group>
        )}
      </group>
      <group position={[492, 0, -302]} rotation={[0, Math.PI, 0]}>
        <Avatar
          appearance={{ ...DEFAULT_APPEARANCE, top: 2, accessory: 2 }}
          anim="talk"
        />
      </group>
      <group position={[456, 0, -345]}>
        <Box p={[0, 1.2, 0]} s={[2.8, 2.4, 0.8]} m={wood} />
        <Label p={[0, 1.9, -0.42]} text="चौक विश्राम" size={0.3} />
        <Label p={[0, 1.35, -0.42]} text="SAFE HOUSE · SAVE" size={0.17} />
      </group>
      {near && (
        <Label
          p={[489, 5.9, -311]}
          text="सुनहरी मिठाई · FICTIONAL STORY LOCATION"
          size={0.3}
        />
      )}
      <Collectible
        id="festival-token"
        p={[497, 0.8, -313]}
        hidden={collected.includes("festival-token")}
      />
    </>
  );
}
function Collectible({
  id,
  p,
  hidden,
}: {
  id: string;
  p: [number, number, number];
  hidden: boolean;
}) {
  const r = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (hidden) return;
    if (r.current) r.current.rotation.y += dt;
    const s = useStore.getState();
    if (
      Math.hypot(playerPos.x - p[0], playerPos.z - p[2]) < 1.6 &&
      !s.collectibles.includes(id)
    ) {
      s.set({
        collectibles: [...s.collectibles, id],
        profile: s.profile && { ...s.profile, coins: s.profile.coins + 50 },
      });
      s.toast(tl("मेले का टोकन मिला +50 🪙", "Festival token +50 🪙"), "reward");
      net.save();
    }
  });
  return hidden ? null : (
    <mesh ref={r} position={p} material={brass}>
      <torusGeometry args={[0.3, 0.1, 6, 16]} />
    </mesh>
  );
}
