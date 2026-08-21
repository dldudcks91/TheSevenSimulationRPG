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

### G3. 무기군이 **전부 물리 근접** — 마법사가 들 무기가 없음 (심각)
무기 15종 = 검/대검/도끼/창/둔기 5군 × 3사이즈. **지팡이·완드·활·석궁 없음.**
`magic_defense`·`magic_resist`는 존재하지만 **마법 "공격" 개념이 데이터에 아예 없다** (원작이 물리 근접 1:1 전투였기 때문).
→ GAME_DESIGN §4-2가 확정한 직업 3종 중 **마법사가 성립하지 않는다.**
→ §9 미확정 항목 "직업 3종의 무기군 배정"이 이 갭의 해결책이며, **아이템 설계보다 먼저 와야 하는 순서**임이 드러남
→ **[방향 확정 2026-08-21]** 직업 7종 + 무기군 배정 확정 (hero_design.md §4) — 신규 무기군 지팡이·활(본편), 단검·낫?(확장). 마법사 기본 공격 = 지팡이 기본 마법 공격 (battle_design.md §4). 베이스/Implicit/마법 공격 수치 **데이터 작성은 미착수**

### G3-b. 8부위 변경으로 생긴 신규 갭 (2026-08-21)
슬롯이 5 → 8로 늘었으나(item_design.md) 계승 데이터는 5부위 기준이다.
- `equipment_base.csv`: 보조/목걸이/반지 **베이스 0개**
- `equipment_prefix/suffix.csv`: 7죄종 × 5부위 = 35/35 — **신규 3부위 죄종 접사 0개**
- `equipment_common_option.csv`: 70개 전부 5부위로 태깅 — 신규 3부위 공통 접사 0개
- `monster_drop_equipment.csv`: 드롭 부위 컬럼이 `무기/갑옷/투구/장갑/신발` 5개뿐 → **신규 3부위는 드롭 경로 자체가 없다**
→ 8부위는 화면에만 존재하고 데이터에는 없는 상태. 접사·베이스·드롭 테이블 3곳을 같이 채워야 성립한다.

### G4. 세트 브레이크포인트 4칸 미작성
- 나태 4/6 = `pending` 명시
- 오만 2/4 = **행 자체 없음**
- 폭식 = 2(과식 패널티)만 있고 4/6 없음
→ 21칸 중 17칸. 죄종 매핑 확정(`sin_mapping.md`) 때 같이 채워야 함
→ **[갱신 2026-08-21]** 브레이크포인트 자체가 **3/6/9로 재조정 확정** (item_design.md §2) — 계승 CSV 무수정, 신규 세트 테이블로 오버라이드. 빈칸 4칸도 그 테이블에서 작성

### G5. 코스트 폐지 결정과 잔재 (2026-08-21 결정 로그)
- `equipment_base.cost_size_multiplier`, `equip_rarity_config.base_cost`, common_option의 `cost_reduction` 접사
→ **CSV는 그대로 두고 로직에서 무시**. `cost_reduction` 접사는 드롭 풀에서 제외 필요 (안 하면 죽은 옵션이 굴러나옴)

### G6. 1:1 전투 전제 (GAME_DESIGN §9 기재 항목과 동일)
`stage_info`는 `wave` 컬럼으로 웨이브당 **몬스터 1마리**(monster_idx 단수)를 지정 — 원작이 1:1이었기 때문.
→ 파티 3인 전투로 재해석 시 웨이브당 다수 몬스터가 필요. `spawn_grade_config.battle_time_target`(일반 14초/정예 28초/챕보 300초)이 밸런스 기준선으로 쓸 수 있음
→ **[방향 확정 2026-08-21]** 스테이지 구조 확정 (base_expedition_design.md §1-2 — 9라운드, 라운드당 1~3마리, 풀 시드 랜덤 구성). `stage_info`는 무변환 유지하고 **신규 스테이지 구조 테이블로 대체** (스키마 미정). `battle_time_target`은 라운드 전체 목표 시간으로 재해석, 몬스터 수치는 3인 파티 기준 재스케일

### G7. 죄종 접사 효과 ↔ 신규 `sin_types.affinity_stat` 충돌 가능
계승분은 죄종별 효과가 이미 확정돼 있음 (예: 분노=치명률/반사/HP%/치명타일격/회피).
반면 신규 `src/data/sin_types.csv`의 `affinity_stat`(영웅 죄종 → 7스탯 친화)은 **임시 1:1 배정**이며 계승분과 맞춰본 적 없음.
→ `sin_mapping.md` 확정 시 계승분을 기준으로 재조정. 그 전까지 `sin_types.csv`는 **placeholder**로 취급

## 3. 미포크 (신규 설계 영역)

계승 원본이 없어 새로 만들 영역 — `src/data/` 루트. **2026-08-21 현재 balance.csv만 실제 생성됨**, 나머지는 계획 상태:

| 파일 | 상태 | 이유 |
|---|---|---|
| balance.csv | **생성됨** (2026-08-21) | 파티/로스터/스테이지 구조 키 등재 (party_size_max, roster_cap, concurrent_expedition_parties, rounds_per_stage, stages_per_chapter, wave_monster_max) |
| classes.csv | 미생성 | 직업 7종(본편 5+확장 2)은 본작 신규 (hero_design.md §4) |
| traits.csv | 미생성 | TheSevenSimulation 21종에서 선별 예정 (§9 후순위) |
| hero_names.csv | 미생성 | 레어 영웅 이름 생성 규칙 (영웅 2층 구조 — 유니크는 고정 이름이라 해당 없음) |
| sin_types.csv | 미생성 | 죄종 → 7스탯 친화. **G7 참조 — sin_mapping.md로 대체될 임시본** |
| heroes.csv | 미생성 | 유니크 영웅 15종 풀 SSOT (hero_design.md — 영웅 2층 구조) |

---
*마지막 업데이트: 2026-08-21 (G3·G4·G6 방향 확정 반영 + 신규 CSV 현황 정정 — balance.csv만 생성됨)*
