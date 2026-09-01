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
naming.js(sins) ─────────┐                │  naming.composeName 이 item 에 주입된다 (이름 조립 규칙)
hero.js(data, skillPool) ─│────────────────┤  skillPool = skill.list 의 id 목록 — **skill.js 를 먼저 만든다**(시스템 주입이 아니라 데이터 · 2026-09-01)
item.js(data) ───────────┘                │  hero · item · battle 은 **각자 내부에서 createFormula(balance) 를 만든다**
skill.js(balance, rows) ┐                 │  (성장 곡선 growthMult · 피해 감소 곱 · strike 를 시뮬과 같은 함수에서 읽기 위해)
skill_effects.js(순수 표) │                 │  skill.js 가 **어휘**를 · skill_runtime.js 가 **실행**을 같은 표에서 읽는다 — 「종류 하나 = 등록 한 번」 (§2-11 · 2026-09-01)
skill_runtime.js(ctx) ───┤                 │  battle.simulate 가 전투마다 만든다 — 시전·창·배리어·사건 훅. 직격(strike)·도발·전투불능은 battle 이 넘겨 준다 (§2-12)
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
| `classes` | `[{id, keyAttr, stage}]` (`stage` = `main` / 확장) | class.csv — **CSV 컬럼은 `release`**, 로더가 `stage` 로 주입한다(`stage` 는 스테이지와 충돌하는 이름이라 `weapon_group.csv` 와 같은 어휘를 쓴다). **행 순서 = 표시 순서** |
| `weaponGroups` | `{id: {period, damageKind, variance, …}}` | weapon_group.csv |
| `namePool` | `[{ko,en}]` | hero_name.csv — **행 순서가 결정론에 걸린다**(`drawDistinct` 가 인덱스를 굴린다) |
| `traitPool` | `[{ko,en}]` | hero_trait.csv — 행 순서 동일 |
| `masteryNodes` | `[mastery_node.csv 행]` — 랭크당 값·상한·해금 레벨은 **키 이름만** 들고 `balance` 에서 읽는다 | mastery_node.csv |
| `skillPool` | `[skillId]` — **고유 스킬 풀**. `skill.csv` **행 순서**(`rollInnate` 가 인덱스를 굴린다 — 결정론). 없으면 `[]` | `buildSystems` 가 `skill.list.map(d => d.id)` 로 넘긴다 — **시스템이 아니라 id 목록**이다(hero.js 는 skill.js 를 모른다). 풀 소속은 **`skill.csv:innate_pool`**(0/1)이 정한다 — 지금 14행 전부 1 (skill_design §9-0 · 2026-09-01) |

| export | 시그니처 | 계약 |
|---|---|---|
| `rollAttributes(rng, favor)` | `→ {statId: v}` | **합 고정(`hero_attr_total`), 모양만 굴림**. `favor`(직업 주력 축)가 최고치가 되도록 자리만 바꾼다 |
| `rollHero(rng, {sin, cls, name, trait})` | `→ hero` | `uid: null` 로 돌려준다 — **uid 발급은 state.js 의 권한**. **고유 스킬도 여기서 굴린다**(`rollCaps` 뒤 1회 — §5-2 · 2026-09-01) |
| `rollInnate(rng)` | `→ skillId \| null` | `skillPool` 에서 **균등 1개**(rng 1회). 풀이 비면 `null`(소비 0). `rollHero` 와 `state.upgradeV8`(옛 세이브 소급) 둘이 부른다 |
| `rollStartParty(rng, n)` | `→ hero[]` | 이름·죄종·직업·특성이 n명 사이에서 겹치지 않는다. 직업은 `stage === 'main'` 만 |
| `rollCandidates` | = `rollStartParty` | 선술집 후보 |
| `xpNeeded(level)` | `→ int` | `round(hero_xp_base × level ^ hero_xp_exp)` |
| `grantXp(hero, amount, rng)` | `→ {uid, from, to, gains, points}` 또는 `null` | **hero 를 in-place 로 바꾼다**(xp·level·stats). 레벨업마다 축별 `attr_growth_chance_pct` 확률 +1, 히든 상한 `caps` 까지. **마스터리 포인트도 여기서 준다** — `points = 오른 레벨 수 × mastery_point_per_level`, `hero.masteryPoints` 에 in-place 가산. **레벨 상한 `hero_level_cap` 에서 멈추고 `xp = 0` 이 된다** — 상한에 닿은 뒤의 지급은 `null` 을 돌려주고 아무것도 바꾸지 않는다 (⚠ 「50 이후 느린 곡선」은 미반영 — 곡선 숫자는 캘리브레이션 뒤, DEV_PLAN R12) |
| `computeCombat(hero, items, codex={})` | `→ combat` | 순수. 아래 표 |
| `masteryNodes` · `masteryById` | `[node]` · `{nodeId: node}` | 정규화된 노드. `node = {id, treeKind, ownerId, tier, stat, value, maxRank, unlockLevel}` |
| `masteryNodesFor(hero)` | `→ [node]` | 그 영웅의 죄종 트리 + 직업 트리. `ownerId === '*'` 는 그 `treeKind` 전부에 걸린다 |
| `masteryBonus(hero)` | `→ {flat:{stat:v}, dr:[v]}` | 찍은 랭크 × 랭크당 값. `damage_reduction` 만 따로 — 원천별 곱이라 합치면 안 된다 |

**hero 객체** — `{uid, name:{ko,en}, tier, sin, cls, trait:{ko,en}, innate: skillId, level, xp, mastery:{nodeId:rank}, masteryPoints, stats:{7}, caps:{7}, equipped:{position: itemUid 또는 null}, injuredUntil: ms 또는 null}`
`innate` 는 **고유 스킬 id** — 생성 시 1회 굴리고 이후 불변(hero_design §1). 액티브 1번 칸이 된다(§2-8 `activesFor`). `skill.csv` 에서 그 행이 지워지면 `activesFor` 가 **빈 고유 칸으로 취급**한다(던지지 않는다).
`skillOrder`(**선택 필드** — 없으면 없는 것) — `[skillId]`, 플레이어가 정한 액티브 칸 순서. 있으면 `activesFor` 가 그 순서를 앞에 둔다(§2-8). 저장은 우선순위 변경 UI 가 생길 때 시작한다 — 기본값이 곧 「없음」이라 이관이 필요 없다 (2026-09-01 자리만).
`tier` 는 `rare` / `unique`. `caps` 는 히든 상한 — **화면에 보여주지 않는다.**
`mastery` 는 **찍은 것만** 담는다(랭크 0 은 키가 없다) · `masteryPoints` 는 남은 포인트. 죄종·직업 마스터리가 **한 풀을 공유**한다 (skill_design §1-4).

**`computeCombat` 출력** — 필드가 **있거나 없거나**로 표현되는 것이 있다. `attrMult(v) = 1 + v × attr_bonus_per_point / 100`:

| 필드 | 계약 |
|---|---|
| `atk_physical` **또는** `atk_magic` | **둘 중 하나만 존재.** 무기군 `damageKind === 'magic'` 이면 `atk_magic`(지능), 아니면 `atk_physical`(힘). 맨손 = physical.<br>**무기가 밑수다**(§9-1) — `round( attrMult(int 또는 str) × 밑수 × (1+Σatk_pct/100) × (1+codex.atk_pct/100) )`, 밑수 = `watk + 무기 슬롯 **자신의** 접사 atk_flat 합`(맨손이면 `unarmed_atk`). **다른 슬롯의 `atk_flat` 은 더하지 않는다** |
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

`computeCombat(hero, items, codex, party)` — 4번째 인자 `party` 는 **파티 전술의 가산치** `{flat, dr}` 다(§2-9). 없으면 `null`. 마스터리와 **같은 자리에서 같은 채널로** 합류하고, 이 줄 아래로는 출처를 구분하지 않는다. 판정(어느 칸이 켜졌나 · 이 영웅이 파티인가)은 `state.js` 가 한다.

`codex` 입력은 `{atk_pct, hp_pct, dmg_pct}` 만 읽는다. `state.codexBonus` 가 함께 내는 `acc_pct` 는 **읽는 곳이 없다** — 명중 폐지로 생긴 공백이고 재배정은 기획 결정이다 ([GAME_DESIGN §10](../game_design/GAME_DESIGN.md) · [DEV_PLAN §3-2](DEV_PLAN.md)).

### 2-5. `item.js` — 아이템

`createItemSystem(data)` — 주입 `data`. 내부에서 `createFormula(balance)` 를 만든다(성장 곡선 `growthMult`).

| 필드 | 형태 | 출처(현재) |
|---|---|---|
| `balance` | | balance.csv |
| `slots` | `[partId]` 부위 7종 | equip_slot.csv — `part_order` 가 있는 행을 그 순서로. **이 순서가 `rollDrop` 의 부위 굴림에 직결된다**. 보조(offhand)는 2026-09-01 한손 개념 폐지와 함께 삭제 |
| `sins` | `[sinId]` | ⚠ mock |
| `weaponGroups` | `{id: {id, ko, en, classes:[cls], period, variance, damageKind, release}}` — `damageKind ∈ physical\|magic` · `release ∈ main\|expansion`(드롭은 `main` 만) | weapon_group.csv — **`hands` 컬럼·`twoHanded` 필드 없음**(2026-09-01 전 무기 양손) |
| `elements` | `[elementId]` | `game_logic/hero.js:ELEMENTS` — **코드가 SSOT**(08-31 mock 중복 삭제) |
| `itemBases` | `{part: [{ko,en}]}` 무기 외 부위 베이스 이름 | item_base.csv — **부위별 행 순서가 결정론에 걸린다** |
| `affixDefs` | `[{stat, scale:'growth'\|'band'\|'flat', min, max, perIlvl?, slots?}]` — `perIlvl` 은 **band 에만**, `slots` 없으면 전 부위 | affix.csv — `per_ilvl` 은 `band` 행만 값이고 로더가 그 행에만 `perIlvl` 키를 넣는다. **행 순서가 `rollAffixes` 의 풀 인덱스에 직결된다** |
| `composeName` | `(prefixSin, base, suffixSin 또는 null) → {ko,en}` | `game_logic/naming.js:createNaming({sins}).composeName` — §2-10 |

**item 객체** — `{uid, slot(part), rarity, ilvl, up, name:{ko,en}, implicit:{stat,v} 또는 null, affixes:[{stat,v}], sins:[sinId], group?, watk?, element?}`
- `rarity` 는 현재 `magic` / `rare` 만 굴린다
- `up` = 강화 단계 `0 … equip_upgrade_max`. **드롭이 굴리지 않는다** — 드롭·시작 무기는 언제나 `0` 이고 `upgrade` 만 올린다 (2026-08-31 신설)
- `group` / `watk` 는 무기만. `element` 는 **마법 무기군 개체**만. ~~`twoHanded`~~ 는 2026-09-01 폐지 — 전 무기가 양손이라 표현할 것이 없다
- 무기의 행동 주기·공격 타입·착용 직업은 아이템에 **박지 않는다** — 매번 `weaponGroups[group]` 에서 읽는다
- `sins` 는 죄종 **태그 목록**이지 포인트가 아니다 — 세트포인트 구조는 폐기됐다(08-26). 스키마는 그대로이고, 태그를 **세는 쪽**이 전술카드 조건이 된다 (tactic_card_design.md)

**개체 굴림** — 편차는 타격마다가 아니라 **드롭 시 한 번** 굴려 개체에 박는다 (§9-1 · item_design §2). `ε = (rng()×2 − 1) × 폭/100`:

| 부위 | 값 | 편차 폭 |
|---|---|---|
| 무기 `watk` | `round2( weapon_atk_base × growthMult(ilvl) × (1+ε) )` — **소수 2자리**(정수로 반올림하면 밑수 대역이 뭉개진다). ~~양손 배율~~ 은 2026-09-01 `weapon_atk_base` 로 흡수 | 무기군 정의의 `variance`(= `weapon_group.csv:variance_pct`), 없으면 `balance.csv:dmg_variance_pct` |
| 방어구 implicit `def_flat` | `round1( (armor_def_base + ilvl × armor_def_per_ilvl) × (1+ε) )` — 방어는 비율 축이라 **성장 곡선을 타지 않는다**. ~~보조 ×1.5~~ 는 슬롯과 함께 폐지 (2026-09-01) | `armor_def_variance_pct` (전역 하나) |
| 목걸이 · 반지 | implicit 없음 — **rng 소비도 없다** | — |

**접사 값 규칙** (`rollAffixes` — 정의의 `scale` 이 정한다, item_design §2-1). `roll = min + rng()×(max−min)`:

| scale | 값 | 해당 |
|---|---|---|
| `growth` | `max(0.1, round1(roll × growthMult(ilvl)))` — 소수 1자리 | `atk_flat` · `hp_flat` |
| `band` | `max(1, round(roll + ilvl × perIlvl))` — 정수 | `def_flat` |
| `flat` | `max(1, round(roll))` — 정수, **ilvl 무관** | 나머지 전부 (% · 저항 · 유틸) |

같은 stat 은 한 아이템에 두 번 붙지 않는다 — 정의 풀에서 뽑으면 제거한다. `slots` 가 그 부위를 포함하는 정의만 풀에 들어간다(`atk_flat` 은 `['weapon']` 전속).

**강화** (item_design §1 개정 2026-08-31 — R25). 골드를 먹고 `up` 을 1 올린다. **두 갈래가 서로 다른 방식으로 남는다**:

| 갈래 | 규칙 | 저장 |
|---|---|---|
| 베이스 능력치 | 무기 `watk` · 방어구 implicit `def_flat` 에 `× (1 + up × equip_upgrade_base_pct/100)` | **파생** — 원값은 안 건드린다 |
| 옵션(접사) 값 | `up` 이 `equip_upgrade_option_interval` 의 배수가 될 때마다(3·6·9) **보유 접사 중 랜덤 1개**의 값을 `× (1 + equip_upgrade_option_pct/100)` | **박는다** — `affixes[i].v` 를 직접 고친다 |

- **랜덤한 것은 박고, 결정적인 것은 파생한다.** 어느 접사가 뽑히느냐는 rng 라 다시 못 만들지만(그래서 세이브에 남아야 한다), 베이스 배율은 `up` 하나로 언제든 다시 계산된다 — 파생이면 단계마다 반올림이 쌓이지 않고 드롭 시 굴린 **개체값이 그대로 보존**된다(§2-5 개체 굴림)
- **재굴림은 없다** — 접사의 **종류·개수·순서**는 강화가 절대 안 바꾼다. 값만 오른다 (item_design §1)
- 값 상승은 그 접사의 `scale` 이 정한 반올림을 그대로 따르고 **최소 한 칸은 반드시 오른다** (`growth` = +0.1 · 나머지 = +1) — 비율만 곱하면 값이 작은 접사가 반올림에 먹혀 "강화했는데 아무 일도 안 일어난다"가 된다
- **베이스가 없는 부위(목걸이·반지)도 강화된다** — 옵션 갈래만 받는다. 부위 제한은 기획에 없다(⚠ 미정 — DEV_PLAN §3-3 R25)
- **실패는 없다** — 기획에 없는 규칙은 만들지 않는다. 제련소(파견처)의 「성공률/품질」 계수는 파견 미구현이라 아직 어디에도 안 걸린다

| export | 시그니처 | 계약 |
|---|---|---|
| `rollDrop(rng, ilvl)` | `→ item` | 부위 균등 → 베이스 → 희귀도(가중치) → `build`(§5-2 순서). `up = 0` |
| `startingWeapon(rng, cls)` | `→ item` | ilvl 1 · magic · 직업 전속 무기군(본편만). `up = 0` |
| `canEquip(hero, item)` | `→ null` / `class` | 무기 = 직업 전속 무기군 검사. **능력치 게이트 없음**. 2026-09-01 — 인자 3 → 2, 거절 사유 `twoHanded` 폐지(보조 슬롯 삭제) |
| `groupOf(item)` | `→ 무기군 정의 또는 null` | |
| `groupsFor(cls)` | `→ 무기군 정의[]` | 본편(`stage === 'main'`) 무기군만 |
| `salvageDust(item)` | `→ int` | 희귀도별. **강화 단계는 반환량에 안 들어간다** (기획 없음) |
| `upgradeMax()` | `→ int` | `equip_upgrade_max` |
| `upgradeCost(item)` | `→ int 또는 null` | 다음 한 단계의 골드. 상한이면 `null`. `round(base × growth^up)` |
| `upgrade(rng, item)` | `→ {up, affix: {stat, from, to} 또는 null}` | **in-place.** 옵션 계단이 아니면 `rng` 를 **한 번도 안 쓴다** |
| `effective(item)` | `→ item` | 베이스에 강화 배율을 먹인 **읽기용 사본**. `up === 0` 이거나 베이스가 없으면 **원본을 그대로** 돌려준다(할당 없음) |

### 2-6. `battle.js` — 헤드리스 전투

`createBattleSystem(data)` — 주입 `data`: `balance, monsters(byId), stages(byId), roundTypes [{round_num, round_type}], budgets(byKey), grades(byKey), sins, sinTraits {sin: trait}, commonTraits [trait], itemSystem, skillSystem`.
`sinTraits` / `commonTraits` 는 ⚠ `ui/mock.js` 출처. `skillSystem` 이 없으면 액티브 없이 기본 공격만 돈다.

| export | 시그니처 | 계약 |
|---|---|---|
| `stagePool(stage)` | `→ monsterIdx[]` | 해당 챕터·스테이지의 `spawn_grade === 'normal'` 몬스터 |
| `stageElement(stage)` | `(stage 행 객체) → elementId` \| `'physical'` | 그 스테이지 몬스터의 `attack_type` 중 physical 이 아닌 **첫 값**. 편성 화면의 "이 스테이지가 요구하는 저항"(§9-8) — 렌더러가 몬스터 테이블을 훑지 않게 여기 둔다 |
| `makeEnemy(key, monsterId, grade, lvl, extra?)` | `→ 전투 유닛` | 몬스터 → 유닛 변환 규칙 자체가 계약이라 내보낸다(검증이 직접 본다). 아래 |
| `simulate(partyUnits, stageId, rng)` | `→ result` | `partyUnits = [{uid, combat, actives?, reactions?}]` (`combat` = `computeCombat` 결과, `actives` = **인스턴스** `[{id, source}]` = `skill.activesFor` — 정의는 `skill.resolve` 로 푼다 · `reactions` = `[{on, fn}]` 사건 훅 핸들러, ⚠ 소비자 없음 — 2026-09-01). **`actives` 가 없거나 비면 기본 공격만 돌고 rng 수열은 스킬 도입 전과 같다.** 아래 |

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
| `matkBase` | `matk / (1 + atk_pct_sum/100)` — 회복 밑수의 괄호 앞 값. 유효 `matk = matkBase × (1 + (atkPct + Σ버프 atk_pct)/100)` — `atk` 와 **같은 괄호**(2026-09-01). 몬스터 0 |
| `basePeriod` | `period` 의 원값. `period = basePeriod × (1 − Σ버프 period_pct/100)` |
| `actives` | `[{id, def, readyAt, source}]` — 전투 시작 시 전부 `readyAt = 0`(전부 준비). `source` 는 배정 출처(`innate`/`job`) — 화면 라벨용, 전투는 읽지 않는다. 몬스터 `[]` |
| `reactions` | `[{on, fn}]` — 사건 훅 핸들러 (§2-12). 기본 `[]`. ⚠ 등록하는 소비자가 아직 없다 — 마스터리 T3(반응 패시브)의 자리 (2026-09-01) |
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
**유닛 생성은 `makeUnit(side, combatLike, extra)` 하나다** (2026-09-01) — 몬스터는 `combatFromMonster(m, grade, lvl)` 이 `computeCombat` 과 **같은 필드 이름**의 객체를 만들어 같은 생성자를 지난다(원소 공격 몬스터도 `atk_physical` 에 값을 둔다 — `attack_type` 이 원소를 든다). 두 벌이던 필드 나열이 한 곳으로 모여 필드를 늘리면 양쪽이 자동으로 같다 — §8 항목 11 의 이원성이 재발할 자리가 없어졌다. `makeEnemy` export 는 이 생성자를 지나되 값은 종전과 같다.

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
| 쿨 | 시전 순간 `readyAt = t + cool_sec × max([balance.csv:skill_cd_floor_mult], 1 − cdr/100)`(실시간 초 — 바닥은 2026-09-01 코드 상수 `CD_MIN_MULT` 에서 CSV 키로). 전투 시작 시 전부 준비라 첫 차례는 `priority` 로 갈린다. `cdr` 은 `combat_stat.csv:cooldown_reduction` — **표기 쿨에 곱**한다 |
| HP 재생 | 매 틱 `regenAcc += hp_regen × TICK`, 정수부가 1 이상이면 그만큼 회복하고 소수부만 남긴다(`hp = min(hpMax, …)`). **행동 처리 앞**에서 돌고 rng 를 안 쓴다. 소수점을 매 틱 더하면 타임라인이 흘러넘치고 재생기의 정수 HP 와 어긋나서 정수 단위로 끊는다 |
| 버프 창 | `until = t + duration_sec`. 만료는 매 틱 **행동 앞에서** 일괄 처리(`until ≤ t + EPS`) → `buffEnd`. rng 소비 없음 |
| `atk_pct` | 상시 % 와 **같은 괄호에 덧셈**(`atkBase`/`atkPct`). 다른 스킬의 같은 stat 은 덧셈, 같은 스킬은 갱신. **회복 밑수 `matk` 도 같은 괄호**(`matkBase` · 2026-09-01) — 함성 아래의 사제는 때리는 만큼 낫는다 |
| `period_pct` | `period = basePeriod × (1 − Σ/100)` — **다음 차례 예약부터**. 진행 중인 `next` 는 안 건드린다. 하한 처리 없음 |
| `barrier_pct` | `amt = round(대상 hpMax × v/100)`. 피해는 배리어 → HP 순. 재시전은 총량·`until` 을 다시 채우고, 창이 끝나면 남은 것은 사라진다. **흡혈·반사는 배리어가 먹은 몫을 포함한 `dmg`** 에 비례한다(직격이 들어간 사실은 같다) |
| `taunt` | 창이 켜진 **생존 파티원**이 있으면 적의 단일 대상 선택이 그 유닛(배열 순 첫 번째)으로 고정되고 **타겟 rng 를 쓰지 않는다**. ⚠ 기본 타겟팅(무작위) 위에 얹은 임시 규칙 |
| 타겟팅 | `enemy_single` 무작위 1 → 같은 대상에 `hits` 회 / `enemy_all` 생존 적 배열 순 전원 각 1회(타겟 rng 0) / `enemy_rotate` 시작점 무작위 → 배열 순으로 돌아가며 `hits` 회(모자라면 겹침) / `enemy_chain` 시작점 무작위 → 전원 각 1회, k번째(0-base) 배율 `mult × (1 − decay/100)^k` |
| 다단타 | **타격마다 `formula.strike` 1회** — 적중·치명·흡혈·반사·전투불능을 따로 굴린다. 스킬 배율은 `skillMult`, 원소 태그는 `atkType` 에 **그 타격 동안만** 얹고 원복한다(`strike` 시그니처 불변). ⚠ 대상이 쓰러지면 남은 타수는 **버린다**(재지정 없음) · 공격자가 반사로 쓰러지면 중단 |
| 회복 | `amt = round(matk × mult_pct/100)` 를 생존 아군 전원에게, `hp = min(hpMax, hp + amt)`. `matk` 는 **버프 괄호를 탄 값**(위 `atk_pct` 행 · battle_design §9-2 「회복 = 마법 공격력 × 배율」). rng 소비 없음. 화염 치유 감소는 미구현 |
| 사건 훅 | `cast`(skill 이벤트 push 직후 · 시전자) · `hit`(hit 이벤트 push 직후 · 공격자) · `hitTaken`(같은 자리 · 피격자) · `kill`(`downed(target)` **뒤** · 공격자 — 드롭 rng 가 먼저 돈다) · `down`(쓰러진 유닛). `unit.reactions` 의 `{on, fn}` 을 **배열 순**으로 부른다. 핸들러가 rng 를 쓰면 **그 자리에서** 소비한다(§5-2). 등록이 없으면 rng·타임라인 불변 — 골든이 이것을 잠근다 (2026-09-01) |
| `status` | `skill.csv:status`(결빙 등)는 **코드가 읽지 않는다** — `status_effect.csv` 미발행 |
| `tags` | `skill.js` 가 **정규화·검증**하지만 **전투 로직은 읽지 않는다** — 소비자는 전술카드 조건·변형 노드·화면이다 (§2-8 · skill_design §11) |

### 2-7. `state.js` — 상태 전이

`export const SAVE_VERSION = 9`

`createGameSystem(deps)` — `deps`: `hero, item, battle, skill, tactic, balance, equipSlots [{id, part}](착용 위치 8), stages(byId), stageOrder [id], monsters(byId), codex {levels:[cards_to_next], bonus:[%], statByNum:{stage_num: statKey}}`.
`codex.levels`/`codex.bonus` 는 codex_level.csv(`cards_to_next`/`bonus_pct`) · `codex.statByNum` 은 codex_series.csv 출처. `equipSlots` 는 equip_slot.csv 를 `slot_order` 로 정렬한 것(08-31 — mock 잔류 해소).

**모든 함수는 `state` 를 첫 인자로 받고 그 객체를 직접 바꾼다.** 시스템 자체는 무상태. 시각이 필요한 함수는 `now`(ms) 를 받는다.

| export | 시그니처 | 결과 |
|---|---|---|
| `newGame(seed, candidates, now)` | `→ state` | 후보 = 로스터 = 파티. 각자 시작 무기 1개 착용. 시작 무기 rng = `deriveSeed(seed, 0)` |
| `serialize(state, now)` | `→ json` | `clone + {version, savedAt}`. 순수 |
| `deserialize(obj)` | `→ state` **또는 throw** | v9 는 그대로, **v2~v8 은 안에서 연쇄로 올린다**(v2→…→v9, §4). 그 외 버전은 throw. 누락 필드 기본값 보정 |
| `canLoad(obj)` | `→ bool` | `deserialize` 가 통과하는가. **받아들이는 버전 목록을 두 곳에 두지 않기 위해** 실제로 한 번 돌려 보고 답한다 — 화면이 버전 숫자로 직접 판정하면 이관을 늘릴 때마다 멀쩡한 세이브를 거부하게 된다 |
| `heroById(state, uid)` · `heroItems(state, h)` · `isInjured(h, now)` | 조회 | |
| `codexLevel(cards)` · `codexNext(cards)` · `codexMaxLevel()` · `codexBonusAt(lv)` · `codexBonus(state)` | 도감 | `codex.levels` 는 **레벨당 증분**, 여기서 누적한다 |
| `heroCombat(state, h)` | `→ combat` | `computeCombat(h, 착용품, codexBonus, 파티 전술)`. **전술은 `state.party` 에 든 영웅에게만** 넘어간다 — 벤치는 `null` (§2-9). 착용품은 `item.effective` 를 통과해 들어간다 — **강화 배율을 아는 곳은 `item.js` 하나**이고 `hero.computeCombat` 은 `up` 을 모른다 |
| `equipTarget(hero, item)` | `→ position 또는 null` | 같은 부위의 빈 위치 우선, 없으면 첫 위치 |
| `equip(state, heroUid, itemUid, position?)` | `→ {ok, back:[uid], position}` / `{ok:false, err}` | err: `missing` · `class` · `bagFull`. **`back` 은 언제나 0~1개** — 양손↔보조 배타가 사라져 둘이 돌아오는 경우가 없다 (2026-09-01) |
| `unequip(state, heroUid, position)` | `→ {ok}` / `{ok:false, err}` | err: `missing` · `bagFull` |
| `salvage(state, itemUid)` | `→ {ok, dust}` / `{ok:false, err}` | err: `missing`. 가방 아이템만 |
| `upgradeState(state, itemUid)` | `→ {up, max, cost, gold, canUpgrade, optionAt}` / `null` | **판정을 여기서 다 낸다.** `optionAt` = 다음 옵션 상승이 걸리는 단계(없으면 `null`). 없는 아이템이면 `null` |
| `upgradeItem(state, itemUid)` | `→ {ok, up, cost, affix}` / `{ok:false, err}` | err: `missing` · `maxUp` · `gold`. **가방·착용 가리지 않는다**(`items` 에 있으면 된다) — 강화는 소유물에 하는 일이지 자리에 하는 일이 아니다. `counters.upgrade++` · rng = `deriveSeed(seed ^ 0xF0C3, counters.upgrade)` |
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
| `tacticState(state)` | `→ {totalLevel, open, count, lockedCount, rerollCost, canReroll, slots:[{no, open, unlockTotalLevel, locked, option, have, need, active}]}` | **판정을 여기서 다 낸다** — 해금(로스터 **합산 레벨**) · 조건 카운터(`have / need`) · **잠금** · **전체 리롤 비용**. 안 열린 칸은 `option: null`.<br>⚠ **[개정 2026-09-01 · 구현 전]** 칸의 `cost` 는 사라졌다 — 비용은 칸이 아니라 **잠금 개수**가 정하므로 판 전체에 하나뿐이다(`rerollCost`). `canReroll` 은 「열렸고 안 잠긴 칸이 하나라도 있고 골드가 충분한가」 |
| `tacticBonus(state)` | `→ {flat, dr}` | 켜진 칸들의 효과 합. `heroCombat` 이 파티원에게만 넘긴다 |
| `rerollTactic(state)` | `→ {ok, rolled:[{no, option}], cost}` / `{ok:false, err}` | ⚠ **[개정 2026-09-01 · 구현 전]** 인자에서 `slotNo` 가 빠졌다 — **열렸고 안 잠긴 칸을 한 번에 전부** 굴린다 (tactic_card_design §5-6). err: `allLocked`(굴릴 칸이 없다 — 전부 잠갔거나 열린 칸이 없다) · `gold`. `counters.tactic++` **1회** · rng = `deriveSeed(seed ^ 0x7AC7, counters.tactic)` **하나로 칸 번호 오름차순 연속 뽑기**(§5-2) · 후보에서 빼는 것 = **잠긴 칸의 옵션 + 굴리기 직전 열린 칸이 들고 있던 옵션 + 이번에 이미 뽑은 것** |
| `toggleTacticLock(state, slotNo)` | `→ {ok, locked}` / `{ok:false, err}` | ⚠ **[신설 2026-09-01 · 구현 전]** 칸 하나의 잠금을 뒤집는다. **무료**이고 rng·카운터를 안 탄다 — 값은 리롤할 때 `rerollCost` 로 치른다. err: `missing`(없는 칸) · `locked`(안 열린 칸은 못 잠근다) |

**report** — `{at, stageId, won, reason, durationSec, gold, dust, xpEach, levelUps:[{uid, from, to, gains, points}], downed:[uid], drops:[itemUid], discarded, cards:{monsterId:n}, rounds, roundsCleared, strikes}`
`roundsCleared` 는 **깬 라운드 수**다 — 렌더러가 「이겼으면 전부, 아니면 하나 뺀다」로 짐작하던 값을 정산이 실어 보낸다(귀환 룰로 「라운드를 정리한 직후 철수」가 생겨 그 짐작이 틀릴 수 있다). 옛 리포트에는 없어서 **`undefined` 일 수 있다** — 렌더러가 그 경우를 다뤄야 한다.
`strikes` 는 `result.strikes` 의 복사본이고, 옛 리포트에는 없어서 **`null` 일 수 있다** — 렌더러가 그 경우를 다뤄야 한다.

`codexBonus(state)` 의 누적 객체는 **`codex.statByNum` 의 값들에서 만든다**(하드코딩 키 없음) — 계열 배정이 바뀌어도 state.js 를 고칠 필요가 없다. 다만 `computeCombat` 이 읽는 것은 `atk_pct` · `hp_pct` · `dmg_pct` 뿐이라 `acc_pct` 는 계산되고 버려진다 (§2-4).

`partyUnits(state)` 는 `{uid, combat, actives}` 를 만든다 — `actives = skill.activesFor(hero)`(**인스턴스 `[{id, source}]` · 1번이 고유** — 2026-09-01). `partyMembers(state)`(전술 문맥용)는 **정의**를 넘긴다 — `activesFor(h).map(a => skill.resolve(a))` — `tactic.contextOf` 의 계약이 「actives = 스킬 정의」이기 때문이다. ⚠ 2026-09-01 까지 id 를 넘겨 `skill_tag` 조건 4종이 영원히 0 을 셌다(회귀 단정 있음). **쿨·창·배리어는 세이브에 없다**(HP 와 같은 취급 — 전투 안에서만 산다).

### 2-8. `skill.js` — 액티브 정의 · 배정 · 발동 선택

`createSkillSystem(data)` — 주입 `data`: `balance`(**`active_slots` 하나** — 칸 수 상한. 계수는 전부 CSV 행에 있다), `rows`(= `skill.csv` 파싱 행), `tagRows`(= `skill_tag.csv` 파싱 행 — **태그 어휘의 SSOT** · 2026-09-01). **실행은 하지 않는다**(§2-12 skill_runtime.js) — 유닛의 HP·버프를 만지지 않는다.
**어휘는 §2-11 `skill_effects.js` 의 표에서 온다** (2026-09-01) — `kind`·`target`·`effect_stat`·`cast_condition` 의 허용값은 그 표의 키이고, 이 파일은 배열을 따로 두지 않는다. 어휘와 실행이 같은 표를 읽으므로 둘이 어긋날 자리가 없다.

| export | 시그니처 | 계약 |
|---|---|---|
| `defs` | `{skillId: def}` | 정규화된 정의 |
| `list` | `[def]` | CSV 순서 |
| `activesFor(hero)` | `→ [{id, source}]` | **[개정 2026-09-01 · 인스턴스]** 배정 단위는 id 가 아니라 **인스턴스**다 — 우선순위 저장 · 전직 1택 · 변형 노드(`override`)가 전부 여기 얹힌다. 순서: 고유(`source: 'innate'`, 정의에 있을 때만) → `ownerKind === 'job' && ownerId === hero.cls` 인 행(`source: 'job'`, `priority` 오름차순) · 중복 id 제거 · `hero.skillOrder`(선택 필드 · §2-4)가 있으면 그 순서를 앞에 → **`active_slots` 개로 자른다.** `innate` 가 없는 입력(스텁)은 직업 행만. 무기군·전직 출처가 생기면 이 함수만 바뀐다 (skill_design §9-0) |
| `resolve(active)` | `→ def \| null` | 인스턴스 → 정의. 지금은 `defs[active.id]`. ⚠ 변형 노드가 오면 `active.override` 를 여기서 덧씌운다 — 소비자(battle · tactic · 화면)는 `defs[id]` 를 직접 찾지 않고 이것만 부른다 (§8 항목 16) |
| `castable(def, ctx)` | `→ bool` | `ctx = {self, allies}`(allies = 생존 아군, self 포함). 아래 발동 조건 |
| `pickReady(actives, t, isCastable)` | `→ active \| null` | **순수** — `actives` 를 바꾸지 않고 정렬도 새 배열에서 한다. `readyAt ≤ t + EPS` **이고** 조건이 참인 것 중 `readyAt` 최소 → 동률이면 **배열 순(칸 순서)**. `skill.csv:priority` 는 동률 결정자가 **아니다**(2026-09-01 — 직업 행이 칸에 앉는 기본 순서에만 쓴다 · battle_design §5 「우선순위는 플레이어가 정한다」 · 고유 칸이 1번에 오면서 CSV 값이 출처를 섞어 화면의 「슬롯 순 = 우선순위」와 어긋나던 것을 바로잡았다) |
| `tagsOf(def)` | `→ [tag]` | 그 스킬이 실제로 갖는 태그 전부 — **파생 먼저, 그다음 정의한 것**. 세는 쪽(전술카드·화면)의 유일한 입구 |
| `TAGS` · `DERIVED_TAGS` · `MAX_TAGS` | `[10]` · `[3]` · `2` | 태그 어휘 13종과 정의 상한 (skill_design §11). **어휘는 `skill_tag.csv` 에서 온다**(`derived` 0 → `TAGS` · 1 → `DERIVED_TAGS` · 2026-09-01). 로드 시 검증 — `tag_id` 유일 · `category ∈ {damage, buff, debuff, other}` · `derived ∈ {0,1}` · 파생 3종이 정확히 `aoe/single/multihit`(`derivedTagsOf` 가 그 셋을 낸다) · 표가 비면 throw |
| `EPS` | `1e-9` | 준비·만료 판정 허용 오차 (§5-3) |

**`def`** — `{id, ownerKind, ownerId, kind, target, hits, mult, decay, cool, dur, element, stat, value, cond, condValue, status, tags:[], derived:[], priority, name:{ko,en}, icon, desc:{ko,en}, note, innatePool}`
`icon`·`desc` 는 플레이어 표시(2026-09-01 — 종전 `ui/mock.js:SKILL_DISPLAY`), `note` 는 설계 노트(옛 `description_kr`), `innatePool` 은 고유 풀 소속(§2-4 `skillPool`).
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
**[강화 2026-09-01] 종류↔대상 정합** — `attack` 은 `enemy_*` 만 · `heal`/`buff` 는 `self`/`party` 만 · `enemy_all`/`enemy_chain` 은 `hits = 1`(타수는 대상 수가 정한다) · `decay` 는 `enemy_chain` 만 0 이상 100 미만, 그 외 0 · `heal`/`buff` 는 `hits = 0` · `buff` 는 `mult = 0` · `attack` 은 `mult > 0`·`dur = 0` · `ally_hp_below` 는 `0 < cond_value ≤ 100`, 그 외 조건은 `cond_value = 0`. 컬럼 하나가 대상마다 뜻이 달라 값이 **조용히 무시되던** 자리를 로드 시 막는다.

**발동 조건** — 거짓이면 「준비된 것으로 치지 않는다」. 쿨은 그대로 두고 그 차례엔 다른 스킬이나 기본 공격이 나간다.

| `cast_condition` | 참인 때 |
|---|---|
| `-` | 항상 |
| `buff_absent` | 시전자에게 **이 스킬의 창이 없다** |
| `ally_hp_below` | 생존 아군 중 `hp/hpMax × 100 < cond_value` 인 자가 있다 |

---

### 2-9. `tactic.js` — 파티 전술 정의 · 조건 판정 · 리롤 후보

`createTacticSystem(data)` — 주입 `data`: `slots`(= `tactic_slot.csv` 파싱 행) · `options`(= `tactic_option.csv`) · `sins` · `classes` · `weaponGroups` · `skillSystem`. **무상태** — 어느 칸에 무엇이 들었는지는 세이브가 들고(§4) 이 모듈은 규칙만 낸다.

**칸은 획득물이 아니다** (tactic_card_design §5) — 로스터 **합산 레벨**이 칸을 열고, 칸에 든 옵션은 재화로 간다.

| export | 시그니처 | 결과 |
|---|---|---|
| `slotList` · `slotCount` | `[{no, unlockTotalLevel, rerollCost}]` | 칸 수 = CSV 행 수. 로드 시 검증 — `slot_no` 는 1부터 빈틈없이 · 문턱은 오름차순 · **옵션 수 > 칸 수**(아니면 리롤할 여지가 없다) |
| `list` · `byId` | `[{id, condKind, condArg, condN, stat, value}]` | 로드 시 검증 — `cond_kind` 어휘 · 인자 타입(죄종 / 피해 종류 / 스킬 태그) · `stat` · `value ≠ 0`. 어긋나면 **throw** |
| `openCount(totalLevel)` | `→ n` | 문턱을 넘은 칸 수 |
| `contextOf(members)` | `→ ctx` | `members = [{sin, cls, items, actives}]` (**`actives` = 스킬 정의** — id 가 아니다. ⚠ 2026-09-01 까지 `state.partyMembers` 가 id 를 넘겨 태그가 0 으로 세어졌다 — 호출 쪽을 고쳤다 · §2-7). 조건이 세는 숫자를 한 번에 뽑는다 — 죄종·직업 분포 · 죄종 접사 수 · 무기 피해 종류 · **스킬 태그별 사람 수**(스킬 수가 아니다). ~~양손 수~~ 는 2026-09-01 폐지 |
| `measure(option, ctx)` | `→ {have, need, active}` | 조건 카운터. 화면이 「지금 / 필요」를 찍는다 |
| `bonusOf(options)` | `→ {flat, dr}` | 접사·마스터리와 **같은 채널**. `damage_reduction` 만 원천별 곱이라 따로 (battle_design §9-3) |
| `initialAssign(rng)` | `→ [optionId × slotCount]` | 풀을 **통째로 섞어** 앞에서부터 나눠 준다 — 리롤 카운터를 안 타므로 **리롤이 다른 칸을 흔들지 않는다**. 중복 없음 |
| `pick(rng, exclude)` | `→ optionId \| null` | 리롤 후보. 부르는 쪽이 지금 든 것 + 다른 칸에 든 것을 넘긴다 |

**조건 어휘 8종** (`cond_kind` — 이 밖의 값은 로드 시 throw): `always` · `party_size` · `sin_same` · `sin_kind` · `class_same` · `affix_sin`(인자: 죄종) · `damage_kind`(인자: physical/magic) · `skill_tag`(인자: 스킬 태그 10종 — §2-8 `TAGS`). ~~`two_hand`~~ 는 2026-09-01 폐지 — 전 무기가 양손이라 언제나 참이 되어 조건이 아니게 됐다(`tactic_option.csv` 의 `opt_two_hand` 행도 함께 삭제, 옵션 23 → 22).
전부 **편성에서 확정되는 값**이다 (tactic_card_design §2-1) — 전투 중에 변하는 축(현재 HP · 남은 적)은 어휘에 없다. **정의는 CSV · 종류는 코드** — 미니 DSL 을 두지 않는다 (§2-8 skill.js 와 같은 규약).

### 2-10. `naming.js` — 이름 조립 (2026-08-31 신설)

`createNaming(data)` — 주입 `data.sins` = `{sinId: {ko, en, adj}}`(⚠ 아직 `ui/mock.js:SINS`). **rng 를 쓰지 않는다** — 결정론 계약 밖이다.

**CSV 가 아니라 코드인 이유**: 언어별 어순·조사가 규칙이라 표로 적을 수 없다. 렌더러가 아니라 여기 있는 이유는 두 렌더러(장비 화면·관전)가 같은 규칙을 두 번 적으면 갈리기 때문이다.

| export | 시그니처 | 계약 |
|---|---|---|
| `composeName(prefixSin, base, suffixSin\|null)` | `→ {ko,en}` | ko `"분노의 <base> — 오만"` / en `"Wrathful <base> of Pride"`. `base` 는 문자열(양 언어 공통) 또는 `{ko,en}` — 무기군 정의도 `ko`/`en` 을 갖고 있어 그대로 들어온다. `item.js` 의 `composeName` 이 이것이다 |
| `eliteName(sin, base)` | `→ {ko,en}` | ko `"분노의 스켈레톤 기사"` / en `"Wrathful Skeleton Knight"`. `base` 는 몬스터 이름 `{ko,en}` — **id → 이름 조회는 `ui/data.js:eliteName` 이 맡는다**(`D.monsters` 는 브라우저가 fetch 한 것이라 game_logic 이 볼 수 없다) |

---

### 2-11. `skill_effects.js` — 「종류」 등록표 (2026-09-01 신설)

순수 모듈 · 상태 없음 · rng 없음. **종류 하나 = 여기 등록 한 번** — `skill.js` 가 어휘(허용값)를, `skill_runtime.js` 가 실행을 같은 표에서 읽으므로 두 곳이 어긋날 자리가 없다. 「정의는 CSV · 종류는 코드」(docs/reference/skill_architecture_survey §8)의 「코드」가 이 파일이다.

| export | 모양 | 계약 |
|---|---|---|
| `KINDS` | `['attack','heal','buff']` | `skill.csv:kind` 허용값 |
| `ATTACK_TARGETS` | `{ enemy_single, enemy_all, enemy_rotate, enemy_chain }` — 각 `(rt, u, def, foes) → void` | 공격 대상 4종의 **실행 자체**(§2-6 타겟팅 행 그대로 — rng 순서·hp 가드 불변). `rt` = §2-12 런타임 |
| `SUPPORT_TARGETS` | `['self','party']` | heal·buff 의 대상 |
| `TARGETS` | 위 둘의 합 | `skill.csv:target` 허용값 |
| `EFFECTS` | `{ atk_pct:{derive}, period_pct:{derive}, barrier_pct:{apply}, taunt:{} }` | `derive(u, sum)` = 그 stat 의 창 합으로 파생값을 **다시 쓴다**(sum 0 = 원값 복원) · `apply(rt, tgt, def, until, ev)` = 시전 순간 1회 · 둘 다 없는 항목은 표식(소비자 `battle.pickTarget`) |
| `EFFECT_STATS` | `Object.keys(EFFECTS)` | `skill.csv:effect_stat` 허용값 |
| `CONDITIONS` | `{ buff_absent, ally_hp_below }` — 각 `(def, ctx) → bool` | 발동 조건(§2-8 표). `ctx = {self, allies}` |
| `CONDITION_IDS` | `Object.keys(CONDITIONS)` | `skill.csv:cast_condition` 허용값 |
| `refreshDerived(u)` | `→ void` | `EFFECTS` 의 **키 순서**대로 `derive` 를 부른다(지금 `atk_pct` → `period_pct`). 순서가 계약이다 |

새 종류를 추가하는 절차 — 이 표에 항목 하나(+ 필요하면 §2-6 실행 규칙 행) → `skill.csv` 에서 그 값을 쓴다. `skill.js` · `battle.js` 는 건드리지 않는다.

### 2-12. `skill_runtime.js` — 시전 · 창 · 배리어 · 사건 훅 (2026-09-01 신설)

`battle.simulate` 가 **전투마다** 만든다 — 상태(`t` · 유닛)는 전부 인자·ctx 로 받고 모듈 전역은 없다.

`createSkillRuntime(ctx)` — `ctx = { SK, B, rng, timeline, out, units:{party, enemies}, strikeOnce, pickTarget, r1, EPS, hooks, cdFloor }`. `units.enemies` 는 라운드마다 simulate 가 갈아 끼우는 **속성**이라 런타임은 항상 `ctx.units.enemies` 를 읽는다. `strikeOnce`·`pickTarget` 은 battle.js 의 것을 그대로 받는다 — 직격·도발·전투불능 판정은 전투 진행의 몫이고 런타임은 **무엇을 시전하나**만 안다.

| export | 계약 |
|---|---|
| `act(u, t)` | §2-6 「발동」·「쿨」 행 — 준비된 것 없으면 `strikeOnce(u, pickTarget(u, foes), 1, null)`. 시전이면 `readyAt` · `out.casts` · `skill` 이벤트 · `hooks.emit('cast', …)` → `ATTACK_TARGETS[def.target]` / `castHeal` / `castBuff` |
| `expire(u, t)` | 창·배리어 만료(`until ≤ t + EPS`) → `buffEnd` → 바뀌었으면 `refreshDerived` |
| `castHeal(u, def, t)` · `castBuff(u, def, t)` | §2-6 회복·버프 창 행. 배리어는 `EFFECTS.barrier_pct.apply` |
| `alive(list)` · `alliesOf(u)` · `foesOf(u)` | 진영 조회 |
| `createHooks()` | `{ emit(name, unit, payload) }` — `unit.reactions` 의 `{on, fn}` 을 **배열 순**으로 부른다. 핸들러 시그니처는 **`fn(unit, payload)`**(`payload` 에 `t` 와 사건별 필드 — §2-6 「사건 훅」 행). 발화 지점·순서는 §5-2 |
| (런타임 객체 `rt`) | `act`·`expire`·`castHeal`·`castBuff`·`alive`·`alliesOf`·`foesOf` 에 더해 **`rng`·`strikeOnce`·`pickTarget`** 도 같은 객체에 싣는다 — 등록표(§2-11)의 대상 핸들러가 `rt.*` 만 보고 battle.js 를 import 하지 않게 하는 이음매 |

⚠ `reactions` 를 등록하는 소비자는 아직 없다 — 마스터리 T3(반응 패시브 · skill_design §1-2·§3-3)의 자리다. 등록이 0 이면 rng·타임라인이 훅 도입 전과 같다(골든 `tl` 이 잠근다).

---

## 3. 결과 코드 사전

| 코드 | 뜻 | 내는 곳 |
|---|---|---|
| `missing` | 대상 없음 / 가방에 없음 | equip · unequip · salvage · toggleParty · hire · **upgradeItem** |
| `class` | 직업 전속 무기군 아님 | equip |
| `bagFull` | 가방 초과 | equip · unequip |
| `injured` | 부상 중 | toggleParty · canDepart |
| `full` | 파티 정원 | toggleParty |
| `locked` · `noParty` | 스테이지 잠김 / 파티 없음 · **마스터리 해금 레벨 미달** · **전술 칸 미해금** | canDepart · learnMastery · rerollTactic |
| `gold` · `roster` | 골드 부족 / 로스터 정원 | tavernReroll · hire · **rerollTactic**(`gold`) · **upgradeItem**(`gold`) |
| `allLocked` | **굴릴 칸이 없다** — 열린 칸을 전부 잠갔거나 열린 칸이 하나도 없다 ⚠ [신설 2026-09-01 · 구현 전] | rerollTactic |
| `maxRank` · `points` | 랭크 상한 / 마스터리 포인트 부족 | learnMastery |
| `maxUp` | 강화 상한(`equip_upgrade_max`) 도달 | upgradeItem |

렌더러는 코드를 i18n 키로 바꿔 보여준다 (`ch.err.<code>` 등). **코드 문자열이 곧 계약** — 바꾸면 i18n 도 깨진다.

---

## 4. 세이브 스키마 v9

```
{
  version: 9, seed: uint32, createdAt: ms, savedAt: ms,
  resources: { gold, dust, stigma },
  heroes: [ hero ],                       // §2-4 hero 객체. equipped 키 = 착용 위치 8개 · mastery {nodeId:rank} · masteryPoints · innate(고유 스킬 id) · skillOrder?(선택 — 칸 순서)
  party: [ heroUid ],
  items: { itemUid: item },               // §2-5 item 객체 — `up`(강화 단계) 포함, 접사 값은 강화가 박아 둔 값
  bag: [ itemUid ],                       // 가방 순서 = 표시 순서
  progress: { cleared: [ stageId ] },
  codexCards: { monsterId: n },           // 도감 레벨의 출처. 누적, 소모 없음
  codexKills: { monsterId: n },           // 기록만
  counters: { hero, item, battle, tavern, tactic, upgrade },   // uid 발급·시드 파생의 유일한 출처
  run: { stageId, repeat, lastAt, durationSec } | null,
  lastReport: report | null,
  notice: { kind: 'runClosed', stageId, at, seenAt } | null,
  tavern: { rerolledAt: ms | null, hired: [ slotIndex ] },  // 리롤 쿨다운의 기준 시각 · 이번 명단에서 산 칸. 명단 자체는 저장하지 않는다
  tactics: { slots: { 칸번호: optionId } }   // **리롤로 바꾼 칸만.** 안 담긴 칸은 시드가 내는 첫 배정이다 (§2-9 initialAssign)
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

**v5 → v6 이관** (2026-08-30 — 파티 전술). `deserialize` 가 v5 를 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `tactics` | 없으면 `{slots: {}}` — **리롤한 적이 없는 상태**. 첫 배정은 저장하지 않으므로 채울 것이 없다 |
| `counters.tactic` | 없으면 `0` |
| `version` | `6` |

- 옛 세이브도 `seed` 가 같으므로 **새로 시작한 판과 같은 첫 배정**이 나온다 — 이관이 칸의 내용을 흔들지 않는다
- 칸이 이미 열려 있을 수 있다(합산 레벨이 문턱을 넘은 로스터) — 그건 이관이 아니라 판정이라 소급할 것이 없다

**v8 → v9 이관** (2026-09-01 — 레어 고유 스킬 프로토타입 배정 · hero_design §1 · skill_design §9-0). `deserialize` 가 v8 을 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `heroes[*].innate` | 없으면(`== null`) **시드에서 소급 배정** — 스트림 하나 `deriveSeed(seed ^ 0x5C11, 0)` 로 `heroes` **배열 순서대로** `hero.rollInnate` 1회씩. 이미 가진 영웅은 건드리지 않는다 |
| `version` | `9` |

- **옛 영웅도 새 영웅과 같은 자리에 선다** — 고유 칸이 비면 액티브가 직업 행만으로 돌아 새 영웅보다 못하므로 소급한다. 같은 세이브를 두 번 열면 같은 배정이다(스트림이 시드 고정)
- **전투 rng 수열과 섞이지 않는다** — 전용 솔트 `0x5C11`(§5-1·§5-3). 새 영웅의 고유 스킬은 이 스트림이 아니라 `rollHero` 를 부른 쪽의 rng(시작 후보 = UI 상수 · 선술집 = `^ 0x5A17`)에서 나온다
- 전투 결과는 바뀐다 — 액티브 구성이 달라지므로 이관 전후 같은 스테이지의 타임라인이 같지 않다. 이것은 이관의 부작용이 아니라 **기능**이다(옛 세이브에 고유 칸을 준다)

**v9 → v10 이관** ⚠ **[계획 2026-09-01 · 구현 전]** (전술 리롤 재설계 — tactic_card_design §5-6. ⚠ 같은 날 고유 스킬 소급 이관이 v9 를 먼저 썼으므로 **이 계획은 v10 으로 밀렸다**). `deserialize` 가 v9 를 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `tactics.locked` | 없으면 `[]` — **아무 칸도 안 잠긴 상태.** 옛 세이브에는 잠금이라는 개념이 없었으므로 소급할 것이 없다 |
| `version` | `10` |

- **칸의 내용은 안 바뀐다** — `tactics.slots` 는 그대로다. 이관이 들고 있던 옵션을 흔들지 않는다
- ⚠ **이 절은 계약을 먼저 적어 둔 것이고 코드에는 아직 없다** (DEV_PLAN §3-3). 구현이 오면 이 ⚠ 를 걷는다

**v7 → v8 이관** (2026-09-01 — 한손 개념 폐지 · 보조 슬롯 폐지). `deserialize` 가 v7 을 받으면 제자리에서 올린다:

- **보조 아이템을 지운다** — 착용분·가방분 모두 `state.items` 에서 삭제한다. 부위 자체가 없어져 돌려줄 자리가 없고, 가방에 남기면 영원히 못 끼는 짐이 된다
- **`heroes[*].equipped.offhand` 키 삭제** — 안 지우면 `deserialize` 끝의 `{...emptyEquip(), ...h.equipped}` 병합이 되살린다
- **`items[*].twoHanded` 삭제** · 무기군 개명 반영 — `sword1h` → `sword2h`(한손검 삭제) · `wand` → `orb`
- **직업이 안 맞게 된 무기는 가방으로** — 창이 전사 → 기사로 옮겨서, 창을 든 전사의 무기 칸이 빈다. ⚠ 이때 가방이 `inventory_cap` 을 넘길 수 있다. 상한은 새로 얻을 때만 막는 값이라 넘긴 채로 열려도 게임은 성립하고, 분해하면 정상으로 돌아온다

**v6 → v7 이관** (2026-08-31 — 강화 재정의 R25). `deserialize` 가 v6 을 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `items[*].up` | 없으면 `0` — **강화한 적이 없는 상태.** 옛 아이템의 `watk`·implicit·접사 값은 전부 강화 이전 값이므로 소급할 것이 없다 |
| `counters.upgrade` | 없으면 `0` |
| `version` | `7` |

- **강화 전 세이브는 전투 결과가 안 바뀐다** — `up = 0` 이면 `effective` 가 원본을 그대로 돌려준다(§2-5). 이관이 능력치를 흔들지 않는다는 뜻이다

- **v2 는 v3·v4·v5·v6·v7·v8 을 거쳐 v9 까지 연쇄로 올라간다** — `upgradeV2` → `upgradeV3` → `upgradeV4` → `upgradeV5` → `upgradeV6` → `upgradeV7` → `upgradeV8` 순으로 통과한다
  ⚠ **`upgradeV6`(세이브 이관)과 `item.upgrade`(장비 강화)는 이름만 닮은 남남이다** — 전자는 스키마 버전, 후자는 게임 규칙
- **랭크는 전부 0 이라 이관이 전투 결과를 바꾸지 않는다** — 포인트만 늘어난다
- **v1 은 계속 throw** — 무기군·슬롯·도감 카드로 아이템/도감 스키마가 단절됐다. 하루 된 프로토타입 세이브라 새 게임으로 받는다
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
| 장비 강화 | `deriveSeed(seed ^ 0xF0C3, counters.upgrade)` | state.upgradeItem — 전투·선술집·전술 어느 수열과도 안 섞인다 |
| 고유 스킬 소급 (v8→v9 이관) | `deriveSeed(seed ^ 0x5C11, 0)` | state.upgradeV8 — **옛 영웅에게만.** 새 영웅의 고유 스킬은 `rollHero` 안에서 그 호출자의 rng 로 굴린다(시작 후보 = UI 상수 · 선술집 = `^ 0x5A17`) |
| 시작 후보 (새 게임 화면) | `makeRng(ROLL_SEED + roll)` — 고정 상수 | **ui/app.js** — 세이브 밖. 같은 리롤 횟수면 언제나 같은 3명 |
| 마스터 시드 | `now() >>> 0` 확정 시각 | ui/app.js → newGame |

### 5-2. rng 소비 순서 (바꾸면 같은 시드가 다른 게임이 된다)

| 위치 | 순서 |
|---|---|
| `formula.strike` | 적중 → (적중 시) 치명. **최대 2회**, 빗나가면 1회. 편차 굴림은 없다(무기 개체에 박혀 있다) |
| `hero.rollAttributes` | 축별 가중치 7회 → 합 맞추기 루프(가변, 최대 500회) → 자리 바꿈(소비 없음) |
| `hero.rollHero` | `rollAttributes` → `rollCaps` 7회 → **`rollInnate` 1회**(고유 스킬 — 2026-09-01. 풀이 비면 0회) |
| `hero.rollStartParty(n)` | 이름 n → 죄종 n → 직업 n → 특성 n → 영웅 i 마다 `rollHero` |
| `hero.grantXp` | 레벨업 1회당 축별 7회 (상한 미달 축만) |
| `item.rollDrop` | 부위 → 베이스 → 희귀도 → `build` |
| `item.build` | 접두 죄종 → (레어) 접미 판정 → (성공 시) 접미 죄종 → 접사 수 → 접사마다 (정의 선택 → 값) → **개체 굴림 1회**(무기 = 공격력 편차 / 방어구 = implicit 편차 / **목걸이·반지 = 소비 없음**) → (마법 무기) 원소 |
| `item.build`(시작 무기) | 위와 같되 magic 이라 접미 판정을 하지 않는다 |
| `item.upgrade` | 옵션 계단(`up` 이 `equip_upgrade_option_interval` 의 배수)이면 **접사 선택 1회**, 아니면 **0회**. 베이스 갈래는 rng 를 안 쓴다 |
| `battle.spawnRound` | 보스: 호위 수 → 호위마다 풀 선택 / 일반: 정예마다 (죄종 → 풀 → 공통 특성 2) → 일반 수 → 일반마다 풀 |
| ⚠ `battle.stagePool` **순서** | `pool[Math.floor(rng × 3)]` 이 이 배열의 인덱스를 쓰므로 **순서 자체가 계약이다.** JS 에서 그 순서는 CSV 행 순서가 아니라 **`monster_idx` 오름차순** — `D.monsters` 가 정수 키 객체라 `Object.values` 가 정수 키를 강제로 오름차순 열거한다. 지금은 `monster.csv` 가 idx 순으로 쓰여 있어 **우연히 일치**할 뿐이다. **엔진에서 해시맵(순서 불정)을 쓰면 다른 게임이 된다** — 이식할 때 `monster_idx` 로 명시 정렬하라 (2026-08-31) |
| `battle.beginRound` | `spawnRound` → 적마다 등장 지연 1회 |
| `battle.simulate` 루프 | 틱마다 **창 만료 처리(소비 없음)** → `[...party, ...enemies]` 배열 순서로 `act` |
| `battle.act` 기본 공격 | 타겟 1회(**도발 중이면 0회**) → `strike` |
| `battle.act` 스킬 | 발동 선택 0회 → `enemy_single`: 타겟 1회(도발 무관 — 파티 스킬은 도발 대상이 아니다) → `hits` 회 `strike` / `enemy_rotate`·`enemy_chain`: 시작점 1회 → 타격마다 `strike` / `enemy_all`: 0회 → 대상마다 `strike` / `heal`·`buff`: 0회 |
| `battle.onKill` | 카드 판정 1회 → **드롭 판정 1회**(처치당 최대 1개, 2026-08-28) → (드롭 시) ilvl 1회 → `rollDrop` |
| 사건 훅(`reactions`) | 핸들러가 rng 를 쓰면 **발화 지점에서** 소비한다 — `cast` 는 skill 이벤트 뒤 · `hit`/`hitTaken` 은 hit 이벤트 뒤 · `kill` 은 `onKill`(드롭) **뒤** · `down` 은 down 이벤트 뒤. 지금 등록된 핸들러 0 → 소비 0 (2026-09-01) |
| `state.resolveBattle` | `simulate` 가 쓴 rng 를 **이어서** 파티원마다 `grantXp` |
| `tactic.initialAssign` | 풀 섞기 — 뒤에서 앞으로 `pool.length − 1` 회. 스트림 = `deriveSeed(seed ^ 0x7AC7, 0)` (**리롤 카운터를 타지 않는다**) |
| `tactic.pick` | 후보 1회. 스트림 = `deriveSeed(seed ^ 0x7AC7, counters.tactic)` — 선술집(`^ 0x5A17`)과 마찬가지로 전투 스트림과 섞이지 않는다.<br>⚠ **[개정 2026-09-01 · 구현 전] 전체 리롤은 이 스트림 하나로 여러 번 뽑는다** — `counters.tactic` 은 리롤 **1회에 한 번만** 오르고, 그 시드로 만든 rng 하나가 **굴릴 칸을 번호 오름차순으로** 돌며 `pick` 을 연속 호출한다. **이 순회 순서가 계약**이다: 순서를 바꾸면 같은 시드가 다른 판을 낸다 |

### 5-3. 결정론에 걸리는 코드 상수 (CSV 가 아니라 코드에 있는 값 — 이식 시 그대로 옮긴다)

| 상수 | 값 | 위치 | 비고 |
|---|---|---|---|
| `TICK` | 0.1 s | battle.js | 시뮬 해상도. 재생기도 같은 값 |
| 파티 첫 차례 엇갈림 | `i × 0.3` s | battle.js simulate | |
| 적 등장 지연 | `0.4 + rng × 0.6` s | battle.js beginRound | rng 소비 |
| 행동 주기 하한 | 0.4 s | hero.js computeCombat | |
| `watk` 반올림 | 소수 2자리 | item.js build | 밑수가 2.3 대역이라 정수 반올림이면 뭉개진다 |
| growth 축 접사 · 방어구 implicit 반올림 | 소수 1자리 (하한 0.1) | item.js rollAffixes · implicitFor | band·flat 접사는 정수(하한 1) |
| `damage_reduction` 반올림 | 소수 3자리 | hero.js computeCombat | 원천별 곱의 실효 % |
| 능력치 가중치 | `rng² + 0.04` | hero.js rollAttributes | 분포 모양 |
| 합 맞추기 가드 | 500회 | hero.js | |
| 선술집 시드 솔트 | `0x5A17` | state.js | |
| 고유 스킬 소급 시드 솔트 | `0x5C11` | state.js | v8→v9 이관 전용 스트림 (§5-1) |
| `action_period` 반올림 | 소수 3자리 | hero.js | |
| 타임라인 `t` 반올림 | 소수 1자리 | battle.js | |
| `EPS` | `1e-9` | skill.js | 준비(`readyAt ≤ t + EPS`)·만료(`until ≤ t + EPS`) 판정 허용 오차 — 틱 누산이 경계를 미세하게 밑도는 것을 막는다 |
| 스킬 초기 `readyAt` | 0 | battle.js simulate | 전투 시작 시 전부 준비 — 첫 차례는 `priority` 로 갈린다 |

### 5-4. 부동소수

전부 JS `number`(IEEE754 double). `Math.round` / `toFixed` / `Math.floor(rng × n)` 의 결과가 계약에 들어간다. **이식 언어에서 double 을 써야 한다** — float32 로 계산하면 `Math.floor(rng × pool.length)` 의 경계에서 다른 인덱스가 나올 수 있다.

### 5-5. 골든 시드 스냅샷 — **Phase 2 가 맞춰야 할 대상** (2026-08-31 신설)

위 §5-1~§5-4 는 규칙이고, 이것은 **그 규칙이 실제로 낸 답**이다. 엔진 쪽에서 같은 시드로 같은 지문이 나오면 이식이 성공한 것이다.

- 파일 — `src/dev/golden.json` (지문) · `src/dev/golden.js` (생성·대조). **둘 다 이식 대상이 아니다** — `dev/` 는 검증 도구라 엔진 쪽 언어로 다시 쓴다. 맞춰야 하는 것은 **JSON 의 값**이지 이 코드가 아니다
- 범위 — 시드 1~10 × 스테이지 101~104 = **40 런**. 캘리브레이션(시드 20 × 같은 4스테이지)과 **같은 조건**이라 두 표가 서로를 설명한다

#### 입력 지문 (`meta`) — **출력보다 먼저 대조한다**

`meta` 가 어긋났는데 `runs` 만 보면 원인이 아니라 증상을 보게 된다. 그래서 대조 순서가 계약의 일부다.

| 키 | 무엇 | 왜 |
|---|---|---|
| `csvHash` | `FILES` 23종 **각각의 원문 해시** (FNV-1a 32) | 어느 **파일**이 달라졌는지를 짚는다. ⚠ **이식 대상이 아니다** — 개발 중 회귀 탐지용. 개행 `\n` 정규화 · BOM 제거 후 센다(`parseCsv` 가 둘 다 무시하므로) |
| `balance` | `balance.csv` **전 키의 값** | 손잡이 5키만 보던 판(08-31 최초)은 밖의 15+ 키가 지문을 깨는데도 "같다"고 통과시켜 **회귀로 오진하게 만들었다.** 지금은 `키: 옛값 → 새값` 을 최대 8개 찍는다 |
| `knobs` | 5키(`monster_atk_scale`·`monster_hp_scale`·`hero_hp_base`·`weapon_atk_base`·`power_growth_per_level`) | **대조하지 않는다** — 사람이 읽는 통과 메시지의 문구일 뿐이다 (대조는 `balance` 가 한다) |
| `parties` | 시드 1~10 의 **시작 파티** — 영웅마다 `cls\|sin\|name.en\|trait.en\|고유 스킬\|능력치 7\|히든 상한 7\|시작 무기(드롭 지문 형식)` | `hero.drawDistinct`(이름·죄종·직업·특성) · `rollAttributes` · `rollCaps` · **`rollInnate`**(2026-09-01) · `item.startingWeapon` 이 전부 여기 있다. 이름·특성 풀의 **행 순서**는 여기서만 잡힌다 — 이름은 전투에 안 들어가서 `runs` 가 원리상 못 본다. 40런에 중복하지 않고 시드마다 한 번만 적는다 |

#### 런 하나를 만드는 절차 (이 순서가 곧 계약이다)

1. `hero.rollStartParty(makeRng(1000 + seed), party_size_max)`
2. `state.newGame(seed, party, 1700000000000)` — 시각은 고정 상수
3. `progress.cleared = [101,102,103].filter(s => s < stage)` — **해금만** 풀어준다(성장·장비 없음)
4. `state.tacticState` 로 **열린 칸 전체**를 먼저 읽고 (전술은 자기 rng 스트림이라 전투 수열과 안 섞인다 — §5-2)
5. `state.resolveBattle(state, stage, 1700000000000)`

#### 런 지문의 필드

| 필드 | 뜻 |
|---|---|
| `won` · `reason` · `rounds` · `cleared`(roundsCleared) · `sec` | 전투 결말 |
| `downed` | **파티 자리 번호**, uid 아님 |
| `gold` · `dust` · `xp`(xpTotal) · `xpEach` | 보상 |
| `events` | 타임라인 길이 — 구조 변화 감지 |
| `strikes` | `파티 n/miss · 적 n/miss` |
| `cards` | `몬스터id:장수` 오름차순 (도감 카드 — 처치의 10%만 뜬다) |
| `kills` | `몬스터id:처치수` 오름차순 — **스폰 구성**. `cards` 는 표본이 10% 라 편성을 못 본다 |
| `casts` | `스킬id:시전수` (id 오름차순). **스킬 선택은 rng 를 0회 쓴다** — 다른 어느 필드도 이 로직을 못 본다 |
| `elites` | 라운드별 `라운드:죄종:특성+특성+특성` (공백 구분). `spawnRound` 의 정예 굴림(죄종 · `pickTwo` 2회)과 `SIN_TRAITS`/`COMMON_TRAITS` 값이 여기 있다 — 특히 `pickTwo` 의 `if (b===a) b=(b+1)%len` 은 다른 곳에서 안 걸린다. 출처는 타임라인 `round` 이벤트(정예를 못 잡으면 `kills` 에 안 남으므로) |
| `grew` | **`resolveBattle` 뒤** 파티의 `L<레벨 합>/A<능력치 7종 총합>/M<masteryPoints 합>`. `grantXp` 는 `simulate` **다음에** 도는데 전투 결과만 보는 필드는 그 뒤를 못 본다 — 40런에서 레벨업 120회·rng 1,454회가 지문 밖이었다. ⚠ **정수 합만 적는다**(부동소수는 이식자를 ULP 로 고생시킨다) |
| `tactics` | **열린 칸 전체**를 `번호:옵션id:on\|off`. 켜진 것만 적으면 칸에 무엇이 들었는지가 안 남아, 배정이 바뀌어도 둘 다 조건 미달이면 지문이 침묵한다 |
| `tl` | 타임라인 전체의 FNV-1a 해시(`JSON.stringify(timeline)`). 위 요약 필드가 못 보는 **순서·값 변화**를 잡는다 — 어디가 깨졌는지는 위 필드들이 말하고 이 값은 「달라졌다」만 말한다. **결과 불변 리팩터의 잠금장치** (2026-09-01) |
| `drops[]` | 아래 |

- 드롭 지문 — `rarity|slot|ilvl|sins|base|element|개체굴림|접사`. **접사는 `stat:v` 를 `;` 로 이어 순서까지 적는다** — `item.rollAffixes` 가 풀에서 뽑는 순서는 여기서만 잡힌다. `base` 는 무기면 무기군 id, 그 외는 영문 이름(= 베이스 인덱스). 개체 굴림은 무기 `w<watk>` · 방어구 `def_flat:v` · 목걸이/반지 `-`(소비 없음). **`meta.parties` 의 시작 무기도 같은 형식**이다
- **`uid` 는 지문에 없다** — 발급 순서는 `state.js` 소관이라 전투 결정론과 다른 축이다 (§8 항목 3)
- 불일치 보고는 **요약이 맨 앞**이다 (`n/40 런 불일치`). 「1런만 어긋남」과 「40런 전부 어긋남」은 이식 검증에서 원인이 전혀 다른데, 예산을 첫 런이 통째로 먹으면 그 둘을 구분할 수 없다. 런당 최대 2개 × 최대 6런을 보여 준다
- 대조는 기대값 키가 아니라 **키 합집합**을 돈다 — 지문에 필드를 추가하고 재촬영을 잊으면 그 필드가 무기한 미검증으로 남기 때문이다
- **지문을 바꾸는 변경 = 위 계약의 변경**이다. `?golden=write` 로 다시 찍기 전에 이 절과 §5-2 를 먼저 고친다
- **무엇을 보장하지 않는가** — 40런이 지나지 않는 경로는 아무것도 말하지 않는다: 선술집(`rollCandidates`·`tavernReroll` 0회) · 전술 리롤(`TC.pick` 0회 — `tactics` 는 첫 배정만 본다) · `chapter_boss` 표본 1 · `inventory_cap` 넘침 0회 · 마스터리 랭크 > 0 인 영웅 0명 · 세이브 왕복. 목록은 [src/dev/README.md](../../src/dev/README.md)

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

`ui/data.js:loadData` 가 fetch 하는 CSV **23개**(`FILES`): `balance` · `monster` · `stage` · `stage_round` · `round_budget` · `spawn_grade` · `codex_level` · `codex_series` · `weapon_group` · `skill` · **`skill_tag`**(2026-09-01) · `hero_attribute` · `combat_stat` · `chapter` · `mastery_node` · `tactic_slot` · `tactic_option` · `affix` · `item_base` · `equip_slot` · `class` · `hero_name` · `hero_trait`.
**이 목록 = `src/data/*.csv` 전부**(`inherited/` 제외)여야 한다 — 읽히지 않는 SSOT 를 두지 않는다. `dev/test.html` 의 `csv:` 단정이 디렉터리 목록과 대조한다 (2026-08-28).

표시 헬퍼도 `ui/data.js` 가 낸다 — `monsterName(id)→{ko,en}` · `monsterFace(id)→path|null` · `monsterSin(id)` · `stageName(row)→{ko,en}` · `stageBgOf(id)` · `chapterOf(chapter)` · `eliteName(sin, baseId)`. mock 에 남은 것은 자산 경로(`faceDir()` · `FACE_STYLES`/`setFaceStyle` · `BG_DIR`/`TOWN_BG` · `stageBg`)와 화면 전용 사전뿐이다.

**⚠ game_logic 이 주입받지만 CSV 가 아니라 `ui/mock.js` 에 있는 것** — UI 는 Phase 2 에서 버려지므로 **이 목록이 이식 차단 항목**이다. 2026-08-31 M7 이관으로 **9항목 → 3항목**이 됐고, 남은 셋은 전부 **죄종 매핑 미확정**(GAME_DESIGN §10 `sin_mapping.md`) 하나에 걸려 있다:

| mock 항목 | 들어가는 곳 | 성격 |
|---|---|---|
| `SINS` (`{ko, en, adj, color}`) | hero · item · battle · naming | → 죄종 테이블(sin_mapping.md 과제). `adj`(영문 형용사)까지 들어야 `naming` 이 성립한다 |
| `SIN_TRAITS` | battle | → 계승 `elite_trait.csv` 연결. 죄종 하나당 정예 특성 하나라 죄종 테이블과 같이 간다 |
| `COMMON_TRAITS` | battle | → 계승 `elite_trait.csv` 연결 (죄종 무관 10종) |

**이관 완료 (2026-08-31)** — 값을 하나도 바꾸지 않았다(캘리브레이션 4행과 이관 시점 단정 135개가 전부 그대로인 것으로 확인. 이후 단정이 늘어 지금은 140):

| 옛 mock 항목 | 지금 | 비고 |
|---|---|---|
| `CLASSES` | `class.csv` → `D.classes` | CSV 컬럼은 `release`, 주입 필드는 `stage` 그대로 |
| `SLOTS` / `EQUIP_SLOTS` | `equip_slot.csv` → `D.slots` / `D.equipSlots` | 한 표가 둘을 먹인다 — `part_order`(부위 7) · `slot_order`(위치 8) |
| `ITEM_BASES` | `item_base.csv` → `D.itemBases` | 무기는 없다(무기의 베이스 = 무기군) |
| `AFFIX_DEFS` | `affix.csv` → `D.affixDefs` | 첫 컬럼 = `stat`(그 자체가 id). `scale` 3분류가 그대로 컬럼. `per_ilvl` 은 `band` 행만 |
| `HERO_NAME_POOL` · `HERO_TRAIT_POOL` | `hero_name.csv` · `hero_trait.csv` | |
| `ELEMENT_IDS` | **삭제** | SSOT 는 `game_logic/hero.js:ELEMENTS` 하나 |
| `nm` · `eliteName` | `game_logic/naming.js` (§2-10) | CSV 가 아니라 **이식 대상 코드** |

⚠ 이관은 **형태만** 옮긴 것이다 — 접사 수치·아이템 베이스 이름은 여전히 프로토타입 임시값이고, 계승 접사 매트릭스(7죄종×부위)는 연결하지 않았다. 계승 테이블을 왜 연결하지 않았는지는 [DEV_PLAN §4 부채 #16](DEV_PLAN.md).

~~`SKILL_DISPLAY`(액티브 아이콘·설명)~~(2026-09-01 삭제 — `skill.csv:icon`·`desc_kr`·`desc_en` 으로 이관) · `AFFIX_LABELS`(접사 표기) · `PAPERDOLL`(페이퍼돌 배치)는 **주입되지 않는다** — 화면 전용 사전·레이아웃이라 이식 차단 목록이 아니다. 게임 데이터(이름·표기 쿨·부위·원소 id)는 CSV 나 `game_logic` 이 든다.

---

## 8. 명문화한 암묵 계약

코드 주석이나 관례로만 있던 것. 이제부터는 계약이다.

1. **`strike` 의 rng 순서** — §5-2. 타입/검증이 강제하지 않는다. 바꾸려면 이 문서와 test.html 결정론 단정을 같이 바꾼다
2. **전투 루프의 rng 순서** — §5-2. 리팩터링으로 호출 순서가 바뀌면 회귀다
3. **uid 발급은 state.js 만** — `rollHero` / `rollDrop` 은 `uid: null`. 다른 모듈이 `counters` 를 만지지 않는다
4. **`grantXp` 는 in-place** — 호출자는 state 안의 hero 참조를 그대로 넘긴다. 복사본을 넘기면 성장이 사라진다
5. **`atk_physical` / `atk_magic` 은 배타** — 둘 다 있는 경우를 코드가 가정하지 않는다. 물리·마법 혼합 딜(스킬)이 생기면 이 계약을 다시 쓴다
6. **가방 용량 산수의 순서** — `equip` 은 실행 전에 `bag − 1 + back.length ≤ inventory_cap` 을 먼저 검사한다 (`back` 은 그 자리에 있던 하나뿐 — 2026-09-01 배타 폐지로 2가 되는 경우가 사라졌다)
7. **`closeRun` 은 재정산하지 않는다** — `resolveBattle` 이 출발 시점에 통째로 정산한다는 전제. **파견·탐험(오프라인 진행형)이 들어오면 이 전제가 깨진다** — 그때 `closeRun` 을 재설계한다 (컨셉 락 따름정리 1)
8. **올릴 수 없는 세이브 버전은 throw** — 이관 가능한 버전(현재 v2~v8)은 `deserialize` 안에서 올리고, 나머지는 던진다. 조용히 버리지 않는다. 잡는 건 렌더러
9. **`codex_level.csv:cards_to_next` 는 레벨당 증분** — 누적 아님 (2026-08-28 `cards_required` 에서 개명 — 이름이 오해를 부르던 자리다)
10. **`round` 가 라운드의 첫 이벤트** — §2-6 순서 보장
11. **`res` 는 항상 4원소 객체다** — 몬스터도 `{fire, cold, lightning, poison}` 을 든다(2026-08-26 타입 이원성 해소). `strike` 는 다른 모양을 가정하지 않으므로 정적 타입 언어에서도 인터페이스가 하나다
12. **`?tab=` 은 `?dev=` 뒤에** — 렌더러 부팅 순서. `startGame()` 이 탭을 원정으로 되돌린다
13. **스킬 배율·원소 태그는 타격 동안만 유닛 필드에 얹고 원복한다** — `strike` 시그니처는 불변이다. 다단타 도중 예외로 빠져나가면 유닛에 배율이 남으므로, 얹기와 원복은 한 함수(`strikeOnce`) 안에서만 한다
14. **`actives` 가 비면 rng 수열은 스킬 도입 전과 같다** — 만료 처리·발동 선택·회복·버프는 rng 를 쓰지 않고, 기본 공격 경로는 그대로다. 결정론 단정이 이것을 지킨다
15. **`buffs`·`reactions` 는 삽입 순서를 유지하는 맵/배열이다** — `buffEnd` 이벤트 순서 · 도발자 선택(배열 순 첫째) · 파생값 재계산 · 훅 발화가 그 순서를 탄다. JS 객체의 문자열 키 순서에 기대고 있으므로 **이식 언어에서 해시맵을 쓰면 다른 타임라인이 된다**(`stagePool` 과 같은 종류 · 2026-09-01)
16. **배정 단위는 스킬 인스턴스다** — `activesFor` 가 `{id, source}` 를 내고 소비자는 `skill.resolve` 로 정의를 얻는다. 정의를 `defs[id]` 로 직접 찾는 코드를 새로 만들지 않는다 — 변형 노드(`override`)가 오면 그 코드는 전부 우회로가 된다 (2026-09-01)

---

## 9. 알려진 계약 위반 (2026-08-26)

고치지 않고 기록만 — 수정은 [DEV_PLAN.md §4](DEV_PLAN.md) 에서 관리. **번호는 그 표의 부채 번호**다.

| # | 위반 | 위치 |
|---|---|---|
| 4 | 예상 소요 시간 집계가 렌더러에 있음 | ui/app.js |
| 5 | §7 의 mock 잔류 데이터 — **9항목 → 3항목**(2026-08-31 M7). 남은 `SINS`·`SIN_TRAITS`·`COMMON_TRAITS` 는 죄종 매핑 확정을 기다린다 | ui/mock.js |

해소됨(2026-08-26) — #1 `dmgBonus`↔`bonusPct` 필드명 불일치(이름 통일, 회귀 단정 있음) · #8 `res` 타입 이원성(§8 항목 11).
해소됨(2026-08-30) — #3 실효 쿨 공식: `ui/app.js` · `ui/tip.js` 의 사본을 `formula.effectiveCd` 로 갈아끼웠다. 이제 공식은 `game_logic` 한 곳에만 있다.
#2(`codexBonus` 의 `acc_pct` 를 아무도 읽지 않음)는 **코드 결함이 아니라 기획 공백으로 옮겨갔다** — 명중 폐지로 계열 하나가 비었다 ([GAME_DESIGN §10](../game_design/GAME_DESIGN.md)).

---

*마지막 업데이트: 2026-09-01 (**스킬 구조 재편 B — 행동 + CSV** — §2-8 `pickReady` 동률 = **칸 순서**(CSV `priority` 는 기본 정렬만) · §2-6 회복 밑수 `matk` 가 버프 괄호를 탄다(`matkBase`) · 쿨 바닥 `CD_MIN_MULT` → `balance.csv:skill_cd_floor_mult`(§5-3 행 삭제) · `skill.csv` 에 `icon`·`desc_kr`·`desc_en`·`innate_pool`·`note`(`def` 필드 4) · **`skill_tag.csv` 신설** — 태그 어휘 SSOT(`tagRows` 주입 · §7 CSV 23) · `SKILL_DISPLAY` 삭제 · §2-4 `skillPool` = `innate_pool=1`) · 2026-09-01 (**스킬 구조 재편 — 계약 먼저** [사용자 지시 · 구현 A 진행 중] — §1 그래프에 `skill_effects.js`·`skill_runtime.js` · **§2-11 등록표** · **§2-12 런타임**(사건 훅 5종 · `reactions`) · §2-6 `simulate` 입력이 **인스턴스** `[{id, source}]` · 유닛 필드 `matkBase`·`reactions`·`actives[].source` · **`makeUnit` 하나** · 실행 규칙 표에 사건 훅 행 · §2-7 `partyMembers` 가 정의를 넘긴다(⚠ id 를 넘겨 `skill_tag` 조건이 0 을 세던 버그) · §2-8 어휘 출처 = 표 · `activesFor → [{id, source}]` · `resolve` 신설 · 검증 강화(종류↔대상 정합) · §2-9 `contextOf` 주의 · §2-4 `skillOrder` 선택 필드 · §5-2 훅 rng 규칙 · §5-3 `CD_MIN_MULT` 위치(B 에서 CSV) · §5-5 `tl` 해시 · §8 항목 15·16) · 2026-09-01 (**레어 고유 스킬 프로토타입 배정** [사용자 지시] — §1 조립 그래프(skill.js 를 먼저 · hero 에 `skillPool` id 목록) · §2-4 `skillPool` 주입 · `rollInnate` 신설 · `rollHero` 가 고유를 굴린다 · hero 객체 `innate` · §2-7 `SAVE_VERSION` 9 · `deserialize` v2~v8 연쇄 · `partyUnits` 1번 = innate · §2-8 `balance.active_slots` 읽음 · `activesFor` = 고유 1 + 직업 채움 + 상한 · **§4 세이브 v9**(v8→v9 이관: 시드 소급 · 전용 솔트) · **전술 리롤 계획 이관은 v9 → v10 으로 밀림** · §5-1 소급 스트림 · §5-2 `rollHero` 에 `rollInnate` 1회 · §5-3 솔트 `0x5C11` · §5-5 `parties` 지문에 고유 스킬 · §8 항목 8 버전 범위) · 2026-09-01 (**⚠ 전술 리롤 재설계 — 계약만 먼저, 구현 전** — §2-7 `tacticState` 반환 개정(칸의 `cost` 삭제 → 판 전체의 `rerollCost`·`lockedCount`·`canReroll` · 칸에 `locked`) · `rerollTactic(state)` 에서 `slotNo` 삭제(열렸고 안 잠긴 칸을 한 번에) · **`toggleTacticLock` 신설**(무료 · rng 안 탐) · §3 결과 코드 **`allLocked`** · §5-2 **전체 리롤의 rng 순회 순서가 계약**(카운터는 1회만 오르고 한 스트림으로 칸 번호 오름차순 연속 뽑기) · §4 **세이브 v8 → v9**(`tactics.locked = []`). 비용 곡선은 기획 미정(tactic_card_design §5-6). 사용자 지시) · 2026-09-01 (**한손 개념 폐지 · 보조 슬롯 폐지** — §2-2 `slots` 부위 7 · `weaponGroups` 에서 `twoHanded` 삭제 · §2-5 item 객체에서 `twoHanded` 삭제 · `watk` 공식에서 양손 배율 삭제(`weapon_atk_base` 로 흡수) · 방어구 implicit 에서 보조 ×1.5 삭제 · §2-5 `canEquip` 인자 3 → 2 · §2-7 `equipSlots` 위치 8 · `equip` 의 `back` 은 0~1개 · §2-9 조건 어휘 9 → 8(`two_hand` 폐지) · §3 결과 코드 `twoHanded` 삭제 · **§4 세이브 v8**(v7→v8 이관 4항) · §5-3 코드 상수에서 보조 배율 삭제 · §7 `SLOTS` 부위 7/위치 8 · §8 항목 6) · 2026-08-31 (**강화 신설 — R25** · §2-5 강화 절 신설(베이스는 파생 · 옵션 값은 박는다 · 재굴림 없음) + item 객체에 `up` · exports 4개(`upgradeMax`·`upgradeCost`·`upgrade`·`effective`) · §2-7 `upgradeState`/`upgradeItem` · `heroCombat` 이 `effective` 를 통과시킨다 · §3 결과 코드 `maxUp` · **§4 세이브 v7**(v6→v7 이관: `items[*].up = 0` · `counters.upgrade = 0`) · §5-1 강화 스트림 `^ 0xF0C3` · §5-2 `item.upgrade` 소비 순서) · 2026-08-31 (**골든 사각지대 메우기** — §5-5 재작성: **입력 지문(`meta`)을 출력(`runs`)보다 먼저 대조한다** · `meta.csvHash`(CSV 22종 원문 해시) · `meta.balance`(**전 키** — 손잡이 5키만 보던 판이 밖의 15+ 키를 통과시켰다) · `meta.parties`(시작 파티 10 — 영웅 생성 + 시작 무기) · 런 지문에 `kills`·`casts`·`elites`·`grew`(정산 **후** 성장) 추가 · `tactics` 를 열린 칸 전체로 · 불일치 요약을 맨 앞에 · 키 **합집합** 순회 · 「보장하지 않는 것」 목록. **§5-2 에 `battle.stagePool` 순서 계약 한 줄**(CSV 행 순서가 아니라 `monster_idx` 오름차순 — 해시맵을 쓰면 다른 게임이 된다)) · 2026-08-31 (**골든 시드 스냅샷** — §5-5 신설: `dev/golden.json` 40런(시드 10 × 스테이지 101~104)이 **Phase 2 가 맞춰야 할 대상**이다. 런 생성 절차 · 지문 필드 · 드롭 지문(접사 stat·값·**순서**까지) · `uid` 비포함 · `meta.knobs` 5키 별도 대조. 지문을 바꾸는 변경은 §5-2 와 이 절을 먼저 고친다) · 2026-08-31 (**M7 mock→CSV 이관** — §7 이식 차단 9항목 → 3항목(`SINS`·`SIN_TRAITS`·`COMMON_TRAITS`) · CSV 16→22(`affix`·`item_base`·`equip_slot`·`class`·`hero_name`·`hero_trait`) · **§2-10 `naming.js` 신설**(`nm`·`eliteName` 이 game_logic 으로) · §2-4/§2-5 출처 열 mock→CSV · §2-7 `equipSlots` 출처 · §1 조립 그래프에 naming · §9 부채 #5 축소. **값 불변** — 캘리브레이션 4행·PASS 135/135 그대로) · 2026-08-30 (**파티 전술 신설** — §2-9 `tactic.js`(조건 어휘 9종 · 무상태 · 첫 배정은 섞기) · §2-7 `tacticState`/`tacticBonus`/`rerollTactic` · `heroCombat` 이 파티원에게만 전술을 넘긴다 · §2-4 `computeCombat` 4번째 인자 · **§4 세이브 v6**(`tactics` · `counters.tactic` · v5→v6 이관) · §3 `locked`·`gold` 에 전술 추가 · §5-2 rng 스트림 `^ 0x7AC7` 2줄) · 2026-08-30 (**기획↔프로토타입 대조** — §2-6 `skill` 이벤트에 `ready` 추가 · `end.reason` 에 **`retreat`**(귀환 룰 · 판정 순서) · §2-4 `grantXp` 레벨 상한 · §2-7 선술집 3함수 재작성(`tavernState` 신설 · `hire` 가 카운터를 안 올린다) · **§4 세이브 v5**(`tavern` · v4→v5 이관) · §6 재생기가 12종을 전부 안다 · §7 `SKILL_DISPLAY` 는 주입 아님 · §9 부채 #3 해소) · 2026-08-28 (CSV 형태 최적화 — §7 CSV 13·표시 헬퍼 · §2-4/§2-5 `damageKind`/`release` · §2-6 드롭 = 처치당 최대 1개·`dropChanceMult` · §2-7 codex 출처 CSV · §2-8 `ownerKind`/`ownerId` · §5-2 드롭 판정 1회 · §8 항목 9 `cards_to_next`) · 2026-08-28 (액티브 스킬 엔진 — §2-8 skill.js 신설 · §2-6 스킬 실행 규칙·유닛 필드·이벤트 5종·result casts · §2-3 effectiveCd · §2-4 atk_pct_sum · §5-2 rng 순서 · §5-3 EPS·초기 readyAt · §7 CSV 9 · §8 항목 13·14) · 2026-08-26 (battle_design §9 개정 반영 — §2-3 전면 재작성 · 성장 곡선/개체 굴림/접사 3분류 · 적중 = 레벨 차 · 저항 상한형 · 세이브 v3 이관 · res 이원성 해소) · 2026-08-26 (최초 작성 — 코드 인벤토리에서 계약 추출)*
