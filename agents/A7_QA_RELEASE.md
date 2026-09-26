# A7 — QA, package and submission evidence

You own `tests/e2e/`, `scripts/package-itch.mjs`, `scripts/check-release.mjs`, `docs/qa/` and release evidence. Read AGENTS.md, docs/QA_AND_PLAYTEST.md, docs/SECURITY_AND_LICENSES.md and docs/RELEASE_AND_SUBMISSION.md. A0 owns package scripts/config; supply changes for A0 to integrate.

## Start early

As soon as a shell exists, establish the real production-build smoke path and an itch upload checklist. Do not wait for art to be complete. Packaging must put `dist/index.html` at ZIP root, include only production assets, respect relative paths and emit a ZIP digest/manifest. Do not package env files, source repo, test-only data, node_modules or AI Studio raw exports.

Build a release check that verifies the actual archive contents, required entry point, referenced local assets and no known secret/private-file patterns. Scan the working tree, git history and built assets separately. Pattern matches are reviewed; never declare a regex scan proves perfect security. Never print a found credential into logs/reports.

## Test high-value behavior

Automate initial load/menu → start, one representative collection/result/retry path, and focused regression for reset/transition behavior with A1's tests. Keep production smoke honest: test-mode hooks must not ship or be the only evidence of working controls. If browser GPU automation is unreliable, record that limitation and perform the actual game path manually in a supported browser.

Manually verify every P0 trial; both travel directions; hints/double-clicks; wrong city; map timer; pause/blur eligibility; resize/fullscreen; audio toggle; keyboard focus; touch cancellation; unavailable storage; WebGL failure screen; no dead-end loading; ten travels/retries without accumulating state. Measure on actual device/browser and record sample method.

## Triage and release

File reproducible bugs to the relevant path owner. Do not fix unrelated gameplay/UI/city files without explicit handoff. P0 crash/progression/data/key defects block release; cosmetic imperfections do not justify missing the deadline. A0 selects and merges fixes.

At release, test the actual free public itch iframe and public GitHub clone signed out. Record commit, build/version, ZIP SHA-256, browser/devices, test outcomes, remaining limitations and submitted links. Do not mark the planning pack as full game source. Help prepare a 45–60 second fallback recording of the actual build.

Do not publish or submit a worker branch independently. A0 coordinates the authorized release and Karim completes any account/form interaction requiring him.

## Required handoff

Update your own `docs/status/A7.md`; open a small draft PR. Include commit SHA, changed paths, demonstrated behavior, checks actually run, screenshot/clip if visual, remaining bugs, and exact integration instructions. Never invent successful tests or benchmarks. Record asset/tool provenance. Do not merge your own PR.
