# 챕터 4-2 빙하 요새 — 얼어붙은 병사 3×3 시트 발주문 (Codex)

4-2 의 일반 몬스터 셋(지금 서리 고블린 병사 · 얼음 임프 · 고블린 빙하대장)을 갈아 끼울 후보 그림이다. 두 안을 한 장에 같이 뽑아 비교한다.

- **윗줄(1~3) — 얼어붙었지만 죽지 않은 병사.** 체념한 채 서 있다가 얼음에 갇힌 요새 수비대. 사람 얼굴이 남아 있다.
- **가운뎃줄(4~6) — 죽은 병사의 유령.** 같은 수비대가 죽은 뒤의 모습. 스켈레톤이 아니라 창백한 유령 얼굴이다.
- **아랫줄(7~9)** — 생성기가 두 안에서 자유롭게 고른다.

줄마다 병사 · 냉기 마법사 · 대장 순서다(4-2 는 냉기 장소라 마법사 자리를 남겼다).

## 첨부 — 세 장을 생성 입력에 함께 넣는다

| 파일 | 역할 |
|---|---|
| `src/assets/art/faces/source/ready/monster/1201.png` | 인간 보병 — **그림체 · 비율 기준 + 인간 얼굴** |
| `src/assets/art/faces/source/ready/monster/1203.png` | 인간 기사 — **그림체 · 비율 기준 + 병사 장비의 단순화 수준** |
| `src/assets/art/faces/source/ready/monster/4303.png` | 트롤 빙하거인(같은 4장) — **차갑고 창백한 색감만.** 트롤의 생김새는 옮기지 않는다 |

스켈레톤 초상(1301 · 1303 · 3201~3203)과 빈 황금 갑옷(3401~3403)은 **넣지 않는다** — 유령이 해골이나 빈 갑옷으로 끌려간다.

## 발주문

```text
Match the attached portraits exactly — same proportions, same outline weight,
same flat shading, same dark palette, same bust framing and gaze.
The human soldiers set the faces and gear; the white troll only sets the cold, pale palette of this frozen chapter.

2048x2048 sheet, 3x3 grid, nine bust portraits, straight 16px pure black gridlines, solid pure
green #00FF00 background, no text anywhere. Nothing on the characters may be
bright or saturated green. Leave background margin above and beside each head;
the small body may be cropped by the bottom edge.

Soldiers of a glacier fortress who gave up and stood still until the ice took them.
Top row: still alive but frozen solid — real faces with blue-grey skin and frost. Middle row: their ghosts — pale smooth faces with hollow black eyes, drawn as solid opaque shapes.

1. Frozen soldier, kettle helmet crusted with frost
2. Frozen frost mage, hood stiff with ice, short icicles on the brow
3. Frozen captain, closed helmet with a sheet of ice over the visor
4. Ghost soldier, cracked helmet, open wailing mouth
5. Ghost frost mage, torn hood around a pale face
6. Ghost captain, broken crested helmet
7. Frozen soldier, your own idea
8. Ghost soldier, your own idea
9. Your own idea, frozen or ghost
```

## Codex 에 맡길 때

1. 위 세 파일을 첨부하고 발주문 그대로 내장 이미지 생성으로 한 장을 만든다.
2. 결과를 `src/assets/art/faces/source/sheets/source_sheet_ch4_st2_frozen_soldiers_3x3.png` 로 저장한다.
3. **설치하지 않는다** — `monster.csv` · `cartoon/monster/` · `ready/monster/` 는 건드리지 않는다. 어느 칸을 쓸지는 사용자가 고른다.
4. 배경이 투명하게 나오면 배경만 불투명 `#00FF00` 으로 채운다(1-2 인간 v8 시트와 같은 처리).

## 왜 이렇게 적었나

- **유령은 「solid opaque」** — 반투명하게 그리면 초록 배경이 비쳐 누끼 때 몸이 같이 뚫린다. `glowing` 도 쓰지 않았다(그라디언트가 생긴다).
- **색은 「blue-grey · pale」 단어만** — hex 를 박지 않았다. 창백한 청백색은 초록 키잉에 안전하다(`g − max(r,b)` 가 음수).
- **두 안을 줄로 갈랐다** — 같은 수비대의 산 모습과 죽은 모습이라 장비는 비슷하고 **얼굴만** 다르다. 한 장에서 바로 비교된다.
- ⚠ **4-1 에 이미 유령이 셋 있다**(서리 원혼 · 동결 곡성귀 · 유키온나 — 초상은 아직 없다). 유령 안을 고르면 4-1 과 4-2 가 연달아 유령이다.
