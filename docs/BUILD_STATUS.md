# Build status

**Current stage: A0 bootstrap scaffold merged path opened — a playable graybox loop exists (menu → briefing → globe → travel → city → collect → results). City art, globe art, real UI and content validation are still stubs.**

| Work item | Status | Evidence / next owner |
|---|---|---|
| Product scope / game rules | Specified | PROJECT_PLAN + GAME_DESIGN |
| City layouts / six targets / three trials | Data implemented, art stubbed | `src/cities/*/definition.ts`, `src/content/`; A3/A4/A6 |
| Shared TypeScript contract | Adopted | `src/shared/contracts.ts` (authoritative); `contracts/game.ts` marked superseded |
| Agent briefs / AI Studio prompts | Written | agents/ and prompts/ |
| Playable game / dependencies | Graybox bootstrap implemented | `bootstrap/foundation`; npm ci / typecheck / test / build / preview / e2e / package / release check all run green locally |
| AI Studio UI source | Export supplied, NOT INTEGRATED | `ai-studio-export/src/ui/`; A5 adapts it to `UIModel`/`UIActions` and replaces the placeholder `src/ui/GameUI.tsx` |
| Gameplay / content tests | 9 unit tests + 2 e2e smoke tests pass | `tests/unit/`, `tests/e2e/smoke.spec.ts`; A1/A6/A7 extend |
| Performance benchmarks | NOT MEASURED | A7 |
| Public GLINT GitHub repository | Planning pack + bootstrap pushed | `main` @ 33b3ec4, `bootstrap/foundation` |
| itch.io release / competition submission | NOT PUBLISHED / NOT SUBMITTED | Owner + A0/A7 |

Known stubs at CONTRACT_READY: placeholder UI (A5), graybox city scenery (A3/A4), placeholder globe and cloud-cover travel (A2), objective resolution without reachability/clearance validation (A6), no audio, no touch controls UI, no orientation notice.
