# 파티 전술 개편 (R441) — 이어서 할 일

규칙 본문은 [tactic_card_design.md](docs/game_design/tactic_card_design.md) §5-14 · 코드 계약은 [INTERFACE.md](docs/client/INTERFACE.md) §2-9 · 화면은 [SCREEN_DESIGN.md](docs/client/SCREEN_DESIGN.md) §15 · ADR-1048. 이 문서는 남은 일만 적는다.

## 지금 상태 (2026-11-11 회사 PC)

| 항목 | 상태 |
|---|---|
| 기획 | 확정 · 문서 반영 끝 — tactic_card_design §5-14 · GAME_DESIGN §9 11-11 마지막 행 · §10 |
| 코드 · 화면 | 구현 끝 — 효과 풀 · 값 = 기준값 × 등급 × 조건 단계 · 2랭크 그 칸 죄종 영웅 수 · 3 · 4랭크 조건 없음 · 5랭크 함께 잡은 몬스터 수 · 장비 죄종 버프 · 같은 효과 두 칸 허용 · 칸 줄 일곱 칸 · 카드 아래 두 열 판 |
| 검증 | `PASS 840/840` · 골든 60런 · 시작 파티 그대로 · `?dev=tactics` ko/en 렌더 OK |
| 세이브 | 버전 그대로 — 로드할 때 옛 `bonds`(함께 깬 칸)를 지우고 `killsTogether` 가 0 부터 |
| git | ⚠ **커밋 안 됨** — 회사 PC 작업 폴더에만 있다. 같은 파일에 병렬 세션 변경도 섞여 있다 |

## 남은 일

1. **집으로 가져오기** — 회사 PC 에서 커밋 · 푸시해야 집에서 이어진다. app.js · i18n.js · style.css · INTERFACE · SCREEN_DESIGN · DEV_PLAN · GAME_DESIGN 에는 다른 세션 변경도 들어 있다
2. **DEV_PLAN 마감**
   - R441 → ✅ 11-11 · `PASS 840/840` · 골든 그대로 · 값은 임시
   - §3-1 「파티 전술」 현황 행이 옛 내용 그대로다
3. **화면 확인 못 한 곳** — 출정 창 · 결투장 판의 전술 읽기 칸. `?dev=form` 이 지휘 천막 없이 열려 행이 0개로 나왔다(오류는 0) → 지휘 천막을 지은 상태로 열어 본다
4. **죽은 문구 키** — `rs.note` · `rs.note.cond`(옛 문장 · 화면에서 안 읽힘) → 지우거나 고친다
5. **diff 검수** — 실행 에이전트가 고친 것을 사람 눈으로 아직 안 봤다
   - `src/game_logic/tactic.js`(통째로 다시 씀) · `state.js` · `src/ui/data.js` · `src/dev/test.js`
   - 원정 정산의 경험치 획득을 `runCombat` 에서 읽게 바꿨다 — 탐욕 「경험치 획득」 전술이 정산에 들어가게 하려는 것(골든 그대로)
   - 옵션 표는 22행이다 — 효과 19 + 시기 원소 변형(화염 · 냉기 · 전기 · 독)
6. **(선택) 기획서 정리** — tactic_card_design §5-8 · §5-11 ~ §5-13 은 이제 죽은 옛 규칙이다(「코드 반영 전까지」 문구가 낡았다) → DECISION_LOG 로 옮기고 본문에서 걷는다

## 이 작업이 바꾼 파일

| 묶음 | 파일 |
|---|---|
| 기획 | docs/game_design/tactic_card_design.md · GAME_DESIGN.md |
| 계약 · 대장 | docs/client/INTERFACE.md(§2-7 · §2-9 · §4 · §5-2 · §7) · DEV_PLAN.md(R441 행) |
| 화면 문서 | docs/client/SCREEN_DESIGN.md §15 · SCREEN_CHANGELOG.md · adr/1048 신설 · 0434 · 0757 · 0758 · 0764 · 0938 「대체됨」 · adr/README.md(스크립트 재생성) |
| 데이터 | src/data/tactic_option.csv · tactic_condition.csv · tactic_slot.csv(교체) · tactic_score.csv(삭제) · balance.csv(키 넷 — `tactic_grade_mult_common` · `_magic` · `_rare` · `tactic_sin_gear_pct`) |
| 코드 | src/game_logic/tactic.js · state.js · src/ui/data.js · app.js · i18n.js · style.css · src/dev/test.js |
| README | src/data · src/game_logic · src/dev |

## 아직 정할 기획

| 과제 | 메모 |
|---|---|
| 3 · 4랭크 조건 | 지금은 조건 없음(×1). 3랭크는 조건 묶음에서 같이 굴리는 안(발라트로 조커) — 후보는 tactic_card_design 「남은 것」 |
| 임시 값 | 등급 배수 · 5랭크 문턱 셋 · 기준값 · 피해 감소 배수 몫 · 장비 죄종 몫 — 전부 CSV(`tactic_option.csv` · `tactic_condition.csv` · `balance.csv`) · 대량 시뮬로 다시 |
| 파워 예산 | 최대치 = 레어 × 3단계 × 버프 효과(리더 + 장비 죄종) · 같은 효과가 칸마다 더해진다 |

---
*마지막 업데이트: 2026-11-11*
