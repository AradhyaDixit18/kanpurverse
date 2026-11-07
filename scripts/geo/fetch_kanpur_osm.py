#!/usr/bin/env python3
"""Geospatial pipeline: real Kanpur (OpenStreetMap, ODbL) -> game-space JSON.

Fetches roads, railways, stations, level crossings, buildings, water, parks and named POIs for central Kanpur via the Overpass
API, projects WGS84 -> local metres (equirectangular about the map centre; +X east, +Z south to match the game's axes),
simplifies geometry and writes apps/web/public/geo/kanpur.json plus a provenance/accuracy table for the audit doc.

Attribution: © OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright). The landing page credits this.
Run in CI (network) or on the Mac:  python3 scripts/geo/fetch_kanpur_osm.py
"""
import json, math, sys, time, urllib.request, urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "apps/web/public/geo/kanpur.json"
AUDIT = ROOT / "docs/geo_provenance.json"

# Central Kanpur: Moti Jheel / Civil Lines / Mall Road / Phool Bagh / Kanpur Central / Green Park / JK Temple (Sarvodaya Nagar)
BBOX = (26.448, 80.318, 26.492, 80.368)          # south, west, north, east
CENTER = (26.4700, 80.3470)                      # Mall Road ~ Civil Lines Road junction becomes world origin
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"]

M_PER_DEG_LAT = 111_320.0
M_PER_DEG_LON = 111_320.0 * math.cos(math.radians(CENTER[0]))
def proj(lat, lon):
    return (round((lon - CENTER[1]) * M_PER_DEG_LON, 2), round(-(lat - CENTER[0]) * M_PER_DEG_LAT, 2))  # x east, z south

QUERY = f"""[out:json][timeout:180];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|pedestrian)$"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  way["railway"~"^(rail|platform)$"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  node["railway"~"^(station|halt|level_crossing|crossing)$"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  way["building"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  way["natural"="water"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  relation["natural"="water"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  way["waterway"="river"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  way["leisure"~"^(park|garden|stadium|pitch)$"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  way["landuse"~"^(grass|recreation_ground)$"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  node["amenity"~"^(place_of_worship|hospital|college|university|school|marketplace|cinema|bus_station|fuel|police|restaurant|cafe)$"]["name"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  way["amenity"~"^(place_of_worship|hospital|college|university|school|marketplace|cinema|bus_station|police)$"]["name"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  node["shop"]["name"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  node["place"~"^(suburb|neighbourhood|quarter)$"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  way["tourism"~"^(attraction|zoo)$"]["name"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  node["tourism"~"^(attraction|zoo)$"]["name"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
);
out body geom;
>;
out skel qt;"""

def fetch():
    data = urllib.parse.urlencode({"data": QUERY}).encode()
    last = None
    for url in OVERPASS:
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, data=data, headers={"User-Agent": "KanpurVerse-geo/1.0 (Velto Studios; open-source game; OSM attribution included)"})
                with urllib.request.urlopen(req, timeout=240) as r:
                    return json.loads(r.read().decode())
            except Exception as e:  # noqa
                last = e; print(f"  {url} attempt {attempt+1} failed: {e}"); time.sleep(8 * (attempt + 1))
    raise SystemExit(f"Overpass unreachable: {last}")

def simplify(pts, tol=0.8):
    """Douglas–Peucker on 2D points (metres)."""
    if len(pts) < 3: return pts
    def dist(p, a, b):
        ax, az = a; bx, bz = b; px, pz = p; dx, dz = bx - ax, bz - az; l2 = dx * dx + dz * dz
        if l2 == 0: return math.hypot(px - ax, pz - az)
        t = max(0, min(1, ((px - ax) * dx + (pz - az) * dz) / l2)); return math.hypot(px - (ax + t * dx), pz - (az + t * dz))
    imax, dmax = 0, 0
    for i in range(1, len(pts) - 1):
        d = dist(pts[i], pts[0], pts[-1])
        if d > dmax: imax, dmax = i, d
    if dmax > tol: return simplify(pts[:imax + 1], tol)[:-1] + simplify(pts[imax:], tol)
    return [pts[0], pts[-1]]

ROAD_WIDTH = {"motorway": 20, "trunk": 18, "primary": 16, "secondary": 13, "tertiary": 10, "unclassified": 8, "residential": 7, "living_street": 6, "service": 5, "pedestrian": 6}
LANES_DEFAULT = {"primary": 4, "secondary": 2, "tertiary": 2}

def main():
    print("Fetching OSM (Overpass)…"); raw = fetch(); els = raw.get("elements", [])
    nodes = {e["id"]: e for e in els if e["type"] == "node"}
    roads, rails, platforms, buildings, water, parks, pois, places, crossings, stations = [], [], [], [], [], [], [], [], [], []
    for e in els:
        tags = e.get("tags", {}); geom = e.get("geometry")
        if e["type"] == "way" and geom:
            pts = simplify([proj(g["lat"], g["lon"]) for g in geom])
            if "highway" in tags:
                hw = tags["highway"]; w = ROAD_WIDTH.get(hw, 7)
                try: lanes = int(tags.get("lanes", LANES_DEFAULT.get(hw, 2)))
                except ValueError: lanes = 2
                roads.append({"id": e["id"], "name": tags.get("name"), "nameHi": tags.get("name:hi"), "cls": hw, "w": w, "lanes": lanes, "oneway": tags.get("oneway") == "yes", "bridge": tags.get("bridge") == "yes", "pts": pts})
            elif tags.get("railway") == "rail": rails.append({"id": e["id"], "name": tags.get("name"), "pts": pts, "tracks": int(tags.get("tracks", "1") or 1)})
            elif tags.get("railway") == "platform": platforms.append({"id": e["id"], "pts": pts})
            elif "building" in tags:
                try: levels = int(float(tags.get("building:levels", "0")))
                except ValueError: levels = 0
                buildings.append({"id": e["id"], "name": tags.get("name"), "kind": tags.get("building"), "levels": levels, "pts": pts})
            elif tags.get("natural") == "water" or tags.get("waterway") == "river": water.append({"id": e["id"], "name": tags.get("name"), "pts": pts, "river": tags.get("waterway") == "river"})
            elif tags.get("leisure") in ("park", "garden", "stadium", "pitch") or tags.get("landuse") in ("grass", "recreation_ground"): parks.append({"id": e["id"], "name": tags.get("name"), "kind": tags.get("leisure") or tags.get("landuse"), "pts": pts})
            if tags.get("name") and (tags.get("amenity") or tags.get("tourism")):
                cx = sum(p[0] for p in pts) / len(pts); cz = sum(p[1] for p in pts) / len(pts)
                pois.append({"id": e["id"], "name": tags["name"], "nameHi": tags.get("name:hi"), "kind": tags.get("amenity") or tags.get("tourism"), "p": [round(cx, 1), round(cz, 1)]})
        elif e["type"] == "node" and "lat" in e:
            p = proj(e["lat"], e["lon"])
            if tags.get("railway") in ("station", "halt"): stations.append({"id": e["id"], "name": tags.get("name"), "nameHi": tags.get("name:hi"), "p": p})
            elif tags.get("railway") in ("level_crossing", "crossing"): crossings.append({"id": e["id"], "p": p, "kind": tags["railway"]})
            elif tags.get("place"): places.append({"id": e["id"], "name": tags.get("name"), "nameHi": tags.get("name:hi"), "kind": tags["place"], "p": p})
            elif tags.get("name") and (tags.get("amenity") or tags.get("shop") or tags.get("tourism")): pois.append({"id": e["id"], "name": tags["name"], "nameHi": tags.get("name:hi"), "kind": tags.get("amenity") or tags.get("shop") or tags.get("tourism"), "p": p})
        elif e["type"] == "relation" and tags.get("natural") == "water":
            for m in e.get("members", []):
                if m.get("role") == "outer" and m.get("geometry"):
                    pts = clip_rect(simplify([proj(g["lat"], g["lon"]) for g in m["geometry"]]))
                    if len(pts) >= 4: water.append({"id": e["id"], "name": tags.get("name"), "pts": pts, "river": False})
    out = {"source": "OpenStreetMap contributors, ODbL 1.0", "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "bbox": BBOX, "center": CENTER, "axes": "+x east, +z south, metres",
           "roads": roads, "rails": rails, "platforms": platforms, "buildings": buildings, "water": water, "parks": parks, "pois": pois, "places": places, "crossings": crossings, "stations": stations}
    OUT.parent.mkdir(parents=True, exist_ok=True); OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    named = {r["name"] for r in roads if r.get("name")}
    prov = {"fetchedAt": out["fetchedAt"], "bbox": BBOX, "counts": {k: len(out[k]) for k in ("roads", "rails", "platforms", "buildings", "water", "parks", "pois", "places", "crossings", "stations")},
            "namedRoads": sorted(named), "stations": [s["name"] for s in stations], "places": [p["name"] for p in places if p.get("name")], "landmarks": [p["name"] for p in pois][:400]}
    AUDIT.write_text(json.dumps(prov, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} kB)"); print(json.dumps(prov["counts"])); print("named roads:", len(named)); print("stations:", prov["stations"])

def clip_rect(pts, lim=5000.0):
    """Sutherland-Hodgman clip of a polygon to the square [-lim, lim]^2 (keeps the Ganga relation's ring local)."""
    def clip_edge(poly, inside, inter):
        out = []
        for i, cur in enumerate(poly):
            prev = poly[i - 1]
            if inside(cur):
                if not inside(prev): out.append(inter(prev, cur))
                out.append(cur)
            elif inside(prev): out.append(inter(prev, cur))
        return out
    def ix(a, b, k, v):  # intersection of segment a-b with line coord[k] == v
        t = (v - a[k]) / ((b[k] - a[k]) or 1e-9); return [round(a[0] + (b[0] - a[0]) * t, 2), round(a[1] + (b[1] - a[1]) * t, 2)]
    poly = [list(p) for p in pts]
    for k, v, sign in ((0, -lim, 1), (0, lim, -1), (1, -lim, 1), (1, lim, -1)):
        if not poly: break
        poly = clip_edge(poly, lambda p, k=k, v=v, s=sign: (p[k] - v) * s >= 0, lambda a, b, k=k, v=v: ix(a, b, k, v))
    return poly

def check() -> int:
    """Validate an existing extract: counts, bbox, finite coordinates, closed polygons. Exit 1 on failure."""
    import math
    g = json.loads(OUT.read_text(encoding="utf-8")); bad = []
    for k in ("roads", "rails", "buildings", "water", "parks"):
        for f in g[k]:
            for x, z in f["pts"]:
                if not (math.isfinite(x) and math.isfinite(z)) or abs(x) > 20000 or abs(z) > 20000: bad.append(f"{k}#{f['id']} coordinate {x},{z}")
            if k in ("buildings", "water", "parks") and len(f["pts"]) < 4: bad.append(f"{k}#{f['id']} has {len(f['pts'])} points")
    if len(g["roads"]) < 500 or len(g["rails"]) < 20 or len(g["crossings"]) < 5: bad.append("counts too low: " + json.dumps({k: len(g[k]) for k in ("roads", "rails", "crossings")}))
    if not any((s.get("name") or "").startswith("Kanpur") for s in g["stations"]): bad.append("no Kanpur railway station")
    for b in bad[:20]: print("FAIL", b)
    print("OK" if not bad else f"{len(bad)} problems", "—", OUT, {k: len(g[k]) for k in ("roads", "rails", "buildings", "crossings", "stations")})
    return 1 if bad else 0

if __name__ == "__main__":
    import sys
    sys.exit(check() if "--check" in sys.argv else (main() or 0))
