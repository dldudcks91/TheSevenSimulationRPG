# Lootun — 아이템 구조·옵션 전수 조사

> 상위 문서: [00_overview.md](00_overview.md)
> 짝 문서: [01_skills.md](01_skills.md)
> 상태: **구조 전수 확인 + 실측 우선순위·확률 데이터 심화** (2026-08-28)
> 목적: 본작의 **게임 형태 참고작**(CLAUDE.md)이 "아이템 개조가 압도적으로 두껍다"(00_overview.md §1)는 방향을 실제로 어떤 등급·부위·접사·소켓·세트 구조로 구현했는지 — diablo2/02_items.md 수준의 표로
> ⚠ **이 문서의 수치는 전부 Lootun의 수치다.** 본작 SSOT가 아니며 `src/data/*.csv`로 옮기지 말 것

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 |
| 1 | 슬롯 — 최대 16 + 유물 |
| 2 | 무기 — 3계열, 실전 우선순위 |
| 3 | 희귀도 = 속성 칸 수 |
| 4 | 속성(Attribute) 체계 — 3분류 × 랭크, 실전 우선순위 |
| 5 | 개조 도구 10종 — 이 게임의 본체 |
| 6 | 희귀도와 직교하는 카테고리 — Nemesis 확률 실측 |
| 7 | 젬과 소켓 — 캐릭터 단위 공유 슬롯 |
| 8 | 유물(Relic) |
| 9 | 인챈트 — Thorns 아키타입 실측 |
| 10 | 플라스크와 도구 |
| 11 | Divine 아이템 실례 |
| 12 | 본작 시사점 |
| 13 | 출처 · 미확인(N/F) 총괄 |

---

## 0. 조사 방법과 신뢰도

[01_skills.md §0](01_skills.md#0-조사-방법과-신뢰도)와 동일한 신뢰도 표기를 쓴다. 이번 아이템 심화에서 핵심 출처가 된 것은 **gameplay.tips의 "Choosing gear for your team"**(실전 우선순위 원문 확보)과 **"Nemesis Infusion Guide"**(500개체 표본 실측 확률)다 — 둘 다 [빌드가이드] 등급.

---

## 1. 슬롯 — 최대 16 [공식 #2]

| 분류 | 슬롯 | 비고 |
|---|---|---|
| 방어구 **9** | 투구 / 어깨 / 가슴 / 팔목 / 장갑 / 벨트 / 바지 / 신발 / 망토 | **Light/Medium/Heavy** 3종, 각각 다른 방어 속성(Barrier/Evasion/Armor — [01_skills.md §1](01_skills.md#1-구조-개관--클래스어센던시스킬-종류)의 클래스별 방어축과 그대로 대응) |
| 악세 **4** | 목걸이 / 반지×2 / 장신구(Trinket) | 공/방/유 전부 굴림. Trinket은 Archmage 서포트 빌드에서 딜 배분(+6%)이 있을 만큼 딜 슬롯으로도 쓰인다([01_skills.md §5-7](01_skills.md#5-7-mage--archmage-서포트-frostbolt-빌드가이드)) |
| 무기·보조 | §2 | 1H+방패/보조, 이도류, 2H 중 택 |
| **유물(Relic)** | 1 | 별도 축 — §8 |

---

## 2. 무기 — 3계열 × 세부 베이스 [공식 #2]

| 계열 | 한손 | 양손 |
|---|---|---|
| **Melee** | Axe / Sword / Dagger / Mace / Fist Weapon(+방패 또는 이도류) | Hammer / Polearm |
| **Ranged** | Pistol | Bow / Crossbow(+화살통) / Gun(양손 전용) |
| **Magic** | Spellblade / Spell Tome(+와드) | Staff(양손 전용) |

- **양손 무기는 베이스 속성값 2배** [공식 #2]
- 본작도 같은 문제를 다르게 푼다 — 양손 무기의 죄종 접사 = 2포인트(item_design.md §1). 두 게임 모두 "양손은 보상해야 한다"에 도달했다

### 2-1. 실전 무기 선택 우선순위 [빌드가이드]

"Choosing gear for your team" 가이드 원문에서 확인된 **오펜시브 스탯 우선순위**(DPS 기준):

```
공격속도 > 치명확률 > 치명피해 > 근접/원거리/마법 데미지 > 물리/화/냉/전/비전 데미지 > DoT > 데미지 > 원소 데미지
```

- **곱연산(Multiplicative) 옵션이 가산(Additive) 옵션보다 항상 우선** — 가이드 원문: "Picking items with multiplicative effects is generally advised over additive as they provide more stats at endgame." [00_overview.md §5-2](00_overview.md#5-피해-공식-요약)의 "피해 증가=전부 덧셈" 원칙과 겉으로 모순돼 보이지만, 실제로는 **같은 덧셈 버킷 안에서도 "몇 개의 서로 다른 태그에 걸치는가"가 실질 배율을 곱연산처럼 체감시킨다**는 뜻으로 해석된다(가이드 자체는 태그 구조를 설명하지 않음, 해석은 이 문서의 추정)
- **이도류(Dual-wield)는 +20% 데미지 배율**([빌드가이드], 정확히 어떤 조건에서 붙는 보너스인지는 N/F — 클래스 패시브인지 무기 자체 배율인지 불명)

---

## 3. 희귀도 = 속성 칸 수 (양적 계단) [공식 #2]

```
Uncommon 2 → Rare 3 → Epic 4 → Legendary 5 → Mythical 6
```

- 공식 등급은 5단계. 한 단계 오를 때마다 속성 칸 +1, 베이스 수치 시작값도 상승
- **[커뮤니티]** 제작 시 품질에 따라 속성이 5/10·6/10·7/10 랭크에 잠긴다
- 본작 4단계(질적 계단: 매직→레어→크래프트→유니크)와 정반대 — Lootun은 **칸이 하나씩 늘 뿐인 순수 양적 계단**이고, 통제권은 §5의 작업대가 판다

---

## 4. 속성(Attribute) 체계 — 3분류 × 랭크

### 4-1. 3분류 실제 항목 [공식 #7 / 가이드]

| 타입 | 실제 항목 |
|---|---|
| **Offensive** | 피해 타입 10종(Melee/Ranged/Magic/Physical/Fire/Cold/Lightning/Arcane/Elemental/DoT), 치명 확률·피해, Double/Triple Damage, 공격 속도, 관통(방어도/원소) |
| **Defensive** | 체력, 배리어, 방어도, 회피, Dodge, Block, 재생, 저항(원소·근접/원거리/마법), Ailment Avoidance, Stagger |
| **Utility** | Fortune/Luck/Wealth/Fate, 각종 저항, 채집 관련 |

- **랭크 표기 `[x/10]`, 랭크 1당 기본값의 +10%** → 만랭 10 = 기본값의 2배. Paragon으로 상한 20, Pristine으로 상한 자체 20 고정
- **저품질 아이템은 3칸, 최고품질은 3분류 전부 걸쳐 6칸까지** — "Low-quality items have 3 total stat slots; high-quality items can roll all 6 possible stats across the three categories" [빌드가이드](Starters Guide) — §3의 "2~6개 무작위 속성"과 정합

### 4-2. Utility 4종 실측 [가이드/커뮤니티]

| 스탯 | 효과 | 실측 |
|---|---|---|
| **Luck** | 드롭 품질/희귀도 | 스피드파밍 빌드 **2725%** |
| **Fortune** | 발견율 | 같은 빌드 **245%** |
| **Wealth** | 골드 | — |
| **Fate** | 경험치 — 개발자 직답 "100레벨 이후 성장이 막히면 Fate를 쌓아라" | — |

Marksman 스택형 버프(`Renewed Focus/Strength/Speed`, [01_skills.md §5-3](01_skills.md#5-3-ranger--marksman-스피드파밍-dps-빌드가이드))가 **+750 전체저항**을 부여한다는 것도 Utility·Defensive 경계의 실측 크기 감각을 보여준다.

### 4-3. 오펜시브 스탯 실전 우선순위 — §2-1과 동일 원문

DPS 기준 우선순위는 무기(§2-1)뿐 아니라 방어구·악세서리 전체에 적용되는 원칙으로 가이드에 서술돼 있다. 방어(Defensive) 축의 실전 우선순위는 **탱 한정으로 별도 확인**됐다 — §6-3 참고("HP > BC/BR > 공격속도/기타 방어" — Barrier Capacity/Barrier Regen으로 추정, 약어 원문 그대로 표기, N/F).

---

## 5. 개조 도구 10종 — 이 게임의 본체 [공식 #3 + 가이드]

| 도구 | 하는 일 | 통제의 성격 | 해금 |
|---|---|---|---|
| **Reroll Attributes** | 속성 재굴림 | 순수 RNG | Blacksmith |
| **Lock Attributes** | 원하는 속성을 잠그고 나머지만 리롤 | 부분 확정 | Blacksmith |
| **Randomise Ranks** | 수치(랭크)만 재굴림 | 2단 목표의 둘째 단 | Blacksmith |
| **Upgrade Attribute** | 크래프트 1회당 랭크 +1 | 확정 상승 | Blacksmith |
| **Transmute** | 속성 타입 변환(원거리→근접, 비전→화염) | 완전 확정 | Artisan's Hall r5~6 |
| **Imbue** | 아이템 A의 속성 전부를 B로 이식 — **B의 베이스 수치·보너스는 보존, A의 속성 배치(3-3→4-2 등)만 옮겨진다**([빌드가이드]로 재확인: "transfers modifiable attributes... while preserving destination item's baseline stats and bonuses") | 좋은 굴림의 이사 | Artisan's Hall r5~6 |
| **Imprint** | 속성 배치를 아이템 타입별 1개 저장 → 복제 | 성공 굴림의 재생산 | Artisan's Hall r5~6 |
| **Reinforcement** | 베이스 수치 강화. **방어구는 Armor/Evasion/Barrier 중 그 아이템 부위에 해당하는 하나, 무기는 Damage. 랭크당 +10%, 10랭크=+100%**([빌드가이드]로 대상 스탯 특정 확인) | 확정 성장 | Agony 전용 재료 |
| **Blessing** | 베이스 보너스 강화, 랭크당 +25%, 4랭크=+100%. **Divine 불가**([빌드가이드]로 재확인) | 확정 성장 | — |
| **Paragon** | 속성 랭크 상한 10→20 | 상한 돌파 | Keep |
| **Nemesis Infusion** | Nemesis 속성 이식 | 엔드게임 | Castle r3 |
| **Add Sockets** | 소켓 추가 | — | Gemcutter r2 |
| **Duplicate Equipment** | 강화·인챈트 포함 아이템 통째 복제 | 완전 복제 | [1.3] |

**구조 요약** — 하나의 계단:
```
굴림(Reroll) → 부분 확정(Lock) → 수치만 재굴림(Randomise Rank) → 확정 상승(Upgrade)
      → 타입 지정(Transmute) → 이사(Imbue) → 재생산(Imprint) → 상한 돌파(Paragon) → 복제(Duplicate)
```
각 칸이 별개 건물 랭크 + 별개 재료를 요구한다. 본작은 이 계단 전체를 희귀도 4단계 + 낙인 1종으로 압축했다 — 더 단순하지만 더 얕다.

---

## 6. 희귀도와 직교하는 카테고리

아래는 희귀도가 아니라 아이템에 붙는 **태그**다. Mythical이면서 동시에 Nemesis이자 Paragon일 수 있다 [커뮤니티].

| 카테고리 | 정체 |
|---|---|
| **Special(Unique)** | 고유 보너스를 가진 이름 있는 아이템. 특정 몹이 아무 레벨에나 드롭 — [itch] 350+ |
| **Divine** | 속성이 항상 10/10 만랭으로 스폰 + 특수 보너스. Blessing 불가 — [상점] 80+. 실례 §11 |
| **Nemesis** | 레벨 50+ 몹이 0.5% 확률로 스폰 → 그 드롭. 잠긴 속성 1개 이상, 랭크가 아이템 최대치를 초과 |
| **Enchanted / Paragon / Pristine** | 원 문서와 동일 |
| **Relic / Gem / Tool** | 별도 장착·소모 축 — §7·§8 |

### 6-1. Nemesis 강화 경로 (건물 랭크가 드롭 품질을 민다)

```
Watchtower r3 → 아이템당 Nemesis 속성 최대 3개
Watchtower r5 → Nemesis 속성 랭크 최대 8
Castle r1     → 최소 2개 보장
Castle r2     → 최소 랭크 4 보장
Castle r3     → Blacksmith Nemesis Infusion 해금
```

### 6-2. Nemesis 확률 — 실측 표본 데이터 [빌드가이드, Nemesis Infusion Guide]

이번 심화에서 새로 확보한 **500개체 실측 실험**:

| 실험 | 표본 | 결과 |
|---|---|---|
| 실험 1 | Mythical 500개 | Nemesis 속성 **2개** 244개 / **3개** 256개 — 거의 균등 |
| 실험 1 (랭크 분포, 4~8) | 위와 동일 표본 | 258 / 267 / 255 / 248 / 228개 — **랭크 4~8이 거의 균등 분포** (Watchtower r5의 "최대 8" 상한과 정합) |
| 실험 2 | Epic 100개 | 2개 51 / 3개 49 — 역시 균등 |

- **엔드게임 BiS 정의(재확인)**: Mythical(6칸) + Paragon 10(상한 20) + 상위 3개가 Nemesis(각 +8랭크)
- **확률**: 6속성 Mythical 제작 **1/5,000** · 4속성 Epic **1/1,000**

> 실측 데이터가 보여주는 것 — **Nemesis 속성 개수·랭크는 정규분포에 가깝게 균등하게 뽑힌다**(치우침 없음). 이는 "확정 상한(Watchtower r5=8) 안에서 순수 균등분포로 굴린다"는 단순한 RNG 설계라는 뜻이고, Lootun이 복잡한 개조 도구 계단(§5) 아래에 깔린 실제 확률 커널은 오히려 단순하다는 교차 확인이다.

### 6-3. 탱 방어 스탯 실전 우선순위 [빌드가이드, Tanks 가이드 스니펫]

```
HP > BC/BR(Barrier Capacity/Barrier Regen 추정) > 공격속도/기타 방어
```
- 공격속도가 **부분적으로 방어 스탯**으로 취급된다 — 배리어 재생을 더 빠르게 트리거하고, "신규 몹이 딜러를 때리기 전에 도발이 걸리는 시간"의 RNG 창을 줄여준다는 설명([빌드가이드])
- 탱 기어는 "상황에 따라 계속 바뀌어야 하는 유연한 슬롯"으로 서술됨([빌드가이드])

---

## 7. 젬과 소켓 — 캐릭터 단위 공유 슬롯 [커뮤니티/공식 #3]

- 젬은 개별 장비가 아니라 **캐릭터 소켓 탭 24칸**에 꽂힌다. 장착 장비의 총 소켓 수가 그중 몇 칸이 열리는지 결정
- 소켓 획득: **아이템 레벨 51+ 자연 굴림** / `Add Sockets` 크래프트
- 젬 교체는 언제든 무료

### 7-1. 젬 세트 보너스 — 정밀화

| 젬 | 개별 효과 | 세트 보너스 |
|---|---|---|
| Cut Ruby | +5 Adaptive Damage, +50% Damage | 대상 남은 HP 10%당 +1% Double Damage |
| Cut Opal | +300 Health, +1% Healing Effectiveness | (요구 5개) 잃은 HP 10%당 2% 피해 감소 |
| **Cut Amber** | **+50% Damage** — 이번 조사로 "+8% 공격속도(공격형쿨 사용 후 5초)"라는 원 문서 서술과 별개로, **"After using an offensive cooldown, +8% attack speed multiplier"** 형태로 재확인([커뮤니티]) | 공격형 쿨 사용 후 5초간 +8% 공격속도(동일 효과, 세트 보너스가 아니라 개별 효과일 가능성 — 원 문서와 표현 불일치, N/F로 취급) |
| **Cut Amethyst** | **+50 Adaptive Damage + 마스터리 레벨 보너스**([커뮤니티], 원 문서는 세트 효과만 "전 스킬 Mastery+5"로 서술했는데 **개별 효과에도 Adaptive Damage가 있다는 게 이번에 새로 확인**됨 | 전 스킬 Mastery 레벨 +5 (요구 개수 N/F) |

> **v3 보강**: Cut Amber/Amethyst는 개별 효과와 세트 효과가 부분적으로 겹쳐 보이는 서술이 있어(§7-1 각주), **정확한 "개별 vs 세트" 경계는 완전히 확정하지 못했다.** 다만 두 젬 다 **딜(Adaptive Damage/공격속도)과 마스터리(스킬레벨)를 동시에 미는 하이브리드**라는 성격 자체는 두 출처가 일치한다.

---

## 8. 유물(Relic) — 레벨 스케일 장비축 [공식 #2]

| 종류 | 희귀도 | 속성 |
|---|---|---|
| **Class Relic** | **레어 고정**([커뮤니티]로 재확인 — "Class relics can only be rare") | 항상 2개 |
| **Ascendancy Relic** | Mythical까지("can roll up to mythical quality") | 희귀도 한 단계당 +1개 + **어센던시 강점 기반 보너스 속성**("bonus attribute based on the strengths of the ascendancy required to equip the relic") |

- 특정 클래스/어센던시만 착용 가능. 속성이 캐릭터 레벨에 스케일 → 레벨업으로 버려지지 않는 유일한 장비
- Transmute는 유물에 총 1회만 허용 [가이드]
- **실전 사용례**: Templar 순딜 빌드(01_skills.md §5-6)가 "Marksman 유물"을 채택 — 만렙 시 +20%데미지. **자기 어센던시가 아닌 다른 어센던시의 유물도 착용 가능하다는 뜻**인지, 혹은 파티원(Ranger)의 유물을 지칭한 것인지는 가이드 원문만으로 확정하기 어렵다(N/F, 전자라면 원 문서의 "특정 클래스/어센던시만 착용 가능" 서술과 상충 — 후속 조사 필요)

> **본작에 없는 개념.** 파밍 게임의 고질적 문제(레벨 오르면 좋은 아이템도 버려짐)를 슬롯 하나로 우회했다.

---

## 9. 인챈트 [가이드/커뮤니티]

- 스크롤로 드롭 → 블랙스미스에서 "배운다"(영구 해금). 장비 1개당 인챈트 1개(양손 무기만 2개). 부위 전용. 총수 [상점]50+ vs [가이드]100~150+ 충돌

| 인챈트 | 효과 |
|---|---|
| **Blessed** | 치명 확률 100% 초과분이 Double Crit 확률로 전환 |
| **Thrash** | 스킬 사용 시 기본 공격 추가 시전(8%, 이전 10%) |
| **Censure** | DoT가 치명타 스케일을 받게 함 |
| **Recoil** | 방어 스탯을 Thorns로 전환 |
| **Reprisal** | Thorns가 공격속도로 스케일 |
| **Bane** | 물리 공격에 Poison Sting 시전 확률 |
| **Purify** | Stagger 스택 제거 |
| **Wrathful**(신규 확인) | 방패 인챈트, Wrathful 디버프 적용 시 **+10% 데미지**([빌드가이드], Templar 순딜 빌드) |

### 9-1. Thorns 아키타입 — 심화 확인 [빌드가이드, Thorns DPS 가이드]

원 문서 §5-4가 "규칙 밖의 피해축"으로 소개한 Thorns를, 이번 조사로 **스케일 경로 9개 전부를 실제 원문으로 재확인**했다:

```
Thorns 속성 롤 · 클래스/어센던시 Thorns 패시브 · Thorns 전용 아이템
· Recoil(방어스탯→Thorns) · Reprisal(공속→Thorns 스케일)
· 적 방어도 감소(%+관통) · 주무기 Reinforcement · 적 받는피해 증가 디버프 · 플라스크
```
- **엔드게임(포스트 Fated Augment, Heroic Risen Emperor 이후)부터 치명 확률·치명피해도 Thorns에 붙는다** — 원 문서 §5-4가 "엔드게임에서만 치명이 붙는다"로 뭉뚱그렸던 것을, **정확히 어느 시점(Heroic Risen Emperor 이후)인지 확정**했다
- **전환 상한 1200%** — Recoil 인챈트를 낀 상태에서 캐릭터 시트에 상한 대비 진행률이 표시된다
- **Reprisal은 광역기에 불리하다** — 데미지가 맞은 대상 전원에게 분산되므로, Thorns 빌드는 **단일 대상 유지형 스킬**을 선호해야 한다는 실전 팁 확인(신규 정보 — 원 문서에 없던 "Thorns와 AoE의 상충" 발견)
- Nature's Blessing이라는 **팩션 보너스**도 Thorns 스케일 경로 중 하나로 확인 — 원 문서 목록에 없던 항목

> **Thorns가 왜 "규칙 밖"인지 실전에서 재확인된다** — 9개 스케일 경로 중 태그 기반(피해타입·태그 매칭) 경로가 하나도 없다. 전부 "방어 스탯을 전환하거나", "공격속도/방어도 감소 같은 간접 수치를 재료로 쓴다". [01_skills.md §7](01_skills.md)의 아키타입 논의와 함께, 본작 나태 죄종 "반격" 설계 시 **"반격 전용 스케일 경로를 몇 개나 마련할 것인가"**의 참고 개수(9개)로 쓸 수 있다.

---

## 10. 플라스크와 도구

**플라스크** — 14종 [상점], Alchemist's Hut 제작. 미션 루프 전체 지속 버프. 재료는 직업 시스템(허브/보석)에서만. 업그레이드 축 Capacity/Strength 둘. 예: 힐 플라스크 최대HP 20%→만렙40%

**직업 도구(Tool)** [공식 #5] — 몬스터가 가끔 드롭. 일반 아이템과 같은 희귀도 체계를 따르되 도구 전용 속성. 채집 속도를 크게 민다 — 파밍 장비가 전투 장비와 별개 축으로 존재

---

## 11. Divine 아이템 실례 [빌드가이드, Choosing gear for your team]

원 문서에는 "속성이 항상 10/10 만랭 + 특수 보너스, Blessing 불가"라는 **규칙**만 있었는데, 이번 조사로 **실제 Divine 아이템 5종의 이름과 부위**를 확보했다:

| 이름 | 부위 | 비고 |
|---|---|---|
| Spider Silk Wraps | 팔목(Bracers) | — |
| Rockwall | 방패 | — |
| Brute's Pummeler | 피스트 무기 | — |
| Pillar of Flame | 지팡이(Staff) | **30% Skill Damage Ignite** — 스킬 발동 시 자동으로 30% 스킬데미지 점화를 건다는 뜻으로 읽힌다(가이드 원문 그대로, 정확한 트리거 조건은 N/F) |
| Malediction | 지팡이(Staff) | Archmage 서포트 빌드가 채택하는 저주 증강과 **동명** — 같은 아이템인지 우연히 이름이 겹치는 액티브 증강인지 확정 못함(N/F) |

> **Divine의 존재 이유가 실례로 드러난다** — "the item comparator can't quantify"([빌드가이드] 원문)라는 서술대로, Divine 5종 전부가 **수치 비교 툴로는 못 보여주는 조건부·트리거형 효과**(Pillar of Flame의 스킬점화, Malediction의 저주계열 추정)를 갖는다. §6의 "10/10 만랭 + 특수보너스" 규칙에서 "특수보너스"가 구체적으로 어떤 형태인지 처음 실물로 확인된 사례다.

---

## 12. 본작 시사점

1. **"곱연산 우선" 실전 조언과 "덧셈 공식" 규칙의 겉보기 모순은 태그 다양성으로 풀린다** — §2-1에서 확인했듯, Lootun 플레이어들은 실전에서 "곱연산처럼 보이는" 옵션을 우선하라고 말하지만 [00_overview.md §5-2](00_overview.md)의 공식은 순수 덧셈이다. 본작이 피해 공식을 확정할 때, **"공식은 덧셈이어도 플레이어 체감은 태그 매칭 개수에 따라 곱연산처럼 느껴질 수 있다"**는 것을 밸런스 문서에 명시해 두면 향후 "왜 이 옵션이 저평가/과평가되는가" 논쟁을 줄일 수 있다.
2. **Nemesis 확률이 예상보다 훨씬 단순한 균등분포라는 것(§6-2)은 "복잡한 겉모습 vs 단순한 커널"의 좋은 선례다.** 본작이 통제권 계단(item_design.md)을 설계할 때, 겉으로 보이는 크래프트 단계가 많아도 **각 단계 내부의 RNG 자체는 단순한 균등분포로 두는 편이 검증·밸런싱 부담을 줄인다**는 참고 사례.
3. **Divine의 "수치화 불가능한 조건부 효과"(§11)는 본작 유니크 가드레일과 다시 만난다** — Pillar of Flame(스킬 발동 시 자동 점화)은 diablo2 문서(§10-3)가 지적한 "유니크만의 비-수치 효과"와 같은 종류다. Lootun은 이걸 유니크가 아니라 **별도 희귀도 태그(Divine)**로 분리해 뒀다는 게 D2와 다른 지점 — 본작이 "일반 접사로 표현 안 되는 조건부 효과"를 허용하고 싶다면, 유니크 전체에 허용하기보다 **Divine처럼 별도 태그로 격리**하는 것도 절충안이 될 수 있다.
4. **Thorns의 9개 스케일 경로(§9-1)는 "회피 불가능한 규칙 밖 축"을 만들 때의 설계 밀도 기준이 된다.** 하나의 새 축을 만들 때 최소 9개의 서로 다른 재료(패시브·아이템·인챈트·소모품·적 디버프 등)를 준비해야 그 축이 "장난감이 아니라 진짜 빌드"로 성립한다는 게 실물 사례로 확인됐다.
5. **탱 방어 스탯 우선순위(§6-3)의 "공격속도가 부분적으로 방어"라는 발상**은 본작 전투 공식이 미확정인 지금 참고할 만하다 — 순수 회피/방어만이 아니라 "위협 관리를 앞당기는 속도" 자체를 방어 가치로 계산하는 방식.

---

## 13. 출처 · 미확인(N/F) 총괄

### 13-1. 이번 심화에서 새로 확보한 출처

- [gameplay.tips — Starters Guide](https://gameplay.tips/guides/lootun-starters-guide.html)
- [gameplay.tips — Nemesis Infusion Guide](https://gameplay.tips/guides/lootun-nemesis-infusion-guide-endgame-crafting.html)
- [Steam Community — Choosing gear for your team](https://steamcommunity.com/sharedfiles/filedetails/?id=3250506997)
- [Steam Community — The Thorns DPS archetype (updated for 1.2)](https://steamcommunity.com/sharedfiles/filedetails/?id=3353102085)
- [Steam Community — Best Ascendancy Classes for Mage and Ranger](https://steamcommunity.com/app/1960270/discussions/0/3381662461610566463/) (Relic 관련 스니펫)

### 13-2. 원 문서(§11-1)의 아이템 관련 출처 재확인 결과

- Deep Dive #2(장비) 원문 재열람 → **rate limit로 실패**, 원 문서 서술만 승계
- Walkthrough 0.9, "170T Endgame team", "Quick guide for Gear Progression" 원문 재열람 → **rate limit로 실패**, 스니펫 인용만 가능

### 13-3. 미확인(N/F) 총괄

| 항목 | 상태 |
|---|---|
| 벨트/부츠 등 방어구 부위별 개별 방어속성 수치표 | 원 문서에 이미 없었고 이번에도 미확보 |
| Cut Amber/Amethyst의 "개별 효과 vs 세트 효과" 정확한 경계 | §7-1 — 두 출처 표현 불일치 |
| Templar 빌드의 "Marksman 유물" 착용이 자기 자신인지 파티원 지칭인지 | §8 — 원 문서의 "특정 클래스만 착용" 규칙과 상충 가능성 |
| Pillar of Flame·Malediction의 정확한 트리거 조건 | §11 — Divine 개별 툴팁 미확보 |
| 이도류 +20% 데미지 배율의 정확한 발동 조건(클래스 패시브인지 무기 자체인지) | §2-1 |
| Reinforcement/Blessing 외 도구 8종의 "대상 스탯 특정" 여부(§5는 Reinforcement만 확인) | Transmute/Imbue/Imprint 등은 원 문서 수준에 머묾 |
| 인챈트 총수 50+ vs 100~150+ | 원 문서와 동일 충돌, 미해소 |

---
*마지막 업데이트: 2026-08-28 (최초 작성 — `lootun_reference.md` §4 아이템 구조를 분리·심화. Nemesis 확률 실측 500표본, Thorns 9경로 재확인, Divine 실례 5종 신규 확보)*
