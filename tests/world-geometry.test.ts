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
