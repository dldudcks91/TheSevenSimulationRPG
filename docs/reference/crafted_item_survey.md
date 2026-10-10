# 제작품의 옵션 구조 — 참고작 조사

> 상태: **조사 완료** (2026-10-10) · ARPG 8종 · 방치형 · 아시아 RPG 11종 · MMO 7종
> 목적: 「제작품이 드롭 레어와 **구조적으로** 무엇이 다른가」 — 같은 구조에 고르기만 더한 것은 밋밋하다(사용자)는 데서 출발했다. 쓰인 곳: [item_design.md](../game_design/item_design.md) §7-1 · [GAME_DESIGN.md](../game_design/GAME_DESIGN.md) §10 「제작의 남은 설계」
> ⚠ 원전 수치 · 규칙은 그 작품의 것이다 — 본작 SSOT 아님. 조사자 제안은 **제안이지 결정이 아니다**. `[기억]` 표시는 웹으로 다시 확인하지 못한 항목 — 인용 전에 확인한다

## 0. 거른 기준 — 본작 제약

실패 없음 · 같은 장비를 계속 다시 굴리는 고리 금지 · 제작이 드롭보다 언제나 좋으면 안 된다(설계 검증 기준 1) · 모든 밸런스는 PvP 기준 · 무한 수직 금지 · 새 게이지 · 수치 축 지양 · 툴팁은 짧게. 게임마다 두 질문을 물렸다 — ①「제작품이다」를 한눈에 읽는 단서 ②실패 없이 긴장을 무엇으로 만드나.

## 1. 결론 — 세 갈래가 같은 답을 냈다

- **제작품이 달라 보이는 게임은 레시피가 정한 줄을 고정으로 박는다** — D2 크래프트(계열마다 고정 줄 + 랜덤) · Hero Siege 룬워드 · Grim Dawn 블루프린트
- **그 대가로 랜덤 칸 · 성장 칸 하나를 포기한다** — 라그나로크(카드 슬롯 포기 → 속성 · 별) · 검은사막 블랙스타(카프라스 불가 → 전용 옵션)
- **실패 없는 긴장은 확률이 아니라 기회비용이다** — 희소 재료를 어디에 쓰나 · 무엇을 포기하나 · 착용 상한(WoW) · 횟수 총량(Last Epoch · D4 시즌 11)
- **반면교사** — 「같은 구조 + 고르기」(ESO — 단서가 약하다) · 제작이 최상급을 독점(Dungeon Village 2 — 드롭이 죽었다) · 확률 성공 · 재굴림(Aion · TERA · 메이플 큐브 · PoE 대부분)
- **한눈 단서** — 거의 전부 **색 · 아이콘이 다른 줄**(D2 주황 · D4 템퍼 아이콘 · PoE 크래프트 파란 글씨) 또는 **이름에 새긴 정체성**(라그나로크 제작자 · 검은사막 계열명)

## 2. 게임별

### ARPG

| 게임 | 제작품 구조 — 드롭과 다른 점 | 대가 · 공급 잠금 | 본작 제약 |
|---|---|---|---|
| Diablo 2 크래프트 | 매직 베이스 + 보석 · 룬 · 주얼 → 주황 아이템. Blood · Caster · Hitpower · Safety 계열마다 **고정 줄이 반드시** + 아이템 레벨에 따라 랜덤 접사 | 베이스가 매직이어야 · 룬 공급(드롭뿐) | 실패 없음 · 재굴림은 재료를 다시 모아야 해 약하다 · 계열 이름만 봐도 내용이 읽힌다 |
| Diablo 3 | 제작 대신 사후 개조 — Enchant 는 **한 줄만** 다시 굴린다(아이템당 그 줄 하나) | 굴릴수록 비싸진다 | 한 줄 재굴림 자체가 슬롯머신 — 「아이템당 한 줄」 제한만 쓸 만하다 |
| Diablo 4 | 템퍼링 = 일반 접사와 **따로 선 칸** · 매뉴얼(드롭 레시피)이 카테고리 풀을 연다 · 시즌 11 에 **랜덤 → 레시피에서 고르기 · 횟수 1** 로 바뀌었다 · 마스터워킹 = 품질 단계 | 매뉴얼 종류 · 피트 재료 | 시즌 10 무제한 리롤이 고리였고 시즌 11 이 「고르기 + 횟수 1」로 끊었다 — 본작 목적과 가장 가깝다 |
| Path of Exile 1 | 제작대 = **아이템당 한 줄**(따로 표시) · Essence = 지정 접사 보장 · Fractured = 접사 영구 고정 · Veiled = 드러낼 때 **셋 중 하나** | Essence · Syndicate 경로 | 대부분 재굴림 도박 — 안전한 것은 「슬롯 하나」 · 「셋 중 하나」 |
| Path of Exile 2 | Desecrated = 가려진 접사를 **셋 중 하나** 골라 드러낸다 · Perfect Essence = 접사 하나를 지우고 지정 접사 | Abyss 재료 · Omen | 셋 중 하나는 맞다 · Omen 확률 조작은 거른다 |
| Last Epoch | 아이템마다 **Forging Potential** — 만질 때마다 줄고 0 이면 끝 · 최상 접사(Exalted)는 **드롭에만** | FP 총량 · Exalted 드롭 | 「최상은 드롭에만」이 드롭과 공존하는 가장 깔끔한 장치 · FP 감소의 랜덤은 불필요 |
| Grim Dawn | **블루프린트**(드롭 · 퀘스트)를 배우면 대장장이가 만든다 · 블루프린트가 접사 풀을 정한다 · 한 번 배우면 영구 | 블루프린트 드롭 · 부품 | 실패 · 고리 없음 · PvP 없는 게임 |
| Hero Siege | 룬워드 — 소켓 있는 흰 · 회색 베이스에 룬을 정해진 순서로 → **이름 있는 고정 결과** | 상위 룬 합성 비용 | 고정 결과라 고리 없음 · 룬 등급 사다리는 수직 성장과 부딪힐 수 있다 |

### 방치형 · 아시아 RPG

| 게임 | 제작품 구조 — 드롭과 다른 점 | 대가 · 공급 잠금 | 본작 제약 |
|---|---|---|---|
| Lootun | 제작 전용 구조는 없다 — 작업대 · 개조 도구가 통제권 · 제작 품질에 따라 속성 랭크가 잠긴다(커뮤니티 정보) · 보스 전용 희소 속성(Nemesis) | 희귀 확률 | 확률 긴장은 못 쓴다 ([lootun/02_items.md](lootun/02_items.md)) |
| Melvor Idle | 굴림 · 희귀도 없음 — 레시피가 결과를 확정 | 재료 사슬 · 스킬 레벨 | 구조 차이 없음 |
| Idle Guild Master | **같은 밑감 + 다른 시약 → 다른 갈래**(흡혈 · 반격 · 빙결 등 수치 밖 효과) · 밑감이 소모된다 | 시약 · 밑감 | 굴림 0 · 실패 0 — 긴장은 밑감을 버리는 분기 선택 ([idleguildmaster/02_items.md](idleguildmaster/02_items.md) §4-3) |
| Dungeon Village 2 | 가마솥 제작품이 무기 최상급 대부분을 차지 | — | **반면교사** — 제작이 드롭 위 ([dungeonvillage2/02_items.md](dungeonvillage2/02_items.md) §4-4) |
| MapleStory | 제작 장비는 잠재능력 **없이** 나오고 나중에 부여 | 큐브 · 불꽃 재굴림 | 「비어 있는 채로 나온다」만 참고 · 재굴림 고리는 충돌 |
| Lost Ark `[기억]` | 엘릭서 — 부위별 **후보를 보여 주고 고른다** · 어빌리티 스톤은 확률 세공 | — | 후보 선택은 통과 · 세공 확률은 충돌 ([lostark/02_items.md](lostark/02_items.md)) |
| Black Desert | 블랙스타 = 제작 전용 계열 · **전용 옵션**(몬스터 추가 AP 등) · 대가로 카프라스 불가 · 강화가 따로 | 재료 · 강화 난도 | 「전용 옵션 + 성장 칸 포기」 모양 · 몬스터 전용 옵션은 PvP 기준과 어긋난다 |
| Dungeon Fighter `[기억 일부]` | 에픽 제작 — 보스 확정 재료(교환 불가) · **주 단위 상한** · 드롭 계열과 제작 계열이 서로 배타 | 교환 불가 · 주간 상한 | 공급 잠금은 통과 · 옵션 구조 차이는 약하다 ([dfo/02_items.md](dfo/02_items.md) §8) |
| Ragnarok Online | 제작 무기는 **카드 슬롯이 없고** 대신 속성(하나) · 별(1~3 · 마스터리 공격력)이 붙는다 · **제작자 이름이 새겨진다** | 실패 시 재료 소모(확률) | 가장 뚜렷한 제작 전용 구조 — 확률 실패만 거른다 |
| Lineage · Dragon Nest | 근거 없음 — 넘겼다 | | |

### MMO

| 게임 | 제작품 구조 — 드롭과 다른 점 | 대가 · 공급 잠금 | 본작 제약 |
|---|---|---|---|
| World of Warcraft | 제작품 전용 칸 둘(**Embellishment** · Optional Reagent) + 품질 단계 · **Embellishment 는 착용 2 개까지** | Spark(주 단위) | 착용 상한 · 주간 쿼터가 기회비용을 만든다 — 실패 없음 |
| ESO `[기억]` | 세트 + 특성 하나 + 품질을 제작 때 고른다 | 연구 시간 · 제작대 위치 | **「고르기만 추가」의 전형** — 본작이 밋밋하다고 본 구조 |
| FF14 `[기억]` | 아이템 레벨 층위를 가른다(제작은 한 단계 아래 · 최상은 드롭) + 마테리아 칸 | — | 마테리아 과다 장착 실패는 충돌 |
| Guild Wars 2 `[기억]` | Ascended 를 **스탯 조합을 골라** 제작 · 전용 이름 색 · 성능은 드롭과 동급 | 일일 · 주간 재료 | 단서는 가장 명확 · 성능 동급이라 드롭이 안 죽는다 |
| Monster Hunter `[기억]` | 장비 본체가 제작 · 무기마다 **고정된 슬롯 모양**(장식주)이 정체성 | 몬스터 소재 | 슬롯 퍼즐이 긴장 · 드롭이 본체인 본작에 통째 이식은 어렵다 |
| Aion · TERA `[기억]` | 확률 성공 · 옵션 재조합(연성) | — | **반면교사** |

## 3. 조사자가 낸 본작 후보 — 제안이지 결정이 아니다

| 후보 | 근거 게임 | 논의에서 |
|---|---|---|
| 고른 죄종의 계열을 통째로 · 랜덤 줄 포기 | D2 크래프트 · 라그나로크 · 검은사막 | 사용자 「이 방법 말고 다른 거」 |
| 두 죄종의 조합이 이름 있는 효과를 정한다 | D2 크래프트 · Hero Siege 룬워드 | 「다른 느낌의 아이템」으로 넘어갔다 |
| 빈 칸으로 나와 낙인으로 채워 간다 | 몬스터헌터 · 메이플 · Last Epoch | 〃 |
| 만든 영웅의 고유 스킬이 새겨진다 | 라그나로크 제작자 각인 | 〃 |
| 전용 한 줄 + 착용 상한 | WoW Embellishment · D4 템퍼링 | 새 효과 풀이 필요해 뒤로 |
| 후보 셋 중 하나 | PoE Veiled · PoE2 Desecrated · 로스트아크 엘릭서 | 구조가 드롭과 같아 뒤로 |
| **도안 + 바탕 장비 + 재료** | Grim Dawn 블루프린트 · D2 룬워드(레시피 + 흰 바탕 + 룬) · 몬스터헌터 · Idle Guild Master | **사용자 채택 방향**(2026-10-10 — GAME_DESIGN.md §9) |

## 4. 출처

- D2 — https://diablo2.diablowiki.net/Craft · https://almarsguides.com/Computer/Games/Diablo2/Crafting/HoradricCube/WeaponsandArmor/HitpowerRecipes/
- D3 — https://di.diablowiki.net/Enchant · https://di.diablowiki.net/Cube_recipes
- D4 — https://primagames.com/gaming/diablo-4-tempering-and-masterworking-explained · https://www.icy-veins.com/d4/news/why-diablo-4s-tempering-masterworking-rework-is-game-changer/
- PoE — https://pathofexile.fandom.com/wiki/Veiled_modifier · https://maxroll.gg/poe/crafting/veiled-crafting · https://mobalytics.gg/poe-2/guides/0-3-crafting-changes
- Last Epoch — https://www.icy-veins.com/last-epoch/crafting-guide
- Grim Dawn — https://www.grimdawn.com/guide/items/crafting · https://grimdawn-archive.fandom.com/wiki/Blueprints
- Hero Siege — https://www.u4n.com/news/hero-siege-crafting-recipes.html
- Lootun — https://gameplay.tips/guides/lootun-nemesis-infusion-guide-endgame-crafting.html
- MapleStory — https://maplestory.nexon.com/Guide/N23GameInformation/Articles/413
- Black Desert — https://www.blackdesertfoundry.com/?p=22708
- Ragnarok — https://irowiki.org/wiki/Forging · https://www.ludo.guide/guide/ragnarok-online/how-to-forge
- WoW — https://askmrrobot.com/articles/the-war-within-crafted-gear · https://warcraft.wiki.gg/wiki/Embellishment · https://warcraft.wiki.gg/wiki/Spark_of_Omens

---

*마지막 업데이트: 2026-10-10*
