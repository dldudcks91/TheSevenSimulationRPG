# PLAN — 설정 하위 탭 + 아이템 그림 Gemini / Codex 전환

> 사용자 요청(2026-11-11): 「설정탭을 좀 여러개로 나누고, 그중에 화면 탭 만들어서 거기에 gemini랑 codex만들어서 codex와 gemini 아이템 변경하면서 볼 수 있게 … 없으면 검정화면으로 나오도록」
> 상태: **ADR-1050 만 썼다** — 코드 · 그림 설치 · SCREEN_DESIGN 은 아직 손 안 댔다. 이 문서를 보고 이어서 한다.

## 정한 것

| # | 결정 |
|---|---|
| D1 | `⚙` 판의 **설정 탭 맨 위에 하위 탭 셋** `게임` · `화면` · `연출` — 판의 탭(설정 · Palette · Save)은 그대로 · 열면 `게임` · 페이지를 연 동안은 마지막 하위 탭 기억(ADR-1050 — 이미 씀) |
| D2 | 줄 배정 — **게임** = 초반 안내 · 닉네임 / **화면** = 아트 스타일(초상 스타일 둘 이상일 때만) · **아이템 그림** · 로그 · Skin / **연출** = 스킬 이펙트 · 이펙트 그림체 · 이펙트 투명도 · 기본 공격 이펙트 · 피격 반응 · 피격 시 흔들림 · 공격 시 흔들림 · Focus |
| D3 | **아이템 그림** 줄 `Gemini` · `Codex`(기본 Gemini) — 누르면 `render()` 전체 다시 그림 · localStorage(`thesevensim.itemArt`) · `?itemart=codex` 는 그 로드에서 저장까지(초상 `?face=` 와 같은 문법) |
| D4 | **고른 묶음에 그림이 없으면 검은 칸** — 두 묶음 모두. 부위 이모지 · 같은 무기군 대신 그림(R445 임시)으로 안 떨어진다. 스킬 아이콘 검은 칸(ADR-0162 · `.sk-noart`)과 같은 칸 |
| D5 | Gemini = 지금 설치본(`weapon_base/` 70장 중 CSV 58 + 퇴역 12 · `item_base/`) · Codex = **무기 베이스 100장만**(방어구 · 장신구는 Codex 에서 전부 검은 칸) |
| D6 | `baseId` 없는 옛 무기 — Gemini 는 지금처럼 `uid` 해시 그림 · Codex 는 검은 칸 |
| D7 | 도감 아이템 › 무기 묶음 = **`weapon_base.csv` 100행**(CSV 순 · 이름 `L(row)`) · 그림 = 고른 묶음 · 없으면 검은 칸 · 퇴역 12 는 도감에서 빠진다 |

## 할 일

1. **그림 설치**
   - 타일 100장: `C:\Users\user\AppData\Local\Temp\claude\161d4b6ce62a422c\4796b190-3741-4a43-84c6-c1d94320cc1d\scratchpad\wb_codex\tiles\<group>\<base_id>.png`(512 PNG) → `src/assets/art/icons_source/items/weapon_base_codex/<group>/<base_id>.png`
   - ⚠ 스크래치 폴더는 세션이 끝나면 사라질 수 있다 — 먼저 옮겨 둔다. 원본 시트 30장(`wb_codex/sheets/`)은 `icons_source/items/source/codex_weapon/` 에
   - `scripts/build_icons.py` 의 `GAME_DIRS` 에 `"items/weapon_base_codex/*"` 추가 → 빌드. ⚠ 전체 빌드는 다른 아이콘을 다시 구울 수 있다 — 끝나고 `git status` 로 내 폴더 밖 변경은 되돌린다
2. **`src/ui/mock.js`**
   - `ITEM_ART_SOURCES = ['gemini', 'codex']` · `itemArtSource()` · `setItemArtSource(id)`(`FACE_STYLES` 블록 문법 그대로)
   - `WEAPON_BASE_CODEX_DIR = './assets/art/icons/items/weapon_base_codex/'` · `WEAPON_BASE_CODEX_STEMS`(무기군 → CSV id 10개)
   - `itemArt(slot, group, uid, baseId, src = itemArtSource())` — codex: 무기 + 목록에 있으면 경로 · 아니면 null / gemini: `baseId` 있으면 `WEAPON_BASE_STEMS` 에 있을 때만 경로(대신 그림 해시 삭제) · `baseId` 없으면 uid 해시 / 방어구 · 장신구: codex 는 null
3. **`src/ui/app.js`**
   - `itemImg` — `src ? <img> : it ? '<i class="it-noart"></i>' : ''`(이모지 폴백 삭제)
   - `settingsBody()` — 맨 위 `.set-panes` 에 `segmented(['game','screen','fx'])` · 모듈 변수 `setPane` · 기존 줄 블록을 D2 대로 나눠 담는다 · 화면 탭에 아이템 그림 줄(`M.setItemArtSource(id); render();`)
   - 도감 `codexItem` 의 무기 분기 — `D.weaponBases[g]` 행으로 타일 · `M.itemArt('weapon', g, null, b.id)` · 머리 경로는 고른 묶음 폴더 · `artTile` 에 그림 없을 때 넣을 html 인자 하나 추가(검은 칸)
4. **`src/ui/tip.js`** — `tipItemImg` 도 같은 검은 칸
5. **`src/ui/i18n.js`** — `set.pane.game` 게임/Game · `set.pane.screen` 화면/Display · `set.pane.fx` 연출/Effects · `set.itemArt` 아이템 그림/Item Art · `set.itemArt.gemini` · `set.itemArt.codex`(둘 다 ko · en 같은 이름). `ix.b.*` 는 도감이 CSV 이름을 쓰면 안 쓰인다 — 지울지 결정
6. **`src/ui/style.css`** — `.sk-noart` 규칙에 `.it-noart` 를 같이 건다 · `.set-panes { grid-column: 1 / -1; padding-bottom; border-bottom }`
7. **`src/dev/test.js`** — `csv: weapon_base …` 단정의 그림 부분(지금 「대신 그림」 검사)을 바꾼다: Gemini = 설치된 것만 경로 · 나머지 null / Codex = CSV 100 전부 · `WEAPON_BASE_CODEX_STEMS` = CSV / Codex 의 방어구 · baseId 없는 무기 = null / Gemini 의 baseId 없는 무기 = 그림 있음. **`itemArt` 에 묶음을 직접 넘긴다**(localStorage 에 codex 가 남아 있어도 단정이 안 흔들리게). 이모지를 말하는 단정 제목 · 주석(item_base 그림 단정)도 「검은 칸」으로
8. **문서**
   - SCREEN_DESIGN §2-2 — 하위 탭 행 · 아이템 그림 행 추가 · 아트 스타일 / 닉네임 / 초반 안내 / Focus / Skin 의 「몇째 줄」 문구 갱신 · 결정 기록에 ADR-1050 · 1051
   - SCREEN_DESIGN §2 「아이템 그림」 행을 지금 상태로 다시 쓴다(지금 글은 R445 이전 「7장 중 하나」 · 「이모지로 떨어진다」에 머물러 있다) · §8-2 제작 줄 「그림이 없으면 부위 이모지」 → 검은 칸 · §9-1 무기 베이스 묶음 문단(CSV 100 · 고른 묶음) · §10 개발 URL 표에 `?itemart=`
   - ADR-1051 새로(아이템 그림 두 묶음 · 없으면 검은 칸 · R445 대신 그림과 아이템 이모지 폴백 대체) · `python docs/client/adr/_build_index.py`
   - SCREEN_CHANGELOG 맨 앞 한 줄 · `src/dev/README.md` 개발 URL 표에 `?itemart=` · `src/assets/art/README.md` 에 `weapon_base_codex/`
   - R445 의 「그림이 없으면 같은 무기군 그림을 대신 든다」를 적은 곳 정정 — item_design 「남은 것」 「신규 무기군 베이스 데이터」 행 · GAME_DESIGN §10 색인 줄 · DEV_PLAN R445 행 · art README · test.js 주석 → 남은 일은 「어느 그림 판을 쓸지(Gemini 42 빔 / Codex 100)」

## 검증

- `dev/test.html` PASS(작업 폴더 — 다른 세션 변경이 섞여 있으니 실패가 내 것인지 갈라 본다) · 골든은 안 바뀐다(그림은 rng 밖)
- 헤드리스 스크린샷 ko · en: ⚙ 판 세 하위 탭 · `?itemart=codex` 로 가방 / 도감 무기 묶음 · Gemini 로 같은 화면(새 42 칸이 검은 칸인지)
- 렌더러 한국어 리터럴 0 · 줄바꿈 섞임 없음

## 참고

- 검수 페이지(Codex 100 vs 지금 설치본): https://claude.ai/artifact/2XuyUrmzLQzKuGyPRNhkHG
- Codex 생성 스크립트 · 자르기 · 몽타주: 스크래치 `wb_codex/run.py` · `assemble.py` · `build_page.py`
- 커밋은 안 했다 — 사용자가 말할 때만

---
*마지막 업데이트: 2026-11-11*
