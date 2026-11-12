"use client";
/** Tiny particle pool for footstep dust, landing puffs and vehicle tyre dust. CPU-cheap: one InstancedMesh, 48 puffs. */
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { graphicsNow } from "../state/store";
const N = 48; const pool: { x: number; y: number; z: number; t: number; s: number }[] = [];
export function puff(x: number, y: number, z: number, s = 1) { const k = graphicsNow().dustScale; if (k <= 0 || (k < 1 && Math.random() > k)) return; if (pool.length >= N) pool.shift(); pool.push({ x, y, z, t: 0, s }); }
export function Dust() {
  const mesh = useMemo(() => { const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.18, 6, 5), new THREE.MeshStandardMaterial({ color: 0xc9b99a, transparent: true, opacity: 0.55, depthWrite: false }), N); m.frustumCulled = false; m.count = 0; return m; }, []);
  const o = useMemo(() => new THREE.Object3D(), []);
  useFrame((_, dt) => { let i = 0; for (const p of pool) { p.t += dt; if (p.t > 0.7) continue; const k = p.t / 0.7; o.position.set(p.x + (Math.sin(i * 3.1) * 0.3) * k, p.y + 0.15 + k * 0.6, p.z + (Math.cos(i * 2.3) * 0.3) * k); o.scale.setScalar(p.s * (0.4 + k * 1.4)); o.updateMatrix(); mesh.setMatrixAt(i++, o.matrix); } mesh.count = i; mesh.instanceMatrix.needsUpdate = true; for (let k = pool.length - 1; k >= 0; k--) if (pool[k].t > 0.7) pool.splice(k, 1); });
  return <primitive object={mesh} />;
}
