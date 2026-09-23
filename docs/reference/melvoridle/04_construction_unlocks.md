# Melvor Idle — Township 밖의 「지어서 여는」 구조

> 상태: **전수 조사 완료** (2026-09-23)
> 목적: 「건설 → 해금」 표본의 둘째 갈래. 마을 건물이 아닌 **슬롯을 사서 채우는** 구조 — Agility 장애물 코스 · Farming 밭 · Cartography 발굴지 · 은행 칸 · 상점 영구 해금. 짝 문서 [03_township_buildings.md](03_township_buildings.md) 가 Township 건물 전수를 담는다
> 우리 초안과의 대조는 [construction_draft.md](../../game_design/construction_draft.md) §11(구조) · 부록 B(다른 게임의 거점 건물)
> ⚠ **여기 수치는 전부 Melvor Idle 의 것이다.** 본작 SSOT 가 아니며 `src/data/*.csv` 로 옮기지 말 것

---

조사 방법: 공식 위키(wiki.melvoridle.com)를 MediaWiki API 및 `r.jina.ai` 프록시로 조회(직접 WebFetch는 403/401로 차단). 미러(melvoridle.wiki.gg)는 프록시 경유로도 401/400 응답이 반복되어 대부분 접근 실패. 표가 큰 문서는 프록시가 "표 전체 복제 불가"로 요약·재서술하는 경우가 있어 해당 항목은 신뢰도를 낮춰 표기했다.

출처 신뢰도 표기: **[위키]**(위키 원문 직접 확인) / **[위키/검색합성]**(위키 조각 + 검색엔진 스니펫 조합) / **[커뮤니티]**(레딧·Steam 토론 등) / **[미확인]**(못 찾음)

---

## 1. Agility — 코스(Course) 구조

### 1-1. 슬롯 개수와 열리는 조건

Melvor Realm 코스: 슬롯 **12개**(기본 10개 + Throne of the Herald 확장 2개). Abyssal Realm 코스: 슬롯 **11개**(Into the Abyss 확장, 세부는 §1-8 확인 못 한 것 참고).

| 슬롯 | Agility 레벨 요구치 | 비고 |
|---|---|---|
| 1 | 1 | |
| 2 | 10 | |
| 3 | 20 | |
| 4 | 30 | |
| 5 | 40 | |
| 6 | 50 | |
| 7 | 60 | "함정(trap)" 전용 슬롯(§1-3 참고) |
| 8 | 70 | |
| 9 | 80 | |
| 10 | 90 | |
| 11 | 100 | Throne of the Herald 확장 필요 |
| 12 | 105 | Throne of the Herald 확장 필요 |

[위키]

**슬롯 잠금 규칙(통념과 다름, 위키 원문)**:
> "In order to receive an obstacle's bonuses, all earlier obstacle course slots must contain an obstacle."

즉 레벨만 되면 슬롯 자체는 지을 수 있지만, **그 보너스를 받으려면 그보다 앞선 모든 슬롯이 채워져 있어야** 한다. "이전 슬롯 완료가 다음 슬롯을 연다"는 게 아니라 "**건설 게이트**"가 아닌 "**보너스 지급 게이트**"라는 점이 특징적이다. [위키]

### 1-2. 슬롯별 장애물(Obstacle) · 건설 비용 · 패시브 보너스 (Melvor Realm 전체)

수치는 위키 원문 그대로(반올림 없음). 페널티는 **굵게** 표시.

**슬롯 1 (Lv1)** — 전부 10,000 GP

| 장애물 | 비용 | 보너스 |
|---|---|---|
| Cargo Net | 10,000 GP | +3% Global GP(아이템 판매 제외), +2% Fishing Mastery XP |
| Rope Swing | 10,000 GP | +2% Agility Mastery XP |
| Rope Climb | 10,000 GP | +2% Thieving Mastery XP |

**슬롯 2 (Lv10)**

| 장애물 | 비용 | 보너스 |
|---|---|---|
| River Crossing | 50,000 GP + Paper 200 | -5% dig site map 정제 비용, +5% Cartography Skill XP |
| Balance Beam | 50,000 GP | +2% Agility Skill XP |
| Monkey Bars | 50,000 GP + Oak Logs 250 | -4% Firemaking Interval |
| Rope Jump | 50,000 GP | +3% Smithing Mastery XP |

**슬롯 3 (Lv20)**

| 장애물 | 비용 | 보너스 |
|---|---|---|
| Stepping Stones | 150,000 GP + Willow Logs 300 + Teak Logs 300 | -6% Woodcutting Interval, +3% Firemaking Skill XP |
| Pit Jump | 150,000 GP + Raw Herring 300 + Raw Salmon 300 | +3% 전 스킬 Skill XP, **-4% Agility Skill XP** |
| Pipe Climb | 150,000 GP + Slayer Coins 1,000 + Iron Bars 300 | +5% Melee Evasion, +5% Melee Maximum Hit |
| Burning Coals | 150,000 GP + Coal Ore 350 + Oak Logs 200 | -3% Cooking Interval, +3% Cooking Skill XP, **-6% Damage To All Monsters**, +5% Cooking Success |
| Pipe Balance | 150,000 GP + Iron Ore 300 + Tin Ore 300 | +3% Mining damage avoidance, +10 Mining Node Hitpoints, +3% Resource Preservation |
| Balance Seesaw | 150,000 GP | +2% Agility Mastery XP, +2% Agility Skill XP |

**슬롯 4 (Lv30)**

| 장애물 | 비용 | 보너스 |
|---|---|---|
| Cave Trail | 150,000 GP + Large Stones 20 | +6% Archaeology Mastery/Skill XP, +5% dig site map 발굴 보존율 |
| Gap Jump | 250,000 GP + Mind Runes 500 | +3% Runecrafting Mastery XP |
| Mud Crawl | 250,000 GP + Garum/Sourweed/Mantalyme Herb 각 250 | +2% Herblore Mastery/Skill XP, **-10% Farming 자원량**, +3% Herblore Resource Preservation |
| Cave Climb | 250,000 GP + Slayer Coins 5,000 + Air Runes 500 + Earth Runes 500 + Iron Bars 250 | **-40 최대 HP**, +5% Ammo/Rune Preservation, +5% Melee Maximum Hit |
| Mud Dive | 250,000 GP + Slayer Coins 5,000 + Mithril Bars 500 | +20 최대 HP, **-4% Damage Reduction**, +5% Melee Accuracy, +2% Melee Maximum Hit |
| Coal Stones | 250,000 GP + Tomato Seeds 100 + Salmon 500 | **-4% 전 스킬 Skill XP**, +10% Food Healing, +20% Thieving GP, +3% Resource Preservation |

**슬롯 5 (Lv40)**

| 장애물 | 비용 | 보너스 |
|---|---|---|
| Rooftop Run | 500,000 GP + Lemontyle Herb 500 + Lobster 750 | -0.2s Thieving Interval, +35 Stealth, +3% Thieving Skill XP, +20% Thieving GP, **-10% Damage To All Monsters** |
| Rock Climb | 500,000 GP + Teak Logs 500 + Coal Ore 500 + Onion Seeds 500 | **-10% Resource Preservation**, +5% Double Items(Fishing/Woodcutting/Mining/Thieving) |
| Tree Climb | 500,000 GP + Mahogany Logs 1,000 + Iron Arrows 2,000 + Chaos Runes 2,000 | +3% 전 스킬 Mastery XP, +4% 전 스킬 Skill XP, **보존 계열 페널티 -10%(세부 항목명 미확인)** |
| Cliff Balance | 500,000 GP + Slayer Coins 20,000 + Mithril Ore 500 + Coal Ore 500 + Rune Essence 1,000 | +20 최대 HP, +5% Ranged/Magic/Melee Accuracy, **+2 Prayer Point Cost(페널티)** |
| Mountain Climb | 500,000 GP + Bones 1,000 | -12% Agility Interval, **-8% Agility Skill XP**, +15% Agility GP, **-2% Agility Mastery XP** |
| Cliff Climb | 500,000 GP + Slayer Coins 20,000 + Mithril Bars 1,000 | +5% Slayer Task Damage, +10% Slayer Task Length, **-20% Slayer Area Effect**, **-10% Slayer Skill XP**, +10% Slayer Coins |

**슬롯 6 (Lv50)**

| 장애물 | 비용 | 보너스 |
|---|---|---|
| Raft Drifting | 1,000,000 GP + Watermelon 3,000 | +10% Farming 기본 자원량 |
| Tree Hop | 1,000,000 GP + Steel Arrows 2,500 + Nature Runes 2,500 | +5% Ammo/Rune Preservation, +5% Resource Preservation |
| Forest Trail | 1,000,000 GP + Maple Logs 1,500 | -5% Summoning Interval, +5% Summoning Mastery XP, **-6% Farming 자원량** |
| Lake Swim | 1,000,000 GP + Slayer Coins 50,000 + Silver Bars 2,500 | +1% Damage Reduction, +5% Damage To All Monsters, +3% Prayer Point Preservation |
| Rocky Waters | 1,000,000 GP + Slayer Coins 50,000 + Lobster 3,000 | +50 최대 HP |
| Tree Balance | 1,000,000 GP | -12% Agility Interval, **-4% 전 스킬 Skill XP** |

**슬롯 7 (Lv60)** — "함정(trap)" 전용, 전부 2,500,000 GP, **5개 선택지 전부 순(純) 페널티**

| 장애물 | 비용 | 보너스(전부 페널티) |
|---|---|---|
| Spike Trap | 2,500,000 GP | -40 최대 HP, -2% Damage Reduction |
| Heat Trap | 2,500,000 GP | -10% Auto Eat Efficiency, -10% Damage To All Monsters |
| Water Trap | 2,500,000 GP | -6% 전 스킬 Mastery/Skill XP |
| Freezing Trap | 2,500,000 GP | -16% Ranged/Magic/Melee Accuracy, -30% Ammo/Rune Preservation |
| Boulder Trap | 2,500,000 GP | -20% Resource Preservation |

설계 참고 포인트: 이 슬롯만 유일하게 "가장 덜 나쁜 페널티"를 강제로 골라야 이후 슬롯이 열리는(정확히는 보너스가 유지되는) 구조다.

**슬롯 8 (Lv70)**

| 장애물 | 비용 | 보너스 |
|---|---|---|
| Runic Trail | 5,000,000 GP + Slayer Coins 100,000 + Gold/Black Summoning Shard 500 | +3 Summoning 기본 자원, +15% Summoning Charge Preservation, +5% Summoning Resource Preservation, **-16% Herblore Resource Preservation** |
| Sweltering Pools | 5,000,000 GP + Yew Logs 1,000 + Adamantite Bars 500 + Coal Ore 1,000 | +3% Cooking Mastery XP, +10% Auto Eat Efficiency, +10% Food Healing, -3% Cooking Interval, **-20% Resource Preservation** |
| Spike Jump | 5,000,000 GP + Slayer Coins 150,000 + Emerald 2,000 | +5% Dungeon Damage, +5% Double Loot in Combat |
| A Lovely Jog | 5,000,000 GP + Magic Logs 5,000 | **-6% 전 스킬 Mastery XP**, +5% 전 스킬 Skill XP |
| Raft Building | 5,000,000 GP + Slayer Coins 150,000 + Swordfish 2,000 | +20 최대 HP, +2% Damage To All Monsters, +1% Damage Reduction |
| Pipe Crawl | 5,000,000 GP + Slayer Coins 150,000 + Adamantite Bars 4,000 | +8% Slayer Area Damage, **-10% Slayer Coins** |
| Tree Hang | 5,000,000 GP + Barrentoe Herb 5,000 | +5% 전 스킬 Mastery XP, **-6% 전 스킬 Skill XP** |

**슬롯 9 (Lv80)**

| 장애물 | 비용 | 보너스 |
|---|---|---|
| Cave Maze | 10,000,000 GP + Dragon Bones 5,000 | +10% Prayer Point Preservation, +10% Ammo/Rune Preservation, -1 Prayer Point Cost |
| Ocean Drifting | 10,000,000 GP + Slayer Coins 250,000 + Magic Logs 5,000 + Paper 5,000 + Coral 500 | -5% Cartography Interval, -10% dig site map 정제 비용, +10% Double Items(Archaeology/Cartography) |
| Water Jump | 10,000,000 GP + Slayer Coins 250,000 + Rune Arrows 5,000 + Death Runes 5,000 + Gold Bars 5,000 | +3% 전 스킬 Mastery XP, +8% Maximum Hit(전 전투 스타일) |
| Frozen Lake Crossing | 10,000,000 GP + Slayer Coins 250,000 + Adamantite Bars 7,500 | +5% Slayer Skill XP, +3% Damage To All Monsters, +10% Slayer Coins, +10% Auto Eat Efficiency |
| Ice Jump | 10,000,000 GP + Crab 2,500 + Coal Ore 5,000 + Diamond 2,000 | +20 최대 HP, +5% Food Healing, +5% Double Items(전역), +10 Mining Node Hitpoints, +10% Resource Preservation |
| Lava Jump | 10,000,000 GP + Slayer Coins 250,000 + Shark 2,500 + Silver Bars 5,000 + Redwood Logs 5,000 | **-6% Damage Reduction**, **-6% Auto Eat Efficiency**, **-6% 전 스킬 Mastery XP**, -0.3s Monster Respawn |

**슬롯 10 (Lv90)**

| 장애물 | 비용 | 보너스 |
|---|---|---|
| Boulder Move | 20,000,000 GP + Dragonite Bars 10,000 + Redwood Logs 10,000 | +8% 전 스킬 Mastery XP |
| Dragon Fight | 20,000,000 GP + Slayer Coins 300,000 + Whale 3,000 | **-16% Auto Eat Efficiency**, -0.3s Monster Respawn |
| Waterfall | 20,000,000 GP + Stardust 3,000 | -5% Astrology Interval, +5% Astrology Skill/Mastery XP |
| Lava Waterfall Dodge | 20,000,000 GP + Magic Bones 10,000 + Dragon Arrows 10,000 + Ancient Runes 10,000 | +10% Prayer Point Preservation, +5% Ammo Preservation, +10% Rune Preservation, +10% Resource Preservation |
| Ocean Rafting | 20,000,000 GP + Slayer Coins 300,000 + Carrot 30,000 | +5% Damage To All Monsters, +10% Slayer Coins, +5% Auto Eat Efficiency |

**슬롯 11 (Lv100, Throne of the Herald 필요)**

| 장애물 | 비용 | 보너스 |
|---|---|---|
| Pipe Maze | 30,000,000 GP + Slayer Coins 300,000 + Onyx 8,000 | +5% Dungeon Damage, **-20% Double Loot in Combat** |
| Pit Maze | 30,000,000 GP + Corundumite Ore 12,500 | +3% Melvor Mastery XP, **-20% Resource Preservation**, +15 Mining Node Hitpoints, +2% Quality Superior Gem 확률 |
| Forest Maze | 30,000,000 GP + Slayer Coins 500,000 + Lava Fish 8,000 + Corundumite Bars 6,000 | **-20% Global Accuracy**, **-20% Auto Eat Efficiency**, +15% Slayer Area Effect Negation, +8% Slayer Skill XP, +10% Slayer Coins |
| Water Maze | 30,000,000 GP + Spruce Logs 12,500 + Snowcress Herb 6,000 | +10% Double Items(전역), **-10% 전 스킬 Skill XP** |
| Frozen Maze | 30,000,000 GP + Slayer Coins 300,000 + Holy Dust 12,500 + Corundum Arrows 7,500 | +1% Damage Reduction, -0.1s Monster Respawn, -3 Prayer Point Cost, **-20% Rune/Ammo Preservation** |

**슬롯 12 (Lv105, Throne of the Herald 필요)**

| 장애물 | 비용 | 보너스 |
|---|---|---|
| Boulder Balance | 50,000,000 GP + Poison Runes 20,000 + Revenant Shortbow 10,000 + Corundum Sword 10,000 | **-20% Global Accuracy**, +5% of Maximum Hit를 Minimum Hit에 가산, -0.1s Attack Interval |
| Forest Jog | 50,000,000 GP + Oricha 5,000 | **-6% Melvor Mastery XP**, -5% Agility 건설 비용, +25% Agility GP |
| Rune Crawl | 50,000,000 GP + Hornbeam Logs 15,000 + Gold/Black Summoning Shard 5,000 | -5% Summoning Interval, **-20% Potion Charge Preservation**, +10% Summoning Charge Preservation, +6 Summoning 기본 자원 |
| Monkey Trail | 50,000,000 GP + Coal Ore 7,500 + Magma Fish 5,000 + Chilli 7,500 | -5% Cooking Interval, +10% Food Healing, **-6% Agility Skill XP**, **-10% Resource Preservation**, +15% Farming 자원량 |

[위키] — 슬롯 11/12에 전투 스킬(Prayer/Defence/Attack 등) 부가 레벨 요구가 있다는 스니펫이 한 번 나왔으나 재검증 실패 → **[미확인]**

### 1-3. 페널티 종합 패턴

슬롯 3부터 절반 이상의 장애물이 트레이드오프형(보너스+페널티 동시 부여)이다. 대표 패턴: (1) A 스킬 XP↑ 대신 B 스킬 XP↓, (2) 명중률/대미지↑ 대신 최대HP/피해감소↓, (3) 한 자원 보존↑ 대신 다른 자원 보존↓. 슬롯 7 전체는 순수 페널티만 있는 특수 사례. [위키]

### 1-4. Pillar(기둥)

**공통 규칙(위키 원문)**:
> "the player must also have an obstacle built in every obstacle slot with a lower or equal agility level requirement."
> "Only one pillar, one elite pillar, and one abyssal pillar can be active at a time, and the cost must be paid each time the active pillar is changed."
> "The cost of building pillars is reduced by 10% once the Agility Prosperity upgrade has been purchased from the Shop."

**Melvor Realm 필러** (Agility Lv99, 전부 50,000,000 GP + Gold Bar 5,000 + Silver Bar 5,000)

| 필러 | 효과 |
|---|---|
| Pillar of Combat | +10% Ranged/Melee/Magic Evasion, +10 고정 HP 재생 |
| Pillar of Skilling | +2% 전 스킬 Mastery XP, +3% Resource Preservation, +3% Double Items(전역) |
| Pillar of Generosity | +10% Global GP(아이템 판매 제외), +5 포션당 충전 횟수, +10 은행 공간 |

[위키]

### 1-5. Elite Pillar

**해금 조건**: Agility Lv120 + Throne of the Herald 확장 소유. **비용**: 전부 250,000,000 GP + Carrion Logs 10,000 + Divinite Bar 10,000(Conflict만 Slayer Coins 3,000,000 추가).

| Elite 필러 | 효과 |
|---|---|
| Elite Pillar of Conflict | +350% GP from Combat, +10% Lifesteal, +50% Hitpoint Regeneration |
| Elite Pillar of Endowment | +50 은행 공간, +20% Summoning Charge 보존 확률, Summoning 기본 자원 +20 |
| Elite Pillar of Expertise | +8% Mastery XP(Melvor Realm 전 스킬), +40% Global GP(아이템 판매 제외), -3% Interval(비전투 스킬) |

[위키]

참고(Abyssal Realm 필러 — Abyssal Agility Lv60, 전부 250,000,000 Abyssal Pieces + Voidia Logs 30,000 + Netherite Bars 30,000): Wrath/Greed/Sloth Obelisk 3종 존재. [위키, 확인 회수 1회로 신뢰도 한 단계 낮음]

### 1-6. 코스 변경 비용 · 반복 건설 할인

- **파괴(Destroy)**: 재료 환불 없음, 재건 전까지 보너스 없음.
- **동일 장애물 재건축 할인**: 지을 때마다 그 장애물 **아이템 비용**이 4%씩 감소, 최대 10회 = **40% 할인**.
- **아이템 비용 총 상한**: 반복건설 40% + 마스터리 20% + 마스터리 풀 15% 등이 겹쳐 최대 **95%**, "Agility Item Cost Reduction Enhancement" 상점 업그레이드 구매 시 **100%**.
- **GP/Slayer Coin 비용 상한**: 최대 **60%** 할인(Superior Agility Skillcape 30% + 마스터리 20% + 마스터리 풀 10%).
- **마스터리 풀 체크포인트**(Melvor Realm, 총 39,500,000 XP): 10%(3,950,000 XP)=+5% Agility Mastery XP / 25%(9,875,000)=+10% Agility GP / 50%(19,750,000)=-10% 오브젝트 아이템&화폐 건설비 / 95%(37,525,000)=-15% 오브젝트 아이템 건설비.
- **블루프린트**: realm당 최대 **5개**까지 코스 구성을 저장·통째로 스왑 가능. 스왑 시 빈 슬롯에 있던 기존 장애물은 삭제됨. 전환 자체의 별도 골드 비용은 확인 안 됨.
- 필러 변경에 4%/40% 반복 할인·마스터리 풀 할인이 적용되는지는 위키에 명시 없음(§1-8 참고).

[위키]

---

## 2. Farming — 밭(Plot) 구조

### 2-1. 개요

Farming은 방치형(액티브 조작 없음) 스킬. 레벨 상한 99(확장 시 120/Abyssal 60). 밭(Plot, 인프라)과 심을 작물(Seed, 콘텐츠)이 분리되어 있다 — 같은 Plot에 Melvor 작물과 Abyssal 작물을 둘 다 심을 수 있다.

밭 종류 4개(사용자 질문의 3종 + 위키 확인된 1종 Special):

| 밭 종류 | Plot 개수 |
|---|---|
| Allotments(농작물) | 19개 |
| Herbs(허브) | 16개 |
| Trees(나무) | 6개 |
| Special(Archaeology 연계) | 6개 |

### 2-2. Plot별 해금 조건(레벨·비용, 위키 원문 그대로)

**Allotments (19개)**

| Plot | 요구 레벨 | 비용 |
|---|---|---|
| 1 | 1 | Free |
| 2 | 1 | 500 |
| 3 | 1 | 5,000 |
| 4 | 5 | 10,000 + Giant Clay Pot 20 |
| 5 | 10 | 15,000 |
| 6 | 20 | 25,000 |
| 7 | 25 | 350,000 + Giant Clay Pot 100 |
| 8 | 30 | 40,000 |
| 9 | 40 | 65,000 |
| 10 | 50 | 80,000 |
| 11 | 55 | 100,000 + Giant Clay Pot 200 |
| 12 | 60 | 100,000 |
| 13 | 70 | 120,000 |
| 14 | 80 | 150,000 |
| 15 | 85 | 4,000,000 + Giant Clay Pot 350 |
| 16 | 90 | 200,000 |
| 17 | 100 | 1,000,000 |
| 18 | 110 | 5,000,000 |
| 19 | 118 | 10,000,000 |

**Herbs (16개)**

| Plot | 요구 레벨 | 비용 |
|---|---|---|
| 1 | 5 | 10,000 + Giant Clay Pot 20 |
| 2 | 5 | 10,000 |
| 3 | 5 | 20,000 |
| 4 | 15 | 35,000 |
| 5 | 25 | 350,000 + Giant Clay Pot 100 |
| 6 | 35 | 50,000 |
| 7 | 45 | 80,000 |
| 8 | 55 | 900,000 + Giant Clay Pot 200 |
| 9 | 55 | 100,000 |
| 10 | 65 | 125,000 |
| 11 | 75 | 150,000 |
| 12 | 85 | 17,000,000 + Giant Clay Pot 350 |
| 13 | 85 | 200,000 |
| 14 | 102 | 1,000,000 |
| 15 | 110 | 5,000,000 |
| 16 | 118 | 10,000,000 |

**Trees (6개)**

| Plot | 요구 레벨 | 비용 |
|---|---|---|
| 1 | 15 | 50,000 |
| 2 | 30 | 100,000 |
| 3 | 60 | 250,000 |
| 4 | 80 | 400,000 |
| 5 | 105 | 5,000,000 |
| 6 | 115 | 10,000,000 |

**Special (6개, 참고용)**

| Plot | 요구 레벨 | 비용 |
|---|---|---|
| 1 | 7 | 100,000 |
| 2 | 14 | 250,000 |
| 3 | 24 | 1,000,000 |
| 4 | 34 | 10,000,000 |
| 5 | 44 | 100,000,000 |
| 6 | 54 | 100,000,000 |

[위키]. Trees·Special에는 Giant Clay Pot 옵션 없음. Giant Clay Pot은 Archaeology 스킬의 유물(Artefact) 아이템으로, Ancient Market 발굴로 획득(레벨6 발굴, 1회 4초, 기본 확률 24.72%) — **골드만으로 우회 불가한 4단계 마일스톤 Plot**이 Allotments·Herbs 각각에 4개씩 존재한다는 뜻. 8개 Plot 몫 합계 Giant Clay Pot 1,340개 + 골드 22,720,000. [위키] (단 Herb Plot 번호가 위키 내에서 문서마다 1/5/8/12 vs 4/7/11/15로 불일치 — Farming 페이지 표를 채택, §2-4 확인 못 한 것 참고)

### 2-3. 작물(Seed) 해금 조건 — 중요한 정정

씨앗은 **골드로 상점에서 사는 게 아니라** 전투 드롭·상자 개봉·Thieving·Woodcutting(새 둥지) 등 확률 기반으로 획득한다. 즉 작물 해금은 사실상 "Farming 레벨"(심을 자격) 하나뿐이고, 실제로 씨앗을 손에 넣는 것은 별개의 드롭 확률 문제다. [위키]

**Melvor Allotments (17종, 레벨/성장시간)**: Lv1 Potato(2h) → Lv5 Onion(2h) → Lv7 Cabbage(2h) → Lv12 Tomato(2h) → Lv20 Sweetcorn(3h)/Ancient Wildberry(3h) → Lv31 Strawberry(3h) → Lv40 Cherry(3h) → Lv47 Watermelon(4h) → Lv50 Ancient Corn(4h) → Lv61 Snape Grass(3h30m) → Lv69 Carrot(3h30m)/Ancient Carrot(3h30m) → Lv100 Pumpkin(5h) → Lv105 Chilli(5h) → Lv115 Mushroom(6h30m) → Lv118 Starfruit(7h30m). [위키]

**Abyssal Allotments (7종)**: Lv1 Abyssal Potato(2h) → Lv10 Abyssal Pumpkin(3h) → Lv20 Gloompepper(4h30m) → Lv30 Shadenut(6h) → Lv40 Withermelon(8h) → Lv50 Whisperradish(10h) → Lv55 Eldraberry(12h). [위키]

**Melvor Herbs (12종)**: Lv5 Garum(1h30m) → Lv15 Sourweed(1h30m) → Lv25 Mantalyme(2h) → Lv35 Lemontyle(2h30m) → Lv50 Oxilyme(3h) → Lv60 Poraxx(3h30m) → Lv70 Pigtayle(3h30m) → Lv80 Barrentoe(4h) → Lv102 Snowcress(4h) → Lv106 Bitterlyme(4h) → Lv112 Moonwort(5h) → Lv118 Wurmtayle(5h30m). [위키]

**Abyssal Herbs (10종)**: Lv2 Gloomsprout(1h30m) → Lv8 Nightgleam(2h) → Lv15 Blightblossom(2h30m) → Lv22 Shadefrond(3h) → Lv29 Fearmallow(4h) → Lv36 Witherlyme(5h) → Lv43 Whispertallow(6h) → Lv50 Echosnap(7h) → Lv53 Eldraroot(8h) → Lv56 Voidbloom(9h). [위키]

**Melvor Trees (10종, 심을 때 XP 없음·수확 시 고정 XP)**: Lv15 Oak(6h40m, XP 5,835) → Lv30 Willow(9h20m, 18,185) → Lv45 Maple(10h40m, 42,535) → Lv60 Yew(13h20m, 88,360) → Lv70 Apple(6h40m, 48,925) → Lv75 Magic(16h, 172,250) → Lv100 Banana(18h, 200,000) → Lv105 Grove(18h, 220,000) → Lv110 Elderwood(20h, 315,000) → Lv120 Carrion(22h, 405,000). [위키]

**Abyssal Trees (6종)**: Lv5 Abyssia(14h) → Lv15 Brumia(18h) → Lv25 Gloomia(22h) → Lv35 Withia(1d2h) → Lv45 Nethia(1d6h) → Lv55 Eldria(1d10h). [위키]

### 2-4. 수확 성공 확률 · 퇴비(Compost) 시스템

위키 원문 인용:
> "Seeds planted without fertiliser have a 50% chance to yield crops after growing, unless either mastery level 50 or the 25% Mastery Pool Checkpoint has been reached."

- **기본 생존 확률 50%** — 성장 완료 시점에 단 1회 판정(중간 부패 없음).
- **Compost**: 1개당 생존확률 +10%, 최대 5개(=100% 보장), 파종 전에만 적용. 상점에서 500 GP 구매 가능.
- **Weird Gloop**: 1개만으로 생존 100% + 수확량 +10%. 제작 전용(Compost 2개 + Rune Essence 10개), 직접 구매 불가.
- **Abyssal Compost**: Abyssal 전용 밭, 수확량 +50% 대신 씨앗 회수(Seed Return) 완전 차단. Plot당 10개 필요.
- **마스터리로 죽음 자체 제거**: 개별 씨앗 Mastery Lv50 이상, 또는 Melvor Realm 마스터리 풀 25% 체크포인트("Crops in Farming cannot die") 도달 시 컴포스트 없이 100% 보장.
- **씨앗 회수(Seed Return)**: 마스터리 레벨 16부터 가능. 공식 `Q_s = (n/x)(x-(n+1)/2)`, `x=L_m/15`, `n=floor(x)`. 마스터리 75에서 평균 2개 회수(Herb 자기유지 달성), 마스터리 99(내부 120 취급)에서 평균 3.5개(Allotment 자기유지 달성). Abyssal Compost 사용 시 회수 자체가 차단됨(수확량 vs 자기유지 트레이드오프).

[위키]

### 2-5. Plot 확장의 다른 경로

"Township 연계로 Plot이 늘어난다"는 근거는 Farming/Township 문서 어디에서도 발견되지 않았다. 확인된 유일한 확장 수단은 Archaeology 스킬의 Giant Clay Pot(위 §2-2)뿐이며, 그 외 "특정 아이템"으로 여는 별도 경로는 없다. [위키]

---

## 3. Summoning · Astrology · Cartography

### 3-1. Summoning — 결론: 건설형 요소 거의 없음

| 요소 | 조건 | 성격 |
|---|---|---|
| Mark 최초 발견 | 해당 스킬 행동 중 확률 발견 | 순수 확률 |
| **Tablet 제작 게이트** | 첫 Mark 발견 후, 그 Familiar의 Summoning Tablet을 **최소 1개 제작해야만** 이후 Mark가 추가로 발견됨 | 조사 대상 중 유일하게 제작(건설)형에 가까운 게이트 [커뮤니티] |
| Synergy 해금 | 두 Familiar 각각의 Mark Level 조건 충족(공식: 필요 Mark Level = 1 + 상대 Familiar Tier) 시 자동 | 순수 레벨 기반 [위키/검색합성]+[커뮤니티] |
| Mark Level 진행(예시) | 누적 Mark 수 Lv1=1개, Lv2=6개, Lv3=16개, Lv4=31개, Lv5=46개, Lv6=61개 | [위키/검색합성, 원문 표 재검증 필요] |

결론: Summoning엔 "재료를 모아 짓고 그게 지속효과를 여는" 건설형 요소가 사실상 없다. Tablet 최초 제작이 발견 재개 게이트가 되는 정도가 유일한 근사 사례.

### 3-2. Astrology — 결론: 레벨(Mastery)+시간 투자형, 건설형 아님

**Constellation 15종과 레벨 구간**

| 순서 | Constellation | 레벨 구간 |
|---|---|---|
| 1 | Deedree | 1–10 |
| 2 | Iridan | 10–20 |
| 3 | Ameria | 20–30 |
| 4 | Terra | 30–40 |
| 5 | Vale | 40–50 |
| 6 | Syllia | 50–60 |
| 7 | Arachi | 60–69 |
| 8 | Ko | 70–80 |
| 9 | Tellus | 80–90 |
| 10 | Hyden | 90–95 |
| 11 | Qimican | 95–99 |
| 12 | Variel | 99–105(Throne of the Herald) |
| 13 | Haemir | 105–110(〃) |
| 14 | Rosaniya | 110–115(〃) |
| 15 | Ashtar | 115–120(〃) |

[위키/검색합성, 순서·구간 2출처 일치]

**내부 구조**: Constellation당 사전결정된 Star(모디파이어) **6개**. 일반(Standard) 모디파이어는 최대 레벨 8·재화 Stardust, 유니크(Unique) 모디파이어는 최대 레벨 5·재화 Golden Stardust. Star 자체는 해당 Constellation의 **Mastery 레벨 20/40/60/80/99**에서 순차 해금(문턱 5개 vs Star 6개의 1:1 대응은 재확인 못함). Stardust는 Astrology 행동 시 기본 5% 확률 획득 + 특정 다른 스킬 행동(예: Magic Tree 벌목)에도 곁다리 확률 부여. [위키/검색합성]

결론: 진행 축은 (1) Mastery 레벨 → Star 슬롯이 열림, (2) Stardust/Golden Stardust 소모 → 슬롯 레벨업. "짓고 배치"하는 개념이 없어 순수 시간투자형 해금의 반례로 인용하기 좋다.

### 3-3. Cartography (지도 제작) — 가장 「건설→해금」에 가까운 사례

**구조**: Cartography로 Hex(육각 타일)를 Survey(측량) → Hex 안의 POI/Dig Site 발견 → Archaeology로 Dig Site 발굴(Excavate) → "Chart" 계열 아이템 획득 → 그 Chart가 지도 위 다른 숨겨진 Dig Site/POI를 드러냄(초록 느낌표) → 반복.

(주의: 위키의 `w/Map` 문서는 v0.10~0.12 테스트 후 v0.13에서 삭제된 구버전 시스템이라 현재와 무관. 현재 "지도"는 **Dig Site Map** 아이템을 가리킴.)

**Dig Site Map 등급업**: Poor → Fine → Excellent → Perfect(4단계). Dig Site 최초 발견 시 Excellent 등급 무료 지급(Artefact Value 사이즈별 33), 신규 제작은 Poor부터(69). 등급 하나 올릴 때마다 Artefact Value가 사이즈별 13~23 랜덤 감소. Refinement(정제)는 등급마다 GP 소모로 옵션 선택(Poor 1,000GP / Fine 50,000GP / Excellent 500,000GP / Perfect 5,000,000GP). Map Slot은 기본 소수 + 최대 +4개 추가 해금 가능. [위키/검색합성, 등급업 소요시간·액션수 수치는 출처 간 불일치 — §5 확인 못 한 것 참고]

**Dig Site 18개 해금 조건**

| Dig Site | 요구 레벨 | 해금 조건 | 좌표 |
|---|---|---|---|
| Old Village | 1 | Hex Survey Lv5 | (13,17) |
| Ancient Market | 6 | Hex Survey Lv5 | (0,14) |
| Sacrificial Site | 12 | Cult Flyer 지도 아이템 획득 | (13,12) |
| Stoneworkers | 18 | Hex Survey Lv5 | (24,14) |
| Monuments | 24 | Hex Survey Lv5 | (6,11) |
| Bazaar | 32 | City Chart 획득 | (15,11) |
| Secret Mines | 40 | Shipment Chart 획득 | (21,15) |
| Coral Wreckage | 48 | Hex Survey Lv5 | (7,22) |
| Quarry | 55 | Hex Survey Lv5 | (20,13) |
| Glacia City Ruins | 65 | Hex Survey Lv5 | (17,25) |
| Ancient Forge | 75 | Shipment Chart 획득 | (20,12) |
| Ritual Site | 82 | Hex Survey Lv5 | (2,2) |
| Lost Temple | 90 | Old Temple Chart 획득 | (23,8) |
| Watchtower | 95 | Island Chart 획득 | (10,2) |
| Castle Ruins | 100 | Navigation Chart 획득 | (20,3) |
| Cathedral | 105 | Ancient Wall Chart 획득 | (6,3) |
| Shipwreck Cove | 110 | Ancient Wall Chart 획득 | (9,3) |
| Melantis | 118 | Melantis Clue 1 획득(+커뮤니티 보고: Magic Lv70 + 특정 복장 + Clue 2~4 연쇄) | (2,28) |

[위키/검색합성, 레벨·좌표] · Melantis 추가조건 [커뮤니티]

18개 중 약 11개는 "Hex Level 5 Survey"만으로 자동 해금, 나머지 7개는 다른 Dig Site를 먼저 발굴해 나온 Chart류 아이템 획득이 있어야 지도에 노출되는 **연쇄형 해금**이다.

**POI(Point of Interest) 4유형**: (1) Dig Site(Archaeology 연동) (2) Standard POI(로어 텍스트, 일부 1회성 보상) (3) Active POI(캐릭터가 그 Hex에 위치하는 동안만 버프) (4) Port(항구 간 무료 이동). Discovery 전제: 일반 Hex 108회 액션, POI 있는 Hex는 최대 864회까지 필요(각 5초 간격). Hidden POI는 Archaeology로 특정 Chart를 발굴해야 초록 느낌표로 노출(발굴 전엔 위치 자체를 모름) — 이렇게 드러나는 Dig Site는 "발견 POI 개수" 카운터에서 제외(단 Melantis Clue 추가 위치는 포함). [위키/검색합성]+[커뮤니티]

**레벨과 해금의 관계 — 핵심 결론**: Cartography 레벨은 "그 자리에 접근할 자격"만 주고, 실제로 숨겨진 Dig Site/POI가 지도에 나타나는 것은 Archaeology 발굴이라는 별도 생산 행동의 산출물(Chart 아이템)이 트리거한다. 한 스킬의 산출물이 다른 지점의 해금 조건이 되는 **상호 게이트형 구조**로, 사용자가 찾는 "건설 → 해금" 설계와 가장 유사하다.

**전체 규모**: 944개 Hex, 시작좌표(15,16). Hex 마스터리 보상: 100개=+5% 전 스킬 Skill XP+Bank Slot Token 5 / 200개=+5% 전 스킬 Mastery XP+Token 10 / 500개=+10% 전역 GP+Token 15 / 944개(전체)=비전투·공격 인터벌 각 -3%+Carthulu Pet. [위키/검색합성]

---

## 4. Bank(은행) 확장

### 4-1. 슬롯 확장

| 항목 | 값 |
|---|---|
| 기본 슬롯 수 | 20 |
| 확장 통화 | GP(기본), Into the Abyss 보유 시 일부 구간 AP |
| 비용 상한 | 118개째 구매 시점부터 **500만 GP 고정** ("After reaching the limit, each new slot will cost 5,000,000.") |
| 최대 구매 가능 수 | 일반 118 / 하드코어 108(상점 구매 제한) / Into the Abyss 보유 시 추가 88슬롯을 각 500만 AP로 구매, 총 196개(단 118+88=206과 불일치 — 확인 못 함) |
| 개별 슬롯 추가 수단 | `Bank Slot Token` 아이템 사용 시 +1(가격 인상에 영향 없음) |
| 확장으로 추가되는 기능 | **없음** — "Purchasing a bank tab WILL NOT increase your bank slots"(탭과 슬롯은 완전 별개 축) |

[위키]

**비용 공식**(검색 스니펫으로 확보, n=118 근처에서 500만 상한과 맞아떨어져 교차검증됨):

```
C(n) = floor( 132,728,500 × (n+2) / 142,015^(163/(122+n)) )   [GP]
n = 지금까지 구매한 슬롯 수(0부터 시작)
```

**비용 곡선(공식 기반 산출값, 위키 원문 표 자체는 미확인)**

| n | 총 슬롯(20+n) | 비용(GP) |
|---|---|---|
| 0 | 20 | 34 |
| 5 | 25 | 226 |
| 10 | 30 | 691 |
| 20 | 40 | 3,557 |
| 30 | 50 | 12,673 |
| 40 | 60 | 36,481 |
| 50 | 70 | 90,413 |
| 60 | 80 | 199,941 |
| 70 | 90 | 403,812 |
| 80 | 100 | 757,183 |
| 90 | 110 | 1,334,404 |
| 100 | 120 | 2,231,229 |
| 110 | 130 | 3,566,344 |
| 115 | 135 | 4,441,825 |
| 118 | 138 | 5,044,890(→ 500만 고정 발동) |
| 119+ | 139+ | 5,000,000(고정) |

[위키/검색합성] — 곡선 특징: 초반 수십~수백 GP로 매우 저렴, 슬롯 30~40대부터 기하급수적 상승, 100번째 부근 200만대, 118번째에서 상한 도달.

### 4-2. Bank Tab(탭) — 슬롯과 별개 시스템

기본 12개, 추가 구매 가능 15개(기본+10, Into the Abyss+5). 가격은 위키 원문이 "100,000,000 GP or 10,000 AP or 100,000 AP or 1,000,000 AP or 10,000,000 AP or 100,000,000 AP each"로만 나열되어 있어 **탭별 정확한 순서 대응은 확인 못함**. [위키]

---

## 5. Shop(상점)의 영구 해금 항목

### 5-1. Skillcape(스킬케이프)

| 항목 | 가격 | 선행 조건 | 효과 |
|---|---|---|---|
| 스킬별 Skillcape(26종) | 10,000,000 GP(전부 동일) | 해당 스킬 레벨 99 | 스킬별 상이(예: Woodcutting=벌목간격 -15%, Cooking=성공률+100%·완벽조리+2%·간격-15%, Thieving=간격-0.5s·GP+100%·은폐성+150) |
| Maximum Skillcape | 23,000,000 GP | 모든 기본 스킬 99 | 전 스킬케이프 효과 상속 |
| Cape of Completion | 200,000,000 GP | 기본 게임 100% 진행도 | 전 스킬케이프 효과 상속 + 마스터리 풀 상한 +25% + 피해감소 5% |
| Superior Max Skillcape | 230,000,000 GP | Into the Abyss 포함 전체 스킬 99(추정) | Max Cape 상위호환(추정) [검색, 불확실] |
| Superior Cape of Completion | 2,000,000,000 GP | Into the Abyss 포함 100% 완료(추정) | Cape of Completion 상위호환(추정) [검색, 불확실] |

[위키] (상위 2종은 [검색, 불확실])

### 5-2. Pet(펫)

| 획득 경로 | 상점 구매 여부 | 설명 |
|---|---|---|
| Skill Pet | 아니오 | 스킬 액션 중 확률 드랍 |
| Boss Pet | 아니오 | 던전 클리어 확률 드랍(예: Singe=Infernal Stronghold) |
| **Township 상점 펫** | **예** | 건물 랭크 조건 충족 시 구매 가능(아래 표) |
| **Golbin Raid 상점 펫** | **예** | Jerry the Giraffe, Preston the Platypus(가격 미확인) |
| 특수 이벤트 펫 | 아니오 | Esmé·Chica·Henriette는 Abyssal Realm 전용 이벤트 한정 |

**Township 상점 펫 12종**(가격 전부 100만 AP로 확인되었으나 균질화 의심, 재확인 권장 [위키/검색합성])

| 펫 | 선행 조건(건물 랭크) | 효과 |
|---|---|---|
| Marcy | Malcs Cats 1개(+마을 레벨 35) | 마을 스킬 XP +2% |
| Roger | Malcs Cats 2개(+35) | 마을 자원 생산 +2% |
| Ace | Malcs Cats 4개(+40) | 전역 이중 아이템 확률 +1% |
| Layla | Malcs Cats 6개(+60) | 마을 행복도 +2% |
| Mister Fuzzbutt | Malcs Cats 8개(+80) | 전역 GP +5%(아이템 판매 제외) |
| Octavius Lepidus VIII | Malcs Cats 10개(+95) | 마을 교육 +2% |
| Classy Rock | Cool Rocks 1개 | 채광 노드 체력 +10 |
| Cute Rock | Cool Rocks 2개 | 채광/제련 이중 확률 각 +2% |
| Royal Rock | Cool Rocks 4개 | 채광 추가 자원 확률 +3%(중복 불가) |
| Elf Rock | Cool Rocks 6개 | 전역 회피 +5% |
| Magic Rock | Cool Rocks 8개 | 마법 이중 확률 +3% |
| Party Rock | Cool Rocks 10개 | 전 스킬 마스터리 XP +4%(Melvor 영역) |

### 5-3. 도구(Tool) 업그레이드 — 슬롯 확장류 부재

Melvor에는 "가방(bag) 슬롯"·"액션바 슬롯" 개념의 상점 구매 항목이 **없다**. `Bag` 계열(Alchemist's Bag 등)은 제작으로 얻는 소모성 장비이고 효과는 효율 버프이지 슬롯 확장이 아니다(상점 구매 불가). 상점의 "도구"는 전부 채집 도구 티어 업그레이드(도끼/곡괭이/낚싯대 등 각 10~11단계, 레벨+가격 순차 상승)로 슬롯이 아니라 효율 강화다. 유일한 예외는 `+1 Archaeology Dig Site Map Slot`(3단계: 500만 GP/Lv30 → 5000만 GP/Lv80 → 2.5억 GP+200만 AP/Lv100). [위키]

### 5-4. 슬롯 확장류

| 항목 | 가격/조건 |
|---|---|
| Extra Bank Slot | §4-1 공식 참조 |
| Extra Bank Tab | §4-2 참조 |
| Extra Equipment Set(전투 로드아웃) | 총 7단계 순차 해금: 1000만 GP / 30만 AP / 1억 GP(요리99) / 1000만 AP / 1억 GP(Depths of Fear 완료) / 10억 GP(Depths of Isolation 완료) / 2억 GP(Ancient Sanctuary 완료) |
| Dungeon/Stronghold Equipment Swapping | 각 3000만 GP(슬롯 증가 아님, 교체 허용만) |
| +1 Archaeology Dig Site Map Slot | §5-3 참조 |

Melvor은 "인벤토리(칸수 제한)" 개념 자체가 없고 Bank(창고)가 소지품 저장소 역할을 겸한다 — TheSevenSimulationRPG의 가방/창고 이원 구조와는 근본적으로 다른 설계임에 유의. [위키]

### 5-5. 기타 영구 구매(자동화/오프라인)

| 항목 | 가격 | 효과 |
|---|---|---|
| Auto Eat Tier I | 100만 GP | HP 20% 이하 시 60% 효율 자동회복(최대 40%) |
| Auto Eat Tier II | 500만 GP | 임계 30%, 효율 80%, 최대 60% |
| Auto Eat Tier III | 2000만 GP | 임계 40%, 효율 100%, 최대 80% |
| Auto Slayer | 15만 AP | 새 Slayer Task 자동전투 해금 |
| Cooking Upgrade 1 | 1000만 GP(요리80) | 조리 음식 자동 장착 |
| Cooking Upgrade 2 | 7500만 GP(요리90) | 전투 중 음식 부족 시 자동 교환 |
| God Dungeon Upgrade ×4 | 각 5000만 GP | 채집/제작 스킬 기본 간격 -15%(4개 신 던전 각 클리어 후 구매) |
| 자동 판매(Auto Sell) | **없음** | 공식 상점엔 없음. "Sell All Unlocked" 수동 버튼만 존재, 자동판매는 서드파티 모드 전용 [검색, 부정 확인] |

[위키]

---

## 6. Mastery / Skill level 기반 해금 vs 「건설형」 해금 구분표

### 6-1. Mastery 시스템 개요

| 항목 | 내용 |
|---|---|
| Mastery XP 획득 | 스킬 액션 완료 시 자동. 요소: 총 숙련도, 현재 아이템 Mastery 레벨, 스킬 내 총 아이템 개수, 액션 소요시간 |
| Mastery Pool 적립 | 획득 Mastery XP의 **25%** 자동 적립(레벨99+"Skill Mastery" 퍼크 시 50%) |
| Pool 상한 | 500,000 × 그 스킬 총 아이템 개수(초과분 소실) |
| Pool 상한 확장 | Cape of Completion +25%, Harold 펫(Throne of the Herald) +50%, Zon 펫(Into the Abyss) +25% — 절대 XP량은 불변, 유지가 쉬워질 뿐 |
| Pool 용도 | ① 임의 아이템 Mastery 레벨을 Pool XP로 직접 올림 ② 체크포인트(10/25/50/95%) 도달 시 그 비율 유지 동안 보너스 지속(하락 시 상실) |
| 레벨 커브 | 상한 99(확장 120), Lv50까지 101,333 XP, Lv99까지 13,034,431 XP, Lv120까지 104,273,167 XP(약 7레벨마다 필요치 2배) |
| Mastery Token | 사용 시 그 스킬 최대 Pool의 0.1% 즉시 충전 |

체크포인트 예시(Woodcutting, Melvor Realm): 10%=+5% Mastery XP / 25%=+5% Double Items / 50%=+50% GP from Log Sales / 95%=Bird Nest 기본수량 +1. [위키]

결론: Mastery는 "콘텐츠를 여는" 장치가 아니라 "이미 열린 콘텐츠를 더 잘하게 만드는" 강화 장치다. 유일한 예외가 Herblore.

### 6-2. 6개 스킬 구분표 — (a) 레벨/마스터리 기반 vs (b) 건설형

| 스킬 | 분류 | 근거 |
|---|---|---|
| Woodcutting | (a) 순수 레벨 기반 | 나무는 레벨로만 해금(Lv1 Normal, Lv25 Willow 등). Mastery는 강화 전용 |
| Fishing | (a) 레벨 기반(+미세 혼합) | 물고기는 레벨 해금, 특수 낚시터는 아이템 조건(Barbarian Gloves 등)으로 열림 — 건설 아닌 아이템 게이트 |
| Mining | (a) 순수 레벨 기반 | 광석 티어는 채굴 레벨만, Mastery는 Rock HP 등 효율 강화만 |
| Smithing | (a) 순수 레벨 기반 | 레시피는 Smithing 레벨만(Lv1 Bronze Dagger → Lv87 Rune Platebody), Mastery는 복제/재료절약 확률만 |
| Cooking | (a) 레시피는 레벨 / **조리기구는 (b) 소규모 건설** | 요리는 레벨 게이트. 조리시설(Fire/Furnace/Pot)은 골드+재료로 "짓는" 구조: Normal Cooking Fire=20,000 GP+Normal Logs 500, Basic Furnace=Normal Logs 500+Bronze Bar 500, Basic Pot=Bronze Bar 400. Mastery는 성공률/퍼펙트 확률만 강화 |
| Herblore | (a)이나 **특이 케이스 — Mastery 레벨이 곧 게이트** | 포션 Tier가 스킬 레벨이 아니라 **Mastery 레벨**로 열림: Tier I(Mastery1)→II(20)→III(50)→IV(90). 티어 해금 후 제조되는 포션은 자동으로 그 티어로 제조됨. 놓친 하위 티어 포션은 은행에서 3:1로 상위 전환 가능 |

[위키]

### 6-3. 대표 건설형 스킬 3종 비교

| 스킬 | 건설 메커니즘 |
|---|---|
| **Township** | 자원(Food/Wood/Planks/Stone/Bar/Ore/Coal/Rune Essence/Herbs/Potions/Leather/Clothing 등, Abyssal은 Abyssal Pieces/Obsidian 추가) 소비로 건설. 스킬 레벨+인구 조건. "Building Cost Reduction Boosts"로 절감. 건물은 주로 자원생산·교육·행복도·인구수용·요새화 제공(콘텐츠 해금이라기보다 생산 인프라). Town Hall 개수=세율(10%씩 최대 80%↑)→GP 수입 증가. **Golbin Raid와 직접 연관 없음** |
| **Farming** | 최초 Plot 1개만 보유, 이후는 레벨업+GP구매의 2단계 게이트(§2 참조) — 전형적 (b) |
| **Agility** | 슬롯 순서대로 건설, 모든 이전 슬롯이 채워져야 전체 보너스 적용(연쇄구조). 비용=골드+재료(+Slayer Coins). 레벨 게이트 복수 스킬 혼합형도 있음(예: Runic Trail=HP70+Agility70+Summoning75+Herblore70). 재건축마다 4%씩 할인(§1-6) |

**Township vs Farming/Agility 차이**: Township은 "자원 생산 인프라"를 반복적으로 짓는 시스템(콘텐츠 해금보다 GP/자원 파이프라인 확장 성격이 강함)인 반면, Farming/Agility는 슬롯 하나하나를 사서 채우면 그 슬롯 자체가 새 기능(작물 재배칸/장애물 보너스)이 되는 더 순수한 건설형 해금에 가깝다. [위키/검색합성]

---

## 7. 진행으로 열리는 구역

### 7-1. Golbin Raid

| 항목 | 내용 |
|---|---|
| 참가 조건 | 사실상 없음("모든 사람이 공평하게 즐길 수 있도록 설계, 높은 스킬 레벨/아이템이 장점 안 됨") |
| 난이도 | Easy(×0.5)/Normal(×1.0)/Hard(×1.5, 페널티도 큼) |
| 초기 상태 | 전투 스킬 레벨 1부터(미니게임 전용 임시 스탯), 기본 장비+화살/룬/음식 소량 지급 |
| 웨이브 구조 | 웨이브당 골빈 수=⌊2+웨이브÷4⌋, 웨이브4부터 Raid Coin 획득, 매 웨이브 종료 후 장비 강화 선택지 |
| Township(건설)과의 관계 | **명시적 연관 없음** — 독립 미니게임, 별도 화폐(Raid Coins)를 자체 Raid Shop에서 소비. 골빈 처치는 본편 Township "Golbin 처치" Task 카운트에 **불포함**(단 일부 성취엔 관여) |

[위키/검색합성]

### 7-2. Dungeon(던전)

**중요**: 던전 표의 큰 숫자("Level 677" 등)는 **진입 요구 레벨이 아니라 던전 내 최강 몬스터의 전투 레벨**이다. 진짜 게이트는 별도 "Requirements" 항목(아이템/Slayer레벨/이전 던전 클리어)뿐. [위키, 교차검증 완료]

| 던전 | 최고 몬스터 전투레벨(참고용) | 실제 진입 요구조건 |
|---|---|---|
| Chicken Coop(최초 던전) | 39 | 없음 |
| Miolite Caves | 178 | Slayer Level 40 |
| Golem Territory | 229 | Ancient Stone Tablet 아이템 발견 |
| Unholy Forest | 270 | Old Route Chart 발견 + Golem Territory 클리어 |
| Volcanic Cave | 677 | 없음(난이도만 Master급) |
| Infernal Stronghold | 714 | Slayer Level 75 + Volcanic Cave 100회 클리어 |
| Into the Mist | 925 | Slayer Level 90 + Fire God Dungeon 클리어 |
| Throne of the Herald(최종권 던전) | 3,940 | Access Item 구매 + Necromancers Palace 클리어 |

패턴: 초·중반 던전은 대부분 진입조건 없음(전투력만 요구). 후반부로 갈수록 (i) Slayer 레벨 게이트, (ii) 필드 탐사 중 우연히 얻는 단서 아이템 발견 게이트, (iii) "이전 던전 클리어" 순차 체인(Air→Water→Earth→Fire God→Into the Mist→…→Throne of the Herald) 세 가지가 조합된다. [위키]

### 7-3. Slayer Area(슬레이어 구역)

전체 24개: Afflicted City, Arid Plains, Crystal Caves, Crystal Depths, Dark Quarry, Dark Waters, Desolate Plains, Foggy Lake, Forest of Goo, Forsaken Tundra, Golden Cloud Mountains, High Lands, Holy Isles, Jungle Labyrinth, Lava Lake, Midnight Valley, Millennium Gate, Penumbra, Perilous Peaks, Runic Ruins, Shrouded Badlands, Strange Cave, Toxic Swamps, Unhallowed Wasteland. [위키]

대표 6개(난이도 순):

| 구역 | 필요 Slayer 레벨 | 추가 조건 |
|---|---|---|
| Forest of Goo | 1 | 없음(사실상 무조건 오픈) |
| Penumbra | 1 | 없음(-10% Accuracy 지역효과) |
| Holy Isles | 30 | 없음(+20% 기도 소모량 지역효과) |
| Perilous Peaks | 85 | Climbing Boots 장비 착용 필수(-60% 회피율 지역효과) |
| Afflicted City | 112 | Lair of the Spider Queen 던전 클리어 + Slayer Torch 장비 착용 |
| Millennium Gate | 118 | Golden Shard 업그레이드 구매(골드) |

전체 24개 중 Slayer 레벨 요구가 아예 없는 곳은 Penumbra·Forest of Goo뿐. 골드로 구역 자체를 직접 사는 형태는 확인 못했고, 대신 골드로 사는 업그레이드 아이템(Climbing Boots, Slayer Torch, Golden Shard 등)을 보유/장착하는 것이 진입 조건이 되는 간접 방식이 반복된다. [위키]

---

## 확인 못 한 것

1. **Giant Clay Pot 표기의 "AND/OR" 여부**(Farming §2-2) — 셀에 "20개+10,000 GP"처럼 병기되어 있는데 동시 필요인지 택1인지 원문에 구분자가 없어 확정 못함(동시 필요로 해석해 기재).
2. **Herb Plot의 Giant Clay Pot 적용 번호** — Farming 페이지(1/5/8/12)와 Giant Clay Pot 페이지(4/7/11/15)가 서로 다름. 실제 게임 UI 대조 못함.
3. **Astrology 개별 Constellation × Star 1~6 전체의 정확한 효과·수치·비용 표** — 프록시가 표 전체 복제를 거부해 단편만 확보.
4. **Constellation 간 선행 조건 여부** — 레벨 구간이 이어진다는 것만 확인, 개별 Constellation 자체에 별도 해금 조건(예: 이전 Constellation Mastery 요구)이 있는지는 불명확.
5. **Cartography 지도 등급업 소요시간/액션수** — "8시간·11,500 Paper" 출처와 "1,920 actions" 출처가 상충, 미해결.
6. **Cartography Map Refinement 전체 옵션 목록** — 등급별 1~2개 예시만 확보, 전체 리스트 미확보.
7. **POI 전체 목록**(좌표·조건·효과 전부) — 예시 5~6개만 확보, 전체 개수도 미확인.
8. **Melantis Clue 1~4 각 단계 조건** — 단편만 확보, 전체 체인 미확보.
9. **Summoning Synergy 목록 전체**(어떤 Familiar 조합이 어떤 효과를 주는지) — 공식만 확인, 표는 조사 범위 밖.
10. **Bank Tab 15개의 GP/AP 대응 순서** — 원문이 나열식이라 어느 탭이 얼마인지 확정 못함.
11. **Into the Abyss 보유 시 은행 슬롯 "총 196개"와 118+88=206의 불일치 이유**.
12. **Township 상점 펫 12종의 가격이 정말 전부 100만 AP로 동일한지** — 균질화 의심, 재확인 권장.
13. **Golbin Raid 상점 펫(Jerry the Giraffe, Preston the Platypus) 정확한 가격**.
14. **Superior Max Skillcape / Superior Cape of Completion의 정확한 해금 조건**(Into the Abyss 스킬까지 99 필요 여부, 추정치임).
15. **Farming Plot 표(레벨/GP)의 위키 원문 표와의 100% 대조** — 동적 렌더링이라 1차 도구로는 못 뽑아 재질의로 확보, 재검증 권장.
16. **Slayer Areas 전체 24개의 완전한 표**(레벨/골드/아이템) — 통합 표 페이지가 JS 동적 렌더링이라 6개만 대표 확보.
17. **Mastery Checkpoint(10/25/50/95%) 효과의 스킬별 전체 목록** — Woodcutting만 구체 확인.
18. **Agility 슬롯 11/12에 전투 스킬(Prayer/Defence/Attack/Ranged/Magic) 부가 레벨 요구가 있는지** — 스니펫엔 있었으나 재검증 실패.
19. **Agility Abyssal Realm 코스(11슬롯) 전체 상세** — 슬롯 1·2·11에서 표본 3~4개만 확보, 나머지 미확보.
20. **Agility Pillar 변경 시 반복건설 할인·마스터리 풀 할인 적용 여부** — 위키는 Agility Prosperity 10%만 명시, 다른 할인 소스 적용 여부 불명.
21. **melvoridle.wiki.gg 미러 전체 접근 불가** — 직접/프록시 모두 401/400, 공식 위키와의 교차검증을 거의 못함(위키 원문 신뢰도는 자체적으로 높으나 이중검증 부재).

---
*조사일: 2026-09-23*

---

*마지막 업데이트: 2026-09-23*
