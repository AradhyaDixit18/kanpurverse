import { useStore } from "../state/store";
let pending: Promise<typeof import("./Game")> | undefined;
/** Start the lazy engine download early (menu hover / Play) so the world appears sooner. */
export function loadGameEngine() {
  if (!pending) {
    useStore.getState().set({ loadProgress: 0 });
    pending = import("./Game").then(module => { useStore.getState().set({ loadProgress: 100 }); return module; }).catch(error => { pending = undefined; throw error; });
  }
  return pending;
}
export function preloadGameEngine() { void loadGameEngine().catch(() => { /* The visible engine boundary supplies recovery on render. */ }); }
