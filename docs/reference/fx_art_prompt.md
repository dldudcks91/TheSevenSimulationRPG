# 타격 그림 프롬프트 — Codex 발주 (관전 연출 3단계)

> 화면: [SCREEN_DESIGN §4-2 「연출」](../client/SCREEN_DESIGN.md) · 결정 [ADR-0406](../client/adr/0406-관전-연출은-세-단계이고-단계마다-따로-켜고-끈다.md) · 코드 `src/ui/fx.js`
> 도구: **Codex 내장 이미지 생성(imagegen)** — 투명 배경으로 뽑은 선례는 [output/ch2_ent_concepts/3x3_generation_prompt.md](../../output/ch2_ent_concepts/3x3_generation_prompt.md)

**쓰는 법** — Codex 에 「`docs/reference/fx_art_prompt.md` 의 §2 지시대로 만들어」라고 준다. §2 가 Codex 가 읽는 지시문 전부다(영어).
그림 다섯 장이 `src/assets/art/fx/` 에 들어가면 **코드는 안 고쳐도 된다** — 게임이 그 파일을 찾아 쓴다. 새로고침(Ctrl+F5) 후 상단바 `FX` 의 **3** 이 켜져 있으면 스킬 타격에 뜬다.

## 1. 무엇을 그리나

| 파일 | 피해 종류 | 그림 | 대신하는 2단계 모양 |
|---|---|---|---|
| `physical.webp` | 물리 | 베기 자국 + 피 튐 | 베기 궤적 |
| `fire.webp` | 화염 | 불길이 터지는 모양 + 불똥 | 불똥 |
| `cold.webp` | 냉기 | 얼음 조각이 터지는 모양 | 얼음 조각 |
| `lightning.webp` | 전기 | 번개 갈래가 꽂히며 튀는 불꽃 | 번개 갈래 |
| `poison.webp` | 독 | 독액이 튀는 모양 + 방울 | 독 방울 |

**화면에서 어떻게 쓰이나** — 스킬로 맞은 카드의 초상(101px) 위에 **약 124px**(치명 152px)로 뜨고, 0.4초 동안 커지며 살짝 돌고 사라진다. 그래서 **작게 · 짧게 봐도 한눈에 읽혀야 한다** — 큰 도형 몇 개, 잔디테일 없음.

**그림체 기준** — 초상과 같은 층에 선다: 굵고 균일한 어두운 외곽선 · 평면 색 + 그림자 1단 · 채도 낮은 중간 명도 · 옛날 느낌의 고어한 다크 판타지. 네온 · 번짐 빛 · 렌즈 플레어 · 에어브러시 그라디언트 · 실사 질감은 안 된다.

---

## 2. Codex 지시문 — 아래 전문을 그대로 준다

### ▼ 여기부터 ▼

You are making **five combat hit-effect sprites** for the dark-fantasy party RPG "The Seven" in this repository. Use the **built-in image generation tool**. Do not edit any code — the game already loads these files by name.

#### Deliverables

| name | effect |
|---|---|
| `physical` | slash cut + blood splatter |
| `fire` | fire burst |
| `cold` | ice shard burst |
| `lightning` | forked lightning strike |
| `poison` | venom splash |

For each name:

1. Generate **one 1024×1024 PNG with a transparent background** using the shared STYLE block plus that effect's block below. Save the raw image as `src/assets/art/fx_source/<name>.png`.
2. Check it: all four corners fully transparent · the effect's visible pixels stay inside the central 84% (8% clear margin every side) · the visual center of mass is within ±6% of the canvas center · no text, frame, background or ground.
3. Normalize and install: crop to the alpha bounding box → pad to a square so the content spans **86%** of the side, centered → resize to **384×384** (Lanczos) → save as **WebP with alpha**, quality 90, to `src/assets/art/fx/<name>.webp`. (Python + Pillow is fine.)

After all five exist, **look at them side by side**. They must read as one set — same outline weight, same shading steps, same scale and margin. Regenerate any image that breaks the set, then redo step 3 for it. Do not touch any other file.

**If the image tool cannot produce transparency**: generate on a flat pure **#FF00FF** background instead (never green — the poison effect is green), key that color out with a soft 1–2px edge, then continue from step 2. Keep the keyed PNG as the `fx_source` file.

**References** (attach both to every generation):
- Image 1 — `src/assets/art/faces/cartoon/monster/1101.webp` — the game's **rendering style** (outline, flat shading, muted color). Style only; do not draw its character.
- Image 2 — `src/assets/art/icons/skills/mag_frostnova.webp` — **shape boldness only** (few large readable pieces radiating from the center). Ignore its pale monochrome color.

#### STYLE (shared — include in every prompt)

```text
Use case: 2D game VFX sprite — a single hit-impact stamp. Transparent background, 1024x1024, exactly one effect centered on the canvas, nothing else.
Rendering: match Image 1 exactly — clean cartoon, bold uniform dark outline (#0B060C) around every shape, flat base colors with ONE soft shade step and a small highlight, muted mid-value colors, gritty old-fashioned dark-fantasy mood. Not glossy, not cute, not neon. No glow bloom, no lens flare, no airbrush gradients, no photoreal texture, no 3D render.
Shape language: Image 2 only for how bold and few the pieces are. Do not copy its colors.
Composition: an impact bursting outward from the exact center of the canvas, as if striking a target at the center. Content fills about 80% of the canvas with an 8% empty margin on every side, balanced weight in all directions (no single long tail).
Readability: shown at about 120px over a character portrait for 0.4 seconds — 5 to 9 big pieces, no tiny details, no strokes thinner than the outline.
No text, no characters, no weapons, no background, no ground, no frame, no watermark.
```

#### physical

```text
BLOOD SLASH: one thick crescent slash cut, a pale steel-white streak from lower-left to upper-right across the center, with a burst of dark crimson blood flung outward from its middle — 6 to 8 chunky droplets and two short splashes. Blood is deep muted crimson with a darker shade, not bright red. Gory but graphic, not realistic.
```

#### fire

```text
FIRE BURST: ragged flame tongues bursting outward from the center like a fireball impact — 6 to 7 flame tongues curling outward and slightly upward, plus 4 to 5 chunky embers. Muted burnt orange and dull red with a pale yellow-orange core. No smoke clouds.
```

#### cold

```text
ICE BURST: 7 to 9 jagged ice crystal shards exploding outward from the center, each a sharp faceted spike, plus a few small broken ice chips. Muted frost blue with pale icy highlights and a steel-blue shade. No snowflakes, no mist.
```

#### lightning

```text
LIGHTNING STRIKE: two or three thick forked zigzag lightning bolts striking down into the center, ending in a small crackling star-shaped spark burst with 4 to 5 short jagged spark fragments. Pale muted yellow with a near-white core and a dull gold shade. No glow haze, no clouds.
```

#### poison

```text
VENOM SPLASH: a thick splash of sickly venom bursting outward from the center — a central splat with 6 to 8 heavy droplets flung outward and two or three small bubbles. Muted toxic olive green with a yellow-green highlight and a dark moss shade. Viscous, not watery.
```

### ▲ 여기까지 ▲

---

## 3. 받은 뒤

- 게임에서 본다 — `start.bat` → 원정 관전 → 상단바 `FX` 의 **3** 을 켠 채 스킬 타격을 본다. 2 를 끄면 그림만 남는다
- 한 종류만 다시 뽑으려면 §2 에서 그 이름 하나만 시킨다 — 같은 파일을 덮어쓴다
- 원본(`fx_source/`)은 게임이 안 읽는다 — 다시 줄이거나 고칠 때의 출처다

---
*마지막 업데이트: 2026-09-28*
