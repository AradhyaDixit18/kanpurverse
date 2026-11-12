# KanpurVerse solo-story and visual upgrade — delivery status

Work began 12 November2026; report13November2026 (India time). Actual project root: `/Users/aradhyadixit_74/Desktop/VeltoStudios/KanpurVerse`. No Sirak resource was accessed. No existing project file, repository, deployment or historical data was deleted. Baseline b37f576 remains in Git and an ignored detached worktree under FEATURES/Graphics_Baseline.

## Status summary

**COMPLETED AND VERIFIED**
- Project and dependency audit; source/target GitHub account identities verified in Brave and the exact Chrome profile from the supplied screenshot.
- Original world/controller/vehicles/NPC/dialogue/inventory architecture inspected; audit in KANPURVERSE_CURRENT_STATE_AUDIT.md.
- Local gameplay adapter and save validation exercised by automated tests. Multiplayer legacy tests retained against an explicitly archived adapter.
- A local browser session launched without a WebSocket connection, walked to Babloo, started the original first story mission, entered Sunehri Mithai, completed all four objectives and received650coins/300XP. A full page reload and Continue restored850totalcoins and300XP.
- That manual mission run preceded the later physical-marshal addition. It does **not** verify the final chase implementation.
- Complete verification output is saved in typecheck.txt, lint.txt, test-output.txt and build.txt. Final counts and exit status must be checked against these actual files; do not infer pass from this report.

**IMPLEMENTED BUT NOT FULLY TESTED**
- Local solo profile, versioned validated save journal, previous-valid backup, unreadable-save preservation, separate prior-story backup on New Game, IndexedDB mirror,5-second autosave, page-hide save, manual save and safe-house save/heal.
- Save data: position, money/XP/level, inventory/civic score, missions/checkpoint/remaining time, owned vehicles, collectibles, health and local world time. Settings and appearance retain the existing local preferences format. No cloud save or old remote-profile import.
- No active lobby/chat/social/party controls, remote avatars or multiplayer startup in the solo client. Archived Node/Mongo source and Render service are preserved for rollback and not called by core play.
- Original LADDOO KA CHAKKAR mission, staged fictional festival caper, ordered interactions, checkpoint persistence, timed failure, mission-result banner, repeat reward reduction, first-story completion gate for14existing city missions, hatchback ownership reward.
- Physical festival marshal uses the existing Rapier pedestrian controller; being caught costs10health and returns to the shop checkpoint. Final escape/catch behavior needs browser QA.
- Original enterable Sunehri Mithai shop: teal/brass/stone architecture, bilingual signage, counters,72sweets, shelves, interior lamps, rotating golden-laddoo prop, visual shopkeeper. No real logo/name/endorsement is used. The shopkeeper model is visual; the mission dialogue is with Babloo. No interactive opening door has been added; the entrance is walk-through.
- Festival token collectible with50coin reward and persistence; safe-house marker. Existing clothing/paan shops and free-use parked vehicles retained. Ownership is a registry/reward, not a complete garage-upgrade economy.
- Four graphics tiers, physical vehicle clearcoat and rounded car body, separate reflective facade glass/metal, expanded instanced facade detail, road-edge planted canopy, night light pools, quieter sky/haze, tighter sun-shadow frustum, high-tier SSAO with required normal pass, restrained bloom/grade/vignette, original styled solo HUD, master audio slider, local day/sunset/night atmosphere selector.
- Shop static meshes are batched and pedestrian detail falls back at distance. Shader/scene changes after the initial browser run need final visual inspection.

**BLOCKED / NEEDS MY ACTION**
- Repository transfer: GitHub source settings explicitly show “This repository is being transferred to @velto-studios.” The target still returns404 to the verified target account. Reissuing transfer returns422 “Repository has already been taken” because the pending transfer reserves the name. The receiving account must complete GitHub's transfer-acceptance step. No abort, forced mirror, ownership workaround, visibility change or security reduction was attempted.
- Chrome automation connection detached during final QA. Existing-tab recovery, native controls and a fresh CUA session did not restore inspectable production gameplay. The reported connection state was “Debugger unattached.”
- Final production smoke test, complete chase/catch test, final tier/night/vehicle regression, new gameplay recording and matched before/after performance comparison remain unverified. The new build has **not** replaced the live production game.

**IN PROGRESS / REMAINING**
- Production-quality human rigs, full high-detail vehicle replacement, vehicle entry/exit animation, suspension/damage presentation, varied district-authored facade art, reflection-quality riverfront, richer building interiors and polished cutscenes.
- A long continuous main-story campaign beyond the first caper; investigation and further story chapters. Existing city missions are side missions with a first-story gate.
- A complete wanted/police system (optional in brief), new garage purchases/upgrades, sophisticated navigation/intersection simulation and interactive building doors.
- Full lower-power/mobile and extended city-driving testing, all named districts, dense market, night, chase, loading/memory profiling. No60FPS or “perfect”/AAA-quality claim is made.

## Engineering and files

Core inspected: package.json, packages/shared protocol/world/vehicles/streetLife/dialogue definitions; Game, Sky, Effects, OsmCity, FacadeDetails/facadeKit, Player/characterPhysics, Vehicles/driving, NPCs/pedestrianPhysics/usePedestrianBody, Props/StaticBatch, Animals, Missions, StreetLife, syncedClock/WorldClock, store, net/client, Menu/HUD/Settings/Dialogue, audio/sfx/voice, development capture/profiling, server room/storage/auth and deployment configuration.

New code: state/soloSave.ts, game/StoryWorld.tsx, game/FestivalChase.tsx, game/Boulevard.tsx, net/legacyClient.ts (archived original transport), tests/solo.test.ts. Existing source was extended rather than replacing the OSM map or controller. RUN_ON_MAC.sh and root dev command now run only the web client. Metadata and landing copy describe solo play. Legacy server test coverage is intentionally retained; it does not mean multiplayer remains in the active client.

Known design limits: localStorage is the load authority; IndexedDB is a mirror, not a separate restore UI. Browser storage disabled/full can prevent saves; manual save does not claim success on failure. Parked vehicles reset to their original world spawns when resuming; player location and ownership persist. NPC mood and spit decals remain lightweight local simulation. No service worker/offline asset-install package: initial asset downloads still need the web host, though core play has no multiplayer-server requirement.

## Graphics evidence and performance

- Reference reel actually played in the supplied Chrome profile. It is a sweets-shop website presentation, not an open-world rendering benchmark. No reference assets were copied.
- `evidence/before-mall-road.png`: actual preserved renderer capture. It is baseline evidence, not an after image.
- Initial new-browser screenshots were visually inspected during implementation, including the sweet-shop interior. Final after screenshots and demonstration video were not saved/verified before the browser detached. No generated concept art is presented as gameplay.
- Raw sample `captures/street-1794507352473.json`:36.18FPS average,p95 47ms at Medium,1084×737CSS/1355×921buffer,DPR1.25,724frames over20.013s; initial code before batching/LOD refinements. Foreground state could not be independently established, and other applications/compilers were active. This is diagnostic data, **not an accepted benchmark or proven speedup**.
- One baseline camera sample was inside a building and excluded. Prior11November56.51FPS was under different conditions and is not a matched comparison. AppleM2,8GB,Chrome157. No final average/minimum/load-time/memory result is certified.

## Migration and deployment

Original: https://github.com/AradhyaDixit18/kanpurverse
Target: https://github.com/velto-studios/kanpurverse (pending acceptance, not verified as migrated).
Source default branch main; existing three remote branches, no tags/releases/open issues at audit. No deploy keys or Actions secret names returned. Full history preserved. Local origin remains original while acceptance is pending.
Existing public game: https://kanpurverse.vercel.app/play — still the previously released build.
Existing integrations: Vercel main client and Render Docker main server. No production service was deleted or relinked. No credentials, secrets, account security settings or paid plans changed. A draft review branch/PR is the appropriate staging destination until final browser QA and ownership acceptance are complete.

## Next release gate

1. Restore the ChatGPT browser-control connection in the supplied Chrome window.
2. Run the final production build, complete both successful and caught getaway paths, verify vehicles and pause/save/continue, inspect all graphics tiers and atmosphere settings.
3. Capture actual after images/video and repeat valid matched performance scenes in foreground with one build running.
4. Accept GitHub transfer, verify target owner/default branch/commit/history, then update origin and Vercel integration without deleting the working deployment.
5. Merge and deploy only after critical runtime checks pass; verify the actual production source revision and gameplay. Do not infer a release from a successful compile alone.
