# Lootun — 거점 건물 전수 조사

> 상위 문서: [00_overview.md](00_overview.md)
> 짝 문서: [01_skills.md](01_skills.md)(스킬) · [02_items.md](02_items.md)(아이템)
> 상태: **26종 전수 + 랭크별 효과 심화** (2026-08-31). `00_overview.md §7` v2(2026-08-26)를 흡수하고 **구 「정체 미상」 4종 중 3종을 규명**했다
> 목적: 본작의 **게임 형태 참고작**(CLAUDE.md)이 「거점」이라는 층을 실제로 무엇으로 채웠는지 — 본작은 컨셉 락에서 **파견처의 건설·업그레이드를 폐기**했으므로(GAME_DESIGN.md §9 08-26), 이 문서는 **채택할 설계도가 아니라 안 가기로 한 길의 지도**다
> ⚠ **이 문서의 수치는 전부 Lootun의 수치다.** 본작 SSOT가 아니며 `src/data/*.csv`로 옮기지 말 것
> ⚠ Lootun에는 위키가 없다. **랭크별 비용·효과 상당수가 게임 클라이언트 툴팁 안에만 있고 외부에 인덱싱되지 않는다.** 아래 `미확인`은 탐색 실패가 아니라 **공개 정보의 부재**다

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 |
| 1 | 26종 분류 — v2에서 재편된 것 |
| 2 | 제작·개조·경제 (6) |
| 3 | 성장 상한 트랙 (4) |
| 4 | 자동화·로스터 (2) |
| 5 | 콘텐츠 게이트 (8) |
| 6 | 저장 (2) |
| 7 | 채집 (4) |
| 8 | 해금 의존 그래프 |
| 9 | 게이트와 랭크 보상의 분포 |
| 10 | 재화·비용 |
| 11 | 본작 시사점 — 안 가기로 한 길 |
| 12 | 정정 이력 (v2 → v3) |
| 13 | 출처 · 미확인(N/F) 총괄 |

---

## 0. 조사 방법과 신뢰도

| 등급 | 뜻 |
|---|---|
| **[확정]** | 개발자 직접 답변 · 공식 패치노트 원문 · Deep Dive 공지 |
| **[추정]** | 커뮤니티 가이드 2차 서술, 또는 출처 간 숫자 불일치 |
| **[미확인]** | 여러 경로로 시도했으나 공개 정보 자체를 찾지 못함 |

**핵심 1차 출처**

- Steam 개발자(`arrowsoftgames`) 직접 답변 3건 — Pinnacle/Endless Mode · Hunt 슬롯 · 소켓
- Steam 공식 패치노트 6건 — 0.8 · 0.9.4 · 0.9.5 · 1.0 · 1.2 · 1.3
- Deep Dive #5 「Building Upgrades & Professions」(2022-06-04) — **초기 빌드 기준이라 Expedition·Fortress·Pinnacle 등 후기 콘텐츠를 다루지 않는다**
- Steam 커뮤니티 가이드 「Walkthrough 0.9」(id=3044062918) — 가장 포괄적인 2차 출처
- Steam 커뮤니티 가이드 「Endgame crafting: Nemesis Infusion」(id=2870906456) — Castle·Watchtower 랭크 표의 근거
- 건물 **목록**의 근거는 Steam 도전과제 — 건물마다 "Fully upgrade the X"가 하나씩 있고, 이것이 사실상 유일한 공식 전수 목록이다

⚠ **동명이물 오염이 심하다.** 조사 중 걸러낸 것 — Lootbound · Against the Storm · Nonograms Katana(각각 동명 건물 보유) · **Path of Exile 2의 "Grand Expedition"**(검색이 반복해서 이쪽으로 샌다) · The Mighty Quest for Epic Loot.

---

## 1. 26종 분류 — v2에서 재편된 것

**v2(2026-08-26)는 4종을 「정체 미상」으로 남겼다. 그중 셋이 규명되면서 분류가 바뀐다.**

| 분류 | 건물 | v2 대비 |
|---|---|---|
| **제작·개조·경제 (6)** | Scrapper · Blacksmith · Artisan's Hall · Gemcutter's Cabin · Alchemist's Hut · Community Project | — |
| **성장 상한 트랙 (4)** | Keep · Castle · Watchtower · **Fortress** | Fortress 편입 (3 → 4) |
| **자동화·로스터 (2)** | Barracks · Armoury | — |
| **콘텐츠 게이트 (8)** | Bounty Board · War Camp · Domain of Agony · Map Room · Ancient Reliquary · **Expedition** · **Grand Expedition** · **Pinnacle** | 3종 편입 (5 → 8) |
| **저장 (2)** | Item Vault · Hidden Vault | — |
| **채집 (4)** | Profession Hall · Mine · Forest · Farm | — |

**규명된 셋**

| 건물 | 정체 |
|---|---|
| **Expedition** | **레이드 진입점.** Domain of Agony 초반 랭크 즈음 열린다 |
| **Fortress** | **엔드게임 Nemesis 정밀 제어.** Castle·Watchtower보다 뒤 단계 |
| **Pinnacle** | **Endless Mode 게이트.** Ancient Bastion(팩션 던전) 완료가 조건 |

**여전히 미확인** — **Grand Expedition**. Expedition의 상위/확장으로 보이나 차이(더 어려운 레이드 티어인지, 슬롯이 느는지)를 특정하지 못했다.

⚠ 개발자 답변에 따르면 **Ancient Bastion 완료 시 건물 3개가 동시에 해금**되는데 이름이 확인된 것은 Pinnacle뿐이다. 나머지 둘이 위 26종 안에 있는지도 미확인.

---

## 2. 제작·개조·경제 (6)

### Scrapper — 분해가 모든 것의 재료원

| 항목 | 내용 |
|---|---|
| 건설비 | 골드 50 |
| 역할 | 장비를 넣고 분해 → 재료. **대부분의 아이템은 분해 시 그 레시피를 함께 해금** |
| **r3** | **Auto Scrap Settings 패널** — 아이템 타입별 독립적인 희귀도 문턱 설정, "설정한 희귀도 이하를 전부 자동 분해". **자동 분해는 신규 드롭에만 적용** |
| **r6** | **Artisan's Hall(하위 건물) 해금** |
| 랭크 비용 | 다음 랭크 100골드 + 재료 |

**[확정]** Dev Q&A · Deep Dive #5 · Walkthrough 0.9

> **최우선 건설 대상.** 분해가 이후 모든 건물의 재료원이라 이것 없이는 아무것도 안 돈다.

### Blacksmith — 장비 제작·개조의 중추

| 랭크 | 효과 |
|---|---|
| 건설 | 골드 100 + 재료. 기본 개조 5종(Reroll/Randomise 등) |
| **r2~r5** | 기본 Equipment Modification 레시피 단계적 해금 — **랭크↔레시피 매핑은 미확인** |
| 연동 | Artisan's Hall r5~6이 **Transmute · Imbue · Imprint**를 여기서 쓸 수 있게 한다 |
| 연동 | **Castle r3** → Nemesis Infusion 크래프트 |
| 연동 | **War Camp r4** → Bless Equipment 크래프트(비-Divine 장비 보너스 2배까지) |
| 1.0 | Infuse Equipment 신설 · Imprint Attributes를 우선순위 기반으로 개편 |
| 랭크업 재화 | **Fragment** (0.8에서 비용 대폭 인하) — **획득처 미확인** |

**[확정 — 골격 / 미확인 — r2~r5 매핑]** 0.8 패치노트 · Nemesis Infusion 가이드 · Walkthrough 0.9

> **소켓 규칙** — 소켓 추가는 소켓 조각을 소모하고, 이미 있는 소켓 수에 비례해 비용이 오른다. **아이템 레벨 51+는 소켓이 자연 굴림**된다.

### Artisan's Hall — 고급 개조의 게이트

- **Scrapper r6**으로 열리는 별도 건물
- **r1** = "Bag Settings" (보스 상자 자동 개봉)
- **r5 또는 r6** = Blacksmith에서 **Transmute · Imbue · Imprint** 사용 가능

**[추정 — 랭크 숫자]** 출처가 갈린다. Walkthrough 0.9 원문은 *"Artisan's Hall을 최소 r5, 되도록 r6까지 올려 뒀어야 한다"*로 애매하고, 0.6.0.6 devlog는 *"Artisan's Hall의 새 업그레이드 구매로 해금"*이라고만 하고 랭크를 안 밝힌다. **v2에서도 미해결이던 불일치가 그대로 남았다.**

### Gemcutter's Cabin — 보석 세공

| 랭크 | 효과 |
|---|---|
| **r2** | Blacksmith에서 **소켓 추가 크래프트** 해금 (잠재 소켓 수까지) |
| ~~r3~~ | ~~젬 보관 탭~~ → **2023-11 패치로 Item Vault 건물로 분리·개명.** 기존 r3 보유자는 **Item Vault r1을 자동 부여**받았다 |

**[확정]** 개발자 직접 답변 · 0.9.4 패치노트

> ⚠ **v2 정정.** v2는 "Gemcutter r3 = 젬 보관 탭"으로 적었는데, 그 기능은 이미 별도 건물로 떨어져 나갔다. **Item Vault는 신규 건물이 아니라 Gemcutter's Cabin에서 분화한 것**이다.

### Alchemist's Hut — 플라스크(소모 버프) 제작

- 미션 루프 전체에 지속되는 소모형 버프를 만든다
- **r1** — Dandelion 재료 요구 제거 (0.6.0.6)
- **r7** — Auto Refill (0.9 베타 노트). 총 랭크 ≥7 확인
- **r2~r6 개별 효과 · 총 랭크 수 미확인**

**[확정 — r1·r7 / 미확인 — 나머지]**

### Community Project — 기부로 사는 영구 패시브

| 랭크 | 효과 |
|---|---|
| 건설(r1) | 재료 기부 → **Donation Credits** → **Community Passives**(영구, 리스펙 불가) |
| r2(추정) | **자동 기부** — 저장 용량 초과분을 자동으로 |
| **r4** | 재료별 **자동 기부 임계값 커스터마이징** (개별 설정 + 일괄 적용) |

**Community Passives 목록** — 재료 보관량 1~5 · 기부 크레딧 획득 1~50랭크 · 채집 20초→10초 · Tool Fortune / Tool Luck · Double Scrapping / Double Resources · Luck / Fate / Wealth / Fortune

**[확정]** Walkthrough 0.9 · 1.0 패치노트

> **성격에 주목** — 이 패시브들은 **전부 경제·채집 축이다.** 전투 능력치가 하나도 없다. Lootun에서 "영구 계정 패시브"는 파밍 효율만 다룬다.

⚠ **미해소 충돌** — 0.8 「Faction Update」(2023-05)로 별개 엔드게임 시스템(Faction 4종 + 팩션 던전 + 평판)이 추가됐고, 일부 자료가 "Faction Passives" · "Divine Favour 패시브"를 Community Project의 Donation Credits 패시브와 **혼용**한다. 두 트리가 같은 통화를 공유하는지 확정하지 못했다.

---

## 3. 성장 상한 트랙 (4)

**Lootun은 「상한 돌파」라는 하나의 파워크리프 축을 건물 넷에 나눠 심었다.** 그리고 **파워가 캐릭터가 아니라 아이템을 통과한다** — 건물은 아이템의 천장을 올릴 뿐이다.

### Keep — Paragon (희귀도 밖 수직 성장)

- **Paragon 제작 해금.** 속성 랭크 상한을 **10 → 20**으로 연다
- Paragon 레벨당 상한 +1. **최대 레벨은 원래 10이었고, 1.2 업데이트(Pristine Materials)로 20까지 확장**
- 실제 크래프트는 Blacksmith UI에서 수행

**[확정]** Walkthrough 0.9 · 1.2 패치노트

### Castle — Nemesis 속성의 **하한** 보장

| 랭크 | 효과 |
|---|---|
| r1 | Nemesis 아이템 **최소 속성 개수 2개** 보장 |
| r2 | Nemesis 속성 **최소 랭크 4** 보장 |
| r3 | Blacksmith에서 **Nemesis Infusion** 해금 (일반 → Nemesis 전환) |
| r4+ | **미확인** |

### Watchtower — Nemesis 속성의 **상한** 확장

| 랭크 | 효과 |
|---|---|
| r3 | 최대 속성 개수 **3개**까지 |
| r5 | 속성 최대 랭크 **8**까지 |
| r4 · r6+ | **미확인** |

**[확정 — 위 표 / 미확인 — 상위 랭크]** Nemesis Infusion 가이드

> **하한과 상한을 두 건물이 나눠 갖는다.** Castle은 "최소한 이만큼은 나온다", Watchtower는 "여기까지 나올 수 있다". 같은 아이템 카테고리에 대해 **바닥과 천장을 별개 비용으로 판다.**

### Fortress — 엔드게임 Nemesis 정밀 제어 ★ 신규 규명

- Walkthrough 0.9 원문: *"업그레이드된 Fortress를 이용해 Nemesis 굴림을 거의 완벽에 가깝게 커스터마이징 — 30/20 속성 달성"*
- **Castle · Watchtower보다 늦은 단계**의 Nemesis 제어 건물
- 정확한 해금 조건(War Camp 몇 랭크인지 등) · 랭크별 수치 **미확인**

**[확정 — 역할 / 미확인 — 조건·수치]**

> **상한 돌파 축이 3단이 아니라 4단이었다.** 하한(Castle) → 상한(Watchtower) → **정밀 지정(Fortress)** 으로, [02_items.md §5](02_items.md)의 「통제권을 계단으로 판다」가 건물 층에서도 그대로 반복된다.

---

## 4. 자동화·로스터 (2)

### Barracks — 전투 자동화

- 건설비 골드 **400**. 첫 존 보스 처치 후 해금
- **Character Tactics** — 타겟팅 4모드(Random / Strongest / Weakest / Round Robin), 쿨다운 스킬별 개별 배정
- 상위 랭크 — **쿨다운 스킬 자동 시전** + 공격/방어 타겟팅 우선순위 별도 지정

**[확정]** Deep Dive #5 · Walkthrough 0.9

> ⚠ **어휘 주의** — Lootun에서 **Tactics는 타겟팅 모드**를 뜻한다. 본작의 「파티 전술」(조건 → 효과)과 **같은 단어, 다른 뜻**이다. 본작 GAME_DESIGN §10의 「진형·타겟팅」을 나중에 만들 때 「전술」이라고 부를 수 없는 이유 ([tactic_card_design.md §5-1](../../game_design/tactic_card_design.md)).

### Armoury — 로드아웃

- 캐릭터 **레벨 20** 부근 해금
- **랭크당 Mission Team 로드아웃 +2** (2024-03 베타 이전엔 +1)
- 파티 장비 + 플라스크 세트를 통째로 저장했다 불러온다

**[확정]** 1.0 패치노트 · 가이드

---

## 5. 콘텐츠 게이트 (8)

### Bounty Board — 되돌릴 수 있는 난이도 다이얼의 입구

| 랭크 | 효과 |
|---|---|
| 해금 | 캐릭터 **최대 레벨** 도달 (0.9 기준 150) |
| r1 | Bounty 저장 슬롯 **8개**(과거 6) + **Hunt 2번째 슬롯** |
| r2 | **Auto Claim**(보상 자동 수령) + 저장 슬롯 **+4**(과거 +3) |
| r3 · r4 | 각각 저장 슬롯 **+4** |

**[확정]** 0.9.5 패치노트 · 개발자 답변

**연결된 시스템** — 바운티 클리어 → **Fame** → Fame Passives 구매 → **Infamy 상승** → 바운티 모디파이어 개수·강도와 보상이 함께 오른다. **언제든 Fame Passives를 해제해 Fame을 환급받고 Infamy를 내릴 수 있다** ([00_overview.md §8-2](00_overview.md)).

> **이 게임에서 가장 우아한 장치.** "더 어렵게 = 더 많이"를 플레이어가 스스로 돌리되, **되돌릴 수 있으므로 실수해도 벽에 갇히지 않는다.**

### War Camp — 팩션 미션

| 랭크 | 효과 |
|---|---|
| r1 | **Hunt 3번째 슬롯** |
| r2 · r3 | **미확인** |
| r4 | Donation Credits로 도달. 팩션별 T3 재료 4종 드롭 시작 → **Bless Equipment** 크래프트 해금 |

**상위 게이트** — Domain of Agony의 **미션 마스터리 4**(건물 랭크가 아니다) 도달 시 Factions 콘텐츠로 가는 건물이 열린다.

**[확정 — r1·r4 / 미확인 — r2·r3]**

### Domain of Agony — 모디파이어 적층

- 건설 시 모디파이어 **2종** 접근. 미션셋을 충분히 클리어하면 **2종씩 추가 해금**(반복 패턴)
- 미션에 Map Modifier를 붙일 때마다 **Agony Level +1, 최대 10**. 레벨이 오르면 일반 몹이 Agony 몹으로 치환될 확률이 오르고 후반엔 Agony 보스
- ~~r4 = Agony 미션 슬롯 +4~~ → **2025-10 패치로 「흑요석(Obsidian) 재료 +50%」로 교체**(슬롯 보너스 폐지)
- r1~r3 개별 효과 **미확인**

**[확정 — 구조·r4 교체 / 미확인 — r1~r3]** 2025-10-12 패치노트

> ⚠ **v2 정정.** v2는 r4를 "너프 후 흑요석 +50%"로 적어 원래 슬롯을 팔았다고 추정했는데, 패치노트 확인 결과 **너프가 아니라 교체**다.

### Map Room — 구 맵 재파밍

- 완료한 맵을 **현재 캐릭터 레벨로 재조정**해 다시 파밍한다(Divine 아이템 등). Map Expertise 소프트캡 우회
- 해금 조건 레벨 100 부근으로 **추정** — Walkthrough 0.9의 서술 순서상 Bounty Board보다 앞이라 정합적이지만 정확한 숫자는 못 찾음

**[추정]**

### Ancient Reliquary — 희귀 이벤트 확률 + 유니크 강화

| 랭크 | 효과 |
|---|---|
| r1 | **Treasure Dummy**(보물 몬스터) 스폰 확률 **0.5%** + 미션 전문성 패시브 2종(1점: 비활성화 옵션 / 5점: 랭크당 +0.1%) |
| r2 · r3 | **미확인** (r3는 "재료 요구"만 확인, 효과 불명) |

**별도 기능** — "Reliquary" 버튼 = **유니크 강화 메뉴**. 강화 경험치 → 강화 포인트(아이템당 최대 4). 상위 티어 Heroic Upgrade는 연계 레이드 Heroic 클리어를 요구한다.

**[확정 — r1 / 미확인 — r2·r3]**

### Expedition — 레이드 진입점 ★ 신규 규명

- Domain of Agony 초반 랭크 즈음 해금
- Walkthrough 0.9 원문: *"Expedition 건물을 보고 시도해 봤다면 레이드가 어렵다는 걸 알았을 것"*
- 레이드는 **6인** 파티. Normal / Heroic / Mythic 난이도
- 랭크별 효과 **미확인**

**[확정 — 역할 / 미확인 — 랭크]**

### Grand Expedition — 여전히 미확인

- 도전과제("Fully upgrade the Grand Expedition") 외 어떤 설명도 못 찾음
- Expedition의 상위/확장으로 **추정**되나 차이를 특정하지 못함
- ⚠ 검색이 반복해서 **Path of Exile 2의 동명 콘텐츠**로 샌다

**[미확인]**

### Pinnacle — Endless Mode 게이트 ★ 신규 규명

- 개발자 직접 답변: *"Ancient Bastion(팩션 던전)을 완료하면 새 Pinnacle 건물을 지을 수 있고, 이것이 Endless Mode를 해금한다"*
- 완료 후 세이브/리로드가 필요(UI 버그성 이슈)
- ⚠ **Ancient Bastion 완료 시 건물 3개가 동시 해금**되는데, 이름이 확인된 것은 Pinnacle뿐이다

**[확정]** Steam 토론 개발자 답변

---

## 6. 저장 (2)

### Item Vault — 저장에서 「확정 획득 경로」로

| 랭크 | 효과 |
|---|---|
| r1 | **젬 저장** — 2023-11에 Gemcutter's Cabin r3에서 분리·개명. 기존 보유자 자동 승계 |
| r2 | Ascendancy Relic 저장·필터링 — **랭크 번호는 r1과 r3 사이로 추정**, 명시 문구 미확보 |
| r3 | **Divine Storage** 탭 |
| **r4** | **Item Research [1.3]** — 드롭 전용 아이템을 줍거나 자동 분해 → **리서치 포인트 누적** → 충분히 모이면 그 아이템의 **사본 생성** 능력 해금 → 희귀 재료로 생성 |

**[확정 — r1·r3·r4 / 추정 — r2]** 0.9.4 · 0.9.5 · 1.3 패치노트

> **파밍 게임이 4년 차에 도달한 결론** — 순수 확률 체이스만으로는 안 되고, **"헛걸음이 축적되어 결국 확정으로 바뀌는 경로"**(천장/피티)가 필요하다. 저장고였던 건물이 그 경로의 주인이 됐다.

### Hidden Vault — 완전 미확인

- 도전과제("Fully upgrade the Hidden Vault") 외 **어떤 기능 설명도 발견하지 못했다**
- v2에 "r2가 Overload Core 드롭 게이트라는 언급"이 있었으나 이번 조사에서 재확인 실패
- 이름상 Item Vault와 대비되는 "숨김" 저장고로 추정되나 근거 없음

**[미확인]** 시도한 검색어 — `"Hidden Vault" what does it store` · `"Hidden Vault" rank craft OR store OR unique` · `"Hidden Vault" character slot storage`

---

## 7. 채집 (4)

```
Profession Hall (1000골드)  →  Mine(광물) / Forest(약초) / Farm(농작)   각 2000골드
```

- 랭크업 = **일꾼 슬롯 추가 + 상위 재료 티어 해금**
- 기본 **20초에 1회** 수확 → Community Passives로 **10초**까지 단축
- **플라스크 재료는 이 채집 루트로만 공급된다** — 전투와 무관한 축이 전투 버프의 유일 공급원

**[확정]** Deep Dive #5 · Walkthrough 0.9

---

## 8. 해금 의존 그래프

```
Scrapper(50g) ──── 분해 재료 ────▶ (사실상 모든 후속 건물의 재료원)
   └─ r6 ─▶ Artisan's Hall ─ r5~6 ─▶ (Blacksmith 에 Transmute·Imbue·Imprint)

Blacksmith(100g)
   └─▶ Profession Hall(1000g)
         ├─▶ Mine / Forest / Farm (각 2000g)
         └─▶ Community Project ─▶ Gemcutter's Cabin
                                      └─ r3(구) ──개명 2023-11──▶ Item Vault(r1 자동승계)
                                                                    └─ r2 Relic ─ r3 Divine ─ r4 Item Research

Alchemist's Hut ─── (Blacksmith 계열과 별도, 조기 해금)

첫 존 보스 처치 ─▶ Barracks(400g) ─▶ Armoury(~lv20)

캐릭터 최대 레벨 ─▶ Bounty Board ─(Favour)─▶ Domain of Agony
                                                ├─▶ Expedition ─?─▶ Grand Expedition
                                                └─ 미션 마스터리 4 ─▶ War Camp 계열
                                                                        └─▶ Fortress (엔드게임 Nemesis)
Bounty 진행 ─▶ Keep · Castle · Watchtower
                  Castle r3 · Watchtower r3/r5 ─▶ Blacksmith 의 Nemesis 크래프트

War Camp 진행 ─▶ Ancient Bastion(팩션 던전) 완료
                    └─▶ 건물 3종 동시 해금 (Pinnacle 확인, 나머지 2종 미상)
                          Pinnacle ─▶ Endless Mode

Map Room · Ancient Reliquary · Hidden Vault ─── 정확한 게이트 불명
```

⚠ **이 그래프는 2022 Deep Dive ~ 2026-03 베타에 걸친 파편적 출처를 짜맞춘 것이다.** 특히 Keep·Castle·Watchtower와 Domain of Agony·War Camp 사이의 선후는 **가이드의 서술 순서에 의존한 추정**이지 확정이 아니다.

---

## 9. 게이트와 랭크 보상의 분포

### 9-1. 게이트의 종류

| 종류 | 사례 | 비중 |
|---|---|---|
| **다른 건물 랭크** | Scrapper r6→Artisan's Hall · Blacksmith→Profession Hall→채집 3종 | **초반 6~8개 건물이 거의 전부 이 연쇄** |
| **콘텐츠 클리어** | Domain of Agony 마스터리 4→War Camp 계열 · Ancient Bastion→Pinnacle | **중후반의 주류** |
| **캐릭터 레벨** | Bounty Board(최대 레벨) · Armoury(~20) · Map Room(~100 추정) | 소수 — 엔드게임 진입점 1~2개에 집중 |
| **재화 축적** | Domain of Agony(Favour) · War Camp r4(Donation Credits) | 랭크업 자체는 대부분 재료 + 골드/전용 재화 |

> **초반은 건물이 건물을 열고, 후반은 콘텐츠가 건물을 연다.** 레벨 게이트는 생각보다 적다.

### 9-2. 랭크업이 주는 것

| 성격 | 사례 |
|---|---|
| **기능 해금** | Gemcutter r2(소켓) · Castle r3(Infusion) · War Camp r4(Bless) · Item Vault r3·r4 · Artisan's Hall r5~6 · Pinnacle(Endless) |
| **슬롯 확장** | Armoury(로드아웃 +2/랭크) · Bounty Board(저장 +4/랭크) · Hunt 슬롯 · 채집 일꾼 슬롯 |
| **수치 증가** | Castle r1·r2(하한) · Watchtower r3·r5(상한) · Ancient Reliquary r1(확률) · Domain of Agony r4(재료 %) |
| **자동화** | Scrapper(자동 분해) · Barracks(자동 시전) · Community Project r4(자동 기부) · Bounty Board r2(자동 수령) |

> **낮은 랭크 = 슬롯·수치 / 특정 임계 랭크 = 기능 해금.**
> Lootun은 매 랭크를 균등하게 설계하지 않는다. **소수의 「게이트 랭크」**(Castle r3 · Watchtower r5 · Item Vault r4 · Scrapper r6)에 핵심 기능을 몰아넣고, 나머지는 완만한 슬롯·수치 랭크로 채운다.

---

## 10. 재화·비용

| 통화 | 획득처 | 소모처 |
|---|---|---|
| **골드** | 전투·판매 | 건설비 (50 / 100 / 400 / 1000 / 2000 …) |
| **Fragment** | **미확인** | Blacksmith 랭크업 (0.8에서 비용 대폭 인하) |
| **Favour** | 바운티 클리어 | 바운티 리롤·포기 · 일부 건물 업그레이드 |
| **Donation Credits** | Community Project 재료 기부 | Community Passives · War Camp r4 도달 |
| 코어 / 파편 / 룬 / 글리프 | 하위 등급 아이템 분해("shatter") | Ancient Reliquary 랭크업 |
| **Obsidian** | Agony 미션 | Domain of Agony 관련(추정) |

⚠ **확보된 건설비는 초반 몇 개뿐**이다(50 · 100 · 400 · 1000 · 2000골드). 중후반 건물은 "T4/T5/T6 재료" 같은 티어명만 확인되고 구체 수량이 없다.

⚠ **Fragment의 획득처를 끝내 못 찾았다.** 사용처만 확정이고 드롭·생산 경로가 공개돼 있지 않다.

---

## 11. 본작 시사점 — 안 가기로 한 길

**본작은 이 축을 이미 닫았다.**

> **파견처에 건설·업그레이드 없음** — 손잡이는 둘. 가짓수 = 챕터 해금 / 세기 = 배치된 영웅. 레벨을 두면 같은 결과를 미는 축이 둘이 되어 배치 결정이 흐려진다
> — [GAME_DESIGN.md §9](../../game_design/GAME_DESIGN.md) 08-26 확정

그래서 이 문서는 설계도가 아니라 **대조표**다. 그럼에도 옮길 값이 있는 것과 없는 것이 갈린다.

### 11-1. 옮길 값이 있는 것

| # | 원리 | 본작에서 이미 쓰이거나, 쓸 자리 |
|---|---|---|
| 1 | **소수의 「게이트 랭크」에 기능을 몰고 나머지는 완만하게** (§9-2) | 성장 곡선 설계 일반. 「성장할 때마다 기능이 하나씩 열린다」(GAME_DESIGN §1)와 같은 사고 |
| 2 | **하한과 상한을 별개 비용으로 판다** (Castle ↔ Watchtower) | 아이템 개조 계단 — [item_design.md](../../game_design/item_design.md) 낙인 크래프트의 참고 |
| 3 | **체이스에 확정 경로를 붙인다** (Item Vault r4) | 유니크 수집의 천장. GAME_DESIGN §10 「긴 체이스」 |
| 4 | **되돌릴 수 있는 난이도 다이얼** (Bounty → Fame ↔ Infamy) | **접속 층을 두껍게 하는 후보** — GAME_DESIGN §10 「접속 층(§3-1 ①)의 두께」 |
| 5 | **자동화·정보 해금이 곧 진행 보상** | 본작은 처음부터 자동전투라 이 카드를 안 쥐고 시작한다 — 쓸 수 있는 자리가 남았는지 검토 대상 |

### 11-2. 옮기면 안 되는 것

| # | 이유 |
|---|---|
| **건물에 랭크를 다는 것 자체** | 08-26 확정을 정면으로 뒤집는다. 「가짓수 = 챕터 / 세기 = 배치된 영웅」 두 손잡이가 셋이 된다 |
| **건물이 건물을 여는 연쇄** | 초반 6~8개가 이 구조인데, 본작은 **해금 게이트를 챕터 클리어로 확정**했다(GAME_DESIGN §1). 게이트 주인이 둘이 된다 |
| **26종이라는 가짓수** | 본작 파견처는 다섯이고 「짓거나 올리는 개념이 없다」. 가짓수를 늘리는 압력의 근거로 이 문서를 인용하지 말 것 |

### 11-3. 가장 큰 대조 — 파워가 어디를 통과하나

**Lootun의 건물 26종 중 로스터 전원의 전투 능력치를 올리는 것은 하나도 없다.**

- Keep·Castle·Watchtower·Fortress는 **아이템의 천장**을 올린다 — 캐릭터가 세지는 게 아니라 아이템이 더 세질 수 있게 된다
- Community Passives는 **경제·채집만** 다룬다
- 나머지는 기능 해금·슬롯·자동화

> **Lootun의 파워는 전부 아이템을 통과한다. 건물은 아이템의 천장을 올릴 뿐이다.**

본작 [battle_design.md §9-4](../../game_design/battle_design.md)의 **「레벨 = 진입 자격 / 장비 = 세기」**와 같은 철학이다. 본작이 계정 단위로 **능력치를 직접 주는 시스템**(연구)을 두기로 했다면, **그건 Lootun에 선례가 없는 축**이라는 뜻이고 밸런스를 참고작에 기댈 수 없다.

---

## 12. 정정 이력 (v2 → v3)

| # | v2 서술 (`00_overview.md §7`, 2026-08-26) | v3 정정 (2026-08-31) | 근거 |
|---|---|---|---|
| 1 | 「정체 미상 4종 — 기능을 설명하는 출처를 전혀 찾지 못했다」 | **3종 규명** — Expedition(레이드 진입점) · Fortress(엔드게임 Nemesis 정밀 제어) · Pinnacle(Endless Mode 게이트). Grand Expedition만 미확인 | Walkthrough 0.9 · 개발자 답변 |
| 2 | 분류 「성장 상한 트랙 3 / 콘텐츠 게이트 5」 | **성장 상한 4 / 콘텐츠 게이트 8** — Fortress·Expedition·Grand Expedition·Pinnacle 편입 | §1 |
| 3 | 「Gemcutter's Cabin r3 = 젬 보관 탭」 | **2023-11에 Item Vault 건물로 분리·개명.** Item Vault는 신규 건물이 아니라 Gemcutter's Cabin의 분화다 | 개발자 답변 · 0.9.4 |
| 4 | 「Domain of Agony r4 = 흑요석 +50%(너프 후) — 원래는 미션 슬롯을 팔았다는 뜻」 | **너프가 아니라 교체.** 2025-10 패치가 슬롯 보너스를 폐지하고 재료 %로 갈아 끼웠다 | 2025-10-12 패치노트 |
| 5 | 「Bounty Board r1 = Hunt 2번째 슬롯」(그것만) | r1은 **저장 슬롯 8 + Hunt 2번째**, r2 = **Auto Claim + 저장 +4**, r3·r4 = 각 **+4** | 0.9.5 패치노트 |
| 6 | 「Keep — P1~P10이 속성 랭크 상한을 10→20으로」 | Paragon **레벨** 최대치가 원래 10이었고 **1.2(Pristine Materials)로 20까지 확장**됐다. 속성 상한 10→20과 레벨 상한을 구분할 것 | 1.2 패치노트 |
| 7 | 「Hidden Vault — r2가 Overload Core 드롭 게이트라는 언급 있음」 | **재확인 실패.** 이번 조사에서 기능 설명을 전혀 못 찾음 — 미확인으로 하향 | — |

---

## 13. 출처 · 미확인(N/F) 총괄

### 13-1. 이번 조사에서 새로 확보한 것

- 정체 미상 4종 중 **3종의 역할**
- Bounty Board **r1~r4 전체**
- Item Vault **r1~r4 전체**와 Gemcutter's Cabin에서의 분화 경위
- Community Project **r4 자동 기부 임계값**
- Domain of Agony **r4 교체 이력**(2025-10)
- Keep의 Paragon 레벨 상한 확장 이력(1.2)
- War Camp **r4 = Bless Equipment** 연동
- 건설비 5건 (50 · 100 · 400 · 1000 · 2000골드)

### 13-2. 끝내 못 찾은 것

| 항목 | 시도한 검색어 |
|---|---|
| **Grand Expedition 의 정체** | `"Grand Expedition" building` · `Expedition vs Grand Expedition raid difficulty` — PoE2 콘텐츠만 반복 검출 |
| **Hidden Vault 의 기능 전체** | `"Hidden Vault" what does it store` · `rank craft OR store OR unique` · `character slot storage` |
| **Fragment 재화의 획득처** | `Fragment currency Blacksmith` · `Fragment obtain how to get currency source drop` · `glossary Fragment material where obtained` |
| Ancient Bastion 완료 시 열리는 **나머지 건물 2종의 이름** | — |
| **Fortress 의 해금 조건**(War Camp 몇 랭크?) | `"Fortress" unlock "War Camp" OR "Domain of Agony" requirement` |
| Blacksmith **r2~r5 레시피 매핑** | — |
| Castle **r4+** · Watchtower **r4·r6+** | — |
| Domain of Agony **r1~r3** · Ancient Reliquary **r2~r3** | — |
| Alchemist's Hut **총 랭크 수와 r2~r6** | `"Alchemist's Hut" rank 2 rank 3 flask` |
| Item Vault **r2가 정확히 Relic 저장인지** | — |
| **건설비·랭크업 비용의 체계적 전체 목록** | 초반 5건만 확보. 중후반은 "T4/T5/T6 재료" 티어명만 |
| **Deep Dive #3~#10 원문 전체** | Steam이 자동화 요청을 403/게이팅. 검색 스니펫으로만 부분 재구성 |
| 도전과제 「Upgrade Perfection: 15개 건물 풀업」의 **대상 15종** | — |

⚠ 위 목록은 **탐색 실패가 아니라 공개 정보의 부재**로 판단한다. Lootun에는 위키가 없고, 랭크별 수치는 대부분 클라이언트 툴팁 안에만 있다.

---

*마지막 업데이트: 2026-08-31 (**신설 — `00_overview.md §7` v2 흡수 + 웹 재조사로 공백 보강**. 구 「정체 미상」 4종 중 **3종 규명**(Expedition·Fortress·Pinnacle) · 분류 재편(성장 상한 3→4 · 콘텐츠 게이트 5→8) · **v2 정정 7건**(§12) · 해금 의존 그래프 · 게이트/랭크 보상 분포 · §11 본작 대조 — **건설 축은 08-26 확정으로 닫혀 있으므로 이 문서는 설계도가 아니라 대조표다**)*
