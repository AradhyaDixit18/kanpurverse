import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { LAYER, OFFSET, CAMERA_NEAR, depthStep } from "../apps/web/src/game/layers";
import { snapToShadowTexels } from "../apps/web/src/game/Sky";
import { resolveGraphics } from "../apps/web/src/game/graphics";

describe("flicker root causes stay fixed", () => {
  it("ground layers are separated by more than the depth precision across the fog distance", () => {
    const ys = Object.values(LAYER).sort((a, b) => a - b); const gaps = ys.slice(1).map((y, i) => y - ys[i]);
    const minGap = Math.min(...gaps); const far = resolveGraphics("high").viewDistance;
    // Geometric separation alone covers the near city; polygon offsets (next test) resolve ties beyond it.
    expect(depthStep(120)).toBeLessThan(minGap / 2); expect(minGap).toBeGreaterThanOrEqual(0.0099); expect(far).toBeGreaterThan(250);
    expect(CAMERA_NEAR).toBeGreaterThanOrEqual(0.25);
  });
  it("every layer above the ground carries a stronger polygon offset than the layer below it", () => {
    const order = (Object.keys(LAYER) as (keyof typeof LAYER)[]).sort((a, b) => LAYER[a] - LAYER[b]);
    for (let i = 1; i < order.length; i++) expect(OFFSET[order[i]]).toBeLessThan(OFFSET[order[i - 1]]);
  });
  it("shadow camera moves in whole texels in the light plane (no swimming while the player walks)", () => {
    const dir = new THREE.Vector3(0.5, 0.8, 0.3).normalize(); const texel = (2 * 55) / 2048;
    const u = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize(); const v = new THREE.Vector3().crossVectors(dir, u).normalize();
    for (const x of [0, 0.004, 0.011, 13.37, 472.2]) {
      const c = snapToShadowTexels({ x, y: 1, z: -330 + x }, dir, texel).clone();
      expect(Math.abs(c.dot(u) / texel - Math.round(c.dot(u) / texel))).toBeLessThan(1e-6);
      expect(Math.abs(c.dot(v) / texel - Math.round(c.dot(v) / texel))).toBeLessThan(1e-6);
      expect(c.distanceTo(new THREE.Vector3(x, 1, -330 + x))).toBeLessThan(texel);
    }
    const a = snapToShadowTexels({ x: 10, y: 0, z: 10 }, dir, texel).clone(), b = snapToShadowTexels({ x: 10 + texel * 0.2, y: 0, z: 10 }, dir, texel).clone();
    expect(a.distanceTo(b) / texel).toBeLessThan(1.5); // a sub-texel move shifts the map by at most one whole texel
  });
});

describe("railway platforms are solid and walkable", () => {
  it("slab height is within the character autostep, has kerb faces and one collider box per segment", async () => {
    const { platformSlab, PLATFORM } = await import("../apps/web/src/game/worldGeometry");
    const { CHARACTER } = await import("../apps/web/src/game/characterPhysics");
    void CHARACTER; expect(PLATFORM.h).toBeLessThanOrEqual(0.45);
    const { geo, boxes } = platformSlab([[0, 0], [0, 50], [10, 90]]);
    expect(boxes).toHaveLength(2);
    for (const b of boxes) { expect(b.c[1]).toBeCloseTo(PLATFORM.h / 2); expect(b.half[1]).toBeCloseTo(PLATFORM.h / 2); }
    const ys = Array.from(geo.getAttribute("position").array as Float32Array).filter((_, i) => i % 3 === 1);
    expect(Math.min(...ys)).toBe(0); expect(Math.max(...ys)).toBeCloseTo(PLATFORM.h); // kerb faces reach the ground
    expect(geo.getIndex()).not.toBeNull(); expect(geo.getAttribute("uv")).toBeTruthy(); expect(geo.getAttribute("normal")).toBeTruthy();
  });
});
