"use client";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
/** Bake only static, untextured opaque prop meshes. Text, lines, animation and colliders remain untouched.
 * Spatial cells preserve culling. Source meshes stay React-owned; baked GPU resources have explicit ownership. */
export function StaticBatch({ children }: { children: ReactNode }) {
  const source = useRef<THREE.Group>(null), output = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    if (!source.current || !output.current) return;
    const originals: THREE.Mesh[] = [], baked: THREE.Mesh[] = [];
    const buckets = new Map<string, { geometries: THREE.BufferGeometry[]; material: THREE.MeshStandardMaterial; cast: boolean; receive: boolean }>();
    source.current.updateWorldMatrix(true, true);
    const inverse = source.current.matrixWorld.clone().invert();
    source.current.traverse(o => {
      const m = o as THREE.Mesh; const material = m.material as THREE.MeshStandardMaterial;
      if (!m.isMesh || Array.isArray(m.material) || !material?.isMeshStandardMaterial || material.transparent || material.map || material.normalMap || material.alphaMap || m.type === "Text" || (m as THREE.Mesh & { isTroikaText?: boolean }).isTroikaText) return;
      if (!m.visible || !m.geometry.getAttribute("position")) return;
      const transform = new THREE.Matrix4().multiplyMatrices(inverse, m.matrixWorld), location = new THREE.Vector3().setFromMatrixPosition(transform);
      const key = [Math.floor(location.x / 64), Math.floor(location.z / 64), material.roughness, material.metalness, material.side, material.emissive.getHex(), material.emissiveIntensity, m.castShadow, m.receiveShadow].join(":");
      let bucket = buckets.get(key);
      if (!bucket) { const mat = material.clone(); mat.color.set(0xffffff); mat.vertexColors = true; bucket = { geometries: [], material: mat, cast: m.castShadow, receive: m.receiveShadow }; buckets.set(key, bucket); }
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); g.applyMatrix4(transform);
      for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
      const count = g.getAttribute("position").count;
      if (!g.getAttribute("normal")) g.computeVertexNormals(); if (!g.getAttribute("uv")) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(count * 2), 2));
      const colours = new Float32Array(count * 3); for (let i = 0; i < count; i++) { colours[i*3] = material.color.r; colours[i*3+1] = material.color.g; colours[i*3+2] = material.color.b; }
      g.setAttribute("color", new THREE.BufferAttribute(colours, 3)); bucket.geometries.push(g); originals.push(m); m.visible = false;
    });
    for (const [key, b] of buckets) { const geometry = mergeGeometries(b.geometries); b.geometries.forEach(g => g.dispose()); if (!geometry) { b.material.dispose(); continue; } const mesh = new THREE.Mesh(geometry, b.material); mesh.name = `static-props:${key}`; mesh.castShadow = b.cast; mesh.receiveShadow = b.receive; geometry.computeBoundingSphere(); output.current.add(mesh); baked.push(mesh); }
    const target = output.current;
    return () => { originals.forEach(m => { m.visible = true; }); baked.forEach(m => { target.remove(m); m.geometry.dispose(); (m.material as THREE.Material).dispose(); }); };
  }, [children]);
  return <group><group ref={source}>{children}</group><group ref={output} /></group>;
}
