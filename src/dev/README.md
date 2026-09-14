# src/dev — 검증

브라우저가 유일한 JS 런타임이다(빌드 없음, node 없음). 단정과 캘리브레이션은 전부 `test.html` 에서 돈다.

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
| ③ | `meta.parties` — 시드 10개의 시작 파티 | 영웅 생성 굴림(이름·죄종·직업·특성·능력치·**히든 상한**)과 시작 무기. `hero_name.csv`·`hero_trait.csv` 행 순서는 여기서만 잡힌다 |
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
| `?dev=battle` | 즉시 정산 → 리포트 — **`&runs=n` 이면 n번 연달아 돌려 런 목록을 쌓는다**(SCREEN_DESIGN §4-3 왼쪽 열 · 상한 [balance.csv:report_keep] · 2026-09-09). 줄이 하나면 「고른다」는 결정 자체가 화면에 없다 |
| `?dev=live` | **재생이 도는 채로 리포트** — 기여 표(§4-3)가 재생 시각까지만 차고 머리에 `재생 중` 배지가 선다 (2026-09-10). `&at=n` 이면 **n초 지점부터** — 표가 차 있는 상태를 바로 본다. 클릭으로는 출발 → 세그먼트 이동을 거쳐야 닿는 자리다 |
| `?dev=play` | 관전 — `&bt=log|dmg` 면 **그 판이 열린 채**, `&lay=split` 이면 **나눔 배치**(옛 구조) (2026-09-03) · **`&tab=<탭>` 이면 관전을 켠 채 그 탭**(2026-09-08 — 런이 도는 동안의 다른 탭 화면. 예: 영웅 띠의 「원정 중」 라벨) · **`&rep=1` 이면 반복 원정을 켠 채**(2026-09-10 — 반복은 전진 패널 토글로만 켜져서 「런이 끝나면 다음 런이 선다」에 못 닿았다 · ADR-0074) |
| `?dev=search` | 선술집 — 수색 (`&s=out` 갓 보냄 · `&s=mid` 절반·**만남** · 기본 완료 · `&key=1` 소문에 맞는 죄종을 보냄 → 열쇠 답 · `&ans=n` n번째 답을 미리 고름) |
| `?dev=offline` | 반복 켠 채 껐다 켠 상황 — 런 마무리 배너 |
| `?dev=form` | 편성 패널이 열린 화면 (지역을 고른 상태). **파티는 비어 있다** — 새 게임의 기본 상태다(2026-09-09). `&party=full` 이면 로스터 순서로 채운다(파티 테두리·리더 표시 확인용). `&stage=<id>` 면 그 스테이지의 패널을 연다(챕터도 같이 옮긴다 · 2026-09-10 — 해금 전 후반 스테이지는 클릭이 거절돼 못 닿았다) · `&lvl=n` 이면 그 스테이지를 **위험도 n 으로 올린** 창(상한이 n 에 닿을 때까지 앞 스테이지를 클리어 처리 · 2026-09-14 — 조절 버튼은 클리어 기록이 있어야 살아난다) |
| `?dev=prologue` | 프롤로그 (SCREEN_DESIGN §3-1) — `&s=n` 이면 n번째 씬. 마지막 씬(5)만 인용·챕터 줄이 선다 (2026-09-03) |
| `?dev=tree` | **스킬 창이 열린** 캐릭터 탭 — 창은 버튼으로만 열린다. 영웅 0 에게 포인트 [balance.csv:mastery_t1_max_rank] 를 주고 **한 칸을 미리 찍어 둔다** (2026-09-08) — 새 게임은 포인트가 0 이라 창의 결정 둘(찍기 · **우클릭 되돌리기**)에 못 닿았다 |
| `?dev=tactics` | 연구 탭 — 전술 칸이 **전부 열린** 상태 (칸은 합산 레벨로만 열려 클릭으로 못 만든다) |
| `?dev=tip` | **아이템 툴팁이 떠 있는** 캐릭터 탭 (2026-09-10) — 툴팁은 hover 로만 뜬다. 한 런을 정산해 **주운 것을 다 입히고** 한 번 더 정산해 **가방에 비교 상대가 있는 물건**을 남긴다(새 게임은 몸에 무기 하나뿐이라 비교 두 장에 못 닿는다). `&i=n` 이면 n번째 찬 칸(기본 1 — 가방에 무엇이 떨어질지는 시드가 정하므로 무기 칸을 골라 잡는 유일한 길) · `&t=doll` 이면 페이퍼돌 칸(한 장) |
| `?screen=start` | 시작 화면 |
| `?tab=<탭>` | 탭 바로 열기 — **탭 10** (2026-09-08): `expedition` · `character` · `forge`(강화) · `tavern` · `shop`(상점) · `resource`(자원) · `explore`(탐험) · `research` · `codex` · `help`. ⚠ 옛 이름 둘은 **죽었다**(무시하고 원정으로 연다) — `town`(09-04 자원·탐험으로 갈림) · `imagedex`(09-08 도감에 흡수 — SCREEN_DESIGN §9). 세이브가 없으면 `?dev=newgame&tab=forge` 처럼 겹쳐 쓴다. ⚠ `?dev=forge` · `?dev=trade` 는 **삭제**됐다 — 강화·상점이 탭이 되어 `?tab=` 이 바로 닿는다 |
| `?cx=monster\|character\|item\|skill` | 도감의 세그먼트 (SCREEN_DESIGN §9 · §9-1) — `?tab=codex&cx=skill` 처럼 겹쳐 쓴다. 기본값 `monster`. ⚠ 옛 이름 `?ix=character\|item` 은 09-08 에 이미지 도감 탭과 함께 죽었다 |
| `?face=<스타일>` | 몬스터 얼굴 아트 스타일 교체 — `src/assets/art/faces/<스타일>/`. 목록은 `ui/mock.js:FACE_STYLES` · localStorage 에 남는다 |

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

## 밸런스 손잡이 (`src/data/balance.csv`)

> **`balance.csv:knob = 1` 이 손잡이의 SSOT 다** (**77키** — 2026-09-09 재집계 · 수색 손잡이 8키(`tavern_search_*` — 만남 3키 포함)가 들어왔다. ⚠ 이 수는 잘 낡으므로 세야 하면 CSV 를 센다. 옛 표기 ~~53키~~ — 2026-09-08 `hp_regen_base_per_level` 이 들어왔다 · 2026-09-02 전술 등급 가중치 3키. ⚠ 이 줄이 적던 48키는 09-01 `skill_cd_floor_mult` 가 들어온 뒤로 하나 뒤처져 있었다). 손잡이인지 아닌지를 사람 기억이 아니라 컬럼이 들고 있어야 캘리브레이션이 재현된다.
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
| `weapon_atk_base` · `hero_hp_base` | 무기 공격력 밑수 · 레벨 1 최대 HP |
| `xp_rate` · `gold_rate` | 보상 배율 |

- 값을 바꾸면 **test.html 표를 다시 찍는다**
- 헤드리스로 표를 찍을 땐 **브라우저 캐시를 끈다** — 프로필 폴더를 지우고 `--disk-cache-size=1`. 안 그러면 CSV 가 캐시돼 손잡이를 돌려도 같은 표가 나온다

### 마지막 측정 (2026-09-14 — **챕터 하나 = 10레벨 · 스테이지 레벨 재배치(R88)** · 손잡이 미조정 · 시드 20 · Lv1 시작 파티 · 일반 갑옷 있음 · 액티브 = **고유 + 무기 둘**(무기는 고유를 뺀 풀))

> **손잡이는 안 돌렸다 — 스테이지 레벨이 바뀌었다** (DEV_PLAN R88). `stage.csv:dlvl` 을 챕터당 10레벨로 다시 깔았고(N장 k스테이지 = 10(N−1)+2k · ⚠임시 간격) 만렙이 50 → 70 이 되며 HP 구간 6·7 이 발행됐다.
> 움직인 것 — **104 · 105 뿐이다.** 101~103 은 dlvl 이 그대로(2 · 4 · 6)라 표가 R86 판과 한 자리도 안 다르다. 104 는 7 → 8, 105 는 7 → **10** 이 되어 몬스터 HP · 장비 아이템 레벨 · 적중 레벨 차가 함께 올랐다. HP 구간 6·7 은 레벨 51 부터 걸려 이 표(Lv1 · dlvl ≤ 10)에 닿지 않는다.
> **결과 — 104 · 105 가 짧게 끝난다.** 104 라운드 1.9 → 1.5 · 골드 88 → 70 · 전투불능 3.05 → 3.55 / 105 승 1 → 0 / 20 · 골드 170 → 0 · 전투불능 2.95 → 3.15. 105 의 시간 초과 9 → 7 은 버티기 전에 쓰러진 판이 늘어서다.
> ⚠ **전투불능이 3 을 넘는다**(파티 3) — 소환 벽이 쓰러지면 `result.downed` 에 uid 없이 실리는 **R79 이전부터 있던 동작**이다(미수정).
> ⚠ **목표 대역 재보정은 안 했다** — 스테이지 레벨 간격이 ⚠임시이고(사용자 「기본 레벨은 나중에」) 무기 곡선도 HP 구간에 맞춰 다시 정할 과제로 남아(GAME_DESIGN §10) 여기에 손잡이를 맞추지 않는다.

| 스테이지 | 승률 | 라운드 | 소요 | 전투불능 | 골드 | 드롭 | 카드 |
|---|---|---|---|---|---|---|---|
| 101 | 0 / 20 | 3.4 | 265 s | 3.50 | 151 | 0.3 | 0.9 |
| 102 | 0 / 20 | 2.6 | 219 s | 3.50 | 112 | 0.5 | 0.6 |
| 103 | 0 / 20 | 2.1 | 242 s | 3.30 | 94 | 0.5 | 0.3 |
| 104 | 0 / 20 | 1.5 | 221 s | 3.55 | 70 | 0.6 | 0.2 |
| 105 | 0 / 20 | 0.0 | 433 s | 3.15 | 0 | 0.0 | 0.0 |

시간 초과 101 **2** · 102 1 · 103 2 · 104 2 · 105 **7** · 단정 **PASS 277 / 277**(276 → 277 · 신설 1 — 스테이지 레벨 = 챕터당 같은 폭) · 골든 **재촬영**(`csvHash` 2 — `balance`·`stage` · `balance` 3키 — `hero_level_cap` 값 · 신설 둘 · `meta.parties` 불변 · 50런 중 **104·105 의 20런** · 재촬영 뒤 50런 · 드롭 17 · 이벤트 90038).

옛 측정표(2026-08-27 ~ 09-10)는 [DEV_LOG.md §3](../../docs/client/DEV_LOG.md) 로 옮겼다 — 새로 재면 이 절을 **갈아 끼운다**(옛 표를 「직전 측정」으로 남기지 않는다 · [DEV_PLAN.md §7](../../docs/client/DEV_PLAN.md)).

---
*마지막 업데이트: 2026-09-14*
