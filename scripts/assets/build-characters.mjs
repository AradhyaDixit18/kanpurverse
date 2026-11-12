/**
 * Build the runtime character assets for Kanpur Chronicles from the CC0 Quaternius packs.
 *
 *   node scripts/assets/build-characters.mjs <UniversalBaseCharacters dir> <UniversalAnimationLibrary dir> <out dir>
 *
 * Sources (CC0 1.0, Quaternius, https://quaternius.com): "Universal Base Characters [Standard]" and
 * "Universal Animation Library [Standard]". See docs/ASSET_LICENCES.md. Requires @gltf-transform/{core,functions} + sharp.
 * Output: kc_female.glb, kc_male.glb (body, eyes, brows; 1024 px WebP textures), kc_hair.glb (five hairstyles in one
 * file, shared textures), kc_anims.glb (selected animation clips on the shared 65-joint humanoid skeleton, no mesh).
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { prune, dedup, resample, textureCompress, weld, quantize, mergeDocuments, unpartition } from "@gltf-transform/functions";
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const [charsDir, animDir, out] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
fs.mkdirSync(out, { recursive: true });
const tex = (size) => textureCompress({ encoder: sharp, targetFormat: "webp", resize: [size, size], quality: 82 });

async function body(name, file) {
  const doc = await io.read(path.join(charsDir, "Base Characters/Godot - UE", file));
  // Positions stay float: the runtime builds clothing shells by offsetting body vertices along their normals.
  await doc.transform(weld(), dedup(), prune(), tex(1024));
  await io.write(path.join(out, name), doc);
}
await body("kc_female.glb", "Superhero_Female_FullBody.gltf");
await body("kc_male.glb", "Superhero_Male_FullBody.gltf");

// Hair: one file, every style as its own skinned mesh on the same skeleton; textures deduplicated.
const hairDir = path.join(charsDir, "Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)");
const styles = ["Hair_Long", "Hair_Buns", "Hair_SimpleParted", "Hair_Buzzed", "Hair_Beard", "Eyebrows_Regular"];
const hair = await io.read(path.join(hairDir, styles[0] + ".gltf"));
for (const s of styles.slice(1)) mergeDocuments(hair, await io.read(path.join(hairDir, s + ".gltf")));
await hair.transform(unpartition(), weld(), dedup(), prune(), tex(1024));
await io.write(path.join(out, "kc_hair.glb"), hair);

// Animations: keep only the clips the game maps to, drop the mannequin mesh.
const KEEP = new Set(["Idle_Loop", "Walk_Loop", "Jog_Fwd_Loop", "Sprint_Loop", "Jump_Start", "Jump_Loop", "Jump_Land", "Driving_Loop", "Sitting_Idle_Loop", "Sitting_Talking_Loop", "Idle_Talking_Loop", "Interact", "Dance_Loop", "PickUp_Table", "Crouch_Idle_Loop", "Walk_Formal_Loop", "Push_Loop", "Hit_Chest", "Punch_Jab", "Roll", "Death01", "Hit_Head", "Pistol_Idle_Loop", "Pistol_Shoot", "Pistol_Aim_Neutral", "Pistol_Reload", "Sword_Attack", "Punch_Cross"]);
const anim = await io.read(path.join(animDir, "Unreal-Godot/UAL1_Standard.glb"));
for (const a of anim.getRoot().listAnimations()) if (!KEEP.has(a.getName())) a.dispose();
for (const n of anim.getRoot().listNodes()) if (n.getMesh()) { n.getMesh().dispose(); n.setMesh(null); n.setSkin(null); }
for (const m of anim.getRoot().listMaterials()) m.dispose(); for (const t of anim.getRoot().listTextures()) t.dispose();
await anim.transform(resample({ tolerance: 1e-4 }), dedup(), prune({ keepLeaves: true }), quantize());
await io.write(path.join(out, "kc_anims.glb"), anim);
for (const f of fs.readdirSync(out)) console.log(f, (fs.statSync(path.join(out, f)).size / 1024).toFixed(0) + " KB");
