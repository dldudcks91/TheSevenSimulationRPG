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
| **확정 여부는 컬럼으로** | `balance.csv` 의 `status`(`fixed`/`proposed`). 설명문에 `⚠제안값` 을 적지 않는다 — 기계가 못 읽는다 |
| **표 전체가 제안이면 행마다 적지 않는다** | `skill.csv`(skill_design §9 — 값 전부 ⚠제안) · `codex_level.csv`(monster_design §8) · `spawn_grade.csv` · `round_budget.csv`. 확정되면 그때 `status` 컬럼을 준다 |

### 파서 계약 (`game_logic/csv.js`)

- 첫 줄 = 헤더. **셀에 쉼표·따옴표를 쓰지 않는다** — 이스케이프 규칙이 없다. 설명 컬럼도 마찬가지고, 영문 이름에 쉼표가 필요하면 다른 표현으로 바꾼다
- 숫자로 읽히는 셀은 **숫자**로 변환된다. `0`/`1` 불리언은 `=== 1` 로 비교한다
- 빈 셀은 빈 문자열이다 — `=== 0` 이 아니라 `undefined`/`''` 를 다뤄야 한다

## 파일 (13종 — 로더가 전부 읽는다)

| 파일 | 행 | 내용 |
|---|---|---|
| `balance.csv` | 68 | `key,value,status,knob,description_kr`. `status=fixed` 13(기획 확정) / 나머지 `proposed` · `knob=1` 15 = [`src/dev/README.md`](../dev/README.md) 의 밸런스 손잡이 표 |
| `chapter.csv` | 7 | 챕터 id · 죄종 · 이름 `_kr`/`_en`. 몬스터 id 앞자리 = 챕터 (1101 → 1) |
| `stage.csv` | 28 | 스테이지 — 이름 `_kr`/`_en` · `bg`(계승 배경 자산 유무) · 타입 / dlvl / 보스 / 보스 등급 |
| `stage_round.csv` | 9 | 스테이지 내부 라운드 9개 구조 |
| `round_budget.csv` | 4 | 라운드 타입별 편성 상한 + 목표 전투시간 |
| `spawn_grade.csv` | 4 | 등급 배율 7축 — hp/atk/def/res_add/exp/gold/**`drop_chance_mult`**. 전 축이 등급순 단조 증가 |
| `monster.csv` | 112 | 몬스터 — 이름 `_kr`/`_en` · `face` · 분류 · **일반 등급 소재값**(보스 행도 같다) · 저항 4원소 직접 % |
| `weapon_group.csv` | 11 | 무기군(본편 9 + 확장 2) — 직업 전속 · 한손/양손 · **`damage_kind`**(physical/magic) · 행동 주기 · **`release`**(main/expansion) |
| `skill.csv` | 14 | 전직 액티브(08-27 판 · 전사 ③ 미정) — **`owner_kind,owner_id`** 가 출처(`job`/`advance`/`weapon_group`/`unique`) · 종류·타겟·타수·배율·감쇠·쿨·지속·원소·버프 스탯·발동 조건·`status`(코드 미독)·**`tags`(코드 미독 · 영문 id · `\|` 구분 최대 2 — skill_design §11)**·우선순위 |
| `hero_attribute.csv` | 7 | 기본 능력치 7종 — 전투 계수(`combat_stat`) + 담당 파견처(`dispatch` — `mine`/`lab`/`forge`/`tavern\|trade`/`-`). 장비로 불변(`balance:attr_equip_bonus = 0`) |
| `combat_stat.csv` | 25 | 전투 능력치 — 장비·스킬 파생. **`impl`** = `computeCombat` 이 실제로 내는가(1 = 19종 · 0 = 6종). 캐릭터 시트는 `impl=1` 만 그린다 |
| `codex_level.csv` | 4 | 도감 레벨별 필요 카드 수(**`cards_to_next`** — 누적 아님) + 레벨별 보정 `bonus_pct` |
| `codex_series.csv` | 4 | 스테이지 번호 → 도감 계열 스탯 (1 공격 / 2 체력 / 3 **명중 — 폐지돼 갈 곳 없음** / 4 피해) |

**삭제 — `equipment_option_override.csv` (2026-08-28)**: 34행짜리 계승 옵션 패치 기록으로, 코드가 읽은 적이 없다. 표는 [inherited_data_gaps.md 부록 A](../../docs/reference/inherited_data_gaps.md) 로 옮겼다.

## `inherited/` — TheSevenRPG 포크 25종 · **읽기 전용**

스키마 무변환, 재동기화 가능. `src/assets/inherited/` (배경 4 · CH1 얼굴 5) 도 같은 규칙 — 규격·재동기화는 그쪽 README.

계승분을 바꿔야 하면 **수정하지 말고** 이 폴더(`src/data/`)에 신규 테이블을 만들어 **대체**하고, 무엇이 무엇을 대체했는지 문서에 남긴다.

- 대체 이력: [monster_design.md §7](../../docs/game_design/monster_design.md)
- 계승 데이터의 빈 구멍: [inherited_data_gaps.md](../../docs/reference/inherited_data_gaps.md)

---
*마지막 업데이트: 2026-08-28 (`skill.csv:tags` 컴럼 신설 — 영문 id · `|` 구분 최대 2 · 리스트 규약에 등재) · 2026-08-28 (CSV 형태 최적화 — 공통 규약 확정 · `chapter`·`codex_series` 신설 · `equipment_option_override` 폐기 · 13종 전부 로더 연결) · 2026-08-28 (skill.csv 08-27 판 14행으로 재작성 — 코드가 읽는다) · 2026-08-26 (skill.csv 등재 — 전직 액티브 15) · 2026-08-26 (CLAUDE.md 에서 분리)*
