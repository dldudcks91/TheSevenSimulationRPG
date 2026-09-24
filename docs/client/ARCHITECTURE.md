# ARCHITECTURE — 소프트웨어 구조

> 무엇이 어디에 있고 어떻게 붙어 있는가. **왜 이렇게인가**는 [CLAUDE.md 아키텍처 원칙](../../CLAUDE.md), **경계의 정확한 모양**은 [INTERFACE.md](INTERFACE.md).

---

## 1. 한 장 그림

```
        src/data/*.csv  (SSOT — 수치·구조 · 27종)      src/ui/mock.js  (표시 사전 + ⚠죄종 3항목 잔류)
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
            ui/i18n.js (STRINGS ko/en · t())      index.html (한 장 `#stage` 안에 셸 DOM + 툴팁 · 창 레이어)
            ui/tip.js  (툴팁 기계장치 · 영웅/스킬 카드 — 두 렌더러 공용)
            ui/cloud.js (Google 로그인 · 클라우드 세이브 사본 — Firebase 를 만지는 유일한 파일 · 시작 시 SDK 로 인증을 확인한다)
```

---

## 2. 레이어와 책임

| 레이어 | 파일 | 한다 | **하지 않는다** | Phase 2 |
|---|---|---|---|---|
| 데이터 | `data/*.csv` | 수치·구조의 SSOT | 엔진별 포맷 | **그대로** |
| 로직 | `game_logic/*` | 규칙·상태 전이·시뮬·직렬화 | DOM·저장소·시계·`Math.random` | **이식** |
| 조립 | `ui/data.js` | fetch → 파싱 → 시스템 생성자 주입 | 계산 | 교체 (엔진의 파일 로더) |
| 저장 | `ui/storage.js` · `ui/cloud.js` | 문자열 넣고 빼기 · 다른 탭 감지 · 로그인 시 계정별 사본 올리기/받기 | 형식 결정 (state.js 가 정한다) · 병합 | 교체 (파일/클라우드 — 계정은 플랫폼 계정이 대신할 가능성이 크다) |
| 표시 사전 | `ui/mock.js` · `ui/i18n.js` | 이름 ko/en · 아이콘 · 얼굴 · 문구 | 수치 | 재작성 — 단 ⚠게임 데이터는 CSV 로 먼저 빼낸다 |
| 렌더 | `ui/app.js` · `ui/battle.js` · `style.css` | 상태 읽기 · 시스템 호출 · save() · 재생 | 계산 · 난수 · 한국어 리터럴 | **재작성** ([SCREEN_DESIGN.md](SCREEN_DESIGN.md) 기준) |
| 검증 | `dev/test.*` | 단정 · 캘리브레이션 | | 엔진 테스트로 재작성 — 단정 목록은 계승 |

---

## 3. 전역 셋 — D · SYS · G

| 전역 | 정체 | 소유 | 가변성 |
|---|---|---|---|
| `D` | 로드된 CSV 파생 데이터 **36 필드** [정정 2026-09-08 — 31 → 36 · CSV 22 → 27 과 같은 원인. 늘어난 것: `commissionKinds` `commissionList` `mineNodes` `skillTagRows` `heroTiers`] — 밸런스(`balance` `balanceRows`) · 전투 소재(`monsters` `stages` `stageList` `stageOrder` `roundTypes` `budgets` `grades` `eliteRounds` `bossRound`) · 도감(`codexLevels` `codexBonus` `codexSeries`) · 챕터(`chapters` `chapterList`) · 능력치(`heroAttributes` `combatStats`) · 무기군(`weaponGroups` `weaponGroupList`) · 스킬·마스터리(`skillRows` `masteryNodes`) · 전술(`tacticSlots` `tacticOptions`) · **장비**(`slots` `equipSlots` `itemBases` · 부위별 옵션 표 — ~~`affixDefs`~~ 는 2026-09-21 R127 퇴역 · 장신구는 `accessorySinOptions` `accessoryCommonOptions` `amuletProcs`) · **영웅 풀**(`classes` `heroNamePool` `heroTraitPool` `heroTiers`) · 의뢰(`commissionKinds` `commissionList`) · 파견(`mineNodes`) | `ui/data.js` | 부팅 후 읽기 전용 |
| `SYS` | 조립된 시스템 **7개** (`hero` `item` `battle` `skill` `tactic` `game` `formula`) | `ui/data.js` | 무상태 — 함수 묶음 |
| `G` | 세이브 상태 (JSON 평문) | `ui/app.js` | **유일한 가변 상태.** `null` 이면 시작 화면 |

**시스템은 무상태, 상태는 G 하나.** `SYS.game.*` 는 `G` 를 첫 인자로 받아 직접 바꾼다. 렌더러는 바꾼 뒤 `save()` 를 부른다. 이 셋 외의 가변 전역은 렌더러의 화면 상태(`state` — 탭·선택·필터)뿐이며 세이브에 들어가지 않는다.

---

## 4. 부팅 시퀀스 (`ui/app.js:boot`)

```
loadData()            CSV 27개 fetch → D 채움 → SYS 조립  (`ui/data.js:FILES` 가 목록 — src/data/*.csv 전부여야 한다)
rollCandidates()      새 게임 후보 3명 (고정 시드 — 세이브 밖)
cloudResume()         전에 로그인한 브라우저면 계정 복원 + 클라우드 사본 받기 → 맞춘다 (받으면 로컬에 쓴다 · 기다림 상한을 넘은 결과는 버린다 — SCREEN_DESIGN §2-1)
loadSave() → continueGame()
    deserialize (버전 불일치면 catch → G=null → 시작 화면)
    closeRun (재접속 — 원정을 끊는다 → save)   ← tickInjuries 는 v11(2026-09-03)에서 삭제
?screen / ?dev / ?tab  개발용 라우팅 (순서 고정 — ?tab 은 마지막)
render()
```

---

## 5. 데이터 흐름 — 대표 두 가지

**원정 1회**
```
[출발 버튼] → SYS.game.departRun(G, stageId, …)     첫 라운드를 연다(battle.createRun · advance(0)) · 보상 없음 · 리포트 자리(진행 중)
  → save()
  → 관전(mountBattle — 타임라인 재생) 또는 다른 탭 — 시계는 앱이 든다
  → 시계가 한 눈금 갈 때마다 SYS.game.stepRun(G, run, 지금 시각)     엔진을 그 시각까지만 민다(R130)
       첫머리 = 그 순간의 장비 · 스킬 트리로 갈아입기(바뀐 영웅만 · 타임라인의 refit · 보스 라운드 도중은 거절)
       라운드가 끝나면 이긴 라운드 정산(드롭 · XP · 골드 · 처치 수) → 경계 갈아입기(레벨업) → 다음 라운드를 연다 → save()
  → 마지막 라운드 끝 · 전멸 · 시간 초과 = 원정 끝 → 리포트 확정 (반복 ON + 승리면 다음 원정 자동)
  → [철수] = SYS.game.retreatRun · 게임 종료(재접속 · 멈춘 공백) = closeRun
       진행 중이던 라운드는 버린다 · 반복을 끈다 → save()
```
게임이 꺼져도 **이긴 라운드의 보상은 이미 저장돼 있다** — 잃는 것은 진행 중이던 라운드 하나다. 켤 때 남은 라운드를 마무리하지 않는다(껐다 켜기가 가속 수단이 된다). `resolveBattle` 은 개발 · 테스트용 즉시 계산으로 남는다 — 라운드마다 정산을 끝까지 한 번에 돈다.

**장착 1회**
```
[가방 칸 클릭] → SYS.game.equip(G, heroUid, itemUid)
  → {ok, back, position} 또는 {ok:false, err}
  → ok 면 save(), err 면 flash(i18n 키)
  → 원정 중이면 다음 눈금의 SYS.game.stepRun 첫머리가 그 시각에 갈아입힌다 · 보스전 중 · 꺼진 전술은 플래시(runLock · runTactics · R130)
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

**골든 시드 스냅샷** (`dev/golden.js` + `golden.json`, 2026-08-31) — 시드 10 × 스테이지 5 = 50런의 결과를 지문으로 박아 두고 매 실행 대조한다. **Phase 2 이식 검증의 실제 도구**다: 엔진 쪽에서 같은 시드로 같은 지문이 나오면 rng 소비 수열이 같다는 뜻이다. `dev/` 는 이식 대상이 아니므로 지문 생성은 `game_logic` 을 건드리지 않는다.

---

## 8. 외부 의존

| 의존 | 위치 | 비고 |
|---|---|---|
| Galmuri · Pretendard 웹폰트 (CDN **2개**) | `index.html` | 오프라인이면 폴백 폰트 (하이브리드 폰트 도입 08-27 — DEV_PLAN 부채 #11) |
| Firebase JS SDK (gstatic CDN — `app` · `auth` · `firestore-lite`) + Firebase Authentication(Google) · Firestore | `ui/cloud.js` · `ui/firebase_config.js` | 시작 시 동적 import 로 인증과 클라우드를 확인한다. **Google 로그인 필수** — 확인 실패 시 로컬 게임을 열지 않고 재시도를 기다린다. 세이브 사본은 `saves/<uid>` 문서 하나(JSON 문자열) · 보안 규칙은 「자기 문서만」 (SCREEN_DESIGN §2-1) |
| Python `http.server` | `serve.py` (← `start.bat`) | ES Modules 가 `file://` 에서 막혀서. `serve.py` 는 그걸 얇게 감싸 **`Cache-Control: no-cache` + ETag**(수정 시각 + 크기)만 더한다 — 같은 파일명으로 아트를 갈아끼우면 브라우저 휴리스틱 캐시가 옛 그림을 계속 쓴다. 쓸 때마다 재검증하고 안 바뀐 파일은 304 (2026-09-24 · 옛 `no-store` 는 다시 그릴 때마다 그림을 본문째 다시 받았다) |

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
| `ui/storage.js` · `ui/cloud.js` | `user://` / `PlayerPrefs` / 파일 어댑터 — 계정 · 클라우드 사본은 플랫폼 계정(스팀 클라우드 등)이 대신할 가능성이 크다 (ADR-0112) |
| `ui/mock.js` 게임 데이터 | **CSV 로 선이관** (이식 전) — 08-31 로 3항목만 남았다 (§9) |
| `ui/app.js` · `ui/battle.js` · `ui/tip.js` · `style.css` · `i18n.js` | 재작성 — [SCREEN_DESIGN.md](SCREEN_DESIGN.md) 가 스펙, `i18n.js:STRINGS` 는 문구 사전으로 계승 |
| `dev/test.js` · **`dev/golden.js`·`golden.json`** | 엔진 테스트 — **골든 시드 지문 대조**가 핵. 지문 계약은 [INTERFACE.md §5-5](INTERFACE.md), 절차는 [DEV_PLAN §6](DEV_PLAN.md#6-phase-2--엔진-이식-계획) |

---

*마지막 업데이트: 2026-09-24*
