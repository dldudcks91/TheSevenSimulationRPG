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
| `formula.js` | **피해 계산** = battle_design.md §9. 순수 함수만 — 명중 대결 · 곱셈 감쇠 · 직격/비직격. 엔진 이식 대조 검증의 핵 |
| `hero.js` | 생성(합 고정·주력 축) · XP/레벨 · 히든 상한 성장 · 전투 능력치 합산 |
| `item.js` | 드롭 · 시작 무기(직업 전속 무기군) · 착용 규칙 · 분해 |
| `battle.js` | 헤드리스 시뮬 — 누가 언제 때리는가. 피해 자체는 `formula.js` |
| `state.js` | 세이브 스키마 · `newGame` / `serialize` / `deserialize` · 모든 상태 전이 |

조립은 `ui/data.js:buildSystems` 한 곳 — 테스트(`dev/test.js`)도 같은 조립을 쓴다.
검증: [`src/dev/README.md`](../dev/README.md)

---
*마지막 업데이트: 2026-08-26 (구현 현황 → docs/client/DEV_PLAN.md 로 이관)*
