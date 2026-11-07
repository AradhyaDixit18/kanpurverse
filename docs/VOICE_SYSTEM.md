# Voice System

## Design
Two layers, subtitles always on top:
1. **Pre-generated neural voice (preferred).** `scripts/generate_voices.py` renders every dialogue line with Microsoft Edge neural TTS (`edge-tts`, free, no key) into `apps/web/public/audio/dialogues/<lang>/<id>.mp3` plus a `manifest.json`. The client fetches the manifest once per language and plays the mp3 (`HTMLAudioElement`, volume = SFX slider).
2. **Browser fallback.** If a manifest or file is missing, or audio fails to play, `speechSynthesis` speaks the line with the best `hi-IN`/`en-IN` voice available on the device (gender-matched by name heuristics), rate/pitch derived from the same profile. On macOS/iOS Safari and Chrome this yields Lekha/Google हिन्दी; quality is lower than Edge voices but always available offline.

Both paths are gated by Settings → NPC voice; subtitles are independent (Settings → Subtitles) and default on.

## Voice profiles (`VOICE_PROFILES`, mirrored in the Python script; a test checks the mirror)
| Profile | Edge voice | Rate | Pitch |
|---|---|---|---|
| male_local | hi-IN-MadhurNeural | +2% | −4 Hz |
| male_young | hi-IN-MadhurNeural | +8% | +3 Hz |
| shopkeeper | hi-IN-MadhurNeural | −2% | −6 Hz |
| auto_driver | hi-IN-MadhurNeural | +6% | −2 Hz |
| police | hi-IN-MadhurNeural | −4% | −8 Hz |
| female_young | hi-IN-SwaraNeural | +6% | +2 Hz |
| female_local | hi-IN-SwaraNeural | +0% | −3 Hz |
| english_male | en-IN-PrabhatNeural | +2% | 0 |
| english_female | en-IN-NeerjaExpressiveNeural (the voice approved for the Velto reel) | +4% | 0 |
Edge offers only two Hindi neural voices; variety comes from rate/pitch and the emotion nudge. If Azure's free tier (5 M chars/month) is approved later, `hi-IN-AaravNeural`, `AnanyaNeural`, `KavyaNeural`, `KunalNeural`, `RehaanNeural` add real distinct voices with the same script.

## Generating (Mac, needs internet)
```bash
cd ~/Desktop/VeltoStudios/KanpurVerse
python3 -m pip install edge-tts
npm run voices            # all three languages; skips existing files; exits 1 if any line failed
python3 scripts/generate_voices.py kanpuriya   # one language
```
Output ≈ 132 files, ~25–40 KB each (~4 MB), committed? **No** — `.gitignore` excludes `assets/audio/dialogues/*.mp3`; the Vercel build step should run the script (needs Python + network on the build machine) or the files should be uploaded once to `apps/web/public/audio` and committed (recommended for a 4 MB set: remove the ignore line).

## Status
- Script: written, dry-run logic verified (manifest/hash/skip paths); **not executed** here because the build environment cannot reach Edge TTS endpoints → no mp3 exists yet → the game currently uses the speechSynthesis fallback.
- Fallback: implemented; exercised only by code review (no browser in this session).

## Lip-sync / timing
No lip-sync; the Avatar "talk" animation runs while a dialogue is open. Subtitle duration = 1.2 s + 65 ms per character (2.5–9 s), clipped to actual audio end when mp3 is used.
