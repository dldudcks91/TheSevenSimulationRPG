# AFK Arena — 스킬 시스템 전수 조사

> 상위 링크: [00_overview.md](00_overview.md)
> 짝 문서: [02_items.md](02_items.md) — Gear·Signature Item·Artifact·Furniture 4계층 전수(이 문서 §3·§4가 그쪽과 접점)
> 상태: **조사 완료** (2026-08-28)
>
> ⚠ **이 문서의 수치는 전부 참고작(AFK Arena)의 것이다. 본작 SSOT 가 아니며 `src/data/*.csv` 로 옮기지 말 것.**

---

## 0. 조사 방법과 신뢰도

00_overview.md §0 이 정리한 두 가지 장벽이 이 문서에도 그대로 적용된다 — ①`afk-arena.fandom.com` 직접 크롤 HTTP 402, ②AFK Journey(후속작)와의 상시 혼입. 이번 스킬 심화 조사에서 새로 확인된 것과 추가 대응:

| 표기 | 소스 | 신뢰도 | 비고 |
|---|---|---|---|
| **[히어로DB]** | `afk.global/afk-arena/characters/<hero>` — 개별 히어로 페이지 | ★★★ | **이번 조사의 핵심 발견**: 이 경로는 WebFetch가 402 없이 **전문 확보에 성공**했다(사이트 자체가 위키 미러가 아니라 자체 DB). Role·Faction·Class·Type 4개 메타데이터와 스킬 4종 전체(레벨별 수치 포함)를 표 형태로 제공 — 15개 히어로 전원 이 경로로 확보 |
| **[가이드]** | theriagames.com · afk.guide · pocketgamer.com | ★★★ | 승급 등급표·레벨 상한·오크 인(가구) 구조 |
| **[위키]** | afk-arena.fandom.com — 검색 스니펫 경유만 | ★★☆ | 402 차단은 이번에도 해제 안 됨 |
| **N/F** | 확인 못 함 | — | 추측하지 않고 표기만 남긴다 |

**열람한 `afk.global` 히어로 페이지(15종, 확보 성공)**: Belinda · Lucius · Rowan · Baden · Thane · Rosaline · Brutus · Lyca · Silvina · Athalia · Talene · Numisu · Ezizh · Raine · Mehira · Shemira · Thoran · Hogan · Leofric

**404로 실패한 경로(슬러그 추정 실패 — 존재 여부와 무관)**: `characters/eslabon` · `characters/krosis` · `characters/cecia`(★아래) · `characters/reinier` · `characters/krais`

### ⚠ 이번 조사에서 실제로 걸린 오염 사례 — Cecia ≠ Cecilia

`characters/cecia` 가 404를 반환해 검색했더니, **"Cecia"는 AFK Journey(후속작) 전용 히어로**였다(Graveborn Marksman, `afk-journey.fandom.com`·`prydwen.gg/afk-journey` 에서만 존재). AFK Arena(원작)의 대응 히어로는 철자가 다른 **"Cecilia"**(Lightbearer, Ranger, Assassin 역할)다. 00_overview.md §0 이 경고한 "이름이 비슷해서 검색 결과가 섞인다"는 위험이 **이번 조사에서 직접 재현된 사례**이며, 아래 §9 히어로 목록은 Cecilia(원작)로 정정해 수록했다.

---

## 1. 스킬 슬롯 구조 — "1 Passive + 2~3 Active" 고정 템플릿은 없다

과제 지시문이 가정한 "보통 1 Passive + 2~3 Active" 템플릿은 **부분적으로 틀렸다**. 15개 히어로 실측 결과, 슬롯 개수는 **3~4개(S1~S4)**로 거의 고정이지만, **Active/Passive 배분은 히어로마다 다르다** — 고정 템플릿이 아니라 "총 3~4칸 예산을 히어로마다 다르게 배분"하는 구조다.

| 히어로 | 총 슬롯 | S1(항상 Ultimate) | S2 | S3 | S4 |
|---|---|---|---|---|---|
| Belinda | 4 | Ultimate(수동) | Active | Passive | Passive |
| Lucius | 4 | Ultimate(수동) | Active | Active | Passive |
| Rowan | 4 | Ultimate(수동) | Active | Passive | Passive |
| Nakoruru | 4 | Ultimate(수동) | Active | Active | Active(HP 트리거형) |
| Numisu | 4 | Ultimate(수동) | Active | Active | Active |
| Hogan | **3** | Ultimate(수동) | Active | Passive | (없음) |

- **S1(Ultimate)만 항상 수동 발동**(자동 옵션 있음) — 나머지는 전부 AI가 쿨다운/조건 충족 시 자동 사용
- **"Active"와 "Passive"의 경계가 실제로는 흐리다** — Numisu·Nakoruru처럼 S4까지 전부 Active로 채우는 히어로가 있는가 하면(패시브 슬롯 자체가 없음), Belinda·Rowan처럼 S3·S4를 둘 다 Passive로 채우는 히어로도 있다. Peggy(§9)는 S1이 "패시브+액티브 하이브리드"로 분류돼 있어 **애초에 이분법이 아니라 그라데이션**에 가깝다
- Nakoruru의 S4(Kamui Mutsube)는 "Active"로 표기돼 있지만 실제로는 **HP 70%/40% 하락 시 자동 발동**하는 트리거형이라 기능적으로 패시브에 가깝다 — 라벨(Active/Passive)과 실제 발동 방식(수동/자동/트리거)이 어긋나는 사례
- **구형 히어로(Hogan)는 슬롯이 3개뿐** — Mythic 이전 초기 로스터 히어로는 S4(2번째 패시브)가 아예 없다. §2 의 레벨 마일스톤도 이 구형/신형 구분과 맞물린다

> **본작 대입점** — 본작은 액티브 3칸을 "출처"(영웅 고유·무기군·전직)로 고정하고 각 칸의 역할을 미리 정해뒀다(client CLAUDE.md 상 skill_design.md 구조). AFK Arena는 반대로 **칸 개수만 예산으로 고정하고 Active/Passive 배분은 히어로 개성에 맡긴다** — "슬롯의 역할을 미리 정한다"와 "슬롯 개수만 정하고 배분은 자유"라는 두 갈래 중 AFK Arena는 후자를 택한 사례로 기록할 만하다.

---

## 2. Ascension(승급) 등급별 스킬 해금 규칙

### 2-1. 등급 사슬과 레벨 상한

| 등급 | 레벨 상한 | 비고 |
|---|---|---|
| Common / Rare | 100 | 시작 등급(획득 경로에 따라 명칭 상이) |
| Elite | 100 | |
| Elite+ | 120 | |
| Legendary | 140 | |
| Legendary+ | 160 | |
| Mythic | 180 | |
| Mythic+ | 200 | **Signature Item(전용 무기) 해금** — §3 |
| Ascended | 240 | Resonating Crystal로 최대 455까지 확장(Ascended 보유 수 1명당 +5) [가이드] |

⚠ **"Supreme" 등급은 존재하지 않는다** — 00_overview.md §0 이 이미 경고했듯 Supreme/Paragon은 AFK Journey의 최고 등급이다. 이번 승급표 재확인([가이드] 2곳 교차: pocketgamer.com·theriagames.com)에서도 Supreme은 전혀 등장하지 않았다 — **최고 등급은 Ascended가 맞다.**

### 2-2. 레벨 마일스톤 — 스킬 자체가 승급된다(슬롯 추가 아님)

**핵심 구조**: 등급을 올린다고 스킬 슬롯이 늘어나지 않는다. 대신 **레벨이 특정 마일스톤을 지날 때마다 기존 스킬 하나의 수치·효과가 상향**된다(§1의 슬롯 표 자체는 고정, 각 칸의 "성능"만 오른다).

15개 히어로 실측 결과, **두 개의 서로 다른 마일스톤 스케줄**이 확인됐다 — 이는 00_overview.md 가 인용한 "11/21/41/61/81/101/121/141/161/181/201/221"(범용 검색 요약, 출처 불명확) 보다 정밀한 1차 데이터다.

| 스케줄 | 대상 | S1(Ultimate) | S2 | S3 | S4 |
|---|---|---|---|---|---|
| **표준형**(4슬롯 히어로 20종 중 18종에서 확인) | Belinda·Lucius·Rowan·Baden·Thane·Rosaline·Brutus·Lyca·Eironn·Cecilia·Athalia·Raine·Ezizh·Numisu·Peggy·Mehira·Shemira·Thoran | Lv.81, Lv.161 | Lv.21, Lv.101, Lv.181 | Lv.121, Lv.201 | Lv.141, Lv.221 |
| **구형**(3슬롯 히어로에서 확인, N/F=일반화 여부) | Hogan(3슬롯) · Silvina(일부 스킬만 이 패턴) | Lv.61, Lv.121 | Lv.21, Lv.81, Lv.141 | Lv.101(1회만) | (슬롯 없음) |

- 표준형 통합 마일스톤(중복 제거): **21 · 81 · 101 · 121 · 141 · 161 · 181 · 201 · 221** — 9개 지점. 각 스킬은 이 중 자기 슬롯에 배정된 2~3개만 겪는다
- **구형↔표준형을 가르는 기준은 N/F** — 슬롯 개수(3 vs 4)와 상관관계는 보이지만(Hogan=3슬롯=구형), 정확히 어느 출시 시점을 경계로 나뉘는지, 구형 히어로가 몇 종이나 남아있는지는 확인 못 함. Silvina는 4슬롯이면서도 S1·S2가 구형 스케줄(61/121, 21/81/141)을 따르는 예외라 "슬롯 수만으로 결정되는 것도 아니다"
- **"Hero Focus"(Legendary+에서 언락된다는 스탯/효과 부스트)** — 일반 웹검색 요약에는 등장하지만, `afk-arena.fandom.com` 사이트 내 검색으로는 해당 명칭의 페이지를 찾지 못했다. **[N/F, 신뢰도 낮음]** — 존재 자체를 부정하지는 않으나 정확한 명칭·수치는 확정 못 함

> **본작 대입점** — "성장이 스킬 슬롯을 늘리지 않고 기존 스킬의 배율만 올린다"는 이 처리는, 08-26 개정 이전 본작 구조와 다르다. 본작은 **액티브의 출처를 3개로 고정**하고 성장(마스터리)은 별도 트리로 분리했다(client CLAUDE.md skill_design.md). AFK Arena는 반대로 "성장축"과 "스킬종류축"을 합쳐서, 승급이 곧 스킬 자체를 강화하는 유일한 경로다 — 즉 **마스터리 트리에 해당하는 것이 아예 없고 레벨업 자체가 마스터리**다.

---

## 3. Signature Item(전용 무기) 언락과 스킬 강화의 관계

상세 표(4단 Emblem 재화·레벨 구간별 소모량)는 [02_items.md](02_items.md) §2-4 참조. 이 문서에서는 스킬 쪽 접점만 recap한다.

- **Mythic+ 등급 도달 시**(레벨 상한 200) Primordial Emblem 20개로 영웅 전용 Signature Item 슬롯이 열린다 [가이드]
- Signature Item은 **장비 슬롯이 아니라 스킬 확장 장치다** — 언락 즉시 해당 영웅에게 **신규 액티브 능력이 하나 추가**된다. 이건 §1의 S1~S4 4칸 예산 **밖에 있는 5번째 능력**이라는 뜻 — Ascension 승급이 "기존 칸의 배율만 올리는" §2 의 규칙과 달리, Signature Item은 **유일하게 새 능력 자체를 추가**하는 경로다
- 레벨 1~40(또는 그 이상)까지 4종 Emblem을 단계별로 소모하며 강화하고, **10레벨마다 그 신규 액티브 능력 자체가 추가로 강화**된다 [가이드] — 즉 Signature Item 안에서도 "레벨 마일스톤마다 능력이 승급된다"는 §2 의 패턴이 축소판으로 반복된다
- **정확한 신규 액티브의 개별 효과(영웅별)는 이번 조사에서 확보 못함** — afk.global 히어로 페이지는 Signature Item 효과를 별도 탭으로 분리해두고 있어(§0 확보 실패 슬러그 중 일부가 이 탭 크롤 실패로 추정), 이번 조사는 "Signature Item이 스킬을 추가한다"는 **구조적 사실**까지만 확인했고 개별 수치는 N/F

> **본작 대입점** — 02_items.md 가 이미 지적한 낙인(item_design.md) 대입점에 스킬 쪽 시사점을 하나 더한다: Signature Item은 "장비 강화"이면서 동시에 "액티브 스킬 슬롯 확장"이기도 하다 — 아이템과 스킬의 경계가 여기서 흐려진다. 본작이 액티브 출처 3개(고유·무기군·전직)를 스킬 쪽에만 두고 있다면, "장비 강화가 스킬 슬롯을 늘려준다"는 이 발상은 본작이 지금 안 쓰는 4번째 액티브 출처 후보로 기록할 만하다(채택 근거는 없음).

---

## 4. Furniture(가구)가 스킬에 주는 버프

상세(16세트×9피스, 획득 확률·천장)는 [02_items.md](02_items.md) §2-6 참조. 스킬 접점만 정리한다.

| 항목 | 내용 |
|---|---|
| 전제조건 | **Ascended 등급 히어로만** Oak Inn에 전용 방을 배정받을 수 있다 [가이드] — Furniture 투자 자체가 최상위 등급 히어로에게만 열리는 최종 콘텐츠 |
| 방 크기 | 소형(3피스) / 중형(6피스) / 대형(9피스), 종류당 최대치는 방 크기에 비례 |
| 3피스 달성 | 해당 히어로 전용 고유 능력 1단계 언락 [가이드] |
| 9피스 달성(세트 전부) | 같은 고유 능력의 **강화판**으로 승급 [가이드] |
| 재화 | Poe Coin(가구 1개당 300개), Workshop에서 크래프팅형 뽑기. Legendary 30개째·Mythic 90개째 확정 천장 [가이드] |

- **개별 히어로의 정확한 Furniture 고유 능력 효과(수치)는 확보 못함** — 검색 스니펫 수준에서 "존재한다"는 사실과 위 구조까지만 교차검증됐고, 예컨대 "Belinda의 9피스 능력이 정확히 무엇을 하는지"는 이번 조사에서 원문을 못 찾았다. **[N/F]**
- **§1~§3과의 관계** — Furniture는 §1의 S1~S4 4칸, §3의 Signature Item 5번째 칸과도 **별도의 6번째 능력 슬롯**이다. 즉 AFK Arena 최상위 히어로 1명이 가질 수 있는 "능력의 수"는 이론상 기본 4 + Signature 1 + Furniture 1(9피스 시 강화판으로 대체) = 최대 6개 층위로 쌓인다

> **본작 대입점** — 컨셉락 "오프라인 = 비전투 전부"와 톤이 가장 가까운 지점(00_overview.md §4-6 이미 지적)이 스킬 쪽에서도 재확인된다: **비전투 배치(가구 놓기)가 전투 스킬을 낳는다.** 다만 대상이 "영웅을 보낸다"가 아니라 "영웅의 방을 꾸민다"이고, Ascended 전제조건 때문에 **이미 최상위인 히어로를 더 강하게 만드는 장치**(신규 육성이 아니라 심화 투자)라는 점이 본작 파견처(신규 육성·다양성 확장 지향)와 결이 다르다.

---

## 5. 팩션(Faction)별 스킬 패턴 차이 — 결정론은 아니고 경향

§9 히어로 15종 샘플로 팩션별 경향을 관찰했다. **팩션은 스킬 종류(Class: Tank/Warrior/Ranger/Mage/Support)를 강제하지 않는다** — 한 팩션 안에 5개 Class가 전부 섞여 있을 수 있다(예: Lightbearer만 봐도 Tank(Lucius)·Warrior(Hogan)·Ranger(Thane, Cecilia)·Mage(Belinda)·Support(Rowan, Rosaline, Raine, Peggy) 전부 존재). 대신 **효과의 "질감"(생존기 메커니즘·테마)에서 경향이 보인다**:

| 팩션 | 샘플 히어로 | 관찰된 경향 |
|---|---|---|
| **Graveborn**(사령·불사) | Baden(팬텀 분신+생명흡수) · Silvina(에너지 강탈) · Shemira(생명흡수 다수) · Thoran(자가 부활+저주) | **생명흡수·부활·상대 자원(에너지) 강탈** 테마가 4/4 전원에서 확인 — 가장 뚜렷한 팩션 색 |
| **Mauler**(힘·야만) | Brutus(체력 낮을수록 강해짐) · Numisu(토템+공격형 힐) | 저체력 역치 발동형 버서커, 토템 등 **"몸으로 버티며 반격"** 계열 경향(샘플 2종으로 확정은 이름) |
| **Lightbearer**(빛·마법기술) | 7종 — 5개 Class 전부 존재 | **팀 유틸리티(힐·버프·디버프 마킹) 편중** — Class는 다양해도 "누군가를 돕거나 표식을 남기는" 스킬이 7종 중 6종에서 발견(Lucius 힐, Rowan/Rosaline/Raine/Peggy 버프·힐, Thane만 순수 딜러형이나 그마저 크리티컬 스택형 자기 강화) |
| **Hypogean**(어둠·악역) | Mehira(강제 조종+자해 소환) · Ezizh(정신조작+궁극기 봉인) · Leofric(저주+동상) | **적 행동 방해(조종·봉인·디버프)** 계열 경향 — 순수 딜링보다 상대를 "못 하게 막는" 스킬 비중이 높음 |
| **Wilder**(자연) | Lyca(버프+속도) | 샘플 1종뿐이라 결론 보류 |
| **Celestial**(천상) | Talene(불사조 부활+실드) | 샘플 1종뿐이라 결론 보류 |
| **Dimensional**(크로스오버 게스트) | Nakoruru(HP 역치 트리거형 궁극) | 원작 IP 이식 캐릭터라 **팩션 공통 테마가 없는 것이 오히려 특징** — 다른 게임 원작 스킷을 그대로 가져오는 자리 |

> **본작 대입점** — "소속(팩션)이 전투 역할(Class)을 결정하지 않고 스킬의 질감·테마만 물들인다"는 이 구조는, 본작이 죄종(7대 죄악)을 **직업과 독립된 축**으로 설계하려는 방향(item_design.md 접사 시스템, 죄종 마스터리)과 같은 결의 선례다. AFK Arena는 이걸 "팩션=미학, Class=기능"으로 명확히 분리해서, 같은 미학(예: Graveborn 생명흡수)을 어느 Class에나 붙일 수 있게 했다 — 죄종 테마를 직업에 종속시키지 않고 독립 레이어로 두는 설계가 실전에 있다는 근거.

---

## 6. 시너지 스킬(같은 팩션끼리 버프) — 있지만 "개별 스킬 텍스트"가 아니라 "시스템 층"에 있다

과제가 물은 "같은 팩션끼리 버프를 주는 스킬"은 **좁은 의미로는 확인되지 않았다.** 15개 히어로의 스킬 텍스트 어디에도 "같은 팩션 아군이 N명 이상이면 ~" 같은 **개별 스킬 조건문은 없었다.** 대신 팩션 시너지는 **히어로 스킬과 분리된 시스템 층**에서 작동한다(00_overview.md §5-6 이미 정리):

1. **파티 진영 조합 보너스**(§0 재확인) — 개별 스킬이 아니라 **파티 편성 자체**에 걸리는 시스템 버프. 3 Mauler + 2 Lightbearer → 전원 ATK+15%/HP+15% 식으로, 히어로 스킬창에는 나타나지 않고 파티 화면에만 표시된다
2. **Celestial/Hypogean은 와일드카드** — 어느 팩션 조합에 넣어도 그 팩션 인원수로 쳐준다는 별도 규칙까지 있다 [가이드] — 이것도 스킬이 아니라 시스템 판정
3. **Elder Tree**(00_overview.md §3-3) — 이게 사실상 AFK Arena의 "진짜 시너지"다. 다만 팩션이 아니라 **Class(직업) 단위**로 걸린다 — 같은 Class(예: Warrior)를 여러 명 보유할수록 그 Class 전원의 스탯이 트리 투자로 강해진다. "팩션 시너지"를 찾던 질문에 대한 답은 **"팩션 시너지는 시스템(파티 편성) 층에, Class 시너지는 Elder Tree 층에 각각 따로 있고, 개별 히어로 스킬 층에는 둘 다 없다"**로 정리된다

> **본작 대입점** — 개별 스킬 텍스트에 조건을 심지 않고 **편성 자체에 시스템 버프를 건다**는 이 분리는 00_overview.md 표 §5-#6 이 이미 짚은 대로 "세트 트리거를 장비가 아니라 편성에 거는" tactic_card_design.md 참고 사례와 같은 결을 스킬 쪽에서도 재확인해 준다. 스킬 하나하나에 "팩션 카운트를 세는" 조건문을 넣지 않아도 파티 시스템 층에서 처리할 수 있다는 실례.

---

## 7. 스킬 레벨업("Skill Up") 재료의 구조 — 별도 재화가 없다

이 절이 이번 조사에서 가장 명확하게 확인된 항목이다.

- **AFK Arena에는 스킬 전용 재화·스킬 포인트가 없다.** 히어로 레벨업에 드는 재화는 **Gold + Hero's Essence** 둘뿐이고[가이드], §2-2의 레벨 마일스톤(21/81/101/…)을 지나면 그 레벨업 자체가 자동으로 해당 슬롯의 스킬을 승급시킨다 — **"스킬에만 따로 투자한다"는 행위 자체가 존재하지 않는다**
- **플레이어의 선택권이 없다** — 어느 스킬을 먼저 올릴지, 어느 슬롯에 투자할지 고를 수 없다. 레벨이 오르면 정해진 슬롯이 정해진 순서로 오른다(§2-2 표가 그 스케줄)
- **따라서 "리스펙(재분배)" 개념 자체가 없다** — 검색 중 발견한 "Reset Scroll"[위키]은 스킬과 무관하게 **Mythic 등급 장비의 진영(Faction) 속성을 다시 굴리는 아이템**일 뿐, 히어로 스킬 재분배 기능이 아니다. 즉 AFK Arena는 "잘못 찍어서 되돌린다"는 문제 자체가 스킬 쪽에는 없다 — 되돌릴 "선택"을 애초에 안 시키기 때문
- Hero's Essence의 공급처는 캠페인 진행·AFK 보상 누적이 메인이며, **레벨 160+ 구간부터 병목**이 심해진다는 서술을 확인했다[가이드] — 즉 "스킬 성장의 병목"은 전용 재화 부족이 아니라 **범용 레벨업 재화(Hero's Essence)의 후반 고갈**로 나타난다

> **본작 대입점** — 이건 본작의 **스킬 롤백 무료 정책**(client CLAUDE.md skill_design.md §5)과 정반대 극단의 해법이다. 본작은 "잘못 찍어도 무료로 되돌릴 수 있게" 해서 실패 비용을 없앴다. AFK Arena는 그보다 한 단계 더 나아가 **애초에 찍는 행위 자체를 없앴다** — 선택이 없으면 후회도 없다. "선택권을 주고 되돌림을 무료화" vs "선택권 자체를 안 준다"는 두 갈래 해법이 실전에 공존한다는 근거로 기록할 만하다. 다만 후자는 본작이 지향하는 "빌드·편성 의사결정이 본체"(CLAUDE.md 개요)와 정면으로 배치되므로, 채택 근거로 쓰기보다는 **경계해야 할 반례**로 남긴다.

---

## 8. Class(5역할) vs Role(세부 태그) — 이중 분류 구조 실측 확인

00_overview.md §3-2 이 "Mythic 미만 영웅은 정식 Class가 없다"고 정리했던 항목을 이번 조사에서 **afk.global 데이터 필드 자체로 직접 확인**했다. 모든 히어로 페이지가 `Role` 필드와 `Class` 필드를 **별도로** 갖고 있고, 둘은 다른 층위다.

| 히어로 | Role(세부 태그) | Class(5대 역할) |
|---|---|---|
| Lucius | Heal | **Tank** |
| Thane | Assassin | **Ranger** |
| Cecilia | Assassin | **Ranger** |
| Silvina | Assassin | **Ranger** |
| Athalia | Assassin | **Ranger** |
| Baden | Continuous Damage | **Warrior** |
| Nakoruru | Burst Damage | **Ranger** |
| Ezizh | Continuous Damage Support | **Support** |
| Mehira | Control | **Mage** |
| Numisu | Heal | **Support** |

- **"Assassin"은 5대 Class에 속하지 않는다** — Role 태그로만 존재하고, 실제 Class는 전부 **Ranger**로 수렴한다(샘플 4/4 전원 일치). 과제 지시문이 예시로 든 "Tank/Warrior/Ranger/Mage/Support/Assassin 6분류"는 **부정확**했다 — 정식 5대 Class는 **Tank·Warrior·Ranger·Mage·Support**뿐이고 Assassin은 Ranger 밑의 하위 태그다. 이 정정은 §9 히어로 분류에도 반영했다
- Role 태그 종류는 히어로마다 자유형에 가깝다(Heal·Buff·Buff Support·Continuous Damage·Burst Damage·Control·AoE·Debuff 등 관찰됨) — 정해진 유한 목록인지 자유 텍스트인지는 **N/F**
- Elder Tree의 5갈래(Might/Fortitude/Celerity/Sorcery/Sustenance, 00_overview.md §3-3)는 **Role이 아니라 Class 5종에 정확히 대응**한다는 점도 이번 표로 재확인됨(Baden=Warrior→Might, Lucius=Tank→Fortitude 등)

---

## 9. 대표 히어로 스킬 전문 조사 — 15종

Class(5대 역할) 기준으로 분류. 각 항목은 `afk.global` 히어로 페이지([히어로DB], §0) 단일 출처 — 교차검증은 못 했으므로 **수치 오기 가능성을 배제 못함**, 다만 15종 전체가 같은 사이트의 동일 포맷이라 내부 일관성은 높다. 레벨 표기는 §2-2 마일스톤 표를 그대로 따른다("표준형" 9지점 vs "구형").

### 9-1. Tank — Lucius · Brutus · Thoran

**Lucius** (Lightbearer · Role: Heal)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Heaven's Protection | 공격력 500% 상당 피해감소 실드, 8초 | Lv81: 10초+지속회복 → Lv161: 550% |
| S2 Active | Divine Strike | 지면 강타, 넉백 + AoE 130% | Lv21: 150% → Lv101: 넉백당 -20%·8초 지속 → Lv181: 160% |
| S3 Active | Divine Blessing | 최저 체력 아군 공격력 200% 회복 + 방어 상승 5초 | Lv121: 체력 낮을수록 최대 75%↑ → Lv201: 220% |
| S4 Passive | Blessed Shield | 피해 65% 감소 5초, CC 면역, 궁극기 대기 중엔 정지 | Lv141: 피격 시 에너지 회복 200%↑ → Lv221: 75% 감소 |

**Brutus** (Mauler · Role: Tank)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Whirlwind | 2연타 후 회전베기, 정신조작 면역 | Lv81: 마법피해 면역 추가 → Lv161: 피해 35% 흡혈 전환 |
| S2 Active | Roar | 포효로 적 물리피해 취약화 +25% | Lv21: 30% → Lv101: 40%+회피불가 → Lv181: 50% |
| S3 Passive | Brutal Defiance | 체력 낮을수록 공격력 최대 90%↑ | Lv121: 헤이스트 최대25%↑ 추가 → Lv201: 공격력 100% |
| S4 Passive | Last Gasp | 치명타 피격 시 체력1 남기고 4초 무적(전투당1회) | Lv141: 7초 → Lv221: 8초 |

**Thoran** (Graveborn · Role: Tank)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Retaliation | 집중 후 전방 광역 140%, 집중 중 피해 200% 반사, CC면역 | Lv81/161: 가한 피해의 40% 흡혈 |
| S2 Active | Domination | 단일 대상 120% + 넘어뜨림 | Lv21: 140% → Lv101: 80% 흡혈 전환 → Lv181: 160% |
| S3 Active | Resurrection | 사망 시 체력60%로 1회 부활(전투당1회) | Lv121: 부활 시 주변 3초 스턴 → Lv201: 75% 부활 |
| S4 Passive | Taint | 전투 시작 시 최저체력 적 100%+저주 | Lv141: 저주 15초→25초 → Lv221: 흡혈 70%→75% |

### 9-2. Warrior — Hogan · Baden

**Hogan** (Lightbearer · Role: Tank, **3슬롯 구형 히어로**)
| 슬롯 | 이름 | 효과 | 스케일링(구형 스케줄) |
|---|---|---|---|
| S1 Ultimate | Knight's Fury | 물리피해+기절 200% | Lv61: 260% → Lv121: 320% |
| S2 Active | Zealous Strike | 넉백+CC 150% | Lv21: 180% → Lv81: 200%+스턴 → Lv141: 240% |
| S3 Passive | Unwavering Will | 전투 중 최대체력 +10% | Lv101: 체력재생 10% 추가 |

**Baden** (Graveborn · Role: Continuous Damage)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Phantom Assassin | 본체 능력치 90%·피해 150% 감수 팬텀 소환(영구) | Lv81: 팬텀 1기 추가 → Lv161: 피해감수 130% |
| S2 Active | Phantom Strike | 적 후방에 팬텀 소환, 6초, 180% | Lv21: 190% → Lv101: 190%(중복표기,N/F) → Lv181: 능력치 0.8배 |
| S3 Active | Spectral Onslaught | 3단 공격 135%×3 | Lv121: 피해 시 적 받는피해+10%(최대5스택) → Lv201: 150% |
| S4 Passive | Spectral Surge | 팬텀 1기당 공격력+3%, 피해경감20% | Lv141: 4% → Lv221: 5% |

### 9-3. Ranger — Thane · Silvina · Cecilia · Athalia · Lyca · Eironn · Nakoruru

**Thane** (Lightbearer · Role: Assassin)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Eviscerate | 무작위 7연타 80%, 시전중 무적 | Lv81: 치명타마다 타격+1(최대8) → Lv161: 9연타 |
| S2 Active | Lunge | 돌진 120%+크리티컬율+20%(5초) | Lv21: 피해감소막 70% 추가 → Lv101: 130% → Lv181: 140% |
| S3 Active | Execution | 치명타4회 누적 시 발동, 최종타 80%+대상최대체력15% | Lv121: 90% → Lv201: 최대체력 18% |
| S4 Passive | Focus | 크리티컬율+14% | Lv141: 치명타마다 체력6%+에너지25 회복 → Lv221: 크리티컬율17% |

**Silvina** (Graveborn · Role: Assassin, **부분 구형 스케줄**)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Fatal Strike | 최고에너지 적 뒤로 도약, 110%+에너지 절반삭감 | Lv61: 적 에너지1%당 피해+1.2% → Lv121: +2.4% |
| S2 Active | Abyssal Shield | 공격력 200% 상당 실드 | Lv21: 220% → Lv81: 실드중 헤이스트 획득 → Lv141: 240% |
| S3 Active | First Blood | 전투 시작 시 최저방어 마법사 200%(없으면 최저방어 대상) | Lv101: 3초 스턴 추가 |

**Cecilia** (Lightbearer · Role: Assassin) — ⚠ "Cecia"(AFK Journey)와 혼동 주의, §0
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Judgement Day | 죄의 표식 최다 보유 적에게 300%+표식1개, 3표식이상 스턴·5표식 추가300% | Lv81: 330% → Lv161: 360% |
| S2 Active | Blade of Purification | 3단 90%×3, 사용마다 표식+1(최대5, 표식당+10%) | Lv21: 치명타 시 쿨감 무시 → Lv101: 105% → Lv181: 120% |
| S3 Active | Atonement | 전투 시작 시 적 후방 반전위치서 3단115%+표식3개 | Lv121: 아군 처치한 적 표식5개 → Lv201: 130% |
| S4 Active/Passive | Devil Trap | 적 공격력-60% 원 생성, 최초 탈출시도 320% | Lv141: 340% → Lv221: 360% |

**Athalia** (Celestial · Role: Assassin)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Divine Fury | 3연속 참격(경로상 전원) 160%×3, 3번째 확정치명타 | Lv81: 다단히트 대상 +50% → Lv161: 190% |
| S2 Active | Judgement | 지정 적 강습 280%+에너지회복 차단 | Lv21: 290% → Lv101: 차단5초 → Lv181: 310% |
| S3 Active | Purging Frenzy | 최근접 적 다단타, 최종타 150%+2초스턴 | Lv121: 3초 스턴 → Lv201: 170% |
| S4 Passive | Protection | 생존 아군 전원 피해감소8% | Lv141: 공격력+3% → Lv221: 공격력+4% |

**Lyca** (Wilder · Role: Buff)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Star Shot | 관통 화살, 전체 적 220%+넉백 | Lv81/161: 240% |
| S2 Active | Rapid Arrows | 3연사 120%×3 | Lv21: 130% → Lv101: 135%+흡혈 → Lv181: 145% |
| S3 Active | Awe | 전투시작 시 아군 헤이스트+35(8초) | Lv121: 아군 에너지70 회복 → Lv201: 에너지100 |
| S4 Passive | Foe's Fragility | 피격 적 5초간 방어-15%+피격시 치명타율+12%(중첩불가) | Lv141: 방어-20% → Lv221: 방어-25% |

**Eironn** (Wilder · Role: AoE damage dealer)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Elemental Surge | 쌍검합체 270% 단일 + 얼음 토네이도 AoE·넉백·둔화(5초) | Lv81: 토네이도 7초 → Lv161: 300% |
| S2 Active | Twin Force | 얼음검(AoE150%+4초둔화) + 바람검(단일180%+현재체력15%, 넉백) | Lv21: 160% → Lv101: 220% → Lv181: 170% |
| S3 Active | Vortex | 주변 적 전원 끌어당김 140% | Lv121: 150% → Lv201: 160% |
| S4 Passive | Sylvan Oath | 공격력+15%, 30%확률 방어무시 | Lv141: 방어무시50% → Lv221: 공격력20% |

**Nakoruru** (Dimensional · Role: Burst Damage)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Running Chest Jab | 단일 적 다운+실드 제거 460% | Lv81: 490% → Lv161: 520% |
| S2 Active | Kamui Rimuse | 근접 최대3적, 190%×히트, 행동방해, 흡혈40% | Lv21: 200% → Lv181: 210% |
| S3 Active | Shichikapu Etu | 후열 시전 적 방해 220%+2초스턴, 쿨6초 | Lv121: 쿨5초 → Lv201: 쿨4초 |
| S4 Active(HP트리거) | Kamui Mutsube | 체력70%/40% 하락 시(전투당2회) 최약적 280%, 비행중무적+체력400%회복 | Lv141: 300% → Lv221: 320% |

### 9-4. Mage — Belinda · Mehira · Shemira

**Belinda** (Lightbearer · Role: AoE damage dealer)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Divine Light | 광역 4연타, 타격당 공격력110% | Lv81: 연타피해 상승 → Lv161: 5연타로 확장 |
| S2 Active | Divine Retribution | 신성구슬 명중폭발 AoE 160% | Lv21: 180% → Lv101: 적 명중률감소 → Lv181: 210% |
| S3 Passive | Brilliance | 크리티컬율+12% | Lv121: 치명타 스택(최대8, 스택당+3%) → Lv201: 18% |
| S4 Passive | Blessing | 최고공격력 아군 공격력+15%·크리티컬율+15% | Lv141: 대상 2명으로 확장 → Lv221: 각 20% |

**Mehira** (Hypogean · Role: Control)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Mesmerize | 전방 적 전원 매혹, 서로 일반공격(4초) | Lv81: 피격 시 에너지 회복 차단 → Lv161: 5초 |
| S2 Active | Whiplash | 전방 전체(아군포함) AoE 120%, 피격아군 에너지65+헤이스트40%(8초) | Lv21: 125% → Lv101: 가한피해50% 흡혈전환 → Lv181: 130% |
| S3 Active | Infatuation | 단일 60%, 해당 대상으로부터 받는 피해-40%(10초), 체력3%흡수 | Lv121: 12초 → Lv201: 80% |
| S4 Passive | Hellspawn | 전투시작 시 현재체력60% 소모해 미니언3기 소환(65%가해, 30%흡혈전환), 치명적피해 시 미니언1기 희생해 25%회복 | Lv141: 미니언피해 70% → Lv221: 75% |

**Shemira** (Graveborn · Role: AoE)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Tortured Souls | 주변 지속피해(12초), 가한피해50% 흡혈전환 | Lv81: 피해+80%·흡혈100% → Lv161: 피해+90%·타격당25%회복 |
| S2 Active | Soul Siphon | 대상 지속흡혈, 0.5초당 45% | Lv21: 50% → Lv101: 최대55%(시간비례) → Lv181: 60% |
| S3 Active | Silence | 마법계열 적 100%+시전봉인 | Lv121: 130%+봉인시간 체력비례 → Lv201: 150% |
| S4 Passive | Wrath | 체력 많을수록 피해 최대30%↑ | Lv141: 체력비례 크리티컬율 최대30% → Lv221: 피해 최대40% |

### 9-5. Support — Rowan · Rosaline · Raine · Peggy · Numisu · Talene · Ezizh · Leofric

**Rowan** (Lightbearer · Role: Buff Support)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Dazzle | 무작위3대상에 금화투척(0.5초마다), 아군 획득 시 에너지+공격력↑, 적은 스턴 | 기본: 에너지회복50·공격력+30%(8초)·스턴4초 → Lv81: 에너지60 → Lv161: 에너지70 |
| S2 Active | Avian Assault | 최근접 적 다단타, 명중률감소+에너지탈취 | 기본:피해60%·명중-120(10초)·탈취80 → Lv21: 70% → Lv101: 탈취120 → Lv181: 80% |
| S3 Passive | Healthy Supplies | 아군 체력50%이하 시 물약(영웅당쿨5초) 최대체력30%회복 | Lv121: 재고보충 메커니즘 추가 → Lv201: 40% |
| S4 Passive | Damage Control | 최대체력10%초과 피해를 에너지손실로 전환(쿨3초, 최대80) | Lv141: 초당20에너지 회복 추가 → Lv221: 상한50 |

**Rosaline** (Lightbearer · Role: Buff Support)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Motivation | 지정아군 추종+피해감소40%, 궁극기로 대상 에너지 완전회복(자신 최소200소모) | Lv81: 대상 공격력+40%(4초) → Lv161: +60% |
| S2 Active | Crazy Crockery | 식기 투척(개당120%+스턴), 추종대상과 동일타겟 우선 | Lv21: 3개투척 → Lv101: 포크추가(현재체력20%) → Lv181: 접시추가(받는피해+40%,4초) |
| S3 Active | Afternoon Tea | 추종아군 공격력150% 회복 | Lv121: 성공마다 효과+25%(최대150%) → Lv201: 170% |
| S4 Passive | Spring Cleaning | 4초간 피격불가+빗자루로 접근적 80%, 후열아군 넉백 | Lv141: 100% → Lv221: 120% |

**Raine** (Lightbearer · Role: Buff)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Cripple | 현상금 표식(8초, 받는피해+15%), 처치자 에너지80/초(10초) | Lv81: 12초·+20%·크리티컬율100%(10초) → Lv161: 16초 |
| S2 Active | Barrage | 최저체력65%×5히트 + 최고공격력10%×5히트(헤이스트-40, 1초) | Lv21: 최저체력측 최종타+15%잃은체력(최대360%) → Lv101: 최고공격측 1초스턴 → Lv181: 70% |
| S3 Active | Lock On | 최저체력 적 10초 마킹, 마킹공격시 아군 공격속도+20·크리티컬율+20%(3초) | Lv121: 5초당1회 아군힐(공격력40%) → Lv201: 속도30·크리티컬율30% |
| S4 Passive | Exploit | 적 체력결손비례 보너스피해 최대30% | Lv141: 아군피해+15% → Lv221: +30% |

**Peggy** (Lightbearer · Role: Heal)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 하이브리드 | Duty Bound | 능력치80% 경호원2기 상시 소환(사망시퇴장), 궁극기로 경호원 헤이스트+45·방어+100%(12초), 경호원 없으면 신규소환+넉백스턴 | Lv81: 경호원능력치100% → Lv161: 120% |
| S2 Active | Royal Scroll | 경호원+아군1명 공격력220% 회복 | Lv21: 250% → Lv101: 280% → Lv181: 2명으로 확장 |
| S3 Active | Royal Guards | 경호원체력20%만큼 실드(8초) | Lv121: 경호원공격180%+실드타격2.5초스턴230% → Lv201: 230%/280% |
| S4 Active | Royal Marksmen | 궁수5기 소환, 각 70%+명중-10·헤이스트-10(7초) | Lv141: 피해+80% → Lv221: +90% |

**Numisu** (Mauler · Role: Heal)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Voodoo Blessing | 전열우선 아군2명 공격력400% 회복, 회복대상 주변적 AoE260% | Lv81: 440% → Lv161: 480% |
| S2 Active | Rejuvenating Totem | 최저체력 아군 옆 토템 배치, 초기힐100%+지속초당체력3% | Lv21: 110% → Lv101: 120% → Lv181: 130% |
| S3 Active | Offensive Totem | 적 후방 도발토템, AoE120%+2초간 일반공격강제 | Lv121: 초당체력10%자힐 → Lv201: 150% |
| S4 Active | Fanaticism | 최고공격력 아군 헤이스트+40·공격속도+20%(10초) | Lv141: 헤이스트50·속도30% → Lv221: 12초 |

**Talene** (Celestial · Role: Buffer)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 Ultimate | Fire Born | 불사조 형태(죽을때까지), 현재체력90%+최대체력20% 실드, 근접AoE150% | Lv81: 실드잔량20% 추가피해 → Lv161: 최대체력25% 실드 |
| S2 Active | Meteor Shower | 단일200%, 불사조형태 중엔 0.5초마다 무작위낙하 | Lv21: 240% → Lv101: 피해30% 흡혈전환 → Lv181: 280% |
| S3 Passive | Phoenix Rising | 사망 시 화염구로 변신 초당최대체력7%회복(피격불가, 버프수령가능), 체력50%로 부활+200%AoE폭발 | Lv121: 250% → Lv201: 300% |
| S4 Passive | Afterglow | 최약아군2명 체력10%손실마다 공격력150% 회복 | Lv141: 200% → Lv221: 250% |

**Ezizh** (Hypogean · Role: Continuous Damage Support)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 | Fissure | 주변폭발180%+5초 화상지대 | Lv81: 화상지대 적 공격력-40% → Lv161: 220% |
| S2 | Feeble Mind | 최원거리 적 조종+접근강제210%+공중띄움 | Lv21: 220% → Lv101: 공격력-30%(5초) → Lv181: 230% |
| S3 | Horrify | 충격파 전체160%+궁극기 3초 봉인 | Lv121: 아군 궁극기 사용시마다 2초 추가봉인 → Lv201: 180% |
| S4 Passive | Mental Fury | 아군 3초마다 에너지40 회복 | Lv141: 사후에도 효과지속(30%감소) → Lv221: 에너지50 |

**Leofric** (Hypogean · Role: Debuff)
| 슬롯 | 이름 | 효과 | 스케일링 |
|---|---|---|---|
| S1 | Shadow Mastiff | 최고공격력 적 8초 도발 석상(체력=공격력1150%), 조기파괴시 공격자 영구공격력-18%, 생존시 만료시290%피해 | Lv81: -22%·320% → Lv161: -25%·350% |
| S2 | Hell Wyrms | 주변 250%+에너지-90·회복-50%(4초, 비중첩) | Lv21: 300% → Lv101: 350% → Lv181: 회복-70%·5초 |
| S3 | Unmasked Horror | 정면 적 3초 공포+공격력-20%(6초, 비중첩) | Lv121: -30% → Lv201: -40% |
| S4 | Perfect Disguise | 자신+최중상아군 5초 무적, 부상아군 가한피해50% 흡혈전환 | Lv141: 70% → Lv221: 90% |

---

## 10. 본작 대입점 종합

| # | AFK Arena의 처리 | 본작 접점 | 시사점 |
|---|---|---|---|
| 1 | S1~S4 4칸 예산 안에서 Active/Passive 배분이 히어로마다 자유(§1) | skill_design.md 액티브 3칸 고정 출처 | "칸 개수만 정하고 배분은 자유"라는 대안 설계가 있다는 근거 — 채택 여부는 별개 |
| 2 | 승급이 스킬 슬롯을 늘리지 않고 기존 스킬 배율만 올린다(§2) | 08-26 개정 이전 구조 대비 | 성장축과 스킬종류축을 합치는 쪽 설계 사례 |
| 3 | Signature Item이 장비이면서 동시에 5번째 액티브 슬롯을 추가한다(§3) | 액티브 출처 3개 고정 | "장비 강화가 스킬 슬롯을 늘려준다"는 4번째 출처 후보(채택 근거 없음) |
| 4 | Furniture(비전투 배치)가 스킬을 낳지만 Ascended 전제조건이 있어 신규육성이 아니라 상위 히어로 심화투자다(§4) | 컨셉락 "오프라인=비전투 전부" | 톤은 가깝지만 목적(심화 vs 신규육성)이 다르다는 정정 |
| 5 | 팩션은 Class를 결정하지 않고 스킬 "질감"만 물들인다(§5) | item_design.md 죄종 접사, 죄종 마스터리 | 소속을 기능과 독립된 미학 레이어로 두는 선례 |
| 6 | 팩션 시너지는 개별 스킬이 아니라 파티 편성 시스템 층에, Class 시너지는 Elder Tree 층에 각각 분리(§6) | tactic_card_design.md 편성조건 카드 | 조건을 스킬 텍스트가 아니라 시스템/카드 층에 두는 게 가능하다는 근거 |
| 7 | 스킬 전용 재화·포인트·리스펙이 전혀 없다 — 레벨업이 곧 스킬업(§7) | skill_design.md §5 무료 롤백 정책 | "선택권을 주고 되돌림을 무료화" vs "선택권 자체를 안 준다"의 반례 — 본작 방향과 배치되므로 경계 대상으로 기록 |
| 8 | Class(5) / Role(세부태그)이 분리된 이중 메타데이터, "Assassin"은 Class가 아니라 Ranger의 Role(§8) | 과제 지시문의 "6역할" 가정 | 가정을 실측으로 정정한 사례 — 정식 Class는 5종뿐 |

---

## 11. 출처 · 미확인(N/F) 총괄

### 주요 출처
- **[히어로DB]** `https://www.afk.global/afk-arena/characters/<lucius|belinda|rowan|baden|thane|rosaline|brutus|lyca|silvina|athalia|talene|numisu|ezizh|raine|mehira|shemira|thoran|leofric>` · `https://www.afk.global/cecilia` · `https://www.afk.global/hogan`(경로 형태 상이) — 15개 히어로 스킬 전문·레벨스케일링의 1차 근거
- **[가이드]** `https://www.pocketgamer.com/afk-arena/afk-arena-ascension-guide/` — 승급 등급명 재확인
- **[가이드]** `https://theriagames.com/guide/afk-arena-temple-of-ascension-guide/` — 등급별 레벨 상한표
- **[가이드]** `https://theriagames.com/guide/afk-arena-the-oak-inn-guide/` — Furniture 3/9피스 구조, Poe Coin·천장
- **[위키 검색스니펫]** Factions(afk-arena.fandom.com) — 파티 진영 조합 보너스, Celestial/Hypogean 와일드카드 규칙
- **[커뮤니티]** Reset Scroll(afk-arena.fandom.com) — Mythic 장비 진영 재추첨 용도(스킬 리스펙 아님) 확인

### N/F(미확인) 총괄
- **"Hero Focus"(Legendary+ 언락 추정)의 정확한 명칭·수치** — 일반 웹검색 요약에만 등장, 사이트 내 검색으로 원문 미확인. 존재 자체를 부정하진 않으나 신뢰도 낮음
- **구형/표준형 레벨 마일스톤 스케줄을 가르는 정확한 기준**(출시 시점? 슬롯 수? Silvina처럼 4슬롯이면서 구형 스케줄인 예외가 있어 슬롯 수만으로는 설명 안 됨)
- **Signature Item이 추가하는 신규 액티브의 개별 효과(영웅별 수치)** — 구조(5번째 슬롯 추가, 10레벨마다 강화)까지만 확인, 개별 텍스트는 미확보
- **Furniture 3/9피스 고유 능력의 개별 히어로별 정확한 효과** — "존재한다"·"2단계로 강화된다"는 구조까지만 확인, 예컨대 Belinda·Rowan의 실제 효과 텍스트는 미확보
- **Role 태그가 고정된 유한 목록인지 자유 텍스트인지** — 관찰된 태그(Heal/Buff/Buff Support/Continuous Damage/Burst Damage/Control/AoE/Debuff/Assassin 등)가 전부인지 더 있는지 확인 못함
- Nakoruru의 S2(Kamui Rimuse) 마일스톤에서 Lv101 단계가 다른 히어로처럼 명시됐는지 여부(스케일링 서술에서 21→181로 건너뜀, 누락인지 실제로 없는지 불명확)

### 오염 방어 기록
§0 에 상술한 **Cecia(AFK Journey) ↔ Cecilia(AFK Arena)** 혼동을 이번 조사에서 실제로 겪고 정정했다. 00_overview.md 의 조사 원칙("위키 도메인까지 확인")에 더해, **히어로 개별 이름의 철자 유사 오염**도 같은 위험군으로 이번 조사록에 추가한다 — 게임 이름뿐 아니라 캐릭터 이름 단위에서도 후속작과의 혼입이 일어날 수 있다.

---

*마지막 업데이트: 2026-08-28 (최초 작성 — 00_overview.md 게임별 3분리 재정리에 따른 스킬 심화 문서)*
