"use client";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../state/store";
import { renderWorldTime, visualClock } from "./syncedClock";
/** One clock read per frame, shared by every ambient actor and crossing. */
export function WorldClock() { useFrame(() => { const s = useStore.getState(); renderWorldTime.v = s.connected && visualClock.initialized ? visualClock.read(performance.now()) : s.worldTime; }, -200); return null; }
