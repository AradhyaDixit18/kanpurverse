import * as THREE from "three";

/** Ribbon geometry along a polyline: per-segment quads + round joints; UV.x along length (metres/8), UV.y across. */
export function ribbon(pts: [number, number][], w: number, y: number, uvScale = 8): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = []; let d = 0; if (pts.length < 2) return new THREE.BufferGeometry();
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const dx = bx - ax, dz = bz - az; const len = Math.hypot(dx, dz) || 1; const nx = -dz / len * w / 2, nz = dx / len * w / 2; const base = pos.length / 3;
    pos.push(ax + nx, y, az + nz, ax - nx, y, az - nz, bx + nx, y, bz + nz, bx - nx, y, bz - nz); uv.push(d / uvScale, 0, d / uvScale, 1, (d + len) / uvScale, 0, (d + len) / uvScale, 1);
    idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3); d += len;
    if (i + 2 < pts.length) { // joint disc
      const c = pos.length / 3; pos.push(bx, y, bz); uv.push(d / uvScale, 0.5); const N = 8; for (let k = 0; k <= N; k++) { const a = k / N * Math.PI * 2; pos.push(bx + Math.cos(a) * w / 2, y, bz + Math.sin(a) * w / 2); uv.push(d / uvScale + Math.cos(a) * 0.1, 0.5 + Math.sin(a) * 0.5); if (k) idx.push(c, c + k + 1, c + k); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

/** Polygon (footprint) → walls with per-wall UVs (u = metres/4 → one window bay per 4 m, v = floors) + flat roof. */
export function building(pts: [number, number][], h: number, y0 = 0): { walls: THREE.BufferGeometry; roof: THREE.BufferGeometry } {
  const pos: number[] = [], uv: number[] = [], idx: number[] = []; const ring = pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1] ? pts.slice(0, -1) : pts;
  // Negative signed x/z area makes the wall triangles face away from the footprint.
  let area = 0; for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; area += a[0] * b[1] - b[0] * a[1]; } const poly = area < 0 ? ring : [...ring].reverse();
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const base = pos.length / 3; const u = Math.max(1, Math.round(len / 4)), v = Math.max(1, Math.round(h / 3.2));
    pos.push(a[0], y0, a[1], b[0], y0, b[1], a[0], y0 + h, a[1], b[0], y0 + h, b[1]); uv.push(0, 0, u, 0, 0, v, u, v); idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2); }
  const walls = new THREE.BufferGeometry(); walls.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); walls.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); walls.setIndex(idx); walls.computeVertexNormals();
  const shape = new THREE.Shape(poly.map(p => new THREE.Vector2(p[0], -p[1]))); const roof = new THREE.ShapeGeometry(shape); roof.rotateX(-Math.PI / 2); roof.translate(0, y0 + h, 0); const ruv = roof.getAttribute("uv"); for (let i = 0; i < ruv.count; i++) ruv.setXY(i, ruv.getX(i) / 6, ruv.getY(i) / 6); roof.computeVertexNormals();
  return { walls, roof };
}
