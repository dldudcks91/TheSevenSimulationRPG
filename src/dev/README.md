# src/dev — 검증

브라우저가 유일한 JS 런타임이다(빌드 없음, node 없음). 단정과 캘리브레이션은 전부 `test.html` 에서 돈다. 약속 검사용 대량 실행은 `sim.html` (아래 「대량 실행」).

## 검증 방법

1. `start.bat` (로컬 http 서버 = `serve.py` — ES Modules 는 `file://` 에서 CORS 로 막힌다).
   `serve.py` 는 `http.server` + **`Cache-Control: no-store`** 다 — 아트를 같은 파일명으로 갈아끼웠을 때 브라우저가 옛 그림을 캐시로 계속 쓰던 문제 (2026-09-05). 헤드리스 검증이 `--disk-cache-size=1` 을 주는 것과 같은 목적
2. `http://localhost:8777/dev/test.html` — game_logic 단정 + 밸런스 캘리브레이션 표
   - 실패 사유는 `fail()` 로 **던진다**. 문자열 반환은 통과로 집계되므로 쓰지 않는다

## 골든 시드 스냅샷 (`golden.js` · `golden.json`)

**Phase 2 엔진 이식 검증의 실제 도구다** — 같은 시드로 같은 지문이 나오면 이식이 성공한 것이다.
시드 1~10 × 스테이지 101~105 = **50 런**의 요약 지문 + **입력 지문**(CSV 해시 · `balance` 전 키 · 시작 파티)을
`golden.json` 에 박아 두고 `test.html` 이 매번 대조한다. 계약(무엇을 고정하는가·필드의 뜻)은 [INTERFACE §5-5](../../docs/client/INTERFACE.md).

- 타임라인 전체가 아니라 **요약**을 고정한다 — 해시는 "달라졌다"만 알려 주고 **어디가** 깨졌는지는 못 읽는다. 지금은 `[seed 2 stage 101] events: 1168 → 836` 처럼 런·필드 단위로 찍힌다
- 드롭은 **접사 stat·값·순서까지** 적는다. `rollAffixes` 가 풀에서 뽑는 순서 변화는 여기서만 잡힌다

### 단정 4개 — **입력 → 출력 순서로 읽는다**

| # | 단정 | 무엇을 잡나 |
|---|---|---|
| ① | `meta.csvHash` — CSV **32종** 원문 해시 [정정 2026-09-08 — 24 → 27 · `commission_kind`·`commission`·`hero_tier` · 2026-09-09 **`search_story`** 로 28] | 어느 **파일**이 달라졌는지. "`monster.csv` 가 달라졌다"가 즉시 나온다. 코드가 안 읽는 컬럼(설명문)까지 걸린다 |
| ② | `meta.balance` — `balance.csv` **전 키** [정정 2026-09-09 — 「109키」로 적혀 있었으나 실제로는 그때 이미 그보다 많았다. **수를 적지 않는다** — 키가 늘고 주는 것이 일상이라 이 숫자는 언제나 낡는다. 2026-09-09 처치 가루 폐지로 `dust_elite`·`dust_boss` 2키가 빠졌다(R63)] (2026-09-02 전술 등급 가중치 3키로 107 → 110 · 2026-09-03 `injury_minutes` 폐기로 110 → 109 · **2026-09-08 `hp_regen_base_per_level` 신설 + `hero_attr_total` 폐기로 109 유지** — 수가 같아 눈에 안 띄니 키 이름으로 읽을 것) | `키: 옛값 → 새값` 을 최대 8개. 손잡이 5키는 **통과 메시지의 문구일 뿐**이다 |
| ③ | `meta.parties` — 시드 10개의 시작 파티 | 영웅 생성 굴림(이름·죄종·직업·특성·능력치 — ~~히든 상한~~ 은 2026-09-07 폐지)과 시작 장비. `hero_name.csv`·`hero_trait.csv` 행 순서는 여기서만 잡힌다 |
| ④ | `runs` — 50런 지문 | 전투 결과 + `grew`(정산 후 성장) · `kills` · `casts` · `elites` · `tactics` · `drops` |

> **순서가 규칙이다.** ①②가 빨간불이면 ④의 불일치는 원인이 아니라 **증상**이다 — 입력이 달라졌는데 출력만 보고 회귀를 찾으면 시간을 버린다. 그래서 화면에도 이 순서로 찍는다.
> ①②③은 **전투를 한 번도 안 돌린다.** ④가 던져도(어느 런이 예외를 내도) 위 셋의 결과와 **나머지 단정 전부**가 화면에 남는다 — 지문 생성이 최상위에서 돌던 판(08-31 최초)은 DOM 이 1.4KB 로 죽어 140 단정 결과가 통째로 사라졌고, README 아래의 「0바이트 = 무한 루프」 증상과 구분도 안 됐다.

### 다시 찍는 법

**손잡이·공식·CSV 를 의도적으로 바꿨을 때만** 다시 찍는다. 그게 아닌데 깨졌으면 그건 회귀다 — 지문을 갈아 끼워 덮지 말 것.

> ⚠ **정규식이 매치에 실패하면 예외가 아니라 빈 문자열을 준다** — 가드 없이 쓰면 `golden.json` 이 **빈 파일로 덮어써진다.** 아래 절차의 `throw` 세 줄과 백업 한 줄이 그것을 막는다. `?golden=write` 없이 덤프하면 `<pre id="golden">` 자체가 없으므로 이 함정을 반드시 밟는다.

1. 덤프 — **URL 에 `?golden=write` 가 들어가야 한다.** 프로필 폴더는 매번 새로 (CSV 캐시 방지) · `--headless=new` (구 모드는 0바이트) · **PowerShell 도구로** (git-bash 에서는 즉시 반환한다)
```powershell
$root="C:\...\TheSevenSimulationRPG"; $json="$root\src\dev\golden.json"; $dom="$env:TEMP\golden_dom.html"
$edge="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"; $prof="$env:TEMP\edgeprof_g"; if (Test-Path $prof) { Remove-Item -Recurse -Force $prof }
Start-Process $edge -ArgumentList @('--headless=new','--disable-gpu','--no-first-run',"--user-data-dir=$prof",'--disk-cache-size=1','--virtual-time-budget=60000','--dump-dom','http://localhost:8777/dev/test.html?golden=write') -RedirectStandardOutput $dom -Wait -NoNewWindow
```
2. 추출 — **가드 먼저.** `<pre id="golden">` 은 지문 생성이 던지면 비어 있다(빈 지문을 저장하면 안 된다)
```powershell
$h = Get-Content $dom -Raw -Encoding UTF8
if ($null -eq $h -or $h.Length -lt 1000) { throw '덤프가 비었다 — 단정이 멈췄는지 확인 (아래 0바이트 주석)' }
$m = [regex]::Match($h, '(?s)<pre id="golden">(.*?)</pre>')
if (-not $m.Success) { throw '<pre id="golden"> 이 없다 — URL 에 ?golden=write 를 붙였는지 확인' }
$body = $m.Groups[1].Value -replace '&lt;','<' -replace '&gt;','>' -replace '&amp;','&'
if ($body.Trim().Length -lt 1000) { throw '지문이 비었다 — 골든 생성이 던졌다. test.html 의 골든 단정 메시지를 먼저 읽어라' }
```
3. **백업 후** 저장. **BOM 없이 UTF-8** — PowerShell 의 `Out-File -Encoding utf8` 은 BOM 을 붙이므로 쓰지 않는다
```powershell
if (Test-Path $json) { Copy-Item $json ($json + '.bak') -Force }
[System.IO.File]::WriteAllText($json, $body, (New-Object System.Text.UTF8Encoding($false)))
$b = [System.IO.File]::ReadAllBytes($json); "$($b.Length) bytes · first3 = $($b[0..2] -join ' ')"   # 239 187 191 이면 BOM 오염
```
4. `test.html` 을 다시 돌려 PASS 를 확인하고, **일부러 깨뜨려 본다.** 통과만 하고 아무것도 안 잡는 단정은 없느니만 못하다. CSV 임시 수정은 **Edit 도구로**(PowerShell 리다이렉트는 BOM 을 붙인다) 하고 **반드시 되돌린다**:

| 바꿀 것 | 잡아야 하는 단정 | 나와야 하는 말 |
|---|---|---|
| `balance.csv:attr_growth_chance_pct` 35→0 | ④ `grew` | `grew: L12/A224/M9 → L12/A210/M9` (①② 도 함께 켜진다) |
| `hero_name.csv` 행 역순 | ③ `meta.parties` | `[seed 1] 영웅 0: …\|Delphine\|… → …\|Ursula\|…` · **④는 안 켜진다**(이름은 전투에 안 들어간다 — 그래서 ③이 필요하다) |
| `balance.csv:def_curve_k` 100→150 | ② + ④ | `def_curve_k: 100 → 150` · `40/40 런 불일치` |
| `monster.csv` 설명문 한 글자 | ① `meta.csvHash` | `monster: 59940b40 → 25b11e2d` · **①만 켜진다**(게임이 안 바뀌는 변경이라 다른 그물은 원리상 못 잡는다) |

5. INTERFACE §5-5 · DEV_PLAN §3-1 을 같이 고친다

### 그래도 못 잡는 것 (2026-08-31 — 정직하게)

지문이 통과한다고 `game_logic` 전체가 맞다는 뜻이 **아니다.** 40런이 지나가지 않는 코드 경로는 아무것도 보장하지 않는다:

- **선술집** — `rollCandidates` 0회 · `tavernReroll` 0회. 명단 굴림은 시작 파티와 같은 함수지만 **시드 스트림(`^ 0x5A17`)이 다르고** `hired` 규칙은 전혀 안 밟힌다
- **수색** [2026-09-09] — `searchRoll` 0회 · `searchMeetingOf` 0회. 스트림 `^ 0x5EA7`(결과)도 `^ 0x11EE`(만남)도 40런이 한 번도 안 밟는다. 매력 → 레어 확률 · 죄종 메아리 · 이야기 굴림은 전부 `dev/test.js` 의 `search:` 단정이 유일한 그물이다
- **직업 풀의 뒷자리 스킬** [개정 2026-09-09 · R59] — 배정은 **고유 + 무기 둘**이고 둘 다 그 직업 풀에서 **굴린 것**이라, 풀이 5~7행인 직업은 뒷자리 스킬이 40런에 한 번도 안 나갈 수 있다(전직 칸은 아예 빈다 · R52). 버프·회복·도발의 **실행**은 `clsUnits` 로 킷을 손으로 실은 단정만 본다 — 40런에도 캘리브레이션에도 없다
- **`barrier_pct`** [2026-09-09] — 기사 「수호의 방벽」이 직업 풀 8 에서 빠져 **이 효과를 쓰는 행이 하나도 없다.** 전투로는 그 코드에 못 닿으므로 `runtime:` 단위 단정이 유일한 그물이다
- **전술 리롤** — `rerollTactic` 0회. `tactics` 필드는 **첫 배정**(`initialAssign`)만 보고 첫 배정은 언제나 `common` 이라, **골든에 매직·레어가 한 번도 안 나온다**(등급 굴림은 `dev/test.js` 의 단정이 본다 — 2026-09-02). `TC.pick` 의 「든 가족 제외」 규칙도 골든 밖이다
- **`chapter_boss`** — 표본 1 (스테이지 105 뿐 — 보스 단독 1라운드 · 2026-09-11). `boss_guaranteed_drop` · `dust_boss` 의 보스 분기는 한 종류만 지난다
- **`inventory_cap` 넘침** — 0회. 런당 드롭이 3 안팎이라 `discarded` 경로가 안 열린다
- **마스터리 랭크 > 0** — 0회. 시작 파티는 포인트를 쓴 적이 없어 `masteryBonus` 는 항상 빈 값이다 (`grew` 는 포인트 **합**만 본다)
- **세이브 왕복 · 이관** — 골든은 `serialize`/`deserialize` 를 안 지난다 (그쪽은 별도 단정이 본다)
- **레벨 상한 근처** — 40런의 최고 레벨이 4 대역이라 `hero_level_cap` 분기는 CSV 를 바꿔야만 밟힌다
- **csvHash 는 이식 계약이 아니다** — 개발 중 "CSV 가 바뀌었나"에만 답한다. 개행은 `\n` 으로 정규화하고 BOM 을 떼고 세므로(파서가 둘 다 무시하니까) **줄바꿈 차이로는 안 켜진다**

## 개발용 URL (`src/index.html`)

흐름을 헤드리스 스크린샷으로 태울 때 쓴다.

| URL | 상태 |
|---|---|
| `?dev=newgame` | 새 게임 시작 화면 |
| `?dev=battle` | 즉시 정산 → 리포트 — **`&runs=n` 이면 n번 연달아 돌려 런 목록을 쌓는다**(SCREEN_DESIGN §4-3 왼쪽 열 · 상한 [balance.csv:report_keep] · 2026-09-09). 줄이 하나면 「고른다」는 결정 자체가 화면에 없다 · **`&live=1` 이면 끝난 런 위에 원정을 하나 더 띄운 채 리포트**(2026-09-15 · ADR-0123 — 도는 원정의 줄이 목록에 안 서는지 본다 · 옛 `?dev=live` 자리) |
| `?dev=play` | 관전 — `&bt=log|dmg` 면 **그 판을 고른 채**(보이는 것은 나눔 배치뿐 · ADR-0130), `&lay=split` 이면 **나눔 배치** (2026-09-03) · **`&logf=party|enemy` 면 로그를 그 주체로 거른 채**(2026-09-15 · ADR-0131) · **`&tab=<탭>` 이면 관전을 켠 채 그 탭**(2026-09-08 — 런이 도는 동안의 다른 탭 화면. 예: 영웅 띠의 「원정 중」 라벨) · **`&rep=1` 이면 반복 원정을 켠 채**(2026-09-10 — 반복은 전진 패널 토글로만 켜져서 「런이 끝나면 다음 런이 선다」에 못 닿았다 · ADR-0074) · **`&tip=e` 면 첫 적 카드 · `&tip=p` 면 첫 영웅 카드의 툴팁이 뜬 채**(2026-09-14 — 유닛 툴팁은 hover 로만 뜬다 · SCREEN_DESIGN §2 「유닛 툴팁 규격」) · **`&alt=1` 을 더하면 Alt 를 누른 채**(오른쪽 세부 옵션 열) · **`&stage=<id>` 면 그 스테이지**(앞 스테이지를 클리어 처리하고 보낸다 · 2026-09-15 — 오오라를 든 몬스터는 2장부터라 첫 스테이지로는 못 본다 · ADR-0127) |
| `?dev=search` | 선술집 — 수색 (`&s=out` 갓 보냄 · `&s=mid` 절반·**만남** · 기본 완료 · `&key=1` 소문에 맞는 죄종을 보냄 → 열쇠 답 · `&ans=n` n번째 답을 미리 고름) |
| `?dev=offline` | 반복 켠 채 껐다 켠 상황 — 재접속 알림 배너(반복이 꺼졌다). ⚠ 끝난 런 위에서 끄므로 **진행 중이던 원정이 끊긴 경우**(`closed` · R89)는 이 경로로 안 닿는다 |
| `?dev=form` | 편성 패널이 열린 화면 (지역을 고른 상태). **파티는 비어 있다** — 새 게임의 기본 상태다(2026-09-09). `&party=full` 이면 로스터 순서로 채운다(파티 테두리·리더 표시 확인용). `&stage=<id>` 면 그 스테이지의 패널을 연다(챕터도 같이 옮긴다 · 2026-09-10 — 해금 전 후반 스테이지는 클릭이 거절돼 못 닿았다) · `&lvl=n` 이면 그 스테이지를 **위험도 n 으로 올린** 창(상한이 n 에 닿을 때까지 앞 스테이지를 클리어 처리 · 2026-09-14 — 조절 버튼은 클리어 기록이 있어야 살아난다) |
| `?dev=prologue` | 프롤로그 (SCREEN_DESIGN §3-1) — `&s=n` 이면 n번째 씬. 마지막 씬(5)만 인용·챕터 줄이 선다 (2026-09-03) |
| `?dev=tree` | **스킬 창이 열린** 캐릭터 탭 — 창은 버튼으로만 열린다. 영웅 0 에게 포인트 [balance.csv:mastery_t1_max_rank] 를 주고 **한 칸을 미리 찍어 둔다** (2026-09-08) — 새 게임은 포인트가 0 이라 창의 결정 둘(찍기 · **우클릭 되돌리기**)에 못 닿았다 |
| `?dev=tactics` | 연구 탭의 **파티 전술 탭** — 전술 칸이 **전부 열린** 상태 (칸은 합산 레벨로만 열려 클릭으로 못 만든다) |
| `?dev=tip` | **아이템 툴팁이 떠 있는** 캐릭터 탭 (2026-09-10) — 툴팁은 hover 로만 뜬다. 한 런을 정산해 **주운 것을 다 입히고** 한 번 더 정산해 **가방에 비교 상대가 있는 물건**을 남긴다(새 게임은 몸에 무기 하나뿐이라 비교 두 장에 못 닿는다). `&i=n` 이면 n번째 찬 칸(기본 1 — 가방에 무엇이 떨어질지는 시드가 정하므로 무기 칸을 골라 잡는 유일한 길) · `&t=doll` 이면 페이퍼돌 칸(한 장) · `&t=skill` 이면 액티브 카드의 **스킬 설명창**(`&i=n` 이 n번째 칸 · ADR-0118) |
| `?dev=cloud` | **계정 창**이 열린 화면 (SCREEN_DESIGN §2-1) — 가짜 계정이 붙고 네트워크를 안 탄다. `&c=pick` 이면 **선택 창**(클라우드 쪽은 가짜 사본) · `&c=frozen` 이면 **멈춤 창**. 셋 다 로그인 · 다른 탭 · 다른 기기로만 닿는 화면이다 |
| `?dev=mats` | **제작 재료를 쥔 강화 탭(제련소)** (2026-09-15 · R96 · SCREEN_DESIGN §8-2) — 광석 · 목재는 파견이 채우는데 파견이 아직 없어 제작 칸의 [만들기]가 늘 잠긴다. 모든 레벨대의 광석 · 목재와 가루를 **레시피 표(`make_recipe.csv`)가 정한 양으로** — 부위 전부를 레벨대마다 한 번씩 만들 만큼 — 채운다 |
| `?screen=start` | 시작 화면 |
| `?flash=<i18n 키>` | **플래시가 떠 있는 화면** (SCREEN_DESIGN §2 · ADR-0113) — `?dev=` · `?tab=` 에 겹쳐 쓴다(예: `?dev=newgame&tab=tavern&flash=tv.hired` · 창 위는 `?dev=tree&flash=sk.err.points`). `{name}` 에는 로스터 첫 영웅. 기본은 멈춰 선다(스크린샷) · `&hold=0` 이면 제 시간에 사라진다(덤프로 확인) · ⚠ `?dev=play` 는 `&tab=` 을 줄 때만 닿는다 |
| `?tab=<탭>` | 탭 바로 열기 — **탭 10** (2026-09-08): `expedition` · `character` · `forge`(강화) · `tavern` · `shop`(상점) · `resource`(자원) · `explore`(탐험) · `research` · `codex` · `help`. ⚠ 옛 이름 둘은 **죽었다**(무시하고 원정으로 연다) — `town`(09-04 자원·탐험으로 갈림) · `imagedex`(09-08 도감에 흡수 — SCREEN_DESIGN §9). 세이브가 없으면 `?dev=newgame&tab=forge` 처럼 겹쳐 쓴다. ⚠ `?dev=forge` · `?dev=trade` 는 **삭제**됐다 — 강화·상점이 탭이 되어 `?tab=` 이 바로 닿는다. **`&fg=make\|up\|craft`** 는 제련소의 작업 탭을 고른 채 연다 (2026-09-15 · ADR-0142) · **`&rs=research\|tactics`** 는 연구 탭의 위쪽 탭을 고른 채 연다 (2026-09-15 · ADR-0145) · **`&rsl=col\|row`** 는 연구의 배치(세로 · 가로)를 고른 채 연다 (2026-09-15 · ⚠ 비교용 — 하나로 정해지면 걷는다) |
| `?cx=monster\|character\|item\|skill` | 도감의 세그먼트 (SCREEN_DESIGN §9 · §9-1) — `?tab=codex&cx=skill` 처럼 겹쳐 쓴다. 기본값 `monster`. ⚠ 옛 이름 `?ix=character\|item` 은 09-08 에 이미지 도감 탭과 함께 죽었다 |
| `?face=<스타일>` | 몬스터 얼굴 아트 스타일 교체 — `src/assets/art/faces/<스타일>/`. 목록은 `ui/mock.js:FACE_STYLES` · localStorage 에 남는다 |
| `?bg=<스타일>` | **스테이지 배경 아트 스타일 교체** [2026-09-16] — `src/assets/art/backgrounds/<스타일>/`. 목록은 `ui/mock.js:BG_STYLES`(**`illustrate` 정식** · `pixel` 비교용 · ADR-0152) · `?face=` 와 같이 localStorage 에 남는다. ⚠ 그 스타일에 그림이 없는 스테이지는 그라디언트로 떨어진다(두 스타일 다 챕터 1~3 뿐) · **거점 배경 · 탐험 지도는 스타일을 안 탄다** |

헤드리스 (Edge) — 스크린샷:
```
msedge --headless=new --screenshot=<out.png> --virtual-time-budget=8000 <URL>
```

헤드리스 — **DOM 을 읽어 단정 결과·표를 그대로 가져오기.** 반드시 PowerShell 도구로 돌린다(git-bash 에서는 `msedge` 가 즉시 반환하고 출력이 0바이트다):
```powershell
$edge="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"; $prof="$env:TEMP\edgeprof"; if (Test-Path $prof) { Remove-Item -Recurse -Force $prof }
Start-Process $edge -ArgumentList @('--headless=new','--disable-gpu','--no-first-run',"--user-data-dir=$prof",'--disk-cache-size=1','--virtual-time-budget=20000','--dump-dom','http://127.0.0.1:8777/dev/test.html') -RedirectStandardOutput "$env:TEMP\dom.html" -Wait -NoNewWindow
$h = Get-Content "$env:TEMP\dom.html" -Raw -Encoding UTF8; if ($h -match '<title>(.*?)</title>') { $Matches[1] }    # → "PASS n/n"
[regex]::Matches($h, '<li class="fail">(.*?)</li>') | % { $_.Groups[1].Value -replace '<[^>]+>',' ' }                 # 실패 목록
```
같은 방법으로 `index.html?dev=battle&lang=ko` 를 덤프해 `class="report-head"` 가 있는지 보면 렌더 예외까지 잡힌다(예외가 나면 비어 있다).

> **덤프가 0바이트면 페이지가 아니라 단정이 멈춘 것이다** (2026-08-30) — `--dump-dom` 은 가상 시간이 다 흘러야 찍는데, 단정 안에서 무한 루프가 돌면 그 시간이 오지 않아 **아무것도 안 나온다**(오류 메시지도 없다). 같은 URL 을 `--screenshot` 으로 찍으면 그때까지 그려진 화면이 남으므로 **어느 단정에서 멈췄는지가 보인다**. `index.html` 덤프는 되는데 `test.html` 만 0바이트면 이 경우를 먼저 의심한다.

## 대량 실행 (`sim.html`) — `qa` 기획 모드

시드를 바꿔 같은 조건을 여러 번 돌리고 **분포**를 찍는다. `test.html` 의 캘리브레이션 표는 손잡이 조정용 **고정 표**라 서로 대체하지 않는다 — `test.js` 에 넣지 않은 이유는 모든 세션의 검증이 그만큼 느려져서다. 절차는 [qa 스킬](../../.claude/skills/qa/SKILL.md) 기획 모드.

| URL (`dev/sim.html?…`) | 하는 일 |
|---|---|
| `mode=stage&seeds=1-100&stages=101,102&strip=0` | 시드마다 새 게임(캘리브레이션 · 골든과 **같은 시작 파티** — 시드 1000+n) · 앞 스테이지 해금만 · 그 스테이지 한 판. `strip=1` 이면 출발 전에 파티 장비를 전부 벗긴다 |
| `mode=campaign&seeds=1-40&runs=40&bot=greedy` | 시드마다 게임 하나로 원정을 `runs` 번 잇는다 — 매번 아직 못 깬 첫 스테이지. `bot=greedy` 는 판마다 장착 · `off` 는 안 낀다. 둘 다 남은 가방은 분해한다 |

- `seeds` 는 `1-50` · `3,7,9` · `1-5,9`. 요약은 **시드 앞 절반 / 뒤 절반을 따로** 낸다 — 두 구간이 같은 방향일 때만 결론으로 쓴다(아래 「마지막 측정」의 시드 20 흔들림)
- 읽기 — 위 DOM 덤프 명령에서 URL 만 바꾼다. `<title>` 이 `SIM ok <mode> <행 수>` 면 성공 · `SIM FAIL` 이면 `<pre id="err">` 에 스택. `<pre id="sim">` 이 JSON `{meta, summary, rows}` 다 — `meta.bot` · `meta.assume` 이 봇 규칙과 가정(**결과의 한계**)이고, HTML 엔티티(`&lt;` 등)를 풀고 읽는다
- ⚠ 봇은 `sim.js` 에만 산다 — `game_logic/` 에 넣으면 「자동 장착」이 게임 기능처럼 굳는다. 규칙을 바꾸면 `BOT` 글도 같이 고친다
- **도구 검증** — `sim.js` 를 고쳤으면 `mode=stage&seeds=1-20&stages=101,102,103,104,105` 의 승수 · 전투불능 · 골드 · 드롭 · 시간 초과가 `test.html` 캘리브레이션 표와 **같아야 한다**(같은 시작 파티 · 같은 조건 — 2026-09-15 전 칸 일치)

### 기획 모드 판정 (마지막 실행 — 덮어쓴다)

약속별 한 줄 — 번호는 [qa/metrics.md](../../.claude/skills/qa/metrics.md). 옛 판정은 남기지 않는다(git).
**2026-09-15** · `507e57e` + 미커밋 작업분 · 시작 파티(시드 1000+n) · 봇 규칙 · 가정은 결과 JSON `meta`

| 약속 | 판정 | 핵심 수치 | 다시 돌리는 주소 (`dev/sim.html?…`) |
|---|---|---|---|
| M1 장비 = 세기 | 지켜짐 · ⚠ GAME_DESIGN §1 · battle_design §8 이 폐기된 「장비 0 이면 0」을 인용 | 101 벗김 피해 935 → 359 · 넘긴 라운드 6.06 → 2.18 · 승률 18% → 0% (두 구간 같은 방향 · 벗긴 쪽이 더 센 시드 0/100) | `mode=stage&seeds=1-100&stages=101,102&strip=0` 과 `strip=1` |
| M2 조합 쏠림 | 판정 불가(목표치 없음) | 101 전사 든 판 승률 25 · 30% / 없는 판 0 · 11% · 궁수 든 판 7 · 11% / 없는 판 30 · 32% (앞 · 뒤 절반) · 103 도 같은 방향 | `mode=stage&seeds=1-100&stages=101,102,103` |
| M4 장비가 진행을 민다 | 지켜짐 | 40판 뒤 도달 스테이지 8.65 vs 3.58 · 같은 시드 39 앞섬 / 0 뒤짐 | `mode=campaign&seeds=1-40&runs=40&bot=greedy` 와 `bot=off` |
| M6 인과 읽힘 | 의견 | 리포트에 라운드 4/9 · 전원 전투불능 · 영웅별 가한 · 받은 피해는 있고 무엇에 무너졌는지는 없다 | `index.html?dev=battle&lang=ko` |
| M3 드롭 유의미 | 판정 불가(목표치 없음) | 장착으로 이어진 드롭 63.5% (절반 63.2 · 63.8%) · 버림 0 | `mode=campaign&seeds=1-40&runs=40&bot=greedy` |
| M5 수직의 끝 | 판정 불가(끝에 못 닿음) | 도달 곡선 10판 1.98 → 20판 4.1 → 30판 6.58 → 40판 8.65 | 위와 같음 |

## 밸런스 손잡이 (`src/data/balance.csv`)

> **`balance.csv:knob = 1` 이 손잡이의 SSOT 다** (**89키** — 2026-09-15 재집계 · R103 으로 `potion_*` 3키가 들어왔고 R95 로 `equip_upgrade_option_pct` 가 빠졌다 · 옛 77키(2026-09-09 — 수색 손잡이 8키 `tavern_search_*` 가 들어왔다)는 그사이 뒤처져 있었다. ⚠ 이 수는 잘 낡으므로 세야 하면 CSV 를 센다. 옛 표기 ~~53키~~ — 2026-09-08 `hp_regen_base_per_level` 이 들어왔다 · 2026-09-02 전술 등급 가중치 3키. ⚠ 이 줄이 적던 48키는 09-01 `skill_cd_floor_mult` 가 들어온 뒤로 하나 뒤처져 있었다). 손잡이인지 아닌지를 사람 기억이 아니라 컬럼이 들고 있어야 캘리브레이션이 재현된다.
> 아래 표는 그중 **전투 대역을 직접 미는 15키**를 이름으로 적은 것이고, 나머지는 **마스터리 랭크당 값 29**(`mastery_*`, 08-28)와 **강화 4**(`equip_upgrade_*`, 08-31)다 — 08-28 에 손잡이로 들어왔다. 랭크가 0 이면 기여가 0 이라 지금 캘리브레이션 표는 안 움직이지만, 찍은 파티를 재려면 그것도 손잡이다.

| 키 | 역할 |
|---|---|
| `power_growth_per_level` | **성장 SSOT** — 레벨/ilvl 1당 곱. 무기 공격력 · 영웅 최대 HP · growth 접사가 전부 이 하나를 탄다. 건드리면 전 구간이 함께 움직인다 |
| `def_curve_k` | 감쇠 곡선 `D/(D+K)` 의 **상수**. 뜻은 "감쇠가 정확히 50% 가 되는 방어값" — 공격자 레벨과 무관하다 |
| `hit_base_pct` · `hit_per_level_deficit_pct` · `hit_min_pct` | 적중률 = `clamp(base − 부족레벨 × per_level, min, base)`. 언더레벨 게이트의 세기 — 세 값이 "몇 레벨 모자라면 몇 % 맞는가"를 정한다 |
| `res_cap_base` · `res_cap_absolute` | 원소 저항 상한(직접 %) · 최대 저항 증가로도 못 넘는 절대 상한 |
| `monster_hp_scale` | 라운드 소요의 주 손잡이 (`round_budget.time_target_sec` 대조) |
| `monster_atk_scale` | **생존의 주 손잡이** — `hero_hp_base` 와 짝이다. 9라운드 내내 회복 수단이 없으므로 이 값이 승률을 거의 혼자 정한다 |
| `monster_def_scale` | 몬스터 물리 방어 배율 (저항은 직접 %라 배율을 받지 않는다) |
| `weapon_atk_base` · `hero_hp_base` | 무기 피해 범위의 가운데(R90 — 양끝은 무기군 폭) · 레벨 1 최대 HP |
| `xp_rate` · `gold_rate` | 보상 배율 |
| `potion_slot_max` · `potion_use_hp_pct` · `potion_cooldown_sec` | **물약**(R103) — 스테이지(런)당 칸 수 · 마시는 HP 비율 · 영웅별 쿨. `monster_atk_scale` 과 **같은 자리에서 생존을 민다** — 값은 사용자 지정 임시값이다 |

- 값을 바꾸면 **test.html 표를 다시 찍는다**
- 헤드리스로 표를 찍을 땐 **브라우저 캐시를 끈다** — 프로필 폴더를 지우고 `--disk-cache-size=1`. 안 그러면 CSV 가 캐시돼 손잡이를 돌려도 같은 표가 나온다

### 마지막 측정 (2026-09-15 — **칸 하나에 물약 하나(R104)** · 손잡이 미조정 · 시드 20 · Lv1 시작 파티 · 일반 무기 + 일반 갑옷 · 액티브 = **고유 + 무기 둘** · **새 게임은 마이너 힐링 포션 한 칸**)

> **손잡이는 안 돌렸다 — 물약 규칙이 표를 움직였다** (DEV_PLAN R104). 물약 칸은 `[balance.csv:potion_slot_max]` 개이고 **가진 물약 하나가 칸 하나**다 — 새 게임은 마이너 한 칸이라 스테이지(런)마다 **한 병**만 마신다(R103 은 같은 물약으로 칸이 다 차 칸 수만큼 마셨다). 마시는 조건 `[balance.csv:potion_use_hp_pct]` · 쿨 `[balance.csv:potion_cooldown_sec]` 은 그대로다.
> **101 승률 9/20 → 4/20 · 평균 라운드 8.3 → 5.8 · 골드 631 → 378.** 물약이 없던 판(1/20 · 3.4 라운드 · 164)과 R103 판 사이에 선다.
> ⚠ **목표 대역에는 못 닿는다** — 101 20%(목표 ≥ 70%) · 102 5%(목표 30~70%). 물약 수치와 칸 규칙은 **사용자 지정**이라 손잡이 재보정은 하지 않았다 — 되돌리려면 `monster_atk_scale` 과 물약 셋을 함께 본다.
> 시간 초과는 R103 보다 줄었다 — 104 4 → 1판 · 105 8 → 7판.

| 스테이지 | 승률 | 라운드 | 소요 | 전투불능 | 골드 | 드롭 | 카드 |
|---|---|---|---|---|---|---|---|
| 101 | 4 / 20 | 5.8 | 202 s | 2.45 | 378 | 1.6 | 1.4 |
| 102 | 1 / 20 | 4.5 | 217 s | 2.90 | 246 | 0.6 | 1.1 |
| 103 | 1 / 20 | 4.2 | 239 s | 2.95 | 250 | 0.7 | 1.1 |
| 104 | 0 / 20 | 3.0 | 245 s | 3.15 | 163 | 0.6 | 0.6 |
| 105 | 3 / 20 | 0.1 | 407 s | 2.65 | 608 | 0.1 | 0.0 |

시간 초과 101 **0** · 102 0 · 103 0 · 104 **1** · 105 **7** · 단정 **PASS 325 / 325**(수 불변 · R104 로 물약 단정 8 개정 — 시작 칸 · `potionState` 칸 목록 · 다음 빈 칸 · 세이브 유령 id · rng 불변 + 틀린 칸 목록에서 멈춤 · 앞 칸부터 · 칸마다 다른 물약 · `departRun`) · 골든 **재촬영**(`csvHash` 2 — `stage` · `skill` 글 열 · ⚠ 병렬 세션 변경이 섞였다 · `balance` · `meta.parties` 불변 · 50런 중 48런 갈림 · 재촬영 뒤 50런 · 드롭 33 · 이벤트 88031).

옛 측정표(2026-08-27 ~ 09-10)는 [DEV_LOG.md §3](../../docs/client/DEV_LOG.md) 로 옮겼다 — 새로 재면 이 절을 **갈아 끼운다**(옛 표를 「직전 측정」으로 남기지 않는다 · [DEV_PLAN.md §7](../../docs/client/DEV_PLAN.md)).

---
*마지막 업데이트: 2026-09-16*
