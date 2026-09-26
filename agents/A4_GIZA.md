# A4 — Giza miniature

You own `src/cities/giza/`. Read AGENTS.md, docs/ART_DIRECTION.md, docs/CONTENT_AND_LEVELS.md and docs/CONTRACTS.md. Export a pure CityDefinition and `GizaScene({definition, seed, quality})`; keep gameplay and UI out.

## First increment

Build the 144×144 flat ground, spawn plaza, footprints/blockers, districts and all nine named sockets. Verify all candidate sockets are reachable with the player radius and have a clear pickup area. Base geometry should compile before decorative work begins.

## Hero art

Prioritize a recognizable Great Pyramid and reclining Sphinx, warm sand/stone, a modest colored-canopy market, and optional smaller pyramids/distant skyline. The pyramidion is a fictional gold collectible on a ground pedestal near the pyramid; **no climbing and no claim that it sits on the real monument today**. Sphinx medallion and scarab sockets are outside solid geometry.

Keep the same scale, shared palette, lighting assumptions and toy-like material treatment as Paris. Use local ordinary market cues without stereotyped character caricatures. The persistent player is rendered by A1, not replaced with a different person in this city.

Cosmetic seeded props must avoid navigable clearances, spawn and sockets. Every visible solid footprint must have matching collision/map data. No rolling dunes, uneven physics terrain, tomb interiors or procedural maze.

## Evidence and done

Deliver exact planned IDs and coordinates through CityDefinition, with any adjustments communicated to A0/A6. Provide overview, arrival and Sphinx/pyramid screenshots plus a walking clip showing reachable targets. Report measured render counts if available and asset provenance. Verify standard and low quality.

Your task is a distinctive playable second destination, not an enormous city. Cut extra pyramids and props before cutting path clarity, collectible access or visual consistency.

## Required handoff

Update your own `docs/status/A4.md`; open a small draft PR. Include commit SHA, changed paths, demonstrated behavior, checks actually run, screenshot/clip if visual, remaining bugs, and exact integration instructions. Never invent successful tests or benchmarks. Record asset/tool provenance. Do not merge your own PR.
