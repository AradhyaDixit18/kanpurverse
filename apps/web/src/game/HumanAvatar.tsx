"use client";
/**
 * Rigged human characters (Kanupriya, NPCs, crowd) built from the CC0 Quaternius Universal Base Characters and the
 * Universal Animation Library (see docs/ASSET_LICENCES.md). One 65-joint humanoid skeleton drives body, hair and
 * clothing; clips are cross-faded per gameplay state with playback speed matched to ground speed (no foot sliding).
 *
 * Clothing is generated at load time as skinned "shell" meshes: body triangles selected by their dominant joint are
 * pushed out along the normal and inherit the body's skin weights, so they deform with every animation. Shell geometry
 * is cached per body/outfit and shared across instances; only skeletons and mixers are per character.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { Appearance, AnimState } from "@kanpurverse/shared";
import { SKIN, HAIR_COLORS, TOPS, BOTTOMS, SHOES } from "./avatarPalette";

const BASE = "/models/characters/";
export const CHARACTER_FILES = { female: BASE + "kc_female.glb", male: BASE + "kc_male.glb", hair: BASE + "kc_hair.glb", anims: BASE + "kc_anims.glb" };

/** Ground speed (m/s) of each locomotion clip, measured from the root-motion version of the library. */
export const CLIP_SPEED: Record<string, number> = { Walk_Loop: 0.975, Walk_Formal_Loop: 0.975, Jog_Fwd_Loop: 5.357, Sprint_Loop: 8.25 };

/** Gameplay state → clip. Locomotion picks the clip from actual speed so the feet stay planted. */
export function clipFor(anim: AnimState, speed?: number): { clip: string; timeScale: number; once?: boolean } {
  const loco = (s: number) => s < 2.2 ? { clip: "Walk_Loop", timeScale: s / CLIP_SPEED.Walk_Loop } : s < 6.8 ? { clip: "Jog_Fwd_Loop", timeScale: s / CLIP_SPEED.Jog_Fwd_Loop } : { clip: "Sprint_Loop", timeScale: s / CLIP_SPEED.Sprint_Loop };
  switch (anim) {
    case "walk": return loco(speed ?? 1.25);
    case "run": return loco(speed ?? 5.5);
    case "sprint": return loco(speed ?? 8.5);
    case "jump": return { clip: "Jump_Loop", timeScale: 1 };
    case "fall": return { clip: "Jump_Loop", timeScale: 0.8 };
    case "sit": return { clip: "Sitting_Idle_Loop", timeScale: 1 };
    case "drive": return { clip: "Driving_Loop", timeScale: 1 };
    case "dance": case "celebrate": return { clip: "Dance_Loop", timeScale: 1 };
    case "talk": case "laugh": case "spit": return { clip: "Idle_Talking_Loop", timeScale: 1 };
    case "wave": case "highfive": return { clip: "Interact", timeScale: 1 };
    case "punch": return { clip: "Punch_Jab", timeScale: 1 };
    case "packet": case "openpacket": case "consume": return { clip: "PickUp_Table", timeScale: 1 };
    default: return { clip: "Idle_Loop", timeScale: 1 };
  }
}
// clamp to keep extremely slow/fast walkers believable
const clampScale = (s: number) => Math.min(1.6, Math.max(0.55, s));

// ───────────── outfits ─────────────
type Region = "top" | "sleeveShort" | "sleeveLong" | "tunic" | "pants" | "shorts" | "shoes";
interface Outfit { top: Region[]; pants: Region[]; tunic: boolean; long: boolean }
/** Appearance.top index → garment cut. 5 = kurta/kurti (long tunic), 7 = jacket (long sleeves). */
function outfitFor(a: Appearance): Outfit { const tunic = a.top === 5 || (a.body === "f" && a.top !== 6); return { top: [], pants: [], tunic, long: a.top === 7 || a.top === 5 }; }

const TORSO = ["pelvis", "spine_01", "spine_02", "spine_03", "clavicle_l", "clavicle_r"];
const UPPER = ["upperarm_l", "upperarm_r"], LOWER = ["lowerarm_l", "lowerarm_r"], THIGH = ["thigh_l", "thigh_r"], CALF = ["calf_l", "calf_r"], FEET = ["foot_l", "foot_r", "ball_l", "ball_r", "ball_leaf_l", "ball_leaf_r"];
const shellCache = new Map<string, THREE.BufferGeometry>();

/** Triangles of `src` whose three vertices are dominated by `bones`, pushed out by `offset` metres (skin data kept). */
function shell(key: string, src: THREE.BufferGeometry, bones: THREE.Bone[], names: string[], offset: number, keep?: (vertex: number, pos: THREE.Vector3) => boolean) {
  const hit = shellCache.get(key); if (hit) return hit;
  const idx = new Set(names.map(n => bones.findIndex(b => b.name === n)).filter(i => i >= 0));
  const si = src.getAttribute("skinIndex"), sw = src.getAttribute("skinWeight"), pos = src.getAttribute("position"), nor = src.getAttribute("normal");
  const vOk = new Uint8Array(pos.count); const p = new THREE.Vector3();
  for (let v = 0; v < pos.count; v++) { let best = -1, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > bw) { bw = w; best = si.getComponent(v, k); } } p.fromBufferAttribute(pos, v); vOk[v] = idx.has(best) && (!keep || keep(v, p)) ? 1 : 0; }
  const g = src.clone(); const out = g.getAttribute("position") as THREE.BufferAttribute; const n = new THREE.Vector3();
  for (let v = 0; v < out.count; v++) { n.fromBufferAttribute(nor, v); out.setXYZ(v, out.getX(v) + n.x * offset, out.getY(v) + n.y * offset, out.getZ(v) + n.z * offset); }
  const index = src.getIndex()!; const tris: number[] = [];
  for (let i = 0; i < index.count; i += 3) { const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2); if (vOk[a] && vOk[b] && vOk[c]) tris.push(a, b, c); }
  g.setIndex(tris); for (const name of Object.keys(g.attributes)) if (/^(uv1|uv2|uv3|color|color_1|color_2)$/.test(name)) g.deleteAttribute(name);
  g.computeBoundingSphere(); shellCache.set(key, g); return g;
}

// ───────────── materials (cached by colour) ─────────────
const matCache = new Map<string, THREE.Material>();
let fabricN: THREE.Texture | null = null;
function fabricNormal() {
  if (fabricN || typeof document === "undefined") return fabricN; const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d")!;
  x.fillStyle = "rgb(128,128,255)"; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 2) { x.fillStyle = `rgba(${i % 4 ? 150 : 106},128,255,0.5)`; x.fillRect(i, 0, 1, 128); x.fillStyle = `rgba(128,${i % 4 ? 150 : 106},255,0.5)`; x.fillRect(0, i, 128, 1); }
  fabricN = new THREE.CanvasTexture(c); fabricN.wrapS = fabricN.wrapT = THREE.RepeatWrapping; fabricN.repeat.set(24, 24); return fabricN;
}
function cloth(color: number, kind: "cotton" | "denim" | "leather" | "rubber") {
  const k = `${kind}:${color}`; let m = matCache.get(k) as THREE.MeshStandardMaterial | undefined;
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: kind === "leather" ? 0.45 : kind === "rubber" ? 0.6 : kind === "denim" ? 0.88 : 0.82, normalMap: kind === "rubber" ? null : fabricNormal(), normalScale: new THREE.Vector2(0.35, 0.35), side: THREE.FrontSide }); matCache.set(k, m); }
  return m;
}
/** Skin: the source texture is a medium-brown tone; palette entries scale it lighter or darker. */
const SKIN_SCALE = [1.32, 1.18, 1.0, 0.86, 0.72, 0.55];

interface Assets { female: GLTF; male: GLTF; hair: GLTF; anims: GLTF }
const HAIR_NAMES = ["Hair_Buzzed", "Hair_SimpleParted", "Hair_Long", "Hair_Buns", "Hair_Long", "Hair_SimpleParted"];

export interface HumanProps { appearance: Appearance; anim: AnimState; speed?: number; protagonist?: boolean }
export function HumanAvatar({ appearance, anim, speed, protagonist }: HumanProps) {
  const [female, male, hair, anims] = useLoader(GLTFLoader, [CHARACTER_FILES.female, CHARACTER_FILES.male, CHARACTER_FILES.hair, CHARACTER_FILES.anims]) as GLTF[];
  const assets: Assets = { female, male, hair, anims };
  const key = JSON.stringify(appearance) + (protagonist ? ":p" : "");
  const built = useMemo(() => buildCharacter(assets, appearance, !!protagonist), // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, female, male, hair]);
  const mixer = useMemo(() => new THREE.AnimationMixer(built.root), [built]);
  const current = useRef<{ name: string; action: THREE.AnimationAction } | null>(null);
  const head = useMemo(() => built.root.getObjectByName("Head") as THREE.Bone | undefined, [built]);
  const lookT = useRef(Math.random() * 10);
  useEffect(() => () => { mixer.stopAllAction(); mixer.uncacheRoot(built.root); }, [mixer, built]);

  useFrame((_, dt) => {
    const want = clipFor(anim, speed);
    if (current.current?.name !== want.clip) {
      const clip = anims.animations.find(c => c.name === want.clip) ?? anims.animations.find(c => c.name === "Idle_Loop");
      if (clip) { const next = mixer.clipAction(clip); next.reset().setEffectiveWeight(1).fadeIn(0.22).play(); current.current?.action.fadeOut(0.22); current.current = { name: want.clip, action: next }; }
    }
    if (current.current) current.current.action.timeScale = CLIP_SPEED[want.clip] ? clampScale(want.timeScale) : want.timeScale;
    mixer.update(Math.min(dt, 0.1));
    // subtle idle look-around layered on top of the clip
    if (head && (anim === "idle" || anim === "talk")) { lookT.current += dt; head.rotation.y += Math.sin(lookT.current * 0.45) * 0.25; head.rotation.x += Math.sin(lookT.current * 0.31) * 0.05; }
  });
  return <primitive object={built.root} />;
}

function buildCharacter(a: Assets, app: Appearance, protagonist: boolean) {
  const src = app.body === "f" ? a.female : a.male;
  const root = cloneSkinned(src.scene) as THREE.Group;
  let body: THREE.SkinnedMesh | null = null;
  root.traverse(o => { const m = o as THREE.SkinnedMesh; if (m.isSkinnedMesh) { m.castShadow = true; m.frustumCulled = false; if (!body || m.geometry.getAttribute("position").count > body.geometry.getAttribute("position").count) body = m; } });
  if (!body) return { root };
  const b = body as THREE.SkinnedMesh; const bones = b.skeleton.bones;
  // skin tone
  const skinMat = (b.material as THREE.MeshStandardMaterial).clone(); skinMat.color.setScalar(SKIN_SCALE[app.skin] ?? 1); skinMat.roughness = 0.62; b.material = skinMat;
  // hair: bind the shared hair mesh to this character's skeleton
  const hairName = protagonist ? "Hair_Long" : HAIR_NAMES[app.hair] ?? "Hair_SimpleParted";
  const hairNames = app.body === "m" && app.hair === 3 ? [hairName, "Hair_Beard"] : [hairName];
  for (const hn of hairNames) {
    let hm: THREE.SkinnedMesh | undefined; for (const sc of a.hair.scenes) sc.traverse(o => { if ((o as THREE.SkinnedMesh).isSkinnedMesh && o.name === hn) hm = o as THREE.SkinnedMesh; });
    if (hm) { const mat = (hm.material as THREE.MeshStandardMaterial).clone(); mat.color.setHex(HAIR_COLORS[app.hairColor] ?? 0x1a1a1a).multiplyScalar(2.2); mat.roughness = 0.55;
      const mesh = new THREE.SkinnedMesh(hm.geometry, mat); mesh.castShadow = true; mesh.frustumCulled = false; b.parent!.add(mesh);
      mesh.bind(new THREE.Skeleton(bones, hm.skeleton.boneInverses), b.bindMatrix); }
  }
  // clothing shells
  const kind = app.body; const o = outfitFor(app); const g = b.geometry;
  const thighL = bones.find(x => x.name === "thigh_l"), calfL = bones.find(x => x.name === "calf_l");
  const kneeY = calfL && thighL ? new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(b.skeleton.boneInverses[bones.indexOf(calfL)]).invert()).y : 0.5;
  const hipY = thighL ? new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(b.skeleton.boneInverses[bones.indexOf(thighL)]).invert()).y : 0.9;
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => { const m = new THREE.SkinnedMesh(geo, mat); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; b.parent!.add(m); m.bind(b.skeleton, b.bindMatrix); };
  const topCol = protagonist ? 0x1f6f78 : TOPS[app.top] ?? 0xc8102e, botCol = protagonist ? 0x2b4f7e : BOTTOMS[app.bottom] ?? 0x1c1d22, shoeCol = protagonist ? 0xf2f0ea : SHOES[app.shoes] ?? 0x111111;
  const denim = !protagonist ? (app.bottom === 1 || app.bottom === 0 ? "denim" : "cotton") : "denim";
  add(shell(`${kind}:pants`, g, bones, ["pelvis", ...THIGH, ...CALF], 0.006, (_, p) => p.y < hipY + 0.12), cloth(botCol, denim));
  add(shell(`${kind}:shoes`, g, bones, [...FEET, ...CALF], 0.012, (_, p) => p.y < Math.max(0.13, kneeY * 0.25)), cloth(shoeCol, "rubber"));
  const sleeves = o.long ? [...UPPER, ...LOWER] : protagonist ? [...UPPER, ...LOWER] : UPPER;
  const sleeveKeep = (_: number, p: THREE.Vector3) => o.long || protagonist ? true : Math.abs(p.x) < 0.42;
  add(shell(`${kind}:top:${o.long || protagonist ? "l" : "s"}`, g, bones, [...TORSO, ...sleeves], 0.012, (v, p) => (Math.abs(p.x) < 0.2 || sleeveKeep(v, p)) && p.y > hipY - 0.06 && !(protagonist && Math.abs(p.x) > 0.5)), cloth(topCol, app.top === 7 && !protagonist ? "leather" : "cotton"));
  if (o.tunic || protagonist) add(shell(`${kind}:tunic`, g, bones, ["pelvis", "spine_01", ...THIGH], 0.022, (_, p) => p.y > (hipY + kneeY) / 2 + 0.02), cloth(topCol, "cotton"));
  // accessories on bones
  const headBone = bones.find(x => x.name === "Head"), spine = bones.find(x => x.name === "spine_03"), pelvis = bones.find(x => x.name === "pelvis");
  if (protagonist && spine && pelvis) {
    // video journalist kit: cross-body strap and a compact camera bag
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.09), cloth(0x3b2a1e, "leather")); bag.position.set(0.17, -0.02, 0.06); pelvis.add(bag);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16), cloth(0x111111, "rubber")); lens.rotation.x = Math.PI / 2; lens.position.set(0.17, -0.02, 0.115); pelvis.add(lens);
  } else if (headBone && app.accessory === 1) {
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.035, 0.02), cloth(0x0b0b0b, "leather")); shades.position.set(0, 0.08, 0.1); headBone.add(shades);
  } else if (headBone && app.accessory === 2) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), cloth(0xc8102e, "cotton")); cap.position.set(0, 0.14, 0); headBone.add(cap);
  } else if (app.accessory === 3) {
    const neck = bones.find(x => x.name === "neck_01"); if (neck) { const gamcha = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.025, 6, 16), cloth(0xe8b04b, "cotton")); gamcha.rotation.x = Math.PI / 2; neck.add(gamcha); }
  }
  return { root };
}

/** Preload once the world is up, so the first character swap does not stall. */
export function preloadCharacters() { useLoader.preload(GLTFLoader, [CHARACTER_FILES.female, CHARACTER_FILES.male, CHARACTER_FILES.hair, CHARACTER_FILES.anims]); }
