"use client";
import React from "react";
/** Error boundary for 3D subtrees: logs and renders nothing instead of unmounting the whole canvas. */
export class Boundary extends React.Component<{ children: React.ReactNode; name?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.warn(`[KanpurVerse] ${this.props.name ?? "subtree"} failed and was disabled:`, err); }
  render() { return this.state.failed ? null : this.props.children; }
}
