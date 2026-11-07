import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KanpurVerse — Apna shehar, apni duniya",
  description: "A free browser-based multiplayer open-world game inspired by Kanpur. Walk Mall Road, drive an auto past Moti Jheel, talk to Kanpuriya NPCs, play with friends.",
  openGraph: { title: "KanpurVerse", description: "Kanpur-inspired multiplayer open world in your browser.", type: "website" },
  robots: { index: false, follow: false }, // flipped on at production approval
};
export const viewport: Viewport = { themeColor: "#0b0b0d", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
