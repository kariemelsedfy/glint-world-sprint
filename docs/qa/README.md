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

- Base commit `47d365bdd6b1bdbe87f203e868cf769b25a01dbc` (`main`) plus the A7 branch changes (tests, scripts, docs only; no game source changed).
- macOS 26.5.2 on an Apple M4 virtual machine (8 vCPU, 16 GiB), no GPU exposed to the browser.
- Node v24.20.0, npm 10.8.3, Playwright 1.49.1, bundled Chromium 131.0.6778.33, headless.
- WebGL through SwiftShader (`--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader`, from `playwright.config.ts`). Reported renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0)), SwiftShader driver)`.
- Playwright `Desktop Chrome` device profile: 1280×720 viewport, DPR 1 (its user agent string claims Windows; the host is macOS).
- Served by `vite preview` on `http://127.0.0.1:4173` from the production build, never `file://`.
- Run date: 2026-09-26 (UTC).

## Automated end-to-end coverage (`npm run test:e2e`)

All tests drive the production build with real keyboard/mouse input. There are no test-only hooks in the game and the tests never read or write the Zustand store. Player position is read from the in-game map marker; objective positions come from the real `resolveObjectives` via `tests/e2e/support/print-objectives.ts` (run through `vite-node`), so the tests follow content changes instead of hard-coding coordinates. Walking uses arrow keys and a small route planner (`tests/e2e/support/game.ts`) around the city blockers.

| Spec / test | What it proves |
|---|---|
| `smoke.spec.ts` — boots into the menu | Menu renders over a sized canvas with no page errors (A0 bootstrap test, kept) |
| `smoke.spec.ts` — menu → briefing → globe → Paris | Basic travel wiring (A0 bootstrap test, kept) |
| `loop.spec.ts` — full loop | Menu → Briefing → Go → globe → fly to city 1 (+5 s entry) → map shows one search zone → walk to and collect objective 1 → map shows no remaining zone → back to globe (no exit charge) → fly to city 2 (+5 s) → collect → results. Results breakdown: hints 0, travel 10 s, adjusted = active + hints + travel (±0.3 s display rounding), not practice. Local best stored in `localStorage` (`glint:v1`) and equal to the shown adjusted time. Retry returns to a clean briefing and a fresh run (0 penalty, clock reset, no practice tag, no struck-through objectives). After a page reload the stored best is unchanged; a second, paused (practice) completion does not overwrite it. No page errors during the whole run. Covers Paris→Giza travel for the `icons` trial. |
| `rules.spec.ts` — entry penalty | +5 s on each arrival, 0 on exit, +5 s again on a revisit of the same city, cumulative 15 s after three arrivals |
| `rules.spec.ts` — hint tiers + map | Tier 1 bought on the globe costs 10 s and the button then names tier 2's price; map before tier 2 shows one broad region with the contract radius and no proper landmark name; with the map open the clock keeps running (≥1 s over 1.5 s) and held movement keys do not move the player; tier 2 adds 20 s, narrows the region and reveals the landmark name; tier 3 adds 35 s, shows the fine radius and removes the hint button (total 65 s + 5 s entry) |
| `rules.spec.ts` — hint double-click | A double-click never skips a tier and never charges more than tiers 1+2. **Observed: 30 000 ms — a double-click buys tiers 1 and 2** (see findings) |
| `rules.spec.ts` — pause / hidden tab mid-travel | Starting a flight, then hiding the tab (emulated `visibilitychange` → `hidden`) shows the Paused overlay; the flight holds for 3 s without landing; after showing the tab and Resume it lands, the run is tagged practice and exactly one 5 s entry penalty is charged; a manual Pause freezes the displayed clock for 1.5 s |
| `fallback.spec.ts` — no WebGL | With `--disable-webgl --disable-3d-apis` the page shows the error boundary ("Something went wrong" + "Reload GLINT") rather than a blank page |
| `perf.spec.ts` | Measurement pass (see `PERFORMANCE.md`); sanity assertions only. A second test measuring without the SwiftShader flags is skipped unless `PERF_GPU=1` |

E2E helpers are type-checked on their own with `npx tsc -p tests/e2e` (strict, no `any`).

### Executed runs

| When (UTC) | Command | Result |
|---|---|---|
| 2026-09-26 ~11:47 | `npm run typecheck && npm test && npm run test:e2e && npm run package:itch && npm run check:release` | typecheck ok; unit 10/10; e2e 9 passed, 1 skipped (`PERF_GPU` variant) in 1.5 min; package ok; release check passed |
| 2026-09-26 | `npm run build` | ok — see `PERFORMANCE.md` |
| 2026-09-26 | `PERF_GPU=1 npx playwright test tests/e2e/perf.spec.ts` | SwiftShader test passed; hardware-GL test failed: this VM has no GPU, Chromium cannot create any WebGL context without SwiftShader, and the game shows its error screen |
| 2026-09-26 | Negative release check (tampered ZIP) | Failed as intended with 9 findings — see `RELEASE_CHECKS.md` |

## Findings

| # | Severity (QA plan scale) | Finding | Owner |
|---|---|---|---|
| F1 | P1 | Double-clicking a hint button buys two tiers (observed +30 s). The store correctly refuses to skip tiers, but the button relabels to the next tier under the cursor, so the second click is a valid purchase. The QA plan expects "exactly one tier/cost at a time" for a rapid double-click. Suggested fix: short purchase cooldown or confirmation in the hint button, not in the store. | A5 (UI) / A1 |
| F2 | P2 | Without WebGL the player sees the generic crash screen ("Something went wrong — Error creating WebGL context."), which is recoverable but not the "useful compatibility message" the QA plan asks for. | A0 / A5 |
| F3 | Info | Paris frame time p95 is 33.4 ms under SwiftShader (software rendering), above the 25 ms desktop target. This is not a real-device measurement; see `PERFORMANCE.md`. | A3/A4 to re-measure on real hardware |
| F4 | Info | Hidden-tab pause is verified with an emulated `visibilitychange`; a real tab switch and window blur on a physical browser are not yet verified. `src/game/clock.ts` only pauses on `hidden`, not on plain blur. | A1 decides |

## Not yet executed

These rows of the manual acceptance matrix in `docs/QA_AND_PLAYTEST.md` have **not** been run by A7: all three trials end to end (only `icons` is automated; `sky-sun` and `small-wonders` are not), wrong-city exploration, restart during travel, load failure, slow frame / tunnelling, corners/river/bridges, retry ×10 / travel ×10 leak check, resize/fullscreen, mute/reduced motion, touch, corrupt/blocked storage, actual itch iframe, signed-out visitor, a second real browser, any real phone, any real-GPU frame timing, and the three human playtests (T1/T2/T3). Human playtest count so far: **0**.
