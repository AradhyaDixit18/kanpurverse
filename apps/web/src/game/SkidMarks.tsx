"use client";
/** Tyre marks: a ring buffer of 700 dark quads on the decal layer (one draw call). Written by drifting/braking cars. */
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LAYER, OFFSET } from "./layers";

const MAX = 700; let head = 0, dirty = false; const marks: { x: number; z: number; yaw: number; w: number; len: number }[] = [];
const _o = new THREE.Object3D(); let last = new Map<string, { x: number; z: number }>();
/** Lay a mark segment from the previous point of `key` (e.g. "car:rl") to (x, z). */
export function skid(key: string, x: number, z: number, width = 0.22) {
  const p = last.get(key); last.set(key, { x, z }); if (!p) return; const len = Math.hypot(x - p.x, z - p.z); if (len < 0.25 || len > 3) return;
  marks[head] = { x: (x + p.x) / 2, z: (z + p.z) / 2, yaw: Math.atan2(x - p.x, z - p.z), w: width, len }; head = (head + 1) % MAX; dirty = true;
}
export function endSkid(key: string) { last.delete(key); }
export function SkidMarks() {
  const mesh = useMemo(() => { const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2); const m = new THREE.MeshBasicMaterial({ color: 0x0c0c0c, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: OFFSET.decal, polygonOffsetUnits: OFFSET.decal }); const im = new THREE.InstancedMesh(g, m, MAX); im.count = 0; im.frustumCulled = false; im.renderOrder = 1; return im; }, []);
  useEffect(() => () => { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); last = new Map(); }, [mesh]);
  useFrame(() => { if (!dirty) return; dirty = false; let n = 0; for (const m of marks) { if (!m) continue; _o.position.set(m.x, LAYER.decal - 0.005, m.z); _o.rotation.set(0, m.yaw, 0); _o.scale.set(m.w, 1, m.len + 0.05); _o.updateMatrix(); mesh.setMatrixAt(n++, _o.matrix); } mesh.count = n; mesh.instanceMatrix.needsUpdate = true; });
  return <primitive object={mesh} />;
}
