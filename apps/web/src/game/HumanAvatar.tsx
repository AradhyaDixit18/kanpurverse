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
import { item, type Appearance, type AnimState, type Outfit } from "@kanpurverse/shared";
import { HAIR_COLORS, TOPS, BOTTOMS, SHOES } from "./avatarPalette";
import type { PersonKit } from "./peopleKit";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

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
    case "punch": return { clip: "Punch_Cross", timeScale: 1.3 };
    case "swing": return { clip: "Sword_Attack", timeScale: 1.4 };
    case "shoot": return { clip: "Pistol_Shoot", timeScale: 1.2 };
    case "aim": return { clip: "Pistol_Idle_Loop", timeScale: 1 };
    case "hit": return { clip: "Hit_Chest", timeScale: 1.2 };
    case "knockdown": return { clip: "Death01", timeScale: 1, once: true };
    case "stunned": return { clip: "Hit_Head", timeScale: 0.5 };
    case "packet": case "openpacket": case "consume": return { clip: "PickUp_Table", timeScale: 1 };
    default: return { clip: "Idle_Loop", timeScale: 1 };
  }
}
// clamp to keep extremely slow/fast walkers believable
const clampScale = (s: number) => Math.min(1.6, Math.max(0.55, s));

// ───────────── outfits ─────────────
type Region = "top" | "sleeveShort" | "sleeveLong" | "tunic" | "pants" | "shorts" | "shoes";
interface NpcOutfit { top: Region[]; pants: Region[]; tunic: boolean; long: boolean }
/** Appearance.top index → garment cut. 5 = kurta/kurti (long tunic), 7 = jacket (long sleeves). */
function outfitFor(a: Appearance): NpcOutfit { const tunic = a.top === 5 || (a.body === "f" && a.top !== 6); return { top: [], pants: [], tunic, long: a.top === 7 || a.top === 5 }; }

const TORSO = ["pelvis", "spine_01", "spine_02", "spine_03", "clavicle_l", "clavicle_r"];
const UPPER = ["upperarm_l", "upperarm_r"], LOWER = ["lowerarm_l", "lowerarm_r"], THIGH = ["thigh_l", "thigh_r"], CALF = ["calf_l", "calf_r"], FEET = ["foot_l", "foot_r", "ball_l", "ball_r", "ball_leaf_l", "ball_leaf_r"];
const shellCache = new Map<string, THREE.BufferGeometry>();

/**
 * Cloth does not cling. For the welded vertices of a shell, how far (m, along the normal) the surface must rise to
 * bridge the hollows between muscles: a smoothed copy of the body is compared with the body itself and only the part
 * that lies outside is kept, so cloth fills grooves and never cuts into the figure. Pure geometry, cached with the shell.
 */
export function drapeFill(pos: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, nor: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, tris: number[], rounds: number, maxFill: number) {
  const n = pos.count; const weld = new Int32Array(n); const seen = new Map<string, number>();
  for (let v = 0; v < n; v++) { const k = `${Math.round(pos.getX(v) * 2e4)}:${Math.round(pos.getY(v) * 2e4)}:${Math.round(pos.getZ(v) * 2e4)}`; const hit = seen.get(k); if (hit === undefined) { seen.set(k, v); weld[v] = v; } else weld[v] = hit; }
  const nb = new Map<number, Set<number>>(); const link = (a: number, b: number) => { if (a === b) return; let s = nb.get(a); if (!s) nb.set(a, s = new Set()); s.add(b); };
  for (let i = 0; i < tris.length; i += 3) { const a = weld[tris[i]], b = weld[tris[i + 1]], c = weld[tris[i + 2]]; link(a, b); link(b, a); link(b, c); link(c, b); link(a, c); link(c, a); }
  let cur = new Float32Array(n * 3), nxt = new Float32Array(n * 3); for (let v = 0; v < n; v++) { cur[v * 3] = pos.getX(v); cur[v * 3 + 1] = pos.getY(v); cur[v * 3 + 2] = pos.getZ(v); } nxt.set(cur);
  for (let r = 0; r < rounds; r++) { for (const [v, set] of nb) { let x = 0, y = 0, z = 0; for (const o of set) { x += cur[o * 3]; y += cur[o * 3 + 1]; z += cur[o * 3 + 2]; } const k = 0.6 / set.size; nxt[v * 3] = cur[v * 3] * 0.4 + x * k; nxt[v * 3 + 1] = cur[v * 3 + 1] * 0.4 + y * k; nxt[v * 3 + 2] = cur[v * 3 + 2] * 0.4 + z * k; } const t = cur; cur = nxt; nxt = t; nxt.set(cur); }
  const fill = new Float32Array(n); for (const v of nb.keys()) { const d = (cur[v * 3] - pos.getX(v)) * nor.getX(v) + (cur[v * 3 + 1] - pos.getY(v)) * nor.getY(v) + (cur[v * 3 + 2] - pos.getZ(v)) * nor.getZ(v); fill[v] = Math.min(maxFill, Math.max(0, d)); }
  return { fill, weld };
}
/** Triangles of `src` whose three vertices are dominated by `bones`, pushed out by `offset` metres (skin data kept). `drape` rounds of smoothing make it hang like cloth. */
function shell(key: string, src: THREE.BufferGeometry, bones: THREE.Bone[], names: string[], offset: number, keep?: (vertex: number, pos: THREE.Vector3) => boolean, drape = 0) {
  const hit = shellCache.get(key); if (hit) return hit;
  const idx = new Set(names.map(n => bones.findIndex(b => b.name === n)).filter(i => i >= 0));
  const si = src.getAttribute("skinIndex"), sw = src.getAttribute("skinWeight"), pos = src.getAttribute("position"), nor = src.getAttribute("normal");
  const vOk = new Uint8Array(pos.count); const p = new THREE.Vector3();
  for (let v = 0; v < pos.count; v++) { let best = -1, bw = -1; for (let k = 0; k < 4; k++) { const w = sw.getComponent(v, k); if (w > bw) { bw = w; best = si.getComponent(v, k); } } p.fromBufferAttribute(pos, v); vOk[v] = idx.has(best) && (!keep || keep(v, p)) ? 1 : 0; }
  const index = src.getIndex()!; const tris: number[] = [];
  for (let i = 0; i < index.count; i += 3) { const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2); if (vOk[a] && vOk[b] && vOk[c]) tris.push(a, b, c); }
  const g = src.clone(); const out = g.getAttribute("position") as THREE.BufferAttribute; const n = new THREE.Vector3();
  const hang = drape > 0 ? drapeFill(pos, nor, tris, drape, 0.035) : null;
  for (let v = 0; v < out.count; v++) { n.fromBufferAttribute(nor, v); const d = offset + (hang ? hang.fill[hang.weld[v]] : 0); out.setXYZ(v, out.getX(v) + n.x * d, out.getY(v) + n.y * d, out.getZ(v) + n.z * d); }
  if (hang) {
    // Shade from the draped surface, not from the muscles underneath: area-weighted face normals, shared across UV seams.
    const acc = new Float32Array(out.count * 3); const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < tris.length; i += 3) { a.fromBufferAttribute(out, tris[i]); b.fromBufferAttribute(out, tris[i + 1]); c.fromBufferAttribute(out, tris[i + 2]); b.sub(a); c.sub(a); b.cross(c); for (let k = 0; k < 3; k++) { const w = hang.weld[tris[i + k]] * 3; acc[w] += b.x; acc[w + 1] += b.y; acc[w + 2] += b.z; } }
    const on = g.getAttribute("normal") as THREE.BufferAttribute; for (let v = 0; v < on.count; v++) { const w = hang.weld[v] * 3; const l = Math.hypot(acc[w], acc[w + 1], acc[w + 2]); if (l > 1e-12) on.setXYZ(v, acc[w] / l, acc[w + 1] / l, acc[w + 2] / l); }
  }
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

export interface HumanProps { appearance: Appearance; anim: AnimState; speed?: number; protagonist?: boolean; outfit?: Outfit; weapon?: string; kit?: PersonKit }
export function HumanAvatar({ appearance, anim, speed, protagonist, outfit, weapon, kit }: HumanProps) {
  const [female, male, hair, anims] = useLoader(GLTFLoader, [CHARACTER_FILES.female, CHARACTER_FILES.male, CHARACTER_FILES.hair, CHARACTER_FILES.anims]) as GLTF[];
  const assets: Assets = { female, male, hair, anims };
  const key = JSON.stringify(appearance) + (protagonist ? ":p" + JSON.stringify(outfit ?? {}) : "") + (kit ? ":k" + JSON.stringify(kit) : "");
  const built = useMemo(() => buildCharacter(assets, appearance, !!protagonist, outfit, protagonist ? undefined : kit), // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, female, male, hair]);
  const mixer = useMemo(() => new THREE.AnimationMixer(built.root), [built]);
  const current = useRef<{ name: string; action: THREE.AnimationAction } | null>(null);
  // A rebuilt character (new outfit/appearance) has a fresh mixer: forget the old action so a clip starts at once (no T-pose).
  useMemo(() => { current.current = null; }, [mixer]);
  const head = useMemo(() => built.root.getObjectByName("Head") as THREE.Bone | undefined, [built]);
  const lookT = useRef(Math.random() * 10);
  useEffect(() => () => { mixer.stopAllAction(); mixer.uncacheRoot(built.root); }, [mixer, built]);
  // Held item on the right hand bone; swapped without rebuilding the character.
  useEffect(() => { const hand = built.root.getObjectByName("hand_r"); if (!hand || !weapon) return; const mesh = weaponMesh(weapon); hand.add(mesh); return () => { hand.remove(mesh); }; }, [built, weapon]);

  useFrame((_, dt) => {
    const want = clipFor(anim, speed);
    if (current.current?.name !== want.clip) {
      const clip = anims.animations.find(c => c.name === want.clip) ?? anims.animations.find(c => c.name === "Idle_Loop");
      if (clip) { const next = mixer.clipAction(clip); next.reset().setEffectiveWeight(1); if (want.once) { next.setLoop(THREE.LoopOnce, 1); next.clampWhenFinished = true; } else next.setLoop(THREE.LoopRepeat, Infinity); next.fadeIn(0.18).play(); current.current?.action.fadeOut(0.22); current.current = { name: want.clip, action: next }; }
    }
    if (current.current) current.current.action.timeScale = CLIP_SPEED[want.clip] ? clampScale(want.timeScale) : want.timeScale;
    mixer.update(Math.min(dt, 0.1));
    // subtle idle look-around layered on top of the clip
    if (head && (anim === "idle" || anim === "talk")) { lookT.current += dt; head.rotation.y += Math.sin(lookT.current * 0.45) * 0.25; head.rotation.x += Math.sin(lookT.current * 0.31) * 0.05; }
  });
  return <primitive object={built.root} />;
}

function buildCharacter(a: Assets, app: Appearance, protagonist: boolean, outfit?: Outfit, kit?: PersonKit) {
  const src = app.body === "f" ? a.female : a.male;
  const root = cloneSkinned(src.scene) as THREE.Group;
  let body: THREE.SkinnedMesh | null = null;
  root.traverse(o => { const m = o as THREE.SkinnedMesh; if (m.isSkinnedMesh) { m.castShadow = protagonist || /Superhero|SuperHero/.test(m.name); m.frustumCulled = false; if (!body || m.geometry.getAttribute("position").count > body.geometry.getAttribute("position").count) body = m; } });
  if (!body) return { root };
  const b = body as THREE.SkinnedMesh; const bones = b.skeleton.bones;
  // skin tone
  const skinMat = (b.material as THREE.MeshStandardMaterial).clone(); skinMat.color.setScalar(SKIN_SCALE[app.skin] ?? 1); skinMat.roughness = 0.62; b.material = skinMat;
  // hair: bind the shared hair mesh to this character's skeleton
  const hairName = protagonist && app.body === "f" ? "Hair_Long" : protagonist ? (app.hair === 0 ? "Hair_Buzzed" : "Hair_SimpleParted") : HAIR_NAMES[app.hair] ?? "Hair_SimpleParted"; // Kanupriya keeps her long hair; Kartik wears his short
  const hairNames = app.body === "m" && (app.hair === 3 || kit?.beard) ? [hairName, "Hair_Beard"] : [hairName];
  for (const hn of hairNames) {
    let hm: THREE.SkinnedMesh | undefined; for (const sc of a.hair.scenes) sc.traverse(o => { if ((o as THREE.SkinnedMesh).isSkinnedMesh && o.name === hn) hm = o as THREE.SkinnedMesh; });
    if (hm) { const mat = (hm.material as THREE.MeshStandardMaterial).clone(); mat.color.setHex(HAIR_COLORS[app.hairColor] ?? 0x1a1a1a).multiplyScalar(2.2); mat.roughness = 0.55;
      const mesh = new THREE.SkinnedMesh(hm.geometry, mat); mesh.castShadow = protagonist; mesh.frustumCulled = false; b.parent!.add(mesh);
      mesh.bind(new THREE.Skeleton(bones, hm.skeleton.boneInverses), b.bindMatrix); }
  }
  // clothing shells
  const kind = app.body; const o = outfitFor(app); const g = b.geometry;
  const thighL = bones.find(x => x.name === "thigh_l"), calfL = bones.find(x => x.name === "calf_l");
  const kneeY = calfL && thighL ? new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(b.skeleton.boneInverses[bones.indexOf(calfL)]).invert()).y : 0.5;
  const hipY = thighL ? new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(b.skeleton.boneInverses[bones.indexOf(thighL)]).invert()).y : 0.9;
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => { const m = new THREE.SkinnedMesh(geo, mat); m.castShadow = protagonist; m.receiveShadow = true; m.frustumCulled = false; b.parent!.add(m); m.bind(b.skeleton, b.bindMatrix); };
  // Protagonist clothes come from the wardrobe (economy catalogue); NPCs from their appearance palette.
  const pick = (id?: string) => (id ? item(id)?.clothing : undefined);
  const pt = protagonist ? pick(outfit?.top) : undefined, pb = protagonist ? pick(outfit?.bottom) : undefined, ps = protagonist ? pick(outfit?.shoes) : undefined;
  const topCol = pt?.color ?? (protagonist ? 0x1f6f78 : kit?.top ?? TOPS[app.top] ?? 0xc8102e), botCol = pb?.color ?? (protagonist ? 0x2b4f7e : kit?.bottom ?? BOTTOMS[app.bottom] ?? 0x1c1d22), shoeCol = ps?.color ?? (protagonist ? 0xf2f0ea : kit?.shoes ?? SHOES[app.shoes] ?? 0x111111);
  const cut = pt?.cut ?? (protagonist ? "kurti" : kit?.uniform ? "shirt" : o.tunic ? "kurti" : o.long ? "jacket" : "tee");
  const longSleeve = cut === "kurti" || cut === "jacket" || (cut === "shirt" && !kit?.uniform) || (!protagonist && o.long && !kit?.uniform);
  const tunic = cut === "kurti" || (!protagonist && o.tunic && !kit?.uniform);
  const bottomCut = pb?.cut ?? "jeans";
  const bottomMat = bottomCut === "jeans" ? "denim" : protagonist ? "cotton" : (app.bottom === 1 || app.bottom === 0 ? "denim" : "cotton");
  add(shell(`${kind}:pants:${bottomCut === "palazzo" ? "wide" : "fit"}`, g, bones, ["pelvis", ...THIGH, ...CALF], bottomCut === "palazzo" ? 0.028 : bottomCut === "cargo" ? 0.014 : 0.008, (_, p) => p.y < hipY + 0.12, 5), cloth(botCol, bottomMat));
  const shoeTop = ps?.cut === "boots" ? kneeY * 0.62 : ps?.cut === "juttis" ? 0.09 : Math.max(0.13, kneeY * 0.25);
  add(shell(`${kind}:shoes:${ps?.cut ?? "std"}`, g, bones, [...FEET, ...CALF], 0.014, (_, p) => p.y < shoeTop), cloth(shoeCol, ps?.cut === "boots" ? "leather" : "rubber"));
  const sleeves = longSleeve ? [...UPPER, ...LOWER] : UPPER;
  const sleeveKeep = (_: number, p: THREE.Vector3) => longSleeve ? !(cut === "kurti" && Math.abs(p.x) > 0.5) : Math.abs(p.x) < 0.42;
  add(shell(`${kind}:top:${longSleeve ? (cut === "kurti" ? "k" : "l") : "s"}`, g, bones, [...TORSO, ...sleeves], cut === "jacket" ? 0.022 : 0.014, (v, p) => (Math.abs(p.x) < 0.2 || sleeveKeep(v, p)) && p.y > hipY - 0.06, 10), cloth(topCol, cut === "jacket" && (pt?.color === 0x2a2220 || (!protagonist && app.top === 7)) ? "leather" : cut === "jacket" ? "denim" : "cotton"));
  if (tunic) add(shell(`${kind}:tunic`, g, bones, ["pelvis", "spine_01", ...THIGH], 0.024, (_, p) => p.y > (hipY + kneeY) / 2 + 0.02, 10), cloth(topCol, "cotton"));
  // accessories on bones
  const headBone = bones.find(x => x.name === "Head"), spine = bones.find(x => x.name === "spine_03"), pelvis = bones.find(x => x.name === "pelvis");
  const acc = protagonist ? pick(outfit?.acc)?.cut : undefined;
  if (headBone && acc === "shades") { const shades = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.035, 0.02), cloth(0x0b0b0b, "leather")); shades.position.set(0, 0.08, 0.1); headBone.add(shades); }
  if (headBone && acc === "cap") { const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), cloth(0xb3122e, "cotton")); cap.position.set(0, 0.15, 0); headBone.add(cap); }
  if (protagonist && spine && pelvis) {
    // video journalist kit: cross-body strap and a compact camera bag
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.09), cloth(0x3b2a1e, "leather")); bag.position.set(0.17, -0.02, 0.06); pelvis.add(bag);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16), cloth(0x111111, "rubber")); lens.rotation.x = Math.PI / 2; lens.position.set(0.17, -0.02, 0.115); pelvis.add(lens);
  } else if (headBone && app.accessory === 1) {
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.035, 0.02), cloth(0x0b0b0b, "leather")); shades.position.set(0, 0.08, 0.1); headBone.add(shades);
  } else if (headBone && app.accessory === 2) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), cloth(kit?.uniform === "police" ? 0x4a4630 : 0xc8102e, "cotton")); cap.position.set(0, 0.14, 0); headBone.add(cap);
  } else if (app.accessory === 3) {
    const neck = bones.find(x => x.name === "neck_01"); if (neck) { const gamcha = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.025, 6, 16), cloth(0xe8b04b, "cotton")); gamcha.rotation.x = Math.PI / 2; neck.add(gamcha); }
  }
  if (kit) dressKit(kit, kind, b, bones, add, hipY, HAIR_COLORS[app.hairColor] ?? 0x1a1a1a);
  if (kit) root.scale.set(kit.build * kit.height, kit.height, kit.build * kit.height);
  return { root };
}

// ───────────── per-person kit (peopleKit.ts): bags, glasses, moustache, dupatta, uniform belt ─────────────
const kitGeo = new Map<string, THREE.BufferGeometry>();
const once = (key: string, make: () => THREE.BufferGeometry) => { let g = kitGeo.get(key); if (!g) { g = make(); kitGeo.set(key, g); } return g; };
const part = (g: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => { const n = g.index ? g.toNonIndexed() : g; if (rx || ry || rz) n.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz))); n.translate(x, y, z); return n; };
/** Front (or back) surface of the bind-pose body on the centre line between two heights: accessories sit on the real face and back, not at guessed offsets. */
const surfaceCache = new Map<string, number>();
function surfaceZ(kind: string, g: THREE.BufferGeometry, y0: number, y1: number, back = false, halfWidth = 0.014) {
  const k = `${kind}:${y0.toFixed(3)}:${y1.toFixed(3)}:${back}`; const hit = surfaceCache.get(k); if (hit !== undefined) return hit;
  const p = g.getAttribute("position"); let z = back ? Infinity : -Infinity; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < y0 || y > y1 || Math.abs(p.getX(i)) > halfWidth) continue; z = back ? Math.min(z, p.getZ(i)) : Math.max(z, p.getZ(i)); }
  if (!Number.isFinite(z)) z = back ? -0.12 : 0.1; surfaceCache.set(k, z); return z;
}
function dressKit(kit: PersonKit, kind: string, b: THREE.SkinnedMesh, bones: THREE.Bone[], add: (geo: THREE.BufferGeometry, mat: THREE.Material) => void, hipY: number, hairColour: number) {
  const g = b.geometry; const bone = (n: string) => bones.find(x => x.name === n);
  const bindPos = (n: string) => { const x = bone(n); return x ? new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(b.skeleton.boneInverses[bones.indexOf(x)]).invert()) : null; };
  /** Parent `obj` to a bone so that it sits at a bind-pose (model-space) position. */
  const attach = (name: string, obj: THREE.Object3D, x: number, y: number, z: number) => { const bn = bone(name); if (!bn) return; obj.position.set(x, y, z); obj.updateMatrix(); obj.matrix.premultiply(b.skeleton.boneInverses[bones.indexOf(bn)]); obj.matrix.decompose(obj.position, obj.quaternion, obj.scale); bn.add(obj); };
  const head = bindPos("Head"), chest = bindPos("spine_03"), waist = bindPos("spine_02"), shoulder = bindPos("upperarm_r");
  // eye line: the separate eye mesh gives the exact height on either body
  let eyeY = head ? head.y + 0.085 : 1.68; b.parent?.traverse(o => { const m = o as THREE.SkinnedMesh; if (m.isSkinnedMesh && /^Eyes$/.test(m.name)) { m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox!; eyeY = (bb.min.y + bb.max.y) / 2; } });
  if (kit.glasses) {
    const z = surfaceZ(kind, g, eyeY - 0.012, eyeY + 0.012) + 0.012;
    const frame = once("glasses", () => { const ring = () => new THREE.TorusGeometry(0.024, 0.0035, 5, 14); const bar = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
      return mergeGeometries([part(ring(), -0.032, 0, 0), part(ring(), 0.032, 0, 0), part(bar(0.018, 0.004, 0.004), 0, 0.006, 0), part(bar(0.004, 0.004, 0.1), -0.058, 0.004, -0.05), part(bar(0.004, 0.004, 0.1), 0.058, 0.004, -0.05)])!; });
    attach("Head", new THREE.Mesh(frame, cloth(0x1a1a1c, "leather")), 0, eyeY, z);
  }
  if (kit.moustache) {
    const y = eyeY - 0.074; const z = surfaceZ(kind, g, y - 0.012, y + 0.012) + 0.002;
    const mo = once("moustache", () => { const arc = new THREE.TorusGeometry(0.02, 0.0065, 5, 10, Math.PI); arc.scale(1, 0.55, 1); return arc; });
    attach("Head", new THREE.Mesh(mo, hairMat(hairColour)), 0, y - 0.006, z);
  }
  if (kit.bindi) { const y = eyeY + 0.036; attach("Head", new THREE.Mesh(once("bindi", () => new THREE.SphereGeometry(0.0055, 8, 6)), cloth(0xb3122e, "rubber")), 0, y, surfaceZ(kind, g, y - 0.008, y + 0.008) + 0.001); }
  if (kit.dupatta !== null && chest) add(shell(`${kind}:dupatta`, g, bones, ["spine_03", "clavicle_l", "clavicle_r", "neck_01"], 0.034, (_, p) => p.y > chest.y + 0.02 && Math.abs(p.x) < 0.2, 10), cloth(kit.dupatta, "cotton"));
  if (kit.uniform === "police") {
    g.computeBoundingBox(); const crown = g.boundingBox!.max.y;
    const cap = once("police-cap", () => mergeGeometries([part(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 18), 0, -0.012, 0), part(new THREE.CylinderGeometry(0.122, 0.1, 0.04, 18), 0, 0.033, 0), part(new THREE.BoxGeometry(0.15, 0.008, 0.085), 0, -0.036, 0.11, 0.3)])!);
    attach("Head", new THREE.Mesh(cap, cloth(0x4d4a36, "cotton")), 0, crown - 0.008, -0.012);
    attach("Head", new THREE.Mesh(once("police-badge", () => new THREE.BoxGeometry(0.03, 0.03, 0.008)), cloth(0xc9a227, "leather")), 0, crown + 0.012, 0.1);
  }
  if (kit.uniform === "police") add(shell(`${kind}:belt`, g, bones, ["pelvis", "spine_01"], 0.03, (_, p) => p.y > hipY + 0.03 && p.y < hipY + 0.085), cloth(0x15120f, "leather"));
  if (kit.bag === "backpack" && chest && waist) {
    const y = (chest.y + waist.y) / 2 + 0.05; const back = surfaceZ(kind, g, y - 0.1, y + 0.1, true, 0.05);
    const pack = once("backpack", () => mergeGeometries([part(new THREE.BoxGeometry(0.27, 0.36, 0.13, 2, 2, 2), 0, 0, 0), part(new THREE.BoxGeometry(0.2, 0.15, 0.04), 0, -0.07, -0.08), part(new THREE.BoxGeometry(0.07, 0.03, 0.02), 0, 0.2, 0.02)])!);
    attach("spine_03", new THREE.Mesh(pack, cloth(kit.bagColor, "cotton")), 0, y, back - 0.062);
    add(shell(`${kind}:straps`, g, bones, TORSO, 0.04, (_, p) => Math.abs(Math.abs(p.x) - 0.095) < 0.024 && p.y > waist.y), cloth(kit.bagColor, "cotton"));
  }
  if (kit.bag === "jhola" && shoulder) {
    // cloth shoulder bag: strap from the right shoulder across to the left hip, bag resting on the hip
    const sx = -0.105, sy = shoulder.y + 0.02, hx = 0.16, hy = hipY + 0.02; const len = Math.hypot(hx - sx, hy - sy), nx = (sy - hy) / len, ny = (hx - sx) / len, c = nx * sx + ny * sy;
    add(shell(`${kind}:jholaStrap`, g, bones, TORSO, 0.04, (_, p) => Math.abs(nx * p.x + ny * p.y - c) < 0.022 && p.y > hy - 0.02 && p.y < sy + 0.06), cloth(kit.bagColor, "cotton"));
    const bag = once("jhola", () => mergeGeometries([part(new THREE.BoxGeometry(0.07, 0.26, 0.24, 1, 2, 2), 0, 0, 0), part(new THREE.BoxGeometry(0.075, 0.07, 0.25), 0, 0.1, 0)])!);
    attach("pelvis", new THREE.Mesh(bag, cloth(kit.bagColor, "cotton")), hx + 0.065, hy - 0.11, 0);
  }
  if (kit.bag === "thaila") {
    // carry bag hanging from the left hand: the hand bone's +Y runs along the fingers
    const hand = bone("hand_l"); if (hand) { const bag = once("thaila", () => mergeGeometries([part(new THREE.BoxGeometry(0.09, 0.26, 0.24), 0, 0.3, 0), part(new THREE.BoxGeometry(0.012, 0.12, 0.012), 0, 0.12, 0.07), part(new THREE.BoxGeometry(0.012, 0.12, 0.012), 0, 0.12, -0.07)])!); hand.add(new THREE.Mesh(bag, cloth(kit.bagColor, "cotton"))); }
  }
}
const hairMat = (color: number) => { const k = `hair:${color}`; let m = matCache.get(k); if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: 0.6 }); matCache.set(k, m); } return m; };

/** Preload once the world is up, so the first character swap does not stall. */
export function preloadCharacters() { useLoader.preload(GLTFLoader, [CHARACTER_FILES.female, CHARACTER_FILES.male, CHARACTER_FILES.hair, CHARACTER_FILES.anims]); }

/** Original, code-built held items. Grip at the origin; the item extends along the hand bone's +Y (toward the fingers). */
const heldCache = new Map<string, THREE.Object3D>();
export function weaponMesh(id: string): THREE.Object3D {
  let proto = heldCache.get(id);
  if (!proto) {
    const g = new THREE.Group(); const mk = (geo: THREE.BufferGeometry, color: number, p: [number, number, number], r: [number, number, number] = [0, 0, 0], metal = 0) => { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: metal ? 0.35 : 0.7, metalness: metal })); m.position.set(...p); m.rotation.set(...r); m.castShadow = true; g.add(m); };
    if (id === "w_lathi") mk(new THREE.CylinderGeometry(0.018, 0.022, 1.45, 8), 0xc9a861, [0, 0.45, 0]);
    else if (id === "w_bat") { mk(new THREE.CylinderGeometry(0.016, 0.018, 0.32, 8), 0x3a2a1a, [0, 0.12, 0]); mk(new THREE.BoxGeometry(0.1, 0.55, 0.04), 0xe0c58f, [0, 0.55, 0]); }
    else if (id === "w_baton") { mk(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 10), 0x15161a, [0, 0.25, 0]); mk(new THREE.CylinderGeometry(0.022, 0.022, 0.05, 10), 0xf2c400, [0, 0.52, 0], [0, 0, 0], 0.4); }
    else if (id === "w_spray") { mk(new THREE.CylinderGeometry(0.022, 0.022, 0.13, 12), 0xb3122e, [0, 0.07, 0.02]); mk(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8), 0x111111, [0, 0.15, 0.02]); }
    else if (id === "w_pellet") { mk(new THREE.BoxGeometry(0.035, 0.11, 0.03), 0x2b2b30, [0, 0.04, 0.02], [0, 0, 0], 0.3); mk(new THREE.BoxGeometry(0.035, 0.03, 0.17), 0x3a3d44, [0, 0.1, 0.08], [0, 0, 0], 0.6); mk(new THREE.BoxGeometry(0.02, 0.01, 0.03), 0xf2c400, [0, 0.12, 0.15]); }
    heldCache.set(id, g); proto = g;
  }
  return proto.clone();
}
