# Performance measurements (integrated build)

## Five-city `main` @ `0235448` (current)

Measured 2026-09-26 ~17:09 UTC, same VM and method as below except the host was busier (load ~15 on 12 vCPU reported by the browser; other VM services running, no artificial load). One run only. SwiftShader software WebGL, **not** a device benchmark.

| Item | Measured |
|---|---|
| JS (single chunk) | 1,188,860 B raw, 337,002 B gzip (default level); `check:release`: 1.13 MiB raw, 328.1 KiB gzip -9 vs 1.46 MiB / 400 KiB budget |
| CSS | 59,713 B raw, 11,249 B gzip; `check:release`: 10.9 KiB gzip -9 vs 40 KiB budget |
| Other assets | Anton font 170,812 B; 12 collectible photos (JPEG) 27,484–90,687 B each, 772,854 B total |
| ZIP | 1,194,651 B (1.14 MiB), 16 files, `index.html` at root; SHA-256 `631c3b32fc762961c6142bd42993d9a03006dbc2aa113963026aa1923528f729` (manifest commit `a727f58`, clean tree; digest changes on every rebuild) |
| Menu ready | 889 ms local preview (DCL 53 ms); 1,454 ms throttled 9 Mbit/s / 60 ms RTT (DCL 792 ms); 520,700 B transferred |

| Scene | Frames / 5 s | Mean | Median | p95 | Max | Mean FPS | >25 ms | >40 ms |
|---|---|---|---|---|---|---|---|---|
| Menu | 298 | 16.83 ms | 16.7 ms | 16.8 ms | 66.6 ms | 59.4 | 1 | 1 |
| Globe | 301 | 16.67 ms | 16.7 ms | 16.7 ms | 16.8 ms | 60.0 | 0 | 0 |
| Paris | 131 | 38.42 ms | 33.4 ms | 66.6 ms | 133.4 ms | 26.0 | 110 | 47 |

Reading: menu and globe hold 60 Hz under SwiftShader on this run; Paris is the expensive scene at ~26 fps with p95 66.6 ms, well above the 25 ms desktop target in software rendering (A0 measured 1.67 fps on a busier box). Rome, San Francisco, Berlin and Giza are not sampled by `perf.spec.ts`. Real-GPU numbers are still required (below).

## Earlier: `main` @ `656af1d` (superseded)

The rest of this page was measured on 2026-09-26 against integrated `main` @ `656af1d` (A5 production UI plus the A2 globe, A3 Paris and A4 Giza performance passes). The A7 branch that recorded these numbers changes only `tests/e2e/` and `docs/qa/`, so the measured game is `656af1d` unmodified. Environment as in `README.md`: headless Chromium 131 with **SwiftShader software WebGL** on a GPU-less Apple M4 VM, 1280×720, DPR 1, default settings (`quality: 'standard'`). These are automated software-rendering numbers, **not** a real-device benchmark.

The earlier graybox numbers (base `47d365b`: JS 995.88 kB, ZIP 277.3 KiB, median 16.7 ms everywhere) are superseded by this page; they are kept in git history only.

## Bundle (`npm run build`, Vite 6.0.7)

| File | Raw | gzip (Vite report) |
|---|---|---|
| `index.html` | 0.47 kB | 0.30 kB |
| `assets/index-*.css` | 44.62 kB | 8.65 kB |
| `assets/index-*.js` (single chunk) | 1,091.48 kB | 303.26 kB |

`check:release` reports the same JS as 1.04 MiB raw / 295.3 KiB at gzip level 9 (its own gzip level; KiB/MiB = 1024-based) and CSS as 8.4 KiB gzip -9, against budgets of 1.46 MiB (1 500 KiB) raw / 400 KiB gzip for JS and 40 KiB gzip for CSS. Vite still warns the chunk is above 500 kB; there is no code splitting.

## Release ZIP (`npm run package:itch` + `npm run check:release`)

| Value | Measured |
|---|---|
| Size | 312 637 bytes (305.3 KiB) |
| Entries | 3 files: `index.html` (474 B) at root, `assets/index-*.js` (1 091 545 B), `assets/index-*.css` (44 617 B); 1 136 636 B uncompressed |
| SHA-256 (this run) | `94379e96c70faa659e8df62a8235c7c1782d8dbddb591418d924a4897495e4c7` |
| `check:release` | Passed: ZIP 305.3 KiB (3 files) vs 25 MiB budget; 3 text files in the ZIP and 173 tracked source files scanned, no findings |

The digest identifies this local test archive only (manifest commit `656af1d`, `dirty tree` because the A7 test changes were uncommitted at the time). ZIP entries carry modification times, so every rebuild changes the digest; take the release digest from the manifest of the ZIP actually uploaded.

## Load time (`tests/e2e/perf.spec.ts`)

"Menu ready" = navigation start until the `GLINT World Sprint` heading exists and the canvas has a non-zero size (polled every animation frame). Browser cache disabled via CDP. Transferred: 313 278 bytes for the full page.

| Network | Run 1 (14:06 UTC) | Run 2 (14:07 UTC) |
|---|---|---|
| Local preview, no throttle | 365 ms (DCL 37 ms) | 1 586 ms (DCL 42 ms) |
| Throttled: 9 Mbit/s down, 1.5 Mbit/s up, 60 ms RTT (CDP emulation) | 1 031 ms (DCL 689 ms) | 946 ms (DCL 621 ms) |

DOMContentLoaded is fast in every run; the spread in "menu ready" is the first WebGL frames under SwiftShader (shader compile on the CPU), which also explains why run 2's unthrottled figure is slower than its throttled one. All values are under the 5 s menu-ready goal, but a loopback server is not the itch CDN; re-check on the real itch page.

## Frame timing (`tests/e2e/perf.spec.ts`)

Method: `requestAnimationFrame` deltas, 1 s of wall-clock warm-up dropped, then 5 s per scene, idle (no input). Scenes: menu (globe behind the menu), globe after `Go` on `icons`, Paris after arrival. Giza, walking, pickups and travel are not sampled. Host load average during both runs was about 5 on 8 vCPU (other VM services running; no artificial load).

| Scene | Run | Frames | Mean | Median | p95 | Max | Mean FPS | >25 ms | >40 ms |
|---|---|---|---|---|---|---|---|---|---|
| Menu | 1 | 254 | 19.75 ms | 16.7 ms | 33.4 ms | 50.0 ms | 50.6 | 46 | 1 |
| Menu | 2 | 254 | 19.82 ms | 16.7 ms | 33.4 ms | 33.4 ms | 50.5 | 48 | 0 |
| Globe | 1 | 274 | 18.31 ms | 16.7 ms | 33.3 ms | 33.4 ms | 54.6 | 27 | 0 |
| Globe | 2 | 275 | 18.24 ms | 16.7 ms | 33.3 ms | 33.4 ms | 54.8 | 26 | 0 |
| Paris | 1 | 200 | 25.17 ms | 33.2 ms | 33.4 ms | 50.0 ms | 39.7 | 101 | 1 |
| Paris | 2 | 201 | 24.96 ms | 16.8 ms | 33.4 ms | 50.0 ms | 40.1 | 99 | 1 |

Reading: under SwiftShader the menu and globe mostly hold 60 Hz with roughly one frame in ten missing a vsync; Paris runs at about 40 fps, alternating 16.7 ms and 33.3 ms frames (its median sits on the boundary, hence 33.2 ms in one run and 16.8 ms in the other). Every scene's p95 is one missed vsync (33.3–33.4 ms), above the 25 ms desktop target **in software rendering**. This is CPU rasterisation on a GPU-less VM, not how the game runs on a GPU.

### Same measurement under host load

SwiftShader numbers depend heavily on what else the host is doing. On the same commit and VM:

| Condition | Menu | Globe | Paris |
|---|---|---|---|
| Idle-ish (load ~5), runs above | 50.5–50.6 fps | 54.6–54.8 fps | 39.7–40.1 fps |
| 4 extra `yes` CPU hogs (load ~10) | 29.6 fps, p95 50 ms | 31.5 fps, p95 50 ms | 25.0 fps, p95 50.1 ms |
| 6 extra `yes` CPU hogs (load ~13) | 18.9 fps, p95 66.7 ms | 19.8 fps, p95 66.7 ms | 16.3 fps, p95 66.8 ms |

A0 reported ~2–5 fps for the same scenes on a busier box. None of these rows is a device benchmark; they show why the perf test records SwiftShader timing instead of asserting a frame rate (its only assertion is at least 5 frames per 5 s scene, i.e. the scene is not frozen).

## Hardware GL attempt

`PERF_GPU=1` runs the same measurement in a Chromium launched without the SwiftShader flags. On this VM Chromium cannot create any WebGL context without SwiftShader, so no hardware-GL numbers exist (not re-run on `656af1d`; the VM has not changed).

## Still required (not done)

- Real desktop GPU: Chrome, 1280×720 and fullscreen, 30 s walking + pickup in each city and one travel, median/p95, draw calls/triangles (`renderer.info`).
- Real phone in landscape if mobile is claimed.
- Load on the actual itch page from a clean browser profile.

## Reproduce

```bash
npm ci && npx playwright install chromium
npx playwright test tests/e2e/perf.spec.ts     # writes test-results/perf/swiftshader.json
PERF_GPU=1 npx playwright test tests/e2e/perf.spec.ts   # adds hardware-gl.json where a GPU exists
npm run build && npm run package:itch && npm run check:release
```
