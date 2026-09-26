# GLINT agent instructions

## Objective and current state

Ship a polished, free itch.io HTML5 treasure speedrun with public full source and evaluation docs. The four judging criteria are performance, execution quality, novelty, and stickiness. **Two excellent tiny cities outrank extra unfinished features.** This is initially a planning-only repository; A0 must create the implementation.

Read [START_HERE.md](START_HERE.md), [docs/CONTRACTS.md](docs/CONTRACTS.md), and your assigned brief in `agents/` before edits. Read deeper design docs only where needed. User instructions and a newer recorded owner decision override this plan; do not invent requirements.

## Scope lock

P0: Paris + Giza; six targets / three trials; third-person elevated camera; grounded movement; globe entry/exit; clues; broad map regions; three paid hint tiers; deterministic target placement; timer; results; same-trial retry; local bests; audio/motion toggles; usable desktop and basic landscape touch controls.

No real maps or Google Earth data; no multiplayer, auth, payments, chat, generated 3D at runtime, network-dependent gameplay, climbing, giant procedural worlds, physics engine, or global leaderboard. Optional work requires the gates in PROJECT_PLAN.md, not extra enthusiasm.

## Ownership and integration

- A0 is the only writer to root configuration, dependencies / lockfile, `src/shared/`, `src/app/`, and `src/cities/index.ts` after bootstrap.
- A1 owns `src/game/`, `src/state/` and gameplay unit tests.
- A2 owns `src/world/`.
- A3 owns `src/cities/paris/`; A4 owns `src/cities/giza/`.
- A5 owns `src/ui/`, including UI-scoped CSS and touch input presentation.
- A6 owns `src/content/`, content validation and content tests.
- A7 owns `tests/e2e/`, `scripts/package-itch.mjs`, `scripts/check-release.mjs`, `docs/qa/`, and release evidence. CI edits go through A0.
- Every agent may update its own `docs/status/Ax.md`. A0 consolidates shared documents.
- Do not modify another owner's paths. Request a precise interface change from A0; continue against a local mock without merging that mock into shared source.
- Separate branches / checkouts. No concurrent writes to a shared working tree. A0 serializes merges. Never force-push `main`, discard others' work, or deploy an untested worker branch.

## Contract and implementation rules

A0 copies `contracts/game.ts` to `src/shared/contracts.ts`; the source copy then controls. Apply any interface change there and record it in docs/CONTRACTS.md. Workers must explicitly acknowledge changes before merging.

Keep city definitions pure data. Collision and map geometry come from the same city definition; visuals do not invent a second map. City modules render scenery, never score or collect items. UI receives a view model and callbacks, never owns rules. A single reducer/store owns run state, penalties, transitions, and persistence.

Use seeded randomness. No `Math.random()` for target selection, placement, routes, or scored content. Do not mutate React state every rendered frame. One canvas, one camera authority, bounded effects, reusable geometry/materials. Preserve responsive layout, focus, retry, resize and reduced motion.

## Commands A0 must establish

Runtime baseline: Node 24.x; A0 records an exact working version in `.nvmrc`. Use npm and commit `package-lock.json`.

```bash
npm ci
npm run dev
npm run typecheck
npm run test
npm run build
npm run preview
npm run test:e2e
npm run package:itch
npm run check:release
```

Until the scaffold exists these are required future commands, not runnable guarantees. `test` must exit once, not watch. The release ZIP contains the contents of `dist`, with `index.html` at ZIP root.

## Security and documentation

The public game requires no secret. Never put Gemini, Devin, GitHub, itch.io, or other credentials into code, prompts committed to git, screenshots, console logs, ZIPs, source maps, or `VITE_*` variables. `.env` exclusion does not undo a leak in history. Rotate any exposed secret immediately.

Record actual AI Studio and Devin use, prompt/output provenance, dependencies, asset origins, and executed tests. Never fabricate session links, model IDs, benchmarks, playtest counts, eligibility, or completed features. Label planned vs implemented behavior clearly.

## Definition of done for a worker

Compile against current main; exercise the changed behavior; add targeted tests for risky rules, not superficial component coverage; provide a screenshot or short recording for visual work; list known issues; update your status file; open a small PR with the template. A0 merges only after integration checks. Stop optional tests once their concrete risk is resolved.

Escalate a blocker within 10 minutes with a fallback. Preserve a playable build. Cut Rome, dynamic AI, daily challenges, decorative complexity, and expensive effects before cutting retry, controls, the two-city loop, clue fairness, or publication.
