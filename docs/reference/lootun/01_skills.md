# Lootun — 스킬 구조 전수 조사

> 상위 문서: [00_overview.md](00_overview.md)
> 짝 문서: [02_items.md](02_items.md)
> 상태: **56개 액티브 스킬 중 47개 확보(83%)** · 8패시브 트리 구조 확인 + 실측 빌드 8개(4클래스×역할군) 확보 (2026-08-28 심화)
> 목적: 본작의 **게임 형태 참고작**(CLAUDE.md)이 스킬을 실제로 어떻게 짰는지 — 슬롯 구조뿐 아니라 **스킬 하나하나의 실제 수치·패시브 선택지·빌드에서 쓰이는 방식**까지
> ⚠ **이 문서의 수치는 전부 Lootun의 수치다.** 본작 SSOT가 아니며 `src/data/*.csv`로 옮기지 말 것

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 |
| 1 | 구조 개관 — 클래스·어센던시·스킬 종류 |
| 2 | 56개 액티브 스킬 전수 표 |
| 3 | 스킬 패시브 트리(8칸) — 실제 사례로 본 동작 변형 |
| 4 | 캐릭터 패시브 (스킬 밖) |
| 5 | 역할군별 실측 빌드 8종 — 탱/딜/서포트 |
| 6 | 전술(Tactics) — 자동전투 배정 |
| 7 | 본작 시사점 |
| 8 | 출처 · 미확인(N/F) 총괄 |

---

## 0. 조사 방법과 신뢰도

Lootun에는 위키가 없다. [00_overview.md §0](00_overview.md)의 신뢰도 표기(**[공식]·[상점]·[가이드]·[커뮤니티]·[itch]**)를 그대로 쓰고, 이번 심화 조사에서 새로 쓴 방법 둘을 추가한다.

| 표기 | 소스 | 신뢰도 |
|---|---|---|
| **[스크린샷]** | Deep Dive 등 공식 자료에 임베드된 인게임 툴팁/패널 이미지 직접 판독 | ★★★ |
| **[패치노트]** | 공식 밸런스 조정 공지 원문(`ISteamNews` API로 확보) — 이름·클래스는 확정, 수치는 조정분만 | ★★★ |
| **[빌드가이드]** | gameplay.tips의 캐릭터별 빌드 가이드(WebFetch로 원문 확보, 이번 조사에서 8건 열람) — **실전에서 실제로 쓰이는 스킬·패시브 조합과 결과 수치**(DPS·HP·저항 실측치)를 담고 있어 툴팁 수치보다 신뢰도는 낮지만 "무엇이 쓰이는가"에서 최고 밀도 | ★★☆ |
| **[디스커션]** | Steam 토론 스레드(빌드 추천·개발자 직답 포함) | ★★ |
| **[가이드]** | Steam 유저 가이드(Walkthrough, Tanks, Thorns 등) — 이번 조사에서 접속 제한(rate limit)으로 원문 재확보 실패한 항목은 §0의 §11-1 목록에서 인용만 유지 | ★★ |

**이번 심화에서 새로 확보한 것**: gameplay.tips 빌드 가이드 8건(Starters·Level Farm All Classes·Balanced 999 Endless Team·Warden Tank·Max DPS·Nemesis Infusion) — **4클래스 × 8개 어센던시 중 6개**(Juggernaut·Warden·Marksman·Assassin·Archmage·Battlemage·Crusader·Templar 중 다수)의 **실전 스킬·패시브 조합과 실측 수치**를 확보했다. 이는 원 문서(`lootun_reference.md`) §3이 갖지 못했던 "스킬이 실제로 어떻게 조합되어 쓰이는가" 층이다.

**막힌 것**: Steam 개별 가이드 페이지(Firemage DPS 가이드, Walkthrough 0.9, Gear Progression, Thorns DPS 원문 일부, Deep Dive #2 원문)는 이번 세션에서 **"You've made too many requests" rate limit**로 재열람에 실패했다 — WebSearch 스니펫으로 부분 인용만 가능했다. §8에 N/F로 남긴다.

---

## 1. 구조 개관 — 클래스·어센던시·스킬 종류

> 상세는 [00_overview.md §2](00_overview.md)(캐릭터 성장 축)와 겹치지 않게, 스킬에 직접 관계된 부분만 요약한다.

```
기본 클래스 4                       어센던시 (레벨 100, 4×3=12 확정)
├─ Warrior   근접·원거리(마법 X)  → Warden(탱) / Juggernaut(하이브리드) / Barbarian(DoT)
├─ Ranger    근접·원거리(마법 X)  → Renegade(탱) / Assassin / Marksman
├─ Mage      마법·근접(원거리 X)  → Battlemage(탱) / Archmage(단일) / Vizier(광역)
└─ Paladin   [1.0 신규]           → Crusader / Inquisitor / Templar
```

- **어센던시 자유 교체 가능**(레벨 100 리셋 대가) [가이드]. 클래스 패시브도 **직업별로 강화되는 방어 축이 다르다** — Warrior=Armor, Ranger=Evasion, Mage=Barrier([빌드가이드], Starters Guide: "Class passive: static % buff to Armor/Evasion/Barrier + level-scaling amount")
- **어센던시 = 액티브 스킬 1개 + 장비 부위 1개(유물, §[02_items.md §8](02_items.md#8-유물relic)) 추가 해금**([빌드가이드]) — 레벨 100~150 구간 성장이 "패시브 강화"가 아니라 "새 액티브 하나를 더 손에 쥐는 것"으로 설계돼 있다는 뜻
- **스킬은 두 종류** — Default Attack(기본공격) 28개 + Cooldown Skill(쿨다운) 28개. 상세 구조·역산 근거는 [00_overview.md §3](00_overview.md#3-스킬-구조-요약)

---

## 2. 56개 액티브 스킬 전수 표 — 47/56 확보

> 신뢰도 표기는 §0 준수. 이 표는 원 문서 §3-2-1을 그대로 승계했다 — 이번 조사에서 추가 확보를 시도했으나(§0), **새로 이름이 확정된 스킬은 없었다**(개별 스킬 존재는 새로 확인됐지만 미확인 목록에 있던 9개 중 이름이 밝혀진 것은 없음). 대신 §3·§5에서 **이미 확정된 스킬들의 실제 동작·조합**을 심화했다.

### Warrior — 13/14

| 스킬 | 유형 | 효과 | 근거 |
|---|---|---|---|
| Quick Slash | 기본공격 | 약한 기본기. **1.0 패치에서 Execute/Ignite 패시브 변형**(§3-1 참조) | [패치노트] |
| Cleave | 기본공격 | 다타겟, Doublestrike/Frenzy 계열 | [패치노트] |
| Rend | 기본공격 | 물리/DoT, 100%WeaponDmg, 3초 출혈 | [스크린샷] |
| Sunder | 기본공격 | 방어도 감소 + 도발 계열. **Fire Arrow Barbarian 빌드의 주력**(§5-4) | [스크린샷][빌드가이드] |
| Slam | 기본공격 | 120%WD/100%공속, 출혈+냉기전환 | [패치노트] |
| Taunting Blow | 기본공격 | 80%WD/120%공속, 3초 도발. **탱 빌드 어그로 확보용**(§5-1) | [스크린샷][디스커션] |
| Fire Arrow | 기본공격 | Warrior의 원거리 옵션 | [패치노트] |
| Dragon's Roar | 쿨다운(공) | 150%WD/60초, 팀 +25%데미지 10초. **Juggernaut 빌드 1순위 offensive**(§5-1) | [스크린샷][빌드가이드] |
| Armour Break | 쿨다운(공) | 400%WD/45초, 대상 방어도 -100% 15초. **Precaution 패시브로 특화, Fire Arrow Barbarian 빌드에서 100% 업타임 유지**(§5-4) | [스크린샷][빌드가이드] |
| Earthquake | 쿨다운(공) | 20초, 다음 공격 강화. **Unsteady Ground 패시브로 다음 공격 +100%데미지 변형**(§3-1) | [패치노트][빌드가이드] |
| Ground Slam | 쿨다운(방) | 30초, 스턴+방어도 감소. **Juggernaut 빌드 방어쿨다운 채택**(§5-1) | [패치노트][빌드가이드] |
| Imposing Cry | 쿨다운(방) | 15초, 공속감소 디버프+HP회복. **Warden·Fire Arrow Barbarian 두 빌드 공통 채택**(§5-1·§5-4) | [스크린샷][빌드가이드] |
| Defensive Stance | 쿨다운(방) | 60초, 받는/주는 데미지 조절. **Warden 탱 빌드 핵심 — 100% 치명 회피 + 몇 초마다 만피 2배 회복 발동**(§5-1) | [스크린샷][빌드가이드] |

미확정 1개: **Bladestorm**(Warrior/Ranger 소속 불명, 원 문서 §3-2-1 유지)

### Ranger — 13/14

| 스킬 | 유형 | 효과 | 근거 |
|---|---|---|---|
| Quickdraw | 기본공격 | 기본 원거리타격, Bleedout DoT | [패치노트] |
| Disable | 기본공격 | 100%WD, Hamstring/Leverage 계열 | [패치노트] |
| Explosive Shot | 기본공격 | 120%WD, 폭발+점화(구명 Explosive Blast). **Assassin 순딜 빌드 주력, 100% 이상상태회피 희생하고 순수 딜 극대화**(§5-6) | [패치노트][빌드가이드] |
| Poison Sting | 기본공격 | 40%WD/100%공속, 3초 DoT | [스크린샷] |
| Barrage | 기본공격 | 다타겟 | [스크린샷] |
| Snipe | 기본공격 | 120%WD/100%공속, 보스 즉사기 | [패치노트] |
| Vigilance | 기본공격 | 강제 도발 패시브 | [패치노트] |
| Blade Flurry | 쿨다운(공) | 150~200%WD/20~40초 | [패치노트] |
| Pin Down | 쿨다운(공) | 20~45초, 출혈 계열. **Marksman 빌드에서 공격속도 보너스원**(§5-3) | [패치노트][빌드가이드] |
| Rain of Arrows | 쿨다운(공) | 250%WD/60초, 다타겟 | [스크린샷] |
| Smokescreen | 쿨다운(방) | 45초, 팀 회피 +15%. **Marksman 빌드에서 팀 회피/닷지 보정용**(§5-3) | [스크린샷][빌드가이드] |
| Crippling Poison | 쿨다운(방) | 대상 디버프 | [패치노트][가이드] |
| Vanish | 쿨다운(방) | 무타겟 상태+데미지 배율 | [패치노트][가이드] |

미확인 1개: 1.1 신규 4번째 공격형 쿨다운(이름 미확보)

> **Marksman 어센던시 고유 스택형 버프 발견**: `Renewed Focus/Strength/Speed`가 **중첩 스택 버프**로 확인됐다 — **+25%데미지, +25%공격속도, +15%치명, +750 전체저항**([빌드가이드], T4 Faction Speedfarming Marksman Build 스니펫). 원 문서 §3-2-1에는 없던 Marksman 전용 스킬명이며, 이번 조사에서 "이름은 확인했지만 기본공격/쿨다운 구분과 요구레벨은 미확인"이라 §2 표 집계에는 반영하지 않고 §5-3에서만 다룬다.

### Mage — 13/14

| 스킬 | 유형 | 효과 | 근거 |
|---|---|---|---|
| Fireball | 기본공격 | Ignite/Fork/Cascade 계열 | [패치노트][가이드] |
| Arcane Explosion | 기본공격 | 50%WD/100%공속, 3타 광역. **Battlemage 최대DPS 빌드에서 Elemental Blast로 2배 증폭**(§5-8) | [스크린샷][빌드가이드] |
| Frostbolt | 기본공격 | 둔화+치명 취약 디버프. **Archmage 서포트 빌드 주력**(§5-7) | [패치노트][빌드가이드] |
| Frost Strike | 기본공격 | 도발 부여 가능(탱용). **Battlemage 탱 빌드 주력**(§5-2) | [패치노트][빌드가이드] |
| Chain Lightning | 기본공격 | 80%WD/120%공속, 3연쇄(-30%/연쇄). **Battlemage 최대DPS 빌드 채택**(§5-8) | [스크린샷][빌드가이드] |
| Thunderbolt | 기본공격 | 감전 계열. **Battlemage 최대DPS 빌드 채택**(§5-8) | [패치노트][빌드가이드] |
| Meteor | 기본공격 | 후반 최강 기본기, Maelstrom 시너지(§3-2) | [패치노트][가이드] |
| Firestorm | 쿨다운(공) | Arcane Torrent 대체, 지속회복 계열 | [패치노트][가이드] |
| Arcane Torrent | 쿨다운(공) | 200%WD/40초, 3회 타격. **Archmage 서포트 빌드에서 Double Damage 버프원, Battlemage DPS 빌드에서 쿨감으로 연사화**(§5-7·§5-8) | [스크린샷][빌드가이드] |
| Blizzard | 쿨다운(공) | 냉기 광역 | [가이드] |
| Stasis | 쿨다운(방) | 대상 받는피해 증가 디버프. **Archmage 서포트 빌드 팀버프, 최대 +10% More Damage**(§5-7) | [패치노트][빌드가이드] |
| Frost Nova | 쿨다운(방) | 50초, 3명 3초 빙결 | [스크린샷] |
| Arcane Cloak | 쿨다운(방) | 방어 배리어 | [가이드] |

미확인 1개: 1.1 신규 4번째 공격형 쿨다운(이름 미확보)

> **Battlemage 고유 스킬 "Elemental Blast" 신규 확인**: 전체 타격 + 배리어 회복 + 적 저항 감소 + 쿨감 + 회피+10% — **다목적 유틸 쿨다운**([빌드가이드], Level/Farm Build All Classes). 원 문서에 없던 스킬명이나, 기본공격/쿨다운 구분과 요구레벨을 확인 못해 §2 집계 밖에 둔다.

### Paladin — 8/14 (신뢰도 혼재)

| 스킬 | 유형 | 효과 | 근거 |
|---|---|---|---|
| Wrath | 기본공격 | 120%WD/100%공속, 5%받는피해증가 5초 | [스크린샷] 1.0 Preview |
| Purging Flames | 쿨다운(공) | 200%WD/20초, 점화+대상 버프 제거 | [스크린샷] 1.0 Preview |
| Revival | 쿨다운(방) | 120초, 사망 아군 부활(60%HP/방벽). **Battlemage 탱 빌드에서 Zealot(Templar) 파티원의 버프원으로 실전 확인**(§5-2) | [스크린샷][빌드가이드] |
| Sweeping Judgement | 기본공격(추정) | Sunder와 유사한 방어도 파쇄+감전. **Crusader 빌드 주력으로 실전 확인**(§5-5) | [가이드][빌드가이드] |
| Zealot's Blaze | 기본공격(추정) | 이상상태 효과로 스케일하는 DoT. **Templar 순딜 빌드 주력 — 999 Endless 3T DPS 실측**(§5-6) | [패치노트][빌드가이드] |
| Executioner's Strike | 기본공격(추정) | 처형기 계열. **Crusader 서포트 빌드에서 보스 처형 메커니즘으로 실전 확인**(§5-5) | [가이드][빌드가이드] |
| Divine Sweep | 쿨다운(공, 추정) | 다타겟기 | [가이드] |
| Sanctify | 쿨다운(방, 유형만 확정) | 회복 + 버프 부여(Blessing of Resolution·Protection). **Crusader 빌드에서 방어쿨다운으로 실전 확인**(§5-5) | [가이드][빌드가이드] |

**끝내 미확인 — Paladin 잔여 최소 4~5개**(원 문서 §3-2-1 사유 그대로 유지 — 밸런스 조정 이력 0건이라 패치노트 경로 자체가 없음). 이번 조사로 **"Sweep"·"Holy Invocation"이 별도 스킬임을 추가 확인**했다([빌드가이드], Level/Farm Build: "Sweep triggers Blessing of Haste", "Holy Invocation triggers Blessing of Haste") — 원 문서는 이 둘을 "Sweeping Judgement의 저자 약칭인지 구분 못 함"으로 미결 처리했는데, **적어도 저자 약칭이 아니라 각각 독립적으로 시전되는 액티브**라는 것은 이번 조사로 밝혀졌다(다만 정확한 유형·요구레벨은 여전히 N/F).

### 집계 (원 문서와 동일, 변동 없음)

| | 기본공격 | 쿨다운 | 합계 |
|---|---|---|---|
| Warrior | 7/7 | 6/7 | 13/14 |
| Ranger | 7/7 | 6/7 | 13/14 |
| Mage | 7/7 | 6/7 | 13/14 |
| Paladin | 4/7 | 4/7 | 8/14 |
| **합계** | **25/28** | **22/28** | **47/56** |

---

## 3. 스킬 패시브 트리(8칸) — 실제 사례로 본 동작 변형

> **[상점]** "each skill having 8 different passives to choose from". 원 문서 §3-3이 이 구조를 개념으로만 서술했는데, 이번 조사에서 **패치노트에 실명으로 등장하는 실제 패시브 이름과 효과**를 다수 확보했다.

### 3-1. 확인된 개별 패시브 — 이름·효과·소속 스킬

| 소속 스킬 | 패시브 이름 | 효과 | 근거 |
|---|---|---|---|
| Quick Slash | (미상 → **Blazing Wound**로 개명) | **랭크당 25% Ignite 전환 + 2% More Damage** — 물리 기본기를 화염 DoT로 바꾸는 변형 노드 | [패치노트] 1.0 업데이트: "Quick Slash → Blazing Wound now grants 25% Ignite Conversion and 2% More Damage per rank" |
| Bladestorm | **Repeating Strikes**(1.0에서 개명) | 이름만 확인, 효과 미상 | [패치노트] |
| Earthquake | **Unsteady Ground** | 다음 공격 **+100% 데미지** — 원 문서 §3-3이 "동작을 바꾼다"고 서술한 예시가 실측으로 확인됨(수치형이 아니라 "다음 타격 강화"라는 조건부 동작) | [빌드가이드] Fire Arrow Barbarian 빌드 |
| Armour Break | **Precaution** | 정확한 효과 미상이나, **이 패시브 채택 빌드가 Armour Break 100% 업타임을 달성**([빌드가이드]) — 쿨감 또는 지속시간 연장 계열로 추정(N/F, 확정 아님) | [빌드가이드] |
| Meteor | **Maelstrom**(레벨75) | 마법/화염/냉기/번개/비전/원소 피해 이득을 **동시에** 받고 대상의 **가장 낮은 저항을 자동 선택** — 원 문서 §3-3의 극단 사례, 이번 조사로 재확인만 됨(신규 정보 없음) | [가이드] |
| Frenzy | **Fated Aggression** | Max DPS Battlemage 빌드에서 채택. 정확한 효과 N/F | [빌드가이드] |
| (스킬 미상) | **Flurry Cloak** | Max DPS Battlemage 빌드에서 채택, "Combo" 패시브와 함께 언급 — 연계 발동 계열로 추정(N/F) | [빌드가이드] |
| (스킬 미상, Warrior 계열) | **Stalwart** | +15% Health — Juggernaut 빌드 채택 | [빌드가이드] |
| (스킬 미상, Warrior 계열) | **Endurance / Ferrous Core / Hardened Armour / Adaptive Armour** | Juggernaut 빌드가 채택한 나머지 4개. 개별 효과 N/F, 이름으로 보아 방어도·적응형 피해 계열로 추정 | [빌드가이드] |
| Dragon's Roar(추정) | **Hillstrider's Ambition / Ornate Warhorn** | Fire Arrow Barbarian 빌드 채택. 효과 N/F | [빌드가이드] |

### 3-2. 패시브가 바꾸는 3가지 축 — 원 문서 서술 + 실측 보강

| 축 | 원 문서 예시 | 이번 조사 실측 보강 |
|---|---|---|
| **수치** | 피해량 / 타격 대상 수 / 쿨 감소 | Unsteady Ground(다음 공격 +100%), Blazing Wound(+2% More Damage/rank) |
| **동작(타입 변환)** | 번개↔화염 상호 배타 | **Blazing Wound가 실제 사례** — Quick Slash(순수 물리) → 25%/rank로 점진적 화염 DoT 전환. 랭크제로 "전부 아니면 전무"가 아니라 **비율 슬라이더형 전환**이라는 게 새로 확인된 지점 |
| **동작(처형·조건부)** | HP 15% 이하 즉사(Execute) | Zealot's Blaze가 "이상상태 효과로 스케일하는 DoT"([패치노트]) — 조건부 스케일링의 또 다른 사례. Executioner's Strike의 "Boss Execute" 메커니즘도 실전 확인([빌드가이드] §5-5) |
| **극단** | Maelstrom(전원소 동시 이득 + 최저저항 자동선택) | 재확인만, 신규 없음 |

**새로 드러난 패턴 — 개명(Rework)이 패시브에도 일어난다.** Quick Slash의 무명 패시브가 1.0에서 **"Blazing Wound"로 개명되며 수치도 함께 조정**됐고([패치노트]), Bladestorm도 "Repeating Strikes"로 개명됐다. 원 문서 §3-2-1의 "패치노트에 `스킬명 -> 패시브명` 형태로 등장" 표기가 가리키던 것이 바로 이 패시브 개명 패턴이다 — **액티브 스킬 자체는 이름이 안 바뀌고, 그 스킬에 딸린 8패시브 중 하나가 개명·재조정된다.**

---

## 4. 캐릭터 패시브 (스킬 밖)

> [00_overview.md §3](00_overview.md#3-스킬-구조-요약)에 표만 요약돼 있다. 여기서 전체를 유지한다(원 문서 §3-4 그대로, 이번 조사로 신규 확보 없음 — §0 참조, 시간 제약으로 클래스 25패시브·어센던시 100포인트 트리의 개별 노드명은 확보하지 못함).

| 트리 | 규모 | 성격 |
|---|---|---|
| **클래스 패시브** | 25 [상점] · 5행×5칸, 칸당 최대 4포인트 [가이드] | 대부분 전 클래스 공통. 우상단 소수만 클래스 전용(Warrior=방어도/근접, Ranger=회피/원거리, Mage=배리어/마법) |
| **어센던시 패시브** | 2트리 — 전 클래스 공통 1 + 어센던시 전용 1(총 100포인트) [가이드] | 어센던시 선택 시 해금 |
| **Mission Passives** | 미션별 → [1.3] 글로벌 리워크(각 미션·난이도 최초 클리어 시 포인트 지급) | |
| **Fame Passives** | 바운티 재화로 구매, 환급 가능 | [00_overview.md §8-2](00_overview.md) |
| **Community Passives** | 재료 기부 재화로 구매, 영구·리스펙 불가 | |
| **도전과제 보너스** | 145개/600랭크 [상점] | Fortune·XP·골드·드롭 품질 보너스 |

- **리스펙은 거의 전부 자유** — 예외는 Community Passives 하나뿐
- **[1.3] 패시브 통합**: 원소 관통 4→1, 근/원/마 저항 3→1 — "속성별 중복 노드"를 4년 뒤 스스로 접은 사례(본작 죄종×부위 매트릭스 부채와 같은 함정)

---

## 5. 역할군별 실측 빌드 8종 — 탱/딜/서포트

> **이번 조사의 핵심 신규 확보분.** gameplay.tips 빌드 가이드에서 확보한, **실제로 엔드게임에서 쓰이는 스킬·패시브·유니크 조합과 결과 수치**다. 클래스별 8개 어센던시 중 6개(Juggernaut·Warden·Marksman·Assassin·Battlemage·Archmage·Crusader·Templar)를 커버한다 — **원 문서 §3에 완전히 없던 층**.

### 5-1. Warrior → Juggernaut (하이브리드 DPS/서포트) [빌드가이드]

- **패시브 5개**: Stalwart(+15%Health) · Endurance · Ferrous Core · Hardened Armour · Adaptive Armour — "Adaptive Damage"를 패시브+유물 양쪽에서 받는 구조라는 것이 가이드의 채택 근거
- **액티브**: 주력 Dragon's Roar(팀 딜버프) · 공격쿨 Armour Break(Precaution 특화) + Earthquake(Unsteady Ground로 다음공격+100%) · 방어쿨 Ground Slam · Off The Bench(다른 공격쿨다운 트리거 — 신규 스킬명, §2 밖) · 기본공격 Sunder

### 5-2. Mage → Battlemage (탱) [빌드가이드]

- **HP+배리어 40만+**, **화/냉/전/비전/물리 5속성 동시 86.9% 피해감소** — 원 문서 §5-1의 "곱셈 방어 축을 동시에 쌓아도 안 터진다" 원칙의 실측 재확인(수치가 5속성 전부 동일하다는 것도 신규 확인)
- 기본공격 Frost Strike(도발 부여) · 증강(Augment) Ancient Aegis · Revival(Paladin 파티원 소환·부활) 버프를 받는 상호운용 확인 — **탱 하나가 다른 직업의 부활기를 전제로 설계된다**는 파티 상호의존 사례
- Meteorite 소모품 2종(HP형/화저항형)이 탱 세팅에 쓰임

### 5-3. Ranger → Marksman (스피드파밍 DPS) [빌드가이드]

- 핵심 스택형 버프 **Renewed Focus/Strength/Speed**: **+25%데미지·+25%공속·+15%치명·+750 전체저항** 동시 부여(§2 각주)
- Lightning Barrage(Shock 디버프 적용) · Pin Down(공속 보너스) · Smokescreen(팀 회피/닷지)
- 원 문서 §4-6의 "Fortune/Luck 실측 2725%/245%"와 같은 계열의 극단 수치가 여기서도 반복 — Marksman이 파밍 속도 특화 어센던시로 커뮤니티에 자리잡았음을 보여준다

### 5-4. Warrior → Barbarian (Fire Arrow, DPS/서포트) [빌드가이드]

- Abyssal Cuffs(유니크, 쿨다운 버프 캐스팅 트리거) + Disintegration Band
- Armour Break **100% 업타임** 유지 + Dragon's Roar(버프 캐스팅) + Imposing Cry(디버프+도발)
- 방어 메커니즘: Defiance · Revive 패시브. **Barbarian이 원 문서 §3-1의 "DoT 어센던시"로 분류됐는데, 실제 실측 빌드는 DoT가 아니라 Armour Break 물리 버스트 위주** — 어센던시 이름표(Barbarian=DoT)와 실제 최적 빌드가 어긋나는 사례로 기록해 둔다(D2 바바리안 마스터리처럼 "이름값과 실사용의 괴리"가 Lootun에도 있다는 방증)

### 5-5. Paladin → Crusader (서포트, 처형+블레싱) [빌드가이드]

- **Blessings 5개 전부 스펙**: Bleed(유물)·Poison(다리 인챈트+대거)·Ignite(블레싱) 이상상태 3종을 각각 다른 장비 슬롯에서 부여 — **이상상태 하나당 부여 경로를 분산시키는 빌드 구조**
- Executioner's Strike의 **보스 처형(Execute) 메커니즘** 실전 확인
- 유니크 Gravedancer(생존력), Savage Flail(무기, -50%방어도 디버프), Scorching Band(화염 스케일링)
- Sweeping Judgement(주력 기본공격) + Sanctify(방어쿨다운, Blessing of Resolution/Protection)

### 5-6. Paladin → Templar (순딜, Zealot's Blaze) [빌드가이드]

- **999 Endless 전투에서 3T(3×10¹²) DPS 이상** 실측 — 이 문서에서 확보한 **가장 높은 단일 실측 DPS**
- **Serpentstone 유니크로 이상상태회피 100%** 확보(생존을 회피가 아니라 면역으로 해결)
- **치명 확률 270%**(원 문서 §4-9 "Blessed 인챈트 — 치명 100% 초과분이 Double Crit 확률로 전환"의 실사용 사례. Abyssal Hood 투구가 212% 이상에서 유효하다는 캡라인도 확인)
- Marksman 유물(+20%데미지, 만렙 시) · Wrathful 방패 인챈트(+10%데미지)

### 5-7. Mage → Archmage (서포트, Frostbolt) [빌드가이드]

- **+139% 이상상태 효과, +22% Main/Venom/Flare** — 디버프 5종 동시 적용: Chilled(-23.8%공속) · Shocked(+23.8%받는피해) · Bleeding(-22%공속) · Poisoned(-22%데미지배율) · Ignited(+22%받는피해)
- **Malediction 증강 — 저주(curse) 5개 전부** 장착
- Vigilant 오라(-10%받는피해), 스킬 배분 근거까지 실측: Archmage 스킬 +12% / 트린켓 +6% / 인챈트 +4%
- **서포트 어센던시가 "딜 없이 디버프만" 이 아니라, 딜러의 데미지 증폭을 위해 5종 디버프를 동시에 굴리는 별도 계산 체계** — 본작 서포트/버퍼 설계 시 "몇 개 축을 동시에 굴리게 할 것인가"의 참고 눈금이 된다

### 5-8. Mage → Battlemage (순딜, Max DPS) [빌드가이드]

- Arcane Torrent(쿨다운→연사화) · Thunderbolt · Frost Strike · Chain Lightning 4스킬 동시 운용
- **"쿨다운이 전부"** — 가이드 원문: "Cooldown is the name of the game", Arcane Torrent를 머신건처럼 연타
- 유니크 Abyssal Cuffs·Consuming Staff, 무기 옵션: 뿔망치(Horned Mace) 공속 2.6초
- **더미 처치 sub-5초** (버전 1.0 기준). 가이드가 "탱이 1.0에서는 DPS도 더 좋다"고 명시 — **탱 어센던시가 순딜 어센던시보다 실전 DPS가 높았다는 밸런스 붕괴 사례**(패치 이후 시정 여부는 N/F)

### 5-9. 실측 빌드가 보여주는 공통 패턴

1. **한 어센던시가 여러 빌드로 갈린다** — Battlemage만 해도 탱형(§5-2)과 순딜형(§5-8)이 공존, Templar도 순딜(§5-6)과 서포트형(원 문서에 없음, 미확보)이 있을 것으로 추정
2. **디버프·이상상태가 개별이 아니라 "묶음"으로 설계된다** — Archmage 서포트가 5종 디버프를 동시에 굴리고, Crusader가 3종 이상상태를 각기 다른 슬롯에서 부여
3. **유니크 하나가 빌드의 정체성을 정한다** — Serpentstone(100%이상상태회피), Abyssal Cuffs(버프캐스팅 트리거) 등, 이는 원 문서 §9의 설계원리("체이스에는 확정 경로")와 결이 다른 **"유니크가 곧 빌드"** 패턴으로 별도 기록할 가치가 있다

---

## 6. 전술(Tactics) — 자동전투 배정

> 원 문서 §3-5 그대로 유지, 이번 조사에서 신규 확보 없음.

`Barracks` 건설로 해금 [공식 #5][가이드]:
- **기본 공격 타겟팅**: Random / Strongest / Weakest / Round Robin — [빌드가이드] Warden 탱 빌드가 "attack priority to round robin"으로 명시 설정하는 실사용 확인
- 캐릭터별 쿨다운 스킬 배정
- 상위 랭크에서 **자동 스킬 시전** 해금

---

## 7. 본작 시사점

1. **패시브가 "비율 슬라이더형 전환"일 수 있다** — Blazing Wound(§3-1)는 물리→화염을 랭크당 25%씩 나눠 옮긴다. 본작 skill_design.md의 변형 노드가 "전부 아니면 전무"(이진 전환)로 설계돼 있다면, Lootun의 이 사례는 **점진적 전환**이라는 제3의 옵션을 보여준다 — 검토 후보로 추가할 만하다.
2. **"이름표와 실제 최적 빌드가 어긋난다"** — Barbarian(DoT로 설계)의 실전 빌드가 물리 버스트인 사례(§5-4)는, 스킬·전직 설계 시 "의도한 정체성"과 "실제로 강해서 쓰이는 조합"이 갈릴 수 있다는 경고다. 본작 전직 3갈래 확정 후 밸런스 검증 단계에서 이 갭을 주기적으로 점검할 근거가 된다.
3. **서포트가 "여러 디버프를 동시에 굴리는 계산 다발"로 설계될 수 있다** — Archmage 서포트(§5-7)가 5종 디버프+저주 5개+오라를 동시 운용한다. 본작에 서포트 역할이 생긴다면 "버프 1개 vs 디버프 다발" 중 어느 쪽 밀도로 갈지 결정할 때 이 사례가 상한선 참고가 된다.
4. **"유니크 하나가 빌드를 정의"하는 패턴은 본작 가드레일과 다시 충돌한다** — [02_items.md §11-3](02_items.md)의 "본작은 유니크가 스킬 전용 파워를 갖지 않는다" 가드레일과 정확히 배치되는 사례가 Serpentstone(100% 이상상태회피)이다. Lootun은 이 방향으로 갔고 실제로 최상위 DPS 빌드의 핵심이 됐다(§5-6) — 본작이 가드레일을 유지한다면 **왜 유지하는지에 대한 반례 사례**로 남겨둔다.
5. **탱이 순딜보다 DPS가 높은 밸런스 붕괴(§5-8)** — 자동전투 방치형에서 "탱 하나로 다 해결"이 되면 파티 구성 결정 자체가 무의미해진다. 본작 관전 아레나가 파티 구성 결정을 핵심 재미로 삼는다면, **역할별 상한 DPS 격차를 구조적으로 만드는 장치**(예: 탱 전용 패시브가 딜 전용 패시브와 배타)가 필요하다는 반면교사.

---

## 8. 출처 · 미확인(N/F) 총괄

### 8-1. 이번 심화에서 새로 확보한 출처

- gameplay.tips — [Starters Guide](https://gameplay.tips/guides/lootun-starters-guide.html) · [Level/Farm Build All Classes](https://gameplay.tips/guides/lootun-level-farm-build-all-classes.html) · [Balanced 999 Endless Team Build](https://gameplay.tips/guides/lootun-balanced-999-endless-team-build-guide.html) · [Warden Tank Build](https://gameplay.tips/guides/lootun-warden-tank-build-with-tips.html) · [Max DPS Build](https://gameplay.tips/guides/lootun-max-dps-build-mostly-dummy-maxing.html) · [Nemesis Infusion Guide](https://gameplay.tips/guides/lootun-nemesis-infusion-guide-endgame-crafting.html)(아이템 문서 §6과 공유)
- `ISteamNews` API(기존 방법 재사용) — 1.0/1.1 패치노트에서 "Quick Slash → Blazing Wound", "Bladestorm → Repeating Strikes" 패시브 개명 확인
- Steam 디스커션 — [Best Ascendancy Classes for Mage and Ranger](https://steamcommunity.com/app/1960270/discussions/0/3381662461610566463/)

### 8-2. §11-1(00_overview.md로 이관된 원 출처 목록) 중 스킬 관련분 재확인 결과

- Deep Dive #1(스킬/클래스/어센던시) 원문 재열람 시도 → **rate limit로 실패**, 원 문서의 §3-2-1 스크린샷 판독 결과만 승계
- Walkthrough 0.9, Firemage 40+ Billion DPS 가이드 → **rate limit로 재열람 실패**, 원 문서 인용만 승계

### 8-3. 미확인(N/F) 총괄

| 항목 | 상태 |
|---|---|
| 56개 액티브 스킬 중 9개(Ranger·Mage 각 1 신규쿨다운, Paladin 4~5, 소속불명 3) | 원 문서와 동일하게 미확인 — §2 |
| 신규 확인된 스킬명 4개(Off The Bench·Elemental Blast·Renewed Focus 계열·Sweep/Holy Invocation)의 **정확한 유형(기본공격/쿨다운)·요구레벨** | 미확인 — §2 각주 |
| 개별 패시브 8칸의 **전체 목록**(스킬 56개 × 8 = 448개 슬롯 중 이름·효과 확인은 10개 미만) | 절대다수 미확인 — §3-1. 조사 방법상 원천적으로 툴팁을 직접 볼 수 없어 패치노트·빌드가이드에 실명이 노출된 것만 확보 가능 |
| 클래스 패시브 25개 · 어센던시 패시브 100포인트 트리의 **개별 노드명** | 전량 미확인 — §4 |
| Templar·Assassin·Renegade·Vizier·Inquisitor의 **서포트/탱형 실측 빌드**(§5가 커버 못한 6개 어센던시) | 미확인 — 시간·검색 세션 제약으로 이번 조사 범위 밖 |
| Precaution·Endurance·Ferrous Core·Hardened Armour·Adaptive Armour·Fated Aggression·Flurry Cloak·Combo·Stalwart 세부 수치(효과는 이름·채택 근거로 추정, 정확한 수치 툴팁 없음) | 미확인 — §3-1 |

---
*마지막 업데이트: 2026-08-28 (최초 작성 — `lootun_reference.md` §3 스킬 구조를 분리·심화. 실측 빌드 8종 신규 확보, 패시브 개명 패턴 확인)*
