import { describe, expect, it } from "vitest";
import { kitFor, KHAKI, KURTIS, SHIRTS } from "../apps/web/src/game/peopleKit";

const crowd = Array.from({ length: 400 }, (_, i) => kitFor(100 + i, "pedestrian", i % 2 === 1));

describe("people kits", () => {
  it("is deterministic per seed", () => { expect(kitFor(7, "pedestrian", false)).toEqual(kitFor(7, "pedestrian", false)); });
  it("keeps bodies within a believable range", () => { for (const k of crowd) { expect(k.height).toBeGreaterThan(0.89); expect(k.height).toBeLessThan(1.07); expect(k.build).toBeGreaterThan(0.92); expect(k.build).toBeLessThan(1.11); } });
  it("varies what people carry and wear", () => {
    const bags = new Set(crowd.map(k => k.bag)); expect(bags).toEqual(new Set(["none", "backpack", "jhola", "thaila"]));
    expect(new Set(crowd.map(k => k.top)).size).toBeGreaterThan(14); expect(crowd.filter(k => k.glasses).length).toBeGreaterThan(40);
    expect(crowd.filter(k => k.bag === "none").length).toBeGreaterThan(100);
  });
  it("dresses women and men from their own wardrobes", () => {
    crowd.forEach((k, i) => { const female = i % 2 === 1; if (female) { expect(KURTIS).toContain(k.top); expect(k.moustache).toBe(false); expect(k.beard).toBe(false); } else { expect(SHIRTS).toContain(k.top); expect(k.dupatta).toBeNull(); expect(k.bindi).toBe(false); } });
    expect(crowd.filter(k => k.dupatta !== null).length).toBeGreaterThan(80); expect(crowd.filter(k => k.moustache).length).toBeGreaterThan(60);
  });
  it("puts the police and auto drivers in khaki, with nothing in their hands", () => {
    const cop = kitFor(5, "police", false), driver = kitFor(3, "auto", false);
    expect(cop.uniform).toBe("police"); expect(cop.top).toBe(KHAKI.shirt); expect(cop.bottom).toBe(KHAKI.trousers); expect(cop.moustache).toBe(true); expect(cop.bag).toBe("none");
    expect(driver.uniform).toBe("khaki"); expect(driver.top).toBe(KHAKI.shirt); expect(driver.bag).toBe("none");
    expect(kitFor(9, "vendor", false).bag).toBe("none");
  });
});
