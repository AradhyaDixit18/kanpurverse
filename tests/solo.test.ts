import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseSoloSave, SOLO_KEY } from "../apps/web/src/state/soloSave";
import { net } from "../apps/web/src/net/client";
import { useStore } from "../apps/web/src/state/store";
import { MISSIONS } from "@kanpurverse/shared";
const data = new Map<string, string>();
beforeEach(() => {
  vi.useFakeTimers();
  data.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
  });
  useStore.getState().set({ name: "SoloQA" });
  net.connect("solo", true);
});
afterEach(() => {
  net.disconnect();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
/** Story precondition: Chapter 1 complete so Chapter 2 (laddoo_chakkar) can start; dismiss the intro cutscene. */
function chapterOneDone() { const s = useStore.getState(); s.set({ profile: { ...s.profile!, missionsCompleted: [...s.profile!.missionsCompleted, "story_01_wapsi"] } }); }
function startLaddoo() { chapterOneDone(); net.send({ t: "mission.start", id: "laddoo_chakkar" }); useStore.getState().set({ cutscene: undefined }); }
describe("single-player runtime", () => {
  it("runs without WebSocket or authentication", () => {
    expect(useStore.getState().screen).toBe("play");
    expect(Object.keys(useStore.getState().players)).toEqual(["solo"]);
    expect(parseSoloSave(data.get(SOLO_KEY)!)).not.toBeNull();
  });
  it("rejects corrupted and future saves", () => {
    expect(parseSoloSave("{bad")).toBeNull();
    expect(parseSoloSave('{"version":99}')).toBeNull();
  });
  it("preserves economy, inventory and position across reconnect", () => {
    net.sendState([480, 1, -326], 0, "idle");
    net.send({ t: "shop.buy", item: "gutka" });
    net.save();
    net.disconnect();
    net.connect();
    expect(useStore.getState().profile?.coins).toBe(195);
    expect(useStore.getState().profile?.inventory?.gutka).toBe(1);
    expect(useStore.getState().players.solo.p[0]).toBe(480);
  });
  it("guards consumption and spitting cooldowns", () => {
    net.send({ t: "street.consume" });
    expect(useStore.getState().profile?.inventory?.gutka).toBe(0);
    net.sendState([480, 1, -326], 0, "idle");
    net.send({ t: "shop.buy", item: "gutka" });
    net.send({ t: "street.consume" });
    net.send({ t: "street.spit" });
    expect(useStore.getState().profile?.civic).toBe(100);
    vi.advanceTimersByTime(2500);
    net.send({ t: "street.spit" });
    expect(useStore.getState().profile?.civic).toBe(99);
    net.send({ t: "street.spit" });
    expect(useStore.getState().profile?.civic).toBe(99);
  });
  it("requires ordered physical mission checkpoints and grants reward once", () => {
    net.sendState([462, 1, -336], 0, "idle");
    startLaddoo();
    const def = MISSIONS.find((m) => m.id === "laddoo_chakkar")!;
    net.send({
      t: "mission.checkpoint",
      id: def.id,
      index: 3,
      p: [462, 1, -336],
    });
    expect(useStore.getState().mission?.index).toBe(0);
    for (const [index, p] of def.checkpoints.entries()) {
      net.sendState([p[0], 1, p[1]], 0, "walk");
      vi.advanceTimersByTime(1000);
      net.send({
        t: "mission.checkpoint",
        id: def.id,
        index,
        p: [p[0], 1, p[1]],
      });
    }
    expect(useStore.getState().mission).toBeUndefined();
    expect(useStore.getState().profile?.coins).toBe(850);
    expect(useStore.getState().ownedVehicles).toContain("v_hatch_1");
    net.disconnect();
    net.connect();
    expect(useStore.getState().profile?.missionsCompleted).toContain(def.id);
  });
  it("saves and restores an active mission checkpoint", () => {
    net.sendState([462, 1, -336], 0, "idle");
    startLaddoo();
    net.sendState([489, 1, -316], 0, "walk");
    vi.advanceTimersByTime(1000);
    net.send({
      t: "mission.checkpoint",
      id: "laddoo_chakkar",
      index: 0,
      p: [489, 1, -316],
    });
    net.disconnect();
    net.connect();
    expect(useStore.getState().mission?.index).toBe(1);
  });
 it('pauses mission time and reports a retryable timed failure',()=>{net.sendState([462,1,-336],0,'idle');startLaddoo();useStore.getState().set({paused:true});vi.advanceTimersByTime(245000);expect(useStore.getState().mission).toBeDefined();useStore.getState().set({paused:false});vi.advanceTimersByTime(241000);expect(useStore.getState().mission).toBeUndefined();expect(useStore.getState().missionResult?.success).toBe(false);});
 it('falls back to the previous valid save when current JSON is corrupted',()=>{net.save();data.set(SOLO_KEY,'broken');net.disconnect();data.set(SOLO_KEY,'broken');net.connect();expect(useStore.getState().profile?.name).toBe('SoloQA');});

 it('reports storage failure without pretending to save',()=>{vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{throw new Error('Quota exceeded')}});expect(net.save()).toBe(false);expect(useStore.getState().toasts.at(-1)?.kind).toBe('error');});

 it('caught-player recovery persists the recovery position and checkpoint together',()=>{net.sendState([462,1,-336],0,'idle');startLaddoo();const m=useStore.getState().mission!;useStore.getState().set({mission:{...m,index:2}});net.sendState([494,1,-309],0,'idle');expect(net.recoverCaper()).toBe(true);const saved=parseSoloSave(data.get(SOLO_KEY)!);expect(saved?.position).toEqual([489,1,-316]);expect(saved?.mission?.index).toBe(1);expect(saved?.health).toBe(90);net.disconnect();net.connect();expect(useStore.getState().mission?.index).toBe(1);expect(useStore.getState().players.solo.p).toEqual([489,1,-316]);});

});
