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
| 마법사 | 8 | 미논의 | — | — |
| 사제 | 8 | 미논의 | — | `pri_judgment` 하나 (2차 시트) |

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

## 7. 남은 것

- **마법사 8 · 사제 7 타일 미논의** (15개 · 사제는 `pri_judgment` 하나만 설치)
- **재발주 후보 없음** — `war_quake`(→ 굵은 암석 덩어리) · `war_shout`(→ 굵은 쐐기꼴 음파) 둘 다 해결됐다
- ⚠ **약한 타일 둘은 남는다** — `kni_duel`(VS 글자가 40px 에서 뭉갠다 · 뜻은 실루엣이 든다) · `kni_might`(굽힌 팔이 원 안에서 뭉친다). 재발주까지는 아니고 눈에 걸리면 그때
- ⚠ **사제 타일을 짤 때 갈라야 할 것** — 파나티시즘이 **날개**를 썼다(§3 사제 초안의 신속이 「빛기둥 안 날개」였다)
- **단색 합격선 재정의** 미착수 — `SKILL.md` 의 스킬 합격선은 여전히 컬러 앵커 기준이다 (§1 ⚠)
- ⚠ **`mock.js:SKILL_ICON_FILES` 는 길이가 곧 해시 나머지**다 — 5 → 8 이 되며 그림 없는 스킬 29개의 임시 그림이 전부 재배정됐다

---
*마지막 업데이트: 2026-09-09 (**궁수 6 확정·설치** — §6 신설(한 번에 통과 · 굵기 지시가 주효 · 과녁 ↔ 오오라 원 배지 충돌 없음 확인). `war_shout` 재발주 해결로 **재발주 후보 0**. §0 갱신 · 남은 것은 §7 로. 남은 미논의는 마법사 8 · 사제 7) · 2026-09-09 (**원본 시트 개명 반영** — 앵커가 `sheet_02_mono_anchor.png` 다) · 2026-09-09 (**기사 8 확정·설치** — §5 신설(타일 표 + 오오라 「원 배지」 근거 + `no text` 예외 · 날개 겹침 ⚠). 1차 시트는 인챈트 하나만 통과하고 여섯이 반려됐다(사용자 지시 — 스마이트 정면 · 차지 D2식 · 질 잔상 3검 · 결투 VS · 오오라 D2 재정의). §0 에 기사 행 갱신 · 남은 것은 §6 으로. `war_quake` 재발주 해결) · 2026-09-09 (**전사 7 발주·설치 완료** — 3차 시트(3×3)에서 7칸 설치 + 여분 둘은 `unused/`. id 가안이 `skill.csv` 와 그대로 맞았다. §4 를 「발주 결과」로 재작성(실측 · 40px 판정 · **프롬프트에서 효과가 있던 것 넷**) · §0 에 설치 열 추가 · 남은 것은 §5 로. ⚠ 재발주 후보 둘 — `war_quake`(균열이 40px 에서 안 보인다) · `war_shout`(음파가 가늘다)) · 2026-09-09 (**전사 발주 프롬프트 개정** — 초판이 밋밋했던 원인 셋(구도·역동성 지시 부재 · 앵커 문장이 소재까지 복사시킴 · 실루엣 무게 지시 부재)을 잡고, 부정문 → 긍정문 · 여백 → 비율 수치로 교체. 격자는 **3×3 9칸을 다 채운다** — 「7개 넣고 두 칸 비워라」가 잘 안 먹혀서, 8·9 를 특정 스킬에 안 묶이는 **범용 폴백 후보**로 채웠다 [사용자 지시]) · 2026-09-09 (최초 작성 — 단색 실루엣 문법(§1) · 「주체 × 글리프 · 요소 최대 둘」 골격(§2) · **전사 7 타일 확정**(§3, 사용자가 칸마다 택일)을 기록. 나머지 4직업 30개와 단색 합격선은 미착수)*
