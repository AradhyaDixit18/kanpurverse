"use client";
/** Post-processing driven by the central graphics config: N8AO ambient occlusion (half or full resolution), restrained bloom, grade,
 * vignette and SMAA or 4x MSAA. Disabled entirely when post-processing is off. */
import { EffectComposer, Bloom, Vignette, SMAA, N8AO, HueSaturation, BrightnessContrast } from "@react-three/postprocessing";
import { useGraphics } from "../state/store";
export function Effects() {
  const g = useGraphics(); if (!g.post) return null;
  const ao = g.ao !== "off";
  return <EffectComposer key={`${g.ao}:${g.aa}`} multisampling={g.aa === "msaa" ? 4 : 0}>{[
    ...(ao ? [<N8AO key="ao" aoRadius={1.6} distanceFalloff={0.6} intensity={2.2} quality={g.ao === "full" ? "medium" : "performance"} halfRes={g.ao !== "full"} depthAwareUpsampling />] : []),
    <HueSaturation key="grade" saturation={0.04} />,
    <BrightnessContrast key="bc" contrast={0.06} />,
    <Bloom key="bloom" intensity={0.22} luminanceThreshold={1} luminanceSmoothing={0.2} mipmapBlur />,
    <Vignette key="vignette" eskil={false} offset={0.28} darkness={0.22} />,
    ...(g.aa === "smaa" ? [<SMAA key="aa" />] : []),
  ]}</EffectComposer>;
}
