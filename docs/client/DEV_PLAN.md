# DEV_PLAN — 클라이언트 개발 계획서

> **계획과 현황만.** 구조는 [ARCHITECTURE.md](ARCHITECTURE.md), 계약은 [INTERFACE.md](INTERFACE.md), 화면은 [SCREEN_DESIGN.md](SCREEN_DESIGN.md), 기획 백로그는 [GAME_DESIGN.md §10](../game_design/GAME_DESIGN.md).
> 이 문서에 이력을 쌓지 않는다 — 결정 이력은 GAME_DESIGN §9, 코드 이력은 git.

표기: ✅ 완료 · 🔧 진행 · ⏸️ 보류(기획 대기) · ☐ 예정

---

## 1. 현황 한 줄

**Phase 1 웹 프로토타입 — 초반 루프(새 게임 → 원정 → 리포트 → 장비 → 고용 → 반복)가 CSV 실값으로 돈다.** 규칙은 임시(⚠제안 계수), 스킬·파견·유니크·크래프트 없음. 세이브 v2.
**2026-08-26 오후 기획서가 앞서 나갔다** — battle_design §9 전면 개정 + 게임 정의 개정. 코드·INTERFACE.md 는 개정 전 상태 (§3-3).

---

## 2. Phase 1 마일스톤

| # | 날짜 | 마일스톤 | 상태 |
|---|---|---|---|
| M1 | 08-21 | 기획 골격 확정 · TheSevenRPG 데이터 포크 25종 · 화면 UI 목업 | ✅ |
| M2 | 08-23 | 캐릭터 탭 개편 · 한/영 다국어 레이어 · 신규 SSOT 데이터 8종 | ✅ |
| M3 | 08-25 | **초반 루프 실동작** — `game_logic/` 개봉 · 새 게임 · 세이브 | ✅ |
| M4 | 08-26 | 피해 공식(`formula.js`) · 프로토타입 ↔ 기획서 동기화 · 세이브 v2 · 공통 영웅 띠 | ✅ |
| M5 | 08-26 | 문서 체계 — 컨셉 락 · CLAUDE.md 재구성 · `docs/client/` 4종 · 폴더 README | ✅ |
| M6 | — | 경계 위반 정리 + 골든 시드 스냅샷 (§5-A) | ☐ |
| M7 | — | mock → CSV 이관 (§5-B) — Phase 2 착수 조건 | ☐ |
| M8 | — | 기획 확정분 구현 (§5-C) — 순서는 기획이 정한다 | ⏸️ |

---

## 3. 구현 현황

### 3-1. 돌아가는 것

| 항목 | 상태 | 비고 |
|---|---|---|
| 새 게임 — 후보 3명 굴림 · 리롤 · 시작 무기 | ✅ | 후보 시드는 UI 고정 상수 |
| 편성 — 파티 3 / 로스터 7 / 부상자 제외 | ✅ | |
| 스테이지 해금 — 직전 클리어 | ✅ | 28 스테이지 · 9 라운드 |
| 전투 — 헤드리스 시뮬 · 타임라인 · 관전 재생 | ✅ | 타겟팅 랜덤(진형 미확정) · 기본 공격만 |
| 피해 공식 — 명중 대결 · 곱셈 감쇠 · 원소 4 · 직격/비직격 | ✅ → ⏸️ | 구현은 돌지만 **기획 개정(08-26 오후) 미반영** — §3-3. 계수는 ⚠제안 키 |
| 정산 — XP(전원 동일) · 골드 · 가루 · 드롭 · 부상 타이머 · 클리어 | ✅ | XP 분배 규칙 ⚠제안 |
| 장착 / 해제 / 분해 — 위치 9 · 직업 전속 무기군 · 양손 배타 · 가방 상한 | ✅ | 능력치 게이트 없음 |
| 선술집 — 후보 3 · 고용 · 리롤 | ✅ | 유니크 등장 없음 |
| 도감 — 몬스터 카드 · 레벨 · 스테이지 보정 | ✅ | 레벨별 % 는 mock · **보정 2건 무효**(§4 #1·#2) |
| 반복 원정 — 켜져 있는 동안만 · 재접속 시 `closeRun` 알림 | ✅ | |
| 세이브 v2 — 엔진 중립 JSON · 어댑터 1곳 | ✅ | v1 이관 없음 |
| 다국어 ko/en · 렌더러 리터럴 0 | ✅ | |
| 검증 — test.html 단정 + 캘리브레이션 | ✅ | 골든 타임라인 스냅샷은 없음 |

### 3-2. 없는 것 (기획 미작성 → 구현 불가)

| 항목 | 기획 의존 |
|---|---|
| 스킬 효과 · 액티브 슬롯 실동작 · 트리 | skill_design.md 스킬 정의 |
| 명중/회피 대결의 몬스터 축 (현재 몬스터 명중·회피 0) | 정예 특성 데이터 연결 |
| 건강 계수 (상태이상 회복 속도) | 상태이상 7종 구현 |
| 유니크 영웅 · 유니크 아이템 | hero_design §1 / item_design |
| 크래프트 · 낙인 | item_design |
| **거점 · 파견 · 탐험** (컨셉 락의 오프라인 절반) | base_expedition_design §2·§3 — 탐험 상세 미정 |
| 진형 · 타겟팅 · 무기군 Implicit | GAME_DESIGN §10 |
| 죄종 매핑 | sin_mapping.md (첫 SSOT 과제) |

### 3-3. 기획 개정 미반영 (기획서 > 코드) — 2026-08-26

기획서가 확정했고 코드는 아직 옛 규칙인 것. **INTERFACE.md §2-3·§2-4 는 현재 코드를 기술**하므로 반영 시 그 절을 다시 쓴다. 반영 순서는 §5-C — 기획이 정한다.

| # | 기획 (battle_design §9 · GAME_DESIGN §9 08-26) | 코드 현재 | 위치 |
|---|---|---|---|
| R1 | **무기 = 밑수** — `+피해%` 는 무기만 곱함, 다른 슬롯 고정 공격력은 더하지 않음 | `(watk + atk_flat) × …` 항 하나 | `hero.js computeCombat` |
| R2 | **편차 = 무기 개체 굴림** (드롭 시 1회, 개체에 박힘) · 방어구 고유값도 굴림 | 타격마다 `rng` 로 편차 | `formula.js strike` · `item.js build` |
| R3 | **`def_curve_k` 상수** — 감쇠 50% 방어값. 공격자 레벨 무관 | `K = def_curve_k × 공격자 레벨` | `formula.js mitigation` |
| R4 | **피해 감소 = 원천별 곱** | `(1 − dr/100)` 단일 항 | `formula.js strike` |
| R5 | **명중·회피 폐지 → 적중 = f(레벨 차)** · 0/1 게이트 · 하한 · 오버레벨 100% | `clamp(100 − eva + acc, hit_floor_pct)` 대결 · `accuracy`/`evasion` 스탯 | `formula.js hitChance` · `hero.js` · `combat_stat.csv` · `equipment_option_override.csv` |
| R6 | **원소 저항 = 상한형 %** (`res_cap_base` + 최대 저항 증가 · `res_cap_absolute` · 하한 없음) | `res` 를 방어처럼 곡선에 넣음 | `formula.js defenseAgainst` · `balance.csv` 키 신규 |
| R7 | **감각 → 운** — 전투 계수 제거, 드랍률·골드 계수 | `senMult` 가 명중·회피를 곱함 | `hero.js` · `hero_attribute.csv` 는 이미 개정됨(코드 미반영) · `ui/mock.js STATS` |
| R8 | **몬스터 = 영웅 공통 전투 능력치 체계** | 몬스터 `res` 숫자 하나 / 영웅 `res` 객체 (INTERFACE §8 항목 11) | `battle.js makeEnemy` · `monster.csv` |
| R9 | **게임 정의 개정** — 원정 독점 삭제 → 크래프트 제작 · 영웅 획득 = 선술집 + 수색 · 해고 | 구현 없음 (기획 상세 미정) | — |

R1~R7 은 `formula.js` 재작성 한 묶음이다. 반영하면 **골든 스냅샷(§5-A #4)이 전부 바뀌므로** 스냅샷은 R 반영 뒤에 찍는다.

---

## 4. 기술 부채 · 결함

2026-08-26 코드 인벤토리에서 확인. **고치지 않았다** — 수정은 별도 작업으로.

| # | 종류 | 내용 | 위치 | 영향 | 조치 |
|---|---|---|---|---|---|
| 1 | **버그** | 공격자 필드 `dmgBonus` ↔ `strike` 가 읽는 `bonusPct` 불일치 → 도감 피해 보정(`dmg_pct`) 미적용 | `battle.js:56,117` · `formula.js:64` | 도감 스테이지 4 보정 무효 | 이름 통일. 회귀 단정 추가 |
| 2 | **버그** | `codexBonus` 가 내는 `acc_pct` 를 `computeCombat` 이 읽지 않음 | `state.js:130` · `hero.js:143` | 도감 스테이지 3 보정 무효 | `accuracy` 에 곱하거나 계열 재배정. 단정 추가 |
| 3 | 경계 위반 | 실효 쿨 공식(battle_design §6)이 렌더러에만 | `ui/app.js:46` | 이식 시 유실 | `formula.js` 로 이동 → `SYS.formula.effectiveCd` |
| 4 | 경계 위반 (경미) | 예상 소요 시간 집계가 렌더러에 | `ui/app.js:77` | 표시 전용이라 낮음 | `battle.js` 에 `stageTimeTarget(stage)` |
| 5 | **이식 차단** | game_logic 주입 데이터가 `ui/mock.js` 에 잔류 (12항목 — INTERFACE §7) | `ui/mock.js` | UI 폐기 = 로직 굶음 | §5-B |
| 6 | 무음 실패 | 재생기가 모르는 유닛 키·이벤트를 조용히 무시 | `ui/battle.js:apply` | 타임라인 계약 위반을 못 잡음 | 개발 모드에서 `console.warn` |
| 7 | 계약 취약 | rng 소비 순서를 강제하는 테스트 없음 — 리팩터링이 곧 회귀 | `dev/test.js` | Phase 2 대조 불가 | **골든 시드 스냅샷** (§5-A) |
| 8 | 타입 이원성 | `res` 가 몬스터는 숫자·영웅은 객체 | `formula.js:47` | 정적 타입 이식 시 분기 | 이식 시 인터페이스 2개. 지금은 계약으로만 |
| 9 | 설계 선택 | `grantXp` in-place mutate | `hero.js:110` | 계약으로 명문화됨 | 유지 (순수화는 선택) |
| 10 | 코드 상수 | 결정론에 걸리는 상수 10개가 CSV 밖 (INTERFACE §5-3) | 여러 곳 | 이식 시 누락 위험 | 목록 유지. 보조 ×1.5 는 CSV 후보 |
| 11 | 외부 의존 | Galmuri CDN 폰트 | `index.html` | 오프라인 폴백만 | 스팀 빌드 전 로컬 동봉 |
| 12 | 미사용 SSOT | `hero_attribute` · `combat_stat` · `equipment_option_override.csv` 를 코드가 안 읽음 | `ui/data.js` | mock 사본과 어긋날 수 있음 | §5-B 에서 읽기 전환 |

---

## 5. 다음 작업 — 기획 무관하게 할 수 있는 것

### 5-A. 경계 정리 + 골든 스냅샷 (M6)

1. 부채 #1 · #2 수정 + 회귀 단정
2. 부채 #3 · #4 — 공식·집계를 game_logic 으로
3. 부채 #6 — 재생기 경고
4. **골든 시드 스냅샷** — 시드 N개 × 스테이지 M개의 타임라인을 해시(또는 요약: 이벤트 수·최종 HP·승패·드롭 uid 목록)로 `dev/golden.json` 에 고정. test.html 이 매번 대조. **이것이 Phase 2 검증의 실제 도구다** — 엔진 쪽에서 같은 시드로 같은 해시가 나오면 이식 성공. **§3-3 R1~R7 반영 뒤에 찍는다** — 그 전에 찍으면 바로 무효
5. 부채 #10 — 상수 목록을 test.js 단정으로 고정

### 5-B. mock → CSV 이관 (M7)

INTERFACE §7 표의 12항목. 우선순위 = game_logic 이 실제로 읽는 것부터.

| 순서 | 항목 | 대상 |
|---|---|---|
| 1 | `STATS` → `hero_attribute.csv` 읽기 전환 (부채 #12) | 기존 CSV |
| 2 | `EQUIP_SLOTS` / `SLOTS` → `equip_slot.csv` | 신규 |
| 3 | `CLASSES` → `class.csv` (id · keyAttr · stage · 무기군은 weapon_group 이 이미 듦) | 신규 |
| 4 | `CODEX_LEVEL_BONUS` · `CODEX_STAT_BY_NUM` → `codex_level.csv` 컬럼 | 기존 CSV |
| 5 | `HERO_NAME_POOL` · `HERO_TRAIT_POOL` → `hero_name.csv` · `hero_trait.csv` | 신규 |
| 6 | `SIN_TRAITS` · `COMMON_TRAITS` → 계승 `elite_trait.csv` 연결 | 계승 |
| 7 | `ITEM_BASES` · `AFFIX_DEFS` → 계승 `equipment_base` · 접사 매트릭스 연결 + 3부위 신규 | 계승 + 신규 |
| 8 | `SINS` 키 → 죄종 테이블 | sin_mapping.md 확정 후 |

`nm()`(이름 조립)은 CSV 가 아니라 **이식 대상 코드** — `game_logic/` 로 옮긴다.

### 5-C. 기획 확정분 (M8 — 순서는 기획이 정한다)

§3-2 표. 각 항목은 기획서 확정 → INTERFACE 갱신 → 구현 → 단정 순.

---

## 6. Phase 2 — 엔진 이식 계획

### 6-1. 착수 조건 (Phase 1 종료 기준)

- [ ] M6 · M7 완료 — 경계 위반 0, mock 잔류 0, 골든 스냅샷 존재
- [ ] 코어 기획 확정 — 최소 스킬 · 진형/타겟팅 · 파견/탐험 (이게 없으면 이식 후 로직을 다시 짠다)
- [ ] INTERFACE.md 가 코드와 일치 (경계 변경마다 갱신했는가)
- [ ] 엔진 결정 (Godot / Unity) — 기획 검증 완료 후

### 6-2. 이식 전략 — 선택지

| | A. 1:1 재작성 (GDScript / C#) | B. JS 런타임 임베드 |
|---|---|---|
| 방법 | game_logic 7 파일을 엔진 언어로 옮김 | 엔진 안에서 JS 엔진(QuickJS 등)으로 기존 코드 실행 |
| 장점 | 엔진 네이티브 · 디버깅 · 성능 · 플랫폼 제약 없음 | 이식 작업 0 · 결정론 자동 보장 |
| 단점 | 결정론 재현 부담 (rng · double · 호출 순서) | 브리지 층 · 콘솔/모바일 제약 · 스택 이중화 |
| 검증 | **골든 스냅샷 대조**로 해결 | 불필요 |

**권장 A.** 이유: 로직이 작고(7 파일) 순수하며, 계약(INTERFACE)과 골든 스냅샷이 있으면 재현 부담이 검증 가능한 문제로 바뀐다. B 는 "이식 안 함"이지 이식이 아니다.

### 6-3. 이식 순서 (A 기준)

| 단계 | 대상 | 완료 기준 |
|---|---|---|
| P2-1 | `csv` · `rng` · `formula` | 같은 CSV → 같은 파싱 결과 · 같은 시드 → 같은 난수열 · 같은 입력 → 같은 `strike` 결과 (골든) |
| P2-2 | `hero` · `item` | 같은 시드 → 같은 영웅/아이템 (JSON 비교) |
| P2-3 | `battle` | 같은 시드 → **같은 타임라인 해시** |
| P2-4 | `state` | 세이브 JSON 왕복 · 정산 결과 동일 |
| P2-5 | 저장 어댑터 · 데이터 로더 | `user://` / 파일 |
| P2-6 | UI 재작성 | SCREEN_DESIGN.md 화면 지도 전부 · `i18n.js:STRINGS` 계승 |
| P2-7 | 웹 프로토타입과 동시 실행 대조 | 시드 N개 전 스테이지 해시 일치 |

### 6-4. 이식에서 버리는 것

`ui/app.js` · `ui/battle.js` · `style.css` · `index.html` · `start.bat` · `mock.js` 표시 사전 절반. **버리기 전에 SCREEN_DESIGN.md 가 그 내용을 다 담고 있어야 한다.**

---

## 7. 문서 유지 규칙

| 바꾸는 것 | 먼저 고치는 문서 |
|---|---|
| game_logic 의 export · 입출력 · rng 순서 · 세이브 스키마 | **INTERFACE.md** |
| 화면 · 탭 · 플레이어가 내리는 결정 | **SCREEN_DESIGN.md** |
| 레이어 · 전역 · 조립 · 부팅 | ARCHITECTURE.md |
| 마일스톤 · 부채 · 현황 | 이 문서 |
| 기획 결정 | GAME_DESIGN.md §9 (확정) · §10 (미확정) |

폴더 README(`src/*/README.md`)는 "이 폴더에 뭐가 있나"만 — 현황·이력은 여기로.

---

*마지막 업데이트: 2026-08-26 (§3-3 기획 개정 미반영 R1~R9 등재) · 2026-08-26 (최초 작성 — 구현 현황을 game_logic/README 에서 이관, 부채 12건 등재)*
