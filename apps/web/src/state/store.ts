"use client";
import { create } from "zustand";
import { DEFAULT_APPEARANCE, PROTAGONIST, type CutsceneLine, type Appearance, type Language, type PlayerProfile, type PlayerSnapshot, type VehicleSnapshot, type MissionDef } from "@kanpurverse/shared";

import { resolveGraphics, type Quality, type GraphicsOverrides, type ResolvedGraphics } from "../game/graphics";
export type { Quality };
export interface Settings { atmosphere: "cycle" | "day" | "sunset" | "night"; cleanLanguage: boolean; langChosen?: boolean; lang: Language; subtitles: boolean; voice: boolean; master: number; music: number; sfx: number; ambience: number; dialogue: number; quality: Quality; gfx?: GraphicsOverrides; headlights?: "auto" | "on" | "off"; sensitivity: number; invertY: boolean; largeText: boolean; reduceMotion: boolean; colorblind: boolean; showFps: boolean; touch: boolean }
export interface ChatMsg { from: string; name: string; text: string; at: number; system?: boolean }
export interface Subtitle { speaker: string; text: string; roman?: string; until: number }
export interface MissionState { def: MissionDef; index: number; startedAt: number; status: "started" | "completed" | "failed" }

const LS = "kanpurverse.v1";
function loadLocal(): Partial<{ settings: Settings; appearance: Appearance; name: string; token: string }> { try { return JSON.parse(localStorage.getItem(LS) ?? "{}"); } catch { return {}; } }

interface Store {
  saveState?: "saved" | "error"; lastSavedAt?: number;
  /** Story cutscene currently on screen (input and mission timers pause while set). */
  cutscene?: { title: string; lines: CutsceneLine[]; i: number; then?: "credits" }; credits?: boolean;
  missionResult?: {id:string;success:boolean;coins:number;xp:number}; health: number; ownedVehicles: string[]; collectibles: string[];
  screen: "landing" | "menu" | "character" | "loading" | "play" | "error";
  name: string; appearance: Appearance; token?: string; settings: Settings;
  connected: boolean; serverCapabilities: string[]; selfId?: string; profile?: PlayerProfile; players: Record<string, PlayerSnapshot>; vehicles: Record<string, VehicleSnapshot>; worldTime: number;
  chat: ChatMsg[]; subtitle?: Subtitle; toasts: { id: number; text: string; kind: string }[]; mission?: MissionState; party: string[]; invites: { from: string; name: string }[];
  dialogue?: { npc: string; lineId: string }; nearby?: { kind: "npc" | "vehicle" | "landmark" | "checkpoint"; id: string; label: string };
  streetAction?: { action: "consume" | "spit"; at: number };
  paused: boolean; ping: number; fps: number; renderScale?: number; vehicleCondition?: number; inVehicle?: string; seat?: "driver" | "passenger"; vehicleTransition?: "entering" | "exiting"; errorText?: string; loadStage?: "engine" | "connecting" | "auth" | "joining" | "done"; loadProgress?: number;
  set: (p: Partial<Store>) => void; saveLocal: () => void; toast: (text: string, kind?: string) => void; pushChat: (m: ChatMsg) => void;
  setSettings: (s: Partial<Settings>) => void;
}

const DEFAULT_SETTINGS: Settings = { atmosphere: "cycle", cleanLanguage: true, lang: "kanpuriya", subtitles: true, voice: true, master: 1, music: 0.45, sfx: 0.8, ambience: 0.6, dialogue: 1, quality: "medium", sensitivity: 1, invertY: false, largeText: false, reduceMotion: false, colorblind: false, showFps: false,
  touch: typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0) };

/** Kanupriya Tommy's signature look (editable in the character studio). */
export const PROTAGONIST_LOOK: Appearance = { ...DEFAULT_APPEARANCE, body: "f", skin: 2, hair: 4, hairColor: 0, top: 2, bottom: 1, shoes: 2, accessory: 1 };

export const useStore = create<Store>((set, get) => {
  const local = typeof window !== "undefined" ? loadLocal() : {};
  return {
    health: 100, ownedVehicles: ["v_scooter_1"], collectibles: [], screen: "landing", name: local.name ?? PROTAGONIST.handle, appearance: local.appearance ?? PROTAGONIST_LOOK, token: local.token, settings: { ...DEFAULT_SETTINGS, ...(local.settings ?? {}) },
    connected: false, serverCapabilities: [], players: {}, vehicles: {}, worldTime: 0.3, chat: [], toasts: [], party: [], invites: [], paused: false, ping: 0, fps: 0,
    set: (p) => set(p),
    saveLocal: () => { const { settings, appearance, name, token } = get(); try { localStorage.setItem(LS, JSON.stringify({ settings, appearance, name, token })); } catch { /* private mode */ } },
    toast: (text, kind = "info") => { const id = Date.now() + Math.random(); set(s => ({ toasts: [...s.toasts.slice(-4), { id, text, kind }] })); setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 3500); },
    pushChat: (m) => set(s => ({ chat: [...s.chat.slice(-80), m] })),
    setSettings: (p) => { set(s => ({ settings: { ...s.settings, ...p } })); get().saveLocal(); },
  };
});

/** Resolved renderer configuration (preset + advanced overrides). */
export function useGraphics(): ResolvedGraphics { const q = useStore(s => s.settings.quality); const o = useStore(s => s.settings.gfx); return resolveGraphicsCached(q, o); }
let _gk = "", _gv: ResolvedGraphics | null = null;
export function resolveGraphicsCached(q: Quality, o?: GraphicsOverrides) { const k = q + JSON.stringify(o ?? {}); if (k !== _gk || !_gv) { _gk = k; _gv = resolveGraphics(q, o); } return _gv; }
export function graphicsNow() { const s = useStore.getState().settings; return resolveGraphicsCached(s.quality, s.gfx); }
