"use client";
/** WebSocket client with reconnect, latency measurement and store wiring. Remote entities are interpolated in the renderer. */
import { PROTOCOL_VERSION, MISSIONS, type C2S, type S2C, type PlayerSnapshot, type VehicleSnapshot, type AnimState } from "@kanpurverse/shared";
import { useStore } from "../state/store";

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8787";

/** Interpolation buffers: id → [{t, p, ry}] */
export const remoteBuf = new Map<string, { t: number; p: [number, number, number]; ry: number; anim: string }[]>();
export const vehicleBuf = new Map<string, { t: number; p: [number, number, number]; q: [number, number, number, number]; v: number }[]>();
export const vehicleCorrections = new Map<string, VehicleSnapshot>();
export let serverOffset = 0; // serverTime - clientTime
/** Last authoritative position correction from the server (consumed by the player controller). */
export const correction: { p: [number, number, number] | null; at: number } = { p: null, at: 0 };

class NetClient {
  ws?: WebSocket; seq = 0; room = "kanpur-1"; private pingTimer?: ReturnType<typeof setInterval>; private retry = 0; private wantOpen = false; private lastStateSend = 0;
  private watchdog?: ReturnType<typeof setInterval>; private reconnectTimer?: ReturnType<typeof setTimeout>;
  /** QA/diagnostics: connection state without exposing the socket. */
  status() { return { wantOpen: this.wantOpen, readyState: this.ws?.readyState ?? -1, retry: this.retry, room: this.room }; }
  connect(room = "kanpur-1") {
    this.room = room; this.wantOpen = true; this.retry = 0; this.open();
    // Watchdog: a background tab can lose a socket (and a throttled reconnect timer) without any event we can act on.
    // Every 5 s, and whenever the tab becomes visible again, reopen if we want a connection and have none.
    clearInterval(this.watchdog);
    this.watchdog = setInterval(() => this.ensure(), 5000);
    if (typeof document !== "undefined" && !this.visBound) { this.visBound = true; document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") this.ensure(); }); }
  }
  private visBound = false;
  private ensure() {
    if (!this.wantOpen) return;
    const rs = this.ws?.readyState;
    if (rs === WebSocket.OPEN || rs === WebSocket.CONNECTING) return;
    clearTimeout(this.reconnectTimer); this.open();
  }
  private open() {
    const st = useStore.getState();
    st.set({ loadStage: "connecting" });
    let ws: WebSocket;
    try { ws = new WebSocket(WS_URL); } catch { st.set({ screen: "error", errorText: `Could not open a connection to ${WS_URL}` }); return; }
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws) return ws.close();
      this.retry = 0; useStore.getState().set({ loadStage: "auth" });
      const cur = useStore.getState();
      this.send({ t: "hello", v: PROTOCOL_VERSION, token: cur.token, guestName: cur.name || undefined, appearance: cur.appearance, lang: cur.settings.lang });
      clearInterval(this.pingTimer); this.pingTimer = setInterval(() => this.send({ t: "ping", at: performance.now() }), 3000);
    };
    ws.onmessage = (ev) => { if (this.ws !== ws) return; try { this.handle(JSON.parse(ev.data) as S2C); } catch (e) { console.warn("bad server message", e); } };
    ws.onclose = (ev) => {
      if (this.ws !== ws) return; // a superseded socket must never change the client's state
      clearInterval(this.pingTimer); useStore.getState().set({ connected: false });
      if (ev.code === 4003 || ev.code === 4005 || ev.code === 4006) { useStore.getState().set({ screen: "error", errorText: ev.reason === "replaced" ? "You signed in from another tab." : "You were removed from the server." }); this.wantOpen = false; return; }
      if (this.wantOpen) { if (this.retry >= 6 && useStore.getState().screen === "loading") { useStore.getState().set({ screen: "error", errorText: "The game server did not answer. It may be asleep or offline." }); this.wantOpen = false; return; } const delay = Math.min(8000, 500 * 2 ** this.retry++); clearTimeout(this.reconnectTimer); useStore.getState().toast(`Reconnecting in ${Math.round(delay / 1000)}s…`, "error"); this.reconnectTimer = setTimeout(() => this.wantOpen && this.open(), delay); }
    };
    this.ws.onerror = () => { /* onclose follows */ };
  }
  disconnect() { this.wantOpen = false; clearInterval(this.watchdog); clearTimeout(this.reconnectTimer); this.ws?.close(); }
  send(m: C2S) { if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m)); }
  sendState(p: [number, number, number], ry: number, anim: AnimState) {
    const now = performance.now(); if (now - this.lastStateSend < 50) return; this.lastStateSend = now;
    this.send({ t: "state", p: [round(p[0]), round(p[1]), round(p[2])], ry: round(ry), anim, seq: ++this.seq });
  }
  sendVehicle(id: string, p: [number, number, number], q: [number, number, number, number], v: number) {
    const now = performance.now(); if (now - this.lastStateSend < 50) return; this.lastStateSend = now;
    this.send({ t: "vehicle.state", id, p: p.map(round) as never, q: q.map(round) as never, v: round(v) });
  }
  private handle(m: S2C) {
    const s = useStore.getState();
    switch (m.t) {
      case "welcome": s.set({ selfId: m.id, token: m.token, profile: m.profile, name: m.name, connected: true }); s.saveLocal(); serverOffset = m.serverTime - Date.now(); s.set({ loadStage: "joining" }); this.send({ t: "join", room: this.room }); break;
      case "joined": { remoteBuf.clear(); vehicleBuf.clear(); vehicleCorrections.clear(); correction.p = null; s.set({ inVehicle: undefined, seat: undefined, vehicleTransition: undefined }); const players: Record<string, PlayerSnapshot> = {}; for (const p of m.players) players[p.id] = p; const vehicles: Record<string, VehicleSnapshot> = {}; for (const v of m.vehicles) vehicles[v.id] = v; s.set({ players, vehicles, worldTime: m.time, screen: "play", loadStage: "done" }); s.toast(`Joined ${m.room} · ${m.players.length} online`); break; }
      case "snapshot": { const now = performance.now(); const players = { ...s.players }; for (const p of m.players) { players[p.id] = p; if (p.id !== s.selfId) { const b = remoteBuf.get(p.id) ?? []; b.push({ t: now, p: p.p, ry: p.ry, anim: p.anim }); if (b.length > 6) b.shift(); remoteBuf.set(p.id, b); } }
        const vehicles = { ...s.vehicles }; for (const v of m.vehicles) { vehicles[v.id] = v; if (v.driver !== s.selfId) { const b = vehicleBuf.get(v.id) ?? []; b.push({ t: now, p: v.p, q: v.q, v: v.v }); if (b.length > 6) b.shift(); vehicleBuf.set(v.id, b); } }
        // self correction: if server disagrees strongly, snap (handled in controller via players[selfId])
        s.set({ players, vehicles, worldTime: m.time }); break; }
      case "player.join": s.set({ players: { ...s.players, [m.player.id]: m.player } }); s.pushChat({ from: "sys", name: "", text: `${m.player.name} joined`, at: Date.now(), system: true }); break;
      case "player.leave": { const players = { ...s.players }; const n = players[m.id]?.name; delete players[m.id]; remoteBuf.delete(m.id); s.set({ players }); if (n) s.pushChat({ from: "sys", name: "", text: `${n} left`, at: Date.now(), system: true }); break; }
      case "chat": s.pushChat(m); break;
      case "emote": if (s.players[m.id]) s.set({ players: { ...s.players, [m.id]: { ...s.players[m.id], anim: m.anim } } }); break;
      case "vehicle.update": { vehicleBuf.delete(m.vehicle.id); vehicleCorrections.delete(m.vehicle.id);
        if (m.vehicle.driver === s.selfId && s.inVehicle === m.vehicle.id) vehicleCorrections.set(m.vehicle.id, m.vehicle);
        s.set({ vehicles: { ...s.vehicles, [m.vehicle.id]: m.vehicle } }); if (m.vehicle.driver === s.selfId) s.set({ inVehicle: m.vehicle.id, seat: "driver", vehicleTransition: undefined }); else if (m.vehicle.passenger === s.selfId) s.set({ inVehicle: m.vehicle.id, seat: "passenger", vehicleTransition: undefined }); else if (s.inVehicle === m.vehicle.id) s.set({ vehicleTransition: "exiting" }); break; }
      case "mission.update": { const def = MISSIONS.find(d => d.id === m.id)!;
        if (m.status === "started") { s.set({ mission: { def, index: 0, startedAt: Date.now(), status: "started" } }); s.toast(`Mission: ${def.name}`); }
        else if (m.status === "checkpoint") { s.set({ mission: s.mission && { ...s.mission, index: m.index ?? s.mission.index + 1 } }); s.toast(`Checkpoint ${m.index}/${def.checkpoints.length}`); }
        else if (m.status === "completed") { s.set({ mission: undefined }); s.toast(`${def.name} complete! +${m.reward?.coins} coins, +${m.reward?.xp} XP`, "reward"); }
        else { s.set({ mission: undefined }); s.toast(`${def.name} failed — time's up`, "error"); } break; }
      case "profile": s.set({ profile: m.profile }); break;
      case "toast": s.toast(m.text, m.kind); break;
      case "social": if (m.event === "party.invite") s.set({ invites: [...s.invites, { from: m.from!, name: m.name! }] }); else if (m.event === "party.update") s.set({ party: m.party ?? [] }); else if (m.event === "friend.added") s.toast(`${m.name} added you as a friend`); break;
      case "error": s.set({ vehicleTransition: undefined }); if (m.code === "exit_blocked" || m.code === "vehicle_moving" || m.code === "rate" || m.code === "too_far" || m.code === "occupied" || m.code === "need_vehicle" || m.code === "coins" || m.code === "locked" || m.code === "busy" || m.code === "owned") s.toast(m.message, "error"); else if (m.code === "full" || m.code === "bad_name" || m.code === "banned") s.set({ screen: "error", errorText: m.message }); else console.warn("server error", m); break;
      case "pong": s.set({ ping: Math.round(performance.now() - m.at) }); break;
      case "correct": if (m.reason === "vehicle_exit") { s.set({ inVehicle: undefined, seat: undefined, vehicleTransition: undefined }); } correction.p = m.p; correction.at = performance.now(); break;
    }
  }
}
const round = (n: number) => Math.round(n * 1000) / 1000;
export const net = new NetClient();
