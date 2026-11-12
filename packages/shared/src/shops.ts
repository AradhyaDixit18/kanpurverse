/**
 * Enterable businesses. Positions were chosen from the OSM extract (scripted search for open lots 6–9 m from a road
 * edge and ≥9 m clear of any mapped building near the Mall Road start area); `yaw` turns the door toward the road.
 */
import type { ShopType } from "./economy";
export interface ShopSite {
  id: string; type: ShopType; nameHi: string; name: string; p: [number, number]; yaw: number;
  keeper: { nameHi: string; name: string; seed: number; body: "m" | "f" };
  greet: string[]; color: number; sign: string;
}
export const SHOP_SIZE = { w: 10, d: 8, h: 4.6, door: 2.4 } as const;
export const SHOPS: ShopSite[] = [
  { id: "shop_weapons", type: "weapons", nameHi: "शेरा स्पोर्ट्स एंड सेफ़्टी", name: "Shera Sports & Safety", p: [428, -356], yaw: -0.273, color: 0x7a2a1d, sign: "शेरा स्पोर्ट्स",
    keeper: { nameHi: "शेरा भाई", name: "Shera bhai", seed: 41, body: "m" },
    greet: ["आइए मैडम, का देखना है आपको? लाठी, बैट, स्प्रे, सब है।", "खेल-कूद हो या अपनी हिफ़ाज़त, बढ़िया सामान है। लाइसेंस वाला काम नहीं, सब खेल का माल है।", "पैसे कम पड़ रहे हैं तो पहले कोई मिशन पूरा कर लीजिए, माल कहीं भागा नहीं जा रहा।"] },
  { id: "shop_clothing", type: "clothing", nameHi: "रंगरेज़ फ़ैशन हाउस", name: "Rangrez Fashion House", p: [506, -290], yaw: 2.787, color: 0x5b2a6e, sign: "रंगरेज़ फ़ैशन",
    keeper: { nameHi: "नसरीन आपा", name: "Nasreen apa", seed: 52, body: "f" },
    greet: ["आओ बिटिया! नई कुर्ती आई है, पहन के देखो।", "ये रंग तुम पे खूब जँचेगा, शीशे में देखो ज़रा।", "मॉल वाले दाम नहीं, रंगरेज़ वाले दाम हैं, बेफ़िक्र खरीदो।"] },
  { id: "shop_garage", type: "garage", nameHi: "पप्पू मोटर वर्क्स", name: "Pappu Motor Works", p: [464, -380], yaw: 1.132, color: 0x2d4a2b, sign: "पप्पू मोटर वर्क्स",
    keeper: { nameHi: "पप्पू मिस्त्री", name: "Pappu mistri", seed: 63, body: "m" },
    greet: ["गाड़ी ठुकी है का? लाओ, अभी चकाचक कर देते हैं।", "इंजन की आवाज़ सुनके बता देंगे का बीमारी है।", "पैसे फिक्स, काम पक्का। उधारी नहीं चलती, मैडम।"] },
  { id: "shop_hospital", type: "hospital", nameHi: "कानपुर सिटी हॉस्पिटल", name: "Kanpur City Hospital", p: [464, -290], yaw: 1.486, color: 0x1f5d7a, sign: "सिटी हॉस्पिटल",
    keeper: { nameHi: "रिसेप्शन: सिस्टर मेरी", name: "Sister Mary", seed: 74, body: "f" },
    greet: ["नमस्ते, बताइए का तकलीफ़ है? पहिले बैठ जाइए।", "पट्टी, फ़र्स्ट-एड, पूरा इलाज, सब मिलेगा।", "चोट को हल्के में मत लीजिए, जाँच करवा लीजिए।"] },
  { id: "shop_dealer", type: "dealership", nameHi: "वेल्टो मोटर्स शोरूम", name: "Velto Motors Showroom", p: [410, -326], yaw: 2.899, color: 0x1d2f4f, sign: "वेल्टो मोटर्स",
    keeper: { nameHi: "सेल्समैन विक्की", name: "Vicky (sales)", seed: 85, body: "m" },
    greet: ["वेल्टो मोटर्स में स्वागत है मैडम! टेस्ट ड्राइव भी करा देंगे।", "EMI नहीं, सीधा कैश। पर गाड़ी लाजवाब मिलेगी।", "कौन सी लेंगी? स्कूटी से लेकर बड़ी SUV तक, सब है।"] },
];
/** Local (shop-space) → world. Local +z faces the door/road. */
export function shopLocalToWorld(s: ShopSite, lx: number, lz: number): [number, number] { const c = Math.cos(s.yaw), n = Math.sin(s.yaw); return [s.p[0] + lx * c + lz * n, s.p[1] - lx * n + lz * c]; }
/** Where the player stands to talk to the keeper (in front of the counter, inside). */
export const shopCounterPoint = (s: ShopSite) => shopLocalToWorld(s, 0, -0.9);
export const shopDoorPoint = (s: ShopSite) => shopLocalToWorld(s, 0, SHOP_SIZE.d / 2);
/** Where a bought or repaired vehicle is delivered (on the road side, beside the door). */
export const shopDeliveryPoint = (s: ShopSite) => shopLocalToWorld(s, 6.5, SHOP_SIZE.d / 2 + 3.5);
