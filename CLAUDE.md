# TheSevenSimulationRPG - Project Guide

## 프로젝트 개요
7대 죄악(Seven Deadly Sins) 테마의 **Lootun형 방치 파밍 RPG** (신규 프로젝트, 초기 기획 단계).
파티를 편성해 자동전투 원정을 보내고, 루팅 리포트를 확인하고, 장비를 재배분하는 것이 핵심 플레이.
**장비가 주인공** — 조작이 아니라 편성·장비 의사결정이 게임의 본체 (A안).

**참고작**: Lootun (게임 형태), Diablo 2 (아이템 철학)

### 계보 (형제 프로젝트에서 계승)
- **TheSevenRPG** → 아이템 코어 전체: 죄종 접사(7죄종×슬롯), 희귀도 4단계(매직→레어→크래프트→유니크, 통제 가능성의 계단), 세트포인트 2/4/6, 코스트(수평 제약), 무기군 Implicit, 낙인(stigma) 크래프팅, 드롭 파이프라인 — *본작 변경: 세트 3/6/9 재조정, 코스트 폐지, 슬롯 8부위 (item_design.md)*
- **TheSevenSimulation** → 로스터 프레임: 영웅 = 1이름 + 1메인죄종 + 1시작특성 (반고정 생성), XP 카테고리 자동 성장, 히든 성장률/상한선. 사기·폭주·경영 레이어는 **미탑재** — *본작 변경: 영웅 2층 구조(유니크 15 + 레어 무한 생성)로 재설계 (hero_design.md)*
- 두 게임의 죄종→스탯 매핑이 서로 다르므로, 본 프로젝트의 **통일 매핑 테이블이 첫 SSOT 문서** (docs/game_design/sin_mapping.md 예정)

## 기술 스택

### Phase 1: 웹 프로토타입 (현재)
- 서버 없음 — 클라이언트 JS만으로 동작 (싱글플레이어)
- **무빌드** — package.json/node_modules 없음. 실행은 `start.bat` (ES Modules는 `file://`에서 CORS로 막히므로 로컬 http 서버 필요)
- 게임 로직: JS (ES Modules), 렌더링: **순수 DOM + CSS** (게임 엔진 미사용)
- 데이터: **CSV** (SSOT), 세이브는 LocalStorage

### Phase 2: 엔진 이식 (추후, 스팀 출시 시)
- Godot 또는 Unity — 시점/엔진 미확정. 기획 검증 완료 후 판단
- **이식 대상은 `game_logic/`과 `data/*.csv`뿐** — UI 레이어는 재작성 전제

### 이식성 규칙 (Phase 2를 실제로 가능하게 하는 조건)
1. **`game_logic/`은 DOM을 모른다** — `document`/`window`/`localStorage` 참조 0. 입력은 생성자 주입, 출력은 순수 데이터
2. **난수는 주입** — `Math.random()` 직접 호출 금지. 시드 가능한 RNG를 주입받아 사용 (엔진 이식 후 동일 시드로 결과 대조 검증)
3. **세이브는 엔진 중립 JSON** — 직렬화 로직도 `game_logic/`에, LocalStorage 접근은 어댑터 1곳으로 격리
4. **CSV는 손대지 않는다** — Godot/Unity 둘 다 그대로 읽음. 엔진별 포맷 변환 금지

## 프로젝트 구조
```
TheSevenSimulationRPG/
├── CLAUDE.md
├── start.bat              # 로컬 서버 실행 (python -m http.server)
├── docs/
│   ├── game_design/       # GAME_DESIGN.md(메인) + 세부 7종 (battle_design.md 포함)
│   └── reference/         # 형제 프로젝트 분석 + inherited_data_gaps.md
└── src/
    ├── index.html         # 진입점
    ├── ui/                # DOM 렌더러 (Phase 2에서 버려질 레이어)
    │   ├── i18n.js        # 한/영 사전 + 언어 상태 (신규 2026-08-23)
    │   ├── style.css
    │   ├── app.js         # 화면 렌더링
    │   ├── battle.js      # 전투 관전 화면 목업
    │   └── mock.js        # 화면 목업 데이터 — 실데이터 연결 시 삭제
    ├── game_logic/        # 순수 게임 로직 (미착수)
    ├── assets/
    │   └── inherited/     # 계승 아트 포크 — 배경 4종(WebP) + CH1 얼굴 5종(README에 규격/재동기화)
    └── data/
        ├── balance.csv    # 신규 SSOT 수치 — 파티/로스터/스테이지 구조 키
        ├── monster.csv    # 신규 SSOT — 몬스터 112종 (일반 등급 소재값)
        ├── stage.csv      # 신규 SSOT — 스테이지 28개 (타입/dlvl/보스)
        ├── stage_round.csv    # 신규 SSOT — 스테이지 내부 라운드 9개 구조
        ├── round_budget.csv   # 신규 SSOT — 라운드 타입별 편성 상한 + 목표 전투시간
        ├── spawn_grade.csv    # 신규 SSOT — 등급 배율 (시간 예산과 분리)
        ├── hero_attribute.csv        # 신규 SSOT — 기본 능력치 7종 (전투 보정 + 파견, 장비로 불변)
        ├── combat_stat.csv           # 신규 SSOT — 전투 능력치 27종 (장비·스킬 파생)
        ├── equipment_option_override.csv  # 계승 옵션 패치 — 기본 능력치/코스트 접사 제외
        └── inherited/     # TheSevenRPG 포크 25종 — 스키마 무변환, 재동기화 가능, **읽기 전용**
```

### 현재 진행 단계
**코어 기획 확정 진행 + 화면 UI 목업 병행** — 전투 발동 규칙(battle_design.md), 스테이지 구조(챕터 4스테이지×9라운드), 직업 7종(본편 5+확장 2), 영웅 2층 구조, 부상/치료 모델, 세트 3/6/9 등 골격 확정 (GAME_DESIGN.md §10 결정 로그 참조).
**몬스터 데이터 재작성 완료 (2026-08-22)** — 계승본 구조 결함 5종 수정, 신규 SSOT 4테이블 발행 (monster_design.md §0).
**능력치 두 층 확정 (2026-08-22) + 게이트 폐지 (2026-08-23)** — 기본 능력치 7종(`hero_attribute.csv`, 영웅 고유·장비 불변) / 전투 능력치 27종(`combat_stat.csv`, 장비·스킬 파생) 분리. 불변식 `attr_equip_bonus=0`. **기본 능력치가 하는 일은 전투 계수와 파견 판정 둘뿐** — 착용 게이트·스킬 게이트는 전면 폐지, 착용 제약은 요구 레벨만. 최대 HP는 전 영웅 공통 `hero_hp_base` 시작 (hero_design.md §6).
**거점 원칙 개정 (2026-08-23)** — "영웅 판정 없음" 폐지. **시설이 곧 파견지**이고, 플레이어가 굴리되 배치된 영웅이 효율을 민다. 능력치 7 ↔ 시설 7 (base_expedition_design.md §2).
`game_logic/`은 미착수 — 남은 큰 기획은 **피해 계산 공식**, 죄종 매핑(sin_mapping.md), 진형·타겟팅, 신규 무기군 데이터(G3 영웅 측), 시설 4종 담당 확정.

## 개발 규칙
- 기획서는 한국어로 작성, 문서 변경 시 마지막 업데이트 날짜 기재
- 게임 데이터는 **CSV**로 관리, 밸런스 수치 코드 하드코딩 금지
- **기획 문서에 절대 수치 기재 금지** — 수치는 CSV(SSOT). 기획서는 키 참조(`[balance.csv:key]`), 체감 범위, 공식 변수명, 테이블 링크만 허용
- **`src/data/inherited/` 와 `src/assets/inherited/` 는 읽기 전용** — TheSevenRPG의 재동기화 가능한 포크다. 계승분을 바꿔야 하면 수정하지 말고 `src/data/` 에 신규 테이블을 만들어 **대체**하고, 무엇이 무엇을 대체했는지 문서에 남긴다 (monster_design.md §7 참조)
- game_logic 모듈은 생성자에서 데이터를 주입받음
- **git 커밋/푸시는 사용자가 명시적으로 요청할 때만 실행**
- **다국어(한/영) 필수** — 화면에 나가는 모든 문자열은 한 곳에 ko/en 이 **나란히** 있어야 한다
  - UI 문구: `src/ui/i18n.js` 의 `STRINGS` (키 하나에 `{ko, en}`) → `t('key')`
  - 데이터 문자열: `mock.js` 의 `{ko, en}` 쌍 → `L(value)`. CSV 로 이사할 때 `_kr`/`_en` 컬럼 쌍이 된다
  - **렌더러(app.js/battle.js)에 한국어 리터럴 금지** — 주석 제외. 이게 누락 검증 기준이다
  - 이름 조립 규칙(어순·조사)은 렌더러가 아니라 데이터 층에 둔다 (`nm()`, `eliteName()`)
- **화면 폭 정책** — 상한 1600px / 하한 1280px, 세로 예산 700px (1366×768 노트북 기준)
  - 해외 배율 125% 환경에서 CSS 뷰포트가 1536/1280 으로 잡힌다. 영어는 같은 내용이 1.3~1.5배 길다
  - 라벨이 들어가는 칸은 **고정 px 금지** — `minmax()` / `clamp()` 로 최소만 보장한다

## 기획 조언 원칙
1. **구조적 완성도 > 재미** — 모순/빈 구멍/이중 처벌/SSOT 위반을 먼저 잡는다
2. **통제성 우선** — 플레이어가 인과를 읽을 수 있는 구조가 기본. 특히 방치형의 계약: "자리 비워도 안전"
3. **단순화가 정답** — 새 게이지/수치/분기 추가 전에 기존 축으로 표현 가능한지 검증

---
*마지막 업데이트: 2026-08-23 (거점 원칙 개정 — 시설 = 파견지, 능력치 ↔ 시설 1:1)*
