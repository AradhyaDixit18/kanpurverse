# Technical Architecture

## Stack (all free / open source)
- **Client:** Next.js 15.5 (App Router), React 19, three.js 0.180, @react-three/fiber 9, @react-three/drei 10, @react-three/rapier 2 (Rapier WASM physics), zustand 5, zod 3. TypeScript 5.9 strict.
- **Server:** Node 22, `ws` 8, zod, `mongodb` 6 driver (optional), `tsx` runtime. No framework.
- **Shared package:** `@kanpurverse/shared` — protocol schemas, world data, dialogue schema, moderation, XP curve, shop catalogue. Imported by both sides so client and server can never disagree on a message shape or a mission checkpoint.
- **Voices:** Microsoft Edge neural TTS via `edge-tts` (free) pre-generated to mp3 on the Mac; browser `speechSynthesis` (hi-IN / en-IN) as automatic fallback.
- **Tests:** vitest 3; the multiplayer suite boots the real server and connects two real `ws` clients.

## Monorepo
npm workspaces: `apps/web`, `apps/server`, `packages/shared`. `tsconfig.base.json` maps `@kanpurverse/shared` to source so no build step is needed for the shared package (Next transpiles it; tsx resolves it).

## Client architecture
```
app/page.tsx            landing (static, SEO text from shared world data)
app/play/PlayClient.tsx screen router: menu → character → loading → play / error
src/state/store.ts      zustand store: settings (persisted to localStorage), session token, world snapshot, UI state
src/net/client.ts       WebSocket client, reconnect w/ backoff, ping, snapshot buffers for interpolation
src/game/Game.tsx       <Canvas> + <Physics>; children below
  Sky.tsx               sun/moon/fog/ambient from server world clock; stars at night
  City.tsx              ground, roads w/ pavements & dashes, instanced buildings (per style), signs, landmarks, trees, lights, bounds; fixed colliders
  Player.tsx            kinematic character controller, camera (orbit + collision ray), interaction probe, emotes, net send, server correction
  Vehicles.tsx          driver: dynamic body + arcade model, streams state; others: kinematic + interpolation
  NPCs.tsx              path following, face player, idle barks, reactions
  Remote.tsx            remote avatars with interpolation
  Missions.tsx          checkpoint beam + giver icons
  Avatar.tsx            procedural humanoid, 15 code animations, name tag sprite
  input.ts              keyboard/mouse/touch unified
src/ui/*                HUD, dialogue, settings, character creator, menus (plain CSS, no UI lib)
src/audio/voice.ts      mp3 manifest → speechSynthesis fallback; subtitles always
src/audio/sfx.ts        WebAudio procedural SFX + ambient pentatonic bed (no audio files)
```
Rendering budget: instanced meshes for buildings/trees/lights (3 draw calls each group), fog-limited draw distance by quality tier, `AdaptiveDpr`, shadows off on Low. Bundle: `/play` 1.06 MB JS (three + rapier WASM dominate).

## Server architecture
```
index.ts   HTTP (/health, /leaderboard) + WebSocketServer: origin check, per-IP cap, flood limit, hello handshake, routing
room.ts    Room: players, vehicles, 20 Hz snapshot broadcast, movement validation, chat (proximity/party, filters, rate limit),
           vehicles (exclusive seats, speed validation), missions (server-tracked checkpoints, timers, rewards, coop bonus), shop, social
auth.ts    HMAC-SHA256 guest tokens (uid + iat, 90-day expiry), constant-time compare
storage.ts Storage interface; MongoStorage (Atlas) or FileStorage (JSON, atomic writes) chosen by MONGODB_URI
config.ts  env; log.ts JSON logs
```
Authority model: the client is an input device + predictor. Server owns coins, XP, unlocks, mission progress, vehicle ownership, who hears chat. Client positions are accepted only within speed × Δt + tolerance and world bounds; otherwise the server snaps the client back.

## Data flow
1. `hello` (token or guest name + appearance + lang) → `welcome` (id, new token, profile)
2. `join room` → `joined` (full state) → `snapshot` × 20/s (ack of last seq)
3. `state`/`vehicle.state` 20/s from client; `chat`, `emote`, `vehicle.*`, `mission.*`, `shop.buy`, `social`, `profile.update`, `ping`
4. Persistence on leave, mission complete, purchase, profile change (debounced file flush every 5 s; Mongo immediate)

## Deployment topology
- Vercel: static landing + client bundle (no server code; WebSockets not possible on Vercel functions).
- Persistent host: Docker image (`deployment/Dockerfile.server`) on Render free / Fly.io / Railway / an Oracle Always-Free VM; must support WebSockets and long-lived processes.
- MongoDB Atlas M0 (free) for `kanpurverse` DB; file store otherwise.
- `NEXT_PUBLIC_WS_URL` on Vercel → `wss://<server-host>`; `ALLOWED_ORIGINS` on server → the Vercel URL.

## Known limits
Single-process server (one region, in-memory rooms; horizontal scaling needs a room router), no voice chat, no account passwords (guest token only), physics is client-side with server plausibility checks (not full server simulation).
