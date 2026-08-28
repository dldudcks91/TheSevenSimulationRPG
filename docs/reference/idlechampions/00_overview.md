# Idle Champions of the Forgotten Realms — 게임 구조 개요

> 상태: **총조사 완료** (2026-08-28) · **폴더 3분리 + 스킬·아이템 심화** (2026-08-28)
> 목적: "여러 영웅이 동시에 대열을 이뤄 자동으로 싸우는 파티" 구조의 표본 확보. 본작 원정 파티(3인 · 실시간 자동전투)와 대조할 참고작 — 특히 **파티 포메이션 구조**(§2)는 battle_design.md §9-9 진형 미결 항목과 직결
> 짝 문서: [01_skills.md](01_skills.md)(챔피언 스킬 4층 구조 심화 — 기본공격/전문화/Feat/Ultimate·Bond·Familiar 메커니즘, 대표 챔피언 8종 실제 스킬 수치) · [02_items.md](02_items.md)(아이템 구조·옵션 전수 심화 — Gear 6슬롯·세트보너스 부재·Forge 승급·Feat 슬롯·Marvelous Pigments 등 "유물"에 가장 가까운 것·기타 소모품). **이 문서는 조사 방법 + 게임 구조 한 장 + 파티 포메이션 구조(상세) + 본작 대조 시사점 + 출처·미확인을 담는다. 아이템·스킬 상세는 두 짝 문서로 이관됐다.**
> ⚠ **이 문서(및 짝 문서)의 수치는 전부 Idle Champions의 수치다.** 본작 SSOT가 아니며 `src/data/*.csv` 로 옮기지 말 것

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 |
| 1 | 게임 구조 한 장 |
| 2 | **파티 포메이션 구조** (상세 — 최우선 조사 항목) |
| 3 | 아이템 구조 (요약 — 상세는 [02_items.md](02_items.md)) |
| 4 | 스킬 구성 (요약 — 상세는 [01_skills.md](01_skills.md)) |
| 5 | 본작 대조 시사점 |
| 6 | 출처 · 미확인 |

---

## 0. 조사 방법과 신뢰도

**Dragon Cliff 조사 때와 같은 장벽에 부딪혔다** — Fandom(`idlechampions.fandom.com` / `idle-champions.fandom.com`, 실제로 두 서브도메인이 혼재해 검색된다)이 **WebFetch에 HTTP 402(Payment Required)를 돌려줘 직접 크롤이 전면 차단**된다. 이번 심화 세션에서도 동일하게 재확인했다(`idle-champions.fandom.com/wiki/Feats` 재시도 → 402). `web.archive.org` 경유도 이 환경에서 막혀 있다. 그래서 조사는 **WebSearch 스니펫**(구글 검색이 위키 본문을 요약해 반환하는 조각)에 주로 의존했고, 3차 미러·팬 제작 데이터뷰어는 이번 심화에서 대부분 접근에 실패했다 — `shapes.inc/fandom/.../gear` 404, `idle.kleho.ru/hero/celeste/` 522(서버 다운), `tap-guides.com` 가이드는 열렸으나 요청한 수치 정보 자체가 원문에 없었고, Steam 가이드(`id=3219175741`)는 이번 세션에서 **레이트리밋**에 걸려 재열람하지 못했다.

| 표기 | 소스 | 신뢰도 | 비고 |
|---|---|---|---|
| **[위키스니펫]** | WebSearch가 반환한 Fandom 위키 검색 결과 요약(구글의 AI 요약 경유) | ★★ | 원문 표는 확보 못 함. 다만 이번 심화에서 **개별 챔피언 스킬 수치**(Umberto 15초/2초, Widdle 25%, Jarlaxle 100%→300%, Asharra 100%/100%/4명 등)까지 스니펫으로 다수 확보 — 검색어를 챔피언명+스킬명으로 구체화할수록 스니펫 품질이 크게 올라갔다 |
| **[미러]** | `shapes.inc/fandom/idle-champions-of-the-forgotten-realms/*` — 3차 사이트 | ★★ | 이번 심화에서 `Formations` 페이지는 404로 막혔고(1차 조사 때는 성공), `Gear` 페이지도 404 — **미러 자체의 안정성이 낮다**(같은 사이트가 세션마다 다른 페이지를 반환) |
| **[가이드]** | `tap-guides.com`(2025 작성) — 비공식 공략 사이트 | ★☆ | 이번 심화에서 재열람했으나 **기어 파밍 "전략"만 있고 슬롯·배율 같은 "구조" 정보가 없었다** — 1차 조사 때 참고한 것은 전략 서술 부분뿐이었다는 것이 이번에 확인됨 |
| **[Steam가이드]** | Steam Community Guide | ★★★(1차 조사 시 직접 열람 성공) / 이번 심화는 **레이트리밋으로 재열람 실패** | 1차 조사 인용은 유지, 이번 심화의 신규 수치는 대부분 WebSearch 스니펫 경유 |
| **[커뮤니티]** | Steam 토론 스레드(WebSearch 경유) | ★★ | 개별 챔피언 스킬 메커니즘 질문·답변 스레드가 다수 존재해, 챔피언명을 구체적으로 넣은 검색에서 신뢰도 높은 교차 확인원 역할을 했다 |

**오염 검증** — 1차 조사와 동일한 원칙을 유지했다. `Divine Favor`·`Blessings`·`Feats`·`Specialization`·`Bond`·`Familiars`·`Forge` 같은 고유명사가 이번 심화에서도 검색마다 일관되게 재등장해 신뢰도를 뒷받침한다. 새로 확인한 고유명사(`Marvelous Pigments`·`Time Gate`·`Bounty Contract`·`Potion of Polish`)도 여러 독립 스레드에서 같은 정의로 수렴했다.

이번 심화에서 WebSearch/WebFetch **총 22회** 수행(§6-1에 URL 전량 기재).

---

## 1. 게임 구조 한 장

```
   플레이어 = 파티 지휘관
   ┌──────────────────────────────────────────────────────┐
   │ 챔피언 140+종 수집 ─→ 포메이션(9~12석, 챕터별 고정 형태)│
   │        ↓                        ↓                      │
   │ Feat/전문화/Bond 배분      실시간 자동전투 + 클릭       │
   │        ↓                        ↓                      │
   │ Gear(챕터별 6슬롯)         골드 · 젬 · Divine Favor     │
   │        ↑                        ↓                      │
   │ Chest(Gold/Silver) ←─── 스테이지 진행 / 보스 처치        │
   └──────────────────────────────────────────────────────┘
        Divine Favor 로 챕터 리셋 → 영구 골드획득 배율 상승 (프레스티지)
```

- **오프라인에도 전투가 돈다** — "Offline Progress"가 자리를 비운 시간을 시뮬레이션해 **분당 약 1구역** 속도로 포메이션이 계속 진행한다 [커뮤니티][가이드]. 단 전문화(Specialization) 선택 시점에서는 진행이 멈춰 대기한다.
  → **본작과 계약이 정반대다.** 본작 컨셉락 1항("전투는 실시간 독점 — 오프라인에 전투는 돌지 않는다")이 정면으로 부정하는 사례가 실존한다는 뜻. Dragon Cliff는 "오프라인 진행 자체가 없음"이었는데, Idle Champions는 **오프라인 = 전투가 계속되는 방치**다. 세 참고작이 세 가지 다른 자리에 있다: Lootun(오프라인 자동전투+미션) / Dragon Cliff(오프라인 없음) / Idle Champions(오프라인=전투 그 자체)
- **초반은 클리커, 후반은 자동화** — 저레벨 구간은 몹을 직접 클릭해 잡고, 포메이션이 갖춰지면 자동전투로 넘어가며, `Familiar`([01_skills.md §7](01_skills.md#7-familiar--조작을-대행하는-자동화-유닛))를 배정하면 클릭 자체도 대행된다 [커뮤니티]
- **프레스티지형 리셋(Divine Favor)** — 챕터 진행이 막히면("Wall") 리셋해 Divine Favor를 얻고, 이걸로 영구 골드획득 배율을 산다(획득 젠당 골드 획득 +1%, 리셋과 무관하게 영구 누적 — [위키스니펫] 이번 심화 신규 확인). 챔피언·기어·Feat 등 "힘을 늘리는 모든 것"은 리셋되지 않고 **영구 보존**된다 [위키스니펫][커뮤니티] — 리셋되는 것은 스테이지 진행도뿐. Blessings는 Divine Favor로 사는 **별도 영구 버프**이며, Blessings 구매에 쓴 Favor는 골드획득 배율 누적에는 안 들어간다[위키스니펫]
- **챕터(캠페인) = 별도의 포메이션 형태 + 별도의 Divine Favor 풀** — 9개 캠페인 각각 다른 슬롯 수·모양을 가진다(§2-1)

---

## 2. 파티 포메이션 구조 (상세)

### 2-1. 인원수와 대열 — 챕터마다 다른 고정 형태

| 캠페인 | 슬롯 수 | 형태 |
|---|---|---|
| A Grand Tour of the Sword Coast (시작 캠페인) | **9석** [Steam가이드] 또는 **10석** [미러] — [상충] | "다이아몬드형" — 가장 단순한 형태 |
| Tomb of Annihilation | **10석** | 앞열이 더 넓음 |
| Waterdeep: Dragon Heist | **10석** | "듀얼 탱크" 포지션 도입 |
| Descent into Avernus / Light of Xaryxis | 가변 | 인접 슬롯 수·열 깊이가 더 복잡해짐 |
| 이벤트(The Running, Highharvestide 등) | 제한된 형태(9석 이하) | 표준 조합을 못 쓰게 강제 |
| (역대 최대) | **12석** | 커뮤니티에서 "12슬롯 이벤트"를 요청하는 스레드가 있는 것으로 보아 12가 사실상 상한 [커뮤니티] |

- **포메이션은 "늘어나는 것"이 아니라 "챕터가 갈아 끼우는 것"이다** — 이 구분이 중요하다. Dragon Cliff·본작처럼 "파티 정원을 플레이어가 점진적으로 확장"하는 사다리가 아니라, **새 캠페인(챕터)에 입장하면 그 챕터가 정의한 슬롯 수·모양을 통째로 받는다.** 슬롯 수가 9→10→12로 커지는 것처럼 보이는 것도 개별 캠페인 콘텐츠 설계일 뿐, 공용 "포메이션 확장" 시스템이 존재하는 게 아니다
- **대열은 2분할(전열/후열)이 아니라 격자 + 열(column)이다** — 슬롯이 "C1, C2, C3…" 같은 열로 조직되고, **가장 앞쪽 슬롯이 탱커 자리**(체력·피해감소가 높은 챔피언)로 기능하며 후방이 취약한 서포트·딜러를 보호하는 구도다 [Steam가이드][미러]

### 2-2. 포지션이 전투에 개입하는 방식 — 세 가지 범위 등급

**포지션 버프의 사거리가 세 단계로 분류된다** [미러]:

| 범위 | 뜻 |
|---|---|
| **인접(adjacent)** | 바로 옆 슬롯 |
| **2칸 이내(within two slots)** | 인접보다 넓은 근방 |
| **같은 열(same column)** | 전열-후열 축을 공유 |

- 실제 수치가 확보된 예시(전부 [01_skills.md §8](01_skills.md#8-대표-챔피언-실제-스킬--역할군별)에서 상세 다룸): `Celeste`의 War Domain(인접 챔피언 피해+100%), `Bruenor Battlehammer`의 Rally(**같은 열** 챔피언 피해+100%, 종족·스택 시너지로 배율 추가 상승), `Widdle`의 Vampiric Gaze(**인접** 챔피언 피해+100%+공격 시 25% 확률 쿨다운 리셋), `Asharra`의 Bond(**포지션이 아니라 종족 조합** 기반 발동 — 범위 3분류 밖의 제4의 발동 조건), `Artemis Entreri`의 Observance(주변 DPS 챔피언에게 걸린 포지션 버프를 **75% 강도로 복제**해 자기 피해로 환산, 자기 자신이 이미 그 효과를 받고 있어도 중복 적용)
- 즉 "어느 슬롯에 누구를 앉히느냐"가 전투력 자체를 결정한다 — 챔피언 개별 스펙보다 **조합·배치가 딜량의 주 변수**

> **본작 접점 — battle_design.md §9-9 미결 항목("다중 타격·범위 스킬의 피해 분배 — 진형·타겟팅 확정 후")과 정확히 맞물린다.** 본작이 아직 진형을 정하지 않은 상태인데, Idle Champions는 "인접/2칸/같은 열" 3단계라는 **가장 단순한 형태의 사거리 분류**로 이 문제를 풀어놨다. 진형을 설계할 때 참고할 만한 최소 단위 후보.

### 2-3. Bond — 종족·클래스 조합 시너지

- `Asharra`는 **10개 지정 종족**(Aarakocra·Centaur·Dragonborn·Firbolg·Lizardfolk·Minotaur·Satyr·Tiefling·Tortle·Triton)이 파티에 있으면 그 종족 챔피언 전원의 피해를 **+100%** 증폭한다[위키스니펫](이번 심화에서 종족 10종 전체 명단·정확한 배율 신규 확보 — 기존 조사는 "Dragonborn·Tiefling·Half-Elf 등"으로만 예시했었다, Half-Elf는 이번 재검색에서 확인 못 해 목록에서 제외)
- **매칭되는 종족 하나당 버프 potency가 +100%씩 증가**하고(승수가 아니라 가산으로 추정, 정확한 결합식은 N/F), **파티 내 영향받는 챔피언이 4명 이상이면** Asharra 자신도 그 Bond 효과를 받는다 — 문턱값(threshold) 존재
- → "몇 종을 섞어야 이득인가"라는 편성 결정을 만드는 장치. 본작에 이런 축은 없음(§5 참고)

### 2-4. 액티브 스킬 발동 방식

Idle Champions는 **자원바(마나/기 게이지) 방식이 아니라, 실시간 초 단위 쿨다운 방식**이다. 층위가 셋으로 나뉜다 — 각 층위의 실제 챔피언 사례·정확한 수치는 [01_skills.md §2·§5](01_skills.md#2-기본-공격--실시간-쿨다운)에서 심화했다.

| 층 | 발동 방식 | 비고 |
|---|---|---|
| **기본 공격** | **실시간 쿨다운**(대략 0.8~수 초) — 클래스/챔피언마다 고유 수치, 다 되면 자동 발동 [커뮤니티] | 아이템·특성으로 쿨다운을 단축·리셋하는 챔피언이 다수 존재 |
| **전문화(Specialization) 능력** | 기본 공격 쿨다운에 얹혀 발동하거나, 별도 조건부 발동 | 챔피언마다 발동 조건이 제각각이라 **통일 규칙이 아니다** |
| **Ultimate(궁극기)** | **별도의 긴 쿨다운** + **수동 클릭 발동** [Steam가이드] — 자동화하려면 Familiar를 배정해야 함 | 자원 게이지가 아니라 **쿨다운 완료 여부(0/1)** 로만 판정됨 |

- **자원바 형태(Rage/기 게이지처럼 전투 중 축적되는 자원)는 이번 조사에서 확인되지 않았다.** Idle Champions의 "궁극기"는 **시간이 자원이다**(쿨다운을 채우는 것 자체가 유일한 대가)

### 2-5. Feat 슬롯 — 챔피언 레벨로 여는 영구 해금

- Feat Slot은 **챔피언 레벨**로 열리고, **한 번 열리면 리셋해도 영구히 유지**된다 [위키스니펫]
- 슬롯이 늘어날수록 요구 레벨이 챔피언마다 다르게, 점점 더 높아진다 — 정확한 슬롯 수·레벨 표는 미확인(챔피언별 프로필 다이얼로그에서만 확인 가능하다는 것이 이번 재검색으로도 재확인됨[커뮤니티])
- **Feat 희귀도는 3단계다** — Uncommon(챔피언마다 처음부터 소수 기본 지급) / Rare(골드 상자 드롭 또는 젬 구매, 골드상자당 약 4% 확률) / **Epic(신규 확인 — 주말 버프 상자·프리미엄 패키지 동봉 또는 고가 젬 구매)**[커뮤니티] — 1차 조사는 2단계(기본/상위)로만 파악했는데 이번 심화로 **3단계**임이 확인됐다
- 슬롯 메커니즘·희귀도 구조의 상세는 [02_items.md §5](02_items.md#5-feat--슬롯형-영구-해금-아이템)

---

## 3. 아이템 구조 (요약 — 상세는 [02_items.md](02_items.md))

- **Gear 6슬롯** — 챔피언 1인당 6개, 희귀도 4단(Common→Uncommon→Rare→Epic, 등급마다 배율 곱연산)에 Shiny(+50%)/Gold Epic(+100%) 변형이 얹힌다. 정확한 슬롯 명칭은 여전히 [추정/미확인] — [02_items.md §1](02_items.md#1-gear--슬롯-6--희귀도-4단)
- **세트 보너스 자체가 없다** — Lootun·Dragon Cliff에 이어 세 번째로 "장비 부위 간 세트를 걸지 않는" 참고작 사례 — [02_items.md §2](02_items.md#2-세트-보너스-없음--3자-수렴의-네-번째-사례)
- **Forge** — Epic + Scales of Tiamat로 Legendary 승급, 챔피언 고정 6종 후보 중 무작위 배정 + 소진형 재굴림(첫 5회는 미출현 우선) — [02_items.md §3](02_items.md#3-forge--legendary-승급과-재굴림)
- **획득은 Chest 중심** — 몬스터 직접 드롭이 아니라 Silver/Gold Chest를 여는 행위 자체가 파밍. 정확한 확률(Silver 레어 약 3.2%, Gold 레어 100%·에픽 10%+)을 이번 심화로 신규 확보 — [02_items.md §4](02_items.md#4-획득-경로--chest-중심)
- **"유물(Relic)"이라는 이름의 아이템은 확인되지 않았다** — 가장 가까운 것은 역할별(DPS/Tank/Support/Healing) 장비 강화 아이템 **Marvelous Pigments**(Emergence 이벤트 도입) — [02_items.md §6](02_items.md#6-marvelous-pigments--유물relic에-가장-가까운-존재)
- 기타 소모품(Time Gate·Bounty Contract·Potion of Polish)과 레벨링(중복 획득 기반, +0.4%/lv)은 [02_items.md §7·§8](02_items.md#7-기타-소모품--time-gate-bounty-contract-potion-of-polish)

---

## 4. 스킬 구성 (요약 — 상세는 [01_skills.md](01_skills.md))

- **챔피언 1인 = 기본 공격(쿨다운) + Specialization(분기 선택) + Feat(패시브, 슬롯 기반) + Ultimate(긴 쿨다운) + Bond(있는 챔피언만)** — 4~5층 구조. 각 층의 발동 방식은 §2-4에서 요약, 심화는 [01_skills.md §1~§7](01_skills.md#1-챔피언-1인의-스킬-구성-4층)
- **Specialization은 "트리"가 아니라 "역할 분기 선택"** — 챔피언마다 소수의 갈림길(대개 2~3지). Minsc처럼 "어느 적 타입에 300% 추가 피해를 줄지" 고르는 타입-특화형도 있다 — [01_skills.md §3](01_skills.md#3-specialization--분기-선택-구조)
- **Familiar = 구매하는 자동화 에이전트** — 클릭 대행(초당 5클릭)·Ultimate 자동 사용(30초마다 무작위 1개)·골드/젬 자동 습득을 배정 마리 수로 단계적으로 해금. 정확한 배정 규칙을 이번 심화로 전량 확보 — [01_skills.md §7](01_skills.md#7-familiar--조작을-대행하는-자동화-유닛)
- **대표 챔피언 8종의 실제 스킬 수치**(Bruenor·Celeste·Umberto·Widdle·Jarlaxle·Artemis Entreri·Asharra·Minsc)를 역할군별로 확보 — [01_skills.md §8](01_skills.md#8-대표-챔피언-실제-스킬--역할군별)

---

## 5. 본작 대조 시사점

**⚠ 조사 지시에 따라 비교만 하며, 개선 제안은 담지 않는다.**

| 축 | Idle Champions | 본작 (확정분) |
|---|---|---|
| 오프라인의 정체 | **오프라인에도 전투가 진행된다**(분당 약 1구역) | 오프라인 = 비전투 전부(파견). 전투는 실시간 독점 |
| 파티 인원 | **9~12명, 챕터마다 고정 형태**(늘어나는 시스템이 아니라 콘텐츠가 갈아 끼움) | 3인 · `party_size_max` |
| 대열 | 격자 + 열(column), 포지션 사거리 3단계(인접/2칸/같은 열) | 미정 — battle_design.md §9-9 진형 미결 |
| 액티브 발동 | **쿨다운(초) + 자원바 없음**. Ultimate만 수동 클릭 또는 무작위 자동 | 행동 주기 + 실시간 쿨다운(battle_design.md §6), 우선순위는 **출처 고정 3개**(§5) |
| 자동화 | **구매하는 에이전트(Familiar)** 가 조작을 대행, 배정 마리 수가 자동화 범위를 단계적으로 넓힌다 | 자동전투 자체가 기본값, 별도 "자동화 구매" 개념 없음 |
| 세트 보너스 | **없음** (슬롯 간 시너지 자체가 미확인) | 죄종 3/6/9 (장비 부위에 건다 — 참고작 3곳과 다른 소수 노선) |
| 아이템 강화 | **중복 획득 기반**(+0.4%/lv) + 소진형 재굴림 pity | 강화(골드), 세부 미정 |
| 아이템 획득 | **Chest를 여는 행위가 파밍** — 몬스터 직접 드롭이 아니다 | 몬스터 처치 시 직접 드롭 (컨셉락: "접속 중 → 원정 전투로 장비 드롭") |
| 파티 시너지 | Bond — 종족·클래스 조합이 문턱값(4명) 넘으면 발동, 종족당 potency +100% | 없음(현재 확정분) |
| 스킬 성장 구조 | Specialization = 챔피언별 2~3지 선택, 다단 트리 아님. Feat는 3단 희귀도(Uncommon/Rare/Epic)의 파밍형 슬롯 | 3탭(죄종/마스터리/전직) — skill_design.md |

**요약해서 남길 세 가지**

1. **오프라인=전투라는 실존 사례가 있다.** 본작 컨셉락 1항이 명시적으로 배제하는 형태를 Idle Champions가 정확히 취하고 있다는 것은, "왜 우리는 이 길을 안 가는가"를 되짚을 때 대조군으로 쓸 수 있다. 다만 이건 방향을 바꾸자는 근거가 아니라 **락이 실제로 가르는 경계선이 이 게임 하나 건너에 있다**는 확인이다.
2. **포메이션 "확장"은 본작의 "동시 원정 1개" 논의와 비교 대상이 아니다.** Idle Champions의 슬롯 수 변화는 플레이어가 여는 사다리가 아니라 **챕터 콘텐츠가 갈아 끼우는 프리셋**이다. 그래서 이 자료는 "본작도 슬롯을 늘리자"는 근거가 될 수 없고(컨셉락상 제안도 아님), 오히려 **"정원 확장"과 "형태 교체"가 서로 다른 축**이라는 걸 보여주는 사례로만 쓴다.
3. **세트 보너스 없음이 3자 수렴을 4자 수렴으로 만들었다.** Lootun·Dragon Cliff에 이어 Idle Champions도 장비 슬롯 간 세트를 걸지 않는다(상세는 [02_items.md §2](02_items.md#2-세트-보너스-없음--3자-수렴의-네-번째-사례)). 본작이 죄종 세트포인트로 반대 노선을 타는 것은 여전히 "의도된 소수파"이며, 그 사실이 한 번 더 확인됐다는 정도로 기록해 둔다.

---

## 6. 출처 · 미확인

### 6-1. 출처

**1차 조사 (2026-08-28)**

Steam 가이드(WebFetch 직접 열람 성공)
- `Optimal Formations (Events & Permanent Campaigns)` — https://steamcommunity.com/sharedfiles/filedetails/?id=1319319295
- `Idle Champions of the Forgotten Realms Guide` — https://steamcommunity.com/sharedfiles/filedetails/?id=3219175741 (1차 조사 시 성공, 이번 심화 재열람은 레이트리밋으로 실패)

미러/3차 사이트(WebFetch)
- Formations & Mechanics — https://shapes.inc/fandom/idle-champions-of-the-forgotten-realms/formations-and-mechanics (1차 성공, 이번 심화 재열람은 404)
- Gear — https://shapes.inc/fandom/idle-champions-of-the-forgotten-realms/gear (1차·심화 모두 404)
- Gear Farming Guide / Slot Optimization Guide — https://tap-guides.com/2025/10/24/idle-champions-gear-farming-guide/ 등
- Walkthrough: Start to Endgame — https://earlyguides.com/idle-champions-of-the-forgotten-realms/walkthrough
- 챔피언 데이터베이스 — https://incendar.com/idlechampions_champion_list.php

Fandom 위키(WebFetch 402 차단 — 검색 스니펫으로만 열람)
- 메인 — https://idlechampions.fandom.com/wiki/Idle_Champions_of_the_Forgotten_Realms_Wiki
- 주요 페이지: `Formations` `Gear` `Equipment` `Feats` `Forge` `Divine Favor` `Blessings` `Chests` `Familiars` `Modron_Automation` `Combinations` `Campaigns` `Formation_strategy` `Trials_of_Mount_Tiamat`

공식
- Steam 상점 — https://store.steampowered.com/app/627690/Idle_Champions_of_the_Forgotten_Realms/
- Codename Entertainment 공지 — https://www.codenameentertainment.com/?page=idle_champions

**2차 심화 (2026-08-28, 이번 세션 — WebSearch/WebFetch 22회)**

- Feat 슬롯·레벨: WebSearch "Idle Champions of the Forgotten Realms Feat slots level requirements"
- Celeste 전문화: WebSearch "Idle Champions Celeste specialization War Domain Life Domain skill" · WebFetch https://idle.kleho.ru/hero/celeste/ (522 실패)
- Relic 존재 여부: WebSearch "Idle Champions Relic item type" → 미확인, §7-2([02_items.md](02_items.md))로 정리
- Gear 슬롯 명칭: WebSearch "Idle Champions gear slot names Cloak Amulet Ring Helm Boots weapon" (미확정 유지)
- Forge Legendary 효과: WebSearch "Idle Champions Forge Legendary effects list champion"
- Feats 위키: WebFetch https://idle-champions.fandom.com/wiki/Feats (402 실패)
- Bruenor Rally: WebSearch "Idle Champions Bruenor Battlehammer Rally position skill"
- Wren Flurry of Blows: WebSearch "Idle Champions Wren Flurry of Blows specialization"
- Chest 확률: WebSearch "Idle Champions chest drop rate Silver Gold odds"
- Umberto: WebSearch "Idle Champions Umberto bear form cooldown reset party"
- Jarlaxle Loner: WebSearch "Idle Champions Jarlaxle Loner Room to Work specialization percent"
- Asharra Bond: WebSearch "Idle Champions Asharra Bond dragonborn tiefling threshold"
- Familiar: WebSearch "Idle Champions Familiar list effects gold gems click"
- Gear 슬롯 재확인: WebSearch "Idle Champions gear slots list 6 slots weapon armor accessory official" (실패)
- Gear 상세: WebFetch https://shapes.inc/fandom/idle-champions-of-the-forgotten-realms/gear (404) · https://shapes.inc/fandom/idle-champions-of-the-forgotten-realms/formations-and-mechanics(Blessings 정보만 확보)
- Artemis Entreri Observance: WebSearch "Idle Champions Artemis Entreri Observance duplicate positional buff"
- Widdle: WebSearch "Idle Champions Widdle cooldown reset chance hit"
- Divine Favor/Blessings: WebSearch "Idle Champions Blessings Divine Favor gold multiplier list"
- Gear 파밍 가이드: WebFetch https://tap-guides.com/2025/10/24/idle-champions-gear-farming-guide/ (전략만 확보, 구조 정보 없음)
- Catti-brie/Drizzt: WebSearch "Idle Champions Catti-brie Drizzt positional formation ability same column"
- Minsc: WebSearch "Idle Champions Minsc specialization Berserker Ranger skill damage"
- Feat 희귀도: WebSearch "Idle Champions Feat rarity Uncommon Rare gold chest gem purchase"
- Steam 가이드 재열람: WebFetch https://steamcommunity.com/sharedfiles/filedetails/?id=3219175741 (레이트리밋 실패)
- 챔피언 티어리스트: WebSearch "Idle Champions best champions tier list 2026 DPS tank support"
- 기타 아이템: WebSearch "Idle Champions Bounty Contract Time Gate Marvelous Pigments Potion of Polish what are they"

### 6-2. 미확인 / 상충

| 항목 | 상태 |
|---|---|
| **시작 캠페인(Sword Coast) 슬롯 수** | 9석[Steam가이드] vs 10석[미러] — **상충**, 원문 미대조 |
| **기어 슬롯 6종의 정확한 명칭·구성** | Cloak·Amulet·Ring·Helm·Boots + 무기로 **추정**, 이번 심화에서도 재검색했으나 공식 전체 목록 확보 못함 — [02_items.md §1](02_items.md#1-gear--슬롯-6--희귀도-4단) |
| **Feat 슬롯 총 개수·레벨 요구치 전체 표** | "레벨로 열리고 영구 유지"까지만 확인, 챔피언별 정확한 표는 미확인. Uncommon/Rare/**Epic** 3단 희귀도는 이번 심화로 신규 확인 |
| **자원바형 메커니즘의 완전한 부재 여부** | 이번 조사에서 못 찾았을 뿐, 특정 챔피언·엔드게임 콘텐츠에 국한된 자원 게이지가 있을 가능성을 배제 못 함 |
| **9개 캠페인 전체 명단과 각각의 정확한 슬롯 수·형태** | Sword Coast·Tomb of Annihilation·Waterdeep·Avernus·Icewind Dale 5종만 상세 확인, 나머지는 이름만 확인 |
| **Legendary 효과 무작위 배정의 확률 가중치** | "6개 중 무작위, 첫 5회 재굴림은 미출현 우선"까지만 확인, 균등분포인지는 미확인 |
| **Asharra Bond potency의 정확한 결합식(가산 vs 승수)** | "종족 하나당 +100%"라는 수치는 확보했으나 여러 종족이 겹칠 때 가산인지 승수인지는 미확인 |
| **Marvelous Pigments의 정확한 효과 수치** | Support/DPS/Tanking/Healing 4변형 존재는 확인, 각 변형의 정확한 수치는 미확인 — [02_items.md §6](02_items.md#6-marvelous-pigments--유물relic에-가장-가까운-존재) |

---

*마지막 업데이트: 2026-08-28 (폴더 3분리 — 스킬·아이템 조사를 01_skills.md/02_items.md로 이관·심화, 이 문서는 조사방법+구조+파티 포메이션 상세+대조 시사점+출처 전담으로 재편. Asharra Bond 종족 10종 전체 명단, Feat 희귀도 3단계 신규 확인, 오프라인 골드획득 배율 공식 등 반영) · 2026-08-28 (최초 작성)*
