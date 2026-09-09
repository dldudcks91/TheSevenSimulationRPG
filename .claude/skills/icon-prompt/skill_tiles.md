# skill_tiles — 직업 스킬 아이콘 타일 목록

`skill_design.md §12` 의 **직업 스킬 풀 37개**에 붙일 아이콘의 **타일 문장**을 직업별로 확정해 두는 문서.
[prompt_template.md](prompt_template.md) 가 「어떻게 쓰는가」(골격·금지어)라면 여기는 **「무엇을 그리는가」**(대상별 확정문)다.
발주할 때는 골격 + 이 문서의 타일 목록을 이어 붙인다.

## 0. 상태

| 직업 | 수 | 타일 확정 | 발주 |
|---|---|---|---|
| 전사 | 7 | **확정** (§3) | 미발주 |
| 기사 | 8 | 미논의 | — |
| 궁수 | 6 | 미논의 | — |
| 마법사 | 8 | 미논의 | — |
| 사제 | 8 | 미논의 | — |

## 1. 스타일 — 단색 실루엣

전사 시트는 **2차 시트 문법**(`icons/skills/Gemini_Generated_Image_d34v8rd34v8rd34v.png` — 검정 실루엣 · 외곽선 없음 · 음영 없음)으로 발주한다. 앵커 첨부도 컬러 `example_1.png` 가 아니라 이 시트다.

근거 — 실제 칸이 28~44px 이고(관전 쿨 32 · 스킬 창 28 · 카드 40 · 시작 화면 44), 단색 실측이 컬러보다 그 크기에서 또렷하다. 37장을 여러 시트로 나눠 뽑을 때 **팔레트가 어긋날 축이 없다**는 것도 크다. 파일이 단색이면 화면에서 색을 얹는 길(CSS 틴트)이 남는데 컬러로 가면 그 길이 닫힌다.

- ⚠ **세트 전체를 단색으로 통일할지는 미확정** — 지금 정해진 것은 「전사 시트를 단색으로 뽑는다」까지다
- ⚠ **`SKILL.md` 의 스킬 합격선(색 수 110~160 · 경계 12~21%)은 컬러 앵커에서 나온 값이라 단색에 안 맞는다.** 단색 실측은 색 수 10~16 · 경계 2~3% (`src/assets/art/README.md` 09-09). 합격선 재정의는 미착수

## 2. 문법 — 주체 × 글리프, 요소는 최대 둘

> **아이콘 = 주체 오브젝트 하나 × 형태 글리프 하나. 셋은 금지.**

37개를 하나씩 상상해서 짜면 반드시 겹친다 — 2차 시트가 실제로 4장 중 3장이 검이었다. 그래서 두 층으로 가른다.

### 2-1. 주체 = 직업이 정한다

| 직업 | 주체 어휘 | 안 쓰는 것 |
|---|---|---|
| 전사 | 주먹 · 도끼 · 검 · 뿔나팔 · 군기 · 갈라진 땅 | 방패 · 활 |
| 기사 | 방패 · 기병창 · 군기 · 건틀릿 | 도끼 · 지팡이 |
| 궁수 | **화살 그 자체** · 활 · 화살통 | 근접 무기 |
| 마법사 | **원소 덩어리 자체** · 오브 (무기를 안 그린다) | 검 · 방패 |
| 사제 | 십자가 · 성경 · 손 · 빛기둥 | 날붙이 (심판만 예외) |

⚠ 전사·기사가 **군기**를 겹쳐 든다 — 기사 타일을 짤 때 갈라야 한다.

### 2-2. 글리프 = 형태 어휘가 정한다 (`skill_design.md §12-2` 의 아홉)

| 형태 | 글리프 |
|---|---|
| 단일 | 뾰족한 충격성 **하나** |
| 광역 | 동심 파문 링 또는 방사 다발 |
| 함성 | **열린** 부채꼴 호 셋 |
| 오오라 | **닫힌** 동심 링 (발밑 타원) |
| 버프 | 위로 향한 셰브론 |
| 디버프 | 아래로 향한 셰브론 · 사슬 |
| 회복 | 굵은 십자 + 위로 뜨는 방울 |
| 축복 | 위에서 내려오는 사다리꼴 빛기둥 |
| 소환 | 지면선 위로 솟은 형태 |

**함성(열린 호) ↔ 오오라(닫힌 링)** 가 전사·기사를 가르는 축(`skill_design.md §1-5`)을 그림에서 그대로 나른다.

### 2-3. 단색 전용 규칙 — 흰 틈

2차 시트의 교차 도끼가 40px 에서 **한 덩어리로 붙는다.** 음영이 없으니 겹친 두 물체를 가를 수단이 없다. 그래서 골격에 이 줄이 들어간다:

> `Where two shapes overlap, keep a clean white gap between them so they never merge.`

같은 이유로 **검은 선으로 그리는 균열은 금지**다 — 마법사 번개와 실루엣이 충돌한다. 갈라진 땅은 **검은 면 + 흰 틈**으로 뒤집어 그린다(§3 3번 타일).

## 3. 전사 7 [확정 2026-09-09 — 사용자 확정]

| # | id 가안 | 스킬 | 형태 | 타일 |
|---|---|---|---|---|
| 1 | `war_bash` | 배쉬 | 단일 | 45° 로 들어오는 꽉 쥔 주먹(팔뚝까지) + 뾰족한 만화식 충격성 하나 |
| 2 | `war_doubleswing` | 더블스윙 | 단일 | 도끼 두 자루가 X 로 교차, 겹치는 곳은 흰 틈 |
| 3 | `war_quake` | 지각균열 | 광역 | 머리부터 **수직으로** 박힌 도끼 + 검은 땅 판을 지나는 **흰 틈 균열** |
| 4 | `war_leap` | 리프어택 | 광역 | 굵은 포물선 도약 궤적 + 착지점에서 낮게 깔린 방사 충격선 |
| 5 | `war_taunt` | 도발 | 함성 · 디버프 | 고함치는 옆얼굴 + 끝이 **안으로 말린** 음파 호 셋 |
| 6 | `war_shout` | 외침 | 함성 · 버프 | 뿔나팔 + **각진 방패꼴** 음파 호 셋 |
| 7 | `war_battleorders` | 배틀오더스 | 함성 · 버프 | 치켜든 군기 + **위로 꺾인** 음파 호 셋 |

**갈라 둔 것**

- **함성 셋이 물건으로 갈렸다** — 얼굴 · 나팔 · 군기. 40px 실루엣 구분이 가장 커지는 조합이다. 대신 **효과(방어력 ↔ 최대 체력)는 그림이 설명하지 않는다** — 사용자 판단으로 직업 어휘를 택했다
- **도끼가 2·3 에 겹치므로 축을 반대로 준다** — 2 는 X 대각, 3 은 수직
- **1 과 4 의 충격이 안 닮게** — 1 은 한 점에서 터지는 뾰족한 별, 4 는 땅을 따라 길고 낮게 깔린 직선 방사
- **5 의 얼굴은 37개 중 유일**하다. 튈 위험을 알고 택했다 — 도발은 소리로 끄는 스킬이라 하나뿐인 편이 오히려 안 헷갈린다

### 발주 프롬프트 (전사 시트 — 그대로 복사) [개정 2026-09-09]

초판이 밋밋하게 나오는 원인 셋을 잡았다 — ⓐ **구도·역동성 지시가 통째로 없어서** 물건이 정중앙에 반듯이 서 있는 클립아트가 된다 · ⓑ `Match the attached sheet exactly` 가 스타일뿐 아니라 **그 시트의 소재(검 3자루)와 구도까지** 복사하라는 말로 먹힌다 · ⓒ **실루엣 무게 지시가 없어** 가늘고 휑하게 나온다. 딸려서 부정문(`never three elements`)을 긍정문으로, 모호한 `generous margin` 을 비율 수치로 바꿨다.

**8·9 는 전사 스킬이 아니다** — 「7개 넣고 두 칸 비워라」가 Gemini 가 가장 잘 어기는 지시라 9칸을 채운다. 특정 스킬에 안 묶이는 범용 타일이라 그림 없는 스킬의 **폴백 후보**로 쓰거나 버린다 (기사 타일을 미리 정하지 않으려고 기사 스킬을 안 넣었다).

```
Use the attached sheet for RENDERING STYLE ONLY — solid black silhouette, no
outline, no shading, no gradient, flat chunky masses, never thin lines. Do NOT
copy its subjects or its compositions; every icon below is a new drawing.

2048x2048 sheet, 3x3 grid, 9 fantasy skill icons on a PLAIN SOLID WHITE
background. Each icon is centered in its cell and fills about 70% of it, with
white margin all around — no icon may touch a grid line, the sheet edge, or
another icon. No text anywhere, no letters, no runes. No drop shadows, no
background scene, no frames.

Every icon is built from exactly two shapes: one object and one effect shape.
Every icon uses a dynamic diagonal composition with exaggerated motion — things
are tilted, swinging, mid-impact, never standing straight or symmetrical.
All nine icons share the same visual weight and the same amount of detail.
Where two shapes overlap, keep a clean white gap between them, at least as thick
as an axe haft, so they never merge into one mass.

1. A clenched fist driving in hard from the upper left on a steep diagonal,
   forearm following behind it, one spiky comic-style impact burst exploding
   where the knuckles land. Keep a clean white gap between each knuckle.
2. Two axes caught mid-swing, crossing in a wide X, heads biting outward.
3. One axe sunk deep head-down into the ground at a slight tilt, the ground
   buckling and splitting open around it — the ground is a solid black slab and
   the cracks are white gaps torn through it.
4. One thick parabolic leap arc, rising steeply then diving down, with long low
   impact strokes blasting outward across the ground where it lands. The arc is a
   solid chunky shape, thick at the start and tapering to the tip.
5. A shouting profile head, head and neck only, thrown back with the mouth wide
   open, three open sound arcs blasting out from it, each arc tip hooked inward
   like it drags something in.
6. A war horn tilted on a diagonal, bell pointing up and to the right, three
   angular shield-shaped sound arcs blasting out of the bell.
7. A war banner on a pole, whipping hard in the wind, three sound arcs bent
   upward into chevrons sweeping off it.
8. Two swords crossing in a wide X on a diagonal, blades up, one short spark
   burst where they meet.
9. A round-topped shield tilted on a diagonal, one heavy impact burst breaking
   against its face.
```

⚠ **먼저 40px 로 볼 타일 둘** — 1(주먹 마디가 뭉친다) · 7(군기 + 호 + 셰브론이 요소 셋으로 갈 수 있다).

## 4. 남은 것

- **기사 · 궁수 · 마법사 · 사제 타일 미논의** (30개)
- **id 는 전부 가안**이다. `skill.csv` 가 아직 옛 15개라 37개 대부분에 `skill_id` 가 없다(`skill_design.md §12-8`). **설치(파일명 확정 · `mock.js` 등록)는 CSV 재작성 이후** — `/client`
- **기존 자산 셋이 이번 안과 안 맞는다** — `war_bash.png`(검+충격성) · `wg_axe.png`(교차 도끼 · 흰 틈 없음) · `wg_sword2h.png`(초승달+검). 재배정 대상이지만 **아직 아무 파일도 안 옮겼다.** 남는 재사용은 `pri_judgment.png`(심판) 하나
- 컬러 `war_warcry.png` 는 폐기된 스킬 「함성」의 그림이자 유일한 컬러 자산이라 단색 통일 시 함께 정리된다
- **단색 합격선 재정의** 미착수 (§1 ⚠)

---
*마지막 업데이트: 2026-09-09 (**전사 발주 프롬프트 개정** — 초판이 밋밋했던 원인 셋(구도·역동성 지시 부재 · 앵커 문장이 소재까지 복사시킴 · 실루엣 무게 지시 부재)을 잡고, 부정문 → 긍정문 · 여백 → 비율 수치로 교체. 격자는 **3×3 9칸을 다 채운다** — 「7개 넣고 두 칸 비워라」가 잘 안 먹혀서, 8·9 를 특정 스킬에 안 묶이는 **범용 폴백 후보**로 채웠다 [사용자 지시]) · 2026-09-09 (최초 작성 — 단색 실루엣 문법(§1) · 「주체 × 글리프 · 요소 최대 둘」 골격(§2) · **전사 7 타일 확정**(§3, 사용자가 칸마다 택일)을 기록. 나머지 4직업 30개와 단색 합격선은 미착수)*
