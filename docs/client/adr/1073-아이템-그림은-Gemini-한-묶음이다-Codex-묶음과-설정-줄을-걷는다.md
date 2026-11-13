# ADR-1073 — 아이템 그림은 Gemini 한 묶음이다 · Codex 묶음과 설정 줄을 걷는다

| | |
|---|---|
| **상태** | 확정 · 2026-11-13 |
| **화면** | [SCREEN_DESIGN §2](../SCREEN_DESIGN.md) · §2-2 · §9-1 · §10 |
| **정한 사람** | 사용자 지시(「이대로 확정해보자 일단 codex꺼 모두 삭제해」 2026-11-13 → 설정 줄 삭제 · Gemini 100장 설치 둘 다 추천안 선택) / 옛 무기 해시를 앞 일곱에 묶는 것은 제안 |
| **대체** | [ADR-1051](1051-아이템-그림은-Gemini-와-Codex-두-묶음-중-설정에서-고르고-없으면-검은-칸이다.md) 의 두 묶음 · 설정 `화면` 탭 「아이템 그림」 줄 · `?itemart=` (「없으면 검은 칸」은 그대로 산다) |
| **대체됨** | — |

## 결정

아이템 그림 묶음은 **하나**다 — 설치본(`icons/items/weapon_base/` · `icons/items/item_base/`). 설정 `화면` 탭의 「아이템 그림」 줄(`Gemini` · `Codex`)과 URL `?itemart=` 를 걷고, Codex 무기 그림(설치본 · 원본 · 시트)은 파일째 지운다. 같은 날 Gemini 판 무기 베이스 100장(`weapon_base.csv` 전 행)을 설치했다. 그림이 없는 아이템은 ADR-1051 그대로 **검은 칸**이다. `baseId` 없는 옛 무기의 `uid` 해시는 무기군마다 **설치 목록의 앞 일곱**(R445 전 일곱)에서만 고른다 — 그림을 더 넣어도 옛 개체의 그림이 안 바뀐다.

## 맥락

ADR-1051(11-12)은 Codex 100장과 Gemini 판을 게임 안에서 견주려고 설정 줄을 세웠다. 11-12 · 11-13 이틀 동안 Gemini 판을 칸마다 다시 그려(무기 비교 페이지 v17 · 다시 그림 56칸) 사용자가 그 판으로 확정했다. 그날 게임의 Gemini 설치본은 CSV 100행 중 58장이었고 나머지 42칸은 검은 칸이었다. 옛 무기 해시는 `WEAPON_BASE_STEMS` 줄 전체 길이로 나눠 골랐고, 줄은 무기군마다 일곱이었다.

## 근거

- **묶음 줄은 견주기 위한 장치였다** — 견줄 상대가 사라지면 고를 것이 하나라 줄이 빈다. 아트 스타일 줄도 고를 것이 하나면 안 선다(ADR-0986). 남겨 두면 `Codex` 를 고른 브라우저는 무기가 전부 깨진다
- **Codex 파일은 지운다** — 사용자 지시. 설치하지 않을 판을 저장소에 두지 않는다(원본 시트도 같다)
- **해시는 앞 일곱** — 줄이 10 ~ 13 으로 늘면 나머지가 바뀌어, 「개체마다 평생 같은 그림」(SCREEN_DESIGN §2)이 깨진다. 일곱으로 묶으면 옛 개체가 받던 그림이 그대로다

**버린 안**

1. **설정 줄은 두고 Codex 만 비운다** — 고르면 깨지는 버튼이 남는다
2. **해시를 전체 줄로 다시 고른다** — 옛 무기의 그림이 이번 설치로 바뀐다

## 파급

- `mock.js` — `ITEM_ART_SOURCES` · `itemArtSource` · `setItemArtSource` · `WEAPON_BASE_CODEX_DIR` · `WEAPON_BASE_CODEX_STEMS` 삭제 · `itemArt` 다섯째 인자(묶음) 삭제 · `WEAPON_BASE_STEMS` 에 CSV 새 이름 42 를 줄 뒤에 붙임 · 해시 풀 `WEAPON_BASE_HASH_POOL`
- `app.js` 설정 `화면` 탭의 줄 · 도감 무기 탭의 폴더 고르기 · i18n `set.itemArt` · `set.itemArt.gemini` · `set.itemArt.codex` 삭제 · `scripts/build_icons.py:GAME_DIRS` 에서 `items/weapon_base_codex/*` 삭제 · `dev/test.js` Codex 단정 → 해시 앞 일곱 단정
- ⚠ 이미 `Codex` 를 고른 브라우저의 localStorage `thesevensim.itemArt` 는 남지만 아무도 안 읽는다

---
*이 파일은 고치지 않는다. 결정이 뒤집히면 새 ADR 이 이것을 대체하고, 여기엔 「대체됨」 한 줄만 붙는다.*
