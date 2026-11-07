# UI / UX Design

## Visual language
Velto palette: charcoal `#0B0B0D`, panel `#1C1D22`, crimson `#C8102E`, steel `#B8BCC4`, gold `#FFD23F` for mission/reward, blue `#3D8BFF` for party. Inter + Noto Sans Devanagari. Rounded 14–20 px cards, translucent HUD with blur, no UI library (hand-written CSS in `app/globals.css`, ~200 lines).

## Screens
1. **Landing (`/`)** — hero, six feature cards (content generated from the shared world data so it never drifts), map disclaimer, Play CTA. Static, 106 kB first load.
2. **Main menu (`/play`)** — logo, "playing as", room name field (friends type the same name), Play / Character / Settings / About.
3. **Character creator** — live 3D preview (orbitable), animation preview buttons, name validation (3–16 chars, reserved/profane names rejected client- and server-side), swatch pickers, Randomise.
4. **Loading** — spinner + rotating tips; errors route to an explicit error screen with the server URL and a Back button.
5. **Game HUD** — stats (coins, level, XP, online, ping, clock), mission tracker (top-right, gold bar), interaction prompt (`E …`), subtitles (bottom-centre, speaker name, Devanagari + roman), toasts, party invites, chat (bottom-left; T/Enter to type; `/help` commands), circular rotating minimap (bottom-right), vehicle hint strip.
6. **Dialogue panel** — bottom sheet: NPC name/role, line, romanisation, Continue / mission offers (with reward) / Accept / Directions / Browse shop / Leave. Esc closes.
7. **Modals** — Pause (Resume, Map, Players & party, Settings, Controls, Abandon mission, Quit), Map (full district canvas with players and mission dots), Players (invite / friend / mute / block / report per row), Shop, Garage, Help.

## Mobile
Auto-detected touch → left joystick (drag, >90% = sprint), right action cluster (E / jump / horn / brake / wave), top bar (menu, map, chat), drag anywhere on the canvas to look. Minimap and mission tracker shrink under 760 px. `viewport-fit=cover`, no zoom.

## Accessibility
Subtitles on by default (voice is additive); large-text mode (+27%); reduce-motion (camera snaps instead of lerps, no vehicle camera swing); colour-blind markers (gold → blue accents); adjustable sensitivity, invert Y; every panel closable with Esc or a visible button; all text is real DOM text (screen-reader friendly) except in-world 3D signs.

## Language
Dialogue language setting drives NPC lines, subtitles, 3D signs/landmark labels, and most UI strings (English ↔ Hindi copy pairs via `t(en, hi)`). Default **Kanpuriya Hindi** with subtitles, as specified.
