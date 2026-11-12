import type { VehicleKind } from "./protocol";
export interface VehicleSpec {
  accel: number; max: number; turn: number; size: [number, number, number]; seats: number; wheelR: number;
  wheelBase: number; steerLock: number; brake: number; grip: number; drag: number; response: number; steerFade: number;
  /** Visual/handling family. */
  cls: "car" | "two" | "three" | "heavy" | "pedal";
}
type S = Omit<VehicleSpec, "turn" | "seats" | "drag"> & { drag?: number; seats?: number };
const v = (s: S): VehicleSpec => ({ turn: 2, seats: 2, drag: s.cls === "two" ? 0.0022 : s.cls === "heavy" ? 0.0026 : 0.0016, ...s });
/** Handling sheet. Sizes are metres [width, height, length]; speeds m/s; accelerations m/s²; grip in g. */
export const VEHICLE_SPECS: Record<VehicleKind, VehicleSpec> = {
  hatchback:  v({ cls: "car",   accel: 9,   max: 30,  size: [1.72, 1.5, 3.85], wheelR: 0.31, wheelBase: 2.45, steerLock: 0.55, brake: 10, grip: 0.95, response: 9,   steerFade: 16 }),
  sedan:      v({ cls: "car",   accel: 8.5, max: 33,  size: [1.74, 1.5, 4.0],  wheelR: 0.32, wheelBase: 2.45, steerLock: 0.52, brake: 10, grip: 0.95, response: 8,   steerFade: 18 }),
  taxi:       v({ cls: "car",   accel: 8.5, max: 28,  size: [1.72, 1.5, 3.95], wheelR: 0.31, wheelBase: 2.45, steerLock: 0.55, brake: 10, grip: 0.92, response: 8.5, steerFade: 16 }),
  compactsuv: v({ cls: "car",   accel: 8.5, max: 32,  size: [1.8, 1.64, 4.0],  wheelR: 0.36, wheelBase: 2.5,  steerLock: 0.52, brake: 10, grip: 0.9,  response: 7.5, steerFade: 17 }),
  suv:        v({ cls: "car",   accel: 7.5, max: 31,  size: [1.86, 1.88, 4.6], wheelR: 0.4,  wheelBase: 2.75, steerLock: 0.5,  brake: 10, grip: 0.85, response: 6,   steerFade: 18 }),
  muv:        v({ cls: "car",   accel: 7.2, max: 31,  size: [1.83, 1.8, 4.75], wheelR: 0.37, wheelBase: 2.75, steerLock: 0.5,  brake: 10, grip: 0.86, response: 6,   steerFade: 19 }),
  offroader:  v({ cls: "car",   accel: 8,   max: 28,  size: [1.82, 1.9, 3.98], wheelR: 0.42, wheelBase: 2.45, steerLock: 0.55, brake: 10, grip: 0.82, response: 7,   steerFade: 15 }),
  bike:       v({ cls: "two",   accel: 8.5, max: 26,  size: [0.72, 1.05, 2.0], wheelR: 0.3,  wheelBase: 1.25, steerLock: 0.6,  brake: 10, grip: 1.0,  response: 12,  steerFade: 12 }),
  cruiser:    v({ cls: "two",   accel: 7.5, max: 31,  size: [0.8, 1.1, 2.15],  wheelR: 0.33, wheelBase: 1.38, steerLock: 0.55, brake: 10, grip: 0.95, response: 9,   steerFade: 14 }),
  sportbike:  v({ cls: "two",   accel: 12,  max: 40,  size: [0.78, 1.1, 2.0],  wheelR: 0.31, wheelBase: 1.35, steerLock: 0.55, brake: 11, grip: 1.1,  response: 14,  steerFade: 18 }),
  scooter:    v({ cls: "two",   accel: 7,   max: 22,  size: [0.7, 1.1, 1.83],  wheelR: 0.24, wheelBase: 1.27, steerLock: 0.65, brake: 10, grip: 0.95, response: 12,  steerFade: 10 }),
  auto:       v({ cls: "three", accel: 5.5, max: 16,  size: [1.4, 1.75, 2.65], wheelR: 0.27, wheelBase: 1.95, steerLock: 0.7,  brake: 10, grip: 0.75, response: 7,   steerFade: 9 }),
  erickshaw:  v({ cls: "three", accel: 3.8, max: 7,   size: [1.3, 1.8, 2.9],   wheelR: 0.3,  wheelBase: 2.0,  steerLock: 0.7,  brake: 10, grip: 0.75, response: 6,   steerFade: 8 }),
  cyclerickshaw: v({ cls: "pedal", accel: 2.2, max: 4.5, size: [1.1, 1.8, 2.6], wheelR: 0.33, wheelBase: 1.7, steerLock: 0.75, brake: 10, grip: 0.7, response: 5, steerFade: 6 }),
  van:        v({ cls: "heavy", accel: 6,   max: 22,  size: [1.55, 1.85, 3.8], wheelR: 0.33, wheelBase: 2.25, steerLock: 0.58, brake: 10, grip: 0.78, response: 5.5, steerFade: 14 }),
  schoolbus:  v({ cls: "heavy", accel: 4.5, max: 20,  size: [2.4, 2.9, 8.0],   wheelR: 0.45, wheelBase: 4.6,  steerLock: 0.52, brake: 10, grip: 0.65, response: 3.5, steerFade: 14 }),
  bus:        v({ cls: "heavy", accel: 4.2, max: 22,  size: [2.5, 3.1, 10.5],  wheelR: 0.5,  wheelBase: 6.0,  steerLock: 0.5,  brake: 10, grip: 0.62, response: 3.2, steerFade: 14 }),
  truck:      v({ cls: "heavy", accel: 4.5, max: 22,  size: [2.4, 2.8, 7.5],   wheelR: 0.5,  wheelBase: 4.2,  steerLock: 0.52, brake: 10, grip: 0.62, response: 3.4, steerFade: 14 }),
};

/**
 * Player-facing catalogue. Every model is an original Velto Studios design built in code. "Class" names the familiar
 * Indian road category it represents; no manufacturer name, logo or endorsement is used or implied.
 */
export const VEHICLE_INFO: Record<VehicleKind, { name: string; nameHi: string; cls: string; clsHi: string }> = {
  hatchback: { name: "Velto Chhota", nameHi: "वेल्टो छोटा", cls: "Compact hatchback", clsHi: "कॉम्पैक्ट हैचबैक" },
  sedan: { name: "Velto Shaan", nameHi: "वेल्टो शान", cls: "Compact sedan", clsHi: "कॉम्पैक्ट सेडान" },
  taxi: { name: "Shehar Cab", nameHi: "शहर कैब", cls: "City taxi", clsHi: "सिटी टैक्सी" },
  compactsuv: { name: "Velto Tez", nameHi: "वेल्टो तेज़", cls: "Compact SUV", clsHi: "कॉम्पैक्ट SUV" },
  suv: { name: "Velto Sher", nameHi: "वेल्टो शेर", cls: "Full-size SUV", clsHi: "बड़ी SUV" },
  muv: { name: "Velto Parivaar", nameHi: "वेल्टो परिवार", cls: "Seven-seat MUV", clsHi: "सात-सीटर MUV" },
  offroader: { name: "Velto Pahadi", nameHi: "वेल्टो पहाड़ी", cls: "Off-roader", clsHi: "ऑफ़-रोडर" },
  bike: { name: "Sawari 100", nameHi: "सवारी 100", cls: "Commuter motorcycle", clsHi: "कम्यूटर बाइक" },
  cruiser: { name: "Dhadkan 350", nameHi: "धड़कन 350", cls: "Classic thumper", clsHi: "क्लासिक बुलेट-स्टाइल" },
  sportbike: { name: "Toofan 200", nameHi: "तूफ़ान 200", cls: "Street sport bike", clsHi: "स्पोर्ट्स बाइक" },
  scooter: { name: "Chalu 110", nameHi: "चालू 110", cls: "Family scooter", clsHi: "स्कूटर" },
  auto: { name: "Tempo Auto", nameHi: "टेम्पो ऑटो", cls: "Auto-rickshaw", clsHi: "ऑटो-रिक्शा" },
  erickshaw: { name: "Bijli Rickshaw", nameHi: "बिजली रिक्शा", cls: "E-rickshaw", clsHi: "ई-रिक्शा" },
  cyclerickshaw: { name: "Pedal Rickshaw", nameHi: "साइकिल रिक्शा", cls: "Cycle rickshaw", clsHi: "साइकिल रिक्शा" },
  van: { name: "Chhota Haathi", nameHi: "छोटा हाथी", cls: "Mini delivery truck", clsHi: "मिनी ट्रक" },
  schoolbus: { name: "School Bus", nameHi: "स्कूल बस", cls: "School bus", clsHi: "स्कूल बस" },
  bus: { name: "Nagar Bus", nameHi: "नगर बस", cls: "City bus", clsHi: "सिटी बस" },
  truck: { name: "Maal Gaadi", nameHi: "माल गाड़ी", cls: "Goods truck", clsHi: "ट्रक" },
};
export const TWO_WHEELERS: readonly VehicleKind[] = ["bike", "cruiser", "sportbike", "scooter"];


export type VehicleSeat = "driver" | "passenger";
/** Seat roots are local to the chassis. Avatar hips in a seated pose are 0.42m above its root. */
export function vehicleSeatPose(kind: VehicleKind, seat: VehicleSeat): { p: [number, number, number]; scale: number } {
  const [w, h, l] = VEHICLE_SPECS[kind].size;
  const driver = seat === "driver";
  if (TWO_WHEELERS.includes(kind)) return { p: [0, 0.07, driver ? -l * 0.10 : -l * 0.35], scale: 0.85 };
  if (kind === "cyclerickshaw") return { p: [0, driver ? 0.15 : -0.1, driver ? l * 0.22 : -l * 0.22], scale: 0.85 };
  if (kind === "auto" || kind === "erickshaw") return { p: [0, -0.30, driver ? l * 0.21 : -l * 0.26], scale: 0.85 };
  if (kind === "bus" || kind === "schoolbus") return { p: [(driver ? 1 : -1) * w * 0.25, -h / 2 + 0.85, driver ? l * 0.37 : l * 0.12], scale: 0.85 };
  if (kind === "truck" || kind === "van") return { p: [(driver ? 1 : -1) * w * 0.25, -h / 2 + 0.5, l * 0.29], scale: 0.85 };
  return { p: [(driver ? 1 : -1) * w * 0.23, -h / 2 + 0.10, l * 0.08], scale: 0.82 };
}
export function vehicleYaw(q: readonly number[]) { return Math.atan2(2 * (q[3] * q[1] + q[0] * q[2]), 1 - 2 * (q[1] ** 2 + q[2] ** 2)); }
export function vehicleLocalToWorld(p: readonly number[], yaw: number, local: readonly number[]): [number, number, number] {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return [p[0] + local[0] * c + local[2] * s, p[1] + local[1], p[2] - local[0] * s + local[2] * c];
}
/** Both doors, then front and rear. The capsule clears the full chassis, including buses/trucks. */
export function vehicleExitCandidates(kind: VehicleKind, p: readonly number[], q: readonly number[], seat: VehicleSeat): [number, number, number][] {
  const [w, , l] = VEHICLE_SPECS[kind].size;
  const doorZ = vehicleSeatPose(kind, seat).p[2]; const side = seat === "driver" ? 1 : -1;
  const sideX = w / 2 + 0.35 + 0.35;
  const offsets = [[sideX * side, 0, doorZ], [-sideX * side, 0, doorZ], [0, 0, l / 2 + 0.7], [0, 0, -l / 2 - 0.7]];
  return offsets.map(local => { const pos = vehicleLocalToWorld(p, vehicleYaw(q), local); pos[1] = 0; return pos; });
}

/** Feature negotiation lets new previews fail closed against an older production backend. */
export const VEHICLE_EXIT_CAPABILITY = "vehicle-exit-candidates-v1";
