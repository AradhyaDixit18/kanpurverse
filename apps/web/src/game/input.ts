"use client";
/** Unified input: keyboard + mouse look + touch joystick/buttons. Read by the controller each frame. */
export const camYaw = { v: Math.PI, pitch: 0.25, dist: 6, mode: 0 as 0 | 1 | 2 | 3, lookBack: false };
export const input = {
  fwd: 0, right: 0, jump: false, sprint: false, interact: false, horn: false, exit: false, look: { dx: 0, dy: 0 }, zoom: 0, pointerLocked: false,
  touch: { joy: { x: 0, y: 0 }, lookActive: false, jump: false }, lookBackHeld: false,
  pressedOnce: new Set<string>(),
};
const keys = new Set<string>();
let bound = false;
export function bindInput(canvas: HTMLElement) {
  if (bound) return; bound = true;
  const down = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return; keys.add(e.code); if (!e.repeat) input.pressedOnce.add(e.code); if (["Space", "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault(); };
  const up = (e: KeyboardEvent) => keys.delete(e.code);
  window.addEventListener("keydown", down); window.addEventListener("keyup", up);
  const blur = () => { keys.clear(); input.pressedOnce.clear(); input.touch.jump = false; input.touch.joy.x = 0; input.touch.joy.y = 0; };
  window.addEventListener("blur", blur);
  const mousemove = (e: MouseEvent) => { if (input.pointerLocked) { input.look.dx += e.movementX; input.look.dy += e.movementY; } };
  canvas.addEventListener("mousemove", mousemove);
  const wheel = (e: WheelEvent) => { input.zoom += Math.sign(e.deltaY); };
  canvas.addEventListener("wheel", wheel, { passive: true });
  const pointerlock = () => { input.pointerLocked = document.pointerLockElement === canvas; };
  document.addEventListener("pointerlockchange", pointerlock);
  const mdown = (e: MouseEvent) => { if (e.button === 0 && input.pointerLocked) input.pressedOnce.add("Mouse0"); };
  canvas.addEventListener("mousedown", mdown);
  const click = () => { if (!input.pointerLocked && !input.touch.lookActive && !/Mobi|Android/i.test(navigator.userAgent)) canvas.requestPointerLock?.(); };
  canvas.addEventListener("click", click);
  return () => {
    window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur);
    canvas.removeEventListener("mousemove", mousemove); canvas.removeEventListener("wheel", wheel); canvas.removeEventListener("click", click); canvas.removeEventListener("mousedown", mdown);
    document.removeEventListener("pointerlockchange", pointerlock); blur(); input.pointerLocked = false; bound = false;
  };
}
/**
 * Standard-layout gamepad mapping (Xbox/PlayStation order). Buttons map onto the same key codes the keyboard uses,
 * so every action stays in one place. Edit this table to remap.
 */
export const GAMEPAD_MAP: Record<number, { code: string; held?: boolean; key?: boolean }> = {
  0: { code: "Space", held: true },   // A / Cross: jump, handbrake
  1: { code: "KeyF" },                // B / Circle: exit vehicle
  2: { code: "KeyE" },                // X / Square: talk, enter vehicle, story action
  3: { code: "KeyC" },                // Y / Triangle: camera mode
  4: { code: "KeyH", held: true },    // LB: horn
  5: { code: "KeyL" },                // RB: headlights
  8: { code: "KeyM", key: true },     // Back/Share: map
  9: { code: "Escape", key: true },   // Start/Options: pause
  10: { code: "ShiftLeft", held: true }, // left stick click: sprint
  14: { code: "KeyZ" },               // d-pad left: left indicator
  15: { code: "KeyX" },               // d-pad right: right indicator
  12: { code: "KeyR" },               // d-pad up: reset vehicle
};
const padPrev: boolean[] = [];
const dz = (v: number) => (Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85);
export const gamepad = { connected: false, id: "" };
function pollPad() {
  const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
  const p = Array.from(pads ?? []).find(Boolean); gamepad.connected = !!p; gamepad.id = p?.id ?? "";
  if (!p) return { fwd: 0, right: 0, held: new Set<string>() };
  const held = new Set<string>();
  p.buttons.forEach((b, i) => { const m = GAMEPAD_MAP[i]; if (!m) return; const down = b.pressed || b.value > 0.5;
    if (down && m.held) held.add(m.code);
    if (down && !padPrev[i]) { if (m.key) window.dispatchEvent(new KeyboardEvent("keydown", { code: m.code, key: m.code })); else input.pressedOnce.add(m.code); }
    padPrev[i] = down; });
  const rt = p.buttons[7]?.value ?? 0, lt = p.buttons[6]?.value ?? 0; const trig = rt - lt;
  input.look.dx += dz(p.axes[2] ?? 0) * 14; input.look.dy += dz(p.axes[3] ?? 0) * 10;
  return { fwd: Math.abs(trig) > 0.05 ? trig : -dz(p.axes[1] ?? 0), right: dz(p.axes[0] ?? 0), held };
}
export function pollKeys() {
  const k = (c: string) => keys.has(c); const pad = pollPad(); const h = (c: string) => k(c) || pad.held.has(c);
  const kf = (k("KeyW") || k("ArrowUp") ? 1 : 0) - (k("KeyS") || k("ArrowDown") ? 1 : 0);
  const kr = (k("KeyD") || k("ArrowRight") ? 1 : 0) - (k("KeyA") || k("ArrowLeft") ? 1 : 0);
  input.fwd = kf || pad.fwd || -input.touch.joy.y; input.right = kr || pad.right || input.touch.joy.x;
  input.sprint = h("ShiftLeft") || k("ShiftRight") || Math.hypot(input.touch.joy.x, input.touch.joy.y) > 0.9;
  input.jump = h("Space") || input.touch.jump; input.horn = h("KeyH"); input.lookBackHeld = k("KeyQ");
}
export function once(code: string) { const had = input.pressedOnce.has(code); if (had) input.pressedOnce.delete(code); return had; }
export function clearOnce() { input.pressedOnce.clear(); }
/** Touch helpers used by the HUD */
export function touchPress(code: string) { input.pressedOnce.add(code); }
export function consumeLook() { const l = { ...input.look }; input.look.dx = 0; input.look.dy = 0; return l; }
export function consumeZoom() { const z = input.zoom; input.zoom = 0; return z; }
