import { describe, expect, it } from "vitest";
import { COVER, groundCoverAround, growth, valueNoise } from "../apps/web/src/game/groundCover";
import { distToRoad } from "../apps/web/src/game/propPlacement";

const road = { a: [-200, 0] as [number, number], b: [200, 0] as [number, number], w: 12 };
// far from the fuel station forecourt, which takes no cover
const cover = groundCoverAround(0, 0, [road]);

describe("ground cover", () => {
  it("is deterministic", () => { expect(groundCoverAround(0, 0, [road])).toEqual(cover); });
  it("grows a useful amount within its budgets", () => {
    expect(cover.tufts.length).toBeGreaterThan(600); expect(cover.tufts.length).toBeLessThanOrEqual(COVER.maxTufts);
    expect(cover.stones.length).toBeGreaterThan(40); expect(cover.stones.length).toBeLessThanOrEqual(COVER.maxStones);
    expect(cover.patches.length).toBeGreaterThan(10); expect(cover.patches.length).toBeLessThanOrEqual(COVER.maxPatches);
  });
  it("keeps grass off the carriageway and the paved strip, and stones off the carriageway", () => {
    for (const t of cover.tufts) expect(distToRoad(t.x, t.z, road) - road.w / 2).toBeGreaterThanOrEqual(COVER.pavement);
    for (const s of cover.stones) expect(distToRoad(s.x, s.z, road) - road.w / 2).toBeGreaterThanOrEqual(0.5);
    for (const p of cover.patches) expect(distToRoad(p.x, p.z, road) - road.w / 2 - p.r * 0.85).toBeGreaterThanOrEqual(COVER.pavement);
  });
  it("stays inside the field radius", () => { for (const t of cover.tufts) expect(Math.hypot(t.x, t.z)).toBeLessThanOrEqual(COVER.radius + 1e-6); });
  it("does not shuffle when the field is rebuilt around a new centre", () => {
    const moved = groundCoverAround(COVER.rebuildAfter, 5, [road]); const key = (t: { x: number; z: number }) => `${t.x.toFixed(4)}:${t.z.toFixed(4)}`;
    const before = new Map(cover.tufts.map(t => [key(t), t])); let shared = 0;
    for (const t of moved.tufts) { const same = before.get(key(t)); if (same) { shared++; expect(t).toEqual(same); } }
    expect(shared).toBeGreaterThan(cover.tufts.length * 0.5);
  });
  it("respects the veto (water, rails)", () => { const dry = groundCoverAround(0, 0, [road], (x) => x > 0); expect(dry.tufts.every(t => t.x <= 0)).toBe(true); expect(dry.tufts.length).toBeGreaterThan(200); });
  it("thins out on the Medium preset", () => { expect(groundCoverAround(0, 0, [road], undefined, COVER.radius, 2).tufts.length).toBeLessThan(cover.tufts.length * 0.65); });
  it("gathers in clumps rather than an even lawn", () => {
    const cells = new Map<string, number>(); for (const t of cover.tufts) { const k = `${Math.floor(t.x / 8)}:${Math.floor(t.z / 8)}`; cells.set(k, (cells.get(k) ?? 0) + 1); }
    const counts = [...cells.values()]; expect(Math.max(...counts)).toBeGreaterThan(Math.min(...counts) * 3);
  });
  it("fades out before the field edge can be seen", () => { expect(COVER.fadeTo + COVER.rebuildAfter).toBeLessThanOrEqual(COVER.radius); expect(COVER.fadeFrom).toBeLessThan(COVER.fadeTo); });
  it("noise stays in range and is smooth", () => {
    for (let i = 0; i < 200; i++) { const x = i * 3.7 - 300, z = i * -2.3 + 90; const v = valueNoise(x, z, 17), g = growth(x, z); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); expect(g).toBeGreaterThanOrEqual(0); expect(g).toBeLessThanOrEqual(1); expect(Math.abs(valueNoise(x + 0.1, z, 17) - v)).toBeLessThan(0.05); }
  });
});
