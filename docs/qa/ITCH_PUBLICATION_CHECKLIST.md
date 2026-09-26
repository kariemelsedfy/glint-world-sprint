# itch.io publication checklist

For the owner / A0 at release time. A7 has **not** uploaded anything to itch.io and has not published or submitted the game. Tick items only after doing them; record the values in `docs/RELEASE_RECORD.md`.

## 1. Build the candidate from a clean checkout

- [ ] `git status` clean on the chosen commit; note the full SHA.
- [ ] `npm ci`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npx playwright install chromium` (first time only), then `npm run test:e2e` — all pass, only the `PERF_GPU` test skipped.
- [ ] `npm run build`
- [ ] `npm run package:itch` — note file count, size and SHA-256; manifest shows the commit and `dirtyWorkingTree: false`.
- [ ] `npm run check:release` — "Release check passed." with no unexpected `note:` lines (an external URL note means the game fetches something from the network: justify or remove it).
- [ ] Keep the previous known-good ZIP and its manifest until the new one is verified on itch.

## 2. Local production check

- [ ] `npm run preview`, open `http://127.0.0.1:4173` in a normal desktop Chrome (not headless, real GPU).
- [ ] Play every shipped trial once with real controls: Icons, Sky & Sun, Small Wonders. Buy at least one hint; open the map; pause once and confirm the practice tag; Retry.
- [ ] DevTools Network: no failed requests, no requests to other origins.
- [ ] DevTools Console: no errors.
- [ ] Record a 30 s frame-time sample per city on this real device (method in `PERFORMANCE.md`).

## 3. Upload

- [ ] itch.io → Create new project (or edit the draft). Kind of project: **HTML**.
- [ ] Pricing: **No payments** (free).
- [ ] Upload `release/glint-world-sprint-itch.zip`; tick **This file will be played in the browser**.
- [ ] Embed options: viewport about **1280 × 720**, **Fullscreen button** on, "Automatically start on page load" off unless tested. Only tick **Mobile friendly** after testing on a real phone in landscape.
- [ ] Title, short description and controls from the copy in `docs/RELEASE_AND_SUBMISSION.md`, with every sentence about unshipped features deleted.
- [ ] Cover image and 2–3 screenshots taken from the real build (no mock-ups).
- [ ] Link to the public GitHub repository.
- [ ] Save as **Draft**, open the draft page and test it (section 4) before publishing.

## 4. Verify on itch (draft, then public)

- [ ] Game loads inside the itch iframe; menu appears; no blank canvas.
- [ ] Keyboard focus: click into the game, arrow keys / WASD move the player, the page does not scroll.
- [ ] Full run of one trial to results; Retry works; reload the page and the local best is still shown.
- [ ] Fullscreen enter/exit: canvas resizes, UI readable, run not reset.
- [ ] Mute/sound behaves as described (if audio ships).
- [ ] Switch tabs mid-run: game pauses and marks the run practice.
- [ ] Set visibility to **Public**. Open the public page in a private/incognito window, signed out, and play again.
- [ ] Open the GitHub link signed out: repository is public, README setup works, lockfile and assets present.

## 5. Security before going public

- [ ] `npm run check:release` passed on the exact uploaded ZIP (it scans the ZIP and all tracked files).
- [ ] Git history reviewed for credentials (for example `git log -p --all` through a secret scanner, or GitHub secret scanning once public). The A7 pattern scan of the history as of `47d365b` is in `EVALUATION_AND_PROVENANCE.md`; repeat it on the release commit.
- [ ] No `.env`, keys, raw exports, browser profiles, private screenshots or session logs are tracked.
- [ ] Screenshots and provenance evidence contain no tokens, private account URLs or personal data.

## 6. Record and submit

- [ ] Fill `docs/RELEASE_RECORD.md`: itch URL, GitHub URL, commit/tag, ZIP name/bytes/SHA-256 (from the manifest of the uploaded ZIP), build time, Node/npm, devices and browsers actually used, frame-time results, known issues.
- [ ] Tag the commit (suggested `v0.1.0-hackathon`) — A0 only.
- [ ] Complete the organizer opt-in / submission form; save the confirmation.
- [ ] If a fix is needed after upload: new commit → full section 1 → upload → update the record. Never demo a build that differs from the submitted source.

## itch.io HTML5 limits to stay under

1 000 files, 500 MB extracted, 200 MB per file, 240-character paths, case-sensitive names. `check:release` enforces the path length and a much smaller budget (500 files, 10 MiB per file, 25 MiB ZIP). Confirm current limits against the official itch.io HTML5 documentation linked in `docs/TOOLS_AND_SOURCES.md`.
