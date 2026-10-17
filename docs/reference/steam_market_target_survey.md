# Steam 시장 · 타겟 조사 — 세미 아이들 루팅 파티 RPG

> 목적: **누가 이 게임을 왜 하나 · 타겟에 맞출까 넓힐까 · Steam 에서 살아남는 조건**을 게이머 시점과 시장 자료로 따진 조사와 의견. 발단 — 「너가 게이머의 입장에서 우리 게임을 진행한다면 왜 이게임을 진행할지, 어떤 유저가할지를 분석해보자」 → 「다시한번 천천히 분석해볼래?」 → 「문서로 저장해봐」(2026-10-17 사용자).
> 조사 방식: 2026-10-17 · 웹 조사(Steam appreviews API 직접 조회 · steampageanalyzer · GameDiscoverCo · howtomarketagame 원문 · 기사 · Steam 리뷰 원문 약 3,600건) + 저장소 문서([PLAN_user_review.md](../../PLAN_user_review.md) · [.claude/skills/qa/metrics.md](../../.claude/skills/qa/metrics.md) · `ux_notes.md` · [DEV_PLAN.md](../client/DEV_PLAN.md) §3-3). **게임을 직접 돌리지 않았다** — 우리 게임 시점은 10-12 실플레이와 10-17 측정에서 가져왔다. Reddit 은 접근이 막혔고, 배포판 퍼널(Firestore)은 관리자 로그인이 필요해 읽지 못했다.
> ⚠ **이 문서는 조사와 의견이지 결정이 아니다.** 확정은 [GAME_DESIGN.md §9](../game_design/GAME_DESIGN.md) 가 갖는다. §0 · §3 ~ §6 의 권고는 조사자 의견이다.
> ⚠ 인용된 수치는 **그 게임 · 그 시장의 것**이다 — `src/data/*.csv` 로 옮기지 않는다. 판매량 · 매출은 전부 제3자 추정이다.
> ⚠ 우리 게임의 측정값(§1)은 **10-17 스냅샷**이다 — 현재 값은 [metrics.md](../../.claude/skills/qa/metrics.md) 가 갖는다.
> 짝 문서: [PLAN_user_review.md](../../PLAN_user_review.md)(10-12 실플레이) · [melvoridle/10_reception_business.md](melvoridle/10_reception_business.md)(Melvor 흥행 · 리뷰) · [lootun/00_overview.md](lootun/00_overview.md)(Lootun 구조) · [offline_arena_survey.md](offline_arena_survey.md)

신뢰도 표기 — **[원문]** 1차 출처 직접 확인 · **[API]** Steam appreviews 직접 조회 · **[2차]** 보도 · 요약 인용 · **[추정]** 제3자 추정 또는 조사자 계산 · **[의견]** 조사자 판단

목차 — 0 결론 · 1 게이머로서 해 본다 · 2 시장 · 3 타겟 · 4 맞춤 vs 광범위 · 5 생존 목표와 조건 · 6 확정 사항과 부딪히는 곳 · 부록 A 유사작 표 · 부록 B 플레이어 원문 · 부록 C 수치 검증 · 부록 D 출처 · 한계

---

## 0. 결론 [의견]

- **타겟** — 「디아블로에서 제일 재밌었던 게 액션이 아니라 **장비 비교와 빌드 짜기**였던 사람」. 디아블로 · PoE 경험자(A)와 깊은 시스템 방치형 플레이어(B)의 교집합이다(§3)
- **방향** — 핵심 재미는 그 사람에게 맞추고, 넓히는 것은 **문턱과 언어**뿐이다. 시스템을 더해 넓히지 않는다(§4)
- **생존 목표선** — 출시 후 **리뷰 1,000 · 긍정 90% 이상**. 우리 틈새 74개 중 상위 10% 이고 Lootun · Loot Loop 이 이 선에 있다(§5)
- **1순위 조건** — Lootun 급 완성도. 같은 컨셉이 94% 와 32% 로 갈렸다(§2-2). 첫 시간(아이템 우열 · 빌드 결정 · 개발 흔적)과 10~30시간(나이트메어가 「같은 장 다시」로 안 보이게)이 승부처다

---

## 1. 게이머로서 해 본다

측정 — [metrics.md](../../.claude/skills/qa/metrics.md) M5 · M7(10-17 · 사람 흉내 플레이와 시뮬 80시드) · [PLAN_user_review.md](../../PLAN_user_review.md)(10-12 · 35분 실플레이).

| 시점 | 겪는 것 | 느낌 [의견] |
|---|---|---|
| 0~10분 | 첫 드롭 30초 · 첫 클리어 6.5분 · 80시드 중 76 이 10분 안에 1승 | **좋다** — 유사작보다 빠르다 |
| 11분 | 첫 패배. 리포트에 쓰러짐 칸 · 남은 적 줄(R254)은 있지만 처방은 없다 | 원인은 읽히는데 무엇을 바꿀지 모른다 |
| 12.4분 | 첫 장비 교체 — **드롭이 아니라 상점에서 산 것** | 루팅 게임의 첫 「이게 더 좋네」가 드롭에서 안 나온다 |
| 1시간 | 2-2 I · 레벨 13 · 1장 보스 중앙값 61~65분 | 진행은 된다 |
| 1시간 안의 빌드 결정 | 마스터리 노드(1랭크 = 1%) · 레벨 10 둘째 스킬 칸 | 본체라던 「빌드」가 아직 거의 없다 |
| 동시에 | 탭 14 · 건물 10 · 재화 20종 안팎 · 미니게임 · 도박장 | 무슨 게임인지 한 문장으로 안 잡힌다 |
| 조합에 따라 | 1장 보스까지 30분(기사 · 마법사 · 전사) ~ 131분(궁수 · 마법사 · 사제) · 최장 연패 133 | 잘못 고른 사람은 **이유를 모른 채** 두 시간을 진다 |
| 약 10시간 | 노말 완주(571~607분) · 레벨 26~32 · 전직(`[balance.csv:advance_unlock_level]`)도 이 근처 | 가장 큰 빌드 결정이 10시간 뒤에 온다 |
| 10~30시간 | 나이트메어 — 1~5장을 다시 돈다 | **위험 구간** — 아래 |

**10~30시간이 위험한 이유** — 유사작 부정 리뷰의 중간 플레이타임이 Lootun 16.5시간 · Dragon Cliff 28시간이다 [API](부록 A). 이탈 문장은 「5시간 하고 20시간 방치했더니 다 깼다」(Dragon Cliff) · 「파밍 옷을 입은 증분 게임 — 후반엔 빌드 차이 없이 숫자만 쌓인다」(Lootun 중문)다(부록 B). 우리의 노말 → 나이트메어 전환이 정확히 이 구간에 놓이는데, 난이도 바퀴의 본질은 「같은 장을 다시 돈다」다. **나이트메어가 새로워 보이지 않으면 바퀴는 차별점이 아니라 이탈 장치가 된다** [의견].

**게이머 한 줄 평** [의견] — 처음 30분은 손에 붙는다. 1시간 안에 「진 이유를 모르겠고, 짤 빌드가 없고, 마을 탭이 많다」로 갈린다. 10시간을 넘긴 사람은 「같은 장을 또?」 앞에 선다. 10-12 평가의 결론(「디아블로나 Lootun 팬에게 건네면 30분~1시간 안에 그만둘 가능성이 높다」)과 같다.

### 1-1. 10-12 실플레이 지적의 지금 상태 (10-17 문서 대조)

| 지적 | 상태 | 근거 |
|---|---|---|
| 2-1 비교 화면이 우열을 말하지 않는다 | 해결 | R251 · ADR-0617~0619 · ADR-0639 |
| 2-1 무기 고정 옵션 폭이 아이템 레벨을 덮는다 | **미해결** | `[balance.csv:weapon_fixed_atk_pct_min]` ~ `[balance.csv:weapon_fixed_atk_pct_max]` 균등 굴림 그대로(이름만 ADR-0628) |
| 2-2 왜 졌나 | 부분 해결 | R254 · R252 — 원인은 보이고 처방은 없다 |
| 2-2 레버의 체감(마스터리 1% · 능력치 고정) | 미해결 | 다룬 R 행 없음 |
| 2-3 빌드 결정이 늦다 | 부분 해결 | R263(도서관 = 영웅 레벨 `[balance.csv:skillbook_learn_level]`) · R271(첫 파티 고유 = 1티어) · 전직 문턱 그대로 |
| 2-3 마을 탭이 가장 많다 | 미해결 | 마을 묶음 5탭 그대로 |
| 2-4 도움말의 개발 흔적 | 임시 정리 | SCREEN_CHANGELOG 10-15 · 전면 재작성은 R257 출시 전 보류 |
| 2-4 Admin · 실험실 · 「준비 중」 · 화풍 선택 노출 | **미해결** | `ux_notes.md` 10-17 「남음」 |
| 2-4 1 · 2장 몬스터 초상 빈칸 | 미해결 | `ux_notes.md` 10-16 |
| 2-5 자잘한 넷 | 해결 | R256 |
| §3 시스템이 많다 · 영웅 품질이 출생 굴림 | 미해결 | 탭 · 건물 수 그대로 · 다룬 R 행 없음 |

---

## 2. 시장 — 생존자 편향을 걷어 낸다

### 2-1. 장르 전체

| 사실 | 값 | 출처 |
|---|---|---|
| Steam Idler 태그 연간 출시 | 2023 329 → 2024 572 → 2025 940 → 2026 **1,566**(9/27까지 · 2025 같은 주차 626) | [원문] steampageanalyzer |
| 리뷰 1,000 도달률 (2024-01 ~ 2025-06 출시) | Idler 5.6%(95% 구간 4.3~7.2 · n=967) vs Steam 전체 4.2%(n=24,918) | [원문] steampageanalyzer |
| 리뷰 중앙값 | Idler 22 vs 전체 11 | [원문] steampageanalyzer |
| 가격대별 1,000 도달률 | <$5 2.5%(n=518) · $5~9.99 10%(n=150) · $10~14.99 16.1%(n=31 · 구간 7.1~32.6) | [원문] steampageanalyzer — 사이트가 「비싼 게임은 큰 팀이라 인과가 아니다」라고 경고 |
| 세부 태그 도달률 | Cozy 21.1%(n=38) · Resource Management 19.5%(n=41) · Automation 13.6%(n=66) · Auto Battler 7.1%(n=70) · Incremental 6.7%(n=358) | [원문] 표본이 작아 방향만 |
| 분기당 1,000 리뷰를 넘긴 방치형 | 2026 Q1 4개(2025 같은 시기 5개) · 「The number of idle games is increasing but I still think the floor for a well-made idle game is quite high.」 | [원문] Zukowski 2026-05-14 |
| Desktop Companion 태그 | Valve 2026-05-18 태그 개편에서 신설 — 「화면 일부만 쓰며 다른 일을 하는 동안 곁에 있는 게임」 | [2차] |

**읽기** [의견] — 공급은 다섯 배가 됐고 히트 수는 그대로다. 「잘 만든 방치형의 바닥은 높다」(Zukowski)는 완성도가 생존 조건이라는 말과 같다.

### 2-2. 우리 틈새 74개 — 루팅 · 파티 방치 RPG (2023-01 ~ 2026-10 출시)

검색으로 모은 214개 중 출시된 루팅 · 파티 방치 RPG 74개, 리뷰는 [API]. 목록 전체는 부록 A-2.

| 리뷰 수 | 개수 | 비율 |
|---|---|---|
| < 50 | 33 | **45%** |
| 50 ~ 199 | 16 | 22% |
| 200 ~ 999 | 17 | 23% |
| 1,000 ~ 4,999 | 7 | 9% |
| 5,000+ | 1(TBH) | 1% |

- **중앙값 약 90** · 상위 25% 경계 약 454
- **같은 컨셉이 정반대 결과를 냈다** — Lootun 94% · Loot Loop 93% 와 Everfall(4인 파티 · 스킬트리 · 룬 · 루팅 · 보스 — 설명상 우리와 거의 같다) **31개 · 32%**. 컨셉으로는 성패가 안 갈린다
- ⚠ 검색에 걸린 게임만이라 실제 하위 분포는 더 나쁠 수 있다 · 2026 출시작 36개는 노출 기간이 짧다

### 2-3. 리뷰를 모은 길은 둘이다

| 길 | 예 [API] | 특징 |
|---|---|---|
| **노출로 버티기** | TBH 47,440 · 54% / Deskrawl 2,983 · 54% / WoG 1,805 · 56% / Loot of Baal 1,519 · 62% | 무료 · 바탕화면 형태 · 아이템 거래. 평가가 낮아도 수천~수만 |
| **완성도로 버티기** | Lootun 1,062 · 94% / Loot Loop 1,803 · 93% | 1~2천 리뷰. 작은 팀이 갈 수 있는 길 |

TBH 는 「작업표시줄 3인 파티 자동전투 루팅」으로 형태가 우리와 가장 가깝지만, 폭발의 동력은 **무료 + Steam 마켓 현금화**다 — 부정 리뷰의 중간 플레이타임 425시간(돈 기대가 깨진 뒤의 혹평) · 6월 봇 때문에 마켓 등록 일시 중단 [2차]. 따라 할 대상이 아니다 [의견].

### 2-4. 상위 25% vs 하위 50% (상관이지 인과가 아니다 — 큰 팀이 언어를 많이 넣고 값을 높게 매긴다)

| 기준 | 상위 25%(18개) | 하위 50%(37개) |
|---|---|---|
| 유료 가격 중앙값 | $7.19 | $3.99 |
| 지원 언어 수 중앙값 | 9 | 2 |
| 간체 중국어 지원 | 78% | 57% |
| 열린 데모 | 2/18 | 10/37 |
| 긍정률 중앙값 | 77.5% | 62% |

- 유료 가격대별 중앙 리뷰 — $0~3 **31** · $3~6 **31** · $6~10 **480.5**. 싸다고 팔리지 않는다
- 언어 1개 29편 중앙 41 · 8개 이상 28편 중앙 161 · 간체 지원 108 vs 미지원 42.5
- **데모 유무는 성적과 상관이 안 보인다** — 단 「지금 열린 데모」만 잡혀 닫힌 데모 · Next Fest 이력은 빠졌다
- 화풍(픽셀 · 3D · 최소 UI)은 상위 · 하위에 고루 섞여 상관이 없다

### 2-5. 2026 쏠림과 이름 충돌

- 2026 에 비슷한 게임이 몰렸다 — Deskrawl · WoG · Lootborne · Desktop Raid · Duelist · Partyforge · Between Adventures 등. 대부분 바탕화면 형태 · 저가나 무료 · 긍정 50~70%대
- **긍정 90% 넘는 「정통 루팅 파티」는 Lootun · Loot Loop 둘뿐**이고 Lootun 은 영어 하나다 — 「다국어 + 깊은 후반」 자리가 비어 있다 [의견]
- ⚠ **이름 · 포지션 충돌** — **Loot of Baal**(2025-06 · $8.99 · 1,519 · 62% · 용병단 고용 → 악마 사냥 · 보물)은 우리 서사의 바알과 겹친다. **Lootborne**(2026-09 · $1.99 · 481 · 60% · 다크 판타지 · 아이템 시너지 · 비동기 PvP)은 요소가 많이 겹친다

### 2-6. 장르 밖이지만 쓸 만한 사실

- **Rusty's Retirement** [원문 GameDiscoverCo] — 약 33만 장 · 출시 시점 위시리스트 약 14만 · 중국 26%(일본 10 · 한국 6 · 대만 4) · 후원 DLC 부착 11% · 개당 순매출 약 $5. 발견은 Pirate Software 의 공개 칭찬 · Twitch · 개발자의 Reels/TikTok 이 함께 했다
- **위시리스트 전환** [원문 GameDiscoverCo] — 출시 시 위시 25k 초과 게임의 첫 주 중앙값 0.15배, 가격 $10 초과면 0.10배
- **Melvor Idle** — 긍정 리뷰 579건 중 232건이 RuneScape 를 말하고, RuneScape 를 모르는 사람은 「퀘스트가 없다」고 혹평했다. 기준 경험이 「원작 게임」인 사람에게 꽂힌다 ([melvoridle/10_reception_business.md](melvoridle/10_reception_business.md) §4-1 · §5-3)

---

## 3. 타겟 — 후보 여섯을 비교한다

리뷰 표본 — Lootun 457 · Loot Loop 410 · TBH 604 · Dragon Cliff 614 · Soda Dungeon 2 569 · Desktop Raid 310 · Melvor 700 [API · 키워드 집계라 방향만].

| 후보 | Steam 에 있나 | 우리 게임을 원하나 | 제값을 내나 | 근거 |
|---|---|---|---|---|
| **A** 디아블로 · PoE 복귀자 | 약 | **강** | 중 | 「PoE 를 안 하고 PoE 의 가려운 곳을 긁는다」(Lootun 156h) · Lootun 리뷰의 비교 대상이 PoE 5% · Diablo 4% |
| **B** 깊은 시스템 방치형 | **강** | 중 | **강** | Melvor 16k · Dragon Cliff 8k · ₩9천~1만1천에 긍정 77~90% |
| **C** 아시아 모바일 방치 → PC | **강** | 중 | 약~중 | Dragon Cliff 리뷰의 74% · Desktop Raid 65% 가 간체 · 「$10 받는 무료 모바일 앱」 비난 |
| **D** 바탕화면 · 일하면서 켜 둠 | **매우 강** | 형식만 | **약** | TBH 무료 + 거래 · Desktop Raid 「배경」 언급 34% |
| **E** 파티 편성 · 오토배틀러 | 근거 부족 | 중 | ? | 「끝없는 파티 선택」(Dragon Cliff) 정도 |
| **F** 영웅 수집(가챠 없이) | 근거 부족 | 약 | ? | 수집 언급 2~5% |

**결론** [의견] — **주 타겟은 A ∩ B.** 한 문장으로는 「디아블로에서 제일 재밌었던 게 액션이 아니라 장비 비교와 빌드 짜기였던 사람」이다. 근거 셋:

1. **Quantic Foundry**(2016 · 방치형 3개 게임 · 작은 표본) [원문] — 방치형 플레이어는 캐주얼이 아니라 **코어 70% · 하드코어 20% · 캐주얼 10%**. 동기 1 · 2 위가 **Power(성장 · 장비) · Completion(수집 · 완성)**, 가장 낮은 것이 Excitement · Fantasy. 이들은 Diablo III 를 유난히 많이 한다 — A 와 B 는 다른 집단이 아니라 한 사람의 두 얼굴이다
2. **Lootun 리뷰가 경계를 말한다** — 「디아블로에서 1% 차이로 장비 스탯 비교하는 게 제일 좋았다면 이 게임을 사랑할 것이고, 아니면 끔찍하게 지루할 것」(9h 부정) · 「평소엔 방치형 안 하는데 이건 잡혔다」(202h 긍정 — 루팅이 방치형 바깥 사람을 데려온다)
3. **Fantasy 동기가 가장 낮다** — 이야기 · 세계관은 이 층을 끌어오는 1차 동력이 아니라는 신호다(약한 근거)

**나머지의 자리** [의견] — C(중화권)는 설계 타겟이 아니라 **시장(현지화)**으로 다룬다(Lootun 은 중국어 미지원인데 간체 리뷰 124). 한국어 리뷰는 유료 방치형에서 1~4% 라 한국 시장만으로는 작다(TBH 만 1,707). D · E · F 는 버리거나 보조로 둔다.

---

## 4. 맞춤 vs 광범위 [의견]

**권고 — 핵심 재미는 타겟에 맞추고, 문턱 · 언어만 넓힌다.** 세 단계로 따졌다.

1. **좁을수록 평점이 지켜진다** — 이 장르에서 점수를 무너뜨린 것은 **기대와 실제의 어긋남**이었다(TBH: 돈을 기대한 사람이 425시간 뒤 혹평 · Melvor: RuneScape 를 모르는 사람이 「퀘스트가 없다」). 「장비 비교 좋아하는 사람용」이라고 정직하게 좁히면 맞는 사람이 산다 — Lootun 의 94% 가 그 결과다. 작은 팀의 길은 §2-3 「완성도로 버티기」뿐이고 그 길의 연료가 평점이다
2. **그런데 지금 설계는 넓어지는 쪽으로 움직였다** — 탭 14 · 건물 10 · 마을 탭 5 · 미니게임 · 도박장 · 결투장 · 탐험 개편 · 세미 아이들 전환은 전부 **핵심 재미 바깥**이다. 정작 타겟의 동기(Power · Completion)를 받는 곳에는 구멍이 남았다 — 무기 고정 옵션 굴림이 레벨을 덮고, 1시간 안에 체감되는 빌드 결정이 없다(§1-1). 「맞춤 vs 광범위」는 가정의 질문이 아니라 **이미 넓어진 것을 다시 좁힐지**의 질문이다
3. **넓혀야 하는 곳은 시스템이 아니라 입구다** — 아이템 필터 · 자동 분해 · 호버 없이 보이는 핵심 옵션(Lootun · Dragon Cliff 공통 불만이자 아무도 잘 못 푼 빈칸) · 패배 리포트의 처방 한 줄 · 출시 언어 영어 · 한국어 · 간체(+일본어)

---

## 5. 생존 목표와 조건 [의견]

**목표선 — 출시 후 리뷰 1,000 · 긍정 90% 이상.** 틈새 74개 중 상위 10% · 「리뷰 1,000 ≈ 총매출 $15만」 경험칙 [추정 · steampageanalyzer] · Lootun · Loot Loop 이 이 선에 있다. 조건을 우선순위로 놓는다.

1. **Lootun 급 완성도 — 1순위.** 같은 컨셉의 94% 와 32% 를 가른 변수다. 첫 시간의 셋은 10-12 평가의 결론 그대로 — 아이템 우열이 읽히게(무기 고정 옵션 폭 재검토) · 1시간 안에 체감되는 빌드 결정 하나 · 개발 흔적 걷어 내기
2. **10~30시간을 버티게** — 나이트메어가 「같은 장 다시」가 아니라 「새 장비 · 새 몬스터 칸 · 새 빌드」로 보여야 한다. 가격 불만은 「비싸다」가 아니라 「금방 끝난다」에서 나온다(Loot Loop 3시간 · Dragon Cliff 25시간)
3. **시장에 맞는 포장** — $7~10 프리미엄 · 무과금(부가 매출은 후원 · 꾸밈 DLC 정도) · 8개 언어 쪽 · 스토어에 「세미 아이들」을 정직하게 · TBH 식 무료 + 거래는 따라 하지 않는다
4. **증명하고 출시한다** — 이 장르에서 데모와 성적의 상관은 안 보였다(§2-4). 대신 **웹 빌드 + 익명 플레이 기록 + 퍼널 페이지**(ADR-0633)가 이미 있다 — Steam 전에 10시간 · 30시간 잔존을 실제 숫자로 본다. 위시리스트 전환(§2-6)은 출시 시점을 정하는 잣대로 쓴다
5. **AI 아트** — Steam 은 플레이어가 소비하는 AI 생성 콘텐츠의 공개를 요구한다([원문] Steamworks Content Survey · 2026-01 개정은 [2차]). 반발 사례(FragPunk 2025-03 등)는 있지만 판매 영향을 보여 주는 믿을 만한 수치는 없다(부록 C). 캡슐 · 키아트만이라도 사람 손을 거치는 쪽이 안전하다

---

## 6. 확정 사항과 부딪히는 곳 (경고 — 판단은 사용자)

| 확정 | 부딪히는 사실 |
|---|---|
| GAME_DESIGN §1 「영웅과 아이템은 대등한 수집 대상」 | 이 장르 리뷰에서 수집 동기 언급은 2~5%. 버리자는 게 아니라 **스토어의 첫 문장**으로 세울 근거는 약하다 |
| §1-2 「거점 · 파견은 지류」 | 화면에서는 마을 탭이 5개로 가장 많다 — 원칙과 화면이 반대로 말한다(10-12 지적 · 그대로) |
| 난이도 바퀴(09-30) | 차별점이자 반복 위험. 노말 완주 약 10시간이 유사작 이탈 구간 10~30시간과 겹친다 — 나이트메어의 새로움이 무엇으로 보이나가 성패를 정한다 |
| 모든 밸런스는 PvP 기준(10-06) | 타겟은 결투장 때문에 사지 않는다. 결정마다 「PvE 에서 빌드 차이가 살아 있나」를 같이 봐야 Lootun 중문 리뷰의 「숫자만 쌓인다」를 피한다 |

---

## 부록 A. 유사작 표

### A-1. 핵심 비교작 — 리뷰 · 언어 · 동기

리뷰 수 · 긍정률 [API 2026-10-17] · 언어별 리뷰 수 [API] · 동기 비율은 최신순 표본의 키워드 집계 [추정 — 방향만].

| 게임 | 출시 · 가격 | 리뷰 · 긍정 | 영어 / 한국어 / 간체 리뷰 | 주 동기 (표본) | 부정 리뷰 중간 플레이타임 |
|---|---|---|---|---|---|
| **Lootun** (1960270 · ArrowSoftGames) | 2024-05-14 정식 · $5.49 · 영어만 | 1,062 · 93.7% | 686 / 33 / 124 | 드롭 · 장비 25% · 빌드 · 스킬 24% · 가격 대비 11% · 배경 10% (n=457) | 16.5h (n=33) |
| **Loot Loop** (3972320 · BitBrew) | 2026-04-13 · $4.99 | 1,803 · 93.0% | 781 / 67 / 43 | 가격 대비 14% · 힐링 6% · 장비 5% (n=410) | 3.0h — 분량이 짧다 |
| **TBH: Task Bar Hero** (3678970 · Nugem Studio) | 2026-05-27 · 무료 · 16개 언어 | 47,440 · 53.8% (Mixed) | 8,549 / 1,707 / 10,039 | 장비 드롭 23% · 배경 17% · 마켓 · 돈 7% (n=604) | 425h (n=287) |
| **Dragon Cliff** (758190) | 2018-05 · 정가 $9.99 | 8,227 · 89% | 1,140 / 114 / 6,140(74%) | 배경 17% · 장비 16% · 가격 11% (n=614) | 28h (n=132) |
| **Soda Dungeon 2** (946050) | 2020-07 · 무료 | 5,689 · 94% | 3,131 / 69 / 648 | 배경 12% · 모바일식 9% (n=569) | 14h |
| **Desktop Raid** (3122460) | 2026-03 · $8.99 | 726 · 77% | 62 / 48 / 469 | 배경 34% · 장비 24% (n=310) | 42h |
| **Melvor Idle** (1267910) | 2020 · $9.99 | 16,334 · 90% | 9,402 / 254 / 3,939 | 배경 13% · 모바일식 9% (n=700) | 65h |

- TBH 동접 최고는 출처마다 약 46만 ~ 55만 [2차] · 판매량 추정은 Lootun 만 해도 SteamSpy 2~5만 · VaporLens 약 8만으로 갈린다 [추정]
- Lootun 의 불만 — 아이템 관리 클릭 · 아이템 레벨이 호버해야 보인다 · 후반 빌드가 하나 · 다 깨면 할 게 없다 · 캐릭터가 늘수록 보석 세팅 · 폐장비 선별이 귀찮다 [API 표본]

### A-2. 틈새 74개 중 상위 30 + 근접 클론 [API · 데모 = 지금 열린 데모 · zh = 간체 지원]

| 제목 | 출시 | 가격 | 리뷰 | 긍정% | 훅 | 데모 | zh |
|---|---|---|---|---|---|---|---|
| TBH: Task Bar Hero | 2026-05 | 무료 | 47,440 | 54 | 작업표시줄 픽셀 영웅 방치 | — | O |
| Deskrawl: Idle ARPG | 2026-09 | $6.99 | 2,983 | 54 | 데스크톱 하단 방치 ARPG · 몬스터 포획 | — | O |
| War of Genesis: Idle Loot | 2026-10 | 무료 | 1,805 | 56 | 화면 구석 3D 자동 사냥 | — | O |
| Loot Loop | 2026-04 | $4.99 | 1,803 | 93 | 파티 → 던전 파견 · 짧은 증분 · 스킬트리 | — | O |
| Loot of Baal | 2025-06 | $8.99 | 1,519 | 62 | 화면 구석 · 용병단 → 악마 사냥 | — | O |
| Lootun | 2024-05 | $5.49 | 1,062 | 94 | 반방치 · 파티 · 장비 · 최소 UI | O | — |
| Evitania Online | 2026-04 | 무료 | 1,061 | 79 | 온라인 방치 MMO | — | O |
| Legends of Dragaea: Idle Dungeons | 2025-11 | $9.99 | 1,017 | 87 | 1인칭 방치 던전크롤러 | — | O |
| Idle Pixel Fantasy | 2025-09 | 무료 | 945 | 78 | 일꾼 자원 수집 방치 | — | O |
| Vacuum Warrior | 2023-06 | 무료 | 937 | 79 | 청소기 증분 코미디 | — | — |
| Fantasy Idle Dungeon | 2025-12 | $9.99 | 907 | 69 | 포획 · 육성 방치 | — | O |
| Desktop Raid | 2026-03 | $8.99 | 726 | 77 | 데스크톱 파티 방치 · 레이드 | — | O |
| Bloobs Adventure Idle | 2026-06 | $7.99 | 725 | 90 | 런스케이프풍 24스킬 | O | — |
| Idle Heros | 2024-05 | 무료 | 574 | 82 | 고정 팀 배치 방치 | — | O |
| Duelist: Idle Expedition | 2026-10 | $7.19 | 533 | 81 | 작업표시줄 JRPG · 90+ 직업 · 31개 언어 | —(5월 데모 이력) | O |
| Lootborne | 2026-09 | $1.99 | 481 | 60 | 다크 판타지 · 아이템 시너지 · 비동기 PvP | — | O |
| IdleTale | 2024-09 | 무료 | 455 | 58 | 클리커 RPG | — | — |
| Raid Auctus | 2025-04 | $4.99 | 454 | 59 | 20직업 레이드 팀 육성 | — | O |
| Between Adventures IDLE | 2026-09 | $7.99 | 428 | 70 | 사냥 → 희귀 루팅 · 인챈트 | — | O |
| Crazy Oddballs | 2026-05 | 무료 | 363 | 72 | 팀 빌드 · 길드전 · PvP | — | — |
| Vespera | 2026-09 | $5.99 | 340 | 61 | 오프라인 진행 · 제작 | — | O |
| Cycle Idle RPG | 2025-11 | 무료 | 268 | 71 | 계속 파밍 방치 RPG | — | — |
| Lonely Knight | 2024-03 | 무료 | 246 | 67 | 방치 + 로그라이크 | — | — |
| Nocturnal Quest | 2026-03 | 무료 | 191 | 72 | 방치 RPG | — | O |
| Idle Awakening: Mages Path | 2025-09 | $4.99 | 190 | 76 | 방치 마법사 | O | — |
| Desktop Heroes | 2025-10 | $3.59 | 148 | 75 | 작업표시줄 방치 RPG | — | O |
| Heroes of Loot: Gauntlet of Power | 2024-06 | $14.99 | 72 | 85 | 루팅 액션 | O | O |
| Everfall 2 | 2026-03 | $9.99 | 44 | 75 | Everfall 후속 | O | — |
| GLADIMAKER | 2026-04 | $6.99 | 43 | 100 | 자동전투 | O | O |
| Idle Looter | 2025-11 | $6.99 | 41 | 59 | 방치 루팅 | — | — |
| Loot of Idle | 2025-11 | $0.99 | 35 | 49 | 방치 루팅 | — | O |
| Partyforge Idle | 2026-09 | $6.99 | 35 | 66 | 파티 방치 | — | O |
| **Everfall: Idle Dungeon RPG** | 2025-12 | $4.99 | 31 | **32** | 4인 파티 · 스킬트리 · 룬 · 보스 · 루팅 — 설명상 가장 유사 | — | — |
| Taskbar Titans | 2025-05 | $4.99 | 16 | 81 | 작업표시줄 | O | — |
| Taskbar Looters | 2025-03 | 무료 | 16 | 94 | 작업표시줄 동물 루터 | — | O |

리뷰 20개 이하 예 — Idle Hero Siege 15 · Idle Critter Adventure 15 · Idle Demon Summoner 17 · Medieval Idle: Quest 10 · Epic Idle Quest II 10 · Blacksmith Idle 10 · Treasure Hunter 7 · Vanguard Idle Auto Battler 7 · Idle RPG 4 · AUTO_BATTLER_RPG 3.

---

## 부록 B. 플레이어 원문 (직접 읽은 Steam 리뷰)

1. [Lootun · 156h · 긍정] 「If you've ever wanted to scratch that Path of Exile itch without actually playing Path of Exile, this is the perfect game for you.」 — [링크](https://steamcommunity.com/profiles/76561198046600940/recommended/1960270)
2. [Lootun · 128h] 「It's like Path of exile 2 and diablo 4 but better progression and more exciting loot.」 — [링크](https://steamcommunity.com/profiles/76561198012478813/recommended/1960270)
3. [Lootun · 202h] 「I normally don't play idle games, but this one grabbed me. … For 5$, it was worth definitely worth it.」 — [링크](https://steamcommunity.com/profiles/76561198039741345/recommended/1960270)
4. [Lootun · 338h] 「The price is too good. … Build Diversity feels real. Theorycrafting becomes possible in late game.」 — [링크](https://steamcommunity.com/profiles/76561197980972988/recommended/1960270)
5. [Lootun · 9h · 부정] 「If your favourite part of diablo was comparing stats on gear for a 1% bonus then you'll love this game otherwise it'll be incredibly dull.」 — [링크](https://steamcommunity.com/profiles/76561198049763030/recommended/1960270)
6. [Lootun · 211h · 중문] 「披着刷宝外衣的增量游戏… 没有BD之间的区别，纯粹是数值的堆砌.」(파밍으로 포장한 증분 게임 — 빌드 차이 없이 숫자만 쌓인다) — [링크](https://steamcommunity.com/profiles/76561198086319736/recommended/1960270)
7. [TBH · 889h · 부정] 「It was a game I used to keep open on the side while working on my PC. … they completely ruined the drop rates and item balance.」 — [링크](https://steamcommunity.com/profiles/76561198016287100/recommended/3678970)
8. [TBH · 85h] 「Still its a good game to have on the side monitor while you are working. But once the well dries up, its time to move on.」 — [링크](https://steamcommunity.com/profiles/76561198167174388/recommended/3678970)
9. [TBH · 457h · 한국어 · 부정] 「처음: 쌀먹이라도 해서 돈 좀 벌어볼까? 지금: 그냥 밖에 나가서 폐지 줍는 게 진지하게 수익성 더 좋음」 — [링크](https://steamcommunity.com/profiles/76561198135078270/recommended/3678970)
10. [TBH · 1204h · 중문 · 부정] 「游戏的核心其实还是市场，但是现在超低的爆率…导致市场萎靡。」(핵심은 마켓인데 드롭률이 극악이라 마켓이 죽었다) — [링크](https://steamcommunity.com/profiles/76561198289801695/recommended/3678970)
11. [TBH · 27h · 중문 · 긍정] 「如果你把它当做一个'桌面宠物'…不把他作为一款正常的游戏，而是一款桌面小游戏即可」(정상 게임이 아니라 바탕화면 미니게임으로 보라) — [링크](https://steamcommunity.com/profiles/76561199835395610/recommended/3678970)
12. [Dragon Cliff · 28h · 부정] 「$10 for an idle game is a bit much normally… I played for about 5hrs and idle'd for another 20hrs and I already finished the game.」 — [링크](https://steamcommunity.com/profiles/76561198284731206/recommended/758190)
13. [Dragon Cliff · 193h · 긍정] 「a semi-idle game that is seriously addicting… a huge variety of adventurers to choose from, making endless party choices.」 — [링크](https://steamcommunity.com/profiles/76561198101950038/recommended/758190)
14. [Desktop Raid · 340h] 「its not a bad little back ground game, you cand play it while painting models or catching up on work.」 — [링크](https://steamcommunity.com/profiles/76561199030264765/recommended/3122460)
15. [Melvor · 379h] 「it's like Runescape except I don't have to actually sit at my PC for 12 hours clicking in one spot.」 — [링크](https://steamcommunity.com/profiles/76561198077194328/recommended/1267910)

---

## 부록 C. 수치 검증

### C-1. 믿을 만한 숫자

| 숫자 | 출처 |
|---|---|
| Lootun 1,062 · 93.7% · $5.49 · 영어만 · 정식 출시 | [API] · 상점 |
| Loot Loop 1,803 · 93.0% · $4.99 | [API] |
| TBH 47,440 · 53.8%(Mixed) · 무료 | [API] |
| Idler 연간 출시 329 → 572 → 940 → 1,566 · 1,000 도달률 5.6% vs 4.2% · 가격대별 2.5% / 10% | [원문] steampageanalyzer — 방법 · 신뢰구간 공개 |
| Rusty's Retirement 약 33만 장 · 위시 14만 · 중국 26% · DLC 부착 11% | [원문] GameDiscoverCo |
| 위시 전환 첫 주 중앙값 0.15배 · $10 초과 0.10배 | [원문] GameDiscoverCo |
| 2026 Q1 1,000 리뷰 방치형 4개 · 「floor … quite high」 | [원문] Zukowski |

### C-2. 버렸거나 조건부로만 쓰는 숫자

| 숫자 | 이유 |
|---|---|
| 「AI 공개작은 리뷰가 53% 적다」 | 원 연구 미확인 · 보도마다 표본이 다르다 · 인과 아님 — **버린다** |
| Steam 하드웨어 설문 간체 비중(2026-09 31.39%) | 응답자 풀이 출렁인다(2026-02 54.6% · 2026-06 24.2%) — 사용자 비중으로 쓰지 않는다 |
| 2025 Steam 출시 「20,282」 · 「$1,000 미만 66%」 | 단일 권위 출처 없음(Gamalytic 추정 · 약 19,000+ 로만) |
| 서브태그 · $10~14.99 도달률 | 표본 30~40 — 방향만 |
| TBH 동접 최고 | 출처마다 46만 ~ 55만 |

### C-3. 같은 날 1차 답에서 고친 것

TBH 긍정률(62~73% → 53.8%) · Lootun 출시 상태(얼리액세스 → 정식) · AI 리뷰 53% 주장 폐기 · 「1순위 = 데모 + 위시리스트」 → 「1순위 = 완성도」(장르 표본에서 데모 상관이 안 보임) · 타겟을 「디아블로 은퇴자」에서 A ∩ B 로 좁힘.

---

## 부록 D. 출처 · 한계

**출처** (2026-10-17 조회)

- [steampageanalyzer — Idler 틈새](https://www.steampageanalyzer.com/niches/idler)
- [howtomarketagame — 2026 Q1 games (Zukowski)](https://howtomarketagame.com/2026/05/14/2026-q1-games/)
- [GameDiscoverCo — How Rusty's Retirement idle-farmed](https://newsletter.gamediscover.co/p/how-rustys-retirement-idle-farmed)
- [GameDiscoverCo — The state of Steam wishlist conversions](https://newsletter.gamediscover.co/p/the-state-of-steam-wishlist-conversions)
- [Game Developer — The surprising profile of idle clicker gamers (Quantic Foundry)](https://gamedeveloper.com/business/the-surprising-profile-of-idle-clicker-gamers)
- [Inven Global — Taskbar Hero 140K CCU · gold farmers](https://www.invenglobal.com/articles/22394/)
- [VaporLens — Lootun](https://vaporlens.app/app/1960270/lootun/stats/details)
- [VGC — Steam AI disclosure rules rewritten](https://videogameschronicle.com/news/valve-has-significantly-rewritten-steams-rules-for-how-developers-much-disclose-ai-use)
- Steam appreviews API — `store.steampowered.com/appreviews/<appid>?json=1&language=all&purchase_type=all&num_per_page=0`

**한계**

- Reddit 은 접근이 막혀 Steam 리뷰만 읽었다 · Steam 토론은 제목 수준
- 74개 목록은 검색에 걸린 게임만 — 하위 분포가 실제보다 낙관적일 수 있다 · 출시 유형(얼리액세스 / 정식)은 모으지 못했다
- 동기 집계는 키워드 정규식이라 잡음이 크다 — 방향만
- Quantic Foundry 는 2016 · 3개 게임 표본 · ARPG 동기 프로필은 못 찾았다
- **배포판 퍼널 실측(Firestore)을 읽지 못했다** — 실제 플레이어가 어디서 떠나는지는 그 데이터가 가장 정확하다

---
*마지막 업데이트: 2026-10-17*
