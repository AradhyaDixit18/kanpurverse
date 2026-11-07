import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { ANCHORS, GEO_WORLD_SIZE, ll, toLatLon } from "../packages/shared/src/geo";
import { DialogueFile, VOICE_PROFILES, pickLine, isValidName, maskProfanity, stripPII, generateBuildings, LANDMARKS, MISSIONS, NPCS, levelFromXp, C2S, ROADS } from "../packages/shared/src/index";

const load = (l: string) => DialogueFile.parse(JSON.parse(readFileSync(new URL(`../assets/dialogues/${l}.json`, import.meta.url), "utf8")));

describe("dialogue library", () => {
  const k = load("kanpuriya"), h = load("hindi"), e = load("english");
  it("validates and has the same ids in all three languages", () => {
    const ids = (f: { lines: { id: string }[] }) => f.lines.map(l => l.id).sort();
    expect(ids(h)).toEqual(ids(k)); expect(ids(e)).toEqual(ids(k));
    expect(k.lines.length).toBeGreaterThanOrEqual(44);
  });
  it("every npc has a greeting-type line and every mission has an offer", () => {
    for (const n of NPCS) expect(k.lines.some(l => l.npc === n.id)).toBe(true);
    for (const m of MISSIONS) expect(k.lines.some(l => l.mission === m.id)).toBe(true);
    for (const l of k.lines) { if (l.mission) expect(MISSIONS.some(m => m.id === l.mission)).toBe(true); if (l.next) expect(k.lines.some(x => x.id === l.next)).toBe(true); }
  });
  it("kanpuriya lines are Devanagari with roman transliteration", () => { for (const l of k.lines) { expect(/[ऀ-ॿ]/.test(l.text)).toBe(true); expect(l.roman?.length).toBeGreaterThan(3); } });
  it("voice profiles referenced exist, and the python script mirrors them", () => {
    for (const l of [...k.lines, ...e.lines]) if (l.voice) expect(VOICE_PROFILES[l.voice]).toBeDefined();
    const py = readFileSync(new URL("../scripts/generate_voices.py", import.meta.url), "utf8");
    for (const [name, p] of Object.entries(VOICE_PROFILES)) expect(py).toContain(`"${name}":`) && expect(py).toContain(p.edge);
  });
  it("pickLine prefers npc-specific lines and is deterministic", () => {
    expect(pickLine(k.lines, "chai_munna", "cafe", 0)?.npc).toBe("chai_munna");
    expect(pickLine(k.lines, "ped_vikas", "reaction", 1)?.npc).toBe("any");
    expect(pickLine(k.lines, "guide_babloo", "greeting", 3)).toEqual(pickLine(k.lines, "guide_babloo", "greeting", 3));
  });
});

describe("moderation", () => {
  it("names", () => { expect(isValidName("Rad_123").ok).toBe(true); expect(isValidName("ab").ok).toBe(false); expect(isValidName("Admin1").ok).toBe(false); expect(isValidName("chut1ya").ok).toBe(false); });
  it("profanity & PII", () => { expect(maskProfanity("hello bhosdike")).toBe("hello b*******"); expect(stripPII("call 9876543210 or a@b.com")).toBe("call [number removed] or [email removed]"); });
});

describe("world", () => {
  it("generates buildings off the roads and away from landmarks", () => {
    const b = generateBuildings(); expect(b.length).toBeGreaterThan(25);
    for (const x of b) { for (const r of ROADS) { if (r.a[0] === r.b[0]) expect(Math.abs(x.p[0] - r.a[0])).toBeGreaterThan(r.w / 2); else expect(Math.abs(x.p[1] - r.a[1])).toBeGreaterThan(r.w / 2); } }
    const lake = LANDMARKS.find(l => l.id === "moti_jheel")!; for (const x of b) expect(Math.hypot(x.p[0] - lake.p[0], x.p[1] - lake.p[1])).toBeGreaterThan(lake.r);
  });
  it("missions reference existing givers; xp curve", () => { for (const m of MISSIONS) if (m.giver) expect(NPCS.some(n => n.id === m.giver)).toBe(true); expect(levelFromXp(0)).toBe(1); expect(levelFromXp(350)).toBe(2); expect(levelFromXp(5000)).toBeGreaterThan(5); });
  it("protocol rejects oversize chat and bad anims", () => { expect(C2S.safeParse({ t: "chat", text: "x".repeat(161) }).success).toBe(false); expect(C2S.safeParse({ t: "emote", anim: "fly" }).success).toBe(false); expect(C2S.safeParse({ t: "state", p: [0, 0, 0], ry: 0, anim: "walk", seq: 1 }).success).toBe(true); });
});

describe("server origin allow-list", () => {
  it("supports exact, any and wildcard-subdomain entries", async () => {
    process.env.ALLOWED_ORIGINS = "http://localhost:3000,https://*.vercel.app"; process.env.KV_NO_AUTOSTART = "1";
    const { originAllowed } = await import("../apps/server/src/index");
    expect(originAllowed("http://localhost:3000")).toBe(true); expect(originAllowed("https://kanpurverse-abc123-aradhu74s-projects.vercel.app")).toBe(true);
    expect(originAllowed("https://evil.com")).toBe(false); expect(originAllowed("https://vercel.app.evil.com")).toBe(false);
  });
});

describe("geo anchors", () => {
  it("ll/toLatLon round-trip within a metre", () => { const [x, z] = ll(26.4775, 80.3365); const [lat, lon] = toLatLon(x, z); expect(Math.abs(lat - 26.4775)).toBeLessThan(0.00002); expect(Math.abs(lon - 80.3365)).toBeLessThan(0.00002); });
  it("every anchor is inside the world and labelled with a source", () => { for (const a of Object.values(ANCHORS)) { expect(Math.abs(a.p[0])).toBeLessThan(GEO_WORLD_SIZE / 2); expect(Math.abs(a.p[1])).toBeLessThan(GEO_WORLD_SIZE / 2); expect(["osm", "approx"]).toContain(a.source); } });
});
