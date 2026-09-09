# prompt_template — 아이콘 발주 골격 · 금지어 · 격자

SKILL.md 1단계에서 편다. **짧게 쓴다** — 앵커 첨부가 스타일(외곽선 굵기·음영 단수·팔레트)을 나르므로, 프롬프트는 앵커가 못 나르는 것만 적는다: **배경 계약 · 여백 · 시트 규격 · 대상 목록**.

## 0. 첨부 (앵커 — 스타일 SSOT)

| 발주 | 첨부 | 이유 |
|---|---|---|
| 스킬 아이콘 | `icons/skills/sheet_02_mono_anchor.png` | **단색 실루엣**(외곽선·음영·색 없음) — 2026-09-09 부터 스킬 세트의 앵커다. 타일 문장은 [skill_tiles.md](skill_tiles.md) |
| 스킬 아이콘 (옛 스타일) | ~~`icons/skills/sheet_01_color.png`~~ | 1차 컬러 카툰. **설치본에서 사라졌다** — 합격선 표(SKILL.md)가 아직 이 시트 기준이라 참고로만 남긴다 |
| 무기 | `icons/items/examples.png` | 오브젝트 단독 · 대각선 구도 · 강조색 한 점 |
| 방어구·장신구 | `icons/items/examples_armor.png` | 정면 구도 · 금속 광택 단수 |
| empty 실루엣 | `icons/items/item_background.png` | 무채색 실루엣의 단순화 수위 |
| 애매하면 | 스킬 + 아이템 한 장씩 | 해가 없다 |

셋 다 **게임이 안 읽는 원본 시트**지만 이 스킬의 앵커라 지우지 않는다 (`src/assets/art/README.md`).

## 1. 골격 (그대로 복사해서 `[ ]` 만 채운다)

```
Match the attached icon sheet exactly — same thick near-black outline, same flat
cel shading (one base tone, one shadow step, small glossy highlights), same dark
desaturated palette with one saturated accent per icon.

2048x2048 sheet, [2x2 | 3x3] grid, [N] fantasy game icons on a PLAIN SOLID WHITE
background. Each icon is centered in its cell with generous white margin — no
icon may touch a grid line, the sheet edge, or another icon. No text anywhere,
no letters, no runes. No drop shadows, no background scene, no frames.

[문법 블록 — §3 에서 하나]

1. [대상 — 오브젝트 이름 + 강조색 hex]
2. [대상]
...
```

**빼면 안 되는 줄** — match 문단(스타일 전체를 앵커가 나른다) · `PLAIN SOLID WHITE`(§2 첫 줄 — "투명"이 체커보드를 굽는다) · margin 문장(닿거나 겹치면 그 타일은 절단 불능) · `no text`.

**초상과 다른 것** — 초록 `#00FF00` 키잉 계약이 **여기 없다.** 흰 배경 + 닫힌 근검정 외곽선 조합이 검증된 절차라(cut.py), **초록 계열 색을 자유롭게 쓴다**(활의 초록 감김·숲빛 로브 전부 안전). 색은 hex 로 박는다.

## 2. 금지어 표 — 단어 하나가 지표 하나를 무너뜨린다

| 쓰지 말 것 | 무너지는 것 | 대신 |
|---|---|---|
| `transparent background` | **체커보드가 픽셀로 구워진다** (실측 — 무기 시트 193/236 · 방어구 207/255, 알파 전부 255) | `PLAIN SOLID WHITE background`. 그래도 체커보드로 오면 cut.py 가 처리는 한다 |
| `ornate` · `intricate` · `engraved` · `filigree` | 색 수·경계밀도 폭발 → 40px 에서 뭉갠다 | `plain` · `bold` · `chunky` |
| `weathered` · `rusted` · `battle-worn` · `scratched` | 같음 | 낡음은 **어두운 팔레트**로 — `dark desaturated` |
| `runes` · `inscription` · `emblem` · `sigil` | 글자가 새겨진다 | `plain shape, no lettering` 을 그 자리에 |
| `glowing` · `radiant aura` · `particles` · `sparkles` | 열린 발광이 배경으로 번진다 — 외곽선이 안 닫혀 누끼가 찢는다 | 이펙트는 **닫힌 외곽선 도형**으로 (§3 스킬 블록) |
| `realistic` · `3D render` · `painterly` | 스타일 이탈 — 외곽선 소실 (measure.py `dark` > 20) | 스타일 단어를 아예 안 쓴다 — match 문단이 나른다 |
| 가는 것 (`thin chain` · `fine string` · `wisps`) | 외곽선보다 가늘어 40px 에서 사라진다 | `chunky flat shapes, never thin lines` (앵커 활시위가 외곽선 굵기다) |
| 수치 제한 (`3 flat tones` · `under ten colors`) | 앵커보다 단순해진다 (초상 실측과 같은 실패) | 디테일 지시를 통째로 뺀다 |

## 3. 문법 블록 3종 — 아이콘 종류마다 문법이 다르다

**아이템 (무기·방어구·장신구)** — 오브젝트 하나, 이펙트 없음
```
Each icon is ONE piece of equipment floating alone — no hands, no effects, no
ground, no scene. Weapons at a diagonal tilt, blade or head pointing up-right.
Armor pieces face front. Dark desaturated metal, leather and wood; one saturated
accent per icon (a gem, a blade sheen, a strap or trim).
```

**스킬** — 오브젝트 + 굵은 이펙트 글리프 하나
```
Each icon shows ONE object plus ONE bold effect shape — an impact starburst, a
crescent slash arc, short motion strokes, or sound waves. The effect shape has
the same thick dark outline as everything else and may carry a red-to-orange
gradient fill; the object itself stays flat.
```
이펙트 한정 그라디언트는 앵커가 그렇다(함성 음파·참격 초승달) — 오브젝트 본체까지 번지면 재발주. 스킬 아이콘의 색 수 합격선(110~160)이 아이템(35~120)보다 높은 이유가 이 그라디언트다.

**empty 실루엣 (미장착 슬롯)** — 무채색
```
Each icon is a flat neutral-gray silhouette of one equipment piece — no color,
one shade step, one small gloss, same thick near-black outline.
```
화면에서 옅게 까는 것은 CSS(`opacity`)가 한다 — 파일에 굽지 않는다 (README `empty/` 절).

## 4. 격자 · 타일 배치

- **아이템 = 3×3 까지** (칸 682px 로 충분 — 무기 8종이 3×3 에서 나왔다). **스킬 = 2×2** (이펙트가 자리를 먹는다 — 기존 4종이 2×2)
- **타일 순서 = id 순서.** 발주 전에 파일명이 될 id 를 확정하고(SKILL.md 절차 1) 번호 목록을 그 순서로 적는다 — 절단 후 `r·c → id` 매핑이 기계적이 된다
- **워터마크** — 이 세트 시트 3장엔 안 박혔다(초상 Gem 의 우하단 ✦ 와 다른 경로). 나타나면 그 타일만 폐기 — 덜 중요한 대상을 마지막 칸에 두는 습관은 유지
- 강조색은 타일마다 hex 로 다르게 — 안 정하면 전부 같은 진홍으로 온다 (초상 실측과 같은 버릇)

---
*마지막 업데이트: 2026-09-07 (최초 작성 — 설치본 17장 + 원본 시트 3장 실측에서 역산)*
