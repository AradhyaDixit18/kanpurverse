export * from "./protocol";
export * from "./streetLife";
export * from "./world";
export * from "./dialogue";
export * from "./moderation";
export * from "./geo";
export * from "./story";

export const XP_PER_LEVEL = (level: number) => 200 + level * 150;
export function levelFromXp(xp: number): number { let l = 1, need = XP_PER_LEVEL(1); while (xp >= need) { xp -= need; l++; need = XP_PER_LEVEL(l); } return l; }

export const SHOP_ITEMS: { id: string; name: string; nameHi: string; price: number; slot: "top" | "accessory" | "vehicle_color" | "emote"; value: number }[] = [
  { id: "top_kurta", name: "Kanpuriya Kurta", nameHi: "कानपुरिया कुर्ता", price: 300, slot: "top", value: 5 },
  { id: "top_jersey", name: "Cricket Jersey", nameHi: "क्रिकेट जर्सी", price: 450, slot: "top", value: 6 },
  { id: "top_jacket", name: "Leather Jacket", nameHi: "लेदर जैकेट", price: 900, slot: "top", value: 7 },
  { id: "acc_shades", name: "Shades", nameHi: "काला चश्मा", price: 200, slot: "accessory", value: 1 },
  { id: "acc_cap", name: "Cap", nameHi: "टोपी", price: 150, slot: "accessory", value: 2 },
  { id: "acc_gamcha", name: "Gamcha", nameHi: "गमछा", price: 120, slot: "accessory", value: 3 },
  { id: "emote_dance", name: "Dance emote", nameHi: "डांस इमोट", price: 500, slot: "emote", value: 0 },
];

export * from "./vehicles";
export * from "./economy";
export * from "./shops";
