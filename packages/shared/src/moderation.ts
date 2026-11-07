/** Shared chat/name moderation. Deliberately conservative; server is the authority. */
const BLOCKED = ["bhosd", "madarch", "behench", "chutiy", "gandu", "randi", "lund", "fuck", "shit", "bitch", "asshole", "nigg", "rape", "kill yourself", "kys"];
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };

export function normalise(s: string): string {
  return s.toLowerCase().split("").map(c => LEET[c] ?? c).join("").replace(/[^a-zऀ-ॿ ]/g, "").replace(/(.)\1{2,}/g, "$1$1");
}
export function hasBlockedWord(s: string): boolean { const n = normalise(s); return BLOCKED.some(w => n.includes(w)); }
export function maskProfanity(s: string): string {
  if (!hasBlockedWord(s)) return s;
  return s.split(/(\s+)/).map(tok => hasBlockedWord(tok) ? tok[0] + "*".repeat(Math.max(1, tok.length - 1)) : tok).join("");
}
export function isValidName(name: string): { ok: boolean; reason?: string } {
  if (!/^[A-Za-z0-9_ऀ-ॿ]{3,16}$/.test(name)) return { ok: false, reason: "Name must be 3–16 letters, numbers or _" };
  if (hasBlockedWord(name)) return { ok: false, reason: "That name isn't allowed" };
  if (/^(admin|mod|velto|system|server)/i.test(name)) return { ok: false, reason: "Reserved name" };
  return { ok: true };
}
/** Strip anything that looks like a phone number, email or URL from public chat. */
export function stripPII(s: string): string {
  return s.replace(/\b\d{10,}\b/g, "[number removed]").replace(/\S+@\S+\.\S+/g, "[email removed]").replace(/https?:\/\/\S+|www\.\S+/gi, "[link removed]");
}
