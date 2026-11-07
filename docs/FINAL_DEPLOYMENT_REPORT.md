# KanpurVerse — Final Deployment Report (v0.5.3, 7 Nov 2026)

Owner: Velto Studios (Aradhya Dixit) · Budget spent: **$0** · Scope touched: only `~/Desktop/VeltoStudios/KanpurVerse/`, the `kanpurverse` GitHub repo, the `kanpurverse` Vercel project, the `kanpurverse-server` Render service and the new **KanpurVerse** Atlas project. No Sirak Studios, Dropbox, Airtable, NovaFood or other resources were read or changed.

Status labels: **COMPLETED AND VERIFIED** (seen working in Brave on the public URLs or proven by a passing automated check) · **IMPLEMENTED BUT NOT VERIFIED** · **PARTIALLY IMPLEMENTED** · **BLOCKED** · **NOT IMPLEMENTED** · **WAITING FOR USER APPROVAL**.

## Live endpoints
| Item | Value |
|---|---|
| Game (Vercel, production, auto-deploys from `main`) | **https://kanpurverse.vercel.app** |
| Game server (Render Free, Docker, Singapore) | **https://kanpurverse-server.onrender.com** → `wss://` for the game; `/health` returns `{"ok":true,"storage":"mongo"}` |
| Source | **https://github.com/AradhyaDixit18/kanpurverse** (public, `main`, 37+ commits) |
| Database | MongoDB Atlas M0 `kanpurverse` (AWS Mumbai), project **KanpurVerse**, db `kanpurverse`, user `kanpurverse_app` (readWrite on that db only) |
| CI / automation | GitHub Actions: `ci.yml` (typecheck, lint, tests), `voices.yml` (Edge TTS), `geo-assets.yml` (OSM + CC0 assets), `visual.yml` (Playwright screenshots) |

## Performance (measured)
Apple-Silicon MacBook, Brave, 1470×867 @ DPR 2, Medium quality: **59–61 FPS** at spawn, Nayaganj and Kanpur Central; brief dips to ~40 FPS while a new tile ring streams in. First-load JS 149 kB; 3D bundle 777 kB gzip loaded behind the loading screen; ~1.2 MB textures, ~1.5 MB HDRI, 868 kB map, voice MP3s on demand. Ping Mumbai→Singapore 110–150 ms. Details: `PERFORMANCE_REPORT.md`.

## Areas verified in Brave on the public build
Landing page · language gate · main menu · character studio · The Mall Road / Bada Chauraha spawn district (real OSM streets, shophouses with Hindi boards, chai stall, thelas, poles and wires, cows, crowd, traffic) · missions log (14) · NPC barks and dialogue with Edge voices + subtitles · walking, sprinting, server reconciliation · hatchback, auto and **e-rickshaw** driven · the **Nayaganj level crossing** (barriers, signal, keeper's cabin, tracks) · **Kanpur Central** (new station building with bilingual boards and platform canopies) · real IST clock (matched the Mac clock across the session: 18:46 → 19:27) · dusk sky/IBL · reconnect after each Render redeploy · two sessions in one room seeing each other, chatting, emoting (earlier in the session, before the background-tab fix below) · MongoDB storage live.

## Feature status
| Area | Status | Notes |
|---|---|---|
| Real Kanpur map (OSM) | COMPLETED AND VERIFIED | bbox 26.448–26.492 N / 80.318–80.368 E; `KANPUR_MAP_RESEARCH.md`, `KANPUR_GEOGRAPHIC_ACCURACY_AUDIT.md` |
| Streets, Indian street dressing, Hindi/English signage | COMPLETED AND VERIFIED | facades/shopfronts are procedural; large OSM blocks look flat (known) |
| Railway: tracks, 49 crossings with barriers/bell/gate collider | crossings COMPLETED AND VERIFIED; train halts/doors IMPLEMENTED BUT NOT VERIFIED | train runs on the shared clock; station announcements NOT IMPLEMENTED |
| Kanpur Central / Anwarganj stations | COMPLETED AND VERIFIED (Central) | stylised, labelled as approximation |
| Vehicles (10 kinds) + physics fixes | hatchback/auto/e-rickshaw COMPLETED AND VERIFIED; sedan/SUV/bike/scooter-drive/bus/truck/taxi IMPLEMENTED BUT NOT VERIFIED | ownership/customisation NOT IMPLEMENTED |
| Indian traffic AI, crowd | COMPLETED AND VERIFIED (visual) | PARTIALLY IMPLEMENTED as networked obstacles (deterministic, not server-synced collisions) |
| NPC behaviour states | PARTIALLY IMPLEMENTED | patrol/notice/talk/react/idle-bark done; shops/benches/phone states NOT IMPLEMENTED |
| Animals | cows COMPLETED AND VERIFIED; dogs/pigeons/crows IMPLEMENTED BUT NOT VERIFIED; monkeys/buffalo NOT IMPLEMENTED |
| Kanpuriya voices (3 languages, 55 lines each) | COMPLETED AND VERIFIED | no silent fallback |
| Missions (14) | log + tutorial + checkpoints COMPLETED AND VERIFIED; 7 new missions IMPLEMENTED BUT NOT VERIFIED end-to-end | wanted/police mechanics NOT IMPLEMENTED |
| Controls: camera modes C, look-back Q, photo P, inventory I, reset R | IMPLEMENTED BUT NOT VERIFIED (keys bound; R verified earlier) |
| Multiplayer (rooms, chat, party, emotes, reconcile) | COMPLETED AND VERIFIED | re-verified on 59d17f8: two tabs (Rad_Kanpur, Priya_Tester) both "2 online", chat delivered both ways, the backgrounded tab stayed connected |
| MongoDB Atlas persistence | COMPLETED AND VERIFIED (server log "storage: MongoDB", `/health` storage=mongo) | Atlas "Browse Collections" UI returned its own error twice; collection contents not eyeballed |
| Vercel production | COMPLETED AND VERIFIED | `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_QA=1` (QA hook stays enabled on production; harmless — it only exposes a local teleport the server still validates — but remove the var if you prefer) |
| Render server | COMPLETED AND VERIFIED | Free tier sleeps after 15 min idle → first join 30–50 s |
| Security QA | COMPLETED AND VERIFIED | zod validation, HMAC tokens, rate/flood limits, origin allow-list, profanity/PII filter, no secrets in git (`git grep` scan), DB creds only in Render env, least-privilege DB user, Atlas network 0.0.0.0/0 (required: Render Free has no static egress IP; auth + scoped user remain) |
| Phone/touch | IMPLEMENTED BUT NOT VERIFIED | no device this session |
| Website showcase | COMPLETED AND VERIFIED (gallery seen live) | gallery of 6 Brave screenshots, real-Kanpur copy, OSM attribution |
| Marketing (Instagram/LinkedIn posts) | WAITING FOR USER APPROVAL | nothing published, per your rule |

## Known bugs / limitations
1. Large OSM building polygons render as long flat blocks with repeated windows (cosmetic).
2. Flyovers/bridges are flat; no elevation.
3. Moti Jheel's water polygon and JK Temple are outside the fetched bbox — positions approximate, no lake geometry yet (widen bbox in `geo-assets.yml`).
4. Ambient traffic/animals are not networked obstacles; another player's auto will not block yours.
5. Render Free cold start; profiles persist in Atlas but rooms/vehicle positions reset on each redeploy.
6. Two ESLint warnings (unused import, extra memo dep).
7. The in-game `E` prompt briefly overlapped the speedometer before 583c1bb (fixed).

## Bugs fixed during this session (all on `main`)
Empty-city Suspense retry storm (5e4fc35) · invisible wall from bbox colliders → trimesh colliders (3f3105f) · compass overlap (a7a533c) · hydration #418 (5e4fc35) · Ganga ring clipping + extract validator (5e4fc35) · far-tile crash boundaries (7e41737) · movement desync/correction, vehicle launch, player sinking (1babae2) · background-tab reconnect (59d17f8).

## Remaining work (suggested order)
1. Play the 7 new missions end-to-end; verify bus/truck/taxi handling; test camera modes/photo mode by hand.
2. Widen the OSM bbox to include Moti Jheel/JK Temple/Kakadeo; add `natural=water` relations.
3. Facade variety for large footprints; shop interiors; NPC shop/bench states; station announcements (voices workflow already supports new ids).
4. Wanted/police system; vehicle ownership + colours at Chauraha Garage.
5. Phone QA; instancing of props/crowd for Low tier.
6. Optional paid items (need approval): Render Starter ($7/mo) to remove cold starts; custom domain.

## Credentials and cleanup
- Fine-grained GitHub PAT `kanpurverse-push-temp` (7-day, repo-scoped): used for pushes from the sandbox — **revoked at the end of this session** (see final message).
- `/tmp/gitcred`, `/tmp/kv_dbpass`, `/tmp/kv_mongo_uri`, `/tmp/kv_session_secret` in the sandbox: deleted at the end of this session. The DB password and session secret live only in Render's environment now.
- Nothing was committed to git: `.env*` ignored; scan clean.
