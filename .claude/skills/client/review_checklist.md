# review_checklist — 코드 리뷰

> `client` 스킬 리뷰 모드용. 순서대로 훑는다. **문제점과 수정안을 제시하고, 수정은 요청받을 때만 한다.**

## A. 기계로 잡는 것 (먼저 돌린다)

| # | 검사 | 방법 | 기대 |
|---|---|---|---|
| A1 | 순수성 | `src/game_logic/` 에서 `document\|window\|localStorage\|Date\.\|Math\.random` grep | 히트 0. 주석 안의 언급은 제외하고 판정 |
| A2 | 숫자 리터럴 | `src/game_logic/formula.js` 를 먼저, 그다음 나머지 로직 파일 | 계수는 전부 `B.<key>`. 남은 상수는 INTERFACE §5-3 표에 있는 것뿐 |
| A3 | 렌더러 한국어 리터럴 | `[가-힣]` grep in `src/ui/app.js` · `src/ui/battle.js` | 히트가 **전부 주석**이어야 한다. 따옴표 · 백틱 안에 한글이 있으면 위반 |
| A4 | 계승 폴더 | `git status` 에 `src/data/inherited/` · `src/assets/inherited/` 변경이 있나 | 없어야 한다 |
| A5 | mock 잔류 | `ui/data.js:buildSystems` 의 `M.*` 참조 수가 늘었나 | 늘면 이식 차단 목록이 길어진 것 (INTERFACE §7 · 부채 #5) |

## B. 계약 대조

- **B1. rng 소비 순서** — 바뀐 함수의 rng 호출 순서가 [INTERFACE.md §5-2](docs/client/INTERFACE.md) 표와 같은가. 새 소비 지점이 생겼으면 표에 줄이 추가됐는가.
- **B2. export 면** — 시그니처 · 입출력 모양이 [INTERFACE.md §2](docs/client/INTERFACE.md) 의 해당 절과 같은가. 코드가 앞서 나갔으면 문서를 먼저 고쳐야 한다.
- **B3. 세이브** — 필드가 늘었으면 [§4](docs/client/INTERFACE.md) 스키마에 반영됐는가. 버전을 올렸으면 이관 규칙이 `deserialize` 안에 있고, 못 올리는 버전은 throw 하는가.
- **B4. 결과 코드** — 새 `err` 문자열이 [§3](docs/client/INTERFACE.md) 사전에 있는가. 없으면 렌더러 i18n 이 함께 깨진다.
- **B5. 반올림 자릿수** — [§5-3](docs/client/INTERFACE.md) 표와 일치하는가.
- **B6. 유닛 모양** — 몬스터와 파티가 같은 필드 이름을 쓰는가 ([§2-6](docs/client/INTERFACE.md)). `res` 는 양쪽 다 원소 객체다 ([§8](docs/client/INTERFACE.md) 항목 11).
- **B7. in-place / 순수** — 상태를 바꾸는 함수와 계산만 하는 함수가 섞이지 않았는가 ([§8](docs/client/INTERFACE.md) 항목 4).
- **B8. uid** — `game_logic` 의 굴림 함수가 uid 를 발급하지 않는가 ([§8](docs/client/INTERFACE.md) 항목 3).

## C. 레이어 · 경계

- **C1.** 공식 · 집계가 렌더러에 남지 않았는가. 남았으면 부채다 ([DEV_PLAN.md §4](docs/client/DEV_PLAN.md) 의 경계 위반 항목 · [INTERFACE.md §9](docs/client/INTERFACE.md)).
- **C2.** `localStorage` 접근이 `ui/storage.js` 밖으로 새지 않았는가.
- **C3.** 조립이 `ui/data.js:buildSystems` 밖에서 일어나지 않는가.
- **C4.** 화면을 건드렸다면 SCREEN_DESIGN 이 먼저 고쳐졌는가 → 아니면 `/ui` 로 넘긴다.

## D. 검증 · 문서

- **D1. 단정** — 바뀐 규칙마다 단정이 있는가. 버그 수정이면 **회귀 단정**이 있는가.
- **D2. `fail()`** — 새 단정이 실패 사유를 반환하지 않고 던지는가.
- **D3. balance 키** — 키가 늘었으면 `balance: 시스템이 쓰는 키가 전부 있다` 단정의 `need` 목록에 들어갔는가.
- **D4. 문서 갱신** — INTERFACE(계약) · DEV_PLAN(§3-1 현황 · §3-3 R 상태 · §4 부채) · 폴더 README(역할이 바뀐 경우) · 각 문서 꼬리 날짜.
- **D5. 기획 근거** — 새 규칙이 GAME_DESIGN §9 확정분에서 왔는가. §10(미확정)에서 온 것이면 구현 자체가 이르다.

## 출력 형식

```
## 리뷰 — <대상>

### 위반 (고쳐야 한다)
- <파일:줄> — <무엇이 어떤 계약을 어겼나> (근거: <문서 §n>) → <수정안>

### 냄새 (판단 필요)
- <파일:줄> — <왜 걸리나> → <선택지 둘>

### 질문
- <결정이 필요해 리뷰어가 판단할 수 없는 것>
```

- 위반이 없으면 "위반 없음"이라고 쓴다. 억지로 채우지 않는다.
- 각 항목에 파일 · 줄 번호 · 근거 절 번호를 반드시 붙인다.
