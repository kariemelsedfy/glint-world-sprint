# GLINT — World Sprint

**A reverse-geography treasure speedrun.** You are shown pictures of objects, not a destination. Work out which city each object belongs to, spin a cartoon 3D globe, fly there, explore a compact 3D city on foot, and grab the treasure before the clock beats you.

Built for the Tech: Europe AI Gaming Hack (26 September 2026). Free, open source, runs entirely in the browser — no account, no backend, no API key, no network calls during play.

- Play (itch.io): https://karimelsedfy.itch.io/glint-world-sprint
- Source: https://github.com/kariemelsedfy/glint-world-sprint
- Jury docs index: [Documentation for judges](#documentation-for-judges)

## How to play

1. **Pick an expedition** from the tickets under the globe. Each one gives you two or three objects.
2. **Read the briefing.** You see a picture and a riddle-like clue for every object. The destination city is deliberately *not* named — the object is the clue (a golden laurel wreath means Rome, a cable-car model means San Francisco).
3. **Press START HUNT.** The clock starts.
4. **Click a pin on the globe** to fly to the city you think is right. Landing anywhere costs a **+5 s entry penalty**, so a wrong guess is survivable but expensive. You can leave and fly again at any time.
5. **Explore on foot** and walk into the glinting framed photo to collect it.
6. **Stuck?** Buy hints: tier 1 **+10 s**, tier 2 **+20 s**, tier 3 **+35 s**. Each tier narrows the search region on the in-city map.
7. **Finish all objects** to see your adjusted time (raw time + penalties), your medal and your personal best. Retry the same expedition to beat it.

### Controls

| Action | Desktop | Touch (landscape) |
|---|---|---|
| Move | `W A S D` or arrow keys | on-screen thumbstick |
| Collect | walk into the item | walk into the item |
| City map | `MAP` button (movement holds while open) | `MAP` button |
| Buy hint | `HINT` button | `HINT` button |
| Back to globe | `GLOBE` button | `GLOBE` button |
| Pause | `Esc` / pause button | pause button |

Pausing or hiding the tab mid-run marks the run as **practice** — it still plays, it just does not set a personal best. Bests are stored in `localStorage` only.

### Content

Five cities — **Paris, Giza, Rome, San Francisco, Berlin** — twelve objects and six expeditions (two to three objects each, always spanning at least two cities). Object placement is **seeded and deterministic**: the same expedition plays identically for every player and every retry, which is what makes the times comparable.

## Run it locally

Requires Node 24.x (see `.nvmrc`).

```bash
npm ci
npm run build && npm run preview   # http://127.0.0.1:4173/
```

`npm run dev` also works for development; use the preview build for evaluation.

```bash
npm run typecheck     # tsc project build
npm test              # Vitest unit tests (rules, content validation, placement)
npm run test:e2e      # Playwright: full loop, rules, fallback, perf probe
npm run package:itch  # writes release/glint-world-sprint-itch.zip (index.html at ZIP root)
npm run check:release # asserts relative asset URLs, no source maps, no stray secrets
```

## APIs, frameworks and tools

**Runtime dependencies** (all bundled; nothing is fetched at runtime):

| Package | Version | Role |
|---|---|---|
| `react`, `react-dom` | 18.3.1 | UI layer and overlay screens |
| `three` | 0.169.0 | WebGL renderer, globe and city scenes |
| `@react-three/fiber` | 8.17.10 | React renderer for Three.js (one Canvas for the whole game) |
| `@react-three/drei` | 9.122.0 | Small Three.js helpers |
| `zustand` | 5.0.3 | Single run store: timer, penalties, hints, transitions, persistence |

**Build and test tooling:** Vite 6.0.7, TypeScript 5.7.3, Tailwind CSS 4.1 (`@tailwindcss/vite`), Vitest 3, Playwright 1.49, Node 24.

**External services used at runtime: none.** No map API, no geocoding, no analytics, no auth, no multiplayer, no leaderboard, no model calls. The whole game is a static bundle; the itch.io build is a ZIP of `dist/` with `index.html` at the root.

**AI tools used during development** (build-time only — see [docs/AI_PROVENANCE.md](docs/AI_PROVENANCE.md) and [docs/ASSET_PROVENANCE.md](docs/ASSET_PROVENANCE.md)):

- **Devin** — one lead integrator session plus ten parallel worker sessions (gameplay/store, globe & travel, five city scenes, UI, content, release/QA), each restricted to its own owned paths, merged serially by the lead.
- **Google AI Studio** — a UI source export supplied by the owner, preserved unmodified in `ai-studio-export/` and used as visual reference for the arcade UI. It is not the shipped 3D game.
- **An image-generation model (via Devin)** — the twelve collectible item illustrations in `src/assets/targets/`. Everything else in the world is procedural geometry and CSS/SVG. The only third-party asset is the self-hosted Anton font (SIL OFL 1.1, licence text committed).

## Technical overview

```
src/
  app/        one <Canvas>, single camera authority (SceneHost), state→UI adapters
  state/      Zustand run store: reducer, clock, penalties, hints, bests, persistence
  game/       grounded movement, collision, deterministic placement, collection, textures
  world/      cartoon globe (cached canvas Earth texture), pins, travel director
  cities/     one folder per city: pure-data definition (bounds, roads, blockers,
              districts, landmarks, sockets) + a scene component that only renders
  content/    targets, clues, expeditions, and validation that placement is fair
  ui/         arcade overlay: menu, briefing, HUD, map, results (no game rules)
  assets/     target image registry (single source of truth for item pictures)
```

Design rules the code holds to, because they are what keeps a multi-agent build coherent:

- **One Canvas, one camera authority.** Scenes never own the camera.
- **City definitions are pure data.** Collision, the in-city map and clue regions all read the same definition — visuals can never disagree with the collision world.
- **The store owns every rule.** UI receives a view model plus callbacks; it cannot change the clock, a penalty or a hint price.
- **Seeded randomness only.** No `Math.random()` anywhere in scored placement.
- **No per-frame React state.** Frame-rate-independent movement with a clamped delta.
- **Reduced motion and a low-quality render path** are first-class settings.

Deeper docs: [docs/TECHNICAL_ARCHITECTURE.md](docs/TECHNICAL_ARCHITECTURE.md), [docs/CONTRACTS.md](docs/CONTRACTS.md), [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md), [docs/CONTENT_AND_LEVELS.md](docs/CONTENT_AND_LEVELS.md), [docs/ART_DIRECTION.md](docs/ART_DIRECTION.md), [docs/DECISIONS.md](docs/DECISIONS.md).

## Documentation for judges

| Question | Document |
|---|---|
| What was the design intent? | [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md), [docs/JURY_PITCH.md](docs/JURY_PITCH.md) |
| How is it built? | [docs/TECHNICAL_ARCHITECTURE.md](docs/TECHNICAL_ARCHITECTURE.md), [docs/CONTRACTS.md](docs/CONTRACTS.md) |
| What was AI-generated, and by which tool? | [docs/AI_PROVENANCE.md](docs/AI_PROVENANCE.md), [docs/ASSET_PROVENANCE.md](docs/ASSET_PROVENANCE.md), [docs/AI_STUDIO_WORKFLOW.md](docs/AI_STUDIO_WORKFLOW.md) |
| What was actually tested? | [docs/QA_AND_PLAYTEST.md](docs/QA_AND_PLAYTEST.md), [docs/BUILD_STATUS.md](docs/BUILD_STATUS.md) |
| Licenses and security posture | [docs/SECURITY_AND_LICENSES.md](docs/SECURITY_AND_LICENSES.md) |
| How the agents were organized | [AGENTS.md](AGENTS.md), [docs/DEVIN_RUNBOOK.md](docs/DEVIN_RUNBOOK.md), [agents/](agents/) |

## Notes for the jury

- **Everything here was built during the hack**, starting from an empty repository plus a planning pack: the scaffold, the contracts, the globe, all five cities, the rules engine and the UI.
- **Honest status:** the loop is complete and playable end to end. The settings screen shows a sound toggle, but **no audio is implemented** in this build. Frame rate on a GPU-less software renderer (our CI box uses SwiftShader) is poor in the denser city scenes; on real hardware with a GPU the cities run smoothly. Measure on your own machine rather than trusting a number from ours.
- **No fabricated metrics.** Numbers in `docs/` are from runs we actually executed, with the machine and renderer noted.
- **Nothing phones home.** You can run the ZIP offline.

## License

Original code, documentation and generated art in this repository are MIT licensed ([LICENSE](LICENSE)). Third-party dependency licenses remain with their owners; see [docs/SECURITY_AND_LICENSES.md](docs/SECURITY_AND_LICENSES.md).
