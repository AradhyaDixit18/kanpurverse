"use client";
/** Lightweight shared runtime refs (no three.js import) so UI code can read game state without pulling the 3D bundle. */
export const playerPos = { x: -10, y: 1, z: 14, set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } };
export const playerYaw = { v: 0 };
export const vehicleTelemetry = { speed: 0, kind: "" as string };
export const npcPositions = new Map<string, { x: number; z: number }>();

/** Predicted transforms and collider handles, independent of delayed network snapshots. */
export const vehicleRuntime = new Map<string, { x: number; y: number; z: number; handle: number }>();
