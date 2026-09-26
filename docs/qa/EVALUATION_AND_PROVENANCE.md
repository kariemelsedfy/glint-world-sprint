# Evaluation and provenance notes (A7)

What the jury can verify about how GLINT was checked, and where every A7 artifact came from. Only executed work is listed.

## Evaluation evidence available today

| Criterion (Stage 1) | Evidence that exists | Evidence still missing |
|---|---|---|
| Performance | On integrated `main` @ `656af1d`: bundle 1,091.48 kB JS / 303.26 kB gzip, 44.62 kB CSS; ZIP 305.3 KiB (312 637 bytes, 3 files); menu-ready 365–1 586 ms local and 946–1 031 ms at 9 Mbit/s + 60 ms RTT; ~50 fps menu, ~55 fps globe, ~40 fps Paris, p95 33.3–33.4 ms — **all under SwiftShader software rendering** on a GPU-less VM (`PERFORMANCE.md`) | Real-GPU and real-phone frame timing; load from the itch CDN |
| Execution quality | 9 automated browser tests on the production build covering the whole loop, penalties, hints, map, pause/practice, hidden-tab travel, best persistence and no-WebGL fallback, green on `656af1d` both at normal host load and with extra CPU load; unit tests 43/43; a manual desktop-Chrome browser QA pass on `656af1d` **reported by A0** (full loop, hint pricing, penalties, collision/bounds, settings and best-time persistence; not executed by A7); a release gate with budgets, path, source-map and credential checks, proven to fail on a tampered ZIP (`README.md`, `RELEASE_CHECKS.md`) | Manual acceptance matrix rows listed as "Not yet executed" in `README.md`; trials `sky-sun` and `small-wonders` not automated |
| Novelty / stickiness | Nothing measured by A7 | Human playtests (**0 run so far**) — retry behaviour must be observed, not assumed |

## How the automated evidence was produced

- Tool: Playwright 1.49.1 driving headless Chromium 131 on macOS (Apple M4 VM, no GPU), WebGL via SwiftShader. No human was involved in these runs; they are not playtests.
- The game under test is the unmodified production build served by `vite preview`. Tests use keyboard/mouse only and do not touch internal state.
- Objective locations come from the game's own `resolveObjectives`, printed by `tests/e2e/support/print-objectives.ts`; they are not copied into the tests.
- Hidden-tab behaviour is emulated by overriding `document.visibilityState` and dispatching `visibilitychange`; it is equivalent at the event level but is not a physical tab switch.
- Frame timing is `requestAnimationFrame` delta sampling, 5 s per idle scene after 1 s of wall-clock warm-up.
- The walking helper is closed-loop on the player's real map position and adapts its key holds to the measured frame rate, so it still reaches and physically collects each target when the software-rendered app runs slowly (probed down to ~4 fps).
- Raw measurement JSON is written to `test-results/perf/*.json` on each run (git-ignored; the numbers are copied into `PERFORMANCE.md`).

## Security review executed (2026-09-26)

| Scope | Method | Result |
|---|---|---|
| Release ZIP contents | `npm run check:release` credential patterns + forbidden-file rules | No findings |
| Tracked working tree (113 files at the time, excluding `package-lock.json`) | Same patterns via `check:release` | No findings |
| Git history (all 7 local commits reachable from all refs, full repository not shallow, as of `47d365b`) | `git log -p --all` piped through the same pattern set, counting matches without printing them | 0 matches for Google API key, `sk-` keys, GitHub tokens/PATs, AWS key ids, Slack tokens, private-key blocks, JWTs |
| File names in history | `git log --all --name-only` filtered for `.env`, `.pem`, `.key`, `.p12`, `secrets/` | Only `.env.example` (an allowed, value-free template) |

Pattern scanning is a tripwire, not proof of absence. Repeat the history scan on the final release commit, and enable GitHub secret scanning when the repository is public.

## Provenance of A7's contribution

| Item | Value |
|---|---|
| Author | Devin agent A7 (release/QA), one of the parallel worker sessions coordinated by A0 |
| Session | https://app.devin.ai/sessions/84552c3c4380444cbdf61fb66724eb98 (the parent A0 session is not linked here; A0 records it) |
| Model | Not recorded here; do not infer one |
| Input | Automated A0 handoff for A7, `AGENTS.md`, `START_HERE.md`, `docs/CONTRACTS.md`, `docs/status/A0.md`, `agents/A7_QA_RELEASE.md`, and the game source at `47d365b` (read-only) |
| Output | `tests/e2e/**` (except the pre-existing `smoke.spec.ts`), `scripts/package-itch.mjs`, `scripts/check-release.mjs`, `docs/qa/**`, `docs/status/A7.md` on branch `feat/release` |
| Human review | None yet; pending PR review by A0/owner |
| Game source changed | None. Findings are handed to their owners in `docs/status/A7.md` |
| Runtime AI calls | None. The game and tests make no model or network calls |

Add a row for this PR to `docs/AI_PROVENANCE.md` when it is merged (A0 owns that file), citing the merge commit.
