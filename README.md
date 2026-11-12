# KanpurVerse — Velto Studios

An original single-player browser open world inspired by Kanpur. The solo runtime needs no login, other player, WebSocket service or MongoDB connection. Download world assets once per browser session, then play locally. This is an early playable build, not a claim of AAA fidelity.

Play: https://kanpurverse.vercel.app/play

## Run

Node 20+ and npm are required. `npm install`, then `npm run dev` and open http://localhost:3000/play. `./RUN_ON_MAC.sh` starts only the web client. `npm run verify` runs typecheck, lint, tests and the production build.

## Solo story

Talk to Babloo Bhaiya near the starting point. **MISSION 01: LADDOO KA CHAKKAR** is a fictional festival caper at **Sunehri Mithai**, an original sweet shop with no real-business endorsement. Follow four checkpoints and press E for story actions. A physical festival marshal pursues during the getaway; being caught returns the player to the shop checkpoint. Completion grants coins, XP and ownership of the hatchback, and opens the existing city missions. All parked city vehicles remain usable for exploration.

Move with WASD, sprint Shift, jump Space, interact E, exit vehicle F, camera C, horn H, map M, missions J, inventory I, photo mode P, pause Esc. Touch controls remain available in Settings.

## Saves

A versioned localStorage journal with previous-valid backup is mirrored to IndexedDB. Saves include money, inventory, mission checkpoint/time budget, position, health, owned vehicles, collectibles, world time and progression. Settings and character appearance retain the existing local settings store. Continue resumes the same device/browser origin; it does not import old server accounts. New Game keeps the previous story in a separate local recovery key. Pause has a manual save button and a safe-house marker provides save/heal. Storage restrictions/private browsing can prevent reliable persistence; the game must report failed manual saves.

## Rendering

Low, Medium, High and Ultra tiers scale resolution, shadows, population and architectural detail. ACES rendering, original road-edge planting, textured streamed OSM buildings, nearby instanced facade trim/glass/metal, physical vehicle paint, daytime/sunset/night atmosphere, high-tier ambient occlusion and restrained post-processing. The map, buildings, characters and vehicles remain stylized approximations. The sweet-shop interior is original code-authored geometry.

## Architecture and rollback

- `apps/web/src/net/client.ts`: local gameplay adapter used by existing controllers; no network connection.
- `apps/web/src/state/soloSave.ts`: validated versioned local save journal.
- `apps/web/src/game/StoryWorld.tsx`, `FestivalChase.tsx`: original shop, collectible, safe-house marker and physical staged chase.
- `packages/shared`: existing map, vehicle, mission and dialogue definitions.
- `apps/server` and `legacyClient.ts`: preserved historical multiplayer implementation and rollback tests. Not part of the active solo client. Existing Render data/service have not been deleted.
- `FEATURES/Graphics_Baseline`: separate ignored Git worktree at pre-upgrade b37f576, retained for comparison and rollback. Do not add it as a submodule.
- `docs/KANPURVERSE_CURRENT_STATE_AUDIT.md` and `docs/visual-overhaul`: audit, measurements and delivery status.

## Repository migration

The preferred target is `velto-studios/kanpurverse`. GitHub currently shows the original repository transfer **pending recipient acceptance**. Until acceptance is verified, the personal origin remains the documented deployment source and backup. No force-push, repository deletion, security change or forged signoff is used to bypass that requirement.

## Licences

Map © OpenStreetMap contributors, ODbL. Existing ambientCG / Poly Haven textures and HDRIs are CC0. Fonts are OFL. Original procedural models, mission and code are retained in the project. No GTA assets, music, map or proprietary code are used.
