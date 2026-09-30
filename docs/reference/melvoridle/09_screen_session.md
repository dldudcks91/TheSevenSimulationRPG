# Melvor Idle — 화면 구성 · 세션 구조 · 기술 구조

> 상태: **조사 완료** (2026-09-30)
> 목적: 그래픽을 거의 쓰지 않는 텍스트 기반 게임이 「그림 없이 정보를 전달하고 플레이를 성립시키는」 방식을 Melvor Idle 에서 사실로 확보한다 — 화면 목록 · 스킬 화면 틀 · 전투 · 은행/상점 · 알림 · 세션 · 설정 · 기술 구조 · 데이터 주도 구조
> 짝 문서: [00_overview.md §2](00_overview.md)(오프라인 진행 · 24시간 상한 · 복귀 리포트 — 여기서는 링크만) · [01_skills.md](01_skills.md)(스킬 메커닉 · 마스터리) · [04_construction_unlocks.md §4 · §5](04_construction_unlocks.md)(은행 칸 · 상점 영구 해금)
> ⚠ 이 문서의 수치는 전부 Melvor Idle 의 수치다

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 — **화면을 직접 볼 수 없다는 한계** |
| 1 | 화면 목록과 메뉴 구조 — `pages` 26개 · 사이드바 분류 · 튜토리얼 |
| 2 | 스킬 화면의 공통 틀 — 머리 · 채집형 카드 · 장인형 패널 · 마스터리 · 미니바 |
| 3 | 전투 화면 |
| 4 | 은행 · 상점 화면 |
| 5 | 그림을 줄이는 방식 — 색 · 아이콘 · CSS 애니메이션 · 소리 없음 |
| 6 | 알림 — 토스트 · 레벨업 · 오프라인 복귀 창 · 푸시 |
| 7 | 세션 구조 — 접속해서 하는 조작 · 한 번에 한 활동 |
| 8 | 설정 · 접근성 · 언어 |
| 9 | 플랫폼과 기술 구조 · 세이브 · 모드 |
| 10 | 데이터 주도 구조 — 네임스페이스 · `data` / `modifications` / `dependentData` · `modifiers` |
| 11 | 확장팩이 더한 것 |
| 12 | 출처 · 확인 못 한 것 |

---
## 0. 조사 방법과 신뢰도

**화면을 직접 본 적이 없다.** 이 조사는 스크린샷 · 실행 화면 없이 「데이터 · 클라이언트 코드 · 글」만으로 화면을 복원한 것이다. 특히 **화면 배치 HTML(`<template>` 235종)은 로그인 뒤에만 내려와 받지 못했다** — 그래서 아래의 「어떤 요소가 있는가」는 코드로 확인됐지만 「위에서 아래 어떤 순서로 놓이는가」는 위키 서술 · 요소 이름 · 짐작이다. 확인/짐작은 표기로 구분한다.

| 표기 | 근거 | 신뢰도 |
|---|---|---|
| `[데이터]` `[데이터/계산]` | (계산 = python 으로 세거나 합침) `melvor_data/*.json` 5종 직접 — `melvorDemo`(`data.pages` · `gamemodes` · `equipmentSlots` · `shopCategories` · `shopPurchases` · `bankSortOrder` · `tutorialStages` · `modifiers` · `skillData[].data.minibar`) · `melvorFull` · `melvorTotH` · `melvorExpansion2` · `melvorItA`(`modifications` · `dependentData` · `namespaceChange`) | ★★★ |
| `[사이트]` | **`melvoridle.com` 공개 파일 직접 열람**(허용 범위) — 로그인 화면 `index.html`(55KB) · `index_mobile.php`(175KB) · `assets/js/built/*.js` **143개 · 127,190줄** 전수 다운로드 · `assets/css/game.css`(91KB) · `lang/en.json` · `lang/ko.json` · `assets/schema/gameData.json`(1.9MB) | ★★★ 현재 빌드 **v1.3.1**(로그인 화면 `<title>`). 단 코드는 「있다」의 증거지 「실제로 켜져 있다」는 아니다 |
| `[위키/jina]` | `r.jina.ai` 로 원문 열람 6건 — Settings · Bank · Combat · Beginners_Guide · FAQ(`Mods` 가 FAQ 로 넘어간다) · Minibar(**404 — 위키에 그 페이지가 없다**) | ★★★ 위키 최신판 표기가 v1.3.1(2024-10-30) |
| `[Steam]` | Steam Store API(`appids=1267910`) · Steam 커뮤니티 토론 1건 | ★★ |
| `[기사]` | Gigazine · GamingOnLinux 리뷰 | ★★ 2021–22년 글 |
| `[해석]` `[추정]` | 사실에서 끌어낸 읽기 / 확인 못 한 짐작 | — |

- 코드에서 **없다**고 적은 것(전투 로그 · 소리)은 143개 파일 전수 grep 으로 찾아지지 않았다는 뜻이다. 서버 쪽 · 로그인 뒤 HTML 에 있을 가능성은 배제하지 못한다. 검색합성(WebSearch 스니펫만)은 모바일 출시일과 푸시 알림 추적에만 썼고 그 자리에 표기했다.
- 받은 JS 에 들어 있던 공개 API 키 등 비밀값은 문서에 옮기지 않았다.

## 1. 화면 목록과 메뉴 구조

### 1-1. `pages` — Demo 파일 26개가 전부 선언한다 [데이터]
`melvorDemo.json` 의 `data.pages` 는 26개다. **`melvorFull.json` 에는 `pages` 가 없다**(본편의 Thieving · Township 등 스킬 페이지도 Demo 파일이 이미 선언하고 스킬 내용 `skillData` 만 Full 이 채운다). 확장팩이 더한 페이지: AoD 2개 · ItA 1개(§11).

`pages` 한 항목의 필드는 **12종**뿐이다 [데이터/계산 — 26개 항목의 키 합집합]:

| 필드 | 뜻 (스키마 `PageData` 설명) [사이트] |
|---|---|
| `id` · `customName` | 페이지 이름 — 스킬 페이지는 이름을 안 적고 첫 스킬 이름을 쓴다 |
| `media` | 페이지 아이콘 그림 경로 |
| `containerID` | 그 페이지 본문이 들어 있는 DOM 요소의 id (예 `woodcutting-container`) |
| `headerBgClass` | 헤더 배경색 CSS 클래스 (예 `bg-woodcutting`) — **그림이 아니라 단색**(§5-1) |
| `hasGameGuide` | 헤더 아이콘을 누르면 뜨는 게임 가이드가 있는가 (26개 중 **18개**) |
| `canBeDefault` | 설정 「Default Page on Load」로 고를 수 있는가 (**19개** = Bank · Combat · 스킬 17) |
| `action` · `skills` | 이 페이지가 여는 활동 · 이 페이지에 속한 스킬 목록 |
| `sidebarItem` · `sidebarSubItems` | 사이드바에 **직접** 항목을 만드는 페이지만 (9개) |
| `skillSidebarCategoryID` | 이 페이지의 스킬 항목을 어느 사이드바 분류 밑에 둘지 |
| `displayClass` | 페이지가 보일 때 붙는 CSS 클래스 |

**페이지 26개 전수** — 스킬 페이지는 사이드바 항목을 데이터가 아니라 **코드(`skillNav.js`)가 스킬 목록에서 자동 생성**한다(`sidebarItem` 이 없는 17개) [데이터][사이트]:

| 묶음 | 페이지 (`id`) | 사이드바 위치 | 비고 |
|---|---|---|---|
| 정보 · 관리 | `Shop` · `Bank` | 분류 없는 최상단(`categoryID ""`) | Bank 는 옆에 「칸 수 / 최대」(`bank-space-nav`) 표시 · Bank `canBeDefault` |
| | `CompletionLog` | General | 하위 항목 5개 — Skills · Mastery · Items · Monsters · Pets (`sidebarSubItems`, 각 옆에 `-%`) |
| | `Statistics` · `Lore` · `Settings` | General | `before: News` — 「News」 항목보다 앞에 끼운다 |
| | `TutorialIsland` | (분류 없음) | 튜토리얼 전용 · 기본 페이지 불가 |
| 미니게임 | `GolbinRaid` | Minigame | 옆 글씨 「Public Test」 — 오프라인 계산에서 **제외**(§7) |
| 전투 | `Combat` | Combat | `skills` 8개(Attack · Strength · Defence · Hitpoints · Ranged · Magic · Prayer · Slayer) 를 **한 페이지가** 맡는다 |
| 비전투 | `Woodcutting` `Fishing` `Firemaking` `Cooking` `Mining` `Smithing` `Thieving` `Fletching` `Crafting` `Runecrafting` `Herblore` `Agility` `Summoning` `Astrology` `AltMagic` | Non-Combat (기본값) | `AltMagic` 은 스킬 `Magic` 을 비전투 쪽 화면으로 여는 두 번째 페이지(`customName "Alt. Magic"`) |
| | `Farming` · `Township` | **Passive** | `skillSidebarCategoryID: "Passive"` — 「켜 두는 활동」 아닌 스킬을 따로 묶는다 |

### 1-2. 사이드바 분류 [사이트 — `sidebar.js` 의 기본 구성]
위에서 아래 순서다. 분류는 토글로 접고 펼 수 있다(`toggleable`) — 위키: 「Combat 이나 Skills 옆 눈 아이콘으로 목록을 숨기고 보인다」 [위키/jina Beginners_Guide].

| 순서 | 분류 | 내용 |
|---|---|---|
| 1 | (배너들) | 「Demo Version」 붉은 배너 + **「Buy the Full Game」 버튼**(체험판일 때만) · 확장팩 3종 소유 표시(체크 아이콘) · 「Buy the Throne of the Herald DLC」 |
| 2 | (알림 항목) | 「New Announcement」 · 「Level Increase Available!」(고대 유물로 스킬 레벨 상한을 올릴 수 있을 때 — 누르면 창이 열린다) |
| 3 | Events · Ancient Relics · Realm Selection · Into the Abyss | 이벤트 기간 · 고대 유물 보기 · 영역 고르기 · 스킬 트리 · Abyssal 영역 (확장팩 소유 시) |
| 4 | **Combat** | 전투 페이지 항목 하나 |
| 5 | **Passive** | Farming · Township |
| 6 | **Non-Combat** | 나머지 스킬 — 항목마다 옆에 「(레벨 / 상한)」 |
| 7 | Minigame | Golbin Raid |
| 8 | General | Completion Log · Statistics · Lore · News(외부 링크) · Settings |
| 9 | Socials | Wiki · Discord · Reddit · Bluesky · X · (웹판만) Patreon |
| 10 | Other | Report a Bug(GitHub 이슈) · Privacy Policy |
| 11 | Game Version | 「v1.3.1 (파일 버전)」 — 누르면 업데이트 노트 |

- **스킬 항목의 표시**: 레벨은 `(현재 / 상한)` 형태이고 상한에 닿으면 노란색(`text-warning`). 지금 돌고 있는 활동의 스킬 이름은 **초록색**(`text-success`)이고, 특정 조건에서 항목이 `glow-animation` 으로 반짝인다 [사이트 `skillNav.js`]. 위키도 「Fishing 이 초록으로 표시되어 그 스킬이 활성」이라 적는다 [위키/jina Beginners_Guide].
- **사이드바 표시 옵션**: 레벨을 「일반 / Abyssal / 둘 다」로 고른다 · 「Mini Sidebar」(아이콘만 · 마우스를 올리면 펼침) · 모바일 「스와이프로 사이드바 열기」 [사이트 `settings.js`].
- **상단 바**: 지금 페이지 이름 · 오른쪽에 「선택한 포션 · 장비 보기」 아이콘 · 이름을 누르면 클라우드 로그인 여부 확인 · 「Force Save」 초록 버튼 [위키/jina Beginners_Guide].

### 1-3. 게임 시작 화면들 [사이트][데이터]
- **캐릭터 선택**: 로컬 슬롯 8 · 클라우드 슬롯 8(`maxSaveSlots = 8`) · 「Show Cloud Saves / Show Local Saves」로 목록 전환 · 슬롯마다 톱니 메뉴(공유 URL 만들기 · 다운로드 · 내보내기 · 가져오기). **게임 모드 선택**: `gamemodes`(Demo 1 · Full 6 · AoD 3 · ItA 2 수정) — Standard · Hardcore · Adventure · Chaos + 스피드런 3. 모드마다 `startingPage`(Standard = Woodcutting · Adventure = Combat)와 `hasTutorial` 이 있다.
- **튜토리얼 「Tutorial Island」**: `tutorialStages` **22단계**(Demo 10 + Full 12). 각 단계 = 이름 + 설명 + `tasks`(예 「Cut 3 Normal Tree」 — `eventMatcher: WoodcuttingAction`, `eventCount: 3`) + `taskPage`(그 단계가 가리키는 **페이지**) + `skillUnlocks` + 보상 GP. 순서가 곧 화면 순회 순서다: Woodcutting → Firemaking → Fishing → Cooking → Mining → Smithing → **Bank** → **Combat** → Shop → Farming (Demo 10단계의 `taskPage`) [데이터]. **[해석]** 튜토리얼이 「어느 페이지에 무엇이 있는가」를 가르치는 도구로 쓰인다 — 단계마다 `allowedShopPurchases` · `bannedItemSales` 로 다른 화면 조작을 막는다.

## 2. 스킬 화면의 공통 틀

> 배치 HTML 이 없어 「무슨 요소가 있는가」는 **JS 의 요소 이름**(`getElementFromFragment`)으로, 「순서」는 위키 서술로 잡았다.

### 2-1. 스킬 머리(`skill-header`) [사이트 `skillNav.js`]
모든 스킬 페이지 맨 위에 같은 머리가 붙는다.

| 요소 | 내용 |
|---|---|
| `skill-progress-bar` + `skill-level` + `skill-xp` | **스킬 경험치 막대**와 「레벨 N / 상한」 · 「현재 XP / 다음 레벨 XP」 (`showVirtualLevels` 설정이 켜지면 99 넘는 가상 레벨 표시) |
| `upgrade-chain-container` | 그 스킬의 **상점 도구 업그레이드**(도끼 · 곡괭이 등) 아이콘 — 데이터 `headerUpgradeChains` |
| `item-charge-container` | 충전 아이템 표시 — 데이터 `headerItemCharges` |
| `level-cap-button` · `skill-tree-button` · `realm-name` | 레벨 상한 구매(고대 유물) · 스킬 트리 · 영역 이름 (확장팩 소유 시) |
| `upper-container` · `lower-container` | 스킬별 내용을 위아래로 끼우는 자리 |

- 페이지 헤더 아이콘 → **게임 가이드**(`hasGameGuide` 18개, 텍스트는 `GAME_GUIDE_*` 310키) · 은행 · 완료 기록 · 전투 구역에 「Open on Wiki」 아이콘(설정으로 끔) [데이터/계산 `lang/en.json`][위키/jina Settings].

위키 서술: 「낚시를 시작하면 창 **위쪽**의 경험치 막대가 천천히 채워진다. 선택한 물고기는 **타일**에 이름 · 획득 XP · **마스터리 레벨** · 다음 마스터리까지 진행이 나온다」 [위키/jina Beginners_Guide].

### 2-2. 채집형(Woodcutting · Mining · Fishing · Thieving) — 카드 그리드
**`woodcutting-tree` 카드 한 장의 요소** [사이트 `woodcuttingMenu.js`]: 버튼(전체가 누르는 자리) · 이름 · 그림 · `요구 레벨` 뱃지(부족하면 빨강 `badge-danger` · 충족하면 초록) · `XP` 글 · `interval`(「N초」) · **카드 자체의 진행 막대**(활성이면 100%) · 요구 조건 목록(스킬 아이콘 + 글) · **`mastery-display`**(그 나무의 마스터리) · 잠김 컨테이너(잠기면 버튼 대신 잠금 안내).

카드가 그리드로 나열되는 근거는 데이터 구조다. 채집형 행동 목록은 **모두 같은 몇 개 필드**다 [데이터/계산 — 항목 키 집합]:

| 스킬 | 목록 키 (Demo) | 항목 필드 |
|---|---|---|
| Woodcutting | `trees` 9 | `id` `name` `media` `level` `baseInterval` `baseExperience` `productId` |
| Mining | `rockData` 11 | `id` `name` `media` `level` `baseExperience` `productId` `baseRespawnInterval` `baseQuantity` `hasPassiveRegen` `category` `giveGems` |
| Fishing | `areas` 8 → `fish` 23 | 지역: `fishChance` `junkChance` `specialChance` `fishIDs` · 물고기: `level` `baseMinInterval` `baseMaxInterval` `baseExperience` `strengthXP` |
| Thieving (Full) | `areas` 11 → `npcs` 23 | 지역: `npcIDs` `uniqueDrops` · NPC: `level` `perception` `maxHit` `lootTable` `currencyDrops` |

**[해석]** 채집형 화면 = 「이름 · 그림 · 레벨 · XP · 초 수」 다섯 개로 카드를 만들고, 그 밖의 정보는 마스터리 표시 · 툴팁이 맡는다. Fishing 과 Thieving 은 카드 위에 한 단계가 더 있다 — 지역(위키: 「Shallow Shores 타일」)을 먼저 고르고 그 안의 대상을 고른다.

### 2-3. 장인형(Smithing · Fletching · Crafting · Runecrafting · Herblore · Cooking · Summoning) — 선택 + 실행 패널
**`artisan-menu` 패널 하나의 요소** [사이트 `artisanMenu.js`] — 카드 그리드가 아니라 **「고른 레시피 하나를 크게 보여 주는 패널」**이다:

| 요소 | 내용 |
|---|---|
| `product-image` `product-quantity` `product-name` `product-description` | 만드는 물건의 그림 · 개수 · 이름 · 설명 · 「View Stats」(장비면 능력치 창) |
| `mastery` | 그 레시피의 마스터리 표시 |
| `requires` / `haves` / `produces` / `grants` | **필요 재료(아이콘 + 개수)** · **내가 가진 개수** · **산출** · **획득 XP · 마스터리 XP · 풀 XP** — 4개 박스가 나란히 |
| `product-preservation` `product-doubling` `product-additional-primary-quantity` `product-cost-reduction` | **보존 확률 · 2배 확률 · 추가 산출 · 비용 감소** 아이콘 (마우스를 올리면 출처 목록) |
| `interval` | 걸리는 시간 아이콘 |
| `create-button` + `progress-bar` | **「Create」 버튼과 진행 막대** |
| `recipe-options-container` · 드롭다운 | 같은 결과를 내는 **대체 재료 레시피 선택**(예 Herblore 는 `herblore-artisan-menu` 로 따로) |

- **레시피 고르기**: 위쪽 카테고리 탭(Smithing `categories` = Bars · Bronze Gear · Iron Gear · Steel Gear …, `subcategories` = Arrowtips · Javelin Heads …) → 레시피 아이콘 그리드에서 하나 선택 → 패널이 그 레시피로 바뀐다 [데이터][사이트 `recipeSelection.js` — 탭 · `localize`]. 데이터 레시피 필드: `level` `productID` `baseQuantity` `baseExperience` `categoryID` `itemCosts` `currencyCosts` (Smithing Demo **115개**).
- **Cooking 은 예외**: 「화로 · 용광로 · 솥」 3구역(`categories` Fire · Furnace · Pot)으로 나뉘고 화로는 「Basic」에서 시작해 상점에서 업그레이드 · 「Select Recipe to Cook」 → 「Active Cook」/「Passive Cook」 [위키/jina Beginners_Guide][데이터].

### 2-4. 마스터리 표시 [사이트 `masteryDisplays.js`]
| 컴포넌트 | 요소 |
|---|---|
| 행동 카드 안의 `mastery-display` | 아이콘 · **마스터리 레벨** · 다음 레벨까지 XP · 작은 진행 막대 |
| 스킬별 **마스터리 풀** 표시 | 풀 아이콘 · **풀 진행 막대(체크포인트 눈금)** · 라벨 |
| 마스터리 창(스킬마다) | 행동 목록(그림 · 이름 · 레벨 · 필요 XP · 진행 막대 · **「level up」 버튼**) · 영역 탭 · 풀 표시 · 토큰 회수(`claim-token`) |

마스터리 효과의 **문장**은 데이터에 들어 있다 — `masteryLevelUnlocks: [{level: 10, description: "Every 10 levels provides +5% chance to receive 2x Logs per action."}]` · `masteryPoolBonuses: [{percent: 10, modifiers: {masteryXP: …+5}}]` [데이터 Woodcutting]. 메커니즘은 [01_skills.md §2](01_skills.md).

### 2-5. 진행 막대의 구현 — 틱이 아니라 CSS 애니메이션 [사이트 `progressbar.js`, `game.css`]
행동 진행 막대(`progress-bar` 컴포넌트)는 매 틱 폭을 바꾸지 않는다. **행동 간격 전체를 지속 시간으로 하는 CSS `@keyframes progressBar`(0% → 100%, linear)를 한 번 걸고**, 이미 지나간 시간은 **음수 `animation-delay`** 로 맞춘다. 줄무늬(`progress-bar-striped progress-bar-animated`)는 「간격이 없는 지속 활동」에 쓴다. 설정 「Render Progress Bars」를 끄면 이 애니메이션을 아예 안 건다(§8) [사이트]. **[해석]** 렌더 부담을 브라우저에 넘긴 「싼 진행 표시」이고, 게임 로직 틱(50ms)과 화면 갱신이 분리돼 있다.

### 2-6. 미니바(`minibar`) — 「진행 막대」가 아니라 「빠른 장비 교체 줄」 [데이터][사이트 `minibar.js`]
데이터 `skillData[].data.minibar` = `{defaultItems: [...], upgrades: [...], pets: [...]}` 세 배열뿐이다. 예: Woodcutting(Demo) `defaultItems: [Woodcutting_Skillcape]`, `upgrades: [Multi_Tree]`, `pets: [Beavis]` · Fishing `[Amulet_of_Fishing, Barbarian_Gloves, Fishing_Skillcape]` · Thieving(Full) 장비 **10종**. Full 에서 `Max_Skillcape` · `Cape_of_Completion` 이 모든 스킬의 `defaultItems` 에 덧붙는다(§10-4).

- **동작**: 스킬 페이지 하단(`skill-footer-minibar`)에 **그 스킬에 관련된 장비 · 펫 · 업그레이드 아이콘**을 늘어놓고, 누르면 **바로 장착/교체**한다. 아이템은 **한 번이라도 얻었을 때만**(`itemFindCount > 0`) 나타난다. 줄 순서는 드래그로 바꾼다(`Sortable`) · 스킬마다 다르게 저장(`customItems`, 세이브에 들어감).
- **기본 버튼 5개**: 마스터리 해금 목록 · 스킬 마일스톤 · 소환 시너지 · **퀵 장착(Quick Equip)** · 고대 유물. **전투용 미니바**(§3): 「Eat」 · 「Run」 버튼 · 장비 세트 선택 · 내 HP 막대와 적 HP/공격 막대. 설정에서 스킬용 · 전투용을 따로 켜고 끈다 [위키/jina Settings].
- 위키에는 이 기능 페이지가 **없다**(`/w/Minibar` 404). 설정 설명과 Beginners_Guide 의 「오른쪽 바」 언급뿐 [위키/jina]. 위키는 미니바를 **화면 오른쪽 세로 줄**로, 코드는 `skill-footer-minibar`(하단)와 `minibar-skill-item-container` 둘로 적는다 — 위치 표기가 어긋난다(레이아웃이 화면 크기에 따라 바뀌는지는 미확인).

## 3. 전투 화면

**진입**: 사이드바 Combat → 페이지 위쪽 **탭 3개**(Combat Areas · Slayer Areas · Dungeons) → 구역을 고르면 **그곳의 몬스터 목록**이 나오고 몬스터마다 **HP · 전투 레벨 · 공격 유형**이 적힌다 → 「Drops」(드롭표 보기) · 「Fight」 → 그 아래에 **장비 · 전투 능력치** 구역 [위키/jina Combat · Beginners_Guide]. 구역 목록은 데이터 `combatAreaCategories`(Demo: CombatAreas 12 · Dungeons 8)이고 Full/확장팩이 `modifications` 로 안에 끼운다(§10-3).

**전투 중 화면 요소** — JS 의 요소 id `combat-*` 를 전부 뽑은 것 [사이트]:

| | 플레이어 쪽 | 몬스터 쪽 |
|---|---|---|
| 체력 | HP 막대 + `현재 / 최대` · **방벽(Barrier) 막대**(있을 때) | 같은 구조 — 이름 · **그림** · HP 막대 · 방벽 |
| 공격 진행 | **공격 간격 막대**(플레이어용 · 소환수용 각각) | 공격 간격 막대 |
| 상태 | 활성 효과 아이콘 + **효과 지속 막대** · 피해 감소 툴팁 · 공격 속도 문구 | 효과 아이콘 + 지속 막대 |
| 자원 | 기도 포인트 · **자동 먹기(auto-eat) 문구** · 특수공격 아이콘 · 음식/룬/탄 | — |
| 능력치 | 능력치 카드(최대 데미지 · 명중 확률 · 피해 감소 · 회피) | 레벨 · 공격/방어 능력치 · **패시브** · **특수공격 목록** — 「Show Enemy Skill Levels」 설정으로 켜고 끈다 |
| 떠오르는 숫자 | 데미지 스플래시(`combat-player-splash-container`) | 스플래시(`combat-enemy-splash-container`) |

- **장비 · 음식 · 주문 고르기**: 전투 페이지 안에 **주문서 메뉴 · 기도서 메뉴 · 룬 메뉴 · 슬레이어 임무 메뉴 · 음식 선택**이 있다(`combat-spellbook-menu` `combat-prayer-book-menu` `combat-rune-menu` `combat-slayer-task-menu` `combat-food-select`) [사이트]. 장비 착용은 전투 페이지의 장비 구역에서 하고, 장비는 **19칸 격자**다 — `equipmentSlots` 19개가 각각 `gridPosition {col, row}` 를 가진다: 3열 × 7행, 예 Helmet=(2,0) · Weapon=(1,2) · Shield=(3,2) · Platebody=(2,2) · Enhancement1~3=(1~3, 6). 빈 칸은 `emptyMedia`(실루엣 아이콘)로 그린다 [데이터]. 던전에서는 **음식 · 장비를 바꿀 수 없다**(상점 업그레이드가 있어야 가능) [위키/jina Combat].
- **전투 진행**: 「Fight」 뒤 **도망 · 사망 · 던전 클리어 때까지** 계속된다 · 몬스터가 죽으면 **3초 뒤 다음 몬스터**가 나온다 [위키/jina Combat · Beginners_Guide].
- **드롭**: 죽인 몬스터의 아이템은 **전리품 상자(loot container)** 에 쌓이고, 「Loot All」 또는 아이템 하나를 눌러야 은행에 들어간다(Amulet of Looting 이 있으면 자동) · 도망치면 자동 회수 · 상자가 넘치면 **가장 오래된 드롭이 사라진다**(코드가 `lostLoot` 를 세어 복귀 창에 보여 준다) [위키/jina Combat][사이트 `combatLoot.js`]. 뼈(bones)는 쌓이고 시간이 지나도 안 없어진다.
- **전투 기록(로그)은 없다.** 「전투 메시지 로그」 성격의 코드(`combatLog` · `messageLog` 등)가 143개 파일 어디에도 없다 — 대신 **상황은 막대 · 스플래시 · 효과 아이콘**으로만 전한다. 누적 기록은 「Statistics」 페이지와 「Completion Log > Monsters」 몫이다 [사이트 전수 grep — §0 한계 참조].
- **데미지 스플래시**: 적중마다 숫자가 HP 막대 위로 떠서 애니메이션 후 사라진다. 대기열은 **최대 10개** · 200ms 간격으로 순차 표시 · 종류마다 색이 다르다(화상 · 출혈 · 독 · 치명타 · 회복 …) [사이트 `damageSplash.js`]. 「Show Combat Damage Splashes」를 끄면 안 그린다.

## 4. 은행 · 상점 화면

### 4-1. 은행 [사이트 `bankMenus.js` · `bank2.js` · 위키/jina Bank]
화면 = **위쪽 도구줄** + **탭 줄** + **아이템 격자** + **오른쪽 패널(선택한 아이템)**. 칸 수 · 탭 수 · 확장 비용은 [04 §4](04_construction_unlocks.md).

| 기능 | 내용 |
|---|---|
| **탭** | 시작 12탭(위키). 세이브 형식상 **최대 255탭**(`MAXIMUM_TABS`). 탭 아이콘은 기본이 「첫 아이템」이고 아이템의 설정 톱니에서 다른 아이템 그림으로 바꾼다. **고정 탭(Sticky)** · **스크롤 탭** 설정 |
| **검색** | 「Search Bank」 텍스트 박스 — **Fuse.js 퍼지 검색**. 이름 · id · 설명 · 슬롯 · **카테고리**로 찾고, 지금 탭에 결과를 보이며 **다른 탭 중 결과가 든 탭은 강조**한다 |
| **정렬** | 「Sort」 버튼이 지금 탭을 정렬 · 드래그로 수동 재배열(모바일은 길게 누르기). **기본 정렬 규칙 6종**: 기본 · 아이템 가치 높은 순/낮은 순 · **스택 가치** 높은 순/낮은 순 · 사용자 정의. **처음 얻은 아이템은 초록 빛**으로 표시되고 첫 탭에 들어간다 |
| **이동 모드** | 「Move items to new Tab」 → 여러 개 다중 선택 → 목적지 탭 → 「Confirm Move」 |
| **판매 모드** | 「Toggle Sell Mode」 → 다중 선택 → 「Confirm Sale」. 개별 판매: 슬라이더 · 「Sell」 · 「Sell all」 · **「Sell all but 1」** · 직접 수량 입력 |
| **잠금** | 아이템마다 자물쇠. 탭 단위 「Lock all / Unlock all items in Tab」 · **「Sell all unlocked items in Tab」**(잠금 안 한 것만 일괄 판매) |
| **필터** | 확장팩별 표시 토글(Demo · Full · ToTH · AoD · ItA) · 피해 감소 · 데미지 종류 · 스킬 XP 아이템 필터(설정에 저장) |
| **오른쪽 패널** | 아이템 그림 · 이름 · 설명 · 판매가 · 보유 수 · 장비 슬롯/1H·2H · **능력치 창(현재 장비와 비교, 초록 +1 식)** · 장착(수량 슬라이더 · 장비 세트 고르기) · 음식 장착 · **사용 · 열기 · 묻기(Bury) · 읽기** · **업그레이드 1/10/100/1000/전부** · 특수공격 목록 · 위키 링크 · 설정 톱니(탭 아이콘 · 퀵 이퀵 · 미니바 포함 여부) |
| 표시 | `space-fraction`(「칸 / 최대」) · 탭 값 라벨(그 탭 아이템 총가치) · 잠금 테두리 · 기본 테두리 / 강조 테두리(`bank_border.png`) |

- **은행이 가득 차면 스킬이 멈춘다** — 「Ignore Bank Full」을 켜면 계속 돌지만 넘친 아이템은 버려진다 [00_overview.md §2-4](00_overview.md).
- **기본 정렬은 데이터 표다.** `bankSortOrder` = `[{insertAt: "Start" | "After" | "Before", afterID, ids: [...]}]` — Demo 631 · Full 735 · ToTH 602 · AoD 699 · ItA 1,039개 id, 합 3,706개가 전체 아이템 3,748개의 **약 99%** 를 덮는다. 확장팩은 자기 아이템을 본편 아이템 **바로 옆**에 끼워 넣는다(예: Full 의 `melvorF:Ash` 를 `melvorD:Redwood_Logs` 뒤에) [데이터/계산].

### 4-2. 상점 [데이터][사이트 `shopMenu.js`]
- **분류 탭**: 본편 **8개** — General Upgrades · Skill Upgrades · Gloves · Skillcapes · Materials & Items · Golbin Raid(Demo) · Slayer · Township(Full). 확장팩이 Superior Skillcapes(ToTH) · Atlas of Discovery(AoD) · Into The Abyss · Abyssal Slayer(ItA)를 더한다. 항목 수 Demo 82 + Full 119 = **201** (분류별 Demo: SkillUpgrades 36 · Golbin Raid 14 · Skillcapes 11 …).
- **항목 필드**: `contains`(아이템 또는 `modifiers`) · `cost`(아이템 + 통화) · `unlockRequirements`(**보이는 조건**) · `purchaseRequirements`(**살 수 있는 조건**) · `allowQuantityPurchase` · `defaultBuyLimit` · `buyLimitOverrides`(게임 모드별) · `customName` / `customDescription`(「+${qty} Maximum Bank Space」 템플릿).
- **구매**: 항목 카드에 비용(재료 아이콘 + 필요 수량 × 구매 수량) · 충족 여부 색 · 구매 수량 메뉴(`ShopBuyQuantityMenu`) · 구매 확인 창(설정). **팔기는 상점이 아니라 은행에서 한다**(위키: 「판매는 인벤토리에서 아이템을 눌러 연 메뉴」) [위키/jina Beginners_Guide]. 「상점 영구 해금」의 내용은 [04 §5](04_construction_unlocks.md).

## 5. 그림을 줄이는 방식

### 5-1. 무엇이 그림이고 무엇이 아닌가
| 요소 | 방식 | 근거 |
|---|---|---|
| **페이지 정체성** | **단색 하나** — 페이지마다 `bg-<이름>` 클래스가 **`background-color` 한 값**(예 woodcutting `#358f12` · fishing `#92d0f1` · bank `#b57e3b` · combat `#a4a4a9` · agility `#2c87fa` · magic `#8d7bca` · township `#6c838a`). 같은 색이 진행 막대(`progress-bar.bg-woodcutting`) · 카드 테두리(`border-woodcutting`)에도 쓰인다 | [사이트 `game.css`] 26개 페이지 중 26개 색 모두 확인 |
| **정보 단위** | **아이콘 PNG** — 아이템 3,748종 모두 `media`(예 `assets/media/bank/armour_boots_adamant.png`) · 몬스터 · 펫 · 스킬 · 상점 항목 · 카테고리도 각자. Demo 데이터의 그림 경로 참조 1,059개(고유 933) · 확장팩 4개 파일의 고유 그림 각각 1,209 · 809 · 1,013 · 1,481개 | [데이터/계산 정규식] 전부 `.png` |
| **배경** | 설정에서 고르는 **배경 사진 10장**(`bg_0`~`bg_9` `.jpg`, 캐릭터별 저장) — 이것이 게임 CSS 에서 「그림」 성격의 거의 유일한 자원 | [사이트] `game.css` 의 `url()` 참조는 **26개뿐** — 배경 10 · 은행 테두리 · 상자 모서리 4 · 확장팩 테마 이미지 · 로고 · 인라인 SVG 1 |
| **숫자 · 글** | 나머지 전부 — 레벨 `(N / 상한)` · XP `현재 / 다음` · 확률 · 초 · 재료 `보유 / 필요` · 비용 | §2 |
| **움직임** | ① 진행 막대 CSS 애니메이션(§2-5) ② 데미지 스플래시 ③ 알림 카드의 펄스 ④ 활성 스킬 사이드바 반짝임 ⑤ 레벨 99 폭죽(`showFireworks`) ⑥ 던전 상자 흔들림 · 모서리 연출(Golbin Raid) ⑦ 지도 화면 Pixi 렌더링 | [사이트] `game.css` `@keyframes` 21종 |
| **소리** | **없다.** 143개 JS 에서 `Audio` · `AudioContext` · `.mp3/.ogg` 재생 코드도, 설정의 음량 항목도 찾지 못했다. 2022년 리뷰도 「효과음도 BGM 도 없다」 | [사이트 grep][기사 Gigazine] |
| **진동** | 네이티브 앱 래퍼에 `triggerHaptic` 함수 존재, 게임 코드에서 호출부는 못 찾음 | [사이트 `nativeManager.js`] |

- **[해석]** 「그래픽 최소화」의 실체 = ① **색이 정체성**(페이지 · 진행 막대) ② **아이콘이 데이터의 얼굴**(모든 항목이 정사각 아이콘 하나) ③ **움직이는 것은 진행 막대와 숫자 스플래시뿐**. 캐릭터 · 몬스터 애니메이션 · 일러스트 화면 배경은 없다(몬스터는 정지 그림 `combat-enemy-img`). 기사 서술과 어긋나는 곳: Gigazine 은 「애니메이션조차 없다」고 적지만 코드에는 위 ①~⑦ 이 있다. **「캐릭터 애니메이션이 없다」의 뜻으로 읽는 것이 맞다**[해석].
- **렌더 부담을 사용자에게 넘기는 스위치**: 「Render Progress Bars」 · 「Show Combat Damage Splashes」 · 「Reduce CPU & GPU usage」 · 지도 프레임 상한(§8) — 위키 FAQ 가 렉의 1차 처방으로 「진행 막대와 스플래시를 꺼라」를 안내한다 [위키/jina FAQ].
- **Pixi.js(WebGL 2D)는 Cartography 지도**(육각 격자 · 시야 · 확대/이동 — `hexMap.js` · `cartographyMenu.js`)에서 쓰인다 — 텍스처 품질 · 안티에일리어싱 · 프레임 상한 · 방치 5분 후 10 FPS 조절 설정이 이 화면 전용이다 [사이트 `settings.js`][위키/jina Settings].

## 6. 알림

| 층 | 언제 | 어떻게 |
|---|---|---|
| **① 알림 카드(Notifications v2, 기본)** | 아이템 획득/소모 · 통화 증감 · 스킬 XP · 마스터리 레벨 · 소환 마크 · 오류 · 성공 · 정보 | **종류 11개 클래스**(`AddItem` `RemoveItem` `AddCurrency` `RemoveCurrency` `SkillXP` `AbyssalXP` `MasteryLevel` `SummoningMark` `Error` `Success` `Info`). **같은 키의 알림은 합쳐진다** — 같은 아이템을 또 얻으면 새 카드가 아니라 기존 카드의 수량이 늘고(`+N`이 떠오르며 펄스) 타이머가 다시 시작한다. 정렬은 **오류 → 「중요」 → 나머지**. 표시: 그림 + 수량 + (설정 시) 이름 + 「은행에 현재 N개」 |
| 표시 위치 · 시간 | | 왼쪽/**가운데(기본)**/오른쪽 · 사라지는 시간 1·**2(기본)**·3·4·5·10·20초 · 「컴팩트」 스타일(기본 켜짐) · **「중요」로 지정하면 클릭할 때까지 남는다**(소환 마크 기본 · 오류 선택) |
| 종류별 끄기 | | 아이템 · GP · 슬레이어 코인 · Abyssal 조각 · 스킬 XP · 보존 성공 · 기절/수면 · 마스터리 체크포인트 · 소환 마크 (각각 설정 항목) |
| **② 옛 토스트(Legacy)** | 「Use Legacy Notifications System」을 켜면 | Toastify 라이브러리 — 화면 위/아래 가운데에 잠깐 뜨는 띠(`fireTopToast` / `fireBottomToast`, 기본 2초) · 그림 + 뱃지(`imageNotify`). v2 전용 설정(위치 · 시간 · 이름)은 안 먹는다 [위키/jina Settings] |
| **③ 레벨업** | 스킬 레벨이 오를 때 | **기본은 작은 알림**(화면 아래). 「small level up」을 끄거나 **레벨 99 는 큰 모달**(축하 문구 + 스킬 그림 64px + **새로 열린 마일스톤 목록**) + 99 에서 **폭죽** 연출. 모달은 대기열(`addModalToQueue`, SweetAlert2)에 쌓여 하나씩 뜬다 [사이트 `skill.js`] |
| **④ 오프라인 복귀** | 1분 이상 비운 뒤 | ⓐ **로딩 창** — 처리한 시간 진행 막대 · 남은 시간 · 「초당 N 틱」 표시(`OfflineLoadingElement`) ⓑ **요약 창**(`OfflineProgressElement`) — 아래 |
| **⑤ 확인 창** | 위험한 조작 앞 | 아이템 판매 · 상점 구매 · 농작물 파괴 · 마스터리 체크포인트 아래로 소비 · Astrology 5% 재굴림 · 게임 종료(웹만) — 전부 설정으로 끈다 |
| **⑥ 사이드바 배지** | 상시 | 「New Announcement」 · 「Level Increase Available!」(§1-2) |
| **⑦ 모바일 푸시** | 앱 · 설정 | 아래 |

**오프라인 요약 창의 내용** [사이트 `game.js` `OfflineProgressElement.setMessages` — 이전 스냅샷과 새 스냅샷의 차이를 항목별로 나열] — [00_overview.md §2-7](00_overview.md) 에 없는 세부:

- **획득/손실 통화**(초록 + / 빨강 −)에 **시간당 환산**이 붙는다 — 「(N /hr)」. XP 도 「(N XP/hr)」. **이 시간당 환산은 영어일 때만 붙는다**(코드가 `setLang === 'en'` 을 검사) [사이트].
- 스킬별 XP · **레벨업 횟수**(「Lv A → B」) · Abyssal XP/레벨 · 몬스터별 처치 수 · 던전/요새/Abyss 완료 수 · 임무 완료 수 · 소환 마크 발견 · 아이템 **획득/소모** 목록 · **먹은 음식** · 소모한 충전 · 요리 비축분 · 기도/영혼 포인트 증감 · **잃은 전리품(`lostLoot`)** · **Township 저장고 가득 참** 경고 · 희귀 채굴 노드 발견 · 고대 유물 진행.

**푸시 알림** [사이트 `settings.js` · `nativeManager.js`]: 설정에 「Offline Time Cap Push Notifications」 · 「Farming "Ready to Harvest" Push Notifications」 **두 항목**(기본 켜짐)이 있고, 네이티브 래퍼에 OneSignal 을 거친 예약 함수(`schedulePushNotification`, 종류 Unique/Other, 서버 `sendPushNotification.php`)가 있다. **그러나 143개 JS 어디서도 이 함수를 부르지 않고**, `game.js` 는 정의 없는 `deleteScheduledPushNotification('offlineSkill')` 를 부르는 잔재도 있다. **[추정]** v1.3.1 에서 실제 발송되는지, 언제 발송되는지는 확인하지 못했다 [WebSearch 로도 확인 못 함].

## 7. 세션 구조

### 7-1. 「한 번에 활동 하나」의 구현 [사이트 `game.js`]
- 게임에는 `activeAction` **하나**가 있다. 다른 활동을 시작하면 코드가 먼저 **지금 활동을 `stop()`** 한다(`idleChecker`) — 「여러 스킬을 동시에 돌린다」가 아니라 **활동 전환**이다.
- 그와 별개로 **`passiveTick()` 을 가진 것은 틱마다 항상 돈다**: 플레이어 캐릭터 · 전투 관리자 · **Farming**(작물 성장) · **Township**(마을) · **Mining 광맥 리스폰**(`rockTicking`) · Harvesting(ItA). 활동 하나 + 수동 시스템 몇 개 — 「밭 · 마을이 켜져 있는 채로 다른 활동」이 이 구조다 [사이트 grep `passiveTick`].
- **루프**: 틱 **50ms**(초당 20틱) · 로컬 자동 저장 **10초**마다 · 클라우드 갱신 확인 10초마다 [사이트 `combatManager.js` `game.js`].
- **오프라인 진입**: 게임 루프가 「마지막 틱 이후 **60초 이상**」 흐른 것을 보면 오프라인 루프로 들어간다(`MIN_OFFLINE_TIME 60000`). 처리는 상한 24시간(`MAX_OFFLINE_TIME`) · 따라잡으면(남은 차이 500ms 이하) 온라인으로 복귀 [사이트]. **[해석]** 「오프라인」은 접속 종료가 아니라 「이 루프가 틱을 못 돈 시간」 — [00_overview.md §2-1](00_overview.md) 과 같은 결론, 다만 **1분 미만은 오프라인으로 치지 않는다**는 문턱이 추가된다.
- **백그라운드 처리는 플랫폼별로 다르다** [사이트 `save.js`]: 웹은 「Reduce CPU & GPU usage」(`pauseOnUnfocus`, 기본 켜짐)일 때 포커스를 잃으면 메인 루프를 **멈추고** 돌아오면 오프라인 루프로 계산한다 · **모바일 앱은 항상** 멈춘다 · **Steam / Epic 은 이 처리를 건너뛰어 창이 뒤에 있어도 계속 돈다**. 탭을 닫을 때 오프라인 전투 설정이 꺼져 있으면 전투를 멈춘다.

### 7-2. 접속해서 하는 조작 — 무엇이 「사람이 눌러야만」 진행되는가
| 조작 | 근거 |
|---|---|
| **활동 바꾸기** — 스킬 페이지에서 나무/광맥/물고기/레시피를 고르고 시작 | §2 · 위키 「select the fish, then Start」 |
| **재료 확인 · 장인 활동 걸기** — 재료가 떨어지면 그 자리에서 멈추므로 걸기 전에 재료를 모은다 | [00_overview.md §2-4](00_overview.md) |
| **팔기 · 정리** — 은행 판매 모드 · 잠금 · 탭 이동. 은행이 차면 진행이 멈춘다 | §4-1 |
| **밭 수확과 재파종** — 오프라인 중 다 자라도 **자동 재파종이 없다** | [00_overview.md §2-3](00_overview.md) · [04 §2](04_construction_unlocks.md) |
| **마스터리 풀 XP 쓰기** — 자동 배분이 없고 「level up」 버튼으로 직접 쓴다(체크포인트 아래로 내려가면 확인 창) | Steam 토론 「babysit … to allocate mastery XP manually」 · 설정 「Show Mastery Checkpoint Notifications」 |
| **전투 준비** — 음식 장착 · 자동 먹기 상점 구매 · 장비 세트 · 슬레이어 임무 · 오프라인 전투 켜기 | §3 · [위키/jina Combat 「How to idle monsters」] |
| **전리품 회수** — 전투에서 「Loot All」 | §3 |
| **포션 선택**(스킬마다 켜고 「Stop」으로 끔) · 소환 태블릿 · 지도 발굴 등 스킬 개별 조작 | [위키/jina Beginners_Guide][01_skills.md] |
| **자동화 상점 구매**로 조작을 줄인다 — 자동 먹기 Tier I~III · 자동 음식 장착/교체 · 던전 자동 재시작 · 자동 슬레이어 · 다중 나무(Multi Tree) | [데이터 `shopPurchases`: `Auto_Eat_Tier_I…III` `AutoEquipFood` `AutoSwapFood` `Multi_Tree`][사이트 `settings.js`] |

- **몇 시간마다 들어오게 만드는가**: 게임이 강제하는 주기는 **오프라인 상한 24시간**뿐이다([00_overview.md §2-5](00_overview.md)). 커뮤니티 자기 보고 — 「12시간마다 열어서 버튼 하나 누르고 닫는다」 · 「하루에 한두 번 연다」 · 「초반에는 더 능동적이고 자동 먹기와 장비가 갖춰지면 하루를 그냥 둔다」 · 「8시간 켜 두든 8시간 뒤에 돌아오든 의미 있는 차이가 없다」 [Steam 토론 1건 — 개인 서술이라 대표성은 미확인]. 푸시 알림이 「접속 유도」 장치로 실제 쓰이는지는 §6 대로 미확인.
- **실시간으로 지켜봐야 이득인 요소**: ① 데이터/위키가 명시하는 「온라인 = 오프라인 산출」([00_overview.md §2-0](00_overview.md)) 때문에 **산출 자체의 이득은 없다.** ② 지켜봐야 하는 것은 **안전 · 정리**다 — 전투의 자동 먹기 임계와 음식 잔량 · 전리품 상자 100칸 넘침 · 은행 가득 참 · 재료 고갈 · 기절(Thieving). ③ **Golbin Raid** 는 오프라인 루프에서 제외되고(`triggerOfflineLoop` 가 `isGolbinRaid` 면 무시) 백그라운드 정지 처리도 건너뛴다 — 켜 둔 채 지켜보는 미니게임이다 [사이트]. ④ **Cartography 지도**는 Pixi 실시간 화면이지만 진행 속도는 다른 스킬과 같은 틱 루프다(추정).
- **하드코어 모드**: 오프라인 중 사망하면 **캐릭터가 영구 삭제**된다 — 캐릭터 선택 화면 하단에 「마지막 하드코어 사망 원인」이 남는다 [위키/jina FAQ][사이트 `characterSelect.js` `LatestHCDeath`].

## 8. 설정 · 접근성 · 언어

### 8-1. 설정 항목 [사이트 `settings.js`, 위키/jina Settings]
코드의 설정은 **불리언 97 + 선택형 11 = 108개**(v1.3.1). 위키가 정리한 **화면 구획 13개**:

| 구획 | 대표 항목 (기본값) |
|---|---|
| Combat | Toggle Offline Combat (꺼짐) · 특수공격 수식어 색 |
| General | Ignore Bank Full (꺼짐) · Continue Thieving on Stun (꺼짐) · Auto Restart Dungeon (켜짐) · Show Virtual Levels · Perfect Cook 허용 · 「Open on Wiki」 아이콘 |
| Notification | §6 의 항목 전부 (지금 모드 v2 · 위치 · 시간 · 확인 창) |
| Minibar | 스킬 미니바 · 전투 미니바 · 전투 화면에도 표시 · 장비 세트 · 적 HP 막대 |
| Melvor Cloud | Auto Save to Cloud (켜짐) |
| Steam and Epic | 확대 비율(기본 100%) · 전체 화면 |
| Interface | **다크 모드**(켜짐) · **Super Dark Mode** · 확장팩 구역 배경색 · **배경 그림 10종** · **Default Page on Load** · 작은 레벨업 알림 · **Mini Sidebar** · **숫자 형식**(1,000K 형/1M 형) · 쉼표 제거 · **Minor Accessibility Features** |
| Performance | 데미지 스플래시 · 진행 막대 렌더 · CPU/GPU 절약(§7-1) |
| Key Bindings | 지도 이동/확대 6개(Cartography 전용) |
| Account | Export Save · Download Save · Delete Character · Fix my Save |
| Into the Abyss · Atlas of Discovery · Throne of the Herald | 영역 선택 방식 · 지도 품질 · 「모든 스킬을 99로 되돌리기」 |

- **읽는 것을 돕는 설정**: 색맹 모드(`RedGreen`) · 다크/슈퍼다크 · 숫자 형식(K/M) · 쉼표 제거 · 모바일 스와이프 사이드바 · 알림 위치/시간 · **「Minor Accessibility Features」** — 은행 아이템 · 알림 등 **아이콘만 있는 곳에 이름 글을 붙여** 스크린 리더가 읽게 한다(위키·코드 일치). FAQ 에는 「은행 아이템마다 글이 겹쳐 보인다 → 이 설정을 끄라」는 문답이 있다 [위키/jina Settings · FAQ].

### 8-2. 언어 [사이트][Steam][데이터/계산]
| 항목 | 값 |
|---|---|
| 로그인 화면 언어 버튼 | English · Lemon(만우절) · 简体中文 · 繁體中文 · Français · Deutsch · Português · Português-Brasil · Italiano · **한국어** · 日本語 · Español-España · Русский · Türkçe — 코드 `LANGS` 는 `carrot`(또 다른 장난 언어)까지 15개 |
| Steam 상점 표기 | English · French · Italian · German · Spanish-Spain · Japanese · **Korean** · Portuguese-Portugal · Portuguese-Brazil · Russian · Simplified/Traditional Chinese · Turkish (**13개**) |
| 번역 파일 | `lang/<코드>.json` 하나에 **14,720키** — `en.json` 1.27MB · `ko.json` 1.39MB. `ko.json` 값 중 **14,625개에 한글 포함**(99.4%) · 영어 원문과 같은 값 76개 |
| 키 이름 | `ITEM_*`(4,716 · 이름은 `ITEM_NAME_<id>`) · `MODIFIER_*`(1,459) · `SPECIAL_*`(1,258) · `MENU_*` · `SHOP_*` · `TOWNSHIP_*` · `LORE_*` · `MONSTER_*` · `PAGE_NAME_<페이지 id>` · `SETTINGS_*`(139) · `GAME_GUIDE_*`(310). 데이터 JSON 에는 **영어 문자열이 그대로** 들어 있고 `nameLang` · `descriptionLang` 같은 필드가 번역 키를 가리킨다 |
| 동작 | 언어를 바꾸면 **페이지를 새로 고친다**(`setLanguage(...); location.reload()`) · `Intl.Collator` 를 그 언어로 만들어 정렬 · 알림 · 스위트얼럿 버튼 문구도 번역 |

번역 예 — 페이지 이름 `Combat`→`전투` · `Completion Log`→`완료 기록` · `Non-Combat`→`비전투` · 아이템 `Bronze Sword`→`청동 검` [데이터/계산 `lang/ko.json`]. **한국어가 정식 지원 언어**다.

## 9. 플랫폼과 기술 구조

### 9-1. 플랫폼 [사이트][위키/jina FAQ][Steam][기사]
| 플랫폼 | 확인된 사실 |
|---|---|
| **웹** | `melvoridle.com` — 무료 체험판(Demo) + 본편 해금. 광고 후원 사이트(개인정보 방침에 CafeMedia 광고 · Google Analytics 언급) |
| **Steam** | 2021-11-18 정식 · Windows/Mac/Linux · 개발 Games by Malcs · 배급 Jagex · 업적 92개(`steamAchievements`) · 트레이딩 카드 · Discord Rich Presence · DLC 3종(ToTH · AoD · ItA) · 「인터넷 연결 필요」 · **미세결제 없음** |
| **Epic Games** | 같은 코드에 `epicgames.melvoridle.com` 분기가 있다 |
| **iOS / Android** | 2021-11-18 정식 · 같은 웹 게임을 **앱에 감싼 것**이다 — 사용자 에이전트에 `gonative` 가 들어 있는지로 분기하고(GoNative 래퍼) OneSignal · 인앱결제 · 네이티브 클라우드 백업 · 햅틱을 부른다. `index_mobile.php` 가 앱용 진입 페이지 [사이트][WebSearch 출시일] |
| 계정 | 웹/모바일/Steam **같은 Melvor Cloud 계정**으로 저장 공유. 단 「모바일에서 산 것은 Steam 판을 못 쓴다」 · 「같은 세이브를 두 기기에서 동시에 쓰면 진행을 잃을 수 있다」 [위키/jina FAQ] |

같은 웹 빌드가 **서브도메인**(`steam.` · `ios.` · `android.` · `epicgames.melvoridle.com`)으로 플랫폼 분기를 한다(`location.origin` 검사) — 「UI 크기만 다르고 게임은 같다」(위키 FAQ) [사이트].

### 9-2. 기술 구조 [사이트]
| 층 | 내용 |
|---|---|
| **틀** | **프레임워크 없는 무빌드 웹** — `index.html` 이 `<script>` 로 `assets/js/built/*.js` **143개를 정해진 순서로** 그대로 로드한다(로드 순서 = 의존 순서). 각 파일 끝에 `//# sourceMappingURL=*.js.map` — **TypeScript 를 컴파일한 산출물**(맵 파일은 공개 안 됨 · 404) |
| **UI 부품** | **Web Components(커스텀 엘리먼트) `customElements.define` 247건** + HTML `<template>` **235종** — 카드 하나 · 막대 하나가 각각 커스텀 엘리먼트(`<woodcutting-tree>` `<artisan-menu>` `<bank-tab-menu>` `<progress-bar>` `<mastery-display>` `<skill-header>` …). **[해석]** 「화면 조각 = 데이터 하나를 받아 스스로 그리는 부품」 구조 |
| **CSS 틀** | **OneUI**(Bootstrap 4 기반 유료 관리자 템플릿 · `oneui.css` · 테마 `amethyst`) + 자체 `game.css` |
| **라이브러리** | 알림 Toastify · 창 SweetAlert2 · 툴팁 tippy.js · 드래그 정렬 Sortable · 검색 Fuse.js · 지도 Pixi.js + viewport · 저장 압축 fflate · 이벤트 mitt · IndexedDB Dexie · 그래프 배치 dagre · 가벼운 반응형 petite-vue · 계정 PlayFab SDK · 가시성 ifvisible · 폰트 Inter |
| **게임 데이터** | 클라이언트가 `assets/data/*.json` 을 **fetch** 로 받아 등록한다(§10) · 캐시 무효화 `DATA_VERSION = 528` · 언어 파일 `langVersion = 1656` |
| **서버** | 게임 진행은 **클라이언트**가 돈다 — 서버(PlayFab CloudScript)를 부르는 곳은 소유권 확인(`checkAppOwnership` · Steam/EOS/모바일 확장팩 상태) · 계정 삭제 · Steam 계정 연결 해제 등이고, 클라우드 세이브 · 결제 · 푸시 · 공지가 더해진다. 전투 · 스킬 계산이 서버에 있다는 증거는 코드에 없다 [해석] |

### 9-3. 세이브 · 클라우드 [사이트][위키/jina FAQ]
- **로컬**: 세이브 = 자체 이진 직렬화(`SaveWriter`)를 **zlib 압축 → base64 문자열**로 만들어 `localStorage` 에 슬롯 키(`<slot>saveGame`)로 저장 · 10초마다. **IndexedDB(Dexie `melvordb`)는 모드 저장에만** 쓰인다. 슬롯 8개. 내보내기는 세이브 문자열 · 다운로드 텍스트 · 「공유 URL」이고 가져오기는 URL 또는 문자열.
- **클라우드**: PlayFab(이메일/사용자명 + 비밀번호 · Apple/Google 로그인 코드는 있으나 `enableSignInWith… = false`) · 「Auto Save to Cloud」 · **「Force Save」** 버튼. 자동 클라우드 저장 간격은 **코드 기본값 23시간**(`PLAYFAB_AUTO_SAVE_INTERVAL`, 서버가 값을 주면 덮어씀)인데 위키 FAQ 는 **「12시간마다」** 라 적는다 — 어긋난다(서버 설정값이 12일 수 있음, 미확인).

### 9-4. 모드 지원 [사이트 `mod.js` · 위키/jina FAQ]
- 공식 **인게임 모드 매니저**(사이드바 「Mod Manager」, 설정에서 모드 켜기 필요) — 호스팅은 **mod.io**(찾아보기 · 구독 · 「My Mods」 · **프리셋(프로필)** 로 캐릭터마다 다른 모드 세트). 모드는 계정에 묶여 플랫폼 간 동기화(플랫폼 태그로 제한 가능).
- **모드 API 컨텍스트**: `gameData`(`addPackage` · `buildPackage`) · `characterStorage` / `accountStorage` · `settings` · `getResourceUrl` · `loadTemplates` · `loadStylesheet` · `loadScript` · `loadModule` · `loadData` · 생명주기 훅 `onModsLoaded` → `onCharacterSelectionLoaded` → `onInterfaceAvailable` → `onCharacterLoaded` → `onInterfaceReady` · `patch` / `isPatched`(클래스 메서드 덮어쓰기) · `share`(자원 공유). 모드는 `manifest.json` 으로 이름 · 네임스페이스를 선언한다. **핵심**: 모드가 새 콘텐츠를 넣는 `gameData.addPackage` 는 **공식 확장팩이 로드되는 `game.registerDataPackage` 를 그대로** 부른다 — 모드 데이터 형식 = 공식 데이터 형식(§10). 위키는 「Combat Simulator」 등 전투 안전 검증 모드를 언급한다.

## 10. 데이터 주도 구조

### 10-1. 파일 5개의 뼈대 [데이터]
```
{ "$schema": "../schema/gameData.json",
  "namespace": "melvorD",
  "data":          { pages, gamemodes, items, monsters, shopPurchases, skillData, modifiers, … },
  "modifications": { items, skillData, shopPurchases, pages, gamemodes, … },
  "dependentData": [ { "namespace": "melvorTotH", "data": {…}, "modifications": {…} } ],   // AoD · ItA 만
  "namespaceChange": { "items": [ { "newNamespace", "itemType", "ids" } ] } }              // Demo · ToTH 만
```

| 파일 | 네임스페이스 | `data` 키 수 | `modifications` 키 수 | 그 밖 |
|---|---|---|---|---|
| melvorDemo | `melvorD` | 32 (items 671 · monsters 66 · pages 26 · modifiers **570** …) | 1 (modifiers 20) | `namespaceChange` |
| melvorFull | `melvorF` | 35 (items 735 · monsters 106 · steamAchievements 92 …) | 7 (modifiers 23 · items 3 · skillData 1 …) | — |
| melvorTotH | `melvorTotH` | 27 (items 602 …) | 6 (shopUpgradeChains 3 · cookingCategories 3 …) | `namespaceChange` |
| melvorExpansion2 | `melvorAoD` | 28 (items 699 · ancientRelics 156 …) | 7 (dungeons **35**) | `dependentData` (ToTH) |
| melvorItA | `melvorItA` | 39 (items 1,041 · attacks 204 …) | 6 | `dependentData` (AoD) |

- **`$schema`** 는 상대 경로 `../schema/gameData.json` — 실제 파일은 `https://melvoridle.com/assets/schema/gameData.json`(JSON Schema 2020-12 · **`$defs` 632개** · `GameData` 속성 **62종** · `GameDataModifications` **19종**)이고 공개돼 있다. 각 필드에 설명문이 달려 있어 「모드 제작자용 문서」를 겸한다 [사이트].
- **네임스페이스**: `melvorD`(Demo) · `melvorF`(Full) · `melvorTotH` · `melvorAoD` · `melvorItA` — 파일 이름 `melvorExpansion2` 와 네임스페이스 `melvorAoD` 가 다르다. 게임 코드는 이 외에 **이벤트용 데이터 패키지 2개**(`melvorBirthday2023` · `melvorAprilFools2024`)도 조건부로 로드한다 [사이트 `cloudManager.js`].
- **id 규칙**: 자기 파일 안에서는 **접두사 없이** 쓴다(`"id": "Bronze_Helmet"`). 다른 파일을 가리킬 때는 **`네임스페이스:이름`** 을 붙인다(`"melvorD:Firemaking"` · `"melvorF:Ash"`). 그래서 **Full 이 Demo 의 스킬 · 아이템을 이름으로 부르며 고칠 수 있다** — 그러나 **거꾸로는 안 된다**(Demo 는 Full 을 모른다).

### 10-2. 로드 순서와 등록 [사이트 `game.js` · `cloudManager.js`]
```
Demo (항상)
  └ Full           (본편 해금 시)
      ├ 이벤트 패키지 (기간 중)
      ├ TotH         (소유 + 켬)
      ├ AoD          (소유 + 켬)      ← dependentData: TotH 가 등록돼 있을 때만 적용
      └ ItA          (소유 + 켬)      ← dependentData: AoD 가 등록돼 있을 때만 적용
```

`registerDataPackage(pkg)` 의 순서: ① `data` 를 **하드 의존 순서**(realms → damageTypes → **modifiers** → 전투 효과 → … )로 등록 ② `dependentData` 는 **해당 네임스페이스가 이미 등록됐을 때만** 그 `data` 를 등록하고 `modifications` 를 적용 ③ 패키지의 `modifications` 적용 ④ `namespaceChange` 등록 [사이트]. **소유하지 않은 확장팩은 파일 자체를 받지 않으니** 화면에 아예 없다.

### 10-3. `modifications` — 확장팩이 본편을 고치는 방식 [데이터]
「본편 데이터 파일을 안 고치고」 뒤 파일이 **덧붙이는 명령**으로 바꾼다. 실제 파일에서 나온 형태:

| 명령 | 실제 예 | 하는 일 |
|---|---|---|
| 목록에 끼워 넣기 `{add:[{insertAt, afterID, ids}]}` | Full → `combatAreaCategories`: `melvorD:Dungeons` 의 `areas` 에 `insertAt "After" afterID "melvorD:Spider_Forest"` 뒤로 `melvorF:Miolite_Caves` … | 던전 목록의 **정확한 자리**에 신규를 삽입 |
| 항목 안 배열에 추가 `{add:[…]}` | Full → `skillData[Firemaking].logs[Magic_Logs].primaryProducts: {add:[melvorF:Ash, melvorF:Stardust]}` · ToTH 는 같은 곳에 `melvorTotH:Charcoal` | 이미 있는 통나무 레시피의 **산출물 목록을 늘림** |
| 항목의 조건 교체 `{remove:[…], add:[…]}` | Full → `equipmentSlots[Passive].requirements: {remove:["SkillLevel"], add:[{type:"DungeonCompletion", dungeonID:"melvorF:Into_the_Mist"}]}` | Demo 에서 「Attack 레벨 1000」(사실상 잠김)이던 Passive 슬롯 해금 조건을 「던전 클리어」로 **바꿈** |
| 수치 · 조건을 얹기 | Full → `shopPurchases[Extra_Bank_Slot].buyLimitOverrides: [{gamemodeID: melvorF:Hardcore, maximum: 88}]` · `pets[Mac].modifiers.add` · ItA → `gamemodes[Adventure].abyssalLevelCapCost` | 게임 모드별 · 효과 추가 |
| 페이지에 스킬 붙이기 | ItA → `pages[melvorD:Combat].skills.add: [{skillID: melvorItA:Corruption}]` | 전투 화면에 **새 스킬** 부착 (§11) |
| **같은 스킬 데이터를 여러 파일이 나눠 가짐** | `skillData[melvorD:Woodcutting]` 이 Demo(`trees` 9) · Full(`bannedJewleryIDs` · `minibar`) · ToTH(`trees` 추가) · AoD · ItA 에 **각각** 등장 — 같은 `skillID` 는 합쳐진다 | 스킬 하나가 5개 파일에 흩어진다 |
| **id 이사** `namespaceChange` | Demo: `Burning_Amulet_of_Charcoal` 을 `melvorTotH` 로 · ToTH: `Generous_Fire_Spirit` 외 5종을 `melvorD` 로 | 아이템의 소속 네임스페이스를 옮기되 **옛 세이브의 id 가 살아 있게** 함 |

- **`dependentData`**: AoD 는 `[{namespace: melvorTotH, data: {skillData: [Cartography 종이 레시피 — 재료 `melvorTotH:Spruce_Logs`]}, modifications: {gamemodes}}]` — 「TotH 를 가졌을 때만」 Cartography 가 ToTH 나무로 종이를 만든다. ItA 는 `[{namespace: melvorAoD, data: {ancientRelicsDisplayOrder: [...]}, modifications: {items, gamemodes}}]`. **[해석]** 확장팩끼리의 곱집합을 「어느 쪽도 상대를 모르는 채로」 조합하는 장치.
- 표시 순서 자체도 데이터다 — `…DisplayOrder` · `…Order` 배열이 `{insertAt: "Start" | "After" | "Before" | "End", afterID, ids}` 로 순서를 만든다(`bankSortOrder` · `shopDisplayOrder` · `shopCategoryOrder` · `tutorialStageOrder` · `combatAreaCategoryOrder` …).

### 10-4. `modifiers` — 「효과」의 단일 어휘 [데이터]
Demo 의 `data.modifiers` **570개**는 게임의 모든 「+N% / −N」 효과를 표현하는 **키 사전**이다(아이템 · 펫 · 상점 · 마스터리 · 마을 · 던전 보상이 전부 이 키를 쓴다). 한 항목:

```
{ "id": "flatMaxHit", "isCombat": true, "allowEnemy": true, "modifyValue": "value*hpMultiplier",
  "allowedScopes": [ { "scopes": {}, "descriptions": [
      { "text": "-${value} Max Hit", "lang": "MODIFIER_DATA_decreasedMaxHitFlat", "below": 0 },
      { "text": "+${value} Max Hit", "lang": "MODIFIER_DATA_increasedMaxHitFlat", "above": 0 } ],
    "posAliases": [{"key":"increasedMaxHitFlat"}], "negAliases": [{"key":"decreasedMaxHitFlat"}] } ] }
```

| 필드 | 뜻 (스키마 설명) |
|---|---|
| `id` | 효과 키 (예 `accuracyRating` `flatMaxHit`) |
| `isCombat` (105개) | 값이 바뀌면 전투 능력치를 다시 계산해야 하는가 |
| `allowEnemy` (176개) | 몬스터에게도 붙일 수 있는가 |
| `allowPositive` · `allowNegative` (288개) · `inverted` (86개) | 양수/음수 허용 · 음수를 좋은 것으로 뒤집는 효과(예 「간격 감소」) |
| `modifyValue` (44개) | 화면에 적기 전에 값에 적용하는 **식**(문자열) |
| **`allowedScopes`** | 이 효과가 붙을 수 있는 **범위 조합** — `{}`(전역) · `skill` · `currency` · `damageType` · `realm` · `action` · `category` · `subcategory` · `item` · `effectGroup` 의 조합 27종. 예: `{skill}` 「Woodcutting XP +N%」 · `{skill, category}` 「Mining 의 광석 +N」 · `{currency}` 「GP +N%」 |
| `descriptions[]` | **화면 문장 템플릿** — `text`(`${value}` 자리) + `lang`(번역 키) + `above`/`below`(부호별로 다른 문장) + `includeSign` |
| `posAliases` · `negAliases` (합 737개) | 옛 키 이름(`increasedEssenceFromMining` 등)을 「범위가 붙은 새 키」로 **대응** — 옛 세이브/데이터 호환 |

- 분포: 범위 없음(전역) **449개** / `currency` 43 / `realm` 39 / `skill` 35 / `damageType` 30 / `action` 18 / 나머지는 조합 [데이터/계산]. 전투 105 · 비전투 465.
- **사용**: 아이템은 `"modifiers": {"currencyGainFromCombat": [{"currencyID": "melvorD:GP", "value": 15}], "allowSignetDrops": 1}` 식으로 키 → 범위 값 배열을 적는다 — Demo 에서 modifiers 를 가진 아이템 52개. 상점 항목 `contains.modifiers` · 펫 · 마스터리 풀 · 계절 · 조건부 효과도 같은 모양 [데이터].
- **확장은 `modifications.modifiers` 로**: Full 23 · ToTH 7 · AoD 1 · ItA 2건이 기존 modifier 의 `allowedScopes` 에 **새 별칭 · 범위**를 덧붙인다(예 Full 이 `flatBasePrimaryProductQuantity` 에 소환 `Leprechaun` 의 별칭 추가). AoD 3 · ItA 2 는 완전히 새 modifier 를 등록.
- **[해석]** 효과 하나를 「키 + 범위 + 문장 템플릿」 세 조각으로 나눠 두어, **아이템 설명문이 데이터에서 자동으로 만들어진다**(수치를 바꾸면 툴팁이 따라 바뀜) — 번역 키(`MODIFIER_DATA_*` 1,459개 계열)가 이 템플릿과 짝이다.

## 11. 확장팩이 더한 것

| 확장 | 화면 · 구조 측면에서 더한 것 [데이터][사이트] |
|---|---|
| **Throne of the Herald** (2022-10-20) | **새 페이지 없음** — 기존 스킬에 콘텐츠(`data` 27키 · 아이템 602) · 스킬 레벨 상한 99→120(`skillLevelCapIncreases`) · 상점 「Superior Skillcapes」 분류 · 사이드바 배너 |
| **Atlas of Discovery** (2023-09-04) | **페이지 2개** — `Cartography`(Pixi 지도 · 종이 · 여행 이벤트 `travelEvents` · 지도 `worldMaps`) · `Archaeology`(`digSites` · `tools` · `museumRewards`) · **고대 유물(`ancientRelics` 156 + 「Ancient Relics」 사이드바 분류)** · 게임 모드 3 · 설정 구획(지도 품질 · 키 바인딩) · 던전 `modifications` 35건 |
| **Into the Abyss** (2024-03-14) | **페이지 1개** — `Harvesting` + 전투 페이지에 스킬 `Corruption` 을 `pages.modifications` 로 붙임 · **영역(Realm) 개념**(`realms` 2 · 「Realm Selection」 분류 · Abyssal 레벨/XP/통화) · **스킬 트리**(`skillTrees` · 사이드바 「View Skill Trees」) · 기존 스킬 26개에 `hasAbyssalLevels` 등을 얹는 `skillData` · 은행 탭 +5 · `abyssDepths` · 아이템 1,041 |
| **공통** | 세 확장 모두 **자기 파일을 `data`(새 것) + `modifications`(본편 수정) + `dependentData`(다른 확장과의 교차)로 나눠** 붙는다(§10). 사이드바에 「소유 표시 배너」 · 「구매 유도 버튼」이 데이터가 아니라 **코드에 하드코딩**돼 있다 |

## 12. 출처 · 확인 못 한 것

**출처**
- [데이터] `melvor_data/` 5종 · [사이트] `melvoridle.com` 의 `index.html` · `index_mobile.php` · `assets/js/built/*.js`(143개) · `assets/css/game.css` · `assets/schema/gameData.json` · `lang/en.json` · `lang/ko.json`
- [위키/jina] https://wiki.melvoridle.com/w/Settings · /Bank · /Combat · /Beginners_Guide · /Mods(→ FAQ) · /Minibar(404)
- [Steam] https://store.steampowered.com/api/appdetails?appids=1267910 · https://steamcommunity.com/app/1267910/discussions/0/591762563949134719
- [기사] https://gigazine.net/gsc_news/en/20220116-melvor-idle · https://www.gamingonlinux.com/2021/06/melvor-idle-is-probably-one-of-the-best-idle-games-around/
- [WebSearch 스니펫] 모바일 출시일(2021-11-18 iOS · Android · Steam 동시 · 2023-02-02 Expanded Edition) — https://www.jagex.com/news/melvor-idle-version-1-0-launches-on-pc-and-mobile 등 · 푸시 알림 검색은 결과 없음

**확인 못 한 것 (숨기지 않고 전부)**
1. **화면 배치 순서** — `<template>` HTML 을 받지 못해 스킬 · 전투 화면의 요소가 위에서 아래로 어떤 순서 · 크기로 놓이는지는 요소 이름 · 위키 서술 · 추정뿐이다. 스크린샷은 한 장도 못 봤다. 모바일 레이아웃(사이드바가 어떻게 접히는지)도 코드의 `enableSwipeSidebar` 외에 미확인.
2. **푸시 알림의 실제 발송** — 설정 2항목 · OneSignal 예약 함수는 있으나 클라이언트에서 부르는 곳을 못 찾았다(서버 · 네이티브 쪽일 수 있음). 조건 · 시각 미확인.
3. **자동 클라우드 저장 간격** — 코드 기본 23시간 vs 위키 FAQ 12시간. 어느 쪽이 현행인지 미확인.
4. **미니바 위치** — 위키 「오른쪽 바」 vs 코드 `skill-footer-minibar`(하단). 화면 크기별 전환인지 미확인.
5. **「전투 로그 없음」 · 「소리 없음」은 부재 증명**이다 — 143개 JS 전수 grep · 설정 · 위키 · 2022년 리뷰가 일치하나, 로그인 뒤 별도 리소스나 이후 빌드 · 앱 전용 리소스에 있다면 놓쳤다.
6. **Steam / Epic 이 백그라운드에서 계속 도는 이유** — 코드가 `blur` 처리를 건너뛰는 것까지만 확인. 데스크톱 셸이 무엇인지(Electron · NW.js — `parent.greenworks` / `parent.steamworks` 접근으로 보아 iframe 안에서 도는 셸)는 추정이다.
7. **접속 빈도 근거** — Steam 토론 한 건의 개인 서술이고 통계가 아니다.
8. **Melvor Idle 2** — 검색 결과에 「Melvor Idle 2 announced」(r/iosgaming 2025-04-23)가 나왔으나 열어 보지 않았다. 이 문서는 1편(v1.3.1) 기준이다.
9. **로그인 게이트 뒤 화면**(Statistics · Completion Log 의 실제 열 구성 · Township 화면 등)은 조사하지 않았다 — 다른 갈래 문서의 몫.
