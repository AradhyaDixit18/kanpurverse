# Street-life update

Run the existing game normally (`npm install` only if dependencies are missing, then `npm run dev`). Open http://localhost:3000/play with the server on 8787.

- The fictional Nukkad Paan kiosk stands beside Mall Road spawn. Walk to Paan Chacha and press **E**. A packet costs **5 coins**; maximum **30**. Existing mission earnings fund purchases. The original wardrobe shop is unchanged.
- Close dialogue and press **G** to consume. The 2.4-second sequence draws, opens and consumes the generic packet. Movement, jumping, vehicle entry and emotes are blocked during it.
- Press **V** afterward for one spit charge. Facing follows the character, independent of camera orbit. A swept ray catches world geometry; stains align to surface normals and expire after 18 seconds. At most 24 are retained.
- Each accepted spit subtracts 1 personal civic point on the server. Nearby impacts reduce a local 40m-cell cleanliness score by 2; repeated dirtying gives a warning. Only one nearest named NPC reacts per event, subject to a 4-second reaction cooldown.
- Press **E** beside any named NPC for normal, funny, frustrated, mild insult, comeback or apology choices. Per-NPC responses have a 2.2-second cooldown, variations, anger and de-escalation. Repeated insults make the NPC walk away briefly.
- **Esc → Settings → Clean Language Mode** defaults ON and persists locally. OFF exposes the configured stronger, non-identity-targeted fictional slang. Free-form multiplayer chat moderation is unchanged.
- Keyboard and existing touch input helpers share the new actions; visible G/V buttons work with pointer/touch. No gamepad architecture existed, so none is claimed.

## Configuration and ownership
`packages/shared/src/streetLife.ts` contains prices, caps, durations, dialogue categories and line pools. `Room` owns currency, packet counts and civic score and persists those fields through existing file/Mongo storage. Optional fields migrate old saves. NPC moods, area cleanliness and stains are local visual simulation; they reset on reload and do not replicate between players. A consumed but unspent spit charge resets when the server session ends. No real tobacco brands or licensed animation assets were added; the kiosk, packet, poses and sounds are original procedural work.

## Developer recording
Development-only controls record the real WebGL canvas into a portrait composite, with inventory and dialogue text copied from live game state. These are readable recording overlays rather than pixel-for-pixel captures of the HTML panel. They do not invent purchases or dialogue outcomes. Capture files are posted only to the localhost development endpoint and remain under THIRD_INSTAGRAM_REEL/RAW_FOOTAGE. The endpoint refuses production writes.
