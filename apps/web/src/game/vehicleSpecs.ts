import type { VehicleKind } from "@kanpurverse/shared";
export const SPECS: Record<VehicleKind, { accel: number; max: number; turn: number; size: [number, number, number]; seats: number; wheelR: number }> = {
  hatchback: { accel: 10, max: 26, turn: 2.0, size: [1.75, 1.45, 3.8], seats: 2, wheelR: 0.32 }, sedan: { accel: 11, max: 32, turn: 1.8, size: [1.85, 1.4, 4.6], seats: 2, wheelR: 0.33 }, suv: { accel: 9.5, max: 30, turn: 1.7, size: [2.05, 1.85, 4.8], seats: 2, wheelR: 0.4 },
  bike: { accel: 13, max: 36, turn: 2.7, size: [0.7, 1.1, 2.1], seats: 2, wheelR: 0.32 }, scooter: { accel: 8, max: 20, turn: 2.9, size: [0.7, 1.1, 1.8], seats: 2, wheelR: 0.26 }, auto: { accel: 7, max: 17, turn: 2.5, size: [1.45, 1.75, 2.8], seats: 2, wheelR: 0.28 },
  erickshaw: { accel: 5, max: 11, turn: 2.6, size: [1.3, 1.8, 2.9], seats: 2, wheelR: 0.3 }, bus: { accel: 5, max: 22, turn: 1.2, size: [2.5, 3.1, 10.5], seats: 2, wheelR: 0.5 }, truck: { accel: 6, max: 24, turn: 1.3, size: [2.4, 2.8, 7.5], seats: 2, wheelR: 0.5 }, taxi: { accel: 10, max: 26, turn: 2.0, size: [1.75, 1.45, 3.9], seats: 2, wheelR: 0.32 },
};
