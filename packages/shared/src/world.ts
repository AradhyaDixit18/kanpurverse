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

export const WORLD_SIZE = 520;                       // playable square, centred at origin
export const RAIL_Z = 190;                           // east–west railway line (level crossings at every N–S road)

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
  { id: "moti_jheel", name: "Moti Jheel", nameHi: "मोती झील", p: [-120, -60], r: 48, kind: "lake",
    blurb: "A lake and gardens; the place for evening walks.", blurbHi: "झील और बाग़ — शाम की सैर की जगह।" },
  { id: "jheel_park", name: "Moti Jheel Park", nameHi: "मोती झील पार्क", p: [-120, -60], r: 70, kind: "park",
    blurb: "Lawns, benches and a sunset viewpoint.", blurbHi: "लॉन, बेंच और सूर्यास्त का नज़ारा।" },
  { id: "sunset_point", name: "Sunset Point", nameHi: "सनसेट पॉइंट", p: [-62, -92], r: 6, kind: "viewpoint",
    blurb: "Best light in the city around 6 pm.", blurbHi: "शाम छह बजे शहर की सबसे अच्छी रोशनी।" },
  { id: "z_square", name: "V Square Mall", nameHi: "वी स्क्वायर मॉल", p: [120, 60], r: 36, kind: "mall",
    blurb: "Inspired by the mall on Mall Road. Fictional tribute.", blurbHi: "मॉल रोड के मॉल से प्रेरित। काल्पनिक।" },
  { id: "naveen_market", name: "Naveen Market", nameHi: "नवीन मार्केट", p: [-120, 60], r: 40, kind: "market",
    blurb: "Street stalls, chai, and the best bargaining in town.", blurbHi: "ठेले, चाय और शहर का सबसे अच्छा मोलभाव।" },
  { id: "phool_bagh", name: "Phool Bagh", nameHi: "फूल बाग़", p: [0, -60], r: 34, kind: "park",
    blurb: "The old garden by the Mall.", blurbHi: "मॉल के पास पुराना बाग़।" },
  { id: "jk_temple", name: "JK Temple", nameHi: "जे.के. मंदिर", p: [200, -170], r: 24, kind: "temple",
    blurb: "A white-marble landmark, fictionalised.", blurbHi: "सफ़ेद संगमरमर का स्थल, काल्पनिक रूप।" },
  { id: "central", name: "Kanpur Central", nameHi: "कानपुर सेंट्रल", p: [0, 250], r: 60, kind: "station",
    blurb: "The station facade; trains are decorative in this build.", blurbHi: "स्टेशन का मुख; इस बिल्ड में ट्रेनें सजावटी हैं।" },
  { id: "ganga_ghat", name: "Ganga Ghat", nameHi: "गंगा घाट", p: [0, -255], r: 200, kind: "ghat",
    blurb: "The riverfront. Fictional tribute to Bithoor's ghats.", blurbHi: "नदी किनारा। बिठूर के घाटों को काल्पनिक श्रद्धांजलि।" },
  { id: "cafe_mall", name: "Cafe Chowk", nameHi: "कैफ़े चौक", p: [-30, 24], r: 10, kind: "cafe",
    blurb: "Sit, order chai, talk.", blurbHi: "बैठो, चाय मंगाओ, बातें करो।" },
  { id: "garage", name: "Rawatpur Garage", nameHi: "रावतपुर गैराज", p: [210, 100], r: 16, kind: "garage",
    blurb: "Pick and customise a vehicle.", blurbHi: "गाड़ी चुनो और सजाओ।" },
  { id: "iit", name: "IIT Gate", nameHi: "आईआईटी गेट", p: [-230, -230], r: 20, kind: "college",
    blurb: "Fictional tribute to the campus gate.", blurbHi: "कैंपस गेट को काल्पनिक श्रद्धांजलि।" },
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
  { id: "guide_babloo", name: "Babloo Bhaiya", nameHi: "बबलू भैया", role: "guide", voice: "male_local", path: [[-20, 10]], speed: 0, appearanceSeed: 1 },
  { id: "chai_munna", name: "Munna Chaiwala", nameHi: "मुन्ना चायवाला", role: "cafe", voice: "shopkeeper", path: [[-30, 20]], speed: 0, appearanceSeed: 2 },
  { id: "auto_raju", name: "Raju Auto", nameHi: "राजू ऑटो", role: "auto", voice: "auto_driver", path: [[40, 12]], speed: 0, appearanceSeed: 3 },
  { id: "shop_gupta", name: "Gupta ji", nameHi: "गुप्ता जी", role: "shopkeeper", voice: "shopkeeper", path: [[-125, 40]], speed: 0, appearanceSeed: 4 },
  { id: "police_singh", name: "Singh Saheb", nameHi: "सिंह साहब", role: "police", voice: "police", path: [[70, -10]], speed: 0, appearanceSeed: 5 },
  { id: "ped_priya", name: "Priya", nameHi: "प्रिया", role: "pedestrian", voice: "female_young", path: [[-60, -100], [-100, -110], [-140, -80], [-120, -40], [-80, -50]], speed: 1.2, appearanceSeed: 6 },
  { id: "ped_aman", name: "Aman", nameHi: "अमन", role: "pedestrian", voice: "male_young", path: [[20, -30], [40, -70], [0, -80], [-20, -40]], speed: 1.3, appearanceSeed: 7 },
  { id: "ped_sunita", name: "Sunita ji", nameHi: "सुनीता जी", role: "pedestrian", voice: "female_local", path: [[-100, 70], [-140, 75], [-150, 40], [-110, 35]], speed: 1.0, appearanceSeed: 8 },
  { id: "ped_vikas", name: "Vikas", nameHi: "विकास", role: "pedestrian", voice: "male_young", path: [[120, 20], [150, 40], [130, 90], [100, 70]], speed: 1.4, appearanceSeed: 9 },
  { id: "ped_rekha", name: "Rekha", nameHi: "रेखा", role: "pedestrian", voice: "female_young", path: [[-20, 110], [30, 112], [30, 130], [-20, 128]], speed: 1.1, appearanceSeed: 10 },
];

export interface VehicleSpawn { id: string; kind: "hatchback" | "sedan" | "suv" | "bike" | "scooter" | "auto"; p: [number, number]; ry: number; color: number }
export const VEHICLE_SPAWNS: VehicleSpawn[] = [
  { id: "v_auto_1", kind: "auto", p: [44, 10], ry: Math.PI / 2, color: 0x2e8b57 },
  { id: "v_hatch_1", kind: "hatchback", p: [-40, 12], ry: Math.PI / 2, color: 0xc8102e },
  { id: "v_scooter_1", kind: "scooter", p: [-34, -12], ry: -Math.PI / 2, color: 0x3d8bff },
  { id: "v_sedan_1", kind: "sedan", p: [205, 92], ry: 0, color: 0xe8e8e8 },
  { id: "v_suv_1", kind: "suv", p: [215, 108], ry: 0, color: 0x1c1d22 },
  { id: "v_bike_1", kind: "bike", p: [196, 112], ry: 0, color: 0xffd23f },
  { id: "v_auto_2", kind: "auto", p: [-10, 236], ry: Math.PI, color: 0xf2b134 },
  { id: "v_hatch_2", kind: "hatchback", p: [100, -126], ry: Math.PI / 2, color: 0x4b7bec },
];

export const SPAWN_POINT: [number, number, number] = [-10, 1, 14];   // near Cafe Chowk on Mall Road

export interface MissionDef { id: string; name: string; nameHi: string; kind: "tutorial" | "explore" | "delivery" | "race" | "photo" | "taxi" | "social"; giver?: string; start: [number, number]; checkpoints: [number, number][]; radius: number; timeLimitSec?: number; reward: { coins: number; xp: number }; needsVehicle?: boolean; coop?: boolean; desc: string; descHi: string }
export const MISSIONS: MissionDef[] = [
  { id: "tut_walk", name: "Pehla Kadam", nameHi: "पहला कदम", kind: "tutorial", giver: "guide_babloo", start: [-20, 10], checkpoints: [[-30, 24], [0, -20], [-62, -92]], radius: 4, reward: { coins: 100, xp: 50 }, desc: "Learn to move: visit the cafe, Phool Bagh and Sunset Point.", descHi: "चलना सीखो: कैफ़े, फूल बाग़ और सनसेट पॉइंट जाओ।" },
  { id: "jheel_walk", name: "Moti Jheel Chalo", nameHi: "मोती झील चलो", kind: "explore", giver: "guide_babloo", start: [-20, 10], checkpoints: [[-70, -40], [-120, -130], [-170, -60], [-62, -92]], radius: 6, reward: { coins: 250, xp: 120 }, coop: true, desc: "Walk the lake loop and end at Sunset Point.", descHi: "झील का चक्कर लगाओ और सनसेट पॉइंट पर रुको।" },
  { id: "delivery_sweets", name: "Laddu Delivery", nameHi: "लड्डू डिलीवरी", kind: "delivery", giver: "shop_gupta", start: [-125, 40], checkpoints: [[-120, 60], [120, 60]], radius: 7, timeLimitSec: 150, reward: { coins: 400, xp: 200 }, needsVehicle: true, desc: "Take the sweets from Naveen Market to V Square before they go cold.", descHi: "नवीन मार्केट से वी स्क्वायर तक मिठाई पहुँचाओ, ठंडी होने से पहले।" },
  { id: "race_mall", name: "Mall Road Dash", nameHi: "मॉल रोड डैश", kind: "race", giver: "auto_raju", start: [40, 12], checkpoints: [[-170, 2], [-170, -118], [170, -118], [170, 2], [40, 2]], radius: 8, timeLimitSec: 180, reward: { coins: 600, xp: 300 }, needsVehicle: true, coop: true, desc: "Five checkpoints around the Mall Road loop. Fastest wins.", descHi: "मॉल रोड लूप पर पाँच चेकपॉइंट। सबसे तेज़ जीतेगा।" },
  { id: "photo_city", name: "Shehar ki Tasveer", nameHi: "शहर की तस्वीर", kind: "photo", giver: "ped_priya", start: [-60, -100], checkpoints: [[200, -170], [0, 250], [0, -240]], radius: 12, reward: { coins: 350, xp: 180 }, coop: true, desc: "Photograph JK Temple, Kanpur Central and the Ghat (press E at each).", descHi: "जे.के. मंदिर, कानपुर सेंट्रल और घाट की फ़ोटो लो (हर जगह E दबाओ)।" },
  { id: "taxi_station", name: "Station Drop", nameHi: "स्टेशन ड्रॉप", kind: "taxi", giver: "auto_raju", start: [40, 12], checkpoints: [[-30, 24], [0, 236]], radius: 8, timeLimitSec: 120, reward: { coins: 300, xp: 150 }, needsVehicle: true, desc: "Pick up a passenger at Cafe Chowk and drop them at Kanpur Central.", descHi: "कैफ़े चौक से सवारी लो और कानपुर सेंट्रल छोड़ो।" },
  { id: "cafe_date", name: "Chai pe Charcha", nameHi: "चाय पे चर्चा", kind: "social", giver: "chai_munna", start: [-30, 20], checkpoints: [[-30, 24]], radius: 5, reward: { coins: 150, xp: 100 }, coop: true, desc: "Sit at the cafe with a friend for 60 seconds.", descHi: "कैफ़े में किसी दोस्त के साथ 60 सेकंड बैठो।" },
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
