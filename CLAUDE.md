# TheSevenSimulationRPG - Project Guide

## 프로젝트 개요
7대 죄악(Seven Deadly Sins) 테마의 **Lootun형 방치 파밍 RPG** (신규 프로젝트, 초기 기획 단계).
파티를 편성해 자동전투 원정을 보내고, 루팅 리포트를 확인하고, 장비를 재배분하는 것이 핵심 플레이.
**장비가 주인공** — 조작이 아니라 편성·장비 의사결정이 게임의 본체 (A안).

**참고작**: Lootun (게임 형태), Diablo 2 (아이템 철학)

### 계보 (형제 프로젝트에서 계승)
- **TheSevenRPG** → 아이템 코어 전체: 죄종 접사(7죄종×슬롯), 희귀도 4단계(매직→레어→크래프트→유니크, 통제 가능성의 계단), 세트포인트 2/4/6, 코스트(수평 제약), 무기군 Implicit, 낙인(stigma) 크래프팅, 드롭 파이프라인
- **TheSevenSimulation** → 로스터 프레임: 영웅 = 1이름 + 1메인죄종 + 1시작특성 (반고정 생성), XP 카테고리 자동 성장, 히든 성장률/상한선. 사기·폭주·경영 레이어는 **미탑재**
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
│   ├── game_design/       # GAME_DESIGN.md(메인) + 세부 6종
│   └── reference/         # 형제 프로젝트 분석 + inherited_data_gaps.md
└── src/
    ├── index.html         # 진입점
    ├── ui/                # DOM 렌더러 (Phase 2에서 버려질 레이어)
    │   ├── style.css
    │   ├── app.js         # 화면 렌더링
    │   └── mock.js        # 화면 목업 데이터 — 실데이터 연결 시 삭제
    ├── game_logic/        # 순수 게임 로직 (미착수)
    └── data/
        └── inherited/     # TheSevenRPG 포크 25종 — 스키마 무변환, 재동기화 가능
```

### 현재 진행 단계
**화면 UI 구성 중** — `ui/mock.js`의 고정 데이터로 화면 레이아웃부터 확정한다.
`game_logic/`은 비어 있고, 화면이 확정된 뒤에 계승 CSV를 붙인다.

## 개발 규칙
- 기획서는 한국어로 작성, 문서 변경 시 마지막 업데이트 날짜 기재
- 게임 데이터는 **CSV**로 관리, 밸런스 수치 코드 하드코딩 금지
- **기획 문서에 절대 수치 기재 금지** — 수치는 CSV(SSOT). 기획서는 키 참조(`[balance.csv:key]`), 체감 범위, 공식 변수명, 테이블 링크만 허용
- game_logic 모듈은 생성자에서 데이터를 주입받음
- **git 커밋/푸시는 사용자가 명시적으로 요청할 때만 실행**

## 기획 조언 원칙
1. **구조적 완성도 > 재미** — 모순/빈 구멍/이중 처벌/SSOT 위반을 먼저 잡는다
2. **통제성 우선** — 플레이어가 인과를 읽을 수 있는 구조가 기본. 특히 방치형의 계약: "자리 비워도 안전"
3. **단순화가 정답** — 새 게이지/수치/분기 추가 전에 기존 축으로 표현 가능한지 검증

---
*마지막 업데이트: 2026-08-21 (화면 UI 목업 착수 + TheSevenRPG 데이터 포크)*
