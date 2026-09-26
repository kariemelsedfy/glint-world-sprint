# Content and level specification

## Content rules

All game objects are stylized replicas, tokens, or invented souvenirs. Clues refer to recognizable imagery; they do not assert that a souvenir is a historical artifact or in a real museum location. An in-game footer says: “Miniature cities and fictional collectibles inspired by real places.”

A6 owns final runtime content under `src/content/`. The tables below are the initial approved reference. Google AI Studio may propose better wording; human review must preserve solvability and object identity. A model never chooses arbitrary spawn coordinates.

## Six targets

| ID | Clue title | Clue shown before hints | Reveal / collection label | City / district / landmark |
|---|---|---|---|---|
| `paris-smile` | The secret smile | “A famous smile waits near a glass triangle.” | Mona Lisa replica | Paris / `louvre` / `louvre` |
| `giza-crown` | The lost crown | “Find a golden crown where giant triangles meet the sand.” | Imagined golden pyramidion | Giza / `pyramids` / `great-pyramid` |
| `paris-iron` | The iron needle | “An iron giant points at the sky. Its tiny twin waits below.” | Eiffel Tower token | Paris / `tower` / `eiffel` |
| `giza-guardian` | The desert guardian | “A stone guardian with a lion's body watches over the sand.” | Sphinx sun medallion | Giza / `sphinx` / `sphinx` |
| `paris-crescent` | The crescent breakfast | “Find a buttery crescent among striped café awnings.” | Croissant souvenir | Paris / `cafe` / `cafe` |
| `giza-beetle` | The blue beetle | “A blue beetle gleams beneath the desert market's canopies.” | Scarab charm | Giza / `market` / `market` |

The croissant and scarab are easier theme recognition rather than exact monument knowledge. The two-city context makes them solvable. All clues should be short enough to read while playing. Do not replace them with obscure trivia to create artificial difficulty.

## Exact starter hint text

| Target | Tier 1: city (+10s) | Tier 2: district (+20s) | Tier 3: nearby (+35s) |
|---|---|---|---|
| paris-smile | “Travel to Paris.” | “Search the Louvre courtyard.” | “Search outside the glass pyramid, at ground level.” |
| giza-crown | “Travel to Giza.” | “Search around the Great Pyramid.” | “Circle the pyramid's base; the crown is on a low pedestal.” |
| paris-iron | “Travel to Paris.” | “Search the Eiffel Tower plaza.” | “The tiny tower stands outside the giant tower's feet.” |
| giza-guardian | “Travel to Giza.” | “Search around the Sphinx.” | “Look on the open ground beside the guardian.” |
| paris-crescent | “Travel to Paris.” | “Search the café quarter.” | “Look beside a striped awning, outside the café.” |
| giza-beetle | “Travel to Giza.” | “Search the market.” | “Look around the outer edge of the market stalls.” |

Tier 3 also reveals the permitted small map patch; text must be true for every eligible socket. Update hint wording if a socket's scenery changes. Never direct the player inside a locked/solid mesh.

## P0 authored trials

| Level ID | Title | Seed | Objectives | Initial medals: gold / silver / bronze |
|---|---|---:|---|---|
| `icons` | Icons | 2026092601 | paris-smile, giza-crown | 90 / 135 / 210 seconds adjusted |
| `sky-sun` | Sky & Sun | 2026092602 | paris-iron, giza-guardian | 90 / 135 / 210 seconds adjusted |
| `small-wonders` | Small Wonders | 2026092603 | paris-crescent, giza-beetle | 90 / 135 / 210 seconds adjusted |

All start at version 1. The seeds fit unsigned 32-bit values. A6 uses a small specified seeded PRNG, such as mulberry32 with an explicit implementation committed to source. Convert to unsigned 32-bit intentionally. Sort target IDs and candidate socket IDs before resolving so unrelated imports do not change results. Prefer an independent seed derived from `level.seed + targetId` using a documented deterministic string hash, rather than one shared random stream for content and scenery.

Seed determinism is within a committed content version. If candidates, layouts, penalties or medal thresholds change, increment the appropriate content/rules version and invalidate incompatible bests. A retry does not choose a new socket. Different trials contain different items; random socket variation is not a substitute for this requirement.

## Socket IDs and coordinate starters

A3 and A4 author these sockets in their `CityDefinition`, verify collision clearance, and may adjust positions before contract freeze. A6 references exact IDs, not copied coordinates. X/Z values below imply Y=0.

| Target | Allowed socket IDs | Suggested X/Z anchors |
|---|---|---|
| paris-smile | `louvre-a`, `louvre-b`, `louvre-c` | (24,-14), (42,-14), (48,-26) |
| paris-iron | `tower-a`, `tower-b`, `tower-c` | (-46,12), (-20,24), (-35,42) |
| paris-crescent | `cafe-a`, `cafe-b`, `cafe-c` | (24,42), (42,44), (50,30) |
| giza-crown | `pyramid-a`, `pyramid-b`, `pyramid-c` | (-10,-22), (-30,-6), (-50,-30) |
| giza-guardian | `sphinx-a`, `sphinx-b`, `sphinx-c` | (10,14), (32,0), (32,26) |
| giza-beetle | `market-a`, `market-b`, `market-c` | (16,44), (34,58), (44,46) |

A socket is not valid merely because it lies outside a visual mesh. Verify it against blockers expanded by player radius and a flood-fill reachability grid. Leave at least a 3-unit clear pickup area and prevent prop placement there. For fine search, use an authored or deterministic center offset about 4–7 units from the socket; radius 12 still contains it.

## Validator acceptance

- Unique IDs, valid city/district/landmark/socket references; nonempty socket lists.
- Every P0 trial has two distinct targets, both cities present; three trials use six distinct targets total.
- The resolver is stable across repeat calls, import order and cosmetic changes.
- All candidate sockets, not just the selected one, are in bounds, reachable and outside expanded blockers.
- Each socket is inside its district's broad and narrowed regions and its fine-search patch.
- Hint strings are nonempty, accurate for every socket and do not contain unreplaced template fields.
- Every referenced icon kind has an implemented local visual; absent optional assets use a simple geometry fallback.

## Optional seeded challenge

Only after core QA passes: select three distinct target IDs, ensure both cities are represented, store the resulting IDs/seed/version in a shareable text code, and offer “Retry this challenge.” A same-day UTC seed is a convenience, not a secure global competition. Browser clocks can differ. Do not claim online rankings. Keep this mode separate from the three P0 trials and add contract IDs through A0.
