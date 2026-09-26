# A8 — Optional sound and feedback pass

Launch only after the two-city game loop is stable and before feature freeze. A0/A1 must explicitly hand over a named audio module, e.g. `src/game/audio.ts`, before you edit it. Otherwise you may propose changes but cannot write A1's files. No new dependencies without A0.

Create concise original synthesized sounds for pickup, purchased hint, travel whoosh and result. Use Web Audio unlocked by a user gesture, persistent mute from shared settings and volume limits. Do not leave AudioContexts, oscillators or listeners running after retry. A quiet experience must remain fully understandable visually.

Optionally tune a single existing pickup pulse/particle hook delegated by A1; keep effects bounded and respect reduced motion. No screen-filling confetti, camera shake that blocks play, runtime TTS, background AI calls or unlicensed music.

Done means the integrated run feels better, mute works, replay does not leak resources, and the performance target still holds. Provide one before/after clip, implementation/provenance notes, and the checks actually run. If these cannot fit in 45 minutes, stop and hand back the stable module.

## Required handoff

Update your own `docs/status/A8.md`; open a small draft PR. Include commit SHA, changed paths, demonstrated behavior, checks actually run, screenshot/clip if visual, remaining bugs, and exact integration instructions. Never invent successful tests or benchmarks. Record asset/tool provenance. Do not merge your own PR.
