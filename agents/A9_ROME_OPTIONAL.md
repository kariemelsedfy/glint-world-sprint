# A9 — Optional Rome, never on the critical path

Do not launch until A0 confirms: Paris/Giza full trials pass; real itch upload works; no release-blocking bugs; at least 90 minutes remain before feature freeze; and Karim explicitly chooses Rome over other polish. Otherwise this brief remains unused.

Own `src/cities/rome/` only. Follow the existing CityDefinition/Scene pattern. First build a small original low-poly Colosseum-like oval arcade and a fountain plaza with warm terracotta buildings, using the same flat movement and camera scale. No new rendering or map dependencies. No interiors or vertical gameplay.

A0 must explicitly extend CityId, registry and UI destinations; A6 must create and validate target content and a trial. Do not add broad shared edits yourself. New geometry alone is not a complete destination. Use original souvenir tokens and truthful fictionalized clue wording; record origins/licenses.

Cap this work at one hour of implementation plus its actual integration/QA budget. If its complete city → collectible → result path cannot be verified before freeze, leave the branch unmerged and do not show a Rome pin in the submitted game. A beautiful unfinished third city must not destabilize the two-city entry.

## Required handoff

Update your own `docs/status/A9.md`; open a small draft PR. Include commit SHA, changed paths, demonstrated behavior, checks actually run, screenshot/clip if visual, remaining bugs, and exact integration instructions. Never invent successful tests or benchmarks. Record asset/tool provenance. Do not merge your own PR.
