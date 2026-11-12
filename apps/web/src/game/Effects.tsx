"use client";
/** Post-processing: soft bloom (neon signs, headlights, sun), vignette, tone mapping. Skipped on Low quality. */
import { EffectComposer, Bloom, Vignette, SMAA, SSAO, HueSaturation } from "@react-three/postprocessing";
import { useStore } from "../state/store";
export function Effects() {
  const q = useStore(s => s.settings.quality); if (q === "low") return null;
  const detailed=q === "high" || q === "ultra";
  return <EffectComposer key={q} multisampling={0} enableNormalPass={detailed}>{[
    ...(detailed ? [<SSAO key="ao" samples={q === "ultra" ? 16 : 8} radius={.35} intensity={12} luminanceInfluence={.7} />] : []),
    <HueSaturation key="grade" saturation={-.04} />,
    <Bloom key="bloom" intensity={q === "ultra" ? .3 : .2} luminanceThreshold={1} luminanceSmoothing={.2} mipmapBlur />,
    <Vignette key="vignette" eskil={false} offset={.25} darkness={.24} />,
    <SMAA key="aa" />
  ]}</EffectComposer>;
}
