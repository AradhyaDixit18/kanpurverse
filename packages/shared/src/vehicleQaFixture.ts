/** Explicit local integration fixture; never used by production room creation. */
import { SPAWN_POINT } from "./world";
export const VEHICLE_QA_ROOM = "qa-vehicle-safety";
export const VEHICLE_QA_POSITION: [number, number, number] = [SPAWN_POINT[0] + 4, 0.775, SPAWN_POINT[2]];
export const VEHICLE_QA_WALL = { x: VEHICLE_QA_POSITION[0] + 0.875 + 0.12, z: VEHICLE_QA_POSITION[2], halfWidth: 0.06, halfLength: 4 };
