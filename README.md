# GLINT — World Treasure Sprint

**Planning and agent handoff pack · 26 September 2026 · Tech: Europe AI Gaming Hack**

> Read [START_HERE.md](START_HERE.md) first. This repository currently contains specifications, reference contracts, agent briefs, and an **unintegrated AI Studio UI reference export**. It does **not** yet contain an implemented or playable 3D game. Targets in these documents are acceptance criteria, not measured results.

**The pitch:** Read a clue. Spin the globe. Dive into a colorful miniature city. Find the treasure. Beat your time without buying hints.

**Working title:** GLINT. This handoff uses the existing `glint-world-sprint` repository.

## Read by role

| Reader | Start here |
|---|---|
| Karim, project owner | [Start here](START_HERE.md), [project plan](PROJECT_PLAN.md) |
| Every coding agent | [AGENTS.md](AGENTS.md), [contracts](docs/CONTRACTS.md), assigned brief in [agent runbook](docs/DEVIN_RUNBOOK.md) |
| Gameplay / content | [Game design](docs/GAME_DESIGN.md), [content and levels](docs/CONTENT_AND_LEVELS.md) |
| World / city art | [Architecture](docs/TECHNICAL_ARCHITECTURE.md), [art and city layouts](docs/ART_DIRECTION.md) |
| UI / Google AI Studio | [AI Studio workflow](docs/AI_STUDIO_WORKFLOW.md), [UI prompt](prompts/AI_STUDIO_UI.md) |
| QA / submission | [QA](docs/QA_AND_PLAYTEST.md), [release](docs/RELEASE_AND_SUBMISSION.md), [security](docs/SECURITY_AND_LICENSES.md) |
| Jury documentation | [Tools and sources](docs/TOOLS_AND_SOURCES.md), [pitch](docs/JURY_PITCH.md) |

## Implementation status

See [BUILD_STATUS.md](docs/BUILD_STATUS.md). There is no production `package.json` yet; setup commands are defined for Agent A0 to implement. Do not run or advertise nonexistent scripts as verified. The selected [AI Studio source reference](ai-studio-export/src/ui/) is separate from the game scaffold; [handoff and integration requirements](docs/AI_STUDIO_WORKFLOW.md#supplied-export-in-this-handoff) explain what A5 can adapt. Its demo uses a 2D canvas, **not** the required 3D globe or explorable cities.

The reference TypeScript file [contracts/game.ts](contracts/game.ts) establishes interfaces and constants. A0 copies it to `src/shared/contracts.ts` during bootstrap and makes the source copy authoritative. The README must then be replaced with the completed [game README template](templates/README_GAME.md), preserving links to these planning documents.

Original code and documentation in this pack use the MIT license in [LICENSE](LICENSE). Future third-party assets retain their own licenses and must be recorded in [asset provenance](docs/ASSET_PROVENANCE.md).

Additional references: [requirements coverage](docs/REQUIREMENTS_TRACEABILITY.md), [decision log](docs/DECISIONS.md), and [planning-pack validation](docs/PLANNING_VALIDATION.md).
