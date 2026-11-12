/**
 * Central graphics configuration. Every renderer feature reads its value from `resolveGraphics`, so presets
 * (Low/Medium/High/Ultra) and the individual advanced overrides change the same knobs. Nothing here is decorative:
 * each field is consumed by Game.tsx, Sky.tsx, Effects.tsx, Traffic.tsx, NPCs.tsx or Dust.tsx.
 */
export type Quality = "low" | "medium" | "high" | "ultra";
export type ShadowQuality = "off" | "low" | "medium" | "high" | "ultra";
export type AAMode = "off" | "smaa" | "msaa";
export type AOMode = "off" | "half" | "full";
export type Level = "low" | "medium" | "high";

export interface GraphicsOverrides {
  shadows?: ShadowQuality;
  aa?: AAMode;
  ao?: AOMode;
  /** Fog / far-plane distance in metres. */
  viewDistance?: number;
  /** Bloom, grading and vignette. */
  post?: boolean;
  /** Particles, crowd and traffic density. */
  effects?: Level;
  /** Render resolution multiplier on top of device pixel ratio (0.5 – 1.0). */
  resScale?: number;
  /** Drop resolution automatically when frame time is too high. */
  adaptive?: boolean;
  /** Image-based lighting (HDR sky reflections). */
  ibl?: boolean;
}

export interface ResolvedGraphics {
  shadows: ShadowQuality; shadowMap: number; shadowExtent: number; softShadows: boolean;
  aa: AAMode; ao: AOMode; post: boolean; ibl: boolean;
  viewDistance: number; fogNear: number; cameraFar: number;
  effects: Level; traffic: number; crowd: number; dustScale: number;
  dpr: [number, number]; resScale: number; adaptive: boolean;
}

/** AO is opt-in: measured on an Apple M2 (13 Nov 2026) N8AO cost High 59→44 FPS and Ultra 60→25 FPS. */
export const PRESETS: Record<Quality, Required<GraphicsOverrides>> = {
  low:    { shadows: "off",    aa: "off",  ao: "off",  viewDistance: 240, post: false, effects: "low",    resScale: 0.8, adaptive: true,  ibl: false },
  medium: { shadows: "medium", aa: "smaa", ao: "off",  viewDistance: 480, post: true,  effects: "medium", resScale: 1,   adaptive: true,  ibl: true },
  high:   { shadows: "high",   aa: "smaa", ao: "off",  viewDistance: 600, post: true,  effects: "high",   resScale: 1,   adaptive: true,  ibl: true },
  ultra:  { shadows: "ultra",  aa: "msaa", ao: "off",  viewDistance: 760, post: true,  effects: "high",   resScale: 1,   adaptive: false, ibl: true },
};
const SHADOW_MAP: Record<ShadowQuality, number> = { off: 0, low: 1024, medium: 2048, high: 2048, ultra: 4096 };
const SHADOW_EXTENT: Record<ShadowQuality, number> = { off: 0, low: 30, medium: 42, high: 55, ultra: 70 };
/** Device-pixel-ratio ceiling per preset; the measured Ultra bottleneck was a 1.75 DPR SSAO pass. */
const DPR_CAP: Record<Quality, number> = { low: 1, medium: 1.25, high: 1.5, ultra: 1.5 };

export function resolveGraphics(quality: Quality, overrides: GraphicsOverrides = {}): ResolvedGraphics {
  const o = { ...PRESETS[quality], ...stripUndefined(overrides) };
  const viewDistance = Math.min(1000, Math.max(160, o.viewDistance));
  const resScale = Math.min(1, Math.max(0.5, o.resScale));
  const cap = DPR_CAP[quality] * resScale;
  return {
    shadows: o.shadows, shadowMap: SHADOW_MAP[o.shadows], shadowExtent: SHADOW_EXTENT[o.shadows], softShadows: o.shadows !== "low",
    aa: o.aa, ao: o.post ? o.ao : "off", post: o.post, ibl: o.ibl,
    viewDistance, fogNear: Math.round(viewDistance * 0.3), cameraFar: Math.round(viewDistance * 1.9),
    effects: o.effects, traffic: o.effects === "low" ? 12 : o.effects === "medium" ? 24 : 36, crowd: o.effects === "low" ? 8 : o.effects === "medium" ? 18 : 28,
    dustScale: o.effects === "low" ? 0 : o.effects === "medium" ? 0.6 : 1,
    dpr: [Math.min(0.75 * resScale, cap), cap], resScale, adaptive: o.adaptive,
  };
}
function stripUndefined<T extends object>(o: T): Partial<T> { const out: Partial<T> = {}; for (const k in o) if (o[k] !== undefined) out[k] = o[k]; return out; }

/**
 * Distance beyond which a whole vehicle is not drawn (or shadowed). Final QA: parked and traffic vehicles 100–600 m away
 * were ~350 of ~1,280 draw calls per frame on High, each 6–8 px wide. Tied to the view distance setting.
 */
export function vehicleCullDistance(viewDistance: number) { return Math.min(320, Math.max(120, viewDistance * 0.4)); }
