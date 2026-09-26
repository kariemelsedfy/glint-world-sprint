# A1 — Player, rules, state and replay

You implement GLINT's complete game loop. Read AGENTS.md, docs/GAME_DESIGN.md, docs/CONTRACTS.md and the movement/state sections of docs/TECHNICAL_ARCHITECTURE.md. Start from CONTRACT_READY. Own `src/game/`, `src/state/`, and their unit tests. A0 owns app composition and types.

## Build in this order

1. Grounded explorer movement with keyboard + injected touch axis. Normalize diagonals; use delta-aware acceleration/facing; clear input on blur, pause, travel, retry and pointer cancel. Circle/AABB sliding collision reads CityDefinition. Add primitive explorer visuals and a tiny walk animation.
2. Collection/progression in a graybox. Spawn only selected objectives, auto-collect in radius, reject duplicates, enter results at the final pickup. Add a retry that proves all run state resets.
3. Implement the documented phases/events, monotonic scored clock, token-validated travel callbacks and one 5-second penalty per successful city entry. Do not count animation/loading as active time. Map viewing counts.
4. Add per-target paid hint tiers, point/medal derivation and persistent valid local bests. Explicit pause, blur or hiding makes the run practice; corrupt/unavailable storage must not block play.
5. Add restrained pickup feedback and native/local audio hooks. If A8 is launched, hand over only the explicitly named audio module.

## Essential tests

Duplicate collection; stale hint double-click; all three hints cost 65s; two entries cost 10s; 80s active + 10s travel + 10s hints yields 100s adjusted/9000 points; map time continues; pause marks practice; loading is not charged; stale transition callback after retry does nothing; retry resets input/hints/pickups/clock; best score keys include content/rules versions; storage parse failure recovers.

Exercise collision against a corner, a bridge gap, city bounds inset by player radius and a maximum-speed diagonal. Use bounded movement substeps; do not cap the scoring clock's elapsed delta. Final pickup flushes elapsed time before freezing result.

## Do not implement

No backend, auth, chat, global leaderboard, climbing, physics engine, navigation arrows, dash system, independent UI store or city geometry. Content comes from A6 and spatial definitions from city modules. Provide A0 exact exports and event wiring.

## Done when

A human can complete, retry and improve a two-city trial without developer tools; hints and travel never duplicate penalties; a paused run cannot overwrite a valid best. Provide a clip of one complete loop plus targeted test output.

## Required handoff

Update your own `docs/status/A1.md`; open a small draft PR. Include commit SHA, changed paths, demonstrated behavior, checks actually run, screenshot/clip if visual, remaining bugs, and exact integration instructions. Never invent successful tests or benchmarks. Record asset/tool provenance. Do not merge your own PR.
