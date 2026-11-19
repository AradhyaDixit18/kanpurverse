import { expect, it } from "vitest";
import { building, ribbon } from "../apps/web/src/game/worldGeometry";
it.each([false, true])("building facades face outwards regardless of OSM winding (reversed=%s)", reversed => {
  const pts: [number, number][] = [[-5, -4], [5, -4], [5, 4], [-5, 4], [-5, -4]];
  const { walls, roof } = building(reversed ? pts.reverse() : pts, 9.6);
  try {
    const pos = walls.getAttribute("position"), normals = walls.getAttribute("normal");
    for (let i = 0; i < pos.count; i += 4) {
      const cx = (pos.getX(i) + pos.getX(i + 1)) / 2, cz = (pos.getZ(i) + pos.getZ(i + 1)) / 2;
      expect(cx * normals.getX(i) + cz * normals.getZ(i)).toBeGreaterThan(0);
    }
    roof.computeBoundingBox(); expect(roof.boundingBox!.max.y).toBeCloseTo(9.6);
  } finally { walls.dispose(); roof.dispose(); }
});
it("road segment and corner-joint triangles all face upwards", () => {
  const geometry = ribbon([[0, 0], [10, 0], [10, 10]], 7, 0.06);
  try {
    const n = geometry.getAttribute("normal");
    for (let i = 0; i < n.count; i++) expect(n.getY(i)).toBeGreaterThan(0.99);
  } finally { geometry.dispose(); }
});

import { describe } from "vitest";
import { dashPolylines } from "../apps/web/src/game/worldGeometry";
describe("road centre-line dashes", () => {
  const len = (l: [number, number][]) => { let d = 0; for (let i = 0; i + 1 < l.length; i++) d += Math.hypot(l[i + 1][0] - l[i][0], l[i + 1][1] - l[i][1]); return d; };
  it("paints 3 m dashes with 4.5 m gaps and nothing within 9 m of either end", () => {
    const d = dashPolylines([[0, 0], [0, 100]]); expect(d.length).toBe(11);
    for (const l of d) { expect(len(l)).toBeGreaterThan(1.9); expect(len(l)).toBeLessThanOrEqual(3 + 1e-6); for (const p of l) { expect(p[1]).toBeGreaterThanOrEqual(9 - 1e-6); expect(p[1]).toBeLessThanOrEqual(91 + 1e-6); } }
    expect(d[1][0][1] - d[0][0][1]).toBeCloseTo(7.5, 6);
  });
  it("follows bends, and leaves a short road unmarked", () => {
    const d = dashPolylines([[0, 0], [40, 0], [40, 40]]); expect(d.length).toBeGreaterThan(6); expect(d.some(l => l.length === 3)).toBe(true); // a dash that turns the corner keeps its vertex
    const painted = d.reduce((a, l) => a + len(l), 0); expect(painted).toBeGreaterThan(20); expect(painted).toBeLessThan(80 * 0.5);
    expect(dashPolylines([[0, 0], [0, 18]])).toEqual([]);
  });
  it("a very long dash with no gap is one continuous edge line, trimmed at both ends", () => {
    const e = dashPolylines([[0, 0], [0, 100], [50, 150]], 1e6, 0, 8); expect(e.length).toBe(1); expect(e[0][0]).toEqual([0, 8]); expect(e[0].length).toBe(3);
    expect(len(e[0])).toBeCloseTo(100 + Math.hypot(50, 50) - 16, 6); expect(dashPolylines([[0, 0], [0, 17]], 1e6, 0, 8)).toEqual([]);
  });
});
