# Gameplay Design

## Core loop
Explore → talk to an NPC → accept a mission → complete checkpoints (walk/drive/photo/sit) → coins + XP → unlock looks at Naveen Market → explore with a friend for party bonuses.

## Player
- Speeds: walk 3.2 m/s, run 5.5, sprint 8.5 (server cap 9), jump 6.5 m/s, gravity −18.
- Camera: third-person orbit, 2.5–12 m zoom, pitch −0.6…1.1 rad, collision ray pulls in behind walls, follow-vehicle heading when driving (unless Reduce Motion).
- Emotes (1–6): wave, dance (unlockable), laugh, celebrate, high-five, sit.

## Vehicles
| Kind | Accel | Top speed | Turn | Seats | Where |
|---|---|---|---|---|---|
| Auto | 6 | 16 m/s | 2.4 | 2 | Cafe Chowk, Station |
| Hatchback | 9 | 24 | 1.9 | 2 | Mall Road, Canal Road |
| Sedan | 10 | 30 | 1.7 | 2 | Rawatpur Garage |
| SUV | 8.5 | 28 | 1.6 | 2 | Garage |
| Bike | 12 | 34 | 2.6 | 2 | Garage |
| Scooter | 7 | 18 | 2.8 | 2 | Mall Road |
Shared world objects; exclusive driver seat; passenger moves with the vehicle; exit places you beside the door. Server rejects impossible vehicle jumps (> 38 m/s).

## Missions
| id | Name | Type | Giver | Checkpoints | Limit | Reward | Co-op |
|---|---|---|---|---|---|---|---|
| tut_walk | Pehla Kadam | tutorial | Babloo | cafe → Phool Bagh → Sunset Point | — | 100 / 50 | — |
| jheel_walk | Moti Jheel Chalo | explore | Babloo | 4 around the lake | — | 250 / 120 | ✓ |
| delivery_sweets | Laddu Delivery | delivery | Gupta ji | market → V Square | 150 s | 400 / 200 | — (vehicle) |
| race_mall | Mall Road Dash | race | Raju | 5-point loop | 180 s | 600 / 300 | ✓ (vehicle) |
| photo_city | Shehar ki Tasveer | photo | Priya | temple, Central, ghat (press E) | — | 350 / 180 | ✓ |
| taxi_station | Station Drop | taxi | Raju | cafe → Central | 120 s | 300 / 150 | — (vehicle) |
| cafe_date | Chai pe Charcha | social | Munna | sit 60 s with another player within 4 m | — | 150 / 100 | ✓ |
Repeat completions pay 40%. Party members within 30 m of a co-op completion receive 50% bonus.

## Economy
Start 200 coins. XP → level: `200 + 150·level` per level. Shop: Kanpuriya Kurta 300, Cricket Jersey 450, Leather Jacket 900, Shades 200, Cap 150, Gamcha 120, Dance emote 500. No real-money path exists anywhere in the code.

## Social / couples
Proximity chat (120 m) + party chat; party invites (Tab or `/invite name`); friends list; cafe sit-together mission; lake walk and photo walk tuned for two; `any.social_1` NPC line reacts to pairs. Safety: mute, block (hides chat both ways), report (stores last 5 chat lines of the target for review).

## Day / night
20 real minutes per in-game day, server clock shared by the room; street lamps and stars switch at 05:17 / 18:43; dusk tint.

## Difficulty & onboarding
First 90 seconds: spawn at Cafe Chowk, Babloo (guide) 10 m away with a yellow diamond, tutorial line explains controls, first mission walks past the cafe and the park to the viewpoint. F1 shows controls; loading screen rotates tips.
