# ARCHITECTURE — 소프트웨어 구조

> 무엇이 어디에 있고 어떻게 붙어 있는가. **왜 이렇게인가**는 [CLAUDE.md 아키텍처 원칙](../../CLAUDE.md), **경계의 정확한 모양**은 [INTERFACE.md](INTERFACE.md).

---

## 1. 한 장 그림

```
        src/data/*.csv  (SSOT — 수치·구조 · 22종)      src/ui/mock.js  (표시 사전 + ⚠죄종 3항목 잔류)
                     │                                             │
                     ▼ fetch + parseCsv                            │
              ┌──────────────────────────────────────────────────┐ │
              │ ui/data.js  ─ loadData() → D                     │◄┘
              │             ─ buildSystems(D) → SYS              │   주입
              └──────────────────────────────────────────────────┘
                       │ SYS = { hero, item, battle, skill, tactic, game, formula }
                                   ▼
   ┌───────────────────────  game_logic/  (순수 · 이식 대상)  ───────────────────────┐
   │  rng ─ csv ─ formula ─ naming ─ hero ─ item ─ skill ─ tactic ─ battle ─ state    │
   │  모든 함수: (state, …args, now?) → 결과.  난수는 rng 인자.  시계는 now 인자.        │
   └──────────────────────────────────────────────────────────────────────────────────┘
                                   ▲                      │
            G (세이브 상태 JSON)    │ 읽고 부른다           │ result.timeline
                                   │                      ▼
   ┌── ui/app.js ─────────────┐   ┌── ui/battle.js ──────────────┐   ┌── ui/storage.js ──┐
   │ 화면 그리기 · 입력 · save() │   │ 타임라인 **재생기** (계산 0)   │   │ localStorage 유일  │
   │ now() 는 여기서만 읽는다    │   └───────────────────────────────┘   └────────────────────┘
   └──────────────────────────┘
            ui/i18n.js (STRINGS ko/en · t())      index.html (셸 DOM 5개 + 툴팁 레이어)
            ui/tip.js  (툴팁 기계장치 · 영웅/스킬 카드 — 두 렌더러 공용)
```

---

## 2. 레이어와 책임

| 레이어 | 파일 | 한다 | **하지 않는다** | Phase 2 |
|---|---|---|---|---|
| 데이터 | `data/*.csv` | 수치·구조의 SSOT | 엔진별 포맷 | **그대로** |
| 로직 | `game_logic/*` | 규칙·상태 전이·시뮬·직렬화 | DOM·저장소·시계·`Math.random` | **이식** |
| 조립 | `ui/data.js` | fetch → 파싱 → 시스템 생성자 주입 | 계산 | 교체 (엔진의 파일 로더) |
| 저장 | `ui/storage.js` | 문자열 넣고 빼기 | 형식 결정 (state.js 가 정한다) | 교체 (파일/클라우드) |
| 표시 사전 | `ui/mock.js` · `ui/i18n.js` | 이름 ko/en · 아이콘 · 얼굴 · 문구 | 수치 | 재작성 — 단 ⚠게임 데이터는 CSV 로 먼저 빼낸다 |
| 렌더 | `ui/app.js` · `ui/battle.js` · `style.css` | 상태 읽기 · 시스템 호출 · save() · 재생 | 계산 · 난수 · 한국어 리터럴 | **재작성** ([SCREEN_DESIGN.md](SCREEN_DESIGN.md) 기준) |
| 검증 | `dev/test.*` | 단정 · 캘리브레이션 | | 엔진 테스트로 재작성 — 단정 목록은 계승 |

---

## 3. 전역 셋 — D · SYS · G

| 전역 | 정체 | 소유 | 가변성 |
|---|---|---|---|
| `D` | 로드된 CSV 파생 데이터 **31 필드** — 밸런스(`balance` `balanceRows`) · 전투 소재(`monsters` `stages` `stageList` `stageOrder` `roundTypes` `budgets` `grades` `eliteRounds` `bossRound`) · 도감(`codexLevels` `codexBonus` `codexSeries`) · 챕터(`chapters` `chapterList`) · 능력치(`heroAttributes` `combatStats`) · 무기군(`weaponGroups` `weaponGroupList`) · 스킬·마스터리(`skillRows` `masteryNodes`) · 전술(`tacticSlots` `tacticOptions`) · **장비**(`slots` `equipSlots` `itemBases` `affixDefs`) · **영웅 풀**(`classes` `heroNamePool` `heroTraitPool`) | `ui/data.js` | 부팅 후 읽기 전용 |
| `SYS` | 조립된 시스템 **7개** (`hero` `item` `battle` `skill` `tactic` `game` `formula`) | `ui/data.js` | 무상태 — 함수 묶음 |
| `G` | 세이브 상태 (JSON 평문) | `ui/app.js` | **유일한 가변 상태.** `null` 이면 시작 화면 |

**시스템은 무상태, 상태는 G 하나.** `SYS.game.*` 는 `G` 를 첫 인자로 받아 직접 바꾼다. 렌더러는 바꾼 뒤 `save()` 를 부른다. 이 셋 외의 가변 전역은 렌더러의 화면 상태(`state` — 탭·선택·필터)뿐이며 세이브에 들어가지 않는다.

---

## 4. 부팅 시퀀스 (`ui/app.js:boot`)

```
loadData()            CSV 22개 fetch → D 채움 → SYS 조립  (`ui/data.js:FILES` 가 목록 — src/data/*.csv 전부여야 한다)
rollCandidates()      새 게임 후보 3명 (고정 시드 — 세이브 밖)
loadSave() → continueGame()
    deserialize (버전 불일치면 catch → G=null → 시작 화면)
    tickInjuries · closeRun (재접속 런 마무리 → save)
?screen / ?dev / ?tab  개발용 라우팅 (순서 고정 — ?tab 은 마지막)
render()
```

---

## 5. 데이터 흐름 — 대표 두 가지

**원정 1회**
```
[출발 버튼] → runBattle(stageId)
  → SYS.game.resolveBattle(G, stageId, now())      정산 완료 (시뮬 + 보상 + 부상 + 리포트)
  → save()                                          ← 여기서 이미 결과가 확정·저장됨
  → mountBattle(result.timeline)                    관전 = 재생 (건너뛰기 가능)
  → onEnd → 리포트 화면 (또는 반복 ON + 승리면 다음 원정 자동)
```
관전 중 게임이 꺼져도 잃는 것이 없다 — "런은 출발 시점에 통째로 정산"의 실체.

**장착 1회**
```
[가방 칸 클릭] → SYS.game.equip(G, heroUid, itemUid)
  → {ok, back, position} 또는 {ok:false, err}
  → ok 면 save(), err 면 flash(i18n 키)
  → render()  (전체 다시 그림 — 부분 갱신 없음)
```

렌더는 **항상 전체 다시 그리기**다. 프로토타입이라 단순함을 택했다. Phase 2 에서 부분 갱신으로 바꿔도 계약은 안 바뀐다.

---

## 6. 시간과 난수의 출입구

| | 출입구 | 규칙 |
|---|---|---|
| 시계 | `ui/app.js:now()` 하나 | 로직엔 `now` 인자로 넘긴다. 테스트는 고정 시각 |
| 난수 | `game_logic/rng.js` 하나 | 마스터 시드 → `deriveSeed(seed, counter)` → `makeRng`. 카운터는 세이브에 |
| 예외 | 새 게임 후보 시드 `ROLL_SEED` | 렌더러 소유 고정 상수 — 세이브 밖이지만 결정적 |

---

## 7. 검증 조립

`dev/test.js` 는 `ui/data.js:buildSystems` 를 **그대로** 쓴다. 런타임과 테스트의 조립 경로가 하나라서, 테스트가 통과하면 같은 시스템이 화면에서도 돈다. 단정 목록: CSV 정합 / 결정론 / 직렬화 왕복 / 생성 규칙 / 착용 규칙 / 성장 / 정산 / 도감 카드 / 런 마무리 / 선술집 / 마스터리 / 전술 / **골든 지문**. 실행은 [src/dev/README.md](../../src/dev/README.md).

**골든 시드 스냅샷** (`dev/golden.js` + `golden.json`, 2026-08-31) — 시드 10 × 스테이지 4 = 40런의 결과를 지문으로 박아 두고 매 실행 대조한다. **Phase 2 이식 검증의 실제 도구**다: 엔진 쪽에서 같은 시드로 같은 지문이 나오면 rng 소비 수열이 같다는 뜻이다. `dev/` 는 이식 대상이 아니므로 지문 생성은 `game_logic` 을 건드리지 않는다.

---

## 8. 외부 의존

| 의존 | 위치 | 비고 |
|---|---|---|
| Galmuri · Pretendard 웹폰트 (CDN **2개**) | `index.html` | **유일한 네트워크 의존.** 오프라인이면 폴백 폰트 (하이브리드 폰트 도입 08-27 — DEV_PLAN 부채 #11) |
| Python `http.server` | `start.bat` | ES Modules 가 `file://` 에서 막혀서 |

패키지 매니저·빌드 도구·프레임워크 없음.

---

## 9. mock.js 의 이중 성격 — Phase 2 의 첫 작업 (거의 끝났다)

`ui/mock.js` 는 이름이 "목업"이지만 두 가지가 섞여 있다:

1. **표시 사전** — 이름 ko/en · 아이콘 · 얼굴 경로 · 색 · 접사 표기(`AFFIX_LABELS`) · 페이퍼돌 배치 · 자산 경로. UI 와 함께 버려진다
2. **⚠ 게임 데이터** — **game_logic 에 주입된다.** UI 를 버리면 로직이 굶는다

2번을 CSV(또는 이식 대상 코드)로 빼내는 것이 Phase 2 착수 조건이고, **2026-08-31 로 9항목 중 6이 나갔다**:

| 나간 것 | 간 곳 |
|---|---|
| `CLASSES` · `SLOTS`/`EQUIP_SLOTS` · `ITEM_BASES` · `AFFIX_DEFS` · `HERO_NAME_POOL` · `HERO_TRAIT_POOL` | `class` · `equip_slot` · `item_base` · `affix` · `hero_name` · `hero_trait` **CSV** (08-31) |
| `ELEMENT_IDS` | `game_logic/hero.js:ELEMENTS` 로 통합 — 중복 SSOT 해소 (08-31) |
| `nm()` · `eliteName()` | **`game_logic/naming.js`** — 어순·조사가 규칙이라 CSV 가 아니라 이식 대상 코드다 (08-31) |
| `STATS` · `COMBAT_STATS` · `CODEX_*` · 이름·얼굴 | `hero_attribute` · `combat_stat` · `codex_level` · `codex_series` · `chapter` · `monster`/`stage` 의 `_kr`/`_en` (08-28) |

**남은 것은 셋** — `SINS` · `SIN_TRAITS` · `COMMON_TRAITS`. 전부 **죄종 매핑 확정**(`sin_mapping.md` — GAME_DESIGN §10 첫 SSOT 과제)에 막혀 있다. `SINS` 는 표시명 외에 `adj`(영문 형용사)를 들고 있고 `naming.js` 가 그것을 읽으므로, 죄종 CSV 가 생길 때 그 컬럼이 따라와야 한다.

목록은 [INTERFACE.md §7](INTERFACE.md#7-데이터-계약--무엇이-어디서-오는가), 일정은 [DEV_PLAN.md](DEV_PLAN.md).

---

## 10. Phase 2 에서 각 파일이 되는 것

| Phase 1 | Phase 2 (Godot / Unity) |
|---|---|
| `data/*.csv` | 그대로 (`res://data/` · `StreamingAssets/`) |
| `game_logic/rng.js` | mulberry32 1:1 — 32비트 정수 연산 재현 |
| `game_logic/csv.js` | 엔진 CSV 로더 — **숫자 자동 변환 규칙 동일** |
| `game_logic/formula.js` | 1:1 이식. **가장 먼저** — 같은 입력 → 같은 숫자 대조 |
| `game_logic/naming.js` | 1:1 이식. 난수를 안 쓰므로 결정론 부담은 없다 — 다만 **문자열 조립 규칙**(어순·조사)이 그대로여야 골든 지문의 아이템 이름이 맞는다 |
| `game_logic/hero.js` · `item.js` · `skill.js` · `tactic.js` · `battle.js` · `state.js` | 1:1 이식. rng 호출 순서 보존 |
| `ui/data.js` | 엔진 리소스 로더 + 조립 |
| `ui/storage.js` | `user://` / `PlayerPrefs` / 파일 어댑터 |
| `ui/mock.js` 게임 데이터 | **CSV 로 선이관** (이식 전) — 08-31 로 3항목만 남았다 (§9) |
| `ui/app.js` · `ui/battle.js` · `ui/tip.js` · `style.css` · `i18n.js` | 재작성 — [SCREEN_DESIGN.md](SCREEN_DESIGN.md) 가 스펙, `i18n.js:STRINGS` 는 문구 사전으로 계승 |
| `dev/test.js` · **`dev/golden.js`·`golden.json`** | 엔진 테스트 — **골든 시드 지문 대조**가 핵. 지문 계약은 [INTERFACE.md §5-5](INTERFACE.md), 절차는 [DEV_PLAN §6](DEV_PLAN.md#6-phase-2--엔진-이식-계획) |

---

*마지막 업데이트: 2026-08-31 (**전면 대조 — 문서가 08-28 판에 멈춰 있었다.** §1 그림(SYS 5→7 · `skill`·`tactic`·`naming` 누락) · §3 `D` 13→31 필드 · §4 CSV 8→22 · §7 골든 스냅샷 절 신설 · §8 CDN 1→2(부채 #11 과의 모순 해소) · §9 mock 잔류 9→3 + 이관 내역 표 · §10 이식 표에 `naming`·`skill`·`tactic`·골든) · 2026-08-28 (`ui/tip.js` 등재 — 툴팁 기계장치를 app.js 에서 분리, 관전 재생기와 공용) · 2026-08-27 (§3 `D` 필드 보충 — `stageList` · `weaponGroupList` 누락) · 2026-08-26 (최초 작성)*
