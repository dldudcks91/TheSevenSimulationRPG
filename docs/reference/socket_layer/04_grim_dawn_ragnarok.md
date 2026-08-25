# 장비 2차 개조 층 전수 조사 — Grim Dawn(+Titan Quest 계보) / Ragnarok Online

> 상위: [socket_layer_reference.md](../socket_layer_reference.md) · 상태: **총조사 완료** (2026-08-25)
> 조사 범위: Grim Dawn(+Titan Quest 계보) 컴포넌트·오그먼트·성좌·유물 / Ragnarok Online 카드·슬롯·정련·인챈트·쉐도우·코스튬
> ⚠ **이 문서의 수치는 전부 참고작의 수치다.** 본작 SSOT가 아니며 `src/data/*.csv`로 옮기지 말 것

---

**조사 범위·방법**: 웹 검색 29회, 페이지 원문 fetch 약 70회(WebFetch 20 + curl/archive.org 50여 회). 1차 자료 우선 — Crate 공식 가이드·패치노트·포럼(Zantai 발언), grimdawn.fandom(archive.org 사본), iRO Wiki, 그라비티 공식 확률공시(probability.gnjoy.com)·공식 가이드·업데이트 공지, RateMyServer(eAthena 소스 기반), WarpPortal 공식 포럼.
**배제한 자료**: shapes.inc(AI 생성 팬덤 요약), mneurix.quest(AI 생성 빌드 가이드), ragnarok-the-new-world.wiki(다른 게임 + AI 문체), Ragnarok Landverse gitbook(P2E 포크 서버), allthings.how / gamerant / sportskeeda / gamer.org(SEO 재작성 기사), rAthena custom `card_remover.txt`·ExperienceRO·Revival-RO 위키(사설 서버 커스텀 규칙), scribd 업로드 문서. 이들은 수치 근거로 쓰지 않았다.

---

## 게임 1 — Grim Dawn (Crate Entertainment, 2016~ / 확장 AoM 2017, FG 2019, FoA 2025)

### 1. 시스템 한 장

| 층 이름 | 붙는 곳 | 획득처 | 효과 성격 | 제거·회수 | 합성/승급 경로 |
|---|---|---|---|---|---|
| **컴포넌트 (Component)** | 장비 소켓 — 유물(Relic)을 제외한 **모든 장비 슬롯**(무기·방패·오프핸드·투구·어깨·가슴·장갑·다리·신발·벨트·반지·목걸이·메달). 아이템당 1개 | 몬스터 드롭(몬스터별 편향), 상인, 현상금(Bounty), 퀘스트, 분해(Dismantle), 대장장이 제작(청사진) | **고정** — 같은 이름이면 같은 스탯. 무기 컴포넌트는 **부여 스킬** 포함. 등급 2단계(Common/Rare) | Inventor의 Salvage: **아이템 or 컴포넌트 중 하나만 살림** (선택한 쪽 보존, 반대쪽 파괴) | 초기: 부분(Partial) 조각 수집 → 완성. Build 29(2015)에서 완성 보너스 삭제, v1.1.6.0(2020)에서 부분 조각 자체 삭제 → 현재는 **완성형만 드롭·1000개 스택** |
| **오그먼트 (Augment)** | 장비의 **별도 층** — 컴포넌트와 **동시 착용**. 반지·목걸이 / 한손무기·방패·오프핸드(Potent = 양손무기 전용) / 방어구 7부위(투구·어깨·가슴·벨트·장갑·다리·신발) / 메달(FG의 Rune Augment). 아이템당 1개 | **팩션 평판 상점 전용**(Act 3 퀘스트 보상 1종 제외). 방어구용은 대개 Revered 등급 필요. Rune Augment는 청사진 드롭 → 제작 | **고정** (팩션별 고정 스탯 표) | 새 오그먼트를 바르면 덮어씀. Inventor에서 아이템 파괴 없이 제거 가능하지만 **오그먼트는 회수 불가**(재구매) | 없음 — 재구매 소모품 성격 |
| **성좌 (Devotion)** | **캐릭터** — 장비가 아니라 캐릭터 시트의 별자리 맵 | 사당(Shrine) 복원 1개당 1포인트. 총 50(기본 3난이도 합산) / 55(AoM). Crucible에서 Tribute로 구매도 가능 | **성장** — 별마다 패시브, 일부 별은 Celestial Power(프록 스킬). 프록 스킬은 사용할수록 **경험치로 레벨업**(상한 T1 20 / T2 15 / T3 10, AoM +5) | Spirit Guide에서 Iron + Aether Crystal 비용으로 개별 환불. 다른 성좌가 의존하는 친화력을 주는 별은 환불 불가. Tonic of Clarity(Nemesis 드롭)로 전체 초기화 | 친화력(Affinity) 5종 누적 → 상위 성좌 해금 |
| **유물 (Relic)** | 전용 **장비 슬롯 1개**(총 14슬롯 중 하나) | Act 2 퀘스트 1종 제외 **전부 대장장이 제작** — 청사진 드롭 | **고정 + 랜덤 1줄** (제작 시 랜덤 보너스 1개) + 부여 스킬 | 일반 장비처럼 교체 | Empowered(Lv18~) → Transcendent(Empowered 재료) → Mythical(Transcendent 여러 개 + 희귀 재료, 청사진은 보스/Ultimate 사당) |
| **대장장이 제작(Blacksmith)** | 장비 자체를 생성 | 청사진(계정 공유, 소모 안 됨) + 재료 + Iron | 대장장이 고유 보너스 1줄(Angrim: 관통저항 3~7% / 방어력 3~7% / 물리 3~7%, Duncan: 에너지재생 5~11% / 원소저항 3~5% / 원소 3~7%) + 일반 접사 롤(도박형 Enchanted / 고정 베이스 Rare) | — | 컴포넌트·유물·소모품도 여기서 제작 |
| **Inventor 부가 서비스** | — | Act 1 구출 NPC | Salvage(컴포넌트 분리), Dismantle(다이너마이트로 장비 → 스크랩+컴포넌트), Transmute(FG: 세트 한 조각 → 같은 세트 랜덤 다른 조각, Polished Emerald 1 + Aether Crystal 3 + Eldritch Essence 1 + 120,000 Iron) | — | — |

출처: grimdawn.com 공식 가이드(Components/Relics/Crafting/Devotion/Factions/Forgotten Gods), grimdawn.fandom Components·Augment·Devotion·Inventor·Relics·Belts(archive.org 사본).

### 2. 각 개조 아이템 상세

#### 2-1. 컴포넌트 (Component)

**연혁 (Titan Quest → Grim Dawn)**
- 초기(얼리액세스 ~ Build 28): TQ 유물처럼 **부분(Partial) 조각을 모아 완성**하고, 완성 순간 **랜덤 완성 보너스**가 붙었다. 완성 보너스가 다르면 스택이 안 되어 같은 컴포넌트 변종이 인벤토리를 잠식했다.
- 2015-03-17: 개발자 Zantai가 "완성 보너스 유지 vs 폐지" **공식 포럼 투표**를 열었다. ("We considered many options and ultimately settled on what our limited resources would allow.")
- Build 29 (2015년 말): **완성 보너스 삭제**. 공식 패치노트 인용: "After extensive deliberation and observation of the Community, we have decided that the best course of action for the longterm health and balance of the game is to remove Completion Bonuses from Components. … Components now stack up to 1000, freeing up storage space previously taken up by countless variations of the same Components; Crafting no longer requires you to place items in the UI." 커뮤니티 반응은 "i'll take stacks over a completion bonus any day" / "I thought I'd miss it until I saw my nice roomy inventory" 쪽이 다수, "It was really rewarding when you got that completion bonus that fit perfect with the build" 같은 아쉬움도 있음.
- v1.1.6.0 (2020-02-27): **"All partial Components have been removed from the game. Existing partial Components have turned into completed Components. No changes to drop rates have occurred alongside this change."** 컴포넌트·제작 재료 자동 줍기 옵션 동시 도입. 포럼 반응: "Hallelujah! It's been a long slow march from the Titan Quest system of old, first giving up the 'completion bonuses' and now giving up partial components entirely." / "There was little point to them being partials if they didn't have completion bonuses anymore." / 반대 소수: "I used to enjoy farming for partials and appreciate getting the final piece."

**현재 규칙**
- 아이템당 **완성 컴포넌트 1개**. 등급 Common / Rare 2단계.
- 컴포넌트마다 **착용 가능 부위가 고정** (예시, grimdawn.fandom Components 표):
  - Aether Soul (Lv24, 목걸이·메달): +10% Aether Dmg, +30 DA, **16% Aether Res**, 에테리얼 피해 -6%
  - Antivenom Salve (Lv15, 모든 방어구·벨트 포함): +10 HP/s, +24 Armor, **20% Poison&Acid Res**
  - Ballistic Plating (Lv27, 가슴): +22 DA, 10% 투사체 회피, +18 Armor
  - Battered Shell (Lv1, 방패): +15 Physique, +10% Block, 부여 스킬 Shield Slam
  - Blessed Steel (Lv24, 모든 무기·방패·오프핸드): 5 원소 피해, +18% 원소, 물리→원소 10% 전환, +18 OA, 부여 스킬 Sacred Strike
  - Chilled Steel (Lv5, 모든 무기·방패·오프핸드): 3 냉기, +12% 냉기, 물리→냉기 10%, 부여 스킬 Ice Spike(18 에너지, 22% 무기피해, 63-92 냉기, 2초 20% 둔화)
  - Sanctified Bone (Lv24, 가슴·투구): 18% Vitality Res, 12% Chaos Res, 언데드/크토닉 피해 +12%
  - Ancient Armor Plate (Rare, Lv15, 가슴·다리): +18 Physique, +35 Armor, 방어력 +8%, 흡수 +8%
  - Symbol of Solael (Rare, 무기류): 2-12 Chaos, +35% Chaos, 물리→카오스 10%, 부여 스킬 Solael's Flame
- **무기용 컴포넌트는 예외 없이 부여 스킬(Granted Skill)을 준다** — 공식 가이드: "Components that go into weapons have a special distinction in that they all grant a unique active skill when completed." 이 부여 스킬에 성좌 프록을 바인드할 수도 있다.
- 드롭 편향: "Many monsters have a higher chance of dropping specific Components, so your hunt can be focused."
- 제작: 대장장이 기본 레시피 + 팩션 상인이 파는 청사진. Prismatic Diamond는 Build 29에서 "이제 부분이 아니라 완성형으로 제작"으로 바뀜(재료 순증가이나 실질 감소).
- **제거(Inventor Salvage)**: "The player can then choose to keep either the item or the added component. If the item is recovered, the component will be lost, and vice versa." 아이템을 살리면 오그먼트도 같이 파괴된다.
- 분해(Dismantle): 매직 이상 장비 + 다이너마이트 → 스크랩 + 컴포넌트. "The more powerful the item, the more powerful the components it can generate."

**저항 보충 역할의 실제 수치** (Steam 가이드 "Resistances by Components and Augments", v1.0.0.9 기준)
- 방어구 20%급: Molten Skin(화염), Dense Fur(냉기), Rigid Shell(번개), Antivenom Salve(독). Silk Swatch 18%(관통·출혈, 어깨·가슴·다리). Leathery Hide 25% 기절시간 감소(투구).
- 무기류 오라형 20%: Purified Salt(Aether), Imbued Silver(Chaos), Haunted Steel 20% 출혈(임시).
- 장신구·메달 16%: Aether Soul, Black Tallow. Frozen Heart 10% 냉기(반지). Prismatic Diamond 15% Vitality(투구).
- 방패 임시형 24~30%: Mark of the Myrmidon 30% 관통, Radiant Gems 30% 화염/번개.
- 캐릭터 저항 소프트캡 80%, 일부 아이템으로 하드캡 95%까지.

#### 2-2. 오그먼트 (Augment)
- 정의(공식): "Augments come in the form of powders, meticulously crafted enchantments, tinctures and poisons used by the various factions of Cairn." 제조법은 팩션 비밀이라 **평판으로만** 얻는다.
- 4계열: (1) 반지·목걸이용 (2) 한손무기·방패·오프핸드용 — **Potent** 버전은 양손무기 전용으로 2배 정도 강함 (3) 방어구 7부위용 (4) **Rune Augment**(FG, 메달 전용) — Leap/Teleport 등 이동 스킬을 모든 마스터리에 개방. Rune만 **청사진 드롭 → 제작** 가능("The most powerful Rune blueprints are found only in the Shattered Realm").
- 수치 예 (grimdawn.fandom Augment 표): Aether Dust(Black Legion, Lv40): 8 Aether, +25% Aether / Potent: 18 Aether, +60%. Blacksteel Powder: +25% 물리, +25% 화염, +18 OA / Potent: +60%/+60%/+40 OA. Beast Tamer's Powder(Homestead): 펫 +12% 피해, +4% DA. 저항 오그먼트는 대개 15%(예: Kymon's Blessing 15% 화염 방어구, Chillheart Powder 15% 냉기 장신구, Cairn's Hope 18% 출혈 장신구, Potent Outcast's Bastion 15% Aether+Chaos 양손무기).
- 평판 단계: Respected(현상금판) → Honored(Writ 구매, 캐릭터 한정) → Revered(Mandate, 계정 공유; **방어구 오그먼트 대부분 Revered**). 적대 팩션은 Nemesis 보스 스폰.
- 시각: 무기 오그먼트는 무기에 글로우 추가(이미 이펙트가 있는 Epic 무기는 제외).
- 규칙: 아이템당 1개, 새로 바르면 덮어씀. "Salvaging or dismantling an augmented item does not return the augment, but it can be purchased again from faction vendors." Inventor에서 아이템을 지키며 오그먼트만 제거 가능(오그먼트는 소멸).

#### 2-3. 성좌 (Devotion / Constellation)
- 포인트: 사당 1개 = 1포인트. Ruined Shrine은 희귀 재료·컴포넌트를 바쳐 복원, Corrupted Shrine은 스폰 몬스터 처치. 총 50(기본) / 55(AoM). Crucible은 Tribute로 구매(구매 누적 시 가격 상승). namu 기준 3난이도 합산 사당 150개 이상(중복분 포함).
- 시작: 첫 포인트는 **Crossroads**(친화력 5종 각 +1 노드)에만 찍을 수 있고, 여기서 얻은 친화력이 T1 성좌를 연다.
- 친화력 5종: Ascendant(보라) / Chaos(빨강) / Eldritch(초록) / Order(흰색) / Primordial(파랑). "Affinity bonuses accumulate when fully unlocking constellations and are **not spent**."
- 티어(grimdawn.fandom Constellation): **T1 = 친화력 1점 요구, 큰 친화력 보너스 / T2 = 8~15점 요구, 작은 보너스 / T3 = 22점 이상 요구, 보너스 없음.** 성좌는 자기 보너스가 자기 요구를 충족하는 **self-supporting** 구조라, 디딤돌로 쓴 성좌의 포인트를 나중에 회수할 수 있다. (namu: T1 41개 / T2 36개 / 최종 20개, 최종은 6~20점 요구 — 분류 기준이 달라 숫자 불일치, 미확인란 참조.)
- **Celestial Power 바인딩**: 총 50(AoM 55)개. "unique skills that can be linked to normal mastery or item skills, and have a chance to trigger off the skill as a secondary effect." 스킬 1개당 프록 1개, 프록 수 총량 제한 없음. **장비·컴포넌트 부여 스킬에도 바인드 가능**(장비를 벗으면 바인드는 남고 비활성). 프록 확률은 성좌마다 고정(namu: 15%~100% 범위). 공격 스킬용/버프 스킬용으로 트리거 타입이 구분. 펫 소환 스킬에 걸면 소환군 전체가 쿨다운 공유.
- 프록 성장: 바인드된 채 사용될 때만 경험치 획득 → 레벨업(상한 T1 20 / T2 15 / T3 10, AoM +5). 경험치는 바인드 해제해도 보존.
- 리스펙: Spirit Guide에서 "a fee plus an Aether Crystal"(포인트 수에 비례). 다른 성좌가 의존하는 친화력 제공 별은 환불 불가. Tonic of Clarity로 전체 초기화. 창을 닫기 전엔 Undo 무료.

#### 2-4. 유물(Relic) · 메달 · 슬롯 전체
- **장비 슬롯 14개**: 주무기 / 보조(방패·오프핸드·이도류) / 투구 / 어깨 / 가슴 / 장갑 / 다리 / 신발 / 벨트 / 반지 ×2 / 목걸이 / **메달** / **유물**.
- 유물: 슬롯 아이템. "Whenever you craft a Relic, it generates a random bonus, in addition to its base stats." 3티어 — Empowered(Lv18, 일반 재료, Calamity·Ruination·Equilibrium은 대장장이 해금 즉시) → Transcendent(청사진 루팅 + Empowered 재료) → Mythical(청사진은 보스/Ultimate 사당, Transcendent 여러 개 + 희귀 재료). 예: Calamity — 2-6 물리, 5% 확률 50% 물리, +12% 화염, +35 OA, 부여 스킬 Calamity(5% 공격 시 발동, 8투사체). Gunslinger's Talisman — 원거리 이도류 자체를 여는 부여 스킬 Volley. 유물에는 컴포넌트·오그먼트를 못 붙인다.
- 메달: 컴포넌트(Aether Soul 등 "Amulets, Medals") + 오그먼트(FG Rune Augment 전용) 모두 가능.
- 벨트: 컴포넌트 가능(Bristly Fur, Scavenged Plating, Antivenom Salve, Dense Fur, Molten Skin, Rigid Shell 등 방어구 계열) + 방어구 오그먼트 가능.

#### 2-5. Titan Quest 계보 — 유물(Relic)·차암(Charm)
- **조각 수**: Relic 3조각, Charm 5조각. "Matching pieces can be combined by right clicking, whether in inventory or already applied to a piece of equipment. Relics come in three pieces; each additional piece will enhance its effect. Upon completion, a random bonus will also be applied."
- 획득: Relic은 어디서나(상자 포함) 드롭하되 **출신 Act 이후에만**; Charm은 **몬스터 종류별 드롭**("Monster type determines which charms drop, enabling targeted farming"). 난이도별 명명: Essence of(Normal) / Embodiment of(Epic) / Incarnation of(Legendary).
- 부착 규칙: 유물마다 부착 가능 장비군 지정(예: Artemis' Bowstring = 활, Hermes' Sandal = 다리, Monkey King's Trickery = 반지·목걸이). **Epic(파랑)·Legendary(보라)에는 부착 불가** — 커뮤니티 평: "Its a great design choice to not allow charms or relics to epic or legendary gear, this way Green items sometimes can become even better than those." 아이템당 1개(접미 "of the Tinkerer" 아이템만 2개 허용).
- **완성 보너스**: 인벤토리에서 완성 → 풀에서 랜덤 1개. **장비에 붙인 채 완성 → 숨은 기본 보너스(고정)** 적용("forcing"). 예(titanquestfans 목록): Artemis' Bowstring 공속 8/25/35%, Sigurd's Courage 출혈저항 15/25/35%, Hermes' Sandal 독저항 20/30/40%, Boar Hide 출혈저항 15/25/35%, Turtle Shell 힘 +5/11/18. 플레이어는 "랜덤으로 뽑아보고 나쁘면 강제 완성으로 되돌리기"로 낚시한다.
- 제거: Enchanter(Arcanist) — **아이템 or 유물 중 하나만 보존**, 비용은 장비 접사 희귀도·게임 진행에 따라 상승.
- **Artifact**(별도 슬롯): Arcane Formula + 완성 Relic 1 + 완성 Charm 2 + 골드 → Lesser; Lesser 3개 → Greater; Greater 3개 → Divine.
- **Grim Dawn이 개량한 점**: ① 희귀도 제한 철폐(레전더리에도 컴포넌트 가능) ② 무기 컴포넌트 전원에 부여 스킬 ③ 완성 보너스 → 고정 스탯(스택 1000) ④ 부분 조각 폐지 ⑤ 오그먼트라는 **두 번째 소켓층**을 팩션 평판에 연결 ⑥ 유물을 조각 수집이 아니라 **청사진 제작 + 3티어 승급**으로 이동 ⑦ TQ의 Artifact 슬롯 = GD의 Relic 슬롯로 계승.

#### 2-6. 왜 "컴포넌트 = 저항 보충"인가, 커뮤니티 평가
- 구조적 이유: 장비 자체 접사는 랜덤이라 저항 구멍이 반드시 생기고, 피해 유형이 10종 이상(물리·관통·화염·냉기·번개·독/산·생명력·에테르·카오스·출혈·상태이상 저항 등)이라 랜덤 장비만으로 80% 캡을 맞추기 어렵다. **컴포넌트(고정 20%)·오그먼트(고정 15%)는 "구멍 메우기(patch the holes)"용 결정론적 손잡이**로 설계됐다. 커뮤니티 가이드도 "prioritize resist on armor/jewelry instead of damage and craft additional/higher grade resist components".
- 개발자 입장(Zantai, 2019-06 저항 토론 스레드): 등급형(D3식) 저항을 도입해도 "there is still a point where it's no longer worth stacking the resist over other bonuses, and where that value falls is very similar to a hard-cap. I don't necessarily see meeting Resistance requirements for end-game content to be an issue either, **although any sequel we may work on could benefit from less damage types to worry about.**"
- 커뮤니티 비판(Steam 2023): "You're just balancing them so you don't get obliterated by the random enemy who does that damage type" / "devs have however agreed that Grim Dawn probably ended up with too many dmg types". 즉 컴포넌트층은 잘 작동하지만 **"저항세(tax)" 성격**이라 창의적 선택이 아니라 필수 지출이라는 인식.

### 3. 소켓/슬롯 규칙
- 소켓은 **뚫는 개념이 없다** — 모든 장비(유물 제외)에 컴포넌트 1 + 오그먼트 1이 기본 내장. 희귀도·레벨 무관.
- 착용 제한은 **컴포넌트 쪽에** 있다(부위군 + 요구 레벨). 아이템에는 없다.
- 영구성: 컴포넌트는 "붙이면 둘 중 하나 포기"형 반영구. 오그먼트는 덮어쓰기 가능(소모품).
- 성좌는 장비와 무관한 캐릭터 슬롯이지만 **프록을 장비 부여 스킬에 바인드**함으로써 장비층과 연결된다.

### 4. 트레이드오프·제약
- **Salvage의 양자택일**: 좋은 컴포넌트를 좋은 장비에서 떼려면 둘 중 하나를 잃는다 → 붙이기 전에 고민하게 만드는 유일한 마찰.
- 오그먼트는 **평판 시간 + Iron** 이 비용. 방어구 오그먼트가 Revered 잠금이라 초중반엔 컴포넌트만으로 저항을 짜야 한다.
- 성좌 리스펙은 **의존성 그래프** 때문에 부분 환불이 막힐 수 있음 → 경로 설계가 실제 퍼즐.
- 인벤 압박: 완성 보너스 시절엔 변종 컴포넌트가 인벤을 잠식(폐지 사유). 현재는 1000 스택이라 부담 0.
- 유물은 Mythical까지 **하위 유물 여러 개를 소모**하는 승급 싱크.

### 5. 경제
- 싱글/협동 중심, 거래는 비공식. 공식 가이드의 설계 선언: "we recognize that there are many players who just want a reasonable chance to find their own loot without endless grinding."
- 컴포넌트는 드롭·상인·현상금·분해로 흔해서 **재화가 아니라 부품**. 싱크는 Salvage의 파괴, 제작 재료 소모, 유물 승급 소모.
- 오그먼트 = **평판 게이지의 현금화 창구**(평판 → 저항/피해 고정 보너스). Writ/Mandate는 평판 획득 가속 상품.
- 성좌 = 탐험 보상(사당)의 캐릭터 파워 환원. 리스펙 비용(Iron + Aether Crystal)이 소규모 싱크.

### 6. 설계 원리 (왜 잘 작동하나)
- **결정론 보충층 + 랜덤 본체층의 분리**: 장비 접사는 랜덤(체이스), 컴포넌트·오그먼트는 고정(구멍 메우기). 플레이어는 "이 장비를 쓰려면 어느 저항이 비는가"를 숫자로 읽고 부품을 고른다 — 통제성.
- **한 슬롯에 두 층을 겹치되 역할을 다르게**: 컴포넌트(드롭·제작, 반영구, 스킬 부여) / 오그먼트(평판, 덮어쓰기, 순수 스탯). 같은 슬롯이 두 개의 진행 축(파밍, 평판)을 동시에 소비한다.
- **무기 컴포넌트 = 스킬 슬롯**: 클래스에 없는 액티브를 부품으로 끼워 빌드 폭을 넓힌다. 성좌 프록까지 여기에 바인드되므로 "부품 → 스킬 → 프록" 3단 체인이 생긴다.
- **성좌의 self-supporting 규칙**: 디딤돌 성좌를 나중에 회수할 수 있어 경로 최적화 퍼즐이 생기되 막다른 길은 없다.
- **완성 보너스·부분 조각 폐지의 교훈**: 랜덤은 본체(장비)에 두고, 부품층은 스택 가능해야 인벤 관리가 게임을 잡아먹지 않는다. Crate는 커뮤니티 투표까지 거쳐 이 방향으로 정리했다.
- **희귀도 무관 소켓**: TQ의 "레전더리에는 못 붙임"을 버려서 레전더리도 부품으로 마무리하게 함 — 대신 TQ가 노렸던 "녹색템 역전"은 사라졌다.

### 7. 알려진 문제·비판, 그리고 바꾼 것
- 완성 보너스 인벤 잠식 → Build 29 폐지(투표 후). 부분 조각의 존재 이유 소멸 → 1.1.6.0 폐지 + 자동 줍기.
- "피해 유형이 너무 많다 / 저항은 세금이다" → 개발자도 후속작에선 줄이겠다고 인정. 해결책으로 **저항 오그먼트·컴포넌트를 꾸준히 추가**(FoA 시기에도 "Pierce/Bleeding 오그먼트 추가해 달라"는 요청 스레드).
- 오그먼트 회수 불가 → 재구매가 가능하니 큰 불만은 없음.
- Salvage 양자택일에 대한 초보 혼란("item is destroyed when you get component") → 위키/FAQ로 흡수, 규칙은 유지.

### 8. 본작 관점 메모
**가져올 만한 것**
1. **"고정 부품층"의 역할 정의를 "구멍 메우기"로 못 박기.** 본작 장비 접사는 7죄종×부위 매트릭스의 랜덤이다. 부품층은 랜덤 접사가 못 채우는 축(예: 상태이상 저항 7종, 특정 죄종 피해)을 **고정 수치로 보충**하는 데만 쓰면 접사 풀을 희석하지 않는다. 컴포넌트가 부위군별로 고정 슬롯 하나만 차지하는 것도 그대로 쓸 만하다.
2. **부품 = 스택 가능, 랜덤 없음.** Crate가 두 번의 폐지를 거쳐 도달한 결론. 본작은 인벤 공간이 곧 UI 예산(1366×768)이므로 "완성 보너스" 같은 변종을 만들면 안 된다. 랜덤은 장비(매직→레어→크래프트→유니크)에만.
3. **Salvage 양자택일**은 거래 없는 싱글에서 가장 깔끔한 회수 규칙이다. 골드 지불 + 아이템/부품 중 하나 보존 — 실패 확률 없이도 결정을 무겁게 만든다.
4. **무기 부품 = 부여 스킬**: 본작 액티브 슬롯 실동작이 미구현인데, "무기 부품이 액티브 1개를 준다"로 시작하면 스킬 카드 정의와 충돌하지 않는지 먼저 검증(단순화 원칙).
5. **성좌의 "프록을 스킬에 바인드" 구조**는 죄종 축과 잘 맞는다 — 죄종 친화력 누적 → 상위 별자리 해금 → 프록을 영웅 스킬에 바인드. 다만 이는 캐릭터층이라 "장비가 주인공" 원칙과 긴장한다(아래 피할 것 3).

**피해야 할 것**
1. **오그먼트 같은 두 번째 소켓층을 동시에 두지 말 것.** GD는 팩션 평판이라는 별도 진행 축이 있어서 두 층이 정당화됐다. 본작은 파견/시설이 그 자리를 대신할 수 있지만, 장비 한 칸에 두 층은 "숫자로 읽히는 최적화"를 흐린다. 하나만.
2. **피해 유형·저항 종류를 늘리지 말 것.** GD의 저항세 문제는 유형 수가 원인이다. 본작은 상태이상 7종 = 죄종 7종으로 이미 축이 하나다. 부품층이 새 저항 축을 만들면 안 된다.
3. **캐릭터에 붙는 영구 성장층(성좌)은 보류.** 영웅은 빌드 슬롯이고 유니크 15 + 레어 무한 생성 구조라 영웅별 성좌 투자는 매몰비용을 만든다. 성좌를 넣는다면 **계정(거점) 단위**로 한 벌만 두고 영웅은 공유하게 해야 "자리 비워도 안전" 계약이 유지된다.
4. 유물의 "제작 시 랜덤 1줄"은 본작 크래프트(낙인으로 죄종 지정)와 중복된다. 랜덤 줄을 또 만들지 말고 크래프트 층에 흡수.

### 9. 출처 목록 (Grim Dawn / Titan Quest)

| 출처 | 신뢰도 | 사용 항목 |
|---|---|---|
| https://www.grimdawn.com/guide/items/components/ | ★★★ 공식 | 컴포넌트 정의, 무기 컴포넌트 = 부여 스킬, 드롭 편향, 수치 예 |
| https://www.grimdawn.com/guide/items/relics/ | ★★★ | 유물 3티어, 랜덤 보너스, 수치 예 |
| https://www.grimdawn.com/guide/items/crafting/ | ★★★ | 대장장이 보너스, 청사진 규칙, Enchanted/Rare 제작 |
| https://www.grimdawn.com/guide/character/devotion/ | ★★★ | 포인트 50/55, 사당 종류, Crossroads, 프록 레벨 상한, 리스펙 |
| https://www.grimdawn.com/guide/character/factions/ | ★★★ | 오그먼트 정의, 평판 단계, Writ/Mandate |
| https://www.grimdawn.com/guide/about/forgotten-gods/ | ★★★ | Rune Augment(메달 전용, 청사진 드롭) |
| https://www.grimdawn.com/guide/items/the-hunt-for-loot/ | ★★★ | 루팅 철학, 희귀도 체계 |
| https://grimdawn.fandom.com/wiki/Components (archive.org 2024) | ★★★ | 1아이템 1컴포넌트, 부위·스탯 표, 획득처 |
| https://grimdawn.fandom.com/wiki/Augment (archive.org) | ★★★ | 4계열, 덮어쓰기, 회수 불가, 수치 표 |
| https://grimdawn.fandom.com/wiki/Devotion (archive.org) | ★★★ | 바인딩 규칙, self-supporting, Tonic of Clarity |
| https://grimdawn.fandom.com/wiki/Constellation | ★★★ | 티어별 친화력 요구(1 / 8~15 / 22+) |
| https://grimdawn.fandom.com/wiki/Inventor (archive.org) | ★★★ | Salvage/Dismantle/Transmute 규칙·비용 |
| https://grimdawn.fandom.com/wiki/Relics, /Belts (archive.org) | ★★★ | 유물 티어·청사진, 벨트 컴포넌트 목록 |
| https://forums.crateentertainment.com/t/grim-dawn-version-1-1-6-0/96515 | ★★★ 공식 패치노트 | 부분 컴포넌트 삭제 원문, 커뮤니티 반응 |
| https://forums.crateentertainment.com/t/my-take-on-resistance-in-aprg/48528 | ★★★ (Zantai 답변) | 저항 설계 개발자 입장 |
| https://www.gamebanshee.com/news/116566-grim-dawn-build-29-released-now-content-complete.html | ★★ (패치노트 전재) | 완성 보너스 폐지 원문, 스택 1000 |
| https://steamcommunity.com/app/219990/discussions/0/610575007222101534/ | ★★ (Zantai 게시) | 2015-03 완성 보너스 투표 |
| https://steamcommunity.com/app/219990/discussions/0/451848854986516000 | ★★ | 폐지 직후 반응 |
| https://steamcommunity.com/app/219990/discussions/0/1742268488171930659/ · https://www.gog.com/forum/grim_dawn/grim_dawn_partial_components_removed | ★★ | 부분 조각 폐지 반응 |
| https://steamcommunity.com/app/219990/discussions/0/3475112788080101790/ | ★★ | Inventor 제거 Q&A |
| https://steamcommunity.com/sharedfiles/filedetails/?id=836772237 | ★★ (v1.0.0.9 기준) | 저항 컴포넌트/오그먼트 수치 |
| https://steamcommunity.com/app/219990/discussions/0/6333797474867133500/ | ★★ | "저항 너무 많다" 비판 |
| https://forums.crateentertainment.com/t/resistance-augments-for-the-fangs-of-asterkarn-dlc/147277 | ★★ | 저항 오그먼트 추가 요청 |
| https://en.namu.wiki/w/Grim%20Dawn/별자리 | ★★ | 성좌 수(41/36/20), 프록 확률 범위 |
| https://titanquest.fandom.com/wiki/Relic (archive.org) | ★★★ | 3조각, 파랑/보라 불가, 랜덤 완성 보너스, Act별 목록 |
| https://lparchive.org/Titan-Quest/Mechanics%203/ | ★★ | 차암 5조각·몬스터 드롭, Enchanter, Artifact 제작식 |
| https://steamcommunity.com/sharedfiles/filedetails/?id=3441832959 | ★★ | 숨은 기본 보너스·강제 완성 |
| https://titanquestfans.net/index.php?topic=652.0 | ★★ | 표준 완성 보너스 목록(v1.57) |
| https://steamcommunity.com/app/475150/discussions/0/4687682349653776702/ · /3084394448730419708/ | ★★ | 파랑/보라 부착 불가 논의, of the Tinkerer |

**미확인 (Grim Dawn/TQ)**
- 메달 슬롯이 AoM에서 신설됐는지(정황상 그렇다고 알려졌으나 공식 문서에서 확인 못 함).
- 성좌 리스펙의 정확한 Iron/Aether Crystal 단가.
- 성좌 개수(namu 41/36/20)와 위키 티어 기준(1/8~15/22+)의 정합 — 분류 기준이 다른 것으로 보이나 원표를 대조하지 못함.
- TQ Enchanter 제거 비용의 구체 수치(스케일한다는 진술만 확인).
- TQ Charm 위키 페이지(503) — 차암 규칙은 lparchive·Steam 가이드·titanquestfans로 교차 확인.

---

## 게임 2 — Ragnarok Online (Gravity, 2002~ / Renewal 2009~. 한국 서비스 + iRO 공통 규칙)

### 1. 시스템 한 장

| 층 이름 | 붙는 곳 | 획득처 | 효과 성격 | 제거·회수 | 합성/승급 경로 |
|---|---|---|---|---|---|
| **카드 (Card)** | 장비 소켓 `[n]` — 무기 최대 4, 방어구·방패·투구·걸칠것·신발·액세서리 각 최대 1. 카드마다 부위 고정 | 몬스터 처치 시 **기본 0.01%**(거의 모든 몬스터가 자기 카드 보유), Old Card Album(비MVP 랜덤), Mystical Card Album(미니보스), 클래스 세트 앨범, 거래 | **고정**(카드별 정해진 효과) — 명칭 접두/접미 부여, 카드 세트 보너스 | **kRO**: 100,000z 2% / 일반 윤활제 12% / 고급 윤활제 25% / 실릿퐁(보스 카드) 100%, **실패해도 파괴 없음**(2016-08-31 개편). **iRO**: 1,000,000z 5% / General Lubricant 40% / High Ranked 80% / Silit Pong 100%, 실패 시 소멸 없음 | 없음(카드 승급은 라그 오리진 등 파생작 개념) |
| **슬롯 부여 (Socket Enchant)** | 특정 장비 목록에 슬롯 추가 | NPC Seiyablem(무기 위주)/Leablem — 제니 100,000~2,000,000 + 재료 | 슬롯 +1~+4 | **실패 시 장비·삽입 카드 파괴**, 재료 미환불. Troy + Slot Advertisement(캐시)는 파괴 없음 | C 25% / B 20% / A 15% / S 10%(iRO 추정; RMS eAthena r14262: C 25 / B 20-25 / A 10-25 / S 5-10) |
| **정련 (Refine, +0~+20)** | 장비 자체 | 대장간 NPC + 광석(프라콘/엠베르타콘/오리데오콘/에르늄, +10↑ 브라디움/카르늄) | **성장**(정련도별 누적 보너스, 안전 초과분은 랜덤 Over-Upgrade) | 실패 시 **파괴(카드·인챈트 포함)**. HD 광석·대장장이 축복은 파괴 대신 -1/유지 | 안전 정련: 무기 Lv1 +7 / Lv2 +6 / Lv3 +5 / Lv4 +4, 방어구 +4, 쉐도우 +4, Lv5 무기·Lv2 방어구 +3 |
| **인챈트 (Enchant)** | 장비의 **숨은 카드 슬롯 위치**(4슬롯 중 카드가 안 쓰는 자리) | 지역 NPC(말랑도 코인, 모라, 바이오랩 등 수십 종) | **랜덤**(풀에서 추첨) | 말랑도: 실패 없음, 카드·정련 보존, 은방울열매로 리셋. Hidden Enchant: 400,000z, 실패 시 **파괴**·기존 카드 소실 | 무기 카드 슬롯이 3이면 말랑도 인챈트 1개만 가능 |
| **쉐도우 장비** | **별도 6슬롯**(무기·방패·갑옷·신발·귀걸이·펜던트) — 기존 장비 위에 겹쳐 착용 | 쉐도우 퀘스트, 카츄아 열쇠, 이벤트 | 고정 + 정련 성장(+1 ATK·MATK/정련, +10 HP/정련) + 인챈트 1개 | 정련 +10 상한, 20,000z + 오리/에르, 안전 +4 | 쉐도우 인챈트는 +7 이상 필요, 100% 성공, 덮어쓰기. 클래스 쉐도우 박스는 +7 이상 재료 소모 → 랜덤 재생성 |
| **코스튬 + 스톤** | 코스튬 상·중·하단(슬롯 1·2·3) + 비주얼(슬롯 4), 코스튬 걸칠것(Garment Stone 1 + Dual Stone 2) | 코스튬 상자(캐시) → 코스튬을 NPC에 넘기면 스톤 1개(**인벤에서 랜덤 코스튬을 가져감**) | 고정(스톤별) | 스탯 스톤 50% 성공 / 비주얼 100%. 실패 시 **스톤과 그 슬롯의 기존 인챈트만 소멸**, 코스튬 안전. 덮어쓰기 가능. 비주얼 제거 99,800z | — |

### 2. 각 개조 아이템 상세

#### 2-1. 카드
- **드롭**: iRO Wiki "Most monsters in-game have a 0.01% chance of dropping their own card." kRO 원문은 "거의 대부분의 몬스터들이 자신의 이름이 붙은 카드 아이템을 낮은 확률로 드롭". MVP 카드도 기본 동일 확률로 알려져 있으나 공식 확률표는 찾지 못함(미확인). 서버 드롭 배율(iRO 현재 카드 100%)이 곱해진다.
- **슬롯 수 = 가치**: "Many weapons have multiple variants with different numbers of slots. For example, 'Blade [3]' is store-bought, and 'Blade [4]' is dropped by monsters." 나무위키: "카드 슬롯이 있는 장비류는 일반 상점에서 팔지 않고 강력한 몬스터를 잡아야 아주 조금씩 나왔기 때문에 그 가격이 매우 비쌌다."
- **부위 분류**: 카드 우클릭 시 효과·장착 부위 표시. 카드는 자기 카테고리에만 들어간다(무기/방패/투구/갑옷/걸칠것/신발/액세서리). 카드 색: 일반 흰색 / MVP 보스 노란색 / MD(인던) 보스 빨간색(kRO).
- **명명 규칙** (kRO 공식): "각각의 카드에는 고유의 접두사나 접미사가 있기 때문에 장비에 조합할 경우, 해당 장비의 이름을 변경." 동일 카드 중복: **2장 더블-, 3장 트리플-, 4장 쿼드로플-** (접사는 한 번만, 수량어 추가). 순서: WarpPortal 유저 합의 "depends on what order you slot the cards in, while grouping like cards together. It goes from left to right, new→old" — 그래서 "Boned Bloody"와 "Bloody Boned"가 모두 존재하고, 어감 때문에 다시 사서 박은 사례까지 있다.
- **삽입 영구/제거**: 삽입은 즉시·무비용·영구. 제거는 아래 2-1-a.
- **세트 보너스**: "Set bonus, whether from equipment, card or enchant are only applied once, even if the player have multiple instances of it." 예(iRO Card Sets): Alarm+Clock+Punk+Tower Keeper(신발·갑옷·걸칠것·투구) → DEF+3 MDEF+3 / Angry Dracula+Bomi → HP+1000 SP+50, 걸칠것 +9↑면 추가 / Aster+Crab+Shellfish(무기 3장) → 수속성 물리 +30%, 생선 드롭 30% / Bigfoot+Grizzly → 암흑 확률 6% / 직업 세트(playragnarok): Hunter 세트(Cruiser·Anolian·Alligator·Dragon Tail·Merman) → 원거리 +20%, AGI+5 DEX+3, 궁수 계열 추가 보너스. **장비+카드 세트**도 있음(Equipment Sets).
- **카드로 얻는 스킬**: Beholder Card → Cast Cancel Lv1, Bongun Card → Bash Lv1 오토캐스트, Angry Dracula → Indulge Lv1 등 — 직업 외 스킬 개방.
- **카드 앨범**: Old Card Album = 비MVP 전 카드 랜덤(RMS 아이템 스크립트 `getrandgroupitem(IG_CardAlbum)`; 목록엔 [mvp drop] 표기가 있으나 이는 앨범 자체의 드롭처), Mystical Card Album = 미니보스, Class Set Card Album = 6개 직업 세트. iRO의 Card Album Exchange 이벤트도 존재.

**2-1-a. 카드 제거 규칙 (연혁 포함)**
- 구 시스템(2016-08 이전 kRO / 클래식·사설 서버 관행): Wise Old Woman — 200,000z + 카드당 25,000z + Star Crumb 1 + Yellow Gemstone 1, **실패 시 카드 또는 장비 파괴**(★ 블로그·rAthena 기반, 공식 원문 미확보).
- **kRO 2016-08-31 "카드 분리 시스템 개편"**(공식 공지): 리처드 NPC 대사 "가급적이면 손님들의 장비가 망가지지 않았으면 좋겠습니다". 변경 3가지 — ① 윤활제를 '신형'으로 교체(독성 제거 → 파괴 방지, 성공률은 하락) ② **장비/카드 파괴 확률 삭제 → 실패 확률만 존재** ③ 가격 인하: 신형 고급 윤활제 냥다래 56→**7개**, 신형 일반 36→**4개**, 제니 1,000,000→**100,000**.
- **kRO 현행 공시 확률**(probability.gnjoy.com): 제니 10만 → **2.0%**, 일반 윤활제 → **12%**, 고급 윤활제 → **25%**, 실릿퐁(보스 카드 전용) → **100%**. 중단 투구는 재료 2배. "몬스터 카드만 분리 가능(인챈트 아이템 분리 불가)", "투구는 상단·중단만", "실패 시 재료 아이템만 소모".
- **iRO 현행**(iRO Wiki Card Desocketing, Richard @ Malangdo): 1,000,000z **5%**(MVP도 가능) / General Lubricant **40%**(은방울열매 36) / High Ranked **80%** / Silit Pong **100%**(MVP 전용). 실패 시 카드는 장비에 남고 아무것도 파괴 안 됨. 성공 시 장비·카드·정련·인챈트 전부 보존.
- 정리: "삽입 영구 + 제거 시 파괴 위험"이었던 원형이 **2016년 이후 "파괴 없음, 저확률 반복 시도(캐시 재료 싱크)"**로 바뀌었다. 이 전환이 카드 경제에 미친 영향은 §5.

#### 2-2. 슬롯 부여 (Socket Enchant)
- NPC: Seiyablem(프론테라 대장간 prt_in 33/70, 리히타르젠, 모로크, 페이욘) / Leablem. 품목별로 담당 NPC 고정.
- 등급별 성공률(iRO Wiki 추정): C 25% / B 20% / A 15% / S 10%. RMS(eAthena r14262) 품목별 표: C 25%, B 20~25%, A 10~25%, S 5~10%.
- 비용 예(RMS): Trident[2]→[3] 200,000z + Phracon 10 (25%) / Gladius[2]→[3] 300,000z + Oridecon 1 + Steel 5 (20%) / Zweihander[0]→[2] 800,000z + Oridecon 5 + Steel 10 (20%) / Ice Pick[0]→[1] **2,000,000z** + Oridecon 5 + Steel 10 (10%) / Majestic Goat·Tiara·Crown·Ring·Earring [0]→[1] 2,000,000z + Elunium 2 (10%) / Holy Robe·Undershirt·Pantie 1,000,000z + Elunium 1 (**5%**) / 특수: Hat of the Sun God 200,000,000z + Gold 2 (90%).
- **실패 = 장비와 삽입 카드 전부 파괴, 재료·제니 미환불.** 인벤에 같은 장비가 여럿이면 랜덤 선택(경고).
- 부작용: Tiara/Crown INT+2 → +1, Ice Pick ATK 80 → 70, Skull Ring은 언데드 저항 1% 부여 — **슬롯을 얻는 대가로 기본 옵션이 깎인다.** 제작(Forged) 무기는 속성·강도 접두가 사라지고 "Claymore [2]"로 재생성.
- 완화 장치: Troy + Slot Advertisement(캐시 이벤트) — 성공률 상승 + 실패해도 파괴 없음.

#### 2-3. 정련 (Refine)
- 상한: Renewal **+20**(Pre-renewal은 +10, 인벤 가이드 "무기,방어구의 최대 제련 수치는 +10"). +10 초과는 +10 이상 아이템에서 시작, 100,000z + Carnium(방어구)/Bradium(무기).
- 재료·수수료(iRO): Lv1 무기 Phracon 50z / Lv2 Emveretarcon 200z / Lv3 Oridecon 5,000z / Lv4 Oridecon 20,000z / Lv5 Etherdeocon 50,000z / Lv1 방어구 Elunium 2,000z / Lv2 방어구 Ethernium 30,000z. 원석 5개 → 정제 1개(kRO 동일). 캐시 광석 사용 시 수수료 0.
- **안전 정련**: 무기 Lv1 +7 / Lv2 +6 / Lv3 +5 / Lv4 +4, 방어구 +4, 쉐도우 +4, Lv5 무기·Lv2 방어구 +3(단 +10 미만 실패는 파괴 대신 -3 또는 -1).
- **kRO 공시 성공률(일반 광석, 평상시)** — 방어구 Lv1·무기 Lv4·쉐도우: +5 60% / +6 40% / +7 40% / +8 20% / +9 20% / +10 9% / +11~14 8% / +15~18 7% / +19~20 5%. 무기 Lv1: +8 60% / +9 40% / +10 19% / +11~14 18% / +15~18 17% / +19~20 15%. 캐시(농축) 광석: 방어구 +5 90 / +6 70 / +7 70 / +8 40 / +9 40 / +10 20%. 정련 이벤트 시 +11 이상이 20~40%로 상승.
- **실패 규칙**: 안전 초과 실패 = **장비 파괴(카드·인챈트 동반 소멸)**, 광석·제니 미환불. HD 광석 → 파괴 대신 -1. 대장장이 축복(Blacksmith Blessing) → +7~+14 구간 실패 시 정련도 유지(비용 1/2/4/7/11/16/22개). kRO 고농축(+7~+9)/고밀도(+10 이상) 광석 → 파괴 없이 -1. 정련 증서(Refining Certificate)는 100% 지정 정련.
- **보너스**: Lv4 무기 +1당 ATK·MATK +7, 안전(+4) 초과 시 타격마다 0~14 랜덤 추가(Over Upgrade), +16에서 +48 고정 점프(High Upgrade), 이후 +3/정련. +20 Lv4 무기 = +200~424. Lv5 무기는 랜덤 없이 +8/정련, 등급(D~A)에 따라 +10~100%. 방어구/쉐도우는 별도 표.
- 정련 불가: 중·하단 투구, 코스튬(액세서리는 이제 일부 가능).

#### 2-4. 인챈트 (Enchant) — 카드 슬롯을 점유하는 층
- 개념(iRO Enchantment): 인챈트는 아이템의 **4개 카드 슬롯 자리 중 카드가 쓰지 않는 자리**에 기록된다. 그래서 "Items with no card slots are valued more … because the system uses hidden card slots for enchantments"(Hidden Enchant 논의) / "**If a weapon has 3 card slots, only one Malangdo enchantment is possible** (tested and verified)".
- **말랑도 인챈트**(마요마요, 말랑도 213/167): Lv3·4 무기 대상, 코인 등급별 기본 비용(Seagod's Anger 1 / A 2 / B 3 / C 6 / D 10 / E 15) × 무기별 배수. **실패 없음**(다만 나쁜 인챈트 가능), **카드·정련 보존**, 은방울열매 1개로 전체 리셋, 착용 상태에서만 가능, A코인은 근접/원거리/마법 계열 선택. 10코인 → 하위 26~29개 교환.
- **Hidden Enchant**(프론테라 165/60): 특정 갑옷에 6스탯 중 하나 +1~+3 랜덤. 400,000z, 재료 없음. 성공률 비슬롯 80%(+1 40 / +2 26.67 / +3 13.33) / 슬롯 72% / 고급 65.46%. **실패 시 파괴**, 성공해도 "all previous enchantments, upgrades, and cards are lost" → 권장 순서: 슬롯 부여 → 히든 인챈트 → 정련 → 카드.
- 그 외 iRO Enchantment 목록엔 Mora·Biolab·Temporal Boots·Fallen Angel Wing·Archangel Wing·RWC·Illusion·Terra Gloria 등 30종 이상 — 각기 성공률·파괴 여부가 다르며 "sometimes the enchants are even the defining part of the gear".

#### 2-5. 쉐도우 장비
- 정의: "ethereal magic items that are worn over your existing gear" — 6슬롯(무기·방패·갑옷·신발·귀걸이·펜던트). 획득: Shadow Item Quest, Kachua's Secret Key/마일리지, 이벤트.
- 정련: 20,000z + Oridecon/Elunium, 안전 +4, 상한 **+10**. +4~+10은 농축 광석(파괴 가능), +7~+10은 HD(실패 시 -1). 캐시 망치로 즉시 +9 / +1~+10 랜덤.
- 보너스: 쉐도우 무기 +1 ATK·MATK/정련, 나머지 +10 HP/정련. Shadow Set(6종) → 전 스탯 +3.
- 인챈트: Shadow Enhancement Box, **+7 이상만**, 100% 성공, 1개 상한, 덮어쓰기. 값 예: ATK +1~15, ASPD +1, Flee +5~15, Max HP +100~500, VCT -1~3%. 클래스 쉐도우 박스는 +7 이상 쉐도우를 소모 → 새 랜덤 쉐도우(+1~+10 정련, +1~+10 스탯). Status Shadow Item Combiner: +7 이상 5개 → Almighty 귀걸이/펜던트.
- 카드 슬롯: 페이지 전체에 카드 슬롯 언급 없음 → **카드 불가로 보임(미확인)**.

#### 2-6. 코스튬 + 스톤
- 3중 RNG(iRO Wiki 명시): 코스튬 상자 → 원하는 코스튬 → 코스튬을 헤이담에 넘기면 스톤(**인벤에서 랜덤 코스튬을 가져가므로 카트에 치우고 갈 것**) → 스톤 인챈트 성공.
- 슬롯: 상단=1, 중단=2, 하단=3, 비주얼=4. 걸칠것: Garment Stone 1번, Dual Stone 2번. 상·중·하 복합 코스튬은 차지 슬롯 수만큼 다중 인챈트.
- 성공률: 스탯 스톤 **50%**, 비주얼 100%. 실패 시 스톤 + 해당 슬롯의 기존 인챈트만 소멸, 코스튬·다른 슬롯 안전. 덮어쓰기 가능. [Named] 코스튬은 이름 소실. 비주얼 제거 99,800z(스톤 미반환).

#### 2-7. 경제·파밍 문법과 파생 영향
- **카드 = 몬스터 사냥의 존재 이유**: 거의 모든 몬스터가 고유 카드를 갖고, 0.01%는 "잡다 보면 나오는" 수준이 아니라 수천~수만 마리 단위의 목표 파밍을 만든다. MVP 카드는 리스폰 경쟁 + 극저확률이라 서버 최상위 자산.
- **가격**: WarpPortal 2014 스레드 — "MvP cards prices fluctuate constantly", "If no one buys the mvp it has no value". 인구·메타·업데이트에 따라 급변.
- **봇**: Steam 커뮤니티 증언 수준("일부 해외 서버는 접속 캐릭터 60% 이상이 봇", 상인 캐릭터가 카드 대량 보유)으로만 확인(★). 카드 드롭이 확률 순수형이라 봇의 시간 투입이 곧 카드 공급이 되는 구조는 논리적으로 성립.
- **다른 한국 MMO 영향**: 직접 계보를 다룬 1차 자료를 찾지 못했다(미확인). 나무위키는 라그의 유저 참여 문화·운영 방식의 영향은 기술하지만 카드→소켓 시스템 계보는 언급하지 않는다. "몬스터 도감과 결합된 소켓 아이템"이라는 문법이 이후 라그나로크 오리진/M의 카드 진화·카드 대여로 이어진 것만 공식 자료로 확인.

#### 2-8. 카드 접사 대표 표

| 카드 | 부위 | 접사(영문 / 한국 공식) | 효과 |
|---|---|---|---|
| Angeling | 갑옷 | **Holy** (접두) | 갑옷 성속성 |
| Ghostring | 갑옷 | **Ghost** (접두) | 갑옷 염속성 |
| Evil Druid | 갑옷 | **Deadly** (접두) | 갑옷 불사속성 |
| Pasana | 갑옷 | **of Ifrit** (접미) | 화속성 |
| Dokebi | 갑옷 | **of Zephyrus** (접미) | 풍속성 |
| Thara Frog | 방패 | **Cranial** (접두) | 인간형 피해 -30% |
| Khalitzburg | 방패 | **from Hell** (접미) | 악마형 -30% |
| Teddy Bear | 방패 | **of Requiem** (접미) | 불사형 -30% |
| Alligator | 걸칠것 | **Four Leaf Clover** | 원거리 피해 -5% |
| Berzebub | 액세서리 | **of Bigmouth** | 변동 캐스팅 -30% |
| Bongun | 무기 | **of Knock-Back** | Bash Lv1 오토캐스트 |
| 포링(Poring) | 갑옷 | **럭키** (접두) | LUK+2, 드롭 보정 |
| 파브르(Fabre) | 무기 | **바이탈** (접두) | VIT+1 |
| 로다프로그(Roda Frog) | 갑옷 | **오브 챔피언** (접미) | HP/SP 증가 |
| 콘도르(Condor) | 걸칠것 | **퀵** (접두) | Flee+10 |
| Hydra / Skeleton Worker | 무기 | **Bloody / Boned** | 인간형 +20% / 중형 +15% — "Double Bloody Boned" 유래(★★ 커뮤니티 통용, 1차 표에서는 직접 확인 못 함) |

출처: iRO Wiki Card Reference(속성·종족 카드 접사 표), playragnarok.com Card List, ro.gnjoy.com 카드 도서관(접사 컬럼).

### 3. 소켓/슬롯 규칙
- 슬롯은 **아이템 베이스에 내장**(`[0]~[4]`). 같은 이름이라도 상점판 `[3]`, 드롭판 `[4]`처럼 **슬롯 수가 다른 변종**이 존재하고, 슬롯 수가 곧 등급.
- 무기만 최대 4, 나머지 부위 1. 카드는 부위 고정.
- 슬롯 뚫기(Socket Enchant)는 **목록에 있는 장비만**, 저확률·파괴형·유료. 스톤/인챈트는 **카드 슬롯 자리를 공유**하므로 "슬롯 수 - 카드 수 = 인챈트 여유".
- 카드 삽입은 즉시·영구. 제거는 제니/캐시 재료 소모형(현행은 파괴 없음).
- 쉐도우·코스튬은 **겹쳐 입는 별도 레이어**라 본체 슬롯과 경쟁하지 않는다.

### 4. 트레이드오프·제약
- **정련 vs 카드**: 정련 실패가 카드까지 지우므로 "먼저 정련하고 성공한 뒤에 카드를 박는" 순서가 강제된다(히든 인챈트도 동일). 카드가 비쌀수록 정련 도박을 못 한다.
- **슬롯 부여의 옵션 삭감**(Tiara INT-1, Ice Pick ATK-10) — 슬롯 하나와 고정 스탯을 저울질.
- **인챈트 vs 카드 슬롯 경합** — 무기 [3]이면 말랑도 인챈트 1개만.
- 카드 제거: 구 시스템은 파괴 위험, 현행은 2%~25%로 **여러 번 시도 = 캐시 재료 싱크**. MVP 카드만 실릿퐁 100%(고가 캐시).
- 코스튬 스톤 교환 시 인벤 랜덤 코스튬 몰수라는 "관리 마찰".
- 무게 90% 이상이면 앨범을 못 연다.

### 5. 경제
- **카드가 곧 화폐 대용 자산**: 거래 가능, 가치는 효과·직업 메타·슬롯 장비 공급량으로 결정. MVP 카드는 초고가 소수 거래.
- **슬롯 장비 공급 통제**: 상점은 슬롯 적은 판만 팔고, 슬롯 많은 판은 드롭 → 슬롯 장비 자체가 상품.
- **싱크**: 정련 파괴(카드 동반), 슬롯 부여 파괴, 히든 인챈트 파괴, 카드 제거 재료(윤활제·실릿퐁·냥다래=캐시), 코스튬 스톤 실패.
- **캐시 연결**: 농축/HD 광석, 대장장이 축복, Slot Advertisement, 은방울열매/냥다래(윤활제·코인), 코스튬 상자·스톤 상자, 쉐도우 망치 — "파괴 위험을 캐시로 사는" 구조가 전 층에 걸쳐 있다.
- 2016 카드 분리 개편은 "파괴 위험 → 저확률 반복"으로 바꿔 **카드의 재사용성을 올리고(수요 완충) 캐시 재료 소비로 싱크를 옮긴** 사례.

### 6. 설계 원리 (왜 잘 작동하나)
- **몬스터 도감 ↔ 소켓템의 1:1 대응**: 모든 몬스터가 "자기 카드"를 가지므로 사냥터 선택이 곧 빌드 재료 선택이다. 도감을 채우는 행위와 빌드를 짜는 행위가 같은 루프에 있다.
- **효과 고정 + 슬롯 수 랜덤**: 카드는 읽기 쉽고(고정), 장비는 슬롯 수로 희소성을 갖는다. 랜덤이 한 축(슬롯 수)에만 있어 "숫자로 읽히는 최적화"가 성립.
- **이름 접사 규칙**: 카드 조합이 장비 이름에 드러나 거래 채팅 한 줄로 스펙이 통한다("트리플 블러디 본드 카타르"). 정보 비대칭 해소 장치.
- **부위 고정 + 무기만 4슬롯**: 무기가 스택형(같은 카드 4장) 실험장, 방어구는 1장 선택형 — 부위별 결정 밀도가 다르다.
- **세트 보너스가 부위를 가로지름**: 여러 부위에 서로 다른 카드를 박아야 완성되므로 저가 카드도 조합 가치가 생긴다.
- **삽입 영구성이 만든 결정의 무게**: (원형에서) 한 번 박으면 끝이라 카드·장비 궁합을 고민하게 했다 — 현행은 완화됐지만 저확률·유료로 무게를 남겼다.

### 7. 알려진 문제·비판, 그리고 바꾼 것
- **파괴형 제거의 손실 체감** → 2016-08 kRO 개편(파괴 삭제, 가격 1/8), iRO도 실패 시 무손실. 공식 공지 스스로 "언제 파괴될지 모른다는 불안감은 그를 찾는 사람들의 발걸음을 돌리게 했다"고 서술.
- **정련 파괴의 카드 동반 소멸** → HD 광석·대장장이 축복·고농축/고밀도 광석·정련 증서 등 캐시/이벤트 완화 장치가 층층이 추가됨. 정련 이벤트 시 +11↑ 확률 2배 이상.
- **슬롯 부여 파괴** → Troy + Slot Advertisement(무파괴).
- **인챈트 층이 카드 슬롯을 잠식**(3슬롯 무기는 인챈트 1개) — 구조상 남아 있는 제약.
- **카드 인플레이션/봇** → 앨범(OCA)·카드 교환 이벤트로 공급 조절; 봇 대응은 운영 이슈로 별도.
- **코스튬 스톤 3중 RNG** — 위키가 "3 layers of RNG"로 명시할 정도로 도박성 지적.

### 8. 본작 관점 메모
**가져올 만한 것**
1. **"몬스터 처치 수 도감 → 그 몬스터의 카드" 원형을 본작 도감 모델에 직결.** 본작 도감은 이미 처치 수 모델이고 몬스터 112종이 7죄종·상태이상 7종에 묶여 있다. 라그처럼 "몬스터가 자기 카드를 0.01%로 떨군다"가 아니라, **처치 수 임계(도감 단계)에서 카드를 확정 지급**하면 방치형 계약("자리 비워도 안전")과 통제성을 모두 지킨다. 카드 효과는 몬스터의 죄종/상태이상에서 파생 → 새 축 없이 기존 축으로 표현 가능(단순화 원칙 통과).
2. **효과 고정 + 슬롯 수만 랜덤.** 카드가 고정이면 UI가 얇아지고, 장비의 슬롯 수를 희귀도 계단(매직 0~1 → 유니크 2~3 등)에 태우면 "통제 가능성의 계단"이 한 칸 더 생긴다.
3. **이름 접사 규칙** — 본작 이름 조립은 이미 데이터 층(`nm()`)에 있다. 카드 접사를 죄종 접사와 같은 조립기로 처리하면 리포트 한 줄에 스펙이 읽힌다.
4. **부위 고정 + 무기만 다슬롯**: 부위 8종 중 무기만 스택 실험장을 두면 결정 밀도를 한 곳에 집중시킬 수 있다.
5. **파괴 없는 저비용 회수(2016 개편 이후 방향)**: 거래 없는 싱글에서는 파괴가 곧 진행 손실이다. 골드 소모 + 확정 회수(또는 GD식 양자택일)로.

**피해야 할 것**
1. **0.01% 순수 확률 드롭.** 봇·거래·MVP 경쟁이 있는 MMO에서만 정당화되는 숫자. 싱글 방치형에서는 "안 나오면 끝"인 벽이 된다. 확률 대신 임계/천장.
2. **정련 실패 = 카드 동반 파괴** 같은 **이중 처벌**. 본작 강화는 골드 접사 증폭이므로 실패 파괴 자체를 두지 말 것.
3. **인챈트·스톤·쉐도우·코스튬처럼 층을 계속 겹치기.** 라그는 20년간 캐시 접점을 위해 층을 덧댔고, 그 결과 "카드 슬롯을 인챈트가 점유"하는 규칙 충돌이 남았다. 본작은 "장비 접사(랜덤) + 카드(고정) 두 층"에서 멈추고, 세트효과(3/6/9)를 다시 살릴지 여부는 카드 세트로 대체 가능한지 먼저 검증.
4. **캐시로 파괴 위험을 사는 구조** — 본작에 캐시가 없으니 위험 자체를 만들지 말 것.
5. **접사 풀 희석**: 라그 카드는 수천 종이라 대부분이 잡카드다. 본작은 몬스터 16 베이스 × 변형 구조이니 **베이스 단위(16종) 또는 죄종 단위(7종)로 카드 종류를 묶어** 잡카드를 만들지 않는 것이 접사 풀 희석 금지 원칙에 맞다.

### 9. 출처 목록 (Ragnarok Online)

| 출처 | 신뢰도 | 사용 항목 |
|---|---|---|
| https://irowiki.org/wiki/Card_System | ★★★ | 슬롯 수, 0.01%, 앨범, 세트 1회 적용, 파괴 시 카드 소멸 |
| https://irowiki.org/wiki/Card_Reference | ★★★ | 속성·종족·크기 카드 접사 표 |
| https://irowiki.org/wiki/Card_Sets | ★★★ | 카드 세트 예시·수치 |
| https://irowiki.org/wiki/Card_Desocketing | ★★★ (iRO 전용 표기) | Richard 제거 확률 5/40/80/100%, 무손실 |
| https://irowiki.org/wiki/Socket_Enchant | ★★★ | NPC, C/B/A/S 추정률, Troy, 옵션 삭감 |
| https://irowiki.org/wiki/Refinement_System | ★★★ | 안전 정련, 재료·수수료, 보너스 표, HD/축복, +20 |
| https://irowiki.org/wiki/Malangdo_Enchants | ★★★ | 코인 비용, 실패 없음, 3슬롯 무기 1인챈트 |
| https://irowiki.org/wiki/Hidden_Enchant | ★★★ | 400,000z, 80/72/65.46%, 파괴, 순서 |
| https://irowiki.org/wiki/Enchantment | ★★★ | 인챈트 종류 총람 |
| https://irowiki.org/wiki/Shadow_Equipment | ★★★ | 6슬롯, 정련 규칙, 인챈트 +7 조건, 세트 |
| https://irowiki.org/wiki/Costume_Stone_Enchants | ★★★ | 슬롯 배치, 50%, 실패 규칙, 3중 RNG |
| https://ro.gnjoy.com/guide/systeminfo/systemBeginner2.asp | ★★★ 그라비티 공식 | 카드 시스템, 더블/트리플/쿼드로플, 카드 색 |
| https://ro.gnjoy.com/guide/systeminfo/systemBeginner3.asp | ★★★ | 제련 재료 체계, +20, 고농축/고밀도 규칙 |
| https://ro.gnjoy.com/guide/runemidgarts/itemcardlist.asp | ★★★ | 한국어 카드 접사 |
| https://probability.gnjoy.com/RO/SMELT | ★★★ 공시 | 정련 성공률 전표 |
| https://probability.gnjoy.com/RO/CARD | ★★★ 공시 | 카드 분리 확률 2/12/25/100% |
| https://mro.gnjoy.com/update/detail?seq=188 | ★★★ 공식 공지 | 2016-08-31 카드 분리 개편 |
| https://renewal.playragnarok.com/gameguide/cards.aspx | ★★★ iRO 공식 | 카드별 접사·직업 세트 |
| https://ratemyserver.net/socket_enchant.php | ★★ (eAthena r14262) | 품목별 비용·확률 |
| https://ratemyserver.net/index.php?page=item_db&item_id=616 | ★★ | OCA 스크립트 |
| https://ragnarok.fandom.com/wiki/Job_Specific_Card_Combinations | ★★ | 직업 카드 세트 |
| https://forums.warpportal.com/index.php?/topic/171957-weapon-card-prefixsuffix-priority/ | ★★ | 접사 순서 규칙(유저 합의) |
| https://forums.warpportal.com/index.php?/topic/142633-mvp-cards-and-their-prices/ | ★ | MVP 카드 가격 변동성 |
| https://namu.wiki/w/라그나로크 온라인 | ★★ | 슬롯 장비 가격·리뉴얼 배경 |
| https://ro.inven.co.kr/dataninfo/system/view.php?class=1934&idx=26 | ★★ | Pre-renewal +10 상한, 파괴 규칙 |
| http://ragnarok-forever.blogspot.com/2010/05/card-removal.html | ★ (구 규칙, 비공식) | Wise Old Woman 비용·파괴 |

**미확인 (Ragnarok)**
- MVP 카드의 공식 드롭 확률(일반과 동일 0.01%로 통용되나 공시표 미확보).
- 쉐도우 장비의 카드 슬롯 유무(문서에 언급 없음 → 없는 것으로 추정).
- Hydra="Bloody", Skeleton Worker="Boned" 접사(커뮤니티 통용; fetch한 1차 표에는 미수록).
- 봇 비율 통계(Steam 증언만) 및 카드 시스템의 리니지·메이플 등 타 MMO 영향 계보(1차 자료 없음).
- iRO 현재 카드 드롭 0.05% 언급(Steam 스레드) — 공식 확인 안 됨, 본문은 iRO Wiki 0.01% 채택.
- 구 카드 제거(Wise Old Woman)의 kRO 공식 수치 — 블로그·rAthena 스크립트 기반이라 ★.

---

## 종합 — 본작 "2차 층" 결론 메모

- 두 게임의 공통 해법은 **"본체(장비 접사)는 랜덤, 부품(컴포넌트/카드)은 고정"**이다. 랜덤이 두 층에 다 있으면(TQ 완성 보너스, 라그 코스튬 스톤) 인벤·RNG 피로가 쌓여 결국 폐지·완화됐다.
- 본작에 2차 층이 필요하다면 형태는 **라그 카드의 "도감 연결 + 고정 효과 + 부위 고정"** 에 **Grim Dawn의 "스택 가능 + 양자택일 회수 + 저항(상태이상) 보충 역할"** 을 합친 한 층이면 충분하다. 그 층의 재료 공급을 확률 드롭이 아니라 **도감 처치 수 임계**로 바꾸는 것이 방치형 계약과 맞는다.
- 새 축(성좌·인챈트·쉐도우)은 넣지 않는다. 죄종 하나로 카드 효과·세트·슬롯 계단이 전부 표현되는지 먼저 검증하고, 안 되면 그때 논의.
