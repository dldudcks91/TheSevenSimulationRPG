# Melvor Idle — 진행 흐름과 목표 구조

> 상태: **조사 완료** (2026-09-30)
> 목적: 플레이어가 시기마다 실제로 무엇을 하고, 게임이 다음 목표를 어떻게 건네는지 — 시기별 진행 · 목표 장치(완료 기록 · 펫 · 도전과제 · 마을 과제 · 슬레이어 태스크) · 게임 모드 10종 · 막히는 지점 · 플레이 시간 · 엔드게임 · Golbin Raid · 「없는 것」 · 확장팩 3종을 사실로 정리한다
> 짝 문서: [00_overview.md](00_overview.md) §1(구조 한 장)·§2(오프라인 계산) · [01_skills.md](01_skills.md) §2(마스터리) · [04_construction_unlocks.md](04_construction_unlocks.md) §5-1(스킬케이프)·§5-2(펫)·§5-5(자동화 구매)·§7(던전 · 슬레이어 구역) · [03_township_buildings.md](03_township_buildings.md)
> ⚠ 이 문서의 수치는 전부 Melvor Idle 의 수치다

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 |
| 1 | 시기별로 플레이어가 하는 일 (첫 1시간 → 엔드게임) |
| 2 | 목표를 건네는 장치 한눈에 |
| 3 | 완료 기록 · 펫 · Steam 도전과제 · 마을 과제 · 슬레이어 태스크 상세 |
| 4 | 게임 모드 10종 |
| 5 | 막히는 지점 (커뮤니티가 「벽」이라 부르는 구간) |
| 6 | 전체 플레이 시간 |
| 7 | 엔드게임 — 본편의 마지막과 그 뒤 |
| 8 | Golbin Raid |
| 9 | 없는 것 (일일 · 출석 · 시즌 · 환생 · 멀티플레이) |
| 10 | 확장팩이 더한 것 |
| 11 | 출처 · 확인 못 한 것 |

---

## 0. 조사 방법과 신뢰도

**쓴 데이터** (`melvor_data/` 5개 파일 — 경로는 공통 지침 참조)
- `melvorDemo.json` · `melvorFull.json`: `gamemodes` · `tutorialStages` · `steamAchievements`(Full) · `pets` · `dungeons` · `strongholds` · `combatEvents`(Full) · `golbinRaid`(Demo) · `shopPurchases`(category `melvorD:GolbinRaid`) · `slayerTaskCategories` · `skillData`(Township `tasks` · `casualTasks`, 각 스킬 `pets`) · `items`/`monsters`(`ignoreCompletion` · `golbinRaidExclusive`)
- `melvorTotH` · `melvorExpansion2` · `melvorItA`: `skillLevelCapIncreases` · `gamemodes` · `dungeons` · `abyssDepths` · `realms` · `ancientRelics` · Township `tasks` · 확장 규모 집계

**연 위키 페이지 12건**(전부 HTTP 200, `r.jina.ai` 경유): `Completion_Log` · `Pets` · `Beginners_Guide` · `What_to_level_first` · `Guides` · `Dungeons` · `Impending_Darkness_Event` · `Golbin_Raid` · `Golbin_Raid/Guide` · `Into_the_Abyss_Expansion` · (`Game_Modes` 는 **404 — 페이지 없음**, `What_to_level_first_Guide` 는 스텁이라 안 씀)

**위키 각 페이지의 갱신 시점(페이지가 스스로 밝힌 것)**: Beginners Guide · Completion Log = v1.3 기준 · `Golbin_Raid` = 「1.3 기준, 최신 아닐 수 있음」 · `Golbin_Raid/Guide` = **1.0.1 기준** · `Dungeons` · `Impending_Darkness_Event` · `Into_the_Abyss_Expansion` = v1.3.1(최신). 위키가 옛 빌드일 때는 데이터를 우선하고 어긋남을 적었다.

**프록시 한계**: `Pets` 의 스킬 펫 확률 수식과 보스 펫 표는 프록시가 수식·표를 지워서 못 읽었다 → 수식은 WebSearch 스니펫으로 보강(§3-2), 보스 펫 확률은 `Dungeons` 표와 데이터 `pet.weight` 로 확보. `Golbin_Raid` 의 「How to Play」 절도 본문이 비어 왔다.

**커뮤니티 자료의 성격**: Steam 토론은 `steamcommunity.com/app/1267910/discussions` 스레드를 열어 요약본으로 읽었다(WebFetch 가 스레드를 요약해 돌려줌 — 원문 전체가 아니다). Reddit 원문은 직접 못 열었다(검색 결과에 미러만 보임). 커뮤니티 문장은 전부 「누가 · 언제」를 붙였고, **한두 사람의 말이므로 일반 합의로 읽지 않는다.**

---

## 1. 시기별로 플레이어가 하는 일

> 시간 표기는 출처가 준 것만 적는다. 「첫 1시간 / 며칠 / 중반 …」은 내용 표지(무엇이 열리는가)로 나눈 것이다 [해석].

### 1-1. 첫 1시간 — 튜토리얼과 첫 생산 사슬
**튜토리얼은 데이터에 22단계로 있다** [데이터 `tutorialStages`: Demo 10 + Full 12].

| 묶음 | 단계 | 시키는 일 | `skillUnlocks` | 보상 |
|---|---|---|---|---|
| Survival Task 1~4 | 0~3 | Normal Tree 3 · Normal Logs 3회 태우기 · Raw Shrimp 3 · Shrimp 3회 굽기 | Woodcutting → Firemaking → Fishing → Cooking | GP 10~15 |
| Combat Task 1~4 | 4~7 | Copper · Tin Ore 3 · Bronze Bar 3 + Bronze Dagger 1 · Dagger 장착 + Shrimp 3 장착 · **Plant 2마리** | Mining · Smithing · Attack/Strength/Defence/Hitpoints | GP 20 → 7단계 **2,500** |
| Wannabe Farmer 1~2 | 20~21 | Compost 5 구매 · Potato Seed 3 심기 | Farming | Potato Seed 3 · GP 2,750 / 150 |
| Ranged Preparation 1~8 | 8~15 | Arrow Shafts · Arrows 30 · Shortbow 제작 · 장착 · Chicken 2 | Fletching · Ranged | GP 25~250 |
| Magic Preparation 1~4 | 16~19 | Rune Essence 10 · Air/Mind Rune 5 · Magic Wand (Basic) 장착 · Golbin 1 | Runecrafting · Magic | Magic Wand · 룬 80 · GP 2,500 |

- 각 단계 필드: `tasks[].eventMatcher`(행동 종류) · `eventCount` · `skillUnlocks` · `allowCombat` · `allowedShopPurchases` · `bannedItemSales` · `rewards`. **`allowCombat` 은 0~5단계에서 false** — 전투를 만지기 전에 채집 → 제작 사슬(벌목 → 불 → 낚시 → 요리 → 채광 → 제련)을 먼저 밟게 한다 [데이터]. `hasTutorial` 은 Standard · Hardcore · Adventure 만 true(§4).
- 게임 자체의 첫 예시는 Fishing → Cooking: 새우 → 익힌 새우, 스킬 XP 5 와 아이템 마스터리 XP 1 이 같이 오른다 [위키/jina Beginners Guide].
- 위키 초보 가이드가 말하는 첫 1시간의 뼈대: Melvor Cloud 계정 만들기 권장(로그인하면 세이브 자동 백업) · 화면 왼쪽 메뉴에서 스킬 열기 · **오프라인 최대 24시간**, 전투는 「Enable Offline Combat?」 설정을 켜야 오프라인에 돈다 [위키/jina Beginners Guide]. (오프라인 계산은 [00_overview.md §2](00_overview.md))
- 초보 가이드는 「Woodcutting · Mining · Fishing 중 하나로 시작하는 게 보통, 셋 다 돈벌이 방법이 붙어 있다」고 쓴다 [위키/jina Beginners Guide 「Early Game Goal」].

**커뮤니티가 본 첫 시간의 걸림돌**
- Steam 스레드(글쓴이 Mel, 11월 28일 — 연도 미확인)에서 「12시간 켜 뒀는데 새우 1마리뿐, 언제부터 진짜 방치가 되느냐」는 글에, **Zyvvrict** 가 「은행에 새 아이템 자리가 없으면 멈춘다 → 은행 칸을 사고 팔아야 한다」, **Blackwolfe** 가 「전투는 오토루팅 목걸이가 있어야 방치가 된다」, **Holoman** 이 「전투 · 도둑질 · 던전 같은 것은 설정을 바꿔야 오프라인에 돈다」고 답했다 [Steam 3598968559031872630].
- 초보 가이드 블로그(commonsensegamer.com, 필자 Calin Ciabai)는 **튜토리얼이 끝나면 돈을 은행 칸에 먼저 쓰라**고 하고, 「처음 몇 시간~수 시간은 Mining 에 집중한다 — 좋은 무기를 빨리 얻는 유일한 길이라서」, 「처음 몇 시간은 싸우지 마라, Steel 급 장비가 생기면 싸운다」, 오프라인에는 「인벤토리가 안 차는 행동(Astrology · Agility)을 걸어 두라」고 쓴다. 팁의 적용 범위를 「첫 24~48시간」이라고 밝힌다 [Steam 밖 블로그 — 필자 1인 의견].

### 1-2. 첫 며칠 — 스킬 30 · 돈 모으기 · 방치 계획
| 새로 열리는 것 | 내용 | 출처 |
|---|---|---|
| Gem Gloves | 상점 500,000 GP, 2000 charges, 다 쓰고 보석을 팔면 약 762,000 → 순이익 262,000. 초보 가이드가 「초반 돈벌이의 정석」이라 부른다 | [위키/jina Beginners Guide] |
| Auto Eat | Tier I 100만 → II 500만 → III 2,000만 GP ([04 §5-5](04_construction_unlocks.md)). 방치 전투의 안전망 — 「오프라인 전투는 음식이 떨어지면 죽는다」 | [위키/jina What_to_level_first] |
| Farming | 「수동 조작 없이 백그라운드에서 자라는 스킬」. **초보 가이드가 「길게 걸리니 일찍 시작하라」고 권한다**. 씨앗은 Farmlands 의 Farmer 몬스터 · Bird Nest 에서 | [위키/jina Beginners Guide] |
| Township · Astrology · Agility · Summoning · Firemaking | 위키 「What to level first」가 이 다섯을 **「다른 스킬을 강하게 하는 스킬」**로 묶는다. 1단계로 「Township 메뉴에서 숭배 신을 고른다(Aeris 추천), 마을은 일단 무시」, 다음 「Astrology 를 40 까지」 | [위키/jina What_to_level_first] |
| 장비 등급 갈아타기 | 전투 레벨 20~25 에 **Mithril**(제작이 안 되면 Mithril Knight 에게서 드롭), 40~45 에 **Rune**(Adamant 는 건너뜀), Slayer 태스크로 Slayer 77 까지. 은/금 도금((S)→(G))은 Mining · Smithing 40 이 필요 | [위키/jina What_to_level_first — 「Combat Focus」 가이드] |
| 「모든 스킬을 30 까지」 | 위키 초보 가이드: 「일반적으로 모든 스킬을 30 정도까지 올려 게임이 어떻게 돌아가는지 감을 잡으라. 30 은 오래 안 걸리고 좋은 학습이다」 | [위키/jina Beginners Guide] |

- 위키 「What to level first」의 **「Laid Back」(하루 한두 번만 접속) 경로**는 24단계다: 신 선택 → Astrology 40 → 약간의 전투 → Farming 시작 → 전 스킬 30 → Crafting 10 → **Mining 50 → Smithing 57** → 제작품과 광석을 팔아 **1,000,000 GP 근처** → 씨앗 심기 → Fishing/Cooking(고기 잡는 방치로 Auto Eat 확보) → Agility → Cartography → Firemaking. 가이드 스스로 「이 부분들은 **며칠 · 몇 주** 걸린다」고 말한다 [위키/jina What_to_level_first].
- 같은 가이드는 접속 성격을 두 갈래로 나눈다: **Laid Back**(하루 한두 번) / **Combat Focus**(활동적으로 켜 두고 전투 위주). 「두 가이드를 나란히 따라갈 수 있다 — 접속 중엔 Combat Focus, 방치 중엔 Laid Back」 [위키/jina What_to_level_first].

### 1-3. 중반 — 던전 사슬 · 슬레이어 · 마을 · 「메타 스킬」
| 축 | 내용 | 출처 |
|---|---|---|
| 던전 순서 | 위키 `Guides` 는 「던전은 **권장 진행 순서**로 나열」한다: Chicken Coop → Undead Graveyard → Spider Forest → Frozen Cove → Golem Territory → Unholy Forest → Deep Sea Ship → Bandit Base → Hall of Wizards → Miolite Caves → Dragons Den → Trickery Temple → **Volcanic Cave** → Infernal Stronghold → Cult Grounds → Air · Water · Earth · Fire God → **Into the Mist** → Underwater City → **Impending Darkness** → (확장 던전 …) | [위키/jina Guides] |
| 던전 난이도 계단 | 데이터 `difficulty` 0~6 = Easy · Normal · Hard · Elite · Master · Legendary · Mythical. 보스 전투 레벨 39(Chicken Coop) → 71 → 177~229 → 677(Volcanic Cave) → 752~815(신 던전) → 925(Into the Mist) → 1,300(Impending Darkness) | [데이터 `dungeons.difficulty`] [위키/jina Dungeons — 보스 레벨 표기는 위키 값] |
| 슬레이어 | 태스크 5단계(Easy 1 · Normal 25 · Hard 50 · Elite 75 · Master 85 — Slayer 레벨). 굴림 비용 0 · 2,000 · 5,000 · 15,000 · 25,000 Slayer Coins. 구역은 Slayer 레벨로 열림([04 §7-3](04_construction_unlocks.md)) | [데이터 `slayerTaskCategories`] |
| 스트롱홀드 4종 | 조건 = Slayer 레벨 + **해당 던전 N회 클리어**: Undead(Slayer 10 + Undead Graveyard 25회) · Magic(45 + Hall of Wizards 50회) · Dragons(85 + Infernal Stronghold 100회) · Gods(95 + Into the Mist 5회). 각 3단계(Standard / Augmented / Superior) | [데이터 `strongholds`] |
| 마을 | 과제 110 + 캐주얼 170(§3-4). 위키 가이드는 **「Township 은 나중에 중요해진다」**고 하면서 초반엔 무시하라고 권한다 | [데이터] [위키/jina What_to_level_first] |
| 「메타 스킬」 99 | Steam 스레드 **mechaboy**(9월 15일, 연도 미확인): 「메타 스킬 Astrology · Herblore · Agility · Summoning 을 99 로」 | [Steam 3374907622942197389] |

- Steam 스레드(글쓴이 Imyo, 9월 13일 — 하드코어 블라인드 플레이)에서 **Xuhybrid** 가 「Volcanic Cave 나 신 던전 전까지는 전투 걱정을 안 해도 된다」고 답했다 [Steam 3374907622942197389]. **한 사람의 말**이며, 같은 스레드에서 글쓴이는 「며칠 만에 전투 스탯 60」이라며 느리다고 했다.
- 개발자(Malcs, 2021-04-19)는 Volcanic Cave 에 막힌 유저에게 「Defence Milestones 를 보라, Dragon 보다 좋은 장비는 나중 던전에 있다」고 답했다 [Steam 5350815203295856313].
- **2023-09 마을 논쟁**: Steam 스레드(글쓴이 CandL, 2023-09-09)에서 **vladulenta** 는 「Township 이 5~7개 스킬을 무력화했다 — 자원을 쌓아 두는 방식이었으므로. 개발자가 이틀 안에 과제 요구를 95 → 85 로 조정했다」, **Valk** 는 「지금 구현은 중반 유저의 진행을 어렵게 한다」고 했다 [Steam 3823048293516778888]. 한두 사람 주장이며 게임 내 변경 내역은 못 확인했다.

### 1-4. 후반 — 신 던전 · Into the Mist · Impending Darkness
- **신 던전 4개**는 사슬이다: Air(Volcanic Cave 클리어 필요) → Water → Earth → Fire [데이터 `dungeons.entryRequirements`]. 몬스터마다 Elemental Shards 를 준다 [위키/jina Dungeons]. 신 던전마다 클리어 뒤 스킬 간격 −15% 상점 업그레이드를 하나씩 살 수 있다([04 §5-5](04_construction_unlocks.md)).
- **Into the Mist**: Slayer 90 + Fire God 클리어. 몬스터 23, 「전투 스타일이 맞아야 죽는」 보스. 펫 Pablo 는 **5회 클리어 시 확정**(`pet.weight` 5, `fixedPetClears` true) [데이터] [위키/jina Impending_Darkness_Event 서술].
- 이 시기의 목표: **스킬 99**(Skillcape 은 스킬마다 1,000,000 GP [데이터 `shopPurchases`] — [04 §5-1](04_construction_unlocks.md) 의 10,000,000 은 ToTH 의 Superior Skillcape 값이다) · **아이템 · 마스터리 수집**(완료 기록) · 스트롱홀드 Superior 단계.
- 본편 100% → **Cape of Completion**(200,000,000 GP, [04 §5-1](04_construction_unlocks.md)). 그 뒤는 §7 참조.

---

## 2. 목표를 건네는 장치 한눈에

| 장치 | 세는 것 | **플레이어에게 시키는 일 (한 줄)** | 상세 |
|---|---|---|---|
| 튜토리얼 | 22단계 · 행동 카운트 | 스킬 하나씩 열어 가며 「N 번 해 봐」로 첫 사슬을 손에 익히게 한다 | §1-1 |
| 마스터리 | 스킬 액션마다 1~99 | 액션 하나하나를 반복해 개별 마스터리를 올리게 한다(풀 체크포인트 보너스) | [01 §2](01_skills.md) |
| **완료 기록(Completion Log)** | 스킬 · 마스터리 · 아이템 · 몬스터 · 펫 5분류 | **「전부 한 번씩 보라」** — 안 얻어 본 아이템 · 안 잡아 본 몬스터 · 못 받은 펫을 채운다 | §3-1 |
| **펫** | 스킬 펫 · 보스 펫 · 상점 펫 · 기타 | 스킬은 오래 돌려 굴리고, 던전은 반복 클리어로 굴린다 — **시간을 쓰게 만든다** | §3-2 |
| **Steam 도전과제** | 92개 | 99 · 보스 첫 킬 · 특정 아이템 · 100% 를 외부 목표로 걸어 준다 | §3-3 |
| 마을 과제 | 110 + 캐주얼 170 | 아이템 · 몬스터 처치를 마을에 「납품」한다 (완료 기록 제외) | §3-4 |
| 슬레이어 태스크 | 5단계 | 지정 몬스터를 N 마리 잡고 Slayer Coins 를 받아 상점 장비를 산다 | §3-5 |
| 던전 사슬 | `entryRequirements` | 이전 던전 클리어 · Slayer 레벨 · 단서 아이템으로 **다음 던전을 열어 준다** | §1-3 · [04 §7-2](04_construction_unlocks.md) |
| 게임 모드 | 10종 | 같은 콘텐츠를 다른 규칙(영구 사망 · 스킬 잠금 · 유물)으로 **다시 돌게 한다** | §4 |
| Golbin Raid | Raid Coins | 본편과 분리된 웨이브 미니게임 — 별도 화폐로 별도 상점 | §8 |

---

## 3. 장치 상세

### 3-1. 완료 기록 — 무엇을 세고 100% 는 무엇인가
**5분류** [위키/jina Completion_Log, v1.3]

| 분류 | 세는 조건 |
|---|---|
| Skills | 확장팩 범위의 스킬이 각자 그 범위의 **최대 레벨**에 도달(가상 레벨은 장식일 뿐) |
| Mastery | **모든 스킬 액션의 마스터리가 99** |
| Items | 모든 아이템을 **한 번 이상 획득** |
| Monsters | 모든 몬스터를 **한 번 이상 처치**(등장하는 모든 장소에서 잡을 필요는 없다 — 그 몬스터의 드롭 아이템을 다 얻으면 됨) |
| Pets | 모든 펫 획득 |

**제외 항목**: Township 과제 · **이벤트 한정 아이템** · Completion Cape 자체 · Corruptions · Spells. **Golbin Raid 전용 아이템 38종**은 아이템 완료에 안 든다 [위키/jina]. 데이터도 같은 그림이다: `items` 1,406개(Demo 671 + Full 735) 중 `ignoreCompletion` = **125**(38 골빈 전용 포함, 태운 음식 · 레몬 · 이벤트 아이템 · 생일 케이크 · 산타 모자 등), 세는 것은 **1,281**. 몬스터 172 중 `ignoreCompletion` 11, 펫 62 중 6(Golbin Raid 상점 펫 2 · 이벤트 펫 · Saki 등) [데이터/계산 — `ignoreCompletion` true 를 뺀 개수. 위키가 문서화한 제외 목록과 완전히 같은지는 확인 못함].

**본편 「100%」의 크기** [데이터/계산]
- 스킬 23종(전투 8 + 비전투 15)이 99
- 아이템 1,281 · 몬스터 약 161(172 − 11) · 펫 56(62 − 6)
- 마스터리 액션: `skillData` 의 액션 배열 합이 약 556(Woodcutting 9 · Fishing 23 · Firemaking 9 · Cooking 32 · Mining 11 · Smithing 115 · Farming 24 · Summoning 20 · Thieving 23 · Fletching 57 · Crafting 57 · Runecrafting 84 · Herblore 30 · Agility 장애물 51 · Astrology 11) — **마스터리 대상이 정확히 이 배열들인지는 확인 못한 어림값**

**Cape of Completion — 확장팩마다 따로** [위키/jina Completion_Log]
- 확장팩 하나마다 Cape of Completion 이 있고, **그 확장 범위가 100% 일 때만** 살 수 있다 · 입을 수 있다. Steam 업적 「The Completionist」의 데이터 요구는 `{"type": "Completion", "percent": 100, "namespace": "melvorBaseGame"}` — 즉 **본편 네임스페이스 기준 100%** [데이터].
- **목표가 움직인다**: 업데이트가 완료에 필요한 콘텐츠를 더하면 이미 산 Cape 가 **벗겨지고 다시 못 입는다**. v1.3 이 본편에 Strongholds 를 넣고 Merman Pendant 드롭을 둘로 쪼갰을 때, 100% 였던 유저가 새 아이템 · 펫을 얻어야 했다. v1.3 처럼 보통은 첫 로드에 **무료 사망 1회**를 줘서, Cape 가 벗겨져 죽어도 아이템 · 하드코어 캐릭터를 잃지 않게 한다 [위키/jina]. 위키 서두: 「많은 유저가 디스코드 닉네임 끝에 자기 완료율을 적는다」.
- 가격 · 효과는 [04 §5-1](04_construction_unlocks.md).

### 3-2. 펫 — 획득 방식과 확률 구조
**규모** [데이터 `pets`]: 본편 62(Demo 26 + Full 36) · ToTH 15 · AoD 9 · ItA 15 = **101**. 효과는 얻는 즉시 **영구 · 끌 수 없음 · 전부 동시 적용**, 은행에 안 들어간다 [위키/jina Pets].

**획득 방식 4갈래** (본편 62 분류 — 데이터의 참조 관계로 갈랐다) [데이터/계산]

| 갈래 | 개수(본편) | 획득 방식 | 확률 구조 |
|---|---|---|---|
| **스킬 펫** | 25 | 해당 스킬의 **액션 1회마다 굴림**. 스킬 데이터의 `pets` 에 매핑(같은 펫 Ty 가 15개 스킬에 걸려 있음) | 아래 수식 |
| **보스 펫** | 21 | **던전 클리어마다 굴림** | 던전별 고정 — `pet.weight` |
| **상점 펫** | 8 | Township 상점 6(건물 랭크) + Golbin Raid 상점 2 | 구매([04 §5-2](04_construction_unlocks.md)) |
| 기타 | 8 | Golden Golbin(골빈 42,069 킬) · 이벤트 펫 등 | 획득 경로가 데이터 필드에 없다 |

**스킬 펫 수식** [위키/검색합성 — 프록시가 수식을 지워서 검색 스니펫으로 확보]: **액션당 확률 = (액션 시간(초) × (가상 스킬 레벨 + 1)) / 25,000,000.** 위키 본문의 예(레벨 99 Crafting, 액션 1.9초 → Caaarrrlll 획득 확률)와 맞물린다: 1.9 × 100 / 25,000,000 = 0.00076% [계산]. 이 식에서 **액션 길이는 총 시간에 영향이 없다** — 위키 본문이 「액션이 얼마나 걸리든 총 획득 시간은 같다, 긴 액션은 확률이 비례해서 높기 때문」이라고 쓴 것과 일치 [위키/jina Pets]. 기대 시간은 25,000,000 / (레벨+1) 초 → **레벨 99 에서 250,000초 ≈ 69.4시간** [계산 — 수식 자체는 검색합성].
- 전투 스킬의 「액션」= **1 이상 데미지를 입힌 히트**. Prayer 는 다중 타격 중 **첫 타만**, Slayer 는 **현재 태스크 대상에게 성공한 히트**, Corruption 은 부패된 적에 대한 성공 히트 [위키/jina Pets].
- Ancient Relics 모드에서만 펫 확률을 높이는 modifier 가 있다 [위키/jina Pets].

**보스 펫 확률** [데이터 `dungeons.pet.weight` · 위키 `Dungeons` 표]: 가중치는 **1/weight** 로 읽힌다.

| weight | 던전 | 확률 |
|---|---|---|
| 350 | Chicken Coop · Undead Graveyard · Bandit Base · Hall of Wizards · Spider Forest · Miolite Caves · Deep Sea Ship · Frozen Cove · Dragons Den | 1/350 (0.29%) |
| 200 | Volcanic Cave · Infernal Stronghold | 1/200 (0.50%) |
| 150 | 신 던전 4 · Golem Territory · Unholy Forest · Trickery Temple · Cult Grounds · Underwater City · (ToTH 던전 대부분) | 1/150 (0.67%) |
| 250 | 스트롱홀드 4종(Undead · Magic · Dragon · God) | 1/250 |
| 5 + `fixedPetClears` | Into the Mist | **5회 클리어 시 확정** |
| 1 | Impending Darkness Event | **1회 클리어 시 확정** |
| 확정 | Throne of the Herald(Harold) | 1회 클리어 시 확정 [위키/jina Dungeons] |

- **본편 마지막 던전(Impending Darkness) 펫 Bone 은 modifier 가 없다**(`modifiers: {}`) — 순수 트로피 [데이터]. Volcanic Cave 펫 Mac 은 `modifiers` 자체가 null.
- 펫 효과 예: Ty(마스터리 XP +3) · Pablo · God Stronghold 펫(모든 몬스터에 주는 데미지 +2%) · Golden Golbin(전투 전리품 2배 확률 +1%) [데이터]. **Harold**(Throne of the Herald 확정)는 데이터상 마스터리 풀 상한 50 · 스킬 간격 −2 · 공격 간격 −100ms · 마스터리 XP +5 · GP/Slayer Coins +5 등 modifier 키 15개를 준다 [데이터]. 위키 가이드는 같은 펫을 「마스터리 풀 상한 +25%, 전 간격 −2%, 공격 간격 −0.1s, 마스터리 XP +5%」로 소개한다 — **풀 상한 수치가 데이터(50)와 가이드(25%)가 다르다** [위키/jina What_to_level_first].
- **Golden Golbin**: 골빈 42,069 킬이 필요. Steam 스레드(글쓴이 vatszero, 2023-06-12)에서 **Truth_X_ile** 가 「Golbin Raid 킬도 이 카운트에 들어간다 — 테스트상 한 번 런에 약 574 웨이브면 42,069 킬」이라고 답했다 [Steam 3810655055446842823 — 한 사람의 실측 주장].

### 3-3. Steam 도전과제 — `steamAchievements` 92개
데이터의 각 항목은 `id` · `requirements[]` · (선택) `requiredGamemodeID` 뿐이다 — **이름 · 설명은 데이터에 없다**(로컬라이즈 파일). 이름은 Steam 통계 페이지(2026-09-30 조회, 86행)에서 가져왔다.

**종류 분류** [데이터 — `requirements[0].type`]

| 종류 | 일반(Standard 등) | Hardcore 한정(`requiredGamemodeID` = `melvorF:Hardcore`) | 예 (Steam 이름) |
|---|---|---|---|
| 스킬 99 (`SkillLevel` 99) | 21 (전투 8 + 비전투 13) | 8 (전투만) | Mining Master · Attack Master (Hardcore) |
| 전 스킬 99 (`AllSkillLevels`) | 1 | 1 | Skill Master — 「Maximum Skill Level in Standard Mode」 |
| **보스 첫 처치** (`MonsterKilled`) | 14 | 14 | Big Chick(Mumma Chicken) · Who?(Malcs) · The Fire God(Ragnar) |
| 아이템 발견 (`ItemFound`) | 13 | 0 | Time to Idle(Amulet of Looting) · This thing is HOT(Fire Cape) · Ummm…(Lemon) · 8 |
| 완료 100% (`Completion`) | 1 | 1 | The Completionist |
| 데이터에 요구가 없음(엔진 하드코딩) | 12 | 6 | The Beginning · This Feels Nice · My Little Companion · 은행 칸 100 · 200 · Mastery/Monster/Pet/Item Master · 「Plant 에게 죽기」 |
| **합계** | **62** | **30** | **92** |

- **보스 첫 처치 14개는 Chicken Coop · Undead Graveyard · Bandit Base · Hall of Wizards · Spider Forest · Deep Sea Ship · Frozen Cove · Dragons Den · Volcanic Cave(Prat · Malcs) · 신 던전 4개** — **Into the Mist · Impending Darkness · 스트롱홀드 · 확장팩 던전은 도전과제에 없다** [데이터 — `MonsterKilled` 대상 전수].
- Steam 스레드(글쓴이 Alxndr) 답변에서 **Dolly**: 「하드코어에서는 Fire God 만 잡으면 된다, 하드코어로 본편 100% 를 할 필요는 없다」 · **VectorX**: 「전투 스킬 99 를 찍고 메인 던전을 깨면 된다」 · 둘 다 「모든 업적은 DLC 없이 본편으로 가능」 [Steam 677328983116796848]. 데이터와 부합한다.

**달성률 — 「어디서 사람들이 떨어지는가」** [Steam 글로벌 통계, 2026-09-30 조회 — 모수는 게임 소유자이므로 **켜 본 적 없는 계정도 분모**에 든다]

| 단계 | 업적 | 달성률 |
|---|---|---|
| 시작 | The Beginning(캐릭터 생성) | 98.2% |
| 마스터리 99 하나 | A Touch of Mastery | 52.8% |
| 스킬 99 하나 | One down... More to go | 46.2% |
| 첫 보스 | Big Chick(Mumma Chicken) | 42.2% |
| Volcanic Cave | Who?(Malcs) | 20.1% |
| **Fire God** | The Fire God | **13.1%** |
| 전 스킬 99 | Skill Master | 11.1% |
| Item / Monster / Pet / Mastery Master | 100% 분류 하나씩 | 2.5% · 3.4% · 3.1% · 3.6% |
| **The Completionist(100%)** | | **2.3%** |

[해석] **Volcanic Cave(42.2% → 20.1%)에서 절반이 빠지고, 신 던전 사슬을 지나 100% 까지 5배 가까이 더 깎인다.** 첫 스킬 99(46.2%)와 첫 보스(42.2%)가 거의 붙어 있다.

### 3-4. 마을 과제(Township tasks)
[데이터 `skillData[Township].data`]

| 묶음 | 개수 | 구성 | 보상 |
|---|---|---|---|
| 본 과제(`tasks`) | 110 = Easy · Normal · Hard · VeryHard · Elite 각 22 | 목표 유형: **아이템 납품**(대부분) · 몬스터 처치 · 스킬 XP(Easy 에 1개) | GP · 아이템 (일부 아이템은 수십만 개 단위) |
| 캐주얼(`casualTasks`) | 170 | 아이템 121 · 몬스터+아이템 33 · 몬스터 16. **스킬 레벨 · 던전 클리어를 `requirements` 로 요구**(예: Fire God 클리어 + Hitpoints 90) | Township XP · 마을 자원 · GP 1 · (Slayer Coins) |
| 확장 | ToTH 20 · AoD 20 · ItA 74 | 확장 자원 납품 | 확장 화폐 |

- 위키 가이드는 캐주얼 과제 #138~#170 이 「특정 아이템을 한 번 얻어야 · 던전을 깨야 풀리고, 납품하려면 그 아이템이 필요하다」고 쓴다 [위키/jina What_to_level_first]. 「받으면 저장소가 금방 찬다」는 주의도 붙는다.
- 마을 과제는 **완료 기록에서 제외**된다(§3-1). 건물 · 자원 구조는 [03_township_buildings.md](03_township_buildings.md).

### 3-5. 슬레이어 태스크
[데이터 `slayerTaskCategories`] 본편 5단계: Easy(Slayer 1) · Normal(25) · Hard(50) · Elite(75) · Master(85). 굴림 비용 0 / 2,000 / 5,000 / 15,000 / 25,000 Slayer Coins, 몬스터 선택은 **전투 레벨 구간**(Easy = 1~49), `baseTaskLength`(Easy 10), 「이전 단계 태스크를 N 회 완료」로 다음 단계가 열린다(`reqText`). 완료 시 Slayer Coins 를 준다(`currencyRewards`) — 그 코인으로 **Slayer 장비**(상점, [04 §5](04_construction_unlocks.md))를 산다. ToTH 는 Legendary(102) · Mythical(110), ItA 는 Abyssal Slayer 7단계(`AbyssalSlayerCoins` 25만 ~ 1,500만).

---

## 4. 게임 모드 10종

**`gamemodes` 데이터 필드 표** [데이터 — `melvorDemo` 1 · `melvorFull` 6 · `melvorExpansion2` 3]

| id | 파일 | `isPermaDeath` | `isEvent` | `combatTriangle` | `hitpointMultiplier` | `hasRegen` | `capNonCombatSkillLevels` | `allowSkillUnlock` | `hasTutorial` | `startingPage` |
|---|---|---|---|---|---|---|---|---|---|---|
| Standard | Demo | false | false | Standard | 10 | true | false | false | true | Woodcutting |
| Hardcore | Full | **true** | false | Hardcore | 10 | **false** | false | false | true | Woodcutting |
| Adventure | Full | false | false | Hardcore | **100** | true | **true** | **true** | true | Combat |
| Chaos | Full | false | **true** | Hardcore | **10000** | true | false | false | false | Woodcutting |
| HardcoreAdventureSpeedrun | Full | **true** | true | Hardcore | 100 | false | true | true | false | Bank |
| InternalSuffering | Full | false | true | **InvertedHardcore** | 1000 | true | false | false | false | Woodcutting |
| HCCOSpeedrun | Full | **true** | true | Hardcore | 10 | false | false | false | false | Bank |
| AncientRelics | AoD | false | false | Hardcore | 10 | true | false | false | false | Bank |
| HardcoreAncientRelicsSpeedrun | AoD | **true** | true | Hardcore | 10 | false | false | false | false | Bank |
| HCCOARSpeedrun | AoD | **true** | true | Hardcore | 10 | false | false | false | false | Bank |

**모드별 규칙 — 데이터 `rules[]` · 특수 필드**

| 모드 | 규칙 (`rules[]` 문장 요약) | 특수 필드 |
|---|---|---|
| **Standard** | 「모든 스킬이 열려 있다」 · 표준 전투 modifier · **은행 칸 구매 제한 없음** | 시작 아이템 없음. 설명: 「Melvor 를 처음 하는 사람용」 |
| **Hardcore** | **은행 칸을 88개까지만 산다** · 전투에서 더 가혹한 페널티 · **패시브 HP 재생 없음**. 설명: 「캐릭터를 잃을 위험을 즐기는 사람용, 초보용 아님」 | `isPermaDeath` true(= 사망 시 캐릭터 삭제, Steam 「Lose your Hardcore Character by dying」 6.4%). Impending Darkness 는 **하드코어에게 안전한 죽음**([§7](#7-엔드게임--본편의-마지막과-그-뒤)) |
| **Adventure** | **스킬이 잠겨 있고 GP 로 사서 연다** · **비전투 스킬 레벨은 전투 레벨을 못 넘는다** · 시작은 근접 전투 스킬 + Bronze 무기 + 기본 음식 10 · 가혹한 페널티 · HP · 데미지 · 음식 회복이 Standard 의 10배 | `startingSkills` 4(Attack/Strength/Defence/Hitpoints) · `startingItems` Bronze Sword 1 + Shrimp 10 · **`skillUnlockCost` 19개 = 10,000 → 25,000 → 50,000 → 200,000 → 250,000 → 400,000 → 1M → 2.5M → 10M → 25M → 50M → 100M → 200M → 500M ×6** (4 + 19 = 본편 스킬 23종) · ItA 가 `abyssalLevelCapCost`(25,000 Abyssal Pieces 시작, ×1.2 배율, 상한 배율 40,000, 전투 스킬 6개 게이트, `baseGateLevel` 10) 추가 |
| **Chaos** | 아이템 Corruption 열림 · **공격 간격 · 스킬 간격 −25%** · 모든 적이 랜덤 패시브 1개 이상 · **죽으면 장착 아이템 전부 손실** · 큰 숫자 · **Golbin Raid 없음** · 「닭과 싸우지 마라」 | 이벤트 모드 — `endDate` 1618200000000 = **2021-04-12**. 「How fast can you beat the game?」 |
| **HardcoreAdventureSpeedrun** | **목표: 최종 보스를 가능한 한 빨리 죽여라** · HP +100% · 공격 간격 −80% · 스킬 간격 −80% · **마스터리 XP +800%** · 몬스터 리스폰 −2초 · HP 재생 없음 · Adventure 규칙 적용 | 이벤트 · 영구 사망 · `endDate` 1714532399000 = **2024-05-01** |
| **InternalSuffering** | 최종 보스 속도 경쟁 · **하드코어 전투 삼각형이 뒤집힘** · Firemaking · Farming 을 뺀 모든 스킬이 시작부터 열림 · **스킬 레벨 상한 10, 비전투 스킬을 영구 비활성화할 때마다 +10(최대 10개)** · 공격 · 스킬 간격 −80% · 마스터리 XP +800% · **최종 보스는 전투 스킬 전부 99 를 요구** | `startingSkills` 21 · `endDate` 17144459990(ms) = 1970-07-18 — **13자리가 아니라 자릿수 오타로 보인다** [해석] |
| **HCCOSpeedrun**(Hardcore Combat Only) | 최종 보스 속도 · **비전투 스킬 전부 영구 비활성** · 공격 간격 −80% · 리스폰 −2초 · Slayer 구역 효과 무효화 +10% · HP 재생 없음 | `startingSkills` 8(전투 6 + Slayer + Prayer) · `startDate` 1657553400000 = **2022-07-11**, `endDate` = 2024-05-01 |
| **AncientRelics** | **모든 스킬에서 Ancient Relic 을 찾아 고유 modifier 획득(스킬당 6개)** · **스킬 최대 레벨 10 에서 시작** · 던전을 깨면 **무작위 스킬의 최대 레벨을 올림(2택)** · 전투 레벨(Prayer · Slayer 제외)은 던전 클리어로 자동 상승 · **Fishing · Cooking 은 Impending Darkness 클리어까지 잠김** · 던전이 Food Crate 를 줌 · **보존 · 더블링 전부 비활성** · 가혹한 페널티 | `defaultInitialLevelCap` 10 · `levelCapIncreases` = `Pre99Dungeons`(21개 던전 클리어 세트) + `ImpendingDarknessSet100` · `disablePreservation` · `disableItemDoubling` · `allowAncientRelicDrops` · `allowXPOverLevelCap` false · `startingSkills` 24 · 시작 Shrimp 50 · 모든 보존 · 더블링 modifier = **−696969**(사실상 0 강제) · `ancientRelics` 156개(26 스킬 × 6) |
| **HardcoreAncientRelicsSpeedrun** | AncientRelics 규칙 + 최종 보스 속도(HP +100% · 공격 간격 −80% · 스킬 간격 −80% · 마스터리 XP +800% · 리스폰 −2초 · HP 재생 없음) | 이벤트 · 영구 사망 |
| **HCCOARSpeedrun** | 비전투 스킬 영구 비활성 + AncientRelics + 속도 규칙 · Slayer 구역 효과 무효화 +10% | `Pre99DungeonsCombatOnly` · `ImpendingDarknessSet100CombatOnly` |

- **영구 사망**(`isPermaDeath` true): Hardcore · HAS · HCCOS · HARS · HCCOARS = 5모드. **스킬 잠금**(`allowSkillUnlock` true): Adventure · HAS. **레벨 상한 10 + 던전으로 확장**: AncientRelics 계열 3모드. **이벤트 모드**(`isEvent` true): 6모드 — Chaos + 속도 경쟁 5개(HAS · InternalSuffering · HCCOS · HARS · HCCOARS). 「속도 경쟁」 5모드의 공통 목표는 규칙 문장에 그대로 **「최종 보스를 가능한 한 빨리」**다 [데이터].
- **커뮤니티의 모드 평가** (한두 사람): **Truth_X_ile**(Steam, 2022-01-01) 「Adventure 는 **사전 지식 없이는 진행이 굉장히 빨리 멈춘다** — 어느 스킬이 돈이 되는지 알아야 한다. 신규는 Standard 를 권한다」 · 같은 스레드의 부정 리뷰(15시간)는 Adventure 를 안내 없이 한 결과였다고 [Steam 3199243752768164004]. **RaptorSolutions**: 「가장 후회되는 건 시작 때 하드코어 캐릭터를 같이 안 만든 것」, **VectorX**: 하드코어에서 「돈 · 음식(낚시)을 모으고, 병행한 일반 캐릭터로 탐험」 [Steam 677328983116796848]. 위키 「What to level first」 가이드는 **Standard · Hardcore 용**이라고 밝힌다 [위키/jina].
- 데이터의 `gamemodes` 는 위 10개뿐이다(Demo 1 · Full 6 · AoD 3, ItA 는 `modifications.gamemodes` 로 Adventure · HAS 를 고치기만 함). **위키의 `Game_Modes` 페이지는 없다(404).**

---

## 5. 막히는 지점 — 커뮤니티가 「벽」이라 부르는 구간

> 각 항목은 **누가 · 어디서 · 언제**를 붙였다. 한두 사람의 말이며 합의가 아니다. 데이터 근거는 별도 열에 뒀다.

| 구간 | 이유 (그 사람들이 말한 것) | 누가 · 어디서 | 데이터 · 위키 근거 |
|---|---|---|---|
| **초반 은행 칸** | 은행에 자리가 없으면 방치 액션이 **멈춘다** → 첫 지출이 은행 칸 | Zyvvrict(Steam 스레드 「Mel」, 11월 28일) · commonsensegamer 블로그(필자 Calin Ciabai) 「튜토리얼이 끝나면 첫 지출은 은행 칸」 | [04 §4](04_construction_unlocks.md). Melvor 는 인벤토리 없이 은행이 소지품을 겸한다 |
| **Frozen Cove → Golem Territory** | 스레드 글쓴이가 Frozen Cove 이후 막혀 「장벽 보석을 갈아 방어구를 올려야 Golem Territory 를 하는지, Dragon's Den 인지」 묻는다. 답한 사람은 Golem Territory · Unholy Forest 를 Dragon's Den 보다 먼저 했다 | Major Pain(Steam, 2023-09-28) · 답글 most | Golem Territory = 아이템 **Ancient Stone Tablet 발견**이 조건. 위키 권장 순서는 Frozen Cove 다음이 Golem Territory([§1-3](#1-3-중반--던전-사슬--슬레이어--마을--메타-스킬)) [위키/jina Dungeons] |
| **Volcanic Cave** | 마지막 보스가 세게 때려 「T3 Auto Eat 로 안전하려면 일정 이상의 Damage Reduction 이 필요」 | Xuhybrid(Steam, 9월 15일) · Wolfstriker(2021-04-19 「Dragon 이상 방어구가 있나」) · 답: 개발자 Malcs, Huillam(DR 아이템 · 기도 버프로 가능) | 보스 전투 레벨 677, 진입 조건 없음 — 조건 없이 들어가지만 전투력이 벽. Infernal Stronghold 진입 조건에 Volcanic Cave 100회 클리어가 쓰인다 [데이터/위키] |
| **Into the Mist** | 「자가 치유 공격이 재미없다」 · 「버튼을 누르고 있어야 한다」 · 「던전이 자동화 · 캐주얼 태그와 어긋난다」 · 「최대 스탯 · 최고 장비로 첫 시도에 거의 죽었다」 | Unfortunate Flux(1,300시간 시점, 2022-07-12) · Huillam(08-05) · wyy · D3N(08-29) · **반론**: Jalir(「다섯 번 클리어, 방치 가능한 페이즈가 있다」), ꓕиᥕᥕи(「페이즈별 장비를 갖추면 꽤 쉽다」) | 몬스터 23 · 보스 레벨 925 · Slayer 90 + Fire God 필요 · 펫 Pablo 5회 클리어 확정 [데이터]. 보스가 「같은 전투 스타일로만 죽는」 구조는 위키 `Impending_Darkness_Event` 가 「Into the Mist 와 비슷하게」로 언급 |
| **Impending Darkness Event** | 위키가 「다른 곳에서 못 싸운다 · 실질 Slayer 95 필요 · 4개 슬레이어 구역을 5라운드」 | [위키/jina Impending_Darkness_Event] — 커뮤니티 글은 못 찾았다 | §7 |
| **중반 마을(Township)** | 「Township 이 5~7개 스킬을 무력화 → 이틀 만에 과제 95 → 85 조정 → 중반 유저의 진행이 어려워졌다」 | vladulenta · Valk · Semaphia(Steam, 2023-09-09~10) | [03_township_buildings.md](03_township_buildings.md) |
| **방치 자체의 한계** | 「초·후반 전투는 모드 없이는 완전 방치가 안 된다. 오프라인 24시간 제한 · 온라인 접속 필요」 | Ψ Kagora Ω(Steam, 2023-09-09) | 오프라인 24시간 · 전투는 설정 켜야 [위키/jina Beginners Guide] · Steam 상점 「인터넷 연결 필요」 [Steam] |

---

## 6. 전체 플레이 시간

**본편 100% 에 걸리는 시간에 커뮤니티가 합의한 값은 없다.** 확인한 것:

| 값 | 출처 | 신뢰도 |
|---|---|---|
| **1,670시간**(completionist) | HowLongToBeat — WebSearch 가 요약한 한 줄. 페이지는 봇 차단(WebFetch 불가)으로 못 열었다. 확장팩 포함 여부 · 제출 표본 크기 [확인 못함] | [검색합성 — 낮음] |
| 평균 **384시간 4분** · 중앙값 **472시간 10분** | completionist.me(Steam 업적 완주 통계로 보이는 사이트) — WebSearch 요약. 페이지 403 으로 못 열었다. 모수(업적 완주자 · 모드 · 확장 포함 여부) [확인 못함] | [검색합성 — 낮음] |
| 「Standard 만 100% 하는 데 **1년 이상**」 | Alxndr(Steam 스레드 「Hardcore 100% 필요?」, 날짜 미확인) — 질문 글의 전제 | [Steam — 개인 추정] |
| 「**수천 시간의 콘텐츠**」 · **3,000시간+** | Cares Blair · Truth_X_ile(Steam 「1000시간을 어떻게 쌓나」, 2024-03-02) | [Steam — 개인 보고] |
| 「Goblin Raid 에 **500시간**」 · **11,700시간**(수년) | Sarcisian · Reynolds(같은 스레드, 2024-03-11) | [Steam — 개인 보고 (Raid 시간 500시간은 §8)] |

- 「100% 가 정의되는 범위」: **본편 = 완료 기록 5분류 전부**(§3-1) + **Cape 는 확장마다 따로**. 확장팩을 포함하면 완료 대상이 늘어난다 — 확장 규모(데이터 계산): **ToTH 세는 아이템 570 · AoD 681 · ItA 1,003** 개 추가([§10](#10-확장팩이-더한-것)).
- [해석] 위 값들은 서로 **정의가 다르다**(모드 · 확장 포함 여부 · 자기 보고인지 통계인지 · 방치 시간을 어디까지 세는지). **하나의 수로 정하지 않는다.**

---

## 7. 엔드게임 — 본편의 마지막과 그 뒤

### 7-1. 본편의 마지막 콘텐츠: Impending Darkness Event
위키 `Impending_Darkness_Event`(v1.3.1 최신): **「Impending Darkness Event 는 Melvor Idle 본편의 마지막 던전이다」** [위키/jina].

**데이터 `combatEvents`(Full 에 1개)** [데이터]

| 필드 | 값 |
|---|---|
| `id` | `ImpendingDarkness` |
| `slayerAreaIDs` | Unhallowed Wasteland · Dark Waters · Perilous Peaks · Shrouded Badlands (4개) |
| `passiveSelectionIDs` | `EventPassive1`~`EventPassive12` (12종 — 라운드마다 하나 고른다) |
| `enemyPassives` | `ControlledAffliction` |
| `bossPassives` | `MistBoss` |
| `firstBossMonster` / `finalBossMonster` | Bane / **Bane, Instrument of Fear** |
| `itemRewardIDs`(순서대로) | Shield of Melee Power · Shield of Ranged Power · Shield of Magic Power · Ring of Power · Impending Darkness(로어 책) |
| `petID` | Bone (확률: 1회 클리어 확정, modifier 없음) |

**구조** [위키/jina Impending_Darkness_Event]
- 시작하면 **이벤트 밖에서는 못 싸운다**. 전투 중이 아니면 이벤트는 **일시정지**되어 그동안 비전투 스킬을 할 수 있고 진행이 저장된다. 멈추는 방법은 **죽거나 「Stop Event」** 뿐. **하드코어에게 안전한 죽음**(장비 1개는 잃지만 세이브는 안 지워진다).
- **5라운드**. 라운드 시작마다 모든 몬스터에 걸릴 modifier 를 하나 고른다. 라운드마다 4개 슬레이어 구역에서 **5~8마리 · 마지막은 「Mist Boss」**(최대 HP +20% · 데미지 감소 +20% · 공격 간격 −20% · 명중 +20% · 회피 +20%)를 잡고, 네 구역을 끝내면 **그 라운드의 진짜 보스 Bane** 가 나온다. Bane 의 전투 스타일은 매번 무작위이고 그 스타일로만 죽는다(도망쳐서 마지막 구역을 다시 하면 스타일이 다시 굴려진다).
- 슬레이어 구역에서 싸우므로 구역 접근권(Slayer Skillcape 또는 각 구역 아이템, Unhallowed Wasteland 의 지도가 필수)이 필요 — 위키가 **「실질 Slayer 95 요구」**라 쓴다. 구역 효과는 그대로 적용된다.
- **5라운드 끝의 최종 보스는 Bane, Instrument of Fear**: 더 강한 Bane · 추가 특수공격 · **그동안 고른 부정 modifier 의 누적 효과**.
- 보상은 라운드마다 순서대로 Shield of Melee/Ranged/Magic Power → Ring of Power → 로어 책. 여러 번 클리어하면 방패 · 반지를 여러 개 얻는다.
- 보스 레벨 표기 1,300 · `difficulty` 6(Mythical) · 진입 조건 「Into the Mist 클리어」 [위키/jina Dungeons] [데이터 `dungeons`].

### 7-2. 이 뒤에 남는 것
| 남는 것 | 내용 | 출처 |
|---|---|---|
| **확장 콘텐츠의 관문** | ToTH 의 첫 던전(Ancient Sanctuary) 진입 = 「Labyrinth Solution 구매 + Impending Darkness 클리어」. **ToTH 아이템 219개**가 `equipRequirements` 에 「Impending Darkness 클리어」를 갖는다(레벨 100 이상 무기 · 방어구 다수). ItA 의 The Abyssal Approach 진입도 「Impending Darkness 클리어」 | [데이터/계산 — ToTH `items[].equipRequirements` 중 `DungeonCompletion` `Impending_Darkness` 219개] [위키/jina Dungeons] |
| **스트롱홀드** 단계 | 4개 본편 스트롱홀드가 Standard → Augmented → Superior 의 3단계. Augmented 는 강화 재료 3종 소지가 조건, Superior 는 Augmented 재료 3종 + **Superior 두루마리 획득 확률 1**(Standard 100) 로 희소 | [데이터 `strongholds.tiers`] |
| **100% → Cape of Completion** | §3-1 | [04 §5-1](04_construction_unlocks.md) |
| **확장팩** | §10. ItA 의 「Depths of …」 8단계 · Xon 보스, 비밀 **Eternal Realm**(§10) | [데이터] |

- **「속도 경쟁 모드」의 「최종 보스」**는 본편 기준으로 Bane, Instrument of Fear(`finalBossMonster`)로 읽힌다 [해석 — 규칙 문장이 「최종 보스」만 쓰고 이름을 안 적었다].

---

## 8. Golbin Raid

**성격**: 본편과 분리된 **웨이브 서바이벌 미니게임**. 위키: 「영구히 추가된 첫 미니게임, 그라인드에서 잠깐 쉬려는 사람용. **누구에게나 공평하게 설계** — 높은 스탯 · 아이템이 이점이 되지 않는다」 [위키/jina Golbin_Raid — 「1.3 기준, 최신 아닐 수 있음」].

**데이터 `golbinRaid`(Demo 에 본체, Full · ToTH 에는 `bannedItems` 만)** [데이터]

| 필드 | 내용 |
|---|---|
| `startingWeapons` | Bronze Scimitar · Adamant Scimitar (Adamant 는 상점 Jerry 구매 시) |
| `startingFood` · `startingAmmo` · `startingRunes` | Shrimp · Bronze Arrows 200 · 원소 룬 5종 각 500 |
| `bannedItems` | Demo 37 · Full 105 · ToTH 30 — **Skillcape · Cape of Completion · 채집 보조 장비** 등을 레이드에서 금지(공정성) |
| `bannedPassiveItems` | Demo 5 · Full 75 · ToTH 49 — 파티 모자 · 슬레이어 세트 · 원소 위저드 세트 등의 패시브 금지 |
| `crateItems` | **38종**(가중치 1~35) — Golbin Crate 로 열리는 레이드 전용 장비. 예: Ultimate Slapping Gloves · Impossible Longbow · Mystery Wand(가중치 1), Enchanted Topaz Bolts(35) |
| `golbinPassives` | 20개(SwingFirst · DontHurtMe · BigBoi · CheatsEnabled · Yoink · Humungus · OhNoooo · ProGamer …) — **골빈이 얻는 랜덤 패시브** |
| `randomModifiers` | 58개 키 — 시작 · 10웨이브마다 고르는 양 · 음 modifier 목록 |
| `playerModifiers` | `autoEatThreshold` 30 · `autoEatEfficiency` 80 · `autoEatHPLimit` 60(= Auto Eat Tier II 상당) |

**구조** [위키/jina Golbin_Raid · Golbin_Raid/Guide(1.0.1)]
- 난이도 3종: Easy(Raid Coins ×0.5, 골빈 HP ×0.75, Standard 삼각형) · Medium(×1.0, HP ×1.0, 시작과 **10웨이브마다 양 · 음 modifier 1개씩**) · Hard(×1.5).
- 웨이브마다 보상 선택(음식 3택 · 탄약 2택 + 증가 · 룬 2택 + 증가 · 장비). 웨이브 **10의 배수는 붉은 골빈 보스**. 웨이브 4부터 Raid Coins.
- **장비 해금은 웨이브로 계단**: 1~9 = 레벨 70 이하 장비, 10~19 = 84 이하, 20+ = 전부(Wasteful Ring · Cape of Completion · Maximum Skillcape · Farming Skillcape · Candy Cane 은 영구 금지) [위키/jina Golbin_Raid/Guide].
- **Raid Coins 표(Normal)**: 5웨이브 54 · 10웨이브 144 · 20웨이브 1,008 · 50웨이브 10,080 · 100웨이브 68,040 · 200웨이브 524,160 [위키/jina Golbin_Raid — Easy 는 절반, Hard 는 1.5배].
- **기본 목적**: 위키 가이드 「TL;DR」: 「스페셜 어택이 좋은 무기(볼트 · 강한 시작 무기)를 굴리려 **리스타트를 스팸**한다 → 초반 2웨이브로 방어 · 자원 → 20웨이브 이후 상위 무기」. 10의 배수 보스는 수동으로 먹으며 버티거나 **웨이브 스킵**(비용 증가)으로 넘긴다.
- **세이브 · 일시정지**: 1.0.1 기준 가이드는 「**레이드를 일시정지 · 저장할 수 없다**」라 쓴다. 2023년 Steam 스레드에서 Truth_X_ile 는 「Raid 는 **방치 미니게임** — 플레이 중에도 오프라인 시간이 쌓인다」고 한다 [Steam 3810655055446842823]. **둘이 어긋난다 — 어느 빌드에서 바뀐 것인지 확인 못했다.**

**Raid 상점 — 데이터 `shopPurchases`(category `melvorD:GolbinRaid`) 14종, 화폐 `melvorD:RaidCoins`** [데이터]

| id | 효과 | 비용(RC) | `defaultBuyLimit` |
|---|---|---|---|
| SkipCostReduction | 웨이브 스킵 비용 −1 (위키 수식에서 0.01/회 · 최대 0.5) | 2,500 | 50 |
| FoodBonus · AmmoBonus · RuneBonus | 선택 화면 최소 음식 +5 · 최대 탄약 +5 · 최대 룬 +5 | 1,500 | 무제한(0) |
| PrayerUnlock | 레이드에서 Prayer 열림 | 25,000 | 1 |
| PrayerLevel | 레이드 Prayer 레벨 +1 | 2,500 | 98 |
| WaveCompletionPrayerPoints · StartingPrayerPoints | 웨이브 종료 시 +5 · 시작 시 +20 기도 포인트 | 2,500 | 무제한 |
| PassiveUnlock | **전투 패시브 슬롯** 해금 | 50,000 | 1 |
| FasterSpawns | 리스폰 −100ms | 20,000부터 +20,000 씩 | 5 |
| GolbinCrate | 레이드 전용 장비 1종 해금(중복 불가) | 1,000부터 +1,000 씩 | **38** |
| Preston · Jerry | 펫 Preston the Platypus · Jerry the Giraffe | 100,000 | 1 |
| YellowPartyHat | Yellow Party Hat(외형용) | 500,000 | 무제한 |

- 한도가 있는 구매의 총액: 데이터로 계산하면 **1,686,000 RC**(Crate 1,000 × (1+…+38) = 741,000 포함). 위키 가이드(1.0.1)는 **1,725,000**이라 적는데 Crate 를 39회로 센 차이(+39,000)와 정확히 맞는다 — 「Crate 39 → 38」이 그 뒤에 바뀐 것 [데이터/계산 vs 위키/jina — 위키가 옛 빌드].

**본편에 돌려주는 것** [데이터 · 위키]
- **전용 아이템 38종은 아이템 완료에 안 든다**, 상점 펫 2종(Jerry · Preston)은 `ignoreCompletion` true 지만 위키는 「얻으면 완료 기록에 추가된다」고 한다. 단 하나의 예외 **Golden Golbin**(골빈 42,069 킬 — 레이드 킬 포함)은 완료 기록의 펫이며 레이드 밖에서도 얻을 수 있다 [위키/jina Golbin_Raid/Guide] [데이터 `pets`].
- **본편 GP · 스킬 XP · 재료로 돌려주는 것은 확인되지 않는다** — 화폐는 Raid Coins 로 분리, 레이드에서 얻은 아이템은 본편으로 못 가져온다(장비는 「레이드 안에서 쓰는 것」)([04 §7-1](04_construction_unlocks.md) 이 「Township 과 연관 없음」이라 적은 것과 일치).
- 본편 도전과제 · 마을 과제와의 관계: 골빈 처치는 마을 「Golbin 처치」 과제 카운트에 **불포함**(04 §7-1, 위키 검색합성). Chaos 모드는 **Golbin Raid 없음**(§4 규칙).- Steam 스레드(Truth_X_ile): **DLC 를 가진 사람은 레이드에서 후반 아이템에 바로 접근**할 수 있다고 한다(그 스레드에서 한 주장, 확인 못함) [Steam 3810655055446842823].

---

## 9. 없는 것 — 일일 · 출석 · 시즌 · 환생 · 멀티플레이

| 항목 | 있나 | 근거 |
|---|---|---|
| **일일 보상 · 출석** | **없다**(확인된 범위) | 5개 데이터 파일 전수에서 `login` · `weekly` 는 0건, `daily` 는 **AoD 로어의 일상 서술 문장**뿐(게임 규칙 아님) [데이터 문자열 검색]. Steam 상점 소개에도 없다 [Steam] |
| **시즌** | **Township 안의 게임 내 계절만** | `skillData[Township].data.seasons`(Full 6). 「Lemon · Nightfall · Solar Eclipse · Eternal Darkness Season 이 각 20% 확률로 온다」는 modifier 문장 [데이터] — 실시간 시즌 패스는 없음 |
| **환생(프레스티지)** | **없다** | 데이터에 `prestige` 0건. `Rebirth` 는 **전투 효과**(`rebirthChance` — 「0 HP 에 도달할 때」 확률 modifier)이지 리셋이 아니다 [데이터]. Steam 스레드 Truth_X_ile(2022-01-01): 「**프레스티지/리셋 시스템은 없다**」 [Steam 3199243752768164004]. **대신 게임 모드 · 새 캐릭터**로 처음부터 다시 돈다(§4) |
| **멀티플레이** | **없다** | Steam 상점: 「Single-player only」. 리더보드 · 길드 키가 데이터에 0건 [Steam] [데이터]. 사회적 요소는 위키가 말한 「디스코드 닉네임에 완료율 적기」뿐 |
| **실시간 이벤트** | **있다 — 기간 한정** | 이벤트 모드(`isEvent` + `endDate`, §4) · 이벤트 아이템(생일 케이크 · 크리스마스 아이템 등이 `ignoreCompletion`) · 전투 이벤트 `combatEvents`(Impending Darkness 가 본편에 정착한 형태). 검색 스니펫: 2020-12-23~30 크리스마스 이벤트 · 4주년(2023) 생일 이벤트 + 한정 Birthday 모드 보상 [검색합성 — 낮음] |

---

## 10. 확장팩이 더한 것

세 확장팩은 **서로 독립**이고 본편이 있어야 한다 [Steam 상점 · 검색 요약]. 아래 수치는 데이터(각 파일의 `data` 키 길이) [데이터].

| 확장 | 출시 | 규모(데이터) | **진행 구조에 얹은 것** |
|---|---|---|---|
| **Throne of the Herald** (`melvorTotH`) | 2022-10-20 [Steam] | 아이템 602 · 몬스터 58 · 던전 7 · 슬레이어 구역 8 · 펫 15 · 마을 과제 20 | **스킬 레벨 100~120 콘텐츠**(모든 스킬) · 본편 마지막(Impending Darkness) **이후**의 던전 사슬 Ancient Sanctuary → Underground Lava Lake → Lightning Region → Lair of the Spider Queen → Cursed Forest → Necromancers Palace → **Throne of the Herald(Harold 확정)**. `skillLevelCapIncreases` 에 `Post99Dungeons`(6 던전 클리어 세트 — 전투 스킬 +3 고정 · 비전투 무작위 6개에 +8, 최대 120) · `ThroneOfTheHeraldSet120`(120). Slayer 태스크 Legendary · Mythical · Superior Skillcape 상점 |
| **Atlas of Discovery** (`melvorExpansion2`) | 2023-09-07 [Steam 상점] | 아이템 699 · 몬스터 46 · 던전 5 · 전투 지역 8 · 슬레이어 구역 3 · 펫 9 · Ancient Relics 156 · 게임 모드 3 | **새 스킬 Cartography · Archaeology**(지도 · 발굴 — 「건설 → 해금」 사례, [04 §3-3](04_construction_unlocks.md)) · **본편 던전 사이에 끼는 5 던전**(Golem Territory · Unholy Forest · Trickery Temple · Cult Grounds · Underwater City — 조건 아이템 발견 · 이전 던전 클리어) · Ancient Relics 모드(§4) · Gem 슬롯 · Barrier · Unholy Prayer 17 |
| **Into the Abyss** (`melvorItA`) | 2024-06-10(1단계 UI 개편)·**06-13(2단계)** [위키/jina] | 아이템 1,041 · 몬스터 101 · 전투 지역 12 · 슬레이어 구역 14 · 스트롱홀드 4 · `abyssDepths` 9 · 펫 15 · 마을 과제 74 | **Abyssal Realm**(새 영역 · Impending Darkness 뒤에 열림) · **Abyssal 레벨 60**(전 스킬) · 새 스킬 **Corruption · Harvesting** · Skill Trees · 새 데미지 종류 · Abyssal Slayer 7단계 · 던전 The Abyssal Approach · Into the Abyss → **Depths of Woe · Decay · Fear · Ruin · Isolation · Dissolve · Resolve · The Final Depth**(순차 해금 — 보스 Xon 3형태, 펫 Zon) · **비밀 Depth9 「???」**(`realm` Eternal — `Eternity_Mitt` 아이템을 얻어야 열림, `hideIfLocked`, `ignoreCompletion`) |

- **날짜 어긋남**: [00_overview.md](00_overview.md) 는 ItA 를 「2024-03-14」로, AoD 를 「2023-09-04」로 적었다. 이번 조사에서 **위키 `Into_the_Abyss_Expansion`(v1.3.1)**은 ItA 를 「1단계 2024-06-10 · 2단계 2024-06-13」, 기사(pocketgamer)는 「Jun 14, 2024」, **Steam 상점**은 AoD 를 「7 Sep, 2023」로 준다. WebSearch 요약에는 「March 14」를 말하는 다른 출처도 섞여 있었다 — **검수에서 해소**: Steam API 출시일이 AoD 2023-09-07 · ItA 2024-06-13 이고, 09-04 는 무료 v1.2 공지일 · 03-14 는 ItA 발표일이다([10_reception_business.md §10-2](10_reception_business.md)). ToTH(2022-10-20)는 Steam 상점 직접 확인.
- Ancient Relics 모드의 `levelCapIncreases` 는 AoD 의 `Pre99Dungeons`(21개 던전) · `ImpendingDarknessSet100` 만 참조한다. ToTH 의 `Post99Dungeons` · `ThroneOfTheHeraldSet120` 을 어느 모드가 쓰는지는 확인 못했다 [데이터].

---

## 11. 출처 · 확인 못 한 것

### 출처
**데이터** — 공통 지침의 `melvor_data/` 5파일(§0에 키 명시).
**위키(jina 프록시)** — 모두 `https://wiki.melvoridle.com/w/<Page>`: Completion_Log · Pets · Beginners_Guide · What_to_level_first · Guides · Dungeons · Impending_Darkness_Event · Golbin_Raid · Golbin_Raid/Guide · Into_the_Abyss_Expansion (`Game_Modes` 404).
**Steam 토론** — `https://steamcommunity.com/app/1267910/discussions/0/<id>`: 3374907622942197389(Imyo 진행 가이드) · 677328983116796848(Alxndr 하드코어 100%) · 3823048293516778888(CandL Township 논쟁) · 3598968559031872630(Mel 방치 · 튜토리얼) · 3416559828459728016(Into the Mist) · 6006138415301468438(Firemaking 마스터리) · 5350815203295856313(Volcanic Cave 장비) · 3882722797153027607(Major Pain 진행) · 3199243752768164004(GuudBooi 진행 속도) · 4304949407575459093(플레이타임) · 3810655055446842823(Golbin Raid).
**Steam 상점/통계** — `store.steampowered.com/app/1267910`(본편) · `/app/2055140`(ToTH) · `/app/2492940`(AoD) · `steamcommunity.com/stats/1267910/achievements`(글로벌 달성률, 86행 · 2026-09-30 조회).
**기사 · 블로그** — pocketgamer.com/melvor-idle/into-the-abyss · commonsensegamer.com/melvor-idle-tips-guide (필자 Calin Ciabai).
**검색 요약(WebSearch)** — HowLongToBeat 1,670h · completionist.me 통계 · 펫 수식 · 이벤트 스니펫.

### 확인 못 한 것 (숨기지 않는다)
1. **스킬 펫 수식의 위키 원문** — 프록시가 수식을 지웠다. 검색 스니펫 「(초 × (레벨+1)) / 25,000,000」만 있고, 위키 본문의 예(1.9초 → 0.00076%)와 정합한다는 점으로만 확인.
2. **보스 펫 확률 표의 위키 원문 표** — 프록시가 표를 지웠다 → 데이터 `pet.weight` 와 `Dungeons` 표(1 in 350 등)로 확보. 두 곳은 일치했다.
3. **총 플레이 시간** — 합의된 값 없음. HLTB 1,670h · completionist.me 384/472h 는 **원 페이지를 못 열었다**(봇 차단 · 403). 표본 · 정의 불명. 「1년 이상」 발언 날짜 미확인.
4. **Steam 도전과제 이름 · 설명** — 데이터에 없다(로컬라이즈). 통계 페이지 86행 ↔ 데이터 92 어긋남의 6개를 특정 못함.
5. **이벤트 모드(Chaos · 속도 5종)가 지금 선택 가능한지** — `endDate` 는 2021~2024, 현재 상태 [확인 못함]. InternalSuffering `endDate` 는 자릿수 오타로 보이는 값.
6. **Golbin Raid 「How to Play」 · 일시정지/저장 가능 여부** — 위키 1.0.1 가이드(불가)와 2023 Steam 답변(방치 가능)이 어긋난다. 위키 `Golbin_Raid` 본문 절은 프록시가 비웠다.
7. **Golbin Raid 로 본편에 돌려주는 것** — 확인된 것은 완료 기록 예외(Golden Golbin) 하나뿐. 「DLC 보유자는 레이드에서 후반 아이템에 접근」은 한 유저 주장.
8. **Harold 마스터리 풀 상한 수치** — 데이터 50 · 위키 가이드 +25% (단위 · 빌드 차이 확인 못함).
9. **완료 기록의 정확한 제외 목록** — 위키가 적은 목록과 데이터의 `ignoreCompletion` 가 같은지 원소 단위로 대조 못함. 마스터리 대상 액션 수(약 556)는 배열 길이 합.
10. **Reddit 원문** — 검색 결과에 미러만 나오고 직접 못 열었다. 커뮤니티 인용은 전부 Steam 토론 · 개인 블로그다.
11. **확장팩 출시일 어긋남** — ItA(00_overview 03-14 ↔ 위키 06-10/13 · 기사 06-14), AoD(00_overview 09-04 ↔ Steam 09-07).
12. **Township 2023-09 조정의 실제 내용** — 유저 발언(95 → 85)만 있다.
13. **Steam 스레드의 연도** — Imyo(9월 13일) · Mel(11월 28일) 스레드는 연도가 요약에 없었다.
14. **Impending Darkness 에 대한 커뮤니티 「벽」 논의** — 검색에서 못 찾았다(위키 서술만).

---
*조사일: 2026-09-30*

---

*마지막 업데이트: 2026-09-30*
