# 파티 전술 = 작전 카드 3칸 — 구현 계획 (R586)

> 사용자 11-25 「지금 구조에서 새로운 구조로 바꿔줘볼래? 기획,코드,UI까지 전부 바꿔줘」.
> 기획 논의 기록은 [PLAN_tactic_reroll.md](PLAN_tactic_reroll.md)에 있다. 이 문서는 **결정 · 계약 · 나눈 일 · 검증**만 담는다.
> 수치는 전부 CSV에 둔다. 아래 수치는 모두 ⚠제안 값이다(밸런스는 나중에 맞춘다).

## 0. 결정 (사용자 11-25)

| # | 결정 | 사용자 말 |
|---|---|---|
| D1 | 첫 카드 11장 — §2 표 | 「대답안한건 너의 추천대로」 |
| D2 | 카드 등급은 **옵션 등급의 천장**만 정한다. 카드 효과의 n은 종류마다 하나다 | 추천대로 |
| D3 | 옵션 줄은 **카드마다 2줄**이다. 옵션 종류는 그 카드 죄종의 풀(지금 `tactic_option.csv` 22행)에서 뽑는다 | 추천대로 |
| D4 | 인챈트 = 줄마다 버튼 하나. **그 줄만 굴리고 결과가 바로 바뀐다**(원래 것 vs 새 것 고르기 없음). 바뀌는 것은 ① 옵션 종류 ② 등급(한 단계 오르거나 내리거나, 가운데는 20% 그대로) ③ 범위 안 값이다 | 추천대로 |
| D5 | 인챈트 비용 = 골드 + **카드 조각**. 조각은 카드를 분해해 얻는다 | 추천대로 |
| D6 | 드랍처 = **정예 · 스테이지보스를 쓰러뜨릴 때 확률**. 카드 등급 가중치는 5단이다 | 추천대로 |
| D7 | **카드는 소모품이다** — 가방에 여러 장(중복 포함) 들 수 있고, 칸에 장착하면 소모된다. **옵션 수치는 장착할 때 굴린다.** 칸에 든 카드를 다른 카드로 바꾸면 옛 카드(와 굴려 둔 옵션)는 사라진다 | 「도감방식이 아니라 그냥 그 카드를 해당 칸에 장착하는 소모품으로 … 장착할 떄 세부옵션수치가 결정되도록」 |
| D8 | 지휘 천막 **1 · 2 · 3랭크**가 공격 · 방어 · 유틸 칸을 연다. 4 · 5랭크의 칸 효과는 걷는다 | 「칸열기 1,2,3랭크」 |
| D9 | 첫 카드: 칸이 열릴 때 그 갈래의 **일반 카드 한 장**을 가방에 넣어 준다(공격 = 일기토 · 방어 = 방패벽 · 유틸 = 독화살). 메인미션 「전술 리롤」 줄은 「카드 장착」이 된다 | 「첫카드 ㅇㅇ 아무거나 만들어서 던져줘」 |
| D10 | 옛 세이브의 전술(굴려 둔 5칸 · 잠금 · 함께 처치 수)은 **버린다**. 이미 열린 칸만큼 D9의 첫 카드를 준다 | 「ㅇㅇ버려」 |
| D11 | 결투장 · 시련 탑 AI 팀도 카드로 바꾼다. 온라인 팀 코드 판을 2 → 3으로 올린다 | 「ㅇㅇ똑같이바꿔야지」 |
| D12 | 화면: 왼쪽에 카드 3장(위 → 아래), 카드마다 오른쪽에 옵션 줄과 굴리기 버튼. 카드에 마우스를 올리면 효과 설명. 카드를 누르면 그 갈래의 가방 카드 목록(장착 · 분해). **아래 리더 통솔 · 죄종 점수 판은 그대로** | 「ㅇㅇ맞음 이렇게가보자」 · 「지금있는 아래의 리더 통솔및 죄종점수는 그대로 내버려줘」 |
| D13 | 도발이 영웅 쪽에만 먹는 어긋남을 고친다 — 대상 카드보다 먼저 | 추천대로(1번 항목에 포함) |
| D14 | 편성마다 칸 3개(지금 v34의 「편성마다 전술」 그대로). 장착은 그 편성의 칸에 한다 | (지금 구조 유지) |

## 1. 지금 → 바뀐 뒤

| | 지금 | 바뀐 뒤 |
|---|---|---|
| 칸 | 5칸 · 칸마다 조건(`tactic_slot.csv` · `tactic_condition.csv`) | 3칸(공격 · 방어 · 유틸) · 조건 없음 |
| 얻기 | 드랍 없음 · 시드 첫 배정 + 골드 전체 리롤 + 잠금 | 드랍 → 가방 → 장착(소모) |
| 효과 | 옵션 하나(스탯) | 카드 규칙(전투) + 옵션 2줄(스탯) |
| 등급 | 3단 · 등급 배수 | 5단 · 등급마다 범위 · 한 단계 걷기 |
| 리더 통솔 · 죄종 점수 | 옵션 값에 `× (1 + leadPart + gearPart)` | **같은 식으로 옵션 줄 값에 곱한다**(카드 규칙의 n에는 안 곱한다) |

## 2. 카드 11장 (`src/data/tactic_card.csv` 신설)

| card_id | 칸 | 죄종 | rule | 효과 (대가는 효과 안) | p1 | p2 | p3 |
|---|---|---|---|---|---|---|---|
| duel | attack | pride | duel | 우리 리더의 단일 공격은 적 리더만 노린다 — 지목 · 도발 · 전열 문보다 먼저. 적 리더가 쓰러지면 그 라운드는 평소 규칙 | – | – | – |
| wedge | attack | envy | wedge | 리더의 단일 공격이 맞힌 적에 표식(p1초) — 표식 동안 동료의 단일 공격이 그 적부터 | 4 | – | – |
| trojan | attack | sloth | trojan | 라운드 시작 p1초 동안 우리 후열은 행동하지 않는다 · 그 뒤 후열의 단일 공격은 적 후열을 노린다(전열 문 무시 · 적 후열이 없으면 평소) | 3 | – | – |
| charge | attack | wrath | charge | 라운드가 시작되면 우리 전열은 바로 첫 행동 · 후열의 첫 행동은 p1초 늦는다 | 1.5 | – | – |
| shieldwall | defense | gluttony | shieldwall | 우리 후열이 맞는 직격의 p1을 살아 있는 전열이 똑같이 나눠 받는다 | 0.3 | – | – |
| guard | defense | pride | guard | 우리 리더가 맞는 단일 직격의 p1을 체력이 가장 높은 동료(리더 · 소환 제외)가 대신 받는다 | 0.4 | – | – |
| turtle | defense | gluttony | turtle | 라운드 시작 p1초 동안 우리 편 받는 피해 −p2 · 공속 −p3 | 5 | 0.3 | 0.3 |
| retreat | defense | lust | retreat | 우리 전열 영웅의 체력이 그 라운드 처음으로 p1 아래가 되면, 체력 비율이 가장 높은 후열과 자리를 바꾼다(라운드가 끝나면 원래 자리 · 영웅마다 라운드당 1번) | 0.3 | – | – |
| poison_arrow | utility | envy | poison_arrow | 우리 편 물리 피해의 p1을 독 피해로 입힌다(물리 → 원소 전환 길) | 0.3 | – | – |
| fire_arrow | utility | wrath | fire_arrow | 우리 편 물리 피해의 p1을 화염 피해로 입히고 p2 확률로 화상 | 0.3 | 0.2 | – |
| baggage | utility | greed | baggage | 우리 편이 물약을 마시면 회복량의 p1을 살아 있는 다른 동료가 똑같이 나눠 받는다(마신 영웅은 그만큼 덜) | 0.5 | – | – |

- 열: `card_id,slot,sin,rule,p1,p2,p3,description_kr` (`-` = 없음). 이름 · 효과 문장은 i18n(ko/en)이다. 렌더러에 한국어 리터럴을 쓰지 않는다.
- **리더**
  - 파티 = 편성 첫 칸(`partyUnits[0]`) · 결투장 적 = 적 영웅 첫 칸.
  - PvE 적 리더는 라운드마다 하나다. 정예가 있으면 정예, 보스 라운드면 스테이지보스, 일반만 있으면 최대 체력이 가장 큰 적이다(같으면 앞줄 → 앞 자리).
  - 라운드 도중 적 리더가 쓰러지면 새 리더를 뽑지 않는다.
- 규칙은 **쪽마다** 건다(결투장 수비 팀의 카드는 적 쪽에 걸린다). 같은 rule이 한쪽에 두 번 오지 않는다(칸이 갈래별 하나).

## 3. 데이터

**`tactic_option.csv`(유지 · 22행)**
- 옵션 줄의 풀이다. `unit` = 범위 배수 1일 때의 값이다.
- 값 = `unit × (1 + mult_share × (m − 1))`이고, m = 그 등급 범위 [lo, hi]에서 균등으로 뽑는다.
- 고정값 채널(`_flat`)은 정수로 반올림한다.

**걷는 것**
- `tactic_slot.csv` · `tactic_condition.csv` 삭제
- `sin_attr.csv`의 `tactic_attr_id` 열 삭제
- `building_effect.csv`의 지휘 천막 4 · 5랭크 `tactic_slots` 행 삭제

**`balance.csv`**
- 걷는 키
  - `tactic_grade_weight_common/magic/rare`
  - `tactic_grade_mult_*`
  - `tactic_reroll_base_cost` · `tactic_reroll_lock_mult`
- 남기는 키
  - `tactic_leader_mult_min/max`
  - `tactic_sin_gear_pct` · `tactic_sin_hero_score`
- 새 키 ⚠제안

| 키 | 값 |
|---|---|
| `tactic_card_weight_{common,magic,rare,epic,legendary}` | 60 / 25 / 10 / 4 / 1 — 드랍 카드 등급 |
| `tactic_line_weight_{…}` | 50 / 30 / 13 / 5 / 2 — 장착 때 옵션 등급(카드 등급 이하만 · 다시 정규화) |
| `tactic_line_lo_{…}` · `tactic_line_hi_{…}` | 0.5–0.8 / 0.8–1.1 / 1.1–1.5 / 1.5–2.0 / 2.0–2.6 |
| `tactic_line_count` | 2 |
| `tactic_enchant_stay_pct` | 0.2 — 가운데 등급에서 그대로 |
| `tactic_enchant_up_pct` | 0.45 — 움직일 때 오를 몫 |
| `tactic_enchant_gold` | 500 |
| `tactic_enchant_shard` | 1 |
| `tactic_shard_{…}` | 1 / 2 / 4 / 8 / 16 — 분해 조각 |
| `tactic_drop_elite_pct` | 0.03 |
| `tactic_drop_boss_pct` | 0.1 |

**등급 걷기 (D4)**
- 가운데 등급: 그대로 `stay`, 오름 `(1 − stay) × up`, 내림 `(1 − stay) × (1 − up)`
- 바닥(일반): 내림 몫이 그대로에 붙는다
- 천장(**카드 등급**): 오름 몫이 그대로에 붙는다

**`arena_tier.csv` · `trial_floor.csv`**
- `tactic_slots` = 카드 장수(1 ~ 3 · 공격 → 방어 → 유틸 순). 지금 값이 3을 넘으면 3이다.
- `tactic_grade` = 카드 등급(5단 어휘).

**`main_mission.csv`**
- 1장 「전술 리롤」 줄(R583)을 「카드 장착」으로 바꾼다. 카운터는 `tacticEquip`이다.

## 4. 세이브 v52

| 필드 | 모양 |
|---|---|
| `tacticBag` | `{ "<card_id>|<grade>": n }` — 가방(옵션이 없어 같은 종류 · 등급은 개수로 쌓인다) |
| `tacticShards` | 수 |
| `presets[*].tactics` | `{ attack: Slot|null, defense: Slot|null, utility: Slot|null }` · `Slot = { card, grade, lines: [{ id, grade, m }] }` (`m` = 뽑힌 범위 배수 · 값은 `m`으로 다시 잰다) |
| `counters` | `tactic`(옛 리롤 회차)을 걷는다 → `tacticEquip` · `tacticEnchant` · `tacticDrop`(굴림 번호) |

- `killsTogether` · `explores[*].squad.tactics`는 걷는다.
- **v51 → v52 업그레이드**: 옛 `presets[*].tactics` · `killsTogether` · `counters.tactic`을 버린다. 열린 칸(지휘 천막 랭크) 수만큼 첫 카드를 가방에 넣는다.
- 첫 카드는 **칸이 처음 열릴 때 한 번**이다. 세이브에 `tacticStarter: ['attack', …]`(준 갈래)를 둬서 두 번 주지 않는다.

## 5. 굴림 (INTERFACE §5-2에 적는다 · 솔트는 새로)

- **드랍**
  - 정예 · 스테이지보스가 쓰러질 때(파티가 이긴 라운드의 정산) 그 몬스터마다 `seedOf(state, SALT_DROP, ++counters.tacticDrop)`로 rng를 만든다.
  - 굴리는 순서: ① 떨어지나 ② 카드(11장 균등 · CSV 행 순) ③ 카드 등급(가중).
  - **기존 전리품 rng 흐름을 건드리지 않는다**(별도 스트림 — 골든 무변동).
- **장착**: `seedOf(state, SALT_EQUIP, ++counters.tacticEquip)`로 줄마다 ① 옵션 종류(그 죄종 풀 균등 · 다른 줄과 같은 행 제외) ② 등급(가중 · 천장 이하) ③ m(범위 균등)을 굴린다.
- **인챈트**: `seedOf(state, SALT_ENCHANT, ++counters.tacticEnchant)`로 ① 종류(그 죄종 풀 균등 · 다른 줄 제외 · 지금 것은 허용) ② 등급 걷기 ③ m을 굴린다.
- **시련 탑 · 결투장 AI 팀**: 층 시드(`FLOOR_TACTIC_SALT` 자리)로 칸마다 ① 카드(그 갈래 균등) ② 줄마다 장착과 같은 3회. 줄 등급의 천장 = 표의 등급.

## 6. 전투 계약 (battle.js ↔ state.js · arena.js)

- `createRun(…, enemyPotion = null, tactics = null)` — **맨 끝 새 인자**
- `tactics = { party: Rule[], enemy: Rule[] } | null`
- `Rule = { card, rule, p1, p2, p3 }`
- 모르는 rule이면 throw한다.
- **`null` · 빈 배열이면 지금과 한 글자도 안 다르다**(rng · 타임라인 · 골든).
- 카드 규칙은 출발 때 굳힌다(옵션 줄 스냅숏과 같다). `refit`(원정 중 갈아입기)은 규칙을 안 바꾼다.
- 결투장 수비 팀의 카드는 `enemy`로 넘긴다. 공격 측 = `party`.
- 전투 이벤트는 카드가 일했을 때 타임라인에 `{e: 'tactic', card, …}`를 남긴다(관전 · 리포트용 · 모양은 battle 쪽이 정하고 INTERFACE §2-6에 적는다).
- 옵션 줄은 지금처럼 `{flat, dr}` 채널로 `computeCombat`에 들어간다(전투 코드 무변경).

## 7. 나눈 일

| 일 | 맡는 쪽 | 파일 | 전제 |
|---|---|---|---|
| A 로직 | 에이전트 L | `tactic_card.csv`(신설) · `tactic_option.csv` · `balance.csv` · `sin_attr.csv` · `building_effect.csv` · `arena_tier.csv` · `trial_floor.csv` · `main_mission.csv` · `src/data/README.md` · `tactic.js`(다시 씀) · `state.js` · `arena.js` · `construction.js` · `src/ui/data.js` · INTERFACE §2-7 · §2-9 · §2-17 · §3 · §4 · §5-2 · §5-3 · `test.js` 전술 블록(로직 단정) | 없음 |
| B 전투 | 에이전트 B | `battle.js` · INTERFACE §2-6 · `battle_design.md`(카드 규칙 절 하나) · `test.js` 새 블록(카드 규칙 단정 · 따로 붙인다) | §6 계약 |
| C 화면 | 에이전트 U | SCREEN_DESIGN §15 먼저 · ADR · SCREEN_CHANGELOG · `app.js` · `i18n.js` · `style.css` · `mobile*.css` · `mobile-pages.js` · `scripts/verify_mobile_native.py` | A 끝난 뒤(`tacticState` 모양) |
| D 문서 · 검수 | 메인 | `tactic_card_design.md` §5 다시 씀 · GAME_DESIGN §9 · §10 · PLAN_tactic_reroll §4 · DEV_PLAN R586 상태 · 골든 · diff 검수 | A · B · C 뒤 |

## 8. 검증

- `src/dev/test.html` 단정 전부 통과(headless Edge — `src/dev/README.md`)
- 골든 무변동. 예외는 D13 도발 고침이다. 몬스터 도발이 있으면 달라질 수 있다 — 그때는 차이를 적고 메인에 알린다.
- 새 단정
  - 드랍 확률 · 등급 분포(시드 고정)
  - 장착 = 가방 −1 · 줄 2 · 천장 이하
  - 인챈트 = 비용 · 걷기 확률(바닥 · 천장 · 가운데)
  - 분해 = 조각
  - v51 → v52 업그레이드(첫 카드)
  - 카드 11장 규칙마다 하나 이상(전투)
  - 결투장 팀 코드 판 3 왕복
- 화면은 Playwright로 hover · 클릭 · 장착 · 굴리기를 실제로 눌러 본다(`memory: playwright-pointer-tests`).

## 9. 끝 (2026-11-26)

A 로직 · B 전투 · C 화면 · D 문서를 다 반영했다 — DEV_PLAN R586 ✅.

| 갈래 | 결과 |
|---|---|
| A 로직 | `tactic_card.csv` 11장 · `tactic.js` 다시 씀 · 세이브 v52(v51 업그레이드 · 첫 카드) · 장착 · 인챈트 · 분해 · 정예 · 스테이지보스 드랍(전리품과 다른 스트림) · 결투장 판 3 · 시련 탑 AI 카드 |
| B 전투 | `battle.js` 카드 규칙 11 · 리더 · 도발 양쪽(D13) · `tactic` 사건 · battle_design §3-3 · INTERFACE §2-6 |
| C 화면 | 편성 탭 카드 판 · 가방 창 · 관전 카드 사건 · 리포트 카드 칸 · ADR-1383 ~ 1387 · Playwright 81/81(`output/2026-11-26_tactic_cards_ui/`) |
| D 문서 | 기획 세부 문서 15개의 옛 전술 줄 · battle_design §3-1 · `src/dev/README.md` |

- 단정 `FAIL 982/987` — 실패 5건(raid 2 · mastery_node 1 · golden 2)은 작업 전부터 있던 것이다
- 카드가 없는 판은 골든 런 필드 60/60 이 작업 전 HEAD 지문과 같다(golden.json 은 작업 전부터 입력 변화로 어긋나 있어 다시 찍지 않았다)

### 9-1. 사용자 확인이 필요한 것

| # | 무엇 | 지금 |
|---|---|---|
| Q1 | PvE 적 리더 순서 | **보스 → 정예 → 일반**(§2 문장은 「정예 → 보스」) — 챕터보스 판의 정예 호위가 리더가 되지 않게 |
| Q2 | 거짓 후퇴의 짝 | 나오는 후열의 체력 비율이 **더 높을 때만** 바꾼다 |
| Q3 | 카드 이름 | 영어 11개 전부 ⚠임시 · 한글 ⚠임시 3(독화살 · 불화살 · 치중대) |
| Q4 | 지휘 천막 r4 · r5 | 칸 효과가 없어져 「준비 중」 — 지을 수 없다 |
| Q5 | 결투장 · 시련 탑 AI 카드 등급 | 일반 · 매직 · 레어까지 — 에픽 · 레전더리를 줄지 |
| Q6 | 메인미션 「카드 장착」 보상 | 골드 600 → 500(인챈트 한 번 값) ⚠제안 |
| Q7 | 건설 탭 지휘 천막 문구 | 「파티 전술 레벨 n 해금」 그대로 — 「공격 칸 해금」 식으로 바꿀지 |
| Q8 | 기획 문서의 옛 전제 | item_design §4 「죄종 세트효과 → 전술카드 이관」 절(칸 조건 · 칸 경쟁 전제) · skill_design 「부여는 전술카드 전담」 · item_design 저항 상한 돌파 출처의 「파티 전술」 · 의뢰 후보 「카드 인챈트」 |

### 9-2. 참고

- 탐험은 카드를 안 쓴다(싸우지 않는다)
- 모바일 배치는 꺼져 있어(`mobile.js:MOBILE_LOCKED`) 모바일 CSS · `verify_mobile_native.py` 는 고쳐만 두고 돌리지 않았다
- 원정 실전 관전에서 카드 사건은 못 봤다(드랍 확률이 낮다) — 실험실 결투로 11종을 다 봤다

---
*마지막 업데이트: 2026-11-26*
