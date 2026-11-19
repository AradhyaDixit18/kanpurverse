import { describe, it, expect } from "vitest";
import { stepBoom, newBoom, chaseTarget, BOOM } from "../apps/web/src/game/chaseCamera";

const DT = 1 / 60;
describe("vehicle chase camera boom", () => {
  it("a pole that crosses the boom for a few frames at speed does not move the camera", () => {
    let b = newBoom(6); for (let i = 0; i < 4; i++) b = stepBoom(b, 6, 2, DT, 15); // 67 ms obstruction
    expect(b.dist).toBeCloseTo(6, 6); b = stepBoom(b, 6, null, DT, 15); expect(b.blockedFor).toBe(0);
  });
  it("a wall shortens the boom quickly but never in one jump, then it eases back out slowly", () => {
    let b = newBoom(6); const first = stepBoom(b, 6, 2, DT, 1); // slow reverse into a wall: no debounce
    expect(first.dist).toBeLessThan(6); expect(6 - first.dist).toBeLessThan(1.2); // no teleport
    b = first; let worstStep = 0; for (let i = 0; i < 40; i++) { const n = stepBoom(b, 6, 2, DT, 1); worstStep = Math.max(worstStep, b.dist - n.dist); b = n; }
    expect(b.dist).toBeLessThan(2); expect(b.dist).toBeGreaterThan(1.6); expect(worstStep).toBeLessThan(1);
    const inTime = 41 * DT; let out = 0; while (b.dist < 5.5 && out < 600) { b = stepBoom(b, 6, null, DT, 1); out++; }
    expect(out * DT).toBeGreaterThan(inTime); // slower out than in
  });
  it("a lasting obstruction at speed is honoured after the debounce", () => {
    let b = newBoom(6); const frames = Math.ceil(BOOM.debounce / DT) + 30; for (let i = 0; i < frames; i++) b = stepBoom(b, 6, 3, DT, 20);
    expect(b.dist).toBeLessThan(3.2);
  });
  it("the boom never exceeds the wanted length and never collapses onto the target", () => {
    let b = newBoom(11); b = stepBoom(b, 6, null, DT, 0); expect(b.dist).toBeLessThanOrEqual(6);
    for (let i = 0; i < 300; i++) b = stepBoom(b, 6, 0.01, DT, 0); expect(b.dist).toBeGreaterThanOrEqual(0.3 - 1e-9);
  });
  it("follows the drawn vehicle only when that sample is fresh and belongs to the vehicle being driven", () => {
    const phys = { x: 1, y: 2, z: 3 }, drawn = { id: "v_hatch_1", x: 1.2, y: 2, z: 3.4, at: 1000 };
    expect(chaseTarget(phys, drawn, "v_hatch_1", 1100)).toBe(drawn); expect(chaseTarget(phys, drawn, "v_hatch_1", 1400)).toBe(phys);
    expect(chaseTarget(phys, drawn, "v_auto_1", 1100)).toBe(phys); expect(chaseTarget(phys, drawn, null, 1100)).toBe(phys);
  });
});
