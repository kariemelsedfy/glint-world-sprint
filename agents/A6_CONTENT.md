# A6 — Content, deterministic placement and hints

You own `src/content/` and content validation/tests. Read AGENTS.md, docs/CONTENT_AND_LEVELS.md, docs/GAME_DESIGN.md and docs/CONTRACTS.md. Consult the actual AI Studio clue output if supplied; the starter wording is valid fallback content but is not evidence of AI Studio use.

## Implement

Six typed target definitions, three authored trial definitions, fixed seed/version fields, the documented three hint strings and icon kinds. Use exact IDs and socket references. Build `resolveObjectives(level, definitions)` to select approved sockets deterministically with a documented unsigned-32-bit PRNG/hash.

Targets never select their own arbitrary world coordinates. Read the city socket/district data from definitions. Return objective instances with broad, narrowed and fine search areas. Cosmetic random draws must not affect placement. Sort candidate IDs to keep resolution stable.

Expose view-ready hint/search selection helpers as needed, but A1 owns purchasing and penalties. Tier 0/1 local map uses the broad region; tier 2 narrows it; tier 3 reveals the small patch. City knowledge is shown only after the purchased city hint. Do not add a route or an exact target marker.

## Validate meaningfully

Unique valid references; distinct two-city trial pairs; six distinct items across three trials; all candidate sockets in bounds, clear of expanded blockers and reachable by flood fill from spawn; search regions contain their target; deterministic repeat resolution; truthful hint wording for every allowed socket. Use the city's collision geometry, not a second guessed map. A collision validator is conservative: report false negatives for manual review, do not silently accept an unreachable socket.

Coordinates may change before freeze; coordinate with city owners/A0 and keep IDs stable. Reject incomplete/generated JSON gracefully; no dynamic `eval`, unchecked remote content or HTML injection.

## Optional only after core passes

Three-target seeded tour, with both cities represented, independent seed/version keys and replay of the same exact challenge. Do not spend core time inventing more cities or 100 clues.

## Done

All three trials resolve and run in the combined game; every possible target socket has been validated; AI draft → human review → committed content provenance is recorded where applicable. Supply example resolved outputs for the three fixed seeds and actual validator/test results.

## Required handoff

Update your own `docs/status/A6.md`; open a small draft PR. Include commit SHA, changed paths, demonstrated behavior, checks actually run, screenshot/clip if visual, remaining bugs, and exact integration instructions. Never invent successful tests or benchmarks. Record asset/tool provenance. Do not merge your own PR.
