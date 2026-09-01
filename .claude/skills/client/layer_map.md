# layer_map — 무엇이 어디에 있고 어느 순서로 읽나

> `client` 스킬 1단계(사전 독해)용. 계약 본문은 여기 없다 — **어느 문서 몇 절에 있는지**만 가리킨다.

## 읽는 순서 (예외 없음)

1. **계약** — [INTERFACE.md](docs/client/INTERFACE.md) 의 해당 절. 코드보다 먼저.
2. **코드** — 아래 표의 파일.
3. **단정** — `src/dev/test.js` 에서 그 영역의 `check('<앞머리>: …')` 를 찾아 읽는다. 지금 무엇이 보호되고 있는지가 여기 있다.
4. 구조가 헷갈리면 [ARCHITECTURE.md](docs/client/ARCHITECTURE.md), 현황·부채가 궁금하면 [DEV_PLAN.md](docs/client/DEV_PLAN.md).

**mtime 을 먼저 본다** — 다른 세션이 같은 파일을 고치고 있을 수 있다.

## 로직 층 — `src/game_logic/` (이식 대상)

| 파일 | 역할 | 계약 | 단정 앞머리 (`dev/test.js`) |
|---|---|---|---|
| `rng.js` | 시드 RNG · 스트림 파생 | INTERFACE §2-1 · §5-1 | `rng:` |
| `csv.js` | CSV 파서 (fetch 는 하지 않는다) | INTERFACE §2-2 | `csv:` |
| `formula.js` | 피해 계산 — 순수 함수만 | INTERFACE §2-3 · §5-2 | `formula:` |
| `hero.js` | 생성 · XP/레벨 · 히든 상한 성장 · 전투 능력치 합산 | INTERFACE §2-4 | `combat:` · `xp:` · `시작 파티:` |
| `item.js` | 드롭 · 시작 무기 · 착용 규칙 · 분해 | INTERFACE §2-5 | `item:` · `equip:` · `salvage:` |
| `skill.js` | 액티브 정의 정규화·검증 · 배정(인스턴스 `{id, source}`) · 발동 선택 | INTERFACE §2-8 | `skill:` |
| `skill_effects.js` | 「종류」 등록표 — 공격 대상 · 버프 효과 · 발동 조건 (어휘 = 표의 키) | INTERFACE §2-11 | `runtime:` · `skill: 검증` |
| `skill_runtime.js` | 액티브 실행 — 시전·쿨·창·배리어·회복·사건 훅 | INTERFACE §2-12 · §2-6 실행 규칙 표 | `runtime:` · `simulate: 스킬` |
| `tactic.js` | 파티 전술 — 칸 해금 · 조건 판정 · 리롤 후보 | INTERFACE §2-9 | `tactic:` |
| `battle.js` | 헤드리스 시뮬 — 누가 언제 때리는가 · 유닛 생성 `makeUnit` · 직격·도발·전투불능 · 정산 (액티브 실행은 `skill_runtime.js`) | INTERFACE §2-6 (타임라인 소비 규칙은 §6) | `simulate:` · `battle:` |
| `state.js` | 세이브 스키마 · 직렬화 · 모든 상태 전이 | INTERFACE §2-7 · §3 · §4 | `save:` · `newGame:` · `resolveBattle:` · `codex:` · `closeRun:` · `tavern:` · `toggleParty:` |

폴더 자체의 계약과 파일별 한 줄 역할은 [src/game_logic/README.md](src/game_logic/README.md).

## 조립 · 저장 층 — `src/ui/` 안의 이식 관련 파일

| 파일 | 역할 | 계약 |
|---|---|---|
| `data.js` | CSV fetch → 파싱 → 시스템 생성자 주입. **조립은 여기 한 곳** (`buildSystems`) | INTERFACE §1 · §7 |
| `storage.js` | localStorage 어댑터 — 저장소를 만지는 유일한 파일 | INTERFACE §4 (저장소 키 줄) |
| `mock.js` | 표시 사전 **+ ⚠ game_logic 에 주입되는 게임 데이터** | INTERFACE §7 · ARCHITECTURE §9 |

- `dev/test.js` 도 `ui/data.js:buildSystems` 를 그대로 부른다 — **테스트와 런타임의 조립 경로가 하나**라는 것이 계약이다 (ARCHITECTURE §7).
- `app.js` · `battle.js` · `i18n.js` · `style.css` 는 렌더 층이다 → `/ui`.

## 전역 셋 — `D` · `SYS` · `G`

셋의 정체 · 소유 · 가변성은 [ARCHITECTURE.md §3](docs/client/ARCHITECTURE.md). 요지만:

- `D` = 로드된 CSV 파생 데이터, 부팅 후 읽기 전용
- `SYS` = 조립된 시스템 묶음, **무상태**
- `G` = 세이브 상태, **유일한 가변 상태**. 로직 함수는 `G` 를 첫 인자로 받아 직접 바꾸고, 렌더러가 뒤에 `save()` 를 부른다

시간과 난수의 출입구는 [ARCHITECTURE.md §6](docs/client/ARCHITECTURE.md).

## 데이터 층 — `src/data/`

- 파일별 내용 표는 [src/data/README.md](src/data/README.md). **수치를 여기 옮겨 적지 않는다.**
- **코드가 실제로 읽는 CSV** = `ui/data.js` 의 `FILES` 배열. 그 배열에 없는 CSV 는 아직 문서용 SSOT 다 (INTERFACE §7 · DEV_PLAN 부채 #12).
- `src/data/inherited/` 는 읽기 전용. 대체는 `src/data/` 에 신규 테이블로.

## 작업 유형 → 먼저 여는 문서

| 하려는 것 | 먼저 |
|---|---|
| 공식 · 계수 | INTERFACE §2-3 → `formula.js` → `formula:` 단정 |
| 전투 진행 · 타임라인 | INTERFACE §2-6 → §6(재생기) → `battle.js` |
| 세이브 필드 추가 · 버전 | INTERFACE §4 → §2-7 → `state.js` |
| 새 상태 전이 함수 | INTERFACE §2-7 → §3(결과 코드 사전) |
| rng 를 새로 소비 | INTERFACE §5-2 표에 줄 추가 → 코드 |
| CSV 키 발행 | `src/data/README.md` → `balance.csv` → `dev/test.js` 의 키 단정 |
| 부채 해소 | DEV_PLAN §4 해당 번호 → INTERFACE §9 |
