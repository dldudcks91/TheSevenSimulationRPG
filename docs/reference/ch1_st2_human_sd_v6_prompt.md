# 챕터 1 스테이지 2 인간 몬스터 — 기존 SD 화풍 재시안 v6

최종 선택용 시트: `src/assets/art/faces/source/sheets/source_sheet_ch1_st2_human_3x3_sd_v6.png` (1254×1254 PNG). Codex 내장 `image_gen`으로 새로 생성하고 어깨·가슴 폭, 머리 위 여백과 초록 배경을 수정했다. 마지막으로 1행 2열·2행 1열·2행 3열의 머리폭/어깨폭을 보정했다. 게임용 `1201~1203`은 교체하지 않았다.

## 참조와 확인

- `ready/hero/warrior_2.png`: 두상과 어깨 비율의 주 기준. 512px 작업 원본에서 어깨폭 약 75%, 두상 높이 약 57%, 머리폭/어깨폭 약 72%.
- `ready/hero/knight_4.png`·`warrior_4.png`: 인간 얼굴·갑옷의 선, 비대칭 음영과 재질 밀도 기준. 고유 얼굴·투구·장식은 전용하지 않았다.
- `ready/monster/1301.png`: 몬스터 초상과 맞는 투구 및 SD 실루엣 기준. 두개골 외형은 전용하지 않았다.
- `ready/monster/1201.png`·`1202.png`·`1203.png`: 기존 보병·궁수·기사의 역할과 장비를 확인하는 자료. 생성 입력에는 넣지 않았다.

3×3 시트의 각 칸에서 최종 어깨폭은 약 **78~83%**, 머리 위 여백은 약 **10~16%**다. 이전 v5의 어깨폭은 약 **88~100%**였다. 눈높이 부근에서 중앙 인물의 연속된 실루엣 폭을 재고 어깨 아래쪽의 폭과 비교하면, 최종 머리폭/어깨폭은 약 **69~78%**다. 같은 방식으로 잰 `warrior_2`·`1301`은 약 **73%**다. 화살통·수염·투구 옆판의 영향이 있어 최종 그림결과 인상은 원본을 나란히 보며 확인했다.

## 재현용 통합 프롬프트

```text
Create one new 3x3 dark-fantasy RPG portrait comparison sheet of nine living human enemy soldiers for chapter 1 stage 2 of TheSevenSimulationRPG. The attached current game warrior, knight and monster portraits are exact STYLE and SD-PROPORTION references only. Match their irregular clean black contour, asymmetrical angular shadows, muted charcoal and dull crimson, restrained matte iron detail, solid dark eyes, broad simple head and short cropped bust. Invent different human faces, hair, helmets, armor and quivers; copy no tattoos, scars, crests or distinctive hero equipment.

== OUTPUT FORMAT — ALWAYS A 3x3 SHEET ==
One square image with equal three columns and three rows separated by straight 16px pure-black dividers. Every cell has one bust on an opaque vivid flat #00FF00 green background. Keep nine heads at matching scale, eyes near the same level and one light direction.

Match the saved warrior and monster geometry in EVERY tile. Each broad head, from hair or helmet crown to chin, occupies about 58–65% of tile height, beginning roughly 8–12% below the top. Use wide simple cheeks and a short chin. The widest shoulders cover about three quarters of tile width, leaving clear green space at both sides. The head silhouette width is about 70–75% of the shoulder span. Keep the neck visible, shoulders low and only a small upper chest below the chin. Crop the bust at the bottom. Neither shoulder nor helmet touches a divider. Preserve these relationships throughout all nine cells.

Every row, left to right: enemy human FOOTMAN in plain charcoal iron with a small dull-red cloth accent; enemy human ARCHER in dark fabric with a visible back quiver and broad arrow fletchings; enemy human KNIGHT in simple iron armor with a small dull-red cloth accent.

Row 1: round-faced middle-aged woman footman with short curls; thin older man archer with receding gray hair; wide-cheeked young woman knight in a plain open low helmet.
Row 2: blunt-nosed short-haired man footman; strong-jawed middle-aged woman archer with tied-back hair; knight in a simple closed narrow-slit visor.
Row 3: older broad-cheeked bearded man footman in a low cap; narrow-faced young woman archer with short hair; bald older man knight in a different open low helmet.

Give exposed faces distinct bone structure, eye spacing, noses, jaws and expressions. Retain the mature, subdued hand-drawn rendering and material variation of the references. No glossy comic rendering, smooth vector look, oversized shoulder plates, long realistic face or body, repeated face template, detailed wrinkles, lettering, insignia, scenery, hands, held weapons or watermark. Fill all empty cell areas with opaque green.
```
