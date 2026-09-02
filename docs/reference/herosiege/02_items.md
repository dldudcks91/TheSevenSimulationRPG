# Hero Siege — 아이템 구조·옵션 전수 조사

> 상위 문서: [00_overview.md](00_overview.md)
> 짝 문서: [01_skills.md](01_skills.md)
> 상태: **부분조사** (2026-09-03) — 아이템 구조는 폭넓게 확보했으나, §12 에 남긴 다수의 N/F(수치·정확한 순서 미확정)가 있다
> 목적: 참고작 후보 Hero Siege(픽셀 핵앤슬래시 라이브서비스 ARPG)의 **아이템 형태와 옵션을 전수 조사**해, 본작(TheSevenSimulationRPG — 7대 죄악 테마 방치형 파밍 RPG, 참고작 1순위 Lootun·아이템 철학 참고작 Diablo 2)의 희귀도·접사·세트·소켓 설계에 참고선을 만든다
> ⚠ **이 문서의 수치는 전부 Hero Siege 의 것이다.** 본작 SSOT가 아니며 `src/data/*.csv`로 옮기지 말 것

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 — **대상 확정(pre-2.0 vs post-2.0)** · 오염 배제 |
| 1 | 장비 슬롯 구조 |
| 2 | 능력치·아이템 레벨·난이도 — 드롭의 기반 축 |
| 3 | 희귀도 체계 — 색상 등급 8단 + 품질 접두 4종 |
| 4 | 접사(Affix) 체계 |
| 5 | 세트·고유(Satanic~Angelic) 아이템 — 실제 목록 60+ |
| 6 | 소켓 계열 — 룬·젬·주얼·차암·룬워드 |
| 7 | 강화·제작·개조 — 크래프팅 큐브·다이스·감바·오그먼트·주얼크래프팅·코덱스 |
| 8 | 소모품·유물·펫·기타 장비 외 축 |
| 9 | 드롭 구조 — 난이도·몬스터 타입·존·거래 |
| 10 | (구버전) pre-2.0 — 확인 가능한 범위만 |
| 11 | 본작 시사점 |
| 12 | 출처 · 미확인(N/F) 총괄 |

---

## 0. 조사 방법과 신뢰도

### 대상 확정 — "Hero Siege 2" 는 별도 게임이 아니다 (최초 전제 정정)

이 조사는 원래 "Hero Siege(2014) vs Hero Siege 2(후속작)" 로 대상을 가르려 했으나, **그 전제 자체가 틀렸다.** Steam 앱은 **269210 하나뿐**이고, "Hero Siege 2.0" 은 **2023-10-02 에 나온 같은 게임의 무료 대개편 패치**다 — 개발 기간 자체는 2022 Q4부터였다는 것이 커뮤니티 서술이다[스팀토론]. 2.0 은 **기존 캐릭터·아이템·세이브 전량을 와이프**하고 아트를 거의 전부 새로 그렸으며[스팀토론], 게임의 정체성을 "트윈스틱 웨이브 서바이벌·로그라이크"에서 **"Diablo 지향 라이브서비스 ARPG"** 로 전환했다. 이번 조사 시점(2026-09-03) 기준 최신 패치는 **7.0.9**이고 **시즌 10 `Ebontharn`**(2026-08-21 시작)이 진행 중이다 — 시즌 이력과 패치 연대는 [00_overview.md §9-1](00_overview.md#9-1-시즌-이력--20-이후-10회)에 있다. 공식 사이트는 `playherosiege.com`[스토어/공식].

**검색에서 "Hero Siege 2" 라는 표현이 실제로 뜬다** — 예: YouTube "All Weapon Augments Guide - Hero Siege 2: Season 4". 이는 **별도 타이틀이 아니라 2.0 이후 버전을 가리키는 커뮤니티 구어체**로 판단한다(공식 스토어 페이지·wiki.gg 어디에도 "Hero Siege 2"라는 별도 제품이 없음). 이번 조사에서 실제로 "Hero Siege 2" 라는 이름의 별도 게임이 존재한다는 1차 증거는 찾지 못했다 — 원래 프롬프트의 전제(별도 후속작)는 **오염된 전제**였다는 것이 이번 조사의 결론이다.

**분단선**: diablo4 조사(`diablo4/00_overview.md §0`)가 "고전(2023~시즌12) vs Lord of Hatred·시즌13 이후"로 시점을 가른 것과 같은 구조로, 이 문서도 **pre-2.0(2014~2023-10-02, 구 로그라이크/웨이브서바이벌) vs post-2.0(2023-10-02~현재, Diablo 지향 라이브서비스)** 로 가른다. **본문(§1~§9)은 post-2.0 현행(패치 7.x) 기준**이며, pre-2.0 구조는 §10 에 별도로 몰아 넣는다 — 이번 조사에서 pre-2.0 아이템 구조의 1차 자료는 대부분 확보하지 못해 §10 은 짧다.

### 신뢰도 표

| 표기 | 소스 | 신뢰도 | 비고 |
|---|---|---|---|
| **[공식위키]** | `herosiege.wiki.gg` — Fandom 에서 이전된 **현재의 공식 위키**. WebFetch 직접 열람 성공(예: `Getting_Started`, `Difficulty`, `Features`, `Consumables`, `Potions`, `Flasks`, `Runes`, `Body_Armors`, `Swords`, `Champion`, `Ancient`, `Satanic_Zones`, `Mining` 등) | ★★★ | 페이지 최종 편집일이 2024-06 로 찍히는 것을 다수 확인 — **post-2.0 시점 콘텐츠**임을 뒷받침. 단, 매우 최근(7.0.8 등) 변경분까지 반영됐는지는 개별 확인 못함 |
| **[스토어]** | `store.steampowered.com/app/269210` 게임 설명 | ★★★ | 1차 공식 서술. 희귀도 목록·아이템 수·룬워드 존재를 직접 확인 |
| **[팬데이터]** | `hero-siege-helper.vercel.app` — 팬 제작 구조화 데이터 사이트(접사 653/896건 수치화, 룬워드·크래프팅 비용·세트 60여종 등 표 형태로 정리) | ★★★(구조 데이터) | **코디네이터가 사전에 직접 확인한 사실**("Quickstep - Boots - Ymn & Del Runes")과 이 사이트의 룬워드 표가 **정확히 일치**해 신뢰도를 상향했다. 다만 자체 인정하는 미완성 구간(전체 896개 접사 중 653개만 수치 확보 등)이 있어 그 부분은 채택하지 않고 N/F로 남김 |
| **[스팀토론]** | Steam Community 유저 토론(질문/답변 스레드) | ★★ | 실사용자 경험담. 서로 다른 스레드가 **희귀도 색상 순서에서 불일치**를 보여 §3 에서 그대로 병기 |
| **[Fandom]** | `herosiege.fandom.com` — 이전 세대 공식 위키(현재는 wiki.gg 로 대체). **WebFetch 시 HTTP 402(결제 요구)로 직접 열람 전량 차단** — diablo2·poe1 조사 때의 동일 장벽 | ★☆ | WebSearch 스니펫으로만 인용. wiki.gg 로 이전되기 전 버전이 남아있어 **pre-2.0 정보가 섞였을 위험**이 있다고 판단해 구조적 주장의 단독 근거로는 쓰지 않음 |
| **[3자-교차]** | `herosiegewiki.com` — 제3자 사이트. **코디네이터가 출처 불명이라 "공식 위키와 대조 전엔 인용 금지"로 지시** | ★☆ | 딱 1건(룬워드 제작 규칙)만 직접 열람했고, 그 내용이 공식위키·팬데이터의 독립 서술과 **정합**하는 것을 확인한 뒤에만 보조 인용했다(§6-4). 그 외 이 사이트의 내용은 이번 문서에 반영하지 않았다 |
| **N/F** | 확인 못 함 | — | 추측하지 않고 표기만 남긴다. §12 에 총괄 |

### 오염 배제 기록

| 후보 | 판정 | 근거 |
|---|---|---|
| `mejoress.com` (예: "Hero Siege Potions Guide") | **원천 배제** — 접속하지 않음 | 과제 지시가 사전에 지목한 "beginner to pro"류 AI 생성 의심 사이트 패턴과 일치하는 제목·구조. 다른 출처로 이미 Potions 데이터를 확보했으므로 굳이 열람해 검증할 필요가 없었다 |
| `herosiege.fandom.com` | **직접 인용 최소화** | WebFetch 전량 402 차단 + pre-2.0 잔존 콘텐츠 혼재 위험(위 표) |
| "Hero Siege 2" 라는 별도 타이틀 | **존재 자체를 배제** | §0 서두 참조 — Steam 앱 하나, 공식 사이트 어디에도 별도 후속작 언급 없음. 커뮤니티가 2.0 버전을 구어체로 부르는 것으로 판단 |
| `herosiegewiki.com` | **1건만 교차검증 후 제한적 인용** | 코디네이터 지시에 따름(§6-4 각주) |

이번 조사에서 WebSearch/WebFetch **약 45회** 수행.

---

## 1. 장비 슬롯 구조

[공식위키]가 명시하는 장비 슬롯은 다음 10종(문서 원문은 "eleven equipment slots"라 적었으나 실제 나열은 10개뿐이다 — 아래 각주 참조):

| 슬롯 | 비고 |
|---|---|
| 헬멧(Helmet) | |
| 브레스트플레이트(Breastplate, 갑옷) | |
| 부츠(Boots) | |
| 장갑(Gloves) | |
| 무기(Weapon) | 검·도끼·둔기·창·활·총·지팡이 등 [공식위키]가 "Weapons 16종"으로 묶어 분류(§1-1) |
| 차암(Charm) | 인벤토리 점유가 아니라 **전용 골드색 슬롯**(구버전과 다른 처리, §6-3) |
| 목걸이(Amulet) | |
| 반지(Ring) | |
| 벨트(Belt) | |
| 물약(Potion) | |

> **슬롯 수 불일치(N/F)** — [공식위키] 원문은 "eleven equipment slots"라 쓰면서 정작 10개만 나열했다. 이번 조사에서 확인한 세트 아이템 목록(§5)에는 **Shield(방패)** 를 장착 부위로 쓰는 세트가 다수 있다("Aztec Ward", "Sacred Aegis", "Justiciar's Thunder Wall" 등) — 방패가 무기 슬롯과 별개의 11번째 슬롯(또는 무기 슬롯이 주무기+보조 2슬롯으로 나뉘는 구조)일 가능성이 높지만, 이번 세션에서 "무기+방패가 동시에 몇 슬롯을 쓰는가"를 1차 문서로 확정하지 못했다(N/F, §12).

### 1-1. 무기 카테고리 — 16종

[공식위키] `Items` 허브 페이지가 명시하는 무기 종류: **Swords, Daggers, Maces, Axes, Claws, Polearms, Chainsaws, Staves, Canes, Wands, Books, Spellblades, Bows, Guns, Flasks, Throwing Weapons**.

- **Flasks 가 무기 카테고리에도 등장**한다 — §8 의 소모품 "Flask"(포션류)와 이름이 겹치는데, 무기 목록의 Flask 는 투척형 무기(예: "Spirit Urn", "Doomweed Vial" 등 §5 세트 아이템에서도 무기처럼 취급됨)로 보이고, 소모품 Flask 는 마시는 버프 아이템이다 — **동명이의 두 축**으로 판단되나 완전히 확정하지는 못했다(N/F)
- Books·Spellblades·Canes 는 캐스터 계열, Chainsaws 는 이 게임 특유의 콤보 클래스(예: Redneck — §5 "Lumberjack's Forestry Gear" 세트 참조) 전용 무기로 추정된다

### 1-2. 방어구·장신구·기타 — [공식위키] `Items` 분류 그대로

| 대분류 | 목록 |
|---|---|
| 방어구 5종 | Helmets, Body Armors, Gloves, Boots, Shield |
| 장신구 3종 | Amulets, Rings, Belts |
| 특수 4종 | Charms, Relics, Glyphs, Potions |
| 잡화 5종 | Keys, Materials, Socketables, Consumables, Collectibles |
| 별도 | Runewords(제작 결과물이라 베이스 아이템 목록과 별도 취급) |

**Glyphs**(부적류로 추정)는 이번 세션에서 개별 페이지를 확보하지 못해 상세가 N/F 로 남는다.

---

## 2. 능력치·아이템 레벨·난이도 — 드롭의 기반 축

### 2-1. 능력치 5종

**Strength / Dexterity / Intelligence / Vitality / Energy**[공식위키] — [공식위키] `Getting Started` 가이드는 실전 배분 비율까지 제시한다:
- 캐스터 계열: 지능 40% · 활력 40% · 에너지 20%
- 물리 계열: 힘 35% · 민첩 10% · 활력 50% · 에너지 5%

### 2-2. 아이템 레벨 = Act × 난이도

> "Item Level is determined by which act you are in and what difficulty level you are on. The stats of a piece of equipment is determined by its Item Level."[공식위키]

즉 D2 식의 몬스터별 ilvl 이 아니라 **"지금 있는 챕터(Act) + 난이도"라는 두 좌표만으로 아이템 레벨이 정해진다** — 몬스터 개체마다 레벨이 다른 D2·PoE1 보다 훨씬 거친 격자다. 월드는 **4개 Act**로 구성된다(예: Act1 Town of Inoya~King's Throne, Act2 Danethorpe~Deaths Breach, Act3 Mos'Arathim~Tomb of the Fallen King, Act4 Dhorn Farum~Lair of Corruption)[공식위키/검색].

> **예외** — Satanic·Set·Angelic 등급 아이템은 **고정 스탯**이라 이 규칙 밖에 있다(§3)[공식위키].

### 2-3. 난이도 7단 — Normal → Nightmare → Hell 1~5

| 난이도 | 해금 조건 |
|---|---|
| Normal | 기본 제공 |
| Nightmare | Normal 에서 Mevius(보스) 처치 |
| Hell 1 | 보스 6종(Gurag·Reaper·Anubis·Damien·Karp King·Satan)을 Normal/Nightmare 에서 처치 + Nightmare 에서 Mevius 처치 |
| Hell 2 | Hell 1 에서 Mevius 처치 |
| Hell 3 | Hell 1~2 에서 Mevius 처치 |
| Hell 4 | Hell 2~3 에서 Mevius 처치 |
| Hell 5 | Hell 3~4 에서 Mevius 처치 |

([공식위키] `Difficulty`) — 각 Hell 단계는 몬스터 생명·피해·방어와 **매직 파인드(Magic Find)** 를 동시에 밀어올린다:

| 난이도 | 몬스터 생명 | 몬스터 피해 | 몬스터 방어 | Magic Find |
|---|---|---|---|---|
| Hell 2 | +400% | +15% | +4% | +200% |
| Hell 3 | +850% | +25% | +8% | +400% |
| Hell 4 | +1500% | +40% | +12% | +575% |
| Hell 5 | +2250% | +55% | +16% | +825% |

(Hell 1 수치는 이번 세션에서 표에 못 실었다, N/F) — **몬스터 강함과 매직 파인드가 같은 축에 함께 실려 오른다**는 것이 확인된 구조다.

> ⚠ **이 표는 시즌 10(2026-08-21) 개편 이전 상태다.** [공식위키] `Difficulty` 페이지가 아직 갱신되지 않았고, 시즌 10 패치노트는 "Nightmare 가 Hell Tier 1 이 되고 Hell 은 Hell Tier 4.5 에 해당한다"며 최상단에 **`Inferno`** 를 둔다 — 경위는 [00_overview.md §5-3](00_overview.md#5-3--시즌-10이-이-표를-갈아엎었다--현행은-미확정). 아래 수치는 **구조 대조용**으로만 읽는다. Uber 보스(엔드게임 보스류)의 확정 드롭률도 난이도에 정비례한다 — Hell 1 15% → Hell 2 30% → Hell 3 50% → Hell 4 75% → **Hell 5 100%**[공식위키].

---

## 3. 희귀도 체계 — 색상 등급 8단 + 품질 접두 4종

### 3-1. 두 개의 독립 축

이번 조사에서 확인된 것은 diablo2 조사(`diablo2/02_items.md §2`)가 정리한 "3개의 서로 다른 축" 구도와 유사하게, Hero Siege 도 **최소 2개의 독립 축**을 갖는다는 것이다.

**축 A — 색상 희귀도 등급(=드롭되는 개체의 "종류")**: 몇 개의 접사를 가지는가, 고정 스탯인가 랜덤인가를 가른다.
**축 B — 품질 접두(Superior/Exceptional/Astral/Quantum)**: 같은 베이스 아이템에 얹히는 "질" 롤로, **추가 접사 슬롯 +1~+4**를 부여한다[팬데이터].

두 축이 diablo2 의 "베이스 품질 vs 개체 품질 vs 희귀도" 만큼 명확히 분리 서술된 1차 문서를 확보하지는 못했지만, 접사 데이터([팬데이터] affixes 페이지)가 "Superior/Exceptional/Astral/Quantum 접두사는 강화 방어/피해 + 추가 접사 +1~+4개를 준다"고 명시하는 것과, 희귀도 표([팬데이터] rarity 페이지)가 별개로 "Superior(1~2 접사)"를 **색상 등급 2번째 단계**로도 쓰는 것을 볼 때 — **"Superior"라는 이름이 두 축에 동시에 쓰이고 있어 겹쳐 보이는 것일 가능성이 높다**([추정], 아래 §3-3 참조). 확정하지 못했으므로 §12 N/F 로 남긴다.

### 3-2. 축 A — 색상 희귀도 등급, 출처별 서술 불일치를 그대로 병기

**세 개의 서로 다른 출처가 서로 다른 순서/색상을 보고한다.** 지어내지 않고 전부 병기한다.

| 출처 | 순서(낮음→높음) | 비고 |
|---|---|---|
| **[팬데이터] `rarity` 페이지**(가장 구조화된 표) | Common(접사 0-1) → Superior(1-2) → Rare(2-3) → Mythic(3-6) → Satanic(거의 고정="유니크") → Heroic(고정+일부 랜덤 Unholy 스탯) → Satanic Unholy(고정+특정 풀 랜덤) → Satanic Angelic(고정+특정 풀 랜덤) | 색상 정보 없음. "접사 개수는 대략적 범위"라고 스스로 명시 |
| **[스팀토론] Primalsoul 답변**(2번째 스레드 인용, 최신 추정) | Common(White, ~2스탯) → Magic(Blue, ~3) → Rare(Yellow, ~4+특수효과) → Legendary(Orange, ~5+특수효과) → Mythic(Purple, ~5+특수효과) → Satanic(Red, ~5+특수효과) | 헬멧/갑옷 50% 확률로 클래스 전용 "Special Gear Synergy" 언급 |
| **[스팀토론] TechTerror 답변**(스토어 페이지 인용, "Mythic 이 최근 추가됐다"는 코멘트로 볼 때 더 구버전) | Normal(white) → Superior(blue) → Rare(gold) → Legendary(orange) → Mythic(purple) | "Loot system with: normal, superior, rare and legendary loot!" 라는 스토어 문구를 직접 인용 |
| **[스팀토론] 3번째 스레드** | "8개 색상: White, Grey, Blue, Yellow, Purple, Red, Green + Angelic" | 순서 불명, Grey·Green 은 다른 어떤 출처에도 없음 — 신뢰도 최하 |

**공통적으로 확인되는 것**: ① White/Common 이 최하단, ② Purple/Mythic 이 색상 축 상단, ③ **Satanic(Red)** 이 "핸드크래프트 유니크 진입점"이라는 것. **확정하지 못한 것**: "Magic"과 "Superior"가 같은 2단계를 가리키는 이명(異名)인지 서로 다른 버전의 명칭 변경 결과인지, "Legendary/Orange"가 Rare 와 Mythic 사이 어디에 정확히 들어가는지, Grey/Green 색상의 정체.

### 3-3. Satanic 이후 — "유니크 계열"의 내부 구조

무기 실측 테이블(§5-1)에서 직접 확인한 바로는, "Satanic" 은 색상 등급 하나가 아니라 **핸드크래프트 아이템 전체를 아우르는 상위 카테고리**로 쓰이고 있고, 그 밑에 하위 구분이 있다:

```
Satanic (일반 유니크, "Satanic Tier")
  └ Satanic Set (세트에 속한 유니크, "Satanic Set")
Heroic (Satanic 보다 상위 레벨대, 대체로 Lv90+)
Unholy / Angelic (최상위, Lv95~100, 서로 형제 관계로 보임)
```

이는 [공식위키] `Items`·[스토어]가 공통으로 "Loot ranges from randomized magic items all the way to handcrafted Satanic, Set, Heroic, Angelic and Unholy items" 라고 **Set 을 Satanic 과 나란히 쓰는 것**과도 부합한다 — "Set"이 독립 희귀도가 아니라 **Satanic 계열 안의 하위 태그**라는 읽기다([추정], 완전히 확정하지는 못함).

### 3-4. Unholy Stat — Satanic Dice 로 재굴림되는 4번째 슬롯

Heroic/Unholy/Angelic 등급 아이템은 **"Unholy Stat"** 이라는 별도 슬롯을 하나 더 가진다 — "모든 장비 타입에 걸친 스탯 풀에서 무작위로 뽑히는" 슬롯이고, **Satanic Dice** 소모품으로 이 슬롯만 따로 리롤할 수 있다[공식위키]. 즉 Heroic 이상 등급은 "④ 고정 스탯 3개 내외 + ⑤ Unholy Stat 1개(리롤 가능)" 구조로, **완전 고정도 완전 랜덤도 아닌 혼합형**이다 — diablo2 의 유니크(§5-1이 "몇몇 항목만 구간 롤을 갖는다"고 정리한 것)와 같은 종류의 절충이다.

---

## 4. 접사(Affix) 체계

### 4-1. 규모 — Prefix 461 + Suffix 434 = 895

[팬데이터]가 직접 집계한 수치: **Prefix 461종 + Suffix 434종 = 총 895종**(원문은 "653/896 Affixes have values"라 자체 진행 중임을 명시). 이는 diablo2 문서(`diablo2/02_items.md §3-3`)가 지적한 "같은 효과를 레벨 구간별로 여러 티어로 쪼갠다" 구조와 **정확히 같은 패턴**이다 — 예:

**경험치 증가 접두사 사다리**
| 이름 | 값 |
|---|---|
| Battlescarred | +1% |
| … (중간 티어 다수) | — |
| Warlegend | +[1-5]% |

**물리 피해 접두사 사다리**
| 이름 | 값 |
|---|---|
| Savage | +[3-7] |
| … | — |
| Ferocious | +[18-24] |

**명중률(Attack Rating) 접두사 사다리**
| 이름 | 값 |
|---|---|
| Owl | +[10-20] |
| … | — |
| Eagle | +[200-400] |

**전 스킬 접두사 사다리**
| 이름 | 값 |
|---|---|
| Peasant's | +1 All Skills |
| … | — |
| Archangel's | +[2-5] All Skills |

저항(화/냉/독/전/비전) 각 5단계 사다리, 속성(힘/민첩/에너지/지능) 접미사 사다리(+[1-5]~+[8-30]) 도 동일 패턴으로 존재한다[팬데이터]. **다른 아이템 타입은 같은 접사라도 다른 값 범위를 가질 수 있다**는 것도 [팬데이터]가 명시한다 — 즉 접사 이름은 공유되지만 롤 범위는 슬롯 종속적이다(N/F: 정확한 슬롯별 배율표는 확보 못함).

### 4-2. 품질 접두 4종 — 추가 접사 슬롯을 파는 접두사

| 접두 | 효과 |
|---|---|
| Superior | 강화 방어/피해 + 추가 접사 +1 |
| Exceptional | 강화 방어/피해 + 추가 접사 +2 |
| Astral | 강화 방어/피해 + 추가 접사 +3 |
| Quantum | 강화 방어/피해 + 추가 접사 +4 |

([팬데이터]) — diablo2 의 Superior 품질(`§2-1`, "+5~15% 강화방어/피해")과 이름·역할이 흡사하지만, Hero Siege 쪽은 **접사 슬롯 자체를 파는 상위 4단계 사다리**로 확장돼 있다는 점이 다르다. §3-1 에서 지적했듯 이 "Superior" 접두와 색상 등급의 "Superior" 단계가 동일 개념의 다른 표현인지는 미확정.

### 4-3. Item Level 게이팅 — 정확한 공식은 N/F

§2-2 가 "아이템 레벨 = Act × 난이도"임을 확인했지만, **이 아이템 레벨이 정확히 어떤 접사 풀을 여는지(D2 식 alvl 게이트에 대응하는 것)는 1차 문서로 확정하지 못했다.** 접사 사다리(§4-1)가 존재한다는 것 자체가 레벨 게이팅이 있다는 방증이지만, "요구 레벨"과 "접사 티어"를 잇는 정확한 수식은 N/F.

---

## 5. 세트·고유(Satanic~Angelic) 아이템 — 실제 목록

### 5-1. Satanic 무기 실측 — 검류 전체 리스트

[공식위키] `Swords` 페이지에서 직접 확보한 **검류 전 계보**(레벨·데미지·APS·DPS·핵심 옵션까지 원문 그대로):

| 구간 | 아이템 예시(레벨) | 핵심 옵션 |
|---|---|---|
| Satanic (Lv11~94) | Crystal Infused Sword(11), Ashbringer(37), Gut's BFS(52), Godfather(65), Gut's HFS(94) | +180~680% 강화피해, 크러싱블로/디들리블로 확률, 원소데미지 고정치, "Whirlwind on attack" 류 온히트 프록 |
| Satanic Set (Lv51~97) | Nomad's Sandslicer(51), Muramasa(83), Masamune(85), Daisy(97) | 세트 소속 무기 — §5-2 |
| Heroic (Lv93~100) | Bonetti's Rapier(93), Arch Angel's Phase Blade(100) | +475~850% 강화피해 |
| Unholy (Lv97~100) | Gabriel's Broken Resolve, The Hope Ender, Blood Moon Crescent, Stofflix Cooking Cleaver | +575~975% 강화피해, "Demon Form on struck" 류 특수 변신 프록 |
| Angelic (Lv95~97) | St. Mika's Zweihänder, St. Gabriel's Retribution | +725~920% 강화피해, "Divine Storm/Gabriel's Glory on strike" |

([공식위키] `Swords`) — **강화피해%가 등급이 오를수록 계단식으로 뛰고(Satanic 180%대 → Angelic 900%대), 등급마다 고유 이름의 온히트/온캐스트 프록이 하나씩 실려 있다**는 것이 이 게임 유니크 무기의 정체성 부여 방식이다. `Body Armors` 페이지도 동일한 D~SS 서브티어 구조(Satanic Lv10→74, Satanic Set/Heroic 은 SS, Unholy/Angelic 최상단)를 보여 검류와 같은 문법을 공유한다[공식위키].

### 5-2. 세트 아이템 — 확보한 실제 세트 60여 종

[팬데이터] `/items/sets` 페이지에서 세트명·구성 부위·클래스·발동 보너스까지 **원문 그대로** 대량 확보했다. 세트 발동 규칙: **"세트 전체 개수 −1 이상 장착 시 보너스 발동, 단 2피스 세트는 2개 모두 필요"**[스팀토론] — diablo2 의 "2/3/4/5피스 계단형"(§4-1)과 달리 **"거의 다 맞추면 발동"** 이라는 더 관대한 규칙이다.

대표 예시(전체 60여 종 중 클래스·구성 다양성 위주로 발췌):

| 세트명 | 클래스 | 구성 부위 | 핵심 보너스(발췌) |
|---|---|---|---|
| Death's Toll | (범용) | 장갑·투구·폴암(Death's Scythe) | 전스킬+2, 공속+60%, 물리피해+25% |
| Aztec's Mystery | Amazon | 목걸이·차암·투구·방패 | 독데미지+650, 클래스전스킬+3, 적독저항−25% |
| Gladiator's Glory | Marauder | 부츠·투구·둔기·방패 | 이속+25%, 클래스전스킬+4, 공속+30% |
| Blood-letter's Armament | Plague Doctor | 갑옷·부츠·장갑·투구 | 클래스전스킬+4, 공격범위+15%, 생명재생25% |
| God of the Elements | Shaman | 목걸이·부츠·장갑·투구 | 클래스전스킬+5, 카오스 토템 소환, 비전저항+75% |
| Blood Bond | Butcher | 벨트·갑옷·투구·검(Daisy) | 클래스전스킬+4, 생명흡혈+15%, 공속+30% |
| Death Lord's Legacy | Necromancer | 갑옷·부츠·차암·투구 | 비전데미지+450, 클래스전스킬+5, 적비전저항−25% |
| Gabriel's Devotion | Demon Slayer | 목걸이·갑옷·총×2·투구 | 클래스전스킬+6, 치명확률+20%, 치명피해+75% |
| Justiciar's Thunder Raiment | Paladin | 벨트·갑옷·부츠·방패 | 번개데미지+450, 클래스전스킬+3, 체인라이트닝 |
| Nobunaga's Empire | Samurai | 목걸이·갑옷·투구·둔기 | 클래스전스킬+4, 폭발범위+75%, 전능력치+30 |
| Marksman's Hunting Gear | Marksman | 갑옷·활·차암·장갑 | 클래스전스킬+3, 명중+825, 거대폭발화살 소환기 |
| Viking's Demise | Viking | 도끼·부츠·투구 | 힘+50, 명중+1250, 클래스전스킬+5 |
| Mevius' Eye of Chaos | (범용, 보스명 관련) | 갑옷·부츠·장갑·투구 | 전스킬+15, 마나+500, **전저항−125%**(페널티형 세트) |

(전체 목록은 [팬데이터] `/items/sets` 원문 참조 — 이 문서에는 지면상 대표만 발췌했다.) **관측된 패턴**:
- 거의 모든 세트가 부위 3~4개로 구성되고, **클래스 전용 세트가 압도적으로 많다**(22개 클래스 각각에 최소 1~2종)
- 보너스 항목 수는 세트당 **3~6개**로, 항상 "전스킬(클래스 한정 또는 전체)" 하나를 포함
- **Mevius' Eye of Chaos** 처럼 강력한 이득과 동시에 명시적 페널티(전저항 −125%)를 끼워 넣는 "트레이드오프형 세트"도 존재한다 — diablo2 문서(§10-2)가 지적한 "세트=편성을 인질 잡는 구조"와 달리, 이쪽은 **세트 자체가 리스크/리워드 결정**이 되는 변주다

### 5-3. Satanic 세트가 아닌 순수 무기 세트 — Masamura

칼 두 자루(Muramasa + Masamune)만으로 이루어진 **무기 전용 세트**도 확인된다 — "Masamura": 공격력+25%, 공속+40%[팬데이터]. 방어구 없이 **무기만으로 세트가 성립하는 사례**다.

---

## 6. 소켓 계열 — 룬·젬·주얼·차암·룬워드

### 6-1. 룬 — 30여 종, Diablo 2 룬 이름을 그대로 재사용

[공식위키] `Runes` 페이지가 명시하는 전체 룬 리스트(요구Lv 순, 티어 D→S):

```
D: Old, Ol, Tor, Naf, Uth, Eth, Tul
C: Rex, Ert, Thal, Ymn, Nut, Del, Hel, Io, Lum, Co, Fel
A: Lem, Pul, Um, Mal, Ist, Gul, Vex
S: Qi, Xo, Sur, Ber, Jah, Drax, Zed
```

효과는 대부분 단일 스탯(강화피해%, 명중, 생명흡혈%, 저항%, 속성 스킬 데미지%, 크러싱/디들리블로 확률 등)이 요구레벨에 비례해 커지는 **선형 사다리**다[공식위키].

> **Diablo 2 와의 직접 연관** — `Hel, Io, Lum, Fel(Fal), Lem, Pul, Um, Mal, Ist, Gul, Vex, Sur, Ber, Jah` 는 **D2 의 실제 룬 이름을 그대로 가져온 것**이다(D2 는 El~Zod 33종). 이름 순서(요구 레벨이 오를수록 알파벳이 뒤로 가는 패턴)까지 D2 룬 사다리와 흡사해, Hero Siege 의 소켓 시스템이 **D2 룬 체계를 의도적으로 계승**했다는 것이 이번 조사에서 새로 확인된 구조적 사실이다. 다만 **정확한 룬 총수는 출처마다 다르다** — [공식위키] `Runes` 표는 31개를 나열(헤더는 "30"이라 자체 표기), [Fandom] 스니펫은 "40종"이라 서술한다 — 어느 쪽이 최신인지 확정 못함(N/F).
> 업그레이드 — 같은 룬 3개를 조합해 상위 랭크 룬 1개를 만드는 것이 [Fandom] 스니펫에서 확인되나 정확한 배율(D2 의 "El→Eld"류 승급 사다리와 같은 구조인지)은 N/F.

### 6-2. 젬·주얼 — 문서화가 빈약

[공식위키] `Socketables` 페이지에는 **젬 1종(Moonstone Gem, Tier SS, Lv100 — 공속+7%, 힘+7, 민첩+7)**, **주얼 1종(Agathetheum Jewel, Tier B, Lv30 — 반사피해+75%)**만 등재돼 있다 — 이번 조사에서 **전체 목록을 확보하지 못했다**(N/F, 위키 자체가 스텁 상태로 추정). §7-2 의 Jewelcrafting(시즌17 신설)이 이 빈 자리를 채우는 최근 시스템으로 보인다.

### 6-3. 차암(Charm) — 5계열, 전용 20슬롯

[공식위키] `Charms` 5계열:

| 계열 | 등급 | 예시 |
|---|---|---|
| Satanic Charms | D~SS, Lv1~100 | Crow's Feather, Annihilator(이속+15%) |
| Satanic Set Charms | — | Barrel of Explosives(폭발피해+[15-40]%, §5 "Demolition Expert" 세트 일부) |
| Heroic Charms | SS, Lv75~100 | Tarethiel's Ancient Wisdom(전스킬+1 + 쿨감) |
| Unholy Charms | SS, Lv100 | Finger of Despair(전스킬+3, 대신 전저항−50% — 트레이드오프형) |
| Angelic Charms | SS | Fire Melon(화염스킬+[4-6] + 화염피해) |

**차암은 일반 인벤토리 그리드가 아니라 인벤토리 1페이지 우측의 전용 골드색 슬롯(최대 20개)에 장착**한다는 것이 코디네이터가 사전 확인한 사실과 일치한다 — diablo2 의 "차암=인벤토리 격자를 잠식하는 자원 배분"(`diablo2/02_items.md §1-4`) 과 달리, **Hero Siege 는 차암 슬롯을 인벤토리와 완전히 분리**해 상호 잠식 딜레마를 없앴다.

### 6-4. 룬워드 — 정확한 조합표 확보

[팬데이터] `/runewords` 페이지에서 **베이스 아이템 타입 + 필요 룬 시퀀스**를 원문 그대로 확보(50종 이상 존재한다고 페이지가 명시, 아래는 발췌):

| 룬워드 | 룬 | 대상 아이템 |
|---|---|---|
| Malice | Uth, Ol, Eth | 클로/대거/소드/메이스/액스 |
| Shadow | Tul, Eth | 갑옷 |
| Divine Contemplation | Rex, Ert, Tul | 방패 |
| Lightforge | Naf, Sal, Uth | 투구 |
| Quickstep | Ymn, Del | 부츠 |
| Torment | Del, Io | 완드/대거/북/스펠블레이드 |
| Revelation | Lum, Io, Sal, Eth | 스태프/케인/스펠블레이드/북 |

(코디네이터가 사전 확인한 "Quickstep — Ymn & Del — Boots" 가 이 표와 정확히 일치 — §0 신뢰도 근거) 제작 규칙([공식위키]·[3자-교차] 교차 확인):
- 베이스는 **Common(White/Gray) 등급만** 가능
- **소켓 개수가 정확히 일치**해야 하고, **룬 삽입 순서가 정확히 일치**해야 완성된다
- **베이스 자체의 고유 옵션(예: 물리/번개 추가 데미지)이 완성된 룬워드에 그대로 승계**된다 — 즉 좋은 베이스를 쓰는 것이 필수는 아니지만 이득이 있다[3자-교차, 공식위키 서술과 정합 확인 후 채택]
- 소켓 개수가 안 맞는 베이스 문제를 푸는 **"Hel 룬 2개 + Perfect Gem 1개"** 조합 레시피가 존재(소켓 초기화·재설정용으로 추정)[3자-교차]
- Crafting Cube 의 "Clear Sockets" 로 완성된 룬워드/소켓을 초기화할 수 있다[스팀검색]

---

## 7. 강화·제작·개조 — 크래프팅 큐브·다이스·감바·오그먼트·주얼크래프팅·코덱스

Hero Siege 는 개조 도구가 Lootun(`lootun/02_items.md §5`, 10종 계단)만큼은 아니지만 **최소 6갈래**로 분화돼 있다.

| 도구/시스템 | 하는 일 | 비고 |
|---|---|---|
| **Crafting Cube** | 소켓 추가/초기화, 룬 조합, 각종 레시피(Angelic Gem·Chaos Gem·Elemental Gem 등 고급 젬 제작 포함) | 마을 어디서나 접근[스팀검색]. 레시피 예: Angelic Gem = Tarethium Core+Dark Matter+Demon Soulstone+Enchanted Sigil (크래프트가 1,869,000골드 상당)[팬데이터] |
| **Satanic Dice** | Heroic/Unholy/Angelic 등급의 **Unholy Stat 1개만** 재굴림 | §3-4 |
| **Gamba(도박 기계)** | Shrine 이 가끔 Gamba Machine 으로 스폰 → 10,000골드로 슬롯머신 3릴 스핀. 확률적으로 골드(15k~500k)·룬(Common/Satanic/Heroic)·Satanic 아이템(일반/S/SS 티어)·Angelic Key 획득. 약 10~14회 스핀 후 기계 파괴, 파괴 시 1/750 로 "Goburin's Head" 획득 | [팬데이터] — 순수 확률형 소모 컨텐츠 |
| **Weapon/Armor Augment(오그먼트)** | 무기에 이모블럼을 소모해 공격/캐스팅에 부가 효과(투사체 속도, 화상, 유탄 등) 부여. 방어구는 갑옷 전용으로 **Angelic Realm** 에서 부여. 전체 63종, 레벨 1~7 업그레이드(Angelic Key 소모, 7레벨 도달까지 총 22~27키)[팬데이터] | 스킬 자체를 바꾸는 게 아니라 "발동 트리거 + 이펙트"를 아이템에 얹는 시스템 — diablo2 의 룬워드/유니크 프록과 유사한 자리 |
| **Jewelcrafting** | 채집한 광석을 Prospect(선광)해 젬·주얼 제작 재료 획득[Fandom 스니펫] | §6-2 의 "젬/주얼 문서 빈약"을 신설 시스템이 메꾸는 것으로 추정. ⚠ 출처 스니펫은 **"시즌 17 신설"**이라 적었으나 **post-2.0 시즌은 조사 시점까지 10회뿐**이다([00_overview.md §9-1](00_overview.md#9-1-시즌-이력--20-이후-10회)) — pre-2.0 시절의 별도 시즌 번호이거나 스니펫 오류. 도입 시점 **N/F** |
| **Eternity Codex(코덱스)** | 특정 존을 일정 시간 **Satanic Zone(§9-3)으로 강제 전환**하는 소모 아이템. 코덱스 자체에 **최대 16종의 Heroic Orb 를 소켓**해 효과 강화(예: Brute=공격력+20%, Wisdom=마법스킬데미지+20%, Midas=매직파인드+50%) + **코덱스 전용 룬워드**(Codex of Experience=경험치, Codex of Rift=Unstable Dust 드롭, Codex of Chaos=로그 카오스 타워) 가능 | [팬데이터] — "아이템이 곧 그 판의 드롭 환경 자체를 바꾸는" 메타 아이템. 제작 레시피: Greater Unstable Dust 30 + Satanic Crystal Fragment 30 + Gold/Ruby/Jade/Tarethium Ore |

**증류하면**: 리롤(다이스)·순수 도박(감바)·확정 이펙트 부여(오그먼트)·소켓 재료 채집(주얼크래프팅)·메타 드롭 환경 조작(코덱스)이 **서로 다른 재료·서로 다른 화폐**로 완전히 분리돼 있다 — Lootun 처럼 "한 계단 위에 쌓인" 형태가 아니라 diablo2 크래프트 4계열(§6, Blood/Caster/Safety/Hitpower)처럼 **병렬로 갈라진 여러 개의 독립 시스템**에 가깝다.

---

## 8. 소모품·유물·펫·기타 장비 외 축

### 8-1. 유물(Relic) — 5기능형 분류

[공식위키] `Relics` 가 명시하는 5종류:

| 종류 | 정체 | 예시 |
|---|---|---|
| Passive | 상시 스탯 보너스, 레벨 비례 성장 | Barbed Shield(반사피해 Lv1 +10% → Lv10 +200%) |
| Chance-based | 킬/공격/캐스팅/피격 시 확률 발동 | Devil Skull(공격 시 8% 확률로 "Burst of Rage") |
| Ability | 액티브 시전형 | Apple Blast(사과 투척 → 폭발) |
| Follower | 소환수 소환 | (예시 미확보, N/F) |
| Orbital | 캐릭터 주위를 도는 오브젝트 소환 | (예시 미확보, N/F) |

레벨 1~10 성장형이라는 것이 확인되고, **유물 전용 별도 저장공간("Relic Storage")이 시즌10에 신설**돼 자유롭게 교체할 수 있게 됐다[스니펫].

### 8-2. 컬렉터블(Collectibles) — 보스 전용 드롭

보스 전용 드롭 6종이 확인된다: Gurag's Soul, Death's Sigil, Anubis' Ankh, Damien's Eye, Karp King's Bellybutton, Satan's Horn[공식위키]. **정확한 기능은 미확보**(N/F) — 페이지 자체가 스텁 상태.

### 8-3. 소모품 — 포션·플라스크

| 구분 | 예시 |
|---|---|
| Potions(Satanic) | Empty Bottle of Vodka(전스킬 일시 증가), Power of Void(시전 시 Comet 발사), Prismatic Potion(전저항 증가) 등 20종 가까이[공식위키] |
| Potions(Heroic) | Gold Inlaid Mysterious Potion(매직파인드+골드), Sung Lee's Flask of Carnage(공격 시 출혈) |
| Flasks(소모품, Satanic~SS) | Spirit Urn(마나흡혈), Ancient Mucus(독스킬데미지), Doctor's Potion(캐스팅속도+매직파인드, Satanic Set) |

### 8-4. 펫·미행 유닛 — 코스메틱 축과 스탯 축이 분리

- **Companion(동반자)**: 자동으로 골드·재료·룬·젤을 대신 주워주는 미행 유닛. 외형 커스터마이징 가능하나 **전투 스탯 기여는 확인 못함**(코스메틱/유틸 전용으로 추정)[공식위키]
- **Mercenary(용병)**: Knight/Archer/Magister 3종, **매직 파인드 스탯 보너스**를 제공하는 실전 전투 보조 유닛[공식위키] — 정확한 수치는 N/F

### 8-5. 윙(Wings)·코스메틱 — 스탯 없는 시즌/워프홀 보상

Wormhole(엔드게임 콘텐츠)과 시즌 보상은 "스킨·초상화·**날개**" 등 **순수 코스메틱**을 지급한다고 확인된다[검색] — "추가 고유 룬을 주는 대신"이라는 서술이 있어, **파워 인플레이션 없이 보상을 계속 공급하는 장치**로 설계된 것으로 읽힌다. 스탯이 붙은 날개/펫 장비인지는 확인 못함(N/F).

---

## 9. 드롭 구조 — 난이도·몬스터 타입·존·거래

### 9-1. 몬스터 타입 4종 — 챔피언/에인션트/스페셜/리전

몬스터는 스폰 시 **Champion / Ancient / Special / Legion** 4종 중 하나(또는 없음)로 태그되며, 각 타입마다 별도 모디파이어 풀에서 효과를 물려받는다. 보스는 이 시스템 밖이다[공식위키].

- **Champion**(Normal/Nightmare 전용): 피해+35%, 명중+75%, 공속+80%, 이속+25% — Hell 난이도에는 없고 대신 "Fallen Angel" 등 Hell 전용 태그로 대체
- **Ancient**: 17종의 하위 모디파이어 풀. 속성 전환형(화/냉/전/마법/독), 방어+125%/받는피해−75% 같은 생존형, 그리고 **드롭 직결형**이 섞여 있다 — "Treasure Gobbler"(매직파인드+500%), "Guardian of Hell"(매직파인드+275%, 사망 시 아크데몬 평원 포탈 스폰), **"Fallen Angel"(Hell 전용, 사망 시 Angelic Key 드롭 확률)**

> **Fallen Angel** 사례가 보여주듯, **최상위 등급(Angelic) 재화의 드롭 경로 자체가 특정 몬스터 태그에 못박혀 있다** — D2 의 "테러존"(diablo2 문서 §9)처럼 지역이 아니라 **몬스터 개체의 랜덤 태그**가 파밍 경로를 결정하는 방식이다.

### 9-2. Chaos Pillar — 능동적으로 위험을 사서 좋은 드롭을 사는 구조

Chaos Pillar 를 활성화하면 몬스터 웨이브가 스폰되고 각 필러가 고유 모디파이어를 부여한다. **Common·Uncommon 필러는 무료, Rare·Epic·Satanic·Angelic 필러는 Chaos Key 필요**(맵 전역에서 드롭)[공식위키]. 시즌7 신설.

### 9-3. Satanic Zone — 시간 한정 드롭 상한 상승

**매시간 무작위 1개 존이 "Satanic Zone"으로 전환**되고, 그 존(및 그 안의 던전)에 버프/디버프가 랜덤 적용된다[공식위키]. 난이도별 적 생명 증가폭도 확인된다(Hell1 +0% → Hell5 +225%). 매직파인드 버프 3단계(Artifact Digger~Excavator, +55~170%)와 "Loot Goblin" 계열(최대 루팅 개수·룬 드롭 확률 증가) 등 **루팅에 특화된 버프 풀**이 별도로 존재한다.

> diablo2 문서(§9)가 인용한 D2R "테러존"과 **구조적으로 거의 동일**하다 — 매시간 회전하는 무작위 지역이 그 순간 최상급 드롭 상한으로 격상되는 장치다. Hero Siege 쪽이 D2R 보다 먼저 이 구조를 썼는지 나중에 썼는지는 확인하지 못했다(N/F, 시점 비교는 이번 조사 범위 밖).

### 9-4. 거래·경제

- **마켓플레이스**: 플레이어 간 아이템 거래 가능, **등록 수수료 1% + 골드 수령 수수료 10%**[공식위키]
- **메일박스**: 개인 간 아이템/골드 전송[공식위키]
- **Odyssey 모드**: 솔로 전용, **마켓/거래/메일박스 전부 비활성화**. Odyssey 캐릭터는 일반 모드로 전환 가능하지만 공유 창고 아이템·골드는 Odyssey 쪽에 남는다[공식위키] — "거래 완전 차단형 하드코어 경제 격리 모드"
- **Seasonal**: 시즌 캐릭터는 시즌 캐릭터끼리만 멀티플레이, 시즌 종료 시 전원 비시즌으로 전환[공식위키]
- **Hardcore**: 사망 시 영구 사망, 하드코어끼리만 멀티플레이[공식위키]

### 9-5. 채집(Mining) — 광석 6종, 난이도 게이팅

| 광석 | 요구 채광레벨 | 등장 난이도 |
|---|---|---|
| Copper | 0 | Normal |
| Iron | 125 | Normal, Nightmare |
| Gold | 225 | Normal, Nightmare, Hell |
| Ruby | 500 | Nightmare, Hell |
| Jade | 750 | Nightmare, Hell |
| Tarethium | 1000 | Hell 전용 |

([공식위키] `Mining`) — 광석 자체의 용도(젬 제작·코덱스 제작 재료 등)는 §6-2·§7 에서 부분 확인됐지만 전체 소비처 목록은 N/F.

---

## 10. (구버전) pre-2.0 — 확인 가능한 범위만

이번 조사는 **post-2.0(현행) 구조에 조사 자원 대부분을 투입**했다. pre-2.0(2014~2023-10-02) 아이템 구조는 다음 정성적 서술만 확보했고, 구체적인 인벤토리 형태·접사 체계는 **1차 자료를 찾지 못해 N/F 로 남긴다**:

- 원래는 **트윈스틱 로그라이크·웨이브 서바이벌**에 가까웠고, 한 버튼에 스킬을 몰아 꾹 누르는 것이 핵심 조작이었다는 회고가 다수 확인된다[스팀토론] — 지금의 "클래스별 스킬트리 + 자동전투 없는 액션 ARPG" 와는 코어 게임플레이 자체가 다르다
- 2.0 패치는 "기존 캐릭터·아이템 세이브를 전량 와이프"할 만큼 **데이터 구조 자체가 바뀌었다**는 것이 공식 발표로 확인된다[스팀검색] — 즉 지금의 희귀도/접사/세트 체계가 pre-2.0 과 **연속적으로 이어진 것이 아니라 데이터 레벨에서 단절**됐을 가능성이 높다
- 인벤토리가 "그리드형이었는가 슬롯형이었는가", 룬워드·소켓 시스템이 pre-2.0 에도 존재했는가는 이번 세션에서 확인하지 못했다(N/F)

**결론**: pre-2.0 은 "같은 이름의 다른 게임"에 가까울 만큼 구조가 갈렸을 가능성이 있으나, 이번 조사에서 그 정도를 정량적으로 보여줄 자료는 확보하지 못했다.

---

## 11. 본작 시사점

> 본작(TheSevenSimulationRPG)은 파티 3인 자동전투 방치형 파밍 RPG. 접속 중 = 원정 실시간 전투 + 아이템 정리, 오프라인 = 파견. 참고작 1순위 Lootun, 아이템 철학 참고작 Diablo 2.

1. **"차암을 인벤토리 밖 전용 슬롯으로 뺀 것"(§6-3)은 본작이 세트포인트·소모품 슬롯을 설계할 때 참고할 저비용 해법이다.** diablo2 의 차암은 인벤토리 격자를 잠식해 "차암이냐 전리품 공간이냐"라는 원치 않는 트레이드오프를 만들었는데(diablo2 문서 §1-4), Hero Siege 는 차암을 **처음부터 전용 20슬롯**으로 분리해 이 갈등 자체를 없앴다. 본작이 아이템 정리(컨셉 락 표의 "접속 중" 활동)를 설계할 때 "새 파워 축을 넣을 때마다 기존 인벤토리 압박과 경합시킬 필요는 없다"는 사례로 쓸 수 있다.
2. **세트 발동 규칙 "전체−1개면 발동, 2피스만 예외"(§5-2)는 diablo2 의 Tal Rasha's 문제(본작이 세트효과를 전술카드로 이관한 근거, diablo2 문서 §10-2)에 대한 실제로 존재하는 완화책이다.** "풀세트를 다 갖춰야 완전체"인 D2 식과 달리, Hero Siege 는 **한 부위를 자유롭게 바꿔도(세트 개수−1까지는) 보너스가 유지**된다 — diablo2 문서가 "슬롯 하나를 바꾸는 순간 전부 사라진다"고 지적한 문제를 시스템 규칙 하나로 완화한 사례다. 본작이 세트/조합 보너스를 다시 검토할 일이 생기면, "전부 아니면 0" 대신 이 완화 규칙이 저비용 대안이 된다.
3. **Mevius' Eye of Chaos·Finger of Despair 같은 "이득과 동시에 명시적 페널티를 끼워 넣는 세트/차암"(§5-2, §6-3)은 diablo2·Lootun 에는 약한 축이다.** 전저항 −125%, 전저항 −50% 같은 노골적인 트레이드오프가 세트/차암 단위로 존재한다는 것은, 강력한 보너스를 "무조건 좋은 것"이 아니라 **빌드를 강제하는 리스크**로 만드는 설계가 실전에서 쓰인다는 증거다 — 본작 유니크/세트 가드레일이 페널티형 옵션을 허용할지 검토할 때 참고할 실물 사례.
4. **몬스터 태그(Fallen Angel)가 특정 최상위 재화(Angelic Key)의 유일한 드롭원이 되는 구조(§9-1)는 "지역이 아니라 개체가 파밍 경로를 정하는" 세 번째 변주다.** diablo2 의 테러존(지역 단위, §9)·Hero Siege 의 Satanic Zone(§9-3, 이 역시 지역 단위) 과 달리, Fallen Angel 은 **몬스터 스폰 시 랜덤 태그**로 걸린다 — "어디로 갈까"가 아니라 "누가 나올까"의 확률로 타겟파밍을 만드는 방식이다. 본작이 원정 창구 하나(컨셉 락 따름정리 2)라는 제약 안에서 타겟파밍 결정을 만들고 싶다면, 지역 단위 편향보다 **몬스터/조우 단위 랜덤 태그**가 "어느 스테이지로 보낼지"의 결정을 늘리지 않고도(스테이지는 그대로, 조우 결과만 바뀜) 파밍 결정을 만드는 대안이 될 수 있다.
5. **오그먼트(Weapon/Armor Augment, §7)는 "장비가 스킬의 발동 트리거를 사는" 축이다.** 스킬 자체를 바꾸는 게 아니라 "공격 시 화상을 남긴다" 류의 부가 효과를 장비에 이식하는 시스템은, PoE1 의 "스킬=드롭 아이템"(poe1 문서)만큼 급진적이지 않으면서도 **파밍이 전투 행동의 질감을 바꾸는 접점**을 만든다. `skill_design.md` §7·`GAME_DESIGN.md` §10 의 미확정 과제 "스킬의 파밍 접점"에 PoE1보다 훨씬 저비용인 대안으로 등재할 만하다 — 스킬 자체는 그대로 두고 "이 스킬이 맞았을 때 추가로 무엇이 발동하는가"만 장비 아이템에 얹는 방식이라, 본작의 "무기 개체는 스킬 전용 파워를 안 가진다" 가드레일(diablo2 문서 §10-3 인용)과도 정면 충돌하지 않는다 — 오그먼트가 **스킬 자체가 아니라 스킬의 "발동 후" 결과에만 관여**하기 때문이다.

---

## 12. 출처 · 미확인(N/F) 총괄

### 12-1. 주요 출처

- [Official Hero Siege Wiki](https://herosiege.wiki.gg/) — `Items` · `Equipment`(404, 접근 불가) · `Difficulty` · `Features` · `Consumables` · `Potions` · `Flasks` · `Runes` · `Body_Armors` · `Swords` · `Champion` · `Ancient` · `Monster_Types` · `Satanic_Zones` · `Mining` · `Socketables` · `Charms` · `Relics` · `Collectibles` · `Unholy_Stat` · `Getting_Started` · `Hero_Siege_Wiki`(허브)
- [Hero Siege Steam 스토어 페이지](https://store.steampowered.com/app/269210/Hero_Siege/) — 공식 설명·희귀도 서술·룬워드/제작 존재 확인
- [Hero Siege Helper](https://hero-siege-helper.vercel.app/) — `/rarity` · `/runewords` · `/craftprices` · `/data/affixes` · `/items/sets` · `/codex` · `/augments`(팬 제작 구조화 DB, §0 신뢰도 근거 참조)
- Steam Community 토론 다수 — 희귀도 순서(3개 스레드 병기, §3-2), Gamba/set 발동 규칙 등
- `herosiege.fandom.com` — WebSearch 스니펫으로만 인용(직접 열람 402 차단)
- `herosiegewiki.com` — 룬워드 제작 규칙 1건만 교차검증 후 제한적 인용(§6-4)

### 12-2. 배제한 소스

- `mejoress.com` — 사전 지목된 AI 생성 의심 패턴과 제목·구조가 일치해 접속 자체를 배제(§0 오염 표)
- "Hero Siege 2"라는 별도 게임 — 존재 자체가 확인되지 않아 조사 대상에서 배제, 커뮤니티 구어체로 판단(§0)

### 12-3. N/F(미확인) 총괄

| 항목 | 상태 |
|---|---|
| 정확한 장비 슬롯 총수(10개 나열 vs "eleven" 원문 vs 방패의 슬롯 소속) | §1 — 확정 못함 |
| Flask 가 무기 카테고리와 소모품 카테고리에 동시 등장하는 이유(동명이의 확인 안 됨) | §1-1 |
| Glyphs(부적류로 추정)의 상세 | §1-2 — 개별 페이지 미확보 |
| 색상 희귀도 등급의 통일된 순서·색상(4개 출처가 서로 다름) | §3-2 — 표로 병기, 통합 못함 |
| "Superior" 가 색상 등급과 품질 접두 양쪽에 쓰이는 것이 동일 개념인지 | §3-1 |
| Item Level → 접사 티어 게이팅의 정확한 공식 | §4-3 |
| 룬 총수(공식위키 31개 나열 vs Fandom "40종") | §6-1 |
| 젬·주얼 전체 목록(각 1종만 문서화됨) | §6-2 |
| 룬워드 전체 목록(50종+ 중 발췌만 확보) | §6-4 |
| Relic Follower/Orbital 타입 구체 예시 | §8-1 |
| Collectibles(보스 드롭 6종)의 정확한 용도 | §8-2 |
| Companion/Mercenary 의 정확한 스탯 수치 | §8-4 |
| 윙 등 코스메틱 보상에 스탯이 붙는지 여부 | §8-5 |
| Chaos Pillar/Ancient 모디파이어의 정확한 드롭률 수치(정성적 서술만 확보) | §9-1, §9-2 |
| pre-2.0(2014~2023) 아이템 구조 전반 — 인벤토리 형태·접사 체계·소켓 존재 여부 | §10 — 통째로 미확보 |
| Jewelcrafting 의 실제 도입 시점("시즌 17" 스니펫이 post-2.0 시즌 10회와 안 맞음) | §7 |
| 시즌 10 개편 이후의 현행 난이도 티어 이름·개수·배율 | §2-3 — [00_overview.md §5-3](00_overview.md#5-3--시즌-10이-이-표를-갈아엎었다--현행은-미확정) |

---
*마지막 업데이트: 2026-09-03 (최초 작성 — 원 프롬프트의 "Hero Siege vs Hero Siege 2" 전제를 조사 중 정정(별도 후속작 없음, 2.0 대개편으로 재정정) · pre-2.0/post-2.0 분단선으로 재구성 · 장비 슬롯·난이도 7단·희귀도 8단(출처 불일치 병기)·접사 895종 구조·세트 60여종 실제 목록·룬 30여종(D2 룬 이름 재사용 확인)·룬워드 실제 조합표·강화/제작 6갈래(크래프팅큐브·다이스·감바·오그먼트·주얼크래프팅·코덱스)·유물/컬렉터블/펫/윙·드롭 구조(몬스터 태그·Satanic Zone·거래/Odyssey) 확보)*
