/**
 * Tree crowns. One lumpy, smoothly shaded blob with darker undersides baked into vertex colours; trees are built
 * from several of them. Colours include the flowering trees of a North Indian street: gulmohar (flame red-orange)
 * and amaltas (yellow), alongside neem, peepal and ashoka greens.
 */
import * as THREE from "three";
export function foliageGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 3); const p = g.getAttribute("position"); const col = new Float32Array(p.count * 3); const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 5.1 + v.y * 3.7) * Math.cos(v.z * 4.3 + v.x * 1.9) * 0.14 + Math.sin(v.y * 9.3 + v.z * 7.1) * 0.06 + Math.cos(v.x * 12.7 - v.z * 8.3) * 0.04;
    v.multiplyScalar(1 + n); p.setXYZ(i, v.x, v.y, v.z);
    const k = 0.5 + 0.5 * THREE.MathUtils.smoothstep(v.y, -0.8, 0.9) + n * 0.9; col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = THREE.MathUtils.clamp(k, 0.35, 1.15); }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
const GREENS = ["#5f8a3f", "#6f9645", "#4a7436", "#7a9a4a", "#567f3a", "#668c50"];
/** Colour of blob `j` of tree `i`: about one tree in seven is a gulmohar in flower, one in twelve an amaltas. */
export function crownColour(i: number, j: number) {
  const kind = (i * 2654435761 >>> 0) % 84;
  if (kind < 12 && j % 2 === 1) return ["#d8472b", "#e8642a", "#cf3a2a"][(i + j) % 3];
  if (kind >= 12 && kind < 19 && j % 2 === 0) return ["#e2bb33", "#d9a92a"][(i + j) % 2];
  return GREENS[(i * 3 + j) % GREENS.length];
}
