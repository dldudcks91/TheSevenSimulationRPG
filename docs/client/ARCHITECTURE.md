# ARCHITECTURE — 소프트웨어 구조

> 무엇이 어디에 있고 어떻게 붙어 있는가. **왜 이렇게인가**는 [CLAUDE.md 아키텍처 원칙](../../CLAUDE.md), **경계의 정확한 모양**은 [INTERFACE.md](INTERFACE.md).

---

## 1. 한 장 그림

```
              src/data/*.csv  (SSOT — 수치·구조)          src/ui/mock.js  (표시 사전 + ⚠게임 데이터 잔류)
                     │                                             │
                     ▼ fetch + parseCsv                            │
              ┌──────────────────────────────────────────────────┐ │
              │ ui/data.js  ─ loadData() → D                     │◄┘
              │             ─ buildSystems(D) → SYS              │   주입
              └──────────────────────────────────────────────────┘
                                   │ SYS = { hero, item, battle, game, formula }
                                   ▼
   ┌───────────────────────  game_logic/  (순수 · 이식 대상)  ───────────────────────┐
   │  rng ─ csv ─ formula ─ hero ─ item ─ battle ─ state                              │
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
| `D` | 로드된 CSV 파생 데이터 (`balance`, `monsters`, `stages`, `stageOrder`, `roundTypes`, `budgets`, `grades`, `eliteRounds`, `bossRound`, `codexLevels`, `weaponGroups`) | `ui/data.js` | 부팅 후 읽기 전용 |
| `SYS` | 조립된 시스템 5개 (`hero` `item` `battle` `game` `formula`) | `ui/data.js` | 무상태 — 함수 묶음 |
| `G` | 세이브 상태 (JSON 평문) | `ui/app.js` | **유일한 가변 상태.** `null` 이면 시작 화면 |

**시스템은 무상태, 상태는 G 하나.** `SYS.game.*` 는 `G` 를 첫 인자로 받아 직접 바꾼다. 렌더러는 바꾼 뒤 `save()` 를 부른다. 이 셋 외의 가변 전역은 렌더러의 화면 상태(`state` — 탭·선택·필터)뿐이며 세이브에 들어가지 않는다.

---

## 4. 부팅 시퀀스 (`ui/app.js:boot`)

```
loadData()            CSV 8개 fetch → D 채움 → SYS 조립
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
관전 중 게임이 꺼져도 잃는 것이 없다 — 컨셉 락 "런은 출발 시점에 통째로 정산"의 실체.

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

`dev/test.js` 는 `ui/data.js:buildSystems` 를 **그대로** 쓴다. 런타임과 테스트의 조립 경로가 하나라서, 테스트가 통과하면 같은 시스템이 화면에서도 돈다. 단정 목록: 결정론 / 직렬화 왕복 / 생성 규칙 / 착용 규칙 / 성장 / 정산 / 도감 카드 / 런 마무리 / 선술집. 실행은 [src/dev/README.md](../../src/dev/README.md).

---

## 8. 외부 의존

| 의존 | 위치 | 비고 |
|---|---|---|
| Galmuri 웹폰트 (CDN) | `index.html` | **유일한 네트워크 의존.** 오프라인이면 폴백 폰트 |
| Python `http.server` | `start.bat` | ES Modules 가 `file://` 에서 막혀서 |

패키지 매니저·빌드 도구·프레임워크 없음.

---

## 9. mock.js 의 이중 성격 — Phase 2 의 첫 작업

`ui/mock.js` 는 이름이 "목업"이지만 두 가지가 섞여 있다:

1. **표시 사전** — 이름 ko/en · 아이콘 · 얼굴 경로 · 색 · 스킬 트리 목업 · 도감 챕터 이름. UI 와 함께 버려진다
2. **⚠ 게임 데이터** — `STATS` · `CLASSES` · `SLOTS`/`EQUIP_SLOTS` · `ITEM_BASES` · `AFFIX_DEFS` · `SIN_TRAITS`/`COMMON_TRAITS` · 이름/특성 풀 · `CODEX_*` · `nm()`. **game_logic 에 주입된다.** UI 를 버리면 로직이 굶는다

2번을 CSV(또는 이식 대상 코드)로 빼내는 것이 Phase 2 착수 조건이다 — 목록은 [INTERFACE.md §7](INTERFACE.md#7-데이터-계약--무엇이-어디서-오는가), 일정은 [DEV_PLAN.md](DEV_PLAN.md).

---

## 10. Phase 2 에서 각 파일이 되는 것

| Phase 1 | Phase 2 (Godot / Unity) |
|---|---|
| `data/*.csv` | 그대로 (`res://data/` · `StreamingAssets/`) |
| `game_logic/rng.js` | mulberry32 1:1 — 32비트 정수 연산 재현 |
| `game_logic/csv.js` | 엔진 CSV 로더 — **숫자 자동 변환 규칙 동일** |
| `game_logic/formula.js` | 1:1 이식. **가장 먼저** — 같은 입력 → 같은 숫자 대조 |
| `game_logic/hero.js` · `item.js` · `battle.js` · `state.js` | 1:1 이식. rng 호출 순서 보존 |
| `ui/data.js` | 엔진 리소스 로더 + 조립 |
| `ui/storage.js` | `user://` / `PlayerPrefs` / 파일 어댑터 |
| `ui/mock.js` 게임 데이터 | **CSV 로 선이관** (이식 전) |
| `ui/app.js` · `ui/battle.js` · `style.css` · `i18n.js` | 재작성 — [SCREEN_DESIGN.md](SCREEN_DESIGN.md) 가 스펙, `i18n.js:STRINGS` 는 문구 사전으로 계승 |
| `dev/test.js` | 엔진 테스트 — **골든 시드 타임라인 대조**가 핵 ([DEV_PLAN §6](DEV_PLAN.md#6-phase-2--엔진-이식-계획)) |

---

*마지막 업데이트: 2026-08-26 (최초 작성)*
