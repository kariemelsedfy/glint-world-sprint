# GLINT project plan

## 1. Product decision

**GLINT — World Treasure Sprint.** A cheerful 3D geography treasure hunt in which knowledge saves time: infer a city, recognize a landmark, find a replica, and beat your previous run. Every hint trades speedrun score for less uncertainty.

The hook should fit a ten-second video: globe → dive through clouds → run past the Eiffel Tower → treasure bursts into your passport → dive into Giza. A player must understand the action before reading a long explanation.

The game borrows the pleasure of geographic deduction and adds movement, route learning, collectible feedback, and travel spectacle. It is not a GeoGuessr clone, a full Google Earth replica, or a claim of Voodoo endorsement. Our publisher-oriented hypothesis is that a simple control scheme, short sessions, visible mastery, and easy-to-read video footage make this concept worth testing. Publication or winning cannot be guaranteed.

## 2. Win the rubric through visible evidence

No official weights were supplied. Do not invent them. Optimize the complete first run and record honest evidence.

| Criterion | Design choice | Acceptance evidence before submission |
|---|---|---|
| Performance | Small static game, compact scenes, no gameplay network calls, capped effects | Recorded device/browser; production frame-time sample; no blockers or console errors in a full run |
| Execution quality | One consistent toy world; crisp movement; coherent travel; strong pickups; readable hints | First-time player completes the loop unaided; screenshots from both cities; retry/reset works |
| Novelty | Geographic inference + physical search + speedrun optimization; information has a time cost | Jury sees a clue, a choice, a discovery, and the hint tradeoff live |
| Stickiness | Same-trial retry, local personal best, medal thresholds, different object pairs | Observe voluntary retries and better second runs; no invented retention figures |

Novelty is a designed twist, not a proven claim that no similar game exists. AI is used to build and author the game; disclose that accurately. A runtime chatbot is not needed to make the loop fun.

## 3. Scope and priority

| Priority | Deliverable | Why it earns its time |
|---|---|---|
| P0 | Paris and Giza, each about 144 × 144 world units | Two recognizable destinations support the world-travel premise |
| P0 | Globe with two real selectable destinations; matching transition style | The strongest visual identity / demo hook |
| P0 | One persistent explorer; auto-collect; WASD / arrows; touch stick | Low control friction; no interaction puzzle |
| P0 | Six collectible definitions, three authored trials with different pairs | Real level variety without six environments |
| P0 | Clues, a broad search map, three paid hint tiers | Deduction without aimless wandering |
| P0 | Deterministic placement, adjusted time, medals, retry, local bests | Fair comparisons and immediate replay |
| P0 | Functional UI originating in Google AI Studio | Required tool participation becomes visible shipped work |
| P0 | Devin implementation, public source, setup / tools / technical docs | Meets submission and evaluation requirements |
| P0 | No-secrets production build; free itch.io page; signed-out check | An inaccessible or leaking submission is not finished |
| P1 | Same-day seeded challenge / three-target tour | More replay combinations after the core works |
| P1 | Additional sound layers, outfit palettes, subtle set dressing | Only if they improve the existing loop quickly |
| P2 | Rome with two recognizable landmarks | Only after both cities and publication path pass |
| Excluded | Global rankings, online co-op, real GIS, interiors, climbing, NPC AI, economy | Too many integration and content risks for this time budget |

**Emergency submission floor:** if a city fails late, preserve a complete Paris-only trial, globe dive, hints, results and replay, disclose the reduced scope, and submit. This is a fallback, not the intended product. A running small game beats an unplayable two-city promise.

## 4. Eight-hour execution sequence

The user has about eight hours, but the event's public schedule says 19:00 competition opt-in and 20:00 demos. Set the actual submission deadline from the organizer. Reserve at least the final 45 minutes for public links and submission; target 18:30 Paris today. If later-starting work cannot fit, remove optional phases. Never shift the event gates to fit the plan.

| Elapsed budget | Parallel work | Integration gate / cut decision |
|---|---|---|
| 0:00–0:30 | A0 repo/scaffold/contracts; owner AI Studio UI pass and itch draft | Locked interfaces; buildable shell; exact common base SHA |
| 0:30–1:15 | A1 movement/state; A2 globe; A3/A4 city grayboxes; A5 UI export | Walk, collect placeholder, see results, retry in one graybox |
| 1:15–2:00 | A6 content/hints; A7 early smoke; cities add landmarks | First Paris slice from globe through result. First draft ZIP uploaded |
| 2:00–3:00 | Giza integration, two-city travel, all target pairs | One full cross-city trial. Timer/hints persist across travel |
| 3:00–4:00 | Visual coherence, sounds, map, saved best, touch basics | Three clean runs; no progression blockers. Three short external playtests |
| 4:00–5:00 | Fix observed confusion; polish pickups and travel | Only now decide daily challenge, cosmetics or Rome. Maximum one stretch feature |
| 5:00–6:00 | Performance pass, cut expensive geometry, finalize actual docs | All P0 criteria pass on production build. Core feature freeze |
| 6:00–7:00 | Cross-browser/embed QA, publish candidate, prepare demo evidence | Release candidate on itch; clean clone build; public repository verified |
| 7:00–8:00 | Submission, rehearsal, recorded fallback, only blocker fixes | Exact submitted URLs + commit + ZIP digest recorded |

**Today's fixed working gates:** 16:30 core feature freeze; 17:30 candidate; 18:30 public submission ready; 19:00 opt-in is the published event time. Confirm if a different official submission cutoff is earlier. At the time of this brief the event is already in progress; elapsed windows are budgets, not permission to work past the cutoff.

## 5. Staffing and critical path

Eight planned Devin roles across staggered waves: A0 integration; A1 gameplay; A2 globe/travel; A3 Paris; A4 Giza; A5 UI; A6 content; A7 QA/release. Do not maximize concurrent sessions just because credits are available. Begin with the five independent implementation workers once contracts exist, then add content and QA. The solo human's review bandwidth is the scarce resource.

Critical path: repository access → scaffold/contracts → moving/collecting graybox → full two-city run → production ZIP → public verified submission. Art and UI can proceed against mocked data; scoring and state must not be independently reimplemented by each worker. A0 maintains a known-good `main` and serial merge queue.

A8 audio/polish and A9 Rome are optional briefs. Do not start Rome merely because its agent can run independently: integration, QA, and attention still cost time.

## 6. Player experience gates

These are playtest targets, not promises:

- Understand what to do in the first 10 seconds after the briefing.
- Recognize the first city/landmark from its silhouette without a label.
- Find the first collectible within roughly 20–35 seconds of arriving on a first run.
- Finish a standard two-target trial in about 60–150 seconds on a first attempt; faster after learning.
- Buy a hint deliberately, knowing its cost before purchase.
- See a clear time, medal, and retry button immediately after the last pickup.
- At least two of the first three external testers choose to retry when given the option. This is an informal design gate, not a statistically valid retention study.

If the first object takes over 45 seconds to find repeatedly, shrink the map / broaden readable sightlines / improve clues. Do not compensate with a navigation arrow. If movement feels bad, simplify collision before adding effects.

## 7. Risks and precommitted fallbacks

| Risk | Warning sign | Response / owner |
|---|---|---|
| Agents conflict | Multiple edits to shared files; duplicate stores | A0 locks interfaces and serializes merges; workers revert out-of-scope changes |
| Beautiful scene, no game | 90 minutes without a pickup → result → retry loop | A0 stops decorative work; A1 supplies the smallest complete loop |
| Travel consumes the day | Complex planetary projection or broken camera swaps | A2 uses the specified cloud-covered scene swap; fallback 0.25 s fade |
| AI Studio generates a full-stack app | Server code / auth / Gemini requests in export | A5 extracts only presentational React/CSS; never bundle the server |
| AI use is only claimed | No prompt/output evidence or shipped contribution | Owner records actual UI export and clue review with commit references |
| Arbitrary maze search | Testers wander / need spoken instructions | A3/A4 widen routes, shorten distances; A6 adjusts clue specificity |
| Technical city unreachable | Target inside mesh or blocked by props | Shared collision/map data and socket reachability checks; move to safe socket |
| Poor frame time | Busy landmarks/particles dominate | Lower DPR and shadows, instance blocks, reduce geometry; keep core art silhouette |
| Internet/auth trouble | Upload cannot be tested by hour two | Owner resolves account access early; keep local production ZIP + video |
| Late scope creep | Rome or runtime AI on critical path | Cut it; preserve two-city release and rehearsal |

## 8. Definition of submission complete

A free public itch.io browser build; a public GitHub repository with the **actual complete implementation** and lockfile; accurate README setup; APIs/tools/framework inventory; architecture and content docs; asset and AI provenance; measured QA evidence; known limitations; exact submitted commit and artifact recorded. The planning pack alone does not satisfy full-source or game requirements.

See the [release checklist](docs/RELEASE_AND_SUBMISSION.md) and [five-minute pitch](docs/JURY_PITCH.md). No feature is complete merely because an agent says it is: the integrator must play its path in the combined build.
