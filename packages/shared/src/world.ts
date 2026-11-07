/**
 * KanpurVerse world definition — MVP district "Civil Lines & Moti Jheel".
 *
 * Geography note: the layout is INSPIRED by central Kanpur (Mall Road / Civil Lines grid, Moti Jheel lake and park,
 * Phool Bagh, a Z-Square-like mall block, a Naveen-Market-like bazaar, a Kanpur-Central-like station facade and a
 * Ganga-ghat edge to the north). Positions are hand-authored, not surveyed: OpenStreetMap data could not be fetched
 * in the build environment. Every landmark is a fictionalised tribute, labelled as such in-game.
 * Units: metres. X east, Z south (Three.js: +Z toward the camera default), Y up.
 */
export interface RoadSeg { a: [number, number]; b: [number, number]; w: number; name?: string }
export interface Landmark { id: string; name: string; nameHi: string; p: [number, number]; r: number; kind: "lake" | "park" | "mall" | "market" | "temple" | "station" | "ghat" | "cafe" | "viewpoint" | "garage" | "college"; blurb: string; blurbHi: string }
export interface Building { p: [number, number]; w: number; d: number; h: number; style: number; sign?: string; signHi?: string }

import { ANCHORS, GEO_WORLD_SIZE } from "./geo";
export const WORLD_SIZE = GEO_WORLD_SIZE;             // playable square, centred at origin (OSM extract)
export const RAIL_Z = 190;                           // hand-authored fallback district only (OSM rails replace this)

export const ROADS: RoadSeg[] = [
  // Mall Road (east–west spine) and parallel avenues
  { a: [-250, 0], b: [250, 0], w: 16, name: "Mall Road" },
  { a: [-250, -120], b: [250, -120], w: 12, name: "Canal Road" },
  { a: [-250, 120], b: [250, 120], w: 12, name: "Birhana Road" },
  { a: [-250, -230], b: [250, -230], w: 10, name: "Ghat Road" },
  { a: [-250, 230], b: [250, 230], w: 10, name: "Station Road" },
  // north–south cross streets
  { a: [-180, -250], b: [-180, 250], w: 12, name: "Nawabganj Marg" },
  { a: [-60, -250], b: [-60, 250], w: 14, name: "Civil Lines Road" },
  { a: [60, -250], b: [60, 250], w: 12, name: "Sarvodaya Nagar Marg" },
  { a: [180, -250], b: [180, 250], w: 12, name: "Rawatpur Marg" },
];

export const LANDMARKS: Landmark[] = [
  { id: "moti_jheel", name: "Moti Jheel", nameHi: "मोती झील", p: ANCHORS.moti_jheel.p, r: 70, kind: "lake",
    blurb: "A lake and gardens; the place for evening walks.", blurbHi: "झील और बाग़ — शाम की सैर की जगह।" },
  { id: "jheel_park", name: "Moti Jheel Park", nameHi: "मोती झील पार्क", p: ANCHORS.moti_jheel.p, r: 110, kind: "park",
    blurb: "Lawns, benches and a sunset viewpoint.", blurbHi: "लॉन, बेंच और सूर्यास्त का नज़ारा।" },
  { id: "sunset_point", name: "Sunset Point", nameHi: "सनसेट पॉइंट", p: [ANCHORS.moti_jheel.p[0] + 80, ANCHORS.moti_jheel.p[1] + 10], r: 6, kind: "viewpoint",
    blurb: "Best light in the city around 6 pm.", blurbHi: "शाम छह बजे शहर की सबसे अच्छी रोशनी।" },
  { id: "z_square", name: "Z Square Mall", nameHi: "ज़ेड स्क्वायर मॉल", p: ANCHORS.z_square.p, r: 40, kind: "mall",
    blurb: "Kanpur's mall on The Mall Road (OSM footprint; interior fictional).", blurbHi: "मॉल रोड का मॉल (OSM नक्शा; अंदर काल्पनिक)।" },
  { id: "naveen_market", name: "Naveen Market", nameHi: "नवीन मार्केट", p: ANCHORS.naveen_market.p, r: 45, kind: "market",
    blurb: "Street stalls, chai, and the best bargaining in town.", blurbHi: "ठेले, चाय और शहर का सबसे अच्छा मोलभाव।" },
  { id: "phool_bagh", name: "Phool Bagh", nameHi: "फूल बाग़", p: ANCHORS.phool_bagh.p, r: 60, kind: "park",
    blurb: "The old garden by the Mall.", blurbHi: "मॉल के पास पुराना बाग़।" },
  { id: "jk_temple", name: "JK Temple", nameHi: "जे.के. मंदिर", p: ANCHORS.jk_temple.p, r: 30, kind: "temple",
    blurb: "A white-marble landmark, fictionalised.", blurbHi: "सफ़ेद संगमरमर का स्थल, काल्पनिक रूप।" },
  { id: "central", name: "Kanpur Central", nameHi: "कानपुर सेंट्रल", p: ANCHORS.kanpur_central.p, r: 80, kind: "station",
    blurb: "The station facade; trains are decorative in this build.", blurbHi: "स्टेशन का मुख; इस बिल्ड में ट्रेनें सजावटी हैं।" },
  { id: "ganga_ghat", name: "Parmat Ghat", nameHi: "परमट घाट", p: [ANCHORS.anandeshwar.p[0], ANCHORS.anandeshwar.p[1] - 60], r: 120, kind: "ghat",
    blurb: "The Ganga bank below Baba Anandeshwar Temple (OSM temple position; ghat steps stylised).", blurbHi: "बाबा आनंदेश्वर मंदिर के नीचे गंगा किनारा (मंदिर OSM से; घाट शैलीकृत)।" },
  { id: "cafe_mall", name: "Cafe Chowk", nameHi: "कैफ़े चौक", p: [ANCHORS.mall_road_spawn.p[0] - 20, ANCHORS.mall_road_spawn.p[1] + 14], r: 10, kind: "cafe",
    blurb: "Sit, order chai, talk.", blurbHi: "बैठो, चाय मंगाओ, बातें करो।" },
  { id: "garage", name: "Chauraha Garage", nameHi: "चौराहा गैराज", p: [ANCHORS.bada_chauraha.p[0] + 60, ANCHORS.bada_chauraha.p[1] + 40], r: 16, kind: "garage",
    blurb: "Pick and customise a vehicle.", blurbHi: "गाड़ी चुनो और सजाओ।" },
  { id: "green_park", name: "Green Park Stadium", nameHi: "ग्रीन पार्क स्टेडियम", p: ANCHORS.green_park.p, r: 90, kind: "college",
    blurb: "Kanpur's international cricket ground (OSM footprint; stands stylised).", blurbHi: "कानपुर का अंतरराष्ट्रीय क्रिकेट मैदान (OSM; स्टैंड शैलीकृत)।" },
  { id: "christ_church", name: "Christ Church", nameHi: "क्राइस्ट चर्च", p: ANCHORS.christ_church.p, r: 20, kind: "temple",
    blurb: "Civil Lines church from the OSM building layer.", blurbHi: "सिविल लाइंस का चर्च (OSM इमारत)।" },
  { id: "nana_rao", name: "Nana Rao Park", nameHi: "नाना राव पार्क", p: ANCHORS.nana_rao_park.p, r: 70, kind: "park",
    blurb: "The old Company Bagh on The Mall.", blurbHi: "मॉल रोड का पुराना कंपनी बाग़।" },
];

/** Deterministic procedural buildings in the blocks between roads. */
export function generateBuildings(seed = 7): Building[] {
  let s = seed;
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const out: Building[] = [];
  const xs = [-250, -180, -60, 60, 180, 250];
  const zs = [-230, -120, 0, 120, 230];
  const signs: [string, string][] = [["Sharma Sweets", "शर्मा स्वीट्स"], ["Mobile Point", "मोबाइल पॉइंट"], ["Chai Adda", "चाय अड्डा"],
    ["Gupta Cloth House", "गुप्ता क्लॉथ हाउस"], ["Kanpur Book Depot", "कानपुर बुक डिपो"], ["Thaggu ke Laddu", "ठग्गू के लड्डू"],
    ["Royal Tailors", "रॉयल टेलर्स"], ["Cyber Cafe", "साइबर कैफ़े"], ["Verma Medical", "वर्मा मेडिकल"], ["Lucky Bakery", "लकी बेकरी"]];
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
    const x0 = xs[i] + 12, x1 = xs[i + 1] - 12, z0 = zs[j] + 10, z1 = zs[j + 1] - 10;
    // keep landmark areas clear
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (LANDMARKS.some(l => l.kind !== "cafe" && l.kind !== "viewpoint" && Math.hypot(l.p[0] - cx, l.p[1] - cz) < l.r + 30)) continue;
    const n = 14 + Math.floor(rnd() * 10);
    for (let k = 0; k < n; k++) {
      const w = 10 + rnd() * 14, d = 10 + rnd() * 12;
      const px = x0 + w / 2 + rnd() * Math.max(1, x1 - x0 - w), pz = z0 + d / 2 + rnd() * Math.max(1, z1 - z0 - d);
      if (Math.abs(pz - RAIL_Z) < d / 2 + 7) continue; // railway corridor
      if (clearZones().some(z => Math.hypot(z.x - px, z.z - pz) < z.r + Math.max(w, d) / 2)) continue; // spawn, NPCs, vehicles, missions, cafe
      if (out.some(b => Math.abs(b.p[0] - px) < (b.w + w) / 2 + 1.2 && Math.abs(b.p[1] - pz) < (b.d + d) / 2 + 1.2)) continue;
      const h = 6 + Math.floor(rnd() * 4) * 3.2 + (rnd() < 0.15 ? 12 : 0);
      const sg = rnd() < 0.55 ? signs[Math.floor(rnd() * signs.length)] : undefined;
      out.push({ p: [px, pz], w, d, h, style: Math.floor(rnd() * 5), sign: sg?.[0], signHi: sg?.[1] });
    }
  }
  return out;
}

export interface NpcDef { id: string; name: string; nameHi: string; role: "pedestrian" | "shopkeeper" | "auto" | "cafe" | "police" | "guide"; voice: string; path: [number, number][]; speed: number; appearanceSeed: number }
export const NPCS: NpcDef[] = [
  { id: "guide_babloo", name: "Babloo Bhaiya", nameHi: "बबलू भैया", role: "guide", voice: "male_local", path: [[462, -336]], speed: 0, appearanceSeed: 1 },
  { id: "chai_munna", name: "Munna Chaiwala", nameHi: "मुन्ना चायवाला", role: "cafe", voice: "shopkeeper", path: [[452, -316]], speed: 0, appearanceSeed: 2 },
  { id: "auto_raju", name: "Raju Auto", nameHi: "राजू ऑटो", role: "auto", voice: "auto_driver", path: [[502, -320]], speed: 0, appearanceSeed: 3 },
  { id: "shop_gupta", name: "Gupta ji", nameHi: "गुप्ता जी", role: "shopkeeper", voice: "shopkeeper", path: [[-150, -440]], speed: 0, appearanceSeed: 4 },
  { id: "police_singh", name: "Singh Saheb", nameHi: "सिंह साहब", role: "police", voice: "police", path: [[532, -338]], speed: 0, appearanceSeed: 5 },
  { id: "ped_priya", name: "Priya", nameHi: "प्रिया", role: "pedestrian", voice: "female_young", path: [[-980, -830], [-1020, -840], [-1060, -810], [-1040, -770], [-1000, -780]], speed: 1.2, appearanceSeed: 6 },
  { id: "ped_aman", name: "Aman", nameHi: "अमन", role: "pedestrian", voice: "male_young", path: [[492, -360], [512, -390], [472, -400], [452, -370]], speed: 1.3, appearanceSeed: 7 },
  { id: "ped_sunita", name: "Sunita ji", nameHi: "सुनीता जी", role: "pedestrian", voice: "female_local", path: [[-130, -420], [-170, -415], [-180, -450], [-140, -455]], speed: 1.0, appearanceSeed: 8 },
  { id: "ped_vikas", name: "Vikas", nameHi: "विकास", role: "pedestrian", voice: "male_young", path: [[572, -310], [602, -290], [582, -250], [552, -270]], speed: 1.4, appearanceSeed: 9 },
  { id: "ped_rekha", name: "Rekha", nameHi: "रेखा", role: "pedestrian", voice: "female_young", path: [[400, 1760], [450, 1762], [450, 1780], [400, 1778]], speed: 1.1, appearanceSeed: 10 },
];

export interface VehicleSpawn { id: string; kind: "hatchback" | "sedan" | "suv" | "bike" | "scooter" | "auto"; p: [number, number]; ry: number; color: number }
export const VEHICLE_SPAWNS: VehicleSpawn[] = [
  { id: "v_auto_1", kind: "auto", p: [506, -320], ry: Math.PI / 2, color: 0x2e8b57 },
  { id: "v_hatch_1", kind: "hatchback", p: [438, -320], ry: Math.PI / 2, color: 0xc8102e },
  { id: "v_scooter_1", kind: "scooter", p: [446, -340], ry: -Math.PI / 2, color: 0x3d8bff },
  { id: "v_sedan_1", kind: "sedan", p: [590, -250], ry: 0, color: 0xe8e8e8 },
  { id: "v_suv_1", kind: "suv", p: [600, -262], ry: 0, color: 0x1c1d22 },
  { id: "v_bike_1", kind: "bike", p: [585, -268], ry: 0, color: 0xffd23f },
  { id: "v_auto_2", kind: "auto", p: [430, 1770], ry: Math.PI, color: 0xf2b134 },
  { id: "v_hatch_2", kind: "hatchback", p: [-140, -470], ry: Math.PI / 2, color: 0x4b7bec },
];

export const SPAWN_POINT: [number, number, number] = [472, 1, -330];   // The Mall Road beside Z Square (OSM)

export interface MissionDef { id: string; name: string; nameHi: string; kind: "tutorial" | "explore" | "delivery" | "race" | "photo" | "taxi" | "social"; giver?: string; start: [number, number]; checkpoints: [number, number][]; radius: number; timeLimitSec?: number; reward: { coins: number; xp: number }; needsVehicle?: boolean; coop?: boolean; desc: string; descHi: string }
export const MISSIONS: MissionDef[] = [
  { id: "tut_walk", name: "Pehla Kadam", nameHi: "पहला कदम", kind: "tutorial", giver: "guide_babloo", start: [462, -336], checkpoints: [[452, -316], [639, -168], [568, -384]], radius: 6, reward: { coins: 100, xp: 50 }, desc: "Learn to move: the chai stall, Christ Church, then Z Square.", descHi: "चलना सीखो: चाय की दुकान, क्राइस्ट चर्च, फिर ज़ेड स्क्वायर।" },
  { id: "jheel_walk", name: "Moti Jheel Chalo", nameHi: "मोती झील चलो", kind: "explore", giver: "guide_babloo", start: [462, -336], checkpoints: [[-900, -800], [-1046, -900], [-1130, -830], [-966, -825]], radius: 10, reward: { coins: 250, xp: 120 }, coop: true, desc: "Walk the lake loop and end at Sunset Point.", descHi: "झील का चक्कर लगाओ और सनसेट पॉइंट पर रुको।" },
  { id: "delivery_sweets", name: "Laddu Delivery", nameHi: "लड्डू डिलीवरी", kind: "delivery", giver: "shop_gupta", start: [-150, -440], checkpoints: [[-155, -453], [568, -384]], radius: 10, timeLimitSec: 200, reward: { coins: 400, xp: 200 }, needsVehicle: true, desc: "Take the sweets from Naveen Market to Z Square before they go cold.", descHi: "नवीन मार्केट से ज़ेड स्क्वायर तक मिठाई पहुँचाओ, ठंडी होने से पहले।" },
  { id: "race_mall", name: "Mall Road Dash", nameHi: "मॉल रोड डैश", kind: "race", giver: "auto_raju", start: [502, -320], checkpoints: [[538, -299], [1351, -206], [1367, 307], [639, -168], [472, -330]], radius: 12, timeLimitSec: 300, reward: { coins: 600, xp: 300 }, needsVehicle: true, coop: true, desc: "Bada Chauraha → Nana Rao Park → Phool Bagh → Christ Church → back to Z Square. Fastest wins.", descHi: "बड़ा चौराहा → नाना राव पार्क → फूल बाग़ → क्राइस्ट चर्च → वापस ज़ेड स्क्वायर। सबसे तेज़ जीतेगा।" },
  { id: "photo_city", name: "Shehar ki Tasveer", nameHi: "शहर की तस्वीर", kind: "photo", giver: "ped_priya", start: [-980, -830], checkpoints: [[-1046, -835], [639, -168], [423, 1797]], radius: 25, reward: { coins: 350, xp: 180 }, coop: true, desc: "Photograph Moti Jheel, Christ Church and Kanpur Central (press E at each).", descHi: "मोती झील, क्राइस्ट चर्च और कानपुर सेंट्रल की फ़ोटो लो (हर जगह E दबाओ)।" },
  { id: "taxi_station", name: "Station Drop", nameHi: "स्टेशन ड्रॉप", kind: "taxi", giver: "auto_raju", start: [502, -320], checkpoints: [[452, -316], [423, 1790]], radius: 12, timeLimitSec: 240, reward: { coins: 300, xp: 150 }, needsVehicle: true, desc: "Pick up a passenger at Cafe Chowk and drop them at Kanpur Central.", descHi: "कैफ़े चौक से सवारी लो और कानपुर सेंट्रल छोड़ो।" },
  { id: "cafe_date", name: "Chai pe Charcha", nameHi: "चाय पे चर्चा", kind: "social", giver: "chai_munna", start: [452, -316], checkpoints: [[452, -316]], radius: 6, reward: { coins: 150, xp: 100 }, coop: true, desc: "Sit at the cafe with a friend for 60 seconds.", descHi: "कैफ़े में किसी दोस्त के साथ 60 सेकंड बैठो।" },
];

/** Areas that must stay free of generated buildings (gameplay spots). */
let _clear: { x: number; z: number; r: number }[] | null = null;
export function clearZones() {
  if (_clear) return _clear;
  const out: { x: number; z: number; r: number }[] = [{ x: SPAWN_POINT[0], z: SPAWN_POINT[2], r: 10 }];
  for (const n of NPCS) for (const p of n.path) out.push({ x: p[0], z: p[1], r: 5 });
  for (const v of VEHICLE_SPAWNS) out.push({ x: v.p[0], z: v.p[1], r: 6 });
  for (const m of MISSIONS) { out.push({ x: m.start[0], z: m.start[1], r: 6 }); for (const c of m.checkpoints) out.push({ x: c[0], z: c[1], r: m.radius + 3 }); }
  for (const l of LANDMARKS) if (l.kind === "cafe" || l.kind === "viewpoint" || l.kind === "garage") out.push({ x: l.p[0], z: l.p[1], r: l.r + 8 });
  return (_clear = out);
}
