# Lootun — 시스템 전수 조사 (개요)

> 상태: **총조사 완료** (2026-08-24) · v1(1차 조사) 전면 재작성 · **§7 거점 건물 심층조사 v2**(2026-08-26, 26종 전수 확인) · **폴더 3분리 + 스킬·아이템 심화**(2026-08-28)
> 목적: 본작의 **게임 형태 참고작**(CLAUDE.md)이 스킬·아이템·경제·콘텐츠를 실제로 어떻게 짰는지 확보
> 짝 문서: [01_skills.md](01_skills.md)(스킬 전수 심화) · [02_items.md](02_items.md)(아이템 구조·옵션 전수 심화). **이 문서는 게임 구조 한 장 + 스킬·아이템을 뺀 나머지 시스템(캐릭터 성장·전투 수치·경제·거점·콘텐츠·설계원리·본작 대조) 전부를 담는다.**
> ⚠ **이 문서(및 짝 문서)의 수치는 전부 Lootun의 수치다.** 본작 SSOT가 아니며 `src/data/*.csv`로 옮기지 말 것

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 |
| 1 | 게임 구조 한 장 |
| 2 | 캐릭터 성장 축 |
| 3 | 스킬 구조 (요약 — 상세는 [01_skills.md](01_skills.md)) |
| 4 | 아이템 구조 (요약 — 상세는 [02_items.md](02_items.md)) |
| 5 | 전투 수치 모델 |
| 6 | 분해·재화 경제 (되먹임 고리) |
| 7 | 거점 건물 |
| 8 | 콘텐츠 루프 |
| 9 | Lootun이 반복하는 설계 원리 8가지 |
| 10 | 본작 대조표 + 검토 후보 |
| 11 | 출처 · 미확인 · 정정 이력 |

---

## 0. 조사 방법과 신뢰도

Lootun에는 **공식 위키가 없다.** 대신 개발사(ArrowSoft)가 스팀에 연재한 **공식 Deep Dive 시리즈**가 있고, 이것이 가장 신뢰도 높은 1차 자료다.

| 표기 | 소스 | 신뢰도 |
|---|---|---|
| **[공식]** | 개발사 Deep Dive #1~#8(2022) · 패치노트 | ★★★ 원문 |
| **[상점]** | Steam 상점 설명(1.3 기준, 2026) | ★★★ 최신 카탈로그 |
| **[가이드]** | Steam 유저 가이드(Walkthrough 0.9/1.1, Tanks, Thorns, 엔드게임 팀 등) | ★★ 구조 설명 상세, 버전 지연 |
| **[빌드가이드]** | gameplay.tips 캐릭터별 빌드 가이드 — [01_skills.md](01_skills.md#5-역할군별-실측-빌드-8종--탱딜서포트)·[02_items.md](02_items.md)에서 심화 사용 | ★★☆ 실전 조합·실측 수치 밀도 최고 |
| **[커뮤니티]** | 스팀 토론 · 개발자 Q&A 스레드 | ★★ 개발자 직답 포함 |
| **[itch]** | itch.io 페이지 | ★ **구버전 스냅샷** |

### 확보한 공식 Deep Dive
`#1 스킬/클래스/어센던시` · `#2 장비` · `#3 분해와 제작` · `#5 건물과 직업` · `#7 용어집과 도전과제` · `#8 바운티`
→ **#4 · #6은 원문 확보 실패**(스팀 뉴스 페이지가 JS 렌더라 크롤 불가). 다만 그 주제로 추정되는 미션·플라스크/인챈트 내용은 유저 가이드로 대체 확보했다.

### 걸러낸 오염 (검색 상위에 뜨지만 다른 게임)
1. **"희귀도 7단계 + Set 아이템(초록)"** → **Loot of Baal**의 것
2. **"유물 3~5슬롯, 16 어피니티, 52 키워드"** → **Mind Over Magic**의 것
3. **"쿼터스태프/모닝스타/도끼는 나무 벌목용"** → 다른 게임
4. **"Early Game Paladin Guide 1-35"** → **Erenshor**의 동명 가이드
→ 넷 다 본문에 반영하지 않았다.

---

## 1. 게임 구조 한 장

```
                  ┌──────────── 플레이어가 만지는 것 ────────────┐
   로스터          편성          전술          스킬 배분        아이템 개조
  (최대 18슬롯) → (3인 파티) → (타겟팅/쿨) → (트리 포인트) → (작업대 10종)
                                                                   ▲
   미션 루프 자동 실행 → 드롭 ─────── 분해 ─── 조각/코어 ──────────┘
        │                                        (리롤 비용으로 재투입)
        └→ Fame/Favour/재료/도감 → 거점 건물 → 더 강한 개조 도구 해금
```

- **전투 조작 없음.** 미션은 라운드를 자동으로 돌고, 플레이어는 사이에 개입하지 않는다
- 손잡이 5개 중 **아이템 개조가 압도적으로 두껍다** — [02_items.md §5](02_items.md#5-개조-도구-10종--이-게임의-본체-공식-3--가이드)의 도구 10종이 이 게임의 본체
- 본작의 "장비가 주인공(A안)"과 같은 판단. 단 **Lootun은 그 두께를 드롭 다양성이 아니라 "굴린 것을 확정으로 바꾸는 도구의 가짓수"로 만들었다**

---

## 2. 캐릭터 성장 축

| 축 | 내용 |
|---|---|
| **레벨** | 최대 **150**. 100까지는 일반 성장 |
| **어센던시** | 레벨 100 도달 시 선택. 이후 101~150 |
| **레벨 게이트** | **101 이상은 레벨마다 "어센던시 챌린지"를 깨야 오른다** — 예: 100레벨 스케일 Demons Lair 클리어 → 101 → 101 스케일 Woodlands 클리어 → 102 … [커뮤니티] |
| **만렙 이후** | XP가 계속 들어오고 **Soul Orb** 재화로 전환. 레벨업 횟수 요구 미션도 계속 소화 |
| **로스터** | **[상점 1.3] 캐릭터 슬롯 18개**(1.3에서 +3). 구버전 인게임 FAQ는 10 — **충돌** |
| **파티** | 미션 3인 / **레이드 6인** / Solo Idol 1인 |

> **가장 배울 지점 — 레벨업이 콘텐츠 클리어로 게이트된다.** 방치형에서 "시간만 부으면 오른다"를 100레벨에서 끊고, 그 뒤로는 **매 레벨이 하나의 도전**이 된다. XP 곡선을 늘리는 대신 **관문을 세운** 처리(110레벨대부터 레벨당 수 시간).

---

## 3. 스킬 구조 (요약)

> **상세 전수 조사는 [01_skills.md](01_skills.md)로 이관됐다** — 56개 액티브 스킬 47개 확보 표, 스킬당 8패시브 트리 실제 사례, 역할군별 실측 빌드 8종(탱/딜/서포트), 전술(Tactics) 자동배정. 여기서는 구조만 요약한다.

```
기본 클래스 4                       어센던시 (레벨 100)
├─ Warrior   근접·원거리(마법 X)  → Warden(탱) / Juggernaut(하이브리드) / Barbarian(DoT)
├─ Ranger    근접·원거리(마법 X)  → Renegade(탱) / Assassin / Marksman
├─ Mage      마법·근접(원거리 X)  → Battlemage(탱) / Archmage(단일) / Vizier(광역)
└─ Paladin   [1.0 신규]           → Crusader / Inquisitor / Templar
```

- **어센던시 4×3=12 확정**. 자유 교체 가능(레벨 100 리셋 대가). **클래스=무기 타입 접근권**, **어센던시가 역할(탱/딜)을 정한다**
- **스킬 두 종류** — Default Attack(기본공격) 28 + Cooldown Skill(쿨다운) 28. Lootun의 "기본 공격"은 무기가 아니라 **빌드의 주력 스킬 슬롯**이다(본작은 반대로 무기군이 기본 공격을 결정)
- **스킬 하나가 자기 트리(8패시브)를 갖는다** [상점] — 수치/동작(타입 변환·처형·DoT 부여)/극단(다속성 동시 이득) 3축으로 변형. 캐릭터 패시브(클래스 25·어센던시 100pt·Mission/Fame/Community)는 별도 층
- **전술(Tactics)**: `Barracks` 건설로 타겟팅 4모드 + 자동 스킬 시전 해금 — **자동화가 진행 보상**

→ 본작 skill_design.md의 트리당 노드 수·변형 노드·전직 위상 논의에 직접 참고. 전체 근거는 [01_skills.md](01_skills.md).

---

## 4. 아이템 구조 (요약)

> **상세 전수 조사는 [02_items.md](02_items.md)로 이관됐다** — 슬롯·무기·희귀도·속성·개조 도구 10종·Nemesis 확률 실측·젬 세트·유물·인챈트(Thorns 9경로)·Divine 실례까지 diablo2/02_items.md 수준으로 심화됐다. 여기서는 구조만 요약한다.

- **슬롯 최대 16** + 유물 1(레벨 스케일). 무기 3계열(Melee/Ranged/Magic) × 세부 베이스, **양손=베이스 2배**
- **희귀도 5단계 = 속성 칸 수(2~6)** — 순수 양적 계단. 통제권은 희귀도가 아니라 **개조 도구 10종**(Blacksmith/Artisan's Hall/Keep/Castle/Gemcutter 등에 분산)이 쥔다
- **속성 3분류**(Offensive/Defensive/Utility) × **랭크[x/10]** — "붙었는가/얼마나"의 2단 목표. Paragon으로 상한 20까지 돌파
- **희귀도와 직교하는 태그**: Special(Unique) · Divine · Nemesis · Enchanted · Paragon · Pristine — 아이템 하나가 여러 태그를 동시에 가질 수 있다
- **젬은 캐릭터 단위 공유 슬롯**(24칸, 장비 소켓 수가 개방 칸 수를 결정) — 세트 보너스는 **장비가 아니라 젬에** 걸려 있다
- **인챈트**로 캡 해제(Blessed)·규칙 예외(Censure)를 판매. **Thorns**는 일반 피해 태그를 전혀 안 받는 별도 축

→ 본작 item_design.md의 희귀도 계단·리롤 비용·유니크 가드레일 논의에 직접 참고. 전체 근거는 [02_items.md](02_items.md).

---

## 5. 전투 수치 모델

### 5-1. 피해 두 종류 [커뮤니티 · 개발자 직답]

| 종류 | 정의 |
|---|---|
| **Skill Damage** | 발동시킨 **스킬에 비례**하고 **그 스킬의 피해 타입을 상속**한다.<br>예: Barbarian의 `30% Skill Damage` 출혈을 **120% Weapon Damage 스킬**로 발동 → 출혈 1회당 **36% Weapon Damage** |
| **Normalized Weapon Damage** | 스킬과 **무관**. `무기 DPS × 공격속도 × 치명 확률·피해 × Double/Triple Damage` |

- 스킬은 **"n% Weapon Damage"**로 표기된다. **상태이상은 자기를 발동시킨 스킬의 피해 타입을 상속**한다 — 태그가 전파되는 구조

### 5-2. 피해 태그와 **덧셈/곱셈의 비대칭** — 가장 중요한 발견 (요약)

**피해 증가 = 전부 덧셈** [커뮤니티]:
> `+200% 근접` + `+500% 피해` + `+300% 물리` + `+200% 화염` → 근접·물리 태그 스킬에 **1000% 배율** (화염 200은 태그 불일치라 제외)

**피해 감소 = 전부 곱셈** [커뮤니티]:
> 방어도 30% DR, 근접 50% DR, 물리 65% DR → `0.7 × 0.5 × 0.35 = 0.1225` → **10,000 피해 → 1,225**

```
공격측:  Σ(태그 일치하는 모든 +% 피해)          ← 선형, 예측 가능, 스택 유도
방어측:  Π(1 - 각 감소율)                        ← 곱셈, 수확 체감, 캡 없이도 안 터짐
```

> **이 비대칭이 Lootun 밸런싱의 뼈대다.** 딜은 태그를 겹칠수록 선형으로 커지므로 **"내 스킬 태그가 무엇인가"가 아이템 선택의 전부**가 되고, 방어는 곱셈이라 **한 축을 몰빵해도 터지지 않는다**(탱 실측: 방어도 68~77% · 원소저항 87~89% · 회피 50~74% · 블록 98~100%를 **동시에** 쌓는다).
> 본작 battle_design.md의 피해 공식은 **미확정**이다. **이 비대칭은 그대로 검토할 가치가 있다.** ([02_items.md §2-1](02_items.md#2-1-실전-무기-선택-우선순위-빌드가이드)의 실전 우선순위 서술과 대조할 것 — "곱연산 우선"이라는 플레이어 체감과 이 순수 덧셈 공식이 겉으로 모순돼 보이는 지점이 있다)

### 5-3. 피해 타입 = 2층 태그

```
적용(application):  Melee / Ranged / Magic
원소(element):      Physical / Fire / Cold / Lightning / Arcane / (Elemental = 4원소 총칭)
기타:               DoT / Thorns
```
- 스킬 하나가 **여러 태그를 동시에** 갖는다. 방어도 관통 = 타입 무관 / 원소 관통 = 원소 저항만
- **[1.3]** 원소별 관통 패시브 4개를 **원소 관통 1개로 통합**

### 5-4. Thorns — 규칙 밖의 피해축

- **물리도 원소도 근접도 원거리도 마법도 아니다.** 일반 피해 속성의 이득을 **일절 안 받는다** [가이드]
- 스케일 경로 9개(전용 롤·패시브·아이템·Recoil·Reprisal·적방어감소·Reinforcement·적디버프·플라스크) — **전수 확인은 [02_items.md §9-1](02_items.md#9-1-thorns-아키타입--심화-확인-빌드가이드-thorns-dps-가이드)**
- **전환 상한 1200%**. 엔드게임(Heroic Risen Emperor 이후)부터만 치명 확률·피해가 Thorns에 붙는다

> **아키타입을 만드는 법**: 새 스킬이나 새 클래스가 아니라 **"기존 수치 체계를 전혀 안 쓰는 피해축"** 하나를 넣고, 그 축 전용 스케일 경로 9개를 붙였다. 본작에 대입하면 — *나태 죄종의 "저속·한방·반격"이 정확히 이 자리*다(skill_design.md §2). **반격을 별도 피해축으로 세우면 아키타입 하나가 통째로 생긴다.**

### 5-5. 확인 못 한 것
전투가 실시간인지 라운드 턴제인지, 행동 주기·선공 규칙, 어그로/위협 수치의 존재 여부는 **1차 자료로 확정하지 못했다.** 확실한 것은 (a) 공격속도가 DPS를 직접 민다 (b) 쿨은 초 단위 (c) 타겟팅은 4모드 중 선택 (d) 탱 역할이 존재하고 레이드는 전담 탱커를 요구한다 — 즉 **위협 관리 개념은 있다.**

---

## 6. 분해·재화 경제 (되먹임 고리)

### 6-1. 분해가 내놓는 것 [공식 #3]

| 산출물 | 쓰임 |
|---|---|
| **직업 재료** | 아이템 타입별 범용 재료. 제작에 사용(직업 시스템에서도 나옴) |
| **Rarity Core** | 분해 1회당 최소 1개, 그 아이템의 희귀도 코어 |
| **Attribute Shard** — Offensive/Defensive/Utility 3종 | **속성 업그레이드·리롤 비용.** 속성이 있는 아이템에서만 나옴 |
| **Socket Shard** | 소켓 추가 |
| **인챈트 시약** — powder/crystal | 인챈트 부여. 고레벨 보스 드롭을 분해해야 나옴 |

**리롤 1회 비용 = 희귀도 코어 + (그 아이템이 가진 속성 타입에 해당하는) 조각들** [커뮤니티]

```
   원하는 속성 타입          →  그 타입 아이템을 갈아야 한다
   Offensive 조각 필요       →  공격 속성 붙은 장비 분해
   Defensive 조각 필요       →  방어 속성 붙은 장비 분해
```

> **`속성 타입 3종 = 재화 3종 = 리롤 비용`.** 드롭이 곧 재화이고, 재화가 곧 다음 굴림이다.
> **본작에는 이 고리가 통째로 없다.** 본작의 강화 비용은 골드 단일이고, 드롭은 "쓰거나 버리거나"뿐이다 — item_design.md §1 드롭 파이프라인의 **가장 큰 빈 구멍**.

### 6-2. 재화 목록

| 재화 | 출처 | 쓰임 |
|---|---|---|
| **Gold** | 미션 | 건물 건설 |
| **Donation Credits** | Community Project에 재료 기부 | 영구 패시브 구매 |
| **Favour** | 바운티 | 일부 건물 업그레이드 · 바운티 선택지 리롤/포기 |
| **Fame** | 바운티 전용 | Fame Passives(§8-2) |
| **Soul Orb** | 만렙 이후의 XP | (만렙 XP를 재화로 전환) |
| **재료 T1~T6** | 몹·분해·직업 | T1 Lv1–14 / T2 15–49 / T3 50–99 / T4 100–124 / T5 125–149 / T6 150+ |
| **Pristine 재료** | Mythic 콘텐츠 | 상한 20 돌파 |

### 6-3. 직업(Profession) [공식 #5]

```
Profession Hall → Mine(광물) / Forest(약초) / Farm(농작)
```
- 건물 업그레이드 = 작업자 슬롯 추가 + 상위 티어 재료 해금. **기본 20초에 1회 수확** → Community 패시브로 **10초까지** 단축. 채집 티어를 플레이어가 지정
- **플라스크 재료는 직업으로만 나온다** — 전투와 무관한 축이 전투 버프의 유일한 공급원

---

## 7. 거점 건물 — 전수 조사 v2 (2026-08-26)

> v1(2026-08-24)은 26종 중 약 12종만, 그마저 하이라이트 랭크 위주로 다뤘다. 이번 조사로 **건물 전수(26종) 확인** + **랭크별 효과 재검증** + **§4-5 서술 오류 1건 정정**(Artisan's Hall 해금 체인)을 완료했다.
> ⚠ Lootun에는 위키가 없다. 대부분 건물의 **정확한 총 랭크 수·랭크별 골드/재료 비용은 게임 클라이언트 툴팁 안에만 있고 외부에 거의 새어나오지 않는다** — 아래 "N/F"(미확인)는 3개 조사가 각각 수십 건씩 검색·페이지 열람을 시도하고도 못 찾은 것으로, **탐색 실패가 아니라 외부에 인덱싱된 정보 자체가 없다**고 판단한다.

### 7-1. 건물 전수 목록 — 26종 [커뮤니티 — Steam 도전과제 "OO 완전 강화" 26개 집계, chaptercheats.com 미러]

Steam 도전과제에 건물마다 "Fully upgrade the X" 1개씩이 있고, 이것이 사실상 유일한 **공식 완전 목록**이다. 도전과제 중 "Upgrade Perfection: 15개 건물 풀업"이 따로 있어 **26종 중 상위 15종만 그 도전과제의 카운트 대상으로 추정**되나 **어느 15종인지는 미확인**이다.

| 분류 | 건물 (7-2~7-8 상세 서술) |
|---|---|
| 제작·개조·경제 (6) | Scrapper · Blacksmith · Artisan's Hall · Gemcutter's Cabin · Alchemist's Hut · Community Project |
| 성장 상한 트랙 (3) | Keep · Castle · Watchtower |
| 자동화·로스터 (2) | Barracks · Armoury |
| 콘텐츠 게이트 (5) | Bounty Board · War Camp · Domain of Agony · Map Room · Ancient Reliquary |
| 저장 (2) | Item Vault · Hidden Vault |
| 채집(직업) (4) | Profession Hall · Mine · Forest · Farm |
| **정체 미상 (4)** | **Expedition · Grand Expedition · Fortress · Pinnacle** |

### 7-2. 초반 건설 순서 [공식 — Deep Dive #5 "Building Upgrades & Professions", 2022-06-04]

```
Scrapper (최우선 — 분해가 이후 모든 건물의 재료원)
   → Blacksmith (100골드 + 재료 — 장비 제작·개조)
   → Barracks (자동 타겟팅·자동 시전)
   → Profession Hall (Mine/Forest/Farm 해금 — 패시브 채집)
   → Community Project (재료 기부 → Donation Credits)
```
이후 건물(Castle/Watchtower/War Camp/Map Room/Ancient Reliquary/Domain of Agony 등)은 **Deep Dive #5에 아예 언급이 없다** — 전부 2022년 이후 엔드게임 패치로 추가된 것으로 판단. 이 5개는 개별 게이트(다른 건물 랭크, 캐릭터 레벨)를 따를 뿐 하나의 마스터 순서를 따르지 않는다.

### 7-3. 제작·개조·경제 건물군

| 건물 | 확인된 효과 | 출처/신뢰도 |
|---|---|---|
| **Scrapper** | 장비를 넣고 분해 → 재료(+대부분 아이템은 분해 시 그 레시피를 함께 해금). **r3 = Auto Scrap Settings 패널** — 아이템 타입별 독립적인 희귀도 문턱 설정, "설정한 희귀도 이하를 전부 자동 분해". 자동 분해는 신규 드롭에만 적용. **r6 = Artisan's Hall(하위 건물) 해금** | [공식] Dev Q&A 스레드 |
| **Artisan's Hall** | Scrapper r6로 해금되는 별도 건물. **r1 = "Bag Settings"**(보스 상자 자동 개봉). **r5(혹은 r6, 출처 불일치) = Blacksmith에서 Transmute·Imbue·Imprint 사용 가능** | r1: [공식]. r5/r6: [가이드]/[커뮤니티] 2건이 랭크 숫자만 불일치 |
| **Blacksmith** | r1부터 제작 가능. r2~r5는 순차 해금(개별 랭크당 무엇인지는 **N/F**). 소켓 추가는 소켓 조각 소모, 이미 있는 소켓 수에 비례해 비용 증가. **아이템 레벨 51+는 소켓이 자연 굴림**. 랭크업 비용 통화는 **"Fragment"** | [공식] Dev Q&A + 0.8 패치노트. 정확한 Fragment 수치는 **N/F** |
| **Gemcutter's Cabin** | **r2 = 소켓 추가 크래프트 해금**. **r3 = 젬 보관 탭** | [공식] |
| **Alchemist's Hut** | 플라스크 제작. 총 랭크 ≥7 확인. **r7 = Auto Refill** | r7: [공식] 0.9 베타 노트 |
| **Community Project** | 재료 기부 → Donation Credits. **r2 = Community Passives 해금**. Auto Donation Threshold 존재하나 정확한 해금 랭크는 **N/F** | [공식] |

**⚠ 미해소 충돌 — Community Project ↔ Faction**: 0.8 "Faction Update"(2023-05)로 완전히 별개 엔드게임 시스템("Faction", 4팩션 + 팩션 던전 + 팩션 평판)이 추가됐다. 일부 검색 결과가 "Faction Passives"·"Divine Favour 패시브"를 Community Project의 Donation Credits 패시브와 혼용해서 쓴다. **두 트리가 같은 통화를 공유하는지 확정하지 못했다.**

**Community Project 영구 패시브**(리스펙 불가, 결국 전부 획득 가능): 재료 보관량 1~5 · 기부 크레딧 획득 1~50랭크 · 채집 20초→10초 · Tool Fortune/Tool Luck · Double Scrapping/Double Resources · Luck/Fate/Wealth/Fortune

### 7-4. 성장 상한 트랙 — Keep · Castle · Watchtower

세 건물이 **서로 다른 두 축의 "상한 돌파"를 나눠 맡는다**:

| 건물 | 트랙 | 확인된 효과 |
|---|---|---|
| **Keep** | **Paragon**(희귀도 밖 수직 성장) | Paragon 제작 해금 — P1~P10이 속성 랭크 상한을 10→20으로. 실제 크래프트는 Blacksmith UI에서 수행 |
| **Castle** | **Nemesis** 발생 보장 | r1=최소 2속성 보장 · r2=최소 랭크 4 보장 · r3=Nemesis Infusion 해금 |
| **Watchtower** | **Nemesis** 품질 상한 | r3=최대 3개 · r5=최대 랭크 8 |

- Castle/Watchtower 이상 랭크(4+)와 정확한 건설·랭크업 비용은 **N/F**
- **1.3.0.0**: "Transmute Attribute·Imprint Attributes·Reroll Nemesis" 크래프트가 추가 언급 → Nemesis 계열에 Infusion 외 크래프트가 더 있음을 시사하나 소속 건물·랭크는 **N/F**

> **본작 관점**: Lootun은 "상한 돌파"라는 하나의 파워크리프 축을 **건물 3개에 나눠 심었다**. 본작 §10-2 검토 후보에 이 패턴이 있다.

### 7-5. 자동화·로스터 건물

| 건물 | 확인된 효과 | 출처/신뢰도 |
|---|---|---|
| **Barracks** | 건설 비용 골드 400. **Tactics**: 타겟팅 4모드(Random/Strongest/Weakest/Round Robin). 쿨다운 스킬별 타겟팅 개별 지정. 상위 랭크=쿨다운 스킬 자동 시전 | [가이드] |
| **Armoury** | 레벨 20 해금. 로드아웃(파티 장비+플라스크 세트 저장/호출). **랭크당 로드아웃 2슬롯**(2024-03 베타에 1→2 버프) | [가이드]+[공식] |

### 7-6. 콘텐츠 게이트 건물

| 건물 | 확인된 효과 | 출처/신뢰도 |
|---|---|---|
| **Bounty Board** | **r1 = Hunt 2번째 슬롯 해금**. Favour 통화의 공급원 | [공식] |
| **War Camp** | **r1 = Hunt 3번째 슬롯 해금**. Faction 시스템과 연관되나 게이트 여부 미확정 | [공식] |
| **Domain of Agony** | r4 = "Agony 미션 흑요석 드롭 +50%"(너프 후) — 원래는 미션 슬롯을 팔았다는 뜻. r1~r3 N/F | [공식]-추정 |
| **Map Room** | 레벨 100 해금(추정). Map Expertise 소프트캡 우회 — 몬스터를 파티 최고 레벨까지 스케일업시켜 저레벨 구맵에서도 Expertise 파밍 지속 | [커뮤니티] |
| **Ancient Reliquary** | "Reliquary" 버튼=유니크 강화 메뉴. 강화 경험치→강화 포인트(아이템당 최대 4). 상위 티어 Heroic Upgrade는 연계 레이드 Heroic 클리어 요구. r3 비용=코어/파편/룬/글리프 | [공식] |
| **Item Vault** | r3="Divine Storage" 탭(확신 낮음). **r4 = Item Research**([1.3]) — 드롭 유니크 자동분해→리서치 포인트→사본 제작 | r4: [공식] |

> **Hidden Vault는 Item Vault와 다른 건물.** r2가 "Overload Core" 드롭 게이트라는 언급 있음.

### 7-7. 채집 — Profession Hall

```
Profession Hall → Mine(광물) / Forest(약초) / Farm(농작)
```
기본 20초에 1회 수확 → Community 패시브로 10초까지 단축.

### 7-8. 정체 미상 — Expedition · Grand Expedition · Fortress · Pinnacle

도전과제("완전 강화")로 존재는 확인되나, **기능을 설명하는 출처를 전혀 찾지 못했다.**

### 7-9. 재화·비용 구조

| 통화 | 획득처 | 소모처 |
|---|---|---|
| **Fragment** | (미확인) | Blacksmith 랭크업 |
| **Favour** | 바운티 클리어 | 바운티 리롤/포기, 일부 건물 업그레이드 |
| **Donation Credits** | Community Project 재료 기부 | Community Passives |
| **코어/파편/룬/글리프** | 하위 등급 아이템 분해("shatter") | Ancient Reliquary 랭크업 |
| **Obsidian** | Agony 미션 | Domain of Agony 관련 소모(추정) |

### 7-10. v2에서 바로잡은 것

| # | v1 서술 | v2 정정 | 근거 |
|---|---|---|---|
| 1 | "Blacksmith r5 → Artisan's Hall / r6 → Transmute·Imbue·Imprint" | **Scrapper r6이 Artisan's Hall을 해금**하고, **Artisan's Hall 자체의 r5~6**이 Blacksmith에서 세 크래프트를 열게 한다 | [공식] Dev Q&A |
| 2 | Community Project **r4 = 자동 기부** | 재확인 실패 — 미검증 하향 | 재조사 결과 N/F |
| 3 | Map Room/Ancient Reliquary/Artisan's Hall "역할 미확인" | 셋 다 해소 | 상기 출처 |

> **건물이 곧 시스템 해금이다.** 개조 도구도, 자동화도, 드롭 품질(Nemesis)도, 콘텐츠 접근권도 전부 건물 랭크 뒤에 있다.

---

## 8. 콘텐츠 루프

### 8-1. 진행 순서

```
Missions → Bounties → Agony → Factions → Ancient Bastion → Raids → Endless Mode
                                   └───────── 각각의 Mythic 난이도 ─────────┘
```
- **Mission Loop**: 라운드 반복. 잡몹 라운드 기본 14(패시브로 13까지)
- **Hunts**: 레벨 101+ 해금. 지정 미션 클리어로 레어 베이스·Divine·인챈트 스크롤 보상
- **Raid**: 6인. 전담 탱커 등 전용 셋업 요구
- **Endless Mode**: 새 인챈트·Divine·Fated Augment 공급
- **[1.3]** Risen Emperor 이후 신규 레이드 + 전 인챈트의 Mythic 버전 + Mythic 팩션 미션

### 8-2. 바운티 — **되돌릴 수 있는 난이도 다이얼** [공식 #8]

```
바운티 3개 제시 → 목표·모디파이어·보상 확인 → 1개를 "저장고"에 넣음 → 새 3개 생성
저장고 = 큐. 팀이 순차 소화.  Favour 로 선택지 리롤 / 저장분 포기 가능
```
- 클리어 보상 = Fame → Fame Passives 구매 → Infamy 상승
- Infamy가 오르면 바운티의 모디파이어 개수와 강도가 함께 오르고, 보상 개수도 오른다
- **핵심**: 언제든 Fame Passives를 해제하고 Fame을 환급받을 수 있다 → **Infamy를 내려 난이도를 되돌릴 수 있다**

> **가장 우아한 장치.** "더 어렵게=더 많이"를 플레이어가 스스로 돌리되, **되돌릴 수 있으므로 실수해도 벽에 갇히지 않는다.**

### 8-3. 아고니 — 모디파이어 적층

- 미션에 Map Modifier를 붙일 때마다 Agony Level +1, 최대 10
- 레벨이 오르면 일반 몹이 Agony 몹으로 치환될 확률 상승 → 후반엔 Agony 보스
- Agony 전용 재료 = Reinforcement 재료

### 8-4. Mission Idol — 규칙 자체를 바꾸는 손잡이

`Solo Idol`(1인 제한) / `Raid Idol`(6인 허용) 등. 난이도와 보상을 미션 단위로 재정의한다.

### 8-5. Fated Augment

- Endless Mode 각 미션 1층 클리어 시 1개 해금. 캐릭터당 1개만 활성
- Endless 진행에 따라 레벨업하고, 레벨 150/200에서 새 패시브 해금

### 8-6. Item Research **[1.3]** — 드롭 전용템의 확정 획득 경로

`Item Vault r4` 해금:
```
드롭 전용 아이템을 줍거나 자동분해  →  리서치 포인트 누적
     →  충분히 모이면 그 아이템의 "사본 생성" 능력 해금  →  희귀 재료로 생성
```
+ **Duplicate Equipment** 크래프트: 강화·인챈트까지 포함해 아이템 통째 복제

> **파밍 게임이 4년 차에 도달한 결론**: 순수 확률 체이스만으로는 안 되고, **"헛걸음이 축적되어 결국 확정으로 바뀌는 경로"**(=천장/피티)가 필요하다.

### 8-7. 인게임 용어집 [공식 #7]

게임이 **자기 위키를 내장**한다: 게임 메커닉/전 속성 설명/몬스터 HP·피해·경험치/몬스터 능력/전 장비·젬·유물의 스탯과 드롭 위치/재료 드롭처. 도감 항목은 플레이로 해금되고, 검색 기능이 있다(1.3).

> 위키가 없어도 되는 이유가 이것이다. **정보 공개 자체를 진행 보상으로 만든** 처리.

---

## 9. Lootun이 반복하는 설계 원리 8가지

이 게임의 개별 시스템을 관통하는 패턴. **본작이 훔칠 만한 것은 시스템이 아니라 이 원리들이다.**

1. **통제권을 계단으로 판다** — 굴림 → 부분 확정 → 지정 → 이사 → 재생산 → 복제. 각 칸이 별개 비용
2. **양적 계단과 질적 계단을 분리** — 희귀도는 칸 수(양)만, 통제(질)는 작업대가
3. **덧셈 공격 / 곱셈 방어** — 딜은 스택 유도, 탱은 캡 없이 안 터짐
4. **버린 것이 다음 굴림의 비용** — 분해 조각 3종 = 속성 타입 3종
5. **캡을 없애지 않고 캡 뚫을 권리를 판다** — Blessed(치명 100% 초과), Censure(도트 치명)
6. **난이도 다이얼을 쥐여주되 환급 가능하게** — Fame ↔ Infamy
7. **자동화·정보·규칙 해금이 곧 진행 보상** — Tactics, 자동시전, 용어집, 자동분해
8. **체이스에는 반드시 확정 경로를 붙인다** — Item Research, Duplicate, Imprint

---

## 10. 본작 대조표 + 검토 후보

### 10-1. 대조

| 축 | Lootun | 본작(현재 확정) | 판단 |
|---|---|---|---|
| 희귀도 | **5단계 = 속성 칸 2~6**(양적) | 4단계=통제 가능성(질적) | 본작 유지 — Lootun의 "칸 수"는 본작 *레어*의 정체와 겹친다 |
| 옵션 정체성 | 공/방/유 3분류뿐, 정체성 축 없음 | **7죄종 × 부위 매트릭스** | 본작의 최대 차별점이자 최대 부채 |
| 옵션 수직 성장 | 랭크[x/10], 랭크당 +10% → Paragon 20 | 없음(강화만) | **검토 1순위** |
| 세트 | 장비 세트 없음/젬 세트 있음 | 장비 3/6/9 세트포인트 | 본작 고유. Lootun은 세트를 장비 자유도를 안 깎는 곳(젬)에 뒀다 |
| 통제권 위치 | 작업대 10종 | 희귀도 안(낙인 1종) | 본작이 단순·통일하나 얕다 |
| 리롤 비용 | 분해 조각 3종=속성 타입 3종 | 골드 단일 | **본작의 빈 구멍** |
| 슬롯 | 16 + 유물(레벨 스케일) | 8 | 본작 유지. "버려지지 않는 장비"는 없음 |
| 무기 | 3계열×세부 베이스 11종. 양손=베이스 2배 | 5+2 무기군, 양손=죄종 2포인트 | 같은 문제에 다른 답 |
| 기본 공격 | 스킬 슬롯(빌드의 주력) | 무기군이 결정(전투 규칙) | 방향 정반대 |
| 스킬 트리 | 스킬 1개=패시브 8 + 클래스 25 + 어센던시 100pt | 3탭(죄종/마스터리/전직) + 액티브 슬롯 3 | Lootun=스킬 단위, 본작=캐릭터 단위 |
| 액티브 상한 | 기본공격 1+쿨다운 다수 | 액티브 슬롯 3 | 본작이 더 타이트 |
| 피해 공식 | 덧셈 공격/곱셈 방어 | 미확정 | **검토 2순위** |
| 전직 위상 | 역할(탱/딜) 결정 | 빌드의 본체 | 의도된 차이 |
| 레벨 | 150. 101+는 매 레벨 챌린지 게이트 | 미확정 | **검토 3순위** |
| 타겟팅 | 거점 건물(Barracks) 보상 | 미확정 | 거점 해금 패턴 채택 검토 |
| 파티 | 로스터 18/파티 3/레이드 6 | `[balance.csv:roster_cap]` 등 | 본작이 훨씬 타이트 |
| 난이도 손잡이 | Map Modifier + Idol + Infamy 3개 | 스테이지 진행뿐 | **검토 4순위** |
| 체이스 종결 | Item Research(확정 경로) | 없음 | **검토 5순위** |

### 10-2. 검토 후보 (기획 판단 필요, **미반영**)

우선순위 순:

1. **분해 조각 ↔ 리롤 비용 되먹임** — 속성 타입=재화 타입. 본작 골드 단일 소모처의 대안
2. **덧셈 공격/곱셈 방어 비대칭** — battle_design.md 피해 공식이 미확정인 지금이 결정 시점
3. **속성 랭크 축** — "붙었는가/얼마나"의 2단 분리. 본작 "베이스 고정, 굴림으로 강해진다"와 충돌하는지 먼저 확인
4. **난이도 다이얼 + 환급** — Fame↔Infamy
5. **체이스의 확정 경로** — 니즈 4의 목표물에 천장을 붙일 것인가
6. **캡 해제를 파는 축** — 캡 조정 대신 예외권 판매
7. **젬식 공유 슬롯** — 세트를 장비 밖에 두는 형태. 본작 3/6/9와 충돌하므로 채택 시 재검토 필요
8. **레벨 게이트(챌린지)** — 후반 레벨업을 시간이 아니라 도전으로 막기
9. **레벨 스케일 장비(유물)** — 버려지지 않는 슬롯
10. **파워상한 축을 건물 여러 개에 분산** — Keep(Paragon)·Castle+Watchtower(Nemesis 발생확률·품질 분리)
11. **콘텐츠 접근 슬롯 자체를 건물이 판다** — Hunt 슬롯이 Bounty Board r1 → War Camp r1으로 순차 해금
12. **(신규, 01_skills.md §7·02_items.md §12에서 심화)** 패시브의 "비율 슬라이더형 전환" · 역할별 DPS 상한 격차 강제 · 새 피해축엔 최소 9개 스케일 경로

---

## 11. 출처 · 미확인 · 정정 이력

### 11-1. 출처

**공식 (개발사)**
- Deep Dive #1 스킬/클래스/어센던시 — https://store.steampowered.com/news/app/1960270/view/3194751677688961787
- Deep Dive #2 장비 — https://steamcommunity.com/games/1960270/announcements/detail/4459137986475155588
- Deep Dive #3 분해·제작 / #5 건물·직업 / #7 용어집·도전과제 / #8 바운티 — Steam 공지 피드
- Steam 상점(1.3) — https://store.steampowered.com/app/1960270/Lootun/
- 패치노트 목록 — https://steamcommunity.com/app/1960270/allnews/

**유저 가이드**
- `Walkthrough 0.9 (still useful in 1.1!)`(Ambrodel) — https://steamcommunity.com/sharedfiles/filedetails/?id=3044062918
- `Tanks`/`The Thorns DPS archetype`/`170T Endgame team`/`Maximum Greed! Speed farmers`/`Choosing gear for your team`/`Quick guide for Gear Progression`(sleeeeepy 외) — https://steamcommunity.com/app/1960270/guides/
- Starters Guide — https://gameplay.tips/guides/lootun-starters-guide.html
- Nemesis Infusion Guide — https://gameplay.tips/guides/lootun-nemesis-infusion-guide-endgame-crafting.html
- Level/Farm Build(All Classes) — https://gameplay.tips/guides/lootun-level-farm-build-all-classes.html

**커뮤니티/기타**
- Lootun Developer Questions 스레드 — https://steamcommunity.com/app/1960270/discussions/0/3275816470981302593/
- itch.io(구버전 스냅샷) — https://arrowsoft.itch.io/lootun
- PC Gamer 소개 — https://www.pcgamer.com/games/lootun-is-an-auto-battling-rpg-for-people-who-just-really-love-managing-their-partys-gear/

**§7 v2 건물 심층조사 추가 출처(2026-08-26)**
- Steam 뉴스 피드 timestamp-cursor 방식(JS 렌더 우회) — Deep Dive #3/#5, 0.8 Faction Update, 1.2.1~1.3.0.14 패치노트 원문 확보에 사용
- Hunt 슬롯(Bounty Board r1/War Camp r1) 개발자 직답 — https://steamcommunity.com/app/1960270/discussions/0/596279819757476771/
- Ancient Reliquary r3 재료+강화메뉴 정체 개발자 직답 — https://steamcommunity.com/app/1960270/discussions/0/3275816470981302593/, https://steamcommunity.com/app/1960270/discussions/0/4515505814159799319/
- Map Room/Map Expertise 커뮤니티 답변 — https://steamcommunity.com/app/1960270/discussions/0/596271495257325294/
- Artisan's Hall → Blacksmith Transmute/Imbue/Imprint — https://steamcommunity.com/app/1960270/discussions/0/4333105405782462935/
- Scrapper r3/r6 개발자 직답 — https://steamcommunity.com/app/1960270/discussions/0/5219148331328222101/
- 소켓 개발자 직답 — https://steamcommunity.com/app/1960270/discussions/0/4333105050948161252/
- 1.0.0 베타 패치노트(Armoury 로드아웃 1→2) — https://steamcommunity.com/app/1960270/discussions/1/7056649947877379138/
- 0.9 베타 노트(Alchemist's Hut r7) — https://steamcommunity.com/app/1960270/discussions/1/3827551537104342183/
- 건물 전수 목록 — https://www.chaptercheats.com/cheat/pc/557106/lootun/unlocks/120036

**§3-2-1 액티브 스킬 전수 조사 추가 출처(2026-08-27)**
- `ISteamNews` 공식 Web API — `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=1960270&count=100&maxlength=100000&format=json` — 뉴스 68건 전문 확보(Deep Dive #4·#6 원문 포함)
- "0.9 Raids Update" 패치노트(2023-09) · "1.0 Preview"/"1.0 Beta Release" 패치노트(2024-03) · 1.1·1.2 패치노트의 어센던시 3종 확정 근거 — 전부 위 API로 확보
- Steam Deep Dive #1 임베드 이미지(Mage 마스터리 패널) — clan 이미지 CDN 직접 열람

**스킬·아이템 심화(2026-08-28) 추가 출처는 [01_skills.md §8](01_skills.md#8-출처--미확인nf-총괄)·[02_items.md §13](02_items.md#13-출처--미확인nf-총괄)에 분리 기재.**

### 11-2. 총조사 후에도 남은 미확인 (게임 구조·경제·거점 범위)

| 항목 | 상태 |
|---|---|
| **Deep Dive #4·#6 원문** | 확보 실패. 주제 미상(미션/전투·플라스크/인챈트로 추정) |
| **전투가 실시간인가 라운드 턴제인가** | 1차 자료 없음 |
| **어그로/위협 수치의 구체 규칙** | 탱 역할·전담 탱커 요구는 확인, 수치 규칙 미확인 |
| **인챈트 총수** | [상점]50+ vs [가이드]100~150+ 충돌 |
| **로스터 상한** | [상점 1.3]18 vs 구 인게임 FAQ 10 충돌 |
| **랭크 +10%의 정확한 기준** | 곱연산 기준선 미확인 |
| **Nemesis Overload/Pristine 재료 획득 경로** | Mythic 콘텐츠라는 것까지만(§6-2 확률 실측은 02_items.md §6-2 참조) |
| **26개 건물의 정확한 랭크별 골드/재료 비용 전체** | 초기 건설비 일부만 확인 |
| **Expedition·Grand Expedition·Fortress·Pinnacle** | 존재만 확인, 기능 완전 미상 |
| **Hidden Vault 전체 기능** | 단편만 확인 |
| **Community Project 패시브 트리 ↔ Faction 패시브 트리** | 같은 재화 풀인지 별개인지 미확정 |
| **"건물 풀업 15개" 도전과제가 26종 중 어느 15종을 지칭하는지** | 미확인 |
| **Artisan's Hall이 세 크래프트를 여는 정확한 랭크** | 5 vs 6, 출처 불일치 |
| **Castle/Watchtower 랭크 4+, War Camp/Bounty Board 랭크 2+** | 전 구간 미확인 |

> **스킬 47/56 확보 세부 · 아이템 관련 N/F는 각 짝 문서의 마지막 절로 이관됐다** — [01_skills.md §8-3](01_skills.md#8-3-미확인nf-총괄) · [02_items.md §13-3](02_items.md#13-3-미확인nf-총괄).

### 11-3. v1(1차 조사)에서 정정한 것

| # | v1 서술 | 총조사 결과 | 근거 |
|---|---|---|---|
| 1 | 희귀도 6단계, Common(흰)=속성 1칸 | **5단계(Uncommon 2~Mythical 6)**. 장비는 "2~6개 무작위 속성" | [공식 #2] |
| 2 | 슬롯 15 | **최대 16** | [공식 #2] |
| 3 | "세트 개념 없음" | 장비 세트는 없으나 **젬 세트 보너스가 있다** | [커뮤니티] |
| 4 | 무기="타입 3종" | 3계열 아래 **세부 베이스 11종**, 양손은 베이스 수치 2배 | [공식 #2] |
| 5 | 리롤 비용="분해 조각" | 조각 3종 **+ Rarity Core**. 소켓 조각·인챈트 시약도 별도 | [공식 #3] |

### 11-4. v2(2026-08-26, §7 건물 심층조사)에서 정정한 것

전체 표는 §7-10에 있음. 요지만: ① Artisan's Hall 해금 체인이 반대였다, ② Community Project "r4=자동기부"는 재확인 실패로 미검증 하향, ③ Map Room·Ancient Reliquary·Artisan's Hall "역할 미확인" 3건 해소.

### 11-5. 폴더 3분리(2026-08-28)에서 바뀐 것

기존 단일 파일 `docs/reference/lootun_reference.md`(§0~§11, 862줄)를 `docs/reference/lootun/` 폴더 3분리로 재편했다:
- **§0·§1·§9·§10·§11**(조사방법·게임구조·설계원리·본작대조·출처) → 이 문서(00_overview.md)로 이관, §2·§5·§6·§7·§8(성장축·전투수치·경제·거점·콘텐츠)도 스킬·아이템 어느 쪽도 아니므로 그대로 이 문서에 남김
- **§3(스킬 구조)** → [01_skills.md](01_skills.md)로 이관·심화(47/56 스킬 표 유지 + 8패시브 실사례 + 역할군 실측 빌드 8종 신규)
- **§4(아이템 구조)** → [02_items.md](02_items.md)로 이관·심화(구조 유지 + Nemesis 확률 실측·Thorns 9경로·Divine 실례 신규)
- `lootun_reference.md` 파일 자체는 **삭제**됐다. 저장소 내 상호 참조(`laststory_reference.md`·`dragoncliff/`·`.claude/skills/game-design/doc_map.md`)는 새 경로로 갱신됨

---
*마지막 업데이트: 2026-08-28(폴더 3분리 — 스킬·아이템 조사를 01_skills.md/02_items.md로 이관·심화, 이 문서는 개요+비-스킬/아이템 시스템 전담으로 재편) · 2026-08-27(§3 액티브 스킬 47/56 전수 확보) · 2026-08-26(§7 거점 건물 심층조사 v2)*
