# KanpurVerse

**Apna shehar, apni duniya.** A free, browser-based multiplayer open-world game inspired by Kanpur, built by Velto Studios.

Walk Mall Road, drive an auto past Moti Jheel, talk to Kanpuriya NPCs in their own voice (with subtitles), run missions, and play with friends in real time. No download, no account, no real-money purchases.

## Run it (Mac, one command)

```bash
cd ~/Desktop/VeltoStudios/KanpurVerse && ./RUN_ON_MAC.sh
```

Then open **http://localhost:3000** in Brave. Open a second window (or a private window) to be a second player in the same room.

Manually: `npm install`, then `npm run dev:server` (ws://localhost:8787) and `npm run dev:web` (http://localhost:3000).

## Verify

```bash
npm run verify        # typecheck + lint + tests (incl. two-client multiplayer) + production build
npm run test:multiplayer
```

## Layout

```
apps/web         Next.js 15 + React Three Fiber client (landing, menu, character creator, game, HUD)
apps/server      Node WebSocket server (server-authoritative rooms, missions, economy, moderation)
packages/shared  Protocol (zod), world definition, dialogue schema, moderation helpers
assets/dialogues NPC lines in Kanpuriya Hindi, Standard Hindi, English (same ids)
scripts          generate_voices.py — Edge neural TTS pre-generation (free; run on Mac)
tests            vitest suites (shared logic + real two-client multiplayer)
deployment       vercel.json, Dockerfile.server, render.yaml, fly.toml
docs             16 project documents; FINAL_PROJECT_REPORT.md has honest status per feature
```

## Controls

W A S D move · Shift sprint · Space jump/brake · mouse look (click to lock) · E talk/enter/photo · F exit vehicle · H horn · 1–6 emotes · T chat · M map · Tab players · Esc menu · F1 help. Touch: left joystick, right-side buttons, drag to look.

## Status

Public preview. See `docs/FINAL_PROJECT_REPORT.md` for exactly what is COMPLETED AND TESTED vs IMPLEMENTED BUT NOT FULLY TESTED vs BLOCKED.

MIT. Fonts: Inter (OFL), Noto Sans Devanagari (OFL). Landmarks are fictionalised tributes; no real business or person is depicted.
