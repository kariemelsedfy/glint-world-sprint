# A3 — Paris miniature

You own `src/cities/paris/`. Read AGENTS.md, docs/ART_DIRECTION.md, docs/CONTENT_AND_LEVELS.md and docs/CONTRACTS.md. Export a pure CityDefinition and `ParisScene({definition, seed, quality})`. No players, pickups, state stores, UI or scoring in your scene.

## First increment

Build the 144×144 ground, validated spawn, river/bridges, landmark blocker footprints, all nine named sockets and map/district data. Use graybox meshes first. Prove the player can walk from spawn to every candidate socket with clearance. Do not create a beautiful city with an impossible target.

## Hero art

Prioritize the Eiffel Tower silhouette and Louvre glass pyramid. Use warm stone blocks, blue-gray roofs, striped café awnings and sparse trees/lamps. The café supports the croissant target. Terrain is flat. Water is blocked except bridges, and visual barriers match colliders. Sockets stay outside monuments at ground level.

Use the suggested coordinates as starting points, then validate. Ground outside blockers is traversable; roads are readability cues, not invisible rails. Keep at least two routes through the city. Independent cosmetic seeding can vary reserved façade/prop zones but cannot move blockers or close clear paths.

## Required exports and evidence

Provide exact landmark/district/socket IDs from the shared plan. Keep collision, map footprints and visible geometry consistent. A6 references your socket IDs; notify A0/A6 before changes. Keep low quality useful without erasing landmark identity.

Deliver arrival, overview and landmark screenshots; a short clip walking the legal route to every target family; notes on reused geometry/materials and any measured render counts. No runtime downloads or external credentials. Record any asset origin/license; original procedural geometry is preferred.

Timebox detailed architecture. If the city does not compile within the first hour, reduce decorative complexity. Done means playable, recognizable and consistent with Giza, not a standalone architectural rendering.

## Required handoff

Update your own `docs/status/A3.md`; open a small draft PR. Include commit SHA, changed paths, demonstrated behavior, checks actually run, screenshot/clip if visual, remaining bugs, and exact integration instructions. Never invent successful tests or benchmarks. Record asset/tool provenance. Do not merge your own PR.
