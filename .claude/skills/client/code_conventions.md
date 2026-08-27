# code_conventions — 이 저장소에서 실제로 쓰이는 규약

> `client` 스킬 4단계(구현)용. **코드를 읽어 뽑은 것만** 적었다. 계약 본문이 아니라 "어떻게 쓰는가"다.

- [1. 모듈 헤더 주석](#1-모듈-헤더-주석)
- [2. 생성자 주입](#2-생성자-주입)
- [3. 밸런스 키 읽기](#3-밸런스-키-읽기)
- [4. 결과 코드](#4-결과-코드)
- [5. `now` 와 `rng`](#5-now-와-rng)
- [6. in-place 가 계약인 것](#6-in-place-가-계약인-것)
- [7. uid 발급](#7-uid-발급)
- [8. 반올림](#8-반올림)
- [9. 문체 · 코드 스타일](#9-문체--코드-스타일)
- [10. CSV](#10-csv)
- [11. 조립과 mock](#11-조립과-mock)
- [12. 단정 쓰기](#12-단정-쓰기)

## 1. 모듈 헤더 주석

`game_logic/` 의 모든 파일이 `/** … */` 블록으로 시작한다. 순서:

1. 한 줄 역할 — "무엇을 하는 모듈인가" (`전투 시뮬레이터 — **헤드리스**.` 처럼)
2. 순수성 선언 — DOM · 저장소 · 시계 · `Math.random` 접근 없음, 데이터는 생성자 주입, 난수는 `rng` 인자
3. 기획서 확정 규칙을 **출처 절 번호와 함께** (`battle_design §9-5` · `item_design §2-1` · `hero_design §4-1`)
4. `⚠` 로 시작하는 줄 = 아직 미확정이라 임시로 둔 것. 확정되면 이 줄부터 지운다

`state.js` 는 여기에 세이브 형식과 버전 이관 규칙을 함께 적는다. 새 규칙을 넣을 때 이 헤더를 같이 고치지 않으면 코드와 주석이 갈린다.

파일 안은 `/* ── 생성 ── */` 같은 섹션 주석으로 묶는다 (`hero.js` · `state.js`).

## 2. 생성자 주입

- 모듈이 내보내는 것은 `export function create*(data)` 하나뿐이다. 함수 묶음 객체를 `return` 한다.
- 주입 필드는 헤더 `@param` 목록에 **이름 · 형태 · 출처**를 적는다 (`hero.js` · `battle.js` 가 본보기).
- **모듈 전역 가변 상태 금지.** 시스템은 무상태여야 한다.
- 다른 시스템이 필요하면 주입받거나(`itemSystem`), 내부에서 만든다(`createFormula(B)` — 무상태 순수 함수라 인스턴스를 공유하지 않아도 같은 결과).
- 새 주입 필드를 추가하면 `ui/data.js:buildSystems` 와 모듈 헤더 `@param` **양쪽**을 고친다.

## 3. 밸런스 키 읽기

- 생성자에서 `const B = balance;` (또는 `const B = data.balance;`) 로 받아 `B.<key>` 로 읽는다. `ui/app.js` · `dev/test.js` 도 같은 이름을 쓴다.
- **숫자 리터럴을 쓰지 않는다.** 계수는 전부 `balance.csv` 키다.
- 주석에서 키를 가리킬 때는 `[balance.csv:key]` 형식 (`hero.js` · `battle.js`).
- CSV 에 못 넣는 결정론 상수는 [INTERFACE.md §5-3](docs/client/INTERFACE.md) 표에 등재한 것만 허용된다.

## 4. 결과 코드

상태 전이 함수는 성공/실패를 같은 모양으로 돌려준다.

```js
return { ok: false, err: 'missing' };
return { ok: true, back, position: pos };
```

- `err` 문자열은 [INTERFACE.md §3](docs/client/INTERFACE.md) 결과 코드 사전에 있는 것만 쓴다.
- 새 코드를 만들면 **사전 + 렌더러 i18n 키(`ch.err.<code>` 등)** 를 같이 늘린다. 코드 문자열이 곧 계약이다.
- 조회 함수는 `null` 로 없음을 표현한다 (`equipTarget` · `closeRun`).

## 5. `now` 와 `rng`

- 시각이 필요한 함수는 `now`(ms)를 **인자로** 받는다. `Date.now()` 는 `ui/app.js:now()` 하나뿐 (ARCHITECTURE §6).
- 난수가 필요한 함수는 `rng` 를 인자로 받는다. 모듈이 스스로 시드를 만들지 않는다.
- **새 rng 소비 지점을 만들면** [INTERFACE.md §5-2](docs/client/INTERFACE.md) 표에 줄을 추가하고 결정론 단정을 고친다. 순서를 바꾸는 것은 같은 시드를 다른 게임으로 만드는 일이다.
- 세지 않는 집계(예: 빗나감 카운트)는 rng 를 쓰지 않아야 한다 — 쓰면 순서가 밀린다.

## 6. in-place 가 계약인 것

- `state.*` 의 모든 함수는 `state` 를 첫 인자로 받아 **그 객체를 직접 바꾼다.**
- `hero.grantXp` 는 hero 를 제자리에서 바꾼다 — 복사본을 넘기면 성장이 사라진다 ([INTERFACE.md §8](docs/client/INTERFACE.md) 항목 4).
- 순수 계산 함수(`computeCombat` · `formula.*`)는 반대로 입력을 만지지 않는다. 둘을 섞지 않는다.

## 7. uid 발급

- `rollHero` · `rollDrop` 은 `uid: null` 로 돌려준다. 발급은 `state.js` 만 한다 ([INTERFACE.md §8](docs/client/INTERFACE.md) 항목 3).
- 다른 모듈이 `counters` 를 만지지 않는다.

## 8. 반올림

자릿수가 계약이다 — [INTERFACE.md §5-3](docs/client/INTERFACE.md) 표에 있는 값을 그대로 쓴다. 임의로 `Math.round` 를 붙이거나 떼면 결정론이 깨진다. 새 자릿수를 도입하면 그 표에 줄을 추가한다.

## 9. 문체 · 코드 스타일

- ES Modules (`import` / `export`). 번들러 · 트랜스파일러 없음 — 브라우저가 그대로 읽는다.
- 들여쓰기 4칸 · 세미콜론 있음 · 작은따옴표.
- `const` 우선, 한 줄짜리는 화살표 함수. 여러 줄 로직만 `function`.
- 기본값은 매개변수 기본값과 `??` 로. 옵셔널 체이닝(`?.`) 자유롭게 쓴다.
- 주석은 **왜**를 적는다 — 무엇을 하는지는 코드가 말한다. 기획서 절 번호를 근거로 단다.

## 10. CSV

- 첫 줄 = 헤더. **셀에 쉼표 · 따옴표 이스케이프를 쓰지 않는다** — 설명 컬럼에도 쉼표를 넣지 않는 것이 데이터 계약이다 (`csv.js` · [INTERFACE.md §2-2](docs/client/INTERFACE.md)).
- 숫자로 읽히는 셀은 파서가 숫자로 바꾼다. 빈 셀은 빈 문자열이다 — `=== 0` 비교가 아니라 `undefined` / 빈 문자열을 다뤄야 한다.
- 다국어 문자열은 `_kr` / `_en` 컬럼 쌍 (`weapon_group.csv`).
- 아직 확정 아닌 계수는 `description` 에 `⚠제안` 을 남긴다.
- 엔진별 포맷 변환 금지 (CLAUDE.md 아키텍처 원칙 4).

## 11. 조립과 mock

- 조립은 `ui/data.js:buildSystems` **한 곳**. `dev/test.js` 도 같은 함수를 부른다.
- `ui/mock.js` 에 **game_logic 주입 데이터를 새로 추가하지 않는다** — 이식 차단 목록이 길어진다 ([INTERFACE.md §7](docs/client/INTERFACE.md) · DEV_PLAN 부채 #5). 늘려야 하면 CSV 를 만들고 `FILES` 에 등록하는 쪽으로 간다.

## 12. 단정 쓰기

`dev/test.js` 에 `check('<앞머리>: <규칙>', () => …)` 로 넣는다.

- **앞머리는 기존 영역 이름을 재사용한다** (`formula:` · `combat:` · `item:` · `equip:` · `save:` · `simulate:` · `codex:` · `tavern:` …).
- 이름에 규칙과 근거 절 번호를 함께 적는다 — 실패 표에 그대로 찍혀서 그게 곧 진단문이 된다.
- 통과 = `true` 또는 정보 문자열(표에 찍힌다). **실패 = `fail('사유')` 로 던진다** — 사유를 반환하면 통과로 집계된다.
- 고정 시각 상수 `NOW` 를 쓴다 — 테스트는 시계를 읽지 않는다.
- `balance.csv` 키를 늘리거나 이름을 바꾸면 `balance: 시스템이 쓰는 키가 전부 있다` 단정의 `need` 배열도 같이 고친다.
- 버그를 고쳤으면 **회귀 단정**을 남긴다 — "이 버그가 다시 나면 빨간불" 형태로.
