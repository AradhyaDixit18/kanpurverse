import type { Metadata } from "next";
import PlayClient from "./PlayClient";
export const metadata: Metadata = { title: "Play — KanpurVerse", description: "Browser-based single-player open world inspired by Kanpur." };
export default function Page() { return <PlayClient />; }
