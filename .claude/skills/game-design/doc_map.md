# 문서 지도 — 주제로 문서를 찾는다

> `game-design` 절차 0 에서 쓴다. 경로는 프로젝트 루트 기준.

## 1. 기획 문서

메인은 [docs/game_design/GAME_DESIGN.md](docs/game_design/GAME_DESIGN.md) — **방향성 문서**.

| 절 | 내용 | 언제 연다 |
|---|---|---|
| §1 | 게임 정의 · §1-1 동시 원정 · §1-2 층 배분 · 세부 문서 표 | 제안이 게임의 정의와 맞는지 볼 때 |
| §2 | 타겟 유저 · **설계 검증 기준** | 시스템 결정을 검증할 때 |
| §3 | 코어 루프 — 시간축이 활동을 가른다 | 온/오프라인 배치를 다툴 때 |
| §4 ~ §7 | 영웅 · 아이템 · 죄종 · 거점/파견 요약 | 세부 문서로 내려가기 전 |
| §8 | 기술 — `docs/client/` 로 넘김 | 구현 이야기가 섞일 때 |
| **§9** | **결정 로그** — 무엇이 정해졌는가 | **항상** |
| **§10** | **미확정 과제** — 큰 틀 / 시스템 / 수치·밸런스 | **항상** |

## 2. 주제 → 문서 → CSV → 코드

세부 문서의 절 번호는 그 문서에서 다시 확인한다 (개정이 잦다).

| 주제 | 세부 문서 (주요 절) | SSOT CSV (`src/data/`) | 코드 반영 확인처 |
|---|---|---|---|
| 원정 · 거점 · 파견 · 탐험 · 선술집 | [base_expedition_design.md](docs/game_design/base_expedition_design.md) §1 원정 · §1-2 스테이지 구조 · §2 파견처 · §2-4 선술집 · §3 파견 · §3-1 탐험 · **§4 방치형 계약** · §5 스코프 가드 | `balance.csv` · `stage.csv` · `stage_round.csv` · `round_budget.csv` | DEV_PLAN §3-2 (거점·파견·탐험) · §3-3 R9 |
| 전투 · 피해 계산 | [battle_design.md](docs/game_design/battle_design.md) §2 행동 주기 · §3 발동 규칙 · §5 액티브 · §6 쿨타임 · §8 전투 능력치 · §8-1 몬스터 · **§9 피해 계산**(§9-1~§9-6) · §9-9 미결 | `combat_stat.csv` · `balance.csv` · `round_budget.csv` | DEV_PLAN §3-3 R1~R8 · R10 |
| 영웅 · 능력치 · 성장 | [hero_design.md](docs/game_design/hero_design.md) §1 2층 구조 · §2 직업 · §3 정체성 분담 · §4 능력치 · §4-1 기본 능력치 · §4-1-1 미결 · §4-2 불변식 · §5 성장 · §6 미탑재 | `hero_attribute.csv` · `combat_stat.csv` · `balance.csv` | DEV_PLAN §3-3 R7 · R12 |
| 스킬 · 마스터리 · 전직 | [skill_design.md](docs/game_design/skill_design.md) §0 확정 · §1 구조 · §2 액티브 · §3 마스터리 · §4 전직 특화 · §5 롤백 · **§7 미확정** · §9 직업 액티브 초안 | `skill.csv` (노드 테이블 · 무기군 액티브 · 고유 스킬 풀 · 포인트 키는 **미발행**) | DEV_PLAN §3-2 (스킬 효과) |
| 아이템 · 접사 · 자원 | [item_design.md](docs/game_design/item_design.md) §1 계승 구조 · §2 변경점 · §2-1 ilvl 스케일링 · §4 이관 · §5 자원 · **§5-3 미확정** | `equipment_option_override.csv` · `weapon_group.csv` · `inherited/` (읽기 전용) | DEV_PLAN §3-2 (크래프트·낙인·유니크) · §3-3 R11 |
| 전술카드 | [tactic_card_design.md](docs/game_design/tactic_card_design.md) §1 정의 · §1-1 인접 개념 구분 · §2 확정 원칙 · §3 이관 · **§4 미확정** | **미발행** | DEV_PLAN §3-2 (전술카드) · §3-3 R14 |
| 몬스터 · 스테이지 · 도감 | [monster_design.md](docs/game_design/monster_design.md) §0 계승본에서 바꾼 것 · §1 타입 · §2 공격 타입 · §4 스테이지 구성 · §5 스폰 등급 · §6 정예 특성 · §7 데이터 구조 · §7-1 방어·저항 규칙 · §8 도감 | `monster.csv` · `stage.csv` · `stage_round.csv` · `round_budget.csv` · `spawn_grade.csv` · `codex_level.csv` | DEV_PLAN §3-2 (정예 특성 · 도감 계열 스탯) |
| 스토리 · 챕터 · 상태이상 | [story_chapter_design.md](docs/game_design/story_chapter_design.md) §1 스토리 · §2 챕터 구조 · §3 상태이상 | 계승 원본 테이블 (`src/data/inherited/`) | DEV_PLAN §3-2 (상태이상) |
| 죄종 통일 매핑 | `sin_mapping.md` — **아직 없다.** GAME_DESIGN §1 세부 문서 표에 "(예정)" · §10 큰 틀의 첫 과제 | 미발행 | DEV_PLAN §3-2 (죄종 매핑) |

CSV 전체 목록과 각 파일이 무엇을 담는지는 [src/data/README.md](src/data/README.md).

## 3. 참고 조사 문서

[docs/reference/](docs/reference/) — **본작 SSOT 가 아니다.** 참고작 조사 문서(lootun · dragoncliff · socket_layer · rune_concept) 머리말의 ⚠ 경고대로 이 수치를 `src/data/*.csv` 로 옮기지 않는다. 조사자 제안은 제안이지 결정이 아니다.

| 파일 | 무엇에 대한 조사인가 |
|---|---|
| `lootun_reference.md` | 참고작 Lootun 전수 조사 — 게임 형태의 표본 (스킬 · 아이템 · 경제 · 콘텐츠 · 거점 건물) |
| `dragoncliff_reference.md` | Dragon Cliff 전수 조사 — 방치형 파티 RPG 의 두 번째 표본. Lootun 과 같은 목차로 대조 가능 |
| `laststory_reference.md` | 마지막이야기(모바일) 전수 조사 — 로스터 없는 단일 캐릭터 방치형 + 무직업 704노드 트리 + 경량 MMO 표본. 자료가 얇아 **부분 조사** |
| `socket_layer_reference.md` | 장비 2차 층(룬 · 차암 · 주얼 · 젬 · 카드) 참고작 전수 조사. 게임별 분할본은 `socket_layer/` |
| `rune_concept_lexicon.md` | "룬 같은 개념" 사전 — 신화 · 종교 · TTRPG · 소설 · 만화 · 웹소설에서 뽑은 어휘 후보와 제약 규칙 원형. 분할본은 `rune_concepts/` |
| `inherited_data_gaps.md` | TheSevenRPG 데이터 포크의 범위와 갭 — 계승했는데 비어 있는 것 |
| `monster_art_prompt.md` | 몬스터 일러스트 프롬프트 SSOT — 계승 배경의 팔레트·픽셀 밀도에 맞추기 위한 것 |

형제 프로젝트(TheSevenRPG · TheSevenSimulation · TheSevenTactics) 조사는 SKILL.md 작업 규칙 (b) 대로 sonnet 서브에이전트에 맡긴다.

## 4. 문서 사이의 위계

- **게임의 WHAT** = `docs/game_design/` — 이 스킬의 담당
- **소프트웨어의 HOW** = `docs/client/` — [DEV_PLAN.md](docs/client/DEV_PLAN.md)(계획·부채·현황) · `ARCHITECTURE.md`(구조) · `INTERFACE.md`(이식 계약) · [SCREEN_DESIGN.md](docs/client/SCREEN_DESIGN.md)(화면). 기획이 여기를 고치지 않는다 — `/client` · `/ui` 로 넘긴다
- **수치** = `src/data/*.csv` — 기획서는 키 이름만 가리킨다
- 어느 문서를 먼저 고치는지의 표는 [DEV_PLAN.md](docs/client/DEV_PLAN.md) §7

---
*마지막 업데이트: 2026-08-27 (최초 작성)*
