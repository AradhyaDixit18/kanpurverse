import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { clipFor, CLIP_SPEED, CHARACTER_FILES } from "../apps/web/src/game/HumanAvatar";

/** Read the JSON chunk of a .glb without a DOM. */
function glbJson(path: string) { const b = readFileSync(new URL(`../apps/web/public${path}`, import.meta.url)); const len = b.readUInt32LE(12); return JSON.parse(b.subarray(20, 20 + len).toString("utf8")); }

describe("rigged character assets", () => {
  const anims = glbJson(CHARACTER_FILES.anims); const female = glbJson(CHARACTER_FILES.female); const male = glbJson(CHARACTER_FILES.male); const hair = glbJson(CHARACTER_FILES.hair);
  it("bodies and hair share the 65-joint humanoid skeleton the animations target", () => {
    const names = (j: { nodes: { name: string }[]; skins: { joints: number[] }[] }) => j.skins[0].joints.map(i => j.nodes[i].name);
    const ref = names(female); expect(ref.length).toBe(65); expect(names(male)).toEqual(ref); expect(names(hair)).toEqual(ref);
    const animated = new Set(anims.animations.flatMap((a: { channels: { target: { node: number } }[] }) => a.channels.map(c => anims.nodes[c.target.node].name)));
    for (const bone of ["pelvis", "spine_02", "Head", "thigh_l", "calf_r", "foot_l", "upperarm_r", "hand_l"]) expect(animated.has(bone)).toBe(true);
  });
  it("every gameplay state maps to a clip that ships in the animation file", () => {
    const clips = new Set(anims.animations.map((a: { name: string }) => a.name));
    for (const s of ["idle", "walk", "run", "sprint", "jump", "fall", "sit", "drive", "wave", "dance", "laugh", "celebrate", "talk", "highfive", "punch", "packet", "openpacket", "consume", "spit"] as const) expect(clips.has(clipFor(s).clip), s).toBe(true);
  });
  it("locomotion playback speed matches ground speed so feet do not slide", () => {
    for (const v of [1.0, 1.4, 3.2, 5.5, 8.5]) { const c = clipFor("walk", v); expect(CLIP_SPEED[c.clip] * c.timeScale).toBeCloseTo(v, 5); }
    expect(clipFor("walk", 1.2).clip).toBe("Walk_Loop"); expect(clipFor("run", 5.5).clip).toBe("Jog_Fwd_Loop"); expect(clipFor("sprint", 8.5).clip).toBe("Sprint_Loop");
  });
  it("hair file carries the styles the game selects, and the payload stays bounded", () => {
    const meshes = new Set(hair.nodes.filter((n: { mesh?: number }) => n.mesh !== undefined).map((n: { name: string }) => n.name));
    for (const h of ["Hair_Long", "Hair_Buns", "Hair_SimpleParted", "Hair_Buzzed", "Hair_Beard"]) expect(meshes.has(h)).toBe(true);
    const total = Object.values(CHARACTER_FILES).reduce((n, f) => n + readFileSync(new URL(`../apps/web/public${f}`, import.meta.url)).length, 0);
    expect(total).toBeLessThan(8 * 1024 * 1024);
  });
});
