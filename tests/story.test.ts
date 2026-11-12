import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MISSIONS, NPCS, STORY_CHAPTERS, FINALE_ID, storyUnlocked, nextChapter, sideMissionsOpen, chapterFor, GAME_TITLE, PROTAGONIST } from "@kanpurverse/shared";
import { net } from "../apps/web/src/net/client";
import { useStore } from "../apps/web/src/state/store";

const data = new Map<string, string>();
beforeEach(() => {
  vi.useFakeTimers(); data.clear();
  vi.stubGlobal("localStorage", { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) });
  useStore.getState().set({ name: "StoryQA", cutscene: undefined, credits: undefined });
  net.connect("solo", true);
});
afterEach(() => { net.disconnect(); vi.useRealTimers(); vi.unstubAllGlobals(); });

/** Walk every checkpoint of the active mission (photo-kind missions need the explicit E checkpoint). */
function playActive() {
  const m = useStore.getState().mission!; const def = m.def;
  for (const [index, p] of def.checkpoints.entries()) {
    net.sendState([p[0], 1, p[1]], 0, "walk"); vi.advanceTimersByTime(1000);
    if (def.kind === "photo") net.send({ t: "mission.checkpoint", id: def.id, index, p: [p[0], 1, p[1]] });
  }
}

describe("Kanpur Chronicles story data", () => {
  it("has eight ordered chapters, each backed by a mission with an existing giver and matching objectives", () => {
    expect(GAME_TITLE).toBe("Kanpur Chronicles"); expect(PROTAGONIST.name).toBe("Kanupriya Tommy");
    expect(STORY_CHAPTERS.map(c => c.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const c of STORY_CHAPTERS) {
      const def = MISSIONS.find(m => m.id === c.missionId)!; expect(def).toBeDefined();
      expect(NPCS.some(n => n.id === c.giver)).toBe(true); expect(def.giver).toBe(c.giver);
      expect(c.objectives.length).toBe(def.checkpoints.length);
      expect(c.intro.length).toBeGreaterThan(1); expect(c.outro.length).toBeGreaterThan(1);
      for (const l of [...c.intro, ...c.outro]) { expect(/[ऀ-ॿ]/.test(l.hi)).toBe(true); expect(l.en.length).toBeGreaterThan(3); }
    }
    expect(STORY_CHAPTERS.at(-1)!.missionId).toBe(FINALE_ID);
  });
  it("climax revisits locations established earlier in the story", () => {
    const fin = MISSIONS.find(m => m.id === FINALE_ID)!; const earlier = STORY_CHAPTERS.slice(0, -1).flatMap(c => MISSIONS.find(m => m.id === c.missionId)!.checkpoints);
    for (const cp of fin.checkpoints) expect(earlier.some(e => Math.hypot(e[0] - cp[0], e[1] - cp[1]) < 20)).toBe(true);
  });
  it("unlocks chapters in order and keeps side missions behind chapter 2", () => {
    expect(storyUnlocked("story_01_wapsi", [])).toBe(true);
    expect(storyUnlocked("laddoo_chakkar", [])).toBe(false);
    expect(storyUnlocked("laddoo_chakkar", ["story_01_wapsi"])).toBe(true);
    expect(nextChapter(["story_01_wapsi"])?.n).toBe(2);
    expect(sideMissionsOpen(["story_01_wapsi"])).toBe(false); expect(sideMissionsOpen(["laddoo_chakkar"])).toBe(true);
  });
});

describe("Kanpur Chronicles campaign runtime", () => {
  it("refuses out-of-order chapters", () => {
    net.sendState([462, 1, -336], 0, "idle"); net.send({ t: "mission.start", id: "laddoo_chakkar" });
    expect(useStore.getState().mission).toBeUndefined();
  });
  it("plays the whole campaign end to end with cutscenes, saves and credits", () => {
    for (const c of STORY_CHAPTERS) {
      const def = MISSIONS.find(m => m.id === c.missionId)!;
      net.sendState([def.start[0], 1, def.start[1]], 0, "idle");
      net.send({ t: "mission.start", id: def.id });
      expect(useStore.getState().mission?.def.id).toBe(def.id);
      expect(useStore.getState().cutscene?.lines).toBe(c.intro);
      // timers freeze during the cutscene
      const started = useStore.getState().mission!.startedAt; vi.advanceTimersByTime(2000);
      expect(useStore.getState().mission!.startedAt).toBeGreaterThan(started);
      useStore.getState().set({ cutscene: undefined });
      playActive();
      expect(useStore.getState().mission).toBeUndefined();
      expect(useStore.getState().missionResult?.success).toBe(true);
      expect(useStore.getState().cutscene?.lines).toBe(c.outro);
      expect(chapterFor(def.id)?.n).toBe(c.n);
      if (c.missionId === FINALE_ID) expect(useStore.getState().cutscene?.then).toBe("credits");
      useStore.getState().set({ cutscene: undefined, missionResult: undefined });
    }
    const done = useStore.getState().profile!.missionsCompleted;
    expect(STORY_CHAPTERS.every(c => done.includes(c.missionId))).toBe(true);
    expect(nextChapter(done)).toBeUndefined();
    net.disconnect(); net.connect();
    expect(useStore.getState().profile!.missionsCompleted).toEqual(expect.arrayContaining(STORY_CHAPTERS.map(c => c.missionId)));
  });
  it("replaying a finished chapter pays a reduced reward and skips the outro", () => {
    useStore.getState().set({ profile: { ...useStore.getState().profile!, missionsCompleted: ["story_01_wapsi"] } });
    const coins = useStore.getState().profile!.coins; const def = MISSIONS.find(m => m.id === "story_01_wapsi")!;
    net.sendState([def.start[0], 1, def.start[1]], 0, "idle"); net.send({ t: "mission.start", id: def.id }); useStore.getState().set({ cutscene: undefined });
    playActive();
    expect(useStore.getState().profile!.coins).toBe(coins + Math.round(def.reward.coins * 0.25));
    expect(useStore.getState().cutscene).toBeUndefined();
  });
});
