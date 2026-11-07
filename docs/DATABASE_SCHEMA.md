# Database Schema — MongoDB Atlas `kanpurverse`

Storage is behind one interface (`apps/server/src/storage.ts`). With `MONGODB_URI` set the server uses Atlas; without it, a JSON file store (`apps/server/data/kanpurverse.json`, atomic writes, 5-s flush) with identical semantics. **Status: Mongo adapter implemented and type-checked; not executed against a live cluster (Atlas provisioning BLOCKED — no browser in this session). File store is exercised by the test suite.**

## Collections
### `players`
| Field | Type | Notes |
|---|---|---|
| `_id` | string (24-hex) | guest uid, embedded in the HMAC token |
| `name` | string | 3–16, validated |
| `appearance` | object | `{body, skin, hair, hairColor, top, bottom, shoes, accessory}` |
| `lang` | "kanpuriya" \| "hindi" \| "english" | |
| `level`, `xp`, `coins` | int | server-authoritative |
| `missionsCompleted` | string[] | mission ids (first completion) |
| `unlocked` | string[] | shop item ids |
| `friends`, `blocked` | string[] | player uids |
| `playtimeSec` | int | |
| `createdAt`, `lastSeenAt` | epoch ms | |
| `bannedUntil` | epoch ms? | manual moderation |
| `reports` | int | times reported |
Indexes: `{xp: -1}` (leaderboard), `{name: 1}`.

### `reports`
`{from, target, reason, at, chatContext: string[5]}` — index `{target: 1, at: -1}`.

### `mission_logs`
`{uid, mission, status: "completed"|"failed", durationSec, at}` — index `{uid: 1, at: -1}`, TTL 90 days on `at`.

## Sizing (free M0 = 512 MB)
Player doc ≈ 600 B → 500k players ≈ 300 MB. Mission logs ≈ 120 B × (say) 2M/90 days ≈ 240 MB — trim TTL to 30 days before that scale. Reports negligible.

## Account linking (future)
Add `accounts` collection `{_id, email (unique, lowercase), playerId, magicToken, magicExpires, createdAt}`; `hello` accepts `accountToken`; guest profiles merge into the account on first link. No passwords planned (magic link by email); never store secrets in `players`.

## Setup steps (need the browser; see FINAL_PROJECT_REPORT "Blocked")
1. Atlas → free M0 cluster, region Mumbai (ap-south-1).
2. Database user `kanpurverse_app` (read/write on `kanpurverse` only).
3. Network access: the game-server host's egress IP (or 0.0.0.0/0 temporarily while testing).
4. Connection string → `MONGODB_URI` on the server host; `MONGODB_DB=kanpurverse`.
5. Verify: `GET /health` returns `"storage":"mongo"`.
