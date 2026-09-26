# Decision log

| ID | Decision | Reason / cost accepted |
|---|---|---|
| D01 | GLINT is the working name; availability unchecked | Short, memorable tie to shiny collectibles; can rename later |
| D02 | Two P0 cities: Paris and Giza | Preserves global travel with feasible art/QA scope |
| D03 | Elevated fixed-heading 3D camera, flat ground | Readable navigation without camera collision/climbing complexity |
| D04 | Static React/Vite/R3F game | Agent-friendly code and UI export; quick itch deployment |
| D05 | Cloud-masked globe/city scene swap | Continuous visual feeling without planetary-scale world engineering |
| D06 | Broad map areas + priced finer hints | Balances help with geographic inference and search |
| D07 | Adjusted time primary; points derived | One consistent scoring model; hint use directly lowers points |
| D08 | Development-time AI Studio UI + reviewed content | Real contribution, no runtime key/server dependency |
| D09 | Fixed connected layouts + seeded cosmetics/sockets | Replay fairness and reachable items within time budget |
| D10 | Device-local bests only | Avoids backend, accounts and anti-cheat work |
| D11 | Same persistent explorer across cities | Continuity, identity choice and cheaper animation |
| D12 | One integrator; exclusive worker ownership | Reduces branch conflicts and incompatible implementations |
| D13 | Public links ready by 18:30 Paris target | Buffer before published 19:00 opt-in; confirm separate cutoff |
| D14 | 2026-09-26, owner-approved: five cities (Paris, Giza, Rome, San Francisco, Berlin), twelve targets, six trials, and an arcade visual-polish pass | Supersedes D02 and the two-city scope lock in AGENTS.md; accepted cost is more art and QA surface per city. Impacted: `src/shared/contracts.ts` (CityId/TargetId/LevelId, target image metadata), `src/cities/index.ts`, `src/cities/rome|san-francisco|berlin/`, `src/content/`, `src/assets/targets/`, `src/ui/`. Movement, hint pricing, penalties and determinism unchanged. |

When a decision changes, append date, owner, change and impacted contracts/paths. Do not silently fork the design across agent branches.
