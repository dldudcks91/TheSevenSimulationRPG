# Chapter 1 Stage 2 human portrait sheet, hero style v3

Generated with the built-in `image_gen` tool. Final sheet: `src/assets/art/faces/source/sheets/source_sheet_ch1_st2_human_3x3_hero_style_v3.png`.

## First generation

Reference images, in order:

1. `src/assets/art/faces/source/ready/monster/1201.png` — footman identity and equipment
2. `src/assets/art/faces/source/ready/monster/1202.png` — archer identity and equipment
3. `src/assets/art/faces/source/ready/monster/1203.png` — knight identity and equipment
4. `src/assets/art/faces/source/ready/hero/archer_1.png` — hero art style
5. `src/assets/art/faces/source/ready/hero/knight_5.png` — hero art style

```text
Use case: stylized-concept. Asset type: TheSevenSimulationRPG dark-fantasy game portrait comparison sheet.

REFERENCE ROLES, IN INPUT ORDER:
Images 1–3 are the currently installed human footman, human archer, and human knight. Preserve their class identity, recognizable costume silhouettes, and restrained charcoal/red faction colors, but create NEW faces and variations.
Images 4–5 are existing HERO portraits from this same game. They are the controlling STYLE REFERENCES. Match their artist's line weight, facial construction, black shadow-only eyes, simple flat angular shading, muted color, small cropped bust, restrained armor detail and dim lighting as closely as possible. Every new tile should look like it belongs beside these hero portraits. When identity and style references disagree, use images 4–5 for style.

== OUTPUT FORMAT — ALWAYS A 3x3 SHEET ==

Always output ONE image containing a 3x3 grid of NINE different characters,
separated by straight 16px pure black (#000000) divider lines. All nine tiles
share one eye level, one head size, one light direction, and the exact same
style copied from the attached hero references. Each tile is a complete square bust
portrait on the same flat #00FF00 background.

You generate character bust portraits for a dark-fantasy RPG — COPY THE HERO REFERENCES' EXACT STYLE: same outline weight
and cleanliness, same head-to-body ratio (oversized head, small body cropped by
the bottom edge), same muted desaturated palette, same dim lighting, same level
of simplification. The output must look cut from the same sheet by the same artist.

Only the character identity changes. Background: flat pure green #00FF00,
edge to edge, nothing else.

NEVER: comic book inking, hatching, cross-hatching, wrinkle lines, sketchy or
tapered strokes, chibi mascot, sticker art, realistic proportions, bright even
lighting, saturated colors, texture, scenery, text, watermark.

CHAPTER 1 STAGE 2 — HUMAN MONSTERS
Each horizontal row contains three DIFFERENT living HUMAN characters in this exact left-to-right order: footman, archer, knight. Repeat this order in all three rows. Make three distinct human variants of each class across the sheet. Each row must visibly contain one dark-armored footman, one archer with a quiver, and one more heavily armored knight. Vary face, hair or headwear, age, and shoulder silhouette between rows; no near-duplicates. Keep all characters human, with visible human faces except that one knight may wear a closed helmet. No skulls or undead anatomy. Match the heroes' simple flat treatment especially closely; no glossy armor rendering.
```

## Final revision

Reference images, in order: first generated sheet, `hero/archer_1.png`, `hero/knight_5.png`, `hero/warrior_3.png`.

```text
Edit Image 1, a 3×3 comparison sheet of human monster bust portraits. Keep the 3×3 structure and each row's left-to-right class order: footman, archer with visible quiver, armored knight. REDRAW all nine portraits so their rendering matches the existing game HERO portraits in Images 2–4 as closely as possible. Images 2–4 control the actual art style: same clean black outline thickness, solid black eye shapes, flat angular shadow blocks, restrained muted colors, simple anatomy, dark light direction, minimal detail and portrait framing. Keep the human footman/archer/knight roles and dark gray/red faction identity from Image 1 but do not copy its faces. Create clearly different human identities across each row: change facial shape, age, hair/headwear, expression, and armor silhouette. Make each cell look painted by the same artist as Images 2–4, suitable next to those heroes in the game. In particular, use the HERO portraits' less shiny, less rendered armor and their simple broad facial planes.

OUTPUT CONTRACT: One square image with nine complete square bust portraits in a straight 3×3 grid, clean 16px pure black #000000 divider lines. Every tile has the SAME completely opaque, completely flat pure chroma green #00FF00 background edge to edge. The green must remain visible around the figure. Do not use transparency anywhere. Same eye level, head size and light direction in all tiles. No text or watermark. All nine are living humans, with at most one closed-helmet knight. No photorealism, no hatching, no glossy gradients, no fine wrinkles, no scenery.
```
