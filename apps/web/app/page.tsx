import Link from "next/link";
import { LANDMARKS, MISSIONS } from "@kanpurverse/shared";

export default function Landing() {
  return (
    <main className="landing">
      <header className="l-hero">
        <div className="l-logo">KANPUR<span>VERSE</span></div>
        <h1>Apna shehar, apni duniya.</h1>
        <p className="l-sub">A free, browser-based multiplayer open world inspired by Kanpur. Walk Mall Road, drive an auto past Moti Jheel, talk to Kanpuriya NPCs in their own voice, and explore with friends. No download, no account.</p>
        <div className="l-cta"><Link className="btn btn-accent big" href="/play">Play now</Link><a className="btn" href="#how">How it works</a></div>
        <p className="muted small">Works on desktop and phones with WebGL. Best in Brave, Chrome or Safari.</p>
      </header>

      <section className="l-grid" id="how">
        <div className="l-card"><h3>Explore</h3><p>A fictionalised district of central Kanpur: {LANDMARKS.filter(l => l.kind !== "park").map(l => l.name).slice(0, 8).join(", ")} and more.</p></div>
        <div className="l-card"><h3>Talk Kanpuriya</h3><p>Every NPC speaks Kanpuriya Hindi with subtitles. Switch to standard Hindi or English any time.</p></div>
        <div className="l-card"><h3>Drive</h3><p>Hatchbacks, a sedan, an SUV, a bike, a scooter and the classic auto. Pick up friends as passengers.</p></div>
        <div className="l-card"><h3>Play together</h3><p>Real-time multiplayer: proximity chat, parties, emotes, co-op missions and a cafe where you can just sit and talk.</p></div>
        <div className="l-card"><h3>{MISSIONS.length} missions</h3><p>{MISSIONS.map(m => m.name).join(" · ")}. Earn coins and XP; buy a Kanpuriya kurta or shades at Naveen Market.</p></div>
        <div className="l-card"><h3>Safe by design</h3><p>Guest play, filtered chat, mute/block/report, no real-money purchases, no tracking.</p></div>
      </section>

      <section className="l-note">
        <h2>About the map</h2>
        <p>KanpurVerse is a tribute, not a survey. Landmarks are inspired by real places but renamed or restyled, and no real business, brand or person is depicted. Built by <strong>Velto Studios</strong>, Kanpur.</p>
        <p className="muted small">Status: public preview. Expect rough edges. Report issues from the in-game menu.</p>
      </section>
      <footer className="l-foot">© {new Date().getFullYear()} Velto Studios · <Link href="/play">Play</Link></footer>
    </main>
  );
}
