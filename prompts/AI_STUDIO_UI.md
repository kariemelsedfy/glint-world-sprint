# Paste into Google AI Studio Build mode

Attach `contracts/game.ts` as context before this prompt. This is a generation brief; no output has been generated in AI Studio by this planning pack.

---

Build a beautiful React + TypeScript interface for **GLINT**, a colorful 3D world treasure speedrun for a gaming hackathon. The actual 3D game will be integrated by another agent. Your job is the shipped game interface and its visual design.

The fantasy: read a clue, choose Paris or Giza on a toy globe, dive through clouds into a miniature city, find a famous-object replica, and beat your time. This should feel like a polished casual game, immediately understandable and appealing in a ten-second video.

Use the attached UIModel and UIActions as the interface contract. Export a reusable `GameUI({model, actions})`. You may make a separate preview harness with mocked model data to show screens in your environment, but production UI must not own game rules, timing, scoring, movement, random content, or persistence.

Visual direction: cheerful toy-world adventure. Deep navy #12253B, ocean blue #24B8E8, treasure gold #FFC857, mint #78D896, warm cream #FFF6E5, teal #19A7A0. Rounded but restrained cards, crisp dark text, subtle depth, playful passport-stamp motifs. Scene viewport is the hero. Avoid a large dashboard layout, dense navigation, generic purple gradients, giant glass panels or walls of explanatory copy. Prefer system fonts and original CSS/SVG icons. No external fonts, image URLs or copyrighted game assets.

Deliver these screens/states:

1. **Menu:** compact GLINT wordmark, tagline “Know the landmark. Beat the clock.”, clear Play action, small sound/motion/settings controls. Leave a large transparent area for the 3D globe. Include a compact selector for three trials: Icons, Sky & Sun, Small Wonders.
2. **Briefing:** two illustrated clue cards; “Find both treasures. Fastest adjusted time wins.”; controls summary; Go button. The clock has not started.
3. **Globe HUD:** clue cards and accessible Paris/Giza selection buttons corresponding to game pins; no markers giving away which city contains the clue. Display adjusted elapsed time once playing.
4. **City HUD:** compact timer top center, two objective chips near the top-left, active clue, Map / Hint / Globe controls. Keep the center of the screen clear. Collection briefly stamps the completed objective.
5. **Map overlay:** supplied map geometry, north indicator, player position and broad amber search areas. No navigation routes or exact collectible dots. Small and large map variants must use the same data.
6. **Hint UI:** explain the selected clue's purchased information and the next cost, e.g. “Reveal city · +10s,” then “Reveal district · +20s,” then “Narrow search · +35s.” Prices are incremental. Do not charge twice; dispatch the action only. Already purchased hints remain readable. No button for a collected item.
7. **Results:** adjusted time first, raw time and penalty breakdown below, points, medal, “Best on this device,” a highly visible “Retry this trial,” and secondary “Next trial.” Support a practice/paused label and session-only storage status. Never fake scores or a global leaderboard.
8. **Pause / loading / error:** Resume, Retry, or Back to menu as appropriate. Pause explains that the current run is practice. Recoverable travel errors offer a way out.
9. **Landscape touch controls:** lower-left thumbstick emitting normalized X/Z intent through callbacks, right-side 44px-or-larger buttons. Clear input on cancel/release. In portrait show a compact rotate suggestion without destroying state.

Use DOM/CSS overlays designed to sit over a single existing WebGL canvas. Apply pointer-events only where UI is interactive so the world remains clickable. Use buttons with accessible names, visible keyboard focus, clear disabled states and readable contrast. Respect prefers-reduced-motion plus the provided setting; mute and quality state are controlled props. The 3D scene itself is out of your scope.

Provide clean components and locally scoped CSS under a `ui/` directory, with a tiny separate demo harness to preview representative states at 1280×720 and 844×390. Keep all exported UI stateless with respect to game rules. No server, API calls, Google sign-in, database, multiplayer, Gemini SDK, API key, remote assets, router or runtime AI. Do not put env values into client source. Include a short integration note naming exported files and callbacks. Aim to make the first pass usable immediately.
