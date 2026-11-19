/**
 * Hand-drawn (in code) facade and shopfront art for the city's buildings. Original work: no photographs, no
 * downloaded textures, and every shop name is invented.
 *
 * A facade tile is 2 bays × 2 floors (one bay is 4 m, one floor 3.2 m), so neighbouring windows differ: shutters,
 * grilles, curtains, balconies with washing, coolers, drain pipes, weathering and rain streaks. The window opening
 * sits at the same place in every cell (x 27–73 %, y 23–70 % from the top) so the night-time window-glow mask in
 * OsmCity.tsx still lines up.
 *
 * A shopfront tile is 4 bays wide: four different shops, each with its own Hindi signboard, colours and stock, so a
 * market street no longer repeats one "दुकान" panel.
 */
type Ctx = CanvasRenderingContext2D;
/** Weathered wall colours: limewash, cement, faded distemper, exposed brick (index 8). */
export const FACADE_PALETTE = ["#d6c2a1", "#ddd2ba", "#cbb1ad", "#b7c3cb", "#d9c88f", "#c4beb1", "#cda38b", "#b9c1a9", "#9a5a45"];
export const FACADE_CELL = 512;
/** Window opening inside a cell, as fractions of the cell (shared with the glow mask). */
export const WINDOW = { x: 0.273, y: 0.234, w: 0.454, h: 0.469 };

function rng(seed: number) { let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function shade(hex: string, k: number) { const n = parseInt(hex.slice(1), 16); const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k))); return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`; }
function blotches(x: Ctx, r: () => number, w: number, h: number, n: number) {
  for (let i = 0; i < n; i++) { const cx = r() * w, cy = r() * h, rad = 50 + r() * 190; const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); const dark = r() < 0.6; const a = 0.03 + r() * 0.06;
    g.addColorStop(0, dark ? `rgba(45,30,15,${a})` : `rgba(255,250,235,${a})`); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); }
}
function speckle(x: Ctx, r: () => number, w: number, h: number, n: number) { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(55,38,22,${r() * 0.1})`; const s = r() < 0.8 ? 2 : 3; x.fillRect(r() * w, r() * h, s, s); } }
function streak(x: Ctx, cx: number, y0: number, len: number, width: number, alpha: number) { const g = x.createLinearGradient(0, y0, 0, y0 + len); g.addColorStop(0, `rgba(35,28,20,${alpha})`); g.addColorStop(1, "rgba(35,28,20,0)"); x.fillStyle = g; x.fillRect(cx - width / 2, y0, width, len); }
function softShadow(x: Ctx, x0: number, y0: number, w: number, depth: number, alpha: number) { const g = x.createLinearGradient(0, y0, 0, y0 + depth); g.addColorStop(0, `rgba(0,0,0,${alpha})`); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(x0, y0, w, depth); }

/** Draw the 2 × 2 facade tile for a style onto a (2·FACADE_CELL)² canvas. */
export function drawFacade(x: Ctx, style: number) {
  const S = FACADE_CELL, W = S * 2; const r = rng(style * 7919 + 13); const base = FACADE_PALETTE[style % FACADE_PALETTE.length]; const brick = style % FACADE_PALETTE.length === 8;
  x.fillStyle = base; x.fillRect(0, 0, W, W);
  if (brick) { for (let row = 0; row < W / 16; row++) for (let col = -1; col < W / 44 + 1; col++) { const bx = col * 44 + (row % 2 ? 22 : 0), by = row * 16; x.fillStyle = shade(base, 0.86 + r() * 0.3); x.fillRect(bx + 1, by + 1, 42, 14); } x.fillStyle = "rgba(225,215,195,0.16)"; for (let row = 0; row <= W / 16; row++) x.fillRect(0, row * 16 - 1, W, 2); }
  blotches(x, r, W, W, 30); speckle(x, r, W, W, 11000);
  const frames = ["#5a4030", "#e6e0d2", "#3d5a4a", "#2f4a66", "#6b5a48"], cloth = ["#b5483a", "#d9a441", "#3f6f9a", "#7a4a7a", "#e8e0d0", "#2e8b6a", "#d96a8a"], shutters = ["#3f6a58", "#35557a", "#7a5a3c", "#5a6a3a"];
  for (let bx = 0; bx < 2; bx++) for (let fy = 0; fy < 2; fy++) {
    const ox = bx * S, oy = fy * S; const wx = ox + WINDOW.x * S, wy = oy + WINDOW.y * S, ww = WINDOW.w * S, wh = WINDOW.h * S; const type = Math.floor(r() * 4), frame = frames[Math.floor(r() * frames.length)];
    // floor slab line: a lighter band with a shadow under it reads as the storey above projecting slightly
    x.fillStyle = shade(base, 1.07); x.fillRect(ox, oy + S - 18, S, 11); x.fillStyle = "rgba(0,0,0,0.3)"; x.fillRect(ox, oy + S - 7, S, 7); softShadow(x, ox, oy, S, 20, 0.2);
    // chhajja (sunshade slab) and the shadow it throws on the window head
    x.fillStyle = shade(base, 1.1); x.fillRect(wx - 20, wy - 26, ww + 40, 13); x.fillStyle = "rgba(0,0,0,0.22)"; x.fillRect(wx - 20, wy - 13, ww + 40, 3); softShadow(x, wx - 20, wy - 10, ww + 40, 44, 0.42);
    // opening: reveal, frame, two leaves
    x.fillStyle = "rgba(18,16,14,0.9)"; x.fillRect(wx - 7, wy - 7, ww + 14, wh + 14); x.fillStyle = frame; x.fillRect(wx, wy, ww, wh);
    const lw = ww / 2 - 9;
    for (let leaf = 0; leaf < 2; leaf++) { const lx = wx + 6 + leaf * (lw + 6), ly = wy + 6, lh = wh - 12;
      if (type === 2) { const col = shutters[Math.floor(r() * shutters.length)]; x.fillStyle = shade(col, leaf ? 0.92 : 1.05); x.fillRect(lx, ly, lw, lh); x.fillStyle = "rgba(0,0,0,0.28)"; for (let k = 8; k < lh; k += 9) x.fillRect(lx + 4, ly + k, lw - 8, 2); x.fillStyle = "rgba(255,255,255,0.1)"; x.fillRect(lx, ly, 3, lh); }
      else { const g = x.createLinearGradient(lx, ly, lx + lw, ly + lh); g.addColorStop(0, "#6c8498"); g.addColorStop(0.32, "#2c3a4a"); g.addColorStop(1, "#10151c"); x.fillStyle = g; x.fillRect(lx, ly, lw, lh);
        x.fillStyle = "rgba(190,215,235,0.12)"; x.beginPath(); x.moveTo(lx, ly + lh * 0.55); x.lineTo(lx + lw, ly + lh * 0.2); x.lineTo(lx + lw, ly + lh * 0.38); x.lineTo(lx, ly + lh * 0.75); x.fill(); // sky reflection
        if (type === 3) { const cc = cloth[Math.floor(r() * cloth.length)]; x.globalAlpha = 0.82; x.fillStyle = cc; x.fillRect(lx, ly + lh * 0.12, lw, lh * 0.88); x.globalAlpha = 1; x.fillStyle = "rgba(0,0,0,0.16)"; for (let k = 6; k < lw; k += 11) x.fillRect(lx + k, ly + lh * 0.12, 3, lh * 0.88); }
        if (type === 1) { x.fillStyle = "rgba(12,12,12,0.85)"; for (let k = 14; k < lh; k += 16) x.fillRect(lx, ly + k, lw, 2); for (let k = 12; k < lw; k += 22) x.fillRect(lx + k, ly, 2, lh); }
        x.fillStyle = frame; x.fillRect(lx, ly + lh * 0.3, lw, 4); } }
    softShadow(x, wx, wy, ww, 30, 0.35);
    // sill, with the grime that runs down from its ends
    x.fillStyle = "#d6d0c2"; x.fillRect(wx - 16, wy + wh + 5, ww + 32, 13); softShadow(x, wx - 16, wy + wh + 18, ww + 32, 16, 0.3);
    streak(x, wx - 12 + r() * 8, wy + wh + 18, 70 + r() * 110, 9 + r() * 8, 0.14 + r() * 0.12); streak(x, wx + ww + 6 + r() * 8, wy + wh + 18, 60 + r() * 120, 8 + r() * 9, 0.12 + r() * 0.12); if (r() < 0.6) streak(x, ox + r() * S, oy + 22, 120 + r() * 200, 14 + r() * 22, 0.06 + r() * 0.07);
    // balcony: slab, railing in front of the lower window, sometimes washing hung over it
    const balcony = style % 2 === 1 ? (bx + fy) % 2 === 0 : r() < 0.18;
    if (balcony) { const by = wy + wh + 30, bx0 = ox + S * 0.1, bw = S * 0.8; x.fillStyle = shade(base, 0.74); x.fillRect(bx0, by, bw, 14); softShadow(x, bx0, by + 14, bw, 26, 0.38);
      x.fillStyle = "rgba(38,34,30,0.9)"; for (let k = 0; k <= bw; k += 17) x.fillRect(bx0 + k, by - 148, 3, 148); x.fillRect(bx0, by - 150, bw, 7); x.fillRect(bx0, by - 78, bw, 3);
      if (r() < 0.6) { const n = 1 + Math.floor(r() * 3); for (let k = 0; k < n; k++) { const cw = 60 + r() * 70, cx = bx0 + 14 + r() * (bw - cw - 28), ch = 70 + r() * 50; const cc = cloth[Math.floor(r() * cloth.length)]; x.fillStyle = cc; x.fillRect(cx, by - 150, cw, ch); x.fillStyle = "rgba(0,0,0,0.14)"; for (let q = 8; q < cw; q += 14) x.fillRect(cx + q, by - 150, 3, ch); x.fillStyle = "rgba(255,255,255,0.18)"; x.fillRect(cx, by - 150 + ch - 8, cw, 3); } } }
    // air cooler or AC outdoor unit beside the window
    if (r() < 0.34) { const ax = ox + S * 0.79, ay = wy + 70 + r() * 60; x.fillStyle = "#cfd2d4"; x.fillRect(ax, ay, 84, 62); x.fillStyle = "#3b3f44"; x.beginPath(); x.arc(ax + 32, ay + 31, 22, 0, Math.PI * 2); x.fill(); x.fillStyle = "#9aa0a6"; for (let k = 0; k < 5; k++) x.fillRect(ax + 62, ay + 10 + k * 10, 16, 3); softShadow(x, ax, ay + 62, 84, 18, 0.35); streak(x, ax + 40, ay + 66, 90, 10, 0.18); }
    // drain pipe at the bay edge and a sagging service wire
    if (bx === 1 && r() < 0.7) { x.fillStyle = "#857e73"; x.fillRect(ox + S - 26, oy, 10, S); x.fillStyle = "rgba(255,255,255,0.22)"; x.fillRect(ox + S - 25, oy, 2, S); x.fillStyle = "rgba(0,0,0,0.25)"; x.fillRect(ox + S - 16, oy, 3, S); x.fillStyle = "#5f594f"; x.fillRect(ox + S - 29, oy + S * 0.5, 16, 7); }
    if (r() < 0.45) { x.strokeStyle = "rgba(20,20,20,0.75)"; x.lineWidth = 2; x.beginPath(); const y0 = oy + 30 + r() * 60; x.moveTo(ox, y0); x.quadraticCurveTo(ox + S / 2, y0 + 26 + r() * 20, ox + S, y0 + r() * 20 - 10); x.stroke(); }
  }
}

// ───────────────────────── shopfronts ─────────────────────────
/** Invented neighbourhood shops. Names are generic and fictional; no real business is depicted. */
export const SHOPFRONTS = [
  { hi: "गुप्ता किराना स्टोर", en: "GUPTA KIRANA STORE", board: "#a8231c", ink: "#fff6e0", kind: "kirana" },
  { hi: "श्री मिष्ठान भंडार", en: "SHRI MISHTHAN BHANDAR", board: "#e0a200", ink: "#5a1410", kind: "sweets" },
  { hi: "न्यू फैशन साड़ी सेंटर", en: "NEW FASHION SAREE CENTRE", board: "#1f4e9a", ink: "#ffffff", kind: "saree" },
  { hi: "राजू मोबाइल रिपेयर", en: "RAJU MOBILE REPAIR", board: "#1d6b3a", ink: "#fff8d6", kind: "shutter" },
] as const;
const FONT = "'Mukta','Noto Sans Devanagari','Kohinoor Devanagari','Devanagari Sangam MN',sans-serif";
function fitText(x: Ctx, text: string, weight: number, size: number, maxW: number) { x.font = `${weight} ${size}px ${FONT}`; const w = x.measureText(text).width; if (w > maxW) x.font = `${weight} ${Math.floor(size * maxW / w)}px ${FONT}`; }

/** Draw four shops side by side onto a (4·FACADE_CELL) × FACADE_CELL canvas. `glow` draws the night emissive mask instead. */
export function drawShopfronts(x: Ctx, glow = false) {
  const S = FACADE_CELL; const r = rng(4242); x.fillStyle = glow ? "#000" : "#cabfa8"; x.fillRect(0, 0, S * 4, S);
  if (!glow) { blotches(x, r, S * 4, S, 18); speckle(x, r, S * 4, S, 5000); }
  SHOPFRONTS.forEach((shop, i) => {
    const ox = i * S; const open = shop.kind !== "shutter"; const X0 = ox + 28, Y0 = 134, OW = S - 56, OH = 338;
    if (glow) { // night: lit signboard, a tube light under it, warm light spilling from open shops
      x.fillStyle = shade(shop.board, 0.75); x.fillRect(ox + 10, 8, S - 20, 108); x.fillStyle = shop.ink; x.textAlign = "center"; x.textBaseline = "middle"; fitText(x, shop.hi, 800, 46, S - 64); x.fillText(shop.hi, ox + S / 2, 54);
      x.fillStyle = "#fff4d8"; x.fillRect(ox + 40, 122, S - 80, 7); if (open) { const g = x.createLinearGradient(0, Y0, 0, Y0 + OH); g.addColorStop(0, "#ffdfa6"); g.addColorStop(1, "#8a5a2a"); x.fillStyle = g; x.fillRect(X0, Y0, OW, OH); } return; }
    // signboard with a painted border, Hindi name and small English line
    softShadow(x, ox, 116, S, 30, 0.45); x.fillStyle = shade(shop.board, 0.7); x.fillRect(ox + 6, 4, S - 12, 116); x.fillStyle = shop.board; x.fillRect(ox + 10, 8, S - 20, 108); x.strokeStyle = shop.ink; x.globalAlpha = 0.55; x.lineWidth = 3; x.strokeRect(ox + 18, 16, S - 36, 92); x.globalAlpha = 1;
    x.fillStyle = shop.ink; x.textAlign = "center"; x.textBaseline = "middle"; fitText(x, shop.hi, 800, 46, S - 64); x.fillText(shop.hi, ox + S / 2, 54); fitText(x, shop.en, 600, 19, S - 80); x.fillText(shop.en, ox + S / 2, 92);
    blotches(x, r, S, 120, 3); streak(x, ox + 30 + r() * (S - 60), 100, 40, 20, 0.2);
    // pillars with paan stains and paper notices; a concrete step
    for (const px of [ox, ox + S - 28]) { x.fillStyle = "#b9ae98"; x.fillRect(px, 120, 28, S - 120); x.fillStyle = "rgba(0,0,0,0.18)"; x.fillRect(px + (px === ox ? 25 : 0), 120, 3, S - 120); x.fillStyle = "rgba(110,30,20,0.35)"; x.beginPath(); x.ellipse(px + 14, 440 + r() * 20, 10, 16 + r() * 10, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = "#e9e3d0"; x.fillRect(px + 5, 190 + r() * 60, 18, 24); }
    x.fillStyle = "#17130f"; x.fillRect(X0, Y0, OW, OH);
    if (shop.kind === "kirana") { // shelves of packets, hanging sachet strips, a wooden counter with jars
      for (let row = 0; row < 4; row++) { const sy = Y0 + 34 + row * 58; x.fillStyle = "#4a3624"; x.fillRect(X0 + 8, sy + 40, OW - 16, 6); for (let k = 0; k < 17; k++) { x.fillStyle = ["#d43a2f", "#f2b632", "#2f8f5b", "#2f6fb5", "#e8e2d0", "#e86f1f", "#7a3fa0"][Math.floor(r() * 7)]; const pw = 16 + r() * 8; x.fillRect(X0 + 14 + k * 24.5, sy + 40 - 30 - r() * 8, pw, 30 + r() * 8); } }
      for (let k = 0; k < 9; k++) { const sx = X0 + 20 + k * 48; for (let q = 0; q < 6; q++) { x.fillStyle = ["#f2c230", "#d8362c", "#3aa055", "#2d6fc0"][(k + q) % 4]; x.fillRect(sx, Y0 + 6 + q * 13, 14, 11); } }
      x.fillStyle = "#6b4a2c"; x.fillRect(X0, Y0 + OH - 96, OW, 96); x.fillStyle = "#8a6238"; x.fillRect(X0, Y0 + OH - 96, OW, 9); for (let k = 0; k < 6; k++) { x.fillStyle = "rgba(210,225,235,0.55)"; x.fillRect(X0 + 26 + k * 66, Y0 + OH - 140, 34, 44); x.fillStyle = ["#c9742a", "#e9d9a0", "#7a4a22", "#d94a3a"][k % 4]; x.fillRect(X0 + 29 + k * 66, Y0 + OH - 122, 28, 24); x.fillStyle = "#b02a22"; x.fillRect(X0 + 24 + k * 66, Y0 + OH - 146, 38, 8); } }
    else if (shop.kind === "sweets") { // tiled back wall, glass counter with trays of mithai
      x.fillStyle = "#e9dcc0"; x.fillRect(X0, Y0, OW, OH - 150); x.strokeStyle = "rgba(120,100,70,0.35)"; x.lineWidth = 1; for (let k = 0; k <= OW; k += 32) { x.beginPath(); x.moveTo(X0 + k, Y0); x.lineTo(X0 + k, Y0 + OH - 150); x.stroke(); } for (let k = 0; k <= OH - 150; k += 32) { x.beginPath(); x.moveTo(X0, Y0 + k); x.lineTo(X0 + OW, Y0 + k); x.stroke(); }
      softShadow(x, X0, Y0, OW, 60, 0.5); x.fillStyle = "#3a2a1a"; x.fillRect(X0, Y0 + OH - 150, OW, 150); x.fillStyle = "rgba(200,225,235,0.3)"; x.fillRect(X0 + 8, Y0 + OH - 142, OW - 16, 92);
      for (let row = 0; row < 2; row++) for (let k = 0; k < 7; k++) { const tx = X0 + 18 + k * 62, ty = Y0 + OH - 132 + row * 42; x.fillStyle = "#b9b4a8"; x.fillRect(tx, ty + 22, 52, 6); const col = ["#f2a02a", "#f6d868", "#f3ead2", "#d97a2a", "#e8b84a", "#c96a3a", "#f0e0b0"][(k + row * 3) % 7]; x.fillStyle = col; for (let q = 0; q < 4; q++) { x.beginPath(); x.arc(tx + 8 + q * 12, ty + 14, 7, 0, Math.PI * 2); x.fill(); } }
      x.fillStyle = "#8a2a1c"; x.fillRect(X0, Y0 + OH - 46, OW, 46); }
    else if (shop.kind === "saree") { // bolts of cloth and draped sarees with zari borders
      softShadow(x, X0, Y0, OW, 80, 0.55); for (let k = 0; k < 9; k++) { const cx = X0 + 10 + k * 50, col = ["#c2185b", "#f9a825", "#00897b", "#5e35b1", "#d84315", "#1e88e5", "#ad1457", "#2e7d32", "#ef6c00"][k]; const top = Y0 + 20 + (k % 3) * 14; x.fillStyle = col; x.fillRect(cx, top, 42, OH - 110 - (k % 3) * 14); x.fillStyle = "rgba(0,0,0,0.18)"; for (let q = 8; q < 42; q += 12) x.fillRect(cx + q, top, 3, OH - 110); x.fillStyle = "#e6c35a"; x.fillRect(cx, top + OH - 150 - (k % 3) * 14, 42, 12); x.fillRect(cx, top, 42, 5); }
      x.fillStyle = "#e8e0d0"; x.fillRect(X0, Y0 + OH - 84, OW, 84); x.fillStyle = "rgba(0,0,0,0.15)"; x.fillRect(X0, Y0 + OH - 84, OW, 6); for (let k = 0; k < 5; k++) { x.fillStyle = ["#b71c1c", "#1565c0", "#f57f17", "#6a1b9a", "#00695c"][k]; x.fillRect(X0 + 22 + k * 86, Y0 + OH - 70, 66, 26); x.fillStyle = "#e6c35a"; x.fillRect(X0 + 22 + k * 86, Y0 + OH - 50, 66, 6); } }
    else { // rolled-down steel shutter, hand-painted number, a small open counter at one side
      const g = x.createLinearGradient(0, Y0, 0, Y0 + OH); g.addColorStop(0, "#8f959b"); g.addColorStop(1, "#6f757b"); x.fillStyle = g; x.fillRect(X0, Y0, OW, OH); for (let k = 0; k < OH; k += 13) { x.fillStyle = "rgba(0,0,0,0.26)"; x.fillRect(X0, Y0 + k, OW, 3); x.fillStyle = "rgba(255,255,255,0.14)"; x.fillRect(X0, Y0 + k + 3, OW, 2); }
      x.fillStyle = "rgba(90,40,20,0.3)"; for (let k = 0; k < 14; k++) x.fillRect(X0 + r() * OW, Y0 + r() * OH, 6 + r() * 30, 2 + r() * 4); x.fillStyle = "#1b2a5a"; x.textAlign = "center"; x.font = `800 30px ${FONT}`; x.fillText("मोबाइल | रिचार्ज | सिम", ox + S / 2, Y0 + 120); x.font = `700 24px ${FONT}`; x.fillText("सोमवार बंद", ox + S / 2, Y0 + 168);
      x.fillStyle = "#3a3f46"; x.fillRect(X0 + OW / 2 - 30, Y0 + OH - 26, 60, 18); softShadow(x, X0, Y0, OW, 40, 0.4); }
    x.fillStyle = "#8d867a"; x.fillRect(ox, S - 40, S, 40); x.fillStyle = "rgba(0,0,0,0.3)"; x.fillRect(ox, S - 40, S, 4); x.fillStyle = "rgba(255,255,255,0.12)"; x.fillRect(ox, S - 36, S, 3);
  });
}
