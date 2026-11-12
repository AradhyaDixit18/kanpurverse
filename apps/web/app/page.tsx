import Link from "next/link";
import { LANDMARKS, MISSIONS } from "@kanpurverse/shared";
import { Logo, Skyline } from "../src/ui/Brand";

export default function Landing() {
  return (
    <main className="landing">
      <header className="l-hero"><Skyline />
        <Logo size={44} />
        <h1>कानपुर की कहानी अभी बाकी है।</h1>
        <p className="l-sub">कनुप्रिया टॉमी चार साल बाद कानपुर लौटी है, और गंगा मेला ख़तरे में है। <strong>असली कानपुर की सड़कों</strong> पर बनी एक अकेले खेलने वाली कहानी: मॉल रोड, रेलवे फाटक, नवीन मार्केट, परमट घाट. <br /><span className="muted">A single-player story game on the real streets of Kanpur. Your progress saves on this device. No download, no account.</span></p>
        <div className="l-cta"><Link className="btn btn-accent big" href="/play">खेलो · Play</Link><a className="btn" href="#how">क्या है खेल में</a></div>
        <p className="muted small">Works on desktop and phones with WebGL. Best in Brave, Chrome or Safari.</p>
      </header>

      <section className="l-gallery" aria-label="Screenshots">
        {[["03_mall_road_spawn", "The Mall Road at dusk — real OSM streets, chai stall, thela, Hindi shop boards"], ["07_level_crossing", "A real level crossing near Nayaganj: barriers, bell, keeper's cabin"], ["05_driving_erickshaw", "Driving an e-rickshaw past the auto stand"], ["08_kanpur_central", "Kanpur Central — stylised station building, bilingual boards, platforms behind"], ["06_nayaganj_tracks", "Tracks and shophouses at Nayaganj"], ["04_missions_log", "Missions log (J): 14 Kanpuriya missions"]].map(([f, cap]) => <figure key={f}><img src={`/screenshots/${f}.jpg`} alt={cap} loading="lazy" /><figcaption>{cap}</figcaption></figure>)}
      </section>

      <section className="l-grid" id="how">
        <div className="l-card"><h3>असली कानपुर · Real Kanpur</h3><p>OpenStreetMap की असली सड़कें, रेलवे और 49 फाटक, कानपुर सेंट्रल, नाना राव पार्क, फूल बाग़ — {LANDMARKS.filter(l => l.kind !== "park").map(l => l.nameHi).slice(0, 5).join(", ")}। Streets © OpenStreetMap contributors.</p></div>
        <div className="l-card"><h3>कनपुरिया बोली · Kanpuriya first</h3><p>हर किरदार कनपुरिया हिंदी में बोलता है, सबटाइटल के साथ। अंग्रेज़ी सिर्फ़ एक विकल्प है, सेटिंग्स में।</p></div>
        <div className="l-card"><h3>18 तरह की गाड़ियाँ · Drive</h3><p>हैचबैक, SUV, बुलेट-स्टाइल बाइक, स्कूटर, ऑटो, ई-रिक्शा, साइकिल रिक्शा, स्कूल बस, छोटा हाथी और ट्रक — हर गाड़ी अलग चलती है।</p></div>
        <div className="l-card"><h3>8 अध्याय की कहानी · Story</h3><p>कनुप्रिया टॉमी, लालटेन सेठ और गंगा मेले की रात। साथ में {MISSIONS.length - 8} साइड मिशन और खुला शहर।</p></div>
        <div className="l-card"><h3>अकेले खेलो · Single-player</h3><p>सिर्फ़ एक खिलाड़ी का खेल। कोई लॉगिन, चैट या ऑनलाइन सर्वर नहीं; सेव इसी डिवाइस पर।</p></div>
        <div className="l-card"><h3>Safe by design</h3><p>साफ़ भाषा मोड, कोई असली पैसा नहीं, कोई ट्रैकिंग नहीं।</p></div>
      </section>

      <section className="l-note">
        <h2>About the map</h2>
        <p>Streets, railways, parks and building footprints come from OpenStreetMap (ODbL). Buildings without mapped footprints, facades, interiors and landmark styling are approximations — never claimed as exact replicas. The new sweet shop is fictional and does not represent or endorse a real business. Built by <strong>Velto Studios</strong>, Kanpur.</p>
        <p className="muted small">Status: public preview. Expect rough edges. Report issues from the in-game menu.</p>
      </section>
      <footer className="l-foot">© {new Date().getFullYear()} Velto Studios · <Link href="/play">Play</Link></footer>
    </main>
  );
}
