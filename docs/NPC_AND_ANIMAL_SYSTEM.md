# NPC and Animal System — v0.5

## Named NPCs (10) — `packages/shared/src/world.ts` NPCS
Babloo Bhaiya (guide), Munna Chaiwala (cafe), Raju Auto, Gupta ji (Naveen Market), Singh Saheb (police), Priya (Moti Jheel), Aman, Sunita ji (Naveen Market), Vikas, Rekha (Kanpur Central). Each has a patrol path (or a fixed post), a voice profile and a dialogue set in three languages.

Behaviour states (`NPCs.tsx`): **patrol** (follow path, smooth turning) → **notice** (player within 3.5 m: face the player, wave once per 15 s) → **talk** (dialogue open: talk animation, head tracking) → **react** (bump within 0.9 m: a reaction line, 6 s cooldown) → **idle bark** (player within 14 m, every 20–45 s, mission‑/role‑specific lines; time‑of‑day lines `any.greet_morning` / `any.greet_evening` and `any.crossing_wait` near gates). Fidgets: laugh/idle variations on a timer.

## Ambient crowd
12–22 walkers (by quality) on the pavements of road segments near the player, deterministic on the shared clock, re‑seeded when the player moves 120 m. Appearance from a seeded generator (gender, skin, hair, outfit). Status: COMPLETED AND VERIFIED visually (Brave).

## Animals (`Animals.tsx`)
| Animal | Behaviour | Count | Status |
|---|---|---|---|
| Cows | loop‑wander with pauses, head turns toward nearby players, tail swish; 1 in 3 sits | 4–8 near the spawn district | COMPLETED AND VERIFIED (seen in Brave) |
| Street dogs | trot along pavements, rest every 4th cycle, leg animation | 3–6 | IMPLEMENTED BUT NOT VERIFIED |
| Pigeons | instanced flocks circling parks, land in waves | 2 flocks (18–24) | IMPLEMENTED BUT NOT VERIFIED |
| Crows | perched on wires near cafes/markets/temples | ~9 | IMPLEMENTED BUT NOT VERIFIED |
| Buffaloes, monkeys, sparrows, squirrels | — | — | NOT IMPLEMENTED |
Ambient animal sounds: NOT IMPLEMENTED (only engine/horn/train/bell/footsteps/UI are synthesised).

## Shopkeepers and stalls
Chai stalls (Munna Tea Stall board), thelas with fruit/vegetables, cycle‑rickshaws, parked cycles and carts are placed along real road frontages near the player (`Props.tsx`); rooftop hoardings with Hindi/English ads; festival bunting across main roads. Vendors as interactive NPCs beyond the named ten: NOT IMPLEMENTED.

## Performance
All ambient agents are updated in `useFrame` with cheap math; avatars are primitive meshes (~24 draw calls each). Budget: ≤ 40 avatars on Medium.
