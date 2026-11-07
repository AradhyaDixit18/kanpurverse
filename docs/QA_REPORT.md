# QA Report — 7 Nov 2026

Environment: Linux sandbox (Node 22.23, no GPU, no browser). Browser/device checks are listed as **PENDING (Mac)** with the exact steps so they can be run in Brave.

## Automated — PASS
| Check | Command | Result |
|---|---|---|
| Type check (shared, server, web) | `npm run typecheck` | 0 errors |
| Lint (web, next/core-web-vitals + typescript) | `npm run lint` | 0 errors, 0 warnings |
| Unit tests (dialogue parity, moderation, world generation, protocol) | `npm test` | 10/10 |
| Multiplayer integration (real server + 2 ws clients) | `npm run test:multiplayer` | 5/5 |
| Production build | `npm run build` | `/` 106 kB, `/play` 1.16 MB |
| SSR smoke (`next start`) | curl `/` and `/play` | 200; landing text renders; play shell renders |
| Server boot + `/health` | `tsx apps/server/src/index.ts` | `{"ok":true,"protocol":1,"storage":"file"}` |
| `.env` loading | `PORT=8791` in `.env` | server bound to 8791 |

## Code-review fixes made before hand-off
Avatar animation never updated (ref read at render) → state; materials recreated every snapshot → memo by content; AudioContext created before user gesture → guarded; Devanagari glyphs missing in 3D text → bundled merged Noto Sans Devanagari (Latin + Devanagari) woff; "Abandon mission" only cleared the client → `mission.abandon` message; ESLint flat-config crash → `FlatCompat`; `outputFileTracingRoot` for monorepo.

## Manual QA — PENDING (Mac, Brave)
Run `./RUN_ON_MAC.sh`, open http://localhost:3000 in two Brave windows (one private).
1. Landing renders, Play → menu → Character creator shows a 3D figure that follows the swatches; name validation rejects `ab` and `admin1`.
2. Play → "Joined kanpur-1 · 1 online" toast; world visible; WASD/Shift/Space work; mouse look locks on click; Esc releases.
3. Second window joins same room → both see each other with name tags; chat `hi` appears in both; `/invite` + accept → blue name tag, party chat.
4. Walk to Babloo (yellow diamond, 10 m) → E → dialogue with voice (speechSynthesis Hindi) + subtitle + roman; Accept → mission tracker + gold beam; complete tutorial → "+100 coins" toast.
5. Hatchback on Mall Road → E → drive; H horn; passenger from second window → E → "Ride along"; F exits both.
6. Raju → race; timer counts down; 5 checkpoints; failure on timeout shows toast.
7. Priya → photo mission → E at each landmark → camera flash + SFX.
8. Munna → Chai pe Charcha with both players within 4 m for 60 s.
9. Settings: switch language to English → signs/labels/UI/NPC lines switch; Low quality → no shadows; Large text; touch toggle shows joystick.
10. Mobile: open on iPhone/Android over LAN (`http://<mac-ip>:3000`, set `NEXT_PUBLIC_WS_URL=ws://<mac-ip>:8787`) → joystick, look-drag, E button.
11. Kill the server → "Reconnecting…" toasts → restart → session resumes with same name/coins (token).
12. Record FPS (Settings → Show FPS) on Medium/High; note in PERFORMANCE_REPORT.

## Known issues / risks to watch during manual QA
- First `/play` load downloads ~3 MB (JS + Rapier WASM + font); show a progress hint if >3 s on 4G.
- Troika text: if Devanagari renders as boxes, confirm `/fonts/NotoSansDevanagari-400.woff` is served.
- Vehicle physics is arcade and untested for tunnelling into buildings at top speed (CCD is on).
- speechSynthesis on Brave desktop may have no Hindi voice installed → falls back to the default English voice reading Devanagari poorly; run `npm run voices` to generate Edge mp3s (fixes this).
