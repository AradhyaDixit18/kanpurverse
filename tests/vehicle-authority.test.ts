import { afterEach, describe, expect, it, vi } from "vitest";
import { Player, Room } from "../apps/server/src/room";
import { DEFAULT_APPEARANCE, VEHICLE_SPECS, type S2C } from "../packages/shared/src/index";
import type { Storage } from "../apps/server/src/storage";
import type { WebSocket } from "ws";
const rooms: Room[] = [];
afterEach(() => { for (const r of rooms.splice(0)) r.destroy(); vi.useRealTimers(); });
function setup() {
  const storage = { putPlayer: async () => {} } as unknown as Storage;
  const room = new Room("regression", storage, 32); rooms.push(room);
  const make = (id: string) => {
    const messages: S2C[] = [];
    const ws = { OPEN: 1, readyState: 1, send: (raw: string) => messages.push(JSON.parse(raw)) } as unknown as WebSocket;
    const p = new Player(ws, { _id: id, name: id, appearance: DEFAULT_APPEARANCE, lang: "english", coins: 200, xp: 0, level: 1, missionsCompleted: [], unlocked: [], friends: [], blocked: [], playtimeSec: 0, createdAt: 0, lastSeenAt: 0, reports: 0 });
    room.players.set(id, p); return { p, messages };
  };
  const vehicle = [...room.vehicles.values()][0];
  return { room, vehicle, make };
}
describe("vehicle authority regressions", () => {
  it("failed transfer and repeated entry preserve the player's existing seat", () => {
    const { room, vehicle, make } = setup(); const { p, messages } = make("driver"); p.p = [...vehicle.p];
    room.enterVehicle(p, vehicle.id, "driver"); room.enterVehicle(p, vehicle.id, "driver");
    const other = [...room.vehicles.values()][1]; other.p = [vehicle.p[0] + 100, vehicle.p[1], vehicle.p[2]];
    room.enterVehicle(p, other.id, "driver");
    expect(p.vehicle).toBe(vehicle.id); expect(vehicle.driver).toBe(p.id);
    expect(messages.at(-1)).toMatchObject({ t: "error", code: "too_far" });
    other.p = [...vehicle.p]; other.driver = "someone_else"; room.enterVehicle(p, other.id, "driver");
    expect(vehicle.driver).toBe(p.id); expect(p.vehicle).toBe(vehicle.id);
    expect(messages.at(-1)).toMatchObject({ t: "error", code: "occupied" });
  });
  it("entry aligns occupants immediately; exit sends the authoritative correction", () => {
    const { room, vehicle, make } = setup(); const { p, messages } = make("rider");
    p.p = [vehicle.p[0] - 2, 0, vehicle.p[2]]; room.enterVehicle(p, vehicle.id, "passenger");
    expect(p.p).toEqual(vehicle.p); room.exitVehicle(p);
    expect(p.vehicle).toBeUndefined(); expect(vehicle.passenger).toBeUndefined();
    expect(messages.at(-1)).toEqual({ t: "correct", p: p.p, reason: "vehicle_exit" });
    expect(Math.hypot(p.p[0] - vehicle.p[0], p.p[2] - vehicle.p[2])).toBeGreaterThan(VEHICLE_SPECS[vehicle.kind].size[0] / 2 + 0.35);
  });
  it("rejected vehicle updates do not consume elapsed time needed to recover", () => {
    vi.useFakeTimers(); vi.setSystemTime(10_000);
    const { room, vehicle, make } = setup(); const { p } = make("driver"); p.p = [...vehicle.p]; room.enterVehicle(p, vehicle.id, "driver");
    const start = [...vehicle.p] as [number, number, number];
    room.vehicleState(p, vehicle.id, start, [0, 0, 0, 1], 0);
    vi.setSystemTime(10_500); room.vehicleState(p, vehicle.id, [start[0] + 1000, start[1], start[2]], [0, 0, 0, 1], 10);
    expect(vehicle.lastAt).toBe(10_000);
    vi.setSystemTime(10_550); room.vehicleState(p, vehicle.id, [start[0] + 10, start[1], start[2]], [0, 0, 0, 1], 10);
    expect(vehicle.p[0]).toBe(start[0] + 10);
  });
  it("rejects invalid orientation and non-driver updates without mutating state", () => {
    const { room, vehicle, make } = setup(); const { p, messages } = make("driver"); const intruder = make("intruder"); p.p = [...vehicle.p]; room.enterVehicle(p, vehicle.id, "driver");
    const before = [...vehicle.p] as [number, number, number];
    room.vehicleState(p, vehicle.id, [before[0] + 1, before[1], before[2]], [0, 0, 0, 0], 1);
    expect(vehicle.p).toEqual(before); expect(messages.at(-1)).toMatchObject({ t: "vehicle.update" });
    room.vehicleState(intruder.p, vehicle.id, [before[0] + 1, before[1], before[2]], [0, 0, 0, 1], 1);
    expect(vehicle.p).toEqual(before);
  });
});
