# Kanpur Geographic Accuracy Audit — v0.4 (7 Nov 2026)

Classification used below: **VERIFIED GEOGRAPHIC DATA** (geometry comes straight from OpenStreetMap) · **LICENSED ASSET** (CC0 texture/HDRI/font) · **PROCEDURALLY GENERATED** (made by code where no data exists) · **FICTIONALIZED APPROXIMATION** (hand-placed, inspired by the real place) · **NOT YET IMPLEMENTED**.
Nothing in this build is an "exact replica". Buildings are extruded footprints or procedural infill; roads are real centrelines with estimated widths.

## Data source and licence
| Item | Value |
|---|---|
| Source | OpenStreetMap via the Overpass API (`scripts/geo/fetch_kanpur_osm.py`, run in GitHub Actions on 2026‑11‑07 09:34 UTC) |
| Licence | ODbL 1.0 — © OpenStreetMap contributors. Attribution is shown on the landing page, in the in‑game map panel and in `apps/web/public/tex/LICENSES.md`. |
| Bounding box | lat 26.448–26.492, lon 80.318–80.368 (≈ 5.0 km × 4.9 km, central Kanpur) |
| Projection | Equirectangular about 26.470 N, 80.347 E (1° lat = 111,320 m; 1° lon = 99,660 m). World +X = east, +Z = south. Error < 0.2 % across the box. |
| Elevation | NOT YET IMPLEMENTED — the city is flat (Kanpur's central area varies by only ~10 m; SRTM/Copernicus DEM integration is planned). |
| Imagery | None used. No Google Maps/Earth/Street View content anywhere in the project. |

## What the extract contains
| Layer | Count | Length / notes | Class |
|---|---|---|---|
| Roads (centrelines) | 2,937 ways — 488 km: trunk 4, primary 26, secondary 54, tertiary 173, unclassified 36, residential 2,232, living_street 61, service 351 | widths estimated by class (trunk 18 m … residential 7 m); lanes from OSM when tagged | VERIFIED GEOGRAPHIC DATA (geometry) + PROCEDURALLY GENERATED (width, markings, kerbs, pavements) |
| Named roads | 13 named in the extract: The Mall Road, Kalpi Road, Halsey Road, Canning Road, Annie Besant Street, King Edward Street, Swami Vivekanand Marg, PB Road, Ghantaghar Flyover, Jhakarkatti Flyover, Naya Flyover, "Flyover", Shahid Amar Choudhary Road | most residential lanes are unnamed in OSM; `name:hi` present for none → Hindi signs fall back to transliteration later | VERIFIED |
| Railways | 193 ways — 115 km of track incl. the Kanpur Central yard; 7 platform ways | rendered as ballast + sleepers + rails at true alignment | VERIFIED GEOGRAPHIC DATA |
| Level crossings | 49 `railway=level_crossing` nodes (de‑duplicated to one gate set per ≤12 m cluster) | barriers, lights, bell, physical block when closed | VERIFIED position · PROCEDURALLY GENERATED gates |
| Stations | Kanpur Central, Kanpur Anwarganj (railway); Bada Chauraha, Naveen Market, Chunniganj, Nayaganj (metro nodes, used as place anchors only) | station building is a stylised block at the OSM node; the real Central facade is NOT modelled | VERIFIED position · FICTIONALIZED building |
| Buildings | 1,419 footprints; only 7 carry `building:levels` | heights inferred from building type/area; facades procedural | VERIFIED footprint · PROCEDURALLY GENERATED height/facade |
| Building infill | generated lots along residential/tertiary/secondary roads where OSM has no footprint (Kanpur's OSM building coverage is sparse) | | PROCEDURALLY GENERATED |
| Water | 4 polygons incl. the Ganga (partly outside the box) | Moti Jheel lake polygon is **missing** from this extract (likely tagged `water=lake` relation); it is currently a FICTIONALIZED APPROXIMATION at the published coordinates | mixed |
| Parks | 16 polygons: Phool Bagh Park, Nana Rao Park (2 ways), Green Park Stadium, Kamala Nehru Park, Tulsi Upvan, Mahatma Gandhi Park, Harrison Ground, Tikona Park, Street Park… | grass + instanced trees inside the real polygon | VERIFIED |
| POIs | 56 named amenities/shops; e.g. Baba Anandeshwar Temple, Government Central Textile Institute, Christ Church, Methodist Church, Z Square Mall, Lal Imli Complex, Seth Anandram Jaipuria School | used for anchors; most not yet rendered as unique models | VERIFIED position |

## Area‑by‑area status
| Area / landmark | Coordinates (world m; lat/lon) | Source | Status |
|---|---|---|---|
| The Mall Road / Civil Lines grid | spawn at (472, −330) ≈ 26.4730 N 80.3517 E | OSM way "The Mall Road" | VERIFIED road layout; buildings procedural |
| Bada Chauraha | (538, −299) | OSM metro node | VERIFIED |
| Z Square Mall | (568, −384) | OSM building footprint | VERIFIED footprint; facade procedural |
| Naveen Market | (−155, −453) | OSM metro node (market polygon not in extract) | VERIFIED position; market stalls FICTIONALIZED |
| Phool Bagh | (1367, 307) | OSM park polygon | VERIFIED |
| Nana Rao Park | (1351, −206) / (1546, −164) | OSM park polygons | VERIFIED |
| Christ Church | (639, −168) | OSM building | VERIFIED footprint |
| Green Park Stadium | (80, −1340) | OSM leisure=stadium | VERIFIED footprint; stands NOT modelled |
| Kanpur Central | (423, 1797) | OSM station node + rail yard | VERIFIED position/tracks; building FICTIONALIZED |
| Kanpur Anwarganj | (−1883, 1576) | OSM station node | VERIFIED position |
| Lal Imli Mills | (≈ −800, −800) | OSM building cluster | VERIFIED footprints |
| Baba Anandeshwar Temple / Parmat Ghat | (−400, −1942) | OSM place_of_worship | VERIFIED position; ghat steps FICTIONALIZED |
| Moti Jheel | ll(26.4775, 80.3365) ≈ (−1046, −835) | published coordinates | FICTIONALIZED APPROXIMATION (polygon pending) |
| JK Temple | ll(26.4869, 80.3284) ≈ (−1853, −1881) | published coordinates | FICTIONALIZED APPROXIMATION |
| Swaroop Nagar, Arya Nagar, Kakadeo, Gumti No. 5, Govind Nagar, Kidwai Nagar, Saket Nagar, Kalyanpur, Rawatpur, Harsh Nagar, Tilak Nagar, Barra, Naubasta, Fazalganj, Shyam Nagar, Jajmau, IIT Kanpur, Bithoor, Allen Forest Zoo | outside the current 5 km box | — | NOT YET IMPLEMENTED (next extract: widen bbox or add tiles; the pipeline is parameterised) |
| Meston Road, Birhana Road, P Road, Parade | inside the box but unnamed in OSM at this scale (rendered as geometry without names) | OSM | VERIFIED geometry, name labels missing |

## Known approximations
- Road widths/lanes are class defaults, not measured. Flyovers are drawn at grade (no elevation).
- Building heights for 1,412 of 1,419 footprints are inferred.
- Infill lots are invented where OSM has gaps; they are placed only on real road frontage and never over real footprints, parks or water.
- Metro stations are not modelled (elevated viaduct absent).
- Level‑crossing gate placement uses the OSM node and the nearest road's bearing; a few may sit on sidings.

## Next steps for fidelity
1. Re‑run the pipeline with `water=*`, `landuse=reservoir`, `place=*` and a wider bbox to capture Moti Jheel, JK Temple, Kakadeo–Kalyanpur and Jajmau.
2. Add `name:hi` fallbacks via a curated transliteration table for the 13 named roads.
3. Use OSM `building:levels` where present (done) and Microsoft/Google‑free open building heights (e.g. OpenCityModel) if licensed.
4. Elevation from Copernicus DEM (CC‑BY‑like, attribution) for the Ganga bank and flyovers.
