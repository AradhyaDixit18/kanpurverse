import Link from "next/link";
import { LANDMARKS, MISSIONS } from "@kanpurverse/shared";
import { Logo, Skyline } from "../src/ui/Brand";

export default function Landing() {
  return (
    <main className="landing">
      <header className="l-hero"><Skyline />
        <Logo size={44} />
        <h1>Apna shehar, apni duniya.</h1>
        <p className="l-sub">A free, browser-based multiplayer open world built on the <strong>real streets of Kanpur</strong>. Walk The Mall Road, wait at a railway phatak for the train, drive an auto or e-rickshaw to Kanpur Central, talk to Kanpuriya NPCs in their own voice, run 14 Kanpuriya missions, and explore with friends. The clock is real Kanpur time. No download, no account.</p>
        <div className="l-cta"><Link className="btn btn-accent big" href="/play">Play now</Link><a className="btn" href="#how">How it works</a></div>
        <p className="muted small">Works on desktop and phones with WebGL. Best in Brave, Chrome or Safari.</p>
      </header>

      <section className="l-gallery" aria-label="Screenshots">
        {[["03_mall_road_spawn", "The Mall Road at dusk — real OSM streets, chai stall, thela, Hindi shop boards"], ["07_level_crossing", "A real level crossing near Nayaganj: barriers, bell, keeper's cabin"], ["05_driving_erickshaw", "Driving an e-rickshaw past the auto stand"], ["08_kanpur_central", "Kanpur Central — stylised station building, bilingual boards, platforms behind"], ["06_nayaganj_tracks", "Tracks and shophouses at Nayaganj"], ["04_missions_log", "Missions log (J): 14 Kanpuriya missions"]].map(([f, cap]) => <figure key={f}><img src={`/screenshots/${f}.jpg`} alt={cap} loading="lazy" /><figcaption>{cap}</figcaption></figure>)}
      </section>

      <section className="l-grid" id="how">
        <div className="l-card"><h3>Explore real Kanpur</h3><p>Central Kanpur from OpenStreetMap data (© OpenStreetMap contributors): 488 km of real roads, the railway with 49 level crossings, Kanpur Central and Anwarganj, Nana Rao Park, Phool Bagh, Green Park, Christ Church and more — {LANDMARKS.filter(l => l.kind !== "park").map(l => l.name).slice(0, 6).join(", ")}.</p></div>
        <div className="l-card"><h3>Talk Kanpuriya</h3><p>Every NPC speaks Kanpuriya Hindi with neural voices and subtitles (Devanagari + roman). The whole game is also in standard Hindi and English — choose at the start, switch any time.</p></div>
        <div className="l-card"><h3>Drive</h3><p>Ten vehicles: hatchback, sedan, SUV, bike, scooter, auto, e-rickshaw, city bus, truck and taxi, in Indian traffic with cows, dogs and pigeons about. Pick up friends as passengers.</p></div>
        <div className="l-card"><h3>Play together</h3><p>Real-time multiplayer: proximity chat, parties, emotes, co-op missions and a cafe where you can just sit and talk.</p></div>
        <div className="l-card"><h3>{MISSIONS.length} missions</h3><p>{MISSIONS.map(m => m.name).join(" · ")}. Earn coins and XP; buy a Kanpuriya kurta or shades at Naveen Market.</p></div>
        <div className="l-card"><h3>Safe by design</h3><p>Guest play, filtered chat, mute/block/report, no real-money purchases, no tracking.</p></div>
      </section>

      <section className="l-note">
        <h2>About the map</h2>
        <p>Streets, railways, parks and building footprints come from OpenStreetMap (ODbL). Buildings without mapped footprints, facades, interiors and landmark styling are approximations — never claimed as exact replicas. No real business, brand or person is depicted. Built by <strong>Velto Studios</strong>, Kanpur.</p>
        <p className="muted small">Status: public preview. Expect rough edges. Report issues from the in-game menu.</p>
      </section>
      <footer className="l-foot">© {new Date().getFullYear()} Velto Studios · <Link href="/play">Play</Link></footer>
    </main>
  );
}
