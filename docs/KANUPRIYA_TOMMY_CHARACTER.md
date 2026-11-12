# Kanupriya Tommy: protagonist

- **Name:** Kanupriya Tommy (कनुप्रिया टॉमी). Save handle by default: `Kanupriya`.
- **Age:** 24.
- **Background:** grew up near Parmat Ghat. Her nani sold diyas on the ghat. She left for Delhi to work as a video journalist and courier rider, and comes back after four years when Babloo writes that the Ganga Mela is under threat.
- **Why "Tommy":** she followed her cousin Babloo everywhere as a child and never lets go of a story.
- **Personality:** quick, dry humour, stubborn and fair. She keeps to the law (the railway chapter makes a point of respecting the crossing) and solves problems by exposing the truth, not with violence.
- **Motivation:** save the mela and the ghat stalls her family's memories are tied to, and work out whether she belongs in Kanpur or Delhi.
- **Arc:** she arrives as a visitor and says the last line as a resident: "दिल्ली? अरे भइया, कानपुर की कहानी अभी बाकी है!"
- **Relationships:** Babloo Bhaiya (cousin, guide), Munna Chaiwala (family friend), Raju Auto (ally), Gupta ji (witness), Singh Saheb (honest police officer), Lalten Seth (fictional con man, the antagonist).

## In-game implementation (verified by code and tests, not yet by eye)

- Signature look `PROTAGONIST_LOOK` (`apps/web/src/state/store.ts`): body B, warm skin tone, long hair, dark top, jeans, shades. New players start with it, and the character studio has a "Signature look" button to restore it.
- Her bio is shown in the character studio. She speaks in every chapter cutscene, in Hindi with English subtitles (`packages/shared/src/story.ts`).

## Honest limits

- She uses the existing procedural `Avatar` rig. There is **no** new hand-built, high-detail 3D model, no facial animation and no voice recording for her yet. Cutscene lines are subtitles only.
