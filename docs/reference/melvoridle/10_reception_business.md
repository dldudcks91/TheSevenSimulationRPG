# Melvor Idle — 평가 · 사업 구조 · 개발 이력

> 상태: **조사 완료** (2026-09-30)
> 목적: Melvor Idle 이 (1) 누가 · 어떻게 만들어 어떤 값에 팔렸고 (2) 플레이어가 무엇을 칭찬하고 무엇에 불만인지 (3) 개발자가 스스로 무엇을 밝혔는지를 **사실로** 정리한다. 게임 내부 규칙은 짝 문서가 다룬다.
> 짝 문서: [00_overview.md](00_overview.md)(구조 · 오프라인 계산) · [01_skills.md](01_skills.md) · [02_items.md](02_items.md) · [03_township_buildings.md](03_township_buildings.md) · [04_construction_unlocks.md](04_construction_unlocks.md)
> ⚠ 이 문서의 수치는 전부 Melvor Idle 의 수치다. 숫자(리뷰 수 · 가격)는 **2026-09-30 에 직접 조회한 값**이며 날짜가 바뀌면 달라진다.

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 |
| 1 | 개발 이력 · 사업 구조 (누가 · 언제 · 몇 명 · 퍼블리셔 · RuneScape) |
| 2 | 가격 구조 (플랫폼별 · 체험판 · 게임 안 결제) |
| 3 | 규모 (리뷰 · 판매 · 이용자 · 매출 추정) |
| 4 | 호평 — 되풀이되는 칭찬 |
| 5 | 불만 — 되풀이되는 불만 |
| 6 | 개발자가 직접 밝힌 설계 의도 |
| 7 | 모드 생태계 |
| 8 | 비슷한 게임 (Melvor 를 닮은 것 · 생존 테마 텍스트/방치/증분) |
| 9 | 확장팩이 더한 것과 확장팩별 평가 |
| 10 | 출처 · 확인 못 한 것 |

---

## 0. 조사 방법과 신뢰도

| 표기 | 무엇을 어떻게 | 신뢰도 |
|---|---|---|
| `[Steam]` (API) | Steam 공개 API 를 curl 로 직접 호출: `appreviews/<appid>` (리뷰 수 · 리뷰 본문) · `api/appdetails` (출시일 · 가격) · `ISteamNews/GetNewsForApp` (**개발자 공지 103건 원문** — 2020-11 ~ 2025-04) · `GetNumberOfCurrentPlayers` | ★★★ 1차 |
| `[Steam]` (상점 페이지) | WebFetch 가 요약한 상점 페이지 문구(가격 · 묶음 · 태그) | ★★ 요약기가 거친 문장 |
| `[개발자글]` | 위 Steam 공지 원문과 news.melvoridle.com 글. news.melvoridle.com 은 직접 요청이 403 이라 `r.jina.ai` 프록시 + 요약기를 거쳤다 | 공지 원문 ★★★ / 프록시 글 ★★ |
| `[Steam리뷰]` | 본편 부정 리뷰 **466건**(전체 영어 부정 750건의 62%) · 긍정 리뷰 **579건**(영어 긍정 8,616건의 6.7%) · 확장팩 3종 **영어 리뷰 전수**(ToTH 부정 18 · AoD 55 · ItA 40, 긍정 132 · 111 · 50)를 내려받아 읽었다 | 긍정 표본은 **도움됨 순 상위**라 대표성이 낮다(§3-3) |
| `[기사]` | Jagex 보도자료 · PC Gamer · GamingOnLinux 요약(Steam 뉴스 피드 경유) · PocketGamer | ★★ |
| `[위키/jina]` | `wiki.melvoridle.com/w/Full_Version` 1건만 프록시로 열람 | ★★★ |
| `[해석]` `[추정]` | 사실에서 끌어낸 읽기 / 확인 못 하고 짐작 | — |

- **막힌 것**: Reddit 은 전부 차단(직접 · 프록시 · WebSearch 도메인 지정 모두). 그래서 Reddit 글은 **하나도 근거로 쓰지 못했다.** 대신 Steam 리뷰 · Steam 토론 · 개발자 공지(개발자가 Reddit 에 올린 글을 Steam 에 그대로 옮긴 것이 많다)로 대체했다. mod.io 는 JS 렌더링이라 목록 · 다운로드 수를 못 읽었다.
- **리뷰 주제 개수**는 정규식 키워드 포함 여부로 센 것이다(한 리뷰가 여러 주제에 걸린다). 대략의 무게를 보는 용도이고 **정밀한 비율이 아니다.** 각 주제의 근거는 개수가 아니라 아래에 적은 **개별 리뷰**다.
- 리뷰는 `#<recommendationid> · 작성일 · 도움됨 수 · 작성자 본편 플레이시간` 으로 표기한다(확장팩 리뷰의 플레이시간은 0 으로 잡힌다 — Steam 이 확장팩 리뷰에 본편 시간을 붙이지 않는다).
- 한두 사람의 말을 일반화하지 않으려고, 주제마다 **서로 다른 작성자 2명 이상**과 표본 안의 대략적 비중을 함께 적었다.

---

## 1. 개발 이력 · 사업 구조

### 1-1. 누가 · 몇 명

| 시기 | 인원 · 역할 | 출처 |
|---|---|---|
| 2018 ~ 2020 | **호주의 1인 개발자 Brendan Malcolm(「Malcs」)** — RuneScape 를 어릴 때부터 한 사람. 2018 년 개발 시작, 취미로 시작해 게임 개발을 독학 | `[기사]` Jagex 보도자료 · `[개발자글]` 2021-10-15 |
| 2021-01 ~ | **Prat**(커뮤니티 출신) 전업 합류 — 콘텐츠 기획 · 시장 조사 · 데이터 분석 · 테스트. **Coolrox95** 는 전투 재작성(오프라인 전투의 전제)을 한 뒤 파트타임 2번째 개발자 | `[개발자글]` 2021-10-15 |
| 2021-10 | 번역 팀이 약 12개 언어를 준비 중 | `[개발자글]` 2021-10-15 |
| 2025-04 | Malcs + **전업 3명 = 4명**. 본인 말: 「혼자 취미로 하던 것에서 전업 3명과 함께」 | `[개발자글]` 2025-04-23 |
| 2025-11 | 핵심 팀 4명(Malcs · Coolrox = 기술 총괄 · Prat = 게임 디자이너 · 1명) + 외주(시나리오 작가 · UI/UX 스튜디오 · 작곡가). 커뮤니티 매니저는 2026-09 에 Strawhat → Althalus 로 교대 | `[개발자글]` news.melvoridle.com (프록시 경유 요약) |

- 스튜디오명 **Games by Malcs**(Malcs 가 2020 년 설립했다고 Jagex 보도자료가 적음). Steam 표기 개발사 Games by Malcs · 퍼블리셔 **Jagex Ltd** `[Steam]`.

### 1-2. 연표

| 날짜 | 사건 | 출처 |
|---|---|---|
| 2019-09 | **웹 브라우저판 최초 공개**(개발자 말: 「2019 년 9월에 모두가 해 볼 수 있게 처음 내놓았다」). 2023-09-04 공지가 「4th Birthday」 | `[개발자글]` 2021-10-15 · 2023-09-04 |
| 2020 (App Store 초판 2020-06-23) | iOS · Android 판. 웹 · 모바일은 무료 체험판 + 전체 버전 구매 구조 | `[Steam]` App Store 페이지(요약) |
| 2020-11-20 | **Steam 출시** $9.99, 첫 주 25% 할인. 개발자: 「임계 버그를 종일 잡으려고 예정보다 일찍 출시 버튼을 눌렀다」. Steam 상점은 이 시점을 Early Access(2020-11-19)로 표기 | `[개발자글]` 2020-11-20 · `[Steam]` |
| 2021-08-13 | Alpha v0.21 — **오프라인 전투** 추가(전투 코드 전면 재작성, 50ms 틱, 12시간 상한) | `[개발자글]` |
| 2021-10-21 | **Jagex Partners 가 퍼블리셔로 발표**. 그때까지 Steam · App Store · Google Play 합계 **60만 회 이상 다운로드** · 「고유 플레이어 100만 명 이상」 · Steam 93% · iOS 4.9 · Android 4.8 | `[기사]` Jagex 보도자료 |
| 2021-11-11 | Public Beta 1.0 — Astrology 추가 · **오프라인 상한 12h → 18h** | `[개발자글]` |
| 2021-11-18 | **v1.0 정식 출시**(Steam · iOS · Android 동시). 전투 8 + 비전투 15 스킬 · 아이템 1,100+ · 13개 언어. 「출시 후 대형 확장 3종 계획」 발표 | `[기사]` Jagex |
| 2022-04-08/09 | 확장 1 라이브 방송 + AMA. **유료 부분 $4.99 · 무료 부분 = Township 1부 · 공식 모드 · 레벨 99 이하 변경**을 명시 | `[개발자글]` 2022-04-09 |
| 2022-10-18 | v1.1 **무료** 업데이트: Township 1부 · 공식 모드 지원(mod.io) · Astrology 재작업 | `[개발자글]` |
| 2022-10-20 | **확장 1 Throne of the Herald** $4.99 — 전 스킬 100~120 | `[Steam]` API |
| 2022-11 ~ 2023-04 | Township 연속 패치 후 **2023-04-12 v1.1.2 Township 재작업**(실패 위험 제거 · 수동 틱 제거 → 1시간 자동 갱신) | `[개발자글]` |
| 2023-06 · 2024-09 | 모드 제작 대회 2회(상금 $3,000) | `[개발자글]` |
| 2023-09-07 | **확장 2 Atlas of Discovery** $4.99 — 1~99 구간 신규 스킬 2 · 신규 게임모드. (발표는 2023-08-01, 무료 v1.2 는 09-04) | `[Steam]` API · `[개발자글]` |
| 2023-12 | **Epic Games Store 에서 무료 배포**(홀리데이 세일 무료 게임) | `[기사]` PC Gamer 2023-12-22 |
| 2024-06-13 | **확장 3 Into the Abyss** $4.99 — 본편 클리어 후 평행 「심연」 콘텐츠. (**발표는 2024-03-14** — 아래 §10 의 날짜 어긋남 참조) | `[Steam]` API · `[개발자글]` |
| 2024-10-30 | v1.3.1 — 본편 마지막 대형 게임 업데이트 글(이후 Steam 공지 없음) | `[개발자글]` |
| 2024-11-19 | **Offline Client 베타**(Steam) — 「인터넷 없이 플레이」. 2025-08-13 공개 베타를 Steam · 모바일로 확대 | `[개발자글]` |
| 2025-04-23 | **Melvor Idle 2 발표** — 직접 후속작, Godot + C#, $14.99, Steam Early Access 예정 | `[개발자글]` |
| 2026-03 · 06 · 09 | MI2 개발 진행 보고(전투 업데이트: 요약기 수치로 스킬 12 · 아이템 731 · 몬스터 135 → 다음 Astrology · 전투 마스터리 길드). 2026-10-19~26 Steam Next Fest 데모 예정 | `[개발자글]` news.melvoridle.com (요약) |
| 2026-08 | **서버 다운으로 「싱글플레이 게임이 안 켜진다」** 리뷰가 하루에 몰림(§5-1) | `[Steam리뷰]` |
| 2026-09-30 (조회 시점) | MI2 는 아직 「Coming soon · 2026」, 리뷰 0건. 본편 동접 3,674(1회 측정) | `[Steam]` API |

### 1-3. 퍼블리셔 · RuneScape 와의 관계

- **RuneScape 의 IP 가 아니라 「영감」이다.** Steam 소개문: 「RuneScape 에서 영감을 받은」. Malcs 는 RuneScape 를 어릴 때부터 한 사람이고, 모든 스킬 · 몬스터 · 아이템은 독자 제작이다 `[Steam]` `[기사]`.
- **Jagex 가 개발사를 사들인 것이 아니라 퍼블리싱 계약**이다(Jagex Partners = 외부 개발사 출판 부서). Malcs 인용: 「Jagex 와 직접 일하게 된 것은 꿈이 이루어진 일이었다. 2018 년에 시작할 때 내가 영감을 받은 바로 그 스튜디오의 지원을 받게 될 줄은 몰랐다」 `[기사]`. 개발자 공지도 「Jagex 는 내 가치를 공유한다 … 커뮤니티 주도 방식으로 계속 간다」 `[개발자글]` 2021-10-23. 지분 · 수익 배분은 **공개된 것이 없다**.
- Jagex 가 하는 일: 개발자 글은 「지원과 자원이 성장을 직접 돕는다」고만 적는다(2021-10-23) — 구체 분담은 **공개된 것이 없다**. 확인되는 것은 번역 팀(약 12개 언어) · Epic Games Store 입점 · 교차 판촉 묶음이다 — 「Dragonw-idles Bundle」(RuneScape: Dragonwilds 와 묶음 $35.98) · 「Old Friends of Gielinor Pack」(OSRS 멤버십 포함 $22.48) `[Steam]`.
- **Jagex 의 앞선 방치형 시도**: 2016-09 RuneScape: Idle Adventures(Hyper Hippo 협업)는 2017-05 서비스 종료 `[기사]`(RuneScape Wiki 요약, 출처가 약함). Melvor 는 그 뒤 팬 제작으로 성공해 Jagex 가 끌어안은 형태다.
- 커뮤니티가 스스로 말하는 관계: 「It's like RuneScape except you don't have to play it」(#143730784 · 2023-08-10 · 도움됨 207) — §4-1.

---

## 2. 가격 구조

### 2-1. 플랫폼별 가격 (2026-09-30 조회)

| 상품 | Steam (US$) | 비고 |
|---|---|---|
| **본편** | **$9.99**(₩11,000) | 2020-11 출시가 그대로 — 6년째 불변 `[Steam]` |
| Throne of the Herald | $4.99(₩5,600) | 본편 필수 |
| Atlas of Discovery | $4.99 | 본편 필수, **다른 확장 불필요** |
| Into the Abyss | $4.99 | 본편 필수, **다른 확장 불필요** · 본편 최종 던전 클리어 필요 |
| Expanded Edition | $13.93 (7% 할인) | 본편 + ToTH |
| Complete Collection Bundle | $24.96 | 본편 + 확장 3종(정가 합 = 9.99 + 14.97, 할인 없음) |
| Dragonw-idles Bundle | $35.98 (10%) | 본편 + RuneScape: Dragonwilds |
| 모바일(iOS, App Store) | 무료 다운로드 + 인앱 구매 | Premium Edition Upgrade $9.99 · Expanded $13.90 · 확장 각 $4.99 `[Steam]` 요약 |
| Epic Games Store | 별도 판매 · **2023-12 무료 배포 이력** | `[기사]` |
| Melvor Idle 2 (예고) | $14.99, **정식 출시에도 동일** | 확장 가격은 미정 `[개발자글]` 2025-04-23 |

- **확장팩은 전부 $4.99 로 같다**(개발자가 세 번 모두 같은 값을 말함 — 2022-04-09 「$4.99」 · 2024-03-14 「$4.99」 · 2024-05-16 「same as other Expansions」).
- **사전 구매 없음**: 「We don't like pre-orders. You should wait until release before coming to the decision to purchase the Expansion.」(2024-03-14 공지).
- **플랫폼 간 구매 이전은 한 방향뿐**: Steam · Epic 구매는 전 플랫폼(데스크톱 · 모바일 · 브라우저)에서 인정, **모바일 구매는 모바일 · 브라우저만** `[위키/jina]` Full_Version. 리뷰에도 같은 증언 — 「Remember to buy on Steam first though, as the purchase doesn't work if you go from Mobile -> Steam」(#152801924 · 2023-12-03)과 「already purchased premium on mobile … that money was kind of wasted」(#107416030 · 2022-01-06 · 도움됨 66).
- 확장팩 3종은 **각각 독립 구매**(선행 확장 불필요)다 `[위키/jina]` · `[개발자글]` 2024-03-14 「No, you do not need to own any previous Expansions. All content is isolated」.

### 2-2. 무료 체험판의 범위

| 항목 | 체험판 | 본편 유료 부분 | 출처 |
|---|---|---|---|
| 배포 | 웹 브라우저(melvoridle.com) · 모바일 무료판 | 구매 시 해금 | `[위키/jina]` |
| 위키 수치 | 스킬 11 · 아이템 572 · 적 66 · 던전 8 · 최대 레벨 99 · **게임모드 Standard 하나** | 스킬 24 · 아이템 1,279 · 적 161 · 던전 17 · 게임모드 3(Standard · Adventure · Hardcore) | `[위키/jina]` |
| 데이터 수치 | 아이템 671 · 몬스터 66 · 던전 8 · 게임모드 Standard 1 · 스킬 데이터 13개 | 본편 추가분 아이템 735 · 몬스터 106 · 던전 9 · 게임모드 6종(Hardcore · Adventure · Chaos · 스피드런 · Internal Suffering …) | `[데이터]` `melvorDemo.json` · `melvorFull.json` (`data.items` · `monsters` · `dungeons` · `gamemodes` · `skillData` 개수) |

- **위키와 데이터가 어긋난다**: 위키는 체험판 아이템 572 · 본편 1,279, 데이터는 671 + 735 = 1,406(00_overview 의 1,404 와 일치). 데이터가 최신 빌드, 위키가 옛 빌드일 수 있다 `[해석]`. 몬스터 66 · 던전 8 은 일치.
- 체험판이 **본편의 앞 절반**이라 데이터 기준으로 몬스터의 38%(66 / 172), 던전의 47%(8 / 17)가 체험판에 있다 `[데이터/계산]` (66 ÷ (66 + 106) · 8 ÷ (8 + 9)). Thieving · Fletching · Crafting · Runecrafting · Herblore · Agility · Astrology · Township · Ranged · Prayer · Slayer 가 유료 쪽이다 `[데이터]` (`melvorFull.json` `skillData`).
- 리뷰에 나타난 체험판의 역할 — 「It is FREE, you can play it on their website … The $10 Steam Version is essentially a donation」(#82699799 · 2020-12-20 · 도움됨 77) · 「My advice is to try it free on the web browser」(#83024350 · 2020-12-24). Steam 토론에서도 「Most respondents recommend trying the free browser version first」 `[Steam]` 토론 요약.
- Steam 상점 페이지에는 체험판 언급이 없다. 웹 · 모바일이 체험판 창구다.

### 2-3. 게임 안 결제

- **없다.** Steam 상점 문구: 「Melvor Idle does not contain microtransactions. We believe everyone who plays should be on a level playing field.」 `[Steam]`. 검색 스니펫으로만 확인한 초기 문구: 「This game is free from any and all Microtransactions … This promise will be kept throughout the entire Development」 `[Steam]`(요약, 원문 위치 미확인).
- 모바일의 인앱 결제는 **일회성 「전체 버전 · 확장 해금」 뿐**(소모성 재화 · 가속 상품 없음). 상품 목록 자체가 $4.99 ~ $13.90 의 해금 4종이다 `[Steam]` 요약.
- MI2 도 같은 방침: 「a single cost for the base game … no microtransactions」 `[개발자글]` 2025-04-23.
- 개발자가 낸 수익 모델의 나머지: 확장팩(유료) + Patreon(MI2 알파 접근) + 모드 대회 후원. 광고 없음.

---

## 3. 규모

### 3-1. Steam 리뷰 (2026-09-30 API 조회)

| 상품 | 언어 | 긍정 | 부정 | 합계 | 긍정률 | Steam 등급 |
|---|---|---|---|---|---|---|
| **본편** | 전체 | 14,644 | 1,628 | 16,272 | **90.0%** | Very Positive |
| 본편 | 영어만 | 8,616 | 750 | 9,366 | 92.0% | Very Positive |
| Throne of the Herald | 전체 | 197 | 34 | 231 | **85.3%** | Very Positive |
| Throne of the Herald | 영어만 | 132 | 18 | 150 | 88.0% | |
| Atlas of Discovery | 전체 | 156 | 106 | 262 | **59.5%** | Mixed |
| Atlas of Discovery | 영어만 | 111 | 55 | 166 | 66.9% | |
| Into the Abyss | 전체 | 85 | 108 | 193 | **44.0%** | Mixed(부정이 더 많음) |
| Into the Abyss | 영어만 | 50 | 40 | 90 | 55.6% | |

- 계산: 긍정률 = 긍정 ÷ 합계 `[데이터/계산]`. Steam 상점 페이지가 기본으로 보여 주는 값은 영어 리뷰(「92% of 8,612」로 요약됨 — 요약기가 본 시점의 캐시라 오늘 API 값 8,616 · 9,366 과 다르다).
- **Steam 구매자 vs 비Steam 구매자**(영어): 본편 긍정 7,930 / 부정 680 · 비Steam 686 / 70 — 두 집단의 긍정률이 거의 같다(92.1% · 90.7%) `[데이터/계산]`.
- 옛 시점 값: 2021-11 Steam 93% (Jagex) · 2024 검색 결과 90% (15,995건) — **본편 긍정률은 5년간 90~93% 로 거의 안 움직였다** `[기사]` `[해석]`. 확장팩이 뒤로 갈수록 낮아지는 것과 대비된다(§9).
- 모바일: App Store 4.8/5, **9,100건 이상**(요약 시점) `[Steam]` 요약. 2021-11 Jagex 는 iOS 4.9 · Android 4.8. Google Play 값은 직접 못 읽었다.

### 3-2. 판매량 · 이용자

| 항목 | 값 | 성격 |
|---|---|---|
| 다운로드 · 이용자 (2021-10) | Steam + iOS + Android **60만 회 이상 다운로드**, 「고유 플레이어 100만 명 이상」 | `[기사]` Jagex 보도자료 — 무료 웹 · 모바일 체험판이 섞인 수치라 **판매량이 아니다** |
| Steam 본편 보유자 | **50만 ~ 100만** | `[Steam]` SteamSpy 구간(2026-09-30 API — 다만 SteamSpy 긍정 리뷰 수가 13,146 으로 실제 14,644 보다 낮아 **스냅샷이 옛것**) |
| 리뷰 수 × 관행 배수 | 16,272건 × 30~50 = **약 49만 ~ 81만** | `[추정]` 소규모 인디에 흔히 쓰는 「리뷰 1건 = 30~50 판매」 관행 계산. 오차가 크다 |
| 매출 추정 | 총 $6.7M · 개발측 순 $2.0M | `[추정]` 제3자 계산기(Boxleiter 방식), 리뷰 13,701건 시점 · 「감사된 수치가 아니다」. 확장팩 · 모바일 · Epic 은 미포함 |
| 동시접속 | **3,674**(2026-09-30 1회 측정) · SteamSpy 4,551 (시점 불명) | `[Steam]` — 5년 된 방치형이 이 정도 동접을 유지한다는 스냅샷 하나일 뿐 |
| 판매량 · 매출 공식 발표 | **없다**(Jagex · Games by Malcs 모두 판매 부수를 밝힌 적을 못 찾음) | — |

### 3-3. 리뷰 표본의 편향 (읽을 때 주의)

- 내려받은 긍정 300건 표본의 본편 플레이시간 **중앙값 752시간**, 부정 표본은 **117시간** `[데이터/계산]`. 도움됨 순으로 뽑아 긴 글이 앞서므로 **긍정 표본은 극단적 헌신 플레이어 쪽으로 기울어 있다.** 즉 §4 는 「오래 한 사람이 좋아하는 이유」, §5 는 「짧게 하고 떠난 사람과 오래 하고 지친 사람의 이유」가 섞여 있다.
- 부정 리뷰의 연도 분포(표본 466건): 2020 6 · 2021 44 · 2022 63 · 2023 50 · **2024 91 · 2025 139 · 2026 73** `[데이터/계산]` — 부정 리뷰가 **최근 3년에 몰린다**(확장팩 · 온라인 요구 · 후반 피로가 겹친 시기, 다만 리뷰 총량 자체가 최근에 많을 수 있어 비율로 읽지 말 것).

---

## 4. 호평 — 되풀이되는 칭찬

표본 579건(본편 긍정)에서 키워드 포함 개수: RuneScape 232 · 깊이/콘텐츠 108 · 오프라인/백그라운드/두 번째 화면 106 · 성장감 104 · 개발/커뮤니티 89 · 가격/가치 77 · 모바일/클라우드 74 · 중독성 49 · 모드 37 · 무과금 24 · 프레스티지 없음 7 `[데이터/계산]` (중복 허용, 정밀치 아님).

### 4-1. 「RuneScape 의 스킬 노동을 안 힘들게」 (가장 큰 덩어리)
- 「It's like RuneScape except you don't have to play it, so essentially the ideal RuneScape experience.」 — #143730784 · 2023-08-10 · 207 · 283h
- 「It's Runescape Without the dumbass quests. perfect.」 — #92076134 · 2021-05-16 · 138 · 824h
- 「You ever wanna play RuneScape but then remember you would have to play RuneScape? Melvor is all the RuneScape without the RuneScape.」 — #89471425 · 2021-04-01 · 144 · 803h
- 「Runescape really was just an idle game. The janky UI and blocky graphics were just the obstacle between you and idling you way to a max cape.」(원문 오탈자 그대로) — #152801924 · 2023-12-03 · 31 · 424h
- `[해석]` 참조점이 「방치형 게임」이 아니라 **「RuneScape 를 하는 경험」** 이라는 뜻이다. 반대쪽 증거: RuneScape 를 안 해 본 사람의 부정 리뷰에서는 같은 구조가 「탐험 · 퀘스트가 없다」로 나온다(#209588794 · 2025-11-19, §5-3).

### 4-2. 과금 · 리셋 · 천문학적 숫자가 없다
- 「Melvor Idle is what you thought idle games were like, before you realized what idle games are actually like — … "prestiging", rsi-inducing clicking, premium currencies and microtransactions every step of the way … it's simply and straightforwardly an RPG」 — #93352330 · 2021-06-07 · 113 · 2,182h
- 「In Melvor, no ads, no mtx, no reason to stay focused on the game all the time.」 — #219624753 · 2026-03-02 · 22 · 853h
- 「An idle game without the reset nonsense … Melvor Idle doesn't have that nonsense.」 — #154525675 · 2023-12-27 · 16 · 3,773h
- 「no ascension system so no wasted progression and no getting into absurd and unprocessably high numbers」 — #183502035 · 2024-12-24 · 10 · 791h
- 「no ludicrous micro-transactions」 — 부정 리뷰에서조차 이 점은 인정된다(#167128383 · 2024-06-11, 본문은 세이브 소실 불만).

### 4-3. 짧게 확인하고 돌아가는 「틈새」 리듬
- 「I can take a short break, check my progress, sell a few items, start another craft, manage my farm, and go back to work after a few minutes」 — #219624753 · 2026-03-02 (원격 근무자)
- 「Perfect game to run in the background while you work…. Numbers go up and brain releases happy chemicals.」 — #159505008 · 2024-02-29 · 42
- 「I play this game almost exclusively offline on a second PC」 — #147847633 · 2023-10-08 · 54 · 1,068h
- 「open and running in the background whenever my PC is on … basically command-line OSRS」 — #185129241 · 2025-01-09 · 56 · 2,756h
- 「They're like ant farms. Give it some food, water, fresh soil and worms every now and then, and watch them grow.」 — #93426962 · 2021-06-09 · 143

### 4-4. 스킬 간 맞물림 · 깊이
- 「This game feels much deeper than most idle games I've played. Things like boss fights actually need planning, making sure you've got the right resources stocked up and the right skills levelled」 — #228810088 · 2026-06-26 · 19
- 「so much interconnectivity between the skills」 — #178644751 · 2024-11-09
- 「the unexpected depth has me playing it months later … Buy this game at full price. It's worth it.」 — #100223209 · 2021-09-30 · 29 · 1,923h
- 「Combat can be both active or fully idle, depending on how you want to play, and there are a massive amount of items that give you small boosts that add up」 — #190912159 · 2025-03-23
- 「The game features a combat system which is a lot more than I can say about a lot of idle games whose whole purpose is just being a glorified excel sheet」 — #192951028 · 2025-04-18 (전체적으로는 부정 리뷰의 「좋은 점」 목록)

### 4-5. 개발 지속 · 위키 · 디스코드
- 「Consistently updated/patched. Mod support. Discord Server + Melvor Wiki + Great community support」 — #154762071 · 2023-12-30 · 22 · 2,378h
- 「don't sleep on the wiki. It's almost as informative as the real Runescape wiki!」 — #100223209
- 「solid updates, and amazing mod support」 — #140317502 · 2023-06-19 · 20 · 6,298h

### 4-6. 크로스플랫폼 저장 · 값어치
- 「you can play it on their website, on mobile, and you can transfer your save between all three」 — #82699799 · 2020-12-20 · 77
- 「if you buy the game on steam you can also play it on android sharing the savefile and product licenses」 — #183502035
- 「The price?! Hell, this game is worth more!」 — #106410434 · 2021-12-24 · 35 / 확장팩: 「I was expecting this expansion to be somewhere in the $15 range … I was absolutely shocked when I saw that the expansion was only going to be $5」 — #124311293 (ToTH) · 2022-10-24 · 24

---

## 5. 불만 — 되풀이되는 불만

부정 표본 466건(본편) 키워드 포함 개수: 반복/지루/노동 100 · 확장팩 언급 47 · UI/UX 43 · 오프라인 언급 34 · Township 30 · 튜토리얼/온보딩 26 · 게임성 없음 26 · 세이브 소실 24 · 가방 공간 23 · 성능 22 · 서버/온라인 요구 15 · 후반 벽 15 · 확장팩 「가격」 불만 4 `[데이터/계산]`.

- **눈에 띄는 것**: 확장팩 불만은 **가격**(4건)이 아니라 **설계**(§9)다. $4.99 라는 값은 오히려 칭찬받는다.

### 5-1. 온라인 요구 · 세이브 소실 · 계정 (신뢰 문제)
- 「can't recommend it because you can't play the singleplayer idle game unless their game server is online」 — #232738671 · **2026-08-14** · 218 · 227h
- 「Was fun till server dies and you lose your hardcore account … because the game is offline and you can't change your assignment」 — #232774488 · 2026-08-14 · 86 · 546h
- 「Single player idle game that requires connection to server. It needs an offline mode.」 — #233471558 · 2026-08-23 · 46
- 「it's ridiculous that it requires an internet connection to play (start)」 — #198439285 · 2025-06-29
- 「my save got wiped again … if your PAID idle game just arbitrarily deletes data from both local and cloud saves」 — #167128383 · 2024-06-11 · 226 · 2,338h
- 「For the second time, I have lost my entire game progress … 192 hours … never received any response from the developer's support team」 — #227556826 · 2026-06-09 · 38
- 「after my 5000+ hours … both my cloud and local save are either corrupted or gone」 — #121289167 · 2022-08-27 · 36 · 5,335h
- 「New update deleted 2 of my 500+ hour save files」 — #124118135 · 2022-10-21 · 71 · 1,042h
- 「locked me out of one of my characters bc the "game mode is no longer supported"」 — #164038763 · 2024-05-02 · 95
- `[해석]` 「방치형은 오래 켜 두는 게임 = 세이브가 곧 자산」이라는 성격 때문에 **저장 · 로그인 실패가 다른 어떤 불만보다 강하게 터진다**(도움됨 상위 부정 리뷰 다수가 여기). 개발자가 2024-11 에 **오프라인 클라이언트**를 별도로 만든 것이 이 문제에 대한 대응이지만, 2026-08 리뷰가 여전히 나오는 것은 베타가 기본값이 아니기 때문으로 읽힌다(#175068444 · 2024-09-16 「offline mode is on beta testing phase」).

### 5-2. UI · UX · 성능
- 「interface is awful; … the tutorial is very lacking … requires going in and out of menus; scrolling up and down; and clicking the same buttons multiple times」 — #187116040 · 2025-02-04 · 62
- 「The UI/UX is embarrassingly amateur … in this case, the UI/UX is the entire game」 — #196853420 · 2025-06-10 · 60 · 284h
- 「If I hover over an item for my township, the exact item I need should be magnified … I'm 60 years old, and straining my eyes isn't cutting it anymore … the only way to get a developer's attention is by a negative review」 — #179279401 · 2024-11-18 · 192
- 개발자도 인정: 「Major adjustments to the UI to make it look more like a game, rather than a 1998 Excel spreadsheet (rip)」(2022-10-22 공지, §6).
- 성능: 「Constantly running my processor at 15 - 25 %, not shutting down when I close it」 — #225465929 · 2026-05-14 · 31 · 1,132h / 「on startup crashes immediately at loading screen」 — #230990253 · 2026-07-22 · 14.

### 5-3. 온보딩 · 목표 부재
- 「Right after tutorial you're left with an ocean of possibilities and absolutely no reason to set sail.」 — #145700818 · 2023-09-05 · 20
- 「it expects you to start grinding for grinding's sake as soon you finish the short tutorial」 — #209588794 · 2025-11-19 · 15 · 822h (RuneScape 의 퀘스트 · 탐험이 없다는 지적)
- 「This game however throws everything at the player right at the start with no real pointers to suggest where you start.」 — #94243374 · 도움됨 23
- 「The game actually "progress locked" in the tutorial」(활 제작 튜토리얼 버그) — #124082520 · 2022-10-20 · 15

### 5-4. 후반 · 반복 · 「일이 된다」 (가장 큰 덩어리)
- 「the game quickly began to feel like work rather than play. A daily grind. Log in one to two times to collect my offline progression, check what my current goal is …」 — #205838931 · 2025-10-04 · 44 · 582h
- 「it doesn't respect your time and will likely leave you very frustrated in the lategame … the pacing … is actually really good until you reach like.. 150 days of playtime」 — #192951028 · 2025-04-18 · 109 · 3,214h
- 「to quickly progress, you need to play actively, the game encourages this behavior through limiting idle gains to 24h」 — #166482748 · 2024-06-02
- 「Nothing I do requires input, outside changing what tasks I'm poking at, and the level of micro needed for things that reduce HP such as fighting and thieving is tedious and, if you get distracted, fatal.」 — #83024350 · 2020-12-24 · 35
- 「There's no parallel progress, so it's more of a clunky colony sim where you control one character and manually select every step of every process.」 — #103019047 · 2021-11-19 · 27
- 「Despite what the description claims, Melvor Idle is not an adventure game … everything boils down to tedious micromanagement.」 — #129271595 · 2022-12-26 · 58

### 5-5. 오프라인 상한 · 자원 고갈 정지 · 가방 공간
- 「The game features offline-progression for up to 24 hours, but if your character ran out of resources during that time, then you get interrupted and whatever progression you would have made is lost.」 — #205838931 · 2025-10-04
- 「Turned from an Idle game to a 18 hour max progression idle game. … after 18 hours of offline progression that's it」 — #111942545 · 2022-03-11
- 「a crippling cap to offline progression that requires constant logging in to avoid losing a lot of progress」 — #101413157 · 2021-10-22
- 「1/4 of the way through you're out of inventory space … Then the game limits said offline session for 24 hours. I have no reason to stay in the game and am punished for leaving」 — #217249086 · 2026-01-31 · 17
- 「there is less than 5 minutes of gameplay per day. The game does not encourage active management and punishes exploring new skills due to the lack of inventory space at the beginning」 — #147560219 · 2023-10-03
- `[해석]` 상한 자체보다 **「상한 + 자원이 끊기면 멈춤 + 가방이 빨리 찬다」가 겹칠 때** 불만이 된다. 반대편도 있다 — 긍정 리뷰가 같은 상한을 「AFK 24시간」이라고 담담히 적는다(#156297968 · 2024-01-19). 상한 표기는 시간이 지나며 12h → 18h → 24h 로 바뀌었다(§6-2).

### 5-6. 패치가 만든 반발 — Township · 마스터리 손실
- 「In patch 1.1.1 they did a "minor balance" update that changes the township … it would take you days to g[et]」 — #125639450 · 2022-11-18 · 47 · 698h
- 「Bad update after bad update has spoiled this game. … invalidated nearly every build and created pointless artificial gates」 — #125661603 · 2022-11-18 · 26 · 4,735h
- 「recent update (1.2) to Township completely gutted the new player experience and made the veteran experience needlessly more tedious」 — #145665765 · 2023-09-05 · 72
- 「If you didn't already 100% the base game, be prepared to lose half of all your mastery bonuses when you buy this expansion」 — #124129369 (ToTH) · 2022-10-21 · 34 (Astrology 재작업의 보상 부족)
- 「The addition of the Township skill should be studied in the idle genre … it's so plainly boring and doesn't tick the pleasure boxes of Idling.」 — #221896759 · 2026-03-28 (긍정 리뷰 안의 불만)
- 개발자의 반응은 §6-4 — 결국 Township 는 2023-04 에 통째로 재작업됐다.

### 5-7. 소유권 · 약속 논란 (소수, 그러나 도움됨이 큼)
- 「the developer rescinded on his promises that the first 3 expansions would be free after buying the game outright … This is fraud」 — #119164482 · 2022-07-21 · **594 표** · 7,416h. `[주의]` 한 사람의 주장이다. 개발자 공식 글(2022-04-09)은 확장의 **유료 부분 $4.99 · 무료 부분** 구분을 명시하고 있고, **「확장은 무료」라는 원래 약속의 원문은 이번 조사에서 확인하지 못했다.**
- 「they are just licencing us the software instead of actually selling us ownership of a copy」 — #162063853 · 2024-04-03 · 71 (온라인 인증 구조에 대한 불만)

---

## 6. 개발자가 직접 밝힌 설계 의도

(전부 Steam 공지 원문 · 날짜 · 작성자 Malcs, 별도 표기 없으면 `[개발자글]`)

### 6-1. 과금 · 수익 모델
- 「For those who have been around for a while, you will know that we have strict preferences & values as to how a game should be monetized (See: Melvor Idle).」 「we believe in fair and enjoyable gameplay for everyone. That's why the game will contain no microtransactions. Every player experiences the full base game without needing to spend extra money, ensuring a level playing field where progress and success are earned purely through your efforts.」 — 2025-04-23 (MI2 발표)
- **멀티플레이를 버린 이유(수익 모델 때문)**: 「our preferred monetization strategy does not work for a multiplayer product. Introducing Multiplayer increases server & staff costs tenfold … puts a focus on "we need to meet this month's costs" rather than "how do we make the next expansion amazing". This means the game would need to have subscriptions, microtransactions, cosmetics, or some other form of continuous income.」 「We created a game where people can play and enjoy it at their own pace, rather than be constantly reminded of how far behind you are to those who started before you.」 — 2025-04-23
- 이력: 「I went from learning how to make a simple idle game to becoming one of the top paid Idle games in the genre」 — 2025-04-23
- Steam 상점: 「We believe everyone who plays should be on a level playing field.」 `[Steam]`

### 6-2. 오프라인 상한
- 12h 상한의 출처: 「[Offline Combat] will be capped at 12 hours per offline session like all the other Skills.」 — 2021-06-22. 「There is a 12 hour Offline cap, and you will be provided with your experience and items upon returning to the game.」 — 2021-08-13
- **상한을 올린 이유**: 「The Offline Time Cap of 12 hours is reasonable, up until a certain point. I solely believe that as more content is added to the game, this time cap should gradually increase alongside it. The Offline Time Cap has been increased to 18 hours for all players. Now, this does not mean every content update will come with an increase … Nothing is always set in stone, and I'm always listening to feedback」 — 2021-11-11 (Public Beta 1.0)
- 실제 이력: 12h(2021-11 이전) → **18h(2021-11-11)** → 24h(2023-04-12 Township 공지에 「like the standard offline time」로 24h 등장). 리뷰상 2022-03-11 에도 「18 hour」 불만이 있으므로 24h 로 올린 날짜는 2022-03 ~ 2023-04 사이 `[해석]`, **정확한 날짜는 확인 못 했다.** 00_overview §2-5 가 「18h 는 오기 · 구버전 가능성」이라 적은 것은 이 이력으로 정정된다(18h 는 **2021-11 ~ 2022 초의 실제 값**).
- **「왜 상한이 존재하는가」를 직접 설명한 개발자 글은 찾지 못했다.** 확인된 것은 「콘텐츠가 늘수록 상한도 늘린다」는 방침뿐이다.
- 오프라인 전투의 안전성: 「yes, you will be able to die Offline. However, there will be ways for you to either save yourself, or know if this is a possibility of occurring. This is a delicate task to undertake, especially with Hardcore characters.」 — 2021-06-22
- 전투를 오프라인에 못 넣었던 이유: 「The existing Combat System was just not built to handle Offline calculations … it was very clear that the entire Combat System needed to be rewritten」(TypeScript · 50ms 틱 · 브라우저 스로틀링을 타임스탬프 차이로 보정 · 한 번의 인터벌에서 틱을 여러 번 실행) — 2021-06-22
- MI2: 「Offline Progression: Continue progressing while offline at the same speed as when actively playing」 — 2025-04-23. **MI2 도 상한이 있는지는 글에 안 나온다.**

### 6-3. 확장팩의 구조
- 「The Expansion will have a Paid aspect. The Paid aspect will cost $4.99 USD.」 · 무료: 「Township Part 1 · Official Mod Support · Any additions or new mechanics to existing content (Up to Level 99) · Any new Quality of Life features · All bug fixes」 — 2022-04-09
- 「Every single Non-Combat Skill is also increasing to Level 120 … Most of the content will stay true to the original Skill mechanics, keeping it simple and easy to Idle.」 — 2022-04-09 (레벨 100~120 콘텐츠를 유료로, 스킬 메커닉은 단순 유지)
- 「Enemy HP levels will still scale in a linear fashion. Damage will also continue to scale in a linear fashion.」 — 2022-04-09 (지수 증가 회피 방침)
- 「Mastery is not increasing to Level 120 … This will allow you to train to Level 120 while completing your Level 99 Mastery grind.」 — 2022-04-09
- 「This is one of many Expansion to come to Melvor Idle, and we hope to continue providing massive content updates far into the future.」 — 2022-10-21
- 정식 출시 후 명명 변경: 「When new content hit Melvor Idle during Early Access, we previously referred to it as 'Major Updates'. From now on we'll instead be using the term 'Expansion'.」 · 「The timelines for Expansions will be much longer」 — 2021-12-14

### 6-4. 설계를 되돌린 사례 (개발자가 스스로 인정한 것)
- **Township 재작업**(2023-03-22): 「the Skill in its current state did not suit the core premise of what Melvor Idle is meant to be. It took away from the core experience that we hoped to achieve」 · 「Instead of attempting to band-aid fix … we decided to rework the core mechanics」 · 「The simple fact that a small decision by the player could lead to an entire Town dying, failing and requiring a restart was frustrating. It was extremely demotivating」 → 실패 위험 완전 제거 · 수동 틱 제거 · 1시간 자동 갱신(오프라인 상한 24h, 2023-04-12).
- **원래 Township 의 의도**: 「Township is unprecedented in a few ways: There is no mastery. It is 100% passive, meaning you can progress without interrupting other Skills you may be training. You can ignore the Skill, and come back to it whenever you want without losing efficiency or XP.」(2022-08-27) · 「There's no time waste with this Skill — You can ignore it and continue to earn Offline time to catch up at any time.」(2022-10-18)
- **Astrology 재작업 보상 부족**: 「the obvious flaw was with not providing adequate compensation for players who were well into the Mastery grind. This is 100% on us.」 — 2022-10-22
- **UI**: 「Major adjustments to the UI to make it look more like a game, rather than a 1998 Excel spreadsheet (rip)」 · 「An updated and very much improved Tutorial and onboarding process」 — 2022-10-22
- **Atlas of Discovery 출시 약 7주 뒤**: 「Atlas of Discovery requires quite a lot of adjustments to get it to the point where it becomes a viable choice of content throughout someone's 1-99 journey, and it should also provide some use after you're done with it.」 그리고 확인된 불만 4개를 나열(「Barrier Combat is Unrewarding」 · 「Barrier Mechanic Feels Bad」 · 「Overly Grindy Nature of Upgrading」 · 「Slow Kill Times」) — 2023-10-24
- **Astrology 설계 원칙(1.0)**: 「go back to the complete basics of Melvor Idle and implement a Skill that provides nothing but bonuses to you. There are no external GP Costs, Item Costs, Level requirements or anything within this Skill.」 — 2021-11-11
- **지원 방침**: 「every month we'll be updating the game with quality of life improvements, bug fixes, performance tweaks, skill balancing」 · 「we can't promise that every fix you're hoping for will always arrive as quickly as you might like」 — 2021-12-14
- **Township 1부만 나온 이유**: 「the scope of the Skill itself is too large to justify delaying v1.0 for」 — 2021-10-15

### 6-5. 온라인 요구 → 오프라인 클라이언트
- 2024-11-19: 「The Offline Client is now available for public Beta testing. This brings full offline functionality … You must first load the game once with an internet connection … You cannot access your Cloud Saves or cross-platform purchases when in Offline mode.」
- 2025-01-22: 오프라인에서도 「구매를 30일 캐시」하는 방식으로 크로스플레이를 풀겠다고 함. 「This feature is the main reason the Offline Client hasn't been fully released yet.」
- MI2: 「Offline by Default: Melvor Idle 2's client is offline by default. No waiting around for us to rework it and remove the online requirement!」 — 2025-04-23
- 웹 판: 「Godot with C# does not support web builds … we do too [want a web version]」 — 2025-04-23 (MI2 는 웹이 당장 없다)
- 영어만 지원하는 EA: 「Localizing content can take up to 8 weeks depending on how many changes there are」 — 2025-04-23

---

## 7. 모드 생태계

| 항목 | 내용 | 출처 |
|---|---|---|
| 비공식 시기 | 공식 지원 전에도 **브라우저 사용자 스크립트(Tampermonkey 류)** 로 「Melvor ETA」(xp/h · 목표까지 남은 시간, Greasy Fork 등록 2020-11-06, 누적 설치 4,447)·「Melvor Idle Helper」·「SEMI」·「Combat Simulator」가 돌았다. 2022-10 Steam 토론에 「M3 is closed now」 언급 — 이전 모드 체계가 닫힘 | `[Steam]` 토론 · Greasy Fork (WebFetch 요약) |
| **공식 모드 지원 시작** | **2022-10-18(v1.1)**, 확장 1 과 같은 날 **무료 업데이트**로. 크로스플랫폼(PC · 웹 · 모바일). mod.io 연동, 게임 안에 Mod Manager 내장 | `[개발자글]` 2022-04-09 · 2022-08-27 |
| 초기 규모 | 지원 **한 달이 안 돼 mod.io 에서 140개 모드 · 100만 다운로드** 돌파 | `[기사]` ModDB 요약 (기사 날짜 미기재 — 「지원 추가 후 한 달이 안 됨」이라 2022-11 로 읽음 `[해석]`) |
| 관리 도구 | 2023-12-15 Mod Manager v2 — 캐릭터별 **모드 프로필**(최대 6개) · 무한 스크롤 · 플랫폼 태그 | `[개발자글]` |
| 공식 대회 | 2023-06 · 2024-09 「Create a Mod」 — 총상금 $3,000(1위 $1,000). 상위작: Archaeology(Kruithne, 2위) · [Myth] Music(3위) · Path of Melvor(4위) · Treasure Trails - Clue Scrolls(5위) · 6~10위에 또 다른 Archaeology Skill 등 → **Archaeology 는 나중에 확장 2 의 정식 스킬이 되었다**(발표문이 「대회작과 무관」이라고 못박음) | `[개발자글]` 2023-07-14 · 2023-08-01 |
| 오프라인 클라이언트 · 모바일 | 모드는 오프라인에서도 프로필 관리 가능, 새 모드 검색 · 다운로드는 온라인만 | `[개발자글]` 2024-11-19 |

**인기 모드가 고치는 것 (플레이어가 아쉬워하는 점의 간접 증거)** — 인기 · 추천 모드로 확인된 이름 기준:

| 모드 | 하는 일 | 뒤집어 읽으면 | 출처 |
|---|---|---|---|
| **Melvor ETA** | 시간당 XP · 마스터리 XP · **자원이 언제 바닥나는지 · 목표 레벨까지 남은 시간** 표시 | 게임이 진행 예측 · 소요 시간을 안 보여 줌 | `[Steam리뷰]` #109276196 · Greasy Fork |
| **SEMI** (스크립트 자동화 코어) | 자동 판매 · 자동 수확 · 자동 행동 전환 등 자동화 | 방치형인데 확인 · 전환이 수동 | #109276196 · mod.io 인기 목록(검색) |
| **Combat Simulator (Reloaded)** | 전투 결과 시뮬레이션 | 장비 · 마법 조합의 결과를 게임 안에서 못 봄 | #109276196 |
| **Skill Boosts** | 스킬 속도 · 보너스 조정 | ItA 의 「비용 50배 · XP 1/4」 같은 페이스 문제(리뷰 #167950089 「many of this expansion's problems can be mitigated by getting the "Skill Boosts" mod」) | mod.io 인기 목록(검색) · 리뷰 |
| Show Item Sources And Uses | 아이템 출처 · 용도 | 3,700종이 넘는 아이템의 정보 검색 | mod.io 인기 목록(검색) |
| 「Welcome Back」 팝업 생략 · 자동 판매 · 목표 노트 · Pinned Drops | 복귀 팝업 · 잡템 정리 · 메모 · 드롭 고정 | 복귀 절차 · 가방 관리 · 목표 관리 부담 | GitHub 토픽 `melvor` |
| 오프라인 상한 해제 · **속도 배율(speed changer)** · 마스터리 XP 넘침 보정 | 상한 · 페이스 · 마스터리 낭비 조정 | 24h 상한 · 후반 페이스 · 마스터리 오버플로 | 리뷰 #156297968 · #199149376 · #216438375 · #213526778 |

- 모드 언급 리뷰의 태도: 「Some mods are a necessity now, I cannot live without them」(#221528438 · 2026-03-24) · 「most people's issues can normally be solved with the in game mod manager」(#128536215 · 2022-12-14) · 「The progress felt so slow that I knew I had to use mods to not waste my life to this game」(#199149376 · 2025-07-07) — **긍정 리뷰가 모드를 「불만을 푸는 도구」로 명시하는 경우가 많다** `[해석]`.
- 「Melvor Ultimate Modpack」 컬렉션은 모드 **40개**를 묶었다(mod.io 컬렉션 제목 · 검색 스니펫). 총 모드 수 · 다운로드는 mod.io 가 JS 렌더링이라 **오늘 값을 못 읽었다.**

---

## 8. 비슷한 게임

전부 존재를 Steam API / 공식 페이지 / 위키로 확인한 것만 적었다. 리뷰 수 = 2026-09-30 Steam 전 언어 합계.

### 8-1. Melvor 를 닮은 게임 (다중 스킬 · 오프라인 진행 · RuneScape 계열)

| 제목 | 출시 | 플랫폼 · 과금 | 한 줄 특징 | 평가 규모 |
|---|---|---|---|---|
| **Idle Clans** | 2023-04-07 (Steam EA) | Win · Mac · **무료 + 인앱**. 멀티플레이 | 클랜 · 플레이어 경제 · 스킬 약 20종 · 「고전 MMORPG 경험을 덜 시간 들이게」 | 1,687건 · 75% |
| **Milky Way Idle** | 2025-03-06 (Steam EA, 웹 서버는 약 2년 전부터 운영) | Win · **무료 + 인앱**. 멀티플레이 | 스킬 · 제작 · 파티 전투 · 시장 · 길드, 「자동화가 그라인드를 대신」, 10시간 이상 오프라인 | 2,437건 · 49% |
| **IdleOn — The Incremental MMO** | Steam 뉴스는 2021-03 부터 · Steam 페이지 출시일 표기 2025-11-06 | Win · 무료. 멀티 | 영웅이 자리를 비운 사이에도 싸우는 방치 MMO, 스킬 20종(Farming · Sailing · Construction 등) | **29,912건 · 77%** |
| **IdleMMO** | 2024-04-22 (iOS 1.0) | iOS · 웹 · **무료 + 멤버십 $6.99 · 토큰 $6.99~$69.99** | SimpleMMO 제작진의 방치 MMORPG, 던전 · 월드 보스 | App Store 733건 · 4.8 |
| **Scapewatch: Idle MMO** | Steam 2026-09-25 | Win · Linux · $9.74 | 「스킬 30 · 전투 3종 · 클랜 · 레이드 · 하이스코어」, 큐를 걸고 탭을 닫음 | 320건 · 87% |
| **Evitania Online** | 2026-04-07 (Steam EA) | Win · 무료 + EA | 열린 세계 방치 RPG, 전문 직업 · 제작 · 보스 | 1,033건 · 79% |
| **Glenwich Idle MMO** | 2026-04-06 (Steam EA) | Win · Mac · 무료 | 14개 스킬 · 레시피 수백 개 · 거래소 · AFK | 43건 · 40% |
| **RuneScape: Idle Adventures** | 2016-09-01 → **2017-05-15 서비스 종료** | Steam | Jagex + Hyper Hippo 의 RuneScape 방치 스핀오프, **Melvor 이전의 Jagex 자체 시도** | `[기사]` 요약(규모 미확인) |

- 위 게임은 **거의 전부 멀티플레이 · 무료 + 결제** 구조다. Melvor 는 **싱글플레이 · 매입형 · 결제 없음**으로, 이 시장에서 정반대 쪽이다 `[해석]`. Idle Clans · IdleMMO · Milky Way Idle 은 플레이어 시장 · 멤버십 · 토큰을 수익원으로 둔다(개발자가 「멀티플레이는 우리 수익 모델과 안 맞는다」고 한 §6-1 과 정확히 반대의 선택).
- Idlescape(Steam 페이지는 존재하나 리뷰 0 · 출시일 표기가 2027-01) 는 이력을 확인하지 못해 뺐다.

### 8-2. 생존 테마의 텍스트 기반 · 방치형 · 증분 게임

| 제목 | 출시 | 플랫폼 · 과금 | 한 줄 특징 | 평가 규모 |
|---|---|---|---|---|
| **A Dark Room** | 2013-06-10 (웹) · iOS 2013 말 · Android 2016 · Switch 2019 · **Steam 2023-07-06** | 웹 무료(오픈소스 MPL 2.0) · 앱 유료 · Steam $6.99 | 텍스트만으로 「불 피우기 → 마을 → 황무지 탐험」, 증분 생존의 원형. New Yorker 「미스터리 이야기 + 스마트폰 생산성 앱의 혼종」 | GitHub 별 8,310 · Steam 72건 90% · 2014-04 App Store 게임 1위 |
| **A Dark Cave** | 웹 무료 판(초판 연도 미확인) · **Steam 2026-10-27 예정**(Next Fest 10/19~26) | 웹 무료 + 선택 결제 · Steam 유료 | 동굴에서 깨어 불 피우기 · 자원 · 마을 · 텍스트, **「Sleep Mode」로 마을 사람이 오프라인 생산**. 1인 개발(Julian Bauer) | 미확인(신작) |
| **Level 13** | 2015-07 (GitHub 첫 커밋) · 활동 중(2026-06 푸시) | 웹 무료 · 오픈소스 Apache-2.0 | 「어둡게 무너진 도시에서 생존 · 기술 재발견 · 문명 재건」 텍스트 증분 SF, 무작위 지도 | GitHub 별 262 · 포크 89 |
| **Idle Survival: Last Haven** | 2026-09-16 | Win · $4.99 | 포스트 아포칼립스 방치 생존 RPG — 수색 · 제작 · 전투 · 재건, 던전 · 차량 · 재능 트리 | 24건 · 42%(부정 우세, 출시 2주) |
| **Stone Story RPG** | Steam 2023-07-26 | Win · Mac · Linux · $29.99 | **ASCII 아트**로 그린 자동전투 RPG, 「영원한 어둠의 세계」 · 제작 · 프로그래밍 요소 (생존 테마는 느슨함) | 996건 · 91% |
| **Zombie Exodus** | 2011-12 (iOS) | iOS | 텍스트 생존 시뮬, 선택이 누적 결과를 만든다 (방치형은 아님) | 규모 미확인 |
| **Lifeline** | 2015-04-16 (iOS · Apple Watch) · PC 2017-03-17 | iOS · PC | 텍스트 메신저형 우주 생존 이야기 (방치형 아님) | 미확인 |

- 「Increlution」(2021, 1,257건 85%)·「Bitburner」(2021, 7,431건 95%)·「Trimps」(2022 Steam, 1,497건 90%)는 텍스트 · 증분이지만 **생존 테마가 아니라서** 뺐다.
- 이 표에서 **평가 규모가 가장 큰 것은 Steam 정식 리뷰 수가 아니라 A Dark Room 의 GitHub 별 8,310 · 앱스토어 이력**이다. 생존 + 텍스트 + 방치의 세 조건을 한꺼번에 채우는 대형 게임은 이번 조사에서 확인하지 못했다 `[해석]`.

---

## 9. 확장팩이 더한 것과 확장팩별 평가

### 9-1. 더한 것 (요약 · 상세는 짝 문서)

| 확장 | 출시 · 가격 | 핵심 | 본편 요구 | 출처 |
|---|---|---|---|---|
| ToTH | 2022-10-20 · $4.99 | 모든 스킬 **레벨 100~120** · 던전 7 · 슬레이어 구역 8 · 몬스터 55+ · 아이템 500+ · 최종 보스 | 본편 + 레벨 99 근처 | `[Steam]` `[데이터]` (아이템 602 · 몬스터 58) |
| AoD | 2023-09-07 · $4.99 | **레벨 1~99 구간** 신규 스킬 Cartography · Archaeology · 게임모드 Ancient Relics · 신규 전투 「Barrier」 · 아이템 600+ | 본편(선행 확장 불필요) | `[Steam]` `[데이터]` (아이템 699 · 몬스터 46) |
| ItA | 2024-06-13 · $4.99 | 본편 최종 던전 **클리어 후** 평행 「Abyssal」 레벨 60개 · 스킬 Corruption · Harvesting · 스킬 트리 · 아이템 900+ | 본편 최종 던전 클리어 | `[Steam]` `[데이터]` (아이템 1,041 · 몬스터 101) |

### 9-2. 평가 차이

| | 긍정률(전 언어) | 부정 리뷰에서 많이 나온 것 | 대표 인용 |
|---|---|---|---|
| **ToTH** 85.3% (231건) | 좋은 편 | Township 불만 5 · 밸런스 7 (표본 18건) | 「All the content is post-level 100 so do try out the base game first」(#124121272 · 133, 긍정) · 「be prepared to lose half of all your mastery bonuses」(#124129369) · 「this DLC development is really badly balanced with fixing the base game. This game still has items with missing descriptions」(#139466971 · 2023-06-03) |
| **AoD** 59.5% (262건) | Mixed | 반복/그라인드 24 · 전투 18 · 확장팩 자체 언급 36 (표본 55건) | 「Barrier combat feels so awful」(#147533846) · 「Cartography and Archaeology take insane amounts of time, tons of $$$, and so many inventory slots」(#173634745 · 2024-08-29) · 「The vast majority of the items/monsters/dungeons are completely useless to people who have finished TotH」(#149563800) |
| **ItA** 44.0% (193건) | Mixed(부정 우세) | 반복/그라인드 17 · UI 10 · 후반 5 (표본 40건) | 「absolutely not worth your time, regardless of its price」(#185385180 · **328 표** · 2025-01-12) · 「took the entire base game and doubled the time and costs for everything and painted it red」(#184561710) · 「They probably should have just made Melvor Idle 2」(#167478805) · 「this should have just been a different game mode … 95% detached from everything in the base game」(#170816745) |

- **긍정 쪽**: ToTH 는 「가격 대비 콘텐츠 양」(#124311293), AoD 는 「엄청난 콘텐츠 양 · Ancient Relics 모드」(#145866624 · #146038698 은 Ancient Relics 를 「가장 완성된 버전」이라 칭찬하면서 부정), ItA 는 「거의 완전히 새 생태계라 신선하다」(#167582372 · 2024-06-18)와 「본편 최종 던전을 깬 사람은 산다」(#167283968 · 66).
- **확장팩 평가가 낮아지는 방향**은 일관되다 — 뒤로 갈수록 (a) 앞 콘텐츠와 **단절**(ItA: 「100% detached」) (b) **비용 · 시간 배수 증가**(ItA: 「multiplied the costs by 50x and quartered the xp gain」, 리뷰어의 계산) (c) **UI · 메뉴 복잡도**(#167290882 「mspaint levels of UI」) `[해석]`.
- **진입 조건 불만**(Steam 토론 2024-06-13, 3,000시간 유저): 「all of the expansion content, including the non-combat skills, is locked behind combat progression」 `[Steam]` 토론 요약.
- 개발자의 이 반응: AoD 는 출시 6주 뒤 대규모 조정 예고(§6-4). ItA 는 2024-08-29 「ItA Balancing」을 v1.3.1 미리보기에 포함(공지 제목) `[개발자글]`.
- 확장팩의 리뷰가 **가격이 아닌 설계**를 겨냥한다는 점은 §5 서두와 같다.

---

## 10. 출처 · 확인 못 한 것

### 10-1. 출처 (2026-09-30 조회)

- **Steam API**: `store.steampowered.com/appreviews/{1267910,2055140,2492940,2860590}` · `api/appdetails` · `ISteamNews/GetNewsForApp`(appid 1267910, 103건) · `GetNumberOfCurrentPlayers` · SteamSpy `appdetails`. 상점 페이지 `app/1267910 · 2055140 · 2492940 · 2860590 · 3218350(MI2) · 2103530 · 3224420 · 2460660`. 토론 `steamcommunity.com/app/1267910/discussions/0/{6471190240002202566, 3823048658579688139, 3882723164279193053}`
- **개발자 · 공식**: Steam 공지 2020-11-20 ~ 2025-04-23 중 §6 에 인용한 글 전부(날짜를 본문에 병기). news.melvoridle.com 2025-08-13 · 2025-11-20 · 2026-06-12 · 2026-09-29 (프록시 + 요약). `jagex.com/news/jagex-announces-partnership-to-publish-melvor-idle`(2021-10-21) · `.../melvor-idle-version-1-0-launches-on-pc-and-mobile`(2021-11-18). `wiki.melvoridle.com/w/Full_Version`(프록시). App Store `id1518963622` · `id6469646231`(IdleMMO)
- **기사 · 제3자**: PC Gamer 2021-10-25 · 2023-12-22 · GamingOnLinux 2021-06-18 · 2021-11-03(Steam 뉴스 피드 발췌만) · PocketGamer · Wikipedia `A_Dark_Room` · GitHub API(`nroutasuo/level13` · `doublespeakgames/adarkroom`) · steam-revenue-calculator.com · Greasy Fork `Melvor ETA` · ModDB(모드 100만 다운로드, 프록시 요약) · vaporlens.app(제3자 AI 리뷰 요약 — 본문 근거로 쓰지 않았고 방향이 §5 와 겹치는 것만 확인)

### 10-2. 확인 못 한 것 · 어긋난 곳

| 항목 | 상태 |
|---|---|
| **Reddit 전체** | 차단(직접 · jina · WebSearch 도메인 지정 전부). Reddit 글은 근거에 없다. 「Melvor Idle x Jagex FAQ」(Reddit, 2021-10)도 원문을 못 읽었다 |
| **확장팩 출시일이 00_overview.md 와 어긋난다** | 00_overview §1 은 AoD **2023-09-04** · ItA **2024-03-14** 로 적었다. Steam API 는 AoD **2023-09-07** · ItA **2024-06-13**(ToTH 2022-10-20 은 일치). 09-04 는 무료 v1.2 + 4주년 공지 날짜, 03-14 는 ItA **발표일**이다(Steam 공지 제목 「Announcing Melvor Idle: Into the Abyss!」). 위키 Full_Version 도 ItA 를 「March 2024」로 적어 발표일을 출시일처럼 쓴다 |
| 원래 Steam 「Early Access」 시점 | Steam 상점 요약은 「Early Access 2020-11-19 · Full Release 2021-11-18」, 개발자 공지는 「Steam 출시 2020-11-20」(24시간 시차 · 시간대), Jagex 보도자료는 EA 를 「2019-09」로 적음(웹판 공개를 EA 로 세었을 가능성) — 웹 공개 자체는 개발자 공지 2021-10-15 의 「September 2019」가 가장 직접적 |
| 24h 상한으로 올린 정확한 날짜 | 2022-03(18h 불만 리뷰) ~ 2023-04-12(24h 공지) 사이로만 좁혔다 |
| 「확장 3종은 무료」라는 원래 약속 | 리뷰 1건(#119164482, 594 표)의 주장. 개발자 원문을 못 찾았다 |
| **판매 부수 · 매출 · 라이선스 수익 배분** | 공식 발표 없음. 위 추정치는 전부 제3자 · 관행 계산 |
| Google Play 평점 · 설치 수 | 404 · 미확인 |
| 모바일 인앱 상품 가격 | App Store 페이지 요약(버전 정보가 2023 년 것으로 낡아 있음) — 오늘 값과 다를 수 있다 |
| mod.io 의 현재 모드 총수 · 다운로드 | JS 렌더링으로 못 읽음. 「140개 · 100만」은 2022-11 초의 값 |
| 인기 모드의 순위 | mod.io 정렬을 못 읽어 **이름은 검색 스니펫 · 리뷰 · GitHub 에서 모은 것**이다 |
| 2026-08 서버 다운의 원인 · 기간 | 리뷰 4건(2026-08-14 3건 · 08-23 1건)으로만 확인. 공식 상태 공지는 못 찾았다 |
| MI2 정식 EA 날짜 · 가격 확정 | 「2026 · $14.99 · Next Fest 데모 2026-10-19~26」은 개발자 글 요약 기준이며 상점은 여전히 「Coming soon」 |
| 본편 MI1 의 추가 확장 계획 | ItA 이후 새 확장 발표는 확인하지 못했다(로드맵의 「3 more expansions」는 이미 나온 ToTH · AoD · ItA 를 가리키는 것으로 읽힘) |
| news.melvoridle.com 원문 | 직접 요청 403. 프록시 + 요약기 결과라 세부 수치(스킬 12 · 아이템 731 등)는 원문 대조를 못 했다 |
| 「Idlescape」 | Steam 페이지는 있으나 출시 연혁 · 규모 미확인이라 §8 에서 뺐다 |

---
*마지막 업데이트: 2026-09-30*
