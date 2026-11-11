import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
const cache = new Map<string, RoundedBoxGeometry>();
/** Shared metric geometry. Radius cannot exceed half the thinnest dimension. */
export function roundedGeometry(size: readonly [number, number, number], requestedRadius: number) {
  if (size.some(n => !Number.isFinite(n) || n <= 0) || !Number.isFinite(requestedRadius)) throw new Error("Invalid rounded mesh dimensions");
  const radius = Math.max(.0001, Math.min(...size.map(n => n / 2), requestedRadius));
  const key = `${size.join(",")}:${radius}`;
  let geometry = cache.get(key);
  if (!geometry) { geometry = new RoundedBoxGeometry(...size, 2, radius); geometry.computeBoundingBox(); cache.set(key, geometry); }
  return geometry;
}
