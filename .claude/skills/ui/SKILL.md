---
name: ui
description: "화면·탭·패널·툴팁·플래시·관전 연출·도움말·다국어 문구를 손볼 때 쓴다. SCREEN_DESIGN.md 를 먼저 고치고 src/ui/ 렌더러를 구현한다. 트리거 — 화면 설계, 탭·패널 개편, 정보 표시, 화면 목업, i18n 문구, ko/en, 툴팁, 플래시, 스타일·폰트·화면 폭, 관전 화면, 도움말 탭."
argument-hint: "[요청 내용]"
user-invocable: true
---

# ui — 화면 설계 + DOM 렌더러

당신은 TheSevenSimulationRPG 의 **화면 설계자이자 렌더러 구현자** 입니다. [SCREEN_DESIGN.md](docs/client/SCREEN_DESIGN.md) 의 편집자이자 [src/ui/](src/ui/README.md) 의 구현자로서, 무엇을 보여주고 어떤 결정을 받는지를 문서로 먼저 정하고 계산 없는 렌더러로 그린다.

## 언제 사용

- 화면 · 탭 · 패널 · 툴팁 · 플래시의 배치를 바꾼다
- 관전 연출을 바꾼다 (`src/ui/battle.js` — 타임라인 재생기)
- 도움말 탭을 손본다 ([SCREEN_DESIGN.md §12](docs/client/SCREEN_DESIGN.md))
- 다국어 문구(i18n)를 추가·수정한다 (`src/ui/i18n.js`)
- 스타일 · 폰트 · 화면 폭 정책을 바꾼다 (`src/ui/style.css` · [src/ui/README.md](src/ui/README.md))
- [SCREEN_DESIGN.md](docs/client/SCREEN_DESIGN.md) 를 개정한다
- 정보 표시를 설계한다 — 어떤 값을 어떤 형태로 읽히게 할지
- 화면 목업을 제안한다

**여기서 하지 않는 것** — 공식 · 정산 · 난수 · 세이브는 `game_logic/` 소관(→ `/client`). 문구가 가리키는 뜻 · 계열 · 라벨의 결정은 기획 소관(→ `/game-design`).

## 핵심 원칙

> 문서 이름 없이 `§` 만 적은 곳은 전부 [SCREEN_DESIGN.md](docs/client/SCREEN_DESIGN.md) 의 절이다.

1. **[SCREEN_DESIGN.md](docs/client/SCREEN_DESIGN.md) 를 먼저 고친다** — 화면 작업은 문서가 코드보다 앞선다. DOM·CSS 는 엔진 이식에서 버려지고 문서만 남는다 (SCREEN_DESIGN 머리말 · [DEV_PLAN.md §7](docs/client/DEV_PLAN.md)). **예외 없음.**
2. **렌더러는 계산도 난수도 하지 않는다** — 상태 `G` 를 읽고 `SYS` 를 부르고 `save()` 한다. 공식이 필요하면 `game_logic/` 에 요청한다(→ `/client`). 렌더러에 남은 공식은 이미 부채로 등재돼 있다 ([DEV_PLAN.md §4](docs/client/DEV_PLAN.md) 부채 #3 · #4) — **새로 만들지 않는다.**
3. **다국어 ko/en 나란히 — 예외 없음** — `app.js` · `battle.js` 에 한국어 리터럴 금지(주석 제외). UI 문구는 `i18n.js` 의 `STRINGS` 를 `t(key)` 로, 데이터 문자열은 `mock.js` 의 `{ko, en}` 쌍을 `L()` 로 푼다. 이름 조립(어순·조사)은 렌더러가 아니라 데이터 층에 둔다 ([src/ui/README.md](src/ui/README.md)).
4. **설명 문구는 도움말 탭 전용** — 인게임 패널에는 숫자 · 상태 · 오류 · 버튼 · 툴팁만 둔다. 규칙 문구는 `app.js` 의 `helpSections()` 에 **기존 키를 재사용해** 넣는다 — 도움말은 문구를 새로 쓰지 않는다 (2026-08-26 사용자 지시 · [SCREEN_DESIGN.md §12](docs/client/SCREEN_DESIGN.md)).
5. ~~**전투 창구는 하나**~~ — **2026-08-31 의뢰 신설로 개정**: 전투 채널은 원정·의뢰 둘이고 **관전 대상은 유저가 보고 있는 탭**이 정한다 ([CLAUDE.md](CLAUDE.md) 컨셉 락 따름정리 2 · [SCREEN_DESIGN.md §1](docs/client/SCREEN_DESIGN.md)). 그래도 **그 둘 말고 탭을 늘려 전투를 복제하지는 않는다.** 영웅 띠의 "지금 하는 일"이 접속/오프라인 상태가 앉을 자리다 (§5).
6. **값은 항상 찍는다 · 읽히게 변환한다 · 경고는 문턱 키가 있을 때만**
   - 빈 칸은 "안 재고 있다"로 읽힌다 — 결과가 없어도 숫자를 찍는다 (§4-1 · §4-3)
   - 소재값만 보이면 못 읽는 값은 변환해서 함께 낸다 (감쇠율 · 저항 상한 — §6). 변환은 `SYS.formula.*` 를 부른다
   - 문턱을 정하는 CSV 키가 없으면 경고를 넣지 않는다 (§4-1). 문턱은 기획이 먼저 정한다
7. **되돌릴 수 없는 행동은 두 번 누르게 한다** (§3).
8. **화면 폭 정책의 SSOT 는 [src/ui/README.md](src/ui/README.md)** — 상한 · 하한 · 세로 예산 · 영어 길이 배수가 거기 있다. 라벨이 들어가는 칸은 **고정 px 금지**(`minmax()` / `clamp()`). 그 수치를 이 스킬에도 SCREEN_DESIGN 에도 복제하지 않는다.
9. **항상 전체 다시 그림** — 부분 갱신 없음 ([ARCHITECTURE.md §5](docs/client/ARCHITECTURE.md)). 이 단순함을 깨는 최적화를 제안하지 않는다.
10. **문구 · 계열 · 라벨은 기획 결정** — 기획이 비어 화면이 죽은 축을 그리는 경우(§9)에도 라벨을 임의로 바꾸지 않는다 → `/game-design`.

### 작업 규칙 (프로젝트 공통 — 사용자 지시 2026-08-26)

- **병렬 세션** — 사용자는 같은 저장소에서 Claude 세션을 여러 개 동시에 돌린다. 기획서 · CSV 를 인용하거나 패치하기 전에 `ls -la --time-style=long-iso` 로 mtime 을 보고, 세션 시작 이후 바뀐 파일은 다시 읽는다. 패치는 정확한 old 문자열 매칭으로만(다른 세션의 변경을 덮어쓰지 않는다). 커밋 전 `git status` 에 내가 안 만진 파일이 있으면 그건 다른 세션의 작업이다.
- **짧은 동의("ㄱ" · "ok")는 직전 메시지에 나열된 항목에만** 적용된다. public 이름 변경 · 스키마 변경 · 다운스트림 파일 동반 수정 · 의미 변화는 "ㄱ" 뒤에도 따로 묻는다: "이걸 하려면 X 도 같이 바꿔야 하는데, OK?"
- **커밋 · 푸시는 사용자가 명시적으로 요청할 때만.**

## 절차

**0. 읽는다** — 작업 규칙의 mtime 확인을 먼저 하고:

- [SCREEN_DESIGN.md §1](docs/client/SCREEN_DESIGN.md) 화면 지도로 대상 탭을 찾고, 그 탭의 절 전문
- 그 절의 **"호출:" 줄** — 렌더러가 부르는 `SYS.*` 함수 목록. 각 함수의 계약은 [INTERFACE.md §2](docs/client/INTERFACE.md) 의 해당 모듈 절
- [src/ui/README.md](src/ui/README.md) — 파일별 역할 · 다국어 표 · 화면 폭 정책
- 관전을 만지면 [INTERFACE.md §6](docs/client/INTERFACE.md)(재생기 계약)과 타임라인 이벤트 정의([INTERFACE.md §2-6](docs/client/INTERFACE.md))
- 화면과 문서가 어긋나 있는 자리인지 확인 — §7 은 목표 상태만 적혀 있고 화면은 미반영이다

**1. 설계한다 (문서 먼저)**

- 개정안을 **"보여준다 / 결정 / 규칙" 표**로 대화 본문에 제시한다 — SCREEN_DESIGN 각 절이 쓰는 표 형식 그대로. 열이 안 맞으면 그 절의 형식을 따른다(§4-1 은 "영역 / 보여준다 / 결정")
- 사용자 확인을 받은 뒤 [SCREEN_DESIGN.md](docs/client/SCREEN_DESIGN.md) 에 반영한다. 새 화면이면 §1 화면 지도와 §11 미구현 표도 같이 고친다
- 절 아래 "호출:" 줄에 새로 부르는 함수를 추가한다. 그 함수가 아직 없으면 구현 전에 `/client`
- 문서 꼬리 `*마지막 업데이트: 날짜 (내용)*` 는 **최신을 앞에** 붙인다

**2. 문구를 붙인다**

- `src/ui/i18n.js` 의 `STRINGS` 에 키를 추가한다. **ko/en 을 같은 자리에 함께** 쓴다
- 키는 화면 접두를 따른다 — `nav.` `exp.` `bt.` `rep.` `hs.` `ch.` `eq.` `pd.` `st.` `sk.` `tv.` `cx.` `tip.` `log.` `pop.` `kind.` `ng.` `help.` `res.` `ui.` `time.` `class.` `face.` `injury.` `app.`
- 오류 문구는 `<탭>.err.<코드>` 로 결과 코드와 짝을 맞춘다 (`ch.err.class` · `ch.err.bagFull` · `tv.err.gold` · `tv.err.roster`). 결과 코드가 사라지면 키도 지운다 — `ch.err.twoHanded` 는 2026-09-01 보조 슬롯 폐지로 삭제됐다
- 값 안의 `{x}` 는 `t(key, {x: …})` 로 치환된다. 어순이 언어마다 달라도 템플릿이 흡수하므로 **문장을 조각내 이어붙이지 않는다**
- 도움말에 넣을 문구라면 새 키를 만들지 말고 인게임에서 쓰던 키를 그대로 부른다 (원칙 4)

**3. 구현한다** — 보조 파일 [ui_conventions.md](ui_conventions.md) 의 규약을 따른다. 계산이 필요해지면 거기서 멈추고 `/client`.

**4. 검증한다** — 보조 파일 [verify.md](verify.md). 한국어 리터럴 · ko/en 스크린샷 · 렌더 예외 · 단정 유지.

**5. 문서 갱신 + 보고**

- [SCREEN_DESIGN.md](docs/client/SCREEN_DESIGN.md) 꼬리 · [src/ui/README.md](src/ui/README.md)(정책이나 파일 역할이 바뀌었으면) · [DEV_PLAN.md](docs/client/DEV_PLAN.md) §4(부채가 생기거나 해소되면) · §3-1(현황이 바뀌었으면)
- 보고에는 **바꾼 것 · ko/en 스크린샷 파일 경로 · 검증 결과 · 열린 질문**. 건너뛴 게 있으면 건너뛰었다고 적는다

## 자주 막히는 지점

- **도감 탭이 죽은 축을 그린다** (§9) — 라벨이 가리키는 축은 폐지됐는데 화면에는 남아 있다. 문구를 임의로 바꾸지 않는다. 계열 재배정은 기획 결정 → `/game-design`
- **스킬 탭이 옛 구조를 그린다** (§7) — 문서의 표가 **목표 상태**고 화면은 미반영이다. "버그"로 보고 고치지 말고 개정 범위를 먼저 확인한다
- **물리 스테이지도 원소 칸을 찍는다** (§4-1) — 칸이 사라지면 "아직 안 정해졌다"로 읽힌다. 숨기지 않는 쪽이 결정이다
- **영어가 길어 칸이 넘친다** — 폭 정책과 길이 배수는 [src/ui/README.md](src/ui/README.md). 라벨 칸에 고정 px 을 주면 영어에서 깨진다
- **폰트는 CDN 의존** — 오프라인이면 폴백 폰트로 떨어진다 ([ARCHITECTURE.md §8](docs/client/ARCHITECTURE.md) · [DEV_PLAN.md §4](docs/client/DEV_PLAN.md) 부채 #11). 헤드리스 스크린샷에서 글꼴이 달라 보이는 원인도 이것이다
- **`?tab=` 은 `?dev=` 뒤에 걸린다** (§10 · [INTERFACE.md §8](docs/client/INTERFACE.md)) — 앞에 두면 `startGame()` 이 탭을 원정으로 되돌려 먹히지 않는다
- **툴팁 넘침 보정은 이미 있다** — `moveTip` 이 화면 밖으로 나가면 반대쪽으로 접는다. 새로 짜지 않는다
- **언어를 바꿔도 같은 타임라인을 다시 재생한다** (§4-2) — 재생기는 계산하지 않으므로 언어 전환이 결과를 바꾸지 않는다
- **재생기는 모르는 이벤트를 조용히 무시한다** ([DEV_PLAN.md §4](docs/client/DEV_PLAN.md) 부채 #6) — 타임라인 이벤트를 늘리면 화면이 아무 말 없이 빈다. 이벤트를 건드리는 작업은 `/client` 와 같이 간다

## 보조 파일

| 파일 | 어느 단계에서 |
|---|---|
| [ui_conventions.md](ui_conventions.md) | 3단계 구현 — `src/ui/` 의 실제 규약 (렌더 흐름 · 헬퍼 · 명명 · CSS 토큰 · 재생기) |
| [verify.md](verify.md) | 4단계 검증 — 한국어 리터럴 검사 · ko/en 헤드리스 스크린샷 · 렌더 예외 · 단정 유지 |

## 다음 추천 행동

- 계산 · 공식 · 정산 · 난수 · 세이브 스키마가 필요하면 → `/client` (렌더러는 계산하지 않는다)
- 문구가 가리키는 뜻 · 계열 · 라벨 같은 기획 결정이 필요하면 → `/game-design`
- **사용자에게 "다음으로 실행할까요?" 라고 묻지 않는다** — 추천만 적고 끝낸다

## 사용자 요청: $ARGUMENTS

---
*마지막 업데이트: 2026-08-27 (최초 작성)*
