# 오프라인 결투장 — 참고작 조사

> 상태: **2차** (2026-10-17) · 1차 3갈래 + 보강 5갈래 — 오프라인 대회 등급 9종 · 팀 운영 리그 6종 · 비동기 사람 등급 11종 · 「사람 같은 AI」 · 봇 표기 사례 · Steam 수치는 리뷰 API 원값 34종(§5)
> 목적: 결투장을 **오프라인**으로도 연다면 — 상대 = 조합을 갖춘 「인간 AI」 팀 · 골드 → 플래티넘 → 다이아 등급 — 비슷한 형태로 성공한 Steam 작품이 있나(사용자 2026-10-17). 쓰일 곳: [arena_design.md](../game_design/arena_design.md) · [GAME_DESIGN.md](../game_design/GAME_DESIGN.md) §10 「결투장」
> ⚠ 원전 수치 · 규칙은 그 작품의 것이다 — 본작 SSOT 아님. 조사자 제안은 **제안이지 결정이 아니다**. 출처 등급: 표시 없음 = 페이지를 열어 확인 · `(스니펫)` = 검색 요약으로만 확인 · `미확인` = 찾지 못함(없다는 뜻이 아니다). Fandom · Bulbapedia · GameFAQs · archive.org 가 막혀 위키 원문 확인이 약하다

## 0. 거른 기준 — 본작 제약

전투는 완전 자동 · 시드 결정론(판단은 편성뿐) · Phase 1 서버 없음(Steam 판매형 싱글) · 방치형 계약 「자리 비워도 안전」(결석 처벌 · 감쇠 금지) · 수직 유한(만렙 + 최고 장비가 있다) · 모든 밸런스는 PvP 기준 · 결투장 보상 = 칭호 · 꾸밈만(arena_design §0). 게임마다 세 질문을 물렸다 — ①상대를 어떻게 만드나 ②등급 · 승강은 어떻게 도나 ③만렙 뒤에도 의미가 있나.

## 1. 결론

- **형식에는 선례가 있다 · 장르에는 공백이다.**
  - 「오프라인 + AI 팀 + 브론즈 ~ 플래티넘 등급」은 **Digimon Story Cyber Sleuth 콜로세움**(Steam 89.6% · 1.3만 건)이 그대로 갖췄다 — Bronze → Silver → Gold → Platinum → Legendary 컵 · 앞 컵을 이겨야 다음이 열린다 · 컵마다 고정 테이머 명단
  - **방치형 · 파티 RPG 에서는 못 찾았다.** 직계 참고작 Lootun · Dragon Cliff 에는 결투장이 없다. 가장 가까운 동시대작 Partyforge Idle(2026-09)은 **온라인 비동기**다
  - **구조 전체가 가장 가까운 것은 Eslabong**(2026-08 얼리 액세스 · 오토배틀러 클럽 운영) — 오프라인 AI 리그가 본편 · 접속 중이면 1부 AI 가 실제 플레이어 조합을 빌린다(오프라인이면 내장) · 비동기 PvP 는 정규화(Competitive) · 성장(Eternal) 두 사다리
- **선례는 두 갈래다**
  - **(A) 오프라인 대회 등급** — Cyber Sleuth · Monster Rancher · DQM · 포켓몬 배틀 시설 · 철권 7 트레저 배틀. 손으로 짠 고정 상대 · **승급만 · 강등 없음** · 대개 **끝나는 사다리** · 보상은 대개 본편 힘
  - **(B) 비동기 사람 등급** — AFK · FEH · Backpack Battles · The Bazaar · Gems of War. 남이 올린 스냅샷을 AI 가 조종 · 점수 · 시즌 · 강등. 전부 온라인
  - 제안은 **(B)의 겉모습을 (A)의 공급으로** 돌리는 혼종이다. (A)만으로도 등급 이름까지 선례가 있고, 차별점은 「상대가 사람처럼 짠 팀으로 보인다」는 데 있다
- **가장 큰 구조 위험 — 만렙 + 최고 장비에 닿으면 사다리가 풀린다.** 증거가 넷이다
  - DQM — 「엔딩 후 S 랭크 몬스터를 얻었더니 쉽게 이기는 대회뿐」 · 한 번 깬 랭크는 재도전 불가
  - Eslabong — 「리그를 짓밟기가 너무 쉬워진다」 · 「엔드포인트가 없다」
  - Monster Rancher — 공식 사다리가 풀리자 팬들이 **능력치 구간으로 반을 나눈 AI vs AI 대회**를 스스로 만들었다(legendcup · 스니펫)
  - 포켓몬 BDSP — 상대 팀이 완전 고정이라 「위협 5종만 처리하면 100연승이 쉽다」
  - **검증된 대응은 정규화 하나** — 포켓몬 레벨 50 · Flat 규칙 · 종 · 도구 중복 금지 · Eslabong Competitive(전원 레벨 100 · 표준 유물). 그다음이 연승 구간마다 상대 풀 교체
- **조작 없는 편성 승부의 사다리는 성립한다** — Teamfight Manager 「카운터는 작은 ~ 중간 능력치 차이를 이긴다」 · 「밴픽 90%」. 대가는 「싸움이 시작되면 무력」 · 「매주 같은 일의 반복」 · 승격 문턱에서의 정체 · 「AI 가 멍청해 보이는 순간」(후속작 불만 1순위)
- **보상** — 온라인 비동기 보상을 핵심 재화로 걸면 방치 계약이 깨진다(Partyforge Idle — 출시 한 달 안에 결석 보정 패치). 오프라인 사다리는 대개 본편 힘을 주지만 **꾸밈 중심 선례도 있다**(철권 7 트레저 배틀 · 철권 8 CPU 고스트)
- **봇 표기** — 처음부터 AI · 개발자 기록임을 밝힌 쪽은 받아들여졌고(Forza 드리바타 · 마리오카트 스태프 고스트 · 철권 CPU 고스트 급수), 사람처럼 꾸민 쪽은 미움받았다(Marvel Rivals · Marvel Snap)

## 2. 게임별

### (A) 오프라인 대회 등급

| 게임 | 상대 | 등급 · 승강 | 보상 | 가져올 점 / 함정 |
|---|---|---|---|---|
| **Digimon Story Cyber Sleuth** 콜로세움 | 컵마다 고정 테이머 명단(Platinum 은 8명 · 마지막이 보스) | **Bronze → Silver → Gold → Platinum → Legendary** 컵 · 앞 컵을 이겨야 다음이 열린다 · 재도전 · 상대 레벨 미확인 | Brave Point(경험치 아이템) — 본편 힘 | 사용자 안의 등급 이름과 형태가 그대로인 오프라인 선례 |
| **Monster Rancher 1&2 DX** | 이름 있는 고정 몬스터 + 능력치 표 · 연도별 변형(StrategyWiki · 스니펫) · 상대를 미리 볼 수 있다(Information 명령) | 공식 E → D → C → B → A → S + 오픈 F · **한 단계씩 승급** · 공식 대회는 3 · 6 · 9 · 12월 · S 공식 우승 → Major 4 초대 · **매뉴얼에 강등 규정이 없다** · 도중 기권 = 대회 포기 · 육성자 랭크도 공식 우승으로만 오른다 | 상금 · 대회 뒤 능력치 상승(스니펫) | 등급 문턱 = 난이도 차단막 · 상대 정보 공개 / 풀린 뒤 팬이 정규화 대회를 만들었다 |
| **DQM 다크 프린스** 엔도르 콜로세움 | 손으로 짠 고정 명단 · 랭크당 3경기 · 경기당 적 3~4 | G → S 8단계 · 입장료가 오른다 · S 는 엔딩 후 · **한 번 깬 랭크는 재도전 불가 · 경험치 없음** · 강등 없음 | 랭크마다 아이템(약 · 고기 · 기술의 씨앗 · 행운의 메달) — 본편 힘 | 「엔딩 후 쉽게 이기는 대회뿐」 · 포스트게임 빈약(Vaporlens 집계). PC 판의 **Quickfire Contests** 는 다른 플레이어 30팀 데이터와 자동전투(온라인 · 하루 한 번 보상) |
| **포켓몬 배틀 시설**(Steam 아님) | 트레이너마다 고정 세트 풀 · 그중 무엇이 뽑히는지는 무작위 · **연승 구간마다 풀 교체**(서브웨이 · 트리 · 메종 — 구간 값은 시설마다 다름) · 21전부터 IV 최대 · 50전 뒤에는 풀이 안 변한다 · AI 가 카운터 팀을 짜지는 않는다 | 7전 1세트 · 지면 연승만 끊긴다 · 승급 · 강등 없음 · 기록 문턱은 시설마다 다르다(에메랄드 타워 35 · 70연승 · RS 50 · 4세대 100) | **BP 상점** — 대전 도구 · 능력치 약 · 이상한사탕 · 특성캡슐 · 메가스톤 — 본편 힘 | **레벨 50 고정 · Flat · 종 · 도구 중복 금지** — 정규화로 만렙 뒤에도 돈 유일한 검증 사례 / 순위제로 바꾼 SwSh 는 「역대 가장 쉬운 타워」 |
| **철권 7 트레저 배틀** | 순수 CPU · 보스 특수전이 무작위로 낀다 | 연승형 · 지면 끊긴다 · 진행할수록 어려워진다 · **온라인 랭크와 완전히 분리** | 골드 · 꾸밈 아이템 상자(연승이 길수록 · 퍼펙트면 하나 더) | **꾸밈 중심 보상의 오프라인 사다리** · 오프라인 / 온라인 점수 분리 / 「난이도 설정이 없다」 |
| **Elona 아레나 · 펫 아레나**(스니펫) | 몬스터 · 펫 · 상대 레벨이 랭크를 따르고 랭크 끝 뒤에는 연승 수를 따른다 | 랭크 숫자 · **안 싸우면 시간이 지나며 하락**(펫 아레나 60일) | 5승 · 20승마다 돈 · 100연승마다 명성 | 반례 — 결석 하락은 방치형 계약과 정면충돌. Elin 에 아레나가 있는지는 미확인 |
| Coromon 배틀 돔 · Siralim Ultimate 아레나 | 엔딩 후 끝없이(Coromon) · 난이도를 곡선으로 가파르게 패치(Siralim) | 구조 미확인 | — | 끝없는 모드는 「기록」 축으로만 돈다 |

### 팀 운영 · 편성 승부 리그

| 게임 | 상대 | 등급 · 승강 | 보상 | 가져올 점 / 함정 |
|---|---|---|---|---|
| **Teamfight Manager** | AI 팀 52 · 이름 · 로고는 바꿀 수 있다 · AI 가 밴픽에서 카운터 · 이적 시장 없음 · 시즌마다 패치 · 새 챔피언 | **아마추어 → 세미 프로 → 2부 → 1부 → 월드 챔피언십** 5단계 · 2v2 → 3v3 → 4v4 · 1부 상위 3팀 → 월드 · 승강 컷 미확인 · 승격 실패 → 잔류 반복(「장수생」) | 리그 진행 = 게임 진행 | 「첫 두 시즌은 밴픽이 무의미 · 재미는 4v4 부터」 — **등급이 오를수록 조합 판단이 필요해진다** · 월드 이벤트 매치 = 규칙 10종 중 무작위 3, 택 1 / 「Week by week you fight team after team with no changes」 · 월드에선 상대 전적이 안 보여 몰입이 낮다 · 1.3.2 AI 개선 뒤 난이도 급등 → 보통 난이도는 되돌렸다 · 배속 · 스킵 부재 |
| **Teamfight Manager 2**(얼리 액세스) | 온라인 리그 모드가 핵심 | 구조 미확인 | — | 불만 1순위는 **AI 의 비합리적 판단** · 싱글은 「may feel dull」 |
| **Pocket League Story**(Kairosoft) | 미확인 | 리그(라운드 로빈) · 컵(토너먼트) · 아마추어 D → 최상위 S · 조건 충족식 승급 · **강등 · 해고 없음** · 시즌 상한 | 랭크가 시설 · 후원을 해금 | 방치 계약과 맞는 가장 가까운 상용 선례 |
| **Eslabong**(얼리 액세스 · 95.3%) — **오프라인 본편 + 온라인 덧붙임** | 손으로 만든 라이벌 클럽 30(Steam 뉴스) · 고유 리더 · **1부 팀은 접속 중이면 커뮤니티(실제 플레이어) 조합 · 전술을 쓰고, 오프라인이거나 원치 않으면 내장 조합으로 돌아간다** · 전문가 팀은 내 최근 3경기를 분석해 카운터를 준비하고 **경기 전에 그 준비를 보여 준다**(0.51.1 · 2026-09-18) | 캠페인 = 4부 → 1부로 오르는 리그(6부에서 줄였다) + 컵 · 강등 미확인 · 엔드게임 「Hall of Legends」 · 시즌 수식어 16종(PvP · 랭크 · Hall of Legends 에는 안 걸린다) · **Challenge Tower = 비동기 PvP**(Cloudflare 서버 · Elo) — **Competitive 사다리는 전원 레벨 100 · 표준 유물로 정규화, Eternal 사다리는 원래 성장 그대로** · 클래스당 하나 + 챔피언 하나 · 같은 빌드 버전만 | — | **본작이 고민하는 구조를 가장 많이 가진 작품** — 오프라인 AI 리그 · 사람 조합을 빌리는 AI · 정규화 사다리와 성장 사다리를 나란히 / 「리그를 짓밟기가 너무 쉬워진다」 · 「시즌이 사실상 끝없다」(리뷰 시점 미확인) — 캠페인은 풀렸다 |
| **Gladiator Guild Manager** | 진행할수록 상대 수 · 능력치 · 레벨 증가 | 월간 챔피언십 · 주간 Ring of Death · 영구 사망 토너먼트 · 엔드리스(Steam 리더보드) · 리그 · 라이벌 길드 없음 | — | 「repetitive」가 최다 불만 |

### (B) 비동기 사람 등급 — 모두가 아는 틀

| 게임 | 상대 공급 | 등급 · 승강 | 보상 | 가져올 점 / 함정 |
|---|---|---|---|---|
| **AFK Journey**(모바일) | 남의 방어 팀 스냅샷 · 후보 **3** 이 닉네임 · 점수 · 전투력과 함께 뜬다 · 하루 새로 고침 제한(소스마다 5 · 6) · 도전 토큰 하루 5 | Novice → Adept → Elite → Epic → Legendary → Champion(순위제) 또는 Hall of Famer — 현행 명칭 미확인 · 약한 상대 승리 10~25 · 비슷 26~35 · 센 상대 36~50 · 최상위에선 증감이 작다 · 패배 · 방어 실패 감점 · 방어 시간 초과 = 방어 승 | **새 랭크 첫 도달 보상 1회** · 일일 · 주간 재화 | Supreme Arena 는 시즌 초 **공격하지 않는 방어 전용 봇**이 순위를 채우고 사람과 자리를 바꾼다(스니펫 · 단일 출처 · 봇 표기 미확인) |
| **AFK Arena**(모바일) | 방어 팀 스냅샷 | 래더 시즌 2주 · 하루 무료 2회 | 일일 · 시즌 순위 보상 | — |
| **Fire Emblem Heroes**(모바일) | AI 방어 팀 · 팀 점수 = 멤버 점수 평균 | 20 티어 + Great Summoner · 시즌 끝 같은 티어 안 백분위로 승강 · **강등은 8 이상에서만 — 바닥 7** · **한 시즌을 안 해도 티어는 안 떨어진다**(공식 FAQ · 스니펫) · 방어 승수는 무관 | 티어별 재화 | 미참가 무처벌 = 방치형 계약과 같은 모양 |
| **Backpack Battles** | 다른 플레이어 런의 스냅샷 · 같은 랭크끼리 · 모드 런은 풀에서 제외 · **받아 둔 상대가 로컬에 남아 오프라인으로도 돈다**(포럼) | Bronze · Silver · Gold · Platinum · Diamond · Master · Grandmaster(+ 명예 Grandma) · **캐릭터마다 따로** · 문턱 아래로 떨어지면 강등 | — | 「어차피 전투에 입력이 없어 사람과 차이가 없다」 — 자동전투에선 스냅샷이 거부감 없이 받아들여졌다 · 봇 여부는 공식 발언 없음 |
| **The Bazaar** | 타인의 스냅샷 · 일반 모드는 쉬운 고스트(서드파티 · 미검증) | 2025-02 레이팅 산정을 전투 결과 → 런 승수로 바꾸며 **전원 브론즈로 리셋**(「ranking exploit」 · 스니펫) · 매달 시즌 · 이후 소프트 리셋 · 최상위 Legendary | 랭크 도달 상자(미확인) | **점수 계산식의 구멍이 전체 리셋으로 번졌다** |
| **Super Auto Pets** | 같은 턴 다른 플레이어 팀 DB · 승패 · 목숨이 비슷한 팀 | 랭크 디비전 미확인 | — | 「constantly perfectly countered」 ↔ 「everyone builds meta now」 |
| **Gems of War** | 최근 24시간 PvP 참가자 위주(포럼 증언) · 공격 팀 평균 강도 + 랭크로 후보 | 옛 주간 티어 사다리는 7.3 에서 **PvP Goals**(주간 마일스톤 20단계)로 폐지 | 마일스톤 보상 | 사다리를 버리고 마일스톤으로 갔다 |
| **Shakes & Fidget** | 명예의 전당에서 비슷한 순위 무작위 3 중 하나(스니펫) | 미확인 | — | 「셋 중 하나」의 또 다른 예 |
| **Partyforge Idle**(Steam 2026-09 · 35건 65.7%) | 실제 플레이어의 3인 방어 파티 · 온라인 필수(부정행위 대응 패치 · 서버 불만) | 순위 리더보드 · 「View Build」 · 티어 확인 안 됨 · 하루 횟수 제한(소스마다 3 · 5) | **Renown — 거의 모든 업그레이드에 드는 핵심 재화** | 「20시간쯤에서 성장이 벽」 · 「상위권이 아니면 Renown 이 거의 없다」 · 「매일 과제에 묶였다」 → 결석 보정 · 교환 · 일일 목표 패치(10-07 ~ 10-16). **방치 + 결투장 + 핵심 재화 보상의 반면교사** |
| 포켓몬 서브웨이 Wi-Fi 선로 · DQM Quickfire | 다른 플레이어 업로드 팀을 10 등급으로(서브웨이) · 다른 30팀(DQM) | — | — | (A) 오프라인 시설 옆에 (B) 를 덧붙인 구조 |

### 「사람 같은 AI」 — 행동 모방 · 고스트

| 게임 | 상대를 어떻게 만드나 | 본작에 대한 뜻 |
|---|---|---|
| **철권 8 Super Ghost Battle** | 내 고스트(같은 캐릭터 경기에서 학습) · 받은 고스트(온라인) · **미리 만든 CPU 고스트 Warrior ~ Bushin 급수** · 내 고스트 · CPU 고스트는 오프라인 · 아케이드 퀘스트 토너먼트 우승으로 해금 · 상위 급수일수록 보상 상자(대개 의상)가 걸린다(스니펫) | **급수 = 난이도 + 보상 문턱** · 인구 없이도 돈다 |
| **Killer Instinct 섀도우** | 입력 · 매치 상태 기록 → 패턴(매치당 수백) → 40여 지표 최근접 이웃 · 구조는 손으로 짰다 | 행동 모방은 지표 설계에 전문가가 필요하다 — 본작은 전투를 조작하지 않으니 **빌드 모방이면 충분** |
| **Forza 드리바타** | 구간 · 코너별 주행 학습 · 시간 가중 · 나쁜 습관은 제어층이 막는다 · 오프라인이면 다른 레이서가 전부 드리바타 · 초기작은 **미리 학습한 데이터를 디스크에 담았다** | 사람다움의 핵심은 **습관과 편향** · 「AI 라고 밝힌 사람 모사」 |

### 봇 표기 — 밝힌 쪽 vs 감춘 쪽

| 사례 | 무엇을 했나 | 반응 |
|---|---|---|
| Forza 드리바타 · 마리오카트 스태프 고스트(「Nin」 태그) · Trackmania 메달 상대 · 철권 CPU 고스트 급수 | 처음부터 AI · 개발자 기록임을 드러냈다 | 대규모 반발 없음(설문 근거는 없다 — 경향) |
| Marvel Rivals 시즌 6 | 퀵플레이 봇에 다양한 의상 · 계정 레벨을 붙였다 · 공식 확인 없음 | 「deceptive」 · 「진짜와 가짜 플레이어의 경계가 흐려졌다」 |
| Marvel Snap | 봇 정체를 공식 공개하지 않음 · 메타 덱 기반 봇 · 닉네임 3종 | 신경망 닉네임 봇이 「the ones that everyone hates」 · 「일부러 져 준 건가」 의심 |
| AviaGames(모바일 현금 대전) | 「이길 수 없는 봇」 집단소송 — **주장일 뿐 확정 사실 아님** · CEO 부인 | — |

### 결투장이 없거나 1회성인 곳

- **Lootun · Dragon Cliff** — 결투장 없음. 직계 참고작이 결투장 없이 성공했다 — 결투장은 필수가 아니라 가산 요소
- **Cassette Beasts** — 배틀 타워 없음(요청 글만 있다)
- **Battle Brothers 아레나** — 등급 없는 반복 골드 원천 · 용병 계약의 대체재
- **Wartales 아레나** — 챕터형 1회성 도전 · 첫 클리어에 보상이 몰리고 재도전은 소액 · 하드 완료 칭호는 영구 버프(「재도전에 보상을 주면 루팅이 붕괴」 — 유저 논거)
- **Mount & Blade II 토너먼트** — 마을 이벤트 · 명성 · 상품 · 내기

## 3. 본작에 대한 시사점 — 조사자 제안

**가져올 것**
- **승급만 · 강등 없음**(Cyber Sleuth · MR · DQM · Pocket League Story) — 방치형 계약과 그대로 맞는다. 강등을 두면 바닥 + 미참가 무처벌(FEH)
- **등급 문턱 = 난이도 차단막 · 앞 등급을 이겨야 다음이 열린다**(Cyber Sleuth · MR)
- **등급이 오를수록 조합 판단이 필요해지게** — 낮은 등급은 키운 힘으로, 높은 등급은 상대를 읽어야 이기게(TFM 「4v4 부터 재미」)
- **상대 정보를 열어 둔다** — MR 의 Information · TFM 의 팀 통계. 정보가 가려진 TFM 월드 챔피언십은 몰입이 낮았다
- **세 상대 중 하나 고르기**(AFK · Shakes & Fidget) — 본작의 본체 「조작이 아니라 편성 판단」과 가장 잘 맞는다
- **새 등급 첫 도달 보상 1회**(AFK Journey · Wartales) — 반복 보상은 작게
- **연승 구간마다 상대 풀 교체 + 정규화**(포켓몬) — 만렙 뒤의 엔드게임
- **규칙 변주 3택 1**(TFM 월드 이벤트 매치) — 서버 없이 데이터로 준다. 단 Eslabong 은 시즌 수식어로도 풀림을 못 막았다 — 변주는 보조이고 본 대응은 정규화
- **전투 속도 · 넘기기 · 진 이유 리포트** — TFM 불만(배속 · 스킵 부재 · 「무력」). 결정론은 「내 편성이 틀렸다」를 명확히 보여 줄 수 있는 이점이다

**버릴 것**
- 결석 하락(Elona) · **소모식 일일 횟수**(Partyforge 결석 보정 사태) — ⚠제안: 대진마다 시드를 고정하면 같은 편성 = 같은 결과라 티켓 없이도 재시도 남용이 막힌다(다시 하려면 편성을 바꿔야 한다)
- **본편 핵심 재화를 결투장 보상으로**(Partyforge)
- **재도전 불가**(DQM) — 끝나는 사다리라도 다시 볼 수 있어야 한다
- **사람인 척하기**(Marvel Rivals · Marvel Snap) — 「사람처럼 짠 빌드」는 목표, 표기는 출처를 밝힌다. ⚠제안: 세계관 안의 다른 모험가 파티로

**「인간 AI」를 어떻게 만드나**
- 지금 `arena.js` `rollOpponent` — 선술집 후보 3 · 우리 팀 평균 레벨 · 무기 · 갑옷만 굴림 · 마스터리 · 전술 · 물약 없음
- 선례의 기법 — **정석 빌드 원형 + 변주** · **성향**(탱커 선호 · 물리 고집) · 덜 갖춘 빌드 섞기 · **등급별 완성도 곡선**(철권 급수) · 같은 이름의 라이벌 재등장 · 내 과거 팀(내 고스트) 섞기
- 생성된 상대는 arena_design §2 적법성 검사기를 통과시킨다 — 업로드 치팅을 거르는 검사기 하나가 AI 상대의 상한도 된다
- 「AI 가 멍청해 보이는 순간」(TFM2)은 전투 AI 문제라 PvE 와 같이 걸린다 — 결투장 전용 장치로 풀지 않는다(모든 밸런스는 PvP 기준)

**온라인과의 관계 — 오프라인 먼저, 온라인 나중**
- 판매형 싱글은 출시 뒤 인구가 빠진다 — **오프라인 등급전이 온라인의 바닥이 된다**
- ⚠제안 — 스냅샷 하나의 포맷을 양쪽이 쓴다: `format_version` · CSV 버전 해시 · `seed` · `origin`(생성 · 큐레이션 · 내 과거 팀 · 플레이어) · 파티(영웅 · 레벨 · 스킬 · 장비 · 마스터리 · 전술 · 배치 · 물약) · 표시(이름 · 초상 · 칭호 · 찍힌 등급) · 적법성 검사 통과 · 정규화 값. `rollOpponent` 가 상대 공급의 한 곳이라 들어갈 자리가 이미 있다
- **점수는 오프라인 · 온라인 따로**(철권 7) — 같은 이름의 등급을 서로 환산하지 않는다. 서버가 죽어도 오프라인 사다리는 남는다
- **받아 둔 고스트 묶음으로 오프라인에서 돈다**(Backpack Battles · 초기 Forza) — 「본편은 오프라인」을 지키면서 사람 팀을 섞는 중간 단계
- **접속 중이면 사람 조합을 빌리고, 오프라인이면 내장 조합으로**(Eslabong 1부) — 오프라인 AI 를 온라인 데이터로 「사람답게」 만드는 길. 상대 생성기 하나에 입력만 둘
- 인구가 모자란 구간은 같은 버킷의 생성 팀으로 채우되 **화면에서 구분**한다(AFK Journey 방어 전용 봇 + 표기)
- 같은 생성기가 GAME_DESIGN §10 「의뢰 — 적 영웅 파티」(약탈 적 파티)도 먹인다
- 점수 계산식은 출시 전에 시뮬로 검사한다 — 시드 고정 재도전이 승점 파밍이 되는지(The Bazaar 전원 리셋)

**확정 사항과 부딪히는 곳**
- arena_design §0 「결투장만 온라인이다」 — 오프라인 등급전은 이 문장을 바꾼다(「본편은 오프라인」과는 맞는다)
- arena_design §0 「보상 = 칭호 · 꾸밈만」
  - **온라인에 대해서는 근거가 더 단단해졌다** — Partyforge 반면교사
  - **오프라인에서는 근거 하나가 빠진다** — 이 규칙의 근거(§3 「조작이 본편 경제로 안 번진다」)는 온라인 치팅 대비다. 남는 근거는 「힘을 주면 결투장이 의무 숙제가 된다」
  - 오프라인 선례는 대개 본편 힘을 준다(Cyber Sleuth · DQM · 포켓몬 BP) · 꾸밈 중심은 철권 7 · 8
- 방치형 계약 — 강등 · 결석 하락 · 일일 횟수를 들이지 않는다
- GAME_DESIGN §10 「결투장」 ③(레벨 · 강화 고정값) — 최상위를 정규화하면 이 칸이 같이 정해진다. ⚠ 장비가 본체인 게임이라 정규화가 장비 가치를 얼마나 지우는지는 따로 본다(포켓몬 Flat 은 능력치만 맞추고 기술 · 도구는 남긴다)

**열린 질문 — 등급전은 「끝나는 사다리」인가 「만렙 뒤에도 도는 엔드게임」인가** — ⚠제안: 둘을 위아래로 잇는다. 골드 ~ 다이아 = PvE 진행이 문턱인 끝나는 사다리(Cyber Sleuth 컵 · 키운 팀으로 오르는 맛) · 다이아 위 = 배틀 시설식 연승(레벨 · 강화 정규화 · 세 상대 중 하나 · 연승 구간마다 풀 교체 · 연승 기록이 칭호). 정규화 없는 사다리는 만렙에서 풀리고(DQM · Eslabong 캠페인), 처음부터 정규화하면 「파밍한 장비로 오른다」가 결투장에서 빠진다. Eslabong 은 비동기 PvP 에서 이 질문에 **두 사다리를 나란히 두는 것**으로 답했다(Competitive 정규화 · Eternal 성장 · Elo 따로).

## 4. 남은 확인거리

AFK Journey 현행 등급 이름 · Supreme Arena 봇 표기 · Backpack Battles 봇 유무(공식) · The Bazaar 공식 패치 원문 · 철권 CPU 고스트 급수별 세기 · Cyber Sleuth 콜로세움 재도전 여부 · TFM 승강 컷 · Eslabong 강등 · 「짓밟기」 리뷰가 0.51.1 전인지 뒤인지 · Elin 아레나 유무.

## 5. Steam 수치

리뷰 API 원값(`appreviews` · 전 언어 · 구매 경로 전체) · 조회 2026-10-17. 소유자는 SteamSpy 추정이라 싣지 않았다(TFM 50 ~ 100만 · Dragon Cliff 50 ~ 100만 정도만 참고). 영어만 세면 값이 다르다 — TFM 83.8% · 1,225 · DQM 80.5% · 609 · The Bazaar 78.5% · 6,413 · 철권 8 57.0% · 44,032.

| 게임 | appid | 출시 | 리뷰 | 긍정 | 등급 |
|---|---|---|---|---|---|
| Lootun | 1960270 | 2024-05 | 1,062 | 93.7% | Very Positive |
| Dragon Cliff | 758190 | 2018-05 | 8,226 | 88.5% | Very Positive |
| Digimon Story Cyber Sleuth CE | 1042550 | 2019-10 | 13,398 | 89.6% | Very Positive |
| Monster Rancher 1&2 DX | 1716120 | 2021-12 | 1,150 | 90.5% | Very Positive |
| DQM 다크 프린스 | 2175540 | 2024-09 | 1,434 | 72.5% | Mostly Positive |
| Digimon World: Next Order | 1530160 | 2023-02 | 3,006 | 81.4% | Very Positive |
| Coromon | 1218210 | 2022-03 | 8,123 | 84.5% | Very Positive |
| Siralim Ultimate | 1289810 | 2021-12 | 2,561 | 92.9% | Very Positive |
| Cassette Beasts | 1321440 | 2023-04 | 11,216 | 94.0% | Very Positive |
| Monster Sanctuary | 814370 | 2020-12 | 12,722 | 91.2% | Very Positive |
| Teamfight Manager | 1372810 | 2021-03 | 5,900 | 86.8% | Very Positive |
| Teamfight Manager 2 | 3009300 | 2026-05(EA) | 2,436 | 62.1% | Mixed |
| Pocket League Story | 1923690 | 2022-08 | 189 | 89.9% | Very Positive |
| Eslabong | 4560660 | 2026-08(EA) | 1,565 | 95.3% | Overwhelmingly Positive |
| Gladiator Guild Manager | 1043260 | 2024-06 | 4,105 | 81.0% | Very Positive |
| Partyforge Idle | 5166800 | 2026-09 | 35 | 65.7% | Mixed |
| TEKKEN 7 | 389730 | 2017-06 | 95,666 | 83.6% | Very Positive |
| TEKKEN 8 | 1778820 | 2024-01 | 73,130 | 56.8% | Mixed |
| Killer Instinct | 577940 | 2017-09 | 5,708 | 86.5% | Very Positive |
| Forza Horizon 5 | 1551360 | 2021-11 | 283,352 | 89.2% | Very Positive |
| Elin | 2135150 | 2024-11(EA) | 9,308 | 93.3% | Very Positive |
| Backpack Battles | 2427700 | 2025-06 | 20,806 | 91.2% | Very Positive |
| The Bazaar | 1617400 | 2025-08 | 16,290 | 69.1% | Mixed |
| Super Auto Pets | 1714040 | 2021-09 | 36,250 | 90.4% | Very Positive |
| Gems of War | 329110 | 2014-11 | 10,834 | 78.6% | Mostly Positive |
| Shakes and Fidget | 438040 | 2016-02 | 36,865 | 92.0% | Very Positive |
| Mechabellum | 669330 | 2024-09 | 19,932 | 83.6% | Very Positive |
| Dota Underlords | 1046930 | 2019-06 | 90,946 | 82.2% | Very Positive |
| Mirror Throne | 2520490 | 2025-08 | 21 | 90.5% | Positive |
| Swords and Sandals Immortals | 1707650 | 2023-03 | 1,126 | 84.1% | Very Positive |
| Battle Brothers | 365360 | 2017-03 | 29,053 | 88.0% | Very Positive |
| Mount & Blade II: Bannerlord | 261550 | 2022-10 | 299,555 | 87.7% | Very Positive |
| Soda Dungeon 2 | 946050 | 2020-07 | 5,689 | 94.1% | Very Positive |
| IdleOn | 1476970 | 2025-11 | 30,018 | 77.1% | Mostly Positive |

## 6. 출처

- **Steam API** — `https://store.steampowered.com/appreviews/<appid>?json=1&language=all&purchase_type=all&num_per_page=0` · `https://store.steampowered.com/api/appdetails?appids=<appid>`
- **Digimon Story Cyber Sleuth** — https://nightlygamingbinge.com/complete-guide-on-the-digimon-story-cs-platinum-cup/
- **Monster Rancher** — https://koeitecmoamerica.com/manual/mrdx/mf2/en/3100.html (공식 매뉴얼) · https://strategywiki.org/wiki/Monster_Rancher_2/Rank_S (스니펫) · https://en.wikipedia.org/wiki/Monster_Rancher_2 · https://legendcup.com/rules.php (스니펫)
- **DQM 다크 프린스** — https://samurai-gamers.com/dragon-quest-monsters-the-dark-prince/endors-arena-guide/ · https://www.gematsu.com/2024/08/dragon-quest-monsters-the-dark-prince-coming-to-pc-ios-and-android-on-september-11 · https://vaporlens.app/app/2175540/dragon_quest_monsters_the_dark_prince.md
- **포켓몬** — https://serebii.net/emerald/tower.shtml · https://serebii.net/xy/battlemaison.shtml · https://www.smogon.com/ingame/bc/battle_subway_part1 · https://www.smogon.com/forums/threads/hardest-postgame-facilities.3760591/ · https://pokemondb.net/pokebase/296014/battle-tower-subway-maison-streak-opponents-getting-stronger
- **철권** — https://powerpyx.com/?p=9154 · https://gameranx.com/features/id/135676/article/tekken-7-how-to-earn-fast-gold-custom-gear-rank-up-treasure-battle-guide/ · https://www.ggrecon.com/guides/tekken-8-super-ghost-battle · https://esports.gg/news/tekken-8/tekken-8-super-ghost-battle/ · https://mp1st.com/news/tekken-8-ranked-system-ghost-battle-character-episodes-and-more-revealed-in-tgs-2023-show
- **Elona** — https://elona.fandom.com/wiki/Arena · https://elona.fandom.com/wiki/Pet_Arena · https://elona.fandom.com/wiki/Arena_Rank (전부 스니펫)
- **Coromon · Siralim · Cassette Beasts** — https://www.digitaltq.com/coromon-new-update-storyline · https://steamcommunity.com/app/1321440/discussions/0/3824162683821779589
- **Teamfight Manager** — https://namu.wiki/w/팀파이트%20매니저 (요약기 경유) · https://gideonsgaming.com/2021/07/14/team-fight-manager-review-needs-a-little-coaching/ · https://steamcommunity.com/app/1372810/discussions/0/3123786787140625391 · https://steamcommunity.com/app/1372810/guides/ · https://vaporlens.app/app/1372810/teamfight_manager · https://www.gamespress.com/Korean-indie-studio-Team-Samoyed-launches-Teamfight-Manager-2-in-Steam · https://vaporlens.app/app/3009300/teamfight_manager_2.md
- **Pocket League Story** — https://www.pocketgamer.com/pocket-league-story/review/ · https://kairosoft.wiki.gg/wiki/Pocket_League_Story
- **Eslabong · Gladiator Guild Manager** — https://store.steampowered.com/app/4560660/ · Steam 뉴스 API `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=4560660`(0.36.1 · 0.40.7 · 0.51.1 패치 노트 · 「Welcome, new players!」 공지) · https://store.steampowered.com/app/1043260 · https://steamcommunity.com/app/1043260/discussions/0/7336985071474041103/ · https://vaporlens.app/app/1043260/gladiator_guild_manager
- **AFK** — https://dotgg.gg/afk-journey/arena-guide/ · https://gamerant.com/afk-journey-arena-pvp-guide-battle-teams-rewards/ · https://playafkjourney.com/arena/ · https://afk-journey.fandom.com/wiki/Supreme_Arena (스니펫) · https://afk.guide/arena-of-heroes
- **FEH** — https://www.pocketgamer.com/fire-emblem-heroes/fire-emblem-heroes-1-3-0-update-brings-tier-system-changes-new-maps-and-more/ · https://gamepress.gg/feheroes/node/73331 (스니펫) · https://faq.fire-emblem-heroes.com/hc/en-us/articles/4409347195801 (스니펫)
- **Backpack Battles** — https://backpackbattles.wiki.gg/wiki/Game_Mechanics · https://www.lawod.com/backpack-battles-ranking-system/ · https://en.wikipedia.org/wiki/Backpack_Battles · https://steamcommunity.com/app/2427700/discussions/0/6770657417430301203
- **The Bazaar · Super Auto Pets · Gems of War · Shakes & Fidget** — https://bazaar-builds.net/ranking-update-reset-item-changes-and-more/ · https://superautopets.wiki.gg/wiki/The_Basics · https://community.gemsofwar.com/t/how-does-ranked-pvp-matchmaking-work/18837 · https://community.gemsofwar.com/t/about-this-new-pvp/82534 · https://gameplay.tips/tags/shakes-and-fidget (스니펫)
- **Partyforge Idle** — https://store.steampowered.com/app/5166800 · Steam 리뷰 API · `https://store.steampowered.com/news/app/5166800`
- **Killer Instinct · Forza · 마리오카트** — https://gamedeveloper.com/programming/the-killer-groove-the-shadow-ai-of-killer-instinct · https://www.gamedeveloper.com/design/how-forza-s-drivatar-actually-works · https://news.xbox.com/en-us/2014/09/30/games-forza-horizon-2-drivatars/
- **봇 표기** — https://frvr.com/blog/news/marvel-rivals-season-6-bot-changes/ · https://jipel.law.nyu.edu/angry-gamers-developer-caught-using-bots-in-disguise-of-humans/ · Kotaku 2022-10-27(Marvel Snap 봇) · MarvelSnapZone 봇 가이드
- **1회성 아레나** — https://turnbasedlovers.com/review/battle-brothers-blazing-deserts · https://steamcommunity.com/app/1527950/discussions/0/6169410450143836948 · https://www.gamerguides.com/mount-and-blade-ii-bannerlord/guide/economy/how-to-make-money/participating-in-a-tournament

---

*마지막 업데이트: 2026-10-17*
