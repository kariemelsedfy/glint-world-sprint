# Art direction and city construction

## Visual promise

A colorful miniature travel world: rounded silhouettes, chunky proportions, warm lighting, saturated landmark accents, clean readable ground. Think a collectible toy diorama with clear depth. Do not imitate a specific artist or rely on photorealistic satellite textures.

The visual budget goes first to **landmark recognition, explorer readability, pickup feedback and the globe transition**. Keep ordinary buildings simple but consistent. Avoid a polished web landing page wrapped around a gray prototype.

## Shared palette and material rules

| Use | Color |
|---|---|
| Deep UI / outlines | `#12253B` |
| Ocean / primary blue | `#24B8E8` |
| Continent green | `#78D896` |
| Treasure gold | `#FFC857` |
| Off-white panels | `#FFF6E5` |
| Paris stone | `#F6DFC1` |
| Paris roofs | `#48667D` |
| Giza sand | `#E8B969` |
| Giza clay | `#C97550` |
| Shared accent teal | `#19A7A0` |

These are art starting points, not proof that every pairing is accessible. Use dark text on light panels; measure text contrast. Player gets a strong dark outline/base plus a bright scarf/backpack accent. Gold collectibles need a contrasting base and animation so they remain visible on sand. Shadow direction is consistent across globe/cities. Avoid heavy HDR/bloom dependencies.

Use standard or simple toon-like materials, a shared directional light plus ambient/hemisphere fill, and simple blob shadows under the player/collectibles. Landmarks have broad color variation, not a dense texture stack. Use system UI fonts or one locally bundled font with its license recorded.

## Explorer and objects

Build a 2.5–3 unit tall explorer from a head, body, arms, legs and small backpack. It may use primitive meshes and a simple gait sine wave. Facing follows movement smoothly. The same explorer travels everywhere; optional accessories never affect speed or collision.

Collectibles are visibly toy-scale replicas about 1–2 units high, hovering on a small pedestal. A Mona Lisa-inspired collectible can be an original simplified framed face: do not download an arbitrary museum photograph. The pyramidion is a golden pyramid shape on a ground pedestal; do not add climbing. The Eiffel token, medallion, croissant and scarab can all be made from a few primitives.

## Globe

A clean blue sphere with recognizable, deliberately simplified continent shapes; a thin pale atmosphere shell; a few soft clouds; two named pins at approximate anchors Paris (49N,2E), Giza (30N,31E). These are display anchors, not a cartographic accuracy claim. Use original simplified continent geometry or a documented licensed local map texture. Never call Google Earth/Maps, scrape map tiles, or require a live satellite dataset.

Do not show a giant list of unimplemented destinations. Globe click targets and their keyboard-accessible counterparts must select the same IDs. Keep pins legible at menu size and visible only on the near side.

## Paris: compact, immediately legible

144 × 144 units. Warm stone façades, dark mansard-like roofs, striped café awnings, rounded trees, lamp posts, and a simplified river make a Paris-like impression.

| Element | Starter center / footprint | Construction |
|---|---|---|
| Louvre | center (32,-28), footprint X 20..44, Z -36..-20 | Recognizable glass pyramid silhouette with simple surrounding low museum wings |
| Eiffel Tower | center (-34,28), footprint X -43..-25, Z 20..36 | Four tapered legs, two platforms, top spire; ~28–34 units tall, sparse structural bars |
| Café | center (36,32), footprint X 28..44, Z 26..38 | Low frontage, striped awning, terrace props away from pickup sockets |
| River | X -8..8 | Water blocked except three broad bridges centered near Z=-48,0,48 |
| Spawn | (18,0,58) | Clear east-bank arrival plaza; a landmark visible immediately |

River blocker segments can use Z [-72,-54], [-42,-6], [6,42], [54,72], leaving 12-unit bridge openings. Check bridge traversability with expanded player collision, not just visual width. Landmarks and all sockets are specified in CONTENT_AND_LEVELS.md. Ground outside blockers is traversable even if it is not visually a street.

Suggested district centers/radii: Louvre (32,-22), broad 48 / narrow 26; tower (-34,28), 48 / 26; café (36,36), 46 / 24. Verify actual adjusted sockets remain inside both circles.

## Giza: a distinct second city

Use “Giza” as the destination label, rather than pretending the pyramid plateau is downtown Cairo. Golden sand, warm stone pyramids, a chunky Sphinx silhouette, modest market stalls, and a distant low skyline. Include contemporary place cues through ordinary market architecture; avoid making every character an ancient-Egypt costume.

| Element | Starter center / footprint | Construction |
|---|---|---|
| Great Pyramid | center (-30,-26), footprint X -45..-15, Z -41..-11 | Four-sided pyramid ~26 units tall, warm face shading |
| Small pyramids | e.g. (-48,34), away from sockets | Simpler silhouettes, optional if performance allows |
| Sphinx | center (32,14), footprint X 17..47, Z 8..20 | Reclining body, paws, head and headdress silhouette; no detailed sculpture needed |
| Market | center (31,48), footprint X 22..40, Z 42..54 | A few colored canopies and low stalls; keep perimeter sockets clear |
| Spawn | (0,0,58) | Open arrival area with pyramid and Sphinx visible |

Suggested districts: pyramids (-30,-22), broad 50 / narrow 30; Sphinx (30,14), 46 / 26; market (28,48), 45 / 24. Roads are broad sand/stone paths; all nonblocked ground is traversable. No terrain slopes, dunes that conceal collision, tomb interiors or climbing.

## Procedural streets without procedural failure

The user permits generated streets; they do not require a general city generator. P0 uses a small authored connected road/ground layout per city. Seeded generation varies façades, roof colors, trees and props in reserved decoration zones. It must not alter blockers, bridges, target sockets or navigable clearances after validation. Cosmetic randomness has an independent seed.

At most one optional layout template may be added after tests prove it cannot isolate a target. A random maze is counterproductive for landmark recognition and speedrun learning.

## Definition of art done

Deliver three camera screenshots (arrival, landmark close-up, overall city), one walking clip, a reported mesh/draw-call estimate from the renderer if available, and a short note on reused geometry/materials. Verify player visibility, local-map alignment, broad-to-fine search areas, path clearance and low quality mode. A model screenshot alone is not a playable city.

No third-party asset enters the final ZIP without an origin/license record. Procedural original geometry is the fastest default. If a model cannot be acquired and integrated in 15 minutes, build the silhouette from primitives.
