# Vehicle System — v0.5

## Catalogue (all procedural, original, no third‑party models)
| Kind | Accel m/s² | Top speed | Turn rate | Body (w×h×l m) | Seats | Where it spawns | Status |
|---|---|---|---|---|---|---|---|
| Auto‑rickshaw | 7 | 17 m/s (61 km/h) | 2.5 | 1.45×1.75×2.8 | 2 | Mall Road auto stand, Kanpur Central | COMPLETED AND VERIFIED (driven in Brave) |
| Hatchback | 10 | 26 | 2.0 | 1.75×1.45×3.8 | 2 | Mall Road, Naveen Market | COMPLETED AND VERIFIED (driven in Brave) |
| Sedan | 11 | 32 | 1.8 | 1.85×1.4×4.6 | 2 | Chauraha Garage | IMPLEMENTED BUT NOT VERIFIED |
| SUV | 9.5 | 30 | 1.7 | 2.05×1.85×4.8 | 2 | Chauraha Garage | IMPLEMENTED BUT NOT VERIFIED |
| Bike | 13 | 36 | 2.7 | 0.7×1.1×2.1 | 2 | Chauraha Garage | IMPLEMENTED BUT NOT VERIFIED |
| Scooter | 8 | 20 | 2.9 | 0.7×1.1×1.8 | 2 | Mall Road | COMPLETED AND VERIFIED (entered in Brave) |
| E‑rickshaw | 5 | 11 | 2.6 | 1.3×1.8×2.9 | 2 | Mall Road | IMPLEMENTED BUT NOT VERIFIED |
| City bus | 5 | 22 | 1.2 | 2.5×3.1×10.5 | 2 | Bada Chauraha | IMPLEMENTED BUT NOT VERIFIED |
| Truck | 6 | 24 | 1.3 | 2.4×2.8×7.5 | 2 | Lal Imli | IMPLEMENTED BUT NOT VERIFIED |
| Taxi | 10 | 26 | 2.0 | 1.75×1.45×3.9 | 2 | Kanpur Central | IMPLEMENTED BUT NOT VERIFIED |
Ambient traffic uses all ten kinds (visual only, deterministic on the shared clock, yields to players). Trains are a separate system (`RailwayOsm.tsx`).

## Driving model (`apps/web/src/game/Vehicles.tsx`)
- Driver = Rapier **dynamic** body (mass 900, rotations locked except yaw, CCD on); everyone else sees a kinematic body interpolated from 20 Hz snapshots.
- Throttle: accelerates toward ±top speed with natural drag; Space = handbrake (22 m/s²); steering is damped (10 Hz) and scaled by grip (low speed → no turn) and by speed (less lock at top speed).
- **Real‑velocity feedback**: every frame the commanded speed is reconciled with the body's actual forward velocity, so hitting a wall drops the speed (and the speedometer) instead of pretending.
- **Spawn height** per kind (`VEHICLE_HEIGHT` in shared): the body centre sits at h/2 + 5 cm. This was the "car launched into the sky" bug: bodies spawned 12 cm inside the ground and the solver fired them upward. Vertical velocity is also clamped (≤ 1.5 m/s up).
- Wheels rotate with speed; front wheels steer; brake lights on braking/night; headlights at night; tyre dust on hard braking/turns.
- Camera follows the heading (unless Reduce Motion); `C` cycles normal/close/far/first‑person; `Q` looks back; `R` resets a stuck vehicle (lifts 60 cm, zeroes velocity).
- Entry/exit: `E` within 6 m (server‑checked); `F` exits beside the door; passengers ride along and are positioned by the server from the driver's stream.

## Server validation (`apps/server/src/room.ts`)
Exclusive driver seat; passenger seat; distance check on entry; only the registered driver's `vehicle.state` is accepted; ≤ 38 m/s · Δt + 2.5 m per update else the server echoes its own state; vehicles persist position per room.

## Known gaps / next
No suspension model (flat city, so acceptable); no damage; no vehicle ownership/customisation yet (garage panel is informational); bus/truck collision boxes are single cuboids; no AI traffic collisions with players (traffic stops instead).
