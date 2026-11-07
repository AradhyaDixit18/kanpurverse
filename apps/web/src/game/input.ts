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
  const down = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return; keys.add(e.code); if (!e.repeat) input.pressedOnce.add(e.code); if (["Space", "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault(); };
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
  const click = () => { if (!input.pointerLocked && !input.touch.lookActive && !/Mobi|Android/i.test(navigator.userAgent)) canvas.requestPointerLock?.(); };
  canvas.addEventListener("click", click);
  return () => {
    window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur);
    canvas.removeEventListener("mousemove", mousemove); canvas.removeEventListener("wheel", wheel); canvas.removeEventListener("click", click);
    document.removeEventListener("pointerlockchange", pointerlock); blur(); input.pointerLocked = false; bound = false;
  };
}
export function pollKeys() {
  const k = (c: string) => keys.has(c);
  const kf = (k("KeyW") || k("ArrowUp") ? 1 : 0) - (k("KeyS") || k("ArrowDown") ? 1 : 0);
  const kr = (k("KeyD") || k("ArrowRight") ? 1 : 0) - (k("KeyA") || k("ArrowLeft") ? 1 : 0);
  input.fwd = kf || -input.touch.joy.y; input.right = kr || input.touch.joy.x;
  input.sprint = k("ShiftLeft") || k("ShiftRight") || Math.hypot(input.touch.joy.x, input.touch.joy.y) > 0.9;
  input.jump = k("Space") || input.touch.jump; input.horn = k("KeyH"); input.lookBackHeld = k("KeyQ");
}
export function once(code: string) { const had = input.pressedOnce.has(code); if (had) input.pressedOnce.delete(code); return had; }
export function clearOnce() { input.pressedOnce.clear(); }
/** Touch helpers used by the HUD */
export function touchPress(code: string) { input.pressedOnce.add(code); }
export function consumeLook() { const l = { ...input.look }; input.look.dx = 0; input.look.dy = 0; return l; }
export function consumeZoom() { const z = input.zoom; input.zoom = 0; return z; }
