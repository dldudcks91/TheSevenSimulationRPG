# 챕터 1 스테이지 2 인간 몬스터 — 영웅 그림체 재시안 v4

생성 도구: Codex 내장 `image_gen`. 최종 비교 시트: `src/assets/art/faces/source/sheets/source_sheet_ch1_st2_human_3x3_hero_style_v4.png`.

기존 `ready/monster/1201~1203.png`는 직접 열어 직업과 장비를 확인했다. 이전 시트의 얼굴·자세·광택이 새 시트에 복제되는 것을 막기 위해 생성 입력에서는 제외했다. 아래 다섯 영웅 초상화가 **그림체 참조**다.

1. `src/assets/art/faces/source/ready/hero/archer_1.png`
2. `src/assets/art/faces/source/ready/hero/knight_5.png`
3. `src/assets/art/faces/source/ready/hero/warrior_3.png`
4. `src/assets/art/faces/source/ready/hero/priest_1.png`
5. `src/assets/art/faces/source/ready/hero/warrior_1.png`

## 1차 생성 프롬프트

```text
Create a BRAND-NEW dark-fantasy RPG character portrait comparison sheet. The five attached images are currently installed HUMAN HERO portraits from TheSevenSimulationRPG. They are all STYLE references only, not characters to reproduce. Copy the actual artist's irregular but clean dark outline, dark solid eye treatment, broad asymmetrical facial planes, restrained hand-drawn angular shadows, muted colors, limited armor highlights, small cropped bust, and the generous visible space above the heads. The nine NEW people should look as though they were drawn by the same artist for the same game. In particular, match the generous headroom of the hooded archer reference: its hood begins about 19% down the canvas. Other heads and helmets also need clear upper space. Keep the faces and equipment in each tile unique.

== OUTPUT FORMAT — ALWAYS A 3x3 SHEET ==

Output ONE square image containing a 3x3 grid of NINE different living HUMAN characters, with straight 16px pure black (#000000) divider lines. All tiles share one eye level, comparable head size, one light direction, and the exact style copied from the attached HERO portraits. Each tile is a complete square bust portrait on a visible flat opaque pure green #00FF00 background. Leave generous green above and around every figure, as in the supplied heroes. No tile's hair, hood, or helmet may touch the top divider. The busts are cropped at the bottom edge. A tiny amount of upper chest is visible; no waist or hands.

You generate character bust portraits for a dark-fantasy RPG. COPY THE ATTACHED HERO PORTRAITS' EXACT STYLE: same outline weight and subtle hand-drawn variation, same head-to-body ratio, same muted desaturated palette, same dim lighting, same low level of detail and asymmetry. Do not duplicate any of the actual hero characters. Flat planes, not glossy rendered armor. The nine must look cut from the same existing hero set by the same artist.

Background: flat, opaque pure green #00FF00 edge to edge within every tile, nothing else. Never transparent. No text, watermark, symbols, scenery or weapons in hands.
NEVER: comic book inking, hatching, cross-hatching, wrinkle lines, sketchy or tapered strokes, chibi mascot, sticker art, realistic proportions, bright even lighting, saturated colors, texture.

CHAPTER 1 STAGE 2 — THREE HUMAN MONSTER CLASSES
Every horizontal row has, left to right: human FOOTMAN in charcoal armor with a restrained red cloth accent; human ARCHER with a visible quiver and lighter dark clothing; human KNIGHT in heavier iron armor with a restrained red cloth accent. These are opposing human soldiers, not undead. Vary eye shape, nose, cheek, jaw, mouth, expression, hair, age, and shoulder silhouette rather than repeating one face with a different scar or beard.

Row 1: broad-jawed young footman with short dark hair; narrow clean-shaven hooded archer; long-faced middle-aged knight in an open-face iron helmet.
Row 2: older bald round-faced footman with a plain shoulder plate; lean woman archer with tied-back hair and a quiver, no hood; knight with a closed iron helmet and a simple red mantle.
Row 3: sharp-jawed woman footman with cropped gray hair; weathered older archer with a loose hood and different quiver shape; older moustached knight with a distinct angular breastplate.

Make silhouettes and face proportions clearly different across all three rows, while preserving ONE coherent hero-portrait rendering style.
```

## 2차 수정 프롬프트

입력은 1차 시트, `hero/archer_1.png`, `hero/knight_5.png` 순서였다. 아래 행의 상단 여백만 수정했다.

```text
Edit Image 1 with one focused correction: fix the FRAMING of the entire BOTTOM ROW of the 3×3 character sheet. Keep the top two rows, all nine character identities, expressions, clothing, colors, grid, black dividers and pure opaque green backgrounds visually unchanged. The three bottom-row busts currently begin only about 20–23 pixels below the top of their tiles; the top two rows leave roughly 40–67 pixels. Reduce the bottom-row figures' scale slightly and position them so hair and hood start around 45–65 pixels below their tile top, with green headroom comparable to the first two rows and to the supplied existing hero portraits (Images 2–3). Keep their faces readable and their busts cropped at the bottom. Retain the exact left-to-right bottom row: gray-haired woman footman, elderly bearded hooded archer with quiver, older moustached armored knight. Their face shapes and costumes must remain distinct. Preserve the same simple hand-drawn hero portrait style, solid black eye shapes and muted shading. No extra people, text or watermark. Green #00FF00 backgrounds must remain visible and opaque in every tile.
```
