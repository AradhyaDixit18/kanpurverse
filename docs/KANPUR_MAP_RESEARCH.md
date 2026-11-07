# Kanpur Map Research

## Data sources attempted
| Source | Result |
|---|---|
| OpenStreetMap Overpass API (`overpass-api.de`, `overpass.kumi.systems`) | **Unreachable** from the build environment (network allow-list). |
| Nominatim geocoding | Unreachable. |
| Google Maps | Not used (no API key; paid beyond free tier; not permitted without approval). |
| General knowledge of Kanpur's geography | Used to hand-author a **fictionalised** district. |

Because real street geometry could not be fetched, the MVP map is **inspired by, not traced from,** central Kanpur. Everything is labelled as a tribute in-game and on the landing page. When OSM access is available, `packages/shared/src/world.ts` is the single file to replace (see "Upgrade path").

## Real-world inspiration → in-game element
| Real Kanpur | In KanpurVerse | Notes |
|---|---|---|
| Mall Road (The Mall), the main east–west spine through Civil Lines | **Mall Road** (16 m, centre line z=0) | Street name kept; it is a public road name |
| Civil Lines grid, Canal Road, Birhana Road | **Civil Lines Road, Canal Road, Birhana Road** | Generic/public road names |
| Moti Jheel lake & park (west-central) | **Moti Jheel** lake (r=48 m) + park | Place name kept (public landmark) |
| Phool Bagh (Ganesh Shankar Vidyarthi Udyan) | **Phool Bagh** | Public garden |
| Z Square Mall on Mall Road | **V Square Mall** | Renamed; no brand |
| Naveen Market | **Naveen Market** | Public market name; stalls are fictional |
| JK Temple (Radhakrishna Temple), Sarvodaya Nagar | **JK Temple** (white marble, fictionalised form) | Religious site treated respectfully; no interior |
| Kanpur Central railway station | **Kanpur Central** facade, decorative train | Public station; trains do not run |
| Ganga ghats (Bithoor / Sarsaiya) | **Ganga Ghat** riverfront on the north edge | Composite |
| IIT Kanpur gate (far north-west, actually ~15 km away) | **IIT Gate** tribute at the NW corner | Deliberately compressed geography |
| Rawatpur, Sarvodaya Nagar, Nawabganj | Road names only | |
| Green Park Stadium | Mentioned in NPC chatter only | Future district |
| Thaggu ke Laddu (famous sweet shop) | Shop sign only (tribute) | No real business depicted/endorsed |

## Scale and layout decisions
- Playable square 520 × 520 m (real Civil Lines core is ~1.5 km across); compressed so a walk across takes ~90 s at run speed and a drive ~25 s.
- 1 unit = 1 metre; Y up; +X east; +Z south. Spawn at Cafe Chowk on Mall Road (−10, 14).
- Blocks between roads are filled procedurally (deterministic seed 7) with 10–24 m buildings, 6–22 m tall; landmark exclusion zones keep them clear.

## Cultural layer
Street signs in Devanagari + Latin, chai stall, auto-rickshaw as the signature vehicle, cricket chatter, "Ram Ram bhaiya", bargaining at Naveen Market, "train late hai" at Central, sunset at the jheel. Kanpuriya dialogue guide: `KANPURIYA_DIALOGUE_GUIDE.md`.

## Upgrade path to real geometry (when network allows)
1. Overpass query: `[out:json]; (way["highway"](26.455,80.330,26.480,80.360); way["building"](...); way["natural"="water"](...);); out geom;`
2. Project lon/lat → metres (equirectangular at 26.47° N), centre on Mall Road / Civil Lines Road junction.
3. Emit `ROADS` (centreline + width from `highway` class) and building footprints (extrude by `building:levels` × 3.2 m) into `world.ts` or a generated `world.osm.json`.
4. Keep landmark overrides (renamed brands) and exclusion zones.
OSM data is ODbL: attribution required on the landing page if used.
