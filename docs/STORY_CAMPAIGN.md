# Story campaign: Kanpur Chronicles

**Premise:** Kanupriya "Tommy" comes home to find a con man, Lalten Seth, selling forged Ganga Mela passes and a fake "Golden Laddoo Lottery". He spreads a rumour that the mela is cancelled so he can take the money and buy up the ghat stalls. Every person, shop and event in the story is fictional. Sunehri Mithai is an invented shop. No real sweet shop, trader, official or family is shown or implied to be involved in wrongdoing.

| # | Chapter | Giver | Locations | Type |
|---|---|---|---|---|
| 1 | The Return to Kanpur / कानपुर वापसी | Babloo | Chai stall → Bada Chauraha → Z Square | Walk, tutorial |
| 2 | Laddoo Ka Chakkar / लड्डू का चक्कर | Babloo | Sunehri Mithai interior → fair chase → Raju's stand | Staged caper with a marshal chase, 4 min |
| 3 | Mall Road Trouble / मॉल रोड पे बवाल | Raju Auto | Christ Church → Nana Rao Park → Bada Chauraha | Timed route, 5 min |
| 4 | Railway Run / रेलवे रन | Singh Saheb | Nayaganj → railway crossing → Kanpur Central | Timed drive, 7 min |
| 5 | Naveen Market Mystery / नवीन मार्केट का राज़ | Gupta ji | Naveen Market → lane → Lal Imli mills → Chunniganj | Investigation |
| 6 | Ganga Ghat / गंगा घाट | Munna | Moti Jheel → Parmat Ghat | Scouting |
| 7 | The City in Danger / शहर ख़तरे में | Singh Saheb | Naveen Market → Green Park → Phool Bagh | Timed evidence run, 6 min |
| 8 | The Final Chapter / आख़िरी अध्याय | Babloo | Sunehri Mithai → Kanpur Central → Naveen Market → Parmat Ghat | Climax, 15 min |

**Climax:** on mela night, Tommy collects the sealed laddoo, gets ahead of the Seth's courier at Kanpur Central, brings Gupta ji as a witness and plays the evidence on the mela screen at Parmat Ghat. Singh Saheb arrests the Seth and the mela goes ahead. Every finale stop is a place visited in an earlier chapter (enforced by a test). The credits roll after the closing cutscene, then free roam continues.

**Systems:** each chapter is a normal `MissionDef`, so checkpoints, timers, failure, rewards, autosave and Continue all work the same way. Chapters unlock in order (`storyUnlocked`). The 13 side missions open after Chapter 2. Intro and outro cutscenes are letterboxed: E or Space advances, Esc skips. Mission timers and controls pause during cutscenes. Replaying a chapter pays 25% and skips the outro.

**Verified:** `tests/story.test.ts` plays all eight chapters end to end in the runtime, including cutscenes, timer pause, save and reload, and the credits trigger. That is an automated test. A full manual browser playthrough on the deployed build is **not done yet**.
