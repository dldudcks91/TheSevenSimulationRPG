# 몬스터 일러스트 프롬프트 — CH1-1 파멸의 진영

> 기준 배경: `src/assets/art/backgrounds/background_stage_101.webp` (계승 포크, 읽기 전용)
> 대상: `src/data/monster.csv` 의 chapter=1 · stage_num=1 (4종)
> 목적: **신규 몬스터 아트를 계승 배경의 팔레트·픽셀 밀도에 맞춰 뽑기 위한 프롬프트 SSOT**

---

## 0. 왜 이 문서가 필요한가

계승 얼굴 아트(`faces/face_1101.png` 등 5종)는 원작 TheSevenRPG에서 크롭한 것이라
**배경과 톤이 맞지 않는다.** 고블린 2종은 채도 높은 형광 녹색인데, 배경은 채도가 죽은
회갈색에 잉걸불만 점처럼 박힌 그림이다. 한 화면에 올리면 캐릭터만 붕 뜬다.

신규 아트는 계승 얼굴이 아니라 **배경**을 기준으로 삼는다. 아래 팔레트는 배경 이미지를
직접 측정해서 뽑은 값이다.

---

## 1. 배경 측정 결과 (2026-08-25)

`background_stage_101.webp` (2752×1536) 실측:

| 항목 | 값 |
|---|---|
| 네이티브 픽셀 격자 | 블록 5~6px → **약 500×280 원본을 5.5배 확대** |
| 지배색 (약 85%) | 목탄 회색 `#323232` `#0E0E0E` `#010101` · 그을음 갈색 `#281B18` `#1E1210` `#3C2823` `#46322B` |
| 중간톤 | 탄 점토 `#53291E` `#7A4124` `#643B22` `#493329` |
| 잉걸불 강조 | `#C42A0B` `#A62912` `#F16D28` `#D46D3D` `#C94C24` |

**핵심 제약: 잉걸불은 화면의 0.9%뿐이다.**
불타는 전장이지만 불은 액센트로만 쓰이고 나머지는 전부 죽은 회갈색이다.
이 비율을 지키는 것이 "배경에 맞춘다"의 실질적 정의다.

측정 방법: 인접 열/행 차분으로 블록 주기 추정 + MEDIANCUT 24색 양자화 + 밝기·채도
임계(`max>140 & sat>0.45`)로 잉걸불 화소만 분리.

---

## 2. 공통 스타일 블록

모든 몬스터 프롬프트 앞에 그대로 붙인다.

```
16-bit pixel art, full-body character sprite, side-facing 3/4 view, dark fantasy.
PALETTE — locked to a burning siege-ruin battlefield: desaturated charcoal grays
(#323232, #1E1210, #0E0E0E), soot browns (#281B18, #3C2823, #46322B), scorched clay
mid-tones (#53291E, #7A4124, #643B22). Ember accent (#C42A0B, #A62912, #F16D28)
strictly limited to under 5% of the sprite area — ember is punctuation, not a wash.
No color outside this ramp except the creature's own skin tone.
RENDERING — chunky visible square pixels, ~16px block on a 1024 canvas, hard-edged
dithering only. No anti-aliasing, no gradients, no smooth shading, no glow bloom.
Thin dark outline (#0A0806), one pixel, not a thick cartoon outline.
LIGHT — single low warm key from below-behind (ground fire) catching the top edges
and one shoulder; cold ash-gray fill from above; deep crushed blacks in the core shadow.
OUTPUT — plain flat white background (#FFFFFF), no ground shadow, no scenery, no text,
no frame, no border. Character centered, full body visible, feet near the bottom margin.
```

### 네거티브 프롬프트

```
smooth shading, anti-aliasing, gradients, glossy highlights, 3D render, painterly,
cel-shaded anime, bright saturated colors, neon, lime green, teal, purple, white outline,
drop shadow, background scenery, ground plane, text, watermark, multiple characters
```

각 항목이 막는 것:

| 항목 | 이유 |
|---|---|
| `smooth shading, anti-aliasing, gradients` | 픽셀아트 붕괴 1순위. 블록 경계가 뭉개지면 배경과 안 붙는다 |
| `bright saturated colors, neon, lime green` | 생성기 기본값이 쨍한 쪽. 계승 `face_1101` 이 정확히 이 사고 |
| `glossy highlights, 3D render, painterly` | "판타지 몬스터" 입력 시 아트스테이션풍 3D로 끌려감 |
| `white outline, drop shadow` | 흰 배경 flood fill 제거가 깨져 테두리에 흰 링이 남는다 |
| `background scenery, ground plane` | 배경이 들어가면 크롭·투명화 파이프라인이 무의미 |
| `text, watermark` | 생성기가 멋대로 넣는 서명·글자 |
| `multiple characters` | 1 스프라이트 = 1 개체 보장 |

---

## 3. 크기 규격 (`monster.csv:size_type`)

`size_type` 은 **전투에는 안 쓰기로 확정됐다** [2026-08-31, monster_design.md §7] — 진형·타겟팅 대기용 보류가 아니라 **아트 발주 전용 분류로 존치**가 최종 결론이다.

| size_type | 기준 | 캔버스 세로 점유 | CH1-1 해당 |
|---|---|---|---|
| 1 (소) | 인간 병사 어깨 높이 이하 | **~60%** | 고블린 척후병 · 고블린 전사 |
| 2 (중) | 인간의 1.5배, 폭이 더 크다 | **~78%** | 오크 전사 |
| 3 (대) | 인간의 2.5배, 프레임을 밀어낸다 | **~95%** | 아바돈 |

프롬프트에 `occupies ~60% of the canvas height` 형태로 명시한다.
이 문장이 없으면 생성기가 전부 화면을 꽉 채워 뽑아서 **크기 서열이 사라진다.**

> ⚠ 이 세로 점유율은 **전신 마스터에만 적용된다.** 인게임 표시는 얼굴 크롭이라(§3-2)
> 크기 차등이 화면에 나타나지 않는다 — 아레나 칸이 일반 46px / 보스 58px 로 26% 차이뿐이다.
> 등급 차등의 시각 표현은 크기가 아니라 **프레임 장식**이 담당한다 (`.face.boss` 테두리 강조).

---

## 3-2. 전신 vs 얼굴 — 전신으로 뽑고 얼굴로 크롭한다

**생성은 전신, 인게임 표시는 얼굴 크롭.** 계승 파이프라인(1024 전신 → 머리 256 크롭)과 같다.

### 표시 자리 실측

| 위치 | 규격 | 형태 | 코드 |
|---|---|---|---|
| 편성·리포트 칩 | 26px | 원형 `cover` 118% | `style.css` `.face` |
| 도감 카드 | 38px | 원형 `contain` | `style.css` `.mon-card .face` |
| 큰 칩 | 44px | 원형 | `style.css` `.face.lg` |
| 전투 아레나 | 46px (보스 58px) | 사각 `contain` | `style.css` `.sprite` |
| 새 게임·선술집 헤드 | 52px / 40px | 원형 | `style.css` `.ng-head .face.lg` |

### 왜 얼굴인가

- 표시 칸이 전부 26~58px 이다. 전신을 46px 에 넣으면 대두 고블린도 머리가 11px, 아바돈은 6px —
  식별이 물리적으로 불가능하다. 같은 칸에 얼굴만 넣으면 정보량이 4~7배
- **6개 자리 중 5개가 원형**이다. 원형은 전신과 상극 — 팔다리·무기가 잘리고 몸통만 남는다
- 코어 루프가 관전이 아니라 **리포트 확인**이다. 주무대인 목록형 화면에서 필요한 것은
  "누구인지 0.2초 안에 읽히는 것"이고, 그건 얼굴의 일이다
- 베이스 16장 병목(monster_design.md §3)에도 얼굴이 유리하다 — 생성·수정·색조 변형이 싸다

### 표시 칸을 키우면 전신이 유리해지는가

임계는 **약 120px** 이다 (얼굴이 읽히는 최소 머리 24px ÷ 크롭 제약의 머리 비율 1/5).
아바돈처럼 머리 비중이 작은 대형은 190px 이 필요하다. 현재 구조로는 도달하지 못한다:

```
아레나 min-height: clamp(300px, 46vh, 430px)      [style.css .arena]
1366×768 노트북 → 46vh ≈ 303px
  − padding 28 − divider 55 = 220px, 두 진영이 나눠 가짐 → 진영당 110px
  − 카드 패딩 15 − 이름 2줄 34 − HP바 8  →  스프라이트 몫 ≈ 45px
```

**현행 46px 은 취향이 아니라 세로 예산 700px 에서 역산된 상한값**이다.
큰 화면(430px)까지 가도 스프라이트 몫은 ~108px 로 임계에 못 미친다.
전신 전환은 CLAUDE.md 의 화면 폭·세로 예산 정책 변경을 전제로 한다.

그리고 아레나를 키워도 **나머지 5개 자리는 영원히 얼굴**이다 — 목록 화면은 120px 을 못 준다.
따라서 어느 쪽으로 가든 전신 마스터를 남기는 전략이 정답이고, **지금 결정을 미뤄도 손해가 없다.**
전신 마스터를 안 남기면 보스 등장 연출·도감 상세·엔진 이식 시점에 전부 재생성이다.

### 크롭 제약 (모든 프롬프트에 추가)

전신으로 뽑되 머리가 크롭 가능해야 한다. 이 블록이 없으면 투구·방패·무기·숙인 고개가
얼굴을 덮어 **크롭에 남는 것이 없다.**

```
CROP CONSTRAINT — the head must occupy at least 1/5 of the total sprite height and be
fully unobstructed: no weapon, shield, arm, or hair crossing the face, no helmet visor
over the eyes, chin clear of the shoulder line, head held level and turned toward the
viewer even if the body is angled away. The head region must survive being cropped to a
standalone square portrait.
```

---

## 4. 몬스터별 프롬프트

각 프롬프트는 **§2 공통 스타일 블록 + §3-2 크롭 제약 + 아래 본문** 순으로 조립한다.

### 4-1. `1101` 고블린 척후병 — size 1 / skirmish

```
[공통 스타일 블록]
SUBJECT — a goblin scout of a demon warband, small and wiry, occupies ~60% of the
canvas height (waist-high to a human soldier). Crouched forward-leaning stalker pose,
weight on the balls of bare clawed feet, one shoulder dropped, mid-creep.
FORM — oversized head on narrow hunched shoulders, long pointed ears swept back flat,
thin sinewy arms too long for the torso, pot-belly, bandy legs.
SKIN — ashen olive-drab, desaturated toward the background browns (#4A5238 lit,
#2A2E20 shadow), smeared with soot and gray ash. Not a bright green goblin.
GEAR — ragged hide wrap and a rope belt, a notched rust-pitted shortdagger held
low and reversed, a bundle of crude fire-hardened javelins strapped across the back,
a scrap of a burnt enemy banner tied around one forearm as a trophy.
EMBER — eyes only, two small hot points (#F16D28), plus a faint ember rim tracing
the top of the shoulders and ear edges. Nothing else glows.
```

### 4-2. `1102` 고블린 전사 — size 1 / line

```
[공통 스타일 블록]
SUBJECT — a goblin line infantryman of a demon warband, occupies ~60% of the canvas
height, same species scale as the scout but thicker through the chest. Squared upright
guard stance, shield raised to the chin, front foot planted, holding the line.
FORM — same oversized head and long pointed ears, but broad blocky torso, short thick
limbs, feet apart and rooted. Silhouette reads as a wedge, not a hook.
SKIN — ashen olive-drab (#4A5238 / #2A2E20), soot-darkened around the mouth and hands.
GEAR — a dented iron kettle helm one size too large, rust-bloomed (#53291E), a round
scavenged wooden shield with a burnt-through hole and a split rim, a short heavy
chopping sword with a rolled edge, mismatched looted armor plates lashed on with rope.
EMBER — a thin hot rim along the helmet brow and the top edge of the shield, as if the
fire behind him is at his back. Eyes a dull ember (#A62912), dimmer than the scout's.
```

### 4-3. `1103` 오크 전사 — size 2 / heavy

```
[공통 스타일 블록]
SUBJECT — an orc heavy warrior of a demon warband, occupies ~78% of the canvas height,
one and a half times a human soldier and far wider. Winding-up pose: weapon hauled
back over one shoulder, torso coiled, front foot heavy on the ground. Slow and enormous.
FORM — sloped trapezius higher than the skull, tiny head sunk between the shoulders,
arms that hang past the knees, barrel ribcage, tree-trunk legs, hunched forward.
The silhouette must read as a boulder, widest at the shoulders.
SKIN — gray-green pulled almost to charcoal (#3E4A3A lit, #1E2418 shadow), heavy scar
ridges, dried blood-brown ash warpaint in three drag marks across the chest.
Underslung tusks on a heavy lower jaw, one tusk snapped short.
GEAR — a two-handed cleaver forged from a broken siege plate, crude and unbalanced,
chain scraps and a single strap of plate over bare hide, no helm.
EMBER — the cleaver's edge holds a cracked ember line (#C42A0B) where it was heated
in the camp fire, and ember catches the top of the shoulders. Eyes deep and unlit.
```

### 4-4. `1150` 아바돈 — size 3 / stage boss

CSV 설명: *파멸의 군주 — 무저갱의 왕* · 베이스는 Orc(강타).
요한계시록의 아바돈(무저갱의 사자, 메뚜기 떼의 왕) 모티프를 오크 골격 위에 얹는다.

```
[공통 스타일 블록]
SUBJECT — Abaddon, Lord of Ruin and king of the abyss, an ascended orc warlord and the
boss of the burning encampment. Occupies ~95% of the canvas height, two and a half
times a human soldier, the widest silhouette in the chapter — he should feel like he
is being pushed out of the frame. Standing at rest, weight leaned onto a weapon planted
in the ground, head lowered, eyes raised to the viewer.
FORM — orc build taken to siege-engine scale: shoulders wider than his height is tall
from the waist up, one arm bare and mapped with old scars, the other buried in
blackened plate. Heavy underslung tusked jaw.
CROWN — a circlet of blackened iron spikes fused directly into the skull bone, one
spike snapped off, dried blood at the fusion line.
ABYSS MOTIF — ridged chitinous locust-carapace plating over the shoulders and forearms;
a pair of ragged burnt vestigial locust wings folded down his back so they read as a
torn cloak, veined and translucent at the edges.
SKIN — charcoal gray-green (#3E4A3A / #1A2016), cracked like dried mud, and through
those cracks ember burns from the inside (#C42A0B) — his rage is internal combustion.
WEAPON — a single-edged executioner's cleaver taller than a man, planted point-down,
its fuller filled with running molten ember (#F16D28), the only wide light source
in the image.
EMBER BUDGET — this is the one sprite allowed to break the 5% rule: the fuller, the
crown, and the skin cracks may reach 12% of the sprite area. Everything else stays
charcoal.
```

---

## 5. 도구별 대응

네거티브 프롬프트는 지원 여부가 갈린다.

| 도구 | 방식 |
|---|---|
| Stable Diffusion · ComfyUI · NovelAI | 별도 입력칸 — §2 네거티브를 그대로 붙여넣기 |
| Midjourney | 칸 없음. `--no smooth shading, gradients, text` 형태로 뒤에 붙임 |
| DALL·E 3 · Gemini(Nano Banana) · GPT 이미지 | **네거티브 개념 없음** — 아래 긍정문 버전을 본문에 넣는다 |

부정문을 이해하지 못하는 모델에 `no text, no gradients` 를 던지면 **오히려 그것을 그린다.**
그런 도구에는 공통 스타일 블록 끝에 이 문단을 붙인다:

```
Every surface is filled with flat blocks of a single solid color with hard stair-stepped
edges. Colors stay dull, ashen and desaturated throughout. The character is cut out
cleanly against pure white with nothing else in the image — no ground, no scenery,
no lettering, no signature, exactly one creature.
```

---

## 6. 운용 규칙

- **정예는 새로 뽑지 않는다** — monster_design.md §6대로 일반몹 스프라이트의 **색조 시프트**다.
  위 4장이 목탄 기반이라 죄종 색을 얹기 좋다. 프롬프트 재생성 금지, 팔레트 스왑으로 처리
- **화상(burn) 상태이상은 스프라이트에 굽지 않는다** — 오버레이 레이어. 구우면 평시에도 타고 있다
- **아트 병목은 인스턴스가 아니라 베이스 16장** (monster_design.md §3).
  CH1-1 4종 중 신규 베이스는 **Goblin · Orc 2종뿐**이고, 아바돈은 Orc 베이스의 보스 인스턴스다.
  예산이 빠듯하면 Goblin 1장으로 척후/전사를 장비 차이로만 가르는 것도 가능
- 산출물 파일명은 `monster.csv:sprite_key` 를 따른다 —
  `ch1_goblin_scout` · `ch1_goblin_warrior` · `ch1_orc_warrior` · `ch1_boss_abaddon`

---

## 7. 미해결 — 픽셀 스케일 불일치

배경은 5.5배 확대된 ~500px 원본인데, 현재 얼굴 파이프라인은 256×256 을 46px 칸에 넣는다
(`src/ui/style.css` `.sprite`, 보스는 58px). 즉 **5.5배 축소**다.
같은 화면에서 배경 블록은 굵고 스프라이트 블록은 뭉개진다.

밀도를 맞추려면 스프라이트 네이티브를 **소 32×32 / 중 40×40 / 대 48×48** 로 잡고
정수배 업스케일해서 내보내야 한다 — 생성은 1024 로 하되 마지막에 NEAREST 로 네이티브까지
내렸다가 다시 올리는 단계가 필요하다.

**이 문서는 프롬프트만 정의하고 파이프라인은 건드리지 않았다.** 위 네이티브 규격은 제안이며,
실제 적용은 스프라이트 표시 규격(`.sprite` CSS)과 함께 별도로 결정한다.

---

*마지막 업데이트: 2026-08-25 (신규 작성 — CH1-1 4종 프롬프트 + 배경 팔레트 실측)*
