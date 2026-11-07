"use client";
import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { SPAWN_POINT } from "@kanpurverse/shared";
import { playerPos } from "./refs";
import { GROUND_TILE_SIZE, groundTileKey, groundTileCenters } from "./groundTiles";
export function GroundCollider() {
  const [tile, setTile] = useState(() => groundTileKey(SPAWN_POINT[0], SPAWN_POINT[2]));
  useFrame(() => { const next = groundTileKey(playerPos.x, playerPos.z); if (next[0] !== tile[0] || next[1] !== tile[1]) setTile(next); });
  return <>{groundTileCenters(...tile).map(([x, z]) => <RigidBody key={`${x},${z}`} type="fixed" colliders={false} position={[x, -1, z]}><CuboidCollider args={[GROUND_TILE_SIZE / 2, 1, GROUND_TILE_SIZE / 2]} /></RigidBody>)}</>;
}
