# TheSevenSimulationRPG - Project Guide

## 컨셉 락 (최우선 — 판단이 갈릴 때 여기로 돌아온다)

> **게임 접속 시 → 원정 전투와 아이템 정리**
> **게임 오프 시 → 영웅들을 다양한 요소에 파견**

**시간축이 활동을 가른다 — 실시간 = 전투 = 원정 하나 / 오프라인 = 비전투 전부.**

| | 접속 중 | 오프라인 |
|---|---|---|
| 활동 | 원정(실시간 전투) · 아이템 정리 | 파견 — 파견처 · 탐험 등 |
| 산출 | 장비 드롭 | 재료 · 재화 · 해금 |

### 따름정리 — 제안이 이 셋과 부딪히면 제안을 버린다

1. **전투는 실시간 독점** — 오프라인에 전투는 돌지 않는다. 뒤집으면, **전투가 아닌 것은 오프라인에 돈다.** 탐험이 원정의 문법(편성 → 출발 → 리포트)을 빌려도 전투가 아니므로 오프라인 쪽이다. 가르는 기준은 문법이 아니라 **전투 여부**.
2. **전투 창구는 하나** — 그래서 관전이 성립한다. 관전을 죽이는 제안(동시 원정 확대 등)은 이 조항과 먼저 대조한다.
3. **병렬 가동은 비전투가 전담** — 로스터 전원을 굴리는 압력(타겟 니즈 3)은 파견·탐험으로 푼다. **전투를 복제해서 풀지 않는다.** Lootun과 갈리는 지점 — Lootun은 3인 팀을 여러 개 동시에 돌려서(로스터 10~15) 병렬을 만들고, 그 대가로 관전이 구조적으로 불가능하다.

미확정 (락 아님): 동시 원정 1의 영구 여부 · 파견 종류 어휘(탐험·채집·여행 — 수색은 선술집 하위 기능이라 파견이 아니다) · 기능 해금 사다리 — [GAME_DESIGN.md §10](docs/game_design/GAME_DESIGN.md)

---

## 개요

7대 죄악(Seven Deadly Sins) 테마의 **파밍 RPG** (신규 프로젝트, 초기 기획 단계).
**접속 중**엔 파티를 자동전투 원정에 보내 실시간으로 장비를 줍고, 루팅 리포트를 확인해 장비를 재배분한다.
**꺼져 있는 동안**엔 원정에 안 나간 영웅을 파견처·탐험에 파견해 재료·재화·해금을 모은다.
**목표 — 좋은 영웅과 좋은 아이템을 얻고, 파티 운영으로 챕터를 진행한다.** 영웅·아이템은 대등한 수집 대상 · 성장마다 기능이 하나씩 열린다 · 재료는 다양한 경로, 아이템은 다방면 획득·업그레이드. 조작이 아니라 빌드·편성·배분 의사결정이 본체 (08-26 — "장비가 주인공(A안)" 폐기).

- **참고작**: Lootun (게임 형태) · Diablo 2 (아이템 철학) — 조사는 [docs/reference/](docs/reference/)
- **계보**: TheSevenRPG → 아이템·몬스터·스토리 코어 계승 (변경점 [item_design.md](docs/game_design/item_design.md)) / TheSevenSimulation → 영웅 로스터 프레임 계승 (재설계 [hero_design.md](docs/game_design/hero_design.md)). 두 원작의 죄종 매핑이 달라 **통일 매핑(sin_mapping.md)이 첫 SSOT 과제**
- 메인 기획서: [GAME_DESIGN.md](docs/game_design/GAME_DESIGN.md) — 타겟 니즈 5 · 코어 루프 · 결정 로그

## 철학

### 기획 조언 원칙
1. **구조적 완성도 > 재미** — 모순/빈 구멍/이중 처벌/SSOT 위반을 먼저 잡는다
2. **통제성 우선** — 플레이어가 인과를 읽을 수 있는 구조가 기본. 특히 방치형의 계약: "자리 비워도 안전"
3. **단순화가 정답** — 새 게이지/수치/분기 추가 전에 기존 축으로 표현 가능한지 검증

### 아키텍처 원칙
Phase 1 = **무빌드 웹**(ES Modules + 순수 DOM/CSS, 서버 없음, CSV, LocalStorage) → Phase 2 = Godot/Unity 이식(미확정). **이식 대상은 `game_logic/` + `data/*.csv` 뿐**, UI 는 재작성. 그걸 가능하게 하는 조건:
1. **`game_logic/` 은 DOM 을 모른다** — `document`/`window`/`localStorage` 참조 0. 입력은 생성자 주입, 출력은 순수 데이터
2. **난수는 주입** — `Math.random()` 금지. 시드 가능한 RNG → 같은 시드 = 같은 결과 (이식 후 대조 검증)
3. **세이브는 엔진 중립 JSON** — 직렬화는 `game_logic/`, 저장소 접근은 어댑터 1곳
4. **CSV 는 손대지 않는다** — 엔진별 포맷 변환 금지

## 폴더 구조
```
TheSevenSimulationRPG/
├── CLAUDE.md
├── start.bat              # 로컬 서버 (python -m http.server) — ES Modules 는 file:// 에서 막힌다
├── docs/
│   ├── game_design/       # 게임의 WHAT — GAME_DESIGN.md(메인 · §10 미확정 과제) + 세부 8종
│   ├── client/            # 소프트웨어의 HOW — DEV_PLAN(계획·부채) · ARCHITECTURE(구조) · INTERFACE(이식 계약) · SCREEN_DESIGN(화면)
│   └── reference/         # 참고작 전수 조사 · 형제 프로젝트 분석 · inherited_data_gaps.md
└── src/
    ├── index.html         # 진입점
    ├── ui/                # DOM 렌더러 (Phase 2 에서 버려질 레이어)         → ui/README.md
    ├── game_logic/        # 순수 게임 로직 — 이식 대상                       → game_logic/README.md
    ├── dev/               # test.html — 단정 + 밸런스 캘리브레이션           → dev/README.md
    ├── data/              # CSV SSOT + inherited/ (읽기 전용 포크 25종)       → data/README.md
    └── assets/art/        # backgrounds/(계승 포크·읽기 전용) + faces/(신규 아트·편집 중)  → assets/art/README.md
```

## 규칙
1. **기획서는 한국어**, 변경 시 마지막 업데이트 날짜 기재
2. **수치는 CSV(SSOT)** — 코드 하드코딩 금지, 기획서에 절대 수치 금지 (키 참조 `[balance.csv:key]` 만)
3. **`src/data/inherited/` · `src/assets/art/backgrounds/` 읽기 전용** — 바꿔야 하면 `src/data/` 에 신규 테이블로 **대체**하고 문서에 남긴다. `src/assets/art/faces/` 는 읽기 전용이 아니다 — 신규 몬스터 아트를 직접 채워 넣는 활성 폴더 (2026-08-28)
4. **`game_logic` 모듈은 생성자에서 데이터를 주입받는다**
5. **git 커밋/푸시는 사용자가 명시적으로 요청할 때만**
6. **다국어 ko/en 나란히** — 렌더러(`app.js`/`battle.js`)에 한국어 리터럴 금지 (세부: [src/ui/README.md](src/ui/README.md))

검증 방법 · 개발용 URL · 밸런스 손잡이 → [src/dev/README.md](src/dev/README.md)
경계(export·스키마·rng 순서)를 바꾸면 **INTERFACE.md 먼저**, 화면을 바꾸면 **SCREEN_DESIGN.md 먼저** → [docs/client/DEV_PLAN.md §7](docs/client/DEV_PLAN.md)

---
*마지막 업데이트: 2026-08-28 (`assets/inherited/` → `assets/art/` 리네임 — faces/ 는 읽기 전용 해제, backgrounds/ 는 유지) · 2026-08-26 (「시설」 어휘 폐기 → 「파견처」 · 건설·업그레이드 없음 — 가짓수 = 챕터 해금 / 세기 = 배치된 영웅) · 2026-08-26 (게임 정의 개정 — "장비가 주인공" 폐기 · docs/client/ 신설)*
