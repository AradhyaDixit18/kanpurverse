"use client";
/** Rain streaks: one LineSegments object in a box that follows the camera. Count follows the effects quality; opacity follows the rain amount. */
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGraphics } from "../state/store";
import { weatherNow } from "./weather";

const BOX = 36, DEPTH = 26, FLOOR = -8, LEN = 0.9;

export function Rain() {
  const g = useGraphics(); const { camera } = useThree(); const ref = useRef<THREE.LineSegments>(null);
  const count = g.effects === "low" ? 450 : g.effects === "medium" ? 1000 : 1700;
  const drops = useMemo(() => {
    let s = 12345; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const p = new Float32Array(count * 3), v = new Float32Array(count);
    for (let i = 0; i < count; i++) { p[i * 3] = (rnd() - 0.5) * BOX; p[i * 3 + 1] = FLOOR + rnd() * DEPTH; p[i * 3 + 2] = (rnd() - 0.5) * BOX; v[i] = 15 + rnd() * 6; }
    return { p, v };
  }, [count]);
  const geo = useMemo(() => { const gm = new THREE.BufferGeometry(); gm.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 6), 3)); return gm; }, [count]);
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: "#c9d4e0", transparent: true, opacity: 0, depthWrite: false, fog: false }), []);
  useFrame((_, dt) => {
    const o = ref.current; if (!o) return; const r = weatherNow.rain; o.visible = r > 0.02; if (!o.visible) return;
    mat.opacity = 0.34 * r; o.position.copy(camera.position);
    const slant = 0.1 + weatherNow.wind * 0.45; const arr = geo.attributes.position.array as Float32Array, step = Math.min(dt, 0.05), p = drops.p, v = drops.v;
    for (let i = 0; i < count; i++) {
      let y = p[i * 3 + 1] - v[i] * step; if (y < FLOOR) y += DEPTH; p[i * 3 + 1] = y;
      const x = p[i * 3], z = p[i * 3 + 2], j = i * 6;
      arr[j] = x; arr[j + 1] = y; arr[j + 2] = z; arr[j + 3] = x + slant * LEN; arr[j + 4] = y + LEN; arr[j + 5] = z;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return <lineSegments ref={ref} geometry={geo} material={mat} frustumCulled={false} visible={false} />;
}
