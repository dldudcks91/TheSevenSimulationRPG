# PLAN — 스킬 도안 · 책 제작 삭제 · 도서관 예전 짜임 (2026-11-15)

> 사용자 결정 (2026-11-15 대화) — 「스킬도안으로 생성하는걸 없애고 몬스터 사냥, 탐험이랑 연구소 … 등으로 일단 얻게하자」 · 「상단 책 판매도 넣어 다양하게」 · 「일단 스킬 북 제작을 삭제하고 스킬 업그레이드만 내버려두자」 · 「모두 그렇게 수정하자 오래걸려도 좋으니 꼼꼼하게」 · 「전직창은 예전스타일로 밖으로 빼주면」
> 실행자는 이 파일의 D 목록만 따른다. 목록 밖의 개정은 하지 않는다(보이면 보고만).
> DEV_PLAN 행 = **R504** (메인이 올린다).

## 결정 (D1 ~ D12)

| # | 결정 |
|---|---|
| **D1** | **스킬 도안을 없앤다** — 재고(`state.blueprints`) · 처치 도안 드롭 · 상단 도안 · 연구소 도서관 줄의 도안이 **모두 스킬북(책)** 으로 바뀐다. 얻으면 바로 책 재고(`state.books`)에 쌓이고 바로 배운다 · 업그레이드에 쓴다 |
| **D2** | **도서관 「스킬 북 제작」을 없앤다** — `craftBook` · `craftGate` · `bookState.craft` · 키 `book_craft_gold` · `book_craft_herb` · `book_craft_dust` 삭제. 스킬 성장(배우기 · 업그레이드)은 책만 먹는다(10-28 그대로). 스킬 업그레이드는 그대로 둔다 |
| **D3** | **책의 출처 = 처치 드롭 · 탐험 동굴 · 연구소 도서관 줄 · 상단 · 첫 책 보상** — 처치: 지금 도안 자리 그대로(처치당 1개 · 장비냐 책이냐 `drop_book_pct` · 그 몬스터가 든 칸 · 몬스터 전용 제외 · 장 보스 고유는 책이 나온다). 상단: 1티어 직업 스킬 책(10-22 그대로 · `shop_book_count` · `shop_book_gold` · 교체는 무료 1시간 쿨다운이라 시간이 속도를 정한다). 연구소 도서관 줄: 등록한 영웅이 가진 기본 스킬(고유 · 배운 칸 중 무작위 · 상한에 닿은 스킬도)의 **책**을 시간마다. 첫 책 보상: 그대로 |
| **D4** | **탐험 동굴 보상에 책이 섞인다** ⚠임시 — 동굴 보상 칸마다 `[balance.csv:explore_cave_book_pct]`(신규 · ⚠임시 0.25) 확률로 장비 대신 책 한 권 · 후보 = 상단 후보와 같은 1티어 직업 스킬(`shopBookPool`) · rng 는 동굴 보상 스트림 안에서 굴린다. 보상의 양 · 종류 전체는 GAME_DESIGN §10 「탐험 상세」 ③ 그대로 미정 |
| **D5** | **도박장은 책을 안 준다** — 「골드와 재료만」(base_expedition_design §2 D3) 그대로. 근거: 판돈(쌓인 골드)을 그 자리에서 영구 성장으로 바꾸는 장치가 된다 — 거른 안으로 남긴다 |
| **D6** | **책 분해 → 가루** — 창고 스킬북 탭에서 고른 책 1권을 분해하면 최하급 가루 `[balance.csv:book_salvage_dust]`(신규 · ⚠임시 5). 상한을 넘은 책(연구소 줄이 상한 스킬도 낸다)의 출구. 어떤 책이든 된다 · 확인 창 없음 · 한 번에 1권 |
| **D7** | **도서관 r2 가 여는 것 = 연구소 「도서관」 줄 하나** — 건물 기능 id `book_craft` → **`lab_library`** (`building_effect.csv` · `construction.js` · `hasFeature` · 화면 잠김 문구). 키 `lab_blueprint_hours` → **`lab_book_hours`** · `admin_blueprints` → **`admin_books`**(관리자 Books [Add]) |
| **D8** | **옛 세이브** — 버전 무변경. 불러올 때 `state.blueprints` 의 장수만큼 같은 책을 `state.books` 에 더하고 키를 지운다 · `shop.blueprints`(산 칸 번호) → `shop.books` · 리포트의 `blueprints` → `books` · 연구소 정산 필드도 `books` 로 |
| **D9** | **영원한 원칙(기획 근거로 적는다)** — 「영구 성장(스킬 레벨)은 속도로 준다 — 쌓인 재고를 그 자리에서 영구 성장으로 바꾸는 장치를 두지 않는다」. 방치형이라 재고가 크게 쌓이므로 그런 장치는 끝을 한 번에 데려온다. 장비는 갈아입어 끝이 안 와서 재고형(강화)이 된다 |
| **D10** | **거른 안 (기획서 「거른 안」에 한 줄씩)** — ① 책을 바로 주고 읽을 때 재화를 낸다 ② 도안 = 스킬마다 획득 조건으로 여는 영구 레시피 + 재료로 제작(재고 → 즉시 성장 · 조건 55개 비용) ③ 도박장 출처(D5) |
| **D11** | **도서관 화면 = 예전 짜임(11-13 커밋 c21fac53 의 SCREEN_DESIGN §17)에서 제작 카드만 빠진 모양** — 영웅 띠 아래 **두 열**: **왼쪽 = 전직 패널**(폭 = 영웅 띠 카드 7칸 · ADR-0852 · 머리 = 고른 영웅 줄 + 지금 가진 스킬 카드 셋 + 같은 줄 오른쪽 골드 비용 · [전직](ADR-1000) · 갈래 셋 세로로 쌓인 카드 — 왼쪽 칸 이름 + 설명 · 오른쪽 전직 스킬 셋 한 줄씩(1 : 4) · 고른 갈래 파란 테두리 · 전직 중 막대 · 전직 뒤 주황 테두리(ADR-0592) · 전직이 안 열렸으면 갈래 자리만 잠김 베일(ADR-0595 · 0404)) · **오른쪽 = 스킬 업그레이드 카드 하나가 열 전체 높이**. **걷는 것** — 스킬정보 패널 · 전직의 방 칸 · 전직의 방 창 · 창 옆 마스터리 판 카드 · 계기판 · `&lib=adv` · 「맨 위 갈래가 골라진 채」(ADR-1189). [전직] 은 갈래를 골라야 켜진다(§3 「고르고 누른다」 — 1189 의 한 번 누름 예외를 거둔다). 그 뒤 결정 중 살릴 것 — ADR-1190(전직 스킬 레벨 없음) · D2 Min 의 스킬 칸 규칙(ADR-0882 등) · 덮어쓰기 확인 창(ADR-1020) |
| **D12** | **화면에서 도안이 사라진다** — 상단 맨 윗줄의 도안 셋 → 책 셋 · 리포트 획득 격자의 도안 칸 → 책 칸 · 도감 스킬 툴팁 둘째 장(획득처 · 「책이 서던 칸에 도안」 ADR-0680) → 책 · 연구소 도서관 줄 문구 · 건설 탭 도서관 r2 여는 것 문구 · 탐험 동굴 결과에 책 · 창고 스킬북 탭에 [분해] · 도움말 스킬북 문단 · 관리자 판 Books [Add] |

**장비 제작의 「도안」(대장간 제작 · 유니크 제작 도안 · 폭식 제작의 도안 · `make_recipe.csv` · `commission_kind.csv:craft`)은 그대로다 — 손대지 않는다.** 스킬 도안만 지운다.

## 계약 (game_logic ↔ ui) — INTERFACE.md 가 이 표를 받는다

| 지금 | 바뀐 뒤 |
|---|---|
| `game.bookState(state, uid)` → `{open, need, books, craft, hero}` | `{open, need, books, hero}` — `craft` 없음 |
| `game.craftBook(state, id)` | **삭제** |
| — | **`game.salvageBook(state, id)`** → `{ok: true, dust}` · `{ok: false, err: 'book'}`(책이 없다) · `'missing'`(책이 안 되는 id) |
| `state.blueprints` | **삭제**(불러올 때 책으로 — D8) |
| 리포트 `blueprints: [{id}]` | `books: [{id}]` |
| `battle` 결과 `blueprints` · 유닛 `blueprintSkills` · 보상 카드 `{blueprint}` | `books` · `bookSkills` · `{book}` |
| `shopState().blueprints` · `state.shop.blueprints` · `game.shopBlueprintBuy` · `game.shopBlueprintPool` | `books` · `state.shop.books` · **`game.shopBookBuy`** · **`game.shopBookPool`** |
| 연구소 정산 `{…, blueprints, books}` · `labSettle` 의 `blueprints` | 책 하나로 합친다 — `books` |
| 탐험 동굴 결과(장비 배열) | 장비 + 책(`books: [skillId]` — 모양은 B 가 INTERFACE 에 적고 C 가 따른다) |
| 기능 `book_craft` | `lab_library` |
| 거절 코드 `bk.err.blueprint` · 플래시 `bk.crafted` | 삭제 |

## 갈래 · 파일 담당 (겹치지 않는다)

| 갈래 | 실행자 | 파일 |
|---|---|---|
| **A 기획** | 에이전트 A | `docs/game_design/*.md` (DECISION_LOG 제외 — 아카이브라 안 고친다) |
| **B 로직 · 데이터** | 에이전트 B | `docs/client/INTERFACE.md` · `src/game_logic/*.js` · `src/data/*.csv` · `src/dev/test.js` 의 **로직 단정** · `src/dev/golden.js` · `golden.json` |
| **C 화면** | 에이전트 C | `docs/client/SCREEN_DESIGN.md` · `docs/client/adr/*`(새 ADR + 대체 표시) · `adr/README.md` · `SCREEN_CHANGELOG.md` · `MOBILE_UI.md` · `src/ui/*` · `src/dev/test.js` 의 **화면 단정**(DOM) |
| **메인** | 메인 | 이 파일 · `DEV_PLAN.md`(R504) · 검수 · 보고 |

`test.js` 는 B 와 C 가 같이 만진다 — **같은 단정을 둘이 고치지 않는다**(B = `SYS.game.*` 단정 · C = DOM 단정). 수정은 정확한 old 문자열 매칭으로만.

## 병렬 세션 주의

다른 세션이 지금 `state.js` · `app.js` · `test.js` · `i18n.js` · `style.css` · `balance.csv` · `GAME_DESIGN.md` · `base_expedition_design.md` · `SCREEN_DESIGN.md` · `INTERFACE.md` 를 고치고 있다(수색 대기 등 — R503). **그 변경을 되돌리거나 덮지 않는다** · 고치기 전에 다시 읽는다 · `git checkout` · `git stash` · 파일 통째로 쓰기 금지. 서버 8777 은 사용자 것 — 끄지 않는다. 검증 서버는 `serve.py <세션 포트>` 를 `Start-Process` 로(이미 물린 포트엔 안 띄운다).

## 검증

1. `grep` — 스킬 도안 흔적 0: `blueprint`(장비 제작 `make_recipe` 계열 제외) · `craftBook` · `book_craft` · `lab_blueprint_hours` · `admin_blueprints` · 화면 문구 「도안」 중 스킬 도안
2. `dev/test.html` 전부 PASS (골든 제외 후 → 의도한 변경 확인 뒤 골든 재촬영 — `src/dev/README.md` 「다시 찍는 법」)
3. 옛 세이브 단정 — 도안 n장이 든 세이브를 불러오면 같은 책 n권 · `blueprints` 키 없음 · 상단 산 칸 유지
4. 화면 — 도서관(전직 전 · 전직 중 · 전직 뒤 · 전직 안 열림) · 상단 · 리포트 · 창고 스킬북 [분해] · 연구소 도서관 줄 · 도감 툴팁 · 탐험 동굴 결과를 한영으로 캡처해 확인
