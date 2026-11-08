"use client";
/** Development-only diagnostics. Reads full renderer passes, never changes simulation. */
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useStore } from "../../state/store";
import { playerPos } from "../refs";
import { summarizeFrames, type FrameSample } from "./frameStats";
export function saveBlob(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
export function FrameProbe() {
  const { gl, scene, camera } = useThree();
  const run = useRef<{ start: number; last: number; samples: FrameSample[] } | null>(null);
  useEffect(() => {
    const old = gl.info.autoReset; gl.info.autoReset = false;
    const start = () => { run.current = { start: performance.now(), last: performance.now(), samples: [] }; window.dispatchEvent(new CustomEvent("kv:profile-status", { detail: "Recording 20 seconds; keep this tab visible." })); };
    const capture = () => { gl.render(scene, camera); gl.domElement.toBlob(b => { if (b) saveBlob(b, `kanpurverse-world-${Date.now()}.png`); }); };
    window.addEventListener("kv:profile", start); window.addEventListener("kv:world-capture", capture);
    return () => { gl.info.autoReset = old; window.removeEventListener("kv:profile", start); window.removeEventListener("kv:world-capture", capture); };
  }, [gl, scene, camera]);
  useFrame(() => {
    const r = run.current; const now = performance.now();
    if (r) {
      if (document.visibilityState === "hidden") { run.current = null; window.dispatchEvent(new CustomEvent("kv:profile-status", { detail: "Cancelled: tab hidden. Repeat in foreground." })); }
      else {
        if (now > r.last) r.samples.push({ ms: now - r.last, calls: gl.info.render.calls, triangles: gl.info.render.triangles });
        r.last = now;
        if (now - r.start >= 20000) {
          const result = { ...summarizeFrames(r.samples), quality: useStore.getState().settings.quality, position: [playerPos.x,playerPos.y,playerPos.z], page: location.pathname, viewport: [gl.domElement.clientWidth, gl.domElement.clientHeight], buffer: [gl.domElement.width, gl.domElement.height], dpr: gl.getPixelRatio(), geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, userAgent: navigator.userAgent, capturedAt: new Date().toISOString(), context: "foreground, all render passes, includes stalls; local development build" };
          run.current = null;
          window.dispatchEvent(new CustomEvent("kv:profile-status", { detail: JSON.stringify(result) }));
          saveBlob(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }), `kanpurverse-profile-${Date.now()}.json`);
        }
      }
    }
    gl.info.reset();
  }, -100);
  return null;
}
