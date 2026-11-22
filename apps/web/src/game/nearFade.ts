/**
 * Near-camera fade for decoration that has no collider (awnings, sunshades, cornices, window frames). The chase camera only
 * avoids physics colliders, so in a narrow lane it could end up inside a shop awning, which then filled the whole screen.
 * Fragments closer than `radius` metres to the camera are dropped with a short dither, so the view sees past the decoration
 * instead of into it. Costs one distance per fragment; no CPU work.
 */
import type * as THREE from "three";

export function nearFade<T extends THREE.Material>(mat: T, radius = 1.6): T {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    prev?.call(mat, shader, renderer);
    shader.vertexShader = "varying vec3 vNearFadeWorld;\n" + shader.vertexShader.replace("#include <project_vertex>", `#include <project_vertex>
      #ifdef USE_INSTANCING
        vNearFadeWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
      #else
        vNearFadeWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #endif`);
    shader.fragmentShader = "varying vec3 vNearFadeWorld;\n" + shader.fragmentShader.replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
      { float nd = distance(vNearFadeWorld, cameraPosition); float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        if (nd < ${radius.toFixed(2)} * (0.75 + 0.25 * dither)) discard; }`);
  };
  const key = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () => (key ? key() : "") + "|nearFade" + radius;
  return mat;
}
