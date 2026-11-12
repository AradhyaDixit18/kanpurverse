import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ITEMS, purchase, equipOutfit, consumeItem, buyVehicle, repairVehicle, hospitalTreat, knockoutBill, newGameState, item, SHOPS, MISSIONS, type Wallet } from "@kanpurverse/shared";
import { migrateSave, parseSoloSave, SOLO_KEY } from "../apps/web/src/state/soloSave";
import { stepStamina, fallDamage, crashDamage } from "../apps/web/src/game/playerStatus";
import { attack, enemies, hurtPlayer, resetCombat } from "../apps/web/src/game/combatRuntime";
vi.mock("../apps/web/src/audio/sfx", () => ({ sfx: new Proxy({}, { get: () => () => {} }), unlockAudio: () => {} }));
import { net, grantItems } from "../apps/web/src/net/client";
import { useStore } from "../apps/web/src/state/store";
import * as THREE from "three";

const W = (coins: number): Wallet => ({ coins, game: newGameState() });

describe("economy transactions are atomic", () => {
  it("successful purchase moves money into inventory exactly once", () => {
    const r = purchase(W(1000), "w_lathi"); expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.wallet.coins).toBe(700); expect(r.wallet.game.weapons).toEqual(["w_lathi"]); expect(r.wallet.game.stats.spent).toBe(300);
    const again = purchase(r.wallet, "w_lathi"); expect(again.ok).toBe(false); if (!again.ok) expect(again.reason).toBe("owned");
  });
  it("failed purchase changes nothing (insufficient funds, unknown, ammo without weapon, full bag)", () => {
    const w = W(100); const before = JSON.stringify(w);
    for (const [id, reason] of [["w_pellet", "funds"], ["nope", "unknown"], ["a_pellet", "needs-weapon"]] as const) { const r = purchase(w, id); expect(r.ok).toBe(false); if (!r.ok) expect(r.reason).toBe(reason); }
    const rich: Wallet = { coins: 99999, game: { ...newGameState(), items: { m_firstaid: 5 } } }; const full = purchase(rich, "m_firstaid"); expect(full.ok).toBe(false); if (!full.ok) expect(full.reason).toBe("full");
    expect(JSON.stringify(w)).toBe(before);
  });
  it("clothing: buy, then wear; accessories toggle", () => {
    let w = W(5000); let r = equipOutfit(w, "c_kurti_maroon"); expect(r.ok).toBe(false);
    r = purchase(w, "c_kurti_maroon"); expect(r.ok).toBe(true); if (!r.ok) return; w = r.wallet;
    r = equipOutfit(w, "c_kurti_maroon"); expect(r.ok && r.wallet.game.outfit.top).toBe("c_kurti_maroon");
    w = (purchase(w, "c_shades") as { wallet: Wallet }).wallet; w = (equipOutfit(w, "c_shades") as { wallet: Wallet }).wallet; expect(w.game.outfit.acc).toBe("c_shades");
    w = (equipOutfit(w, "c_shades") as { wallet: Wallet }).wallet; expect(w.game.outfit.acc).toBeUndefined();
  });
  it("consumables heal and restore stamina, and are used up", () => {
    let w = (purchase(W(500), "m_firstaid") as { wallet: Wallet }).wallet; const r = consumeItem(w, "m_firstaid", 50); expect(r.ok).toBe(true); if (!r.ok) return;
    expect(r.health).toBe(90); w = r.wallet; expect(w.game.items.m_firstaid).toBeUndefined(); expect(consumeItem(w, "m_firstaid", 50).ok).toBe(false);
  });
  it("vehicle purchase, repair and hospital are priced and saved", () => {
    let r = buyVehicle(W(20000), "hatchback"); expect(r.ok).toBe(true); if (!r.ok) return; expect(r.wallet.game.boughtVehicles).toContain("hatchback");
    expect(buyVehicle(r.wallet, "hatchback").ok).toBe(false); expect(buyVehicle(W(10), "suv").ok).toBe(false);
    const dam: Wallet = { coins: 5000, game: { ...newGameState(), vehicleHealth: { v1: { engine: 60, body: 40 } } } }; r = repairVehicle(dam, "v1"); expect(r.ok).toBe(true); if (r.ok) expect(r.wallet.game.vehicleHealth.v1).toEqual({ engine: 100, body: 100 });
    const h = hospitalTreat(W(1000), 30); expect(h.ok && h.health).toBe(100); expect(hospitalTreat(W(1000), 100).ok).toBe(false);
    expect(knockoutBill(10000)).toBe(500); expect(knockoutBill(800)).toBe(80);
  });
  it("catalogue is coherent: every shop sells something, every ammo has a weapon, story rewards exist", () => {
    for (const s of SHOPS) if (s.type !== "garage" && s.type !== "dealership") expect(ITEMS.some(i => i.shop === (s.type === "hospital" ? "medical" : s.type))).toBe(true);
    for (const w of ITEMS.filter(i => i.weapon?.ammo)) expect(item(w.weapon!.ammo!)?.kind).toBe("ammo");
    for (const m of MISSIONS) for (const id of m.rewardItems ?? []) expect(item(id)).toBeDefined();
    expect(grantItems(newGameState(), ["w_spray", "a_spray"]).items.a_spray).toBe(5);
  });
});

describe("save version 2", () => {
  it("migrates a v1 save without losing story progress or money", () => {
    const v1 = { version: 1, savedAt: 1, position: [1, 1, 1], profile: { name: "Kanupriya", appearance: { body: "f", skin: 2, hair: 4, hairColor: 0, top: 2, bottom: 1, shoes: 2, accessory: 1 }, lang: "kanpuriya", level: 3, xp: 900, coins: 1234, missionsCompleted: ["story_01_wapsi", "laddoo_chakkar"], unlocked: [], playtimeSec: 50 }, health: 80 };
    const m = migrateSave(v1)!; expect(m.version).toBe(2); expect(m.profile.coins).toBe(1234); expect(m.profile.missionsCompleted).toHaveLength(2); expect(m.game.stamina).toBe(100); expect(m.game.outfit.top).toBe("c_kurti_teal");
    expect(parseSoloSave(JSON.stringify(v1))?.version).toBe(2); expect(migrateSave({ version: 7 })).toBeNull();
  });
});

describe("player status rules", () => {
  it("sprint drains stamina, exhaustion blocks sprint until recovered", () => {
    let st = { stamina: 100, exhausted: false, sinceSprint: 9 }; let sprinted = 0;
    for (let i = 0; i < 60 * 8; i++) { const r = stepStamina(st, true, true, 1 / 60); if (r.sprinting) sprinted++; st = r; }
    expect(st.stamina).toBeLessThan(30); expect(sprinted).toBeLessThan(60 * 8);
    for (let i = 0; i < 60 * 3; i++) st = stepStamina(st, false, false, 1 / 60); expect(st.exhausted).toBe(false); expect(st.stamina).toBeGreaterThan(25);
  });
  it("falls and crashes hurt only beyond safe limits", () => { expect(fallDamage(8)).toBe(0); expect(fallDamage(16)).toBeGreaterThan(20); expect(fallDamage(60)).toBe(60); expect(crashDamage(5)).toBe(0); expect(crashDamage(20)).toBeGreaterThan(0); });
});

describe("combat and knock-out (runtime)", () => {
  const data = new Map<string, string>();
  beforeEach(() => { vi.useFakeTimers(); data.clear(); vi.stubGlobal("localStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) }); vi.stubGlobal("window", Object.assign(new EventTarget(), { dispatchEvent: () => true, addEventListener: () => {} })); useStore.getState().set({ name: "CombatQA" }); net.connect("solo", true); resetCombat(); });
  afterEach(() => { net.disconnect(); vi.useRealTimers(); vi.unstubAllGlobals(); });
  it("melee hits only enemies in front and in reach; knock-out counted once", () => {
    const front = { id: "a", mission: "m", pos: new THREE.Vector3(0, 0, 1.2), health: 20, stunUntil: 0, knockedAt: 0, hitAt: 0, attackAt: 0 }, behind = { ...front, id: "b", pos: new THREE.Vector3(0, 0, -1.2), health: 20 };
    enemies.set("a", front); enemies.set("b", behind);
    const s = useStore.getState(); s.set({ game: { ...s.game, weapons: ["w_bat"], equipped: "w_bat" } });
    vi.advanceTimersByTime(2000); const hits = attack(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)); expect(hits).toEqual(["a"]);
    expect(front.knockedAt).toBeGreaterThan(0); expect(behind.health).toBe(20); expect(useStore.getState().game.stats.knockouts).toBe(1);
  });
  it("ranged weapon consumes its clip and reload draws carried ammo", () => {
    const s = useStore.getState(); s.set({ game: { ...s.game, weapons: ["w_pellet"], equipped: "w_pellet", clip: { w_pellet: 1 }, items: { a_pellet: 16 } } });
    enemies.set("t", { id: "t", mission: "m", pos: new THREE.Vector3(0, 0, 20), health: 50, stunUntil: 0, knockedAt: 0, hitAt: 0, attackAt: 0 });
    vi.advanceTimersByTime(2000); expect(attack(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1))).toEqual(["t"]); expect(useStore.getState().game.clip.w_pellet).toBe(0);
    vi.advanceTimersByTime(1000); attack(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)); // empty: auto-reload
    expect(useStore.getState().game.clip.w_pellet).toBe(8); expect(useStore.getState().game.items.a_pellet).toBe(8);
  });
  it("health at zero knocks out, fails the active mission and respawns at the hospital with a bill", () => {
    const s = useStore.getState(); s.set({ profile: { ...s.profile!, coins: 1000 } });
    for (let i = 0; i < 20; i++) { vi.advanceTimersByTime(1000); hurtPlayer(10, "enemy"); }
    expect(useStore.getState().dead?.bill).toBe(100); net.respawn();
    const after = useStore.getState(); expect(after.dead).toBeUndefined(); expect(after.health).toBe(100); expect(after.profile!.coins).toBe(900); expect(after.game.stats.deaths).toBe(1);
    expect(parseSoloSave(data.get(SOLO_KEY)!)?.profile.coins).toBe(900);
  });
});

describe("outfit pickers share the game's outfit and wardrobe", () => {
  it("wardrobeFor lists only owned clothes for the slot", async () => {
    const { wardrobeFor, newGameState } = await import("@kanpurverse/shared");
    const g = newGameState(); g.wardrobe.push("c_cargo_olive", "c_kurti_maroon");
    expect(wardrobeFor(g, "bottom").map(i => i.id).sort()).toEqual(["c_cargo_olive", "c_jeans_blue"]);
    expect(wardrobeFor(g, "top").map(i => i.id)).not.toContain("c_leather_jacket");
  });
  it("sanitizeOutfit refuses unowned or wrong-slot items and falls back to her default clothes", async () => {
    const { sanitizeOutfit, newGameState, DEFAULT_OUTFIT } = await import("@kanpurverse/shared");
    const g = newGameState(); g.wardrobe.push("c_cargo_olive");
    expect(sanitizeOutfit(g, { top: "c_leather_jacket", bottom: "c_cargo_olive", shoes: "c_kurti_teal" })).toEqual({ ...DEFAULT_OUTFIT, bottom: "c_cargo_olive" });
    expect(sanitizeOutfit(g, {})).toEqual(DEFAULT_OUTFIT);
  });
});
