# A2 — Globe and travel presentation

You own `src/world/`. Read AGENTS.md, docs/CONTRACTS.md, globe/travel architecture and the globe art section. Build the visible hook: colorful toy Earth → dive through clouds → miniature city. Do not build a geographic streaming engine.

## First increment

Render a pleasing ocean sphere, simple recognizable continents, restrained atmosphere/clouds and selectable Paris/Giza pins. Use supplied city IDs/anchors and `onSelectCity`. Labels remain readable; hidden hemisphere pins cannot be clicked. UI provides equivalent named buttons. Optional globe drag must never conflict with pin clicks.

## Travel increment

Implement one `TravelDirector` with a unique transition/run token supplied by the app. A0 also provides destination readiness. Camera turns toward the destination, zooms through fully opaque cloud cover, requests the scene swap via `onCovered`, then reveals the city and signals completion. Never directly set penalties, collected state or run results.

Target about 1.6s entering, 0.7s exiting. Hold cover if assets are loading; surface failure and restore the globe after the app's 8s attempt timeout. Tokenize every async/timeline callback. Cancellation, restart or a stale load cannot move the new run's camera. Reduced motion uses a brief fade with identical scoring cost. Pause/visibility handling must stop/resume the timeline safely.

One renderer/Canvas survives; only one system writes the camera at a time. A0 owns SceneHost and global lights. Use shared colors and compatible directional lighting. A world-to-local scene switch is acceptable; the user-facing effect must be smooth and coherent.

## Constraints and verification

No Google Maps/Earth API, remote map tiles, terrain data, globe-sized physics scene, shader-heavy postprocessing, giant globe package or unlicensed imagery. If geographic shape tooling takes over 15 minutes, use original simplified continent geometry or a documented local texture.

Show entry and exit for both cities, cancellation/retry, low quality and reduced motion. Repeat ten travels and check that meshes/listeners/GPU resources do not keep growing. Deliver a clip from the integrated scene, not only an isolated globe animation. Fallback is a clean fade, never a black/broken transition.

## Required handoff

Update your own `docs/status/A2.md`; open a small draft PR. Include commit SHA, changed paths, demonstrated behavior, checks actually run, screenshot/clip if visual, remaining bugs, and exact integration instructions. Never invent successful tests or benchmarks. Record asset/tool provenance. Do not merge your own PR.
