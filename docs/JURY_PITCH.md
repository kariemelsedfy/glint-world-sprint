# Five-minute finalist presentation and pre-selection demo

## Core message

**“In GLINT, knowing the world makes you faster.”** Show a fun game first; explain the agent workflow after the audience has seen why the game matters. Avoid promising Voodoo would publish it or asserting invented retention metrics.

The script below assumes the two-city P0 actually ships. Before presenting, remove or revise every unsupported statement. Replace all measurement placeholders with real evidence, or explicitly say the metric was not measured.

## Five-minute run of show

| Time | Show | Say / prove |
|---|---|---|
| 0:00–0:25 | Globe/title, one clue | One-sentence hook and the player's decision |
| 0:25–1:55 | Live Paris pickup → globe travel → Giza pickup → result | Real movement, recognizable landmarks, discovery, one paid hint, complete loop |
| 1:55–2:45 | Result/retry and a different trial | Knowledge becomes speed; same challenge can be mastered; new items change the search |
| 2:45–3:30 | One architecture image or source screen | Compact deterministic scenes, shared map/collision data, browser distribution, measured performance |
| 3:30–4:20 | Actual AI Studio source/provenance + Devin PR evidence | What each tool actually created, review/validation, no client API secrets |
| 4:20–5:00 | Game and public links | Honest playtest result, next experiment, clear close |

## Speaking notes

**Opening:** “This is GLINT, a world treasure sprint. You don't follow a line to a marker. You read a clue, recognize the place, and find your own way. The better you know the world, the faster you finish.”

**During play:** “A famous smile near a glass triangle. I think Paris. Watch how the globe becomes a tiny city. There is enough recognizable geometry to orient yourself, while the rest stays small and fast. I choose my route and collect by moving close. For the next clue I can buy help, but it adds time. Information is part of the score.”

Show the hint cost **before** clicking. Do not select a completed objective's hint. Show the next city transition and final adjusted-time breakdown. Practice this path before the presentation so no spoken guidance is required to rescue a confusing game.

**Replay:** “The first run is discovery. The next run is mastery. Retry keeps the same challenge and placements, so I can learn a better route and beat my own time. Other trials use different objects.”

**Technical:** “I built compact, original miniature scenes rather than loading a real-world map. Spatial data drives both collision and the local map. The released game runs as static browser files. Here are the actual tested device and frame-time results: [insert measured evidence, or omit].”

**AI:** “Google AI Studio produced [name the actual retained UI components and reviewed clues]. Devin worked on [name the actual implemented branches]. I kept shared contracts and one integration queue so parallel work became one game. Generated content was reviewed and bundled; the player doesn't need an API key or a live model response.” Do not call this live adaptive AI unless it actually is.

**Close:** “In our small playtest, [insert observed finding and sample size honestly]. The next experiment is [one specific retention/route-variety question]. GLINT is playable free now, and the complete source and technical notes are public.” End on the game and links, not an architecture wall.

## Pre-selection: the first minute matters

Make the itch page playable immediately with concise controls. A judge should see the globe hook, reach a collectible and find Retry without a personal tour. The default trial should be the most reliable and legible one, not the most difficult. Use the actual best-looking stable build as the submission, not a separate cinematic mockup.

## Evidence worth preparing

- 45–60 second capture of the **actual build**: globe, both cities, hint cost, pickup and result. Label it as a recording if used as fallback.
- One globe screenshot, one from each city, one result screenshot.
- Actual build commit/tag, itch URL, public repo URL and short architecture explanation.
- Actual AI Studio prompt/output/import record and selected Devin PRs with no credentials on screen.
- Tiny honest playtest table and performance result from the tested machine; no made-up users, rankings or publisher validation.

## Likely questions

| Question | Good answer direction |
|---|---|
| “What is novel?” | Geographic inference plus physical search and speedrun optimization, with a priced-information mechanic. Do not claim no one has ever done any component. |
| “Why replay?” | Same-seed improvement and medal targets already implemented; varied item trials; show observed retry behavior. |
| “Where is the AI?” | Identify exact shipped UI/content and Devin code contributions. Clearly distinguish development-time AI from runtime behavior. |
| “Why only two cities?” | Deliberate focus on recognizable art, smooth controls and a complete loop within eight hours. |
| “Can people cheat?” | Device-local records are not secure rankings. A real leaderboard would require server validation and is future work. |
| “Can this be a mobile game?” | Show actual tested touch support if available; native distribution/monetization is an unvalidated next step. |
| “How do you add cities?” | New module follows city definition, map/collision/socket contracts and validator, then content/trial registry entries. |

Keep the local build and recording ready. If networking fails, explain the fallback plainly; never pass prerecorded interaction off as live gameplay.
