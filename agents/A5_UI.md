# A5 — Integrate Google AI Studio's UI

You own `src/ui/`. Read AGENTS.md, docs/AI_STUDIO_WORKFLOW.md, docs/GAME_DESIGN.md, docs/CONTRACTS.md and the approved AI Studio export supplied by Karim. Your deliverable is functional game UI, not a separate website.

## Input and first pass

A0 supplies UIModel/UIActions and compiling adapters. Karim supplies actual AI Studio source/screenshots. If export is still pending, work against the contract and style tokens; do not falsely claim you used AI Studio. Keep the final source contribution traceable in AI_PROVENANCE.md via your status handoff.

Extract presentational React/CSS into `src/ui/`. Remove any duplicate app/router/store, mock timing/scoring, auth, backend/API/Gemini code, env files, external assets or package scaffolding. Ask A0 for a reviewed dependency change instead of editing the lockfile yourself. Preserve recognizable approved design work rather than replacing everything and claiming tool usage.

## Required behavior

Menu/trial selection, briefing, globe selection controls, city HUD, clue selection, paid hint UI, map, pause, loading/error and results. Retry is the primary results action. Display adjusted time with raw/penalty breakdown, practice status and local/session-only best correctly. Buttons call supplied actions exactly once; all hints show incremental cost before purchase and disable when inapplicable.

The scene occupies most of the screen. A compact map uses supplied geometry and search regions; it never calculates its own hidden-object logic. No route arrows or precise unbought target markers. Overlay pointer events must leave the globe clickable outside controls.

Implement landscape touch-stick presentation emitting normalized input; clear on release/cancel. Use 44px targets, visible keyboard focus, legible contrast, responsive 1280×720 and 844×390 layouts, persistent mute/reduced-motion settings via callbacks, and a nondestructive portrait rotate prompt.

## Acceptance

Provide screenshots of menu, active HUD/map and result on both target sizes. Show all buttons wired in the real integrated game. No clipped clues, hidden retry button, fake leaderboard, `alert()` placeholders, stale mock scores, console errors or external runtime font/image requests. Document exactly which AI Studio files/designs were used and what you changed.

## Required handoff

Update your own `docs/status/A5.md`; open a small draft PR. Include commit SHA, changed paths, demonstrated behavior, checks actually run, screenshot/clip if visual, remaining bugs, and exact integration instructions. Never invent successful tests or benchmarks. Record asset/tool provenance. Do not merge your own PR.
