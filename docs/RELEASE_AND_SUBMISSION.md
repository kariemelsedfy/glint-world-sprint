# Release and submission runbook

## What is required, and what is merely planned

User-provided competition requirements: a **free game on itch.io**, **public GitHub full source**, **comprehensive setup README**, documentation of APIs/frameworks/tools, and enough technical detail for jury evaluation. Stage 1 judges performance, execution, novelty and stickiness; five finalists present for five minutes and three winners are selected. Do not add invented official requirements or weights.

Public event schedule: competition opt-in at 19:00 Paris; demos at 20:00. Confirm the exact submission form, build cutoff, allowed update policy and any sponsor-specific requirement with organizers. Complete opt-in early if possible. Our public-release target is 18:30 or earlier if the actual cutoff requires it.

## Repository setup

Suggested new public repository: `glint-world-sprint`, owned by Karim or his chosen organization. No project remote has been established by this planning pack. Do not use an unrelated accessible repository.

If uploading this pack manually, unzip and place its contents at repository root. Create the public repo through GitHub or an already-authorized CLI, then commit the files. A0 can perform the setup in Devin once it has repository access. If starting from the included git bundle, clone it locally, then **replace the local bundle origin** with the new GitHub remote before pushing.

Example for a fresh folder (replace placeholders; do not run against an existing nonempty repo blindly):

```bash
git init -b main
git add .
git commit -m "docs: define GLINT game and agent build plan"
git remote add origin https://github.com/YOUR_OWNER/glint-world-sprint.git
git push -u origin main
```

If the repo already has a README/license, integrate intentionally instead of overwriting or force-pushing. Give Devin access to the exact repository. Keep it public for submission. Later source commits must include the actual implemented game and local assets, not only this plan.

## Build procedure A0/A7 must implement

From a clean checkout of the chosen release commit:

```bash
npm ci
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run package:itch
npm run check:release
npm run preview
```

These commands are planned script names until A0 creates them. The final README must use commands that actually work. Build output is `dist`; `package:itch` creates `release/glint-world-sprint-itch.zip` from its contents and `check:release` verifies it. The package script must fail on missing index/assets and report the archive's SHA-256. Do not put a `dist/` wrapper folder around the entry point.

Vite config uses `base: './'`; all local resources must resolve relative to the packaged build. Do not test by double-clicking `index.html` under `file://`; use an HTTP preview and then itch's real iframe. No server-only AI Studio code, node_modules, env files or source-only references in the ZIP.

## itch.io procedure

1. Create/edit a project; choose HTML game and a free price configuration.
2. Upload the production ZIP with `index.html` at its root; enable playing that upload in the browser.
3. Configure an approximately 1280×720 embedded game with fullscreen available; test responsive resize. Mark mobile-friendly only after actual mobile verification.
4. Use the real game's screenshot as cover, two or three clear screenshots, the short copy below, controls and the public source link.
5. Test the draft build promptly. Publish the finished page as public before the real cutoff.
6. Visit the public page signed out/in a private window. Play a full trial, try retry/fullscreen/sound, and check that the source link opens without permission requests.

Official HTML5 guidance currently limits archives to 1,000 extracted files, 500 MB total extracted, 200 MB per file and 240 characters per file path. Our much smaller performance budget should stay far below these. Filenames are case-sensitive. See the official source in TOOLS_AND_SOURCES.md; confirm upload success rather than relying solely on a local check.

## Submission checklist

- [ ] Public free itch.io URL works signed out; exact uploaded artifact recorded.
- [ ] Public GitHub URL works signed out and includes all source, local assets and lockfile.
- [ ] README has real prerequisites, install/dev/build/preview steps, controls and known limitations.
- [ ] Architecture, content/hint/scoring rules and tooling/API inventory match implementation.
- [ ] Actual AI Studio and Devin contributions documented with sanitized evidence and commit links.
- [ ] Asset origins, licenses and required attributions recorded; original code license included.
- [ ] Working tree/history/bundle/ZIP secret review completed with no unresolved leak.
- [ ] All shipped levels tested in production; real device performance documented without invented claims.
- [ ] No pending placeholders are presented as shipped features or measured results.
- [ ] Final commit/tag and ZIP digest entered in RELEASE_RECORD.md.
- [ ] Organizer opt-in and submission form completed, with exact URLs/confirmation saved.
- [ ] Five-minute demo rehearsed and local video backup available.

A0 tags the chosen implementation commit (suggested `v0.1.0-hackathon`) after checks. Preserve the last known-good ZIP. If fixing a blocker after candidate upload, build from a new explicit commit, rerun affected checks, upload the new ZIP and update the record; follow the organizer's update policy. Never silently demo code that differs materially from submitted source.

## Ready-to-use itch copy — matches the shipped five-city build

**Title:** GLINT — World Sprint

**Tagline:** See the clue. Find the place. Beat the clock.

**Description:**

You are never told where to go. You are shown a picture of an object — a golden laurel wreath, a cable-car model, a blue scarab — and you have to work out which city it belongs to.

Spin a cartoon 3D globe, fly to the city you think is right, explore it on foot and grab the treasure before the clock beats you. Landing in the wrong city costs you five seconds. Hints cost ten, twenty or thirty-five. Your best time is yours to beat.

Five cities — Paris, Giza, Rome, San Francisco, Berlin. Twelve objects. Six expeditions. Every placement is deterministic, so every run is comparable.

**Controls:** WASD / arrow keys to move, MAP for the city map, Escape to pause, HINT to buy a clue, GLOBE to leave the city. On landscape touch devices, use the thumbstick and on-screen buttons. Walk into a treasure to collect it.

Hints add time penalties. A paused run counts as practice and does not set a best. Best times are stored in your browser only — no account, no server, no tracking. Cities and collectibles are playful fictionalized miniatures.

Built during the Tech: Europe AI Gaming Hack with AI-assisted development (Devin, Google AI Studio). Full source and technical documentation: https://github.com/kariemelsedfy/glint-world-sprint

**Page settings:** Kind of project **HTML**, pricing **No payments / free**, viewport **1280×720**, **Click to launch in fullscreen** enabled, **Mobile friendly** left off unless you verify it on a phone, Genre **Adventure**, Tags `3d`, `browser`, `exploration`, `speedrun`, `geography`, `webgl`.
