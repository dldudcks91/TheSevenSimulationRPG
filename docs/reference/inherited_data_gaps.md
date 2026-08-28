# TheSevenRPG 데이터 포크 — 범위와 갭

> 상태: 1차 포크 완료 · 갭 미해결
> 작성일: 2026-08-21

GAME_DESIGN.md §9 미확정 항목 **"TheSevenRPG CSV fork 범위/시점"**에 대한 답.

> **가장 중요한 발견**: 계승분에 **마법 공격이 존재하지 않는다** (G3). 확정된 직업 3종 중 마법사가 데이터상 성립하지 않음.

## 1. 포크 결과

원본: `TheSevenRPG/fastapi/meta_data/` → 사본: `src/data/inherited/` (**25개 CSV, 스키마 무변환 통째 복사**)

- **무변환 원칙**: 컬럼명·id·값 그대로. 우리 쪽 해석은 로더/로직에서 하고 CSV는 건드리지 않는다
- 이유: 원본이 갱신되면 폴더 통째 재복사로 재동기화 가능. 변환을 CSV에 새기면 그 경로가 막힌다
- `src/data/*.csv` (신규 5종: balance / sin_types / classes / traits / hero_names)와 폴더로 분리 — **계승분과 신규분의 경계를 파일 위치로 표시**

### 계승분에 실제로 들어있는 것

| 영역 | 파일 | 규모 |
|---|---|---|
| 장비 베이스 | equipment_base | 39 (무기 15 / 갑옷·투구·장갑·신발 각 6) |
| 죄종 접사 | equipment_prefix, equipment_suffix | 각 35 = **7죄종 × 5장비타입** (빈틈 없음) |
| 공통 접사 | equipment_common_option | 70 |
| 세트 브레이크포인트 | equipment_set_bonus | 17 |
| 희귀도 | equip_rarity_config | 4 (매직/레어/크래프트/유니크) |
| 드롭 | equip_drop_rate, monster_drop_config, monster_drop_equipment, unique_drop_rate, stigma_drop_config, gold_drop_config | mlvl 구간별 테이블 |
| 몬스터 | monster_info, chapter_monster_pool, spawn_grade_config, elite_trait, card_skill | 94 몬스터 / 타입 3종 / 등급 4단계 / 정예 특성 23 |
| 스테이지 | stage_info, chapter_info | 94 웨이브 / 7챕터 |
| 기타 | level_exp_table(50), status_effect(7), collection_group(+bonus) | |

## 2. 해결해야 할 갭

### G1. 유니크 데이터가 **비어 있음** (심각)
`equipment_unique.csv`는 **헤더만 있고 0행**. 반면 `equip_rarity_config`·`unique_drop_rate`는 유니크를 전제로 이미 설정돼 있음.
→ GAME_DESIGN §2 니즈 4("긴 체이스")의 목표물이 통째로 없는 상태. **우리가 새로 설계해야 함.**

### G2. 장비 스탯 어휘 ↔ 영웅 7스탯 불일치
접사가 참조하는 능력치는 `str`, `dex` **2종뿐** (common_option 기준). 본작 영웅은 7스탯(힘/민첩/지능/건강/감각/통솔/매력).
→ 지능·건강·감각·통솔·매력을 올려주는 접사가 계승분에 **존재하지 않음**. 마법사 직업이 장비로 지능을 못 얻는다.
→ 선택: (a) 공통 접사에 5종 추가 (접사 풀 희석 주의 — 니즈 1) / (b) 7스탯을 장비 축에서 빼고 파생 수치로만 굴림
→ **[해소 2026-08-22] (b) 채택 — 그리고 한 발 더 나갔다.** 5종을 추가하지 않는 데 그치지 않고, **기존 `str`/`dex`까지 걷어낸다.** 장비는 기본 능력치에 일절 기여하지 않고(`[balance.csv:attr_equip_bonus]` = 0) **전투 능력치만** 준다 (`combat_stat.csv` 27종).
→ 근거: 기본 능력치 범위가 `hero_attr_min~max`(1~20)라 장비가 +n을 주면 개체차와 파견 배치 결정이 붕괴 (hero_design.md §4-2). **[갱신 2026-08-23] 요구치 게이트 자체가 폐지**되어 근거에서 빠졌으나 결론은 동일
→ 조치: `equipment_option_override.csv` — `str`/`dex` 공통옵션 **10행 exclude**, 오만 `all_stats` 접사 **4행 replace_provisional**
→ **이 갭은 결함이 아니라 신호였다.** 계승분의 접사 어휘가 파생 수치 일색이었던 것은 원작이 이미 "장비는 파생 수치를 준다"를 지키고 있었다는 뜻이고, `str`/`dex`·`all_stats`만 그 규칙을 어긴 이물질이었다

### G3. 무기군이 **전부 물리 근접** — 마법사가 들 무기가 없음 (심각)
무기 15종 = 검/대검/도끼/창/둔기 5군 × 3사이즈. **지팡이·완드·활·석궁 없음.**
`magic_defense`·`magic_resist`는 존재하지만 **마법 "공격" 개념이 데이터에 아예 없다** (원작이 물리 근접 1:1 전투였기 때문).
→ GAME_DESIGN §4-2가 확정한 직업 3종 중 **마법사가 성립하지 않는다.**
→ §9 미확정 항목 "직업 3종의 무기군 배정"이 이 갭의 해결책이며, **아이템 설계보다 먼저 와야 하는 순서**임이 드러남
→ **[방향 확정 2026-08-21]** 직업 7종 + 무기군 배정 확정 (hero_design.md §2) — 신규 무기군 지팡이·활(본편), 단검·낫?(확장). 마법사 기본 공격 = 지팡이 기본 마법 공격 (battle_design.md §4). 베이스/Implicit/마법 공격 수치 **데이터 작성은 미착수**
→ **[몬스터 측 해결 2026-08-22]** 이 갭에는 **반대편 절반**이 있었다. 몬스터도 마법 공격을 하지 않아 **영웅의 마법방어가 사문화**돼 있었고, `Lich`(마법 극대)·`Imp`(빠른 마법)·`Succubus`(디버프)·`Ghost`(물방↓마방↑) 4개 베이스의 컨셉이 데이터에 존재하지 않았다. `monster.csv:attack_type`(physical/magic) 신설로 해결 — monster_design.md §2, battle_design.md §2-1. **남은 것은 영웅 측 데이터**(지팡이·활 베이스와 Implicit, 마법 피해 수치)뿐이다

### G3-b. 슬롯 개편으로 생긴 신규 갭 (2026-08-21 · 슬롯 수 갱신 2026-08-25)
부위가 5종 → **8종**, 슬롯이 5 → **9개**(반지 ×2)로 늘었으나(item_design.md) 계승 데이터는 5부위 기준이다.
- `equipment_base.csv`: 보조/목걸이/반지 **베이스 0개**
- `equipment_prefix/suffix.csv`: 7죄종 × 5부위 = 35/35 — **신규 3부위 죄종 접사 0개**
- `equipment_common_option.csv`: 70개 전부 5부위로 태깅 — 신규 3부위 공통 접사 0개
- `monster_drop_equipment.csv`: 드롭 부위 컬럼이 `무기/갑옷/투구/장갑/신발` 5개뿐 → **신규 3부위는 드롭 경로 자체가 없다**
→ 신규 3부위는 화면에만 존재하고 데이터에는 없는 상태. 접사·베이스·드롭 테이블 3곳을 같이 채워야 성립한다. **반지는 슬롯이 2개라 같은 풀에서 2회 굴리므로 반지 베이스·접사 수요가 다른 부위의 2배**다.

### G4. 세트 브레이크포인트 4칸 미작성
- 나태 4/6 = `pending` 명시
- 오만 2/4 = **행 자체 없음**
- 폭식 = 2(과식 패널티)만 있고 4/6 없음
→ 21칸 중 17칸. 죄종 매핑 확정(`sin_mapping.md`) 때 같이 채워야 함
→ **[갱신 2026-08-21]** 브레이크포인트 자체가 **3/6/9로 재조정 확정** (item_design.md §1) — 계승 CSV 무수정, 신규 세트 테이블로 오버라이드. 빈칸 4칸도 그 테이블에서 작성

### G5. 코스트 폐지 결정과 잔재 (2026-08-21 결정 로그)
- `equipment_base.cost_size_multiplier`, `equip_rarity_config.base_cost`, common_option의 `cost_reduction` 접사
→ **CSV는 그대로 두고 로직에서 무시**. `cost_reduction` 접사는 드롭 풀에서 제외 필요 (안 하면 죽은 옵션이 굴러나옴)
→ **[해소 2026-08-22] `cost_reduction` 5행을 `equipment_option_override.csv` 에 exclude 등재.** G2 조치와 같은 테이블에서 처리됐다. `cost_size_multiplier`·`base_cost` 컴럼은 계속 무시(무변환 원칙)

### G6. 1:1 전투 전제 (GAME_DESIGN §9 기재 항목과 동일)
`stage_info`는 `wave` 컬럼으로 웨이브당 **몬스터 1마리**(monster_idx 단수)를 지정 — 원작이 1:1이었기 때문.
→ 파티 3인 전투로 재해석 시 웨이브당 다수 몬스터가 필요. `spawn_grade_config.battle_time_target`(일반 14초/정예 28초/챕보 300초)이 밸런스 기준선으로 쓸 수 있음
→ **[방향 확정 2026-08-21]** 스테이지 구조 확정 (base_expedition_design.md §1-2 — 9라운드, 라운드당 1~3마리, 풀 시드 랜덤 구성). `stage_info`는 무변환 유지하고 **신규 스테이지 구조 테이블로 대체** (스키마 미정). `battle_time_target`은 라운드 전체 목표 시간으로 재해석, 몬스터 수치는 3인 파티 기준 재스케일

### G7. 죄종 접사 효과 ↔ 신규 `sin_types.affinity_stat` 충돌 가능
계승분은 죄종별 효과가 이미 확정돼 있음 (예: 분노=치명률/반사/HP%/치명타일격/회피).
반면 신규 `src/data/sin_types.csv`의 `affinity_stat`(영웅 죄종 → 7스탯 친화)은 **임시 1:1 배정**이며 계승분과 맞춰본 적 없음.
→ `sin_mapping.md` 확정 시 계승분을 기준으로 재조정. 그 전까지 `sin_types.csv`는 **placeholder**로 취급
→ **[갱신 2026-08-22]** 그 "7스탯" 어휘는 이제 `hero_attribute.csv`가 SSOT다. 죄종 친화가 가리킬 수 있는 것은 **기본 능력치 7종**(파견 판정용)이고, 전투 쪽 죄종 효과는 `combat_stat.csv` 어휘로 쓴다 — 두 층을 섞지 않는다

## 3. 미포크 (신규 설계 영역)

계승 원본이 없어 새로 만들 영역 — `src/data/` 루트. **2026-08-22 현재 9종 생성됨**, 나머지는 계획 상태:

| 파일 | 상태 | 이유 |
|---|---|---|
| balance.csv | **생성됨** (2026-08-21) | 파티/로스터/스테이지 구조 키 (party_size_max, roster_cap, concurrent_expedition_parties, rounds_per_stage, stages_per_chapter, wave_monster_max=전역 상한, advance_unlock_level) |
| monster.csv / stage.csv / stage_round.csv / round_budget.csv / spawn_grade.csv | **생성됨** (2026-08-22) | 몬스터·스테이지 신규 SSOT — 계승 monster_info/stage_info/spawn_grade_config/chapter_monster_pool 을 대체 (monster_design.md §7) |
| hero_attribute.csv | **생성됨** (2026-08-22) | 기본 능력치 7종 SSOT — 전투 계수 / 파견 배정 (hero_design.md §4-1). 게이트 컬럼은 2026-08-23 폐지로 삭제 |
| combat_stat.csv | **생성됨** (2026-08-22) | 전투 능력치 27종 SSOT — 장비·스킬이 주는 파생 수치 목록 (battle_design.md §8) |
| equipment_option_override.csv | **생성됨** (2026-08-22) | 계승 옵션 패치 테이블 — exclude 15행 / replace_provisional 4행 (G2·G5 조치) |
| classes.csv | 미생성 | 직업 7종(본편 5+확장 2)은 본작 신규 (hero_design.md §2) |
| traits.csv | 미생성 | TheSevenSimulation 21종에서 선별 예정 (§9 후순위) |
| hero_names.csv | 미생성 | 레어 영웅 이름 생성 규칙 (영웅 2층 구조 — 유니크는 고정 이름이라 해당 없음) |
| sin_types.csv | 미생성 | 죄종 → **기본 능력치 7종** 친화(파견 판정용). **G7 참조 — sin_mapping.md로 대체될 임시본** |
| heroes.csv | 미생성 | 유니크 영웅 15종 풀 SSOT (hero_design.md — 영웅 2층 구조) |

### G8. 몬스터 데이터 구조 결함 5종 (2026-08-22 발견·해결)

계승 몬스터/스테이지 데이터를 그대로 쓰면 깨지는 지점들. **전부 해결** — 상세는 monster_design.md §0.

| | 문제 | 조치 |
|---|---|---|
| G8-a | 마법 공격 부재 (G3의 몬스터 측 절반) | `attack_type` 신설 |
| G8-b | 등급 배율 이중 적용 — 보스 행이 절대값인데 `spawn_grade_config`에도 배율. Ch1은 ATK 배율 미적용, Ch2는 과적용 | `monster.csv` = 소재값 단독, 배율은 `spawn_grade.csv` 단독 |
| G8-c | "1스테이지=1타입" 규칙과 챕터 풀 랜덤이 충돌. 4스테이지 타입 미정의(`stage_type_order`가 3개뿐) | `stage.csv` 타입 고정 + 2단 랜덤 |
| G8-d | 등급 배율과 시간 예산이 한 테이블에 섞여 서로 어긋남. 챕터보스가 단독으로 런 예산 초과 | `spawn_grade.csv` / `round_budget.csv` 분리 |
| G8-e | `size_type` 미사용 | 보존 — 진형·타겟팅에서 결정 |

부수 정리: 공속 축 Ch1↔Ch2 단절 → `action_period`(초) 통일 · Ch5~7 스테이지보스 플레이스홀더 9종 명명 · Ch2~7 4스테이지 잡몹 0마리 → 챕터당 3종 신설 · dlvl 곡선 Ch5 이후 정체 → 단조 증가 재작성.

⚠ **원본 파일명 오류**: `TheSevenRPG/fastapi/public/assets/sprites/monster_1101.png` 는 이름과 달리 고블린 척후병(1101)이 아니라 **스켈레톤 전사** 그림이다 (`src/assets/inherited/faces/README.md`).


## 부록 A — 계승 옵션 치환 기록 (구 `equipment_option_override.csv` · 2026-08-28 폐기)

계승 접사 테이블(`equipment_common_option` · `equipment_prefix` · `equipment_suffix`)의 어느 행을 왜 빼거나 바꿨는지를 적어 두던 34행짜리 CSV 였다.
**코드가 읽은 적이 없다** — 계승 접사 테이블 자체가 아직 연결되지 않았기 때문이다(DEV_PLAN 부채 #16). 읽히지 않는 SSOT 를 두지 않기로 하면서(src/data/README.md 공통 규약) CSV 를 지우고 기록만 여기로 옮겼다.

**계승 접사 테이블을 실제로 연결할 때**(DEV_PLAN §5-B #7) 본작 접사 CSV 가 이 조치를 흡수한다 — 아래 `exclude` 는 애초에 옮기지 않고, `replace_provisional` 은 옮기면서 새 stat·범위로 적는다. 죄종 배정의 최종 확정은 `sin_mapping.md`.

| 테이블 | 키 | 조치 | 새 stat | 타입 | min | max | 사유 |
|---|---|---|---|---|---|---|---|
| `equipment_common_option` | `w04` | exclude | — | — | — | — | 장비는 기본 능력치를 주지 않는다 (힘) — 2026-08-22 |
| `equipment_common_option` | `a04` | exclude | — | — | — | — | 장비는 기본 능력치를 주지 않는다 (힘) — 2026-08-22 |
| `equipment_common_option` | `h04` | exclude | — | — | — | — | 장비는 기본 능력치를 주지 않는다 (힘) — 2026-08-22 |
| `equipment_common_option` | `g04` | exclude | — | — | — | — | 장비는 기본 능력치를 주지 않는다 (힘) — 2026-08-22 |
| `equipment_common_option` | `b04` | exclude | — | — | — | — | 장비는 기본 능력치를 주지 않는다 (힘) — 2026-08-22 |
| `equipment_common_option` | `w05` | exclude | — | — | — | — | 장비는 기본 능력치를 주지 않는다 (민첩) — 2026-08-22 |
| `equipment_common_option` | `a05` | exclude | — | — | — | — | 장비는 기본 능력치를 주지 않는다 (민첩) — 2026-08-22 |
| `equipment_common_option` | `h05` | exclude | — | — | — | — | 장비는 기본 능력치를 주지 않는다 (민첩) — 2026-08-22 |
| `equipment_common_option` | `g05` | exclude | — | — | — | — | 장비는 기본 능력치를 주지 않는다 (민첩) — 2026-08-22 |
| `equipment_common_option` | `b05` | exclude | — | — | — | — | 장비는 기본 능력치를 주지 않는다 (민첩) — 2026-08-22 |
| `equipment_common_option` | `w14` | exclude | — | — | — | — | 코스트 폐지로 사문화 (G5) — 2026-08-22 |
| `equipment_common_option` | `a14` | exclude | — | — | — | — | 코스트 폐지로 사문화 (G5) — 2026-08-22 |
| `equipment_common_option` | `h14` | exclude | — | — | — | — | 코스트 폐지로 사문화 (G5) — 2026-08-22 |
| `equipment_common_option` | `g14` | exclude | — | — | — | — | 코스트 폐지로 사문화 (G5) — 2026-08-22 |
| `equipment_common_option` | `b14` | exclude | — | — | — | — | 코스트 폐지로 사문화 (G5) — 2026-08-22 |
| `equipment_prefix` | `pride\|gloves` | replace_provisional | `crit_damage` | fixed | 10 | 60 | all_stats 폐기 — 오만의 증폭 성격을 치명타 피해로 번역. sin_mapping.md 에서 확정 |
| `equipment_prefix` | `pride\|boots` | replace_provisional | `fhr` | percentile | 5 | 30 | all_stats 폐기 — 오만의 불가침 성격을 상태이상 회복 속도로 번역 (상태이상 저항은 2026-08-25 삭제 → fhr 로 치환 2026-08-26). sin_mapping.md 에서 확정 |
| `equipment_suffix` | `pride\|gloves` | replace_provisional | `crit_damage` | fixed | 10 | 60 | all_stats 폐기 — 오만의 증폭 성격을 치명타 피해로 번역. sin_mapping.md 에서 확정 |
| `equipment_suffix` | `pride\|boots` | replace_provisional | `fhr` | percentile | 5 | 30 | all_stats 폐기 — 오만의 불가침 성격을 상태이상 회복 속도로 번역 (상태이상 저항은 2026-08-25 삭제 → fhr 로 치환 2026-08-26). sin_mapping.md 에서 확정 |
| `equipment_common_option` | `w03` | exclude | — | — | — | — | 명중 접사 폐지 — 적중은 레벨 차만으로 정해진다 (battle_design 9-4) — 2026-08-26 |
| `equipment_common_option` | `a03` | exclude | — | — | — | — | 회피 접사 폐지 — 피해 감소와 기대값이 같고 분산만 더한다 (battle_design 9-4) — 2026-08-26 |
| `equipment_common_option` | `h03` | exclude | — | — | — | — | 회피 접사 폐지 (battle_design 9-4) — 2026-08-26 |
| `equipment_common_option` | `g03` | exclude | — | — | — | — | 회피 접사 폐지 (battle_design 9-4) — 2026-08-26 |
| `equipment_common_option` | `b03` | exclude | — | — | — | — | 회피 접사 폐지 (battle_design 9-4) — 2026-08-26 |
| `equipment_prefix` | `wrath\|boots` | replace_provisional | `atk_speed` | percentile | 5 | 25 | 회피 폐지(9-4) 대체 — 분노의 몰아치는 성격을 행동 주기로 번역. sin_mapping.md 에서 확정 — 2026-08-26 |
| `equipment_prefix` | `sloth\|gloves` | replace_provisional | `damage_reduction` | percentile | 3 | 15 | 명중 폐지(9-4) 대체 — 나태의 버티는 성격을 피해 감소로 번역(원천별 곱 · 9-3). sin_mapping.md 에서 확정 — 2026-08-26 |
| `equipment_prefix` | `sloth\|boots` | replace_provisional | `hp_regen` | percentile | 10 | 60 | 회피 폐지(9-4) 대체 — stat_2(defense 감소)는 유지. sin_mapping.md 에서 확정 — 2026-08-26 |
| `equipment_prefix` | `gluttony\|boots` | replace_provisional | `life_steal` | percentile | 3 | 12 | 회피 폐지(9-4) 대체 — 폭식의 흡수 성격을 흡혈로 번역. sin_mapping.md 에서 확정 — 2026-08-26 |
| `equipment_prefix` | `lust\|helmet` | replace_provisional | `res_all` | percentile | 5 | 30 | magic_resist 는 전 원소 공통 저항이 되었고 단위가 소재값 -> 직접 %로 바뀌었다 (9-5). 범위를 % 스케일로 환산 — 2026-08-26 |
| `equipment_suffix` | `wrath\|boots` | replace_provisional | `atk_speed` | percentile | 5 | 25 | 회피 폐지(9-4) 대체 — 분노의 몰아치는 성격을 행동 주기로 번역. sin_mapping.md 에서 확정 — 2026-08-26 |
| `equipment_suffix` | `sloth\|gloves` | replace_provisional | `damage_reduction` | percentile | 3 | 15 | 명중 폐지(9-4) 대체 — 나태의 버티는 성격을 피해 감소로 번역(원천별 곱 · 9-3). sin_mapping.md 에서 확정 — 2026-08-26 |
| `equipment_suffix` | `sloth\|boots` | replace_provisional | `hp_regen` | percentile | 10 | 60 | 회피 폐지(9-4) 대체 — stat_2(defense 감소)는 유지. sin_mapping.md 에서 확정 — 2026-08-26 |
| `equipment_suffix` | `gluttony\|boots` | replace_provisional | `life_steal` | percentile | 3 | 12 | 회피 폐지(9-4) 대체 — 폭식의 흡수 성격을 흡혈로 번역. sin_mapping.md 에서 확정 — 2026-08-26 |
| `equipment_suffix` | `lust\|helmet` | replace_provisional | `res_all` | percentile | 5 | 30 | magic_resist 는 전 원소 공통 저항이 되었고 단위가 소재값 -> 직접 %로 바뀌었다 (9-5). 범위를 % 스케일로 환산 — 2026-08-26 |

---
*마지막 업데이트: 2026-08-28 (부록 A — 구 `equipment_option_override.csv` 34행 이관, CSV 폐기) · 2026-08-23 (게이트 폐지 반영 — G2 결론 유지, 근거만 축소)*
