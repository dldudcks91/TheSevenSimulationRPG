# Guild Master - Idle Dungeons — 아이템 구조·획득 경로 조사

> 상위 문서: [00_overview.md](00_overview.md)
> 짝 문서: [01_skills.md](01_skills.md)
> 상태: **1차 조사 완료** (2026-08-31) — 공식 위키(wiki.gg)가 **28페이지짜리 스텁 위키**라 확보량에 한계가 있다. 확보한 것은 **무기 2군(검 15종·지팡이 13종) 전수 제작표**와 **몬스터 61종의 드롭 목록 전문**, **펫 체계 전문**이고, 못 뚫은 것은 **장비 슬롯 구성·드롭 확률 수치**다. §9 참조
> 목적: 본작 item_design.md §1 드롭 파이프라인과 GAME_DESIGN.md §10 미확정 과제(타겟 파밍 축 · 크래프트 가드 · 몬스터별 재료 · 매직찬스 · 자동 분해)를 **"굴림이 0단계인 파밍 RPG"** 와 대조한다
> ⚠ **이 문서의 수치는 전부 이 게임의 수치다.** 본작 SSOT 가 아니며 `src/data/*.csv` 로 옮기지 말 것

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 |
| 1 | 장비 슬롯 — 위키가 답하지 않는 것 |
| 2 | 희귀도 — 발견되지 않았다 |
| 3 | 드롭 규칙 — 몬스터가 재료를 준다 |
| 4 | 제작 — 이 게임의 아이템 파이프라인 전부 |
| 5 | 접사·옵션 — 없다. 굴림은 다른 데 있다 |
| 6 | 펫 — 이 게임에서 굴림이 실제로 사는 자리 |
| 7 | 창고·판매 — 「정리」의 자리 |
| 8 | 본작 대조 시사점 |
| 9 | 출처 · 미확인(N/F) 총괄 |

---

## 0. 조사 방법과 신뢰도

출처 표기는 기존 참고작 문서와 동일하다 — `[위키]`(공식 wiki.gg) · `[스토어]`(Google Play 개발사 원문) · `[나무위키]` · `[커뮤니티]` · `[미확인]`.

이번 조사의 특징은 **출처가 극도로 얇다**는 것이다. 확인한 사실:

- **공식 위키는 전체 28 페이지**다[위키 `Special:AllPages`]. 이 중 아이템 관련은 `Equipment`·`Items`·`Drops`·`Swords`·`Staffs`·`Pets`·`Enemies` 7개뿐이고, 그중 **`Equipment` 는 "WIP" 한 줄짜리 빈 페이지**(최종 수정 2025-02-08)다[위키].
- `Items` 페이지의 **원문 전체**가 이것뿐이다[위키 raw]: `'''Equipment''' / [[Swords]] / [[Staffs]] / Bows / Daggers / [[Drops]]` — Bows·Daggers 는 **링크조차 아니고 평문**이다. 즉 **방어구·악세서리 카테고리가 위키에 존재하지 않는다.**
- `Special:Categories` 에도 장비 카테고리가 없다 — 실제로 채워진 카테고리는 `Monster`(54) · `Monsters`(12) · `D1 monsters`(7) · `Eggs`(7) · `Adventurers`(5) 뿐이고 **나머지는 전부 미디어위키 시스템 카테고리**다[위키].
- `Example character` 페이지는 게임과 무관한 **위키 템플릿 예제**(region: Shurima, type: Dragon — League of Legends 예시)라 자료 가치가 0 이다[위키]. 이 페이지에서 장비 슬롯을 읽으려던 시도는 무효.
- **incrementaldb.com 은 게임 페이지·리뷰 모두 403**이라 뚫지 못했다.
- **Reddit·Discord 공개 인덱스에서 이 게임의 장비 가이드가 검색되지 않는다** — 여러 각도로 검색했으나 전부 동명이곡(Guild Wars 2, Idle Champions, Melvor Idle 등)으로 흩어졌다.

그래서 이 문서는 **"위키가 안 적은 것"과 "게임에 없는 것"을 엄격히 구분**한다. 전자는 `[미확인]`, 후자는 근거를 대고 단정한다. 단정할 수 있는 항목은 **원문 위키텍스트(`action=raw`)를 직접 열어 필드 구조를 확인한 것**뿐이다 — §2 가 그 사례다.

**게임 버전**: 2.148 (2026-08-21 갱신)[스토어 apkpure]. 개발사 Paranoid Squirrels, Android 전용, 무료 + 인앱결제[스토어].

---

## 1. 장비 슬롯 — 위키가 답하지 않는 것

### 1-1. 확인된 것 — 무기 슬롯은 직업이 정한다

**무기군 4종**이 존재한다 — Swords · Staffs · Bows · Daggers[위키 `Items`]. 그리고 무기군은 **직업에 귀속**된다:

- "Swords are the Mainweapon for the Footman and his later Class Evolutions."[위키 `Swords`]
- "Staffs are the Mainweapon for the Apprentice and his later Class Evolutions."[위키 `Staffs`]
- Cane(기본 지팡이)은 "Default Weapon for every Class which can carry Staffs"[위키 raw `Staffs`]

나무위키가 확인해 주는 기본 직업 4종(보병·견습생·궁수·도적)[나무위키]과 무기군 4종이 정확히 1:1 대응한다 — **Footman↔Sword, Apprentice↔Staff, Archer↔Bow, Rogue↔Dagger**. (직업 상세는 [01_skills.md](01_skills.md) 담당)

### 1-2. 미확인 — 방어구 슬롯 구성

**위키에 방어구 페이지가 하나도 없다**(§0). 그런데 **방어구·악세서리가 게임에 존재한다는 증거는 명확하다** — 몬스터 드롭 목록과 나무위키에 착용물 이름이 나온다:

| 슬롯으로 추정되는 것 | 실물 아이템 근거 |
|---|---|
| 방패 | **Corrupted Shield**(Imperial Guard, D4)[위키] · "Martyr's Shield"[나무위키] |
| 벨트 | **Warden Belt**(City Warden, D4)[위키] |
| 반지 | **Silver Ring**(Insane Citizen, D4)[위키] |
| 머리 | **Mitre hat**(Insane Priest, D4)[위키] · "보석 왕관"·Slime King's Crown(Slime King, R1)[위키·나무위키] |
| 몸통 | **Robe of the Lich**(Ka'Bar, R3)[위키] · "프리즘 갑옷"·"Champion Armor"·"Sage Series armor"[나무위키] |
| 악세서리 | **Skeleton Key**(Emperor Clovis XXVIII, R4) · **Seeking Glass**(Slime King, R1) · **Eyes of the Swordsman**(Sha'kire, R2) · **Divine Zygote**(Sha, R2) · **Crusader Insignia**(Crusader, R5) · **Voodoo Doll**(Pale Hermit, D7) · **Flute**(Insane Merchant, D4) · **Sylvan Flute**(Dryad, D8)[위키] |

> ⚠ **위 표는 "이런 이름의 착용물이 존재한다"까지만 확인된 것이고, 슬롯이 몇 개인지·이름이 무엇인지는 [미확인]이다.** 아이템 이름에서 슬롯을 역산한 추정이므로 표를 사실로 인용하면 안 된다. (DV2 조사의 "상태이상 방지 악세서리 6종으로 상태이상 하한 역산" 방법론과 같은 성격 — 하한만 알려주고 전수는 못 준다)

스토어 원문이 슬롯 다양성을 간접 시사한다 — "your most powerful team, **equipped with status immunity items**, fights the fearsome Trolls in the Frostbite Peaks"[스토어]. 실제로 Crystal Staff 가 "25% status immunity"[위키 `Staffs`], 나무위키가 "Holy Conjugate — 상태이상 100% 면역 악세서리(에픽 레이드)"[나무위키]를 적는다 — **던전별로 장비를 갈아 끼우게 만드는 축이 상태이상 면역**이라는 것은 두 출처가 일치한다.

---

## 2. 희귀도 — 발견되지 않았다

**이 게임에서 희귀도(rarity) 체계의 근거를 어느 출처에서도 찾지 못했다.** 그냥 "안 나왔다"가 아니라, **원문 위키텍스트의 필드 구조를 직접 확인**한 결과다:

- `Swords`·`Staffs` 의 raw 위키텍스트에 **rarity·tier·grade·level 필드가 단 하나도 없다**[위키 raw]. 항목 구조는 이것뿐이다:
  ```
  '''Iron Sword'''
  * Con+3
  * Dex+1
  Crafted from 3x Wood and 2x Copper Ingots.
  * Sells for 20 copper coins
  ```
- 아이템은 **등급 라벨 없이 개별 이름으로 나열**되며, 세기의 차이는 순전히 **스탯 수치의 크기**로만 표현된다 — Cane(Int+1) → Obsidian Scepter(Int+28).
- `Enemies` 의 raw 도 마찬가지다. 템플릿은 `{{EnemyStats|hp=|atk=|type=|def=|mdef=|con=|dex=|int=|mana=}}` 뿐이고 **희귀도 관련 파라미터가 없다**[위키 raw].
- 레이드 보상에 **"Guaranteed powerful, non-sellable loot"**[위키 `Dungeons & Raids`]라는 표현이 있는데, 이것이 등급 라벨인지 단순 서술인지는 [미확인]. 다만 **"판매 불가"가 아이템에 박히는 플래그**라는 것은 확인된다(§7).

> **결론 — 이 게임은 Dungeon Village 2 와 같은 진영이다: 「등급 없는 연속 곡선」.** 색·등급 라벨 없이 이름 붙은 아이템들이 스탯 수치 하나로 사다리를 이룬다. 본작의 희귀도 4단(통제 가능성의 계단)과는 정반대 극단이고, [dungeonvillage2/02_items.md §8-1](../dungeonvillage2/02_items.md) 의 대조군이 하나 더 늘어난 셈이다.
>
> ⚠ 단, 위키가 스텁이므로 **"게임에 희귀도가 없다"를 100% 확정할 수는 없다.** 근거의 강도는 "아이템 데이터를 실제로 적어 둔 두 페이지의 raw 필드에 등급 칸이 아예 없다"까지다.

---

## 3. 드롭 규칙 — 몬스터가 재료를 준다

### 3-1. 무엇이 드롭을 정하는가 — 몬스터다. 던전도 레벨도 아니다

드롭은 **몬스터 개체 이름 단위로 고정된 목록**이다[위키 `Enemies`]. 던전은 "어떤 몬스터가 나오는가"를 정할 뿐이고, **레벨은 드롭에 관여하지 않는다**(레벨 기반 드롭 규칙의 근거를 못 찾았다 — [미확인]이 아니라 "구조상 자리가 없다": 아이템에 요구 레벨도 ilvl 도 없다, §2).

D1 전수 예시[위키]:

| 몬스터 | Spawn Rare | 드롭 |
|---|---|---|
| Wolf | 36% | Beast Pelt, Alpha Wolf Fang, Werewolf Fang, Wild Egg |
| Boar | 25% | Boar Tusk, Beast Pelt, Meat Chop, Wild Egg |
| Treant | 22% | Wood, Plant Fiber, Living Sap, Tomato, Wooden Egg |
| Centaur | 13% | Plant Fiber, Copper Ore, Cheese |
| Ent | 2% | Wood, Ancient Seed, Apple, Wooden Egg |
| Golden Rabbit | 1% | Cottontail Fur, Meat Chop, Wild Egg |
| Forest Spirit | 1% | Primordial Essence |

**「Spawn Rare」는 드롭률이 아니라 그 던전에서 그 몬스터가 나올 확률이다.** 위키는 이 필드의 뜻을 설명하지 않지만[위키], **D1 의 7개 값이 정확히 100% 로 합산된다**(36+25+22+13+2+1+1) — 스폰 분포로 읽는 것 외에 다른 해석이 성립하지 않는다. (D2 이후 던전에는 이 값이 안 적혀 있다 — [미확인])

**이것이 이 게임의 희소성 손잡이다.** 희귀 재료는 희귀 드롭이 아니라 **희귀 몬스터**로 만든다 — Primordial Essence 를 원하면 1% 확률의 Forest Spirit 이 뜰 때까지 D1 을 돌아야 한다. 등급이 아니라 **조우 확률**이 희소성을 만든다.

### 3-2. 드롭은 재료가 기본, 착용물은 예외

**D1·D2·D3 의 드롭은 전부 재료·소비품이고, 착용 가능한 장비가 하나도 없다**[위키]. 착용물이 드롭되기 시작하는 것은 **D4 The Golden City 부터**이며, 그 D4 드롭조차 대부분 **제작의 입력**으로 다시 들어간다 — Corrupted Staff(Int+1, 판매가 1 copper)는 **거의 쓸모없는 스탯의 드롭품**이지만, Cleansing Potion 과 합치면 Imperial Staff(Con+8/Int+26/Dex+8)가 된다[위키 `Staffs`].

확인된 착용물 드롭 전수[위키]:

| 아이템 | 출처 몬스터 | 성격 |
|---|---|---|
| Recurve Blade | Sha'huri Warrior (D2·R2) | Scimitar 제작 재료 |
| Sha'huri Bow Frame | Sha'huri Archer (D2·R2) | 활 제작 재료로 추정[미확인] |
| Silver Ring | Insane Citizen (D4) | — |
| Warden Belt | City Warden (D4) | — |
| Corrupted Shield | Imperial Guard (D4) | — |
| Corrupted Staff | Imperial Mage (D4) | **Imperial Staff 의 재료** |
| Corrupted Dagger | Arcane Assassin (D4) | — |
| Mitre hat | Insane Priest (D4) | — |
| Robe of the Lich | Ka'Bar, the Rotten (R3 보스) | 레이드 보스 전용 |
| Slime King's Crown / Seeking Glass | Slime King (R1 보스) | 레이드 보스 전용 |
| Skeleton Key | Emperor Clovis XXVIII (R4 보스) | "쫄 피해 2배·특수 조우 발동"[나무위키] |
| Eyes of the Swordsman / Divine Zygote | Sha'kire / Sha (R2 보스) | 레이드 보스 전용 |

> **패턴이 하나 읽힌다 — 착용물의 직접 드롭은 「보스」에 몰려 있다.** 일반 몬스터가 주는 착용물은 D4 의 5종(Corrupted 3종·Silver Ring·Warden Belt)뿐이고, 나머지는 전부 레이드 보스 고정 드롭이다. 본작의 "유니크는 챕터 보스 전용 추가 판정"(item_design §1)과 **구조가 같다** — 굴림 파이프라인 밖에 보스 전용 경로를 따로 뚫는 처리.

### 3-3. 드롭 확률 — 거의 안 적혀 있다

**위키 전체에서 발견된 드롭 확률은 단 하나다** — `Troll Hide 20%`[위키 `Enemies`]. D6 Frostbite Peaks 의 Troll 계열 4종(Troll Whelp / Troll / Troll Warrior / Troll Shaman) 전부에 동일하게 붙어 있다.

나무위키가 하나를 더 준다 — **"Void Core 는 드롭률이 1% 미만"**[나무위키].

그 외 나머지 몬스터의 드롭 목록에는 **확률 표기가 아예 없다**. 위키의 나머지 % 표기는 전부 전투 효과(Sha'huri Archer "10% STUN on hit", Djinn "80% chance of being SILENCED for 5 turns", Pirate "50% chance of striking back with a basic attack" 등)라 드롭과 무관하다[위키].

**[미확인] — 처치당 드롭 개수.** 몬스터마다 드롭 목록이 1~6종인데(Forest Spirit 1종 ↔ Troll Shaman 6종), 이것이 "매 처치마다 목록 전체를 각각 굴린다"인지 "목록에서 하나를 뽑는다"인지 위키가 말하지 않는다. Troll Hide 에만 20% 가 붙어 있고 같은 몬스터의 다른 드롭에는 확률이 없다는 점은 **드롭마다 독립 확률이 있고 위키가 대부분 안 적었다**는 쪽을 시사하지만, 확정 근거는 아니다.

### 3-4. 두 번째 획득 경로 — 「Search」

`Drops` 페이지가 확인해 주는 별개 경로가 하나 있다 — **탐색(Searching)**. Wood 는 "Searching Enchanted Forest, Killing Treants, Killing Ents" 에서, Plant Fiber 는 "Searching Enchanted Forest, Killing Treants, Killing Centaurs" 에서, Copper Ore 는 "Searching Enchanted Forest, Killing Centaurs" 에서 나온다[위키 `Drops`].

즉 **같은 재료가 전투와 비전투 양쪽에서 나온다.** 스토어 원문의 "They will fight enemies, take their loot, **discover interesting places**"[스토어]가 이 탐색을 가리키는 것으로 보인다. 다만 탐색이 별개 활동인지 던전 진행 중 자동으로 섞이는 것인지는 [미확인].

### 3-5. 던전 구조와 진행

| 항목 | 값 |
|---|---|
| 던전 수 | **9개**(D1~D9)[위키 `Enemies`] ⚠ 나무위키는 **11지역**이라고 적는다[나무위키] — 충돌, [미확인] |
| 던전 목록 | D1 Enchanted Forest · D2 The Desert · D3 Eternal Battlefield · D4 The Golden City · D5 Blackwater Port · D6 Frostbite Peaks · D7 Obsidian Mines · D8 The Southern Grove · D9 Barren Wastelands[위키] |
| 레이드 | **R1~R7**[위키] — R1 The Slime Pond · R2 Divine Archeology · R3 Ancient Grave Digging · R4 Imperial Rescue · R5 The Cultist Rebels (R6·R7 은 위키에 비어 있음) |
| 다음 던전 해금 | **100 웨이브 격파**[위키 `Dungeons & Raids`] |
| 레이드 해금 | **한 판에 150 웨이브 격파**[위키] |
| 파티 인원 | 던전 4인 + 펫 1 / 레이드 5인 이상 + 펫 1[위키] |
| 사망 페널티 | 던전 = 다음 레벨까지 경험치의 **20% 손실**, 전멸 시 구역 진행도 전부 손실 / 레이드 = 경험치 손실 없음[위키] |
| 레이드 입장 | 하루 1회 무료, 추가 입장 **30 젬**[위키·나무위키] |
| 에픽 레이드 | 진행도 **영구 저장**(처치한 적은 리스폰 안 함), **판매 불가 확정 보상**[위키] · 1회만 클리어 가능[나무위키] |

> ⚠ **`Dungeons & Raids` 페이지는 낡았다.** 이 페이지는 던전을 3개(D1 Enchanted Forest / D2 The Desert / **D3 Obsidian Mines**)로 적고 몬스터도 Wolf·Spider / Sandworm·Nomad / Golem·Bat 으로 쓰는데, `Enemies` 페이지는 D3 = Eternal Battlefield, Obsidian Mines = D7 이고 몬스터 이름도 전부 다르다. **`Enemies` 쪽을 채택**했다 — 이쪽이 61종 전수를 담고 있고 최근 편집이다.

---

## 4. 제작 — 이 게임의 아이템 파이프라인 전부

스토어 원문이 게임의 자기 정의로 못 박는다 — "send them to explore Dungeon to both gain experience and **retrieve rare loot neded to craft the most powerful equipments**"[스토어, 오타 원문 그대로]. 조사 결과 이것이 과장이 아니다: **장비를 얻는 주 경로가 제작이고, 드롭은 그 입력이다.**

제작은 **Workshop**(길드 시설)에서 이뤄진다 — "The Workshop is where materials are crafted into equipment and items."[위키 `Headquarters`]

### 4-1. 검(Sword) 15종 — 전수 제작표[위키 `Swords`]

| 이름 | Con | Dex | 기타 | 제작 재료 | 판매가 |
|---|---|---|---|---|---|
| Spade | +1 | — | — | 기본 무기 | 판매 불가 |
| Iron Sword | +3 | +1 | — | Wood ×3, Copper Ingot ×2 | 20 copper |
| Scimitar | +6 | +2 | — | Wood ×12, Iron Ingot ×2, **Recurve Blade ×1** | 41 copper |
| **Living Scimitar** | +10 | — | MDef+5, 반격 10% | **Scimitar + Bottled Sand Spirit** | 2 silver 27 copper |
| **Ghastly Scimitar** | +16 | — | MDef+10, 반격 20% | **Living Scimitar + Orb of Ectoplasm** | 4 silver 16 copper |
| Undead Sword | +9 | +3 | — | Bone Fragment ×30, Elongated Bone ×1 | 54 copper |
| Golden Sword | +12 | +4 | — | Gold Ingot ×14 | 4 silver 83 copper |
| Black Iron Cutlass | +15 | +5 | — | Ghostwood Board ×5, Black Iron Ingot ×14 | 3 silver 62 copper |
| Abyssal Cutlass | +24 | — | — | Ghostwood Board ×5, Abyssal Ingot ×2 | 55 silver 1 copper |
| Frostmetal Sword | +18 | +6 | — | Winterwood ×6, Frostmetal Ingot ×18 | 5 silver 13 copper |
| Obsidian Sword | +21 | +7 | — | Obsidian Chunk ×72 | 3 silver 24 copper |
| **Vampire Sword** | +21 | +7 | 흡혈 20% | **Obsidian Sword + Crimson Brew** | 10 silver 26 copper |
| **Unholy Sword** | +27 | +5 | Retaliate 15(마법) | **Obsidian Sword + Unholy Potion** | 14 silver 85 copper |
| Celestial Sword | +28 | +8 | — | Celestial Metal ×43 | — |
| **Celestial Mercy** | +28 | +8 | −12 darkness, **항상 명중** | **Celestial Sword** (+ 재료 미기재) | — |

### 4-2. 지팡이(Staff) 13종 — 전수 제작표[위키 `Staffs`]

| 이름 | 스탯 | 제작 재료 | 판매가 |
|---|---|---|---|
| Cane | Int+1 | 기본 무기 | 판매 불가 |
| Enchanted Staff | Int+4 | Wood ×10, Ancient Seed ×1 | 45 copper |
| Undead Staff | Int+12 | Bone Fragment ×30, Elongated Bone ×1, Warlord Skull ×1 | 93 copper |
| Molten Staff | Int+14 | Glass ×5, Iron Ingot ×10, Sunfire Core ×2 | 미기재 |
| Sun Staff | Con+2, Int+13, Dex+2, Ablaze +40% | Glass ×5, Iron Ingot ×10, Sunfire Essence ×1 | 미기재 |
| Corrupted Staff | Int+1 | **드롭품**(Imperial Mage, D4) | 1 copper |
| **Imperial Staff** | Con+8, Int+26, Dex+8 | **Corrupted Staff + Cleansing Potion** | 5 silver 64 copper |
| **Icicle** | Con+10, Int+26, Dex+10, 피격 시 빙결 | **Imperial Staff + Permafrost Essence** | 23 silver 58 copper |
| Black Iron Scepter | Int+20 | Black Iron Ingot ×16 | 3 silver 36 copper |
| Winterwood Staff | Int+24 | Winterwood ×50, Frost Crystal ×1 | 2 silver 49 copper |
| Crystal Staff | Int+26, **상태이상 면역 25%** | Frost Crystal ×10, Frost Nucleus ×1 | 3 silver 60 copper |
| Obsidian Scepter | Int+28 | Obsidian Chunk ×72 | 3 silver 24 copper |
| **Vampire Scepter** | Int+28, 흡혈 20% | **Obsidian Scepter + Crimson Brew** | 10 silver 26 copper |

Sun Staff 에 "Can be built into a **Stellar Staff**" 라는 후속 경로 언급이 있으나 그 항목 자체는 위키에 없다[위키 raw · 미확인].

### 4-3. 제작의 두 가지 형태 — 이게 핵심 구조다

위 두 표에서 **제작이 정확히 두 형태**로 갈린다:

```
① 소재 제작   : 재료 N종 → 새 장비            (Frostmetal Sword = Winterwood×6 + Frostmetal Ingot×18)
② 상위 개조   : 기존 장비 1개 + 특수 시약 1개 → 상위 장비  (Obsidian Sword + Crimson Brew = Vampire Sword)
```

**②가 이 게임의 「통제 가능성」 자리다.** ②로 만들어진 장비들만이 **수치 밖의 효과**를 갖는다 — 흡혈 20%, 반격 10/20%, 피격 시 빙결, 항상 명중, Retaliate. ①로 만든 장비는 예외 없이 **순수 스탯 덩어리**다(Crystal Staff 의 상태이상 면역 25% 가 유일한 예외).

그리고 ②는 **분기한다**. Obsidian Sword 하나에서 두 갈래가 나온다:

```
Obsidian Sword (Con+21/Dex+7)
   ├─ + Crimson Brew  → Vampire Sword (Con+21/Dex+7, 흡혈 20%)      ← 스탯 유지 + 효과 추가
   └─ + Unholy Potion → Unholy Sword  (Con+27/Dex+5, Retaliate 15)  ← 스탯 재분배 + 효과 추가
```

**같은 밑감에서 시약이 결과를 가른다.** 그리고 밑감은 소모된다(Obsidian Chunk ×72 를 다시 모아야 다른 갈래를 탄다). 이것이 이 게임에서 **플레이어가 무언가를 「고르는」 거의 유일한 아이템 결정**이다 — 굴림이 없으므로 결정은 전부 "무엇을 만들 것인가" 쪽에 있다.

Scimitar 계열은 **3단 사슬**이다: `Scimitar → (Bottled Sand Spirit) → Living Scimitar → (Orb of Ectoplasm) → Ghastly Scimitar`. 반격 확률이 10% → 20% 로, MDef 가 +5 → +10 으로 정확히 배가된다.

### 4-4. 제작 입력은 100% 전투에 묶여 있다

**확인된 모든 제작 재료의 출처가 몬스터 드롭 또는 던전 탐색이다.** 비전투 생산 시설이 없다 — Headquarters 의 시설은 Quarters(숙소) · Tavern(모집) · Storage(창고) · Market(매매) · Workshop(제작) · Shelter(펫) 6종이고[위키], **재료를 「생산」하는 시설이 하나도 없다.** Workshop 은 변환기이지 생산기가 아니다.

가장 낮은 층의 재료조차 그렇다 — Iron Sword 의 Copper Ore 는 Centaur(D1, 13%)를 죽이거나 Enchanted Forest 를 탐색해야 나온다[위키 `Drops`].

> **이것이 본작 §10 「크래프트 가드」에 대한 이 게임의 답이다** — 가드를 규칙으로 세우지 않고, **입력을 전부 전투 쪽에 두어 구조에서 성립시켰다.** §8-3 에서 다룬다.

### 4-5. 확인 못한 제작 요소

| 항목 | 상태 |
|---|---|
| **강화(enhance/upgrade) 체계** | 스토어가 "upgrade equipment"[스토어]를 말하고 나무위키가 "방어력·마법방어력 포션 사용 시 스탯 영구 상승"[나무위키]을 적는데, 이것이 **장비 강화인지 영웅 강화인지** 확정 못했다. 위키 원문의 포션은 전부 몬스터 드롭(Potion of Constitution·Precision·Intelligence·Dexterity·Health·Defense·Immunity·Viciousness)이라 **영웅 쪽일 가능성이 높다** |
| **분해(salvage/dismantle)** | Headquarters 원문에 **분해 관련 서술이 없다**[위키 raw]. 정리 수단은 판매(Market)로 보인다 — §7 |
| 제작 소요 시간의 구체 수치 | Workshop 속도 업그레이드가 "10% 씩 감소"[위키]인 것만 확인, 기준 시간 미확인 |
| 활·단검 전수 제작표 | **위키에 페이지 자체가 없다**(§0) |
| 방어구·악세서리 제작표 | **위키에 페이지 자체가 없다** |

---

## 5. 접사·옵션 — 없다. 굴림은 다른 데 있다

**장비에 무작위 옵션이 붙는다는 근거를 어느 출처에서도 찾지 못했다.** §2 와 같은 근거다 — raw 위키텍스트에 굴림 범위(min~max)를 담을 필드가 없고, 모든 스탯이 단일 값으로 적혀 있다. Iron Sword 는 언제나 Con+3/Dex+1 이다[위키 raw].

**그런데 이 게임에 RNG 가 없는 것은 아니다. 자리가 다르다.**

| 굴림이 사는 자리 | 내용 | 출처 |
|---|---|---|
| **몬스터 조우** | Spawn Rare % — 어떤 몬스터를 만나는가(§3-1) | [위키] |
| **드롭 판정** | Troll Hide 20% 등(§3-3) | [위키] |
| **펫 스킬 슬롯 2·3·4** | 레벨 21·41·61 에 **무작위로** 스킬이 붙는다(§6) | [위키] |
| **영웅 특성(trait)** | 모집되는 모험가마다 **0~2개**가 무작위로 붙는다 | [나무위키] |
| **선술집 모집** | 일정 주기로 무작위 모험가 1명 추가, 꽉 차면 선입선출로 교체 | [나무위키] |

> **정리 — 이 게임은 「개체 굴림」을 장비에서 빼서 영웅과 펫에 몰아 놓았다.** 장비는 종류(type)만 있고 개체(instance)가 없다. 같은 이름의 Iron Sword 는 전부 같은 물건이다. 그래서 "잘 뜬 것을 찾는" 파밍이 장비 쪽엔 없고, 대신 **"좋은 특성의 모험가를 뽑는"·"좋은 스킬이 붙은 펫을 키우는"** 쪽에 있다.

확인된 영웅 특성 16종[위키 `Headquarters`]: Bookworm, Feral, Brute, Dragon Blood, Nocturnal, Blessed, Troll Blood, Ruthless, Intimidating, Nimble, Reactive, Empathetic, Gifted, Focused, Cursed, Alert. 각 특성의 구체 효과는 [미확인]. 나무위키는 **"특정 특성은 유료 패키지 모험가에게만 붙는다"**[나무위키]고 적는다 — 굴림의 상단이 과금에 묶여 있다는 뜻.

---

## 6. 펫 — 이 게임에서 굴림이 실제로 사는 자리

**펫은 장식이 아니라 성장 축이다.** 위키가 직접 그렇게 규정한다 — "Pets are essential companions in Idle Guild Master, providing passive bonuses to your adventuring parties."[위키 `Pets`] 던전·레이드 편성에 **파티당 펫 1마리**가 들어간다(§3-5).

### 6-1. 획득과 성장

- **알(Egg)에서 부화**한다. 알은 몬스터가 **드물게** 드롭한다[위키] — 실제로 `Enemies` 드롭 목록에 Wild Egg / Wooden Egg / Insect Egg / Avian Egg / Esoteric Egg / Construct Egg / Reptile Egg 7종이 흩어져 있다(확률은 [미확인]).
- **Shelter**(길드 시설)에 수용한다. 3번째 펫 슬롯이 **50 Gold**, Auto-feeder 가 **1 Gold**[위키 `Headquarters`].
- 레벨업은 **먹이(음식 드롭)**로 한다 — Auto-feeder 를 사면 자동화된다. 위키가 "highly recommended"라고 적을 만큼 사실상 필수[위키].
  - 이것이 몬스터 드롭 목록에 **식재료가 대량으로 섞여 있는 이유**를 설명한다 — Tomato, Apple, Cheese, Meat Chop, Pineapple, Potato, Chocolate, Banana, Fresh Salmon, Fresh Tuna, Blueberry, Avocado, Wyvern Chop, Meaty Mushroom, Egg 등[위키 `Enemies`].

### 6-2. 스킬 슬롯 — 굴림의 자리[위키 raw `Pets`]

| 슬롯 | 해금 레벨 | 결정 방식 |
|---|---|---|
| 1st | Lv 1 | **알 종류가 고정** |
| 2nd | Lv 21 | **무작위** |
| 3rd | Lv 41 | **무작위** |
| 4th | Lv 61 | **무작위** |

새 스킬은 **펫 레벨과 무관하게 Lv 1 로 시작**한다[위키].

> **구조가 정확히 「1 고정 + 3 굴림」이다.** 알 종류가 그 펫의 정체성을 확정하고(통제), 나머지 셋은 레벨 21/41/61 이라는 긴 사다리 뒤에 무작위로 붙는다(파밍). 통제와 굴림이 슬롯 단위로 분리돼 있다.

### 6-3. 알 종류 7종과 파밍 위치[위키]

| 알 | 1번 슬롯 후보 스킬 | 최적 파밍 던전 |
|---|---|---|
| Wild | Bloodthirsty, Vigilant | D1 |
| Wooden | Healer, Soothing | D1 |
| Insect | Fighter, Protective | D2, D5, D8 |
| Avian | Decoy | D2 |
| Esoteric | Curious, Teacher | D3, D5, D7 |
| Construct | Bright, Magic | D7 |
| Reptile | Opportunist, Savage | D8 |

**펫 18종**[위키] — Wild: Rat, Red Wolf, Squirrtel / Wooden: Floating Seed, Holy Tree, Walking Bush / Insect: Tarantula, Mosquito, Beetle / Avian: Eagle, Owl / Esoteric: Floating Eye, Tentacle Tangle, Thing from the Abyss / Construct: Golem, Rockling, Tesseract / Reptile: Lizard, Crocodile.

### 6-4. 펫 능력 13종 — 레벨당 계수[위키]

| 능력 | 레벨당 | 효과 |
|---|---|---|
| **Curious** | **+0.3%** | **드롭을 두 번 굴릴 확률** |
| **Teacher** | +0.4% | 파티 경험치 획득 증가 |
| Bloodthirsty | +0.15% | 흡혈 전환 |
| Healer | ~0.2 HP | 아군 턴에 회복 |
| Soothing | ~0.4 HP | 아군 턴당 HP 재생 |
| Fighter | ~0.5 Dmg | 아군 턴에 추가 공격 |
| Bright | −0.5 | Darkness 효과 감소 |
| Decoy | +0.01 | 위협(threat) 면역 부여 |
| **Savage** | +0.3% | **치명 배수가 두 번 적용될 확률** |
| Opportunist | +0.2% | HP 문턱 이하 적 즉살 |
| Vigilant | +0.35% | 반격 확률 증가 |
| Protective | 0.1 Dmg | 들어오는 피해 차단 |
| Magic | X Turns | 무작위 상태이상 부여 |

> **Curious 와 Teacher 가 이 게임의 「파밍 효율 스탯」이고, 그것이 장비가 아니라 펫에 있다.** 본작 §10 「매직찬스가 별개 스탯인가」와 정면으로 만나는 지점 — §8-5.
>
> Savage("치명 배수가 두 번 적용")도 눈여겨볼 만하다. 본작이 08-27 에 **치명 배수를 죄종 마스터리에서 빼고 유니크·낙인에만 남긴 것**(item_design §3)과 같은 문제의식 — 치명 배수는 곱의 항이라 아무 데나 두면 안 되고, IGM 은 그것을 **펫 스킬 슬롯의 무작위 굴림**이라는 가장 접근이 어려운 자리에 넣었다.

---

## 7. 창고·판매 — 「정리」의 자리

### 7-1. 화폐[위키 `Headquarters`]

```
100 Bronze = 1 Silver · 100 Silver = 1 Gold · 100 Gold = 1 Platinum
```

⚠ 아이템 페이지는 최소 단위를 **copper** 로 적고 HQ 페이지는 **Bronze** 로 적는다 — 같은 것으로 보이나 위키 내부 표기 불일치다[미확인].

### 7-2. 시설 6종[위키 `Headquarters`]

| 시설 | 하는 일 | 확장 |
|---|---|---|
| **Quarters** | 모험가 수용 | **2칸에서 시작**, 추가 슬롯 5 Bronze → **30 Gold** 까지 상승 |
| **Tavern** | 모험가 모집 | 수용량·대기시간 업그레이드. **영웅 교체 방지 잠금(lock)** 기능 |
| **Storage** | 아이템·재료·장비 보관 | **30칸에서 시작**, 슬롯당 5 Bronze → 1 Gold 40 Silver |
| **Market** | 매매 | 슬롯 82 Silver 1 Bronze 부터, 속도 업그레이드 6 Silver 97 Bronze 부터 (배율 1.1111…) |
| **Workshop** | 재료 → 장비·아이템 제작 | 슬롯 82 Silver 1 Bronze 부터, 속도는 단계당 **−10%**, 58 Silver 26 Bronze → 4 Gold 86 Silver |
| **Shelter** | 펫 수용 | Auto-feeder 1 Gold, 3번째 슬롯 50 Gold |

### 7-3. 「정리」의 처리 — 판매가와 판매 불가 플래그

- **모든 아이템에 고정 판매가가 박혀 있다**(§4-1·4-2 표의 마지막 열). 개체 굴림이 없으니 **가격도 종류마다 하나로 확정**된다.
- **판매 불가(unsellable) 플래그가 존재한다** — 기본 무기(Spade, Cane)가 판매 불가[위키], 에픽 레이드 보상이 **"non-sellable loot"**[위키].
- **분해가 없다**(§4-5). 아이템 정리는 판매 하나로 수렴한다.
- 창고 30칸 시작 → 유료 확장 사다리. **창고 압력이 이 게임의 과금 지점 중 하나**다.

> **재료가 61종 몬스터에서 수백 종 쏟아지는데 창고가 30칸에서 시작한다.** 즉 이 게임은 "무엇을 보관하고 무엇을 팔 것인가"를 강한 압력으로 만들고, 그 압력을 확장 판매로 화폐화한다. 본작이 가방 상한을 **"원정 사이의 정리를 강제하는 장치"**(item_design §1)로 규정한 것과 같은 발상이되, IGM 은 그것을 수익 모델까지 연결했다.

---

## 8. 본작 대조 시사점

> 본작(TheSevenSimulationRPG)은 파티 자동전투 방치형 파밍 RPG. **처치당 최대 1개 · 6단계 굴림 파이프라인**(드롭여부→부위→ilvl→희귀도→접사→개체굴림)을 확정했고, 희귀도 4단(매직→레어→크래프트→유니크)을 "통제 가능성의 계단"으로 설계했다(item_design.md §1).

### 8-1. 드롭 파이프라인 — 굴림 0단계 vs 6단계. 대조군으로서의 값

본작의 파이프라인은 **한 번의 처치가 아이템 하나를 「만들어 낸다」**. 6단계 굴림이 끝나야 그 개체가 무엇인지 정해진다.

**IGM 은 굴림 단계가 0이다.** 드롭은 고정 목록에서 나오고, 나온 것은 재료이며, 재료가 무엇이 되는지는 **레시피가 이미 정해 놓았다.** 파이프라인의 무게중심이 **처치 시점에서 제작 시점으로** 통째로 옮겨져 있다.

가장 중요한 대조는 여기다 — **본작이 "레벨과 희귀도를 서로에게서 뗀 것이 이 파이프라인의 핵심"이라고 못 박은 문제가, IGM 에는 존재하지 않는다.** IGM 에서 던전 번호는 재료 종류를 100% 결정하고, 재료 종류는 레시피를 100% 결정하고, 레시피는 스탯을 100% 결정한다:

```
IGM : 던전 번호 → 재료 종류 → 레시피 → 스탯     (전 구간 결정론, 굴림 0)
본작 : 스테이지 레벨 → ilvl(대역만) ⊥ 희귀도(몬스터+매직찬스) → 접사 → 개체값
```

즉 **IGM 은 본작이 명시적으로 거부한 "레벨이 등급을 결정하는" 구조를 극단까지 밀어붙인 게임**이다. 그 대가가 명확하다 — IGM 에는 **저레벨 스테이지가 죽는 문제가 아예 없다**(D1 의 Wood 는 후반 레시피에도 계속 필요하다). 본작이 걱정한 "저레벨 스테이지가 두 겹으로 죽는다"는 병은 **결정론적 재료 경제에서는 발병하지 않는다.** 본작이 굴림을 택한 이상 그 병을 다른 수단으로 막아야 한다는 것을 역으로 확인해 준다 — 채택 후보가 아니라 대조군.

### 8-2. 타겟 파밍 축 — **이번 조사에서 가장 값진 발견**

본작 §10: *"죄종 편향 폐기로 부위 하나만 남았다. 스테이지 선택의 근거가 얇아 '갈 수 있는 가장 높은 곳'으로 수렴할 위험."*

**IGM 은 어느 던전을 갈 이유를 「부위 편향」이 아니라 「레시피 수요」로 만든다.** 그리고 그 구조는 3층이다:

```
1층 — 레시피가 재료를 지목한다
      Frostmetal Sword = Winterwood ×6 + Frostmetal Ingot ×18
2층 — 재료가 몬스터를 지목한다 (던전이 아니다)
      Winterwood     ← Troll, Troll Shaman
      Frostmetal Ore ← Troll Warrior, Troll Shaman, Ice Elemental, Snow Wyvern
3층 — Spawn Rare % 가 그 몬스터를 만날 확률을 정한다
      (D1 실측: Wolf 36% / Boar 25% / Treant 22% / Centaur 13% / Ent 2% / Golden Rabbit 1% / Forest Spirit 1%)
```

**"갈 수 있는 가장 높은 곳으로 수렴"이 원리적으로 불가능하다** — 만들려는 물건이 정해지면 갈 던전이 그것 하나로 정해지기 때문이다. D9 에서 아무리 돌아도 Winterwood 는 안 나온다. 스테이지 선택의 근거가 **드롭 확률의 우열이 아니라 재료의 배타성**에서 나온다.

그리고 **3층 구조라는 것 자체가 시사적이다.** 1층만 있으면(던전당 전용 재료 1종) 선택이 던전 목록에서 끝나 얕고, 3층이 있어서 **같은 던전 안에서도 "어느 몬스터가 나올 때까지 돌 것인가"**가 생긴다. Primordial Essence(Forest Spirit, D1 스폰 1%)를 원하는 플레이어와 Wood(Treant 22%)를 원하는 플레이어는 **같은 D1 을 전혀 다른 목표로 돌게 된다.**

> **본작에 대한 대조 관찰** — 본작에는 이미 이 3층 중 3층(스테이지별 몬스터 구성)과 2층의 절반(부위 편향의 「몬스터별 확률」)이 있다. 없는 것은 **1층, 즉 "무엇을 만들려고 그 재료가 필요한가"**다. 본작 §10 의 **「몬스터별 재료」 항목이 정확히 이 1층**이고, IGM 은 그것을 채택해서 타겟 파밍 축 전체를 세운 게임이다.
>
> 다만 그 값을 취하려면 **레시피가 재료를 배타적으로 지목해야 한다.** 재료가 어디서나 나오면 1층이 무너지고 2·3층만 남아 지금 본작 상태로 돌아간다. IGM 의 배타성은 강하다 — Obsidian Chunk 는 D7 의 Obsidian Golem·Lost Miner 둘에서만 나오고, Obsidian Sword 는 그것 72개를 요구한다.

### 8-3. 크래프트 가드 — IGM 의 답은 "입력을 전부 전투에 묶는다"

본작 §10: *"원정 없이 제작이 성립하는가. 지금 입력은 광석(파견)+낙인(보스)뿐이라 성립해 버린다."*

**IGM 은 제작 입력의 100% 가 전투 산출이다**(§4-4). 재료를 생산하는 비전투 시설이 없다. Workshop 은 변환기이지 생산기가 아니고, 나머지 5개 시설(Quarters·Tavern·Storage·Market·Shelter)은 전부 수용·거래·모집이다. **원정 없이 제작이 성립할 여지가 구조적으로 0이다.**

이는 본작 item_design §5-3 의 예상 — *"몬스터 재료를 채택하면 그것이 원정 쪽 입력이 되어 별도 규칙 없이 구조에서 풀린다"* — 이 **실제로 작동하는 게임의 실물 증거**다. 규칙 문장(예: "제작에는 원정 재료가 반드시 하나 이상 들어가야 한다")을 세우지 않고 재료 경제의 형태만으로 가드가 성립한다.

> **⚠ 그대로 베끼면 컨셉 락과 부딪힌다.** IGM 은 100% 를 전투에 묶었기 때문에 **오프라인 산출의 자리가 없다.** 본작은 컨셉 락상 광석이 파견(오프라인)에서 오는 것이 **정렬 조건**이다(item_design §5-1 — "꺼 두면 재료가 쌓이고, 켜서 제련소에서 써야 장비가 된다").
>
> 그래서 본작이 취할 수 있는 형태는 IGM 의 100% 가 아니라 **"레시피마다 파견 재료 + 원정 재료를 둘 다 요구"**하는 혼합이다. 이건 IGM 이 보여주는 것이 아니라 **IGM 과 본작 컨셉 락의 차이에서 나오는 본작 고유의 요구**다 — 조사 결과로 제안하는 것이 아니라, 대조에서 드러난 제약으로 적어 둔다.

### 8-4. 드롭 부위 편향의 단위 — IGM 은 종족도 역할도 아닌 제3의 답을 준다

본작 §10: *"몬스터의 `monster_base`(종족)인가 `role`(전투 역할)인가. `role` 은 이미 방어 감쇠를 정하고 있어 겸직 주의."*

**IGM 의 드롭 단위는 개체 이름이지만, 그 이름이 사실상 「종족 + 등급」이다.** D6 Troll 계열 4종이 이를 명확히 보여준다[위키]:

| 몬스터 | 드롭 |
|---|---|
| Troll Whelp | Troll Hide(20%), Blueberry |
| Troll | Troll Hide(20%), Winterwood, Ice Fiber, Blueberry |
| Troll Warrior | Troll Hide(20%), Frostmetal Ore, Blueberry |
| Troll Shaman | Troll Hide(20%), Winterwood, Frostmetal Ore, Ice Fiber, Blueberry, **Potion of Health** |

읽히는 규칙이 둘이다:

1. **종족이 「무엇을 주는가」를 정한다** — Troll 넷 전부가 Troll Hide 를 20% 로 준다. 종족 고유 재료는 등급과 무관하게 동일하다.
2. **등급이 「몇 종류를 주는가」를 정한다** — Whelp 2종 → Troll/Warrior 4종 → Shaman 6종. 그리고 **상위 등급만 주는 항목이 있다**(Potion of Health 는 Shaman 전용).

> **본작의 `role` 겸직 우려를 피하는 제3 안이 여기 있다 — 개수를 `role` 이 아니라 「등급」에 맡기는 것.**
>
> 본작은 이미 `spawn_grade.csv` 를 갖고 있고, item_design §1 이 **`drop_roll` 컬럼이 "최대 1개 확정으로 할 일을 잃었다"**고 정리 대상에 올려 뒀다. IGM 의 2축 분리를 대입하면 그 컬럼이 **"재료 종류 수"로 재취업**할 수 있는 자리가 보인다 — 종족(`monster_base`)이 재료의 **종류**를, 등급(`spawn_grade`)이 재료의 **가짓수**를 정하는 형태. `role` 은 방어 감쇠에만 남아 겸직이 발생하지 않는다.
>
> ⚠ **이건 관찰이지 제안이 아니다.** `spawn_grade.csv` 컬럼 처리는 §10 미확정 항목이고 스키마 결정이 선행한다(DEV_PLAN R20). 여기 적는 이유는 "IGM 이 실제로 그렇게 굴리고 있다"는 대조 사례를 남기기 위해서다.

### 8-5. 매직찬스가 별개 스탯인가 — IGM 은 「접사 풀에서 뺐다」

본작 §10: *"드랍률과 나누면 유틸 접사가 3종이 된다. §5 는 유틸 축을 둘로 적어 뒀고 D2 는 MF 하나가 개수·등급을 함께 민다. 접사 풀 희석(검증 기준 1) 직결."*

**IGM 은 이 문제를 「장비에서 아예 빼는」 것으로 푼다.** 파밍 효율 스탯이 둘 있는데(§6-4) 둘 다 **펫 스킬**이다:

- **Curious +0.3%/레벨 — "드롭을 두 번 굴릴 확률"** ← 본작 드랍률에 대응
- **Teacher +0.4%/레벨 — 파티 경험치 증가** ← 본작 유틸 축에 없는 것

세 참고작이 이 질문에 서로 다른 세 답을 내놓았다는 것이 이번 조사의 수확이다:

| 게임 | 파밍 효율 스탯의 자리 | 대가 |
|---|---|---|
| **Diablo 2** | 장비 접사 (MF 하나가 개수+등급을 함께) | 접사 하나가 두 일을 겸해 축이 굵다 |
| **Lootun** | 장비 접사 (Luck/Fortune/Wealth/Fate **4종**) | 접사 풀이 그만큼 희석된다 |
| **IGM** | **장비 밖 별개 축(펫)** | 장비에서 "전투력 vs 파밍 효율" 스왑 결정이 **사라진다** |

> **본작에 주는 것** — 본작이 유틸 접사를 신설한 명시적 이유는 *"전투력 vs 파밍 효율 스왑 결정 생성"*(item_design §2)이다. IGM 방식은 **그 결정을 없애는** 방식이므로 본작 의도와 정면으로 어긋난다. 즉 IGM 은 여기서 **채택 후보가 아니라 반례**다.
>
> 다만 IGM 이 알려주는 것이 하나 있다 — **파밍 효율 스탯을 별도 축에 두면 접사 풀 희석 문제가 원천적으로 안 생긴다.** 본작이 매직찬스를 3번째 유틸 접사로 신설할지 고민할 때, 저울의 반대편에 "펫/파견처 같은 다른 축으로 뺄 수도 있다"는 무게가 있다는 것. 본작에는 이미 **파견처**라는 장비 밖 축이 있어 자리가 없지는 않다.

### 8-6. 자동 분해의 선 — IGM 은 「플래그」로 답하고, 그럴 수 있는 이유가 본작과 다르다

본작 §10: *"「저품질 자동 분해」는 이름만 있다. ilvl 하한인지 점수 하한인지, 죄종 태그를 어떻게 보호할지 미작성."*

**IGM 에는 분해가 없고, 판단 기준도 없다.** 대신 아이템마다 **고정 판매가**가 박혀 있고, 보호가 필요한 것에는 **판매 불가 플래그**를 박는다(기본 무기, 에픽 레이드 보상)[위키].

**그런데 IGM 이 그럴 수 있는 이유가 결정적이다 — 아이템이 종류만 있고 개체가 없기 때문이다**(§5). Iron Sword 는 전부 같은 물건이니 "Iron Sword 를 판다/안 판다"가 아이템 타입 단위로 결정 가능하다. 필터가 필요 없다. 플래그 하나면 된다.

> **이 대조가 본작의 점수 체계를 역으로 정당화한다.** 본작은 같은 이름의 개체가 굴림으로 갈리므로(item_design §2 — "드롭 시 한 번 굴려 개체에 박는다") **타입 단위 플래그가 원리적으로 못 쓰인다.** 무엇이 좋은 개체인지를 판정하는 무언가가 반드시 필요하고, 그것이 §6 의 점수다.
>
> 동시에 **IGM 은 "플래그가 필터보다 단순하고 오작동하지 않는다"는 것도 보여준다.** 본작 §6-4 의 *"점수에서 빠지는 축(저항·유틸·죄종 태그·조건부)은 문맥 의존이라 점수가 낮아도 버리면 안 될 수 있다. 전부 보호하면 필터가 아무것도 못 거른다"* 라는 난제에 대해, IGM 은 **판정을 시도하지 않고 보호 대상을 데이터에 직접 쓰는** 길을 보여준다. 본작에 대입하면 "점수 하한 + 개체 단위 잠금(lock) 플래그" 조합 — 실제로 IGM 은 **Tavern 에 영웅 교체 방지 lock 을 이미 두고 있다**[위키]. 자동 처리에 수동 잠금을 붙이는 처리는 이 게임 안에서 이미 검증된 형태다.

### 8-7. 본작이 확정한 것과 부딪히는 지점 (대조군)

| 지점 | IGM | 본작 확정 | 성격 |
|---|---|---|---|
| **처치당 산출 개수** | 몬스터당 드롭 목록 1~6종, 배타적으로 굴리지 않는 것으로 보임 | **처치당 최대 1개** — "한 마리 = 최대 하나라야 리포트에서 인과가 1:1로 읽힌다" | **정면 충돌.** 단 IGM 의 다중 산출은 재료이고 본작의 1개는 장비다. 본작이 몬스터 재료를 채택하면 **"장비 최대 1개"와 "재료는 몇 개인가"가 별개 문제로 갈라진다** — item_design §1 은 `{안 나옴/장비/재료}` 배타 롤 하나로 합칠 계획인데, IGM 은 배타로 안 굴린다 |
| **희귀도** | 없음(§2) | 4단 계단 = 통제 가능성 | 대조군. DV2 와 같은 진영 |
| **접사·개체 굴림** | 없음(§5) | 접사 + 개체 굴림이 파밍의 본체 | 대조군. **IGM 에는 「아이템 정리」가 거의 없다** — 정리할 개체 편차가 없으므로 창고 관리(팔까/보관할까)만 남는다. 본작 컨셉 락의 "접속 중 = 원정 + **아이템 정리**"가 IGM 에는 사실상 부재 |
| **아이템 점수** | 원리적으로 불필요 | §6 의 핵심 지표 | 8-6 참조 |
| **강화의 자원** | 확인된 강화는 **시약 1개 = 상위 개조 1회**(§4-3), 골드 소모 강화 없음 | 강화 = 골드 소모로 접사 증폭 (골드의 최종 소모처) | 대조. **IGM 의 골드 싱크는 시설 확장**(창고·슬롯·속도)이다. 본작 §10 「골드의 싱크」가 미확정인데, IGM 은 그것을 **가방/창고 확장**으로 푼 사례 — 본작도 §1 에서 "가방 확장 수단(재화 소모 등)은 미정"으로 열어 뒀다 |
| **레벨 게이트** | 아이템에 요구 레벨이 없음(§2) | 착용 제약 = 요구 레벨만 | 대조. IGM 은 요구 레벨 대신 **재료 획득 난이도**가 게이트다 |

### 8-8. 한 줄 요약

**IGM 은 "굴림을 장비에서 빼고 재료 경제로 옮긴 파밍 RPG"다.** 그 대가로 아이템 정리가 얕아지고 개체 파밍의 재미가 없어졌지만, 대신 **타겟 파밍 축(§8-2)과 크래프트 가드(§8-3)를 규칙 없이 구조만으로 얻었다.** 본작이 굴림을 유지하는 이상 그 둘은 공짜로 오지 않으므로, IGM 이 보여주는 것은 **"몬스터별 재료를 채택하면 두 미확정 과제가 한꺼번에 풀린다"**는 것 하나다 — 본작 §10 이 이미 그렇게 예상해 둔 바를, 실물로 돌아가는 게임에서 확인한 것.

---

## 9. 출처 · 미확인(N/F) 총괄

### 9-1. 확보한 출처

| 출처 | 확보한 것 |
|---|---|
| `idleguildmaster.wiki.gg/wiki/Swords` (+ `action=raw`) | 검 15종 전수 제작표, 상위 개조 사슬, **rarity/tier/level 필드 부재 확인** |
| `.../wiki/Staffs` (+ raw) | 지팡이 13종 전수 제작표, 상위 개조 사슬 |
| `.../wiki/Enemies` (+ raw) | **몬스터 61종 전수 드롭 목록**(D1~D9 · R1~R5), D1 Spawn Rare % 7종, Troll Hide 20%, `{{EnemyStats}}` 템플릿 파라미터 구조 |
| `.../wiki/Pets` (+ raw) | 펫 체계 전문 — 알 7종, 펫 18종, 능력 13종 계수, 스킬 슬롯 해금 레벨표 |
| `.../wiki/Headquarters` (+ raw) | 시설 6종, 화폐 환율, 창고/시장/작업장 확장 비용, 영웅 특성 16종 이름 |
| `.../wiki/Dungeons_&_Raids` | 웨이브 해금 조건(100/150), 파티 인원, 사망 페널티, 레이드 3종 비교표 ⚠ **낡은 페이지**(§3-5) |
| `.../wiki/Drops` | Search 경로 확인, 초반 재료 3종 판매가 |
| `.../wiki/Items` (raw) | 무기군 4종 목록 = **위키 전체가 이것뿐**임을 확인 |
| `.../wiki/Special:AllPages` · `Special:Categories` | 위키 전체 28페이지 · 장비 카테고리 부재 확인 |
| Google Play (apkpure 경유) | **개발사 원문 설명 전문**, 버전 2.148 (2026-08-21) |
| 나무위키 `Guild master idle dungeons` (ko/en) | 4계통 모험가, 특성 0~2개 무작위, 선술집 선입선출, 11지역 주장, Void Core <1%, 후반 장비 이름 일부(프리즘 갑옷·Holy Conjugate·Skeleton Key·Champion Armor 등) |

### 9-2. 못 뚫은 것

| 대상 | 결과 |
|---|---|
| `incrementaldb.com` 게임 페이지·리뷰 | **403** (사전 고지대로) |
| Reddit 커뮤니티 가이드 | 여러 각도로 검색했으나 **이 게임의 장비 가이드가 인덱스에 없다** — 결과가 전부 동명이곡으로 흩어짐 |
| `idleguildmaster.info` (나무위키가 링크한 별도 위키) | 페이지 본문이 비어 반환됨(제목만). `/wiki/Main_Page` 도 동일 |
| 공식 Discord | 공개 인덱스에서 아이템 데이터 확인 불가 |
| `.../wiki/Equipment` | **"WIP" 한 줄짜리 빈 페이지** |
| Google Play 스토어 직접 fetch | 본문 truncate — apkpure 경유로 우회 |

### 9-3. 미확인(N/F) 총괄

| 항목 | 상태 |
|---|---|
| **장비 슬롯 구성 — 몇 부위인가** | **최대 공백.** 무기 슬롯만 확정(직업별 무기군 1종). 방패·벨트·반지·모자·로브·악세서리가 **존재한다는 것**은 드롭 아이템 이름으로 확인했으나(§1-2) 슬롯 개수·이름·중복 착용 여부 전부 미확인 |
| **희귀도 체계의 존재 여부** | raw 필드에 등급 칸이 없다는 강한 정황까지 확보(§2). "게임에 없다"의 100% 확정은 아님 |
| **처치당 드롭 개수** | 목록 전체를 각각 굴리는지, 하나를 뽑는지 불명(§3-3) |
| **드롭 확률 전반** | 위키 전체에서 확인된 것이 **Troll Hide 20% 하나**뿐. 나무위키가 Void Core <1% 를 하나 더 준다 |
| **D2~D9 의 Spawn Rare %** | D1 만 적혀 있다 |
| **활·단검 전수 제작표** | 위키에 페이지 없음 |
| **방어구·악세서리 제작표** | 위키에 페이지 없음 |
| **장비 강화 체계의 존재** | "upgrade equipment"[스토어]가 상위 개조(§4-3)를 가리키는 것인지 별개 강화인지 불명. 나무위키의 "포션으로 스탯 영구 상승"은 **영웅 쪽일 가능성이 높다**(§4-5) |
| **분해(salvage)** | 관련 서술을 어디서도 못 찾음. 정리 수단은 판매로 보임 |
| **알 드롭 확률** | 위키가 "rarely"라고만 적음 |
| **영웅 특성 16종의 개별 효과** | 이름만 확인 |
| **던전 수 9 vs 11** | 위키(9)와 나무위키(11) 충돌 |
| **copper vs Bronze 표기** | 위키 내부 불일치 |
| **Stellar Staff** | Sun Staff 의 후속 경로로 언급되나 항목 없음 |
| **레이드 R6·R7** | 위키에 섹션만 있고 내용 없음 |
| **에픽 레이드 "판매 불가 확정 보상"의 실물** | R1~R5 보스 드롭 이름은 확보했으나 스탯·효과는 나무위키의 단편 서술뿐 |

---
*마지막 업데이트: 2026-08-31 (최초 작성)*
