# Game design — the playable contract

## Fantasy and core loop

You are a playful world explorer gathering fictional replicas for a traveling collection. Famous silhouettes provide context; we do not remove an actual monument or teach invented artifact history as fact. The golden pyramidion is an imagined collectible at ground level, not a claim that a gold cap currently sits atop a Giza pyramid.

**Read → infer → choose city → travel → explore → collect → repeat → compare time → retry.** The player controls where to go. The game gives enough environmental information to make finding the object feel earned, without requiring obscure historical knowledge.

The game is grounded 3D with an elevated following camera, generous collision, and auto-collection. The immediate skill is noticing and routing, not mastering a complex movement system. Do not add combat, climbing, jumping, inventory management, or fetch-dialogue interactions.

## First 90 seconds

| Moment | Player sees / does | Implementation requirement |
|---|---|---|
| Menu | Attractive toy globe, GLINT title, one prominent Play button | No paragraphs of onboarding; sound starts only after interaction |
| Briefing | Two illustrated clue cards and “Find both treasures. Fastest adjusted time wins.” | Optional 3-line controls overlay; time has not started |
| Go | Globe with named Paris and Giza pins | Run clock begins now; clue thinking and city selection count |
| Choose | Click a pin or matching accessible city button | Clear selected state; travel cannot be double-triggered |
| Dive | Camera approaches the city, clouds fill the view, city appears beneath | Same palette, light and motion direction; input temporarily locked |
| Explore | Explorer on a plaza; big landmark visible; one compact clue card active | Motion starts immediately; other clue remains accessible |
| Map / hint | Broad search zones; explicit button such as “Reveal city · +10s” | Map and hint reading do not stop the scored clock |
| Discover | Small collectible glints within sight; approach auto-collects | Pop, chime, card stamp, progress; no extra button |
| Travel again | “Globe” button returns to world view | Collected items and purchased hints remain unchanged |
| Finish | Adjusted time, raw time, penalties, points, medal, device best | Timer stops on last pickup, before celebration; retry is prominent |

The first-time tutorial is a nonblocking overlay before Go and contextual labels after arrival. No modal tutorial stops a scored run. Offer a separate practice entry if needed; practice does not overwrite competitive local bests.

## World and progression

P0 has three freely selectable trials. Each contains two different objects, one per city. Across those trials the six objects do not repeat. All trials are available from the start for juries; completing one highlights the next but never locks the rest.

All objectives in a trial are active at once and may be collected in either city order. An active card controls which clue/hint is displayed, not which object can be collected. On a retry, the exact same level version, seed, socket choices and clue wording are used. “Next trial” deliberately changes the items.

P1 may add a three-target seeded tour drawn from the same six-item bank with both cities represented. This adds route grouping: finish both objects in one city before buying another flight. It is optional because the core trials already support mastery.

The player remains the same person while traveling. Three optional outfit palettes are cosmetic, not different stats. Local color can come from a backpack badge or accessory; do not infer a player's ethnicity or swap their identity when entering a city. Do not caricature nationalities.

## Controls and feedback

- Desktop: physical WASD keys (label WASD / ZQSD where appropriate) or arrow keys; `M` toggles map; Escape pauses; buttons provide equivalent actions.
- Use `event.code` for physical movement keys. Ignore movement while focus is in a text input or modal; prevent page scrolling only for active game controls.
- Landscape touch: one thumbstick in the lower left and buttons for map, hint and globe on the right. Thumbstick output is a normalized 2D vector. `pointercancel`, focus loss and release clear it.
- No pointer lock or mouse-look requirement. Camera orientation stays fixed, north roughly up-screen.
- Auto-collect within the validated pickup radius. Only spawned objectives can trigger collection. Other decorative props never masquerade as pickups.
- Distinctive gold/teal pickup material, 0.2–0.3 s scale pulse, modest particles, brief audio. Do not cover the next clue with a celebration panel.
- Sound and reduced-motion toggles persist when storage is available. Reduced motion uses a short fade instead of zoom/spin and suppresses camera shake.

## The map and the hint economy

Resolve the apparent conflict between “highlight items” and “do not give away where they are” with **area-level uncertainty**.

| Information | Cost | Behavior |
|---|---:|---|
| Globe | Free | City names and pins; no objective badges showing which city holds a clue |
| Local map | Free | Player position, walkable streets, recognizable silhouettes, broad amber district search regions for uncollected objectives in this city |
| Hint 1 | +10 seconds | Reveal the selected objective's city |
| Hint 2 | +20 additional seconds | Reveal the landmark/district name and a tighter district search region |
| Hint 3 | +35 additional seconds | Show a small search patch around the relevant area and an occasional nearby glint, without an exact target dot or route |

Every hint is per objective and sequential. Buying all three costs **65 seconds**, not 35. UI previews the next incremental cost. Repeat clicks, opening an already-bought hint, or switching cards cannot charge again. Disable hints after that objective is collected.

The free local search region is a pre-authored district circle approximately 45–55 units wide in radius, chosen so the actual socket lies inside it. It is not centered on the hidden collectible. Tier 2 uses the district's authored smaller region. Tier 3 uses a seeded offset patch of radius 12 units that still contains the socket; it must not encode the exact location through its center. Do not generate a line, breadcrumb trail, always-on arrow, or exact distance meter.

A city with no remaining objective has no amber objective region. Entering the wrong city can therefore teach the player something; it still costs travel and thinking time. Do not pretend this is a cheat-proof geographic exam.

Regions reveal area, not factual labels from a real map. Proper landmark/district names on the map are hidden until the relevant tier-2 hint; free silhouettes use generic accessible shape descriptions. For accessibility, use an outline/pattern and a short text description, not color alone. Keep map north aligned with world -Z. All symbols and obstacle outlines derive from the same city definition used by movement.

## Timing, points and fairness

**Adjusted time is the primary ranking value; lower is better.** Points are a friendly inverse display, not a second rule system.

```text
adjustedMs = activeMs + hintPenaltyMs + travelPenaltyMs
points = max(0, 10000 - floor(adjustedMs / 100))
```

A successful entry into any city costs **5 seconds**, including the first. Returning from a city to the globe costs no separate penalty. Globe decisions and active exploration count toward `activeMs`; loading and travel animation do not. A wrong-city detour costs an extra entry plus the time spent deciding/exploring. A failed load is not charged until it succeeds.

Example: 80 seconds of active play + two entries (10 s) + one city hint (10 s) = **100 s adjusted**, **9,000 points**. Hint costs directly reduce points as the user requested. Zero-point ties can still be distinguished by adjusted time.

The timer starts on Go and ends on the exact final pickup. Use monotonic elapsed time and accumulate only scored phases. Do not calculate time from simulation steps or FPS. If a single frame stalls for 800 ms, scored active time must include that 800 ms even if movement integration is capped.

Opening the map does not pause time. Explicit pause, window blur, or tab hiding clears movement, freezes the run, and marks it **Practice / paused**. Resuming cannot restore competitive eligibility. Show that label and exclude the run from local bests. This keeps the hackathon implementation simple without enabling unlimited free thinking via pause.

Retries clear all run state, hint tiers, active timers, transition tokens, pickups and penalties. They preserve settings and past valid bests. Local storage can fail or be edited; handle failures in memory and label records “Best on this device.” No global anti-cheat claim.

## Difficulty, replay and cuts

Trial medals initially use 90 / 135 / 210 seconds for gold / silver / bronze; playtests may tune per-trial values before freeze. Completion above bronze still receives a result and encouragement. Store level version in best-score keys so changed layouts or scoring do not compete against older records.

The fun should come from “I know a better route now” and “I can solve this without the hint,” not from a giant empty scene. Put two navigable routes around major obstacles and at least one visible landmark on arrival. A retry should take under two seconds of UI interaction to start.

If the scene feels empty, add a few benches, awnings, flags and sound accents. If it feels confusing, remove clutter and shorten routes. Do not add more destinations to repair a weak first run.
