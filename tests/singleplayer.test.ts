/** Phase C regression guard: Kanpur Chronicles is single-player only. Multiplayer code, routes, UI and deps stay removed. */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { C2S } from "@kanpurverse/shared";
import { useStore } from "../apps/web/src/state/store";

const root = new URL("..", import.meta.url).pathname;
const walk = (d: string): string[] => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? (f === "node_modules" || f === ".next" ? [] : walk(p)) : [p]; });
const source = [...walk(join(root, "apps/web/src")), ...walk(join(root, "apps/web/app"))].filter(f => /\.(tsx?|css)$/.test(f));

describe("single-player only", () => {
  it("has no multiplayer server workspace, deployment or legacy client", () => {
    for (const p of ["apps/server", "deployment/Dockerfile.server", "deployment/render.yaml", "apps/web/src/net/legacyClient.ts", "apps/web/src/game/Remote.tsx"]) expect(existsSync(join(root, p))).toBe(false);
  });
  it("no package depends on socket or multiplayer libraries", () => {
    for (const f of ["package.json", "apps/web/package.json", "packages/shared/package.json"]) {
      const deps = Object.keys({ ...JSON.parse(readFileSync(join(root, f), "utf8")).dependencies });
      expect(deps.filter(d => /^(ws|socket\.io.*|colyseus.*|mongodb|peerjs|@?geckos.*)$/.test(d))).toEqual([]);
    }
  });
  it("the web client never opens sockets or peer connections", () => {
    for (const f of source) expect(readFileSync(f, "utf8"), f).not.toMatch(/new WebSocket|RTCPeerConnection|EventSource\(/);
  });
  it("player-facing screens offer no multiplayer, lobby, invite, party or chat", () => {
    const ui = source.filter(f => /\/(ui|app)\//.test(f) && !/\/qa\//.test(f));
    for (const f of ui) expect(readFileSync(f, "utf8"), f).not.toMatch(/multiplayer|multi-player|co-?op\b|lobby|matchmak|invite friend|join (a )?(room|session)|create session|party\.|Tab social|T chat/i);
  });
  it("game actions reject every networked message type", () => {
    for (const t of ["hello", "join", "state", "chat", "social", "ping", "vehicle.state"]) expect(C2S.safeParse({ t }).success).toBe(false);
  });
  it("the store has no chat, party, invite or ping state", () => {
    const s = useStore.getState() as unknown as Record<string, unknown>;
    for (const k of ["chat", "party", "invites", "ping", "pushChat", "serverCapabilities"]) expect(k in s).toBe(false);
  });
});
