# src/data — CSV (SSOT)

**수치는 전부 여기.** 코드 하드코딩 금지, 기획서엔 절대 수치 금지 — 기획서는 키 참조(`[balance.csv:key]`) · 체감 범위 · 공식 변수명 · 테이블 링크만.

- Godot / Unity 둘 다 그대로 읽는다 — **엔진별 포맷 변환 금지**
- `⚠제안` 표기 = 프로토타입 산식 계수. 기획으로 확정된 값이 아니다
- 다국어 문자열은 `_kr` / `_en` 컬럼 쌍

## 신규 SSOT 테이블

| 파일 | 내용 |
|---|---|
| `balance.csv` | 구조 키(파티·로스터·챕터·라운드 …) + 프로토타입 산식 계수(⚠제안). 밸런스 손잡이는 [`src/dev/README.md`](../dev/README.md) |
| `monster.csv` | 몬스터 112종, 일반 등급 소재값. `attack_type` = `physical` + 원소 4종(`fire`/`cold`/`lightning`/`poison`) · `resist` = 4원소 공통 |
| `stage.csv` | 스테이지 28개 — 타입 / dlvl / 보스 / 원소 |
| `stage_round.csv` | 스테이지 내부 라운드 9개 구조 |
| `round_budget.csv` | 라운드 타입별 편성 상한 + 목표 전투시간 |
| `spawn_grade.csv` | 등급 배율 (시간 예산과 분리) |
| `weapon_group.csv` | 무기군 11종(본편 9 + 확장 2) — 직업 전속 배정 · 한손/양손 · **공격 타입** · 행동 주기(⚠제안) · `_kr`/`_en` |
| `codex_level.csv` | 도감 레벨별 필요 카드 수 (⚠제안). 레벨별 보정 % 는 아직 `ui/mock.js` |
| `hero_attribute.csv` | 기본 능력치 7종 — 전투 계수 + 담당 파견처. 장비로 불변 (`attr_equip_bonus = 0`) |
| `skill.csv` | 직업 액티브 15종(본편 5직업 × 3) — 배율·쿨·지속·원소·라이더(⚠제안). 무기군 액티브 7 · 고유 스킬 풀은 미작성 (skill_design §9) |
| `combat_stat.csv` | 전투 능력치 24종 — 장비·스킬 파생. `fhr` = 상태이상 회복 속도 (stat_id 는 계승 접사 매핑 보존을 위해 유지) |
| `equipment_option_override.csv` | 계승 옵션 패치 — 기본 능력치/코스트 접사 제외, 오만 신발 `cc_reduction` → `fhr` |

## `inherited/` — TheSevenRPG 포크 25종 · **읽기 전용**

스키마 무변환, 재동기화 가능. `src/assets/inherited/` (배경 4 · CH1 얼굴 5) 도 같은 규칙 — 규격·재동기화는 그쪽 README.

계승분을 바꿔야 하면 **수정하지 말고** 이 폴더(`src/data/`)에 신규 테이블을 만들어 **대체**하고, 무엇이 무엇을 대체했는지 문서에 남긴다.

- 대체 이력: [monster_design.md §7](../../docs/game_design/monster_design.md)
- 계승 데이터의 빈 구멍: [inherited_data_gaps.md](../../docs/reference/inherited_data_gaps.md)

---
*마지막 업데이트: 2026-08-26 (skill.csv 등재 — 직업 액티브 15) · 2026-08-26 (CLAUDE.md 에서 분리)*
