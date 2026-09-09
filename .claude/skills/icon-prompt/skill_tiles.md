# skill_tiles — 직업 스킬 아이콘 타일 목록

`skill_design.md §12` 의 **직업 스킬 풀 37개**에 붙일 아이콘의 **타일 문장**을 직업별로 확정해 두는 문서.
[prompt_template.md](prompt_template.md) 가 「어떻게 쓰는가」(골격·금지어)라면 여기는 **「무엇을 그리는가」**(대상별 확정문)다.
발주할 때는 골격 + 이 문서의 타일 목록을 이어 붙인다.

## 0. 상태

| 직업 | 수 | 타일 확정 | 발주 | 설치 |
|---|---|---|---|---|
| 전사 | 7 | **확정** (§3) | **완료** (3차 시트 3×3) | **7종 전부** (2026-09-09) |
| 기사 | 8 | **확정** (§5) | **완료** (2차 발주 · 1차는 6칸 반려) | **8종 전부** (2026-09-09) |
| 궁수 | 6 | **확정** (§6) | **완료** (5차 시트) | **6종 전부** (2026-09-09) |
| 마법사 | 8 | **확정** (§7) | **발주 대기** (8장 + 여분 1) | — |
| 사제 | 8 | **확정** (§8) | **발주 대기** (7장 + 여분 2 — 심판 제외) | `pri_judgment` 하나 (2차 시트) |

## 1. 스타일 — 단색 실루엣

전사 시트는 **2차 시트 문법**(`icons/skills/sheet_02_mono_anchor.png` — 검정 실루엣 · 외곽선 없음 · 음영 없음)으로 발주한다. 앵커 첨부도 컬러 `sheet_01_color.png` 가 아니라 이 시트다.

근거 — 실제 칸이 28~44px 이고(관전 쿨 32 · 스킬 창 28 · 카드 40 · 시작 화면 44), 단색 실측이 컬러보다 그 크기에서 또렷하다. 37장을 여러 시트로 나눠 뽑을 때 **팔레트가 어긋날 축이 없다**는 것도 크다. 파일이 단색이면 화면에서 색을 얹는 길(CSS 틴트)이 남는데 컬러로 가면 그 길이 닫힌다.

- **설치본은 이제 전부 단색이다** [2026-09-09] — 마지막 컴러 자산(`war_warcry`)이 전사 세트로 교체되며 사라졌다. 다만 **남은 4직업도 단색으로 간다는 명시 확정은 없다** — 기본값이 그렇다는 것까지다
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

## 4. 전사 세트 — 발주 결과 (2026-09-09)

시트 한 장(3×3 · 9칸)으로 받아 **7칸을 설치**하고 여분 둘은 `icons/skills/unused/` 로 내렸다. id 가안 7개가 `skill.csv` 와 **그대로 일치**했다(그 사이 R61 이 37행을 발행했다).

| 실측 | 값 |
|---|---|
| 프레이밍 | 장변 **88** · 중앙 **50/50** — 9칸 전부 (합격) |
| 절단 직후 | 색 수 34~43 · 경계 3~9% — 시트 안에서 고르다 |
| 설치본 | `colors 1 · edge 0% · dark 219~221` — 알파는 두고 RGB 만 `#d8d9e6` 로 채운 결과이고, **기존 설치본(`pri_judgment` 219)과 같은 대역**이다 |

**40px 판정** — ②더블스윙 · ⑦배틀오더스 최상 · ①배쉬 · ④리프어택 · ⑤도발 합격 · ⚠ **③지각균열**(검은 땅 판이 덩어리로 남고 흰 틈 균열이 안 보인다) · ⚠ **⑥외침**(음파 조각이 가늘어 부스러진다). 둘은 재발주 후보다.

**프롬프트에서 실제로 효과가 있었던 것** — 「렌더링 방식만 복사하라」(앵커의 소재를 안 베낀다) · 「겹치면 흰 틈」(교차 도끼가 40px 에서 갈렸다) · 「기울여서 · 동작 중」(정면 클립아트가 안 나왔다) · **타일 문장을 한 줄로 짧게**(길게 쓰면 절마다 요소를 그려 디테일이 붙는다 — 초판의 실패).

## 5. 기사 8 [확정 2026-09-09 — 사용자 지시로 재발주]

1차 시트는 **인챈트 하나만 통과**하고 여섯이 반려됐다(사용자 지시). 2차에서 전부 통과.

| # | id | 스킬 | 타일 |
|---|---|---|---|
| 1 | `kni_smite` | 스마이트 | **정면** 방패 + 방패 면에서 터지는 충격성 |
| 2 | `kni_charge` | 차지 | **질주하는 전사** + 등 뒤로 흐르는 굵은 에너지 파동 (D2 차지) |
| 3 | `kni_rush` | 질 | **부채꼴로 겹친 똑같은 검 셋** — 잔상 |
| 4 | `kni_duel` | 결투 선언 | 마주 선 전사 둘 + **VS** 두 글자 |
| 5 | `kni_enchant` | 인챈트 | 검 + 감아 오르는 혓불 (1차 시트에서 통과) |
| 6 | `kni_might` | 마이트 | **원 배지** + 굽힌 팔 |
| 7 | `kni_fanaticism` | 파나티시즘 | **원 배지** + 날개 한 쌍 |
| 8 | `kni_defiance` | 디파이언스 | **원 배지** + 방패 |

**오오라 셋이 「원 배지」인 근거** — D2 팔라딘 오오라 아이콘 14개 중 12개가 「원형 테 + 어두운 원판 + 그 안의 작은 심볼」이고
일반 전투 스킬은 원 없이 꽉 채운다. **오오라임을 말하는 것은 심볼이 아니라 프레임**이다. 톱니 테는 40px 에서 죽으므로 민 원으로,
원본 심볼 둘은 단색에서 죽어 바꿨다(Might 갈고리 → 굽힌 팔 · Fanaticism 가는 줄무늬 → 날개). 조사는 sonnet 에이전트 (Arreat Summit 원본 아이콘 직접 확대).

⚠ **`no text` 예외 하나** — 결투 선언의 VS 는 골격의 「글자 금지」를 그 타일만 명시적으로 뚫었다. 40px 에서 글자가 살짝 뭉개지지만 두 전사 실루엣이 뜻을 든다.
⚠ **날개가 사제 신속과 겹칠 자리** — §3 사제 초안이 「빛기둥 안 날개」였다. 사제 타일을 짤 때 갈라야 한다.

## 6. 궁수 6 [확정 2026-09-09]

한 번에 통과했다. **화살이 이 세트에서 가장 가는 물건**이라 머리에 굵기 지시를 따로 한 줄 박은 것이 주효했다
(`arrows must be CHUNKY: a thick heavy shaft, a big wide arrowhead and big fletching`).

| # | id | 스킬 | 타일 |
|---|---|---|---|
| 1 | `arc_snipe` | 저격 | 동심 과녁 한가운데 박힌 묵직한 화살 |
| 2 | `arc_rapid` | 연사 | 줄지어 나는 묵직한 화살 셋 + 굵은 속도선 |
| 3 | `arc_guided` | 가이드에로우 | 휜 비행 궤적 + 금 간 판 |
| 4 | `arc_multishot` | 멀티플 샷 | 한 점에서 부챗살로 퍼지는 화살 다섯 |
| 5 | `arc_pierce` | 관통 사격 | 두꺼운 판 셋을 일직선으로 꿰뚫은 화살 |
| 6 | `arc_poison` | 독화살 | 큼직한 화살촉 + 떨어지는 통통한 방울 셋 |

7번 칸은 **`war_shout` 재발주**(굵은 쐐기꼴 음파)로 채워 해결했고, 8·9(화살통 · 활)는 `unused/` 로 내렸다.

**걱정했던 충돌은 안 났다** — 1번 과녁(동심 다중 링 + 꿰뚫는 화살)과 기사 오오라(굵은 단일 원 + 갇힌 심볼)가 40px 에서 확실히 갈린다.

## 7. 마법사 8 [확정 2026-09-09 — 사용자가 칸마다 개정]

**주체를 무기가 아니라 원소 덩어리 자체로 잡는다**(§2-1). 초안은 원소 셋 × (단일 · 광역) 격자를 그대로 그림의 격자로 썼고, **사용자가 여섯 칸을 D2 어휘로 다시 잡았다** — 인페르노(에너지파형 각진 분사) · 프로스트 노바(D2 노바) · 라이트닝/연쇄(대각선) · 마력 집중(사람 + 나뭇잎) · 프로즌월(대각선).

| # | id | 스킬 | 형태 | 타일 | 갈라 둔 것 |
|---|---|---|---|---|---|
| 1 | `mag_fireball` | 파이어볼 | 단일 · 화염 | 대각선으로 날아드는 둥근 **불덩이** + 뒤로 흐르는 굵은 불꼬리 | — |
| 2 | `mag_inferno` | 인페르노 | 광역 · 화염 | 좌하 한 점에서 우상으로 뻗는 **원뿔형 화염 분사** — 각진 불꽃 덩어리가 겹쳐 쌓이며 넓어진다 | ⚠ `war_shout`(나팔+쐐기 음파) · `arc_multishot`(부챗살)과 방사 형태가 닮는다 → **각진 덩어리**로 굵게 (그쪽은 가늘고 뾰족하다) |
| 3 | `mag_iceblast` | 아이스 블라스트 | 단일 · 냉기 | 대각선으로 박히는 **각진 얼음 창 하나** + 박힌 자리의 굵은 파편 | 8 과 둘 다 대각선 얼음 → 이쪽은 **창 하나 + 파편** |
| 4 | `mag_frostnova` | 프로스트 노바 | 광역 · 냉기 | **바닥에 낮게 깔린 타원 파동 링** + 링을 따라 위로 솟은 굵은 얼음 침 여럿 | 정원 링은 기사 원 배지 셋 · `arc_snipe` 과녁과 충돌 → **눕힌 타원 + 톱니 실루엣**으로 갈랐다 |
| 5 | `mag_lightning` | 라이트닝 | 단일 · 번개 | 좌상 → 우하 **대각선으로 내리꽂는 굵은 지그재그 볼트 하나** + 착탄 자리에 크게 터지는 충격성 | 6 과 둘 다 대각선 볼트 → 이쪽만 **착탄 폭발**을 붙인다 |
| 6 | `mag_chain` | 연쇄 번개 | 광역 · 번개 | 굵은 **대각선 볼트 하나** + 옆에 나란히 작은 볼트 둘 (크기가 계단으로 준다) | 이쪽은 **충격성 없음** · 개수와 크기 계단만으로 「옮겨 가며 약해진다」 |
| 7 | `mag_focus` | 마력 집중 | 버프 | 정면으로 선 **사람 실루엣** + 둘레에 떠오르는 뾰족한 **나뭇잎** 서넛 | 사람 실루엣이 넷째다(`war_taunt` 옆얼굴 · `kni_charge` 질주 · `kni_duel` 대치) → 이쪽만 **가만히 선 정면** |
| 8 | `mag_frozenwall` | 프로즌월 | 소환 | **대각선으로 비스듬히 선 얼음 벽** — 각진 판이 좌하 → 우상으로 늘어서고 위가 삐죽하다 | 지면 막대를 뺐다 → 2 와 「지면 막대 공유」 문제가 사라졌다 |

**초안에서 바뀐 것** — ~~인페르노 = 지면에서 솟는 불기둥 다섯~~ · ~~프로스트 노바 = 얼음 침 여덟의 별~~ · ~~라이트닝 = 수직 볼트~~ · ~~연쇄 = 세 갈래로 갈라지는 볼트~~ · ~~마력 집중 = 각진 보석 + 셰브론~~ · ~~프로즌월 = 지면 막대에서 솟은 벽~~ [사용자 개정].
바뀌며 **초안이 갖고 있던 「2 와 8 이 지면 막대를 공유한다」 ⚠ 는 사라졌고**, 대신 **대각선이 넷(3 · 5 · 6 · 8)** 으로 늘어 그 안에서 다시 갈라야 했다.

**9 번 칸은 마법사 스킬이 아니다** — `kni_might` 재발주 (§9).

### 발주 프롬프트 (마법사 시트 — 그대로 복사) [단축 2026-09-09]

⚠ **타일 문장은 한 줄로 짧게** — §4 가 전사 세트에서 얻은 교훈이다(길게 쓰면 절마다 요소를 그려 디테일이 붙는다). 초판이 세 줄씩이라 사용자가 다시 줄였다.

```
Use the attached sheet for RENDERING STYLE ONLY — solid black silhouette, no
outline, no shading, no gradient, flat chunky masses, never thin lines. Do NOT
copy its subjects or its compositions.

2048x2048 sheet, 3x3 grid, 9 fantasy skill icons on a PLAIN SOLID WHITE
background. Each icon is centered in its cell and fills about 70% of it — no
icon may touch a grid line, the sheet edge, or another icon. No text, no
letters, no runes, no shadows, no background, no frames.

Tilted, diagonal, mid-motion compositions, except where noted.
All nine share the same visual weight and the same amount of detail.
Flame, lightning and ice must be CHUNKY — thick masses with blunt tips, never
thin strands, never small specks.
Where shapes overlap, keep a clean white gap between them.

1. A ball of fire flying in on a diagonal with a thick flame tail.
2. A cone of chunky angular flame blasting out toward the upper right. Only
   fire — no hand, no mouth.
3. One big angular ice shard driving in on a diagonal, chunky splinters where
   it hits.
4. A flat ellipse of ice sweeping outward low across the ground, thick blunt
   spikes rising along it.
5. One heavy zigzag bolt striking down on a diagonal, one big burst where it
   lands.
6. One heavy zigzag bolt on a diagonal with two smaller bolts beside it,
   stepping down in size. No burst.
7. A figure standing front-on, arms down, thick pointed leaves floating up
   around it.
8. A wall of thick angular ice slabs standing on a diagonal, tops jagged.
9. A thick plain circular ring with a big clenched fist punching up inside it,
   white gap between fist and ring.
```

⚠ **먼저 40px 로 볼 타일** — **5 · 6**(대각선 볼트 둘) · **3 · 8**(대각선 얼음 둘) · **7**(잎이 `pri_regen` 방울과 닮으면 갈아야 한다) · **2**(각진 덩어리가 안 굵으면 부챗살과 붙는다).
## 8. 사제 7 [확정 2026-09-09]

`pri_judgment` 은 2차 시트에서 이미 설치돼 있어 **나머지 일곱**만 발주한다.

**축복 셋을 「빛기둥 프레임」 한 세트로 묶는다** — 기사 오오라 셋(§5)이 「원 배지 + 갇힌 심볼」로 통한 문법을 **프레임 모양만 바꿔** 재사용한다. 빛기둥은 **위에서 아래로 벌어지는 굵은 막대 둘**이고 심볼이 그 사이에 앉는다. 닫힌 원과 열린 사다리꼴이라 40px 에서 두 세트가 안 섞인다.

| # | id | 스킬 | 형태 | 타일 |
|---|---|---|---|---|
| 1 | `pri_heal` | 치유의 빛 | 회복 · 파티 | 굵은 **십자** + 사방으로 퍼지는 넓적한 방사 다발 |
| 2 | `pri_grace` | 은총 | 축복 · 버프 | **빛기둥** + 사이에 위로 향한 셰브론 둘 |
| 3 | `pri_haste` | 신속 | 축복 · 버프 | **빛기둥** + 사이에 기울어진 굵은 **모래시계** |
| 4 | `pri_cure` | 힐 | 회복 · 단일 | 정면으로 펼친 **손바닥 하나** + 그 위에 뜬 굵은 십자 |
| 5 | `pri_regen` | 재생의 기도 | 축복 · 버프 | **빛기둥** + 사이에 위로 뜨는 통통한 방울 셋 |
| 6 | `pri_penitence` | 참회 | 디버프 | 기울여 놓은 **펼친 성경** + 아래로 향한 셰브론 셋 |
| 7 | `pri_bind` | 속박 | 디버프 | 묵직한 **족쇄 고리 하나** + 늘어진 굵은 사슬 고리 셋 |

**갈라 둔 것**

- **회복 둘이 주체로 갈렸다** — 파티(1)는 십자가 크게 서고 빛이 사방으로, 단일(4)은 손이 크고 십자가 그 위에 작게. 「퍼진다 ↔ 얹는다」가 그대로 실루엣이다
- **⚠ 날개 충돌을 「안 쓰는 것」으로 풀었다** — §5 가 경고한 자리(파나티시즘이 날개)라 신속을 **모래시계**로 갔다. 다만 모래시계는 「느려진다」로 거꾸로 읽힐 수 있어 **날개판을 예비 타일(8번 칸)로 같이 받는다** — 40px 에서 둘을 대 보고 고른다. 날개판을 택해도 프레임이 원 ↔ 빛기둥으로 갈려 파나티시즘과 안 섞인다
- ⚠ **6 의 성경이 장차 무기 아이콘 `bible.png` 와 소재를 공유한다** — 무기 아이콘은 컬러 카툰이고 스킬은 단색이라 화면에서는 갈리지만 소재 중복은 남는다 (사제 무기 둘 `crucifix` · `bible` 은 **아이템 아이콘이 아직 없다**)
- **8 · 9 는 사제 스킬이 아니다** (§9)

### 발주 프롬프트 (사제 시트 — 그대로 복사)

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
All nine icons share the same visual weight and the same amount of detail.
Crosses, droplets, chains and beams must be CHUNKY: thick heavy masses, never
thin lines, never small scattered dots.
Where two shapes overlap, keep a clean white gap between them, at least as thick
as a finger, so they never merge into one mass.

1. One bold thick cross standing at the center, with broad flat rays spreading
   out from it in every direction, wide where they leave the cross and tapering
   outward.
2. A shaft of light coming down from above — two thick black bars slanting apart
   as they descend, open at the top and at the bottom — with two bold chevrons
   pointing up stacked between them.
3. The same shaft of light — two thick black bars slanting apart as they descend
   — with one big blocky hourglass tilted between them.
4. One open palm seen from the front, thick blunt fingers spread wide, with one
   bold cross floating just above it. Keep a clean white gap between each finger.
5. The same shaft of light — two thick black bars slanting apart as they descend
   — with three fat round droplets rising up between them, biggest at the bottom.
6. One open book lying at a tilt, thick covers and a solid block of pages, with
   three bold chevrons pointing down beneath it.
7. One massive shackle ring, thick and heavy, tilted, with three fat chain links
   hanging off it and swinging to one side. The links are thick closed loops.
8. The same shaft of light — two thick black bars slanting apart as they descend
   — with one pair of broad spread wings between them.
9. One bold thick cross tilted on a diagonal, with three thick chevrons pointing
   up stacked above it, biggest at the bottom.
```

⚠ **먼저 40px 로 볼 타일 넷** — 2 · 3 · 5(빛기둥 셋이 서로 안 갈리면 세트가 통째로 무너진다) · 7(사슬 고리가 가늘면 부스러진다).

## 9. 여분 칸에 넣은 재발주 · 예비 [2026-09-09]

15개를 3×3 두 장에 넣으면 **세 칸이 남는다.** 「7개 넣고 두 칸 비워라」가 잘 안 먹히므로(§3) 남는 칸을 다음으로 채웠다 — 전부 **안 쓰면 `unused/` 로 내린다.**

| 시트 | 칸 | 무엇 | 왜 |
|---|---|---|---|
| 마법사 | 9 | `kni_might` 재발주 — 원 배지 + **치켜든 주먹**(굽힌 팔 대신) | §5 기사 세트가 남긴 약한 타일. **40px 몽타주에서 재확인** — 이두박근이 원 안에서 덩어리로 뭉친다 |
| 사제 | 8 | `pri_haste` **날개판** | 모래시계가 「느려진다」로 읽히면 갈아끼운다 (§8) |
| 사제 | 9 | **「프레임 없는 축복」 시험판** — 십자 + 위로 향한 셰브론 셋 | 사제 시트의 최대 위험은 **빛기둥 셋이 서로 안 갈리는 것**이다(9칸 중 넷이 그 프레임). 프레임 없이도 축복이 읽히는지 한 칸으로 미리 잰다 |

**`kni_duel` 재발주는 보류했다** — 40px 몽타주에서 **VS 가 읽힌다**(§5 가 「살짝 뭉개진다」고 적어 둔 것보다 낫다). 게다가 글자를 받으려면 골격의 `no text` 를 그 시트에서 풀어야 하는데, 그 예외가 **같은 시트의 사제 7장으로 샐 위험**이 재발주 이득보다 크다.

## 10. 남은 것

- **마법사 8 · 사제 7 은 타일 확정 · 발주 대기** (§7 · §8). 이 15장이 설치되면 `skill.csv` **37행 전부**가 제 그림을 갖는다 — `mock.js:skillIcon` 의 해시 폴백이 도는 스킬이 0 이 된다(코드는 그대로 둔다)
- **단색 합격선 재정의** 미착수 — `SKILL.md` 의 스킬 합격선은 여전히 컬러 앵커 기준이다 (§1 ⚠)
- ⚠ **약한 타일은 `kni_might` 하나만 여분 칸에서 재발주를 받는다** (§9) — 채택은 40px 에서 대 보고. `kni_duel` 은 보류
- ⚠ **`mock.js:SKILL_ICON_FILES` 는 길이가 곧 해시 나머지**다 — 22 → 37 이 되며 남은 폴백 배정이 다시 바뀐다(전부 제 그림이 되므로 결과적으로 무해)
- **이 스킬의 소관 밖** — 사제 무기 `crucifix` · `bible` 은 **아이템 아이콘이 없다**(09-07 무기군 신설 이후 미발주). `art/README.md` 의 「무기군 `release=main` 8종 · 8종 전부」 표가 그만큼 낡았다
---
*마지막 업데이트: 2026-09-09 (**마법사 타일 6칸 개정** [사용자] — 인페르노(지면 불기둥 → **각진 화염 원뿔 분사** · D2 인페르노) · 프로스트 노바(별 → **바닥 타원 파동 + 얼음 침** · D2 노바) · 라이트닝(수직 → **대각선 + 착탄 폭발**) · 연쇄(세 갈래 → **대각선 볼트 + 작은 볼트 둘**) · 마력 집중(보석+셰브론 → **사람 실루엣 + 나뭇잎**) · 프로즌월(지면 벽 → **대각선 벽**). 초안의 ⚠ 「2 와 8 이 지면 막대 공유」는 사라졌고 **대각선이 넷(3·5·6·8)** 으로 늘어 그 안에서 다시 갈랐다 — 5 만 착탄 폭발 · 6 은 크기 계단 · 3 은 창 하나 · 8 은 판 여럿. 프롬프트도 그에 맞춰 재작성) · 2026-09-09 (**마법사 8 · 사제 7 타일 확정 — 발주 대기** — §7(마법사) · §8(사제) · §9(여분 칸 셋) 신설, 남은 것은 §10 으로. 마법사는 **원소 셋 × 단일/광역 격자를 그림의 격자로** 썼고(같은 원소끼리 축을 뒤집어 갈랐다), 사제는 **축복 셋을 「빛기둥 프레임」 한 세트**로 묶었다 — 기사 오오라 「원 배지」 문법을 프레임 모양만 바꿔 재사용한 것이라 닫힌 원 ↔ 열린 사다리꼴로 갈린다. §5 가 경고한 **날개 충돌**은 신속을 모래시계로 돌려 피하고 날개판을 예비 타일로 같이 받는다. 남는 세 칸은 `kni_might` · `kni_duel` 재발주와 그 예비로 채웠다. 이 15장이 설치되면 **`skill.csv` 37행 전부**가 제 그림을 갖는다) · 2026-09-09 (**궁수 6 확정·설치** — §6 신설(한 번에 통과 · 굵기 지시가 주효 · 과녁 ↔ 오오라 원 배지 충돌 없음 확인). `war_shout` 재발주 해결로 **재발주 후보 0**. §0 갱신 · 남은 것은 §7 로. 남은 미논의는 마법사 8 · 사제 7) · 2026-09-09 (**원본 시트 개명 반영** — 앵커가 `sheet_02_mono_anchor.png` 다) · 2026-09-09 (**기사 8 확정·설치** — §5 신설(타일 표 + 오오라 「원 배지」 근거 + `no text` 예외 · 날개 겹침 ⚠). 1차 시트는 인챈트 하나만 통과하고 여섯이 반려됐다(사용자 지시 — 스마이트 정면 · 차지 D2식 · 질 잔상 3검 · 결투 VS · 오오라 D2 재정의). §0 에 기사 행 갱신 · 남은 것은 §6 으로. `war_quake` 재발주 해결) · 2026-09-09 (**전사 7 발주·설치 완료** — 3차 시트(3×3)에서 7칸 설치 + 여분 둘은 `unused/`. id 가안이 `skill.csv` 와 그대로 맞았다. §4 를 「발주 결과」로 재작성(실측 · 40px 판정 · **프롬프트에서 효과가 있던 것 넷**) · §0 에 설치 열 추가 · 남은 것은 §5 로. ⚠ 재발주 후보 둘 — `war_quake`(균열이 40px 에서 안 보인다) · `war_shout`(음파가 가늘다)) · 2026-09-09 (**전사 발주 프롬프트 개정** — 초판이 밋밋했던 원인 셋(구도·역동성 지시 부재 · 앵커 문장이 소재까지 복사시킴 · 실루엣 무게 지시 부재)을 잡고, 부정문 → 긍정문 · 여백 → 비율 수치로 교체. 격자는 **3×3 9칸을 다 채운다** — 「7개 넣고 두 칸 비워라」가 잘 안 먹혀서, 8·9 를 특정 스킬에 안 묶이는 **범용 폴백 후보**로 채웠다 [사용자 지시]) · 2026-09-09 (최초 작성 — 단색 실루엣 문법(§1) · 「주체 × 글리프 · 요소 최대 둘」 골격(§2) · **전사 7 타일 확정**(§3, 사용자가 칸마다 택일)을 기록. 나머지 4직업 30개와 단색 합격선은 미착수)*
