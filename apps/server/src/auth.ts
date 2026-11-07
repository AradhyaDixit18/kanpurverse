/** Guest sessions: HMAC-signed tokens (no passwords stored, no third-party auth; account linking is a documented follow-up). */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { CONFIG } from "./config";
import { log } from "./log";

let secret = CONFIG.sessionSecret;
if (!secret) {
  secret = randomBytes(32).toString("hex");
  log.warn("SESSION_SECRET not set: using an ephemeral secret (tokens stop working on restart). Set it in .env for persistence.");
}

export interface Session { uid: string; iat: number }

export function issueToken(uid: string): string {
  const payload = Buffer.from(JSON.stringify({ uid, iat: Date.now() } satisfies Session)).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
export function verifyToken(token: string | undefined): Session | null {
  if (!token || token.length > 512) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expect = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (typeof s.uid !== "string" || !/^[a-f0-9]{24}$/.test(s.uid)) return null;
    if (Date.now() - s.iat > 1000 * 60 * 60 * 24 * 90) return null; // 90-day expiry
    return s;
  } catch { return null; }
}
export const newUid = () => randomBytes(12).toString("hex");
