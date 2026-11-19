# PLAN — 무한의 탑 (몬스터 층 사다리 1 ~ 50층) + 모든 결투에 도감

> 실행자용 계획서 (2026-11-19). 기획 확정은 끝났다 — [docs/game_design/endless_tower_design.md](docs/game_design/endless_tower_design.md) · GAME_DESIGN §9 11-19 두 행 · [arena_design.md](docs/game_design/arena_design.md) §0 「도감을 붙인다」. **기획을 바꾸지 말고** 아래 결정대로 코드 · 데이터 · 화면 · 문서를 끝까지 만든다.
> 짝 선례: 시련의 탑 R552(같은 날 · `trial_floor.csv` · `arena.js` `floors` · `app.js` `renderColosseum` · `colosseumRail` · ADR-1292) — 같은 깊이 · 같은 문법으로 만든다.

## 결정 (사용자 확정)

| # | 결정 |
|---|---|
| D1 | **무한의 탑 = 몬스터만 상대하는 층 사다리** · 시련의 탑(영웅 팀 상대)과 판 · 사다리 · 오르는 규칙이 같다(한 층씩 · 열린 가장 높은 층을 이기면 다음 층 · 깬 층 재도전 · 져도 잃는 것 없음 · 오른 층은 세이브) |
| D2 | **50층** · 한 층 = 새 표 `src/data/endless_floor.csv` 한 줄. 장마다 10층(1장 = 1–10층 … 5장 = 41–50층) · 스테이지마다 2층(스테이지 s = 장 안 2s−1 · 2s 층) · **홀수 층 = 정예 층**(그 스테이지 정예 라운드 편성 — 정예 1 + 일반 2) · **짝수 층 = 보스 층**(그 스테이지 보스 라운드 — 스테이지보스 + 일반 호위 · 5스테이지 = 챕터보스 + 정해진 정예 호위 둘 `spawn_rule.js:bossGuards`) |
| D3 | **모든 층 3마리** — 보스 층의 일반 호위 수 = 새 키 `balance.csv:endless_boss_escorts`(= 2 · 원정은 호위 수를 굴린다) · 호위 명단이 있는 보스는 명단 그대로 |
| D4 | **5스테이지 정예 층**(9 · 19 · 29 · 39 · 49층)은 5스테이지에 일반 몬스터 풀이 없다(`boss_only` 칸 하나) → **그 장 일반 몬스터 전체**(1–4스테이지 일반)에서 정예 · 일반을 뽑는다 |
| D5 | **상대 레벨 = 층 번호** · **1–30층 = 노말 규칙 · 31–50층 = 나이트메어 규칙**(`difficulty_tier.csv` 의 그 단 — 몬스터 데미지 · HP 배수 · 둘째 스킬 · 정예 특성 칸 · 착용 확률 · 영웅 원소 저항 페널티 · 장 디버프는 그 스테이지 · 그 단 것) |
| D6 | **같은 층 = 같은 무리** — 만남 시드 = `deriveSeed(balance.csv:endless_seed, 층)`(새 키 · 시련의 탑 `colosseum_seed` 와 같은 성격). 전투 rng 는 따로(판마다 달라도 된다 — 시련의 탑과 같다) |
| D7 | **전투 = 원정 규칙 그대로의 한 라운드 단판** — 도감(옵션 → 영웅 전투치 · 종족 사다리 → 몬스터 유닛 `codexOf`) · 장 디버프 · 몬스터 부류 버프 · 물약(편성 칸을 재고에서 채우되 **재고는 안 줄어든다**) · 파티 전술 · 편성 진형. 내 쪽 = 고른 Party 세 영웅(시련의 탑과 같은 고르개 · 출전 인원 3 / 3) · **영웅은 원정에서 빠지지 않는다**(세이브의 부대 · 런을 건드리지 않는다) |
| D8 | **보상 없음** — 경험치 · 골드 · 드롭 · 도감 처치 수 · 의뢰 진행 · 메인미션 진행 어느 것도 안 오른다. 결과로 바뀌는 세이브 값은 「오른 층」 하나 |
| D9 | **화면** — 새 탭 「무한의 탑」(en **Endless Tower** · zh 无尽之塔) · 기타 묶음에서 **시련의 탑 바로 앞** · 뼈대는 시련의 탑 그대로(왼쪽 레일 = 「n / N층」 + 10층씩 한 줄 사다리 · 줄 안 다섯씩 두 단 · 맨 위 = 높은 층 / 오른쪽 판 = 고르개 · 위 상대 · 아래 우리 팀 · 물약 · 전술 · [도전] · 지난 결과). 판 머리 = 「n층 · Lv.n · 정예 / 보스」 류(쉬운 말 · 명사구). **판 · 관전 배경 = 그 층 스테이지의 원정 배경**(스테이지 `bg` → 원정 배경을 고르는 기존 함수) |
| D10 | **상대 미리보기** — 판 위 상대 칸에 그 층의 세 마리를 원정 관전의 몬스터 카드와 같은 모양으로 세운다(정예 · 보스 표시 · 레벨 · 스킬 칸). 같은 층 = 같은 무리라 미리보기와 실제 판이 같다 |
| D11 | **도감은 모든 결투에 붙는다** — 시련의 탑 · 결투장(공격) · 친선전의 **내 팀** 스냅숏에 내 도감 옵션(`state` 의 `codexOptions` — 원정 `heroCombat` 과 같은 값)을 싣는다: `state.arenaLoadout` 이 `codex` 를 더 내고 `arena.snapshotTeam` 이 `hero.computeCombat` 의 셋째 인자로 쓴다(지금 `{}`). AI 팀 · 실험실 결투 팀은 도감 없음. **남이 올린 방어 편성(고스트)에는 싣지 않는다**(팀 코드 판 · 검사기 변경 = 사용자 확인 대기 — GAME_DESIGN §10 결투장 ⑩) |
| D12 | **탭 아이콘** — 다른 탭과 같은 방식으로 새 그림 이름에 걸어 둔다(파일은 메인 세션이 따로 Codex 로 그려 넣는다 — 실행자는 그림을 만들지 않는다). 그림이 없을 때 깨진 그림이 안 보이게 하는 기존 장치가 있으면 그대로 따른다 |

## 손댈 곳 (메인이 찾아 둔 자리 — 줄 번호는 다른 세션 편집으로 밀렸을 수 있다)

- **`src/game_logic/battle.js`**
  - `createRun(partyUnits, stageId, rng, level, potions, slotMax, encounter, difficulty, codexOf, potionHp, rules, encounterSeeds, enemyPotion)` — 「`rules.round`」 같은 입구 하나로 **그 스테이지의 한 라운드만** 돈다(라운드 수 1 · 스폰 종류 = 정예 / 보스 · 보스 호위 수 고정 · 풀이 비면 그 장 일반 풀). `encounterSeeds` 로 층 시드를 넘기면 만남이 고정된다(길이 = 라운드 수 = 1).
  - `spawnRound(seed, stage, pool, n, …)` — 종류는 `stageRounds(stage).find(r => r.round_num === n)` 로 정해지고 보스 호위는 `between(...draw.escorts)` 로 굴린다 · 정예 라운드 = `data.budgets.elite`(늘 정예 1 + 일반 2). 종류 · 호위 수를 바깥에서 줄 수 있게(줄 때만 — **안 주면 rng 소비 · 결과 불변**). 라운드 번호는 그 스테이지에서 그 종류의 라운드 번호를 써서 스테이지 편성 예외(`roundDraw`)가 그대로 먹게 한다(없으면 1)
  - `stagePool`(그 스테이지 일반) · `stageRounds` · `roundDraw`(정예 호위 명단 `guards`)
  - `onKill` — 결투(`encounter`)는 보상 없이 일찍 돌아간다. 무한의 탑은 **결과의 보상을 정산하지 않으면** 되므로 battle 쪽은 손대지 않아도 된다(부류 버프 같은 전투 효과는 그대로 돌아야 한다)
  - 미리보기(D10)용으로 「그 층의 적 유닛 뷰」를 전투 없이 내는 입구가 필요하면 둔다(rng 는 층 시드만)
- **`src/game_logic/state.js`**
  - `departRun` 이 파티 유닛을 세우는 길(`partyUnits(view, going, no, tactics, fixed)` · `fillSlots` · `limitsOf(state).potionSlots` · `codexLadder` · 단 · `BT.createRun`) — 무한의 탑 단판은 이 길을 빌려 **세이브를 안 바꾸고** 끝까지 돌린 결과를 낸다(`endlessFight(state, floor, rng, no?)` 같은 이름)
  - 시련의 탑의 `colosseumState` · `colosseumRecord` · 세이브 `colosseum: {cleared}` · 로드 정규화 — 같은 모양으로 `endless: {cleared}`(버전 안 올림 · 없으면 0 · 0 이상 정수 아니면 0)
  - `arenaLoadout(state, no)` — `codex: codexOptions(state)` 를 더한다(D11)
  - 층 표(`endless_floor.csv`) 검증 — 1 부터 빈틈없는 층 · 있는 `stage_id` · `round_type` ∈ {elite, boss} · 그 스테이지에 그 종류 라운드가 있거나(정예는 D4 대체 풀) · 레벨 1 ~ 만렙 · 있는 `difficulty_id` — 틀리면 생성 때 던진다
- **`src/game_logic/arena.js`** — `snapshotTeam` 의 `hero.computeCombat(h, gear.map(item.effective), {}, …)` → `loadout?.codex ?? {}` (D11)
- **`src/data/endless_floor.csv`** 신설 — 열: `floor, stage_id, round_type, monster_level, difficulty_id, description_kr`. 스테이지는 1–4스테이지 = 셋째 칸(`<장>0<s>3` — 정예 · 보스 라운드가 다 있는 `standard`) · 5스테이지 = `<장>051`. 값은 D2 · D5 그대로(⚠임시 표기) · **CRLF · BOM 없음**(다른 CSV 와 같게 — 먼저 `file` · 바이트로 확인)
- **`src/data/balance.csv`** — `endless_seed`(정수 · 시련의 탑 시드와 다른 값) · `endless_boss_escorts`(2) 두 키 · 설명 칸에 근거(사용자 · R 번호 · endless_tower_design §0)
- **`src/ui/data.js`** — `FILES` 끝에 `'endless_floor'` · 구조 분해 · `D.endlessFloors` · 시스템 조립
- **`src/ui/app.js`** — 탭 목록(`['etc', ['colosseum', 'arena', …]]` → 앞에 `endless`) · 탭 아이콘 · `renderColosseum` · `colosseumRail` · `CS_ROW_FLOORS` · `csRowArt` · `arenaStage` · `arenaWatchPage` · 개발 URL `?dev=colosseum` 블록(같은 모양으로 `?dev=endless&cleared=n&floor=n`). **사다리 레일은 시련의 탑 것을 층 목록 · 상태를 받는 함수로 묶어 같이 쓴다**(중복 금지 · 시련의 탑 모양이 바뀌면 안 된다)
- **`src/ui/i18n.js`** — 탭 이름 · 판 머리 · 도움말(시련의 탑 도움말 묶음 `help.colosseum.*` 의 모양을 따라 무한의 탑 몇 줄) · **「도감 보너스는 적용되지 않아 …」 문장(`help.colosseum.rules.body` ko · en · zh)을 도감이 붙는다로 고친다**. 렌더러에 한국어 리터럴 금지 · ko/en 필수 · zh 는 써도 되고 비워도 된다(LOCALIZATION_ZH 규칙)
- **`src/ui/style.css`** — 필요한 만큼만(레일은 시련의 탑 것을 그대로)
- **`src/dev/test.js`** — 아래 「단정」 · 새 balance 키는 `balance: 시스템이 쓰는 키가 전부 있다` 단정의 `need` 목록에

## 문서 (먼저 고친다 — 경계는 INTERFACE 먼저 · 화면은 SCREEN_DESIGN 먼저)

- **`docs/client/INTERFACE.md`** — battle(§2-6 `createRun` 의 `rules` 새 칸 · rng 소비 — 안 주면 불변) · state(새 함수 · `arenaLoadout` 의 `codex`) · arena §2-17(`snapshotTeam` 의 도감) · 세이브(`endless: {cleared}` 버전 무변경 줄) · rng 표(새 스트림이 생기면)
- **`docs/client/SCREEN_DESIGN.md`** §1 — 탭 표에 「무한의 탑」 행(시련의 탑 행 바로 위) · 탭 수 · 묶음 서술 · 도움말 주제 표(시련의 탑 행 근처) + **새 ADR**(번호는 쓰기 직전 `ls docs/client/adr | sort | tail` 로 확인 — **오늘 1291 이 두 세션에서 겹쳤다** · 쓴 뒤 보고 직전에 다시 확인) + `SCREEN_CHANGELOG.md` 한 줄(맨 앞) + `docs/client/adr/README.md` 색인이 자동으로 안 붙으면 한 줄
- **`docs/client/DEV_PLAN.md`** §3-3 — R 행 한 줄(번호는 쓰기 직전 `grep -oE "^\| R[0-9]+" … | sort | tail` · 확인 즉시 R 행부터 써서 잡는다 · 지금 마지막은 R552)
- **`src/data/README.md`** — `endless_floor.csv` 행 · **`src/dev/README.md`** — `?dev=endless` 행
- 고친 문서 꼬리 날짜 `*마지막 업데이트: 2026-11-19*`

## 단정 (`dev/test.js` — 실패는 `fail()` 로 던진다)

1. 층 표 — 50층 · 1 부터 빈틈없음 · 홀수 = elite · 짝수 = boss · 레벨 = 층 · 1–30 normal · 31–50 nightmare · 장 = ⌈층/10⌉ · 스테이지 = 장 안 ⌈k/2⌉ · 틀린 표는 던진다(빈 표 · 빠진 층 · 없는 stage_id)
2. 무리 — 모든 층 3마리 · 정예 층 = 정예 1 + 일반 2 · 보스 층 = 그 스테이지 보스(1–4 = stage_boss · 5 = chapter_boss) + 2 · 몬스터 레벨 = 층 · 같은 층 두 번 = 같은 무리(id · 등급 · 장비) · 5스테이지 정예 층의 몬스터는 그 장 일반 몬스터
3. 단 — 31층 무리에 나이트메어 배수가 들었다(같은 몬스터를 노말로 세운 것과 HP 비교 등)
4. 단판 — 결과가 끝난다(승 · 패 · 무) · **세이브가 안 바뀐다**(골드 · XP · 인벤 · 도감 처치 · 물약 재고 · 부대 상태를 깊은 비교) · `endlessRecord` 가 시련의 탑 `colosseumRecord` 단정과 같은 규칙(안 열린 층 · 0층 · 지고 오름 · 깬 층 재승리)
5. 세이브 왕복 · 옛 세이브(`endless` 없음 · 음수)
6. 도감 — 도감 옵션이 있는 세이브에서 `arenaLoadout(G).codex` 가 그 값이고, 그걸 넣은 `snapshotTeam` 의 전투치가 `{}` 로 세운 것과 다르다 · AI 층 팀(`rollFloorOpponent`)은 그대로
7. 원정 회귀 — 기존 단정 전부 그대로(특히 rng · 골든). `rules.round` 를 안 주는 경로는 한 글자도 안 바뀐다

## 검증

- 서버: **8777 은 사용자 것 — 끄지 않는다.** 빈 포트(예 8862)를 `Get-NetTCPConnection` 으로 확인하고 `Start-Process python -ArgumentList serve.py,8862 -WorkingDirectory <저장소>` 로 띄운다 · 끝나면 **그 PID 하나만** 끈다
- 단정: PowerShell 로 headless Edge `--dump-dom` (`src/dev/README.md` 「헤드리스」 절 · 프로필 폴더 매번 새로 · `--virtual-time-budget=60000`) → `<title>` 의 `PASS n/n` 원문. **지금 기준은 FAIL 936/938 — 실패 2 = 골든(작업 전부터 · 다른 세션 CSV 변경)** — 그 둘 말고 새 실패가 없어야 한다
- 화면: `index.html?dev=endless&cleared=n&lang=ko|en` 스크린숏(`--window-size=1600,900 --hide-scrollbars`) — 1층(정예) · 10층(챕터보스) · 31층(나이트메어) 미리보기 · [도전] 뒤 관전 한 장(스크린숏으로 안 되면 DOM 에 결과 줄이 섰는지) · 시련의 탑이 그대로인지 한 장
- 산출물(스크린숏 · 덤프)은 `output/2026-11-19_endless_tower/` 에

## 작업 규칙 (CLAUDE.md 「작업 규칙」 요약 — 원문을 먼저 읽는다)

- **병렬 세션이 같은 파일(app.js · i18n.js · style.css · SCREEN_DESIGN · DEV_PLAN · test.js)을 지금 고치고 있다** — 고치기 직전에 그 자리를 다시 읽고, **정확한 old 문자열 매칭(Edit)으로만** 고친다. 파일 통째 쓰기 · 되돌리기 · `git checkout` 금지. 내가 안 만진 변경은 건드리지 않는다
- 파이썬으로 문서를 고칠 땐 한국어가 든 스크립트를 stdin heredoc 으로 넘기지 말고 **파일로 써서** `python -X utf8 -c "exec(open(r'…', encoding='utf-8').read())"` 로 돌린다 · CRLF 보존 · 백슬래시 이스케이프는 도구 호출에서 축약되니 `chr(13)` · `chr(10)` · `chr(92)` 를 쓴다
- 렌더러 한국어 리터럴 금지 · 숫자 리터럴은 CSV(화면 묶음 상수는 선례 `CS_ROW_FLOORS` 처럼 주석으로 「CSV 가 아니다」) · `game_logic` 은 DOM 을 모른다 · `Math.random` 금지
- UI 문구는 사람 말투 · 명사구 · 툴팁엔 효과만(규칙 설명은 도움말)
- **커밋 · 푸시 금지**
- 클래스 이름 겹침 주의 — `.cs-row` 는 캐릭터 탭 능력치 줄 것이다(오늘 한 번 겹쳤다). 새 클래스는 `grep` 으로 먼저 확인

## 보고 (한국어 · 메인 세션이 diff 를 검수한다)

바꾼 파일 목록 · 계약 변경(INTERFACE 절) · 새 balance 키 · `PASS n/n` 원문 · 스크린숏 경로 · 만든 R 번호 · ADR 번호 · 스킵한 것 · 막힌 것 · 내가 판단으로 정한 것(쉬운 말로)

*작성 2026-11-19*
