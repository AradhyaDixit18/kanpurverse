# KanpurVerse — Codex project handover

Authoritative transition record. Audit started 7 November 2026 (IST). Ongoing engineering work; this is not a release certification.

## Preservation and baseline

- Existing project: `~/Desktop/VeltoStudios/KanpurVerse/`. Initial branch `main`, clean tracked/untracked status; commit `4ae5272` (full SHA: run `git rev-parse 4ae5272`). `git fetch origin` succeeded; `git rev-list --left-right --count HEAD...origin/main` returned `0 0` before branching. Remote: https://github.com/AradhyaDixit18/kanpurverse. Sources: takeover terminal audit, Git history.
- Development branch: `codex/kanpurverse-stability-and-visual-overhaul`. Git backup: `work/takeover/pre-codex.bundle`; no reset, force-push, production mutation or data deletion. Sources: `git switch`, `git bundle create`.
- Initial `npm run verify`: typecheck passed; lint passed with two warnings (`app/page.tsx` image optimization; `Props.tsx` memo dependency). Test startup failed: missing `@rollup/rollup-darwin-arm64`. Repaired installed dependencies with matching Rollup native package using `npm install --no-save --package-lock=false`; no manifest/lock changes. Rerun: **19/19 tests passed**. Separate baseline `npm run build`: passed, `/play` 150 kB first-load JS. Node 24.18.0; CI targets Node 22. Sources: terminal commands, `package.json`, `.github/workflows/ci.yml`.
- `python3 scripts/geo/fetch_kanpur_osm.py --check`: passed, 2,937 roads, 193 railways, 1,419 buildings, 49 crossings, seven stations. Source: validator output and `public/geo/kanpur.json`.
- HTTPS checks: landing returned HTTP 200 (20,173 bytes, 1.59 seconds); Render `/health` returned 200 after 22.63 seconds with `ok:true`, `protocol:1`, `storage:"mongo"`, no rooms and uptime ~12 seconds. Cold-start interpretation is an inference from latency/uptime, not a measured service guarantee. Sources: Python urllib probes. These checks do not prove gameplay or persistence round trips.

## Imported sources and precedence

All Markdown handoff documents in `docs/`, root `README.md` and root `FINAL_PROJECT_REPORT.md` were inventoried. Complete source index and file inventory are under `work/takeover/`. Primary implementation evidence takes precedence over historical reports.

- Latest historical handoff: `docs/FINAL_DEPLOYMENT_REPORT.md` (v0.5.3), `QA_REPORT.md`, `PERFORMANCE_REPORT.md`, `PROJECT_BLUEPRINT.md`.
- Architecture: `TECHNICAL_ARCHITECTURE.md`, `MULTIPLAYER_ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `SECURITY_AND_MODERATION.md`.
- Game/design: `VEHICLE_SYSTEM.md`, `GAMEPLAY_DESIGN.md`, `UI_UX_DESIGN.md`, `NPC_AND_ANIMAL_SYSTEM.md`.
- Geography/assets: `KANPUR_MAP_RESEARCH.md`, `KANPUR_GEOGRAPHIC_ACCURACY_AUDIT.md`, `geo_provenance.json`, texture/font licences, dialogue manifests.
- Audio: `VOICE_SYSTEM.md`, `KANPURIYA_DIALOGUE_GUIDE.md`, three dialogue libraries, `scripts/generate_voices.py`, `apps/web/src/audio/voice.ts`.
- Deployment: `GITHUB_DEPLOYMENT_REPORT.md`, `VERCEL_DEPLOYMENT_REPORT.md`, `deployment/*`, `.github/workflows/*`, `apps/web/vercel.json`.
- Existing screenshots: `docs/screenshots/`, `apps/web/public/screenshots/`. Historical screenshots are not current regression evidence.
- No Claude conversation export was found within the project. No claim is made to have read one. Export is not needed to diagnose the directly observable code defects below; request it if an unresolved design decision depends on prior discussion.

## Verified architecture

Preserve npm workspaces (`apps/web`, `apps/server`, `packages/shared`). Web: Next 15.5.29, React 19.1.1, Three 0.180, React Three Fiber 9.3, Rapier wrapper 2.1. Server: persistent Node WebSocket process with zod protocol, room snapshots at 20 Hz, Mongo adapter/file fallback. Sources: three package manifests, `Game.tsx`, `net/client.ts`, `server/src/index.ts`, `room.ts`, `storage.ts`, shared `protocol.ts`.

Important limitation: physics is client simulated. Server validates bounds/displacement and owns seats/economy/rewards, but does not simulate collision geometry. It is inaccurate to call this fully server-authoritative physics. Source: `room.ts:onState/vehicleState`.

Vehicles have ten procedural models, arcade yaw-only rigid bodies and cuboid colliders. Ambient traffic, NPCs, animals and remote avatars do not provide a complete physical obstacle system. Sources: `Vehicles.tsx`, `Traffic.tsx`, `NPCs.tsx`, `Animals.tsx`, `Remote.tsx`.

## Contradictions resolved

- Older deployment/database reports say unavailable; the newer report claims deployed. Current HTTP health confirms a Mongo adapter is active, but database contents, permissions, TTL and restore behavior need independent verification.
- Latest dialogue guide claims no silent fallback; actual `voice.ts` silently calls browser speech synthesis on missing/error audio. Implementation is the source of truth; repair remains queued.
- Latest vehicle report claims rotation is applied; `Vehicles.tsx` actually comments out both `q.setFromAxisAngle` and `rb.setRotation` after an inline comment. This is a verified source defect and first repair priority.
- Final report claims temporary PAT revoked. Current GitHub fine-grained-token page still lists **kanpurverse-push-temp**, expires 14 Nov 2026, never used. Historical revocation claim is false for the currently listed token. After user reauthentication/deletion, a fresh GitHub token-list reload showed “No fine-grained tokens created” with no error banner: remote removal verified.
- Package versions remain 0.1.0; v0.5.3 is a report label, not a package version/tag proven by this audit.
- Historical 59–61 FPS, mobile and public two-player claims have not been reproduced by Codex. Keep historical measurements attributed; do not reuse as current measurements.

## Deployment and security boundary

Vercel serves the web client; Render Docker hosts persistent WebSockets. Source config: `deployment/render.yaml`, `Dockerfile.server`, `apps/web/vercel.json`. Actual dashboard settings, preview configuration and Atlas access still need audit. Do not change production during repair validation.

Git helper is `osxkeychain` (system Git config). `gh` has the correct owner account available but a different account active; use the project owner explicitly for repo actions and do not switch global account state. No credential values were retrieved into logs. Credential helper presence does not prove an old PAT is absent from Keychain.

Security scan of all reachable Git revisions is recorded in `work/takeover/secret-scan.json` (high-confidence patterns only, not a comprehensive security assessment). npm install reported 13 dependency advisories (8 moderate, 3 high, 2 critical); investigate exact dependency paths before upgrades. No broad `npm audit fix --force`.

## Repair order and gates

1. Record reproducible source defects and baseline, retain existing systems.
2. Repair steering orientation and driver handover; fixed physics ticks; occupied avatar/collider and authoritative exit; atomic seat validation; vehicle correction feedback. Add real Rapier and room regressions.
3. Verify local actual browser driving/collision/entry/exit and two independent sessions before claiming P1 closure. Address moving-vehicle/player contact, world/traffic/NPC collisions and obstacle-aware exits next. Preserve production until these gates pass.
4. After P0/P1 stability: camera/animation/interaction UX, HUD/menu/landing refinement, city materials/geography, NPC/animal navigation, audio and missions, measured performance, mobile, preview then release. Later milestones remain unfinished.

See `CODEX_DEFECT_INVENTORY.md` for reproduction, causes, fixes and test scope; `CODEX_FINAL_ENGINEERING_REPORT.md` is a continuously updated status report, not a claim that the full takeover request is finished.

## First repair update

See KV-001 through KV-017 for changes and limited verification scope. New findings include snapshot-prop transforms overwriting dynamic prediction (confirmed against installed Rapier wrapper), chassis Average friction combination, touch brake overwritten by keyboard polling, and canvas listeners not cleaned up on game remount. No production configuration was changed.

Geometry follow-up (8 Nov): three failing baseline geometry tests confirmed inward building-wall normals for either polygon winding and downward road-joint normals. `worldGeometry.ts` now preserves the original footprint/UV/material pipeline with corrected winding. `tests/world-geometry.test.ts` verifies the fix; full suite now contains 73 tests.

GitHub owner Keychain internet-password metadata lookup returned no accessible matching entry; no password/token contents requested. This is not proof that all residual Keychain items are absent. Detailed npm audit returned 14 advisories (8 moderate, 4 high, 2 critical), which supersedes the install-time count of 13.

## Phase 2 continuation — 8 November 2026

Audit/plan and requested topic reports now exist under docs/PHASE_2_*.md and the vehicle/NPC/city/progression/UI reports. Safety milestone e8028a8 and visible-seat/compatibility milestone ac5a34e retain the prior repairs. Current regression total is 127; GitHub CI run 42406883286 and Vercel frontend build succeeded for code revision 017477f. The full Phase 2 scope remains incomplete.

Actual two-origin/two-identity browser fixture confirmed a shared hatchback ride, visible seats, steering/braking, rejected moving/blocked exits and grounded exits. It uncovered a reproducible 0.2791m penetration caused by the giant ground cuboid; nine streamed 128m ground colliders fix the numerical contact issue. Original frames/WebM are in docs/screenshots/phase2. New clients require an advertised exit capability before vehicle entry, preventing unsafe use against the old production backend. A matching public backend preview has not been certified; no production config, database, plan or service changed. See PHASE_2_QA_REPORT.md for limitations and evidence.

## Phase 3 continuation — 8 November 2026

Authoritative continuation sources: PHASE_3_VISUAL_AUDIT.md (initial browser evidence/root causes), PHASE_3_QA_REPORT.md (measurements/current limits), PHASE_3_ASSET_CATALOGUE.md / ASSET_FILES.json / ARCHITECTURE_ASSET_QA.json (file/licence/geometry records), PHASE_3_ART_DIRECTION.md, PHASE_3_VEHICLE_ASSET_QA.md and PHASE_3_IMPLEMENTATION_PLAN.md. Baseline verified127 tests/typecheck/lint2 warnings/build at1ec07c1. Existing Phase 2 output report copies hash-matched repository reports. Production main remained4ae52721a94ebeca70705552db8a588954a8caa6. No Claude export supplied/read.

Actual code repairs: syncedClock.ts/WorldClock.tsx and net/client.ts fix snapshot-held ambient motion; RailwayOsm.tsx shares route/schedule, corrects coach axis/world offsets/terminal spread, stable refs and door origins; Avatar/RoundedPart/roundedGeometry/DistantAvatar share bounded metric meshes with distance detail; StaticBatch.tsx/Props.tsx batch static opaque props; roadIndex.ts/roads.ts preserve query results with a spatial index; HUD.tsx limits store subscriptions; OsmCity.tsx staggers/cleans tile geometry and refreshes quality at fixed position; facadeKit/FacadeDetails implement bounded instanced near architecture while preserving footprint data. No shared hull/seat spec, protocol, economy or production config changed. Game limits DPR and removes pixelated adaptive mode. Generated tsbuildinfo untracked/ignored.

Real city stationary Medium sample moved from1110.64 to731.80 full-pass draw calls/p95 23.9 to20.5ms; geometry resources3693 to941. Average remains display-limited around60FPS on the test machine; final walking worst64.5ms, so stutter is not eliminated. Full table/JSON/source scope in Phase 3 QA report. Two independent local hatchback sessions rechecked visible seating, shared steering/braking and grounded exits; city-wide/physical mobile/public matched backend still uncertified. Original GLB reference exported169336 bytes/1234 triangles, decoded/tested and browser-inspected; closed reference shell, not an enterable asset. All ten existing vehicle models explicitly fail premium-art acceptance.

Overall phase/game remain PARTIALLY IMPLEMENTED. Enterable cafes/shops, finished vehicle/character assets, full station experience, lake/geographic corrections, long-drive/low-end-device/large multiplayer QA and production release are required unfinished gates. Local preview/review tools are development-only; production 404 smoke checks and final verification appended to QA report. No production merge/deploy/data migration or paid resource changes.

Phase 3 verification recorded:146 tests/15 suites, typecheck/lint2 warnings/build passed; production QA routes404. [Code6f15a39](https://github.com/AradhyaDixit18/kanpurverse/commit/6f15a39), [evidence e1093de](https://github.com/AradhyaDixit18/kanpurverse/commit/e1093de), [CI42446811085](https://github.com/AradhyaDixit18/kanpurverse/actions/runs/42446811085) and Vercel repository status success for that revision. Main unchanged at4ae52721a94ebeca70705552db8a588954a8caa6; branch repairs are not live on production. Subsequent changes in this final record are documentation-only. All current-task local servers stopped.
