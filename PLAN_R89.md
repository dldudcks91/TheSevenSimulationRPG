# PLAN — R89 원정 보상은 라운드 승리 순간 (구현 마무리 인계)

> **인계용 임시 문서다.** 실행 세션이 끝까지 돌리고 보고한 뒤 지운다(대장은 DEV_PLAN R89 행 · 근거는 ADR-0106).
> 원래 요청: 「원정 중 아이템 드랍이 실시간이 아니다 — 원인 파악 후 해결」. 원인은 **출발 순간에 전투 전체를 미리 계산하고 정산**하던 구조였고, 사용자와 합의한 D1~D14 로 **라운드 단위 계산**으로 바꿨다.
> **현재 상태: 구현은 끝, 검증이 안 끝났다** — `dev/test.html` FAIL 273/280 (아래 1단계의 넷 + 골든 셋).

---

## 0. 결정 목록 (전부 사용자 확정 2026-09-14 — 재논쟁하지 않는다)

| # | 결정 |
|---|---|
| D1 | 보상(가방 드롭 · XP · 골드 · 도감 카드 · 도감 처치 수)은 **라운드를 이겨야만** 들어온다. 진 라운드(전멸 · 시간 초과)와 끊긴 라운드(철수 · 게임 종료)는 0. 「나중에 바꿀 수 있다」고 사용자가 명시 |
| D2 | 이긴 라운드의 XP 는 **그 순간 살아 있는 영웅만** 받는다. 쓰러진 영웅은 못 받고, 그 런 끝까지 빠진다 |
| D3 | 레벨업은 라운드 승리 순간 적용 → **다음에 계산하는 라운드부터** 전투에 반영 |
| D4 | 라운드는 **시작할 때** 계산한다. 장비 · 스킬트리 변경은 다음 계산 라운드부터. 라운드 사이 쉬는 시간 없음(지금 그대로) → N 라운드에 주운 장비는 N+2 부터 |
| D5 | 최대 HP 가 바뀌어도 **현재 HP 는 유지**(새 최대로 캡) |
| D6 | **모든 스킬은 쿨부터 돈다** — 파티는 스테이지 시작부터, 몬스터는 제 등장 라운드 시작부터. 중간에 새로 얻은 스킬도 쿨 한 바퀴를 기다린다. 「전투 시작 시 발동」 태그는 **사용자가 나중에 붙인다 — 이번엔 구현 안 함(열린 항목으로만 기록)** |
| D7 | 원정 중 **파티 인원 · 진형 변경 불가**(바꾸면 새 스테이지 시작). 진행 중 새 출발 막힘 · 파티원 해고 막힘 |
| D8 | 게임 끄기 · 새로고침 · 2분 넘는 JS 멈춤 = **원정 끊김(아웃)**. 진행 중 라운드는 잃고 반복은 꺼지고 이미 이긴 라운드 보상은 남는다. 이유: 안 끊으면 껐다 켜기로 빠른 반복이 무한히 된다 |
| D9 | 탭을 숨겨도 원정은 계속 진행 |
| D10 | 건너뛰기 버튼 → **철수**: 진행 중 라운드는 잃고 런 종료 · 반복 off |
| D11 | 드롭은 라운드 끝에 **조용히 인벤토리로** — 처치 순간 표시 없음. 도감 카드도 라운드 끝에 조용히 · 처치 순간 카드 팝업과 로그 줄 삭제 |
| D12 | 리포트 — 기여 표 영웅 행에 **영웅별 받은 XP**. 획득 줄의 XP 칸은 파티 합계 |
| D13 | 끊긴 런(철수 · 게임 종료)은 판정 **「철수」** |
| D14 | 진행 중인 런은 리포트 목록 맨 위에 「진행 중」 · 배지는 경과 시간만 |

---

## 1. 이미 끝난 변경 (고치지 말고 검수만)

계약은 **INTERFACE.md §2-6 · §2-7 · §2-12 · §3 · §4 · §5 · §6 · §8 에 이미 반영됐다** — 코드와 대조할 때 그 절이 SSOT.

| 파일 | 한 줄 요약 |
|---|---|
| `src/game_logic/skill_runtime.js` | `cooldownSec(B, u, def)` export 신설 — `act` 의 쿨 계산이 이것을 쓴다 |
| `src/game_logic/battle.js` | `simulate` → **`createRun(partyUnits, stageId, rng, level)` → `{next(partyUnits?), result, ended}`** 라운드 스테퍼. `simulate` 는 `createRun` 을 인자 없이 끝까지 돌린 것(동작 동일 — 1단계 리팩터 때 312/312 동치 확인). 스킬 쿨 시작 · 라운드별 `loot` 적립 후 **이긴 라운드만 `bank()`** · `refit(updates)`(바뀐 산 영웅만 재구성 · HP 유지 · 기존 스킬 readyAt 유지 · 새 스킬은 쿨) · 타임라인 `card` 이벤트 삭제 · `refit` 이벤트 신설 · `party[].ready` · 라운드 이벤트 적 `ready` |
| `src/game_logic/state.js` | `SAVE_VERSION = 25` · `upgradeV24`(리포트 `xpEach` → `xp {uid:n}` · `run.active=false`) · `departRun` / `advanceRun` / `retreatRun` 신설 · `resolveBattle` = departRun + advanceRun 끝까지(개발 · 테스트용 즉시 경로) · `closeRun` 은 진행 중 런을 `closed` 로 끊는다 · `setFormation` / `placeFormation` / `toggleParty` / `canDepart` / `dismiss` 가 진행 중이면 `running` |
| `src/ui/battle.js` | 스킬 readyAt 을 결과의 `ready` 로 · 건너뛰기 → 철수(`opts.onRetreat`) · `step()` 이 `opts.onTime(t)` 을 먼저 부른다 · `card` 케이스 → `refit` 케이스 |
| `src/ui/app.js` | `runBattle` 이 `departRun` · `advanceBattle` / `onRoundsSettled` / `refreshBattleSide`(자원 숫자 `data-res` · 가방 패널 교체) · `expTick` · `closeFrozenRun` · 리포트 판정 `running` / 철수에 `closed` 포함 · 기여 표 영웅별 XP · `xpSum` · `?dev=live&at` |
| `src/ui/i18n.js` | 추가 `exp.running` · `rep.reason.retreat` · `rep.reason.closed` · `rep.running` · `rep.contrib.xp` · `bt.retreat` · `ch.err.running` / 수정 `exp.notice.runClosed.body` · `rep.live` · `bt.note` / 삭제 `rep.xpEach` · `log.card` · `pop.card` · `bt.skip` (src 안 잔여 참조 0 확인됨) |
| `src/ui/style.css` | `.rep-run .dot.running` · `.report-head .verdict.running` · `.rep-ct .nm > em.xp` 추가 / `.pop.card-tag` 삭제 |
| `src/dev/golden.js` | `xpEach` → `xpBy`(파티 자리 순 `a|b|c`) |
| 문서 | INTERFACE(메인 세션) · GAME_DESIGN · base_expedition_design(§1-5 신설) · battle_design · item_design · monster_design · hero_design · SCREEN_DESIGN · **ADR-0106** + adr/README 색인 · SCREEN_CHANGELOG · ARCHITECTURE · DEV_PLAN(R89 🔧) · `.claude/skills/ui/ui_conventions.md` |

> ⚠ **`app.js` 문법 오류는 해결됨** — 3061줄 도감 자산 주석 안의 `` `icons/*/source/` `` 가 `*/` 로 블록 주석을 닫아 모듈이 통째로 안 올라가던 것. **다른 세션이** `icons/items/source/` · `icons/skills/source/` 로 고쳤고 `node --check` 통과(2026-09-14 19:3x). 실행 전에 한 번 더 확인만 한다.

---

## 2. 남은 일 — 순서대로

### 2-0. 시작 전

- `ls -la --time-style=long-iso` 로 위 표의 파일 mtime 을 본다. 병렬 세션이 `INTERFACE` · `SCREEN_DESIGN` · `DEV_PLAN` · `item.js` · `data.js` · `i18n.js` · `mock.js` · `monster.csv` · `stage.csv` · `weapon_base.csv` 를 동시에 고치고 있었다 — **패치는 정확한 old 문자열 매칭으로만**.
- `src/ui/*.js` · `src/game_logic/*.js` 복사본에 `node --check`(모듈 문법만 — 동작 검증은 브라우저).
- `src/dev/golden.json.bak` 이 있다 — 골든 재촬영 절차의 백업이다(누가 만든 건지 모름). **커밋하지 않고 지우지도 않는다** — 보고에 적는다.

### 2-1. 깨진 테스트 고치기 (`src/dev/test.js` — 줄 번호는 2026-09-14 기준, 다시 grep)

| 줄 | 단정 | 고칠 것 |
|---|---|---|
| 841~845 | `save: serialize → deserialize 왕복 동일 (v22)` | `SAVE_VERSION === 24` → `25` (이름의 `(v22)` 는 건드리지 않아도 됨 — 판단) |
| 2266~2277 | `save: v23 → v24 이관 — 인벤 상한…` | `up.version !== 24` → `up.version !== SAVE_VERSION` (다른 이관 단정과 같은 방식) |
| 2558~2568 | `simulate: 도감 카드는 처치의 부분집합, 타임라인 card 이벤트와 일치` | `card` 이벤트가 없어졌다(D11). **「카드 ⊆ 처치 · 타임라인에 `card` 이벤트가 하나도 없다 · 10런에 카드 > 0」** 으로 다시 쓴다. 이름도 바꾼다 |
| 3460~3461 | `save: SAVE_VERSION 23 — …` | `=== 24` → `=== 25`, 긴 이름 끝에 **v25 설명**(리포트 XP 가 영웅별 `xp` 맵 · `run.active`) 을 같은 문체로 덧붙인다 |

### 2-2. 의미가 바뀐 테스트 점검 (지금 통과해도 **빈 단정**이 됐을 수 있다)

- **3765** `if (r.timeline.some(ev => ev.e === 'card' && walls.has(ev.u)))` — `card` 이벤트가 사라져 **영원히 통과한다.** 「벽 몬스터 id 가 `r.cards` · `r.kills` 키에 없다」로 바꾼다(벽 id 를 몬스터 id 로 어떻게 잇는지 주변 `wallsOf` 를 읽고 결정).
- **3890~3903** `쓰러진 영웅도 다음 런에서 XP 를 받는다` — D2 로 **다음 런에서도 첫 승리 전에 또 쓰러지면 XP 0** 이 된다. 시드 42 에서 통과하는지 보고, 흔들리면 「다음 런 `report.party` 에 들어간다 + 살아서 이긴 라운드가 있으면 XP 를 받는다」로 조건을 좁힌다. **「출정 아웃 폐기」 의미(다음 런에 전원 출전)는 유지**.
- **3904 · 3972 · 3984** `closeRun` 셋 — `resolveBattle` 이 끝까지 돌려 `run.active=false` 가 된 뒤라 **옛 의미(반복만 끈다 · 반복 꺼져 있으면 null)** 그대로 통과해야 한다. 통과 확인만. 진행 중 런을 끊는 새 의미는 2-3 에서 따로 단정.
- **1032 · 1048 · 1070** 옛 세이브 픽스처의 `xpEach` — 옛 버전 모양이라 **그대로 둔다.** 이관 뒤 `xp` 맵이 되는지는 2-3 의 v24→v25 단정이 본다.
- `resolveBattle` 을 쓰는 나머지(982 · 1092 · 1110 · 3615 · 3624 · 3699 · 3821 · 3842 · 4628) — 보고서 모양이 `xpEach` → `xp` 맵으로 바뀐 것 외엔 영향 없어야 한다. 실패하면 원인을 읽고 **단정의 의도를 지키는 쪽으로만** 고친다.

### 2-3. 새 단정 (R89 회귀 그물 — `fail()` 로 던진다 · 문자열 반환은 통과로 집계된다)

1. **`createRun` 동치** — 같은 시드로 `createRun(...).next()` 를 인자 없이 끝까지 부른 `result` 가 `simulate` 결과와 `eq`.
2. **이긴 라운드만 보상(D1)** — `next()` 요약 중 `cleared=false` 인 것은 xp · gold · drops · cards · kills 가 비어 있고, `cleared=true` 요약들의 합이 `result.gold` · `result.xpTotal` · `result.drops` 와 같다. 지는 판(약한 파티 · 높은 스테이지 — `godUnits(1)` + 401 같은 기존 픽스처)으로 **마지막 라운드가 진 경우**를 반드시 포함.
3. **쓰러진 영웅은 XP 없음(D2)** — `departRun` + `advanceRun` 루프에서 라운드마다 `s.alive` 에 없는 영웅의 `report.xp[uid]` 가 안 늘어난다. 쓰러진 영웅이 나오는 시드를 찾아 표본 수를 같이 낸다(없으면 fail — 표본 없음).
4. **스킬은 쿨부터(D6)** — `result.party[i].ready[j]` 가 `cooldownSec` 값과 같고 0 보다 크다 · 그 스킬의 첫 시전 시각 ≥ ready. 라운드 이벤트의 적 `ready` 도 그 라운드 시작 시각 + 쿨.
5. **refit(D4 · D5)** — 라운드 하나를 정산한 뒤 산 영웅의 장비를 바꿔 HP 최대치를 올리고 `advanceRun` → 다음 라운드 타임라인에 `refit` 이벤트 · `hpMax` 가 바뀌고 현재 HP 는 그대로(캡) · 새로 생긴 스킬의 ready = 그 시각 + 쿨 · 기존 스킬 ready 는 유지.
6. **잠금(D7)** — `departRun` 직후(끝나기 전) `toggleParty`(넣기 · 빼기) · `setFormation` · `placeFormation` · `canDepart` · 파티원 `dismiss` 가 전부 `err: 'running'`. 런이 끝나면(`advanceRun` 끝까지) 다시 된다.
7. **끊김(D8 · D13)** — 진행 중 런에 `closeRun` → 리포트 `reason === 'closed'` · `run.active === false` · `repeat === false` · 알림 `runClosed` · **자원 · 가방이 마지막으로 정산된 라운드 시점 그대로**(진행 중 라운드 보상 없음).
8. **철수(D10 · D13)** — `retreatRun` → `reason === 'retreat'` · active false · repeat false · 이미 이긴 라운드 보상은 남는다.
9. **세이브 v24 → v25** — `version=24` 세이브에 `reports[0] = {party:[a,b], xpEach: 7, …}` · `run: {…}` → `deserialize` 뒤 `reports[0].xp` 가 `{a:7, b:7}` · `xpEach` 없음 · `run.active === false` · `version === SAVE_VERSION`.
10. **결정론** — 같은 시드 · 같은 세이브로 `resolveBattle` 두 번 = 리포트 동일, 그리고 `departRun` + `advanceRun` 수동 루프 = `resolveBattle` 리포트.

### 2-4. 테스트 초록 → 골든 재촬영

- `dev/test.html` 을 헤드리스 dump-dom 으로 돌려 **PASS n/n** 을 받는다 — 절차 · 명령줄은 [src/dev/README.md](src/dev/README.md) (PowerShell 도구로만 · 프로필 폴더 매번 새로 · `--disk-cache-size=1` · 서버 `127.0.0.1:8777` 루트 `src`).
- 골든 셋이 빨간 건 **정상**이다 — `?golden=write` 재촬영. README 「골든 시드 스냅샷」 절의 **가드 `throw` 세 줄 + 백업 한 줄을 그대로** 쓴다(빈 파일 덮어쓰기 함정) · **BOM 없이** 쓴다.
- 재촬영 전후 diff 에서 **밸런스 이동을 요약해 둔다** — 쿨 시작 + 런 도중 레벨업 때문에 결과가 크게 바뀐다(예: 시드 5 스테이지 101 전멸 → 클리어). 병렬 세션의 `monster.csv` · `stage.csv` · `weapon_base.csv` · `item.js` 변경도 같이 섞여 들어간다는 점을 보고에 적는다.

### 2-5. 화면 확인 (헤드리스)

개발용 URL 은 [src/dev/README.md](src/dev/README.md) 표에서 확인한다. 최소:
- `index.html?dev=battle&runs=3` — 리포트 목록 · 판정 · 기여 표 영웅별 XP · 획득 줄 XP 합계
- `?dev=live&at=60` — 진행 중 런이 목록 맨 위 「진행 중」 · 배지 경과 시간 · 가방이 라운드마다 찬다
- `?dev=play` — 콘솔 오류 0 · `.main` 이 비지 않는다(비면 모듈 로드 실패 — 먼저 `node --check`)
- 가능하면 Playwright(메모리 `playwright-pointer-tests`)로 **철수 버튼 → 리포트로 이동 · 판정 철수** 를 눌러 본다

### 2-6. 문서 마무리

- `docs/client/DEV_PLAN.md` — R89 행 `🔧 진행 중` → `✅` + 근거에 `PASS n/n` · 골든 재촬영 / §3-1 67줄 정산 행의 `🔧 R89` → 완료 표기
- `src/dev/README.md` — `?dev=offline` 등 「출발 순간 정산」을 전제한 문구 · 캘리브레이션 표(재측정이 맞는지 판단)
- `docs/client/SCREEN_DESIGN.md §4-2` — 철수가 리포트로 간다는 문장이 있는지(문서 에이전트가 쓴 문장 확인)
- `docs/client/INTERFACE.md §5-5` — R89 골든 재촬영 메모
- `src/game_logic/README.md` · `src/ui/README.md` — **파일 역할이 바뀐 경우만**(battle.js 가 「한 번에 계산」 → 「라운드 스테퍼」라고 적혀 있으면 고친다)
- D6 「전투 시작 시 발동」 태그가 **열린 항목으로 어딘가(GAME_DESIGN §10 또는 battle_design / skill_design)에 적혀 있는지** 확인 — 없으면 한 줄 추가, **구현은 안 한다**
- 고친 문서 꼬리는 **날짜만** 교체 · 기획서에 절대 수치 금지

### 2-7. 보고 (한국어)

- 바꾼 것 · 검증 결과 **`PASS n/n` 원문 그대로** · 스킵한 것은 스킵했다고
- **밸런스 영향** — 스킬 쿨 시작 + 런 도중 레벨업으로 결과가 이동(골든 diff 요약)
- **열린 질문**(문서 에이전트가 남긴 틈):
  1. GAME_DESIGN §10 이 크기 상한(DEV_PLAN §7)을 넘었다
  2. DEV_PLAN §3-1 의 전투 행이 옛 서술로 남아 있다
  3. SCREEN_DESIGN 의 ADR 링크 라벨이 틀렸다(번호 · 제목 대조)
  4. 자동(반복) 원정의 정지 조건 — 진 라운드로 런이 끝났을 때 반복을 계속하나 멈추나가 문서에 명확하지 않다
  5. `src/dev/golden.json.bak` 처리

---

## 3. 지켜야 할 것

- **범위 확장 금지** — 위 목록 밖의 리네임 · 스키마 변경 · 다운스트림 패치 · 의미 변화가 필요해 보이면 멈추고 사용자에게 「이걸 하려면 X 도 바꿔야 하는데 OK?」
- `game_logic/` — DOM · `Date` · `Math.random` 참조 0 · 난수는 주입 rng
- 렌더러(`app.js` · `battle.js`)에 한국어 리터럴 금지 — 문구는 `i18n.js` ko/en 나란히
- `src/data/inherited/` · `src/assets/art/backgrounds/` 읽기 전용
- 파일은 CRLF · BOM 없음 (Edit 도구는 CRLF 를 보존함 — 확인됨) · PowerShell `Out-File utf8` 은 BOM 을 붙인다
- **git 커밋 · 푸시는 사용자가 요청할 때만**

---
*마지막 업데이트: 2026-09-14*
