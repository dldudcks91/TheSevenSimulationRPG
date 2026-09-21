# TheSevenSimulationRPG - Project Guide

## 설계의 큰 틀

**컨셉 락은 2026-09-03 해체됐다** (GAME_DESIGN.md §9 09-03 「컨셉 락 해체」) — 「제안이 부딪히면 제안을 버린다」 규칙은 소멸했다. 큰 틀은 [GAME_DESIGN.md](docs/game_design/GAME_DESIGN.md) **§1(게임 정의) · §3(코어 루프)**, 미확정 과제는 **§10** 이 유일한 목록이다. 옛 락 조항의 내용(~~관전 구조 = 원정·실시간 의뢰 탭 관전~~ → **09-07 로 관전은 원정 하나**(의뢰가 목표형이 되어 전장을 안 연다) · 병렬 가동은 비전투 전담 · ~~「켜 두면 장비, 꺼 두면 재료」~~ → **09-07 폐기**(사용자 지시 — **장비 획득을 원정에 묶지 않는다**. 오프라인 활동에서도 장비가 나온다))은 **일반 확정 사항**으로 그 문서들에 존속한다 — 부딪히는 제안은 경고 대상일 뿐 논의를 막지 않는다(기획 조언 원칙 4). **오프라인 전투는 「보호」 하나가 돈다**(리포트에서 재생 — §9 09-03).

---

## 개요

7대 죄악(Seven Deadly Sins) 테마의 **파밍 RPG** (신규 프로젝트, 초기 기획 단계) — **"디아블로식 아이템 게임을, 그래픽을 최소화한 파티 RPG 형식으로 재해석한다"** (09-03 게임 정의).
**접속 중**엔 파티를 자동전투 원정에 보내 실시간으로 장비·재료를 줍고, 루팅 리포트를 확인해 장비를 재배분한다.
**꺼져 있는 동안**엔 원정에 안 나간 영웅을 파견처·탐험에 보내 재료·재화·해금을 모은다 — 장비도 나올 수 있다(09-07 「장비 획득을 원정에 묶지 않는다」). **의뢰**는 활동이 아니라 받아 두는 목표라 평소 활동 위에 얹혀 진행된다(09-07).
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
├── start.bat              # 로컬 서버 실행 — ES Modules 는 file:// 에서 막힌다
├── serve.py               # 그 서버 본체 — http.server + `Cache-Control: no-store` (같은 파일명 아트 교체가 캐시로 안 먹던 문제)
├── docs/
│   ├── game_design/       # 게임의 WHAT — GAME_DESIGN.md(메인 · §9 최근 결정 · §10 미확정) + 세부 8종 + DECISION_LOG.md(이력 아카이브 — 평소엔 안 연다)
│   ├── client/            # 소프트웨어의 HOW — DEV_PLAN(계획·부채) · ARCHITECTURE(구조) · INTERFACE(이식 계약) · DEV_LOG(이력 아카이브 — 평소엔 안 연다)
│   │                      #   화면은 셋 — SCREEN_DESIGN(규격) · adr/(결정 하나가 파일 하나) · SCREEN_CHANGELOG(이력)
│   └── reference/         # 참고작 전수 조사 · 형제 프로젝트 분석 · inherited_data_gaps.md
└── src/
    ├── index.html         # 진입점
    ├── ui/                # DOM 렌더러 (Phase 2 에서 버려질 레이어)         → ui/README.md
    ├── game_logic/        # 순수 게임 로직 — 이식 대상                       → game_logic/README.md
    ├── dev/               # test.html — 단정 + 밸런스 캘리브레이션           → dev/README.md
    ├── data/              # CSV SSOT + inherited/ (읽기 전용 25종)       → data/README.md
    └── assets/art/        # backgrounds/<스타일>/ · faces/<스타일>/ · icons/ (전부 신규 아트·편집 중)  → assets/art/README.md
```

## 규칙
1. **기획서는 한국어**, 변경 시 꼬리의 마지막 업데이트 **날짜만** 갈아 끼운다 — 무엇을 바꿨는지는 커밋 메시지
2. **수치는 CSV(SSOT)** — 코드 하드코딩 금지, 기획서에 절대 수치 금지 (키 참조 `[balance.csv:key]` 만)
3. **`src/data/inherited/` · `src/assets/art/backgrounds/source/pixel/` 의 계승 원본 셋(101 · 102 · `town`) 읽기 전용** — 바꿔야 하면 `src/data/` 에 신규 테이블로 **대체**하고 문서에 남긴다. **`src/assets/art/` 의 나머지는 읽기 전용이 아니다** — 배경 설치본(`backgrounds/<스타일>/`) · 얼굴 · 아이콘은 신규 아트를 직접 채워 넣는 활성 폴더 (2026-08-28 · 배경이 스타일 폴더로 갈리며 범위 개정 2026-09-16)
4. **`game_logic` 모듈은 생성자에서 데이터를 주입받는다**
5. **git 커밋/푸시는 사용자가 명시적으로 요청할 때만**
6. **다국어 ko/en 나란히** — 렌더러(`app.js`/`battle.js`)에 한국어 리터럴 금지. **아이템·스킬 이름은 영어가 원본이고 한글은 직역**(의역 금지 — `Morning Star` → 모닝스타) (세부: [src/ui/README.md](src/ui/README.md) · 규약 본문 [src/data/README.md](src/data/README.md))

검증 방법 · 개발용 URL · 밸런스 손잡이 → [src/dev/README.md](src/dev/README.md)
경계(export·스키마·rng 순서)를 바꾸면 **INTERFACE.md 먼저**, 화면을 바꾸면 **SCREEN_DESIGN.md 먼저** → [docs/client/DEV_PLAN.md §7](docs/client/DEV_PLAN.md)
**화면 문서는 셋이다 [2026-09-09]** — 규격 [SCREEN_DESIGN.md](docs/client/SCREEN_DESIGN.md)(**지금**만 적는다) · 결정 [adr/](docs/client/adr/README.md)(**안 고친다** · 뒤집히면 새 ADR 이 대체) · 이력 [SCREEN_CHANGELOG.md](docs/client/SCREEN_CHANGELOG.md)(한 줄씩). **규격은 폐기된 것을 안 적고, 근거는 현재 상태를 주장하지 않는다** → [adr/README.md](docs/client/adr/README.md)

**문서는 이력을 품지 않는다 [2026-09-14]** — 꼬리는 날짜 한 줄 · 로그와 대장은 한 행 한 줄 · 현황과 측정은 덮어쓴다 · 옛 이력은 아카이브(DECISION_LOG · DEV_LOG) · 크기 상한 → [DEV_PLAN §7](docs/client/DEV_PLAN.md)

## 작업 규칙 (세션 공통 — 스킬마다 옮겨 적지 않는다)

- **병렬 세션** [2026-08-26] — 같은 저장소에서 Claude 세션이 여럿 동시에 돈다. 문서 · CSV 를 인용하거나 고치기 전에 `ls -la --time-style=long-iso` 로 mtime 을 보고 세션 시작 뒤 바뀐 파일은 다시 읽는다. 패치는 정확한 old 문자열 매칭으로만 한다(다른 세션의 변경을 덮어쓰지 않는다). 커밋 전 `git status` 에 내가 안 만진 파일이 있으면 다른 세션의 작업이다
- **서버는 사용자 것이다** [2026-09-21] — `8777` 은 사용자의 `start.bat` 전용이라 **어떤 세션도 끄지 않는다**. `taskkill /F /IM python.exe` 처럼 **이름으로 뭉뚱그려 죽이는 명령 금지** — 끌 땐 PID · 포트로 대상을 확인하고 그 하나만. 에이전트가 띄울 땐 `serve.py <세션 포트>` 를 `Start-Process` 로 OS 에 분리한다(background Bash 슬롯은 회수될 때 서버를 같이 데려간다 · plain `python -m http.server` 는 `no-store` 가 빠져 아트 교체가 캐시로 안 먹는다). 이미 물린 포트엔 **띄우지 않는다** — `serve.py` 의 `allow_reuse_address` 가 Windows 에선 강탈을 허용해 bind 가 그냥 되고, 두 서버가 요청을 나눠 먹는다
- **문서 · 형제 프로젝트 조사는 `model: "sonnet"` 서브에이전트** [2026-08-26] — 직접 grep 으로 메인 컨텍스트를 태우지 않는다. 형제 프로젝트(TheSevenRPG · TheSevenSimulation · TheSevenTactics)는 세션의 additional working directories 안에서만
- **서브에이전트는 상황 판단** [2026-09-10 사용자 정정] — 서로 독립인 갈래를 동시에 돌리거나 산출물이 메인 맥락을 넘칠 때만 에이전트에 맡긴다(결정 목록 D1~Dn 과 검증 절차를 담은 `PLAN.md` → 실행자 · 파일이 겹치지 않게 단계를 나눈다 · 메인은 diff 검수와 보고). 같은 파일을 순서대로 고치는 일은 메인이 직접 한다
- **짧은 동의(「ㄱ」 · 「ok」)의 범위**는 글로벌 CLAUDE.md, **커밋 · 푸시**는 위 규칙 5

---
*마지막 업데이트: 2026-09-21*