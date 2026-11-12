import { describe, it, expect } from "vitest";
import { resolveGraphics, PRESETS } from "../apps/web/src/game/graphics";

describe("central graphics configuration", () => {
  it("presets scale every renderer knob monotonically", () => {
    const [l, m, h, u] = (["low", "medium", "high", "ultra"] as const).map(q => resolveGraphics(q));
    expect(l.shadows).toBe("off"); expect(l.shadowMap).toBe(0); expect(l.post).toBe(false); expect(l.ao).toBe("off");
    expect(m.shadowMap).toBeLessThanOrEqual(h.shadowMap); expect(h.shadowMap).toBeLessThanOrEqual(u.shadowMap);
    expect(l.viewDistance).toBeLessThan(m.viewDistance); expect(m.viewDistance).toBeLessThan(h.viewDistance); expect(h.viewDistance).toBeLessThan(u.viewDistance);
    expect(l.traffic).toBeLessThan(m.traffic); expect(l.crowd).toBeLessThan(h.crowd);
    expect(u.dpr[1]).toBeLessThanOrEqual(1.5); // measured Ultra bottleneck: DPR 1.75 + full-res AO
    expect(u.aa).toBe("msaa"); expect(h.ao).toBe("half");
  });
  it("advanced overrides change only their own knob and are clamped", () => {
    const base = resolveGraphics("high"); const o = resolveGraphics("high", { shadows: "low", viewDistance: 5000, resScale: 0.1 });
    expect(o.shadows).toBe("low"); expect(o.shadowMap).toBe(1024); expect(o.viewDistance).toBe(1000); expect(o.resScale).toBe(0.5);
    expect(o.aa).toBe(base.aa); expect(o.traffic).toBe(base.traffic);
    expect(o.cameraFar).toBeGreaterThan(o.viewDistance); expect(o.fogNear).toBeLessThan(o.viewDistance);
  });
  it("ambient occlusion is forced off when post-processing is disabled", () => {
    expect(resolveGraphics("ultra", { post: false }).ao).toBe("off");
    expect(resolveGraphics("ultra", { post: false }).post).toBe(false);
  });
  it("effects level drives particles, crowd and traffic", () => {
    const lo = resolveGraphics("ultra", { effects: "low" }); expect(lo.dustScale).toBe(0); expect(lo.traffic).toBe(12); expect(lo.crowd).toBe(8);
    expect(Object.keys(PRESETS)).toEqual(["low", "medium", "high", "ultra"]);
  });
});
