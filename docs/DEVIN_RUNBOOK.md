# Devin orchestration runbook

## Launch discipline

Use the Devin organization workspace supplied by Karim. Connect the exact GLINT GitHub repository with the permissions needed for branches and PRs. Credentials belong in the service's approved secrets/authentication flow, not in this repository or prompts. Do not automate session spawning by committing a Devin API token.

Devin supports repository AGENTS.md guidance and parallel sessions. Our workflow is intentionally explicit: one shared specification, separate working branches, small PRs, and a single integration queue. See official references in TOOLS_AND_SOURCES.md. The root AGENTS.md is kept short enough to be read at startup; workers must explicitly read their linked brief as well.

**The owner launches sessions or directs the lead to launch them; avoid duplicate launches.** A0 first reports which roles are already running. If the UI/account lacks an automatic multi-session capability, manually start the listed sessions. No special Devin API integration is required for the game.

## Who to launch, in what order

| ID | Role / brief | Start | Branch | Exclusive implementation paths |
|---|---|---|---|---|
| A0 | [Lead / integrator](../agents/A0_LEAD.md) | Immediately | `bootstrap/foundation`, then integration branches | Root config, dependency files, `src/app/`, `src/shared/`, `src/cities/index.ts` |
| A1 | [Gameplay](../agents/A1_GAMEPLAY.md) | CONTRACT_READY | `feat/gameplay` | `src/game/`, `src/state/`, gameplay unit tests |
| A2 | [Globe / travel](../agents/A2_GLOBE.md) | CONTRACT_READY | `feat/globe-travel` | `src/world/` |
| A3 | [Paris](../agents/A3_PARIS.md) | CONTRACT_READY | `feat/paris` | `src/cities/paris/` |
| A4 | [Giza](../agents/A4_GIZA.md) | CONTRACT_READY | `feat/giza` | `src/cities/giza/` |
| A5 | [UI integration](../agents/A5_UI.md) | AI Studio first export + CONTRACT_READY | `feat/ui` | `src/ui/` |
| A6 | [Content / hints](../agents/A6_CONTENT.md) | Contract ready; can start with content tables | `feat/content` | `src/content/`, content validation/tests |
| A7 | [QA / release](../agents/A7_QA_RELEASE.md) | Playable scaffold, roughly first hour | `test/release` | `tests/e2e/`, two release scripts, `docs/qa/` and evidence |
| A8 | [Audio / polish](../agents/A8_POLISH_OPTIONAL.md) | Only after stable two-city loop | `feat/audio-polish` | Explicitly delegated audio files only |
| A9 | [Rome](../agents/A9_ROME_OPTIONAL.md) | Stretch gate passed, never after freeze | `feat/rome` | `src/cities/rome/` only, until contract extension approved |

A8/A9 are alternatives, not both automatically launched. There is no benefit to ten simultaneous workers if the lead cannot review them. Main wave: five implementation workers plus the lead; add content and QA in the next wave as the scaffold stabilizes. If capacity is limited, combine A6 into A1 and keep QA as a distinct responsibility.

## CONTRACT_READY gate (A0)

A0 must commit a booting shell, exact dependency lockfile, plain contracts, placeholder city registry/components, input/store interfaces, scripts, and explicit adapters. Do not wait for beautiful art. It reports:

```text
CONTRACT_READY
Repository: <actual URL>
Base commit: <actual SHA>
Commands verified: <actual commands/results>
Shared contract: src/shared/contracts.ts
Worker paths/imports: <short list>
Preview route: <local dev path or screenshot>
Known stubs: <explicit list>
```

All workers branch from that commit. A0 may create stub files inside future worker directories **only before** handing ownership over. After launch it changes those files only by coordination with their owner.

## Worker output rhythm

First 20–30 minutes: compile-ready smallest useful increment. First hour: usable behavior with screenshot or clip. Then polish. Open a draft PR early so the lead can inspect the integration boundary; do not accumulate a huge “finished” branch until the last hour.

Every worker owns `docs/status/Ax.md`, based on the [status template](../templates/AGENT_STATUS.md). Update it after a meaningful milestone or blocker, not every few minutes. Report a blocker after 10 minutes of trying, with a concrete fallback.

No worker merges its own PR or changes the selected release artifact. A0 can merge authorized project work once checks pass; the owner should not need to approve every routine merge. New scope or a security-sensitive service addition is a different decision.

## Merge queue

1. A0 foundation/stubs.
2. A1 movement/collection/state vertical slice and A6 initial content (order adapted to shared stubs).
3. A3 Paris definition/scenery.
4. A2 globe/travel.
5. A5 real UI.
6. A4 Giza, then remaining A6 levels/hints.
7. A7 targeted fixes, packaging and release evidence; polish only on proven paths.

This is an integration preference, not permission to block independent work. A0 can merge independent green city PRs earlier. Each merge must retain a playable fallback and pass compile/build. After any change to state/contracts, replay the end-to-end flow before merging the next state-dependent PR.

## Conflict protocol

If main moved, rebase or merge latest main into the worker's own branch, keeping other people's commits intact. For shared-file conflicts, stop editing that file and ask A0 to resolve the intended combined behavior. Never take “ours” or “theirs” blindly, delete another worker's implementation, or bypass type errors with `any`/ts-ignore to get a green build.

For a required shared edit, send A0 the smallest patch and expected export. A0 applies it and announces a new contract SHA. Consumers acknowledge it. Do not ask every worker to reread a large new document for a one-line field addition.

## Owner's review cadence

Every ~30 minutes check four things: main is playable; next dependency is identified; no one is outside ownership; no untested feature is on the release path. Spend most human attention playing the game and making aesthetic/fun decisions. Let the lead handle routine code integration.

At core freeze, stop feature PRs. QA files bugs with reproducible steps and severity; A0 routes each to the owner of the affected path. A7 does not silently fix gameplay, UI and cities at once.

## PR definition of done

Use [PR.md](../templates/PR.md): problem / behavior, owned paths, contract impact, screenshots, exact checks and known limitations. “Should work” or a screenshot of an isolated model does not count as integrated verification. Document tool and asset origins in the same PR.
