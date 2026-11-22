/**
 * Fuel model. Pure and deterministic, like driving.ts: no three.js, no React, no clock.
 *
 * Every vehicle kind has one fuel type, a tank size and a real-world-style economy figure. These are typical figures for the
 * Indian road class each vehicle represents, rounded for game balance. They are NOT specifications of any manufacturer's
 * variant. Distances are scaled by `FUEL_DISTANCE_SCALE` because the playable map is only about 5 km across; at true economy
 * a hatchback tank would last 600 km and the mechanic would never matter.
 *
 * Units: petrol and diesel in litres, CNG in kilograms, electricity in kWh. Prices are in-game rupees (fictional, not live).
 */
import type { VehicleKind } from "./protocol";

export type FuelType = "petrol" | "diesel" | "cng" | "electric" | "none";
export type RealFuel = Exclude<FuelType, "none">;

export interface FuelSpec {
  type: FuelType;
  /** Tank (L), cylinder (kg CNG) or battery (kWh). 0 for pedal vehicles. */
  tank: number;
  /** True-economy distance per unit of fuel, in km. */
  kmPerUnit: number;
  /** Unit label for the HUD. */
  unit: "L" | "kg" | "kWh" | "";
}

export const FUEL_DISTANCE_SCALE = 40;
/** Idle burn, expressed as metres of driving per second at the same load. */
export const IDLE_BURN_METRES_PER_S = 6;
/** The low-fuel warning appears at or below this fraction of the tank. */
export const LOW_FUEL = 0.15;

export const FUEL_SPECS: Record<VehicleKind, FuelSpec> = {
  hatchback:     { type: "petrol",   tank: 35,  kmPerUnit: 18, unit: "L" },
  sedan:         { type: "petrol",   tank: 37,  kmPerUnit: 17, unit: "L" },
  taxi:          { type: "cng",      tank: 12,  kmPerUnit: 24, unit: "kg" },
  compactsuv:    { type: "diesel",   tank: 42,  kmPerUnit: 17, unit: "L" },
  suv:           { type: "diesel",   tank: 55,  kmPerUnit: 12, unit: "L" },
  muv:           { type: "diesel",   tank: 55,  kmPerUnit: 13, unit: "L" },
  offroader:     { type: "diesel",   tank: 57,  kmPerUnit: 14, unit: "L" },
  bike:          { type: "petrol",   tank: 10,  kmPerUnit: 60, unit: "L" },
  cruiser:       { type: "petrol",   tank: 13,  kmPerUnit: 35, unit: "L" },
  sportbike:     { type: "petrol",   tank: 15,  kmPerUnit: 40, unit: "L" },
  scooter:       { type: "petrol",   tank: 5,   kmPerUnit: 50, unit: "L" },
  auto:          { type: "cng",      tank: 6,   kmPerUnit: 35, unit: "kg" },
  erickshaw:     { type: "electric", tank: 8,   kmPerUnit: 10, unit: "kWh" },
  cyclerickshaw: { type: "none",     tank: 0,   kmPerUnit: 0,  unit: "" },
  van:           { type: "diesel",   tank: 30,  kmPerUnit: 18, unit: "L" },
  schoolbus:     { type: "diesel",   tank: 100, kmPerUnit: 5,  unit: "L" },
  bus:           { type: "diesel",   tank: 150, kmPerUnit: 4,  unit: "L" },
  truck:         { type: "diesel",   tank: 120, kmPerUnit: 4,  unit: "L" },
};

/** In-game prices per unit (rupees). Fictional and constant. Petrol and diesel match the Velto Petroleum price totem. */
export const FUEL_PRICES: Record<RealFuel, number> = { petrol: 96.4, diesel: 89.6, cng: 76.5, electric: 18 };

export const FUEL_NAMES: Record<FuelType, { en: string; hi: string }> = {
  petrol: { en: "Petrol", hi: "पेट्रोल" },
  diesel: { en: "Diesel", hi: "डीज़ल" },
  cng: { en: "CNG", hi: "सीएनजी" },
  electric: { en: "Charging", hi: "चार्जिंग" },
  none: { en: "Pedal power", hi: "पैडल" },
};

/** Pedal vehicles never consume and are always "full". */
export const fuelUses = (kind: VehicleKind) => FUEL_SPECS[kind].type !== "none";

/**
 * Fraction of the tank used by moving `metres` at the given throttle, plus `idleSeconds` of standing with the engine on.
 * Load factor: coasting burns 25% less than the economy figure, full throttle 25% more.
 */
export function fuelBurn(kind: VehicleKind, metres: number, throttle: number, idleSeconds = 0): number {
  const f = FUEL_SPECS[kind]; if (f.type === "none" || f.tank <= 0 || f.kmPerUnit <= 0) return 0;
  const unitsPerMetre = FUEL_DISTANCE_SCALE / (f.kmPerUnit * 1000);
  const load = 0.75 + 0.5 * Math.min(1, Math.max(0, Math.abs(throttle)));
  return Math.max(0, ((Math.abs(metres) * load + idleSeconds * IDLE_BURN_METRES_PER_S) * unitsPerMetre) / f.tank);
}

/** Remaining driving range in game metres at the economy figure. */
export function fuelRangeMetres(kind: VehicleKind, level: number): number {
  const f = FUEL_SPECS[kind]; if (f.type === "none") return Infinity;
  return (level * f.tank * f.kmPerUnit * 1000) / FUEL_DISTANCE_SCALE;
}

/** Units currently in the tank, for the HUD. */
export const fuelUnits = (kind: VehicleKind, level: number) => level * FUEL_SPECS[kind].tank;

export const isLowFuel = (kind: VehicleKind, level: number) => fuelUses(kind) && level <= LOW_FUEL;

/** A dispenser supplies one fuel type and the vehicle must match it. A petrol vehicle never accepts diesel, and so on. */
export const canAccept = (kind: VehicleKind, supplied: FuelType) => fuelUses(kind) && FUEL_SPECS[kind].type === supplied;

export interface RefuelQuote { ok: boolean; reason?: "pedal" | "wrong-fuel" | "full" | "unavailable" | "broke"; units: number; cost: number; newLevel: number }

/**
 * Price a refuel. `want` is the fraction of the tank to add (1 = fill up). Money is whole rupees, rounded up so a fill is never
 * free. `coins` caps the purchase: the player buys as much as they can afford. Failure returns a reason and zero cost.
 */
export function quoteRefuel(kind: VehicleKind, level: number, supplied: FuelType, available: ReadonlySet<FuelType>, want: number, coins: number): RefuelQuote {
  const f = FUEL_SPECS[kind]; const no = (reason: NonNullable<RefuelQuote["reason"]>): RefuelQuote => ({ ok: false, reason, units: 0, cost: 0, newLevel: level });
  if (f.type === "none") return no("pedal");
  if (!canAccept(kind, supplied)) return no("wrong-fuel");
  if (!available.has(supplied)) return no("unavailable");
  const room = Math.max(0, 1 - level); if (room < 0.005) return no("full");
  const price = FUEL_PRICES[supplied as RealFuel];
  const add = Math.min(room, Math.max(0, want), coins / price / f.tank);
  if (add <= 0.0005) return no("broke");
  const units = add * f.tank; const cost = Math.max(1, Math.ceil(units * price));
  return { ok: true, units, cost, newLevel: Math.min(1, level + add) };
}

/** Starting tank for a vehicle with no recorded level: enough to drive a good part of the map, so the first station matters. */
export const DEFAULT_FUEL_LEVEL = 0.6;

export interface FuelStation {
  id: string; name: string; nameHi: string;
  /** World metres (+x east, +z south), the same space as the OSM extract. */
  x: number; z: number;
  /** Radius (m) around (x, z) inside which a vehicle can be served. */
  r: number;
  services: readonly FuelType[];
  /** `fictional`: invented for the game. `osm`: a node mapped in OpenStreetMap (ODbL). */
  source: "fictional" | "osm";
  /** Whether `services` is confirmed. OSM nodes with no fuel tags are unconfirmed and assumed petrol + diesel. */
  servicesConfirmed: boolean;
  operator?: string; osmId?: number;
}

/**
 * Stations the game serves. Velto Petroleum is the invented station built in PetrolPump.tsx; in game it also offers CNG and an
 * EV charge point so every fuel type can be refilled. The second entry is the only fuel node in the committed OSM extract
 * (kanpur.json): it has a name but no brand, operator or fuel tags, so its services are assumed, not verified.
 * `scripts/geo/fetch_kanpur_osm.py` now records those tags, so re-running it can fill this list from mapped data.
 */
export const FUEL_STATIONS: readonly FuelStation[] = [
  { id: "velto_petroleum", name: "Velto Petroleum", nameHi: "वेल्टो पेट्रोलियम", x: 435, z: -271.6, r: 22, services: ["petrol", "diesel", "cng", "electric"], source: "fictional", servicesConfirmed: true },
  { id: "osm_4792187015", name: "Petrol Pump", nameHi: "पेट्रोल पंप", x: -758.01, z: -1824.31, r: 24, services: ["petrol", "diesel"], source: "osm", servicesConfirmed: false, osmId: 4792187015 },
];

export function stationAt(x: number, z: number, stations: readonly FuelStation[] = FUEL_STATIONS): FuelStation | undefined {
  let best: FuelStation | undefined, bd = Infinity;
  for (const s of stations) { const d = Math.hypot(s.x - x, s.z - z); if (d <= s.r && d < bd) { best = s; bd = d; } }
  return best;
}

/** Nearest station, optionally one that stocks `need`, with the distance in metres. */
export function nearestStation(x: number, z: number, need?: FuelType, stations: readonly FuelStation[] = FUEL_STATIONS): { station: FuelStation; distance: number } | undefined {
  let best: { station: FuelStation; distance: number } | undefined;
  for (const s of stations) { if (need && !s.services.includes(need)) continue; const d = Math.hypot(s.x - x, s.z - z); if (!best || d < best.distance) best = { station: s, distance: d }; }
  return best;
}
