"use client";
/** KanpurVerse logo (inline SVG) and the animated Kanpur skyline backdrop used on menu/loading screens. */
export function Logo({ size = 48 }: { size?: number }) {
  return <div className="kv-logo" style={{ fontSize: size }}>
    <svg width={size * 1.15} height={size * 1.15} viewBox="0 0 64 64" aria-hidden><defs><linearGradient id="kvg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff5a3c" /><stop offset="1" stopColor="#c8102e" /></linearGradient></defs>
      <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#kvg)" /><path d="M18 46V18h7v11l10-11h9L31 32l14 14h-9L25 34v12z" fill="#fff" /><circle cx="48" cy="17" r="4" fill="#ffd23f" /></svg>
    <span className="kv-word">KANPUR<b>VERSE</b></span>
  </div>;
}
export function Skyline() {
  return <div className="skyline" aria-hidden>
    <div className="sky-glow" /><div className="sun" />
    <svg className="sky-svg" viewBox="0 0 1600 400" preserveAspectRatio="xMidYMax slice">
      <g className="layer far" fill="#2a1a24">
        <rect x="0" y="300" width="1600" height="100" /><rect x="60" y="230" width="60" height="80" /><rect x="140" y="250" width="90" height="60" /><rect x="260" y="200" width="40" height="110" /><rect x="330" y="240" width="120" height="70" />
        <path d="M520 310V250l25-30 25 30v60z" /><rect x="600" y="220" width="70" height="90" /><rect x="700" y="260" width="140" height="50" /><rect x="880" y="190" width="50" height="120" /><rect x="960" y="240" width="100" height="70" />
        <path d="M1100 310v-70l30-40 30 40v70z" /><path d="M1160 240l-5 -25 5 -10 5 10z" /><rect x="1200" y="230" width="80" height="80" /><rect x="1320" y="250" width="120" height="60" /><rect x="1480" y="210" width="60" height="100" />
      </g>
      <g className="layer near" fill="#120b10">
        <rect x="0" y="340" width="1600" height="60" /><rect x="20" y="290" width="90" height="60" /><rect x="150" y="270" width="60" height="80" /><rect x="240" y="300" width="130" height="50" /><rect x="420" y="260" width="40" height="90" />
        <path d="M480 350v-50l40-30 40 30v50z" /><rect x="600" y="280" width="110" height="70" /><rect x="760" y="300" width="80" height="50" /><rect x="880" y="250" width="30" height="100" /><rect x="930" y="290" width="150" height="60" />
        <path d="M1120 350v-60l35-45 35 45v60z" /><rect x="1230" y="280" width="70" height="70" /><rect x="1340" y="300" width="140" height="50" /><rect x="1520" y="270" width="60" height="80" />
        <g fill="#ffd27a" opacity="0.8"><rect x="35" y="300" width="4" height="5" /><rect x="60" y="310" width="4" height="5" /><rect x="170" y="285" width="4" height="5" /><rect x="640" y="295" width="4" height="5" /><rect x="665" y="310" width="4" height="5" /><rect x="960" y="305" width="4" height="5" /><rect x="1250" y="300" width="4" height="5" /><rect x="1380" y="312" width="4" height="5" /></g>
      </g>
    </svg>
    <div className="birds"><span /><span /><span /></div>
  </div>;
}
