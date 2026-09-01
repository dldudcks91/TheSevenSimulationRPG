# src/data — CSV (SSOT)

**수치는 전부 여기.** 코드 하드코딩 금지, 기획서엔 절대 수치 금지 — 기획서는 키 참조(`[balance.csv:key]`) · 체감 범위 · 공식 변수명 · 테이블 링크만.

- Godot / Unity 둘 다 그대로 읽는다 — **엔진별 포맷 변환 금지**
- **읽히지 않는 SSOT 는 두지 않는다** — 여기 있는 CSV 는 전부 `ui/data.js:FILES` 가 fetch 한다. 어긋나면 `dev/test.html` 의 `csv: 로더가 읽는 목록 = src/data/*.csv 전부` 단정이 빨간불

## 공통 규약 (2026-08-28 확정)

| 규약 | 내용 |
|---|---|
| **첫 컬럼 = id** | `key` · `stat_id` · `monster_idx` · `stage_id` · `chapter_id` · `grade` … |
| **표시 문자열은 `_kr`/`_en` 쌍** | `monster_name_kr`/`monster_name_en` · `stage_name_kr`/`stage_name_en` · `name_kr`/`name_en` · `grade_kr`/`grade_en` |
| **자유 서술은 `description_kr` 하나** | 파일당 **마지막 컬럼**. `note_kr`·`reason_kr` 같은 별칭을 쓰지 않는다 |
| **불리언은 `0`/`1`** | `face` · `bg` · `impl` · `knob`. `TRUE`/`FALSE` 문자열을 쓰지 않는다 |
| **없음은 `-`** | `attr` · `combat_stat` · `dispatch` · `element` · `effect_stat` … 파서는 빈 셀을 빈 문자열로 주므로 명시한다 |
| **리스트는 `\|`** | `classes` (`mage\|priest`) · `combat_stat` (`item_find\|gold_find`) · `dispatch` (`tavern\|trade`) · `tags` (`boost\|sacrifice`) |
| **파생 가능한 것은 컬럼으로 두지 않는다** | `skill.csv` 의 `광역`·`단일`·`다단히트` 는 `target`·`hits` 에서 나오므로 `tags` 에 적으면 **로드가 실패한다**. `mastery_node.csv` 에 노드 이름 컬럼이 없는 것도 같은 이유(`stat` 이 답이다) |
| **다른 CSV 의 키를 가리킬 땐 `_key` 접미사** | `mastery_node.csv` 의 `value_key`·`max_rank_key`·`unlock_key` → `balance.csv` 의 `key`. 수치를 두 곳에 적지 않기 위한 규약 |
| **확정 여부는 컬럼으로** | `balance.csv` 의 `status`(`fixed`/`proposed`). 설명문에 `⚠제안값` 을 적지 않는다 — 기계가 못 읽는다 |
| **표 전체가 제안이면 행마다 적지 않는다** | `skill.csv`(skill_design §9 — 값 전부 ⚠제안) · `codex_level.csv`(monster_design §8) · `spawn_grade.csv` · `round_budget.csv`. 확정되면 그때 `status` 컬럼을 준다 |

### 파서 계약 (`game_logic/csv.js`)

- 첫 줄 = 헤더. **셀에 쉼표·따옴표를 쓰지 않는다** — 이스케이프 규칙이 없다. 설명 컬럼도 마찬가지고, 영문 이름에 쉼표가 필요하면 다른 표현으로 바꾼다
- 숫자로 읽히는 셀은 **숫자**로 변환된다. `0`/`1` 불리언은 `=== 1` 로 비교한다
- 빈 셀은 빈 문자열이다 — `=== 0` 이 아니라 `undefined`/`''` 를 다뤄야 한다

## 파일 (22종 — 로더가 전부 읽는다)

| 파일 | 행 | 내용 |
|---|---|---|
| `balance.csv` | 107 | `key,value,status,knob,description_kr`. `status=fixed` 17(기획 확정) / 나머지 `proposed` · `knob=1` 48 = [`src/dev/README.md`](../dev/README.md) 의 밸런스 손잡이 표 (2026-08-30 재집계 — 마스터리 랭크값 29 가 08-28 로 손잡이에 들어왔는데 세지 않고 있었다) |
| `chapter.csv` | 7 | 챕터 id · 죄종 · 이름 `_kr`/`_en`. 몬스터 id 앞자리 = 챕터 (1101 → 1) |
| `stage.csv` | 28 | 스테이지 — 이름 `_kr`/`_en` · `bg`(계승 배경 자산 유무) · 타입 / dlvl / 보스 / 보스 등급 |
| `stage_round.csv` | 9 | 스테이지 내부 라운드 9개 구조 |
| `round_budget.csv` | 4 | 라운드 타입별 편성 상한 + 목표 전투시간 |
| `spawn_grade.csv` | 4 | 등급 배율 7축 — hp/atk/def/res_add/exp/gold/**`drop_chance_mult`**. 전 축이 등급순 단조 증가 |
| `monster.csv` | 112 | 몬스터 — 이름 `_kr`/`_en` · `face` · 분류 · **일반 등급 소재값**(보스 행도 같다) · 저항 4원소 직접 % |
| `weapon_group.csv` | 10 | 무기군(본편 8 + 확장 2) — 직업 전속(5직업 × 2) · **전부 양손**(2026-09-01 한손 개념 폐지로 `hands` 컬럼 삭제) · **`damage_kind`**(physical/magic) · 행동 주기 · 변동% · **`release`**(main/expansion) |
| `skill.csv` | 14 | 전직 액티브(08-27 판 · 전사 ③ 미정) — **`owner_kind,owner_id`** 가 출처(`job`/`advance`/`weapon_group`/`unique`) · 종류·타겟·타수·배율·감쇠·쿨·지속·원소·버프 스탯·발동 조건·`status`(코드 미독)·**`tags`(영문 id · `\|` 구분 최대 2 — `skill.js` 가 검증하고 전투는 안 읽는다. skill_design §11)**·우선순위 |
| `hero_attribute.csv` | 7 | 기본 능력치 7종 — 전투 계수(`combat_stat`) + 담당 파견처(`dispatch` — `mine`/`lab`/`forge`/`tavern\|trade`/`-`). 장비로 불변(`balance:attr_equip_bonus = 0`) |
| `combat_stat.csv` | 25 | 전투 능력치 — 장비·스킬·**마스터리** 파생. **`impl`** = `computeCombat` 이 실제로 내는가(1 = 21종 · 0 = 4종 — 08-28 `hp_regen`·`cooldown_reduction` 구현으로 둘이 넘어왔다). 캐릭터 시트는 `impl=1` 만 그린다. **`sheet_order`** = 그 시트의 **행 순서**(1~25 · 빠짐·중복 없음 — `impl=0` 행도 갖는다). **행 순서가 아니라 이 컬럼이 화면을 정한다** — 표시 순서를 바꾸려고 CSV 행을 옮기지 않는다(행 순서에 결정론이 걸린 표들과 헷갈리지 않게 · [SCREEN_DESIGN §6](../../docs/client/SCREEN_DESIGN.md)) |
| `mastery_node.csv` | 22 | **마스터리 노드** (skill_design §3 확정 08-28) — 죄종 T1 공통 3(`owner_id=*`) + 죄종 T2 16 + 전사 직업 T1 3. `tree_kind`(sin/class) · `tier` · `stat`(접사 채널 또는 `combat_stat` id) · **값은 `value_key`·`max_rank_key`·`unlock_key` 로 `balance.csv` 를 가리킨다**(수치를 여기 적지 않는다). 표시 이름은 `stat` 에서 파생하므로 컬럼이 없다. T3(반응형)는 값 미정이라 행이 없다 |
| `tactic_slot.csv` | 7 | **파티 전술의 칸** (tactic_card_design §5 확정 08-30) — `unlock_total_level`(로스터 **합산 레벨** 문턱 · 오름차순) · `reroll_cost_gold`. **칸 수 = 행 수** — 코드가 칸을 세지 않는다 |
| `tactic_option.csv` | 22 | **파티 전술의 옵션** — 「조건 → 효과」 1행. `cond_kind`(어휘 8종은 `tactic.js` — `two_hand` 은 2026-09-01 폐지) + `cond_arg`(죄종 / `physical\|magic` / 스킬 태그) + `cond_n` · `stat`(접사 채널 또는 `combat_stat` id) + `value`. 표시 이름은 `stat` 에서 파생하므로 컬럼이 없다(`mastery_node.csv` 와 같은 이유). **행 수 > `tactic_slot.csv` 행 수**여야 리롤이 성립한다 |
| `codex_level.csv` | 4 | 도감 레벨별 필요 카드 수(**`cards_to_next`** — 누적 아님) + 레벨별 보정 `bonus_pct` |
| `codex_series.csv` | 4 | 스테이지 번호 → 도감 계열 스탯 (1 공격 / 2 체력 / 3 **명중 — 폐지돼 갈 곳 없음** / 4 피해) |
| `class.csv` | 7 | **직업** (hero_design §2) — 본편 5 + 확장 2. `key_attr` = 이 직업을 미는 기본 능력치(생성 굴림이 이 축을 최고치로 민다) · `release`(main/expansion — `weapon_group.csv` 와 같은 어휘. `stage` 는 스테이지를 뜻해 안 쓴다). 무기군은 여기 없다 — 직업 전속 배정은 `weapon_group.csv:classes` 가 SSOT. **행 순서 = 표시 순서** |
| `equip_slot.csv` | 8 | **장비 부위 7 + 착용 위치 8을 한 표로** (item_design §1 · 반지 ×2 · 2026-09-01 보조 삭제). `slot_order` = 착용 위치 순서(세이브 `equipped` 의 키) · `part_order` = 부위 순서(`ring2` 는 `ring1` 과 같은 부위라 `-`). 드롭·접사·필터는 **부위**, 페이퍼돌·`equipped` 는 **위치**. ⚠ 부위 순서가 드롭 굴림의 결정론에 걸린다 |
| `item_base.csv` | 24 | **아이템 베이스 이름** — 6부위 × 4 (2026-09-01 보조 4행 삭제). **무기는 없다**(무기의 베이스는 무기군 자체 = `weapon_group.csv`). 이름 조립은 `game_logic/naming.js`. ⚠ 부위별 행 순서가 결정론에 걸린다 · 수치 근거 없는 임시 이름 풀이다 |
| `affix.csv` | 19 | **접사 정의** — 첫 컬럼 `stat`(= `combat_stat.csv` 의 축, **그 자체가 id** — 별도 `affix_id` 를 두지 않는다: 파생 컬럼 금지) + 굴림 범위 + **`scale` 3분류**(item_design §2-1): `growth` 굴림 × 성장 곡선(공격력·HP flat) / `band` 굴림 + ilvl × `per_ilvl`(물리 방어 — **`per_ilvl` 은 이 행들만**) / `flat` 굴림 그대로 ilvl 무관(% · 저항 · 유틸 전부). `slots` = 붙을 수 있는 부위(`\|` 리스트). **여기 있는 축은 전부 전투에 실제로 걸린다** — 안 걸리는 접사는 넣지 않는다(거짓 선택지 금지). ⚠ 수치는 전부 프로토타입 임시값 · 행 순서가 결정론에 걸린다 |
| `hero_name.csv` | 24 | **레어 영웅 이름 풀** — 무한 생성이라 이름도 뽑는다 (hero_design §1). 유니크 15명은 고정 명단이라 여기 없다. ⚠ 행 순서가 결정론에 걸린다 |
| `hero_trait.csv` | 12 | **시작 특성 풀** — 영웅 1명당 1개, 반고정 생성의 세 번째 축(이름 + 메인 죄종 + 시작 특성). ⚠ **효과 미작성** — 지금은 이름표만 굴린다 (hero_design §3). 행 순서가 결정론에 걸린다 |

**⚠ 배열 순서가 곧 계약인 표들** — `equip_slot`(부위) · `item_base`(부위별) · `affix` · `hero_name` · `hero_trait` 는 코드가 `rng` 로 **인덱스를 굴린다**. 행을 재정렬하면 같은 시드가 다른 결과를 낸다 ([INTERFACE §5-2](../../docs/client/INTERFACE.md)). 행 추가는 **끝에** 한다.

**아직 CSV 가 아닌 것** — 죄종(`SINS`) · 정예 특성(`SIN_TRAITS`/`COMMON_TRAITS`) 셋은 `ui/mock.js` 에 남아 있다. 전부 죄종 매핑 미확정([GAME_DESIGN §10](../../docs/game_design/GAME_DESIGN.md))에 걸려 있다.

**삭제 — `equipment_option_override.csv` (2026-08-28)**: 34행짜리 계승 옵션 패치 기록으로, 코드가 읽은 적이 없다. 표는 [inherited_data_gaps.md 부록 A](../../docs/reference/inherited_data_gaps.md) 로 옮겼다.

## `inherited/` — TheSevenRPG 포크 25종 · **읽기 전용**

스키마 무변환, 재동기화 가능. `src/assets/art/backgrounds/` (4종) 도 같은 규칙 — 규격·재동기화는 그쪽 README. `src/assets/art/faces/` 는 신규 아트가 직접 들어가는 활성 폴더라 이 규칙에서 제외 (assets/art/README.md).

계승분을 바꿔야 하면 **수정하지 말고** 이 폴더(`src/data/`)에 신규 테이블을 만들어 **대체**하고, 무엇이 무엇을 대체했는지 문서에 남긴다.

- 대체 이력: [monster_design.md §7](../../docs/game_design/monster_design.md)
- 계승 데이터의 빈 구멍: [inherited_data_gaps.md](../../docs/reference/inherited_data_gaps.md)

---
*마지막 업데이트: 2026-09-01 (**한손 개념 폐지 · 무기군 재편 반영** — `weapon_group` 11 → 10행(`hands` 컬럼 삭제) · `equip_slot` 9 → 8행(부위 7 / 위치 8) · `item_base` 28 → 24행(보조 베이스 4 삭제) · `tactic_option` 23 → 22행(`opt_two_hand`) · `affix` 9행에서 `offhand` 제거(행 수는 19 그대로) · `balance` 107 → 106키(`two_hand_atk_mult` 폐기 · `weapon_atk_base` 2.3 → 3.34). 결정은 GAME_DESIGN §9 · 코드 반영은 DEV_PLAN R27) · 2026-09-01 (`combat_stat.csv:sheet_order` 컬럼 신설 — 캐릭터 시트의 행 순서를 명시값으로 꺼냈다. 대표값 3(물리 공격력·마법 공격력·최대 HP)이 머리로 올라오고 저항 4 + 최대 저항 증가가 한 칸에 모인다) · 2026-08-31 (**정리** — `affix.csv` 의 `affix_id` 컬럼 삭제(`stat` 과 19행 전부 동일하고 코드가 안 읽어 「파생 컬럼 금지」 위반이었다. 첫 컬럼 = `stat` 이 곧 id) · `combat_stat.csv:reflect_damage` 의 `fmt` 를 `n`→`pct` 로 정정(코드가 `dmg × reflect / 100` 이라 % 가 맞다)) · 2026-08-31 (**M7 mock→CSV 이관 6종 신설** — `class`·`equip_slot`·`item_base`·`affix`·`hero_name`·`hero_trait`. `ui/mock.js` 의 이식 차단 9항목이 3항목으로 줄었다 · **값을 하나도 바꾸지 않았다**(캘리브레이션 4행과 이관 시점 단정 135개가 전부 그대로) · 배열 순서가 결정론 계약이라는 주의문 추가) · 2026-08-30 (**`tactic_slot.csv`·`tactic_option.csv` 신설** — 파티 전술. 칸 수 = 행 수 · 옵션 값은 행에 직접(전역 손잡이가 아니라 개별 옵션 수치라 `balance.csv` 키를 만들지 않는다) · 표시 이름 컬럼 없음) · 2026-08-28 (**`mastery_node.csv` 신설 22행** — 마스터리 T1·T2 수치 노드 · 값은 `balance.csv` 키 참조 · 규약 2건 추가(파생 컬럼 금지 · `_key` 접미사) · `combat_stat.csv` `hp_regen`·`cooldown_reduction` impl 0→1) · 2026-08-28 (`skill.csv:tags` 컴럼 신설 — 영문 id · `|` 구분 최대 2 · 리스트 규약에 등재) · 2026-08-28 (CSV 형태 최적화 — 공통 규약 확정 · `chapter`·`codex_series` 신설 · `equipment_option_override` 폐기 · 13종 전부 로더 연결) · 2026-08-28 (skill.csv 08-27 판 14행으로 재작성 — 코드가 읽는다) · 2026-08-26 (skill.csv 등재 — 전직 액티브 15) · 2026-08-26 (CLAUDE.md 에서 분리)*
