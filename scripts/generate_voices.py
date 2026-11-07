#!/usr/bin/env python3
"""Pre-generate NPC voice lines with Microsoft Edge neural TTS (free, no API key).

Run on the Mac (needs internet):
    cd ~/Desktop/VeltoStudios/KanpurVerse && python3 -m pip install edge-tts && npm run voices

Output: apps/web/public/audio/dialogues/<lang>/<line_id>.mp3 and a manifest.json per language.
Lines that already have an mp3 are skipped (delete the file to regenerate). Nothing is overwritten silently.
The game falls back to the browser's speechSynthesis (hi-IN / en-IN voices) when an mp3 is missing.
"""
import asyncio, json, sys, hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIALOGUES = ROOT / "assets" / "dialogues"
OUT = ROOT / "apps" / "web" / "public" / "audio" / "dialogues"

# Mirrors VOICE_PROFILES in packages/shared/src/dialogue.ts (kept in sync by tests/voice_profiles.test.ts)
PROFILES = {
    "male_local":     ("hi-IN-MadhurNeural", "+2%",  "-4Hz"),
    "male_young":     ("hi-IN-MadhurNeural", "+8%",  "+3Hz"),
    "shopkeeper":     ("hi-IN-MadhurNeural", "-2%",  "-6Hz"),
    "auto_driver":    ("hi-IN-MadhurNeural", "+6%",  "-2Hz"),
    "police":         ("hi-IN-MadhurNeural", "-4%",  "-8Hz"),
    "female_young":   ("hi-IN-SwaraNeural",  "+6%",  "+2Hz"),
    "female_local":   ("hi-IN-SwaraNeural",  "+0%",  "-3Hz"),
    "english_male":   ("en-IN-PrabhatNeural", "+2%", "+0Hz"),
    "english_female": ("en-IN-NeerjaExpressiveNeural", "+4%", "+0Hz"),
}
NPC_VOICE = {"guide_babloo": "male_local", "chai_munna": "shopkeeper", "auto_raju": "auto_driver", "shop_gupta": "shopkeeper",
             "police_singh": "police", "ped_priya": "female_young", "ped_aman": "male_young", "ped_sunita": "female_local",
             "ped_vikas": "male_young", "ped_rekha": "female_young", "any": "male_young"}
EMOTION_TWEAK = {"excited": (6, 2), "happy": (3, 1), "annoyed": (2, -2), "sly": (-2, -1), "warm": (-2, 0), "neutral": (0, 0)}

def adj(v: str, d: int, unit: str) -> str:
    n = int(v.replace(unit, "").replace("+", "")) + d
    return f"{'+' if n >= 0 else ''}{n}{unit}"

async def synth(text: str, voice: str, rate: str, pitch: str, dest: Path):
    import edge_tts
    tmp = dest.with_suffix(".part")
    await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(str(tmp))
    if tmp.stat().st_size < 1000:
        tmp.unlink(); raise RuntimeError("empty audio")
    tmp.replace(dest)

async def main(langs):
    try:
        import edge_tts  # noqa
    except ImportError:
        print("edge-tts missing: python3 -m pip install edge-tts"); sys.exit(2)
    total = done = skipped = failed = 0
    for lang in langs:
        data = json.loads((DIALOGUES / f"{lang}.json").read_text(encoding="utf-8"))
        out = OUT / lang; out.mkdir(parents=True, exist_ok=True)
        manifest = {}
        for line in data["lines"]:
            total += 1
            prof = line.get("voice") or NPC_VOICE.get(line["npc"], "male_young")
            voice, rate, pitch = PROFILES[prof]
            dr, dp = EMOTION_TWEAK.get(line.get("emotion", "neutral"), (0, 0))
            rate, pitch = line.get("rate", adj(rate, dr, "%")), line.get("pitch", adj(pitch, dp, "Hz"))
            dest = out / f"{line['id']}.mp3"
            h = hashlib.sha1(f"{line['text']}|{voice}|{rate}|{pitch}".encode()).hexdigest()[:10]
            manifest[line["id"]] = {"file": f"/audio/dialogues/{lang}/{line['id']}.mp3", "hash": h, "voice": voice}
            if dest.exists():
                skipped += 1; continue
            try:
                await synth(line["text"], voice, rate, pitch, dest); done += 1
                print(f"  ok  {lang}/{line['id']}  ({voice} {rate} {pitch})")
            except Exception as e:  # noqa
                failed += 1; print(f"  FAIL {lang}/{line['id']}: {e}")
        (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nlines={total} generated={done} skipped(existing)={skipped} failed={failed}")
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    asyncio.run(main(sys.argv[1:] or ["kanpuriya", "hindi", "english"]))
