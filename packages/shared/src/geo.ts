/**
 * Geographic anchors for KanpurVerse. World space = OpenStreetMap extract projected about GEO_CENTER
 * (equirectangular; +X east, +Z south, metres). Coordinates marked `osm` were read from the OSM extract
 * (docs/geo_provenance.json); `approx` ones are published/known coordinates typed by hand and still need OSM confirmation.
 */
export const GEO_CENTER: [number, number] = [26.47, 80.347];
const M_LAT = 111_320, M_LON = 111_320 * Math.cos((GEO_CENTER[0] * Math.PI) / 180);
export function ll(lat: number, lon: number): [number, number] { return [Math.round((lon - GEO_CENTER[1]) * M_LON), Math.round(-(lat - GEO_CENTER[0]) * M_LAT)]; }
export function toLatLon(x: number, z: number): [number, number] { return [GEO_CENTER[0] - z / M_LAT, GEO_CENTER[1] + x / M_LON]; }

export interface Anchor { id: string; name: string; nameHi: string; p: [number, number]; source: "osm" | "approx"; note: string }
export const ANCHORS: Record<string, Anchor> = {
  bada_chauraha: { id: "bada_chauraha", name: "Bada Chauraha", nameHi: "बड़ा चौराहा", p: [538, -299], source: "osm", note: "OSM metro station node" },
  z_square: { id: "z_square", name: "Z Square Mall", nameHi: "ज़ेड स्क्वायर मॉल", p: [568, -384], source: "osm", note: "OSM building footprint centroid" },
  mall_road_spawn: { id: "mall_road_spawn", name: "The Mall Road", nameHi: "मॉल रोड", p: [472, -330], source: "osm", note: "OSM way 'The Mall Road' nearest Z Square" },
  naveen_market: { id: "naveen_market", name: "Naveen Market", nameHi: "नवीन मार्केट", p: [-155, -453], source: "osm", note: "OSM metro station node 'Naveen Market'" },
  phool_bagh: { id: "phool_bagh", name: "Phool Bagh", nameHi: "फूल बाग़", p: [1367, 307], source: "osm", note: "OSM park 'Phool Bagh Park' centroid" },
  nana_rao_park: { id: "nana_rao_park", name: "Nana Rao Park", nameHi: "नाना राव पार्क", p: [1351, -206], source: "osm", note: "OSM park centroid" },
  green_park: { id: "green_park", name: "Green Park Stadium", nameHi: "ग्रीन पार्क स्टेडियम", p: [80, -1340], source: "osm", note: "OSM leisure=stadium centroid" },
  kanpur_central: { id: "kanpur_central", name: "Kanpur Central", nameHi: "कानपुर सेंट्रल", p: [423, 1797], source: "osm", note: "OSM railway=station node" },
  anwarganj: { id: "anwarganj", name: "Kanpur Anwarganj", nameHi: "कानपुर अनवरगंज", p: [-1883, 1576], source: "osm", note: "OSM railway=station node" },
  christ_church: { id: "christ_church", name: "Christ Church", nameHi: "क्राइस्ट चर्च", p: [639, -168], source: "osm", note: "OSM building" },
  lal_imli: { id: "lal_imli", name: "Lal Imli Mills", nameHi: "लाल इमली मिल", p: [-800, -800], source: "osm", note: "OSM building cluster 'Lal Imli Complex'" },
  anandeshwar: { id: "anandeshwar", name: "Baba Anandeshwar Temple", nameHi: "बाबा आनंदेश्वर मंदिर", p: [-400, -1942], source: "osm", note: "OSM place_of_worship (Parmat, Ganga bank)" },
  moti_jheel: { id: "moti_jheel", name: "Moti Jheel", nameHi: "मोती झील", p: ll(26.4775, 80.3365), source: "approx", note: "published coordinates; lake polygon not in extract yet (water=lake query pending)" },
  jk_temple: { id: "jk_temple", name: "JK Temple", nameHi: "जे.के. मंदिर", p: ll(26.4869, 80.3284), source: "approx", note: "published coordinates (Sarvodaya Nagar)" },
  chunniganj: { id: "chunniganj", name: "Chunniganj", nameHi: "चुन्नीगंज", p: [-990, -784], source: "osm", note: "OSM metro station node" },
  nayaganj: { id: "nayaganj", name: "Nayaganj", nameHi: "नयागंज", p: [1246, 650], source: "osm", note: "OSM metro station node" },
};
/** Playable extent (metres from origin). Matches the Overpass bbox (~5 km × 5 km). */
export const GEO_WORLD_SIZE = 5200;
