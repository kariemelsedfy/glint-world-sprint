# Asset provenance and notices

Status: **Shipped.** No third-party art, models, audio files or photographs are bundled. The world is original procedural Three.js geometry; the collectible item pictures are AI-generated illustrations commissioned for this project.

| Runtime paths / family | Creator / source | Origin | License or terms | Modifications | Attribution / redistribution notes | Verified by |
|---|---|---|---|---|---|---|
| `src/assets/targets/*.jpg` (12 collectible item illustrations) | Generated 2026-09-26 by an image-generation model invoked from the Devin lead session; prompts were flat-cartoon sticker descriptions of each object (e.g. "golden laurel wreath", "San Francisco cable car") in the project palette | AI-generated | Released with this repository under the repository MIT license; no third-party source imagery was supplied as input | Downscaled to 512 px and re-encoded as JPEG | No third-party attribution required; no photographs or copyrighted artwork were used as input | A0 lead integrator (files committed and rendered in-game) |
| All globe, city and prop geometry (`src/world/`, `src/cities/`) | Hand-authored Three.js geometry and cached canvas/SVG textures written by the Devin agent sessions | Original | Repository MIT license | n/a | Landmarks are stylized original silhouettes, not scanned or downloaded models | A0 lead integrator |
| `src/ui/fonts/Anton-Regular.ttf` | Anton by Vernon Adams / Cyreal (Google Fonts) | Third-party | SIL Open Font License 1.1, text committed at `src/ui/fonts/OFL-Anton.txt` | None; bundled unmodified and self-hosted | OFL attribution retained; no runtime CDN or webfont request | A5 UI agent |
| UI art (`src/ui/`) | CSS and inline SVG authored in-repo | Original | Repository MIT license | n/a | n/a | A5 UI agent |
| Audio | **Not shipped.** The settings screen exposes a sound toggle, but no audio files or synthesized audio are implemented in this build. | n/a | n/a | n/a | Disclosed as an unimplemented feature | A0 lead integrator |

Keep any required license text in a committed notices directory. Record dependency licenses separately from art assets. AI-generated output needs the actual service/date/prompt/output record; do not invent an origin or assert exclusive rights. A recognizable landmark theme does not justify using an arbitrary unlicensed photo/model.
