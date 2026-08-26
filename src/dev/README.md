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
| `?dev=play` | 관전 |
| `?dev=offline` | 반복 켠 채 껐다 켠 상황 — 런 마무리 배너 |
| `?screen=start` | 시작 화면 |
| `?tab=character` | 캐릭터 탭 |

헤드리스 (Edge):
```
msedge --headless=new --screenshot=<out.png> --virtual-time-budget=8000 <URL>
```

## 밸런스 손잡이 (`src/data/balance.csv`)

| 키 | 역할 |
|---|---|
| `def_curve_k` | 감쇠 곡선 `D/(D+K)`, `K = def_curve_k × 공격자 레벨` |
| `monster_hp_scale` · `monster_atk_scale` · `monster_def_scale` | 몬스터 소재값 배율 |
| `weapon_atk_base` | 무기 공격력 밑수 |
| `xp_rate` · `gold_rate` | 보상 배율 |

- 값을 바꾸면 **test.html 표를 다시 찍는다**
- 헤드리스로 표를 찍을 땐 **브라우저 캐시를 끈다** — 프로필 폴더를 지우고 `--disk-cache-size=1`. 안 그러면 CSV 가 캐시돼 손잡이를 돌려도 같은 표가 나온다
- 마지막 측정 (2026-08-26, 시작 파티 · 시드 20개 · `def_curve_k=18`): Ch1-1 승률 95% / 1-2 45% / 1-3 5% / 1-4 0%

---
*마지막 업데이트: 2026-08-26 (CLAUDE.md 에서 분리)*
