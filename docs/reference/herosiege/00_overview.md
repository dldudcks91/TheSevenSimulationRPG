# Hero Siege — 시스템 전수 조사 (개요)

> 상태: **조사 완료** (2026-09-03) — 게임 구조·월드·난이도·경제·라이브서비스 축
> 목적: **"파밍의 세로축"만 극단으로 밀어붙인 라이브서비스 ARPG** 표본 확보. 본작과 조작 방식이 정반대(실시간 수동 조작)이므로 방치형 표본이 아니라 **파밍 깊이·통제성 장치·시즌 운영의 대조군**으로 쓴다
> 짝 문서: [01_skills.md](01_skills.md)(클래스·스킬 전수) · [02_items.md](02_items.md)(아이템 형태·옵션 전수). **이 문서는 게임 구조 한 장 + 월드 + 난이도·게임모드 + 경제 + 콘텐츠 루프 + 라이브서비스 운영을 담고, 스킬·아이템 상세는 짝 문서로 넘긴다.**
> ⚠ **이 문서(및 짝 문서)의 수치는 전부 Hero Siege의 수치다.** 본작 SSOT가 아니며 `src/data/*.csv`로 옮기지 말 것

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 — **대상 확정(2.0 분단선)** · 오염 배제 |
| 1 | 게임 구조 한 장 |
| 2 | 캐릭터 축 — 클래스 · 능력치 · 레벨 100 |
| 3 | 성장 5층 (요약 — 상세는 [01_skills.md](01_skills.md)) |
| 4 | 월드 — 액트 9 + 유니크 존 18 |
| 5 | **난이도 계단 = Magic Find 계단** — 이 게임의 정수 |
| 6 | 게임모드 4축 — 시즌 · 하드코어 · Odyssey · 온라인/오프라인 |
| 7 | 경제 — Tarethiel Market · 거래 · 전문직 |
| 8 | 콘텐츠 루프 — 엔드게임 장치 |
| 9 | 라이브서비스 운영 — 시즌 10회 이력 · DLC 정책 |
| 10 | Hero Siege가 반복하는 설계 원리 8가지 |
| 11 | 본작 대조 — 무엇을 빌리고 무엇을 버리는가 |
| 12 | 출처 · 미확인(N/F) · 오염 |

---

## 0. 조사 방법과 신뢰도

### 0-1. 대상 확정 — **후속작은 없다. 분단선은 「2.0」이다**

조사 착수 시 "Hero Siege 1 / Hero Siege 2 두 게임"이라는 전제로 시작했으나 **틀린 전제였다.** 확인 결과:

- **Steam 앱은 `269210` 하나뿐**이고, 2014-01-29 출시 이후 같은 앱이 계속 갱신되어 왔다 [상점]
- **"Hero Siege 2.0"은 후속작이 아니라 2023-10-02에 나온 같은 게임의 대규모 리워크 무료 패치**다 — 아이템·스탯·클래스를 전면 재제작하고 **기존 캐릭터·아이템을 전량 와이프**했다 [커뮤니티][패치노트]
- 조사 시점 최신은 **패치 7.0.9** (2026-09-03 기준, 시즌 10 진행 중) [패치노트]

→ 따라서 이 폴더의 세 문서는 **`poe1/`처럼 게임을 가르는 게 아니라 `diablo4/`처럼 시대를 가른다.** 분단선:

| 시대 | 기간 | 성격 |
|---|---|---|
| **pre-2.0** | 2014-01-29 ~ 2023-10-01 | 트윈스틱 웨이브 생존형에 RPG 요소. 맵이 단순한 사각형, 레벨업이 빠르고 드롭이 드물지만 값어치가 컸다. 파밍 중심이 **아니었다** [커뮤니티] |
| **post-2.0** | 2023-10-02 ~ 현행(7.0.9) | **Diablo 지향 라이브서비스 ARPG**. 슬롯 기반 인벤토리, 접사·룬워드·차암, 시즌제, 플레이어 경제 [커뮤니티][상점] |

**본문은 전부 post-2.0(현행 7.x) 기준이다.** 검색에 걸리는 가이드가 2023-10 이전 것이면 현행과 어휘부터 다르므로, 이 문서는 pre-2.0 정보를 인용할 때 반드시 `[pre-2.0]`을 붙인다.

### 0-2. 출처 표기와 신뢰도

| 표기 | 소스 | 신뢰도 |
|---|---|---|
| **[위키]** | **`herosiege.wiki.gg`** — 공식 위키. Fandom 에서 wiki.gg 로 이전됨. WebFetch 정상 동작 | ★★★ 단 **갱신이 늦다**(§0-3) |
| **[패치노트]** | Steam 공지 · `api.steampowered.com/ISteamNews` | ★★★ 1차 사료 |
| **[상점]** | Steam 상점 페이지(`app/269210`) · 공식 사이트 `playherosiege.com` | ★★★ 공식 카탈로그 |
| **[커뮤니티]** | Steam 토론 게시판 | ★★ 유저 증언, 시점 확인 필요 |
| **[트래커]** | `hero-siege-helper.vercel.app` — 유저 제작 시즌 트래커 | ★★ 날짜가 [패치노트]와 교차 검증됨 |
| **[3자]** | 위 어디에도 속하지 않는 외부 가이드 | ★ **단독 근거로 쓰지 않는다**(§0-4) |

### 0-3. 이 조사의 한계 — **공식 위키가 현행 시즌을 못 따라간다**

`herosiege.wiki.gg`는 구조·용어의 1차 자료로 신뢰할 수 있으나 **시즌 10(2026-08-21) 개편이 아직 반영되지 않았다**:

- 메인 페이지가 "current Season 5"라고 적고 있다 (실제로는 시즌 10)
- `Difficulty` 페이지가 여전히 `Normal / Nightmare / Hell 1~5`를 싣고 있는데, 시즌 10 패치노트는 **"Nightmare 가 Hell Tier 1 이 되고, Hell 은 Hell Tier 4.5 에 해당한다"**고 적었다 [패치노트]
- `Incarnation` · `Ether` 페이지는 **아예 존재하지 않는다**(HTTP 404) — 현행 엔드게임 성장의 두 기둥인데도

→ 그래서 §5(난이도)와 §3(성장 5층)은 **[위키]와 [패치노트]가 어긋나는 지점을 그대로 병기**하고, 어느 쪽이 현행인지 판정된 것만 확정 표기했다.

### 0-4. 걸러낸 오염 — **AI 생성 SEO 위성 사이트가 검색 상위를 뒤덮고 있다**

Hero Siege 검색은 **Dragon Cliff 조사 때의 `mejoress.com` 오염보다 심각하다.** "위키"를 자칭하는 도메인만 최소 3개가 공식 위키가 아니다:

| 도메인 | 자칭 | 판정 |
|---|---|---|
| `herosiegewiki.com` | "Hero Siege Wiki — Class Tier List, Builds & Boss Guides" | **공식 아님.** 공식은 `herosiege.wiki.gg` |
| `hero-siege.wiki` | "Hero Siege wiki — classes, Ebontharn, and loot" | **공식 아님.** 검색 엔진 요약이 "공식 위키는 hero-siege.wiki"라고 잘못 안내하는 것까지 직접 확인 |
| `herosiegeguide.wiki` · `herosiegebuilds.com` · `afleurdenet.com` · `xmodhub.com` · `tposegaming.com` · `ggwtb.com` | 시즌 10 가이드 | 시즌 10 난이도 개편을 **서로 모순되게** 서술한다(§5-3) — 최소 한쪽은 지어낸 것 |

**취급 원칙**: 이 문서는 위 도메인들의 서술을 **단독 근거로 쓰지 않았다.** [위키]·[패치노트]·[상점]과 교차 검증된 문장만 채택했고, 교차 검증에 실패한 수치는 §12에 `N/F`로 남겼다.

> `herosiege.fandom.com`은 **이전 위치의 구 위키**다. 살아 있지만 wiki.gg 이전 이후 갱신이 멈춘 것으로 보이므로 pre-2.0 자료로만 취급한다.

---

## 1. 게임 구조 한 장

```
   플레이어 = 영웅 1인 (실시간 수동 조작 · 온라인/로컬 co-op)
   ┌──────────────────────────────────────────────────────────────┐
   │  클래스 24종 중 1 선택 → 캠페인 Act 1~9 (Normal)             │
   │        ↓  레벨 1 → 100                                        │
   │  ┌── 레벨 100 = 캠페인의 끝, 게임의 시작 ──────────────┐      │
   │  │                                                      │      │
   │  │  난이도 상승 (Nightmare → Hell → Inferno)            │      │
   │  │     └→ Magic Find 배율 · Uber Boss 드롭률 상승       │      │
   │  │  Incarnation 트리 (2,200+ 노드) ← Hero Level         │      │
   │  │  Ether 트리 (500+ 노드) ← Hell/Inferno 퀘스트        │      │
   │  │  유니크 존 18종 · 웜홀 층 · 챌린지 던전              │      │
   │  │                    ↓                                 │      │
   │  │      드롭 → 룬워드 · 증강 · 차암 → 더 깊은 난이도    │      │
   │  └──────────────────────────────────────────────────────┘      │
   │  Tarethiel Market (플레이어 경제) ←→ 시즌 2~6개월 리셋        │
   └──────────────────────────────────────────────────────────────┘
```

- **전투는 100% 실시간 수동 조작이다.** 자동전투도, 오프라인 진행도 없다 — 본작과 조작 계약이 정반대다(§11)
- **무게중심이 명확하다**: 캠페인은 레벨 100까지 가는 통로일 뿐이고, **게임의 본체는 레벨 100 이후의 파밍 깊이**다. Lootun이 "아이템 개조"에, Dragon Cliff가 "파티 시너지"에 쏠려 있다면 Hero Siege는 **"난이도 계단을 오르는 것" 하나**에 쏠려 있다
- 상점 자칭 슬로건 중 하나가 **`BIG NO-NO for Pay to Win`** [상점] — 유료 DLC 가 클래스·스킨이지 성능이 아니라는 선언이고, 실제로 시즌 10에서 유료 클래스 4종을 무료화했다(§9-2)

---

## 2. 캐릭터 축

### 2-1. 클래스 — **24** ([01_skills.md](01_skills.md) 에서 판정 완료)

| 출처 | 수 |
|---|---|
| [위키] `Classes` 페이지 실제 명단 | **22종** — Viking / Pyromancer / Marksman / Pirate / Nomad / Redneck / Necromancer / Samurai / Paladin / Amazon / Demon Slayer / Demonspawn / Shaman / White Mage / Marauder / Plague Doctor / Shield Lancer / Jötunn / Illusionist / Exo / Butcher / Stormweaver |
| [상점] 기능 목록 | **23 Playable Character classes** |
| [상점] DLC 목록에만 존재 | **Bard** · **Prophet** (위 22종 명단에 없다) |
| 공식 사이트 캐릭터 선택 화면 | **24 슬롯** [상점] |

→ **[위키] 명단이 Bard·Prophet 을 누락**한 것이다. [01_skills.md §2](01_skills.md#2-클래스-24종-전체-명단--전문화-갈래--무기군--수급-경로)가 **위키 22종 + 상점 DLC 2종 = 24종**으로 판정했고, 이는 공식 사이트의 24 슬롯과 일치한다. **[상점]의 "23"이 갱신 누락**으로 보인다.

- 클래스는 **각각 스킬 트리 2개 = 전문화 2갈래**를 갖는다. 24클래스 × 2 = **48갈래**이고, 갈래마다 **9노드**(레벨 게이트 1/8/16/24/30)라서 **클래스당 18개**로 전부 같다 [위키] — 예: **Viking → Shield Bearer / Berserker**
- **무기군은 스킬군을 안 가른다** — 24클래스가 **"캐스터 장비(완드·책·스펠블레이드·플라스크)를 낄 수 있는가"라는 이진 게이트 하나**로만 갈린다 [위키]. 이름이 마법사인 Necromancer 와 사수인 Marksman 이 이 축의 반대편에 있지 않다
- 클래스 명단·전문화 전수·대표 8클래스 144스킬은 [01_skills.md](01_skills.md)

### 2-2. 능력치 — 배분 5종, 전부 1차 함수로 정의된다 [위키]

| 능력치 | 효과 (위키 원문 수치) |
|---|---|
| **Strength** | 공격 피해 +1% · 가산 물리 피해 +1 |
| **Dexterity** | Attack Rating +8 · 치명타 피해 +0.125% |
| **Intelligence** | 마법 스킬 피해 +1% |
| **Energy** | 마나 +4 (+ 기본 마나 재생) |
| **Vitality** | 생명 +6.5 (+ 기본 생명 재생) |
| (참고) **Armor** | 방어 +5 · 물리 피해 감소 +0.25%(25% 이후 체감) — **캐릭터 스탯이 아니라 장비 스탯**이라 배분 대상이 아니다 [가이드] |

**클래스별 고정 주스탯이 없다 — 5종 자유 배분제**이고, 위키가 권장 배분까지 제시한다(캐스터 지능40:생명40:에너지20 / 물리 힘35:민첩10:생명50:에너지5) [위키].

스탯 범주는 6묶음으로 나뉜다 [위키]: **Speed**(Attacks per Second · Attack Speed — **200% 초과부터 수확 체감** · Movement Speed) / **Offensive**(Damage · 속성별 가산 피해 · Attack Rating · Faster Cast Rate · All Skills · Magic Skill Damage · 치명타 · Deadly Blow · Crushing Blow · Open Wounds · Ignore Target Defense · Slow Target) / **Elemental**(Arcane·Cold·Fire·Poison·Lightning 각각의 스킬 피해와 저항 무시) / **Defensive**(Block · Defense · 물리/마법 피해 감소 · Damage Return · Faster Hit Recovery · 속성 저항) / **Misc**(생명·마나·재생·흡혈·쿨다운 회복·처치 시 회복·경험치 증가·**Magic Find**·골드 획득·Light Radius·상점 가격) / **Profession**(Mining · Jewelcrafting)

> **배울 지점**: 능력치가 전부 **"스탯 1당 X"의 단일 계수**로 정의돼 있다. 분기도 곡선도 없다 — 이게 접사([02_items.md](02_items.md))가 수백 종으로 불어나도 계산이 무너지지 않는 이유다. 본작 `hero_attribute.csv`·`combat_stat.csv`의 불변식과 직접 대조된다. 수확 체감을 **개별 스탯(Attack Speed 200%)에만** 국소적으로 건 것도 같은 맥락이다.

### 2-3. 레벨 구조 — 100에서 축이 바뀐다

- **최대 레벨 100.** 여기까지가 캠페인 [커뮤니티][3자] — ⚠ **[커뮤니티] 다른 스레드는 "레벨 상한 250 · 스킬 포인트 500 · 탤런트 포인트 250"이라 말한다**([01_skills.md §1-3](01_skills.md#1-3-성장-축-5층--이-문서의-뼈대)). 시즌 10 패치노트가 레벨 100을 기준점으로 삼는 것(아래)과 **스킬 트리가 레벨 30에서 끝나는 것**을 함께 보면 100이 현행이고 250은 구버전 수치로 보이나, 1차 출처로 확정하지 못했다 — §12 `N/F`
- 100 이후는 **Hero Level** 이라는 별도 축으로 계속 오르고, 그 포인트가 **Incarnation 트리**로 들어간다 [3자]
- 시즌 10 패치노트: **"레벨 100에서 기본 Ether 포인트 6개"** · **"영웅 레벨 25마다 경험치 획득 +12.5%"** [패치노트]

---

## 3. 성장 5층 (요약 — 상세는 [01_skills.md](01_skills.md))

```
 1층  클래스 스킬 트리 2갈래 × 9노드           ← 레벨 1~30 에서 완결된다
 2층  서브스킬(Specialization Points)          ← 레벨 5부터 5레벨마다 1점
 3층  Incarnation 트리                          ← Hero Level (레벨 100 개방)
 4층  Ether 트리                                ← Hell/Inferno 퀘스트 (레벨 100 개방)
 5층  아이템이 스킬을 바꾸는 층                 ← Weapon/Armor Augment · Relic · 룬워드 · 세트
```

> **1층이 레벨 30에서 끝난다**는 것이 이 구조의 핵심이다 — 레벨 상한이 100인데 **클래스 트리는 30에서 완성**되고, 남은 70레벨은 스탯과 2층(서브스킬)으로 흘러간다. **클래스 정체성은 초반에 확정되고, 그 뒤의 성장은 전부 클래스 바깥의 공용 층**에서 일어난다.

| 층 | 규모 | 포인트 출처 |
|---|---|---|
| 스킬 트리 | 클래스당 **18노드**(9 × 2갈래), 레벨 게이트 1/8/16/24/30 [위키] | 레벨업 |
| **서브스킬** | 액티브의 **피해 타입 전환·추가 효과 부여** — 전체 옵션 목록은 `N/F` [위키][가이드] | 레벨 5부터 **5레벨마다 1점** |
| **Incarnation** | **시즌 9에 1,600+ → 시즌 10에 600+ 추가 → 2,200+** [3자][패치노트] | Hero Level |
| **Ether** | **400+ → 시즌 10에 100+ 추가 → 500+** [3자][패치노트] | Hell/Inferno 전용 퀘스트 |
| 증강 | `Weapon Augments`("공격·주문에 다양한 효과를 추가") · `Armor Augments`(Angelic Realm 의 Dawn's Chapel 에서 적용) [위키] | 드롭(엠블럼) |

- 챌린지 던전이 **`Essence of Incarnation Gain`을 +75% ~ +900%**까지 준다 [위키] — 즉 3층(Incarnation)의 성장 속도 자체가 엔드게임 파밍 대상이다
- **Ether 트리는 파워 트리가 아니라 「메커니즘 트리」다** — 세지는 게 아니라 **드롭률·소요 시간·화폐 획득량** 같은 파밍 효율만 올린다([01_skills.md §7-2](01_skills.md#7-2-ether-tree--메커니즘-트리파워-트리-아님)). 이 조사가 찾은 것 중 본작에 가장 새로운 범주다(§11-2)

> ⚠ Incarnation·Ether 의 노드 수는 **[위키]에 페이지가 없어(404) [3자] 서술에 의존**한다. 시즌 10 패치노트가 "600+ 노드 추가 / 100+ Ether 노드 추가"를 확인해 주므로 **증분은 ★★★, 총합은 ★★**다.
>
> **본작 경고**: 노드 2,200개는 **설계가 아니라 누적의 결과**다 — 시즌마다 트리에 노드를 얹는 방식으로 콘텐츠를 공급하면 이렇게 된다. 본작 `skill_design.md`가 마스터리·전직 포인트 키를 아직 발행하지 않은 지금 이 표본은 **"노드 인플레이션"의 종착역**으로 읽어야 한다.

---

## 4. 월드 — 액트 9 + 유니크 존 18

### 4-1. 캠페인 — 튜토리얼 + 액트 9, 액트마다 존 10~13개 [위키]

세계 이름은 **Tarethiel** [상점].

| 액트 | 테마 | 존 (위키 원문) |
|---|---|---|
| 튜토리얼 | — | River of Inoya |
| **1** | 마을·왕국 | Town of Inoya / Outskirts of Inoya / Fields of Battle / Witching River / The Pumpkin Patch / Woodhill Plains / Village of Lamia / King's Garden / Northern Post / Old Mausoleum / Kings Tomb / King's Throne |
| **2** | 설원 | Danethorpe / Crystal Village / Chilling Lake / Arctic Tundra / Snowy Mountains / The Glacial Trail / Chilling Cavern / Freezing Steppes / Chamber of Ice / Deaths Breach |
| **3** | 사막 (**경제 허브**) | Village of Mos'Arathim / Corrupted Oasis / Dry Hills / Mos'Arathim Desert / Pyramid Level 1 · 2 / Sewers of MosArathim / Ras Labyrinth / Tomb of Ancients / Tomb of the Fallen King |
| **4** | 광산·타락 | Dhorn Farum / Old Mining Village / The Highland Mines / Corrupted Cave / The Nightmare / The Devil's Breach / Lair of Corruption / Maze of Shadows / Chamber of Burning Souls / Altar of Lost Souls |
| **5** | 동양 | Shujo Retreat / Mt. Fuji / Misty Swamp / Fuji Coast / Sea of Karponia / Temple of Zamjo / Temple of Fishes / Underground Trench / The Sacred Temple / Emperors Chamber |
| **6** | 지옥 | Dawn's Chapel / Highland Graveyard / The Cathedral / Prison Dungeon / Steam Train / The Depths of Hell / Hollowing Sanctuary / Sacrilegious Chappel / Pathway to Hell / Seventh Layer of Hell |
| **7** | 우주·정신 | Astral Encampment / Deep Space / Event Horizon / The Black Hole / Parallel Dimension / Subconscious Mind / The Void / Pathway of Souls / The Waiting Room / The Verge of Insanity / Memory of Mevius |
| **8** | 북유럽 신화 | Forest of the Slain / Flooded Plains / Plain of Ida / Gates of Valhalla / Forgotten Caves / Camp of Souls / River Gjöll / Gates of Helheim / Helheim / Ruins of Helheim / Helheim Channel / Vault of Ancients / Throne of Helheim |
| **9** | **Ebontharn** (시즌 10 신설) | 존 명단 `N/F` — [위키] 미반영. **Odin 격파 후 진입** [패치노트] |

- 존은 **절차적 생성**된다 [위키][상점] — 손으로 짠 던전과 섞인다
- 시즌 10에서 **"진행을 늘리기 위해 액트 곳곳에 사이드 존 신설"** [패치노트]
- 액트 테마가 **왕국 → 설원 → 사막 → 광산 → 동양 → 지옥 → 우주 → 북유럽 → Ebontharn** 으로 튄다. 세계관 일관성보다 **"매 액트가 새 그림"**을 택한 구조 — 12년간 액트를 계속 덧붙여 온 결과이기도 하다

### 4-2. 유니크 존 — 18종, 엔드게임의 지도 [위키]

Bifröst · Arch Demons Plateau · Unstable Rift · Sheeponia · Mists of Chaos · **Challenge Dungeon** · **Chaos Tower** · Ruby Garden · Niflheim · **Asgard** · **Angelic Realm** · Vanaheim · Rift of Fortune · Fallen Inoya · Shadow Realm · Eternal Battlefield · Ancient Colosseum · The Circle of Hatred

→ 각 존의 입장 조건·보상은 [위키] 목록 페이지에 없다(개별 페이지 필요) — §12 `N/F`.

---

## 5. **난이도 계단 = Magic Find 계단** — 이 게임의 정수

### 5-1. 구조 — 난이도가 곧 드롭 배율이다 [위키]

| 난이도 | 해금 | 몬스터 생명 | 몬스터 피해 | 몬스터 방어 | **Magic Find** | **Uber Boss 드롭률** |
|---|---|---|---|---|---|---|
| Normal | 기본 | — | — | — | — | — |
| Nightmare | Normal 에서 Mevius 처치 | — | — | — | — | — |
| **Hell 1** | Gurag·Reaper·Anubis·Damien·Karp King·Satan 처치 + Nightmare Mevius | — | — | — | — | **15%** |
| **Hell 2** | Hell 1 Mevius | **400%** | 15% | 4% | **200%** | **30%** |
| **Hell 3** | Hell 1~2 Mevius | **850%** | 25% | 8% | **400%** | **50%** |
| **Hell 4** | Hell 2~3 Mevius | **1500%** | 40% | 12% | **575%** | **75%** |
| **Hell 5** | Hell 3~4 Mevius | **2250%** | 55% | 16% | **825%** | **100%** |

### 5-2. 읽어야 할 세 가지

1. **몬스터 생명이 22.5배 오를 때 피해는 1.55배만 오른다.** 난이도는 "죽는 위험"이 아니라 **"죽이는 시간"**으로 표현된다 — 실시간 수동 조작 게임인데도 벽을 **피해 감내가 아니라 DPS 체크**로 세웠다
2. **Magic Find 가 난이도에 못 박혀 있다** — 파밍 효율을 올리는 유일한 정공법이 "더 어려운 난이도로 가는 것"이다. 아이템의 MF 옵션은 이 계단의 보조일 뿐
3. **Uber Boss 드롭률이 Hell 5에서 정확히 100%가 된다** — 계단의 꼭대기에서 **확률이 사라지고 결정론이 된다.** "무한 파밍"이 아니라 **"확률 구간을 통과하면 확정 보상"**으로 끝을 만든 것. 본작 통제성 원칙(플레이어가 인과를 읽을 수 있는 구조)의 실물 사례다

### 5-3. ⚠ 시즌 10이 이 표를 갈아엎었다 — 현행은 미확정

- [패치노트] 원문: **"Nightmare difficulty now functions as Hell Tier 1; Hell equals Hell Tier 4.5"** — 즉 난이도 계단이 압축됐다
- 시즌 10 패치노트에 **`Inferno`**가 실제 난이도로 등장한다 (예: *"Abyssal Chest 의 magic find 를 inferno 에서 24%, hell 에서 35% 상향"*) [패치노트]
- [3자] 가이드들은 **서로 모순된다**: "Nightmare 완전 삭제, Normal → Hard → Inferno" vs "Normal(Act 9까지) → Nightmare → Hell" — §0-4 오염 대상
- 시즌 10은 **"Normal 클리어 후 Nightmare 에서 웨이포인트를 전부 유지"**하도록 바꿔 **캠페인 반복을 줄였다** [패치노트]

→ **확정할 수 있는 것**: 시즌 10 현행 난이도 사다리의 최상단은 **Inferno** 이고, 기존 `Hell 1~5` 세분이 압축됐으며, 난이도 재주파 부담이 줄었다.
→ **확정할 수 없는 것**: 현행 티어의 정확한 이름·개수·배율표. §12에 `N/F`.

---

## 6. 게임모드 4축

### 6-1. 캐릭터 유형 3종 [위키]

| 모드 | 규칙 |
|---|---|
| **Seasonal** | "시즌 캐릭터는 새로 시작하며 멀티플레이에서 다른 시즌 캐릭터하고만 플레이할 수 있다. 시즌은 몇 달마다 끝나고 그 캐릭터들은 전부 비시즌으로 전환된다" |
| **Hardcore** | "하드코어 캐릭터는 한 번 죽으면 죽은 채로 남는다" |
| **Odyssey** | **솔로 전용** — 거래 및 공유 기능 비활성화 |

- **Odyssey 가 흥미로운 축이다**: 시즌·하드코어가 "시간"과 "목숨"을 격리한다면 Odyssey 는 **경제를 격리**한다. 플레이어 경제가 있는 게임이 "경제 없는 모드"를 공식 제공하는 것 — 거래가 파밍의 재미를 갉아먹는다는 자각의 산물로 읽힌다

### 6-2. 온라인 / 오프라인 — **캐릭터 로스터가 통째로 분리된다** [커뮤니티]

- 메인 메뉴에서 **`Local / Offline`을 명시적으로 고른 뒤** 캐릭터를 만들거나 불러온다. 온라인 캐릭터를 오프라인에서 쓸 수 없고 그 반대도 안 된다
- 이유는 **치트 방지**다: 오프라인 캐릭터는 로컬 파일이라 조작 가능하고, 온라인 캐릭터는 개발사 서버에 저장돼 손댈 수 없다
- **콘텐츠는 오프라인에서도 전부 플레이 가능**하다 — 다만 Odyssey / Odyssey 하드코어 도전과제는 온라인 전용
- ⚠ **"오프라인"은 "방치"가 아니다.** 게임을 켜고 직접 조작해야 진행된다 — Dragon Cliff 와 같은 함정이고, 본작 방치형 계약("자리 비워도 안전")과는 무관하다

---

## 7. 경제 — 플레이어 주도

| 장치 | 내용 |
|---|---|
| **Tarethiel Market** | 상점 기능 목록에 오르는 공식 명칭 [상점]. [위키]는 **Marketplace** 로 부르며 위치를 명시한다 — **Act 3 Village of Mos'Arathim 북쪽, NPC `Veros`** |
| 수수료 | **등록 수수료 1% · 골드 수령 수수료 10%** [위키] |
| **Trading** | 멀티플레이 로비에서 플레이어 간 직거래 [위키] |
| **Mailbox** | Town of Inoya 에 있는 플레이어 간 아이템 배송 [위키] |
| **Guild** | 캐릭터 이름 옆 태그 + 해금 가능한 길드 특전 [위키] |
| **Companions** | 자동으로 따라다니며 **골드·재료·룬·주얼을 대신 줍는다** [위키] |
| **Mercenaries** | 캐릭터당 1기, **Magic Find 스탯을 준다** [위키] |
| **전문직 2종** | **Mining**(난이도가 오를수록 어려운 광맥) · **Jewelcrafting** [위키] |

> **배울 지점 둘**:
> 1. **Companion 이 "줍기"를 자동화하고 Mercenary 가 "MF"를 담당**한다 — 동료 시스템을 전투력이 아니라 **파밍 편의**에 배치한 것. 본작의 파견처·동료 설계와 직접 대조된다
> 2. 시장 수수료가 **등록 1% / 수령 10%** 로 비대칭이다 — 등록은 싸게 열어두고 **실제 성사에서 골드를 태운다.** 인플레 억제를 거래 성사 시점에 몰아넣은 구조

---

## 8. 콘텐츠 루프 — 엔드게임 장치

| 장치 | 내용 [위키] |
|---|---|
| **Wormholes** | 유니크 존 내부의 층 진행. **"얼마나 높이 올라가느냐에 따라 시즌 보상"** — 층 푸시 + 시즌 코스메틱 |
| **Challenge Dungeon** | **Glyph** 를 얻고 **Glyph Essence** 로 강화한다. `Essence of Incarnation Gain` 을 **+75% ~ +900%** 까지 준다 |
| **Chaos Tower** · **Chaos Pillars** | 유니크 존과 그 안의 도전 구조물. 시즌 10에서 대폭 상향 [패치노트] |
| **Satanic Zones** | 고난도 전용 파밍 구역 |
| **Unholy Siege** | 존에서 발생하는 동적 이벤트 |
| **Dungeons** | 월드 전역에 다수, **Challenge Mode** 선택 가능 |
| **Boss Dungeons / Uber Boss** | 난이도별 드롭률 계단(§5-1). 시즌 10 신규 우버 보스 3종: **Phantom Leviathan · Captain Grimtide · Blood Maiden** [패치노트] |
| **Abyssal Chest** | 시즌 10 신설 — **레버를 당길수록 위험·보상이 커지는** 상자 [패치노트] |
| **Monster Types** | "몬스터는 여러 타입으로 스폰되며 풀에서 서로 다른 수식어를 물려받는다" |
| **Shrines** · **Chests** | 일시 버프 / 등급별 전리품 상자 |
| **Target Farming** | **저널이 특정 아이템의 드롭 위치를 알려준다** |
| **Loot Filter** | 방어구 타입·무기·소켓·티어 기준의 표시 필터 |

> **`Target Farming` + `Loot Filter` 가 이 게임의 통제성 장치다.** 드롭이 1000종을 넘는 게임에서 **"어디서 나오는지 알려주는 저널"**과 **"안 볼 것을 지우는 필터"**를 둘 다 공식 기능으로 넣었다. `idleguildmaster/02_items.md` 가 기록한 "레시피→재료→몬스터 3층 지목"과 같은 문제를 **다른 방식(정보 공개)으로 푼 사례**다.

---

## 9. 라이브서비스 운영

### 9-1. 시즌 이력 — 2.0 이후 10회 [트래커][패치노트]

| 시즌 | 시작 | 종료 | 길이 |
|---|---|---|---|
| 1 | 2023-10-02 | 2024-01-12 | 3개월 10일 |
| 2 | 2024-01-12 | 2024-03-22 | 2개월 9일 |
| 3 | 2024-03-22 | 2024-06-07 | 2개월 16일 |
| 4 | 2024-06-07 | 2024-08-16 | 2개월 9일 |
| 4.5 | 2024-08-16 | 2024-12-13 | 3개월 27일 |
| 5 | 2024-12-13 | 2025-03-14 | 2개월 30일 |
| 6 | 2025-03-14 | 2025-06-06 | 2개월 23일 |
| 7 | 2025-06-06 | 2025-09-12 | 3개월 6일 |
| 8 | 2025-09-12 | 2026-04-03 | **6개월 20일** |
| 9 | 2026-04-03 | 2026-08-21 | 4개월 18일 |
| **10 `Ebontharn`** | **2026-08-21** | 진행 중 | — |

- **초기 2~3개월 주기가 시즌 8부터 4~6개월로 늘어졌다** — 소규모 스튜디오의 시즌 운영이 실제로 어떻게 벌어지는지 보여주는 곡선
- 시즌 10 출시 직후 **서버 용량 문제로 긴급 점검·플레이어 이전**이 있었다 [패치노트]
- 패치 속도: 시즌 10 출시(8-21) 후 2주 만에 **7.0.2 → 7.0.9** [패치노트]

### 9-2. DLC 정책 — **유료 콘텐츠를 기본 게임으로 흡수하는 방향**

| 시점 | 내용 |
|---|---|
| 상시 | 유료 DLC: **클래스**(Bard · Prophet · Butcher · Stormweaver) + **스킨**(Ghastly Jötunn · Dark Thorn · Templar Knights · Neko Bard · Neko Maid Marksman) + 번들(Gates of Valhalla Collector's Edition · Ebontharn Bundle) [상점] |
| **시즌 10** | **`Marauder, Plague Doctor, Shield Lancer and Jötunn are now free`** — 유료 클래스 4종 무료화 [패치노트] |
| **시즌 10** | **Act 9(Ebontharn) 무료 · 기본 게임 포함**, **Act 8도 무료화**하여 정상 캠페인 진행에 편입 [패치노트] |

> **읽어야 할 것**: 12년 된 라이브서비스가 **유료로 팔던 콘텐츠(클래스·액트)를 기본 게임으로 흡수**하는 방향으로 간다. "P2W 절대 없음" 슬로건을 유지하면서 수익을 내려면 **판매 대상이 스킨으로 좁혀지고 성능은 무료로 풀린다**는 결말.

### 9-3. 플랫폼

Steam(PC, 2014-01-29, ₩8,900) · PlayStation · Android(`Hero Siege: Pocket Edition`) [상점]. **온라인 co-op + 로컬/화면분할 co-op** 지원 [상점].

---

## 10. Hero Siege가 반복하는 설계 원리 8가지

1. **캠페인은 통로, 레벨 100이 시작점** — 서사 진행과 파밍 진행을 시간축에서 완전히 분리했다
2. **난이도 = 드롭 배율** — 파밍 효율을 올리는 정공법을 "더 어려운 곳에 가는 것" 하나로 못 박았다(§5)
3. **확률의 끝에 결정론을 둔다** — Uber Boss 드롭률이 Hell 5에서 100%가 된다
4. **적의 강함은 생명으로, 위험은 아니게** — 생명 22.5배 / 피해 1.55배(§5-2)
5. **능력치는 전부 1차 계수** — 접사가 수백 종이어도 계산이 안 무너진다. 수확 체감은 개별 스탯에 국소적으로만(§2-2)
6. **성장을 트리 위에 쌓는다** — 시즌마다 노드를 얹어 2,200+까지 왔다. 콘텐츠 공급이 쉬운 대신 **읽을 수 없는 크기**가 됐다(§3)
7. **파밍 정보를 숨기지 않는다** — Target Farming 저널 + Loot Filter 를 공식 기능으로(§8)
8. **경제는 격리 가능한 옵션이다** — Odyssey 가 거래를 통째로 끈다(§6-1)

---

## 11. 본작 대조 — 무엇을 빌리고 무엇을 버리는가

### 11-1. 근본적으로 다른 것 — **버린다**

| 축 | Hero Siege | 본작 |
|---|---|---|
| 조작 | **실시간 수동 조작**(트윈스틱 계보) | **자동전투 + 관전** |
| 유닛 | **영웅 1인** | **로스터 + 파티 편성** |
| 오프라인 | **없다** (오프라인 = 로컬 저장일 뿐, 켜야 진행) | **오프라인이 비전투 활동을 전담**(컨셉 락) |
| 병렬 | 없다 (캐릭터 1개씩 굴린다) | **파견·탐험·위임형 의뢰가 병렬 전담**(따름정리 3) |

→ **Hero Siege 는 방치형 표본이 아니다.** `lootun` · `dungeonvillage2` · `melvoridle` · `idleguildmaster` 가 담당하는 자리에 이 게임을 끼워 넣으면 안 된다. **이 표본의 값어치는 「파밍의 세로축을 12년간 어떻게 늘려 왔는가」 하나**다.

### 11-2. 빌릴 만한 것 — 7가지

1. **난이도 계단에 Magic Find 를 못 박는 방식**(§5-1) → 본작 `stage.csv` · `round_budget.csv` 의 층 보상 스케일링 대조군. "층이 깊으면 좋은 게 나온다"를 **표로 명시**하면 통제성이 생긴다
2. **확률 구간의 끝을 100%로 닫는 것**(§5-2-3) → 본작 드롭 설계에 "파밍의 끝"을 만드는 가장 단순한 장치
3. **적 강화를 생명에 몰고 피해는 거의 안 올리는 배분**(§5-2-1) → 본작은 자동전투라 **플레이어가 죽음을 피할 수 없다.** Hero Siege 보다 더 강하게 이 원칙을 지켜야 한다 — 피해를 올리면 그건 이중 처벌이다
4. **Target Farming 저널 + Loot Filter**(§8) → 본작 도감(`codex_level.csv`)·루팅 리포트 UI 에 **"이건 어디서 나오나"를 게임 안에서 답하는** 선례
5. **Companion = 줍기 자동화 / Mercenary = MF**(§7) → 동료를 전투력이 아니라 **파밍 편의**에 배치하는 축. 본작 파견처와 겹치지 않으면서 접속 중 편의를 늘리는 자리
6. **시장 수수료 비대칭(등록 1% / 수령 10%)**(§7) → 본작에 거래가 생긴다면(현재 미확정) 인플레 억제 지점의 참고
7. **⭐ Ether 트리 = 「파워 트리가 아닌 메커니즘 트리」**(§3) → **이 조사에서 나온 가장 새로운 범주다.** 지금까지 조사한 참고작(Lootun · Dragon Cliff · D2)의 성장 축은 전부 "더 세진다"로 수렴하는데, Ether 트리는 명시적으로 **"세지는 게 아니라 파밍 활동의 효율(드롭률·소요 시간·화폐)만 올린다"**는 별도 카테고리다. 본작은 **전투(원정)와 비전투(파견·탐험)가 시간축으로 갈려 있으므로**(컨셉 락) 성장 축도 그 선을 따라 가를 수 있다 — 「전투력 트리」와 「파견·탐험이 잘 도는 트리」를 분리하면, **관전이 본편인 본작에서 두 종류의 투자를 화면에서도 안 헷갈리게** 된다. 상세는 [01_skills.md §10-4](01_skills.md#10-본작-시사점)

### 11-3. 경고로 읽어야 할 것 — 2가지

1. **노드 인플레이션**(§3) — 시즌마다 트리에 노드를 얹으면 2,200개가 된다. 본작 `skill_design.md` 가 마스터리·전직 포인트 키를 아직 발행하지 않은 지금이 **상한을 먼저 정할 시점**이다. Hero Siege 는 그걸 안 정한 결과물이다
2. **유료 클래스의 수명**(§9-2) — 클래스를 팔면 결국 무료화로 회수하게 된다. 본작이 언젠가 수익화를 논한다면 **성능이 붙은 것을 팔지 않는다**는 이 게임의 결론이 12년치 실험 결과다

---

## 12. 출처 · 미확인(N/F) · 오염

### 12-1. 주요 출처

| 종류 | URL |
|---|---|
| 공식 위키 | `https://herosiege.wiki.gg/` — `Getting_Started` · `World` · `Mechanics` · `Features` · `Difficulty` · `Classes` · `Marketplace` · `Unique_Zones` · `Hero_Siege` · `Challenge_Dungeon` |
| Steam 상점 | `https://store.steampowered.com/app/269210/Hero_Siege/` |
| Steam 공지 | `https://steamcommunity.com/app/269210/announcements/` · `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=269210` |
| 공식 사이트 | `https://playherosiege.com/en` · `https://www.panicartstudios.com/` |
| 시즌 트래커 | `https://hero-siege-helper.vercel.app/seasons` |
| 커뮤니티 | Steam 토론 게시판 — 2.0 이전/이후 비교 · 온라인/오프라인 분리 |

### 12-2. 미확인 (N/F)

| 항목 | 상태 |
|---|---|
| **시즌 10 현행 난이도 티어의 정확한 이름·개수·배율표** | [위키] 미갱신이고 [3자] 서술이 서로 모순(§5-3). `Inferno` 가 최상단이라는 것만 확정 |
| **Act 9 Ebontharn 의 존 명단** | [위키] 미반영 |
| **유니크 존 18종 각각의 입장 조건·보상** | [위키] 목록 페이지에 없음 — 개별 페이지 필요 |
| **정확한 클래스 수(22/23/24)와 DLC/무료 구분** | 출처가 어긋남(§2-1) — [01_skills.md](01_skills.md)에서 판정 |
| **Incarnation·Ether 트리의 총 노드 수** | [위키] 페이지 부재(404). 시즌 10 증분(600+/100+)만 [패치노트]로 확정 |
| **Wormhole 의 층 구조·보상 테이블** | 정성 서술만 확보 |
| **Mining·Jewelcrafting 전문직의 실제 단계·산출** | 존재만 확인 |
| **시즌 종료 후 비시즌 전환의 구체 규칙**(아이템·재화 포함 여부) | 미확인 |
| **동시 접속 인원 상한** | 통상 "최대 4인 co-op" 으로 알려져 있으나 [상점] 페이지에 숫자 명시 없음 |
| **레벨 100 상한의 공식 근거** | [커뮤니티]·[3자] 만 확인, [위키] 명시 문장 미확보. 게다가 **다른 [커뮤니티] 스레드는 250이라 말한다**(§2-3) — 어느 쪽도 1차 출처로 확정 못함 |

### 12-3. 오염 판정 (§0-4 요약)

- **공식 위키는 `herosiege.wiki.gg` 단 하나.** `herosiegewiki.com` · `hero-siege.wiki` · `herosiegeguide.wiki` 는 공식이 아니며, 검색 엔진 요약이 이들을 "공식 위키"로 잘못 안내하는 사례를 직접 확인했다
- 시즌 10 난이도 개편을 다룬 [3자] 가이드(`afleurdenet.com` · `ggwtb.com` · `tposegaming.com` · `xmodhub.com` · `herosiegebuilds.com` · `ezg.com` · `vortexgaming.io`)는 **서로 모순되는 진행 경로**를 서술한다 → 단독 근거로 채택하지 않음
- `herosiege.fandom.com` 은 wiki.gg 이전 전의 **구 위키** — pre-2.0 자료로만 취급

---

*마지막 업데이트: 2026-09-03 (짝 문서 [01_skills.md](01_skills.md)·[02_items.md](02_items.md) 완료분과 대조해 클래스 수 24 확정 · 능력치 배분 5종으로 정정 · 성장 4층 → **5층**(서브스킬 신설) · 레벨 상한 100/250 출처 충돌 명기 · Ether 트리 「메커니즘 트리」를 §11-2 에 7번째 시사점으로 추가) · 2026-09-03 (신규 작성 — Hero Siege 전수 조사 개요. 대상 확정(후속작 없음 · 2.0 분단선) · 게임 구조 한 장 · 능력치 6종 · 성장 4층 · 월드 액트 9 + 유니크 존 18 · 난이도 = Magic Find 계단 · 게임모드 4축 · 경제 · 엔드게임 장치 · 시즌 10회 이력 · DLC 무료화 정책 · 설계 원리 8 · 본작 대조 · N/F 총괄)*
