# Public-source and secret-handling rules

## Baseline threat model

The game is a public static bundle. Anyone can read its source, assets, hidden-object coordinates and local score storage. It contains no protected API credential and makes no authoritative global leaderboard claim. Minification is not secret protection.

The real risks during this hackathon are accidentally committing service credentials, exporting a server-dependent AI Studio app as browser code, bundling private logs/screenshots, or publishing third-party assets without a usable license record.

## Required controls

- Gemini, Devin, GitHub and itch.io credentials stay in their approved service auth/secrets systems. Never paste them into agent prompts that will be committed or include them in recordings.
- P0 needs **no `.env` values at runtime**. `.env.example` explicitly says so. A Vite `VITE_*` value is client-visible configuration; never put a secret there. Audit build-time `define` substitutions as well as direct source references.
- Do not copy AI Studio's complete server/env export into the static game. Extract the approved UI/content. No long-lived Gemini key in a browser, even if a tool generated that pattern.
- Review `git diff --cached` before commit; scan working tree, history, production bundle and final ZIP. Review suspicious values without printing them into a shared log. Enable available GitHub push protection/secret alerts as an additional layer.
- Keep raw exports, personal logs, tokens, cookie jars, browser profiles and private screenshots out of git. Sanitize AI provenance evidence before making it public.
- `.gitignore` reduces mistakes but does not remove already tracked files or old history. If a key was exposed, revoke/rotate it immediately, remove it from current files, review history/artifacts with the owner, and rebuild. Deleting the latest line is not enough.
- Public project identifiers/URLs are not authentication secrets, but avoid publishing account-specific workspace links unless needed and approved. Generic tool links are sufficient for jury documentation.

## Repository and artifact contents

Commit the full implementation, dependency lockfile, local redistributable assets, scripts, README, technical docs and provenance. Do not ship only minified `dist` or a generated screenshot and call it full source. Release ZIP contains production outputs only; public repository contains reproducible source.

Root source maps are not a security boundary: assume all client code is readable. Omitting them from the itch ZIP is fine for size/noise but cannot make embedded keys safe. Exclude private configs and raw AI output backups regardless of source-map policy.

No analytics/network collection is required. If adding any telemetry later, document what is sent and its purpose; do not silently add it through a generated template. In the hackathon build, anonymous manual playtest notes are sufficient.

## Original and third-party assets

The supplied LICENSE uses MIT for original project code/documentation. A public repo needs an explicit license to communicate reuse rights; it does not automatically turn every included asset into MIT material. Record each future image, model, audio clip, font and texture in ASSET_PROVENANCE.md with its origin, creator, license/terms source, modifications and attribution requirements.

Default to original procedural shapes, original SVGs and synthesized sounds. For outside assets, verify permission to redistribute the asset with public source and game builds. “Free download” alone is not a license. Preserve required notices and do not relabel third-party work as original.

For AI-generated material, record the service, generation date, prompt reference, actual output and applicable usage terms checked at creation. Do not assert an unverified copyright or exclusivity guarantee. Avoid Google Earth tiles, arbitrary museum photos, extracted commercial game models, copied logos or music. Recognizable simplified geometry and original fictional replicas meet the art goal without a large sourcing burden.

## Pre-publication security signoff

A7 records scanner name/version, scanned commit/range/artifact, commands/method, reviewed findings and resolution. A0 checks no credential-bearing server code is needed by the game. No confirmed secret or private personal data may remain. Scanner success is evidence, not a guarantee of absolute security.

See official Vite, Google API-key and GitHub secret-scanning references in TOOLS_AND_SOURCES.md. These controls are project requirements implementing the user's request; do not misrepresent them as an independently verified full organizer policy.
