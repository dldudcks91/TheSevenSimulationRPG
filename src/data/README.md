# src/data — CSV (SSOT)

**수치는 전부 여기.** 코드 하드코딩 금지, 기획서엔 절대 수치 금지 — 기획서는 키 참조(`[balance.csv:key]`) · 체감 범위 · 공식 변수명 · 테이블 링크만.

- Godot / Unity 둘 다 그대로 읽는다 — **엔진별 포맷 변환 금지**
- **읽히지 않는 SSOT 는 두지 않는다** — 여기 있는 CSV 는 전부 `ui/data.js:FILES` 가 fetch 한다. 어긋나면 `dev/test.html` 의 `csv: 로더가 읽는 목록 = src/data/*.csv 전부` 단정이 빨간불

## 공통 규약 (2026-08-28 확정)

| 규약 | 내용 |
|---|---|
| **첫 컬럼 = id** | `key` · `stat_id` · `monster_idx` · `stage_id` · `chapter_id` · `grade` … |
| **표시 문자열은 `_kr`/`_en` 쌍** | `monster_name_kr`/`monster_name_en` · `stage_name_kr`/`stage_name_en` · `name_kr`/`name_en` · `grade_kr`/`grade_en` |
| **이름은 영어가 원본 — 한글은 직역** [2026-09-09 사용자 확정] | **아이템·스킬 이름**은 `_en` 을 먼저 짓고 `_kr` 은 **의역하지 않는다**. `Morning Star` → **모닝스타**(~~별철퇴~~) · `Long Bow` → **롱 보우**(~~장궁~~). 두 언어가 같은 물건을 가리킨다는 것이 눈으로 대조돼야 하고, 참고작 어휘와의 계보도 끊기지 않는다. ⚠ 적용 범위는 **아이템·스킬 이름**이다 — UI 문구(`i18n.js:STRINGS`)·몬스터·스테이지·영웅 이름은 이 확정에 없다. ⚠ **기존 데이터가 규칙을 어긴다** — `item_base.csv` 16행(~~날개 투구~~ → 윙드 헬름)·`skill.csv` 이름이 재작업 대상 |
| **자유 서술은 `description_kr` 하나** | 파일당 **마지막 컬럼**. `note_kr`·`reason_kr` 같은 별칭을 쓰지 않는다 |
| **불리언은 `0`/`1`** | `face` · `bg` · `impl` · `knob`. `TRUE`/`FALSE` 문자열을 쓰지 않는다 |
| **없음은 `-`** | `attr` · `combat_stat` · `dispatch` · `element` · `effect_stat` … 파서는 빈 셀을 빈 문자열로 주므로 명시한다 |
| **리스트는 `\|`** | `classes` (`mage\|priest`) · `combat_stat` (`item_find\|gold_find`) · `dispatch` (`tavern\|trade`) · `tags` (`boost\|sacrifice`) |
| **파생 가능한 것은 컬럼으로 두지 않는다** | `skill.csv` 의 `광역`·`단일`·`다단히트` 는 `target`·`hits` 에서 나오므로 `tags` 에 적으면 **로드가 실패한다**. `mastery_node.csv` 에 노드 이름 컬럼이 없는 것도 같은 이유(`stat` 이 답이다) |
| **다른 CSV 의 키를 가리킬 땐 `_key` 접미사** | `mastery_node.csv` 의 `value_key`·`max_rank_key`·`unlock_key` → `balance.csv` 의 `key`. 수치를 두 곳에 적지 않기 위한 규약 |
| **확정 여부는 컬럼으로** | `balance.csv` 의 `status`(`fixed`/`proposed`). 설명문에 `⚠제안값` 을 적지 않는다 — 기계가 못 읽는다 |
| **표 전체가 제안이면 행마다 적지 않는다** | `skill.csv`(skill_design §12-8 — **값 전부 미발행**이라 배율·타수·쿨·지속이 전부 ⚠임시) · `codex_level.csv`(monster_design §8) · `spawn_grade.csv` · `round_budget.csv`. 확정되면 그때 `status` 컬럼을 준다 |

### 파서 계약 (`game_logic/csv.js`)

- 첫 줄 = 헤더. **셀에 쉼표·따옴표를 쓰지 않는다** — 이스케이프 규칙이 없다. 설명 컬럼도 마찬가지고, 영문 이름에 쉼표가 필요하면 다른 표현으로 바꾼다
- 숫자로 읽히는 셀은 **숫자**로 변환된다. `0`/`1` 불리언은 `=== 1` 로 비교한다
- 빈 셀은 빈 문자열이다 — `=== 0` 이 아니라 `undefined`/`''` 를 다뤄야 한다

## 파일 (27종 — 로더가 전부 읽는다)

| 파일 | 행 | 내용 |
|---|---|---|
| `balance.csv` | 109 | `key,value,status,knob,description_kr`. `status=fixed` 17(기획 확정) / 나머지 `proposed` · `knob=1` 48 = [`src/dev/README.md`](../dev/README.md) 의 밸런스 손잡이 표 (2026-08-30 재집계 — 마스터리 랭크값 29 가 08-28 로 손잡이에 들어왔는데 세지 않고 있었다) |
| `chapter.csv` | 7 | 챕터 id · 죄종 · 이름 `_kr`/`_en`. 몬스터 id 앞자리 = 챕터 (1101 → 1) |
| `stage.csv` | 28 | 스테이지 — 이름 `_kr`/`_en` · `bg`(계승 배경 자산 유무) · 타입 / dlvl / 보스 / 보스 등급 |
| `stage_round.csv` | 9 | 스테이지 내부 라운드 9개 구조 |
| `round_budget.csv` | 4 | 라운드 타입별 편성 상한 + 목표 전투시간 |
| `spawn_grade.csv` | 4 | 등급 배율 7축 — hp/atk/def/res_add/exp/gold/**`drop_chance_mult`**. 전 축이 등급순 단조 증가 |
| `monster.csv` | 112 | 몬스터 — 이름 `_kr`/`_en` · `face` · 분류 · **일반 등급 소재값**(보스 행도 같다) · 저항 4원소 직접 % |
| `weapon_group.csv` | 10 | 무기군(본편 8 + 확장 2) — 직업 전속(5직업 × 2) · **전부 양손**(2026-09-01 한손 개념 폐지로 `hands` 컬럼 삭제) · **`damage_kind`**(physical/magic) · 행동 주기 · 변동% · **`release`**(main/expansion) |
| `skill.csv` | 22 | **직업 스킬 풀 5직업**(전사 5 · 기사 3 · 궁수 3 · 마법사 7 · 사제 4 — `owner_kind=job` · `owner_id` = 직업 id). **1스킬 = 1직업**이고 직업 사이에 안 겹친다 [사용자 확정 2026-09-08 · skill_design §12]. ~~무기군 전용 10행~~ 은 **무기군 고정 폐기**로 삭제됐다(2026-09-09) — 무기는 스킬의 **그릇**이라 제 행을 갖지 않고, 드롭 때 그 무기군의 **직업 풀**에서 하나를 굴려 `item.skill` 에 담는다. ⚠ **기획 37 중 22만 발행됐다** — 나머지 15(오오라 · 소환 · 「라운드 종료까지」 · 도트 · 평타 부여 · 적에게 거는 창 · 「양 옆의 아군」 · 가이드에로우 · 단일 힐)는 skill_design §7 미결이라 어휘가 없다 (DEV_PLAN R59). — **`owner_kind,owner_id`** 가 출처(`job`/`advance`/`unique` — `weapon_group` 은 2026-09-09 어휘에서 삭제) · 종류·타겟·타수·배율·감쇠·쿨·지속·원소·버프 스탯·발동 조건·`status`(코드 미독)·**`tags`(영문 id · `\|` 구분 최대 2 — `skill.js` 가 검증하고 전투는 안 읽는다. skill_design §11)**·우선순위 · **`icon`·`desc_kr`·`desc_en`**(플레이어 표시) · **`innate_pool`**(0/1 — 고유 풀 소속. 지금은 전 행이 1) · **`note`**(설계 노트 — 플레이어에게 안 보인다) | **액티브 3칸은 출처가 정한다**(고유 · 무기 · 전직 — skill_design §2). **두 출처(고유 · 무기)가 같은 직업 풀에서 하나씩** 가져간다(§12-1 규칙 3) — 고유는 영웅 생성 시, 무기는 드롭 시 굴린다. ⚠ **행 순서가 결정론에 걸린다**(INTERFACE §5-2).
| `skill_tag.csv` | 13 | **스킬 태그 어휘** — `tag_id` · 대분류 4(`damage`/`buff`/`debuff`/`other`) · `derived`(0/1 — 파생 3종 `aoe`/`single`/`multihit`) · 이름 ko/en. `skill.js` 가 어휘로 · `tactic_option.csv` 의 `skill_tag` 인자 · 화면 이름표 (skill_design §11 · 2026-09-01 — 종전 코드 배열) |
| `hero_attribute.csv` | 7 | 기본 능력치 7종 — 전투 계수(`combat_stat`) + 담당 파견처(`dispatch` — `mine`/`lab`/`forge`/`tavern\|trade`/`-`). 장비로 불변(`balance:attr_equip_bonus = 0`) |
| `combat_stat.csv` | 25 | 전투 능력치 — 장비·스킬·**마스터리** 파생. **`impl`** = `computeCombat` 이 실제로 내는가(1 = 21종 · 0 = 4종 — 08-28 `hp_regen`·`cooldown_reduction` 구현으로 둘이 넘어왔다). 캐릭터 시트는 `impl=1` 만 그린다. **`sheet_order`** = 그 시트의 **행 순서**(1~25 · 빠짐·중복 없음 — `impl=0` 행도 갖는다). **행 순서가 아니라 이 컬럼이 화면을 정한다** — 표시 순서를 바꾸려고 CSV 행을 옮기지 않는다(행 순서에 결정론이 걸린 표들과 헷갈리지 않게 · [SCREEN_DESIGN §6](../../docs/client/SCREEN_DESIGN.md)) |
| `mastery_node.csv` | 22 | **마스터리 노드** (skill_design §3 확정 08-28) — 죄종 T1 공통 3(`owner_id=*`) + 죄종 T2 16 + 전사 직업 T1 3. `tree_kind`(sin/class) · `tier` · `stat`(접사 채널 또는 `combat_stat` id) · **값은 `value_key`·`max_rank_key`·`unlock_key` 로 `balance.csv` 를 가리킨다**(수치를 여기 적지 않는다). 표시 이름은 `stat` 에서 파생하므로 컬럼이 없다. T3(반응형)는 값 미정이라 행이 없다 |
| `commission_kind.csv` | 2 | **의뢰의 유형** (GAME_DESIGN §9 확정 **09-07 — 목표형**) — **처치**(전투가 저절로 센다) · **수집**(드롭·파견·탐험 산출이 채운다). `rides_on` = 무엇이 목표를 채우는가(`battle`\|`yield`). ⚠ **09-08 전면 교체** — ~~4종(사냥·파견·약탈·보호)~~ 과 ~~`form`(세는 형/가는 형)~~ · ~~`channel`(실시간/오프라인)~~ 은 **「전장을 여는 의뢰」를 전제한 09-01 판**이라 09-07 개정으로 축째 소멸했다(약탈·보호는 탐험으로 이관). **이름과 「어떻게 도는가」 줄이 `_kr`/`_en` 쌍으로 여기 있다** — 화면은 i18n 이 아니라 이 표를 `L()` 로 푼다 (SCREEN_DESIGN §14 · DEV_PLAN R45) |
| `commission.csv` | 5 | **의뢰 게시판의 행** — ⚠ **표 전체가 임시 자리채움이다**(`mine_node.csv` 와 같은 처지). 목표·보상·명성이 기획 미정이라(GAME_DESIGN §10 「의뢰 세부」) 값이 전부 지어낸 것이고, **굴림이 생기면 이 표가 템플릿 표가 된다.** **칸 수 = 행 수** — 화면이 개수를 안 박는다(`tactic_slot` 과 같은 문법) |
| `tactic_slot.csv` | 7 | **파티 전술의 칸** (tactic_card_design §5 확정 08-30) — `unlock_total_level`(로스터 **합산 레벨** 문턱 · 오름차순) · `reroll_cost_gold`. **칸 수 = 행 수** — 코드가 칸을 세지 않는다 |
| `tactic_option.csv` | 66 | **파티 전술의 옵션** — 「조건 → 효과」 1행 × 등급 3단. ⚠ **행 전체가 임시 자리채움이다** — 나중에 더 창의적인 전술로 교체한다 (tactic_card_design §5-7). **`(option_id, grade)` 복합키** — `option_id` 가 가족(조건·스탯 고정) · `grade`(`common`/`magic`/`rare`) 가 `value` 만 가른다. **중복 방지·풀 크기는 가족 수(22)로 센다.** `cond_kind`(어휘 **6종**은 `tactic.js` — `two_hand` 은 2026-09-01, `party_size`·`damage_kind` 는 2026-09-02 폐지) + `cond_arg`(죄종 / 스킬 태그) + `cond_n` · `stat`(접사 채널 또는 `combat_stat` id) + `value`. 표시 이름은 `stat` 에서 파생하므로 컬럼이 없다(`mastery_node.csv` 와 같은 이유). **가족 수 > `tactic_slot.csv` 행 수**여야 리롤이 성립한다. (`tactic.js` 반영 완료 2026-09-02 — 로드 시 **3등급 완비 · 가족 안 조건·stat 동일 · 값 오름차순**을 검증하므로 이 표를 교체할 때 등급을 빠뜨리면 게임이 안 뜬다) |
| `codex_level.csv` | 4 | 도감 레벨별 필요 카드 수(**`cards_to_next`** — 누적 아님) + 레벨별 보정 `bonus_pct` |
| `codex_series.csv` | 4 | 스테이지 번호 → 도감 계열 스탯 (1 공격 / 2 체력 / 3 **명중 — 폐지돼 갈 곳 없음** / 4 피해) |
| `class.csv` | 7 | **직업** (hero_design §2) — 본편 5 + 확장 2. `key_attr` = 이 직업을 미는 기본 능력치(생성 굴림이 이 축을 최고치로 민다) · `release`(main/expansion — `weapon_group.csv` 와 같은 어휘. `stage` 는 스테이지를 뜻해 안 쓴다). 무기군은 여기 없다 — 직업 전속 배정은 `weapon_group.csv:classes` 가 SSOT. **행 순서 = 표시 순서** |
| `equip_slot.csv` | 8 | **장비 부위 7 + 착용 위치 8을 한 표로** (item_design §1 · 반지 ×2 · 2026-09-01 보조 삭제). `slot_order` = 착용 위치 순서(세이브 `equipped` 의 키) · `part_order` = 부위 순서(`ring2` 는 `ring1` 과 같은 부위라 `-`). 드롭·접사·필터는 **부위**, 페이퍼돌·`equipped` 는 **위치**. ⚠ 부위 순서가 드롭 굴림의 결정론에 걸린다 |
| `item_base.csv` | 24 | **아이템 베이스 이름** — 6부위 × 4 (2026-09-01 보조 4행 삭제). **무기는 없다**(무기의 베이스는 무기군 자체 = `weapon_group.csv`). 이름 조립은 `game_logic/naming.js`. ⚠ 부위별 행 순서가 결정론에 걸린다 · 수치 근거 없는 임시 이름 풀이다 |
| `affix.csv` | 19 | **접사 정의** — 첫 컬럼 `stat`(= `combat_stat.csv` 의 축, **그 자체가 id** — 별도 `affix_id` 를 두지 않는다: 파생 컬럼 금지) + 굴림 범위 + **`scale` 3분류**(item_design §2-1): `growth` 굴림 × 성장 곡선(공격력·HP flat) / `band` 굴림 + ilvl × `per_ilvl`(물리 방어 — **`per_ilvl` 은 이 행들만**) / `flat` 굴림 그대로 ilvl 무관(% · 저항 · 유틸 전부). `slots` = 붙을 수 있는 부위(`\|` 리스트). **여기 있는 축은 전부 전투에 실제로 걸린다** — 안 걸리는 접사는 넣지 않는다(거짓 선택지 금지). ⚠ 수치는 전부 프로토타입 임시값 · 행 순서가 결정론에 걸린다 |
| `hero_name.csv` | 24 | **레어 영웅 이름 풀** — 무한 생성이라 이름도 뽑는다 (hero_design §1). 유니크 15명은 고정 명단이라 여기 없다. ⚠ 행 순서가 결정론에 걸린다 |
| `hero_trait.csv` | 12 | **시작 특성 풀** — 영웅 1명당 1개, 반고정 생성의 세 번째 축(이름 + 메인 죄종 + 시작 특성). ⚠ **효과 미작성** — 지금은 이름표만 굴린다 (hero_design §3). 행 순서가 결정론에 걸린다 |
| `hero_tier.csv` | 3 | **영웅 등급 — 매직 / 레어 / 유니크** (hero_design §1 확정 2026-09-07 · 신설 09-08). 등급이 정하는 것은 **능력치 총합 대역(`attr_total_min/max`)과 분포 모양(`shape`)** 둘뿐이고 상한은 `[balance.csv:hero_attr_max]` 하나로 전 영웅 공통이다 — **등급은 출발선이지 천장이 아니다**. `weight` = 생성기의 등장 비중(**0 = 안 뽑는다** — 유니크는 수작업). 이름·색도 이 표가 든다(~~`ui/mock.js:HERO_TIER`~~ 대체 — 대역과 표기가 갈리면 SSOT 가 둘이 된다). ⚠ **대역·shape·weight 는 전부 ⚠제안** — 기획은 「겹치지 않는 두 구간」과 「레어=정규 / 매직=더 넓게」만 정했다 |
| `mine_node.csv` | 7 | **채광 갱도 — 단계 1~7** (⚠ **표 전체가 구조 검증용 자리채움이다**). `mine_id` = id · `tier` · `unlock_chapter` · 이름 `_kr`/`_en` · `ore_id`/`ore_name_kr`/`ore_name_en` · **`yield_per_hour`**(단계가 오를수록 **줄어든다** — 하위 단계가 「양」을 맡아 상위로 수렴하지 않는다). 값을 행에 직접 두는 것은 `tactic_option.csv` 와 같은 이유(전역 손잡이가 아니다). **죄종 컬럼을 두지 않는다** — 죄종 지정은 낙인의 자리다(item_design §5-1). ⚠ **`game_logic` 이 아직 안 읽는다** — 기획이 미확정이라(GAME_DESIGN §10 「광산 / 힘」) 로더·골든에만 걸려 있다 |

**⚠ 배열 순서가 곧 계약인 표들** — `equip_slot`(부위) · `item_base`(부위별) · `affix` · `hero_name` · `hero_trait` · **`skill`**(고유 스킬 풀 — 09-01) · **`hero_tier`**(등급 굴림 — 09-08) 은 코드가 `rng` 로 **인덱스를 굴린다**. 행을 재정렬하면 같은 시드가 다른 결과를 낸다 ([INTERFACE §5-2](../../docs/client/INTERFACE.md)). 행 추가는 **끝에** 한다.

**아직 CSV 가 아닌 것** — 죄종(`SINS`) · 정예 특성(`SIN_TRAITS`/`COMMON_TRAITS`) 셋은 `ui/mock.js` 에 남아 있다. 전부 죄종 매핑 미확정([GAME_DESIGN §10](../../docs/game_design/GAME_DESIGN.md))에 걸려 있다.

**삭제 — `equipment_option_override.csv` (2026-08-28)**: 34행짜리 계승 옵션 패치 기록으로, 코드가 읽은 적이 없다. 표는 [inherited_data_gaps.md 부록 A](../../docs/reference/inherited_data_gaps.md) 로 옮겼다.

## `inherited/` — TheSevenRPG 포크 25종 · **읽기 전용**

스키마 무변환, 재동기화 가능. `src/assets/art/backgrounds/` (4종) 도 같은 규칙 — 규격·재동기화는 그쪽 README. `src/assets/art/faces/` 는 신규 아트가 직접 들어가는 활성 폴더라 이 규칙에서 제외 (assets/art/README.md).

계승분을 바꿔야 하면 **수정하지 말고** 이 폴더(`src/data/`)에 신규 테이블을 만들어 **대체**하고, 무엇이 무엇을 대체했는지 문서에 남긴다.

- 대체 이력: [monster_design.md §7](../../docs/game_design/monster_design.md)
- 계승 데이터의 빈 구멍: [inherited_data_gaps.md](../../docs/reference/inherited_data_gaps.md)

---
*마지막 업데이트: 2026-09-09 (**이름은 영어가 원본 — 한글은 직역** [사용자 확정] — 공통 규약에 행 추가. 아이템·스킬 이름의 `_kr` 은 `_en` 의 직역이고 의역하지 않는다) · 2026-09-09 (**`skill.csv` 전면 재작성 — 24행 → 22행** [DEV_PLAN R59 · skill_design §12] — 무기군 전용 10행을 걷고 **직업 스킬 풀**(전사 5 · 기사 3 · 궁수 3 · 마법사 7 · 사제 4)로 갈았다. 「1스킬 = 1직업」이라 `owner_kind` 는 전부 `job` 이고 어휘에서 **`weapon_group` 이 빠졌다**(직업 · 전직 · 유니크 셋). 무기는 제 행 대신 **개체가 스킬을 담는다**(`item.skill` — 드롭 때 그 무기군의 직업 풀에서 1회 굴림 · 세이브 v18). ⚠ 기획 37 중 **22만 발행** — 나머지 15는 skill_design §7 미결이라 엔진 어휘가 없다. 행 수·`owner_kind` 어휘가 바뀌었으므로 `golden.json` `csvHash` 재촬영) · 2026-09-08 (**`hero_tier.csv` 신설 3행 · `commission_kind` 전면 교체 — CSV 26 → 27** [DEV_PLAN R48·R45] — `hero_tier` 는 영웅 3층(매직/레어/유니크)의 **굴림 파라미터와 표기를 한 표로** 든다(`ui/mock.js:HERO_TIER` 대체 — 대역과 이름이 갈리면 SSOT 가 둘이 된다). ⚠ 대역·shape·weight 는 전부 ⚠제안. `commission_kind` 는 **4행 → 2행**(사냥·파견·약탈·보호 → 처치·수집)이고 `form`·`channel` 두 축이 **`rides_on` 하나로** 줄었다 — 09-07 목표형 개정으로 「가는 형」이 소멸했고 그 판을 화면이 계속 그리고 있었다. `commission` 7행 → 5행. `balance.csv` — `hp_regen_base_per_level` 신설 · `hero_attr_total` **폐기**(등급 테이블로 이관)) · *마지막 업데이트: 2026-09-03 (**`commission_kind.csv`·`commission.csv` 신설** [사용자 지시] — 의뢰 데이터가 `ui/mock.js:COMMISSIONS` 에서 CSV 로 왔다(「mock 과 CSV 가 겹치면 CSV 만」). **두 표의 지위가 다르다** — `commission_kind`(4행)는 종류 4종이라 **확정 기획**이고, `commission`(7행)은 목표·보상이 미정이라 **⚠임시**(`mine_node` 와 같은 처지). `form`(count/go)·`channel` 이 「세는 형 / 가는 형」을 데이터로 들고, 이름·「어떻게 도는가」는 `_kr`/`_en` 쌍이라 i18n 이 아니라 이 표가 SSOT 다. **칸 수 = 행 수**(`tactic_slot` 문법). CSV 24 → **26** · `golden.json` `csvHash` 2키 추가(PASS 182/182 유지 · 40런 불변). SCREEN_DESIGN §14 · DEV_PLAN 부채 #31) · 2026-09-03 (**`skill.csv` 14 → 22행** — 액티브 3칸이 출처 고정(고유·무기군·전직)이 되면서 기존 14행의 `owner_kind` 를 `job` → **`advance`**(문서가 이미 「전직 액티브 프로토타입 임시분」으로 규정한 것) · **무기군 8행 ⚠임시 신설**(본편 무기군 8종 각 1 · 값은 자리채움 · `innate_pool=0` 으로 고유 풀 불변). DEV_PLAN R35) · *마지막 업데이트: 2026-09-03 (**`mine_node.csv` 신설 7행** — 채광 갱도 1~7단계 ⚠임시. 단계는 **열리는 순서**(챕터 해금)만 정하고 무엇을 캘지는 레시피가 정한다 · `yield_per_hour` 가 단계마다 줄어 하위가 안 죽는다 · 죄종 컬럼 없음(낙인 보호). CSV 23 → **24** — 헤딩의 「22종」은 `skill_tag` 신설분을 안 세던 오기였다. `ui/data.js:FILES` 등록 + `golden.json` `csvHash` 1키 추가(단정 PASS 178/178 유지). ⚠ 기획 미확정 — GAME_DESIGN §10 「광산 / 힘」) · 2026-09-01 (**`tactic_option.csv` 등급 3단 — 22 → 66행** — `grade` 컬럼 신설로 **`(option_id, grade)` 복합키**가 됐다(가족 22 × 일반/매직/레어). ⚠ **값도 구성도 임시 자리채움**이고 나중에 더 창의적인 전술로 교체한다 · 각 행 `description_kr` 에 `⚠임시` 표기 · 폐기분 3행 삭제(`opt_full_party`·`opt_magic_line`·`opt_phys_line`) · 경제 효과 2행 대체(`gold_find`→`crit_damage` · `item_find`→`res_reduction`) · ⚠ **코드 미반영** — `tactic.js` 로더가 `grade` 를 모른다. 결정은 tactic_card_design §5-5 · §5-7) · 2026-09-01 (**스킬 CSV 이관** — `skill.csv` 컬럼 5(`icon`·`desc_kr`·`desc_en`·`innate_pool`·`note` — 옛 `description_kr` 개명) · **`skill_tag.csv` 신설 13행**(태그 어휘·이름 ko/en — 코드 배열·i18n 에서 이관) · `balance.csv` **`skill_cd_floor_mult`**(쿨감 바닥 — 코드 상수 `CD_MIN_MULT` 이관 · 손잡이 49). CSV 22 → **23**) · 2026-09-01 (**`skill.csv` 가 고유 스킬 풀을 겸한다** — 영웅 생성 시 전 행에서 1개를 굴리므로 행 순서가 결정론에 걸린다(순서 계약 표에 추가). `balance.csv:active_slots` 설명 갱신. 행 수·값 불변) · 2026-09-01 (**한손 개념 폐지 · 무기군 재편 반영** — `weapon_group` 11 → 10행(`hands` 컬럼 삭제) · `equip_slot` 9 → 8행(부위 7 / 위치 8) · `item_base` 28 → 24행(보조 베이스 4 삭제) · `tactic_option` 23 → 22행(`opt_two_hand`) · `affix` 9행에서 `offhand` 제거(행 수는 19 그대로) · `balance` 107 → 106키(`two_hand_atk_mult` 폐기 · `weapon_atk_base` 2.3 → 3.34). 결정은 GAME_DESIGN §9 · 코드 반영은 DEV_PLAN R27) · 2026-09-01 (`combat_stat.csv:sheet_order` 컬럼 신설 — 캐릭터 시트의 행 순서를 명시값으로 꺼냈다. 대표값 3(물리 공격력·마법 공격력·최대 HP)이 머리로 올라오고 저항 4 + 최대 저항 증가가 한 칸에 모인다) · 2026-08-31 (**정리** — `affix.csv` 의 `affix_id` 컬럼 삭제(`stat` 과 19행 전부 동일하고 코드가 안 읽어 「파생 컬럼 금지」 위반이었다. 첫 컬럼 = `stat` 이 곧 id) · `combat_stat.csv:reflect_damage` 의 `fmt` 를 `n`→`pct` 로 정정(코드가 `dmg × reflect / 100` 이라 % 가 맞다)) · 2026-08-31 (**M7 mock→CSV 이관 6종 신설** — `class`·`equip_slot`·`item_base`·`affix`·`hero_name`·`hero_trait`. `ui/mock.js` 의 이식 차단 9항목이 3항목으로 줄었다 · **값을 하나도 바꾸지 않았다**(캘리브레이션 4행과 이관 시점 단정 135개가 전부 그대로) · 배열 순서가 결정론 계약이라는 주의문 추가) · 2026-08-30 (**`tactic_slot.csv`·`tactic_option.csv` 신설** — 파티 전술. 칸 수 = 행 수 · 옵션 값은 행에 직접(전역 손잡이가 아니라 개별 옵션 수치라 `balance.csv` 키를 만들지 않는다) · 표시 이름 컬럼 없음) · 2026-08-28 (**`mastery_node.csv` 신설 22행** — 마스터리 T1·T2 수치 노드 · 값은 `balance.csv` 키 참조 · 규약 2건 추가(파생 컬럼 금지 · `_key` 접미사) · `combat_stat.csv` `hp_regen`·`cooldown_reduction` impl 0→1) · 2026-08-28 (`skill.csv:tags` 컴럼 신설 — 영문 id · `|` 구분 최대 2 · 리스트 규약에 등재) · 2026-08-28 (CSV 형태 최적화 — 공통 규약 확정 · `chapter`·`codex_series` 신설 · `equipment_option_override` 폐기 · 13종 전부 로더 연결) · 2026-08-28 (skill.csv 08-27 판 14행으로 재작성 — 코드가 읽는다) · 2026-08-26 (skill.csv 등재 — 전직 액티브 15) · 2026-08-26 (CLAUDE.md 에서 분리)*
