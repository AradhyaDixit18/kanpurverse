# Kanpuriya Dialogue Guide

## What makes it Kanpuriya
Kanpuriya Hindi is Kanpur's street register: warm, cheeky, direct, Awadhi-tinged. Markers used in the library:
- **Address:** *bhaiya*, *guru*, *beta*, *saheb*; *hum* for "I" (plural-self), *tum* over *aap* among peers.
- **Openers:** *Ka ho?* ("what's up"), *Arre*, *Ae*, *Aao aao*, *Ram Ram bhaiya*.
- **Verbs/idiom:** *ghumaate hain*, *thokna mat* (don't crash), *jhakaas*, *tagde ho*, *bachke*, *molbhaav*, *mast*, *scene*.
- **Sarcasm as affection:** "*Aankh ghar pe chhod aaye?*", "*Horn kyon baja rahe ho, ud ke chale jaayen kya?*", "*meter se nahi, dil se chalenge*".
- **City references:** Mall Road, jheel, Central, Green Park match, Thaggu ke Laddu, train late hai.

## Three tracks, one id
Every line id (e.g. `auto_raju.offer_1`) exists in `assets/dialogues/kanpuriya.json`, `hindi.json` and `english.json`. Switching language never changes *what* an NPC says, only *how*. Tests enforce id parity.
- **Kanpuriya:** Devanagari text + `roman` (Hinglish) shown under the subtitle. Default track.
- **Hindi:** polite standard register (*aap*, *kijiye*), same jokes softened.
- **English:** natural Indian English, keeps *bhaiya*, *chai*, *laddu*, *gamcha* untranslated.

## Characters and voice profiles
| NPC | Role | Profile | Character note |
|---|---|---|---|
| Babloo Bhaiya | guide | male_local (Madhur, −4 Hz) | Older brother energy; explains, encourages |
| Munna Chaiwala | cafe | shopkeeper (Madhur, slow, −6 Hz) | Everyone's host; "chai hamari taraf se" |
| Raju Auto | auto/race | auto_driver (Madhur, +6%) | Fast-talking, dares you |
| Gupta ji | shop | shopkeeper | Bargains with a smile; sweets delivery |
| Singh Saheb | police | police (Madhur, −8 Hz, slow) | Gruff but kind; helmet nag |
| Priya | pedestrian | female_young (Swara, +6%) | Photo project; lake at sunset |
| Aman, Vikas | pedestrians | male_young (Madhur, +8%, +3 Hz) | College slang |
| Sunita ji | pedestrian | female_local (Swara, −3 Hz) | Auntie warning about autos |
| Rekha | pedestrian | female_young | Station commuter |
Emotion field (`neutral/happy/annoyed/excited/sly/warm`) nudges rate ±6% and pitch ±2 Hz in `generate_voices.py`.

## Categories
greeting · tutorial · direction · mission_offer (carries `mission`) · mission_done · shop · auto · cafe · police · idle (barks when a player is within 14 m, every 20–45 s) · reaction (bump within 0.9 m) · social (pairs) · farewell. `next` chains lines (greeting → tutorial → offer).

## Writing rules
1. One thought per line, ≤ 110 characters Devanagari; TTS pauses on *।* and commas.
2. No abuse, no caste/religion/political jabs, no real person names, no alcohol/tobacco.
3. Keep brand-free: "V Square", "Chai Adda"; Thaggu ke Laddu appears only as a sign tribute.
4. Romanisation follows how Kanpur youth type: *kya → ka* only in Kanpuriya; *ph* not *f* for फ; *chh* for छ.
5. Add a line → three files, same id → `npm test` → `npm run voices` on the Mac.

## Current count
44 ids × 3 languages = 132 lines; 10 NPC-specific sets + 9 shared `any` lines. Target for v1.1: 120 ids (more idle barks per NPC, weather/time-of-day variants, mission mid-progress nags).
