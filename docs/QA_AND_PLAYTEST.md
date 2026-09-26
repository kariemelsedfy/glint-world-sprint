# QA and playtest plan

## Purpose and gate

Verify that a new player can start, understand, finish and retry the actual submitted game. Targeted tests protect scoring, state, content reachability and release packaging. Do not spend the day building superficial coverage or exhaustive visual snapshots.

A7 records executed evidence in `docs/qa/`; A0 selects the release. Test results are initially **NOT RUN**. Targets in the plan are not measurements.

## Automated checks worth doing

| Check | Why it matters | Owner |
|---|---|---|
| Strict TypeScript + production build | Catches broken agent interfaces/imports | A0 |
| Score/hints/timer/retry unit tests | Prevents inconsistent competitive results | A1 |
| Duplicate and stale-event tests | Prevents penalties/pickups after rapid clicks or canceled travel | A1 |
| All candidate sockets / seed determinism | Prevents unwinnable or unfair runs | A6 |
| One browser journey through start/result/retry | Catches broken app wiring | A7 |
| ZIP structure/assets/secret patterns | Prevents an unusable or leaking submission | A7 |

Test hooks, if necessary, are restricted to a separate test build and absent from the release bundle. A teleport-to-result hook is not evidence that real movement or collection works. Keep a manual real-control production run as the release gate. Do not require a GPU benchmark to pass inside an environment with software rendering; measure real performance on the actual device and document the environment.

## Manual acceptance matrix

| Scenario | Expected |
|---|---|
| Fresh load, storage empty | Menu and controls work; no account/key/server required |
| All three trials | Correct distinct objects, both cities playable, reachable pickups, results |
| Revisit a city | Collected objects stay gone; hints and current run time remain |
| Wrong city first | Exploration allowed; no objective region if none remain; valid exit |
| Hint rapid double-click | Exactly one tier/cost at a time; already-bought hints readable free |
| Map held open for 10 seconds | Active/adjusted time increases; no automatic pause |
| Pause / window blur / hidden tab | Input cleared; run marked practice; no valid-best overwrite |
| Slow frame | Clock reflects real active duration; controller does not tunnel through blockers |
| Restart during travel | Old callbacks cannot complete or charge the new run |
| Load failure | Recoverable message/back to globe; no indefinite cover or double entry cost |
| Movement into corners / river / bridges | Solid blockers respected; legal bridges and sockets accessible |
| Last pickup | Clock frozen before celebration; correct breakdown and medal |
| Retry ten times / travel ten times | No residual keys, duplicate listeners, growing entities or stale state |
| Resize / fullscreen enter-exit | UI readable; no lost canvas or changed movement/score |
| Mute / reduced motion | Works from menu and run; travel cost identical |
| Touch release/cancel / two fingers | Stops correctly; map/hints do not drag player |
| Corrupt or blocked storage | Game works; best is session-only; clear indication |
| Actual itch iframe | Correct paths/assets/focus/audio/fullscreen behavior |
| WebGL unavailable | Useful compatibility message instead of blank canvas |
| Signed-out visitor | Can play free and read/clone full source |

Target desktop Chrome/Chromium plus one other real browser available to the owner. If mobile is claimed, test an actual phone in landscape. Do not mark “mobile friendly” solely because a CSS preview fits.

## Performance measurement

In a production build, record device/OS/browser, viewport, DPR/quality, city, capture duration and method. Warm the scene, then sample at least 30 seconds of normal walking/pickup activity and a separate travel. Report median and p95 frame time, not just a momentary FPS counter. Record renderer draw calls/triangles if available. Distinguish actual device results from automated/software-renderer results.

Targets: desktop ~60 fps with p95 frame time ≤25 ms; mobile ~30 fps with p95 ≤40 ms; no visible repeated stutters at pickups. Report misses honestly. First reduce shadows/effects/DPR or prop count. Do not change scoring time to disguise low FPS.

Also record production ZIP size and menu-ready load under a described network. Targets (<25 MB ZIP, usable menu <5 s under the stated test) are goals, not guarantees. Check Network for unexpected external requests; the game needs no runtime AI/assets service.

## Three quick human playtests

Recruit three available people individually, using anonymous labels T1/T2/T3. Say only: “Play this game as if you found it on itch.io.” Do not explain the answer to the clue or point toward an item.

Record time to understand goal, first pickup after arrival, completion time, hint use, confusion, wrong turns, and whether they choose Retry without being told to. Ask afterwards: “What would make you play one more run?” Do not substitute “Did you like it?” for observed behavior.

If people repeatedly need spoken help, change the game. Tune clue specificity, object readability and map size before increasing content. If no one retries, improve results feedback and retry friction, or shorten the trial. Report this tiny sample as qualitative feedback, not proven day-one retention.

## Bug severity and freeze

P0: crash, impossible objective, broken progression, key leak, missing asset, incorrect scoring/reset, inaccessible submission. Must fix or cut affected scope.

P1: confusing hint, serious control/UI obstruction, sustained poor frame time, missing promised touch interaction. Fix before optional polish.

P2: minor façade/art issue, imperfect animation flourish, optional content. Do not delay submission for it.

After feature freeze, reproduce the defect, apply the smallest fix, retest its affected path and one full run. Avoid broad speculative rewrites. Keep the previous known-good ZIP until the candidate passes.
