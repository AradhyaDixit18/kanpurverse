"use client";
/** Post-processing: soft bloom (neon signs, headlights, sun), vignette, tone mapping. Skipped on Low quality. */
import { EffectComposer, Bloom, Vignette, SMAA } from "@react-three/postprocessing";
import { useStore } from "../state/store";
export function Effects() {
  const q = useStore(s => s.settings.quality); if (q === "low") return null;
  return <EffectComposer multisampling={0}>
    <Bloom intensity={q === "high" ? 0.55 : 0.4} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
    <Vignette eskil={false} offset={0.25} darkness={0.55} />
    <SMAA />
  </EffectComposer>;
}
