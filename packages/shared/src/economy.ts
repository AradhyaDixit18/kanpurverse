/**
 * Kanpur Chronicles economy: one catalogue for every purchasable thing, and pure, atomic transactions.
 * A transaction either returns a complete new state or a reason it failed; the input is never mutated, so a failed
 * purchase can never change money or inventory. All weapons are fictional game items (no real models, no real-world
 * specifications); "knocked out" is the strongest outcome in combat.
 */
import type { VehicleKind } from "./protocol";

export type ItemKind = "weapon" | "ammo" | "clothing" | "medical" | "food" | "mission";
export type WeaponClass = "melee" | "nonlethal" | "ranged";
export interface WeaponDef { cls: WeaponClass; damage: number; range: number; cooldown: number; clip?: number; ammo?: string; stun?: number }
export interface ClothingDef { slot: "top" | "bottom" | "shoes" | "acc"; color: number; cut?: "kurti" | "tee" | "shirt" | "jacket" | "jeans" | "palazzo" | "cargo" | "sneakers" | "juttis" | "boots" | "shades" | "cap" | "dupatta" }
export interface Item {
  id: string; kind: ItemKind; nameHi: string; name: string; descHi: string; desc: string; price: number;
  shop?: ShopType; max?: number; weapon?: WeaponDef; clothing?: ClothingDef; heal?: number; stamina?: number; packOf?: number;
}
export type ShopType = "weapons" | "clothing" | "medical" | "food" | "garage" | "hospital" | "dealership";

export const ITEMS: Item[] = [
  // ── weapons (fictional) ──
  { id: "w_lathi", kind: "weapon", shop: "weapons", nameHi: "बाँस की लाठी", name: "Bamboo lathi", descHi: "भरोसेमंद, लंबी पहुँच। एक वार से गुंडा पीछे हटता है।", desc: "Reliable reach; pushes a goon back.", price: 300, weapon: { cls: "melee", damage: 20, range: 2.1, cooldown: 0.75 } },
  { id: "w_bat", kind: "weapon", shop: "weapons", nameHi: "क्रिकेट बैट", name: "Cricket bat", descHi: "ग्रीन पार्क वाला शॉट, सड़क पे।", desc: "A Green Park cover drive, on the street.", price: 650, weapon: { cls: "melee", damage: 28, range: 1.8, cooldown: 0.9 } },
  { id: "w_spray", kind: "weapon", shop: "weapons", nameHi: "मिर्च स्प्रे", name: "Pepper spray", descHi: "बिना चोट के रोको: सामने वाला कुछ सेकंड कुछ नहीं कर पाता।", desc: "Non-lethal: stuns for a few seconds.", price: 450, weapon: { cls: "nonlethal", damage: 0, range: 3.5, cooldown: 1.2, clip: 5, ammo: "a_spray", stun: 4 } },
  { id: "w_baton", kind: "weapon", shop: "weapons", nameHi: "स्टन बैटन", name: "Stun baton", descHi: "पास से झटका, बेहोश करने लायक।", desc: "Close-range shock; knocks out quickly.", price: 1100, weapon: { cls: "nonlethal", damage: 34, range: 1.6, cooldown: 1.0, stun: 2 } },
  { id: "w_pellet", kind: "weapon", shop: "weapons", nameHi: "वेल्टो P1 पेलेट पिस्टल", name: "Velto P1 pellet pistol", descHi: "काल्पनिक खेल-हथियार। रेंज बढ़िया, गोलियाँ अलग से।", desc: "Fictional game sidearm. Good range; pellets sold separately.", price: 2500, weapon: { cls: "ranged", damage: 18, range: 40, cooldown: 0.35, clip: 8, ammo: "a_pellet" } },
  // ── ammunition ──
  { id: "a_spray", kind: "ammo", shop: "weapons", nameHi: "स्प्रे रीफ़िल (5)", name: "Spray refill (5)", descHi: "मिर्च स्प्रे के 5 छिड़काव।", desc: "Five bursts for the pepper spray.", price: 120, packOf: 5, max: 40 },
  { id: "a_pellet", kind: "ammo", shop: "weapons", nameHi: "पेलेट (16)", name: "Pellets (16)", descHi: "P1 के लिए 16 पेलेट।", desc: "Sixteen pellets for the P1.", price: 160, packOf: 16, max: 160 },
  // ── clothing (Kanupriya) ──
  { id: "c_kurti_teal", kind: "clothing", shop: "clothing", nameHi: "टील कुर्ती", name: "Teal kurti", descHi: "टॉमी की पहचान।", desc: "Tommy's signature.", price: 0, clothing: { slot: "top", color: 0x1f6f78, cut: "kurti" } },
  { id: "c_kurti_maroon", kind: "clothing", shop: "clothing", nameHi: "मैरून कुर्ती", name: "Maroon kurti", descHi: "शाम के मेले के लिए।", desc: "For a mela evening.", price: 700, clothing: { slot: "top", color: 0x7a1f2b, cut: "kurti" } },
  { id: "c_kurti_mustard", kind: "clothing", shop: "clothing", nameHi: "सरसों पीली कुर्ती", name: "Mustard kurti", descHi: "धूप जैसा रंग।", desc: "Sunshine yellow.", price: 650, clothing: { slot: "top", color: 0xd29a1e, cut: "kurti" } },
  { id: "c_tee_white", kind: "clothing", shop: "clothing", nameHi: "सफ़ेद टी-शर्ट", name: "White tee", descHi: "सिंपल और ठंडी।", desc: "Simple and cool.", price: 350, clothing: { slot: "top", color: 0xf1efe9, cut: "tee" } },
  { id: "c_denim_jacket", kind: "clothing", shop: "clothing", nameHi: "डेनिम जैकेट", name: "Denim jacket", descHi: "पत्रकार वाला लुक, जेबें ही जेबें।", desc: "Journalist look, pockets everywhere.", price: 1400, clothing: { slot: "top", color: 0x3e5f8a, cut: "jacket" } },
  { id: "c_leather_jacket", kind: "clothing", shop: "clothing", nameHi: "लेदर जैकेट", name: "Leather jacket", descHi: "बाइक वालों की पसंद।", desc: "Rider's favourite.", price: 2200, clothing: { slot: "top", color: 0x2a2220, cut: "jacket" } },
  { id: "c_jeans_blue", kind: "clothing", shop: "clothing", nameHi: "नीली जींस", name: "Blue jeans", descHi: "रोज़ वाली।", desc: "Everyday.", price: 0, clothing: { slot: "bottom", color: 0x2b4f7e, cut: "jeans" } },
  { id: "c_jeans_black", kind: "clothing", shop: "clothing", nameHi: "काली जींस", name: "Black jeans", descHi: "रात की शूटिंग के लिए।", desc: "For night shoots.", price: 800, clothing: { slot: "bottom", color: 0x1b1c20, cut: "jeans" } },
  { id: "c_palazzo_beige", kind: "clothing", shop: "clothing", nameHi: "बेज पलाज़ो", name: "Beige palazzo", descHi: "गर्मी में आराम।", desc: "Summer comfort.", price: 600, clothing: { slot: "bottom", color: 0xcdb48a, cut: "palazzo" } },
  { id: "c_cargo_olive", kind: "clothing", shop: "clothing", nameHi: "ऑलिव कार्गो", name: "Olive cargo", descHi: "फ़ील्ड रिपोर्टिंग के लिए।", desc: "For field reporting.", price: 900, clothing: { slot: "bottom", color: 0x56603a, cut: "cargo" } },
  { id: "c_sneakers_white", kind: "clothing", shop: "clothing", nameHi: "सफ़ेद स्नीकर्स", name: "White sneakers", descHi: "भागने में तेज़।", desc: "Quick on the run.", price: 0, clothing: { slot: "shoes", color: 0xf2f0ea, cut: "sneakers" } },
  { id: "c_juttis_gold", kind: "clothing", shop: "clothing", nameHi: "सुनहरी जूतियाँ", name: "Golden juttis", descHi: "मेले की शान।", desc: "Pride of the mela.", price: 750, clothing: { slot: "shoes", color: 0xc9a13b, cut: "juttis" } },
  { id: "c_boots_brown", kind: "clothing", shop: "clothing", nameHi: "भूरे बूट", name: "Brown boots", descHi: "घाट की सीढ़ियों पे पक्की पकड़।", desc: "Sure grip on ghat steps.", price: 1600, clothing: { slot: "shoes", color: 0x5a3a22, cut: "boots" } },
  { id: "c_shades", kind: "clothing", shop: "clothing", nameHi: "काला चश्मा", name: "Shades", descHi: "धूप और भौकाल दोनों।", desc: "For sun and swagger.", price: 400, clothing: { slot: "acc", color: 0x0b0b0b, cut: "shades" } },
  { id: "c_cap_red", kind: "clothing", shop: "clothing", nameHi: "लाल टोपी", name: "Red cap", descHi: "कैमरा वाली टोपी।", desc: "Camera-crew cap.", price: 300, clothing: { slot: "acc", color: 0xb3122e, cut: "cap" } },
  // ── medical & food ──
  { id: "m_firstaid", kind: "medical", shop: "medical", nameHi: "फ़र्स्ट-एड किट", name: "First-aid kit", descHi: "+40 सेहत। H दबाकर नहीं, इन्वेंटरी (I) से इस्तेमाल करो।", desc: "+40 health. Use from the inventory (I).", price: 220, heal: 40, max: 5 },
  { id: "m_bandage", kind: "medical", shop: "medical", nameHi: "पट्टी", name: "Bandage", descHi: "+15 सेहत।", desc: "+15 health.", price: 70, heal: 15, max: 10 },
  { id: "f_chai", kind: "food", shop: "food", nameHi: "कुल्हड़ चाय", name: "Kulhad chai", descHi: "थकान दूर: पूरा स्टैमिना।", desc: "Restores full stamina.", price: 20, stamina: 100, max: 6 },
  { id: "f_samosa", kind: "food", shop: "food", nameHi: "समोसा", name: "Samosa", descHi: "+10 सेहत, +30 स्टैमिना।", desc: "+10 health, +30 stamina.", price: 25, heal: 10, stamina: 30, max: 6 },
];
export const item = (id: string) => ITEMS.find(i => i.id === id);

/** Dealership prices (₹ in-game coins). Every kind is purchasable; parked city vehicles stay free to borrow. */
export const VEHICLE_PRICES: Partial<Record<VehicleKind, number>> = {
  scooter: 3500, bike: 4500, cruiser: 9000, sportbike: 12000, hatchback: 15000, sedan: 19000, compactsuv: 24000, offroader: 28000, muv: 30000, suv: 34000,
  auto: 8000, erickshaw: 6000, van: 16000,
};

export interface Outfit { top: string; bottom: string; shoes: string; acc?: string }
export const DEFAULT_OUTFIT: Outfit = { top: "c_kurti_teal", bottom: "c_jeans_blue", shoes: "c_sneakers_white" };

export interface GameState {
  stamina: number;
  items: Record<string, number>;
  weapons: string[];
  equipped?: string;
  clip: Record<string, number>;
  wardrobe: string[];
  outfit: Outfit;
  boughtVehicles: VehicleKind[];
  vehicleHealth: Record<string, { engine: number; body: number }>;
  stats: { knockouts: number; deaths: number; driftBest: number; earned: number; spent: number };
}
export const newGameState = (): GameState => ({
  stamina: 100, items: {}, weapons: [], clip: {}, wardrobe: ["c_kurti_teal", "c_jeans_blue", "c_sneakers_white"], outfit: { ...DEFAULT_OUTFIT },
  boughtVehicles: [], vehicleHealth: {}, stats: { knockouts: 0, deaths: 0, driftBest: 0, earned: 0, spent: 0 },
});

export interface Wallet { coins: number; game: GameState }
export type TxResult = { ok: true; wallet: Wallet; message: [string, string] } | { ok: false; reason: "unknown" | "funds" | "owned" | "full" | "needs-weapon"; message: [string, string] };
const clone = (w: Wallet): Wallet => ({ coins: w.coins, game: structuredClone(w.game) });
const fail = (reason: Exclude<TxResult, { ok: true }>["reason"], hi: string, en: string): TxResult => ({ ok: false, reason, message: [hi, en] });

/** Buy one catalogue item. Atomic: on any failure the original wallet is returned untouched. */
export function purchase(w: Wallet, id: string): TxResult {
  const it = item(id); if (!it) return fail("unknown", "ये सामान नहीं मिला।", "Item not found.");
  if (it.kind === "weapon" && w.game.weapons.includes(id)) return fail("owned", "ये तो पहले से आपके पास है।", "You already own this.");
  if (it.kind === "clothing" && w.game.wardrobe.includes(id)) return fail("owned", "ये कपड़ा पहले से अलमारी में है।", "Already in your wardrobe.");
  if (it.kind === "ammo" && !ITEMS.some(x => x.weapon?.ammo === id && w.game.weapons.includes(x.id))) return fail("needs-weapon", "पहिले हथियार लीजिए, फिर गोली-बारूद।", "Buy the matching weapon first.");
  const have = w.game.items[id] ?? 0, add = it.packOf ?? 1;
  if (it.max !== undefined && (it.kind === "ammo" || it.kind === "medical" || it.kind === "food") && have + add > it.max) return fail("full", "झोला भर गया, और नहीं आएगा।", "Inventory full for this item.");
  if (w.coins < it.price) return fail("funds", `पैसे कम पड़ रहे हैं: ₹${it.price - w.coins} और चाहिए। पहिले कोई मिशन पूरा कर लीजिए।`, `Not enough money: ₹${it.price - w.coins} short.`);
  const n = clone(w); n.coins -= it.price; n.game.stats.spent += it.price;
  if (it.kind === "weapon") { n.game.weapons.push(id); if (it.weapon?.clip) n.game.clip[id] = it.weapon.clip; }
  else if (it.kind === "clothing") n.game.wardrobe.push(id);
  else n.game.items[id] = have + add;
  return { ok: true, wallet: n, message: [`खरीद लिया: ${it.nameHi} (−₹${it.price})`, `Bought: ${it.name} (−₹${it.price})`] };
}
export function equipOutfit(w: Wallet, id: string): TxResult {
  const it = item(id); if (!it?.clothing) return fail("unknown", "ये कपड़ा नहीं है।", "Not clothing.");
  if (!w.game.wardrobe.includes(id)) return fail("funds", "पहिले खरीदिए, फिर पहनिए।", "Buy it first.");
  const n = clone(w); if (it.clothing.slot === "acc") n.game.outfit.acc = n.game.outfit.acc === id ? undefined : id; else n.game.outfit[it.clothing.slot] = id;
  return { ok: true, wallet: n, message: [`पहन लिया: ${it.nameHi}`, `Wearing: ${it.name}`] };
}
/** Clothes Kanupriya owns for one slot (the only ones any outfit picker may offer). */
export function wardrobeFor(game: Pick<GameState, "wardrobe">, slot: ClothingDef["slot"]): Item[] { return ITEMS.filter(i => i.clothing?.slot === slot && game.wardrobe.includes(i.id)); }
/** An outfit containing only owned items in their correct slots; anything else falls back to her default clothes. */
export function sanitizeOutfit(game: Pick<GameState, "wardrobe">, o: Partial<Outfit>): Outfit {
  const ok = (id: string | undefined, slot: ClothingDef["slot"]) => !!id && game.wardrobe.includes(id) && item(id)?.clothing?.slot === slot;
  const out: Outfit = { top: ok(o.top, "top") ? o.top! : DEFAULT_OUTFIT.top, bottom: ok(o.bottom, "bottom") ? o.bottom! : DEFAULT_OUTFIT.bottom, shoes: ok(o.shoes, "shoes") ? o.shoes! : DEFAULT_OUTFIT.shoes };
  if (ok(o.acc, "acc")) out.acc = o.acc; return out;
}
/** Use a consumable. Returns the new wallet plus health/stamina deltas for the caller to apply. */
export function consumeItem(w: Wallet, id: string, health: number): TxResult & { health?: number } {
  const it = item(id); if (!it || !(w.game.items[id] > 0) || (it.kind !== "medical" && it.kind !== "food")) return fail("unknown", "ये चीज़ आपके पास नहीं है।", "You don't have that.");
  const n = clone(w); n.game.items[id]--; if (!n.game.items[id]) delete n.game.items[id];
  n.game.stamina = Math.min(100, n.game.stamina + (it.stamina ?? 0));
  return { ok: true, wallet: n, health: Math.min(100, health + (it.heal ?? 0)), message: [`${it.nameHi} इस्तेमाल किया`, `Used ${it.name}`] };
}
export function buyVehicle(w: Wallet, kind: VehicleKind): TxResult {
  const price = VEHICLE_PRICES[kind]; if (price === undefined) return fail("unknown", "ये गाड़ी बिक्री के लिए नहीं है।", "Not for sale.");
  if (w.game.boughtVehicles.includes(kind)) return fail("owned", "ये गाड़ी आपकी हो चुकी है, गैराज से निकालिए।", "Already yours.");
  if (w.coins < price) return fail("funds", `पैसे कम हैं: ₹${price - w.coins} और चाहिए।`, `₹${price - w.coins} short.`);
  const n = clone(w); n.coins -= price; n.game.stats.spent += price; n.game.boughtVehicles.push(kind);
  return { ok: true, wallet: n, message: [`गाड़ी खरीदी! अब ये आपकी है।`, `Vehicle purchased.`] };
}
export const repairCost = (c: { engine: number; body: number }) => Math.round((200 - c.engine - c.body) * 6);
export function repairVehicle(w: Wallet, id: string): TxResult {
  const c = w.game.vehicleHealth[id] ?? { engine: 100, body: 100 }; const cost = repairCost(c);
  if (cost <= 0) return fail("owned", "गाड़ी तो चकाचक है, कुछ ठीक करने को नहीं।", "Nothing to repair.");
  if (w.coins < cost) return fail("funds", `मरम्मत ₹${cost} की है, पैसे कम हैं।`, `Repair costs ₹${cost}.`);
  const n = clone(w); n.coins -= cost; n.game.stats.spent += cost; n.game.vehicleHealth[id] = { engine: 100, body: 100 };
  return { ok: true, wallet: n, message: [`मरम्मत हो गई (−₹${cost})`, `Repaired (−₹${cost})`] };
}
export const HOSPITAL_FEE = 150;
export function hospitalTreat(w: Wallet, health: number): TxResult & { health?: number } {
  if (health >= 100) return fail("owned", "आप तो एकदम ठीक हैं।", "You're already healthy.");
  if (w.coins < HOSPITAL_FEE) return fail("funds", `इलाज ₹${HOSPITAL_FEE} का है।`, `Treatment costs ₹${HOSPITAL_FEE}.`);
  const n = clone(w); n.coins -= HOSPITAL_FEE; n.game.stats.spent += HOSPITAL_FEE; n.game.stamina = 100;
  return { ok: true, wallet: n, health: 100, message: ["इलाज हो गया, पूरी सेहत वापस।", "Treated: full health."] };
}
/** Respawn after being knocked out: hospital bill is 10% of cash, at most ₹500; no item loss. */
export function knockoutBill(coins: number) { return Math.min(500, Math.floor(coins * 0.1)); }
