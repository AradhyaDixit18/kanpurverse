"use client";
/** Day/night: gradient sky dome (shader), sun/moon discs, drifting clouds, fog + lights keyed to the local world clock. */
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { renderWorldTime } from "./syncedClock";
import * as THREE from "three";
import { useGraphics } from "../state/store";
import { playerPos } from "./Player";

const K = {
  night: { top: "#060a1c", horizon: "#1a2240", fog: "#141a30", sun: "#8fa3ff", amb: 0.18 },
  dawn: { top: "#3b4f8a", horizon: "#f3a06b", fog: "#d9a07c", sun: "#ffb27a", amb: 0.25 },
  day: { top: "#347fc0", horizon: "#c2d9e0", fog: "#b6c8ca", sun: "#fff4dc", amb: 0.28 },
  dusk: { top: "#2d3566", horizon: "#f07a3a", fog: "#d98a63", sun: "#ff9a4a", amb: 0.22 },
};
function phase(t: number) { // returns weights for night/dawn/day/dusk from world time 0..1
  const h = t * 24; const w = { night: 0, dawn: 0, day: 0, dusk: 0 };
  const tri = (c: number, r: number) => Math.max(0, 1 - Math.abs(((h - c + 36) % 24) - 12) / r);
  w.dawn = tri(6.3, 1.6); w.dusk = tri(18.2, 1.6); w.day = THREE.MathUtils.smoothstep(h, 5.5, 8) * (1 - THREE.MathUtils.smoothstep(h, 17, 19.5)); w.night = Math.max(0, 1 - w.dawn - w.dusk - w.day);
  const s = w.night + w.dawn + w.day + w.dusk; return { night: w.night / s, dawn: w.dawn / s, day: w.day / s, dusk: w.dusk / s };
}
const mix = (key: "top" | "horizon" | "fog" | "sun", w: ReturnType<typeof phase>, out: THREE.Color) => { out.set(0, 0, 0); for (const k of ["night", "dawn", "day", "dusk"] as const) out.add(new THREE.Color(K[k][key]).multiplyScalar(w[k])); return out; };

const skyVert = `varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const skyFrag = `uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor; uniform float sunGlow; uniform float stars; varying vec3 vWorld;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void main(){ vec3 d = normalize(vWorld - cameraPosition); float h = clamp(d.y, 0.0, 1.0); vec3 col = mix(horizon, top, pow(h, 0.55));
  float s = max(dot(d, sunDir), 0.0); col += sunColor * (pow(s, 240.0) * 1.2 + pow(s, 12.0) * 0.25 * sunGlow);
  if (stars > 0.0 && d.y > 0.02) { vec2 g = floor(d.xz / max(d.y, 0.05) * 60.0); float r = hash(g); float tw = step(0.985, r) * (0.5 + 0.5 * sin(r * 100.0)); col += vec3(tw) * stars * d.y; }
  gl_FragColor = vec4(col, 1.0); }`;

export function Sky() {
  const sun = useRef<THREE.DirectionalLight>(null); const amb = useRef<THREE.AmbientLight>(null); const hemi = useRef<THREE.HemisphereLight>(null); const { scene } = useThree();
  const target = useRef(new THREE.Object3D()); const g = useGraphics(); const dome = useRef<THREE.Mesh>(null); const sunMesh = useRef<THREE.Mesh>(null); const moon = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({ top: { value: new THREE.Color(K.day.top) }, horizon: { value: new THREE.Color(K.day.horizon) }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunColor: { value: new THREE.Color(K.day.sun) }, sunGlow: { value: 1 }, stars: { value: 0 } }), []);
  const tmp = useMemo(() => ({ a: new THREE.Color(), b: new THREE.Color(), c: new THREE.Color() }), []);


  useFrame(() => {
    const t = renderWorldTime.v; const a = t * Math.PI * 2 - Math.PI / 2; const elev = Math.sin(a); const w = phase(t);
    const dir = new THREE.Vector3(Math.cos(a) * 0.8, Math.max(-0.3, elev), 0.5).normalize();
    uniforms.sunDir.value.copy(dir); mix("top", w, uniforms.top.value); mix("horizon", w, uniforms.horizon.value); mix("sun", w, uniforms.sunColor.value); uniforms.sunGlow.value = w.dawn + w.dusk + 0.4 * w.day; uniforms.stars.value = w.night * 0.9;
    const fogC = mix("fog", w, tmp.c); (scene.fog as THREE.Fog | null)?.color.copy(fogC);
    const dayLight = THREE.MathUtils.clamp(elev * 1.6 + 0.25, 0, 1);
    if (sun.current) { const c = snapToShadowTexels(playerPos, dir, (2 * g.shadowExtent) / Math.max(512, g.shadowMap)); sun.current.position.set(c.x + dir.x * 140, c.y + Math.max(6, dir.y * 160), c.z + dir.z * 140); sun.current.intensity = 0.16 + dayLight * 3.0; sun.current.color.copy(uniforms.sunColor.value); target.current.position.copy(c); sun.current.target = target.current; }
    if (amb.current) amb.current.intensity = K.night.amb * w.night + K.dawn.amb * w.dawn + K.day.amb * w.day + K.dusk.amb * w.dusk;
    if (hemi.current) { hemi.current.intensity = 0.24 + dayLight * 0.35; hemi.current.color.copy(uniforms.top.value); }
    if (dome.current) dome.current.position.copy(playerPos);
    if (sunMesh.current) { sunMesh.current.position.set(playerPos.x + dir.x * 600, dir.y * 600, playerPos.z + dir.z * 600); sunMesh.current.visible = dir.y > -0.05; }
    if (moon.current) { moon.current.position.set(playerPos.x - dir.x * 600, -dir.y * 600 + 80, playerPos.z - dir.z * 600); moon.current.visible = w.night > 0.2; }
  });
  return <>
    <fog attach="fog" args={["#b6c8ca", g.fogNear, g.viewDistance]} />
    <mesh ref={dome} frustumCulled={false}><sphereGeometry args={[800, 32, 16]} /><shaderMaterial uniforms={uniforms} vertexShader={skyVert} fragmentShader={skyFrag} side={THREE.BackSide} depthWrite={false} fog={false} /></mesh>
    <mesh ref={sunMesh}><sphereGeometry args={[18, 16, 16]} /><meshBasicMaterial color="#fff2cc" fog={false} /></mesh>
    <mesh ref={moon}><sphereGeometry args={[12, 16, 16]} /><meshBasicMaterial color="#e9eefc" fog={false} /></mesh>
    {/* Haze replaces faceted cloud blobs. */}
    <ambientLight ref={amb} intensity={0.5} />
    <hemisphereLight ref={hemi} args={["#bcd8ff", "#7a6a4a", 0.6]} />
    <directionalLight ref={sun} key={`sun:${g.shadowMap}:${g.shadowExtent}`} castShadow={g.shadows !== "off"} intensity={2} shadow-mapSize={[Math.max(512, g.shadowMap), Math.max(512, g.shadowMap)]} shadow-camera-left={-g.shadowExtent} shadow-camera-right={g.shadowExtent} shadow-camera-top={g.shadowExtent} shadow-camera-bottom={-g.shadowExtent} shadow-radius={3} shadow-camera-far={450} shadow-bias={-0.0004} shadow-normalBias={0.02} />
    <primitive object={target.current} />
  </>;
}


/**
 * Stable shadows: move the shadow camera only in whole shadow-map texels, measured in the light's own view plane.
 * A continuously following light makes shadow edges swim and shimmer as the player moves.
 */
const _u = new THREE.Vector3(), _v = new THREE.Vector3(), _out = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
export function snapToShadowTexels(p: { x: number; y: number; z: number }, lightDir: THREE.Vector3, texel: number) {
  if (!(texel > 0)) return _out.set(p.x, p.y, p.z);
  _u.crossVectors(UP, lightDir); if (_u.lengthSq() < 1e-6) _u.set(1, 0, 0); _u.normalize(); _v.crossVectors(lightDir, _u).normalize();
  const P = _out.set(p.x, p.y, p.z); const a = Math.round(P.dot(_u) / texel) * texel, b = Math.round(P.dot(_v) / texel) * texel, d = P.dot(lightDir);
  return _out.set(0, 0, 0).addScaledVector(_u, a).addScaledVector(_v, b).addScaledVector(lightDir, d);
}
