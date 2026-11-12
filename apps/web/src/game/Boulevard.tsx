"use client";
/** Distance-managed road-edge planting and light pools. Instanced geometry keeps draw calls bounded. */
import { useMemo, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { roadsNear, segPoint, onRoadsChange } from "./roads";
import { playerPos } from "./refs";
import { useStore } from "../state/store";
const foliageGeometry = new THREE.IcosahedronGeometry(1, 2);
const leafMaterial = new THREE.MeshStandardMaterial({
  color: "#728c38",
  roughness: 0.96,
});
const trunkGeometry = new THREE.CylinderGeometry(0.12, 0.23, 1, 7);
const bark = new THREE.MeshStandardMaterial({ color: "#67513b", roughness: 1 });
const lampGeometry = new THREE.SphereGeometry(0.12, 8, 6);
const lampMaterial = new THREE.MeshStandardMaterial({
  color: "#ffdfad",
  emissive: "#ffbd71",
  emissiveIntensity: 2,
});
export function Boulevard() {
  const q = useStore((s) => s.settings.quality);
  const night = useStore((s) => s.worldTime > 0.78 || s.worldTime < 0.23);
  const [cell, setCell] = useState(""),
    [ver, setVer] = useState(0);
  useEffect(() => onRoadsChange(() => setVer((v) => v + 1)), []);
  useFrame(() => {
    const c = `${Math.floor(playerPos.x / 90)},${Math.floor(playerPos.z / 90)}`;
    if (c !== cell) setCell(c);
  });
  const result = useMemo(() => {
    const [cx, cz] = cell.split(",").map(Number);
    if (!Number.isFinite(cx)) return [];
    void ver;
    const out: { x: number; z: number; seed: number }[] = [];
    for (const road of roadsNear(cx * 90 + 45, cz * 90 + 45, 170).filter(
      (r) => r.w >= 9,
    )) {
      for (let d = 17; d < road.len; d += 29) {
        for (const side of [-1, 1]) {
          const p = segPoint(road, d, side * (road.w / 2 + 2.5));
          if (
            Math.hypot(p[0] - 489, p[1] + 306) < 14 ||
            Math.hypot(p[0] - 472, p[1] + 330) < 8
          )
            continue;
          if (Math.hypot(p[0] - playerPos.x, p[1] - playerPos.z) < 180)
            out.push({ x: p[0], z: p[1], seed: out.length });
        }
      }
    }
    return out.slice(
      0,
      q === "ultra" ? 50 : q === "high" ? 38 : q === "medium" ? 24 : 10,
    );
  }, [cell, q, ver]);
  const meshes = useMemo(() => {
    const trunks = new THREE.InstancedMesh(
        trunkGeometry,
        bark,
        Math.max(1, result.length),
      ),
      leaves = new THREE.InstancedMesh(
        foliageGeometry,
        leafMaterial,
        Math.max(1, result.length * 5),
      ),
      bulbs = new THREE.InstancedMesh(
        lampGeometry,
        lampMaterial,
        Math.max(1, result.length),
      );
    trunks.count = result.length;
    leaves.count = result.length * 5;
    bulbs.count = result.length;
    const o = new THREE.Object3D(),
      c = new THREE.Color();
    result.forEach((p, i) => {
      const h = 4.1 + (i % 4) * 0.35;
      o.position.set(p.x, h / 2, p.z);
      o.scale.set(1, h, 1);
      o.updateMatrix();
      trunks.setMatrixAt(i, o.matrix);
      for (let j = 0; j < 5; j++) {
        const a = j * 2.4 + i,
          r = j ? 1.15 : 0;
        o.position.set(
          p.x + Math.cos(a) * r,
          h + 0.4 + (j % 3) * 0.65,
          p.z + Math.sin(a) * r,
        );
        o.scale.set(1.65, 1.4, 1.6);
        o.rotation.y = a;
        o.updateMatrix();
        leaves.setMatrixAt(i * 5 + j, o.matrix);
        leaves.setColorAt(
          i * 5 + j,
          c.set(["#698c45", "#7b9747", "#53783b", "#819e50"][i % 4]),
        );
      }
      o.position.set(p.x, h - 0.5, p.z);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      bulbs.setMatrixAt(i, o.matrix);
    });
    for (const m of [trunks, leaves, bulbs]) {
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
      m.castShadow = m !== bulbs && (q === "high" || q === "ultra");
      m.receiveShadow = true;
    }
    return { trunks, leaves, bulbs };
  }, [result, q]);
  useEffect(
    () => () => {
      for (const m of Object.values(meshes)) m.dispose();
    },
    [meshes],
  );
  return (
    <group name="boulevard-planting">
      <primitive object={meshes.trunks} />
      <primitive object={meshes.leaves} />
      <primitive object={meshes.bulbs} visible={night} />
      {night &&
        q !== "low" &&
        result
          .slice(0, 4)
          .map((p, i) => (
            <pointLight
              key={i}
              position={[p.x, 3.6, p.z]}
              color="#ffcd8b"
              intensity={14}
              distance={14}
              decay={2}
            />
          ))}
    </group>
  );
}
