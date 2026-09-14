# src/game_logic — 순수 게임 로직

**Phase 2 에 그대로 이식되는 유일한 코드.** UI 는 재작성 전제.
경계의 정확한 모양(시그니처 · 세이브 스키마 · 타임라인 · rng 순서)은 [docs/client/INTERFACE.md](../../docs/client/INTERFACE.md) — **그 문서가 계약이다.** 구현 현황과 부채는 [docs/client/DEV_PLAN.md](../../docs/client/DEV_PLAN.md).

## 이 폴더의 계약 (CLAUDE.md 아키텍처 원칙과 동일)

1. **DOM 을 모른다** — `document` / `window` / `localStorage` 참조 0. 입력은 생성자 주입, 출력은 순수 데이터
2. **난수는 주입** — `Math.random()` 직접 호출 금지. 시드 가능한 RNG(`rng.js`)를 받아 쓴다 → 같은 시드 = 같은 결과
3. **세이브는 엔진 중립 JSON** — 직렬화도 여기(`state.js`). 저장소 접근은 `ui/storage.js` 한 곳
4. **`Date` 직접 참조 없음** — 시각은 `now` 인자로 받는다

## 파일별 역할

| 파일 | 역할 |
|---|---|
| `rng.js` | mulberry32 + `deriveSeed(마스터 시드, 스트림)` |
| `csv.js` | CSV 파서 (fetch 는 `ui/data.js`) |
| `naming.js` | **이름 조립** — 아이템(`composeName`) · 정예 몬스터(`eliteName`). 언어별 어순·조사가 규칙이라 **CSV 로 적을 수 없다** — 그래서 데이터가 아니라 코드다. 죄종 표시명·형용사는 주입(⚠ 아직 `ui/mock.js:SINS`) · rng 를 쓰지 않는다 |
| `formula.js` | **피해 계산** = battle_design.md §9. 순수 함수만 — **레벨 차 적중**(명중·회피 없음) · `def_curve_k` **상수** 감쇠 · **저항 상한형**(직접 %) · 피해 감소 원천별 곱 · 직격/비직격 · 성장 축의 유일한 곡선 `growthMult`. 엔진 이식 대조 검증의 핵 |
| `hero.js` | 생성(합 고정·주력 축) · XP/레벨 · 히든 상한 성장 · 전투 능력치 합산 |
| `item.js` | 드롭 · 시작 무기(직업 전속 무기군) · 착용 규칙 · 분해 · **강화**(베이스 파생 · 3강마다 옵션 값) |
| `skill.js` | 액티브 정의 정규화·검증 · **배정(인스턴스 `{id, source}`)** · 발동 선택. **실행은 하지 않는다** — 정의는 `skill.csv`, 어휘는 `skill_effects.js` 의 표 |
| `skill_effects.js` | **「종류」 등록표** — 공격 대상 4 · 버프 효과 4 · 발동 조건 2. 종류 하나 = 등록 한 번(어휘와 실행이 같은 표를 읽는다). 상태·rng 없음 |
| `skill_runtime.js` | **액티브 실행** — 시전 · 쿨 · 창 · 배리어 · 회복 · 사건 훅(`reactions`). `battle.createRun` 이 런마다 만든다(전역 상태 없음) |
| `tactic.js` | **파티 전술** — 칸 해금(로스터 합산 레벨) · 조건 판정 · 리롤 후보. **무상태**(어느 칸에 무엇이 들었는지는 세이브가 든다) · 정의는 `tactic_slot.csv`·`tactic_option.csv`(**`(option_id, grade)` 복합키** — 가족과 등급 두 축), 조건 어휘·등급 어휘는 코드 |
| `battle.js` | 헤드리스 시뮬 — **런을 라운드 단위로 계산한다**(`createRun` — 라운드 사이에 정산 · 갈아입기가 끼어든다 · `simulate` 는 끝까지 이어 부른 것) · 누가 언제 때리는가 · 유닛 생성(`makeUnit` 하나 — 몬스터도 같은 생성자) · 직격·도발·전투불능 · 이긴 라운드의 몫. 보상 지급은 `state.js`(`advanceRun`), 액티브 실행은 `skill_runtime.js`, 피해 자체는 `formula.js` |
| `state.js` | 세이브 스키마 · `newGame` / `serialize` / `deserialize` · 모든 상태 전이 |

조립은 `ui/data.js:buildSystems` 한 곳 — 테스트(`dev/test.js`)도 같은 조립을 쓴다.
검증: [`src/dev/README.md`](../dev/README.md)

---
*마지막 업데이트: 2026-09-14*
