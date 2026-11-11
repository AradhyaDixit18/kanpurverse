import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { net } from "../apps/web/src/net/client";
import { useStore } from "../apps/web/src/state/store";
import { VEHICLE_EXIT_CAPABILITY } from "../packages/shared/src/index";
let send: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers(); vi.stubGlobal("WebSocket", { OPEN: 1 }); send = vi.fn();
  net.ws = { readyState: 1, send } as unknown as WebSocket;
  useStore.getState().set({ serverCapabilities: [], toasts: [] });
});
afterEach(() => { net.ws = undefined; vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it("a new preview cannot enter vehicles on a backend that ignores safe exit candidates", () => {
  net.send({ t: "vehicle.enter", id: "car", seat: "driver" }); expect(send).not.toHaveBeenCalled();
  expect(useStore.getState().toasts.at(-1)?.text).toContain("safety update required");
});
it("a matching server permits normal seat requests", () => {
  useStore.getState().set({ serverCapabilities: [VEHICLE_EXIT_CAPABILITY] });
  net.send({ t: "vehicle.enter", id: "car", seat: "passenger" });
  expect(JSON.parse(send.mock.calls[0][0])).toEqual({ t: "vehicle.enter", id: "car", seat: "passenger" });
});
it("legacy-server exploration and chat remain available", () => {
  net.send({ t: "chat", text: "Hello" }); expect(send).toHaveBeenCalledOnce();
});
