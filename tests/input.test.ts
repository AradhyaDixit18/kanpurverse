import { afterEach, expect, it, vi } from "vitest";
import { bindInput, input, pollKeys, once } from "../apps/web/src/game/input";
afterEach(() => { vi.unstubAllGlobals(); input.touch.jump = false; });
it("touch brake remains held across keyboard polling, including release", () => {
  input.touch.jump = true; pollKeys(); pollKeys(); expect(input.jump).toBe(true);
  input.touch.jump = false; pollKeys(); expect(input.jump).toBe(false);
});
it("input detaches and binds to a new canvas after returning to the game", () => {
  const win = new EventTarget(), doc = new EventTarget();
  vi.stubGlobal("window", win); vi.stubGlobal("document", doc);
  const first = new EventTarget() as HTMLElement; const second = new EventTarget() as HTMLElement;
  const down = () => { const event = new Event("keydown"); Object.assign(event, { code: "Space", repeat: false }); win.dispatchEvent(event); };
  const cleanup = bindInput(first)!; down(); expect(once("Space")).toBe(true); expect(once("Space")).toBe(false);
  cleanup(); down(); expect(once("Space")).toBe(false);
  const secondCleanup = bindInput(second)!; down(); expect(once("Space")).toBe(true);
  input.touch.jump = true; input.touch.joy.x = 1; win.dispatchEvent(new Event("blur")); pollKeys();
  expect(input.jump).toBe(false); expect(input.right).toBe(0); secondCleanup();
});
