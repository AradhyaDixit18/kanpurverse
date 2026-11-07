#!/usr/bin/env bash
# Downloads CC0 (public-domain) PBR textures from ambientCG and a CC0 HDRI sky from Poly Haven for the city renderer.
# Licences: ambientCG = CC0 1.0 (https://ambientcg.com/license), Poly Haven = CC0 (https://polyhaven.com/license). No attribution
# required; we credit both on the landing page anyway. Output: apps/web/public/tex/<name>/{color,normal,rough}.jpg (1K), apps/web/public/hdr/*.hdr
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT=apps/web/public/tex; HDR=apps/web/public/hdr; mkdir -p "$OUT" "$HDR" /tmp/acg
# name:ambientCG asset id
TEX=( "asphalt:Asphalt012" "asphalt_old:Asphalt025" "concrete:Concrete034" "pavement:PavingStones138" "pavement_old:PavingStones118" "grass:Grass004" "dirt:Ground037" "plaster:Plaster001" "plaster_pink:Plaster003" "brick:Bricks094" "metal_roof:MetalPlates006" "corrugated:CorrugatedSteel007" "wood:Wood062" "tiles_roof:RoofingTiles012" "rubber:Rubber004" )
for pair in "${TEX[@]}"; do name="${pair%%:*}"; id="${pair##*:}"; dest="$OUT/$name"
  if [ -f "$dest/color.jpg" ]; then echo "skip $name"; continue; fi
  mkdir -p "$dest"; zip="/tmp/acg/$id.zip"
  curl -fsSL -A "KanpurVerse-assets/1.0" "https://ambientcg.com/get?file=${id}_1K-JPG.zip" -o "$zip" || { echo "FAILED $id"; continue; }
  rm -rf /tmp/acg/x && mkdir -p /tmp/acg/x && unzip -q -o "$zip" -d /tmp/acg/x
  c=$(ls /tmp/acg/x/*Color*.jpg 2>/dev/null | head -1); n=$(ls /tmp/acg/x/*NormalGL*.jpg 2>/dev/null | head -1); r=$(ls /tmp/acg/x/*Roughness*.jpg 2>/dev/null | head -1)
  [ -n "$c" ] && cp "$c" "$dest/color.jpg"; [ -n "$n" ] && cp "$n" "$dest/normal.jpg"; [ -n "$r" ] && cp "$r" "$dest/rough.jpg"
  echo "ok $name <- $id"
done
# Poly Haven HDRIs (1k): a clear afternoon sky and a dusk sky; used for image-based lighting + reflections
for h in "kloofendal_48d_partly_cloudy_puresky" "venice_sunset" "moonless_golf"; do
  [ -f "$HDR/$h.hdr" ] && { echo "skip $h"; continue; }
  curl -fsSL -A "KanpurVerse-assets/1.0" "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/${h}_1k.hdr" -o "$HDR/$h.hdr" && echo "ok hdr $h" || echo "FAILED hdr $h"
done
# downscale colour maps to 512px to keep the repo and first load small (ImageMagick is on GitHub runners)
if command -v convert >/dev/null; then for f in "$OUT"/*/*.jpg; do convert "$f" -resize 512x512 -quality 82 "$f"; done; fi
du -sh "$OUT" "$HDR"; cat > "$OUT/LICENSES.md" <<'EOF'
# Texture & HDRI licences
- `tex/*` — ambientCG (https://ambientcg.com), CC0 1.0 Universal. Asset ids are listed in scripts/assets/fetch_cc0_assets.sh.
- `hdr/*` — Poly Haven (https://polyhaven.com), CC0 1.0 Universal.
- `fonts/NotoSansDevanagari` — SIL Open Font License 1.1.
- Map data — © OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright).
EOF
