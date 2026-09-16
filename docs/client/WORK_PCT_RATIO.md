# 작업 지시 — 퍼센트를 비율(소수)로 통일

> **임시 문서다.** 이 작업이 끝나면 지운다 — 남는 기록은 `GAME_DESIGN.md` §9 한 줄 · `DEV_PLAN.md` §3-3 R111 · `src/data/README.md` 의 단위 규약이다.
> 지시: 사용자 (2026-09-16) — 「우리 게임에서 퍼센트 관련 모든 데이터를 소수점으로 들어가도록 전수조사해서 적용」
> 조사: 같은 날 서브에이전트 둘(데이터 · 코드). **아래 줄 번호는 조사 시점 기준이라 실행 전에 반드시 다시 확인한다.**

---

## 0. 지금 상태 — 시작하기 전에 읽는다

- **이 게임에 0~1 비율로 저장된 값은 하나도 없다.** 퍼센트는 전부 0~100 눈금이고, 코드가 일관되게 `값 / 100` 으로 쓴다. 그래서 이 작업은 **눈금 규약을 한 번에 갈아 끼우는 일**이다.
- **절반만 바꾸면 조용히 틀린다.** 같은 채널(예: 치명타 확률)이 여섯 파일에 흩어져 있고 코드가 그것들을 그냥 더한다. **파일 단위가 아니라 채널 단위로, 한 커밋에** 바꾼다.
- 이미 적용된 선례가 하나 있다 — `[balance.csv:stagger_hp_pct]` = 0.05 (물리 경직 문턱 · 2026-09-16). **이 키는 아직 코드가 읽지 않는다.**

## 1. 먼저 사용자에게 받아야 하는 결정 셋

**이 셋이 정해지기 전에는 코드·CSV 를 건드리지 않는다.** 셋 다 「값의 뜻」이 바뀌는 결정이다.

**① 「장비 옵션 값은 정수」 규칙을 어떻게 고치나** — 2026-09-16 확정(§9 · DEV_PLAN R107)과 정면으로 부딪힌다.
- 지금: 옵션 값을 정수로 반올림한다. 치명타 확률 접사 `2~5`(=2~5%).
- 비율로 바꾸면 `0.02~0.05` 인데, 정수로 반올림하면 **전부 0** 이 되고 코드가 하한 1 로 올려 **모든 퍼센트 옵션이 100% 가 된다.**
- 제안: 규칙을 **「소수 둘째 자리까지(= 1% 단위) 반올림」**으로 바꾼다. 플레이어가 보는 것은 그대로 「1% 단위」다.

**② 배율형 값(100 = 1배)도 같이 바꾸나**
- 해당: `skill.csv:mult_pct`(310 = 3.1배) · `skill.csv:proc_mult_pct`(200) · `[balance.csv:base_crit_damage_pct]`(150) · `[balance.csv:hit_base_pct]`(100) · `hero_attribute.csv:mult_base_pct`(100 · **vit 만 20**).
- 바꾸면 값이 0~1 이 아니라 **1.5 · 3.1** 이 된다(비율이 아니라 배수).
- 제안: **같이 바꾼다**(안 하면 눈금이 두 종류로 남아 매번 확인해야 한다).

**③ 컬럼·키 이름(`_pct`)을 바꾸나**
- 제안: **이번에는 안 바꾼다.** 값 변환만으로 코드 약 90곳이 걸린다. 이름까지 같이 바꾸면 무엇이 깨졌는지 구분이 안 된다. 이름 정리는 별도 작업.

## 2. 무엇을 바꾸고 무엇을 안 바꾸나

**바꾼다 — 퍼센트를 뜻하는 값**

| 대상 | 어디 |
|---|---|
| `combat_stat.csv:fmt = pct` 인 19 채널 | crit_rate · crit_damage · def_ignore · res_reduction · vs_type_damage · vs_size_damage · vs_status_damage · res_fire/cold/lightning/poison · res_max_bonus · damage_reduction · reflect_damage · life_steal · fhr · cooldown_reduction · item_find · gold_find |
| 그 채널의 값을 든 표 | `affix.csv`(16행) · `weapon_common_option.csv`(13행) · `weapon_sin_option.csv`(12행) · `tactic_option.csv`(63행) · `mastery_node.csv`(값은 `value_key` 로 `balance.csv` 를 가리킨다) |
| 같은 눈금의 다른 컬럼 | `armor_group.csv:aspd_pct`·`cdr_pct` · `weapon_group.csv:variance_pct` · `monster.csv:res_fire/cold/lightning/poison`(119행) · `codex_level.csv:bonus_pct` · `spawn_grade.csv:gear_rare_bonus_pct` · `hero_attribute.csv:mult_base_pct`·`mult_per_point_pct`(②가 「바꾼다」일 때) |
| `skill.csv` | `mult_pct` · `decay_pct` · `proc_chance_pct` · `proc_mult_pct` · `cond_value`(`cast_condition = ally_hp_below` 인 행만) · `effect_value`(아래 주의) |
| `balance.csv` | `_pct` 가 든 약 61 키 + **이름에 `pct` 가 없는 숨은 퍼센트** — `attr_bonus_per_point`(점당 1%) · `res_cap_base`(75) · `res_cap_absolute`(95) · `weapon_fixed_atk_pct_min`/`_max`(`_pct` 가 가운데라 접미사 검색에 안 잡힌다) |

**안 바꾼다 — 숫자만 보면 헷갈리는 것**

| 종류 | 예 |
|---|---|
| 상대 가중치 | `rarity_w_normal/magic/rare`(60/30/10) · `make_rarity_w_*` · `tactic_grade_weight_*` · `hero_tier.csv:weight` — 합이 100 이라 퍼센트로 보이지만 분모를 그때그때 다시 센다 |
| 곱셈 배수 | `[balance.csv:monster_atk_scale]`(0.2) · `xp_rate` · `gold_rate` · `power_growth_per_level`(1.06) · `armor_group.csv:def_mult`(1.6) · `spawn_grade.csv` 의 `hp_mult`·`exp_mult`·`gold_mult`·`drop_chance_mult` — **이미 0~1 사이 값이 많아 「이미 비율」로 착각하기 쉽다** |
| 소재값(flat) | `affix.csv` 의 `hp_flat`·`def_flat` · `tactic_option.csv:opt_march_def` 3행 · `monster.csv:defense` · `hp_regen` · `potion.csv:heal` · 능력치 원값 |
| 초 · 개수 · 레벨 · 골드 | `action_period` · `cool_sec` · `duration_sec` · `inventory_cap` · `affix_rare_min/max` · 비용 전부 |

**주의가 필요한 칸**

- `skill.csv:effect_value` 는 **`effect_stat` 에 따라 뜻이 다르다.** 퍼센트인 것: `guard_pct` · `hp_max_pct` · `atk_pct` · `period_pct` · `dr_pct` · `regen_pct` · `duel` · `onhit_element` · `attack_splash`. 퍼센트가 아닌 것: `taunt`(0). **행마다 확인한다.**
- `skill.csv:mult_pct` 는 `kind = summon` 행(`mag_frozenwall`)에서 **「시전자 최대 HP 의 %」**라는 다른 뜻이다. 눈금은 같으니 변환은 같지만, 검증할 때 구분한다.
- `weapon_sin_option.csv` 의 오만 행(`dmg_per_level_pct` · `scale = fine` · 0.2~0.5)은 **소수가 남는 유일한 자리**다. 비율로 바꾸면 0.002~0.005 가 되어 정밀도·표기가 위험하다 — **사용자에게 이 행만 따로 확인**한다(GAME_DESIGN §10 「오만 레벨당 데미지의 값 대역」과 한 묶음).

## 3. 코드 — 고칠 자리

조사 시점 기준 약 90곳. **`/ 100` · `* 100` · `0.01` 을 전부 훑는다**(줄 번호는 재확인).

| 파일 | 자리 | 비고 |
|---|---|---|
| `formula.js` | 75 · 87 · 104 · 116 · 123~125 · 137 · 145 · 146 · 147 · 152~153 · 160 · 162 · 173 | `?? 100` 기본값 둘(`critDmg` · `procMult`)을 **같이** 고친다 — 안 고치면 값이 없을 때만 조용히 틀린다 |
| `item.js` | **128~132 `valueOf`**(최우선) · 151~153 · 190 · 329 · 334 | `flat` 분기의 `Math.max(1, Math.round(...))` 가 0.0x 를 **1(=100%)로 증폭**시킨다. 결정 ①이 여기 걸린다 |
| `hero.js` | 319~320 · 326 · 405~406 · 419~420 · 428 · 442 · 463 · 475 | 463 은 **역방향**(내부 비율 → `* 100` 으로 저장). 이 저장값을 비율로 낼지 정한다 |
| `skill.js` | 467~468(미리보기) · 로드 검증 235 · 241 · 244 · 270 | 검증 상한(`proc_mult_pct >= 100` · `decay_pct < 100` · `cond_value <= 100`)을 안 고치면 **전 스킬이 로드에서 throw** 하거나 오타를 못 잡는다 |
| `skill_effects.js` | 54 · 68 · 71 · 83 · 97 · 99~100 · 110 · 146 · 152 · 156 · 164 · 172 · 185 · 189 | 공격 핸들러 다섯을 **동시에** 고친다 |
| `skill_runtime.js` | 41 · 121 · 191 · 197 | |
| `battle.js` | 159 · 213 · 456~457 · 543 · 618 · 623 · 742 · 768 | 623 은 **눈금이 섞인 식**(`drop_chance_pct` × 배수 둘) |
| `state.js` | 1530~1531 · 1554~1555 · 1574 · **621~629 `upgradeV26`** | `upgradeV26` 은 「정수화」 이관이라 결정 ①과 직접 부딪힌다. **임의로 되돌리지 말고 ①의 답을 받아서 처리한다** |

## 4. 화면 — 「5%」로 보이게 하려면

값이 비율이 되면 표시는 **찍기 직전에만 100 을 곱한다.** 이미 그렇게 하고 있는 자리(`tip.js` 의 `mitigation` · HP 바 · 기여율)가 정답 사례다.

| 파일 | 자리 | 지금 |
|---|---|---|
| `mock.js` | 135~136 `statValue` · 143~144 `baseValue` | 값을 그대로 찍고 `%` 만 붙인다 → `+0.05%` 로 보인다 |
| `tip.js` | 180 `fmtCombat` · 198 `resCap` · 324 `UNIT.pct` | 같은 문제 |
| `app.js` | 3434 · 3497(도감 보너스) | `fmt` 확인 없이 직접 찍는다 |

**이 넷은 테스트로 안 잡힌다 — 실제 화면을 열어 눈으로 확인한다.**

## 5. 세이브 이관 — 빠뜨리면 「5」가 「500%」가 된다

- **이관 대상:** `items[uid].affixes[].v` 중 **퍼센트 채널**(위 §2 목록). 새 `upgradeV<다음 번호>` 에서 100 으로 나눈다.
- **대상 아님:** `implicit.v`(방어구 고유 방어력 — flat) · 마스터리 랭크(정수 카운터) · 전술 상태(값을 저장하지 않고 CSV 를 매번 읽는다).
- **주의:** `dmg_per_level_pct`(오만)는 이미 소수라 §2 의 확인 결과에 따른다.
- 세이브 버전을 올리고 `INTERFACE.md` 의 세이브 절을 같이 고친다.

## 6. 테스트 · 골든

1. `src/dev/test.js` — 퍼센트 범위를 직접 검사하는 단정 약 40개. CSV 무결성 단정(`balance` status/knob · 접사 범위)도 포함된다.
2. **골든은 전면 재촬영이 강제된다** — 입력 지문(`balance` 전 키)과 드롭 지문(접사 값)이 모두 바뀐다. 절차는 [`src/dev/README.md`](../../src/dev/README.md) 「골든 시드 스냅샷」의 PowerShell 절차를 **그대로** 따른다(가드 세 줄 · 백업 · 프로필 폴더 매번 새로).
3. 재촬영 전에 **①② 입력 지문이 빨간불인 이유가 이 작업 때문인지** 확인한다 — 다른 세션의 `monster.csv` 변경이 섞여 있을 수 있다.

## 7. 순서

1. 결정 ①②③ 을 사용자에게 받는다(§1).
2. `src/data/README.md` 에 **단위 규약**을 먼저 적는다 — 「퍼센트는 비율로 저장한다 · 표시할 때만 100 을 곱한다 · 가중치 · 배수 · flat 은 대상이 아니다」. 지금 이 규약은 **어디에도 적혀 있지 않고 코드 관례로만** 있어서 이번 혼선의 뿌리다.
3. CSV 를 채널 단위로 전부 바꾼다(§2).
4. 코드를 고친다(§3) — `item.js:valueOf` 와 `skill.js` 로드 검증을 먼저.
5. 화면(§4) · 세이브 이관(§5).
6. 테스트 단정 수정 → 전체 통과 확인 → 골든 재촬영(§6).
7. 실제 화면을 열어 퍼센트 표기를 눈으로 확인한다(툴팁 · 아이템 옵션 줄 · 캐릭터 시트 · 도감).
8. 문서 갱신 — `GAME_DESIGN.md` §9 한 줄 · `DEV_PLAN.md` §3-3 R111 상태 · `INTERFACE.md`(세이브 · `formula` 반환 눈금) · `item_design.md` §2-1(정수 규칙 문장) · **이 문서 삭제**.

## 8. 조용히 틀리는 함정 (요약)

1. `item.js:valueOf` 의 하한 1 — 모든 퍼센트 옵션이 100% 가 된다.
2. `?? 100` 기본값(`formula.js` 둘 · `hero.js` 하나) — 값이 없을 때만 틀린다.
3. 화면 넷(§4) — 테스트가 못 잡는다.
4. 세이브 이관 누락 — 옛 세이브만 틀린다.
5. 눈금이 섞인 식(`battle.js:623`) — 한쪽만 고치면 틀린다.
6. 채널 하나가 여러 파일에 흩어져 있다 — 한 파일을 놓치면 합산이 틀린다.
7. 가중치 · 배수를 같이 바꾸는 실수 — §2 「안 바꾼다」 표를 옆에 두고 작업한다.

---

*마지막 업데이트: 2026-09-16*
