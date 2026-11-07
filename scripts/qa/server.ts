/** Run with npx tsx scripts/qa/server.ts. Isolated file data, loopback only, no production credentials. */
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { VEHICLE_QA_ROOM, VEHICLE_QA_POSITION, VEHICLE_QA_WALL as w } from "../../packages/shared/src/vehicleQaFixture";
import { createExitBlocker } from "../../apps/server/src/worldSafety";
process.env.KV_NO_AUTOSTART = "1";
process.env.SESSION_SECRET = randomBytes(32).toString("hex");
process.env.DATA_DIR = resolve("work/phase2/qa-data");
process.env.HOST = "127.0.0.1";
process.env.ALLOWED_ORIGINS = "http://localhost:3002,http://127.0.0.1:3002";
if (process.env.MONGODB_URI) throw new Error("QA server must not have MongoDB credentials");
async function main() {
const { startServer } = await import("../../apps/server/src/index");
const blocked = createExitBlocker([[[w.x - w.halfWidth, w.z - w.halfLength], [w.x + w.halfWidth, w.z - w.halfLength], [w.x + w.halfWidth, w.z + w.halfLength], [w.x - w.halfWidth, w.z + w.halfLength]]]);
const server = await startServer({ port: 8790, exitBlocked: blocked, setupRoom: room => {
  if (room.name !== VEHICLE_QA_ROOM) return;
  const car = [...room.vehicles.values()].find(v => v.kind === "hatchback")!;
  for (const id of room.vehicles.keys()) if (id !== car.id) room.vehicles.delete(id);
  car.p = [...VEHICLE_QA_POSITION]; car.q = [0, 0, 0, 1]; car.v = 0;
} });
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, async () => { await server.close(); process.exit(0); });

}
main().catch(e => { console.error(e); process.exit(1); });
