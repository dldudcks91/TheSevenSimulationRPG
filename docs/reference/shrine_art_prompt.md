# 신단 그림 프롬프트 — Codex 발주

> 기획: [base_expedition_design.md §1-2 「신단」](../game_design/base_expedition_design.md) · 남은 칸 [GAME_DESIGN.md §10 「신단의 남은 칸」](../game_design/GAME_DESIGN.md)
> 도구: **Codex 내장 이미지 생성(imagegen)** — 같은 방식의 선례는 [fx_art_prompt.md](fx_art_prompt.md)

> ⚠ **지금 게임은 이 그림을 안 읽는다** — 신단이 화면 어디에 어떻게 뜨는지가 아직 미정이다(§10 「신단의 남은 칸」 ④). 그래서 **어디에 놓아도 쓰이게 투명 배경의 구조물 한 채**로 뽑는다. 화면이 정해지면 `src/assets/art/README.md` 에 `shrines/` 절을 세우고 읽는 코드를 잇는다.

**쓰는 법** — Codex 에 「`docs/reference/shrine_art_prompt.md` 의 §2 지시대로 만들어」라고 준다. §2 가 Codex 가 읽는 지시문 전부다(영어). 일부만 뽑으려면 이름을 짚는다.

## 1. 무엇을 그리나 — 일곱 장

| 파일 | 신단 | 효과 | 그림 | 강조 색 |
|---|---|---|---|---|
| `wrath.webp` | 분노의 신단 | 데미지 + | 그을린 제단 · 불씨 화로 · 꽂힌 녹슨 칼 둘 · 숫양 해골 | 칙칙한 진홍 · 불씨 주황 |
| `sloth.webp` | 나태의 신단 | 쿨타임 감소 + | 한쪽이 가라앉은 이끼 제단 · 쓰러진 모래시계 · 녹아내린 초 · 거미줄 | 잿빛 · 백랍 |
| `lust.webp` | 색욕의 신단 | 흡혈 + | 송곳니 입 조각 · 피가 찬 성배 · 가시덩굴과 시든 장미 | 포도주빛 적색 · 탁한 장밋빛 |
| `envy.webp` | 시기의 신단 | 모든 원소 저항 + | 녹청 슨 제단 · 쇠사슬과 자물쇠 넷 · 한쪽 눈으로 흘겨보는 청동 우상 | 병든 초록 · 녹청 |
| `pride.webp` | 오만의 신단 | 최대 HP + | 금 간 대리석 제단 · 돌 날개 · 쇠띠 두른 돌 심장 위 비뚤어진 왕관 · 보라 깃발 | 칙칙한 보라 · 바랜 금 |
| `gluttony.webp` | 폭식의 신단 | 경험치 + | 부푼 제단 · 앞면이 벌린 아가리 · 갉아먹은 뼈 더미 · 엎어진 잔 | 탁한 주황 · 호박색 |
| `greed.webp` | 탐욕의 신단 | 드랍률 · 골드 획득 + | 동전을 움켜쥔 돌 손 · 흘러넘친 바랜 금화 · 반쯤 열린 쇠 상자 | 바랜 금 · 놋쇠 |

**그림체 기준** — 건물 그림(`buildings/`)과 몬스터 초상(`faces/cartoon/`)과 같은 층에 선다: 굵고 균일한 어두운 외곽선 · 평면 색 + 그림자 1단 · 채도 낮은 중간 명도 · 옛날 느낌의 고어한 다크 판타지. **일곱 장이 한 벌이다** — 받침(2단 네모 돌 받침) · 크기 · 시점은 같고 윗부분과 강조 색만 다르다. 강조 색은 화면의 죄종 색(`icons_source/sins/source.html`)과 같은 색 계열을 채도만 낮춘 것이다.

---

## 2. Codex 지시문 — 아래 전문을 그대로 준다

### ▼ 여기부터 ▼

You are making **shrine sprites** for the dark-fantasy party RPG "The Seven" in this repository. A shrine appears between stages and grants a one-run blessing; there is one shrine per deadly sin. Use the **built-in image generation tool**. Do not edit any code. If the user names only some shrines, make only those.

#### Deliverables

| name | shrine | blessing |
|---|---|---|
| `wrath` | Wrathful Shrine | more damage |
| `sloth` | Slothful Shrine | shorter cooldowns |
| `lust` | Lustful Shrine | life steal |
| `envy` | Envious Shrine | resistance to all elements |
| `pride` | Prideful Shrine | more max HP |
| `gluttony` | Gluttonous Shrine | more experience |
| `greed` | Greedy Shrine | more item find and gold |

**Make `wrath` first.** Once it is installed, attach it as Image 3 to every other generation so all seven share the same base, scale and angle.

For each name:

1. Generate **one 1024×1024 PNG with a transparent background** using the shared STYLE block plus that shrine's block below. Save the raw image as `src/assets/art/shrines/source/<name>.png`.
2. Check it: all four corners fully transparent · the visible pixels stay inside the central 84% (8% clear margin every side) · the visual center of mass is within ±6% of the canvas center · no text, frame, background, ground or cast shadow.
3. Normalize and install: crop to the alpha bounding box → pad to a square so the content spans **88%** of the side, centered → resize to **512×512** (Lanczos) → save as **WebP with alpha**, quality 90, to `src/assets/art/shrines/<name>.webp`. (Python + Pillow is fine.)

When you are done, **look at all seven files in `src/assets/art/shrines/` side by side**. They must read as one set — same base, same camera angle, same scale and margin, same outline weight and shading steps — while each is told apart at a glance by its top piece and accent color. Regenerate any image that breaks the set, then redo step 3 for it. Do not touch any other file.

**If the image tool cannot produce transparency**: generate on a flat pure **#0000FF** background instead (never magenta — the lust shrine is rose; never green — the envy shrine is green), key that color out with a soft 1–2px edge, then continue from step 2. Keep the keyed PNG as the `source` file.

**References** (attach to every generation):
- Image 1 — `src/assets/art/buildings/forge.webp` — the game's **structure rendering and camera angle** (three-quarter view from slightly above, stone blocks, outline, flat shading). Style and angle only; do not draw a forge, sky or ground.
- Image 2 — `src/assets/art/faces/cartoon/monster/1101.webp` — **outline weight, flat shading, muted color**. Style only; do not draw its character.
- Image 3 — `src/assets/art/shrines/wrath.webp` (every shrine after the first) — **set consistency**: copy its base, scale, angle and margin exactly. Do not copy its top piece or colors.

#### STYLE (shared — include in every prompt)

```text
Use case: 2D game prop sprite — a single shrine (a small stone altar structure) standing alone. Transparent background, 1024x1024, exactly one shrine centered on the canvas, nothing else.
Rendering: match Image 1 and Image 2 — clean cartoon, bold uniform dark outline (#0B060C) around every shape, flat base colors with ONE soft shade step and a small highlight, muted mid-value colors (neither pastel nor near-black), gritty old-fashioned dark-fantasy mood. Weathered, cracked, stained and old — never clean or new. Not glossy, not cute, not neon. No glow bloom, no lens flare, no airbrush gradients, no photoreal texture, no 3D render.
Camera: three-quarter view from slightly above, the same angle as the building in Image 1. The front face turns slightly toward the viewer's left.
Set form (same for every shrine): a waist-high altar block of weathered stone standing on a two-step square stone base. The base has the same footprint and proportions every time; the altar block's carving, the piece on top and the accent color are what change. The whole shrine is about as wide as it is tall.
Accent: exactly one accent color family (given below), muted, used on the offering or light and a few details; everything else is stone gray, dark iron, bone and old wood.
Composition: centered, content fills about 84% of the canvas with an 8% empty margin on every side.
Readability: shown small (about 96 to 160px) — 5 to 9 big readable pieces, no tiny details, no strokes thinner than the outline.
No text, no letters, no readable runes, no numbers, no characters or living creatures, no background, no ground, no cast shadow, no frame, no watermark.
```

#### wrath

```text
WRATHFUL SHRINE (wrath — grants more damage): the altar block is charred black stone with deep cracks. On top sits a heavy iron brazier bowl heaped with smoldering embers and 3 to 4 short ragged flame tongues. Two rusted, notched swords are driven point-down into the top on either side of the brazier, leaning slightly toward each other. A horned ram skull is nailed to the front face with 2 big iron spikes. Dark dried blood runs down 2 carved grooves below the skull. Accent: muted crimson and ember orange (embers, flames, blood).
```

#### sloth

```text
SLOTHFUL SHRINE (sloth — grants shorter cooldowns): the altar block is slumped and half-sunk on one side, mossy and cracked, as if it sagged over centuries. On top lies a large tarnished hourglass tipped on its side, its dull sand spilled in a heap. Two thick melted-down candles with long drooping wax drips flank it, their flames small and lazy. Heavy old cobwebs hang in 2 swags across the front face. Accent: ash gray and dull pewter with pale dusty-sand highlights (sand, candle flames, cobwebs). No blue.
```

#### lust

```text
LUSTFUL SHRINE (lust — grants life steal): the front face of the altar block is carved as a large stone mouth with 2 long fangs, a thin stream of dark blood dripping from it. On top sits a wide stone chalice brimming with thick wine-dark blood, a few drops running over the lip. A thorny briar vine with 3 wilted dark roses coils around the block, and a torn strip of faded silk is draped over one corner. Accent: muted wine red and dusty rose (blood, roses, silk). Seductive but grim, not cute; no heart symbols.
```

#### envy

```text
ENVIOUS SHRINE (envy — grants resistance to all elements): the altar block is streaked with green verdigris and wrapped tightly in 2 heavy iron chains held shut by 4 big iron padlocks, like a warded vault. On top stands a small hooded bronze idol whose face is one huge carved eye glaring sideways with resentment. A faint green light seeps from the cracks in the stone. Accent: muted sickly green and verdigris (the eye, the streaks, the seeping light). No fire, ice, lightning or other elemental colors.
```

#### pride

```text
PRIDEFUL SHRINE (pride — grants more max HP): the most stately of the set but on the same base — a pale, cracked marble-like altar block with 2 small stone wings on its upper corners, perfectly symmetrical. On top rests a large anatomical heart carved in dark red stone, bound by 2 tarnished iron bands, with a tarnished gold crown sitting crookedly on it. A tattered violet banner hangs down the front face. Accent: muted royal violet (banner, dull gems in the crown) with a little tarnished gold. Majestic but decaying; the heart is anatomical, never a heart symbol.
```

#### gluttony

```text
GLUTTONOUS SHRINE (gluttony — grants more experience): the altar block is squat and bloated, its front face carved as a huge gaping maw with jagged stone teeth. On top, a cracked stone platter is heaped with gnawed bones — 5 to 6 big bones and one rib cage — and a toppled goblet spills thick amber liquid over the edge. Two fat tallow candles burn at the back corners. Accent: muted burnt orange and amber (candle flames, spilled liquid, a dull glow inside the maw).
```

#### greed

```text
GREEDY SHRINE (greed — grants more item find and gold): from the top of the altar block a stone hand rises, clutching a fistful of coins, while a heap of tarnished gold coins spills over the top and down one corner with 2 or 3 chunky dull gems among them. A small iron-bound chest sits half-open behind the hand. Iron nails and a rusted lock plate are set into the front face. Accent: muted old gold and brass (coins, chest trim); the gems stay dull, not sparkling.
```

### ▲ 여기까지 ▲

---

## 3. 받은 뒤

- 게임은 아직 안 읽는다(위 ⚠). 화면이 정해지면 `src/assets/art/README.md` 에 `shrines/` 절을 세우고, 읽는 코드와 함께 잇는다
- 한 장만 다시 뽑으려면 §2 에서 그 이름 하나만 시킨다 — 같은 파일을 덮어쓴다. `wrath` 를 다시 뽑으면 나머지와 한 벌이 맞는지 다시 본다(나머지의 Image 3 이다)
- 원본(`shrines/source/`)은 게임이 안 읽는다 — 다시 줄이거나 고칠 때의 출처다

---
*마지막 업데이트: 2026-09-29*
