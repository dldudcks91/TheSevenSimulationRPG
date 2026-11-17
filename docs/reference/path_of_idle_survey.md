# Path of Idle: Old Gods Rising — 참고작 조사

> 목적: 스팀 방치형 ARPG 「Path of Idle: Old Gods Rising」(Small Mill)이 **켜 둔 동안 무엇을 시키고 · 장비를 어떻게 다루게 하고 · 꺼진 동안 무엇을 돌리고 · 유저가 무엇에 반응했는지**를 모은 조사. 우리 게임과의 대조는 §7 에 관찰만 적는다.
> 조사 방식: 2026-11-17 · 스팀 상점 API · 상점 페이지 · 스팀 뉴스 API(패치 노트 19건 포함 40건) · 스팀 커뮤니티 리뷰 페이지 · 공략 사이트 4곳. **게임을 직접 돌려 확인하지 않았다.** Reddit 은 시도하지 않았다.
> 리뷰 표본: 영어 345건(전수 · 긍정 268 / 부정 77) + 중국어(간체) 400건(긍정 304 / 부정 96) + 한국어 19 · 러시아어 33 · 독일어 30 = **827건.** 영어 전체와 중국어 · 한국어 · 러시아어 · 독일어 부정은 본문을 읽었고(긴 글은 앞 400 ~ 1,500자), 중국어 긍정은 키워드로만 훑었다. 스팀 전체 1,342건 중 약 62%.
> 방법 이탈: 지시한 `appreviews` JSON 은 이 환경에서 모든 앱이 302(스토어 첫 화면)로 돌아와 못 썼다. 같은 리뷰를 보여 주는 커뮤니티 리뷰 페이지(`homecontent`)를 cursor 로 넘겨 대신 받았다.
> ⚠ **이 문서는 조사이지 결정이 아니다.** 확정은 [GAME_DESIGN.md §9](../game_design/GAME_DESIGN.md) 가 갖는다. 인용된 수치는 **그 게임의 것**이다 — `src/data/*.csv` 로 옮기지 않는다.
> ⚠ 패치 노트는 번역체이고 **현재 버전(1.1.6 · 2026-10-26)** 기준이다. 리뷰는 8월 초기판 이야기가 섞여 있다.
> 짝 문서: [steam_market_target_survey.md](steam_market_target_survey.md) · [lootun/00_overview.md](lootun/00_overview.md) · [melvoridle/10_reception_business.md](melvoridle/10_reception_business.md)

신뢰도 표기 — **[원문]** 상점 · 패치 노트 직접 확인 · **[공략]** 제3자 공략 · **[리뷰]** 유저 증언 · **(리뷰 추정)** 리뷰에서 미루어 짐작 · **⚠미확인** 출처로 못 확인

---

## 요약

- **무엇** — 접속 중 영웅 1~3명짜리 팀을 자동 실시간 전투에 보내고, 상자에서 쏟아지는 장비의 접사(옵션)를 고르고 굴려 빌드를 짜는 **디아블로 · PoE 식 아이템 방치형**. 스팀 1,342건 · 77% 긍정(Mostly Positive) · 정가 $9.99
- **우리와 가장 크게 겹치는 곳** — 「장비 접사 min-max 가 본체, 조작이 아니라 빌드 · 편성 · 배분」 · 팀 3개 동시 운영 · 챕터 진행이 기능을 하나씩 연다 · 노말 → 나이트메어 → 헬의 난이도 단계
- **가장 크게 다른 곳** — **꺼져 있는 동안 보상이 쌓인다**(원정 산출을 오프라인에 환산 · 반대 방향) · **끝없는 탑이 있다**(무한 수직 · 반대 방향) · PvP 없음(단일 플레이 · 시즌제 세이브)
- **반응의 축** — 긍정은 「빌드 깊이 · 개발자 속도 · 가격」, 부정은 「장비 정리 노동 · 스탯 과다와 설명 부족 · 보상감 없는 지루함 · AI 아트 · 번역」. **「방치형인데 안 방치된다」** 가 양쪽 리뷰에서 모두 나온다

---

## 1. 기본 정보

**이 문서가 다루는 게임** — 스팀 앱 4243990 「Path of Idle: Old Gods Rising」. 같은 이름 계열의 다른 게임이 둘 있어 구분한다.

| 구분 | 게임 | 비고 |
|---|---|---|
| **다룸** | Path of Idle: Old Gods Rising (app 4243990) | 2026-08-12 출시 · Small Mill |
| 안 다룸 | Path of Idle Immortals (app 4195340) | 수선(修仙) 방치 RPG · 다른 개발사 · 출시 전 |
| 안 다룸 | Path of the Idle Cultivator (app 5007580) | 스팀 검색에 같이 걸림 · 별개 게임 |
| 안 다룸 | Path of Idling: Idle RPG | 2019 Kongregate 브라우저 게임 · 무관 |

모바일판 Path of Idle 은 검색으로 찾지 못했다 — ⚠미확인.

| 항목 | 값 | 신뢰도 |
|---|---|---|
| 개발사 · 배급사 | Small Mill (둘 다) | 원문 |
| 출시일 | 2026-08-12 (데모는 2026-03 부터, 출시 때 데모 종료 · 세이브 이어짐) | 원문 |
| 정식 / 얼리액세스 | **정식 출시**(얼리액세스 표기 없음 · 패치 노트도 「Full Release」) | 원문 |
| 가격 | $9.99 / ₩10,500 (조회 시점 20% 할인 중) | 원문 |
| DLC | Supporter Pack $1.99 · Halloween Transmog $1.99 | 원문 |
| 플랫폼 | Windows · macOS (Linux 없음) | 원문 |
| 언어 | 영어 · 간체 · 번체 · 독일어 · 러시아어 · 프랑스어 (독 · 러 · 프는 출시 뒤 추가) | 원문 |
| 스팀 기능 | 싱글 · 업적(25) · 클라우드 세이브 · 가족 공유 | 원문 |
| 리뷰 | **1,342건 · 77% 긍정(Mostly Positive)** · 최근 30일 60건 83% | 원문 |
| 태그 | RPG · Idler · Strategy · Adventure · Casual · Loot · Indie · Party-Based RPG · Dark Fantasy · 2D · Singleplayer · Auto Battler · Hack and Slash · Dark · Combat · Incremental · Hand-drawn · Strategy RPG · Resource Management · Automation | 원문 |
| 장르 칸 | Adventure · Casual · Indie · RPG · Strategy | 원문 |
| 규모 | 개발자 1~2명으로 보임 · 중국어권 팀으로 보임 | (리뷰 추정) |
| 갱신 속도 | 출시 2주 뒤까지 사실상 매일, 이후 3~10일 간격 · 마지막 공지 10-26 | 원문 |
| 아트 | 다크 판타지 핸드드로잉 · **AI 보조 약 10%** 상점에 공개(전투 장면 일부 · 재능 아이콘) | 원문 |
| 최소 사양 | i5-750 · 8GB · GTX 750 Ti | 원문 |

출처
- https://store.steampowered.com/app/4243990/ · https://store.steampowered.com/api/appdetails?appids=4243990
- https://store.steampowered.com/app/4195340/ · https://store.steampowered.com/api/storesearch/?term=path%20of%20idle&cc=us
- https://www.kongregate.com/games/rariasdev/path-of-idling-idle-rpg (동명 유사작 확인)
- https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=4243990&count=50

---

## 2. 코어 루프

**한 줄** — 죄수를 사서 「신의 종」(Godsworn)으로 만들고 → 1~3명을 모험 칸에 세우면 자동 실시간 전투가 챕터를 밀고 → 상자에서 장비가 나오면 접사를 보고 갈아 끼우고 굴려 빌드를 짠다. [원문 · 공략 · 리뷰]

| 질문 | 답 | 신뢰도 |
|---|---|---|
| 전투 | **완전 자동 · 실시간.** 조작 없음 | 원문 |
| 파티 | 영웅 **1~3명이 한 모험 칸**. 인원 수가 몬스터 수와 세기를 정한다 | 원문(패치 0.0.19) |
| 동시 가동 | 모험 칸 3개(둘째 칸 챕터 5 클리어 · 셋째 칸 챕터 12 클리어) → 최대 9영웅 | 원문(1.1.2) · 리뷰 |
| 영웅 얻기 | 감옥(Prison)에서 골드로 죄수를 「홀려」(Bewitch) 영웅화. 등급 · 직업 · 스탯 · 스킬이 랜덤 | 공략 · 리뷰 |
| 직업 | 6 — Warrior · Mage · Hunter · Cleric · Priest · Mercenary | 원문 · 공략 |
| 관전 | 전투를 보여 주지만 보는 일이 본체가 아니다. 미니 창 · 플로팅 모드 · 게임 숨기기 단축키 | 원문 |

**켜 둔 동안 플레이어가 하는 결정**

| 결정 | 내용 |
|---|---|
| 누구를 세울까 | 죄수 재굴림 · 직업 · 스킬 선택 · 슬롯 순서(앞 칸이 맞는다) |
| 장비 고르기 | 상자를 열어 접사 비교 · 세트 · 룬워드 · 보관 · 판매 |
| 어디를 돌까 | Journey(챕터) · Explore(재료) · Sanctum(영구 배율) · Outlands(후반 재료) · Divine Tower · Doom |
| 무엇을 올릴까 | 마을 건물 · Stele 퀘스트가 건물 최대 레벨을 연다 · Worshiper 계정 보너스 · Class Golem |
| 막혔을 때 | 빌드 재편성 · 장비 재굴림 · 자원 대기 |

**방치와 직접 조작의 비율** — 리뷰의 가장 큰 논쟁거리다.
- 「절반은 방치, 절반은 직접 관리」 · 「방치형인데 숨 쉴 틈이 없다」 [리뷰]
- 초반은 손이 많이 가고 후반에 진짜 방치가 된다는 증언과, 후반에 재빌드로 다시 바빠진다는 증언이 갈린다 [리뷰]
- 막혀서 같은 판을 다시 돌면 드롭이 급감한다는 증언 → 껐다 켜서 오프라인 보상을 받는 쪽이 낫다는 말이 나온다 [리뷰 · 8-13]. 8-15 패치가 드롭률을 고정(300%)으로 바꿨으니 지금도 그런지는 ⚠미확인

**진행의 뼈대**
- Journey 는 챕터 20개로 보인다(리뷰 추정 — 「18/20」 · 「Chapter 20 map」 패치) · 챕터마다 보스 · 챕터 6 전후에서 속도가 꺾인다는 증언이 여럿 [리뷰]
- 기능이 챕터 클리어로 열린다: 둘째 모험 칸 = 챕터 5 · Divine Tower 와 Training Grounds = 챕터 8 · 유니크 드롭 = 챕터 10 · 셋째 칸 = 챕터 12 [원문 — 1.1.1 · 1.1.2 · 1.1.4]
- 「너무 일찍 너무 많이 열려 새 유저가 혼란스럽다」가 해금을 미룬 이유로 패치 노트에 적혀 있다 [원문]
- 길잡이는 **Stele**(석비)의 퀘스트 목록이다. 풀면 건물 최대 레벨이 오른다 [공략]

출처
- https://store.steampowered.com/app/4243990/ (기능 목록)
- https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=4243990&count=50 (패치 0.0.19 · 1.1.1 · 1.1.2 · 1.1.4)
- https://prodigygamers.com/2026/08/17/path-of-idle-old-gods-rising-beginners-guide-systems-team-building/
- https://allthings.how/path-of-idle-old-gods-rising-beginner-tips-what-to-prioritize-first/
- https://www.treyexgaming.com/path-of-idle-old-gods-rising-beginner-guide/
- https://steamcommunity.com/app/4243990/reviews/

---

## 3. 아이템 체계

### 3-1. 등급

| 층 | 값 | 신뢰도 |
|---|---|---|
| 희귀도 | Normal · Fine · Rare · Legendary · Unique · Set · Mythic | 공략(한 곳) |
| 색 | 회 · 파 · 노 · 주황 · (세트 초록) · (Mythic 빨강은 리뷰) | 공략 · 리뷰 |
| 품질(Grade) | Normal +0% · Superior +20% · Perfect +35% — 드롭 때 굴리고 **주스탯 · 접사 수치는 이 값으로 고정**(범위 굴림 폐지 · 1.0.13) | 원문 |
| 외형 | Transmog — 장비 모습을 바꾸는 외형 전용 | 원문 |

### 3-2. 접사 구조

| 종류 | 설명 | 신뢰도 |
|---|---|---|
| Base | 기본 능력치 · 대장간 단련으로 오름 | 원문 · 공략 |
| Fine | 푸른 접사. 접사마다 레벨 · 시장 업그레이드가 최저 레벨(2/4/6)을 보장 | 원문 |
| Rare | 노란 접사. 부위별 풀이 32~35 에서 30 으로 줄었다 | 원문 |
| Set · Legendary · Unique | 세트 보너스 · 전설 접사 · 스킬을 바꾸는 유니크 | 원문 |
| Rune | 소켓에 박는 룬 · 3소켓이면 **룬워드**로 액티브 스킬이 붙는다 | 공략 |
| Corrupt | 스텔레에서 입히는 부패 접사. 3단계(1/3/5) · 눈물(Soulcleansing Tear)로 제거 | 원문 |

- **접사 봉인(Seal)** — 도감(Codex)에서 원하지 않는 접사를 막는다. 도감 「인지(Awareness)」 레벨이 봉인 한도를 정한다. Rare 도감에서 정하고 상위 등급에 동기화. 최대 16단계 · 아이템마다 추천 봉인 최대 10개를 클릭 한 번에 켠다 [원문 — 1.0.6.2 · 1.1.1 · 1.1.5]
- **피를 써서 접사 잠금** — 장비의 접사를 잠그고 나머지를 굴린다 [리뷰]
- 옵션 가짓수가 많다: 「한 장비에 5~6개」 · 「20개」(리뷰 증언이 갈린다 — 정확한 줄 수 ⚠미확인)
- 같은 효과의 접사가 겹친다는 불만 — 「Elemental Damage 와 Elemental Attack 과 Spell damage 가 다 같다」 [리뷰]
- 일부는 부위별 풀에서 삭제 중이다 — On-Kill Recovery 를 통째로 제거(1.1.3), Health · Mana on Kill 삭제(1.1.0) [원문]

### 3-3. 획득 경로

| 경로 | 내용 | 신뢰도 |
|---|---|---|
| 모험 상자 | Journey 에서 상자가 나온다. 드롭률 300% 고정(1.0.3) | 원문 |
| Explore | 보물섬 등 재료 · 상자. Gazing Eye 로 맵 재굴림 | 원문 · 공략 |
| 시장(Market) | 골드로 장비 구매 · 자동 구매 설정(등급 · 소켓 · 기본 접사 레벨) · 되팔기 | 원문 |
| 주문(Orders) | 안 쓰는 장비를 넘겨 재료를 받는다 | 공략 |
| Vault | 룬을 화폐로 Legendary · Unique · Set 구매 | 공략 |
| 유니크 | 챕터 10 클리어 뒤부터 드롭 | 원문 |
| Boon | 일정 시간마다 3개 중 1개 고르는 상자(Supporter Pack 으로 최대 레벨) | 원문 |
| 후반 | Divine Tower · Doom 보상 · Sanctum 합성 | 원문 · 공략 |

### 3-4. 제작 · 강화

| 장치 | 하는 일 | 신뢰도 |
|---|---|---|
| Forging(대장간) | 골드로 **기본 능력치만** 올린다. 접사는 안 바뀐다. 10레벨마다 기본 접사 레벨 +1(최대 +3) | 원문 · 공략 |
| Socketing | 룬 박기 · 룬워드 | 공략 |
| Refining | Legendary → Mythic 로 등급 시도. 운 요소 · 대장간 업그레이드가 확률 보정 | 공략 |
| Dark Star | 장비의 Rare 접사를 재굴림(접사 레벨은 유지) | 원문 |
| Golem Reshape | 직업 마스터리를 재굴림 · 마스터리 잠금 지원 | 원문 |
| Corrupt / 눈물 | 부패 추가 · 제거 | 원문 |

- 손으로 규격에 맞춰 만드는 제작은 없다 — 「정확한 스펙으로 크래프팅할 방법이 없다」 [리뷰]
- 장비는 **레벨업이 안 된다**(새 레벨 장비를 다시 모아야 한다)는 증언 [리뷰 · 중국어]

### 3-5. 인벤토리 관리

| 장치 | 내용 | 신뢰도 |
|---|---|---|
| 가방 · 주머니 | 확장 주머니 · 지갑 35칸 · 룬 주머니 | 원문 |
| 창고(Warehouse) | 같은 장비를 쌓는 Vault 칸. 가득 차면 낮은 레벨을 자동 교체(끌 수 있음) | 원문 |
| 필터 | 등급 · 부위 · Fine/Rare 접사 총 레벨 · 유니크 접사 수 · Mythic. 자동 판매 | 원문 |
| 잠금 | 가운데 클릭으로 장비 잠금 | 원문 |
| 상자 | 100개 넘으면 **일괄 열기**(1회 최대 1,000개 · 1.1.4) — 그 전에는 우클릭 한 개씩 | 원문 |
| 비교 | 장비 비교창이 접사 변화를 보여 준다. 동일 접사면 비교 숨김 | 원문 |
| 없는 것 | **자동 장착** · 검색창 · 능력치 기준 정렬(리뷰 · 10월 시점) | 리뷰 |
| 연습장 | Training Grounds — 더미 1~6개로 데미지 시험(챕터 8 · 1.1.1) | 원문 |

출처
- https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=4243990&count=50 (1.0.3 · 1.0.6.2 · 1.0.13 · 1.1.0 ~ 1.1.5)
- https://www.treyexgaming.com/path-of-idle-old-gods-rising-beginner-guide/
- https://allthings.how/path-of-idle-old-gods-rising-beginner-tips-what-to-prioritize-first/
- https://prodigygamers.com/2026/08/17/path-of-idle-old-gods-rising-beginners-guide-systems-team-building/
- https://store.steampowered.com/api/appdetails?appids=4985510 (Supporter Pack)
- https://steamcommunity.com/app/4243990/reviews/

---

## 4. 성장

### 4-1. 영웅

| 층 | 내용 | 신뢰도 |
|---|---|---|
| 직업 | 6종. 직업 변경은 영구가 아님 | 공략 |
| 품질 | 죄수 등급(Rare · Legendary · Mythic 등). 높을수록 장기 성장이 좋다 | 공략 · 원문 |
| 레벨 | 재능은 영웅 레벨로 해금(0.0.21). 최대 레벨은 리뷰에 「100」 한 건 | ⚠미확인 |
| 레벨 격차 | 적보다 레벨이 낮으면 데미지 · 방어 감소, EXP 도 줄어듦(레벨당 10% · 최소 10%) | 원문 · 리뷰 |
| 경험치 | 전투 중에만 쌓인다 — 「켜 둬야 영웅이 경험치를 얻는다」 | 리뷰 |
| 피로(Fatigue) | 전투가 길어지면 스택마다 받는 데미지가 늘어난다(스택 간격 5초 → 6초 · 1.1.6) | 원문 · 리뷰 |

### 4-2. 스킬 · 마스터리

| 층 | 내용 |
|---|---|
| Basic skill | 평타 계열 · 무기 종류 제한이 있다 |
| Talent skill | 액티브 · 영웅마다 랜덤으로 붙고 Baptism(Temple)으로 재굴림 + 잠금 |
| Talent mastery | 직업별 패시브 칸 |
| Inspire mastery | 후반 해금 · 마스터리를 한꺼번에 받는다(1.0.13) |
| Mutated skill | 다른 직업 스킬을 끼우는 칸 — 직업 교차 빌드의 핵심 |
| 룬워드 | 스킬을 붙이는 장비 쪽 장치 |

- 재능 화면은 왼쪽부터 Talent Skills · Talent Masteries 둘 · Inspire Masteries · Mutated Skills 로 통일(1.1.1) [원문]
- 선호 스킬 설정이 감옥 · Baptism 의 확률에 가중치를 준다 [원문]
- 추천 빌드가 게임 안에 들어 있고 클릭 한 번에 보인다 [원문 · 리뷰]

### 4-3. 계정 성장

| 장치 | 내용 |
|---|---|
| Worshiper | 계정 레벨 · 영웅 수용 수 · 오프라인 보상량에 관여 |
| Class Golem | 직업 전원에 거는 업그레이드 |
| 도감 | 장비 · 재능 수집 · 인지 레벨 · 새 세이브에 상속(1.1.3) |
| 마을 건물 | 감옥 · 시장 · 창고 · 대장간 · 성소 · 신전. 건물 개조 트리 |
| 시즌 | 시즌마다 별도 세이브(시즌당 9칸). 노말 전 챕터 클리어 뒤 **Offering**(전역 보너스)이 열린다(1.1.5) |

### 4-4. 엔드게임

| 구조 | 내용 | 신뢰도 |
|---|---|---|
| 난이도 | Normal → Nightmare → (Advanced) Hell · Apocalypse. **세이브를 만들 때 고른다.** 올리면 처음부터 다시 | 원문 · 리뷰 |
| Advanced | 「새 콘텐츠 없이 더 센 몬스터 + 제한 효과」 · 클리어하면 외형 보상 | 원문(1.1.0 · 1.1.4) |
| Doom(= 중국어판 「终焉」) | 영웅 몇 명만 데려가는 졸업 시험. **7단계**(1.1.4) · 단계마다 인원 규칙이 바뀐 이력이 있다 | 원문 · 리뷰 추정 |
| Divine Tower | 챕터 8 이후 · **Endless Mode 가 있다** — 층을 계속 올린다 · 영구 자원 보너스 | 원문 |
| Sanctum | 층 올리기 · 영구 골드 · 피 · EXP 보너스 | 공략 |
| Outlands | 12단계 · 건물 최상위 업그레이드 재료(Astral Essence) | 원문 |
| Exploration | 24레벨 | 원문 |
| 완주 시간 | 100% 업적까지 60 ~ 130시간(리뷰 증언) | 리뷰 |

- 개발자 스스로 「게임이 너무 쉬워졌고 후반 콘텐츠가 부족하다는 의견」을 알고 있다고 적었다(1.0.13) [원문]
- 이후 방향은 **시즌 콘텐츠.** 시즌이 열릴 때 대규모 밸런스 변경을 함께 내겠다고 예고(1.1.4 · 1.1.5 · 1.1.6) [원문]
- Doom 인원 규칙의 **현재 값**은 ⚠미확인 — 8월에는 「한 번에 한 명」이라 반발이 컸고(8-21 ~ 25 중국어 리뷰 다수), 8-28 패치가 3/4/5명으로 바꿨으며, 이후 단계 확장 때 다시 어땠는지는 못 읽었다
- **끝없는 위쪽이 하나 있다** — Divine Tower Endless. 리뷰에는 「1만 층 넘게 올랐다」 · 「실질 보상이 없다」가 같이 나온다 [리뷰]

출처
- https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=4243990&count=50 (0.0.21 · 1.0.10 · 1.0.13 · 1.1.0 · 1.1.1 · 1.1.3 ~ 1.1.5)
- https://store.steampowered.com/app/4243990/
- https://www.treyexgaming.com/path-of-idle-old-gods-rising-beginner-guide/
- https://allthings.how/path-of-idle-old-gods-rising-beginner-tips-what-to-prioritize-first/
- https://steamcommunity.com/app/4243990/reviews/

---

## 5. 오프라인 진행

| 질문 | 답 | 신뢰도 |
|---|---|---|
| 꺼진 동안 도는 것 | 모험 산출을 환산한 **보상 꾸러미** — 골드 · 피 · 뼈 · EXP Souls · Rune Pouches · 장비 상자 · Boon | 원문 · 공략 |
| 영웅이 싸우나 | **아니다** — 껐다 켠 시점의 시각 차이로 보상을 계산한다. 영웅 EXP 는 켜 둬야 쌓인다 | 공략 · 리뷰 |
| 상한 | 누적 시간 상한 기본 24시간(Supporter Pack 이 48시간으로 늘림) | 원문(48시간) · 공략(24시간) |
| 자원 상한 | 골드 · 피 · 뼈에 고정된 높은 상한. 넘친 오프라인 보상은 **버려진다**(받는 걸 막지는 않음 · 1.0.9) | 원문 |
| 계산 방식 | 마지막으로 **완전히 닫은** 시각과 지금의 차이. 최소화는 안 친다 | 공략 |
| 양에 영향 | Worshiper 레벨이 오를수록 늘어난다(1.0.8) | 원문 |
| 유료 | Supporter Pack — 오프라인 보상 +30% · 누적 48시간 · 최대 레벨 Boon · 외형 | 원문 |
| 환산 비율 | 「12시간 오프라인 = 켜 둔 2시간치」라는 증언 한 건 | 리뷰 · 단일 |
| 시계 조작 | 공략이 「시스템 시계를 앞으로 돌려 일찍 받는 방법」을 소개 | 공략 |

- 8월 초에는 「오프라인은 재료뿐이고 EXP 는 못 쌓는다」는 불만 [리뷰]
- 켜 둔 상태에서는 진행이 벽에 막히는데 껐다 켜면 풀린다는 증언 → **켜 두는 이득이 작다**(리뷰 추정 · 한두 건) [리뷰]
- 오프라인 보상을 DLC 로 파는 데 대한 반발이 중국어 부정 리뷰에 있다 [리뷰]
- 최대 오프라인 시간의 **기본 값**은 공략 한 곳의 서술이다 — ⚠미확인(상점 · 패치에는 「48시간으로 늘린다」만 있음)

출처
- https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=4243990&count=50 (1.0.8 · 1.0.9)
- https://store.steampowered.com/api/appdetails?appids=4985510
- https://grindnstrat.com/?p=7540
- https://www.treyexgaming.com/path-of-idle-old-gods-rising-beginner-guide/
- https://steamcommunity.com/app/4243990/reviews/

---

## 6. 스팀 반응

표본 — 영어 345건 전수(긍정 268 · 부정 77) · 중국어 400건 · 한국어 19 · 러시아어 33 · 독일어 30. 빈도는 **수작업 분류 또는 키워드 포함 건수**라 ±3 건쯤 흔들린다. 한 리뷰가 여러 주제에 걸린다.

**리뷰 성격** — 영어 중앙 플레이타임 119시간(긍정 147 · **부정 15**) · 중국어 123시간(긍정 139 · 부정 63). 영어 부정은 짧게 하고 떠난 쪽, 중국어 부정은 오래 하고 떠난 쪽이다. 긍정은 한 줄짜리가 많다.

### 6-1. 부정 리뷰에서 되풀이되는 주제

| 주제 | 대략 빈도 | 대표 인용 |
|---|---|---|
| 지루함 · 보상감 없음 | 영 18/77 · 중 18/96 | "Feels pretty shallow with nothing to really work towards - you are just going through the motions." — 목표할 게 없이 시늉만 한다 |
| 장비 정리 노동 | 영 11/77 · 중 15/96 | "You will have 500 chests after some AFK, and you will have to MANUALLY go through all gear from those." — 자리 비우면 상자 500개, 장비는 손으로 다 확인 |
| 스탯 과다 · 설명 부족 | 영 12/77 · 중 12/96 | "they need to remove more then 50% of stats from this game. the fake complexity is annoying and creates horrible RNG moments." — 스탯 절반은 걷어라, 가짜 복잡함이다 |
| 막힘 · 대기 | 영 11/77 | "You get soft locked on almost every boss and have to wait literally hours to gather enough resources to keep pushing forward." — 보스마다 막혀 몇 시간 자원을 기다린다 |
| 방치형인데 손이 간다 | 영 3/77 · 중 11/96 (3팀 9영웅 관리) | "I would describe it as roughly 50% idle and 50% active management." — 절반은 방치, 절반은 직접 관리 |
| 랜덤 과다 | 영 7/77 · 중 5/96 | "Every element of getting stronger is blocked behind 100 layers of RNG." — 강해지는 모든 길이 랜덤 100겹 뒤에 있다 |
| AI 아트 · 사후 공개 | 영 7/77 | "Didn't disclose AI assets until after I already purchased." — 구매 뒤에야 AI 에셋을 알렸다 |
| 번역 · UI | 영 10/77 | "The translations are rather poor, so the tutorial prompts don't match the actual terms for game windows and features." — 번역이 나빠 튜토리얼 용어가 실제 창 이름과 안 맞는다 |
| 빌드 다양성 · 밸런스 | 영 7/77 · 중 5/96 | "There is absolutely no build variety in this game. Each class's best build is lightyears ahead of any other." — 직업마다 최선 빌드 하나가 압도한다 |
| Doom 졸업 시험 | 중 9/96 (8월) | "打了一整个游戏的3人build设计好了 突然到了终盘来了一个必须要单刷的本" — 내내 3인 빌드를 짰는데 종반에 혼자 깨는 판이 나온다 |
| 피로 시스템 | 중 3/96 · 영 1/77 | "The fatigue system makes your characters take more damage by 10% per stack the longer the fight goes on." — 오래 싸울수록 스택당 10% 더 맞는다 |
| 타 게임 모방 느낌 | 영 7/77 | "A cheap port that should have stayed in its mobile lane." — 모바일에 있어야 할 싼 이식작 |
| 엔드게임이 짧음 | 영 4/77 · 중 5/96 | "it adds literally nothing new and it is rather short for an idler." — 새로운 게 없고 방치형치고 짧다 |
| 버그 · 세이브 · 성능 | 영 4/77 · 중 4/96 | "Twice not saved progress!" — 두 번이나 진행이 저장 안 됐다 |
| 환불 · 초반 이탈 | 영 10/77 (환불 언급) | "The game takes so long before you realize whether you'll actually enjoy it that, by the time you figure out it's not for you, you've probably already passed Steam's refund window." — 재미를 알기까지 길어 환불 기간이 지난다 |

- 기타 — 러시아어 · 한국어 부정은 위와 같은 축(영웅 6명 장비 비교 노동 · 반복 그라인드 · 직장 PC 세이브 소실) 이고 러시아어 2건은 「러시아어 없음」[리뷰]
- 중국어 부정 5건이 치트엔진(CE)으로 가속했다고 적었다 — 후반 대기 시간이 길다는 신호 (리뷰 추정)

### 6-2. 긍정 리뷰에서 되풀이되는 주제

| 주제 | 대략 빈도 | 대표 인용 |
|---|---|---|
| 빌드 · 시너지 · 접사 min-max | 영 69/268 | "It's an auto-battler with Diablo itemization." — 디아블로식 아이템 구성을 가진 오토배틀러 |
| 개발자 속도 · QoL | 영 56/268 | "dev has good understanding about idle-mechanics + quick QoL updates!" — 방치형 메커니즘을 아는 개발자 · 빠른 QoL |
| 가격 대비 | 영 31/268 | "Decent $10 for a good 100-200 hours of tinkering." — $10 로 100~200시간 만지작 |
| 깊이 · 여러 시스템 | 영 32/268 | "Hard to say it's idle though, haha. It's hard to walk away from." — 방치형이라 하기 어렵다 · 자리를 못 뜬다 |
| 참고작과 비교 | 영 31/268 | "Worthy successor to Lootun and Dragon Cliff." — Lootun 과 Dragon Cliff 의 후계 |
| PoE · 디아블로 언급 | 영 14/268 (각각) | "Path of Exile, but for people with a mortgage and a job" — 대출과 직장이 있는 사람의 PoE |
| 일하며 / 다른 게임 하며 | 영 18/268 | "You can play while working or playing another game as it is and idle game!" — 일하거나 다른 게임을 하며 돌린다 |
| 엔드게임이 아쉬움(긍정 안에서) | 영 30/268 (키워드 · 상한) | "Just completed basically everything and I wish there was more content!" — 다 끝냈다 · 콘텐츠가 더 있었으면 |
| 과한 노동 · 스탯 부담(긍정 안에서) | 영 17/268 (키워드 · 상한) | "Gearing up 9+ just got overwhelming to the point where the game became stressful and not relaxed or fun." — 9명 장비 맞추기가 부담돼 접었다(추천은 눌렀다) |
| 부정 리뷰에 대한 반박 | 영 20/268 (키워드 · 상한) | "People are crying over a game that you literally don't have to play to enjoy." |

- 긍정 리뷰도 번역 · 장비 정리 불만을 같이 쓴다: "Despite the translation issues and inconsistent use of words as I have come to expect of Chinese indie games, this has been a pretty chill experience." [리뷰]
- 데모에 대한 반응 — 데모를 100시간 넘게 돌린 뒤 사서 긍정으로 남긴 리뷰가 많다(영어 긍정 15건이 데모를 언급). 출시 때 데모를 닫은 것을 아쉬워하는 글이 있다 [리뷰]
- 8월 말 이후 「난이도가 점점 쉬워진다」는 증언이 긍정 · 부정 양쪽에 나온다 [리뷰]

출처
- https://steamcommunity.com/app/4243990/reviews/ (영어 · 간체 · 한국어 · 러시아어 · 독일어 필터)
- https://store.steampowered.com/app/4243990/ (총계 · 최근 30일)

---

## 7. 우리 게임과 대조

관찰만 적는다. 「반대 방향」은 우리 확정 사항과 정반대인 곳. 우리 쪽 칸은 CLAUDE.md 「개요」와 GAME_DESIGN §1 · §3 에 적힌 것만 쓴다.

| 항목 | Path of Idle | 우리 게임 |
|---|---|---|
| 한 줄 정의 | 디아블로 · PoE 식 아이템 방치형 | 디아블로식 아이템 게임을 그래픽 최소 파티 RPG 로 재해석 |
| 전투 | 완전 자동 · 실시간 | 자동전투 · 원정 · 탐험은 실시간 |
| 플레이어의 일 | 접사 비교 · 빌드 · 편성 · 자원 배분 | 빌드 · 편성 · 배분(조작 아님) |
| 파티 | 영웅 1~3명 / 모험 칸 3개 동시 | 편성 하나 + 동시 원정 최대 3부대, 한 영웅은 한 편성에만 |
| 영웅 얻기 | 감옥에서 골드로 홀림 · 등급 · 스킬 랜덤 | 선술집에서 고용 · 아이템 드롭의 영웅판 |
| 기능 해금 | 챕터 클리어(5 · 8 · 10 · 12) + Stele 퀘스트 | 챕터 클리어가 기본, 다른 기준도 가능 |
| 꺼진 동안 | **원정 산출을 환산한 보상 꾸러미**(최대 24~48시간) — 반대 방향 | 연구소만 돈다. 원정 · 탐험은 켜져 있을 때 |
| 켜 둔 동안 | 전투가 계속, 벽에서 막혀 자원을 기다리는 구간이 있다(리뷰) | 원정은 철수 · 끄기 전까지 멈추지 않는다 |
| 수직 상한 | **Endless Tower 가 있다** — 반대 방향 | 무한 수직 스케일링은 만들지 않는다 |
| 엔드게임 | 노말 → 나이트메어 → 헬 · 아포칼립스, 세이브를 새로 | 노말 → 나이트메어 → 헬 난이도 바퀴 |
| 만렙 지점 | 최대 레벨 ⚠미확인 | 만렙은 나이트메어 끝 |
| 밸런스 기준 | 몬스터 상대 PvE 뿐, PvP 없음 — 반대 방향 | PvP(결투장)가 기준 |
| 장비 옵션 | 접사 종류 많고(Fine · Rare · Set · Rune · Corrupt) 봉인 · 잠금으로 줄인다 | 이 조사에서 대조하지 않음 |
| 장비 정리 | 필터 · 일괄 열기 · 창고 · 자동 구매는 있으나 자동 장착 · 검색은 없음 | 이 조사에서 대조하지 않음 |
| 참고작 | Lootun · Dragon Cliff · PoE · Diablo 가 리뷰에서 비교됨 | Lootun · Diablo 2 |
| 장기 콘텐츠 | 시즌제 — 새 세이브로 다시 돌린다 | 난이도 바퀴 · 천상계 DLC 예정 |
| 가격 | $9.99 + DLC 2 | 이 조사에서 대조하지 않음 |

출처
- 이 문서 §1 ~ §6 의 출처
- [CLAUDE.md](../../CLAUDE.md) 「개요」 · [GAME_DESIGN.md](../game_design/GAME_DESIGN.md) §1 · §3

---

## 한계

- 스팀 리뷰 JSON API 를 못 써서 커뮤니티 페이지로 받았다 — 정렬 · 필터 옵션이 달라 **최근순 표본**이다. 중국어는 400건에서 끊었다(전체 중 일부)
- 긴 리뷰는 앞부분만 읽었다 — 뒤쪽 주장은 놓쳤을 수 있다
- 공략 사이트 4곳은 서로 달라 희귀도 · 슬롯 수 서술이 어긋난다 — 상점 · 패치 노트와 맞는 것만 [원문]으로 뽑았다
- 위키는 찾지 못했다(리뷰는 「팬 위키가 있다」고 말한다) — ⚠미확인
- 스팀 토론 279건은 첫 15개 제목만 봤다
- 게임 안 수치(드롭률 · 오프라인 시간 · 레벨 상한)는 직접 못 쟀다

---
*마지막 업데이트: 2026-11-17*
