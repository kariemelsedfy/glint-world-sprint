# Google AI Studio workflow

## A substantive, safe contribution

Use the Google AI Studio project supplied by Karim for two development-time outputs:

1. **The shipped React interface:** title/briefing, clue HUD, map frame, hint purchase, results, settings and touch control presentation.
2. **Reviewed clue variations:** draft text against the six fixed object definitions, then validate and commit selected outputs as static content.

The minimum required contribution is real UI source that survives integration. A screenshot alone is not enough. Clue authoring adds a meaningful AI-assisted content pipeline, but do not claim a runtime AI director if the game uses static reviewed content.

Public Google documentation describes React web apps, source export/GitHub sync, and server-side secret handling in AI Studio. For this project, use a downloaded export as the handoff so multiple agents do not race with AI Studio's repository sync. Export only reviewed UI into the game. See the linked official source in TOOLS_AND_SOURCES.md.

## Owner steps: first 25 minutes

1. Open the user's provided AI Studio apps/project URL; verify the intended account/project in the UI. Do not copy its credentials into Devin or git.
2. Start a web app in Build mode. Attach/paste the relevant plain types from `contracts/game.ts` and [the UI prompt](../prompts/AI_STUDIO_UI.md).
3. Generate a first visual pass. Check that the game has a small HUD and a dominant scene viewport, not a dashboard of cards obscuring the world.
4. Make one focused revision: improve hierarchy, charm, world visibility and the result/retry moment. Stop after 25 minutes even if the prototype could be prettier.
5. Export source ZIP. Preserve the original privately as evidence; inspect its file list before copying. Hand A5 the source, a screenshot, and a short note on which visual direction is approved.
6. Record actual date/time, tool, displayed model if known, prompt file, output summary, and the eventual integration commit in AI_PROVENANCE.md. Do not invent the model identifier.

If AI Studio exports or account access fail, obtain a smaller generated React/CSS component or a reviewed token/theme file from the same project and integrate it. This is a fallback, and must be described honestly. Do not secretly replace all AI Studio output with unrelated work and claim the requirement was satisfied.

## Supplied export in this handoff

The downloaded AI Studio ZIP remains outside this checkout. Its inspected, selected source is preserved under [`ai-studio-export/`](../ai-studio-export/): `src/ui/` (React screens, HUD, controls, icons and CSS), `src/index.css` (Tailwind import and UI CSS import), `src/demo/` (visual/mock reference only), and `INTEGRATION.md` (exported notes, not authoritative). The original ZIP, generated `.env.example`, package/config files and app entry point were not imported. The export's `.env.example` contains a Gemini-key placeholder; the sanitized repository-root `.env.example` requires no keys.

**This is reference source, not the game scaffold.** The demo's `MiniWorldCanvas` uses a 2D canvas to imitate a globe/city and its harness uses mock timers/state. It must not become the production globe or city implementation: A2 supplies the real full-screen cartoon 3D globe; A3/A4 supply explorable 3D Paris/Giza; A0 composes one WebGL canvas behind A5's overlays. `ai-studio-export/INTEGRATION.md` shows intent, but the current `src/shared/contracts.ts` and this repository's ownership rules win over its example paths or claims.

A5 may adapt files from `ai-studio-export/src/ui/` to `src/ui/` **after** A0 establishes `CONTRACT_READY`; A5 must use A0's `UIModel` / `UIActions` adapters and not copy mock game logic. The export uses React, Tailwind utility classes and `glint.css`, and imports `@/contracts/game` from the exported snapshot; A0 must review any needed styling dependency/configuration and A5 must switch to the authoritative shared contract. Never copy the export's package manifest (it lists unused server/Gemini dependencies), env template or demo canvas into production. Maintain the pointer-events discipline, reduced-motion and touch support; verify the shipped UI against the actual 3D scenes and record retained paths in `docs/AI_PROVENANCE.md`.

## A5 integration procedure

The authoritative repository stays the game repo. AI Studio's sandbox is a design/export workspace, not an independent production application to deploy to itch.

- Review the export for env files, embedded credentials, server/API files, remote assets, arbitrary package additions and generated fake links.
- Copy only approved presentational components and styles into `src/ui/`. Namespace CSS under `.glint-ui` and share approved tokens.
- Adapt to `UIModel` and `UIActions`. Remove mock timers, scoring, random values, duplicate router/store, authentication, database, server handlers and Gemini SDK calls from runtime code.
- Replace remote images/fonts/icons with local documented assets or original SVG/CSS. No CDN runtime imports.
- Keep the UI preview harness separate from the real game. Production should not accidentally show generated sample medals, fake personal records or a fake leaderboard.
- Use actual callbacks from A0/A1 for every button. No dead buttons or `alert()` interactions in the release.
- Record exact retained files and meaningful modifications in AI_PROVENANCE.md.

Never force the entire AI Studio application skeleton onto the established Vite project. A0 alone owns package/config changes. If AI Studio needs dependencies, either extract a dependency-free version or request a specific reviewed package.

## Clue pass: about 10 minutes

Use [AI_STUDIO_CLUES.md](../prompts/AI_STUDIO_CLUES.md) with the approved content table. Ask for machine-readable JSON only. A6 validates IDs, exactly three hints, short strings, no new facts/locations, no invented assets, and no directions incompatible with ground-level sockets.

Human reviewer checks every chosen clue. Put the selected content under `src/content/`, the sanitized prompt under `docs/ai/`, and a review note with the commit reference in AI_PROVENANCE.md. This establishes the evidence chain: supplied world facts → AI draft → schema/content review → fixed deterministic runtime content.

## Runtime AI decision

**Default: none.** There is no Gemini API key in the itch.io build. Its state machines and seeded content run locally. An internet outage after game assets load cannot interrupt clue selection or scoring; this is not a claim of installable offline/PWA support.

The supplied rules do not say live inference is mandatory. Ask organizers early if a specific sponsor award imposes additional conditions. Do not infer that UI generation automatically qualifies for every prize.

If live AI is explicitly required, treat it as a separate owner-approved scope change, not a hidden feature. Keep the baseline working. A minimal optional clue remix would need a separately hosted server, server-held restricted key, rate/size limits, timeout, content validation, cache, and a static fallback; never call a long-lived secret directly from itch's browser. CORS alone does not protect a public endpoint. This is outside the committed eight-hour P0 plan and must not delay submission.
