# Melvor Idle — 레벨 디자인 (경험치 곡선 · 행동 · 구역 · 게이트 · 튜토리얼)

> 상태: **조사 완료** (2026-09-30)
> 목적: Melvor 가 「레벨이 오를수록 무엇이 열리고, 얼마나 걸리고, 무엇이 막는가」를 **수치로** 어떻게 깔았는지 확보한다 — 경험치 곡선 · 행동 목록의 요구 레벨/시간/경험치 · 스킬 하나를 99까지 올리는 시간 · 전투 구역 계단 · 장비/도구 티어 계단 · 게이트 종류 · 튜토리얼 · 콘텐츠 양
> 짝 문서: [01_skills.md](01_skills.md)(스킬 29종 · 마스터리 — 여기서 다시 안 쓴다) · [04_construction_unlocks.md](04_construction_unlocks.md) §6 · §7(마스터리 vs 건설형 · 던전/슬레이어 개요) · [02_items.md](02_items.md)
> ⚠ 이 문서의 수치는 전부 Melvor Idle 의 수치다
> ⚠ 「시간」은 전부 **보너스 없는 기준 계산**(장비·물약·마스터리·펫 0)이다. 실제 플레이 시간이 아니다

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 |
| 1 | 경험치 곡선 — 공식 · 표 · 곡선의 성질 |
| 2 | 행동 하나의 시간과 보상 — 스킬 요약표 · 채집형 전체표 · 장인형 전체표 · 나머지 요약 |
| 3 | 스킬 하나를 99까지 올리는 시간 — 식 · 스킬별 시간 · 구간 비중 |
| 4 | 전투 난이도 계단 — 전투 구역 · 던전 · 슬레이어 구역 · 요새 · 슬레이어 임무 |
| 5 | 장비 티어 계단 · 도구 업그레이드 |
| 6 | 게이트의 종류 |
| 7 | 튜토리얼 22단계 |
| 8 | 콘텐츠 양 |
| 9 | 확장팩이 더한 것 — 레벨 상한(`skillLevelCapIncreases`) |
| 10 | 출처 · 확인 못 한 것 |

---

## 0. 조사 방법과 신뢰도

| 표기 | 쓴 자료 |
|---|---|
| `[데이터]` | `melvorDemo.json`(melvorD) + `melvorFull.json`(melvorF) 를 합쳐 「본편」으로 본다. 쓴 키 — `skillData[].data`(`trees` · `fish` · `rockData` · `logs` · `recipes` · `npcs` · `obstacles` · `plots`) · `combatAreas` · `slayerAreas` · `dungeons` · `strongholds` · `monsters` · `items`(`tier` · `equipRequirements`) · `shopPurchases`(`cost` · `purchaseRequirements` · `unlockRequirements`) · `shopUpgradeChains` · `slayerTaskCategories` · `tutorialStages` · `tutorialStageOrder` · `gamemodes` · `skillLevelCapIncreases`(TotH · AoD · ItA) |
| `[데이터/계산]` | 위 값으로 직접 계산. 식을 옆에 적었다 |
| `[위키/jina]` | `r.jina.ai` 프록시로 연 위키 9쪽 — Experience · Mastery · Mining · Thieving · Herblore · Smithing · Crafting · Fletching · Runecrafting. **막힌 요청은 없었다** |
| `[해석]` `[추정]` | 사실에서 끌어낸 읽기 / 확인 못 하고 짐작 |

**데이터에 없는 것이 있다.** 채굴 · 제련 · 제작 · 궁술 · 룬 · 약초학 · 도둑질의 **기본 행동 시간**은 JSON 에 없다(게임 코드 안). 그래서 위키에서 가져왔다 — Mining 3초 · Thieving 3초 · Herblore 2초 · Smithing 2초 · Crafting 3초 · Fletching 2초 · Runecrafting 2초 `[위키/jina]`. Summoning 5초 · Astrology 3초는 [01_skills.md §3-3](01_skills.md) 의 위키 열람값을 재인용. 나머지(Woodcutting · Fishing · Firemaking · Cooking · Agility · Farming)는 행동 데이터에 `baseInterval` 이 있다.

**전투 레벨 계산.** 몬스터 데이터에는 전투 레벨이 없고 능력치(`levels`)만 있다. `base = 0.25×(Defence+Hitpoints)` · `melee = 0.325×(Attack+Strength)` · `ranged = 0.325×⌊1.5×Ranged⌋` · `magic = 0.325×⌊1.5×Magic⌋` · **전투 레벨 = ⌊base + max(melee, ranged, magic)⌋**. 이 식으로 Mumma Chicken 39 · Miolite Caves 최고 178 · Volcanic Cave 677 · Infernal Stronghold 714 · Into the Mist 925 가 나와 [04 §7-2](04_construction_unlocks.md) 의 위키 값과 **전부 일치**해서 그대로 썼다 `[데이터/계산]`.

---

## 1. 경험치 곡선

### 1-1. 공식

```
XP(L) = ⌊ Σ_{l=1}^{L-1} ⌊ l + 300 · 2^(l/7) ⌋ / 4 ⌋          (L = 목표 레벨, XP(1)=0)
```

식은 데이터에 없다 — 아는 공식으로 표를 만들어 **위키 Experience 표와 대조해 일치**(2 → 83 · 50 → 101,333 · 92 → 6,517,253 · 99 → 13,034,431 · 120 → 104,273,167) `[데이터/계산]` `[위키/jina]`. 레벨 1 → 2 는 83 XP. 「레벨 하나 올리는 값」의 증가율은 **레벨마다 ×1.104**(= 2^(1/7)) — **7레벨마다 두 배** `[위키/jina]`.

### 1-2. 표

| 레벨 | 누적 XP | 99 대비 | 이 레벨로 오르는 값 |
|---:|---:|---:|---:|
| 2 | 83 | 0.00% | 83 |
| 10 | 1,154 | 0.01% | 185 |
| 20 | 4,470 | 0.03% | 497 |
| 30 | 13,363 | 0.10% | 1,332 |
| 40 | 37,224 | 0.29% | 3,576 |
| 50 | 101,333 | 0.78% | 9,612 |
| 60 | 273,742 | 2.10% | 25,856 |
| 70 | 737,627 | 5.66% | 69,576 |
| 80 | 1,986,068 | 15.24% | 187,260 |
| 90 | 5,346,332 | 41.02% | 504,037 |
| **92** | **6,517,253** | **50.00%** | 614,422 |
| 95 | 8,771,558 | 67.30% | 826,944 |
| **99** | **13,034,431** | 100% | 1,228,825 |
| 105 | 23,611,006 | 181% | 2,225,933 |
| 110 | 38,737,661 | 297% | 3,652,007 |
| 115 | 63,555,443 | 488% | 5,991,725 |
| **120** | **104,273,167** | 800% | 9,830,430 |

`[데이터/계산]` — 위키 표와 대조 완료.

### 1-3. 곡선의 성질

- **레벨 92 가 99 까지의 절반이다.** 1 → 92 와 92 → 99 가 **같은 XP**(6,517,253 vs 6,517,178). 7레벨(92 → 99)이 전체의 반이다. 위키도 같은 말을 적었다 `[위키/jina]`
- 1 → 50 은 **전체의 0.78%**. 1 → 70 이 5.7% · 1 → 80 이 15%. **레벨 90 에서 겨우 41%**
- 구간 XP 비중(99 기준): **1 → 30 = 0.10% · 30 → 60 = 2.00% · 60 → 90 = 38.9% · 90 → 99 = 59.0%** `[데이터/계산]`
- **99 → 120 은 1 → 99 의 7.0배**(총 120 은 99 의 8.0배)를 더 요구한다. 확장팩의 100~120 은 곡선을 그대로 잇는다(별도 곡선 없음)
- 마스터리 레벨은 **같은 표**를 쓴다(레벨당 필요 XP 동일) `[위키/jina, Mastery]`. 마스터리 XP 는 행동마다 이렇게 오른다 — `(해금 행동 수 × 내 스킬 총 마스터리 ÷ 스킬 총 마스터리 상한 + 그 행동의 마스터리 레벨 × 스킬 총 행동 수 ÷ 10) × (행동 시간(초) × 0.5) × (1+보너스)`. 위키의 수식 자체는 그림이 빠져 있어 **산문 설명(두 항의 합에 시간의 절반을 곱한다)에서 복원**했다 `[위키/jina + 해석]`. 행동 시간은 채집형(Woodcutting · Mining · Agility · Thieving · Fishing · Astrology)에서는 실제 걸린 초, 장인형에서는 고정값(Smithing 1.7 · Fletching 1.3 · Crafting 1.65 · Runecrafting 1.7 · Herblore 1.7 · Summoning 4.85 · Firemaking 버닝 간격의 60% · Cooking 85%), Farming 은 작물이 자란 **시간(hour)** `[위키/jina]`

---

## 2. 행동 하나의 시간과 보상

### 2-1. 스킬별 요약표 (본편 = Demo + Full)

시간당 XP = `baseExperience ÷ 기본 시간(초) × 3600`, 「그 레벨에서 열린 행동 중 최댓값」. 성공률 100% · 재료 무제한 가정. `[데이터/계산]`

| 스킬 | 행동 수 | 서로 다른 해금 레벨 수 | 첫~마지막 해금 | 평균 / 최대 간격 | 기본 시간(초) | 시간당 XP — 레벨 1 / 30 / 60 / 90 | 99÷1 배율 |
|---|---:|---:|---|---|---|---|---:|
| Woodcutting | 9 | 9 | 1~90 | 11 / 15 | 3~20 | 12,000 / 15,840 / 24,000 / 43,200 | ×4 |
| Fishing | 23 | 19 | 1~95 | 5 / 10 | 평균 5.5~21 | 3,000 / 13,846 / 61,714 / 104,823 | ×39 |
| Mining | 11 | 8 | 1~95 | 13 / 20 | 3 | 8,400 / 30,000 / 78,000 / 103,200 | ×14 |
| Firemaking | 9 | 9 | 1~90 | 11 / 15 | 2~15 | 34,200 / 70,200 / 100,285 / 105,120 | ×3 |
| Cooking | 32 | 28 | 1~99 | 3.6 / 8 | 2~11 | 12,000 / 72,450 / 114,685 / 317,314 | ×26 |
| Smithing | 115 | 86 | 1~99 | 1.2 / 2 | 2 | 18,000 / 180,000 / 450,000 / 675,000 | ×50 |
| Crafting | 57 | 34 | 1~90 | 2.7 / 6 | 3 | 15,599 / 72,000 / 195,600 / 480,000 | ×31 |
| Fletching | 57 | 27 | 1~95 | 3.6 / 5 | 2 | 32,400 / 126,000 / 252,000 / 450,000 | ×19 |
| Runecrafting | 84 | 47 | 1~95 | 2.0 / 5 | 2 | 19,800 / 64,800 / 153,000 / 720,000 | ×41 |
| Herblore | 30 | 28 | 1~90 | 3.3 / 11 | 2 | 9,000 / 39,600 / 108,000 / 324,000 | ×36 |
| Thieving | 23 | 23 | 1~95 | 4.3 / 6 | 3 | 6,000 / 31,199 / 63,600 / 128,399 | ×27 |
| Summoning | 20 | 10 | 1~90 | 9.9 / 15 | 5 | 3,600 / 10,800 / 19,440 / 29,519 | ×8 |
| Astrology | 11 | 11 | 1~95 | 9.4 / 10 | 3 | 6,000 / 34,800 / 63,600 / 92,400 | ×17 |

(Farming · Agility 는 행동 시간의 단위가 달라 §2-5 에서 따로.) 읽히는 것 —

- **행동 수의 두 부류.** 채집형(Woodcutting 9 · Mining 11 · Fishing 23)은 **한 자릿수~20 개**, 만드는 스킬(Cooking 32 · Herblore 30 · Crafting 57 · Fletching 57 · Runecrafting 84 · Smithing 115)은 **30~115 개**. 새 행동이 열리는 레벨 간격은 채집형이 **평균 5~13**, 만드는 스킬이 **1.2~3.6** — Smithing 은 거의 **매 레벨** 새 물건이 열린다. 예외는 Firemaking(행동 9 · 간격 11)과 Summoning(20 · 9.9)이다
- **레벨 90 이후에는 새 행동이 거의 없다.** 90 이상에서 열리는 행동은 Woodcutting · Mining · Fishing · Firemaking · Herblore 가 **각 1개**(90~95), Cooking 3 · Crafting 3 · Thieving 2 · Astrology 2 · Summoning 2 · Runecrafting 2 · Fletching 8 · **Smithing 10**(Dragon 티어가 90~99 에 몰림). 90 → 99(전체 XP 의 59%)는 대부분 **새 행동 없이 같은 행동을 반복**하는 구간이다 `[데이터/계산]`
- **시간당 XP 는 레벨에 따라 ×3~×50 로 오른다.** 오름폭이 가장 작은 것은 Firemaking(×3), 가장 큰 것은 Smithing(×50) · Runecrafting(×41) · Fishing(×39)
- **시간당 XP 는 행동 목록을 따라 단조롭게 오르지 않는다** — Woodcutting Magic(레벨 75, 20초 · 100XP = 18,000/h)은 Yew(60, 12초 · 80XP = 24,000/h)보다 낮다. Fishing Shark(70) 49,091 < Crab(60) 50,824. Firemaking Redwood(90) 87,360 < Magic(75) 105,120. Cooking Cave Fish(75) 74,400 < Shark(70) 83,700. 「레벨 요구가 높다 = 시간당 XP 가 높다」가 **아니다** — 가장 높은 것을 고르는 최적 루트는 일부 행동을 건너뛴다 `[데이터/계산]`

### 2-2. 채집형 · 그 산물을 소비하는 장인형 — 짝으로 본 전체표

Woodcutting ↔ Firemaking 은 **같은 9단 사다리**(레벨 1 · 10 · 25 · 35 · 45 · 55 · 60 · 75 · 90, 같은 통나무 이름)이고 Fishing ↔ Cooking 도 **같은 12단**(생선마다 요리가 하나)이다. 그래서 짝으로 나란히 싣는다. 열: 요구 레벨 · 기본 시간(초) · 기본 XP · 시간당 XP. `[데이터]` + 계산.

**Woodcutting(`trees` 9종 — TotH 가 9종 더) × Firemaking(`logs` 9종)**

| 레벨 | 나무 | 베기 초 | XP | XP/h | 태우기 초 | XP | XP/h | 모닥불(초) |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Normal | 3 | 10 | 12,000 | 2 | 19 | 34,200 | 20 |
| 10 | Oak | 4 | 15 | 13,500 | 2 | 39 | 70,200 | 30 |
| 25 | Willow | 5 | 22 | 15,840 | 3 | 52 | 62,400 | 40 |
| 35 | Teak | 6 | 30 | 18,000 | 4 | 84 | 75,600 | 50 |
| 45 | Maple | 8 | 40 | 18,000 | 5 | 104 | 74,880 | 60 |
| 55 | Mahogany | 10 | 60 | 21,600 | 6 | 130 | 78,000 | 70 |
| 60 | Yew | 12 | 80 | 24,000 | 7 | 195 | 100,286 | 80 |
| 75 | Magic | 20 | 100 | 18,000 | 10 | 292 | 105,120 | 90 |
| 90 | Redwood | 15 | 180 | 43,200 | 15 | 364 | 87,360 | 100 |

모닥불 지속은 `baseBonfireInterval`(밀리초 → 초), 모닥불 XP 보너스(`bonfireXPBonus`)는 5 → 45(%)로 통나무마다 5씩 오른다. **둘 다 상위 행동에서 시간당 XP 가 꺾인다** — 베기는 Magic(18,000 < Yew 24,000), 태우기는 Redwood(87,360 < Magic 105,120).

**Fishing(`fish` 23종 중 본선 12종 · 나머지 11종은 특정 낚시터 전용) × Cooking(`recipes` 32종 중 본선 생선 12종)** — 낚시 시간은 `baseMinInterval ~ baseMaxInterval` 사이에서 매번 굴려지는 **범위**([01 §3-1](01_skills.md)), 시간당 XP 는 평균(균등 분포 가정 `[추정]`)으로 계산

| 레벨 | 물고기 | 낚시 시간(초) | 평균 | XP | XP/h | 요리 초 | XP | XP/h |
|---:|---|---|---:|---:|---:|---:|---:|---:|
| 1 | Shrimp | 4~8 | 6 | 5 | 3,000 | 2 | 5 | 9,000 |
| 5 | Sardine | 4~8 | 6 | 10 | 6,000 | 2 | 10 | 18,000 |
| 10 | Herring | 4~8 | 6 | 15 | 9,000 | 3 | 15 | 18,000 |
| 20 | Trout | 4~10 | 7 | 20 | 10,286 | 4 | 33 | 29,700 |
| 35 | Salmon | 4~10 | 7 | 40 | 20,571 | 4 | 40 | 36,000 |
| 40 | Lobster | 4~11 | 7.5 | 50 | 24,000 | 5 | 66 | 47,520 |
| 50 | Swordfish | 5~12 | 8.5 | 80 | 33,882 | 5 | 83 | 59,760 |
| 60 | Crab | 5~12 | 8.5 | 120 | 50,824 | 7 | 140 | 72,000 |
| 70 | Shark | 7~15 | 11 | 150 | 49,091 | 8 | 186 | 83,700 |
| 75 | Cave Fish | 8~15 | 11.5 | 300 | 93,913 | 9 | 186 | 74,400 |
| 85 | Manta Ray | 9~25 | 17 | 495 | 104,824 | 10 | 291 | 104,760 |
| 95 | Whale | 10~25 | 17.5 | 575 | 118,286 | 11 | 400 | 130,909 |

Cooking 의 나머지 20종은 특정 낚시터 생선 4종 + Bread · Beef · 파이 · 수프 · 케이크 등 16종이다. 최고 시간당 XP(317,314)는 생선이 아니라 Chicken Soup(레벨 81 · 7초 · 617XP)이다. 이 짝에서도 **낚시는 Shark(49,091 < Crab 50,824), 요리는 Cave Fish(74,400 < Shark 83,700)에서 꺾인다**.

**Mining**(`rockData` 11종 — 행동 시간 3초는 위키값. 바위 HP 가 10초마다 1 회복, 마스터리 레벨당 최대 HP +1 `[위키/jina]`)

| 바위 | 레벨 | XP | XP/h | 바위 리스폰(초) |
|---|---:|---:|---:|---:|
| Rune Essence | 1 | 5 | 6,000 | 1 |
| Copper / Tin | 1 | 7 | 8,400 | 5 |
| Iron | 15 | 14 | 16,800 | 10 |
| Coal | 30 | 18 | 21,600 | 10 |
| Silver | 30 | 25 | 30,000 | 15 |
| Gold | 40 | 28 | 33,600 | 15 |
| Mithril | 50 | 65 | 78,000 | 20 |
| Adamantite | 70 | 71 | 85,200 | 30 |
| Runite | 80 | 86 | 103,200 | 60 |
| Dragonite | 95 | 101 | 121,200 | 120 |

레벨 50 에서 XP 가 **한 번에 ×2.3**(Gold 28 → Mithril 65). 바위 HP 가 다 깎이면 리스폰 간격만큼 쉰다 — **§3 의 Mining 시간은 이 대기를 뺀 값**이라 실제보다 짧다 `[해석]`.

### 2-3. 장인형 — Smithing

Smithing `recipes` 115종 · 전부 2초. 「그 레벨까지 열린 것 중 시간당 XP 최대」가 바뀌는 지점만 싣는다.

| 레시피 | 레벨 | XP | XP/h |
|---|---:|---:|---:|
| Bronze Dagger | 1 | 10 | 18,000 |
| Bronze Battleaxe | 8 | 30 | 54,000 |
| Iron Battleaxe | 17 | 60 | 108,000 |
| Iron Platebody | 27 | 100 | 180,000 |
| Steel Platebody | 42 | 150 | 270,000 |
| Mithril Platebody | 57 | 250 | 450,000 |
| Adamant Platebody | 72 | 300 | 540,000 |
| Rune Platebody | 87 | 375 | 675,000 |
| Dragon Platebody | 99 | 500 | 900,000 |

XP 는 **재료 소모량에 비례**한다(Platebody 는 바 5개) — 시간이 같아도 소모 재료가 크면 XP 가 크다. 시간당 XP 는 **티어가 한 칸 오를 때마다 1.2~1.7배**씩 오른다. 바(Bar) 자체는 XP 가 작다(Bronze 5 → Dragonite 60).

### 2-4. 나머지 스킬 요약

| 스킬 | 행동 구조 | 특징 `[데이터]` |
|---|---|---|
| Crafting (57) | 목걸이 · 반지 · 가죽/드래곤하이드 방어구 · 소비품, 3초 | 가죽 방어구는 레벨 9~18(Leather) → 33~50(Hard Leather) → 60~84(Dragonhide 4색) 로 3덩이 |
| Fletching (57) | 활 · 화살 · 볼트 · 재블린, 2초 | 활 시리즈 Normal 10 → Oak 25 → Willow 40 → Maple 55 → Yew 70 → Magic 85 → Redwood 95 (**+15 간격**) |
| Runecrafting (84) | 룬 · 마법 방어구/무기, 2초 | 행동 수가 많고(84) 해금 레벨이 촘촘(평균 2). 레벨 80 이후 시간당 XP 가 540k → 810k |
| Herblore (30) | 물약 30종(각 4 티어 — 티어는 **마스터리 레벨** 1/20/50/90 으로 열림) | 요구 레벨 1~90 에서 **레벨 74 → 85 사이 11 레벨 공백**(최대 간격) |
| Thieving (23) | NPC 23명(11 지역), 3초 | 도둑질 XP 5(Man) → 133(King). 실패하면 기절 — 아래 표의 수치는 성공 100% 가정 |
| Astrology (11) | 별자리 11개 — 레벨 1 · 10 · 20 · … · 90 · 95 로 **10 간격 정직하게** | 3초 · XP 5 → 85 로 **8씩 일정하게 증가** |
| Summoning (20) | 소환 태블릿 제작, 5초 | 해금 레벨이 1 · 5 · 15 · 25 · 35 · 45 · 55 · 65 · 80 · 90 의 10 종뿐 — **한 레벨에 같은 티어 2개씩** 열린다 |

### 2-5. Farming · Agility (시간 단위가 다른 스킬)

**Farming** — 행동이 「씨앗 심기 → 수확」이라 시간이 **수 시간~수십 시간**(`baseInterval` 은 밀리초: 7,200,000 = 2시간). 작물 24종 + 밭 25칸.

| 분류 | 작물 수 | 성장 시간 | 수확 XP | 밭 1칸의 XP/h |
|---|---:|---|---|---|
| 작물(Allotment) | 10 | 2~4시간 | 8 → 118 | 4 → 34 |
| 약초(Herb) | 8 | 1.5~4시간 | 9 → 92 | 6 → 23 |
| 수목(Tree) | 6 | 6.7~16시간 | 5,835 → 172,250 | 875 → 10,766 |

- **수목은 작물 대비 수확 XP 가 천 배 이상**(Magic Tree 172,250 vs Carrot 118) — 밭 한 칸의 시간당 XP 도 **약 300배 차이**(10,766 vs 34). 수목 밭은 **4칸뿐**이고 레벨 15/30/60/80 에서 열린다
- 밭 해금은 **레벨 + 골드** 두 게이트(§6): 작물 밭 12칸(레벨 1·1·1·10·20·…·90, 500 ~ 200,000 GP) · 약초 밭 9칸(5 ~ 85, 10,000 ~ 200,000 GP) · 수목 밭 4칸(15/30/60/80, 50,000 / 100,000 / 250,000 / 400,000 GP). 25칸 전부 사는 데 **2,370,500 GP**
- 마스터리 XP 도 작물이 **자란 시간(hour)** 을 곱해 큰 값이 나온다(§1-3)

**Agility** — 행동이 「코스의 장애물 하나 통과」. 51 종이 `category` 0~9(10 종류 — 슬롯)에 놓인다. XP 6 ~ 567, 시간 3 ~ 23초, 시간당 XP **4,200 (Rope Climb) ~ 189,000 (Ice Jump)**. 장애물 개별의 요구는 **Agility 레벨이 아니라 다른 스킬 레벨**(예: Monkey Bars = Firemaking 15 · Ice Jump = Cooking 60 + Mining 60 + Slayer 60 + Thieving 60) — 75 개 요구 중 Agility 자신은 0 `[데이터]`. 슬롯 · 비용 구조는 [04 §1](04_construction_unlocks.md).

---

## 3. 스킬 하나를 99까지 올리는 시간

### 3-1. 식과 가정

```
R(L)  = max { xp_a / interval_a × 3600 : 행동 a 의 요구 레벨 ≤ L }         (시간당 XP)
T(1→99) = Σ_{L=1}^{98} ( XP(L+1) − XP(L) ) / R(L)                           (시간)
```

**가정 — 이 표를 읽을 때 반드시 알 것.** 재료는 무한 · 성공률 100% · 보너스 0 · 항상 「지금 레벨의 최고 시간당 XP 행동」만 반복 · 행동 사이 손실 0. 그래서 —
- **장인형(Smithing · Cooking …)은 재료를 캐는 시간이 빠져 있다.** 순수 「만드는 시간」이다
- **Mining** 은 바위 고갈 · 리스폰 대기가 없다고 뺀 값, **Fishing** 은 시간 범위의 평균, **Thieving** 은 성공 100%(실제는 실패 시 기절)
- **Summoning** 은 태블릿 제작 XP 만(태블릿 사용 XP · 마크 요구 제외)
- **Farming** 은 벽시계 시간(칸 수를 레벨별로 열린 만큼 반영, 작물 성장만, 구입 골드 · 종자 수급 무시) 으로 별도 산출
- 제외: Agility(코스 건설비 · 슬롯 종속) · Township · Alt Magic(레벨 곡선이 다르거나 없음)

### 3-2. 스킬별 시간

| 스킬 | 1 → 99 (시간) | 1→30 / 30→60 / 60→90 / 90→99 (시간) | 구간 비중(%) |
|---|---:|---|---|
| Farming (벽시계) | 506 | 142 / 39 / 147 / 179 | 28 / 8 / 29 / 35 |
| Summoning | 482 | 1.7 / 15.6 / 204 / 260 | 0 / 3 / 42 / 54 |
| Woodcutting | 404 | 0.9 / 13.5 / 211 / 178 | 0 / 3 / 52 / 44 |
| Astrology | 150 | 0.8 / 5.3 / 65 / 79 | 1 / 4 / 43 / 53 |
| Fishing | 134 | 1.2 / 6.9 / 57 / 69 | 1 / 5 / 43 / 51 |
| Mining | 127 | 0.9 / 4.9 / 53 / 68 | 1 / 4 / 42 / 54 |
| Firemaking | 125 | 0.2 / 3.4 / 49 / 73 | 0 / 3 / 39 / 58 |
| Thieving | 107 | 0.7 / 4.8 / 50 / 52 | 1 / 4 / 47 / 48 |
| Herblore | 51 | 0.5 / 3.1 / 23 / 24 | 1 / 6 / 46 / 47 |
| Cooking | 49 | 0.3 / 2.5 / 22 / 24 | 1 / 5 / 44 / 50 |
| Crafting | 37 | 0.3 / 1.7 / 19 / 16 | 1 / 5 / 52 / 43 |
| Fletching | 30 | 0.2 / 1.3 / 14 / 14 | 1 / 4 / 47 / 48 |
| Runecrafting | 25 | 0.3 / 2.0 / 12 / 10 | 1 / 8 / 50 / 41 |
| Smithing | 22 | 0.2 / 0.9 / 9 / 11 | 1 / 4 / 42 / 53 |

`[데이터/계산]`. 읽히는 것 —

1. **스킬 간 시간 격차가 ×20 이상이다**(Smithing 22h ↔ Summoning 482h · Farming 506h). 가장 오래 걸리는 것은 「시간당 XP 가 낮고 행동이 몇 개 안 되는」 Woodcutting · Summoning · Farming 이고, 가장 짧은 것은 「행동이 많고 XP 가 재료 소모량에 비례해 크는」 만드는 스킬이다
2. **구간 비중은 스킬이 달라도 거의 같다**(Farming 제외). 1→30 은 **0~1%**, 30→60 은 **3~8%**, **60→90 이 39~52%**, **90→99 가 41~58%**. 시간의 **91~96% 가 60 이후**에 있다. 시간당 XP 가 레벨에 따라 오르긴 하지만(§2-1) 곡선이 더 빠르게(레벨당 ×1.104) 오르기 때문에 XP 비중(0.1 / 2.0 / 38.9 / 59.0)의 모양이 시간에 그대로 남는다
3. **Farming 만 모양이 다르다** — 1→30 이 **28%(142시간)**. 초반에 열리는 작물 · 약초의 XP 가 극히 작은데(밭 한 칸 시간당 4~7 XP) 수목 밭이 레벨 15 에서야 열려서다. 수목이 열린 뒤엔 다른 스킬과 같은 모양(§2-5)
4. 위 시간은 **행동 하나 = 그 자체가 레벨**이라는 전제다. 마스터리 · 도구 · 장갑 · 물약 · 펫이 이 시간을 크게 줄인다(예: 도끼 Dragon = 간격 −35~40%, §5-3)

---

## 4. 전투 난이도 계단

**전투 콘텐츠는 5갈래**다 — 전투 구역(`combatAreas` 12) · 슬레이어 구역(13) · 던전(17) · 요새(4) · 슬레이어 임무(5 등급). 각 표의 「전투 레벨」은 §0 의 식으로 계산한 **그 구역 몬스터의 최소~최대**다. 입장 조건은 데이터의 `entryRequirements` 를 그대로 옮겼다 `[데이터]` `[데이터/계산]`.

### 4-1. 전투 구역 12곳 (`combatAreas`)

**12곳 전부 `entryRequirements` 가 빈 배열이다 — 입장 조건이 없다.** UI 목록 순서 그대로.

| 구역 | 몬스터 | 전투 레벨 | `difficulty` 값(의미 미확인) |
|---|---:|---|---|
| Farmlands | 6 | 1 ~ 47 | 0 |
| Goblin Village | 2 | 2 ~ 7 | 0 |
| Graveyard | 4 | 7 ~ 46 | 0 |
| Sandy Shores | 4 | 2 ~ 34 | 0 |
| Wet Forest | 4 | 20 ~ 35 | 0 |
| Bandit Hideout | 2 | 23 ~ 44 | 0 |
| Giant Dungeon | 2 | 28 ~ 60 | 0~1 |
| Icy Hills | 3 | 27 ~ 75 | 0~1 |
| Castle of Kings | 5 | 12 ~ 101 | 0~2 |
| Wizard Tower | 3 | 32 ~ 108 | 0~2 |
| Elerine Battlegrounds | 3 | 73 ~ 103 | 1~2 |
| Dragon Valley | 4 | 79 ~ 120 | 1~2 |

구역 하나는 **몬스터 2~6종**(합 42종)이고, 한 구역 안의 최소~최대 폭이 **5(Goblin Village)~90(Castle of Kings)** 로 들쭉날쭉하다. 구역끼리 범위가 **크게 겹친다** — 「이 구역은 레벨 N 용」이 아니라 구역 안의 개별 몬스터를 골라 싸우는 구조 `[해석]`. 전투 구역의 보상은 **몬스터 드롭**(`lootTable` · `gpDrops` · `bones`)이 전부다(구역 자체의 보상 필드 없음).

### 4-2. 던전 17곳 (`dungeons`)

UI 목록 순서. 몬스터 수 = `monsterIDs` 길이(같은 몬스터 반복 포함). 「진입」= `entryRequirements` · 「해금」= `unlockRequirement`(둘 다 있으면 병기 — 아래 참고).

| 던전 | 몬스터 수 (종류) | 전투 레벨 | 진입 조건 | 보상 |
|---|---:|---|---|---|
| Chicken Coop | 6 (3) | 1~39 | 없음 | Egg Chest |
| Undead Graveyard | 8 (4) | 23~71 | 없음 | Standard Chest |
| Bandit Base | 7 (3) | 23~115 | 없음 | Bandit Chest |
| Hall of Wizards | 9 (4) | 32~121 | 없음 | Magic Chest |
| Spider Forest | 8 (4) | 51~158 | 없음 | Spider Chest |
| Miolite Caves | 7 (4) | 54~178 | Slayer 40 | Miolite Chest |
| Deep Sea Ship | 10 (4) | 64~177 | 없음 | Pirate Booty |
| Frozen Cove | 8 (4) | 75~191 | 없음 | Frozen Chest |
| Dragons Den | 9 (5) | 79~272 | 없음 | Elder Chest |
| Volcanic Cave | 8 (8) | 22~**677** | 없음 | Elite Chest · Fire Cape |
| Infernal Stronghold | 17 (7) | 139~714 | Slayer 75 (해금: Volcanic Cave 100회) | Infernal Core · Infernal Cape |
| Air God Dungeon | 21 (6) | 165~752 | Volcanic Cave 1회 | Scroll of Aeris |
| Water God Dungeon | 21 (6) | 172~790 | Air God 1회 | Scroll of Glacia |
| Earth God Dungeon | 21 (6) | 177~813 | Water God 1회 | Scroll of Terran |
| Fire God Dungeon | 21 (6) | 175~815 | Earth God 1회 | Scroll of Ragnar |
| Into the Mist | 23 (4) — 무작위 자리 20 + 보스 3 | 925 (무작위 자리는 능력치 1짜리 자리표시자 `RandomITM`) | Slayer 90 (해금: Fire God 1회) | New Dawn |
| Impending Darkness | 1 (1) | **1300** | Into the Mist 1회 | (없음) |

- **입장 조건이 없는 던전이 9곳**(Chicken Coop · Undead Graveyard · Bandit Base · Hall of Wizards · Spider Forest · Deep Sea Ship · Frozen Cove · Dragons Den · Volcanic Cave)이고 그 안에서 **최고 몬스터 레벨은 39 → 71 → 115 → 121 → 158 → 177 → 191 → 272 → 677** 로 오른다. 조건이 아니라 **전투력이 계단을 만든다**
- **조건이 붙는 곳은 후반 8곳**이고 종류가 셋이다 — ① 슬레이어 레벨(Miolite 40 · Infernal 75 · Into the Mist 90) ② 이전 던전 클리어 사슬(Volcanic → Air → Water → Earth → Fire → Into the Mist → Impending Darkness) ③ 클리어 횟수(Infernal 「Volcanic Cave 100회」는 `unlockRequirement` 에만 있음)
- **`entryRequirements` 와 `unlockRequirement` 가 따로 있다.** God 던전 셋은 `unlockRequirement` 가 전부 「Volcanic Cave 1회」인데 `entryRequirements` 는 직전 God 던전이다. Infernal 은 진입 = Slayer 75 · 해금 = Volcanic 100회. 두 키의 의미 구분(목록에 보이는 조건 vs 들어갈 수 있는 조건)은 **데이터에 설명이 없어 `[추정]`**. [04 §7-2](04_construction_unlocks.md) 가 Infernal 을 「Slayer 75 + Volcanic 100회」로 적은 것은 이 두 키의 합이다
- God 던전은 층 구성(`floors`)이 `[8, 6, 4, 2, 1]` — 5층에 8 · 6 · 4 · 2 · 1 마리(합 21, 마지막 층 = 보스 1 — Air God 는 Aeris). 던전 보상은 **클리어당 아이템 하나**(`rewardItemIDs` — 상자 · 두루마리 · 망토)이고 펫 확률 가중치(`pet.weight`)가 던전마다 따로 있다
- 던전 최고 몬스터 레벨의 간격: 39 · 71 · 115 · 121 · 158 · 177 · 178 · 191 · 272 · **677 (+405)** · 714 · 752 · 790 · 813 · 815 · **925** · **1300 (+375)**. 큰 도약은 Dragons Den → Volcanic Cave(+405, 조건 없음) 와 Into the Mist → Impending Darkness

### 4-3. 슬레이어 구역 13곳 (`slayerAreas`, 본편)

「진입」= 슬레이어 레벨 + 추가 조건(`SlayerItem` = 그 아이템 보유, `ShopPurchase` = 상점 구매). 구역마다 **지역 효과**(`areaEffect`)가 붙는다.

| 구역 | 진입 (Slayer 레벨 + 추가) | 몬스터 | 전투 레벨 | 지역 효과 |
|---|---|---:|---|---|
| Penumbra | 1 | 6 | 29~100 | 정확도 −10% |
| Forest of Goo | 1 | 4 | 16~69 | 공격 간격 +10% |
| Strange Cave | 10 + Mirror Shield | 6 | 42~316 | 전체 회피 −15% |
| Holy Isles | 30 | 6 | 44~155 | 기도 소모 +20% |
| Runic Ruins | 45 | 5 | 63~171 | 마법 아닌 스타일이면 마법 회피 −50% |
| Arid Plains | 50 + Desert Hat | 6 | 56~197 | 자동 섭식 효율 −30% |
| High Lands | 60 + Magical Ring | 2 | 124~182 | 적이 5턴마다 현재 HP 20% 회복 |
| Toxic Swamps | 65 | 3 | 201~223 | 적의 중독 확률 +100% |
| Desolate Plains | 70 | 4 | 125~239 | HP 재생 −100% |
| Shrouded Badlands | 80 + Blazing Lantern | 4 | 298~348 | 정확도 −40% |
| Perilous Peaks | 85 + Climbing Boots | 3 | 386~447 | 회피 −60% |
| Dark Waters | 90 + Into the Mist 1회 | 3 | 559~611 | 공격 간격 +40% |
| Unhallowed Wasteland | 95 + Map to the Unhallowed Wasteland(상점) | 4 | 629~762 | 적이 2턴마다 HP 100% 회복 |

- **슬레이어 레벨 게이트: 1 · 1 · 10 · 30 · 45 · 50 · 60 · 65 · 70 · 80 · 85 · 90 · 95** — 간격 0 · 9 · 20 · 15 · 5 · 10 · 5 · 5 · 10 · 5 · 5 · 5. 초반(10 → 30 → 45)에 **큰 간격**이 있고 후반은 **5 간격 촘촘**
- **13곳 중 5곳에 아이템 게이트**가 붙어 있다(Mirror Shield · Desert Hat · Magical Ring · Blazing Lantern · Climbing Boots — 각 지역 효과를 상쇄하는 장비 `[해석]`), 1곳이 던전 클리어, 1곳이 상점 구매
- 전투 레벨 범위가 **게이트 순서와 함께 오른다**(최대 몬스터 100 → 69 → 316 → 155 → … → 762). 단조롭지는 않다(Strange Cave 316 은 10 레벨 게이트인데 Toxic Swamps 223 은 65)

### 4-4. 요새 4곳 (`strongholds`)

| 요새 | 진입 | 몬스터 수 | 전투 레벨 | 보상 |
|---|---|---:|---|---|
| Stronghold of the Undead | Slayer 10 + Undead Graveyard **25회** | 72 | 7~100 | Undead Enhancement Scroll |
| Stronghold of Magic | Slayer 45 + Hall of Wizards **50회** | 72 | 32~171 | Magic Enhancement Scroll |
| Stronghold of Dragons | Slayer 85 + Infernal Stronghold **100회** | 72 | 79~714 | Dragon Enhancement Scroll |
| Stronghold of the Gods | Slayer 95 + Into the Mist **5회** | 47 | 518~925 | Gods Enhancement Scroll |

요새는 **강도 3단**(`tiers`: Standard → Augmented → Superior)이다 — Standard 는 필요 아이템 없이 보상(Enhancement Scroll)이 **100%**, Augmented 는 그 요새 전용 `Enhancement 1 · 2 · 3` 세 아이템(`requiredItems`)을 가져가야 하고 보상 100%, Superior 는 그 세 아이템의 Augmented 판을 가져가야 하고 **보상 확률이 1%**. 단마다 요새 몬스터에 붙는 패시브(`passives`)와 데미지 배율 필드(`StrongholdDamageModifier`)가 달라진다. 같은 요새를 강도만 바꿔 되풀이하는 구조다 `[데이터]`.

### 4-5. 슬레이어 임무 등급 (`slayerTaskCategories`)

| 등급 | Slayer 레벨 | 배정 몬스터의 전투 레벨 | 임무 길이 | 다시 굴리는 비용(Slayer Coin) |
|---|---:|---|---:|---:|
| Easy | 1 | 1 ~ 49 | 10 | — |
| Normal | 25 | 50 ~ 99 | 20 | 2,000 |
| Hard | 50 | 100 ~ 199 | 30 | 5,000 |
| Elite | 75 | 200 ~ 374 | 40 | 15,000 |
| Master | 85 | 375 ~ 789 | 50 | 25,000 |

등급 경계가 **전투 레벨 50 · 100 · 200 · 375 · 790** — 대략 **두 배씩** 벌어진다. 「어떤 등급을 받을 수 있는가」는 슬레이어 레벨 + **이전 등급 임무 N회 완료**(`previousCategory`)다 `[데이터]`.

### 4-6. 계단의 모양 — 요약 `[해석]`

- **전투 구역 · 초반 던전 = 조건 없음, 전투력이 유일한 문.** 조건은 「슬레이어 레벨」이라는 **하나의 별도 축**으로 후반(레벨 10 → 95)에 얹힌다
- 게이트는 **슬레이어 레벨 + (아이템 | 이전 클리어 | 상점 구매)** 의 최대 2종이고 구역마다 다른 조합이다(Strange Cave = 레벨 + 아이템 · Dark Waters = 레벨 + 던전 · Unhallowed = 레벨 + 상점). 세 종류 이상이 겹치는 구역은 없다
- 몬스터 전투 레벨의 계단은 **로그 척도**다: 1~120(전투 구역) → 39~272(초중반 던전) → 677~925(후반) → 1300(끝)

---

## 5. 장비 티어 계단

### 5-1. 근접 — 재질 8티어 (`items[].tier` · `equipRequirements`)

| 티어 | 착용 요구(근접 무기 = Attack · 방어구 = Defence · 원거리 무기 = Ranged) | 바 제련 Smithing 레벨 | Dagger 제작 | Platebody 제작 | Platebody Smithing XP |
|---|---:|---:|---:|---:|---:|
| Bronze | 1 | 1 | 1 | 18 | 50 |
| Iron | 1 | 10 | 10 | 27 | 100 |
| Steel | 5 | 25 | 25 | 42 | 150 |
| Black | 10 | (제련 없음) | (제작 없음) | (제작 없음) | — |
| Mithril | 20 | 40 | 40 | 57 | 250 |
| Adamant | 30 | 55 | 55 | 72 | 300 |
| Rune | 40 | 70 | 70 | 87 | 375 |
| Dragon | 60 | 85 | 85 | 99 | 500 |

`[데이터]`. 티어당 14~15 종(Dagger · Sword · Scimitar · Battleaxe · 2H Sword · Helmet · Boots · Gloves · Shield · Platelegs · Platebody + 원거리 Throwing Knife · Crossbow · Javelin). 읽히는 것 —

1. **제작 레벨이 착용 레벨보다 훨씬 높다** — Platebody 기준 Iron 은 착용 1 · 제작 27(27배), Rune 은 착용 40 · 제작 87(2.2배), Dragon 은 착용 60 · 제작 99(1.65배). 착용 계단은 **1 · 1 · 5 · 10 · 20 · 30 · 40 · 60**(5~10 간격 → 마지막 +20), 제작 계단은 **바 1 · 10 · 25 · 40 · 55 · 70 · 85**(Iron 부터 **정확히 +15 씩**, Bronze → Iron 만 +9)
2. **한 티어 안의 제작 순서**(Iron 기준, 티어 첫 레벨 +N) — Dagger +0 → Throwing Knife +1 → Sword +2 → Gloves +4 → Scimitar +5 → Helmet +6 → Battleaxe +7 → Boots +9 → Shield +11 → 2H Sword +13 → Platelegs +15 → Platebody +17(Bronze Sword 만 +3). **티어 사이가 15, 티어 안이 17** — 다음 티어의 Dagger 는 이번 티어 Platelegs 와 **같은 레벨**, Platebody 보다 **2레벨 먼저** 열린다(겹침). Dragon 티어는 상한 99 에 막혀 Platelegs · Platebody 가 둘 다 99
3. **Black 티어는 Smithing 레시피가 없다**(획득 경로 미확인 `[추정]`) — 착용 10 으로 Steel(5)과 Mithril(20) 사이를 메운다
4. 착용 요구는 **대부분 전투 능력치 하나**다(근접 Attack/Defence · 원거리 Ranged · 마법 Magic). 예외 — 슬레이어 방어구(전투 능력치 + **Slayer 레벨** 둘) · Ice/Miolite 방어구(Defence + Ranged/Magic) · 스킬케이프(그 스킬 99) · Cape of Completion(완료율 100%). 착용 요구가 있는 **532 아이템** 중 요구가 둘 이상인 것은 소수다(Defence + Slayer 7 · Magic + Slayer 6 · Ranged + Slayer 6 · Defence + Ranged 5 · Defence + Magic 5 등)

### 5-2. 원거리 · 마법 — 같은 구조, 다른 스킬

| 계열 | 티어(착용 요구 → 제작 스킬 레벨) |
|---|---|
| 가죽 방어구(Ranged) | Leather 1 (Crafting 9~18) → Hard Leather 10 (33~50) → Green D'hide 40 (60~63) → Blue 50 (68~71) → Red 60 (75~77) → Black 70 (82~84) → Ancient 80 (본편에 Crafting 레시피 없음) |
| 활(Ranged, 롱보우) | Normal 1 (Fletching 10) → Oak 5 (25) → Willow 20 (40) → Maple 30 (55) → Yew 40 (70) → Magic 50 (85) → Redwood 60 (95) |
| 마법 로브(Magic) | Green Wizard 1 → Blue 10 → Red 30 → Black 50 (본편에 Runecrafting 레시피가 없다 — 다른 경로) |
| 지팡이(Magic) | Mystic 4원소 40 · Nature's Wrath 65 · Cloudburst 85 |

**같은 그림이다.** 착용 계단은 10~20 간격이고 제작 스킬 요구는 그보다 훨씬 위에 있다(Yew 롱보우 착용 Ranged 40 ↔ Fletching 70).

### 5-3. 도구 업그레이드 (`shopUpgradeChains` · `shopPurchases`)

체인 3종 — 도끼(Woodcutting) · 곡괭이(Mining) · 낚싯대(Fishing). 기본은 Bronze(무료 · 효과 없음). 체인 정의(`shopUpgradeChains`)는 최상위 도구(`rootUpgradeID` = Dragon)만 가리키고, 단계를 사려면 **① 그 스킬 레벨(`purchaseRequirements`) ② 직전 도구 보유(`unlockRequirements`) ③ 골드** 셋이 필요하다.

| 단 | 도끼 (WC 레벨 · 가격) | 낚싯대 (Fishing 레벨 · 가격) | 곡괭이 (Mining 레벨 · 가격) |
|---|---|---|---|
| Iron | 없음 · 50 | 없음 · 100 | 없음 · 250 |
| Steel | 10 · 750 | 10 · 1,000 | 10 · 2,000 |
| Black | 20 · 2,500 | 20 · 5,000 | 20 · 10,000 |
| Mithril | 35 · 10,000 | 35 · 20,000 | 35 · 50,000 |
| Adamant | 50 · 50,000 | 50 · 75,000 | 50 · 200,000 |
| Rune | 60 · 200,000 | 60 · 300,000 | 60 · 1,000,000 |
| Dragon | 80 · 2,000,000 | 80 · 2,000,000 | 80 · 5,000,000 |
| 누적 | **2,263,300 GP** | **2,401,100 GP** | **6,262,250 GP** |
| 효과 합 | 간격 −35~40% | 간격 −40% | 간격 −50% + 광석 2배 확률 +7% |

`[데이터]` `[데이터/계산]`(누적). 효과 = 단마다 간격 **−5%**(도끼 · 낚싯대는 Dragon 단이 **−10%**, 곡괭이는 Adamant 이상이 −10%), 곡괭이는 추가로 단마다 「광석 2배」 +1%. 읽히는 것 —

- **요구 레벨 계단이 6 단 공통이다: 10 · 20 · 35 · 50 · 60 · 80** — 도구 3종이 같은 레벨에서 같이 열린다. 나무 · 물고기 · 바위가 열리는 레벨(예: Woodcutting 10 Oak · 35 Teak · 60 Yew)과는 **일부만 겹친다**
- **가격은 단마다 대체로 3~5배씩** 오르고 첫 단은 8~15배(도끼 50 → 750), 마지막 Dragon 단은 도끼 · 낚싯대가 그 앞 Rune 의 **10배**(200,000 → 2,000,000). 누적 가격의 대부분이 마지막 한 단이다(도끼 88% · 곡괭이 80%)
- **데이터 내부 불일치 1건**: Dragon Axe 는 효과 값 `−10` 인데 설명문이 「−5%, 합 −35%」로 적혀 있다(Rune 합 −30% 에서 −10 이면 −40%). 낚싯대 Dragon(−10 / 합 −40%)과 곡괭이는 값과 설명이 맞는다. 옛 설명이 남았을 가능성 `[추정]`
- 확장팩(TotH)은 이 체인 위에 **Corundum · Augite · Meteorite · Divine** 4단을 더한다 — 레벨 100 · 108 · 112 · 115, **골드 5천만 · 1억 · 1.5억 · 2억 + 바 1,000 · 1,500 · 2,000 · 2,500개**. 효과는 간격 단축이 아니라 아이템 2배 · 추가 산출

---

## 6. 게이트의 종류

무엇이 무엇을 막는가. 데이터의 요구 조건 `type` 값을 전수로 세어 묶었다(본편 Demo + Full). **어떤 요구인지는 `type` 하나로 정해진다.**

| 게이트 종류 | 데이터 `type` / 필드 | 개수 | 막는 대상 | 실제 예시 |
|---|---|---:|---|---|
| **① 스킬 레벨(같은 스킬)** | 행동의 `level` | 스킬 행동 전부 | 나무 · 광석 · 물고기 · 레시피 · 작물 · NPC 등 | Yew 나무 = Woodcutting 60 · Rune Platebody 제작 = Smithing 87 · King 도둑질 = Thieving 95 |
| **② 스킬 레벨(다른 스킬)** | `SkillLevel` + 다른 `skillID` | 장애물 요구 75건 · 장비 착용 요구 583건 · 상점 134건 | 장애물 · 장비 · 상점 | Ice Jump = Cooking · Mining · Slayer · Thieving 각 60 · Rune Platebody 착용 = Defence 40 · Auto Equip Food(상점) = Cooking 80 |
| **③ 골드(화폐)** | `cost.currencies` (GP 157 · Slayer Coin 28 · Raid Coin 14 — 상점 물품 수) | 상점 · 밭 | 상점 물품 · 밭 · 도구 | Dragon Pickaxe 5,000,000 GP · Tree Plot 4 = 400,000 GP · Auto Eat Tier I = 1,000,000 GP |
| **④ 아이템 소모(상점 비용)** | `cost.items` | 상점 20 | 조리 시설 · 일부 상점 물품 | Yew Cooking Fire = Yew Logs 500 + 300,000 GP · Strong Furnace = Oak Logs 1,000 + Steel Bar 1,000 · Weird Gloop = Compost 2 + Rune Essence 10 (확장팩 도구는 §5-3) |
| **⑤ 아이템 보유 조건** | `SlayerItem`(구역 진입) · `requiredItems`(요새 강도) | 5 · 요새 8 | 구역 · 요새 강도 | Strange Cave = Mirror Shield 보유 · Superior 요새 = Augmented 판 아이템 3종 보유 |
| **⑥ 던전 클리어** | `DungeonCompletion` (count) | 구역 진입 5+1+4 · 상점 7 | 던전 · 슬레이어 구역 · 요새 · 상점 | Air God Dungeon = Volcanic Cave 1회 · Stronghold of Dragons = Infernal Stronghold **100회** · Dark Waters = Into the Mist 1회 |
| **⑦ 슬레이어 레벨** | `SkillLevel` + `Slayer` | 슬레이어 구역 13 · 던전 3 · 요새 4 | 던전 · 슬레이어 구역 · 요새 · 임무 등급 | Infernal Stronghold = Slayer 75 · Perilous Peaks = Slayer 85 · Master 임무 = Slayer 85 |
| **⑧ 이전 구매 · 이전 단(사슬)** | `ShopPurchase` (unlockRequirements) | 32 | 도구 · Auto Eat · 스킬 업그레이드 | Steel Axe = Iron Axe 보유 · Auto Eat Tier II = Tier I 보유 |
| **⑨ 슬레이어 임무 완료 수** | `SlayerTask` (category, count) | 9 | 슬레이어 방어구 상점 | Slayer Helmet (Basic) = Normal 임무 15회 |
| **⑩ Township 진행** | `TownshipBuilding` · `TownshipTask` (count) | 12 · 45 | 펫 · 도구 · 의상 | Woodcutter's Hat = Township 과제 20개 · Woodcutter's Body = 40개 |
| **⑪ 전체 진행도** | `AllSkillLevels` · `Completion` | 각 1 | 망토 | Max Skillcape = 전 스킬 99 · Cape of Completion = 완료율 100% |
| **⑫ 이전 등급 임무 완료(등급 사슬)** | `previousCategory` | 4 | 슬레이어 임무 등급 | Hard 임무 = Normal 이상 임무 N회 완료 후 |

**읽히는 것.**
- **스킬 레벨 게이트가 가장 흔하다.** 상점 물품의 요구를 세면 **스킬 레벨 134 · Township 과제 45 · 이전 구매 32 · 던전 클리어 7 · 임무 완료 9 · Township 건물 12**이고, 비용은 **골드 157 · Slayer Coin 28 · Raid Coin 14 · 아이템 20**이다
- **레벨(①)과 골드(③)와 이전 단(⑧)이 한 물건에 함께 붙는 것**이 도구 · 밭이다 — 「레벨은 되는데 골드가 없다」 「골드는 있는데 직전 도구가 없다」가 각각 발생한다. 아이템 소모(④)는 **조리 시설**(Cooking Fire · Furnace · Pot)에 몰려 있다
- **요새는 슬레이어 레벨에 더해 「던전 반복 횟수」가 붙는다** — Undead 25회 · Magic 50회 · Dragons 100회 · Gods 5회. 진입 조건 중 횟수가 가장 큰 값은 **100**이다(Infernal 해금의 Volcanic Cave 100회도 같다)
- **구역 · 던전 진입에 겹치는 조건은 최대 2종**이다(슬레이어 레벨 + 아이템/던전/상점). 서로 다른 종류가 셋 이상 겹치는 곳은 없다. 다만 Agility 장애물은 **서로 다른 스킬 레벨 5개**가 한꺼번에 붙기도 한다(Lava Waterfall Dodge = Firemaking 95 · Ranged 95 · Magic 95 · Slayer 90 · Prayer 80)
- 같은 아이템의 **착용 요구와 제작 요구는 스킬이 다르다** — 무기는 착용 = Attack, 제작 = Smithing(5-1)

---

## 7. 튜토리얼 22단계

**순서**: Demo 의 `tutorialStageOrder` 가 `0 → 1 → … → 7 → 20 → 21`, Full 이 `7` 뒤(`afterID: melvorD:7`)에 `8 ~ 19` 를 끼워 넣는다. 실제 순서는 **0~7 → 8~19 → 20 → 21**(22단계). 단계마다 `tasks`(이벤트 종류 + 횟수) · `rewards` · `skillUnlocks` · `allowCombat` · `allowedShopPurchases` · `allowedMonsters` `[데이터]`.

| # | 이름 | 과제 | 보상 | 이 단계에서 해금되는 스킬 |
|---:|---|---|---|---|
| 0 | Survival Task 1 | Normal Tree **3번** 베기 | 10 GP | Woodcutting |
| 1 | Survival Task 2 | Normal Logs **3번** 태우기 | 10 GP | Firemaking |
| 2 | Survival Task 3 | Raw Shrimp **3마리** 낚기 | 15 GP | Fishing |
| 3 | Survival Task 4 | Shrimp **3개** 요리 | 15 GP | Cooking |
| 4 | Combat Task 1 | Copper Ore 3 + Tin Ore 3 캐기 | 20 GP | Mining |
| 5 | Combat Task 2 | Bronze Bar 3 + Bronze Dagger 1 제련 | 20 GP | Smithing |
| 6 | Combat Task 3 | Bronze Dagger 장착 + Shrimp 3 음식칸 장착 | 20 GP | Attack · Strength · Defence · Hitpoints (**전투 허용 시작**) |
| 7 | Combat Task 4 | **Plant 2마리** 처치 | 2,500 GP | — |
| 8 | Ranged Preparation 1 | Copper 2 + Tin 2 캐기 | 25 GP | — |
| 9 | Ranged Preparation 2 | Bronze Bar 2 + Bronze Arrowtips 30 | 250 GP | — |
| 10 | Ranged Preparation 3 | 상점에서 Feathers 30 구매 | 25 GP | — |
| 11 | Ranged Preparation 4 | Arrow Shafts 30 → Headless Arrows 30 → Bronze Arrows 30 | Normal Logs 5 + 25 GP | Fletching |
| 12 | Ranged Preparation 5 | Bowstring 1 구매 | 30 GP | — |
| 13 | Ranged Preparation 6 | Normal Shortbow (u) → Normal Shortbow 제작 | 30 GP | — |
| 14 | Ranged Preparation 7 | Shortbow 장착 + Bronze Arrows 30 장착 | 30 GP | Ranged |
| 15 | Ranged Preparation 8 | **Chicken 2마리를 Ranged 로** 처치 | 40 GP | — |
| 16 | Magic Preparation 1 | Rune Essence 10 캐기 | 40 GP | — |
| 17 | Magic Preparation 2 | Air Rune 5 + Mind Rune 5 제작 | Magic Wand (Basic) + 40 GP | Runecrafting |
| 18 | Magic Preparation 3 | Magic Wand (Basic) 장착 | Air Rune 80 + Mind Rune 80 + 50 GP | Magic |
| 19 | Magic Preparation 4 | **Golbin 1마리를 마법으로** 처치 | 2,500 GP | — |
| 20 | Wannabe Farmer 1 | 상점에서 Compost 5 구매 | Potato Seed 3 + 2,750 GP | — |
| 21 | Wannabe Farmer 2 | Potato Seed 3 심기 | 150 GP | Farming |

- **5 묶음**: 채집 · 요리(0~3, 이름 「Survival Task」) → 광석 · 제련 · 장착 · 첫 전투(4~7, 「Combat Task」) → 원거리(8~15) → 마법(16~19) → 농사(20~21). 스킬은 **12개 단계에 걸쳐 15종**이 열린다(Woodcutting · Firemaking · Fishing · Cooking · Mining · Smithing · 전투 4종 · Fletching · Ranged · Runecrafting · Magic · Farming) — 대부분 한 번에 한 스킬, 단계 6 만 전투 4종을 한꺼번에
- **단계 하나 = 과제 1~3개**이고 횟수는 **작은 값**이다(1 · 2 · 3 · 5 · 10 · 30 — 가장 큰 것은 화살 · 화살촉 30개). 설명문(`description`)이 그 스킬의 **용도**를 한두 문장으로 알려 준다(예: 「Firemaking provides bonuses to other Skills in the game at later stages of the game.」 · 「Mining provides the resources required for most Melee Weapons and Armour.」)
- 단계마다 과제 **이벤트 종류**가 다르다 — 행동 완료(`WoodcuttingAction` 등) · 아이템 장착(`ItemEquipped`) · 음식 장착(`FoodEquipped`) · 몬스터 처치(`MonsterKilled`) · 상점 구매(`ShopPurchaseMade`)
- **보상은 두 종류로 갈린다**: 평소 10~50 GP(작은 값) · **첫 전투 · 첫 마법 성공 시 2,500 GP**(Plant · Golbin 처치), Farming 시작에는 2,750 GP. 총 골드 약 **8,600 GP + 아이템 소량**
- **허용 범위 제한**: `allowCombat` 는 단계 6 부터 참. `allowedMonsters` 는 그 단계 과제 몬스터(Plant · Chicken · Golbin)만, `allowedShopPurchases` 는 과제에 필요한 것(Feathers · Bowstring · Compost)만 열려 있다 — 튜토리얼 동안 **다른 길로 새지 못하게** 잠근다 `[해석]`
- `skillUnlocks` 가 실제로 스킬 메뉴를 잠그는지는 데이터만으로 확인하지 못했다 `[추정: 튜토리얼 진행으로 스킬이 열림]`. 별도 방식도 있다 — Adventure 모드는 `allowSkillUnlock: true` · `startingSkills` = 전투 4종(Attack · Strength · Defence · Hitpoints)만 열어 두고 나머지를 **골드로 산다**(`skillUnlockCost`) `[데이터]`

---

## 8. 콘텐츠 양 (본편 = Demo + Full)

| 항목 | 본편 | 비고 |
|---|---:|---|
| 스킬 | **25** (전투 8 + 비전투 17) | 29종 중 확장 4 = Cartography · Archaeology(AoD) · Harvesting · Corruption(ItA) — [01 §1](01_skills.md) |
| 채집 스킬의 행동 수 | Woodcutting 9 · Fishing 23 · Mining 11 · Farming 24(작물) + 25(밭) | 합 67(밭 제외) |
| 만드는 스킬의 행동 수 | Firemaking 9 · Cooking 32 · Smithing 115 · Crafting 57 · Fletching 57 · Runecrafting 84 · Herblore 30 | 합 **384** |
| 지원 스킬의 행동 수 | Thieving 23 · Agility 51(+기둥 3) · Summoning 20(+시너지 90) · Astrology 11 · Alt Magic 14 · Township 건물 54 · 과제 110 | |
| 행동 총합(비전투) | 약 **570** | 채집 67(밭 25칸 제외) + 만드는 384 + 지원 119(Thieving · Agility · Summoning · Astrology · Alt Magic. Township 건물 54 제외) |
| 전투 구역 | 12 | 입장 조건 없음 |
| 슬레이어 구역 | 13 | |
| 던전 | 17 | |
| 요새 | 4 | |
| **구역 합** | **46** | |
| 몬스터 | **172** (Demo 66 + Full 106) + Into the Mist 전용 목록 50 | 슬레이어 임무 대상 `canSlayer` 99(Demo 42 + Full 57), 보스 27 |
| 아이템 | **1,406** (Demo 671 + Full 735) | 물약 120 · 방어구 186+ · 무기 70 · 상자 49 · 음식 48 등 |
| 상점 물품 | 201 (Demo 82 + Full 119) | 골빈 레이드 상점 포함 |
| 펫 | 62 | |
| 기도 31 · 공격 마법 29 · 저주 14 · 오로라 12 | | |
| 아이템 업그레이드(`itemUpgrades`) | 183 | |
| 튜토리얼 | 22단계 | §7 |
| Steam 업적 | 92 | |

`[데이터]` — 행동은 각 스킬 `skillData` 의 배열 길이, 몬스터 · 아이템 등은 `data.<key>` 배열 길이. Melvor 는 **아이템이 매우 많고(1,406) 구역이 비교적 적은(46) 구조**다 — 몬스터 172 ÷ 구역 46 = 단순 평균 3.7종(던전 · 요새는 같은 몬스터가 반복 등장하고 구역끼리 몬스터를 공유하므로 참고값).

---

## 9. 확장팩이 더한 것

**본편 범위 밖이라 짧게.** 각 확장이 더한 양(개수만) `[데이터]`.

| 확장 | 몬스터 | 구역 | 스킬 | 아이템 | 특징 |
|---|---:|---|---|---:|---|
| Throne of the Herald (TotH) | 58 | 슬레이어 구역 8 · 던전 7 | 기존 스킬에 행동 추가(Woodcutting 나무 +9 · Smithing +57 등) | 602 | 레벨 100~120 구간 콘텐츠 · 상위 도구 4단 |
| Atlas of Discovery (AoD) | 46 | 전투 구역 8 · 슬레이어 3 · 던전 5 | **Archaeology · Cartography** 신규 | 699 | Ancient Relic 모드 · 기존 스킬에 소량 추가 |
| Into the Abyss (ItA) | 101 | 전투 구역 12 · 슬레이어 14 · 던전 2 · 요새 4 · 심연 층(`abyssDepths`) 9 | **Harvesting · Corruption** 신규 | 1,041 | 「Abyssal 레벨」이라는 **별도 레벨 축**(만렙 60) |

### 9-1. `skillLevelCapIncreases` — 레벨 상한 올리는 법

**이 키는 「Ancient Relic 모드」 계열 게임 모드에서만 쓰인다.** 그 모드는 `defaultInitialLevelCap: 10`(모든 스킬 레벨 상한이 **10 에서 시작**)이고, 던전 클리어 하나하나가 상한을 올린다. 데이터에서 이 키를 참조하는 곳은 `gamemodes[].levelCapIncreases`(AoD 의 Ancient Relic 계열 모드 3종)뿐이고 Standard · Hardcore · Adventure 모드 정의에는 없다. 본편의 99 · TotH 의 120 을 정하는 필드는 받은 JSON 5개에서 **찾지 못했다** `[추정: 코드 안 상수]`.

| 묶음(`id`) | 출처 | 트리거 | 효과 |
|---|---|---|---|
| `Pre99Dungeons` | AoD | 던전 21곳 각각 **1회 클리어** | 전투 스킬 6종 **+5**(상한 99) · 무작위 스킬 **5개**를 **+15**(일부 +20, 상한 99 / 120) |
| `ImpendingDarknessSet100` | AoD | Impending Darkness 클리어 | 전 스킬 상한을 **100 으로** 맞춤(`setIncreases`) |
| `Post99Dungeons` | TotH | TotH 던전 6곳 각각 1회 클리어 | 전투 스킬 7종 **+3**(상한 120) · 무작위 스킬 **6개**를 **+8**(상한 120) |
| `ThroneOfTheHeraldSet120` | TotH | Throne of the Herald 클리어 | 전 스킬 **120 으로** 맞춤 |
| `TheAbyss` | ItA | 심연 층 7 개 클리어 | Abyssal 레벨 — 전투 **+10**(상한 60) · 무작위 8개 **+15**(상한 60) |
| `FinalDepthSetAbyssal60` | ItA | 마지막 층 | 전 스킬 Abyssal 60 |

(각 묶음에 `…CombatOnly` 짝이 있다 — 「전투 스킬만」 모드용.) 요약하면 **상한이 던전 진행에 묶여 「전투 진행 = 레벨 상한」이 된다** — 전투 스킬은 고정 증가, 비전투 스킬은 무작위 증가이고 마지막 던전이 「전부 채우는」 보정을 한다.

---

## 10. 출처 · 확인 못 한 것

**출처**
- 게임 원본 JSON — `melvorDemo.json` · `melvorFull.json` · `melvorTotH.json` · `melvorExpansion2.json` · `melvorItA.json` (`data` · `modifications`)
- 위키(프록시) — `wiki.melvoridle.com/w/Experience` · `/Mastery` · `/Mining` · `/Thieving` · `/Herblore` · `/Smithing` · `/Crafting` · `/Fletching` · `/Runecrafting` (`r.jina.ai` 경유 · 9건 · 전부 성공)
- 재인용 — [01_skills.md](01_skills.md)(Summoning 5초 · Astrology 3초) · [04_construction_unlocks.md §7](04_construction_unlocks.md)(던전 최고 몬스터 레벨 대조)

**출처 비중(대략)** — `[데이터]` · `[데이터/계산]` 약 90% · `[위키/jina]` 약 8%(경험치 공식 대조 · 기본 행동 시간 · 마스터리 산문) · `[해석]`/`[추정]` 약 2%

**확인 못 한 것 · 어긋난 것**
1. **기본 행동 시간 중 데이터에 없는 것**(Mining · Smithing · Crafting · Fletching · Runecrafting · Herblore · Thieving 는 위키값, Summoning · Astrology 는 01 재인용). 게임 코드에서 직접 확인하지 못했다
2. **마스터리 XP 공식의 수식 그림이 위키에서 빠져 있다.** 산문에서 복원한 식이며 계수를 코드로 대조하지 못했다
3. **Mining 바위 HP 의 기본값 · 공식** — 위키의 수식 부분이 비어 있다(레벨당 +1 만 확인). §3 의 Mining 시간은 **대기 없음** 가정이라 실제보다 짧다
4. **Fishing 인터벌 분포** — `baseMinInterval ~ baseMaxInterval` 사이의 무작위인 것만 확인했고 균등 분포인지는 미확인(평균 = 중간값으로 계산)
5. **`entryRequirements` vs `unlockRequirement` 의 정확한 의미 차이**(§4-2) — 데이터에 설명 없음. `difficulty` 배열 값의 의미도 미확인(§4-1)
6. **도구 체인의 Dragon Axe 설명문 불일치**(§5-3) — 값과 설명문이 다르다. 어느 쪽이 화면 표시인지 미확인
7. **Agility 슬롯 수** — 데이터의 `category` 는 0~9(10 종류)인데 [04 §1](04_construction_unlocks.md) 은 12 슬롯으로 적었다. 기둥 3 종이 추가 슬롯인지 대조하지 못했다
8. **`skillLevelCapIncreases` 가 Standard 모드에서 어떻게 쓰이는가** — 데이터상 Ancient Relic 계열에서만 참조된다. Standard 의 99 → 120 을 정하는 필드는 못 찾았다(§9-1)
9. **Black 티어 장비의 획득 경로** — Smithing 레시피가 없다는 것만 확인
10. **튜토리얼 `skillUnlocks` 의 실제 효과**(스킬 메뉴 잠금 여부) — 데이터만으로 확인 못 함
11. **전투 구역의 개별 몬스터 드롭 · 보상 표** — 이 문서 범위 밖(구역 단위 구조만)
12. **Agility 의 99까지 시간 · Township · Alt Magic** — §3 에서 제외했다(코스 건설비 · 슬롯 종속 / 레벨 곡선이 다르거나 없음)
13. **§3 의 실제 플레이 시간** — 재료 수급 · 마스터리 · 장비 보너스를 넣지 않았다. 「스킬 하나를 99까지」의 체감 시간은 이 표보다 **크게 짧거나 길 수 있다**(장인형은 재료 시간이 빠져 짧고, 채집형은 보너스가 빠져 길다)

---
*마지막 업데이트: 2026-09-30*
