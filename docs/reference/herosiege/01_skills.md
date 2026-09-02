# Hero Siege — 스킬 구조 전수 조사

> 상위 문서: [00_overview.md](00_overview.md)
> 짝 문서: [02_items.md](02_items.md)
> 상태: **부분조사** (2026-09-03) — 24클래스의 전문화 갈래·레벨 게이트는 전수 확보했으나, **스킬별 레벨당 수치**는 공식 위키가 툴팁을 노출하지 않아 미확보(§11-2)
> 목적: 본작(TheSevenSimulationRPG — 7대 죄악 테마 방치형 파밍 RPG, 참고작 1순위 Lootun·아이템 철학 Diablo 2)의 "액티브 3칸 + 마스터리 2탭(직업/죄종) + 전직 3갈래 택1" 구조와 대조할 D2 계보 ARPG 사례 확보. Hero Siege 는 **클래스마다 정확히 2갈래 전문화 트리**를 갖는 24클래스 게임이라, "전직 갈래 수"·"클래스당 스킬 총량"의 규모 대조군이 된다
> ⚠ **이 문서의 수치는 전부 Hero Siege 의 수치다.** 본작 SSOT가 아니며 `src/data/*.csv`로 옮기지 말 것

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 — 대상 확정("Hero Siege 2"는 존재하지 않는다) · 오염 배제 기록 |
| 1 | 게임 구조 한 장 — 스탯 5종 · 게임모드 3종 · 성장 축 5층 |
| 2 | 클래스 24종 전체 명단 — 전문화 갈래 · 무기군 · 수급 경로 |
| 3 | 클래스 스킬 트리 — 공통 템플릿과 리스펙 |
| 4 | 대표 클래스 8종 스킬 전수 |
| 5 | 유료 DLC 클래스 미리보기 — Bard · Prophet |
| 6 | 서브스킬(증강/Specialization Points) — 액티브를 바꾸는 층 |
| 7 | 스킬 외 성장 축 — Incarnation Tree · Ether Tree |
| 8 | 아이템이 스킬을 바꾸는 접점 — Relics · Runes/Runewords · Sets |
| 9 | pre-2.0(2014~2023 구버전) — 확인된 것과 안 된 것 |
| 10 | 본작 시사점 |
| 11 | 출처 · 미확인(N/F) 총괄 |

---

## 0. 조사 방법과 신뢰도

### 0-1. 출처 표기 약어와 신뢰도

| 표기 | 소스 | 신뢰도 | 비고 |
|---|---|---|---|
| **[공식위키]** | `herosiege.wiki.gg` — 개발사(Panic Art Studios)가 인정한 현행 공식 위키(과거 Fandom 위키에서 이전됨) | ★★★ | WebFetch로 직접 크롤 가능(간헐적 404 있음 — 페이지가 없거나 이름이 다름). 이 문서의 클래스·스킬명·레벨 요구치·선행조건의 1차 출처 |
| **[상점]** | `store.steampowered.com` 상점/DLC 페이지 | ★★★ | 클래스 DLC 존재 여부·가격의 1차 확인 |
| **[빌드DB]** | `metaroad.gg` — 스킬 데이터베이스·빌드 플래너 사이트 | ★★☆ | §0-3에서 Viking 데이터를 [공식위키]와 대조해 스킬명·트리명·개수가 **완전히 일치**함을 확인한 후 채택. 액티브/패시브 태그·피해타입·효과 서술문의 주 출처(공식위키는 WebFetch 상 툴팁 수치를 노출하지 않았다) |
| **[가이드]** | `u4n.com`, `vortexgaming.io`, `tposegaming.com`, `mobalytics.gg`, `note.com`(aida8), `afleurdenet.com`, `iggm.com`, `ezg.com` 등 시즌 공략류 사이트 | ★★☆ | 서로 다른 사이트가 같은 수치(노드 수·시즌명·해금 레벨)를 독립적으로 반복해 교차 확인된 경우만 채택 |
| **[커뮤니티]** | Steam Community 토론 | ★★ | 리스펙 방식·레벨 상한 등 정성적 확인용 |
| **[3자위키-교차검증]** | `herosiegewiki.com`, `hero-siege.wiki`(공식 wiki.gg 와 다른 제3자 도메인) | ★★☆ | §0-3에서 클래스 명단·총수만 [공식위키]·[상점]과 대조해 통과시켰다. 스킬 상세는 이 출처만으로 인용하지 않았다 |
| **N/F** | 확인 못 함 | — | 추측하지 않고 표기만 남긴다 |

### 0-2. 대상 확정 — "Hero Siege 2"라는 별도 후속작은 존재하지 않는다

이 조사는 원래 "Hero Siege(2014, 확장판 다수) vs Hero Siege 2(후속작, 얼리액세스)"라는 전제로 시작했으나, **조사 결과 이 전제 자체가 틀렸다.**

- Steam 앱은 **`269210` 하나뿐**이다. "Hero Siege 2"라는 별도 App ID·별도 상점 페이지는 존재하지 않는다[상점].
- 대신 **"Hero Siege 2.0"**이 있다 — 이는 **2023-10-02에 나온, 같은 게임(App 269210)의 무료 대규모 리워크 패치**다[커뮤니티][가이드]. 아이템·스탯·클래스가 전면 재제작됐고, **기존 캐릭터 세이브가 전량 와이프**됐다. 게임 루프 자체가 "웨이브 기반 아레나 로그라이트"에서 "좀 더 전통적인(디아블로형) 액트·존 구조"로 바뀌었다[커뮤니티].
- 그럼에도 커뮤니티·공략 유튜버들이 **2.0 이후 상태를 관용적으로 "Hero Siege 2"라 부르는 관행**이 실제로 확인된다 — 예: "Hero Siege 2: How to Augment Gear!", "All Weapon Augments Guide - Hero Siege 2: Season 4" 등 유튜브 영상 제목[검색]. 이 조사가 원래 전제한 "별도 후속작"은 아마 이 구어적 명명을 원 정보가 오인한 결과로 추정된다.
- **2026-09-03 조사 시점 기준**: 라이브서비스 진행 중, **패치 7.0.8**(2026-02-09)[공식 사이트 `playherosiege.com`], **시즌 10 "Ebontharn"**(2026-08-21 시작)[가이드]. 시즌 9(2026-04-03)에서 과거 유료 DLC였던 6개 클래스(사무라이·팔라딘·아마존·데몬슬레이어·데몬스폰·샤먼)가 무료로 전환됐다[가이드](§2).

**이 문서의 분단선은 "HS1 vs HS2"가 아니라 「pre-2.0(2014-10-02 출시 ~ 2023-10-02 이전, 구버전)」 vs 「post-2.0(2023-10-02 ~ 현재, 라이브서비스)」다.** 본문(§1~§8)은 **post-2.0 현행(패치 7.x)** 기준으로 쓰고, pre-2.0은 §9에 별도로 몰아 확인된 것만 남긴다. 이 문서에 인용한 [공식위키]·[빌드DB] 데이터는 전부 오늘(2026-09-03) 시점에 직접 열람한 현행 페이지이므로 2023-10 이전 빌드 가이드와 섞이지 않았다 — 다만 검색 스니펫으로만 확보한 [가이드] 인용 중 발행일이 불명확한 것은 개별적으로 주의를 표기했다.

### 0-3. 오염 배제 기록

| 후보 사이트 | 판정 | 근거 |
|---|---|---|
| `herosiege.fandom.com` | **사용 안 함** — WebFetch 시도 시 매번 HTTP 402(결제 필요) 반환, 직접 크롤 불가. 검색 스니펫으로 얻은 정보(예: DLC 연혁 일부)는 [가이드]급으로 하향 인용 | Dragon Cliff 조사와 동일한 패턴(HTTP 402 차단) |
| `herosiegewiki.com` | **부분 채택** — Viking 항목에 스킬 트리 상세가 없어 스킬 출처로는 쓰지 않았으나, 이 사이트가 제시한 클래스 명단(24종, 이름 전부)이 [공식위키]·[상점]과 **완전히 일치**해 클래스 총수 근거로만 채택 | §2 확인용 교차조회 |
| `hero-siege.wiki`(wiki.gg 아님, 별도 도메인) | **부분 채택** — "24 official roster" 주장이 [상점]의 "24 character slots" 표시와 독립적으로 일치해 총수 근거로만 채택. 개별 스킬 페이지는 열람하지 않았다 | 총수 교차검증만 |
| `metaroad.gg` | **채택** — Viking 스킬명·트리명·개수를 [공식위키]와 대조해 **불일치 0건** 확인 후, 효과 텍스트·액티브/패시브 태그의 보조 출처로 사용 | §4 전역에서 사용, 단 아래 유보 사항 있음 |
| `mejoress.com` | **극도로 제한적 채택** — "Necromancer 초보 추천, Lord of the Dead 트리로 소환 위주 플레이" 서술은 실제 트리명(Lord of the Dead)과 일치해 완전 허구는 아니었다. 다만 "스킬 헤이스트·범위 노드를 우선하라"는 문장은 다른 ARPG에도 통용되는 정형화된 조언으로 보여, **구체적 수치·스킬명이 아닌 일반론은 인용하지 않았다** | 게임 명칭만 맞고 내용이 허구인 mejoress.com류 오염 패턴을 경계했으나, 이번 조사에서는 완전 허구 사례를 잡아내지 못했다 — 검색 예산 안에서 발견된 mejoress 게시물 1건은 부분적으로 진짜였다는 뜻이며, 다른 게시물까지 전수 검증하지는 못했다(N/F) |
| `hero-siege-helper.vercel.app`("HS Helper") | **미채택** — 실제 스킬트리·증강 데이터를 담은 인터랙티브 툴로 보이나, WebFetch가 UI 골격(버튼·네비게이션)만 반환하고 본문 데이터를 추출하지 못했다. 허구 오염은 아니고 단순 기술적 한계 | §7 Incarnation Tree 확인 시도 |

**유보 사항 — [빌드DB](metaroad.gg)의 액티브/패시브 태그 정확도**: Necromancer "Raise Skeleton"·"Summon Vengeful Spirit" 등 효과 텍스트가 명백히 1회성 소환·시전(액티브 성격)인데도 metaroad.gg가 **passive**로 태깅한 사례가 다수 관찰됐다. [공식위키]가 레벨 목록만 주고 액티브/패시브 구분을 명확히 노출하지 않아 교차검증이 어려웠다 — 이 문서의 액티브/패시브 표기는 metaroad.gg 원문을 그대로 따르되, 이 불일치 가능성을 여기 기록해 둔다.

---

## 1. 게임 구조 한 장 — 스탯 5종 · 게임모드 3종 · 성장 축 5층

### 1-1. 스탯 5종 [공식위키]

| 스탯 | 포인트당 효과 |
|---|---|
| **Strength** | 공격력 +1%, 추가(가산) 물리 피해 +1 |
| **Dexterity** | 공격 등급(Attack Rating, 명중 관련) +8, 치명타 피해 +0.125% |
| **Intelligence** | 마법 스킬 피해 +1% |
| **Vitality** | 생명력 +6.5(생명력 재생에도 비례 반영) |
| **Energy** | 마나 +4 |

- 참고: **Armor**(방어구 스탯, 캐릭터 스탯과 별도) 1당 방어도 +5, 물리 피해 감소 +0.25%(25% 이후 체감 감소)[가이드]
- 클래스별 고정 주스탯은 없다 — 자유 배분제다. Getting Started 가이드가 권장하는 배분: **캐스터형** 지능40% : 생명력40% : 에너지20%, **물리형** 힘35% : 민첩10% : 생명력50% : 에너지5%[공식위키]

### 1-2. 게임모드 3종 [공식위키]

| 모드 | 규칙 |
|---|---|
| **Seasonal** | 시즌 캐릭터는 처음부터 새로 시작하며, 멀티플레이는 같은 시즌 캐릭터끼리만 가능 |
| **Hardcore** | 한 번 죽으면 그대로 죽은 채로 남는다(영구 사망) |
| **Odyssey** | 솔로 플레이 전용 — 마켓·거래·우편함 기능이 전부 비활성화 |

### 1-3. 성장 축 5층 — 이 문서의 뼈대

```
① 클래스 스킬 트리(2갈래, 레벨 1~30)   — §3·§4
② 서브스킬/증강(Specialization Points, 5레벨당 1점) — §6, 액티브를 "바꾼다"
③ Incarnation Tree(레벨 100+, 무제한)  — §7, 순수 패시브
④ Ether Tree(헬/인페르노 퀘스트로 포인트 획득) — §7, "메커니즘 트리"(파워트리 아님)
⑤ 아이템(Relics·Runes/Runewords·Sets)  — §8, 스킬 자체를 부여·변형
```

레벨 상한 250, 스킬 포인트 상한 500, 탤런트 포인트 상한 250이라는 수치가 Steam 커뮤니티 토론에서 확인됐다[커뮤니티] — 다만 이 세 숫자가 정확히 ①~④ 중 무엇을 가리키는지(예: "탤런트 포인트 250"이 ①과 ③ 중 어느 쪽 상한인지)는 단일 출처라 확정하지 못했다(N/F).

> ⚠ **다른 출처는 클래스 레벨 상한을 100으로 말한다** — [00_overview.md §2-3](00_overview.md#2-3-레벨-구조--100에서-축이-바뀐다) 참조. 시즌 10 패치노트의 "레벨 100에서 기본 Ether 포인트 6개"·"영웅 레벨 25마다 경험치 +12.5%"[패치노트]와 §3-1 의 **스킬 트리가 레벨 30에서 끝난다**는 사실을 함께 놓으면, **「클래스 레벨 100 상한 + 그 이후는 Hero Level 로 Incarnation 에 적립」**이 현행일 가능성이 높고 "250"은 구버전 수치로 보인다 — 다만 1차 출처로 확정하지 못했다(N/F).

---

## 2. 클래스 24종 전체 명단 — 전문화 갈래 · 무기군 · 수급 경로

[공식위키]의 클래스 목록 페이지는 22종을 보여주는데, 여기에 [상점]에서 별도 DLC로 확인되는 **Bard**·**Prophet** 2종을 더하면 **24종**이 된다 — 이는 [상점]이 표시하는 "24 character slots"[상점], [3자위키-교차검증] 두 곳의 "24종" 주장과 정확히 일치한다.

| 클래스 | 전문화 A | 전문화 B | 무기군 | 수급 경로 |
|---|---|---|---|---|
| Viking | Shield Bearer | Berserker | 제한군*(방패 포함, 완드/책/스펠블레이드/플라스크 불가) | 유료 DLC 기록 없음 — 기본 제공 추정(N/F) |
| Pyromancer | Flame Diviner | Arsonist | 전무기군 | 기본 제공 추정(N/F) |
| Marksman | Sharpshooter | Engineer | 제한군* | 기본 제공 추정(N/F) |
| Pirate | Gunner | Plunderer | 전무기군 | 기본 제공 추정(N/F) |
| Nomad | Wanderer | Vagabond | 제한군* | 기본 제공 추정(N/F) |
| Redneck | Hillbilly | Logger | 제한군* | 기본 제공 추정(N/F) |
| Necromancer | Venomancer | Lord of the Dead | 전무기군 | 기본 제공 추정(N/F) |
| **Samurai** | Ronin | Emperor's Blade | 제한군* | 최초 유료 DLC "Karp of Doom"(2014-07-18) → 시즌9(2026-04-03) 무료 전환 |
| **Paladin** | Justiciar | Lionheart | 전무기군 | 유료 DLC "Depths of Hell"(2015-04-30, 구명칭 "Fallen Paladin"일 가능성 — N/F) → 시즌9 무료 전환 |
| **Amazon** | Huntress | Valkyrie | 제한군* | 유료 DLC "Amazon Jungle Bundle"(2015-06-08) → 시즌9 무료 전환 |
| **Demon Slayer** | Gunslinger | Executioner | 제한군* | 유료 DLC "Wrath of Mevius"(2015-11-17) → 시즌9 무료 전환 |
| **Demonspawn** | Bone Conjurer | Blood Lord | 전무기군 | 유료 DLC "Wrath of Mevius"(2015-11-17) → 시즌9 무료 전환 |
| **Shaman** | Elementalist | Chieftain | 전무기군 | 유료 DLC(2016년경, 정확한 날짜 N/F) → 시즌9 무료 전환 |
| White Mage | Zealot | Divine Being | 전무기군 | 기본 제공 추정(N/F) |
| Marauder | Juggernaut | Gladiator | 제한군* | **현재도 유료 DLC**("Marauder Class")[상점] |
| Plague Doctor | Sanguine Physician | Plague Caller | 전무기군 | 기본 제공 추정(N/F) |
| Shield Lancer | Champion | Knight | 제한군* | 기본 제공 추정(N/F) |
| Jötunn | Son of Ymir | Son of Aurgelmir | 전무기군 | 기본 제공 추정(N/F) |
| Illusionist | Sand Manipulator | (명칭 미상 — N/F) | 전무기군 | **현재도 유료 DLC**("Illusionist Class")[상점] |
| Exo | Solar Prophet | Lunar Prophet | 전무기군 | **현재도 유료 DLC**("Exo Class")[상점] |
| Butcher | Face of Duality | Flesh Ripper | 제한군* | **현재도 유료 DLC**("Butcher Class")[상점] |
| Stormweaver | Storm Conjurer | Essence of Storm | 전무기군 | **현재도 유료 DLC**("Stormweaver")[상점] |
| Bard | Metal Guitarist | Pit Fighter | N/F | **현재도 유료 DLC**("Bard (Class)")[상점] |
| Prophet | Forest Mystic | Skinwalker | N/F | **현재도 유료 DLC**("Prophet (Class)")[상점] |

> ⚠ **수급 경로 열은 [상점]의 DLC 상품 목록 기준이라 현행과 어긋날 수 있다** — 시즌 10 패치노트는 **`Marauder, Plague Doctor, Shield Lancer and Jötunn are now free`**[패치노트]라고 명시한다. Steam 에 DLC 상품이 계속 올라와 있어도 클래스 자체는 무료로 풀렸을 수 있다는 뜻이다. 개발사의 방향은 **유료 클래스를 기본 게임으로 흡수**하는 쪽이다 — [00_overview.md §9-2](00_overview.md#9-2-dlc-정책--유료-콘텐츠를-기본-게임으로-흡수하는-방향).

\* 제한군 = "Swords, Daggers, Maces, Axes, Claws, Polearms, Chainsaws, Staves, Canes, Bows, Guns, Throwing and Shields" 사용 가능·"Wands, Books, Spellblades and Flasks" 사용 불가[공식위키]. 전무기군 = 이 4종(완드·책·스펠블레이드·플라스크)까지 전부 사용 가능.

**무기군 분류가 클래스 "정체성"과 어긋난다**: Marksman(활 특화로 보이는 이름)과 Necromancer(마법사로 보이는 이름)가 같은 축의 반대편에 있는 게 아니라, **"캐스터 전용 장비(완드·책·스펠블레이드·플라스크) 착용 가능 여부"라는 이진 게이트 하나**로 24종이 갈린다 — 근접·사격 지향(제한군) 12종 vs 시전 지향(전무기군) 12종은 아니고, 실측상 제한군 10종(Viking·Marksman·Nomad·Redneck·Samurai·Amazon·Demon Slayer·Marauder·Shield Lancer·Butcher) : 전무기군 12종(Pyromancer·Pirate·Necromancer·Paladin·Demonspawn·Shaman·White Mage·Plague Doctor·Jötunn·Illusionist·Exo·Stormweaver, Bard/Prophet 미확인)으로 나뉜다. §10에서 본작 시사점으로 다룬다.

---

## 3. 클래스 스킬 트리 — 공통 템플릿과 리스펙

### 3-1. 레벨 게이트 5단 — 24클래스 전부가 공유하는 뼈대

[공식위키]에서 확인한 22개 클래스 전부가 **정확히 같은 레벨 게이트**를 쓴다:

| 레벨 요구치 | 노드 수(트리당) |
|---|---|
| **1** | 2 |
| **8** | 2 |
| **16** | 2 |
| **24** | 2 |
| **30** | 1 |
| **합계** | **트리당 9개 × 2트리 = 클래스당 18개** |

- 24레벨 이하 구간은 대체로 "선행 스킬 1~수개를 요구"하는 트리형 잠금이고, **30레벨 노드는 예외 없이 그 트리의 선행 스킬 다수(많게는 5개 전부)를 요구하는 궁극기 자리**다 — D2 아마존의 "발키리(선행 6개 요구)"와 같은 설계(diablo2/skills/01_amazon.md §2-2)
- 다만 트리마다 선행조건이 어느 스킬을 정확히 가리키는지는 클래스별로 확보 정도가 다르다 — §4에서 확보된 것만 표기하고 나머지는 레벨 게이트만 표기했다
- **Illusionist**는 유일하게 두 번째 트리의 이름을 확보하지 못했다(N/F, §2)

### 3-2. 리스펙·레벨 상한

- 리스펙(포인트 초기화)은 스킬/스탯 페이지의 리셋 버튼으로 가능하며, **골드 수수료**가 든다[커뮤니티] — 정확한 수수료 공식은 N/F
- 레벨 상한 250[커뮤니티] — 다만 §7의 Incarnation Tree는 "레벨 100 이후 무제한으로 포인트를 계속 받는다"는 서술과 "레벨 상한 250"이 어떻게 맞물리는지는 명확히 확인 못함(N/F, 시즌마다 상한이 올랐을 가능성)

---

## 4. 대표 클래스 8종 스킬 전수

> 효과 서술은 [빌드DB](metaroad.gg) 원문을 근거로 요약 번역했다. 스킬명은 원문(영문) 그대로 쓴다. 정확한 레벨별 수치(피해량 등)는 이번 조사에서 확보하지 못했다 — [공식위키] WebFetch가 툴팁 수치를 노출하지 않았고, 개별 스킬 페이지(`/wiki/<스킬명>`)는 전부 404였다. **레벨당 수치는 전 스킬 N/F로 남긴다.**

### 4-1. Viking — Shield Bearer / Berserker

무기군: 제한군(방패 포함, 2핸드무기 이도류 시 공격속도 −35% 페널티)[공식위키]

**Shield Bearer**

| Lv | 스킬 | 유형 | 피해타입 | 효과 |
|---|---|---|---|---|
| 1 | Weapon Master | 패시브 | — | 방패 없이 무기만 착용 시 공격력·명중률 증가 |
| 1 | Charge | 액티브 | 신비 | 돌진해 신비 피해, 명중 시 기절 |
| 8 | Stoneskin | 패시브 | — | 방어도 증가 |
| 8 | Devastating Charge | 패시브 | — | Charge 적중 시 추가 펄스로 신비 피해 + 적 명중률 감소(Charge 강화 노드) |
| 16 | Norse Resistance | 패시브 | — | 전 속성 저항 증가 |
| 16 | Defensive Shout | 패시브 | — | 함성으로 자신·파티원 방어도 버프 |
| 24 | Odin's Fury | 액티브 | 신비 | 강력한 함성 — 주변에 신비 피해 + 기절 |
| 24 | Battle Agility | 패시브 | — | 이동속도 증가 |
| 30 | Combat Orders | 패시브 | — | 함성으로 자신·파티원 최대 생명력·마나 버프 |

**Berserker**

| Lv | 스킬 | 유형 | 피해타입 | 효과 |
|---|---|---|---|---|
| 1 | Seismic Slam | 액티브 | — | 전방 강타 — 피해 + 넉업 + 기절 |
| 1 | Brute Force | 패시브 | — | 치명타 확률·치명타 피해 증가 |
| 8 | Throw! | 패시브† | — | 몬스터를 들어 던져 광역 신비 피해, 착지 시 기절 |
| 8 | Zeal | 액티브 | — | 명중률이 강화된 3연속 강타 |
| 16 | Ymir's Champion | 액티브 | 냉기 | 냉기 강화 강타 — 냉기 피해 추가, 공격력·명중률 증가, 빙결 + 회전 도끼 소환 |
| 16 | Whirlwind | 액티브 | — | 무기를 휘둘러 주변 피해 |
| 24 | Shockwave | 액티브 | — | 바닥 강타로 충격파 — 광역 피해 + 기절 |
| 24 | Berserk | 액티브 | — | 적중마다 공격력·공속·이동속도 증가, 최대 8중첩 |
| 30 | Demolishing Winds | 패시브 | — | Whirlwind가 토네이도를 추가 발생시켜 Whirlwind 피해 일부 전이(Whirlwind 강화 노드) |

† 효과 텍스트("몬스터를 들어 던진다")는 1회성 시전에 가까운데 [빌드DB] 태그는 패시브다 — §0-3의 태그 유보 사항 참조.

### 4-2. Necromancer — Venomancer / Lord of the Dead

무기군: 전무기군[공식위키]

**Venomancer**

| Lv | 스킬 | 유형 | 피해타입 | 효과 |
|---|---|---|---|---|
| 1 | Bone Shred | 액티브 | 신비 | 뼛조각을 날려 신비 피해 |
| 1 | Meat Shield | 패시브 | — | 고깃덩이 방패 소환 — 물리 피해 감소 |
| 8 | Meat Bomb | 액티브 | 신비 | 거대한 고깃덩이를 던져 폭발 — 신비 피해 + 시체 생성(Meat Shield 요구 추정) |
| 8 | Poison Breath | 액티브 | 독 | 부패한 숨결 — 독 피해 |
| 16 | Bone Spear | 액티브 | 신비 | 관통하는 뼈창 — 신비 피해 |
| 16 | Corpse Explosion | 액티브 | 신비 | 대상 지역 시체 전부 폭발 — 신비 피해 |
| 24 | Bone Spirit | 액티브 | 신비 | 가장 가까운 적을 추적해 폭발하는 뼈 영혼 — 신비 피해 |
| 24 | Cursed Ground | 패시브 | — | 대상 지역 저주 — 독 브레이크(저항 감소) 적용 |
| 30 | Poison Nova | 액티브 | 독 | 독성 노바 — 독 피해 + 중독 적용 |

**Lord of the Dead**

| Lv | 스킬 | 유형 | 피해타입 | 효과 |
|---|---|---|---|---|
| 1 | Amplify Damage | 패시브 | — | 대상 지역 몬스터 저주 — 받는 피해 증가(신비 브레이크) |
| 1 | Raise Skeleton | 패시브† | 신비 | 대상 시체에서 해골 전사 소환 |
| 8 | Summon Mastery | 패시브 | — | 모든 소환수의 생명력·신비 피해 증가 |
| 8 | Raise Skeleton Mage | 액티브 | 신비 | 대상 시체에서 해골 법사 소환 |
| 16 | Life Tap | 패시브 | — | 대상 지역 몬스터 저주 — 공격자에게 생명력 흡수 부여 |
| 16 | Summon Frenzy | 패시브 | — | 소환수 일시 광폭화 — 공속·이동속도 증가 |
| 24 | Summon Resistances | 패시브 | — | 소환수 전 저항 + 물리 피해 감소 증가 |
| 24 | Summon Damned Legion | 액티브 | 신비 | 저주받은 군단 소환 |
| 30 | Summon Vengeful Spirit | 패시브† | 신비 | 복수의 영혼 소환 |

† 소환계 스킬 다수가 효과상 시전형인데 패시브로 태깅됨 — §0-3 유보 사항.

### 4-3. Paladin — Justiciar / Lionheart

무기군: 전무기군[공식위키]

**Justiciar**(번개 계열)

| Lv | 스킬 | 유형 | 피해타입 | 효과 | 선행 |
|---|---|---|---|---|---|
| 1 | Vengeance | 액티브 | 물리+번개 | 번개 충격으로 타격, 주변으로 분리돼 물리+번개 피해 | — |
| 1 | Thunder Shield | 패시브 | 번개 | 천둥 방패 — 받는 피해 감소 + 공격자에게 번개 반사 | — |
| 8 | Divine Storm | 액티브 | 번개 | 공격을 신성한 폭풍으로 전환 — 주변 번개 피해 | Vengeance |
| 8 | Fanaticism Aura | 패시브 | — | 발동 중 자신·파티원 공속 증가 | Vengeance |
| 16 | Holy Shock Aura | 액티브 | 번개 | 발동 중 주변에 번개 피해 | — |
| 16 | Ball Lightning | 액티브 | 번개 | 번개 구슬로 변신해 돌진, 착지 시 주변 번개 피해 | — |
| 24 | Lightning Fury | 액티브 | 번개 | 공격력 증가된 타격이 대상 간 번개로 연쇄 | Divine Storm, Vengeance |
| 24 | Eye of the Storm | 패시브 | — | 번개 스킬 피해 증가 | Ball Lightning, Holy Shock Aura |
| 30 | Thor's Fury | 패시브 | — | 일시적으로 공속 + 번개 스킬 피해 증가 | Holy Shock Aura |

**Lionheart**(신비/치유 계열)

| Lv | 스킬 | 유형 | 피해타입 | 효과 | 선행 |
|---|---|---|---|---|---|
| 1 | Divine Wisdom | 패시브 | — | 마나 + 마나 회복 증가 | — |
| 1 | Holy Bolt | 액티브 | 신비 | 관통하는 신성한 빛의 화살 — 신비 피해 | — |
| 8 | Light's Embrace | 패시브 | — | 시전 속도 증가 | Divine Wisdom |
| 8 | Holy Retribution | 패시브 | — | 처치 후 마나 증가 | — |
| 16 | Holy Nova | 액티브 | 신비 | 신성한 빛의 노바 — 신비 피해 + 맞은 아군 치유 | Holy Retribution |
| 16 | Holy Hammer | 액티브 | 신비 | 나선형으로 퍼지는 신성한 망치 소환 — 신비 피해 | Holy Bolt |
| 24 | Holy Aura | 패시브 | — | 발동 중 자신·파티원 공격력 + 마법 스킬 피해 증가 | Holy Nova, Holy Retribution |
| 24 | Fist of the Heavens | 액티브 | — | 신성한 에너지의 주먹을 내려 다수의 Holy Bolt로 폭발 | Holy Nova, Holy Retribution, Holy Hammer, Holy Bolt |
| 30 | The Venerated One | 패시브 | — | 일시적으로 시전 속도 + 마나 회복 증가 | Fist of the Heavens 등 5개 전부 |

### 4-4. Amazon — Huntress / Valkyrie

무기군: 제한군[공식위키]

**Huntress**(독 계열)

| Lv | 스킬 | 유형 | 피해타입 | 효과 |
|---|---|---|---|---|
| 1 | Master Poisoner | 패시브 | — | 독 스킬 피해 증가 |
| 1 | Noxious Strike | 액티브 | 물리+독 | 독 강타 — 물리+독 피해, 3타마다 관통 독 투사체로 중독 적용 |
| 8 | Leaping Ambush | 액티브 | 독 | 대상 위치로 도약 — 독 피해 + 착지 시 넉업 |
| 8 | Caustic Spearhead | 액티브 | 독 | 돌진 공격 — 피해 증가 + 추가 독 피해 + 중독 적용 |
| 16 | Jungle Camouflage | 액티브(버프) | — | 일시적으로 독 스킬 피해 증가 |
| 16 | Thrill of the Hunt | 패시브 | — | 이동속도 증가 |
| 24 | Toxic Remains | 패시브 | 독 | 처치한 몬스터가 독 가스로 폭발 — 중독 적용 |
| 24 | Death from Above | 액티브 | 독 | 대상 지역에 창비를 소환 — 독 피해 + 둔화 |
| 30 | Envenom | 액티브/패시브 | 독 | 타격 시 확률로 주변에 독성 균열 폭발 — 독 피해 + 중독 |

**Valkyrie**(번개 계열)

| Lv | 스킬 | 유형 | 피해타입 | 효과 |
|---|---|---|---|---|
| 1 | Astrope's Gift | 액티브 | 물리+번개 | 번개 강화 공격 — 물리+번개 피해 |
| 1 | Feint | 패시브 | — | 근접·원거리 공격 회피 확률 획득 |
| 8 | Chooser of the Slain | 패시브 | — | 처치 후 생명력·마나 증가 |
| 8 | Rebound | 액티브 | 물리+번개 | 물리+번개 피해 공격이 가장 가까운 적으로 튕김 |
| 16 | Spearnage | 액티브 | 물리 | 번개가 깃든 창을 대상 지역에 난사 |
| 16 | Storm Dash | 액티브 | 번개 | 대상 지역으로 돌진, 주변 적에 연쇄 번개 |
| 24 | Thunder Fury | 액티브 | 물리 | 물리 피해 공격이 대상 뒤로 번개를 퍼뜨림 |
| 24 | Thunder Goddesses Chosen | 패시브 | — | 번개 스킬 피해 증가 |
| 30 | Astrope's Battle Maiden | 액티브(버프) | — | 일시적으로 번개 스킬 피해 + 공속 증가 |

### 4-5. Marksman — Sharpshooter / Engineer

무기군: 제한군[공식위키]

**Sharpshooter**

| Lv | 스킬 | 유형 | 피해타입 | 효과 | 선행 |
|---|---|---|---|---|---|
| 1 | Trickshot | 액티브 | 물리 | 명중률이 강화된 화살이 대상 간 튕기며 공격력 증가 | — |
| 1 | Vault | 액티브 | 물리 | 조준 방향으로 구르며 주변에 화살 발사, 피해 증가 | — |
| 8 | Multishot | 액티브 | 물리 | 부채꼴로 다수 화살 발사, 피해 증가 | Trickshot |
| 8 | Homing Missile | 액티브 | 신비+물리 | 대상을 추적하는 유도 미사일 연사 — 광역 신비+물리 피해 | Trickshot |
| 16 | Agility | 액티브(버프) | — | 일시적으로 이동속도 + 공속 증가 | Vault |
| 16 | Volatile Shot | 액티브 | — | 거대한 화살을 쏴 명중 시 폭발 — 광역 피해 | Homing Missile, Trickshot |
| 24 | Arrow Rain | 액티브 | 신비 | 하늘에서 화살비 — 피해 증가 | Multishot, Trickshot |
| 24 | Critical Accuracy | 패시브 | — | 명중률 + 치명타 피해 증가 | — |
| 30 | Arrow Rampage | 액티브 | 신비+물리 | 조준 방향으로 화살 무리 난사 — 신비+물리 피해 | Arrow Rain, Multishot, Trickshot |

**Engineer**

| Lv | 스킬 | 유형 | 피해타입 | 효과 | 선행 |
|---|---|---|---|---|---|
| 1 | Frag Grenade | 액티브 | 신비 | 파편 수류탄 투척 — 광역 신비 피해 | — |
| 1 | Arrow Turret | 액티브 | 신비 | 가장 가까운 몬스터를 쏘는 화살 터렛 건설 | — |
| 8 | Landmine | 액티브 | 신비 | 대상 지역에 지뢰 설치 — 몬스터 감지 시 폭발 | Frag Grenade |
| 8 | B.E.A.C.O.N. | 패시브 | — | 인근 아군의 신비 스킬 피해 + 마나 회복 증가하는 비콘 건설 | Arrow Turret |
| 16 | Turret Mastery | 패시브 | — | 모든 터렛·드론의 신비 피해 + 공속 증가 | Arrow Turret |
| 16 | Cannon Turret | 액티브 | 신비 | 포탄을 발사해 파편으로 폭발하는 대포 터렛 건설 — 광역 신비 피해 | B.E.A.C.O.N., Arrow Turret |
| 24 | Master Mechanic | 액티브(버프) | — | 일시적으로 모든 터렛·드론의 공속 + 신비 피해 증가 | Turret Mastery, Arrow Turret |
| 24 | Gunner Drone | 액티브 | 신비 | 따라다니며 대상 간 튕기는 총알을 쏘는 드론 건설 | Master Mechanic, Turret Mastery, Arrow Turret |
| 30 | Rocket Turret | 액티브 | 신비 | 로켓을 발사하는 터렛 건설 — 광역 신비 피해 | Cannon Turret, B.E.A.C.O.N., Arrow Turret |

### 4-6. Pyromancer — Flame Diviner / Arsonist

무기군: 전무기군[공식위키]

**Flame Diviner**

| Lv | 스킬 | 유형 | 피해타입 | 효과 | 선행 |
|---|---|---|---|---|---|
| 1 | Blazing Trail | 액티브 | 화염 | 화염 흔적을 남기며 이동 — 화염 피해 | — |
| 1 | Fire Enchant | 패시브 | 화염 | 공격에 가산 화염 피해 부여 + 화상 적용, 스펠에도 점화(Ignite) 중첩 부여 | — |
| 8 | Phoenix Flight | 액티브 | 화염 | 공중으로 돌진, 착지 시 광역 화염 피해 | Blazing Trail |
| 8 | Inferno Slash | 액티브 | 화염 | 화염이 깃든 참격 — 피해 증가 + 추가 화염 피해 | Fire Enchant |
| 16 | Searing Chains | 패시브 | 화염 | 타격 시 강력한 연쇄 공격 — 피해 증가 + 추가 화염 피해 + 기절 | Inferno Slash, Fire Enchant |
| 16 | Ignite | 패시브 | 화염 | 화염 인챈트 공격이 점화 중첩 부여, 10중첩 시 광역 화염 피해로 폭발 | Fire Enchant |
| 24 | Fire Shield | 패시브 | 화염 | 화염 방패 — 물리 피해 감소 + 주변에 화염 피해 | Phoenix Flight, Blazing Trail |
| 24 | Fiery Presence | 패시브 | — | 화염 스킬 피해 증가 | — |
| 30 | Avatar of Fire | 패시브(버프) | — | 일시적으로 화염의 화신化 — 공속·화염 피해·스펠 치명타 피해·치명타 확률 증가 | — |

**Arsonist**

| Lv | 스킬 | 유형 | 피해타입 | 효과 | 선행 |
|---|---|---|---|---|---|
| 1 | Breath of Fire | 액티브 | 화염 | 타오르는 불길을 내뿜음 — 화염 피해 + 화상 적용 | — |
| 1 | Fireball | 액티브 | 화염 | 화염구 시전 — 화염 피해 | — |
| 8 | Scorching Aura | 액티브 | 화염 | 발동 중 주변을 그을림 — 화염 피해 | Breath of Fire |
| 8 | Hydra | 액티브 | 화염 | 가장 가까운 적에게 화염구를 쏘는 히드라 소환 — 광역 화염 피해 | Breath of Fire, Fireball |
| 16 | Volcano | 액티브 | 화염 | 용암 화산 소환 — 주변 화염 피해 + 폭발하는 불타는 돌 발사 | Scorching Aura, Breath of Fire |
| 16 | Meteor | 패시브 | 화염 | 강력한 유성 시전 — 착탄 시 광역 화염 피해 | Fireball |
| 24 | Fire Nova | 액티브 | 화염 | 주변에 화염 노바 — 화염 피해 | Hydra, Breath of Fire, Fireball |
| 24 | Comet | 액티브 | 화염 | 거대한 혜성 낙하 — 착탄 시 광역 화염 피해 | Meteor, Fireball |
| 30 | Armageddon | 액티브 | 화염 | 하늘에서 유성비 — 광역 화염 피해 | Fire Nova, Hydra, Breath of Fire, Fireball |

### 4-7. Shaman — Elementalist / Chieftain

무기군: 전무기군[공식위키]

**Elementalist**

| Lv | 스킬 | 유형 | 피해타입 | 효과 | 선행 |
|---|---|---|---|---|---|
| 1 | Tectonic Boulder | 액티브 | 신비 | 거대한 바위를 전방으로 굴림 — 신비 피해 | — |
| 1 | Twisters | 액티브 | 신비 | 소형 회오리를 대상 지역으로 날림 — 경로상 신비 피해 | — |
| 8 | Rock Fragments | 액티브 | 신비 | 암석 파편을 대상 지역으로 발사 — 신비 피해 | Tectonic Boulder |
| 16 | Earth Bind | 액티브 | 독 | 땅에서 덩굴을 일으켜 독 피해 + 중독 + 속박 | Tectonic Boulder |
| 16 | Meteor Storm | 액티브 | 신비 | 대상 지역에 유성 폭풍 — 신비 피해 | Rock Fragments, Tectonic Boulder |
| 16 | Tornado | 액티브 | 신비 | 대상 방향으로 이동하는 토네이도 소환 — 경로상 신비 피해 | Twisters |
| 24 | Earth's Grace | 패시브 | — | 최대 생명력·마나 증가 | Meteor Storm, Rock Fragments, Tectonic Boulder |
| 24 | Nature's Prophet | 패시브 | — | 신비 스킬 피해 증가 | — |
| 30 | Fissures | 액티브 | 신비 | 마법으로 땅을 갈라 균열에서 분출 — 신비 피해 | Meteor Storm, Rock Fragments, Tectonic Boulder |

**Chieftain**

| Lv | 스킬 | 유형 | 피해타입 | 효과 | 선행 |
|---|---|---|---|---|---|
| 1 | Earth Totem | 액티브 | 신비 | 암석 파편을 발사하는 토템 소환 — 광역 신비 피해 | — |
| 1 | Spiritual Guide | 패시브 | — | 마나 + 마나 회복 증가 | — |
| 8 | Fractal Mind | 패시브 | — | 이동속도 + 마법 스킬 피해 증가 | Spiritual Guide |
| 8 | Spirit Wolves | 액티브 | 신비 | 함께 싸우는 정령 늑대 소환 | — |
| 16 | Storm Totem | 액티브 | 번개 | 주변에 연쇄 번개를 방출하는 토템 소환 — 번개 피해 | Earth Totem |
| 16 | Scent of the Wolf | 패시브 | — | 정령 늑대의 신비 피해·생명력 증가 | Spirit Wolves |
| 24 | Fire Totem | 액티브 | 화염 | 관통하는 화염 투사체를 쏘는 토템 소환 — 화염 피해 | Storm Totem, Earth Totem |
| 24 | Astral Intellect | 액티브/패시브 | — | 시전 시 소환된 모든 토템을 자신에게 이동, 패시브로 모든 토템의 사거리 증가 | Storm Totem, Earth Totem |
| 30 | Chaos Totem | 액티브 | 신비 | 카오스 볼트를 연사하는 토템 소환 | Fire Totem, Storm Totem, Earth Totem |

### 4-8. Samurai — Ronin / Emperor's Blade

무기군: 제한군[공식위키]

**Ronin**

| Lv | 스킬 | 유형 | 피해타입 | 효과 |
|---|---|---|---|---|
| 1 | Battle Glance | 액티브 | 물리 | 광역 공격 — 피해·명중률 증가 |
| 1 | Shuriken Throw | 액티브 | 물리 | 관통하는 표창 3개 투척 — 피해 증가 |
| 8 | Quickslash | 액티브 | 물리 | 빠른 돌진 후 광역 참격 — 물리 피해 증가 |
| 8 | Evasion | 패시브 | — | 근접·원거리 공격 회피 확률 획득 |
| 16 | Smoke Bomb | 액티브 | 신비 | 연막탄 폭발 — 신비 피해 |
| 16 | Explosive Kunai | 액티브 | 신비 | 폭발하는 쿠나이 투척 — 명중 시 분열해 추가 폭발 |
| 24 | Warriors Spirit | 패시브 | — | 공속 증가 |
| 24 | Bushido | 패시브/액티브(버프) | — | 발동 시 잃은 생명력 10%당 공격력 증가 |
| 30 | Live by the Sword | 패시브/액티브(버프) | — | 일시적으로 공속 + 이동속도 증가 |

**Emperor's Blade**

| Lv | 스킬 | 유형 | 피해타입 | 효과 |
|---|---|---|---|---|
| 1 | Blade Barrier | 액티브 | 물리+신비 | 주변에 회전하는 칼날 방벽 소환 — 물리 피해 + 추가 신비 피해 |
| 1 | Exploding Bolas | 액티브 | 신비 | 볼라 투척 — 명중 시 신비 피해, 짧은 지연 후 재폭발 |
| 8 | Fan of Knives | 패시브 | 물리 | 공격 시 확률로 주변에 칼을 흩뿌려 물리 피해 |
| 8 | For Honor | 패시브/액티브(버프) | — | 일시적으로 공격력 + 이동속도 증가 |
| 16 | Omnislash | 액티브 | 물리 | 대상 불가 상태가 되어 명중률 증가된 연속 타격 |
| 16 | Burst of Speed | 패시브 | — | 처치 후 일정 시간 이동속도 증가 |
| 24 | Shadow Step | 액티브 | 신비 | 그림자로 들어가 대상 위치에 재등장 — 주변 신비 피해 |
| 24 | Way of the Warrior | 패시브 | — | 공격력 + 마법 스킬 피해 증가 |
| 30 | Empire's Slash | 액티브 | 물리 | 짧은 거리 블링크 후 광역 공격 — 물리 피해 |

### 4-9. 대표 8종이 보여주는 패턴

1. **트리 하나 = 원소/테마 하나가 기본형이지만, 예외가 더 흔하다.** Pyromancer 양 트리(전부 화염), Necromancer 양 트리(전부 신비 축)처럼 "트리=단일 원소"인 클래스가 있는 반면, Shaman Elementalist(신비 위주에 독 1개 혼입)·Chieftain(신비+번개+화염 혼합), Paladin Justiciar(번개)/Lionheart(신비)처럼 **트리 하나 안에서도 피해 타입이 섞이는 사례가 더 많다** — "트리=속성 슬롯"이라는 단순 도식은 8종 중 소수에만 들어맞는다.
2. **액티브/패시브 비율이 클래스마다 다르다.** Paladin 18개 중 액티브 11·패시브 7, Amazon 18개 중 액티브 14·패시브 4로 크게 갈린다 — D2 아마존 패시브 트리(24개 중 6개, diablo2/skills/01_amazon.md §4-1)처럼 고정 비율이 아니라 **클래스마다 자유롭게 설계**된다.
3. **"버프형 액티브"가 30레벨 마무리 노드에 자주 온다.** Marksman(Agility, 16레벨)·Amazon Valkyrie(Astrope's Battle Maiden, 30)·Pyromancer(Avatar of Fire, 30)·Samurai(Live by the Sword, 30)처럼, 최종 노드가 신규 피해기가 아니라 "일시 강화 버프"인 경우가 절반 가까이 된다 — 이는 diablo2 조사(§4-2)가 지적한 "궁극기 = 최종 결정체" 패턴과 다르게, Hero Siege는 **궁극기 자리에 상시 딜 강화 대신 쿨타임 버프를 놓는 선택지를 자주 쓴다.**
4. **"패시브"로 태깅된 스킬 중 상당수가 실제로는 시전형(사실상 액티브)이다**(§0-3) — Viking Throw!, Necromancer Raise Skeleton/Summon Vengeful Spirit, Samurai Bushido/Live by the Sword 등. 액티브/패시브 이분법이 툴팁 텍스트만으로는 깔끔히 갈리지 않는 사례들이며, [빌드DB] 태깅의 신뢰도 유보와 별개로 게임 자체가 "즉시 시전 후 지속되는 버프"를 패시브 취급하는 관례가 있을 가능성도 있다(N/F).

---

## 5. 유료 DLC 클래스 미리보기 — Bard · Prophet

레벨 요구치·선행조건은 확보하지 못했다(N/F) — [공식위키]에 개별 클래스 페이지가 없어(404) [빌드DB]의 효과 텍스트만 확보했다.

### 5-1. Bard — Metal Guitarist / Pit Fighter

죽음의 메탈(death-metal) 테마. Metal Guitarist는 번개 원거리 캐스터, Pit Fighter는 물리+화염 근접 격투형[빌드DB].

| 트리 | 스킬 | 유형 | 피해타입 | 효과 |
|---|---|---|---|---|
| Metal Guitarist | Slaying Riffs | 액티브 | 번개 | 하늘에서 앰프를 떨어뜨려 지면을 강타, 음표를 발사 — 번개 피해 |
| Metal Guitarist | Insane Riff | 패시브 | — | 5번째 스펠 시전마다 번개 피해 강화 |
| Metal Guitarist | Visceral Growl | 액티브 | 번개 | 전방 원뿔로 포효 — 번개 피해 |
| Metal Guitarist | Amping Up | 패시브 | — | 스펠 명중·타격 시 확률로 시전 속도 증가 중첩 |
| Metal Guitarist | Sacrilegious Symphony | 액티브 | 번개 | 짧게 채널링 후 대규모 광역 펄스 |
| Metal Guitarist | Satan's Melody | 패시브 | — | 일시적으로 번개 스킬 피해 증가 + 확률로 기타 피크 발사 |
| Metal Guitarist | Sounds of Silence | 패시브 | — | 지능 일부를 번개 스킬 피해로 전환 |
| Metal Guitarist | High dB | 패시브 | — | 음표 명중 시 확률로 음파 펄스 추가 — 번개 피해 증가 |
| Metal Guitarist | Progenies of the Great Cataclysm | 액티브 | 번개 | 대형 앰프를 소환해 블랙메탈 연주 — 관통 음표 발사 |
| Pit Fighter | Headbanger | 액티브 | 화염 | 3번째 공격마다 헤드뱅 — 광역 피해 |
| Pit Fighter | Crowd Pummeler | 패시브 | 물리 | 타격 시 확률로 몬스터에서 음표 방출 — 물리 피해 |
| Pit Fighter | Crowd Dive | 액티브 | 물리 | 대상 위치로 돌진해 넉업 + 물리 피해 |
| Pit Fighter | Adrenaline Momentum | 패시브 | — | 타격 시 확률로 이동속도·공속 증가 중첩 획득 |
| Pit Fighter | Craving For Attention | 패시브 | — | 총 강화 피해 일부를 화염 스킬 피해로 획득 |
| Pit Fighter | Pyro Technician | 액티브 | 화염 | 가장 가까운 몬스터에게 블링크 후 광역 공격 |
| Pit Fighter | Craving For Another Killing | 패시브/액티브(버프) | — | 일시적으로 공격력·타격당 생명력·공속 증가 |
| Pit Fighter | Antisocial Pit Fighter | 패시브 | — | 처치 시 확률로 매직 파인드 증가 |
| Pit Fighter | Moshpit Massacre | 액티브 | 물리 | 죽음의 메탈 군중을 소환해 반경 내 몬스터와 전투 |

### 5-2. Prophet — Forest Mystic / Skinwalker

Forest Mystic은 소환+독 위주, Skinwalker는 변신+물리 근접 위주[빌드DB].

| 트리 | 스킬 | 유형 | 효과 |
|---|---|---|---|
| Forest Mystic | Carrion Worm | 액티브 | 시체벌레 소환 — 주변 몬스터를 빈번히 공격 |
| Forest Mystic | Thorned Roots | 액티브 | 가시 뿌리 무리 — 독 피해 |
| Forest Mystic | Summon Raven | 액티브 | 주변을 도는 까마귀 소환 — 근처 몬스터 공격 |
| Forest Mystic | Blessed Nature | 패시브 | 독 스킬 피해 증가 |
| Forest Mystic | Summon Ent | 액티브 | 함께 싸우는 엔트 소환 |
| Forest Mystic | Thorned Branch | 액티브 | 가시 나뭇가지 투척 — 독 피해 |
| Forest Mystic | Summon Spirit of The Forest | 액티브 | 생명력·마나를 늘려주는 숲의 정령 소환 |
| Forest Mystic | Deep Rooted | 패시브 | 전 저항 증가 |
| Forest Mystic | Summon Ent Colossus | 액티브 | 함께 싸우는 거대 엔트 소환 |
| Skinwalker | Spirit of The Wendigo | 패시브/변신 | (상세 N/F — 변신형 스킬로 추정) |
| Skinwalker | Wounding Paw | 액티브 | 증가된 피해로 타격, 확률로 파문 발생 |
| Skinwalker | Skinwalker | 패시브 | 생명력 일부가 물리 피해로 추가 |
| Skinwalker | Leaping Charge | 액티브 | 돌진 도약 — 물리 피해 |
| Skinwalker | Spirit of the Ent | 액티브/변신 | (상세 N/F — 변신형 스킬로 추정) |
| Skinwalker | Maelstrom of Frost | 액티브 | 주변에 서리 소용돌이 소환 — 냉기+물리 피해 |
| Skinwalker | Swamp's Essence | 패시브 | 최대 생명력 증가 |
| Skinwalker | Manadwelling | 패시브 | 마나 일부가 물리 피해로 추가 |
| Skinwalker | Storm Hawk | 패시브/변신 | (상세 N/F — 변신형 스킬로 추정) |

---

## 6. 서브스킬(증강/Specialization Points) — 액티브를 바꾸는 층

- **레벨 5부터 잠금 해제**, 이후 **5레벨마다 1포인트** 획득[가이드][공식위키] — 이 시스템은 커뮤니티에서 "Specialization Points"·"서브스킬(sub-skill)"·"증강(augment) 포인트" 등 여러 이름으로 불린다(동일 시스템으로 확인됨)
- 스킬을 최대 레벨까지 찍지 않아도 이 포인트는 별개로 계속 쌓인다[가이드]
- 사용법: 액티브 스킬 아이콘 모서리의 **"+" 표시**를 클릭하면 그 스킬의 서브스킬(증강) 메뉴가 열린다[가이드]
- 증강이 바꾸는 것: **피해 타입 전환**(예: 화염→냉기), **추가 효과 부여**(디버프·버프 추가) 등 — 정확히 어떤 옵션들이 트리별로 존재하는지 전수 목록은 확보하지 못했다(N/F)
- §4의 클래스 페이지에서 확인된 "Class Augments"(예: Viking Odin's Fury "레벨당 신비 피해 +28%, 마나 소모 −5%", Shockwave "레벨당 5% 확률로 소형 분신 생성 + 공격력 +10%, 분열 확률 +3%")[공식위키]가 바로 이 서브스킬 시스템의 실제 사례로 추정된다 — 다만 [공식위키] 개별 클래스 페이지가 "Class Augments"를 §4의 18개 스킬 목록과 별개 섹션으로 다뤄서, **정확히 이 4개 예시가 서브스킬 시스템 자체인지, 아니면 스킬트리 30레벨 노드의 레벨스케일링 설명인지는 확정하지 못했다(N/F)**

---

## 7. 스킬 외 성장 축 — Incarnation Tree · Ether Tree

### 7-1. Incarnation Tree — 레벨 100 이후의 무제한 패시브

- **레벨 100에서 잠금 해제**, 이전까지는 접근 불가[가이드]
- 레벨 100 이후로는 **레벨업마다 포인트 1개씩 계속 획득** — 사실상 **무제한 스케일링**[가이드]
- 규모: 시즌9 기준 **1,600개 이상**, 시즌10에서 **600개 이상 추가**되어 **2,200개 이상**[가이드] — 자료마다 "약 1,200개"·"약 2,000개"로 다르게 서술돼 시즌별 스냅샷 차이로 추정된다(N/F, 정확한 현재 노드 수 미확정)
- 구조: 명시적 하위 트리로 나뉘지 않고 **주제별 색상 구역**으로 구성 — 예: 캐스터 노드(청/보라), 원거리 물리·투사체 노드(녹색)[가이드]
- 탐색 보조 기능: Auto-Pathing(경로 자동 표시), Black Holes(구역 간 점프 노드), 검색 기능[가이드]
- 노드 예시: **Sentry** 계열 — "직접 피해는 못 주는 대신 피해량을 최대 50%까지 늘려주는" 빌드 변형형 노드[가이드]
- 옛 "Hero Level 트리"(레벨업 시 얻던 구 시스템)를 대체했다[가이드]

### 7-2. Ether Tree — "메커니즘 트리"(파워 트리 아님)

- 포인트 획득처: **헬·인페르노 난이도의 특수 퀘스트**(자동으로 나타나고 자동으로 완료됨)[가이드]
- 규모: **400개 이상**(출시 시점), 시즌10에서 **100개 이상 추가**[가이드]
- 성격: "파워를 올리는 트리가 아니라, **이미 하고 있는 파밍 활동을 더 잘 되게(드롭률·소요시간·화폐 획득량) 만드는 트리**"[가이드] — 예: 초반 핵심 노드 "Pristine Extraction"은 광석(Ore)에서 10% 확률로 Pristine Gem이 나오게 한다[가이드]
- 제약: **맵 안(사냥 중)에는 노드를 바꿀 수 없다** — 조정하려면 별도의 "Vote Reset" 기능을 써야 한다[가이드]
- 헬보다 **인페르노 난이도에서 대부분의 트리가 더 효율적**이라는 서술이 있다[가이드]

### 7-3. 진행 순서 — 공식 권장 루트

가이드가 일관되게 제시하는 순서: **클래스 트리(§3~4) → 액트 8 → "Odin"(시즌8 스토리로 추정) → "Ebontharn"(시즌10 스토리) → 레벨 100에서 Incarnation → 헬/인페르노에서 Ether**[가이드] — 즉 신규 시즌 캐릭터는 클래스 트리와 메인 스토리를 액트 8까지 먼저 끝낸 뒤에야 Incarnation·Ether를 만지는 게 권장된다는 뜻이다.

---

## 8. 아이템이 스킬을 바꾸는 접점 — Relics · Runes/Runewords · Sets

### 8-1. Relics — 스킬 직접 부여형 장비

[공식위키] Relics 페이지가 분류한 카테고리(정의문 자체는 페이지에 없어 카테고리명과 예시로 유추):

| 카테고리 | 예시 | 효과 |
|---|---|---|
| Passive | Barbed Shield | 받은 피해의 10%를 공격자에게 반사(레벨 1 기준) |
| Passive | Fortune Card | 처치 시 골드 획득 +3%, 매직 파인드 +3% |
| Chance after Each Kill / Attacking / Casting / Striking / Struck | — | 각 트리거(처치 후/공격 시/시전 시/타격 시/피격 시) 확률 발동형 효과 |
| Follower | — | 소환수처럼 따라다니며 딜을 넣는 팔로워형 |
| Grants Ability | — | **릴렉 자체가 캐스트 가능한 스킬을 부여** — 클래스 스킬트리 밖에서 신규 액티브를 얻는 유일한 경로 |
| Orbital | Frozen Orb | 주변을 도는 오브가 냉동 광역 공격을 수행 |

- 릴렉 총수는 [3자위키 계열] "149개"라는 서술이 있으나 [공식위키]로 직접 재검증하지 못했다(N/F, 신뢰도 낮음)
- 획득·장착(소켓 슬롯 수, 인벤토리 제약 등) 메커니즘은 [공식위키] 페이지에 서술이 없어 N/F

### 8-2. Runes / Sockets / Runewords

- **룬 40종**, 등급 D~S[검색][공식위키]
- 예시: Qi(공격력 +20%, 요구레벨57) · Rex(화염 스킬 피해 +5%, 요구레벨19) · Jah(생명력 +10%) · Um(전 저항 +8%, 요구레벨47) · Tor(처치마다 마나 +2) · Lem(처치 시 골드 획득 +5%) · Pul(마나 소모 −3%) · Xo(강타(Deadly Blow) 확률 +25%) · Drax(빙결 면역)[공식위키]
- **룬워드**: 정해진 소켓 수 + 정확한 순서로 룬을 꽂으면 발동 — "정확한 소켓 수와 정확한 순서"가 조건이라는 점은 D2 룬워드와 동일한 설계[공식위키]
- **젬(Gem)**: Moonstone(등급 SS, 요구레벨100) — 공속 +7% + 힘/민첩 스탯 보너스[공식위키]
- **주얼(Jewel)**: Agathetheum(등급 B, 요구레벨30) — 피해의 75%를 공격자에게 반사[공식위키]
- **Prismatic Sockets**: 소켓에 낀 젬의 효과값을 50% 증폭시키는 별도 소켓 종류[공식위키]

### 8-3. Sets("Satanic Sets")

- [검색] 스니펫: "세트 효과는 사탄 세트(Satanic Set)의 요구 부위 수를 채우면 해금되며, 클래스 스킬을 강화하는 것부터 완전히 새로운 능력·확률발동을 추가하는 것까지 다양하다" — **세트 효과가 클래스 스킬 자체를 강화할 수 있다는 점이 확인됐다.**
- 구체적인 세트 명·부위 수·정확한 보너스 수치는 확보하지 못했다(N/F) — [공식위키] `/wiki/Sets` 페이지가 404였다

---

## 9. pre-2.0(2014~2023 구버전) — 확인된 것과 안 된 것

> §0-2에서 정리했듯, "Hero Siege 2"는 없고 이 절은 **같은 게임의 2023-10-02 이전 상태**를 가리킨다. 이 상태는 **현재 플레이 불가**(캐릭터 전량 와이프 + 시스템 자체 교체)이므로 참고 가치는 "본작이 무엇과 무엇 사이의 이행을 겪었는가"를 보는 역사적 대조 용도로 한정한다.

### 9-1. 확인된 것

- 출시: 2014-10-02(픽셀 아트 핵앤슬래시)[검색]
- 핵심 루프가 **웨이브 기반 아레나 로그라이트**였다 — "Hero Siege 2.0"이 이를 "좀 더 전통적인 디아블로형"으로 바꿨다는 서술이 커뮤니티 토론에서 확인된다[커뮤니티]
- DLC로 클래스가 순차 추가됐다 — Karp of Doom(2014-07-18, Samurai 추가)·Depths of Hell(2015-04-30, Fallen Paladin 추가 + 6번째 액트 "Holy Grounds")·Amazon Jungle Bundle(2015-06-08, Amazon 추가)·Wrath of Mevius(2015-11-17, Demon Slayer·Demonspawn 추가 + "The Rift" 액트)[검색]
- 2.0(2023-10-02)에서 **아이템·스탯·클래스 전면 재제작 + 캐릭터 세이브 전량 와이프**가 있었다[커뮤니티]
- "Fallen Paladin"이라는 pre-2.0 클래스명이 현재는 "Paladin"으로만 남아 있다 — **개명인지 별개 클래스가 통합된 것인지는 확정하지 못했다(N/F)**

### 9-2. 확인하지 못한 것(N/F)

- pre-2.0 스킬 트리의 정확한 구조(트리 개수가 클래스당 2개였는지, 다른 개수였는지) — 검색으로 구조를 설명하는 자료를 찾지 못했다
- pre-2.0 클래스별 실제 스킬 명단·수치 — 전수 미확인
- pre-2.0 능력치 체계가 현재의 STR/DEX/INT/VIT/ENE 5종과 같았는지
- "2.0" 이전에 "1.0"에 해당하는 별도 개편이 있었는지(패치노트에 "Hero Siege 2.0"이라는 표현이 2016년 체인지로그에서도 한 차례 검색됐으나, 이것이 2023년 개편과 같은 사건인지 이름만 재사용한 다른 사건인지 확정하지 못했다)

---

## 10. 본작 시사점

> 본작은 7대 죄악 테마 방치형 파밍 RPG. 자동전투(조작 없음) · 관전이 본편. 액티브 3칸 = 영웅 고유/무기군/전직(출처마다 하나). 패시브 = 마스터리 2탭(직업·죄종) + 전직 트리. 전직은 직업마다 3갈래 택1, 갈래가 액티브 3을 주고 그중 1개만 찍는다. 스킬 롤백이 무료.

1. **"클래스당 전문화 정확히 2갈래"라는 Hero Siege의 규칙은 본작의 "전직 3갈래"보다 좁다.** 24클래스 × 2전문화 = 48갈래인데, 각 전문화는 §4에서 보듯 **18개 노드 전부**를 담당한다(액티브+패시브 혼합, 궁극기 1개 포함) — 본작의 전직 갈래가 "액티브 3개 중 1개만 찍는" 좁은 슬롯인 것과 달리, Hero Siege의 전문화는 **그 자체로 완결된 미니 스킬트리**다. 본작이 전직 갈래를 지금보다 확장하고 싶다면, "액티브 몇 개를 더 주느냐"보다 "그 갈래 전용 패시브 노드를 몇 개 딸려 보내느냐"가 Hero Siege식 확장 방향의 참고가 된다.
2. **무기군이 스킬군을 가르지 않고, "캐스터 장비 착용 가능 여부"라는 단일 이진 게이트가 가른다**(§2 표 아래 분석). Marksman(사수 이미지)과 Necromancer(마법사 이미지)가 스킬 태그로는 갈리지 않고 "완드/책/스펠블레이드/플라스크 착용 가능 여부"로만 갈리는 것은, 본작의 "영웅 고유/무기군/전직" 액티브 3칸 설계에서 **무기군 칸이 어떤 조건으로 활성화되는가**를 설계할 때 참고할 만한 최소 단위 사례다 — 무기군 전용 스킬 자체보다, "이 무기군을 들면 이 장비 카테고리가 막힌다"는 게이트 하나가 정체성을 만드는 더 값싼 방법일 수 있다.
3. **서브스킬/증강(§6)이 "액티브 하나를 다른 원소로 바꾼다"는 점은 diablo2 조사(§5-2)가 남긴 과제와 정확히 맞닿는다.** D2 아마존 패시브 트리는 "변형(태그를 바꾸는) 노드가 0개"였는데(diablo2/skills/01_amazon.md §3-1), Hero Siege는 그 빈 자리를 **클래스 스킬트리 밖의 별도 레이어(서브스킬)**로 채워 넣었다. 본작이 마스터리 노드에 "변형" 축을 넣기로 했다면, "스킬트리 자체에 변형 노드를 심는다"(D2 시도 안 함) 대신 "레벨업 부산물로 받는 별도 포인트 풀을 스킬 변형 전용으로 뗀다"(Hero Siege 방식)는 제3의 설계지가 있다는 뜻 — 이는 본작 마스터리 2탭(직업·죄종)과 전직 트리에 이미 있는 두 풀과는 또 다른, 세 번째 풀을 새로 만드는 선택지다.
4. **Ether Tree(§7-2)의 "파워 트리가 아니라 메커니즘 트리"라는 설계는 본작에 새로운 범주를 제안한다.** 지금까지 조사한 참고작(Lootun·Dragon Cliff·D2)의 성장 축은 전부 "더 세다"로 수렴하는데, Ether Tree는 명시적으로 "세지는 게 아니라 특정 파밍 활동의 효율(드롭률·소요시간)만 올린다"는 **별도 카테고리**로 설계돼 있다. 본작이 파견처·탐험 산출물을 여러 축의 공통 재화로 쓰는 구조를 갖고 있다는 점([CLAUDE.md] 개요)을 고려하면, "전투력과 무관하게 특정 파견/탐험 활동만 더 잘 되게 하는" 전용 트리를 마스터리와 분리해 만드는 안이 Ether Tree의 직접적인 선례가 된다 — 특히 관전이 본편인 본작에서 "세지는 트리"와 "잘 도는 트리"를 시각적으로도 분리하면 관전자가 두 종류의 투자를 혼동하지 않는 이점이 있다.
5. **리스펙 유료(골드 수수료, §3-2)와 본작의 "무료 롤백" 전제가 정면으로 다르다.** D2(유료 리스펙 1회뿐)·Hero Siege(매번 골드) 둘 다 "리스펙에 비용을 물리는" 진영이고, Dragon Cliff·Lootun처럼 "거의 무료"인 진영과 갈린다(dragoncliff/01_skills.md §7, lootun/01_skills.md §7). 본작이 이미 무료 롤백으로 확정했다는 것(CLAUDE.md 아키텍처 원칙과는 별개로 skill_design.md 확정 사항)을 고려하면, Hero Siege의 서브스킬(§6)처럼 "액티브를 바꾸는 결정"까지 무료로 되돌릴 수 있게 할지, 아니면 "찍는 자리(마스터리)는 무료 롤백, 원소 전환 같은 변형 선택은 유료/제한"으로 이원화할지가 갈림길로 남는다 — Hero Siege는 트리 자체(무료 골드 리스펙)와 서브스킬(포인트 재분배 가능 여부 자체가 N/F)을 사실상 같은 취급으로 두는 듯 보이므로, 본작이 이 둘을 의도적으로 차등화한다면 오히려 Hero Siege에 없는 차별점이 된다.

---

## 11. 출처 · 미확인(N/F) 총괄

### 11-1. 주요 출처

- [Official Hero Siege Wiki — Classes](https://herosiege.wiki.gg/wiki/Classes) 및 개별 클래스 페이지(Viking·Necromancer·Pyromancer·Marksman·Paladin·Amazon·Shaman·Samurai·Nomad·Redneck·Pirate·Demon Slayer·Demonspawn·White Mage·Marauder·Plague Doctor·Shield Lancer·Jötunn·Illusionist·Exo·Butcher·Stormweaver) — 클래스명·전문화명·레벨 게이트·선행조건의 1차 출처
- [Official Hero Siege Wiki — Getting Started](https://herosiege.wiki.gg/wiki/Getting_Started) — 스탯 5종, 게임모드 3종
- [Official Hero Siege Wiki — Relics](https://herosiege.wiki.gg/wiki/Relics) · [Socketables](https://herosiege.wiki.gg/wiki/Socketables) · [Items](https://herosiege.wiki.gg/wiki/Items) — 아이템-스킬 접점
- [Metaroad.gg — Hero Siege Skill Database](https://metaroad.gg/hero-siege/database/skills) (Viking·Necromancer·Paladin·Amazon·Marksman·Pyromancer·Shaman·Samurai·Bard·Prophet 페이지) — 효과 텍스트·액티브/패시브 태그
- [Steam — Hero Siege DLC 페이지](https://store.steampowered.com/dlc/269210/Hero_Siege/), [Steam 검색](https://store.steampowered.com/search/?term=Hero+Siege) — 유료 DLC 클래스 확정
- [playherosiege.com](https://playherosiege.com/en) — 현재 패치 버전(7.0.8, 2026-02-09)
- [U4N — Hero Siege Season 9: The Incarnation Tree](https://www.u4n.com/news/hero-siege-season-9-the-incarnation-tree.html), [U4N — Mastering the Ether Tree](https://www.u4n.com/news/hero-siege-season-9-mastering-the-ether-tree.html), [U4N — Specialization Points](https://www.u4n.com/news/how-to-get-and-use-hero-siege-specialization-points.html) — Incarnation/Ether Tree, 서브스킬
- Steam Community 토론 다수 — 리스펙 방식, 레벨/포인트 상한, "Hero Siege 2.0"의 정체(별도 게임이 아니라 리워크 패치라는 사실 확인)
- `herosiegewiki.com`, `hero-siege.wiki` — 클래스 총수(24) 교차검증용으로만 인용

### 11-2. 미확인(N/F) 총괄

| 항목 | 상태 |
|---|---|
| 24클래스 전체의 레벨별 정확한 수치(피해량·마나 소모·쿨타임 등) | 전량 미확인 — [공식위키] WebFetch가 툴팁 수치를 노출하지 않았고 개별 스킬 페이지는 전부 404 |
| Illusionist 두 번째 트리의 정식 명칭 | 미확인 |
| Bard·Prophet의 무기군, 레벨 게이트, 선행조건 | 미확인 — [공식위키]에 클래스 페이지 자체가 없음(404) |
| 서브스킬(증강) 시스템의 트리별 전체 옵션 목록 | 미확인 — "+"버튼 존재와 예시(원소 전환 등)만 확인 |
| §6에서 언급한 "Class Augments"(Odin's Fury 등)가 서브스킬 시스템 자체인지 별도 개념인지 | 미확정 |
| Incarnation Tree 정확한 현재 노드 수(1,200~2,200 사이 자료마다 다름) | 미확정 |
| Relics 정확한 총 개수(149종 주장은 낮은 신뢰도 출처) | 미확인 |
| Sets("Satanic Sets")의 세트명·부위 수·정확한 보너스 | 전량 미확인 — [공식위키] `/wiki/Sets` 404 |
| 리스펙 골드 수수료 정확한 공식 | 미확인 |
| pre-2.0(구버전) 스킬 트리 구조 전체 | §9-2 참조, 전량 미확인 |
| "Fallen Paladin"(pre-2.0) → "Paladin"(현재) 개명 여부 | 미확정 |
| 레벨 상한 250·스킬 포인트 상한 500·탤런트 포인트 상한 250이 정확히 어느 시스템을 가리키는지 | 단일 출처라 미확정 |

---
*최초 작성: 2026-09-03 — 공식 위키(`herosiege.wiki.gg`) 직접 크롤 22종 클래스 페이지 + `metaroad.gg` 8클래스 효과 텍스트 교차검증으로 신규 작성. 조사 과정에서 원 작업지시의 "Hero Siege(2014) vs Hero Siege 2(후속작)"라는 대상 전제 자체가 오류임을 확인하고 §0-2에서 정정(별도 후속작 없음 — "2.0"은 같은 게임의 2023-10-02 리워크 패치).*
