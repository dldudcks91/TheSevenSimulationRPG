# Guild Master - Idle Dungeons — 클래스(전직)·스킬 구조 전수 조사

> 상위 문서: [00_overview.md](00_overview.md)
> 짝 문서: [02_items.md](02_items.md)
> 상태: **72개 클래스 전수 확보(공식 위키 `Classes` 페이지 전량 전사)** · 개별 스킬 수치는 6개 클래스분만(72 중 6) · 승급 비용·롤백 가능 여부는 **끝내 미확인** (2026-08-31 최초 작성)
> 목적: 본작 **최대의 콘텐츠 부채**인 「전직 트리의 형태 — 트리 vs 티어」([GAME_DESIGN.md §10](../../game_design/GAME_DESIGN.md) · [skill_design.md §6·§7](../../game_design/skill_design.md))에, **선형 계보 × 티어마다 액티브 1 + 패시브 1** 로 실제 출시된 모바일 방치형의 실물 수치를 대는 것. 본작 뿌리 45개가 감당되는 규모인지를 **숫자로** 답한다
> ⚠ **이 문서의 수치는 전부 Guild Master - Idle Dungeons 의 수치다.** 본작 SSOT 가 아니며 `src/data/*.csv` 로 옮기지 말 것

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 |
| 1 | 구조 개관 — 뿌리 4 → 계보 14 → 클래스 72 |
| 2 | 14계보 전수 표 — 클래스 72종 · 액티브 · 패시브 |
| 3 | 승급(Evolution) 규칙 — 레벨 상한을 깨는 유일한 수단 |
| 4 | 스킬 구조 — 「액티브 1 + 패시브 1」과 로마숫자의 정체 |
| 5 | 레벨·경험치 — 9티어 × 5레벨 |
| 6 | 능력치 체계 — 8종, 주력 축은 클래스당 하나 |
| 7 | 본작 대조 시사점 |
| 8 | 출처 · 미확인(N/F) 총괄 |

---

## 0. 조사 방법과 신뢰도

| 표기 | 소스 | 신뢰도 |
|---|---|---|
| **[위키]** | 공식 위키 `idleguildmaster.wiki.gg` — WebFetch 로 원문 직접 열람. 페이지명을 함께 적는다(예: `[위키:Classes]`) | ★★★ |
| **[스토어]** | Google Play 스토어 설명문. `play.google.com` 직링크는 본문 절단으로 실패해 **appbrain 미러**로 확보 | ★★★ |
| **[나무위키]** | `en.namu.wiki/w/Guild master idle dungeons` — **기계번역이 심해 고유명사가 전부 깨진다**(Knight→"Article", Cutthroat→"Neck", Marksman 계열→"101 Hundred"). 고유명사는 인용하지 않고 **구조 진술만** 교차검증용으로 쓴다 | ★☆ |

**이 위키는 매우 작다.** `Special:AllPages` 전량이 **28 페이지**이고, 그중 실질 내용이 있는 것은 `Classes` · `Levels and XP` · `Headquarters` · `Enemies` · `Dungeons & Raids` 와 **개별 클래스 6종**(Footman · Warrior · Archer · Rogue · Apprentice · Light Disciple)뿐이다. `Guild Master - Idle Dungeons`(메인 게임 페이지)는 **"WIP" 표시에 "Game Description / Game Mechanics / Change Log 를 추가해야 한다"는 todo 만 남은 껍데기**이고, `Example character`는 **위키 인포박스 데모용 삭제 예정 페이지**(League of Legends 용 더미 데이터가 들어 있다)라 조사 가치가 **0**이었다.

**끝까지 못 뚫은 것**: 승급 비용·롤백 가능 여부·스킬 개별 수치(72 중 66). 위키에 페이지 자체가 없고, 나무위키·스토어·검색 어디에도 없다. incrementaldb.com 은 지시대로 시도하지 않았다(403). §8 에 N/F 로 남긴다.

**신뢰도 주의 하나** — 개별 클래스 페이지 중 **Apprentice · Archer 두 장은 인포박스 라벨이 영어가 아닌 언어로 되어 있어** WebFetch 가 이를 번역해 돌려줬다(Apprentice: "Blood/Physical Basics/Fluency/Healing Magic Core/Durability/Risk level" · Archer: "Blood/Base Body/Agility/Magic Restoration Core/Physical Resistance/Danger Level"). **8개 슬롯의 순서와 값이 나머지 4장과 완전히 일치**하므로 같은 인포박스임은 확정이고, §6 은 영어 라벨이 확인된 4장(Footman·Warrior·Rogue·Light Disciple)의 표기를 **정본**으로 쓴다.

---

## 1. 구조 개관 — 뿌리 4 → 계보 14 → 클래스 72

```
시작 클래스 4 (Lvl. 1-5)                       →  갈래 →  잎 계보 14  →  클래스 72
├─ Footman     (검·중갑, 근접 탱)   Warrior →  Knight → 성기사 / 흑기사
│                                            └ Guard  → 근위 / 저거너트
├─ Archer      (활·균형갑, 원거리)  Huntress → Marksman → 궁수본류 / 독궁수
│                                            └ Rider
├─ Apprentice  (스태프·경갑, 마법)  Adept   → 네크로 / 화염 / (빛)
│                                            └ 데몬(후발 분기)
└─ Rogue       (단검·중형갑, 근접)  Thief   → Cutthroat → 어쌔신 → 스파이어 / 레드스토커
                                             └ Shadow Crawler → 나이트블레이드
```

- **시작 클래스는 4개다** — `Classes` 페이지에서 `Lvl. 1-5` 로 표기된 것이 Footman · Archer · Apprentice · Rogue **넷뿐**이고[위키:Classes], 나무위키도 "four basic adventurer types: infantry, apprentices, archers, thieves" 로 일치한다[나무위키]. ⚠ **Light Disciple 은 시작 클래스가 아니다** — 표기는 `Lvl. 1-15` 이고 위키 스스로 "tier 2 caster" 로 부른다[위키:Light Disciple] (다만 이 둘도 서로 모순 — §3-4)
- **위키가 그룹으로 나눠 놓은 계보는 14개**다[위키:Classes]. 계보 길이는 **3~7단**, 평균 **5.14단**(72÷14)
- **총 클래스 72종.** 스토어 설명의 "**70+ different classes**"[스토어]와 자릿수가 일치해, 위키의 클래스 명단이 **거의 전량**임을 시사한다(완전 전량이라는 확증은 아니다 — [미확인])
- **분기는 전부 2갈래(이지선다)로 보인다** — 확인된 것은 Warrior → Knight | Guard 하나뿐이고[위키:Warrior], 나머지 분기점은 **레벨 상한 정합으로 역산한 [추정]**이다(§2-0)
- 파티는 **일반 던전 영웅 4 + 펫 1**, 레이드는 **최소 영웅 5**[위키:Dungeons & Raids]. 전투는 **완전 자동 턴제**("FULLY AUTOMATED TURN BASED COMBAT")[스토어]

---

## 2. 14계보 전수 표 — 클래스 72종 · 액티브 · 패시브

> **표기는 위키 원문 그대로다**[위키:Classes]. 레벨 범위는 `Lvl. 1-N` 문자열을 그대로 옮겼고, 오타로 보이는 것(`White Elder: Lvl. 1-33`)도 **고치지 않고** 그대로 뒀다. 패시브 `—` 는 위키에 `-` 로 적힌 것(패시브 없음)이다.
> **Δ 열**은 이 문서가 계산한 것이다 — **직전 티어 대비 무엇이 바뀌었는가**: `A` = 액티브만 · `P` = 패시브만 · `AP` = 둘 다 · `—` = 시작 클래스(직전 없음). 이 열이 §4-2·§7 의 근거다.
> 위키 페이지 전체의 유일한 산문은 **"List of Classes and their Evolutions and Skills"** 한 줄이고, **분기 관계를 보여주는 트리 다이어그램은 없다**[위키:Classes].

### 2-0. 분기점 — 확인 3, 추정 10

| 분기점 | 근거 |
|---|---|
| Footman(5) → **Warrior** | **[확인]** "will be upgradable at level 5 to the Warrior"[위키:Footman] |
| Warrior(10) → **Knight** \| **Guard** | **[확인]** "upgradable at level 10 to either Knight or Guard"[위키:Warrior] |
| Archer(5) → **Huntress** | **[확인]** "can advance at level 5 ... progressing to the Huntress class"[위키:Archer] |
| Rogue(5) → **Thief** | **[확인]** "upgradeable at Level 5 to the Thief"[위키:Rogue] |
| Apprentice(5) → **Adept** \| **Light Disciple** | **[확인이지만 모순]** "progressing to 'Master Mage' and 'Disciple of Light'"[위키:Apprentice, 번역판] — 그런데 Light Disciple 의 표기 레벨은 `Lvl. 1-15` 라 티어가 안 맞는다(§3-4) |
| Knight(15) → Holy Knight \| Dark Knight | **[추정]** 둘 다 `Lvl. 1-20` |
| Guard(15) → Royal Guard \| Iron Warden | **[추정]** 둘 다 `Lvl. 1-20` |
| Huntress(10) → Marksman \| Horse Rider | **[추정]** 둘 다 `Lvl. 1-15` · 둘 다 액티브가 Huntress 의 `Barrage II` 를 그대로 물려받는다 |
| Marksman(15) → Sureshot \| Poison Bow | **[추정]** 둘 다 `Lvl. 1-20` |
| Adept(10) → Dark Sorcerer \| Fire Wizard | **[추정]** 둘 다 `Lvl. 1-15` |
| Necromancer(20) → Demilich \| Unchained | **[추정]** 둘 다 `Lvl. 1-25` |
| Thief(10) → Cutthroat \| Shadow Crawler | **[추정]** 둘 다 `Lvl. 1-15` |
| Assassin(20) → Spire Initiate \| Red Stalker | **[추정]** 둘 다 `Lvl. 1-25` |

⚠ **추정 10건은 「같은 레벨 상한 = 형제」라는 가정 하나에 전부 매달려 있다.** 위키에 분기 다이어그램이 없어 다른 근거가 없다. 계보의 **내용**(클래스명·레벨·스킬)은 전부 [위키] 확정이고, **연결선만** 추정이다.

---

### 2-1. Footman 뿌리 (근접 탱 · 검/중갑) — 4계보 20클래스

**① 성기사 계보 (7)**

| 클래스 | 레벨 | 액티브 | 패시브 | Δ |
|---|---|---|---|---|
| Footman | Lvl. 1-5 | Mighty Strike | — | — |
| Warrior | Lvl. 1-10 | Mighty Strike | Threatening | P |
| Knight | Lvl. 1-15 | Crushing Strike | Threatening | A |
| Holy Knight | Lvl. 1-20 | Condemn | Blinding | AP |
| Paladin | Lvl. 1-25 | Condemn | Blinding II | P |
| Templar | Lvl. 1-30 | Condemn All | Blinding III | AP |
| Inquisitor | Lvl. 1-35 | Condemn All | Blinding IV | P |

**② 흑기사 계보 (4)** — Knight 에서 분기[추정]

| 클래스 | 레벨 | 액티브 | 패시브 | Δ |
|---|---|---|---|---|
| Dark Knight | Lvl. 1-20 | Overwhelm | Threatening | A |
| Death Knight | Lvl. 1-25 | Decimate | Threatening | A |
| Scourge | Lvl. 1-30 | Decimate II | Threatening | A |
| Tyrant | Lvl. 1-35 | Decimate III | Threatening | A |

> **패시브가 4단 내내 `Threatening` 로 고정**이다 — 이 계보의 성장은 전부 액티브 쪽에서만 일어난다.

**③ 근위 계보 (5)** — Warrior 에서 분기[확인]

| 클래스 | 레벨 | 액티브 | 패시브 | Δ |
|---|---|---|---|---|
| Guard | Lvl. 1-15 | Mighty Strike | Threatening II | P |
| Royal Guard | Lvl. 1-20 | Mighty Strike | Sword Mastery | P |
| Royal Swordsman | Lvl. 1-25 | En Garde | Sword Mastery | A |
| Royal Captain | Lvl. 1-30 | En Garde | Sword Mastery II | P |
| Knight's Hand | Lvl. 1-35 | En Garde | Sword Mastery III | P |

> **정확히 반대다** — 5단 중 액티브가 바뀌는 것은 **한 번**뿐이고 나머지는 전부 패시브 랭크업.

**④ 저거너트 계보 (4)** — Guard 에서 분기[추정]

| 클래스 | 레벨 | 액티브 | 패시브 | Δ |
|---|---|---|---|---|
| Iron Warden | Lvl. 1-20 | Taunt | Threatening II | A |
| Iron Defender | Lvl. 1-25 | Taunt II | Threatening II | A |
| Juggernaut | Lvl. 1-30 | Taunt II | Threatening III | P |
| Titan | Lvl. 1-35 | Taunt III | Threatening III | A |

> **A → A → P → A 로 완전히 번갈아 간다.** 「한 계단에 하나씩만 올린다」의 교과서적 사례(§4-2).

---

### 2-2. Archer 뿌리 (원거리 딜 · 활/균형갑) — 3계보 16클래스

**⑤ 궁수 본류 계보 (7)**

| 클래스 | 레벨 | 액티브 | 패시브 | Δ |
|---|---|---|---|---|
| Archer | Lvl. 1-5 | Barrage | — | — |
| Huntress | Lvl. 1-10 | Barrage II | — | A |
| Marksman | Lvl. 1-15 | Barrage II | Keen Vision | P |
| Sureshot | Lvl. 1-20 | Barrage III | Keen Vision | A |
| Fury | Lvl. 1-25 | Barrage IV | Keen Vision | A |
| HailStorm | Lvl. 1-30 | Barrage V | Keen Vision | A |
| Tempest | Lvl. 1-35 | Barrage VI | Keen Vision | A |

> **7단 전체가 스킬 두 개다** — `Barrage` 와 `Keen Vision`. 그리고 `Keen Vision` 은 **5단 내내 랭크가 안 오른다.** 즉 이 계보의 레벨 15~35 구간(전체 성장의 절반 이상) 성장은 **`Barrage` 의 로마숫자 하나**가 전부다.

**⑥ 독궁수 계보 (4)** — Marksman 에서 분기[추정]

| 클래스 | 레벨 | 액티브 | 패시브 | Δ |
|---|---|---|---|---|
| Poison Bow | Lvl. 1-20 | Barrage II | Poisonous Arrows | P |
| Toxic Stalker | Lvl. 1-25 | Barrage II | Poisonous Arrows II | P |
| Plague Spreader | Lvl. 1-30 | Barrage II | Poisonous Arrows III | P |
| Blight | Lvl. 1-35 | Barrage III | Poisonous Arrows III | A |

> **본류와 갈리는 지점이 「액티브를 안 올리고 패시브를 올린다」 하나다.** 본류가 `Barrage VI` 까지 갈 동안 독궁수는 `Barrage III` 에 머물고 대신 `Poisonous Arrows III` 를 얻는다. **같은 액티브 · 다른 패시브 = 다른 갈래**라는 극단적으로 싼 차별화.

**⑦ 라이더 계보 (5)** — Huntress 에서 분기[추정]

| 클래스 | 레벨 | 액티브 | 패시브 | Δ |
|---|---|---|---|---|
| Horse Rider | Lvl. 1-15 | Barrage II | Rider | P |
| Wolf Rider | Lvl. 1-20 | Barrage II | Rider II | P |
| Worg Rider | Lvl. 1-25 | Barrage II | Rider III | P |
| Spitfang Rider | Lvl. 1-30 | Barrage II | Rider IV | P |
| Drake Rider | Lvl. 1-35 | Incinerate | Rider V | AP |

> **4단 내내 액티브가 `Barrage II` 로 고정**이고 마지막 단에서만 `Incinerate` 로 교체된다. 「탈것이 강해진다」는 판타지를 **패시브 랭크 하나**로 5단 전부 굴린다.

---

### 2-3. Apprentice 뿌리 (마법 · 스태프/경갑) — 4계보 21클래스

**⑧ 네크로맨서 계보 (7)**

| 클래스 | 레벨 | 액티브 | 패시브 | Δ |
|---|---|---|---|---|
| Apprentice | Lvl. 1-5 | Energy Burst | — | — |
| Adept | Lvl. 1-10 | Energy Burst II | — | A |
| Dark Sorcerer | Lvl. 1-15 | Energy Burst II | Withering Touch | P |
| Necromancer | Lvl. 1-20 | Curse | Withering Touch | A |
| Demilich | Lvl. 1-25 | Curse II | Withering Touch | A |
| Lich | Lvl. 1-30 | Curse II | Withering Link | P |
| Ancient Lich | Lvl. 1-35 | Curse III | Withering Link | A |

**⑨ 데몬 계보 (3)** — Necromancer 에서 분기[추정]

| 클래스 | 레벨 | 액티브 | 패시브 | Δ |
|---|---|---|---|---|
| Unchained | Lvl. 1-25 | Flay | Chaotic | AP |
| Demon | Lvl. 1-30 | Annihilate | Chaotic | A |
| Infernal Lord | Lvl. 1-35 | Obliterate | Chaotic | A |

> **72개 중 유일하게 「매 단마다 액티브 이름이 완전히 새것」인 계보**다 — Flay → Annihilate → Obliterate. 로마숫자 재사용이 0인 유일한 갈래이고, 그만큼 **가장 비싸게 만든 갈래**다. 계보 길이가 3단으로 가장 짧은 것과 짝이 맞는다.

**⑩ 화염마법 계보 (5)** — Adept 에서 분기[추정]

| 클래스 | 레벨 | 액티브 | 패시브 | Δ |
|---|---|---|---|---|
| Fire Wizard | Lvl. 1-15 | Fire Burst | — | A |
| Red Mage | Lvl. 1-20 | Fireball | — | A |
| Red Archmage | Lvl. 1-25 | Fireball | Fire Magic | P |
| Red Elder | Lvl. 1-30 | Meteor | Fire Magic | A |
| Scorching Elder | Lvl. 1-35 | Meteor II | Fire Magic II | AP |

> **패시브가 레벨 25 에서야 처음 붙는다** — 이 계보는 20레벨 구간까지 **액티브 1개로만** 돈다.

**⑪ 힐러 계보 (6)** — Apprentice 또는 Adept 에서 분기(§3-4 모순)

| 클래스 | 레벨 | 액티브 | 패시브 | Δ |
|---|---|---|---|---|
| Light Disciple | Lvl. 1-15 | Energy Burst | Healer | P |
| Cleric | Lvl. 1-20 | Heal | Healer | A |
| White Mage | Lvl. 1-25 | Mass Heal | Healer | A |
| White Archmage | Lvl. 1-30 | Mass Heal | Healer II | P |
| White Elder | **Lvl. 1-33** ⚠ | Mass Heal II | Healer II | A |
| Radiant Elder | Lvl. 1-35 | Mass Heal III | Healer II | A |

> ⚠ **`White Elder: Lvl. 1-33` 은 72개 중 유일하게 5의 배수가 아니다.** 다른 71개가 전부 5·10·15·20·25·30·35 인데 이것만 33이다. 위키 오타로 **추정**되지만 원문 그대로 옮겼다 — [미확인].
> **패시브 `Healer` 는 6단 중 랭크가 딱 한 번(II) 오르고 만다.** 힐 액티브 쪽이 `Energy Burst → Heal → Mass Heal → II → III` 로 5단계를 담당한다.

---

### 2-4. Rogue 뿌리 (근접 딜 · 단검/중형갑) — 3계보 15클래스

**⑫ 스파이어(암살자) 계보 (7)**

| 클래스 | 레벨 | 액티브 | 패시브 | Δ |
|---|---|---|---|---|
| Rogue | Lvl. 1-5 | Backstab | — | — |
| Thief | Lvl. 1-10 | Backstab | Saboteur | P |
| Cutthroat | Lvl. 1-15 | Backstab II | Saboteur | A |
| Assassin | Lvl. 1-20 | Backstab III | Saboteur | A |
| Spire Initiate | Lvl. 1-25 | Eclipse | Saboteur | A |
| Spire Acolyte | Lvl. 1-30 | Eclipse II | Saboteur | A |
| Spire Leader | Lvl. 1-35 | Eclipse III | Saboteur | A |

> **패시브 `Saboteur` 가 6단 내내 랭크 없이 고정**이다. §2-2 궁수 본류의 `Keen Vision` 과 같은 처리.

**⑬ 레드스토커 계보 (3)** — Assassin 에서 분기[추정]

| 클래스 | 레벨 | 액티브 | 패시브 | Δ |
|---|---|---|---|---|
| Red Stalker | Lvl. 1-25 | Thousand Cuts | Saboteur | A |
| Meat Carver | Lvl. 1-30 | Thousand Cuts | Deadly Finesse | P |
| Wounds Carver | Lvl. 1-35 | Thousand Cuts | Deadly Finesse II | P |

**⑭ 나이트블레이드(그림자) 계보 (5)** — Thief 에서 분기[추정]

| 클래스 | 레벨 | 액티브 | 패시브 | Δ |
|---|---|---|---|---|
| Shadow Crawler | Lvl. 1-15 | Backstab | Night Vision | P |
| Shadow Dancer | Lvl. 1-20 | Backstab | Night Vision II | P |
| Night Blade | Lvl. 1-25 | Umbral Strike | Night Vision II | A |
| Night Specter | Lvl. 1-30 | Umbral Strike | Night Vision III | P |
| Night Terror | Lvl. 1-35 | Umbral Strike II | Night Vision IV | AP |

---

### 2-5. 집계 — 72클래스가 실제로 몇 개의 스킬로 굴러가는가

| | 값 | 산출 |
|---|---|---|
| **클래스(승급 티어) 총수** | **72** | 계보 14개 합 (7+4+5+4 + 7+4+5 + 7+3+5+6 + 7+3+5) |
| 액티브 슬롯 | 72 | 전 클래스가 액티브 1개를 갖는다 (예외 없음) |
| 패시브 슬롯 | **64** | 72 − **8**(패시브 `—` 인 클래스: Footman·Archer·Huntress·Apprentice·Adept·Fire Wizard·Red Mage·Rogue) |
| **스킬 슬롯 합** | **136** | 72 + 64 |
| **액티브 — 기본 이름 수** | **24** | Mighty Strike·Crushing Strike·Condemn·Condemn All·Overwhelm·Decimate·En Garde·Taunt·Barrage·Incinerate·Energy Burst·Curse·Flay·Annihilate·Obliterate·Fire Burst·Fireball·Meteor·Heal·Mass Heal·Backstab·Eclipse·Thousand Cuts·Umbral Strike |
| **패시브 — 기본 이름 수** | **14** | Threatening·Blinding·Sword Mastery·Keen Vision·Poisonous Arrows·Rider·Withering Touch·Withering Link·Chaotic·Fire Magic·Healer·Saboteur·Deadly Finesse·Night Vision |
| **기본 이름 합** | **38** | 24 + 14 |
| 액티브 — 랭크 포함 엔트리 | 44 | 로마숫자를 별개로 셈 (Barrage I~VI = 6 등) |
| 패시브 — 랭크 포함 엔트리 | 33 | Rider I~V = 5, Blinding I~IV = 4 등 |
| **랭크 포함 엔트리 합** | **77** | 44 + 33 |

**두 개의 재사용 배율**

```
슬롯 ÷ 랭크포함엔트리  =  136 ÷ 77  =  1.77배     ← 같은 스킬을 여러 클래스가 그대로 공유
슬롯 ÷ 기본이름        =  136 ÷ 38  =  3.58배     ← 로마숫자 랭크까지 합친 총 재사용
```

**72개 클래스가 실제로 요구한 「서로 다른 설계 결정」은 38개**다. 나머지는 전부 (a) 같은 스킬을 다른 계보가 그대로 물려받거나 (b) 숫자만 한 칸 올린 것이다. 이것이 이 문서에서 본작에 줄 수 있는 가장 중요한 숫자다(§7-1).

---

## 3. 승급(Evolution) 규칙 — 레벨 상한을 깨는 유일한 수단

### 3-1. 확인된 것 — 위키 원문

`Levels and XP` 페이지 원문[위키:Levels and XP]:

> "Progression is capped every 5 levels. To break the cap, an Evolution is required. Note that a hero's level resets to 1 within the new Tier upon Evolution."

> "Every level up grants **+1 HP**. This bonus is **permanent** and is not lost during Evolution, even though the level counter resets to 1."

여기서 확정되는 것 넷:

1. **레벨 상한은 5레벨마다 걸린다.** 상한을 깨는 유일한 수단이 **Evolution**이다
2. **Evolution 하면 레벨 카운터가 새 티어 안에서 1로 리셋된다** — 화면상 레벨은 「티어 N · 레벨 1~5」로 표시되고, `Levels and XP` 표의 1~45 는 **누적 절대 레벨**이다. `Classes` 페이지의 `Lvl. 1-N` 표기는 이 절대 레벨 기준의 **그 클래스가 유지될 수 있는 상한**이다
3. **레벨업 +1 HP 는 Evolution 을 넘어 영구 누적**된다 — 리셋되는 것은 카운터뿐이고 성장은 남는다
4. **Evolution 이 곧 클래스 승급이다** — 위키가 `Classes` 페이지를 스스로 "List of Classes and their **Evolutions** and Skills" 로 부르고[위키:Classes], `Apprentice` 페이지의 승급 트리 섹션 제목도 "**Evolution Paths**" 다[위키:Apprentice]. 그리고 72개 클래스의 레벨 상한이 **정확히 5·10·15·20·25·30·35** 로만 찍힌다(§2, 예외는 `White Elder: 1-33` 하나) — **Evolution 이 걸리는 지점과 클래스가 갈리는 지점이 같다**

### 3-2. 확인 못한 것 — 승급의 대가

**Evolution 에 레벨 상한 도달 말고 다른 조건(아이템·재화·건물)이 필요한지는 끝내 확인하지 못했다 [미확인].**

찾아본 곳과 결과:

| 출처 | 결과 |
|---|---|
| `Levels and XP`[위키] | Evolution 을 설명하지만 **대가를 한 글자도 안 적는다** |
| `Items`[위키] | 카테고리(Swords·Staffs·Bows·Daggers·Drops)만 있고 **승급용 아이템은 없다** |
| `Headquarters`[위키] | 화폐 체계(100 Bronze = 1 Silver = ...)·선술집 모집·영웅 트레잇은 있으나 **승급 관련 서술 0** |
| `Guild Master - Idle Dungeons`(메인)[위키] | **WIP 껍데기** — "Game Mechanics" 섹션이 todo 로 남아 있다 |
| 나무위키 | "adventurers can grow up to 9 grades, and up to 5 labels will rise by 5"(기계번역) — **9티어 × 5레벨 구조만 교차확인**되고 비용은 없다 |
| 스토어 · 검색 · 커뮤니티 | 승급 비용 언급 **0건** |

⚠ **XP 표에 설명되지 않은 불연속이 하나 있다**(§5-2) — Evolution 경계마다 누적 XP 가 뛴다. 「Evolution 자체가 XP 를 먹는다」로 읽을 여지가 있으나 **위키가 이 열의 정의를 설명하지 않아 확정할 수 없다** [미확인].

### 3-3. 롤백(승급 되돌리기) — [미확인]

**되돌릴 수 있는지 없는지 어떤 출처에서도 확인하지 못했다.** 위키에 respec·reset·class change 라는 단어 자체가 없고, 레딧·스팀·디스코드 공개 검색에서도 이 게임의 해당 논의를 찾지 못했다.

다만 **구조적 정황 둘**은 기록해 둔다 (**추론이지 확인이 아니다**):

1. **Evolution 이 레벨 상한을 깨는 유일한 수단**이므로, 되돌리면 레벨 상한이 다시 내려간다. 「티어 7 클래스를 티어 4 클래스로 되돌린다」가 성립하려면 레벨을 함께 깎아야 한다 — 되돌리기가 **싸게 성립하기 어려운 구조**다
2. **게임이 롤백 대신 「영웅을 여러 명 굴리는」 쪽으로 설계돼 있다** — 스토어가 "Create multiple teams optimized for particular tasks and encounters"[스토어] 를 기능으로 내걸고, 선술집이 **일정 시간마다 새 영웅을 계속 밀어넣어 가장 오래 머문 영웅을 밀어낸다**("every time 1 hero will arrive and fill empty spase or replace the hero that have been the longest in the traven")[위키:Headquarters]. **영웅 공급이 사실상 무한**이라 「하나 잘못 키웠다」의 비용이 낮다

→ 본작 §7 「전직의 롤백」과의 대조는 §7-4.

### 3-4. 위키 내부 모순 셋 — 그대로 기록

| 모순 | 내용 |
|---|---|
| **Light Disciple 의 티어** | `Classes` 는 `Lvl. 1-15`(=티어 3) 로 적고[위키:Classes, 2회 재확인], `Apprentice` 페이지는 **레벨 5 승급 대상**으로 적고[위키:Apprentice], `Light Disciple` 페이지는 **"upgradeable to Cleric at level 10"**(=상한 10, 티어 2) 로 적는다[위키:Light Disciple]. **셋이 서로 안 맞는다.** 어느 쪽이 맞는지 확정 불가 [미확인] |
| **White Elder 의 `Lvl. 1-33`** | 72개 중 유일하게 5의 배수가 아니다(§2-3). 오타로 **추정**되나 확인 불가 |
| **최대 레벨** | 산문은 "**Max Level: 40**" 이라고 적는데, 같은 페이지의 표는 **41~45 행(Tier 9)** 을 갖고 마지막 행에 "(MAX)" 를 붙인다[위키:Levels and XP]. 나무위키의 "9 grades × 5" 는 **45 쪽**을 지지한다[나무위키]. 산문이 낡은 것으로 **추정** |

**그리고 클래스는 레벨 35 에서 멈춘다** — 72개 중 최상단이 전부 `Lvl. 1-35`(티어 7)이고, **티어 8(36~40)·티어 9(41~45)에 대응하는 클래스가 하나도 없다.** 읽는 방법 둘: ①위키의 클래스 명단이 미완이다 ②**승급 트리가 레벨 35 에서 끝나고 마지막 두 티어는 순수 레벨 구간이다.** 스토어의 "70+ classes" 와 실측 72 가 맞아떨어지는 것은 ②의 약한 방증이지만 확정은 못 한다 [미확인].

---

## 4. 스킬 구조 — 「액티브 1 + 패시브 1」과 로마숫자의 정체

### 4-1. 슬롯 구조 — 액티브 1 고정 · 패시브 0 또는 1

- **모든 클래스가 액티브를 정확히 1개 갖는다.** 72개 중 예외 0
- **패시브는 0개 또는 1개다.** 2개 이상인 클래스는 없다. **패시브가 없는 8개는 전부 초반 티어**(Footman·Archer·Apprentice·Rogue = 시작 4종 / Huntress·Adept = 티어 2 / Fire Wizard·Red Mage = 화염 계보 티어 3~4). 즉 **패시브는 티어 2~4 에서 열리고 최대 1개로 끝난다**
- **몬스터도 같은 구조다** — `Enemies` 페이지가 적의 스킬을 똑같이 "Active"(Stomp·Escape·Arcane Strike 등) / "Passive"(Initiative·Flying·Leech·Regeneration I/II/III 등) 두 칸으로 적는다[위키:Enemies]. **영웅과 몬스터가 같은 스킬 문법을 쓴다**
- **플레이어가 스킬을 고르는 창구는 없다.** 스킬은 클래스에 박혀 있고, 클래스는 승급으로 정해진다. **스킬 포인트·스킬 트리·리스펙에 해당하는 시스템이 위키 어디에도 없다.** 플레이어의 스킬 관련 결정은 **승급 시 갈래 선택 한 번**뿐이다(⚠ 위키가 작아 「없다」는 서술은 [미확인]에 가깝지만, 28페이지 전수에 흔적이 0인 것은 강한 방증)

### 4-2. 로마숫자의 정체 — 같은 스킬의 랭크업, 그리고 「한 계단에 하나씩」

**로마숫자는 별개 스킬이 아니라 같은 스킬의 강화 랭크다.** 근거 셋:

1. 한 계보 안에서 이름이 유지되고 숫자만 오른다 — `Barrage → II → III → IV → V → VI`(궁수 본류 7단), `Rider → II → III → IV → V`(라이더 5단)
2. **랭크가 오르는 동안 다른 칸은 그대로다** — Sureshot·Fury·HailStorm·Tempest 넷은 패시브가 `Keen Vision` 으로 완전히 동일하고 액티브 숫자만 다르다. 두 스킬이 별개라면 이 4단은 아무것도 안 바뀐 것이 된다
3. 몬스터 패시브도 `Regeneration I/II/III` 로 같은 표기를 쓴다[위키:Enemies]

**그리고 승급 한 계단이 액티브·패시브를 동시에 올리는 일은 거의 없다.** §2 의 Δ 열을 68개 승급 전이(72 − 시작 4) 전량에 대해 집계하면:

| 승급 한 계단에서 바뀌는 것 | 건수 | 비율 |
|---|---|---|
| **액티브만** (`A`) | 35 | **51%** |
| **패시브만** (`P`) | 27 | **40%** |
| **둘 다** (`AP`) | 6 | **9%** |
| 합 | 68 | 100% |

**91%의 승급이 둘 중 하나만 건드린다.** `AP` 6건이 어디인지도 뚜렷하다 — Holy Knight·Templar(성기사 계보의 격상 지점 2) · Drake Rider(라이더 계보 최종) · Unchained(데몬 계보 시작) · Scorching Elder(화염 최종) · Night Terror(그림자 최종). **계보의 시작점과 최종점**에만 몰려 있다.

**더 나아가, 새 스킬 「이름」이 등장하는 승급은 68 중 34(50%)뿐이다** — 액티브 신규명 20회 + 패시브 신규명 14회. 나머지 34번의 승급은 **로마숫자 하나가 올라가는 것이 전부**다.

> **이것이 72개 클래스를 38개 스킬로 굴리는 방법이다** — 계단을 잘게 쪼개서 승급 횟수를 늘리고, 계단마다 올리는 것은 한 칸뿐이며, 그 절반은 새 콘텐츠가 0이다.

### 4-3. 확인된 스킬 수치 — 6개뿐

**개별 스킬의 실제 수치는 클래스 상세 페이지 6장에만 있다.** 나머지 66개 클래스의 스킬 수치는 위키에 페이지 자체가 없다 [미확인].

| 스킬 | 소속 | 원문 | 종류 |
|---|---|---|---|
| **Mighty Strike** | Footman · Warrior | "Strikes an Enemy for 200% Damage" | 액티브 · 단일 · 배율 200% |
| **Barrage** | Archer | "Shoots 2 random enemies" (원문은 태국어 "ยิงใส่ 2 ศัตรูแบบสุ่ม") | 액티브 · **무작위 2대상** · 배율 미기재 |
| **Energy Burst** | Light Disciple | "Bursts an enemy for 150% damage" | 액티브 · 단일 · 배율 150% |
| **Energy Burst**(=Apprentice 의 "Energy bomb") | Apprentice | "Blast the enemy with 150% (1.5 times) attack power" (번역판) | 액티브 · 단일 · 배율 150% |
| **Backstab** | Rogue | "Stabs an Enemy Crititcal hit bonus x 1.5" (원문 오타 그대로) | 액티브 · 단일 · **치명 보너스 ×1.5** |
| **Threatening** | Warrior 외 | "This unit has a 2x chance of being targeted by enemies." | 패시브 · **대상 지정 확률 2배** |
| **Healer** | Light Disciple 외 | "Attacks heal the ally with the lowest health for 50% damage. **Can be used while exploring**" | 패시브 · **반응형**(공격 시 발동) · 대상 = **최저 HP 아군** · 공격력의 50% |

**여기서 읽히는 설계 셋**

1. **액티브 배율의 눈금이 150%~200%** — 단일 강타의 기본이 2배 근처다
2. **`Threatening` 이 대상 지정을 「확정 고정」이 아니라 「확률 2배」로 처리한다.** 도발이 하드 락이 아니라 **가중치**다 — §7-6
3. **`Healer` 는 「공격하면 최저 HP 아군을 회복한다」는 반응형 패시브**이고, 원문이 **"Can be used while exploring"** 을 명시한다 — 즉 **오프라인/탐험 중에도 도는 패시브**가 있다는 뜻. 액티브가 아니라 패시브 쪽에 이 성질이 붙어 있는 것이 포인트

⚠ **`Barrage` 가 「무작위 2대상」이라는 것은 로마숫자의 정체에 물음표를 남긴다** — `Barrage VI` 가 배율만 오르는 것인지 **대상 수가 늘어나는 것**인지 확인할 수 없다. 후자라면 §4-2 의 「같은 스킬의 강화 랭크」 결론이 「랭크가 성질을 바꾼다」로 한 단계 세진다. **수치가 공개되지 않아 확정 불가** [미확인]. 다만 **`Condemn → Condemn All`**(§2-1)은 단일→광역 전환을 **랭크가 아니라 다른 이름의 스킬로 교체**해서 처리했다는 점이 대조군으로 남는다 — §7-5

### 4-4. 스킬 발동 방식 — [미확인], 다만 마나로 추정

- 능력치 8종에 **`Mana Gain`** 이 있고(§6), 모든 클래스가 10~11 의 값을 갖는다
- 캐스터 클래스 페이지들이 주력 능력치의 효과에 "**mana regeneration**"(Light Disciple) · "**magic core regeneration rate**"(Apprentice, 번역판) · "magic restoration core rate"(Archer, 번역판) 를 포함시킨다
- `Enemies` 페이지의 몬스터 스탯 열에도 **`Mana`** 가 있다[위키:Enemies]

→ **액티브는 마나를 소모하고 `Mana Gain` 이 회복 속도라는 것이 강하게 시사되지만, 마나 비용·발동 조건·턴 순서를 설명하는 페이지가 위키에 없다** [미확인]. 「쿨다운」이라는 단어는 위키 전체에서 발견되지 않았다.

---

## 5. 레벨·경험치 — 9티어 × 5레벨

### 5-1. XP 표 전량 [위키:Levels and XP]

> 원문 표기를 그대로 옮겼다 — 단위 표기가 `K`/`k` 로 섞여 있고 티어 라벨의 서수 표기도 "2st"·"3st" 로 틀려 있는데 **고치지 않았다**. 빈 칸은 원문이 비어 있는 것이다.

| 레벨 | 다음 레벨까지 XP | 누적 XP | 상태 |
|---|---|---|---|
| 1 | 50 | 0 | Tier 1 |
| 2 | 140 | 50 | |
| 3 | 350 | 190 | |
| 4 | 690 | 540 | |
| 5 | 1,100 | 1,230 | (T1 - MAX) 1st Evolution |
| 6 | 1,800 | 3,560 | Tier 2 |
| 7 | 2,700 | 5,360 | |
| 8 | 3,900 | 8,060 | |
| 9 | 5,300 | 11,960 | |
| 10 | 7,000 | 17,260 | (T2 - MAX) 2st Evolution |
| 11 | 9,100 | 40k | Tier 3 |
| 12 | 11K | 49k | |
| 13 | 14K | 60k | |
| 14 | 17K | 74k | |
| 15 | 20k | 91k | (T3 - MAX) 3st Evolution |
| 16 | 25K | 185k | Tier 4 |
| 17 | 29K | 210k | |
| 18 | 34K | 239k | |
| 19 | 39K | 273k | |
| 20 | 45k | 312k | (T4 - MAX) 4st Evolution |
| 21 | 52K | 539k | Tier 5 |
| 22 | 59K | 591k | |
| 23 | 67K | 650k | |
| 24 | 75K | 717k | |
| 25 | 84k | 792k | (T5 - MAX) 5st Evolution |
| 26 | 94k | 1,355k | Tier 6 |
| 27 | 104k | 1,449k | |
| 28 | 115K | 1,553k | |
| 29 | 127k | 1,668k | |
| 30 | 140k | 1,795k | (T6 - MAX) 6st Evolution |
| 31 | 153k | 2,938k | Tier 7 |
| 32 | 167k | 3,091k | |
| 33 | 182k | 3,258k | |
| 34 | 198k | 3,440k | |
| 35 | (빈 칸) | 3,638k | (T7 - MAX) 7st Evolution |
| 36 | 232k | (빈 칸) | Tier 8 |
| 37 | 250k | (빈 칸) | |
| 38 | 269k | (빈 칸) | |
| 39 | 290k | (빈 칸) | |
| 40 | 311k | (빈 칸) | (T8 - MAX) 8st Evolution |
| 41 | 333k | (빈 칸) | Tier 9 |
| 42 | 356k | (빈 칸) | |
| 43 | 380k | (빈 칸) | |
| 44 | 405k | (빈 칸) | |
| 45 | (빈 칸) | (빈 칸) | (MAX) 7st Evolution |

### 5-2. 곡선의 모양 — 지수로 시작해 선형으로 끝난다

이 문서가 위 표에서 계산한 것 (원문에 없는 열):

```
레벨 1→2  : 50 → 140     ×2.80
레벨 2→3  : 140 → 350    ×2.50
레벨 3→4  : 350 → 690    ×1.97
레벨 4→5  : 690 → 1,100  ×1.59
레벨 9→10 : 5,300 → 7,000 ×1.32
레벨 19→20: 39K → 45k    ×1.15
레벨 29→30: 127k → 140k  ×1.10
레벨 39→40: 290k → 311k  ×1.07
레벨 44→45: 405k → —     (미기재)
```

**증가율이 계속 떨어진다** — 초반 4레벨은 거의 3배씩 뛰고, 후반은 7%씩만 오른다. **초반이 가장 가파르고 후반으로 갈수록 평평해지는 감속 곡선**이다. 이는 「티어를 하나 올릴 때마다 걸리는 실시간이 대체로 비슷하게 유지되도록」 맞춘 형태로 **추정**되나, 몬스터가 주는 XP 곡선을 확인하지 못해 검증 불가 [미확인].

⚠ **누적 XP 열이 티어 경계마다 불연속이다.** 예: 레벨 5 누적 1,230 + 다음까지 1,100 = 2,330 인데 레벨 6 누적은 **3,560** 이다(차이 1,230). 레벨 30(1,795k) + 140k = 1,935k 인데 레벨 31 은 **2,938k**(차이 1,003k). **모든 Evolution 경계에서 이 점프가 일어난다.** 「Evolution 자체가 XP 를 소모한다」로 읽을 여지가 있으나 **위키가 누적 XP 열의 정의를 설명하지 않아 확정 불가** [미확인].

### 5-3. XP 분배 — [미확인] · 사망 페널티만 확인

- **파티 분배 방식은 어디에도 없다** — 균등인지 기여도인지 [미확인]
- 확인된 것은 **손실 규칙**뿐[위키:Dungeons & Raids]:
  - 영웅 개별 사망 → **"20% of the total experience towards their next level"** 손실
  - 파티 전멸 → **"all progress towards the next areas is lost"**
- **레벨업당 +1 HP 영구 보너스**(§3-1)는 XP 표와 별개로 붙는 유일한 확정 성장분

---

## 6. 능력치 체계 — 8종, 주력 축은 클래스당 하나

### 6-1. 8종 인포박스 — 확인된 6클래스 전량

> 라벨은 영어 표기가 확인된 4장(Footman·Warrior·Rogue·Light Disciple)을 정본으로 삼았다. Apprentice·Archer 는 번역판이라 §0 의 대응으로 슬롯을 맞춘 것이다.

| 클래스 | HP | Constitution | Dexterity | Intelligence | Mana Gain | Defense | Magic Defense | Threat |
|---|---|---|---|---|---|---|---|---|
| **Footman** | 40 | 8 | 4 | 3 | 10 | 20 | 20 | 1 |
| **Warrior** | 65 | 12 | 5 | 5 | 10 | 20 | 20 | **2** |
| **Rogue** | 30 | 6 | 7 | 4 | 10 | 10 | 10 | 1 |
| **Archer**[번역판] | 30 | 3 | 9 | 3 | 10 | 10 | 10 | 1 |
| **Apprentice**[번역판] | 20 | 1 | 4 | 10 | 11 | **0** | 30 | 1 |
| **Light Disciple** | 25 | 2 | 5 | 15 | 11 | **0** | 30 | 1 |

- **`Threat` 는 대상 지정 가중치다** — Warrior 만 2이고 나머지 전부 1이다. 그리고 `Threatening` 패시브가 "2x chance of being targeted"(§4-3)이므로, **스탯 `Threat` 와 패시브 `Threatening` 이 같은 축의 두 출처**다
- **캐스터는 `Defense` 가 0**이다 — 물리 방어를 아예 안 주고 `Magic Defense` 30 으로 몰아준다. **방어를 두 채널로 쪼개고 클래스마다 한쪽에 몰빵**하는 처리
- **`Mana Gain` 은 10~11 로 거의 균일**하다 — 클래스 차별화 축이 아니다(§4-4)
- 몬스터 스탯 열은 `HP · ATK · DEF · M.DEF · CON · DEX · INT · Mana`[위키:Enemies] — **몬스터만 `ATK` 를 직접 갖고 영웅은 안 갖는다.** 영웅의 공격력은 주력 능력치에서 파생된다(아래)

### 6-2. 주력 능력치는 클래스당 정확히 하나 — 그리고 그것이 전부를 민다

각 클래스 페이지의 "recommended stats" 서술[위키]:

| 클래스 | 주력 | 원문이 말하는 효과 |
|---|---|---|
| Footman | **Constitution** | "uses mainly constitution but could be profit from dexterity for a higher Crit chance to maximize his Damage potenital" |
| Warrior | **Constitution** | 위와 동일(Dexterity 는 치명 확률 보조) |
| Rogue | **Dexterity** | "uses mainly dexterity which increases his crit chance annd her base damage but could also profit from constitution" |
| Archer[번역판] | **Dexterity** | 공격력 · 마나 회복률 · 치명 확률을 민다 |
| Apprentice[번역판] | **Intelligence** | "attack power, magic core regeneration rate, and chance to hit weak points"(=치명) |
| Light Disciple | **Intelligence** | 피해 · **회복량** · 치명 확률 · 마나 회복 |

**설계가 대단히 좁다**:

1. **주력 능력치는 3종뿐이다** — Constitution(근접) / Dexterity(민첩 딜) / Intelligence(마법·회복). 클래스 하나에 하나씩
2. **그 하나가 공격력 · 치명 확률 · 자원 회복 · (캐스터는) 회복량까지 전부 민다.** 축이 갈리지 않는다
3. **HP · Defense · Magic Defense · Threat 은 플레이어가 미는 축이 아니다** — 클래스와 장비가 정한다
4. **능력치 포인트 배분 시스템의 흔적이 위키 28페이지 어디에도 없다** — 능력치는 클래스·레벨·장비가 정하고 플레이어가 배분하지 않는 것으로 **추정** [미확인]

---

## 7. 본작 대조 시사점

> 대조 대상 — 본작은 **전직 뿌리 45개**(5직업 × 3갈래 × 액티브 3, 그중 1개를 찍고 그 스킬에 세부 트리)가 확정됐고([skill_design.md §4-2 B안](../../game_design/skill_design.md) · §6), **트리의 형태(깊은 분기 트리 vs 얕은 선형 티어)가 미확정**이며 이것이 「본 프로젝트 최대의 콘텐츠 부채」로 기재돼 있다([GAME_DESIGN.md §10](../../game_design/GAME_DESIGN.md)).

### 7-1. 「45 뿌리 × 얕은 티어」는 감당된다 — 단, 재사용이 조건이다

본작 §7 이 던진 질문에 **숫자로 답한다.**

| | Guild Master (실물) | 본작 (계획) |
|---|---|---|
| 뿌리/계보 수 | 계보 **14** (뿌리 4에서 분기) | 전직 뿌리 **45** |
| 계보 길이 | **3~7단**, 평균 **5.14단** | 얕은 티어 안 = **3~5단** |
| **스킬 슬롯 총량** | **136** (액티브 72 + 패시브 64) | 45 × 4단 ≈ **180** |
| **실제 정의 수(랭크 포함)** | **77** | ? |
| **실제 정의 수(기본 이름)** | **38** | ? |

**첫 번째 결론 — 총량은 같은 자릿수다.** 본작의 「45 뿌리 × 3~5단」은 슬롯 기준 **135~225**로, **실제로 출시되어 5만+ 다운로드·평점 4.6 을 받은 모바일 방치형 하나의 클래스 콘텐츠 전량(136)과 같은 규모**다[스토어]. 「얕은 티어면 감당된다」는 §7 의 판단은 **실물 반례가 아니라 실물 증거를 얻었다.**

**두 번째 결론 — 그런데 조건이 붙는다.** Guild Master 는 그 136 슬롯을 **38개 기본 이름**으로 채웠다(재사용 3.58배 · §2-5). **본작이 180 노드를 전부 고유 정의로 채우면 Guild Master 의 4.7배 작업량**이 된다. 감당 가능성을 만든 것은 티어 구조 자체가 아니라 **재사용**이다:

```
Guild Master 의 재사용 두 층
  ① 랭크 재사용    Barrage → II → III → IV → V → VI     (6슬롯 = 정의 1개 + 숫자 6)
  ② 계보 간 공유    Backstab 을 스파이어·그림자 두 계보가 공유
                    Threatening 을 성기사·흑기사·근위·저거너트 네 계보가 공유
                    Saboteur 를 스파이어·레드스토커 두 계보가 공유
```

→ **본작에 대한 실행 가능한 권고**: 전직 뿌리 45개를 「45개의 서로 다른 액티브」로 잡으면 부채가 그대로 남는다. **같은 액티브를 여러 갈래가 공유하고, 갈래를 가르는 것은 그 위에 얹히는 패시브/노드**로 두면 총량이 3~4배 줄어든다. §2-2 **독궁수 계보**가 그 극단이다 — 본류와 **액티브가 완전히 같고**(`Barrage II`) 패시브만 다른데도 별개 갈래로 성립한다.

⚠ 다만 이 처리는 본작의 확정과 부딪히는 지점이 하나 있다 — §4-2 B안이 「전직이 액티브 **3개**를 주고 그중 하나를 찍는다」이므로 **45개는 「만들어야 하는 수」이지 「화면에 나오는 수」가 아니다**(화면에 오르는 것은 15). Guild Master 식 공유를 쓰면 **찍지 않은 2개까지 남의 갈래와 겹쳐 보여** 3택1의 변별력이 떨어질 수 있다. 재사용을 어디까지 허용할지는 §4-2 B안의 성립 조건(「센 순서가 아니라 역할로 갈려야 한다」)과 함께 봐야 한다.

### 7-2. 「승급 한 계단에 하나만 올린다」 — 계단을 쪼개 콘텐츠 없이 진행감을 만든다

**68번의 승급 중 91%가 액티브·패시브 중 하나만 건드리고, 50%는 로마숫자 하나가 오르는 것이 전부다**(§4-2). 이것이 이 게임의 **콘텐츠 절약 기법의 본체**다.

본작의 미확정 둘에 직접 닿는다:

- **「포인트 지급 곡선」·「노드 규모」**([skill_design.md §7](../../game_design/skill_design.md)) — Guild Master 는 노드 규모를 「티어당 1~2칸」으로 극단적으로 작게 잡고, 대신 **티어 수를 늘려** 진행감을 만든다. 본작이 「트리 하나에 노드 몇 개」를 정할 때, **노드를 크게 만들고 수를 줄이는 것보다 작게 만들고 수를 늘리는 쪽이 총 제작비가 싸다**는 실물 사례
- ⚠ **대가도 함께 확인된다** — 궁수 본류 계보는 **레벨 15~35 구간(전체 성장의 절반 이상) 성장이 `Barrage` 의 로마숫자 하나뿐**이다(§2-2). `Keen Vision` 은 5단 내내 안 오른다. **관전이 본편인 본작에서는 이 처리를 그대로 쓰면 안 된다** — 본작 §1-1 기준 2(「화면에 사건으로 보이는가」)로 재면, 5단을 올려도 화면에 나타나는 변화가 숫자 하나뿐인 구간은 관전 가치를 못 만든다. **본작이 §1-3 에서 「깊은 노드 = 반응·변형」을 둔 이유가 정확히 이 함정을 피하는 것**임이 반대편 사례로 확인된다

### 7-3. 직업 마스터리 부채 — 대조군은 「마스터리 층이 아예 없다」

본작 §10 「직업 마스터리 — 전사 T2 · 나머지 4직업(T1부터 전부 비어 있다)」에 대한 대조군으로서, **Guild Master 에는 마스터리에 해당하는 층이 존재하지 않는다.**

```
본작의 스킬 관련 층 4겹        Guild Master 의 층 1겹
  ① 죄종 마스터리 (T1~T3)        ① 승급 시 갈래 선택
  ② 직업 마스터리 (T1~)             (그 외 없음 — 스킬 포인트 0 · 능력치 배분 0 · 리스펙 0)
  ③ 전직 갈래 3택1
  ④ 전직 액티브 3중 1 + 세부 트리
```

- **플레이어가 스킬에 대해 내리는 결정이 「승급 갈래 선택」 단 하나**다. 그 결정은 영웅당 **2~3회**(분기점 수, §2-0) 일어나고 끝이다
- **이것이 본작의 무게를 재는 눈금이 된다** — 본작은 같은 자리에 4겹을 쌓았고, 그중 2겹(직업 마스터리 5종 × T1~, 전직 세부 트리 45개)이 아직 비어 있다. Guild Master 는 그 4겹 없이도 평점 4.6 · 5만+ 다운로드를 받았다[스토어]
- **다만 그 대가로 Guild Master 에는 「빌드」가 없다.** 스토어가 "equip the best items that synergize with their **builds**" 라고 쓰지만[스토어], 빌드를 만드는 것은 **클래스 선택과 장비**뿐이다. 본작이 「빌드·편성·배분 의사결정이 본체」(CLAUDE.md)로 잡은 이상 **이 게임의 얇음을 그대로 따라갈 수는 없다** — 참고 대상은 **총량 절약 기법**(§7-1·§7-2)이지 층 수가 아니다

### 7-4. 전직의 롤백 — 이 게임은 「되돌리기」 대신 「영웅을 갈아치우기」로 푼다

본작 §7 「전직의 롤백」은 딜레마를 이렇게 적어 뒀다: **무료면** 전직이 결정이 아니라 상황별 스위치가 되고, **유료·불가면** 「잘못 찍어 영웅 하나를 버리는 일이 없어야 한다」(통제성)에 예외가 생기는 대신 **영웅마다 전직이 다른 로스터**를 굴리게 된다.

**Guild Master 는 후자를 골랐고, 그 대가를 로스터 공급으로 갚는다.** (⚠ 롤백 가능 여부 자체는 **[미확인]** — §3-3. 아래는 확인된 주변 사실에서 읽은 것이다)

| 확인된 것 | 출처 |
|---|---|
| 선술집이 **일정 시간마다 새 영웅을 자동으로 밀어넣고, 가장 오래 머문 영웅을 밀어낸다** | [위키:Headquarters] |
| 지키고 싶은 영웅은 **잠금(lock)** 을 걸어 밀려나지 않게 한다 | [위키:Headquarters] |
| 대기 시간 단축·수용량 확장을 화폐로 산다 | [위키:Headquarters] |
| **"Create multiple teams optimized for particular tasks and encounters"** 가 공식 기능 | [스토어] |
| 일반 던전 파티 = 영웅 4 + 펫 1 · 레이드 = 최소 영웅 5 | [위키:Dungeons & Raids] |

→ **영웅 공급이 사실상 무한이므로 「하나 잘못 키웠다」의 비용이 낮고, 그래서 롤백이 없어도 통제성이 무너지지 않는다.** 본작은 **레어 영웅이 무한 생성**(GAME_DESIGN.md §10 「영웅 리롤 루프」 — "레어가 무한 생성인데 리롤에 목표가 없다")이므로 **같은 손잡이를 이미 갖고 있다.** 즉 본작에서 「전직 롤백 유료·불가」를 고르는 선택지는 통제성 파괴가 아니라 **리롤 루프에 목표를 주는 방향**으로 작동할 수 있다 — 지금 비어 있는 「리롤의 목표」 자리에 「원하는 전직을 가진 영웅을 뽑는다」가 들어간다.

⚠ **채택 제안이 아니라 대조다.** 본작은 이미 「되돌릴 수 있다는 게 이 게임의 연구」(§5)를 철학으로 적어 뒀고, 두 해법은 배타적이다. Guild Master 가 보여주는 것은 **「롤백 없음 + 영웅 공급 무한」이 실제로 성립하는 조합**이라는 것 하나다.

### 7-5. 변형 노드의 선례는 여기에도 없다 — 세 번째 확인

본작 §1-3 은 **변형 노드**(「배쉬가 `단일` → `광역` 이 된다」)를 두면서, 2026-08-28 조사로 **「D2 선례 없음 · 선례 없는 신규 구조」**로 정정한 바 있다.

**Guild Master 에도 없다.** 이 게임에서 「단일 → 광역」에 해당하는 전환은 딱 하나 있는데(**`Condemn` → `Condemn All`**, 성기사 계보 Paladin → Templar), 처리 방식이 정반대다:

```
본작의 변형 노드    :  같은 스킬이 태그를 바꾼다 (배쉬 → 광역 배쉬)
Guild Master        :  이름이 다른 별개 스킬로 교체된다 (Condemn → Condemn All)
D2                  :  선행 스킬 사슬 — 넷 다 따로 존재하고 넷 다 항상 쓸 수 있다
```

→ **「스킬이 자기 성질을 바꾼다」는 구조는 세 번째 참고작에서도 발견되지 않았다.** §1-3 의 「선례 없는 신규 구조」 판정을 **유지·강화**한다. 대신 세 게임이 전부 같은 대체 수단을 쓴다는 것이 확인됐다 — **「비슷하지만 이름이 다른 스킬을 하나 더 만든다」**. 이 방식은 변형 노드보다 **제작비가 비싸고**(스킬 정의가 하나 더 생긴다) **예산 산정은 쉽다**(§7 「변형 노드의 예산 자」 미결이 이 방식에선 애초에 안 생긴다). 본작이 변형 노드의 예산 자를 못 세우면 이 우회로가 있다.

⚠ **단, `Barrage` 의 로마숫자가 대상 수를 늘리는지 확인 못 했다**(§4-3). 늘린다면 이 판정은 뒤집힌다 — 그때는 **랭크업이 곧 변형**인 사례가 된다. [미확인]으로 남긴다.

### 7-6. 타겟팅 — 「확률 가중」이라는 제3의 답

본작 §7 은 두 과제를 나란히 미결로 두고 있다: **「기본 타겟팅 규칙」**(무작위인가 최저 HP 인가)과 **「도발 vs 엄호」**(도발은 적 AI 를 건드려 위험, 엄호는 안 건드림).

**Guild Master 는 두 문제를 하나로 푼다 — 스탯이다.**

| 확인된 것 | 원문 |
|---|---|
| `Threat` 가 8종 기본 능력치 중 하나 (Footman 1 · Warrior 2) | [위키:Footman·Warrior 등] |
| `Threatening` 패시브 = **"This unit has a 2x chance of being targeted by enemies."** | [위키:Warrior] |
| 저거너트 계보는 액티브 `Taunt` I~III 를 별도로 갖는다 | [위키:Classes] |
| `Healer` 패시브의 회복 대상 = **"the ally with the lowest health"** | [위키:Light Disciple] |

→ **대상 선택이 「확정 고정」이 아니라 「확률 가중치」**다. 그래서:

1. **기본 타겟팅이 「가중 무작위」로 정의되면 도발이 그 가중치를 곱하는 것으로 끝난다** — 적 AI 에 예외 분기를 안 만들어도 되므로, 본작 §7 이 「도발은 구현 위험이 크다」고 본 이유가 상당히 줄어든다. **본작에 없는 제3의 선택지**다
2. **「무작위 vs 최저 HP」는 둘 중 하나가 아니어도 된다** — Guild Master 는 **적의 공격 대상은 가중 무작위**, **아군 회복 대상은 최저 HP** 로 **채널마다 다르게** 정했다. 본작이 하나의 규칙으로 통일하려는 전제 자체를 의심해 볼 근거
3. ⚠ **방치형 계약과의 관계는 확인 못 했다** — 확률 가중이면 「기사가 안 맞는 라운드」가 운으로 발생한다. 본작이 회피를 폐지한 이유(GAME_DESIGN.md §10 「전기의 분산」 — "운에 의한 전멸")와 같은 구조의 위험이 있다. Guild Master 가 이를 어떻게 처리하는지는 [미확인]

### 7-7. 그 밖의 대조 — 짧게

- **패시브가 티어 2~4 에서야 열린다**(§4-1, 8개 클래스가 패시브 없음) — 본작은 마스터리가 **1레벨부터** 열린다(§1-4). Guild Master 의 초반은 **액티브 1개로만 도는 구간**이고, 본작의 「전직 해금 전엔 고유 + 무기군 2칸」(§2)보다도 얇다. **초반을 스킬로 안 채우고 파밍·해금으로 채우는 것**이 두 게임의 공통 처리
- **`Healer` 패시브에 "Can be used while exploring" 이 명시돼 있다**(§4-3) — **비전투 시간에도 도는 패시브**가 존재한다. 본작의 컨셉 락(오프라인 = 파견)에서 「파견 중에 영웅의 스킬이 기여하는가」는 §10 「수색 판정에 장비·스킬이 기여하는가」로 **보류**돼 있는데, Guild Master 는 **패시브 텍스트에 그 여부를 직접 박아서** 스킬 단위로 정한다. 「전부 기여한다/전부 안 한다」의 이분법을 피하는 방법
- **영웅과 몬스터가 같은 스킬 문법(액티브 1 + 패시브 1)을 쓴다**(§4-1, [위키:Enemies]) — 본작 §7 「몬스터 스킬 풀」이 "몬스터가 액티브 2칸을 갖는다면 그 풀이 필요하다 / 직업 스킬 풀을 영웅과 공유하면 총량이 안 늘어난다"로 미결인데, **Guild Master 는 문법은 공유하되 스킬 목록은 따로 갖는다**(몬스터 전용 Stomp·Escape·Initiative·Flying·Leech 등). 즉 **「문법 공유 ≠ 풀 공유」**이고, 풀을 나눠도 구현 비용은 안 늘어난다는 사례
- **주력 능력치가 클래스당 하나이고 그 하나가 공격력·치명·자원을 전부 민다**(§6-2) — 본작은 「궁수의 주력 축」·「기사 주력 축」·「몽크의 계수 축」 **셋이 동시에 미결**이다(§10). Guild Master 의 답은 **축을 3개(CON/DEX/INT)로 줄이고 하나에 모든 효과를 몰아주는 것**이다. 본작은 능력치가 이미 더 많고 파견에도 쓰이므로 그대로 쓸 수 없지만, **「한 클래스의 주력 축은 하나이고, 그 축이 여러 전투 효과를 동시에 민다」**는 원칙 자체는 세 미결을 한 번에 닫는 형태가 될 수 있다

---

## 8. 출처 · 미확인(N/F) 총괄

### 8-1. 확보한 출처

**공식 위키** (`https://idleguildmaster.wiki.gg/`, WebFetch 원문 열람)

- [`/wiki/Classes`](https://idleguildmaster.wiki.gg/wiki/Classes) — **14계보 72클래스 전량**(레벨 범위·액티브·패시브). 이 문서 §2 의 전부. 3회 재열람으로 레벨 문자열 교차확인
- [`/wiki/Levels_and_XP`](https://idleguildmaster.wiki.gg/wiki/Levels_and_XP) — **XP 표 45행 전량** + Evolution 규칙 원문 3문장
- [`/wiki/Footman`](https://idleguildmaster.wiki.gg/wiki/Footman) · [`/wiki/Warrior`](https://idleguildmaster.wiki.gg/wiki/Warrior) · [`/wiki/Rogue`](https://idleguildmaster.wiki.gg/wiki/Rogue) · [`/wiki/Light_Disciple`](https://idleguildmaster.wiki.gg/wiki/Light_Disciple) — 기본 능력치 8종 · 스킬 원문 · 승급 대상 (영어 원문)
- [`/wiki/Apprentice`](https://idleguildmaster.wiki.gg/wiki/Apprentice) · [`/wiki/Archer`](https://idleguildmaster.wiki.gg/wiki/Archer) — 같은 항목 (번역판, §0 주의)
- [`/wiki/Dungeons_&_Raids`](https://idleguildmaster.wiki.gg/wiki/Dungeons_%26_Raids) — 파티 4+펫1 / 레이드 5 · 사망 시 XP 20% 손실
- [`/wiki/Headquarters`](https://idleguildmaster.wiki.gg/wiki/Headquarters) — 화폐 3단(100진법) · 선술집 모집 규칙 · 영웅 트레잇 16종
- [`/wiki/Enemies`](https://idleguildmaster.wiki.gg/wiki/Enemies) — 몬스터도 액티브/패시브 1+1 · 몬스터 스탯 열
- [`/wiki/Items`](https://idleguildmaster.wiki.gg/wiki/Items) — 카테고리만 (상세는 [02_items.md](02_items.md) 담당)
- [`/wiki/Special:AllPages`](https://idleguildmaster.wiki.gg/wiki/Special:AllPages) — **위키 전체가 28페이지**임을 확정 (조사 범위의 상한을 그은 근거)

**스토어** — Google Play [`it.paranoidsquirrels.idleguildmaster`](https://play.google.com/store/apps/details?id=it.paranoidsquirrels.idleguildmaster). 직링크는 본문 절단으로 실패, [appbrain 미러](https://www.appbrain.com/app/guild-master-idle-dungeons/it.paranoidsquirrels.idleguildmaster)로 설명문 전문 확보. 개발사 Paranoid Squirrels · 버전 2.148(2026-08-21) · 평점 4.6 / 리뷰 3.88K / 5만+ 다운로드 · 2024년 5월 출시. 확보 문구: "FULLY AUTOMATED TURN BASED COMBAT" · "70+ DIFFERENT CLASSES WITH UNIQUE ABILITIES" · "Create multiple teams optimized for particular tasks and encounters"

**나무위키** — [`en.namu.wiki/w/Guild master idle dungeons`](https://en.namu.wiki/w/Guild%20master%20idle%20dungeons). 기계번역 심함(§0). **교차확인에만 사용**: ①시작 클래스 4종("four basic adventurer types: infantry, apprentices, archers, thieves") ②9티어 구조("adventurers can grow up to 9 grades, and up to 5 labels will rise by 5")

**시도했으나 소득 없음** — `/wiki/Guild_Master_-_Idle_Dungeons`(WIP 껍데기) · `/wiki/Example_character`(위키 인포박스 데모용 삭제 예정 더미) · Google Play 직링크(본문 절단) · 레딧/스팀 커뮤니티 검색(이 게임 관련 스레드 0건)

### 8-2. 미확인(N/F) 총괄

| 항목 | 상태 |
|---|---|
| **승급(Evolution)의 대가** | 레벨 상한 도달 외에 아이템·재화·건물이 필요한지 **전혀 확인 못 함**. 위키·나무위키·스토어·검색 전부 침묵 (§3-2) |
| **승급의 롤백 가능 여부** | **전혀 확인 못 함.** respec/reset/class change 라는 단어가 어떤 출처에도 없다. §3-3 의 서술은 **주변 사실에서 읽은 정황**이지 확인이 아니다 |
| **스킬 개별 수치 66/72** | 클래스 상세 페이지가 **6장뿐**이라 나머지 66개 클래스의 액티브·패시브 수치가 없다. 확보한 6개는 §4-3 |
| **로마숫자 랭크가 무엇을 올리는가** | 배율만인지 대상 수·부가 효과도인지 **미확인**. `Barrage` 가 「무작위 2대상」이라 대상 수 증가 가능성이 열려 있고, 이것이 §7-5(변형 노드 선례 판정)를 뒤집을 수 있다 |
| **스킬 발동 방식** | `Mana Gain` 스탯과 "mana regeneration" 서술로 **마나 소모가 강하게 시사**되나(§4-4), 마나 비용·발동 조건·턴 순서를 설명하는 페이지가 없다. 「쿨다운」이라는 단어는 위키 전체에서 미발견 |
| **분기 관계 10/13** | `Classes` 페이지에 트리 다이어그램이 없어 **레벨 상한 정합으로 역산**했다(§2-0). 확인된 분기는 3건뿐 |
| **Light Disciple 의 티어** | 위키 3개 지점이 서로 모순(§3-4). 확정 불가 |
| **최대 레벨 40 vs 45** | 같은 페이지의 산문과 표가 충돌(§3-4) |
| **레벨 36~45(티어 8·9)의 클래스** | 대응 클래스가 하나도 없다. 「위키 미완」인지 「승급이 35에서 끝난다」인지 확정 불가(§3-4) |
| **누적 XP 열의 정의** | Evolution 경계마다 불연속인데 위키가 열의 의미를 설명하지 않는다. 「Evolution 이 XP 를 먹는다」는 읽기는 **추정**(§5-2) |
| **XP 파티 분배 방식** | 균등/기여도/기타 **전혀 없음**. 확인된 것은 사망 시 20% 손실뿐(§5-3) |
| **능력치 포인트 배분 시스템 유무** | 위키 28페이지에 흔적 0. 「없다」로 **추정**하나 위키가 작아 확증 아님(§6-2) |
| **72개가 전량인지** | 스토어 "70+" 와 자릿수 일치가 유일한 방증. 완전 전량이라는 확증 없음(§1) |
| **확률 가중 타겟팅과 방치형 계약** | `Threat` 가중치가 운에 의한 전멸을 만드는지, 게임이 이를 어떻게 막는지 **미확인**(§7-6) |

---
*마지막 업데이트: 2026-08-31 (최초 작성)*
