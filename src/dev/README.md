# src/dev — 검증

브라우저가 유일한 JS 런타임이다(빌드 없음, node 없음). 단정과 캘리브레이션은 전부 `test.html` 에서 돈다.

## 검증 방법

1. `start.bat` (로컬 http 서버 — ES Modules 는 `file://` 에서 CORS 로 막힌다)
2. `http://localhost:8777/dev/test.html` — game_logic 단정 + 밸런스 캘리브레이션 표
   - 실패 사유는 `fail()` 로 **던진다**. 문자열 반환은 통과로 집계되므로 쓰지 않는다

## 개발용 URL (`src/index.html`)

흐름을 헤드리스 스크린샷으로 태울 때 쓴다.

| URL | 상태 |
|---|---|
| `?dev=newgame` | 새 게임 시작 화면 |
| `?dev=battle` | 즉시 정산 → 리포트 |
| `?dev=play` | 관전 — `&bt=dmg` 면 우측 탭이 누적 데미지 |
| `?dev=offline` | 반복 켠 채 껐다 켠 상황 — 런 마무리 배너 |
| `?screen=start` | 시작 화면 |
| `?tab=character` | 캐릭터 탭 |

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

## 밸런스 손잡이 (`src/data/balance.csv`)

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

### 마지막 측정 (2026-08-27 — 전멸 캘리브레이션 손잡이 조정 · 시드 20 · Lv1 시작 파티 · 방어구 없음)

| 스테이지 | 승률 | 라운드 | 소요 | 전투불능 | 골드 |
|---|---|---|---|---|---|
| 101 | 20 / 20 | 9.0 | 283 s | 0.00 | 1298 |
| 102 | 10 / 20 | 8.3 | 408 s | 1.55 | 984 |
| 103 | 1 / 20 | 7.7 | 378 s | 2.85 | 550 |
| 104 | 0 / 20 | 5.8 | 234 s | 3.00 | 431 |

시간 초과 0. 목표(101 ≥70% · 102 30~70% · 103/104 는 지는 게 정상)를 충족한다.
**손잡이 3개를 조정했다** — `monster_hp_scale` 2.4→1.0 (킬 속도가 라운드 목표 20s 대비 한참 느려 라운드가 71s 안팎으로 늘어져 있었다), `monster_atk_scale` 0.25→0.1 (그 이하로 내리면 개별 타격이 `dmg_min`=1 바닥에 깔려 정예·보스의 공격력 배율이 무의미해진다), `hero_hp_base` 100→230 (몬스터 공격력을 낮춘 뒤에도 9라운드 무회복 구조에서 누적 피해를 버틸 체력 총량이 부족했다 — 101/102 목표 승률로 역산).
`weapon_atk_base`·`power_growth_per_level`은 28스테이지 전체의 역산값이라 건드리지 않았다 — 이번 손잡이는 전투 시작 시점의 생존 축(HP 대 몬스터 공격력·HP)에 한정된다.

---
*마지막 업데이트: 2026-08-27 (전멸 캘리브레이션 해소 — monster_hp_scale·monster_atk_scale·hero_hp_base 조정) · 2026-08-26 (손잡이 표 개정 — 성장 SSOT · K 상수 · 적중 3키 · 헤드리스 DOM 덤프 절차 · 캘리브레이션 재측정) · 2026-08-26 (CLAUDE.md 에서 분리)*
