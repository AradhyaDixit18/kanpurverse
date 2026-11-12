/**
 * Ground-layer heights and depth settings, in one place. Root cause of the reported flicker: ground layers were
 * 1–3 cm apart with a 0.1 m near plane, so beyond ~150 m the 24-bit depth buffer could not separate them (z-fighting
 * between pavement, parks, water and roads), and overlapping road ribbons at junctions fought with different UVs.
 * Fixes: near plane 0.3 m, ≥1 cm separations plus a strictly ordered polygon offset per layer (resolves ties at any distance), and world-space road UVs so overlapping
 * junction triangles are pixel-identical even when their depths tie.
 */
export const CAMERA_NEAR = 0.3;
export const LAYER = { ground: 0, pavement: 0.04, park: 0.06, rail: 0.07, water: 0.08, road: 0.1, marks: 0.13, decal: 0.15 } as const;
/** polygonOffset factor/units per layer (more negative draws in front). */
export const OFFSET: Record<keyof typeof LAYER, number> = { ground: 0, pavement: -1, park: -2, rail: -3, water: -4, road: -5, marks: -7, decal: -9 };
/** Depth precision (m) of a 24-bit perspective depth buffer at distance z. */
export function depthStep(z: number, near = CAMERA_NEAR) { return (z * z) / (near * 2 ** 24); }
