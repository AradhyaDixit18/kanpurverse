# KanpurVerse — Project Blueprint

**Owner:** Velto Studios (Aradhya Dixit) · **Budget:** $0 · **Date:** 7 Nov 2026 · **Build:** v0.5 public preview on real OSM Kanpur

## Vision
A browser-based multiplayer open world where Kanpur is the hero. Players walk, drive, talk, run missions and hang out with friends in a fictionalised district of central Kanpur, with NPCs that speak Kanpuriya Hindi.

## v0.5 scope (this build, 7 Nov 2026) — status per pillar
Labels: **CV** = COMPLETED AND VERIFIED in Brave on the public build · **INV** = IMPLEMENTED BUT NOT VERIFIED · **PART** = PARTIALLY IMPLEMENTED · **NI** = NOT IMPLEMENTED

| Pillar | Delivered | Status |
|---|---|---|
| World | **Real central Kanpur from OpenStreetMap** (bbox 26.448–26.492 N, 80.318–80.368 E; 2,937 roads / 488 km, 193 rail ways, 1,419 footprints + procedural infill shophouses, 16 parks, Ganga bank), streamed in 250 m tiles; Hindi/English shop boards, hoardings, bunting, poles and wires, thelas, chai stalls; CC0 textures + HDRI sky by hour; shader sky with sun/moon/stars; real IST clock shared by all players | CV (spawn district, Nayaganj, Kanpur Central); outer areas INV |
| Railway | OSM main line + Anwarganj branch, ballast/sleepers/rails, 49 real level crossings with barriers, bell, lights and a physical gate when closed; Kanpur Central + Anwarganj station buildings (stylised Indo-Saracenic), platforms with canopies; one clock-driven train (18 m/s, 40 s halts, doors open, horn) | crossings CV; train/halts INV; announcements NI |
| Character | Creator (body, skin, hair ×6 incl. ponytail/bun/long, outfits incl. kurti/dupatta/bindi, shoes, accessory); avatar v3 with rounded limbs, blink, squash/stretch, smile; 15 animation states; footstep/landing dust | CV |
| Movement & camera | Rapier kinematic controller (walk/run/sprint/jump), smoothed velocity, server reconciliation with explicit `correct`; camera modes C (3rd/close/far/1st), look-back Q, sprint FOV, turn lean | movement CV; camera modes INV |
| Vehicles | 10 kinds (hatchback, sedan, SUV, bike, scooter, auto, e-rickshaw, bus, truck, taxi); real-velocity feedback, per-kind spawn height, R reset, wheel spin/steer, brake/head lights, tyre dust; driver + passenger | hatchback/auto/e-rickshaw CV; others INV; ownership/customisation NI |
| Traffic & crowd | Ambient traffic of all kinds on real road segments, yields to players; 12–22 crowd walkers on pavements; deterministic on the shared clock | CV (visual); not networked obstacles → PART |
| NPCs | 10 named NPCs with patrol/notice/talk/react/idle-bark states, greeting wave, 54 lines × 3 languages with Edge neural voices + subtitles (Devanagari + roman) | CV |
| Animals | cows (wander, sit, head-turn), street dogs, pigeon flocks, crows on wires | cows CV; others INV; monkeys/buffalo NI |
| Missions | 14 Kanpuriya missions: tutorial, Moti Jheel loop, laddu delivery, Mall Road dash, photo walk, station taxi, chai pe charcha, **phatak pe sabra, Ghantaghar time trial, sabzi run, station drop, Lal Imli hunt, park selfie, shaam-e-jheel**; server-validated checkpoints, timers, rewards; missions log (J), compass objective | log CV; tutorial/checkpoints CV (earlier); new 7 INV; wanted/police NI |
| Economy & social | Coins/XP/levels, Naveen Market shop, chat (proximity + party), emotes, friends/party/mute/block/report | CV |
| Multiplayer | WebSocket, server-authoritative, 20 Hz, rooms of 32, origin allow-list with wildcard, per-IP caps, reconnect with token | CV (2 public sessions) |
| UI | Landing with skyline, language gate (English/हिंदी/कनपुरिया), menu, staged loading with progress, error screen, HUD with compass/speedo/minimap, photo mode, inventory, settings (audio sliders, quality, accessibility), touch controls | CV except photo/inventory/touch INV |
| Persistence | File store (dev/Render `/tmp`) or MongoDB Atlas (`MONGODB_URI`); least-privilege DB user | Atlas wired, verification pending at report time — see FINAL_DEPLOYMENT_REPORT |
| Deployment | GitHub `AradhyaDixit18/kanpurverse`; Vercel `kanpurverse.vercel.app` (auto-deploy on push); Render Free `kanpurverse-server.onrender.com` (Docker, Singapore); GitHub Actions for CI, voices, OSM/asset fetch, headless visual smoke | CV |
| Security | zod-validated messages, HMAC guest tokens, rate limits, speed/teleport rejection, profanity + PII filter, no secrets in repo, DB creds server-only | CV (code review + scan) |

## Phases (mega-prompt A–I) and outcome
A Research & map data — done (OSM pipeline, `KANPUR_MAP_RESEARCH.md`, accuracy audit) · B World rebuild on real geometry — done · C Railway — done (announcements pending) · D Vehicles + physics fixes — done · E Traffic/NPC/animals — done (behaviour states partial) · F Voices — done · G Gameplay/missions — done (wanted system not started) · H Graphics/perf — done (quality tiers, IBL, post, streaming) · I Testing/deploy/docs — done; see `QA_REPORT.md`, `FINAL_DEPLOYMENT_REPORT.md`.

## Post-MVP roadmap
Account linking (email magic link), more districts (Kakadeo, Swaroop Nagar, Bithoor ghats), trains at Central, weather, radio with original music, photo mode sharing, leaderboards UI, vehicle colours/upgrades, Kanpuriya voice lines recorded by real actors, moderation dashboard.
