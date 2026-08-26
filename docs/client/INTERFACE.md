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
formula.js(balance) ─────────────┐
hero.js(data) ───────────────────┤
item.js(data) ──────────┐        │  hero · item · battle 은 **각자 내부에서 createFormula(balance) 를 만든다**
battle.js(data, itemSystem) ─────┤  (성장 곡선 growthMult · 피해 감소 곱 · strike 를 시뮬과 같은 함수에서 읽기 위해)
state.js(deps: hero, item, battle, balance, …) ──┘
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

`createFormula(balance) → { growthMult, mitigation, physicalDefense, resCap, appliedResist, reductionMult, hitChance, strike, indirect, leech }`
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
| `stats` | `[{id}]` 기본 능력치 7종, 순서 = 표시 순서. id = `str, agi, int, vit, luck, ldr, cha` (5번째가 `luck` — 08-26 감각→운) | ⚠ `ui/mock.js:STATS` |
| `sins` | `[sinId]` | ⚠ `ui/mock.js:SINS` 키 |
| `classes` | `[{id, keyAttr, stage}]` (`stage` = `main` / 확장) | ⚠ `ui/mock.js:CLASSES` |
| `weaponGroups` | `{id: {period, attackType, variance, …}}` | weapon_group.csv |
| `namePool` | `[{ko,en}]` | ⚠ `ui/mock.js` |
| `traitPool` | `[{ko,en}]` | ⚠ `ui/mock.js` |

| export | 시그니처 | 계약 |
|---|---|---|
| `rollAttributes(rng, favor)` | `→ {statId: v}` | **합 고정(`hero_attr_total`), 모양만 굴림**. `favor`(직업 주력 축)가 최고치가 되도록 자리만 바꾼다 |
| `rollHero(rng, {sin, cls, name, trait})` | `→ hero` | `uid: null` 로 돌려준다 — **uid 발급은 state.js 의 권한** |
| `rollStartParty(rng, n)` | `→ hero[]` | 이름·죄종·직업·특성이 n명 사이에서 겹치지 않는다. 직업은 `stage === 'main'` 만 |
| `rollCandidates` | = `rollStartParty` | 선술집 후보 |
| `xpNeeded(level)` | `→ int` | `round(hero_xp_base × level ^ hero_xp_exp)` |
| `grantXp(hero, amount, rng)` | `→ {uid, from, to, gains}` 또는 `null` | **hero 를 in-place 로 바꾼다**(xp·level·stats). 레벨업마다 축별 `attr_growth_chance_pct` 확률 +1, 히든 상한 `caps` 까지 |
| `computeCombat(hero, items, codex={})` | `→ combat` | 순수. 아래 표 |

**hero 객체** — `{uid, name:{ko,en}, tier, sin, cls, trait:{ko,en}, level, xp, stats:{7}, caps:{7}, equipped:{position: itemUid 또는 null}, injuredUntil: ms 또는 null}`
`tier` 는 `rare` / `unique`. `caps` 는 히든 상한 — **화면에 보여주지 않는다.**

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
| `crit_rate` · `crit_damage` | `base_crit_pct` / `base_crit_damage_pct` + Σ 접사. 확률 상한은 `strike` 에서 |
| `action_period` | `(무기군 period 또는 unarmed_period) / attrMult(agi) × (1 − Σaspd_pct/100)`, 하한 0.4 s, 소수 3자리 |
| `dmg_bonus_pct` | `codex.dmg_pct` 그대로 — 전투 유닛의 `bonusPct` 가 된다 |
| `gold_find` · `item_find` | `round(Σ접사 × attrMult(luck))` — **곱셈이라 장비가 0이면 0**(§8 곱셈 원칙). **운은 전투 계산 밖**이라 이 둘에만 걸린다 |

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
| `weaponGroups` | `{id: {id, ko, en, classes:[cls], twoHanded, period, variance, attackType, stage}}` | weapon_group.csv |
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

`createBattleSystem(data)` — 주입 `data`: `balance, monsters(byId), stages(byId), roundTypes [{round_num, round_type}], budgets(byKey), grades(byKey), sins, sinTraits {sin: trait}, commonTraits [trait], itemSystem`.
`sinTraits` / `commonTraits` 는 ⚠ `ui/mock.js` 출처.

| export | 시그니처 | 계약 |
|---|---|---|
| `stagePool(stage)` | `→ monsterIdx[]` | 해당 챕터·스테이지의 `spawn_grade === 'normal'` 몬스터 |
| `stageElement(stage)` | `(stage 행 객체) → elementId` \| `'physical'` | 그 스테이지 몬스터의 `attack_type` 중 physical 이 아닌 **첫 값**. 편성 화면의 "이 스테이지가 요구하는 저항"(§9-8) — 렌더러가 몬스터 테이블을 훑지 않게 여기 둔다 |
| `makeEnemy(key, monsterId, grade, lvl, extra?)` | `→ 전투 유닛` | 몬스터 → 유닛 변환 규칙 자체가 계약이라 내보낸다(검증이 직접 본다). 아래 |
| `simulate(partyUnits, stageId, rng)` | `→ result` | `partyUnits = [{uid, combat}]` (`combat` = `computeCombat` 결과). 아래 |

**전투 유닛 — 몬스터와 파티가 같은 필드 모양이다** (§8-1). `formula.strike` 가 읽는 이름 그대로 쓴다:
`{key, side, hp, hpMax, atk, atkType, def, res:{fire,cold,lightning,poison}, lvl, resMaxBonus, dr, defIgnore, resReduction, skillMult, bonusPct, crit, critDmg, ls, reflect, period, next}`

| 몬스터(`makeEnemy`) | 값 |
|---|---|
| `hp` · `atk` | `round(hp × grade.hp_mult × monster_hp_scale)` · `attack × grade.atk_mult × monster_atk_scale`(반올림 없음) — 성장 축 |
| `def` | `defense × grade.def_mult × monster_def_scale` (비율 축) |
| `res` | `{원소: monster.res_<원소> + grade.res_add}` — **직접 %**. 배율을 받지 않고 등급은 %p 가산만 |
| `lvl` | `stage.dlvl` — 몬스터마다 두지 않는다 (§9-4) |
| 나머지 | `crit 0` · `critDmg = base_crit_damage_pct` · `defIgnore 0` · `resReduction 0` · `skillMult 1` · `bonusPct 0` · `resMaxBonus 0` · `dr 0` · `ls 0` · `reflect 0` — 영웅 체계의 **부분집합**(§8-1) |

파티 유닛은 `computeCombat` 출력을 그대로 옮긴다 — `bonusPct ← dmg_bonus_pct` · `dr ← damage_reduction`(실효 %) · `res ← res_* 4종` · `lvl ← level`.

**result** — `{won, reason, durationSec, party:[{key, uid, hpMax, period}], timeline:[ev], xpTotal, gold, dust, kills:{monsterId:n}, cards:{monsterId:n}, drops:[item(uid null)], downed:[heroUid], roundsCleared, rounds:[{n, kind, killed:[monsterId], eliteSin}], strikes:{party:{n,miss}, enemy:{n,miss}}}`
- `reason` 은 `clear` / `wipe` / `timeout`
- `strikes` = 직격 시도 수와 빗나간 수. **레벨 부족의 전용 신호**라 리포트에 따로 낸다 (§9-4·§9-8). 세는 것뿐이라 **rng 를 소비하지 않는다**
- `drops` 의 아이템은 `uid: null` — state.js 가 가방에 넣으며 발급
- **`timeline` 은 세이브에 넣지 않는다.** 리포트만 남긴다

**타임라인 이벤트** — 전부 `{t, e, …}`. `t` = 초, 소수 첫째 자리 반올림.

| `e` | 필드 | 의미 |
|---|---|---|
| `round` | `n, kind, enemies:[{key, monsterId, grade, sin, traits, hpMax, period}]` | 라운드 시작. **그 라운드의 첫 이벤트** |
| `hit` | `a, d, dmg, crit, dhp` (+ `ahp` 흡혈 시) | 직격 적중. `dhp` = 피격 후 HP |
| `dodge` | `a, d` | 직격 빗나감 (적중 게이트 실패 — 회피 스탯은 없다. **키 이름은 계약이라 유지**) |
| `reflect` | `a, d, dmg, ahp` | 비직격 반사. `a` = 반사한 쪽 |
| `down` | `u` | 전투불능 |
| `card` | `u, monsterId` | 도감 카드 판정 성공 (처치와 별개) |
| `end` | `won, reason` | **마지막 이벤트** |

유닛 키: 파티 `p0..`, 적 `e0..`(라운드마다 0부터).

**순서 보장** — ① `t` 는 단조 비감소 ② `round` 가 라운드의 첫 이벤트 ③ `end` 가 마지막 ④ 같은 `t` 안에서는 배열 순서가 곧 발생 순서.

### 2-7. `state.js` — 상태 전이

`export const SAVE_VERSION = 3`

`createGameSystem(deps)` — `deps`: `hero, item, battle, balance, equipSlots [{id, part}](착용 위치 9), stages(byId), stageOrder [id], monsters(byId), codex {levels:[cards_required], bonus:[%], statByNum:{stage_num: statKey}}`.
`equipSlots` · `codex.bonus` · `codex.statByNum` 은 ⚠ `ui/mock.js` 출처.

**모든 함수는 `state` 를 첫 인자로 받고 그 객체를 직접 바꾼다.** 시스템 자체는 무상태. 시각이 필요한 함수는 `now`(ms) 를 받는다.

| export | 시그니처 | 결과 |
|---|---|---|
| `newGame(seed, candidates, now)` | `→ state` | 후보 = 로스터 = 파티. 각자 시작 무기 1개 착용. 시작 무기 rng = `deriveSeed(seed, 0)` |
| `serialize(state, now)` | `→ json` | `clone + {version, savedAt}`. 순수 |
| `deserialize(obj)` | `→ state` **또는 throw** | v3 는 그대로, **v2 는 안에서 v3 로 올린다**(§4). 그 외 버전은 throw. 누락 필드 기본값 보정 |
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
| `tavernCandidates(state)` | `→ hero[]` | rng = `deriveSeed(seed ^ 0x5A17, counters.tavern)` — 저장 없이 재현 |
| `tavernReroll(state)` | `→ {ok}` / `{ok:false, err:'gold'}` | `counters.tavern++` |
| `hire(state, index)` | `→ {ok, hero}` / `{ok:false, err}` | err: `roster` · `gold` · `missing`. 고용 후 `counters.tavern++` |

**report** — `{at, stageId, won, reason, durationSec, gold, dust, xpEach, levelUps:[{uid, from, to, gains}], downed:[uid], drops:[itemUid], discarded, cards:{monsterId:n}, rounds, strikes}`
`strikes` 는 `result.strikes` 의 복사본이고, 옛 리포트에는 없어서 **`null` 일 수 있다** — 렌더러가 그 경우를 다뤄야 한다.

`codexBonus(state)` 의 누적 객체는 **`codex.statByNum` 의 값들에서 만든다**(하드코딩 키 없음) — 계열 배정이 바뀌어도 state.js 를 고칠 필요가 없다. 다만 `computeCombat` 이 읽는 것은 `atk_pct` · `hp_pct` · `dmg_pct` 뿐이라 `acc_pct` 는 계산되고 버려진다 (§2-4).

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
| `locked` · `noParty` | 스테이지 잠김 / 파티 없음 | canDepart |
| `gold` · `roster` | 골드 부족 / 로스터 정원 | tavernReroll · hire |

렌더러는 코드를 i18n 키로 바꿔 보여준다 (`ch.err.<code>` 등). **코드 문자열이 곧 계약** — 바꾸면 i18n 도 깨진다.

---

## 4. 세이브 스키마 v3

```
{
  version: 3, seed: uint32, createdAt: ms, savedAt: ms,
  resources: { gold, dust, stigma },
  heroes: [ hero ],                       // §2-4 hero 객체. equipped 키 = 착용 위치 9개
  party: [ heroUid ],
  items: { itemUid: item },               // §2-5 item 객체
  bag: [ itemUid ],                       // 가방 순서 = 표시 순서
  progress: { cleared: [ stageId ] },
  codexCards: { monsterId: n },           // 도감 레벨의 출처. 누적, 소모 없음
  codexKills: { monsterId: n },           // 기록만
  counters: { hero, item, battle, tavern },   // uid 발급·시드 파생의 유일한 출처
  run: { stageId, repeat, lastAt, durationSec } | null,
  lastReport: report | null,
  notice: { kind: 'runClosed', stageId, at, seenAt } | null
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
| `battle.simulate` 루프 | 틱마다 `[...party, ...enemies]` 배열 순서로 `act` → 타겟 1회 → `strike` |
| `battle.onKill` | 카드 판정 1회 → 드롭 판정 `drop_roll` 회 → 드롭마다 (ilvl 1회 → `rollDrop`) |
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

### 5-4. 부동소수

전부 JS `number`(IEEE754 double). `Math.round` / `toFixed` / `Math.floor(rng × n)` 의 결과가 계약에 들어간다. **이식 언어에서 double 을 써야 한다** — float32 로 계산하면 `Math.floor(rng × pool.length)` 의 경계에서 다른 인덱스가 나올 수 있다.

---

## 6. 재생기 계약 (`ui/battle.js` — 타임라인 소비자)

- 재생기는 **계산하지 않는다.** HP 는 이벤트의 `dhp` / `ahp` 를 그대로 쓴다
- 시각 `t` 까지의 이벤트를 배열 순서로 적용한다. 배속·일시정지·건너뛰기는 재생 속도의 문제
- `round` 이벤트에서 적 유닛을 통째로 다시 만든다 — 그래서 `round` 가 첫 이벤트여야 한다
- 모르는 `e` 는 무시한다. 모르는 유닛 키도 무시한다 (현재는 **조용히** — [부채 #6](DEV_PLAN.md))
- Phase 2 재생기는 이 7종 이벤트만 알면 된다. 연출(모션·팝업·로그 문구)은 재생기의 자유

---

## 7. 데이터 계약 — 무엇이 어디서 오는가

`ui/data.js:loadData` 가 fetch 하는 CSV 8개: `balance` · `monster` · `stage` · `stage_round` · `round_budget` · `spawn_grade` · `codex_level` · `weapon_group`.
(`hero_attribute` · `combat_stat` · `equipment_option_override` 는 아직 코드가 읽지 않는다 — 문서용 SSOT)

**⚠ game_logic 이 주입받지만 CSV 가 아니라 `ui/mock.js` 에 있는 것** — UI 는 Phase 2 에서 버려지므로 **이 목록이 이식 차단 항목**이다:

| mock 항목 | 들어가는 곳 | 성격 |
|---|---|---|
| `STATS` (기본 능력치 7 id·순서 — `str agi int vit luck ldr cha`) | hero | → `hero_attribute.csv` 로 읽기 전환 |
| `SINS` 키 목록 | hero · item · battle | → 죄종 테이블(sin_mapping.md 과제) |
| `CLASSES` (`id, keyAttr, stage`) | hero | → 직업 CSV 신규 |
| `SLOTS` / `EQUIP_SLOTS` | item / state | → 슬롯 CSV 신규 (부위 8 · 위치 9) |
| `ELEMENT_IDS` | item | hero.js `ELEMENTS` 와 중복 — 하나로 |
| `ITEM_BASES` | item | → 계승 `equipment_base.csv` 연결(5부위) + 보조·목걸이·반지 신규 |
| `AFFIX_DEFS` (`{stat, scale, min, max, perIlvl?, slots?}` — §2-5) | item | → 계승 접사 매트릭스 연결. `scale` 3분류가 그대로 컬럼이 된다 |
| `nm` (이름 조립 규칙) | item.composeName | 데이터 층 함수 — CSV 가 아니라 **이식 대상 코드** |
| `HERO_NAME_POOL` · `HERO_TRAIT_POOL` | hero | → CSV 신규 |
| `SIN_TRAITS` · `COMMON_TRAITS` | battle | → 계승 `elite_trait.csv` 연결 |
| `CODEX_LEVEL_BONUS` · `CODEX_STAT_BY_NUM` | state.codex | → `codex_level.csv` 컬럼 추가 |

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
8. **올릴 수 없는 세이브 버전은 throw** — 이관 가능한 버전(현재 v2)은 `deserialize` 안에서 올리고, 나머지는 던진다. 조용히 버리지 않는다. 잡는 건 렌더러
9. **`codex_level.csv:cards_required` 는 레벨당 증분** — 누적 아님. 컬럼명만 보면 오해한다
10. **`round` 가 라운드의 첫 이벤트** — §2-6 순서 보장
11. **`res` 는 항상 4원소 객체다** — 몬스터도 `{fire, cold, lightning, poison}` 을 든다(2026-08-26 타입 이원성 해소). `strike` 는 다른 모양을 가정하지 않으므로 정적 타입 언어에서도 인터페이스가 하나다
12. **`?tab=` 은 `?dev=` 뒤에** — 렌더러 부팅 순서. `startGame()` 이 탭을 원정으로 되돌린다

---

## 9. 알려진 계약 위반 (2026-08-26)

고치지 않고 기록만 — 수정은 [DEV_PLAN.md §4](DEV_PLAN.md) 에서 관리. **번호는 그 표의 부채 번호**다.

| # | 위반 | 위치 |
|---|---|---|
| 3 | 실효 쿨 공식(`ceil(cd/cycle)×cycle`, battle_design §6)이 렌더러에만 있음 | ui/app.js |
| 4 | 예상 소요 시간 집계가 렌더러에 있음 | ui/app.js |
| 5 | §7 의 mock 잔류 데이터 | ui/mock.js |

해소됨(2026-08-26) — #1 `dmgBonus`↔`bonusPct` 필드명 불일치(이름 통일, 회귀 단정 있음) · #8 `res` 타입 이원성(§8 항목 11).
#2(`codexBonus` 의 `acc_pct` 를 아무도 읽지 않음)는 **코드 결함이 아니라 기획 공백으로 옮겨갔다** — 명중 폐지로 계열 하나가 비었다 ([GAME_DESIGN §10](../game_design/GAME_DESIGN.md)).

---

*마지막 업데이트: 2026-08-26 (battle_design §9 개정 반영 — §2-3 전면 재작성 · 성장 곡선/개체 굴림/접사 3분류 · 적중 = 레벨 차 · 저항 상한형 · 세이브 v3 이관 · res 이원성 해소) · 2026-08-26 (최초 작성 — 코드 인벤토리에서 계약 추출)*
