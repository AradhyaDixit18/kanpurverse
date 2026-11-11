"use client";
import { SPAWN_POINT } from "@kanpurverse/shared";
/** Lightweight shared runtime refs (no three.js import) so UI code can read game state without pulling the 3D bundle. */
export const playerPos = { x: SPAWN_POINT[0], y: SPAWN_POINT[1], z: SPAWN_POINT[2], set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } };
export const playerYaw = { v: 0 };
export const vehicleTelemetry = { speed: 0, kind: "" as string };
export const npcPositions = new Map<string, { x: number; z: number }>();

/** Predicted transforms and collider handles, independent of delayed network snapshots. */
export const vehicleRuntime = new Map<string, { x: number; y: number; z: number; handle: number }>();

export const playerPhysicsTelemetry = { bodyY: 0, colliderY: 0, halfHeight: 0, radius: 0, grounded: false };
