# Start here — ship GLINT

## Decision in one minute

Build a **browser-playable 3D treasure speedrun**, not a planet simulation. Ship **Paris + Giza, six collectibles, three short trials, a globe, a convincing travel transition, paid hints, and immediate retries**. Make the movement and discovery satisfying. Rome is a gated stretch goal.

The player has one recognizable toy-like explorer. They deduce a destination from a clue, fly into its tiny city, use landmarks and a broad search area to find the object, then travel for the next. A hint buys information at a visible time/points cost. A retry teaches the route and improves the score.

The technical baseline is **React + TypeScript + Vite + Three.js / React Three Fiber + Zustand**, exported as a static HTML5 ZIP for itch.io. Use Google AI Studio for the real interface and reviewed clue content. Use Devin for parallel implementation. The published baseline needs **no API keys, server, login, maps API, or runtime AI request**.

## Your first 15 minutes

1. Create or select a **public GitHub repository**, suggested name `glint-world-sprint`. Put the *contents* of this pack at its root. Grant Devin access to this exact repository. Do not use an unrelated existing repository.
2. Open your provided Devin organization workspace. Start **A0 — Lead / Integrator** using [its full brief](agents/A0_LEAD.md). Supply the repository URL and real cutoff time. Tell it to establish the scaffold and contract before other coding agents start.
3. In your provided Google AI Studio project, use **Build mode** with [the UI prompt](prompts/AI_STUDIO_UI.md). Timebox the first usable export to **25 minutes**. Download its source; give the UI source to A5. Keep the original export and screenshots locally until sanitized.
4. While A0 scaffolds, create the itch.io project as an HTML game, initially draft. Establish that you can upload a ZIP now, not in the final ten minutes.
5. Verify the organizer's actual **submission cutoff and form**, whether competition opt-in is separate, and whether a sponsor award specifically requires runtime AI. Do this alongside development; the user-provided judging/submission requirements remain the baseline.
6. Once A0 reports `CONTRACT_READY` with a commit SHA, start **A1 gameplay, A2 globe, A3 Paris, A4 Giza, A5 UI** on that same base. Start **A6 content** next; **A7 QA** joins once a playable shell exists. Briefs and ownership are in [the Devin runbook](docs/DEVIN_RUNBOOK.md).

Do not start ten agents all modifying `App.tsx`. One integrator owns composition and dependencies. Workers deliver small branches and draft PRs.

## The clock

The event's public page lists **19:00 competition opt-in** and **20:00 live demos** in Paris. It does not establish every submission rule. Confirm any separate deadline with the organizers. Our conservative target is **public links verified by 18:30**, with opt-in completed earlier. Do not assume an eight-hour countdown from whenever coding finally begins.

Use the full eight-hour sequence in [PROJECT_PLAN.md](PROJECT_PLAN.md), shortened to the actual remaining time. Fixed gates: **16:30 core feature freeze; 17:30 release candidate; 18:30 public submission ready**. If starting late, cut stretch work instead of moving those gates.

## What deserves your own attention

- Choose the better-looking UI in AI Studio; do not spend an hour refining a landing page.
- Play the first graybox yourself within 60–90 minutes. If movement and searching feel dull, fix them before adding content.
- Watch at least three new people play with no coaching. Ask whether they voluntarily retry.
- Check public GitHub and itch.io pages while signed out.
- Rehearse the five-minute demo and keep a local recording of the real build.

## Copy into any worker session

```text
Implement your assigned GLINT task in the provided repository.
Read AGENTS.md, docs/CONTRACTS.md, your assigned agents/A*.md brief,
and only the linked documents needed for your scope.
Use the agreed CONTRACT_READY commit as your base. Own only your listed paths.
Deliver the smallest working increment first, then polish it.
Do not change dependencies, shared types, app composition, or another agent's files.
Do not expose keys, add a backend, create an unrelated app, or silently add scope.
Open one small draft PR and update docs/status/<YOUR_AGENT_ID>.md.
Report: commit, owned paths, working behavior, checks actually run, blockers,
and exact integration steps. Do not claim an unmeasured performance result.
```

Read [AI_STUDIO_WORKFLOW.md](docs/AI_STUDIO_WORKFLOW.md) for export handoff. Read [RELEASE_AND_SUBMISSION.md](docs/RELEASE_AND_SUBMISSION.md) for the exact finish procedure.
