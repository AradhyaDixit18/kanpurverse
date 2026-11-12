# Mission design

- Main story: 8 chapters. See STORY_CAMPAIGN.md; data lives in `packages/shared/src/story.ts` and `world.ts`.
- Side missions: 13 existing city missions (tutorial walk, delivery, races, photo, taxi, social), opened after Chapter 2.
- Checkpoints: position-based, ordered, 0.9 s debounce. Chapter 2 objectives need E presses (photo kind).
- Failure: timed chapters fail when the clock runs out. The failure banner says to retry from the giver. Chapter 2 also fails a checkpoint when the marshal catches you (−10 health, back to the shop checkpoint).
- Rewards: first clear pays in full, replays pay 25%. Chapter 2 also gives the hatchback. The story total is 6,050 coins and 3,050 XP.
- Saving: the active mission index and remaining time are saved every 5 s, on page hide, on manual save and at each checkpoint.
- Not implemented: a wanted/police system, mission-specific traffic events, a real pursuing courier AI in Chapter 8 (the timer stands in for it), mission voice-over.
