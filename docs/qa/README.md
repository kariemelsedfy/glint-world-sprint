# QA evidence (A7)

Everything in this folder records what was actually executed. Nothing here is a human playtest, a real-device benchmark or an itch.io upload unless it says so explicitly; none of those have been done yet.

| File | Contents |
|---|---|
| `README.md` | Automated coverage, executed runs, findings, not-yet-run scenarios |
| `PERFORMANCE.md` | Bundle, ZIP, load and frame-timing measurements with method and limits |
| `RELEASE_CHECKS.md` | What `package:itch` and `check:release` enforce, and the negative test that proves the gate fails |
| `ITCH_PUBLICATION_CHECKLIST.md` | Step-by-step upload and verification checklist for the owner/A0 |
| `EVALUATION_AND_PROVENANCE.md` | Evaluation evidence and provenance notes for the hackathon submission |

## Environment of every run below

- Current runs: integrated `main` @ `02354483d8c022b94e6b9f003713008c0880933b` (five cities, arcade UI, new globe art, photo collectibles, A1 fixed-substep player simulation, A5 globe-HUD Pause fix) plus the A7 branch changes (`tests/e2e/` and `docs/qa/` only; no game source changed). Earlier runs on `656af1d`, `aa7edaf` and `47d365b` are kept in the run table for history.
- macOS 26.5.2 on an Apple M4 virtual machine (8 vCPU, 16 GiB), no GPU exposed to the browser.
- Node v24.20.0, npm 10.8.3, Playwright 1.49.1, bundled Chromium 131.0.6778.33, headless.
- WebGL through SwiftShader (`--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader`, from `playwright.config.ts`). Reported renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0)), SwiftShader driver)`.
- Playwright `Desktop Chrome` device profile: 1280×720 viewport, DPR 1 (its user agent string claims Windows; the host is macOS).
- Served by `vite preview` on `http://127.0.0.1:4173` from the production build, never `file://`.
- Run date: 2026-09-26 (UTC).

## Automated end-to-end coverage (`npm run test:e2e`)

All tests drive the production build with real keyboard/mouse input. There are no test-only hooks in the game and the tests never read or write the Zustand store. Player position is read from the in-game map marker; objective positions come from the real `resolveObjectives` via `tests/e2e/support/print-objectives.ts` (run through `vite-node`), so the tests follow content changes instead of hard-coding coordinates. Walking uses arrow keys and a grid A* route planner (`tests/e2e/support/game.ts`) around the city blockers from the real city definitions.

The walker is closed-loop and load-tolerant: it measures the real `requestAnimationFrame` interval, sizes each key hold from a displacement model (`carry + rate × hold`) that it re-fits after every hold from the player's actual map position, re-plans when a hold does not move the player, and keeps walking until the player is inside `PICKUP_RADIUS` or a 5-minute deadline passes. It then still requires the game to strike the objective through (a physical-proximity pickup). A slow frame loop therefore means more and longer holds, not a missed pickup. Travel waits up to 60 s for the destination city.

| Spec / test | What it proves |
|---|---|
| `smoke.spec.ts` — boots into the menu | Menu renders over a sized canvas with no page errors (A0 bootstrap test, kept) |
| `smoke.spec.ts` — menu → briefing → globe → Paris | Basic travel wiring (A0 bootstrap test, kept) |
| `loop.spec.ts` — full loop | Menu → Briefing → Go → globe → fly to city 1 (+5 s entry) → map shows one search zone → walk to and collect objective 1 → map shows no remaining zone → back to globe (no exit charge) → fly to city 2 (+5 s) → collect → results. Results breakdown: hints 0, travel 10 s, adjusted = active + hints + travel (±0.3 s display rounding), not practice. Local best stored in `localStorage` (`glint:v1`) and equal to the shown adjusted time. Retry returns to a clean briefing and a fresh run (0 penalty, clock reset, no practice tag, no struck-through objectives). After a page reload the stored best is unchanged; a second, paused (practice) completion does not overwrite it. No page errors during the whole run. Covers Paris→Giza travel for the `icons` trial. |
| `rules.spec.ts` — entry penalty | +5 s on each arrival, 0 on exit, +5 s again on a revisit of the same city, cumulative 15 s after three arrivals |
| `rules.spec.ts` — hint tiers + map | Tier 1 bought on the globe costs 10 s and the button then names tier 2's price; map before tier 2 shows one broad region with the contract radius and no proper landmark name; with the map open the clock keeps running (≥1 s over 1.5 s) and held movement keys do not move the player; tier 2 adds 20 s, narrows the region and reveals the landmark name; tier 3 adds 35 s, shows the fine radius and removes the hint button (total 65 s + 5 s entry) |
| `rules.spec.ts` — hint double-click | A rapid double-click buys exactly one tier (+10 s) and tier 2 stays purchasable (A5's 700 ms debounce; F1 closed) |
| `rules.spec.ts` — pause / hidden tab mid-travel | Starting a flight, then hiding the tab (emulated `visibilitychange` → `hidden`) shows the Paused overlay; the flight holds for 3 s without landing; after showing the tab and Resume it lands, the run is tagged practice and exactly one 5 s entry penalty is charged; a manual Pause freezes the displayed clock for 1.5 s |
| `routes.spec.ts` — route planner vs collision | Node-side (no browser, ~2 s): for every objective of all six trials, walks from the city spawn with the e2e `planRoute` legs driving the game's own `simulatePlayer` (movement, collision, pickup) at 30 Hz. Asserts all 12 objectives are picked up within 120 s of simulated time and that all five registered cities are walked. Catches scenery/blocker edits that would strand the browser walker, with the failing target named |
| `trials.spec.ts` — `twin-capitals`, `bay-and-forum`, `wall-and-bay` | For each trial that introduces Rome, San Francisco or Berlin: start the trial, fly to its first city (+5 s entry), map shows one search zone with the contract broad radius, the player marker starts at the city definition's spawn (±0.5), walk to and physically collect the first target, the map then shows the right number of remaining zones in this city, the second target is not struck through, no page errors |
| `fallback.spec.ts` — no WebGL | With `--disable-webgl --disable-3d-apis` the page shows the error boundary ("Something went wrong" + "Reload GLINT") rather than a blank page |
| `perf.spec.ts` | Measurement pass (see `PERFORMANCE.md`); sanity assertions only. A second test measuring without the SwiftShader flags is skipped unless `PERF_GPU=1` |

E2E helpers are type-checked on their own with `npx tsc -p tests/e2e` (strict, no `any`).

### Executed runs

| When (UTC) | Command | Result |
|---|---|---|
| 2026-09-26 ~17:07 (`0235448`) | `npx tsc -p tests/e2e && npm run typecheck && npm test && npx playwright test && npm run package:itch && npm run check:release`, host load ~15 on 12 vCPU | all ok; unit 55/55; e2e 13 passed, 1 skipped (`PERF_GPU` variant) in 3.4 min, every `expect(errors).toEqual([])` intact (no `<svg>` console errors observed); ZIP 1.14 MiB (16 files), release check passed — see `PERFORMANCE.md` |
| 2026-09-26 (`1c87dcf`, before A5's fix) | `npx playwright test loop.spec.ts` | Failed at the retry step: the globe HUD Pause button was under a `pointer-events-none` header, so the canvas took the click. Reported to A0; fixed by A5 in `7641398`. Not worked around in the test |
| 2026-09-26 (`99f43ba`) | Walker stress probe (throwaway spec, not committed): `requestAnimationFrame` busy-wait of 560 ms per frame (app at ~1.7 fps, main thread saturated), `walkToAndCollect` on `icons` objective 1 | **Not collected** within the 5-minute deadline. With the main thread saturated, keyboard events queue behind frames, so the shortest possible press moved the player ~37 units (6 frames) and each map read took ~40 s; no keyboard walker (or player) can position to a 2-unit pickup at that granularity. Recorded as a limit. A GPU-bound slowdown does not starve input the same way, and since A1's fixed-substep simulation (`MAX_FRAME_DT` = 1 s) a slow frame no longer shortens distance per wall-clock second |
| 2026-09-26 ~14:04 (`656af1d`) | `npx playwright test` (full suite), host load ~5 | 9 passed, 1 skipped (`PERF_GPU` variant) in 2.0 min |
| 2026-09-26 ~14:07 (`656af1d`) | `npx playwright test` (full suite) with 6 extra `yes` CPU hogs, load ~13; app at 16–20 fps under SwiftShader | 9 passed, 1 skipped in 3.1 min |
| 2026-09-26 (`656af1d`) | Walker stress probe (throwaway spec, not committed): an injected `requestAnimationFrame` callback that busy-waits 120 ms / 250 ms per frame (app at ~8.5 / ~4 fps), then `walkToAndCollect` on both `icons` objectives | An intermediate version with a fixed 3-frame minimum hold oscillated around a leg at 120 ms and did not collect within its 180 s deadline (same symptom as A0's loaded-box failure: walk ends short of the pickup). With the displacement model: both objectives collected at both stall levels (walks of 56 s / 31 s at ~8.5 fps and 164 s / 95 s at ~4 fps) |
| 2026-09-26 (`656af1d`) | `npx playwright test` with the host saturated (iOS Simulator services plus 8–12 `yes` hogs, load 60–240) | 6 failed: travel did not land within 60 s because the city could not present frames inside the game's own 8 s travel timeout, so it returned to the globe. Environment saturation, not a walker failure; recorded for honesty |
| 2026-09-26 (`656af1d`) | `npx tsc -p tests/e2e`, `npm run typecheck`, `npm test`, `npm run build`, `npm run package:itch`, `npm run check:release` | all ok; unit 43/43; ZIP 305.3 KiB, release check passed — see `PERFORMANCE.md` |
| 2026-09-26 (`656af1d`) | `npx playwright test tests/e2e/perf.spec.ts` ×2 | passed; numbers in `PERFORMANCE.md` |
| 2026-09-26 (`aa7edaf`) | full suite after the grid A* planner and A5 selector fixes (PR #10) | 9 passed, 1 skipped |
| 2026-09-26 ~11:47 (`47d365b`) | `npm run typecheck && npm test && npm run test:e2e && npm run package:itch && npm run check:release` | typecheck ok; unit 10/10; e2e 9 passed, 1 skipped (`PERF_GPU` variant) in 1.5 min; package ok; release check passed |
| 2026-09-26 (`47d365b`) | `npm run build` | ok (graybox numbers, superseded) |
| 2026-09-26 (`47d365b`) | `PERF_GPU=1 npx playwright test tests/e2e/perf.spec.ts` | SwiftShader test passed; hardware-GL test failed: this VM has no GPU, Chromium cannot create any WebGL context without SwiftShader, and the game shows its error screen |
| 2026-09-26 (`47d365b`) | Negative release check (tampered ZIP) | Failed as intended with 9 findings — see `RELEASE_CHECKS.md` |

## Findings

| # | Severity (QA plan scale) | Finding | Owner |
|---|---|---|---|
| F1 | P1 — **closed** on `aa7edaf` (A5 700 ms debounce; the e2e test now requires exactly +10 s) | Double-clicking a hint button bought two tiers (observed +30 s on `47d365b`). The store correctly refuses to skip tiers, but the button relabels to the next tier under the cursor, so the second click is a valid purchase. The QA plan expects "exactly one tier/cost at a time" for a rapid double-click. Suggested fix: short purchase cooldown or confirmation in the hint button, not in the store. | A5 (UI) / A1 |
| F2 | P2 | Without WebGL the player sees the generic crash screen ("Something went wrong — Error creating WebGL context."), which is recoverable but not the "useful compatibility message" the QA plan asks for. | A0 / A5 |
| F3 | Info | On `656af1d` under SwiftShader, p95 is 33.3–33.4 ms in menu, globe and Paris (one missed vsync), above the 25 ms desktop target; Paris runs at ~40 fps. Software rendering, not a real-device measurement; see `PERFORMANCE.md`. | Owner to measure on real hardware |
| F4 | Info | Hidden-tab pause is verified with an emulated `visibilitychange`; a real tab switch and window blur on a physical browser are not yet verified. `src/game/clock.ts` only pauses on `hidden`, not on plain blur. | A1 decides |

## Browser QA reported by A0 (not executed by A7)

A0 reported a manual browser QA pass on `656af1d` in desktop Chrome that verified the full loop, hint pricing, penalties, collision/bounds, settings persistence and best-time persistence. A7 did not run or observe that pass and holds no recording, device details or tester count for it; this entry only relays A0's report. Evidence and details belong in A0's record (`docs/status/A0.md` / `docs/RELEASE_RECORD.md`).

## Not yet executed

These rows of the manual acceptance matrix in `docs/QA_AND_PLAYTEST.md` have **not** been run by A7 (A0's browser pass above covers some of them; see A0's record): all six trials end to end in the browser (only `icons` is automated end to end; the first target of `twin-capitals`, `bay-and-forum` and `wall-and-bay` is collected in the browser, and every target of every trial is reached in the Node-side route simulation), wrong-city exploration, restart during travel, load failure, slow frame / tunnelling, corners/river/bridges, retry ×10 / travel ×10 leak check, resize/fullscreen, mute/reduced motion, touch, corrupt/blocked storage, actual itch iframe, signed-out visitor, a second real browser, any real phone, any real-GPU frame timing, and the three human playtests (T1/T2/T3). Human playtest count so far: **0**.
