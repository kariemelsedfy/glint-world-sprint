# Shared contracts and invariants

## Authority and bootstrap

The reference [contracts/game.ts](../contracts/game.ts) contains the v1 data types and constants. A0 copies it to `src/shared/contracts.ts` before workers branch. From that point **the source copy is authoritative**, and A0 updates this document when changing semantics. Do not maintain two independently edited copies. Mark the reference snapshot as superseded after bootstrap.

No worker may casually widen IDs, rename fields or add dependencies. A change request states the field/function, consumer impact and fallback; A0 decides and updates all affected adapters. Contracts are deliberately small. Keep React/Three.js imports out of the plain data file.

## Required exports established by A0

| Export / path | Owner | Meaning |
|---|---|---|
| `getCity(id): CityDefinition` in city registry | A0 with city data from A3/A4 | All authoritative spatial data |
| `ParisScene({definition, seed, quality})` | A3 | Scenery only, no players / pickups / timers |
| `GizaScene({definition, seed, quality})` | A4 | Same shape as Paris |
| `GlobeScene({cities, onSelectCity, interactive})` | A2 | Globe geometry and selectable pins |
| `TravelDirector({travel, destinationReady, paused, reducedMotion, onCovered, onComplete, onFailure})` | A2 | Calls token-carrying callbacks; no store access |
| `resolveObjectives(level, definitions): ObjectiveInstance[]` | A6 | Seeded socket choices, validated against city data |
| `useRunStore` / `dispatch(GameEvent)` | A1 | Only rule authority |
| `GameUI({model, actions})` | A5 | DOM overlay controlled by supplied state |
| `InputProvider` / `getMoveAxis()` | A1 | Keyboard and touch vector aggregation |
| `setTouchAxis(x,z)` from UI adapter | A0→A1 | UI emits input intent, never position changes |

React component prop types may live next to components but must use the plain types. A0 creates compiling stub exports immediately so workers have stable import paths. A0's glue converts run state into `UIModel`; never expose mutable store internals to the UI.

## Spatial invariants

- X east, Y up, Z south. North on the map is -Z. Bounds default to [-72,72] per axis.
- Scenery, collision, map and pickup locations are city-local, not globe coordinates.
- Socket `position` is the **player-reachable ground anchor**, not the decorative hover height. The collectible mesh can float above it.
- Blocker bounds include every solid landmark/building. Roads and navigable clearances are never filled by seeded decoration.
- Entry spawn and all eligible sockets must be reachable using the player's collision radius.
- Each socket has a district ID and a safe small-search center. Both the broad district region and tier-3 patch contain the socket.
- Paris, Giza and future modules use one scale, consistent materials and a shared lighting contract.

## Discrete state invariants

A run has an immutable `runId`, `levelId`, `levelVersion`, `seed`, and resolved objectives. Each objective has exactly one socket for that run. Global collectible type IDs are not event IDs; duplicate pickup callbacks must be idempotent.

`COLLECT` is accepted only in active city phase, in the objective's city, for an uncollected objective, within pickup radius of the actual player position. The controller does the spatial check and the reducer verifies identity/phase. Do not let the HUD dispatch arbitrary collection actions.

`BUY_HINT` advances exactly one tier for one uncollected objective, only in active globe/city play, and adds the matching incremental cost once. UI opening an existing hint has no economic effect. Use the requested expected tier to reject double clicks on stale UI.

`SELECT_CITY` is accepted only on the active globe and starts one transition. Successful city arrival adds one 5-second entry charge exactly once. Exit travel adds none. Travel callbacks include run and transition IDs and are ignored when stale.

Time is monotonic wall elapsed during active globe/city phases. **Map viewing is included**; pause, loading and travel animation are excluded. Pause marks practice. HUD number interpolation is decorative; final results always derive from the authoritative clock snapshot taken at last pickup.

Pause/blur/hidden marks practice permanently for that run. Results freeze once. Retry creates a new runId using the same level seed and clears pending callbacks/input. A valid local best improves only with lower adjusted milliseconds.

## UI and action ownership

Required screens: menu, briefing, globe HUD, city HUD, map overlay, pause overlay, results, loading/recoverable error. Hint control names the next price before activation. Wrong-city exploration is allowed; show no remaining objective zones there. Collected cards display completion; uncollected cards preserve the clue.

The map receives only view-ready obstacle shapes, player position and current permitted search regions. Proper landmark/district labels remain null until the relevant tier-2 hint is purchased; the free map uses recognizable silhouettes and generic accessible shape descriptions. The adapter produces MapLandmarkVM rather than passing raw city labels directly. It never recomputes region narrowing or hints itself. Likewise the result receives the already-computed score and medal.

Touch targets are at least 44 CSS px. Mobile portrait may display a rotate-to-landscape prompt without losing the run. Changes of viewport size do not change movement speed or scoring. Do not trap keyboard focus in the canvas.

## Event semantics

The reference union lists events to standardize worker conversations; A1 may implement actions wrapping those events. `TICK_ACTIVE` is emitted by the clock, not from arbitrary UI. `COLLECT` is emitted by validated player/pickup logic. `TRAVEL_*` comes only through A0's current transition callbacks. Pause and travel behavior must pass the tests in QA_AND_PLAYTEST.md.

Every acceptance check that changes these contracts is recorded in the relevant agent status and reviewed by A0 before merging. No separate schemas for AI Studio and runtime: the UI export is adapted to this contract.
