# INTERFACE — game_logic 이식 계약서

> **이 문서는 계약이다.** Phase 2(Godot/Unity)는 "이 문서대로 동작하는가"로 검증한다.
> 코드가 경계를 바꾸면 **이 문서를 먼저(또는 같이) 고친다.** 코드에만 있는 규칙은 계약이 아니다.
> 출처는 전부 `src/game_logic/*.js` · `src/ui/data.js` · `src/ui/storage.js` · `src/ui/battle.js`(재생기) — 2026-08-26 기준 코드에서 읽은 것만 적었다.

관련: [ARCHITECTURE.md](ARCHITECTURE.md)(구조) · [DEV_PLAN.md](DEV_PLAN.md)(계획·부채) · 화면은 셋 — [SCREEN_DESIGN.md](SCREEN_DESIGN.md)(규격) · [adr/](adr/README.md)(결정) · [SCREEN_CHANGELOG.md](SCREEN_CHANGELOG.md)(이력)

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
battle.js(data, item, skill, hero) ──────┤  skill.js 는 hero.js 의 `ELEMENTS`(원소 어휘)만 import 한다 — 시스템 주입이 아니다
                                          │  battle 이 **heroSystem 을 주입받는다** [2026-09-11 · R79] — 몬스터도 `computeCombat` 을 지난다(§8-1 「계산이 한 곳」)
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

`createFormula(balance) → { growthMult, mitigation, physicalDefense, resCap, appliedResist, reductionMult, hitChance, strike, indirect, leech, attacksPerSec, effectiveCd }`
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
| `strike(rng, a, d)` | `→ {hit, dmg, crit, proc}` | 직격 1회. **rng 소비 순서 = 적중 → (적중 시) 치명 → (추가 피해 확률이 있는 타격만) 추가 피해. 최대 3회** — 확률이 0 인 타격(기본 공격 전부)은 최대 2회로 종전과 같다 (§5-2) [추가 피해 2026-09-10 · R72] |
| `indirect(amount)` | `→ int` | 비직격(반사·도트·사망 폭발). 적중·스킬 배율·치명·감소를 받지 않고 흡혈·반사·발동 효과를 **유발하지 않는다**. `dmg_min` 하한만 |
| `leech(dmg, pct)` | `→ int` | 흡혈 — 직격의 최종 피해에만 비례 |
| `attacksPerSec(period)` | `→ 회/초` | 초당 공격속도 `1 / period` (`period ≤ 0` 이면 0). **축이 아니라 표기**다 — 축은 `combat_stat.csv:action_period` 하나고 아이템 툴팁만 역수를 찍는다(주기는 클수록 느려 이름과 방향이 거꾸로 읽힌다 · [SCREEN_DESIGN §6](SCREEN_DESIGN.md) · ADR-0081). **엔진은 이 함수를 쓰지 않는다** — `mitigation`·`resCap` 과 같은 자리(소재값만으로는 못 읽는 값의 변환) |
| `effectiveCd(cd, period)` | `→ 초` | 실효 쿨 `ceil(cd / period) × period` (§6) — 스킬은 행동 주기에 얹혀 나가므로 쿨이 돌아도 다음 차례까지 기다린다. **엔진은 이 함수를 쓰지 않는다**(틱 루프에서 자연히 생긴다) — 화면 표기·검증이 같은 규칙을 읽게 하려는 것 |

**공격자 `a`** — `{atk, atkType, lvl, crit, critDmg, defIgnore, resReduction, skillMult, bonusPct, flat, procChance, procMult}` — 뒤의 셋은 **스킬 타격만** 싣는다(없으면 0 · `battle.strikeOnce` 가 그 타격 동안만 얹는다 · §8 항목 13). `flat` = 능력치 항(§2-8 `scaleDef`) · `procChance`/`procMult` = 확률로 터지는 추가 피해의 확률 %·배수 % [2026-09-10 · R72]
**방어자 `d`** — `{def, res:{fire,cold,lightning,poison}, resMaxBonus, dr, lvl}`
`res` 는 **항상 객체다 — 몬스터도**(§8 항목 11). `dr` 은 호출자가 이미 원천별 곱으로 합쳐 온 **실효 %** 한 숫자다.

```
strike(rng, a, d):
  rng()×100 ≥ hitChance(a.lvl, d.lvl)  →  {hit:false, dmg:0, crit:false, proc:false}      ← rng ①  (여기서 끝, 1회 소비)
  v = (a.atk × (skillMult ?? 1) + (flat ?? 0)) × (1 + (bonusPct ?? 0)/100)                     ← 타격 편차 없음 (무기 개체에 박혀 있다)
  crit = rng()×100 < min(a.crit ?? 0, crit_cap_pct);  crit 이면 v ×= (critDmg ?? 100)/100    ← rng ②
  (procChance ?? 0) > 0 이면 proc = rng()×100 < min(procChance, 100);  proc 이면 v ×= procMult/100   ← rng ③ (확률 0 이면 굴리지 않는다)
  physical → v ×= 1 − mitigation(physicalDefense(d.def, a.defIgnore))
  원소     → v ×= 1 − appliedResist((d.res[a.atkType] ?? 0) − (a.resReduction ?? 0), d.resMaxBonus)/100
  공통     → v ×= 1 − (d.dr ?? 0)/100
  →  {hit:true, dmg: max(dmg_min, round(v)), crit, proc}
```

- 저항 감소는 관통이라는 별도 규칙이 아니라 **저항값에 음수를 더하는 것**이다 (§9-5) — 그래서 상한 계산 앞에 들어간다
- **능력치 항(`flat`)은 배율에 곱하지 않고 `공격력 × 배율` 에 더한다** — 곱이면 무기와 능력치 중 한쪽이 낮을 때 다른 쪽까지 죽는다(battle_design §9-2 「곱이 아니라 합」). 그래서 `atk` 가 0 이어도 `flat > 0` 이면 피해가 난다 [2026-09-10 · R72]
- **추가 피해는 치명과 따로 굴려 겹친다** — 둘 다 터지면 곱이고 치명 상한(`crit_cap_pct`)과 무관하다. **직격에만** 붙는다 — `indirect`(반사·도트)는 받지 않는다 [2026-09-10 · R72]
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
| `heroTiers` | `[{id, weight, totalMin, totalMax, shape}]` — 등급 표. **행 순서가 굴림 순서다**(§5-2). `weight = 0` 인 행(유니크)은 생성기가 안 뽑는다 [신설 2026-09-08] | `src/data/hero_tier.csv` → `ui/data.js:D.heroTiers`. 이름·색도 같은 표가 든다 — 화면과 로직이 **한 SSOT** 를 본다 |
| `heroFaces` | `{classId: n}` — **직업별 초상 장수**. 영웅이 태어날 때 제 직업 풀에서 `1..n` 을 굴려 `hero.face` 에 **`'<classId>_<k>'` 문자열**로 박는다. **풀이 0장인 직업은 `null`**(초상 없음 = 빈 칸) [개정 2026-09-07 — 정수 하나짜리 구 주입은 폐기됐다] | `ui/mock.js:HERO_FACES`. **로직은 그림을 모른다** — 직업별 장수 객체만 받고 파일 이름은 화면이 만든다(`ui/mock.js:heroFace` → `faces/<스타일>/hero_<classId>_<k>.png`). 값이 바뀌어도 **이미 박힌 얼굴은 안 바뀐다** |

| export | 시그니처 | 계약 |
|---|---|---|
| `rollAttributes(rng, favor, {total, shape})` | `→ {statId: v}` | **합은 등급이 정하고 모양만 굴림** [개정 2026-09-08 — ~~`hero_attr_total` 고정~~ 폐기 · R48]. `shape` 가 분포의 손잡이다(클수록 한 축이 크게 튄다 = 매직 / 1 에 가까울수록 고르다 = 레어). `favor`(직업 주력 축)가 최고치가 되도록 자리만 바꾼다. **rng 소비는 축 수(7)로 고정** — 나머지 보정이 결정적이라 굴림 결과가 소비 수를 밀지 않는다 |
| `rollTier(rng, forced?)` | `→ tierRow` | `hero_tier.csv` 의 `weight` 비례 1개. ⚠ **소비는 언제나 정확히 1회** — `forced` 로 등급을 지정해도 굴림을 태우고 결과만 버린다. 안 그러면 선술집에서 등급이 섞일 때 같은 시드가 다른 결과를 낸다 (`rollFace` 와 같은 계약) [신설 2026-09-08] |
| `rollHero(rng, {sin, cls, name, trait, tier?})` | `→ hero` | `uid: null` 로 돌려준다 — **uid 발급은 state.js 의 권한**. **소비 순서 = 등급 1 → 총합 1 → 능력치 7 → 고유 1 = 언제나 10회** [개정 2026-09-08 — ~~`rollCaps` 7회~~ 삭제 · §5-2]. `tier` 를 주면 그 등급으로 굳지만 **소비 수는 안 바뀐다**. **`face` 는 `null` 로 나간다** — 박는 것은 `rollStartParty` 다 [2026-09-06] |
| `rollInnate(rng)` | `→ skillId \| null` | `skillPool` 에서 **균등 1개**(rng 1회). 풀이 비면 `null`(소비 0). `rollHero` 와 `state.upgradeV8`(옛 세이브 소급) 둘이 부른다 |
| `rollStartParty(rng, n)` | `→ hero[]` | 이름·죄종·직업·특성이 n명 사이에서 겹치지 않는다. **등급은 `['rare','magic','magic']` 고정** — 첫 파티 = 레어 1 + 매직 2 (hero_design §1 확정 2026-09-07). n 이 3 을 넘으면 나머지는 굴린다. 직업은 `stage === 'main'` 만. **얼굴은 영웅을 다 만든 뒤 맨 마지막에 n회** — **각자 제 직업 풀에서 1회씩**(풀이 비어도 소비 1회 · 소비 수는 언제나 n). 파티 안 직업이 서로 달라(`drawDistinct`) **얼굴 겹침은 자동으로 회피된다** [개정 2026-09-07] |
| `rollFace(rng, cls)` | `→ '<cls>_<k>' \| null` | 그 직업 풀에서 **균등 1회**. 풀이 0장이면 `null` — 그래도 **rng 소비는 1회**다(직업이 소비 수를 바꾸면 같은 시드가 다른 파티를 낸다). `rollStartParty` · `state.upgradeV12`(옛 세이브 전면 재굴림) · `state.upgradeV13`(`null` 소급) 셋이 부른다 [개정 2026-09-07] |
| `rollCandidates(rng, n, tiers?)` | `→ hero[]` | 선술집 후보 — `rollStartParty` 와 같은 굴림이되 **등급도 굴린다**. 시작 파티만 등급이 지정(레어 1 + 매직 2)이고 그 차이가 rng 소비를 바꾸지 않는다 [개정 2026-09-08]. `tiers` 를 주면 그 등급으로 굳는다 [신설 2026-09-09] — **수색이 매력으로 등급을 미는 자리**다(`state.searchRoll`). `rollTier` 가 지정이어도 굴림을 태우므로 **소비 수는 지정 여부와 무관하다** |
| `xpNeeded(level)` | `→ int` | `round(hero_xp_base × level ^ hero_xp_exp)` |
| `grantXp(hero, amount, rng)` | `→ {uid, from, to, gains, points}` 또는 `null` | **hero 를 in-place 로 바꾼다**(xp·level·stats). 레벨업마다 축별 `attr_growth_chance_pct` 확률 +1, **`hero_attr_max` 까지** [개정 2026-09-08 — ~~히든 상한 `caps`~~ 폐지]. **마스터리 포인트도 여기서 준다** — `points = 오른 레벨 수 × mastery_point_per_level`, `hero.masteryPoints` 에 in-place 가산. **레벨 상한 `hero_level_cap` 에서 멈추고 `xp = 0` 이 된다** — 상한에 닿은 뒤의 지급은 `null` 을 돌려주고 아무것도 바꾸지 않는다 (⚠ 「50 이후 느린 곡선」은 미반영 — 곡선 숫자는 캘리브레이션 뒤, DEV_PLAN R12) |
| `computeCombat(hero, items, codex={})` | `→ combat` | 순수. 아래 표 |
| `masteryNodes` · `masteryById` | `[node]` · `{nodeId: node}` | 정규화된 노드. `node = {id, treeKind, ownerId, tier, stat, value, maxRank, unlockLevel}` |
| `masteryNodesFor(hero)` | `→ [node]` | 그 영웅의 죄종 트리 + 직업 트리. `ownerId === '*'` 는 그 `treeKind` 전부에 걸린다 |
| `masteryBonus(hero)` | `→ {flat:{stat:v}, dr:[v]}` | 찍은 랭크 × 랭크당 값. `damage_reduction` 만 따로 — 원천별 곱이라 합치면 안 된다 |

**hero 객체** — `{uid, name:{ko,en}, tier, sin, cls, trait:{ko,en}, face, innate: skillId, level, xp, mastery:{nodeId:rank}, masteryPoints, stats:{7}, equipped:{position: itemUid 또는 null}}` — `injuredUntil` 은 v11 에서 삭제됐다 (2026-09-03 · 「부상」·「치료」 어휘는 09-06 폐기 — base_expedition_design §1-1)
`innate` 는 **고유 스킬 id** — 생성 시 1회 굴리고 이후 불변(hero_design §1). 액티브 **고유 칸**이 된다(§2-8 `activesFor` · 2026-09-03 부터 칸은 번호가 아니라 출처가 정한다). `skill.csv` 에서 그 행이 지워지면 `activesFor` 가 **빈 고유 칸으로 취급**한다(던지지 않는다).
`skillOrder`(**선택 필드** — 없으면 없는 것) — `[skillId]`, 플레이어가 정한 액티브 칸 순서. 있으면 `activesFor` 가 그 순서를 앞에 둔다(§2-8). 저장은 우선순위 변경 UI 가 생길 때 시작한다 — 기본값이 곧 「없음」이라 이관이 필요 없다 (2026-09-01 자리만).
`tier` 는 `magic` / `rare` / `unique` — **3층** [개정 2026-09-07 · 구현 2026-09-08]. SSOT 는 `hero_tier.csv` 이고 등급이 정하는 것은 **능력치 총합 대역과 분포 모양 둘뿐**이다.
~~`caps`(개체별 히든 상한)~~ 는 **v15 에서 삭제됐다** — 상한은 `[balance.csv:hero_attr_max]` 하나로 전 영웅 공통이고 **등급은 출발선이지 천장이 아니다** (hero_design §4-3). 히든으로 남는 것은 성장률뿐이다.
`mastery` 는 **찍은 것만** 담는다(랭크 0 은 키가 없다) · `masteryPoints` 는 남은 포인트. 죄종·직업 마스터리가 **한 풀을 공유**한다 (skill_design §1-4).

**`computeCombat` 출력** — 필드가 **있거나 없거나**로 표현되는 것이 있다. `attrMult(v) = 1 + v × attr_bonus_per_point / 100`:

| 필드 | 계약 |
|---|---|
| `atk_physical` **또는** `atk_magic` | **둘 중 하나만 존재.** 무기군 `damageKind === 'magic'` 이면 `atk_magic`, 아니면 `atk_physical`. 맨손 = physical.<br>**무기가 밑수다**(§9-1) — `round( 밑수 × (1+atk_pct_sum/100) × (1+codex.atk_pct/100) )`(`atk_pct_sum` 은 아래 행 — 오만 칸의 레벨당 데미지가 같은 괄호에 든다 · 2026-09-11 R78) — ~~`attrMult(int 또는 str) ×`~~ **2026-09-10 제거**(R72 · 능력치는 스킬 쪽 덧셈 항으로 옮겨갔다 — §2-8 `scaleDef` · battle_design §9-1), 밑수 = `watk + 무기 슬롯 **자신의** 접사 atk_flat 합`(맨손이면 `unarmed_atk`). **다른 슬롯의 `atk_flat` 은 더하지 않는다** · ⚠ 2026-09-11 R78 부터 새 무기에는 `atk_flat` 이 안 붙는다(최소/최대 피해 보류) — 옛 무기만 든다 |
| `attack_type` | **언제나 `physical`** [개정 2026-09-11 · R80 · battle_design §2-1 · §9-5] — ~~마법 무기 개체의 `element`(없으면 `ELEMENTS[0]`)~~ 는 폐기됐다. 무기의 원소는 **관련 옵션이 붙었을 때만** 생기고 그 옵션이 아직 없으므로, 원소 없는 마법 무기의 기본 공격은 **물리로 친다**(방어력에 깎인다). ⚠ 바뀌는 것은 **무엇에 깎이나**뿐 — 세기 채널(`atk_magic` = 회복의 밑수)은 그대로다. 평타에 원소를 얹는 것은 **평타 부여 스킬**(인챈트 계열 · 미구현)의 몫이다. ⚠ **몬스터는 이 값을 덮는다** — `monster.csv:attack_type`(스테이지 원소 · monster_design §2)이 이긴다 (§2-6) |
| `level` | 적중률의 공격자 레벨 (§9-4). 감쇠 곡선은 레벨을 쓰지 않는다 |
| `hp_max` | `round( (hero_hp_base + (hero_hp_base × growthMult(level) − hero_hp_base) × attrMult(vit) + Σhp_flat) × (1+Σhp_pct/100) × (1+codex.hp_pct/100) )` — **레벨이 성장 곡선을 타고 그 성장분만 건강을 탄다** [개정 2026-09-10 · R72 · hero_design §4-1] — 레벨 1 은 `growthMult(1) = 1` 이라 성장분이 0 → **전 영웅이 같다**(몬스터 앵커링 기준점 유지 · battle_design §8) |
| `defense` | Σ`def_flat` (방어구 implicit + 접사). 비율 축이라 곡선을 타지 않는다 |
| `res_fire` · `res_cold` · `res_lightning` · `res_poison` | `res_all + res_<원소>` — **직접 %**, 능력치 계수 없음. 상한은 여기서 걸지 않는다(전투에서 `appliedResist`) |
| `res_max_bonus` · `res_reduction` | Σ 접사. 드롭 접사 풀에 아직 없다(유니크·크래프트·낙인의 자리) — **값 0 이 정상** |
| `damage_reduction` | **실효 %** = `100 × (1 − Π(1 − p/100))`, 소수 3자리. 원천별 곱(§9-3)을 한 숫자로 낸 것 — 시트에도 이 숫자가 찍히고 `strike` 는 `d.dr` 로 한 번만 곱한다 |
| `def_ignore` · `reflect_damage` · `life_steal` | Σ 접사 |
| `hp_regen` | `(hp_regen_base_per_level × growthMult(level) + Σhp_regen)`, 소수 3자리 — **초당** 회복량. 바탕값은 전 영웅이 갖고(09-07) 가산 출처는 지금 **마스터리뿐**(접사 풀에 없다). ~~`× attrMult(vit)`~~ **2026-09-10 제거**(R72 — 건강은 HP 성장분으로 옮겨갔다). 적용은 `battle.js`(틱마다 누산) |
| `cooldown_reduction` | Σ — 표기 쿨을 줄이는 %. 출처는 지금 **마스터리뿐**. 적용은 `battle.js`(시전 시점에 곱) |
| `crit_rate` · `crit_damage` | `base_crit_pct` / `base_crit_damage_pct` + Σ 접사. 확률 상한은 `strike` 에서 |
| `action_period` | `(무기군 period 또는 unarmed_period) / attrMult(agi) × (1 − Σaspd_pct/100)`, 하한 0.4 s, 소수 3자리 |
| `dmg_bonus_pct` | `codex.dmg_pct` 그대로 — 전투 유닛의 `bonusPct` 가 된다 |
| `gold_find` · `item_find` | `round(Σ접사 × attrMult(luck))` — **곱셈이라 장비가 0이면 0**(§8 곱셈 원칙). **운은 전투 계산 밖**이라 이 둘에만 걸린다 |
| `atk_pct_sum` | Σ `atk_pct` **+ Σ`dmg_per_level_pct` × `level`** (**이미 `atk` 안에 곱해져 있다** — 중복 적용 금지). 오만 칸의 레벨당 데미지는 상시 괄호다 [2026-09-11 · R78 · item_design §1 「무기 옵션」]. 전투 중 스킬 버프가 새 곱셈 층이 아니라 **같은 괄호에 덧셈**으로 들어가야 해서(§9-2) `battle.js` 가 그 괄호를 되짚을 수 있도록 따로 낸다 |
| `option_fx` | **장비 옵션이 여는 조건부 · 타격 시 · 전투 밖 축 한 묶음** [신설 2026-09-11 · R78] — 전부 0 이면 `null`. `{vs:{normal,demon,undead}, vsElite, vsFront, vsBack, ele:{fire,cold,lightning,poison}, defDown, resDown, atkDownPhys, atkDownMag, crush, magicFind}` — 각각 Σ 접사(`vs_normal_dmg`·`vs_demon_dmg`·`vs_undead_dmg` · `vs_elite_dmg` · `vs_front_dmg`·`vs_back_dmg` · `<원소>_dmg_pct` · `def_down_pct` · `res_down_pct` · `atk_down_phys_pct`·`atk_down_mag_pct` · `crushing_blow_pct`) · `magicFind = round(Σmagic_find × attrMult(luck))`. **`combat_stat.csv` 행이 아니다** — 시트에 안 서고(impl 대조 단정의 제외 목록) 소비자는 `battle.js` 뿐이다 |

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
전투 계수가 실제로 걸리는 축은 둘뿐이다 [개정 2026-09-10 · R72] — 민첩(행동 주기) · 건강(**레벨 성장분의 최대 HP**). ~~힘(물리 공격력) · 지능(마법 공격력)~~ 은 **스킬 계수**로 옮겨갔고(§2-8 `scaleDef` · battle_design §9-1) ~~건강(HP 재생)~~ 은 계수를 잃었다. 운은 전투 밖(드랍률·골드) · 통솔·매력은 전투 스탯 계수가 없다(스킬 계수는 있다).

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
| ~~`elements`~~ | — | **[퇴역 2026-09-11 · R80]** 마법 무기 원소 굴림이 사라져 `item.js` 가 원소 어휘를 안 읽는다 — 주입 목록에서 뺐다(`ui/data.js`). SSOT 는 여전히 `game_logic/hero.js:ELEMENTS` |
| `itemBases` | `{part: [{ko,en}]}` 무기 외 부위 베이스 이름 | item_base.csv — **부위별 행 순서가 결정론에 걸린다** |
| `weaponBases` | `{groupId: [{id,ko,en}]}` 무기군별 세부 베이스 풀 [신설 2026-09-10] | weapon_base.csv — **아직 일부 무기군뿐**(지금 `sword2h`·`axe`·`mace`·`spear`·`bow` — 뒤의 셋은 2026-09-11). 풀이 있는 무기군만 드롭 때 하나를 굴려 이름·그림을 그 베이스로 좁힌다. 행 순서는 대역 순(item_design §1)이지만 **굴림은 균등** — 대역 경계·A/B/C 축은 미정(DEV_PLAN R62) |
| `affixDefs` | `[{stat, scale:'growth'\|'band'\|'flat', min, max, perIlvl?, slots?}]` — `perIlvl` 은 **band 에만**, `slots` 없으면 전 부위 | affix.csv — `per_ilvl` 은 `band` 행만 값이고 로더가 그 행에만 `perIlvl` 키를 넣는다. **행 순서가 `rollAffixes` 의 풀 인덱스에 직결된다** · **무기는 이 풀을 안 쓴다**(R78) |
| `weaponSinOptions` | `[{sin, appliesTo, stat, scale, min, max}]` [신설 2026-09-11 · R78] | weapon_sin_option.csv — **무기 죄종 칸 후보**. `appliesTo` = `all` · 무기군 `damageKind` · 직업 id(그 무기군의 `classes` 에 있으면) — 시기 칸이 물리 / 마법사 / 사제로 갈리는 자리다. 한 죄종 · 한 무기군에 행이 여럿이면 그중 하나를 굴린다(탐욕 셋 · 시기-사제 둘). 로드 시 `scale` · `appliesTo` · 죄종 id · 범위를 검증하고 틀리면 던진다. **행 순서가 결정론에 걸린다** |
| `weaponCommonOptions` | `[{family, stat, appliesTo, scale, min, max}]` [신설 2026-09-11 · R78] | weapon_common_option.csv — **무기 통합옵션 후보**. `family` 가 종류다 — **종류를 먼저 뽑고 그 안에서 변형(행)을 고른다**. `appliesTo` 는 위와 같은 어휘 · 같은 로드 검증. **행 순서가 결정론에 걸린다** |
| `composeName` | `(prefixSin, base, suffixSin 또는 null) → {ko,en}` | `game_logic/naming.js:createNaming({sins}).composeName` — §2-10 |
| `classSkills` | `{classId: [skillId...]}` **직업별 액티브 후보** (2026-09-09 신설) | `skill.csv` 의 `owner_kind=job` 행을 직업으로 묶은 것 — `ui/data.js` 가 만들어 **hero(`skillPool`)와 item 에 같은 표를 넘긴다**. 두 출처(고유 · 무기)가 한 풀에서 가져가기 때문이다 (skill_design §12-1 규칙 3). **행 순서가 결정론에 걸린다** |

**item 객체** — `{uid, slot(part), rarity, ilvl, up, name:{ko,en}, implicit:{stat,v} 또는 null, affixes:[{stat,v,src}], sins:[sinId], group?, watk?, skill?, baseId?}`
- `rarity` 는 현재 `magic` / `rare` 만 굴린다
- `up` = 강화 단계 `0 … equip_upgrade_max`. **드롭이 굴리지 않는다** — 드롭·시작 무기는 언제나 `0` 이고 `upgrade` 만 올린다 (2026-08-31 신설)
- `group` / `watk` / `skill` / `baseId` 는 무기만. ~~`element` 는 **마법 무기군 개체**만~~ → **[폐기 2026-09-11 · R80] 생성 때 원소를 굴리지 않는다** — 새 아이템에 `element` 키가 없고 굴림 1회가 빠졌다(§5-2). **옛 세이브의 값은 죽은 필드로 남는다** — 읽는 곳이 없어져 무해하고 세이브 버전을 올리지 않았다(R77 선례). 원소는 **관련 옵션이 붙었을 때만** 생기고 어느 옵션이 주는지는 미정(GAME_DESIGN §10). ~~`twoHanded`~~ 는 2026-09-01 폐지 — 전 무기가 양손이라 표현할 것이 없다
- **`skill` = 그 무기가 담은 액티브 id** [신설 2026-09-09 · skill_design §12-1 규칙 3] — 드롭 시 그 무기군의 **직업 풀**에서 하나를 굴려 개체에 박는다. ~~무기군이 스킬의 종류를 정한다~~(§2-1)는 폐기됐고, 대신 **「전사류 무기에는 전사류 스킬이 붙는다」**가 계약이다: 같은 도끼라도 개체마다 다른 전사 스킬을 든다. 액티브 2번 칸의 입력이고(`skill.activesFor` 의 `ctx.weaponSkill`), 무기를 바꾸면 그 칸이 통째로 바뀐다. 풀이 비는 무기군(확장 직업)은 `null`
- **`baseId` = 그 무기군의 세부 베이스 id** [신설 2026-09-10 · `weapon_base.csv`] — 드롭 시 그 무기군에 베이스 풀이 있으면 하나를 굴려 박는다. 있으면 **`name` 도 그 베이스 이름으로 다시 조립된다**(무기군 이름을 덮는다) — 화면의 그림도 같은 `baseId` 를 우선해 그 베이스 그림을 보여준다(`ui/mock.js:itemArt`), 그림과 이름이 어긋나지 않는다. 풀이 없는 무기군(스태프 · 오브 · 십자가 · 성경 · 석궁 · 확장 둘 — 2026-09-11)은 `undefined` — 무기군 이름 그대로. ⚠ **아직 대역·A/B/C 축을 안 갈라 균등 굴림이다** — 실제 드롭 레벨·성격 가중은 `weapon_base` 의 수치가 발행돼야 한다(DEV_PLAN R62)
- 무기의 행동 주기·공격 타입·착용 직업은 아이템에 **박지 않는다** — 매번 `weaponGroups[group]` 에서 읽는다
- `sins` 는 죄종 **태그 목록**이지 포인트가 아니다 — 세트포인트 구조는 폐기됐다(08-26). 스키마는 그대로이고, 태그를 **세는 쪽**이 전술카드 조건이 된다 (tactic_card_design.md)
- **`sins` 의 길이는 희귀도가 정한다 — `magic` 1 · `rare` 2** [확정 2026-09-11 · item_design §1 · R77] — 레어의 둘째(접미)는 첫째와 다른 죄종이다. ~~레어 접미는 `suffix_sin_chance_pct` 확률~~ 은 폐기(키 퇴역 · §5-2 판정 1회 삭제)
- **`src` = 접사의 출처** [신설 2026-09-11 · R78 · 세이브 v23] — `fixed`(고정 옵션) · 죄종 id(죄종 칸) · `random`(통합옵션). **배열 순서가 곧 표시 순서**다(고정 → 죄종 칸 → 통합 — SCREEN_DESIGN §6 · ADR-0100). 무기 외 부위는 전부 `random`
- **무기는 세 층을 정해진 개수로 받는다** — 고정 1(`atk_pct`) + 죄종 칸(`sins` 마다 1 — `weaponSinOptions`) + 통합옵션(`weapon_common_opt_magic` / `_rare` 개 — `weaponCommonOptions` · 같은 `family` 는 한 번). **무기는 `affixDefs` 를 안 쓴다** — `affix.csv` 에 `weapon` 슬롯이 없고 `atk_flat` 은 퇴역했다 (아래 「무기 옵션」)

**개체 굴림** — 편차는 타격마다가 아니라 **드롭 시 한 번** 굴려 개체에 박는다 (§9-1 · item_design §2). `ε = (rng()×2 − 1) × 폭/100`:

| 부위 | 값 | 편차 폭 |
|---|---|---|
| 무기 `watk` | `round2( weapon_atk_base × growthMult(ilvl) × (1+ε) )` — **소수 2자리**(정수로 반올림하면 밑수 대역이 뭉개진다). ~~양손 배율~~ 은 2026-09-01 `weapon_atk_base` 로 흡수 | 무기군 정의의 `variance`(= `weapon_group.csv:variance_pct`), 없으면 `balance.csv:dmg_variance_pct` |
| 방어구 implicit `def_flat` | `round1( (armor_def_base + ilvl × armor_def_per_ilvl) × (1+ε) )` — 방어는 비율 축이라 **성장 곡선을 타지 않는다**. ~~보조 ×1.5~~ 는 슬롯과 함께 폐지 (2026-09-01) | `armor_def_variance_pct` (전역 하나) |
| 목걸이 · 반지 | implicit 없음 — **rng 소비도 없다** | — |

**접사 값 규칙** (`rollAffixes` — 정의의 `scale` 이 정한다, item_design §2-1). `roll = min + rng()×(max−min)`:

| scale | 값 | 해당 |
|---|---|---|
| `growth` | `max(0.1, round1(roll × growthMult(ilvl)))` — 소수 1자리 | `hp_flat` (옛 무기의 `atk_flat`) |
| `band` | `max(1, round(roll + ilvl × perIlvl))` — 정수 | `def_flat` |
| `flat` | `max(1, round(roll))` — 정수, **ilvl 무관** | 나머지 전부 (% · 저항 · 유틸) |
| `fine` | `max(0.1, round1(roll))` — 소수 1자리, **ilvl 무관** [2026-09-11 · R78] | **무기 옵션 표에만** — 오만 `dmg_per_level_pct` |

같은 stat 은 한 아이템에 두 번 붙지 않는다 — 정의 풀에서 뽑으면 제거한다. `slots` 가 그 부위를 포함하는 정의만 풀에 들어간다(**무기는 이 풀을 안 쓴다** — 아래 「무기 옵션」 · 2026-09-11 R78).

**무기 옵션** (item_design §1 「무기 옵션」 · 2026-09-11 R78) — `build` 가 무기면 `affixes` 를 이렇게 만든다. rng 순서는 §5-2:

| 층 | 규칙 | rng |
|---|---|---|
| 고정 | `{stat:'atk_pct', v: max(1, round(min + rng×(max−min))), src:'fixed'}` — 범위 `[balance.csv:weapon_fixed_atk_pct_min]` ~ `[balance.csv:weapon_fixed_atk_pct_max]` | 1 |
| 죄종 칸 | `sins` 순서대로 — 후보 = `weaponSinOptions` 중 그 죄종 · `appliesTo` 가 맞는 행. 행 1 → 값 1 → `{stat, v, src: 죄종 id}`. **후보가 없어도 2회 소비**하고 칸을 비운다 | 죄종마다 2 |
| 통합 | 개수 = `weapon_common_opt_rare` / `_magic`. 후보 = `appliesTo` 가 맞는 행, 종류 목록 = 그 행들의 `family` 첫 등장 순. 종류 1(뽑은 종류는 목록에서 뺀다) → 변형 1 → 값 1 → `src:'random'`. **종류가 바닥나도 3회 소비** | 개수 × 3 |

`appliesTo` 판정 = `'all'` · 무기군 `damageKind` 와 같다 · 무기군 `classes` 에 든 직업 id — 셋 중 하나면 붙는다.

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
| `rollDrop(rng, ilvl, opts?)` | `→ item` | 부위 균등 → 베이스 → 희귀도(가중치) → `build`(§5-2 순서). `up = 0`. **`opts.magicFind`**(파티 평균 %)가 있으면 **레어 가중치 × (1 + magicFind/100)** — 굴림 수 불변 · 없거나 0 이면 종전과 같다 [2026-09-11 · R78] |
| `rollGear(rng, opts)` | `→ [item]` | **한 벌** [신설 2026-09-11 · R79]. `opts = {slots:[partId], ilvl, magicFind?, rareBonusPct?, weaponGroup?}`. `slots` **배열 순서대로** 부위마다 하나씩 만든다 — 베이스 → 희귀도 → `build`(§5-2). `weaponGroup` 을 주면 무기 베이스를 **굴리지 않고** 그 무기군으로 고정한다(몬스터가 제 무기군을 든다). `rareBonusPct` 는 `magicFind` 와 **같은 채널**로 레어 가중치에 더해 곱한다(`spawn_grade.csv:gear_rare_bonus_pct` — 등급이 희귀도를 미는 자리 · item_design §1 4단계). `up = 0` |
| `startingWeapon(rng, cls)` | `→ item` | ilvl 1 · magic · 직업 전속 무기군(본편만). `up = 0` |
| `legacyWeaponLayers(item)` | `→ [affix]` | **세이브 이관 전용**(§4 v22 → v23). 옛 무기의 고정 옵션 · 죄종 칸을 **rng 없이** 만든다 — 행 = `(uid 번호 + 칸 순번) % 후보 수` · 값 = 범위의 가운데(`scale` 반올림). 무기가 아니거나 무기군을 모르면 `[]` [2026-09-11 · R78] |
| `canEquip(hero, item)` | `→ null` / `class` | 무기 = 직업 전속 무기군 검사. **능력치 게이트 없음**. 2026-09-01 — 인자 3 → 2, 거절 사유 `twoHanded` 폐지(보조 슬롯 삭제) |
| `groupOf(item)` | `→ 무기군 정의 또는 null` | |
| `groupsFor(cls)` | `→ 무기군 정의[]` | 본편(`stage === 'main'`) 무기군만 |
| `regroupWeapon(item, groupId)` | `→ item` | **세이브 이관 전용** (§4 v15→v16). 개체 굴림(`watk`·접사·`up` · ~~`element`~~ R80 폐기)은 두고 **`group` 과 `name` 만** 갈아끼운다. 게임 중에는 부르지 않는다 — 무기군은 드롭 때 정해지고 안 바뀐다 |
| `salvageDust(item)` | `→ int` | 희귀도별. **강화 단계는 반환량에 안 들어간다** (기획 없음) |
| `upgradeMax()` | `→ int` | `equip_upgrade_max` |
| `upgradeCost(item)` | `→ int 또는 null` | 다음 한 단계의 골드. 상한이면 `null`. `round(base × growth^up)` |
| `upgrade(rng, item)` | `→ {up, affix: {stat, from, to} 또는 null}` | **in-place.** 옵션 계단이 아니면 `rng` 를 **한 번도 안 쓴다** |
| `effective(item)` | `→ item` | 베이스에 강화 배율을 먹인 **읽기용 사본**. `up === 0` 이거나 베이스가 없으면 **원본을 그대로** 돌려준다(할당 없음) |
### 2-6. `battle.js` — 헤드리스 전투

`createBattleSystem(data)` — 주입 `data`: `balance, monsters(byId), stages(byId), roundSets {round_set: [{round_num, round_type}]}, budgets(byKey), grades(byKey), sins, sinTraits {sin: trait}, commonTraits [trait], itemSystem, skillSystem, heroSystem, classSkills {classId: [skillId]}, slots [partId]`.
**`heroSystem` · `classSkills`** [신설 2026-09-11 · R79] — 몬스터가 **영웅과 같은 경로로 전투 능력치를 얻는다**(§8-1 「계산이 한 곳」 · monster_design §5-1): `heroSystem.computeCombat` 을 몬스터에도 부르므로 시스템째 주입받는다. `classSkills` 는 보스 셋째 스킬 칸의 후보 풀이다(직업 → 스킬 id 목록 — `item` · `hero` 에 넘기는 **같은 표**). 없으면 셋째 칸이 비고 굴림은 그대로 1회 돈다. `slots` 는 `monster.csv:wear_slots` 어휘다. **생성 시 검사하고 틀리면 throw 한다** — `heroSystem` 부재 · 몬스터마다 `cls`(직업 풀에 있나) · `weapon_group`(`itemSystem.groupOf`) · `innate_skill`(`-` 또는 `skill.defs`) · `wear_slots`(`weapon` 포함 · 부위 어휘) · 등급마다 `skill_slots ≥ 1`. `roundSets` 검사와 같은 이유다 — 오타가 조용히 새면 전투 도중에 터지거나 칸이 조용히 빈다.
**`roundSets`** [개정 2026-09-11 — ~~`roundTypes [{round_num, round_type}]`~~ 전역 한 벌 · R75] = `stage_round.csv` 를 **세트(`round_set`)별로 묶어 `round_num` 순으로 정렬**한 것. 스테이지가 `stage.csv:round_set` 으로 하나를 고른다 — 라운드 수는 **그 세트의 행 수**이고 전역 키(~~`balance.csv:rounds_per_stage`~~)는 없다. 생성 시 **모든 스테이지의 세트가 실재하는지** 검사하고 없으면 throw 한다.
`sinTraits` / `commonTraits` 는 ⚠ `ui/mock.js` 출처. `skillSystem` 이 없으면 액티브 없이 기본 공격만 돈다.

| export | 시그니처 | 계약 |
|---|---|---|
| `stagePool(stage)` | `→ monsterIdx[]` | 해당 챕터·스테이지의 `spawn_grade === 'normal'` 몬스터. **챕터보스 스테이지는 빈 배열**이다 — 보스 단독이라 호위도 0 이고 풀을 한 번도 안 뽑는다 (2026-09-11 R75) |
| `stageRounds(stage)` | `(stage 행 객체) → [{round_num, round_type}]` | 그 스테이지의 라운드 줄 = `roundSets[stage.round_set]`(round_num 순). **라운드 수 = 길이.** 챕터보스 스테이지는 `boss` 한 줄뿐이다(base_expedition_design §1-2). 화면의 라운드 트랙 · 예상 소요 · 리포트 총수도 이것을 부른다 — 렌더러가 세트를 직접 고르지 않게 여기 둔다(`stageElement` 와 같은 이유 · 2026-09-11 R75) |
| `stageElement(stage)` | `(stage 행 객체) → elementId` \| `'physical'` | 그 스테이지 몬스터의 `attack_type` 중 physical 이 아닌 **첫 값**. 편성 화면의 "이 스테이지가 요구하는 저항"(§9-8) — 렌더러가 몬스터 테이블을 훑지 않게 여기 둔다 |
| `makeEnemy(key, monsterId, grade, lvl, gear?, extra?)` | `→ 전투 유닛` | 몬스터 → 유닛 변환 규칙 자체가 계약이라 내보낸다(검증이 직접 본다). `gear` = 그 몬스터가 **입고 있는 아이템 배열**(`rollGear` 결과 · 생략하면 `[]` = 맨몸) [신설 2026-09-11 · R79]. 아래 |
| `simulate(partyUnits, stageId, rng)` | `→ result` | `partyUnits = [{uid, combat, stats?, actives?, reactions?}]` (`combat` = `computeCombat` 결과, `stats` = **기본 능력치 7종**(`hero.stats` — 스킬 계수가 읽는다 · 없으면 `null` = 계수 0 취급 · 2026-09-10 R72), `actives` = **인스턴스** `[{id, source}]` = `skill.activesFor` — 정의는 `skill.resolve` 로 푼다 · `reactions` = `[{on, fn}]` 사건 훅 핸들러, ⚠ 소비자 없음 — 2026-09-01). **`actives` 가 없거나 비면 기본 공격만 돌고 rng 수열은 스킬 도입 전과 같다.** 아래 |

**드롭 (`onKill`) — 떨어지는 것은 그 몬스터가 입고 있던 장비다** [개정 2026-09-11 · R79 · item_design §1 2단계 · monster_design §5-1]. **처치당 최대 1개**(확정 2026-08-27)는 그대로이고 바뀐 것은 **무엇이 떨어지나**다.
판정은 **1회**: `rng()×100 < drop_chance_pct × dropChanceMult × 아이템 드랍률배율` 이면 1개. 보스(`stage_boss`/`chapter_boss`)는 `boss_guaranteed_drop` 을 하한으로 보장한다.
드롭이 있으면 **입은 부위 중 하나를 균등 굴림(1회)** 해서 `unit.gear` 의 그 아이템을 **그대로** 내보낸다 — 여기서 아이템을 만들지 않는다. ~~ilvl 1회 → `rollDrop`~~ 은 삭제됐다.
⚠ **맨몸 몬스터는 드롭이 없다** — `gear` 가 비면 판정이 성공해도 낼 것이 없어 굴림만 소비하고 넘어간다(`wear_slots` 가 비는 행이 생기면 그 몬스터는 장비를 안 준다).
**파이프라인 3~6단계는 스폰으로 옮겨갔다** — ilvl(`dlvl + grade.gear_ilvl_add` · **굴림 없음**) · 희귀도(`magicFind + grade.gear_rare_bonus_pct`) · 접사 · 개체 굴림이 전부 `spawnRound` 에서 돈다(§5-2). 그래서 **등급 반영이 해소됐다** — ~~DEV_PLAN R20 미반영~~. **매직찬스는 스폰 굴림에 걸린다** — 전투 시작 때 굳힌 파티 평균 `magicFind` 가 `rollGear` 로 간다. ⚠ **딸린 것 — 파티의 매직아이템 획득확률이 적 장비도 좋게 한다**(즉 적이 세진다). 사용자가 알고 택한 것이다 [2026-09-11 · 「이스터에그」].

**전투 유닛 — 몬스터와 파티가 같은 필드 모양이다** (§8-1). `formula.strike` 가 읽는 이름 그대로 쓴다:
`{key, side, hp, hpMax, atk, atkType, def, res:{fire,cold,lightning,poison}, lvl, resMaxBonus, dr, defIgnore, resReduction, skillMult, bonusPct, crit, critDmg, ls, reflect, period, next}`
스킬 런타임이 얹은 필드 — 전부 **전투 안에서만** 산다 (세이브에 넣지 않는다):

| 필드 | 계약 |
|---|---|
| `atkBase` · `atkPct` | 버프 괄호. `atkBase = atk / (1 + atk_pct_sum/100)` · `atkPct = atk_pct_sum`. 유효 공격력 `atk = atkBase × (1 + (atkPct + Σ버프 atk_pct)/100)` — **새 곱셈 층을 만들지 않는다**(§9-2). ⚠ **몬스터도 `atkPct` 를 든다** [2026-09-11 · R79] — 낀 무기의 고정 옵션(`atk_pct`)과 오만 칸이 같은 괄호에 들어간다 |
| `matk` | 회복량의 밑수 = `combat.atk_magic ?? 0`. ⚠ **마법 무기를 낀 몬스터는 0 이 아니다** [2026-09-11 · R79 · monster_design §5-1] — 소환은 0 |
| `matkBase` | `matk / (1 + atk_pct_sum/100)` — 회복 밑수의 괄호 앞 값. 유효 `matk = matkBase × (1 + (atkPct + Σ버프 atk_pct)/100)` — `atk` 와 **같은 괄호**(2026-09-01). 마법 무기를 낀 몬스터는 0 이 아니다(위) · 소환 0 |
| `basePeriod` | `period` 의 원값. `period = basePeriod × (1 − Σ버프 period_pct/100)` |
| `hpMaxBase` · `defBase` · `resBase` · `drBase` · `regenBase` | 창이 미는 축의 **원값** [신설 2026-09-09]. `refreshDerived` 가 창 합으로 값을 다시 쓰고 **창이 없으면 밑수로 되돌린다** — 그래서 `hpMax`·`def`·`res`·`dr`·`regen` 을 직접 대입하는 코드는 밑수도 같이 옮겨야 한다(안 그러면 다음 파생에서 되돌아간다). `resBase` 는 4원소 객체 |
| `summon` · `summonOf` | 소환 유닛 표식과 시전자 key [신설 2026-09-09]. **`side` 는 시전자와 같다**(파티 배열에 들어간다) — 그래서 적의 대상 굴림 모집단이 커진다. ⚠ **전멸 판정에서는 뺀다**(`alive(party).filter(u => !u.summon)`) · 라운드가 바뀌면 `beginRound` 가 걷어낸다 · 행동은 `next: Infinity` 로 막는다 · ⚠ **적도 소환한다** [2026-09-11 · R79] — 벽은 시전자 쪽 배열(`units.enemies`)에 서고 **클리어 판정에서도 빠진다**(전멸 판정과 같은 규칙) · 적 벽을 쓰러뜨려도 `onKill` 을 안 지난다(처치 · 기여 처치 수 아님 · rng 0) · 적 벽은 다음 라운드의 적 배열 교체로 사라진다. ⚠ 파티 벽이 쓰러지면 `result.downed` 에 uid 없이 실린다 — R79 **이전부터** 있던 동작이고 미수정(DEV_PLAN R79 보고) |
| `actives` | `[{id, def, readyAt, source}]` — 전투 시작 시 전부 `readyAt = 0`(전부 준비). `source` 는 배정 출처(`innate`/`weapon_group`/`advance`) — 화면 라벨용, 전투는 읽지 않는다. ⚠ **몬스터도 든다** [2026-09-11 · R79] — 칸 수는 `grade.skill_slots`(일반 1 · 정예 2 · 보스 3) · 소환 `[]`. ⚠ **적의 오오라도 칸에서 뺀다** — 파티와 같은 `applyAuras` 가 **라운드 시작에**(`beginRound` · `units.enemies` 교체 직후) `until: Infinity` 창으로 건다(대상 = `self` 면 자신 · 아니면 그 적 배열 · rng 0 · 이벤트 없음). 안 빼면 쿨 0 액티브가 되어 매 차례 시전만 반복한다 |
| `reactions` | `[{on, fn}]` — 사건 훅 핸들러 (§2-12). 기본 `[]`. ⚠ 등록하는 소비자가 아직 없다 — 마스터리 T3(반응 패시브)의 자리 (2026-09-01) |
| `buffs` | `{skillId: {stat, v, until, element, by}}` — 창 하나 = 스킬 하나. **중첩 없음**, 재시전은 `until` 갱신. `element`(평타 부여가 때릴 원소) · `by`(건 자의 key — 지목이 읽는다)는 2026-09-09 신설. **`until: Infinity` 는 오오라**(만료가 영원히 안 걸린다) · `v` 가 **음수면 디버프**(적에게 건 창) · **`quiet: true` = 무기 옵션 창**(키 `wx:…` — 열 때도 닫을 때도 이벤트를 안 낸다 · 2026-09-11 R78) |
| `barrier` | `{amt, until, s}` 또는 `null` — HP 밖 흡수 풀 |
| `stats` | 기본 능력치 7종 `{str, agi, int, vit, luck, ldr, cha}` — 영웅은 `partyUnits[].stats`, **몬스터는 `monster.csv` 의 7컬럼**(몬스터마다 고정 · 2026-09-11 R79). **소환만 `null`**. 시전 순간 `skill.scaleDef(def, u.stats)` 가 읽는다(`null` = 계수 0) [2026-09-10 · R72] |
| `flat` · `procChance` · `procMult` | `strike` 가 읽는 **스킬 타격 전용** 필드 — `strikeOnce` 가 그 타격 동안만 얹고 원복한다(§8 항목 13). 평소 0 [2026-09-10 · R72] |
| `fx` · `magicFind` | **무기 옵션 묶음** = `combat.option_fx`(§2-4) · 없으면 `null` / `0` [신설 2026-09-11 · R78]. ⚠ **몬스터도 든다** [2026-09-11 · R79] — 낀 무기의 옵션이 그대로 산다(강타 · 타격 시 창 · 조건부 %). **소환만 `null`**. `strikeOnce` 가 `fx` 가 있을 때만 읽는다(아래 「무기 옵션」 행) · `magicFind` 의 **파티 평균**은 `party` 배열만 훑으므로 적 장비의 값이 섞이지 않는다 |

| 몬스터(`makeEnemy`) | 값 [전면 개정 2026-09-11 · R79] |
|---|---|
| **전투 능력치 전부** | `heroSystem.computeCombat({stats, level: lvl, cls, innate}, gear)` — **영웅과 같은 함수**다. `stats` = `monster.csv` 의 기본 능력치 7종(몬스터마다 고정) · `gear` = 스폰 때 굴린 장비. ~~`monster.csv` 소재값 × `spawn_grade` 배율~~ 은 폐기(`hp`·`attack`·`action_period` **컬럼째 삭제**) — HP 는 `hero_hp_base` × 레벨 성장 × 건강, 공격력은 **무기 밑수**, 주기는 **무기군 / 민첩**이 낸다 |
| `def` · `res` | **몸값 + 장비** [D3] — `monster.csv:defense` · `res_*` 를 `computeCombat` 결과에 **더한다**(장비가 그 위에 얹힌다). 몸에 남긴 이유는 도감이 저항을 공략 정보로 적고(§8-1) 「이 원소를 막았나」가 판마다 요동치면 안 되기 때문이다(§9-5). `grade.def_mult` · `grade.res_add` 는 **퇴역**(등급의 세기는 장비가 낸다) |
| 전역 배율 | `hp` `× grade.hp_mult × monster_hp_scale` · `atk` `× monster_atk_scale` · `def` `× monster_def_scale` — **합계에** 곱한다(캘리브레이션 조절값의 역할이 그것이다). `grade.hp_mult` 만 남은 이유는 **HP 가 장비에서 안 오기 때문**이다 — 빼면 보스가 호위와 같은 체력이 된다(monster_design §5-1 이 미리 짚은 자리). ~~`grade.atk_mult`~~ 는 퇴역 |
| `atkType` | **`monster.csv:attack_type` 이 이긴다** — `computeCombat` 의 `attack_type`(R80 으로 언제나 `physical`)을 덮는다. 원소는 **스테이지가 정한다**(monster_design §2) — 영웅과 다른 유일한 축이다 |
| `matk` | **마법 무기를 낀 몬스터는 `atk_magic` 을 갖는다**(= `matk` ≠ 0) [개정 2026-09-11] — ~~원소 공격 몬스터도 값은 `atk_physical` 에 둔다~~ 는 폐기. monster_design §5-1 이 「마법 무기를 낀 몬스터는 마법 공격력(회복의 바탕값)을 갖게 된다」로 인정한 것이다. 회복 스킬은 고유 후보에서 걸러 두므로 쓰이지 않는다 |
| `stats` · `actives` · `fx` | **영웅과 같다** — `stats` = 기본 능력치 7종(스킬 계수가 읽는다) · `actives` = `skill.activesFor` 가 만든 칸(등급이 수를 정한다, 아래) · `fx` = 낀 무기의 옵션 묶음(조건부 % · 타격 시 창 · 강타 · 매직찬스). ⚠ **몬스터도 강타를 때린다** — 폭식 무기를 끼면 그 값이 산다 |
| `crit` · `regen` | **영웅과 같은 밑수를 받는다** [D2 사용자 확정 2026-09-11] — `crit = base_crit_pct + 장비` · `regen = hp_regen_base_per_level × growthMult(lvl) + 장비`. ~~몬스터는 0~~ 은 폐기 — 「몬스터를 영웅과 같은 구조로」가 목적이라 특수 분기를 두지 않는다. ⚠ battle_design §8-1 출처 표의 「치명·재생은 정예 특성이 얹는다」와 부딪히는 것을 알고 택했다 |
| 스킬 칸 수 | `grade.skill_slots` — 일반 1(고유) · 정예 2(+ **낀 무기가 든 스킬**) · 보스 3(+ 직업 풀에서 스폰 때 굴린 것) [신설 2026-09-11 · skill_design §2 · monster_design §5-1]. ⚠ 보스 셋째 칸의 정체는 미정(GAME_DESIGN §10) |
| `gear` | 입고 있는 아이템 배열 — `monster.csv:wear_slots` 순서. **드롭이 여기서 하나 나간다**(아래) · **세이브에 안 들어간다**(타임라인과 같은 취급 · 떨어진 한 점만 `result.drops` 로 나간다) [D4] |
| `lvl` | `stage.dlvl` — 몬스터마다 두지 않는다 (§9-4) |
| `dropChanceMult` | `grade.drop_chance_mult` — **굴림 횟수가 아니라 확률 배율**이다 (드롭은 처치당 최대 1개, 아래) |
| `monsterType` | `monster.monster_type`(Normal/Demon/Undead) — 무기 옵션 vs 종족의 조건 [2026-09-11 · R78] |
| `cls` | `monster.csv:cls` — **본편 직업 5종 그대로** [신설 2026-09-11]. 정하는 것은 **스킬 풀과 무기군**이고 자리는 `role` 이 정한다(겸하지 않는다 · monster_design §5-1) |

파티 유닛은 `computeCombat` 출력을 그대로 옮긴다 — `bonusPct ← dmg_bonus_pct` · `dr ← damage_reduction`(실효 %) · `res ← res_* 4종` · `lvl ← level` · `regen ← hp_regen` · `cdr ← cooldown_reduction`. **몬스터도 같다** [개정 2026-09-11 · R79] — ~~몬스터는 `regen`·`cdr` 이 0~~ 은 폐기(같은 함수를 지나므로 밑수도 장비분도 그대로 온다 · 위 표 `crit`·`regen` 행). **`stats` 는 몬스터도 든다** — 영웅은 `partyUnits[].stats`, 몬스터는 `monster.csv` 의 7컬럼이다(~~몬스터·소환은 `null`~~ → **소환만 `null`**).
**유닛 생성은 `makeUnit(side, combatLike, extra)` 하나다** (2026-09-01) — 그리고 **`combatLike` 를 만드는 함수도 하나다** [개정 2026-09-11 · R79]: ~~`combatFromMonster(m, grade, lvl)`~~ **삭제**되고 몬스터도 `heroSystem.computeCombat` 을 지난다. 필드 이름이 같아서가 아니라 **같은 함수라서** 같다 — §8-1 의 「계산이 한 곳」이 문자 그대로 성립하고, 이식 대조도 한 함수로 양쪽을 검증한다. 몬스터 전용으로 남는 것은 **①몸값 합류(`defense`·`res_*`) ②전역 배율 ③`attack_type` 덮기** 셋뿐이고 셋 다 위 표에 있다. `makeEnemy` export 는 그 셋까지 지난 결과를 낸다.

**result** — `{won, reason, durationSec, party:[{key, uid, hpMax, period, atk, matk, atkType, stats, actives:[skillId]}], timeline:[ev], xpTotal, gold, kills:{monsterId:n}, cards:{monsterId:n}, drops:[item(uid null)], downed:[heroUid], roundsCleared, rounds:[{n, kind, killed:[monsterId], eliteSin}], strikes:{party:{n,miss}, enemy:{n,miss}}, contrib:[{uid, dealt, taken, kills}], casts:{skillId:n}}`
- `party[].stats` = **전투 시작 시점 기본 능력치의 복사본**(`partyUnits[].stats` 가 없으면 `null`) — 설명창이 스킬 계수를 풀어 쓰는 표시값이다. `atk`·`matk`·`atkType` 과 같은 취급이라 rng·타임라인·골든과 무관하다(`matk` = 회복 스킬 설명창의 밑수 · 2026-09-10 추가) · 복사본인 이유는 정산(`grantXp`)이 전투 **뒤에** 능력치를 올리기 때문이다 [2026-09-10 · R72]
- `casts` = 스킬별 시전 횟수. 타임라인의 `skill` 이벤트 수와 합이 같다
- `reason` 은 `clear` / `wipe` / `timeout`. **`retreat` 는 2026-09-03 에 폐기됐다.**
  **귀환 룰** (base_expedition_design §1-1 · **개정 2026-09-03** · 아웃 단위 개정 2026-09-08) — 전투불능자가 나와도 **런을 접지 않는다.** 아웃은 **그 런 안에서만** 유효하다 — 다음 반복 런에는 전원이 다시 나간다. 남은 인원으로 계속 가고 **전원이 쓰러졌을 때만** `wipe` 로 끝난다. 판정 순서는 ① 전멸 ② 라운드 정리(클리어·다음 라운드) ③ 제한시간. ~~전투불능자가 하나라도 나오면 그 자리에서 철수~~ 는 폐기 — 그래서 `wipe` 가 **패배의 일반형**이 됐다(종전에는 같은 틱 전멸에서만 났다). 쓰러진 영웅은 `result.downed` 에 실려 `state.run.downed`(출정 누적)로 옮겨간다
  ⚠ 이 룰은 런의 길이를 바꾼다 — 캘리브레이션 대역은 이 룰이 들어간 뒤의 값이어야 한다
- `strikes` = 직격 시도 수와 빗나간 수. **레벨 부족의 전용 신호**라 리포트에 따로 낸다 (§9-4·§9-8). 세는 것뿐이라 **rng 를 소비하지 않는다**
- `contrib` = **파티 영웅별 기여** — 가한 피해 · 받은 피해 · 처치 수 [신설 2026-09-09 · R68]. 전투 시작 시점의 **파티 전원**이 자리를 갖고(0 이어도 줄이 선다) 순서는 파티 순서다. 「가한 피해」는 **감쇠 후 최종 피해**이고 배리어가 먹은 몫도 든다 — 관전의 누적 데미지 판(§6)이 이벤트의 `dmg` 를 더한 값과 **같은 값**이다. **반사는 되받은 쪽의 가한 피해**로 세고, 처치는 **적을 쓰러뜨린 것**만 센다(적의 소환 벽은 안 센다 · R79). ⚠ **소환물은 안 센다** — 행동하지 않아 가한 피해가 없고, 소환물이 맞은 것은 주인이 맞은 것이 아니다. `strikes` 와 같이 **rng 를 소비하지 않고 타임라인에도 안 들어간다**
- `drops` 의 아이템은 `uid: null` — state.js 가 가방에 넣으며 발급
- **`timeline` 은 세이브에 넣지 않는다.** 리포트만 남긴다

**타임라인 이벤트** — 전부 `{t, e, …}`. `t` = 초, 소수 첫째 자리 반올림.

| `e` | 필드 | 의미 |
|---|---|---|
| `round` | `n, kind, enemies:[{key, monsterId, grade, sin, traits, hpMax, period, atk, matk, atkType, stats, actives}]` | 라운드 시작. **그 라운드의 첫 이벤트** · `atk`·`matk`·`atkType`·`stats`·`actives` 는 **재생기의 표시값**이다 [2026-09-11 · R79 후속 · 사용자 지적] — `actives` = 그 적의 스킬 id 배열(칸 순서 = 출처 자리 · 고유 → 무기 → 셋째 · 등급이 연 칸만), 나머지는 스킬 툴팁 문장(피해·회복량 · 스킬 계수)의 재료다. `party[]` 의 같은 이름 필드와 **같은 모양**이고 전투에는 안 쓰인다. ⚠ 파티 쪽과 달리 **타임라인 안**이라 골든 지문(`tl`)에 걸린다 — rng 소비는 0 |
| `hit` | `a, d, dmg, crit, dhp` (+ `ahp` 흡혈 시 · `s?` 스킬 타격 · `proc?` 추가 피해가 터졌을 때만 `true` · `bar?` 배리어 잔량 · `cb?` 강타 몫 — `dmg` 에 이미 들었다 · R78) | 직격 적중. `dhp` = 피격 후 HP. `bar` = 대상이 배리어를 갖고 있었을 때 **흡수 후 잔량**. `proc` 은 **터진 타격에만** 붙는다(안 터지면 키가 없다 · 2026-09-10 R72) |
| `dodge` | `a, d` (+ `s?`) | 직격 빗나감 (적중 게이트 실패 — 회피 스탯은 없다. **키 이름은 계약이라 유지**) |
| `reflect` | `a, d, dmg, ahp` | 비직격 반사. `a` = 반사한 쪽 |
| `down` | `u` | 전투불능 |
| `card` | `u, monsterId` | 도감 카드 판정 성공 (처치와 별개) |
| `regen` | `u, amt, dhp` | HP 재생. **정수 1 이상이 쌓인 틱에만** 나온다(초당 값을 틱마다 누산) · 행동 처리 **앞** · rng 소비 없음 |
| `skill` | `u, s, ready` | 액티브 시전 — 그 차례의 사건. 뒤따르는 `hit`/`dodge`/`heal`/`buff` 가 같은 `s` 를 단다. `ready` = 그 스킬이 **다시 준비되는 시각**(쿨감소가 이미 반영된 값) — 재생기가 쿨을 계산하지 않게 시뮬이 실어 보낸다 |
| `heal` | `a, d, amt, dhp, s` | 회복. `dhp` = 회복 후 HP |
| `buff` | `u, s, stat, v, until` (+ `amt` 배리어 총량) | 창 적용 또는 갱신. `until` = 만료 시각(소수 1자리). **결투(`duel`)는 둘을 낸다** — 지목당한 적의 창과 시전자 자신의 `dr_pct` 창(같은 `s`·`until` · 2026-09-10 R72) |
| `buffEnd` | `u, s` | 창 만료 (그 틱의 행동 처리 **앞에서**) · 결투 시전자 창이 라운드 경계에서 닫힐 때(그 라운드의 `round` 이벤트 바로 앞 · 2026-09-10) |
| `end` | `won, reason` | **마지막 이벤트**. `reason ∈ clear \| wipe \| timeout` (`retreat` 폐기 2026-09-03) |

유닛 키: 파티 `p0..`, 적 `e0..`(라운드마다 0부터).

**순서 보장** — ① `t` 는 단조 비감소 ② `round` 가 라운드의 첫 이벤트 ③ `end` 가 마지막 ④ 같은 `t` 안에서는 배열 순서가 곧 발생 순서(스킬 이벤트도 같다 — `skill` 뒤에 그 시전의 타격·회복·버프가 이어진다).

**스킬 실행 규칙** (정의·선택은 §2-8 `skill.js`, 실행은 여기):

| 규칙 | 내용 |
|---|---|
| 발동 | 행동 주기 도래 시 준비된 액티브 중 하나(§2-8 `pickReady`). 없으면 기본 공격. **한 차례에 하나**. 선택은 rng 를 쓰지 않는다 |
| 스킬 계수 | **시전 순간** `eff = skill.scaleDef(def, u.stats)` 를 한 번 만들고 공격 대상 표·회복·버프(`v`·`until`)·소환이 전부 `eff` 를 읽는다(§2-8). 오오라는 전투 시작에 걸 때 한 번(`v = eff.value`) · 평타 부여 창은 창의 `v` 가 `eff.value` 다. 쿨(`cool_sec`)은 슬롯이 못 민다(skill_design §13-1). `stats` 가 없는 유닛은 계수 0 이라 `eff` 가 원값과 같다 [2026-09-10 · R72] |
| 쿨 | 시전 순간 `readyAt = t + cool_sec × max([balance.csv:skill_cd_floor_mult], 1 − cdr/100)`(실시간 초 — 바닥은 2026-09-01 코드 상수 `CD_MIN_MULT` 에서 CSV 키로). 전투 시작 시 전부 준비라 첫 차례는 `priority` 로 갈린다. `cdr` 은 `combat_stat.csv:cooldown_reduction` — **표기 쿨에 곱**한다 |
| HP 재생 | 매 틱 `regenAcc += hp_regen × TICK`, 정수부가 1 이상이면 그만큼 회복하고 소수부만 남긴다(`hp = min(hpMax, …)`). **행동 처리 앞**에서 돌고 rng 를 안 쓴다. 소수점을 매 틱 더하면 타임라인이 흘러넘치고 재생기의 정수 HP 와 어긋나서 정수 단위로 끊는다 |
| 버프 창 | `until = t + duration_sec`. 만료는 매 틱 **행동 앞에서** 일괄 처리(`until ≤ t + EPS`) → `buffEnd`. rng 소비 없음 |
| `atk_pct` | 상시 % 와 **같은 괄호에 덧셈**(`atkBase`/`atkPct`). 다른 스킬의 같은 stat 은 덧셈, 같은 스킬은 갱신. **회복 밑수 `matk` 도 같은 괄호**(`matkBase` · 2026-09-01) — 함성 아래의 사제는 때리는 만큼 낫는다 |
| `period_pct` | `period = basePeriod × (1 − Σ/100)` — **다음 차례 예약부터**. 진행 중인 `next` 는 안 건드린다. 하한 처리 없음 |
| `barrier_pct` | `amt = round(대상 hpMax × v/100)`. 피해는 배리어 → HP 순. 재시전은 총량·`until` 을 다시 채우고, 창이 끝나면 남은 것은 사라진다. **흡혈·반사는 배리어가 먹은 몫을 포함한 `dmg`** 에 비례한다(직격이 들어간 사실은 같다) |
| `taunt` | 창이 켜진 **생존 파티원**이 있으면 적의 단일 대상 선택이 그 유닛(배열 순 첫 번째)으로 고정되고 **타겟 rng 를 쓰지 않는다**. ⚠ 기본 타겟팅(무작위) 위에 얹은 임시 규칙 |
| 추가 피해 | `proc_chance_pct > 0` 인 스킬의 **직격마다** `strike` 가 치명 **뒤에** 1회 더 굴린다(`rng()×100 < min(확률, 100)`) — 터지면 `× proc_mult_pct/100`(치명과 곱 · 치명 상한과 무관). 빗나감은 굴리지 않고 **반사·기본 공격·평타 부여 추가타는 싣지 않는다**. 터진 타격만 `hit` 이벤트에 `proc: true` · 훅 `hit`/`hitTaken` payload 에 `proc` [2026-09-10 · R72 · battle_design §9-2] |
| 무기 옵션 [2026-09-11 · R78] | `u.fx` 가 있을 때만 — ① **조건부 %** — `strike` 직전 `bonusPct` 에 `vs[대상 monsterType]` + (대상 grade ≠ normal 이면 `vsElite`) + (대상 rank 0 / 1 이면 `vsFront` / `vsBack`) + (그 타격 타입이 원소면 `ele[원소]`) 를 **그 타격 동안만** 더하고 원복한다(조건부 괄호 · battle_design §9-2) ② **강타** — 적중이면 `cb = round(맞기 직전 대상 hp × crush/100)` 을 `dmg` 에 더해 한 번에 깎는다 · 치명 · 방어 · 저항 · 피해 감소를 안 받는다 · **흡혈 · 반사는 `strike` 의 `dmg` 만** 본다 ③ **타격 시 창** — 적중이고 대상이 살아 있으면 `skill_effects.weaponOnHit`(§2-11) — `hit` 이벤트 뒤 · 사건 훅 앞. **셋 다 rng 0** |
| `duel` | 지목 창(적)을 열 때 **시전자에게** 같은 `until` 의 `dr_pct` 창(`v = eff.value` — 기사 자신이 받는 피해 감소 %)을 함께 걸고 `buff` 이벤트를 하나 더 낸다. 창 키는 같은 스킬 id(창은 유닛마다 따로 든다). **라운드가 바뀌면 `beginRound` 가 시전자 창을 닫는다** — 소환물을 걷고 지목이 적 배열과 함께 사라지는 바로 그 시점이다(창이 999초라 만료로는 안 닫힌다) · rng 0 · 닫을 때 **기존 `buffEnd`** 를 낸다(만료와 같은 모양이라 재생기가 칩을 걷는다 · 그 라운드의 `round` 이벤트보다 앞) [2026-09-10 · R72 후속] |
| 타겟팅 | `enemy_single` 무작위 1 → 같은 대상에 `hits` 회 / `enemy_all` 생존 적 배열 순 전원 각 1회(타겟 rng 0) — **`decay > 0` 이면 주 대상**(전열 생존자 중 배열 첫 번째 · 전열이 비면 생존자 첫 번째 · rng 0)만 `mult` 그대로이고 나머지는 `mult × (1 − decay/100)` [2026-09-10 · R72 멀티샷] / `enemy_rotate` 시작점 무작위 → 배열 순으로 돌아가며 `hits` 회(모자라면 겹침) / `enemy_chain` 시작점 무작위 → 전원 각 1회, k번째(0-base) 배율 `mult × (1 − decay/100)^k` |
| 다단타 | **타격마다 `formula.strike` 1회** — 적중·치명·흡혈·반사·전투불능을 따로 굴린다. 스킬 배율은 `skillMult`, 원소 태그는 `atkType` 에 **그 타격 동안만** 얹고 원복한다(`strike` 시그니처 불변). **스킬 타격은 `{flat, procChance, procMult}` 도 같은 방식으로 얹는다** — 기본 공격(평타 부여 추가타 포함)은 0 이다 [2026-09-10]. ⚠ 대상이 쓰러지면 남은 타수는 **버린다**(재지정 없음) · 공격자가 반사로 쓰러지면 중단 |
| 회복 | `amt = round(matk × mult_pct/100 + flat)`(`flat` = 능력치 항 — §2-8 `scaleDef` · 2026-09-10) 를 생존 아군 전원에게, `hp = min(hpMax, hp + amt)`. `matk` 는 **버프 괄호를 탄 값**(위 `atk_pct` 행 · battle_design §9-2 「회복 = 마법 공격력 × 배율」). rng 소비 없음. 화염 치유 감소는 미구현 |
| 사건 훅 | `cast`(skill 이벤트 push 직후 · 시전자) · `hit`(hit 이벤트 push 직후 · 공격자) · `hitTaken`(같은 자리 · 피격자) · `kill`(`downed(target)` **뒤** · 공격자 — 드롭 rng 가 먼저 돈다) · `down`(쓰러진 유닛). `unit.reactions` 의 `{on, fn}` 을 **배열 순**으로 부른다. 핸들러가 rng 를 쓰면 **그 자리에서** 소비한다(§5-2). 등록이 없으면 rng·타임라인 불변 — 골든이 이것을 잠근다 (2026-09-01) |
| `status` | `skill.csv:status`(결빙 등)는 **코드가 읽지 않는다** — `status_effect.csv` 미발행 |
| `tags` | `skill.js` 가 **정규화·검증**하지만 **전투 로직은 읽지 않는다** — 소비자는 전술카드 조건·변형 노드·화면이다 (§2-8 · skill_design §11) |

### 2-7. `state.js` — 상태 전이

`export const SAVE_VERSION = 22`  [v22 = **챕터는 5스테이지다** — 클리어 기록 소급 · R75 · 2026-09-11] [v21 = **리포트는 목록이다** · R68 · 2026-09-09] [v20 = **진형이 실물이 된다** · R67 · 2026-09-09] [v19 = **처치 가루 폐지** · R63 · 2026-09-09] [v18 = 직업 스킬 풀 · R59 · 2026-09-09] [v17 = **「출정 아웃」 폐기** · R54 · 2026-09-08] [v16 = 사제 전용 무기 · R46 · 2026-09-08] [정정 2026-09-08 — 문서가 v11 에서 멈춰 있었다. 같은 문서 §4 는 이미 v15 이관을 적고 있어 자기모순이었다]

`createGameSystem(deps)` — `deps`: `hero, item, battle, skill, tactic, balance, equipSlots [{id, part}](착용 위치 8), stages(byId), stageOrder [id], monsters(byId), codex {levels:[cards_to_next], bonus:[%], statByNum:{stage_num: statKey}}`, **`sins [죄종 id]`** · **`searchStories`**(= `search_story.csv` 파싱 행) [신설 2026-09-09 — 수색].
**만남 표도 같은 자리에서 검증한다** [신설 2026-09-09] — `searchMeetings`(`search_meeting.csv`) · `searchAnswers`(`search_answer.csv`)도 주입이고, `meeting_id`·`answer_id` 유일 · `sin`/`hit_sin` 이 죄종 · `need_sin` 이 `-` 또는 죄종 · 답이 가리키는 만남이 실재 · 문구 비지 않음 · **만남마다 공통(`-`) 답이 최소 하나**(없으면 그 죄종을 안 보낸 판에서 고를 것이 0개가 된다)를 어기면 throw.
**컬럼 둘이 서로 다른 질문에 답한다** — `need_sin` = **누가 갔나**(그 답이 **보이는가**) · `hit_sin` = **누굴 만났나**(그 답이 **먹히는가**). 규칙은 이 둘이 전부다.

**수색 이야기 표는 로드 시 검증한다**(어긋나면 throw): `story_id`·`phase`·문구가 비지 않음 · `sin` 이 `-` 또는 죄종 · **막(`phase`)마다 `phase_order` 가 하나** · `phase_order` 가 **1부터 연속** · **막마다 공통(`-`) 행이 최소 하나**(없으면 그 죄종에서 후보가 비어 「막마다 굴림 1회」가 깨진다). **막의 어휘도 순서도 코드에 없다** — 막을 늘리는 일이 CSV 행 추가뿐이 되게 한 것이다(`tactic_slot.csv` 의 「칸 수 = 행 수」와 같은 문법).
`codex.levels`/`codex.bonus` 는 codex_level.csv(`cards_to_next`/`bonus_pct`) · `codex.statByNum` 은 codex_series.csv 출처. `equipSlots` 는 equip_slot.csv 를 `slot_order` 로 정렬한 것(08-31 — mock 잔류 해소).

**모든 함수는 `state` 를 첫 인자로 받고 그 객체를 직접 바꾼다.** 시스템 자체는 무상태. 시각이 필요한 함수는 `now`(ms) 를 받는다.

| export | 시그니처 | 결과 |
|---|---|---|
| `newGame(seed, candidates, now)` | `→ state` | 후보 = **로스터**. 각자 시작 무기 1개 착용. 시작 무기 rng = `deriveSeed(seed, 0)`.<br>**`party` 는 빈 배열이다** [개정 2026-09-09 사용자 지시 · SCREEN_DESIGN §5] — ~~로스터 = 파티~~ 폐기. 편성은 플레이어의 결정이라 로직이 대신 하지 않고, `party` 가 넣은 순서 그대로이므로 **처음 고른 영웅이 리더**(`party[0]`)가 된다. ⚠ **전투를 바로 돌리는 쪽**(골든 · `dev/test.js` · `?dev=battle\|play\|offline`)은 `toggleParty` 로 **직접 채워야 한다** — 그 함수는 rng 를 안 쓰므로 로스터 순서로 채우면 옛 결과와 같다 |
| `serialize(state, now)` | `→ json` | `clone + {version, savedAt}`. 순수 |
| `deserialize(obj)` | `→ state` **또는 throw** | v9 는 그대로, **v2~v8 은 안에서 연쇄로 올린다**(v2→…→v9, §4). 그 외 버전은 throw. 누락 필드 기본값 보정 |
| `canLoad(obj)` | `→ bool` | `deserialize` 가 통과하는가. **받아들이는 버전 목록을 두 곳에 두지 않기 위해** 실제로 한 번 돌려 보고 답한다 — 화면이 버전 숫자로 직접 판정하면 이관을 늘릴 때마다 멀쩡한 세이브를 거부하게 된다 |
| `heroById(state, uid)` · `heroItems(state, h)` | 조회 | ~~`isOut(state, uid)`~~ 는 **2026-09-08 삭제** — 「출정 아웃」 폐기로(GAME_DESIGN §9 09-08) **전투 밖에 아웃된 영웅이 존재하지 않는다.** 아웃은 런 안에서만 살고 런은 출발 순간 통째로 정산되므로, 상태가 답할 수 있는 질문이 아니다 (R54) |
| `codexLevel(cards)` · `codexNext(cards)` · `codexMaxLevel()` · `codexBonusAt(lv)` · `codexBonus(state)` | 도감 | `codex.levels` 는 **레벨당 증분**, 여기서 누적한다 |
| `heroCombat(state, h)` | `→ combat` | `computeCombat(h, 착용품, codexBonus, 파티 전술)`. **전술은 `state.party` 에 든 영웅에게만** 넘어간다 — 벤치는 `null` (§2-9). 착용품은 `item.effective` 를 통과해 들어간다 — **강화 배율을 아는 곳은 `item.js` 하나**이고 `hero.computeCombat` 은 `up` 을 모른다 |
| `equipTarget(hero, item)` | `→ position 또는 null` | 같은 부위의 빈 위치 우선, 없으면 첫 위치 |
| `equip(state, heroUid, itemUid, position?)` | `→ {ok, back:[uid], position}` / `{ok:false, err}` | err: `missing` · `class` · `bagFull`. **`back` 은 언제나 0~1개** — 양손↔보조 배타가 사라져 둘이 돌아오는 경우가 없다 (2026-09-01) |
| `unequip(state, heroUid, position)` | `→ {ok}` / `{ok:false, err}` | err: `missing` · `bagFull` |
| `salvage(state, itemUid)` | `→ {ok, dust}` / `{ok:false, err}` | err: `missing`. 가방 아이템만 |
| `upgradeState(state, itemUid)` | `→ {up, max, cost, gold, canUpgrade, optionAt}` / `null` | **판정을 여기서 다 낸다.** `optionAt` = 다음 옵션 상승이 걸리는 단계(없으면 `null`). 없는 아이템이면 `null` |
| `upgradeItem(state, itemUid)` | `→ {ok, up, cost, affix}` / `{ok:false, err}` | err: `missing` · `maxUp` · `gold`. **가방·착용 가리지 않는다**(`items` 에 있으면 된다) — 강화는 소유물에 하는 일이지 자리에 하는 일이 아니다. `counters.upgrade++` · rng = `deriveSeed(seed ^ 0xF0C3, counters.upgrade)` |
| `toggleParty(state, uid, now)` | `→ {ok}` / `{ok:false, err}` | err: `missing` · `full` · **`searching`**(수색 나가 있다 — 마을에 없으므로 편성할 수 없다 · 신설 2026-09-09). 넣을 때만 본다 — 뺄 때는 검사가 없다(나가 있는 영웅은 애초에 파티에 못 들어간다). (~~`injured`~~ 는 2026-09-03 에 검사 자체가 사라졌다 — 계약 문서에만 남아 있던 것을 09-06 에 지웠다) |
| `formationState(state)` | `→ {tpl, caps, ranks, byUid, templates, shapes}` | **읽기 전용 · 순수하다** — 진형(§4 `formation`). `caps` = 랭크별 정원 · `ranks[r]` = 그 랭크의 uid 배열 · `byUid[uid]` = 랭크 번호 · `templates` = **표의 행 순서**(⚠ `Object.keys` 는 `'3'` 같은 정수형 키를 앞으로 끌어올려 첫 행을 못 준다) · `shapes[tpl]` = 그 템플릿의 정원. 신설 2026-09-09 |
| `setFormation(state, tpl)` | `→ {ok}` / `{ok:false, err}` | err: `missing`(표에 없는 템플릿). 정원이 갈리므로 재배치가 따라온다. 신설 2026-09-09 |
| `placeFormation(state, uid, rank, idx?)` | `→ {ok, swapped}` / `{ok:false, err}` | err: `missing`(파티 밖 · 없는 랭크 · **정원 밖 칸**). **`idx` 를 주면 그 칸이 목적지다** [2026-09-11 · 편성 드래그 · SCREEN_DESIGN §4-1] — 주인이 있으면 **그 주인과** 맞바꾸고(같은 랭크 안에서도 · `swapped` = 그 주인), 비었으면 그 랭크 끝으로 간다(칸은 늘 앞부터 차서 빈 칸은 랭크 끝에만 있다 · `swapped` = `null`). **`idx` 를 안 주면** 정원이 찼을 때 **그 랭크의 마지막 하나와 맞바꾼다**(`swapped` = 밀려난 uid · 아니면 `null`). rng 를 안 쓴다. 신설 2026-09-09 |
| `rankOf(state, uid)` | `→ 0 \| 1` | 그 영웅의 자리. 배치가 없으면 **전열(0)** — 자리를 못 받은 유닛이 뒤에 숨지 않는다. 신설 2026-09-09 |
| ~~`returnToTown(state)`~~ | — | **2026-09-08 삭제** (R54). 「출정 아웃」이 없어져 **귀환이 회복할 것이 없다** — 회복은 런이 끝나는 순간 자동이고 상태에 남는 것이 없다. 호출하던 세 자리(반복 미이어짐 · 전멸 · `closeRun`)에서 함께 걷었다 |
| ~~`activeParty(state, stageId)`~~ | — | **2026-09-08 삭제** (R54). 아웃이 런을 넘지 않으므로 **언제나 `state.party` 전원**이 나간다 — 뺄 명단이 없다 |
| `stageUnlocked(state, stageId)` | `→ bool` | 첫 스테이지 또는 직전 클리어 |
| `canDepart(state, stageId, now)` | `→ null` / `locked` / `noParty` | ~~`injured`~~ 없음 — 아웃된 영웅을 뺀 파티가 비면 `noParty` 로 떨어진다 (2026-09-03) |
| `resolveBattle(state, stageId, now)` | `→ {ok, result, report}` / `{ok:false, err}` | 전투 rng = `deriveSeed(seed, ++counters.battle)`. 시뮬 → XP(전원 동일) → **골드**(가루는 2026-09-09 폐기 — item_design §5-3) → 도감 → 드롭(가방 초과는 `discarded`) → 클리어 → `lastReport` · `run` 갱신 [정정 2026-09-09 — 「출정 아웃 반영(`run.downed`)」은 v17 에 사라졌는데 이 줄이 계속 약속하고 있었다] |
| `closeRun(state, now)` | `→ notice 또는 null` | `run.repeat` 이 켜져 있을 때만: 끄고 `notice` 세팅. **오프라인 재정산 없음** |
| `dismissNotice(state)` | | |
| `tavernCandidates(state)` | `→ (hero\|null)[]` | rng = `deriveSeed(seed ^ 0x5A17, counters.tavern)` — 저장 없이 재현. 길이는 `tavern_candidates`, **고용한 칸은 `null`** |
| `tavernState(state, now)` | `→ {candidates, freeAt, free, cost}` | 선술집 화면 상태 한 덩어리 — **판정을 여기서 다 낸다**(`masteryState` 와 같은 규칙). `freeAt` = 무료 리롤이 열리는 시각(리롤한 적이 없으면 `0`) |
| `tavernReroll(state, now)` | `→ {ok, free}` / `{ok:false, err:'gold'}` | 쿨다운(`tavern_refresh_hours`)이 끝났으면 **무료**, 남았으면 `tavern_reroll_cost` 골드. `counters.tavern++` · `tavern = {rerolledAt: now, hired: []}` — 명단을 통째로 갈고 빈 칸을 되살린다 |
| `hire(state, index)` | `→ {ok, hero}` / `{ok:false, err}` | err: `roster` · `gold` · `missing`(빈 칸 포함). **`counters.tavern` 을 올리지 않는다** — 산 칸만 `tavern.hired` 에 남고 나머지 명단은 그대로다 (base_expedition_design §2-4: 고용이 무료 리롤 우회로가 되지 않게) |
| `dismiss(state, uid)` | `→ {ok}` / `{ok:false, err}` | **해고 — 로스터에서 지운다. 되돌릴 수 없다** [신설 2026-09-09 사용자 확정]. err: `missing` · **`searching`**(수색 나가 있다 — **`equipped` 보다 먼저 본다**: 나가 있는 사람에게 「장비를 벗어라」라고 하면 벗어도 안 되는 길로 보내게 된다 · 신설 2026-09-09) · **`equipped`**(장비를 하나라도 걸치고 있다 — 다 벗어야 가능) · **`last`**(마지막 한 명은 못 지운다 — 0명이 되면 원정을 못 돌려 골드가 안 들어와 복구가 막힌다).<br>**반환물은 없다** — 골드도 재료도 안 준다. `hire` 가 `tavern_hire_cost` 를 받으므로 반환이 있으면 GAME_DESIGN §10 이 경고한 **고용→해고 루프**가 열린다.<br>딸린 정리 하나 — **`party` 에서도 뺀다**(지운 영웅의 uid 가 남으면 편성·출발이 유령을 든다). `run` 은 영웅 uid 를 안 들고 `lastReport` 는 이름을 `h?.name` 으로 읽으므로 **런 중에도 안전하다** |
| `searchState(state, now)` | `→ {hours, slots, cost, echoPct, ready:[uid], out, hero, sent, startedAt, endsAt, remainMs, done, beats, result, rarePct, canHire, err, rumor, meetAt, meetOpen, answers, answer, discountPct}` | ⚠ **[신설 2026-09-09 — 수색 실동작]** 수색 화면 상태 한 덩어리 — **판정을 여기서 다 낸다**(`tavernState` 와 같은 규칙).<br>· `ready` = **안 나가 있을 때** 보낼 수 있는 영웅(= 원정 파티가 아닌 로스터 전원). 나가 있으면 `[]`<br>· `hero` = 지금 로스터에 있는 그 사람(표시용) · `sent` = `{uid, sin, cha}` **보낼 때 박은 스냅샷**. **둘을 섞지 않는다** — 수색 중 레벨업하면 `hero.stats.cha` 는 오르지만 결과를 정한 것은 `sent.cha` 다<br>· `beats` = `[{id, at, open, text:{ko,en}}]` — **막마다 하나**. `at` 은 `startedAt + 소요 × i / 막수`(첫 막은 `startedAt`), `open` 은 `now ≥ at`. 문구는 `search_story.csv` 에서 온다<br>· `result` = **`done` 일 때만** 후보 1명, 아니면 `null`. `rarePct` = 그 매력이 산 레어 확률 · `err` = `done` 인데 못 받는 사유(`roster` · `gold`)<br>· ⚠ **[만남 · 신설 2026-09-09 · ADR-0068]** `rumor` = `{id, sin, rumor:{ko,en}, prompt:{ko,en}}`. **안 나가 있으면 다음 회차의 만남**(= 소문 — 보내기 전에 알려준다) · 나가 있으면 이번 회차의 것<br>· `meetAt` = 만남이 열리는 시각(`startedAt + 소요 × meet_at_pct/100`) · `meetOpen` = `now ≥ meetAt`<br>· `answers` = **아직 안 답했을 때만** 채워진다 — `[{id, key, text:{ko,en}}]`. `key` 는 **보낸 영웅의 죄종이 연 답**인가(화면이 그 이유를 찍는다)<br>· `answer` = 고른 답(같은 모양) 또는 `null` · `discountPct` = 그 답이 깎는 % · **`cost` 는 그 할인이 반영된 값**이다 |
| `searchSend(state, uid, now)` | `→ {ok, endsAt}` / `{ok:false, err}` | 대기 영웅 하나를 내보낸다. err: `busy`(이미 나가 있거나 결과가 남아 있다 — **동시 1건의 실제 집행자**) · `missing` · `party`(원정 파티는 못 보낸다). `counters.search++` 하고 `search = {heroUid, startedAt, no, sin, cha}` 를 박는다 — **판정 입력을 보낼 때 함께 저장하는 것이 계약**이다 |
| `searchTake(state, now)` | `→ {ok, hero, cost}` / `{ok:false, err}` | 수령(고용) — 밑값은 명단과 같고(`tavern_hire_cost`) **만남에서 고른 답이 거기서 깎는다**. err: `none`(나간 수색이 없다) · `notDone` · `roster` · `gold`(**깎인 값** 기준). 받으면 `search = null` 이라 칸이 비고 다시 보낼 수 있다 |
| `searchAnswer(state, answerId, now)` | `→ {ok, discountPct, cost}` / `{ok:false, err}` | ⚠ **[신설 2026-09-09 · ADR-0068]** 만남에 답한다 — **되돌릴 수 없고 한 번뿐**이다. err: `none` · `answered`(이미 답했다) · `notOpen`(아직 `meetAt` 전) · `missing`(지금 열려 있지 않은 답).<br>**고용비만 깎는다** — 결과 영웅은 답과 무관하게 이미 시드가 정했으므로 **언제 답하든 같은 사람이 온다**. 두 층: 만난 죄종에 맞는 답(`hit_sin`)이면 `tavern_search_meet_hit_pct` · 그 위에 보낸 영웅이 연 답(`need_sin ≠ '-'`)이면 `tavern_search_meet_key_pct`.<br>**시간 제한이 없다** — `meetAt` 부터 **수령할 때까지** 언제든이고, 안 답하고 수령해도 정가일 뿐 벌이 없다(OSRS 가 랜덤 이벤트의 강제 페널티를 「Optional Randoms」로 걷어낸 것과 같은 규칙 · 방치형 계약 ③) |
| `searchDrop(state)` | `→ {ok}` / `{ok:false, err:'none'}` | 취소 · 버리기 — 나가 있으면 취소, 결과가 와 있으면 돌려보낸다. **이 문이 없으면 로스터가 찼을 때 칸이 영원히 막힌다**(결과는 수령할 때까지 남으므로). 다시 보내면 `counters.search` 가 올라 **다른 결과**가 나오고, 오가는 값이 없으므로 되풀이해도 얻는 것이 없다 — 치르는 것은 그 시간뿐이다 |
| `masteryState(state, uid)` | `→ {points, nodes:[{id, treeKind, ownerId, tier, stat, value, rank, maxRank, unlockLevel, unlocked, total, canLearn}]}` / `null` | **판정을 여기서 다 낸다** — 화면은 결과만 그린다. 없는 영웅이면 `null` |
| `learnMastery(state, uid, nodeId)` | `→ {ok, rank, points}` / `{ok:false, err}` | 1랭크 = 1포인트. err: `missing`(영웅 없음 **또는 그 영웅의 트리에 없는 노드**) · `locked` · `maxRank` · `points` |
| `unlearnMastery(state, uid, nodeId)` | `→ {ok, rank, points}` / `{ok:false, err}` | ⚠ **[신설 2026-09-08]** `learnMastery` 의 역방향 — 1랭크 = 1포인트 **환급**. 랭크가 0 이 되면 `mastery` 에서 키를 지운다(전액 롤백 뒤와 같은 모양). err: `missing`(영웅 없음 **또는 그 영웅의 트리에 없는 노드**) · `noRank`(찍은 랭크가 없다).<br>**해금 레벨을 보지 않는다** — 찍은 뒤 해금 조건이 사라질 길은 없고, 봐 봐야 「찍었는데 못 뺀다」만 만든다 |
| `resetMastery(state, uid)` | `→ {ok, refunded, points}` / `{ok:false, err:'missing'}` | 롤백은 **무료 · 수시** (skill_design §5). 찍은 랭크 합을 전액 환급 |
| `tacticState(state)` | `→ {totalLevel, open, count, lockedCount, rerollCost, canReroll, slots:[{no, open, unlockTotalLevel, locked, option, have, need, active}]}` | **판정을 여기서 다 낸다** — 해금(로스터 **합산 레벨**) · 조건 카운터(`have / need`) · **잠금** · **전체 리롤 비용**. 안 열린 칸은 `option: null`. 칸의 `option` 은 **등급까지 편 옵션**(`{id, grade, condKind, …, value}` — §2-9 `optionOf`)이라 화면과 `bonusOf` 가 등급별 값을 그대로 받는다 (2026-09-02). 세이브가 든 가족이 CSV 에서 사라졌으면 **그 칸만 첫 배정으로 되돌린다**.<br>⚠ **[개정 2026-09-01 · 구현 전]** 칸의 `cost` 는 사라졌다 — 비용은 칸이 아니라 **잠금 개수**가 정하므로 판 전체에 하나뿐이다(`rerollCost`). `canReroll` 은 「열렸고 안 잠긴 칸이 하나라도 있고 골드가 충분한가」 |
| `tacticBonus(state)` | `→ {flat, dr}` | 켜진 칸들의 효과 합. `heroCombat` 이 파티원에게만 넘긴다 |
| `rerollTactic(state, slotNo)` | `→ {ok, option, cost}` / `{ok:false, err}` | **지금 도는 것은 칸별 리롤**이다 — 칸 하나를 굴리고 비용은 `tactic_slot.csv:reroll_cost_gold`. 뽑은 것은 `{id, grade}` 로 세이브에 남고(§4) **후보에서 빼는 것은 열린 칸이 든 가족 id 전부**다 (2026-09-02 — 등급이 달라도 같은 가족이면 같은 옵션이라 두 칸에 못 선다). err: `missing` · `locked`(칸 미해금) · `gold`.<br>⚠ **[개정 2026-09-01 · 구현 전]** 인자에서 `slotNo` 가 빠졌다 — **열렸고 안 잠긴 칸을 한 번에 전부** 굴린다 (tactic_card_design §5-6). err: `allLocked`(굴릴 칸이 없다 — 전부 잠갔거나 열린 칸이 없다) · `gold`. `counters.tactic++` **1회** · rng = `deriveSeed(seed ^ 0x7AC7, counters.tactic)` **하나로 칸 번호 오름차순 연속 뽑기**(§5-2) · 후보에서 빼는 것 = **잠긴 칸의 옵션 + 굴리기 직전 열린 칸이 들고 있던 옵션 + 이번에 이미 뽑은 것** |
| `toggleTacticLock(state, slotNo)` | `→ {ok, locked}` / `{ok:false, err}` | ⚠ **[신설 2026-09-01 · 구현 전]** 칸 하나의 잠금을 뒤집는다. **무료**이고 rng·카운터를 안 탄다 — 값은 리롤할 때 `rerollCost` 로 치른다. err: `missing`(없는 칸) · `locked`(안 열린 칸은 못 잠근다) |

**report** — `{at, stageId, won, reason, durationSec, gold, xpEach, levelUps:[{uid, from, to, gains, points}], downed:[uid], drops:[itemUid], discarded, cards:{monsterId:n}, rounds, roundsCleared, strikes, contrib}`
`roundsCleared` 는 **깬 라운드 수**다 — 렌더러가 「이겼으면 전부, 아니면 하나 뺀다」로 짐작하던 값을 정산이 실어 보낸다(귀환 룰로 「라운드를 정리한 직후 철수」가 생겨 그 짐작이 틀릴 수 있다). 옛 리포트에는 없어서 **`undefined` 일 수 있다** — 렌더러가 그 경우를 다뤄야 한다.
`strikes` 는 `result.strikes` 의 복사본이고, 옛 리포트에는 없어서 **`null` 일 수 있다** — 렌더러가 그 경우를 다뤄야 한다.
`contrib` 도 `result.contrib` 의 복사본이고 **v20 이하에서 이관된 리포트에는 `null`** 이다 — 지나간 전투를 다시 돌릴 수 없으므로 이관이 채우지 않는다. 화면은 그 경우 **기여 상자를 안 그린다**(0 으로 지어내면 「못 때렸다」로 읽힌다 · SCREEN_DESIGN §4-3).
리포트는 **`state.reports` 의 맨 앞에 들어가고 [balance.csv:report_keep] 개까지 남는다** — 넘치면 오래된 런부터 밀려난다 (v21 · ADR-0063).

`codexBonus(state)` 의 누적 객체는 **`codex.statByNum` 의 값들에서 만든다**(하드코딩 키 없음) — 계열 배정이 바뀌어도 state.js 를 고칠 필요가 없다. 다만 `computeCombat` 이 읽는 것은 `atk_pct` · `hp_pct` · `dmg_pct` 뿐이라 `acc_pct` 는 계산되고 버려진다 (§2-4).

`partyUnits(state, uids?)` 는 `{uid, combat, stats, actives, rank}` 를 만든다 (**`stats`** = `hero.stats` — 스킬 계수가 시전 순간 읽는다 · 2026-09-10 R72) (**`rank`** = 진형의 자리 — `formationState(state).byUid` · 배치가 없으면 **전열 0**. 「앞부터 때린다」가 읽는 유일한 입력이다 · 2026-09-09) (`uids` 를 주면 그 인원만 — ~~아웃을 뺀 `activeParty`~~ 는 2026-09-08 삭제되어 `resolveBattle` 은 **`state.party` 전원**을 넘긴다) — `actives = skill.activesFor(hero, { weaponGroup: weaponGroupOf(state, hero) })`(**인스턴스 `[{id, source}]` · 고유 → 무기군 → 전직** — 2026-09-03). **무기군을 아는 곳은 `state.js` 뿐이다** — `skill.js` 는 장비를 모르므로 착용 무기의 `group` 을 여기서 넘긴다(`weaponGroupOf(state, hero)` → 맨손이면 `null`, 그러면 그 칸이 빈다). `partyMembers(state)`(전술 문맥용)는 **정의**를 넘긴다 — `activesFor(h).map(a => skill.resolve(a))` — `tactic.contextOf` 의 계약이 「actives = 스킬 정의」이기 때문이다. ⚠ 2026-09-01 까지 id 를 넘겨 `skill_tag` 조건 4종이 영원히 0 을 셌다(회귀 단정 있음). **쿨·창·배리어는 세이브에 없다**(HP 와 같은 취급 — 전투 안에서만 산다).

### 2-8. `skill.js` — 액티브 정의 · 배정 · 발동 선택

`createSkillSystem(data)` — 주입 `data`: `balance`(`active_slots` — 칸 수 상한 · **`skill_decay_cap_pct`** — 슬롯이 민 감쇠의 상한 [2026-09-10]. 계수는 전부 CSV 행에 있다), `rows`(= `skill.csv` 파싱 행), `tagRows`(= `skill_tag.csv` 파싱 행 — **태그 어휘의 SSOT** · 2026-09-01), `attributes`(= `hero_attribute.csv` 로드 결과 `[{id}]` — **스케일링 슬롯 `attr` 의 어휘** · 비어 있는데 채운 슬롯이 있으면 던진다 · 2026-09-10 R72). **실행은 하지 않는다**(§2-12 skill_runtime.js) — 유닛의 HP·버프를 만지지 않는다.
**어휘는 §2-11 `skill_effects.js` 의 표에서 온다** (2026-09-01) — `kind`·`target`·`effect_stat`·`cast_condition` 의 허용값은 그 표의 키이고, 이 파일은 배열을 따로 두지 않는다. 어휘와 실행이 같은 표를 읽으므로 둘이 어긋날 자리가 없다.

| export | 시그니처 | 계약 |
|---|---|---|
| `defs` | `{skillId: def}` | 정규화된 정의 |
| `list` | `[def]` | CSV 순서 |
| `activesFor(hero, ctx)` | `→ [{id, source}]` | **[개정 2026-09-09 · 1스킬 = 1직업]** **칸을 정하는 것은 출처다** (skill_design §2) — 배운 것 중 셋을 고르는 게 아니라 출처가 셋이고 각각 하나씩 준다. 순서는 **고유 → 무기 → 전직**이고 그것이 칸 번호다. **두 출처(고유 · 무기)가 같은 직업 풀에서 온다** (§12-1 규칙 3).<br>· **고유** `source:'innate'` — `hero.innate`, 정의에 있을 때만. 영웅이 태어날 때 **제 직업 풀**에서 굴린 것이다<br>· **무기** `source:'weapon_group'` — `ctx.weaponSkill` 이 가리키는 정의. **무기 개체가 담은 스킬**이고(`item.skill`), ~~`ctx.weaponGroup` 으로 무기군 전용 행을 찾던 것~~ 은 무기군 고정 폐기로 사라졌다. **`ctx.weaponSkill` 을 안 넘기면 이 칸은 빈다**(맨손과 구분되지 않는다 — 넘기는 쪽의 책임이다). ⚠ **`source` 문자열은 `weapon_group` 그대로다** — 무기군이라는 어휘는 죽었지만 키는 산다(R39 와 같은 취급 · 화면 라벨 `sk.src.weapon_group` 은 이미 「무기」다)<br>· **전직** `source:'advance'` — ⚠ **전직 시스템이 없어**(R16) 찍은 것이 없으므로 **영웅은 언제나 빈 칸**이다(R52). **`ctx.thirdSkill` 을 넘기면 그 id 가 이 칸에 앉는다** [신설 2026-09-11 · R79] — **몬스터 보스의 셋째 칸**이 쓰는 자리다(그 몬스터 직업 풀에서 스폰 때 굴린 것 · skill_design §2 · monster_design §5-1). 영웅 경로는 안 넘기므로 **동작이 안 바뀐다**. ⚠ 그 칸이 전직 칸인지 고유 둘째인지는 기획 미정(GAME_DESIGN §10)이라 `source` 는 잠정적으로 `'advance'` 그대로다<br>· **빈 출처는 자리를 남기지 않는다** — 반환은 든 것만이고 어느 출처인지는 `source` 가 말한다. 3칸 자리로 펴는 것은 화면의 몫이다(`ui/app.js:ACTIVE_SOURCES`)<br>· **같은 id 가 두 출처에서 와도 칸은 둘이다** [개정 2026-09-09 사용자 지시 · R66 · ~~앞선 출처만 남긴다~~ 폐기] — 두 출처가 한 풀에서 가져가므로 **실제로 일어난다**(전사 풀 5행이면 5분의 1). 걷어내면 화면의 「무기」 칸이 비어 **맨손과 구분되지 않아** 무기가 무엇을 담았는지 읽을 수 없었다. ⚠ **딸린 규칙 — 칸이 둘이면 쿨도 둘이다**: `simulate` 가 칸마다 `readyAt` 을 따로 들므로(§2-6) 겹친 스킬은 **두 배로 나간다** · `hero.skillOrder`(§2-4)가 있으면 그 순서를 앞에 → `active_slots` 개로 자른다 |
| `resolve(active)` | `→ def \| null` | 인스턴스 → 정의. 지금은 `defs[active.id]`. ⚠ 변형 노드가 오면 `active.override` 를 여기서 덧씌운다 — 소비자(battle · tactic · 화면)는 `defs[id]` 를 직접 찾지 않고 이것만 부른다 (§8 항목 16) |
| `castable(def, ctx)` | `→ bool` | `ctx = {self, allies}`(allies = 생존 아군, self 포함). 아래 발동 조건 |
| `pickReady(actives, t, isCastable)` | `→ active \| null` | **순수** — `actives` 를 바꾸지 않고 정렬도 새 배열에서 한다. `readyAt ≤ t + EPS` **이고** 조건이 참인 것 중 `readyAt` 최소 → 동률이면 **배열 순(칸 순서)**. `skill.csv:priority` 는 동률 결정자가 **아니다**(2026-09-01 — 직업 행이 칸에 앉는 기본 순서에만 쓴다 · battle_design §5 「우선순위는 플레이어가 정한다」 · 고유 칸이 1번에 오면서 CSV 값이 출처를 섞어 화면의 「슬롯 순 = 우선순위」와 어긋나던 것을 바로잡았다) |
| `tagsOf(def)` | `→ [tag]` | 그 스킬이 실제로 갖는 태그 전부 — **파생 먼저, 그다음 정의한 것**. 세는 쪽(전술카드·화면)의 유일한 입구 |
| `scaleDef(def, stats)` | `→ eff \| null` | **스킬 계수 공용 계산 — 전투와 미리보기가 같은 함수를 쓴다** [2026-09-10 · R72 · skill_design §13]. 반환 = `def` 의 얕은 복사본 + 실효 `hits`·`value`·`dur`·`decay`·`procChance`·`procMult` + **`flat`**(능력치 항). field 마다 `Σ = Σ stats[attr] × coef`(그 field 의 슬롯 전부):<br>· `mult_pct` → **배율에 안 더한다** — `flat = Σ` 로 따로 낸다(공격 `v = atk × 배율 + flat` · 회복 `matk × mult/100 + flat` · 소환 `hpMax × mult/100 + flat` — battle_design §9-2 「곱이 아니라 합」)<br>· `hits` → `floor(raw + Σ)`, `attack` 은 1 이상<br>· `effect_value`·`duration_sec`·`proc_chance_pct`·`proc_mult_pct` → **크기에 더하고 부호 유지** `sign(raw) × (\|raw\| + Σ)`(raw 0 은 +) — 음수 디버프(페니턴스·바인드)가 약해지지 않는다<br>· `decay_pct` → `Σ > 0` 일 때만 `max(raw, min(raw + Σ, [balance.csv:skill_decay_cap_pct]))` — **슬롯이 민 몫만** 상한에 걸린다(CSV 원값의 0~100 미만 검증은 그대로)<br>· `stats` 가 `null`(몬스터·소환·모름)이거나 그 능력치가 없으면 0 → 원값 그대로 · `flat` 0. `mult`·`cool` 은 원값 그대로 · **rng 0 · 입력을 안 바꾼다** |
| `previewOf(def, ctx)` | `→ {baseSec, everySec, lossPct, amount, parts} \| null` | 설명창 재료 — 아래 「미리보기」 표 [2026-09-08 · **`parts` 신설 2026-09-10 R72**]. `def` 가 없으면 `null` |
| `TAGS` · `DERIVED_TAGS` · `MAX_TAGS` | `[10]` · `[3]` · `2` | 태그 어휘 13종과 정의 상한 (skill_design §11). **어휘는 `skill_tag.csv` 에서 온다**(`derived` 0 → `TAGS` · 1 → `DERIVED_TAGS` · 2026-09-01). 로드 시 검증 — `tag_id` 유일 · `category ∈ {damage, buff, debuff, other}` · `derived ∈ {0,1}` · 파생 3종이 정확히 `aoe/single/multihit`(`derivedTagsOf` 가 그 셋을 낸다) · 표가 비면 throw |
| `EPS` | `1e-9` | 준비·만료 판정 허용 오차 (§5-3) |

**`def`** — `{id, ownerKind, ownerId, kind, target, hits, mult, decay, procChance, procMult, cool, dur, element, stat, value, cond, condValue, status, tags:[], derived:[], scales:[{field, attr, coef}], priority, name:{ko,en}, icon, desc:{ko,en}, note, innatePool}`
`procChance`/`procMult` = `proc_chance_pct`/`proc_mult_pct` 원값 · `scales` = **채운 스케일링 슬롯만**(`-` 슬롯은 빠진다 · CSV 슬롯 순서) — `field` 는 CSV 컬럼명 그대로다 [2026-09-10 · R72].
`icon`·`desc` 는 플레이어 표시(2026-09-01 — 종전 `ui/mock.js:SKILL_DISPLAY`), `note` 는 설계 노트(옛 `description_kr`), `innatePool` 은 고유 풀 소속(§2-4 `skillPool`).
`mult`/`decay`/`value` 는 CSV 의 **% 숫자 그대로**(코드에서 `/100`), CSV 의 `-` 는 `null`.

**어휘 사전 — 정의는 CSV · 종류는 코드.** 이 밖의 값은 로드 시 `throw`(미니 DSL 인터프리터를 두지 않는다):

| 컬럼 | 값 |
|---|---|
| `owner_kind` | `job` · `advance` · `unique` — **스킬은 직업 · 전직 · 유니크 셋으로 나뉜다** [사용자 확정 2026-09-09]. ~~`weapon_group`~~ 은 무기군 고정 폐기(skill_design §12-1 규칙 2)로 어휘에서 빠졌다. 지금 발행된 행은 전부 `job` 이고 `advance`·`unique` 는 미발행 |
| `owner_id` | 그 출처 안의 id — `owner_kind=job` 이면 직업 id |
| `kind` | `attack` · `heal` · `buff` |
| `target` | `enemy_single` · `enemy_all` · `enemy_rotate` · `enemy_chain` · `self` · `party` |
| `effect_stat` (buff 전용) | `atk_pct` · `barrier_pct` · `period_pct` · `taunt` |
| `cast_condition` | `-` · `buff_absent` · `ally_hp_below` |
| `element` | `-` + `hero.js:ELEMENTS` 4종 |
| `tags` | `-` 또는 `\|` 로 이은 **최대 2개** — `dot` · `shout` · `blessing` · `boost` · `restore` · `curse` · `control` · `transform` · `summon` · `sacrifice` |
| `proc_chance_pct` · `proc_mult_pct` | 확률로 터지는 추가 피해 — 확률 % · 배수 %. 기본 `0` · `decay_pct` 바로 뒤 컬럼 [2026-09-10 · R72] |
| `scaleN_field` · `scaleN_attr` · `scaleN_coef` (N = 1·2·3) | 스케일링 슬롯 — `field` ∈ `mult_pct` · `hits` · `effect_value` · `duration_sec` · `decay_pct` · `proc_chance_pct` · `proc_mult_pct` · `attr` ∈ `hero_attribute.csv` id · `coef` = 능력치 1당 더해지는 값(숫자 ≥ 0). 빈 슬롯은 `-` · `-` · `0` [skill_design §13-1 · 2026-09-10] |

**태그는 13종이고 컬럼에 적는 것은 10종뿐이다** (skill_design §11 확정 2026-08-28). 나머지 셋은 `target`·`hits` 에서 **파생**한다 — `aoe`(`enemy_all`·`enemy_chain`) · `single`(`enemy_single`) · `multihit`(`hits > 1`). `enemy_rotate`(순환)는 타수만큼만 닿으므로 **광역도 단일도 아니다**(§11-2 규칙 3). 파생 가능한 것을 컬럼에 또 적으면 두 곳 관리가 되어 반드시 어긋나므로, `tags` 에 파생 태그를 적으면 **로드가 실패한다**.

로드 시 그 밖에 던지는 것 — `attack` 인데 `hits < 1` · `buff` 인데 `duration_sec ≤ 0` 또는 `effect_stat` 없음 · `heal` 인데 `mult_pct ≤ 0` · `cool_sec ≤ 0` · `skill_id` 중복 · `owner_kind` 어휘 밖 · `owner_id` 빈 값 · **같은 출처(`owner_kind#owner_id`) 안 `priority` 중복** · `tags` 가 3개 이상 · 어휘 밖 태그 · 파생 태그를 적음 · 태그 중복.
**[강화 2026-09-01] 종류↔대상 정합** — `attack` 은 `enemy_*` 만 · `heal`/`buff` 는 `self`/`party` 만 · `enemy_all`/`enemy_chain` 은 `hits = 1`(타수는 대상 수가 정한다) · `decay` 는 `enemy_chain` 만 0 이상 100 미만, 그 외 0 · `heal`/`buff` 는 `hits = 0` · `buff` 는 `mult = 0` · `attack` 은 `mult > 0`·`dur = 0` · `ally_hp_below` 는 `0 < cond_value ≤ 100`, 그 외 조건은 `cond_value = 0`. 컬럼 하나가 대상마다 뜻이 달라 값이 **조용히 무시되던** 자리를 로드 시 막는다.
**[강화 2026-09-10 · R72] 슬롯 · 추가 피해 · 감쇠 · 결투** — ① 슬롯: `field` 어휘 밖 · `attr` 이 `hero_attribute` id 밖 · `coef` 가 숫자가 아니거나 음수 · `field='-'` 와 `attr='-'` 가 짝이 안 맞음 · 빈 슬롯인데 `coef ≠ 0` · **한 행에 같은 field 두 번** · 종류 부적합(`hits`=attack · `mult_pct`=attack/heal/summon · `effect_value`=buff/aura · `duration_sec`=buff · `decay_pct`=감쇠를 쓰는 대상 · `proc_*`=확률 > 0 인 attack). **채운 슬롯의 `coef = 0` 은 합법**이다(축만 정하고 크기는 밸런스 몫 — skill_design §13-3) ② 추가 피해: `proc_chance_pct` 는 0~100 · 0 보다 크면 `kind=attack` 이고 `proc_mult_pct ≥ 100` · 0 이면 `proc_mult_pct = 0`(두 곳 관리 금지) ③ 감쇠: `decay_pct` 를 쓰는 대상은 `enemy_chain` · `enemy_highest_def` · **`attack` 의 `enemy_all`**(광역 약화 — 2026-09-10 추가)이고 그 밖은 0 ④ `duel` 의 `effect_value ≥ 0`(시전자가 받는 피해 감소 %).

**발동 조건** — 거짓이면 「준비된 것으로 치지 않는다」. 쿨은 그대로 두고 그 차례엔 다른 스킬이나 기본 공격이 나간다.

| `cast_condition` | 참인 때 |
|---|---|
| `-` | 항상 |
| `buff_absent` | 시전자에게 **이 스킬의 창이 없다** |
| `ally_hp_below` | 생존 아군 중 `hp/hpMax × 100 < cond_value` 인 자가 있다 |

**미리보기 `previewOf(def, ctx)`** [신설 2026-09-08 · **`parts` 2026-09-10 R72**] — 설명창이 문장을 만들 재료다. 렌더러는 계산하지 않는다(DEV_PLAN 부채 #3). **감소·치명·추가 피해는 안 태운다** — 대상이 정해져야 나오거나 굴림이다. **2단계(설명창)가 이 모양을 그대로 쓴다.**
`ctx = {atk, matk, hpMax, period, stats}` — 전부 선택. 모르는 값의 조각은 `null` 로 낸다.

| 필드 | 계약 |
|---|---|
| `baseSec` | 표기 쿨 `def.cool` |
| `everySec` · `lossPct` | 실효 쿨 `formula.effectiveCd(cool, period)` · 표기 대비 밀린 % — `period` 를 모르면 `null` |
| `amount` | 한 타 피해(attack · 밑수 `ctx.atk`) · 회복량(heal · `ctx.matk`) · 벽 HP(summon · `ctx.hpMax`) = `round(밑수 × mult/100 + flat)` — **고정 항 포함**. 밑수가 유한한 수 ≥ 0 이 아니거나 · **`mult_pct` 슬롯이 있는데 `stats` 가 없으면** `null`. buff·aura 는 언제나 `null`. 다단은 **한 타** 값 |
| `parts.amount` | `mult > 0` 인 attack·heal·summon 에만 — `{value, basis: 'atk'\|'matk'\|'hpMax', pct: def.mult, terms: [{attr, coef}]}` · `value` 는 `amount` 와 같다 · `terms` = `mult_pct` 슬롯(coef 0 도 넣는다 · 슬롯이 없으면 `[]`) |
| `parts.hits` · `parts.value` · `parts.dur` · `parts.decay` · `parts.procChance` · `parts.procMult` | **그 field 에 슬롯이 1개 이상일 때만** 키가 있다(`hits` ← `hits` · `value` ← `effect_value` · `dur` ← `duration_sec` · `decay` ← `decay_pct` · `procChance` ← `proc_chance_pct` · `procMult` ← `proc_mult_pct`) — `{value, raw, terms: [{attr, coef}]}` · `value` = `scaleDef` 의 실효값(`stats` 가 없으면 `null` · **`procChance` 의 `value` 는 100 에서 자른다** — `strike` 가 그 상한으로 굴리므로 120% 는 틀린 숫자다. `raw` 는 원값 · `scaleDef` 는 안 자른다 [2026-09-10]) · `raw` = CSV 원값 · `terms` 는 coef 0 인 항도 넣는다 |

---

### 2-9. `tactic.js` — 파티 전술 정의 · 조건 판정 · 리롤 후보

`createTacticSystem(data)` — 주입 `data`: `slots`(= `tactic_slot.csv` 파싱 행) · `options`(= `tactic_option.csv`) · `sins` · `classes` · `skillSystem` · `gradeWeights`(= `balance.csv:tactic_grade_weight_*` 셋). **무상태** — 어느 칸에 무엇이 들었는지는 세이브가 들고(§4) 이 모듈은 규칙만 낸다. ~~`weaponGroups`~~ 는 2026-09-02 폐지(`damage_kind` 조건 삭제와 함께).

**칸은 획득물이 아니다** (tactic_card_design §5) — 로스터 **합산 레벨**이 칸을 열고, 칸에 든 옵션은 재화로 간다.

**옵션의 SSOT 는 `(option_id, grade)` 복합키다** (tactic_card_design §5-5 확정 2026-09-01 · 코드 반영 2026-09-02). `option_id` 가 **가족**(조건 · `stat` 을 고정)이고 `grade` 가 **값만** 가른다. 그래서 이 모듈은 두 축을 구분해 부른다:

- **가족** — 「어떤 조건에 어떤 축이 붙나」. 중복 방지 · 첫 배정 · 리롤 후보의 단위는 **전부 가족**이다. 「일반 공격력」과 「레어 공격력」은 같은 옵션이라 두 칸에 못 들어간다 (§5-5 — 등급으로 갈라 세면 같은 stat 이 두 칸에서 곱해진다)
- **등급** — `common` · `magic` · `rare` **이 순서가 코드 상수**(§5-3). 값이 이 순서로 커지는지 로드 시 검증한다
- **칸 하나가 드는 것은 `{id, grade}` 한 쌍**이다 — 세이브도 이 모양으로 든다 (§4)

| export | 시그니처 | 결과 |
|---|---|---|
| `slotList` · `slotCount` | `[{no, unlockTotalLevel, rerollCost}]` | 칸 수 = CSV 행 수. 로드 시 검증 — `slot_no` 는 1부터 빈틈없이 · 문턱은 오름차순 · **옵션 수 > 칸 수**(아니면 리롤할 여지가 없다) |
| `families` · `familyIds` | `[{id, condKind, condArg, condN, stat, grades:{common,magic,rare}}]` | **가족 목록** — 행이 아니라 가족을 센다(66행 → 22가족). 로드 시 검증 — `cond_kind` 어휘 · 인자 타입(죄종 / 스킬 태그) · `stat` · `value != 0` · **가족마다 3등급이 빠짐없이 하나씩** · **가족 안에서 조건·`stat` 이 같다**(등급은 값만 가른다) · **값이 등급 순으로 커진다**. 어긋나면 **throw**.<br>⚠ **가족 수 > 칸 수**여야 한다 — 행 수가 아니다. 66행 22가족 7칸에서 행으로 세면 통과하고, 가족으로 세야 「리롤할 여지」가 실제로 성립한다 |
| `optionOf(ref)` | `{id, grade}` → `{id, grade, condKind, condArg, condN, stat, value} \| null` | 칸이 든 한 쌍을 옵션 하나로 편다. `measure`·`bonusOf` 가 받는 모양이고, **없는 가족·없는 등급이면 `null`**(CSV 가 바뀐 세이브) |
| `GRADES` | `['common','magic','rare']` | 등급 어휘 — 이 밖의 값은 로드 시 throw. **순서가 계약**이다 (§5-3) |
| `openCount(totalLevel)` | `→ n` | 문턱을 넘은 칸 수 |
| `contextOf(members)` | `→ ctx` | `members = [{sin, cls, items, actives}]` (**`actives` = 스킬 정의** — id 가 아니다. ⚠ 2026-09-01 까지 `state.partyMembers` 가 id 를 넘겨 태그가 0 으로 세어졌다 — 호출 쪽을 고쳤다 · §2-7). 조건이 세는 숫자를 한 번에 뽑는다 — 죄종·직업 분포 · 죄종 접사 수 · **스킬 태그별 사람 수**(스킬 수가 아니다). ~~양손 수~~ 는 2026-09-01 폐지 · ~~무기 피해 종류~~ 는 2026-09-02 폐지 |
| `measure(option, ctx)` | `→ {have, need, active}` | 조건 카운터. 화면이 「지금 / 필요」를 찍는다 |
| `bonusOf(options)` | `→ {flat, dr}` | 접사·마스터리와 **같은 채널**. `damage_reduction` 만 원천별 곱이라 따로 (battle_design §9-3) |
| `initialAssign(rng)` | `→ [{id, grade:'common'} × slotCount]` | **가족 풀**을 통째로 섞어 앞에서부터 나눠 준다 — 리롤 카운터를 안 타므로 **리롤이 다른 칸을 흔들지 않는다**. 가족 기준이라 중복 없음. **등급은 언제나 `common`** — 시드 운이 초반 격차를 만들지 않는다 (tactic_card_design §5-5 확정) |
| `pick(rng, excludeIds)` | `→ {id, grade} \| null` | 리롤 후보. 부르는 쪽이 지금 든 것 + 다른 칸에 든 것의 **가족 id** 를 넘긴다. **가족과 등급을 같이 굴린다**(§5-5) — rng 를 **가족 1회 · 등급 1회 순서로 2번** 소비한다 (§5-2) |

**조건 어휘 6종** (`cond_kind` — 이 밖의 값은 로드 시 throw): `always` · `sin_same` · `sin_kind` · `class_same` · `affix_sin`(인자: 죄종) · `skill_tag`(인자: 스킬 태그 10종 — §2-8 `TAGS`).
- ~~`two_hand`~~ 는 2026-09-01 폐지 — 전 무기가 양손이라 언제나 참이 되어 조건이 아니게 됐다(`tactic_option.csv` 의 `opt_two_hand` 행도 함께 삭제).
- ~~`party_size`~~ · ~~`damage_kind`~~ 는 2026-09-02 폐지 — tactic_card_design §5-4 가 「파티 인원수 · 무기 종류 조건 폐기」로 확정했고 09-01 임시 풀 교체 때 **CSV 에서 먼저 빠졌다**. 어휘만 코드에 남아 조건 2종이 영원히 못 뜨는 상태였다. `damage_kind` 가 나가면서 `contextOf` 의 무기 피해 종류 집계와 `weaponGroups` 주입도 함께 없어졌다.
전부 **편성에서 확정되는 값**이다 (tactic_card_design §2-1) — 전투 중에 변하는 축(현재 HP · 남은 적)은 어휘에 없다. **정의는 CSV · 종류는 코드** — 미니 DSL 을 두지 않는다 (§2-8 skill.js 와 같은 규약).

### 2-10. `naming.js` — 이름 조립 (2026-08-31 신설)

`createNaming(data)` — 주입 `data.sins` = `{sinId: {ko, en, adj}}`(⚠ 아직 `ui/mock.js:SINS`). **rng 를 쓰지 않는다** — 결정론 계약 밖이다.

**CSV 가 아니라 코드인 이유**: 언어별 어순·조사가 규칙이라 표로 적을 수 없다. 렌더러가 아니라 여기 있는 이유는 두 렌더러(장비 화면·관전)가 같은 규칙을 두 번 적으면 갈리기 때문이다.

| export | 시그니처 | 계약 |
|---|---|---|
| `composeName(prefixSin, base, suffixSin\|null)` | `→ {ko,en}` | **태그 형식 2026-09-11 개정** — ko `"[분노][오만] <base>"` / en `"[Wrath][Pride] <base>"`(ko/en 동형 · 대괄호는 `S[sin].ko`/`.en` 표시명 그대로, `adj` 형용사 아님). `suffixSin` 이 없으면 대괄호 하나뿐(매직 등급). `base` 는 문자열(양 언어 공통) 또는 `{ko,en}` — 무기군 정의도 `ko`/`en` 을 갖고 있어 그대로 들어온다. `item.js` 의 `composeName` 이 이것이다 |
| `eliteName(sin, base)` | `→ {ko,en}` | ko `"분노의 스켈레톤 기사"` / en `"Wrathful Skeleton Knight"`. `base` 는 몬스터 이름 `{ko,en}` — **id → 이름 조회는 `ui/data.js:eliteName` 이 맡는다**(`D.monsters` 는 브라우저가 fetch 한 것이라 game_logic 이 볼 수 없다) |

---

### 2-11. `skill_effects.js` — 「종류」 등록표 (2026-09-01 신설)

순수 모듈 · 상태 없음 · rng 없음. **종류 하나 = 여기 등록 한 번** — `skill.js` 가 어휘(허용값)를, `skill_runtime.js` 가 실행을 같은 표에서 읽으므로 두 곳이 어긋날 자리가 없다. 「정의는 CSV · 종류는 코드」(docs/reference/skill_architecture_survey §8)의 「코드」가 이 파일이다.

| export | 모양 | 계약 |
|---|---|---|
| `KINDS` | `['attack','heal','buff','aura','summon']` | `skill.csv:kind` 허용값. **`aura`** 는 쿨 없이 상시(§2-6 — 액티브 칸에서 빠져 전투 시작에 `until: Infinity` 창으로 걸린다) · **`summon`** 은 HP 를 가진 유닛을 세운다 [둘 다 2026-09-09] |
| `ATTACK_TARGETS` | `{ enemy_single, enemy_all, enemy_rotate, enemy_chain, enemy_highest_def }` — 각 `(rt, u, def, foes) → void` | 공격 대상 5종의 **실행 자체**(§2-6 타겟팅 행 그대로 — rng 순서·hp 가드 불변). `rt` = §2-12 런타임. **`enemy_highest_def`** [2026-09-09] = 방어값 최대 대상(동률이면 배열 순 앞 — **rng 0회**)을 `hits` 회 때리고 타격마다 그 대상의 `def`·`defBase` 를 `decay` 만큼 곱으로 깎는다. **`enemy_all`** 은 `decay > 0` 이면 주 대상(전열 생존자 중 배열 첫 번째 · 전열이 비면 생존자 첫 번째 · **rng 0회**)만 온전하고 나머지 배율이 `decay` 만큼 준다 — `decay = 0` 이면 종전과 같다 [2026-09-10 · R72]. 핸들러는 전부 스킬 타격에 `{flat, procChance, procMult}` 를 `rt.strikeOnce` 의 6번째 인자로 넘긴다 |
| `SUPPORT_TARGETS` | `['self','party','ally_single','party_adjacent']` | heal·buff·aura 의 아군 대상. **전부 결정론** — `ally_single` = HP **비율** 최저 · `party_adjacent` = `party` 배열의 양 옆(자기 제외) [2026-09-09] |
| `DEBUFF_TARGETS` | `['enemy_single','enemy_all']` | **`buff` 만** 적에게 걸 수 있다 — 새 채널이 아니라 같은 창을 **음수 `effect_value`** 로 쓰는 것이다 [사용자 확정 2026-09-09]. `enemy_single` 지목은 생존 적 중 **HP 최대**(rng 0회) |
| `TARGETS` | 공격 대상 ∪ 아군 대상 | `skill.csv:target` 허용값 (디버프 대상은 공격 대상 표에 이미 있다) |
| `EFFECTS` | `{ atk_pct:{derive}, period_pct:{derive}, barrier_pct:{apply}, guard_pct:{derive}, def_pct:{derive}, res_elem:{derive}, hp_max_pct:{derive,apply}, regen_pct:{derive}, dr_pct:{derive}, onhit_element:{}, attack_splash:{}, duel:{}, taunt:{} }` | `derive(u, sum)` = 그 stat 의 창 합으로 파생값을 **다시 쓴다**(sum 0 = 원값 복원) · `apply(rt, tgt, def, until, ev)` = 시전 순간 1회 · 둘 다 없는 항목은 **표식**이다: `taunt`·`duel` 의 소비자는 `battle.pickTarget`(`duel` 은 `skill_runtime.castBuff` 가 시전자의 `dr_pct` 창도 함께 연다 · 2026-09-10 R72), `onhit_element`·`attack_splash` 의 소비자는 `skill_runtime.basicAttack`. `hp_max_pct` 는 열 때 늘어난 만큼 현재 HP 도 올리고(apply) 닫을 때 넘친 HP 를 깎는다(derive). **`def_pct` · `res_elem` 은 무기 옵션 창 전용**(스킬 행이 안 쓴다) — `guard_pct` 와 같은 축(방어값 · 저항)을 밀어서 guard 의 창 합까지 함께 다시 쓴다 · `res_elem` 은 창의 `element` 칸만 민다 [2026-09-11 · R78] |
| `EFFECT_STATS` | `Object.keys(EFFECTS)` | `skill.csv:effect_stat` 허용값 |
| `CONDITIONS` | `{ buff_absent, ally_hp_below }` — 각 `(def, ctx) → bool` | 발동 조건(§2-8 표). `ctx = {self, allies}` |
| `CONDITION_IDS` | `Object.keys(CONDITIONS)` | `skill.csv:cast_condition` 허용값 |
| `refreshDerived(u)` | `→ void` | `EFFECTS` 의 **키 순서**대로 `derive` 를 부른다(지금 `atk_pct` → `period_pct` → `guard_pct` → `def_pct` → `res_elem` → `hp_max_pct` → `regen_pct` → `dr_pct`). 순서가 계약이다 |
| `weaponOnHit(u, fx, d, type, t, sec)` | `→ bool` | **무기 옵션의 타격 시 창 셋** [신설 2026-09-11 · R78] — `battle.strikeOnce` 가 부른다. 방어력 감소(`wx:def_down` · `def_pct`) · 공격력 감소(`wx:atk_down` · `atk_pct` · **대상 공격 타입이 맞을 때만** — 물리 감소 = `physical` · 마법 감소 = 원소)는 **대상 창 하나에 센 값**(`min(v)`)만 남기고 `until` 을 갱신한다. 원소 저항 감소는 `wx:res_down:<공격자>:<원소>` 로 **공격자 · 원소마다 따로** 서서 중첩된다(같은 영웅은 갱신) · 그 타격 타입이 `physical` 이면 안 건다. 창은 전부 `quiet: true` · 섰으면 `refreshDerived(d)`. `sec = {def, res, atk}` = `[balance.csv:weapon_def_down_sec]` · `weapon_res_down_sec` · `weapon_atk_down_sec`. **rng 0** |

새 종류를 추가하는 절차 — 이 표에 항목 하나(+ 필요하면 §2-6 실행 규칙 행) → `skill.csv` 에서 그 값을 쓴다. `skill.js` · `battle.js` 는 건드리지 않는다.

### 2-12. `skill_runtime.js` — 시전 · 창 · 배리어 · 사건 훅 (2026-09-01 신설)

`battle.simulate` 가 **전투마다** 만든다 — 상태(`t` · 유닛)는 전부 인자·ctx 로 받고 모듈 전역은 없다.

`createSkillRuntime(ctx)` — `ctx = { SK, B, rng, timeline, out, units:{party, enemies}, strikeOnce, pickTarget, makeSummon, r1, EPS, hooks, cdFloor }`. `makeSummon(caster, def) → 유닛` 은 **battle.js 가 넘긴다** [2026-09-09] — 유닛 생성자와 키 발급(`s0`…)은 그쪽 어휘라 런타임이 만들지 않는다. `units.enemies` 는 라운드마다 simulate 가 갈아 끼우는 **속성**이라 런타임은 항상 `ctx.units.enemies` 를 읽는다. `strikeOnce(u, target, mult, element, s, sk?)`·`pickTarget` 은 battle.js 의 것을 그대로 받는다(`sk = {flat, procChance, procMult}` 는 **스킬 타격만** 넘긴다 · 2026-09-10 R72) — 직격·도발·전투불능 판정은 전투 진행의 몫이고 런타임은 **무엇을 시전하나**만 안다.

| export | 계약 |
|---|---|
| `act(u, t)` | §2-6 「발동」·「쿨」 행 — 준비된 것 없으면 `basicAttack`. 시전이면 `readyAt` · `out.casts` · `skill` 이벤트 · `hooks.emit('cast', …)` → **`eff = SK.scaleDef(def, u.stats)`**(시전 순간 한 번 · 2026-09-10 R72) → `ATTACK_TARGETS[def.target]` / `castHeal` / `castSummon` / `castBuff` 가 전부 **`eff` 를 받는다**(아군 창도 적에게 거는 창도 여기) |
| `basicAttack(u, t, foes)` | 기본 공격 [신설 2026-09-09]. **평타 부여 창을 여기서 읽는다** — `attack_splash` 가 켜져 있으면 단일 → **적 전원**이고 배율이 창의 값 %(없으면 1배 단일) · `onhit_element` 가 켜져 있으면 때린 대상마다 **원소 추가타 1회**. ⚠ 창이 하나도 없으면 **종전과 완전히 같다**(`strikeOnce(u, pickTarget(u, foes), 1, null)` 1회) |
| `targetsOf(u, def)` | heal·buff·aura 가 공유하는 대상 풀 — §2-11 `SUPPORT_TARGETS`·`DEBUFF_TARGETS` 규칙 그대로. **rng 0회** |
| `castSummon(u, def, t)` | `ctx.makeSummon` 이 만든 유닛을 **아군 배열에 push** 하고 `summon` 이벤트를 남긴다. 벽 HP = `max(1, round(시전자 hpMax × def.mult/100 + def.flat))`(`flat` = 능력치 항 · 2026-09-10) |
| `expire(u, t)` | 창·배리어 만료(`until ≤ t + EPS`) → `buffEnd`(**`quiet` 창은 안 낸다** — 무기 옵션 창 · R78) → 바뀌었으면 `refreshDerived` |
| `castHeal(u, def, t)` · `castBuff(u, def, t)` | §2-6 회복·버프 창 행. 배리어는 `EFFECTS.barrier_pct.apply`. `def` 는 **`scaleDef` 를 지난 실효 정의**다(`flat`·실효 `value`·`dur`) — 원시 정의를 넘겨도 `flat` 은 0 으로 읽는다. `castBuff` 는 `duel` 이면 시전자에게 같은 `until` 의 `dr_pct` 창도 연다(§2-6 `duel` 행 · 2026-09-10 R72) |
| `alive(list)` · `alliesOf(u)` · `foesOf(u)` | 진영 조회 |
| `createHooks()` | `{ emit(name, unit, payload) }` — `unit.reactions` 의 `{on, fn}` 을 **배열 순**으로 부른다. 핸들러 시그니처는 **`fn(unit, payload)`**(`payload` 에 `t` 와 사건별 필드 — §2-6 「사건 훅」 행). 발화 지점·순서는 §5-2 |
| (런타임 객체 `rt`) | `act`·`expire`·`castHeal`·`castBuff`·`castSummon`·`basicAttack`·`targetsOf`·`buffSum`·`alive`·`alliesOf`·`foesOf` 에 더해 **`rng`·`strikeOnce`·`pickTarget`** 도 같은 객체에 싣는다 — 등록표(§2-11)의 대상 핸들러가 `rt.*` 만 보고 battle.js 를 import 하지 않게 하는 이음매 |

⚠ `reactions` 를 등록하는 소비자는 아직 없다 — 마스터리 T3(반응 패시브 · skill_design §1-2·§3-3)의 자리다. 등록이 0 이면 rng·타임라인이 훅 도입 전과 같다(골든 `tl` 이 잠근다).

---

## 3. 결과 코드 사전

| 코드 | 뜻 | 내는 곳 |
|---|---|---|
| `missing` | 대상 없음 / 가방에 없음 | equip · unequip · salvage · toggleParty · hire · **upgradeItem** · **dismiss** · **searchSend** |
| `class` | 직업 전속 무기군 아님 | equip |
| `bagFull` | **인벤토리** 초과 | equip · unequip · **moveToBag** |
| **`stashFull`** | **창고 초과** | **moveToStash** (2026-09-11) |
| `full` | 파티 정원 | toggleParty |
| `locked` · `noParty` | 스테이지 잠김 / 파티 없음 · **마스터리 해금 레벨 미달** · **전술 칸 미해금** | canDepart · learnMastery · rerollTactic |
| `gold` · `roster` | 골드 부족 / 로스터 정원 | tavernReroll · hire · **rerollTactic**(`gold`) · **upgradeItem**(`gold`) · **searchTake** |
| **`equipped`** · **`last`** | 장비를 걸치고 있다 / 마지막 한 명이다 | **dismiss** (2026-09-09) |
| `allLocked` | **굴릴 칸이 없다** — 열린 칸을 전부 잠갔거나 열린 칸이 하나도 없다 ⚠ [신설 2026-09-01 · 구현 전] | rerollTactic |
| `maxRank` · `points` | 랭크 상한 / 마스터리 포인트 부족 | learnMastery |
| `noRank` | **뺄 랭크가 없다** — 랭크 0 인 노드를 되돌리려 했다 ⚠ [신설 2026-09-08] | unlearnMastery |
| `maxUp` | 강화 상한(`equip_upgrade_max`) 도달 | upgradeItem |
| **`searching`** | **수색 나가 있다** — 마을에 없으므로 편성도 해고도 안 된다 [신설 2026-09-09] | **toggleParty** · **dismiss** |
| **`busy`** · **`party`** | 이미 나간 수색이 있다 / 원정 파티는 못 보낸다 [신설 2026-09-09] | **searchSend** |
| **`none`** · **`notDone`** | 나간 수색이 없다 / 아직 안 돌아왔다 [신설 2026-09-09] | **searchTake** · **searchDrop**(`none`) |
| **`answered`** · **`notOpen`** | 이미 답했다 / 아직 만나지 않았다 [신설 2026-09-09] | **searchAnswer** |

렌더러는 코드를 i18n 키로 바꿔 보여준다 (`ch.err.<code>` 등). **코드 문자열이 곧 계약** — 바꾸면 i18n 도 깨진다.

---

## 4. 세이브 스키마 v24

```
{
  version: 24, seed: uint32, createdAt: ms, savedAt: ms,
  resources: { gold, dust, stigma },      // `dust` 는 남는다 — **분해**가 여전히 뱉는다(item_design §5-3 「분해가 뱉는 재료」는 백지). 사라진 것은 **처치** 공급원뿐이다 (v19)
  heroes: [ hero ],                       // §2-4 hero 객체. equipped 키 = 착용 위치 8개 · mastery {nodeId:rank} · masteryPoints · innate(고유 스킬 id) · face(초상 id `<classId>_<k>` 문자열 | null — **직업 풀에서** 생성 시 1회 굴림 · 이후 불변 · 풀 0장인 직업은 null · v13 2026-09-07) · skillOrder?(선택 — 칸 순서)
  party: [ heroUid ],                     // **편성한 순서 그대로** — `party[0]` 이 리더. 새 게임은 `[]` (2026-09-09)
  formation: { tpl, ranks: [[uid...],[uid...]] },   // **진형 — v20**. `tpl` = `formation_template.csv:tpl_id` · `ranks[0]` 전열 · `ranks[1]` 후열.
                                          //   전투가 읽는다(「앞부터 때린다」의 「앞」) · 정규화는 소속을 바꾸는 쪽이 한다 (§2-7)
  items: { itemUid: item },               // §2-5 item 객체 — `up`(강화 단계) 포함, 접사 값은 강화가 박아 둔 값. **무기는 `skill`(담은 액티브 id)도 든다 — v18** · **접사는 출처 `src` 를 든다 — v23**
  bag: [ itemUid ],                       // **인벤토리** — 순서 = 표시 순서. 드롭이 쌓이는 쪽이고 상한은 `[balance.csv:inventory_cap]`
  stash: [ itemUid ],                     // **창고 — v24**. 플레이어가 직접 옮긴 것만 든다 · 상한 `[balance.csv:stash_cap]`
                                          //   창고에서도 **장착 · 분해 · 강화가 그대로** 된다(꺼내는 단계가 없다 — item_design §1)
  progress: { cleared: [ stageId ] },     // **v22** — 필드 모양은 그대로. 챕터보스 스테이지가 x04 → x05 로 옮겨 가 옛 x04 클리어를 x05 에 소급한다 (아래)
  codexCards: { monsterId: n },           // 도감 레벨의 출처. 누적, 소모 없음
  codexKills: { monsterId: n },           // 기록만
  counters: { hero, item, battle, tavern, tactic, upgrade, search },   // uid 발급·시드 파생의 유일한 출처
  run: { stageId, repeat, lastAt, durationSec } | null,
  reports: [ report ],                    // **리포트 목록 — v21**. 최신이 맨 앞 · 상한 [balance.csv:report_keep] · 새 게임은 `[]`
                                          //   반복 원정은 이기는 동안 런을 잇는데 칸이 하나면 앞 런이 매번 덮여 사라졌다 (SCREEN_DESIGN §4-3 · ADR-0063)
  notice: { kind: 'runClosed', stageId, at, seenAt } | null,
  tavern: { rerolledAt: ms | null, hired: [ slotIndex ] },  // 리롤 쿨다운의 기준 시각 · 이번 명단에서 산 칸. 명단 자체는 저장하지 않는다
  search: { heroUid, startedAt: ms, no, sin, cha, answer } | null,  // 나가 있는 수색 1건 [신설 2026-09-09]. 결과도 이야기도 만남도 저장하지 않는다 — `no`(= 그때의 `counters.search`)와 시드가 재현한다. `answer` = 만남에서 고른 답 id | null (고용비만 깎는다)
  tactics: { slots: { 칸번호: {id, grade} } }   // **리롤로 바꾼 칸만.** 안 담긴 칸은 시드가 내는 첫 배정이다 (§2-9 initialAssign · 그쪽은 언제나 `common`)
}
```

- **uid 형식** — 영웅 `h{n}`, 아이템 `i{n}`. 발급은 `state.js:addHero / addItem` 만
- **`search` 는 버전을 안 올리고 들어왔다** [2026-09-09] — 필드가 없으면 `null`(= 수색을 한 적이 없다)이고 **그것이 정확한 초기 상태**라 이관이 소급할 판단이 하나도 없다. `deserialize` 끝의 기본값 보정 두 줄(`search ?? null` · `counters.search ?? 0`)이 곧 이관이다. ⚠ v5 의 `tavern` 은 달랐다 — 「쿨다운이 열린 상태로 올린다」는 **판단**이 필요해서 이관 절이 있어야 했다. 판단이 있으면 절을 쓰고 없으면 안 쓴다
- **`search.sin`·`search.cha` 는 스냅샷이다** — 보낼 때의 값이 결과를 정한다. 나간 뒤에 그 영웅이 레벨업해도 결과가 뒤바뀌면 안 되기 때문이고, 그래서 판정 입력이 세이브에 든다
- **HP 는 세이브에 없다** — 매 전투 최대치 시작. ~~전투불능은 `run.downed`(이번 출정 누적 아웃) 하나~~ 는 **2026-09-08 삭제**(v17) — 아웃은 **그 런 안에서만** 살고 런은 출발 순간 통째로 정산되므로 **세이브가 들 전투불능 상태가 하나도 없다.** 회복 대기도, 누적 아웃도 없다 (base_expedition_design §1-1)
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

**v11 → v12 이관** (2026-09-06 사용자 지시 — 영웅 초상을 **이름 해시에서 저장값으로**. SCREEN_DESIGN §5 · DEV_PLAN 부채 #36). `deserialize` 가 v11 을 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `heroes[*].face` | 없으면(`== null`) **시드에서 소급 배정** — 스트림 하나 `deriveSeed(seed ^ 0xFACE, 0)` 로 `heroes` **배열 순서대로** `hero.rollFace` 1회씩. 이미 가진 영웅은 건드리지 않는다 |
| `version` | `12` |

- **왜 저장으로 바꿨나** — 화면이 이름 해시로 매번 다시 계산하던 값이다. 해시가 몰리면 **아예 안 나오는 얼굴**이 생기고(실제로 그랬다), 그림 장수를 바꿀 때마다 **기존 영웅 얼굴이 전원 재배정**됐다. 저장하면 둘 다 사라진다
- **전투 결과는 안 바뀐다** — 얼굴은 표시 전용이고, 굴림이 **다른 굴림 뒤**에 붙어 앞의 소비 순서를 밀지 않는다(§5-2). 골든 40런·시작 파티 10 지문이 그대로인 것이 그 증거다
- **전용 솔트 `0xFACE`** — 전투·선술집·강화·전술 어느 수열과도 안 섞인다 (§5-1)
- ⚠ [2026-09-07] **이 소급은 v12 → v13 전면 재굴림에 흡수됐다** — 아래 블록이 전 영웅의 `face` 를 조건 없이 덮어쓰므로 여기서 채워 봐야 곧바로 버려진다. `upgradeV11` 은 **버전만 12 로 올린다**

**v12 → v13 이관** (2026-09-07 사용자 지시 — 초상을 **직업 분류**로. 파일명 `hero_<classId>_<k>.png` · `face` 가 정수에서 문자열 id 로). `deserialize` 가 v12 를 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `heroes[*].face` | **전 영웅 전면 재굴림** — 스트림 하나 `deriveSeed(seed ^ 0xFACE, 1)` 로 `heroes` **배열 순서대로** `hero.rollFace(rng, h.cls)` 1회씩. **조건이 없다** — 이미 값이 있어도 덮어쓴다 |
| `version` | `13` |

- **왜 보존하지 않나** — v12 의 정수 얼굴은 **직업과 무관하게** 굴린 번호다(궁수 얼굴이 전사에게 갔다). 보존할 개체성이 없고, 직업 일치가 이 개정의 목적 자체라 남겨 두면 목적이 무너진다
- **전투 결과는 안 바뀐다** — 얼굴은 표시 전용이다. 전용 스트림이라 전투·선술집·강화·전술 수열과도 안 섞인다 (§5-1)
- **마법사는 `null`** — 이 이관이 돌던 시점엔 풀이 0장이라 초상이 없었다(같은 날 밤 1장이 들어와 **v13→v14 가 소급한다** — 아래). 화면은 빈 칸으로 둔다(자리표시를 안 깐다 — SCREEN_DESIGN §5). 그래도 `rollFace` 는 rng 를 1회 소비하므로 **직업 구성이 소비 수를 바꾸지 않는다**

**v23 → v24 이관** (2026-09-11 — **보관이 둘이 된다: 인벤토리 + 창고** · item_design §1 · GAME_DESIGN §9 · 사용자 확정). `deserialize` 가 v23 을 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `stash` | **신설.** 없으면 `[]` |
| `bag` | 앞에서부터 `[balance.csv:inventory_cap]` 개만 남기고 **넘치는 뒤쪽을 `stash` 로 옮긴다** — 순서가 표시 순서라 「앞」이 유저가 최근에 본 자리다 |
| `version` | `24` |

- **rng 를 한 번도 안 쓴다** — 이관이 굴림을 태우면 같은 시드가 다른 결과를 낸다 (v14·v15 와 같은 규칙)
- **아이템은 하나도 안 사라진다** — 옛 상한(70)이 두 칸 합(`inventory_cap` + `stash_cap`)보다 작아 전부 자리를 받는다. 그보다 큰 세이브가 있어도 **넘긴 채로 열린다** — 상한은 **새로 얻을 때만** 막는 값이다(§7 「가방 용량 산수의 순서」와 같은 규칙)
- ⚠ **전투 결과는 안 바뀐다** — 보관 위치는 전투 입력이 아니다

**v22 → v23 이관** (2026-09-11 — **무기 옵션은 세 층이다** · item_design §1 「무기 옵션」 · 사용자 지시 · DEV_PLAN R78). 접사가 출처 `src` 를 들게 됐고 무기는 고정 옵션 · 죄종 칸을 받는다. `deserialize` 가 v22 를 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `items[*].affixes[*].src` | 없으면 `'random'` — **값 · 종류 · 순서는 안 건드린다**(개체값은 개체의 역사다 — v2 · v17 과 같은 규칙) |
| 무기(`slot === 'weapon'`)의 `affixes` | 출처가 전부 `random` 이면 **앞에** `item.legacyWeaponLayers(item)` 을 붙인다 — 고정 옵션 1 + `sins` 마다 죄종 칸 1. **rng 0** — 행은 uid 번호, 값은 범위의 가운데(§2-5). 옛 통합옵션 개수는 줄이지 않는다 |
| `version` | `23` |

- **전투 결과는 바뀐다** — 옛 무기가 고정 공격력 % 와 죄종 칸을 새로 받는다. 부작용이 아니라 **기능**이다(옛 무기도 새 무기와 같은 층을 갖는다 — v9 의 고유 스킬 소급과 같은 취급)
- 리포트(`reports[*]`) 안의 기록은 **옮기지 않는다** — 그날 떨어진 모양의 기록이다. 화면은 출처 없는 접사를 `[랜덤]` 으로 찍는다(SCREEN_DESIGN §6)

**v21 → v22 이관** (2026-09-11 — **챕터는 5스테이지다** · base_expedition_design §1-2 · 사용자 지시 · DEV_PLAN R75). 챕터보스가 4스테이지에서 **5스테이지(보스 단독 1라운드)** 로 옮겨 가고 4스테이지에 새 스테이지보스가 섰다. 해금은 「직전 스테이지 클리어」(`stageUnlocked`)라, 옛 세이브는 새 챕터보스 스테이지를 깬 기록이 없어 **다음 챕터가 통째로 잠긴다.** `deserialize` 가 v21 을 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `progress.cleared` | `boss_grade === 'chapter_boss'` 인 스테이지마다 — **`stageOrder` 상 직전 스테이지를 깼으면 그 스테이지도 깬 것으로 넣는다.** 옛 세이브에서 그 직전 자리(x04)가 곧 챕터보스 자리였으므로 그 클리어가 챕터보스를 잡은 증거다. 이미 있으면 안 넣는다. **스테이지 번호 산술을 안 쓴다** — 주입된 `stages`·`stageOrder` 만 본다 |
| `run.stageId` · `notice.stageId` · `reports[*].stageId` | **옮기지 않는다** — 그 런은 9라운드짜리 옛 자리(x04)에서 돈 것이다. 보스 단독 스테이지(x05)로 고쳐 적으면 리포트의 라운드 수가 거짓이 된다. 제목은 새 x04 이름으로 읽힌다(표시만의 어긋남) |
| `version` | `22` |

- **rng 0회** · **전투 결과가 안 바뀐다** — 해금 기록만 소급한다. 도감(`codexCards`·`codexKills`)은 **몬스터 id** 키이고 챕터보스 id(`C900`)는 그대로라 손댈 것이 없다
- ⚠ 옛 x04 를 깬 플레이어는 **새 4스테이지 보스를 잡은 적이 없는데도** x04 가 깬 상태로 남는다 — 지우면 이미 넘어간 챕터가 잠기므로 「자리 비워도 안전」(base_expedition_design §4) 쪽을 택한다

**v20 → v21 이관** (2026-09-09 — **리포트는 목록이다** · SCREEN_DESIGN §4-3 · ADR-0063 · 사용자 지시 · DEV_PLAN R68). 반복 원정이 런을 이을 때마다 `lastReport` 한 칸이 덮여 **앞 런이 통째로 사라졌다**. `deserialize` 가 v20 을 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `lastReport` → `reports` | 있던 리포트 하나를 **배열의 첫 자리**로 옮기고 옛 키를 지운다. 없으면 빈 배열 — 그것이 「아직 한 판도 안 돌았다」의 정확한 표현이다 |
| `reports[0].contrib` | **안 채운다.** 지나간 전투를 다시 돌릴 수 없고, 없는 값을 0 으로 지어내면 화면이 「못 때렸다」로 읽는다. 렌더러가 `null` 을 받으면 기여 상자를 안 그린다 |
| `version` | `21` |

- **rng 를 한 번도 안 쓴다** · **전투 결과가 안 바뀐다** — 리포트는 정산의 산출물이지 입력이 아니다. 골든 40런의 지문도 그대로다(`runs` 는 `result` 를 보고 `contrib` 은 지문 필드가 아니다). ⚠ 다만 `balance.csv` 에 **`report_keep` 키가 늘어** `meta.balance`·`meta.csvHash` 는 움직인다 — 그 둘만 재촬영 대상이다 (§5-5)

**v19 → v20 이관** (2026-09-09 — **진형이 실물이 된다** · battle_design §3-1 · 사용자 지시 · DEV_PLAN R67). 종전엔 자리가 **화면 상태**(`ui/app.js:state.expForm`)에만 살아서 새로고침하면 사라졌고 전투도 몰랐다(부채 #37). `deserialize` 가 v19 를 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `formation` | **새로 만든다** — 기본 템플릿(`formation_template.csv` 첫 행)으로 두고 `normalizeFormation` 이 **파티 순서대로 전열부터** 채운다. 결정적이고 rng 를 안 쓴다 |
| `version` | `20` |

- ⚠ **화면에 마지막으로 그려져 있던 배치는 복원할 수 없다** — 저장된 적이 없는 값이다. 옛 세이브는 「그 파티의 자연스러운 줄」로 시작한다
- **rng 0회** · ⚠ **전투 결과는 바뀐다** — 자리가 생겨 대상 선택이 전열로 좁아지기 때문이다(§5-2). 골든 전면 재촬영

**v18 → v19 이관** (2026-09-09 — **처치는 가루를 안 뱉는다** · GAME_DESIGN §9 09-09 · item_design §5-3 · DEV_PLAN R63). 정예·보스 처치의 산출이 **장비·골드**로 좁혀졌다. `deserialize` 가 v18 을 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `lastReport.dust` | **삭제.** 리포트는 「그 전투가 준 것」을 적는데 처치가 가루를 안 주므로 적을 칸이 아니다 (v17 의 `lastReport.outTotal` 과 같은 취급) |
| `resources.dust` | **안 건드린다.** 이미 번 가루는 플레이어의 것이고, **분해**라는 공급원이 그대로 살아 있다 — 폐지된 것은 처치 채널 하나다. 소급 회수는 「자리 비워도 안전」(CLAUDE.md 철학 2)을 깬다 |
| `version` | `19` |

- **rng 를 한 번도 안 쓴다** · **전투 결과가 안 바뀐다** — 가루 지급은 굴림을 안 타고 전투 수치에도 안 들어간다. 골든 40런의 수열은 그대로이고, 지문에서 **`dust` 필드가 빠질 뿐**이다 (§5-5)

**v17 → v18 이관** (2026-09-09 — 직업 스킬 풀 「1스킬 = 1직업」 · GAME_DESIGN §9 09-08·09-09 · DEV_PLAN R59). `skill.csv` 가 통째로 갈렸다 — 무기군 전용 행 10 이 사라지고 직업 풀이 섰다. `deserialize` 가 v17 을 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `items[*].skill` (무기 · 없는 것만) | 그 무기군의 **직업 풀**에서 채운다. 고르는 자는 `uid` 의 번호를 풀 길이로 나눈 나머지다 — **rng 를 안 쓰면서 개체마다 갈리는** 유일한 축이 uid 다. 풀이 비는 무기군(확장 직업)은 `null` |
| `heroes[*].innate` (직업 풀 **밖**인 것만) | 같은 규칙으로 갈아끼운다. 옛 굴림은 직업을 안 가려서(09-01 판) 마법사가 `wg_axe` 를 들고 있을 수 있고, 그 행은 이제 정의에 아예 없다. **이미 제 직업 것을 든 영웅은 안 건드린다** — 채우기이지 덮어쓰기가 아니다 |
| `version` | `18` |

- **rng 를 한 번도 안 쓴다** — 이관이 굴림을 태우면 같은 시드가 다른 결과를 낸다 (v14·v15 와 같은 규칙)
- ⚠ **전투 결과가 바뀐다** — 액티브 2번 칸의 내용물이 갈리기 때문이다. 이관이 만든 값은 결정적이지만 **새 게임의 굴림과는 다른 분포**다(uid 나머지 vs 균등 굴림). 옛 세이브에 한정된 임시성이고, `regroupWeapon`(v15)이 무기군을 옮긴 뒤라도 **새 무기군의 직업 풀**을 본다

**v16 → v17 이관** (2026-09-08 — 「출정 아웃」 폐기 · GAME_DESIGN §9 09-08 · DEV_PLAN R54). `deserialize` 가 v16 을 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `run.downed` | **삭제.** 아웃이 런을 넘지 않으므로 들고 있을 상태가 아니다. 옛 세이브에서 아웃이던 영웅은 **전부 나은 것으로 본다** — 새 규칙에서 전투 밖에 쓰러져 있는 영웅은 존재할 수 없고, 이관이 만들 수 있는 상태 중 규칙에 맞는 것이 그것 하나뿐이다(v10→v11 이 `injuredUntil` 을 걷을 때와 같은 논리) |
| `lastReport.outTotal` | **삭제.** 「이번 출정 누적 아웃」은 리포트가 적을 것이 없다. 그 런의 전투불능은 `downed` 가 그대로 든다 |
| `version` | `17` |

- **rng 를 한 번도 안 쓴다**
- ⚠ **진행 중이던 반복 원정은 그대로 이어진다** — `run.repeat` 은 안 건드린다. 다음 런에 전원이 나갈 뿐이다

**v15 → v16 이관** (2026-09-08 — 사제 전용 무기 성경·십자가 · GAME_DESIGN §9 09-07 · DEV_PLAN R46). `deserialize` 가 v15 를 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| 사제가 **착용 중인** `staff` / `orb` | 무기군을 **`bible` / `crucifix`** 로 갈아끼운다(`item.regroupWeapon`). 주기 축이 그대로 대응한다 — 스태프 1.7 느림 → 성경 1.7 · 오브 1.3 빠름 → 십자가 1.3. **벗기지 않는다**: 무기가 밑수라(battle_design §9-1) 맨손이 된 사제는 세기가 통째로 무너진다 |
| **가방**에 든 `staff` / `orb` | **안 건드린다.** 마법사가 그대로 쓸 수 있으므로 옮기면 마법사의 무기를 뺏는 것이 된다 |
| 개체 굴림(`watk` · `element` · `affixes` · `up`) | **보존.** 세기는 개체가 들고 무기군은 주기·편차·착용 직업을 가리키는 포인터라, 포인터만 옮기면 세기를 안 건드리고 소유 직업을 옮길 수 있다 |
| `name` | 접사 죄종(`sins`)을 살려 **베이스만 갈아** 다시 조립한다 (§2-10 `composeName`) |
| `version` | `16` |

- **rng 를 한 번도 안 쓴다** — v14→v15 와 같은 규칙이다
- ⚠ **사제가 아닌 영웅은 영향이 없다** — `staff`·`orb` 의 `classes` 에서 빠진 직업은 사제 하나뿐이다

**v14 → v15 이관** (2026-09-08 — 영웅 3층 · 개체별 히든 상한 폐지 · GAME_DESIGN §9 09-07 · DEV_PLAN R48). `deserialize` 가 v14 를 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `heroes[*].caps` | **삭제.** 상한이 `[balance.csv:hero_attr_max]` 하나로 전 영웅 공통이 되어(hero_design §4-3) 개체가 들 것이 없다. **소급 보정 없음** — 이미 오른 `stats` 는 그대로 두고, 낮게 굴렸던 영웅은 상한이 풀리는 쪽이라 손해가 없다 |
| `heroes[*].tier` | 없으면 **`'rare'`**. v14 까지 생성기는 `tier: 'rare'` 고정이었다. ⚠ **소급 재굴림을 하지 않는다** — 매직은 총합이 낮은 대역이라 옛 영웅을 매직으로 내리면 능력치가 깎인다 |
| `version` | `15` |

- **rng 를 한 번도 안 쓴다** — 삭제와 기본값뿐이라 전용 스트림이 필요 없다 (v11→v12·v13→v14 와 다른 점)
- **전투 결과가 바뀐다** — `caps` 가 사라져 레벨업 성장이 공통 상한까지 간다. 옛 세이브는 이 이관 이후 더 자랄 수 있다
- 새 영웅의 굴림 계약은 §2-4 `rollHero` — **등급 1 → 총합 1 → 능력치 7 → 고유 1 = 언제나 10회**이고 **소비 수가 등급에 의존하지 않는다**(지정이어도 굴림을 태운다)

**v13 → v14 이관** (2026-09-07 밤 — 마법사 초상 1장 추가로 `face = null` 간극을 소급). `deserialize` 가 v13 을 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `heroes[*].face` | **`null` 인 영웅만** — 스트림 하나 `deriveSeed(seed ^ 0xFACE, 2)` 로 `heroes` **배열 순서대로** 훑되, `face == null` 인 영웅에만 `hero.rollFace(rng, h.cls)` 1회씩. **가진 영웅은 rng 를 소비하지 않는다** — 소비 수는 null 영웅 수와 같다 |
| `version` | `14` |

- **왜 필요한가** — v12→v13 전면 재굴림이 돌던 시점에 마법사 풀이 0장이라 마법사가 전부 `null` 을 받았고, 같은 날 밤 마법사 그림이 들어와 **새 마법사만 그림을 받는 간극**이 생겼다. 이 이관이 그 간극을 닫는다
- **「생성 시 1회·불변」과 안 부딪힌다** — 그 계약은 *굴려진* 얼굴의 것이다. `null` 은 풀이 없어 못 굴린 상태라, 채우는 것은 덮어쓰기가 아니라 **처음 굴리는 것**이다 (v11→v12 소급과 같은 성격)
- 풀이 여전히 0장인 직업(확장 직업)은 다시 `null` — rng 는 그래도 1회 소비된다(위 규칙의 「null 인 영웅」 수에 든다)
- 전투 결과는 안 바뀐다(표시 전용) · 전용 스트림이라 다른 수열과 안 섞인다 (§5-1)

**v9 → v10 이관** (2026-09-02 — 전술 옵션 등급 축 · tactic_card_design §5-5). `deserialize` 가 v9 를 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `tactics.slots[*]` | **문자열이면 `{id: 그 문자열, grade: 'common'}`** — 옛 세이브의 칸은 등급이 없던 시절에 굴린 것이라 **가장 낮은 등급으로 받는다**. 첫 배정이 언제나 `common` 인 것과 같은 자리에 세우는 것이고, 반대로 올려 주면 이관이 공짜로 파워를 준다 |
| `version` | `10` |

- **가족이 CSV 에서 사라졌으면 그대로 둔다** — `tacticState` 가 못 찾은 칸을 첫 배정으로 되돌리므로(§2-7) 이관이 손댈 필요가 없다. 임시 풀은 통째로 교체될 예정이라(tactic_card_design §5-7) 이 경로는 실제로 열린다
- 전투 결과는 바뀔 수 있다 — 옛 세이브가 리롤로 넣어 둔 칸의 값이 `common` 값으로 읽힌다. 이관 전 코드는 **모든 칸을 `rare` 값으로** 읽고 있었으므로(가족당 마지막 행만 남던 버그) 내려가는 방향이다

**v10 → v11 이관** ⚠ **[계획 2026-09-01 · 구현 전]** (전술 리롤 재설계 — tactic_card_design §5-6). `deserialize` 가 v10 을 받으면 제자리에서 올린다:

| 대상 | 규칙 |
|---|---|
| `tactics.locked` | 없으면 `[]` — **아무 칸도 안 잠긴 상태.** 옛 세이브에는 잠금이라는 개념이 없었으므로 소급할 것이 없다 |
| `version` | `11` |

- **칸의 내용은 안 바뀐다** — `tactics.slots` 는 그대로다. 이관이 들고 있던 옵션을 흔들지 않는다
- ⚠ **이 절은 계약을 먼저 적어 둔 것이고 코드에는 아직 없다** (DEV_PLAN §3-3 R28 — 잠금 비용 곡선이 기획 미정이라 막혀 있다). 구현이 오면 이 ⚠ 를 걷는다. ⚠ **버전 번호가 한 칸 밀렸다** — 2026-09-02 등급 축 반영이 v10 을 먼저 썼다

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
- `reports[*].strikes` 는 v3 이전 리포트에 없다 — 없으면 `null` 로 다룬다 (§2-7). `contrib` 은 v20 이하 이관본에 없다(같은 규칙)
- 저장소 키(localStorage) `thesevensim.save` — `ui/storage.js` 만 안다. Phase 2 에서 이 파일만 파일 시스템/클라우드 어댑터로 교체

---

## 5. 결정론 계약

### 5-1. 시드 파생

| 스트림 | 시드 | 소유 |
|---|---|---|
| 시작 무기 | `deriveSeed(seed, 0)` | state.newGame |
| n번째 전투 | `deriveSeed(seed, counters.battle)` (선증가) | state.resolveBattle |
| 선술집 후보 | `deriveSeed(seed ^ 0x5A17, counters.tavern)` | state.tavernCandidates |
| 수색 결과 · 이야기 | `deriveSeed(seed ^ 0x5EA7, search.no)` | state.searchRoll — **저장하지 않는다.** 같은 세이브를 다시 열면 같은 영웅과 같은 이야기가 나온다 (신설 2026-09-09) |
| 수색 만남 | `deriveSeed(seed ^ 0x11EE, no)` | state.searchMeetingOf — **결과 스트림과 갈라 두었다.** 회차 번호 하나로 정해지므로 **보내기 전에도 알 수 있고**(그것이 「소문」이 거짓이 아닌 이유), 결과 굴림의 소비 순서를 안 민다 (신설 2026-09-09 · ADR-0068) |
| 장비 강화 | `deriveSeed(seed ^ 0xF0C3, counters.upgrade)` | state.upgradeItem — 전투·선술집·전술 어느 수열과도 안 섞인다 |
| 얼굴 소급 (v11→v12 이관) | `deriveSeed(seed ^ 0xFACE, 0)` | state.upgradeV11 — **옛 영웅에게만.** 새 영웅의 얼굴은 `rollStartParty` 를 부른 쪽의 rng 에서 나온다 [신설 2026-09-06 · **v13 이관에 흡수 2026-09-07** — 이 스트림은 더 안 돈다] |
| 얼굴 전면 재굴림 (v12→v13 이관) | `deriveSeed(seed ^ 0xFACE, 1)` | state.upgradeV12 — **전 영웅 · `heroes` 배열 순서.** 직업 풀에서 다시 굴린다(조건 없음) [신설 2026-09-07] |
| 얼굴 `null` 소급 (v13→v14 이관) | `deriveSeed(seed ^ 0xFACE, 2)` | state.upgradeV13 — **`face == null` 인 영웅만** · `heroes` 배열 순서 · 가진 영웅은 소비 0 [신설 2026-09-07 밤] |
| 고유 스킬 소급 (v8→v9 이관) | `deriveSeed(seed ^ 0x5C11, 0)` | state.upgradeV8 — **옛 영웅에게만.** 새 영웅의 고유 스킬은 `rollHero` 안에서 그 호출자의 rng 로 굴린다(시작 후보 = UI 상수 · 선술집 = `^ 0x5A17`) |
| 시작 후보 (새 게임 화면) | `makeRng(ROLL_SEED + roll)` — 고정 상수 | **ui/app.js** — 세이브 밖. 같은 리롤 횟수면 언제나 같은 3명 |
| 마스터 시드 | `now() >>> 0` 확정 시각 | ui/app.js → newGame |

### 5-2. rng 소비 순서 (바꾸면 같은 시드가 다른 게임이 된다)

| 위치 | 순서 |
|---|---|
| `formula.strike` | 적중 → (적중 시) 치명 → **(적중했고 추가 피해 확률이 있는 타격만) 추가 피해**. 빗나감 1회 · 확률 0 인 적중 2회 · 확률 > 0 인 적중 3회 [추가 피해 2026-09-10 · R72]. 편차 굴림은 없다(무기 개체에 박혀 있다). **기본 공격은 확률이 언제나 0** 이라 수열이 종전과 같다 — 추가 피해를 가진 스킬(지금 차지 · 라이트닝 · 체인 라이트닝)의 타격만 한 번씩 더 굴린다 |
| `hero.rollAttributes` | 축별 가중치 7회 → 합 맞추기 루프(가변, 최대 500회) → 자리 바꿈(소비 없음) |
| `hero.rollHero` | **`rollTier` 1회 → `rollTotal` 1회 → `rollAttributes` 7회 → `rollInnate` 1회** = 언제나 10회 [개정 2026-09-08 · R48]. `rollInnate` 는 **그 영웅의 직업 풀**에서 굴리고(2026-09-09 · §12-1 규칙 1) **풀이 비어도 1회 소비한다**. ~~`rollCaps` 7회~~ 는 삭제(개체별 히든 상한 폐지) · ~~`rollAttributes` 의 나머지 보정 rng~~ 도 삭제(결정적 분배로 교체 — 굴림 결과가 소비 수를 밀면 안 된다). ⚠ **등급을 지정해도 `rollTier` 는 굴림을 태운다** — 소비 수가 등급에 의존하면 선술집에서 같은 시드가 다른 결과를 낸다 |
| `hero.rollStartParty` | 이름 n → 죄종 n → 직업 n → 특성 n → `rollHero` n명 → **얼굴 n회**(각자 제 직업 풀에서 1회씩 — **풀이 비어도 1회 소비**, 2026-09-07 개정). ⚠ **얼굴이 맨 뒤인 것이 계약이다** — 영웅 안에서 굴리면 앞 영웅의 얼굴이 뒤 영웅의 능력치를 밀어 같은 시드가 다른 파티를 낸다 |
| `hero.rollStartParty(n)` | 이름 n → 죄종 n → 직업 n → 특성 n → 영웅 i 마다 `rollHero` → 얼굴 n회(직업 풀 · 풀이 비어도 1회) |
| `hero.grantXp` | 레벨업 1회당 축별 7회 (상한 미달 축만) |
| `state.searchMeetingOf` | **만남 1회**뿐이다 — 전용 스트림(`^ 0x11EE`)이라 아래 `searchRoll` 의 소비 수열과 **섞이지 않는다** [신설 2026-09-09]. 한 스트림에 얹으면 만남 굴림이 결과 굴림을 밀어 **같은 시드가 다른 영웅**을 낸다. 답(`search.answer`)은 **굴림을 안 쓴다** — 문턱만 옮긴다(고용비) |
| `state.searchRoll` | **등급 1회**(매력이 민 레어 확률) → **`rollCandidates(rng, 1, [tier])` 10회** → **죄종 메아리 1회** → **막마다 1회**(`search_story.csv` 의 막 수 — 지금 3) = 막 셋이면 **15회** [신설 2026-09-09].<br>**결과를 먼저 굴리고 이야기를 뒤에 둔다** — 이야기 행이나 막을 늘려도 **나온 영웅이 안 바뀐다**(`rollFace` 를 맨 마지막에 두는 것과 같은 이유). 막을 늘리면 그 뒤의 소비만 는다.<br>죄종 메아리는 굴린 영웅의 `sin` 을 **덮어쓴다** — 죄종은 능력치·고유 굴림의 입력이 아니라(주력 축은 직업이 정한다) 덮어써도 앞의 소비가 안 밀린다.<br>막의 후보는 **공통(`-`) + 그 죄종** 행이고 **CSV 행 순서가 인덱스 순서**다 |
| `item.rollDrop` | **부위 1회** → `rollGear` 한 벌(아래) — 즉 부위 → 베이스 → 희귀도 → `build` [정리 2026-09-11 · R79 — 뒤 셋을 `rollGear` 에 위임했고 **수열은 종전과 같다**]. **`magicFind` 는 레어 가중치만 바꾸고 굴림은 1회 그대로**(R78). ⚠ **게임 경로에서는 더 안 불린다** — 처치 드롭이 「입고 있던 장비」로 바뀌어(R79) 부위를 굴리지 않는다. 검증·골든이 파이프라인 전체를 한 입구로 재는 자리로 남는다 |
| `item.rollGear` | **부위 배열 순서대로** 부위마다: 베이스(무기는 `weaponGroup` 을 주면 **0회** · 안 주면 무기군 1회 / 무기 외 1회) → **희귀도 1회**(`magicFind + rareBonusPct` 가 레어 가중치에 곱한다) → `build` [신설 2026-09-11 · R79]. ⚠ **부위 배열 순서가 계약이다** — 몬스터는 `monster.csv:wear_slots` 를 그 순서로 넘긴다 |
| `item.build` | 접두 죄종 → **(레어) 접미 죄종** [개정 2026-09-11 · R77 — ~~(레어) 접미 판정 → (성공 시) 접미 죄종~~ · 죄종 수는 희귀도가 정한다(매직 1 · 레어 2) — 판정 1회가 빠졌다] → **(무기) 옵션 세 층** [2026-09-11 · R78 — 고정 값 1 → 죄종마다 (행 1 → 값 1) → 통합옵션마다 (종류 1 → 변형 1 → 값 1) · 후보가 비어도 소비 수 불변 · §2-5 「무기 옵션」] / **(무기 외)** 접사 수 → 접사마다 (정의 선택 → 값) → **(무기) 베이스 1회** [신설 2026-09-10] → **개체 굴림 1회**(무기 = 공격력 편차 / 방어구 = implicit 편차 / **목걸이·반지 = 소비 없음**) → ~~(마법 무기) 원소~~ **[삭제 2026-09-11 · R80 — 생성 때 원소를 굴리지 않는다. 마법 무기에서 소비 1회가 빠진다]** → **(무기) 스킬 1회** [신설 2026-09-09]. ⚠ 베이스·스킬 굴림은 **풀이 비어도 1회 소비한다** — 소비 수가 무기군에 의존하면 같은 시드가 다른 드롭을 낸다. 베이스 굴림은 **균등**(대역 가중 없음 — 수치 미발행) |
| `item.build`(시작 무기) | 위와 같되 magic 이라 접미 죄종을 굴리지 않는다 |
| `item.upgrade` | 옵션 계단(`up` 이 `equip_upgrade_option_interval` 의 배수)이면 **접사 선택 1회**, 아니면 **0회**. 베이스 갈래는 rng 를 안 쓴다 |
| `battle.spawnRound` | **2단이다** [개정 2026-09-11 · R79]. **1단 편성**(종전 그대로 · 순서·횟수 불변) — 보스: 호위 수 → 호위마다 풀 선택 / 일반: 정예마다 (죄종 → 풀 → 공통 특성 2) → 일반 수 → 일반마다 풀. **2단 장비·스킬** — 편성이 확정된 뒤 **목록 순서로** 유닛마다: `wear_slots` 로 `itemSystem.rollGear` 한 벌 → (`grade.skill_slots ≥ 3` 이면) **셋째 스킬 1회**(그 몬스터 직업 풀 · 풀이 비어도 1회 소비).<br>⚠ **1단이 2단보다 앞인 것이 계약이다** — 장비 굴림이 편성 굴림을 밀면 같은 시드가 다른 편성을 낸다(`rollFace` 를 맨 뒤에 두는 것과 같은 이유 · `state.searchRoll` 의 「결과를 먼저, 이야기를 뒤에」와 같은 규칙).<br>⚠ **소비 수가 처치 수가 아니라 스폰 수를 따라간다** — 드롭이 안 나와도 몬스터는 장비를 입고 있다 (item_design §1 「몬스터 장비를 언제 굴리나」) |
| ⚠ `battle.stagePool` **순서** | `pool[Math.floor(rng × 3)]` 이 이 배열의 인덱스를 쓰므로 **순서 자체가 계약이다.** JS 에서 그 순서는 CSV 행 순서가 아니라 **`monster_idx` 오름차순** — `D.monsters` 가 정수 키 객체라 `Object.values` 가 정수 키를 강제로 오름차순 열거한다. 지금은 `monster.csv` 가 idx 순으로 쓰여 있어 **우연히 일치**할 뿐이다. **엔진에서 해시맵(순서 불정)을 쓰면 다른 게임이 된다** — 이식할 때 `monster_idx` 로 명시 정렬하라 (2026-08-31) |
| `battle.beginRound` | `spawnRound` → **적의 오오라 적용(rng 0 · R79)** → 적마다 등장 지연 1회 |
| `battle.simulate` 루프 | 틱마다 **창 만료 처리(소비 없음)** → `[...party, ...enemies]` 배열 순서로 `act` |
| `battle.act` 기본 공격 [확정 2026-09-08 · 확장 2026-09-09] | 타겟 1회(**도발·지목 중이면 0회**) → `strike`. 대상은 **전열 생존자 중 균등 무작위**이고 전열이 전멸해야 후열이 열린다 — 영웅·몬스터 양쪽이 같은 규칙이다 [개정 2026-09-09 · ~~생존 적 중 균등 무작위~~ 폐기 · battle_design.md §3-1]. ⚠ **소비 횟수는 안 바뀐다** — 모집단이 좁아질 뿐이라 수열이 안 밀린다. 다만 **고른 결과가 달라져 골든은 재촬영**이다.<br>⚠ **평타 부여 창이 켜지면 소비가 는다** — `attack_splash` 는 타겟 굴림 **0회** + 적 수만큼 `strike`, `onhit_element` 는 때린 대상마다 `strike` 를 **한 번 더**. 창이 없을 때의 수열은 종전과 같다 |
| `battle.act` 스킬 | 발동 선택 0회 → `enemy_single`: 타겟 1회(도발 무관 — 파티 스킬은 도발 대상이 아니다) → `hits` 회 `strike` / `enemy_rotate`·`enemy_chain`: 시작점 1회(**`pickTarget` 을 지난다 — 전열 우선** · 2026-09-09 개정. 도는 것은 배열 전체다) → 타격마다 `strike` / `enemy_all`: 0회(감쇠가 있어도 **주 대상은 결정론** — 2026-09-10) → 대상마다 `strike` / **`enemy_highest_def`: 0회**(방어 최대 = 결정론) → `hits` 회 `strike` / `heal`·`buff`·`aura`·`summon`: 0회.<br>⚠ **소환은 굴림을 안 쓰지만 모집단을 바꾼다** [2026-09-09] — 벽이 파티 배열에 서면 적의 타겟 굴림이 `foes.length` 가 커진 상태로 돌아 **그 뒤 수열이 통째로 달라진다**. 벽은 라운드 끝에 사라진다. ⚠ **여러 대상을 때리는 스킬은 대상마다 `strike` 를 부른다** — 적중·치명을 대상마다 따로 굴리는 것이 계약이고, 그래서 **타격 rng 소비가 대상 수에 종속**된다 [확정 2026-09-08 · battle_design.md §3-1]. ⚠ **타수 슬롯(`hits`)이 능력치로 오르면 `strike` 소비도 는다** — 계수가 0 인 동안은 불변이다 [2026-09-10 · skill_design §13-4] |
| `battle.onKill` | 카드 판정 1회 → **드롭 판정 1회**(처치당 최대 1개, 2026-08-28) → (드롭 시) **입은 부위 선택 1회** [개정 2026-09-11 · R79 — ~~ilvl 1회 → `rollDrop`~~ 삭제]. 떨어지는 것은 **스폰 때 이미 만들어진 그 몬스터의 장비 한 점**이라 여기서 아이템을 만들지 않는다. ilvl 굴림도 없다(`dlvl + grade.gear_ilvl_add` · 굴림 없음). ⚠ **적의 소환 벽은 처치가 아니다** — `onKill` 을 안 지나므로 **rng 0** · 골드·경험치·카드·드롭 없음 (R79 — 몬스터가 소환 스킬을 쓰게 되며 생긴 경로) |
| 사건 훅(`reactions`) | 핸들러가 rng 를 쓰면 **발화 지점에서** 소비한다 — `cast` 는 skill 이벤트 뒤 · `hit`/`hitTaken` 은 hit 이벤트 뒤 · `kill` 은 `onKill`(드롭) **뒤** · `down` 은 down 이벤트 뒤. 지금 등록된 핸들러 0 → 소비 0 (2026-09-01) |
| `state.resolveBattle` | `simulate` 가 쓴 rng 를 **이어서** 파티원마다 `grantXp` |
| `tactic.initialAssign` | **가족 풀** 섞기 — 뒤에서 앞으로 `가족 수 − 1` 회. 스트림 = `deriveSeed(seed ^ 0x7AC7, 0)` (**리롤 카운터를 타지 않는다**). 등급은 안 굴린다 — 첫 배정은 언제나 `common` (2026-09-02 · tactic_card_design §5-5) |
| `tactic.pick` | **가족 1회 → 등급 1회, 이 순서로 2회** (2026-09-02 — 리롤은 옵션과 등급을 같이 굴린다 · tactic_card_design §5-5). 등급은 `tactic_grade_weight_*` 셋의 **가중 추첨**이고 훑는 순서는 `GRADES` 배열 순서(`common` → `magic` → `rare`)다 — **그 순서가 계약**이다. 스트림 = `deriveSeed(seed ^ 0x7AC7, counters.tactic)` — 선술집(`^ 0x5A17`)과 마찬가지로 전투 스트림과 섞이지 않는다.<br>⚠ **[개정 2026-09-01 · 구현 전] 전체 리롤은 이 스트림 하나로 여러 번 뽑는다** — `counters.tactic` 은 리롤 **1회에 한 번만** 오르고, 그 시드로 만든 rng 하나가 **굴릴 칸을 번호 오름차순으로** 돌며 `pick` 을 연속 호출한다. **이 순회 순서가 계약**이다: 순서를 바꾸면 같은 시드가 다른 판을 낸다 |

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
| 수색 시드 솔트 | `0x5EA7` | state.js | 전투·선술집·강화·전술 어느 수열과도 안 섞인다 (§5-1 · 신설 2026-09-09) |
| `SEARCH_TIER_HI` · `SEARCH_TIER_LO` | `'rare'` · `'magic'` | state.js | 수색이 매력으로 가르는 두 등급 = `hero_tier.csv` 의 **굴림 가능한 두 행**. 어휘가 코드에 있는 이유는 **어느 쪽이 위인가를 코드가 알아야** 하기 때문이다 — CSV 는 대역과 모양만 들고 순위를 말하지 않는다. ⚠ 등급 층이 셋 이상으로 늘면 이 두 상수가 아니라 **가중치 굴림**으로 바꿔야 한다 (신설 2026-09-09) |
| 고유 스킬 소급 시드 솔트 | `0x5C11` | state.js | v8→v9 이관 전용 스트림 (§5-1) |
| 전술 옵션 등급 어휘 `GRADES` | `['common','magic','rare']` | tactic.js | **배열 순서가 가중 추첨의 훑는 순서**다 — 순서를 바꾸면 같은 시드가 다른 등급을 낸다. 값(가중치)은 CSV (2026-09-02) |
| `action_period` 반올림 | 소수 3자리 | hero.js | |
| 타임라인 `t` 반올림 | 소수 1자리 | battle.js | |
| `EPS` | `1e-9` | skill.js | 준비(`readyAt ≤ t + EPS`)·만료(`until ≤ t + EPS`) 판정 허용 오차 — 틱 누산이 경계를 미세하게 밑도는 것을 막는다 |
| 스킬 초기 `readyAt` | 0 | battle.js simulate | 전투 시작 시 전부 준비 — 첫 차례는 `priority` 로 갈린다 |

### 5-4. 부동소수

전부 JS `number`(IEEE754 double). `Math.round` / `toFixed` / `Math.floor(rng × n)` 의 결과가 계약에 들어간다. **이식 언어에서 double 을 써야 한다** — float32 로 계산하면 `Math.floor(rng × pool.length)` 의 경계에서 다른 인덱스가 나올 수 있다.

### 5-5. 골든 시드 스냅샷 — **Phase 2 가 맞춰야 할 대상** (2026-08-31 신설)

위 §5-1~§5-4 는 규칙이고, 이것은 **그 규칙이 실제로 낸 답**이다. 엔진 쪽에서 같은 시드로 같은 지문이 나오면 이식이 성공한 것이다.

- 파일 — `src/dev/golden.json` (지문) · `src/dev/golden.js` (생성·대조). **둘 다 이식 대상이 아니다** — `dev/` 는 검증 도구라 엔진 쪽 언어로 다시 쓴다. 맞춰야 하는 것은 **JSON 의 값**이지 이 코드가 아니다
- 범위 — 시드 1~10 × 스테이지 101~105 = **50 런** [개정 2026-09-11 — 챕터 5스테이지 · ~~101~104 = 40 런~~ · R75]. 캘리브레이션(시드 20 × 같은 5스테이지)과 **같은 조건**이라 두 표가 서로를 설명한다. 105 가 **챕터보스 단독 1라운드**의 표본이다
- **R79 · R80 재촬영** [2026-09-11] — 몬스터가 영웅과 같은 경로로 전투 능력치를 얻고(`computeCombat`) 스폰 때 장비를 굴리게 되어(§5-2 `spawnRound` 2단) **50런 전부**가 갈렸다. 입력 지문 — `csvHash` 3(`balance`·`monster`·`spawn_grade`) · `balance` 2키(`drop_ilvl_spread` 퇴역 · ⚠ `inventory_cap` 70 → 96 은 같은 시각 **다른 세션**의 변경) · `parties`(시작 무기 — 마법 무기 원소 굴림 1회 삭제로 수열이 밀렸다 · R80). 재촬영 뒤 **50런 · 드롭 14 · 이벤트 53111**

#### 입력 지문 (`meta`) — **출력보다 먼저 대조한다**

`meta` 가 어긋났는데 `runs` 만 보면 원인이 아니라 증상을 보게 된다. 그래서 대조 순서가 계약의 일부다.

| 키 | 무엇 | 왜 |
|---|---|---|
| `csvHash` | `FILES` 38종 **각각의 원문 해시** (FNV-1a 32) [정정 2026-09-11 — 27 → 38 · 이 수는 잘 낡는다 · 정정 2026-09-08 — 23 → 27] | 어느 **파일**이 달라졌는지를 짚는다. ⚠ **이식 대상이 아니다** — 개발 중 회귀 탐지용. 개행 `\n` 정규화 · BOM 제거 후 센다(`parseCsv` 가 둘 다 무시하므로) |
| `balance` | `balance.csv` **전 키의 값** | 손잡이 5키만 보던 판(08-31 최초)은 밖의 15+ 키가 지문을 깨는데도 "같다"고 통과시켜 **회귀로 오진하게 만들었다.** 지금은 `키: 옛값 → 새값` 을 최대 8개 찍는다 |
| `knobs` | 5키(`monster_atk_scale`·`monster_hp_scale`·`hero_hp_base`·`weapon_atk_base`·`power_growth_per_level`) | **대조하지 않는다** — 사람이 읽는 통과 메시지의 문구일 뿐이다 (대조는 `balance` 가 한다) |
| `parties` | 시드 1~10 의 **시작 파티** — 영웅마다 `cls\|sin\|name.en\|trait.en\|**등급**\|고유 스킬\|능력치 7\|시작 무기(드롭 지문 형식)` [개정 2026-09-08 — `tier` 신설 · ~~히든 상한 7~~ 삭제] | `hero.drawDistinct`(이름·죄종·직업·특성) · **`rollTier`** · `rollAttributes` · **`rollInnate`**(2026-09-01 · **직업 풀** 2026-09-09) · `item.startingWeapon` 이 전부 여기 있다. 첫 파티의 **레어 1 + 매직 2** 도 여기서 잠긴다. 이름·특성 풀의 **행 순서**는 여기서만 잡힌다 — 이름은 전투에 안 들어가서 `runs` 가 원리상 못 본다. 40런에 중복하지 않고 시드마다 한 번만 적는다 |

#### 런 하나를 만드는 절차 (이 순서가 곧 계약이다)

1. `hero.rollStartParty(makeRng(1000 + seed), party_size_max)`
2. `state.newGame(seed, party, 1700000000000)` — 시각은 고정 상수
3. `progress.cleared = GOLDEN_STAGES.filter(s => s < stage)` — **해금만** 풀어준다(성장·장비 없음). 101~104 런의 해금 목록은 옛 `[101,102,103]` 판과 같다
4. `state.tacticState` 로 **열린 칸 전체**를 먼저 읽고 (전술은 자기 rng 스트림이라 전투 수열과 안 섞인다 — §5-2)
5. `state.resolveBattle(state, stage, 1700000000000)`

#### 런 지문의 필드

| 필드 | 뜻 |
|---|---|
| `won` · `reason` · `rounds` · `cleared`(roundsCleared) · `sec` | 전투 결말 |
| `downed` | **파티 자리 번호**, uid 아님 |
| `gold` · `xp`(xpTotal) · `xpEach` | 보상 [~~`dust`~~ 는 2026-09-09 삭제 — 처치가 가루를 안 뱉는다] |
| `events` | 타임라인 길이 — 구조 변화 감지 |
| `strikes` | `파티 n/miss · 적 n/miss` |
| `cards` | `몬스터id:장수` 오름차순 (도감 카드 — 처치의 10%만 뜬다) |
| `kills` | `몬스터id:처치수` 오름차순 — **스폰 구성**. `cards` 는 표본이 10% 라 편성을 못 본다 |
| `casts` | `스킬id:시전수` (id 오름차순). **스킬 선택은 rng 를 0회 쓴다** — 다른 어느 필드도 이 로직을 못 본다 |
| `elites` | 라운드별 `라운드:죄종:특성+특성+특성` (공백 구분). `spawnRound` 의 정예 굴림(죄종 · `pickTwo` 2회)과 `SIN_TRAITS`/`COMMON_TRAITS` 값이 여기 있다 — 특히 `pickTwo` 의 `if (b===a) b=(b+1)%len` 은 다른 곳에서 안 걸린다. 출처는 타임라인 `round` 이벤트(정예를 못 잡으면 `kills` 에 안 남으므로) |
| `grew` | **`resolveBattle` 뒤** 파티의 `L<레벨 합>/A<능력치 7종 총합>/M<masteryPoints 합>`. `grantXp` 는 `simulate` **다음에** 도는데 전투 결과만 보는 필드는 그 뒤를 못 본다 — 40런에서 레벨업 120회·rng 1,454회가 지문 밖이었다. ⚠ **정수 합만 적는다**(부동소수는 이식자를 ULP 로 고생시킨다) |
| `tactics` | **열린 칸 전체**를 `번호:옵션id:등급:on\|off`. 켜진 것만 적으면 칸에 무엇이 들었는지가 안 남아, 배정이 바뀌어도 둘 다 조건 미달이면 지문이 침묵한다. **등급을 같이 적는 이유도 같다** (2026-09-02) — 값만 다른 같은 가족이라 등급이 빠지면 지문이 안 움직인다 |
| `tl` | 타임라인 전체의 FNV-1a 해시(`JSON.stringify(timeline)`). 위 요약 필드가 못 보는 **순서·값 변화**를 잡는다 — 어디가 깨졌는지는 위 필드들이 말하고 이 값은 「달라졌다」만 말한다. **결과 불변 리팩터의 잠금장치** (2026-09-01) |
| `drops[]` | 아래 |

- 드롭 지문 — `rarity|slot|ilvl|sins|base|baseId|element|개체굴림|스킬|접사` [`baseId` 신설 2026-09-10 — 무기 베이스 세부 굴림 · 풀 없는 무기군/무기 외 부위는 `-`. `스킬` 신설 2026-09-09 — 무기가 담은 액티브 id · 무기 외는 `-`]. **접사는 `출처/stat:v` 를 `;` 로 이어 순서까지 적는다**(출처 신설 2026-09-11 R78 — 층이 바뀐 회귀를 잡는다) — `item.rollAffixes` 가 풀에서 뽑는 순서는 여기서만 잡힌다. `base` 는 무기면 무기군 id, 그 외는 영문 이름(= 베이스 인덱스). 개체 굴림은 무기 `w<watk>` · 방어구 `def_flat:v` · 목걸이/반지 `-`(소비 없음). **`meta.parties` 의 시작 무기도 같은 형식**이다
- **`uid` 는 지문에 없다** — 발급 순서는 `state.js` 소관이라 전투 결정론과 다른 축이다 (§8 항목 3)
- 불일치 보고는 **요약이 맨 앞**이다 (`n/40 런 불일치`). 「1런만 어긋남」과 「40런 전부 어긋남」은 이식 검증에서 원인이 전혀 다른데, 예산을 첫 런이 통째로 먹으면 그 둘을 구분할 수 없다. 런당 최대 2개 × 최대 6런을 보여 준다
- 대조는 기대값 키가 아니라 **키 합집합**을 돈다 — 지문에 필드를 추가하고 재촬영을 잊으면 그 필드가 무기한 미검증으로 남기 때문이다
- **지문을 바꾸는 변경 = 위 계약의 변경**이다. `?golden=write` 로 다시 찍기 전에 이 절과 §5-2 를 먼저 고친다
- **2026-09-10 전면 재촬영 (R72)** — 공격력의 힘·지능 곱 제거 · HP 성장분 × 건강 · 재생의 건강 곱 제거 · 추가 피해 굴림(차지 · 라이트닝 · 체인 라이트닝) · 멀티샷 광역 약화 · 가이디드 애로우 단타 · 듀얼 피해 감소가 한꺼번에 들어간 판이다. 입력 지문(`csvHash` 의 `skill`·`balance`·`combat_stat`·`hero_attribute` · `balance` 의 `skill_decay_cap_pct` 신설)과 40런이 바뀌고, `meta.parties` 는 생성 굴림을 안 건드리므로 **불변이어야 한다**. `tl` 에는 `hit.proc` 이 들어올 수 있다(터진 타격만)
- **2026-09-11 재촬영 (R75)** — 챕터 5스테이지. 입력 지문(`csvHash` 의 `stage`·`stage_round`·`monster`·`balance`·`round_budget` · `balance` 의 `rounds_per_stage` 삭제 · `stages_per_chapter` 4 → 5)과 **런 수 40 → 50**(105 신규 10런)이 바뀐다. **101~104 의 40런과 `meta.parties` 는 재촬영 전 대조에서 한 필드도 안 바뀌었다** — 세트가 같고 해금 목록도 같으며, 104 는 보스가 바뀌었지만 시작 파티가 그 보스 라운드에 닿지 못한다
- **2026-09-11 재촬영 (R77)** — 레어 접미 죄종 판정 제거. 입력 지문(`csvHash.balance` · `balance` 의 `suffix_sin_chance_pct` 삭제)과 **50런 중 7런**이 바뀐다 — 넷은 레어 드롭에 둘째 죄종이 붙은 것이고, 셋은 드롭이 전투 rng 를 같이 쓰기 때문에 **레어가 떨어진 뒤의 수열이 밀려** 전투 지문(소요 · 라운드)이 달라진 것이다. `meta.parties` 는 불변이다(시작 무기는 매직이라 접미를 안 굴린다)
- **2026-09-11 재촬영 (R78)** — 무기 옵션 세 층. 입력 지문(`csvHash` 의 `affix` · `balance` · 신규 `weapon_sin_option` · `weapon_common_option` · `balance` 7키 신설)과 **드롭 지문 형식**(접사 `출처/stat:v`)이 바뀐다. 시작 무기가 고정 1 + 죄종 칸 1 + 통합옵션을 받아 **`meta.parties` 와 런 지문이 함께 바뀌고**, 무기 드롭의 굴림 수가 달라져 그 뒤 수열도 밀린다
- **2026-09-11 재촬영 (R79 후속 — 적 스킬 칸)** — `round` 이벤트의 적 항목에 표시값 다섯(`atk`·`matk`·`atkType`·`stats`·`actives` · §2-6)이 붙어 **50런 전부의 `tl`** 이 바뀐다. **그 밖의 지문은 하나도 안 바뀐다** — 입력 지문(`csvHash`·`balance`·`parties`)도, 런의 결과(처치·골드·드롭·이벤트 수·정예)도 그대로다(JSON 대조 — 차이 경로 50개가 전부 `runs[].tl`). 필드를 더했을 뿐 rng 순서가 안 바뀌었다는 증거다
- **무엇을 보장하지 않는가** — 50런이 지나지 않는 경로는 아무것도 말하지 않는다: 선술집(`rollCandidates`·`tavernReroll` 0회) · **수색**(`searchRoll` 0회 — 스트림 `^ 0x5EA7` 은 골든이 한 번도 안 밟는다. 그물은 `dev/test.js` 의 `search:` 단정뿐이다) · 전술 리롤(`TC.pick` 0회 — `tactics` 는 첫 배정만 본다) · `chapter_boss` 표본 1(스테이지 105 — 보스 단독 1라운드) · `inventory_cap` 넘침 0회 · 마스터리 랭크 > 0 인 영웅 0명 · 세이브 왕복. 목록은 [src/dev/README.md](../../src/dev/README.md)

---

## 6. 재생기 계약 (`ui/battle.js` — 타임라인 소비자)

- 재생기는 **계산하지 않는다.** HP 는 이벤트의 `dhp` / `ahp` 를 그대로 쓴다
- 시각 `t` 까지의 이벤트를 배열 순서로 적용한다. 배속·일시정지·건너뛰기는 재생 속도의 문제
- `round` 이벤트에서 적 유닛을 통째로 다시 만든다 — 그래서 `round` 가 첫 이벤트여야 한다 · **스킬 칸도 그 이벤트의 `actives` 로 채운다** [2026-09-11 · R79 후속] — 적의 `skill` 이벤트는 그 칸에서 찾으므로, 칸이 비면 시전(칸 번쩍임 · 이름 팝업)이 **조용히 사라진다**(옛 판의 `skills: []`)
- 모르는 `e` 는 무시한다. 모르는 유닛 키도 무시한다 (현재는 **조용히** — [부채 #6](DEV_PLAN.md))
- Phase 2 재생기는 위 표의 이벤트만 알면 된다. 연출(모션·팝업·로그 문구)은 재생기의 자유
- **재생기는 12종을 전부 안다** (2026-08-30 — `skill`·`heal`·`buff`·`buffEnd`·`regen` 소비 추가). 스킬 칸의 쿨은 `skill` 이벤트의 `ready` 로만 걷힌다 — 재생기가 쿨을 **계산하지 않는다**

---

## 7. 데이터 계약 — 무엇이 어디서 오는가

`ui/data.js:loadData` 가 fetch 하는 CSV **36개**(`FILES`) [재집계 2026-09-10 — 이 수는 잘 낡는다. 옛 「32개」는 `gather_node`·`log_node`·`hero_unique_candidates` 신설분이 이미 빠져 있었다]: `balance` · `monster` · `stage` · `stage_round` · `round_budget` · `spawn_grade` · `codex_level` · `codex_series` · `weapon_group` · `skill` · **`skill_tag`**(2026-09-01) · `hero_attribute` · `combat_stat` · `chapter` · `mastery_node` · `tactic_slot` · `tactic_option` · **`commission_kind`** · **`commission`** · `affix` · `item_base` · `equip_slot` · `class` · `hero_name` · `hero_trait` · **`mine_node`** · **`hero_tier`**(2026-09-08 · R48) · **`search_story`**(2026-09-09 — 수색 진행 문구. **막의 어휘도 순서도 이 표가 든다**) · **`monster_role`**(2026-09-09 — 역할 → **랭크**. 적의 자리다) · **`formation_template`**(2026-09-09 — 파티 진형의 정원. **첫 행이 기본값**이고 행 순서가 화면 순서다) · **`search_meeting`**·**`search_answer`**(2026-09-09 — 수색 만남 · 답. **`need_sin`(누가 갔나 → 보인다) · `hit_sin`(누굴 만났나 → 먹힌다)** 두 컬럼이 규칙 전부다) · **`gather_node`**·**`log_node`**(2026-09-10 — 채집·벌목 단계 7, `mine_node` 와 같은 모양) · **`hero_unique_candidates`**(2026-09-10 — 유니크 영웅 후보 풀 ⚠임시 · 아직 아무도 안 읽는다) · **`weapon_base`**(2026-09-10 신설 — 무기군별 세부 베이스 7종 이름. **아직 `sword2h`·`axe`·`mace`·`spear`·`bow` 뿐**(뒤의 셋 2026-09-11) · §2-5 · §5-2).
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
7. **`closeRun` 은 재정산하지 않는다** — `resolveBattle` 이 출발 시점에 통째로 정산한다는 전제. **파견·탐험(오프라인 진행형)이 들어오면 이 전제가 깨진다** — 그때 `closeRun` 을 재설계한다 (GAME_DESIGN §3)
8. **올릴 수 없는 세이브 버전은 throw** — 이관 가능한 버전(현재 v2~v8)은 `deserialize` 안에서 올리고, 나머지는 던진다. 조용히 버리지 않는다. 잡는 건 렌더러
9. **`codex_level.csv:cards_to_next` 는 레벨당 증분** — 누적 아님 (2026-08-28 `cards_required` 에서 개명 — 이름이 오해를 부르던 자리다)
10. **`round` 가 라운드의 첫 이벤트** — §2-6 순서 보장
11. **`res` 는 항상 4원소 객체다** — 몬스터도 `{fire, cold, lightning, poison}` 을 든다(2026-08-26 타입 이원성 해소). `strike` 는 다른 모양을 가정하지 않으므로 정적 타입 언어에서도 인터페이스가 하나다
12. **`?tab=` 은 `?dev=` 뒤에** — 렌더러 부팅 순서. `startGame()` 이 탭을 원정으로 되돌린다
13. **스킬 배율·원소 태그·스킬 타격 필드(`flat`·`procChance`·`procMult` — 2026-09-10)는 타격 동안만 유닛 필드에 얹고 원복한다** — `strike` 시그니처는 불변이다. 다단타 도중 예외로 빠져나가면 유닛에 배율이 남으므로, 얹기와 원복은 한 함수(`strikeOnce`) 안에서만 한다
14. **`actives` 가 비면 rng 수열은 스킬 도입 전과 같다** — 만료 처리·발동 선택·회복·버프는 rng 를 쓰지 않고, 기본 공격 경로는 그대로다. 결정론 단정이 이것을 지킨다
15. **`buffs`·`reactions` 는 삽입 순서를 유지하는 맵/배열이다** — `buffEnd` 이벤트 순서 · 도발자 선택(배열 순 첫째) · 파생값 재계산 · 훅 발화가 그 순서를 탄다. JS 객체의 문자열 키 순서에 기대고 있으므로 **이식 언어에서 해시맵을 쓰면 다른 타임라인이 된다**(`stagePool` 과 같은 종류 · 2026-09-01)
16. **배정 단위는 스킬 인스턴스다** — `activesFor` 가 `{id, source}` 를 내고 소비자는 `skill.resolve` 로 정의를 얻는다. 정의를 `defs[id]` 로 직접 찾는 코드를 새로 만들지 않는다 — 변형 노드(`override`)가 오면 그 코드는 전부 우회로가 된다 (2026-09-01)
17. **도발은 타겟 rng 를 소비하지 않는다** — 도발이 켜져 있으면 굴리지 않고 고정한다(§5-2). ⚠ **도발 세부(도발자가 여럿일 때 누구·복귀 조건)는 기획 미확정이지만, rng 소비 0 을 유지하는 안 중에서만 고른다** — 「도발자 중 무작위」를 채택하면 소비 수열이 바뀌어 §5-5 골든 스냅샷을 다시 찍어야 한다 (GAME_DESIGN §10 · battle_design.md §3-1)

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

*마지막 업데이트: 2026-09-11 (**R79 후속 — 관전 적 카드의 스킬 칸** [사용자 지적 · DEV_PLAN 부채 #45] — §2-6 `round` 이벤트의 적 항목에 표시값 다섯(`atk`·`matk`·`atkType`·`stats`·`actives` · rng 0) · §6 재생기가 적의 스킬 칸을 그 `actives` 로 채운다 · §5-5 재촬영(50런의 `tl` 만)) · 2026-09-11 (**무기 옵션 세 층** [사용자 확정 · DEV_PLAN R78] — §2-4 `atk_pct_sum` 에 레벨당 데미지 · `option_fx` 신설 · §2-5 `weaponSinOptions` · `weaponCommonOptions` 주입 · 접사 `src` · 「무기 옵션」 표 · `fine` scale · `rollDrop(…, opts)` 매직찬스 · `legacyWeaponLayers` · §2-6 `fx` · `magicFind` · `monsterType` · 조건부 % · 강타 · 타격 시 창 규칙 · `hit.cb` · §2-11 `def_pct` · `res_elem` · `weaponOnHit` · §2-12 `quiet` · §4 v23 · §5-2 무기 옵션 순서 · §5-5 접사 지문 출처) · 2026-09-11 (**`weapon_base` 에 둔기 · 창 · 활 21행** [사용자 지시] — §2-5 `weaponBases` 행 · item 객체 `baseId` 줄(풀 없는 무기군 = 스태프 · 오브 · 십자가 · 성경 · 석궁 · 확장 둘) · §7 목록의 무기군 나열만 갱신. **계약 무변경** — 베이스 굴림은 원래 풀이 비어도 1회 소비라 rng 순서가 그대로다(§5-2). 같은 시드 2000드롭 대조에서 둔기 · 창 · 활의 `baseId` 칸만 달라졌다. 골든은 `csvHash.weapon_base` · 그 드롭들의 `baseId` · 시작 무기(전사 둔기 · 기사 창)가 움직인다 — ⚠ 재촬영 대기(DEV_PLAN R62)) · 2026-09-11 (**레어는 언제나 죄종 둘** [사용자 확정 · DEV_PLAN R77] — §2-5 `sins` 길이 = 희귀도(매직 1 · 레어 2) · §5-2 `item.build` 접미 판정 1회 삭제 · 시작 무기 행 문구 · §5-5 재촬영 줄) · 2026-09-11 (**챕터 5스테이지** [사용자 지시 · DEV_PLAN R75] — §2-6 주입 `roundTypes` → **`roundSets`** · **`stageRounds` export 신설** · `stagePool` 은 챕터보스 스테이지에서 빈 배열 · §2-7 **SAVE_VERSION 22** · §4 **v21 → v22 이관**(클리어 기록 소급 · rng 0회) · §5-5 골든 범위 101~105 = **50 런** · 해금 목록 `GOLDEN_STAGES.filter` · 재촬영 주) · 2026-09-11 (**`placeFormation` 에 칸 인자 `idx`** [사용자 지시 · DEV_PLAN R76 · SCREEN_DESIGN §4-1 · ADR-0096] — §2-7 표의 행. 주면 **그 칸**이 목적지다(주인이 있으면 그 주인과 맞바꿈 · 같은 랭크 안에서도 · 비었으면 그 랭크 끝 · 정원 밖 칸은 `missing`), 안 주면 옛 동작(랭크 마지막과 맞바꿈) 그대로. 편성 드래그가 칸 번호를 버려 후열을 전열 첫 칸에 끌어도 전열 마지막과 바뀌던 것. **rng 0 · 세이브 스키마 무관 · 골든 무관**(전투는 랭크만 읽는다) · PASS 244/244) · 2026-09-11 (**아이템 이름 — 태그 형식** [사용자 지시 · DEV_PLAN R73] — §2-10 `composeName` 이 D2 식 문장 조립(ko "분노의 Base — 오만" / en "Wrathful Base of Pride")에서 **태그 형식**(ko/en 동형 "[분노][오만] Base" / "[Wrath][Pride] Base")으로 바뀌었다. 시그니처 무변경 — 호출자 셋(`item.js build` 2곳 · `regroupWeapon`) 무수정. **표시 문자열만 바뀐다 — rng·전투 수치·세이브 스키마 무관.** 골든 `dropSig` 가 무기 아닌 부위에서 `it.name.en` 을 베이스 인덱스로 쓰므로(§5-5) **40런 전면 재촬영**(내용은 이름 필드만 달라짐 · PASS 243/243)) · 2026-09-10 (**관전 결과에 `matk`** — `out.party[]` 가 `atk` 옆에 `matk` 을 싣는다. 관전 스킬 칸 설명창의 회복량이 식으로만 찍히던 것(ADR-0089 2단계가 남긴 ⚠). 표시값이라 rng·타임라인·골든 무관 (R72 후속 · 메인)) · 2026-09-10 (**결투 시전자 창을 닫을 때 기존 `buffEnd` 를 낸다** — 라운드 경계에서 닫힌 창이 재생기 칩으로 다음 라운드에도 남던 것. 새 이벤트 종류가 아니다 · rng 0 · 골든 40런에 결투가 없어 지문 불변 (R72 후속 · 메인)) · 2026-09-10 (**R72 후속 — 결투의 시전자 창은 라운드가 바뀌면 닫힌다 · 미리보기 확률은 100 에서 자른다** — §2-6 `duel` 행 · §2-8 미리보기 표) · 2026-09-10 (**능력치 경로 재정리 · 스킬 계수 슬롯 · 스킬 변경 넷** [DEV_PLAN R71 ②③ · R72 · 사용자 승인 D1~D15] — §2-3 `strike` 에 능력치 항 `flat`(배율에 더하지 않고 결과에 더한다) · 추가 피해 `procChance`/`procMult`(치명 뒤 1회 · 반환 `proc`) · §2-4 공격력의 힘·지능 곱 제거 · `hp_max` 성장분 × 건강 · 재생의 건강 곱 제거 · §2-6 `partyUnits[].stats` · 유닛 `stats`/`flat`/`procChance`/`procMult` · `result.party[].stats` · `hit.proc` · 실행 규칙 「스킬 계수」·「추가 피해」·`duel` 행 · 광역 약화 · 회복 `+ flat` · §2-7 `partyUnits` · §2-8 `attributes` 주입 · **`scaleDef` · `previewOf`(parts) export 등재** · 슬롯·추가 피해·감쇠·결투 검증 · §2-11 `enemy_all` 감쇠 · §2-12 `eff` · 소환 `+ flat` · §5-2 `strike` 최대 3회 · §5-5 전면 재촬영 · §8 항목 13) · 2026-09-10 (**무기 베이스 세부 굴림 — `item.baseId` 신설** [사용자 지시] — `weapon_base.csv` 신설(무기군별 7종 이름 · 지금 `sword2h`·`axe` 뿐, 나머지는 미정/미발주). §2-5 주입에 **`weaponBases`** 추가 · item 객체에 **`baseId?`** — 그 무기군에 베이스 풀이 있으면 드롭 때 하나를 굴려 박고 **`name` 도 그 베이스 이름으로 다시 조립**한다(무기군 이름을 덮는다). §5-2 `item.build` 에 **「(무기) 베이스 1회」** 삽입(접사 뒤·개체 굴림 앞 — 풀이 비어도 1회 소비, 스킬 굴림과 같은 이유) — **이 rng 삽입이 전 무기 드롭의 이후 수열을 민다**. `ui/mock.js:itemArt` 가 `baseId` 를 4번째 인자로 받아 **있으면 그 그림을 직접**(옛 uid 해시는 `baseId` 없는 구 개체의 폴백으로 남는다) — 그림과 이름이 어긋나지 않게 됐다(09-10 오전 sword2h 전용 uid 해시 임시조치의 후속). `dev/golden.js:dropSig` 에 `baseId` 필드 추가(`base` 다음 자리) · §5-5 지문 포맷 갱신. §7 CSV **35 → 36**(+`weapon_base`, 재집계 중 `gather_node`·`log_node`·`hero_unique_candidates` 누락도 함께 정정). **세이브 스키마 버전은 안 올린다** — 신규 옵션 필드라 구 개체는 그냥 `undefined`(무기군 이름 그대로, 기존 임시 상태와 동일). ⚠ **골든 40런 전면 재촬영 필요**(무기 드롭마다 소비가 1회씩 늘어 이후 수열이 통째로 갈린다) — 아직 미실행, 다음 단계) · 2026-09-09 (**리포트는 목록이다 — 세이브 v21 · `result.contrib` 신설** [사용자 지시 · R68 · ADR-0063] — §2-6 `result` 에 **`contrib:[{uid, dealt, taken, kills}]`**(파티 전원이 자리를 갖는다 · 반사는 되받은 쪽의 몫 · 처치는 적만 · **소환물 제외** · rng 0회 · 타임라인 밖) · §2-7 `report` 에 `contrib`(v20 이하 이관본은 `null`) + **리포트가 `state.reports` 맨 앞에 쌓인다**(상한 [balance.csv:report_keep]) · §4 제목·스키마 **v21**(`lastReport` → `reports:[]`) + **v20→v21 이관 절 신설**(옛 리포트 하나를 첫 자리로 · `contrib` 은 안 채운다 · rng 0회). **전투 결과 불변 · 골든 `runs`·`parties` 불변** — 움직이는 것은 `report_keep` 키가 는 `meta.balance`·`meta.csvHash` 뿐이다) · 2026-09-09 (**앞열 우선 타겟팅 · 진형이 실물 — 세이브 v20** [사용자 지시 · R67 · battle_design §3-1] — §2-6 유닛이 **`rank`** 를 들고 `battle` 주입에 **`monsterRoles`** 추가 · §2-7 `partyUnits` 가 **`rank`** 를 싣고 **`formationState`·`setFormation`·`placeFormation`·`rankOf` 4종 export 신설** · §4 제목·스키마 **v20** + `formation` 필드 + **v19→v20 이관 절**(옛 세이브는 기본 템플릿으로 새로 만든다 — 화면에만 살던 배치는 복원 불가 · rng 0회) · §5-2 두 `battle.act` 행을 **전열 우선**으로(⚠ **소비 횟수 불변** — 모집단만 좁아진다 · 고른 결과가 달라져 **골든은 재촬영**) · §7 CSV **28 → 30**(`monster_role`·`formation_template`)) · 2026-09-09 (**겹친 스킬도 칸이 둘 — `activesFor` 중복 제거 폐기** [사용자 지시 · R66] — §2-8 의 「같은 id 가 두 출처에서 오면 앞선 출처만 남긴다」를 **뒤집었다**. 걷어내면 화면의 「무기」 칸이 비어 **맨손과 구분되지 않는다**. ⚠ 딸린 규칙을 함께 적었다 — **칸이 둘이면 쿨도 둘**이라(§2-6 이 칸마다 `readyAt` 을 든다) 겹친 스킬은 두 배로 나간다. 세이브·rng 소비 순서는 **안 바뀐다** · 전투 결과가 바뀌므로 골든 재촬영) · 2026-09-09 (**수색 실동작 — 대기 영웅 1명 · 1시간 · 매력/죄종이 결과를 민다 · 진행 중 이야기** [사용자 지시 · DEV_PLAN R65 · ADR-0062] — §2-4 `rollCandidates` 에 **`tiers` 인자**(수색이 매력으로 등급을 미는 자리 · 소비 수 불변) · §2-7 `createGameSystem` 주입에 **`sins`·`searchStories`** + 로드 검증 6종 · export **`searchState`·`searchSend`·`searchTake`·`searchDrop`** · `toggleParty`·`dismiss` 에 **`searching`**(dismiss 는 `equipped` **보다 먼저** 본다) · §3 결과 코드 **5종 신설** · §4 스키마에 **`search`**(**버전을 안 올린다** — 없으면 `null` 이 정확한 초기 상태라 이관이 소급할 판단이 없다) · `counters.search` · §5-1 스트림 **`^ 0x5EA7`** · §5-2 소비 순서(**등급 1 → 후보 10 → 죄종 1 → 막마다 1** · **결과 먼저 이야기 나중** — 이야기를 늘려도 영웅이 안 바뀐다) · §5-3 솔트 · §5-5 「보장하지 않는 것」에 수색 · §7 CSV **27 → 28**(`search_story`). **골든 재촬영 불필요** — 40런은 이 스트림을 한 번도 안 밟고 `rollCandidates` 는 인자 기본값이 옛 동작이다. **PASS 216/216**) · 2026-09-09 (**처치 가루 폐지 — 세이브 v19** [R63 · item_design §5-3 확정 09-09] — §2-6 `result` 에서 **`dust` 삭제** · §2-7 `resolveBattle` 정산 순서를 「골드」로 좁히고 `report` 에서 `dust` 삭제(같은 줄이 v17 에 사라진 「출정 아웃 반영」을 계속 약속하고 있어 함께 정정) · `SAVE_VERSION` **17 → 19**(줄이 v17 에서 멈춰 있었다) · §4 제목·스키마 **v19** + **v18→v19 이관 절 신설**(`lastReport.dust` 만 걷고 **`resources.dust` 는 안 건드린다** — 분해라는 공급원이 살아 있고 소급 회수는 「자리 비워도 안전」을 깬다 · rng 0회) · §5-5 골든 지문 표에서 `dust` 삭제. **전투 결과 불변** — 가루는 굴림도 전투 수치도 안 탄다) · 2026-09-08 (**「출정 아웃」 폐기 — `isOut`·`activeParty`·`returnToTown` 삭제 · 세이브 v17** [사용자 확정 · GAME_DESIGN §9 09-08] — §2 표의 세 export 를 취소선 처리하고 `partyUnits` 주를 정정(언제나 `state.party` 전원) · §3 귀환 룰 주에 아웃 단위(런 안) 명시 · §4 를 **v17** 로(스키마 블록 · `run.downed` 불릿 재작성 · **v16→v17 이관 절 신설** — `run.downed` 와 `lastReport.outTotal` 삭제 · rng 0회). **rng 소비 수열 불변 — 골든 재촬영 불필요**(반복 런이 아닌 곳에서는 나가는 인원이 이미 전원이었다) (DEV_PLAN R54)) · 2026-09-08 (**스킬 툴팁 미리보기 — `skill.previewOf` 신설** [사용자 지시 · SCREEN_DESIGN §4-2] — §2-8 에 `previewOf(def, ctx)` export: `{baseSec, everySec, lossPct, amount}` 를 낸다. `everySec` = 실효 쿨 · `amount` = **공격력 × 스킬 배율**(`formula.strike` 의 첫 줄까지 — 감소·치명은 대상이 정해져야 나오므로 **안 태운다**) · 모르는 입력의 자리는 `null`(화면이 그 조각을 접는다) · 버프는 배율이 없어 `amount` 가 `null`. **rng 소비 0 · 세이브 무관 · 골든 무관.** §2-6 `result.party[]` 에 **`atk`·`atkType` 추가** — 관전 툴팁이 문장의 피해를 조립할 재료다(전투에도 타임라인에도 안 쓰인다). `skill.js` 가 `createFormula` 를 든다(item.js 와 같은 규칙)) · *마지막 업데이트: 2026-09-08 (**전직 칸을 비운다 — `activesFor` 가 최대 둘을 낸다** [사용자 확정 · DEV_PLAN R52] — §2-8 `activesFor(hero, ctx)` 의 세 번째 출처(`advance`)가 **언제나 비어 있다**: 전직 찍기가 없으므로 ~~그 직업 전직 임시분 중 `priority` 최소 하나~~ 를 싣던 임시 채움을 폐기했다. 반환은 **0~2개**이고 `source` 어휘에서 `advance` 는 **당분간 안 나온다**(어휘 자체는 남는다 — 전직 구현 시 되살아난다). **rng 소비 0** — `activesFor` 는 굴리지 않는다. ⚠ **골든 40런 전면 재촬영**(파티 화력이 한 칸 줄어 전투 결과가 바뀐다) · `meta.parties` 는 불변(영웅 생성이 안 바뀐다)) · *마지막 업데이트: 2026-09-08 (**사제 전용 무기 · 직업 마스터리 확장 — 세이브 v16** [DEV_PLAN R46] — §2-5 `regroupWeapon` export 신설(세이브 이관 전용 — 무기군 포인터만 옮긴다) · §2-7 `SAVE_VERSION` **15 → 16** · §4 제목·스키마 v16 + **v15→v16 이관 표**(사제가 낀 스태프·오브만 성경·십자가로 · 가방은 불변 · rng 0회). `weapon_group.csv` **10 → 12행**(성경·십자가 신설 · `staff`·`orb` 의 `classes` 가 `mage|priest` → `mage`) · `skill.csv` **22 → 24행**(무기군 액티브 8 → 10) · `mastery_node.csv` **22 → 38행**(직업 T1 3 → 15 · 직업 T2-3 4). ⚠ **골든 전면 재촬영** — 무기 드롭 풀이 8 → 10 이 되고 사제 시작 무기가 갈렸다) · *마지막 업데이트: 2026-09-08 (**영웅 3층 · HP 재생 밑수 · 세이브 v15 반영** [DEV_PLAN R43·R48] — §2-4 `rollTier` 신설 · `rollAttributes` 시그니처 개정(`{total, shape}`) · `rollHero` 소비 순서 **등급 1 → 총합 1 → 능력치 7 → 고유 1 = 언제나 10회**(~~`rollCaps` 7회~~ 삭제 · 나머지 보정의 rng 도 삭제 — **굴림 결과가 소비 수를 밀면 안 된다**) · `rollCandidates` 를 별도 계약으로 · hero 객체에서 `caps` 삭제 · `tier` 3층 · §4 **세이브 v15 + v14→v15 이관 표** · §5-2 rng 순서 · §5-5 `parties` 지문(`tier` 추가 · 히든 상한 제거). **낡은 수치 정정** — `SAVE_VERSION = 11`(§2-7 이 v11 에서 멈춰 있어 같은 문서 §4 와 자기모순이었다) → **15** · §5-5 `csvHash` **23 → 27종** · §7 CSV **23 → 27개**(`commission_kind`·`commission`·`mine_node`·`hero_tier` 누락)) · *마지막 업데이트: 2026-09-08 (**기본 타겟팅 규칙 확정 — rng 순서 불변** [사용자 확정 · GAME_DESIGN §9 09-08] — 대상 선택이 **양쪽 다 균등 무작위**로 확정돼 §5-2 의 두 `battle.act` 행이 **임시가 아니라 계약**이 됐다: 기본 공격 행에 규칙 명시 · 스킬 행에 **「여러 대상은 대상마다 `strike`」**(적중·치명을 대상마다 따로 굴린다 → 타격 rng 가 대상 수에 종속) · §8 항목 17 신설(**도발은 타겟 rng 0 을 유지하는 안 중에서만 고른다** — 미확정인 도발 세부가 골든 스냅샷을 깨지 않게 하는 가드). **소비 수열 자체는 안 바뀐다 — 골든 재촬영 불필요**) · 2026-09-07 밤 (**얼굴 `null` 소급 — 세이브 v14** — 마법사 초상 추가(`HERO_FACES` mage 0 → 1)로, v12→v13 전면 재굴림이 마법사에게 남긴 `face = null` 간극을 §4 **v13→v14 이관**이 닫는다: `deriveSeed(seed ^ 0xFACE, 2)` 스트림으로 **null 인 영웅만** 재굴림 · 가진 영웅은 rng 소비 0. §5-1 스트림 1행 · §2-4 `rollFace` 호출자에 `upgradeV13` 추가. 「생성 시 1회·불변」은 굴려진 얼굴의 계약이라 null 채우기는 소급이지 덮어쓰기가 아니다. 사용자 지시) · 2026-09-07 (**영웅 초상 직업 분류 · 세이브 v13** [사용자 지시] — 초상 파일명을 `hero_<classId>_<k>.png` 로 갈고 `face` 를 정수에서 **문자열 id** 로 바꿨다. §2-4 주입 `heroFaceMax` → **`heroFaces`{classId: n}** · `rollFace(rng, cls)` 시그니처 개정(풀 0장이면 `null` — 소비는 1회 유지) · `rollStartParty` 얼굴 규칙을 직업 풀 기준으로 · §4 **v13** + v12→v13 이관 블록 신설(전 영웅 전면 재굴림 `deriveSeed(seed ^ 0xFACE, 1)`) · v11→v12 는 버전만 올린다 · §5-1 스트림 1행 추가 · §5-2 `rollStartParty` 2행 갱신. **마법사는 풀 0장 = `null` = 빈 칸** · 골든 지문 불변) · 2026-09-06 (**영웅 초상 = 저장값 · 세이브 v12** [사용자 지시] — 화면이 이름 해시로 매번 계산하던 얼굴을 **태어날 때 1회 굴려 `hero.face` 에 박는 값**으로 바꿨다. §2-4 주입 `heroFaceMax` 신설 · `rollFace` export · `rollStartParty` 가 **맨 마지막에 n회** 굴린다(앞 소비를 안 밀려고) · §4 v12 + v11→v12 이관 절 · §5-1 스트림 `^ 0xFACE` · §5-2 순서 한 줄. **골든 40런과 시작 파티 10 지문 불변** — 전투는 안 바뀐다) · 2026-09-06 (**「부상」·「치료」 어휘 폐기 반영 — 죽은 계약 3곳 삭제** [사용자 확정 · GAME_DESIGN §9 09-06] — §2-7 `toggleParty`·`canDepart` 의 **`injured` err 와 §3 err 표의 `injured` 행을 지웠다**: 2026-09-03 에 검사가 코드에서 사라졌는데(`state.js` 「부상 검사는 없다」) **계약 문서가 세 곳에서 계속 약속하고 있었다**. `resolveBattle` 순서의 「부상 타이머」 → 「출정 아웃 반영(`run.downed`)」 · `isOut`·§4 HP 설명의 어휘 정리) · 2026-09-03 (**치료 타이머 폐기 · 귀환 룰 개정** [R36] — §2-7 `isInjured`/`tickInjuries` → **`isOut(state, uid)`/`returnToTown(state)`/`activeParty(state, stageId)`** · `partyUnits(state, uids?)` 2인자 · **§2-6 `reason` 에서 `retreat` 삭제**(전멸일 때만 돌아온다 — `wipe` 가 패배의 일반형이 됐다) · §4 세이브 **v11**(hero 에서 `injuredUntil` 삭제 · `run.downed` 신설 · v10→v11 이관은 옛 부상자를 전부 나은 것으로 본다) · 리포트에 `party`(참가자)·`outTotal`(출정 누적) · `balance.csv:injury_minutes` 폐기. **골든 40런 재촬영**(귀환 룰이 결과를 바꾼다) · 단정 PASS 182/182) · 2026-09-03 (**액티브 3칸 = 출처 고정(고유 · 무기군 · 전직)** [R35] — §2-8 `activesFor(hero, ctx)` 재작성(칸을 출처가 정한다 · `ctx.weaponGroup` 신설 · 빈 출처는 자리를 안 남긴다 · `source` 어휘에 `weapon_group`·`advance` 실사용) · §2-7 `partyUnits`·`partyMembers` 가 무기군을 넘기고 **`weaponGroupOf(state, hero)` export 신설** · §2-4 `innate` 설명 정정. `skill.csv` 는 22행(전직 임시분 14 — `owner_kind` job → **advance** 명칭 교정 · 무기군 8 신설 ⚠임시 · 고유 풀은 전직 임시분만) · 골든 재촬영) · 2026-09-02 (**전술 옵션 등급 축 — `(option_id, grade)` 복합키** [R33] — §2-9 재작성(가족/등급 두 축 · `families`·`familyIds`·`optionOf`·`GRADES` export · `list`·`byId` 폐기 · 로드 검증 3종 추가 · **가족 수 > 칸 수** · `gradeWeights` 주입 · `weaponGroups` 주입 삭제) · **조건 어휘 8 → 6**(`party_size`·`damage_kind` 폐기 — §5-4 확정의 집행) · §2-7 `tacticState` 의 칸이 등급까지 편 옵션을 든다 · `rerollTactic` 이 `{id, grade}` 를 저장하고 후보 제외는 **가족 단위** · **§4 세이브 v10**(v9 문자열 → `{id, grade:'common'}` · **R28 계획은 v11 로 밀림**) · §5-2 `pick` 이 **rng 2회**(가족 → 등급) · `initialAssign` 은 가족 풀만 섞는다 · §5-3 `GRADES` 배열 순서 등재 · §5-5 골든 `tactics` 지문에 등급) · *마지막 업데이트: 2026-09-11 (**R79 몬스터 구조 개편 · R80 마법 무기 원소** — §1 그래프(battle 이 hero 를 주입받는다) · §2-4 `attack_type` 언제나 physical · §2-5 item 객체 `element` 폐기 · `elements` 주입 퇴역 · `rollGear` 신설 · `rollDrop` 위임(수열 불변) · §2-6 주입 `heroSystem`·`classSkills`·`slots` + 로드 검증 · `makeEnemy(gear)` 전면 개정(computeCombat · 몸값 · 전역 배율 · attack_type 덮기) · 드롭 = 입은 장비 · 적의 소환 벽(처치 아님 · 클리어 제외) · 적의 오오라(라운드 시작 창) · §2-8 `activesFor` 의 `ctx.thirdSkill` · §5-2 `spawnRound` 2단 · `rollGear` · `build` 원소 굴림 삭제 · `onKill` 부위 선택 · `beginRound` 오오라 · §5-5 R79 재촬영 · `csvHash` 27 → 38 정정) · 2026-09-09 (**수색 만남 — 소문 · 질문 · 답** [사용자 지시 · DEV_PLAN R69 · ADR-0068] — §2-7 주입에 **`searchMeetings`·`searchAnswers`** + 로드 검증(만남마다 공통 답 최소 하나) · `searchState` 반환에 **`rumor`·`meetAt`·`meetOpen`·`answers`·`answer`·`discountPct`** · **`searchAnswer(state, answerId, now)` 신설** · `searchTake` 가 `cost` 를 낸다(할인 반영) · §3 결과 코드 **`answered`·`notOpen`** · §4 스키마에 `search.answer`(**버전 안 올림** — 기본값 보정) · §5-1 스트림 **`^ 0x11EE`**(만남 — **결과 스트림과 갈라 두어 `searchRoll` 15회 계약이 그대로다**) · §5-2 한 줄 · §7 CSV **30 → 32**. **골든 재촬영함** — 입력 지문만 바뀌었다(CSV 2종 · balance 3키). **40런 · 시작 파티 지문은 한 글자도 안 바뀌었다**(스트림 분리의 증거) · **PASS 230/230**) · 2026-09-09 (**직업 스킬 풀 37 — 어휘 다섯 축 확장** [R61] — §2-11 등록표(`KINDS` +`aura`·`summon` · `ATTACK_TARGETS` +`enemy_highest_def` · `SUPPORT_TARGETS` +`ally_single`·`party_adjacent` · **`DEBUFF_TARGETS` 신설**(buff 를 적에게 · **음수 값** [사용자 확정]) · `EFFECTS` +7 · `refreshDerived` 키 순서) · §2-12(ctx 에 **`makeSummon`** · `basicAttack`·`targetsOf`·`castSummon` 신설) · §2-6(유닛이 창의 **밑수 다섯**을 든다 · `summon`/`summonOf` · `buffs` 에 `element`·`by` · `until: Infinity` = 오오라) · §5-2(**평타 부여 창이 켜지면 소비가 는다** · `enemy_highest_def` 0회 · **소환은 굴림을 안 쓰지만 대상 모집단을 바꾼다**)) · 2026-09-08 (**마스터리 1랭크 되돌리기** [사용자 지시] — §2 `unlearnMastery(state, uid, nodeId)` 신설(`learnMastery` 의 역방향 · 1랭크 = 1포인트 환급 · 랭크 0 이 되면 키 삭제 · 해금 레벨 미검사) · §3 결과 코드 **`noRank`** 등재. 세이브 스키마·rng 소비 순서는 **안 바뀐다** — 저장된 값은 `heroes[].mastery` 의 숫자 하나가 줄 뿐이라 버전을 올릴 일이 없다) · 2026-09-01 (**스킬 구조 재편 B — 행동 + CSV** — §2-8 `pickReady` 동률 = **칸 순서**(CSV `priority` 는 기본 정렬만) · §2-6 회복 밑수 `matk` 가 버프 괄호를 탄다(`matkBase`) · 쿨 바닥 `CD_MIN_MULT` → `balance.csv:skill_cd_floor_mult`(§5-3 행 삭제) · `skill.csv` 에 `icon`·`desc_kr`·`desc_en`·`innate_pool`·`note`(`def` 필드 4) · **`skill_tag.csv` 신설** — 태그 어휘 SSOT(`tagRows` 주입 · §7 CSV 23) · `SKILL_DISPLAY` 삭제 · §2-4 `skillPool` = `innate_pool=1`) · 2026-09-01 (**스킬 구조 재편 — 계약 먼저** [사용자 지시 · 구현 A 진행 중] — §1 그래프에 `skill_effects.js`·`skill_runtime.js` · **§2-11 등록표** · **§2-12 런타임**(사건 훅 5종 · `reactions`) · §2-6 `simulate` 입력이 **인스턴스** `[{id, source}]` · 유닛 필드 `matkBase`·`reactions`·`actives[].source` · **`makeUnit` 하나** · 실행 규칙 표에 사건 훅 행 · §2-7 `partyMembers` 가 정의를 넘긴다(⚠ id 를 넘겨 `skill_tag` 조건이 0 을 세던 버그) · §2-8 어휘 출처 = 표 · `activesFor → [{id, source}]` · `resolve` 신설 · 검증 강화(종류↔대상 정합) · §2-9 `contextOf` 주의 · §2-4 `skillOrder` 선택 필드 · §5-2 훅 rng 규칙 · §5-3 `CD_MIN_MULT` 위치(B 에서 CSV) · §5-5 `tl` 해시 · §8 항목 15·16) · 2026-09-01 (**레어 고유 스킬 프로토타입 배정** [사용자 지시] — §1 조립 그래프(skill.js 를 먼저 · hero 에 `skillPool` id 목록) · §2-4 `skillPool` 주입 · `rollInnate` 신설 · `rollHero` 가 고유를 굴린다 · hero 객체 `innate` · §2-7 `SAVE_VERSION` 9 · `deserialize` v2~v8 연쇄 · `partyUnits` 1번 = innate · §2-8 `balance.active_slots` 읽음 · `activesFor` = 고유 1 + 직업 채움 + 상한 · **§4 세이브 v9**(v8→v9 이관: 시드 소급 · 전용 솔트) · **전술 리롤 계획 이관은 v9 → v10 으로 밀림** · §5-1 소급 스트림 · §5-2 `rollHero` 에 `rollInnate` 1회 · §5-3 솔트 `0x5C11` · §5-5 `parties` 지문에 고유 스킬 · §8 항목 8 버전 범위) · 2026-09-01 (**⚠ 전술 리롤 재설계 — 계약만 먼저, 구현 전** — §2-7 `tacticState` 반환 개정(칸의 `cost` 삭제 → 판 전체의 `rerollCost`·`lockedCount`·`canReroll` · 칸에 `locked`) · `rerollTactic(state)` 에서 `slotNo` 삭제(열렸고 안 잠긴 칸을 한 번에) · **`toggleTacticLock` 신설**(무료 · rng 안 탐) · §3 결과 코드 **`allLocked`** · §5-2 **전체 리롤의 rng 순회 순서가 계약**(카운터는 1회만 오르고 한 스트림으로 칸 번호 오름차순 연속 뽑기) · §4 **세이브 v8 → v9**(`tactics.locked = []`). 비용 곡선은 기획 미정(tactic_card_design §5-6). 사용자 지시) · 2026-09-01 (**한손 개념 폐지 · 보조 슬롯 폐지** — §2-2 `slots` 부위 7 · `weaponGroups` 에서 `twoHanded` 삭제 · §2-5 item 객체에서 `twoHanded` 삭제 · `watk` 공식에서 양손 배율 삭제(`weapon_atk_base` 로 흡수) · 방어구 implicit 에서 보조 ×1.5 삭제 · §2-5 `canEquip` 인자 3 → 2 · §2-7 `equipSlots` 위치 8 · `equip` 의 `back` 은 0~1개 · §2-9 조건 어휘 9 → 8(`two_hand` 폐지) · §3 결과 코드 `twoHanded` 삭제 · **§4 세이브 v8**(v7→v8 이관 4항) · §5-3 코드 상수에서 보조 배율 삭제 · §7 `SLOTS` 부위 7/위치 8 · §8 항목 6) · 2026-08-31 (**강화 신설 — R25** · §2-5 강화 절 신설(베이스는 파생 · 옵션 값은 박는다 · 재굴림 없음) + item 객체에 `up` · exports 4개(`upgradeMax`·`upgradeCost`·`upgrade`·`effective`) · §2-7 `upgradeState`/`upgradeItem` · `heroCombat` 이 `effective` 를 통과시킨다 · §3 결과 코드 `maxUp` · **§4 세이브 v7**(v6→v7 이관: `items[*].up = 0` · `counters.upgrade = 0`) · §5-1 강화 스트림 `^ 0xF0C3` · §5-2 `item.upgrade` 소비 순서) · 2026-08-31 (**골든 사각지대 메우기** — §5-5 재작성: **입력 지문(`meta`)을 출력(`runs`)보다 먼저 대조한다** · `meta.csvHash`(CSV 22종 원문 해시) · `meta.balance`(**전 키** — 손잡이 5키만 보던 판이 밖의 15+ 키를 통과시켰다) · `meta.parties`(시작 파티 10 — 영웅 생성 + 시작 무기) · 런 지문에 `kills`·`casts`·`elites`·`grew`(정산 **후** 성장) 추가 · `tactics` 를 열린 칸 전체로 · 불일치 요약을 맨 앞에 · 키 **합집합** 순회 · 「보장하지 않는 것」 목록. **§5-2 에 `battle.stagePool` 순서 계약 한 줄**(CSV 행 순서가 아니라 `monster_idx` 오름차순 — 해시맵을 쓰면 다른 게임이 된다)) · 2026-08-31 (**골든 시드 스냅샷** — §5-5 신설: `dev/golden.json` 40런(시드 10 × 스테이지 101~104)이 **Phase 2 가 맞춰야 할 대상**이다. 런 생성 절차 · 지문 필드 · 드롭 지문(접사 stat·값·**순서**까지) · `uid` 비포함 · `meta.knobs` 5키 별도 대조. 지문을 바꾸는 변경은 §5-2 와 이 절을 먼저 고친다) · 2026-08-31 (**M7 mock→CSV 이관** — §7 이식 차단 9항목 → 3항목(`SINS`·`SIN_TRAITS`·`COMMON_TRAITS`) · CSV 16→22(`affix`·`item_base`·`equip_slot`·`class`·`hero_name`·`hero_trait`) · **§2-10 `naming.js` 신설**(`nm`·`eliteName` 이 game_logic 으로) · §2-4/§2-5 출처 열 mock→CSV · §2-7 `equipSlots` 출처 · §1 조립 그래프에 naming · §9 부채 #5 축소. **값 불변** — 캘리브레이션 4행·PASS 135/135 그대로) · 2026-08-30 (**파티 전술 신설** — §2-9 `tactic.js`(조건 어휘 9종 · 무상태 · 첫 배정은 섞기) · §2-7 `tacticState`/`tacticBonus`/`rerollTactic` · `heroCombat` 이 파티원에게만 전술을 넘긴다 · §2-4 `computeCombat` 4번째 인자 · **§4 세이브 v6**(`tactics` · `counters.tactic` · v5→v6 이관) · §3 `locked`·`gold` 에 전술 추가 · §5-2 rng 스트림 `^ 0x7AC7` 2줄) · 2026-08-30 (**기획↔프로토타입 대조** — §2-6 `skill` 이벤트에 `ready` 추가 · `end.reason` 에 **`retreat`**(귀환 룰 · 판정 순서) · §2-4 `grantXp` 레벨 상한 · §2-7 선술집 3함수 재작성(`tavernState` 신설 · `hire` 가 카운터를 안 올린다) · **§4 세이브 v5**(`tavern` · v4→v5 이관) · §6 재생기가 12종을 전부 안다 · §7 `SKILL_DISPLAY` 는 주입 아님 · §9 부채 #3 해소) · 2026-08-28 (CSV 형태 최적화 — §7 CSV 13·표시 헬퍼 · §2-4/§2-5 `damageKind`/`release` · §2-6 드롭 = 처치당 최대 1개·`dropChanceMult` · §2-7 codex 출처 CSV · §2-8 `ownerKind`/`ownerId` · §5-2 드롭 판정 1회 · §8 항목 9 `cards_to_next`) · 2026-08-28 (액티브 스킬 엔진 — §2-8 skill.js 신설 · §2-6 스킬 실행 규칙·유닛 필드·이벤트 5종·result casts · §2-3 effectiveCd · §2-4 atk_pct_sum · §5-2 rng 순서 · §5-3 EPS·초기 readyAt · §7 CSV 9 · §8 항목 13·14) · 2026-08-26 (battle_design §9 개정 반영 — §2-3 전면 재작성 · 성장 곡선/개체 굴림/접사 3분류 · 적중 = 레벨 차 · 저항 상한형 · 세이브 v3 이관 · res 이원성 해소) · 2026-08-26 (최초 작성 — 코드 인벤토리에서 계약 추출)*
