# KanpurVerse — Project Blueprint

**Owner:** Velto Studios (Aradhya Dixit) · **Budget:** $0 · **Date:** 7 Nov 2026 · **Build:** MVP / public preview

## Vision
A browser-based multiplayer open world where Kanpur is the hero. Players walk, drive, talk, run missions and hang out with friends in a fictionalised district of central Kanpur, with NPCs that speak Kanpuriya Hindi.

## MVP scope (this build)
| Pillar | Delivered |
|---|---|
| World | Hand-authored "Civil Lines & Moti Jheel" district, 520 × 520 m, 9 roads, 12 landmarks, ~30 procedurally placed buildings with Hindi/English shop signs, trees, street lights, day/night cycle (20-min day) |
| Character | Creator with live 3D preview: body, skin (6), hair (6), hair colour (5), top (5 + 3 unlockable), bottom (6), shoes (4), accessory (4); 15 animation states (code-driven) |
| Movement | Rapier kinematic character controller: walk/run/sprint/jump, autostep, slopes, third-person camera with collision, mouse/touch look |
| Vehicles | 8 shared vehicles (hatchback ×2, sedan, SUV, bike, scooter, auto ×2); driver + passenger seats; horn; arcade physics |
| NPCs | 10 named NPCs (guide, chaiwala, auto driver, shopkeeper, police, 5 pedestrians on patrol paths); 44 lines × 3 languages; subtitles + voice |
| Missions | 7: tutorial walk, lake loop, sweets delivery (timed, vehicle), Mall Road race (timed), photo walk, taxi drop, cafe sit-together (social) |
| Economy | Coins + XP, levels, Naveen Market shop (7 items), server-validated, no real money |
| Multiplayer | WebSocket, server-authoritative, 20 Hz snapshots, rooms (32 players), proximity + party chat, emotes, friends/party/mute/block/report |
| UI | Landing page, main menu, settings (language, subtitles, voice, audio, quality, sensitivity, accessibility), HUD, minimap, full map, chat, dialogue panel, shop, help, pause, mobile controls |
| Security | zod-validated messages, HMAC guest tokens, rate limits, flood/teleport/speed rejection, profanity + PII filter, origin allow-list, per-IP cap |

## Phases (as requested) and outcome
1. Research & planning — done (`KANPUR_MAP_RESEARCH.md`, `GAMEPLAY_DESIGN.md`)
2. Architecture — done (`TECHNICAL_ARCHITECTURE.md`)
3. Core game build — done, verified headlessly (typecheck/lint/build/tests); visual QA pending on the Mac
4. Multiplayer — done, two-client automated test passes
5. Database — MongoDB adapter implemented; Atlas provisioning BLOCKED (no browser); file store works today
6. Deployment — configs written; GitHub/Vercel BLOCKED (no browser connected in this session)
7. Testing — automated done; browser/device QA pending
8. Marketing — plan only (`MARKETING_PLAN.md`); nothing produced or published, per the "playable build first" rule
9. Final report — `FINAL_PROJECT_REPORT.md`

## Post-MVP roadmap
Account linking (email magic link), more districts (Kakadeo, Swaroop Nagar, Bithoor ghats), trains at Central, weather, radio with original music, photo mode sharing, leaderboards UI, vehicle colours/upgrades, Kanpuriya voice lines recorded by real actors, moderation dashboard.
