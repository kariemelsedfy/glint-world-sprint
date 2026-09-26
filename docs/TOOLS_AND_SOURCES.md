# Tools, APIs and source register

## Status and inventory to complete at implementation

This is the intended stack, not an installed-dependency report. A0 replaces “pending” with exact lockfile versions and removes unused tools. Record every additional package/API and its purpose before release.

| Tool / API | Role | Runtime network or secret? | Version / evidence now |
|---|---|---|---|
| React / React DOM | Application and generated UI components | Bundled locally; no secret | Pending scaffold |
| TypeScript | Strict shared contracts and implementation | Build only | Pending scaffold |
| Vite | Development and static production bundling | Development/build only | Pending scaffold |
| Three.js | Scene geometry, materials, WebGL renderer | Local assets; no external API needed | Pending scaffold |
| React Three Fiber | React scene composition over Three.js | Bundled locally | Pending compatible version selection |
| Zustand | Discrete run/settings state | Local | Pending scaffold |
| Vitest | Focused rule/content tests | Development only | Pending scaffold |
| Playwright | Browser smoke automation | Development only | Pending scaffold |
| WebGL / requestAnimationFrame | Render scene/animation | Browser native | Record actual supported browsers |
| performance.now | Monotonic active-run timing | Browser native | Planned |
| localStorage | Settings/device-local bests | Browser native; may be unavailable | Planned |
| Pointer/Keyboard/Visibility events | Input and pause/focus handling | Browser native | Planned |
| Web Audio | Original small sound cues | Browser native; gesture unlock | Planned; remove if unused |
| Google AI Studio / Gemini | Development-time UI and clue authoring | Service login; no shipped runtime key | Not yet executed; fill AI_PROVENANCE |
| Devin | Parallel coding/integration/review | Service authentication only | Not yet executed; record real sessions/PRs |
| GitHub | Public complete source and commit history | Development/distribution, no game API token | New project repo not yet available |
| itch.io | Free HTML5 game hosting | Static delivery | Game not yet published |

No Google Maps, Google Earth, geocoding, telemetry, external leaderboard, authentication or runtime Gemini API is planned. If the actual build adds one, document endpoint, request/response, auth, quotas, failure handling, data sent and secrets location rather than hiding it in the generated code.

## Verified primary sources (accessed 26 September 2026)

1. [Tech: Europe AI Gaming Hack event page](https://luma.com/par-hack). Confirms an eight-hour event and lists 19:00 competition opt-in / 20:00 demos. Submission details and scoring criteria in this pack otherwise come from Karim's supplied brief; the public page is not treated as the complete rules.
2. [itch.io HTML5 upload guide](https://itch.io/docs/creators/html5). Reference for browser ZIP structure, relative paths, embedding and archive constraints. The project-specific smaller size/performance budgets are our design choices.
3. [Google AI Studio Build documentation](https://ai.google.dev/gemini-api/docs/aistudio-build-mode). Reference for web-app generation, export/sync and secret handling. This pack selects a reviewed source-export workflow.
4. [Gemini API key guidance](https://ai.google.dev/gemini-api/docs/api-key). Reference for secure credentials; the committed baseline has no runtime Gemini integration.
5. [Devin AGENTS.md guidance](https://docs.devin.ai/onboard-devin/agents-md). Supports repo instruction files; current guidance caps automatic inclusion at 16 KiB per file. Longer task details therefore live in linked briefs.
6. [Devin parallel-session example](https://docs.devin.ai/use-cases/gallery/batch-3-agents-best-solution). Supports parallel work; our specific role ownership and merge policy are original project decisions.
7. [Voodoo publishing](https://voodoo.io/publishing). Its public process emphasizes testing prototypes and improving the core loop/retention. Our short-session and replay choices are an inference for this project, not Voodoo approval or a promise of acceptance.
8. [Vite static deployment](https://vite.dev/guide/static-deploy) and [environment variables](https://vite.dev/guide/env-and-mode). Reference for production builds and browser-exposed configuration. The project chooses relative base paths for itch embedding.
9. [GitHub secret scanning](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning). Reference for scanning history and responding to credential exposure; local artifact checks remain necessary.
10. [GitHub repository licensing](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository). Reference for including a clear license; third-party assets retain their own terms.
11. [React Three Fiber performance guidance](https://r3f.docs.pmnd.rs/advanced/scaling-performance). Official documentation was available through search snippets; direct page retrieval failed in the planning environment. Consult it during implementation; no unverified API signature is assumed here.

## Implementation references

Use the documentation matching the **installed** versions: [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/docs/), [Three.js](https://threejs.org/docs/), [R3F](https://r3f.docs.pmnd.rs/), [Zustand](https://zustand.docs.pmnd.rs/), [Vitest](https://vitest.dev/guide/), [Playwright](https://playwright.dev/docs/intro). These are reference links, not assertions that every page was individually checked or that the latest versions interoperate.

## Documentation update rule

At release, A0 records the actual versions from the lockfile, required browser features, source commit and all external calls (ideally none during play). Move abandoned options into an explicit “not shipped” list. Do not let future agents treat this planned inventory as an as-built report.
