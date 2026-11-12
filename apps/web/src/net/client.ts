"use client";
/** Compatibility facade for existing controllers. All gameplay now executes locally; no sockets or auth. */
import {
  VEHICLE_SPAWNS,
  VEHICLE_HEIGHT,
  SPAWN_POINT,
  MISSIONS,
  chapterFor,
  storyUnlocked,
  sideMissionsOpen,
  FINALE_ID,
  SHOP_ITEMS,
  NPCS,
  PAAN_VENDOR,
  STREET,
  levelFromXp,
  type C2S,
  type PlayerSnapshot,
  type VehicleSnapshot,
  type AnimState,
} from "@kanpurverse/shared";
import { useStore } from "../state/store";
import { readSoloSave, writeSoloSave } from "../state/soloSave";
import { visualClock } from "../game/syncedClock";
export const WS_URL = "Local single-player";
export const remoteBuf = new Map<
  string,
  { t: number; p: [number, number, number]; ry: number; anim: string }[]
>();
export const vehicleBuf = new Map<
  string,
  {
    t: number;
    p: [number, number, number];
    q: [number, number, number, number];
    v: number;
  }[]
>();
export const vehicleCorrections = new Map<string, VehicleSnapshot>();
export const serverOffset = 0;
export const correction: { p: [number, number, number] | null; at: number } = {
  p: null,
  at: 0,
};
class SoloSession {
  room = "solo";
  private timer?: ReturnType<typeof setInterval>;
  private consumeUntil = 0;
  private spitReady = false;
  private lastSpit = 0;
  private lastCheckpoint = 0;
  private position: [number, number, number] = [...SPAWN_POINT];
  private savedAt = 0;
  private time = 0.69;
  private stateSent = 0;
  status() {
    return { wantOpen: !!this.timer, readyState: 1, retry: 0, room: "solo" };
  }
  connect(_room = "solo", fresh = false) {
    void _room;
    clearInterval(this.timer);
    const s = useStore.getState();
    if (fresh) {
      try {
        const old = localStorage.getItem("kanpurverse.solo.v1");
        if (old)
          localStorage.setItem("kanpurverse.solo.v1.previous-story", old);
      } catch {}
    }
    const save = fresh ? null : readSoloSave();
    this.position = save?.position ?? [...SPAWN_POINT];
    this.time = save?.worldTime ?? 0.69;
    this.spitReady = false;
    this.lastCheckpoint = 0;
    this.consumeUntil = 0;
    this.lastSpit = 0;
    const profile = save?.profile ?? {
      name: s.name || "Kanpuriya",
      appearance: s.appearance,
      lang: s.settings.lang,
      level: 1,
      xp: 0,
      coins: 200,
      missionsCompleted: [],
      unlocked: [],
      playtimeSec: 0,
      inventory: { gutka: 0 },
      civic: 100,
    };
    profile.name = s.name || profile.name; profile.appearance=s.appearance; profile.lang=s.settings.lang;
    const self: PlayerSnapshot = {
      id: "solo",
      name: profile.name,
      p: this.position,
      ry: 0,
      anim: "idle",
      appearance: profile.appearance,
      level: profile.level,
    };
    const vehicles: Record<string, VehicleSnapshot> = {};
    for (const v of VEHICLE_SPAWNS)
      vehicles[v.id] = {
        id: v.id,
        kind: v.kind,
        p: [v.p[0], VEHICLE_HEIGHT[v.kind] / 2 + 0.08, v.p[1]],
        q: [0, Math.sin(v.ry / 2), 0, Math.cos(v.ry / 2)],
        v: 0,
      };
    const def = MISSIONS.find((m) => m.id === save?.mission?.id),
      m = save?.mission;
    const mission =
      def && m && m.index < def.checkpoints.length
        ? {
            def,
            index: m.index,
            startedAt:
              Date.now() -
              (def.timeLimitSec && m.remaining
                ? (def.timeLimitSec - m.remaining) * 1000
                : 0),
            status: "started" as const,
          }
        : undefined;
    visualClock.sync(this.time, performance.now(), true);
    correction.p = this.position;
    correction.at = performance.now();
    s.set({
      screen: "play",
      loadStage: "done",
      profile,
      name: profile.name,
      appearance: profile.appearance,
      selfId: "solo",
      connected: true,
      players: { solo: self },
      vehicles,
      worldTime: this.time,
      mission,
      inVehicle: undefined,
      seat: undefined,
      vehicleTransition: undefined,
      paused: false,
      missionResult: undefined,
      health: save?.health ?? 100,
      ownedVehicles: save?.ownedVehicles ?? ["v_scooter_1"],
      collectibles: save?.collectibles ?? [],
      dialogue: undefined,
    });
    this.timer = setInterval(() => this.tick(), 250);
    this.savedAt = Date.now();
    s.toast(
      save
        ? "स्थानीय सेव से वापसी · Welcome back"
        : "कानपुर में स्वागत है · Your solo story begins",
    );
    this.save();
  }
  newGame() {
    this.connect("solo", true);
  }
  disconnect() {
    this.save();
    clearInterval(this.timer);
    this.timer = undefined;
    useStore.getState().set({ connected: false });
  }
  private storageWarned = false;
  save() {
    const s = useStore.getState();
    if (!s.profile) return false;
    const m = s.mission;
    const saved = writeSoloSave({
      version: 1,
      savedAt: Date.now(),
      position: this.position,
      profile: {
        ...s.profile,
        inventory: s.profile.inventory ?? { gutka: 0 },
        civic: s.profile.civic ?? 100,
      },
      health: s.health,
      ownedVehicles: s.ownedVehicles,
      collectibles: s.collectibles,
      worldTime: this.time,
      mission: m
        ? {
            id: m.def.id,
            index: m.index,
            remaining: m.def.timeLimitSec
              ? Math.max(
                  1,
                  m.def.timeLimitSec - (Date.now() - m.startedAt) / 1000,
                )
              : undefined,
          }
        : undefined,
    });
    if (!saved && !this.storageWarned) { this.storageWarned=true; s.toast("सेव नहीं हुआ। Browser storage उपलब्ध नहीं है।", "error"); }
    if (saved) this.storageWarned=false;
    s.set({saveState:saved?"saved":"error",lastSavedAt:saved?Date.now():s.lastSavedAt});
    return saved;
  }
  /** Gameplay checkpoint recovery updates both save authority and physics together. */
  recoverCaper() {
    const s=useStore.getState(),m=s.mission;
    if(!m || m.def.id!=="laddoo_chakkar" || m.index!==2)return false;
    const p:[number,number,number]=[489,1,-316];
    this.position=p; correction.p=p; correction.at=performance.now();
    const vehicles={...s.vehicles};if(s.inVehicle&&vehicles[s.inVehicle])vehicles[s.inVehicle]={...vehicles[s.inVehicle],driver:undefined};
    s.set({players:s.players.solo?{solo:{...s.players.solo,p}}:s.players,health:Math.max(10,s.health-10),mission:{...m,index:1},inVehicle:undefined,seat:undefined,vehicleTransition:undefined,vehicles});
    s.toast("पकड़े गए गुरु! दुकान वाला checkpoint फिर करो।","error");this.save();return true;
  }
  private tick() {
    const s = useStore.getState();
    if (s.paused || s.dialogue || s.cutscene || s.credits) {
      if (s.mission)
        s.set({
          mission: { ...s.mission, startedAt: s.mission.startedAt + 250 },
        });
      return;
    }
    this.time =
      s.settings.atmosphere === "day"
        ? 0.48
        : s.settings.atmosphere === "sunset"
          ? 0.745
          : s.settings.atmosphere === "night"
            ? 0.88
            : (this.time + 8 / 86400) % 1;
    visualClock.sync(this.time, performance.now());
    s.set({ worldTime: this.time });
    const m = s.mission;
    if (m) {
      if (
        m.def.timeLimitSec &&
        Date.now() - m.startedAt > m.def.timeLimitSec * 1000
      ) {
        s.set({
          mission: undefined,
          missionResult: { id: m.def.id, success: false, coins: 0, xp: 0 },
        });
        s.toast("समय खत्म। Mission log से फिर शुरू करो।", "error");
        this.save();
      } else if (m.def.kind !== "photo") this.checkpoint();
    }
    if (Date.now() - this.savedAt > 5000) {
      this.savedAt = Date.now();
      if (s.profile)
        s.set({
          profile: { ...s.profile, playtimeSec: s.profile.playtimeSec + 5 },
        });
      this.save();
    }
  }
  private checkpoint() {
    const s = useStore.getState(),
      m = s.mission;
    if (!m || Date.now() - this.lastCheckpoint < 900) return;
    const p = m.def.checkpoints[m.index];
    if (
      !p ||
      Math.hypot(this.position[0] - p[0], this.position[2] - p[1]) >
        m.def.radius
    )
      return;
    if (m.def.needsVehicle && !s.inVehicle) return;
    this.lastCheckpoint = Date.now();
    if (m.index + 1 < m.def.checkpoints.length) {
      s.set({ mission: { ...m, index: m.index + 1 } });
      s.toast("लक्ष्य पूरा · Next objective");
    } else {
      const profile = s.profile!;
      const first = !profile.missionsCompleted.includes(m.def.id);
      const xp =
        profile.xp +
        (first ? m.def.reward.xp : Math.round(m.def.reward.xp * 0.25));
      s.set({
        mission: undefined,
        missionResult: {
          id: m.def.id,
          success: true,
          coins: first
            ? m.def.reward.coins
            : Math.round(m.def.reward.coins * 0.25),
          xp: first ? m.def.reward.xp : Math.round(m.def.reward.xp * 0.25),
        },
        profile: {
          ...profile,
          xp,
          level: levelFromXp(xp),
          coins:
            profile.coins +
            (first
              ? m.def.reward.coins
              : Math.round(m.def.reward.coins * 0.25)),
          missionsCompleted: [
            ...new Set([...profile.missionsCompleted, m.def.id]),
          ],
        },
        ownedVehicles:
          m.def.id === "laddoo_chakkar"
            ? [...new Set([...s.ownedVehicles, "v_hatch_1"])]
            : s.ownedVehicles,
      });
      const ch = chapterFor(m.def.id);
      if (ch && first) s.set({ cutscene: { title: `${ch.titleHi} · ${ch.title}`, lines: ch.outro, i: 0, then: ch.missionId === FINALE_ID ? "credits" : undefined } });
      s.toast(
        `MISSION COMPLETE · ${m.def.nameHi} +${first ? m.def.reward.coins : Math.round(m.def.reward.coins * 0.25)} 🪙`,
        "reward",
      );
    }
    this.save();
  }
  sendState(p: [number, number, number], ry: number, anim: AnimState) {
    this.position = p;
    if (performance.now() - this.stateSent < 75) return;
    this.stateSent = performance.now();
    const s = useStore.getState(),
      self = s.players.solo;
    if (self) s.set({ players: { solo: { ...self, p, ry, anim } } });
  }
  sendVehicle(
    id: string,
    p: [number, number, number],
    q: [number, number, number, number],
    v: number,
  ) {
    const s = useStore.getState(),
      a = s.vehicles[id];
    this.position = p;
    if (a) s.set({ vehicles: { ...s.vehicles, [id]: { ...a, p, q, v } } });
  }
  send(m: C2S) {
    const s = useStore.getState(),
      profile = s.profile;
    if (!profile) return;
    const fail = (text: string) => {
      s.set({ vehicleTransition: undefined });
      s.toast(text, "error");
    };
    switch (m.t) {
      case "vehicle.enter": {
        const v = s.vehicles[m.id];
        if (
          !v ||
          Math.hypot(v.p[0] - this.position[0], v.p[2] - this.position[2]) > 6
        )
          return fail("गाड़ी के पास आओ।");
        s.set({
          vehicles: { ...s.vehicles, [m.id]: { ...v, driver: "solo" } },
          inVehicle: m.id,
          seat: "driver",
          vehicleTransition: undefined,
        });
        break;
      }
      case "vehicle.exit": {
        const id = s.inVehicle;
        if (!id || !m.p) return;
        const v = s.vehicles[id];
        if (Math.abs(v.v) > 1) return fail("पहले गाड़ी रोको।");
        s.set({
          vehicles: { ...s.vehicles, [id]: { ...v, driver: undefined } },
          inVehicle: undefined,
          seat: undefined,
          vehicleTransition: undefined,
        });
        this.position = m.p;
        correction.p = m.p;
        correction.at = performance.now();
        this.save();
        break;
      }
      case "mission.start": {
        const def = MISSIONS.find((d) => d.id === m.id);
        if (!def || s.mission) return;
        const chapter = chapterFor(m.id);
        if (chapter && !storyUnlocked(m.id, profile.missionsCompleted))
          return fail(`पहले पिछला अध्याय पूरा करो · Finish Chapter ${chapter.n - 1} first`);
        if (!chapter && !sideMissionsOpen(profile.missionsCompleted))
          return fail("पहले अध्याय 2 · LADDOO KA CHAKKAR पूरा करो।");
        if (
          Math.hypot(
            def.start[0] - this.position[0],
            def.start[1] - this.position[2],
          ) > 12
        )
          return fail("मिशन के निशान तक आओ।");
        s.set({
          mission: { def, index: 0, startedAt: Date.now(), status: "started" },
        });
        if (chapter) s.set({ cutscene: { title: `अध्याय ${chapter.n} · ${chapter.titleHi} · ${chapter.title}`, lines: chapter.intro, i: 0 } });
        s.toast(chapter ? `अध्याय ${chapter.n} शुरू · Chapter ${chapter.n} started` : "Mission started");
        this.save();
        break;
      }
      case "mission.checkpoint":
        this.checkpoint();
        break;
      case "mission.abandon":
        s.set({ mission: undefined });
        this.save();
        break;
      case "profile.update":
        s.set({
          profile: {
            ...profile,
            appearance: m.appearance ?? profile.appearance,
            lang: m.lang ?? profile.lang,
          },
        });
        this.save();
        break;
      case "shop.buy": {
        if (m.item === "gutka") {
          const vendor = NPCS.find((n) => n.id === PAAN_VENDOR)!;
          if (
            s.inVehicle ||
            Math.hypot(
              this.position[0] - vendor.path[0][0],
              this.position[2] - vendor.path[0][1],
            ) > 5
          )
            return fail("पान चाचा के पास आओ।");
          if (
            (profile.inventory?.gutka ?? 0) >= 30 ||
            profile.coins < STREET.price
          )
            return fail("झोला भरा या सिक्के कम।");
          s.set({
            profile: {
              ...profile,
              coins: profile.coins - STREET.price,
              inventory: { gutka: (profile.inventory?.gutka ?? 0) + 1 },
            },
          });
        } else {
          const it = SHOP_ITEMS.find((i) => i.id === m.item);
          if (
            !it ||
            profile.coins < it.price ||
            profile.unlocked.includes(it.id)
          )
            return fail("खरीद उपलब्ध नहीं।");
          s.set({
            profile: {
              ...profile,
              coins: profile.coins - it.price,
              unlocked: [...profile.unlocked, it.id],
            },
          });
        }
        this.save();
        break;
      }
      case "street.consume":
        if (
          s.inVehicle ||
          this.spitReady ||
          Date.now() < this.consumeUntil ||
          (profile.inventory?.gutka ?? 0) < 1
        )
          return fail("पहले पैकेट खरीदो या मौजूदा काम पूरा करो।");
        this.consumeUntil = Date.now() + STREET.consumeMs;
        this.spitReady = true;
        s.set({
          profile: {
            ...profile,
            inventory: { gutka: profile.inventory!.gutka - 1 },
          },
          streetAction: { action: "consume", at: performance.now() },
        });
        this.save();
        break;
      case "street.spit":
        if (
          s.inVehicle ||
          !this.spitReady ||
          Date.now() < this.consumeUntil ||
          Date.now() - this.lastSpit < STREET.spitCooldownMs
        )
          return fail("अभी तैयार नहीं।");
        this.spitReady = false;
        this.lastSpit = Date.now();
        s.set({
          profile: {
            ...profile,
            civic: Math.max(0, (profile.civic ?? 100) - STREET.penalty),
          },
          streetAction: { action: "spit", at: performance.now() },
        });
        this.save();
        break;
      case "emote":
        break;
      default:
        break;
    }
  }
}
export const net = new SoloSession();
if (typeof window !== "undefined")
  window.addEventListener("pagehide", () => net.save());
