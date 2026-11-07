# Kanpur Map Research — v0.5 (real OpenStreetMap data)

**Status: COMPLETED AND VERIFIED** for the central-Kanpur extract described below. The MVP's hand-authored "tribute" map still exists in `packages/shared/src/world.ts` and is used only as a fallback if `/geo/kanpur.json` fails to load.

## Source of truth
| Item | Value |
|---|---|
| Dataset | OpenStreetMap, via the Overpass API (`overpass-api.de`, with `overpass.kumi.systems` as mirror) |
| Licence | **ODbL 1.0** — attribution "© OpenStreetMap contributors" is shown in-game (bottom-left of the world), on the landing page and in `LICENSES.md` |
| Fetched | 2026-11-07T09:34:23Z by `.github/workflows/geo-assets.yml` (the build sandbox cannot reach Overpass; GitHub Actions can) |
| Script | `scripts/geo/fetch_kanpur_osm.py` (Python 3, stdlib only; Douglas–Peucker simplification at 0.6 m; retries each mirror) |
| Output | `apps/web/public/geo/kanpur.json` (880 KB) + `docs/geo_provenance.json` (counts, named roads, stations, POIs) |
| Bounding box | lat 26.448–26.492, lon 80.318–80.368 (≈ 4.9 km N–S × 5.0 km E–W) |
| Projection | Local equirectangular: origin 26.470° N, 80.347° E; **+X = east, +Z = south**, metres. `packages/shared/src/geo.ts` `ll(lat, lon)` converts. World size 5200 m. |
| Not used | Google Maps / Earth / Street View (terms + cost), Mapbox, any paid tile service. Satellite imagery was not scraped. |

## What the extract contains
| Layer | Count | Notes |
|---|---|---|
| Roads | 2,937 ways, 488 km | class + width (motorway/trunk 16 m, primary 14, secondary 12, tertiary 10, residential 7, service 5, living_street 6); 13 named incl. The Mall Road, Canning Road, Halsey Road, Kalpi Road, PB Road, Swami Vivekanand Marg, Ghantaghar/Jhakarkatti/Naya flyovers (flyovers are drawn at grade — elevation NOT IMPLEMENTED) |
| Railways | 193 ways, 115 km | `railway=rail` with track count; the Howrah–Delhi main line through Kanpur Central and the Anwarganj branch |
| Level crossings | 49 nodes | `railway=level_crossing`; each gets an animated barrier, bell and physical gate collider |
| Stations | 7 nodes | Kanpur Central (×2 nodes), Kanpur Anwarganj, plus 4 Kanpur Metro stations (Bada Chauraha, Naveen Market, Chunniganj, Nayaganj) — only names starting "Kanpur" are rendered as railway stations; metro stations are NOT IMPLEMENTED |
| Platforms | 7 | `railway=platform` ways at Kanpur Central |
| Buildings | 1,419 footprints | OSM coverage in Kanpur is sparse, so procedural infill lots are generated along residential/tertiary/secondary roads (FICTIONALIZED APPROXIMATION; see audit) |
| Water | 4 polygons | The Ganga (north edge) and three unnamed ponds. **Moti Jheel is not in this bbox's polygon set** — its position is anchored by coordinates only (approximate) |
| Parks | 16 | Nana Rao Park, Phool Bagh Park, Kamala Nehru Park, Tulsi Upvan, Green Park Stadium, Mahatma Gandhi Park, Harrison Ground, Tikona Park … |
| POIs | 56 | hospitals, schools, Christ Church, Methodist Church, Baba Anandeshwar Temple, Jhakarkati Bus Stand, Edward VII Memorial Hall / Kanpur Sangrahalaya, police posts, a few shops/cafés. Real business names from OSM are used only as data; in-game signage uses fictional shop names |

## Anchors used by gameplay (`packages/shared/src/geo.ts` ANCHORS)
| Anchor | World (x, z) | Source |
|---|---|---|
| Bada Chauraha | 538, −299 | OSM metro-station node |
| Z Square (Mall Road) | 568, −384 | derived from The Mall Road way |
| Spawn — Mall Road | 472, −330 | chosen on The Mall Road, clear zone |
| Naveen Market | −155, −453 | OSM metro-station node |
| Phool Bagh | 1367, 307 | OSM park centroid |
| Nana Rao Park | 1351, −206 | OSM park centroid |
| Green Park Stadium | 80, −1340 | OSM leisure polygon |
| Kanpur Central | 423, 1797 | OSM station node |
| Kanpur Anwarganj | −1883, 1576 | OSM station node |
| Christ Church | 639, −168 | OSM POI |
| Lal Imli | −800, −800 | approximate (no OSM polygon in extract) |
| Baba Anandeshwar Temple | −400, −1942 | OSM POI (Ganga bank) |
| Moti Jheel | ll(26.4775, 80.3365) | coordinate only, approximate |
| JK Temple | ll(26.4869, 80.3284) | coordinate only, approximate — outside the detailed bbox |
| Chunniganj / Nayaganj | −990, −784 / 1246, 650 | OSM metro-station nodes |

## Verification done
- Road topology visually checked in Brave at the spawn (The Mall Road, Bada Chauraha junction), Naveen Market and Kanpur Central; railway crossings open/close with the server train.
- `scripts/geo/fetch_kanpur_osm.py --check` validates the JSON (counts, bbox, no NaN, closed polygons).
- Unit test `tests/shared.test.ts` asserts `ll()`/`toLatLon()` round-trip and that every ANCHOR lies within the world bounds.

## Known limitations / next
- Elevation, flyovers and bridges are flat. Ganga bank is a flat polygon.
- Outer neighbourhoods (Kakadeo, Swaroop Nagar, Kalyanpur, IIT) are outside the bbox; a wider fetch is a workflow input away (`geo-assets.yml` with `bbox`), at the cost of a larger JSON (streamed in 250 m tiles, so runtime cost is bounded).
- Moti Jheel: re-fetch with `natural=water` + `water=*` relations and widen to lon 80.33.
