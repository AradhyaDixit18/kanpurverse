import { describe, it, expect } from "vitest";
import { VEHICLE_SPECS, type VehicleKind } from "@kanpurverse/shared";
import { FUEL_SPECS, FUEL_PRICES, FUEL_STATIONS, FUEL_DISTANCE_SCALE, fuelBurn, fuelRangeMetres, canAccept, quoteRefuel, stationAt, nearestStation, isLowFuel, fuelUses, LOW_FUEL, type FuelType } from "../packages/shared/src/fuel";

const kinds = Object.keys(VEHICLE_SPECS) as VehicleKind[];
const all = new Set<FuelType>(["petrol", "diesel", "cng", "electric"]);

describe("fuel specs", () => {
  it("covers every vehicle kind with sane numbers", () => {
    for (const k of kinds) {
      const f = FUEL_SPECS[k]; expect(f, k).toBeTruthy();
      if (f.type === "none") { expect(f.tank).toBe(0); continue; }
      expect(f.tank, k).toBeGreaterThan(0); expect(f.kmPerUnit, k).toBeGreaterThan(0); expect(f.unit, k).not.toBe("");
    }
  });
  it("assigns the fuel types Indian road vehicles actually use", () => {
    expect(FUEL_SPECS.auto.type).toBe("cng"); expect(FUEL_SPECS.taxi.type).toBe("cng"); expect(FUEL_SPECS.erickshaw.type).toBe("electric");
    expect(FUEL_SPECS.bus.type).toBe("diesel"); expect(FUEL_SPECS.truck.type).toBe("diesel"); expect(FUEL_SPECS.scooter.type).toBe("petrol");
    expect(FUEL_SPECS.cyclerickshaw.type).toBe("none");
  });
  it("has a price for every real fuel", () => { for (const t of ["petrol", "diesel", "cng", "electric"] as const) expect(FUEL_PRICES[t]).toBeGreaterThan(0); });
});

describe("fuelBurn and range", () => {
  it("burns more at full throttle than coasting, and nothing for pedal vehicles", () => {
    expect(fuelBurn("hatchback", 100, 1)).toBeGreaterThan(fuelBurn("hatchback", 100, 0));
    expect(fuelBurn("cyclerickshaw", 1000, 1, 60)).toBe(0);
  });
  it("matches scaled economy: a full tank empties over the range at mid throttle", () => {
    const f = FUEL_SPECS.hatchback; const metres = fuelRangeMetres("hatchback", 1);
    expect(metres).toBeCloseTo((f.tank * f.kmPerUnit * 1000) / FUEL_DISTANCE_SCALE, 6);
    expect(fuelBurn("hatchback", metres, 0.5)).toBeCloseTo(1, 6); // load factor is 1.0 at throttle 0.5
  });
  it("makes thirsty vehicles use more fuel per metre than frugal ones", () => {
    const units = (k: VehicleKind) => fuelBurn(k, 1000, 0.5) * FUEL_SPECS[k].tank;
    expect(units("bus")).toBeGreaterThan(units("hatchback")); expect(units("hatchback")).toBeGreaterThan(units("bike"));
  });
  it("burns fuel while idling", () => { expect(fuelBurn("auto", 0, 0, 30)).toBeGreaterThan(0); });
  it("flags low fuel", () => { expect(isLowFuel("sedan", LOW_FUEL)).toBe(true); expect(isLowFuel("sedan", 0.5)).toBe(false); expect(isLowFuel("cyclerickshaw", 0)).toBe(false); });
  it("reports pedal vehicles as unlimited range", () => { expect(fuelRangeMetres("cyclerickshaw", 0)).toBe(Infinity); expect(fuelUses("cyclerickshaw")).toBe(false); });
});

describe("fuel compatibility", () => {
  it("never accepts the wrong fuel", () => {
    expect(canAccept("hatchback", "petrol")).toBe(true); expect(canAccept("hatchback", "diesel")).toBe(false);
    expect(canAccept("suv", "petrol")).toBe(false); expect(canAccept("suv", "diesel")).toBe(true);
    expect(canAccept("auto", "cng")).toBe(true); expect(canAccept("auto", "petrol")).toBe(false);
    expect(canAccept("erickshaw", "electric")).toBe(true); expect(canAccept("erickshaw", "cng")).toBe(false);
    expect(canAccept("cyclerickshaw", "petrol")).toBe(false);
  });
});

describe("quoteRefuel", () => {
  it("rejects a wrong-fuel pump with no charge", () => { expect(quoteRefuel("hatchback", 0.2, "diesel", all, 1, 10_000)).toMatchObject({ ok: false, reason: "wrong-fuel", cost: 0, newLevel: 0.2 }); });
  it("rejects when the station lacks the fuel", () => { expect(quoteRefuel("auto", 0.2, "cng", new Set<FuelType>(["petrol"]), 1, 10_000).reason).toBe("unavailable"); });
  it("rejects a full tank and a pedal vehicle", () => { expect(quoteRefuel("bike", 1, "petrol", all, 1, 999).reason).toBe("full"); expect(quoteRefuel("cyclerickshaw", 0, "petrol", all, 1, 999).reason).toBe("pedal"); });
  it("prices a fill at units × price, rounded up", () => {
    const q = quoteRefuel("hatchback", 0.5, "petrol", all, 1, 100_000);
    expect(q.ok).toBe(true); expect(q.newLevel).toBe(1); expect(q.units).toBeCloseTo(17.5, 6); expect(q.cost).toBe(Math.ceil(17.5 * FUEL_PRICES.petrol));
  });
  it("caps the purchase at what the player can afford", () => {
    const q = quoteRefuel("hatchback", 0.1, "petrol", all, 1, 200);
    expect(q.ok).toBe(true); expect(q.cost).toBeLessThanOrEqual(201); expect(q.newLevel).toBeGreaterThan(0.1); expect(q.newLevel).toBeLessThan(1);
    expect(quoteRefuel("hatchback", 0.1, "petrol", all, 1, 0)).toMatchObject({ ok: false, reason: "broke", cost: 0 });
  });
  it("honours a partial request", () => { expect(quoteRefuel("sedan", 0.1, "petrol", all, 0.3, 1e6).newLevel).toBeCloseTo(0.4, 6); });
});

describe("stations", () => {
  it("has unique ids and valid services", () => {
    expect(new Set(FUEL_STATIONS.map(s => s.id)).size).toBe(FUEL_STATIONS.length);
    for (const s of FUEL_STATIONS) { expect(s.services.length).toBeGreaterThan(0); expect(s.r).toBeGreaterThan(0); }
  });
  it("serves every fuel type somewhere so every vehicle can refill", () => {
    const have = new Set(FUEL_STATIONS.flatMap(s => s.services));
    for (const k of kinds) if (fuelUses(k)) expect(have.has(FUEL_SPECS[k].type), k).toBe(true);
  });
  it("finds the station you are standing in and the nearest one that stocks a fuel", () => {
    expect(stationAt(435, -271.6)?.id).toBe("velto_petroleum"); expect(stationAt(0, 0)).toBeUndefined();
    expect(nearestStation(0, 0, "cng")?.station.id).toBe("velto_petroleum");
    expect(nearestStation(-700, -1800)?.station.id).toBe("osm_4792187015");
  });
  it("marks OSM stations as unconfirmed until tags are recorded", () => { for (const s of FUEL_STATIONS.filter(s => s.source === "osm")) expect(s.servicesConfirmed).toBe(false); });
});
