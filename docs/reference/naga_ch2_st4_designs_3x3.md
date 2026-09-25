# 챕터 2-4 나가 3×3 디자인 시트

결과물: [원본을 보존해 확장한 나가 3×3 시트](../../src/assets/art/faces/source/sheets/source_sheet_ch2_st4_naga_original_expanded_3x3.png)

사용자 원본: [나가 2×2](../../src/assets/art/faces/source/sheets/source_sheet_ch2_st4_naga_user_original_2x2.png)

사용자 원본 2×2의 **1번은 나가 전사, 2번은 나가 마법사**다. 생성기로 원본 네 얼굴을 다시 그리면 개성이 흐려져, 원본 네 칸을 직접 잘라 새 3×3의 1·2·4·5번에 배치했다. 다른 다섯 칸만 원본 한 장을 단독 참조로 사용해 내장 `image_gen`에서 만들었다. [기본 규칙](../../.claude/skills/art-prompt/gem_main_prompt.txt)의 3×3 구성으로, 왼쪽부터 오른쪽으로 읽는다.

| 번호 | 구분 | 생김새 |
| --- | --- | --- |
| 1 | 원본 전사 | 웃는 입, 넓은 주둥이, 조개 투구와 삼지창 |
| 2 | 원본 마법사 | 둥근 눈, 단정한 주둥이, 어두운 로브와 지팡이 |
| 3 | 신규 노전사 | 넓은 턱, 비대칭 엄니, 흉터와 창 |
| 4 | 원본 관 쓴 나가 | 굵은 눈썹, 뱀 모양 관과 두루마리 |
| 5 | 원본 궁수 | 가늘게 뜬 눈, 고글과 활 |
| 6 | 신규 강가 나가 | 납작한 코와 둥근 턱, 두꺼운 목 |
| 7 | 신규 신비술사 | 매우 긴 주둥이, 가는 볼지느러미와 지팡이 |
| 8 | 신규 젊은 척후병 | 큰 눈, 둥근 뺨과 작은 지느러미 |
| 9 | 신규 독 예언자 | 처진 눈썹, 굽은 턱, 비대칭 송곳니 |

## 재생성용 발주문

```text
Match ONLY the attached original 2x2 Naga image: its bold dark outline, simple cel shading, muted grey-olive scales, bronze and dark cloth, yellow slit-pupil eyes, expressive reptile muzzles, cheek fins and dorsal fins.
Make a new 3x3 concept sheet. Keep the original four characters recognizable at positions 1, 2, 4 and 5: grinning trident warrior, calm staff mage, heavy-browed crowned scroll-holder, narrowed-eye goggle archer.
Create five new individuals in exactly the same style. New 3: wide-jawed older warrior with asymmetrical tusks. New 6: heavy compact river Naga with short flat muzzle and small eyes.
New 7: thin long-faced mystic with tapering snout and narrow fins. New 8: young round-cheeked scout with large gold eyes and small fins. New 9: ancient venom seer with drooping brow, crooked jaw and torn dorsal fin.
Make the five new faces differ in head silhouette, snout length, jaw, eyes, fins, scales and expression; gear alone must not carry the variation.
Nine equal square bust tiles, flat pure #00FF00 backgrounds and straight 16px pure black dividers. No text or watermark.
```

생성본의 원본 네 얼굴은 후처리에서 사용자 원본의 네 칸으로 교체했다. 원본과 신규 칸의 초록 배경을 `#00FF00`으로, 격자는 `#000000` 16px로 맞췄다. 이 시트는 디자인 후보이며 게임에 적용된 2401~2403 초상화는 별도다.
