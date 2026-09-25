# 챕터 1 스테이지 2 인간 몬스터 — 재시안 v5

최종 비교 시트: `src/assets/art/faces/source/sheets/source_sheet_ch1_st2_human_3x3_hero_style_v5.png` (1254×1254 PNG). Codex 내장 `image_gen`으로 생성하고 여백·얼굴 구분·초록 배경을 수정했다. 아직 게임에는 적용하지 않은 선택용 시트다.

## 참조 역할

- `src/assets/art/faces/source/ready/monster/1201.png`·`1202.png`·`1203.png`: 기존 보병·궁수·기사의 직업 및 장비 확인. 생성 입력에서는 제외했다.
- `src/assets/art/faces/source/ready/hero/archer_1.png`·`knight_2.png`: 생성 입력에 사용한 **그림체 참조**. 선, 단순한 면 음영, 색의 탁도, 디테일 수준과 여백만 따른다. 얼굴·머리·옷·투구는 복제하지 않는다.
- `src/assets/art/faces/source/ready/hero/warrior_3.png`·`priest_1.png`: 현재 영웅 세트와의 그림체 및 프레이밍 비교에 사용했다.

## 재현용 통합 프롬프트

```text
Draw a fresh comparison sheet of nine newly invented LIVING human enemy soldiers for TheSevenSimulationRPG. Attached installed HERO portraits are STYLE references only: follow their clean irregular dark outlines, large heads and cropped busts, flat angular shadows, solid black eyes, dim desaturated colors, restrained detail and generous headroom. Do not copy any hero face, hair, scar, hood, helmet, costume or emblem.

== OUTPUT FORMAT — ALWAYS A 3x3 SHEET ==
Output ONE square image, exactly three columns by three rows, with straight 16px pure-black dividers. Every tile contains ONE bust on a visibly flat, fully opaque pure-green #00FF00 background. Keep the head and eye scale consistent across tiles. Leave generous green space above every hairline or helmet, comparable to the hero references; no head may touch the upper divider. Crop shoulders and a little upper chest at the tile bottom. Use the same dim lighting direction throughout.

Every horizontal row, left to right: FOOTMAN with matte dark charcoal armor and a small dull-crimson cloth accent; ARCHER in lighter dark clothing with a clearly visible back quiver and broad arrow fletching; KNIGHT in heavier simple iron armor with a small dull-crimson cloth accent. They belong to one opposing military unit, but all nine have distinct faces and silhouettes.

Row 1: stocky dark-skinned woman footman with a broad round face and short tight curls; slender elderly male archer with a balding head and long hooked nose, no hood; young woman knight with a plain low open-face helmet, wide cheeks and a small pointed chin.
Row 2: pale narrow-faced male footman with shaved sides and a tall forehead; middle-aged dark-skinned woman archer with a plain tied headscarf and long square face; fully enclosed knight in an undecorated angular iron visor with one narrow slit.
Row 3: older heavyset bearded male footman with a short blunt iron helmet; young light-olive-skinned woman archer with a long angular face, short straight reddish-brown hair, no hood and a visible quiver; bald lean male knight with deep-set eyes and a simple open-face iron cap distinct from row 1's helmet.

Vary bone structure, eye spacing, nose width, cheek mass, jaw length, age and expression; hair or beard alone cannot distinguish faces. Keep matte armor and simple hand-drawn shadow shapes. No transparent or black cell backgrounds, text, symbols, scenery, held weapons, hands, watermark, glossy armor, hatching, texture, bright lighting or saturated colors.
```
