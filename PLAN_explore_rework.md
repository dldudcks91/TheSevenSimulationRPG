# 탐험 개편 — 표를 넣어 여는 끝이 있는 전투 판 · 구현 계획 (R590)

> **상태 11-26: 구현 끝(A 로직 · D 기획서 · U 화면 — DEV_PLAN R590 ✅).** 남은 사용자 확인은 §10.

> 사용자 11-26 「일단 모두 구현해놔봐」 → 질문 창 두 번으로 D1 ~ D18 을 정했다(아래 §0). **결정은 바꾸지 않는다.**
> 기획 근거: [base_expedition_design.md §3-1](docs/game_design/base_expedition_design.md) (10-21 · 10-22) + 11-24 논의(세션 기록 — 아래 §0-2) + 11-26 결정.
> 수치는 전부 CSV ⚠제안이다. 이 문서의 숫자는 CSV 에 넣을 첫 값일 뿐이고 기획서에는 키 참조만 쓴다.
> 대체하는 행: DEV_PLAN R312(☐ → R590).

## 0. 결정

### 0-1. 11-26 질문 창 (사용자 답)

| # | 결정 | 사용자 답 |
|---|---|---|
| D1 | **보상 = 원정만큼 + 지점 전용.** 판 동안 처치 경험치 · 골드 · 드롭(장비 · 책 · 작전 카드)을 원정과 같은 규칙으로 **모아 두었다가 판을 끝까지 깨면 한꺼번에** 준다. 지면 모은 것 · 표를 다 잃는다. 지점 전용 — 동굴 ??? · 상단 의뢰 가입 희망 · 폐허 드문 만남 · 물건. 10-09 「경험치는 원정만」을 바꾼다 | (가) 원정만큼+전용 |
| D2 | 적 영웅 한 명을 쓰러뜨리면 **그 장 정예 한 마리 몫**(그 적 레벨의 정예 처치와 같은 경험치 · 골드 · 드롭 굴림)을 모은다. 적이 입은 장비 자체는 안 준다 | (D1 에 포함) |
| D3 | **표가 나오는 곳** — 원정에서 정예를 쓰러뜨릴 때 `[balance.csv:explore_ticket_drop_elite]`, 스테이지보스를 쓰러뜨릴 때 `[balance.csv:explore_ticket_drop_boss]` 확률 + **지점이 열릴 때 그 지점 일반 표 `[balance.csv:explore_first_ticket_n]` 장**. 탐험 판에서는 절대 안 나온다(10-22) | 「드롭을 흔하게」 — 정예 4% · 보스 20% |
| D4 | 드롭된 표의 지점 = **열린 지점 중 무작위** · 장 · 난이도 = 주운 원정 칸의 장 · 난이도. 열린 지점이 없으면 안 나온다 | 추천대로 |
| D5 | 표 등급 비율 = `explore_grade.csv:weight` (일반 70 · 매직 25 · 레어 5) | 추천대로 |
| D6 | 표는 **계정 재고**로 쌓인다 — 장비 가방 칸을 안 먹는다(작전 카드 가방과 같은 형태 · 칸 상한 없음) | 추천대로 |
| D7 | 등급이 올리는 것 = `explore_grade.csv` — 길이(동굴 끝 정예 라운드 + · 상단 습격 수 · 폐허 이벤트 수) · 보상 배수 · 특별 확률 배수(??? · 드문 만남 · 가입 희망) | 추천대로(아래 §2 표) |
| D8 | 동굴 ??? — 칸 III 스테이지보스 자리에 `[balance.csv:explore_cave_unknown_pct]` × 특별 배수 확률로 그 장 도감 VI 몬스터가 선다(지금 데이터는 1장 둘라한뿐 — 2 ~ 5장은 안 나온다). 이기면 도감에 오른다. **영웅을 얻는 길은 없다**(사용자가 따로 정한다 — 10-21) | 추천대로 |
| D9 | 상단 의뢰 — 지도 위 마차가 길을 가다 **갑자기 습격**(11-24 목업 그대로 · 습격 자리는 시드로 정하고 화면에 숨긴다). 적 = 결투장식 무작위 영웅 셋 · 레벨 = 그 장 무작위 장소 칸 III 몬스터 레벨 · 마지막 습격은 `[balance.csv:explore_caravan_last_lv_plus]` 더 높다 | 추천대로 |
| D10 | 가입 희망 — 완수하면 `[balance.csv:explore_caravan_join_pct]` × 특별 배수 확률로 마지막 습격의 적 한 명이 선술집 가입 희망 칸에 온다. 굴림은 선술집 고용과 같고 **직업 · 얼굴만** 그 적을 따른다 · 장비는 안 가져온다 · 칸이 차 있으면 안 온다 | 추천대로 |
| D11 | 감사인사 — 완수하면 그 장 단계 철광석 · 목재 `[balance.csv:explore_caravan_thanks_mat]` 개씩(골드 · 새 자원 아님) | 추천대로 |
| D12 | 폐허 이벤트 = `explore_ruins_event.csv` — 몬스터(그 장 몬스터 무리) · 함정(같은 전투 + 우리 편에 그 장 헬 디버프) · 물건(장비 한 점 · 희귀도 `[balance.csv:explore_ruins_item_rarity_shift]` 단계 위로 기움 · `[balance.csv:explore_ruins_item_book_pct]` 확률로 스킬북) · 드문 만남(그 장 스테이지보스 + 일반 호위 둘 · 가중 × 특별 배수) · 빈 방. **유니크 영웅 만남 · 이긴 존재 키우기는 없다**(사용자 몫) | 추천대로 |
| D13 | 폐허 지도 = `output/2026-11-24_ruins_map/ruins_1.png`(방이 크고 길이 잘 읽힘) | 추천대로 · 지도 1번 |
| D14 | 편성 하나 = 원정이든 탐험이든 **한 판** — 둘을 합쳐 편성 수만큼(최대 3) 동시에 돈다. `explore_slots` 는 걷는다 | 추천대로 |
| D15 | 관전 — 탐험 부대도 위쪽 부대 칸에 선다. 동굴 = 원정 관전 화면 그대로 · 상단 의뢰 · 폐허 = 지도 화면, 싸울 때만 전투 화면 | 추천대로 |
| D16 | 일찍 부르면 **표를 돌려받지 않는다**(지는 것과 같게) · 모은 것도 없다 | 추천대로 |
| D17 | 다시 켰을 때 — 하던 판을 **화면 없이 끝까지 계산해 결과만** 준다(하던 전투 칸 · 습격 · 이벤트는 처음부터 다시 계산) · 이어 돌기는 이어지지 않는다(10-22) | 추천대로 |
| D18 | 옛 세이브 — 진행 중이던 옛 시간제 탐험은 걷고 그 지점 · 그 장 일반 표 한 장을 돌려준다 | 추천대로 |

**같이 바뀌는 것 — 사용자 OK(넷 다):** ① 세이브 판 53 → 54 ② CSV 신설 · 삭제(새 표 둘 · balance 키 · 옛 키 넷 · `explore_story.csv` 삭제) ③ 코드 경계(`arena.rollKit` export) · 단정(「도감 VI 는 스테이지에 안 나온다」에 ??? 예외) · 메인미션 탐험 줄 = 그 지점 판 완수 ④ 기획서 반영(11-24 합의 + 이번 결정).

### 0-2. 11-24 합의 (세션 기록 · 기획서에 없던 것 — 이번에 옮긴다)

- 동굴 = **원정 장소 하나의 칸 I · II · III 을 원정 규칙 · 원정 화면 그대로**(사용자 「자 동굴은 말그대로 원정처럼 놓고」)
- 상단 의뢰 화면 = **지도 위를 마차 아이콘이 가고**(사용자 「(나) 마차아이콘으로일단 만들어볼래」) **습격은 갑자기 덮친다**(「ㅇㅇ갑자기 덮치는거로 해보자 일단」) — 목업 `output/2026-11-24_caravan_mock/index.html`
- 폐허 화면 = **폐허 안 지도 + 안개 · 이벤트 3 ~ 4개**(「ㅇㅇ폐허 내부 지도 그림그리고 안에서 이벤트를 3~4개정도 만들자 물건을 찾거나 함정을 만나거나 몬스터를 마주치거나」)
- 판 길이 제안(답 없었고 11-26 D7 표로 섰다) — 일반 표 동굴 약 13분(라운드 목표 시간 합) · 상단 약 10분 · 폐허 약 15분

### 0-3. 그대로인 확정 (10-21 · 10-22 · 11-15)

표 한 장 + 편성 하나 · 표가 없으면 못 감 · 판 중 선택 없음(장비 · 스킬 트리는 판 중에도 바꾼다) · 끝까지 완수해야 받음 · 지면 표를 잃음 · 능력치로 판정하지 않음 · 꺼진 동안 새 판을 열지 않음 · 판이 끝나면 오른쪽 아래 알림(ADR-0692) · 이어 돌기 = 같은 종류(지점 · 장 · 난이도 · 등급) 표만 · 지면 멈출지 보낼 때 고름 · 다시 켜면 이어 돌기가 안 이어짐 · 탐험 중인 편성을 원정에 보내면 확인 창 한 번 뒤 그 탐험을 걷고 나간다(11-15) · 지점 문 = 탐험 r1 동굴 · r2 상단 의뢰 · r3 폐허(11-24).

## 1. 지금 → 바뀐 뒤

| | 지금(코드) | 바뀐 뒤 |
|---|---|---|
| 들어가기 | 지점 + 편성 · 표 없음 | 표 한 장 + 편성 하나 |
| 진행 | `explore_hours` 시간이 지나면 결과 굴림 · 꺼져도 흐름 | 화면에서 싸우는 판 · 꺼지면 시작한 판만 결과로 계산 |
| 지점 | 동굴만 산출 · 상단 · 폐허 「준비 중」 | 셋 다 돈다 |
| 보상 | 동굴 = 영웅 수 × 장비 · 책 칸 | 원정과 같은 처치 보상을 판 끝에 한꺼번에 + 지점 전용 |
| 동시 | 탐험 1 · 원정 3 따로 | 편성마다 한 판(합쳐 최대 3) |
| 이야기 줄 | `explore_story.csv` 동굴 28행 | 걷는다(동굴 = 원정 화면 · 상단 · 폐허 = 지도가 진행을 보여 준다) |

## 2. 데이터

### 2-1. `src/data/explore_grade.csv` (신설 · 첫 열 id · `src/data/README.md` 규약)

| grade_id | weight | cave_extra_elite_rounds | caravan_raids | ruins_events | reward_mult | special_mult |
|---|---|---|---|---|---|---|
| normal | 70 | 0 | 3 | 3 | 1 | 1 |
| magic | 25 | 3 | 4 | 4 | 1.5 | 2 |
| rare | 5 | 6 | 5 | 5 | 2 | 3 |

- `reward_mult` — 모은 경험치 · 골드에 곱한다 · 장비 · 책 드롭 확률에도 곱한다(1 상한).
- `special_mult` — ??? 확률 · 드문 만남 가중 · 가입 희망 확률에 곱한다(확률은 1 상한).
- 등급 이름(일반 · 매직 · 레어)은 i18n — 아이템 희귀도 문구 재사용 가능.

### 2-2. `src/data/explore_ruins_event.csv` (신설)

| event_id | weight |
|---|---|
| monster | 40 |
| trap | 15 |
| item | 20 |
| rare_encounter | 10 |
| empty | 15 |

### 2-3. `balance.csv` 새 키 (전부 ⚠제안)

| 키 | 첫 값 | 뜻 |
|---|---|---|
| `explore_ticket_drop_elite` | 0.04 | 원정 정예 처치 한 번의 표 확률 |
| `explore_ticket_drop_boss` | 0.2 | 원정 스테이지보스 처치 한 번의 표 확률 |
| `explore_first_ticket_n` | 1 | 지점이 열릴 때 주는 그 지점 일반 표 수 |
| `explore_cave_unknown_pct` | 0.05 | 동굴 칸 III 보스 자리에 ??? 가 설 확률(× special_mult) |
| `explore_caravan_leg_sec` | 75 | 상단 의뢰 습격 사이 한 구간의 이동 시간(초) — 습격 N 이면 구간 N+1 |
| `explore_caravan_last_lv_plus` | 2 | 마지막 습격 적 레벨 + |
| `explore_caravan_join_pct` | 0.3 | 완수 때 가입 희망 확률(× special_mult) |
| `explore_caravan_thanks_mat` | 10 | 완수 때 철광석 · 목재 각 개수(그 장 단계) |
| `explore_ruins_leg_sec` | 180 | 폐허 이벤트 사이 한 구간의 이동 시간(초) — 이벤트 N 이면 구간 N+1 |
| `explore_ruins_item_book_pct` | 0.25 | 폐허 물건이 장비 대신 스킬북일 확률 |
| `explore_ruins_item_rarity_shift` | 1 | 폐허 물건 장비의 희귀도 가중을 몇 단계 위로 미나 |

**삭제:** `explore_hours` · `explore_slots` · `explore_cave_items_per_hero` · `explore_cave_book_pct` · 파일 `src/data/explore_story.csv`. `building_effect.csv` 의 `explore_slots` 더하기가 있으면 같이 걷는다. `explore_spot.csv`(지점 이름 · 두 줄 이야기)는 남긴다.

### 2-4. 그림

- 폐허 지도: `output/2026-11-24_ruins_map/ruins_1.png` → `src/assets/art/backgrounds/explore_ruins.webp`(WebP · 화면 쓰는 폭에 맞춰 줄임). `src/assets/art/README.md` 에 한 줄.
- 마차 아이콘: `src/assets/art/icons/explore/caravan.webp` 재사용(목업과 같은 그림인지 확인).
- 폐허 이벤트 표지(몬스터 · 함정 · 물건 · 드문 만남 · 빈 방) — 있는 아이콘 재사용이 먼저, 없으면 CSS 도형. **새 그림 발주는 하지 않는다.**

## 3. 규칙 · 계약 (로직)

> 이름은 제안이다 — 실행자가 INTERFACE.md 에 먼저 적고 그 이름으로 간다. **rng 는 전부 주입 · 새 솔트(기존 원정 · 작전 카드 스트림과 분리) → 골든 불변**이 목표다.

### 3-1. 표

- 재고: `state.exploreTickets = { "<spot>|<chapter>|<diff>|<grade>": n }` (n > 0 만 남긴다). spot = `cave` · `caravan` · `ruins`.
- 원정 드롭: `settleRound` 에서 작전 카드 드롭(`rollTacticDrops`) 바로 뒤, **원정 런만**. 정예 · 스테이지보스 처치 한 번마다 카운터를 먼저 올리고 제 스트림으로 굴린다 → 성공이면 열린 지점 중 무작위 · 등급 가중 · 장 · 난이도 = 그 칸. 열린 지점이 없으면 굴려도 안 준다(카운터는 오른다 — 결정성). 원정 리포트에 표 필드.
- 첫 표: 탐험 건물 랭크가 지점을 여는 순간 그 지점 일반 표 `explore_first_ticket_n` 장 · 장 = 노말에서 깬 가장 높은 장(최소 1) · 난이도 노말.

### 3-2. 판(run)

- 같은 부대 칸 `state.runs[no-1]` 을 쓴다(편성 = 부대). 탐험 판은 종류 필드(예: `kind:'explore'`)와 탐험 묶음(지점 · 장 · 난이도 · 등급 · 표 키 · 이어 돌기 · 지면 멈춤 · 판 번호 · 시드 · 계획 · 지금 단계 · 모은 것 · 시작 시각)을 싣는다. 옛 `state.explores` 는 없앤다.
- 동시: 편성 하나에 판 하나 · 원정 + 탐험 합이 `limitsOf.expeditions` 를 함께 쓴다.
- 보내기 조건: 그 표가 1장 이상 · 편성이 비어 있지 않고 나가 있지 않음 · 기존 `squadErr`(전직 중 등) 그대로 · 지점이 열림. 보내는 순간 표 한 장을 소모한다.
- 판 = **단계 목록**(시작 때 시드로 전부 정한다):
  - 동굴: `[칸 I, 칸 II, 칸 III]` — 그 장 장소 1 ~ 4 중 무작위 하나 · 원정 규칙(라운드 세트 · 라운드 경계 장비 갈아입기 · 물약 칸 다시 채우기) 그대로 · 칸 III 라운드 뒤에 그 칸의 정예 라운드 `cave_extra_elite_rounds` 개를 덧붙인다 · ??? 굴림 성공이면 칸 III 스테이지보스 라운드의 보스를 그 장 도감 VI 몬스터로 바꾼다(호위는 그대로).
  - 상단 의뢰: `[이동, 습격, 이동, 습격, …, 이동]` — 습격 = 적 영웅 셋과 한 판(결투장 전투 규칙 · 그 판 시드). 적 = `arena.rollKit` 로 만든 팀 · 레벨 = 그 장 무작위 장소 칸 III 몬스터 레벨(그 난이도) · 마지막 습격 + `explore_caravan_last_lv_plus` · 장비 희귀도 = 그 난이도 드롭 가중 · 강화 0 · **적은 작전 카드가 없다**(§10 「의뢰 — 적 영웅 파티」 ③ 미정). 습격 자리(이동 구간 안 위치)는 시드로 정하고 화면에만 숨긴다.
  - 폐허: `[이동, 이벤트, 이동, 이벤트, …, 이동]` — 이벤트 종류는 `explore_ruins_event.csv` 가중(드문 만남 × special_mult · 다시 정규화). 몬스터 = 그 장 무작위 장소 칸 II 의 일반 라운드 하나 · 함정 = 같은 전투 + 우리 편에 그 장의 헬 장 디버프(난이도와 무관하게) · 물건 = 전투 없음 · 장비 한 점(그 장 레벨대 · 희귀도 가중 위로 이동) 또는 스킬북(상단 책 후보와 같은 풀) · 드문 만남 = 그 장 무작위 장소의 스테이지보스 + 일반 둘(`round_budget.csv:stage_boss` 와 같은 구성) · 빈 방 = 아무것도 없음.
- **모은 것(bank)**: 탐험 판의 처치 보상은 바로 주지 않고 판에 쌓는다 — 골드 · 영웅별 경험치(처치 순간 살아 있는 영웅 · 원정과 같은 감쇠 규칙) · 장비 · 책 · 작전 카드. 상단 의뢰의 적 영웅 처치 = 그 적 레벨 정예 처치 한 번 몫(경험치 · 골드 · 드롭 굴림). 폐허 물건도 모은 것에 든다. 판 중 레벨업은 없다.
- **끝**:
  - 이김(마지막 단계를 통과) → 모은 것 × `reward_mult` 를 한꺼번에 지급(장비는 그 편성 가방 → 넘치면 기존 넘침 규칙) · 지점 전용(동굴 ??? 는 처치로 이미 도감 · 상단 감사인사 · 가입 희망 굴림) · 지점 완수 카운터 +1 · 알림 · 이어 돌기면 같은 키 표가 남아 있을 때 바로 다음 판.
  - 짐(그 단계 전투에서 우리 편 전멸) → 모은 것 버림 · 표는 이미 소모 · 이어 돌기 + 지면 멈춤이 아니고 표가 남으면 다음 판, 아니면 멈춤.
  - 부름(일찍 부르기 · 탐험 중인 편성을 원정에 보냄) → 모은 것 없음 · 표 반환 없음 · 이어 돌기 멈춤.
- 부수효과: 탐험 전투는 **스테이지 클리어 기록 · 원정 판 장부(`stageDecks`) · 반복 칸을 건드리지 않는다** · 도감 처치 · 의뢰 처치 집계는 센다 · 탐험 판에서는 표가 안 나온다.
- 화면 상태 함수: 지점별 표 목록 · 지점별 나가 있는 판 · 판마다 지금 단계 종류(이동 · 전투 · 이벤트) · 이동 진행률 · 지난 습격 / 이벤트 목록(공개된 것만) · 남은 시간 추정 · 모은 것 요약 · 거절 이유(err 코드).

### 3-3. 시간 · 꺼진 동안

- 켜져 있을 때 원정과 같은 시계로 돈다(안 보는 부대도 틱 · 숨긴 탭도 실제 시각으로 민다).
- **다시 켰을 때 · 절전 공백(`closeFrozenRun` 경로)**: 원정 런을 끊는 `closeRun` **직전**에 탐험 판을 화면 없이 끝까지 계산한다(하던 전투 단계는 처음부터 · 이동은 남은 시간 무시) → 끝 처리(이김 / 짐) → 이어 돌기는 걷는다.
- 결과는 저장 시점에 다시 만들 수 있어야 한다(시드 + 판 번호 + 단계 번호) — 메모리 핸들은 세이브에 안 든다.

### 3-4. 가입 희망 · 감사인사

- 가입 희망: 마지막 습격 적 셋 중 하나(시드) → 선술집 고용과 같은 굴림으로 영웅을 만들고 직업 · 초상만 그 적을 따른다 → `joinAdd(state, hero, now, 'caravan')`(칸이 차 있으면 안 넣는다 · 결과에 「자리 없음」 표시용 플래그).
- 감사인사: 그 장 단계 철광석 · 목재 각 `explore_caravan_thanks_mat` — 「그 장 단계」는 그 장 아이템 레벨대가 분해로 내는 재료 단계(`equip_upgrade_mat_ilvl_band` 와 같은 구간 규칙)로 읽는다. 다른 매핑이 이미 있으면 그것을 쓰고 INTERFACE 에 적는다.

### 3-5. 메인미션 · 할 일 · 알림

- 메인미션 탐험 줄 조건 = 그 지점 판 **완수** 횟수(지금은 `explores` 에 들어 있기만 하면 참). 노말 45/46 멈춤(42번 폐허 줄)이 풀려야 한다.
- 할 일 점(`navTodo`) · 출정 창 경고 · 명단 · 해고 잠금 · 작전 카드 잠금(`tacticLock` — 전술카드 세션이 같은 곳을 고치고 있다) 이 옛 `explores` 를 보던 곳은 새 판으로 읽는다.

### 3-6. 세이브 v54

- `SAVE_VERSION` 53 → 54(**쓰기 직전에 다시 확인** — 다른 세션이 올렸으면 그 다음 번호) · `upgradeV53` 신설.
- 이관: 옛 `explores` 의 항목마다 그 지점 · 그 장 노말 일반 표 +1 → `explores` 삭제 · 이미 연 지점마다 첫 표 `explore_first_ticket_n` 장 · 새 카운터 0.
- 결정성: 새 카운터 · 솔트는 INTERFACE §5(rng 계약)에 적는다.

## 4. 화면

> SCREEN_DESIGN 먼저 → 렌더러. 렌더러에 한국어 리터럴 금지 · ko/en 나란히(zh 는 빠진 목록으로). 툴팁은 짧게 — 규칙 설명은 도움말 탭.

- **탐험 탭**(SCREEN_DESIGN §8-4 다시 씀): 세계지도 + 지점 아이콘(그대로) → 지점을 누르면 지점 창 — 그 지점 표 목록(장 · 난이도 · 등급 · ×n) · 편성 고르기 · [이어 돌기] · [지면 멈춤] · [보내기] · 그 지점에 나가 있는 판(편성 · 단계 · 남은 시간 · [부르기]). 표가 0 이면 보내기 자리에 「표 없음」.
- **위쪽 부대 칸**: 탐험 부대는 지점 이름(아이콘)으로 선다 · 누르면 관전.
- **관전**:
  - 동굴 = 원정 관전 화면 그대로(라벨만 지점 · 칸).
  - 상단 의뢰 = 그 장 구간을 확대한 세계지도 위를 마차 아이콘이 길을 따라 간다 · 지나온 길 금색 · 남은 길 점선 · 습격 자리는 안 보인다 → 덮칠 때 화면 가장자리 붉은 번쩍임 + 마차 흔들림 + 「습격!」 → 상하 대치 전투 화면 → 이기면 지도로 돌아와 그 자리에 체크 흔적. 오른쪽 위 정보 카드 = 지점 · 편성 초상 · 습격 수(이긴 것 / 전체) · 남은 시간. 목업 `output/2026-11-24_caravan_mock/index.html` 을 바탕으로.
  - 폐허 = 폐허 지도(`explore_ruins.webp`)가 안개에 덮여 있고 표지가 길을 따라 움직이며 지나간 자리만 걷힌다 → 이벤트 자리에서 표지가 드러난다(종류별 표지) · 전투 이벤트면 전투 화면으로 → 끝나면 지도로. 정보 카드 = 이벤트 수 · 남은 시간 · 모은 것 요약.
- **끝**: 오른쪽 아래 알림(ADR-0692) · 결과 카드(받은 것 · 가입 희망 초상 · 감사인사 · 짐 / 부름이면 「잃음」).
- **걷는 것**: 옛 대기 / 나감 / 완료 패널 · 이야기 줄(`exploreLog`) · 지점 「준비 중」 회색.
- **도움말 탭**(SCREEN_DESIGN §12): 탐험 문단을 새 규칙으로(표 · 끝이 있는 판 · 다 깨야 받음 · 지면 잃음 · 꺼진 동안).
- **개발 URL**: 표 넣기 · 지점 열기 · 판 중간 상태를 바로 여는 손잡이(기존 `?dev=` 문법 · `src/dev/README.md` 에 적는다).
- 결정마다 ADR 한 장(`docs/client/adr/` — 번호는 쓰기 직전 `ls` 로 확인 · 다른 세션이 1389 ~ 1392 를 썼다) · SCREEN_CHANGELOG 한 줄씩.

## 5. 문서 (기획서)

- `docs/game_design/base_expedition_design.md` §3-1 을 새 규칙으로 다시 쓴다(§0 전부 · 표 · 판 · 지점 셋의 판 · 화면 · 보상 · 끝) · 「남은 것」의 「탐험 상세」 · 「상단 의뢰(마차)의 세부」 · 「파견 리포트 형식」에서 닫힌 칸을 지우고 남은 칸만 · §4 방치형 계약 문장 확인.
- `GAME_DESIGN.md` §9 맨 위에 11-26 한 줄(`〔옛: …〕` 포함 — 10-09 「경험치는 원정만」 · 10-21 「폐허는 방향만」 등) · §10 색인의 「탐험 상세」 · 「상단 의뢰(마차)의 세부」 · 「XP 출처」 줄 갱신. §9 가 30행을 넘으면 가장 오래된 날짜째 DECISION_LOG §1 끝으로.
- 탐험을 말하는 다른 세부 문서의 교차 참조(`skill_design` 스킬북 출처 — 옛 동굴 책 칸 · `main_mission_design` 탐험 줄 · `item_design` 재료 출처 · `hero_design` 경험치 출처 · `construction_draft` 탐험 랭크)를 훑어 낡은 줄만 고친다.
- **기획서에 숫자 금지** — 키 참조만. 형식은 `.claude/skills/game-design/doc_conventions.md`.

## 6. 나눈 일 (파일이 겹치지 않게)

| 단계 | 실행자 | 파일 | 먼저 |
|---|---|---|---|
| A 로직 | 에이전트 A | `src/game_logic/*` · `src/data/*`(CSV · README) · `src/dev/test.js` · `src/dev/README.md` · `docs/client/INTERFACE.md` | INTERFACE |
| D 기획서 | 에이전트 D (A 와 동시) | `docs/game_design/*` | — |
| U 화면 | 에이전트 U (A 가 끝난 뒤) | `src/ui/*` · `src/assets/art/*` · `docs/client/SCREEN_DESIGN.md` · `docs/client/adr/*` · `docs/client/SCREEN_CHANGELOG.md` | SCREEN_DESIGN |
| 마무리 | 메인 | `docs/client/DEV_PLAN.md`(R590 · R312) · 검수 · 보고 | — |

## 7. 공통 규칙 (실행자 필독)

- **병렬 세션**: 전술카드 세션 · 오프닝 세션이 같은 저장소의 `state.js` · `app.js` · `test.js` · `i18n.js` · `style.css` · `balance.csv` · `INTERFACE.md` · `SCREEN_DESIGN.md` 를 지금 고치고 있다. 고치기 전에 `ls -la --time-style=long-iso` 로 mtime 을 보고 바뀌었으면 다시 읽는다 · **정확한 old 문자열 Edit 으로만 고친다(파일 통째로 덮어쓰기 금지)** · 내 범위 밖 줄은 건드리지 않는다.
- `CLAUDE.md` 아키텍처 원칙: `game_logic/` 은 DOM 을 모른다 · `Math.random()` 금지(시드 주입) · 세이브 직렬화는 `game_logic/` · 수치는 CSV · 다국어 ko/en · 렌더러에 한국어 리터럴 금지.
- 절차: 로직은 `.claude/skills/client/SKILL.md`, 화면은 `.claude/skills/ui/SKILL.md`, 기획서는 `.claude/skills/game-design/SKILL.md` 를 먼저 읽고 따른다. 경계(export · 스키마 · rng 순서)를 바꾸면 INTERFACE.md 먼저, 화면을 바꾸면 SCREEN_DESIGN.md 먼저.
- **커밋 · 푸시 금지.** 서버 8777 은 끄지 않는다 · 이름으로 프로세스를 죽이지 않는다. 검증 서버는 `serve.py <세션 포트>` 를 `Start-Process` 로 띄운다(이미 물린 포트는 쓰지 않는다 — `netstat` 로 먼저 확인).
- 검증: `src/dev/README.md` 의 test.html(PowerShell headless Edge `--dump-dom` · 매번 새 `--user-data-dir` · git-bash 에선 msedge 가 즉시 반환된다) · 골든은 변하면 안 된다(작업 전부터 실패하던 단정 = raid 2 · mastery_node 1 · 골든 2 — R589 기준 FAIL 985/990 · 이것과 같은 목록인지 대조) · 화면은 Playwright(anaconda python + `channel="msedge"` · `is_mobile=False` · 한국어 리터럴을 셀렉터에 쓰지 않는다) · 산출물은 `output/2026-11-26_explore_rework/`.
- `Out-File` utf8 은 BOM 을 붙인다 · CSV 셀의 `\n` 은 도구 호출에서 실제 개행으로 바뀔 수 있다 — CSV 는 파이썬으로 쓰고 왕복 검사.
- 결정(§0)과 부딪히는 것을 찾으면 **고치지 말고** 보고에 적는다. 계약 이름 · 세부 구현 선택은 실행자가 정하고 INTERFACE / SCREEN_DESIGN 에 적는다.

## 8. 검증 목록

- [ ] 원정 정예 · 보스 처치에서 표가 확률대로 나온다 · 열린 지점만 · 장 · 난이도 = 칸 · 탐험 판에서는 0
- [ ] 지점이 열리면 첫 표 · 이관 세이브에 첫 표 + 옛 탐험 환급
- [ ] 동굴: 장소 1 ~ 4 · 칸 셋 · 등급별 끝 정예 라운드 수 · ??? (1장만) · 원정 클리어 기록 · 판 장부 불변
- [ ] 상단: 습격 수 = 등급 · 마지막 레벨 + · 적 처치 = 정예 몫 · 완수 감사인사 · 가입 희망 확률 · 칸이 차면 안 옴
- [ ] 폐허: 이벤트 수 = 등급 · 종류 가중 · 함정 디버프 · 물건 · 드문 만남
- [ ] 이김 = 한꺼번에 지급 × reward_mult · 짐 / 부름 = 0 · 표 반환 없음 · 이어 돌기 · 지면 멈춤
- [ ] 다시 켜기 · 절전 공백 → 결과만 계산 · 이어 돌기 걷힘
- [ ] 편성 하나 한 판 · 원정 + 탐험 합 ≤ 편성 수 · 탐험 중 편성을 원정에 → 확인 뒤 걷힘
- [ ] 메인미션 탐험 줄 = 완수 · 노말 45/46 멈춤 풀림
- [ ] 골든 불변 · 작업 전 실패 목록 그대로
- [ ] 화면: 탐험 탭 · 지점 창 · 부대 칸 · 동굴 관전 · 마차 지도 · 폐허 안개 · 결과 알림 · ko/en · 1600 / 1366 폭 · 페이지 오류 0

## 9. A 가 만든 계약 (화면 실행자 U 는 이것만 보고 렌더러를 고친다)

> 본문 계약은 [INTERFACE.md §2-7 「탐험 판」](docs/client/INTERFACE.md) · §3 · §4(v54) · §5. 여기는 U 가 부를 것만 추린다. 전부 `SYS.game.*` · rng 는 로직 안에서만 돈다.

### 9-0. §3-2 제안과 다르게 고른 것 (결정 D1 ~ D18 과는 안 부딪힌다)

- **판은 `state.runs[no − 1]` 이 아니라 나란한 새 칸 `state.exploreRuns[no − 1]`** 에 산다(색인 = 편성 번호 − 1 · 길이 = 편성 수). 원정 엔진(`runAt` · `runningNos` · `closeRun` · `nextRepeat` · 판 장부)을 건드리지 않으려고 갈랐다. 「편성 하나 = 한 판 · 원정 + 탐험 합 ≤ `limitsOf.expeditions`」(D14)는 `presetErr` · `squadErr` 의 `full` 이 두 칸을 합쳐 센다.
- **조립층 `src/ui/data.js` 를 최소로 고쳤다** — `FILES`(`explore_story` → `explore_grade` · 끝에 `explore_ruins_event`) · 파싱 두 줄(`D.exploreGrades` · `D.exploreRuinsEvents`) · `createGameSystem` 에 `exploreGrades` · `exploreRuinsEvents` · `arena: () => arena`(결투장이 게임 시스템 뒤에 서서 늦게 읽는다). 이것 없이는 새 표를 못 읽고 `explore_story.csv` 를 지우면 앱이 안 뜬다. 렌더러는 안 건드렸다.

### 9-1. 함수 (전부 in-place · 상태 함수만 상태 불변)

| 함수 | 반환 | 화면이 쓰는 곳 |
|---|---|---|
| `exploreState(G, now)` | `{open, built:{cave,ruins,caravan}, grades:[{id, weight, eliteRounds, raids, events, reward, special}], tickets:[{key, spot, chapter, diff, grade, n}], runs:[RunView], results:[Result\|null](편성 순), squads:[{no, party, err}], used, max, partyMax, done:{cave,ruins,caravan}, spots}` | 탐험 탭 · 지점 창 · 부대 칸 · 정보 카드. `spots` 는 옛 모양(`out` 늘 null) — 지도 아이콘 세울 때만 · 화면 개편 뒤 걷어도 된다 |
| `exploreErr(G, key, no)` | `code \| null` | 보내기 버튼 · 거절 플래시(`ex.err.<code>`) |
| `exploreSend(G, key, no, now, {repeat, stopOnLoss})` | `{ok, no, runNo}` / `{ok:false, err}` | [보내기] — [이어 돌기] · [지면 멈춤] 은 보낼 때 고른다 |
| `exploreAdvance(G, no, now)` | `{ok, phase:'none'\|'move'\|'fight', step, at, endsAt?, ready?, ended:[Result]}` | **앱 시계 눈금마다 · 탐험 판이 있는 편성마다**(숨긴 탭 포함 · 실제 시각) |
| `exploreFight(G, no, at)` | `{ok, run}` / `{ok:false, err:'none'\|'notFight'\|'noParty'}` | `phase === 'fight' && ready` 이고 그 편성의 전투 핸들이 없을 때 — `at` = `exploreAdvance` 의 `at`(그 전투가 시작한 시각 · 박자의 wall 시작) |
| `stepRun(G, run, tNow)` | `{ok, rounds, done}` | 원정 `advanceBattle` 그대로 — 탐험 핸들도 받는다 |
| `exploreFightEnd(G, run, endedAt)` | `{ok, won, ended: Result\|null}` / `{ok:false, err:'missing'\|'notDone'\|'done'}` | 박자가 끝난 순간(`noteEnded` 자리 · 원정의 `noteRunEnd` 대신). 그 뒤 다시 `exploreAdvance` |
| `exploreRecall(G, no, now)` · `retreatRun(G, 탐험 핸들, now)` | `{ok, result}` · `{ok, report, result}` | [부르기] · 관전의 철수 — 모은 것 · 표 없이(D16) |
| `exploreFinish(G, now)` | `[Result]` | **`continueGame` 의 `SYS.game.closeRun(G, at)` 바로 앞 · `closeFrozenRun` 의 `SYS.game.closeRun(G, at)` 바로 앞** — 그 뒤 탐험 전투 핸들을 `state.battles` 에서 걷는다(하던 전투는 처음부터 다시 계산됐다 · 이어 돌기 없음 · D17) · 결과가 있으면 오른쪽 아래 알림 |
| `exploreSeen(G, no)` | `{ok}` | 결과 카드를 열었을 때 — 할 일 점 · 종 알림이 꺼진다 |
| `departRun(G, stageId, now, no)` | (원정) | 그 편성이 탐험 중이면 그 판을 `recalled` 로 걷고 나간다 — **확인 창은 화면**(11-15) · `canDepart` 는 그 편성 자신의 판이면 막지 않는다 |

**err 코드** — `exploreErr` 순서: `unbuilt`(탐험 r1 전) → `missing`(모르는 표 키) → `unbuilt`(그 지점 랭크 전) → `noTicket` → `missing`(없는 편성) → `noParty` → `running`(원정 · 칸 사이 · 다른 부대 영웅) → `exploring` → `advancing` → `full`(원정 + 탐험 상한). 옛 `locked` · `pending` · `busy` · `slots` · `bagFull`(끝난 탐험) · `notDone`(옛 수령)은 없다 — i18n `ex.err.*` 에서 `noTicket` · `full` 을 더하고 옛 것을 걷는다.

### 9-2. 화면 값

- **`RunView`** = `{no(편성), runNo, key, spot, chapter, diff, grade, repeat, stopOnLoss, party, startedAt, step, steps, phase, stepAt, stepEndsAt, fight:{kind, stageId, level, unknown}|null, route:{totalMs, doneMs, frac}|null, marks:[{i, kind, frac, current, won}], count:{done, total}, remainMs, reward, bank:{gold, xp, items, books, cards}}`
  - `phase` — `move`(이동 · `stepEndsAt` 까지) · `fight`(전투 단계 — 핸들을 열어 관전) · `event`(폐허 물건 · 빈 방 — 다음 `exploreAdvance` 가 곧바로 넘긴다)
  - `route` — 상단 의뢰 · 폐허의 길(이동 시간 합 대비 지나온 몫 · 마차 · 표지의 자리) · 동굴은 null
  - `marks` — **지난 단계 + 지금 단계만**(앞으로의 습격 · 이벤트 자리는 안 나온다 — 숨긴다 · D9) · `kind` = `stage` · `elite` · `raid` · `monster` · `trap` · `rare` · `item` · `empty` · `frac` = 길 위 자리 · `won` = 지난 것의 승패(지금 것은 null) · `current` = 지금 그 자리에 있다(습격 덮침 · 이벤트 표지가 드러나는 순간)
  - `count` — 정보 카드의 「n / 전체」(동굴 전투 칸 · 상단 습격 · 폐허 이벤트) · `remainMs` = 추정(이동 + 남은 전투의 라운드 목표 시간)
  - `fight.unknown` — 지금 칸이 ??? 칸이다(보스 자리 둘라한 · 관전 라벨용)
- **`Result`** = `{no, preset, key, spot, chapter, diff, grade, outcome:'won'|'lost'|'recalled', at, startedAt, seen, log:[{i, kind, won}], got:{gold, xp:{uid:n}, levelUps, items:[uid](그 편성 인벤토리에 든 것), books:[skillId], cards:[{card, grade}], levelBooks:[{id, uid}], salvaged, discarded, materials:{id:n}(상단 감사인사), join:{ok, full, no, name, cls, face, sin, tier}|null}}` — 지거나 부르면 `got` 은 빈 값(「잃음」)
- **표 키** — `'지점|장|단|등급'`(`exploreTicketKey(spot, chapter, diff, grade)` · `exploreTicketParse(key)`) · 등급 id = `explore_grade.csv:grade_id`(`normal` · `magic` · `rare` — 이름은 i18n · 아이템 희귀도 문구 재사용 가능)

### 9-3. 관전에서 판 단계를 읽는 법

- **동굴** — 전투 단계마다 `exploreFight` 핸들이 원정 핸들과 같은 모양이다(`run.result.timeline` · `run.report` · `run.stageId`(그 칸) · `run.difficulty` · `run.party` · `run.fixed` · `run.squad`). 원정 관전 화면에 그대로 싣는다 — 라벨만 `run.kind === 'explore'` · `run.explore.{spot, fight, step}` 로 지점 · 칸(`stage` 칸 I · II · III · `elite` 덧붙은 정예 라운드). 칸 사이 숨 = `[balance.csv:repeat_restart_sec]`(다음 전투의 `at` 에 이미 들어 있다 — `nextRepeat` 대신 `exploreAdvance` 의 `at` 으로 센다). `run.report` 는 메모리 사본(골드 · 경험치는 **모으는 몫** — 아직 안 받았다) · 원정 리포트 목록에 안 든다.
- **상단 의뢰 · 폐허** — `RunView.phase === 'move'` 이면 지도: 마차 · 표지 자리 = `route.frac`(이동 진행률) · 지난 자리 = `marks` · `phase === 'fight'` 이면 전투 화면(습격은 `run.enemies` = 적 영웅 셋 `snapshotTeam` 모양 · `run.stageId === null` · 결투 관전과 같은 encounter 타임라인(`round.enemies[].hero`) · 폐허 몬스터 · 함정 · 드문 만남은 원정 칸 타임라인) → 끝나면 지도로. 함정은 `run.rules.curseDiff`(헬 장 디버프 줄) · 드문 만남은 `run.rules.round.type === 'boss'`.
- **틱** — 앱 시계(`expTick`)에서 원정 부대처럼: 탐험 판이 있는 편성마다 `exploreAdvance(G, no, at)` → 전투면 핸들을 열어 `state.battles[no]`(또는 따로 둔 칸)에 두고 박자로 민다(`advanceBattle` → `stepRun`) → 박자 끝 `exploreFightEnd(G, run, endedAt)` → 다시 `exploreAdvance`. `ended` 가 있으면 알림 · `save()`. 이어 돌기면 같은 편성에 새 판이 이미 서 있다(`runNo` 가 바뀐다).
- **다시 켰을 때 · 절전** — `exploreFinish(G, at)` 를 `closeRun` 직전에(9-1 표).

### 9-4. 개발 URL 손잡이 (`?dev=explore` 다시 쓸 때)

- 지점 열기 — 건물 랭크(`G.buildings.explore = 1 ~ 3` · 또는 기존 `&cn=explore:3`) · `construct` 가 첫 표를 준다(`exploreOpened`)
- 표 넣기 — `exploreAddTickets(G, exploreTicketKey(spot, ch, diff, grade), n)`
- 판 중간 상태 — `exploreSend` 뒤 `exploreJump(G, no, step, at)`(그 단계의 시작으로 · 모은 것 그대로) · 숨긴 습격 자리까지 보려면 `explorePlanOf(G, no)` — **화면에 쓰지 않는다**(습격 자리는 숨긴다)
- 결과 카드 — 판을 `exploreRecall` / `exploreFinish` 로 끝낸 뒤 `G.exploreResults[no − 1]`

### 9-5. 걷힌 것 (U 가 화면에서 같이 걷는다)

`exploreTake` · `exploreDrop` · 옛 `exploreErr(G, chapter, spot, no)` · `exploreState.spots[].out`(`items` · `books` · `beats` · `remainMs` · `frac`) · `hours` · `slots` · `perHero` · `limitsOf.exploreSlots` · `D.exploreStories` · balance `explore_hours` · `explore_slots` · `explore_cave_items_per_hero` · `explore_cave_book_pct`(app.js 12035 의 도움말 숫자 · `?dev=explore` 12971 · 13334 가 옛 함수를 부른다 — 지금은 그 개발 URL 이 깨진다).

> U 단계가 위 화면 호출을 새 계약으로 바꿨다(11-26 · ADR-1400 ~ 1404).

## 10. 남은 것 — 사용자 확인 대기

> **11-26 사용자 답(질문 창)** — Q1 「최하급만」(메인이 `exEnd` 고침) · Q2 「끝 시각 유지」(U 후속 — 로직 기다림 상태 · 화면) · Q3 「둘 다 본 것으로」(메인이 `seen = outcome === 'recalled'`) · Q4 「안 더한다」(그대로) · 기획서 base_expedition_design §3-1 · 「남은 것」 · GAME_DESIGN §10 반영 끝(메인).

| # | 무엇 | 지금 (구현) | 걸리는 것 · 추천 |
|---|---|---|---|
| Q1 | 상단 의뢰 감사인사 재료의 단계(D11) | 그 장 · 난이도 최고 칸 레벨을 `equip_upgrade_mat_ilvl_band` 로 나눈 단계(1장 노말 = 최하급 · 뒤 장은 위 단계) | 10-24 「위 단계 재료는 캐지 않는다 — 합성으로만」(item_design §5-2)과 부딪힌다 · 추천 = 최하급만 |
| Q2 | 다시 켜면 결과만 계산(D17) | 남은 이동 시간을 세지 않아 보내고 바로 껐다 켜면 판이 즉시 끝난다(폐허는 판 대부분이 이동) | 편성이 일찍 원정으로 돌아온다 · 추천 = 결과는 바로 계산하되 끝나는 시각은 보낸 시각 + 판 길이 그대로(그때까지 탐험 중) |
| Q3 | 부른 판의 결과 알림 | 지점 창 [부르기] = 바로 본 것 · 탐험 중 편성을 원정에 보내 부른 판 = 종 알림에 「안 본 부름」으로 남음 | 둘을 같게 맞출지 |
| Q4 | 플레이 시간 | 탐험 전투는 상단바 「원정 플레이 시간」에 안 더한다 | 더할지 |
| Q5 | 판이 끝난 뒤 | 관전 화면엔 결과 띠가 남고 위쪽 부대 칸은 「대기 중」 | 그대로 둘지 |
| — | 안 잰 것 | 표 칸 등급 툴팁 · 탐험 관전 최대화 버튼 · 모바일 레이아웃 | 다음 화면 점검 때 |
| — | 다른 세션 화면 | 오른쪽 위 1장 튜토리얼 판이 관전 배속 버튼을 가린다 | 튜토리얼 쪽 몫 |

---
*마지막 업데이트: 2026-11-26*
