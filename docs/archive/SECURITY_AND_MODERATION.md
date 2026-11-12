# Security and Moderation

## Threat model
Public browser game with guest identities: cheating (teleport/speed/reward spoofing), abuse in chat, harassment, impersonation, flooding/DoS, credential or PII leakage.

## Controls implemented
| Area | Control | Where |
|---|---|---|
| Input validation | Every inbound message parsed with zod discriminated union; unknown/oversized → `bad_msg`; max payload 4 KB | `index.ts`, `protocol.ts` |
| Identity | HMAC-SHA256 signed guest tokens (uid + iat, 90-day expiry, constant-time verify); secret from `SESSION_SECRET` (ephemeral + warning if unset) | `auth.ts` |
| Names | 3–16 `[A-Za-z0-9_devanagari]`, leetspeak-normalised profanity check, reserved prefixes (admin/mod/velto/system/server) | `moderation.ts` |
| Movement anti-cheat | Speed/teleport/bounds checks on foot and in vehicles; server re-syncs client | `room.ts` |
| Economy anti-cheat | Rewards, repeat rate, purchases, unlock checks only on server; client cannot set coins | `room.ts` |
| Mission anti-cheat | Checkpoint reached only with validated position; min 0.4 s between checkpoints; explicit checkpoints require proximity; timers server-side | `room.ts` |
| Chat | 5 msgs/10 s; profanity masked (Hindi + English list, leetspeak-aware); phone numbers, emails and URLs stripped; proximity/party scoping; block/mute both ways | `room.ts`, `moderation.ts` |
| Reports | Stored with last 5 chat lines of the target; 5+ reports with profane history → auto-kick (4003); `bannedUntil` honoured at hello | `room.ts`, `storage.ts` |
| Flood/DoS | ≤ 60 msgs/s per socket, ≤ 6 sockets per IP (X-Forwarded-For aware), hello deadline 10 s, rooms capped at 32 | `index.ts` |
| Origin | WebSocket `Origin` must be in `ALLOWED_ORIGINS` (wildcard only for tests) | `index.ts` |
| Transport | Production uses `wss://` behind the host's TLS; Vercel pages are HTTPS | deployment |
| Browser | Security headers (nosniff, DENY framing, referrer policy, permissions policy); no third-party scripts, fonts self-hosted; no analytics/tracking | `next.config.ts` |
| Secrets | None in the repo; `.env*` ignored; `.env.example` documents keys | `.gitignore` |
| Data minimisation | No email/phone/location collected; localStorage holds settings, appearance, name, token only | `store.ts` |

## Privacy policy (draft for the landing page, to approve)
"KanpurVerse stores a random player id, your chosen name, appearance, progress and the chat lines included in abuse reports. No email, phone or location is collected. Reports are reviewed by Velto Studios and deleted after 90 days."

## Not implemented (honest)
- Moderator tooling (ban UI, report queue) — reports are in the DB/file only.
- Account passwords/2FA (guest-only identity by design for the MVP).
- Server-side physics simulation (plausibility checks only).
- Rate limiting of `hello` by IP beyond the socket cap; CAPTCHA (not wanted).
- Automated secret scanning in CI (`gitleaks`) — recommended addition.

## Incident playbook
Abusive player: `/report name` in-game → check `reports` → set `players.bannedUntil` → they are refused at next hello. Server compromise: rotate `SESSION_SECRET` (invalidates all tokens), rotate Atlas user, redeploy.
