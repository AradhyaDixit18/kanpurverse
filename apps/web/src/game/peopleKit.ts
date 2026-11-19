/**
 * What makes one person on the street differ from the next: height and build, clothing colours beyond the eight-colour
 * network palette, what they carry and wear on the face. Pure and deterministic (tests/peopleKit.test.ts): the same seed
 * is always the same person, at every level of detail. Kits are local dressing only and never go over the network.
 */
export type Bag = "none" | "backpack" | "jhola" | "thaila";
export type PersonRole = "pedestrian" | "shopkeeper" | "auto" | "cafe" | "police" | "guide" | "vendor";
export interface PersonKit {
  /** Vertical scale and shoulder/hip scale around 1. */
  height: number; build: number;
  top: number; bottom: number; shoes: number;
  bag: Bag; bagColor: number;
  glasses: boolean; moustache: boolean; beard: boolean; bindi: boolean;
  /** Dupatta colour for women in a kurti, or null. */
  dupatta: number | null;
  uniform: "police" | "khaki" | null;
}

/** Shirts and kurtas seen on a Kanpur street: whites, checks-blue, creams, with a few strong colours. */
export const SHIRTS = [0xf2efe6, 0xdfe7f1, 0x8fb4d9, 0xe9dcc3, 0x7a2f3a, 0x5d6b3c, 0xd9a441, 0x2f6f73, 0xb9bcc2, 0x394a6b, 0xd98e8e, 0x6b4a35] as const;
export const KURTIS = [0xc2185b, 0xe8742c, 0x1f9aa3, 0xf2c230, 0x3f8f4f, 0x6d3fa0, 0xc8102e, 0xf2a7b8, 0x2a4f9c, 0xf4ede0] as const;
export const TROUSERS = [0x1c1d22, 0x25324d, 0x55585e, 0xb7a57a, 0x4a3a2c, 0xe9e6dc, 0x3d4a3a] as const;
export const LEGGINGS = [0x1c1d22, 0xf4ede0, 0x7a2f3a, 0x25324d, 0x2f6f73, 0xd9a441] as const;
export const FOOTWEAR = [0x111111, 0x6b4a35, 0xe9e6dc, 0x3a3f4a] as const;
export const BAG_COLOURS = [0x24304a, 0x6b2f2f, 0x2f4a3a, 0x3a3a3a, 0xb58a4a, 0x8a3f6b] as const;
export const KHAKI = { shirt: 0xb5a276, trousers: 0xa3906a } as const;

const rnd = (seed: number, n: number) => { const s = Math.sin(seed * 127.1 + n * 311.7) * 43758.5453; return s - Math.floor(s); };
const pick = <T,>(list: readonly T[], r: number) => list[Math.min(list.length - 1, Math.floor(r * list.length))];

export function kitFor(seed: number, role: PersonRole, female: boolean): PersonKit {
  const r = (n: number) => rnd(seed, n);
  const uniform = role === "police" ? "police" : role === "auto" ? "khaki" : null;
  const bagRoll = r(7);
  const working = role !== "pedestrian";
  const bag: Bag = working ? "none" : bagRoll < 0.24 ? "backpack" : bagRoll < 0.4 ? "jhola" : bagRoll < 0.62 ? "thaila" : "none";
  return {
    height: (female ? 0.9 : 0.955) + r(1) * 0.11, build: 0.93 + r(2) * 0.17,
    top: uniform ? KHAKI.shirt : female ? pick(KURTIS, r(3)) : role === "shopkeeper" || role === "cafe" ? pick(SHIRTS, r(3) * 0.34) : pick(SHIRTS, r(3)),
    bottom: uniform ? KHAKI.trousers : female ? pick(LEGGINGS, r(4)) : pick(TROUSERS, r(4)),
    shoes: uniform === "police" ? 0x111111 : pick(FOOTWEAR, r(5)),
    bag, bagColor: pick(BAG_COLOURS, r(8)),
    glasses: r(9) < 0.2, moustache: !female && (uniform === "police" || r(10) < 0.46), beard: !female && uniform !== "police" && r(11) < 0.16, bindi: female && r(12) < 0.55,
    dupatta: female && r(13) < 0.62 ? pick(KURTIS, r(14)) : null,
    uniform,
  };
}
