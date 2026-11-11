# KanpurVerse — Part 2 production report
Date: 11 November 2026, Asia/Kolkata. Studio: Velto Studios.

## Deliverables
- Final video: `EXPORTS/KanpurVerse_Part2_Instagram.mp4` — target 51.000 seconds; H.264, 1080×1920, 9:16, 30 FPS; AAC audio, 48 kHz stereo at 128 kbps. See `media-validation.json` for measured final values.
- Cover: `COVER/KanpurVerse_Part2_Cover.jpg`, 1080×1920.
- Narration: `VOICEOVER/KanpurVerse_Part2_Hindi_Aligned.mp3`, Hindi male hm_omega, generated offline with the existing Kokoro assets. Same voice identity as the previous reel.
- Hindi captions: `SUBTITLES/KanpurVerse_Part2_hi.srt` plus JSON; burned into MP4. Cues follow measured individually generated spoken phrases rather than evenly estimated scene timing. No independent human phonetic listening review is claimed.
- Caption and hashtags: `CAPTION/instagram_caption.txt`, `CAPTION/hashtags.txt`.
- Feature screenshots: selected actual recorded frames in `REPORTS/verified_frame_*.jpg`.
- Source/edit decisions: `PROJECT_FILES/build_reel.py`, `edit_decisions.json`, narration scripts, shaping helper and original audio generators. Intermediate renders retained under `PROJECT_FILES/render`.

## Continuity and evidence
Previous package: `VeltoStudios/Third_Instagram_Reel_KanpurVerse`, read-only. Its production script, cover, fonts, voice timing, published caption and raw gameplay were inspected. Part 2 retains charcoal #0b0b0d, red #e8273b, gold #ffd23f and Mukta typography. Original Velto horizontal white logo is used on the cover. Font OFL is included.

New feature footage is from the actual modified browser game recorded on 11 November. Takes show real packet purchasing, the procedural consumption sequence, civic-score changes, NPC reactions and Hindi conversations. Recorder overlays copy the current inventory and dialogue; they are not pixel-identical HTML screen recordings. No AI-generated city or fake feature scene appears.

City/rail/driving montage shots also reuse real gameplay recorded for the previous package. Copies are retained under RAW_FOOTAGE/previous; originals were not overwritten. `edit_decisions.json` names source files, in points and durations. No real community comments are fabricated. Narration says “हमारे नए आइडियाज़”; the caption explicitly labels this as a development preview, not a public release.

## Audio and typography
Madhur Hindi neural audition succeeded; Swara audition hit a service rate limit. The existing offline hm_omega voice was selected for brand continuity and reproducibility. Original synthesized instrumental bed and understated UI/packet/spit sounds were created for this edit. Narration is foregrounded; final loudness/peak measurement is saved with media validation.

The first text renderer lacked RAQM and a native FreeType glyph route crashed. Those intermediate outputs were rejected and retained, not published. The final renderer uses HarfBuzz shaping with fontTools outlines and aggdraw, with visual QA of Devanagari and mixed Latin runs. Captions, title and CTA remain inside portrait safe areas. The contact sheet is `final_contact.jpg`.

## Publishing
Official profile verified in Chrome: https://www.instagram.com/velto_studios/ (Velto Studios | Digital Products), logged-in Edit profile and creation controls present. Previous KanpurVerse reel verified: https://www.instagram.com/velto_studios/reel/Dfhogr1Pp5W/.
Final publishing outcome is recorded separately in `PUBLISHING_STATUS.md`; an opened composer or successful upload alone is not treated as publication.

## Limits
Gameplay is a playable development branch, not a verified public-server deployment. Personal inventory/civic score is server-owned; NPC moods, cleanliness and stains are client-local. No municipal-worker role, physical controller support, recorded voices for all new NPC lines, or full all-mission/device regression run was added or claimed. See FEATURES/Testing_Reports/PLAYTEST.md for complete validation boundaries.

Final upload uses the corrected 48 kHz stereo AAC export. The earlier 96 kHz master stalled in Instagram processing and is retained only as an intermediate. AI narration is disclosed in the caption and the Instagram AI label is enabled; footage is actual gameplay.

## Verified result
Published: https://www.instagram.com/velto_studios/reel/DfmRWX2PaXq/. Live owner/caption and profile entry verified; publishing-proof.jpg saved. World/map data attribution: © OpenStreetMap contributors (ODbL), as used by the existing KanpurVerse game.
