/** Keep contact shapes small: an 8km cuboid produced ~28cm KCC penetration at city coordinates. */
export const GROUND_TILE_SIZE = 128;
export function groundTileKey(x: number, z: number): [number, number] { return [Math.floor(x / GROUND_TILE_SIZE), Math.floor(z / GROUND_TILE_SIZE)]; }
export function groundTileCenters(tx: number, tz: number): [number, number][] {
  const centres: [number, number][] = [];
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) centres.push([(tx + dx + 0.5) * GROUND_TILE_SIZE, (tz + dz + 0.5) * GROUND_TILE_SIZE]);
  return centres;
}
