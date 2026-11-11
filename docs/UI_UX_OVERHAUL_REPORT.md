# UI/UX overhaul report

8 November 2026. **PARTIALLY IMPLEMENTED.**

Existing menus/HUD/creator retained while core safety changes are implemented. New exit failures must be actionable, transitioning occupants must not briefly regain an in-chassis collider, and mobile occupants must always have an exit control. Full visual redesign, garage ownership, key remapping/accessibility and onboarding control matrix have not been completed. Sources: Player.tsx, net/client.ts, HUD.tsx, Menu.tsx.

Status vocabulary: COMPLETED AND VERIFIED; IMPLEMENTED BUT NOT VERIFIED; PARTIALLY IMPLEMENTED; BLOCKED; NOT IMPLEMENTED.

## Safety interaction update

COMPLETED AND VERIFIED by source/unit tests and scoped fixture: actionable blocked/moving-exit messages; occupancy held until authoritative exit correction; stable touch-button component identity; an exit button remains visible whenever occupied, independent of nearby prompts. First-person camera is seat local. No comprehensive premium UI redesign or physical phone certification is claimed. Compatibility messaging prevents vehicle use against an outdated backend; matched preview configuration is still required.
