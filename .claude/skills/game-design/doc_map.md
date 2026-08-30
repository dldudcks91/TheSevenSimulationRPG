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
| 아이템 · 접사 · 자원 | [item_design.md](docs/game_design/item_design.md) §1 구조 · §2 변경점 · §2-1 ilvl 스케일링 · §4 이관 · §5 자원 · **§5-3 미확정** | `equipment_option_override.csv` · `weapon_group.csv` · `inherited/` (읽기 전용) | DEV_PLAN §3-2 (크래프트·낙인·유니크) · §3-3 R11 |
| 전술카드 | [tactic_card_design.md](docs/game_design/tactic_card_design.md) §1 정의 · §1-1 인접 개념 구분 · §2 확정 원칙 · §3 이관 · **§4 미확정** | **미발행** | DEV_PLAN §3-2 (전술카드) · §3-3 R14 |
| 몬스터 · 스테이지 · 도감 | [monster_design.md](docs/game_design/monster_design.md) §0 데이터 재작성 · §1 타입 · §2 공격 타입 · §4 스테이지 구성 · §5 스폰 등급 · §6 정예 특성 · §7 데이터 구조 · §7-1 방어·저항 규칙 · §8 도감 | `monster.csv` · `stage.csv` · `stage_round.csv` · `round_budget.csv` · `spawn_grade.csv` · `codex_level.csv` | DEV_PLAN §3-2 (정예 특성 · 도감 계열 스탯) |
| 스토리 · 챕터 · 상태이상 | [story_chapter_design.md](docs/game_design/story_chapter_design.md) §1 스토리 · §2 챕터 구조 · §3 상태이상 | `src/data/inherited/` | DEV_PLAN §3-2 (상태이상) |
| 죄종 통일 매핑 | `sin_mapping.md` — **아직 없다.** GAME_DESIGN §1 세부 문서 표에 "(예정)" · §10 큰 틀의 첫 과제 | 미발행 | DEV_PLAN §3-2 (죄종 매핑) |

CSV 전체 목록과 각 파일이 무엇을 담는지는 [src/data/README.md](src/data/README.md).

## 3. 참고 조사 문서

[docs/reference/](docs/reference/) — **본작 SSOT 가 아니다.** 참고작 조사 문서(lootun · dragoncliff · socket_layer · rune_concept) 머리말의 ⚠ 경고대로 이 수치를 `src/data/*.csv` 로 옮기지 않는다. 조사자 제안은 제안이지 결정이 아니다.

게임별 폴더(`<game>/00_overview.md` 전체 설명 · `01_skills.md`(또는 `skills/`) 스킬 전수 · `02_items.md`(또는 `items/`) 아이템 구조·옵션 전수)로 재정리 중 — 진행 상황은 각 파일에서 직접 확인.

| 파일 | 무엇에 대한 조사인가 |
|---|---|
| `diablo2/` | 참고작 5호 Diablo 2 — `00_overview.md`(마스터리·오라 등 총괄 분석, 완료) · `skills/`(7직업 210스킬 전수, 완료) · `02_items.md`(베이스아이템·품질축·접사티어·세트/유니크/크래프트 전수, 완료) |
| `afkarena/` | AFK Arena 전수 조사 — 히어로 100종+ 로스터형 모바일 방치형 RPG 표본. `00_overview.md`(게임 구조·전투 밖 부가 콘텐츠·파견처 대조·본작 대조 시사점) · `01_skills.md`(스킬 슬롯 구조·역할군별 히어로 22종 실제 스킬) · `02_items.md`(Gear 6슬롯·Signature Item·Artifact 15종·Furniture) — 전부 완료 |
| `lootun/` | 참고작 Lootun 전수 조사 — **본작 1순위 참고작**(게임 형태). `00_overview.md`(게임구조·성장축·전투수치·경제·거점건물·콘텐츠루프·설계원리 8가지·본작대조표, 완료) · `01_skills.md`(56액티브 스킬 중 47확보·8패시브 트리·역할군 실측 빌드 8종, 완료) · `02_items.md`(슬롯·희귀도·접사·개조도구10종·Nemesis확률실측·젬세트·유물·인챈트, 완료) |
| `dragoncliff/` | 참고작 Dragon Cliff 전수 조사 — 방치형 파티 RPG 의 두 번째 표본, Lootun 과 같은 목차로 대조 가능. `00_overview.md`(게임구조·성장축·전투모델·마을경제자동화·콘텐츠루프·설계원리 9가지·3자대조, 완료) · `01_skills.md`(Active/Passive/Tactic 3층·School Book Pages 비용표·Talent 4그룹·클래스 5분류 대표 7종 실측·Combat Style 7종, 완료) · `02_items.md`(슬롯5·희귀도5+Star·Furnace 5기능 비용표·젬소켓8·Set Amulet 5종, 완료) |
| `aion/` | 참고작 아이온(AION: 영원의 탑) 전수 조사 — 대형 라이브서비스 MMORPG 표본, 마석·신석·스티그마·날개·연속기가 원작 고유 어휘(아이온2 오염 배제 필수, `00_overview.md §0` 참고). `00_overview.md`(게임구조·본작대조 시사점 9가지·출처, 완료) · `01_skills.md`(연속기 5분류·8대 확정 직업 실제 스킬·스티그마 스킬 예시, 완료) · `02_items.md`(무기9종·방어구4재질·마석·신석·강화·스티그마 슬롯·날개 등급계단·세트, 완료) |
| `diablo4/` | 참고작 Diablo 4 전수 조사 — 파밍이 스킬 효과 자체를 바꾸는 상용 라이브서비스 ARPG 표본. **2026-04-28 Lord of Hatred(시즌13)가 스킬트리·아이템 구조를 전면 개편**해 고전(2023~시즌12)과 현행을 분리 표기(`00_overview.md §0`). `00_overview.md`(게임구조·파라곤 보드·글리프·본작대조 시사점 7가지·출처, 완료) · `01_skills.md`(8클래스 스킬트리 카테고리·전문화·시즌13 좌우분기+3종 변형·파라곤 태그 연동, 완료) · `02_items.md`(등급·소켓·어스펙트/코덱스 오브 파워(시즌13 타겟파밍 폐지)·탈리스만·참·호라드릭 큐브, 완료) |
| `idlechampions/` | 참고작 Idle Champions of the Forgotten Realms 전수 조사 — "다수 챔피언이 대열을 이뤄 자동전투" 구조의 표본, battle_design.md §9-9 진형 미결과 직결. `00_overview.md`(게임구조·**파티 포메이션 구조 상세**(인접/2칸/같은열 3단계·Bond·Feat슬롯)·본작대조 시사점·출처, 완료) · `01_skills.md`(기본공격/Specialization/Feat/Ultimate·Bond·Familiar 4~5층 구조, 대표 챔피언 8종 실제 스킬 수치, 완료) · `02_items.md`(Gear 6슬롯·희귀도4단·**세트보너스 없음(3자→4자 수렴)**·Forge Legendary 승급·Chest 확률표·Feat 아이템 축·Marvelous Pigments("유물"에 가장 가까운 것), 완료) |
| `dungeonvillage2/` | 참고작 Dungeon Village 2(Kairosoft) 전수 조사 — 전투가 완전 자동·비관전인 경영 시뮬 표본, 본작 **「파견처」 개념 자체를 검증할 자료**로 최우선 조사됨. `00_overview.md`(게임구조·**파견 구조 최우선 전문**·본작대조 시사점 9가지·출처, 완료) · `01_skills.md`(직업(Job) 44종+전수 명단·TP/DP 비용·기초스탯6종→전투스탯4종 이중구조·종족고정 7종의 스펠북 종속, 완료) · `02_items.md`(무기7종·방어구3부위 약 200개체 전수 스탯표·가마솥 해금조건·레시피60종+·몬스터조련→TP→전직 순환, 완료) |
| `eso/` | 참고작 Elder Scrolls Online 전수 조사 — 업계 최장수 라이브서비스 MMORPG 표본, `skill_design.md` §7 "무기 숙련의 귀속"(직업 마스터리 vs 무기군 트리) 단일 표본에서 시작해 **8범주 다층 스킬라인 구조**와 아이템 등급·세트·제작 구조로 확장. `00_overview.md`(게임구조·클래스vs무기 이중구조 요약·본작대조 시사점 6가지·출처, 완료) · `01_skills.md`(**클래스vs무기 이중구조 전문**·무기 스킬라인 6종·방어구 3종·길드 6종 전수(모프 포함)·용기사 클래스 대표표본·Class Mastery, 완료) · `02_items.md`(품질 5단계·특성(Trait) 27종 전수·인챈트 룬3종·세트 2/3/4/5피스+몬스터셋+신화아이템·제작 7전문직, 완료) |
| `laststory_reference.md` | 마지막이야기(모바일) 전수 조사 — 로스터 없는 단일 캐릭터 방치형 + 무직업 704노드 트리 + 경량 MMO 표본. 자료가 얇아 **부분 조사** |
| `socket_layer_reference.md` | 장비 2차 층(룬 · 차암 · 주얼 · 젬 · 카드) 참고작 전수 조사. 게임별 분할본은 `socket_layer/` |
| `rune_concept_lexicon.md` | "룬 같은 개념" 사전 — 신화 · 종교 · TTRPG · 소설 · 만화 · 웹소설에서 뽑은 어휘 후보와 제약 규칙 원형. 분할본은 `rune_concepts/` |
| `inherited_data_gaps.md` | `src/data/inherited/` 의 범위와 갭 — 테이블은 있는데 비어 있는 것 |
| `monster_art_prompt.md` | 몬스터 일러스트 프롬프트 SSOT — `backgrounds/` 의 팔레트·픽셀 밀도에 맞추기 위한 것 |

## 4. 문서 사이의 위계

- **게임의 WHAT** = `docs/game_design/` — 이 스킬의 담당
- **소프트웨어의 HOW** = `docs/client/` — [DEV_PLAN.md](docs/client/DEV_PLAN.md)(계획·부채·현황) · `ARCHITECTURE.md`(구조) · `INTERFACE.md`(이식 계약) · [SCREEN_DESIGN.md](docs/client/SCREEN_DESIGN.md)(화면). 기획이 여기를 고치지 않는다 — `/client` · `/ui` 로 넘긴다
- **수치** = `src/data/*.csv` — 기획서는 키 이름만 가리킨다
- 어느 문서를 먼저 고치는지의 표는 [DEV_PLAN.md](docs/client/DEV_PLAN.md) §7

---
*마지막 업데이트: 2026-08-28 (`eso/` 행 추가 — `eso_reference.md` 폐기 후 폴더 3분리 이관) · 2026-08-28 (`dungeonvillage2/` 행 추가) · 2026-08-28 (`diablo4/` 행 추가) · 2026-08-28 (`aion/` 행 추가) · 2026-08-27 (최초 작성)*
