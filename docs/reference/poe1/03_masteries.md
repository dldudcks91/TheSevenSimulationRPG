# Path of Exile 1 — 마스터리(Mastery) 전체 카탈로그

> 상위 문서: [00_overview.md](00_overview.md)
> 짝 문서: [01_skills.md](01_skills.md) §2-3(마스터리 — 위치가 아니라 계열이 정체성을 정하는 4번째 노드)이 "마스터리는 노터블 하나로 열리고 전역에서 모드 풀을 공유한다"는 **개념**만 공식 트윗 인용으로 확인하고, 실제 마스터리 그룹 목록·각 그룹의 선택지 전문은 미조사로 남겨뒀다. 이 문서가 그 공백을 채운다.
> 상태: **신규 작성** (2026-09-10)
> 목적: 본작 마스터리(직업/죄종 탭, 수치/반응/변형 3분류)와 대조할 실제 대조군 확보 — PoE1 마스터리 그룹·선택지 실물 카탈로그
> ⚠ **이 문서의 수치는 전부 PoE1 의 수치다.** 본작 SSOT가 아니며 `src/data/*.csv` 로 옮기지 말 것
> ⚠ **PoE2 는 별도 게임이다.** PoE2 도 "Mastery"라는 이름의 시스템을 갖지만 구조·수치가 전혀 다르다(예: PoE2 는 스킬 젬 소켓 시스템 자체가 다르다, [00_overview.md §0](00_overview.md#0-조사-방법과-신뢰도)). 검색 결과 다수가 PoE2 로 오염되므로 원작 어휘(패시브 스킬 트리·노터블·클러스터)로 매번 재검증했다

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 |
| 1 | 마스터리 전역 구조 (요약) |
| 2 | 마스터리 그룹 전체 카탈로그 |
| 3 | 노터블 → 마스터리 연결 실제 예시 |
| 4 | 리스펙/재선택 비용 |
| 5 | 본작 대조 시사점 |
| 6 | 출처 · 미확인(N/F) 총괄 |

---

## 0. 조사 방법과 신뢰도

[00_overview.md §0](00_overview.md#0-조사-방법과-신뢰도)와 **동일한 신뢰도 표기**([공식]/[가이드]/[검색합성]/[커뮤니티]/[추정]/N/F)와 **PoE2 오염 배제 원칙**을 그대로 쓴다.

이 문서의 핵심 신규 출처는 **`poedb.tw`의 마스터리 그룹별 개별 문서**(`poedb.tw/us/{그룹명}_Mastery` 패턴, 예: `Life_Mastery`, `Fire_Mastery`)다. `poedb.tw`는 게임 데이터 파일을 직접 마이닝해 노출하는 커뮤니티 데이터베이스로, 00_overview.md §0 표에 별도 항목이 없어 이 문서에서는 **[가이드]와 동급으로 취급**한다(직접 WebFetch 성공, 해석·요약이 아니라 게임 내 텍스트 원문 노출이라는 점에서 오히려 빌드 가이드류보다 원출처에 가깝다). 반면 **`poewiki.net/wiki/List_of_Passive_Masteries`(전체 마스터리 목록을 담은 것으로 추정되는 이상적인 1차 문서)와 `pathofexile.fandom.com` 개별 노터블 페이지는 이번에도 각각 Anubis 봇 차단·HTTP 402 로 직접 크롤이 막혀** 원문을 확보하지 못했다(00_overview.md §0 이 이미 보고한 것과 동일한 차단 패턴) — 이 문서의 카탈로그는 poedb.tw 개별 페이지를 하나씩 **직접 조회해 존재를 확인한 그룹만** 신는다. 즉 그룹 목록의 "완전성"은 이 세션이 **URL을 정확히 추측해 조회를 시도한 범위 안에서만** 보장된다 — §6 참조.

---

## 1. 마스터리 전역 구조 (요약)

상세는 [01_skills.md §2-3](01_skills.md#2-3-마스터리--위치가-아니라-계열이-정체성을-정하는-4번째-노드) 참조, 여기서는 이 문서를 읽는 데 필요한 최소만 반복한다.

- **공식 발표 원문**[공식 — Path of Exile 공식 X 계정]: *"Allocating a passive in a cluster unlocks the Mastery and you can choose a specific stat to gain. These are shared by themed clusters across the Passive Skill Tree."*
- 특정 클러스터의 **노터블을 하나 찍으면** 그 클러스터의 마스터리 노드가 열린다. 마스터리 노드에 포인트 1개를 써서 **그룹의 선택지 목록 중 하나**를 고른다
- **같은 그룹(예: Fire Mastery)은 트리 전역 여러 클러스터에 흩어져 있지만 전부 같은 선택지 풀을 공유**한다 — 어디서 진입했든 같은 목록에서 고른다
- 같은 선택지는 **계정 전체(캐릭터 1인 기준)에서 한 번만** 고를 수 있다 — 즉 "Fire Mastery"라는 그룹 노드를 두 번 밟아도 이미 고른 선택지는 다시 고를 수 없다[가이드]
- 이번 조사로 처음 확인한 것: **그룹 하나당 보통 4~7개의 선택지**를 갖고, 그룹 자체가 **주제(원소/무기/스킬타입/자원)별로 최소 38개 이상** 존재한다(§2)

---

## 2. 마스터리 그룹 전체 카탈로그

> 표기: 그룹명은 poedb.tw 문서 제목 그대로(영문). 선택지 텍스트는 게임 내 원문 그대로(영문), 출처는 각 그룹 제목 옆에 일괄 표기. **모든 그룹이 [가이드 — poedb.tw 직접 WebFetch]** 다.

### 2-1. 자원·방어 계열 (8개)

| 그룹 | 확보 선택지 수 | 비고 |
|---|---|---|
| Attributes Mastery | 5 | |
| Life Mastery | 6 | |
| Mana Mastery | 6 | |
| Energy Shield Mastery | 6 | |
| Armour Mastery | 6 | |
| Evasion Mastery | 6 | |
| Block Mastery | 4 | |
| Leech Mastery | 6 (페이지 자체는 "9개"라 표기 — 3개 누락 추정, N/F) | |

**Attributes Mastery**
- 5% increased Attributes
- 1% increased Damage per 5 of your lowest Attribute
- +5 to Strength per Allocated Mastery Passive Skill
- +5 to Intelligence per Allocated Mastery Passive Skill
- +5 to Dexterity per Allocated Mastery Passive Skill

**Life Mastery**
- 10% more Maximum Life if you have at least 6 Life Masteries allocated
- 15% increased maximum Life if there are no Life Modifiers on Equipped Body Armour
- +30 to maximum Life
- You count as on Low Life while at 55% of maximum Life or below
- You count as on Full Life while at 90% of maximum Life or above
- Skills Cost Life instead of 15% of Mana Cost

**Mana Mastery**
- Regenerate 5 Mana per second
- Recover 10% of Mana over 1 second when you use a Guard Skill
- 10% of Damage taken Recouped as Mana
- 15% increased Mana Cost Efficiency
- 10% chance to Recover 10% of Mana when you use a Skill
- 12% increased Mana Reservation Efficiency of Skills

**Energy Shield Mastery**
- Light Radius is based on Energy Shield instead of Life / 30% increased Light Radius
- 10% less Physical Damage Taken while on Full Energy Shield
- 50% of your Energy Shield is added to your Stun Threshold
- Regenerate 2% of Energy Shield per second
- 30% of Chaos Damage taken does not bypass Energy Shield
- 100% increased Energy Shield from Equipped Helmet

**Armour Mastery**
- +1 Armour per 2 Strength
- You take 30% reduced Extra Damage from Critical Strikes
- 20% chance to Defend with 200% of Armour
- +1% to all maximum Elemental Resistances if Equipped Helmet, Body Armour, Gloves, and Boots all have Armour
- 20% increased Armour per second you've been stationary, up to a maximum of 100%
- 100% increased Armour from Equipped Boots and Gloves

**Evasion Mastery**
- Cannot be Stunned if you haven't been Hit Recently
- 40% increased Evasion Rating if you have been Hit Recently
- 10% increased Movement Speed if you haven't taken Damage Recently
- 30% chance to Avoid being Poisoned / 30% chance to Avoid Bleeding / 30% chance to Avoid being Impaled
- +15% chance to Suppress Spell Damage if Equipped Helmet, Body Armour, Gloves, and Boots all have Evasion Rating
- 100% increased Evasion Rating from Equipped Body Armour

**Block Mastery**
- +2% to maximum Chance to Block Attack Damage
- +2% to maximum Chance to Block Spell Damage
- 20 Life gained when you Block / 20 Mana gained when you Block
- +1% Chance to Block Spell Damage per 5% Chance to Block Attack Damage

**Leech Mastery** (N/F — 페이지가 "9개"라 언급했으나 6개만 추출됨)
- 5% of Leech is Instant
- 40% increased Armour and Evasion Rating while Leeching
- 25% more Damage with Hits against Enemies that cannot have Life Leeched from them
- 25% of Damage taken Recouped as Life if Leech was removed by Filling Unreserved Life Recently
- 100% increased total Recovery per second from Life, Mana, or Energy Shield Leech
- 25% increased Maximum total Life, Mana and Energy Shield Recovery per second from Leech

### 2-2. 원소·피해속성 계열 (6개)

| 그룹 | 확보 선택지 수 | 비고 |
|---|---|---|
| Fire Mastery | 6 (페이지는 "8개"라 표기 — 2개 누락 추정, N/F) | |
| Cold Mastery | 7 | |
| Lightning Mastery | 6 | |
| Chaos Mastery | 6 | |
| Physical Mastery | 6 | |
| Elemental Mastery | 6 | |

**Fire Mastery** (N/F — 2개 누락 추정)
- Fire Exposure you inflict applies an extra -5% to Fire Resistance
- 40% of Physical Damage Converted to Fire Damage
- Burning Enemies you kill have a 3% chance to Explode, dealing a tenth of their maximum Life as Fire Damage
- +12% to Fire Damage over Time Multiplier / 50% increased Ignite Duration on you
- Regenerate 1 Life per second for each 1% Uncapped Fire Resistance
- Critical Strikes do not inherently Ignite / 100% increased Damage with Hits against Ignited Enemies

**Cold Mastery**
- 40% of Physical Damage Converted to Cold Damage
- 10% Chance to Inflict Cold Exposure on Hit with Cold Damage
- -30% to Fire Resistance
- +1 to Level of all Cold Skill Gems
- +1% to Cold Damage over Time Multiplier for each 4% Overcapped Cold Resistance
- Chills from your Hits always reduce Action Speed by at least 10%
- Enemies permanently take 5% increased Damage for each second they've ever been Frozen by you, up to a maximum of 50%

**Lightning Mastery**
- 40% of Physical Damage Converted to Lightning Damage
- 60% increased Critical Strike Chance against enemies with Lightning Exposure
- +15% to Maximum Effect of Shock
- Shocks you inflict spread to other Enemies within 1 metre
- Increases and reductions to Maximum Mana also apply to Shock Effect at 30% of their value
- Lightning Damage of Enemies Hitting you while you're Shocked is Unlucky

**Chaos Mastery**
- Recover 1% of Life per Withered Debuff on each Enemy you Kill
- +1 to Level of all Chaos Skill Gems / Lose 10% of Life and Energy Shield when you use a Chaos Skill
- +1% to maximum Chaos Resistance
- 40% of Physical Damage Converted to Chaos Damage
- Deal 10% more Chaos Damage to enemies which have Energy Shield
- 5% chance when you inflict Withered to inflict up to 15 Withered Debuffs instead

**Physical Mastery**
- Prevent +60% of Reflected Physical Damage
- 10% more Maximum Physical Attack Damage
- Cannot be Stunned by Hits that deal only Physical Damage
- Hits have 50% chance to ignore Enemy Physical Damage Reduction
- 40% increased Physical Damage with Skills that Cost Life
- +6% to Damage over Time Multiplier for Bleeding per Impale on Enemy

**Elemental Mastery**
- Exposure you inflict applies at least -18% to the affected Resistance
- Prevent +60% of Reflected Elemental Damage
- 50% reduced Effect of Exposure on you
- Hits have 15% chance to treat Enemy Monster Elemental Resistance values as inverted
- Critical Strikes against you do not inherently inflict Elemental Ailments
- 3% chance for Hits to deal 300% of Physical Damage as Extra Damage of a random Element

### 2-3. 공격·치명·상태 계열 (8개)

| 그룹 | 확보 선택지 수 | 비고 |
|---|---|---|
| Attack Mastery | 6 | |
| Critical Mastery | 6 | |
| Accuracy Mastery | 6 | |
| Projectile Mastery | 6 | |
| Duration Mastery | 4 | |
| Spell Suppression Mastery | 6 | |
| Stun Mastery | 6 | |
| Charge Mastery | 6 | |

**Attack Mastery**
- +0.3 metres to Melee Strike Range
- Non-Vaal Strike Skills target 1 additional nearby Enemies
- Remove Damaging Ailments when you Change Stance / Stance Skills have +6 seconds to Cooldown
- Monsters cannot Block your Attacks
- 5% increased Attack Speed per Enemy in Close Range
- Attack Skills Cost Life instead of 20% of Mana Cost

**Critical Mastery**
- 50% increased Effect of non-Damaging Ailments you inflict with Critical Strikes
- +25% to Critical Strike Multiplier against Unique Enemies
- Stuns from Critical Strikes have 100% increased Duration
- +3 to Level of all Critical Support Gems
- You take 30% reduced Extra Damage from Critical Strikes
- 150% increased Critical Strike Chance against Enemies that are on Full Life

**Accuracy Mastery**
- 40% more Accuracy Rating against Unique Enemies
- Gain Accuracy Rating equal to your Intelligence
- Dexterity's Accuracy Bonus instead grants +3 to Accuracy Rating per Dexterity
- 50% more Accuracy Rating at Close Range
- +500 to Accuracy Rating
- -2 to Accuracy Rating per Level

**Projectile Mastery**
- Projectiles deal 20% increased Damage with Hits and Ailments for each Enemy Pierced
- Projectiles deal 20% increased Damage with Hits and Ailments for each time they have Chained
- 1% increased Projectile Damage per 16 Dexterity
- Knock Back Enemies if you get a Critical Strike with Projectile Damage
- 15% more Projectile Speed
- 15% less Projectile Speed

**Duration Mastery**
- 10% more Skill Effect Duration
- 10% less Skill Effect Duration
- Debuffs on you expire 15% faster
- 20% reduced Elemental Ailment Duration on you

**Spell Suppression Mastery**
- Prevent +3% of Suppressed Spell Damage
- Inflict Fire, Cold and Lightning Exposure on Enemies when you Suppress their Spell Damage
- Prevent +1% of Suppressed Spell Damage per Hit Suppressed Recently / -2% chance to Suppress Spell Damage per Hit Suppressed Recently
- Suppressed Spell Damage cannot inflict Elemental Ailments on you
- You have Phasing if you have Suppressed Spell Damage Recently / +8% chance to Suppress Spell Damage while Phasing
- Chance to Suppress Spell Damage is Lucky

**Stun Mastery**
- 100% increased Enemy Stun Threshold / 200% increased Stun Duration on Enemies
- 20% chance to gain an Endurance Charge when you Stun an Enemy with a Melee Hit
- +50% to Critical Strike Multiplier against Stunned Enemies
- Hits against you Cannot be Critical Strikes if you've been Stunned Recently
- 25% chance to deal a Stunning Hit to Nearby Enemy Monsters when you're Stunned
- Gain Adrenaline when Stunned, for 2 seconds per 100ms of Stun Duration

**Charge Mastery**
- Cannot be Ignited while at maximum Endurance Charges
- Cannot be Chilled while at maximum Frenzy Charges
- Cannot be Shocked while at maximum Power Charges
- 100% increased Charge Duration
- 3% increased Damage per Endurance, Frenzy or Power Charge
- Nearby Enemies cannot gain Power, Frenzy or Endurance Charges

### 2-4. 무기군 계열 (9개)

| 그룹 | 확보 선택지 수 | 비고 |
|---|---|---|
| Bow Mastery | 6 | |
| Sword Mastery | 6 | |
| Axe Mastery | 6 | |
| Mace Mastery | 6 | |
| Dagger Mastery | 6 | |
| Claw Mastery | 6 | |
| Wand Mastery | 6 | |
| Staff Mastery | 7 | |
| Martial Mastery | 3 (N/F — 양손무기/힘 계열 총칭 추정, 페이지 추출 불완전) | |

**Bow Mastery**
- Blink Arrow and Mirror Arrow have 100% increased Cooldown Recovery Rate
- 20% increased Area of Effect while wielding a Bow
- Arrows gain Critical Strike Chance as they travel farther, up to 100% increased Critical Strike Chance
- 100% increased Mirage Archer Duration
- 20% increased bonuses gained from Equipped Quiver
- Increases and Reductions to Projectile Speed also apply to Damage with Bows

**Sword Mastery**
- +0.3 metres to Melee Strike Range with Swords
- 20% chance to Impale Enemies on Hit with Attacks
- 8% chance to gain a Frenzy Charge when you Hit a Unique Enemy
- Off Hand Accuracy is equal to Main Hand Accuracy while wielding a Sword
- 120% increased Critical Strike Chance with Swords / -20% to Critical Strike Multiplier with Swords
- 50% reduced Enemy Chance to Block Sword Attacks

**Axe Mastery**
- Enemies Killed by your Hits are destroyed
- Bleeding you inflict deals Damage 15% faster
- 40% increased Effect of Onslaught on you
- 30% increased Damage while in Blood Stance / 15% increased Area of Effect while in Sand Stance
- 10% more Damage with Hits and Ailments against Enemies that are on Low Life
- Gain 2 Rage on Hit with Axes

**Mace Mastery**
- All Damage with Maces and Sceptres inflicts Chill
- 20% increased Area of Effect if you've dealt a Critical Strike Recently
- Crush Enemies on hit with Maces and Sceptres
- 12% chance to deal Double Damage with Attacks if Attack Time is longer than 1 second
- 50% increased Stun Duration on Enemies
- Hits that Stun Enemies have Culling Strike

**Dagger Mastery**
- +100% to Critical Strike Multiplier against Enemies that are on Full Life
- Critical Strikes have Culling Strike
- +10% chance to Suppress Spell Damage for each Dagger you're Wielding
- 8% more Damage with Hits and Ailments against Enemies affected by at least 5 Poisons
- 50% increased Projectile Speed while wielding a Dagger
- Elusive also grants +40% to Critical Strike Multiplier for Skills Supported by Nightblade

**Claw Mastery**
- Gain 25 Life per Enemy Hit with Main Hand Claw Attacks / Gain 25 Mana per Enemy Hit with Off Hand Claw Attacks
- Inherent Attack Speed bonus from Dual Wielding is doubled while wielding two Claws
- 60% increased Damage with Claws against Enemies that are on Low Life
- 10% of Life Leech is Instant per Equipped Claw
- 50% increased Stealth if you've Hit With a Claw Recently
- Skills Supported by Nightblade have 40% increased Effect of Elusive

**Wand Mastery**
- 10% chance to gain a Power Charge on Critical Strike with Wands
- 25% increased Mana Reservation Efficiency of Skills Supported by Spellslinger
- Wand Attacks fire an additional Projectile
- Attacks have 100% Arcane Might while wielding a Wand
- 0.5% of Attack Damage Leeched as Life / 0.5% of Attack Damage Leeched as Mana
- Intelligence is added to Accuracy Rating with Wands

**Staff Mastery**
- Recover 2% of Energy Shield when you Block Spell Damage while wielding a Staff
- Recover 2% of Life when you Block Attack Damage while wielding a Staff
- 30% increased Defences while wielding a Staff
- +8% Chance to Block Attack Damage if you've Stunned an Enemy Recently
- 12% increased maximum Life and Mana if your equipped Staff has a Red and Blue Socket
- Gain Unholy Might on Block for 3 seconds
- +60% to Critical Strike Multiplier if you haven't dealt a Critical Strike Recently

**Martial Mastery** (N/F — 이 카테고리는 확보분이 특히 부족하다)
- 10% increased Attack Speed with Two Handed Melee Weapons
- 10% increased Attack Speed if you have at least 600 Strength
- +20 to Strength

### 2-5. 스킬타입·유틸 계열 (7개)

| 그룹 | 확보 선택지 수 | 비고 |
|---|---|---|
| Curse Mastery | 6 | |
| Reservation Mastery | 6 | 오라/저주 예약 통합 그룹으로 추정 — 별도 "Aura Mastery"는 이번 조사에서 못 찾음 |
| Totem Mastery | 6 | |
| Trap Mastery | 6 | |
| Mine Mastery | 6 | |
| Flask Mastery | 6 | |
| Warcry Mastery | 6 | |

**Curse Mastery**
- +20% chance to Ignite, Freeze, Shock, and Poison Cursed Enemies
- You take 40% reduced Extra Damage from Critical Strikes by Cursed Enemies
- Non-Cursed Enemies you inflict Non-Aura Curses on are Blinded for 4 seconds
- Your Curses have 20% increased Effect if 50% of Curse Duration expired
- Enemies you Curse are Hindered, with 15% reduced Movement Speed
- Recover 1% of Life when you Curse a Non-Cursed Enemy / Recover 1% of Mana when you Curse a Non-Cursed Enemy

**Reservation Mastery**
- 8% increased Damage for each of your Aura or Herald Skills affecting you
- +1% to all maximum Elemental Resistances if you have Reserved Life and Mana
- 20% increased Life Reservation Efficiency of Skills
- 30% increased Area of Effect of Aura Skills
- Auras from your Skills have 10% increased Effect on you
- Non-Curse Aura Skills have 50% increased Duration

**Totem Mastery**
- Totems' Action Speed cannot be modified to below Base Value
- Skills that Summon a Totem have 30% chance to Summon two Totems instead of one
- 5% of Damage from Hits is taken from your nearest Totem's Life before you
- 1% of Physical Attack Damage dealt by your Totems is Leeched to you as Life
- 40% increased Critical Strike Chance if you've Summoned a Totem Recently
- Totems Taunt Enemies around them for 1 seconds when Summoned

**Trap Mastery**
- 5% chance to throw up to 4 additional Traps
- 8% Chance for Traps to Trigger an additional time
- Can have up to 5 additional Traps placed at a time
- 60% increased Trap Trigger Area of Effect
- Recover 30 Life when your Trap is triggered by an Enemy
- Traps cannot be Damaged

**Mine Mastery**
- Each Mine applies 2% increased Damage taken to Enemies near it, up to 10%
- Each Mine applies 2% reduced Damage dealt to Enemies near it, up to 10%
- 30% increased Effect of Auras from Mines
- Detonate Mines is Triggered while you are moving
- Mines cannot be Damaged
- Regenerate 2.5% of Life per Second if you've Detonated a Mine Recently

**Flask Mastery**
- Life Flasks gain 1 Charges every 3 seconds / Mana Flasks gain 1 Charges every 3 seconds
- Remove a random Elemental Ailment when you use a Mana Flask
- Remove a random Non-Elemental Ailment when you use a Life Flask
- 25% chance to gain a Flask Charge when you deal a Critical Strike
- Enemies you Kill that are affected by Elemental Ailments grant 100% increased Flask Charges
- Recover 4% of Life when you use a Flask

**Warcry Mastery**
- Warcries cannot Exert Travel Skills
- Recover 15% of Life when you use a Warcry
- Warcries have a minimum of 10 Power
- Warcries Debilitate Enemies for 1 second
- Remove all Damaging Ailments when you Warcry
- Warcries have 10% chance to Exert 3 additional Attacks

### 2-6. 확인 실패 그룹 — URL 추정 실패 (N/F)

다음 그룹명은 이번 세션에서 `poedb.tw/us/{이름}_Mastery` 패턴으로 추측 조회했으나 **모두 HTTP 404**였다. **그룹 자체가 존재하지 않는다는 뜻이 아니라, 이 세션이 정확한 URL/슬러그를 못 찾았다는 뜻**이다 — 특히 Minion·Golem 계열은 실제로 존재할 개연성이 높다(검색 중 `Mastery~minion~and~damage` 라는 내부 위키 ID 파편을 확인했으나 poedb 슬러그로 역산 못함[검색합성]):

| 시도한 이름 | 상태 |
|---|---|
| Minion Mastery / Minion Damage Mastery | N/F — 내부 ID `minion~and~damage` 흔적만 확인, 실제 슬러그·선택지 미확보 |
| Golem Mastery | N/F |
| Herald Mastery | N/F — Reservation Mastery 옵션 1번("Aura or Herald Skills")에 헤럴드가 일부 흡수된 것으로 보이나 확정 못함 |
| Guard Skill Mastery | N/F — Mana Mastery 옵션 2번에 Guard Skill 관련 효과가 있어 별도 그룹이 아닐 가능성[추정] |
| Ailment Mastery(단독) | N/F — 개별 상태이상 관련 옵션은 Evasion/Physical/Fire/Cold/Chaos Mastery 안에 분산돼 있어, "Ailment" 단독 그룹이 아예 없을 가능성[추정] |
| Unarmed Mastery | N/F |
| Buff Mastery | N/F |
| Spell Mastery(단독) | N/F — 스펠 관련 옵션이 여러 원소별 그룹(Fire/Cold/Lightning/Chaos Mastery)의 "+1 to Level of all X Skill Gems" 류로 분산된 것으로 보임[추정] |
| Area of Effect Mastery(단독) | N/F — AoE 옵션은 Bow/Axe/Mace/Trap Mastery 등에 분산 확인됨 |
| Cast Speed Mastery(단독) / Attack Speed Mastery(단독) | N/F — 공격속도 옵션은 Martial/Attack/Sword Mastery 안에서만 확인됨. 캐스트 속도 단독 옵션은 이번 조사에서 전혀 못 찾음 |
| Two-Handed Mastery(단독, Martial과 별개) | N/F |
| Damage Mastery / Spell Damage Mastery(범용) | N/F |

> **이번 조사로 실제 선택지 전문까지 확보한 그룹은 총 38개**다(§2-1~2-5 합산: 8+6+8+9+7). PoE1 마스터리 총 그룹 수의 공식 확정치는 이번에도 못 구했다(01_skills.md §6-2 가 이미 "노드 4종의 정확한 개수 분포는 미확인"이라 표기한 것과 같은 공백) — 38개는 **이 세션이 확인한 하한선**이지 전체 개수가 아니다.

---

## 3. 노터블 → 마스터리 연결 실제 예시

> 주의 — poedb.tw 개별 노터블 페이지와 poewiki.net 목록 페이지 모두 "이 노터블이 정확히 어느 마스터리 그룹을 여는지"를 한 화면에 보여주지 않는다(트리 좌표 그래프 데이터라 텍스트 추출로는 인접 관계가 안 잡힘). 아래는 **① 노터블이 실제로 존재하고 그 효과 텍스트가 맞다는 것은 확인**했지만, **② "이 노터블의 클러스터가 여는 마스터리 그룹이 정확히 이것"이라는 연결은 클러스터 주제(테마) 일치에 근거한 추정**[추정]이다 — 01_skills.md §2-3 이 인용한 공식 규칙("노터블 하나 = 그 클러스터 마스터리로 가는 관문")을 각 사례에 대입한 것이지, 트리 좌표를 직접 눈으로 확인한 것은 아니다.

| 노터블(영문) | 확인된 효과[가이드/검색합성] | 추정 연결 마스터리 그룹[추정] |
|---|---|---|
| **Discipline and Training** | "+30 to maximum Life", "10% increased maximum Life" — poedb.tw 직접 확인[가이드] | Life Mastery — 생명력 테마 노터블이 생명력 클러스터에 있고, 그 클러스터가 Life Mastery 를 연다는 일반 규칙 적용 |
| **Heart of Ice** | "30% increased Cold Damage", "Damage Penetrates 6% Cold Resistance"[검색합성 — 원문 페이지 직접 확보는 못함] | Cold Mastery |
| **Whispers of Doom** | 저주 슬롯(활성 저주 한도)을 1개 늘림[검색합성] | Curse Mastery |
| **Master of Fire** | "Nearby Enemies have Fire Exposure (Fire Exposure applies -10% to Fire Resistance for 4 seconds)" — poedb.tw 직접 확인[가이드]. 단 이 노터블은 **본트리가 아니라 클러스터 주얼(Cluster Jewel) 전용**이다 | Fire Mastery — **다만 클러스터 주얼의 마스터리 풀이 본트리와 완전히 같은 풀인지는 미확인**[N/F]. 이 사례는 "노터블→마스터리" 관문 규칙이 클러스터 주얼에도 적용된다는 것을 보여주는 방계 증거로만 싣는다 |

**일반 규칙 자체는 두 개의 독립 출처로 확인된 것**[공식/가이드]: (1) 공식 트윗 "Allocating a passive in a cluster unlocks the Mastery"(§1), (2) Maxroll 가이드 "Notable ... 대응하는 마스터리로 가는 관문이기도 하다"([01_skills.md §2-1 표](01_skills.md#2-1-노드-4종-정의--maxroll-원문)). 다만 **"어느 노터블이 정확히 어느 마스터리 그룹을 여는가"의 1:1 매핑 표는 이번 조사에서도 확보하지 못했다** — 트리 전체(1325 노드)를 좌표 단위로 훑어야 나오는 정보라 텍스트 검색/WebFetch 로는 한계가 있다.

---

## 4. 리스펙/재선택 비용

- **일반 패시브 포인트 환불** — Orb of Regret 1개당 포인트 1개[검색합성, 01_skills.md §2-4 기존 확인]. **어센던시 포인트는 1개당 5오브**[검색합성, 01_skills.md §2-4]
- **신규 확인 — 골드 기반 리스펙(3.25 "Settlers of Kalguur" 리그 도입)**: Orb of Regret 외에 **골드를 지불하는 리스펙 수단이 추가**됐다. 환불하는 노드 하나마다 골드를 내며, 비용은 **캐릭터 레벨에 비례해 커진다**[검색합성 — 정확한 공식/수치표는 확보 못함, N/F]. 이 골드 리스펙이 마스터리 노드에도 동일하게 적용되는지는 별도로 확인 못했으나, 마스터리도 일반 패시브 포인트를 소비하는 노드이므로 **적용될 개연성이 높다**[추정]
- **마스터리 "선택 자체"의 재선택 비용 — 이번에도 N/F.** 01_skills.md §2-4 가 이미 "마스터리 자체의 재할당 비용은 미확인"이라 남긴 항목을 이번에 재시도했으나, 다음 두 가지를 구분하는 1차 자료를 찾지 못했다:
  1. **마스터리 노드 자체를 언스펙(포인트 회수)하는 비용** — 이건 일반 패시브 포인트와 같은 규칙(Orb of Regret 또는 골드)이 적용될 것으로 보임[추정]
  2. **이미 마스터리 노드에 포인트를 쓴 상태에서, 그 노드가 주는 "선택지"만 다른 것으로 바꾸는 것**(포인트 회수 없이) — 이게 무료인지, 혹은 애초에 불가능해서 반드시 ①의 언스펙을 거쳐야 하는지가 **핵심 미확인 사항**이다. Maxroll 가이드·PoE Wiki 요약 모두 이 구분을 명시하지 않았다(§6)

---

## 5. 본작 대조 시사점

**전제** — 본작 마스터리는 직업 탭·죄종 탭 2계열, 각 노드가 **수치/반응/변형** 3분류 중 하나이고 **무료 롤백**이다. PoE1 마스터리는 **위치가 아니라 계열(그룹)이 정체성**이고, 노터블이 관문이며, 리스펙은 유상(Orb of Regret/골드, §4)이다.

1. **PoE1 마스터리 선택지 상당수가 본작의 "변형" 분류에 가깝다 — 단순 수치업은 오히려 소수다.** §2 카탈로그 228개(38그룹×평균 6개) 선택지를 훑으면:
   - **수치형**(단순 증가/감소): Life Mastery "+30 to maximum Life", Armour Mastery "+1 Armour per 2 Strength", Accuracy Mastery "+500 to Accuracy Rating" — 그룹당 보통 1~2개뿐
   - **반응형**("~하면 ~한다" 조건부): Evasion Mastery "Cannot be Stunned if you haven't been Hit Recently", Totem Mastery "40% increased Critical Strike Chance if you've Summoned a Totem Recently", Chaos Mastery "Recover 1% of Life per Withered Debuff on each Enemy you Kill" — 그룹당 2~3개, 가장 흔한 유형
   - **변형형**(작동 방식 자체를 바꿈): Fire Mastery "Critical Strikes do not inherently Ignite"(치명타의 기본 작동을 재정의), Life Mastery "Skills Cost Life instead of 15% of Mana Cost"(자원 소모 축 자체를 바꿈), Mana Mastery "Recover 10% of Mana over 1 second when you use a Guard Skill"(스킬 카테고리 하나를 새로 참조)
   - **본작 3분류에 없는 4번째 패턴 — "트레이드오프형"이 마스터리에도 있다**: Sword Mastery "120% increased Critical Strike Chance with Swords **/ -20% to Critical Strike Multiplier with Swords**"(같은 선택지 하나 안에 상승과 하락이 함께 있음), Fire Mastery "+12% to Fire Damage over Time Multiplier **/ 50% increased Ignite Duration on you**"(자신도 같은 효과를 더 오래 받게 됨). [01_skills.md §2-2](01_skills.md#2-2-대표-키스톤--실제-예시로-보는-규칙을-바꾸는-노드)가 **키스톤**에서 확인한 "얻는 것 하나당 잃는 것 하나" 패턴이, 이번 조사로 **마스터리에도 그대로 나타난다는 것**을 새로 확인했다 — PoE1 은 트레이드오프를 노드 종류 하나에 가두지 않고 여러 층에 반복 배치한다
2. **PoE1 마스터리는 "무료 재선택"이 확정되지 않은 유상 시스템일 가능성이 높다(§4).** 본작이 "무료 롤백"을 마스터리의 핵심 계약으로 이미 확정했다면, 이는 PoE1 을 그대로 따르는 게 아니라 **의도적으로 다른 지점**이라는 뜻이다 — PoE1 조사 결과가 이 계약을 뒤집을 근거는 없다(오히려 "결정성"을 지키려는 PoE1 의 일반 기조, [01_skills.md §1-7](01_skills.md#1-7-액티브--파밍-접점-vs-패시브--레벨-접점--poe1-안에서도-나뉜다)와 대비되는 지점으로 기록해둘 가치는 있음)
3. **"같은 그룹 = 같은 풀 공유"라는 처리가, 본작이 직업 탭/죄종 탭을 나눈 것과는 다른 축의 유연성이다.** 본작은 "어느 탭이냐"로 나누지만, PoE1 은 "그룹 라벨이 무엇이냐"(Fire/Bow/Curse 등 38개+)로 나눈다. 본작이 노드 수를 늘리고 싶을 때, **탭을 늘리는 대신 PoE1 식으로 "테마 그룹"을 늘리는 방식**(예: "화속성 마스터리"를 직업 탭과 죄종 탭 양쪽에서 접근 가능하게)도 검토 가치가 있다 — 다만 이는 새 구조 제안이라 판단은 유보하고 기록만 남긴다
4. **그룹 하나당 4~7개 선택지 중 1개만 고른다는 규모감**이, 본작 마스터리 탭 하나당 노드 밀도를 가늠하는 참고 눈금이 될 수 있다 — PoE1 은 "그룹이 38개+, 그룹당 평균 6개 선택지"라는 규모로 방대한 배리에이션을 만든다

---

## 6. 출처 · 미확인(N/F) 총괄

### 6-1. 출처

**공식**
- Path of Exile 공식 X(트위터) 계정 — 마스터리 도입 발표 원문(01_skills.md §2-3 에서 이미 인용, 이 문서는 재인용만)

**가이드(직접 WebFetch 성공)**
- `poedb.tw` 개별 마스터리 그룹 페이지 38개(§2-1~2-5 목록) — 이번 조사의 핵심 신규 출처
- Maxroll.gg 패시브 트리 입문 가이드(재확인 — 노터블-마스터리 관문 규칙 재인용)

**검색합성(WebSearch, 원문 미확보)**
- 3.25 골드 기반 리스펙 도입 경위 및 개략 규칙(§4)
- 노터블 예시 3종(Heart of Ice·Whispers of Doom 효과 텍스트, §3) — poedb.tw 원문 직접 확보 실패, 검색 요약만
- `Mastery~minion~and~damage` 내부 위키 ID 파편(§2-6)

**차단·실패**
- `poewiki.net/wiki/List_of_Passive_Masteries`, `poewiki.net/wiki/Passive_Mastery` — Anubis 봇 차단(00_overview.md §0 이 이미 보고한 것과 동일 패턴)
- `pathofexile.fandom.com/wiki/Master_of_Fire` 등 개별 노터블 fandom 페이지 — HTTP 402
- `devtrackers.gg` 의 "[2021] All Passive Masteries" 게시물 — HTTP 403
- `web.archive.org` 경유 우회 — 툴 자체가 이 도메인 fetch 를 지원하지 않음. `r.jina.ai` 프록시 경유 우회 — Cloudflare 403

### 6-2. N/F 총괄

| 항목 | 상태 |
|---|---|
| **PoE1 마스터리 총 그룹 수의 공식 확정치** | 이번에 38개를 실물 확인했으나 이게 전체인지는 미확인. §2-6 에 나열한 10여 개 후보군은 존재 여부 자체가 N/F |
| **Fire Mastery·Leech Mastery 의 정확한 선택지 총수** | 페이지 자체가 각각 "8개"·"9개"라 언급했으나 실제 추출은 6개뿐 — 나머지는 추출 과정에서 누락된 것으로 추정, 원문 재확인 못함 |
| **Martial Mastery 의 전체 선택지** | 3개만 확보, 이 카테고리는 특히 부실 — 4번째 항목으로 나온 "클러스터 주얼 패시브"는 마스터리 옵션인지 자체가 불확실해 제외했다 |
| **마스터리 선택지 재선택(포인트 유지한 채 다른 옵션으로 변경)이 무료인지** | §4 참조 — 이번 조사에서도 확정 못함, 01_skills.md §2-4 의 기존 N/F 를 못 좁힘 |
| **노터블 → 마스터리 그룹의 정확한 1:1 매핑표** | §3 의 4개 사례 모두 테마 일치에 근거한 추정이지, 트리 좌표를 직접 확인한 것이 아니다 |
| **Minion/Golem/Herald/Ailment/Cast Speed/Attack Speed 단독 마스터리 그룹의 실존 여부** | §2-6 — URL 추정 실패, 존재하지 않는다는 확인도 아니고 존재한다는 확인도 아니다 |
| **골드 기반 리스펙(3.25)의 정확한 비용 공식** | "레벨 비례"라는 정성적 서술만 확보, 수치표는 N/F |

---
*마지막 업데이트: 2026-09-10 (신규 작성 — 마스터리 전체 카탈로그)*
