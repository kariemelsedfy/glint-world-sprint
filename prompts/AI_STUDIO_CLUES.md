# Paste into Google AI Studio for clue authoring

Supply `docs/CONTENT_AND_LEVELS.md` together with this prompt. This is a requested generation step; the planning pack's starter clues are not represented as actual AI Studio output.

---

You are writing short, fair clues for GLINT, a colorful landmark treasure speedrun. Use ONLY the six target definitions and locations provided in CONTENT_AND_LEVELS.md. These are fictional replicas/souvenirs in simplified miniatures, not claims about real artifact locations or ancient history.

Return JSON with exactly this shape:

```json
{
  "schemaVersion": 1,
  "targets": [
    {
      "id": "paris-smile",
      "clueTitle": "The secret smile",
      "clueText": "A famous smile waits near a glass triangle.",
      "hintText": ["Travel to Paris.", "Search the Louvre courtyard.", "Search outside the glass pyramid, at ground level."]
    }
  ]
}
```

Include all six approved IDs exactly once. Offer one strong version per target, not dozens. Clue titles ≤5 words; clue text ≤18 words; each hint ≤20 words. The initial clue should allow an ordinary player to infer the city/landmark without naming the city directly. It must not depend on specialist dates or obscure trivia. Hint 1 names the city. Hint 2 names the approved landmark/district. Hint 3 describes the approved ground-level search area and must be true for every allowed socket.

Keep tone playful and concise. Preserve the concepts of smile, golden crown, iron giant, lion-bodied guardian, café crescent and blue beetle. Do not invent monuments, facts, directions, coordinates, keys, doors, interiors, climbing or new gameplay. Do not mention a gold cap currently existing on a real pyramid. No directions such as north of a specific object unless they are guaranteed by the supplied layout.

This content will be reviewed and bundled locally. It is not generated during play. Output valid JSON only, without Markdown fences or commentary.
