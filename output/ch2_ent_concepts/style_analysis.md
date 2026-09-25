# Chapter 2 stage 2 Ent portrait style analysis

Status: the current Ent sheets are rejected comparison drafts. No ready portraits or monster data have been changed.

## Images inspected

- Actual in-game monster WebPs: `1101`, `1102`, `1103` (goblins), `1201`–`1203` (humans), `1301`, `1302`, `1303` (skeletons), `1401` (imp), `2101`, `2102` (orcs), and `2403` (naga).
- Actual in-game hero WebPs: `warrior_1`, `warrior_4`, `knight_1`, `knight_3`, `archer_1`, `mage_1`, and `priest_1`.
- Rejected Ent comparison: `src/assets/art/faces/source/_scratch/ch2_ent_3x3_ingame_goblin_skeleton_v2_green_grid.png`. Its first-row roles were also viewed individually on a dark background at 256px in `_scratch/ch2_ent_ingame_style_compare_*.png`.

## Shared portrait language

- Clean, fairly even dark contour; broad, readable face and gear shapes. Fine marks are sparse and purposeful.
- A flat base color, one broad shadow step, and small highlights on rounded surfaces. Some portraits have accents, but most of each face stays low saturation.
- Nearly frontal or modest three-quarter bust. The face, dark eyes, brow, nose, and mouth carry the expression. Shoulders and one simple class cue support it.
- The current framing guide calls for a head (including hood, helmet, horns, etc.) about 65–75% of portrait height, 5–10% top margin, eyes near the vertical middle, and only shoulders/upper chest below the chin. Compare at actual 256px monster size and 44px UI size.

## Why the Ent drafts look separate

1. The Ent faces use many nested bark planes and grooves; the reference goblin, skeleton, human, and hero faces rely on a few larger planes. The Ents look rendered in depth rather than drawn as the existing clean cartoon portraits.
2. Branch crowns and mushrooms consume too much attention. The actual eyes, brow, nose, and mouth occupy a relatively small and low part of each cell; the face loses priority at game size.
3. Several Ents turn further sideways and stretch into long old-man faces. The game portraits are more frontal, more compact, and have stronger species-specific face shapes.
4. Across the Ent sheet the same brow, long nose, empty eye, and downturned mouth recur. Crown changes do not create nine clearly different faces.
5. Lower saturation alone did not solve the mismatch. The latest sheet is darker, but its form and detail density still differ. The green background is a keying work surface, not part of the in-game style.

## Next generation criteria

Use actual `cartoon/monster` and `cartoon/hero` portraits as style references and the stage 202 tree only for anatomy. Keep the generation prompt short per `.claude/skills/art-prompt/SKILL.md`: the portrait references should carry proportions, linework, and shading. Make each Ent face from a few large wood planes, with a distinct compact silhouette and one readable class cue. Review individual cells against in-game WebPs on a dark background at 256px and 44px before calling a sheet a candidate.

