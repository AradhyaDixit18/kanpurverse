/** Headless visual + multiplayer smoke run (CI). Boots the ws server and the built Next app, drives two Chromium contexts,
 * saves screenshots to docs/screenshots and a JSON report. Run: node tests/visual/run.mjs (needs `npx playwright install chromium`). */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const OUT = "docs/screenshots"; mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const report = { startedAt: new Date().toISOString(), steps: [], consoleErrors: {} };
const log = (step, ok, info = "") => { report.steps.push({ step, ok, info }); console.log(`${ok ? "PASS" : "FAIL"} ${step} ${info}`); };

const server = spawn("npx", ["tsx", "apps/server/src/index.ts"], { env: { ...process.env, PORT: "8787", ALLOWED_ORIGINS: "*", SESSION_SECRET: "ci-secret", DATA_DIR: "/tmp/kvdata", LOG_LEVEL: "warn" }, stdio: "inherit" });
const web = spawn("npx", ["next", "start", "-p", "3000"], { cwd: "apps/web", env: { ...process.env }, stdio: "inherit" });
const waitFor = async (url, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.ok) return true; } catch {} await sleep(500); } return false; };
try {
  log("server up", await waitFor("http://localhost:8787/health")); log("web up", await waitFor("http://localhost:3000/"));
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] });
  const mk = async (name) => { const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 1 }); const page = await ctx.newPage(); report.consoleErrors[name] = []; page.on("console", m => { if (m.type() === "error") report.consoleErrors[name].push(m.text().slice(0, 300)); }); page.on("pageerror", e => report.consoleErrors[name].push("pageerror: " + String(e).slice(0, 300))); return page; };
  const A = await mk("A");
  await A.goto("http://localhost:3000/"); await sleep(1500); await A.screenshot({ path: `${OUT}/01_landing.png` }); log("landing renders", (await A.textContent("h1"))?.includes("Apna shehar"));
  await A.goto("http://localhost:3000/play"); await sleep(2500); await A.screenshot({ path: `${OUT}/02_character_creator.png` });
  const webgl = await A.evaluate(() => { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); }); log("webgl available", webgl);
  await A.fill("input[placeholder*='Rad']", "QA_Rad"); await A.click(".creator-form .btn-accent"); await sleep(800); await A.screenshot({ path: `${OUT}/03_main_menu.png` }); log("menu renders", await A.isVisible(".mbtn.accent"));
  await A.click(".mbtn.accent"); await sleep(1200); await A.screenshot({ path: `${OUT}/04_loading.png` });
  const joined = await A.waitForFunction(() => window.__kv?.state().screen === "play", null, { timeout: 60000 }).then(() => true).catch(() => false); log("A joined world", joined, JSON.stringify(await A.evaluate(() => window.__kv?.state())));
  await sleep(6000); await A.screenshot({ path: `${OUT}/05_gameplay_spawn.png` });
  await A.mouse.move(640, 380); await A.keyboard.down("KeyW"); await sleep(1500); await A.keyboard.up("KeyW"); await sleep(500); await A.screenshot({ path: `${OUT}/06_gameplay_walk.png` });
  const moved = await A.evaluate(() => window.__kv.pos()); log("A moved with WASD", Math.hypot(moved[0] + 10, moved[2] - 14) > 1, JSON.stringify(moved));
  // walk to Babloo (-20,10) in hops and talk
  for (const [x, z] of [[-13, 13], [-16, 12], [-18.5, 11]]) { await A.evaluate(([x, z]) => window.__kv.hop(x, z), [x, z]); await sleep(300); }
  await sleep(800); const near = await A.evaluate(() => window.__kv.state().nearby); log("NPC prompt near Babloo", near?.kind === "npc", JSON.stringify(near));
  await A.keyboard.press("KeyE"); await sleep(2500); await A.screenshot({ path: `${OUT}/07_dialogue_kanpuriya.png` }); log("dialogue panel open", await A.isVisible(".dlg-card"));
  const sub = await A.textContent(".dlg-text").catch(() => ""); log("devanagari dialogue text", /[ऀ-ॿ]/.test(sub || ""), (sub || "").slice(0, 60));
  const audioOk = await A.evaluate(async () => { const r = await fetch("/audio/dialogues/kanpuriya/manifest.json"); if (!r.ok) return "no manifest"; const m = await r.json(); const f = m["guide_babloo.greet_1"]?.file; const h = await fetch(f, { method: "HEAD" }); return `${f} -> ${h.status} ${h.headers.get("content-type")}`; }); log("voice mp3 served", /200/.test(audioOk), audioOk);
  await A.keyboard.press("Escape"); await sleep(500);
  // mission accept via dialogue: reopen and click first offer then Accept
  await A.keyboard.press("KeyE"); await sleep(1200); const offer = A.locator(".dlg-actions .btn-accent").first(); if (await offer.count()) { await offer.click(); await sleep(800); const acc = A.locator(".dlg-actions .btn-accent").last(); if (await acc.count()) await acc.first().click(); } await sleep(800);
  log("mission started", !!(await A.evaluate(() => window.__kv.state().mission)), JSON.stringify(await A.evaluate(() => window.__kv.state().mission)));
  await A.screenshot({ path: `${OUT}/08_mission_tracker.png` });
  // map + settings
  await A.keyboard.press("KeyM"); await sleep(800); await A.screenshot({ path: `${OUT}/09_map.png` }); await A.keyboard.press("Escape"); await sleep(300);
  await A.keyboard.press("Escape"); await sleep(600); await A.screenshot({ path: `${OUT}/10_pause_menu.png` }); await A.click(".modal-card .btn:has-text(\"Settings\"), .modal-card .btn:has-text(\"सेटिंग्स\")"); await sleep(600); await A.screenshot({ path: `${OUT}/11_settings.png` }); await A.keyboard.press("Escape"); await sleep(300);
  // vehicle: hop next to hatchback at (-40,12)
  for (const [x, z] of [[-24, 12], [-30, 12], [-36, 12]]) { await A.evaluate(([x, z]) => window.__kv.hop(x, z), [x, z]); await sleep(300); } await sleep(800);
  const nv = await A.evaluate(() => window.__kv.state().nearby); log("vehicle prompt", nv?.kind === "vehicle", JSON.stringify(nv));
  await A.keyboard.press("KeyE"); await sleep(1500); const inV = await A.evaluate(() => window.__kv.state().inVehicle); log("entered vehicle", !!inV, String(inV));
  await A.keyboard.down("KeyW"); await sleep(2500); await A.keyboard.up("KeyW"); await A.screenshot({ path: `${OUT}/12_driving.png` }); log("drove", Math.hypot(...(await A.evaluate(() => { const p = window.__kv.pos(); return [p[0] + 40, p[2] - 12]; }))) > 2);
  await A.keyboard.press("KeyF"); await sleep(800);
  // second player
  const B = await mk("B"); await B.goto("http://localhost:3000/play"); await sleep(2000); await B.fill("input[placeholder*='Rad']", "QA_Priya"); await B.click(".creator-form .btn-accent"); await sleep(500); await B.click(".mbtn.accent");
  const joinedB = await B.waitForFunction(() => window.__kv?.state().screen === "play", null, { timeout: 60000 }).then(() => true).catch(() => false); log("B joined world", joinedB);
  await sleep(3000); const seenByA = await A.evaluate(() => window.__kv.state().players); const seenByB = await B.evaluate(() => window.__kv.state().players); log("both see 2 players", seenByA === 2 && seenByB === 2, `A:${seenByA} B:${seenByB}`);
  await B.keyboard.press("KeyT"); await sleep(300); await B.keyboard.type("Ka ho bhaiya!"); await B.keyboard.press("Enter"); await sleep(1500);
  log("chat delivered A<-B", (await A.textContent(".chat-list"))?.includes("Ka ho bhaiya"));
  await A.screenshot({ path: `${OUT}/13_multiplayer_A.png` }); await B.screenshot({ path: `${OUT}/14_multiplayer_B.png` });
  await A.keyboard.press("Digit1"); await sleep(600); await B.screenshot({ path: `${OUT}/15_emote_seen_by_B.png` });
  // mobile layout
  const M = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); const mp = await M.newPage(); await mp.goto("http://localhost:3000/play"); await sleep(2500); await mp.screenshot({ path: `${OUT}/16_mobile_creator.png` }); log("mobile creator renders", await mp.isVisible(".creator-form .btn-accent"));
  // reconnect: close B, check A sees leave
  await B.context().close(); await sleep(1500); log("A sees B leave", (await A.evaluate(() => window.__kv.state().players)) === 1);
  const fps = await A.evaluate(() => window.__kv.state().fps); report.swiftshaderFps = fps; log("fps sampled (software GL, not representative)", true, String(fps));
  await browser.close();
} catch (e) { log("exception", false, String(e)); }
report.finishedAt = new Date().toISOString(); writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
server.kill(); web.kill(); process.exit(report.steps.some(s => !s.ok) ? 1 : 0);
