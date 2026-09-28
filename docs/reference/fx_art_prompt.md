# 스킬 이펙트 그림 프롬프트 — Codex 발주 (관전 연출)

> 화면: [SCREEN_DESIGN §4-2 「연출」](../client/SCREEN_DESIGN.md) · 결정 [ADR-0411](../client/adr/0411-스킬-이펙트는-종류마다-그림-한-장이-먼저다-그림이-없으면-코드-모양.md) → [ADR-0412](../client/adr/0412-스킬-이펙트는-코드-모양이다-그림은-나중에-전직-스킬에만.md) · 코드 `src/ui/fx.js`
> 도구: **Codex 내장 이미지 생성(imagegen)** — 투명 배경으로 뽑은 선례는 [output/ch2_ent_concepts/3x3_generation_prompt.md](../../output/ch2_ent_concepts/3x3_generation_prompt.md)

> ⚠ **지금 게임은 이 그림을 안 읽는다** [2026-09-28 ADR-0412] — 스킬 이펙트는 코드로 그린 모양으로 정했고, 그림은 **나중에 전직 스킬에만** 넣는다. 그때 무엇을 그릴지(스킬마다 · 갈래마다 · 종류마다)를 정하고 이 문서를 고쳐 쓴다. 아래 지시문 · 규격(투명 · 86% · 384 WebP · 한 벌 맞추기)은 그대로 출발점이다. 그림을 넣어도 `fx.js:ART_ON` 을 켜기 전에는 화면에 안 뜬다.

**쓰는 법** — Codex 에 「`docs/reference/fx_art_prompt.md` 의 §2 지시대로 만들어」라고 준다. §2 가 Codex 가 읽는 지시문 전부다(영어). 일부만 뽑으려면 이름을 짚는다.

## 1. 무엇을 그리나 — 열 장

| 파일 | 언제 뜨나 | 그림 | 움직임(코드) | 상태 |
|---|---|---|---|---|
| `physical.webp` | 물리 스킬 타격 | 베기 자국 + 피 튐 | 커지며 돌고 사라짐 | 있음 |
| `fire.webp` | 화염 스킬 타격 | 불길이 터지는 모양 + 불똥 | 〃 | 있음 |
| `cold.webp` | 냉기 스킬 타격 | 얼음 조각이 터지는 모양 | 〃 | 있음 |
| `lightning.webp` | 전기 스킬 타격 | 번개 갈래가 꽂히며 튀는 불꽃 | 〃 | 있음 |
| `poison.webp` | 독 스킬 타격 | 독액이 튀는 모양 + 방울 | 〃 | 있음 |
| `blast.webp` | 자폭(종류 없는 고정 피해) | 잿빛 폭발 + 파편 | 〃 | **없음** |
| `heal.webp` | 스킬 회복 | 초록 치유 빛이 감돌며 오름 | 떠오르며 사라짐 | **없음** |
| `buff.webp` | 좋은 창(강화) | 녹슨 금빛 위쪽 문양 | 떠오르며 사라짐 | **없음** |
| `debuff.webp` | 나쁜 창(약화 · 상태이상) | 가라앉는 보랏빛 저주 연기 | 내려앉으며 사라짐 | **없음** |
| `barrier.webp` | 방벽 | 둥근 방패 껍질(가운데가 빈다) | 한 번 부풀었다 사라짐 | **없음** |

**화면에서 어떻게 쓰이나** — 그 카드의 초상(101px) 위에 **약 83px**(치명 101px)로 0.4~0.6초 뜬다. 그래서 **작게 · 짧게 봐도 한눈에 읽혀야 한다** — 큰 도형 몇 개, 잔디테일 없음.

**그림체 기준** — 초상과 같은 층에 선다: 굵고 균일한 어두운 외곽선 · 평면 색 + 그림자 1단 · 채도 낮은 중간 명도 · 옛날 느낌의 고어한 다크 판타지. 네온 · 번짐 빛 · 렌즈 플레어 · 에어브러시 그라디언트 · 실사 질감 · 귀여운 모양(하트 · 별 얼굴)은 안 된다.

---

## 2. Codex 지시문 — 아래 전문을 그대로 준다

### ▼ 여기부터 ▼

You are making **combat effect sprites** for the dark-fantasy party RPG "The Seven" in this repository. Use the **built-in image generation tool**. Do not edit any code — the game already loads these files by name. If the user names only some effects, make only those.

#### Deliverables

| name | effect |
|---|---|
| `physical` | slash cut + blood splatter |
| `fire` | fire burst |
| `cold` | ice shard burst |
| `lightning` | forked lightning strike |
| `poison` | venom splash |
| `blast` | self-destruct explosion (no element) |
| `heal` | rising healing light |
| `buff` | empower mark (rising) |
| `debuff` | sinking curse |
| `barrier` | protective shield shell |

For each name:

1. Generate **one 1024×1024 PNG with a transparent background** using the shared STYLE block plus that effect's block below. Save the raw image as `src/assets/art/fx_source/<name>.png`.
2. Check it: all four corners fully transparent · the effect's visible pixels stay inside the central 84% (8% clear margin every side) · the visual center of mass is within ±6% of the canvas center · no text, frame, background or ground.
3. Normalize and install: crop to the alpha bounding box → pad to a square so the content spans **86%** of the side, centered → resize to **384×384** (Lanczos) → save as **WebP with alpha**, quality 90, to `src/assets/art/fx/<name>.webp`. (Python + Pillow is fine.)

When you are done, **look at every file in `src/assets/art/fx/` side by side** (including ones that already existed). They must read as one set — same outline weight, same shading steps, same scale and margin. Regenerate any new image that breaks the set, then redo step 3 for it. Do not touch any other file.

**If the image tool cannot produce transparency**: generate on a flat pure **#FF00FF** background instead (never green — the poison and heal effects are green), key that color out with a soft 1–2px edge, then continue from step 2. Keep the keyed PNG as the `fx_source` file.

**References** (attach both to every generation):
- Image 1 — `src/assets/art/faces/cartoon/monster/1101.webp` — the game's **rendering style** (outline, flat shading, muted color). Style only; do not draw its character.
- Image 2 — `src/assets/art/fx/fire.webp` if it exists, otherwise `src/assets/art/icons/skills/mag_frostnova.webp` — **set consistency and shape boldness** (few large readable pieces). Do not copy its colors or subject.

#### STYLE (shared — include in every prompt)

```text
Use case: 2D game VFX sprite — a single combat effect stamp. Transparent background, 1024x1024, exactly one effect centered on the canvas, nothing else.
Rendering: match Image 1 exactly — clean cartoon, bold uniform dark outline (#0B060C) around every shape, flat base colors with ONE soft shade step and a small highlight, muted mid-value colors, gritty old-fashioned dark-fantasy mood. Not glossy, not cute, not neon. No glow bloom, no lens flare, no airbrush gradients, no photoreal texture, no 3D render.
Shape language: Image 2 only for set consistency and how bold and few the pieces are. Do not copy its colors or subject.
Composition: the effect is centered on the canvas as if happening on a target at the center. Content fills about 80% of the canvas with an 8% empty margin on every side, balanced weight (no single long tail).
Readability: shown at about 80px over a character portrait for about half a second — 5 to 9 big pieces, no tiny details, no strokes thinner than the outline.
No text, no numbers, no characters, no weapons, no background, no ground, no frame, no watermark.
```

#### physical

```text
BLOOD SLASH (impact bursting outward from the center): one thick crescent slash cut, a pale steel-white streak from lower-left to upper-right across the center, with a burst of dark crimson blood flung outward from its middle — 6 to 8 chunky droplets and two short splashes. Blood is deep muted crimson with a darker shade, not bright red. Gory but graphic, not realistic.
```

#### fire

```text
FIRE BURST (impact bursting outward from the center): ragged flame tongues bursting outward like a fireball impact — 6 to 7 flame tongues curling outward and slightly upward, plus 4 to 5 chunky embers. Muted burnt orange and dull red with a pale yellow-orange core. No smoke clouds.
```

#### cold

```text
ICE BURST (impact bursting outward from the center): 7 to 9 jagged ice crystal shards exploding outward, each a sharp faceted spike, plus a few small broken ice chips. Muted frost blue with pale icy highlights and a steel-blue shade. No snowflakes, no mist.
```

#### lightning

```text
LIGHTNING STRIKE (impact at the center): two or three thick forked zigzag lightning bolts striking down into the center, ending in a small crackling star-shaped spark burst with 4 to 5 short jagged spark fragments. Pale muted yellow with a near-white core and a dull gold shade. No glow haze, no clouds.
```

#### poison

```text
VENOM SPLASH (impact bursting outward from the center): a thick splash of sickly venom — a central splat with 6 to 8 heavy droplets flung outward and two or three small bubbles. Muted toxic olive green with a yellow-green highlight and a dark moss shade. Viscous, not watery.
```

#### blast

```text
SELF-DESTRUCT EXPLOSION (impact bursting outward from the center, no element): a chunky ragged ring of ash-gray smoke puffs bursting outward, with 6 to 8 broken stone and bone fragments flung out and a small dull ember-orange core at the very center. Mostly ash gray and dirty brown; the orange stays small. Not a fireball (that is the fire effect), no mushroom cloud.
```

#### heal

```text
HEALING LIGHT (not an impact — it rises): a gentle upward swirl of pale healing light — 5 to 7 rounded leaf-shaped and droplet-shaped motes spiraling upward around a small four-pointed sparkle at the center, the swirl slightly taller than wide. Muted sage green with a pale mint highlight and a dark moss shade. Calm, not holy gold (that is the buff). No red cross, no hearts, no plants with stems.
```

#### buff

```text
EMPOWER MARK (not an impact — it rises): three stacked upward-pointing chevron marks of tarnished old gold rising out of a small ring burst at the bottom center, like a battle blessing carved in metal. Muted old gold with a pale yellow highlight and a bronze shade. No halo, no wings, no crown, no arrows with shafts, no text or numbers.
```

#### debuff

```text
CURSE (not an impact — it sinks): a heavy drooping plume of dark violet smoke pressing down from the upper half toward the center, with 2 to 3 thick dripping tendrils hanging below and a small cracked angular sigil inside the smoke. Muted violet-purple and bruise-black with a dull magenta highlight. Oppressive, not cute; no skull face, no eyes.
```

#### barrier

```text
WARD SHIELD (not an impact — it swells): a round protective shield shell like a bubble made of 5 to 6 thick interlocking pale steel-blue plates forming a ring, with a few short cracks of pale light between the plates. The CENTER IS EMPTY (fully transparent) so the character behind shows through — only the ring of plates is drawn. Muted steel blue with a pale highlight and a slate shade. Flat opaque colors, no real transparency effects, no glow.
```

### ▲ 여기까지 ▲

---

## 3. 받은 뒤

- 게임에서 보려면 `fx.js:ART_ON` 을 켜야 한다(위 ⚠ — 지금은 꺼 둔다). 켜면 원정 관전에서 그 종류의 스킬이 나갈 때 뜬다
- 한 종류만 다시 뽑으려면 §2 에서 그 이름 하나만 시킨다 — 같은 파일을 덮어쓴다
- 원본(`fx_source/`)은 게임이 안 읽는다 — 다시 줄이거나 고칠 때의 출처다

---
*마지막 업데이트: 2026-09-28*
