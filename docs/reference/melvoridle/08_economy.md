# Melvor Idle — 경제 (재화 · 소모품 · 재료 흐름)

> 상태: **조사 완료** (2026-09-30)
> 목적: 「자원이 어디서 생기고 어디서 타 없어지는가」를 **양(量)** 으로 확보한다 — 재화 종류, 골드 수입·소모, 전투가 태우는 소모품, 채집→가공→완성품의 투입/산출 비율, 드롭 구조, 보관 압박, 후반 골드 가치
> 짝 문서: [01_skills.md §4](01_skills.md#4-스킬-간-상호작용--비전투가-전투의-병참을-전담) · [02_items.md §3 · §4](02_items.md#3-획득-경로) · [04_construction_unlocks.md §4 · §5](04_construction_unlocks.md#4-bank은행-확장) · [03_township_buildings.md](03_township_buildings.md)
> ⚠ 이 문서의 수치는 전부 Melvor Idle 의 수치다. 설계 제안은 없고 사실만 적는다. 해석은 `[해석]`, 확인 못 한 추측은 `[추정]` 으로 구분한다.

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 |
| 1 | 재화의 종류 — 5종 + 준(準)재화 |
| 2 | 골드 수입원 — 판매가 · 스킬별 시간당 골드 · 가공의 가치 증감 · 몬스터 · 알케미 |
| 3 | 골드 소모처 — 상점 전체 · 비싼 10개 · 단계형 구매 |
| 4 | 소모품이 타는 속도 — 음식 · 포션 · 룬 · 화살 · 기도 · 태블릿 + 사례 계산 3개 |
| 5 | 재료 변환 사슬 — 대표 5개 |
| 6 | 드롭 구조 — lootChance · lootTable · 뼈 · 던전 상자 |
| 7 | 보관의 압박 |
| 8 | 없는 것 — 거래 · 경매 · 유료 재화 |
| 9 | 후반의 골드 가치 (커뮤니티 평가) |
| 10 | 확장팩이 더한 것 |
| 11 | 출처 · 확인 못 한 것 |

---

## 0. 조사 방법과 신뢰도

**게임 원본 데이터 `[데이터]`** — `melvor_data/` 의 5개 JSON. 쓴 키:

| 키 | 파일 | 용도 |
|---|---|---|
| `items[].sellsFor` `healsFor` `charges` `consumesOn` `dropTable` `prayerPoints` | Demo · Full (+확장팩) | 판매가 · 회복량 · 충전 · 상자 |
| `monsters[].levels` `equipmentStats` `lootChance` `lootTable[].weight` `currencyDrops` `bones` | 전 파일 | 드롭 · 데미지 규모 |
| `shopPurchases[].cost.currencies/items` `shopUpgradeChains` `shopCategories` | 전 파일 | 골드 소모처 |
| `skillData[].data.{trees,fish,rockData,npcs,recipes,logs,plots,altSpells}` | Demo + Full 병합 | 스킬 산출 |
| `slayerTaskCategories[].rollCost/extensionCost/currencyRewards` `dungeons[].rewardItemIDs` `golbinRaid` `prayers` `attackSpells` | Full · Demo | 재화 · 던전 · 룬 |

- 몬스터 최대 체력은 `levels.Hitpoints × 10`, 음식 회복량은 `healsFor × 10`, 마법 `maxHit` 도 ×10 이다. 위키 표(Black Knight HP 200 · Raw Magic Fish 회복 140)와 대조해 확인했다.
- 몬스터 근접 최대 데미지는 `floor(10 × (1.3 + (힘+9)/10 + 힘보너스/80 + (힘+9)×힘보너스/640))` 로 재구성했고, 위키 Slayer 표의 Black Knight 42 · Hill Giant 53 · Giant Crab 42 · Golbin 23 과 4건 모두 일치한다. 원거리는 같은 식에 Ranged 레벨을 넣었다(검증은 근접만). 마법은 `attackSpells.maxHit ×10 × (1 + magicDamageBonus/100)`.
- **행동 시간은 데이터에 없는 스킬이 많다.** 채굴 3초 · 도둑질 3초는 위키 원문으로 확인했고, 제련 2초 · 플레칭 2초 · 룬제작 2초 · 공예 3초는 [01_skills.md §3](01_skills.md#3-계열별-실제-구조) 의 기존 서술을 그대로 썼다.
- 「보너스 없이」 = 장비 · 마스터리 · 스킬케이프 · 물약 · 펫 없음.

**위키 `[위키/jina]`** (`r.jina.ai` 프록시, 모두 200): `Mining` · `Thieving` · `Slayer` · `Food` · `Prayer` · `Bank` · `GP` · `Arrows` · `Dungeons` · `Money_Making` · `Ranged` · `Magic` · `Farming` · `Golbin_Raid` (14건). 수식 자체는 프록시가 지워서 안 보이는 곳이 여럿이다(도둑질 성공률식 · 습격 코인식).
**Steam `[Steam]`** — WebFetch 로 스레드 5건을 열었고 WebSearch 로 스니펫을 확보했다(§9). Reddit 은 도메인 제한으로 WebSearch 필터가 막혀 스니펫으로만 봤다 `[위키/검색합성]` 급 신뢰도.

---

## 1. 재화의 종류

`melvorD:GP` · `SlayerCoins` · `RaidCoins` · `melvorItA:AbyssalPieces` · `AbyssalSlayerCoins` — 데이터의 `currency` 참조 전수 조사 결과 **이 5종이 전부**다. `[데이터]` (별도 `currencies` 정의 키는 없고 참조 ID 로만 존재한다.)

| 재화 | 약칭 | 버는 곳 | 쓰는 곳 |
|---|---|---|---|
| **Gold Pieces** | GP | 아이템 판매(`sellsFor`) · 몬스터 `currencyDrops`(전 몬스터가 가짐) · Thieving · Agility · Alt. Magic 알케미 · Township. **줍지 않고 자동 수집** `[위키/jina, GP]` | 상점 GP 구매 290건(전 파일) · 은행 슬롯 · 채집 도구 · 스킬케이프 · 편의 기능 · Farming 밭 해금(`plots[].currencyCosts`, 500 → 5,000 …) · Summoning 태블릿 일부(1,000 GP) |
| **Slayer Coins** | SC | **Slayer Task 대상 몬스터를 죽일 때만.** 몬스터 최대 HP 의 10 % `[위키/jina, Slayer]` · Township 과제 보상 · **Task 밖 몬스터는 0** | Slayer 상점 42건 · Task 새로 받기(`rollCost` 2,000~25,000) · Task 연장(`extensionCost` 100~12,500) · 일부 장비 |
| **Raid Coins** | RC | Golbin Raid 미니게임 — 클리어한 웨이브 수로 증가, 난이도 배율 0.5 / 1.0 / 1.5 `[위키/jina, Golbin_Raid]` | Golbin Raid 전용 상점 14건(합 810,500 RC). **다른 곳에서 못 쓴다**("no effect on other areas") |
| **Abyssal Pieces** | AP | Into the Abyss 몬스터 `currencyDrops`(97종, HP 대비 중앙값 0.125) · Thieving 의 AP 판 | ItA 상점 47건(합 약 70.6억) · 은행 확장 일부 |
| **Abyssal Slayer Coins** | ASC | Abyssal Slayer Task — 최대 HP 의 **2 %**(SC 는 10 %) `[위키/jina, Slayer]` | ItA Slayer 상점 24건(합 약 4.4억) |

`[데이터]` `SlayerCoins` 는 Demo 에서 `currencyGain` 모디파이어 참조가 이미 나온다. `RaidCoins` 참조는 **Demo 파일에만** 있다(Golbin Raid 상점이 Demo 범주 `melvorD:GolbinRaid` 에 속함).

**준(準)재화** — 화폐는 아니지만 같은 역할로 쓰이는 축:

| 준재화 | 성격 | 링크 |
|---|---|---|
| Prayer Points / Soul Points | 뼈 · 항아리를 「묻어서」 채우고 기도가 태운다(§4-5) | — |
| Township 자원 13종(`resources` 에 `GP` 도 하나로 들어 있음) | 마을 안에서 순환, GP 와 별개 계정 | [03_township_buildings.md](03_township_buildings.md) |
| Stardust / Golden Stardust | Astrology 별 모디파이어 업그레이드 소모 | [01_skills.md §3-3](01_skills.md#3-3-지원형support--대표-4종-실측) |
| 마스터리 풀 XP | 액션 마스터리를 사려고 인출 | [01_skills.md §2](01_skills.md#2-마스터리-시스템-심화--액션-마스터리--마스터리-풀) |

---

## 2. 골드 수입원

### 2-1. 아이템 판매가의 분포 `[데이터]`

`items[].sellsFor` 는 **정수 하나**(재화 필드 없음 = 항상 GP). Demo + Full 1,406종 중 판매가가 있는 1,280종의 분포:

| 통계 | GP |
|---|---|
| 중앙값 | 250 |
| 상위 10 % 경계 | 100,000 |
| 최대 | 60,000,000(고급 반지 · 장갑류) |

원재료 가격 사다리(대표): Logs — Normal 1 · Oak 5 · Willow 10 · Teak 20 · Maple 35 · Mahogany 50 · Yew 75 · **Magic 400** · Redwood 25. Ore — Copper/Tin 2 · Iron 5 · Coal 13 · Silver 25 · Gold 30 · Mithril 65 · Adamantite 88 · Runite 100 · Dragonite 135. 데이터가 직접 말하는 값이다(Redwood 25 는 데이터 원문 그대로이며 이례적으로 낮다).

### 2-2. 스킬별 시간당 골드 (보너스 없음) `[데이터/계산]`

**식**: `GP/h = sellsFor ÷ 행동 간격(초) × 3600`. 낚시는 `(baseMinInterval + baseMaxInterval) / 2`. 산출은 전부 「그 자리에서 팔았을 때」의 값이다.

| 스킬 | 대표 행 (레벨 · 산출 · 간격) | GP/h | 비고 |
|---|---|---|---|
| Woodcutting | Lv1 Normal 1G/3s | **1,200** | |
| | Lv45 Maple 35G/8s | 15,750 | |
| | Lv60 Yew 75G/12s | 22,500 | |
| | Lv75 **Magic** 400G/20s | **72,000** | 벌목 최대. Redwood(Lv90)는 25G/15s = 6,000 으로 오히려 낮다 |
| Fishing | Lv1 Shrimp 1G/6s | 600 | 간격은 4~8초 랜덤의 평균 |
| | Lv40 Lobster 65G/7.5s | 31,200 | |
| | Lv70 Shark 270G/11s | 88,363 | |
| | Lv80 Magic Fish 960G/21s | **164,571** | 낚시 최대. Whale(Lv95) 154,285 · Manta Ray 137,647 |
| Mining | Lv1 Copper 2G/3s | 2,400 (상한) | **상한 = 바위가 안 마를 때.** 아래 참고 |
| | Lv70 Adamantite 88G/3s | 105,600 (상한) | |
| | Lv95 Dragonite 135G/3s | 162,000 (상한) | |
| Thieving | Lv1 Man (GP 최대 100, 평균 50.5) / 3s | **19,186** (해금 레벨 · 성공 48.1 %) · 상한 60,600 | GP 는 「NPC 최대치까지」 `[위키/jina]` — 평균은 균등 분포 가정 `[추정]`. 상한 = 성공 100 % |
| | Lv54 Fisherman (450) | 49,258 (성공 30.8 %) · 상한 270,600 | |
| | Lv95 King (1,000) | **61,478** (성공 18.6 %) · 상한 600,600 | 인지 950 — 은신이 950 이어야 상한 |
| Cooking | Whale 2,048G 를 낚시 17.5s + 조리 11s 로 | 258,694 | 같은 시간에 생선만 팔면 154,285 |
| Smithing · Fletching · Crafting · Runecrafting | 가공 스킬은 §2-3 참고 | — | 가공은 판매가 대비 손실이 흔하다 |
| Farming | 아래 참고 | — | 밭 하나당 수치, 방치형 |

- **Mining 의 「상한」**: 바위에 HP 가 있다 — 마스터리 1 기준 6(=5+마스터리), 99 기준 104, 채굴 1회에 HP 1 감소, HP 0 이 되면 `baseRespawnInterval`(Copper 5초 → Dragonite 120초) 동안 리스폰 `[위키/jina, Mining]` + `[데이터]`. 자연 회복(10초에 HP 1)은 무시하고 식 `ores/h = HP×3600 ÷ (HP×3 + respawn)` 로 계산하면:

| 광석 | 상한 GP/h | 마스터리 1 | 마스터리 99 |
|---|---|---|---|
| Copper | 2,400 | 1,878 | 2,362 |
| Coal | 15,600 | 10,028 | 15,115 |
| Mithril | 78,000 | 36,947 | 73,301 |
| Adamantite | 105,600 | 39,600 | 96,336 |
| Runite | 120,000 | **27,692** | 100,645 |
| Dragonite | 162,000 | **21,130** | 117,000 |

  → 값비싼 광석일수록 리스폰이 길어 **초반 마스터리에선 상한의 1/4~1/8** 만 나온다. 마스터리가 채집량 자체를 여는 구조다.
- **Thieving 의 성공률** `[사이트 thieving2.js]`(검수에서 게임 코드로 확인): `성공률(%) = min(100, 100 × (100 + 은신) ÷ (100 + 인지))` · `은신 = Thieving 레벨 + 은신 보너스` · 실패하면 **3초 기절**(`baseStunInterval 3000`) + NPC 최대 데미지. 보너스 없이 계산하면(`GP/h = 3600 ÷ (3 + (1 − 성공률) × 3) × 성공률 × 평균 GP`) NPC 23명이 **해금 레벨에서 19,186 ~ 61,478 · 레벨 99 에서 52,232 ~ 69,732 GP/h** 로 좁은 띠에 모인다 — 인지가 GP 와 함께 올라서(Man 110 → King 950) **보너스 없는 도둑질은 어느 NPC 든 시간당 골드가 비슷하다.** 표의 「상한」은 장비 · 마스터리 · 포션으로 은신이 인지에 닿았을 때의 값이다 `[데이터/계산]`. 아이템 드롭(기본 75 %)의 판매가와 기절 때 먹는 음식은 이 계산에 없다.
- **Farming (밭 하나)**: 수확량(마스터리 1)은 약초·작물 10개, 나무 150개(마스터리 99: 88 / 1,320) `[위키/jina, Farming]`. 예: Magic Tree — 씨앗 1개, 16시간, 150 × 400G = 60,000G → **약 3,750 GP/h/밭**. Barrentoe(Lv80 약초) — 씨앗 2개(900G), 4시간, 10개 × 330G = 3,300G → 순 2,400G ≈ 600 GP/h/밭. 기본 생존율 50 % `[04 §2-4]`. 본편 데이터의 밭은 25칸이고 일부가 GP(500 → 5,000 …)로 해금된다.
- **위키의 실전 값** `[위키/jina, Money_Making]`(장비 · 마스터리 · 물약 다 쓴 「최대」): 기본판 Fishing Whales 31만~300만/h · Mining with Gem Gloves 31만~200만/h · 기본판 Agility 110만~630만/h · **기본판 전투 최대 약 1,800만/h**. 위 무보너스 계산(Whale 154,285)이 실전 범위의 **하단**에 걸려 있다.

**돈벌이 역할** `[해석]`: **보너스가 없으면 Thieving 은 압도적이지 않다** — 해금 레벨 기준 2만 ~ 6만 GP/h 로 Fishing 중간 행(Lobster 31,200 · Shark 88,363)과 같은 자릿수이고 Fishing · Mining 의 고가 행(Magic Fish 164,571)보다 낮다. Thieving 이 앞서는 것은 **은신 보너스를 쌓은 뒤**(상한이 낚시·채굴·벌목의 3~4배 이상)다 — 돈벌이가 「레벨」이 아니라 「보너스 투자」로 열린다. Woodcutting 은 Magic Tree 하나를 빼면 낮다. 초·중반 GP 는 위 스킬의 직접 판매보다 **Cooking 의 가치 증가**(§2-3)와 전투 드롭이 채운다.

### 2-3. 가공은 가치를 더하는가 — 판매가 기준 비율 `[데이터/계산]`

`비율 = 제품 판매가 × 산출 개수 ÷ 투입 재료 판매가 합`. Demo + Full 의 전 레시피.

| 스킬 | 레시피 수 | 중앙값 | 1 초과 비율 | 10~90 백분위 |
|---|---|---|---|---|
| **Cooking** | 32 | **4.59** | **100 %** | 1.66 ~ 18.5 |
| Herblore (포션 IV 기준) | 30 | 1.04 | 57 % | — |
| Fletching | 57 | 1.00 | 47 % | 0.62 ~ 2.69 |
| Crafting | 57 | 0.70 | 14 % | 0.50 ~ 1.50 |
| Smithing | 115 | 0.50 | 22 % | 0.11 ~ 1.13 |
| Runecrafting | 70 | 0.20 | 20 % | 0.04 ~ 1.11 |

- 요리만이 **모든 레시피에서** 팔 때 가치가 오른다. 대장·룬 제작은 대부분 재료 상태로 파는 편이 낫다 — 이 스킬들은 「팔려고」가 아니라 「쓰려고」 만든다(장비 · 룬).
- 예: Rune Platebody 판매가 689 ≪ 투입 광석 판매가 1,020(비율 0.68, §5-1). Magic Shortbow 315 < Magic Log 400 + Bowstring(상점 24).
- 비교 기준이 판매가라서 **시간 · 전투 필요성**은 반영되지 않는다.

### 2-4. 몬스터 골드 `[데이터]`

모든 몬스터가 `currencyDrops`(GP `min`~`max`)를 가진다. 전투 지역 · Slayer 지역의 98종(Demo + Full):

| 지표 | 값 |
|---|---|
| GP/킬 평균 | 약 187 |
| **GP / 최대 HP** (중앙값) | **0.10** (평균 0.115) — 즉 HP 100 을 깎을 때 약 10 GP |
| 예 | Golbin(HP 50) 평균 6 · Black Knight(HP 200) 10~50 · Dragon Valley 평균 150 · Unhallowed Wasteland 평균 1,250 |
| 극값 | 4종(Legaran Wurm 외)이 1~2,500 의 넓은 범위, 던전 보스(Aeris · Ragnar) 125,000 |

- 몬스터 GP 만이 전부가 아니다. 같은 98종의 **킬당 기대 판매액**(`lootChance × weight 확률 × 수량 × sellsFor`)은 평균 약 1,280G 로 GP 드롭(187)의 몇 배다 — 다만 상위 몇 종(Dragon 계열 등)의 고가 드롭이 평균을 끈다 `[해석]`. 뼈 판매가는 평균 약 40G.
- SC 는 GP 와 별개로 「Task 대상 킬」에만 붙는다(§1).

### 2-5. 알케미 — 아이템을 GP 로 `[데이터]`

Alternative Magic `altSpells` 의 **Item Alchemy** 는 룬을 태워 아이템을 GP 로 바꾼다.

| 주문 | 필요 Magic 레벨 | 룬 | 변환율(판매가 대비) |
|---|---|---|---|
| Item Alchemy I | 10 | Nature 1 + Fire 3 | **40 %** |
| Item Alchemy II | 35 | Nature 1 + Fire 4 | **100 %** |
| Item Alchemy III | 76 | Nature 1 + Fire 5 + Spirit 2 | **160 %** |

  → 판매가보다 **더 받는** 유일한 경로다. 같은 표에 룬 → 뼈(Bone Offering: 3개) · 룬 → 성스러운 가루 · 소형/중형 항아리를 기도 150/500 으로 바꾸는 주문이 있다(§4-5).

---

## 3. 골드 소모처

### 3-1. 범주별 전체 `[데이터]`

`shopPurchases` 는 전 파일 **434건**(Demo 82 · Full 119 · ToH 67 · AoD 88 · ItA 78). 아래는 **본편(Demo + Full) 201건**. 비용 합에서 int32 최대값짜리 농담 상품(Red Party Hat, 2,147,483,647 GP)과 무한 반복 상품(은행 슬롯 — §7)은 뺐다.

| 범주(`shopCategories`) | 건수 | 비용 범위 | 합계 | 내용 |
|---|---|---|---|---|
| Skill Upgrades — 채집 도구 3계열 | 21 | 50 ~ 5,000,000 GP | 10,926,650 | Axe · Fishing Rod · Pickaxe 각 7단계(§3-3) |
| Skill Upgrades — 조리 불 · 화로 · 냄비 | 15 | 20,000 ~ 1,000,000 GP (+통나무 500개 · 바 500~1,500개) | 2,380,000 + 재료 | 화로 · 냄비는 GP 없이 재료만 |
| Skill Upgrades — 마스터급 4종 | 5 | **5,000만 × 4 + 2.5억** | 4.5억 | Perpetual Haste · Master of Nature 등 + AgilityItemReduction(2.5억) |
| Skillcapes | 26 | 1,000,000 ~ 200,000,000 | 2.47억 | 스킬별 **1,000,000** × 24 · Max Skillcape **23,000,000** · Cape of Completion **200,000,000** |
| Gloves | 5 | 50,000 ~ 500,000 GP | 825,000 | Cooking · Mining · Smithing · Thieving · Gem |
| General | 14 | 1,000,000 ~ 100,000,000 GP (+SC 2건) | 4.57억 | Auto Eat 3단계(100만 · 500만 · 2,000만) · 장비 세트 · 던전 장비 교체 3,000만 · Cooking Upgrade 1000만/7500만 · 은행 탭 1억 |
| Materials | 18 | **4 ~ 600 GP** | 3,744 | 가루 · 치즈 4 · 깃털 8 · 활줄 24 · 퇴비 500 · 가죽 100 · 드래곤하이드 100~350(+가죽) · Summoning Shard 200~600 |
| Township | 57 | 100,000 ~ 25,000,000 GP | 5,640만 | 스킬 복장 44벌(11세트) × 100,000 · 복장 강화 2,500만 · 펫 6종 100만 · 모자 6종 100~600만 |
| Slayer | 26 | SC 2,000 ~ 10,000,000 (GP 병행 4건 50만~1,000만) | SC 1,747만 | 지역 통행권 · 재보급 5,000~20,000 SC · 장비 · 업그레이드 키트 50,000~1,000,000 SC |
| Golbin Raid | 14 | RC 1,000 ~ 500,000 | RC 810,500 | 전용 상점 |

**본편 GP 총 지출 상한**: 156건의 GP 구매를 다 합해 약 **12.4억 GP** (은행 슬롯 제외) `[데이터/계산]`. 은행 슬롯 118개 누적은 약 9,887만(§7).

**분포 요약** `[해석]`:
- 건수는 「도구 · 복장 · 스킬케이프」 같은 **작고 반복되는 것**이 다수다. 합계는 「스킬케이프 · 마스터급 · 편의 기능」 몇 개가 지배한다(AgilityItemReduction 하나가 총액의 20 %).
- 소모성 재료를 파는 곳은 **Materials 뿐**(18건, 최대 600 G). 음식 · 포션 · 룬 · 화살은 상점에 **없다**.
- Slayer 상점의 재보급 팩(Basic 5,000 · Standard 10,000 · Generous 20,000 SC)만 소모품을 SC 로 판다.
- 기존 [04_construction_unlocks.md §5-1](04_construction_unlocks.md#5-1-skillcape스킬케이프) 는 「스킬케이프 26종 10,000,000 GP」로 적었지만 **데이터와 위키 Thieving 페이지(「purchased for 1,000,000 GP」)는 1,000,000 이다.** 10,000,000 은 ToH 의 Superior Skillcape 값이다(아래 §3-2).

### 3-2. 가장 비싼 구매 10개 `[데이터]` (전 파일, GP)

| 순 | 상품 | 파일 | 비용 |
|---|---|---|---|
| — | Red Party Hat | Demo | 2,147,483,647 (int32 최대, 농담 상품 — 순위에서 제외) |
| 1 | Superior Cape of Completion | ToH | **2,000,000,000** |
| 2 | ShipUpgrade8 | AoD | 500,000,000 (+ Mystic Fire Staff · Redwood Longbow · Rune Arrows · Dragon Scimitar · Dragon Javelin 각 2,000개 + SC 5,000,000) |
| 3~4 | AgilityItemReduction | Full | 250,000,000 |
| 3~4 | Extra Archaeology Map Slot 3 | AoD | 250,000,000 (+SC 2,000,000) |
| 5 | Superior Max Skillcape | ToH | 230,000,000 |
| 6~10 | Cape of Completion | Full | 200,000,000 |
| 6~10 | Extra Equipment Set IV | ToH | 200,000,000 |
| 6~10 | Divine Axe / Pickaxe / Fishing Rod (3건) | ToH | 각 200,000,000 (+ Divinite Bar 2,500개) |

다음은 Meteorite Axe 150,000,000(+ Meteorite Bar 2,000개).

같은 순위를 다른 재화로: **AP** — The Unyielding Conqueror 20억 · Extra Equipment Set III / Cape of Completion(ItA) / Weight of Souls 각 10억 · Netherite 도구 코팅 2.5억(+ Netherite Bar 25,000개). **SC** — Green Party Hat · Golden Compass · Slayer Upgrade Kit Mythical 각 1,000만. **ASC** — Void Nexus Gateway 1.25억.

### 3-3. 단계형 구매(`shopUpgradeChains`)의 비용 증가 `[데이터]`

본편 3계열(Pickaxe · Axe · Fishing Rod)은 **7단계 순차 구매**(이전 단계를 사야 열림, 재료 없이 GP 만):

| 단계 | Axe | Fishing Rod | Pickaxe |
|---|---|---|---|
| Iron | 50 | 100 | 250 |
| Steel | 750 | 1,000 | 2,000 |
| Black | 2,500 | 5,000 | 10,000 |
| Mithril | 10,000 | 20,000 | 50,000 |
| Adamant | 50,000 | 75,000 | 200,000 |
| Rune | 200,000 | 300,000 | 1,000,000 |
| Dragon | 2,000,000 | 2,000,000 | 5,000,000 |

증가 방식: **첫 단계 이후 단계마다 약 3~10배**(Axe: 15 → 3.3 → 4 → 5 → 4 → 10배)로 고정 표에 박혀 있고 공식이 아니다.
- **AoD** 발굴 도구 4계열은 11단계, 매 단계 GP(500 → 20,000,000) **와 함께 바 25개**(마지막 4단계는 다른 재료 15 · 100 · 200 · 1개) — 재화 + 채집물을 같이 요구한다. **ItA** 도구 코팅은 5단계, **AP 5만 → 2.5억 + 바 5,000 → 25,000개**로 매 단계 약 5~10배.
- 「재화 + 재료 동시 요구」는 본편에도 있다: 조리 불(GP 20,000~1,000,000 + 해당 통나무 500개), ToH Divine 도구(GP 2억 + Divinite Bar 2,500개).

### 3-4. GP 이외의 소모 `[데이터]`

- **Slayer Task**: 새 Task 를 다른 티어에서 받기 — Easy 무료, Normal 2,000 SC ~ Master 25,000 SC(`rollCost`). 진행 중 Task 연장은 「같은 티어 새 Task 의 절반」(`extensionCost` 100 ~ 12,500 SC, 배율 ×1~×5) `[위키/jina]`.
- **Golbin Raid**: Golbin Crate 는 **RC 1,000 부터 구매마다 +1,000**(`Linear`, 38개 한정 — 합계 741,000) — 안 나온 장비 하나를 랜덤으로 풀어 준다.

---

## 4. 소모품이 타는 속도

### 4-1. 음식 `[데이터]` + `[위키/jina, Food]`

- 음식은 **전투 중 · Thieving 중 HP 를 채운다**. 회복량 = `healsFor × 10`. 완벽 조리(Perfect) 시 약 +10 %.
- 수동 먹기 외에 Auto Eat(상점): HP 20 % 이하에서 효율 60 % / 30 % 이하 80 % / 40 % 이하 100 % 로 먹는다 `[04 §5-5]`. **현재 장착한 음식 종류만** 먹는다. 재고가 떨어지면 자동 교체는 별도 구매(Cooking Upgrade 2, 7,500만 GP).

| 음식 | 회복 | 판매가 | 생선 → 조리 시간(초, 1개) |
|---|---|---|---|
| Shrimp | 30 | 2 | 6 + 2 = 8 |
| Trout | 70 | 27 | 7 + 4 = 11 |
| Lobster | 110 | 108 | 7.5 + 5 = 12.5 |
| Shark | 200 | 674 | 11 + 8 = 19 |
| Whale | 480 | 2,048 | 17.5 + 11 = 28.5 |

### 4-2. 몬스터가 주는 피해의 규모 — 전투 1시간이 먹는 음식 `[데이터/계산]`

**식**: `HP/h(상한) = 3600 ÷ 공격속도(초) × 최대 데미지 ÷ 2`(모든 공격 명중 · 평균 = 최대치의 절반 `[추정]`). 실제로는 플레이어의 회피 · 방어 · 피해감소가 이 값을 크게 깎는다. **명중률 f 이면 아래 표에 f 를 곱한다.**

| 몬스터(지역) | 최대 HP | 최대 데미지 | 속도 | 상한 HP/h | 필요 음식 (Lobster · Shark · Whale) |
|---|---|---|---|---|---|
| Giant Crab (Sandy Shores) | 600 | 42 | 2.4s | 31,500 | 286 · 157 · 65 |
| Moss Giant (Giant Dungeon) | 600 | 124 | 3.0s | 74,400 | 676 · 372 · 155 |
| Rune Knight (Castle of Kings) | 800 | 212 | 2.6s | 146,769 | 1,334 · 733 · 305 |
| Black Dragon (Dragon Valley) | 1,200 | 268 | 3.0s | 160,800 | 1,461 · 804 · 335 |
| Chaotic Greater Dragon (Perilous Peaks) | 7,100 | 486 | 2.8s | 312,428 | 2,840 · 1,562 · 650 |
| Greater Skeletal Dragon (Unhallowed Wasteland) | 9,900 | 572 | 2.8s | 367,714 | 3,342 · 1,838 · 766 |

- 마법 몬스터의 최대 데미지는 약 90~170(Elerine Mage 90 · Dark Wizard 140 · Ku-tul 170)으로, 같은 표의 근접·원거리 상위(260~570)보다 작다 `[데이터/계산]`.
- 한 번의 물림(최대 데미지)이 그 시점 최선 음식 하나의 회복량과 **같은 자릿수**다: Giant Crab 42 vs Trout 70, Black Dragon 268 vs Shark 200, Chaotic Greater Dragon 486 vs Whale 480. `[해석]`

### 4-3. 포션 — 충전을 공격/행동 횟수로 태운다 `[데이터]`

포션은 `charges` 개의 충전을 갖고 `consumesOn` 이벤트(공격 · 피격 · 채집 행동 등)마다 1씩 소모한다. 4단계(I~IV)는 **같은 재료**, 마스터리로 단계만 올라간다([01 §3-2 Herblore](01_skills.md#3-2-장인형artisan--대표-6종-실측)).

| 포션(재료 1회분) | 충전 I → IV | 소모 이벤트 | 판매가 I → IV |
|---|---|---|---|
| Melee Accuracy (Garum 약초 1 + Bones 1) | 20 · 20 · 20 · 30 | 플레이어 공격 | 2 → 5 |
| Melee Strength (Poraxx 약초 1 + Eyeball 1 + Dragon Bones 1) | **5 · 5 · 5 · 10** | 플레이어 공격 | 130 → 320 |
| Ranged Strength (Oxilyme 2 + Eyeball 2) | 5 · 5 · 5 · 10 | 플레이어 공격 | 120 → 158 |
| Regeneration (Lemontyle 1 + Ruby 1) | 15 · 25 · 40 · 60 | HP 재생 틱 | 400 → 640 |
| Damage Reduction (Barrentoe 2 + Eyeball 2 + Large Horn 1) | 10 · 15 · 20 · 30 | 적 공격 | 850 → 1,500 |
| Perfect Swing (Oxilyme 1 + Coal 2 + Gold 1) | 30 · 50 · 80 · 100 | 채굴 행동 | 102 → 150 |

- **전투 1시간 소모 개수**(공격 3.0초 = 1,200회/h): Melee Accuracy IV 40개 · Melee Strength IV **120개**(I 단계면 240개) · Magic Damage 240개(충전 5).
- **재료 일부가 전투 드롭이다**: Bones · Dragon Bones · Eyeball · Big Bones · Holy Dust · Large Horn — 비전투 스킬이 전투 드롭을 먹는다(01 §4 의 「단방향 아님」의 실제 예).
- 판매가가 낮은 포션(Melee Accuracy 2~5G)과 높은 포션(Damage Reduction 850~1,500G)이 함께 있다 — 「소모품이 쌀수록 흔하게 쓴다」는 정렬이 없다.

### 4-4. 룬 · 화살 `[데이터]` + `[위키/jina, Magic · Ranged]`

- **마법**: 「주문 1회 시전마다 룬 소모」(룬은 은행에서 장착 없이 바로 소모) · 룬 보존 확률 모디파이어가 있다. 원거리: 「공격마다 탄약 1개 소모」, 화살 보존 확률은 **80 % 상한**.
- 주문별 룬 수(`attackSpells`, 시전당): Wind Strike(Lv1) 3 · Fire Strike(Lv10) 3 · Fire Bolt(Lv23) **8** · Fire Blast(Lv37) **10** · Fire Wave(Lv52) 13 · Fire Surge(Lv68) **18**. 레벨이 오를수록 룬 수가 5~6배로 는다.
- 지팡이 공격속도 3.0초 → 시전 1,200회/h. 즉 **Fire Surge 1시간 = 룬 21,600개**.
- 룬 레벨 어긋남: Chaos Rune(Bolt 계열 사용, Lv14~) 제작 Lv35 · Death Rune(Blast, Lv28~) 제작 Lv65 · Blood Rune(Wave, Lv43~) Lv75 · Ancient Rune(Surge, Lv57~) Lv85. **주문 해금 레벨이 룬 제작 해금 레벨보다 낮다** `[데이터]` — Chaos · Death 룬은 본편 몬스터 5종이 드롭하고 Blood · Ancient 룬은 Demo + Full 몬스터 드롭에 0종 `[데이터/계산]`.
- **화살** 속도: 원거리 무기 2.0~3.2초. 활은 화살 · 쇠뇌는 볼트 · 재블린은 무기 겸 탄약.

### 4-5. 기도 · 소환 `[데이터]` + `[위키/jina, Prayer]`

**기도** — 활성 기도는 이벤트마다 Prayer Points(PP)를 태운다:

| 항목 | 값 |
|---|---|
| 플레이어 공격당 PP | Thick Skin 1 · Rock Skin/Hawk Eye 2 · Steel Skin/Ultimate Strength 3 · Chivalry 5 · Piety/Rigour/Augury **7** · Battleheart **8** |
| 적 공격당 PP(보호계) | Protect from Magic/Ranged/Melee **10** |
| 동시 활성 | 최대 2개 `[위키/jina]` |
| PP 획득 | 뼈를 「묻기」: Bones **1** · Big Bones 3 · Dragon Bones **5** · Magic Bones **10** · Ash 2 · Holy Dust 3. 마법으로 만든 **Small Urn (Enchanted) 150 · Medium Urn 500** |
| 몬스터 뼈 | 킬당 1개(`bones.quantity` 1) — Bones 60종 · Big Bones 18종 · Dragon Bones 8종 · Holy Dust 6종 · Magic Bones 5종 |

→ 3초에 한 번 공격하는 전투에서 Piety(7)는 시간당 약 8,400 PP 를 태운다. 킬당 뼈 1개(PP 1~10)로는 킬 하나에 필요한 공격 수를 못 채우는 구조다 `[해석]`. 위키도 「항아리가 PP 원천으로 압도적으로 효율적」이라 적었다.

**Summoning 태블릿** — 제작 1회 = **태블릿 25개**, 재료로 **Summoning Shard(상점 200~600 GP)** 6~10개 + 대상 아이템 [데이터]. 예: Golbin Thief — Red Shard 6(1,200 GP) + Bronze/Iron Dagger 등 → 25개. 사용은 `PlayerSummonAttack` · 스킬 행동 등 이벤트마다 충전 소모 `[데이터]`. **즉 GP → 소모품 전환 통로가 Materials 상점에 있다.**

### 4-6. 비전투 몇 시간의 산출이 전투 몇 시간을 버티는가 `[데이터/계산]`

시간은 전부 「스킬 하나만 도는」 순수 준비 시간이며, 무보너스 · 바위 안 마름 가정이다.

**사례 A — 음식**(§4-1 · §4-2): 1시간에 낚시 + 조리로 만드는 음식은 Lobster 288개(31,680 HP) · Shark 189개(37,894 HP) · Whale 126개(60,631 HP).

| 전투 대상 | 상한 HP/h | 준비 시간 (Lobster / Shark / Whale) |
|---|---|---|
| Giant Crab | 31,500 | 1.0h / 0.8h / 0.5h |
| Moss Giant | 74,400 | 2.3h / 2.0h / 1.2h |
| Black Dragon | 160,800 | 5.1h / 4.2h / 2.7h |
| Chaotic Greater Dragon | 312,428 | 9.9h / 8.2h / 5.2h |
| Greater Skeletal Dragon | 367,714 | 11.6h / 9.7h / 6.1h |

→ **전투 1시간이 비전투 0.5~12시간을 태운다**(명중률 100 % 상한 기준, 실제는 f 배). 가벼운 몬스터에선 1:1 안팎, 무거운 몬스터에선 5~10:1 이다.

**사례 B — 룬**(§4-4 · §5-5): 마나 스킬의 시간당 룬 수요를 채우려면 Runecrafting(룬 1개 = 에센스 1 · 2초)과 Mining(에센스 바위 3초에 2개)이 필요하다.

| 주문 | 룬/h | 채굴 h | 룬제작 h | 전투 1h 당 준비 |
|---|---|---|---|---|
| Wind / Fire Strike | 3,600 | 1.50 | 2.00 | **3.5h** |
| Fire Bolt | 9,600 | 4.00 | 5.33 | 9.3h |
| Fire Blast | 12,000 | 5.00 | 6.67 | **11.7h** |
| Fire Wave | 15,600 | 6.50 | 8.67 | 15.2h |
| Fire Surge | 21,600 | 9.00 | 12.00 | **21.0h** |

→ 룬은 **전투 1시간 대 준비 3.5~21시간**으로 소모품 중 가장 무겁다(룬 보존 · 조합 룬 없는 가정).

**사례 C — 화살**(§5-2): 원거리 2.6초 공격 → 시간당 화살 1,385개. Bronze Arrows 15개 묶음 준비 19초 → **전투 1h 당 준비 0.49h**, Rune Arrows 15개 묶음 준비 40초 → **1.03h**. 화살은 소모품 중 가장 가볍다.

**포션은 §4-3**: Melee Strength IV 120개/h 는 Poraxx 약초 120개 + Eyeball 120 + Dragon Bones 120 이며, Poraxx 는 밭 하나가 3.5시간에 약초 10개 → 12밭·회 = 밭 42시간분(마스터리 1 기준).

---

## 5. 재료 변환 사슬 (대표 5개)

시간 상수: 채굴 3s · 제련 2s · 플레칭 2s · 룬제작 2s · 벌목은 나무별(Normal 3s). 수치는 §4-6 과 같은 「무보너스 · 안 마르는 바위」 조건이다. `[데이터/계산]`

### 5-1. 광석 → 주괴 → 갑옷 (Mining → Smithing)

바 1개 = 광석 재료(Bronze: Copper+Tin 1+1 · Iron: Iron 1 · Steel: Iron 1+Coal 2 · Mithril: Mithril 1+Coal 4 · Adamantite: 1+6 · Runite: 1+8 · Dragonite: Dragonite 1+Runite 2+Coal 12). Platebody = 바 5개, Dagger = 바 1개, Rune Battleaxe/2H Sword = 바 3개.

| Platebody | 광석 수 | 채굴 s | 제련 6동작 s | 총 s | 광석 판매가 합 | 판매가 | 판매/광석 | GP/h(완성품) | GP/h(광석 판매) |
|---|---|---|---|---|---|---|---|---|---|
| Bronze | 10 | 30 | 12 | 42 | 20 | 3 | 0.15 | 257 | 2,400 |
| Iron | 5 | 15 | 12 | 27 | 25 | 32 | 1.28 | 4,266 | 6,000 |
| Steel | 15 | 45 | 12 | 57 | 155 | 48 | 0.31 | 3,031 | 12,400 |
| Mithril | 25 | 75 | 12 | 87 | 585 | 280 | 0.48 | 11,586 | 28,080 |
| Adamant | 35 | 105 | 12 | 117 | 830 | 432 | 0.52 | 13,292 | 28,457 |
| Rune | **45** | 135 | 12 | 147 | 1,020 | 689 | 0.68 | 16,873 | 27,200 |

→ **갑옷 1벌 = 광석 5~45개**(석탄(Coal)이 절반 이상). 상위 티어일수록 「광석 수 대비 시간」은 는다. 완성품 판매가는 **광석 판매가보다 낮은 경우가 대부분**이다(Iron 만 1.28).

### 5-2. 통나무 → 화살 (Woodcutting · Mining · Smithing · Fletching)

Rune Arrows 15개 = **Rune Arrowtips 15**(바 1개 → 팁 15개, 제련 1동작) + **Headless Arrows 15**(Arrow Shafts 15 + Feathers 15 → 15개). Arrow Shafts 15개 = 통나무 1개. Feathers 는 상점 8 GP.

| 단계 | 개수 | 시간 |
|---|---|---|
| Runite 광석 1 + Coal 8 채굴 | 9 | 27s |
| Normal Log 1 (벌목) | 1 | 3s |
| 제련(바) · 팁 · 샤프트 · Headless · 화살 | 5 동작 | 10s |
| 깃털 15개(상점) | 15 × 8 = 120 GP | — |
| **합계** | **화살 15개** | **약 40s + 120 GP** |

→ **Rune Arrows 1개 ≈ 2.7초 + 8 GP**. 광석 판매가 합 204 + 통나무 1 + 깃털 120 = 325G 를 들여 판매가 30 × 15 = 450G 를 만든다.
Bronze Arrows 15개는 같은 구조에서 광석 2 + 통나무 1 + 4동작 = 19초.

### 5-3. 낚시 → 요리 → 음식 (Fishing → Cooking)

| 음식 | 낚시 s | 조리 s | 1개 총 s | 개수/h | 회복 | 요리 판매가 | 생선만 팔 때 GP/h | 요리 GP/h |
|---|---|---|---|---|---|---|---|---|
| Lobster | 7.5 | 5 | 12.5 | 288 | 110 | 108 | 31,200 | 31,104 |
| Shark | 11 | 8 | 19 | 189 | 200 | 674 | 88,363 | 127,705 |
| Whale | 17.5 | 11 | 28.5 | 126 | 480 | 2,048 | 154,285 | 258,694 |

투입 : 산출 = **생선 1 → 음식 1**(고정 1:1). 조리는 낚시 시간의 약 60 %를 더한다. 요리하면 판매가가 Lobster 65 → 108(×1.7) · Shark 270 → 674(×2.5) · Whale 750 → 2,048(×2.7). 조리 도구(불 · 화로 · 냄비) 단계가 있고 화로/냄비를 쓰는 레시피(케이크 · 수프)는 8초/7초.

### 5-4. 밭 → 약초 → 포션 (Farming → Herblore)

- Farming(마스터리 1): **씨앗 2개 → 약초 10개**(약초 · 작물 `harvestMultiplier` 2, 기본 5 × 2 = 10 `[위키/jina]`) · Garum 1.5h · Sourweed 1.5h · Mantalyme 2h · Lemontyle 2.5h · Oxilyme 3h · Poraxx/Pigtayle 3.5h · Barrentoe 4h. 생존율 기본 50 %(퇴비 +10 %/개, 마스터리 50 이면 확정).
- Herblore: **약초 1~3 + 부재료 1~3 → 포션 1개**(I~IV 단계는 마스터리로 결정, 재료 동일). 부재료는 뼈 · 눈알 · 생선 · 룬 · 씨앗 등 **다른 스킬과 전투 드롭**.
- 예: Melee Accuracy Potion = Garum 약초 1 + Bones 1 → 충전 20~30 = 공격 20~30회(약 1분). 전투 1시간에 IV 포션 40개 = 약초 40 + 뼈 40 = **Garum 밭 4회 수확분 + 킬 40회분 뼈**.

### 5-5. 에센스 → 룬 → 주문 (Mining → Runecrafting → Magic)

- 에센스 바위: 3초당 **2개**(`baseQuantity` 2 · 리스폰 1초), HP 규칙은 다른 바위와 같다.
- 룬 1개 = 에센스 1개 · 2초. 조합 룬은 2차 가공이다 — Mist Rune = 에센스 1 + Air Rune 2 + Water Rune 2 → 판매가 8(재료 판매가 합 5), Lava Rune = 에센스 1 + Earth 2 + Fire 2 → 판매가 13.
- 예: **Fire Blast 1회** = Air 4 + Death 1 + Fire 5 = 룬 10개 = 에센스 10개 + 룬제작 20초 + 채굴 15초(에센스 2개/3초 기준 15초). §4-6 사례 B 가 이 곱셈이다.

### 5-6. 사슬의 공통 형태 `[해석]`

| 형태 | 예 |
|---|---|
| 1 : 1 | 생선 → 요리, 광석 → Iron Bar, 에센스 → 룬 |
| 여러 : 1 | Steel Bar(광석 3) · Mithril Bar(광석 5) · Runite Bar(광석 9) · Dragonite Bar(광석 15) — 바 하나가 광석 여러 개(주로 Coal) |
| 1 : 여러 | 바 1 → 화살촉 15 · 통나무 1 → 샤프트 15 · 재료 → 태블릿 25 |
| 여러 : 1 (5~) | Platebody = 바 5 · 상위 무기 = 바 3 |
| 씨앗 : 수확 | 2~3 씨앗 → 10개(마스터리 1) → 88개(99) · 나무 1 씨앗 → 150 → 1,320 |

---

## 6. 드롭 구조

### 6-1. `lootChance` · `lootTable` `[데이터]`

몬스터 하나의 드롭은 세 겹이다:

1. **GP** — `currencyDrops`(항상, `min~max` 균등 `[추정]`).
2. **뼈** — `bones.itemID` × `quantity`(전 몬스터 1개 · 던전 안에서는 `dropBones: false` 로 꺼진다 · God 던전만 예외로 뼈 대신 Shard).
3. **아이템 드롭** — `lootChance`(%)의 확률로 발동, 발동하면 `lootTable` 의 항목 중 **`weight` 비례 추첨 1개**(`minQuantity~maxQuantity`).

| 통계 (지역 몬스터 98종) | 값 |
|---|---|
| `lootChance` = 100 % | 65종(66 %) |
| `lootChance` 1 ~ 80 % | 33종 — 대표: Rune Knight 5 · Black Knight 10 · Elerine 계열 15~20 · Vampire/Moss Giant 75 |
| 항목 수 | 1~18개(평균 약 4.7, 중앙값 4) |
| 예 | Black Knight: 10 % 확률, 항목 10개(Black Boots 50 · Helmet 30 · Dagger 30 · Shield 20 …**Platebody 1**) → **Platebody 는 킬의 약 0.05 %**(10 % × 1/204) |

`weight` 는 상대값이고 합이 100 이 아니다(Black Knight 는 총합 204).

### 6-2. 무엇을 주는가 — 종류 비율 `[데이터/계산]`

`lootTable` 항목의 `weight` 비중을 몬스터 98종 평균 낸 값:

| 종류 | 비중 |
|---|---|
| **재료**(씨앗 · 바 · 광석 · 약초 · 가죽 · 생선 · 조각 · 재료류) | **50.1 %** |
| **장비**(무기 · 방어구 · 장신구 — `validSlots` 가 있는 것) | **26.1 %** |
| 소모품(음식 · 포션 · 룬 · 장착 탄약) | 21.2 % (그중 탄약 7.2 %) + Fletching 화살 2.6 % |
| 상자 · 기타 | 약 0 % |

같은 98종의 킬당 가치(평균): **GP 187 · 뼈 판매 40 · 드롭 판매 기대값 약 1,280**. 드롭 판매 기대값의 종류별 분해: 재료 492 · 장비 395 · 탄약 385 · 기타 <10 `[데이터/계산]`.
→ 몬스터는 **장비 1/4 · 재료 1/2 · 소모품 1/5** 를 준다. **장비도 몬스터에서 나오지만 주 획득 경로는 제작**이다([02_items.md §3](02_items.md#3-획득-경로)).

### 6-3. 던전 · 상자 `[데이터]` + `[위키/jina, Dungeons]`

- 던전(God 던전 제외)은 「킬마다 보상 없음, **클리어 시 보상 하나**」. `rewardItemIDs` 가 상자(Openable) 하나다 — Chicken Coop → Egg Chest · Undead Graveyard → Standard Chest · Bandit Base → Bandit Chest · Volcanic Cave → Elite Chest + **Fire Cape**(확정 장비) · Dragons Den → Elder Chest …
- 상자는 `dropTable`(weight · 수량 범위)로 **안에 든 걸 랜덤 추첨**한다. 대표: Egg Chest = Feathers 1~1,000 또는 Raw Chicken 1~40(둘 다 weight 1) · Standard Chest = 20개 항목(Coal 1~50 · 씨앗 1~20 …, 장비 비중 16 %) · Spider/Frozen/Bandit Chest = 장비·탄약 100 % · Elite Chest 판매 기대 약 17,012G · Elder Chest 약 24,248G · God 던전의 Scroll of Aeris 등 = 장비 99 %(판매 기대 약 238,414G).
- 보스 펫은 클리어 확률 드롭(가중치 1~350).
- Golbin Raid 는 별개 상자(Golbin Crate 38종).

---

## 7. 보관의 압박

- **칸 수**: 기본 **20**, 상점에서 하나씩 구매, **118개째 구매까지 가격이 오르다 이후 개당 5,000,000 GP 고정** `[위키/jina, Bank]`. Hardcore 는 상점 구매 108개 한도, Bank Slot Token 은 한도 밖·가격 인상 없이 +1. 데이터의 `defaultBuyLimit` 은 0(=한도 없음), Full 의 수정으로 Hardcore 만 88개 제한을 덧씌운다 `[데이터]`.
- **가격 곡선** 은 [04_construction_unlocks.md §4-1](04_construction_unlocks.md#4-1-슬롯-확장)(공식 · 표)에 있다. 그 공식으로 계산한 **누적 비용**: 슬롯 10개 구매까지 2,390 · 20개 19,199 · 40개 304,660 · 60개 2,215,974 · 80개 10,512,303 · 100개 37,531,507 · **118개 98,870,826**(약 9,887만 GP). `[데이터/계산]`
- **아이템 종류 수와의 관계**: 본편(Demo + Full) 정의된 아이템 ID 는 **1,406종**(ToH +602 · AoD +699 · ItA +1,041 → 합 3,748종). **20 + 118 = 138칸**으로는 본편 아이템 종류의 약 10 % 만 동시에 둘 수 있다 `[데이터/계산]`. 위키 Bank 는 「Melvor 에는 인벤토리가 따로 없고 뱅크가 전부」임을 전제로 한다(04 §5-4).
- **겹쳐 쌓기**: 아이템 데이터에 `maxStack` 류 키가 **없다**. 같은 종류를 얼마나 쌓든 칸을 하나만 쓰는 구조로 보인다 — Steam 스레드의 「스토어 스크린샷에 인벤토리 1,127 이 보였고 아이템 종류가 약 1,125종」이라는 진술과 맞는다 `[Steam]` `[해석]`. **위키의 스택 규칙 원문은 확인 못 함**(§11).
- **탭**: 기본 12탭, 추가 15탭(본편 +10 · ItA +5)이며 **탭은 칸 수를 늘리지 않는다**(정리용) `[04 §4-2]`.
- **압박 완화 수단**: 「Sell All」 수동 판매(자동 판매 없음) · Alt. Magic 알케미(§2-5) · 상점 「Materials」.
- **압박의 크기** `[Steam]`: 「초반엔 인벤토리 공간과 업그레이드 때문에 GP 를 불처럼 태워야 한다」(§9).

---

## 8. 없는 것 `[데이터]`

- **플레이어 간 거래 · 경매 · 시장**: 5개 데이터 파일 전체에서 `auction` `marketplace` `premium` `microtransaction` `gem shop` 문자열 **0건**. 싱글플레이 게임이다.
- **유료 재화**: 없다. 위 5종 재화는 모두 게임 안에서만 벌고 쓴다. (후원자 아이템 카테고리 `Patreon` 3종은 존재하나 재화가 아니라 아이템이다.)
- **가격 변동 · 수요·공급**: 데이터에 그런 필드가 없다. 상점 가격은 `cost` 고정(은행 슬롯만 구매 횟수에 따라 오르는 수식), 판매가는 `sellsFor` 고정이다.
- **Township Trader** 는 마을 자원을 GP 로/에서 바꾸는 별도 축이다 → [03_township_buildings.md](03_township_buildings.md). Steam 스레드에서 이 축에 「GP 상한」이 도입되었다고 언급된다(§9, 원문 확인 못 함).
- **자동 판매 · 자동 분해**: 공식 상점에 없다 `[04 §5-5]`.

---

## 9. 후반의 골드 가치 (커뮤니티 평가)

**결론: 후반엔 골드가 남아돈다는 평가가 지배적이고, 초반엔 부족하다.**

| 출처 | 평가 |
|---|---|
| [Steam 스레드 「how to make gp」](https://steamcommunity.com/app/1267910/discussions/0/3764481749060374234) `[Steam]` | 「stop worrying about money. endgame you have nothing to use the money on and you accumulate billions with nothing to spend it on.」 / 반박: 「early game you constantly have to burn gp like it's going out of style to keep up with inventory space and upgrades」 |
| Reddit 스니펫(WebSearch 합성) `[위키/검색합성]` | 「스킬이 거의 100 이 아닌데 GP 가 약 20억」 · 「Township 을 120 까지 올린 뒤로는 돈이 필요했던 적이 없다」 · 그래서 「GP % 를 올리는 아이템 다수가 쓸모없어진다」 |
| [Steam 스레드 「What actually is the point of Township?」](https://steamcommunity.com/app/1267910/discussions/0/6006138415314605407) `[Steam]` | 「it's certainly a gold sink, spent roughly 10 billion gold buying all the land for map 1」 |
| [Steam 스레드(Township 너프)](https://steamcommunity.com/app/1267910/discussions/0/3552805589771625333) `[Steam]` | Township 의 「GP 상한 + 자원 비용 인상」 뒤에 골드 수입이 급감했고 「왜 돈이 필요한가」 질문이 나온다 |

**같은 결론을 데이터 규모가 뒷받침한다** `[데이터/계산]`:

| 축 | 값 |
|---|---|
| 본편 상점 GP 지출 총합(§3-1) | 약 12.4억 |
| 전 확장 GP 상점 합 | 약 73.4억 + AP 70.6억 + SC 등 |
| 위키의 실전 시간당 수입 | 기본판 전투 최대 1,800만/h · Slayer Coin 파밍 1.48억~4.8억 SC/h · ItA 후반 「Endgame ItA」 **1,100억~2,250억/h**(재화 표기는 원문에 없음) · ItA AP 파밍 약 9.4억 AP/h `[위키/jina, Money_Making]` |
| 가장 비싼 GP 상품 | 20억(Superior Cape of Completion) |

→ 기본판 전투 최대 수입(1,800만/h)으로도 **본편 상점 GP 전부(12.4억)는 약 69시간분**이고, 확장 후반의 수입(1,100억/h 이상)에선 가장 비싼 GP 상품(20억)이 **1분 남짓**이다. `[해석]` 「소모처가 고정 가격 목록 하나뿐이고 후반에 더 이상 새 소모처가 나오지 않는다」가 원인으로 보인다. 다만 Melvor 는 확장팩마다 **새 화폐(AP · ASC)를 별도로 만들어** 그 단계의 「모자람」을 다시 만든다(§10).

---

## 10. 확장팩이 더한 것

| 확장 | 새 재화 | 새 소모처 (데이터) |
|---|---|---|
| **Throne of the Herald** (67건) | 없음(GP · SC 그대로) | Superior Skillcape 26종 × 10,000,000 + Superior Max 230,000,000 + Superior Cape of Completion **2,000,000,000** · 도구 Corundum 5,000만 · Meteorite 1.5억 · Divine 2억(+ 바 1,000~2,500개) · 장비 세트 IV 2억 · Slayer Upgrade Kit Mythical 등 SC 1,000만 |
| **Atlas of Discovery** (88건) | 없음 | 발굴 도구 4계열 11단계(GP 500~2,000만 + 바 25~200개) · ShipUpgrade 8단계(마지막 GP 5억 + 아이템 각 2,000개 + SC 500만) · 지도 슬롯 |
| **Into the Abyss** (78건) | **Abyssal Pieces · Abyssal Slayer Coins** (병행 통화) | AP 상점 47건(합 약 70.6억): The Unyielding Conqueror 20억 · Cape of Completion(ItA) 10억 · 도구 코팅 5단계 5만 → 2.5억 AP + 바 5,000 → 25,000개 · ASC 상점 24건(합 4.4억, 지역 통행 3,000만~1.25억) · 은행 탭 5개(AP 1만 → 1억) · 은행 슬롯 AP 500만 고정 |

`[데이터]` — 새 화폐는 ItA **하나뿐**이고, 나머지 두 확장은 GP/SC 위에 **더 큰 단가**를 얹는다.

---

## 11. 출처 · 확인 못 한 것

### 11-1. 출처

- `[데이터]` — `melvorDemo.json` · `melvorFull.json` · `melvorTotH.json` · `melvorExpansion2.json` · `melvorItA.json` (2026-09-30 로컬 사본). 스크립트는 scratchpad `agent_4/`.
- `[위키/jina]` — `https://wiki.melvoridle.com/w/` 의 `Mining` · `Thieving` · `Slayer` · `Food` · `Prayer` · `Bank` · `GP` · `Arrows` · `Dungeons` · `Money_Making` · `Ranged` · `Magic` · `Farming` · `Golbin_Raid`.
- `[Steam]` — 스레드 5건: 3764481749060374234 · 6006138415314605407 · 3552805589771625333 · 3192492886085330552(인벤토리 규모) · 3199240675512402566(탭). `steamcommunity.com/app/1267910/discussions/0/<id>`.
- `[위키/검색합성]` — Reddit 스니펫(§9) · 「Township GP 상한」 서술.
- 기존 문서 링크: [01_skills.md](01_skills.md) · [02_items.md](02_items.md) · [03_township_buildings.md](03_township_buildings.md) · [04_construction_unlocks.md](04_construction_unlocks.md).

### 11-2. 데이터와 기존 문서가 어긋난 곳

| 항목 | 기존 문서 | 이 조사(데이터 + 위키) |
|---|---|---|
| Skillcape 가격 | [04 §5-1](04_construction_unlocks.md#5-1-skillcape스킬케이프): 스킬별 10,000,000 GP | **1,000,000 GP**(24종) · 10,000,000 은 Superior Skillcape. 위키 Thieving 페이지도 1,000,000 |
| 은행 슬롯 구매 한도 | 04 §4-1: 일반 118 | 데이터 `defaultBuyLimit` 0(무제한), 위키는 「118개째부터 5,000,000 GP 고정」 — 118 은 가격 상한 도달점이지 구매 한도가 아니다 |
| 기본 은행 슬롯 | 04: 20 | 일치(Steam 오래된 글은 12로 적음) |

### 11-3. 확인 못 한 것

| 항목 | 상태 |
|---|---|
| Thieving 성공률식 | **해소** — 검수에서 게임 코드(`thieving2.js`)로 확인해 §2-2 를 고쳤다. GP 균등분포(1~최대) 가정은 여전히 `[추정]` |
| Raid Coins 획득식 | 위키 수식이 지워졌다(난이도 배율 0.5/1/1.5 · 웨이브 수에 따라 증가만 확인) |
| 몬스터 명중률 · 플레이어 회피 | 데이터에 플레이어 스탯이 없어 §4-2 는 상한(f = 1)만 적었다 |
| 원거리 몬스터 최대 데미지식 | 근접식만 위키로 검증. 원거리는 같은 식 가정 `[추정]` |
| 위키의 아이템 스택 규칙 원문 | Bank 페이지에 스택 기술 없음. 「1종 = 1칸」은 데이터 필드 부재 + Steam 진술의 `[해석]` |
| 채굴 바위의 자연 회복(10초 1HP) | §2-2 표는 회복을 무시한 보수 계산 |
| 제련 · 플레칭 · 룬제작 · 허블 · 요리 외 행동 시간 | Herblore/Firemaking 의 기본 시간은 확인 못 함. 제련 2초 등은 01 §3 서술 재사용 |
| Reddit 원문 | 도메인 제한으로 미열람 — 스니펫 합성 |
| 「Township GP 상한」 시점 · 세부 | 스레드에서 언급만 확인 |
| ItA 새 소모품(Soul Points · 어비셜 음식) 상세 | 본 조사 범위 밖 — 재화 5종 구조만 확인 |

---
*마지막 업데이트: 2026-09-30*
