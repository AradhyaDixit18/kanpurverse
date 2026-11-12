/** Tunable fictional street-life mechanics. No real brands. */
export const STREET = { price: 5, maxPackets: 30, consumeMs: 2400, spitCooldownMs: 1200, dialogueCooldownMs: 2200, reactionMs: 2600, stainMs: 18000, maxStains: 24, reactionRadius: 10, penalty: 1 } as const;
export const PAAN_VENDOR = "paan_chacha";
export type StreetCategory = "normal" | "funny" | "frustrated" | "mild" | "comeback" | "apology";
export interface NpcMood { anger: number; lastAt: number; turn: number; until: number; leaving: boolean }
export const STREET_LINES: Record<StreetCategory, { label: string; player: string[]; replies: string[]; strong?: string[] }> = {
 normal: { label: "नमस्ते भैया", player: ["नमस्ते भैया, सब बढ़िया?", "भाई, यहाँ का क्या हाल है?"], replies: ["बढ़िया! तुम बताओ, शहर कैसा लगा?", "बस दीदी, अपनी कानपुर वाली मौज है!"] },
 funny: { label: "कनपुरिया मज़ाक", player: ["का बे, बड़ी जल्दी में हो?", "का गुरु, आज तो पूरे हीरो लग रहे!", "का हुआ बे, चाय ठंडी हो गई क्या?"], replies: ["जल्दी नहीं गुरु, समोसे गरम हैं!", "हीरो तुम हो, हम तो साइड में चाय पी रहे!", "अरे गुरु, कानपुर में टशन फ्री मिलता है!"] },
 frustrated: { label: "अरे भाई, आराम से!", player: ["भाई, रास्ता तो छोड़ दो!", "अरे यार, दिमाग मत खाओ!"], replies: ["आराम से बोलो, सुन रहे हैं!", "दीदी, सड़क सबकी है, थोड़ा सब्र करो।"] },
 mild: { label: "तीखी बात / slang", player: ["ज्यादा हीरो मत बनो!", "का बे, बकैती बंद करो!"], strong: ["साला, फिर वही बकवास!", "अबे चिरकुट, बकचोदी बंद कर!"], replies: ["बोलने का भी तरीका होता है, गुरु!", "बस करो दीदी, ढंग से बात करो।"] },
 comeback: { label: "हाज़िरजवाबी", player: ["गुरु, तुम्हारा जवाब तो तैयार रहता है!", "का बात है, आज बड़े फॉर्म में हो!"], replies: ["कानपुर के हैं दीदी, जवाब तो देंगे!", "चाय के साथ हाज़िरजवाबी भी मिलती है!"] },
 apology: { label: "माफ़ करना भाई", player: ["अरे भाई, माफ़ करना। मज़ाक था।", "चलो गुरु, छोड़ो। आराम से बात करते हैं।"], replies: ["ठीक है दीदी, बात खतम।", "कोई बात नहीं गुरु, अब मुस्कुराओ!"] },
};
export function streetReply(category: StreetCategory, old: NpcMood | undefined, now: number, seed: number, clean: boolean) {
 const cfg = STREET_LINES[category]; const previous = old && now - old.lastAt < 30000 ? old.anger : 0;
 const anger = Math.max(0, Math.min(4, previous + (category === "apology" ? -3 : category === "mild" ? 2 : category === "frustrated" ? 1 : -1)));
 const turn = (old?.turn ?? 0) + 1; const pick = seed + turn;
 const playerPool = !clean && cfg.strong ? cfg.strong : cfg.player;
 return { player: playerPool[pick % playerPool.length], reply: anger >= 4 ? "बस दीदी, अब हम चलते हैं। ज़रूरत पड़ी तो मदद बुलाएँगे।" : cfg.replies[pick % cfg.replies.length], mood: { anger, turn, lastAt: now, until: now + STREET.reactionMs, leaving: anger >= 4 } };
}
