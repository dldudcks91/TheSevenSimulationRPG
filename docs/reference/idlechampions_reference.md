# Idle Champions of the Forgotten Realms — 시스템 조사

> 상태: **1차 조사 완료** (2026-08-28) — 전수조사 아님, 대표 사례 위주
> 목적: "여러 영웅이 동시에 대열을 이뤄 자동으로 싸우는 파티" 구조의 표본 확보. 본작 원정 파티(3인 · 실시간 자동전투)와 대조할 세 번째 참고작
> ⚠ **이 문서의 수치는 전부 Idle Champions의 수치다.** 본작 SSOT가 아니며 `src/data/*.csv` 로 옮기지 말 것

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 |
| 1 | 게임 구조 한 장 |
| 2 | **파티 포메이션 구조** (상세 — 최우선 조사 항목) |
| 3 | 아이템 구조 |
| 4 | 스킬 구성 |
| 5 | 본작 대조 시사점 |
| 6 | 출처 · 미확인 |

---

## 0. 조사 방법과 신뢰도

**Dragon Cliff 조사 때와 같은 장벽에 부딪혔다** — Fandom(`idlechampions.fandom.com` / `idle-champions.fandom.com`, 실제로 두 서브도메인이 혼재해 검색된다)이 **WebFetch에 HTTP 402(Payment Required)를 돌려줘 직접 크롤이 전면 차단**된다. `web.archive.org` 경유도 이 환경에서 아예 막혀 있다. 그래서 이번 조사는 **WebSearch 스니펫**(구글 검색이 위키 본문을 요약해 반환하는 조각)과, Fandom을 미러링하거나 인용하는 **3차 사이트**(`shapes.inc/fandom/...`, `tap-guides.com`, `earlyguides.com`, `incendar.com`) 를 WebFetch로 우회 열람하는 방식에 의존했다.

| 표기 | 소스 | 신뢰도 | 비고 |
|---|---|---|---|
| **[위키스니펫]** | WebSearch가 반환한 Fandom 위키 검색 결과 요약 | ★★ | 위키 원문이 아니라 **검색엔진의 AI 요약**을 거친 것 — 원문 표는 확보 못 함 |
| **[미러]** | `shapes.inc/fandom/idle-champions-of-the-forgotten-realms/*` — Fandom 내용을 재구성한 3차 사이트, WebFetch로 열람 | ★★ | 이 사이트 자체가 **또 한 번 AI 가공**한 결과물일 가능성 있음 (`Formations` 페이지는 성공, `Gear` 페이지는 404) |
| **[가이드]** | `tap-guides.com`(2025 작성) · `earlyguides.com` — 비공식 공략 사이트 | ★★ | 코드네임 공식 자료 아님. 다만 여러 사이트가 **독립적으로 같은 어휘·수치에 수렴**(예: "6 gear slots", "Common/Uncommon/Rare/Epic", "Divine Favor")해 교차검증됨 |
| **[Steam가이드]** | Steam Community Guide (예: `Optimal Formations`, `Idle Champions of the Forgotten Realms Guide`) | ★★★ | 유저 작성이나 실제 플레이 스크린샷·수치 기반, WebFetch로 직접 열람 성공 |
| **[커뮤니티]** | Steam 토론 스레드 (WebSearch 경유) | ★★ | |

**Dragon Cliff 조사 때 세운 오염 검증 원칙**(게임 이름이 맞아도 어휘를 교차검증해야 AI 생성 허구를 거른다)을 여기도 적용했다. 이번엔 `mejoress.com` 류의 명백한 오염원은 검색에 걸리지 않았고, `Divine Favor` · `Blessings` · `Feats` · `Specialization` · `Bond` · `Familiars` · `Modron Automation` · `Forge` · `Scales of Tiamat` 같은 고유명사가 **서로 다른 출처 8곳 이상에서 일관되게** 재등장해 신뢰도를 뒷받침한다.

**상충 발견 1건** — 시작 캠페인(Sword Coast)의 포메이션 슬롯 수가 출처에 따라 **9석**([Steam가이드] `Optimal Formations`)과 **10석**([미러] shapes.inc)으로 갈린다. §2-1에 두 값을 병기하고 [상충]으로 표시.

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
- **초반은 클리커, 후반은 자동화** — 저레벨 구간은 몹을 직접 클릭해 잡고, 포메이션이 갖춰지면 자동전투로 넘어가며, `Familiar`(§4-5)를 배정하면 클릭 자체도 대행된다 [커뮤니티]
- **프레스티지형 리셋(Divine Favor)** — 챕터 진행이 막히면("Wall") 리셋해 Divine Favor를 얻고, 이걸로 영구 골드획득 배율을 산다. 챔피언·기어·Feat 등 "힘을 늘리는 모든 것"은 리셋되지 않고 **영구 보존**된다 [위키스니펫][커뮤니티] — 리셋되는 것은 스테이지 진행도뿐
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

- 예시: `Celeste`의 War Domain, `Bruenor Battlehammer`의 Rally는 이 범위 내 챔피언에게 버프를 준다. `Asharra`의 Bond(§2-3)는 **특정 종족·클래스 조합**이 포메이션에 있어야 발동한다. `Artemis Entreri`의 Observance는 근방 챔피언에게 걸린 포지션 버프를 **복제**해 자기 피해로 환산한다 [미러]
- 즉 "어느 슬롯에 누구를 앉히느냐"가 전투력 자체를 결정한다 — 챔피언 개별 스펙보다 **조합·배치가 딜량의 주 변수**

> **본작 접점 — battle_design.md §9-9 미결 항목("다중 타격·범위 스킬의 피해 분배 — 진형·타겟팅 확정 후")과 정확히 맞물린다.** 본작이 아직 진형을 정하지 않은 상태인데, Idle Champions는 "인접/2칸/같은 열" 3단계라는 **가장 단순한 형태의 사거리 분류**로 이 문제를 풀어놨다. 진형을 설계할 때 참고할 만한 최소 단위 후보.

### 2-3. Bond — 종족·클래스 조합 시너지

- `Asharra`류 챔피언은 **특정 종족(Dragonborn, Tiefling, Half-Elf 등)이 파티에 있으면** 그 종족 챔피언 전원의 피해를 증폭한다 [위키스니펫]
- **매칭되는 종족 하나당 버프 potency가 증가**하고, **파티 내 영향받는 챔피언이 4명 이상이면** Bond를 발동한 챔피언 자신도 그 효과를 받는다 — 문턱값(threshold) 존재
- → "몇 종을 섞어야 이득인가"라는 편성 결정을 만드는 장치. 본작에 이런 축은 없음(§5 참고)

### 2-4. 액티브 스킬 발동 방식 — 요청하신 핵심 질문의 답

Idle Champions는 **자원바(마나/기 게이지) 방식이 아니라, 실시간 초 단위 쿨다운 방식**이다. 층위가 셋으로 나뉜다:

| 층 | 발동 방식 | 비고 |
|---|---|---|
| **기본 공격** | **실시간 쿨다운**(대략 0.8~수 초) — 클래스/챔피언마다 고유 수치, 다 되면 자동 발동 [커뮤니티] | 아이템·특성으로 쿨다운을 단축·리셋하는 챔피언이 다수 존재 (`Umberto`의 곰 변신은 **파티 전원**의 기본 공격 쿨다운을 리셋, `Widdle`은 피격 시 25% 확률로 자기 쿨다운 리셋) |
| **전문화(Specialization) 능력** | 기본 공격 쿨다운에 얹혀 발동하거나, 별도 조건부 발동(예: 처치 시 재충전 — `Wren`의 Flurry of Blows) | 챔피언마다 발동 조건이 제각각이라 **통일 규칙이 아니다** |
| **Ultimate(궁극기)** | **별도의 긴 쿨다운** + **수동 클릭 발동** [Steam가이드] — 자동화하려면 Familiar를 배정해야 하고, 그 경우 **"30초마다 준비된 Ultimate 중 무작위 하나를 클릭"** [위키스니펫] | 자원 게이지가 아니라 **쿨다운 완료 여부(0/1)** 로만 판정됨. 준비된 게 여러 개면 무작위 선택 — 본작·Dragon Cliff의 "우선순위 리스트" 방식과 다르다 |

- **자원바 형태(Rage/기 게이지처럼 전투 중 축적되는 자원)는 이번 조사에서 확인되지 않았다.** Dragon Cliff의 Rage 축적형 Tactic과는 뚜렷이 다른 설계 — Idle Champions의 "궁극기"는 **시간이 자원이다**(쿨다운을 채우는 것 자체가 유일한 대가)
- 순서 고정 여부: 기본 공격/전문화 능력은 챔피언별로 조건이 하드코딩돼 있어 "고정 슬롯 순서"라는 개념 자체가 약하다. Ultimate만 **"무작위 중 하나"**라는 명시적 우선순위 부재 규칙을 가진다 — 본작·Dragon Cliff가 채택한 "슬롯/리스트 순서" 방식과 대조되는 제3의 해법

### 2-5. Feat 슬롯 — 챔피언 레벨로 여는 영구 해금

- Feat Slot은 **챔피언 레벨**로 열리고, **한 번 열리면 리셋해도 영구히 유지**된다 [위키스니펫]
- 슬롯이 늘어날수록 요구 레벨이 챔피언마다 다르게, 점점 더 높아진다 — 정확한 슬롯 수·레벨 표는 미확인
- 기본(Uncommon급) Feat는 챔피언마다 처음부터 소수 주어지고, 상위(Rare급) Feat는 골드 상자 또는 젬 구매로 별도 획득 [위키스니펫]

---

## 3. 아이템 구조

### 3-1. 슬롯 6

- **챔피언 1인당 기어 슬롯 6개** [가이드][커뮤니티] — 본작 8부위보다 적고 Dragon Cliff 5부위보다 약간 많다
- 슬롯 종류는 명확한 원문을 확보하지 못했으나, 위키 카테고리 목록에 `Cloak`·`Amulet`·`Ring`·`Helm`·`Boots`가 장비 종류로 등장한다 [위키스니펫] — 무기 슬롯과 합쳐 6종을 이룬다고 추정된다 **[추정/미확인]**
- **빈 슬롯은 숙련도(proficiency) 0으로 취급된다** — "일단 6칸을 다 채우는 것"이 업그레이드보다 우선이라는 공략 원칙이 반복 등장 [가이드]

### 3-2. 희귀도 4단계 + Shiny/Gold 변형

```
Common(1x) → Uncommon(2x) → Rare(6x) → Epic(24x)
                                            ↓
                                Shiny(+50% 고정) / Gold Epic(+100%, override)
                                            ↓
                                    Legendary (Forge 승급, §3-4)
```

- 괄호 안 배수는 **같은 슬롯 기본 효과 대비 배율**이다 — 등급이 오를수록 곱연산으로 세진다 [위키스니펫]
- Shiny(은테)는 해당 **슬롯의 숙련도에 영구 +50%**, Gold Epic(금테)은 **+100%**를 주며 서로 override 관계다 [위키스니펫]

### 3-3. 세트 보너스 없음 — 3자 수렴의 네 번째 사례

**여러 독립 검색에서 "장비 세트(2피스/4피스 보너스)" 관련 정보가 전혀 나오지 않았다.** 각 슬롯의 효과는 그 슬롯 하나에서 끝나고, 슬롯 간에 걸리는 세트 보너스 체계가 확인되지 않는다 [가이드][위키스니펫].

> Lootun(장비 세트 없음 · 젬 세트만) → Dragon Cliff(장비 세트 없음 · 젬/목걸이 세트) → **Idle Champions(장비 세트 자체가 없음, 대체 레이어도 안 보임)**. dragoncliff_reference.md §5-5가 "두 참고작이 독립적으로 같은 곳에 도달했다"고 적었는데, **세 번째 참고작도 같은 결론**이다. "세트 보너스를 장비 부위에 걸면 장비 교체 자유도를 죽인다"는 원칙이 표본이 늘수록 더 단단해진다. 본작의 죄종 3/6/9 세트포인트(장비 부위 걸림)는 여전히 **의도된 소수 노선**임을 재확인.

### 3-4. Forge — Legendary 승급과 재굴림

- **Epic 등급 아이템 + Scales of Tiamat**(Trials of Mount Tiamat 클리어로 획득)를 Forge에 넣으면 **Legendary**로 승급한다 [위키스니펫]
- **챔피언마다 고정된 6종의 Legendary 효과 후보**가 있고, 승급 시 **그중 하나가 무작위로 배정**된다 — 플레이어가 고르는 게 아니다 [커뮤니티]
- **재굴림(Reforge) 가능** — 마음에 안 들면 다시 굴릴 수 있고, **첫 5회 재굴림은 "아직 안 나온 효과" 중에서만 나온다**(6개를 다 보기 전까진 중복 없음) — 확률형 재굴림에 **천장(pity) 규칙**을 얹은 구조 [커뮤니티]
- Dragon Cliff의 Reforge("속성 1개 재굴림", 등급 무관 순수 무작위)와 달리, Idle Champions는 **"안 나온 것 우선"이라는 소진형 규칙**을 얹어 무한 재굴림의 좌절을 줄인다

### 3-5. 획득 경로 — Chest 중심, 직접 드롭이 아니다

| 상자 | 등급 구성 | 얻는 법 |
|---|---|---|
| **Silver Chest** | Common~Rare 중심, 카드 3장(장비 1 + 골드 1 포함) | 스테이지 진행 중 자연 드롭 (예: 특정 목표 클리어 시 평균 5.47개) [Steam가이드] |
| **Gold Chest** | Uncommon~Epic, 5개 아이템 | 스테이지 보스/완료 보상 **젬**으로 구매, 또는 소량 자연 드롭(같은 예시에서 0.17개) [Steam가이드] |
| Targeted Gold Chest | 특정 챔피언 전용 | 젬으로 구매 — 육성 챔피언을 정해 파밍할 때 사용 [가이드] |

- **본작처럼 "몬스터가 장비를 직접 떨군다"는 문법이 아니다.** 전투는 젬·골드·상자 자체를 벌어들이는 수단이고, **상자를 여는 행위**가 곧 파밍이다. 실물 결제로도 상자를 살 수 있다(F2P 수익화 채널) — 이 문서 목적상 상세 조사는 생략
- **레벨링도 골드 소모가 아니라 "중복 획득" 기반이다** — 이미 가진 장비와 같은 걸 또 얻으면 레벨이 오르고(+0.4%/레벨, 등급이 높을수록 한 번에 더 많이 오름), Blacksmithing Contract 소모로도 레벨을 올릴 수 있다 [위키스니펫]. 골드를 직접 부어 강화하는 창구는 확인되지 않았다 **[미확인]**

---

## 4. 스킬 구성

### 4-1. 챔피언 1인의 스킬 구성 요약

```
챔피언 1인 = 기본 공격(쿨다운)  +  전문화(Specialization, 분기 선택)
             +  Feat(패시브, 슬롯 기반)  +  Ultimate(긴 쿨다운, 수동/Familiar)
             +  Bond(파티 조합 시너지, 있는 챔피언만)
```

### 4-2. Specialization — 트리라기보다 "분기 선택"

- 챔피언마다 **소수의 갈림길**을 제공한다. 예: `Celeste`(성직자) = War Domain(자신의 Crusader's Mantle 강화) **vs** Life Domain(Mass Cure Wounds 강화) [위키스니펫]. `Jarlaxle`(로그)의 Loner 경로는 "Room to Work" 포지션 능력을 최대 +300%까지 강화 [Steam가이드]
- **폭 넓은 트리(노드 다수)가 아니라 "이 챔피언을 어떤 역할로 굴릴 것인가"를 정하는 이지선다·삼지선다에 가깝다.** D2식 다단계 탤런트 트리(Dragon Cliff의 4그룹 계단)와는 결이 다르다
- 오프라인 진행은 Specialization 선택 시점에서 멈춘다(§1) — 이 선택이 방치 진행을 끊는 유일한 체크포인트

### 4-3. Feat — 레벨로 여는 슬롯형 패시브 (§2-5 참조)

### 4-4. Ultimate — 쿨다운 + 수동 클릭 (§2-4 참조)

### 4-5. Familiar — 조작을 대행하는 자동화 유닛

- Familiar는 **재화(현질/젬/시즌 보상 등)로 구매하는 소환수**이며, 전투에 참여하는 게 아니라 **플레이어의 조작 자체를 대행**한다 [위키스니펫]:
  - 클릭 대행(초당 1~5클릭, 몹 클릭 / 챔피언 레벨업 클릭 분리)
  - **Ultimate 자동 사용**(4슬롯 배정 시 30초마다 무작위 하나 클릭)
  - 3마리 이상 배정 시 골드·퀘스트 아이템 자동 습득, 5마리 이상이면 젬 주머니까지 자동 획득
- **Modron Automation**과 결합하면 물약 사용·전문화 선택·챕터 리셋·포메이션 배치까지 **플레이어 개입 없이** 돌아간다 [커뮤니티]

> **본작·Dragon Cliff의 "자동화 배급" 원리와 같은 결의 장치다.** Dragon Cliff는 Auto-Tactics를 "리스트 순서"로 자동화했는데, Idle Champions는 **조작 자체를 대행하는 에이전트(Familiar)를 별도로 사고 배치하는 방식**으로 자동화를 상품화했다. 자동화가 "무료로 열리는 진행 보상"이 아니라 **구매 대상**이라는 점이 본작·Dragon Cliff와 가장 다른 지점.

### 4-6. Bond — §2-3 참조 (포메이션 조합 시너지이자 스킬 효과이기도 함)

---

## 5. 본작 대조 시사점

**⚠ 조사 지시에 따라 비교만 하며, 개선 제안은 담지 않는다.**

| 축 | Idle Champions | 본작 (확정분) |
|---|---|---|
| 오프라인의 정체 | **오프라인에도 전투가 진행된다**(분당 약 1구역) | 오프라인 = 비전투 전부(파견). 전투는 실시간 독점 |
| 파티 인원 | **9~12명, 챕터마다 고정 형태**(늘어나는 시스템이 아니라 콘텐츠가 갈아 끼움) | 3인 · `party_size_max` |
| 대열 | 격자 + 열(column), 포지션 사거리 3단계(인접/2칸/같은 열) | 미정 — battle_design.md §9-9 진형 미결 |
| 액티브 발동 | **쿨다운(초) + 자원바 없음**. Ultimate만 수동 클릭 또는 무작위 자동 | 행동 주기 + 실시간 쿨다운(battle_design.md §6), 우선순위는 **출처 고정 3개**(§5) |
| 자동화 | **구매하는 에이전트(Familiar)** 가 조작을 대행 | 자동전투 자체가 기본값, 별도 "자동화 구매" 개념 없음 |
| 세트 보너스 | **없음** (슬롯 간 시너지 자체가 미확인) | 죄종 3/6/9 (장비 부위에 건다 — 참고작 3곳과 다른 소수 노선) |
| 아이템 강화 | **중복 획득 기반**(+0.4%/lv) + 소진형 재굴림 pity | 강화(골드), 세부 미정 |
| 아이템 획득 | **Chest를 여는 행위가 파밍** — 몬스터 직접 드롭이 아니다 | 몬스터 처치 시 직접 드롭 (컨셉락: "접속 중 → 원정 전투로 장비 드롭") |
| 파티 시너지 | Bond — 종족·클래스 조합이 문턱값 넘으면 발동 | 없음(현재 확정분) |
| 스킬 성장 구조 | Specialization = 챔피언별 2~3지 선택, 다단 트리 아님 | 3탭(죄종/마스터리/전직) — skill_design.md |

**요약해서 남길 세 가지**

1. **오프라인=전투라는 실존 사례가 있다.** 본작 컨셉락 1항이 명시적으로 배제하는 형태를 Idle Champions가 정확히 취하고 있다는 것은, "왜 우리는 이 길을 안 가는가"를 되짚을 때 대조군으로 쓸 수 있다. 다만 이건 방향을 바꾸자는 근거가 아니라 **락이 실제로 가르는 경계선이 이 게임 하나 건너에 있다**는 확인이다.
2. **포메이션 "확장"은 본작의 "동시 원정 1개" 논의와 비교 대상이 아니다.** Idle Champions의 슬롯 수 변화는 플레이어가 여는 사다리가 아니라 **챕터 콘텐츠가 갈아 끼우는 프리셋**이다. 그래서 이 자료는 "본작도 슬롯을 늘리자"는 근거가 될 수 없고(컨셉락상 제안도 아님), 오히려 **"정원 확장"과 "형태 교체"가 서로 다른 축**이라는 걸 보여주는 사례로만 쓴다.
3. **세트 보너스 없음이 3자 수렴을 4자 수렴으로 만들었다.** Lootun·Dragon Cliff에 이어 Idle Champions도 장비 슬롯 간 세트를 걸지 않는다. 본작이 죄종 세트포인트로 반대 노선을 타는 것은 여전히 "의도된 소수파"이며, 그 사실이 한 번 더 확인됐다는 정도로 기록해 둔다.

---

## 6. 출처 · 미확인

### 6-1. 출처

**Steam 가이드 (WebFetch 직접 열람 성공)**
- `Optimal Formations (Events & Permanent Campaigns)` — https://steamcommunity.com/sharedfiles/filedetails/?id=1319319295
- `Idle Champions of the Forgotten Realms Guide` — https://steamcommunity.com/sharedfiles/filedetails/?id=3219175741

**미러/3차 사이트 (WebFetch)**
- Formations & Mechanics — https://shapes.inc/fandom/idle-champions-of-the-forgotten-realms/formations-and-mechanics
- Complete Encyclopedia & Guide (개요만) — https://shapes.inc/fandom/idle-champions-of-the-forgotten-realms
- Gear Farming Guide / Slot Optimization Guide — https://tap-guides.com/2025/10/24/idle-champions-gear-farming-guide/ · https://tap-guides.com/2025/10/24/idle-champions-slot-optimization/
- Walkthrough: Start to Endgame — https://earlyguides.com/idle-champions-of-the-forgotten-realms/walkthrough
- 챔피언 데이터베이스 — https://incendar.com/idlechampions_champion_list.php

**Fandom 위키 (WebFetch 402 차단 — 검색 스니펫으로만 열람)**
- 메인 — https://idlechampions.fandom.com/wiki/Idle_Champions_of_the_Forgotten_Realms_Wiki
- 주요 페이지: `Formations` `Gear` `Equipment` `Feats` `Forge` `Divine Favor` `Blessings` `Chests` `Familiars` `Modron_Automation` `Combinations` `Campaigns` `Formation_strategy` `Trials_of_Mount_Tiamat`

**공식**
- Steam 상점 — https://store.steampowered.com/app/627690/Idle_Champions_of_the_Forgotten_Realms/
- Codename Entertainment 공지 — https://www.codenameentertainment.com/?page=idle_champions

### 6-2. 미확인 / 상충

| 항목 | 상태 |
|---|---|
| **시작 캠페인(Sword Coast) 슬롯 수** | 9석[Steam가이드] vs 10석[미러] — **상충**, 원문 미대조 |
| **기어 슬롯 6종의 정확한 명칭·구성** | Cloak·Amulet·Ring·Helm·Boots + 무기로 **추정**, 위키 카테고리 목록 기반 정황 증거뿐 — 원문 확인 못 함 |
| **Feat 슬롯 총 개수·레벨 요구치 전체 표** | "레벨로 열리고 영구 유지"까지만 확인, 챔피언별 정확한 표는 미확인 |
| **자원바형 메커니즘의 완전한 부재 여부** | 이번 조사에서 못 찾았을 뿐, 특정 챔피언·엔드게임 콘텐츠에 국한된 자원 게이지가 있을 가능성을 배제 못 함 |
| **9개 캠페인 전체 명단과 각각의 정확한 슬롯 수·형태** | Sword Coast·Tomb of Annihilation·Waterdeep·Avernus·Icewind Dale 5종만 상세 확인, 나머지(Light of Xaryxis·Tales of the Champions·Trials of Mount Tiamat·Turn of Fortune's Wheel·Vecna: Eve of Ruin 등)는 이름만 확인 |
| **Legendary 효과 무작위 배정의 확률 가중치** | "6개 중 무작위, 첫 5회 재굴림은 미출현 우선"까지만 확인, 균등분포인지는 미확인 |
| **Gold Chest/Silver Chest의 정확한 등급별 확률표** | 예시 수치(500구역 클리어당 평균 5.47/0.17개) 하나만 확보, 일반화 가능한 공식은 미확인 |
| **Bond 문턱값(4명)이 모든 Bond 챔피언에 공통인지** | `Asharra` 사례 하나만 확인 |

---

*마지막 업데이트: 2026-08-28 (최초 작성)*
