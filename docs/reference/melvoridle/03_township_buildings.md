# Melvor Idle — Township(마을) 건물 전수

> 상태: **건물 전수 조사 완료** (2026-09-23)
> 목적: 「건설 → 해금」 표본 확보. [construction_draft.md](../../game_design/construction_draft.md) 의 건물 표 · 문턱 · 여는 것 구조를 대조할 실제 사례다. 짝 문서 [04_construction_unlocks.md](04_construction_unlocks.md) 가 Township **밖**의 「지어서 여는」 구조(Agility · Farming · Cartography · 은행 · 상점)를 담는다
> [00_overview.md](00_overview.md) §8 · [01_skills.md](01_skills.md) 의 Township 대목은 **검색 스니펫 합성(★★☆)** 이었다 — 이 문서가 위키 원문표로 그것을 대체한다
> ⚠ **여기 수치는 전부 Melvor Idle 의 것이다.** 본작 SSOT 가 아니며 `src/data/*.csv` 로 옮기지 말 것

---

## 0. 출처와 신뢰도 표기

- **[위키/원문표]** — `wiki.melvoridle.com` (공식 Melvor Idle 위키)의 `Township`, `Township/Tasks`, `Township/Abyssal Training`, `Trading Post`, `Shop` 문서를 MediaWiki API(`action=parse&prop=text`)로 렌더링해, 문서 안의 `{{TownshipBuildingTable}}` 등 Lua 템플릿이 실제로 생성한 HTML 표를 BeautifulSoup으로 파싱했다. 즉 브라우저로 그 페이지를 열었을 때 보이는 표와 100% 동일한 원문 수치다. 반올림·요약 없음.
- **[위키/원문서술]** — 같은 문서의 위키텍스트 본문(수식·설명 문단)을 그대로 옮긴 것.
- **[종합]** — 여러 위키 표를 이 문서 작성자가 조합해 만든 파생 표(레벨 구간표 등). 원문에 없는 조합이므로 별도 표기.
- **[위키/검색합성]** — WebSearch 스니펫을 종합한 것. 직접 표를 열람하지 못해 문장 형태로만 확인.
- **[미확인]** — 못 찾은 항목.
- v1.3.1 (2024-10-30) 기준 데이터. `wiki.melvoridle.com/w/Module:Township`(Lua 데이터 모듈, 함수 목록만 확인 — 실제 수치 배열은 비공개 하위 모듈에 있어 못 읽음)도 시도했으나 함수 시그니처만 노출되어 있었다.

---

## 1. 자원 종류 전체 [위키/원문표+원문서술]

Melvor 13종 + Abyssal(Into the Abyss 확장) 7종 = 총 20종. 이 중 GP · Abyssal Pieces · Abyssal Slayer Coins 3종은 Storage를 거치지 않고 플레이어 Bank에 바로 들어간다. 나머지 12종 Melvor 자원은 Storage(기본 50,000)에, 6종 Abyssal 자원(Abyssal Slayer Coins 제외)은 Soul Storage(기본 1)에 쌓인다.

| 자원 | 분류 | 저장처 | 주 용도(건물표·Trading Post에서 확인) |
|---|---|---|---|
| GP | Melvor | Bank 직행 | 건설비용 공통 화폐. Population 세금으로 획득(아래 §5) |
| Food | Melvor | Storage | 건설비용(초기 건물), Farmland류 생산물 |
| Wood | Melvor | Storage | 건설비용, Woodcutters Camp류 생산물, Trading Post 교환(Woodcutting 스크롤 등) |
| Planks | Melvor | Storage | 건설비용(중기), Carpenters Workshop류 생산물, Trading Post 교환(Fletching 스크롤 등) |
| Stone | Melvor | Storage | 건설비용 거의 전 건물, Miners Pit류 생산물 |
| Bar | Melvor | Storage | 건설비용(후기), Blacksmiths Smithy류 생산물, Trading Post 교환(Bar Box 등) |
| Ore | Melvor | Storage | Miners Pit류 생산물, Trading Post 교환(Ore Box) |
| Coal | Melvor | Storage | Snowlands류 건설비용에 추가, Miners Pit류 생산물, Trading Post 교환 |
| Rune Essence | Melvor | Storage | 건설비용(고티어), Magic Emporium 생산물, Trading Post 교환 |
| Herbs | Melvor | Storage | 건설비용(Town Hall 등), Gatherers Hut류 생산물, Herbalist 원료 |
| Potions | Melvor | Storage | 건설비용(Town Hall 등), Herbalist류 생산물, Trading Post 교환(Potion Box·Consumable Enhancer) |
| Leather | Melvor | Storage | 건설비용(Tailor류), Hunters Cabin류 생산물, Trading Post 교환 |
| Clothing | Melvor | Storage | Arid Plains/Snowlands 건설비용 가산, Tailor류 생산물, Trading Post 교환(Crafting 스크롤) |
| Abyssal Pieces | Abyssal(ItA) | Bank 직행 | Abyssal 건물 공통 건설비용. Abyssal Wave 승리로 획득 |
| Armour & Weaponry | Abyssal(ItA) | Soul Storage | Weaponsmith/Armourer 생산물 — Abyssal Wave 전투력 지표 |
| Abyssal Stone | Abyssal(ItA) | Soul Storage | 건설비용, Abyssal Harvester 생산물 |
| Reinforced Planks | Abyssal(ItA) | Soul Storage | 건설비용, Reinforced Carpenter 생산물 |
| Obsidian | Abyssal(ItA) | Soul Storage | 건설비용, Obsidian Mines류 생산물 |
| Runestone | Abyssal(ItA) | Soul Storage | 건설비용(고티어), Runestone Crafter류 생산물 |
| Voidfire Ash | Abyssal(ItA) | Soul Storage | 건설비용(고티어), Fire Pit류 생산물, Trading Post 교환 |

Abyssal Slayer Coins(전투 화폐, Abyssal Wave 승리로 획득, Bank 직행)는 Township "자원"표엔 없지만 GP·Abyssal Pieces와 함께 3대 Bank 직행 재화로 원문에 명시됨 [위키/원문서술].

---

## 2. Township 스킬 개요 [위키/원문표]

| 항목 | 값 |
|---|---|
| 출시 | 2022-10-18 (v1.1) |
| 분류 | Support 스킬, Mastery 없음. Tick(시간당 업데이트) 방식 |
| 레벨 상한 — 기본 | 99 |
| 레벨 상한 — Throne of the Herald 확장 | 120 |
| Abyssal 레벨 상한 — Into the Abyss 확장 | 60 (같은 Township 레벨 축을 공유하며, Abyssal 건물 최고 티어는 대부분 Level 50에서 마감) |

인구 1명당 업데이트마다 Township XP 1을 얻는 것이 기본 골격(§5 Population 참조).

---

## 3. Biome(생물군계) 구조 [위키/원문표]

총 14개 Biome — Melvor Realm 10개 + Abyssal Realm(ItA) 4개. Biome을 선택하면 그 Biome에서 지을 수 있는 건물 목록이 열리는 방식이며, 해금 조건은 레벨·인구·(Abyssal은) Fortification 3가지뿐이다.

| Biome | 해금 레벨 | 해금 인구(Population) | 해금 Fortification |
|---|---|---|---|
| Grasslands | 1 | 0 | 0% |
| Forest | 1 | 0 | 0% |
| Mountains | 1 | 0 | 0% |
| Water | 1 | 0 | 0% |
| Swamp | 15 | 0 | 0% |
| Valley | 15 | 0 | 0% |
| Arid Plains | 15 | 0 | 0% |
| Jungle | 35 | 2,500 | 0% |
| Desert | 35 | 2,500 | 0% |
| Snowlands | 35 | 2,500 | 0% |
| Abyssal Plains (ItA) | 1 | 80,000 | 0% |
| Sulfuric Wastelands (ItA) | 1 | 80,000 | 0% |
| Obsidian Cliffs (ItA) | 1 | 80,000 | 0% |
| Ethereal Voids (ItA) | 30 | 80,000 | 7.5% |

**「부지(Plot)」 개념에 대한 확인 결과 [위키/원문서술+미확인 정정]**: Melvor Township에는 바이옴 안에 "칸(tile) 총량"을 사고파는 별도의 Plot 그리드가 없다. `Module:Township`의 공개 함수 목록에도 plot/tile/grid 관련 용어가 전혀 없고, 원문 서술도 "바이옴을 고르면 지을 수 있는 건물 목록이 열린다"까지만 말한다. 대신 **건물 종류마다 개별 "Max Built"(최대 건설 수)가 있고, 그 총합이 사실상 그 바이옴의 수용력**이다(§4 표의 "최대건설" 열). 예: Grasslands는 Basic Shelter~Estate(20~40개)·Farmland류·Storehouse류 등 건물별 캡의 합만큼 지을 수 있고, "빈 칸을 사서 늘린다" 같은 시스템은 없다. (WebSearch 중 "Grasslands (10) [116/231]" 같은 슬롯 구매 시스템을 언급한 결과가 있었으나, 이는 검색 스니펫이 다른 타운 빌더 게임과 혼동된 것으로 보이며 Melvor Idle 자체 자료(위키 본문·Lua 모듈)에서는 전혀 확인되지 않음 — 착오로 판단, 폐기.)

**Biome별 건물 제한**은 각 건물 레코드의 Biome 열에 이미 명시되어 있다(§4). 요약하면:
- Grasslands / Arid Plains / Snowlands — 인구주택 계열(Basic Shelter~Estate), Food(Farmland류), Bar(Blacksmiths류, Snowlands 제외 Arid Plains), Clothing(Tailor류), Storage, Education, Happiness, Worship, Trading, Town Hall 등 "메인 허브" 성격
- Forest / Jungle — Wood, Planks, Leather(Hunters), Orchard(Food 보조)
- Water / Swamp — Food(Fishermans), Leather(Hunters, Swamp만), Herbs(Gatherers, Swamp만)
- Desert / Mountains / Snowlands — Stone·Ore·Coal(Miners), Bar(Blacksmiths, Mountains·Snowlands·Grasslands), Rune Essence(Magic Emporium, Desert·Snowlands)
- Valley — Herbs(Gatherers) + Potions(Herbalist류) 전용
- Abyssal Plains — Abyssal Gateway, 요새화 3종 중 다수, Weaponsmith/Armourer, Reinforced Carpenter, Abyssal Enhancer
- Sulfuric Wastelands — Abyssal Harvester, Runestone, Fire Pit류, Sanctuary류(Ethereal Voids와 공유)
- Obsidian Cliffs — Obsidian Mines류, Enchanted Tower
- Ethereal Voids — Sanctuary류(Sulfuric Wastelands와 공유), Research/Combat Lab 3종

---

## 4. 건물 전수 데이터 [위키/원문표]

열 구성은 위키 원문 그대로: **티어(건물명) | DLC(Base/TotH/ItA) | 해금조건(Township 레벨 · 인구 · Abyssal은 Fortification) | 최대건설(해당 Biome당 또는 전체) | Biome | 건설비용 | 효과**. 한 건물이 여러 Biome에 지어질 수 있으면 Biome마다 별도 행으로 비용·효과가 다르다(대개 Snowlands/Arid Plains 쪽이 비싸고 산출량도 더 높음 — Worship 배율과 별개의 기본값 차이).

### Melvor Realm 생산 체인

#### 인구 Population
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Basic Shelter | Base | Township Level 1 | 20 | Grasslands | 100 GP , 10 Food , 10 Wood | Population +5 |
|  |  |  |  | Arid Plains | 290 GP , 10 Food , 10 Wood , 32 Clothing | Population +8 |
|  |  |  |  | Snowlands | 850 GP , 10 Food , 10 Wood , 50 Clothing , 100 Coal | Population +10 |
| Wooden Hut | Base | Township Level 1 | 30 | Grasslands | 700 GP , 60 Food , 60 Wood , 20 Stone | Population +10 |
|  |  |  |  | Arid Plains | 1,075 GP , 60 Food , 60 Wood , 20 Stone , 75 Clothing | Population +15 |
|  |  |  |  | Snowlands | 2,200 GP , 60 Food , 60 Wood , 20 Stone , 100 Clothing , 200 Coal | Population +20 |
| House | Base | Township Level 15 | 20 | Grasslands | 7,000 GP , 600 Food , 600 Wood , 200 Stone | Population +40 |
|  |  |  |  | Arid Plains | 8,500 GP , 600 Food , 600 Wood , 200 Stone , 300 Clothing | Population +60 |
|  |  |  |  | Snowlands | 13,000 GP , 600 Food , 600 Wood , 200 Stone , 400 Clothing , 800 Coal | Population +80 |
| Cottage | Base | Township Level 35 ; Population 2,500 | 25 | Grasslands | 29,000 GP , 2,400 Food , 2,400 Wood , 800 Stone , 100 Potions | Population +80 |
|  |  |  |  | Arid Plains | 32,000 GP , 2,400 Food , 2,400 Wood , 800 Stone , 600 Clothing , 100 Potions | Population +120 |
|  |  |  |  | Snowlands | 41,000 GP , 2,400 Food , 2,400 Wood , 800 Stone , 800 Clothing , 1,600 Coal , 100 Potions | Population +160 |
| Large Cottage | Base | Township Level 60 ; Population 15,000 | 30 | Grasslands | 102,000 GP , 7,200 Food , 7,200 Wood , 4,800 Stone , 2,400 Planks , 600 Bar , 400 Potions | Population +160 , Storage +500 |
|  |  |  |  | Arid Plains | 108,000 GP , 7,200 Food , 7,200 Wood , 4,800 Stone , 2,400 Planks , 600 Bar , 1,200 Clothing , 400 Potions | Population +240 , Storage +500 |
|  |  |  |  | Snowlands | 126,000 GP , 7,200 Food , 7,200 Wood , 4,800 Stone , 2,400 Planks , 600 Bar , 1,600 Clothing , 3,200 Coal , 400 Potions | Population +320 , Storage +500 |
| Manor (TotH) | TotH | Township Level 100 ; Population 80,000 | 35 | Grasslands | 244,000 GP , 50,000 Food , 25,000 Wood , 20,000 Stone , 9,000 Planks , 2,400 Bar , 2,000 Potions | Population +240 |
|  |  |  |  | Arid Plains | 256,000 GP , 50,000 Food , 25,000 Wood , 25,000 Stone , 9,000 Planks , 2,400 Bar , 12,000 Clothing , 2,000 Potions | Population +360 |
|  |  |  |  | Snowlands | 292,000 GP , 50,000 Food , 25,000 Wood , 25,000 Stone , 9,000 Planks , 2,400 Bar , 12,000 Coal , 12,000 Clothing , 2,000 Potions | Population +480 |
| Estate (TotH) | TotH | Township Level 110 ; Population 175,000 | 40 | Grasslands | 591,000 GP , 200,000 Food , 50,000 Wood , 50,000 Stone , 20,000 Planks , 8,000 Bar , 4,000 Potions | Population +360 |
|  |  |  |  | Arid Plains | 615,000 GP , 100,000 Food , 50,000 Wood , 50,000 Stone , 20,000 Planks , 8,000 Bar , 20,000 Clothing , 4,000 Potions | Population +540 |
|  |  |  |  | Snowlands | 687,000 GP , 100,000 Food , 50,000 Wood , 50,000 Stone , 20,000 Planks , 8,000 Bar , 20,000 Clothing , 30,000 Coal , 4,000 Potions | Population +720 |

#### 식량 Food
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Farmland | Base | Township Level 1 | 20 | Grasslands | 440 GP , 50 Wood , 38 Stone | Food +7.5 |
|  |  |  |  | Arid Plains | 650 GP , 50 Wood , 38 Stone , 50 Clothing | Food +11.25 |
| Plantation | Base | Township Level 15 | 30 | Grasslands | 1,000 GP , 125 Planks , 125 Stone | Food +15 |
|  |  |  |  | Arid Plains | 1,250 GP , 125 Planks , 125 Stone , 150 Clothing | Food +22.5 |
| Mill | Base | Township Level 60 ; Population 15,000 | 20 | Grasslands | 12,000 GP , 600 Planks , 2,800 Stone , 300 Bar , 200 Rune Essence | Food +60 |
|  |  |  |  | Arid Plains | 16,000 GP , 600 Planks , 2,800 Stone , 300 Bar , 200 Rune Essence , 800 Clothing | Food +90 |
| Farming Estate (TotH) | TotH | Township Level 100 ; Population 80,000 | 25 | Grasslands | 35,000 GP , 9,000 Planks , 18,000 Stone , 1,200 Bar , 8,000 Rune Essence | Food +120 |
|  |  |  |  | Arid Plains | 47,000 GP , 9,000 Planks , 20,000 Stone , 1,200 Bar , 8,000 Rune Essence , 12,000 Clothing | Food +180 |
| Fishermans Dock | Base | Township Level 1 | 20 | Water | 1,300 GP , 150 Wood , 113 Stone | Food +15 |
|  |  |  |  | Swamp | 1,300 GP , 150 Wood , 113 Stone | Food +22.5 |
| Fishermans Pier | Base | Township Level 35 ; Population 2,500 | 15 | Water | 4,500 GP , 450 Planks , 450 Stone | Food +60 |
|  |  |  |  | Swamp | 4,500 GP , 450 Planks , 450 Stone | Food +90 |
| Fishermans Port | Base | Township Level 60 ; Population 15,000 | 20 | Water | 13,000 GP , 900 Planks , 2,800 Stone , 500 Bar | Food +120 |
|  |  |  |  | Swamp | 13,000 GP , 900 Planks , 2,800 Stone , 500 Bar | Food +180 |
| Fishermans Estate (TotH) | TotH | Township Level 110 ; Population 175,000 | 25 | Water | 43,000 GP , 15,000 Planks , 22,000 Stone , 8,000 Bar , 18,000 Rune Essence | Food +240 |
|  |  |  |  | Swamp | 43,000 GP , 15,000 Planks , 30,000 Stone , 8,000 Bar , 18,000 Rune Essence | Food +360 |
| Orchard | Base | Township Level 15 | 100 | Forest | 18,000 GP , 3,000 Wood , 200 Planks , 400 Stone | Food +45 |
|  |  |  |  | Jungle | 18,000 GP , 3,000 Wood , 200 Planks , 400 Stone | Food +90 |
| Market | Base | Township Level 15 | 100 | Grasslands | 4,000 GP , 2,500 Food , 2,000 Wood , 5,000 Stone | -0.25% Township repair costs (누적, Market 1개당) |

#### 목재 Wood
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Woodcutters Camp | Base | Township Level 1 | 20 | Forest | 1,300 GP , 150 Wood , 113 Stone | Wood +20 |
|  |  |  |  | Jungle | 1,300 GP , 150 Wood , 113 Stone | Wood +40 |
| Logging Camp | Base | Township Level 15 | 30 | Forest | 2,600 GP , 300 Planks , 225 Stone | Wood +40 |
|  |  |  |  | Jungle | 2,600 GP , 300 Planks , 225 Stone | Wood +80 |
| Forestry Camp | Base | Township Level 60 ; Population 15,000 | 20 | Forest | 14,000 GP , 800 Planks , 2,800 Stone , 700 Bar | Wood +120 |
|  |  |  |  | Jungle | 14,000 GP , 800 Planks , 2,800 Stone , 700 Bar | Wood +240 |
| Forestry Estate (TotH) | TotH | Township Level 100 ; Population 80,000 | 25 | Forest | 43,000 GP , 9,000 Planks , 18,000 Stone , 2,800 Bar , 9,000 Rune Essence | Wood +320 |
|  |  |  |  | Jungle | 43,000 GP , 9,000 Planks , 20,000 Stone , 2,800 Bar , 9,000 Rune Essence | Wood +640 |

#### 판자 Planks
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Carpenters Workshop | Base | Township Level 1 | 20 | Forest | 2,550 GP , 400 Wood , 113 Stone | Planks +15 |
|  |  |  |  | Jungle | 2,550 GP , 400 Wood , 113 Stone | Planks +30 |
| Carpenters Factory | Base | Township Level 35 ; Population 2,500 | 15 | Forest | 12,000 GP , 1,600 Wood , 450 Planks , 450 Stone | Planks +60 |
|  |  |  |  | Jungle | 12,000 GP , 1,600 Wood , 450 Planks , 450 Stone | Planks +120 |
| Carpenters Foundry | Base | Township Level 60 ; Population 15,000 | 20 | Forest | 35,000 GP , 4,000 Wood , 900 Planks , 2,800 Stone , 700 Bar , 200 Rune Essence | Planks +120 |
|  |  |  |  | Jungle | 35,000 GP , 4,000 Wood , 900 Planks , 2,800 Stone , 700 Bar , 200 Rune Essence | Planks +240 |
| Carpenters Estate (TotH) | TotH | Township Level 100 ; Population 80,000 | 25 | Forest | 105,000 GP , 24,000 Wood , 9,000 Planks , 18,000 Stone , 2,800 Bar , 9,000 Rune Essence | Planks +240 |
|  |  |  |  | Jungle | 105,000 GP , 24,000 Wood , 9,000 Planks , 20,000 Stone , 2,800 Bar , 9,000 Rune Essence | Planks +480 |

#### 석재·광석·석탄 Stone / Ore / Coal
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Miners Pit | Base | Township Level 1 | 20 | Desert | 1,800 GP , 150 Wood , 113 Stone , 100 Clothing | Stone +50 , Ore +10 , Coal +10 |
|  |  |  |  | Mountains | 1,300 GP , 150 Wood , 113 Stone | Stone +25 , Ore +5 , Coal +5 |
|  |  |  |  | Snowlands | 2,050 GP , 150 Wood , 113 Stone , 100 Clothing , 75 Coal | Stone +50 , Ore +10 , Coal +10 |
| Miners Field | Base | Township Level 15 | 30 | Desert | 4,000 GP , 200 Planks , 200 Stone , 400 Clothing | Stone +75 , Ore +20 , Coal +20 |
|  |  |  |  | Mountains | 2,000 GP , 200 Planks , 200 Stone | Stone +37.5 , Ore +10 , Coal +10 |
|  |  |  |  | Snowlands | 4,250 GP , 200 Planks , 200 Stone , 225 Clothing , 225 Coal | Stone +75 , Ore +20 , Coal +20 |
| Miners Quarry | Base | Township Level 60 ; Population 15,000 | 20 | Desert | 30,000 GP , 800 Planks , 2,800 Stone , 700 Bar , 3,200 Clothing | Stone +300 , Ore +80 , Coal +60 |
|  |  |  |  | Mountains | 14,000 GP , 800 Planks , 2,800 Stone , 700 Bar | Stone +150 , Ore +40 , Coal +30 |
|  |  |  |  | Snowlands | 27,000 GP , 800 Planks , 2,800 Stone , 700 Bar , 1,350 Clothing , 1,350 Coal | Stone +300 , Ore +80 , Coal +60 |
| Miners Estate (TotH) | TotH | Township Level 100 ; Population 80,000 | 25 | Desert | 107,000 GP , 10,000 Planks , 20,000 Stone , 5,600 Bar , 10,000 Rune Essence , 15,000 Clothing | Stone +600 , Ore +160 , Coal +100 |
|  |  |  |  | Mountains | 43,000 GP , 10,000 Planks , 20,000 Stone , 5,600 Bar , 10,000 Rune Essence | Stone +300 , Ore +80 , Coal +50 |
|  |  |  |  | Snowlands | 83,000 GP , 10,000 Planks , 20,000 Stone , 5,600 Bar , 10,000 Rune Essence , 15,000 Coal , 15,000 Clothing | Stone +600 , Ore +160 , Coal +100 |

#### 주괴 Bar
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Blacksmiths Smithy | Base | Township Level 1 | 20 | Grasslands | 2,650 GP , 150 Wood , 113 Stone , 200 Ore , 75 Coal | Bar +7.5 |
|  |  |  |  | Mountains | 2,650 GP , 150 Wood , 113 Stone , 200 Ore , 75 Coal | Bar +7.5 |
|  |  |  |  | Snowlands | 3,800 GP , 150 Wood , 113 Stone , 200 Ore , 150 Coal , 150 Clothing | Bar +15 |
| Blacksmiths Workshop | Base | Township Level 15 | 30 | Grasslands | 6,000 GP , 150 Planks , 225 Stone , 600 Ore , 300 Coal | Bar +15 |
|  |  |  |  | Mountains | 6,000 GP , 150 Planks , 225 Stone , 600 Ore , 300 Coal | Bar +15 |
|  |  |  |  | Snowlands | 8,500 GP , 150 Planks , 225 Stone , 600 Ore , 400 Coal , 400 Clothing | Bar +30 |
| Blacksmiths Forge | Base | Township Level 60 ; Population 15,000 | 20 | Grasslands | 45,000 GP , 900 Planks , 2,800 Stone , 600 Bar , 4,800 Ore , 1,200 Coal , 200 Rune Essence | Bar +40 |
|  |  |  |  | Mountains | 45,000 GP , 900 Planks , 2,800 Stone , 600 Bar , 4,800 Ore , 1,200 Coal , 200 Rune Essence | Bar +40 |
|  |  |  |  | Snowlands | 59,000 GP , 900 Planks , 2,800 Stone , 600 Bar , 4,800 Ore , 2,400 Coal , 200 Rune Essence , 1,600 Clothing | Bar +80 |
| Blacksmiths Estate (TotH) | TotH | Township Level 100 ; Population 80,000 | 25 | Grasslands | 140,000 GP , 10,000 Planks , 20,000 Stone , 2,400 Bar , 28,800 Ore , 9,600 Coal , 9,000 Rune Essence | Bar +75 |
|  |  |  |  | Mountains | 140,000 GP , 10,000 Planks , 20,000 Stone , 2,400 Bar , 28,800 Ore , 9,600 Coal , 9,000 Rune Essence | Bar +75 |
|  |  |  |  | Snowlands | 160,000 GP , 10,000 Planks , 20,000 Stone , 2,400 Bar , 28,800 Ore , 14,400 Coal , 9,000 Rune Essence , 10,000 Clothing | Bar +150 |

#### 가죽 Leather
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Hunters Cabin | Base | Township Level 1 | 20 | Forest | 1,300 GP , 150 Wood , 113 Stone | Leather +4.5 |
|  |  |  |  | Swamp | 1,300 GP , 150 Wood , 113 Stone | Leather +6.75 |
|  |  |  |  | Jungle | 1,300 GP , 150 Wood , 113 Stone | Leather +9 |
| Hunters Lodge | Base | Township Level 35 ; Population 2,500 | 15 | Forest | 5,200 GP , 600 Planks , 450 Stone | Leather +18 |
|  |  |  |  | Swamp | 5,200 GP , 600 Planks , 450 Stone | Leather +27 |
|  |  |  |  | Jungle | 5,200 GP , 600 Planks , 450 Stone | Leather +36 |
| Hunters Villa | Base | Township Level 60 ; Population 15,000 | 20 | Forest | 13,000 GP , 900 Planks , 2,800 Stone , 460 Bar | Leather +24 |
|  |  |  |  | Swamp | 13,000 GP , 900 Planks , 2,800 Stone , 460 Bar | Leather +36 |
|  |  |  |  | Jungle | 13,000 GP , 900 Planks , 2,800 Stone , 460 Bar | Leather +48 |
| Hunters Estate (TotH) | TotH | Township Level 100 ; Population 80,000 | 25 | Forest | 42,000 GP , 8,000 Planks , 18,000 Stone , 1,840 Bar , 9,000 Rune Essence | Leather +36 |
|  |  |  |  | Swamp | 42,000 GP , 8,000 Planks , 20,000 Stone , 1,840 Bar , 9,000 Rune Essence | Leather +54 |
|  |  |  |  | Jungle | 42,000 GP , 8,000 Planks , 20,000 Stone , 1,840 Bar , 9,000 Rune Essence | Leather +72 |

#### 허브 Herbs
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Gatherers Hut | Base | Township Level 1 | 20 | Swamp | 1,300 GP , 150 Wood , 113 Stone | Herbs +2.5 |
|  |  |  |  | Valley | 1,300 GP , 150 Wood , 113 Stone | Herbs +2.5 |
| Gatherers Lodge | Base | Township Level 35 ; Population 2,500 | 15 | Swamp | 4,500 GP , 450 Planks , 450 Stone | Herbs +10 |
|  |  |  |  | Valley | 4,500 GP , 450 Planks , 450 Stone | Herbs +10 |
| Gatherers Villa | Base | Township Level 60 ; Population 15,000 | 20 | Swamp | 12,000 GP , 700 Planks , 2,800 Stone , 500 Bar | Herbs +20 |
|  |  |  |  | Valley | 12,000 GP , 700 Planks , 2,800 Stone , 500 Bar | Herbs +20 |
| Gatherers Estate (TotH) | TotH | Township Level 100 ; Population 80,000 | 25 | Swamp | 39,000 GP , 9,000 Planks , 18,000 Stone , 2,000 Bar , 9,000 Rune Essence | Herbs +40 |
|  |  |  |  | Valley | 39,000 GP , 9,000 Planks , 20,000 Stone , 2,000 Bar , 9,000 Rune Essence | Herbs +40 |

#### 포션 Potions (Valley 전용)
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Herbalist | Base | Township Level 1 | 20 | Valley | 1,000 GP , 200 Herbs | Potions +2.5 |
| Infirmary | Base | Township Level 35 ; Population 2,500 | 15 | Valley | 8,000 GP , 1,600 Herbs | Potions +10 |
| Healing Centre | Base | Township Level 80 ; Population 40,000 | 20 | Valley | 39,000 GP , 10,000 Stone , 10,800 Herbs , 10,000 Rune Essence | Potions +25 |
| Hospital (TotH) | TotH | Township Level 110 ; Population 175,000 | 25 | Valley | 122,000 GP , 18,000 Herbs , 10,000 Rune Essence | Potions +50 |

#### 의복 Clothing
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Tailor | Base | Township Level 15 | 20 | Grasslands | 2,050 GP , 150 Wood , 113 Stone , 150 Leather | Clothing +15 |
|  |  |  |  | Snowlands | 2,650 GP , 150 Wood , 113 Stone , 150 Leather , 25 Coal , 100 Clothing | Clothing +30 |
| Clothier | Base | Township Level 35 ; Population 2,500 | 15 | Grasslands | 10,000 GP , 450 Planks , 450 Stone , 1,200 Leather | Clothing +60 |
|  |  |  |  | Snowlands | 14,000 GP , 450 Planks , 450 Stone , 1,200 Leather , 150 Coal , 600 Clothing | Clothing +120 |
| Outfitter | Base | Township Level 80 ; Population 40,000 | 20 | Grasslands | 44,000 GP , 5,000 Planks , 16,000 Stone , 1,500 Bar , 15,000 Leather | Clothing +100 |
|  |  |  |  | Snowlands | 54,000 GP , 5,000 Planks , 16,000 Stone , 1,500 Bar , 15,000 Leather , 3,200 Coal , 3,200 Clothing | Clothing +200 |
| Clothiers Estate (TotH) | TotH | Township Level 110 ; Population 175,000 | 25 | Grasslands | 127,000 GP , 15,000 Planks , 38,000 Stone , 8,000 Bar , 15,000 Rune Essence , 30,000 Leather | Clothing +180 |
|  |  |  |  | Snowlands | 158,000 GP , 15,000 Planks , 50,000 Stone , 8,000 Bar , 15,000 Rune Essence , 30,000 Leather , 40,000 Coal , 20,000 Clothing | Clothing +360 |

#### 룬 에센스 Rune Essence (단일 티어, 업그레이드 사슬 없음)
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Magic Emporium | Base | Township Level 60 ; Population 15,000 | 50 | Desert | 9,500 GP , 200 Planks , 1,175 Stone , 100 Bar , 1,000 Clothing | Rune Essence +130 |
|  |  |  |  | Snowlands | 9,500 GP , 200 Planks , 1,175 Stone , 100 Bar , 1,000 Clothing , 1,000 Coal | Rune Essence +130 |

#### 저장 Storage
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Storehouse | Base | Township Level 1 | 20 | Grasslands | 1,750 GP , 200 Wood , 150 Stone | Storage +5,000 |
|  |  |  |  | Snowlands | 2,000 GP , 200 Wood , 150 Stone , 50 Coal , 50 Clothing | Storage +10,000 |
| Warehouse | Base | Township Level 35 ; Population 2,500 | 20 | Grasslands | 5,250 GP , 600 Planks , 450 Stone | Storage +25,000 |
|  |  |  |  | Snowlands | 6,750 GP , 600 Planks , 450 Stone , 300 Coal , 300 Clothing | Storage +50,000 |
| Repository | Base | Township Level 80 ; Population 40,000 | 30 | Grasslands | 100,000 GP , 9,000 Planks , 16,000 Stone , 2,400 Bar | Storage +300,000 |
|  |  |  |  | Snowlands | 200,000 GP , 9,000 Planks , 16,000 Stone , 2,400 Bar , 10,000 Coal , 10,000 Clothing | Storage +600,000 |
| Large Repository (TotH) | TotH | Township Level 110 ; Population 175,000 | 40 | Grasslands | 500,000 GP , 20,000 Planks , 50,000 Stone , 10,000 Bar , 50,000 Rune Essence | Storage +600,000 |
|  |  |  |  | Snowlands | 1,000,000 GP , 20,000 Planks , 100,000 Stone , 10,000 Bar , 50,000 Rune Essence , 50,000 Coal , 50,000 Clothing | Storage +1,200,000 |

#### 교육 Education
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| School | Base | Township Level 1 | 20 | Grasslands | 2,000 GP , 200 Wood , 200 Stone | Education +0.1 |
|  |  |  |  | Snowlands | 2,250 GP , 200 Wood , 200 Stone , 100 Clothing , 50 Coal | Education +0.15 |
| Large School | Base | Township Level 35 ; Population 2,500 | 20 | Grasslands | 7,000 GP , 800 Planks , 600 Stone | Education +0.4 |
|  |  |  |  | Snowlands | 11,000 GP , 800 Planks , 600 Stone , 600 Clothing , 300 Coal | Education +0.5 |
| Academy | Base | Township Level 80 ; Population 40,000 | 30 | Grasslands | 34,000 GP , 9,000 Planks , 16,000 Stone , 2,400 Bar | Education +0.75 |
|  |  |  |  | Snowlands | 47,000 GP , 9,000 Planks , 16,000 Stone , 2,400 Bar , 5,000 Clothing , 5,000 Coal | Education +1 |
| Large Academy (TotH) | TotH | Township Level 110 ; Population 175,000 | 18 | Grasslands | 302,000 GP , 14,000 Planks , 50,000 Stone , 14,000 Bar , 18,000 Rune Essence | Education +1.25 |
|  |  |  |  | Snowlands | 407,000 GP , 14,000 Planks , 50,000 Stone , 14,000 Bar , 18,000 Rune Essence , 16,200 Clothing , 9,000 Coal | Education +1.5 |
| Library (병렬, 업그레이드 아님) | Base | Township Level 35 ; Population 2,500 | 100 | Grasslands | 8,200 GP , 700 Planks , 450 Stone | Education +0.25 |

#### 행복 Happiness
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Gardens | Base | Township Level 15 | 100 | Grasslands | 2,500 GP , 300 Wood , 100 Planks , 100 Stone | Happiness +0.5 |
| Tavern | Base | Township Level 15 | 100 | Grasslands | 7,500 GP , 1,000 Food , 200 Wood , 150 Stone | Happiness +0.5 |
|  |  |  |  | Snowlands | 10,500 GP , 100 Food , 200 Wood , 150 Stone , 400 Coal , 400 Clothing | Happiness +1 |

#### 신앙 Worship
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Chapel | Base | Township Level 35 ; Population 2,500 | 100 | Grasslands | 4,200 GP , 400 Planks , 450 Stone | Worship +10 |
| Statue of Worship | Base | Township Level 80 ; Population 40,000 | 50 | Grasslands | 1,000,000 GP , 35,000 Stone , 10,000 Bar | Worship +20 |

주: 실제 게임에서는 선택한 신에 따라 "Statue of Aeris/Glacia/Terran/Ragnar/Bane/The Herald/Xon"으로 이름이 다르게 표시되지만, 위키 건물표는 모든 Statue를 "Statue of Worship" 한 행으로 병합해 표기한다(§6 원문서술: "all statues provide an identical amount of worship"). 신앙을 바꾸면 그동안 지은 Chapel·Statue가 전부 파괴된다(§5·§6 참고).

#### 교역 Trading (+ 효과 없는 "장식/펫 해금용" 건물 포함)
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Trading Post | Base | Township Level 15 | 50 | Grasslands | 500,000 GP , 5,000 Planks , 7,500 Stone , 5,000 Bar , 2,000 Herbs , 2,000 Potions | -0.33% Township Trader costs |
|  |  |  |  | Arid Plains | 500,000 GP , 5,000 Planks , 7,500 Stone , 5,000 Bar , 5,000 Clothing , 2,000 Herbs , 2,000 Potions | -0.33% Township Trader costs |
|  |  |  |  | Snowlands | 500,000 GP , 5,000 Planks , 7,500 Stone , 5,000 Bar , 5,000 Coal , 5,000 Clothing , 2,000 Herbs , 2,000 Potions | -0.33% Township Trader costs |
| Prats Hats | Base | Township Level 15 | 10 | Grasslands | 2,600 GP , 300 Wood , 226 Stone | (표기된 생산 효과 없음 — Shop 펫/아이템 해금용, §8 참고) |
| Malcs Cats | Base | Township Level 35 ; Population 2,500 | 10 | Grasslands | 3,700 GP , 300 Planks , 450 Stone | (표기된 생산 효과 없음 — Shop 펫 해금용, §8 참고) |
| Cool Rocks (TotH) | TotH | Township Level 100 ; Population 80,000 | 10 | Mountains | 42,000 GP , 9,000 Planks , 696,969 Stone , 5,000 Bar | (표기된 생산 효과 없음 — Shop 펫 해금용, §8 참고. 696,969라는 Stone 비용은 개발사의 의도적 밈 넘버) |

#### 기타 Other
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Cemetery | Base | Township Level 35 ; Population 2,500 | 50 | Grasslands | 8,500 GP , 400 Planks , 400 Stone , 400 Bar , 500 Herbs | +2% Township Potions Production (건물 1개당 누적) |
| Town Hall | Base | Township Level 80 ; Population 40,000 | 8 | Grasslands | 100,000,000 GP , 100,000 Wood , 100,000 Stone , 100,000 Bar , 50,000 Herbs , 50,000 Potions | +10% Township Citizen Tax Rate (건물당, 최대 100%) |

Shop 내비게이션 표에는 "Other" 그룹에 **Lemvor Lemon Stall**도 함께 열거되어 있으나(§8), 본 건물 마스터표(Buildings 섹션)에는 해당 행이 나타나지 않았다 — Atlas of Discovery 확장의 특수 계절(Lemon Season)과 연동된 것으로 추정되나 수치 미확인(§13).

### Abyssal Realm 생산 체인 (Into the Abyss 확장, ItA)

#### 관문 Gateway
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Abyssal Gateway | ItA | Township Level 1 ; Population 80,000 | 1 | Abyssal Plains | 25,000 Food , 25,000 Wood , 25,000 Stone , 25,000 Planks , 10,000 Bar , 10,000 Clothing , 10,000 Potions | Armour & Weaponry +250 , Abyssal Stone +200 , Reinforced Planks +100 , Soul Storage +50,000 |

Abyssal Gateway는 **Melvor 자원(Food/Wood/Stone/Planks/Bar/Clothing/Potions)으로 짓고 Abyssal 자원을 산출**하는 유일한 건물 — 두 자원 체계를 잇는 다리 역할.

#### 요새화 Fortification (모든 Abyssal Wave 전투의 기반 스탯, 최대 130% = Level 40에서 달성 가능)
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Wooden Walls | ItA | Township Level 1 ; Population 80,000 | 50 | Abyssal Plains | 1,000 Abyssal Pieces , 500 Reinforced Planks | Fortification +0.05 |
|  |  |  |  | Sulfuric Wastelands | 500 Reinforced Planks | Fortification +0.05 |
|  |  |  |  | Obsidian Cliffs | 500 Reinforced Planks | Fortification +0.05 |
|  |  |  |  | Ethereal Voids | 500 Reinforced Planks | Fortification +0.05 |
| Stone Walls | ItA | Township Level 20 ; Population 80,000 ; Fortification 2.5% | 50 | Abyssal Plains | 25,000 Abyssal Pieces , 15,000 Abyssal Stone , 5,000 Reinforced Planks | Fortification +0.1 |
|  |  |  |  | Sulfuric Wastelands | 15,000 Abyssal Stone , 5,000 Reinforced Planks | Fortification +0.1 |
|  |  |  |  | Obsidian Cliffs | 15,000 Abyssal Stone , 5,000 Reinforced Planks | Fortification +0.1 |
|  |  |  |  | Ethereal Voids | 15,000 Abyssal Stone , 5,000 Reinforced Planks | Fortification +0.1 |
| Obsidian Walls | ItA | Township Level 40 ; Population 80,000 ; Fortification 30% | 50 | Abyssal Plains | 100,000 Abyssal Pieces , 6,000 Obsidian , 25,000 Abyssal Stone , 15,000 Reinforced Planks | Fortification +0.2 |
|  |  |  |  | Sulfuric Wastelands | 6,000 Obsidian , 25,000 Abyssal Stone , 15,000 Reinforced Planks | Fortification +0.2 |
|  |  |  |  | Obsidian Cliffs | 6,000 Obsidian , 25,000 Abyssal Stone , 15,000 Reinforced Planks | Fortification +0.2 |
|  |  |  |  | Ethereal Voids | 6,000 Obsidian , 25,000 Abyssal Stone , 15,000 Reinforced Planks | Fortification +0.2 |
| Empowered Altar | ItA | Township Level 20 ; Population 80,000 ; Fortification 2.5% | 10 | Abyssal Plains | 25,000 Abyssal Pieces , 15,000 Abyssal Stone , 7,500 Reinforced Planks | Fortification +0.5 |
| Arcane Altar | ItA | Township Level 30 ; Population 80,000 ; Fortification 7.5% | 10 | Abyssal Plains | 50,000 Abyssal Pieces , 15,000 Reinforced Planks , 15,000 Obsidian , 2,700 Voidfire Ash , 3,700 Runestone | Fortification +1 |
| Ethereal Altar | ItA | Township Level 40 ; Population 80,000 ; Fortification 30% | 10 | Abyssal Plains | 100,000 Abyssal Pieces , 45,000 Obsidian , 60,000 Voidfire Ash , 10,000 Runestone | Fortification +2 |
| Enchanted Tower | ItA | Township Level 30 ; Population 80,000 ; Fortification 7.5% | 10 | Obsidian Cliffs | 50,000 Abyssal Pieces , 45,000 Obsidian , 45,000 Voidfire Ash , 4,500 Runestone | Fortification +2.5 |

전건물 완공 시 Fortification 상한 130% 배분: Walls 계열(4개 Abyssal Biome 공통) 70% + Altar 계열(Abyssal Plains) 35% + Enchanted Tower(Obsidian Cliffs) 25% [위키/원문서술].

#### 무구 Armour & Weaponry (Abyssal Plains 전용)
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Weaponsmith I | ItA | Township Level 1 ; Population 80,000 | 60 | Abyssal Plains | 1,000 Abyssal Pieces , 200 Abyssal Stone , 100 Reinforced Planks | Armour & Weaponry +15 |
| Weaponsmith II | ItA | Township Level 20 ; Population 80,000 ; Fortification 2.5% | 60 | Abyssal Plains | 25,000 Abyssal Pieces , 6,000 Abyssal Stone , 3,000 Reinforced Planks , 1,200 Obsidian | Armour & Weaponry +40 |
| Weaponsmith III | ItA | Township Level 40 ; Population 80,000 ; Fortification 30% | 60 | Abyssal Plains | 100,000 Abyssal Pieces , 15,000 Abyssal Stone , 9,000 Reinforced Planks , 3,000 Obsidian , 3,000 Voidfire Ash | Armour & Weaponry +65 |
| Weaponsmith IV | ItA | Township Level 50 ; Population 80,000 ; Fortification 70% | 60 | Abyssal Plains | 150,000 Abyssal Pieces , 15,000 Abyssal Stone , 9,000 Reinforced Planks , 9,000 Obsidian , 9,000 Voidfire Ash , 900 Runestone | Armour & Weaponry +125 |
| Armourer I | ItA | Township Level 10 ; Population 80,000 | 60 | Abyssal Plains | 10,000 Abyssal Pieces , 6,000 Abyssal Stone , 3,000 Reinforced Planks , 1,200 Obsidian | Armour & Weaponry +30 |
| Armourer II | ItA | Township Level 30 ; Population 80,000 ; Fortification 7.5% | 60 | Abyssal Plains | 50,000 Abyssal Pieces , 15,000 Abyssal Stone , 3,000 Reinforced Planks , 3,000 Obsidian , 3,000 Voidfire Ash | Armour & Weaponry +50 |
| Armourer III | ItA | Township Level 40 ; Population 80,000 ; Fortification 30% | 60 | Abyssal Plains | 100,000 Abyssal Pieces , 30,000 Abyssal Stone , 9,000 Reinforced Planks , 3,000 Obsidian , 9,000 Voidfire Ash , 900 Runestone | Armour & Weaponry +70 |
| Armourer IV | ItA | Township Level 50 ; Population 80,000 ; Fortification 70% | 60 | Abyssal Plains | 150,000 Abyssal Pieces , 30,000 Abyssal Stone , 18,000 Reinforced Planks , 9,000 Obsidian , 18,000 Voidfire Ash , 2,100 Runestone | Armour & Weaponry +125 |

#### Abyssal 스톤 Abyssal Stone (Sulfuric Wastelands 전용)
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Abyssal Harvester I | ItA | Township Level 1 ; Population 80,000 | 60 | Sulfuric Wastelands | 1,000 Abyssal Pieces , 200 Abyssal Stone , 400 Reinforced Planks | Abyssal Stone +50 |
| Abyssal Harvester II | ItA | Township Level 10 ; Population 80,000 | 60 | Sulfuric Wastelands | 10,000 Abyssal Pieces , 6,000 Abyssal Stone , 3,000 Reinforced Planks , 1,200 Obsidian | Abyssal Stone +125 |
| Abyssal Harvester III | ItA | Township Level 30 ; Population 80,000 ; Fortification 7.5% | 60 | Sulfuric Wastelands | 50,000 Abyssal Pieces , 1,500 Abyssal Stone , 9,000 Reinforced Planks , 3,000 Obsidian , 9,000 Voidfire Ash | Abyssal Stone +250 |

#### 보강 판자 Reinforced Planks (Abyssal Plains 전용)
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Reinforced Carpenter I | ItA | Township Level 1 ; Population 80,000 | 60 | Abyssal Plains | 1,000 Abyssal Pieces , 200 Abyssal Stone , 400 Reinforced Planks | Reinforced Planks +25 |
| Reinforced Carpenter II | ItA | Township Level 20 ; Population 80,000 ; Fortification 2.5% | 60 | Abyssal Plains | 25,000 Abyssal Pieces , 15,000 Abyssal Stone , 3,000 Reinforced Planks , 3,000 Obsidian | Reinforced Planks +75 |
| Reinforced Carpenter III | ItA | Township Level 40 ; Population 80,000 ; Fortification 30% | 60 | Abyssal Plains | 100,000 Abyssal Pieces , 30,000 Abyssal Stone , 9,000 Reinforced Planks , 9,000 Obsidian , 18,000 Voidfire Ash , 2,100 Runestone | Reinforced Planks +150 |

#### 흑요석 Obsidian (Obsidian Cliffs 전용)
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Obsidian Mines | ItA | Township Level 1 ; Population 80,000 | 60 | Obsidian Cliffs | 1,000 Abyssal Pieces , 6,000 Abyssal Stone , 3,000 Reinforced Planks | Obsidian +30 |
| Obsidian Quarry | ItA | Township Level 20 ; Population 80,000 ; Fortification 2.5% | 60 | Obsidian Cliffs | 25,000 Abyssal Pieces , 15,000 Abyssal Stone , 3,000 Reinforced Planks , 1,200 Obsidian , 3,000 Voidfire Ash | Obsidian +75 |
| Obsidian Blaster | ItA | Township Level 40 ; Population 80,000 ; Fortification 30% | 60 | Obsidian Cliffs | 100,000 Abyssal Pieces , 30,000 Abyssal Stone , 9,000 Reinforced Planks , 3,000 Obsidian , 9,000 Voidfire Ash , 900 Runestone | Obsidian +75 |

#### 룬스톤 Runestone (Sulfuric Wastelands 전용)
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Runestone Crafter | ItA | Township Level 20 ; Population 80,000 ; Fortification 2.5% | 60 | Sulfuric Wastelands | 25,000 Abyssal Pieces , 15,000 Abyssal Stone , 3,000 Reinforced Planks , 3,000 Obsidian , 3,000 Voidfire Ash | Runestone +10 |
| Runestone Combiner | ItA | Township Level 30 ; Population 80,000 ; Fortification 7.5% | 60 | Sulfuric Wastelands | 50,000 Abyssal Pieces , 30,000 Abyssal Stone , 9,000 Reinforced Planks , 3,000 Obsidian , 9,000 Voidfire Ash , 300 Runestone | Runestone +20 |
| Runestone Merger | ItA | Township Level 50 ; Population 80,000 ; Fortification 70% | 60 | Sulfuric Wastelands | 150,000 Abyssal Pieces , 30,000 Abyssal Stone , 18,000 Reinforced Planks , 9,000 Obsidian , 18,000 Voidfire Ash , 900 Runestone | Runestone +40 |

#### 보이드파이어 애시 Voidfire Ash (Sulfuric Wastelands 전용)
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Fire Pit | ItA | Township Level 10 ; Population 80,000 | 60 | Sulfuric Wastelands | 10,000 Abyssal Pieces , 15,000 Abyssal Stone , 3,000 Reinforced Planks , 1,200 Obsidian | Voidfire Ash +30 |
| Bonfire | ItA | Township Level 30 ; Population 80,000 ; Fortification 7.5% | 60 | Sulfuric Wastelands | 50,000 Abyssal Pieces , 30,000 Abyssal Stone , 9,000 Reinforced Planks , 3,000 Obsidian , 3,000 Voidfire Ash , 900 Runestone | Voidfire Ash +75 |
| Voidfire Beacon | ItA | Township Level 50 ; Population 80,000 ; Fortification 70% | 60 | Sulfuric Wastelands | 150,000 Abyssal Pieces , 30,000 Abyssal Stone , 18,000 Reinforced Planks , 9,000 Obsidian , 9,000 Voidfire Ash , 2,100 Runestone | Voidfire Ash +175 |

#### 소울 저장 Soul Storage (Sulfuric Wastelands / Ethereal Voids 공통)
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Sanctuary | ItA | Township Level 1 ; Population 80,000 | 50 | Sulfuric Wastelands | 1,000 Abyssal Pieces , 400 Abyssal Stone , 200 Reinforced Planks | Soul Storage +25,000 |
|  |  |  |  | Ethereal Voids | 400 Abyssal Stone , 200 Reinforced Planks | Soul Storage +25,000 |
| Divine Sanctuary | ItA | Township Level 10 ; Population 80,000 | 50 | Sulfuric Wastelands | 10,000 Abyssal Pieces , 15,000 Abyssal Stone , 3,000 Reinforced Planks , 1,200 Obsidian , 3,000 Voidfire Ash | Soul Storage +75,000 |
|  |  |  |  | Ethereal Voids | 15,000 Abyssal Stone , 3,000 Reinforced Planks , 1,200 Obsidian , 3,000 Voidfire Ash | Soul Storage +75,000 |
| Ethereal Sanctuary | ItA | Township Level 20 ; Population 80,000 ; Fortification 2.5% | 50 | Sulfuric Wastelands | 25,000 Abyssal Pieces , 30,000 Abyssal Stone , 9,000 Reinforced Planks , 3,000 Obsidian , 9,000 Voidfire Ash , 900 Runestone | Soul Storage +200,000 |
|  |  |  |  | Ethereal Voids | 30,000 Abyssal Stone , 9,000 Reinforced Planks , 3,000 Obsidian , 9,000 Voidfire Ash , 900 Runestone | Soul Storage +200,000 |
| Void Sanctuary | ItA | Township Level 40 ; Population 80,000 ; Fortification 30% | 50 | Sulfuric Wastelands | 100,000 Abyssal Pieces , 30,000 Abyssal Stone , 18,000 Reinforced Planks , 9,000 Obsidian , 18,000 Voidfire Ash , 8,000 Runestone | Soul Storage +500,000 |
|  |  |  |  | Ethereal Voids | 30,000 Abyssal Stone , 18,000 Reinforced Planks , 9,000 Obsidian , 18,000 Voidfire Ash , 8,000 Runestone | Soul Storage +500,000 |

#### Abyssal 강화 Abyssal Buffs (Ethereal Voids 위주 최종 티어군)
| 티어(건물명) | DLC | 해금조건 | 최대건설 | Biome | 건설비용 | 효과 |
|---|---|---|---|---|---|---|
| Abyssal Enhancer | ItA | Township Level 20 ; Population 80,000 ; Fortification 2.5% | 50 | Abyssal Plains | 100,000 Abyssal Pieces , 50,000 Abyssal Stone , 50,000 Reinforced Planks , 25,000 Obsidian , 8,000 Runestone | +0.2% Global Abyssal XP (건물당 누적) |
| Abyssal Research Lab | ItA | Township Level 40 ; Population 80,000 ; Fortification 30% | 25 | Ethereal Voids | 100,000 Abyssal Pieces , 120,000 Abyssal Stone , 72,000 Reinforced Planks , 36,000 Obsidian , 72,000 Voidfire Ash , 20,000 Runestone | +0.2% Mastery XP in all Skills for Abyssal Realm only |
| Slayer Research Lab | ItA | Township Level 40 ; Population 80,000 ; Fortification 30% | 20 | Ethereal Voids | 2,000,000 Abyssal Pieces , 120,000 Abyssal Stone , 72,000 Reinforced Planks , 36,000 Obsidian , 72,000 Voidfire Ash , 15,000 Runestone | (위키 표에 효과 미기재 — §13) |
| Abyssal Combat Lab | ItA | Township Level 50 ; Population 80,000 ; Fortification 70% | 30 | Ethereal Voids | 1,000,000 Abyssal Pieces , 500,000 Abyssal Stone , 250,000 Reinforced Planks , 175,000 Obsidian , 250,000 Voidfire Ash , 100,000 Runestone | (위키 표에 효과 미기재 — §13) |

건물 전수: Melvor Realm 70종(티어 포함) + Abyssal Realm 38종(티어 포함) = **108개 건물 레코드**를 원문표에서 확인.

---

## 5. Statistics(속성) 공식 [위키/원문서술]

| 속성 | 설명 | 공식/수치 |
|---|---|---|
| Population | 업데이트당 Township XP = 인구수(배율 적용 전 1인당 1XP). Basic Shelter류·Happiness로 증가, Health 저하로 감소 | Population은 Happiness %만큼 증가, Health 1% 감소당 Population도 1% 감소. **인구는 식량을 비롯해 어떤 자원도 소모하지 않는다 — 유지 비용이 없다**(2026-09-23 재확인 [위키/원문서술] · 「식량이 떨어지면 주민이 죽는다」는 검색 스니펫은 위키 본문 · Steam 공식 답변과 배치되어 폐기) |
| Storage | Melvor 12개 자원 저장 한도 | 기본 50,000 + Storehouse류 누적. 초과분은 생산되지 않음(버려짐) |
| Soul Storage | Abyssal 6개 자원 저장 한도 | 기본 1 + Sanctuary류 누적 |
| Happiness | XP 배율(상한 없음, 100% 초과 가능) | 1% Happiness = Township XP +1% |
| Education | 자원 생산 배율(상한 없음) | 1% Education = 자원 생산량 +1% |
| Health | Population·Fortification·Abyssal Wave 전투력에 영향. 최소 20% | Level 15 이후 매 업데이트 25% 확률로 -1%. Herbs 또는 Potions를 소모해 회복(회복 비용 = 현재 업데이트당 생산량의 10%) |
| Fortification | Abyssal Wave 승리 시 Abyssal XP 배율(ItA 전용) | 1% Fortification = Abyssal XP +1%. 상한 130% (Level 40에서 달성 가능 — Walls 70% + Altar 35% + Enchanted Tower 25%) |

**생산량 공식** [위키/원문서술]:
```
생산량 = 기본량 × (1 + (Biome·건물 생산 보너스)/100) × (1 + (Education + 자원별 생산 보너스)/100) × (건물 효율/100)
```

**건물 효율(Efficiency)과 수리(Repair)**: 신축 시 100%에서 시작, 매 업데이트 25% 확률로 -1%씩 하락(최저 20%). Storage·Soul Storage 건물은 열화되지 않음. 수리하거나(자원 소모) 같은 건물을 추가로 지으면(최대치 미달 시) 100%로 복구됨. 수리 비용 공식:
```
수리비용 = (기본 건설비용/3) × 현재 그 Biome에 지어진 개수 × (1 - 건설비 절감%/100) × (1 + 수리비 증감%/100) × (1 - 현재 효율%/100)
```
건설비 절감은 최대 80% 캡. Trading Post 1개당 -0.33%(150개 완공 시 -49.5%), Market 1개당 -0.25% 수리비 절감.

**GP(세금) 공식**: 세율은 Town Hall 1개당 +10%(최대 8개 = 80%), 인구 1명당 업데이트마다 "10% 세율당 1.5GP" 획득. Abyssal Pieces·Abyssal Slayer Coins는 Abyssal Wave 승리로 획득(자원 생산 보너스 영향 없음, Township 전용 GP 배율의 영향은 받음).

---

## 6. Worship(신앙) [위키/원문표]

Chapel 또는 Statue of Worship 건설로 Worship 스탯 획득, 상한 2,000. 체크포인트 5%(100) · 25%(500) · 50%(1,000) · 85%(1,700) · 95%(1,900)에서 보너스 해금. 신앙 변경 비용 5,000万GP, 변경 시 모든 Chapel·Statue 파괴 + 효율 50% 초과 건물은 50%로 강제 인하. 보너스 시즌 중에는 보너스 배율이 2배가 된다(예: Aeris 5% 체크포인트 +25% → Spring 중 +50%).

| Worship(신) | 해금 조건 | 보너스 계절(2배) | 0% | 5% | 25% | 50% | 85% | 95% |
|---|---|---|---|---|---|---|---|---|
| Aeris | 없음(기본 선택 가능) | Spring | -50% Desert 생산, -75% Water 생산 | +25% Mountains 생산 | +25% Valley 생산 | +25% Mountains·Valley 생산 | +25% Mountains·Valley·Water 생산 | -25% 건설비(캡80%) , +25% Mountains·Valley 생산 |
| Glacia | 없음 | Winter | -75% Mountains 생산, -50% Desert 생산 | +25% Water 생산 | +25% Swamp 생산 | -15% 건설비(캡80%) | +25% Jungle 생산 | +50% Water·Swamp 생산 |
| Terran | 없음 | Fall | -50% Water 생산, -75% Desert 생산 | +25% Forest 생산 | +25% Jungle 생산 | +25% Forest 생산 | +25% Water 생산 | -15% 건설비(캡80%) , +50% Jungle·+25% Forest 생산 |
| Ragnar | 없음 | Summer | -75% Water 생산, -50% Mountains 생산 | +25% Arid Plains 생산 | +25% Desert 생산 | +25% Desert·Arid Plains 생산 | -15% 건설비(캡80%) | +50% Desert 생산, +25% Arid Plains 생산 |
| Bane | Impending Darkness Event 클리어 | Nightfall(20% 확률) | 20% 확률 Nightfall 발생, -15% 건설비(캡80%) | +25% Grasslands 생산 | +25% Swamp 생산 | +25% Snowlands 생산 | +25% Grasslands·Swamp·Snowlands 생산 | +25% Grasslands·Swamp·Snowlands 생산 |
| The Herald | Throne of the Herald 클리어(TotH) | Solar Eclipse(20% 확률) | 20% 확률 Solar Eclipse, -31% Mountains·Arid Plains·Snowlands 생산 | +42% Swamp 생산 | +42% Jungle 생산 | +42% Desert·Water 생산 | +42% Forest·Valley 생산 | -25% 수리비, +42% Grasslands 생산 |
| Xon | The Final Depth 클리어(ItA) | Eternal Darkness(20% 확률) | -99% 전 Biome 생산(Grasslands -99%, 나머지 대부분 -50%), 20% 확률 Eternal Darkness | +50% Abyssal Plains 생산 | +50% Sulfuric Wastelands 생산 | +50% Obsidian Cliffs 생산 | +50% Ethereal Voids 생산 | Abyssal Wave 승리 시 Abyssal Pieces +50%·Abyssal Slayer Coins +5%, +25% Abyssal 4개 Biome 생산 |

모든 보너스는 가산(additive)으로 중첩된다.

---

## 7. Season(계절) [위키/원문표+원문서술]

기본 4계절은 각 3일(72시간) 지속, Spring → Summer → Fall → Winter 순환. 마을 생성 시 첫 계절은 Spring. 특수 계절 3종은 해당 Worship 활성 중 계절 종료 시 20% 확률로 대신 발생(발생 중엔 Worship 변경 불가):

| 계절 | 종류 | 지속시간 | 효과 |
|---|---|---|---|
| Spring | 정규 | 72시간 | +50% Happiness , +25% Food·Herbs·Potions·Leather 생산 , -25% 수리비 , +50% Education , (Abyssal Training 페이지 추가 확인:) +15% Armour & Weaponry·Reinforced Planks 생산 |
| Summer | 정규 | 72시간 | +25% Education , -25% Ore·Stone·Coal·Bar 생산 , -10% 수리비 , +25% GP 생산 , (+25% Voidfire Ash 생산 , -15% Abyssal Stone 생산) |
| Fall | 정규 | 72시간 | -15% 수리비 , +25% Wood·Planks·Clothing 생산 , (+15% Obsidian·Runestone·Abyssal Stone 생산) |
| Winter | 정규 | 72시간 | -50% Happiness , +50% 수리비 , +50% Coal 생산 , +25% Stone·Ore 생산 , -25% Food·Herbs·Potions·Wood·Planks 생산 , -50% Education , -50% GP 생산 |
| Nightfall | 희귀 — Bane 신앙 중 20% 확률 | (원문에 별도 지속시간 명시 없음 — 기본 72시간으로 추정, §13) | -50% Happiness , +100% Ore·Bar·Herbs·Potions 생산 , -50% Food 생산 , -50% Astrology interval(Melvor Realm 전용) |
| Solar Eclipse | 희귀(TotH) — The Herald 신앙 중 20% 확률 | 72시간 | +200% Happiness , +200% Education , -1s 몬스터 리스폰 타이머(Normal Damage 사용 시) |
| Lemon Season | 희귀(AoD) — Ancient Relics에서 Township Relic 발견 후 20% 확률 | **24시간**(다른 계절과 달리 짧음) | +420% Happiness , Skill 행동마다 +1 Lemon(중복 불가) , +69% Education |
| Eternal Darkness | 희귀(ItA) — Xon 신앙 중 20% 확률 | (원문에 별도 지속시간 명시 없음, §13) | -99% 수리비 , Corruption 부여 시 +3 효과(플레이어·적 모두) , 공격 적중 시 +1% 확률로 Ablaze/Toxin/Voidburst/Silence/Fear 부여 |

---

## 8. 건설이 여는 것 — 해금(Unlock) [위키/원문표]

### 8-1. Trading Post — 자원으로 구매 가능한 교환품 (요약 74건)

Trading Post 건설(§4)로 열리는 교환 시스템. Trading Post 1개당 -0.33% 교환 비용, 최대 150개 = -49.5%. 주요 교환품(자원별 대표 예시 — 전 목록은 자원마다 XP스크롤 1~2종 + 등급별 Box 3종 패턴이 반복됨):

| 자원 | 대표 교환품 예시(비용 자원 · 수량) | 해금 조건 예시 |
|---|---|---|
| Food | Fishing Scroll of XP(80) · Food Box I/II/III(500/1,000/1,500) | Township Lv15/40/99/120 + Task 수 40/85/110 |
| Wood | Woodcutting Scroll of XP(75) · Wood Box I/II/III(500/1,000/1,500) | 동일 패턴 |
| Planks | Burning Scroll(100) · (Ash/Stardust/Gold 계열) | Township Lv30 |
| Stone | Mining Scroll of XP(120) · Gem Finder Scroll(35) | Township Lv15/35 |
| Bar/Ore | Bar Box I/II/III, Ore Box I/II/III(500/1,000/1,500) | Smithing·Mining Lv40/99/120 + Township Lv40/99/120 |
| Rune Essence | Runecrafting Scroll(25) · Scroll Of Essence(30) | Township Lv15/30 |
| Herbs | Herblore Scroll(15) · Herb Box I/II/III | Township Lv15/40/99/120 |
| Potions | Consumable Enhancer(10, Township Lv95 전용) · Potion Box I/II/III | Herblore+Hitpoints+Township 레벨 |
| Leather | Leather Crafter Scroll(110) · Leather(50, Crafting 재료용) | Crafting+Township 레벨 |
| Clothing | Crafting Scroll of XP(50) · Mastery Magnet(200, Into the Mist 클리어 필요) | Township Lv15/99 |
| Armour & Weaponry(ItA) | Corruption Scroll·Abyssal Smithing/Cooking Scroll 등(각 150) | Township Lv10~55 + Abyssal Task 수 10~65 |
| Abyssal Stone/Reinforced Planks/Obsidian/Runestone/Voidfire Ash(ItA) | 각 자원별 Enhanced XP/Fortune Scroll(150) | Township Lv10~50 + Abyssal Task 수 10~50 |

전 74항목은 "자원 소량 소모 → 스킬 보너스 스크롤 또는 등급별 아이템 Box" 패턴으로, **자원 그 자체보다 "자원을 다른 스킬의 영구 버프로 환전하는 창구"**가 Trading Post의 핵심 역할이다.

### 8-2. Shop — Township 전용 탭에서 해금되는 것 [위키/원문표]

건설(특히 "효과 없음" 건물)이 **Shop의 펫·아이템 구매권**을 여는 구조가 확인됨:

| 해금 그룹 | 트리거 | 해금되는 것 |
|---|---|---|
| 8종 직업 아웃핏(Woodcutters/Burning Mans/Fishermans/Miners/Blacksmiths/Fletchers/Crafters/Runecrafters/Potion Makers/Performance Enhancing/Star Gazing, 각 4부위) | Township Lv10/20/40/60 + Task 수 20/40/60/80(Melvor Realm) | 각 100,000 GP, 해당 스킬 XP+2%, 풀세트 시 Mastery XP+8% |
| Skilling Outfit Upgrade | Township Lv95 + Task 95 | 25,000,000 GP |
| Marcy/Roger/Ace/Layla/Mister Fuzzbutt/Octavius Lepidus VIII (펫 6종) | **Malcs Cats를 1/2/4/6/8/10개 건설** + Township Lv35~95 | 각 1,000,000 GP — Township XP·자원생산·아이템복사·Happiness·GP·Education 버프 |
| Classy/Cute/Royal/Elf/Magic/Party Rock (펫 6종, TotH) | **Cool Rocks를 1/2/4/6/8/10개 건설**(레벨 조건 없음, 건설 개수만) | 각 1,000,000 GP — Mining/Smithing/Magic/Evasion/Mastery XP 버프 |
| Warm Beanie/Pirate Captain Hat/Prats Hat/Top Hat/Hunters Hat/Clown Hat (모자 6종) | **Prats Hats를 1/2/4/6/8/10개 건설** + Township Lv15~95(+ 타 스킬 레벨) | 각 1,000,000~6,000,000 GP — Firemaking/Ranged/GP/몬스터 리스폰 버프 |

즉 Malcs Cats · Cool Rocks · Prats Hats 3종은 §4에서 "효과 없음"으로 표기됐던 건물인데, **실제로는 생산 효과가 아니라 "건설 개수"가 Shop 잠금을 푸는 카운터** 역할을 한다 — 이 게임의 "건설 → 해금" 사례 중 가장 직접적인 사례.

### 8-3. Township Task 시스템 [위키/원문표(구조) — 개별 태스크 항목 300여 개는 전수 미기재, §13]

Task는 아이템 기부·몬스터 처치 수·건물 건설·(드물게) 스킬 XP를 요구하고 GP·Township XP·Slayer Coins·자원·아이템을 보상하는 **1회성 Main Task**와, 5시간마다 자동 배정되는 **반복형 Casual Task**로 나뉜다.

| 카테고리 | 개수 | 요구 보상 GP 수준(정액) | 비고 |
|---|---|---|---|
| Easy | 22 | 5,000 | Melvor Realm |
| Normal | 22 | 25,000 | |
| Hard | 22 | 500,000 | |
| Very Hard | 22 | 5,000,000 | |
| Elite | 22 | 10,000,000 | |
| Throne of the Herald(TotH) | 20 | 25,000,000 | |
| Atlas of Discovery(AoD) | 20 | 5,000~25,000,000(가변) | Cartography 발견 수 등 특수 조건 포함 |
| Into the Abyss(ItA, Abyssal Realm) | 74 | 50,000~100,000,000 Abyssal Pieces | |
| **Main Task 합계** | **224** | | |
| Casual Task | 170 | 2,500~60,000(자원) 고정, 9%×다음레벨 경험치를 Township XP로 환산·GP는 그 5배, Slayer Coins는 Slayer레벨×1,000 | 채집계열 스킬(Woodcutting/Fishing/Cooking/Mining/Smithing/Crafting/Fletching/Runecrafting/Herblore/Summoning/Astrology) 각 11단계 레벨 연동형 + 던전클리어 기반 몬스터 바운티 + 장비착용 몬스터 바운티 |

완료한 Main Task 수는 §8-1·§8-2의 여러 Shop/Trading Post 해금 조건으로 재사용된다(예: Food Box I은 Township Lv40+Task 40개, Box II는 Lv99+Task 85개). Casual Task는 5시간마다 배정, 미완료 5개 초과 시 신규 배정 중단, 스킵 시 GP 비용(다음 레벨까지 필요 경험치, 최대 10,000,000 GP)이 든다.

---

## 9. Township 레벨 구간표 [종합 — 여러 위키표에서 조합, 원문에 단일표 없음]

건물표(§4)·Biome표(§3)에서 "해금 레벨" 값을 전부 모아 레벨 오름차순으로 재배열한 것이다. 인구(Population) 조건은 각 항목 옆 괄호로 병기.

| Township 레벨 | 이 레벨에서 새로 열리는 것 |
|---|---|
| 1 | **Biome**: Grasslands·Forest·Mountains·Water(Melvor) / Abyssal Plains·Sulfuric Wastelands·Obsidian Cliffs(Abyssal, 인구 80,000 필요, ItA). **건물**: Basic Shelter·Wooden Hut(인구)·Fishermans Dock(식량)·Farmland(식량)·Woodcutters Camp(목재)·Carpenters Workshop(판자)·Miners Pit(석재/광석/석탄)·Blacksmiths Smithy(주괴)·Hunters Cabin(가죽)·Gatherers Hut(허브)·Herbalist(포션)·Storehouse(저장)·School(교육) — Abyssal: Abyssal Gateway·Wooden Walls·Weaponsmith I·Abyssal Harvester I·Reinforced Carpenter I·Obsidian Mines·Sanctuary(전부 인구 80,000 필요) |
| 10 | Armourer I·Abyssal Harvester II·Fire Pit·Divine Sanctuary(전부 인구 80,000, ItA) |
| 15 | **Biome**: Swamp·Valley·Arid Plains. **건물**: House·Plantation·Logging Camp·Miners Field·Blacksmiths Workshop·Tailor·Market·Orchard·Gardens·Tavern·Trading Post·Prats Hats |
| 20 | Stone Walls·Weaponsmith II·Reinforced Carpenter II·Obsidian Quarry·Runestone Crafter·Empowered Altar·Ethereal Sanctuary·Abyssal Enhancer(전부 인구 80,000+Fortification 2.5%, ItA) |
| 30 | **Biome**: Ethereal Voids(인구 80,000+Fortification 7.5%, ItA). Armourer II·Abyssal Harvester III·Runestone Combiner·Bonfire·Arcane Altar·Enchanted Tower(인구 80,000+Fortification 7.5%) |
| 35 | **Biome**: Jungle·Desert·Snowlands(인구 2,500). Cottage·Fishermans Pier·Carpenters Factory·Hunters Lodge·Gatherers Lodge·Infirmary·Clothier·Warehouse·Large School·Cemetery·Library·Chapel·Malcs Cats(전부 인구 2,500) |
| 40 | Obsidian Walls·Weaponsmith III·Armourer III·Reinforced Carpenter III·Obsidian Blaster·Ethereal Altar·Void Sanctuary·Abyssal Research Lab·Slayer Research Lab(전부 인구 80,000+Fortification 30%) |
| 50 | Weaponsmith IV·Armourer IV·Runestone Merger·Voidfire Beacon·Abyssal Combat Lab(전부 인구 80,000+Fortification 70% — Abyssal 건물 최고 티어 대부분이 이 레벨에서 마감) |
| 60 | Large Cottage·Fishermans Port·Mill·Forestry Camp·Carpenters Foundry·Miners Quarry·Blacksmiths Forge·Hunters Villa·Gatherers Villa·Magic Emporium(전부 인구 15,000) |
| 80 | Healing Centre·Outfitter·Repository·Academy·Town Hall·Statue of Worship(전부 인구 40,000) |
| 100 | Manor·Farming Estate·Forestry Estate·Carpenters Estate·Miners Estate·Blacksmiths Estate·Hunters Estate·Gatherers Estate·Cool Rocks(전부 인구 80,000, TotH 확장 건물 다수) |
| 110 | Estate·Fishermans Estate·Hospital·Clothiers Estate·Large Repository·Large Academy(전부 인구 175,000, TotH) |
| 120 | (TotH 확장 레벨 상한 — §4 건물표에는 Level 120 전용 건물 없음. Shop Box III류가 Lv120 요구, §8-1) |

Trading Post·Shop 해금 중 일부(Food Box 시리즈 등)는 **레벨 단독이 아니라 "레벨 + 완료한 Task 수"** 복합 조건이라 이 표에는 레벨만 반영했다 — 정확한 조건은 §8-1·§8-2 참고.

---

## 10. Abyssal Township 차이점 (Into the Abyss 확장) [위키/원문표+원문서술, 일부 위키/검색합성]

| 구분 | Melvor Township | Abyssal Township |
|---|---|---|
| XP 획득 방식 | 매 시간 업데이트마다 인구 수만큼 자동(passive) 획득 | **자동 XP 없음** — Abyssal Wave 전투 승리로만 Abyssal XP 획득 [위키/검색합성 — 원문서술 §1 "Abyssal Pieces·Abyssal Slayer Coins는 Abyssal Wave 승리로 획득"과 정합] |
| 진행의 병목 | 자원 생산량·Storage | **Armour & Weaponry 비축량**(Abyssal Wave 승리 조건) + Fortification(승리 시 XP 배율) |
| 저장 | Storage(기본 50,000) | Soul Storage(기본 1) — 별도 자원군 |
| Biome 해금 조건 | 레벨+인구 | 레벨+인구(80,000 고정)+**Fortification**(Ethereal Voids만 7.5% 추가 요구) |
| 자원 | 13종(Food/Wood/Planks/Stone/Bar/Ore/Coal/Rune Essence/Herbs/Potions/Leather/Clothing/GP) | 7종(Abyssal Pieces/Armour & Weaponry/Abyssal Stone/Reinforced Planks/Obsidian/Runestone/Voidfire Ash) — Abyssal Gateway만 예외적으로 Melvor 자원을 소모해 Abyssal 자원을 생산 |
| 건물 최고 티어 | Level 100~110 (Estate급) | 대부분 **Level 50**에서 마감(Weaponsmith IV·Armourer IV·Runestone Merger·Voidfire Beacon), Abyssal Combat Lab만 Level 50 |
| 신앙(Worship) | Aeris/Glacia/Terran/Ragnar(조건 없음)/Bane(이벤트)/The Herald(TotH 던전) | **Xon**(The Final Depth 클리어) 전용 — 효과가 전 Melvor Biome 생산량을 대폭 페널티(0% 체크포인트에서 최대 -99%)하는 대신 Abyssal Wave 보상(+Abyssal Pieces/Slayer Coins)과 Abyssal 4개 Biome 생산을 강화하는 구조 |
| 계절 | Spring/Summer/Fall/Winter + Nightfall/Solar Eclipse/Lemon Season | 위 + **Eternal Darkness**(Xon 전용) — 정규 계절도 Abyssal 자원(Obsidian/Runestone/Abyssal Stone/Armour & Weaponry/Reinforced Planks/Voidfire Ash)에 별도 배율을 추가로 부여 |
| Fortification | 없음(0 고정) | 요새화 스탯 신설, 상한 130%(Level 40), Walls·Altar·Enchanted Tower로 축적 |
| 태스크 | Easy~Elite+TotH+AoD (합계 150) | Into the Abyss 74개, 보상 화폐가 Abyssal Pieces/Abyssal Slayer Coins |

---

## 11. Pet 목록 [위키/원문표]

| Pet | DLC | 효과 | 해금 |
|---|---|---|---|
| B | Base | +10% Township Maximum Storage | 매 업데이트 1/120 확률 |
| Marcy | Base | +2% Township Skill XP | Malcs Cats 1개 |
| Roger | Base | +2% Township Resource Generation | Malcs Cats 2개 |
| Ace | Base | +1% Chance to Double Items Globally | Malcs Cats 4개 |
| Layla | Base | +2% Township Happiness | Malcs Cats 6개 |
| Mister Fuzzbutt | Base | +5% Global GP(아이템 판매 제외) | Malcs Cats 8개 |
| Octavius Lepidus VIII | Base | +2% Township Education | Malcs Cats 10개 |
| Classy Rock | TotH | +10 Mining Node Hitpoints | Cool Rocks 1개 |
| Cute Rock | TotH | +2% Mining·Smithing 아이템 복사 확률 | Cool Rocks 2개 |
| Royal Rock | TotH | +3% Mining 추가자원 확률(복사불가) | Cool Rocks 4개 |
| Elf Rock | TotH | +5% Global Evasion | Cool Rocks 6개 |
| Magic Rock | TotH | +3% Magic 아이템 복사 확률 | Cool Rocks 8개 |
| Party Rock | TotH | +4% 전 스킬 Mastery XP(Melvor Realm 전용) | Cool Rocks 10개 |

---

## 12. 확인 못 한 것

1. **Module:Township의 실제 수치 배열(Lua 소스)** — 위키의 함수 목록(getBiomeTable/getBuildingTable 등)만 확인했고, 그 함수가 참조하는 하위 데이터 모듈(별도 서브페이지로 존재할 가능성)은 열람하지 못함. 다만 §4의 건물표·§3의 Biome표는 그 함수들이 렌더링한 **최종 결과**를 그대로 가져온 것이므로 값 자체의 정확도는 문제없음.
2. **Lemvor Lemon Stall** — Shop 내비게이션(§4 "기타" 각주)에 건물명은 등장하지만 건물 마스터표(§4)에는 행이 없어 비용·효과·해금조건 전부 미확인. Atlas of Discovery 확장의 Lemon Season과 관련 있을 것으로 추정.
3. **Slayer Research Lab · Abyssal Combat Lab의 "효과"** — 건물표 원문에 Provides 칸이 비어 있음(§4). 아마도 전투/Slayer 관련 별도 페이지에 서술되어 있을 것이나 이번 조사 범위(Township 문서군)에서는 못 찾음.
4. **Nightfall·Eternal Darkness 계절의 정확한 지속시간** — 원문에 "3일(72시간)이 기본"이라는 서술은 있으나 이 두 계절에 대해서만 예외 언급이 없어, Lemon Season(24시간)처럼 다를 가능성을 배제 못 함. 72시간으로 추정만 해둠.
5. **Township Task 개별 항목 전수(약 224 Main + 170 Casual = 394개)** — 카테고리별 개수·보상 GP 정액·언락 패턴은 §8-3에 정리했지만, 항목 하나하나(예: "Easy 3: Golbin 25마리 → 5,000 GP+1,000 Slayer Coins+Steel Platebody(G) 1개")는 대부분 다른 스킬의 아이템/몬스터를 요구하는 것이라 이 문서의 "건설→해금" 목적과 관련도가 낮다고 판단해 전수 옮기지 않음 — 필요하면 추가 조사 가능.
6. **Trading Post 74개 교환품의 전수 개별 행** — §8-1에 자원별 대표 패턴·예시로 요약. 정확한 전체 74행이 필요하면 추가 조사 가능.
7. **Statue of Aeris/Glacia/Terran/Ragnar/Bane/The Herald/Xon 개별 건설비용 차이 여부** — 위키 건물표는 전부 "Statue of Worship" 1행(Worship +20, 1,000,000 GP+35,000 Stone+10,000 Bar)으로 병합해 제공. 신마다 비용이 다른지, 완전히 동일한지는 병합 표기 특성상 확인 불가(원문 서술상 "생산량은 전부 동일"만 확정, 비용까지 동일한지는 미확인).
8. **Ethereal Voids의 "Fortification 7.5%" 해금 조건이 플레이어 개인 스탯인지 특정 Biome 누적치인지** — 원문 표기(Biome 해금 요건 열)로만 보면 진행 중인 세이브의 전체 Fortification 수치로 추정되나, Fortification이 Biome별로 다르게 집계되는지는 명확한 서술을 못 찾음.

---

*마지막 업데이트: 2026-09-23*
