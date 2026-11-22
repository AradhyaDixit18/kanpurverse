/**
 * Runtime side of the fuel system: per-vehicle tank levels, HUD telemetry and the refuel action.
 * The maths lives in packages/shared/src/fuel.ts (pure, tested). This file only touches the store and toasts.
 * Tank levels live for the session; they are not written to the save file.
 */
import { FUEL_SPECS, FUEL_NAMES, FUEL_STATIONS, DEFAULT_FUEL_LEVEL, fuelUnits, fuelRangeMetres, isLowFuel, nearestStation, quoteRefuel, stationAt, type FuelType, type VehicleKind } from "@kanpurverse/shared";
import { useStore, tl } from "../state/store";

/** Fraction (0..1) in each vehicle's tank, keyed by vehicle id. */
export const fuelLevels = new Map<string, number>();
const warned = new Set<string>();

/** Read by the HUD every 100 ms. Plain object so UI code never imports three.js. */
export const fuelTelemetry = { on: false, type: "none" as FuelType, level: 1, units: 0, unit: "", rangeKm: 0, low: false, dead: false, station: "", stationServes: true, nearestM: -1, nearestName: "" };

export function updateFuelTelemetry(kind: VehicleKind, level: number, x: number, z: number) {
  const f = FUEL_SPECS[kind]; const t = fuelTelemetry;
  t.on = f.type !== "none"; t.type = f.type; t.level = level; t.units = fuelUnits(kind, level); t.unit = f.unit;
  t.rangeKm = Math.round(fuelRangeMetres(kind, level) / 100) / 10; // km of map distance the tank still covers
  t.low = isLowFuel(kind, level); t.dead = t.on && level <= 0;
  const here = stationAt(x, z); t.station = here ? (useStore.getState().settings.lang === "english" ? here.name : here.nameHi) : "";
  t.stationServes = here ? here.services.includes(f.type) : true;
  const near = nearestStation(x, z, f.type as FuelType, FUEL_STATIONS); t.nearestM = near ? Math.round(near.distance) : -1; t.nearestName = near ? (useStore.getState().settings.lang === "english" ? near.station.name : near.station.nameHi) : "";
}

/** One-shot toasts: low fuel once per tank, empty once per stop. */
export function fuelWarnings(id: string, kind: VehicleKind, level: number) {
  const f = FUEL_SPECS[kind]; if (f.type === "none") return;
  const name = FUEL_NAMES[f.type];
  if (level <= 0) { if (!warned.has(id + ":dead")) { warned.add(id + ":dead"); useStore.getState().toast(tl(`${name.hi} खत्म! गाड़ी बंद हो गई। पंप तक धकेलना पड़ेगा।`, `Out of ${name.en.toLowerCase()}. The engine has cut out.`), "error"); } }
  else if (isLowFuel(kind, level)) { if (!warned.has(id + ":low")) { warned.add(id + ":low"); useStore.getState().toast(tl(`${name.hi} कम है। नज़दीकी पंप ढूँढिए।`, `Low ${name.en.toLowerCase()}. Find a station.`), "error"); } }
  else { warned.delete(id + ":low"); warned.delete(id + ":dead"); }
}

/**
 * Refuel the vehicle at the station the player is standing in. The dispenser supplies the vehicle's own fuel, so the wrong
 * fuel can only be refused (see `quoteRefuel`); a station that does not stock it says so. Returns true if fuel was bought.
 */
export function refuelHere(id: string, kind: VehicleKind, x: number, z: number, speed: number): boolean {
  const s = useStore.getState(); const f = FUEL_SPECS[kind];
  if (f.type === "none") { s.toast(tl("पैडल रिक्शा में ईंधन नहीं लगता।", "A cycle rickshaw needs no fuel."), "info"); return false; }
  const st = stationAt(x, z);
  if (!st) { const n = nearestStation(x, z, f.type); s.toast(n ? tl(`पास में पंप नहीं। सबसे नज़दीकी: ${n.station.nameHi}, ${Math.round(n.distance)} मी।`, `No station here. Nearest: ${n.station.name}, ${Math.round(n.distance)} m.`) : tl("पास में पंप नहीं।", "No station nearby."), "info"); return false; }
  if (Math.abs(speed) > 1.5) { s.toast(tl("पहले गाड़ी रोकिए।", "Stop the vehicle first."), "info"); return false; }
  const level = fuelLevels.get(id) ?? DEFAULT_FUEL_LEVEL; const coins = s.profile?.coins ?? 0;
  const q = quoteRefuel(kind, level, f.type, new Set(st.services), 1, coins); const name = FUEL_NAMES[f.type];
  if (!q.ok) {
    const msg: Record<string, [string, string]> = {
      "wrong-fuel": ["इस गाड़ी में ये ईंधन नहीं चलता।", "This vehicle does not take that fuel."],
      unavailable: [`${st.nameHi} पर ${name.hi} नहीं मिलता।`, `${st.name} does not sell ${name.en.toLowerCase()}.`],
      full: ["टंकी पहले से भरी है।", "The tank is already full."],
      broke: ["पैसे कम हैं। पहले कुछ कमाइए।", "Not enough coins."],
      pedal: ["पैडल रिक्शा में ईंधन नहीं लगता।", "A cycle rickshaw needs no fuel."],
    };
    const m = msg[q.reason ?? "unavailable"]; s.toast(tl(m[0], m[1]), "error"); return false;
  }
  fuelLevels.set(id, q.newLevel); warned.delete(id + ":low"); warned.delete(id + ":dead");
  if (s.profile) s.set({ profile: { ...s.profile, coins: s.profile.coins - q.cost }, game: { ...s.game, stats: { ...s.game.stats, spent: s.game.stats.spent + q.cost } } });
  const u = `${q.units.toFixed(1)} ${f.unit}`;
  s.toast(tl(`${name.hi} भरा: ${u}, ₹${q.cost}`, `${name.en}: ${u} for ₹${q.cost}`), "reward");
  return true;
}
