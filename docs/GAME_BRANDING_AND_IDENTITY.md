# Game branding and identity

**Final title: Kanpur Chronicles** (कानपुर क्रॉनिकल्स), subtitle *City of Stories* (कहानियों का शहर). A Velto Studios game. "KanpurVerse" stays as the repository and code name.

## Title evaluation (1 = weak, 5 = strong)

| Title | Branding | Say it aloud | Memorable | Visual identity | Room for sequels | Total |
|---|---|---|---|---|---|---|
| **Kanpur Chronicles** | 5 | 5 | 5 | 4 | 5 | **24** |
| Kanpur: City of Stories | 4 | 4 | 3 | 4 | 4 | 19 |
| Kanpur: The Legacy | 3 | 5 | 3 | 3 | 3 | 17 |
| Kanpur: Streets of the Ganga | 4 | 3 | 3 | 5 | 3 | 18 |
| The Ganga Chronicles | 4 | 5 | 4 | 4 | 4 | 21, but it isn't about Kanpur |

Why Kanpur Chronicles won: it puts the city first, sounds the same in Hindi and English, and "chronicles" fits a chaptered story with later volumes. "City of Stories" is kept as the subtitle, and it echoes the closing line: "कानपुर की कहानी अभी बाकी है!"

## Where the identity is implemented (commit 18465b7)

- Logo (`apps/web/src/ui/Brand.tsx`): an original SVG K monogram with a rising sun and a Ganga wave line, and the wordmark KANPUR CHRONICLES.
- Studio mark "VELTO STUDIOS presents" on the main menu and loading screen. The studio name also closes the credits.
- Page metadata (`app/layout.tsx`, `app/play/page.tsx`), main-menu tagline, About text, mission-result banner and credits.
- Nothing comes from GTA: no logos, fonts, characters, artwork or audio.

Not done yet: raster logo exports (PNG/SVG files for social media and the Drive brand folder) and a separately designed loading-screen illustration.
