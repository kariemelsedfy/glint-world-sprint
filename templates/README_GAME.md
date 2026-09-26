# GLINT — World Treasure Sprint

> TEMPLATE: A0 replaces the root planning README with a completed version after implementation. Remove this notice and all placeholders only after verifying the actual shipped build.

Read a clue, fly into a colorful miniature city, find its treasure and beat your time.

- **Play free:** ACTUAL_ITCH_URL
- **Full source:** ACTUAL_GITHUB_URL
- **Submitted build:** ACTUAL_COMMIT_OR_TAG

## Play

List the actual supported browsers/devices. Explain movement, map, globe travel, auto-collection, hint penalties, pause/practice behavior and retry. List only implemented cities/trials. Describe local best storage and its limits. Include one real screenshot.

## Setup

Prerequisites: ACTUAL_NODE_VERSION and npm; a supported WebGL browser. State the tested operating system. The baseline should require no API keys or server.

```bash
npm ci
npm run dev
```

Record the actual dev URL printed by the project. Do not claim setup works until tested from a clean checkout.

## Verify and package

```bash
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run preview
npm run package:itch
npm run check:release
```

Describe actual output paths, relative-path configuration and itch upload. Document any optional command prerequisites. Never include a script name absent from package.json.

## How it works

Summarize state/movement/collision, city modules, deterministic content, hints/scoring and the cloud-covered travel effect. Link the appropriate files after placing this template at repository root:

- `docs/TECHNICAL_ARCHITECTURE.md`
- `docs/CONTRACTS.md`
- `docs/GAME_DESIGN.md`
- `docs/CONTENT_AND_LEVELS.md`
- `docs/TOOLS_AND_SOURCES.md`
- `docs/QA_AND_PLAYTEST.md`
- `docs/RELEASE_RECORD.md`

## AI and tooling

Identify the actual Devin and Google AI Studio contributions, development-time vs runtime use, actual package versions and any API calls. Link AI_PROVENANCE and ASSET_PROVENANCE. Do not state the planned pipeline ran unless evidence exists.

## Known limitations

Describe approximate miniature geography, fictional replicas, device-local score trust, tested/untested mobile support, observed performance and unresolved minor issues. Be specific, brief and honest.

## License and credits

Original project source uses the chosen LICENSE. List third-party asset/dependency notices and links. A public repository does not change third-party asset terms.
