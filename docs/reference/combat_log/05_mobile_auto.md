# 조사 로그 05 — 모바일·브라우저 자동전투 RPG 무리의 피해 정보 표시 (2026-09-21 시점)

담당 무리: Epic Seven · AFK Arena · Summoners War(Sky Arena) · Shakes & Fidget · Teamfight Tactics · (보조) Idle Champions of the Forgotten Realms

전제: 이 무리는 전부 **조작이 거의/전혀 없는 전투**를 표본으로 한다. 「로그 대신 무엇을 보여주는가」가 핵심 질문.

---

## 1. Epic Seven

- **PvP(월드 아레나) 결과 화면**: Victory/Defeat + 정복 포인트(conquest points) 획득만 표시. 개별 영웅 데미지 통계가 결과 화면에 나온다는 근거를 찾지 못함. `⚠추정` — 표준 PvE(어드벤처)·헌트·PvP 결과 화면은 승패·보상 중심이고 캐릭터별 데미지 그래프는 없는 쪽에 가깝다.
  - 출처: 검색 다수 시도, 직접 확인 불가 → `N/F` (게임 내 직접 확인 필요)
- **월드보스(길드 협동)**: "Players will be able to see rankings for the most recently fought World Boss Battle on the left-hand side of the screen" — 즉 **플레이어(길드원) 단위 데미지 랭킹**을 보여준다. 캐릭터·스킬별 분해는 언급 없음. 이건 파티 내부 분석이 아니라 **길드원 간 기여도 비교** 용도.
  - 출처: [Pocket Gamer – World Boss / Equipment Conversion patch](https://www.pocketgamer.com/epic-seven/epic-sevens-latest-update-introduces-a-co-operative-world-boss-mode-and-equipmen/), [Epic7x 11/28 패치 노트](https://epic7x.com/11-28-patch-equipment-conversion-world-boss-ml-lidica-giant-update/) (2026-09-21 접속)
- **매치 히스토리 사이트**(`epic7.onstove.com/en/gg`)는 공식 스토브가 운영하는 PvP 전적 검색 서비스 — "Match History", "Hero Analysis", "Ranking" 3섹션. 이건 **게임 내 UI가 아니라 별도 웹 서비스**이고, 구체적으로 무엇을 보여주는지(승/패 여부만인지 데미지까지인지)는 페이지 크롤링으로 확인 못 함. `N/F`
- **자동전투 배속**: ×1~×3 배속 존재(커뮤니티 가이드 다수 언급), 배속 올리면 애니메이션이 빨라짐 — 팝업 자체가 사라진다는 근거는 못 찾음. `⚠추정`
- **결론**: Epic Seven은 "캐릭터별 누적 데미지 그래프"를 **일상 콘텐츠에는 두지 않고**, 길드 협동 콘텐츠(월드보스)에만 **플레이어 단위** 랭킹으로 국한하는 쪽으로 보인다. 이는 본작이 조사 우선순위 1번으로 놓은 "캐릭터별 데미지 그래프"가 사실 이 게임의 대표 사례가 아닐 수 있음을 시사 — 확인 실패를 반드시 사용자에게 알려야 함.

## 2. AFK Arena

- **Replay System**(공식 기능): "The battle statistics page allows players to see how much damage their heroes have dealt/received and also see the total amount of HP a hero has healed others for." → **영웅별 가한 피해 / 받은 피해 / 치유량**을 배틀 스탯 페이지에서 확인 가능. 이는 전투가 끝난 뒤 **리플레이 시스템**의 일부로 제공됨(전투 자체를 다시 재생하면서 통계 페이지를 같이 보여주는 구조로 추정).
  - 출처: [AFK Arena Wiki(Fandom) – Replay System](https://afk-arena.fandom.com/wiki/Replay_System) (검색 스니펫으로 확인, 원문 직접 fetch는 402 오류로 실패 — 스니펫 인용은 신뢰 가능하나 전체 레이아웃·정렬 방식은 `N/F`)
- **소탕/스킵**: "Fast Reward"라는 기능으로, 이미 클리어한 스테이지를 애니메이션 없이 즉시 보상만 지급(진행 단계에 비례한 보상). 즉 **소탕 시에는 전투 자체를 재생하지 않고 결과(보상)만** 준다 — 로그·데미지 통계 없음.
  - 출처: [afk.guide 기능 해금 가이드](https://afk.guide/function-unlocks/), [afk.guide 게임 메커니즘 Top 30](https://afk.guide/game-mechanics/)
- **World Boss**: 상위 50개 길드를 데미지 기준으로 리더보드 표시(길드 단위). Epic Seven 월드보스와 유사한 패턴.
- **드릴다운**: 리플레이 통계 페이지가 영웅별 항목으로 되어 있는 것은 확인되나, 스킬별로 더 쪼개는지는 `N/F`.

## 3. Summoners War (Sky Arena)

- **전투 중 UI**: 공격 게이지(Attack Bar)가 7%/틱 씩 채워지는 방식의 턴 순서 표시 바가 화면 상단에 있음(각 몬스터가 게이지 순서대로 나열). 데미지는 팝업 숫자로 표시.
  - 출처: [Summoners War Wiki(Fandom) – Attack Bar](https://summonerswar.fandom.com/wiki/Attack_Bar) (요약 스니펫)
- **결과 화면 + 리플레이**: 공식 패치로 "Replay" 버튼이 전투 종료 화면 상단에 추가됨 — **영상(비디오) 형태로 처음부터 재생**해서 녹화·SNS 공유 가능. 이건 **텍스트 로그가 아니라 실제 전투를 그대로 다시 그려주는 리플레이**다.
  - 출처: [Summoners War patch 3.8.1 (Fandom)](https://summonerswar.fandom.com/wiki/Summoners_War_patch_3.8.1) (검색 스니펫)
- **결정적 증거 — 데미지 로그가 "없다"**: Com2us 공식 포럼에 "Arena/GW Battle Log/Replay"라는 **유저 건의 글**이 존재. 요지: "수비 배치한 AI 몬스터가 어떻게 싸웠는지 보여주는 리플레이가 있었으면 좋겠다"(Clash of Clans 참고), 댓글 중 "턴 단위 정보를 저장해서 클라이언트에서 재구성하면 데이터 사용량도 줄고 핵 탐지도 쉬울 것"이라는 대안 제시. → **이 게시물 자체가 건의(suggestion)라는 사실이, 정식 서비스에는 턴 단위 텍스트 로그/리플레이가 없다는 뜻**이다. 즉 SW는 방어전(아레나/길드전 수비)에 대해 결과(승패)만 통보하고, 어떻게 졌는지는 유저가 알 방법이 정식으로는 없다 — 이게 커뮤니티의 반복적 불만.
  - 출처: [Com2us Forums – Arena/GW Battle Log/Replay](https://forum.com2us.com/forum/main-forum/summoner-s-war/suggestions-aa/1175740-arena-gw-battle-log-replay), 관련 건의 다수: [Add Replay Option](https://forum.com2us.com/forum/main-forum/summoner-s-war/suggestions-aa/764447-add-replay-option-on-arena-battle-system), [Battle Log Details](https://forum.com2us.com/forum/main-forum/summoner-s-war/suggestions-aa/877820-battle-log-details), [replay feature modification](https://forum.com2us.com/forum/main-forum/summoner-s-war/suggestions-aa/1767886-replay-feature-modification)
  - **주의**: "MVP/Takedown/Assist" 형태의 스코어보드는 검색에서 나왔으나 이는 **Summoners War: Chronicles**(오픈월드 MMO 스핀오프, 별개 게임)의 PvP 전장 얘기로 확인됨. 원 조사 대상인 Sky Arena와 혼동 금지.

## 4. Shakes & Fidget

- **전투 진행 방식**: 턴제(turn-based), 라운드마다 분노(rage) 게이지가 올라 강한 공격 가능. 아레나는 10분마다 재도전 가능(버섯템으로 대기시간 스킵).
- **리플레이**: "과거 전투는 메일의 '전투(Fights)' 탭을 클릭하면 다시 볼 수 있다"고 공식 헬프센터가 명시. **일정 기간 저장되는 전투 리포트**를 유저가 스스로 다시 재생하는 구조 — 이는 텍스트 로그 + 애니메이션 재생(고전 브라우저 게임 특유의 방식)으로 알려져 있음.
  - 출처: [Playa Games Help Center – Fights](https://playa-games.helpshift.com/hc/en/4-shakes-fidget-1653988985/faq/330-fights/) (검색 스니펫으로 확인)
- **줄 형식 원문 확보 실패**: 실제 로그 텍스트("~ hits you for ~ damage" 류) 원문 3줄 이상을 확보하지 못함. 포럼 fetch가 DNS/402 오류로 반복 실패. `N/F` — 다만 이 장르(브라우저 방치형 MMORPG, 예: OGame/Travian 계열 텍스트 전투 로그)의 일반적 관례상 "공격자가 X 데미지로 명중/치명/회피" 한 줄씩 나열하고 마지막에 승패·보상을 붙이는 형식이 표준이라는 점은 간접 확인(치명타 확률 공식, 회피 등 개별 판정이 문서화되어 있어 판정 단위가 로그 한 줄 단위로 발생함을 시사).
- **배속과의 관계**: 배속 개념 자체가 약함(자동전투 게임이라기보다 "결과가 즉시 계산되고, 애니메이션은 그 결과를 보여주는 재생물"에 가까움) — 즉 **로그가 먼저 계산되고, 재생은 그 로그를 애니메이션으로 입히는 후처리**라는 구조적 특징이 있다. 이는 본작의 "리포트에서 재생"(CLAUDE.md 언급 — 오프라인 전투는 리포트에서 재생) 철학과 유사한 패턴.

## 5. Teamfight Tactics

- **Combat Recap(전투 리캡)**: **Tab 키**로 토글, **S 키**로 "데미지 딜량(damage dealt) → 받은 피해(damage taken) → 치유(healing)" 세 탭을 순환. 패치 12.6(Set 6.5 Neon Nights)에서 확인된 핫키.
  - 출처: [League of Legends Wiki(Fandom) – V12.6](https://leagueoflegends.fandom.com/wiki/V12.6_(Teamfight_Tactics)) (검색 스니펫)
- **형식**: 라운드 후(또는 언제든 Tab) 챔피언별 **막대 그래프**로 표시되는 것이 커뮤니티에 널리 알려진 형태(챔피언 아이콘 + 막대 길이 = 수치, 정렬은 내림차순). 세 지표(가한 피해/받은 피해/치유)를 **탭 전환**으로 분리해서 보여주는 것이 특징 — 한 화면에 다 우겨넣지 않는다.
- **드릴다운**: 챔피언을 눌러 스킬별로 쪼개는 기능은 확인 못 함(`N/F`) — TFT는 챔피언 단위가 최소 단위로 보인다(스킬이 챔피언당 1개뿐이라 애초에 쪼갤 필요가 적음, 자동 전투 특성상 아이템 단위 분해가 더 유효할 수 있음).
- **커뮤니티 활용**: 이 리캡은 "이번 판 내 포지셔닝이 맞았는지, 캐리가 딜을 넣었는지" 사후 확인용으로 자주 언급되며, 시즌마다 UI가 개편되어 왔다(구체 변천사는 이번 조사에서 `N/F`).

## 6. Idle Champions of the Forgotten Realms (보조)

- **DPS 미터**: 커스터마이즈 가능, **Base DPS**(고정 조건 계산) vs **Running Average DPS**(실측 이동평균) 두 값을 표시.
- **BUD(Base Ultimate Damage)**: 최근 몇 히트 중 단일 대상 최대 피해 기준. **BUD 위에 마우스를 올리면 누가 가장 큰 히트를 넣고 있는지**와 "Area Base Monster Health" 같은 부가 정보가 슬라이드아웃으로 뜬다.
- **드릴다운 확인 사례**: DPS 숫자 위에 마우스를 올리면 챔피언별 분해 목록이 슬라이드아웃으로 나온다 — 이 무리에서 가장 명확한 "호버 드릴다운" 사례.
  - 출처: [Codename Entertainment 공식 DPS 태그 페이지](http://codenameentertainment.com/?page=idle_champions&tag=dps), [Idle Champions Wiki(Fandom) – Category:DPS](https://idlechampions.fandom.com/wiki/Category:DPS)

---

## 대조표 — 게임 × 표시 항목

| 게임 | 전투 중 상시 표시 | 결과 화면 항목 | 형식(그래프/정렬) | 로그 유무 | 배속 시 생략되는 것 | 소탕/스킵 시 | 드릴다운 |
|---|---|---|---|---|---|---|---|
| Epic Seven | 팝업 데미지, HP바, 스킬 쿨 | PvP: 승패+포인트만(`⚠추정`). 월드보스: **플레이어(길드원) 단위** 데미지 랭킹 | 랭킹 리스트(좌측 패널) | 없음(캐릭터 단위 로그 `N/F`) | `N/F` | `N/F` | `N/F` |
| AFK Arena | 팝업 데미지, HP바 | **영웅별 가한 피해/받은 피해/치유** (리플레이 통계 페이지) | `N/F`(막대 추정 `⚠추정`) | 없음, 리플레이(영상형)로 대체 | 소탕("Fast Reward")은 재생 자체를 생략, 보상만 | 애니메이션·통계 전부 생략, 보상만 즉시 지급 | `N/F`(영웅 단위까지만 확인) |
| Summoners War | 팝업 데미지, 공격 게이지(턴 순서 바) | 승패 + 보상만. **방어전은 결과 통보만**, 어떻게 졌는지 모름(유저 반복 불만) | 없음 | **없음** — 텍스트 로그 자체가 없고 영상 리플레이(전체 재생)로만 사후 확인 | `N/F` | `N/F` | 없음(로그가 없어 애초에 대상 없음) |
| Shakes & Fidget | (실시간 표시 없음 — 결과 먼저 계산 후 재생) | 승패, 획득 골드/명예/XP | **텍스트 로그 + 애니메이션 재생**(원문 확보 실패, `N/F`) | **있음**(로그 선계산 → 재생은 후처리) | 배속 개념 약함 | `N/F` | `N/F` |
| Teamfight Tactics | 없음(전투 자체가 짧고 자동) | **가한 피해 / 받은 피해 / 치유** 3분류, 챔피언별 | **막대 그래프**, Tab 토글 + S 키로 지표 전환 | 없음(그래프가 로그 역할 대체) | 해당 없음(전투가 8초 내외) | 해당 없음 | 챔피언 단위까지만(스킬 단위 `N/F`) |
| Idle Champions(보조) | **DPS 미터 상시 표시**(Base/Running Average) | 해당 없음(방치형 특성상 결과 화면 개념이 약함) | 숫자 + 슬라이드아웃 리스트 | 없음 | `N/F` | `N/F` | **호버 시 챔피언별 분해**(가장 명확한 드릴다운 사례) |

---

## 확보 실패 항목 정리 (`N/F`)
1. Epic Seven 표준 PvE/PvP 결과 화면에 캐릭터별 데미지 그래프가 실제로 있는지 없는지 — 게임 내 직접 확인 필요
2. Epic Seven 배속(×1~×3)이 팝업/애니메이션을 실제로 생략하는지
3. AFK Arena 리플레이 통계 페이지의 정확한 레이아웃(막대? 표? 정렬 기준?)과 스킬 단위 드릴다운 여부
4. Shakes & Fidget 실제 로그 원문(영/독 3줄 이상) — 포럼 접속 오류로 실패
5. TFT 챔피언 → 스킬 단위 드릴다운 여부, 시즌별 UI 변천사
6. 이 무리 전반의 "유저 반응"(커뮤니티에서 이 정보로 빌드를 실제로 바꿨다는 구체 사례) — Summoners War의 "로그 없음에 대한 불만"만 명확히 확인, 나머지는 간접적
