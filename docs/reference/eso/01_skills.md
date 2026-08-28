# The Elder Scrolls Online (ESO) — 스킬라인 전수 조사

> 상위 문서: [00_overview.md](00_overview.md)
> 짝 문서: [02_items.md](02_items.md)
> 상태: **조사 완료** (2026-08-28) — 최초 조사(구 `eso_reference.md` §2 "클래스 vs 무기 스킬라인 이중구조")를 §1로 그대로 이관하고, **무기 6종·방어구 3종·길드 6종 스킬라인의 실제 스킬(모프 2갈래 포함)을 diablo2 수준으로 신규 전수**, 클래스는 용기사(Dragonknight)를 대표 표본으로 전수했다
> 목적: `skill_design.md` §7 미확정 과제 "무기 숙련의 귀속"과, 본작이 검토 중인 **다층 패시브 마스터리 구조**(직업·죄종 2탭 + 전직 트리)에 ESO의 **8범주 스킬라인**(클래스·무기·방어구·길드·종족·월드·PvP·생활) 실물 구조를 대조군으로 댄다
> ⚠ **이 문서의 수치는 전부 ESO의 것이다.** 본작 SSOT가 아니며 `src/data/*.csv`로 옮기지 말 것

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 |
| 1 | 클래스 vs 무기 스킬라인 이중구조 (최우선) |
| 2 | 무기 스킬라인 6종 — 전수 |
| 3 | 방어구 스킬라인 3종 — 전수 |
| 4 | 길드 스킬라인 6종 — 전수 |
| 5 | 클래스 스킬라인 — 대표 표본(용기사) + 21개 명단 |
| 6 | Class Mastery(Update 50, 2026) — 구체 패시브 |
| 7 | 출처 · 미확인 |

---

## 0. 조사 방법과 신뢰도

[00_overview.md §0](00_overview.md#0-조사-방법과-신뢰도)의 신뢰도 표기(**[공식]·[Fextralife]·[skillbook]·[검색-UESP]·[검색-포럼]·[검색-가이드]**)를 그대로 쓴다.

이번 심화의 핵심은 최초 조사가 스니펫으로만 재구성했던 §1(구 §2)을 유지한 채, **무기·방어구·길드 스킬라인 15개 전부를 Fextralife·eso-skillbook에서 직접 WebFetch로 원문 확보**한 것이다. 클래스는 21개 라인 전부를 같은 밀도로 파는 대신 **용기사(Dragonknight) 3라인을 대표 표본으로 전수**하고 나머지 6클래스는 라인 이름과 대표 스킬 이름만 확보했다 — diablo2 조사가 7직업 중 아마존만 전수하고 나머지는 별도 파일로 남긴 것과 같은 스코프 판단이다.

---

## 1. 클래스 vs 무기 스킬라인 이중구조 (최우선)

> 최초 조사(구 `eso_reference.md` §2)를 그대로 이관했다. 표기·소스는 최초 조사 시점 것을 유지한다.

### 1-1. 스킬라인 전체 분류 — 8범주

| 범주 | 개수 | 접근권 | 비고 |
|---|---|---|---|
| **클래스(Class)** | **21** (7클래스×3라인) | **그 클래스 전용** — 유일한 배타적 범주[검색-가이드] "Class Skills … are the only Skills that are not available to everyone" | 각 라인에 액티브+패시브+**궁극기 1** |
| **무기(Weapon)** | **6** — One Hand & Shield·Two Handed·Dual Wield·Bow·Destruction Staff·Restoration Staff[Fextralife] | **전 클래스 공용** | 액티브 5~6개+패시브+**궁극기 1**(§2 — 최초 조사는 "궁극기 없음"으로 잘못 판정했다, [00_overview.md §0-1](00_overview.md#0-1-이번-심화가-뒤집은-것--최초-조사의-오염-판정-2건이-실은-정확했다)) |
| **방어구(Armor)** | **3** — Light·Medium·Heavy[Fextralife] | 전 클래스 공용 | **액티브 1개+패시브**(§3 — 최초 조사는 "패시브만"으로 잘못 판정했다). 착용만으로 자동 성장 |
| **길드(Guild)** | **6** — Fighters·Mages·Undaunted·Thieves·Dark Brotherhood·Psijic Order[Fextralife] | NPC 길드 가입으로 해금, 전 클래스 공용 | 라인마다 궁극기·액티브 밀도가 크게 다름(§4) |
| **종족(Racial)** | 종족 수만큼(10) | 생성 시 고정 | 패시브만, 자동 |
| **월드(World)** | **6** — Soul Magic·Scrying·Excavation·Vampire·Werewolf·Legerdemain[Fextralife] | 퀘스트/감염으로 해금 | — |
| **얼라이언스 워(PvP)** | 2 — Assault·Support | Cyrodiil 활동 | — |
| **생활(Crafting)** | 7 | 시작부터 | 전투 스킬 아님, 상세는 [02_items.md §6](02_items.md#6-제작craft--7전문직) |

> **본작 질문과 바로 맞물리는 지점**: 클래스가 "유일한 배타적 범주"라는 서술이 곧 **직업 마스터리의 정의**이고, 무기가 "전 클래스 공용"이라는 서술이 곧 **무기군 귀속**의 정의다. ESO는 이 둘을 **범주 자체를 나눠서** 답한다 — 하나를 죽이고 하나만 남기지 않는다.

### 1-2. 무기 스킬라인의 성장 방식 — 사용 기반, 클래스와 "같은 메커니즘"

- **레벨업 포인트 배분이 아니다.** 무기든 클래스든 **해당 라인의 액티브를 액션바에 올려둔 채로 경험치를 벌면** 그 라인의 랭크가 오른다[검색-포럼] "Any class can advance in any of the Weapon skill lines by holding the appropriate weapon at the moment of gaining experience"
- **핵심 확인 사항** — 클래스 스킬라인도 **똑같은 방식**으로 성장한다: "class skill lines require you to have their respective abilities slotted while gaining experience"[검색-포럼]. 즉 **클래스 vs 무기를 가르는 것은 "성장 방식"이 아니라 "누가 그 라인에 접근할 수 있는가(접근권)"뿐**이다
- 방어구 라인만 예외 — **착용만으로 자동** 성장, 슬롯팅 불필요[검색-포럼]
- 같은 라인에서 스킬을 **여러 개 동시에 슬롯하면 그만큼 배속으로 랭크가 오른다**(라인당 3개 슬롯 시 3배속)[검색-포럼]
- 라인 랭크는 대략 **1~50** 구간으로 오르며, 랭크 문턱마다 그 라인의 새 액티브·패시브가 **해금**된다(배우려면 스킬포인트를 또 써야 함)[검색-포럼][검색-가이드] — §2~§4에서 각 스킬 옆에 붙인 "Rank N" 표기가 이 문턱이다. 개별 스킬의 **랭크 I~IV**(모프 조건, §1-5)와는 다른 축이니 혼동 주의

### 1-3. 스킬라인 내부 구조 — 액티브·패시브·궁극기 (정정판)

이번 심화로 원문을 확보하며 최초 조사의 서술을 아래처럼 정정한다 — 상세 수치는 §2~§4.

- **무기 라인**: 액티브 5~6개(+모프 2종씩) + 패시브 5개 + **궁극기 1개(+모프 2종)**. 최초 조사는 "궁극기 없음"이라 판정했으나 6개 라인 전부에서 궁극기를 원문으로 확인했다(§2)
- **방어구 라인**: **액티브 1개(+모프 2종)** + 패시브 5개. 최초 조사는 "패시브만"이라 판정했으나 정정한다(§3)
- **클래스 라인**: 액티브 다수(용기사 기준 라인당 6개, §5) + 패시브 4개 + **궁극기 1개(+모프 2종)**
- **길드 라인**은 라인마다 구조 밀도가 전혀 다르다 — Fighters Guild·Mages Guild·Psijic Order는 액티브 4~5+패시브 4~5+궁극기까지 클래스급으로 완비, Undaunted는 액티브 5+패시브 2(궁극기 미확인), Dark Brotherhood·Thieves Guild는 **액티브 사실상 1개(또는 0개), 궁극기 없음**(§4)

### 1-4. 무기를 바꾸면 무기 스킬라인도 바뀌는가 — **바뀌지 않는다. 영구 누적된다**

이게 본작 "숙련이 개체(캐릭터) 귀속인가 무기군 귀속인가" 질문과 정확히 대응하는 확인이다.

- 무기 스킬라인의 **랭크는 무기 종류에 귀속**되지, 지금 뭘 들고 있느냐에 실시간으로 좌우되지 않는다. 한 번 오른 랭크는 **영구** — 다른 무기로 바꿔도 이전 라인의 랭크가 깎이지 않는다[검색-포럼][검색-UESP] "you don't lose rank once earned"
- 다만 **경험치를 더 버는 조건**은 그 무기 라인의 스킬을 액션바에 슬롯해 두는 것 — 안 쓰는 무기 라인은 **성장이 멈출 뿐 후퇴하지 않는다**
- **캐릭터 하나가 6개 무기 라인을 전부 동시에 키울 수 있다** — 지금 도끼를 들고 있어도 예전에 키워둔 활 라인 랭크는 그대로 남아 있고, 활로 바꾸면 그 랭크의 액티브를 바로 다시 쓸 수 있다
- → **결론: ESO의 무기 숙련은 "무기군에 귀속되고, 캐릭터별로 영구 누적"**된다. 본작 skill_design.md §2-1 "무기군에 붙고 개체에 붙지 않는다"와 **어휘 수준까지 일치**하는 처리다. 다만 ESO는 "장착한 무기 종류"가 아니라 "그 무기 라인에 얼마나 투자했는가"가 기준이라, **본작이 "장착 무기군 = 그 즉시 그 스킬"로 갈지, ESO처럼 "한 번 키우면 캐릭터에 귀속되어 다른 무기로 바꿔도 남는다"로 갈지는 별도 결정**이다([00_overview.md §4-3](00_overview.md#4-3-무기-숙련이-장착한-무기에-즉시-귀속되는가-캐릭터가-누적한-것에-귀속되는가--본작이-별도로-정할-것))

### 1-5. 모프(Morph) — 액티브의 2단계 진화 선택

- 액티브 스킬은 **랭크 I → IV**까지 사용하며 자연 성장[검색-가이드][검색-포럼]
- **랭크 IV 도달 + 스킬포인트 1개**로 **모프**한다 — 같은 스킬의 **효과가 다른 두 방향 중 하나를 선택**(예: Critical Charge → `Stampede`(광역화+지속 피해) 또는 `Critical Rush`(거리 비례 추가 피해), §2-1) [검색-포럼][검색-가이드][Fextralife]
- **모프는 되돌릴 수 있다** — 스킬 리스펙 성소에서 골드로 초기화. 단, 이전과 **다른 모프**를 다시 고르면 그 모프는 **랭크 I부터 재성장** — 다만 **이미 번 경험치 자체는 사라지지 않는다**(스킬라인 랭크는 유지)[검색-포럼] "You keep all experience gained regardless of the morph you choose"
- **패시브에는 모프가 없다** — 모프는 액티브·궁극기 전용 구조(§2에서 확인한 대로 궁극기도 모프 2종을 가진다)

### 1-6. 액션바 — 클래스+무기 액티브를 자유롭게 섞는다

- 1바에 **액티브 5+궁극기 1**, 레벨 15부터 **2바**(무기 스왑으로 전환) → 총 액티브 10+궁극기 2[검색-포럼][검색-가이드]
- **한 바 안에 클래스 스킬 3개+무기 스킬 2개** 같은 혼합이 흔하다 — "이 칸은 클래스만" 같은 슬롯 구획이 없다. 실전 빌드는 대개 **바 하나는 클래스 위주 버프/유틸, 다른 바는 무기 위주 딜 로테이션**으로 나뉘는 식으로 **플레이어가 스스로 분업을 정한다**
- 궁극기 슬롯은 클래스·무기·길드·월드(뱀파이어/웨어울프) 라인 어디서든 채울 수 있다 — §2로 정정된 대로 무기 라인도 궁극기를 제공하므로, 최초 조사가 "궁극기는 클래스·길드·월드에서만 채워진다"고 적었던 서술은 **삭제**한다

### 1-7. 서브클래싱(Subclassing) — Update 46(2025)에서 클래스 배타성을 스스로 허문 사례

ESO는 **클래스 스킬라인의 배타성 원칙을 라이브 서비스 10여 년 뒤 스스로 완화**했다. 본작이 지금 겪는 "귀속을 하나로 고정할지" 고민에, "정답을 나중에 또 바꿀 수 있다"는 참고가 된다.

- **서브클래싱**: 캐릭터 본래 클래스의 3개 라인 중 **최대 2개**를 **다른 클래스의 라인**으로 교체할 수 있다. **최소 1개는 원 클래스 라인이어야 한다** — 완전 자유화는 아니다[검색-가이드][검색-포럼]
- 도입 사유(공식 발언 인용, [검색-포럼]): "in ESO, players could change their appearance, names, races, and even faction, but this had not been true with class" — 다른 정체성 축은 다 바꿀 수 있는데 클래스만 못 바꾸는 비대칭을 해소하려는 목적
- 부작용: **서브클래싱은 애초 클래스 밸런스 설계에 없던 조합을 가능**하게 해서, 극단적으로 강한 조합이 나오는 문제가 발생[검색-포럼]
- 즉 ESO도 "무기처럼 클래스도 공용 재료로 풀면 어떻게 되는가"를 실제로 겪었다 — **완전 공용화가 아니라 "부분 공용화+최소 1개 고정"**으로 타협했다는 점이 중요하다

---

## 2. 무기 스킬라인 6종 — 전수

> 각 라인: 액티브(레벨 순) → 궁극기 → 패시브 순으로 정리. 수치는 CP160(레벨·챔피언포인트 상한) 골드(Legendary) 품질 기준[Fextralife][skillbook] — 라인마다 소스 표기가 다를 수 있어 항목별로 남긴다. **6개 라인 전부 궁극기를 보유한다는 것이 이번 심화의 최대 정정**([00_overview.md §0-1](00_overview.md#0-1-이번-심화가-뒤집은-것--최초-조사의-오염-판정-2건이-실은-정확했다)).

### 2-1. Two Handed (양손무기)

| 스킬 | 효과 | 모프 A | 모프 B |
|---|---|---|---|
| Uppercut | 2672 물리 피해 | **Dizzying Swing** — 2760 피해, 7초간 Off Balance 부여(Off Balance 대상 재타격 시 2초 기절) | **Wrecking Blow** — 2760 피해, 3초간 Major Berserk(피해 +10%)+Empower(대몬스터 강공 피해 +150%) |
| Critical Charge | 1393 물리 피해, 항상 치명타 | **Critical Rush** — 이동 거리 비례 최대 +50% 추가 피해 | **Stampede** — 광역화(주변 적)+15초간 초당 319 지속 피해 지형 생성 |
| Cleave | 전방 1742 물리 피해+1742 피해 흡수막 | **Carve** — 출혈 속성 전환, 1742+12초간 2871 추가 출혈 피해 | **Brawler** — 적중당 방어막 +50%(최대 +300%) |
| Reverse Slash | 1161 물리 피해, 50% 미만 체력 대상 최대 +300% | **Reverse Slice** — 광역화(주변 적까지), 1199 피해 | **Executioner** — 출혈 속성 전환, 저체력 대상 최대 +400% |
| Momentum | 30초간 Major Brutality+Sorcery(무기·주문력 +20%)+Minor Endurance(스태미나 회복 +15%) | **Forward Momentum** — 지속 40초로 연장, 이동방해 해제+4초 면역 | **Rally** — 종료 시 1199 치유(최대 +200%로 증가) |
| **Berserker Strike** (궁극기, 150) | 1437 물리 피해(주변 포함), 대상의 물리 저항 무시하고 그만큼 자신에게 12초간 물리·주문 저항 부여 | **Onslaught** — 저항 관통으로 전환 | **Berserker Rage** — 12초간 기절·둔화·이동불가 면역 부여 |

**패시브 5개**: Forceful(광역 전이 피해 50%→100%) · Heavy Weapons(검=무기·주문력, 도끼=치명타 피해, 둔기=관통 가산, 무기 종류별 상이) · Balanced Blade(스태미나 소모 -7%→-15%) · Follow Up(강공격 후 후속 피해 +5%→+10%) · Battle Rush(처치 후 10초간 스태미나 회복 +15%→+30%)

### 2-2. One Hand and Shield (한손무기+방패)

| 스킬 | 효과 | 모프 A | 모프 B |
|---|---|---|---|
| Puncture | 1161 물리 피해+15초 도발+Major Breach(저항 -5948) | **Pierce Armor** — Minor+Major Breach 동시 부여(-2974/-5948) | **Ransack** — 동일 Breach+15초 Minor Protection(받는 피해 -5%) |
| Low Slash | 1393 피해+15초 Minor Maim | **Deep Slash** — 광역화, 1799 피해+4초 이동속도 -30% | **Heroic Slash** — 1439 피해+15초간 1.5초마다 궁극기 1 획득 |
| Defensive Posture | 4959 피해 흡수막+다음 투사체 반사 | **Absorb Missile** — 투사체 피격 시 2560 치유 추가 | **Defensive Stance** — 블록 가능량 +10% |
| Shield Charge | 1393 피해+3초 기절 | **Invasion** — 이동 거리 비례 최대 +50% 기절 지속 | **Shielded Assault** — 공격 후 6초간 5121 흡수막 |
| Power Bash | 2323 강타 피해, 시전 방해 | **Power Slam** — 2399 피해+10초 내 재시전 비용 -50% | **Reverberating Bash** — 1161 피해+3초 기절 후 1161 추가 피해 |
| **Shield Wall** (궁극기) | 6초간 모든 공격 자동 블록(비용 없음) | **Shield Discipline** — 8초로 연장+지속 중 다른 스킬 비용 0 | **Spell Wall** — 7초 자동 블록+투사체 전부 반사 |

**패시브 5개**: Fortress(스태미나 소모 -15%, 블록 비용 -36%) · Sword and Board(무기·주문력 +5%, 블록량 +20%) · Deadly Bash(강타 피해 +500, 비용 -50%) · Deflect Bolts(투사체 블록량 +14%) · Battlefield Mobility(브레이싱 이동속도 페널티 -36%)

### 2-3. Dual Wield (쌍수무기)

| 스킬 | 효과 | 모프 A | 모프 B |
|---|---|---|---|
| Twin Slashes | 580+20초 3470 출혈 피해 | **Rending Slashes** — 초기 피해 718, Hemorrhaging 부여+4초 이동속도 -30% | **Blood Craze** — 물리 속성 전환, 타격당 358 치유 |
| Flurry | 4연타 각 667 피해(채널링) | **Rapid Strikes** — 타격당 689, 비용 -270, 타격마다 +5% 누적 | **Bloodthirst** — 출혈 전환(689), 피해량 33% 치유 |
| Whirlwind | 광역 1742 피해, 저체력 대상 +33% | **Whirling Blades** — 1799 피해, 저체력 보너스 +100% | **Steel Tornado** — 반경 9m로 확대, 비용 -270 |
| Blade Cloak | 10초 Major Evasion(광역 피해 -20%)+2초마다 421 반경 피해 | **Quick Cloak** — 30초로 연장+4초 Major Expedition | **Deadly Cloak** — 펄스 피해 566로 증가 |
| Hidden Blade | 492 피해+20초 Major Brutality+Sorcery | **Shrouded Daggers** — 최대 3대상 616 튕김 | **Flying Blade** — 대상 표식 후 재시전 시 돌진, 버프 40초로 연장 |
| **Lacerate** (궁극기, 150) | 8초간 4660 피해(주변 적 전방 원뿔)+피해량 50% 자가 치유 | **Rend** — 지속 16초로 2배 연장, 총 피해 8667 | **Thrive in Chaos** — 적중당 피해 +6% 누적(최대 6스택) |

**패시브 5개**: Slaughter(25% 미만 체력 대상 피해 +10%→+20%) · Dual Wield Expert(보조무기 무기력 3%→6% 가산) · Controlled Fury(비용 -7%→-15%) · Ruffian(군중제어 상태 대상 피해 +8%→+15%) · Twin Blade and Blunt(무기 종류별 가산 2배)

### 2-4. Bow (활)

| 스킬 | 효과 | 모프 A | 모프 B |
|---|---|---|---|
| Snipe | 1076 피해(0.8초 채널) | **Lethal Arrow** — 독 전환+Minor Defile(받는 치유 -6%) | **Focused Aim** — 사거리 40m로 확대, 비용 -270 |
| Volley | 8초간 초당 342 광역 지속 피해 | **Endless Hail** — 13초로 연장 | **Arrow Barrage** — 반경 7m·초당 460으로 확대 |
| Scatter Shot | 1806 피해+8m 넉백 | **Magnum Shot** — 2168 피해로 증가 | **Draining Shot** — 3초간 이동속도 -60%+2808 치유 |
| Arrow Spray | 전방 615 피해 | **Bombard** — 4초 이동불가+비용 -270 | **Acid Spray** — 독 전환(557+444 추가 피해) |
| Poison Arrow | 1161+20초 3470 독 지속 피해 | **Venom Arrow** — 시전 차단+3초 기절+20초 Major Brutality+Sorcery | **Poison Injection** — 저체력 대상 지속 피해 최대 +120% |
| **Rapid Fire** (궁극기, 175) | 4초간 6150 피해(채널, 이동 가능+행동불가 면역) | **Toxic Barrage** — 독 전환+1초 지연 후 추가 3080 독 피해 | **Ballista** — 터렛 소환, 5초간 6461 피해 |

**패시브 5개**: Long Shots(원거리 대상 피해 +6%→+12%) · Accuracy(치명타 수치 +657→+1314) · Ranger(비용 -7%→-15%) · Hawk Eye(경/중공격 성공 시 5초간 +2%→+5% 중첩, 최대 5스택) · Hasty Retreat(구르기 회피 후 이동속도 버프 2초→4초)

### 2-5. Destruction Staff (파괴 마법 지팡이)

| 스킬 | 효과 | 모프 A | 모프 B |
|---|---|---|---|
| Force Shock | 화/냉/전 속성 각 696 피해(합산) | **Crushing Shock** — 시전 중 대상 차단+3초 기절 | **Force Pulse** — 상태이상 걸린 대상 최대 2명에 2399 추가 피해 |
| Wall of Elements | 10초간 초당 281 전방 벽 피해 | **Unstable Wall of Elements** — 종료 시 1199 폭발 | **Elemental Blockade** — 지속 14초·범위 확대 |
| Destructive Touch | 1161+20초 3470 지속 피해 | **Destructive Clench** — 지팡이 속성별 효과 분화(화=넉백, 냉=Major Maim+이동불가+도발, 전=광역) | **Destructive Reach** — 사거리 28m로 확대, 비용 감소 |
| Weakness to Elements | 30초 Major Breach(-5948), 무비용 | **Elemental Susceptibility** — 7.5초마다 화상/냉기/감전 상태이상 순환 부여 | **Elemental Drain** — 60초 Minor Magickasteal(아군까지 매초 168 마나 회복) |
| Impulse | 반경 6m 1742 피해 | **Elemental Ring** — 지정 위치 폭발형(1799)으로 전환 | **Pulsar** — 10초 Minor Mangle(최대체력 -10%)+상태이상 적용 확률 3배 |
| **Elemental Storm** (궁극기, 250) | 2초 예열 후 7초간 초당 615 광역 지속 피해 | **Elemental Rage** — 초당 778, 지팡이 속성별 추가 효과(화=+15% 피해/냉=3초 이동불가/전=지속 +2초) | **Eye of the Storm** — 시전자 위치 추종형으로 전환 |

**패시브 5개**: Tri Focus(지팡이 속성별 강공격/피해 특화, 화=DoT 2230→4480/전=주변 전이 50%→100%/냉=블록 강화) · Penetrating Magic(주문 관통 1487→2974) · Elemental Force(상태이상 적용 확률 +50%→+100%) · Ancient Knowledge(속성별 DoT/직격/블록 강화) · Destruction Expert(처치 시 마나 1800→3600 회복, 방어막 흡수 시 900→1800)

### 2-6. Restoration Staff (회복 마법 지팡이)

| 스킬 | 효과 | 모프 A | 모프 B |
|---|---|---|---|
| Grand Healing | 10초간 4631 지역 치유 | **Illustrious Healing** — 15초·5486로 증가 | **Healing Springs** — 4642 치유+대상당 마나 회복 15(최대 20스택) |
| Regeneration | 10초간 자신+인접 1명 3480 치유 | **Rapid Regeneration** — 5초로 단축, 저체력 대상 치유 +50% | **Radiating/Mutagen Regeneration** — 최대 3명까지 확대 |
| Blessing of Protection | 전방 2613 치유+10초 Minor Resolve(저항 +2974) | **Blessing of Restoration** — 2970 치유+범위·지속(20초) 확대 | **Combat Prayer** — 2784 치유+Minor Berserk(피해 +5%)+Minor Resolve 동시 부여 |
| Steadfast Ward | 최저 체력 대상에 821(부상 비례 최대 +100%) 흡수막 | **Ward Ally** — 자신+아군 동시 2중 캐스팅 | **Healing Ward** — 잔여 흡수막의 33%를 매초 치유로 전환 |
| Force Siphon | 24초 Minor Lifesteal(피해 시 매초 600 아군까지 치유), 무비용 | **Siphon Spirit** — 30초 연장+Minor Magickasteal(매초 168 마나 회복) 추가 | **Quick Siphon** — 치유 대상에 4초 Minor Expedition |
| **Panacea** (궁극기, 125) | 5초간 매초 1026 치유 | **Life Giver** — 동시에 Regeneration·Blessing of Protection·Steadfast Ward 무비용 자동 시전 | **Light's Champion** — 8초 Major Force(치명타 피해 +20%) 부여 |

**패시브 5개**: Essence Drain(강공격 후 2~4초 Major Mending(치유량 +16%)+주변 치유) · Restoration Expert(30% 미만 체력 대상 치유 +8%→+15%) · Cycle of Life(강공격 완료 시 마나 +15%→+30% 추가 회복) · Absorb(주문 블록 시 마나 288~540 회복) · Restoration Master(회복 지팡이 치유량 +3%→+5%)

### 2-7. 무기 라인 6종이 보여주는 것

- **구조는 거의 동형**이다 — 액티브 5개(각 2모프)+궁극기 1개(2모프)+패시브 5개, 총 슬롯 11개(6액티브+궁극기 자리 포함 시)·모프 후보 22개. 6개 라인 전부 이 틀을 공유해 "라인 하나 배우는 비용"이 무기군마다 동일하다 — 본작이 무기군 트리를 설계할 때 **무기군마다 노드 수를 다르게 줄 필요가 없다**는 실사례
- **역할 분화가 뚜렷하다** — 근접 4종(2H/1H&S/DW/Destro는 혼합)은 공격형·생존형이 섞여 있고, Restoration Staff 하나만 100% 치유 특화다. 즉 "무기군 = 곧 역할"이 아니라 **6종 중 5종은 공격 계열, 1종만 순수 지원**이라는 비대칭 구조
- **모프는 항상 "수치 강화형 vs 유틸/부가효과형"의 이항 대립**이다(예: Two Handed Cleave → 출혈 DoT 전환(Carve) vs 방어막 강화(Brawler)). diablo2 아마존 패시브가 "변형 노드가 전무"했던 것과 달리, ESO 무기 라인은 **액티브 전체가 변형(모프)을 갖는다**는 점에서 정반대 극단이다

---

## 3. 방어구 스킬라인 3종 — 전수

> 각 라인 액티브는 **정확히 1개**(+모프 2종)뿐이다 — 최초 조사의 "패시브만" 판정을 정정한다([00_overview.md §0-1](00_overview.md#0-1-이번-심화가-뒤집은-것--최초-조사의-오염-판정-2건이-실은-정확했다)). 착용한 방어구 부위 수(0~7)에 비례해 패시브 효과가 스케일하는 것이 이 3종 라인의 공통 문법이다.

### 3-1. Light Armor (경장)

- **Annulment**(액티브, Rank 22) — 마나를 전환해 6초간 8000 피해 흡수막(최대체력 50% 캡). 비용 4590 마나
  - **Dampen Magic** 모프 — 캡 60%로 상향, 경장 부위당 흡수량 +6%
  - **Harness Magicka** 모프 — 흡수 시 마나 229 회복(최대 3회), 부위당 +33%
- **패시브 5개**: Grace(둔화 저항+질주 비용 감소, 부위당) · Evocation(마나 회복 +2~4%/부위, 스킬 비용 -1~2%/부위) · Spell Warding(주문 저항 +363~726/부위) · Prodigy(5부위 이상, 치명타 수치 +109~219/부위) · Concentration(5부위 이상, 주문 관통 +469~939/부위)

### 3-2. Medium Armor (중장)

- **Evasion**(액티브, Rank 22) — 20초간 Major Evasion(광역 피해 -20%). 비용 3213 스태미나
  - **Shuffle** 모프 — 이동방해 해제+부위당 1초 면역 추가
  - **Elude** 모프 — 광역 피해 받을 시 Major Expedition(이동속도 +30%) 부여, 부위당 지속 증가
- **패시브 5개**: Dexterity(치명타 피해/치유 +1~2%/부위) · Wind Walker(스태미나 회복 +2~4%/부위, 비용 -1~2%/부위) · Improved Sneak(은신 비용/탐지범위 감소) · Agility(5부위 이상, 무기·주문력 +1~2%/부위) · Athletics(질주 속도+구르기 비용 감소)

### 3-3. Heavy Armor (중갑)

- **Unstoppable**(액티브, Rank 22) — 20초간 Major Resolve(물리·주문 저항 +5948), 6초간 넉백·행동불가 면역(대신 이동속도 -65%). 비용 3213 스태미나
  - **Unstoppable Brute** 모프 — Major Ward 추가+부위당 저항해제(Break Free) 비용 -5%
  - **Immovable** 모프 — 지속 23초·면역 7초로 연장, 부위당 블록량·둔화 강도 +5%
- **패시브 5개**: Resolve(물리·주문 저항 +114~343/부위) · Constitution(체력 회복 +2~4%/부위, 피격 시 자원 회복) · Juggernaut(최대체력 +1~2%/부위) · Revitalize(5부위 이상, 강공격 자원 회복 +2~4%/부위) · Rapid Mending(5부위 이상, 받는 치유 +1%/2부위~1부위)

### 3-4. 방어구 라인 3종이 보여주는 것

- **무기 라인(§2, 액티브 5+궁극기 1)보다 훨씬 가볍다** — 액티브 1개, 궁극기 없음. 방어구는 "장착만 해도 자동 성장"하는 대신 **선택지 자체가 적다**는 것이 무기 라인과의 근본 차이다. [00_overview.md §4-4](00_overview.md#4-4-무기방어구길드-스킬라인의-구조-밀도-차이는-본작-다층-트리-설계에-직접-참고가-된다)가 지적하듯, 본작이 무기군 숙련 트리를 설계할 때 이 "가벼운 무게"가 더 적절한 참고 모델이다
- **패시브 전부가 "착용 부위 수 비례"로 스케일**한다 — 개별 노드에 투자하는 게 아니라 **장비 슬롯 자체가 곧 투자**인 구조. 이는 본작의 "포인트 배분형 마스터리"와는 완전히 다른 축(장비 구성이 스킬 강도를 결정)이라 직접 이식 대상은 아니지만, "한 우선순위(경장 몇 부위 vs 중갑 몇 부위)를 정하면 여러 패시브가 동시에 스케일한다"는 압축 설계 원리는 참고할 만하다

---

## 4. 길드 스킬라인 6종 — 전수

> 6개 라인의 구조 밀도가 서로 크게 다르다 — Fighters Guild·Mages Guild·Psijic Order는 클래스급(액티브 4~5+패시브 4~5+궁극기), Undaunted는 액티브 5+패시브 2, Thieves Guild·Dark Brotherhood는 패시브 위주에 액티브가 0~1개뿐이다.

### 4-1. Fighters Guild

- **궁극기 — Dawnbreaker**: 전방 2904+6초간 3483 추가 피해. **Dawnbreaker of Smiting**(3600+4314, 2초 기절 추가) / **Flawless Dawnbreaker**(20초간 무기·주문력 +300)
- **액티브 4개**: Silver Bolts(2090 피해 → **Silver Shards**광역/**Silver Leash**끌어오기+도발) · Circle of Protection(20초 Minor Protection+Endurance → **Turn Evil**공포/**Ring of Preservation**치유 전환) · Expert Hunter(은신 탐지+치명타 수치 → **Evil Hunter**길드 피해 +25%/**Camouflaged Hunter**측면 치명타 시 버프) · Trap Beast(함정 1161+20초 3470 → **Barbed Trap**피해 증가/**Lightweight Beast Trap**투척형)
- **패시브 5개**: Intimidating Presence(비용 -15%) · Slayer(슬롯당 무기·주문력 +1~3%) · Banish the Wicked(처치 시 궁극기 획득) · Skilled Tracker(길드 스킬 피해 +10%, 뱀파이어/웨어울프 상대 2배) · Bounty Hunter(현상금 퀘스트)

### 4-2. Mages Guild

- **궁극기 — Meteor**(200): 1437 화염 피해+넉백+2초 기절. **Ice Comet**(냉기 전환+5초 이동속도 -50%) / **Shooting Star**(적중당 궁극기 12 획득)
- **액티브 4개**: Magelight(은신 탐지+치명타 수치 → **Inner Light**최대마나 +5%/**Radiant Magelight**범위 확대+기절 면역) · Entropy(20초 4631 피해 → **Degeneration**자버프/**Structured Entropy**자가 치유 전환) · Fire Rune(함정 2323 화염 → **Volcanic Rune**공중부양+기절/**Scalding Rune**DoT 추가) · Equilibrium(체력 6000↔마나 3000 교환 → **Balance**저항 버프/**Spell Symmetry**다음 시전 비용 -33%)
- **패시브 5개**: Persuasive Will(NPC 설득) · Mage Adept(비용 -8%→-15%) · Everlasting Magic(길드 스킬 지속시간 +2초) · Magicka Controller(슬롯당 최대마나·회복 +1~2%) · Might of the Guild(길드 스킬 시전 시 Empower 부여)

### 4-3. Undaunted

- **액티브 5개, 궁극기 없음(N/F — §7)**: Blood Altar(체력 소모→흡생 4320비용 → **Sanguine Altar**지속 연장/**Overflowing Altar**시너지 치유량 65%로 강화) · Trapping Webs(둔화 50%+2322물리+3098독 → **Shadow Silk**거미 소환/**Tangling Webs**시너지 공포) · Inner Fire(1045 화염+도발 → **Inner Rage**동시 시너지 3인/**Inner Beast**스태미나 전환) · Bone Shield(6초 4958 흡수막 → **Spiked Bone Shield**피해 반사/**Bone Surge**치유량 +16%) · Necrotic Orb(투사체 초당 316 피해 → **Mystic Orb**전 자원 회복/**Energy Orb**치유 전환)
- **패시브 2개**: Undaunted Command(시너지 발동 시 최대자원 2%→4% 회복) · Undaunted Mettle(착용 방어구 종류당 최대자원 1%→2%)

### 4-4. Psijic Order

- **궁극기 — Undo**(165): 4초 전 상태(체력·마나·스태미나·위치)로 되돌림. **Precognition**(시전 중 군중제어 면역) / **Temporal Guard**(슬롯 중 Minor Protection)
- **액티브 5개**: Time Stop(2초 채널 후 3초 기절+둔화 → **Borrowed Time**치유 무효화/**Time Freeze**시전시간 제거+기절 연장) · Imbue Weapon(다음 공격 강화 → **Elemental Weapon**마법 속성 전환/**Crushing Weapon**Major Breach 추가) · Accelerate(4초 이동속도+20초 치명타피해 → **Channeled Acceleration**효과 3배/**Race Against Time**이동방해 해제+면역) · Mend Wounds(공격이 치유로 전환 → **Mend Spirit**아군 저항버프/**Symbiosis**아군 치유량 50% 자가 치유) · Meditate(토글형 자가 치유+자원회복 → **Deep Thoughts**회복량 증가/**Introspection**초기 치유 후 점증)
- **패시브 5개**: See the Unseen(균열 상호작용) · Clairvoyance(비용 -8%→-15%) · Spell Orb(시전 누적 시 투사체 발사) · Concentrated Barrier(블록 중 흡수막) · Deliberation(시전/채널 중 Major Protection, 피해 -30%)

### 4-5. Thieves Guild — 패시브 전용(액티브 0)

- Finders Keepers(도적 상자 개봉 자격) · Swiftly Forgotten(수배도 감소, 4랭크) · Haggling(장물 판매가 +2~10%, 4랭크) · Clemency(1일 1회 체포 면제) · Timely Escape(전투 중 탈출 지원) · Veil of Shadows(경비병 탐지범위 -10%)

### 4-6. Dark Brotherhood — 액티브 1개+패시브 위주

- **Blade of Woe**(유일한 액티브) — 기습 즉사기, 대상 경험치 획득량 -75%, 플레이어·강적 대상 불가
- **패시브 5개**: Scales of Pitiless Justice(수배·경고 감소, 4랭크 20%→50%) · Padomaic Sprint(암살 후 이동속도 버프, 4랭크로 지속시간 연장) · Shadowy Supplier(1일 1회 무료 아이템) · Shadow Rider(탑승 중 몬스터 인식범위 -50%) · Spectral Assassin(암살 시 15% 확률로 목격 면제)

### 4-7. 길드 스킬라인 6종이 보여주는 것

- **"길드"라는 같은 범주 이름 아래 구조가 3단으로 갈린다** — ① 클래스급 완비(Fighters/Mages/Psijic, 액티브 4~5+패시브 4~5+궁극기) ② 중간(Undaunted, 액티브 5+패시브 2, 궁극기 없음) ③ 사실상 패시브 전용(Thieves/Dark Brotherhood, 액티브 0~1). 이는 **"같은 상위 범주(길드) 안에서도 콘텐츠 비중에 따라 트리 무게를 의도적으로 다르게 준다"**는 설계 선례다 — Thieves/Dark Brotherhood는 전투보다 잠입/암살 콘텐츠(도둑질·계약 암살) 자체가 보상이라 전투 스킬을 적게 준 것으로 읽힌다
- 본작 skill_design.md가 전직 갈래·마스터리 탭의 "무게"를 통일할지 고민할 때, ESO 길드 사례는 **"콘텐츠 성격이 다르면 스킬라인 무게도 다를 수 있다"**(전투 중심 갈래는 무겁게, 비전투/유틸 중심 갈래는 가볍게)는 비대칭 설계가 실제로 잘 굴러간 사례로 참고할 만하다

---

## 5. 클래스 스킬라인 — 대표 표본(용기사) + 21개 명단

### 5-1. 7클래스 21개 스킬라인 명단

| 클래스 | 라인 1 | 라인 2 | 라인 3 |
|---|---|---|---|
| **Dragonknight**(용기사) | Ardent Flame | Draconic Power | Earthen Heart |
| **Sorcerer**(소서러) | Dark Magic | Daedric Summoning | Storm Calling |
| **Nightblade**(나이트블레이드) | Assassination | Shadow | Siphoning |
| **Templar**(성전사) | Aedric Spear | Dawn's Wrath | Restoring Light |
| **Warden**(워든) | Animal Companions | Green Balance | Winter's Embrace |
| **Necromancer**(네크로맨서) | Grave Lord | Bone Tyrant | Living Death |
| **Arcanist**(아케인주의자, 2023 신설) | Herald of the Tome | Soldier of Apocrypha | Curative Runeforms |

[검색합성] — 7클래스×3라인=21이 다수 소스로 교차 확인됨(최초 조사 §5-2가 배제한 "43개"는 오염 유지). Arcanist는 고유 자원 **Crux**(스킬로 축적→소비 스킬로 사용)를 쓴다는 것까지 확인했으나 정확한 수치는 미확보(§7 N/F).

### 5-2. Arcanist 3라인 — 스킬 이름만 확보 (수치 N/F)

- **Herald of the Tome**(공격): 액티브 Runeblades·Fatecarver·Abyssal Impact·Tome-Bearer's Inspiration·The Imperfect Ring(각 모프 2종) + 궁극기 The Unblinking Eye(모프: The Languid Eye/The Tide King's Gaze) + 패시브 4개(Splintered Secrets·Psychic Lesion·Harnessed Quintessence·Fated Fortune)
- **Soldier of Apocrypha**(방어): 액티브 Runic Jolt·Runespite Ward·Fatewoven Armor·Runic Defense·Rune of Eldritch Horror + 궁극기 Gibbering Shield(모프: Gibbering Shelter/Sanctum of the Abyssal Sea) + 패시브 4개
- **Curative Runeforms**(치유): 액티브 Runemend·Remedy Cascade·Chakram Shields·Arcanist's Domain·Apocryphal Gate + 궁극기 Vitalizing Glyphic(모프: Glyphic of the Tides/Resonating Glyphic) + 패시브 4개(Intricate Runeforms·Erudition·Hideous Clarity·Healing Tides)

[skillbook] — 정확한 수치(피해량·지속시간·비용)는 이번 세션에서 미확보, N/F로 남긴다.

### 5-3. 대표 표본 — Dragonknight (용기사) 3라인 전수

#### Ardent Flame (공격 특화)

- **궁극기 Dragonknight Standard**(250) — 15초간 지역 버프(무기·주문력 +375, 받는 피해 -12%). **Shifting Standard**(적 디버프형) / **Standard of Might**(자기 강화형)
- **액티브 6개**: Searing Strike(2300+10초 4590 화염 → **Searing Claw**스태미나 전환/**Burning Embers**치유형) · Lava Whip(4600 화염, Off Balance 대상 강화 → **Molten Whip**중첩버프/**Flame Lash**치유형) · Core of Flame(4초간 자원 15% 회복 후 3450 폭발 → **Soul of Flame**차단+기절/**Heart of Flame**결손체력 비례 치유) · Chains of Flame(끌어오기+2159+도발+Major Cowardice → **Chains of Devastation**자가 견인+버프/**Chains of Dominance**디버프 연장) · Hearthfire(15초 지역 치유+Minor Fortitude/Heroism → **Fire Keeper**체류 시 강화) · Inferno(5초마다 1742 화염 파동+Major Prophecy/Savagery → **Incinerate**피해 강화/**Cauterize**치유 전환)
- **패시브 4개**: Combustion(화상/독 피해 +20%→+40%, 자원 회복) · Traumatic Burns(화염피해 대상 취약화+둔화) · Fan the Flames(화상 적용확률 +50%→+110%, 피해 +25%→+55%) · A Soul Ablaze(받는 치유 +4%)

#### Draconic Power (방어 특화)

- **궁극기 Dragon Leap**(125) — 돌진+2838 물리 피해+2초 기절. **Take Flight**(3267 피해+10% 데미지버프) / **Ferocious Leap**(화염 전환+착지 시 최대체력 100% 흡수막)
- **액티브 6개**: Dragonfire Breath(3450+10초 3445 → **Disintegrating Dragonfire**Major Breach 추가/**Engulfing Flames**채널링 전환·최대 80% 스택) · Dark Talons(광역 1742+4초 이동불가 → **Burning Talons**피해 강화/**Choking Talons**Minor Maim 추가) · Dragon Blood(5245 치유+Major Fortitude → **Blood of the Green Dragon**추가 DoT치유/**Blood of the Elder Dragon**아군까지 치유) · Wing Buffet(4m 넉백+1.8초 기절+투사체 피해 -50% → **Fleetstep Wings**이동방해 면역/**Protect the Brood**파티 투사체 경감) · Chains of Flame(Ardent Flame과 공유) · Spiked Armor(패시브 겸 액티브 계열, N/F 상세)
- **패시브 4개**: Burnished Scales(블록 추가 경감 +4%→+10%) · World in Ruin(광역/DoT 피해 +3%→+7%) · Elder Dragon(라인 액티브 시전 시 Minor Brutality+체력회복) · The Storm Voice(궁극기 시전 시 소모량 비례 자원 환원, 슬롯 수만큼 가산)

#### Earthen Heart (유틸/탱킹 특화)

- **궁극기 Magma Armor**(200) — 15초간 받는 피해를 최대체력 3%로 제한(궁극기 획득 불가 대가). **Magma Shell**(아군에게 최대체력 133% 흡수막 부여로 전환)
- **액티브 5개**: Superheated Ward(6초 5784 흡수막 → **Volcanic Ward**피해경감+종료시 치유/**Magma Fist**스태미나 공격형 전환) · Molten Weapons(30초 파티 버프+공격시 화염피해 가산 → **Igneous Weapons**지속·범위 확대/**Molten Armaments**Empower 전환) · Obsidian Shield(자신+아군 흡수막+Major Mending → **Igneous Shield**자가 강화형/**Fragmented Shield**최대자원 비례 스케일) · Petrify(4초 기절+Minor Breach → **Fossilize**디버프 연장+이동불가/**Shattering Rocks**기절 후 폭발피해+자가 치유) · Earthspike Mantle(피해 가산+Major Resolve → **Earthshield Mantle**흡수막 추가/**Shatterspike Mantle**주변 폭발피해)
- **패시브 4개**: Heart of Stone(방어력 +1487→+2974) · Avalanche(피해 시 1% 중첩, 최대 10스택) · Blessing at the Peak(라인 스킬 사용 시 궁극기 생성+치명타피해) · Mountain Giant(강공격 시 Off Balance 부여+자원 회복)

### 5-4. 클래스 라인이 보여주는 것

- **용기사 3라인은 "공격/방어/유틸"로 뚜렷하게 분업**한다 — Ardent Flame(순수 딜), Draconic Power(생존+이동기), Earthen Heart(탱킹+지속딜)로, 클래스 하나가 **3가지 역할 후보를 전부 트리 형태로 쥐고 있다.** 이는 본작 `hero_design.md`의 "직업당 역할 고정"과 다른 방향 — ESO는 "직업 하나 = 트리 3개 = 역할 3종 선택지"인 반면, 본작은 직업이 역할을 먼저 정하고 트리가 그 역할을 강화한다
- **모프 패턴이 무기 라인(§2)과 동일한 이항 대립**을 반복한다 — "수치 강화형 vs 부가효과형"(예: Take Flight=순수 피해 증가, Ferocious Leap=생존기 부가). 클래스·무기·길드 3범주 전부 이 문법을 공유한다는 것은 **모프 이항 대립이 ESO 스킬 시스템 전체의 통일 규칙**이라는 뜻이다

---

## 6. Class Mastery(Update 50, 2026) — 구체 패시브

**서브클래싱(§1-7)이 클래스 배타성을 허물자, 그 반작용으로 "순정 클래스"를 다시 보상하는 별도 스킬라인을 최근 추가**했다.

- **자격**: 서브클래싱을 전혀 안 하고 **원 클래스 3라인 전부를 랭크 50까지** 채운 캐릭터만 해금[공식]
- **구조**: 클래스마다 **패시브 5개** 중 **2개**를 고른다. **전용 포인트 2개**(Class Mastery Points) — 기존 스킬포인트 풀과 **별개**, 오직 이 라인에만 쓴다[공식]
- 서브클래싱을 켜는 순간(원 클래스 라인 하나라도 다른 라인으로 교체) **이 라인의 구매분이 자동 환불·회수**되고 라인 자체가 숨는다 — 서브클래싱과 **상호 배타**[공식]

### 6-1. 용기사 Class Mastery 패시브 5종 (실제 목록 — 최초 조사의 N/F를 해소)

| 이름 | 효과 |
|---|---|
| **Lead From the Front** | The Storm Voice 랭크2 발동 시, 28m 내 파티원에게 궁극기 소모 15당 1초씩 Major Berserk+Protection(피해 +10%, 받는 피해 -10%) 부여 |
| **Resolute Defense** | 브레이싱(블록 유지) 매초 블록 피해량 +6%씩 중첩(최대 5중첩=+30%), 블록 시 20% 확률로 스태미나 500 회복 |
| **Wildfire Embers** | 자신의 DoT 효과 종료 시 대상에 12초간 2499 화염 피해의 새 DoT 부여, 최대 12스택·스택당 +25% 피해 |
| **Booming Voice** | The Storm Voice 랭크2 발동 시 궁극기 소모량당 10초간 체력·마나·스태미나 회복 +5 추가 |
| **Inexorable Descent** | Landslide 패시브 강화 — 스택당 피해량·치유량·보호막 강도 +1% |

[검색-가이드] hacktheminotaur.com — 용기사 기준. **나머지 6클래스(35-5=30개 패시브)는 이번 세션에서 미확보**(§7 N/F).

- 공식 설명: "primary goal"은 **순정 클래스와 서브클래싱 빌드 사이 성능 격차를 줄이는 것**, 시스템 자체가 "HIGHLY iterative"(계속 손볼 예정)임을 공식 문서가 명시[공식]
- → **본작 시사점**: 트리를 하나 더 만드는 대신 **기존 트리(클래스 라인) 완주라는 조건**만으로 새 보상층을 열었다는 것이 핵심 — [00_overview.md §4-5](00_overview.md#4-5-격차-완화-장치는-트리-구조-결정과-별개로-나중에-필요해질-수-있다) 참고

---

## 7. 출처 · 미확인

### 7-1. 출처

**공식**
- https://help.elderscrollsonline.com/app/answers/detail/a_id/74901/~/class-mastery---the-elder-scrolls-online
- https://help.elderscrollsonline.com/app/answers/detail/a_id/7821/~/how-do-i-increase-my-skills-in-the-elder-scrolls-online

**Fextralife (이번 심화, 전부 직접 WebFetch 성공)**
- https://elderscrollsonline.wiki.fextralife.com/Two-Handed+Skills
- https://elderscrollsonline.wiki.fextralife.com/One-Handed+and+Shield+Skills
- https://elderscrollsonline.wiki.fextralife.com/Dual+Wield+Skills
- https://elderscrollsonline.wiki.fextralife.com/Bow+Skills
- https://elderscrollsonline.wiki.fextralife.com/Destruction+Staff+Skills
- https://elderscrollsonline.wiki.fextralife.com/Restoration+Staff+Skills
- https://elderscrollsonline.wiki.fextralife.com/Light+Armor+Skills
- https://elderscrollsonline.wiki.fextralife.com/Medium+Armor+Skills
- https://elderscrollsonline.wiki.fextralife.com/Heavy+Armor+Skills
- https://elderscrollsonline.wiki.fextralife.com/Fighters+Guild+Skills
- https://elderscrollsonline.wiki.fextralife.com/Mages+Guild+Skills
- https://elderscrollsonline.wiki.fextralife.com/Undaunted+Skills
- https://elderscrollsonline.wiki.fextralife.com/Psijic+Order+Skills
- https://elderscrollsonline.wiki.fextralife.com/Thieves+Guild+Skills
- https://elderscrollsonline.wiki.fextralife.com/Dark+Brotherhood+Skills
- https://elderscrollsonline.wiki.fextralife.com/Ardent+Flame
- https://elderscrollsonline.wiki.fextralife.com/Draconic+Power
- https://elderscrollsonline.wiki.fextralife.com/Earthen+Heart

**eso-skillbook.com** — https://eso-skillbook.com/skillline/two-handed · /skillline/one-hand-and-shield · /skilltree/arcanist (Two Handed·One Hand and Shield는 Fextralife와 수치 교차 일치 확인)

**빌드 가이드**
- hacktheminotaur.com — 용기사 Class Mastery 패시브: https://hacktheminotaur.com/eso-guides/eso-dragonknight-class-mastery-passives/
- eso-hub.com — Arcanist 스킬(WebFetch 403, 스니펫만): https://eso-hub.com/en/skills/arcanist

**공식 포럼**(forums.elderscrollsonline.com) — 스킬라인 XP 배분·모프 규칙·서브클래싱 관련 다수 스레드, 스니펫 경유(최초 조사 시점 확보분 유지)

### 7-2. 미확인(N/F) 총괄

| 항목 | 상태 |
|---|---|
| **Undaunted 궁극기 유무** | Fextralife 원문에 궁극기 항목이 없어 "없음"으로 잠정 처리했으나, 다른 5개 완비형 길드 라인과 패턴이 달라 완전 확정은 아님 |
| **Arcanist 3라인의 정확한 수치**(피해량·지속시간·비용) | 스킬·모프 이름 전량은 확보, 수치는 eso-skillbook이 제공하지 않아 미확보 |
| **나머지 6클래스(Sorcerer·Nightblade·Templar·Warden·Necromancer)의 스킬·모프 전수** | 라인 이름만 확정, 용기사 수준의 스킬별 수치는 이번 세션 범위 밖 |
| **Class Mastery 패시브 30개**(7클래스 중 용기사 제외 6클래스×5개) | 용기사 5개만 확보 |
| **무기 스킬라인 궁극기의 정확한 랭크 해금 시점**(스킬라인 랭크 몇에서 궁극기가 열리는가) | 개별 스킬 Rank 표기는 일부 확보(예: Two Handed 22)했으나 궁극기 자체의 해금 랭크는 명시적으로 확인 못함 |
| **서브클래싱 세부 규칙**(어떤 라인 조합이 금지되는가 등) | 최초 조사 범위 밖 유지 — §1-7은 골격만 |
| UESP·eso-hub 본문 표(전체 패시브 수치, 스킬라인 랭크 계단표) | WebFetch 403 지속 — Fextralife·eso-skillbook으로 대체했으나 세부 계단표(랭크 6/14/22/30/38/42 각각의 정확한 조건)는 부분적으로만 확보 |

---
*마지막 업데이트: 2026-08-28 (`eso_reference.md` §2를 §1로 이관, 무기 6종·방어구 3종·길드 6종 스킬라인 전수 신규 확보 및 궁극기·액티브 유무 정정, 용기사 클래스 3라인 전수, Class Mastery 용기사 5패시브 확보, Arcanist 스킬 이름 확보)*
