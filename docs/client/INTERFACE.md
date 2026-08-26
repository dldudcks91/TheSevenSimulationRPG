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
item.js(data) ──────────┐        │
battle.js(data, itemSystem) ─────┤  (내부에서 createFormula(balance) 를 따로 만든다)
state.js(deps: hero, item, battle, balance, …) ──┘
```

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

> ⚠ **이 절은 2026-08-26 오전 코드를 기술한다.** 같은 날 오후 battle_design §9 가 전면 개정됐다(무기=밑수 · 편차=개체 굴림 · K 상수 · 피해감소 원천별 곱 · 명중/회피 폐지 · 저항 상한형). 코드 반영 목록은 [DEV_PLAN §3-3](DEV_PLAN.md). 반영하면 이 절과 §2-4 의 `accuracy`/`evasion`/`variance_pct` 를 다시 쓴다.

`createFormula(balance) → { mitigation, hitChance, defenseAgainst, strike, indirect, leech }`
입력은 `balance` 하나. 파일에 숫자 리터럴 없음.

| 함수 | 시그니처 | 계약 |
|---|---|---|
| `mitigation(D, attackerLevel)` | `→ 0~1` | `D / (D + def_curve_k × max(1, lvl))`. `D ≤ 0` 이면 0 |
| `hitChance(acc=0, eva=0)` | `→ 0~100` | `clamp(100 − eva + acc, hit_floor_pct, 100)` |
| `defenseAgainst(defender, atkType, defIgnorePct=0)` | `→ number` | `physical` 이면 `defender.def`, 원소면 `defender.res` — **res 는 숫자(4원소 공통) 또는 `{fire,cold,lightning,poison}` 객체** 둘 다 허용. 방어 무시는 곡선에 넣기 **전** 소재값을 비율로 깎는다 |
| `strike(rng, a, d)` | `→ {hit, dmg, crit}` | 직격 1회. **rng 소비 순서 = 명중 → 편차 → 치명, 빗나가면 1회만** (§5) |
| `indirect(amount)` | `→ number` | 비직격(반사·도트). 명중·편차·치명·감쇠 없음, `dmg_min` 하한만 |
| `leech(dmg, pct)` | `→ number` | 흡혈 — 직격 최종 피해에만 비례 |

**공격자 `a`** — `{atk, atkType, acc, crit, critDmg, defIgnore, variance, skillMult, bonusPct, lvl}`
**방어자 `d`** — `{def, res, eva, dr}`

> ⚠ `battle.js` 는 공격자 객체에 `dmgBonus` 라는 이름으로 값을 넣고, `strike` 는 `bonusPct` 를 읽는다 — **필드명 불일치로 도감 피해 보정이 적용되지 않는다.** [DEV_PLAN 부채 #1](DEV_PLAN.md)

### 2-4. `hero.js` — 영웅

`export const ELEMENTS = ['fire', 'cold', 'lightning', 'poison']` — `combat_stat.csv:res_*` · `monster.csv:attack_type` · 무기 `element` 가 쓰는 같은 어휘.

`createHeroSystem(data)` — 주입 `data`:

| 필드 | 형태 | 출처(현재) |
|---|---|---|
| `balance` | `{key: value}` | balance.csv |
| `stats` | `[{id}]` 기본 능력치 7종, 순서 = 표시 순서 | ⚠ `ui/mock.js:STATS` |
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

**`computeCombat` 출력** — 필드가 **있거나 없거나**로 표현되는 것이 있다:

| 필드 | 비고 |
|---|---|
| `atk_physical` **또는** `atk_magic` | **둘 중 하나만 존재.** 무기군 `attackType === 'magic'` 이면 `atk_magic`(지능), 아니면 `atk_physical`(힘). 맨손 = physical |
| `attack_type` | `physical` 또는 마법 무기 개체의 `element`(없으면 `ELEMENTS[0]`) |
| `level` | 감쇠 곡선 K 의 공격자 레벨 |
| `variance_pct` | 무기군 값, 맨손이면 `dmg_variance_pct` |
| `hp_max` · `defense` · `res_fire` · `res_cold` · `res_lightning` · `res_poison` | 저항 = `res_all` + `res_<원소>` |
| `accuracy` · `evasion` | 접사 × 감각 배율 — **곱셈**(접사 0 이면 0). ⚠ 기획에서 폐지됨(08-26 오후) — DEV_PLAN §3-3 R5·R7 |
| `def_ignore` · `reflect_damage` · `damage_reduction` · `crit_rate` · `crit_damage` · `life_steal` · `action_period` · `dmg_bonus_pct` · `gold_find` · `item_find` | |

`codex` 입력은 `{atk_pct, hp_pct, dmg_pct}` 만 읽는다 — `acc_pct` 는 받아도 버린다 ([부채 #2](DEV_PLAN.md)).

### 2-5. `item.js` — 아이템

`createItemSystem(data)` — 주입 `data`:

| 필드 | 형태 | 출처(현재) |
|---|---|---|
| `balance` | | balance.csv |
| `slots` | `[partId]` 부위 8종 | ⚠ `ui/mock.js:SLOTS` |
| `sins` | `[sinId]` | ⚠ mock |
| `weaponGroups` | `{id: {id, ko, en, classes:[cls], twoHanded, period, variance, attackType, stage}}` | weapon_group.csv |
| `elements` | `[elementId]` | ⚠ `ui/mock.js:ELEMENT_IDS` |
| `itemBases` | `{part: [{ko,en}]}` 무기 외 부위 베이스 이름 | ⚠ `ui/mock.js:ITEM_BASES` |
| `affixDefs` | `[{stat, min, max, perIlvl, slots?}]` | ⚠ `ui/mock.js:AFFIX_DEFS` |
| `composeName` | `(prefixSin, base, suffixSin 또는 null) → {ko,en}` | ⚠ `ui/mock.js:nm` — 어순·조사 규칙 |

**item 객체** — `{uid, slot(part), rarity, ilvl, name:{ko,en}, implicit:{stat,v} 또는 null, affixes:[{stat,v}], sins:[sinId], group?, twoHanded?, watk?, element?}`
- `rarity` 는 현재 `magic` / `rare` 만 굴린다
- `group` / `twoHanded` / `watk` 는 무기만. `element` 는 **마법 무기군 개체**만
- 무기의 행동 주기·공격 타입·착용 직업은 아이템에 **박지 않는다** — 매번 `weaponGroups[group]` 에서 읽는다
- `sins` 는 죄종 **태그 목록**이지 포인트가 아니다 (세트효과 보류)

| export | 시그니처 | 계약 |
|---|---|---|
| `rollDrop(rng, ilvl)` | `→ item` | 부위 균등 → 베이스 → 희귀도(가중치) → 접두 죄종 → (레어면) 접미 죄종 → 접사 n개(같은 stat 중복 없음) |
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
| `simulate(partyUnits, stageId, rng)` | `→ result` | `partyUnits = [{uid, combat}]` (`combat` = `computeCombat` 결과). 아래 |

**result** — `{won, reason, durationSec, party:[{key, uid, hpMax, period}], timeline:[ev], xpTotal, gold, dust, kills:{monsterId:n}, cards:{monsterId:n}, drops:[item(uid null)], downed:[heroUid], roundsCleared, rounds:[{n, kind, killed:[monsterId], eliteSin}]}`
- `reason` 은 `clear` / `wipe` / `timeout`
- `drops` 의 아이템은 `uid: null` — state.js 가 가방에 넣으며 발급
- **`timeline` 은 세이브에 넣지 않는다.** 리포트만 남긴다

**타임라인 이벤트** — 전부 `{t, e, …}`. `t` = 초, 소수 첫째 자리 반올림.

| `e` | 필드 | 의미 |
|---|---|---|
| `round` | `n, kind, enemies:[{key, monsterId, grade, sin, traits, hpMax, period}]` | 라운드 시작. **그 라운드의 첫 이벤트** |
| `hit` | `a, d, dmg, crit, dhp` (+ `ahp` 흡혈 시) | 직격 명중. `dhp` = 피격 후 HP |
| `dodge` | `a, d` | 직격 빗나감 |
| `reflect` | `a, d, dmg, ahp` | 비직격 반사. `a` = 반사한 쪽 |
| `down` | `u` | 전투불능 |
| `card` | `u, monsterId` | 도감 카드 판정 성공 (처치와 별개) |
| `end` | `won, reason` | **마지막 이벤트** |

유닛 키: 파티 `p0..`, 적 `e0..`(라운드마다 0부터).

**순서 보장** — ① `t` 는 단조 비감소 ② `round` 가 라운드의 첫 이벤트 ③ `end` 가 마지막 ④ 같은 `t` 안에서는 배열 순서가 곧 발생 순서.

### 2-7. `state.js` — 상태 전이

`export const SAVE_VERSION = 2`

`createGameSystem(deps)` — `deps`: `hero, item, battle, balance, equipSlots [{id, part}](착용 위치 9), stages(byId), stageOrder [id], monsters(byId), codex {levels:[cards_required], bonus:[%], statByNum:{stage_num: statKey}}`.
`equipSlots` · `codex.bonus` · `codex.statByNum` 은 ⚠ `ui/mock.js` 출처.

**모든 함수는 `state` 를 첫 인자로 받고 그 객체를 직접 바꾼다.** 시스템 자체는 무상태. 시각이 필요한 함수는 `now`(ms) 를 받는다.

| export | 시그니처 | 결과 |
|---|---|---|
| `newGame(seed, candidates, now)` | `→ state` | 후보 = 로스터 = 파티. 각자 시작 무기 1개 착용. 시작 무기 rng = `deriveSeed(seed, 0)` |
| `serialize(state, now)` | `→ json` | `clone + {version, savedAt}`. 순수 |
| `deserialize(obj)` | `→ state` **또는 throw** | `version !== SAVE_VERSION` 이면 throw. 누락 필드 기본값 보정 |
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

**report** — `{at, stageId, won, reason, durationSec, gold, dust, xpEach, levelUps:[{uid, from, to, gains}], downed:[uid], drops:[itemUid], discarded, cards:{monsterId:n}, rounds}`

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

## 4. 세이브 스키마 v2

```
{
  version: 2, seed: uint32, createdAt: ms, savedAt: ms,
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
- **버전 정책** — `deserialize` 는 불일치 시 throw. v1 → v2 이관 없음(스키마 단절). **v3 부터는 `deserialize` 안에서 올린다.** 렌더러는 throw 를 잡아 시작 화면에 사유를 보여준다 — 이 처리는 렌더러의 책임이지 state.js 의 계약이 아니다
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
| `formula.strike` | 명중 → (명중 시) 편차 → 치명. 빗나가면 1회 |
| `hero.rollAttributes` | 축별 가중치 7회 → 합 맞추기 루프(가변, 최대 500회) → 자리 바꿈(소비 없음) |
| `hero.rollHero` | `rollAttributes` → `rollCaps` 7회 |
| `hero.rollStartParty(n)` | 이름 n → 죄종 n → 직업 n → 특성 n → 영웅 i 마다 `rollHero` |
| `hero.grantXp` | 레벨업 1회당 축별 7회 (상한 미달 축만) |
| `item.rollDrop` | 부위 → 베이스 → 희귀도 → 접두 죄종 → (레어) 접미 판정 → (성공 시) 접미 죄종 → 접사 수 → 접사마다 (정의 선택 → 값) → (마법 무기) 원소 |
| `item.build`(시작 무기) | 접두 → 접미 판정(magic 은 안 함) → 접사 수 → 접사 → (마법) 원소 |
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
| `STATS` (기본 능력치 7 id·순서) | hero | → `hero_attribute.csv` 로 읽기 전환 |
| `SINS` 키 목록 | hero · item · battle | → 죄종 테이블(sin_mapping.md 과제) |
| `CLASSES` (`id, keyAttr, stage`) | hero | → 직업 CSV 신규 |
| `SLOTS` / `EQUIP_SLOTS` | item / state | → 슬롯 CSV 신규 (부위 8 · 위치 9) |
| `ELEMENT_IDS` | item | hero.js `ELEMENTS` 와 중복 — 하나로 |
| `ITEM_BASES` | item | → 계승 `equipment_base.csv` 연결(5부위) + 보조·목걸이·반지 신규 |
| `AFFIX_DEFS` | item | → 계승 접사 매트릭스 연결 |
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
8. **세이브 버전 불일치는 throw** — 조용히 버리지 않는다. 잡는 건 렌더러
9. **`codex_level.csv:cards_required` 는 레벨당 증분** — 누적 아님. 컬럼명만 보면 오해한다
10. **`round` 가 라운드의 첫 이벤트** — §2-6 순서 보장
11. **`res` 의 타입 이원성** — 몬스터 숫자 / 영웅 객체. 정적 타입 언어에서는 인터페이스를 둘로 나눈다
12. **`?tab=` 은 `?dev=` 뒤에** — 렌더러 부팅 순서. `startGame()` 이 탭을 원정으로 되돌린다

---

## 9. 알려진 계약 위반 (2026-08-26)

고치지 않고 기록만 — 수정은 [DEV_PLAN.md §4](DEV_PLAN.md) 에서 관리.

| # | 위반 | 위치 |
|---|---|---|
| 1 | `dmgBonus` ↔ `bonusPct` 필드명 불일치 → 도감 피해 보정 무효 | battle.js:56,117 ↔ formula.js:64 |
| 2 | `codexBonus` 의 `acc_pct` 를 `computeCombat` 이 읽지 않음 → 스테이지 3 도감 보정 무효 | state.js:130 ↔ hero.js:143 |
| 3 | 실효 쿨 공식(`ceil(cd/cycle)×cycle`, battle_design §6)이 렌더러에만 있음 | ui/app.js:46 |
| 4 | 예상 소요 시간 집계가 렌더러에 있음 | ui/app.js:77 |
| 5 | §7 의 mock 잔류 데이터 | ui/mock.js |

---

*마지막 업데이트: 2026-08-26 (§2-3 기획 개정 배너) · 2026-08-26 (최초 작성 — 코드 인벤토리에서 계약 추출)*
