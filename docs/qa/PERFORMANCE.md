# Performance measurements (graybox build)

Measured on 2026-09-26 against base `47d365b` (A7 changes touch no game source). Environment as in `README.md`: headless Chromium 131 with **SwiftShader software WebGL** on a GPU-less Apple M4 VM, 1280×720, DPR 1, default settings (`quality: 'standard'`, DPR range [1, 1.5]). These are automated software-rendering numbers, **not** a real-device benchmark.

## Bundle (`npm run build`, Vite 6.0.7)

| File | Raw | gzip (Vite report) |
|---|---|---|
| `index.html` | 0.47 kB | 0.30 kB |
| `assets/index-*.css` | 39.89 kB | 7.53 kB |
| `assets/index-*.js` (single chunk) | 995.88 kB | 275.76 kB |

`check:release` reports the same JS as 972.6 KiB raw / 268.5 KiB at gzip level 9 (KiB = 1024 bytes; its own gzip level), against budgets of 1 500 KiB raw / 400 KiB gzip. Vite warns the chunk is above 500 kB; splitting was deferred by A0 until real art lands.

## Release ZIP (`npm run package:itch`)

| Value | Measured |
|---|---|
| Size | 283 990 bytes (277.3 KiB) |
| Entries | 3 files (`index.html`, one JS, one CSS); `index.html` at root |
| SHA-256 (this run) | `7a3cfca114404a3a735d1d9d8480e8c8e8ceb5776161c4b51044b4815eb31f2f` |
| Budget | 25 MiB (QA target); itch limits are 1 000 files / 200 MB per file / 240-char paths |

The digest identifies this local test archive only. ZIP entries carry file modification times, so a rebuild produces a different digest; the release digest must be taken from the candidate A0 actually uploads (the manifest `release/glint-world-sprint-itch.manifest.json` records it with the commit).

## Load time (`tests/e2e/perf.spec.ts`)

"Menu ready" = navigation start until the `GLINT World Sprint` heading exists and the canvas has a non-zero size (polled every animation frame). Browser cache disabled via CDP. Transferred: 284 665 bytes for the full page.

| Network | Run 1 (11:45 UTC) | Run 2 (11:47 UTC) |
|---|---|---|
| Local preview, no throttle | 387 ms (DCL 38 ms) | 75 ms (DCL 35 ms) |
| Throttled: 9 Mbit/s down, 1.5 Mbit/s up, 60 ms RTT (CDP emulation) | 528 ms (DCL 455 ms) | 569 ms (DCL 487 ms) |

Both are far under the 5 s menu-ready goal, but a loopback server with emulated throttling is not a real network or the itch CDN; re-check on the real itch page.

## Frame timing (`tests/e2e/perf.spec.ts`)

Method: `requestAnimationFrame` deltas, 30 warm-up frames dropped, then 5 s per scene, idle (no input). Scenes: menu (globe behind the menu), globe after `Go` on `icons`, Paris after arrival. Giza, walking, pickups and travel were not sampled.

| Scene | Run | Frames | Median | p95 | Max | Mean FPS | >25 ms | >40 ms |
|---|---|---|---|---|---|---|---|---|
| Menu | 1 | 302 | 16.7 ms | 16.7 ms | 16.8 ms | 60.0 | 0 | 0 |
| Menu | 2 | 302 | 16.7 ms | 16.7 ms | 16.8 ms | 60.0 | 0 | 0 |
| Globe | 1 | 302 | 16.7 ms | 16.8 ms | 16.8 ms | 60.0 | 0 | 0 |
| Globe | 2 | 301 | 16.7 ms | 16.7 ms | 33.3 ms | 59.8 | 1 | 0 |
| Paris | 1 | 266 | 16.7 ms | 33.3 ms | 33.4 ms | 52.9 | 36 | 0 |
| Paris | 2 | 251 | 16.7 ms | 33.4 ms | 33.5 ms | 49.9 | 51 | 0 |

Reading: menu and globe hold 60 Hz even in software. The Paris graybox drops about one frame in six to seven (every slow frame is one missed vsync, 33 ms) so its p95 misses the 25 ms desktop target **under SwiftShader**. That says the city scene is CPU-rasterisation-bound here, not how it runs on a GPU. A real-device measurement is still required (see below).

## Hardware GL attempt

`PERF_GPU=1` runs the same measurement in a Chromium launched without the SwiftShader flags. On this VM Chromium could not create any WebGL context (`VENDOR = 0xffff`), so the game showed its error screen and the test failed. No hardware-GL numbers exist yet.

## Still required (not done)

- Real desktop GPU: Chrome, 1280×720 and fullscreen, 30 s walking + pickup in each city and one travel, median/p95, draw calls/triangles (`renderer.info`).
- Real phone in landscape if mobile is claimed.
- Load on the actual itch page from a clean browser profile.
- Re-run all of the above after A3/A4 art lands; the graybox numbers will not hold.

## Reproduce

```bash
npm ci && npx playwright install chromium
npx playwright test tests/e2e/perf.spec.ts     # writes test-results/perf/swiftshader.json
PERF_GPU=1 npx playwright test tests/e2e/perf.spec.ts   # adds hardware-gl.json where a GPU exists
npm run build && npm run package:itch && npm run check:release
```
