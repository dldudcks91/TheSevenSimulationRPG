# 몬스터 초상 프롬프트 — 챕터별 발주 원문

> 대상: 지금 돌고 있는 **카툰 흉상** 파이프라인(앵커 첨부 · 초록 배경 · 2×2 시트).
> 절차 · 합격선 · 후처리는 `/art-prompt` 스킬이 든다 — 이 문서는 **보낸 프롬프트 원문**만 보관한다.
> ⚠ [monster_art_prompt.md](monster_art_prompt.md) 는 **옛 도트 전신 시절**(2026-08-25 · 팔레트 고정 · 전신 스프라이트) 문서다. 지금 발주에 그 형식을 쓰지 않는다.

---

## 0. 왜 남기는가

프롬프트가 채팅에만 있어서 같은 챕터를 다시 뽑을 때 처음부터 다시 썼다.
시트가 어느 몬스터에 붙었는지는 [faces/source/README.md](../../src/assets/art/faces/source/README.md) 가 들지만, **보낸 글 자체는 아무 데도 없었다.**

## 1. 골격에서 변하지 않는 것

프롬프트마다 되풀이되는 앞 두 문단이다. 소재와 타일 넷만 챕터마다 바뀐다.

- **앵커는 Gem 에 붙어 있다** — 채팅에 첨부 안내를 적지 않는다
- **시트 한 장 = 2048² · 2×2 · 초록 `#00FF00` 배경** — 오른쪽 아래 칸은 워터마크 자리라 **세 장만 쓴다**
- **색 hex 를 쓰지 않는다** — 컨셉 색만 단어로. 뽑을 때마다 달라지는 것이 목적이다
- **인물에 순색 초록을 두지 않는다** — 누끼에서 그 자리가 뚫린다. 올리브 · 카키 · 이끼 · 세이지는 안전
- 지시문은 짧게 — 글이 길어지면 앵커의 지분이 준다

---

## 2. 챕터 2 — 뒤틀린 숲 [2026-09-16]

| 시트 | 담는 몬스터 | 상태 |
|---|---|---|
| 오크 부대 (`source_sheet_orc_troop`) | 2101 오크 전사 · 2102 오크 궁수 · 2103 오크 주술사 | 설치 완료 · **프롬프트 원문 없음** |
| 오크 보스 (`source_sheet_orc_boss`) | 2150 라합 | 설치 완료 · **프롬프트 원문 없음** |
| 레비아탄 (`source_sheet_leviathan`) | 2900 레비아탄 | 설치 완료 · **프롬프트 원문 없음** |
| 도마뱀 셋 | 2201 사냥꾼 · 2202 저주사 · 2203 돌격병 | 아래 §2-1 |
| 시체 둘 + 해골 | 2301 숲마을 시체 · 2302 뿌리 시체 · 2303 이끼에 얽힌 해골 | 아래 §2-2 |
| 나가 셋 | 2401 나가 전사 · 2402 나가 주술사 · 2403 나가 마법사 | 아래 §2-3 |
| 아비주 | 2250 아비주 (2-2 보스) | 아래 §2-4 |
| 밴시 | 2350 밴시 (2-3 보스) | 아래 §2-5 |
| 2-4 보스 | 미정 — 이름이 정해지면 쓴다 ([GAME_DESIGN.md](../game_design/GAME_DESIGN.md) §9 · story/ch2_envy.md ⚠ 6) | 없음 |

### 2-1. 도마뱀 셋

```
Match the attached portraits exactly - same proportions, same outline weight,
same flat shading, same dark palette, same bust framing and gaze.

2048x2048 sheet, 2x2 grid, four bust portraits, thin black gridlines, solid pure
green #00FF00 background, no text anywhere. Nothing on the characters may be
bright or saturated green. Leave background margin on all sides - the figures
must not touch an edge.

Four lizardfolk of a fog-choked swamp, dull olive and clay-brown scales, blunt
reptile snouts. What sits on the head is the only thing that tells the four apart.

1. A hunter: a quiver with EXACTLY THREE ARROWS - three chunky flat fletchings rising just above one shoulder, never thin lines, not past the top of the head.
2. A curse-speaker: a headdress of dried reeds, a bark mask pushed up onto the forehead.
3. A charger: a low flat iron helm over a broad blunt jaw.
4. A bare crested head, one torn frill.
```

### 2-2. 시체 둘 + 해골

```
Match the attached portraits exactly - same proportions, same outline weight,
same flat shading, same dark palette, same bust framing and gaze.

2048x2048 sheet, 2x2 grid, four bust portraits, thin black gridlines, solid pure
green #00FF00 background, no text anywhere. Nothing on the characters may be
bright or saturated green. Leave background margin on all sides - the figures
must not touch an edge.

Four dead villagers risen from a forest village swallowed by roots, ash-grey
rotted skin and plain rags. What is left of the head tells the four apart.

1. A villager corpse: slack hanging jaw, a torn kerchief knotted under it.
2. A root corpse: thick pale roots grown through one cheek and out of the crown.
3. A skeleton: a bare skull, grey lichen over the bone, no flesh left.
4. A head wrapped in old grave cloth, only the jaw showing.
```

### 2-3. 나가 셋

```
Match the attached portraits exactly - same proportions, same outline weight,
same flat shading, same dark palette, same bust framing and gaze.

2048x2048 sheet, 2x2 grid, four bust portraits, thin black gridlines, solid pure
green #00FF00 background, no text anywhere. Nothing on the characters may be
bright or saturated green. Leave background margin on all sides - the figures
must not touch an edge.

Four naga - serpent-folk with human shoulders, cold blue-grey scales and flat
earless snake faces. What crowns the head is the only thing that tells them apart.

1. A warrior: a battered iron helm with a straight nose guard.
2. A shaman: a crown of pale coral branches, a cord of small bones at the collarbone.
3. A mage: a wide cobra frill flaring back from the skull.
4. A bare smooth head, scarred across the brow.
```

비늘을 청회색으로 잡은 것은 **레비아탄 그림(청회 비늘)과 잇기 위해서**다 — 2-4 는 챕터보스의 색을 미리 입는 자리다([GAME_DESIGN.md](../game_design/GAME_DESIGN.md) §9 09-16). 뱀족을 초록으로 뽑으면 누끼에서 뚫린다.

### 2-4. 아비주 (2-2 보스)

```
Match the attached portraits exactly - same proportions, same outline weight,
same flat shading, same dark palette, same bust framing and gaze.

2048x2048 sheet, 2x2 grid, four bust portraits of the same boss, thin black
gridlines, solid pure green #00FF00 background, no text anywhere. Nothing on the
character may be bright or saturated green. Leave background margin on all
sides - the figure must not touch an edge.

One lizardfolk matriarch, older and broader than her brood, pale clay scales
gone grey. What she wears on her head tells the four versions apart.

1. A crown of empty eggshells bound with cord.
2. A wide fan of dried reeds standing behind the head.
3. A bone circlet with two long fangs at the temples.
4. A bare crested head, deep scars across the snout.
```

빈 알껍데기 관은 「깨어나지 않는 알을 품는 어미」(story/ch2_envy.md ⚠ 3)에서 왔다.

### 2-5. 밴시 (2-3 보스)

```
Match the attached portraits exactly - same proportions, same outline weight,
same flat shading, same dark palette, same bust framing and gaze.

2048x2048 sheet, 2x2 grid, four bust portraits of the same boss, thin black
gridlines, solid pure green #00FF00 background, no text anywhere. Nothing on the
character may be bright or saturated green. Leave background margin on all
sides - the figure must not touch an edge.

One wailing ghost of a village woman, chalk-white hollow face, mouth open in a
scream, long grey hair in one solid mass. What frames the head tells them apart.

1. A torn bridal veil hanging over the hair.
2. A crown of frost spines over the brow.
3. Hair plastered flat and wet, face bare.
4. A shawl pulled over the head, only the open mouth showing.
```

서리 관은 밴시의 원소가 냉기이기 때문이다 — 챕터 2 에서 냉기는 이 한 마리뿐이다.

---

*마지막 업데이트: 2026-09-16*
