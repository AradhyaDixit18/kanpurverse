"use client";
import type { ThreeElements } from "@react-three/fiber";
import { roundedGeometry } from "./roundedGeometry";
/** Bounded, shared silhouette mesh; appearance materials remain owned by Avatar. */
export function RoundedPart({ args, radius = .05, smoothness: _smoothness, ...props }: Omit<ThreeElements["mesh"], "args"> & { args: [number, number, number]; radius?: number; smoothness?: number }) {
  void _smoothness;
  return <mesh {...props} geometry={roundedGeometry(args, radius)} dispose={null} />;
}
