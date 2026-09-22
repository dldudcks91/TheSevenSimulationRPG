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
naming.js(sins, sinWords) ┐               │  naming 이 통째로 item 에 주입된다 (이름 조립 규칙 · 죄종 단어 · 2026-09-19)
hero.js(data, skillPool) ─│────────────────┤  skillPool = skill.list 의 id 목록 — **skill.js 를 먼저 만든다**(시스템 주입이 아니라 데이터 · 2026-09-01)
item.js(data) ───────────┘                │  hero · item · battle 은 **각자 내부에서 createFormula(balance) 를 만든다**
skill.js(balance, rows) ┐                 │  (성장 곡선 growthMult · 피해 감소 곱 · strike 를 시뮬과 같은 함수에서 읽기 위해)
skill_effects.js(순수 표) │                 │  skill.js 가 **어휘**를 · skill_runtime.js 가 **실행**을 같은 표에서 읽는다 — 「종류 하나 = 등록 한 번」 (§2-11 · 2026-09-01)
skill_runtime.js(ctx) ───┤                 │  battle.simulate 가 전투마다 만든다 — 시전·창·배리어·사건 훅. 직격(strike)·도발·전투불능은 battle 이 넘겨 준다 (§2-12)
spawn_rule.js(순수 표) ───┤                 │  battle 이 import 한다 — 스테이지 편성 예외(규칙 함수 + 스테이지 표). 풀과 범위만 바꾸고 굴리지 않는다 (§2-13 · 2026-09-18)
battle.js(data, item, skill, hero) ──────┤  skill.js 는 hero.js 의 `ELEMENTS`(원소 어휘)만 import 한다 — 시스템 주입이 아니다
                                          │  battle 이 **heroSystem 을 주입받는다** [2026-09-11 · R79] — 몬스터도 `computeCombat` 을 지난다(§8-1 「계산이 한 곳」)
construction.js(표 넷) ─────────────────┤  건설 — 건물 · 랭크 · 여는 것 · 연구 표를 검증하고 「무엇이 열렸나」를 센다 · 무상태 · rng 없음 (§2-14 · 2026-09-22)
state.js(deps: hero, item, battle, skill, construction, balance, …) ──┘
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
| `parseCsv(text)` | `string → object[]` | 첫 줄 = 헤더. BOM 제거. 빈 줄 무시. **한 행 = 한 줄**(셀 안 줄바꿈 없음 — 줄바꿈이 필요한 글은 `\n` 두 글자). **숫자로 읽히는 셀은 Number 로 변환**(빈 셀은 빈 문자열). **쉼표가 든 셀은 큰따옴표로 감싼다** — 셀 안의 큰따옴표는 `""` · 따옴표로 **시작하는** 셀만 감싼 셀이다(셀 가운데의 `"` 는 글자 그대로) [개정 2026-09-15 — ~~쉼표/따옴표 이스케이프 없음~~ · 스토리 글이 쉼표를 쓴다]. 이식 엔진의 리더도 같은 문법(RFC 4180 에서 셀 안 줄바꿈만 뺀 것)으로 읽는다 |
| `keyValue(rows)` | `→ {key: value}` | `balance.csv` 전용 (`key,value,description`) |
| `indexBy(rows, col)` | `→ {rows[col]: row}` | 같은 키가 둘이면 뒤가 이긴다 |

### 2-3. `formula.js` — 피해 계산

`createFormula(balance) → { roundPct, pctOption, growthMult, upgradeMult, weaponDamage, armorDefense, mitigation, physicalDefense, resCap, appliedResist, reductionMult, hitChance, strike, indirect, leech, attacksPerSec, effectiveCd }`
입력은 `balance` 하나. 파일에 숫자 리터럴 없음(결정론 상수는 §5-3). 규칙의 출처는 battle_design §9 전부(9-0 ~ 9-6).
**퍼센트는 비율이다** [2026-09-17 · R111 · src/data/README.md 단위 규약] — 5% = `0.05` · 배율 310% = `3.1`. 이 절과 §2-4 ~ §2-12 의 식은 전부 비율로 읽는다(`/100` 없음) · 화면만 찍을 때 100 을 곱한다.

| 함수 | 시그니처 | 계약 |
|---|---|---|
| `growthMult(n)` | `→ ≥1` | `power_growth_per_level ^ (max(1, n) − 1)` — **곱셈 곡선**(§9-0). ~~성장 축의 유일한 곡선~~ → 09-14 최대 HP · 09-15 무기 피해 · **09-16 방어구 고유값**이 차례로 떠나 지금 이 곡선을 타는 것은 **HP flat 접사 · HP 재생 바탕값**뿐이다. `n < 1` 은 1로 막는다 |
| `roundPct(v, fine=false)` | `→ number` | 비율을 **1% 단위**(소수 둘째 자리)로 반올림 — `fine` 이면 0.1% 단위 [신설 2026-09-17 · R111]. 운 계수를 먹인 드롭 보정(§2-4)이 쓴다 |
| `pctOption(v, fine=false)` | `→ ≥0.01 (fine ≥0.001)` | **장비 옵션의 퍼센트 값** — `roundPct` 뒤 **한 칸 아래로 안 내려간다**(옛 정수 규칙의 하한 1 자리 · §2-5 접사 값 규칙) [신설 2026-09-17 · R111] |
| `upgradeMult(up)` | `→ ≥1` | `1 + up × equip_upgrade_base_pct` — **강화 배율**(베이스 능력치 = 무기 피해 양끝 · 방어구 고유값). `item.js` 에 있던 식을 옮겼다 [2026-09-14 · R90] — 무기 피해를 `hero.computeCombat` 도 파생해야 해서 한 곳에 둔다 |
| `weaponDamage(ilvl, group, up=0)` | `→ {min, max}` | **무기 피해 범위** [신설 2026-09-14 · R90 · battle_design §9-1] — **굴림이 아니라 파생**이다. `mid = weapon_atk_base + 구간 단위 누적합(ilvl)` [개정 2026-09-15 · R105 — ~~× growthMult(ilvl)~~] · `w = (group?.variance ?? dmg_variance_pct)/100` · `min = max(1, round(mid × (1 − w) × upgradeMult(up)))` · `max = max(min, round(mid × (1 + w) × upgradeMult(up)))` — **반올림은 곱을 다 한 뒤 한 번 · 표기 = 계산**. 같은 무기군 · 같은 ilvl · 같은 `up` 이면 같은 범위다. 소비자는 `item.weaponDamage`(화면) · `hero.computeCombat`(전투) 둘 |
| `armorDefense(ilvl, slotMult, groupMult=1)` | `→ ≥0` | **방어구 부위 고유 방어력의 바탕값** [신설 2026-09-16 · R108 · item_design §1] — `구간 단위 누적합(ilvl) × slotMult × groupMult`. `slotMult` = `armor_def_slot_{부위}`(갑옷 2.0 · 투구 1.0 · 장갑 0.6 · 신발 0.6) · `groupMult` = **그 부위 갈래의** `armor_group.csv:def_mult` [개정 2026-09-18 — ~~갑옷 칸에만~~ · 네 부위가 모두 갈래를 갖는다] — 갑옷 중갑 1.6 · 경갑 1.0 · 로브 0.5 / 투구 플레이트 1.0 · 가죽 0.4 · 티아라 0.2 / 장갑 건틀릿 1.0 · 가죽 1/3 / 신발 그리브스 1.0 · 가죽 1/3 · 갈래가 없는 시작 칸은 1. 반올림은 부르는 쪽(`item.implicitFor`)이 한다 — ~~개체 편차~~ 는 2026-09-18 네 부위 모두 폐지 |
| `mitigation(D)` | `→ −1~1` | `D / (D + def_curve_k)`. **레벨 인자 없음 — K 는 상수다**(§9-3). `D = 0` 이면 0. 1에 닿지 않는다(면역 없음). **`D < 0` 이면 거울식 `K / (K − D) − 1`** [2026-09-21 · R130 · battle_design §9-3] — 음수 깎임 = 더 받는다(`1 − 깎임율` 이 받는 배수). 0 에서 기울기까지 이어지고 −1 에 닿지 않는다 — **받는 배수는 2 에서 멈춘다**(무한 증폭 없음). 양수 식을 음수에 그대로 쓰면 `D = −K` 에서 0 으로 나눈다. `NaN` 은 0 |
| `physicalDefense(def, defIgnorePct=0)` | `→ 수` | `def > 0` 이면 `max(0, def × (1 − ignore))` — 방어 무시는 **곡선에 넣기 전** 소재값을 깎는다(감쇠율의 %가 아니다) · **무시는 방어를 0 밑으로 끌어내리지 않는다**. **`def ≤ 0` 이면 무시를 안 걸고 그대로 낸다** [2026-09-21 · R130 · battle_design §9-3] — 음수에 걸면 음수가 줄어 공격자의 관통이 방어자를 돕는다. **방어 감소(방어자의 값을 깎는다 — 0 밑까지 간다)와 방어 무시(공격자가 양수 방어를 덜 본다)는 다른 개념이다** |
| `resCap(resMaxBonus=0, elBonus=0)` | `→ %` | `min(res_cap_base + resMaxBonus + elBonus, res_cap_absolute)` — 기본 상한을 뚫는 유일한 수단이 최대 저항 증가, 그 위에 절대 상한. `elBonus` = **그 원소의** 최대 저항 증가(투구 시기 칸 · 2026-09-18) — 화면(세부 옵션 저항 행의 상한)과 `strike` 가 같은 식을 쓴다 |
| `appliedResist(res, resMaxBonus=0, elBonus=0)` | `→ %` | `min(res, resCap(resMaxBonus, elBonus))` — **상한만 있고 하한은 없다.** 음수 저항 = 피해 증폭 (§9-5) |
| `reductionMult(pcts)` | `→ 0~1` | `Π (1 − p)` — 피해 감소는 **원천별 곱**이다(§9-3). 빈 배열은 1. **모듈에서도 따로 내보낸다**(`import { reductionMult } from './formula.js'`) [2026-09-22] — 밸런스 값을 안 읽어 팩토리 밖에 서고, 장비 · 마스터리 합산(`hero.computeCombat`)과 버프 창(§2-11 `dr_pct`)이 이 함수 하나를 쓴다. `createFormula(...).reductionMult` 도 같은 함수다 |
| `hitChance(attackerLevel, defenderLevel, bonus = 0)` | `→ %` | `min(hit_base_pct, clamp(hit_base_pct − max(0, dLvl − aLvl) × hit_per_level_deficit_pct, hit_min_pct, hit_base_pct) + bonus)` — **레벨 차가 정하고 명중률(`bonus` · 궁수 T1-3 · 2026-09-22 R138)이 더한다**(§9-4). 오버레벨 초과 이득 없음 · `bonus` 0 이면 종전과 같다 |
| `strike(rng, a, d)` | `→ {hit, dmg, crit, proc}` | 직격 1회. **rng 소비 순서 = 적중 → (적중 시) 피해 → 치명 → (추가 피해 확률이 있는 타격만) 추가 피해. 최대 4회** — 빗나감 1회 · 확률 0 인 적중(기본 공격 전부) 3회 · 확률 > 0 인 적중 4회 (§5-2) [추가 피해 2026-09-10 · R72 · **피해 굴림 2026-09-14 · R90**] |
| `indirect(amount)` | `→ int` | 비직격(반사·도트·사망 폭발). 적중·스킬 배율·치명·감소를 받지 않고 흡혈·반사·발동 효과를 **유발하지 않는다**. `dmg_min` 하한만 |
| `leech(dmg, pct, recv=0)` | `→ int` | 흡혈 — 직격의 최종 피해에만 비례. `round(dmg × pct × (1 + recv))` — `recv` = 흡혈하는 쪽의 **체력 회복 +%**(방어구 옵션 · §2-6 「체력 회복」) [2026-09-18]. `recv = 0` 이면 종전과 같은 값이다 |
| `attacksPerSec(period)` | `→ 회/초` | 초당 공격속도 `1 / period` (`period ≤ 0` 이면 0). **축이 아니라 표기**다 — 축은 `combat_stat.csv:action_period` 하나고 아이템 툴팁만 역수를 찍는다(주기는 클수록 느려 이름과 방향이 거꾸로 읽힌다 · [SCREEN_DESIGN §6](SCREEN_DESIGN.md) · ADR-0081). **엔진은 이 함수를 쓰지 않는다** — `mitigation`·`resCap` 과 같은 자리(소재값만으로는 못 읽는 값의 변환) |
| `statCoef(v)` | `→ >0` | **능력치 계수** [신설 2026-09-18 · battle_design §9-2] — `(1 + attr_dmg_step_pct) ^ (v − attr_dmg_pivot)`. 기준 능력치에서 1 · 1점마다 복리 · 0 에 닿지 않는다. `v` 가 수가 아니면 1. 평타(메인 스탯 · `hero.computeCombat:main_attr_mult`)와 스킬의 데미지 슬롯(`skill.scaleDef:statMult`)이 같은 함수를 쓴다 |
| `effectiveCd(cd, period)` | `→ 초` | 실효 쿨 `ceil(cd / period) × period` (§6) — 스킬은 행동 주기에 얹혀 나가므로 쿨이 돌아도 다음 차례까지 기다린다. **엔진은 이 함수를 쓰지 않는다**(틱 루프에서 자연히 생긴다) — 화면 표기·검증이 같은 규칙을 읽게 하려는 것 |

**공격자 `a`** — `{atkMin, atkMax, atkType, lvl, crit, critDmg, defIgnore, resReduction, resReductionEl?, skillMult, dmgPct, condPct, statMult, bonusPct, procChance, procMult}` — **`resReductionEl` = 원소별 저항 무시** `{fire, cold, lightning, poison}`(반지 시기 칸 · 비율) [신설 2026-09-21 · item_design §1 「반지 · 목걸이」] — **그 타격 원소의 값만** `resReduction` 에 더한다 · 없으면 0 이고 종전과 같다 · rng 소비 불변. **`atkMin`/`atkMax` = 데미지 범위의 양끝**(버프 괄호까지 탄 실효값 · ~~`atk`~~ R90). 적중하면 그 사이를 **연속 균등으로 한 번** 굴린다 · 양끝이 같아도 굴림을 소비한다(소비 수가 무기에 의존하면 같은 시드가 다른 전투를 낸다) [2026-09-14 · R90] — `procChance`/`procMult` 는 **스킬 타격만** 싣는다(없으면 0 · `battle.strikeOnce` 가 그 타격 동안만 얹는다 · §8 항목 13) — 확률로 터지는 추가 피해의 확률·배수 [2026-09-10 · R72].
**데미지 공식 개정** [2026-09-18 · battle_design §9-1 · §9-2] — `dmgPct` = `atkMin`/`atkMax` 에 **이미 곱해진** 데미지 % 괄호 안의 합(상시 + 도감 「데미지」 + 창 · 없으면 0) · `condPct` = **그 타격의** 조건부 %(무기 옵션 — 없으면 0) — 괄호를 `(1 + dmgPct)` 에서 `(1 + dmgPct + condPct)` 로 바꿔 끼운다(한 괄호의 덧셈) · `statMult` = 능력치 계수(`statCoef` — 없으면 1) · `bonusPct` = **피해량**(도감 「피해량」 — 괄호와 합치지 않고 따로 곱한다 · 없으면 0). ~~`flat`(능력치 항 · 덧셈)~~ 폐기
**방어자 `d`** — `{def, res:{fire,cold,lightning,poison}, resMaxBonus, resMaxEl?, dr, drFlat?, lvl}`
`res` 는 **항상 객체다 — 몬스터도**(§8 항목 11). `dr` 은 호출자가 이미 원천별 곱으로 합쳐 온 **실효 %** 한 숫자다(조건부 받는 피해 감소도 호출자가 그 타격 동안만 한 원천으로 곱해 넣는다 · §2-6).
`resMaxEl` = **원소별 최대 저항 증가** `{fire, cold, lightning, poison}`(투구 시기 칸 · 비율) — 그 타격 원소의 값만 `resMaxBonus` 에 더한다 · `drFlat` = **절대값 피해 감소**(투구 플레이트 공통옵션 · 고정값) — 모든 감소 뒤에 뺀다 [신설 2026-09-18 · item_design §1 「투구 옵션」]. 둘 다 없으면 0 이고 종전과 같다.

```
strike(rng, a, d):
  rng() ≥ hitChance(a.lvl, d.lvl, a.hitBonus)  →  {hit:false, dmg:0, crit:false, proc:false}      ← rng ①  (여기서 끝, 1회 소비)
  atk = a.atkMin + rng()×(a.atkMax − a.atkMin)                                               ← rng ②  피해 굴림 (연속 균등 · 양끝이 같아도 1회 · R90)
  v = atk × (skillMult ?? 1) × (statMult ?? 1)                                            ← 능력치 계수는 곱 (2026-09-18)
  b = 1 + (dmgPct ?? 0);  condPct 가 있고 b > 0 이면 v ×= (b + condPct) / b             ← 조건부 % 는 데미지 % 괄호 안의 덧셈
  v ×= 1 + (bonusPct ?? 0)                                                              ← 피해량 — 따로 곱한다
  crit = rng() < min(a.crit ?? 0, crit_cap_pct);  crit 이면 v ×= critDmg ?? 1    ← rng ③
  (procChance ?? 0) > 0 이면 proc = rng() < min(procChance, 1);  proc 이면 v ×= procMult   ← rng ④ (확률 0 이면 굴리지 않는다)
  physical → v ×= 1 − mitigation(physicalDefense(d.def, a.defIgnore))
  원소     → v ×= 1 − appliedResist((d.res[a.atkType] ?? 0) − (a.resReduction ?? 0) − (a.resReductionEl?.[a.atkType] ?? 0), d.resMaxBonus, d.resMaxEl?.[a.atkType] ?? 0)
  공통     → v ×= 1 − (d.dr ?? 0)
  절대값   → v −= d.drFlat ?? 0                                                       ← 2026-09-18 · 모든 감소 뒤
  →  {hit:true, dmg: max(dmg_min, round(v)), crit, proc}
```

- 저항 감소는 관통이라는 별도 규칙이 아니라 **저항값에 음수를 더하는 것**이다 (§9-5) — 그래서 상한 계산 앞에 들어간다
- **능력치 계수(`statMult`)는 곱이다** [2026-09-18 · battle_design §9-2] — ~~능력치 항(`flat`)은 `데미지 × 배율` 에 더한다(곱이 아니라 합 · 2026-09-10 R72)~~ 폐기. 복리라 능력치가 낮아도 0 이 안 된다. 평타(부여 원소 추가타 · 반격 포함)는 `mainMult` · 스킬 타격은 `scaleDef` 의 `statMult` 를 `strikeOnce` 가 그 타격 동안만 얹는다
- **조건부 %(`condPct`)는 데미지 % 괄호 안의 덧셈이다** [2026-09-18] — `atkMin`/`atkMax` 는 시트와 회복이 읽는 값이라 상시 괄호까지만 곱해 두고, 타격마다 대상이 정하는 조건부 몫은 `strike` 가 같은 괄호에 끼워 넣는다. `dmgPct` 를 안 넘기면(0) `(1 + condPct)` 곱과 같다
- **추가 피해는 치명과 따로 굴려 겹친다** — 둘 다 터지면 곱이고 치명 상한(`crit_cap_pct`)과 무관하다. **직격에만** 붙는다 — `indirect`(반사·도트)는 받지 않는다 [2026-09-10 · R72]
- 옛 `hitChance(acc, eva)` · `defenseAgainst(defender, atkType, ignore)` 는 **삭제됐다**(명중·회피 폐지 · 저항은 곡선을 타지 않는다). ~~옛 `strike` 의 편차 굴림도 없다~~ → **피해 굴림이 돌아왔다** [2026-09-14 · R90] — 옛 편차(`± variance`)가 아니라 **데미지 범위 양끝 사이의 균등 굴림**이고 자리는 적중 뒤 · 치명 앞이다

### 2-4. `hero.js` — 영웅

`export const ELEMENTS = ['fire', 'cold', 'lightning', 'poison']` — `combat_stat.csv:res_*` · `monster.csv:attack_type` · 무기 `element` 가 쓰는 같은 어휘.

`createHeroSystem(data)` — 주입 `data`. 내부에서 `createFormula(balance)` 를 만든다(성장 곡선 `growthMult` · 피해 감소 곱). **HP 구간 누적합 `hpUnitSum` 을 만렙까지 한 번 만든다** — `hero_hp_band_levels` · `hero_hp_band{b}_unit` 이 `hero_level_cap` 까지 덮지 않으면 **생성할 때 던진다** [2026-09-14 · R84].

| 필드 | 형태 | 출처(현재) |
|---|---|---|
| `balance` | `{key: value}` | balance.csv |
| `stats` | `[{id, ko, en, abbr, combatStat, dispatch}]` 기본 능력치 7종, 순서 = 표시 순서. id = `str, agi, int, vit, luck, ldr, cha` (5번째가 `luck` — 08-26 감각→운). **hero.js 는 `id` 만 읽는다** | hero_attribute.csv |
| `sins` | `[sinId]` | ⚠ `ui/mock.js:SINS` 키 |
| `classes` | `[{id, keyAttr, stage}]` (`stage` = `main` / 확장) | class.csv — **CSV 컬럼은 `release`**, 로더가 `stage` 로 주입한다(`stage` 는 스테이지와 충돌하는 이름이라 `weapon_group.csv` 와 같은 어휘를 쓴다). **행 순서 = 표시 순서** |
| `weaponGroups` | `{id: {period, damageKind, variance, …}}` — `variance` = **타격 범위 폭 %**(무기 피해 범위의 양끝 · R90) | weapon_group.csv |
| `armorGroups` | `{slot: {groupId: {id, slot, defMult, aspdPct, cdrPct, classes, …}}}` — **부위 → 갈래** 두 단 [개정 2026-09-18 — ~~`{id: …}` 갑옷군 3갈래~~ · 네 부위가 갈래를 갖고 갈래 id 가 부위마다 겹친다(`leather`)]. `computeCombat` 은 **낀 방어구마다** 제 부위 · 제 갈래의 `aspdPct` · `cdrPct` 를 더한다(지금 값이 있는 것은 갑옷군뿐) | armor_group.csv — `slot` 칸이 부위다 |
| `namePool` | `[{ko,en}]` | hero_name.csv — **행 순서가 결정론에 걸린다**(`drawDistinct` 가 인덱스를 굴린다) |
| `traitPool` | `[{ko,en}]` | hero_trait.csv — 행 순서 동일 |
| `masteryNodes` | `[mastery_node.csv 행]` — 랭크당 값·상한·해금 레벨은 **키 이름만** 들고 `balance` 에서 읽는다 | mastery_node.csv |
| `skillPool` | `[skillId]` — **고유 스킬 풀**. `skill.csv` **행 순서**(`rollInnate` 가 인덱스를 굴린다 — 결정론). 없으면 `[]` | `buildSystems` 가 `skill.list.map(d => d.id)` 로 넘긴다 — **시스템이 아니라 id 목록**이다(hero.js 는 skill.js 를 모른다). 풀 소속은 **`skill.csv:innate_pool`**(0/1)이 정한다 — 지금 14행 전부 1 (skill_design §9-0 · 2026-09-01) |
| `heroTiers` | `[{id, weight, totalMin, totalMax, shape}]` — 등급 표. **행 순서가 굴림 순서다**(§5-2). `weight = 0` 인 행(유니크)은 생성기가 안 뽑는다 [신설 2026-09-08] | `src/data/hero_tier.csv` → `ui/data.js:D.heroTiers`. 이름·색도 같은 표가 든다 — 화면과 로직이 **한 SSOT** 를 본다 |
| `heroFaces` | `{classId: n}` — **직업별 초상 장수**. 영웅이 태어날 때 제 직업 풀에서 `1..n` 을 굴려 `hero.face` 에 **`'<classId>_<k>'` 문자열**로 박는다. **풀이 0장인 직업은 `null`**(초상 없음 = 빈 칸) [개정 2026-09-07 — 정수 하나짜리 구 주입은 폐기됐다] | `ui/mock.js:HERO_FACES`. **로직은 그림을 모른다** — 직업별 장수 객체만 받고 파일 이름은 화면이 만든다(`ui/mock.js:heroFace` → `faces/<스타일>/hero/<classId>_<k>.png`). 값이 바뀌어도 **이미 박힌 얼굴은 안 바뀐다** |

| export | 시그니처 | 계약 |
|---|---|---|
| `rollAttributes(rng, favor, {total, shape})` | `→ {statId: v}` | **합은 등급이 정하고 모양만 굴림** [개정 2026-09-08 — ~~`hero_attr_total` 고정~~ 폐기 · R48]. `shape` 가 분포의 손잡이다 — **작을수록 가중치가 고르게 나서 극값이 드물다**(레어 · 일반 = 정규) · **1.0 = 균등 가중치**(매직 — 2026-09-14) · 1 을 넘으면 균등보다 더 퍼진다 [정정 2026-09-14 — ~~1 에 가까울수록 고르다 = 레어~~ 는 방향이 반대였다 · 09-08 코드 주석 정정이 이 줄까지 안 왔었다]. `favor`(직업 주력 축)가 최고치가 되도록 자리만 바꾼다. **rng 소비는 축 수(7)로 고정** — 나머지 보정이 결정적이라 굴림 결과가 소비 수를 밀지 않는다 |
| `rollTier(rng, forced?)` | `→ tierRow` | `hero_tier.csv` 의 `weight` 비례 1개. ⚠ **소비는 언제나 정확히 1회** — `forced` 로 등급을 지정해도 굴림을 태우고 결과만 버린다. 안 그러면 선술집에서 등급이 섞일 때 같은 시드가 다른 결과를 낸다 (`rollFace` 와 같은 계약) [신설 2026-09-08] |
| `rollHero(rng, {sin, cls, name, trait, tier?})` | `→ hero` | `uid: null` 로 돌려준다 — **uid 발급은 state.js 의 권한**. **소비 순서 = 등급 1 → 총합 1 → 능력치 7 → 고유 1 = 언제나 10회** [개정 2026-09-08 — ~~`rollCaps` 7회~~ 삭제 · §5-2]. `tier` 를 주면 그 등급으로 굳지만 **소비 수는 안 바뀐다**. **`face` 는 `null` 로 나간다** — 박는 것은 `rollStartParty` 다 [2026-09-06] |
| `rollInnate(rng)` | `→ skillId \| null` | `skillPool` 에서 **균등 1개**(rng 1회). 풀이 비면 `null`(소비 0). `rollHero` 가 부른다 |
| `rollStartParty(rng, n)` | `→ hero[]` | 이름·죄종·직업·특성이 n명 사이에서 겹치지 않는다. **등급은 `['rare','magic','normal']` 고정** — 첫 파티 = 레어 1 + 매직 1 + 일반 1 (hero_design §1 개정 2026-09-14 · ~~레어 1 + 매직 2~~ 09-07). n 이 3 을 넘으면 나머지는 굴린다. 직업은 `stage === 'main'` 만. **얼굴은 영웅을 다 만든 뒤 맨 마지막에 n회** — **각자 제 직업 풀에서 1회씩**(풀이 비어도 소비 1회 · 소비 수는 언제나 n). 파티 안 직업이 서로 달라(`drawDistinct`) **얼굴 겹침은 자동으로 회피된다** [개정 2026-09-07] |
| `rollFace(rng, cls)` | `→ '<cls>_<k>' \| null` | 그 직업 풀에서 **균등 1회**. 풀이 0장이면 `null` — 그래도 **rng 소비는 1회**다(직업이 소비 수를 바꾸면 같은 시드가 다른 파티를 낸다). `rollStartParty` 가 부른다 [개정 2026-09-07] |
| `rollCandidates(rng, n, tiers?)` | `→ hero[]` | 선술집 후보 — `rollStartParty` 와 같은 굴림이되 **등급도 굴린다**. 시작 파티만 등급이 지정(레어 1 + 매직 1 + 일반 1)이고 그 차이가 rng 소비를 바꾸지 않는다 [개정 2026-09-08]. `tiers` 를 주면 그 등급으로 굳는다 [신설 2026-09-09] — **수색이 매력으로 등급을 미는 자리**다(`state.searchRoll`). `rollTier` 가 지정이어도 굴림을 태우므로 **소비 수는 지정 여부와 무관하다** |
| `xpNeeded(level)` | `→ int` | `round(hero_xp_base × level ^ hero_xp_exp)` |
| `grantXp(hero, amount, rng)` | `→ {uid, from, to, gains, points}` 또는 `null` | **hero 를 in-place 로 바꾼다**(xp·level·masteryPoints). ~~레벨업마다 축별 `attr_growth_chance_pct` 확률 +1, **`hero_attr_max` 까지**~~ → **기본 능력치(`stats`)는 안 바꾼다** [개정 2026-09-14 · hero_design §4-3 · R83] — `gains` 는 **언제나 `{}`** 이고(필드는 남는다) **rng 를 소비하지 않는다**(인자는 남는다 · §5-2). **마스터리 포인트도 여기서 준다** — `points = 오른 레벨 수 × mastery_point_per_level`, `hero.masteryPoints` 에 in-place 가산. **레벨 상한 `hero_level_cap` 에서 멈추고 `xp = 0` 이 된다** — 상한에 닿은 뒤의 지급은 `null` 을 돌려주고 아무것도 바꾸지 않는다 (⚠ 「50 이후 느린 곡선」은 미반영 — 곡선 숫자는 캘리브레이션 뒤, DEV_PLAN R12) |
| `computeCombat(hero, items, codex={})` | `→ combat` | 순수. 아래 표 |
| `masteryNodes` · `masteryById` | `[node]` · `{nodeId: node}` | 정규화된 노드. `node = {id, treeKind, ownerId, tier, stat, value, maxRank, unlockLevel, gate}` — `gate` = `requires` 를 푼 `{slot, groups}` 또는 `null`(로드 시 갈래 id 를 `weapon_group` · `armor_group` 에 대조해 없으면 던진다) |
| `masteryNodesFor(hero)` | `→ [node]` | 그 영웅의 죄종 트리 + 직업 트리. `ownerId === '*'` 는 그 `treeKind` 전부에 걸린다 |
| `masteryBonus(hero, items = null)` | `→ {flat:{stat:v}, dr:[v]}` | 찍은 랭크 × 랭크당 값. `damage_reduction` 만 따로 — 원천별 곱이라 합치면 안 된다. **`items` 가 켜지 않은 게이트 노드는 뺀다**(직업 T2 · 2026-09-22 R138) — `items` 를 모르면 게이트 노드는 꺼진 것 |
| `gateOn(node, items)` | `→ bool` | 그 노드가 낀 장비로 켜졌나 — `node.gate = {slot: 'weapon'\|'armor', groups:[…]}`(`mastery_node.csv:requires`) · 게이트가 없으면 언제나 `true` |

**hero 객체** — `{uid, name:{ko,en}, tier, sin, cls, trait:{ko,en}, face, innate: skillId, level, xp, mastery:{nodeId:rank}, masteryPoints, stats:{7}, equipped:{position: itemUid 또는 null}}` — `injuredUntil` 은 v11 에서 삭제됐다 (2026-09-03 · 「부상」·「치료」 어휘는 09-06 폐기 — base_expedition_design §1-1)
`innate` 는 **고유 스킬 id** — 생성 시 1회 굴리고 이후 불변(hero_design §1). 액티브 **고유 칸**이 된다(§2-8 `activesFor` · 2026-09-03 부터 칸은 번호가 아니라 출처가 정한다). `skill.csv` 에서 그 행이 지워지면 `activesFor` 가 **빈 고유 칸으로 취급**한다(던지지 않는다).
`skillOrder`(**선택 필드** — 없으면 없는 것) — `[skillId]`, 플레이어가 정한 액티브 칸 순서. 있으면 `activesFor` 가 그 순서를 앞에 둔다(§2-8). 저장은 우선순위 변경 UI 가 생길 때 시작한다 — 기본값이 곧 「없음」이라 이관이 필요 없다 (2026-09-01 자리만).
`tier` 는 `normal` / `magic` / `rare` / `unique` — **4층** [개정 2026-09-14 — `normal` 신설 · R86 · 3층 2026-09-07]. 옛 세이브에는 `normal` 이 없어 이관할 것이 없다(세이브 버전 무변경). SSOT 는 `hero_tier.csv` 이고 등급이 정하는 것은 **능력치 총합 대역과 분포 모양 둘뿐**이다.
~~`caps`(개체별 히든 상한)~~ 는 **v15 에서 삭제됐다** — 상한은 `[balance.csv:hero_attr_max]` 하나로 전 영웅 공통이다 (hero_design §4-3). ~~등급은 출발선이지 천장이 아니다 · 히든으로 남는 것은 성장률뿐이다~~ → **`stats` 는 `rollHero` 가 굴린 뒤로 불변이다** [2026-09-14 · R83] — 레벨업 성장이 폐지돼 `grantXp` 가 더는 쓰지 않는다.
`mastery` 는 **찍은 것만** 담는다(랭크 0 은 키가 없다) · `masteryPoints` 는 남은 포인트. 죄종·직업 마스터리가 **한 풀을 공유**한다 (skill_design §1-4). **로드가 표에 맞춘다**(2026-09-22 R138 · 버전 무변경) — 그 영웅의 트리에 없는 노드 · 상한을 넘은 랭크는 `masteryPoints` 로 돌려준다.

**`computeCombat` 출력** — 필드가 **있거나 없거나**로 표현되는 것이 있다. `attrMult(축, v) = mult_base_pct + v × mult_per_point_pct` — 두 값은 **축마다** `hero_attribute.csv` 가 든다(**비율** · 칸이 비면 `1` · `attr_bonus_per_point` · R111) [개정 2026-09-13 · R82]:

| 필드 | 계약 |
|---|---|
| `atk_physical` **또는** `atk_magic` | **둘 중 하나만 존재.** 무기군 `damageKind === 'magic'` 이면 `atk_magic`, 아니면 `atk_physical`. 맨손 = physical.<br>**값은 범위 `{min, max}` 다** [개정 2026-09-14 · R90]. **무기가 밑수다**(§9-1) — 양끝마다 `round( 밑수 × (1 + atk_pct_sum) )`(`atk_pct_sum` 은 아래 행 — 오만 칸의 레벨당 데미지 · **도감 「데미지」**가 같은 괄호에 든다 · 2026-09-11 R78 · 도감 2026-09-18 — ~~`× (1+codex.atk_pct)` 따로 곱~~) — ~~`attrMult(int 또는 str) ×`~~ **2026-09-10 제거**(R72 · 능력치는 여기 없다 — 전투가 곱한다: 평타 `main_attr_mult` · 스킬 `scaleDef` 의 `statMult` · 2026-09-18 battle_design §9-2), 밑수 = `formula.weaponDamage(ilvl, 무기군, up)` 의 양끝 + 무기 슬롯 **자신의** 접사 atk_flat 합(양끝에 같이 · ~~`watk`~~ R90 삭제)(맨손이면 양끝 모두 `unarmed_atk`). **다른 슬롯의 `atk_flat` 은 더하지 않는다** · ⚠ 2026-09-11 R78 부터 새 무기에는 `atk_flat` 이 안 붙는다(최소/최대 피해 보류) — 옛 무기만 든다 |
| `attack_type` | **언제나 `physical`** [개정 2026-09-11 · R80 · battle_design §2-1 · §9-5] — ~~마법 무기 개체의 `element`(없으면 `ELEMENTS[0]`)~~ 는 폐기됐다. 무기의 원소는 **관련 옵션이 붙었을 때만** 생기고 그 옵션이 아직 없으므로, 원소 없는 마법 무기의 기본 공격은 **물리로 친다**(방어력에 깎인다). ⚠ 바뀌는 것은 **무엇에 깎이나**뿐 — 세기 채널(`atk_magic` = 회복의 밑수)은 그대로다. 평타에 원소를 얹는 것은 **평타 부여 스킬**(인챈트 계열 · 미구현)의 몫이다. ⚠ **몬스터는 이 값을 덮는다** — `monster.csv:attack_type`(스테이지 원소 · monster_design §2)이 이긴다 (§2-6) |
| `level` | 적중률의 공격자 레벨 (§9-4). 감쇠 곡선은 레벨을 쓰지 않는다 |
| `hp_max` | `round( (hpBase + hpUnitSum[level] × attrMult(vit) + Σhp_flat + Σhp_per_level × level) × (1+Σhp_pct) × (1+codex.hp_pct) )` — `hp_per_level` = 투구 오만 「레벨당 체력」(더하기 · 2026-09-18) — **레벨 성장은 10레벨 구간 직선의 누적합이고 그 성장분만 건강을 탄다** [개정 2026-09-14 · R84 · hero_design §4-1]. `hpUnitSum[L] = Σ(n=2..L) hero_hp_band{b}_unit` · `b = floor((n−1) / hero_hp_band_levels) + 1`. ~~`(hero_hp_base × growthMult(level) − hero_hp_base)`~~(R72) · ~~`hero_hp_base × (R^(N+1) − R²)`~~(R82) 폐기 — **HP 는 `power_growth_per_level` 을 읽지 않는다**. 레벨 1 은 누적합이 0 → **바탕이 그대로 드러난다** — 영웅은 전원 같다. **`hpBase` = 입력 `hero.hpBase` · 없으면 `hero_hp_base`** [2026-09-14 · R91] — 영웅은 안 넘기고 **몬스터는 `battle.makeEnemy` 가 `monster_hp_base` 를 넘긴다**(몬스터의 레벨 1 바탕이 영웅과 갈린다 · monster_design §5 · battle_design §8). ⚠ 레벨이 `1 ~ hero_level_cap` 밖이면 **던진다** — 몬스터는 `stage.csv:dlvl` 을 넘기므로 스테이지 레벨이 만렙을 넘으면 안 된다 |
| `defense` | **방어구마다** `round(implicit.v × (1 + 그 아이템의 Σarmor_def_pct))` + Σ`def_flat` 접사 + Σ`def_per_level` × `level`. 비율 축이라 곡선을 타지 않는다. **고정 옵션 「방어력 +%」(`armor_def_pct`)는 그 아이템 자신의 고유 방어력(강화 포함 — 부르는 쪽이 `item.effective` 를 먹여 넘긴다)에만 곱한다** — 다른 부위 · 접사 · 오만 칸의 더하기 값에는 안 곱한다 [2026-09-18 · item_design §1 「갑옷 옵션」 · 네 부위 공통] |
| `res_fire` · `res_cold` · `res_lightning` · `res_poison` | `res_all + res_<원소>` — **직접 비율**(0.25 = 25%), 능력치 계수 없음. 상한은 여기서 걸지 않는다(전투에서 `appliedResist`) |
| `res_max_bonus` · `res_reduction` | Σ 접사. 드롭 접사 풀에 아직 없다(유니크·크래프트·낙인의 자리) — **값 0 이 정상** |
| `res_max_el` | `{fire, cold, lightning, poison}` — **원소별 최대 저항 증가** = Σ`res_max_<원소>` (투구 시기 칸 · 비율) [신설 2026-09-18]. 그 원소의 상한에만 더한다(`res_max_bonus` 는 네 원소 공통). **`combat_stat.csv` 행이 아니다** — 시트는 저항 행의 상한 표기에만 먹인다(impl 대조 단정의 제외 목록). 전투 유닛 `resMaxEl` |
| `res_reduction_el` | `{fire, cold, lightning, poison}` — **원소별 저항 무시** = Σ`res_reduction_<원소>` (반지 시기 칸 · 비율) [신설 2026-09-21 · item_design §1 「반지 · 목걸이」]. **그 원소의 타격에만** `res_reduction` 위에 더한다(`formula.strike` 의 `resReductionEl`). `combat_stat.csv` 행이 아니다(`res_max_el` 과 같은 자리) · 전투 유닛 `resReductionEl` |
| `damage_reduction` | **실효 비율** = `1 − Π(1 − p)`, 소수 5자리(옛 % 소수 3자리와 같은 정밀도 · R111). 원천별 곱(§9-3)을 한 숫자로 낸 것 — 시트에도 이 숫자가 찍히고 `strike` 는 `d.dr` 로 한 번만 곱한다 |
| `def_ignore` · `reflect_damage` · `life_steal` | Σ 접사 |
| `hp_regen` | `(hp_regen_base_per_level × growthMult(level) + Σhp_regen)`, 소수 3자리 — **초당** 회복량. 바탕값은 전 영웅이 갖고(09-07) 가산 출처는 지금 **마스터리뿐**(접사 풀에 없다). ~~`× attrMult(vit)`~~ **2026-09-10 제거**(R72 — 건강은 HP 성장분으로 옮겨갔다). 적용은 `battle.js`(틱마다 누산) |
| `cooldown_reduction` | Σ — 표기 쿨을 줄이는 비율(+ 낀 방어구 갈래의 `cdrPct` — 지금 로브만). 출처는 **마스터리 · 로브 · 티아라 투구 공통옵션**(2026-09-18). 합산은 **더하기**(원천별 곱 여부는 기획 미정 — GAME_DESIGN §10 · 동작은 종전 그대로). 적용은 `battle.js`(시전 시점에 곱) |
| `fhr` | Σ`fhr` — **타격 회복**(물리 경직 시간을 줄인다 · **비율** 0.5 = 50% · R111 단위 규약) [신설 2026-09-17 · R110 · battle_design §2-3]. 출처는 **갑옷 분노 칸**(2026-09-18 — 첫 출처) · ⚠ 상한은 기획 미정. 적용은 `battle.js`(경직 길이 `× max(0, 1 − fhr)` — §2-6 「경직」) |
| `crit_rate` · `crit_damage` | `base_crit_pct` / `base_crit_damage_pct` + Σ 접사. 확률 상한은 `strike` 에서 |
| `action_period` | `(무기군 period 또는 unarmed_period) / attrMult(agi) × (1 − Σaspd_pct − Σaspd_per_level_pct × level − Σ낀 방어구 갈래 aspdPct)`, 하한 0.4 s, 소수 3자리. `aspd_per_level_pct` = 신발 오만 「레벨당 공격 속도」(2026-09-18) · 합산은 더하기 |
| `dmg_bonus_pct` | `codex.dmg_pct` 그대로 — 전투 유닛의 `bonusPct` 가 된다. **피해량**이다 — 데미지 % 괄호와 합치지 않고 따로 곱한다 [2026-09-18 · battle_design §9-2] |
| `main_attr_mult` | **평타 능력치 계수** = `formula.statCoef(stats[직업 메인 스탯])` — 메인 스탯은 `class.csv:key_attr`(hero_design §2) · 직업 · 능력치를 모르면 1 [신설 2026-09-18 · battle_design §9-2]. 전투 유닛 `mainMult`. **몬스터도 같다** — `makeEnemy` 가 `monster.csv` 의 직업 · 기본 능력치로 이 값을 그대로 쓴다 [2026-09-22 사용자 — 보류 해제 · battle_design §9-2]. **`combat_stat.csv` 행이 아니다** — 시트에 안 선다(impl 대조 단정의 제외 목록 · 몬스터 `sheet` 에서도 뺀다) |
| `gold_find` · `item_find` | `roundPct(Σ접사 × attrMult(luck))`(1% 단위 · R111) — **곱이라 접사가 0이면 0**. **운은 전투 계산 밖**이라 이 둘에만 걸린다 |
| `atk_pct_sum` | Σ `atk_pct` **+ Σ`dmg_per_level_pct` × `level` + `codex.atk_pct`**(도감 「데미지」 · 2026-09-18) (**이미 데미지 양끝에 곱해져 있다** — 중복 적용 금지). 오만 칸의 레벨당 데미지는 상시 괄호다 [2026-09-11 · R78 · item_design §1 「무기 옵션」]. 전투 중 스킬 버프가 새 곱셈 층이 아니라 **같은 괄호에 덧셈**으로 들어가야 해서(§9-2) `battle.js` 가 그 괄호를 되짚을 수 있도록 따로 낸다 |
| `option_fx` | **장비 옵션이 여는 조건부 · 타격 시 · 전투 밖 축 한 묶음** [신설 2026-09-11 · R78 · 방어구 축 2026-09-18] — 전부 0 이면 `null`. `{vs:{normal,demon,undead}, vsElite, vsFront, vsBack, ele:{fire,cold,lightning,poison}, defDown, resDown, atkDownPhys, atkDownMag, crush, magicFind, vsDr:{normal,demon,undead}, vsEliteDr, vsFrontDr, vsBackDr, drFlat, counter, recv, xpGain, freezeDur, poisonDur, burnDur, stunDur, buffDur, hitBonus}` — `hitBonus` = Σ`hit_bonus`(**명중률** — 마스터리 전용 채널 · 궁수 T1-3 · 소비자 `formula.hitChance` · 2026-09-22 R138) · **반지 · 목걸이 축** [2026-09-21] `burnDur` · `stunDur` = Σ`burn_dur_reduction` · Σ`stun_dur_reduction`(⚠ **소비자 없음** — 빙결 · 중독과 같다) · `buffDur` = Σ`buff_dur_pct`(**낀 영웅이 거는 버프 창**이 길어진다 — 소비자 `skill_runtime.castBuff` · §2-12) — 각각 Σ 접사(`vs_normal_dmg`·`vs_demon_dmg`·`vs_undead_dmg` · `vs_elite_dmg` · `vs_front_dmg`·`vs_back_dmg` · `<원소>_dmg_pct` · `def_down_pct` · `res_down_pct` · `atk_down_phys_pct`·`atk_down_mag_pct` · `crushing_blow_pct` · **방어구** `vs_normal_dr`·`vs_demon_dr`·`vs_undead_dr` · `vs_elite_dr` · `vs_front_dr`·`vs_back_dr`(**받는** 피해 감소 — 때린 쪽의 종족 · 등급 · 열) · `dr_flat`(절대값 피해 감소) · `counter_chance`(반격 확률) · `hp_recovery_pct`(체력 회복 +%) · `xp_gain_pct`(경험치 획득 — **본인 몫** · 소비자 `state.advanceRun`) · `freeze_dur_reduction`·`poison_dur_reduction`(⚠ **소비자 없음** — 상태이상 기계가 서면 읽는다)) · `magicFind = roundPct(Σmagic_find × attrMult(luck))`. **`combat_stat.csv` 행이 아니다** — 시트에 안 서고(impl 대조 단정의 제외 목록) 소비자는 `battle.js`(+ 경험치만 `state.js`)다 |

**마스터리는 접사와 같은 채널로 합류한다** (skill_design §3 · 2026-08-28) — `computeCombat` 은 접사를 합산한 뒤 `masteryBonus(hero, items)` 의 `flat` 을 **같은 누산기에 더하고** `dr` 을 원천 목록에 밀어 넣는다. 그 아래로는 출처를 구분하지 않는다.

| 규칙 | 내용 |
|---|---|
| 새 곱셈 층 없음 | 노드는 전부 기존 채널에 덧셈이다 (battle_design §9-2 「곱의 층을 늘리지 않는다」). `stat` 은 **접사 채널**(`atk_pct`·`hp_pct`·`aspd_pct`·`res_all` …) 또는 **`combat_stat.csv` id** 여야 한다 — 새 채널을 만들지 않는다 |
| 피해 감소만 예외 | 원천별 곱이라 합치지 않는다 (§9-3). **노드 하나 = 원천 하나** |
| 랭크 상한 | 계산에서 `maxRank` 로 자른다. 상한 초과는 세이브 손상이므로 조용히 잘라 쓰고, 찍을 때 막는 것은 `state.js` 의 일 |
| 트리 소속 | `treeKind === 'sin'` 은 `hero.sin`, `'class'` 는 `hero.cls` 와 맞아야 붙는다. `ownerId === '*'` 는 그 종류 전부(T1 공통 3종) |
| 운 계수 | `gold_find`·`item_find` 는 접사와 **같은 합**에 들어가므로 **운 계수를 함께 받는다** — battle_design §8 의 `전투 능력치 = (장비 + 스킬(마스터리·특화 노드)) × 기본 능력치 계수` 가 그대로다. 마스터리는 **괄호 안**이고 계수는 괄호 전체에 걸린다 |
| 반응형(T3) | **없다.** 전투 중 사건에 붙어 `hero.js` 가 아니라 `battle.js` 의 몫이고 값도 전부 미정이라 `mastery_node.csv` 에 행이 없다 |

로드 시 던지는 것 — `tree_kind` 어휘 밖 · `owner_id` 가 죄종/직업이 아님 · `tier < 1` · `value_key`/`max_rank_key`/`unlock_key` 가 `balance.csv` 에 없음. **키가 없으면 값이 `undefined` 로 조용히 새므로 즉시 던진다.**

**삭제된 출력** — `variance_pct`(폭은 무기군 정의가 든다 — R90 부터 「타격 범위 폭」이고 데미지 양끝에 이미 들어 있다) · `accuracy` · `evasion`(명중·회피 폐지) · `magic_defense`.
전투 계수가 실제로 걸리는 축은 둘뿐이다 [개정 2026-09-10 · R72] — 민첩(행동 주기) · 건강(**레벨 성장분의 최대 HP**). ~~힘(물리 데미지) · 지능(마법 데미지)~~ 은 **스킬 계수**로 옮겨갔고(§2-8 `scaleDef` · battle_design §9-1) ~~건강(HP 재생)~~ 은 계수를 잃었다. 운은 전투 밖(드랍률·골드) · 통솔·매력은 전투 스탯 계수가 없다(스킬 계수는 있다).

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
| `itemBases` | `{part: [{id,ko,en,group,tierMin}]}` 무기 외 부위 베이스 — `id`(= `base_id`)는 **2026-09-17 신설**(개체가 어느 베이스인지 박고 그림도 그 축을 탄다). **`tierMin` 이 굴림 후보를 가른다** [2026-09-18 · item_design §1 「베이스」] — 그 ilvl 에서 열린(`tierMin ≤ ilvl`) 가장 높은 `tierMin` 의 행만 후보다(아래 `rollGear`) | item_base.csv — **부위별 행 순서가 결정론에 걸린다** · 방어구 네 부위 = 시작 1 + 갈래 × 티어 3(갑옷 · 투구 10 · 장갑 · 신발 7) · 목걸이 · 반지 **각 3**(갈래 · 티어 없음 — 2026-09-21 넷째를 뺐다) |
| `armorGroups` | `{slot: {groupId: {defMult, aspdPct, cdrPct, …}}}` — **부위 → 갈래** [개정 2026-09-18 — 네 부위] | armor_group.csv — 고유 방어력의 갈래 계수(`defMult`)를 여기서 읽는다(§2-3 `armorDefense`) |
| `armorSinOptions` | `[{slot, sin, stat, scale, min, max}]` [신설 2026-09-18] | armor_sin_option.csv — **방어구 죄종 칸 후보**(갑옷 · 투구 · 신발). **장갑 행은 없다** — 장갑은 `weaponSinOptions` 를 그대로 읽는다(⚠임시 · item_design §1 「장갑 행 = 무기 행」). 한 부위 · 한 죄종에 행이 여럿이면 그중 하나를 굴린다(탐욕 셋 · 투구 시기 원소 넷). 로드 시 `slot` · `sin` · `scale` · 범위를 검증하고 틀리면 던진다 · **`counter_chance` 의 `max` 는 1 미만**이어야 한다(반격의 반격이 끝나지 않는 판을 막는다 · §2-6). **행 순서가 결정론에 걸린다** |
| `armorCommonOptions` | `[{slot, group, family, stat, scale, min, max}]` [신설 2026-09-18] | armor_common_option.csv — **방어구 공통옵션 후보**. `group` = `all` 또는 그 부위의 갈래 id(투구 갈래별 풀). 같은 검증 · **행 순서가 결정론에 걸린다** |
| `weaponBases` | `{groupId: [{id,ko,en,makeLevel}]}` 무기군별 세부 베이스 풀 [신설 2026-09-10] · `makeLevel` = **제작에서 그 베이스가 나오는 레벨**(`make_level` · 2026-09-21 — 제작만 읽는다 · `weaponBaseAt`) | weapon_base.csv — **아직 일부 무기군뿐**(지금 본편 열 전부 — `mace`·`spear`·`bow` 2026-09-11 · `staff`·`orb`·`crucifix`·`bible`·`crossbow` 2026-09-14 · 확장 둘은 없다). 풀이 있는 무기군만 드롭 때 하나를 굴려 이름·그림을 그 베이스로 좁힌다. 행 순서는 대역 순(item_design §1)이지만 **굴림은 균등** — 대역 경계·A/B/C 축은 미정(DEV_PLAN R62) |
| ~~`affixDefs`~~ | **[퇴역 2026-09-21 · R127]** ~~`[{stat, scale, min, max, perIlvl?, slots?}]` ← affix.csv~~ — 마지막 사용자였던 목걸이 · 반지가 세 층(아래 두 표 + 고정 표)으로 옮겨 **`affix.csv` 를 지웠다**. `rollAffixes` · 접사 수 키 여섯(`affix_normal_*` · `affix_magic_*` · `affix_rare_*`)도 같이 퇴역 | — |
| `accessorySinOptions` | `[{slot, sin, stat, scale, min, max, perIlvl?}]` [신설 2026-09-21 · R127] | accessory_sin_option.csv — **반지 · 목걸이 죄종 칸 후보**. `slot` ∈ `ring` · `amulet` · 한 부위 · 한 죄종에 행이 여럿이면 그중 하나를 굴린다(탐욕 셋 · 반지 시기 다섯 · 목걸이 시기 둘). 로드 시 `slot` · `sin` · `scale` · 범위를 검증하고 **두 부위마다 일곱 죄종이 다 차 있어야 한다**(방어구 표와 같은 이유). **행 순서가 결정론에 걸린다** |
| `accessoryCommonOptions` | `[{family, stat, scale, min, max, perIlvl?}]` [신설 2026-09-21 · R127] | accessory_common_option.csv — **반지 · 목걸이 공통옵션 한 풀**(두 부위가 같은 표를 읽는다 · `slot` 컬럼 없음). `family` 가 종류 — 종류를 먼저 뽑고 변형(행)을 고른다. 같은 검증 · **행 순서가 결정론에 걸린다** |
| `amuletProcs` | `[{baseId, trigger, min, max}]` [신설 2026-09-21 · R127] | amulet_proc.csv — **목걸이 고정 옵션(발동 스킬)** 의 발동 조건 · 값 범위를 **베이스가 정한다**. `trigger` ∈ `hit`(타격 시 · 값 = 확률) · `struck`(피격 시 · 값 = 확률) · `interval`(n초마다 · 값 = **그 스킬 쿨타임의 배수**). 로드 시 **목걸이 베이스(`itemBases.amulet`)마다 한 행**이 있어야 하고 모르는 베이스 · 모르는 `trigger` · 범위 오류는 던진다 |
| `procSkills` | `[skillId]` [신설 2026-09-21 · R127] | `skill.csv:amulet_pool = 1` 인 행 — **목걸이 발동 스킬 후보**(직업을 안 가리는 한 풀). `buildSystems` 가 `skill.list` 에서 만든다 · **행 순서가 결정론에 걸린다** · 비면 `proc.skill` 이 `null` |
| `weaponSinOptions` | `[{sin, appliesTo, stat, scale, min, max}]` [신설 2026-09-11 · R78] | weapon_sin_option.csv — **무기 죄종 칸 후보**. `appliesTo` = `all` · 무기군 `damageKind` · 직업 id(그 무기군의 `classes` 에 있으면) — 시기 칸이 물리 / 마법사 / 사제로 갈리는 자리다. 한 죄종 · 한 무기군에 행이 여럿이면 그중 하나를 굴린다(탐욕 셋 · 시기-사제 둘). 로드 시 `scale` · `appliesTo` · 죄종 id · 범위를 검증하고 틀리면 던진다. **행 순서가 결정론에 걸린다** |
| `weaponCommonOptions` | `[{family, stat, appliesTo, scale, min, max}]` [신설 2026-09-11 · R78] | weapon_common_option.csv — **무기 통합옵션 후보**. `family` 가 종류다 — **종류를 먼저 뽑고 그 안에서 변형(행)을 고른다**. `appliesTo` 는 위와 같은 어휘 · 같은 로드 검증. **행 순서가 결정론에 걸린다** |
| `naming` | `{composeName, wordCount, …}` [개정 2026-09-19 — ~~`composeName` 하나~~] | `game_logic/naming.js:createNaming({sins, sinWords})` — §2-10. item 은 `composeName`(이름 조립) · `wordCount`(단 번호의 폭) 둘을 쓴다 |
| `classSkills` | `{classId: [skillId...]}` **직업별 액티브 후보** (2026-09-09 신설) | `skill.csv` 의 `owner_kind=job` 행을 직업으로 묶은 것 — `ui/data.js` 가 만들어 **hero(`skillPool`)와 item 에 같은 표를 넘긴다**. 두 출처(고유 · 무기)가 한 풀에서 가져가기 때문이다 (skill_design §12-1 규칙 3). **행 순서가 결정론에 걸린다** |

**item 객체** — `{uid, slot(part), rarity, ilvl, up, name:{ko,en}, implicit:{stat,v} 또는 null, affixes:[{stat,v,src}], sins:[sinId], words:[int], group?, skill?, baseId?, proc?, locked?}` — ~~`watk`~~ 는 **v26 에서 삭제**(무기 피해는 박지 않고 파생한다 · R90)
- **`proc` = 목걸이 고정 옵션(발동 스킬)** [신설 2026-09-21 · R127 · 세이브 v33 · item_design §1 「목걸이 고정 옵션」] — **목걸이만** `{trigger, skill, v}` 를 든다. `trigger` = 그 베이스의 발동 조건(`amuletProcs` — `hit` · `struck` · `interval`) · `skill` = 발동 스킬 id(`procSkills` 에서 드롭 때 1회 · 풀이 비면 `null`) · `v` = `hit`/`struck` 이면 **확률**(비율 · 1% 단위) · `interval` 이면 **그 스킬 쿨타임의 배수**(0.01 단위 — 초는 화면이 `cool_sec × v` 로 낸다). **일반 등급에도 붙는다**(고정 옵션). **`affixes` 에 넣지 않는다** — ⚠ **전투는 이 필드를 읽지 않는다**(사용자 지시 2026-09-21 — 설명에만 나온다 · `computeCombat` 이 `affixes` 만 합산하므로 따로 두면 새는 길이 없다). 반지 · 다른 부위는 키가 없다
- **`locked` = 유저가 건 자물쇠** [신설 2026-09-21 · ADR-0185] — 있으면 `true` 뿐이고 **끄면 필드를 지운다.** 드롭이 굴리지 않는다(언제나 없는 채로 태어난다) · `setItemLock` 만 켜고 끈다 · 지금 막는 것은 **분해 하나**다(장착 · 이동 · 강화 · 제작은 그대로). 세이브 버전 무변경(§4)
- `rarity` 는 `normal` / `magic` / `rare` 를 굴린다 [`normal` 신설 2026-09-14 · R86] — 옛 세이브에는 `normal` 이 없어 이관할 것이 없다(세이브 버전 무변경)
- `up` = 강화 단계 `0 … equip_upgrade_max`. **드롭이 굴리지 않는다** — 드롭·시작 장비는 언제나 `0` 이고 `upgrade` 만 올린다 (2026-08-31 신설)
- `group` / `skill` 은 무기만. **`baseId` 는 무기 · 방어구 둘 다다** [방어구 2026-09-17 — 아래 `baseId` 불릿]. ~~`element` 는 **마법 무기군 개체**만~~ → **[폐기 2026-09-11 · R80] 생성 때 원소를 굴리지 않는다** — 새 아이템에 `element` 키가 없고 굴림 1회가 빠졌다(§5-2). **옛 세이브의 값은 죽은 필드로 남는다** — 읽는 곳이 없어져 무해하고 세이브 버전을 올리지 않았다(R77 선례). 원소는 **관련 옵션이 붙었을 때만** 생기고 어느 옵션이 주는지는 미정(GAME_DESIGN §10). ~~`twoHanded`~~ 는 2026-09-01 폐지 — 전 무기가 양손이라 표현할 것이 없다
- **`skill` = 그 무기가 담은 액티브 id** [신설 2026-09-09 · skill_design §12-1 규칙 3] — 드롭 시 그 무기군의 **직업 풀**에서 하나를 굴려 개체에 박는다. ~~무기군이 스킬의 종류를 정한다~~(§2-1)는 폐기됐고, 대신 **「전사류 무기에는 전사류 스킬이 붙는다」**가 계약이다: 같은 도끼라도 개체마다 다른 전사 스킬을 든다. 액티브 2번 칸의 입력이고(`skill.activesFor` 의 `ctx.weaponSkill`), 무기를 바꾸면 그 칸이 통째로 바뀐다. 풀이 비는 무기군(확장 직업)은 `null`
- **`baseId` = 그 무기군의 세부 베이스 id** [신설 2026-09-10 · `weapon_base.csv`] — 드롭 시 그 무기군에 베이스 풀이 있으면 하나를 굴려 박는다. 있으면 **`name` 도 그 베이스 이름으로 다시 조립된다**(무기군 이름을 덮는다) — 화면의 그림도 같은 `baseId` 를 우선해 그 베이스 그림을 보여준다(`ui/mock.js:itemArt`), 그림과 이름이 어긋나지 않는다. 풀이 없는 무기군(확장 둘 — `dagger` · `scythe` · 2026-09-14)은 `undefined` — 무기군 이름 그대로. ⚠ **아직 대역·A/B/C 축을 안 갈라 균등 굴림이다** — 실제 드롭 레벨·성격 가중은 `weapon_base` 의 수치가 발행돼야 한다(DEV_PLAN R62). **방어구도 같은 필드를 쓴다** [2026-09-17] — `item_base.csv` 에서 굴린 베이스의 `base_id` 를 그대로 박는다. **rng 소비는 늘지 않는다** — 베이스는 예전에도 굴리고 있었고 이름만 쓰던 것을 id 로 같이 남기는 것이다. **베이스 풀 = 설치된 그림**이다 [2026-09-21 사용자 확정] — `item_base.csv` 의 전 행이 `ui/mock.js:ITEM_BASE_ART_IDS` 에 있고 그 반대도 참이다(`dev/test.js` 단정). 그림 없는 베이스를 두지 않으므로 **이모지로 떨어지는 새 개체는 없다** · ⚠ **옛 세이브의 개체는 예외** — `baseId` 가 없거나(장신구는 2026-09-17 이전) 지금은 없는 id(`ring_4` · `amulet_4` — 2026-09-21 삭제)를 들면 여전히 부위 이모지다. 이름은 개체에 박혀 있어 표시가 깨지지는 않는다
- 무기의 행동 주기·공격 타입·착용 직업은 아이템에 **박지 않는다** — 매번 `weaponGroups[group]` 에서 읽는다
- `sins` 는 죄종 **태그 목록**이지 포인트가 아니다 — 세트포인트 구조는 폐기됐다(08-26). 스키마는 그대로이고, 태그를 **세는 쪽**이 전술카드 조건이 된다 (tactic_card_design.md)
- **`sins` 의 길이는 희귀도가 정한다 — `normal` 0 · `magic` 1 · `rare` 2** [확정 2026-09-11 · item_design §1 · R77 · `normal` 0 은 2026-09-14 R86] — 레어의 둘째(접미)는 첫째와 다른 죄종이다. ~~레어 접미는 `suffix_sin_chance_pct` 확률~~ 은 폐기(키 퇴역 · §5-2 판정 1회 삭제)
- **`words` = 이름에 쓴 죄종 단어의 단 번호** [신설 2026-09-19 · item_design §1 「이름」 · 세이브 v31] — `sins` 와 **같은 길이 · 같은 순서**이고 값은 `0 … wordCount(sin) − 1`(0 = 첫 단 = 원래 죄종 이름). **rng 를 더 쓰지 않는다** — 그 죄종을 고른 굴림 `r` 의 남은 자리에서 낸다: `floor(frac(r × 후보 수) × wordCount(sin))`(후보 수 = 접두 7 · 접미 6). `r` 이 균등이면 소수부도 균등이고 고른 죄종과 독립이라 **넷 중 균등**이다 — ⚠ 임시(사용자 지시 2026-09-19 · 목표는 레벨 구간 `sin_word.csv:tier_min_ilvl` · 그때도 소비는 0 이다). `name` 은 이 값으로 조립한 **결과**다 — 죄종 단어의 자리는 `words` 와 `naming.sinPhrase` 가 다시 낸다(화면은 이름을 희귀도 한 색으로 찍는다 · SCREEN_DESIGN §6 · ADR-0175). 일반은 `[]`
- **`src` = 접사의 출처** [신설 2026-09-11 · R78 · 세이브 v23] — `fixed`(고정 옵션) · 죄종 id(죄종 칸) · `random`(통합옵션 · 공통옵션). **배열 순서가 곧 표시 순서**다(고정 → 죄종 칸 → 통합 — SCREEN_DESIGN §6 · ADR-0100). **방어구 네 부위도 세 층이다** [2026-09-18 · 세이브 v30] — ~~목걸이 · 반지만 전부 `random`~~ → **목걸이 · 반지도 세 층이다** [2026-09-21 · 세이브 v33] — 반지는 고정이 없어 죄종 칸 → 공통이고, 목걸이의 고정 옵션은 `affixes` 가 아니라 `proc` 에 든다(위 불릿)
- **방어구는 세 층을 정해진 개수로 받는다** [2026-09-18] — 고정 1(`armor_def_pct`) + 죄종 칸(`sins` 마다 1) + 공통옵션(`armor_common_opt_*` 개 · 같은 `family` 는 한 번). 아래 「방어구 옵션」
- **무기는 세 층을 정해진 개수로 받는다** — 고정 1(`atk_pct`) + 죄종 칸(`sins` 마다 1 — `weaponSinOptions`) + 통합옵션(`weapon_common_opt_magic` / `_rare` 개 — `weaponCommonOptions` · 같은 `family` 는 한 번). **무기는 `affixDefs` 를 안 쓴다** — ~~`affix.csv` 에 `weapon` 슬롯이 없고~~(파일째 퇴역 · R127) `atk_flat` 은 퇴역했다 (아래 「무기 옵션」)

**개체 굴림은 없다** [개정 2026-09-18 · item_design §1 「부위 고유 방어력」 — ~~방어구 고유값만 드롭 시 한 번 굴려 개체에 박는다~~]. 방어구 고유값도 **파생값을 박는다** — 개체 사이의 차이는 고정 옵션 「방어력 +%」 한 줄이 든다(무기가 피해 범위를 굴리지 않고 「데미지 +%」에 개체차를 맡긴 것과 같은 모양 · 09-14). **무기 피해는 굴리지 않는다** [개정 2026-09-14 · R90 · battle_design §9-1] — 범위는 무기군 × ilvl × `up` 에서 **파생**하고(`formula.weaponDamage` · `item.weaponDamage`) 직격마다 그 사이를 굴린다(§2-3 `strike`):

| 부위 | 값 | 편차 폭 |
|---|---|---|
| ~~무기 `watk`~~ | **[삭제 2026-09-14 · R90]** ~~`round2( weapon_atk_base × growthMult(ilvl) × (1+ε) )`~~ — 굴림 1회가 빠졌다(§5-2). 무기 피해는 `formula.weaponDamage` 가 파생한다(§2-3) · 폭은 같은 칸(`weapon_group.csv:variance_pct` · 없으면 `balance.csv:dmg_variance_pct`)이 **타격 범위 폭**으로 뜻을 옮겼다 | — |
| 방어구 implicit `def_flat` | `max(1, round( formula.armorDefense(ilvl, armor_def_slot_{부위}, 그 부위 갈래의 def_mult) ))` — 방어는 비율 축이라 **성장 곡선을 타지 않는다**. ~~`× (1+ε)`~~ **2026-09-18 삭제 — 굴림 1회가 빠졌다**(§5-2) · ~~보조 ×1.5~~ 는 슬롯과 함께 폐지 (2026-09-01) | ~~`armor_def_variance_pct`~~ — **퇴역**(키 삭제) |
| 목걸이 · 반지 | implicit 없음 — **rng 소비도 없다** | — |

**접사 값 규칙** (옵션 표 전부 — 정의의 `scale` 이 정한다, item_design §2-1 · ~~`rollAffixes`~~ R127 퇴역). `roll = min + rng()×(max−min)`:

| scale | 값 | 해당 |
|---|---|---|
| `growth` | `max(1, round(roll × growthMult(ilvl)))` — **정수** [개정 2026-09-16 · R107 — 소수 1자리였다] | `hp_flat` (옛 무기의 `atk_flat`) |
| `band` | `max(1, round(roll + ilvl × perIlvl))` — 정수 | `def_flat` |
| `flat` | `formula.pctOption(roll)` — **비율 · 1% 단위**(하한 0.01), **ilvl 무관** [개정 2026-09-17 · R111 — 옛 눈금의 정수 · 하한 1 과 같은 눈금이다] | 나머지 전부 (% · 저항 · 유틸) |
| `fine` | `formula.pctOption(roll, true)` — **비율 · 0.1% 단위**(하한 0.001), **ilvl 무관** [2026-09-11 · R78] · **소수가 남은 유일한 자리** [2026-09-16 · R107 — 1 보다 작은 값이 본질이라 정수로 올리면 만렙 기여가 2~5배. 값 대역은 GAME_DESIGN §10] | **무기 옵션 표에만** — 오만 `dmg_per_level_pct` |

~~같은 stat 은 한 아이템에 두 번 붙지 않는다 — 정의 풀에서 뽑으면 제거한다~~ — `rollAffixes` 의 규칙이었다(R127 퇴역). 세 층 표는 **같은 종류(`family`)를 한 번만** 뽑는다 — 다른 층(죄종 칸 ↔ 공통)에 같은 stat 이 서는 것은 막지 않는다(더하기).

**무기 옵션** (item_design §1 「무기 옵션」 · 2026-09-11 R78) — `build` 가 무기면 `affixes` 를 이렇게 만든다. rng 순서는 §5-2:

| 층 | 규칙 | rng |
|---|---|---|
| 고정 | `{stat:'atk_pct', v: max(1, round(min + rng×(max−min))), src:'fixed'}` — 범위 `[balance.csv:weapon_fixed_atk_pct_min]` ~ `[balance.csv:weapon_fixed_atk_pct_max]` | 1 |
| 죄종 칸 | `sins` 순서대로 — 후보 = `weaponSinOptions` 중 그 죄종 · `appliesTo` 가 맞는 행. 행 1 → 값 1 → `{stat, v, src: 죄종 id}`. **후보가 없어도 2회 소비**하고 칸을 비운다 | 죄종마다 2 |
| 통합 | 개수 = `weapon_common_opt_rare` / `_magic`. 후보 = `appliesTo` 가 맞는 행, 종류 목록 = 그 행들의 `family` 첫 등장 순. 종류 1(뽑은 종류는 목록에서 뺀다) → 변형 1 → 값 1 → `src:'random'`. **종류가 바닥나도 3회 소비** | 개수 × 3 |

`appliesTo` 판정 = `'all'` · 무기군 `damageKind` 와 같다 · 무기군 `classes` 에 든 직업 id — 셋 중 하나면 붙는다.

**방어구 옵션** (item_design §1 「갑옷 옵션」 · 「투구 옵션」 · 죄종 × 부위 매트릭스 · 2026-09-18 사용자 확정 — **네 부위가 같은 틀**) — `build` 가 갑옷 · 투구 · 장갑 · 신발이면 `affixes` 를 이렇게 만든다. 무기와 **같은 세 층 · 같은 소비 모양**이다(§5-2):

| 층 | 규칙 | rng |
|---|---|---|
| 고정 | `{stat:'armor_def_pct', v: pctOption(min + rng×(max−min)), src:'fixed'}` — 범위 `[balance.csv:armor_fixed_def_pct_min]` ~ `[balance.csv:armor_fixed_def_pct_max]`. **그 아이템 자신의 고유 방어력에만 곱한다**(§2-4 `defense`) | 1 |
| 죄종 칸 | `sins` 순서대로 — 후보 = `armorSinOptions` 중 **그 부위 · 그 죄종** 행. **장갑은 `weaponSinOptions` 의 그 죄종 행 전부**(⚠임시 — 장갑에는 무기 갈래가 없어 `appliesTo` 를 보지 않는다: 시기 넷 · 탐욕 셋 중 하나). 행 1 → 값 1 → `{stat, v, src: 죄종 id}`. **후보가 없어도 2회 소비**하고 칸을 비운다 | 죄종마다 2 |
| 공통 | 개수 = `armor_common_opt_normal` / `_magic` / `_rare`(네 부위 공통 키). 후보 = `armorCommonOptions` 중 **그 부위**이고 `group` 이 `all` 이거나 **그 아이템의 갈래**인 행 — **갈래가 없는 시작 칸(클로스 후드 등)은 그 부위의 모든 행**. 종류 목록 = 그 행들의 `family` 첫 등장 순 · 종류 1(뽑은 종류는 뺀다) → 변형 1 → 값 1 → `src:'random'`. **종류가 바닥나도 3회 소비** | 개수 × 3 |

- **장갑 공통옵션은 옛 `affix.csv` 장갑 풀을 옮긴 것**이다(⚠임시 · 기획 미정 — 한 stat 이 한 종류) · 투구는 갈래별 풀(플레이트 원소 저항 · 절대값 피해 감소 / 가죽 공격 속도 · 치명타 확률 / 티아라 쿨타임 감소 / 공통 경험치) — ⚠ 티아라 「데미지 +%」는 기획 재논의라 풀에 없다 · 신발 빙결 · 중독 시간 감소는 **효과가 없는 채** 풀에 있다(상태이상 기계 대기)
- 같은 stat 이 죄종 칸과 공통옵션에 함께 설 수 있다(item_design §1 「겹치는 네 행」) — 합산은 그대로 더하기다

**반지 · 목걸이 옵션** (item_design §1 「반지 · 목걸이」 · 2026-09-21 사용자 확정 · R127) — `build` 가 반지 · 목걸이면 이렇게 만든다. 방어구와 **같은 소비 모양**이고 고정 층만 다르다(§5-2):

| 층 | 규칙 | rng |
|---|---|---|
| 고정 | **목걸이만** — `proc = {trigger, skill, v}`. `trigger` = 그 `baseId` 의 `amuletProcs` 행(베이스가 정한다 · rng 0) · 스킬 1 = `procSkills` 에서 균등 · 값 1 = `min + rng×(max−min)` 을 `pctOption`(1% · 0.01 단위)으로. **베이스에 행이 없거나 풀이 비어도 2회 소비**한다(`proc` 은 행이 없으면 안 붙고 · 풀이 비면 `skill: null`). **`affixes` 에 안 넣는다** — 반지는 이 층이 없다(0회) | 목걸이 2 · 반지 0 |
| 죄종 칸 | `sins` 순서대로 — 후보 = `accessorySinOptions` 중 **그 부위 · 그 죄종** 행. 행 1 → 값 1 → `{stat, v, src: 죄종 id}`. 후보가 없어도 2회 소비 | 죄종마다 2 |
| 공통 | 개수 = `accessory_common_opt_normal` / `_magic` / `_rare`. 후보 = `accessoryCommonOptions` 전부(두 부위 한 풀). 종류 1(뽑은 종류는 뺀다) → 변형 1 → 값 1 → `src:'random'`. 종류가 바닥나도 3회 소비 | 개수 × 3 |

- **반지 시기 칸은 다섯 행 균등이다** — 방어력 무시 1 + 원소별 저항 무시 4(`res_reduction_<원소>`). 다른 죄종 칸과 같은 「행 중 하나」 규칙이라 새 규칙이 없다 [사용자 2026-09-21]
- **목걸이 시기 칸은 파티 디버프 둘**(`def_down_pct` · `res_down_pct`) — 무기 공통옵션과 같은 stat 이라 **같은 타격 시 창 규칙**을 탄다(`skill_effects.weaponOnHit` — 공격자의 `option_fx` 합을 읽고 어느 부위에서 왔는지 · 무기 `damageKind` 를 안 본다)
- **상태이상 시간 감소 넷은 효과가 없다**(빙결 · 중독은 신발과 같다 · 화상 · 스턴은 새 stat) — 상태이상 기계가 서면 읽는다
- **발동 스킬은 전투가 읽지 않는다** — `proc` 을 떼어 내도 `computeCombat` · 전투 타임라인이 같다(단정)

**강화** (item_design §7-2 — R25 · **개정 2026-09-15 R95**). 골드를 먹고 `up` 을 1 올린다. **올리는 것은 베이스 능력치 하나다**:

| 갈래 | 규칙 | 저장 |
|---|---|---|
| 베이스 능력치 | 무기 피해 양끝(`formula.weaponDamage` 가 `up` 을 받는다 · R90) · 방어구 implicit `def_flat` 에 `× formula.upgradeMult(up)` = `1 + up × equip_upgrade_base_pct/100` | **파생** — 원값은 안 건드린다 · 무기는 원값 자체가 없다(R90) |
| ~~옵션(접사) 값~~ | **[퇴역 2026-09-15 · R95]** ~~3·6·9강마다 보유 접사 중 랜덤 1개의 값을 올린다(`equip_upgrade_option_interval` · `equip_upgrade_option_pct`)~~ — 옵션 계단과 두 키가 사라졌다(옵션 쪽 성장은 크래프트 — item_design §7-3). **옛 규칙으로 이미 오른 값은 그대로 남는다** — 박힌 값이라 되돌릴 근거가 세이브에 없고, 되돌리면 이관이 장비를 약하게 만든다 | — |

- **강화는 파생만 한다** [2026-09-15 · R95] — `up` 하나가 베이스 배율을 정하고 아이템에 새로 박히는 값이 없다. **rng 를 쓰지 않는다** — ~~랜덤한 것은 박고, 결정적인 것은 파생한다~~ 의 「랜덤한 것」(접사 선택)이 없어졌다. 파생이라 단계마다 반올림이 쌓이지 않고 드롭 시 굴린 **개체값이 그대로 보존**된다(§2-5 개체 굴림) · **무기 피해가 그 극단이다** [2026-09-14 · R90] — 박을 개체값이 아예 없어 무기군 · ilvl · `up` 셋으로 언제든 다시 계산된다
- **재굴림은 없다** — 접사의 **종류·개수·순서·값**을 강화가 절대 안 바꾼다 (item_design §7-2)
- ~~값 상승은 그 접사의 `scale` 이 정한 반올림을 따르고 최소 한 칸은 반드시 오른다~~ — R95 퇴역(옵션 계단과 함께)
- **목걸이 · 반지는 강화하지 않는다** [2026-09-15 · R95 · item_design §7-2] — ~~베이스가 없는 부위도 강화된다 — 옵션 갈래만 받는다~~. 베이스 능력치가 없는 부위 = 무기 외에 고유값을 안 굴리는 두 부위(`item.js:baseless` — `implicitFor` 와 같은 판정). `upgradeable` 이 `false` · `upgradeCost` 가 `null` · `upgradeItem` 이 `noBase`. **옛 세이브에서 이미 오른 `up` 은 그대로 둔다** — 파생할 베이스가 없어 전투 수치에 닿지 않는다(`effective` 가 원본을 돌려준다). 세이브 버전 무변경
- **실패는 없다** — 기획에 없는 규칙은 만들지 않는다. ~~제련소(파견처)의 「성공률/품질」 계수~~ — 운 배치가 무엇을 미는지는 R95 로 대상이 사라져 미정이다(GAME_DESIGN §10 「제작의 남은 설계」)

| export | 시그니처 | 계약 |
|---|---|---|
| `rollDrop(rng, ilvl, opts?)` | `→ item` | 부위 균등 → 베이스 → 희귀도(가중치 — `normal` → `magic` → `rare` 순으로 훑는다 · R86) → `build`(§5-2 순서). `up = 0`. **`opts.magicFind`**(파티 평균 · 비율)가 있으면 **레어 가중치 × (1 + magicFind)** — 굴림 수 불변 · 없거나 0 이면 종전과 같다 [2026-09-11 · R78] |
| `rollGear(rng, opts)` | `→ [item]` | **한 벌** [신설 2026-09-11 · R79]. `opts = {slots:[partId], ilvl, magicFind?, rareBonusPct?, weaponGroup?, itemBase?, weaponBase?, rarityWeights?}`. `slots` **배열 순서대로** 부위마다 하나씩 만든다 — 베이스 → 희귀도 → `build`(§5-2). **무기 외 베이스는 티어가 정한 후보에서 균등 1회** [2026-09-18 · item_design §1 「베이스」] — 후보 = `tierMin ≤ ilvl` 인 행 중 **`tierMin` 이 가장 높은 것들**(방어구 = 그 티어의 갈래 셋 · 둘 · 시작 칸은 ilvl 이 첫 티어 아래일 때만 · 목걸이 · 반지는 전부 `tierMin` 1 이라 전 행). 소비 수는 1회 그대로다. `weaponGroup` 을 주면 무기 베이스를 **굴리지 않고** 그 무기군으로 고정한다(몬스터가 제 무기군을 든다). **`itemBase`** 를 주면 무기 외 베이스를 **굴리지 않고** 그 id(`itemBases` 의 `id`)로 고정한다 — **제작**이 고른 종류를 넘기는 자리다 [신설 2026-09-21] · 후보 밖 id 인지는 부르는 쪽이 본다(`state.makeItem` 이 `basesAt` 으로 막는다) · 없는 id 면 던진다. **`weaponBase`** 를 주면 무기 **세부 베이스**를 그 id 로 고정한다 — `build` 의 베이스 굴림 1회는 **그대로 소비**하고 값만 버린다(제작이 레벨의 베이스를 넘긴다 · 2026-09-21). `rareBonusPct` 는 `magicFind` 와 **같은 채널**로 레어 가중치에 더해 곱한다(`spawn_grade.csv:gear_rare_bonus_pct` — 등급이 희귀도를 미는 자리 · item_design §1 4단계). **`rarityWeights`** `{normal, magic, rare}` 를 주면 희귀도를 그 가중치로 굴린다 — **제작**이 제 가중치(`make_rarity_w_*`)를 넘기는 자리다 [신설 2026-09-15 · R96] · 안 주면 드롭 가중치(`rarity_w_*`) · **굴림 수 불변**. `up = 0` |
| `basesAt(slot, ilvl)` | `→ [{id, ko, en, group}]` | **그 부위 · 그 ilvl 에서 `rollGear` 가 베이스를 굴리는 후보** [신설 2026-09-21 · 제작의 종류 목록] — 무기 = 드롭 무기군(`release = main` · `{id, ko, en}` — `id` 는 무기군 id) · 무기 외 = 위 티어 후보(`{id, ko, en, group}` — 시작 칸은 `group` 이 `null`). **순서는 굴림이 인덱스를 쓰는 순서 그대로**(CSV 행 순서). rng 0 · 새 배열 |
| `weaponBaseAt(groupId, level)` | `→ {id, ko, en}` / `null` | **그 무기군에서 그 제작 레벨에 나오는 세부 베이스** [신설 2026-09-21 · item_design §7-1] — `makeLevel ≤ level` 인 행 중 `makeLevel` 이 가장 높은 하나. 없으면 `null`. rng 0 · 새 객체. ⚠ 제작만 읽는다 — 드롭(`build`)은 여전히 무기군 안에서 균등 굴림 |
| `startingWeapon(rng, cls, avoidSkill?)` | `→ item` | ilvl 1 · **normal** [개정 2026-09-14 · ~~magic~~ · R86] · 그 직업의 스킬이 붙는 무기군(본편만). **`avoidSkill`(그 영웅의 고유 스킬)을 스킬 풀에서 뺀다** — 한 스킬이 액티브 두 칸에 서지 않게. 빼도 **소비는 1회 그대로**이고 빼서 풀이 비면 원래 풀에서 굴린다. `up = 0` |
| `startingArmor(rng)` | `→ item` | **신설 2026-09-14 · R86** — ilvl 1 · **normal** · 갑옷 베이스 1회(티어 후보 — ilvl 1 이면 **클로스 아머 하나**뿐이다 · 2026-09-18) → `build`. ⚠ **직업 맞춤 없음**. `up = 0` |
| `canEquip(hero, item)` | `→ null` / `class` | 무기 = 직업 전속 무기군 검사. **능력치 게이트 없음**. 2026-09-01 — 인자 3 → 2, 거절 사유 `twoHanded` 폐지(보조 슬롯 삭제) |
| `groupOf(item)` | `→ 무기군 정의 또는 null` | |
| `groupsFor(cls)` | `→ 무기군 정의[]` | 본편(`stage === 'main'`) 무기군만 |
| `salvageDust(item)` | `→ int` | 희귀도별. **`normal` 은 기획 보류**(2026-09-14 사용자) — 키를 발행하지 않아 `magic` 값을 따른다. **강화 단계는 반환량에 안 들어간다** (기획 없음) |
| `upgradeMax()` | `→ int` | `equip_upgrade_max` — **CSV 기본 상한**이다. 세이브의 상한은 `game.limitsOf(state).upgrade` 가 답한다 [2026-09-22] |
| `upgradeable(item)` | `→ bool` | **베이스 능력치가 있는 부위인가** [신설 2026-09-15 · R95] — 목걸이 · 반지면 `false`(강화 없음 · item_design §7-2). **부위만 본다** — `up` · 희귀도는 안 본다 |
| `upgradeCost(item, max?)` | `→ int 또는 null` | 다음 한 단계의 골드. 상한이거나 **`upgradeable` 이 아니면** `null` [R95]. `round(base × growth^up)`. **`max`** = 그 세이브의 강화 상한 — 게임(`state.upgradeState` · `upgradeItem`)은 `limitsOf(state).upgrade` 를 넘긴다 · 안 주면 `equip_upgrade_max` [2026-09-22 · 상한은 한 곳이 답한다] |
| `upgrade(item)` | `→ {up}` | **in-place** · `up` 을 1 올린다. **rng 를 안 쓰고 접사를 안 건드린다** [개정 2026-09-15 · R95 — ~~`upgrade(rng, item)` → `{up, affix}`~~ · 옵션 계단 퇴역]. 상한 · 부위 검사는 호출자(`state.upgradeItem`)가 한다 |
| `effective(item)` | `→ item` | **방어구 고유값**에 강화 배율을 먹인 **읽기용 사본**. `up === 0` 이거나 고유값이 없으면(**무기** · 목걸이 · 반지) **원본을 그대로** 돌려준다(할당 없음) — 무기 피해는 사본에 안 싣고 `weaponDamage` 가 `up` 을 받아 따로 낸다(R90) |
| `weaponDamage(item)` | `→ {min, max} \| null` | **무기 피해 범위** [신설 2026-09-14 · R90] = `formula.weaponDamage(item.ilvl, weaponGroups[item.group], item.up)` — **강화까지 든 값**이다. 무기가 아니면 `null`. 화면(툴팁 · 비교)이 부른다 — 전투는 `hero.computeCombat` 이 같은 formula 함수를 직접 부른다 |
| `weaponDamageFixed(item)` | `→ {min, max} \| null` | **고정 옵션 「데미지 +%」를 먹인 무기 피해 범위** [신설 2026-09-23 · 사용자 지시] — `weaponDamage(item)` 양끝마다 `× (1 + Σ src:'fixed' 인 atk_pct)` 하고 **양끝마다 한 번 반올림**(`hero.computeCombat` 의 괄호 곱과 같은 규칙). **다른 % 는 안 든다** — 죄종 칸 · 랜덤 · 마스터리 · 도감 · 레벨당 데미지는 영웅이 정하는 괄호 합이라 캐릭터 시트가 든다. 고정 줄이 없으면(옛 무기) `weaponDamage` 와 같다. 무기가 아니면 `null`. 아이템 툴팁 메인 옵션 · 제련소 강화 칸이 부른다 |
| `implicitFixed(item)` | `→ {stat, v} \| null` | **고정 옵션 「방어력 +%」를 먹인 방어구 고유값** [신설 2026-09-23 · 사용자 지시] — `effective(item).implicit.v × (1 + Σ armor_def_pct)` 를 **한 번 반올림**. 강화 배율까지 든다. 판정 · 반올림은 `hero.computeCombat` 이 아이템마다 하는 곱과 같다(그 아이템의 `armor_def_pct` 를 출처와 무관하게 더한다 — 이 stat 은 고정 줄에만 선다). 고유값이 없으면(무기 · 목걸이 · 반지) `null`. 아이템 툴팁 메인 옵션 · 제련소 강화 칸이 부른다 |
### 2-6. `battle.js` — 헤드리스 전투

`createBattleSystem(data)` — 주입 `data`: `balance, monsters(byId), stages(byId), roundSets {round_set: [{round_num, round_type}]}, budgets(byKey), grades(byKey), sins, sinTraits {sin: trait}, commonTraits [trait], itemSystem, skillSystem, heroSystem, classSkills {classId: [skillId]}, slots [partId]`.
**`heroSystem` · `classSkills`** [신설 2026-09-11 · R79] — 몬스터가 **영웅과 같은 경로로 전투 능력치를 얻는다**(§8-1 「계산이 한 곳」 · monster_design §5-1): `heroSystem.computeCombat` 을 몬스터에도 부르므로 시스템째 주입받는다. `classSkills` 는 보스 셋째 스킬 칸의 후보 풀이다(직업 → 스킬 id 목록 — `item` · `hero` 에 넘기는 **같은 표**). 없으면 셋째 칸이 비고 굴림은 그대로 1회 돈다. `slots` 는 `monster.csv:wear_slots` 어휘다. **생성 시 검사하고 틀리면 throw 한다** — `heroSystem` 부재 · 몬스터마다 `cls`(직업 풀에 있나) · `weapon_group`(`itemSystem.groupOf`) · `innate_skill`(`-` 또는 `skill.defs`) · `wear_slots`(`weapon` 포함 · 부위 어휘) · 등급마다 `skill_slots ≥ 1`. `roundSets` 검사와 같은 이유다 — 오타가 조용히 새면 전투 도중에 터지거나 칸이 조용히 빈다.
**`roundSets`** [개정 2026-09-11 — ~~`roundTypes [{round_num, round_type}]`~~ 전역 한 벌 · R75] = `stage_round.csv` 를 **세트(`round_set`)별로 묶어 `round_num` 순으로 정렬**한 것. 스테이지가 `stage.csv:round_set` 으로 하나를 고른다 — 라운드 수는 **그 세트의 행 수**이고 전역 키(~~`balance.csv:rounds_per_stage`~~)는 없다. 생성 시 **모든 스테이지의 세트가 실재하는지** 검사하고 없으면 throw 한다.
`sinTraits` / `commonTraits` 는 ⚠ `ui/mock.js` 출처. `skillSystem` 이 없으면 액티브 없이 기본 공격만 돈다.
**스테이지 편성 예외** [신설 2026-09-18 · §2-13] — `spawn_rule.js` 의 표를 **import** 한다(주입이 아니다 — 규칙이 코드라서 · `skill_effects.js` 와 같은 취급). **생성 시 표를 검사하고 틀리면 throw 한다** — 표의 스테이지가 `stages` 에 있나 · 규칙이 가리키는 몬스터가 **그 스테이지의 일반몹**인가 · 라운드마다 뽑을 목록이 비지 않나(라운드 풀 · 정예 후보 · 소환사를 뺀 풀).

| export | 시그니처 | 계약 |
|---|---|---|
| `stagePool(stage)` | `→ monsterIdx[]` | 해당 챕터·스테이지의 `spawn_grade === 'normal'` 몬스터. **챕터보스 스테이지는 빈 배열**이다 — 보스 단독이라 호위도 0 이고 풀을 한 번도 안 뽑는다 (2026-09-11 R75). **편성 예외(§2-13)가 줄이기 전의 풀**이다 — 출정 창의 적 구성이 이것을 쓴다 |
| `stageRounds(stage)` | `(stage 행 객체) → [{round_num, round_type}]` | 그 스테이지의 라운드 줄 = `roundSets[stage.round_set]`(round_num 순). **라운드 수 = 길이.** 챕터보스 스테이지는 `boss` 한 줄뿐이다(base_expedition_design §1-2). 화면의 라운드 트랙 · 예상 소요 · 리포트 총수도 이것을 부른다 — 렌더러가 세트를 직접 고르지 않게 여기 둔다(`stageElement` 와 같은 이유 · 2026-09-11 R75) |
| `stageElement(stage)` | `(stage 행 객체) → elementId` \| `'physical'` | 그 스테이지 몬스터의 `attack_type` 중 physical 이 아닌 **첫 값**. 편성 화면의 "이 스테이지가 요구하는 저항"(§9-8) — 렌더러가 몬스터 테이블을 훑지 않게 여기 둔다 |
| `makeEnemy(key, monsterId, grade, lvl, gear?, extra?)` | `→ 전투 유닛` | 몬스터 → 유닛 변환 규칙 자체가 계약이라 내보낸다(검증이 직접 본다). `gear` = 그 몬스터가 **입고 있는 아이템 배열**(`rollGear` 결과 · 생략하면 `[]` = 맨몸) [신설 2026-09-11 · R79]. 아래 |
| `createRun(partyUnits, stageId, rng, level?, potions?, slotMax?)` | `→ run {next(partyUnits?), advance(until), refit(partyUnits), status(), result, ended}` | **런 하나를 라운드 단위로** [신설 2026-09-14 · R89 · base_expedition_design §1-1 · **걸음 단위 2026-09-21 · R130**]. **`slotMax`** = 물약 칸 수 — `potions` 가 이보다 길면 던지고 `result.potion.max` 가 이 값이다. 게임(`state.departRun`)은 `limitsOf(state).potionSlots` 를 넘긴다 · 안 주면 `potion_slot_max` [2026-09-22 · 상한은 한 곳이 답한다]. `next()` 한 번 = 라운드 하나를 끝까지 계산한다 — **이기면 멈추고** 요약을 낸다(다음 라운드는 다음 호출이 연다) · 전멸 · 시간 초과 · 마지막 라운드 클리어면 런이 닫힌다(`end` 이벤트) · 닫힌 뒤엔 `null`.<br>**요약** = `{n, t, cleared, ended, xp, gold, kills:{monsterId:n}, cards:{monsterId:n}, drops:[item], alive:[uid], contrib, potions:{potionId:n}}` — 보상 필드(`xp` = 그 라운드 처치 XP 합 · `gold` · `kills` · `cards` · `drops`)는 **그 라운드를 이겼을 때만** 값이 있다(진 라운드는 0 · 빈 값) · `alive` = 그 순간 살아 있는 파티 영웅 uid · `contrib` = 그 시각까지의 기여(`result.contrib` 모양) · **`potions` = 그 라운드에 마신 물약 `{potionId: n}`**(이겼든 졌든 · 안 마셨으면 `{}` — 정산이 재고에서 뺄 양이다 · 세기만 해서 rng · 타임라인과 무관 · 2026-09-21 · R124). `result` 는 `simulate` 결과와 같은 모양이고 **걸음마다 자란다**(R130 · 타임라인 포함 · `durationSec` · `contrib` 은 닫힐 때 굳는다).<br>**`next(partyUnits)`** — 둘째 호출부터 **그 순간의 파티**(`partyUnits` 와 같은 모양)를 받는다. 영웅의 `combat` · `stats` · `actives` 가 직전 것과 **다를 때만** 그 유닛을 갈아입힌다(`refit` 이벤트) — 같으면 아무 일도 없고 rng · 타임라인이 인자를 안 준 것과 같다. 갈아입히는 규칙: **현재 HP 는 비율을 지킨다** [개정 2026-09-21 · R130 — ~~현재 HP 유지 · 새 최대치로 자른다~~] — 갈아입기 전 `hp / hpMax` 를 새 최대치에 곱해 반올림한다(살아 있으면 최소 1 · ⚠ 반올림이 뺐다 끼우기마다 조금씩 회복시키는 구멍은 1차에서 받아들였다 — base_expedition_design §1-5) · 창 · 배리어 · 행동 예약(`next`) 유지 · 남은 스킬은 **칸마다** 쿨 그대로 [2026-09-21 · R130 — 칸을 `source|id` 로 잇는다 · ~~스킬 id 로 이었다~~ — 고유와 무기 두 칸에 같은 스킬이 앉으면 두 칸의 쿨이 한 값으로 합쳐졌다] · **새로 생긴 스킬은 그 순간부터 쿨 한 바퀴** · 오오라는 다시 건다 · 적이 깎은 영구 방어는 **깎인 비율(`defKeep`)로** 잇는다 — `defBase = 새 밑수 × defKeep` [2026-09-21 · R130 — ~~옛 방어값으로 나눈 비율로 잇는다~~ — 옛 방어가 0 이면 못 재서 장비를 다 벗었다 입으면 깎인 기록이 사라졌다 · 깎인 **양**으로 들면 맞을 때 입은 방어가 손실을 정해 가벼운 장비로 맞고 무거운 장비로 갈아입는 수법이 생긴다(검토)] · 파티 평균(골드 · 드롭 · 매직찬스 배율)도 다시 잰다. **쓰러진 영웅은 안 갈아입힌다**(그 런 끝까지 빠진다). 인원 · 자리(`rank`)는 안 읽는다 — 원정 중에 편성을 바꿔도 도는 원정은 나갈 때의 인원 그대로다(§2-7 `departRun` · `runParty`). **인자 없이 이어 부르면 `simulate` 와 한 글자도 안 다르다**.<br>**걸음 단위** [신설 2026-09-21 · R130 · base_expedition_design §1-5 — 원정 중 교체는 그 순간부터] — **`advance(until)`** = 틱을 **`t + TICK ≤ until` 인 동안만** 돈다. 라운드가 끝나면 그 자리에서 멈추고 요약을 낸다(`next()` 와 같은 요약 · 다음 라운드는 다음 걸음이 연다) · `until` 에 닿으면 `null`(라운드 도중에 섰다) · 닫힌 런이면 `null`. **아직 안 연 라운드는 걸음의 첫머리에 연다**(첫 라운드 · 이긴 라운드의 다음) — `advance(0)` 은 라운드를 열기만 하고 틱을 안 돈다. **쪼개 돌려도 틱 수열이 같다** — 교체가 없으면 어디서 끊어 걷든 한 번에 돈 것과 **한 글자도 안 다르다**(§8 항목 18 · `dev/test.js` 단정). **`refit(partyUnits)`** = 갈아입기를 **지금 시각에** 건다 — 위 「갈아입히는 규칙」 그대로이고 바뀐 영웅만이다. 부르는 자리가 둘이다: **라운드 사이**(이긴 라운드의 요약을 낸 뒤 · 다음 라운드를 열기 전 — 옛 `next(partyUnits)` 의 자리)와 **라운드 도중**(틱과 틱 사이). **보스 라운드 도중에는 거절한다** — 아무것도 안 바꾸고 `{locked: true}`(보스 라운드가 **시작하는 순간**의 장비로 싸운다 · 보스전 중 교체는 다음 런부터 · base_expedition_design §1-5). 라운드 사이 · 첫 라운드 전은 보스 라운드 앞이라도 받는다. 반환 `{locked, changed: [유닛 키]}`. **오오라 창 이벤트의 자리** — 라운드 사이면 종전대로 다음 `round` 뒤(`auraQueue`), **라운드 도중이면 그 `refit` 바로 뒤에 곧바로** 낸다(다음 `round` 까지 칩이 낡은 채 서지 않게). **`status()`** = `{t, round, kind, inRound}` — 지금 시각 · 라운드 번호 · 종류(`normal`/`elite`/`boss` — 연 적이 없으면 `null`) · 라운드 도중인가(열었고 아직 안 끝났다). 표시 · 판정용이라 rng 0 |
| `simulate(partyUnits, stageId, rng, level?, potions?, slotMax?)` | `→ result` | **한 번에 끝까지**(`slotMax` 는 `createRun` 에 그대로 넘긴다) — `createRun` 을 끝날 때까지 인자 없이 이어 부른 것이다(검증 · 캘리브레이션용 · 게임 흐름은 `state.departRun`/`advanceRun` 이 `createRun` 을 직접 쓴다 · R89). **`level`** = 이번 런의 **스테이지 레벨**(몬스터 레벨) [신설 2026-09-14 · R87 · base_expedition_design §1-4] — 안 주면 `stage.dlvl`. 적 생성 레벨 · 장비 아이템 레벨 · 처치 XP · 적중이 **이 값 하나**를 읽는다. **스폰의 굴림 횟수는 안 바뀐다**(편성 굴림은 레벨을 안 보고 · 장비 굴림 수는 아이템 레벨과 무관하다) — 그래서 같은 시드면 첫 라운드 편성이 같다. ⚠ **전투 중 수열은 갈린다** — 적중률이 레벨 차를 따르고 빗나간 타격은 치명 · 추가 피해를 굴리지 않는다(`formula.strike`). `partyUnits = [{uid, combat, stats?, actives?, reactions?}]` (`combat` = `computeCombat` 결과, `stats` = **기본 능력치 7종**(`hero.stats` — 스킬 계수가 읽는다 · 없으면 `null` = 계수 0 취급 · 2026-09-10 R72), `actives` = **인스턴스** `[{id, source}]` = `skill.activesFor` — 정의는 `skill.resolve` 로 푼다 · `reactions` = `[{on, fn}]` 사건 훅 핸들러, ⚠ 소비자 없음 — 2026-09-01). **`actives` 가 없거나 비면 기본 공격만 돌고 rng 수열은 스킬 도입 전과 같다.** 아래 |

**물약 (`potions`)** [신설 2026-09-15 · R103 · **칸마다 물약 하나 R104** · battle_design §7-1] — `createRun` · `simulate` 의 다섯째 인자 = **칸 목록** `[{id, heal} | null]`(**자리 순** — 0 = 앞 칸 · `null` = **빈 칸**(재고가 모자랐거나 비워 둔 칸 · 2026-09-21 · R124) · 길이 ≤ `[balance.csv:potion_slot_max]` · 인자 `null`/생략 = 빈 목록 — 목록이 아니거나 칸 모양이 틀리거나 칸 수를 넘으면 throw). 칸마다 다른 물약이 들 수 있고 **같은 물약이 여러 칸에 들 수 있다**. **파티가 같이 쓰는 칸**이라 영웅이 아니라 런이 받는다. **찬 칸이 없으면**(빈 목록 · 전부 `null`) 물약 단계가 아예 안 돌아 **rng · 타임라인이 인자를 안 준 것과 같다**. 칸은 **런 하나 안에서만 산다** — `createRun` 이 열 때 차고 라운드 사이에는 안 찬다(스테이지마다 다시 차는 것은 부르는 쪽이 런을 새로 열기 때문이다 — **재고에서** 채운다 · §2-7 `departRun`). 규칙은 아래 「스킬 실행 규칙」 표의 `물약` 행 · 이벤트는 `potion` · 결과는 `result.potion`.

**드롭 (`onKill`) — 떨어지는 것은 그 몬스터가 입고 있던 장비다** [개정 2026-09-11 · R79 · item_design §1 2단계 · monster_design §5-1]. **처치당 최대 1개**(확정 2026-08-27)는 그대로이고 바뀐 것은 **무엇이 떨어지나**다.
판정은 **1회**: `rng() < drop_chance_pct × dropChanceMult × 아이템 드랍률배율` 이면 1개. 보스(`stage_boss`/`chapter_boss`)는 `boss_guaranteed_drop` 을 하한으로 보장한다. **판정은 처치 순간 돌지만 결과에 들어가는 것은 그 라운드를 이겼을 때다** [2026-09-14 · R89] — 진 라운드의 드롭은 버린다(도감 처치 수도 같다).
드롭이 있으면 **입은 부위 중 하나를 균등 굴림(1회)** 해서 `unit.gear` 의 그 아이템을 **그대로** 내보낸다 — 여기서 아이템을 만들지 않는다. ~~ilvl 1회 → `rollDrop`~~ 은 삭제됐다.
⚠ **맨몸 몬스터는 드롭이 없다** — `gear` 가 비면 판정이 성공해도 낼 것이 없어 굴림만 소비하고 넘어간다(`wear_slots` 가 비는 행이 생기면 그 몬스터는 장비를 안 준다).
**파이프라인 3~6단계는 스폰으로 옮겨갔다** — ilvl(**스테이지 레벨**(`simulate` 의 `level` · 기본 `dlvl`) `+ grade.gear_ilvl_add` · **굴림 없음**) · 희귀도(가중치 = `grade.gear_rarity_w_*` → `rollGear` 의 `rarityWeights` · 레어 가중에 `magicFind + grade.gear_rare_bonus_pct` · 일반 등급은 레어 0 — 2026-09-23 · 굴림 수 불변) · 접사 · 개체 굴림이 전부 `spawnRound` 에서 돈다(§5-2). 그래서 **등급 반영이 해소됐다** — ~~DEV_PLAN R20 미반영~~. **매직찬스는 스폰 굴림에 걸린다** — 전투 시작 때 굳힌 파티 평균 `magicFind` 가 `rollGear` 로 간다. ⚠ **딸린 것 — 파티의 매직아이템 획득확률이 적 장비도 좋게 한다**(즉 적이 세진다). 사용자가 알고 택한 것이다 [2026-09-11 · 「이스터에그」].

**전투 유닛 — 몬스터와 파티가 같은 필드 모양이다** (§8-1). `formula.strike` 가 읽는 이름 그대로 쓴다:
`{key, side, hp, hpMax, atkMin, atkMax, atkType, def, res:{fire,cold,lightning,poison}, lvl, hitBonus, resMaxBonus, resMaxEl, dr, drFlat, defIgnore, resReduction, resReductionEl, skillMult, bonusPct, crit, critDmg, ls, reflect, counter, recv, buffDur, period, next}`
스킬 런타임이 얹은 필드 — 전부 **전투 안에서만** 산다 (세이브에 넣지 않는다):

| 필드 | 계약 |
|---|---|
| `atkMinBase` · `atkMaxBase` · `atkPct` | 버프 괄호 — **양끝마다** [개정 2026-09-14 · R90 — ~~`atk`~~ · ~~`atkBase`~~]. `atkMinBase = combat.atk_*.min / (1 + atk_pct_sum)`(`Max` 도 같다) · `atkPct = atk_pct_sum`. 유효 데미지 `atkMin = atkMinBase × (1 + atkPct + Σ버프 atk_pct)`(`atkMax` 도 같다) — **새 곱셈 층을 만들지 않는다**(§9-2). ⚠ **몬스터도 `atkPct` 를 든다** [2026-09-11 · R79] — 낀 무기의 고정 옵션(`atk_pct`)과 오만 칸이 같은 괄호에 들어간다 |
| `matkMin` · `matkMax` | 회복량의 밑수 — 범위 양끝 = `combat.atk_magic ?? {min: 0, max: 0}` [개정 2026-09-14 · R90 · ~~`matk`~~]. 시전마다 그 사이를 굴린다(아래 「회복」 행). ⚠ **마법 무기를 낀 몬스터는 0 이 아니다** [2026-09-11 · R79 · monster_design §5-1] — 소환은 0 |
| `matkMinBase` · `matkMaxBase` | 양끝마다 `/ (1 + atk_pct_sum)` — 회복 밑수의 괄호 앞 값. 유효 `matkMin = matkMinBase × (1 + atkPct + Σ버프 atk_pct)`(`Max` 도 같다) — 데미지와 **같은 괄호**(2026-09-01). 마법 무기를 낀 몬스터는 0 이 아니다(위) · 소환 0 |
| `basePeriod` | `period` 의 원값. `period = basePeriod × (1 − Σ버프 period_pct)` |
| `hpMaxBase` · `defBase` · `resBase` · `drBase` · `regenBase` | 창이 미는 축의 **원값** [신설 2026-09-09]. `refreshDerived` 가 창 합으로 값을 다시 쓰고 **창이 없으면 밑수로 되돌린다** — 그래서 `hpMax`·`def`·`res`·`dr`·`regen` 을 직접 대입하는 코드는 밑수도 같이 옮겨야 한다(안 그러면 다음 파생에서 되돌아간다). `resBase` 는 4원소 객체. **방어 % 창은 양수 밑수에만 곱한다** [2026-09-21 · R130 · battle_design §9-3] — `def = defBase > 0 ? defBase × (1 + Σ) : defBase`(`guard_pct` · `def_pct`). 밑수가 0 이하면 창이 안 민다 — 곱하면 버프가 음수를 더 깊게 · 디버프가 얕게 만들어 뜻이 뒤집힌다(안전장치 — 깎인 방어는 비율 `defKeep` 이라 지금은 밑수가 음수로 가는 길이 없다). 양수 밑수라도 감소 합이 −100% 를 넘으면 방어가 음수로 간다(§2-3 `mitigation` 의 거울식) |
| `defKeep` | **깎인 방어의 비율** [신설 2026-09-21 · R130] — `enemy_highest_def`(가이디드 애로우)가 **양수 밑수**를 깎을 때마다 `× (1 − decay)` 를 곱한다(1 에서 출발 · 라운드를 넘어 런 끝까지 · 밑수가 0 이하면 안 깎는다 — % 로 깎는 스킬이라서다). 갈아입기가 `defBase = 새 밑수 × defKeep` 로 읽어 **벗었다 입어도 깎인 기록이 남고, 어떤 장비로 맞았든 같은 비율로 깎인다**. 적은 갈아입지 않으므로 기록만 한다 · 소환 1 |
| `summon` · `summonOf` | 소환 유닛 표식과 시전자 key [신설 2026-09-09]. **`side` 는 시전자와 같다**(파티 배열에 들어간다) — 그래서 적의 대상 굴림 모집단이 커진다. ⚠ **전멸 판정에서는 뺀다**(`alive(party).filter(u => !u.summon)`) · 라운드가 바뀌면 `beginRound` 가 걷어낸다 · 행동은 `next: Infinity` 로 막는다 · ⚠ **적도 소환한다** [2026-09-11 · R79] — 벽은 시전자 쪽 배열(`units.enemies`)에 서고 **클리어 판정에서도 빠진다**(전멸 판정과 같은 규칙) · 적 벽을 쓰러뜨려도 `onKill` 을 안 지난다(처치 · 기여 처치 수 아님 · rng 0) · 적 벽은 다음 라운드의 적 배열 교체로 사라진다. ⚠ 파티 벽이 쓰러지면 `result.downed` 에 uid 없이 실린다 — R79 **이전부터** 있던 동작이고 미수정(DEV_PLAN R79 보고) |
| `actives` | `[{id, def, readyAt, source}]` — **준비 상태로 출발한다** [개정 2026-09-15 · R100 · battle_design §6] — 파티는 `readyAt = 0`(전투 시작) · 적은 `readyAt = 등장 라운드 시작 시각` · 원정 중 새로 생긴 스킬만 갈아입은 시각 + `cooldownSec`(§2-12). 동시 준비는 칸 순서라(`skill.pickReady`) 첫 차례는 1번 칸이다. `source` 는 배정 출처(`innate`/`weapon_group`/`advance`) — 화면 라벨용, 전투는 읽지 않는다. ⚠ **몬스터도 든다** [2026-09-11 · R79] — 칸 수는 `grade.skill_slots`(일반 1 · 정예 2 · 보스 3) · 소환 `[]`. ⚠ **적의 오오라도 칸에서 뺀다** — 파티와 같은 `applyAuras` 가 **라운드 시작에**(`beginRound` · `units.enemies` 교체 직후) `until: Infinity` 창으로 건다(대상 = `self` 면 자신 · 아니면 그 적 배열 · rng 0). 안 빼면 쿨 0 액티브가 되어 매 차례 시전만 반복한다. **오오라 창은 이벤트로 낸다** [2026-09-15 · R98] — 아래 이벤트 표 `buff`. **칸 표시** — 오오라를 뺄 때 빼기 전 칸 순서(`slotIds`)와 켠 오오라 id(`auraOn`)를 유닛에 남긴다. 결과 `party[]` · `round` · `refit` 의 `actives`/`ready` 가 이것을 읽는다(표시값 · 전투는 안 읽는다 · 오오라가 없는 유닛은 둘 다 없다 · 갈아입으면 비우고 다시 잰다) |
| `band` · `called` · `rewarded` | **무리** [신설 2026-09-18 · §2-13] — `band` = 소환사가 든 적 유닛 배열(그 라운드의 다른 적 전부 · 아직 안 나온 대기 포함) · 소환사만 든다. `rewarded` = 처치 보상을 이미 받았다 — **보상은 한 마리당 처음 쓰러질 때 한 번**이라, 되살아난 유닛이 다시 쓰러지면 `onKill` 을 안 지난다(경험치 · 골드 · 드롭 · 처치 기록 없음 · rng 0 — 기여표의 처치 수도 안 센다). 같은 장비가 두 번 떨어지는 것을 막는 자리이기도 하다. **`called`** = 지금 서 있거나 한 번 선 적이 있다(대기만 거짓으로 출발한다). 클리어 판정에는 **든다**(소환 벽과 다르다 — 무리도 다 쓰러뜨려야 라운드가 끝난다) |
| `reactions` | `[{on, fn}]` — 사건 훅 핸들러 (§2-12). 기본 `[]`. ⚠ 등록하는 소비자가 아직 없다 — 마스터리 T3(반응 패시브)의 자리 (2026-09-01) |
| `potionReadyAt` | **파티 영웅만** — 제 물약이 다시 준비되는 시각(초) [신설 2026-09-15 · R103]. 전투 시작 `0`(준비 상태 — 스킬과 같은 규칙) · 마신 순간 `t + [balance.csv:potion_cooldown_sec]` · 라운드를 넘어 잇는다(갈아입기 `refit` 도 안 건드린다). 적 · 소환은 안 든다 |
| `resMaxEl` · `drFlat` · `counter` · `recv` | **방어구 옵션** [신설 2026-09-18 · item_design §1] — `resMaxEl` = `combat.res_max_el`(원소별 최대 저항 증가) · `drFlat` · `counter` · `recv` = `combat.option_fx` 의 `drFlat`(절대값 피해 감소) · `counter`(반격 확률) · `recv`(체력 회복 +%) — 없으면 0 · 소환은 0. **몬스터도 든다**(입은 장비대로 — 특수 분기 없음) · 갈아입기가 새로 받는다. 규칙은 아래 「스킬 실행 규칙」 표의 `반격` · `조건부 받는 피해 감소` · `체력 회복` 행 |
| `hitBonus` | **명중률** [신설 2026-09-22 · R138 · battle_design §9-4] — `combat.option_fx.hitBonus`(궁수 T1-3 · 없으면 0) · `strike` 가 `hitChance` 의 셋째 인자로 넘긴다 · 갈아입기가 새로 받는다 · rng 소비 불변 |
| `resReductionEl` · `buffDur` | **반지 · 목걸이 옵션** [신설 2026-09-21 · R127 · item_design §1 「반지 · 목걸이」] — `resReductionEl` = `combat.res_reduction_el`(원소별 저항 무시 · 없으면 `null`) · `buffDur` = `combat.option_fx.buffDur`(버프 지속시간 · 없으면 0) — **몬스터도 든다** · 갈아입기가 새로 받는다 · 소환은 0 |
| `fhr` · `stagUntil` | **경직** [신설 2026-09-17 · R110 · battle_design §2-3] — `fhr` = 타격 회복(비율 · `combat.fhr ?? 0` · 갈아입기가 새로 받는다) · `stagUntil` = 경직이 끝나는 시각(초 · 시작 `0` · 갈아입기가 안 건드린다 · 라운드를 넘어 잇는다). 규칙은 아래 「스킬 실행 규칙」 표의 `경직` 행 |
| `buffs` | `{skillId: {stat, v, until, element, by}}` — 창 하나 = 스킬 하나. **중첩 없음**, 재시전은 `until` 갱신. `element`(평타 부여가 때릴 원소) · `by`(건 자의 key — 지목이 읽는다)는 2026-09-09 신설. **`until: Infinity` 는 오오라**(만료가 영원히 안 걸린다 · 이벤트에서는 `until: null` · R98) · `v` 가 **음수면 디버프**(적에게 건 창) · **`quiet: true` = 무기 옵션 창**(키 `wx:…` — 열 때도 닫을 때도 이벤트를 안 낸다 · 2026-09-11 R78) |
| `barrier` | `{amt, until, s}` 또는 `null` — HP 밖 흡수 풀 |
| `stats` | 기본 능력치 7종 `{str, agi, int, vit, luck, ldr, cha}` — 영웅은 `partyUnits[].stats`, **몬스터는 `monster.csv` 의 7컬럼**(몬스터마다 고정 · 2026-09-11 R79). **소환만 `null`**. 시전 순간 `skill.scaleDef(def, u.stats)` 가 읽는다(`null` = 계수 0) [2026-09-10 · R72] |
| `statMult` · `condPct` · `procChance` · `procMult` | `strike` 가 읽는 **타격 동안만** 필드 — `strikeOnce` 가 얹고 원복한다(§8 항목 13). 평소 `statMult` 1 · 나머지 0. `statMult` = 능력치 계수(스킬 타격 = `scaleDef` 의 `statMult` · 기본 공격 = `mainMult`) · `condPct` = 무기 옵션의 조건부 %(아래 「무기 옵션」 행) · `procChance`/`procMult` 는 스킬 타격만 [2026-09-10 · R72 · ~~`flat`~~ 2026-09-18 폐기] |
| `mainMult` · `dmgPct` | **데미지 공식 개정** [신설 2026-09-18 · battle_design §9-1 · §9-2] — `mainMult` = `combat.main_attr_mult ?? 1`(평타 능력치 계수 · 소환 1 · **몬스터도 제 메인 스탯** — 2026-09-22) · `dmgPct` = 데미지 % 괄호 안의 **지금** 합 = `atkPct + Σ버프 atk_pct`(`refreshDerived` 가 `atkMin` 과 함께 다시 쓴다 · `strike` 가 조건부 %를 그 괄호에 끼울 때 읽는다). 스킬 계수는 시전 순간 `scaleDef(def, stats)` 로 영웅 · 몬스터가 같이 탄다. 갈아입기는 `mainMult` · `dmgPct` 를 새로 받는다 |
| `fx` · `magicFind` | **무기 옵션 묶음** = `combat.option_fx`(§2-4) · 없으면 `null` / `0` [신설 2026-09-11 · R78]. ⚠ **몬스터도 든다** [2026-09-11 · R79] — 낀 무기의 옵션이 그대로 산다(강타 · 타격 시 창 · 조건부 %). **소환만 `null`**. `strikeOnce` 가 `fx` 가 있을 때만 읽는다(아래 「무기 옵션」 행) · `magicFind` 의 **파티 평균**은 `party` 배열만 훑으므로 적 장비의 값이 섞이지 않는다 |

| 몬스터(`makeEnemy`) | 값 [전면 개정 2026-09-11 · R79] |
|---|---|
| **전투 능력치 전부** | `heroSystem.computeCombat({stats, level: lvl, cls, innate}, gear)` — **영웅과 같은 함수**다. `stats` = `monster.csv` 의 기본 능력치 7종(몬스터마다 고정) · `gear` = 스폰 때 굴린 장비. ~~`monster.csv` 소재값 × `spawn_grade` 배율~~ 은 폐기(`hp`·`attack`·`action_period` **컬럼째 삭제**) — HP 는 `monster_hp_base`(입력 `hpBase` — 레벨 1 바탕만 영웅과 갈린다 · R91) + 레벨 성장분 × 건강, 데미지는 **무기 밑수**, 주기는 **무기군 / 민첩**이 낸다 |
| `def` · `res` | **몸값 + 장비** [D3] — `monster.csv:defense` · `res_*` 를 `computeCombat` 결과에 **더한다**(장비가 그 위에 얹힌다). 몸에 남긴 이유는 도감이 저항을 공략 정보로 적고(§8-1) 「이 원소를 막았나」가 판마다 요동치면 안 되기 때문이다(§9-5). `grade.def_mult` · `grade.res_add` 는 **퇴역**(등급의 세기는 장비가 낸다) |
| 전역 배율 | `hp` `× grade.hp_mult × monster_hp_scale` · 데미지 양끝 `× monster_atk_scale`(R90) · `def` `× monster_def_scale` — **합계에** 곱한다(캘리브레이션 조절값의 역할이 그것이다). `grade.hp_mult` 만 남은 이유는 **HP 가 장비에서 안 오기 때문**이다 — 빼면 보스가 호위와 같은 체력이 된다(monster_design §5-1 이 미리 짚은 자리). ~~`grade.atk_mult`~~ 는 퇴역 |
| `atkType` | **`monster.csv:attack_type` 이 이긴다** — `computeCombat` 의 `attack_type`(R80 으로 언제나 `physical`)을 덮는다. 원소는 **스테이지가 정한다**(monster_design §2) — 영웅과 다른 유일한 축이다 |
| `matkMin` · `matkMax` | **마법 무기를 낀 몬스터는 `atk_magic` 을 갖는다**(= 양끝 ≠ 0) [개정 2026-09-11] — ~~원소 공격 몬스터도 값은 `atk_physical` 에 둔다~~ 는 폐기. monster_design §5-1 이 「마법 무기를 낀 몬스터는 마법 데미지(회복의 바탕값)를 갖게 된다」로 인정한 것이다. 회복 스킬은 고유 후보에서 걸러 두므로 쓰이지 않는다 |
| `stats` · `actives` · `fx` | **영웅과 같다** — `stats` = 기본 능력치 7종(스킬 계수가 읽는다) · `actives` = `skill.activesFor` 가 만든 칸(등급이 수를 정한다, 아래) · `fx` = 낀 무기의 옵션 묶음(조건부 % · 타격 시 창 · 강타 · 매직찬스). ⚠ **몬스터도 강타를 때린다** — 폭식 무기를 끼면 그 값이 산다 |
| `crit` · `regen` | **영웅과 같은 밑수를 받는다** [D2 사용자 확정 2026-09-11] — `crit = base_crit_pct + 장비` · `regen = hp_regen_base_per_level × growthMult(lvl) + 장비`. ~~몬스터는 0~~ 은 폐기 — 「몬스터를 영웅과 같은 구조로」가 목적이라 특수 분기를 두지 않는다. ⚠ battle_design §8-1 출처 표의 「치명·재생은 정예 특성이 얹는다」와 부딪히는 것을 알고 택했다 |
| 스킬 칸 수 | `grade.skill_slots` — 일반 1(고유) · 정예 2(+ **낀 무기가 든 스킬**) · 보스 3(+ 직업 풀에서 스폰 때 굴린 것) [신설 2026-09-11 · skill_design §2 · monster_design §5-1]. ⚠ 보스 셋째 칸의 정체는 미정(GAME_DESIGN §10) |
| `gear` | 입고 있는 아이템 배열 — `monster.csv:wear_slots` 순서. **드롭이 여기서 하나 나간다**(아래) · **세이브에 안 들어간다**(타임라인과 같은 취급 · 떨어진 한 점만 `result.drops` 로 나간다) [D4] |
| `lvl` | **스테이지 레벨** — `simulate` 의 `level`(안 주면 `stage.dlvl` · 2026-09-14 R87). 몬스터마다 두지 않는다 (§9-4) |
| `dropChanceMult` | `grade.drop_chance_mult` — **굴림 횟수가 아니라 확률 배율**이다 (드롭은 처치당 최대 1개, 아래) |
| `expReward` | `monster_xp_base × monster_xp_growth ^ (lvl − 1) × grade.exp_mult × monster.exp_coef` [개정 2026-09-14 · R85] — **몬스터 레벨과 등급이 같으면 몬스터가 달라도 같은 값**이다. 그래서 스테이지 레벨을 올리면 XP 도 따라 오른다. `exp_coef` 는 몬스터별 조정 칸이다(지금은 전 행이 중립값). ~~`monster.csv:exp_reward × grade.exp_mult`~~(행마다 박힌 값 — 레벨을 안 따라왔다)는 폐기. **골드도 이 값에서 나온다** — `round(expReward × goldMult × gold_rate × 파티 goldMult)` (battle.js 처치 정산) |
| `monsterType` | `monster.monster_type`(Normal/Demon/Undead) — 무기 옵션 vs 종족의 조건 [2026-09-11 · R78] |
| `cls` | `monster.csv:cls` — **본편 직업 5종 그대로** [신설 2026-09-11]. 정하는 것은 **스킬 풀과 무기군**이고 자리는 `role` 이 정한다(겸하지 않는다 · monster_design §5-1) |

파티 유닛은 `computeCombat` 출력을 그대로 옮긴다 — `bonusPct ← dmg_bonus_pct` · `dr ← damage_reduction`(실효 %) · `res ← res_* 4종` · `lvl ← level` · `regen ← hp_regen` · `cdr ← cooldown_reduction` · `fhr ← fhr`(없으면 0 · R110) · `resMaxEl ← res_max_el` · `drFlat` · `counter` · `recv` `← option_fx`(없으면 0 · 2026-09-18). **몬스터도 같다** [개정 2026-09-11 · R79] — ~~몬스터는 `regen`·`cdr` 이 0~~ 은 폐기(같은 함수를 지나므로 밑수도 장비분도 그대로 온다 · 위 표 `crit`·`regen` 행). **`stats` 는 몬스터도 든다** — 영웅은 `partyUnits[].stats`, 몬스터는 `monster.csv` 의 7컬럼이다(~~몬스터·소환은 `null`~~ → **소환만 `null`**).
**유닛 생성은 `makeUnit(side, combatLike, extra)` 하나다** (2026-09-01) — 그리고 **`combatLike` 를 만드는 함수도 하나다** [개정 2026-09-11 · R79]: ~~`combatFromMonster(m, grade, lvl)`~~ **삭제**되고 몬스터도 `heroSystem.computeCombat` 을 지난다. 필드 이름이 같아서가 아니라 **같은 함수라서** 같다 — §8-1 의 「계산이 한 곳」이 문자 그대로 성립하고, 이식 대조도 한 함수로 양쪽을 검증한다. 몬스터 전용으로 남는 것은 **①몸값 합류(`defense`·`res_*`) ②전역 배율 ③`attack_type` 덮기** 셋뿐이고 셋 다 위 표에 있다. `makeEnemy` export 는 그 셋까지 지난 결과를 낸다.

**result** — `{won, reason, durationSec, party:[{key, uid, hpMax, period, atkMin, atkMax, matkMin, matkMax, atkType, stats, actives:[skillId], ready:[초]}], timeline:[ev], xpTotal, gold, kills:{monsterId:n}, drops:[item(uid null)], downed:[heroUid], roundsCleared, rounds:[{n, kind, killed:[monsterId], eliteSin}], strikes:{party:{n,miss}, enemy:{n,miss}}, contrib:[{uid, dealt, taken, kills}], casts:{skillId:n}, potion:{max, slots:[{id, heal} | null], used}}`
- `party[].stats` = **전투 시작 시점 기본 능력치의 복사본**(`partyUnits[].stats` 가 없으면 `null`) — 설명창이 스킬 계수를 풀어 쓰는 표시값이다. `atkMin`·`atkMax`·`matkMin`·`matkMax`·`atkType` 과 같은 취급이라 rng·타임라인·골든과 무관하다(`matkMin`/`matkMax` = 회복 스킬 설명창의 밑수 · 2026-09-10 추가 · 범위 R90) · 복사본인 이유는 정산(`grantXp`)이 전투 **뒤에** 능력치를 올리기 때문이다 [2026-09-10 · R72]
- `casts` = 스킬별 시전 횟수. 타임라인의 `skill` 이벤트 수와 합이 같다
- `downed` = **쓰러진 파티 영웅의 uid**뿐이다 [명문화 2026-09-21 · 부채 #44] — **소환 벽(`u.summon`)은 안 싣는다.** 벽은 `uid` 를 안 받으므로(`makeSummon`) 실으면 `undefined` 가 들어가 리포트의 「전투불능 N명」과 캘리브레이션 `avg downed` 열이 부푼다. 적 쪽 벽이 처치가 아닌 것(R79)과 같은 축이다
- `potion` = 이 런의 물약 칸 [신설 2026-09-15 · R103 · 모양 개정 R104] — `max` = 칸 수(`[balance.csv:potion_slot_max]`) · `slots` = 받은 칸 목록 그대로(자리 순 · `null` = 빈 칸 · 목록 뒤의 칸도 빈 채 출발한다) · `used` = 마신 수(`potion` 이벤트 수와 같다) · 물약 없이 돈 런도 `{max, slots: [], used: 0}` 이다. 재생기가 칸의 첫 상태를 이것으로 그린다 · 전투는 안 읽는다
- `reason` 은 `clear` / `wipe` / `timeout`. **`retreat` 는 2026-09-03 에 폐기됐다.**
  **귀환 룰** (base_expedition_design §1-1 · **개정 2026-09-03** · 아웃 단위 개정 2026-09-08) — 전투불능자가 나와도 **런을 접지 않는다.** 아웃은 **그 런 안에서만** 유효하다 — 다음 반복 런에는 전원이 다시 나간다. 남은 인원으로 계속 가고 **전원이 쓰러졌을 때만** `wipe` 로 끝난다. 판정 순서는 ① 전멸 ② 라운드 정리(클리어·다음 라운드) ③ 제한시간. ~~전투불능자가 하나라도 나오면 그 자리에서 철수~~ 는 폐기 — 그래서 `wipe` 가 **패배의 일반형**이 됐다(종전에는 같은 틱 전멸에서만 났다). 쓰러진 영웅은 `result.downed` 에 실린다 — ~~`state.run.downed`(출정 누적)로 옮겨간다~~ 는 2026-09-08 삭제(아웃이 런을 넘지 않는다 · v17 이관이 필드를 지운다)
  ⚠ 이 룰은 런의 길이를 바꾼다 — 캘리브레이션 대역은 이 룰이 들어간 뒤의 값이어야 한다
- `strikes` = 직격 시도 수와 빗나간 수. **레벨 부족의 전용 신호**라 리포트에 따로 낸다 (§9-4·§9-8). 세는 것뿐이라 **rng 를 소비하지 않는다**
- `contrib` = **파티 영웅별 기여** — 가한 피해 · 받은 피해 · 처치 수 [신설 2026-09-09 · R68]. 전투 시작 시점의 **파티 전원**이 자리를 갖고(0 이어도 줄이 선다) 순서는 파티 순서다. 「가한 피해」는 **감쇠 후 최종 피해**이고 배리어가 먹은 몫도 든다 — 관전의 누적 데미지 판(§6)이 이벤트의 `dmg` 를 더한 값과 **같은 값**이다. **반사는 되받은 쪽의 가한 피해**로 세고, 처치는 **적을 쓰러뜨린 것**만 센다(적의 소환 벽은 안 센다 · R79). ⚠ **소환물은 안 센다** — 행동하지 않아 가한 피해가 없고, 소환물이 맞은 것은 주인이 맞은 것이 아니다. `strikes` 와 같이 **rng 를 소비하지 않고 타임라인에도 안 들어간다**
- `drops` 의 아이템은 `uid: null` — state.js 가 가방에 넣으며 발급
- **`xpTotal` · `gold` · `kills` · `drops` 는 이긴 라운드의 몫만 센다** [개정 2026-09-14 · R89] — 진 라운드(전멸 · 시간 초과)에서 잡은 몬스터는 `rounds[].killed` · `contrib` 에만 남는다(사실의 기록). 드롭 **판정 굴림은 처치 순간 그대로** 돌아 rng 순서가 안 바뀐다 — 라운드 몫으로 모아 두었다가 이기면 결과에 넣는다
- `party[].ready` = 그 영웅 스킬들의 **첫 준비 시각**(칸 순서 · 소수 1자리) [신설 2026-09-14 · R89] — 재생기가 쿨 칸의 첫 상태를 이것으로 그린다(재생기는 쿨을 계산하지 않는다) · 스킬은 준비 상태로 출발하므로 쿨이 있는 스킬도 **`0`** 이다(R100) · **오오라도 제 칸에 선다** [2026-09-15 · R98] — `party[].actives` 는 오오라를 빼기 **전** 칸 순서이고, 오오라 칸의 `ready` 는 **켜진 오오라 `0`**(쿨이 없다 — 늘 준비) · **안 켜진 오오라 `null`**(한 번에 하나 — 칸 순서 첫 오오라만 켜진다). 전투는 이 두 배열을 안 읽는다(유닛의 `actives` 는 오오라를 뺀 목록 그대로 · 아래 「전투 유닛」 `actives` 행)
- **`timeline` 은 세이브에 넣지 않는다.** 리포트만 남긴다

**타임라인 이벤트** — 전부 `{t, e, …}`. `t` = 초, 소수 첫째 자리 반올림.

| `e` | 필드 | 의미 |
|---|---|---|
| `round` | `n, kind, enemies:[{key, monsterId, grade, sin, traits, hpMax, period, atkMin, atkMax, matkMin, matkMax, atkType, stats, actives, ready, sheet, gear}]` | 라운드 시작. **그 라운드의 첫 이벤트** · `ready` = 그 적 스킬들의 첫 준비 시각(= 등장 라운드 시작 시각 — 준비 상태로 출발 · 칸 순서 · R100 — 오오라 칸은 켜진 것 `0` · 안 켜진 것 `null` · R98) · `atkMin`·`atkMax`·`matkMin`·`matkMax`·`atkType`·`stats`·`actives` 는 **재생기의 표시값**이다(범위 R90) [2026-09-11 · R79 후속 · 사용자 지적] — `actives` = 그 적의 스킬 id 배열(칸 순서 = 출처 자리 · 고유 → 무기 → 셋째 · 등급이 연 칸만), 나머지는 스킬 툴팁 문장(피해·회복량 · 스킬 계수)의 재료다. `party[]` 의 같은 이름 필드와 **같은 모양**이고 전투에는 안 쓰인다. **`sheet`** = 그 적의 **세부 능력치 복사본** [2026-09-14 · R94] — `makeEnemy` 가 몸값 · 등급 배율 · 전역 배율 · `attack_type` 덮기까지 먹인 `computeCombat` 출력에서 전투 내부용 둘(`option_fx` · `atk_pct_sum`)을 뺀 것(데미지 범위 객체는 복사한다)이고 유닛 툴팁의 세부 옵션(SCREEN_DESIGN §2 「유닛 툴팁 규격」)이 읽는다 · `makeEnemy` 유닛도 같은 `sheet` 를 든다. **`gear`** = 그 적이 **입고 있는 한 벌**의 얕은 복사 [2026-09-21 · R119] — `rollGear` 가 `monster.csv:wear_slots` 순서로 낸 아이템 배열 그대로이고(처치 드롭이 이 중 하나로 나간다 · §5-2) 유닛 툴팁의 **첫 장(장비 3×3)** 이 읽는다(SCREEN_DESIGN §2 「유닛 툴팁 규격」 · ADR-0183) · `sheet` 와 같은 취급이다(표시값 · 전투는 안 읽는다). ⚠ 파티 쪽과 달리 **타임라인 안**이라 골든 지문(`tl`)에 걸린다 — rng 소비는 0 |
| `hit` | `a, d, dmg, crit, dhp, ty` (+ `ahp` 흡혈 시 · `s?` 스킬 타격 · `proc?` 추가 피해가 터졌을 때만 `true` · `bar?` 배리어 잔량 · `cb?` 강타 몫 — `dmg` 에 이미 들었다 · R78) | 직격 적중. `dhp` = 피격 후 HP. `bar` = 대상이 배리어를 갖고 있었을 때 **흡수 후 잔량**. `proc` 은 **터진 타격에만** 붙는다(안 터지면 키가 없다 · 2026-09-10 R72). **`ty` = 그 타격의 피해 종류** — `physical` 또는 원소 4(`fire` · `cold` · `lightning` · `poison`) · 원소가 붙은 스킬 타격이면 그 원소, 아니면 공격자의 공격 타입(`strikeOnce` 의 `hitType` — 원소 조건 · 저항 감소 창이 읽는 그 값) · **늘 붙는다** · 표시용이라 rng · 결과 수치와 무관 [2026-09-15 · 관전 로그의 피해 종류 색 · SCREEN_DESIGN §4-2] |
| `counter` | `u, d` | **반격** [신설 2026-09-18 · item_design §1 「투구 옵션」] — `u` = 반격하는 유닛(방금 맞은 쪽) · `d` = 방금 때린 쪽. **그 직격의 사건(`hit` · `stagger` · `reflect` · `down`) 뒤**에 서고, 바로 뒤에 그 반격의 기본 공격 이벤트(`hit`/`dodge` — `s` 없음)가 잇는다. 규칙은 아래 「스킬 실행 규칙」 표의 `반격` 행 · rng 는 반격 판정 1회(굴린 유닛만) |
| `stagger` | `u, until` | **물리 경직** [신설 2026-09-17 · R110 · battle_design §2-3] — `u` = 경직된 유닛 · `until` = 끝나는 시각(소수 1자리 · 다시 걸리면 새 끝). **자리는 그 `hit` 바로 뒤**다(같은 `t` · 그 타격의 `d` 가 곧 `u`) — 사건 훅 · 반사보다 앞. 경직 길이가 0 이면(타격 회복 1 이상 = 100% 이상) 안 나온다. rng 0 |
| `dodge` | `a, d` (+ `s?`) | 직격 빗나감 (적중 게이트 실패 — 회피 스탯은 없다. **키 이름은 계약이라 유지**) |
| `reflect` | `a, d, dmg, ahp` | 비직격 반사. `a` = 반사한 쪽 |
| `blast` | `a, d, s, dmg, dhp` | **자폭** [신설 2026-09-21 · battle_design §9-6 · skill_design §12-9] — 비직격 **고정 피해**. `a` = 터진 쪽(쓰러진 유닛) · `d` = 맞은 쪽 · `s` = 그 스킬(`mon_selfdestruct`) · `dhp` = 맞은 쪽의 남은 HP. **`down` 바로 뒤**에 서고 대상 수만큼 잇따른다(광역 `hit` 과 같은 모양) · **rng 0** |
| `down` | `u` | 전투불능 |
| `call` | `u, s, units:[{key, monsterId, grade, sin, traits, hpMax, period, atkMin, atkMax, matkMin, matkMax, atkType, stats, actives, ready, sheet, gear}]` | **불러내기** [신설 2026-09-18 · §2-13 · skill_design §12-9] — `u` = 부른 몬스터(소환사) · `s` = 스킬 · `units` = 이번에 선 무리이고 **`round` 의 `enemies` 와 같은 모양**이다. 그 키가 처음이면 **새로 선다**(아직 안 나온 대기 무리 — `round` 에는 없었다 · 적 배열 끝에 붙는다) · 이미 있던 키면(쓰러진 무리) **되살아난다**(HP 가득 · 창은 오오라만 남는다 · 경직 풀림 · 스킬은 준비 상태). 뒤에 새로 선 유닛의 오오라 `buff` 가 이을 수 있다 · rng 0 |
| `refit` | `u, hpMax, dhp, period, atkMin, atkMax, matkMin, matkMax, atkType, stats, actives, ready` | **영웅을 갈아입혔다** [신설 2026-09-14 · R89 · **라운드 도중 2026-09-21 · R130**] — 원정 중 바꾼 장비 · 레벨 · 스킬 트리가 그 영웅의 전투 능력치를 바꿨을 때만 나온다(`createRun.refit` · `next(partyUnits)`). **라운드 사이면** 다음 라운드의 `round` 이벤트 **앞**이다(결투 창을 닫는 `buffEnd` 보다도 앞) · **라운드 도중이면 그 시각에** 선다(틱과 틱 사이 — 같은 `t` 의 앞 틱 사건 뒤) · **보스 라운드 도중에는 안 나온다**(`refit` 거절). `dhp` = 갈아입은 뒤 HP(**비율 유지** — R130 · ~~현재 HP 유지 · 새 최대치로 자름~~) · `actives`/`ready` = 새 스킬 칸과 준비 시각(남은 스킬은 쿨 그대로 · 새 스킬은 이 순간부터 한 바퀴 · 오오라 칸은 `party[].ready` 와 같은 규칙 · R98) · 나머지는 `party[]` 의 같은 이름 표시값. rng 0 |
| `regen` | `u, amt, dhp` | HP 재생. **정수 1 이상이 쌓인 틱에만** 나온다(초당 값을 틱마다 누산) · 행동 처리 **앞** · rng 소비 없음 |
| `skill` | `u, s, ready` | 액티브 시전 — 그 차례의 사건. 뒤따르는 `hit`/`dodge`/`heal`/`buff` 가 같은 `s` 를 단다. `ready` = 그 스킬이 **다시 준비되는 시각**(쿨감소가 이미 반영된 값) — 재생기가 쿨을 계산하지 않게 시뮬이 실어 보낸다 |
| `heal` | `a, d, amt, dhp, s` | 회복. `dhp` = 회복 후 HP |
| `potion` | `u, s, i, amt, dhp, left` | **물약** [신설 2026-09-15 · R103 · `i` R104 · battle_design §7-1] — `u` = 마신 영웅 · **`i` = 마신 칸 번호**(0 = 앞 칸 · 칸은 앞부터 빈다 · **빈 칸(`null`)은 건너뛴다**) · `s` = 그 칸의 물약 id · `amt` = 그 칸 물약의 회복량(정해진 양 — 굴리지 않는다) · `dhp` = 마신 뒤 HP(최대치에서 자른다) · `left` = 남은 찬 칸 수. 시전(`skill`) 없이 선다 · 그 틱의 `regen` **뒤** · 행동 **앞** · 같은 틱에 여럿이면 HP 비율 낮은 순(같으면 파티 배열 순)이 **앞 칸부터** 받는다 · rng 0 |
| `buff` | `u, s, stat, v, until` (+ `amt` 배리어 총량 · **`hpMax`·`dhp` 최대 HP 가 바뀐 창**) | 창 적용 또는 갱신. `until` = 만료 시각(소수 1자리). **오오라** [2026-09-15 · R98] — `until: null`(만료 없음) · 시전(`skill`) 없이 선다 · 받는 유닛마다 하나 · 자리는 **`round` 바로 뒤**다: 파티 것(첫 라운드 = 전투 시작에 건 창 · 갈아입기로 다시 건 창 = 다음 라운드) → 그 라운드 적의 것 순. **결투(`duel`)는 둘을 낸다** — 지목당한 적의 창과 시전자 자신의 `dr_pct` 창(같은 `s`·`until` · 2026-09-10 R72). **최대 HP 를 미는 창**(`hp_max_pct`)은 `hpMax`(민 뒤의 최대치) · `dhp`(그 시점의 현재 HP)를 **함께 싣는다** [신설 2026-09-21 · 부채 #50] — 재생기는 계산하지 않으므로(§6) 안 실으면 옛 최대치를 든 채 현재 HP 만 갱신해 `118 / 103` 이 된다 |
| `buffEnd` | `u, s` (+ **`hpMax`·`dhp`**) | 창 만료 (그 틱의 행동 처리 **앞에서**) · 결투 시전자 창이 라운드 경계에서 닫힐 때(그 라운드의 `round` 이벤트 바로 앞 · 2026-09-10) · 갈아입기로 사라진 오오라(다음 `round` 바로 뒤 — 다시 건 오오라의 `buff` 보다 앞 · R98). 닫히며 최대 HP 가 바뀌면 **그 틱의 마지막 `buffEnd`** 가 `hpMax`·`dhp` 를 싣는다 [신설 2026-09-21 · 부채 #50] — 한 틱에 여러 창이 닫혀도 실린 값은 **전부 닫힌 뒤**의 상태다 |
| `end` | `won, reason` | **마지막 이벤트**. `reason ∈ clear \| wipe \| timeout` (`retreat` 폐기 2026-09-03) |

유닛 키: 파티 `p0..`, 적 `e0..`(라운드마다 0부터).

**순서 보장** — ① `t` 는 단조 비감소 ② `round` 가 라운드의 첫 이벤트(그 앞에 붙는 것은 경계의 `refit` · 결투 창 `buffEnd` 뿐 — 오오라 창의 `buffEnd` · `buff` 는 `round` **뒤**다 · R98 · **라운드 도중의 `refit` 은 그 시각에 서고 곧바로 그 갈아입기의 오오라 `buffEnd` · `buff` 가 잇는다** — R130) ③ `end` 가 마지막 ④ 같은 `t` 안에서는 배열 순서가 곧 발생 순서(스킬 이벤트도 같다 — `skill` 뒤에 그 시전의 타격·회복·버프가 이어진다).
**`card` 이벤트는 없다** [삭제 2026-09-14 · R89] — 도감 처치 수는 라운드를 이긴 순간 **조용히** 들어온다(결과 `kills`). 처치 순간 알릴 것이 없다. 도감 카드 자체가 2026-09-21 에 걷혔다(결과 `cards` 삭제 — 아래 §5-2 `onKill`). **타임라인은 걸음마다 자란다** [개정 2026-09-21 · R130 — ~~라운드마다~~] — `advance` 가 돈 틱만큼 붙는다(§6).

**스킬 실행 규칙** (정의·선택은 §2-8 `skill.js`, 실행은 여기):

| 규칙 | 내용 |
|---|---|
| 발동 | 행동 주기 도래 시 준비된 액티브 중 하나(§2-8 `pickReady`). 없으면 기본 공격. **한 차례에 하나**. 선택은 rng 를 쓰지 않는다 |
| 스킬 계수 | **시전 순간** `eff = skill.scaleDef(def, u.stats)` 를 한 번 만들고 그 **하는 일 줄**(`eff.effects` — 줄마다 민 **시전 단위** `x` · §2-8)을 차례로 실행한다 — 공격 대상 표·회복·버프(`v`·`until`)·소환이 전부 `x` 를 읽는다. 오오라는 전투 시작에 걸 때 한 번(`v = x.value`) · 평타 부여 창은 창의 `v` 가 `x.value` 다. 쿨(`cool_sec`)은 슬롯이 못 민다(skill_design §13-1). `stats` 가 없는 유닛은 계수 0 이라 `x` 가 원값과 같다 [2026-09-10 · R72 · 줄 단위 2026-09-22] |
| 표 셋 분리 [2026-09-22 · R136 · PLAN_skill_structure 1단계] | 스킬 정의가 표 셋(스킬 · 하는 일 · 걸린 효과 — §2-8)으로 갈라졌어도 **타임라인 이벤트는 하나도 안 바뀐다** — `skill` · `buff`(`s` = 거는 스킬 id · `stat` = 걸린 효과의 능력치) · `buffEnd` · `heal` · `summon` · `call` · `blast` 의 이름 · 필드 · 순서 · rng 소비가 그대로다(골든이 잠근다) |
| 쿨 | 시전 순간 `readyAt = t + cool_sec × max([balance.csv:skill_cd_floor_mult], 1 − cdr)`(실시간 초 — 바닥은 2026-09-01 코드 상수 `CD_MIN_MULT` 에서 CSV 키로). **처음엔 준비 상태다** [개정 2026-09-15 · R100] — 파티는 전투 시작, 적은 등장 라운드 시작에 곧바로 쓴다 · 원정 도중 새로 생긴 스킬만 갈아입은 순간부터 한 바퀴(같은 식 `skill_runtime.cooldownSec`). `cdr` 은 `combat_stat.csv:cooldown_reduction` — **표기 쿨에 곱**한다 |
| HP 재생 | 매 틱 `regenAcc += hp_regen × TICK`, 정수부가 1 이상이면 그만큼 회복하고 소수부만 남긴다(`hp = min(hpMax, …)`). **행동 처리 앞**에서 돌고 rng 를 안 쓴다. 소수점을 매 틱 더하면 타임라인이 흘러넘치고 재생기의 정수 HP 와 어긋나서 정수 단위로 끊는다 |
| 물약 [2026-09-15 · R103 · R104] | 찬 칸이 없는 런은 안 돈다 — 매 틱 **HP 재생 뒤 · 행동 앞**에 한 번 본다. 대상 = 파티 영웅 중 `hp > 0` · 소환 아님 · `hp / hpMax < [balance.csv:potion_use_hp_pct]` · `potionReadyAt ≤ t + EPS`. **HP 비율 오름차순 · 같으면 파티 배열 순**(명시 비교 · §5-3)으로 찬 칸이 남는 동안 한 명씩 **앞의 찬 칸**을 마신다(빈 칸 `null` 은 건너뛴다) — `hp = min(hpMax, hp + 그 칸의 heal)` · `potionReadyAt = t + [balance.csv:potion_cooldown_sec]` · 그 칸이 빈다 · `potion` 이벤트. **차례를 안 쓴다**(`next` 불변) · **rng 0** · 쓰러진 영웅 · 적 · 소환은 안 마신다 · 칸은 라운드를 넘어 줄어든 채 가고 런이 새로 열려야 찬다. ⚠ 화염 치유 감소는 미구현(`heal` 과 같은 처지) |
| 경직 [2026-09-17 · R110 · battle_design §2-3] | **거는 조건** — `strikeOnce` 의 직격이 적중했고 **그 타격 타입이 `physical`**(기본 공격 · 평타 광역 · 물리 스킬 타격 — 원소 태그 타격 · 원소 공격 몬스터는 아니다)이며 대상이 **살아 있고 소환이 아닐 때**, 그 타격으로 **실제로 줄어든 HP**(맞기 전 HP − 맞은 뒤 HP — 배리어가 먹은 몫은 빠지고 강타 몫은 든다)가 `대상 hpMax × [balance.csv:stagger_hp_pct]` 이상(값은 **비율**). 반사 · 빗나감은 안 건다(`strikeOnce` 밖이거나 적중이 아니다) · 영웅 ↔ 몬스터 같은 규칙.<br>**길이** — `dur = [balance.csv:stagger_sec] × max(0, 1 − fhr)`(`fhr` 은 **비율** — R111 단위 규약) · 피해 크기와 무관 · **`dur ≤ 0` 이면 아무 일도 없다**(면역 — 이벤트도 없다). ⚠ 타격 회복의 출처 · 상한은 기획 미정(GAME_DESIGN §10) — 지금은 출처가 없어 늘 0 이다.<br>**거는 법 — 그 유닛의 행동 예약을 민다**: `end = t + dur` → `next += end − max(stagUntil, t)` → `stagUntil = end` → `stagger` 이벤트. 처음 걸리면 차례가 `dur` 만큼 늦어지고, 경직 중에 다시 걸리면 **끝나는 시각만 새로 잡는다**(남은 시간에 더하지 않는다 — 옛 끝과 새 끝의 차이만 민다). 예약을 미는 것이라 **배열 순서와 무관하게** 차례가 정확히 그만큼 늦는다(같은 틱에 먼저 행동한 유닛은 다음 차례가, 아직 안 한 유닛은 이번 차례가 밀린다).<br>**멈추지 않는 것** — 스킬 쿨(`readyAt` 은 절대 시각이라 그대로 흐른다 — 풀리자마자 준비된 스킬이 나간다) · 창 만료 · HP 재생 · 물약(차례를 안 쓴다). 쿨까지 멈추는 것은 **스턴**이다(미구현). **rng 0** |
| 반격 [2026-09-18 · 사용자 확정 · item_design §1 「투구 옵션」] | **맞으면 확률로 그 자리에서 때린 적에게 기본 공격 1회 — 내 차례를 쓴다.** 판정 자리 = `strikeOnce` 의 **적중한 직격** 끝(그 타격의 `hit` · 경직 · 창 · 훅 · 반사 · 전투불능 처리가 다 끝난 뒤). 굴리는 조건 — 맞은 쪽 `counter > 0` · 살아 있다 · 소환이 아니다 · **경직 중이 아니다**(`stagUntil ≤ t` — 방금 이 타격으로 걸린 경직도 친다) · 때린 쪽이 살아 있다. 조건이 맞으면 **rng 1회** `rng() < counter` — 조건이 안 맞거나 `counter = 0` 이면 굴리지 않는다(반격 옵션이 없는 판의 수열은 종전과 같다).<br>터지면 `counter` 이벤트 → **기본 공격과 같은 함수**(`skill_runtime.basicAttack` — 평타 부여 창 · 흡혈 · 치명 · 경직 · 반사 · 무기 옵션 · 훅 전부 그대로)를 **때린 쪽을 대상으로**(타겟 굴림 0 · 광역 창이 켜져 있으면 평타처럼 적 전원) → **차례를 쓴다**: `next = period`(행동 예약이 한 바퀴 뒤로 — 평타를 친 것과 같다).<br>**반격도 직격이다** — 그 타격을 맞은 쪽이 다시 반격할 수 있다(평타와 같은 규칙 · 확률이 곱으로 줄어 끝난다 · `counter_chance` 행의 `max < 1` 을 로드가 검증한다). 영웅 ↔ 몬스터 같은 규칙 · 몬스터는 입은 투구대로 갖는다 |
| 조건부 받는 피해 감소 [2026-09-18 · item_design §1 「갑옷 옵션」] | 맞는 쪽 `fx` 가 있을 때 — `vsDr[때린 쪽 monsterType]` + (때린 쪽 grade ≠ normal 이면 `vsEliteDr`) + (때린 쪽 rank 0 / 1 이면 `vsFrontDr` / `vsBackDr`) 를 **더한 뒤 한 원천으로** `strike` 직전 `dr` 에 곱해 넣고(`1 − (1 − dr)(1 − 합)`) 그 타격이 끝나면 원복한다 — 종족 · 등급이 없는 영웅이 때리면 열 몫만 선다. rng 0 |
| 체력 회복 [2026-09-18 · item_design §1 「갑옷 옵션」 나태] | 회복받는 쪽의 `recv`(비율)만큼 늘린다 — **HP 재생**(누산에 `× (1 + recv)`) · **회복 스킬**(대상마다 `round(amt × (1 + recv))` — `heal` 이벤트의 `amt` 가 그 값) · **흡혈**(`formula.leech` 의 `recv`) · **물약**(`round(heal × (1 + recv))` — `potion` 이벤트의 `amt` 가 그 값). **배리어 · 최대 HP 창은 안 늘린다**. `recv = 0` 이면 값 · 수열이 종전과 같다. rng 0 |
| 자폭 [2026-09-21 · 사용자 확정 · battle_design §9-6 · skill_design §12-9] | **쓰러지는 순간 적 전원에게 한 번 터진다.** 자리 = `battle.js` 의 `downed` **끝**(`down` 이벤트 · 처치 정산 · `down` 훅이 다 끝난 뒤). 조건 — 그 유닛의 칸에 `cast=event` 이고 `cast_condition=on_death` 인 스킬이 있고 `blown` 이 안 섰다. <br>**세기 = `(atkMin + atkMax) / 2 × mult_pct`**(그 스킬의 `fixed` 줄 · §2-8) — 범위를 **굴리지 않고 중앙값**을 쓴다(rng 0 — 자폭이 없는 판의 수열은 종전과 완전히 같다). `formula.indirect` 를 지나 **방어 · 저항 · 피해 감소 · 배리어를 하나도 안 빼고** 맞는 쪽 HP 를 직접 깎는다(고정 피해). 적중 게이트 · 치명 · 스킬 배율 · 조건부 % · 추가 피해 없음 · **흡혈 · 반사 · 경직 · 타격 훅을 유발하지 않는다**(§9-6). <br>기여는 양쪽 다 센다(터진 쪽 `dealt` · 맞은 쪽 `taken`) · 맞아서 쓰러지면 그 자리에서 `downed` 가 다시 돈다. **한 마리당 한 번** — `blown` 은 되살아나도 안 풀린다(보상 `rewarded` 와 같은 규칙). 지금 구조에서 연쇄는 없다(몬스터의 자폭은 파티만 때린다) |
| 버프 창 | `until = t + duration_sec × (1 + 시전자 buffDur)` — **버프 지속시간**(반지 · 목걸이 공통옵션 · 2026-09-21 · R127)은 **거는 쪽**의 값이다(적에게 거는 창 · 결투의 짝 창도 같은 `until`). `buffDur` 0 이면 종전과 같다. 만료는 매 틱 **행동 앞에서** 일괄 처리(`until ≤ t + EPS`) → `buffEnd`. rng 소비 없음 |
| `atk_pct` | 상시 % 와 **같은 괄호에 덧셈**(`atkMinBase`·`atkMaxBase`/`atkPct` — 양끝 둘 다 · R90). 다른 스킬의 같은 stat 은 덧셈, 같은 스킬은 갱신. **회복 밑수 `matkMin`·`matkMax` 도 같은 괄호**(`matkMinBase`·`matkMaxBase` · 2026-09-01) — 함성 아래의 사제는 때리는 만큼 낫는다 |
| `period_pct` | `period = basePeriod × (1 − Σ)` — **다음 차례 예약부터**. 진행 중인 `next` 는 안 건드린다. 하한 처리 없음 |
| `barrier_pct` | `amt = round(대상 hpMax × v)`. 피해는 배리어 → HP 순. 재시전은 총량·`until` 을 다시 채우고, 창이 끝나면 남은 것은 사라진다. **흡혈·반사는 배리어가 먹은 몫을 포함한 `dmg`** 에 비례한다(직격이 들어간 사실은 같다) |
| `taunt` | 창이 켜진 **생존 파티원**이 있으면 적의 단일 대상 선택이 그 유닛(배열 순 첫 번째)으로 고정되고 **타겟 rng 를 쓰지 않는다**. ⚠ 기본 타겟팅(무작위) 위에 얹은 임시 규칙 |
| 추가 피해 | `proc_chance_pct > 0` 인 스킬의 **직격마다** `strike` 가 치명 **뒤에** 1회 더 굴린다(`rng() < min(확률, 1)`) — 터지면 `× proc_mult_pct`(치명과 곱 · 치명 상한과 무관). 빗나감은 굴리지 않고 **반사·기본 공격·평타 부여 추가타는 싣지 않는다**. 터진 타격만 `hit` 이벤트에 `proc: true` · 훅 `hit`/`hitTaken` payload 에 `proc` [2026-09-10 · R72 · battle_design §9-2] |
| 무기 옵션 [2026-09-11 · R78] | `u.fx` 가 있을 때만 — ① **조건부 %** — `strike` 직전 `condPct` 에 `vs[대상 monsterType]` + (대상 grade ≠ normal 이면 `vsElite`) + (대상 rank 0 / 1 이면 `vsFront` / `vsBack`) + (그 타격 타입이 원소면 `ele[원소]`) 를 **그 타격 동안만** 얹고 원복한다(**데미지 % 괄호 안의 덧셈** — ~~`bonusPct` 에 더한다 · 조건부 괄호~~ 2026-09-18 · battle_design §9-1) ② **강타** — 적중이면 `cb = round(맞기 직전 대상 hp × crush/100)` 을 `dmg` 에 더해 한 번에 깎는다 · 치명 · 방어 · 저항 · 피해 감소를 안 받는다 · **흡혈 · 반사는 `strike` 의 `dmg` 만** 본다 ③ **타격 시 창** — 적중이고 대상이 살아 있으면 `skill_effects.weaponOnHit`(§2-11) — `hit` 이벤트 뒤 · 사건 훅 앞. **셋 다 rng 0** |
| `duel` | 지목 창(적)을 열 때 **시전자에게** 같은 `until` 의 `dr_pct` 창(`v = x.value` — 기사 자신이 받는 피해 감소 %)을 함께 걸고 `buff` 이벤트를 하나 더 낸다. 창 키는 같은 스킬 id(창은 유닛마다 따로 든다). **라운드가 바뀌면 `beginRound` 가 시전자 창을 닫는다** — 소환물을 걷고 지목이 적 배열과 함께 사라지는 바로 그 시점이다(창이 999초라 만료로는 안 닫힌다) · rng 0 · 닫을 때 **기존 `buffEnd`** 를 낸다(만료와 같은 모양이라 재생기가 칩을 걷는다 · 그 라운드의 `round` 이벤트보다 앞) [2026-09-10 · R72 후속] |
| 타겟팅 | `enemy_single` 무작위 1 → 같은 대상에 `hits` 회 / `enemy_all` 생존 적 배열 순 전원 각 1회(타겟 rng 0) — **`decay > 0` 이면 주 대상**(전열 생존자 중 배열 첫 번째 · 전열이 비면 생존자 첫 번째 · rng 0)만 `mult` 그대로이고 나머지는 `mult × (1 − decay/100)` [2026-09-10 · R72 멀티샷] / `enemy_rotate` 시작점 무작위 → 배열 순으로 돌아가며 `hits` 회(모자라면 겹침) / `enemy_chain` 시작점 무작위 → 전원 각 1회, k번째(0-base) 배율 `mult × (1 − decay/100)^k` |
| 다단타 | **타격마다 `formula.strike` 1회** — 적중·치명·흡혈·반사·전투불능을 따로 굴린다. 스킬 배율은 `skillMult`, 원소 태그는 `atkType` 에 **그 타격 동안만** 얹고 원복한다(`strike` 시그니처 불변). **스킬 타격은 `{flat, procChance, procMult}` 도 같은 방식으로 얹는다** — 기본 공격(평타 부여 추가타 포함)은 0 이다 [2026-09-10]. ⚠ 대상이 쓰러지면 남은 타수는 **버린다**(재지정 없음) · 공격자가 반사로 쓰러지면 중단 |
| 회복 | `matk = matkMin + rng()×(matkMax − matkMin)` — **시전 한 번에 1회 · 대상 선택 앞** [2026-09-14 · R90 · battle_design §9-1] → `amt = round(matk × mult_pct × statMult)`(`statMult` = 능력치 계수 — §2-8 `scaleDef` · ~~`+ flat`~~ 2026-09-18 · 몬스터는 1) 를 대상 전원에게 **같은 양**으로(받는 쪽 `recv` 가 있으면 그 대상만 `round(amt × (1 + recv))` — 아래 「체력 회복」 행 · 2026-09-18), `hp = min(hpMax, hp + amt)`. 양끝은 **버프 괄호를 탄 값**(위 `atk_pct` 행 · battle_design §9-2 「회복 = 마법 데미지 × 배율」). **rng 1회**(대상 풀은 결정론 그대로). 화염 치유 감소는 미구현 · **배리어는 굴리지 않는다**(대상 최대 HP 비율 — 무기 피해를 안 쓴다 · 사용자 확인 2026-09-14) |
| 사건 훅 | `cast`(skill 이벤트 push 직후 · 시전자) · `hit`(hit 이벤트 push 직후 · 공격자) · `hitTaken`(같은 자리 · 피격자) · `kill`(`downed(target)` **뒤** · 공격자 — 드롭 rng 가 먼저 돈다) · `down`(쓰러진 유닛). `unit.reactions` 의 `{on, fn}` 을 **배열 순**으로 부른다. 핸들러가 rng 를 쓰면 **그 자리에서** 소비한다(§5-2). 등록이 없으면 rng·타임라인 불변 — 골든이 이것을 잠근다 (2026-09-01) |
| 결빙 | **아직 없다** — 옛 `skill.csv:status` 칸(아무도 안 읽던 결빙)은 표 셋 분리(2026-09-22)에서 버렸고, 결빙은 **걸린 효과 행**(`skill_status.csv`)으로 다시 들어온다(PLAN_skill_structure 4단계). `skill_effect.csv:status` 는 `apply` 줄이 거는 걸린 효과 id 다(§2-8) |
| `tags` | `skill.js` 가 **정규화·검증**하지만 **전투 로직은 읽지 않는다** — 소비자는 전술카드 조건·변형 노드·화면이다 (§2-8 · skill_design §11) |

### 2-7. `state.js` — 상태 전이

`export const SAVE_VERSION = 37`  [v37 = **건설** — `buildings`(건물 랭크) · `research` · `progress.peakTotal` · R137 · 2026-09-22] **[v37 에서 끊었다 — 그 전 세이브는 열지 않는다 · §4 · R139 · 2026-09-22]**

`createGameSystem(deps)` — `deps`: `hero, item, battle, skill, tactic, construction(§2-14 · R137), balance, equipSlots [{id, part}](착용 위치 8), stages(byId), stageOrder [id], monsters(byId), codex {levels:[cards_to_next], bonus:[%], statByNum:{stage_num: statKey}}`, **`sins [죄종 id]`** · **`searchStories`**(= `search_story.csv` 파싱 행) [신설 2026-09-09 — 수색]. **`makeRecipes`** `{part: {ore, timber, dust}}`(= `make_recipe.csv`) · **`mineNodes`** · **`logNodes`**(= `mine_node.csv` · `log_node.csv` 를 tier 순으로 편 행 `{id, tier, yieldId, …}`) [신설 2026-09-15 — 제작 · R96]. 레시피는 생성 때 검증한다 — **광석 · 목재 · 가루가 모두 1 이상**이 아니거나 없는 부위면 throw (보완재 · 원정 쪽 입력 — item_design §5-1 · §7-1). **`potions`** `[{id, kind, tier, ko, en, heal, craftGold, startOwned}]`(= `potion.csv` 행 순서 · ~~`craftable`~~ 2026-09-22 삭제 — 단계는 제련소 랭크가 연다 · R137) [신설 2026-09-15 — 물약 · R103]. 이 표도 생성 때 검증한다 — `id` 유일 · `kind` 는 `heal` 하나(모르는 종류는 멈춘다) · 같은 종류 안에서 `tier` 는 1 부터 연속 · `heal` 은 단계마다 커진다 · `craftGold ≥ 0` · **`startOwned` = 시작 개수**(0 이상 정수 — 2026-09-21 · R124 · 전엔 0/1 플래그) · 이름 ko/en 이 비지 않는다 — 어기면 throw. **`balance.party_preset_count`**(편성 수)는 1 이상 정수여야 한다 — 아니면 throw [2026-09-21 · R122].
**만남 표도 같은 자리에서 검증한다** [신설 2026-09-09] — `searchMeetings`(`search_meeting.csv`) · `searchAnswers`(`search_answer.csv`)도 주입이고, `meeting_id`·`answer_id` 유일 · `sin`/`hit_sin` 이 죄종 · `need_sin` 이 `-` 또는 죄종 · 답이 가리키는 만남이 실재 · 문구 비지 않음 · **만남마다 공통(`-`) 답이 최소 하나**(없으면 그 죄종을 안 보낸 판에서 고를 것이 0개가 된다)를 어기면 throw.
**컬럼 둘이 서로 다른 질문에 답한다** — `need_sin` = **누가 갔나**(그 답이 **보이는가**) · `hit_sin` = **누굴 만났나**(그 답이 **먹히는가**). 규칙은 이 둘이 전부다.

**수색 이야기 표는 로드 시 검증한다**(어긋나면 throw): `story_id`·`phase`·문구가 비지 않음 · `sin` 이 `-` 또는 죄종 · **막(`phase`)마다 `phase_order` 가 하나** · `phase_order` 가 **1부터 연속** · **막마다 공통(`-`) 행이 최소 하나**(없으면 그 죄종에서 후보가 비어 「막마다 굴림 1회」가 깨진다). **막의 어휘도 순서도 코드에 없다** — 막을 늘리는 일이 CSV 행 추가뿐이 되게 한 것이다(`tactic_slot.csv` 의 「칸 수 = 행 수」와 같은 문법).
`codex.levels`/`codex.bonus` 는 codex_level.csv(`kills_total`/`bonus_pct` — levels 는 **누적 처치 문턱**) · `codex.statByNum` 은 codex_series.csv 출처. `equipSlots` 는 equip_slot.csv 를 `slot_order` 로 정렬한 것(08-31 — mock 잔류 해소).

**모든 함수는 `state` 를 첫 인자로 받고 그 객체를 직접 바꾼다.** 시스템 자체는 무상태. 시각이 필요한 함수는 `now`(ms) 를 받는다.

| export | 시그니처 | 결과 |
|---|---|---|
| `newGame(seed, candidates, now)` | `→ state` | 후보 = **로스터**. 각자 **시작 무기 + 시작 갑옷**을 입는다 [개정 2026-09-14 · R86 — 둘 다 `normal`]. 시작 장비 rng = `deriveSeed(seed, 0)` — 영웅마다 무기(`startingWeapon(rng, cls, innate)`) → 갑옷(`startingArmor(rng)`) 순. **시작 물약** [2026-09-15 · R103 · 개수 2026-09-21 · R124] — `potions` = `{id: start_owned}`(`start_owned > 0` 행 · 지금은 마이너 힐링 포션 1개) · **편성 1 의 물약 칸**에 그 물약들이 **행 순서대로 한 칸씩** 든다(칸 수에서 자른다 · 나머지 칸 · 편성 2 부터는 빈다) · rng 0.<br>**편성 1 에 시작 영웅 셋이 들어 있다** [개정 2026-09-21 사용자 지시 · ADR-0227 · ~~빈 파티~~ 2026-09-09 폐기] — `presets` = `[balance.csv:party_preset_count]` 개 · 고른 편성 `preset = 1` · **편성 1 의 파티 = 로스터 순서 그대로**(`party_size_max` 에서 자른다)이고 `normalizeFormation` 이 진형 자리를 준다 · **편성 2 부터는 빈다**(시작 물약 칸과 같은 자리). 파티는 넣은 순서 그대로이므로 **`party[0]` 이 리더**다 — 로스터 첫 영웅이 그 자리에 선다. rng 0. ⚠ **전투를 바로 돌리는 쪽**(골든 · `dev/test.js` · `?dev=battle\|play\|offline`)은 이제 **직접 채우지 않는다** — `toggleParty` 로 또 넣으면 **빼기로 뒤집혀** 파티가 빈다 |
| `serialize(state, now)` | `→ json` | `clone + {version, savedAt}`. 순수 |
| `deserialize(obj)` | `→ state` **또는 throw** | **`SAVE_VERSION` 만 연다** — 그 전 버전은 throw 한다(§4 「v37 에서 끊었다」 · R139). 다음 버전부터는 안에서 한 단계씩 올린다. 누락 필드 기본값 보정 · **편성 수 · 물약 칸 수를 그 세이브의 상한(`limitsOf` — 건물 랭크의 더하기)에 맞춘다** [2026-09-21 · R122 · 건물 2026-09-22 · R137] — 건물 랭크를 **먼저** 표에 맞추고(`fitRanks`) 편성이 모자라면 빈 편성을 붙이고 넘치면 뒤를 자른다 · 칸도 같다 · 고른 번호는 범위로 자른다. **가방 · 창고는 넘쳐도 안 자른다**(아이템은 소유물 — 새 드롭 · 옮기기만 막힌다 · 사용자 확정 2026-09-22) |
| `canLoad(obj)` | `→ bool` | `deserialize` 가 통과하는가. **받아들이는 버전 목록을 두 곳에 두지 않기 위해** 실제로 한 번 돌려 보고 답한다 — 화면이 버전 숫자로 직접 판정하면 이관을 늘릴 때마다 멀쩡한 세이브를 거부하게 된다 |
| `heroById(state, uid)` · `heroItems(state, h)` | 조회 | ~~`isOut(state, uid)`~~ 는 **2026-09-08 삭제** — 「출정 아웃」 폐기로(GAME_DESIGN §9 09-08) **전투 밖에 아웃된 영웅이 존재하지 않는다.** 아웃은 런 안에서만 살고 런은 출발 순간 통째로 정산되므로, 상태가 답할 수 있는 질문이 아니다 (R54) |
| `codexLevel(kills)` · `codexNext(kills)` · `codexMaxLevel()` · `codexBonusAt(lv)` · `codexBonus(state)` | 도감 | 입력은 **그 몬스터의 누적 처치 수**(`state.codexKills[id]`) · `codex.levels` 는 **누적 문턱**이라 그대로 비교한다 [2026-09-21 — 카드 → 처치 수] · `codexNext` = 다음 레벨의 누적 문턱(최종이면 `null`) |
| `heroCombat(state, h, party?, no?, tactic?)` | `→ combat` | `computeCombat(h, 착용품, codexBonus, 파티 전술)`. **`tactic`** [신설 2026-09-21 · R130] = 전술 보너스(`{flat, dr}`)를 **덮는다** — 원정은 **출발 때 켜진 전술만** 산다(`departRun` 의 스냅숏 · tactic_card_design §2-1)라 `partyUnits` 가 그 보너스를 넘긴다(파티에 든 영웅에게만 붙는 것은 같다). 안 주면 종전대로 편성 `no` 의 칸을 지금 센다. **전술은 `party`(기본 = 고른 편성의 파티 `partyOf(state)`)에 든 영웅에게만** 넘어가고 조건도 그 `party` 로 센다 — 벤치는 `null` (§2-9). **칸의 내용은 편성 `no`(기본 고른 편성)의 것이다** [2026-09-21 · R129 — 전술 칸이 편성마다]. **원정은 나간 인원과 나간 편성을 넘긴다**(`partyUnits`) — 원정 중에 편성을 바꾸거나 다른 편성을 골라도 도는 원정의 전술이 안 흔들린다 [R92]. 착용품은 `item.effective` 를 통과해 들어간다 — **강화 배율을 아는 곳은 `item.js` 하나**이고 `hero.computeCombat` 은 `up` 을 모른다 |
| `heroCombatIf(state, h, itemUid)` | `→ combat` | **「이 아이템을 끼면」** [신설 2026-09-15 · 아이템 툴팁 스킬 칸의 맥락 · SCREEN_DESIGN §6] — 영웅 사본의 `equipTarget` 자리에 그 아이템을 넣고 `heroCombat` 을 부른다. **원본을 안 건드린다**(영웅 · 상태의 얕은 사본 · rng 0 · 세이브 무관). **전술 조건도 사본으로 센다** — 무기가 바뀌면 죄종 수 · 스킬 태그가 바뀌어 칸이 켜지고 꺼질 수 있다. 다른 영웅이 그 아이템을 끼고 있으면 그 영웅의 사본에서 뺀다(한 개체가 두 몸에 서지 않는다). **`h` 가 이미 끼고 있거나 아이템이 없으면 `heroCombat(state, h)` 그대로**. ⚠ `canEquip` 은 안 본다 — 그날 늘 통과였다. 끼울 수 없는 조합이 생기면 이 행을 다시 정한다 |
| `equipTarget(hero, item)` | `→ position 또는 null` | 같은 부위의 빈 위치 우선, 없으면 첫 위치 |
| `equip(state, heroUid, itemUid, position?)` | `→ {ok, back:[uid], position}` / `{ok:false, err}` | err: `missing` · `class` · `bagFull` · **`downed`**(도는 원정에서 쓰러져 있는 영웅 — 그 런이 끝날 때까지 장비 · 스킬 트리를 못 바꾼다 · 쓰러진 영웅의 장비를 벗겨 산 영웅에게 넘기는 길을 막는다 · 2026-09-21 · R130 · base_expedition_design §1-5 — **다른 검사보다 먼저 본다**). **`back` 은 언제나 0~1개** — 양손↔보조 배타가 사라져 둘이 돌아오는 경우가 없다 (2026-09-01) |
| `unequip(state, heroUid, position)` | `→ {ok}` / `{ok:false, err}` | err: `missing` · `bagFull` · **`downed`**(`equip` 과 같다 · R130) |
| `salvage(state, itemUid)` | `→ {ok, dust, from}` / `{ok:false, err}` | err: `missing` · **`locked`**(2026-09-21 · ADR-0185). **가방 · 창고** 아이템(v24 · §4) — 착용 중인 것은 `missing` · `from` = `'bag'` \| `'stash'` |
| **`setItemLock(state, itemUid, on)`** | `→ {ok, locked}` / `{ok:false, err}` | [2026-09-21 · ADR-0185] 자물쇠 하나를 켜고 끈다 — 잠긴 것은 `salvage` 가 `locked` 로 거절한다. err: `missing`(보관 두 칸에 없다 — 착용 중인 것은 어차피 분해되지 않는다). **끄면 `locked` 필드를 지운다**(`false` 를 남기지 않는다). **여러 개를 받는 함수는 없다** — 부르는 쪽이 고른 만큼 반복한다 |
| **`setAutoSalvage(state, rule)`** | `→ {ok}` / `{ok:false, err}` | [2026-09-21 · R125 · item_design §6-5] 알아서 분해의 선을 바꾼다 — `rule = {rarity, ilvlBelow}` · `rarity ∈ null`(안 봄) · `'normal'`(일반 이하) · `'magic'`(매직 이하) · `ilvlBelow` = 0 이상 정수(0 = 안 봄 · 그 **미만**이 걸린다). 준 키만 바꾼다. err: `invalid`. **가방의 것은 건드리지 않는다** — 다음 드롭부터 먹는다 · rng 0 |
| **`autoSalvagePreview(state)`** | `→ {n, dust}` | [R125] **지금 선으로 [지금 인벤토리에도 적용]을 누르면** 갈릴 개수와 가루 — 인벤토리만 · 잠근 것 제외. 선이 없으면 `{n:0, dust:0}`. 상태를 안 바꾼다 |
| **`applyAutoSalvage(state)`** | `→ {ok, n, dust}` | [R125] 인벤토리에서 선에 걸린 것을 분해한다(`salvage` 와 같은 반환량) — **창고 · 착용 · 잠근 것은 안 건드린다**. 걸린 것이 없으면 `{ok:true, n:0, dust:0}`. 확인(두 번 누르기)은 화면 소관 |
| **`sortStorage(state, where, key)`** | `→ {ok}` / `{ok:false, err}` | [2026-09-21 · ADR-0242 · SCREEN_DESIGN §6] 보관 한 칸(`where` = `'bag'` \| `'stash'`)을 **한 번 줄 세운다** — 그 뒤 새 드롭은 원래대로 끝에 붙는다(늘 정렬된 상태가 아니다). `key` = `'rarity'`(등급 → 레벨 → 부위) · `'ilvl'`(레벨 → 등급 → 부위) · `'slot'`(부위 → 등급 → 레벨). 등급 · 레벨은 **높은 것이 앞**, 부위는 `equip_slot.csv` 의 부위 순서, 등급 사다리는 일반 → 매직 → 레어 → 크래프트 → 유니크. 셋이 다 같으면 **원래 순서를 지킨다**(안정 정렬). err: `invalid`(모르는 `where` · `key`). 칸의 **순서만** 바꾼다 — 개체 · 개수 · 세이브 스키마 무변경 · rng 0 |
| `upgradeState(state, itemUid)` | `→ {up, max, cost, gold, open, upgradeable, canUpgrade}` / `null` | **판정을 여기서 다 낸다.** `open` = 강화가 열렸나(제련소 — `hasFeature('upgrade_item')` · 닫혀 있으면 `canUpgrade` 도 `false` · R137) · `upgradeable` = 베이스 능력치가 있는 부위인가(목걸이 · 반지 = `false` — `cost` 도 `null`) [R95]. ~~`optionAt`~~ 은 **R95 퇴역**(옵션 계단이 없다). 없는 아이템이면 `null` |
| `upgradeItem(state, itemUid)` | `→ {ok, up, cost}` / `{ok:false, err}` | err: `missing` · **`noBase`**(R95) · `maxUp` · `gold` — **이 순서로 본다.** **가방·착용 가리지 않는다**(`items` 에 있으면 된다) — 강화는 소유물에 하는 일이지 자리에 하는 일이 아니다. **rng 를 안 쓴다** [R95] — ~~`counters.upgrade++` · rng = `deriveSeed(seed ^ 0xF0C3, counters.upgrade)`~~ · ~~`affix`~~ |
| **`makeLevels(state?)`** | `→ [{level, chapter, ore, timber, open?}]` | **제작 레벨** — **`state` 를 주면 레벨마다 `open`**: 제작이 열렸고(`make`) 앞에서부터 `limitsOf(state).makeLevels` 개 안에 드나(제련소 랭크가 앞에서부터 연다 · R137) [신설 2026-09-21 · item_design §7-1 개정 — ~~`makeBands()` → `[{band, lo, hi, ore, timber}]`(레벨대 = 챕터 · R96)~~ 대체]. 레벨 = **1** 과 **챕터마다 끝 레벨**(`stage.csv:dlvl` 의 챕터 최댓값) — 오름차순 · 겹치면 하나. `chapter` = 그 레벨이 든 챕터(레벨대 (챕터 n−1 끝, 챕터 n 끝] · 첫 레벨대는 1 부터 — Lv1 · Lv10 은 챕터 1). `ore` · `timber` = **그 챕터 단계**의 산출물 id(`mine_node` · `log_node` 의 tier = 챕터). 둘 중 하나라도 그 단계가 없으면 그 레벨은 목록에 없다. `state` 가 없으면 상태를 안 본다 |
| **`makeState(state, part, level)`** | `→ {part, level, kinds:[{id, ko, en, group, baseId}], cost:[{kind, id, need, have}], canMake, err}` / `null` | **판정을 여기서 다 낸다** [신설 R96 · 개정 2026-09-21 — 레벨 · 종류]. `kinds` = 고를 수 있는 **종류** = `item.basesAt(part, level)` 한 줄씩 — `baseId` · `ko` · `en` = **만들어질 베이스**. 무기는 `id` · `group` = 무기군이고 베이스는 `item.weaponBaseAt(무기군, level)`(레벨을 바꾸면 바뀐다 · 2026-09-21) · 무기 외는 `id` = `baseId` = 베이스. `kind` ∈ `ore` · `timber` · `dust` · `id` = 산출물 id(가루는 `null`) · `need` = `make_recipe.csv` 의 그 부위 칸(**종류와 무관**) · `have` = `materials[id]`(가루는 `resources.dust`). `err` = 지금 누르면 나올 거절(**`unbuilt`**(그 레벨이 안 열렸다 — `makeLevels(state)` 의 `open` · R137) → `materials` → `bagFull` 순) 또는 `null` — 종류와 무관하다. 없는 부위 · 레벨이면 `null` |
| **`makeItem(state, part, level, kind)`** | `→ {ok, uid}` / `{ok:false, err}` | **제작 1회** [신설 R96 · 개정 2026-09-21]. err: `missing`(없는 부위 · 레벨 · `kinds` 밖의 종류) · `materials` · `bagFull` — 이 순서로 보고 **거절이면 아무것도 안 바뀐다.** 통과하면 재료를 레시피만큼 내고 `counters.make++` · rng = `deriveSeed(seed ^ 0xC4AF, counters.make)` → `item.rollGear(rng, {slots:[part], ilvl: level, rarityWeights, weaponGroup: kind + weaponBase: 그 줄의 baseId \| itemBase: kind})`(가중치 = `make_rarity_w_*` · **ilvl 은 고른 레벨 그대로** — ~~ilvl 1회 레벨대 균등~~ 폐기) → `addItem` 으로 uid → **인벤토리 끝**에 넣는다. `up = 0` · 실패 없음(item_design §7) |
| **`potionState(state)`** | `→ {slotMax, useHpPct, cooldownSec, list:[{id, kind, tier, heal, cost, have, craftable, canMake, err}]}` | **물약 화면 상태** [신설 2026-09-15 · R103 · 개정 2026-09-21 · R124 — 개수] — **판정을 여기서 다 낸다.** `list` = `potion.csv` 행 순서 · `cost` = `craftGold` · **`have` = 재고 개수**(없으면 0) · `craftable` = 그 단계가 열렸나 — **제련소 랭크가 연다**(단계 ≤ `limitsOf(state).potionTier` · R137 · ~~`potion.csv:craftable` 임시 칸~~ 2026-09-22 삭제) · `err` = 지금 누르면 나올 거절(`locked` → `gold` 순) 또는 `null` · `slotMax` · `useHpPct` · `cooldownSec` = `balance.csv:potion_*` 그대로. ~~`owned`~~ · ~~`loadout`~~ 은 **2026-09-21 퇴역** — 개수가 생겨 「가졌나」가 `have > 0` 이 됐고, 칸은 편성마다라 한 줄로 못 낸다(`presetState` 가 편성마다 낸다). 상태를 안 바꾼다 · rng 0 |
| **`makePotion(state, potionId)`** | `→ {ok, id, cost, have}` / `{ok:false, err}` | **물약 제작 1회** [신설 2026-09-15 · R103 · 개정 2026-09-21 · R124 — **거듭 만든다**]. err: `missing`(표에 없다) · `locked`(지금 제작이 안 열린 단계) · `gold` — 이 순서로 보고 **거절이면 아무것도 안 바뀐다.** 통과하면 `craftGold` 만큼 골드를 내고 **재고를 1 올린다**(`have` = 올린 뒤 개수). ~~`owned`~~ 거절은 퇴역 — 물약이 마시면 주는 소모품이 됐다. **rng 0 · 카운터 불변**(`counters.make` 는 장비 제작 스트림이라 안 건드린다) · 실패 없음 · 원정 중에도 만든다(도는 런의 칸은 안 바뀌고 다음 런부터 칸을 채운다) |
| `toggleParty(state, uid, now)` | `→ {ok}` / `{ok:false, err}` | **고른 편성**의 파티에 넣고 뺀다 [편성 2026-09-21 · R122 — 번호를 안 받는다: 편성 탭은 늘 고른 편성을 편다 · `selectPreset`] · **한 영웅이 여러 편성에 들어가도 된다** · **원정 중에도 넣고 뺀다** — 도는 원정은 나간 인원 그대로 싸운다(`runParty` · R92). err: `missing` · `full` · **`searching`**(수색 나가 있다 — 마을에 없으므로 편성할 수 없다 · 신설 2026-09-09). 넣을 때만 본다 — 뺄 때는 검사가 없다(나가 있는 영웅은 애초에 파티에 못 들어간다). (~~`injured`~~ 는 2026-09-03 에 검사 자체가 사라졌다 — 계약 문서에만 남아 있던 것을 09-06 에 지웠다) |
| `formationState(state)` | `→ {tpl, caps, ranks, byUid, templates, shapes}` | **읽기 전용 · 순수하다** — **고른 편성**의 진형(§4 `presets[].formation` · 2026-09-21). `caps` = 랭크별 정원 · `ranks[r]` = 그 랭크의 uid 배열 · `byUid[uid]` = 랭크 번호 · `templates` = **표의 행 순서**(⚠ `Object.keys` 는 `'3'` 같은 정수형 키를 앞으로 끌어올려 첫 행을 못 준다) · `shapes[tpl]` = 그 템플릿의 정원. 신설 2026-09-09 |
| `setFormation(state, tpl)` | `→ {ok}` / `{ok:false, err}` | **고른 편성**의 템플릿을 바꾼다. err: `missing`(표에 없는 템플릿). 원정 중에도 바꾼다 — 도는 원정은 자리를 다시 안 읽는다(§2-6 `createRun` · R92). 정원이 갈리므로 재배치가 따라온다. 신설 2026-09-09 |
| `placeFormation(state, uid, rank, idx?)` | `→ {ok, swapped}` / `{ok:false, err}` | **고른 편성** 안에서 옮긴다. err: `missing`(그 편성의 파티 밖 · 없는 랭크 · **정원 밖 칸**). 원정 중에도 옮긴다(R92). **`idx` 를 주면 그 칸이 목적지다** [2026-09-11 · 편성 드래그 · SCREEN_DESIGN §4-1] — 주인이 있으면 **그 주인과** 맞바꾸고(같은 랭크 안에서도 · `swapped` = 그 주인), 비었으면 그 랭크 끝으로 간다(칸은 늘 앞부터 차서 빈 칸은 랭크 끝에만 있다 · `swapped` = `null`). **`idx` 를 안 주면** 정원이 찼을 때 **그 랭크의 마지막 하나와 맞바꾼다**(`swapped` = 밀려난 uid · 아니면 `null`). rng 를 안 쓴다. 신설 2026-09-09 |
| `rankOf(state, uid)` | `→ 0 \| 1` | 그 영웅의 자리(**고른 편성** 기준). 배치가 없으면 **전열(0)** — 자리를 못 받은 유닛이 뒤에 숨지 않는다. 신설 2026-09-09 |
| **`presetState(state)`** | `→ {count, activeNo, runNo, slotMax, presets:[{no, party:[uid], formation:{tpl, ranks}, potionSlots:[{id, short} \| null], err}]}` | **편성 화면 상태** [신설 2026-09-21 · R122 · R124 · SCREEN_DESIGN §15 · §4-1] — **판정을 여기서 다 낸다.** `count` = `[balance.csv:party_preset_count]` · `activeNo` = 고른 편성 번호(1 부터) · `runNo` = **도는 원정의 편성 번호**(없으면 `null` — 고르개의 「원정 중」 표시) · `slotMax` = 물약 칸 수. 편성마다: `party` = 넣은 순서(`[0]` 이 리더) · `formation` = 저장된 진형(파생은 `formationState`) · `potionSlots` = 칸 수 길이 — 칸마다 `null`(빈 칸) 또는 `{id, short}` · **`short` = 재고가 모자라 런에서 빈 채 시작할 칸**(앞 칸부터 재고를 떼어 세므로 같은 물약이 여러 칸이면 **뒤 칸부터** 모자란다 · 표에 없는 id 도 `short` — `departRun` 이 칸을 채우는 것과 **같은 함수**다) · `err` = 그 편성으로 지금 나가면 나올 거절(스테이지 무관 — `noParty` → `searching` 순) 또는 `null`. 상태를 안 바꾼다 · rng 0 |
| **`selectPreset(state, no)`** | `→ {ok}` / `{ok:false, err}` | **편성 고르기** [신설 2026-09-21 · R122] — `state.preset = no`. 편성 탭 · 출정 창 · 상단바가 **같은 값 하나**를 쓴다(SCREEN_DESIGN §15). err: `missing`(정수가 아니거나 1 ~ 편성 수 밖). **원정 중에도 고른다** — 도는 원정은 제 편성 번호를 들고 있다(`run.preset`) · rng 0 |
| **`partyOf(state, no?)`** | `→ uid[]` | **편성의 파티** [신설 2026-09-21 · R122] — `no` 를 안 주면 **고른 편성**. 복사본이다(바꿔도 상태가 안 바뀐다) · 없는 번호면 `[]` · rng 0. 기본값으로 이것을 쓰는 곳 — `heroCombat` · `tacticState` · `tacticBonus`(뒤 둘은 `partyOf(state, no)` — 칸을 읽는 편성의 파티) |
| **`setPotionSlot(state, slot, potionId)`** | `→ {ok, slot}` / `{ok:false, err}` | **고른 편성의 물약 칸 하나를 채우거나 비운다** [신설 2026-09-21 · R124 · SCREEN_DESIGN §15 · ADR-0195]. `slot` = 칸 자리(0 = 앞 칸) · **`null` 이면 앞의 빈 칸** · `potionId` = `null` 이면 비운다 · 있던 것은 빠진다(칸은 구성일 뿐 재고를 안 잡는다). **재고를 안 본다** — 0 개인 물약도 넣을 수 있고 런에서 빈다(`presetState` 의 `short`). **같은 물약을 여러 칸에 넣어도 된다.** err: `missing`(없는 칸 · 표에 없는 물약) · **`slotsFull`**(`slot = null` 인데 빈 칸이 없다). 원정 중에도 바꾼다 — 도는 런의 칸은 안 바뀐다 · rng 0 |
| **`swapPotionSlot(state, a, b)`** | `→ {ok}` / `{ok:false, err}` | **고른 편성의 물약 칸 둘을 맞바꾼다** [신설 2026-09-21 · R124] — **앞 칸부터 마시므로 순서가 결정이다**(빈 칸과도 바꾼다). err: `missing`(없는 칸). 같은 칸이면 `{ok:true}` · rng 0 |
| ~~`returnToTown(state)`~~ | — | **2026-09-08 삭제** (R54). 「출정 아웃」이 없어져 **귀환이 회복할 것이 없다** — 회복은 런이 끝나는 순간 자동이고 상태에 남는 것이 없다. 호출하던 세 자리(반복 미이어짐 · 전멸 · `closeRun`)에서 함께 걷었다 |
| ~~`activeParty(state, stageId)`~~ | — | **2026-09-08 삭제** (R54). 아웃이 런을 넘지 않으므로 **언제나 `state.party` 전원**이 나간다 — 뺄 명단이 없다 |
| `stageUnlocked(state, stageId)` | `→ bool` | 첫 스테이지 또는 직전 클리어 |
| `stageLevelState(state, stageId)` | `→ {base, max, level, open}` / `null` | **스테이지 레벨** [신설 2026-09-14 · R87 · base_expedition_design §1-4] — **판정을 여기서 다 낸다.** `base` = `stage.csv:dlvl` · `max` = **클리어한 스테이지의 기본 레벨 중 최고**(키가 없다 — `progress.cleared` 에서 파생 · 아무것도 안 깼거나 그 스테이지가 더 높으면 `base`) · `level` = `base + progress.levelUp[stageId]` 를 `[base, max]` 로 자른 값. 올린 스테이지는 상한 이하라 **그걸 깨도 상한이 안 오른다** — 그래서 기본 레벨만 봐도 「클리어한 최고 레벨」이다. **원정 건물 랭크가 연다**(`open` = `hasFeature('stage_level')` · R137 · ~~처음부터 열림 — 사용자 09-14~~) — 안 열렸으면 `max = level = base`(올린 기록은 세이브에 남고 열리면 다시 먹는다). 없는 스테이지면 `null` · rng 를 안 쓴다 |
| `setStageLevel(state, stageId, level)` | `→ {ok, level}` / `{ok:false, err}` | err: `missing`(없는 스테이지) · **`unbuilt`**(안 열렸다 · R137) · `range`(정수가 아니거나 `[base, max]` 밖). **올린 양을 적는다** — 기본 레벨로 돌리면 기록을 지운다(안 올린 스테이지는 적지 않는다). 비용 없음 · 되돌리기 자유 · rng 를 안 쓴다. 신설 2026-09-14 · R87 |
| `canDepart(state, stageId, now, no?)` | `→ null` / `unbuilt` / `locked` / `missing` / `noParty` / `searching` | 편성 `no`(기본 **고른 편성**)로 나갈 수 있나 — 이 순서로 본다 [편성 2026-09-21 · R122]: **원정이 안 열렸다**(`expedition` — 처음부터 지어짐 · R137) → 스테이지 잠김 → 없는 편성 → **그 편성의 파티가 비었다** → **그 편성에 수색 나간 영웅이 있다**(편성은 계획이라 든 채로 수색을 보낼 수 있고 여기서 막는다). **원정이 도는 중이어도 막지 않는다** — 보내면 `departRun` 이 그 원정을 끊는다 [R92] · ~~`injured`~~ 없음 (2026-09-03) |
| `runParty(state)` | `→ uid[]` | **지금 싸우는 영웅** [신설 2026-09-14 · R92] — 도는 원정(`run.active`)이 나갈 때의 인원(판정이 아직 없는 그 원정 리포트의 `party`) · 도는 원정이 없으면 `[]`. 원정 중에도 편성을 바꾸고 고르므로 **고른 편성의 파티와 다를 수 있다**. `dismiss`(`running`) · `searchSend`(`party`) · `searchState.ready` 가 이것으로 막고, 영웅 띠의 「원정 중」이 이것을 읽는다 · rng 를 안 쓴다 |
| `heroBusy(state, uid)` | `→ 'run' \| 'search' \| null` | **영웅이 지금 하는 일** [신설 2026-09-22 · 구조 감사] — `'run'` = 도는 원정의 인원(`runParty`) · `'search'` = 수색 나감 · `null` = 마을. **영웅을 붙잡는 활동의 판정은 이 한 곳이다** — 편성(`toggleParty` 의 `searching`) · 출발(`canDepart` 의 `searching`) · 해고(`dismissState`) · 수색(`searchSend` 의 `party` · `searchState.ready`) · 영웅 띠의 「지금 하는 일」이 모두 이것을 읽는다. 파견 · 훈련처럼 영웅을 붙잡는 활동이 생기면 여기에 더한다. 둘은 겹치지 않는다(싸우는 영웅은 수색에 못 나가고 수색 나간 영웅이 든 편성은 못 나간다). **쓰러짐(`run.fallen`)은 하는 일이 아니라 전투 안의 상태**라 여기 없다 · rng 0 · 아무것도 안 바꾼다 |
| **`constructionState(state)`** | `→ {built, total, tabs, buildings: [{id, name, tab, rank, maxRank, next, ranks}]}` | **건설 탭이 읽는 한 벌** [신설 2026-09-22 · R137 · construction_draft §11] — 건물마다 지금 랭크 · **다음 랭크 판정**(`construction.nextState` — 조건 · 비용(가진 양 포함) · 여는 것(준비 중 표시) · err) · **랭크마다 한 줄** `ranks: [{rank, built, effects, require}]`(조건은 지금 값 포함 — 비용은 다음 랭크의 `next` 만 든다) · `tabs` = 화면 탭마다 열렸나(`construction.tabs` — 흐린 탭) · `built` / `total` = 지은 랭크 수 / 표의 랭크 수. rng 0 · 상태 불변 |
| **`construct(state, buildingId)`** | `→ {ok, rank}` / `{ok:false, err}` | **다음 랭크를 짓는다** [R137] — **한 칸씩 · 즉시 · 되돌림 없음**(construction_draft 원칙 5). 판정은 `constructionState` 와 같은 것 하나다 — err: `missing` · `maxRank` · `pending` · `locked` · `gold` · `materials`. 비용을 치르고(`gold` · `dust` · `stigma` 는 `resources` · 그 밖은 `materials`) 랭크 +1 · **편성을 새 상한에 맞춘다**(`deserialize` 와 같은 맞추기 — 편성 수 · 물약 칸이 더하기로 늘면 빈 자리를 곧바로 붙인다 · 2단계) · rng 0 |
| **`hasFeature(state, id)`** | `→ bool` | **창구 — 그 기능이 열렸나** [R137] — 지어진 랭크의 여는 것(`construction.opened`)에 그 켜기가 있나. **켜기 대상이 아닌 이름은 throw**(오타를 닫힌 기능으로 두지 않는다). **기능 자리마다 한 줄씩 묻는다** [2단계 2026-09-22] — 막히면 그 자리의 거절 코드는 **`unbuilt`**(§3) · 상태 함수는 `open` 칸을 낸다. 자리: `canDepart`(expedition) · `nextRepeat`(repeat) · `stageLevelState` · `setStageLevel`(stage_level) · `upgradeState` · `upgradeItem`(upgrade_item) · `makeLevels` · `makeState` · `makeItem`(make) · `moveToStash`(storage — 꺼내기는 안 막는다) · `tavernState` · `hire` · `tavernReroll`(hire) · `searchState` · `searchSend`(search) · `shopState`(shop · shop_special) |
| **`bonusOf(state, target)`** | `→ 배율` | **창구 — 연구 배율**(`construction.bonus`) [R137] — 연구 항목이 비어 **지금은 언제나 1** · 모르는 대상은 throw |
| **`needOf(target, n = 1)`** | `→ {id, name, rank}` / `null` | **창구 — 무엇을 지어야 열리나** [2단계 2026-09-22 · R137] — `construction.reach`. 잠긴 자리가 「선술집 2랭크 필요」를 말할 때 읽는다. 켜기는 이름만(`needOf('search')`) · 더하기는 **기본값 위로 몇이 필요한가**(`needOf('tactic_slots', 3)` = 셋째 전술 칸 — 제작 레벨 · 물약 단계 · 전술 칸은 기본값이 0 이라 순번 그대로) · 표에 없으면 `null`(화면은 「준비 중」). 상태를 안 본다 |
| **`peakTotal(state)`** | `→ n` | 로스터 합산 레벨의 **도달 최고치** `max(progress.peakTotal, 지금 합산)` [R137] — **`dismiss` 가 합산을 내리기 전에 적는다**(해고로 내려가도 닫히지 않는다 · construction_draft 원칙 3). 건설 문턱 `total:` 이 읽는다 |
| `limitsOf(state)` | `→ {bag, stash, roster, party, presets, potionSlots, upgrade, tavernCandidates, searchSlots, shopPerSlot, shopWeapon, makeLevels, potionTier, tacticSlots}` | **상한 — 이 세이브가 쓸 수 있는 칸 · 인원 · 단계의 수** [신설 2026-09-22 · 구조 감사 · construction_draft §9]. 가방(`inventory_cap`) · 창고(`stash_cap`) · 로스터(`roster_cap`) · 파티 인원(`party_size_max`) · 편성 수(`party_preset_count`) · 물약 칸(`potion_slot_max`) · 강화 단계(`equip_upgrade_max`) · 고용 후보(`tavern_candidates`) · 동시 수색(`tavern_search_slots`) · 상단 장비 목록(`shop_equip_per_slot` · `shop_equip_weapon`). **값 = balance.csv 기본값 + 지어진 건물 랭크의 더하기** [2단계 2026-09-22 · R137 · construction_draft §11-2] — 기본값은 **건설 전** 값이다(다 지으면 옛 고정값 — 사용자 확정). 더하기는 `building_effect.csv` 가 들고 **이름이 같은 키에 붙는다** — 표의 단계 셋만 이름이 다르다(`make_level` → `makeLevels` · `potion_tier` → `potionTier` · `tactic_slots` → `tacticSlots` · 이 셋은 기본값이 0) · 붙을 상한이 없는 더하기(준비 중)는 버린다. 판정 · 불러오기(`deserialize` 의 편성 맞추기) · 전투 입력(`createRun` 의 `slotMax`) · 강화 비용(`item.upgradeCost` 의 `max`) · 화면이 모두 이것을 읽는다. `state` 가 `null` 이면(새 게임을 만드는 도중) **시작 랭크**(`building.csv:start_rank`)의 상한. **옛 세이브 이관 `upgradeV23` 은 그 버전의 값이라 여기를 안 거친다**(CSV 를 직접 읽는다) · rng 0 |
| `departRun(state, stageId, now, no?)` | `→ {ok, run, report}` / `{ok:false, err}` | **출발** [신설 2026-09-14 · R89 · base_expedition_design §1-1]. err = `canDepart` — 거절이면 아무것도 안 건드린다. **원정이 도는 중이면 먼저 끊는다** — `retreatRun` 과 같다(진행 중이던 라운드는 없던 것 · 그 리포트 `reason: 'retreat'` · 반복 off · 옛 핸들은 이후 `done`) [R92]. 전투 rng = `deriveSeed(seed, ++counters.battle)` · 몬스터 레벨 = `stageLevelState(state, stageId).level` · 나가는 인원 = 그 순간의 **편성 `no`(기본 고른 편성 · 반복은 도는 원정의 `run.preset` 을 넘긴다)의 파티** — 핸들의 `party` 로 굳어 **라운드마다의 `partyUnits` · 전술 조건이 이 인원을 쓴다**(R92). **전술 조건이 읽은 전열 · 관계도 굳힌다** — 핸들의 `fixed = {front:[uid], bond}`(bond = 이 런의 판정에 쓴 **+1 전** 값) · 출발하면서 `bonds[이 인원] += 1`(§4 v36 · R134). `battle.createRun` 을 열고(**물약** = 그 편성의 칸 구성을 **재고에서 앞 칸부터** 채운 `[{id, heal} \| null]` — 길이 = 칸 수 · 재고가 모자란 칸과 빈 칸은 `null`(`presetState` 의 `short` 와 같은 함수) · **재고는 여기서 안 준다**(마신 라운드를 정산할 때 `stepRun` · `advanceRun` 이 뺀다) · 원정 도중에 만든 물약은 다음 런부터 · R124) **첫 라운드를 연다**(`advance(0)` — 틱은 안 돈다 · 계산은 `stepRun` 이 재생 시각을 따라 한다 · 2026-09-21 · R130 · ~~첫 라운드까지 계산한다~~) — **보상은 하나도 안 준다.** **전술은 이 순간 켜진 것만 산다** — 그 편성의 칸 중 열렸고 조건이 선 옵션을 핸들의 `tactics` 로 굳힌다(R130 · tactic_card_design §2-1). 리포트는 **지금 목록 맨 앞에 선다**(`reason: null` = 진행 중 · 보상 칸은 0) · `run = {stageId, preset: no, repeat, lastAt: now, durationSec: 0, active: true, fallen: []}`.<br>**핸들** `run` = `{stageId, preset, report, result, done, tactics}` — `preset` = 나간 편성 번호(반복은 이 번호로 **그 편성의 지금 모습**이 다시 나간다) · `result` = `createRun` 의 결과(타임라인 · **걸음마다** 자란다) · ~~`segEnd`~~(R130 삭제 — 라운드를 미리 계산하지 않아 끝 시각을 모른다 · 시각은 `stepRun` 이 받는다) · **`tactics` = 출발 때 켜진 전술 옵션**(그 런은 이것만 산다 — 조건은 갈아입을 때마다 **지금 그 원정 인원으로** 다시 센다: 깨지면 꺼지고 되찾으면 켜진다 · 도중 리롤 · 새로 열린 칸은 다음 런 · R130) · `done` = 정산이 끝났나(마지막 라운드 · 철수 · 끊김). **핸들은 세이브에 안 든다** — 전투 안의 HP · 쿨 · 창과 같은 취급이다. 게임이 꺼지면 사라지고 `closeRun` 이 끊는다 |
| `advanceRun(state, run, now)` | `→ {ok, round, done}` / `{ok:false, err:'done'}` | **라운드 하나를 끝까지** [신설 2026-09-14 · R89 · **개정 2026-09-21 · R130**] — 끝났거나 **끊긴** 원정의 핸들(리포트 판정이 섰다 — 새 출발 · 철수 · `closeRun`)이면 `done` 이다 [R92]. ~~재생(또는 앱 시계)이 `run.segEnd` 에 닿았을 때 부른다~~ → **첫머리 갈아입기(`stepRun` ① 과 같다) 뒤 지금 라운드를 끝까지 계산해**(`advance(Infinity)`) 아래를 한다 — `stepRun(state, run, Infinity)` 의 한 라운드판이다(검증 · `resolveBattle` 용 · **게임 화면은 `stepRun`**). ⓪ **마신 물약을 재고에서 뺀다** — 그 라운드의 `potions`(이겼든 졌든 — 마신 것은 마신 것이다 · 0 이 되면 키를 지운다 · 2026-09-21 · R124). ① **끝난 라운드를 정산한다 — 이긴 라운드만**: 골드 → 도감(처치 · 카드) → 드롭(**알아서 분해의 선에 걸리면 가방 참 검사보다 먼저 가루** — 아래 `setAutoSalvage` · 가방 · 넘치면 `discarded`) → **경험치 = 그 라운드 처치 XP 합 × `xp_rate` 를 그 순간 살아 있는 영웅마다**(`grantXp` · 쓰러진 영웅은 없음 · **경험치 획득 +%(방어구 공통옵션)는 그 영웅 본인 몫만** `round(합 × xp_rate × (1 + 그 영웅의 option_fx.xpGain))` — 0 이면 종전 값 · rng 0 · 2026-09-18) → 마지막 라운드면 클리어 기록. 진 라운드(전멸 · 시간 초과)는 보상 없이 런을 닫는다. 리포트를 그 자리에서 누적으로 채운다. ② 런이 안 끝났으면 **경계 갈아입기** — 그 순간의 장비 · 레벨로(`partyUnits(state, 나간 인원, run.preset, run.tactics)` 를 새로 만들어 `createRun.refit` 에 넘긴다 · 바뀐 영웅만 · 보스 라운드 앞이라도 받는다) · **다음 라운드는 다음 걸음(`stepRun` · `advanceRun`)이 연다** [R130 — ~~다음 라운드를 계산한다~~]. 끝났으면 `run.done = true` · `state.run.active = false`. `round` = 정산한 라운드의 요약(§2-6 `createRun`) |
| `stepRun(state, run, until)` | `→ {ok, rounds, done}` / `{ok:false, err:'done'}` | **걸음** [신설 2026-09-21 · R130 · base_expedition_design §1-5 — 원정 중 교체는 그 순간부터] — 재생 시각(또는 앱 시계) `until` 까지 원정을 민다. 끝났거나 끊긴 핸들이면 `done`. ① **첫머리 갈아입기** — 그 순간의 파티(`partyUnits(state, 나간 인원, run.preset, run.tactics)`)를 `createRun.refit` 에 넘긴다(바뀐 영웅만 · 쓰러진 영웅은 안 입는다 · **보스 라운드 도중이면 엔진이 거절**한다) — 그래서 원정 중 장비 · 스킬 트리 교체는 **다음 걸음의 첫머리 = 바꾼 시각**에 먹는다(관전이 섰으면 그 틱 · 일시정지 중이면 세운 시각) ② `advance(until)` — 끝난 라운드가 나오면 `advanceRun` 의 ⓪①(정산) · ②(경계 갈아입기)를 하고 이어 민다(한 걸음에 여러 라운드 — 숨긴 탭) ③ `state.run.fallen` = 이 런에서 쓰러져 있는 영웅(`result.downed` — `advanceRun` 도 같이 적는다 · `durationSec` 은 정산이 적는다). `rounds` = 정산한 라운드 수 · `done` = 런이 끝났나. **교체가 없으면 어디서 끊어 걸어도 `resolveBattle` 과 같은 결과다**(틱 수열이 같다 — §8 항목 18) · rng = 그 원정의 전투 rng 를 잇는다(§5-2) |
| `runLock(state, run)` | `→ 'boss' \| null` | **지금 교체가 전투에 먹는가** [신설 2026-09-21 · R130] — 도는 원정이 **보스 라운드 도중**이면 `'boss'`(바꿔도 다음 런부터 · base_expedition_design §1-5) · 아니면 `null`(원정이 없거나 끝났다 · 다른 라운드 · 라운드 사이). 화면이 교체 뒤 플래시를 고른다 · rng 0 |
| `runTactics(state, run)` | `→ [{option, have, need, active}]` | **도는 원정의 전술** [신설 2026-09-21 · R130 · tactic_card_design §2-1] — 출발 때 켜진 옵션(`run.tactics`)마다 **지금 그 원정 인원으로** 센 조건(전열 · 관계는 `run.fixed` — 출발 때 값 · R134) — `active` 가 거짓이면 교체로 조건이 깨져 꺼진 것이다(되찾으면 다시 켜진다). 도는 원정이 없으면 `[]` · rng 0 |
| `runTacticsIf(state, run, heroUid, itemUid)` | `→ [{option, have, need, active}]` | **「이 아이템을 끼면」 도는 원정의 전술** [신설 2026-09-21 · R130] — `heroCombatIf` 와 같은 사본(그 영웅의 `equipTarget` 자리에 넣고 · 다른 영웅이 끼고 있으면 그 사본에서 뺀다)으로 `runTactics` 를 센다. 원본을 안 건드린다 · 가방 툴팁이 「끼우면 꺼지는 전술」을 이것으로 낸다 · rng 0 |
| `retreatRun(state, run, now)` | `→ {ok, report}` / `{ok:false, err:'done'}` | **철수** [신설 2026-09-14 · R89 · 관전의 옛 「건너뛰기」 자리] — 원정을 그 자리에서 끝낸다(끊긴 핸들이면 `done` — 지금 도는 다른 원정을 안 건드린다 · R92). **진행 중이던 라운드는 없던 것이다**(보상 없음 · 그 라운드에 마신 물약도 **안 줄어든다** · 이미 계산된 그 라운드의 사건도 리포트에 안 들어간다) · 이긴 라운드의 보상은 이미 들어가 있다. 리포트 `reason: 'retreat'` · `run.active = false` · **반복도 끈다** |
| `resolveBattle(state, stageId, now, no?)` | `→ {ok, result, report}` / `{ok:false, err}` | **개발 · 검증용 즉시 계산** [개정 2026-09-14 · R89] — `departRun` 한 뒤 `advanceRun` 을 끝날 때까지 **같은 `now` 로** 이어 부른 것이다(장비를 안 바꾸므로 라운드 사이에 들어가는 것은 레벨업뿐이다). 골든 · 단정 · 캘리브레이션 · `?dev=battle` 이 쓴다. **게임 화면은 안 쓴다** |
| `closeRun(state, now)` | `→ notice 또는 null` | **끊기** [개정 2026-09-14 · R89] — 재접속 · 멈춤(JS 가 오래 멈췄다)에서 부른다. `run.active` 면 **그 원정을 끊는다**(진행 중이던 라운드는 버리고 — 그 라운드의 물약도 안 줄어든다 · 리포트 `reason: 'closed'`). 반복도 끈다. 끊었거나 반복이 켜져 있었으면 `notice` 를 세팅해 돌려주고, 아니면 `null`. **남은 라운드를 마무리하지 않는다** — 마무리해 주면 껐다 켜기로 원정을 무한히 빨리 돌릴 수 있다(§8 항목 7) |
| `nextRepeat(state, endedAt)` | `→ {stageId, preset, at}` 또는 `null` | **반복 원정의 다음 출발** [신설 2026-09-22 · 부채 #57 · base_expedition_design §1-1] — 끝난 원정(`run.active` 가 아니다)이 **반복이 열렸고**(`hasFeature('repeat')` · R137) **반복이 켜져 있고**(`run.repeat`) **이긴 런**(그 런의 리포트 `won`)이면 같은 스테이지 · 같은 편성으로 **`at = endedAt + repeat_restart_sec × 1000`** 에 나간다 · 아니면 `null`. **관전 여부와 무관하다** — 관전 결과 띠의 세기(SCREEN_DESIGN §4-2)와 앱 시계가 둘 다 이 답대로만 출발시킨다. `endedAt` = 그 런이 **실제로 끝난 순간**(ms) — 배속이 게임 시각을 미는 탓에 로직은 모르고 화면 층이 잰다. 아무것도 안 바꾼다 · rng 0 |
| `dismissNotice(state)` | | |
| `tavernCandidates(state)` | `→ (hero\|null)[]` | rng = `deriveSeed(seed ^ 0x5A17, counters.tavern)` — 저장 없이 재현. 길이는 `tavern_candidates`, **고용한 칸은 `null`** |
| `tavernState(state, now)` | `→ {candidates, freeAt, free, cost, open}` | 선술집 화면 상태 한 덩어리 — **판정을 여기서 다 낸다**(`masteryState` 와 같은 규칙). `open` = 고용 · 리롤이 열렸나(선술집 · R137 — 닫혀 있으면 `hire` · `tavernReroll` 이 `unbuilt`). `freeAt` = 무료 리롤이 열리는 시각(리롤한 적이 없으면 `0`) |
| `tavernReroll(state, now)` | `→ {ok, free}` / `{ok:false, err:'gold'}` | 쿨다운(`tavern_refresh_hours`)이 끝났으면 **무료**, 남았으면 `tavern_reroll_cost` 골드. `counters.tavern++` · `tavern = {rerolledAt: now, hired: []}` — 명단을 통째로 갈고 빈 칸을 되살린다 |
| `hire(state, index)` | `→ {ok, hero}` / `{ok:false, err}` | err: `roster` · `gold` · `missing`(빈 칸 포함). **`counters.tavern` 을 올리지 않는다** — 산 칸만 `tavern.hired` 에 남고 나머지 명단은 그대로다 (base_expedition_design §2-4: 고용이 무료 리롤 우회로가 되지 않게) |
| **`shopVisit(state, now)`** | `→ {cycle, here, arriveAt, leaveAt, nextAt, remainMs}` | **특수상단의 방문 시계** [신설 2026-09-21 · 사용자 지시 · SCREEN_DESIGN §8-3 · ADR-0223]. 시계는 **게임을 만든 시각(`createdAt`)에서 센다** — 회차 `cycle` = ⌊(now − createdAt) / 주기⌋(주기 = `trade_visit_hours` · now 가 createdAt 보다 앞이면 0) · `arriveAt` = 그 회차가 열린 시각(상인이 온 시각) · `leaveAt` = `arriveAt + trade_stay_hours` · `nextAt` = 다음 회차 · `here` = `now < leaveAt` · `remainMs` = 와 있으면 `leaveAt − now`, 아니면 `nextAt − now`. **rng 를 안 쓰고 아무것도 안 바꾼다** — 앱 시계가 틱마다 불러 방문이 바뀌는 순간을 잰다(그래서 `shopState` 와 갈라 두었다 — 목록 굴림이 틱마다 돌지 않게). **오프라인에도 흐른다**(벽시계) |
| **`shopState(state, now)`** | `→ {…shopVisit, chapter, lo, hi, equip:[{item, gold}], open, special}` | **상점 화면 상태 한 덩어리** [신설 2026-09-21] — `open` · `special` = 상단 · 특수상단 방문이 열렸나(상단 랭크 · R137 — 목록 · 시계는 닫혀 있어도 같은 값) · `shopVisit` 에 **상단의 장비 목록**을 얹는다. 목록은 **방문 회차마다** 새로 굴린다(상인이 오는 순간 같이 갈린다) — rng = `deriveSeed(seed ^ 0x5409, cycle)`(§5-1) · **저장하지 않는다**(선술집 명단과 같은 문법 — 같은 세이브 · 같은 회차면 같은 목록). **부위마다 `shop_equip_per_slot` 개(무기만 `shop_equip_weapon` 개 · ADR-0236) · 같은 부위가 붙어 선다**(부위 순서 = `equipSlots` 의 위치 순서에서 부위만 한 번씩 — 반지 한 종류 · ADR-0232) · 아이템은 **`item.rollGear` 한 점**(드롭 희귀도 가중치)이고 `uid` 가 없다(가방에 들지 않은 물건이다 — `addItem` 을 안 지난다). ilvl 은 **진행 중인 챕터**(`chapter` = 열린 스테이지 중 가장 뒤의 것의 챕터)의 레벨대 `lo`~`hi` 에서 균등 — 레벨대 = 챕터 — (챕터 n−1 의 끝 `stage.csv:dlvl`, 챕터 n 의 끝] · 첫 레벨대는 1 부터(제작의 `makeLevels` 가 레벨의 챕터를 가르는 범위와 같다). `gold` = 희귀도의 가격(`shop_price_normal\|magic\|rare`). ⚠ **구매는 없다** — 화면이 미착수 안내를 낸다. ⚠ 진행 챕터가 회차 중간에 바뀌면 같은 회차라도 목록이 다시 굴려진다(레벨대가 입력이다) — 구매가 생기면 회차를 열 때의 레벨대를 저장한다 |
| `dismiss(state, uid)` | `→ {ok}` / `{ok:false, err}` | **해고 — 로스터에서 지운다. 되돌릴 수 없다** [신설 2026-09-09 사용자 확정]. err: `missing` · **`running`**(**지금 싸우는 영웅** — `runParty` 에 든다 · 파티에서 뺐어도 그 원정이 끝날 때까지 · R89 · R92) · **`searching`**(수색 나가 있다 — **`equipped` 보다 먼저 본다**: 나가 있는 사람에게 「장비를 벗어라」라고 하면 벗어도 안 되는 길로 보내게 된다 · 신설 2026-09-09) · **`equipped`**(장비를 하나라도 걸치고 있다 — 다 벗어야 가능) · **`last`**(마지막 한 명은 못 지운다 — 0명이 되면 원정을 못 돌려 골드가 안 들어와 복구가 막힌다).<br>**반환물은 없다** — 골드도 재료도 안 준다. `hire` 가 `tavern_hire_cost` 를 받으므로 반환이 있으면 GAME_DESIGN §10 이 경고한 **고용→해고 루프**가 열린다.<br>딸린 정리 하나 — **모든 편성의 파티에서도 뺀다**(진형도 맞춘다 · 지운 영웅의 uid 가 남으면 편성·출발이 유령을 든다 · 편성 2026-09-21). `run` 은 영웅 uid 를 안 들고 `lastReport` 는 이름을 `h?.name` 으로 읽으므로 **런 중에도 안전하다** |
| `dismissState(state, uid)` | `→ {canDismiss, err}` | **해고 판정만** — 아무것도 안 바꾼다 [신설 2026-09-22 · 부채 #56]. `err` = 지금 `dismiss` 를 부르면 나올 거절(순서 · 코드가 위 행과 **같다**: `missing` → `running` → `searching` → `equipped` → `last`) 또는 `null` · `canDismiss = err === null`. **`dismiss` 가 이 함수로 판정한다** — 해고 창(SCREEN_DESIGN §6)도 이것을 읽어 판정이 한 곳에만 선다(`upgradeState` · `makeState` 와 같은 규칙) |
| `swapHeroes(state, uidA, uidB)` | `→ {ok}` / `{ok:false, err}` | **로스터 순서 맞바꾸기** [신설 2026-09-15 · 캐릭터 탭 띠 드래그 · SCREEN_DESIGN §5 · ADR-0136] — `state.heroes` 에서 두 영웅의 자리를 서로 바꾼다. err: `missing`(둘 중 하나라도 없다) · 같은 영웅이면 바꿀 것이 없어 `{ok:true}`. **순서를 읽는 곳은 표시뿐이다**(영웅 띠 · `searchState.ready`) — 편성(파티 · 리더 `party[0]` · 진형)은 따로 들고 있어 안 흔들린다. 그래서 원정 중 · 수색 중에도 막을 것이 없다 · 세이브 스키마 무변경(배열 순서가 곧 값) · rng 를 안 쓴다 |
| `searchState(state, now)` | `→ {open, hours, slots, cost, echoPct, ready:[uid], out, hero, sent, startedAt, endsAt, remainMs, done, beats, result, rarePct, canHire, err, rumor, meetAt, meetOpen, answers, answer, discountPct}` | ⚠ **[신설 2026-09-09 — 수색 실동작]** 수색 화면 상태 한 덩어리 — **판정을 여기서 다 낸다**(`tavernState` 와 같은 규칙). `open` = 보내기가 열렸나(선술집 랭크 · R137 — 닫혀 있으면 `searchSend` 가 `unbuilt` · 이미 나간 수색은 끝까지 돌고 수령된다).<br>· `ready` = **안 나가 있을 때** 보낼 수 있는 영웅(= **지금 싸우지 않는**(`runParty`) 로스터 전원 · R92). **편성에 든 영웅도 보낼 수 있다** — 편성은 계획이고, 그 편성의 출발이 `searching` 으로 막힌다(`canDepart` · 2026-09-21). 나가 있으면 `[]`<br>· `hero` = 지금 로스터에 있는 그 사람(표시용) · `sent` = `{uid, sin, cha}` **보낼 때 박은 스냅샷**. **둘을 섞지 않는다** — 수색 중 레벨업하면 `hero.stats.cha` 는 오르지만 결과를 정한 것은 `sent.cha` 다<br>· `beats` = `[{id, at, open, text:{ko,en}}]` — **막마다 하나**. `at` 은 `startedAt + 소요 × i / 막수`(첫 막은 `startedAt`), `open` 은 `now ≥ at`. 문구는 `search_story.csv` 에서 온다<br>· `result` = **`done` 일 때만** 후보 1명, 아니면 `null`. `rarePct` = 그 매력이 산 레어 확률(비율 · R111) · `err` = `done` 인데 못 받는 사유(`roster` · `gold`)<br>· ⚠ **[만남 · 신설 2026-09-09 · ADR-0068]** `rumor` = `{id, sin, rumor:{ko,en}, prompt:{ko,en}}`. **안 나가 있으면 다음 회차의 만남**(= 소문 — 보내기 전에 알려준다) · 나가 있으면 이번 회차의 것<br>· `meetAt` = 만남이 열리는 시각(`startedAt + 소요 × meet_at_pct/100`) · `meetOpen` = `now ≥ meetAt`<br>· `answers` = **아직 안 답했을 때만** 채워진다 — `[{id, key, text:{ko,en}}]`. `key` 는 **보낸 영웅의 죄종이 연 답**인가(화면이 그 이유를 찍는다)<br>· `answer` = 고른 답(같은 모양) 또는 `null` · `discountPct` = 그 답이 깎는 비율(1 = 전액 · R111) · **`cost` 는 그 할인이 반영된 값**이다 |
| `searchSend(state, uid, now)` | `→ {ok, endsAt}` / `{ok:false, err}` | 대기 영웅 하나를 내보낸다. err: `busy`(이미 나가 있거나 결과가 남아 있다 — **동시 1건의 실제 집행자**) · `missing` · `party`(**지금 싸우는 영웅**(`runParty`)은 못 보낸다 · R92 — 편성에 든 것만으로는 안 막는다 · 2026-09-21). `counters.search++` 하고 `search = {heroUid, startedAt, no, sin, cha}` 를 박는다 — **판정 입력을 보낼 때 함께 저장하는 것이 계약**이다 |
| `searchTake(state, now)` | `→ {ok, hero, cost}` / `{ok:false, err}` | 수령(고용) — 밑값은 명단과 같고(`tavern_hire_cost`) **만남에서 고른 답이 거기서 깎는다**. err: `none`(나간 수색이 없다) · `notDone` · `roster` · `gold`(**깎인 값** 기준). 받으면 `search = null` 이라 칸이 비고 다시 보낼 수 있다 |
| `searchAnswer(state, answerId, now)` | `→ {ok, discountPct, cost}` / `{ok:false, err}` | ⚠ **[신설 2026-09-09 · ADR-0068]** 만남에 답한다 — **되돌릴 수 없고 한 번뿐**이다. err: `none` · `answered`(이미 답했다) · `notOpen`(아직 `meetAt` 전) · `missing`(지금 열려 있지 않은 답).<br>**고용비만 깎는다** — 결과 영웅은 답과 무관하게 이미 시드가 정했으므로 **언제 답하든 같은 사람이 온다**. 두 층: 만난 죄종에 맞는 답(`hit_sin`)이면 `tavern_search_meet_hit_pct` · 그 위에 보낸 영웅이 연 답(`need_sin ≠ '-'`)이면 `tavern_search_meet_key_pct`.<br>**시간 제한이 없다** — `meetAt` 부터 **수령할 때까지** 언제든이고, 안 답하고 수령해도 정가일 뿐 벌이 없다(OSRS 가 랜덤 이벤트의 강제 페널티를 「Optional Randoms」로 걷어낸 것과 같은 규칙 · 방치형 계약 ③) |
| `searchDrop(state)` | `→ {ok}` / `{ok:false, err:'none'}` | 취소 · 버리기 — 나가 있으면 취소, 결과가 와 있으면 돌려보낸다. **이 문이 없으면 로스터가 찼을 때 칸이 영원히 막힌다**(결과는 수령할 때까지 남으므로). 다시 보내면 `counters.search` 가 올라 **다른 결과**가 나오고, 오가는 값이 없으므로 되풀이해도 얻는 것이 없다 — 치르는 것은 그 시간뿐이다 |
| `masteryState(state, uid)` | `→ {points, nodes:[{id, treeKind, ownerId, tier, stat, value, rank, maxRank, unlockLevel, unlocked, total, canLearn, gate, on}]}` / `null` | **판정을 여기서 다 낸다** — 화면은 결과만 그린다. 없는 영웅이면 `null`. `gate` = 켜는 장비(`{slot, groups}` 또는 `null`) · `on` = 지금 낀 장비로 켜졌나(게이트 없으면 `true`) — 꺼진 칸도 `canLearn` 은 그대로다(랭크는 캐릭터에 쌓인다 · 2026-09-22 R138) |
| `learnMastery(state, uid, nodeId)` | `→ {ok, rank, points}` / `{ok:false, err}` | 1랭크 = 1포인트. err: `missing`(영웅 없음 **또는 그 영웅의 트리에 없는 노드**) · **`downed`**(도는 원정에서 쓰러져 있다 · R130 — 영웅 확인 바로 뒤에 본다) · `locked` · `maxRank` · `points` |
| `unlearnMastery(state, uid, nodeId)` | `→ {ok, rank, points}` / `{ok:false, err}` | ⚠ **[신설 2026-09-08]** `learnMastery` 의 역방향 — 1랭크 = 1포인트 **환급**. 랭크가 0 이 되면 `mastery` 에서 키를 지운다(전액 롤백 뒤와 같은 모양). err: `missing`(영웅 없음 **또는 그 영웅의 트리에 없는 노드**) · **`downed`**(R130) · `noRank`(찍은 랭크가 없다).<br>**해금 레벨을 보지 않는다** — 찍은 뒤 해금 조건이 사라질 길은 없고, 봐 봐야 「찍었는데 못 뺀다」만 만든다 |
| `resetMastery(state, uid)` | `→ {ok, refunded, points}` / `{ok:false, err}` | 롤백은 **무료 · 수시** (skill_design §5). 찍은 랭크 합을 전액 환급. err: `missing` · **`downed`**(R130) |
| `tacticState(state, party?, no?)` | `→ {totalLevel, open, count, lockedCount, rerollCost, canReroll, slots:[{no, open, locked, option, have, need, active}]}` | **`no` = 칸의 내용을 읽는 편성**(기본 **고른 편성** · 원정은 나간 편성을 넘긴다) — **칸의 내용(옵션 · 등급)은 편성마다다** [2026-09-21 · R129 · SCREEN_DESIGN §15 · ADR-0250]. **열린 칸 수는 계정이다** — **지휘 천막 랭크가 연다**(`min(limitsOf(state).tacticSlots, slotCount)` · R137 · ~~로스터 합산 레벨이 곧장 연다~~ — 합산 레벨은 그 랭크의 문턱) — 모든 편성이 같다. ~~칸의 `unlockTotalLevel`~~ 은 삭제 — 잠긴 칸이 말할 건물은 `needOf('tactic_slots', 칸 번호)`. `party` = 조건이 세는 인원(기본 **그 편성의 파티** `partyOf(state, no)` · 원정은 나간 인원을 넘긴다 · R92). **판정을 여기서 다 낸다** — 해금(지휘 천막 랭크) · 조건 카운터(`have / need`) · **잠금** · **전체 리롤 비용**. 안 열린 칸은 `option: null`. **첫 배정은 모든 편성이 같다** — 시드 하나에서 나오고(§2-9 `initialAssign`) 편성은 리롤로 바꾼 칸만 따로 든다(§4). 칸의 `option` 은 **등급까지 편 옵션**(`{id, grade, condKind, …, value}` — §2-9 `optionOf`)이라 화면과 `bonusOf` 가 등급별 값을 그대로 받는다 (2026-09-02). 세이브가 든 가족이 CSV 에서 사라졌으면 **그 칸만 첫 배정으로 되돌린다**.<br>**[개정 2026-09-01 · 구현 2026-09-22 · R28]** 칸의 `cost` 는 사라졌다 — 비용은 칸이 아니라 **잠금 개수**가 정하므로 판 전체에 하나뿐이다(`rerollCost` = `tactic.rerollCost(lockedCount)` · §2-9). 칸의 `locked` = **그 편성에서 잠근 칸인가**(잠금은 편성마다 — §4 · 안 열린 칸은 언제나 `false`) · `lockedCount` = 열린 칸 중 잠근 수. `canReroll` 은 「열렸고 안 잠긴 칸이 하나라도 있고 골드가 충분한가」 |
| `tacticBonus(state, party?, no?)` | `→ {flat, dr}` | 켜진 칸들의 효과 합 — 칸은 편성 `no`(기본 고른 편성)의 것 · 조건은 `party`(기본 그 편성의 파티)로 센다. `heroCombat` 이 파티원에게만 넘긴다 |
| `rerollTactic(state)` | `→ {ok, rolled:[{no, option}], cost}` / `{ok:false, err}` | **전체 리롤** [개정 2026-09-01 · 구현 2026-09-22 · R28 · tactic_card_design §5-6] — **고른 편성의 열렸고 안 잠긴 칸을 한 번에 전부** 굴린다(칸별 리롤은 없다). 다른 편성의 칸은 안 바뀐다(R129). 비용 = `tactic.rerollCost(잠근 칸 수)` — **기본가 × 배수 ^ 잠근 칸 수**(`balance.csv:tactic_reroll_base_cost` · `tactic_reroll_lock_mult`). `rolled` = 굴린 칸 번호 오름차순 · 칸마다 **등급까지 편 옵션**(§2-9 `optionOf`) · 뽑은 `{id, grade}` 는 그 편성의 세이브에 남는다(§4). err: `allLocked`(굴릴 칸이 없다 — 전부 잠갔거나 열린 칸이 없다) · `gold` — **거절이면 골드 · 카운터 · 칸 전부 그대로다**. rng — `counters.tactic++` **1회** · `deriveSeed(seed ^ 0x7AC7, counters.tactic)` **하나로 칸 번호 오름차순 연속 뽑기**(`tactic.pickMany` · §5-2) · 후보에서 빼는 것 = **굴리기 직전 열린 칸이 들고 있던 옵션 전부**(잠긴 칸 것 포함) **+ 이번에 이미 뽑은 것** — 가족 단위다(등급이 달라도 같은 가족이면 같은 옵션). 도는 원정은 안 흔들린다 — 원정은 출발 때 켜진 전술을 굳혀 든다(R130) |
| `toggleTacticLock(state, slotNo)` | `→ {ok, locked}` / `{ok:false, err}` | **[신설 2026-09-01 · 구현 2026-09-22 · R28]** **고른 편성의** 칸 하나의 잠금을 뒤집는다 — 잠금은 편성마다다(`presets[*].tactics.locked` · §4). **무료**이고 rng · 카운터를 안 탄다 — 값은 리롤할 때 `rerollCost` 로 치른다. `locked` = 뒤집은 뒤의 상태. err: `missing`(없는 칸) · `locked`(안 열린 칸은 못 잠근다) |

**report** — `{at, stageId, level, won, reason, durationSec, gold, xp:{uid:n}, levelUps:[{uid, from, to, gains, points}], downed:[uid], party:[uid], drops:[itemUid], discarded, rounds, roundsCleared, strikes, contrib}` — ~~`cards`~~ 는 2026-09-21 삭제(도감 카드 걷음). 옛 리포트에 남은 `cards` 는 읽는 곳이 없다
**`drops` 에는 알아서 분해에 걸린 드롭도 든다** [2026-09-21 · R125] — uid 를 받고(`addItem`) 곧바로 `items` 에서 지워져 가루가 된다. 「그 런이 준 것」이라 목록에서 빼지 않고, 화면은 `items` 에 없는 uid 를 흐린 빈 칸으로 그린다(SCREEN_DESIGN §4-3). `discarded` 에는 안 든다 — 칸을 안 먹었다. 리포트 필드는 늘지 않는다
**리포트는 원정이 도는 동안 자란다** [개정 2026-09-14 · R89] — `departRun` 이 빈 리포트를 세우고 `advanceRun` 이 라운드마다 채운다. `reason` = **`null` 이면 진행 중** · `clear` · `wipe` · `timeout` · **`retreat`**(철수) · **`closed`**(게임이 꺼져 끊겼다). `xp` = **영웅별로 받은 경험치**(쓰러진 영웅은 그 뒤 라운드 몫이 없어 서로 다르다 · 나간 인원 전원이 키를 갖는다) — `xpEach`(전원 동일)는 v25 에서 사라졌다. `levelUps` 는 영웅마다 한 줄로 합친다(`from` = 원정 전 · `to` = 지금). 끊긴 원정(`retreat` · `closed`)의 `durationSec` · `rounds` · `strikes` · `contrib` · `downed` 는 **마지막으로 정산한 라운드 끝**의 값이다 — 버린 라운드는 리포트에 없다
`roundsCleared` 는 **깬 라운드 수**다 — 렌더러가 「이겼으면 전부, 아니면 하나 뺀다」로 짐작하던 값을 정산이 실어 보낸다(귀환 룰로 「라운드를 정리한 직후 철수」가 생겨 그 짐작이 틀릴 수 있다). 옛 리포트에는 없어서 **`undefined` 일 수 있다** — 렌더러가 그 경우를 다뤄야 한다. **`level`** 은 그 런의 **스테이지 레벨**(몬스터 레벨)이다 [2026-09-14 · R87] — 같은 까닭으로 옛 리포트에는 없을 수 있다.
`strikes` 는 `result.strikes` 의 복사본이고, 옛 리포트에는 없어서 **`null` 일 수 있다** — 렌더러가 그 경우를 다뤄야 한다.
`contrib` 도 `result.contrib` 의 복사본이다. 없으면 화면은 **기여 상자를 안 그린다**(0 으로 지어내면 「못 때렸다」로 읽힌다 · SCREEN_DESIGN §4-3).
리포트는 **`state.reports` 의 맨 앞에 들어가고 [balance.csv:report_keep] 개까지 남는다** — 넘치면 오래된 런부터 밀려난다 (v21 · ADR-0063).

`codexBonus(state)` 의 누적 객체는 **`codex.statByNum` 의 값들에서 만든다**(하드코딩 키 없음) — 계열 배정이 바뀌어도 state.js 를 고칠 필요가 없다. 다만 `computeCombat` 이 읽는 것은 `atk_pct` · `hp_pct` · `dmg_pct` 뿐이라 `acc_pct` 는 계산되고 버려진다 (§2-4).

`partyUnits(state, uids?, no?)` 는 `{uid, combat, stats, actives, rank}` 를 만든다 — **라운드마다 다시 만든다**(`advanceRun` 이 다음 라운드를 열 때 · 원정 중 바꾼 장비 · 레벨 · 스킬 트리가 여기서 전투로 들어간다 · R89) (**`stats`** = `hero.stats` — 스킬 계수가 시전 순간 읽는다 · 2026-09-10 R72) (**`rank`** = 진형의 자리 — **편성 `no`(기본 고른 편성)의 진형** · 배치가 없으면 **전열 0**. 「앞부터 때린다」가 읽는 유일한 입력이다 · 2026-09-09) (`uids` 를 주면 그 인원만 — `departRun` 은 **그 편성의 파티 전원**을 넘긴다 · ~~`activeParty`~~ 는 2026-09-08 삭제) — `actives = skill.activesFor(hero, { weaponGroup: weaponGroupOf(state, hero) })`(**인스턴스 `[{id, source}]` · 고유 → 무기군 → 전직** — 2026-09-03). **무기군을 아는 곳은 `state.js` 뿐이다** — `skill.js` 는 장비를 모르므로 착용 무기의 `group` 을 여기서 넘긴다(`weaponGroupOf(state, hero)` → 맨손이면 `null`, 그러면 그 칸이 빈다). `partyMembers(state)`(전술 문맥용)는 **정의**를 넘긴다 — `activesFor(h).map(a => skill.resolve(a))` — `tactic.contextOf` 의 계약이 「actives = 스킬 정의」이기 때문이다. ⚠ 2026-09-01 까지 id 를 넘겨 `skill_tag` 조건 4종이 영원히 0 을 셌다(회귀 단정 있음). **쿨·창·배리어는 세이브에 없다**(HP 와 같은 취급 — 전투 안에서만 산다).

### 2-8. `skill.js` — 액티브 정의 · 배정 · 발동 선택

`createSkillSystem(data)` — 주입 `data`: `balance`(`active_slots` — 칸 수 상한 · **`skill_decay_cap_pct`** — 슬롯이 민 감쇠의 상한 [2026-09-10]. 계수는 전부 CSV 행에 있다), `rows`(= `skill.csv` 파싱 행 — **스킬마다 하나뿐인 것**), **`effectRows`**(= `skill_effect.csv` — **스킬이 하는 일**, 한 줄에 하나) · **`statusRows`**(= `skill_status.csv` — **걸린 효과**: 버프 · 디버프 · 오오라가 거는 창) [표 셋 분리 2026-09-22 · R136 · PLAN_skill_structure], `tagRows`(= `skill_tag.csv` 파싱 행 — **태그 어휘의 SSOT** · 2026-09-01), `attributes`(= `hero_attribute.csv` 로드 결과 `[{id}]` — **스케일링 슬롯 `attr` 의 어휘** · 비어 있는데 채운 슬롯이 있으면 던진다 · 2026-09-10 R72). **실행은 하지 않는다**(§2-12 skill_runtime.js) — 유닛의 HP·버프를 만지지 않는다.
**어휘는 §2-11 `skill_effects.js` 의 표에서 온다** (2026-09-01) — `cast`·`effect`·`target`·걸린 효과의 `stat`·`cast_condition` 의 허용값은 그 표의 키이고, 이 파일은 배열을 따로 두지 않는다. 어휘와 실행이 같은 표를 읽으므로 둘이 어긋날 자리가 없다.
**표 셋** [2026-09-22 · R136] — 스킬 = 나가는 방식(`cast`) · 대상 · 쿨 · 조건 · 표시 / 하는 일 = 그 스킬이 차례로 실행하는 줄(`seq` 순) · 배율 · 타수 · 능력치 계수 / 걸린 효과 = `apply` 줄이 거는 창의 능력치 · 값 · 시간 · 원소. **1단계 제약 — 스킬마다 하는 일 줄은 정확히 1개**다(로더가 던진다). 그래서 이 단계의 「첫 줄만 읽는 곳」(`effects[0]` — `previewOf` · 오오라 · 자폭 · 화면)은 누락이 아니라 계약이다 — 2단계가 제약을 풀 때 그 자리를 전부 줄 목록으로 바꾼다.

| export | 시그니처 | 계약 |
|---|---|---|
| `defs` | `{skillId: def}` | 정규화된 정의 |
| `list` | `[def]` | CSV 순서 |
| `activesFor(hero, ctx)` | `→ [{id, source}]` | **[개정 2026-09-09 · 1스킬 = 1직업]** **칸을 정하는 것은 출처다** (skill_design §2) — 배운 것 중 셋을 고르는 게 아니라 출처가 셋이고 각각 하나씩 준다. 순서는 **고유 → 무기 → 전직**이고 그것이 칸 번호다. **두 출처(고유 · 무기)가 같은 직업 풀에서 온다** (§12-1 규칙 3).<br>· **고유** `source:'innate'` — `hero.innate`, 정의에 있을 때만. 영웅이 태어날 때 **제 직업 풀**에서 굴린 것이다<br>· **무기** `source:'weapon_group'` — `ctx.weaponSkill` 이 가리키는 정의. **무기 개체가 담은 스킬**이고(`item.skill`), ~~`ctx.weaponGroup` 으로 무기군 전용 행을 찾던 것~~ 은 무기군 고정 폐기로 사라졌다. **`ctx.weaponSkill` 을 안 넘기면 이 칸은 빈다**(맨손과 구분되지 않는다 — 넘기는 쪽의 책임이다). ⚠ **`source` 문자열은 `weapon_group` 그대로다** — 무기군이라는 어휘는 죽었지만 키는 산다(R39 와 같은 취급 · 화면 라벨 `sk.src.weapon_group` 은 이미 「무기」다)<br>· **전직** `source:'advance'` — ⚠ **전직 시스템이 없어**(R16) 찍은 것이 없으므로 **영웅은 언제나 빈 칸**이다(R52). **`ctx.thirdSkill` 을 넘기면 그 id 가 이 칸에 앉는다** [신설 2026-09-11 · R79] — **몬스터 보스의 셋째 칸**이 쓰는 자리다(그 몬스터 직업 풀에서 스폰 때 굴린 것 · skill_design §2 · monster_design §5-1). 영웅 경로는 안 넘기므로 **동작이 안 바뀐다**. ⚠ 그 칸이 전직 칸인지 고유 둘째인지는 기획 미정(GAME_DESIGN §10)이라 `source` 는 잠정적으로 `'advance'` 그대로다<br>· **빈 출처는 자리를 남기지 않는다** — 반환은 든 것만이고 어느 출처인지는 `source` 가 말한다. 3칸 자리로 펴는 것은 화면의 몫이다(`ui/app.js:ACTIVE_SOURCES`)<br>· **같은 id 가 두 출처에서 와도 칸은 둘이다** [개정 2026-09-09 사용자 지시 · R66 · ~~앞선 출처만 남긴다~~ 폐기] — 두 출처가 한 풀에서 가져가므로 **실제로 일어난다**(전사 풀 5행이면 5분의 1). 걷어내면 화면의 「무기」 칸이 비어 **맨손과 구분되지 않아** 무기가 무엇을 담았는지 읽을 수 없었다. ⚠ **딸린 규칙 — 칸이 둘이면 쿨도 둘이다**: `simulate` 가 칸마다 `readyAt` 을 따로 들므로(§2-6) 겹친 스킬은 **두 배로 나간다** · `hero.skillOrder`(§2-4)가 있으면 그 순서를 앞에 → `active_slots` 개로 자른다 |
| `resolve(active)` | `→ def \| null` | 인스턴스 → 정의. 지금은 `defs[active.id]`. ⚠ 변형 노드가 오면 `active.override` 를 여기서 덧씌운다 — 소비자(battle · tactic · 화면)는 `defs[id]` 를 직접 찾지 않고 이것만 부른다 (§8 항목 16) |
| `castable(def, ctx)` | `→ bool` | `ctx = {self, allies}`(allies = 생존 아군, self 포함). 아래 발동 조건 |
| `pickReady(actives, t, isCastable)` | `→ active \| null` | **순수** — `actives` 를 바꾸지 않고 정렬도 새 배열에서 한다. `readyAt ≤ t + EPS` **이고** 조건이 참인 것 중 `readyAt` 최소 → 동률이면 **배열 순(칸 순서)**. `skill.csv:priority` 는 동률 결정자가 **아니다**(2026-09-01 — 직업 행이 칸에 앉는 기본 순서에만 쓴다 · battle_design §5 「우선순위는 플레이어가 정한다」 · 고유 칸이 1번에 오면서 CSV 값이 출처를 섞어 화면의 「슬롯 순 = 우선순위」와 어긋나던 것을 바로잡았다) |
| `tagsOf(def)` | `→ [tag]` | 그 스킬이 실제로 갖는 태그 전부 — **파생 먼저, 그다음 정의한 것**. 세는 쪽(전술카드·화면)의 유일한 입구 |
| `scaleDef(def, stats, opt?)` | `→ eff \| null` | **스킬 계수 공용 계산 — 전투와 미리보기가 같은 함수를 쓴다** [2026-09-10 · R72 · skill_design §13]. 반환 = `def` 의 얕은 복사본 + **`effects` = 하는 일 줄마다 민 복사본**(**시전 단위** `x` — 줄마다 제 슬롯으로 민다 · 2026-09-22 R136). `x` = 그 줄 + 스킬의 `id`·`target` + 실효 `hits`·`decay`·`procChance`·`procMult` + **`statMult`**(능력치 계수) + **`apply` 줄이면 거는 걸린 효과를 풀어 실효 `stat`·`value`·`dur`·`element`**(값 · 시간은 그 줄의 슬롯이 민다 — S5). 실행 함수(§2-11 대상 표 · §2-12 `castHeal`·`castBuff`·`castSummon`·`castCall`)는 **`x` 하나만** 받는다. field 마다 `Σ = Σ stats[attr] × coef`(그 줄의 그 field 슬롯 전부):<br>· `mult_pct` → **배율에 안 더한다** — 그 슬롯 능력치마다 `formula.statCoef(stats[attr])` 를 곱해 `statMult` 로 낸다(**`coef` 칸은 안 읽는다** · 공격 `atk × 배율 × statMult` · 회복 `matk × mult × statMult` · 소환 `hpMax × mult × statMult` — battle_design §9-2 · 2026-09-18 — ~~`flat = Σ` 덧셈~~ 폐기) · 몬스터도 같다(2026-09-22 — 보류 해제)<br>· `hits` → `floor(raw + Σ)`, `hit` 줄은 1 이상<br>· `effect_value`·`duration_sec`·`proc_chance_pct`·`proc_mult_pct` → **크기에 더하고 부호 유지** `sign(raw) × (\|raw\| + Σ)`(raw 0 은 +) — 음수 디버프(페니턴스·바인드)가 약해지지 않는다<br>· `decay_pct` → `Σ > 0` 일 때만 `max(raw, min(raw + Σ, [balance.csv:skill_decay_cap_pct]))` — **슬롯이 민 몫만** 상한에 걸린다(CSV 원값의 0~100 미만 검증은 그대로)<br>· `stats` 가 `null`(소환·모름)이거나 그 능력치가 없으면 0 → 원값 그대로 · `statMult` 1. `mult`·`cool` 은 원값 그대로 · **rng 0 · 입력을 안 바꾼다** |
| `previewOf(def, ctx)` | `→ {baseSec, everySec, lossPct, amount, parts} \| null` | 설명창 재료 — 아래 「미리보기」 표 [2026-09-08 · **`parts` 신설 2026-09-10 R72**]. `def` 가 없으면 `null`. **1단계는 첫 줄(`effects[0]`)에서 낸다** — 모양은 표 셋 분리 전과 같다(2단계가 줄마다 `rows` 로 넓힌다 · 2026-09-22) |
| `statuses` | `{statusId: status}` | **걸린 효과 정의** [신설 2026-09-22 · R136] — `status = {id, stat, value, dur, element, note}`(`skill_status.csv` 한 행). 설명창이 `apply` 줄이 거는 효과의 능력치 · 값 · 시간 · 원소를 여기서 읽는다 |
| `procIntervalSec(skillId, mult)` | `→ 초 \| null` | **목걸이 발동 간격 초** [신설 2026-09-21 · R127] — `cool_sec × mult`(`item.proc.v`)를 소수 1자리로. 스킬을 모르면 `null`. **표시 전용**(툴팁 · SCREEN_DESIGN §6) — 발동은 전투에 아직 안 걸린다 |
| `TAGS` · `DERIVED_TAGS` · `MAX_TAGS` | `[11]` · `[3]` · `2` | 태그 어휘 14종(2026-09-08 `aura` 추가)과 정의 상한 (skill_design §11). **어휘는 `skill_tag.csv` 에서 온다**(`derived` 0 → `TAGS` · 1 → `DERIVED_TAGS` · 2026-09-01). 로드 시 검증 — `tag_id` 유일 · `category ∈ {damage, buff, debuff, other}` · `derived ∈ {0,1}` · 파생 3종이 정확히 `aoe/single/multihit`(`derivedTagsOf` 가 그 셋을 낸다) · 표가 비면 throw |
| `EPS` | `1e-9` | 준비·만료 판정 허용 오차 (§5-3) |

**`def`** — `{id, ownerKind, ownerId, cast, target, cool, cond, condValue, tags:[], derived:[], priority, name:{ko,en}, icon, desc:{ko,en}, innatePool, amuletPool, note, effects:[line]}` [표 셋 분리 2026-09-22 · R136]
**`line`**(하는 일 한 줄 · `skill_effect.csv`) — `{seq, effect, hits, mult, decay, procChance, procMult, element, status, scales:[{field, attr, coef}]}` · `effects` 는 `seq` 순 · `status` = `apply` 줄이 거는 걸린 효과 id(그 밖은 `null`) · `element` = `hit` 줄의 원소(`apply` 줄의 원소는 걸린 효과가 든다).
`procChance`/`procMult` = `proc_chance_pct`/`proc_mult_pct` 원값 · `scales` = **채운 스케일링 슬롯만**(`-` 슬롯은 빠진다 · CSV 슬롯 순서) — `field` 는 CSV 컬럼명 그대로다 [2026-09-10 · R72]. 슬롯은 **줄에 붙는다** — 그 줄의 값을 민다(`apply` 줄의 `effect_value`·`duration_sec` 슬롯은 거는 걸린 효과의 값 · 시간을 민다).
`icon`·`desc` 는 플레이어 표시(2026-09-01 — 종전 `ui/mock.js:SKILL_DISPLAY`), `note` 는 설계 노트(옛 `description_kr`), `innatePool` 은 고유 풀 소속(§2-4 `skillPool`), **`amuletPool` 은 목걸이 발동 후보 소속**(`skill.csv:amulet_pool` · §2-5 `procSkills` · 2026-09-21 — 0/1 · 몬스터 전용과 오오라 · 소환 · 불러내기 · 비직격은 1 이면 로드가 던진다).
`mult`/`decay`/`value`/`procChance`/`procMult`/`condValue` 는 CSV 의 **비율 그대로**(310% = `3.1` · 코드는 `/100` 을 안 한다 · R111), CSV 의 `-` 는 `null`. 로드 검증도 비율로 본다 — 감쇠 `< 1` · 확률 `≤ 1` · 배수 `≥ 1` · 조건값 `(0, 1]`(옛 눈금 값이 오면 던진다).

**어휘 사전 — 정의는 CSV · 종류는 코드.** 이 밖의 값은 로드 시 `throw`(미니 DSL 인터프리터를 두지 않는다):

| 컬럼 | 값 |
|---|---|
| `owner_kind` | `job` · `advance` · `unique` · **`monster`** — **스킬은 직업 · 전직 · 유니크 · 몬스터 넷으로 나뉜다** [사용자 확정 2026-09-09 · `monster` 2026-09-18 사용자 확정]. ~~`weapon_group`~~ 은 무기군 고정 폐기(skill_design §12-1 규칙 2)로 어휘에서 빠졌다. **`monster` = 몬스터 전용** — 영웅의 고유 풀 · 무기가 담는 스킬 · 보스 셋째 칸 · 스킬 도감은 전부 `job` 행만 읽으므로 거기 들지 않는다. `owner_id` 는 `-`(어느 몬스터가 드나는 `monster.csv:innate_skill` 이 정한다) · `innate_pool` 은 **0 이어야 한다**(아니면 throw). 지금 발행된 행은 `job` 37 · `monster` 1 이고 `advance`·`unique` 는 미발행 |
| `owner_id` | 그 출처 안의 id — `owner_kind=job` 이면 직업 id |
| `cast`(skill.csv) | **나가는 방식** — §2-11 `CASTS`: `turn`(차례에 쓴다) · `aura`(쿨 없이 상시 · 행동을 안 먹는다 — 전투 시작에 `until: Infinity` 창으로 걸린다) · `event`(사건이 부른다 — `cast_condition` 이 그 사건이고 늘 거짓이라 `pickReady` 가 안 고른다 · 실제 발동은 그 사건을 든 쪽 — 자폭 = `battle.js` `blast`) [2026-09-22 · 옛 `kind` 의 「어떻게 나가나」 절반] |
| `effect`(skill_effect.csv) | **하는 일** — §2-11 `EFFECT_TYPES` 의 키: `hit`(때린다) · `heal`(회복) · `apply`(걸린 효과를 건다) · `summon`(벽을 세운다) · `call`(무리를 불러낸다) · `fixed`(고정 피해 — 자폭). **싣는 방식이 표에 있다** — `hit`·`heal`·`summon`·`call` 은 `turn` · `apply` 는 `turn`·`aura` · `fixed` 는 `event` 만(어긋나면 throw) [2026-09-22 · 옛 `kind` 의 「무엇을 하나」 절반 — 옛 `attack`→`hit` · `buff`·`aura`→`apply` · `indirect`→`fixed`]. `call`(불러내기 · 2026-09-18)은 **`owner_kind = monster` 만** 쓰고 스킬 `target = self` · `hits` · `mult_pct` 0 · `cast_condition = band_missing` 이어야 한다(아니면 throw). **`fixed`**(비직격 · 2026-09-21)도 **`owner_kind = monster` 만** 쓰고 `cool_sec` 0(`event` 규칙) · `hits` 1 · `mult_pct` > 0 · 적 대상 · `cast_condition` 이 있어야 한다 |
| `target` | `enemy_single` · `enemy_all` · `enemy_rotate` · `enemy_chain` · `enemy_highest_def` · `self` · `party` · `ally_single` · `party_adjacent` — §2-11 `TARGETS` |
| `stat`(skill_status.csv) | §2-11 `EFFECTS` 의 키 — `atk_pct` · `period_pct` · `barrier_pct` · `guard_pct` · `def_pct` · `res_elem` · `hp_max_pct` · `regen_pct` · `dr_pct` · `onhit_element` · `attack_splash` · `duel` · `taunt` (`def_pct` · `res_elem` 은 무기 옵션 창 전용) · 옛 `skill.csv:effect_stat` |
| `status`(skill_effect.csv) | `apply` 줄 = 거는 걸린 효과의 `status_id`(없으면 throw) · 그 밖의 줄 = `-`. **1단계는 걸린 효과마다 거는 스킬이 하나라 `status_id` = 스킬 id 다**(`mag_focus`) — 여러 스킬이 같이 거는 효과(화상 등)부터 제 이름을 갖는다 |
| `cast_condition` | `-` · `buff_absent` · `ally_hp_below` · `band_missing` · `on_death` |
| `element` | `-` + `hero.js:ELEMENTS` 4종 — 하는 일 줄(`hit` 의 원소)과 걸린 효과(평타 부여가 때릴 원소) 둘에 있다 · `apply` 줄에 적으면 throw(원소는 걸린 효과가 든다 — 두 곳 관리 금지) |
| `tags` | `-` 또는 `\|` 로 이은 **최대 2개** — `dot` · `shout` · `blessing` · `aura` · `boost` · `restore` · `curse` · `control` · `transform` · `summon` · `sacrifice` |
| `proc_chance_pct` · `proc_mult_pct`(skill_effect.csv) | 확률로 터지는 추가 피해 — 확률 % · 배수 %. 기본 `0` · `decay_pct` 바로 뒤 컬럼 [2026-09-10 · R72] |
| `scaleN_field` · `scaleN_attr` · `scaleN_coef` (N = 1·2·3 · skill_effect.csv) | 스케일링 슬롯(**하는 일 줄에 붙는다** — 2026-09-22) — `field` ∈ `mult_pct` · `hits` · `effect_value` · `duration_sec` · `decay_pct` · `proc_chance_pct` · `proc_mult_pct` · `attr` ∈ `hero_attribute.csv` id · `coef` = 능력치 1당 더해지는 값(숫자 ≥ 0). 빈 슬롯은 `-` · `-` · `0` [skill_design §13-1 · 2026-09-10] |

**태그는 14종이고 컬럼에 적는 것은 11종뿐이다** (skill_design §11 확정 2026-08-28 · `aura` 2026-09-08). 나머지 셋은 **`hit` 줄 + 스킬 `target`** 에서 **파생**한다 — `aoe`(`enemy_all`·`enemy_chain`) · `single`(`enemy_single`·`enemy_highest_def`) · `multihit`(그 줄의 `hits > 1`) · `hit` 줄이 없으면 파생 태그도 없다. `enemy_rotate`(순환)는 타수만큼만 닿으므로 **광역도 단일도 아니다**(§11-2 규칙 3). 파생 가능한 것을 컬럼에 또 적으면 두 곳 관리가 되어 반드시 어긋나므로, `tags` 에 파생 태그를 적으면 **로드가 실패한다**.

로드 시 그 밖에 던지는 것 — `hit` 인데 `hits < 1` · `turn` 스킬의 `apply` 줄이 거는 걸린 효과의 `duration_sec ≤ 0` · `aura` 스킬의 걸린 효과의 `duration_sec ≠ 0`(오오라는 창이 아니다) · `apply` 인데 걸린 효과가 없음 · `heal` 인데 `mult_pct ≤ 0` · `turn` 인데 `cool_sec ≤ 0` · `aura`·`event` 인데 `cool_sec ≠ 0` · `event` 인데 `cast_condition` 없음 · `skill_id` 중복 · `owner_kind` 어휘 밖 · `owner_id` 빈 값 · **같은 출처(`owner_kind#owner_id`) 안 `priority` 중복** · `tags` 가 3개 이상 · 어휘 밖 태그 · 파생 태그를 적음 · 태그 중복.
**[강화 2026-09-01] 하는 일↔대상 정합**(대상은 스킬의 `target`) — `hit`·`fixed` 는 `enemy_*` 만 · `heal` 과 `aura` 스킬의 `apply` 는 아군 대상(`SUPPORT_TARGETS`)만 · `turn` 스킬의 `apply` 는 아군 대상 + 디버프 대상(`DEBUFF_TARGETS` — 음수 값 · 2026-09-09) · `summon`·`call` 은 `self` 만 · `hit` 의 `enemy_all`/`enemy_chain` 은 `hits = 1`(타수는 대상 수가 정한다) · `heal`/`apply`/`summon`/`call` 은 `hits = 0` · `apply`/`call` 은 `mult = 0` · `hit`·`heal`·`summon` 은 `mult > 0` · `apply` 가 아닌 줄의 `status` 는 `-` · `ally_hp_below` 는 `0 < cond_value ≤ 1`, 그 외 조건은 `cond_value = 0`. 컬럼 하나가 대상마다 뜻이 달라 값이 **조용히 무시되던** 자리를 로드 시 막는다.
**[신설 2026-09-22 · R136] 표 사이 검사** — ① 모든 스킬에 하는 일 줄이 있다(**1단계는 정확히 1개**) · `seq` 는 스킬마다 1 부터 빈틈없이 ② 없는 스킬 id 를 가리키는 줄 금지 ③ 없는 걸린 효과를 가리키는 `apply` 줄 금지 ④ **아무도 안 거는 걸린 효과 금지**(읽히지 않는 행) · 걸린 효과 쪽 — `status_id` 유일 · `stat` 이 `EFFECTS` 의 키 · `value`·`duration_sec` 숫자(`duration_sec ≥ 0`) · `element` 어휘. 전부 어긋나면 throw.
**[강화 2026-09-10 · R72] 슬롯 · 추가 피해 · 감쇠 · 결투** — ① 슬롯(하는 일 줄마다): `field` 어휘 밖 · `attr` 이 `hero_attribute` id 밖 · `coef` 가 숫자가 아니거나 음수 · `field='-'` 와 `attr='-'` 가 짝이 안 맞음 · 빈 슬롯인데 `coef ≠ 0` · **한 줄에 같은 field 두 번** · 하는 일 부적합(`hits`=hit · `mult_pct`=hit/heal/summon · `effect_value`=apply · `duration_sec`=`turn` 스킬의 apply · `decay_pct`=감쇠를 쓰는 줄 · `proc_*`=확률 > 0 인 hit). **채운 슬롯의 `coef = 0` 은 합법**이다(축만 정하고 크기는 밸런스 몫 — skill_design §13-3) ② 추가 피해: `proc_chance_pct` 는 0~1 · 0 보다 크면 `effect=hit` 이고 `proc_mult_pct ≥ 1` · 0 이면 `proc_mult_pct = 0`(두 곳 관리 금지) ③ 감쇠: `decay_pct` 를 쓰는 줄은 대상이 `enemy_chain` · `enemy_highest_def` · **`hit` 의 `enemy_all`**(광역 약화 — 2026-09-10 추가)이고 그 밖은 0 ④ 걸린 효과 `stat = duel` 의 `value ≥ 0`(시전자가 받는 피해 감소 %).

**발동 조건** — 거짓이면 「준비된 것으로 치지 않는다」. 쿨은 그대로 두고 그 차례엔 다른 스킬이나 기본 공격이 나간다.

| `cast_condition` | 참인 때 |
|---|---|
| `-` | 항상 |
| `buff_absent` | 시전자에게 **이 스킬의 창이 없다** |
| `ally_hp_below` | 생존 아군 중 `hp/hpMax < cond_value`(비율) 인 자가 있다 |
| `band_missing` | 시전자의 무리(`band` · §2-13) 중 **서 있지 않은 것**(아직 안 나왔거나 쓰러진 것)이 있다 [신설 2026-09-18]. 무리가 없는 유닛은 늘 거짓이다 — 소환사 규칙이 안 걸린 판의 주술사는 이 스킬을 안 쓴다 |
| `on_death` | **늘 거짓이다** [신설 2026-09-21] — 차례에 고르지 못하게 막는 자물쇠다(`cast=event` 스킬의 사건). 실제 발동은 `battle.js` 의 `downed` 가 `blast()` 로 직접 부른다(§2-6 `blast`). 「사건이 부르는 스킬」을 선택기를 안 고치고 여는 자리다 |

**미리보기 `previewOf(def, ctx)`** [신설 2026-09-08 · **`parts` 2026-09-10 R72**] — 설명창이 문장을 만들 재료다. 렌더러는 계산하지 않는다(DEV_PLAN 부채 #3). **감소·치명·추가 피해는 안 태운다** — 대상이 정해져야 나오거나 굴림이다. **2단계(설명창)가 이 모양을 그대로 쓴다.**
`ctx = {atkMin, atkMax, matkMin, matkMax, hpMax, period, stats}` — 전부 선택 · 몬스터도 제 `stats` 를 넘긴다(2026-09-22 — 능력치 계수 보류 해제) [밑수 범위 2026-09-14 · R90 — ~~`atk`·`matk`~~]. 모르는 값의 조각은 `null` 로 낸다.

| 필드 | 계약 |
|---|---|
| `baseSec` | 표기 쿨 `def.cool` |
| `everySec` · `lossPct` | 실효 쿨 `formula.effectiveCd(cool, period)` · 표기 대비 밀린 비율(R111) — `period` 를 모르면 `null` |
| `amount` | **`{min, max}`** [개정 2026-09-14 · R90] — 첫 줄의 하는 일로 가른다: 한 타 피해(`hit` · 밑수 `ctx.atkMin`~`ctx.atkMax`) · 고정 피해(`fixed` · 같은 밑수의 **중앙값** — 양끝이 같다) · 회복량(`heal` · `ctx.matkMin`~`ctx.matkMax`) · 벽 HP(`summon` · `ctx.hpMax` — 양끝이 같다) = 양끝마다 `round(밑수 × mult × statMult)` — **능력치 계수 포함**(~~`+ flat` 고정 항~~ 2026-09-18). 밑수 양끝 중 하나라도 유한한 수 ≥ 0 이 아니거나 · **`mult_pct` 슬롯이 있는데 `stats` 가 없으면** `null`. `apply`·`call` 은 언제나 `null`. 다단은 **한 타** 값 |
| `parts.amount` | `mult > 0` 인 hit·fixed·heal·summon 에만 — `{value, basis: 'atk'\|'matk'\|'hpMax', pct: def.mult, terms: [{attr, coef}]}` · `value` 는 `amount` 와 같다(같은 객체 — `{min, max}` 또는 `null`) · `basis` 는 밑수의 **이름**이다(ctx 필드 이름이 아니다 · R90) · `terms` = `mult_pct` 슬롯(coef 0 도 넣는다 · 슬롯이 없으면 `[]`) — 곱하는 능력치의 목록이다(설명창 Alt 식 `밑수 × 배율% × STR` · 2026-09-18 · 몬스터도 같다 — 2026-09-22) |
| `parts.hits` · `parts.value` · `parts.dur` · `parts.decay` · `parts.procChance` · `parts.procMult` | **첫 줄의 그 field 에 슬롯이 1개 이상일 때만** 키가 있다(`hits` ← `hits` · `value` ← `effect_value` · `dur` ← `duration_sec` · `decay` ← `decay_pct` · `procChance` ← `proc_chance_pct` · `procMult` ← `proc_mult_pct`) — `{value, raw, terms: [{attr, coef}]}` · `value` = `scaleDef` 의 실효값(`stats` 가 없으면 `null` · **`procChance` 의 `value` 는 100 에서 자른다** — `strike` 가 그 상한으로 굴리므로 120% 는 틀린 숫자다. `raw` 는 원값 · `scaleDef` 는 안 자른다 [2026-09-10]) · `raw` = CSV 원값(`value`·`dur` 은 거는 걸린 효과의 값 · 시간) · `terms` 는 coef 0 인 항도 넣는다 |

---

### 2-9. `tactic.js` — 파티 전술 정의 · 조건 판정 · 리롤 후보

`createTacticSystem(data)` — 주입 `data`: `slots`(= `tactic_slot.csv` 파싱 행) · **`conditions`**(= `tactic_condition.csv` — 조건 사전) · `options`(= `tactic_option.csv`) · **`scores`**(= `tactic_score.csv` — 점수 × 등급 배수) · `sins` · `classes` · `gradeWeights`(= `balance.csv:tactic_grade_weight_*` 셋) · `rerollCost`(= `{base, lockMult}` ← `balance.csv:tactic_reroll_base_cost` · `tactic_reroll_lock_mult` · 2026-09-22 · R28). **무상태** — 어느 칸에 무엇이 들었는지는 세이브가 들고(§4) 이 모듈은 규칙만 낸다. ~~`skillSystem`~~ 은 2026-09-22 폐지(스킬 태그 조건 삭제) · ~~`weaponGroups`~~ 는 2026-09-02 폐지(`damage_kind` 조건 삭제와 함께).

**칸은 획득물이 아니다** (tactic_card_design §5) — 로스터 **합산 레벨**이 칸을 열고, 칸에 든 옵션은 재화로 간다.

**표가 셋이다** [2026-09-22 · tactic_card_design §5-8 · R134] — ~~옵션의 SSOT 는 `(option_id, grade)` 복합키(등급마다 값을 손으로 적는다)~~ 를 대체했다. 값을 고치는 자리가 셋으로 좁다:

- **조건 사전** `tactic_condition.csv` — 1행 = 조건 하나: `category`(종류 6) · `polarity`(`has` 있으면 / `not` 없으면) · `test`(아래 어휘) · `arg`(`sin` · `cls` = 옵션이 채우는 자리 · 직업 id = 조건이 정함 · `-`) · `n`(문턱 — 비었으면 있으면 1 · 없으면 언제나 0) · **`score`**(0 = 무조건만 · 1 부터)
- **옵션** `tactic_option.csv` — 1행 = **가족** 하나: `cond_id` · `arg`(조건이 비워 둔 자리만) · `stat` · **`unit`**(기준값)
- **점수 배수** `tactic_score.csv` — 점수 하나 = 등급별 배수. **옵션 값 = `unit` × 배수(조건의 `score`, 등급)** — 고정값 채널(`_flat`)은 정수, 나머지는 소수 넷째 자리로 반올림
- **가족** — 중복 방지 · 첫 배정 · 리롤 후보의 단위는 **전부 가족**이다. 「일반 데미지」와 「레어 데미지」는 같은 옵션이라 두 칸에 못 들어간다 (§5-5 — 등급으로 갈라 세면 같은 stat 이 두 칸에서 곱해진다)
- **등급** — `common` · `magic` · `rare` **이 순서가 코드 상수**(§5-3). **칸 하나가 드는 것은 `{id, grade}` 한 쌍**이다 — 세이브도 이 모양으로 든다 (§4)
- **로드 검증**(어긋나면 **throw**) — 배수 표: 점수 0 부터 빈틈없이 · 한 점수 안에서 일반 < 매직 < 레어 · 같은 등급에서 점수가 오르면 배수가 줄지 않는다. 조건: 어휘 · 종류 · polarity · 인자 타입 · 점수가 배수 표에 있다 · **점수 0 은 무조건만** · **관계는 있으면만**. 옵션: `cond_id` 가 있다 · 인자(조건이 비운 자리만 채운다) · `unit > 0` · 반올림 뒤에도 등급 순으로 커진다

| export | 시그니처 | 결과 |
|---|---|---|
| `slotList` · `slotCount` | `[{no}]` | 칸 수 = CSV 행 수 — **칸을 여는 것은 건설 표**(지휘 천막 `tactic_slots` · ~~`unlock_total_level`~~ 2026-09-22 삭제 · R137). 로드 시 검증 — `slot_no` 는 1부터 빈틈없이 · **가족 수 ≥ 칸 수 × 2**(전체 리롤은 굴리기 직전에 든 것 + 이번에 뽑은 것을 빼고 뽑으므로 모든 칸을 새로 뽑으려면 그만큼 필요하다 — 2026-09-22). ~~`rerollCost`~~ 는 2026-09-22 삭제 — 비용은 칸이 아니라 잠근 칸 수가 정한다(아래 `rerollCost(n)`) |
| `families` · `familyIds` | `[{id, condId, category, polarity, condKind, condArg, condN, score, stat, unit, grades:{common,magic,rare}}]` | **가족 목록 = 옵션 행** (2026-09-22). `condKind` = 조건의 `test` · `condArg` = 실제로 세는 죄종 · 직업(옵션이 채웠거나 조건이 정한 것) · `grades` = 위 식으로 편 등급별 값 |
| `conditions` · `scoreMult` · `CATEGORIES` | 조건 사전 · `{점수: {common, magic, rare}}` · 종류 6 | 화면 · 검증용으로 그대로 낸다 |
| `optionOf(ref)` | `{id, grade}` → `{id, grade, condId, category, polarity, condKind, condArg, condN, score, stat, value} \| null` | 칸이 든 한 쌍을 옵션 하나로 편다. `measure`·`bonusOf` 가 받는 모양이고, **없는 가족·없는 등급이면 `null`**(CSV 가 바뀐 세이브 — 옛 풀의 가족이 여기로 온다) |
| `GRADES` | `['common','magic','rare']` | 등급 어휘 — 이 밖의 값은 로드 시 throw. **순서가 계약**이다 (§5-3) |
| ~~`openCount(totalLevel)`~~ | — | **2026-09-22 삭제** — 열린 칸 수는 지휘 천막 랭크가 정한다(`state.tacticState` 가 `limitsOf` 로 센다 · R137) |
| `contextOf(members, extra?)` | `→ ctx` | `members = [{sin, cls, items, front}]` **편성 순서대로**(첫 칸 = 리더) · `extra.bond` = 이 인원이 같이 나간 런 수. 조건이 세는 숫자를 한 번에 뽑는다 — 죄종 · 직업 분포 · 장비 이름의 죄종 수 · 리더 · 전열 명단 · 관계. ~~`actives`(스킬 정의) · 스킬 태그별 사람 수~~ 는 2026-09-22 폐지 · ~~양손 수~~ 2026-09-01 · ~~무기 피해 종류~~ 2026-09-02 |
| `measure(option, ctx)` | `→ {have, need, active}` | 조건 카운터. **있으면** = `have ≥ need` · **없으면** = `have === 0`(`need` 0). 화면이 「지금 / 필요」를 찍는다 |
| `bonusOf(options)` | `→ {flat, dr}` | 접사·마스터리와 **같은 채널**. `damage_reduction` 만 원천별 곱이라 따로 (battle_design §9-3) |
| `initialAssign(rng)` | `→ [{id, grade:'common'} × slotCount]` | **가족 풀**을 통째로 섞어 앞에서부터 나눠 준다 — 리롤 카운터를 안 타므로 **리롤이 다른 칸을 흔들지 않는다**. 가족 기준이라 중복 없음. **등급은 언제나 `common`** — 시드 운이 초반 격차를 만들지 않는다 (tactic_card_design §5-5 확정) |
| `pick(rng, excludeIds)` | `→ {id, grade} \| null` | 한 칸 뽑기. 부르는 쪽이 빼야 할 **가족 id** 를 넘긴다. **가족과 등급을 같이 굴린다**(§5-5) — rng 를 **가족 1회 · 등급 1회 순서로 2번** 소비한다 (§5-2). **점수는 출현에 안 걸린다**(균등 — §5-8) |
| `pickMany(rng, count, excludeIds)` | `→ [{id, grade}] \| null` | **전체 리롤의 뽑기** [2026-09-22 · R28] — rng **하나로** `pick` 을 `count` 번 잇고, 뽑은 가족은 다음 뽑기의 후보에서 빠진다. rng 소비 = **2 × count**(칸마다 가족 → 등급). 후보가 모자라면 `null`(로드가 「가족 ≥ 칸 × 2」를 검증하므로 평소엔 안 탄다) |
| `rerollCost(lockedCount)` | `→ n` | **전체 리롤 비용** = `round(base × lockMult ^ lockedCount)` [2026-09-22 · tactic_card_design §5-6 — 가파른 곱]. 로드 시 검증 — `base ≥ 0` · `lockMult ≥ 1`(1 밑이면 잠글수록 싸진다) |

**조건 어휘 8종** (`tactic_condition.csv:test` — 이 밖의 값은 로드 시 throw · 2026-09-22 · §5-8): `none`(무조건) · `sin_kind`(죄종 가짓수) · `sin_same`(같은 죄종 최다 인원) · `cls_same`(같은 직업 최다 인원) · `gear_sin`(인자 죄종 — 파티 장비 이름의 그 죄종 수) · `leader_cls`(인자 직업 — 편성 첫 칸) · `front_cls`(인자 직업 — 전열에 선 그 직업 인원) · `together`(지금 이 인원이 같이 나간 런 수 — §4 `bonds`).
- ~~`always` · `class_same` · `affix_sin`~~ 은 2026-09-22 에 `none` · `cls_same` · `gear_sin` 으로 이름이 바뀌었고 **~~`skill_tag`~~ 는 삭제**다(tactic_card_design §5-8 — 스킬 태그 조건 폐기).
- ~~`two_hand`~~ 는 2026-09-01 폐지 · ~~`party_size`~~ · ~~`damage_kind`~~ 는 2026-09-02 폐지.
- **전열**은 그 편성의 진형(§2-7 `formationOf` — 배치가 없으면 전열)이고, **원정은 출발 때 굳힌 명단**(`run.fixed.front`)으로 센다 — 원정 중에 그 편성의 진형을 고쳐도 도는 원정의 조건은 안 흔들린다. **관계**도 출발 때 값(`run.fixed.bond` — +1 전)이다.
전부 **편성에서 확정되는 값**이다 (tactic_card_design §2-1) — 전투 중에 변하는 축(현재 HP · 남은 적)은 어휘에 없다. **정의는 CSV · 종류는 코드** — 미니 DSL 을 두지 않는다 (§2-8 skill.js 와 같은 규약).

### 2-10. `naming.js` — 이름 조립 (2026-08-31 신설)

`createNaming(data)` — 주입 `data.sins` = `{sinId: {ko, en, adj}}`(⚠ 아직 `ui/mock.js:SINS`) · **`data.sinWords` = `{sinId: [{ko, en}]}`** — 단 순서(`sin_word.csv` 를 `tier` 로 정렬) [신설 2026-09-19]. 없는 죄종은 **한 단짜리**로 본다(`{ko: S.ko, en: S.adj}` — 원래 죄종 이름). **rng 를 쓰지 않는다** — 결정론 계약 밖이다.

**CSV 가 아니라 코드인 이유**: 언어별 어순·조사가 규칙이라 표로 적을 수 없다. 렌더러가 아니라 여기 있는 이유는 두 렌더러(장비 화면·관전)가 같은 규칙을 두 번 적으면 갈리기 때문이다.

| export | 시그니처 | 계약 |
|---|---|---|
| `composeName(prefixSin, base, suffixSin\|null, words?)` | `→ {ko,en}` | **문장형 2026-09-19 개정** [item_design §1 「이름」 · ~~태그 형식 `[분노][오만] <base>`~~(09-11)] — ko `"<A>와 <B>의 <base>"` / en `"<A> and <B> <base>"`. A · B = 그 죄종의 `words[k]` 단 단어(ko 명사 · en 형용사) — `words` 가 없거나 칸이 비면 첫 단. **「와 / 과」는 A 의 마지막 글자 받침이 가른다**(한글 음절 `(code − 0xAC00) % 28` 이 0 이면 와). `suffixSin` 이 없으면 ko `"<A>의 <base>"` / en `"<A> <base>"`(매직). **`prefixSin` 도 없으면 `base` 이름뿐**(일반). `base` 는 문자열(양 언어 공통) 또는 `{ko,en}` — 무기군 정의도 `ko`/`en` 을 갖고 있어 그대로 들어온다. 결과 = `sinPhrase` 를 이어 붙인 것 + `base` |
| `sinPhrase(prefixSin, suffixSin\|null, words?)` | `→ {ko:[seg], en:[seg]}` | **이름 앞머리의 조각들** [신설 2026-09-19] — `seg = {t, sin?}`. 죄종 단어 조각만 `sin` 을 든다(나머지는 조사 · 공백). 예 ko `[{t:'격노',sin:'wrath'},{t:'와 '},{t:'찬탈',sin:'pride'},{t:'의 '}]`. `composeName` · `baseOf` 가 쓰고, 화면이 단어를 따로 다뤄야 할 때의 입력이다 — 이름 문자열을 다시 쪼개지 않는다. 일반은 빈 배열 |
| `wordCount(sin)` | `→ int` | 그 죄종의 단어 수(`sinWords[sin].length` · 없으면 1) [신설 2026-09-19] |
| `eliteName(sin, base)` | `→ {ko,en}` | ko `"분노의 스켈레톤 기사"` / en `"Wrathful Skeleton Knight"`. `base` 는 몬스터 이름 `{ko,en}` — **id → 이름 조회는 `ui/data.js:eliteName` 이 맡는다**(`D.monsters` 는 브라우저가 fetch 한 것이라 game_logic 이 볼 수 없다) |

---

### 2-11. `skill_effects.js` — 「종류」 등록표 (2026-09-01 신설)

순수 모듈 · 상태 없음 · rng 없음. **종류 하나 = 여기 등록 한 번** — `skill.js` 가 어휘(허용값)를, `skill_runtime.js` 가 실행을 같은 표에서 읽으므로 두 곳이 어긋날 자리가 없다. 표가 받는 실행 단위는 **시전 단위 `x`**(§2-8 `scaleDef` 가 낸 하는 일 한 줄 — 스킬 id · 대상 · 실효값 · 걸린 효과를 푼 값)다 [2026-09-22 · R136]. 「정의는 CSV · 종류는 코드」(docs/reference/skill_architecture_survey §8)의 「코드」가 이 파일이다.

| export | 모양 | 계약 |
|---|---|---|
| `CASTS` | `['turn','aura','event']` | `skill.csv:cast` 허용값(나가는 방식 · §2-8). **`aura`** 는 쿨 없이 상시(§2-6 — 액티브 칸에서 빠져 전투 시작에 `until: Infinity` 창으로 걸린다 · 2026-09-09) · **`event`** 는 사건이 부른다(2026-09-21) [2026-09-22 — 옛 `KINDS` 를 둘로 갈랐다] |
| `EFFECT_TYPES` | `{ hit, heal, apply, summon, call, fixed }` — 각 `{casts, run?}` | `skill_effect.csv:effect` 허용값 = 키(하는 일 · §2-8). `casts` = 그 일을 싣는 나가는 방식(`skill.js` 가 검증한다) · `run(rt, u, x, t, foes)` = 차례의 실행 — `hit` → `ATTACK_TARGETS[x.target]` · `heal` → `rt.castHeal` · `apply` → `rt.castBuff` · **`summon`** → `rt.castSummon`(HP 를 가진 유닛을 세운다 · 2026-09-09) · **`call`** → `rt.castCall`(시전자의 무리(§2-13 `band`) 중 서 있지 않은 것을 **한 번에 전부** 세운다 · 몬스터 전용 · 2026-09-18). **`fixed`** 는 `run` 이 없다 — `event` 스킬이라 차례에 안 나가고 `battle.js` `blast` 가 실행한다(2단계가 일반 경로로 옮긴다) [2026-09-22 · R136] |
| `EFFECT_IDS` | `Object.keys(EFFECT_TYPES)` | 하는 일 어휘 |
| `ATTACK_TARGETS` | `{ enemy_single, enemy_all, enemy_rotate, enemy_chain, enemy_highest_def }` — 각 `(rt, u, x, foes) → void`(`x` = `hit` 줄의 시전 단위) | 공격 대상 5종의 **실행 자체**(§2-6 타겟팅 행 그대로 — rng 순서·hp 가드 불변). `rt` = §2-12 런타임. **`enemy_highest_def`** [2026-09-09] = 방어값 최대 대상(동률이면 배열 순 앞 — **rng 0회**)을 `hits` 회 때리고 타격마다 그 대상의 `def`·`defBase` 를 `decay` 만큼 곱으로 깎는다. **`enemy_all`** 은 `decay > 0` 이면 주 대상(전열 생존자 중 배열 첫 번째 · 전열이 비면 생존자 첫 번째 · **rng 0회**)만 온전하고 나머지 배율이 `decay` 만큼 준다 — `decay = 0` 이면 종전과 같다 [2026-09-10 · R72]. 핸들러는 전부 스킬 타격에 `{flat, procChance, procMult}` 를 `rt.strikeOnce` 의 6번째 인자로 넘긴다 |
| `SUPPORT_TARGETS` | `['self','party','ally_single','party_adjacent']` | heal·buff·aura 의 아군 대상. **전부 결정론** — `ally_single` = HP **비율** 최저 · `party_adjacent` = `party` 배열의 양 옆(자기 제외) [2026-09-09] |
| `DEBUFF_TARGETS` | `['enemy_single','enemy_all']` | **`turn` 스킬의 `apply` 만** 적에게 걸 수 있다 — 새 채널이 아니라 같은 창을 **음수 `effect_value`** 로 쓰는 것이다 [사용자 확정 2026-09-09]. `enemy_single` 지목은 생존 적 중 **HP 최대**(rng 0회) |
| `TARGETS` | 공격 대상 ∪ 아군 대상 | `skill.csv:target` 허용값 (디버프 대상은 공격 대상 표에 이미 있다) |
| `EFFECTS` | `{ atk_pct:{derive}, period_pct:{derive}, barrier_pct:{apply}, guard_pct:{derive}, def_pct:{derive}, res_elem:{derive}, hp_max_pct:{derive,apply}, regen_pct:{derive}, dr_pct:{derive}, onhit_element:{}, attack_splash:{}, duel:{}, taunt:{} }` | **걸린 효과의 능력치 어휘**(`skill_status.csv:stat` · 2026-09-22). `derive(u, sum)` = 그 stat 의 창 합으로 파생값을 **다시 쓴다**(sum 0 = 원값 복원) · `apply(rt, tgt, x, until, ev)` = 시전 순간 1회 · 둘 다 없는 항목은 **표식**이다: `taunt`·`duel` 의 소비자는 `battle.pickTarget`(`duel` 은 `skill_runtime.castBuff` 가 시전자의 `dr_pct` 창도 함께 연다 · 2026-09-10 R72), `onhit_element`·`attack_splash` 의 소비자는 `skill_runtime.basicAttack`. `hp_max_pct` 는 열 때 늘어난 만큼 현재 HP 도 올리고(apply) 닫을 때 넘친 HP 를 깎는다(derive). **`def_pct` · `res_elem` 은 무기 옵션 창 전용**(스킬 행이 안 쓴다) — `guard_pct` 와 같은 축(방어값 · 저항)을 밀어서 guard 의 창 합까지 함께 다시 쓴다 · `res_elem` 은 창의 `element` 칸만 민다 [2026-09-11 · R78]. **`dr_pct` 는 창 합을 안 쓴다 — 창 하나가 원천 하나다**: `dr = 1 − (1 − drBase) × reductionMult(창 값들)`(§2-3 · battle_design §9-3 원천별 곱) · 창이 없으면 `drBase` 그대로 · 음수 창(받는 피해 증가)은 `1 − v > 1` 로 곱해진다. ~~`drBase + sum`~~ 은 덧셈이라 기획과 어긋났다(장비 50% + 결투 20% = 70% · 곱이면 60%) [2026-09-22] |
| `EFFECT_STATS` | `Object.keys(EFFECTS)` | `skill_status.csv:stat` 허용값 |
| `CONDITIONS` | `{ buff_absent, ally_hp_below, band_missing, on_death }` — 각 `(def, ctx) → bool` | 발동 조건(§2-8 표). `ctx = {self, allies}` · `on_death` 는 상수 거짓이다(§2-8) |
| `CONDITION_IDS` | `Object.keys(CONDITIONS)` | `skill.csv:cast_condition` 허용값 |
| `refreshDerived(u)` | `→ void` | `EFFECTS` 의 **키 순서**대로 `derive` 를 부른다(지금 `atk_pct` → `period_pct` → `guard_pct` → `def_pct` → `res_elem` → `hp_max_pct` → `regen_pct` → `dr_pct`). 순서가 계약이다 |
| `weaponOnHit(u, fx, d, type, t, sec)` | `→ bool` | **무기 옵션의 타격 시 창 셋** [신설 2026-09-11 · R78] — `battle.strikeOnce` 가 부른다. 방어력 감소(`wx:def_down` · `def_pct`) · 데미지 감소(`wx:atk_down` · `atk_pct` · **대상 공격 타입이 맞을 때만** — 물리 감소 = `physical` · 마법 감소 = 원소)는 **대상 창 하나에 센 값**(`min(v)`)만 남기고 `until` 을 갱신한다. 원소 저항 감소는 `wx:res_down:<공격자>:<원소>` 로 **공격자 · 원소마다 따로** 서서 중첩된다(같은 영웅은 갱신) · 그 타격 타입이 `physical` 이면 안 건다. 창은 전부 `quiet: true` · 섰으면 `refreshDerived(d)`. `sec = {def, res, atk}` = `[balance.csv:weapon_def_down_sec]` · `weapon_res_down_sec` · `weapon_atk_down_sec`. **rng 0** |

새 종류를 추가하는 절차 — 이 표에 항목 하나(+ 필요하면 §2-6 실행 규칙 행) → `skill.csv` · `skill_effect.csv` · `skill_status.csv` 에서 그 값을 쓴다. `skill.js` · `battle.js` 는 건드리지 않는다.

### 2-12. `skill_runtime.js` — 시전 · 창 · 배리어 · 사건 훅 (2026-09-01 신설)

`battle.createRun` 이 **런마다** 만든다 — 상태(`t` · 유닛)는 전부 인자·ctx 로 받고 모듈 전역은 없다.

`createSkillRuntime(ctx)` — `ctx = { SK, B, rng, timeline, out, units:{party, enemies}, strikeOnce, pickTarget, makeSummon, callBand, r1, EPS, hooks, cdFloor }`. `callBand(caster, t) → {units: [표시값], then: [t 없는 이벤트]}` 도 **battle.js 가 넘긴다** [2026-09-18] — 무리를 세우는 것은 적 배열 · 오오라 · 보상 표식을 아는 쪽의 일이다. `makeSummon(caster, def) → 유닛` 은 **battle.js 가 넘긴다** [2026-09-09] — 유닛 생성자와 키 발급(`s0`…)은 그쪽 어휘라 런타임이 만들지 않는다. `units.enemies` 는 라운드마다 simulate 가 갈아 끼우는 **속성**이라 런타임은 항상 `ctx.units.enemies` 를 읽는다. `strikeOnce(u, target, mult, element, s, sk?)`·`pickTarget` 은 battle.js 의 것을 그대로 받는다(`sk = {flat, procChance, procMult}` 는 **스킬 타격만** 넘긴다 · 2026-09-10 R72) — 직격·도발·전투불능 판정은 전투 진행의 몫이고 런타임은 **무엇을 시전하나**만 안다.

| export | 계약 |
|---|---|
| `act(u, t)` | §2-6 「발동」·「쿨」 행 — 준비된 것 없으면 `basicAttack`. 시전이면 `readyAt` · `out.casts` · `skill` 이벤트 · `hooks.emit('cast', …)` → **`eff = SK.scaleDef(def, u.stats)`**(시전 순간 한 번 · 2026-09-10 R72) → **하는 일 줄을 `seq` 순으로 실행** — 줄마다 `EFFECT_TYPES[x.effect].run`(§2-11 — `ATTACK_TARGETS[x.target]` / `castHeal` / `castBuff` / `castSummon` / `castCall`)이 **그 줄의 시전 단위 `x` 를 받는다**(아군 창도 적에게 거는 창도 여기 · 2026-09-22 R136 — ~~`kind` 로 가르던 if 사슬~~) |
| `cooldownSec(B, u, def)` | **쿨 한 바퀴의 길이** = `def.cool × max([balance.csv:skill_cd_floor_mult], 1 − u.cdr)` [신설 2026-09-14 · R89 · 모듈 export] — 시전 뒤의 `readyAt` 과 **원정 도중 새로 생긴 스킬의 첫 준비 시각**(갈아입은 순간)이 같은 식을 쓴다 · 전투 시작 · 등장은 준비 상태로 출발해 안 쓴다(R100). rng 0 |
| `basicAttack(u, t, foes)` | 기본 공격 [신설 2026-09-09]. **평타 부여 창을 여기서 읽는다** — `attack_splash` 가 켜져 있으면 단일 → **적 전원**이고 배율이 창의 값 %(없으면 1배 단일) · `onhit_element` 가 켜져 있으면 때린 대상마다 **원소 추가타 1회**. ⚠ 창이 하나도 없으면 **종전과 완전히 같다**(`strikeOnce(u, pickTarget(u, foes), 1, null)` 1회) |
| `targetsOf(u, x)` | heal·apply(버프 · 디버프 · 오오라) 가 공유하는 대상 풀(`x.target`) — §2-11 `SUPPORT_TARGETS`·`DEBUFF_TARGETS` 규칙 그대로. **rng 0회** |
| `castSummon(u, x, t)` | `ctx.makeSummon` 이 만든 유닛을 **아군 배열에 push** 하고 `summon` 이벤트를 남긴다. 벽 HP = `max(1, round(시전자 hpMax × x.mult × x.statMult))`(`statMult` = 능력치 계수 · 2026-09-18 — ~~`+ def.flat`~~) |
| `castCall(u, x, t)` | **불러내기** [신설 2026-09-18 · §2-13] — `ctx.callBand(u, t)` 가 시전자의 무리 중 서 있지 않은 것을 전부 세우고 표시값 배열(`units`)과 뒤따를 오오라 창 이벤트(`then`)를 돌려준다(적 배열에 붙이는 것도 · 되살리는 것도 battle.js 몫). `units` 가 비었으면 아무것도 안 한다 · 아니면 `call` 이벤트 → `then` 순으로 남긴다 · rng 0 |
| `expire(u, t)` | 창·배리어 만료(`until ≤ t + EPS`) → `buffEnd`(**`quiet` 창은 안 낸다** — 무기 옵션 창 · R78) → 바뀌었으면 `refreshDerived` |
| `castHeal(u, x, t)` · `castBuff(u, x, t)` | §2-6 회복·버프 창 행. **`castHeal` 은 rng 1회**(회복량 굴림 · 대상 선택 앞 · R90). 배리어는 `EFFECTS.barrier_pct.apply`. `x` 는 **`scaleDef` 가 낸 시전 단위**다(`statMult`·실효 `value`·`dur`) — `statMult` 가 없으면 1 로 읽는다. **창을 거는 함수는 걸린 효과 행 + 거는 스킬 id 를 받는다** — 창의 열쇠 = `x.id`(거는 스킬) · 창의 `stat`·`v`·`until`·`element` = 걸린 효과를 푼 `x.stat`·`x.value`·`x.dur`·`x.element`(같은 스킬 재시전 = 갱신 · 다른 스킬의 같은 능력치 = 덧셈 — S2-a · 2026-09-22). `castBuff` 는 `duel` 이면 시전자에게 같은 `until` 의 `dr_pct` 창도 연다(§2-6 `duel` 행 · 2026-09-10 R72) · `until` 은 시전자의 **버프 지속시간**(`u.buffDur`)을 곱한다(§2-6 버프 창 행 · 2026-09-21) |
| `alive(list)` · `alliesOf(u)` · `foesOf(u)` | 진영 조회 |
| `createHooks()` | `{ emit(name, unit, payload) }` — `unit.reactions` 의 `{on, fn}` 을 **배열 순**으로 부른다. 핸들러 시그니처는 **`fn(unit, payload)`**(`payload` 에 `t` 와 사건별 필드 — §2-6 「사건 훅」 행). 발화 지점·순서는 §5-2 |
| (런타임 객체 `rt`) | `act`·`expire`·`castHeal`·`castBuff`·`castSummon`·`castCall`·`basicAttack`·`targetsOf`·`buffSum`·`alive`·`alliesOf`·`foesOf` 에 더해 **`rng`·`strikeOnce`·`pickTarget`** 도 같은 객체에 싣는다 — 등록표(§2-11)의 대상 핸들러가 `rt.*` 만 보고 battle.js 를 import 하지 않게 하는 이음매 |

⚠ `reactions` 를 등록하는 소비자는 아직 없다 — 마스터리 T3(반응 패시브 · skill_design §1-2·§3-3)의 자리다. 등록이 0 이면 rng·타임라인이 훅 도입 전과 같다(골든 `tl` 이 잠근다).

### 2-13. `spawn_rule.js` — 스테이지 편성 예외 (2026-09-18 신설)

순수 모듈 · 상태 없음 · rng 없음. **스테이지 컨셉이 편성을 바꾸는 자리**다(monster_design §4). 스테이지마다 모양이 달라 CSV 칸이 아니라 **코드**에 둔다 [2026-09-18 사용자 결정] — 칸으로 두면 컨셉 하나에 칸이 하나씩 늘고 나머지 스테이지는 빈칸이다. 굴림은 `battle.spawnRound` 가 하고(§5-2) 이 파일은 **목록과 범위만** 바꾼다. **규칙 함수는 다시 쓰라고 있다** — 새 스테이지가 같은 모양이면 표에 한 줄을 더하고, 새 모양이면 규칙 함수를 하나 더 만든다.

| export | 계약 |
|---|---|
| `roundFrom(id, n)` | 그 몬스터는 **n 라운드부터** 나온다 — 앞 라운드의 라운드 풀에서 뺀다(정예 후보는 라운드 풀에서 나오므로 같이 빠진다) |
| `eliteOnly(...ids)` | 정예 후보를 이 몬스터들로 좁힌다 |
| `summoner(id)` | **소환사** — 이 몬스터가 라운드에 서면(등급 무관) 그 뒤의 뽑기는 **소환사를 뺀 풀**에서 하고, 편성이 끝나면 **라운드 상한 `[balance.csv:wave_monster_max]` 까지** 같은 풀에서 채운다. 그래서 소환사는 라운드에 하나뿐이다. **소환사 뒤에 뽑힌 몫(채움 포함)은 서지 않고 대기한다** [개정 2026-09-18 · 사용자 지시] — 라운드는 소환사(와 그보다 먼저 뽑힌 몬스터)로 시작하고, 대기는 소환사의 **불러내기 스킬**(§2-8 `call`)이 세운다. 소환사의 **무리**(유닛의 `band`) = 그 라운드의 다른 적 전부(대기 포함) — 쿨이 돌 때마다 무리 중 서 있지 않은 것(대기 · 쓰러진 것)을 한 번에 세운다. **소환사는 고유 스킬이 `call` 종류여야 한다**(생성 때 throw — 없으면 대기가 영영 안 선다) |
| `bossEscorts(lo, hi)` · `bossAlone()` | 보스 호위 수 범위를 바꾼다 — `bossAlone()` = `bossEscorts(0, 0)`(호위 수 굴림 1회는 그대로 돈다 · 챕터보스 스테이지와 같은 규칙) |
| `STAGE_SPAWN_RULES` | `{stageId: [규칙]}` — **배열 순서대로 겹쳐 건다**. 표에 없는 스테이지는 예외가 없다(편성 · rng 가 예외 도입 전과 같다) |

규칙 객체의 모양 = `{refs, pool?(ids, n), elitePool?(ids), summoners?, escorts?(lo, hi)}` — 끼어드는 자리 넷과, 생성 시 검사가 볼 몬스터 번호(`refs`).
**지금 표** — `101`(1-1 파멸의 진영 · 「주술사가 나머지를 소환한다」): `roundFrom(1103, 3)` · `eliteOnly(1103)` · `summoner(1103)` · `bossAlone()`. 주술사의 고유 스킬은 **고블린 소환**(`skill.csv:mon_summon_goblin` · `call`)이다.
**CSV 로 올리는 기준** — 같은 규칙을 **두 번째 스테이지**가 쓰면 그 규칙만 칸으로 올린다. 그때까지 표의 번호 · 라운드 수는 §5-3 의 코드 상수다.

### 2-14. `construction.js` — 건설 (2026-09-22 신설 · R137)

순수 모듈 · 상태 없음 · rng 없음. **건물이 무엇을 여는지는 표 넷이 정하고 이 모듈은 센다** [construction_draft §11 구조 확정 2026-09-22]. 세이브는 **건물별 랭크 숫자**만 들고(§4 `buildings`), 「무엇이 열렸나」는 부를 때마다 표에서 다시 센다 — 표를 고치면 옛 세이브도 곧바로 새 표를 따른다(이관이 필요 없다).

`createConstruction({buildings, ranks, effects, research, stageIds, resources, balance})` — 표 넷(`building.csv` · `building_rank.csv` · `building_effect.csv` · `research.csv` 의 파싱 행) · 스테이지 id 목록(문턱 `stage:` 검증) · 재화 id 목록(비용 검증 — `gold` · `dust` · `stigma` + 제작 재료 id · `ui/data.js` 가 파견처 표에서 모은다) · balance(문턱 값에 키 이름을 적었을 때). **생성 때 검증한다**(어기면 throw) — 건물 id 유일 · 이름 · 탭이 비지 않는다 · 랭크는 건물마다 **1 부터 연속** · 시작 랭크 ≤ 최대 랭크 · 여는 것은 있는 랭크를 가리키고 대상이 어휘에 있고 **종류가 맞다**(켜기 대상을 더하기로 적지 않는다) · 더하기 값은 1 이상 정수 · 켜기는 값이 없다 · 조건 · 비용 모양 · 조건이 가리키는 스테이지 · 건물 랭크 실재 · 연구 id 유일 · 연구 대상이 어휘에 있다 · `status` 는 `proposed` · `fixed`.

**어휘 — 코드가 정하는 것은 이것뿐이다**(construction_draft §11 「누가 정하나」):

| export | 내용 |
|---|---|
| `TARGETS` | 여는 것의 「무엇」 `{id: {kind: 'unlock' \| 'add', live}}`. `live: false` = **준비 중**(그 기능이 아직 없다 — 화면은 「준비 중」). **새 기능을 건물 뒤로 넣을 때만 한 줄 는다** — 그 기능 자리에는 `state.hasFeature` 한 줄. 더하기 대상 중 **`state.limitsOf` 의 키와 같은 이름**(`bag` · `stash` · `roster` · `presets` · `potionSlots` · `upgrade` · `tavernCandidates` · `searchSlots` · `shopPerSlot` · `shopWeapon`)은 그 상한에 **기본값 위로 더해진다**(2단계 2026-09-22 · `state.limitsOf`) — 단계 셋 `make_level` · `potion_tier` · `tactic_slots` 는 `makeLevels` · `potionTier` · `tacticSlots` 에 붙는다(기본값 0). 연구의 상한은 `research:<연구 id>` 로 더한다(표에 연구가 있을 때만 유효) |
| `CONDITIONS` | 문턱 조건 종류 넷 — 칸 = `종류:값` · 여러 개는 `\|` 로 잇고 **전부** 채운다. `stage:<id>`(그 스테이지 클리어) · `total:<n>`(로스터 합산 레벨 **도달 최고치** — `state.peakTotal`) · `hero:<n>`(로스터 최고 영웅 레벨) · `building:<id>:<랭크>`(그 건물이 그 랭크 이상). 수 칸에 **balance 키 이름**을 적으면 그 값이다 — 같은 수를 두 곳에 두지 않는다(훈련장의 전직 랭크 ← `advance_unlock_level`) |
| `RESEARCH_TARGETS` | 연구가 받는 대상 `{id: live}` — 전부 `false`(그 값을 읽는 자리가 아직 없다 · construction_draft §5) |

| 시스템 export | 계약 |
|---|---|
| `list` | 건물 정의 — `building.csv:sort_order` 순 `{id, name: {ko, en}, tab, startRank, maxRank}` · `tab` = 붙는 화면 탭 id(`-` = 없음 — 흐린 탭 규칙이 읽는다 · `tabs`) |
| `research` | 연구 정의 — `{id, building, target, perLevel, cost, name}` (지금은 비었다) |
| `startRanks()` | 새 게임의 랭크 `{id: n}` — 시작 랭크가 0 인 건물은 안 적는다 |
| `fitRanks(ranks)` · `fitResearch(levels)` | 세이브를 표에 맞춘다 — 표에 없는 건물 · 0 · 정수 아님은 지우고 최대 랭크에서 자르고 **시작 랭크보다 낮으면 올린다**(표에 새로 선 건물) · 연구는 없는 항목 · 0 · 정수 아님을 지운다 |
| `rankInfo(id, rank)` | 그 랭크의 `{require, cost: [{res, n}], effects: [{kind, target, value, live}]}` — 없으면 `null` |
| `opened(ranks)` | `{features: [id], adds: {target: n}}` — 지어진 랭크까지의 여는 것. **준비 중 대상도 모은다**(그 기능이 생기면 곧바로 먹게) |
| `check(require, ctx, ranks)` | 조건마다 `{kind, ref, need, have, ok}` — `ctx = {cleared: Set, peakTotal, topLevel}` · 건물 랭크는 `ranks` 에서 읽는다 · `ok = have ≥ need`(스테이지는 클리어면 1) |
| `nextState(id, ranks, ctx, wallet)` | 다음 랭크 판정 `{rank, require, cost: [{res, need, have}], effects, err}`. **판정 순서가 결과 코드의 순서다** — `missing`(없는 건물) → `maxRank`(다음 랭크가 없다) → **`pending`**(여는 것이 전부 준비 중 — 여는 것이 없는 랭크도 같다) → `locked`(조건 미달) → `gold` → `materials`(골드 밖의 재화) · `null` = 지을 수 있다 |
| `bonus(levels, target)` | 연구 배율 `1 + Σ(레벨 × 레벨당 %)` — 그 대상을 받는 연구를 모두 더한다 · 연구가 없으면 1. **다른 원천과는 부르는 쪽이 곱한다**(construction_draft §11-7) · 모르는 대상은 throw |
| `reach(target, n = 1)` | 그 대상이 **n 에 닿는 랭크** `{id, name, rank}` · 못 닿으면 `null` [2단계 2026-09-22] — 켜기 = 그 줄이 처음 나오는 랭크(n 은 안 본다) · 더하기 = 값을 쌓아 n 이상이 되는 랭크(기본값은 안 센다 — 부르는 쪽이 뺀다). 여러 건물이 한 대상을 더하면 **표의 건물 순서 · 랭크 순서**로 쌓는다. `state.needOf` 가 부른다 |
| `tabs(ranks)` | 화면 탭마다 열렸나 `{tab: bool}` [2단계 2026-09-22] — 그 탭에 붙은 건물 중 **하나라도 지어졌으면** 연다(한 탭에 건물 여럿도 받는다 — 지금 표는 탭마다 하나다). 붙은 건물이 없는 탭은 안 적는다(늘 열림) |

---

## 3. 결과 코드 사전

| 코드 | 뜻 | 내는 곳 |
|---|---|---|
| `missing` | 대상 없음 / 가방에 없음 | equip · unequip · salvage · toggleParty · hire · **upgradeItem** · **dismiss** · **searchSend** · **setStageLevel** · **makeItem**(없는 부위 · 레벨 · 종류) · **swapHeroes** · **makePotion**(표에 없는 물약) · **selectPreset** · **setPotionSlot** · **swapPotionSlot** · **canDepart**(없는 편성) · **construct**(없는 건물 · R137) |
| `class` | 직업 전속 무기군 아님 | equip |
| `bagFull` | **인벤토리** 초과 | equip · unequip · **moveToBag** · **makeItem** |
| **`stashFull`** | **창고 초과** | **moveToStash** (2026-09-11) |
| `full` | 파티 정원 | toggleParty |
| `locked` · `noParty` | 스테이지 잠김 / **그 편성의** 파티가 비었다 · **마스터리 해금 레벨 미달** · **전술 칸 미해금** · **지금 제작이 안 열린 물약**(R103) · **자물쇠가 걸린 아이템**(2026-09-21 · ADR-0185) | canDepart · learnMastery · **toggleTacticLock** · **makePotion** · **salvage** · **construct**(건설 문턱 미달 · R137) |
| `gold` · `roster` | 골드 부족 / 로스터 정원 | tavernReroll · hire · **rerollTactic**(`gold`) · **upgradeItem**(`gold`) · **searchTake** · **makePotion**(`gold`) · **construct**(`gold` · R137) |
| **`equipped`** · **`last`** | 장비를 걸치고 있다 / 마지막 한 명이다 | **dismiss** (2026-09-09) |
| `allLocked` | **굴릴 칸이 없다** — 열린 칸을 전부 잠갔거나 열린 칸이 하나도 없다 [신설 2026-09-01 · 구현 2026-09-22 · R28] | rerollTactic |
| `maxRank` · `points` | 랭크 상한 / 마스터리 포인트 부족 | learnMastery · **construct**(`maxRank` — 다음 랭크가 없다 · R137) |
| `noRank` | **뺄 랭크가 없다** — 랭크 0 인 노드를 되돌리려 했다 ⚠ [신설 2026-09-08] | unlearnMastery |
| `maxUp` | 강화 상한(`equip_upgrade_max`) 도달 | upgradeItem |
| **`noBase`** | **베이스 능력치가 없는 부위**(목걸이 · 반지) — 강화 대상이 아니다 [신설 2026-09-15 · R95] | **upgradeItem** |
| **`slotsFull`** | **물약 칸이 다 찼다** — 앞의 빈 칸에 넣으려는데 빈 칸이 없다 [신설 2026-09-21 · R124] | **setPotionSlot** |
| **`materials`** | **제작 재료가 모자란다** — 광석 · 목재 · 가루 중 하나라도 레시피에 못 미친다 [신설 2026-09-15 · R96] · **건설 비용의 골드 밖 재화**(R137) | **makeItem** · **construct** |
| **`range`** | **스테이지 레벨이 기본 레벨 ~ 상한 밖**이거나 정수가 아니다 [신설 2026-09-14 · R87] | **setStageLevel** |
| **`searching`** | **수색 나가 있다** — 마을에 없으므로 편성에 넣지도 해고하지도 못하고, **든 편성은 못 나간다** [신설 2026-09-09 · 출발 2026-09-21] | **toggleParty** · **dismiss** · **canDepart** |
| **`busy`** · **`party`** | 이미 나간 수색이 있다 / **지금 싸우는 영웅**은 못 보낸다 [신설 2026-09-09 · 2026-09-21 — 편성은 안 막는다] | **searchSend** |
| **`none`** · **`notDone`** | 나간 수색이 없다 / 아직 안 돌아왔다 [신설 2026-09-09] | **searchTake** · **searchDrop**(`none`) |
| **`answered`** · **`notOpen`** | 이미 답했다 / 아직 만나지 않았다 [신설 2026-09-09] | **searchAnswer** |
| **`running`** | **지금 싸우는 영웅**이다(`runParty`) — 도는 원정의 인원이라 지울 수 없다 [신설 2026-09-14 · R89 · R92] | **dismiss** |
| **`done`** | 그 원정은 이미 끝났다(마지막 라운드 · 철수 · 끊김 · 새 출발이 끊었다) [신설 2026-09-14 · R89] | **advanceRun** · **retreatRun** · **stepRun** |
| **`downed`** | **도는 원정에서 쓰러져 있는 영웅**이다 — 그 런이 끝날 때까지 장비 · 스킬 트리를 못 바꾼다(`state.run.fallen`) [신설 2026-09-21 · R130 · base_expedition_design §1-5] | **equip** · **unequip** · **learnMastery** · **unlearnMastery** · **resetMastery** |
| **`invalid`** | **모르는 값** — 받는 값의 어휘 · 범위 밖 [신설 2026-09-21 · R125 · ADR-0242] — 화면이 고르게 하는 값이라 문구 키가 없다(오면 버그) | **setAutoSalvage** · **sortStorage** |
| **`unbuilt`** | **그 기능을 여는 건물(랭크)을 아직 안 지었다** — 기능 자리마다 `hasFeature` 가 막는다. 화면은 `needOf` 로 「무엇을 지어야 하나」를 말한다 [신설 2026-09-22 · R137 · 건설 2단계] · ⚠ 물약 단계 `locked`(makePotion — 단계가 안 열렸다)와 다른 코드다 · **분해 · 알아서 분해는 이 코드를 안 낸다**(건물 없이 열려 있다 · 2026-09-23 · R140) | **canDepart** · **setStageLevel** · **upgradeItem** · **makeItem**(`makeState.err`) · **moveToStash** · **hire** · **tavernReroll** · **searchSend** |
| **`pending`** | **그 랭크가 여는 것이 전부 준비 중이다**(아직 없는 기능 — 여는 것이 없는 랭크도 같다) — 지으면 비용만 내고 아무것도 안 열려서 막는다. 그 기능이 생기면 표를 안 고쳐도 지을 수 있게 된다 [신설 2026-09-22 · R137 · construction_draft §11-5] | **construct** · **constructionState**(`next.err`) |

렌더러는 코드를 i18n 키로 바꿔 보여준다 (`ch.err.<code>` 등). **코드 문자열이 곧 계약** — 바꾸면 i18n 도 깨진다.

---

## 4. 세이브 스키마 v37

```
{
  version: 37, seed: uint32, createdAt: ms, savedAt: ms,
  resources: { gold, dust, stigma },      // `dust` = **분해** 산출 · **제작 재료**(item_design §7-1 · 2026-09-15). 처치는 안 뱉는다 (v19)
  materials: { yieldId: n },              // **제작 재료 — 광석 · 목재** [2026-09-15 · R96 · 버전 무변경 — 아래]. 키 = 산출물 id(`mine_node.csv:ore_id` · `log_node.csv:timber_id`). 공급은 파견이 한다(미구현) — 지금은 `?dev=mats` 만 채운다
  potions: { potionId: n },               // **물약 재고 — v32** [2026-09-21 · R124]. 마시면 1 줄고(`advanceRun`) 만들면 1 는다(`makePotion`) · 0 이 되면 키를 지운다 · 새 게임은 `{id: potion.csv:start_owned}`. **칸 구성은 편성이 든다**(`presets[].potionSlots`) · 칸 수 · 쿨은 세이브에 없다
  heroes: [ hero ],                       // §2-4 hero 객체. equipped 키 = 착용 위치 8개 · mastery {nodeId:rank} · masteryPoints · innate(고유 스킬 id) · face(초상 id `<classId>_<k>` 문자열 | null — **직업 풀에서** 생성 시 1회 굴림 · 이후 불변 · 풀 0장인 직업은 null · v13 2026-09-07) · skillOrder?(선택 — 칸 순서)
  presets: [ { party: [ heroUid ], formation: { tpl, ranks: [[uid...],[uid...]] }, potionSlots: [ potionId | null ], tactics: { slots: { 칸번호: {id, grade} }, locked: [ 칸번호 ] } } ],
                                          // **편성 — v32** [2026-09-21 · R122 · R124]. 길이 = `[balance.csv:party_preset_count]` · 편성 번호 = 자리 + 1.
                                          //   `party` = **편성한 순서 그대로** — `party[0]` 이 리더 · 한 영웅이 여러 편성에 든다 · 새 게임은 전부 `[]` (2026-09-09).
                                          //   `formation` = **진형(v20)** — `tpl` = `formation_template.csv:tpl_id` · `ranks[0]` 전열 · `ranks[1]` 후열 ·
                                          //     전투가 읽는다(「앞부터 때린다」의 「앞」) · 정규화는 소속을 바꾸는 쪽이 한다 (§2-7).
                                          //   `potionSlots` = **물약 칸 구성** — 길이 = `[balance.csv:potion_slot_max]` · `null` = 빈 칸 · 같은 id 가 여러 칸에 든다.
                                          //     런을 열 때 재고에서 앞 칸부터 채운다(모자란 칸은 빈 채 나간다)
                                          //   `tactics` = **파티 전술 칸 — v34** [2026-09-21 · R129] — **리롤로 바꾼 칸만.** 안 담긴 칸은 시드가 내는 첫 배정이다
                                          //     (모든 편성이 같다 · §2-9 initialAssign · 그쪽은 언제나 `common`). 열린 칸 수는 계정(합산 레벨)이라 세이브에 없다
                                          //     `locked` = **잠근 칸 번호 — v35** [2026-09-22 · R28] · 오름차순 · 전체 리롤이 건너뛰고 비용은 그 개수가 정한다(§2-7) · 로드가 표에 없는 번호 · 중복을 걸러 낸다
  preset: n,                              // **고른 편성 번호 — v32**(1 부터). 편성 탭 · 출정 창 · 상단바가 같이 쓰는 값이다
  bonds: { "uid|uid|uid": n },             // **같이 나간 런 수 — v36** [2026-09-22 · R134] — 키 = 나간 인원의 uid 를 정렬해 이은 것(순서 · 자리 무관) · 출발(`departRun`)할 때 +1 · 전술 「관계」 조건이 읽는다(§2-9 `together`) · 로드가 1 이상 정수만 남긴다
  items: { itemUid: item },               // §2-5 item 객체 — `up`(강화 단계) 포함 · **무기 `watk` 없음 — v26**(피해 범위는 파생 · R90), 접사 값은 강화가 박아 둔 값. **무기는 `skill`(담은 액티브 id)도 든다 — v18** · **접사는 출처 `src` 를 든다 — v23** · **방어구도 세 층(고정 · 죄종 칸 · 공통) — v30** · **이름의 죄종 단어 `words` — v31** · **반지 · 목걸이도 세 층 · 목걸이 `proc`(발동 스킬) — v33**
  bag: [ itemUid ],                       // **인벤토리** — 순서 = 표시 순서. 드롭이 쌓이는 쪽이고 상한은 `[balance.csv:inventory_cap]`
  stash: [ itemUid ],                     // **창고 — v24**. 플레이어가 직접 옮긴 것만 든다 · 상한 `[balance.csv:stash_cap]`
                                          //   창고에서도 **장착 · 분해 · 강화가 그대로** 된다(꺼내는 단계가 없다 — item_design §1)
  buildings: { buildingId: rank },       // **건물 랭크 — v37** [2026-09-22 · R137 · construction_draft §11] · 0 은 안 적는다 · **「무엇이 열렸나」는 저장하지 않는다**(`construction.opened` 가 표에서 센다) · 로드가 표에 맞춘다(`fitRanks` — 없는 건물 지움 · 최대에서 자름 · 시작 랭크보다 낮으면 올림) · 새 게임 = `building.csv:start_rank`
  research: { researchId: level },        // **연구 레벨 — v37** · 로드가 없는 항목을 지운다 · 지금은 항목이 없어 언제나 {}
  autoSalvage: { rarity, ilvlBelow },     // **알아서 분해의 선** [2026-09-21 · R125 · 버전 무변경 — 아래]. rarity = null | 'normal' | 'magic' (그 등급 **이하**) · ilvlBelow = 그 **미만**(0 = 안 봄)
  progress: { cleared: [ stageId ], levelUp: { stageId: n }, peakTotal: n },   // **peakTotal** = 로스터 합산 레벨의 도달 최고치(v37 · R137 — `dismiss` 가 내리기 전에 적는다 · 0 이면 지금 합산이 곧 최고치) · **`levelUp`** = 스테이지별 **올린 양**(2026-09-14 · R87 · 버전 무변경 — 아래)
  codexKills: { monsterId: n },           // **도감 레벨의 출처** [2026-09-21] — 이긴 라운드의 처치만 센다 · 누적 · 역행 없음
  counters: { hero, item, battle, tavern, tactic, upgrade, search, make },   // uid 발급·시드 파생의 유일한 출처 · upgrade 는 R95(2026-09-15)부터 안 오른다 — 자리만 남는다 · **make** = 제작 스트림의 회차(R96 · 없으면 0)
  run: { stageId, preset, repeat, lastAt, durationSec, active, fallen? } | null,   // **`active` — v25** = 원정이 도는 중 · **`preset` — v32** = 나간 편성 번호(반복이 그 편성으로 다시 나간다) · **`fallen` — 2026-09-21 · R130 · 버전 무변경** = 이 런에서 쓰러져 있는 영웅 uid(`stepRun` 이 채운다 · `departRun` 이 비운다 · 없으면 `[]` — `active` 일 때만 읽는다: 장비 · 스킬 트리 잠금 `downed`). ~~`downed`~~(v17 삭제 — 옛 「출정 아웃」)와 **다른 필드다**. 런 핸들(전투 안의 상태)은 세이브에 없으므로 **불러온 세이브에 `active` 가 서 있으면 그 원정은 끊긴 것이다**(`closeRun`)
  reports: [ report ],                    // **리포트 목록 — v21**. 최신이 맨 앞 · 상한 [balance.csv:report_keep] · 새 게임은 `[]`
                                          //   반복 원정은 이기는 동안 런을 잇는데 칸이 하나면 앞 런이 매번 덮여 사라졌다 (SCREEN_DESIGN §4-3 · ADR-0063)
  notice: { kind: 'runClosed', stageId, at, seenAt } | null,
  tavern: { rerolledAt: ms | null, hired: [ slotIndex ] },  // 리롤 쿨다운의 기준 시각 · 이번 명단에서 산 칸. 명단 자체는 저장하지 않는다
  search: { heroUid, startedAt: ms, no, sin, cha, answer } | null,  // 나가 있는 수색 1건 [신설 2026-09-09]. 결과도 이야기도 만남도 저장하지 않는다 — `no`(= 그때의 `counters.search`)와 시드가 재현한다. `answer` = 만남에서 고른 답 id | null (고용비만 깎는다)
}
```

- **uid 형식** — 영웅 `h{n}`, 아이템 `i{n}`. 발급은 `state.js:addHero / addItem` 만
- **`search` 는 버전을 안 올리고 들어왔다** [2026-09-09] — 필드가 없으면 `null`(= 수색을 한 적이 없다)이고 **그것이 정확한 초기 상태**라 이관이 소급할 판단이 하나도 없다. `deserialize` 끝의 기본값 보정 두 줄(`search ?? null` · `counters.search ?? 0`)이 곧 이관이다. ⚠ v5 의 `tavern` 은 달랐다 — 「쿨다운이 열린 상태로 올린다」는 **판단**이 필요해서 이관 절이 있어야 했다. 판단이 있으면 절을 쓰고 없으면 안 쓴다
- **`progress.levelUp` 도 버전을 안 올리고 들어왔다** [2026-09-14 · R87] — 없으면 `{}`(= 아무 스테이지도 안 올렸다)이고 그것이 정확한 초기 상태다. **레벨이 아니라 올린 양**을 두는 까닭은 기본 레벨(`stage.csv:dlvl`)이 다시 깔려도 어긋나지 않게이다. 읽는 쪽(`stageLevelState`)이 `[base, max]` 로 자르므로 상한을 넘는 기록은 조용히 줄어든다 — 쓰는 쪽(`setStageLevel`)은 애초에 범위 밖을 거절한다
- **`materials` · `counters.make` 도 버전을 안 올리고 들어왔다** [2026-09-15 · R96] — 없으면 `{}` · `0`(= 가진 재료가 없다 · 만든 적이 없다)이고 그것이 정확한 초기 상태다. `deserialize` 끝의 기본값 보정 두 줄이 곧 이관이다
- **`autoSalvage` 도 버전을 안 올리고 들어왔다** [2026-09-21 · R125] — 없으면 `{rarity: null, ilvlBelow: 0}`(= 꺼짐)이고 그것이 새 게임의 초기 상태와 같아 소급할 판단이 없다. `deserialize` 끝의 기본값 보정 한 줄이 곧 이관이다
- **`codexCards` 는 버전을 안 올리고 나갔다** [2026-09-21 — 도감 카드 걷음 · monster_design §8] — 도감 레벨의 출처가 **이미 세이브에 있던** `codexKills` 로 옮겨 가 레벨이 그 값에서 다시 계산된다 — 이관이 소급할 판단이 없다. `deserialize` 가 필드를 **지운다**(안 쓰는 값이 세이브마다 남지 않게)
- **`items[*].locked` 도 버전을 안 올리고 들어왔다** [2026-09-21 · ADR-0185] — 없으면 **안 잠긴 것**이고 그것이 정확한 초기 상태라 이관이 소급할 판단이 하나도 없다. 기본값 보정조차 필요 없다(읽는 쪽이 `if (it.locked)` 로 본다). **끄면 필드를 지운다** — `false` 를 남기면 안 쓰는 값이 개체마다 쌓인다
- **`potions` 는 v32 에서 재고(개수 표)가 됐다** [2026-09-21 · R124] — 그 전(R103 · 버전 무변경)엔 가진 종류 목록이었다. 표에서 사라진 id 가 재고에 남아 있어도 로드는 지우지 않는다 — 칸 채우기가 그 칸을 빈 칸으로 낸다
- **`search.sin`·`search.cha` 는 스냅샷이다** — 보낼 때의 값이 결과를 정한다. 나간 뒤에 그 영웅이 레벨업해도 결과가 뒤바뀌면 안 되기 때문이고, 그래서 판정 입력이 세이브에 든다
- **HP 는 세이브에 없다** — 매 전투 최대치 시작. ~~전투불능은 `run.downed`(이번 출정 누적 아웃) 하나~~ 는 **2026-09-08 삭제**(v17) — 아웃은 **그 런 안에서만** 살고 런은 출발 순간 통째로 정산되므로 **세이브가 들 전투불능 상태가 하나도 없다.** 회복 대기도, 누적 아웃도 없다 (base_expedition_design §1-1)
- **타임라인은 세이브에 없다**
- **버전 정책** — 올릴 수 있는 버전은 `deserialize` 안에서 올리고, 못 올리는 버전은 throw. 렌더러는 throw 를 잡아 시작 화면에 사유를 보여준다 — 이 처리는 렌더러의 책임이지 state.js 의 계약이 아니다. **지금 여는 버전은 v37 하나다**(아래)

**v37 에서 끊었다** [2026-09-22 · 사용자 지시 「이번 버전 시작하면 새로운 데이터 저장되기 전까지 무조건 신규로 시작」 · DEV_PLAN R139] — `deserialize` 는 **v37 만 연다.** v1 ~ v36 은 throw 하고 렌더러가 시작 화면에 「이전 형식」 한 줄을 세운다 — **새 게임을 시작해 저장된 순간부터** 이어하기가 된다(SCREEN_DESIGN §3).

- **이관 코드와 그 단정을 지웠다** — `upgradeV2` ~ `upgradeV36` 과 그것만 부르던 도구(`item.legacyWeaponLayers` · `legacyArmorLayers` · `legacyAccessoryLayers` · `legacyName` · `regroupWeapon` · `baseImplicit` · `naming.baseOf` · `construction.autoRanks` · 상수 `LEGACY_PCT` · 소급 스트림 `0xFACE` · `0x5C11`)는 부를 곳이 없다. v1 을 끊을 때와 같은 처리다. 옛 규칙은 git 이력에 있다(커밋 `e9eeb52` 까지)
- **끊는 것은 이번 한 번이다** — v38 이 생기면 `upgradeV37` 을 `deserialize` 안에 두고 한 단계씩 올린다(위 「버전 정책」)
- **`deserialize` 끝의 기본값 보정은 남는다** — 버전을 안 올리고 들어온 필드(위 불릿들)는 v37 안에서도 없을 수 있다
- 저장소 키(localStorage) `thesevensim.save` — `ui/storage.js` 만 안다. Phase 2 에서 이 파일만 파일 시스템/클라우드 어댑터로 교체
- **클라우드 사본** [2026-09-14 · ADR-0112] — 로그인하면 **이 절의 세이브 그대로**를 Firestore `saves/<uid>` 에 문자열로 둔다(봉투 `{rev, savedAt, version, data}` — `data` = 세이브 JSON). 스키마 · 버전 정책은 바뀌지 않는다(**열 수 없는 사본**(v37 전)은 화면이 빈 클라우드처럼 다룬다 · SCREEN_DESIGN §2-1 · ADR-0303) — 봉투는 `ui/cloud.js` 가, 이 브라우저가 마지막으로 맞춘 사본의 기록(`thesevensim.cloud` = `{uid, rev, savedAt}`)은 `ui/storage.js` 가 든다. `game_logic` 은 둘 다 모른다

---

## 5. 결정론 계약

### 5-1. 시드 파생

| 스트림 | 시드 | 소유 |
|---|---|---|
| 시작 장비(무기 · 갑옷) | `deriveSeed(seed, 0)` | state.newGame |
| n번째 전투 | `deriveSeed(seed, counters.battle)` (선증가) | state.departRun — 한 원정의 모든 라운드가 이 스트림 하나를 이어 쓴다(`resolveBattle` 도 이것을 지난다 · R89) |
| **몬스터 차림** | 전투 스트림의 **첫 굴림** `floor(rng() × 2³²)` = 씨앗 → 몬스터마다 `deriveSeed(deriveSeed(씨앗, 라운드 번호), 목록 자리)` | battle.createRun · spawnRound [신설 2026-09-22 · 구조 감사] — **장비(`rollGear`)만** 여기서 굴린다. 전투 스트림과 안 섞여 아이템 옵션 · 부위 수가 장비 굴림 수를 바꿔도 **편성 · 전투 수열이 안 밀리고**, 몬스터마다 따로라 **다른 몬스터의 장비도 안 바뀐다**. 셋째 스킬은 전투 스트림이다 |
| 선술집 후보 | `deriveSeed(seed ^ 0x5A17, counters.tavern)` | state.tavernCandidates |
| 수색 결과 · 이야기 | `deriveSeed(seed ^ 0x5EA7, search.no)` | state.searchRoll — **저장하지 않는다.** 같은 세이브를 다시 열면 같은 영웅과 같은 이야기가 나온다 (신설 2026-09-09) |
| 수색 만남 | `deriveSeed(seed ^ 0x11EE, no)` | state.searchMeetingOf — **결과 스트림과 갈라 두었다.** 회차 번호 하나로 정해지므로 **보내기 전에도 알 수 있고**(그것이 「소문」이 거짓이 아닌 이유), 결과 굴림의 소비 순서를 안 민다 (신설 2026-09-09 · ADR-0068) |
| ~~장비 강화~~ | ~~`deriveSeed(seed ^ 0xF0C3, counters.upgrade)`~~ | **[퇴역 2026-09-15 · R95]** 강화가 rng 를 안 쓴다 — 옵션 계단이 사라졌다. `counters.upgrade` 는 세이브에 남지만 더 오르지 않고, 솔트 `0xF0C3` 은 **재사용하지 않는다**(옛 세이브의 카운터와 새 스트림이 겹치지 않게) |
| **제작** | `deriveSeed(seed ^ 0xC4AF, counters.make)` (선증가) | state.makeItem [신설 2026-09-15 · R96] — 전투 · 선술집 · 전술 수열과 안 섞인다. 거절이면 스트림을 안 연다 |
| **상점 장비 목록** | `deriveSeed(seed ^ 0x5409, shopVisit.cycle)` | state.shopState [신설 2026-09-21 · ADR-0223] — **카운터가 아니라 방문 회차**가 두 번째 인자다. 저장하지 않는다 — 부를 때마다 처음부터 다시 굴리고 어느 수열도 밀지 않는다 |
| 시작 후보 (새 게임 화면) | `makeRng(ROLL_SEED + roll)` — 고정 상수 | **ui/app.js** — 세이브 밖. 같은 리롤 횟수면 언제나 같은 3명 |
| 마스터 시드 | `now() >>> 0` 확정 시각 | ui/app.js → newGame |

### 5-2. rng 소비 순서 (바꾸면 같은 시드가 다른 게임이 된다)

| 위치 | 순서 |
|---|---|
| `formula.strike` | 적중 → (적중 시) **피해** → 치명 → **(적중했고 추가 피해 확률이 있는 타격만) 추가 피해**. 빗나감 1회 · 확률 0 인 적중 3회 · 확률 > 0 인 적중 4회 [추가 피해 2026-09-10 · R72 · **피해 굴림 2026-09-14 · R90** — 적중한 직격마다 1회 늘었다 · 양끝이 같아도 소비 · ~~편차 굴림은 없다(무기 개체에 박혀 있다)~~]. **기본 공격은 확률이 언제나 0** 이라 수열이 종전과 같다 — 추가 피해를 가진 스킬(지금 차지 · 라이트닝 · 체인 라이트닝)의 타격만 한 번씩 더 굴린다 |
| `hero.rollAttributes` | 축별 가중치 7회 → 합 맞추기 루프(가변, 최대 500회) → 자리 바꿈(소비 없음) |
| `hero.rollHero` | **`rollTier` 1회 → `rollTotal` 1회 → `rollAttributes` 7회 → `rollInnate` 1회** = 언제나 10회 [개정 2026-09-08 · R48]. `rollInnate` 는 **그 영웅의 직업 풀**에서 굴리고(2026-09-09 · §12-1 규칙 1) **풀이 비어도 1회 소비한다**. ~~`rollCaps` 7회~~ 는 삭제(개체별 히든 상한 폐지) · ~~`rollAttributes` 의 나머지 보정 rng~~ 도 삭제(결정적 분배로 교체 — 굴림 결과가 소비 수를 밀면 안 된다). ⚠ **등급을 지정해도 `rollTier` 는 굴림을 태운다** — 소비 수가 등급에 의존하면 선술집에서 같은 시드가 다른 결과를 낸다 |
| `hero.rollStartParty` | 이름 n → 죄종 n → 직업 n → 특성 n → `rollHero` n명 → **얼굴 n회**(각자 제 직업 풀에서 1회씩 — **풀이 비어도 1회 소비**, 2026-09-07 개정). ⚠ **얼굴이 맨 뒤인 것이 계약이다** — 영웅 안에서 굴리면 앞 영웅의 얼굴이 뒤 영웅의 능력치를 밀어 같은 시드가 다른 파티를 낸다 |
| `hero.rollStartParty(n)` | 이름 n → 죄종 n → 직업 n → 특성 n → 영웅 i 마다 `rollHero` → 얼굴 n회(직업 풀 · 풀이 비어도 1회) |
| `hero.grantXp` | **0회** [개정 2026-09-14 · R83] — ~~레벨업 1회당 축별 7회 (상한 미달 축만)~~ 는 능력치 성장 폐지로 사라졌다. **라운드 사이에 불린다**(`state.advanceRun` · R89) — 0회라 전투 수열을 안 민다. ⚠ 성장이 굴림을 다시 쓰게 되면 **그 뒤 라운드의 전투 수열이 밀린다**(옛 판은 런의 마지막 소비자라 안 밀렸다) |
| `state.searchMeetingOf` | **만남 1회**뿐이다 — 전용 스트림(`^ 0x11EE`)이라 아래 `searchRoll` 의 소비 수열과 **섞이지 않는다** [신설 2026-09-09]. 한 스트림에 얹으면 만남 굴림이 결과 굴림을 밀어 **같은 시드가 다른 영웅**을 낸다. 답(`search.answer`)은 **굴림을 안 쓴다** — 문턱만 옮긴다(고용비) |
| `state.searchRoll` | **등급 1회**(매력이 민 레어 확률) → **`rollCandidates(rng, 1, [tier])` 10회** → **죄종 메아리 1회** → **막마다 1회**(`search_story.csv` 의 막 수 — 지금 3) = 막 셋이면 **15회** [신설 2026-09-09].<br>**결과를 먼저 굴리고 이야기를 뒤에 둔다** — 이야기 행이나 막을 늘려도 **나온 영웅이 안 바뀐다**(`rollFace` 를 맨 마지막에 두는 것과 같은 이유). 막을 늘리면 그 뒤의 소비만 는다.<br>죄종 메아리는 굴린 영웅의 `sin` 을 **덮어쓴다** — 죄종은 능력치·고유 굴림의 입력이 아니라(주력 축은 직업이 정한다) 덮어써도 앞의 소비가 안 밀린다.<br>막의 후보는 **공통(`-`) + 그 죄종** 행이고 **CSV 행 순서가 인덱스 순서**다 |
| `item.rollDrop` | **부위 1회** → `rollGear` 한 벌(아래) — 즉 부위 → 베이스 → 희귀도 → `build` [정리 2026-09-11 · R79 — 뒤 셋을 `rollGear` 에 위임했고 **수열은 종전과 같다**]. **`magicFind` 는 레어 가중치만 바꾸고 굴림은 1회 그대로**(R78). ⚠ **게임 경로에서는 더 안 불린다** — 처치 드롭이 「입고 있던 장비」로 바뀌어(R79) 부위를 굴리지 않는다. 검증·골든이 파이프라인 전체를 한 입구로 재는 자리로 남는다 |
| `state.shopState` | **부위 순서대로**(`equipSlots` 위치 순서에서 부위만 한 번씩) 부위마다 `shop_equip_per_slot` 칸(무기만 `shop_equip_weapon` 칸) — 칸마다 **ilvl 1회**(진행 챕터의 레벨대 `lo`~`hi` 균등) → **`item.rollGear` 한 점**(부위 하나: 베이스 → 희귀도 → `build` — **부위는 굴리지 않는다**) [신설 2026-09-21 · ADR-0223 · 부위 묶음 ADR-0232]. ⚠ **부위 순서가 계약이다** — 순서가 바뀌면 같은 시드 · 같은 회차가 다른 목록을 낸다. 전용 스트림이라 다른 수열과 안 섞인다(§5-1) |
| `item.rollGear` | **부위 배열 순서대로** 부위마다: 베이스(무기는 `weaponGroup` 을 주면 **0회** · 안 주면 무기군 1회 / 무기 외는 `itemBase` 를 주면 **0회**(제작 · 2026-09-21) · 안 주면 1회 — **후보는 그 ilvl 의 티어 행뿐**이지만 소비는 1회 그대로 · 2026-09-18) → **희귀도 1회**(`magicFind + rareBonusPct` 가 레어 가중치에 곱한다) → `build` [신설 2026-09-11 · R79]. ⚠ **부위 배열 순서가 계약이다** — 몬스터는 `monster.csv:wear_slots` 를 그 순서로 넘긴다 |
| `item.build` | **(매직 · 레어) 접두 죄종** [일반은 0회 — 2026-09-14 · R86] → **(레어) 접미 죄종** [개정 2026-09-11 · R77 — ~~(레어) 접미 판정 → (성공 시) 접미 죄종~~ · 죄종 수는 희귀도가 정한다(매직 1 · 레어 2) — 판정 1회가 빠졌다] · **이름의 죄종 단어는 소비 0** — 각 죄종 굴림의 소수부에서 낸다(§2-5 `words` · 2026-09-19 · R118) → **(무기) 옵션 세 층** [2026-09-11 · R78 — 고정 값 1 → 죄종마다 (행 1 → 값 1) → 통합옵션마다 (종류 1 → 변형 1 → 값 1) · 후보가 비어도 소비 수 불변 · §2-5 「무기 옵션」] / **(방어구 네 부위) 옵션 세 층** [2026-09-18 — 무기와 같은 모양: 고정 값 1 → 죄종마다 (행 1 → 값 1) → 공통옵션마다 (종류 1 → 변형 1 → 값 1) · 후보가 비어도 소비 수 불변 · §2-5 「방어구 옵션」] / **(목걸이 · 반지) 옵션 세 층** [개정 2026-09-21 · R127 — ~~접사 수 → 접사마다 (정의 선택 → 값)~~] — (목걸이만) 고정 = 발동 스킬 1 → 값 1 → 죄종마다 (행 1 → 값 1) → 공통옵션마다 (종류 1 → 변형 1 → 값 1) · 후보가 비어도 소비 수 불변 · §2-5 「반지 · 목걸이 옵션」 → **(무기) 베이스 1회** [신설 2026-09-10] → ~~**개체 굴림**(방어구 = implicit 편차 1회)~~ **2026-09-18 삭제 — 방어구 고유값도 굴리지 않는다**(방어구에서 소비 1회가 빠졌다 · ~~무기 = 데미지 편차~~ **2026-09-14 삭제 · R90**) → ~~(마법 무기) 원소~~ **[삭제 2026-09-11 · R80 — 생성 때 원소를 굴리지 않는다. 마법 무기에서 소비 1회가 빠진다]** → **(무기) 스킬 1회** [신설 2026-09-09 · `opts.avoidSkill` 로 풀을 좁혀도 1회 — 2026-09-14]. ⚠ 베이스·스킬 굴림은 **풀이 비어도 1회 소비한다** — 소비 수가 무기군에 의존하면 같은 시드가 다른 드롭을 낸다. 베이스 굴림은 **균등**(대역 가중 없음 — 수치 미발행) |
| `state.newGame`(시작 장비) | 영웅마다 **무기 → 갑옷** [개정 2026-09-14 · R86 — ~~시작 무기 하나 · magic 이라 접미 죄종을 굴리지 않는다~~]. 무기 = 무기군 1회 → `build`(normal — 죄종 0회 · 스킬은 고유 스킬을 뺀 풀에서 1회) · 갑옷 = 베이스 1회(ilvl 1 이라 후보는 클로스 아머 하나 · 2026-09-18) → `build`(normal — 죄종 0회 → 고정 1 → 공통옵션 `armor_common_opt_normal` × 3 · ~~접사 수 → 접사마다 (정의 → 값) → implicit 1회~~ 2026-09-18) |
| `item.upgrade` | **0회** [개정 2026-09-15 · R95] — ~~옵션 계단이면 접사 선택 1회~~ · 옵션 계단 퇴역. 베이스는 파생이다 |
| `state.makeItem` | `item.rollGear` 한 벌 — 부위 하나: **베이스 0회**(고른 종류 — 무기 = `weaponGroup` · 무기 외 = `itemBase`) → **희귀도 1**(`make_rarity_w_*`) → `build`(무기는 세부 베이스 1 · 스킬 1 이 그 안에서 그대로 돈다 — 세부 베이스는 `weaponBase` 로 고정돼 **굴림 값만 버린다** · 2026-09-21) [신설 2026-09-15 · R96 · **개정 2026-09-21** — ~~ilvl 1회(레벨대 균등) → 베이스 1~~ · 두 번이 빠졌다 · ilvl 은 고른 레벨]. 거절이면 **0회**(스트림을 안 열고 `counters.make` 불변) |
| `battle.spawnRound` | **2단이다** [개정 2026-09-11 · R79]. **1단 편성** — 보스: 호위 수 → 호위마다 풀 선택 / 일반: 정예마다 (죄종 → **정예 후보** → 공통 특성 2) → 일반 수 → 일반마다 풀 → **(소환사가 섰으면) 상한까지 채움마다 1회** [2026-09-18 · §2-13]. **스테이지 편성 예외는 목록과 범위만 바꾸고 굴림 자리를 늘리지 않는다**(채움만 새 자리다) — 라운드 풀 · 정예 후보는 예외가 줄인 목록에서 뽑고(후보가 하나여도 1회 소비) · 소환사가 선 뒤의 뽑기와 채움은 소환사를 뺀 풀에서 · 호위 수는 예외가 바꾼 범위로 1회. **예외가 없는 스테이지는 예외 도입 전과 순서·횟수가 같다** — 목록이 같은 배열이고 채움이 안 돈다. **2단 장비·스킬** — 편성이 확정된 뒤 **목록 순서로** 유닛마다: `wear_slots` 로 `itemSystem.rollGear` 한 벌(**그 유닛의 차림 스트림** — 전투 스트림 소비 0 · §5-1 · 2026-09-22) → (`grade.skill_slots ≥ 3` 이면) **셋째 스킬 1회**(전투 스트림 · 그 몬스터 직업 풀 · 풀이 비어도 1회 소비).<br>⚠ **1단이 2단보다 앞인 것이 계약이다** — 장비 굴림이 편성 굴림을 밀면 같은 시드가 다른 편성을 낸다(`rollFace` 를 맨 뒤에 두는 것과 같은 이유 · `state.searchRoll` 의 「결과를 먼저, 이야기를 뒤에」와 같은 규칙).<br>⚠ **장비는 처치가 아니라 스폰마다 굴린다** — 드롭이 안 나와도 몬스터는 장비를 입고 있다 (item_design §1 「몬스터 장비를 언제 굴리나」) |
| ⚠ `battle.stagePool` **순서** | `pool[Math.floor(rng × 3)]` 이 이 배열의 인덱스를 쓰므로 **순서 자체가 계약이다.** JS 에서 그 순서는 CSV 행 순서가 아니라 **`monster_idx` 오름차순** — `D.monsters` 가 정수 키 객체라 `Object.values` 가 정수 키를 강제로 오름차순 열거한다. 지금은 `monster.csv` 가 idx 순으로 쓰여 있어 **우연히 일치**할 뿐이다. **엔진에서 해시맵(순서 불정)을 쓰면 다른 게임이 된다** — 이식할 때 `monster_idx` 로 명시 정렬하라 (2026-08-31) |
| `battle.beginRound` | `spawnRound` → **적의 오오라 적용(rng 0 · R79)** → **적 스킬 첫 준비 시각 = 라운드 시작(rng 0 · R100)** → 적마다 등장 지연 1회. 둘째 라운드부터는 그 앞에 **경계의 갈아입기**(`refit` · rng 0 · 바뀐 영웅만)가 돈다. **소환사의 대기 무리는 셋 다 빠진다** [2026-09-18 · §2-13] — 라운드 시작에 안 서므로 오오라 · 준비 시각 · 등장 지연을 불러낼 때 받는다 |
| `skill_runtime.castCall` · `battle.callBand` | **0회** [신설 2026-09-18] — 무리를 세우고 되살리는 데 굴림이 없다. 선 유닛의 첫 차례 = **제 행동 주기 한 바퀴 뒤**(등장 지연을 굴리지 않는다) · 스킬은 준비 상태(부른 시각) · 오오라는 부른 순간 건다. 되살아난 유닛이 다시 쓰러지면 **`onKill` 을 안 지난다**(보상은 한 마리당 한 번 — 드롭 굴림도 없다) |
| `battle.createRun` 루프 (`simulate` 는 이것을 끝까지) | **런을 열 때 1회** — 몬스터 차림 씨앗(§5-1 · 2026-09-22 — 첫 라운드 스폰보다 앞). 그 뒤 틱마다 **창 만료 처리(소비 없음)** → **HP 재생(소비 없음)** → **물약(소비 없음 · 신설 2026-09-15 · R103 — 마실 영웅은 HP 비율 → 파티 순이라 굴림이 없다 · 물약이 없는 런은 이 단계가 안 돈다)** → `[...party, ...enemies]` 배열 순서로 `act`.<br>**경직(소비 없음 · 신설 2026-09-17 · R110)** — 직격(`strikeOnce`) 안에서 `hit` 바로 뒤에 걸고 **행동 예약만 민다**. 굴림 자리 · 횟수는 안 바뀌지만 **차례가 밀려 그 뒤 수열이 갈린다**(누가 먼저 때리나가 달라진다) |
| `battle.act` 기본 공격 [확정 2026-09-08 · 확장 2026-09-09] | 타겟 1회(**도발·지목 중이면 0회**) → `strike`. 대상은 **전열 생존자 중 균등 무작위**이고 전열이 전멸해야 후열이 열린다 — 영웅·몬스터 양쪽이 같은 규칙이다 [개정 2026-09-09 · ~~생존 적 중 균등 무작위~~ 폐기 · battle_design.md §3-1]. ⚠ **소비 횟수는 안 바뀐다** — 모집단이 좁아질 뿐이라 수열이 안 밀린다. 다만 **고른 결과가 달라져 골든은 재촬영**이다.<br>⚠ **평타 부여 창이 켜지면 소비가 는다** — `attack_splash` 는 타겟 굴림 **0회** + 적 수만큼 `strike`, `onhit_element` 는 때린 대상마다 `strike` 를 **한 번 더**. 창이 없을 때의 수열은 종전과 같다 |
| `battle.act` 스킬 | 발동 선택 0회 → `enemy_single`: 타겟 1회(도발 무관 — 파티 스킬은 도발 대상이 아니다) → `hits` 회 `strike` / `enemy_rotate`·`enemy_chain`: 시작점 1회(**`pickTarget` 을 지난다 — 전열 우선** · 2026-09-09 개정. 도는 것은 배열 전체다) → 타격마다 `strike` / `enemy_all`: 0회(감쇠가 있어도 **주 대상은 결정론** — 2026-09-10) → 대상마다 `strike` / **`enemy_highest_def`: 0회**(방어 최대 = 결정론) → `hits` 회 `strike` / **`heal`: 회복량 굴림 1회**(대상 수와 무관 · 대상 선택 앞 · R90) / `buff`·`aura`·`summon`: 0회.<br>⚠ **소환은 굴림을 안 쓰지만 모집단을 바꾼다** [2026-09-09] — 벽이 파티 배열에 서면 적의 타겟 굴림이 `foes.length` 가 커진 상태로 돌아 **그 뒤 수열이 통째로 달라진다**. 벽은 라운드 끝에 사라진다. ⚠ **여러 대상을 때리는 스킬은 대상마다 `strike` 를 부른다** — 적중·치명을 대상마다 따로 굴리는 것이 계약이고, 그래서 **타격 rng 소비가 대상 수에 종속**된다 [확정 2026-09-08 · battle_design.md §3-1]. ⚠ **타수 슬롯(`hits`)이 능력치로 오르면 `strike` 소비도 는다** — 계수가 0 인 동안은 불변이다 [2026-09-10 · skill_design §13-4] |
| `battle.onKill` | **판정은 처치 순간 · 결과 반영은 라운드 승리 순간**(R89 — 소비 순서 불변) · ~~카드 판정 1회~~ [2026-09-21 삭제 — 도감 카드 걷음 · **처치마다 1회가 빠져 같은 시드의 수열이 갈린다**] → **드롭 판정 1회**(처치당 최대 1개, 2026-08-28) → (드롭 시) **입은 부위 선택 1회** [개정 2026-09-11 · R79 — ~~ilvl 1회 → `rollDrop`~~ 삭제]. 떨어지는 것은 **스폰 때 이미 만들어진 그 몬스터의 장비 한 점**이라 여기서 아이템을 만들지 않는다. ilvl 굴림도 없다(스테이지 레벨 `+ grade.gear_ilvl_add` · 굴림 없음). ⚠ **적의 소환 벽은 처치가 아니다** — `onKill` 을 안 지나므로 **rng 0** · 골드·경험치·드롭 없음 (R79 — 몬스터가 소환 스킬을 쓰게 되며 생긴 경로) |
| `battle.strikeOnce` 반격 [신설 2026-09-18 · §2-6 「반격」] | 적중한 직격의 **끝**(훅 · 반사 · 전투불능 처리 뒤)에서 맞은 쪽이 `counter > 0` 이고 조건(살아 있음 · 소환 아님 · 경직 아님 · 때린 쪽 생존)이 맞을 때만 **판정 1회** → 터지면 `basicAttack` — **타겟 굴림 0**(대상 = 때린 쪽 · 광역 창이면 적 전원) → 타격마다 `strike`(+ 평타 부여 추가타). 반격 옵션이 없는 판은 **0회**라 수열이 종전과 같다. ⚠ **반격도 직격이라 반격을 부를 수 있다** — 그 안에서 같은 규칙이 재귀로 돈다(깊이 우선 — 먼저 터진 반격의 사건이 끝까지 돈 뒤에 바깥 타격의 다음 사건으로 돌아온다) |
| 사건 훅(`reactions`) | 핸들러가 rng 를 쓰면 **발화 지점에서** 소비한다 — `cast` 는 skill 이벤트 뒤 · `hit`/`hitTaken` 은 hit 이벤트 뒤 · `kill` 은 `onKill`(드롭) **뒤** · `down` 은 down 이벤트 뒤. 지금 등록된 핸들러 0 → 소비 0 (2026-09-01) |
| `state.advanceRun` · **`state.stepRun`** | 그 원정의 rng 를 **이어서** — 끝난 라운드를 이겼으면 살아 있는 영웅마다 `grantXp`(0회) → 경계 갈아입기(rng 0) → 다음 걸음이 다음 라운드를 연다(전투 수열이 거기서 계속된다). `departRun` 은 첫 라운드를 열기만 한다(`advance(0)` — 스폰 · 등장 지연 굴림은 여기서 돈다) · `resolveBattle` 은 `advanceRun` 을 끝까지 돈다 [개정 2026-09-14 · R89 · **2026-09-21 · R130**]. **걸음으로 쪼개도 소비 순서가 안 바뀐다** — 틱은 같은 순서로 돌고 끊는 자리만 다르다. **라운드 도중 갈아입기**(`stepRun` 첫머리 · rng 0)는 굴림을 안 쓰지만 **그 뒤 수열을 가른다**(능력치 · 주기 · 스킬 칸이 바뀌어 누가 언제 무엇을 굴리나가 달라진다) — 교체가 없으면 한 번에 돈 수열 그대로다 |
| `tactic.initialAssign` | **가족 풀** 섞기 — 뒤에서 앞으로 `가족 수 − 1` 회. 스트림 = `deriveSeed(seed ^ 0x7AC7, 0)` (**리롤 카운터를 타지 않는다**). 등급은 안 굴린다 — 첫 배정은 언제나 `common` (2026-09-02 · tactic_card_design §5-5) |
| `tactic.pick` | **가족 1회 → 등급 1회, 이 순서로 2회** (2026-09-02 — 리롤은 옵션과 등급을 같이 굴린다 · tactic_card_design §5-5). 등급은 `tactic_grade_weight_*` 셋의 **가중 추첨**이고 훑는 순서는 `GRADES` 배열 순서(`common` → `magic` → `rare`)다 — **그 순서가 계약**이다. 스트림 = `deriveSeed(seed ^ 0x7AC7, counters.tactic)` — 선술집(`^ 0x5A17`)과 마찬가지로 전투 스트림과 섞이지 않는다.<br>**[개정 2026-09-01 · 구현 2026-09-22 · R28] 전체 리롤은 이 스트림 하나로 여러 번 뽑는다**(`tactic.pickMany`) — `counters.tactic` 은 리롤 **1회에 한 번만** 오르고, 그 시드로 만든 rng 하나가 **굴릴 칸을 번호 오름차순으로** 돌며 `pick` 을 연속 호출한다. **이 순회 순서가 계약**이다: 순서를 바꾸면 같은 시드가 다른 판을 낸다 |

### 5-3. 결정론에 걸리는 코드 상수 (CSV 가 아니라 코드에 있는 값 — 이식 시 그대로 옮긴다)

| 상수 | 값 | 위치 | 비고 |
|---|---|---|---|
| `TICK` | 0.1 s | battle.js | 시뮬 해상도. 재생기도 같은 값 |
| `STEP_EPS` | 1e-6 s | battle.js advance | **걸음을 끊는 자리의 부동소수 여유** [신설 2026-09-21 · R130] — 시각은 0.1 을 거듭 더해 꼬리가 붙어 `t + TICK ≤ until` 을 이 만큼 너그럽게 본다. **틱을 몇 번 도느냐만** 정하고 틱 안의 계산에는 안 들어가 결과를 안 바꾼다(끊는 자리만 옮긴다) · 현행 스트림 · 골든 무관 |
| 파티 첫 차례 엇갈림 | `i × 0.3` s | battle.js simulate | |
| 적 등장 지연 | `0.4 + rng × 0.6` s | battle.js beginRound | rng 소비 |
| 행동 주기 하한 | 0.4 s | hero.js computeCombat | |
| ~~`watk` 반올림~~ → 무기 피해 양끝 반올림 | **정수** · 최소 하한 1 · 최대 ≥ 최소 | formula.weaponDamage | 가운데 × (1 ∓ 폭) × 강화 배율을 곱한 **뒤 한 번** — 표기 = 계산 [2026-09-14 · R90 · ~~소수 2자리 · item.js build~~] |
| 데미지 양끝 반올림 | 정수 | hero.js computeCombat | (무기 양끝 + atk_flat) × 괄호 둘을 곱한 뒤 양끝마다 |
| 구간 직선 누적합 표의 상한 `ILVL_CAP` = 120 · 구간 키 상한 `MAX_BAND` = 8 | 그 위 ilvl 은 마지막 칸을 쓴다 | formula.js bandTable | 아이템 레벨은 `spawn_grade.csv:gear_ilvl_add` 로 만렙 위로 올라간다 (2026-09-16 · R108) |
| growth 축 접사 · 방어구 implicit · 강화 적용값 반올림 | **정수 (하한 1)** [개정 2026-09-16 · R107 — 소수 1자리였다] | item.js rollAffixes · implicitFor · effective | band 접사도 정수(하한 1) · **flat · fine 은 퍼센트라 비율**(1% · 0.1% 단위 — 아래 퍼센트 반올림 · R111) |
| `damage_reduction` 반올림 | 소수 5자리 | hero.js computeCombat | 원천별 곱의 실효 비율(옛 % 소수 3자리와 같은 정밀도 · R111) |
| 퍼센트 반올림 `PCT_STEP` = 100 · `PCT_FINE_STEP` = 1000 | 1% · 0.1% 단위 | formula.js roundPct · pctOption | 퍼센트 옵션 값 · 운 계수를 먹인 드롭 보정 [신설 2026-09-17 · R111] |
| 능력치 가중치 | `rng² + 0.04` | hero.js rollAttributes | 분포 모양 |
| 합 맞추기 가드 | 500회 | hero.js | |
| 선술집 시드 솔트 | `0x5A17` | state.js | |
| 수색 시드 솔트 | `0x5EA7` | state.js | 전투·선술집·강화·전술 어느 수열과도 안 섞인다 (§5-1 · 신설 2026-09-09) |
| 상점 시드 솔트 | `0x5409` | state.js | 상점 장비 목록 — 두 번째 인자는 방문 회차 (§5-1 · 신설 2026-09-21) |
| `SEARCH_TIER_HI` · `SEARCH_TIER_LO` | `'rare'` · `'magic'` | state.js | 수색이 매력으로 가르는 두 등급 = `hero_tier.csv` 의 굴림 가능한 행 중 **위 둘**. 어휘가 코드에 있는 이유는 **어느 쪽이 위인가를 코드가 알아야** 하기 때문이다 — CSV 는 대역과 모양만 들고 순위를 말하지 않는다. 굴림 가능한 행이 셋이 됐어도(`normal` 신설 2026-09-14) **수색은 매직 / 레어 둘만 낸다** — 사용자 확정 · 일반은 명단(가중치 굴림)에서만 나온다 (신설 2026-09-09) |
| 전술 옵션 등급 어휘 `GRADES` | `['common','magic','rare']` | tactic.js | **배열 순서가 가중 추첨의 훑는 순서**다 — 순서를 바꾸면 같은 시드가 다른 등급을 낸다. 값(가중치)은 CSV (2026-09-02) |
| `action_period` 반올림 | 소수 3자리 | hero.js | |
| 타임라인 `t` 반올림 | 소수 1자리 | battle.js | |
| 목걸이 발동 간격 초 반올림 | 소수 1자리 | skill.js procIntervalSec | 타임라인 시각과 같은 눈금 · **표시 전용**(발동은 전투에 아직 안 걸린다) [신설 2026-09-21 · R127] |
| `EPS` | `1e-9` | skill.js | 준비(`readyAt ≤ t + EPS`)·만료(`until ≤ t + EPS`) 판정 허용 오차 — 틱 누산이 경계를 미세하게 밑도는 것을 막는다 |
| 무기 죄종 표를 읽는 부위 `SIN_FROM_WEAPON` | `['gloves']` | item.js | **구조 상수 ⚠임시** [2026-09-18 · item_design §1 「장갑 행 = 무기 행을 그대로 쓴다」] — 장갑 죄종 칸은 `armor_sin_option.csv` 가 아니라 `weapon_sin_option.csv` 의 그 죄종 행 **전부**(무기 갈래를 안 본다)에서 하나를 굴린다. 장갑 죄종 칸이 기획되면 표에 행을 넣고 여기서 뺀다 · 로드 검증이 장갑 행이 섞이면 던진다 |
| 물약 대상 순서 | HP 비율 오름차순 · 같으면 **파티 배열 순** | battle.js createRun | 칸이 모자랄 때 누가 마시나를 정한다 — 동점을 배열 순으로 **명시해서** 비교한다(엔진의 정렬 안정성에 기대지 않는다 · 2026-09-15 · R103) · 받는 칸은 **앞의 찬 칸부터**(R104) |
| 스킬 첫 준비 시각 | 쿨 한 바퀴 | battle.js createRun · beginRound | 파티 = `0 + cooldownSec` · 적 = 등장 라운드 시작 시각 + `cooldownSec` · 원정 중 새로 생긴 스킬 = 갈아입은 시각 + `cooldownSec` — 값이 아니라 **규칙**이 계약이다(쿨은 CSV) [개정 2026-09-14 · R89] |
| 스테이지 편성 예외 표 | `101` — 주술사 `1103` 은 3라운드부터 · 정예는 1103 뿐 · 1103 은 소환사 · 보스 단독 | spawn_rule.js `STAGE_SPAWN_RULES` | **CLAUDE.md 규칙 2(수치는 CSV)의 등록된 예외** [2026-09-18 사용자 결정 · §2-13] — 스테이지 컨셉마다 모양이 달라 코드에 둔다. 채움 수는 CSV(`wave_monster_max`)를 읽는다. 같은 규칙을 두 번째 스테이지가 쓰면 칸으로 올린다 · 몬스터 번호가 틀리면 생성 때 throw |

### 5-4. 부동소수

전부 JS `number`(IEEE754 double). `Math.round` / `toFixed` / `Math.floor(rng × n)` 의 결과가 계약에 들어간다. **이식 언어에서 double 을 써야 한다** — float32 로 계산하면 `Math.floor(rng × pool.length)` 의 경계에서 다른 인덱스가 나올 수 있다.

### 5-5. 골든 시드 스냅샷 — **Phase 2 가 맞춰야 할 대상** (2026-08-31 신설)

위 §5-1~§5-4 는 규칙이고, 이것은 **그 규칙이 실제로 낸 답**이다. 엔진 쪽에서 같은 시드로 같은 지문이 나오면 이식이 성공한 것이다.

- 파일 — `src/dev/golden.json` (지문) · `src/dev/golden.js` (생성·대조). **둘 다 이식 대상이 아니다** — `dev/` 는 검증 도구라 엔진 쪽 언어로 다시 쓴다. 맞춰야 하는 것은 **JSON 의 값**이지 이 코드가 아니다
- 범위 — 시드 1~10 × 스테이지 101~105 = **50 런** [개정 2026-09-11 — 챕터 5스테이지 · ~~101~104 = 40 런~~ · R75]. 캘리브레이션(시드 20 × 같은 5스테이지)과 **같은 조건**이라 두 표가 서로를 설명한다. 105 가 **챕터보스 단독 1라운드**의 표본이다
- **R86 재촬영** [2026-09-14] — 영웅 등급 4층(대역 · 가중치 · 첫 파티 레어 1 + 매직 1 + 일반 1) · 장비 희귀도 3갈래(일반 · 매직 · 레어 — 몬스터가 입는 장비도 탄다) · **시작 장비 일반 무기 + 일반 갑옷**(무기 스킬은 고유를 뺀 풀)으로 **50런 전부**가 갈렸다. 입력 지문 — `csvHash` 2(`balance`·`hero_tier`) · `balance` 6키(`rarity_w_magic`·`rarity_w_rare` 값 · `rarity_w_normal`·`affix_normal_min`·`affix_normal_max`·`weapon_common_opt_normal` 신설) · `parties` 30명 전부(형식 끝에 **시작 갑옷** 칸이 붙었다). 재촬영 뒤 **50런 · 드롭 19 · 이벤트 92708** · ⚠ 같은 날 R85(처치 XP) 재촬영이 먼저 있었다
- **R89 재촬영** [2026-09-14] — 원정이 라운드 단위가 되며(**스킬은 쿨부터** · 이긴 라운드의 XP 가 그 순간 들어와 **레벨업이 런 도중에 먹는다** · 진 라운드의 몫은 버린다 · `card` 이벤트 삭제 · 지문 `xpEach` → `xpBy`) **50런 전부**가 갈렸다. 소비 규칙은 그대로이고(`createRun` 을 같은 파티로 이어 부르면 `simulate` 와 같다 — 단정) 첫 시전이 한 바퀴 늦어 수열이 갈린 것이다. ⚠ **같은 재촬영에 병렬 세션의 CSV 변경이 섞였다** — 입력 지문 `csvHash` 3(`monster`·`stage`·`weapon_base`) · `parties` 14명(시작 무기 베이스 이름) · `balance` 불변. 재촬영 뒤 **50런 · 드롭 24 · 이벤트 89214**
- **R90 재촬영** [2026-09-14] — 무기 피해가 최소 ~ 최대 범위가 되며(**무기 드롭의 개체 굴림 1회 삭제** · **적중한 직격마다 피해 굴림 1회** · **회복 시전마다 1회** · 드롭 지문의 무기 개체 굴림 칸 `w<watk>` → `-`) **50런 전부**가 갈렸다. 입력 지문 — `csvHash` 1(`balance` — `weapon_atk_base` · `dmg_variance_pct` 설명문만 · 값 불변) · `balance` 값 불변 · `parties` 30명 전부(시작 무기 지문 칸 + 무기 굴림이 빠져 뒤따르는 시작 갑옷 굴림이 밀렸다). 재촬영 뒤 **50런 · 드롭 21 · 이벤트 75283** · R89 재촬영(같은 날)의 **바로 뒤**다
- **R95 재촬영** [2026-09-15] — 강화가 베이스 능력치만 올리게 되며(옵션 계단 퇴역) **입력 지문만** 움직였다 — `csvHash` 1(`balance`) · `balance` 2키 삭제(`equip_upgrade_option_interval` · `equip_upgrade_option_pct`). **50런 · `parties` 는 한 필드도 안 바뀌었다** — 강화는 골든 밖이다(50런이 강화를 안 부른다)
- **R96 재촬영** [2026-09-15] — 제작이 들어오며 **입력 지문만** 움직였다 — `csvHash` 2(`balance` · `make_recipe` 신규) · `balance` 3키 신설(`make_rarity_w_*`). **50런 · `parties` 는 불변이다** — `rollGear` 는 `rarityWeights` 를 안 주면 종전 가중치로 굴리고, 50런이 제작을 안 부른다
- **R100 재촬영** [2026-09-15] — 스킬이 **준비 상태로 출발**하게 되며(파티 첫 준비 시각 0 · 적은 등장 라운드 시작 시각) **50런 전부**가 갈렸다. 소비 규칙은 그대로이고 첫 시전이 쿨 한 바퀴 앞당겨져 수열이 갈린 것이다(R89 재촬영의 반대 방향). **입력 지문(`meta`)은 불변**. 재촬영 뒤 **50런 · 드롭 33 · 이벤트 78381**
- **R103 재촬영** [2026-09-15] — **물약**이 들어오며 **50런 중 48런**이 갈렸다. 새 게임이 마이너 힐링 포션을 갖고 시작하므로(`potion.csv:start_owned`) 골든의 런도 물약을 들고 돈다 — 파티가 오래 버텨 라운드 · 드롭 · 처치가 늘었다. 입력 지문 — `csvHash` 2(`balance` · **`potion` 신규**) · `balance` 3키 신설(`potion_slot_max` · `potion_use_hp_pct` · `potion_cooldown_sec`) · **`meta.parties` 는 불변**(물약은 생성 굴림을 안 건드린다). 재촬영 뒤 **50런 · 드롭 61 · 이벤트 116759**. ⚠ **물약 자체는 rng 를 안 쓴다** — 수열이 갈린 것은 회복으로 전투가 길어졌기 때문이다(단정: 회복량 0 인 물약은 타임라인의 다른 사건을 한 글자도 안 바꾼다)
- **R104 재촬영** [2026-09-15] — **칸 하나에 물약 하나**(가진 물약이 얻은 순서대로 앞 칸부터)가 되며 **50런 중 48런**이 갈렸다 — 새 게임은 마이너 한 칸이라 런마다 마실 수 있는 수가 칸 수에서 하나로 줄어 파티가 일찍 무너진다. 타임라인 `potion` 이벤트에 칸 번호 `i` 가 붙었다. 입력 지문 — `csvHash` 2(`stage` · `skill` — ⚠ **병렬 세션의 글 열 변경**이 섞였다 · 전투 수치 열은 아니다) · `balance` 불변 · `meta.parties` 불변. 재촬영 뒤 **50런 · 드롭 33 · 이벤트 88031**
- **R111 재촬영 (R110 경직 포함)** [2026-09-17] — 퍼센트 · 배율이 비율이 되며 **입력 지문 전부**가 움직였다 — `csvHash` 13(`balance` · `affix` · 무기 옵션 둘 · `tactic_option` · `armor_group` · `weapon_group` · `monster` · `codex_level` · `spawn_grade` · `hero_attribute` · `skill` · `combat_stat` R112) · `balance` 67키(비율 전환 65 + R110 `stagger_*` 2) · `meta.parties` 는 **옵션 값의 눈금만**(30명 전부 ×100 대조 일치) · 50런은 `drops`(55개 전부 눈금만 · ×100 대조 일치)와 `tl` 만 갈렸다 — `tl` 은 버프 값 · `round.sheet` 의 눈금과 **R110 의 경직 이벤트 · `sheet.fhr`** 몫이다. 같은 시드 대량 실행(`stage` 100판 · `campaign` 200판)은 전환 전후 **한 칸도 안 달랐다**. 재촬영 뒤 **50런 · 드롭 55 · 이벤트 83066**
- **방어구 옵션 세 층 재촬영** [2026-09-18 · DEV_PLAN R109 · R113 · R114] — 방어구 네 부위가 고정 · 죄종 칸 · 공통옵션을 받고(굴림 모양이 바뀌었다) · 고유 방어력 편차 굴림 1회가 빠지고 · 베이스가 티어로 좁혀지며(시작 갑옷 = 클로스 아머) **`meta.parties` 30명 전부**(시작 갑옷 칸)와 **50런 전부**가 갈렸다. 입력 지문 — `csvHash` 6(`balance` · `affix` · `armor_group` · 신규 `armor_sin_option` · `armor_common_option` · ⚠ **`monster` — 병렬 세션의 초상 칸(`face`) 변경이 섞였다**) · `balance` 6키(`armor_def_variance_pct` 삭제 · `armor_common_opt_*` 3 · `armor_fixed_def_pct_*` 2 신설). 재촬영 뒤 **50런 · 드롭 56 · 이벤트 100498** · ⚠ 같은 날 병렬 세션이 스테이지 편성 예외(`spawn_rule.js`)를 넣는 중이라 그 뒤 스테이지 101 의 런이 다시 갈린다
- **R106 재촬영** [2026-09-15] — 타임라인 `hit` 에 피해 종류 `ty` 가 붙으며 **50런 전부의 `tl`(타임라인 해시)만** 갈렸다 — 백업과 필드 단위로 대조해 다른 지문 필드와 입력 지문(`meta`)은 한 칸도 안 바뀐 것을 확인했다. 표시용 키라 rng · 결과 수치는 그대로다. 재촬영 뒤 **50런 · 드롭 33 · 이벤트 88031**
- **R115 재촬영** [2026-09-18] — 1-1 편성 예외(§2-13 · 주술사 3라운드부터 · 정예는 주술사뿐 · 소환 채움 · 아바돈 단독)로 **스테이지 101 의 10런만** 갈렸다 — 백업과 런 단위로 대조해 102~105 의 40런과 입력 지문(`meta`)은 한 칸도 안 바뀐 것을 확인했다(**예외가 없는 스테이지는 수열이 같다**는 §5-2 계약의 증거). 재촬영 뒤 **50런 · 드롭 61 · 이벤트 99982**
- **R116 재촬영** [2026-09-18] — 1-1 주술사가 고유 스킬 「고블린 소환」으로 무리를 부르고 되살리며(§2-13 · 스킬 소속 `monster` · 종류 `call`) **스테이지 101 의 10런만** 갈렸다 — 입력 지문은 `csvHash` 2(`monster` · `skill`)뿐이고 102~105 의 40런은 백업과 런 단위로 대조해 그대로다. 재촬영 뒤 **50런 · 드롭 54 · 이벤트 105021** · ⚠ 101 시드 5 가 `timeout`(6라운드 되살리기 반복)
- **R118 재촬영** [2026-09-19] — 아이템 이름이 「A와 B의 베이스」가 되며(§2-10 · 단 번호는 죄종 굴림의 소수부라 **rng 소비 불변**) **드롭 지문의 이름 칸만** 갈렸다 — 옛 지문과 필드 단위로 대조해 달라진 것이 드롭 22칸의 `base`(무기 외 부위는 영문 이름 — `[Sloth] Cloth Armor` → `Forgotten Cloth Armor`)뿐이고 나머지 지문 · `meta.parties` 는 한 칸도 안 바뀐 것을 확인했다. 입력 지문 — `csvHash` 2(**`sin_word` 신규** · `monster` — 직전 커밋의 초상 칸 `face` 0 → 1 이 재촬영 없이 들어와 있었다 · 전투 무관)

- **R119 재촬영** [2026-09-21] — `round` · `call` 이벤트의 적 항목이 **`gear`(입고 있는 한 벌)** 를 싣게 되며 **50런 전부의 `tl`(타임라인 해시)만** 갈렸다 — 백업과 필드 단위로 대조해 다른 지문 필드와 입력 지문(`meta`)은 한 칸도 안 바뀐 것을 확인했다(51칸 = `tl` 50 + `created`). 표시값이라 rng · 결과 수치는 그대로다(R106 재촬영과 같은 유형). ⚠ 같은 날 병렬 세션이 소환 벽의 `downed` 를 고치는 중이라 그 뒤 런이 다시 갈린다
- **R127 재촬영** [2026-09-21] — 반지 · 목걸이 옵션 세 층 · 목걸이 발동 스킬(§2-5). **R119 뒤 커밋들이 재촬영 없이 들어와 있었다**(R126 이 병렬 변경 때문에 미룬 몫 — HEAD 에서 이미 골든 4단정이 빨간불). 그래서 **HEAD 사본 두 벌**(git archive — HEAD 그대로 · 이 변경을 얹은 것)을 각각 `?golden=write` 로 찍어 필드 단위로 대조했다 — 이 변경이 바꾼 것은 입력 지문의 **CSV 6종**(신규 `accessory_sin_option` · `accessory_common_option` · `amulet_proc` · `skill` 열 추가 · `affix` 삭제 · `balance`)과 **balance 9키**(`affix_*` 6 퇴역 · `accessory_common_opt_*` 3 신설)뿐이고 **`meta.parties` 는 한 칸도 안 바뀐다**(시작 장비에 장신구가 없다). **50런은 전부 갈린다** — 몬스터가 반지 · 목걸이를 입어(`monster.csv:wear_slots`) 첫 스폰부터 장비 굴림 수열이 바뀌고(`build` 의 옵션 층 · 목걸이 발동 2회) 새 옵션(모든 원소 저항 · 체력 · 버프 지속시간 등)이 몬스터에도 걸린다. 저장한 것은 두 번째 벌이다 — R126 까지의 HEAD 변경분도 함께 들어갔다
- **R130 재촬영** [2026-09-21] — 원정 중 교체는 그 순간부터(엔진이 재생 시각까지만 돈다 · `advance` · `stepRun`) · 현재 HP 비율 · 칸마다 쿨 · 음수 방어 거울식 · 전술 스냅숏. **두 단계로 나눠 원인을 가렸다** — ① 걸음 구조만 넣은 판에서 **50런이 한 칸도 안 갈렸다**(쪼개 걸어도 한 번에 돈 것과 같다 — §8 항목 18) ② 규칙을 다 넣은 판에서 **40/50런**이 갈렸고, 갈아입기의 HP 규칙만 옛것(현재 HP 유지 · 자름)으로 되돌리자 **다시 50런 전부 일치**했다 — **갈린 원인은 라운드 경계 레벨업 갈아입기의 HP 비율 하나**다(전술 스냅숏 · 칸마다 쿨 · 음수 방어 · 깎인 방어 보정은 이 50런을 안 건드린다). 입력 지문은 병렬 세션의 `hero_unique_candidates.csv` 해시 하나가 함께 갱신됐다(이 변경의 몫이 아니다)
#### 입력 지문 (`meta`) — **판정하지 않고 설명한다** [개정 2026-09-22 · 구조 감사]

`csvHash` · `balance` 는 빨간불을 켜지 않는다 — 설명문 한 글자 · 전투와 무관한 키 하나에도 켜져 결과가 같은데 재촬영을 요구했고, 병렬 세션이 도는 동안 그 재촬영이 남의 미완성 변경을 지문에 박았다. 판정은 `parties` · `runs` 가 하고, 그 둘이 어긋나면 **사유에 입력 차이가 붙는다**(`golden.js:inputNote`) — 입력이 달라졌으면 그 변경이 의도한 것인지 보고, 입력이 그대로면 코드가 결과를 바꾼 것이다. **이식이 맞춰야 하는 것은 `parties` · `runs` 의 값이다** — `csvHash` · `balance` 는 어느 입력으로 찍었는지의 기록이고, 결과가 같은 동안은 낡아도 된다.

| 키 | 무엇 | 왜 |
|---|---|---|
| `csvHash` | `FILES` 38종 **각각의 원문 해시** (FNV-1a 32) [정정 2026-09-11 — 27 → 38 · 이 수는 잘 낡는다 · 정정 2026-09-08 — 23 → 27] | 어느 **파일**이 달라졌는지를 짚는다. ⚠ **이식 대상이 아니다** — 개발 중 회귀 탐지용. 개행 `\n` 정규화 · BOM 제거 후 센다(`parseCsv` 가 둘 다 무시하므로) |
| `balance` | `balance.csv` **전 키의 값** | 손잡이 5키만 보던 판(08-31 최초)은 밖의 15+ 키가 지문을 깨는데도 "같다"고 통과시켜 **회귀로 오진하게 만들었다.** 지금은 `키: 옛값 → 새값` 을 최대 8개 찍는다 |
| `knobs` | 5키(`monster_atk_scale`·`monster_hp_scale`·`hero_hp_base`·`weapon_atk_base`·`power_growth_per_level`) | **대조하지 않는다** — 사람이 읽는 통과 메시지의 문구일 뿐이다 (대조는 `balance` 가 한다) |
| `parties` | 시드 1~10 의 **시작 파티** — 영웅마다 `cls\|sin\|name.en\|trait.en\|**등급**\|고유 스킬\|능력치 7\|시작 무기(드롭 지문 형식)\|시작 갑옷(같은 형식)` [개정 2026-09-14 — 시작 갑옷 신설 · R86 · 2026-09-08 — `tier` 신설 · ~~히든 상한 7~~ 삭제] | `hero.drawDistinct`(이름·죄종·직업·특성) · **`rollTier`** · `rollAttributes` · **`rollInnate`**(2026-09-01 · **직업 풀** 2026-09-09) · `item.startingWeapon` · `item.startingArmor` 가 전부 여기 있다. 첫 파티의 **레어 1 + 매직 1 + 일반 1** 도 여기서 잠긴다. 이름·특성 풀의 **행 순서**는 여기서만 잡힌다 — 이름은 전투에 안 들어가서 `runs` 가 원리상 못 본다. 40런에 중복하지 않고 시드마다 한 번만 적는다 |

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
| `gold` · `xp`(xpTotal) · `xpBy` | 보상 — **이긴 라운드의 몫만**(R89). `xpBy` = 영웅별 받은 경험치를 **파티 자리 순**으로 `a\|b\|c`(쓰러진 영웅은 그 뒤 라운드 몫이 없어 서로 다르다 · `xpEach` 를 R89 에서 대체) [~~`dust`~~ 는 2026-09-09 삭제] |
| `events` | 타임라인 길이 — 구조 변화 감지 |
| `strikes` | `파티 n/miss · 적 n/miss` |
| `kills` | `몬스터id:처치수` 오름차순 — **스폰 구성** (~~`cards`~~ 는 2026-09-21 삭제 — 도감 카드 걷음) |
| `casts` | `스킬id:시전수` (id 오름차순). **스킬 선택은 rng 를 0회 쓴다** — 다른 어느 필드도 이 로직을 못 본다 |
| `elites` | 라운드별 `라운드:죄종:특성+특성+특성` (공백 구분). `spawnRound` 의 정예 굴림(죄종 · `pickTwo` 2회)과 `SIN_TRAITS`/`COMMON_TRAITS` 값이 여기 있다 — 특히 `pickTwo` 의 `if (b===a) b=(b+1)%len` 은 다른 곳에서 안 걸린다. 출처는 타임라인 `round` 이벤트(정예를 못 잡으면 `kills` 에 안 남으므로) |
| `grew` | **`resolveBattle` 뒤** 파티의 `L<레벨 합>/A<능력치 7종 총합>/M<masteryPoints 합>`. ⚠ **`A` 는 09-14 부터 시작 파티의 총합에서 움직이면 안 된다**(레벨업 능력치 성장 폐지 · R83) — 성장이 되살아나면 여기서 잡힌다. **R89 부터 `grantXp` 는 라운드 사이에 돈다** — 레벨업이 그 뒤 라운드의 전투를 바꾸므로 전투 필드도 성장을 본다(옛 판은 `simulate` 뒤라 40런의 레벨업 120회가 지문 밖이었다). ⚠ **정수 합만 적는다**(부동소수는 이식자를 ULP 로 고생시킨다) |
| `tactics` | **열린 칸 전체**를 `번호:옵션id:등급:on\|off`. 켜진 것만 적으면 칸에 무엇이 들었는지가 안 남아, 배정이 바뀌어도 둘 다 조건 미달이면 지문이 침묵한다. **등급을 같이 적는 이유도 같다** (2026-09-02) — 값만 다른 같은 가족이라 등급이 빠지면 지문이 안 움직인다 |
| `tl` | 타임라인 전체의 FNV-1a 해시(`JSON.stringify(timeline)`). 위 요약 필드가 못 보는 **순서·값 변화**를 잡는다 — 어디가 깨졌는지는 위 필드들이 말하고 이 값은 「달라졌다」만 말한다. **결과 불변 리팩터의 잠금장치** (2026-09-01) |
| `drops[]` | 아래 |

- 드롭 지문 — `rarity|slot|ilvl|sins|base|baseId|element|개체굴림|스킬|접사` [`baseId` 신설 2026-09-10 — 무기 베이스 세부 굴림 · 풀 없는 무기군은 `-`. **방어구가 `baseId` 를 갖게 된 뒤(2026-09-17)에도 이 칸은 무기만 적는다** — 방어구 베이스는 앞의 `base` 칸(영문 이름)이 이미 들어 지문이 안 흔들린다. `스킬` 신설 2026-09-09 — 무기가 담은 액티브 id · **목걸이는 발동 스킬 `trigger/skill:v`**(R127 · 2026-09-21) · 그 외는 `-`]. **접사는 `출처/stat:v` 를 `;` 로 이어 순서까지 적는다**(출처 신설 2026-09-11 R78 — 층이 바뀐 회귀를 잡는다) — `item.rollAffixes` 가 풀에서 뽑는 순서는 여기서만 잡힌다. `base` 는 무기면 무기군 id, 그 외는 영문 이름(= 베이스 인덱스). 개체 굴림은 방어구 `def_flat:v` · **무기** · 목걸이/반지 `-`(무기는 R90 부터 굴리지 않는다 — 피해 범위는 무기군 · ilvl · `up` 에서 파생하므로 지문의 다른 칸이 이미 든다 · ~~`w<watk>`~~). **`meta.parties` 의 시작 무기도 같은 형식**이다
- **`uid` 는 지문에 없다** — 발급 순서는 `state.js` 소관이라 전투 결정론과 다른 축이다 (§8 항목 3)
- 불일치 보고는 **요약이 맨 앞**이다 (`n/40 런 불일치`). 「1런만 어긋남」과 「40런 전부 어긋남」은 이식 검증에서 원인이 전혀 다른데, 예산을 첫 런이 통째로 먹으면 그 둘을 구분할 수 없다. 런당 최대 2개 × 최대 6런을 보여 준다
- 대조는 기대값 키가 아니라 **키 합집합**을 돈다 — 지문에 필드를 추가하고 재촬영을 잊으면 그 필드가 무기한 미검증으로 남기 때문이다
- **지문을 바꾸는 변경 = 위 계약의 변경**이다. `?golden=write` 로 다시 찍기 전에 이 절과 §5-2 를 먼저 고친다
- **2026-09-10 전면 재촬영 (R72)** — 데미지의 힘·지능 곱 제거 · HP 성장분 × 건강 · 재생의 건강 곱 제거 · 추가 피해 굴림(차지 · 라이트닝 · 체인 라이트닝) · 멀티샷 광역 약화 · 가이디드 애로우 단타 · 듀얼 피해 감소가 한꺼번에 들어간 판이다. 입력 지문(`csvHash` 의 `skill`·`balance`·`combat_stat`·`hero_attribute` · `balance` 의 `skill_decay_cap_pct` 신설)과 40런이 바뀌고, `meta.parties` 는 생성 굴림을 안 건드리므로 **불변이어야 한다**. `tl` 에는 `hit.proc` 이 들어올 수 있다(터진 타격만)
- **2026-09-11 재촬영 (R75)** — 챕터 5스테이지. 입력 지문(`csvHash` 의 `stage`·`stage_round`·`monster`·`balance`·`round_budget` · `balance` 의 `rounds_per_stage` 삭제 · `stages_per_chapter` 4 → 5)과 **런 수 40 → 50**(105 신규 10런)이 바뀐다. **101~104 의 40런과 `meta.parties` 는 재촬영 전 대조에서 한 필드도 안 바뀌었다** — 세트가 같고 해금 목록도 같으며, 104 는 보스가 바뀌었지만 시작 파티가 그 보스 라운드에 닿지 못한다
- **2026-09-11 재촬영 (R77)** — 레어 접미 죄종 판정 제거. 입력 지문(`csvHash.balance` · `balance` 의 `suffix_sin_chance_pct` 삭제)과 **50런 중 7런**이 바뀐다 — 넷은 레어 드롭에 둘째 죄종이 붙은 것이고, 셋은 드롭이 전투 rng 를 같이 쓰기 때문에 **레어가 떨어진 뒤의 수열이 밀려** 전투 지문(소요 · 라운드)이 달라진 것이다. `meta.parties` 는 불변이다(시작 무기는 매직이라 접미를 안 굴린다)
- **2026-09-11 재촬영 (R78)** — 무기 옵션 세 층. 입력 지문(`csvHash` 의 `affix` · `balance` · 신규 `weapon_sin_option` · `weapon_common_option` · `balance` 7키 신설)과 **드롭 지문 형식**(접사 `출처/stat:v`)이 바뀐다. 시작 무기가 고정 1 + 죄종 칸 1 + 통합옵션을 받아 **`meta.parties` 와 런 지문이 함께 바뀌고**, 무기 드롭의 굴림 수가 달라져 그 뒤 수열도 밀린다
- **2026-09-11 재촬영 (R79 후속 — 적 스킬 칸)** — `round` 이벤트의 적 항목에 표시값 다섯(`atk`·`matk`·`atkType`·`stats`·`actives` · §2-6)이 붙어 **50런 전부의 `tl`** 이 바뀐다. **그 밖의 지문은 하나도 안 바뀐다** — 입력 지문(`csvHash`·`balance`·`parties`)도, 런의 결과(처치·골드·드롭·이벤트 수·정예)도 그대로다(JSON 대조 — 차이 경로 50개가 전부 `runs[].tl`). 필드를 더했을 뿐 rng 순서가 안 바뀌었다는 증거다
- **무엇을 보장하지 않는가** — 50런이 지나지 않는 경로는 아무것도 말하지 않는다: 선술집(`rollCandidates`·`tavernReroll` 0회) · **수색**(`searchRoll` 0회 — 스트림 `^ 0x5EA7` 은 골든이 한 번도 안 밟는다. 그물은 `dev/test.js` 의 `search:` 단정뿐이다) · 전술 리롤(`TC.pick` 0회 — `tactics` 는 첫 배정만 본다) · `chapter_boss` 표본 1(스테이지 105 — 보스 단독 1라운드) · `inventory_cap` 넘침 0회 · 마스터리 랭크 > 0 인 영웅 0명 · 세이브 왕복. 목록은 [src/dev/README.md](../../src/dev/README.md)

---

## 6. 재생기 계약 (`ui/battle.js` — 타임라인 소비자)

- 재생기는 **계산하지 않는다.** HP 는 이벤트의 `dhp` / `ahp` 를 그대로 쓴다. **최대 HP 도 마찬가지다** [2026-09-21 · 부채 #50] — 첫 값은 `party[]` · `round` 의 `hpMax`, 그 뒤로는 `refit` 과 **최대 HP 를 민 `buff`·`buffEnd`** 가 실어 준다. 재생기가 창의 `stat`·`v` 로 최대치를 되계산하지 않는다
- 시각 `t` 까지의 이벤트를 배열 순서로 적용한다. 배속·일시정지는 진행 속도의 문제다. **철수는 결과의 문제다** — 진행 중 라운드를 버리므로 재생기가 아니라 앱(`state.retreatRun`)이 한다 [R89 — 옛 「건너뛰기」]
- **타임라인은 걸음마다 자란다** [R89 · **개정 2026-09-21 · R130** — ~~라운드마다~~] — 재생기는 배열 끝에서 멈춰 기다린다. 시각을 밀기 **전에** `opts.onTime(t)` 을 부르면 앱이 **그 시각까지 계산하고**(`state.stepRun` — 끝난 라운드는 정산하고 다음 라운드를 연다) 그만큼 붙인다. 재생기는 정산하지 않는다. **`refit` 은 라운드 도중에도 온다** — 원정 중 교체가 그 시각에 먹는다(보스 라운드 도중은 안 온다). 재생기는 경계에서와 같이 받는다(최대 HP · 현재 HP · 스킬 칸 — **쿨 표시는 칸마다 잇는다**: 같은 자리에 같은 스킬이면 옛 칸을 그대로 둔다)
- `round` 이벤트에서 적 유닛을 통째로 다시 만든다 — 그래서 `round` 가 첫 이벤트여야 한다 · **스킬 칸도 그 이벤트의 `actives` 로 채운다** [2026-09-11 · R79 후속] — 적의 `skill` 이벤트는 그 칸에서 찾으므로, 칸이 비면 시전(칸 번쩍임 · 이름 팝업)이 **조용히 사라진다**(옛 판의 `skills: []`)
- 모르는 `e` 는 무시한다. 모르는 유닛 키도 무시한다 (현재는 **조용히** — [부채 #6](DEV_PLAN.md))
- Phase 2 재생기는 위 표의 이벤트만 알면 된다. 연출(모션·팝업·로그 문구)은 재생기의 자유
- **재생기는 14종을 전부 안다** (2026-09-17 R110 — `stagger` 추가 · 아래 줄 · 2026-08-30 — `skill`·`heal`·`buff`·`buffEnd`·`regen` 소비 추가 · 2026-09-14 R89 — `card` 삭제 · `refit` 추가 · 2026-09-15 R103 — **`potion`**: 아레나 왼쪽 아래 물약 칸(마신 칸 `i` 가 빈다 · R104 · ADR-0148) · 그 카드의 `+회복량` 팝업 · 로그 한 줄). 스킬 칸의 쿨은 `skill` 이벤트의 `ready` 로 걷힌다(첫 준비는 `party[].ready` · `round` 적의 `ready` · `refit` 의 `ready` — R89) — 재생기가 쿨을 **계산하지 않는다**
- **`stagger`**(R110 · 2026-09-17 · 14종째) — 끝 시각(`until`)까지 창 뱃지 줄에 경직 칩을 세우고, 그동안 **행동 게이지를 멈춘다** — 재생기는 유닛마다 마지막 행동 이후의 경직 창 `[{from, to}]` 를 쌓고(경직 중에 또 오면 `to` 만 늘린다) 게이지 경과에서 그 겹친 시간을 뺀다. 행동(`skill`·`hit`·`dodge`)이 창을 비운다 — 시뮬이 행동 예약을 끝 시각 뒤로 밀어 창이 행동을 넘지 않기 때문이다. **이벤트 시각을 빼는 표시값이지 계산이 아니다**(쿨 칸이 `ready` 를 그대로 쓰는 것과 같은 자리) · 로그 · 팝업 없음 (SCREEN_DESIGN §4-2 · ADR-0154)

---

## 7. 데이터 계약 — 무엇이 어디서 오는가

`ui/data.js:loadData` 가 fetch 하는 CSV **44개**(`FILES`) [재집계 2026-09-19 — 이 수는 잘 낡는다. 옛 「32개」는 `gather_node`·`log_node`·`hero_unique_candidates` 신설분이 이미 빠져 있었다]: `balance` · `monster` · `stage` · `stage_round` · `round_budget` · `spawn_grade` · `codex_level` · `codex_series` · `weapon_group` · `skill` · **`skill_effect`**·**`skill_status`**(2026-09-22 — 스킬 표 셋 분리 · 하는 일 · 걸린 효과 · §2-8 · R136) · **`skill_tag`**(2026-09-01) · `hero_attribute` · `combat_stat` · `chapter` · `mastery_node` · `tactic_slot` · `tactic_option` · **`tactic_condition`**(2026-09-22 — 조건 사전 · R134) · **`tactic_score`**(2026-09-22 — 점수 × 등급 배수 · R134) · **`commission_kind`** · **`commission`** · `affix` · `item_base` · `equip_slot` · `class` · `hero_name` · `hero_trait` · **`mine_node`** · **`hero_tier`**(2026-09-08 · R48) · **`search_story`**(2026-09-09 — 수색 진행 문구. **막의 어휘도 순서도 이 표가 든다**) · **`monster_role`**(2026-09-09 — 역할 → **랭크**. 적의 자리다) · **`formation_template`**(2026-09-09 — 파티 진형의 정원. **첫 행이 기본값**이고 행 순서가 화면 순서다) · **`search_meeting`**·**`search_answer`**(2026-09-09 — 수색 만남 · 답. **`need_sin`(누가 갔나 → 보인다) · `hit_sin`(누굴 만났나 → 먹힌다)** 두 컬럼이 규칙 전부다) · **`gather_node`**·**`log_node`**(2026-09-10 — 채집·벌목 단계 7, `mine_node` 와 같은 모양) · **`hero_unique_candidates`**(2026-09-10 — 유니크 영웅 후보 풀 ⚠임시 · 아직 아무도 안 읽는다) · **`weapon_base`**(2026-09-10 신설 — 무기군별 세부 베이스 7종 이름. **아직 `sword2h`·`axe`·`mace`·`spear`·`bow` 뿐**(뒤의 셋 2026-09-11) · §2-5 · §5-2) · **`weapon_sin_option`**·**`weapon_common_option`**(2026-09-11 · R78) · **`make_recipe`**(2026-09-15 · R96) · **`potion`**(2026-09-15 — 물약 단계 표 · R103) · **`armor_group`**(2026-09-16 신설 — 갑옷군 3갈래(중갑·경갑·로브) · 방어 배수 · 공속 · 쿨감 · R108 · **2026-09-18 `slot` 칸 — 투구 · 장갑 · 신발 갈래까지 네 부위**) · **`armor_sin_option`**·**`armor_common_option`**(2026-09-18 — 방어구 죄종 칸 · 공통옵션 · §2-5 「방어구 옵션」) · **`sin_word`**(2026-09-19 — 아이템 이름의 죄종 단어 · 죄종 × 4단 · `naming` 이 받는다 · §2-10).
**건설 표 넷** [2026-09-22 · R137] — `building` · `building_rank` · `building_effect` · `research` → `D.buildingRows` · `D.buildingRankRows` · `D.buildingEffectRows` · `D.researchRows`(원시 행 그대로 — 검증 · 셈은 `construction.js` · §2-14).
**이 목록 = `src/data/*.csv` 전부**(`inherited/` 제외)여야 한다 — 읽히지 않는 SSOT 를 두지 않는다. `dev/test.html` 의 `csv:` 단정이 디렉터리 목록과 대조한다 (2026-08-28).

표시 헬퍼도 `ui/data.js` 가 낸다 — `monsterName(id)→{ko,en}` · `monsterStory(id)→{ko,en}`(`monster.csv:story_kr/story_en` · 영어가 비면 한국어 · 둘 다 비면 빈 문자열 · 셀의 `\n` 두 글자는 줄바꿈 · 이름은 `{m:<idx>}` 자리표시자라 `fillStory` 로 푼다 — `{leader}` 는 안 쓴다 · 2026-09-21) · `monsterFace(id, grade?)→path|null`(grade 가 `elite` 이고 `monster.csv:face_elite` 가 1 이면 `<idx>_elite.png` · 아니면 `<idx>.png` — 2026-09-17) · `monsterSin(id)` · `stageName(row)→{ko,en}` · `stageBgOf(id)` · `chapterOf(chapter)` · `eliteName(sin, baseId)`. mock 에 남은 것은 자산 경로(`faceDir()` · `FACE_STYLES`/`setFaceStyle` · `bgDir()` · `BG_STYLES`/`setBgStyle` · `BG_DIR`/`TOWN_BG` · `stageBg`)와 화면 전용 사전뿐이다.

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
| `AFFIX_DEFS` | ~~`affix.csv` → `D.affixDefs`~~ → **2026-09-21 R127 로 파일째 퇴역** — 부위별 옵션 표(무기 둘 · 방어구 둘 · 장신구 셋)가 대체했다 | 첫 컬럼 = `stat`(그 자체가 id). `scale` 3분류가 그대로 컬럼. `per_ilvl` 은 `band` 행만 — 규약은 뒤 표들이 이어받았다 |
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
5. **`atk_physical` / `atk_magic` 은 배타 · 값은 범위 `{min, max}`** [범위 2026-09-14 · R90] — 둘 다 있는 경우를 코드가 가정하지 않는다. 물리·마법 혼합 딜(스킬)이 생기면 이 계약을 다시 쓴다
6. **가방 용량 산수의 순서** — `equip` 은 실행 전에 `bag − 1 + back.length ≤ inventory_cap` 을 먼저 검사한다 (`back` 은 그 자리에 있던 하나뿐 — 2026-09-01 배타 폐지로 2가 되는 경우가 사라졌다)
7. **`closeRun` 은 정산하지 않고 끊는다** [개정 2026-09-14 · R89] — 진행 중이던 라운드는 버리고(보상 없음), 이긴 라운드의 보상은 이미 `advanceRun` 이 넣어 두었다. **남은 라운드를 마무리해 주지 않는 것이 계약이다** — 마무리해 주면 껐다 켜기로 원정을 무한히 빨리 돌릴 수 있다(사용자 확정). 런 핸들은 세이브에 없으므로 불러온 세이브의 `run.active` 는 곧 끊긴 원정이다. **파견·탐험(오프라인 진행형)이 들어오면** 그때 `closeRun` 을 다시 설계한다 (GAME_DESIGN §3)
8. **올릴 수 없는 세이브 버전은 throw** — 이관 가능한 버전은 `deserialize` 안에서 올리고, 나머지는 던진다(지금은 v37 하나만 연다 — §4 「v37 에서 끊었다」). 조용히 버리지 않는다. 잡는 건 렌더러
9. **`codex_level.csv:kills_total` 은 누적 문턱이다** — 레벨당 증분이 아니다 (2026-09-21 `cards_to_next`(레벨당 증분 장수)를 대체 — 사용자가 문턱을 누적으로 말했고 표만 봐도 「몇 마리에 몇 레벨」이 읽혀야 한다)
10. **`round` 가 라운드의 첫 이벤트** — §2-6 순서 보장
11. **`res` 는 항상 4원소 객체다** — 몬스터도 `{fire, cold, lightning, poison}` 을 든다(2026-08-26 타입 이원성 해소). `strike` 는 다른 모양을 가정하지 않으므로 정적 타입 언어에서도 인터페이스가 하나다
12. **`?tab=` 은 `?dev=` 뒤에** — 렌더러 부팅 순서. `startGame()` 이 탭을 원정으로 되돌린다
13. **스킬 배율·원소 태그·타격 필드(`statMult`·`condPct`·`procChance`·`procMult` — 2026-09-10 · 2026-09-18)는 타격 동안만 유닛 필드에 얹고 원복한다** — `strike` 시그니처는 불변이다. 다단타 도중 예외로 빠져나가면 유닛에 배율이 남으므로, 얹기와 원복은 한 함수(`strikeOnce`) 안에서만 한다
14. **`actives` 가 비면 rng 수열은 스킬 도입 전과 같다** — 만료 처리·발동 선택·버프는 rng 를 쓰지 않고(회복은 R90 부터 시전마다 양 굴림 1회 — 스킬이 없으면 시전도 없다), 기본 공격 경로는 그대로다. 결정론 단정이 이것을 지킨다
15. **`buffs`·`reactions` 는 삽입 순서를 유지하는 맵/배열이다** — `buffEnd` 이벤트 순서 · 도발자 선택(배열 순 첫째) · 파생값 재계산 · 훅 발화가 그 순서를 탄다. JS 객체의 문자열 키 순서에 기대고 있으므로 **이식 언어에서 해시맵을 쓰면 다른 타임라인이 된다**(`stagePool` 과 같은 종류 · 2026-09-01)
16. **배정 단위는 스킬 인스턴스다** — `activesFor` 가 `{id, source}` 를 내고 소비자는 `skill.resolve` 로 정의를 얻는다. 정의를 `defs[id]` 로 직접 찾는 코드를 새로 만들지 않는다 — 변형 노드(`override`)가 오면 그 코드는 전부 우회로가 된다 (2026-09-01)
17. **도발은 타겟 rng 를 소비하지 않는다** — 도발이 켜져 있으면 굴리지 않고 고정한다(§5-2). ⚠ **도발 세부(도발자가 여럿일 때 누구·복귀 조건)는 기획 미확정이지만, rng 소비 0 을 유지하는 안 중에서만 고른다** — 「도발자 중 무작위」를 채택하면 소비 수열이 바뀌어 §5-5 골든 스냅샷을 다시 찍어야 한다 (GAME_DESIGN §10 · battle_design.md §3-1)
18. **틱과 틱 사이가 전투에 끼어드는 자리다** [2026-09-14 · R89 · **개정 2026-09-21 · R130** — ~~라운드 경계만이 끼어드는 자리다~~] — 상태(장비 · 레벨 · 스킬 트리)는 `createRun.refit` 으로 **틱 사이 어디서나** 전투에 들어간다(보스 라운드 도중만 거절). 그래서 엔진은 라운드를 미리 끝까지 계산하지 않고 **재생 시각까지만** 돈다(`advance(until)` · `state.stepRun`) — 미래가 계산돼 있지 않으므로 「바꿨다 되돌려 남은 라운드를 다시 굴리기」가 성립하지 않는다. **교체가 없으면 어디서 끊어 걸어도 한 번에 돈 것과 같고, 인자 없이 이어 부르면 `simulate` 와 같다**는 것이 이 계약의 잠금이다(`dev/test.js` 단정)

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

*마지막 업데이트: 2026-09-23*
