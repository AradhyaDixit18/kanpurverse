# KanpurVerse — Codex engineering status report

Initial takeover and repair batch, started 7 November and updated 8 November 2026 (IST). **The full multi-milestone product overhaul is not complete.** This required report is maintained as a current evidence record; its filename does not mean release certification.

Status vocabulary: COMPLETED AND VERIFIED · IMPLEMENTED BUT NOT VERIFIED · PARTIALLY IMPLEMENTED · BLOCKED · NOT IMPLEMENTED.

## Imported implementation and handoff

**COMPLETED AND VERIFIED:** Existing clean repository at `4ae5272` was preserved, fetched and compared with `origin/main` (0 ahead / 0 behind), backed up to `work/takeover/pre-codex.bundle`, and branched to `codex/kanpurverse-stability-and-visual-overhaul`. All code changes extend the existing Next/React/Three/Rapier/WebSocket architecture. No production reset, force push, secret commit, production database write/delete or infrastructure migration.

22 local Markdown sources indexed, including both historical final reports, QA/performance, architecture, gameplay/vehicles, geographic audits, UI, NPC, voice/security and deployment documents. Existing maps, dialogue libraries/manifests, asset licences and screenshot inventory retained. No Claude conversation export was present in the project. Historical claims are attributed in `CODEX_PROJECT_HANDOVER.md`; contradictions are explicitly recorded.

## Baseline and current validation

| Check | Baseline | After repair batch | Evidence |
|---|---|---|---|
| Typecheck | PASS | PASS | `npm run typecheck` / verification log |
| Lint | PASS, two warnings | PASS, same two warnings | image optimization in landing; memo dependency in Props |
| Tests | Initial native Rollup module missing; after local dependency repair 19/19 PASS | 73/73 PASS | `npm test`; six suites including actual Rapier WASM and real WebSocket clients |
| Production build | PASS | PASS | `npm run build`; `/play` ~150 kB first-load JS, not total assets or total game bundle |
| OSM extract | PASS | unchanged, PASS | Python `--check`: 2,937 roads, 193 rails, 1,419 buildings, 49 crossings, seven stations |
| Git whitespace | clean | PASS | `git diff --check` |
| Secret-pattern scan | zero high-confidence matches across reachable history | no credentials added | `work/takeover/secret-scan.json`; not a comprehensive credential/security audit |

Full final verification log: `work/takeover/verify-final.log`. Native Rollup fix used `--no-save --package-lock=false`; manifests and lockfile were not changed for that environment repair. Tests use file persistence and isolated development data, never Atlas production data.

## Defects, causes and repairs

Full reproduction/expected/actual/source/cause/fix/regression records: `CODEX_DEFECT_INVENTORY.md` (KV-001–027).

**COMPLETED AND VERIFIED in isolated automated regressions:**

- Applied steering to chassis quaternion as well as travel velocity; the old rotation statements were commented out.
- Moved character/vehicle motion to fixed 60 Hz before-physics callbacks. Equivalent tick progression tested at 30, 60 and 144 render FPS.
- Corrected chassis contact friction combining and removed duplicate generic drag from the arcade model. All ten vehicle categories accelerate, steer, brake, reverse, remain grounded and stop against a thin solid wall in real Rapier tests.
- Verified every vehicle category against a stationary on-foot capsule and verified character movement against a parked chassis. These are local collision fixtures, not a proof of networked moving-entity collision.
- Character fixture verifies wall blocking, jump arc and return to aligned ground contact. Occupant collider disable/re-enable fixture passes.
- Seat claims are idempotent/exclusive; failed requests preserve current occupancy; entry aligns occupant state; exit emits explicit correction. Rejected vehicle updates retain recovery timing; invalid quaternions/non-driver updates are rejected.
- Corrected inward building-wall normals and downward road-corner normals without altering footprints/materials. Three geometry regressions fail on the old code and pass after the fix.
- Turn lean is bounded; touch brake survives key polling and resets on cancel/blur; canvas listeners detach and rebind after unmount.
- `dev:server` watch command starts successfully after subcommand ordering repair.

**IMPLEMENTED BUT NOT VERIFIED in integrated browser regression:**

- Prevent network snapshots from reapplying delayed transforms to predicted dynamic rigid bodies. This cause was checked against the installed Rapier wrapper's `setRigidBodyOptions` implementation.
- Refresh yaw on authority handover; consume server vehicle corrections; clear stale interpolation/correction queues.
- Apply player exit correction before physics; chase camera reads predicted transform and excludes own chassis from collision ray.
- Stable wheel component identity across snapshots.

**PARTIALLY IMPLEMENTED:** Occupied on-foot colliders and detached avatars no longer remain inside/outside the chassis. Visible passenger/driver seat attachments, per-vehicle seat poses, entry/exit animations and obstruction-aware exits are not complete. Suppressing an invalid detached avatar is not reported as finished passenger presentation.

## Vehicle verification matrix

| Category | Automated handling / wall / ground / stationary-player / parked-character contact | Actual browser drive / passenger / network handling |
|---|---|---|
| Hatchback | COMPLETED AND VERIFIED | IMPLEMENTED BUT NOT VERIFIED |
| Sedan | COMPLETED AND VERIFIED | IMPLEMENTED BUT NOT VERIFIED |
| SUV | COMPLETED AND VERIFIED | IMPLEMENTED BUT NOT VERIFIED |
| Bike | COMPLETED AND VERIFIED | IMPLEMENTED BUT NOT VERIFIED |
| Scooter | COMPLETED AND VERIFIED | IMPLEMENTED BUT NOT VERIFIED |
| Auto-rickshaw | COMPLETED AND VERIFIED | IMPLEMENTED BUT NOT VERIFIED |
| E-rickshaw | COMPLETED AND VERIFIED | IMPLEMENTED BUT NOT VERIFIED |
| Bus | COMPLETED AND VERIFIED | IMPLEMENTED BUT NOT VERIFIED |
| Truck | COMPLETED AND VERIFIED | IMPLEMENTED BUT NOT VERIFIED |
| Taxi | COMPLETED AND VERIFIED | IMPLEMENTED BUT NOT VERIFIED |

The retained simulation is an arcade yaw-only chassis model, with procedural wheels. Suspension, tire contact solver, differentiated vehicle mass/centre of mass, damage and bicycles were not added. Collider dimensions still need visual mesh audit (notably rickshaw canopies and bus/truck roofs).

## Actual browser, multiplayer and mobile

**PARTIALLY IMPLEMENTED / limited current verification:** The local game loaded in the real in-app browser, rendered the city/avatar/HUD and showed one online with 0–1 ms local ping. Two current screenshots were visually inspected in tool output (world and pause overlay). This was not a controlled full driving playthrough; no new saved screenshot/recording artifact or complete UI matrix is claimed. Existing historical screenshot files remain historical evidence.

**COMPLETED AND VERIFIED locally:** Existing real-server/two-independent-WebSocket-client tests pass for joining, snapshots/movement, chat/PII/profanity, leaving, exclusive driver/passenger state, mission reward/profile reconnect, malformed messages/flood rejection and post-correction recovery. Added room tests cover seat/exit/update validation.

**IMPLEMENTED BUT NOT VERIFIED:** Two independent current browser sessions, public vehicle synchronization, passenger presentation, background-tab recovery, three-plus-player load and cross-device latency. Historical public two-player results are not counted as new verification.

**IMPLEMENTED BUT NOT VERIFIED:** Physical phone/tablet controls, touch camera, responsive HUD during driving, mobile performance and sustained play. Input EventTarget tests are not device testing.

## Visual, UI, city, audio and missions

| Area | Status | Current evidence / remaining work |
|---|---|---|
| Character turn / wheel stability / chase behavior | PARTIALLY IMPLEMENTED | core rendering fixes above; integrated visual review pending |
| Premium landing/menu/HUD/creator overhaul | NOT IMPLEMENTED | deferred until open P1s repaired; existing working UI preserved |
| City material/lighting/facade overhaul | NOT IMPLEMENTED | existing OSM/procedural world preserved |
| Geographic audit | PARTIALLY IMPLEMENTED | existing geographic report reviewed, extract validated; lake/outer areas/elevation not repaired |
| NPC/animal navigation and collision | PARTIALLY IMPLEMENTED (inherited) | path visuals exist; complete obstacle avoidance and physical/network authority absent |
| Rail crossings/trains | IMPLEMENTED BUT NOT VERIFIED | source and historical QA only; new playthrough required |
| Audio / three languages | PARTIALLY IMPLEMENTED (inherited) | libraries/MP3s retained; code silently falls back to browser voice, contradicting guide; not repaired in first batch |
| Newer mission playthroughs | IMPLEMENTED BUT NOT VERIFIED | automated tutorial reward test passes; seven newer mission playthroughs pending |

## Performance measurements

**PARTIALLY IMPLEMENTED:** Current production-build sizes recorded; fixed-step determinism checked. No new representative FPS/frame-time distribution, memory, draw-call, NPC cost, network throughput or load test was performed. Local HUD ping 0–1 ms is a local observation only. Historical 59–61 FPS from `PERFORMANCE_REPORT.md` is not a current achievement. A measured 60 FPS target is not claimed.

## Security and service handover

**COMPLETED AND VERIFIED:** GitHub initially still listed `kanpurverse-push-temp`. After user confirmation, reauthentication and user-assisted final deletion, a refreshed owner token page showed “No fine-grained tokens created” without an error banner. The old PAT was not used or retrieved. Git helper is `osxkeychain`; metadata-only lookup found no accessible matching owner GitHub internet-password entry. This does not certify that every Keychain item is absent.

**PARTIALLY IMPLEMENTED:** All reachable Git revisions scanned for high-confidence GitHub token/private-key/Mongo-password patterns: zero matches; no entropy/comprehensive scanner claim. Detailed npm audit reports 14 advisories (8 moderate, 4 high, 2 critical) including ws/zod and build/test dependencies. Exposure and compatible updates still require triage. No forced major upgrades.

**COMPLETED AND VERIFIED, narrow scope:** Production landing returned HTTP 200. Production `/health` returned HTTP 200, `protocol:1`, `storage:"mongo"`; first observed response took 22.63 seconds and server uptime was ~12 seconds. This supports a possible cold start, not a universal 40-second claim. Atlas read/write restoration, indexes/TTL, backups and dashboard configuration were not independently tested. Existing code stores numeric mission-log timestamps despite a Mongo TTL index: inspect TTL semantics in a separate database repair before claiming expiry works.

## GitHub and deployments

Repository: https://github.com/AradhyaDixit18/kanpurverse

Production web: https://kanpurverse.vercel.app

Production server: https://kanpurverse-server.onrender.com

Owner-account GitHub API confirms repository push/admin permission and baseline Vercel commit status success. Use the existing owner OAuth session explicitly without changing globally active GitHub account. Development commits and preview status are appended below after push. **No production merge or deployment was performed.** Backend changes need a matching isolated server test environment before preview gameplay can be certified.

## Milestone status and next gate

1. Technical takeover — PARTIALLY IMPLEMENTED: local/code/document/Git/HTTP audit complete; authenticated deployment/Atlas dashboards and full conversation export unavailable/unreviewed.
2. Critical repairs — PARTIALLY IMPLEMENTED: first batch with 73 passing tests; ambient/remote entity contact, safe exits, visible seat rigs, collision authority and browser playthroughs remain open.
3. Visual/UI overhaul — NOT IMPLEMENTED as an overhaul.
4. City simulation — PARTIALLY IMPLEMENTED (inherited); overhaul not started.
5. Audio/missions — PARTIALLY IMPLEMENTED (inherited); current full playthrough not done.
6. Performance — PARTIALLY IMPLEMENTED; representative measurements pending.
7. Regression — PARTIALLY IMPLEMENTED: automated suite expanded; browser/mobile/load matrix incomplete.
8. Release — NOT IMPLEMENTED; production remains unchanged.

Continue with P1 collision authority and safe exits, seat-local occupant rendering and actual multi-browser driving regressions. Do not treat a green unit/build suite as permission to certify all gameplay or skip to optional visual features.

## Development commit provenance

- [68779b8 — docs: record Codex takeover baseline and prioritized defect inventory](https://github.com/AradhyaDixit18/kanpurverse/commit/68779b857a8618afa8ce8ebc42bb3780d98d5c8a)
- [05eeb80 — fix(server): preserve seat authority and reconcile vehicle exits](https://github.com/AradhyaDixit18/kanpurverse/commit/05eeb80b6655b42ec9dd998228cf4b0d5185948c)
- [5b77947 — fix(game): stabilize fixed-step driving, prediction and character contacts](https://github.com/AradhyaDixit18/kanpurverse/commit/5b779471ab5bd4be7106cef9dfcb3673af6de587)

- [ddbcba1 — correct facade and road-joint normals](https://github.com/AradhyaDixit18/kanpurverse/commit/ddbcba129a73a9b1a7a0d6f8795f280c0f40b0bf)

Remote verification of first pushed batch (`e7c1163`): [GitHub CI passed](https://github.com/AradhyaDixit18/kanpurverse/actions/runs/42402139966); [Vercel preview build completed](https://vercel.com/aradhu74s-projects/kanpurverse/7nEPstHPwZ9Tr6MtsP7BZvM6Vbwt). This is build/deployment status, not independent gameplay verification, and predates the geometry follow-up. Final local `npm run verify` includes the geometry fix: 73 tests, typecheck, lint and production build passed. Main remains `4ae52721a94ebeca70705552db8a588954a8caa6` (verified with `git ls-remote`).

Final remote check for code revision `2d49c7436925b024b28eea8666a335982b7fc986`: [GitHub CI completed successfully](https://github.com/AradhyaDixit18/kanpurverse/actions/runs/42402542169), including all 73 tests and production build. [Vercel preview deployment completed](https://vercel.com/aradhu74s-projects/kanpurverse/Frfzq1CFPKrXyuTWtdYbnuKVGdKf). Preview gameplay/backend compatibility remains unverified. This final evidence update changes documentation only.


# Phase 2 continuation — 8 November 2026

PARTIALLY IMPLEMENTED. User's full Phase 2 request is an ongoing multi-milestone scope, not completed by this safety/seat batch.

- Fresh inherited baseline: 73 tests plus typecheck/lint/build passed. Audit of 22 systems and ordered implementation gates created in PHASE_2_GAMEPLAY_AUDIT.md / PHASE_2_IMPLEMENTATION_PLAN.md; all requested topic reports created/maintained.
- Safety milestone `e8028a8`: geometry-aware local exit candidates plus bounded server validation, stop-before-exit/entry, blocked-seat retention, reliable disconnect release and exit reconciliation. 104 tests and production build passed. Production-mode QA route returned 404. No production database touched.
- New actual-browser defect: the 8km ground cuboid caused 0.2791m KCC penetration at real city coordinates. Real WASM reproduced the exact value; streamed 128m contact tiles and refreshed placement queries fix it, including seam/outer-city regression cases. Browser exit feet now y≈0.00.
- Visible seating milestone: shared roots for all ten kinds; occupants attached to vehicle transforms, hollow cabins/windows, initialized seated pose, seat-local first-person view and stable mobile exit control. Twenty geometry/rotation tests plus three compatibility tests added; existing tests retained (127 total before final verification).
- Two independent browser identities completed an isolated shared hatchback ride: exclusive driver claim, passenger entry, steering/replication, blocked/moving-exit recovery, braking and grounded driver/passenger exits. Actual frames and WebM are saved in docs/screenshots/phase2 and linked from PHASE_2_QA_REPORT.md. This is not a full city/public multiplayer playthrough.
- New previews fail closed for vehicle entry on an old server via an advertised exit capability. A matching public backend preview remains unverified: Render preview UI did not finish rendering; the installed Vercel CLI account was outside scope and was not used for project operations. No production changes or purchases.
- Open priority work: complete replicated/ambient collision authority, safe spawn/infill parity, remaining vehicle visual playthroughs, navigation/traffic/rail integration, economy validation, meaningful missions, full UI/audio, representative performance, physical mobile and public matched-backend QA.

See PHASE_2_QA_REPORT.md for precise evidence/limits; VEHICLE_AND_PHYSICS_REPORT.md for collider and authority gaps. No full-Phase-2 completion or release certification is claimed.

## Final local verification for this batch

COMPLETED AND VERIFIED: `npm run verify` passed **127/127 tests across ten suites**, typecheck, lint (the same two inherited warnings), and production build. Evidence: `work/phase2/final-verify.log`. `/play` first-load JS is approximately 152kB from the build report, not total game assets. `git diff --check` passed.

Commits: [safety/ground e8028a8](https://github.com/AradhyaDixit18/kanpurverse/commit/e8028a8) and [visible seats / compatibility ac5a34e](https://github.com/AradhyaDixit18/kanpurverse/commit/ac5a34ea3cb0af463f7275b23a19ff4faa54779e). Public CI/preview build state is recorded separately after push; no production merge is authorized or performed.
