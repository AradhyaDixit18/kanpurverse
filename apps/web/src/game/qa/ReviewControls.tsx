"use client";
import { useEffect, useState } from "react";
export function ReviewControls() {
  const [status, setStatus] = useState("Development diagnostics");
  useEffect(() => { const fn = (e: Event) => setStatus((e as CustomEvent<string>).detail); window.addEventListener("kv:profile-status", fn); return () => window.removeEventListener("kv:profile-status", fn); }, []);
  return <aside style={{ position: "fixed", right: 12, top: 125, zIndex: 50, maxWidth: 400, background: "#151b22ee", color: "#eee", padding: 10, fontSize: 12 }}><button onClick={() => window.dispatchEvent(new Event("kv:world-capture"))}>Save world frame</button> <button onClick={() => window.dispatchEvent(new Event("kv:profile"))}>Profile 20 seconds</button><output style={{ display: "block", overflowWrap: "anywhere" }}>{status}</output></aside>;
}
