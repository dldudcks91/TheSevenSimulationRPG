# PLAN — 구형 문서 정리 뒤 남은 일

> 2026-11-20 구형 문서 · 부산물 정리(문서 41 · 스크립트 45 · tmp/ · output/ — git 추적 파일 17,418개 · 약 1.56GB)를 하다 드러난 것을 모았다. 정리 자체는 끝났다 — 지울 파일의 미결 줄은 기획서 「남은 것」 · DEV_PLAN §4 로 옮겼다. **커밋은 아직이다**(§0). 이미 다른 문서에 적힌 것은 §4 에서 자리만 가리킨다. 다 처리하면 이 파일을 지운다.

## 0. 커밋 — 사용자가 시킬 때

- 작업 폴더에 정리분이 커밋 안 된 채 있다 — 삭제 17,418 · 고친 문서 31 · 새 파일 `docs/reference/semi_idle_dungeon_survey.md` · 이 파일
- 같은 시각 다른 세션 변경이 섞여 있었다(11-20 12:03 ~ — `src/data/stage.csv` · `src/game_logic/battle.js` · `src/data/README.md` · `output/2026-11-20_t1_mastery/`) — 커밋 전에 `git status` 로 다시 가른다
- 지워도 `.git` 크기는 안 준다(이력에 남는다) — 이력 정리는 하지 않는다

## 1. 사용자가 정할 것

| # | 무엇 | 지금 | 자리 |
|---|---|---|---|
| D1 | **광전사 값이 두 벌** | 11-02 사용자 확정 값 ↔ CSV 에 든 R471 제안 값(11-13) · 동귀어진 「상대 최대 HP 몫」은 데이터 · 코드에 없다 | [PLAN_advance_skills.md](PLAN_advance_skills.md) §3 · `skill.csv` · `advance_node.csv` |
| D2 | **「자동」 태그** | 11-02 확정인데 skill_design §11-2(파생 태그 넷) · `skill_tag.csv` 어디에도 없다 | [PLAN_advance_skills.md](PLAN_advance_skills.md) §4 |
| D3 | **결투장 ③ 「레벨 · 강화를 고정값으로 맞추나」** | 10-26 사용자 「정규화는 불가능해 게임구조적으로」와 부딪힌다 — 과제를 닫을지 | GAME_DESIGN §10 「결투장」 · arena_design 「거른 안」 |
| D4 | **가방이 찼을 때 드롭** | base_expedition 「보상의 시점」 행 「넘친 드롭은 버린다」 ↔ item_design 10-14 · 10-19 「무조건 가루」 | base_expedition_design.md · item_design.md |
| D5 | **tmp/ · output/ 보관 규칙** | 정한 곳이 없어 2.3GB 쌓였다 — 언제 걷나(예: 그 R 행이 닫히면 · 보고서 · harness 만 남긴다) | DEV_PLAN §7 후보 |
| D6 | **정리 때 실행자가 판단으로 옮긴 셋 — 그대로 둘지** | ① 드롭 시드 규칙 ④(보스 첫 판 · 보류)를 arena 가 아니라 base_expedition 「판 번호의 남은 칸」으로 ② 드롭 로직 「거른 안」 6줄을 base_expedition 「거른 안」으로 ③ advance_tree_draft(초안)에 「남은 것」 세 행 — doc_conventions §8 「초안을 남은 것의 집으로 쓰지 않는다」와 어긋난다 → skill_design 「남은 것」으로 옮길지 | base_expedition_design.md · advance_tree_draft.md |

## 2. 문서 손볼 것 — 결정 없이 고치면 된다

| 무엇 | 지금 | 자리 |
|---|---|---|
| 「Lv3 은 효과가 없어」 | 11-18 도감 구간 셋(R539)으로 낡았다 | construction_draft.md 64행 근처 |
| 강신 칸 「전부 미정」 | advance_tree_draft §4-2(11-13)가 이미 채웠다 | PLAN_advance_skills.md §2 |
| 본문 취소선 | CLAUDE.md 「기획서 본문에 취소선 금지」 위반 — `~~` 다섯 줄(「분해의 남은 설계」 행 등) | item_design.md |
| 꼬리 날짜 | 11-13 으로 남았다 — 실제는 11-19 까지 고쳐졌다 | PLAN_mastery_tiers.md |
| 간체 용어집이 둘 | `LOCALIZATION_ZH_GLOSSARY.md` 를 가리키는 곳이 없다 · LOCALIZATION_ZH.md 는 `reference/zh_localization/arpg_glossary.md` 를 용어집으로 링크 — 정본 하나로 | docs/client/ |
| 끊긴 안내 | `tmp/minigame_review` — 없는 폴더 | src/dev/README.md |
| 빈 무시 줄 | `tmp/explore-art-deps/` — 폴더가 없다(받아 쓰는 도구가 있으면 둔다) | .gitignore |
| 틀린 이력 문장 | 「apply_ch2_st4_naga_portraits 는 key_green 을 빌려 써서 남겨 둔다」 — 스크립트를 지웠다 | src/assets/art/faces/source/README.md 501행 근처 |
| 끊긴 링크 2 | R488(MOBILE_GESTURE_PLAN) · R540(PLAN_skill_shard) — 이력 대장이라 뒀다 · 링크만 벗길지 | DEV_PLAN R 행 |
| 지운 PLAN 이름 | 코드 주석 약 30곳(battle.js · state.js · app.js · test.js) · INTERFACE 글자 9곳 — 동작 무관 · 그 코드를 손댈 때 같이 | src/ · INTERFACE.md |
| 크기 상한 초과 | §4 84.8KB · §3-1 56.4KB(상한 30KB) — 원래부터 | DEV_PLAN.md |

## 3. 이번에 안 지운 「확인 필요」

| 대상 | 남긴 까닭 |
|---|---|
| `scripts/build_clean_fx.py` · `build_material_fx.py` | foil 원본(material_20261017)은 있지만 build_clean_fx 의 소스 clean_20261017 이 없다 — 지금 돌아가나 |
| `scripts/prepare_world_fx.py` | 소스 world_styles_20261012 는 살아 있다 — 아직 쓰나 |
| `scripts/build_summon_fx.py` | 10-23 일회성(설치된 kni_might 색 옮김) · 참조 0 |
| `scripts/verify_material_fx.py` | 재질 다섯 검증 — 지금 그림체는 둘(darktoon · foil) |
| `scripts/verify_shop_sale.py` · `verify_confirmed_implementation.py` | 회귀 스크립트 · 절차 문서에 없다 |
| `docs/reference/monster_portrait_prompts.md` | 카툰 흉상 발주 원문 — 스킬이 안 가리킨다 |
| `docs/reference/portrait_art_style_study.md` | art-prompt 스킬 · ADR-0200 이 인용 |
| `docs/reference/ch1_st2_human_gem_prompt.md` | image_generation_tools.md 가 근거로 링크 |
| `docs/reference/background_art_prompt.md` | 참조 0 · 내용은 현행(ADR-0632) |
| `src/assets/art/fx_source/basic_clean_20261008/` | `__pycache__` 만 남은 빈 소스 폴더(추적 안 됨) |
| tmp/ 남은 10개 | 문서가 가리키는 것은 근거 json 뿐 — 스크린샷은 걷어도 된다 |
| output/ 남은 60개 · `snapshot*` 5개 | 근거 링크 · harness 실행용 코드 사본 — D5 를 정한 뒤 |

## 4. 이미 다른 곳에 적힌 것 — 가리키기만

- DEV_PLAN §4 #95 ~ #99 — 영어 「Chapter Boss」 버튼 줄바꿈 · 파티 전술 뒷정리 · 스킬 id 전용 분기 · 부류 버프 화면 · 아트 · 결투장 검사기 · 이식 함수 · 자동 분해 · 찾기 판정
- GAME_DESIGN §10 — 정리 때 새로 올린 「남은 것」(부류 버프 · 전직 트리 구현 · 정신 집중 태그 · 연구소 ⑧ · 판 번호 · 결투장 서버) · 매직찬스 범위 엇갈림은 「희귀도 개정의 남은 칸」

---

*마지막 업데이트: 2026-11-20*
