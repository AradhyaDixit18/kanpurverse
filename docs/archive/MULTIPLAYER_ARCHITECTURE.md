# Multiplayer Architecture — v0.5

**Live:** client https://kanpurverse.vercel.app (Vercel, static + SSR shell) · server `wss://kanpurverse-server.onrender.com` (Render Free, Docker, Singapore) · storage: file (`DATA_DIR=/tmp/kvdata`, resets on deploy) until `MONGODB_URI` is set (see FINAL_DEPLOYMENT_REPORT).

## Topology
One Node process hosts N rooms (default name `kanpur-1`; friends type any room name, max 32 players each). Vercel serves only static client files; the game server runs on a persistent host (see `VERCEL_DEPLOYMENT_REPORT.md`). WebSocket, JSON messages, protocol v1 defined once in `packages/shared/src/protocol.ts` with zod.

## Authority
| Thing | Who decides | How enforced |
|---|---|---|
| Position on foot | Client proposes, server validates | `|Δp| ≤ 9 m/s · Δt + 2.5 m` where Δt is measured since the last **accepted** state (so one bad hop does not poison every later update), bounds, Y range; a rejection sends an explicit `{t:"correct", p, reason}` and the client snaps to it |
| Vehicle position | Driver proposes, server validates | `≤ 38 m/s · Δt + 2.5`; only the registered driver's updates are accepted |
| Seat ownership | Server | enter requires ≤ 6 m distance, free seat; exit clears |
| Mission progress | Server | checkpoints checked against validated position & radius; ≥ 0.4 s between checkpoints; timers; photo/social need explicit `mission.checkpoint` *and* proximity (and a partner within 4 m for 60 s for the social mission) |
| Coins/XP/unlocks | Server | rewards computed server-side; repeat = 40%; shop debits server-side |
| Chat visibility | Server | 120 m proximity or party; mutes/blocks both directions; 5 msgs / 10 s; profanity masked; phone/email/URL stripped |
| Identity | Server | HMAC token; duplicate login replaces the older socket |

## Tick & bandwidth
Server broadcasts `snapshot` at 20 Hz to everyone in the room: all players (id, name, p, ry, anim, appearance, vehicle/seat, level) + all vehicles. For 32 players ≈ 32 × ~180 B + 8 × ~120 B ≈ 6.7 KB per tick ≈ 134 KB/s per client worst case. Fine for an MVP; v1.1 should send appearance/name only on join and delta-compress.

Client sends `state` at ≤ 20 Hz (50 ms throttle), ping every 3 s. Reconnect with exponential backoff (0.5 → 8 s) reusing the token so profile and name persist.

## Interpolation
Remote players and non-driven vehicles keep a 6-entry ring buffer of snapshots; the renderer lerps toward the latest at `dt·12` (≈ 80 ms smoothing). No extrapolation; at 20 Hz with 50–150 ms RTT this looks smooth on LAN and acceptable on 4G.

## Rooms lifecycle
Created on first join, destroyed when empty (interval cleared). World clock is the **real Kanpur time (IST, UTC+5:30)** computed on the server each snapshot; every room and every client shows the same hour, so traffic density, crowd, animals, lighting and the train timetable are shared.

## Limits / abuse controls
Per-IP ≤ 8 sockets (Render env `MAX_CONN_PER_IP`); ≤ 60 messages/s per socket (flood → close 4004); max payload 4 KB; hello within 10 s or close; origin allow-list with wildcard support (`https://*.vercel.app` for preview deployments); name validation; 5 reports + profane history → kick (4003).

## Tested
`tests/multiplayer.test.ts` boots the server on a random port and runs two real `ws` clients: join/see each other, movement propagation, chat with PII stripping and profanity masking, leave notification, teleport rejection, exclusive driver seat + passenger follows vehicle, mission completion with reward and repeat-rate rules, checkpoint spoof rejection, shop debit/insufficient coins, token reconnect restoring profile, malformed/invalid-name/no-hello/flood handling. 5 tests, all pass (≈10 s).

## Server-driven world objects
Trains: the server does not simulate trains; they are a pure function of the shared clock (`trainState(t)` in `RailwayOsm.tsx`), so every client sees the same train at the same place, stopping 40 s at Kanpur Central / Anwarganj. Crossing barriers close when the train is within 260 m along the track and the gate collider is physical. Ambient traffic, crowd and animals are likewise deterministic on the clock + player position (not networked, no bandwidth cost). Trade-off: they are not avoidable obstacles for *other* players, which is documented as PARTIALLY IMPLEMENTED.

## Verified live (2026-11-07, Brave on macOS, public URLs)
Two independent sessions on kanpurverse.vercel.app saw each other ("2 online"), chat delivered both ways, emotes and positions synced, both showed the same 18:35 IST dusk sky. Render Free spins down after 15 min idle: first connection after idle takes ~30–50 s (the loading screen shows "Waking the server…" and retries 6×).

## Not yet done
Load test beyond 2 browser clients (the vitest suite runs 2–4 `ws` clients); NAT/4G latency test; horizontal scaling (one process, one region); networked traffic/animals; MongoDB persistence pending the Atlas cluster finishing provisioning.
