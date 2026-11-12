# Asset licence register

| Asset | Source | Creator | Licence | Commercial use | Files in repo | Modifications |
|---|---|---|---|---|---|---|
| Universal Base Characters [Standard] (Superhero female and male bodies, eyes, brows, 6 hairstyles) | https://quaternius.com/packs/universalbasecharacters.html (download via quaternius.itch.io, free Standard tier) | Quaternius | CC0 1.0 (`License_Standard.txt` in the zip) | Yes | `apps/web/public/models/characters/kc_female.glb`, `kc_male.glb`, `kc_hair.glb` | Packed to GLB, textures resized to 1024 px WebP, hairstyles merged into one file. Clothing is generated at runtime from the body mesh (HumanAvatar.tsx) |
| Universal Animation Library [Standard] (20 of 43 clips) | https://quaternius.com/packs/universalanimationlibrary.html (quaternius.itch.io, free Standard tier) | Quaternius | CC0 1.0 (`License.txt` in the zip) | Yes | `apps/web/public/models/characters/kc_anims.glb` | Unused clips and the mannequin mesh removed, keyframes resampled |
| Map data | OpenStreetMap | OSM contributors | ODbL 1.0 | Yes, with attribution | `apps/web/public/geo` | Converted to game geometry |
| PBR textures | ambientCG | ambientCG | CC0 | Yes | `apps/web/public/tex` | Resized |
| HDR skies | Poly Haven | Poly Haven | CC0 | Yes | `apps/web/public/hdr` | none |
| Fonts | Inter, Noto Sans Devanagari | Google Fonts | OFL 1.1 | Yes | `apps/web/public/fonts` | none |
| Vehicles, buildings, props | Original Velto Studios code (`vehicleModels.tsx`, `OsmCity.tsx`, `facadeKit.ts`, `Props.tsx`) | Velto Studios | Project licence | Yes | source code | n/a |

Download record (13 Nov 2026): `Universal Animation Library[Standard].zip` 15,904,933 bytes, SHA-256 `cc73fc4e495b82958207316596317a3f40b9fa38065bde1027937452da537724`. `Universal Base Characters[Standard].zip` 128,968,391 bytes, SHA-256 `fdbf1804c90dfc1ea03e992bff7da2dfd1a79318e13270a660180f9308455f40`. Rebuild with `node scripts/assets/build-characters.mjs <chars dir> <anim dir> apps/web/public/models/characters`.

No GTA, Rockstar, manufacturer or other branded asset is used.
