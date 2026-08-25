# 장비 2차 개조 층 전수 조사 — Path of Exile 2 / Last Epoch

> 상위: [socket_layer_reference.md](../socket_layer_reference.md) · 상태: **총조사 완료** (2026-08-25)
> 조사 범위: Path of Exile 2 (EA 0.5) 룬·소울 코어·아이돌·차암·젬 / Last Epoch (1.4) 아이돌·크래프팅·LP·Weaver
> ⚠ **이 문서의 수치는 전부 참고작의 수치다.** 본작 SSOT가 아니며 `src/data/*.csv`로 옮기지 말 것

---

조사 기준일: 2026-08-25. 검색 20회+, 원문 fetch 60회+ (접근 거부·404 포함). 
**버전 기준**: PoE2 = 얼리액세스 **0.5.x "Return of the Ancients"** (0.5.0 2026-05-29 출시, 0.5.4까지 확인). Last Epoch = **1.4.x "Shattered Omens" (Season 4, 2026-03-26 출시, 1.4.6까지 확인)**. 다음 시즌 5 "Rage of the Frostborn"은 2026-10-01 예정이나 시스템 미공개.

접근 실패로 대체한 1차 자료: poe2wiki.net(Anubis 차단) → poe2db.tw + 공식 패치노트 포럼. lastepoch.fandom / lastepochtools.com(402/403 차단) → maxroll·icy-veins·tunklab·공식 포럼 패치노트.

---

# 게임 1: Path of Exile 2 (EA 0.5.x)

## 1. 시스템 한 장 — 개조 층 구성

| 층 이름 | 붙는 곳 | 획득처 | 효과 성격 | 제거·회수 | 합성/승급 경로 |
|---|---|---|---|---|---|
| **룬 (Rune)** — 오그먼트(Augment)의 기본형 | 장비의 **오그먼트 소켓**(0.4.0 이전 명칭 "룬 소켓") | 일반 드롭(0.2.0에서 드롭률 2배), 0.5.0부터 Remnant 조우 | **고정** (부위 유형에 따라 효과가 달라짐: 근접무기/완드·지팡이/방어구) | 0.1.0 영구 → **0.1.1 덮어쓰기 가능(기존 룬 파괴)** → 0.4.0~ Orb of Extraction으로 **장비를 파괴하고 룬 회수** / "Socket-Bound" 룬은 회수 불가 | 0.2.0: 하위 3개 → 상위 1개 (Lesser→Normal→Greater). 0.5.x: Perfect 등급, Masterwork Rune("소켓된 룬을 승급") |
| **소울 코어 (Soul Core)** | 같은 오그먼트 소켓 | Trial of Chaos 보상(엔드게임은 Inscribed Ultimatum 필요), 환전소 | 고정, 룬보다 희귀·강력, 무기/방어구 효과가 아예 다름 | 룬과 동일 규칙 | 0.4.0부터 대부분 **"Limited to 1"** |
| **아이돌 (Idol)** = 0.2.0 "탈리스만" → 0.4.0 개명 | 같은 오그먼트 소켓, 단 **부위 지정**(투구/갑옷/장갑/신발/방패/포커스, 0.5.0부터 셉터) | Azmerian Wisp에 빙의된 몬스터 드롭 | 고정, 부위별 효과 상이 + **Bonded 보조 효과**(조건부 개방) | 룬과 동일 | Fox/Rabbit/Stag 및 "Idol of ○○" 계열 Limited to 1 |
| **Ancient Augment / Warding Rune / Legacy Rune** (0.3~0.5 추가) | 같은 오그먼트 소켓 | Abyss Dark Domain(0.3), Remnant(0.5), Aldur's Legacy로 유니크를 파괴해 생성(0.5) | 고정, 빌드 정의급 | 동일, 다수 Limited to 1 | 없음 |
| **차암 (Charm)** | **벨트의 차암 슬롯(1~3)** | 일반 드롭, 매직/레어/유니크 존재 | 조건 발동 자동 소모품(충전제) | 자유 장착·해제 | 접사 롤(지속시간↑, 소모 충전↓ 등) |
| **주얼 (Jewel)** | **패시브 트리 주얼 소켓** (캐릭터 측) | 드롭, Trial of Sekhemas(Time-Lost), Expedition/Olroth(Timeless) | 랜덤(노말·매직 2, 레어 최대 4개 접사), 반경형은 트리 노드 개조 | **자유 탈착·무료** | 없음 |
| **스킬 젬 + 서포트 소켓** | **젬 자체**(캐릭터 슬롯 9개, 장비와 완전 분리) | 언커트 젬 → 젬 커팅 | 젬당 서포트 2→최대 5 | 자유 | Lesser/Greater/Perfect Jeweller's Orb로 3/4/5소켓 |
| (대조용) 에센스·오멘·카탈리스트·Runic Alloy | 장비 접사 자체 | 드롭/Ritual/Remnant | 접사 강제·메타 크래프트 | — | 에센스 4등급(0.3.0), 오멘 스택 10(0.3.0) |

## 2. 각 개조 아이템 상세

### 2-1. 룬 (Rune)

**등급 구조 (버전별)**
- 0.1.0: 단일 등급.
- 0.2.0 (2025-04, 공식 패치노트): "Runes now have 3 tiers, for example the Storm Rune has been split into a Lesser Storm Rune, a Storm Rune and a Greater Storm Rune." / "You are able to reforge 3 Lesser Runes for 1 regular Rune of that type, and reforge 3 regular Runes for 1 Greater Rune of that type." / "Doubled the drop rate of Runes." / "You can no longer reforge 3 Runes to obtain a random Rune in return."
- 0.5.x (poe2db 현행 DB): **Perfect 등급**(요구 레벨 50) 추가 확인, **Masterwork Rune**("All Equipment: Upgrades a socketed Rune", 드롭 레벨 37) 확인. 도입 패치 번호는 미확인(0.5.0 추정).
- maxroll(0.4.0 갱신판): "Endgame Runes exist separately and cannot be upgraded via the Reforging Bench."

**기본 룬 14종 × 4등급, 부위별 효과 (poe2db 0.5.x, 요구 레벨 Lesser~Normal 15 / Greater 30 / Perfect 50)**

| 룬 | 근접무기 (L / N / G / P) | 완드·지팡이 | 방어구 |
|---|---|---|---|
| Desert | 화염 +4~6 / 7~11 / 13~16 / 17~20 | 화염 추가피해 6/8/10/12% | 화염저항 +10/14/18/22% |
| Glacial | 냉기 +3~5 / 6~10 / 9~15 / 16~20 | 냉기 추가피해 6/8/10/12% | 냉기저항 +10/14/18/22% |
| Storm | 번개 +1~10 / 1~20 / 1~30 / 1~40 | 번개 추가피해 6/8/10/12% | 번개저항 +10/14/18/22% |
| Iron | 물리피해 14/16/18/20% 증가 | 주문피해 20/25/30/35% | 방어·회피·ES 14/16/18/20% |
| Body | 물리피해 생명력 흡수 3/4/5/6% | 최대 ES +30/40/50/60 | 최대 생명력 +30/45/60/75 |
| Mind | 물리피해 마나 흡수 2/3/4/5% | 최대 마나 +45/60/75/90 | 최대 마나 +20/30/40/50 |
| Rebirth | 처치당 생명력 15/25/35/45 | ES 재충전 6/8/10/12% | 초당 생명력 재생 0.35/0.4/0.45/0.5% |
| Inspiration | 처치당 마나 10/20/30/40 | 마나재생 20/25/30/35% | 마나재생 12/15/18/21% |
| Stone | 기절 축적 20/30/40/50% | ES의 10/12/14/16%를 기절 역치로 | 기절 역치 +50/75/100/125 |
| Vision | 명중 +60/90/120/150 | 주문 치명타 확률 16/20/24/28% | 플라스크 회복 8/12/16/20% |
| Tempered | 물리 +3~4 / 6~9 / 9~12 | — | 가시 피해 6~9 / 14~21 / 31~52 |
| Robust / Adept / Resolve | 모든 장비: 힘/민첩/지능 +6 / (N 미확인) / +12 / +15 | 동일 | 동일 |

0.5.0 패치노트 검증 라인: "Body Runes now grant +30/45/60 Maximum Life when socketed in Armour items (previously +20/30/40)." / "Desert Runes now grant +10/14/18% to Fire Resistance ... (previously +10/12/14%)." / "Standard Rune Bonded Modifiers now grant 20 Life and 20 Mana when socketed in Armour items (previously 10 Life and 10 Mana)."

**0.5.0 추가 룬군 (poe2db)**
- **Ward Rune / Charging Rune** (Runic Ward 전용, 4등급): 최대 Runic Ward +15/20/25/30, Ward 재생 8/12/16/20%.
- **Warding Rune of ○○** (Lv15~45, 상당수 Limited to 1, 부위 지정): 예) of Protection "Every 4 seconds, gain Guard equal to 20% of maximum Runic Ward for 2 seconds", of Annihilation "Attacks spend 5% of your maximum Runic Ward ... to gain that much added Physical damage", of Obsession(완드) "All damage taken bypasses Runic Ward, Runic Ward Regeneration Rate is doubled".
- **고유명 룬 (Lv50, Limited to 1, 부위 지정)** 21종: 예) Countess Seske's Rune of Archery(활) "Bow Attacks fire 1 additional Arrows", Farrul's Rune of the Hunt(근접) "50% increased Attack Damage against Rare or Unique Enemies", Hedgewitch Assandra's Rune of Wisdom(완드·지팡이) "+1 to Level of all Spell Skills", The Greatwolf's Rune of Willpower(갑옷) "15% of Damage is taken from Mana before Life".
- **Ancient Augment (Lv60, Limited to 1)**: Emergent Vigour/Possibility/Protection/Instinct — 부위별로 3가지 효과.
- **Runeseeker's Call**(유니크 완드, Lv65): "Only Runes can be Socketed in this item / 200% increased effect of Socketed Runes / Has 5 Augment Sockets (Hidden)".
- 0.5.0 패치노트: "Added 13 Ancient Runes which can be unlocked to be crafted by Remnant encounters after completing Farrow's quest in Act 4."

**Bonded 보조 효과 (0.4.0~0.5.x)**: 모든 룬·아이돌에 "Bonded" 라인이 붙어 있으나 기본 비활성. 활성 조건 확인분: Druid Shaman 전직 노터블 **Wisdom of the Maji "Gain the benefits of Bonded modifiers on Runes and Idols"** (poe2db), **Fox Idol "Other Socketed Idols in this item also grant their Bonded Modifiers"** (0.5.0 패치노트). 즉 특정 빌드만 2차 효과를 여는 "잠긴 라인" 구조.

**0.5.0 Aldur's Legacy** (fextralife): "When socketed into a Unique Kalguuran or Ezomyte item, destroys the item to create a Rune imbued with that item's power" — 유니크를 파괴해 **축소판 효과의 Legacy Rune** 생성(예: Trampletoe 30% → 룬에서 약 10%). "Corrupted Uniques cannot be used with Aldur's Legacy."

### 2-2. 소울 코어 (Soul Core)
- 획득: "Soul Cores are obtained as a reward for defeating bosses in the Trials of Chaos" + 환전소(Cruel 이후) (game8). fextralife: 기본 15종, 드롭 레벨 35, "the weapon effect and armour effect are different, so many cores are used exclusively in one or the other".
- 0.4.0 패치노트: "Multiple Soul Core items now have limits of 1" (maxroll 요약). fextralife(0.5): "Most PoE2 Soul Cores are limited by type".
- 대표 효과 (game8/fextralife):
  - Azcapa: 무기 "+15 to Spirit" / 방어구 골드 획득량 (0.2.0 패치노트: "5% increased quantity of Gold dropped by slain Enemies (previously 10% increased Rarity of Items found)", 0.5 fextralife 표기 10%)
  - Ticaba: 무기 "+5% Critical Damage" / 방어구 "20% reduced enemy Critical Damage"
  - Topotante: 무기 "15% Elemental Penetration" / 방어구 "40% of Armour also applies to Fire Damage"
  - Citaqualotl: 무기 "Adds 19 to 29 Chaos Damage"
  - Xopec/Opiloti/Guatelitzi: "50% Chance when you gain a Power/Frenzy/Endurance Charge to gain an additional ..."
  - Tacati(방어구): "Enemies you Curse have -5% to Chaos Resistance"
  - Quipolatl(방어구): "8% increased Skill Effect Duration, 8% increased Cooldown Recovery Rate"
  - Thesis 계열(Citaqualotl's/Guatelitzi's/Jiquani's/Quipolatl's Thesis, Xipocado's Soul Core of Dominion): 갑옷/장갑/투구/신발별 상이 효과.
- 0.1.1: "Soul Cores of Atmohua, Zantipi, or Cholotl could not be used for the 3:1 recipe" 버그 수정 → 0.1.x에는 소울 코어에도 3:1 랜덤 재조합이 있었음(0.2.0에서 룬 랜덤 3:1 폐지).

### 2-3. 탈리스만 → 아이돌 (0.2.0 → 0.4.0 개명)
- 0.2.0: Azmerian Wisps 도입("Introduced Azmerian Wisps - spirits that can be found throughout both the campaign and the Endgame."). 빙의 몬스터가 **Talisman**(소켓형) 드롭. game8: "Talismans are new socketable, similar to Runes and Soul Cores, but can only be inserted into specific types of equipment." 드롭 레벨 35+, Fox/Rabbit은 65+ (mobalytics 검색요약, ★★).
- 0.3.0: "The Talisman of Eeshta now provides 10% increased Cost Efficiency (previously 6% reduced Cost of Skills)."
- **0.4.0 (2025-12) 패치노트**: "Existing Augment Talismans have been renamed to Idols." / "Added a new weapon class: Talismans. Talismans are two-handed martial weapons that are used for shapeshifting attacks." / "Rune Sockets have been renamed to Augment Sockets. Non-jewel items that go into Augment Sockets have been renamed from Socketables to Augments." / game8: "The endgame Idols now only has a limit of 1 for each character".
- **0.5.0**: "Added 8 new Idols that come exclusively from monsters possessed by Azmerian Spirits." / "All Idols can now also be socketed into Sceptres." (셉터 소켓 시 "Allies in your Presence" 계열 파티 버프) / "Fox Idol now has a limit of 1." / "Stag Idol now has a limit of 1. It now grants Projectiles have 15% chance to Fork when socketed in Helmets." / "Idol of Grold now is socketed into Boots. It now grants 50% increased total Power counted by Warcries (previously 20%)."
- 예시 (poe2db): Snake Idol 장갑 "8% increased Curse Magnitudes" / Bear Idol 투구 "10% increased Area of Effect" / Rabbit Idol 갑옷 "12% increased Rarity of Items found" / Primate Idol 투구 "Minions have 12% increased maximum Life" · 셉터 "Allies in your Presence deal 30% increased Damage".
- fextralife: "Once they are socketed, these Idols cannot be removed, but can only be replaced with a different socketable item."

### 2-4. 차암 (Charm)
- 구조: 벨트 차암 슬롯에 장착, **조건 충족 시 자동 발동**, 충전 소모, 처치로 재충전. poe2db: "Charm charges can be regained by killing monsters, granting charges equal to half of the monster's Power."
- 0.1.1: "Charms now play an effect on your character when they are automatically used" / "Charms now display their number of charges and when they're active."
- **베이스 13종 (poe2db 0.5.x)** — 최대 40충전(Golden만 80):

| 차암 | 발동 조건 | 효과 | 지속 | 소모/최대 |
|---|---|---|---|---|
| Thawing | 빙결 시 | 빙결 면역 | 3s | 40/40 |
| Staunching | 출혈 시 | 출혈 면역 | 3s | 30/40 |
| Antidote | 중독 시 | 중독 면역 | 3s | 20/40 |
| Dousing | 점화 시 | 점화 면역 | 3s | 30/40 |
| Grounding | 감전 시 | 감전 면역 | 3s | 30/40 |
| Stone | 기절 시 | 기절 불가 | 2.5s | 20/40 |
| Silver | 둔화 시 | 둔화 무시 | 3s | 20/40 |
| Ruby/Sapphire/Topaz | 해당 속성 피격 | +25% 저항 | 4s | 20/40 |
| Amethyst | 카오스 피격 | +18% 저항 | 4s | 30/40 |
| Golden | 레어/유니크 처치 | 아이템 희귀도 15%↑ (0.2.0: "previously 20%") | 1s | 80/80 |
| Cleansing | 저주 시 | 저주 면역 | — | 20/40 |

- fextralife 구판(패치 미표기)은 최대 80충전·소모 40~80로 기재 → **충전 수치가 개편된 것으로 보이나 패치 번호 미확인**.
- 접사: 매직/레어 차암에 "increased Duration" 접두, 사용 시 Guard/생명/마나 회복 접두, 소모 충전 감소 계열(fextralife/mobalytics 요약). 유니크 차암 12종(예: Beira's Anguish, 0.3.0 "Creates Ignited Ground for 4 seconds when used").
- **벨트 슬롯 (poe2db)**: 모든 일반 벨트 베이스 "(1—3) Charm Slots" (슬롯 수는 롤), 특수 벨트(Stalking/Invoking/Sinew/Forking) 1슬롯. 차암 관련 암시: Long Belt "(15—20)% increased Charm Effect Duration", Ornate Belt "(10—15)% reduced Charm Charges used", Double Belt "(20—30)% increased Charm Charges gained". 유니크: Ingenuity(0.2.0) "+1-2 Charm Slots, -20-20% increased Charm Charges Gained, and -10-10 reduced Charm Charges Used", Elevore 투구(0.5.0) "+1-2 Charm Slots (previously +1)", "Charms gain 1 Charge per second".

### 2-5. 스킬 젬 / 서포트 젬 / 스피릿
- 장비 소켓·링크 폐지. 캐릭터에 **스킬 젬 슬롯 9개**, 각 스킬 젬은 **기본 서포트 소켓 2개** → Lesser(3)/Greater(4)/Perfect(5) Jeweller's Orb로 확장, 드롭 레벨 25/45/65 (fextralife/outof.games). 위키 문구: "Skill Gems have their own sockets and can link up to six Support Gems." (6은 구 계획 잔재로 보이며 현행 최대 5 — 미확인 항목에 기재).
- 언커트 젬 → 젬 커팅으로 원하는 젬 선택. 0.3.0: "Uncut Skill, Support, and Reservation Gems can now be traded through the Currency Exchange."
- **동일 서포트 중복 금지 규칙**: 0.1~0.2 캐릭터당 각 서포트 1개. **0.3.0 폐지**: "We've removed the restriction of having one of each support gem per character. You can use as many copies as you like." 동시에 "We've added 11 new Support Gems" / "40 Lineage Supports, much more powerful Supports that are only available in Endgame." 0.3.0: 속성 미달 시 해당 서포트만 비활성(스킬 전체 비활성에서 완화). 0.5.0 "Added over 20 new Support Gems."
- **Spirit** (maxroll, 0.3 기준): "Spirit is a Resource ... which you reserve to enable the effects of persistent Skills like Auras, Buffs, permanent Minions, and Meta Gems." 캠페인 보스로 총 100, 갑옷/목걸이 접두, 셉터 기본치(이도류 셉터 불가), Soul Core of Azcapa +15. 예: Arctic Armour 30, Cast on Shock 60.

### 2-6. 주얼
- 패시브 트리 주얼 소켓에 장착. game8: "you can freely remove and replace Jewels after being socketed!" (룬·소울코어와 대조).
- 베이스 Ruby(힘/방어)·Emerald(민첩/회피)·Sapphire(지능/ES) + Diamond(유니크용). stratlore(0.5.4): "Normal/Magic = 2 mods, Rare = up to 4, Unique = fixed lines."
- **Time-Lost 주얼** (Trial of the Sekhemas): 반경 내 패시브를 **강화**(PoE1 Timeless는 치환). 반경 1000(Diamond 1300). 0.2.0에서 일부 모드 값 조정("... increased magnitude of damaging ailments now grants 5-10%").
- **Timeless 주얼** (Heroic Tragedy, Olroth/Expedition): "Keystones and Notable Passives within the jewel's radius will have their effects changed", 7,900 조합.
- 0.2.0: "12 Jewel Sockets have been removed from the Passive Skill Tree." (현재 총 소켓 수 미확인). 유니크 주얼 15종(game8).

### 2-7. 대조용: 에센스·오멘·카탈리스트·Runic Alloy
- 에센스: 0.3.0 "Essences now have 4 tiers: Lesser, Normal, Greater, and Perfect." Greater = 리갈+보장 접사, Perfect = 접사 1개 제거 후 보장 크래프트 접사("An item can only ever hold one Crafted Modifier at a time"). 0.2.0 "Essences can now have Vaal Orbs applied".
- 오멘: Ritual 보상 고정(0.2.0), 스택 10(0.3.0). Greater Exaltation(엑잘 2개), Sinistral/Dextral(접두/접미 지정), Catalysing Exaltation(장신구 퀄리티 소모).
- 카탈리스트: 반지·목걸이 퀄리티, 12종 태그(Flesh=생명, Reaver=공격, Sibilant=시전 등).
- Runic Alloy (0.5.0, 13종): "Alloy items are applied to an item to remove a random modifier and apply a new guaranteed modifier."

### 2-8. GGG 발언 — 왜 장비 소켓·링크를 버렸나
- Jonathan Rogers (MMORPG.com 2024-03-22): "We removed all the incidental complexity—things like the Skill Gem system are much easier to use in PoE2." / "We don't just remove things to simplify the game for the sake of simplification. We want to keep as much depth as we can." / "Anything that we're removing is because we didn't like it."
- PCGamesN (EA 인터뷰): "The socket system we've got now is both making players happy and making us happy." / "I don't think it's as complex as PoE 1 was, but we do want to make sure that there are enough options that you feel like you're getting power from everything."
- 커뮤니티: 공식 포럼 "removal of sockets/links from gear"(3872584) — 복원 반대 의견 우세("sockets as part of the skills panel is one the best things of PoE2"). "Remove the support gem limit"(3630981, 2024-12) — 찬반 대립, 결국 0.3.0에서 폐지.
- 2019 ExileCon 초기 계획(fandom 요약, ★★): 젬이 최대 6소켓을 가지고 장비는 클래스별 고정 소켓 → 2023 공개판에서 장비 젬 소켓 자체 폐지.

## 3. 소켓/슬롯 규칙
- **오그먼트 소켓 상한** (maxroll 0.4.0판): 갑옷 2, 양손무기 2, 한손무기 1, 투구/장갑/신발 1. game8: "a total of 7 sockets". 단 0.5.x 데이터에 방패/포커스/셉터 지정 오그먼트가 있어 방패·포커스도 소켓 보유(정확한 상한 미확인).
- 드롭 시 대부분 소켓 없음 → **Artificer's Orb** (Artificer's Shard 10개 = 1 Orb, 샤드는 소켓 있는 장비를 분해해 획득) 1개당 소켓 1개. **Vaal Orb**로 상한 초과 가능(타락). 유니크·타락 아이템은 예외 소켓 가능.
- **영구성 타임라인**: 0.1.0 "once socketed they cannot be replaced" → 0.1.1 "Socketables such as Runes can now be overwritten by placing another socketable item into the socket." (구 룬 파괴) → 0.4.0~ **Orb of Extraction** "Destroys an Equipment item, returning any non Socket-Bound Augments socketed in it" (드롭 레벨 1, 도입 패치 미확인) → 장비 vs 오그먼트 중 하나는 반드시 잃는다.
- 차암: 벨트 롤(1~3), 자유 탈착. 주얼: 트리 소켓, 자유 탈착. 서포트: 젬 소켓 2→5, 자유 탈착.

## 4. 트레이드오프·제약
- **부위당 1소켓 + 부위별 효과 상이**: 같은 Iron Rune이 무기에선 피해, 방어구에선 방어. 룬 1개로 두 의미 → 선택이 부위 단위로 갈린다.
- **덮어쓰기=파괴 / 추출=장비 파괴**: 장비 교체 때마다 룬 손실 or 구 장비 손실. "Socket-Bound" 룬은 회수 불가.
- **Limited to 1**: 강력한 오그먼트(소울 코어 대부분, 고유명 룬, Idol of ○○, Fox/Rabbit/Stag)는 캐릭터당 1개 → 7소켓을 같은 것으로 채우는 스택이 차단됨. 0.4.0·0.5.0 패치가 사후에 계속 추가한 제한.
- **Bonded 잠금**: 2차 라인은 Druid Shaman 노터블·Fox Idol 같은 특정 조건에서만 개방 → 빌드별 오그먼트 가치가 달라진다.
- **차암**: 슬롯 1~3 롤이 벨트 가치를 좌우, 충전=처치 연동이라 보스전에선 고갈. Golden(80/80)은 한 방 소모.
- **서포트 젬**: 젬당 소켓 확장 재화(Perfect Jeweller's Orb 드롭 레벨 65)가 병목. Spirit 예산이 지속 버프·미니언 수를 제한.
- **Aldur's Legacy**: 유니크를 파괴해 축소판 룬 — "유니크 원본 vs 룬화(다른 부위 활용)"의 저울질.

## 5. 경제
- 룬은 환전소 거래 가능한 스택형 재화(1/10). 0.2.0 드롭 2배 + 3:1 승급 → 저등급 룬이 상위 재료로 소비되는 **싱크**. 랜덤 3:1 폐지로 "쓰레기 룬 도박" 제거.
- Artificer's Orb는 소켓 장비 분해로만 생산 → 장비 분해 싱크. Orb of Extraction은 장비 싱크.
- 소울 코어·아이돌·Ancient Augment는 콘텐츠 게이트(Trial of Chaos, Azmeri, Abyss Dark Domain, Remnant) 보상 → 각 엔드게임 활동의 고유 산출물. 0.5.3~0.5.4는 Remnant 수량을 웨이스톤 등급에 연동, 보상 상향.
- 언커트 젬 환전 가능(0.3.0) → 스킬 층도 시장화.

## 6. 설계 원리 (왜 작동하는가)
- **"결핍 패치" 층을 접사 풀 밖에 둔다**: 저항·생명 같은 필수 수치를 룬이 싸게 메워 장비 접사는 빌드 가치에 집중. 룬 테이블은 접사 풀을 희석하지 않는다.
- **부위 × 룬 = 2차원 고정표**: 룬 종류 14 × 부위 유형 3 = 랜덤 없이도 조합 폭. 숫자로 읽힌다.
- **캐릭터 층(젬·주얼·차암)과 장비 층(오그먼트)의 분리**: 장비를 바꿔도 빌드(젬 소켓·주얼)는 남는다 — "incidental complexity" 제거의 실체.
- **회수 불가를 단계적으로 완화하되 손실은 남김**: 덮어쓰기(룬 손실) → 추출(장비 손실). 결정에 마찰은 유지, 후회는 감소.
- **희소 오그먼트는 1개 제한**: 강한 것은 콘텐츠 게이트 + 1개 제한으로 "찾았다"는 순간이 있고 스택 붕괴가 없다.
- **차암 = 자동 발동**: 플라스크와 달리 입력이 필요 없어 상태이상 대응을 장비 결정으로 환원.

## 7. 알려진 문제·비판 → 변경
- **영구 룬** (0.1.0) → 불만 다수, **0.1.1에서 덮어쓰기 허용** (10일 만에 수정).
- **룬 단일 등급이 엔드게임에서 무의미** → 0.2.0 3등급 + 승급, 0.5 Perfect·Masterwork.
- **서포트 젬 1개 제한**이 빌드 다양성을 막는다는 피드백(2024-12 포럼) → 0.3.0 폐지 + Lineage 서포트로 대체 차별화.
- **오그먼트 스택 파워** → 0.4.0 소울 코어·엔드게임 아이돌 Limited to 1, 0.5.0 Fox/Rabbit/Stag 1개 제한.
- **차암이 보이지 않는다** → 0.1.1 발동 이펙트·충전 표시. 차암 슬롯이 벨트 롤 의존 → 0.2.0 Ingenuity, 0.5.0 Elevore로 슬롯 공급 확대.
- **명칭 혼란**: 소켓형 "탈리스만"과 무기 "탈리스만" 충돌 → 0.4.0 소켓형을 Idol로 개명, "Socketable"→"Augment", "Rune Socket"→"Augment Socket".
- Remnant 슬롯 수: 공식 노트 "between 2 and 10" vs 위키 "two to seven" — 문서 불일치.

## 8. 본작 관점 메모 (PoE2)
**가져올 만한 것**
1. **부위당 1소켓·부위별 효과 상이 룬**: 본작 죄종 7 × (무기/방어구) = 14칸 고정표. 접사 풀을 건드리지 않고 "결핍 패치"(저항·HP)를 준다. 장비 27종 전투 능력치만 주는 원칙과도 맞다(룬도 전투 능력치만).
2. **덮어쓰기=파괴 한 줄 규칙**: 거래 없는 싱글이라 싱크보다 "재배분 마찰"이 핵심. 0.1.1 규칙(덮어쓰면 옛 룬 파괴, 장비는 보존)이 방치형 계약("자리 비워도 안전")과 통제성에 가장 맞다. Extraction 같은 2중 규칙은 불필요.
3. **3:1 승급**(랜덤 아님): 드롭 룬이 절대 죽은 재화가 되지 않는다. 본작 "비전투는 전투 파밍의 연료" — 제련소가 3:1 승급을 맡으면 시설 역할도 생긴다.
4. **차암=조건부 자동 발동**: 자동전투 게임과 가장 궁합이 좋은 층. 부상/치료 모델과 연결해 "출혈 시 자동 지혈" 같은 리포트 가시성 있는 효과로. 단 충전=처치 연동은 리포트에 "발동 n회"로 반드시 노출.
5. **Limited to 1을 처음부터 설계**: 유니크급 룬은 파티 전체 1개 — 나중에 패치로 덧대지 말 것.

**피해야 할 것**
1. **장비 소켓에 스킬 묶기**(PoE1 링크): GGG가 "incidental complexity"로 제거. 본작 스킬은 독립 트리 3탭 + 액티브 3 — 장비와 분리 유지.
2. **Bonded 같은 잠긴 2차 라인**: 조건 개방형 숨은 효과는 "숫자로 읽히는 최적화" 원칙과 충돌.
3. **소울 코어·아이돌·Ancient·Warding·Legacy처럼 같은 소켓을 쓰는 하위 종류 5개**: 명칭 개편(0.4.0)까지 부른 종류 팽창. 본작은 "룬" 한 종류 + 희귀도(일반/유니크)로 끝내야 한다.
4. **주얼(트리 소켓) 층**: 본작 스킬 트리가 이미 캐릭터 측 빌드를 담당. 3인 파티 × 트리 주얼은 UI(1280px)와 인지 부담만 늘린다.
5. **소켓 뚫기 재화(Artificer's Orb)**: 소켓 유무 롤은 장비 판정 축을 하나 더 늘린다. 본작은 "부위당 소켓 1개 고정"이 단순화 원칙에 맞다.

## 9. 출처 (PoE2)
| 출처 | 신뢰도 | 사용 항목 |
|---|---|---|
| 공식 0.2.0 패치노트 pathofexile.com/forum/view-thread/3740562 | ★★★ | 룬 3등급·3:1·드롭 2배, Azmerian Wisps, Ingenuity, Golden Charm 15%, Time-Lost, 주얼 소켓 12 제거 |
| 공식 0.3.0 패치노트 pathofexile.com/forum/view-thread/3826682 | ★★★ | 서포트 제한 폐지, Lineage 40, 에센스 4등급, 오멘 스택, Talisman of Eeshta, 언커트 거래 |
| maxroll 0.5.0 패치노트 요약 maxroll.gg/poe2/news/0-5-0-patch-notes-return-of-the-ancients | ★★★ (공식 노트 전재) | Ancient Runes 13, Runic Ward, Runeforging, Bonded, 룬 수치, Remnant 2~10, 아이돌 셉터, Fox/Stag 제한, 서포트 20+ |
| maxroll 0.4.0 패치노트 maxroll.gg/poe2/news/0-4-0-patch-notes-the-last-of-the-druids | ★★★ | 탈리스만→아이돌 개명, 오그먼트 명칭, 소울코어 1개 제한 |
| maxroll 0.1.1 패치노트 maxroll.gg/poe2/news/0-1-1-patch-notes | ★★★ | 룬 덮어쓰기, 차암 표시 |
| poe2db.tw/us/Rune, /Charms, /Belts, /Idol, /Augment, /Masterwork_Rune, /Orb_of_Extraction, /Wisdom_of_the_Maji, /Thawing_Charm, /Time-Lost_Emerald | ★★★ (데이터마이닝 DB, 0.5.x) | 룬 수치 전체, 차암 충전, 벨트, 아이돌, Bonded 개방 조건, Extraction 텍스트 |
| maxroll.gg/poe2/resources/runes-and-soul-cores (0.4.0판) | ★★★ | 소켓 상한, Artificer's Orb, Extraction, 엔드게임 룬 승급 불가 |
| maxroll.gg/poe2/resources/spirit-guide, /how-to-craft-in-path-of-exile-2, /abyss | ★★★ | Spirit, 에센스/오멘, Abyss 소켓형 |
| pathofexile2.wiki.fextralife.com — Runes, Soul Cores, Runes of Aldur, Aldur's Legacy, Charms, Patch Notes 040, Jewels, Catalysts, Support Gems, Gems, Idols | ★★ | 소울 코어 15종, Remnant/Alloy, Legacy Rune, 차암 구판 수치, 카탈리스트 |
| game8.co PoE2 — Soul Cores(487818), Gear Sockets(489096), Idols(507835), Jewels(487816), Heroic Tragedy(493116), Charm Slots(491177), DotH Items(507733) | ★★ | 소울 코어 목록, 소켓 7, 아이돌 개명, 주얼 자유 탈착, Timeless |
| poe2.stratlore.com jewels(0.5.4) | ★★ | 주얼 접사 수 |
| MMORPG.com 인터뷰(2024-03-22), PCGamesN EA 인터뷰 | ★★★ (1차 발언) | GGG 발언 |
| 공식 포럼 3872584, 3630981 | ★★ (커뮤니티) | 비판 |
| Wikipedia Path of Exile 2 | ★★ | 버전 연표 |
| outof.games Rogers 인터뷰 요약, pathofexile.fandom PoE2 (검색 요약) | ★★ | 젬 슬롯 9·서포트 2, 2019 계획 |

**배제한 자료(AI 생성·재화판매 콘텐츠팜, 인용하지 않음)**: u4gm, iggm, mmojugg, ssegold, poecurrency, aoeah, timesaver.gg, switchbladegaming, escorenews, trendsmask, mmogah, mmopixel, eloking, gamerblurb, expcarry, boostroom, thegameslayer, g4mmo, mmonster, bugfree.gg, gamemarket.gg, kami-labs, titanquisitor, keengamer, rpgstash, vanischool, glama.ai. gamerant/thegamer/dualshockers/sportskeeda는 검색 요약에만 노출, 본문 인용 안 함.

**미확인 항목 (PoE2)**
- 현재 패시브 트리 주얼 소켓 총수 (0.2.0에서 12개 제거만 확인).
- 차암 최대 충전 80→40 변경 패치 번호.
- Perfect 룬·Masterwork Rune·Orb of Extraction의 정확한 도입 패치(0.4.0 또는 0.5.0).
- 방패·포커스·셉터의 오그먼트 소켓 상한.
- 스킬 젬 서포트 최대 5 vs 위키 "up to six" 문구의 현행 여부.
- Remnant 슬롯 상한(공식 2~10 vs 위키 2~7).
- Normal 등급 Robust/Adept/Resolve 값.

---

# 게임 2: Last Epoch (1.4.x Shattered Omens)

버전 연표: 1.0 (2024-02-21) → 1.1 Harbingers of Ruin (2024-07) → **1.2 Tombs of the Erased / Season 2 (2025-04-17)** → **1.3 Beneath Ancient Skies / Season 3 (노트 2025-08-15, 출시 08-21)** → **1.4 Shattered Omens / Season 4 (노트 2026-03-20, 출시 03-26, 현행 1.4.6)** → Season 5 Rage of the Frostborn (2026-10-01 예정, 시스템 미공개).

## 1. 시스템 한 장

| 층 이름 | 붙는 곳 | 획득처 | 효과 성격 | 제거·회수 | 합성/승급 경로 |
|---|---|---|---|---|---|
| **아이돌 (Idol)** | **캐릭터 전용 아이돌 그리드** (5×5에서 중앙·모서리 4칸 제외 = 20칸, 퀘스트/던전으로 해금) | 드롭, Merchant's Guild 랭크 4, CoF | 랜덤 접사 2개(접두1+접미1), 크기별 풀 | 자유 탈착 | **크래프트 불가** / 1.2 Woven Enchanter(클래스 아이돌 인챈트) / 1.4 Idol Altar·Omen Idol |
| **아이돌 제단 (Idol Altar, 1.4)** | 그리드 위 전용 슬롯 | Omen Window 조우 | 그리드 모양 변경(13종) + Refracted 슬롯 + 아이돌 강화 접사 | 자유 | — |
| **접사 파편(Shard)·글리프·룬 = 크래프팅 소모품** | 장비 접사 자체 (Forge) | 분해(Rune of Shattering)·드롭 | 접사 추가/승급, T5 상한, **Forging Potential(FP) 예산** | 파편은 Rune of Removal로 티어만큼 회수 | 글리프로 확률 보정, 룬으로 특수 조작 |
| **Sealed 접사 / 실험적 접사** | 장비의 5번째 봉인 슬롯 | Glyph of Despair / Rune of Research (Exiled Mage 드롭) | 고정(봉인, ≤T4) | 불가 | — |
| **레전더리 포텐셜 (LP 1~4)** | 유니크 아이템 속성 | 드롭 시 롤(지역 레벨·타락·CoF 8랭크 2배) | 익잘티드 접사 1~4개 이식 → 레전더리 | 이식 후 불가 | Eternity Cache(Temporal Sanctum); 1.2 Farsight Turtle로 LP 재롤(실패 시 0) |
| **Weaver's Will (5~28)** | 유니크 속성(LP와 양립 불가) | 월드 드롭 | 처치 성장형: 접사 최대 4개(2P/2S) T7까지 | — | Rune of Weaving으로 즉시 소모 |
| **Weaver's Touch / 인챈트 아이돌 (1.2)** | 클래스 아이돌 | 무덤/묘지 끝 Woven Enchanter | 성장형 인챈트 접사 최대 2개, 각 T7까지 | 재롤 500 Memory Amber | — |
| **Weaver Tree (1.2)** | 계정/캐릭터 메타 트리 (모놀리스 개조) | Woven Echo 완료 | 최대 50점, 약 70노드, 아이템 각인(드롭 편향) | 재배치 | — |
| **타락 (1.4 Rune of Corruption)** | 장비 | 오멘 드롭 / Timeglass Fragments | 랜덤 변형, 이후 개조 불가 | 불가 | — |

## 2. 각 개조 아이템 상세

### 2-1. 아이돌
- **그리드**: maxroll(2026-03-27): "the basic Idol Grid layout - a 5x5 window, with the center and corner squares blocked" → 20칸. "There are a total of 20 slots that can be unlocked through the Campaign or by completing Dungeons for the first time." icy-veins(2025-03-25): 메인 퀘스트 3개(Ch2 The Void Assault, Ch4 The Admiral's Dreadnought, Ch7 The Lance of Heorot) + 사이드 퀘스트(챕터 3~9 "An Ancient Hunt", "The Corrupted Lake", "The Sapphire Tablet", "Liberating the Namads" 등). 그리드 모양은 클래스 공통(클래스 제한은 아이돌 쪽에 걸림).
- **크기·종류** (vulkk 2024-02 + maxroll):

| 이름 | 크기 | 최소 레벨 | 계열명 | 클래스 제한 |
|---|---|---|---|---|
| Small | 1×1 | 11+ | Lagonian | 공용 |
| Humble | 2×1 | 11+ | Eterran | 공용 |
| Stout | 1×2 | 11+ | Lagonian | 공용 |
| Adorned | 2×2 | 20+ | Immortal | 클래스 |
| Grand | 3×1 | 25+ | Majasan | 클래스 |
| Large | 1×3 | 25+ | Rahyeh | 클래스 |
| Ornate | 4×1 | 30+ | Heorot | 클래스 |
| Huge | 1×4 | 30+ | Arcane | 클래스 |
| Weaver (1.2) | 공용 크기 | — | Weaver | 비클래스 |

  maxroll: "Idols that are 1x1, 2x1, and 1x2 are universal and can be used by any class. The other sizes are class-specific (except for Unique Idols)". 계열명↔클래스 대응은 미확인.
- **접사 구조**: "one Prefix, one Suffix, and no Implicits" (maxroll). 일반 아이돌 접사는 T1 고정(thegamer 인챈트 기사: "the usual Tier 1 affixes that Idols are locked to"). 크기별 전용 풀 수(tunklab, 검색 요약 ★★): Adorned 57, Large 39, Huge 37, Grand 35, Ornate 34. 작은 것은 "Health, Armor, Resistances, or generic offensive stats", 큰 클래스 아이돌은 "build-enabling Affixes"(vulkk).
- **크래프트 불가**: icy-veins "Cannot craft on Unique, Set, or Idol items". → 아이돌은 순수 드롭 파밍 대상.
- **유니크 아이돌**: 존재(예: "Throne of Ambition"), "more than two affixes, as well as a specific modifier"(icy-veins), 크기 제한 예외, LP 불가(maxroll). 세트 아이돌: 본 조사에서 확인 실패(미확인 목록).
- **1.2 인챈트 아이돌**: "Class specific Idols can now be Enchanted" / "You can have a maximum of two Enchanted affixes on an Idol and each affix can be a maximum of seven tiers." / 1.2 노트: Woven Enchanter가 "one Enchanted Affix" 부여 + "between 5 and 14" (인챈트 티어 + Weaver's Touch 합) / 재롤 "500 Memory Amber"(thegamer).
- **1.3 밸런스**: Weaver 아이돌 관통 접사 "1-2% penetration on 1x1 idols, down from 1-3%, and 3-4% ... on larger idols, down from 4-6%", 생명 "14-18 health instead of 15-20", Spined/Resounding/Reverberating에 "trigger limits (up to 3-5 times per second)".
- **1.4 Idol Altar / Omen Idol**: "They have affixes which affect Idols you have equipped and change the layout of the Idol Grid itself." / "thirteen new possible Idol Grid layouts" / Refracted 슬롯(보라) "grant unique bonuses to Idols in those slots" / Omen Idol "1x3 or 3x1", "can gain the affixes otherwise reserved for larger class Idols", "By default, you can only have a single Omen Idol equipped at a time, but some Idol Altars will grant higher limits." 둘 다 Omen Window 드롭.
- **D2 차암과의 차이**: D2 차암은 일반 인벤토리를 점유해 파밍 공간과 경쟁했으나, LE는 **전용 그리드로 격리**하고 격자 퍼즐(크기 조합)만 남겼다. 또 큰 크기를 클래스 전용으로 묶어 "클래스 정체성 = 아이돌 풀"로 만들었다.

### 2-2. 크래프팅 — 파편/글리프/룬/FP
- **FP(Forging Potential)**: 모든 크래프트가 범위 내 랜덤 FP를 소모, 0이 되면 개조 불가. 예 "a range from 1 to 18 Forging Potential" (T3→T4 미니언 피해 반지, maxroll 2026-03-27). "If the craft ends in either a Critical Success or a Glyph of Hope is procced, it will cost 0 Forging Potential." 초기 FP 범위(icy-veins 2025-04-11 ★★): 일반~레어 20–40, 익잘티드 40+.
- **슬롯**: 접두 2 + 접미 2, 봉인 접사 시 5번째. 크래프트 상한 **T5**, T6~7은 드롭 전용(익잘티드), **T8 = 1.3 Rune of Evolution** "Using a Rune of Evolution on an item with at least one T7 Affix will turn one random T7 affix into a T8 affix and seal it" (Primordial Exalted, "50% to 100% additional effect over T7").
- **파편**: Rune of Shattering "Destroys an item and in the process turns some of the affixes from that item into shards"; Rune of Removal은 제거한 접사의 "number of tiers of that affix to you as shards" 반환.
- **글리프**: Hope "25% chance for the craft to consume no Forging Potential" / Chaos "changes the affix to something different. The affix tier will still be upgraded" / Order "maintains the roll range" / Despair "chance to seal an affix of your choosing instead of upgrading it" (봉인 → 5번째 슬롯) / Insight: 실험적 접두 부여 / Envy: 1.3 개편 "reforges the subtype of an item into another subtype with the same item type and class restrictions".
- **룬** (icy-veins/maxroll): Shattering, Removal(랜덤 접사 제거), Refinement(값 재롤), Discovery(빈 슬롯에 T1 접사), Shaping(암시 재롤), **Ascendance "Converts a normal item into a random Unique/Set item"**, **Creation "Duplicates an item, but sets FP to 0 on both copies"**, Research(실험적 접사 봉인, ≤T4, 유니크/세트 불가), 1.2 **Weaving** "Converts a random amount of the remaining Weaver's Will or Weaver's Touch ... into additional affixes or affix tiers", **Havoc** "Shuffles the tiers of affixes on an Exalted item", **Redemption** "Randomly changes the Exalted affixes (T6 and T7) ... into different affixes", 1.3 Evolution, 1.4 **Corruption** "After corrupting an item, it will no longer be modifiable in any way" (결과: 티어/값 변경, 접사 추가·삭제, 희귀도 변경, 서브타입 변경, 장착 불가화).
- **"룬"이라는 이름의 정체**: D2 룬(소켓에 박는 고정 효과 아이템)과 전혀 다르다. LE 룬은 **1회성 크래프팅 조작 소모품**이며 장비에 남지 않는다. 장비에 "박히는" 것은 아이돌뿐이고, 그것도 장비가 아니라 캐릭터 그리드에 박힌다.

### 2-3. 레전더리 포텐셜
- LP 1~4 (LP 없는 유니크는 표기 없음). "The Legendary Potential of the Unique determines how many affixes will be added to the Legendary from the Exalted item and this number ranges from 1-4." 드롭 확률 요인: 유니크 기본 레벨, 지역 레벨, 타락, "Circle of Fortune faction rank 8 ... doubles the Legendary Potential chance".
- **Eternity Cache** (Temporal Sanctum, Julra 처치 후): 같은 슬롯 유형의 유니크(LP≥1) + 익잘티드(봉인되지 않은 접사 ≥1, 최적은 4개). Divine Era에 넣고 Ruined Era로 전환 → 익잘티드 소멸, LP 개수만큼 접사 이식. 1~3 LP는 **랜덤 선택**, 4 LP는 전부. 던전 티어별 아이템 레벨 상한: T1 ≤50, T2 ≤65, T3 ≤75, T4 무제한. "you can only craft one legendary per dungeon run."
- 1.2 Farsight Turtle(Woven Echo): LP 재롤, 실패 시 "the Unique loses all Legendary Potential". 1.3: "Primordial Uniques of all kinds can still gain Legendary Potential and be used in the Eternity Cache."
- **Weaver's Will**: "5 to 28", 처치/경험치로 레벨업 → 접사 추가 또는 티어 상승(상승 가중), 최대 4접사(2P/2S) T7, "You will never have both, Legendary Potential and Weaver's Will, on the same item." 크래프트 불가(Rune of Weaving 제외). 1.2: 저레벨 WW 최소치 스케일 추가.

### 2-4. Sealed / 실험적 접사
- 실험적 접사: "gloves, boots, and belts"에만, 아이템당 1개, Exiled Mage(Rune Prison) 드롭. 크래프트 T5까지, 상위는 드롭. Rune of Research로 봉인 슬롯 이동(봉인 접사 ≤T4), Glyph of Insight로 추가.
- 봉인 접사는 레전더리 이식 대상에서 제외("Sealed affixes don't transfer").

### 2-5. 1.2 Weaver Tree / Woven Echoes, 1.3, 1.4 요약
- 1.2: Woven Echo 36종, Weaver Tree 약 70노드·최대 50점, 아이템 각인 노드(Commoner's Riches "small chance to drop a pile of similar items"), Set Reforging(세트→Set Shard→다른 아이템에 세트 접사), 속성 교체(Oerden's Watch), 실험적 접사 크래프트(Thaumaturgy Device). 소켓/차암 류 추가 **없음**.
- 1.3: Rune of Evolution(T8), Temporal Keystone, Glyph of Envy 개편, Primordial 유니크 25종("You can only have one Primordial Item of any kind equipped at a time"). 소켓/차암 류 **없음**.
- 1.4: Idol Altar, Omen Idol, Rune of Corruption, 타락 전용 서브타입 12종(예: Singularity Belt "Only has one potion slot by default, but restores an Evade charge when you use a potion"), 목걸이 타락 속성 5종(Rampancy/Brutality/Guile/Madness/Apathy). 소켓/차암 류 **없음**. → LE는 1.0~1.4 내내 "장비 소켓" 개념을 도입하지 않았다.

## 3. 소켓/슬롯 규칙
- 장비에는 소켓이 없다. 2차 층은 (a) 캐릭터 아이돌 그리드 20칸(크기 테트리스, 클래스 제한, Omen Idol 1개 제한, Altar로 모양 변경) (b) 장비 접사 슬롯 4+봉인 1 (c) 유니크의 LP/WW 속성. 아이돌·제단은 자유 탈착, 접사·봉인·LP·타락은 되돌릴 수 없다.

## 4. 트레이드오프·제약
- **FP = 아이템별 개조 예산**: 몇 번 만질지 결정, Rune of Creation은 복제 대신 FP 0. 크래프트 상한 T5라 최종템은 결국 "드롭 T6/7 + FP로 나머지 채우기".
- **아이돌 그리드 테트리스**: 4×1 하나 = 1×1 네 개의 기회비용, 클래스 대형 아이돌만 빌드 정의 접사. 1.4 Omen Idol은 작은 크기에 큰 풀을 주되 1개 제한.
- **LP 도박**: 1~3 LP는 어떤 접사가 옮겨질지 랜덤 → 익잘티드는 4접사 전부 원하는 것으로 준비해야 손실 없음. 실패 시 익잘티드 소멸.
- **봉인·타락·레전더리는 비가역**.
- **인챈트 아이돌 재롤 비용 500 Memory Amber**, Weaver's Touch는 처치로만 소모.

## 5. 경제
- **크래프팅 재료는 거래 불가**: EHG_Mike2 (2023-11-15) "No plans to either." / 공식 FAQ "Can I trade crafting materials (e.g. shards, glyphs) and/or keys? No." → 룬·글리프·파편은 순수 자가 파밍 싱크, 상점 판매만 가능.
- **아이돌은 거래 가능**: Merchant's Guild 랭크 4 "all Idols" (maxroll 2026-03-25). LP 유니크는 랭크 7~9, 레전더리는 10~12.
- 룬은 "아이템 싱크"로 작동: Shattering(아이템→파편), Ascendance(일반템→유니크 도박), Creation(복제하되 FP 0), Corruption(비가역 도박). 아이돌은 "그리드 20칸을 채우는 드롭 파밍 싱크"이며 크래프트가 없어 시장에서 완제품으로만 돈다.
- 알려진 경제 결함: 잉여 파편·글리프·룬이 "dead weight"(공식 포럼 2026-05, 개발 답변 없음).

## 6. 설계 원리
- **개조 층을 캐릭터 측으로 옮겨 장비와 분리**: 아이돌은 장비를 갈아도 남는다. 장비 교체가 빌드 붕괴로 이어지지 않는다.
- **아이돌은 크래프트 불가 = 접사 2개 고정 T1**: 기대치가 낮고 읽기 쉬워 "그리드 채우기"가 초반부터 후반까지 계속 의미 있다. 대신 대형 클래스 아이돌 풀(34~57)에 빌드 정의 접사를 몰아 롱테일 체이스를 만든다.
- **FP로 "이 아이템에 투자할까"를 결정으로 만든다**: 개발자 발언(2023-09-29): "if you know exactly what's going to happen then it kind of takes the suspense factor out" / "there's always going to be RNG loot" — 결정론(파편·Creation)과 도박(FP·Ascendance)을 의도적으로 섞음.
- **유니크 + 랜덤 접사(LP)**: 유니크가 "고정 효과라 최종템이 못 되는" 문제를 해결. 익잘티드 파밍과 유니크 파밍이 한 목표로 합류.
- **성장형(WW/Touch)은 "플레이 자체가 크래프트"**: 처치가 개조를 진행 → 파밍 루프와 개조 루프의 일치.
- **1.4 Altar**: 그리드 모양이라는 메타 슬롯을 하나 더 얹어 기존 아이돌 재고에 새 가치를 부여(새 아이템 풀을 늘리지 않고 배치 축만 추가).

## 7. 알려진 문제·비판 → 변경
- **FP 존재 이유 논쟁**(2022 devtrackers, 접근 차단·검색 요약만): 개발자는 "starting affix quality matters more than starting FP"로 방어. 이후 1.2 Havoc/Redemption, 1.3 Evolution으로 익잘티드 단계 조작 수단을 추가.
- **아이돌 접사 T1 고정의 단조로움** → 1.2 인챈트(최대 2개, T7) + Weaver 아이돌, 1.4 Omen Idol·Altar로 아이돌 층에 성장·배치 축 추가. 1.3에서 Weaver 아이돌 수치 일괄 하향(과도한 관통·트리거).
- **LP 1~3 랜덤 이식의 좌절** → 1.2 Farsight Turtle(LP 재롤), 세트 아이템 대안(Set Reforging).
- **잉여 재료 싱크 부재** — 미해결.
- **저레벨 WW 무가치** → 1.2 최소치 스케일.

## 8. 본작 관점 메모 (LE)
**가져올 만한 것**
1. **LP형 "유니크 + 이식 접사"**: 본작 희귀도 계단(매직→레어→크래프트→유니크)에서 유니크가 계단 끝이면서 최종템이 되도록, 유니크에 낙인 크래프트 접사 1~2개를 얹는 규칙. 새 희귀도를 추가하지 않고 기존 축(낙인·죄종)으로 표현 가능하다.
2. **개조 예산(FP)의 결정론 버전**: 본작 강화=골드 증폭에 "아이템당 강화 횟수 상한"을 붙이면 "어느 장비에 골드를 쓸까"가 결정이 된다. 단 LE처럼 랜덤 소모가 아니라 고정 횟수로(통제성).
3. **크래프트 불가 + 접사 2개 고정 층**: 2차 층을 만든다면 아이돌처럼 "개조 못 하고 드롭으로만, 접사 수 고정"이 접사 풀 희석과 인지 부담을 동시에 막는다.
4. **재료 거래 불가 = 싱글 구조와 동일**: LE는 거래 게임이면서도 크래프팅 재료를 비거래로 못박아 파밍을 보존했다. 본작(거래 없음)에서는 룬 3:1 같은 상향 변환 경로가 없으면 LE의 "dead weight" 문제가 그대로 온다.
5. **아이돌 세트/클래스 전용 풀**: "큰 칸 = 직업 전용"은 본작 직업 7종 정체성을 장비 밖에서 표현하는 방법. 단 죄종 축을 관통해야 하므로 "직업"이 아니라 "죄종 전용"으로.

**피해야 할 것**
1. **8크기 × 클래스 계열 × 크기별 전용 풀(34~57개)**: 완전한 제2 접사 시스템이다. 본작 7죄종 × 8부위 매트릭스 위에 또 하나의 매트릭스를 얹는 것 — 접사 풀 희석 금지·단순화 원칙과 정면 충돌. 3인 파티면 그리드 3개.
2. **격자 테트리스 UI**: 1280px 폭·세로 700px 예산에서 캐릭터 3명 그리드는 화면 예산을 잡아먹는다.
3. **랜덤 소모 예산(FP)·랜덤 이식(LP 1~3)**: 방치형 계약과 통제성에 반한다. 도입하더라도 횟수 고정·이식 접사 지정으로.
4. **성장형 아이템(WW/Touch)의 새 게이지**: 아이템마다 남은 횟수 게이지가 생긴다. 본작 원칙(새 게이지 추가 금지)상 영웅 XP 축으로만 표현 가능할 때 한정.
5. **"룬"이라는 이름으로 소모품을 부르는 것**: D2·PoE2와 의미가 달라 참고 플레이어층이 혼동. 본작이 룬을 쓴다면 "박히는 것"에만.
6. **비가역 도박(Corruption·Ascendance)**: 거래·경제가 없는 싱글에서는 싱크 기능이 약하고 후회만 남는다.

## 9. 출처 (LE)
| 출처 | 신뢰도 | 사용 항목 |
|---|---|---|
| 공식 포럼 1.3 패치노트 forum.lastepoch.com/t/last-epoch-beneath-ancient-skies-patch-notes/78635 | ★★★ | 아이돌 수치, Rune of Evolution, Primordial, Glyph of Envy |
| 공식 포럼 1.4 패치노트 forum.lastepoch.com/t/last-epoch-shattered-omens-patch-notes/80571 | ★★★ | Idol Altar, Omen Idol, Rune of Corruption, 타락 서브타입 |
| maxroll 1.2 패치노트 maxroll.gg/last-epoch/news/last-epoch-season-2-patch-notes | ★★★ (공식 전재) | Weaver Tree 50점/70노드, Woven Echo 36, 신규 룬 3종, 인챈트 5~14, Set Reforging, LP 재롤 |
| maxroll 1.4 패치노트 maxroll.gg/last-epoch/news/last-epoch-season-4-patch-notes | ★★★ | 그리드 레이아웃 13, Refracted, 세트 15종 |
| maxroll Idols Guide (2026-03-27), Legendary Crafting Guide (2026-04-02), Crafting Basics (2026-03-27), Woven Faction Overview (2026-04-02), Weaver's Will Uniques (2026-04-02), Merchant's Guild (2026-03-25), Season 5 티저 | ★★★ | 그리드 5×5, 크기·계열, LP/Cache, FP 예시, 인챈트 규칙, 거래 랭크 |
| icy-veins Unlocking Idols (2025-03-25), Crafting Guide (2025-04-11), Temporal Sanctum Guide, Weaver's Will | ★★ | 슬롯 해금 퀘스트, FP 범위, 룬 목록, 던전 티어 상한, WW 5~28 |
| vulkk Idols Guide (2024-02-26) | ★★ | 크기·최소 레벨 |
| lastepoch.tunklab.com (1.4.6) | ★★ | 크기별 접사 수(검색 요약), 도구 목록 |
| 공식 포럼: 개발 스트림 전사(2023-09-29), 재료 거래 스레드(61445, EHG_Mike2 2023-11-15), 잉여 재료 스레드(81597, 2026-05) | ★★★ (1차 발언) / ★★ | 설계 철학, 거래 불가, 경제 결함 |
| thegamer 실험적 아이템·아이돌 인챈트 기사 | ★★ | 실험적 접사 슬롯, 500 Memory Amber |
| 공식 1.1 패치노트, lastepoch.fandom, lastepochtools.com, devtrackers | 접근 실패 | — |

**배제한 자료**: skycoach, dving, ezg, overgear, u7buy, playerauctions, gameleap, pvpbank, upscout, igv, mmojugg, odealo, videogamer, gfinity, aggronaut(개인 블로그, 미인용), gamerant/thegamer(인챈트·실험적 2건만 ★★로 제한 인용).

**미확인 항목 (LE)**
- 계열명(Lagonian/Eterran/Rahyeh/Majasan/Arcane/Heorot/Immortal) ↔ 클래스 대응표.
- 세트 아이돌의 존재 여부 및 유니크 아이돌 전체 목록(예시 "Throne of Ambition"만 확인).
- FP 초기 범위의 정확한 수치(희귀도·아이템 레벨별)와 티어별 소모 범위표(1~18은 단일 예시).
- Weaver's Touch 초기 수치 범위, 인챈트 가능 아이돌 크기 제한.
- Glyph of Despair 봉인 확률 공식(요약: 저티어·빈 슬롯 적을수록·익잘티드일수록 높음).
- 아이돌 슬롯 해금의 던전별 개수 배분(총 20 = 메인 3 + 사이드 10 + 던전 7 추정, 미검증).
- 1.1 Harbingers of Ruin의 크래프트 변경 세부.
- Season 5 (1.5) 신규 시스템 — 미공개.

---

# 종합 — "본작에 2차 층이 필요한가"

두 게임의 2차 층은 세 가지 일을 한다: **(a) 결핍 패치**(저항·생명을 접사 풀 밖에서 싸게 메움 — PoE2 룬), **(b) 장비와 분리된 빌드 정체성 보존**(PoE2 젬·주얼, LE 아이돌 — 장비를 갈아도 남는다), **(c) 싱크·체이스**(PoE2 소울 코어/Limited 1, LE LP·아이돌 대형 풀).

본작 대입: (b)는 스킬 트리 3탭이 이미 담당하므로 아이돌·주얼형 층은 중복이다. (c)는 거래가 없어 싱크 가치가 낮고 체이스는 유니크·낙인이 맡는다. 남는 필요는 **(a)** 뿐이다 — 챕터 죄종 드롭 편향 때문에 특정 죄종 저항/HP가 빌 때 장비 접사만으로는 메우기 어렵고, 그 구멍을 접사 풀 확장으로 막으면 희석이 된다.

따라서 권장은 **한 겹만**: "룬 = 부위당 소켓 1개 고정, 7죄종 × (무기/방어구) 고정 효과표, 덮어쓰면 옛 룬 파괴, 3:1 승급(제련소)". 추가로 검토 가치가 있는 것은 보류 중인 **세트포인트를 접사가 아니라 룬이 들게** 하는 안이다 — "접사 죄종 = 세트포인트"가 보류된 이유(접사 선택과 세트가 서로를 강제)가 사라지고, 세트 수집이 룬 배분이라는 별도 결정으로 분리된다. 차암(조건부 자동 발동)은 부상/치료 모델이 확정된 뒤 리포트 가시성을 전제로 후속 검토. 아이돌 그리드·주얼·소켓 뚫기 재화·성장형 아이템은 도입하지 않는 쪽을 권한다.

---
