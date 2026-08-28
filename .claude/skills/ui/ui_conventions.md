# ui_conventions — `src/ui/` 구현 규약

SKILL.md 3단계(구현)에서 편다. 코드에서 **실제로 쓰이는 것만** 적었다 — 새 규약을 여기서 발명하지 않는다.

- [1. 파일 경계](#1-파일-경계)
- [2. 렌더 흐름](#2-렌더-흐름)
- [3. 전역과 화면 상태](#3-전역과-화면-상태)
- [4. DOM 헬퍼와 함수 분할](#4-dom-헬퍼와-함수-분할)
- [5. 공통 부품](#5-공통-부품)
- [6. 다국어](#6-다국어)
- [7. 셸 DOM](#7-셸-dom)
- [8. style.css](#8-stylecss)
- [9. 관전 재생기](#9-관전-재생기)
- [10. 개발용 URL](#10-개발용-url)

---

## 1. 파일 경계

| 파일 | 여기서 만진다 |
|---|---|
| `src/ui/app.js` | 화면 렌더링 전부. 계산·난수 없음 |
| `src/ui/battle.js` | 관전 = 타임라인 재생기 |
| `src/ui/i18n.js` | UI 문구 사전 + 언어 상태 |
| `src/ui/style.css` | 스타일 |
| `src/index.html` | 셸 뼈대 · 폰트 링크 |
| `src/ui/mock.js` | **표시 사전 쪽만** — 이름 ko/en · 아이콘 · 얼굴 · 색 |

- `src/ui/data.js`(조립) · `src/ui/storage.js`(저장 어댑터)는 이 스킬의 범위가 아니다 → `/client`
- `mock.js` 는 이중 성격이다 — 표시 사전과 **game_logic 에 주입되는 게임 데이터**가 섞여 있다 ([ARCHITECTURE.md §9](docs/client/ARCHITECTURE.md) · [INTERFACE.md §7](docs/client/INTERFACE.md)). 주입 쪽을 건드리면 `/client` 와 같이 간다
- `src/data/inherited/` · `src/assets/art/backgrounds/` 는 읽기 전용, `src/assets/art/faces/` 는 아니다 ([CLAUDE.md](CLAUDE.md) 규칙 3)

## 2. 렌더 흐름

`app.js` 의 `render()` 하나가 화면 전체를 다시 그린다.

```
render()
  stopBattle?()             재생 중이면 먼저 정리
  applyDocumentLang()       <html lang> · <title> 동기화
  SYS.game.tickInjuries(G)  + state.heroUid 유효성 보정
  renderShell()             탭 내비 · crumb · 자원 · 언어 토글
  main.innerHTML = ''  →  render<탭>(main)
  state.flash 가 있으면 .flash 한 줄을 prepend 하고 지운다
  hideTip()
```

- 부분 갱신 없음. 상태를 바꾼 다음 `render()` 를 부른다
- 상태를 바꾸는 `SYS.game.*` 호출 뒤에는 `save()` — 실패(`{ok:false, err}`)면 저장하지 않고 `flash()`
- 렌더 중 예외는 `boot()` 의 `catch` 가 `.main` 에 문자열로 찍는다 — 화면이 통째로 비면 콘솔이 아니라 여기를 본다

## 3. 전역과 화면 상태

- `D`(CSV 파생) · `SYS`(시스템 묶음) · `G`(세이브 상태) 세 전역 — 정의는 [ARCHITECTURE.md §3](docs/client/ARCHITECTURE.md). `G` 가 `null` 이면 시작 화면
- 화면 상태는 `app.js` 의 `state` 객체 하나다 (`screen` · `tab` · `exp` · `heroUid` · `codexChapter` · `slotFilter` · `roll` · `candidates` · `confirmOverwrite` · `salvageMode` · `flash` · `battle`). **세이브에 들어가지 않는다** — 새 화면 상태도 여기 붙인다
- 시계는 `now()` = `Date.now()`. **UI 층에서만 읽어** 로직에 `now` 인자로 넘긴다
- 난수는 `makeRng(seed)` 를 만들어 넘길 뿐, 렌더러가 굴리지 않는다 (시작 후보는 `ROLL_SEED` 고정 시드 — 같은 리롤 횟수면 같은 후보)

## 4. DOM 헬퍼와 함수 분할

- `$(sel)` = `document.querySelector`
- `el(tag, cls, html)` — 태그를 만들고 `className` · `innerHTML` 을 세팅한다. **DOM 생성은 이것만 쓴다**
- 이벤트는 `node.onclick = …` 프로퍼티 할당. 전체 재렌더라 해제가 필요 없다
- 이름 층위: `render<탭>(main)` → `<이름>Panel(h)` → `<이름>Row(...)` / `<이름>Card(...)` → 조각 헬퍼
- 파생값 헬퍼는 파일 상단에 한 줄 화살표 함수로 모은다 (`heroById` · `itemOf` · `wornItems` · `combatOf` · `injured` · `className` · `sinName` · `rarity` …). 같은 계산을 렌더 함수 안에서 다시 쓰지 않는다
- 섹션은 `/* ═══ 이름 ═══ */` 주석으로 가른다
- 모듈 머리에 헤더 주석 — 역할 · 결정 이력(날짜 + 무엇이 왜 바뀌었나) · i18n 규약 · 화면 흐름 · 개발용 URL. 규약을 바꾸면 이 주석도 같이 고친다

## 5. 공통 부품

| 부품 | 모양 | 규약 |
|---|---|---|
| `segmented(items, current, onPick)` | `items = [{id, label, disabled?}]` | `.segmented` 안의 `btn sm`(현재는 `on`). 탭 안의 상태 전환에 쓴다 — 원정 세그먼트 · 도감 챕터 · 도움말 점프 |
| `flash(key, params)` | i18n 키 | `state.flash` 에 담기만 한다. 다음 `render()` 가 한 번 보여주고 지운다. **문자열을 직접 넣지 않는다** |
| `heroStrip(onPick)` | `.panel.hs-panel` > `.hero-strip` > `.hs-card` | 캐릭터·스킬·선술집이 **같은 띠, 같은 자리, 같은 순서**로 쓴다. 카드 = 초상 + 이름 + `heroDoing(h)`(치료 중 > 전투 파티 > 대기). 직업·레벨·죄종·등급은 `title` 툴팁. 빈 칸은 `D.balance.roster_cap` 까지 |
| `heroDoing(h)` | `{cls, text}` | 파견이 생기면 파견지가 여기 들어온다 ([SCREEN_DESIGN.md §5](docs/client/SCREEN_DESIGN.md)) |
| `bindTip(node, item, equipped, hint)` | | `#tooltip` 에 `tipCard` 를 붙인다. `equipped` 를 주면 비교 두 장. 위치·넘침 보정은 `moveTip`, 해제는 `hideTip` |
| `helpSections()` | `[{title, lead?, groups:[{h, sub?, body:[]}]}]` | 도움말 본문. **기존 `t()` 키를 재사용**하고 파라미터도 인게임과 같은 값(`D.balance.*` · `D.eliteRounds` · `D.bossRound` · `D.codexLevels`)을 넣는다 |

## 6. 다국어

- `t(key, params)` — 미등록 키는 **키 문자열 그대로** 화면에 나온다(누락이 눈에 띄게). `en` 이 없으면 `ko` 로 폴백되므로 **화면이 안 깨진다 = 자동 검증이 못 잡는다.** 키를 추가할 때 두 언어를 같이 쓴다
- `L(v)` — `{ko, en}` 쌍을 현재 언어로 푼다. 평문 문자열은 그대로 통과(고유명사·숫자)
- `{x}` 치환은 `t(key, {x: …})`. 어순 차이는 템플릿이 흡수한다
- 언어 전환은 우상단 토글 · `?lang=en` · localStorage. `applyDocumentLang()` 이 `<html lang>` 과 `<title>` 을 맞춘다
- `localStorage` 접근은 `i18n.js` 안에서만 한다(세이브 어댑터는 `storage.js` 뿐이라는 계약과 별개인 UI 환경설정)
- CSV 로 이사할 때 `{ko, en}` 쌍은 `_kr`/`_en` 컬럼 쌍이 된다 — 문구를 조각내면 그 이사가 막힌다

## 7. 셸 DOM

`src/index.html` 의 뼈대는 고정이다. 렌더러는 이 자리들만 채운다.

- `.brand` · `.topbar`(안에 `.crumb` · `.resources`) · `.nav` · `.main` · `#tooltip`
- 새 상시 요소가 필요하면 여기에 자리를 만들고 [SCREEN_DESIGN.md §2](docs/client/SCREEN_DESIGN.md) 공통 셸 표에 행을 추가한다
- 폰트 두 벌은 `<head>` 의 CDN 링크. 오프라인 폴백은 CSS 변수의 폴백 스택이 담당한다

## 8. `style.css`

- **`:root` 토큰만 쓴다.** 색·크기 값을 규칙 안에 직접 쓰지 않는다
  - 배경 `--bg-primary` `--bg-secondary` `--bg-tertiary` `--bg-card` `--bg-input`
  - 테두리 `--border-primary` `--border-secondary` `--border-highlight` `--border-dark`
  - 글자 `--text-primary` `--text-secondary` `--text-muted` `--text-accent`
  - 의미색 `--color-success` `--color-warning` `--color-error` `--color-info`
  - 폰트 `--font-main`(본문) · `--font-display`(브랜드 워드마크 전용 — 픽셀 폰트라 안티에일리어싱을 끈다)
  - 크기 `--fs-xs` `--fs-sm` `--fs-md` `--fs-lg` `--fs-xl`
- 팔레트는 형제 프로젝트와 공유한다 — 값을 바꾸면 그 사실을 파일 머리 주석에 남긴다
- 섹션 주석 `/* ───── 이름 ───── */` 순서: 게임 화면 기본기 · 셸 · 공통 조각 · 원정 · 로스터 · 장비 · 리포트 · 전투 관전 · 행동 게이지/쿨 게이지 · 서브 바/세그먼트 · 스킬 · 선술집 · 도감 · 페이퍼돌 · 인벤토리 격자 · 접이식 · 캐릭터 탭 · 새 게임 · 초반 루프 실동작 · 도움말 탭. 새 규칙은 해당 섹션 **안에** 넣는다
- **게임 UI 기본기 — 지우지 않는다.** 문서가 아니라 게임 화면이라 셋을 따로 꺼 둔다: 드래그 선택(`user-select`) · 캐럿(`caret-color`) · 마우스 포커스 링(`:focus` 는 끄고 `:focus-visible` 만 남겨 키보드 이동을 보존). 원인이 각각 달라 하나만 꺼서는 안 잡힌다
- 커서는 실제로 눌리는 것에만 준다 — 안 눌리는 카드까지 주면 거짓 신호가 된다
- class 명명: 화면별 축약 접두(`hs-` 영웅 띠 · `ps-` 파티 슬롯 · `ng-` 새 게임 · `cand-` 후보 카드 · `tip-` 툴팁 · `sk-` 스킬 · `battle-`/`b-` 관전 · `mon-`/`codex-` 도감) + 짧은 상태 클래스(`on` · `up` · `down` · `muted` · `empty` · `locked` · `click`)

## 9. 관전 재생기

`src/ui/battle.js` 는 **타임라인 소비자**다 — 계약은 [INTERFACE.md §6](docs/client/INTERFACE.md), 이벤트 정의는 [INTERFACE.md §2-6](docs/client/INTERFACE.md).

- HP 는 이벤트가 실어 온 값을 그대로 쓴다. 재생기는 계산하지 않는다
- `mountBattle(container, opts)` 가 정리 함수를 돌려준다. 렌더러는 그걸 `stopBattle` 에 담아 다음 `render()` 첫 줄에서 부른다. 정리 함수는 재생 위치 `{t, speed, running, tab}` 를 돌려주고, 렌더러가 `state.battle.resume` 에 담아 다음 mount 의 `opts.resume` 으로 넘긴다 — 재렌더(가방 클릭 · 언어 전환)에도 재생이 이어진다 (2026-08-27)
- 배속 · 일시정지 · 건너뛰기는 **재생 속도의 문제**지 결과의 문제가 아니다. 결과는 출발 순간 이미 정산·저장됐다 ([ARCHITECTURE.md §5](docs/client/ARCHITECTURE.md))
- 연출(모션 · 팝업 · 로그 문구)은 재생기의 자유다. 다만 **이벤트 해석을 바꾸는 것은 계약 변경**이다 → [INTERFACE.md](docs/client/INTERFACE.md) 먼저 · `/client`
- 모르는 이벤트·유닛 키는 지금 조용히 무시된다 ([DEV_PLAN.md §4](docs/client/DEV_PLAN.md) 부채 #6)

## 10. 개발용 URL

- 목록은 [SCREEN_DESIGN.md §10](docs/client/SCREEN_DESIGN.md) 과 [src/dev/README.md](src/dev/README.md) — 두 곳이 같은 표를 든다
- `?tab=` 은 `?dev=` **뒤에** 적용된다. 이 순서가 계약이다 ([INTERFACE.md §8](docs/client/INTERFACE.md))
- 새 화면을 만들면 클릭 없이 도달할 `?dev=` 또는 `?tab=` 경로를 같이 만들고 두 표에 행을 추가한다 — 헤드리스 검증이 그 길로만 들어온다
