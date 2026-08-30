# INTERFACE — game_logic 이식 계약서

> **이 문서는 계약이다.** Phase 2(Godot/Unity)는 "이 문서대로 동작하는가"로 검증한다.
> 코드가 경계를 바꾸면 **이 문서를 먼저(또는 같이) 고친다.** 코드에만 있는 규칙은 계약이 아니다.
> 출처는 전부 `src/game_logic/*.js` · `src/ui/data.js` · `src/ui/storage.js` · `src/ui/battle.js`(재생기) — 2026-08-26 기준 코드에서 읽은 것만 적었다.

관련: [ARCHITECTURE.md](ARCHITECTURE.md)(구조) · [DEV_PLAN.md](DEV_PLAN.md)(계획·부채) · [SCREEN_DESIGN.md](SCREEN_DESIGN.md)(화면)

---

## 0. 계약의 네 기둥

| 기둥 | 내용 | 위반 검출 |
|---|---|---|
| **순수성** | `game_logic/` 은 `document` / `window` / `localStorage` / `Date` / `Math.random` 을 참조하지 않는다 | grep 0건 (2026-08-26 확인) |
| **주입** | 모든 시스템은 `create*(data)` 생성자로 데이터를 받는다. 모듈 전역 상태 없음 | 생성자 시그니처 §2 |
| **결정론** | 같은 CSV + 같은 시드 + 같은 입력 = 같은 타임라인·같은 세이브. 난수는 `rng()` 인자로만 흐르고 **소비 순서가 곧 계약**이다 | §5 |
| **세이브** | 상태 객체 = 평문 JSON. `serialize` 는 버전 도장만 찍는다. 저장소 접근은 어댑터 1곳 | §4 |

---

## 1. 모듈 조립 그래프

```
rng.js ──┐
csv.js   │  (파싱만 — fetch 는 ui/data.js)
         │
formula.js(balance) ──────────────────────┐
hero.js(data) ────────────────────────────┤
item.js(data) ──────────┐                 │  hero · item · battle 은 **각자 내부에서 createFormula(balance) 를 만든다**
skill.js(balance, rows) ┐│                │  (성장 곡선 growthMult · 피해 감소 곱 · strike 를 시뮬과 같은 함수에서 읽기 위해)
battle.js(data, itemSystem, skillSystem) ─┤  skill.js 는 hero.js 의 `ELEMENTS`(원소 어휘)만 import 한다 — 시스템 주입이 아니다
state.js(deps: hero, item, battle, skill, balance, …) ──┘
```

`ui/data.js:buildSystems` 는 렌더러용으로 `createFormula(balance)` 를 **한 번 더** 만들어 `SYS.formula` 로 내보낸다 — 화면의 감쇠율·저항 상한 표기가 시뮬과 같은 곡선을 쓰게 하기 위한 것이지, 시스템들이 그 인스턴스를 공유하는 것이 아니다(전부 무상태 순수 함수라 같은 결과).

조립은 `ui/data.js:buildSystems(D)` 한 곳. `dev/test.js` 도 같은 함수를 쓴다 — **테스트와 런타임의 조립 경로가 같다**는 것이 계약이다.

---

## 2. 모듈별 계약

### 2-1. `rng.js`

| export | 시그니처 | 계약 |
|---|---|---|
| `makeRng(seed)` | `(seed: uint32) → () => number` | mulberry32. 반환 함수는 `[0, 1)` 실수. 내부 상태는 클로저 — 같은 시드에서 n번째 호출은 언제나 같은 값 |
| `deriveSeed(master, stream)` | `(uint32, int) → uint32` | 마스터 시드 + 스트림 번호 → 파생 시드. 세이브에는 마스터 시드와 **카운터**만 남긴다 |

**이식 주의** — 알고리즘을 비트 단위로 재현해야 한다: `Math.imul`(32비트 곱), `>>> 0`(부호 없는 32비트), `/ 4294967296`. 엔진 언어에서 64비트 정수로 계산하면 결과가 달라진다.

### 2-2. `csv.js`

| export | 시그니처 | 계약 |
|---|---|---|
| `parseCsv(text)` | `string → object[]` | 첫 줄 = 헤더. BOM 제거. 빈 줄 무시. **숫자로 읽히는 셀은 Number 로 변환**(빈 셀은 빈 문자열). 쉼표/따옴표 이스케이프 **없음** — CSV 셀에 쉼표를 넣지 않는 것이 데이터 계약이다 |
| `keyValue(rows)` | `→ {key: value}` | `balance.csv` 전용 (`key,value,description`) |
| `indexBy(rows, col)` | `→ {rows[col]: row}` | 같은 키가 둘이면 뒤가 이긴다 |

### 2-3. `formula.js` — 피해 계산

`createFormula(balance) → { growthMult, mitigation, physicalDefense, resCap, appliedResist, reductionMult, hitChance, strike, indirect, leech, effectiveCd }`
입력은 `balance` 하나. 파일에 숫자 리터럴 없음. 규칙의 출처는 battle_design §9 전부(9-0 ~ 9-6).

| 함수 | 시그니처 | 계약 |
|---|---|---|
| `growthMult(n)` | `→ ≥1` | `power_growth_per_level ^ (max(1, n) − 1)` — **성장 축의 유일한 곡선**(§9-0). 레벨과 ilvl 이 같은 곡선을 탄다. `n < 1` 은 1로 막는다 |
| `mitigation(D)` | `→ 0~1` | `D / (D + def_curve_k)`. **레벨 인자 없음 — K 는 상수다**(§9-3). `D ≤ 0` 이면 0. 1에 닿지 않는다(면역 없음) |
| `physicalDefense(def, defIgnorePct=0)` | `→ ≥0` | `max(0, def × (1 − ignore/100))` — 방어 무시는 **곡선에 넣기 전** 소재값을 깎는다(감쇠율의 %가 아니다) |
| `resCap(resMaxBonus=0)` | `→ %` | `min(res_cap_base + resMaxBonus, res_cap_absolute)` — 기본 상한을 뚫는 유일한 수단이 최대 저항 증가, 그 위에 절대 상한 |
| `appliedResist(res, resMaxBonus=0)` | `→ %` | `min(res, resCap(resMaxBonus))` — **상한만 있고 하한은 없다.** 음수 저항 = 피해 증폭 (§9-5) |
| `reductionMult(pcts)` | `→ 0~1` | `Π (1 − p/100)` — 피해 감소는 **원천별 곱**이다(§9-3). 빈 배열은 1 |
| `hitChance(attackerLevel, defenderLevel)` | `→ %` | `clamp(hit_base_pct − max(0, dLvl − aLvl) × hit_per_level_deficit_pct, hit_min_pct, hit_base_pct)` — **레벨 차 하나가 정한다**(§9-4). 오버레벨 초과 이득 없음 |
| `strike(rng, a, d)` | `→ {hit, dmg, crit}` | 직격 1회. **rng 소비 순서 = 적중 → (적중 시) 치명. 최대 2회** (§5-2) |
| `indirect(amount)` | `→ int` | 비직격(반사·도트·사망 폭발). 적중·스킬 배율·치명·감소를 받지 않고 흡혈·반사·발동 효과를 **유발하지 않는다**. `dmg_min` 하한만 |
| `leech(dmg, pct)` | `→ int` | 흡혈 — 직격의 최종 피해에만 비례 |
| `effectiveCd(cd, period)` | `→ 초` | 실효 쿨 `ceil(cd / period) × period` (§6) — 스킬은 행동 주기에 얹혀 나가므로 쿨이 돌아도 다음 차례까지 기다린다. **엔진은 이 함수를 쓰지 않는다**(틱 루프에서 자연히 생긴다) — 화면 표기·검증이 같은 규칙을 읽게 하려는 것 |

**공격자 `a`** — `{atk, atkType, lvl, crit, critDmg, defIgnore, resReduction, skillMult, bonusPct}`
**방어자 `d`** — `{def, res:{fire,cold,lightning,poison}, resMaxBonus, dr, lvl}`
`res` 는 **항상 객체다 — 몬스터도**(§8 항목 11). `dr` 은 호출자가 이미 원천별 곱으로 합쳐 온 **실효 %** 한 숫자다.

```
strike(rng, a, d):
  rng()×100 ≥ hitChance(a.lvl, d.lvl)  →  {hit:false, dmg:0, crit:false}      ← rng ①  (여기서 끝, 1회 소비)
  v = a.atk × (skillMult ?? 1) × (1 + (bonusPct ?? 0)/100)                     ← 타격 편차 없음 (무기 개체에 박혀 있다)
  crit = rng()×100 < min(a.crit ?? 0, crit_cap_pct);  crit 이면 v ×= (critDmg ?? 100)/100    ← rng ②
  physical → v ×= 1 − mitigation(physicalDefense(d.def, a.defIgnore))
  원소     → v ×= 1 − appliedResist((d.res[a.atkType] ?? 0) − (a.resReduction ?? 0), d.resMaxBonus)/100
  공통     → v ×= 1 − (d.dr ?? 0)/100
  →  {hit:true, dmg: max(dmg_min, round(v)), crit}
```

- 저항 감소는 관통이라는 별도 규칙이 아니라 **저항값에 음수를 더하는 것**이다 (§9-5) — 그래서 상한 계산 앞에 들어간다
- 옛 `hitChance(acc, eva)` · `defenseAgainst(defender, atkType, ignore)` 는 **삭제됐다**(명중·회피 폐지 · 저항은 곡선을 타지 않는다). 옛 `strike` 의 편차 굴림도 없다

### 2-4. `hero.js` — 영웅

`export const ELEMENTS = ['fire', 'cold', 'lightning', 'poison']` — `combat_stat.csv:res_*` · `monster.csv:attack_type` · 무기 `element` 가 쓰는 같은 어휘.

`createHeroSystem(data)` — 주입 `data`. 내부에서 `createFormula(balance)` 를 만든다(성장 곡선 `growthMult` · 피해 감소 곱).

| 필드 | 형태 | 출처(현재) |
|---|---|---|
| `balance` | `{key: value}` | balance.csv |
| `stats` | `[{id, ko, en, abbr, combatStat, dispatch}]` 기본 능력치 7종, 순서 = 표시 순서. id = `str, agi, int, vit, luck, ldr, cha` (5번째가 `luck` — 08-26 감각→운). **hero.js 는 `id` 만 읽는다** | hero_attribute.csv |
| `sins` | `[sinId]` | ⚠ `ui/mock.js:SINS` 키 |
| `classes` | `[{id, keyAttr, stage}]` (`stage` = `main` / 확장) | ⚠ `ui/mock.js:CLASSES` |
| `weaponGroups` | `{id: {period, damageKind, variance, …}}` | weapon_group.csv |
| `namePool` | `[{ko,en}]` | ⚠ `ui/mock.js` |
| `traitPool` | `[{ko,en}]` | ⚠ `ui/mock.js` |
| `masteryNodes` | `[mastery_node.csv 행]` — 랭크당 값·상한·해금 레벨은 **키 이름만** 들고 `balance` 에서 읽는다 | mastery_node.csv |

| export | 시그니처 | 계약 |
|---|---|---|
| `rollAttributes(rng, favor)` | `→ {statId: v}` | **합 고정(`hero_attr_total`), 모양만 굴림**. `favor`(직업 주력 축)가 최고치가 되도록 자리만 바꾼다 |
| `rollHero(rng, {sin, cls, name, trait})` | `→ hero` | `uid: null` 로 돌려준다 — **uid 발급은 state.js 의 권한** |
| `rollStartParty(rng, n)` | `→ hero[]` | 이름·죄종·직업·특성이 n명 사이에서 겹치지 않는다. 직업은 `stage === 'main'` 만 |
| `rollCandidates` | = `rollStartParty` | 선술집 후보 |
| `xpNeeded(level)` | `→ int` | `round(hero_xp_base × level ^ hero_xp_exp)` |
| `grantXp(hero, amount, rng)` | `→ {uid, from, to, gains, points}` 또는 `null` | **hero 를 in-place 로 바꾼다**(xp·level·stats). 레벨업마다 축별 `attr_growth_chance_pct` 확률 +1, 히든 상한 `caps` 까지. **마스터리 포인트도 여기서 준다** — `points = 오른 레벨 수 × mastery_point_per_level`, `hero.masteryPoints` 에 in-place 가산. **레벨 상한 `hero_level_cap` 에서 멈추고 `xp = 0` 이 된다** — 상한에 닿은 뒤의 지급은 `null` 을 돌려주고 아무것도 바꾸지 않는다 (⚠ 「50 이후 느린 곡선」은 미반영 — 곡선 숫자는 캘리브레이션 뒤, DEV_PLAN R12) |
| `computeCombat(hero, items, codex={})` | `→ combat` | 순수. 아래 표 |
| `masteryNodes` · `masteryById` | `[node]` · `{nodeId: node}` | 정규화된 노드. `node = {id, treeKind, ownerId, tier, stat, value, maxRank, unlockLevel}` |
| `masteryNodesFor(hero)` | `→ [node]` | 그 영웅의 죄종 트리 + 직업 트리. `ownerId === '*'` 는 그 `treeKind` 전부에 걸린다 |
| `masteryBonus(hero)` | `→ {flat:{stat:v}, dr:[v]}` | 찍은 랭크 × 랭크당 값. `damage_reduction` 만 따로 — 원천별 곱이라 합치면 안 된다 |

**hero 객체** — `{uid, name:{ko,en}, tier, sin, cls, trait:{ko,en}, level, xp, mastery:{nodeId:rank}, masteryPoints, stats:{7}, caps:{7}, equipped:{position: itemUid 또는 null}, injuredUntil: ms 또는 null}`
`tier` 는 `rare` / `unique`. `caps` 는 히든 상한 — **화면에 보여주지 않는다.**
`mastery` 는 **찍은 것만** 담는다(랭크 0 은 키가 없다) · `masteryPoints` 는 남은 포인트. 죄종·직업 마스터리가 **한 풀을 공유**한다 (skill_design §1-4).

**`computeCombat` 출력** — 필드가 **있거나 없거나**로 표현되는 것이 있다. `attrMult(v) = 1 + v × attr_bonus_per_point / 100`:

| 필드 | 계약 |
|---|---|
| `atk_physical` **또는** `atk_magic` | **둘 중 하나만 존재.** 무기군 `attackType === 'magic'` 이면 `atk_magic`(지능), 아니면 `atk_physical`(힘). 맨손 = physical.<br>**무기가 밑수다**(§9-1) — `round( attrMult(int 또는 str) × 밑수 × (1+Σatk_pct/100) × (1+codex.atk_pct/100) )`, 밑수 = `watk + 무기 슬롯 **자신의** 접사 atk_flat 합`(맨손이면 `unarmed_atk`). **다른 슬롯의 `atk_flat` 은 더하지 않는다** |
| `attack_type` | `physical` 또는 마법 무기 개체의 `element`(없으면 `ELEMENTS[0]`) |
| `level` | 적중률의 공격자 레벨 (§9-4). 감쇠 곡선은 레벨을 쓰지 않는다 |
| `hp_max` | `round( (hero_hp_base × growthMult(level) + Σhp_flat) × (1+Σhp_pct/100) × (1+codex.hp_pct/100) )` — **레벨이 성장 곡선을 탄다**(§9-0) |
| `defense` | Σ`def_flat` (방어구 implicit + 접사). 비율 축이라 곡선을 타지 않는다 |
| `res_fire` · `res_cold` · `res_lightning` · `res_poison` | `res_all + res_<원소>` — **직접 %**, 능력치 계수 없음. 상한은 여기서 걸지 않는다(전투에서 `appliedResist`) |
| `res_max_bonus` · `res_reduction` | Σ 접사. 드롭 접사 풀에 아직 없다(유니크·크래프트·낙인의 자리) — **값 0 이 정상** |
| `damage_reduction` | **실효 %** = `100 × (1 − Π(1 − p/100))`, 소수 3자리. 원천별 곱(§9-3)을 한 숫자로 낸 것 — 시트에도 이 숫자가 찍히고 `strike` 는 `d.dr` 로 한 번만 곱한다 |
| `def_ignore` · `reflect_damage` · `life_steal` | Σ 접사 |
| `hp_regen` | Σ — **초당** 회복량. 접사 풀에 없어 출처는 지금 **마스터리뿐**이라 보통 0. 적용은 `battle.js`(틱마다 누산) |
| `cooldown_reduction` | Σ — 표기 쿨을 줄이는 %. 출처는 지금 **마스터리뿐**. 적용은 `battle.js`(시전 시점에 곱) |
| `crit_rate` · `crit_damage` | `base_crit_pct` / `base_crit_damage_pct` + Σ 접사. 확률 상한은 `strike` 에서 |
| `action_period` | `(무기군 period 또는 unarmed_period) / attrMult(agi) × (1 − Σaspd_pct/100)`, 하한 0.4 s, 소수 3자리 |
| `dmg_bonus_pct` | `codex.dmg_pct` 그대로 — 전투 유닛의 `bonusPct` 가 된다 |
| `gold_find` · `item_find` | `round(Σ접사 × attrMult(luck))` — **곱셈이라 장비가 0이면 0**(§8 곱셈 원칙). **운은 전투 계산 밖**이라 이 둘에만 걸린다 |
| `atk_pct_sum` | Σ 장비 `atk_pct` (**이미 `atk` 안에 곱해져 있다** — 중복 적용 금지). 전투 중 스킬 버프가 새 곱셈 층이 아니라 **같은 괄호에 덧셈**으로 들어가야 해서(§9-2) `battle.js` 가 그 괄호를 되짚을 수 있도록 따로 낸다 |

**마스터리는 접사와 같은 채널로 합류한다** (skill_design §3 · 2026-08-28) — `computeCombat` 은 접사를 합산한 뒤 `masteryBonus(hero)` 의 `flat` 을 **같은 누산기에 더하고** `dr` 을 원천 목록에 밀어 넣는다. 그 아래로는 출처를 구분하지 않는다.

| 규칙 | 내용 |
|---|---|
| 새 곱셈 층 없음 | 노드는 전부 기존 채널에 덧셈이다 (battle_design §9-2 「괄호는 둘뿐」). `stat` 은 **접사 채널**(`atk_pct`·`hp_pct`·`aspd_pct`·`res_all` …) 또는 **`combat_stat.csv` id** 여야 한다 — 새 채널을 만들지 않는다 |
| 피해 감소만 예외 | 원천별 곱이라 합치지 않는다 (§9-3). **노드 하나 = 원천 하나** |
| 랭크 상한 | 계산에서 `maxRank` 로 자른다. 상한 초과는 세이브 손상이므로 조용히 잘라 쓰고, 찍을 때 막는 것은 `state.js` 의 일 |
| 트리 소속 | `treeKind === 'sin'` 은 `hero.sin`, `'class'` 는 `hero.cls` 와 맞아야 붙는다. `ownerId === '*'` 는 그 종류 전부(T1 공통 3종) |
| 운 계수 | `gold_find`·`item_find` 는 접사와 **같은 합**에 들어가므로 **운 계수를 함께 받는다** — battle_design §8 의 `전투 능력치 = (장비 + 스킬(마스터리·특화 노드)) × 기본 능력치 계수` 가 그대로다. 마스터리는 **괄호 안**이고 계수는 괄호 전체에 걸린다 |
| 반응형(T3) | **없다.** 전투 중 사건에 붙어 `hero.js` 가 아니라 `battle.js` 의 몫이고 값도 전부 미정이라 `mastery_node.csv` 에 행이 없다 |

로드 시 던지는 것 — `tree_kind` 어휘 밖 · `owner_id` 가 죄종/직업이 아님 · `tier < 1` · `value_key`/`max_rank_key`/`unlock_key` 가 `balance.csv` 에 없음. **키가 없으면 값이 `undefined` 로 조용히 새므로 즉시 던진다.**

**삭제된 출력** — `variance_pct`(편차는 무기 개체에 박혔다) · `accuracy` · `evasion`(명중·회피 폐지) · `magic_defense`.
전투 계수가 실제로 걸리는 축은 셋뿐 — 힘(물리 공격력) · 지능(마법 공격력) · 민첩(행동 주기). 건강(fhr)은 상태이상 미구현으로 출력하지 않고, 통솔·매력은 계수가 없다.

`codex` 입력은 `{atk_pct, hp_pct, dmg_pct}` 만 읽는다. `state.codexBonus` 가 함께 내는 `acc_pct` 는 **읽는 곳이 없다** — 명중 폐지로 생긴 공백이고 재배정은 기획 결정이다 ([GAME_DESIGN §10](../game_design/GAME_DESIGN.md) · [DEV_PLAN §3-2](DEV_PLAN.md)).

### 2-5. `item.js` — 아이템

`createItemSystem(data)` — 주입 `data`. 내부에서 `createFormula(balance)` 를 만든다(성장 곡선 `growthMult`).

| 필드 | 형태 | 출처(현재) |
|---|---|---|
| `balance` | | balance.csv |
| `slots` | `[partId]` 부위 8종 | ⚠ `ui/mock.js:SLOTS` |
| `sins` | `[sinId]` | ⚠ mock |
| `weaponGroups` | `{id: {id, ko, en, classes:[cls], twoHanded, period, variance, damageKind, release}}` — `damageKind ∈ physical\|magic` · `release ∈ main\|expansion`(드롭은 `main` 만) | weapon_group.csv |
| `elements` | `[elementId]` | ⚠ `ui/mock.js:ELEMENT_IDS` |
| `itemBases` | `{part: [{ko,en}]}` 무기 외 부위 베이스 이름 | ⚠ `ui/mock.js:ITEM_BASES` |
| `affixDefs` | `[{stat, scale:'growth'\|'band'\|'flat', min, max, perIlvl?, slots?}]` — `perIlvl` 은 **band 에만**, `slots` 없으면 전 부위 | ⚠ `ui/mock.js:AFFIX_DEFS` |
| `composeName` | `(prefixSin, base, suffixSin 또는 null) → {ko,en}` | ⚠ `ui/mock.js:nm` — 어순·조사 규칙 |

**item 객체** — `{uid, slot(part), rarity, ilvl, name:{ko,en}, implicit:{stat,v} 또는 null, affixes:[{stat,v}], sins:[sinId], group?, twoHanded?, watk?, element?}`
- `rarity` 는 현재 `magic` / `rare` 만 굴린다
- `group` / `twoHanded` / `watk` 는 무기만. `element` 는 **마법 무기군 개체**만
- 무기의 행동 주기·공격 타입·착용 직업은 아이템에 **박지 않는다** — 매번 `weaponGroups[group]` 에서 읽는다
- `sins` 는 죄종 **태그 목록**이지 포인트가 아니다 — 세트포인트 구조는 폐기됐다(08-26). 스키마는 그대로이고, 태그를 **세는 쪽**이 전술카드 조건이 된다 (tactic_card_design.md)

**개체 굴림** — 편차는 타격마다가 아니라 **드롭 시 한 번** 굴려 개체에 박는다 (§9-1 · item_design §2). `ε = (rng()×2 − 1) × 폭/100`:

| 부위 | 값 | 편차 폭 |
|---|---|---|
| 무기 `watk` | `round2( weapon_atk_base × growthMult(ilvl) × (양손 ? two_hand_atk_mult : 1) × (1+ε) )` — **소수 2자리**(정수로 반올림하면 2.3 대역이 뭉개진다) | 무기군 정의의 `variance`(= `weapon_group.csv:variance_pct`), 없으면 `balance.csv:dmg_variance_pct` |
| 방어구 implicit `def_flat` | `round1( (armor_def_base + ilvl × armor_def_per_ilvl) × (보조 ? 1.5 : 1) × (1+ε) )` — 방어는 비율 축이라 **성장 곡선을 타지 않는다** | `armor_def_variance_pct` (전역 하나) |
| 목걸이 · 반지 | implicit 없음 — **rng 소비도 없다** | — |

**접사 값 규칙** (`rollAffixes` — 정의의 `scale` 이 정한다, item_design §2-1). `roll = min + rng()×(max−min)`:

| scale | 값 | 해당 |
|---|---|---|
| `growth` | `max(0.1, round1(roll × growthMult(ilvl)))` — 소수 1자리 | `atk_flat` · `hp_flat` |
| `band` | `max(1, round(roll + ilvl × perIlvl))` — 정수 | `def_flat` |
| `flat` | `max(1, round(roll))` — 정수, **ilvl 무관** | 나머지 전부 (% · 저항 · 유틸) |

같은 stat 은 한 아이템에 두 번 붙지 않는다 — 정의 풀에서 뽑으면 제거한다. `slots` 가 그 부위를 포함하는 정의만 풀에 들어간다(`atk_flat` 은 `['weapon']` 전속).

| export | 시그니처 | 계약 |
|---|---|---|
| `rollDrop(rng, ilvl)` | `→ item` | 부위 균등 → 베이스 → 희귀도(가중치) → `build`(§5-2 순서) |
| `startingWeapon(rng, cls)` | `→ item` | ilvl 1 · magic · 직업 전속 무기군(본편만) |
| `canEquip(hero, item, equippedItems)` | `→ null` / `class` / `twoHanded` | 무기 = 직업 전속 무기군 검사. 보조 = 양손 무기 착용 중이면 불가. **능력치 게이트 없음** |
| `groupOf(item)` | `→ 무기군 정의 또는 null` | |
| `groupsFor(cls)` | `→ 무기군 정의[]` | 본편(`stage === 'main'`) 무기군만 |
| `salvageDust(item)` | `→ int` | 희귀도별 |

### 2-6. `battle.js` — 헤드리스 전투

`createBattleSystem(data)` — 주입 `data`: `balance, monsters(byId), stages(byId), roundTypes [{round_num, round_type}], budgets(byKey), grades(byKey), sins, sinTraits {sin: trait}, commonTraits [trait], itemSystem, skillSystem`.
`sinTraits` / `commonTraits` 는 ⚠ `ui/mock.js` 출처. `skillSystem` 이 없으면 액티브 없이 기본 공격만 돈다.

| export | 시그니처 | 계약 |
|---|---|---|
| `stagePool(stage)` | `→ monsterIdx[]` | 해당 챕터·스테이지의 `spawn_grade === 'normal'` 몬스터 |
| `stageElement(stage)` | `(stage 행 객체) → elementId` \| `'physical'` | 그 스테이지 몬스터의 `attack_type` 중 physical 이 아닌 **첫 값**. 편성 화면의 "이 스테이지가 요구하는 저항"(§9-8) — 렌더러가 몬스터 테이블을 훑지 않게 여기 둔다 |
| `makeEnemy(key, monsterId, grade, lvl, extra?)` | `→ 전투 유닛` | 몬스터 → 유닛 변환 규칙 자체가 계약이라 내보낸다(검증이 직접 본다). 아래 |
| `simulate(partyUnits, stageId, rng)` | `→ result` | `partyUnits = [{uid, combat, actives?}]` (`combat` = `computeCombat` 결과, `actives` = 액티브 id 목록 = `skill.activesFor`). **`actives` 가 없거나 비면 기본 공격만 돌고 rng 수열은 스킬 도입 전과 같다.** 아래 |

**드롭 (`onKill`)** — **처치당 최대 1개** (item_design §1 확정 2026-08-27). 판정은 **1회**: `rng()×100 < drop_chance_pct × dropChanceMult × 아이템 드랍률배율` 이면 1개.
보스(`stage_boss`/`chapter_boss`)는 `boss_guaranteed_drop` 을 하한으로 보장한다. 드롭이 있으면 ilvl 을 1회 굴려 `itemSystem.rollDrop` 을 부른다.
⚠ 파이프라인의 나머지(ilvl 에 등급 반영 · 희귀도에 매직찬스)는 **미반영** — DEV_PLAN R20.

**전투 유닛 — 몬스터와 파티가 같은 필드 모양이다** (§8-1). `formula.strike` 가 읽는 이름 그대로 쓴다:
`{key, side, hp, hpMax, atk, atkType, def, res:{fire,cold,lightning,poison}, lvl, resMaxBonus, dr, defIgnore, resReduction, skillMult, bonusPct, crit, critDmg, ls, reflect, period, next}`
스킬 런타임이 얹은 필드 — 전부 **전투 안에서만** 산다 (세이브에 넣지 않는다):

| 필드 | 계약 |
|---|---|
| `atkBase` · `atkPct` | 버프 괄호. `atkBase = atk / (1 + atk_pct_sum/100)` · `atkPct = atk_pct_sum`. 유효 공격력 `atk = atkBase × (1 + (atkPct + Σ버프 atk_pct)/100)` — **새 곱셈 층을 만들지 않는다**(§9-2). 몬스터는 `atkBase = atk` · `atkPct = 0` |
| `matk` | 회복량의 밑수 = `combat.atk_magic ?? 0`. 몬스터 0 |
| `basePeriod` | `period` 의 원값. `period = basePeriod × (1 − Σ버프 period_pct/100)` |
| `actives` | `[{id, def, readyAt}]` — 전투 시작 시 전부 `readyAt = 0`(전부 준비). 몬스터 `[]` |
| `buffs` | `{skillId: {stat, v, until}}` — 창 하나 = 스킬 하나. **중첩 없음**, 재시전은 `until` 갱신 |
| `barrier` | `{amt, until, s}` 또는 `null` — HP 밖 흡수 풀 |

| 몬스터(`makeEnemy`) | 값 |
|---|---|
| `hp` · `atk` | `round(hp × grade.hp_mult × monster_hp_scale)` · `attack × grade.atk_mult × monster_atk_scale`(반올림 없음) — 성장 축 |
| `def` | `defense × grade.def_mult × monster_def_scale` (비율 축) |
| `res` | `{원소: monster.res_<원소> + grade.res_add}` — **직접 %**. 배율을 받지 않고 등급은 %p 가산만 |
| `lvl` | `stage.dlvl` — 몬스터마다 두지 않는다 (§9-4) |
| `dropChanceMult` | `grade.drop_chance_mult` — **굴림 횟수가 아니라 확률 배율**이다 (드롭은 처치당 최대 1개, 아래) |
| 나머지 | `crit 0` · `critDmg = base_crit_damage_pct` · `defIgnore 0` · `resReduction 0` · `skillMult 1` · `bonusPct 0` · `resMaxBonus 0` · `dr 0` · `ls 0` · `reflect 0` — 영웅 체계의 **부분집합**(§8-1) |

파티 유닛은 `computeCombat` 출력을 그대로 옮긴다 — `bonusPct ← dmg_bonus_pct` · `dr ← damage_reduction`(실효 %) · `res ← res_* 4종` · `lvl ← level` · `regen ← hp_regen` · `cdr ← cooldown_reduction`. **몬스터는 `regen`·`cdr` 이 0** 이다(영웅 체계의 부분집합 §8-1).

**result** — `{won, reason, durationSec, party:[{key, uid, hpMax, period, actives:[skillId]}], timeline:[ev], xpTotal, gold, dust, kills:{monsterId:n}, cards:{monsterId:n}, drops:[item(uid null)], downed:[heroUid], roundsCleared, rounds:[{n, kind, killed:[monsterId], eliteSin}], strikes:{party:{n,miss}, enemy:{n,miss}}, casts:{skillId:n}}`
- `casts` = 스킬별 시전 횟수. 타임라인의 `skill` 이벤트 수와 합이 같다
- `reason` 은 `clear` / **`retreat`** / `wipe` / `timeout`.
  **귀환 룰** (base_expedition_design §1-1 · 2026-08-30 반영) — 전투불능자가 **하나라도** 나오면 그 자리에서 런을 접고 `retreat` 로 끝난다(연쇄 전멸 방지). 판정 순서는 ① 전멸 ② 라운드 정리(클리어·다음 라운드) ③ 귀환 ④ 제한시간 — **라운드 정리가 귀환보다 앞이라** 마지막 타격과 같은 틱에 쓰러져도 그 라운드의 클리어는 남는다. 그래서 `wipe` 는 **같은 틱에 전원이 쓰러진 경우**에만 나온다
  ⚠ 이 룰은 런의 길이를 바꾼다 — 캘리브레이션 대역은 이 룰이 들어간 뒤의 값이어야 한다
- `strikes` = 직격 시도 수와 빗나간 수. **레벨 부족의 전용 신호**라 리포트에 따로 낸다 (§9-4·§9-8). 세는 것뿐이라 **rng 를 소비하지 않는다**
- `drops` 의 아이템은 `uid: null` — state.js 가 가방에 넣으며 발급
- **`timeline` 은 세이브에 넣지 않는다.** 리포트만 남긴다

**타임라인 이벤트** — 전부 `{t, e, …}`. `t` = 초, 소수 첫째 자리 반올림.

| `e` | 필드 | 의미 |
|---|---|---|
| `round` | `n, kind, enemies:[{key, monsterId, grade, sin, traits, hpMax, period}]` | 라운드 시작. **그 라운드의 첫 이벤트** |
| `hit` | `a, d, dmg, crit, dhp` (+ `ahp` 흡혈 시 · `s?` 스킬 타격 · `bar?` 배리어 잔량) | 직격 적중. `dhp` = 피격 후 HP. `bar` = 대상이 배리어를 갖고 있었을 때 **흡수 후 잔량** |
| `dodge` | `a, d` (+ `s?`) | 직격 빗나감 (적중 게이트 실패 — 회피 스탯은 없다. **키 이름은 계약이라 유지**) |
| `reflect` | `a, d, dmg, ahp` | 비직격 반사. `a` = 반사한 쪽 |
| `down` | `u` | 전투불능 |
| `card` | `u, monsterId` | 도감 카드 판정 성공 (처치와 별개) |
| `regen` | `u, amt, dhp` | HP 재생. **정수 1 이상이 쌓인 틱에만** 나온다(초당 값을 틱마다 누산) · 행동 처리 **앞** · rng 소비 없음 |
| `skill` | `u, s, ready` | 액티브 시전 — 그 차례의 사건. 뒤따르는 `hit`/`dodge`/`heal`/`buff` 가 같은 `s` 를 단다. `ready` = 그 스킬이 **다시 준비되는 시각**(쿨감소가 이미 반영된 값) — 재생기가 쿨을 계산하지 않게 시뮬이 실어 보낸다 |
| `heal` | `a, d, amt, dhp, s` | 회복. `dhp` = 회복 후 HP |
| `buff` | `u, s, stat, v, until` (+ `amt` 배리어 총량) | 창 적용 또는 갱신. `until` = 만료 시각(소수 1자리) |
| `buffEnd` | `u, s` | 창 만료 (그 틱의 행동 처리 **앞에서**) |
| `end` | `won, reason` | **마지막 이벤트**. `reason ∈ clear \| retreat \| wipe \| timeout` |

유닛 키: 파티 `p0..`, 적 `e0..`(라운드마다 0부터).

**순서 보장** — ① `t` 는 단조 비감소 ② `round` 가 라운드의 첫 이벤트 ③ `end` 가 마지막 ④ 같은 `t` 안에서는 배열 순서가 곧 발생 순서(스킬 이벤트도 같다 — `skill` 뒤에 그 시전의 타격·회복·버프가 이어진다).

**스킬 실행 규칙** (정의·선택은 §2-8 `skill.js`, 실행은 여기):

| 규칙 | 내용 |
|---|---|
| 발동 | 행동 주기 도래 시 준비된 액티브 중 하나(§2-8 `pickReady`). 없으면 기본 공격. **한 차례에 하나**. 선택은 rng 를 쓰지 않는다 |
| 쿨 | 시전 순간 `readyAt = t + cool_sec × max(CD_MIN_MULT, 1 − cdr/100)`(실시간 초). 전투 시작 시 전부 준비라 첫 차례는 `priority` 로 갈린다. `cdr` 은 `combat_stat.csv:cooldown_reduction` — **표기 쿨에 곱**한다 |
| HP 재생 | 매 틱 `regenAcc += hp_regen × TICK`, 정수부가 1 이상이면 그만큼 회복하고 소수부만 남긴다(`hp = min(hpMax, …)`). **행동 처리 앞**에서 돌고 rng 를 안 쓴다. 소수점을 매 틱 더하면 타임라인이 흘러넘치고 재생기의 정수 HP 와 어긋나서 정수 단위로 끊는다 |
| 버프 창 | `until = t + duration_sec`. 만료는 매 틱 **행동 앞에서** 일괄 처리(`until ≤ t + EPS`) → `buffEnd`. rng 소비 없음 |
| `atk_pct` | 상시 % 와 **같은 괄호에 덧셈**(`atkBase`/`atkPct`). 다른 스킬의 같은 stat 은 덧셈, 같은 스킬은 갱신 |
| `period_pct` | `period = basePeriod × (1 − Σ/100)` — **다음 차례 예약부터**. 진행 중인 `next` 는 안 건드린다. 하한 처리 없음 |
| `barrier_pct` | `amt = round(대상 hpMax × v/100)`. 피해는 배리어 → HP 순. 재시전은 총량·`until` 을 다시 채우고, 창이 끝나면 남은 것은 사라진다. **흡혈·반사는 배리어가 먹은 몫을 포함한 `dmg`** 에 비례한다(직격이 들어간 사실은 같다) |
| `taunt` | 창이 켜진 **생존 파티원**이 있으면 적의 단일 대상 선택이 그 유닛(배열 순 첫 번째)으로 고정되고 **타겟 rng 를 쓰지 않는다**. ⚠ 기본 타겟팅(무작위) 위에 얹은 임시 규칙 |
| 타겟팅 | `enemy_single` 무작위 1 → 같은 대상에 `hits` 회 / `enemy_all` 생존 적 배열 순 전원 각 1회(타겟 rng 0) / `enemy_rotate` 시작점 무작위 → 배열 순으로 돌아가며 `hits` 회(모자라면 겹침) / `enemy_chain` 시작점 무작위 → 전원 각 1회, k번째(0-base) 배율 `mult × (1 − decay/100)^k` |
| 다단타 | **타격마다 `formula.strike` 1회** — 적중·치명·흡혈·반사·전투불능을 따로 굴린다. 스킬 배율은 `skillMult`, 원소 태그는 `atkType` 에 **그 타격 동안만** 얹고 원복한다(`strike` 시그니처 불변). ⚠ 대상이 쓰러지면 남은 타수는 **버린다**(재지정 없음) · 공격자가 반사로 쓰러지면 중단 |
| 회복 | `amt = round(matk × mult_pct/100)` 를 생존 아군 전원에게, `hp = min(hpMax, hp + amt)`. rng 소비 없음. 화염 치유 감소는 미구현 |
| `status` | `skill.csv:status`(결빙 등)는 **코드가 읽지 않는다** — `status_effect.csv` 미발행 |
| `tags` | `skill.js` 가 **정규화·검증**하지만 **전투 로직은 읽지 않는다** — 소비자는 전술카드 조건·변형 노드·화면이다 (§2-8 · skill_design §11) |

### 2-7. `state.js` — 상태 전이

`export const SAVE_VERSION = 5`

`createGameSystem(deps)` — `deps`: `hero, item, battle, skill, balance, equipSlots [{id, part}](착용 위치 9), stages(byId), stageOrder [id], monsters(byId), codex {levels:[cards_to_next], bonus:[%], statByNum:{stage_num: statKey}}`.
`codex.levels`/`codex.bonus` 는 codex_level.csv(`cards_to_next`/`bonus_pct`) · `codex.statByNum` 은 codex_series.csv 출처. `equipSlots` 만 ⚠ `ui/mock.js`.

**모든 함수는 `state` 를 첫 인자로 받고 그 객체를 직접 바꾼다.** 시스템 자체는 무상태. 시각이 필요한 함수는 `now`(ms) 를 받는다.

| export | 시그니처 | 결과 |
|---|---|---|
| `newGame(seed, candidates, now)` | `→ state` | 후보 = 로스터 = 파티. 각자 시작 무기 1개 착용. 시작 무기 rng = `deriveSeed(seed, 0)` |
| `serialize(state, now)` | `→ json` | `clone + {version, savedAt}`. 순수 |
| `deserialize(obj)` | `→ state` **또는 throw** | v5 는 그대로, **v2·v3·v4 는 안에서 연쇄로 올린다**(v2→v3→v4→v5, §4). 그 외 버전은 throw. 누락 필드 기본값 보정 |
| `canLoad(obj)` | `→ bool` | `deserialize` 가 통과하는가. **받아들이는 버전 목록을 두 곳에 두지 않기 위해** 실제로 한 번 돌려 보고 답한다 — 화면이 버전 숫자로 직접 판정하면 이관을 늘릴 때마다 멀쩡한 세이브를 거부하게 된다 |
| `heroById(state, uid)` · `heroItems(state, h)` · `isInjured(h, now)` | 조회 | |
| `codexLevel(cards)` · `codexNext(cards)` · `codexMaxLevel()` · `codexBonusAt(lv)` · `codexBonus(state)` | 도감 | `codex.levels` 는 **레벨당 증분**, 여기서 누적한다 |
| `heroCombat(state, h)` | `→ combat` | `computeCombat(h, 착용품, codexBonus)` |
| `equipTarget(hero, item)` | `→ position 또는 null` | 같은 부위의 빈 위치 우선, 없으면 첫 위치 |
| `equip(state, heroUid, itemUid, position?)` | `→ {ok, back:[uid], position}` / `{ok:false, err}` | err: `missing` · `class` · `twoHanded` · `bagFull` |
| `unequip(state, heroUid, position)` | `→ {ok}` / `{ok:false, err}` | err: `missing` · `bagFull` |
| `salvage(state, itemUid)` | `→ {ok, dust}` / `{ok:false, err}` | err: `missing`. 가방 아이템만 |
| `toggleParty(state, uid, now)` | `→ {ok}` / `{ok:false, err}` | err: `missing` · `injured` · `full` |
| `tickInjuries(state, now)` | 부작용 | 타이머 지난 부상 해제. **오프라인에 흐르는 유일한 시계** |
| `stageUnlocked(state, stageId)` | `→ bool` | 첫 스테이지 또는 직전 클리어 |
| `canDepart(state, stageId, now)` | `→ null` / `locked` / `noParty` / `injured` | |
| `resolveBattle(state, stageId, now)` | `→ {ok, result, report}` / `{ok:false, err}` | 전투 rng = `deriveSeed(seed, ++counters.battle)`. 시뮬 → XP(전원 동일) → 골드·가루 → 도감 → 드롭(가방 초과는 `discarded`) → 부상 타이머 → 클리어 → `lastReport` · `run` 갱신 |
| `closeRun(state, now)` | `→ notice 또는 null` | `run.repeat` 이 켜져 있을 때만: 끄고 `notice` 세팅. **오프라인 재정산 없음** |
| `dismissNotice(state)` | | |
| `tavernCandidates(state)` | `→ (hero\|null)[]` | rng = `deriveSeed(seed ^ 0x5A17, counters.tavern)` — 저장 없이 재현. 길이는 `tavern_candidates`, **고용한 칸은 `null`** |
| `tavernState(state, now)` | `→ {candidates, freeAt, free, cost}` | 선술집 화면 상태 한 덩어리 — **판정을 여기서 다 낸다**(`masteryState` 와 같은 규칙). `freeAt` = 무료 리롤이 열리는 시각(리롤한 적이 없으면 `0`) |
| `tavernReroll(state, now)` | `→ {ok, free}` / `{ok:false, err:'gold'}` | 쿨다운(`tavern_refresh_hours`)이 끝났으면 **무료**, 남았으면 `tavern_reroll_cost` 골드. `counters.tavern++` · `tavern = {rerolledAt: now, hired: []}` — 명단을 통째로 갈고 빈 칸을 되살린다 |
| `hire(state, index)` | `→ {ok, hero}` / `{ok:false, err}` | err: `roster` · `gold` · `missing`(빈 칸 포함). **`counters.tavern` 을 올리지 않는다** — 산 칸만 `tavern.hired` 에 남고 나머지 명단은 그대로다 (base_expedition_design §2-4: 고용이 무료 리롤 우회로가 되지 않게) |
| `masteryState(state, uid)` | `→ {points, nodes:[{id, treeKind, ownerId, tier, stat, value, rank, maxRank, unlockLevel, unlocked, total, canLearn}]}` / `null` | **판정을 여기서 다 낸다** — 화면은 결과만 그린다. 없는 영웅이면 `null` |
| `learnMastery(state, uid, nodeId)` | `→ {ok, rank, points}` / `{ok:false, err}` | 1랭크 = 1포인트. err: `missing`(영웅 없음 **또는 그 영웅의 트리에 없는 노드**) · `locked` · `maxRank` · `points` |
| `resetMastery(state, uid)` | `→ {ok, refunded, points}` / `{ok:false, err:'missing'}` | 롤백은 **무료 · 수시** (skill_design §5). 찍은 랭크 합을 전액 환급 |

**report** — `{at, stageId, won, reason, durationSec, gold, dust, xpEach, levelUps:[{uid, from, to, gains, points}], downed:[uid], drops:[itemUid], discarded, cards:{monsterId:n}, rounds, roundsCleared, strikes}`
`roundsCleared` 는 **깬 라운드 수**다 — 렌더러가 「이겼으면 전부, 아니면 하나 뺀다」로 짐작하던 값을 정산이 실어 보낸다(귀환 룰로 「라운드를 정리한 직후 철수」가 생겨 그 짐작이 틀릴 수 있다). 옛 리포트에는 없어서 **`undefined` 일 수 있다** — 렌더러가 그 경우를 다뤄야 한다.
`strikes` 는 `result.strikes` 의 복사본이고, 옛 리포트에는 없어서 **`null` 일 수 있다** — 렌더러가 그 경우를 다뤄야 한다.

`codexBonus(state)` 의 누적 객체는 **`codex.statByNum` 의 값들에서 만든다**(하드코딩 키 없음) — 계열 배정이 바뀌어도 state.js 를 고칠 필요가 없다. 다만 `computeCombat` 이 읽는 것은 `atk_pct` · `hp_pct` · `dmg_pct` 뿐이라 `acc_pct` 는 계산되고 버려진다 (§2-4).

`partyUnits(state)` 는 `{uid, combat, actives}` 를 만든다 — `actives = skill.activesFor(hero)`. **쿨·창·배리어는 세이브에 없다**(HP 와 같은 취급 — 전투 안에서만 산다).

### 2-8. `skill.js` — 액티브 정의 · 배정 · 발동 선택

`createSkillSystem(data)` — 주입 `data`: `balance`(현재 읽는 키 없음 — 계수는 전부 CSV 행에 있다), `rows`(= `skill.csv` 파싱 행). **실행은 하지 않는다**(§2-6 battle.js) — 유닛의 HP·버프를 만지지 않는다.

| export | 시그니처 | 계약 |
|---|---|---|
| `defs` | `{skillId: def}` | 정규화된 정의 |
| `list` | `[def]` | CSV 순서 |
| `activesFor(hero)` | `→ [skillId]` | **프로토타입** — `ownerKind === 'job' && ownerId === hero.cls` 인 행 **전부**를 `priority` 오름차순. 고유·무기군·전직 출처가 생기면 이 함수만 바뀐다 |
| `castable(def, ctx)` | `→ bool` | `ctx = {self, allies}`(allies = 생존 아군, self 포함). 아래 발동 조건 |
| `pickReady(actives, t, isCastable)` | `→ active \| null` | **순수** — `actives` 를 바꾸지 않고 정렬도 새 배열에서 한다. `readyAt ≤ t + EPS` **이고** 조건이 참인 것 중 `readyAt` 최소 → 동률이면 `priority` → 그래도 동률이면 배열 순 |
| `tagsOf(def)` | `→ [tag]` | 그 스킬이 실제로 갖는 태그 전부 — **파생 먼저, 그다음 정의한 것**. 세는 쪽(전술카드·화면)의 유일한 입구 |
| `TAGS` · `DERIVED_TAGS` · `MAX_TAGS` | `[10]` · `[3]` · `2` | 태그 어휘 13종과 정의 상한 (skill_design §11) |
| `EPS` | `1e-9` | 준비·만료 판정 허용 오차 (§5-3) |

**`def`** — `{id, ownerKind, ownerId, kind, target, hits, mult, decay, cool, dur, element, stat, value, cond, condValue, status, tags:[], derived:[], priority, name:{ko,en}}`
`mult`/`decay`/`value` 는 CSV 의 **% 숫자 그대로**(코드에서 `/100`), CSV 의 `-` 는 `null`.

**어휘 사전 — 정의는 CSV · 종류는 코드.** 이 밖의 값은 로드 시 `throw`(미니 DSL 인터프리터를 두지 않는다):

| 컬럼 | 값 |
|---|---|
| `owner_kind` | `job` · `advance` · `weapon_group` · `unique` (지금 발행된 행은 전부 `job`) |
| `owner_id` | 그 출처 안의 id — `owner_kind=job` 이면 직업 id |
| `kind` | `attack` · `heal` · `buff` |
| `target` | `enemy_single` · `enemy_all` · `enemy_rotate` · `enemy_chain` · `self` · `party` |
| `effect_stat` (buff 전용) | `atk_pct` · `barrier_pct` · `period_pct` · `taunt` |
| `cast_condition` | `-` · `buff_absent` · `ally_hp_below` |
| `element` | `-` + `hero.js:ELEMENTS` 4종 |
| `tags` | `-` 또는 `\|` 로 이은 **최대 2개** — `dot` · `shout` · `blessing` · `boost` · `restore` · `curse` · `control` · `transform` · `summon` · `sacrifice` |

**태그는 13종이고 컬럼에 적는 것은 10종뿐이다** (skill_design §11 확정 2026-08-28). 나머지 셋은 `target`·`hits` 에서 **파생**한다 — `aoe`(`enemy_all`·`enemy_chain`) · `single`(`enemy_single`) · `multihit`(`hits > 1`). `enemy_rotate`(순환)는 타수만큼만 닿으므로 **광역도 단일도 아니다**(§11-2 규칙 3). 파생 가능한 것을 컬럼에 또 적으면 두 곳 관리가 되어 반드시 어긋나므로, `tags` 에 파생 태그를 적으면 **로드가 실패한다**.

로드 시 그 밖에 던지는 것 — `attack` 인데 `hits < 1` · `buff` 인데 `duration_sec ≤ 0` 또는 `effect_stat` 없음 · `heal` 인데 `mult_pct ≤ 0` · `cool_sec ≤ 0` · `skill_id` 중복 · `owner_kind` 어휘 밖 · `owner_id` 빈 값 · **같은 출처(`owner_kind#owner_id`) 안 `priority` 중복** · `tags` 가 3개 이상 · 어휘 밖 태그 · 파생 태그를 적음 · 태그 중복.

**발동 조건** — 거짓이면 「준비된 것으로 치지 않는다」. 쿨은 그대로 두고 그 차례엔 다른 스킬이나 기본 공격이 나간다.

| `cast_condition` | 참인 때 |
|---|---|
| `-` | 항상 |
| `buff_absent` | 시전자에게 **이 스킬의 창이 없다** |
| `ally_hp_below` | 생존 아군 중 `hp/hpMax × 100 < cond_value` 인 자가 있다 |

---

## 3. 결과 코드 사전

| 코드 | 뜻 | 내는 곳 |
|---|---|---|
| `missing` | 대상 없음 / 가방에 없음 | equip · unequip · salvage · toggleParty · hire |
| `class` | 직업 전속 무기군 아님 | equip |
| `twoHanded` | 양손 무기 착용 중이라 보조 불가 | equip |
| `bagFull` | 가방 초과 | equip · unequip |
| `injured` | 부상 중 | toggleParty · canDepart |
| `full` | 파티 정원 | toggleParty |
| `locked` · `noParty` | 스테이지 잠김 / 파티 없음 · **마스터리 해금 레벨 미달** | canDepart · learnMastery |
| `gold` · `roster` | 골드 부족 / 로스터 정원 | tavernReroll · hire |
| `maxRank` · `points` | 랭크 상한 / 마스터리 포인트 부족 | learnMastery |

렌더러는 코드를 i18n 키로 바꿔 보여준다 (`ch.err.<code>` 등). **코드 문자열이 곧 계약** — 바꾸면 i18n 도 깨진다.

---

## 4. 세이브 스키마 v5

```
{
  version: 5, seed: uint32, createdAt: ms, savedAt: ms,
  resources: { gold, dust, stigma },
  heroes: [ hero ],                       // §2-4 hero 객체. equipped 키 = 착용 위치 9개 · mastery {nodeId:rank} · masteryPoints
  party: [ heroUid ],
  items: { itemUid: item },               // §2-5 item 객체
  bag: [ itemUid ],                       // 가방 순서 = 표시 순서
  progress: { cleared: [ stageId ] },
  codexCards: { monsterId: n },           // 도감 레벨의 출처. 누적, 소모 없음
  codexKills: { monsterId: n },           // 기록만
  counters: { hero, item, battle, tavern },   // uid 발급·시드 파생의 유일한 출처
  run: { stageId, repeat, lastAt, durationSec } | null,
  lastReport: report | null,
  notice: { kind: 'runClosed', stageId, at, seenAt } | null,
  tavern: { rerolledAt: ms | null, hired: [ slotIndex ] }   // 리롤 쿨다운의 기준 시각 · 이번 명단에서 산 칸. 명단 자체는 저장하지 않는다
}
```

- **uid 형식** — 영웅 `h{n}`, 아이템 `i{n}`. 발급은 `state.js:addHero / addItem` 만
- **HP 는 세이브에 없다** — 매 전투 최대치 시작. 부상은 `injuredUntil` 타이머 하나
- **타임라인은 세이브에 없다**
- **버전 정책** — 올릴 수 있는 버전은 `deserialize` 안에서 올리고, 못 올리는 버전은 throw. 렌더러는 throw 를 잡아 시작 화면에 사유를 보여준다 — 이 처리는 렌더러의 책임이지 state.js 의 계약이 아니다

**v2 → v3 이관** (2026-08-26 — 감각→운 · 명중/회피 폐지). `deserialize` 가 v2 를 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `heroes[*].stats` · `caps` | 키 `sen` → `luck`. **값도 자리(키 순서)도 그대로** — 순서가 흔들리면 표시 순서와 직렬화 결과가 갈린다 |
| `items[*].affixes` | `stat ∈ {accuracy, evasion}` 인 접사 **제거**. 폐지된 축이라 읽는 곳이 없다 |
| 무기 `watk` | **재굴림하지 않는다** — 편차 없이 굴려진 개체로 그대로 남는다(개체값은 개체의 역사다) |
| `version` | `3` |

**v3 → v4 이관** (2026-08-28 — 마스터리 수치층 신설). `deserialize` 가 v3 를 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `heroes[*].mastery` | 없으면 `{}` — 찍은 것이 없는 상태 |
| `heroes[*].masteryPoints` | 없으면 `(level − 1) × mastery_point_per_level` **소급 지급**. 이미 레벨업한 영웅이 안 받고 지나간 몫이라 새로 시작한 영웅과 같은 자리에 선다 |
| `version` | `4` |

**v4 → v5 이관** (2026-08-30 — 선술집 리롤 쿨다운). `deserialize` 가 v4 를 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `tavern` | 없으면 `{rerolledAt: null, hired: []}` — **쿨다운이 열려 있는 상태**로 올린다. 옛 세이브는 리롤한 적이 없으므로 기다린 시간을 소급할 근거가 없고, 닫힌 채로 올리면 접속하자마자 골드를 물린다 |
| `version` | `5` |

- **v2 는 v3·v4 를 거쳐 v5 까지 연쇄로 올라간다** — `upgradeV2` → `upgradeV3` → `upgradeV4` 순으로 통과한다
- **랭크는 전부 0 이라 이관이 전투 결과를 바꾸지 않는다** — 포인트만 늘어난다
- **v1 은 계속 throw** — 무기군·슬롯 9·도감 카드로 아이템/도감 스키마가 단절됐다. 하루 된 프로토타입 세이브라 새 게임으로 받는다
- `lastReport.strikes` 는 v3 이전 리포트에 없다 — 없으면 `null` 로 다룬다 (§2-7)
- 저장소 키(localStorage) `thesevensim.save` — `ui/storage.js` 만 안다. Phase 2 에서 이 파일만 파일 시스템/클라우드 어댑터로 교체

---

## 5. 결정론 계약

### 5-1. 시드 파생

| 스트림 | 시드 | 소유 |
|---|---|---|
| 시작 무기 | `deriveSeed(seed, 0)` | state.newGame |
| n번째 전투 | `deriveSeed(seed, counters.battle)` (선증가) | state.resolveBattle |
| 선술집 후보 | `deriveSeed(seed ^ 0x5A17, counters.tavern)` | state.tavernCandidates |
| 시작 후보 (새 게임 화면) | `makeRng(ROLL_SEED + roll)` — 고정 상수 | **ui/app.js** — 세이브 밖. 같은 리롤 횟수면 언제나 같은 3명 |
| 마스터 시드 | `now() >>> 0` 확정 시각 | ui/app.js → newGame |

### 5-2. rng 소비 순서 (바꾸면 같은 시드가 다른 게임이 된다)

| 위치 | 순서 |
|---|---|
| `formula.strike` | 적중 → (적중 시) 치명. **최대 2회**, 빗나가면 1회. 편차 굴림은 없다(무기 개체에 박혀 있다) |
| `hero.rollAttributes` | 축별 가중치 7회 → 합 맞추기 루프(가변, 최대 500회) → 자리 바꿈(소비 없음) |
| `hero.rollHero` | `rollAttributes` → `rollCaps` 7회 |
| `hero.rollStartParty(n)` | 이름 n → 죄종 n → 직업 n → 특성 n → 영웅 i 마다 `rollHero` |
| `hero.grantXp` | 레벨업 1회당 축별 7회 (상한 미달 축만) |
| `item.rollDrop` | 부위 → 베이스 → 희귀도 → `build` |
| `item.build` | 접두 죄종 → (레어) 접미 판정 → (성공 시) 접미 죄종 → 접사 수 → 접사마다 (정의 선택 → 값) → **개체 굴림 1회**(무기 = 공격력 편차 / 방어구 = implicit 편차 / **목걸이·반지 = 소비 없음**) → (마법 무기) 원소 |
| `item.build`(시작 무기) | 위와 같되 magic 이라 접미 판정을 하지 않는다 |
| `battle.spawnRound` | 보스: 호위 수 → 호위마다 풀 선택 / 일반: 정예마다 (죄종 → 풀 → 공통 특성 2) → 일반 수 → 일반마다 풀 |
| `battle.beginRound` | `spawnRound` → 적마다 등장 지연 1회 |
| `battle.simulate` 루프 | 틱마다 **창 만료 처리(소비 없음)** → `[...party, ...enemies]` 배열 순서로 `act` |
| `battle.act` 기본 공격 | 타겟 1회(**도발 중이면 0회**) → `strike` |
| `battle.act` 스킬 | 발동 선택 0회 → `enemy_single`: 타겟 1회(도발 무관 — 파티 스킬은 도발 대상이 아니다) → `hits` 회 `strike` / `enemy_rotate`·`enemy_chain`: 시작점 1회 → 타격마다 `strike` / `enemy_all`: 0회 → 대상마다 `strike` / `heal`·`buff`: 0회 |
| `battle.onKill` | 카드 판정 1회 → **드롭 판정 1회**(처치당 최대 1개, 2026-08-28) → (드롭 시) ilvl 1회 → `rollDrop` |
| `state.resolveBattle` | `simulate` 가 쓴 rng 를 **이어서** 파티원마다 `grantXp` |

### 5-3. 결정론에 걸리는 코드 상수 (CSV 가 아니라 코드에 있는 값 — 이식 시 그대로 옮긴다)

| 상수 | 값 | 위치 | 비고 |
|---|---|---|---|
| `TICK` | 0.1 s | battle.js | 시뮬 해상도. 재생기도 같은 값 |
| 파티 첫 차례 엇갈림 | `i × 0.3` s | battle.js simulate | |
| 적 등장 지연 | `0.4 + rng × 0.6` s | battle.js beginRound | rng 소비 |
| 행동 주기 하한 | 0.4 s | hero.js computeCombat | |
| 보조 부위 implicit 배율 | ×1.5 | item.js implicitFor | ⚠ CSV 후보 |
| `watk` 반올림 | 소수 2자리 | item.js build | 밑수가 2.3 대역이라 정수 반올림이면 뭉개진다 |
| growth 축 접사 · 방어구 implicit 반올림 | 소수 1자리 (하한 0.1) | item.js rollAffixes · implicitFor | band·flat 접사는 정수(하한 1) |
| `damage_reduction` 반올림 | 소수 3자리 | hero.js computeCombat | 원천별 곱의 실효 % |
| 능력치 가중치 | `rng² + 0.04` | hero.js rollAttributes | 분포 모양 |
| 합 맞추기 가드 | 500회 | hero.js | |
| 선술집 시드 솔트 | `0x5A17` | state.js | |
| `action_period` 반올림 | 소수 3자리 | hero.js | |
| 타임라인 `t` 반올림 | 소수 1자리 | battle.js | |
| `EPS` | `1e-9` | skill.js | 준비(`readyAt ≤ t + EPS`)·만료(`until ≤ t + EPS`) 판정 허용 오차 — 틱 누산이 경계를 미세하게 밑도는 것을 막는다 |
| `CD_MIN_MULT` | 0.1 | battle.js | 쿨타임 감소의 바닥 — 표기 쿨의 이 배수 밑으로 안 내려간다. 0 이 되면 스킬이 매 차례 나가 예산이 무너진다 |
| 스킬 초기 `readyAt` | 0 | battle.js simulate | 전투 시작 시 전부 준비 — 첫 차례는 `priority` 로 갈린다 |

### 5-4. 부동소수

전부 JS `number`(IEEE754 double). `Math.round` / `toFixed` / `Math.floor(rng × n)` 의 결과가 계약에 들어간다. **이식 언어에서 double 을 써야 한다** — float32 로 계산하면 `Math.floor(rng × pool.length)` 의 경계에서 다른 인덱스가 나올 수 있다.

---

## 6. 재생기 계약 (`ui/battle.js` — 타임라인 소비자)

- 재생기는 **계산하지 않는다.** HP 는 이벤트의 `dhp` / `ahp` 를 그대로 쓴다
- 시각 `t` 까지의 이벤트를 배열 순서로 적용한다. 배속·일시정지·건너뛰기는 재생 속도의 문제
- `round` 이벤트에서 적 유닛을 통째로 다시 만든다 — 그래서 `round` 가 첫 이벤트여야 한다
- 모르는 `e` 는 무시한다. 모르는 유닛 키도 무시한다 (현재는 **조용히** — [부채 #6](DEV_PLAN.md))
- Phase 2 재생기는 위 표의 이벤트만 알면 된다. 연출(모션·팝업·로그 문구)은 재생기의 자유
- **재생기는 12종을 전부 안다** (2026-08-30 — `skill`·`heal`·`buff`·`buffEnd`·`regen` 소비 추가). 스킬 칸의 쿨은 `skill` 이벤트의 `ready` 로만 걷힌다 — 재생기가 쿨을 **계산하지 않는다**

---

## 7. 데이터 계약 — 무엇이 어디서 오는가

`ui/data.js:loadData` 가 fetch 하는 CSV **14개**(`FILES`): `balance` · `monster` · `stage` · `stage_round` · `round_budget` · `spawn_grade` · `codex_level` · `codex_series` · `weapon_group` · `skill` · `hero_attribute` · `combat_stat` · `chapter` · `mastery_node`.
**이 목록 = `src/data/*.csv` 전부**(`inherited/` 제외)여야 한다 — 읽히지 않는 SSOT 를 두지 않는다. `dev/test.html` 의 `csv:` 단정이 디렉터리 목록과 대조한다 (2026-08-28).

표시 헬퍼도 `ui/data.js` 가 낸다 — `monsterName(id)→{ko,en}` · `monsterFace(id)→path|null` · `monsterSin(id)` · `stageName(row)→{ko,en}` · `stageBgOf(id)` · `chapterOf(chapter)` · `eliteName(sin, baseId)`. mock 에 남은 것은 자산 경로(`FACE_DIR` · `BG_DIR` · `stageBg`)뿐이다.

**⚠ game_logic 이 주입받지만 CSV 가 아니라 `ui/mock.js` 에 있는 것** — UI 는 Phase 2 에서 버려지므로 **이 목록이 이식 차단 항목**이다:

| mock 항목 | 들어가는 곳 | 성격 |
|---|---|---|
| `SINS` 키 목록 | hero · item · battle | → 죄종 테이블(sin_mapping.md 과제) |
| `CLASSES` (`id, keyAttr, stage`) | hero | → 직업 CSV 신규 |
| `SLOTS` / `EQUIP_SLOTS` | item / state | → 슬롯 CSV 신규 (부위 8 · 위치 9) |
| `ELEMENT_IDS` | item | hero.js `ELEMENTS` 와 중복 — 하나로 |
| `ITEM_BASES` | item | → 계승 `equipment_base.csv` 연결(5부위) + 보조·목걸이·반지 신규 |
| `AFFIX_DEFS` (`{stat, scale, min, max, perIlvl?, slots?}` — §2-5) | item | → 계승 접사 매트릭스 연결. `scale` 3분류가 그대로 컬럼이 된다 |
| `nm` (이름 조립 규칙) | item.composeName | 데이터 층 함수 — CSV 가 아니라 **이식 대상 코드** |
| `HERO_NAME_POOL` · `HERO_TRAIT_POOL` | hero | → CSV 신규 |
| `SIN_TRAITS` · `COMMON_TRAITS` | battle | → 계승 `elite_trait.csv` 연결 |

`SKILL_DISPLAY`(액티브 아이콘·설명)는 **주입되지 않는다** — `ui/data.js:skillInfo` 가 화면에만 붙이는 표시 사전이라 이식 차단 목록이 아니다. 이름·표기 쿨 같은 게임 데이터는 `skill.csv` 가 든다 (2026-08-30 — `MOCK_ACTIVES` 목업 폐기).

---

## 8. 명문화한 암묵 계약

코드 주석이나 관례로만 있던 것. 이제부터는 계약이다.

1. **`strike` 의 rng 순서** — §5-2. 타입/검증이 강제하지 않는다. 바꾸려면 이 문서와 test.html 결정론 단정을 같이 바꾼다
2. **전투 루프의 rng 순서** — §5-2. 리팩터링으로 호출 순서가 바뀌면 회귀다
3. **uid 발급은 state.js 만** — `rollHero` / `rollDrop` 은 `uid: null`. 다른 모듈이 `counters` 를 만지지 않는다
4. **`grantXp` 는 in-place** — 호출자는 state 안의 hero 참조를 그대로 넘긴다. 복사본을 넘기면 성장이 사라진다
5. **`atk_physical` / `atk_magic` 은 배타** — 둘 다 있는 경우를 코드가 가정하지 않는다. 물리·마법 혼합 딜(스킬)이 생기면 이 계약을 다시 쓴다
6. **가방 용량 산수의 순서** — `equip` 은 실행 전에 `bag − 1 + back.length ≤ inventory_cap` 을 먼저 검사한다 (양손이면 `back` 이 2)
7. **`closeRun` 은 재정산하지 않는다** — `resolveBattle` 이 출발 시점에 통째로 정산한다는 전제. **파견·탐험(오프라인 진행형)이 들어오면 이 전제가 깨진다** — 그때 `closeRun` 을 재설계한다 (컨셉 락 따름정리 1)
8. **올릴 수 없는 세이브 버전은 throw** — 이관 가능한 버전(현재 v2·v3·v4)은 `deserialize` 안에서 올리고, 나머지는 던진다. 조용히 버리지 않는다. 잡는 건 렌더러
9. **`codex_level.csv:cards_to_next` 는 레벨당 증분** — 누적 아님 (2026-08-28 `cards_required` 에서 개명 — 이름이 오해를 부르던 자리다)
10. **`round` 가 라운드의 첫 이벤트** — §2-6 순서 보장
11. **`res` 는 항상 4원소 객체다** — 몬스터도 `{fire, cold, lightning, poison}` 을 든다(2026-08-26 타입 이원성 해소). `strike` 는 다른 모양을 가정하지 않으므로 정적 타입 언어에서도 인터페이스가 하나다
12. **`?tab=` 은 `?dev=` 뒤에** — 렌더러 부팅 순서. `startGame()` 이 탭을 원정으로 되돌린다
13. **스킬 배율·원소 태그는 타격 동안만 유닛 필드에 얹고 원복한다** — `strike` 시그니처는 불변이다. 다단타 도중 예외로 빠져나가면 유닛에 배율이 남으므로, 얹기와 원복은 한 함수(`strikeOnce`) 안에서만 한다
14. **`actives` 가 비면 rng 수열은 스킬 도입 전과 같다** — 만료 처리·발동 선택·회복·버프는 rng 를 쓰지 않고, 기본 공격 경로는 그대로다. 결정론 단정이 이것을 지킨다

---

## 9. 알려진 계약 위반 (2026-08-26)

고치지 않고 기록만 — 수정은 [DEV_PLAN.md §4](DEV_PLAN.md) 에서 관리. **번호는 그 표의 부채 번호**다.

| # | 위반 | 위치 |
|---|---|---|
| 4 | 예상 소요 시간 집계가 렌더러에 있음 | ui/app.js |
| 5 | §7 의 mock 잔류 데이터 | ui/mock.js |

해소됨(2026-08-26) — #1 `dmgBonus`↔`bonusPct` 필드명 불일치(이름 통일, 회귀 단정 있음) · #8 `res` 타입 이원성(§8 항목 11).
해소됨(2026-08-30) — #3 실효 쿨 공식: `ui/app.js` · `ui/tip.js` 의 사본을 `formula.effectiveCd` 로 갈아끼웠다. 이제 공식은 `game_logic` 한 곳에만 있다.
#2(`codexBonus` 의 `acc_pct` 를 아무도 읽지 않음)는 **코드 결함이 아니라 기획 공백으로 옮겨갔다** — 명중 폐지로 계열 하나가 비었다 ([GAME_DESIGN §10](../game_design/GAME_DESIGN.md)).

---

*마지막 업데이트: 2026-08-30 (**기획↔프로토타입 대조** — §2-6 `skill` 이벤트에 `ready` 추가 · `end.reason` 에 **`retreat`**(귀환 룰 · 판정 순서) · §2-4 `grantXp` 레벨 상한 · §2-7 선술집 3함수 재작성(`tavernState` 신설 · `hire` 가 카운터를 안 올린다) · **§4 세이브 v5**(`tavern` · v4→v5 이관) · §6 재생기가 12종을 전부 안다 · §7 `SKILL_DISPLAY` 는 주입 아님 · §9 부채 #3 해소) · 2026-08-28 (CSV 형태 최적화 — §7 CSV 13·표시 헬퍼 · §2-4/§2-5 `damageKind`/`release` · §2-6 드롭 = 처치당 최대 1개·`dropChanceMult` · §2-7 codex 출처 CSV · §2-8 `ownerKind`/`ownerId` · §5-2 드롭 판정 1회 · §8 항목 9 `cards_to_next`) · 2026-08-28 (액티브 스킬 엔진 — §2-8 skill.js 신설 · §2-6 스킬 실행 규칙·유닛 필드·이벤트 5종·result casts · §2-3 effectiveCd · §2-4 atk_pct_sum · §5-2 rng 순서 · §5-3 EPS·초기 readyAt · §7 CSV 9 · §8 항목 13·14) · 2026-08-26 (battle_design §9 개정 반영 — §2-3 전면 재작성 · 성장 곡선/개체 굴림/접사 3분류 · 적중 = 레벨 차 · 저항 상한형 · 세이브 v3 이관 · res 이원성 해소) · 2026-08-26 (최초 작성 — 코드 인벤토리에서 계약 추출)*
