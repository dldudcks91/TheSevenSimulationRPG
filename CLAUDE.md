# TheSevenSimulationRPG - Project Guide

## 설계의 큰 틀

**컨셉 락은 2026-09-03 해체됐다** (GAME_DESIGN.md §9 09-03 「컨셉 락 해체」) — 「제안이 부딪히면 제안을 버린다」 규칙은 소멸했다. 큰 틀은 [GAME_DESIGN.md](docs/game_design/GAME_DESIGN.md) **§1(게임 정의) · §3(코어 루프)**, 미확정 과제는 **§10** 이 유일한 목록이다. 옛 락 조항의 내용(관전 구조 = 원정·실시간 의뢰 탭 관전 · 병렬 가동은 비전투 전담 · 「켜 두면 장비, 꺼 두면 재료」)은 **일반 확정 사항**으로 그 문서들에 존속한다 — 부딪히는 제안은 경고 대상일 뿐 논의를 막지 않는다(기획 조언 원칙 4). **오프라인 전투는 「보호」 하나가 돈다**(리포트에서 재생 — §9 09-03).

---

## 개요

7대 죄악(Seven Deadly Sins) 테마의 **파밍 RPG** (신규 프로젝트, 초기 기획 단계) — **"디아블로식 아이템 게임을, 그래픽을 최소화한 파티 RPG 형식으로 재해석한다"** (09-03 게임 정의).
**접속 중**엔 파티를 자동전투 원정에 보내 실시간으로 장비를 줍고, 루팅 리포트를 확인해 장비를 재배분한다.
**꺼져 있는 동안**엔 원정에 안 나간 영웅을 파견처·탐험·**위임형 의뢰**에 보내 재료·재화·해금을 모은다.
**목표 — 좋은 영웅과 좋은 아이템을 얻고, 파티 운영으로 챕터를 진행한다.** 영웅·아이템은 대등한 수집 대상 · 성장마다 기능이 하나씩 열린다 · 재료는 다양한 경로, 아이템은 다방면 획득·업그레이드. 조작이 아니라 빌드·편성·배분 의사결정이 본체 (08-26 — "장비가 주인공(A안)" 폐기). **성장은 수평 + 수직 — 무한 수직 스케일링은 만들지 않는다 · 최종목표는 강력한 파티 + 다양한 스킬트리·파티 조합** (09-03 · 챕터 7 이후 엔드게임 형태는 미정).

- **참고작**: Lootun (게임 형태) · Diablo 2 (아이템 철학) — 조사는 [docs/reference/](docs/reference/)
- 메인 기획서: [GAME_DESIGN.md](docs/game_design/GAME_DESIGN.md) — 타겟 니즈 5 · 코어 루프 · 결정 로그

## 철학

### 기획 조언 원칙
1. **구조적 완성도 > 재미** — 모순/빈 구멍/이중 처벌/SSOT 위반을 먼저 잡는다
2. **통제성 우선** — 플레이어가 인과를 읽을 수 있는 구조가 기본. 특히 방치형의 계약: "자리 비워도 안전"
3. **단순화가 정답** — 새 게이지/수치/분기 추가 전에 기존 축으로 표현 가능한지 검증
4. **기존 확정 사항은 경고 대상이지 절대 규칙이 아니다** — 새 제안이 이미 확정된 내용(§0/확정 표기·결정 로그)과 부딪히면 그 사실을 반드시 알린다. 다만 확정됐다는 이유만으로 논의를 막지 않는다 — 경고 후에는 사용자 판단을 따른다

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
│   ├── game_design/       # 게임의 WHAT — GAME_DESIGN.md(메인 · §9 최근 결정 · §10 미확정) + 세부 8종 + DECISION_LOG.md(이력 아카이브 — 평소엔 안 연다)
│   ├── client/            # 소프트웨어의 HOW — DEV_PLAN(계획·부채) · ARCHITECTURE(구조) · INTERFACE(이식 계약) · SCREEN_DESIGN(화면)
│   └── reference/         # 참고작 전수 조사 · 형제 프로젝트 분석 · inherited_data_gaps.md
└── src/
    ├── index.html         # 진입점
    ├── ui/                # DOM 렌더러 (Phase 2 에서 버려질 레이어)         → ui/README.md
    ├── game_logic/        # 순수 게임 로직 — 이식 대상                       → game_logic/README.md
    ├── dev/               # test.html — 단정 + 밸런스 캘리브레이션           → dev/README.md
    ├── data/              # CSV SSOT + inherited/ (읽기 전용 25종)       → data/README.md
    └── assets/art/        # backgrounds/(읽기 전용) + faces/(신규 아트·편집 중)  → assets/art/README.md
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
*마지막 업데이트: 2026-09-03 (**컨셉 락 해체** — 락 섹션(헤드라인·표·따름정리 셋·미확정 줄)을 「설계의 큰 틀」 포인터 한 단락으로 교체. 계기는 보호 확정(전투가 오프라인에 돈다 — 리포트 재생)으로 헤드라인 「오프라인 = 비전투 전부」와 따름정리 1 이 무너진 것. 옛 조항 내용은 GAME_DESIGN §1-1·§3 에 일반 확정으로 존속 (GAME_DESIGN.md §9 09-03)) · 2026-09-03 (**성장 원칙 · 최종목표 반영** — 개요에 「수평+수직 · 무한 수직 스케일링 없음 · 최종목표 = 스킬트리·파티 조합」 추가, 미확정 줄에 「엔드게임의 형태」 등재 (GAME_DESIGN.md §1 · §9 09-03)) · 2026-09-03 (**게임 정의 헤드라인 반영** — 개요에 새 헤드라인 「디아블로식 아이템 게임을, 그래픽을 최소화한 파티 RPG 형식으로 재해석한다」 추가 (GAME_DESIGN.md §1 · §9 09-03)) · 이전 이력은 [DECISION_LOG.md](docs/game_design/DECISION_LOG.md) §2*