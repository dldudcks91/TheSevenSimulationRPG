# 장비 2차 개조 층 전수 조사 — Monster Hunter (World/Rise/Wilds) · Final Fantasy VII (원작/Remake/Rebirth)

> 상위: [socket_layer_reference.md](../socket_layer_reference.md) · 상태: **총조사 완료** (2026-08-25)
> 조사 범위: Monster Hunter World/Rise/Wilds 스킬 합산·장식품·호석·강화 / FF7 원작·Remake·Rebirth 마테리아 (+FFIX/FFX 대조)
> ⚠ **이 문서의 수치는 전부 참고작의 수치다.** 본작 SSOT가 아니며 `src/data/*.csv`로 옮기지 말 것

---

*조사일 2026-08-25. 웹 검색 24회 + 페이지 원문 fetch 성공 38건(시도 약 70건, 페이월·403 다수). 1차 자료(캡콤 공식 매뉴얼, fextralife/game8 위키, 개발자 인터뷰 원문 번역) 우선. 수치는 그대로 인용, 출처는 `[M#]`/`[F#]` 로 §9 목록에 연결.*

---

## 0. 조사 방법·배제 자료

- **1차 우선 순위**: 캡콤 공식 매뉴얼(MH Generations) → 위키류(fextralife MHW/MHRise/MHWilds, game8) → 개발자 인터뷰(IGN 인터뷰 전재, shmuplations 1997 FF7 개발자 인터뷰 번역) → 커뮤니티(Steam 토론, GameFAQs, neoseeker)는 "반응" 항목에만 사용.
- **접근 실패**: finalfantasy.fandom.com·monsterhunter.fandom.com(HTTP 402 페이월), monsterhunterwiki.org·kiranico·GameFAQs FAQ·strategywiki(403). FF7 마테리아 스탯 표는 rpgclassics 신전(shrine) 자료로 대체.
- **배제한 자료(AI 생성·저품질 의심, 인용하지 않음)**: lootlore.online, switchbladegaming.com, bossdown.com, monsterhunterhq.com, gamestunnel.com, esportsheaven.com(페이지 제목에 "hacked by" 표시), gamengadgets.com, digitalphablet.com, itemlevel.net, deltiasgaming.com, Quora 답변, allpoetry 칼럼. 검색 엔진 요약문 자체도 2차 자료로 취급해 위키 원문과 교차 확인된 것만 수치로 썼다.

---

# 게임 1 — Monster Hunter 시리즈

## 1. 시스템 한 장

### 1-1. 개조 층 목록 (World/Iceborne · Rise/Sunbreak · Wilds 통합)

| 층 이름 | 붙는 곳 | 획득처 | 효과 성격 | 제거·회수 | 합성/승급 경로 |
|---|---|---|---|---|---|
| **방어구 스킬** (5부위 각각 고유 스킬 N레벨) | 캐릭터 방어구 슬롯 5 | 몬스터 소재로 제작(확정) | 고정 | 방어구 교체로 즉시 회수 | 강화는 방어력만(스킬 불변) |
| **장식품 (Decoration/珠)** | 무기·방어구의 슬롯(Lv1~4, Wilds는 1~3) | World: 퀘스트 보상 페이스톤 감정(랜덤) / Rise: 제작(확정) / Wilds: 감정 오브(랜덤) + 멜딩 제작(단일 스킬 확정) | 고정(스킬 +1레벨 등) | **자유 탈착·재사용** (파괴 없음) | World 엘더멜더 재굴림, Wilds 멜딩 포인트로 재활용 |
| **호석 (Charm/Talisman/護石)** | 캐릭터 호석 슬롯 1 | World: 제작·강화(확정) / Rise: 멜딩(완전 랜덤) / Wilds: 제작(확정) + Ver1.021부터 감정 호석(랜덤) | World·Wilds제작: 고정 / Rise·Wilds감정: 랜덤(스킬·레벨·슬롯) | 자유 교체 | World: I→II→III 강화 / Rise: Rebirth 재멜딩 / Wilds: 감정 호석은 강화 불가, 멜딩 포인트로 환원 |
| **무기 강화 (Augment/Custom Upgrade)** | 무기 자체 | World: 스트림스톤 / Iceborne: 도피지 소재+RP | **고정 선택** | Iceborne: 되돌리기 가능(추가 슬롯 구매는 불가) | 희귀도별 슬롯 예산 |
| **사피지바 각성 능력** (Iceborne) | 사피 무기 5슬롯 | 사피 공성전 드라콜라이트 | 선택식 고정 | 자유 교체 | 각성 Lv23+ 외형 변화 |
| **백룡 스킬 (Rampage/Ramp-Up)** (Rise HR) | 무기 백룡 슬롯 1(백룡무기는 복수) | 스미시에서 선택 | 고정 선택 | 이전 스킬로 되돌리기 가능 | MR 승급 시 소멸 → 백룡 장식품으로 대체 |
| **백룡 장식품** (Sunbreak MR) | MR 무기 전용 백룡 슬롯 1(Lv1~3) | 스미시 제작(확정) | 고정 | 자유 탈착 | 무기종 제한 존재 |
| **기이 크래프트 — 무기** (Sunbreak) | 무기 기이 슬롯(최대 10) | 병기 소재+z | **고정 선택** | 불가(위키 기준) | 슬롯 예산 |
| **기이 크래프트 — 방어구** (Sunbreak) | 방어구 자체 | 병기 에센스 | **랜덤**(방어/내성/스킬±/슬롯±) | 이전 상태로 되돌리기·전체 리셋 가능 | 최대 7개 증강, TU별 안정/스킬+/슬롯+ 모드 |
| **아티아 무기** (Wilds) | 무기 자체 | 역전 몬스터 파츠(랜덤) 3개 조합 | 조합=플레이어 선택, **강화 보너스 5회=랜덤** | 해체하면 강화 소재 회수 | TU4 고그마 아티아: 랜덤 세트/그룹 스킬 재굴림 |
| **세트 보너스 / 그룹 스킬** | 방어구 조합 자체 | 같은 세트 2/4부위(World·Wilds) / 그룹 태그 3부위(Wilds) | 고정 | 부위 교체로 소멸 | — (Rise/Sunbreak은 미탑재로 파악) |

### 1-2. 세 작품 차이 표

| 항목 | World / Iceborne (2018/19) | Rise / Sunbreak (2021/22) | Wilds (2025) |
|---|---|---|---|
| 스킬 모델 | 스킬 레벨 합산(상한, 초과 무효) [M6] | 동일 [M13] | 동일 + **무기 스킬 / 방어구 스킬 분리**(공격계는 무기 고유) [M35] |
| 슬롯 레벨 | 1~3, Iceborne Lv4 추가(2스킬 복합) [M4] | 1~3 (Sunbreak Lv4: 미확인) | **1~3** [M24][M25] |
| 장식품 획득 | **랜덤**(페이스톤 감정, 엘더멜더 재굴림) [M4][M5] | **제작 확정** [M23 인터뷰 언급] | **혼합**: 퀘스트 감정 오브(랜덤) + 멜딩 제작(Lv1 90pt, HR100↑ Lv2 450pt) [M26][M27]; 단일 스킬은 제작 가능, 이중 스킬은 랜덤 전용(§7 참조) |
| 장식품 무기/방어구 구분 | 없음 | 백룡 장식품만 무기 전용 | **무기 장식품 / 방어구 장식품 완전 분리** [M24] |
| 호석 | 제작·강화(확정) [M23] | **멜딩 랜덤**(스킬·레벨·슬롯 전부) [M11][M12] | 제작 확정(단일 스킬 I→III) [M28] + Ver1.021(2025-08-12) 감정 호석 랜덤 추가 [M29] |
| 무기 개조 | 커스텀 강화(고정 선택, 슬롯 예산) [M7]; 사피 각성 5슬롯 [M10] | 백룡 스킬(HR, 고정 선택) → 백룡 장식품(MR) [M14][M15]; 기이 무기(고정) [M17] | 아티아 무기(파츠 랜덤·조합 선택·강화 랜덤) [M32][M33] |
| 방어구 개조 | 강화 한도 해제(방어력만) [M7] | **기이 방어구(랜덤, 마이너스 가능, 되돌리기 가능)** [M16][M17] | — (아티아 방어구 미확인) |
| 세트 효과 | 세트 보너스 2/3/4/5부위 + 시크릿 스킬(상한 해제) [M6] | **없음**(위키에 세트 보너스 항목 부재) [M13] | 세트 보너스 2/4부위 + **그룹 스킬 3부위(세트 불문)** [M34][M36] |
| 대표 RNG 논란 | Attack Jewel 0.27%(Sealed 전용) [M8] | 호석 "신호석" 1/60,000~1/10⁶ 급 [M18][M19] | 감정 호석 R8 3%, 원하는 롤 0.04% 주장 [M29][M31] |

## 2. 각 개조 아이템 상세

### 2-1. 스킬 합산 모델 — "장비가 스탯이 아니라 스킬 조각을 준다"

**구작(4G/Generations 이전) — 포인트 임계 모델** [M1][M2][M3]
- 캡콤 공식 매뉴얼: "Pieces of armor and Decorations have special points that activate skills. Accumulate the necessary points and a skill will become active."
- 임계값 예시(매뉴얼 그대로): Stun 계열 **15점 이상 = 기절 무효, 10~14 = 기절 반감, -10 이하 = 기절 시간 2배**; Sharpener **10점 이상 = 연마 속도 상승, -10 이하 = 연마 느려짐**. **-9~+9 구간은 아무 효과 없음.**
- 즉 방어구는 **음수 스킬 포인트**도 갖고, 호석·장식품은 "부족한 점수 보충 + 음수 상쇄" 용도로 명시: "Use Talismans or Decorations when you don't have enough Skill Points from your armor, or if you've got negative skills you wanna get rid of!"
- 장식품은 제작(확정), 호석은 "퀘스트 중 발견/보상 감정"(랜덤) [M2]. MH3U는 세이브 생성 시 **17개 호석 테이블 중 하나에 영구 고정**되는 "charm table" 문제가 있었다 — "table 10 are considered the best because that table is the only one with essential charms", 특정 테이블은 공격 스킬 호석 자체가 없어 "cursed" [M22].

**World 이후 — 스킬 레벨 모델** [M6][M13]
- "If players wear a helmet with level 1 Focus, and then also decide to equip a Chest Armor that provides Level 2 Focus, then they will receive the benefits as of having a Level 3 Focus equipped." [M6]
- 각 스킬에 상한(예: Attack Boost 7레벨). **초과분은 낭비**. Rise 위키도 동일: "All Skills have a maximum level, after which, additional levels in the skill will provide no further benefit." [M13]
- 음수 스킬 폐지 → "무효 구간(-9~+9)"이라는 구작 퍼즐이 사라지고, 모든 조각이 즉시 가치를 가짐. 대신 "상한 초과 낭비"가 새 퍼즐이 됨.
- Iceborne **시크릿 스킬**: 세트 보너스가 특정 스킬의 상한을 올림 — "Artillery: Skill Levels: 3 (5 with Artillery Secret)" [M6].
- **Wilds 변형**: 공격계 스킬(Attack Boost, Critical Eye, Critical Boost, 속성 공격)은 **무기에 내장**되고, 방어구·호석·장식품은 방어/생존/유틸 스킬을 준다 [M35]. 장식품도 무기용/방어구용으로 나뉨(§2-2).

### 2-2. 장식품 (Decoration / 珠)

**공통 규칙**
- 슬롯 레벨 ≥ 장식품 레벨이면 장착 가능: "Higher-level slots allow you to also use lower-level decorations, meaning a Level 4 slot can accommodate any decoration size." [M4] / Wilds: "Lower level Decorations can be placed in higher level slots, but higher-level Decorations cannot be placed in lower-level slots." [M25]
- 슬롯 레벨은 스킬 레벨과 무관: "Decoration Slot Level has no impact on your Hunter Rank or Skill level." [M24]
- 장식품은 파괴되지 않고 자유 탈착·재사용 (전 작품 공통).

**World / Iceborne — 랜덤 드롭** [M4][M5][M8][M9]
- 획득: 하이/마스터 랭크 퀘스트 보상 **페이스톤**을 감정 → 랜덤 장식품. 페이스톤별 카테고리(C 흔함 → B → A → S 희귀) 확률:
  - Mysterious(R4): C 85% / B 15%
  - Glowing(R5): C 65% / B 34% / A 1%
  - Worn(R6): C 10% / B 82% / A 6% / S 2%
  - Warped(R7): B 77% / A 18% / S 5%
  - Ancient / Carved / Sealed(Iceborne 상위) 추가 [M4]
- **Attack Jewel 논란**: "Attack Jewel has a drop rate of 0.27%, and ONLY drops from the rarest Feystone (Sealed Feystone)" [M8]; 커뮤니티 계측 "the drop chance of attack jewel 4 is around 0.1%" (Sealed 2개/사냥 가정) [M9]. 고정 지급은 "One is given by the Smithy after starting High Rank" + 위쳐 콜라보 퀘스트 1개 [M4].
- **엘더멜더 재굴림**(잉여 장식품 → 멜딩 포인트 → 의식): Spire Sorcery(Mysterious ×3, 1 Streamstone Shard + 12~36pt + 150~450RP), Coral Concoction(Glowing ×3, 24~72pt + 250~750RP), Strange Stream(Worn ×3, 36~108pt + 400~1200RP), Strange Stream+(Warped), Soul Stream I/II/III(Ancient/Carved/Sealed, 500~1800RP) [M5]. 블로그 기준 "엘더멜더는 Worn 페이스톤까지만 생산, A 6% / S 2%" [M8 — ★].
- Iceborne: **Lv4 슬롯 + 복합 장식품**(주스킬 1 + Evade Window/Constitution/Tool Specialist/Divine Blessing/Health Boost 등 보조 스킬) 및 "+ 장식품"(Attack Jewel+ Lv4 = Attack Boost +2) [M4].
- Attack Jewel 1 = Attack Boost +1(최대 7) [M4].

**Rise / Sunbreak — 제작 확정**
- 장식품 전량 스미시 제작(소재 확정). IGN 인터뷰 기사가 명시: Rise는 World와 정반대로 "random charms but craftable decorations" [M23].
- **백룡 장식품**(Sunbreak MR 무기 전용 슬롯 1개, Lv1~3): "Raging Jewel 3 grants the skill Hellion Mode. This skill was previously only found on the Raging Claws. But now, thanks to this Jewel it may be moved to any other Dual Blades." 무기종 제한 존재: "Defense Edge Jewel 1, can only be slotted in to a Great Sword or a Charge Blade" [M15].

**Wilds — 혼합** [M24][M25][M26][M27][M23]
- 챕터 2-4 "Long-forgotten Flame" 클리어 후 감정 아이템 해금; 고랭크(3-5 이후) 퀘스트 보상으로 **오브**(Mystery/Glowing/Ancient)가 드롭 → 종료 시 자동 감정 → 랜덤 장식품 [M24].
- **무기/방어구 장식품 분리**: "Decorations that buff your Defense, Elemental Resistances, and damage negation can only be equipped on Armor Decorations. … any jewels or decorations that affect your Attack Power and weapon properties are suitable for Weapon Decorations only." 아이콘 검/투구로 구분 [M24].
- **멜딩(Vio, 수자)**: 잉여 장식품 → 포인트(Lv1 1pt / Lv2 3pt / Lv3 6pt) [M27]. 소비: Mystery Orb 4pt, Glowing Orb 10pt, Ancient Orb 검 150pt / 방어구 90pt [M26][M27]. **지정 장식품 멜딩**: Lv1 장식품 90pt(Attack Jewel, Guardian Jewel, Expert Jewel 등), HR100↑에서 Lv2 450pt [M26].
- 감독 Tokuda 발언: "you can make single-skill decorations through something like alchemy. So in [Wilds], players won't have the issue of never being able to get a specific skill." [M23]. 이중 스킬 장식품은 랜덤 전용이라는 것이 커뮤니티·가이드의 공통 설명(위키 원문으로는 미확인 → §9 미확인).

### 2-3. 호석 (Charm / Talisman / 護石)

**World / Iceborne — 제작·강화(확정)**: IGN 인터뷰 기사 기준 World는 제작 호석, Rise는 랜덤 호석 [M23]. (I→II→III 강화 구조는 기억 기반, 원문 fetch 실패 → 미확인 표기.)

**Rise / Sunbreak — 멜딩(완전 랜덤)** [M11][M12]
- "Talismans are obtained by using the Melding Pot" — 제작·강화 불가. 1개 장착.
- 굴림 요소: 스킬 최대 2종(스킬 하나당 최대 Lv3, 위키 예시 "3 Attack Boost + 2 Weakness Exploit" = 합 5레벨), 슬롯 "1-3 slots with any combination of slot levels 1-3" 전부 랜덤 [M11][M12].
- 희귀도별 이름 고정(R4 = Deluge Talisman, R5 = Windstorm Talisman …) [M12].
- 멜딩 종류(기본): Reflecting Pool(스킬 1종 지정, 100pt, 1개), Haze(지정, 100pt), Moonbow(지정, 최대 3개), Wisp of Mystery(**무지정 랜덤**, 최대 5개 — "in exchange for this lack of choice, talismans created have a higher chance of having multiple decoration slots"), Rebirth(R7 이하 호석 재활용, 1000pt) [M11].
- Sunbreak 추가: Anima(랜덤, 200pt), **Aurora(Update 3+, 지정 스킬 100% 보장, 최대 3개, 200pt, Attack Boost 등 60+종 지정 가능)**, **Cyclus(Update 5, 기이 소재, 지정 100%, 4페이지 최다 풀, 1200pt)**, Vigor(랜덤, 병기 소재, 300pt) [M11].
- 커뮤니티 확률 인용: "Back before sunbreak release, the odds of getting a CB2 with any second skill is like 1/60000" [M18], "1:390 000 000 000" [M19], "1/416.000.000.000 (Billion) chance to get a maxed out charm" [M20]. 반론: Aurora 이후 "you can get L3 S rank skills like AB3 CE3 etc. now within 5 minutes" [M18].

**Wilds — 제작 회귀 + 랜덤 재도입** [M28][M29][M30][M31]
- 제작: Gemma "Forge/Upgrade Talismans". **호석 1개 = 스킬 1종**, Lv1 제작 후 Lv2→Lv3 강화(대부분 Lv3에서 스킬 만렙, 일부 Lv5). 소재+제니 [M28]. Kotaku: 제작과 강화 메뉴가 분리돼 있어 "Talismans Feel Convoluted To Upgrade" [M30].
- **감정 호석(Ver 1.021, 2025-08-12)**: 9★ 퀘스트(HR100) 보상 Glowing Stone → 랜덤 호석. 희귀도 5~8(Unknown ≈59% / Historical ≈27% / Secret ≈11% / Golden Age ≈3%). "The first skill will always be a Weapon Skill", 최대 3스킬, R8은 "Always have a 1-slot for Weapon Decorations" + 방어구 슬롯 최대 2. **강화 불가**, 잉여는 Vio에서 포인트(R5 1 / R6 3 / R7 6 / R8 10pt)로 환원 [M28][M29][M27].
- 커뮤니티: 원하는 R7 롤 "a .04 percent chance", "Cluttered inventory mixing crafted and dropped talismans", 이전작의 등급/스킬 지정 멜딩이 없어 통제권 상실 [M31]. 반론: "the intent is that you arent going to be guaranteed to get what you want. It means you get to experiment" [M31].

### 2-4. 무기·방어구 개조 — 확정 vs 랜덤

| 시스템 | 확정/랜덤 | 규칙(수치) |
|---|---|---|
| **World 커스텀 강화** [M7] | 확정 선택 | 희귀도 6/7/8 = 강화 3/2/1회. 옵션: Attack **+5 진raw**, Affinity **첫 +10%, 이후 +5%**, Defense +10, Slot(슬롯 추가), Health Regen(피해 비례 회복). 스트림스톤 7종(2무기종씩) |
| **Iceborne MR 강화** [M7] | 확정 선택 + 슬롯 예산 | R10 5슬롯(→10), R11 4(→8), R12 3(→6). 옵션 비용 Attack/Affinity/Element 2~3슬롯, Defense/Health 1~3, 장식품 슬롯 1~3. "Extra Augmentation Slots (cannot be rolled back): 600~1400 RP". 라장 업데이트 후 커스텀 강화 6회 |
| **Iceborne 방어구 강화** [M7] | 확정 | 강화 레벨 상한 해제(방어력만) |
| **사피지바 각성** [M10] | 확정 선택(5슬롯 자유 교체) | 각성 슬롯 5, Dracolite로 교체; 공격/예리/회심/속성 각 "최대 tier VI 1개 + tier V 4개"; 예리 40→최대 120(80 초과분 보라); 타 몬스터 세트 스킬(은화룡·테오) 부여; 각성 Lv23+에서 외형 변화 |
| **Rise 백룡 스킬(HR)** [M14][M39] | 확정 선택 | 일반 무기 백룡 슬롯 1(백룡 무기는 복수), Defender Ticket + 소재. 이전 스킬로 되돌리기 가능("4th choice shows your previous Rampage Skill"). 강화 시 유지. **MR 승급 시 소멸** → 백룡 장식품 |
| **Sunbreak 기이 무기** [M17] | 확정 선택 | 20,000z + 병기 소재 10pt 해금. Attack Lv1 +5 ~ Lv4 +20, Affinity +5% ~ Lv3 +15%, Sharpness +10 ~ Lv4 +50, 속성 최대 8단, 상태 4단, 포격 2단, 백룡 슬롯 2단. 기이 슬롯 최대 10 |
| **Sunbreak 기이 방어구** [M16][M17][M20] | **랜덤** | R8/9/10 방어구만(20/40/80pt). 에센스 10/20/40/80/160pt. 결과: 방어±, 내성±, **슬롯 수/레벨±**, **스킬 추가/삭제/±레벨**("some stats will go beyond 0 and have a negative effect"). 최대 7증강. 결과를 보고 **적용/되돌리기 선택**, 전체 리셋 가능(환불 없음). TU3 Stability(스킬 불변, 방어 大)·Skills+(연구 Lv121), TU4 +1슬롯, 보너스 업데이트 Slots+(연구 Lv221, 슬롯 보장) |
| **Wilds 아티아** [M32][M33] | 파츠 드롭 랜덤 → 조합 선택 → **강화 랜덤** | 파츠 Blade/Tube/Disc/Device(역전 몬스터). R6 Damaged(②②②, 청), R7 Rusted(②②②, 백), R8 Ancient(**③③③**, 백). 무기종별 조합(대검 Blade,Blade,Tube 등). **같은 속성 3개 = 속성 부여(+20~80)**, 혼합 시 무속성. 제작 시 Attack +5 또는 Affinity +5% 고유 보너스. 강화 Lv1~5 각 1회 랜덤: Attack +5(최대 ×5), Affinity +5%(×3), Element +20~80(×4), Sharpness +30(IG +20)(×2), 탄수 +1(보우건, ×2). 해체 시 강화 소재 회수 → 재굴림. TU4 고그마 아티아: "one random Set Bonus Skill and one random Group Skill" 재굴림 가능 |

### 2-5. 세트 스킬 / 시리즈·그룹 스킬

- **World/Iceborne 세트 보너스** [M6]: 같은 몬스터 세트(α/β 호환) 부위 수로 발동. 예: Nergigante Hunger 3부위 → Hasten Recovery; Teostra Technique → Master's Touch; Legiana Favor 2부위 Good Luck → 4부위 Bow Charge Plus. 시크릿 스킬로 상한 해제.
- **Rise/Sunbreak**: fextralife Rise 스킬 문서에 세트 보너스 항목이 없음 [M13] — 미탑재로 파악(직접 명시 문장은 미확보 → §9).
- **Wilds** [M34][M36]: 세트 보너스 = 같은 세트 **2/4부위**; **그룹 스킬 = 세트 불문 같은 그룹 태그 3부위, 1레벨만** — "Lord's Fury: Jin Dahaad, Rey Dau, Nu Udra, Uth Duna 세트 어느 부위든". 5부위이므로 **그룹 스킬은 동시에 1개만** 활성 가능(3+3>5).

### 2-6. 빌드 조립 경험

- 구조: **슬롯 총량 = 예산, 스킬 레벨 = 비용, 상한 = 낭비 경계**. 방어구 5 + 호석 1로 큰 뼈대를 잡고 장식품으로 빈칸을 메운다. Wilds는 무기 스킬/방어구 스킬 분리로 "공격은 무기가, 생존은 방어구가" 두 개의 독립 예산이 됨 [M35].
- **시뮬레이터 문화**: Athena's Armor Set Search(ASS) — MH3U/4U/FU/Gen/GU/World 지원, "원하는 스킬을 고르면 가능한 세트 조합을 전부 보여주는" 툴, 특히 "older games with more complex skill systems involving negative points and activation thresholds"에서 필수 [M37]. 이 툴이 존재한다는 사실 자체가 "장비 = 스킬 조각" 문법이 조합 폭발을 만든다는 증거.

## 3. 소켓/슬롯 규칙

- **어디에 몇 개**: 무기 최대 3슬롯, 방어구 부위당 최대 3슬롯(World Lv4 포함), 호석 0~3슬롯(Rise/Wilds 랜덤 호석). Wilds는 여기에 무기 슬롯 = 무기 장식품 전용, 방어구 슬롯 = 방어구 장식품 전용 [M24].
- **어떻게 뚫나**: 슬롯은 장비 고유값. 확장 수단은 World/Iceborne 강화의 "Slot Upgrade"(강화 예산 소모) [M7], Sunbreak 기이 방어구의 랜덤 슬롯 변동/Slots+ 보장 [M17], Sunbreak 기이 무기의 백룡 슬롯 승급 [M17]. 아티아 R8은 ③③③ 고정 [M33].
- **영구성**: 장식품은 영구 재사용. 강화는 대체로 되돌리기 가능하나 "Extra Augmentation Slots (cannot be rolled back)" [M7], 기이 방어구 리셋은 환불 없음 [M17].
- **레벨 매칭**: 큰 슬롯에 작은 장식품 OK, 역은 불가 (전 작품 공통).

## 4. 트레이드오프·제약

- **슬롯 레벨 희소성**: Lv3(Iceborne Lv4) 슬롯이 적어 고레벨 장식품을 어디에 꽂을지가 퍼즐. 복합 장식품(Iceborne Lv4)은 "주스킬 + 보조스킬"이라 원치 않는 보조가 따라옴.
- **스킬 상한 낭비**: 방어구가 주는 스킬이 상한을 넘으면 그 부위의 가치가 깎임 → 세트를 섞는 이유.
- **Wilds 예산 이원화**: 공격 스킬은 무기 슬롯에서만 → 방어구를 아무리 좋게 짜도 공격 상한은 무기가 정함 [M24][M35].
- **강화 예산**: 희귀도가 높을수록 강화 횟수/슬롯이 적음(World R8 = 1회, Iceborne R12 = 3슬롯) — "강한 무기일수록 개조 여지가 적다"는 역예산 [M7].
- **랜덤 개조의 마이너스**: 기이 방어구는 스킬 -1·슬롯 감소 같은 역효과가 나오고 플레이어가 적용 여부를 결정 — "I already got a roll with a deco slot but it had -1 on one of the armor skills" [M20].
- **인벤/가치 혼재**: Wilds 감정 호석은 제작 호석과 같은 목록에 쌓여 "Cluttered inventory" [M31].
- **파괴 없음**: 장식품·호석은 파괴되지 않는다. 대신 **잉여를 포인트로 태워 재굴림**하는 싱크가 있다(§5).

## 5. 경제

- **거래 없음**(싱글/협동, 아이템 거래 불가). 따라서 이 층의 경제는 **"잉여 → 포인트 → 재굴림"의 폐쇄 루프**로 설계됨: World 엘더멜더(장식품 → 멜딩 포인트 + 스트림스톤 + RP) [M5], Rise 멜딩(카무라 포인트 100~1200) [M11], Wilds 멜딩 포인트(장식품 Lv1/2/3 = 1/3/6pt, 호석 R5~8 = 1/3/6/10pt; 소비 4~450pt) [M26][M27].
- 랜덤 층은 **시간 싱크**(플레이 지속 장치)이고, 확정 층은 **소재 싱크**(몬스터 사냥 유도). Wilds는 "단일 스킬 = 확정 소재 싱크 / 이중 스킬·감정 호석 = 시간 싱크"로 두 싱크를 분리했다.
- 강화는 **RP/제니 + 특정 지역 소재**(도피지, 병기 소재)로 엔드게임 지역 순환을 만든다 [M7][M17].

## 6. 설계 원리 — 왜 작동하는가

- **단일 통화**: 장비가 주는 것이 "스킬 레벨" 하나뿐이라 모든 조각이 같은 자로 비교된다. 방어력·슬롯을 제외하면 스탯이 없어 "숫자로 읽히는 최적화"가 성립.
- **상한이 퍼즐을 만든다**: 초과 무효 규칙 때문에 "딱 맞게" 채우는 것이 최적이고, 이것이 방어구 혼합·장식품 교체 동기를 지속 생성.
- **슬롯 = 유연성 예산**: 장비 고유 스킬은 고정, 슬롯은 가변 → 같은 방어구로 여러 빌드. 큰 슬롯에 작은 장식품이 들어가므로 예산이 "낭비 가능하지만 막히지 않음".
- **랜덤 층을 딱 하나만 둔다(의도)**: World = 장식품 랜덤/호석 확정, Rise = 장식품 확정/호석 랜덤. 두 층을 동시에 랜덤으로 두지 않았다(Sunbreak 기이+랜덤 호석이 예외였고 비판받음, §7).
- **되돌리기**: Rise 백룡 스킬 복귀, Iceborne 강화 롤백, 기이 방어구 "적용/취소" — 랜덤을 도입할 때 손실 회피를 완화하는 장치.
- **세트 vs 그룹**: Wilds 그룹 스킬은 "같은 태그 3부위"로 세트 강제를 풀어 조합 폭을 넓히면서 "한 번에 하나"라는 자연 상한(5부위)을 둠.

## 7. 알려진 문제·비판 → 바뀐 것

| 문제 | 근거 | 바뀐 것 |
|---|---|---|
| MH3U 호석 테이블 세이브 고정 | 17테이블, "table 10… only one with essential charms" [M22] | 이후 작품에서 테이블 고정 폐지(원문 미확인) |
| World 장식품 극악 RNG | Attack Jewel 0.27% Sealed 전용 [M8]; 커뮤니티 "go for crits instead, attack should be the last thing to slot in" [M9]; **Wilds 총감독 Fujioka 본인** "I never ended up getting it once. My Shield Jewel 2… I ended up finishing the game without having completed my build" [M23]; 모드로 장식품 치트 만연 [M23] | Rise: 장식품 전량 제작. Wilds: "single-skill decorations through something like alchemy" [M23] |
| Rise 호석 RNG | 1/60,000~1/10¹¹ 급 계산 [M18][M19][M20]; 참 에디터(charm editor) 모드 확산, "if you make a good game, you don't need a stupid RNG grind" [M19] | Sunbreak Aurora(지정 100%)·Cyclus 추가 [M11]; Wilds 호석 제작 회귀 [M28] |
| Sunbreak 기이 방어구 | Automaton: "Qurious Crafting failures draw attention on social media" [M21]; "As if having impossible odds to get the charms you want wasn't enough, now there are even more layers of RNG added on top" / "Why not let us chose what we want on our armour?" [M20]. 옹호: "If they didnt made it random then the system would be pointless as everyone would just put +wex, atk, ce on their armor" [M20] | TU3 Stability/Skills+, TU4 +1슬롯, Slots+ 보장 모드 [M17] — 랜덤 폭을 좁히는 옵션을 단계적으로 추가 |
| Wilds 감정 호석 재도입 | "the way to applied them was an absolute joke", 0.04%, 제작 호석과 혼재, 지정 멜딩 부재 [M31] | (조사 시점 기준 후속 조치 미확인) |
| Wilds 호석 제작 UI | Kotaku: 제작/강화 메뉴 분리, 정보 부족 [M30] | — |
| Rise 백룡 스킬 MR 소멸 | HR 투자분이 MR에서 사라짐 [M14][M39] | 백룡 장식품으로 이식(무기 귀속 → 탈착식) [M15] |

**시계열 요약**: 랜덤의 위치가 **장식품(World) → 호석(Rise) → 방어구 증강(Sunbreak) → 엔드게임 부가층(Wilds 아티아·감정 호석)**으로 이동. 방향은 일관되게 "빌드 필수 조각은 확정 바닥을 깔고, 랜덤은 그 위의 '+α'로 밀어냄".

## 8. 본작 관점 메모 (Monster Hunter)

**가져올 만한 것**
1. **"스킬 조각 합산 + 상한" 문법을 스킬 카드에 적용** — 본작 스킬 트리 3탭이 노드형이라면, 장비/카드가 "스킬 X +1레벨" 조각을 주고 트리 투자와 **합산되어 상한에서 잘리는** 구조는 접사 풀을 건드리지 않고 2차 층을 만든다. 접사(27종 전투 능력치) = 숫자, 카드/조각 = 스킬 레벨 — 두 통화를 섞지 않는 것이 핵심(MH가 방어력 외 스탯을 장비에 두지 않는 이유).
2. **확정 바닥 + 랜덤 '+판'** — Wilds 방식: 단일 스킬 조각은 크래프트(낙인·골드)로 100% 획득, "이중 스킬/+2 레벨" 판만 드롭 전용 체이스. Tokuda의 "특정 스킬을 영영 못 얻는 상황을 없앤다"가 방치형 계약("자리 비워도 안전")과 정확히 맞는다.
3. **잉여 → 포인트 → 재굴림 싱크** — 거래 없는 싱글이라는 조건이 MH와 같다. 본작 "분해"를 멜딩 포인트로 확장하면 루팅 리포트의 잉여 조각이 그대로 연료가 된다(비전투 = 전투 파밍 연료 원칙).
4. **그룹 스킬(세트 불문 태그 3개)** — 보류 중인 죄종 세트 3/6/9의 대안. "같은 죄종 태그 3부위 = 그룹 효과 1개, 동시 1개만"으로 줄이면 접사 죄종 = 세트포인트 구조를 통째로 살리지 않고도 죄종 축을 장비에 남길 수 있다. 상한이 자연히 걸리는지(부위 8종에서 3개 조건이면 2개 동시 가능) 검증 필요.
5. **되돌리기·적용 선택** — 랜덤 강화를 넣는다면 Sunbreak의 "결과 보고 적용/취소"가 최소 안전장치.

**피해야 할 것**
1. **시드 고정 호석 테이블(MH3U)** — 본작은 세이브에 마스터 시드를 두는 구조다. 체이스 아이템의 굴림 스트림이 세이브 시드에서 결정론적으로 파생되면 "이 세이브는 영원히 X를 못 얻는" MH3U 문제가 재현된다. 드롭 스트림은 시드에서 파생하되 **진행 상태(원정 횟수 등)로 섞어** 테이블 고정을 막을 것.
2. **랜덤-위-랜덤** — Sunbreak(랜덤 호석 + 랜덤 방어구 증강)이 가장 비판받았다. 본작은 이미 접사 굴림(레어)이 랜덤이므로 2차 층까지 랜덤이면 "통제 가능성의 계단"이 무너진다.
3. **0.x% 단일 조각** — World Attack Jewel. 빌드 필수 조각에 극저확률을 두면 총감독조차 빌드를 못 완성했다.
4. **투자분 소멸(Rise 백룡 → MR)** — 챕터 승급 시 카드/조각이 무효화되는 설계 금지. 탈착식으로.
5. **두 층이 같은 것을 준다** — 장식품이 접사와 같은 "공격력 +N"을 주면 접사 풀 희석과 같다. Wilds가 공격계를 무기에만 묶은 이유.

---

# 게임 2 — Final Fantasy VII

## 1. 시스템 한 장

| 층 이름 | 붙는 곳 | 획득처 | 효과 성격 | 제거·회수 | 합성/승급 경로 |
|---|---|---|---|---|---|
| **마테리아 (원작 1997)** | 무기·방어구의 소켓(단일/연결) | 상점 구매·필드 습득·보스 보상 | 성장(AP → Lv1~5 → MASTER), 장착 시 **스탯 ±** 고정 | 자유 탈착, 파티원 간 **완전 이동** | 마스터 시 **분열(Lv1 복제 생성)**; 종류별 전 마테리아 마스터 → Huge Materia에서 **마스터 마테리아** 교환 [F3] |
| **지원 마테리아(연결)** | 연결 소켓의 짝 | 동일 | 짝 마테리아를 변형(All/Elemental/Added Effect/MP Turbo…) | 동일 | 동일 |
| **장비의 소켓 형태·성장률** | 무기·방어구 자체 | 구매·드롭 | 고정: 소켓 수, 연결 여부, 성장률 Normal/Double/Triple/None [F5] | 장비 교체 | 없음(장비는 강화 불가) |
| **마테리아 (Remake 2020)** | 무기·방어구(+액세서리 슬롯 없음) | 구매·습득 | 성장(AP), **마스터 시 분열 없음** [F10] | 자유 탈착·공유 | 무기 강화(SP 코어)로 **슬롯 추가/연결** [F12] |
| **무기 강화 (Remake)** | 무기별 코어/서브코어 | SP(레벨업·매뉴스크립트) | 고정 선택(공격력·패시브·슬롯) | 리셋 가능 | 무기 Lv6에서 전 무기 6슬롯(연결 3쌍) [F12] |
| **마테리아 (Rebirth 2024)** | 무기·방어구(최대 6슬롯) | 동일 | 성장(AP) | 자유 탈착·공유 | 슬롯은 **무기 레벨(캐릭터 공유 SP)**로 자동 확장 [F13][F14] |
| **무기 스킬 / 폴리오 (Rebirth)** | 캐릭터(폴리오) + 무기 스킬 슬롯 | SP | 고정 | 스킬 슬롯 교체 | 무기 레벨 상승 시 슬롯 증가 [F14] |

### 1-1. 원작 vs Remake vs Rebirth 변경점 표

| 항목 | 원작(1997) | Remake(2020) | Rebirth(2024) |
|---|---|---|---|
| 5색 분류 | 마법(녹)/지원(청)/커맨드(황)/독립(자)/소환(적) [F8] | 동일 [F11] | 독립 → **"Complete Materia"(자)**로 개칭; 소환은 무기 전용 슬롯 [F15] |
| 소켓 | 무기/방어구별 고정, 단일/연결 | 무기: 강화로 추가·연결, Lv6 = 6슬롯(3쌍) [F12] | 무기 최대 6(6×1 또는 3×2), 무기 레벨로 자동 확장, 구매 없음 [F13][F16] |
| 연결 슬롯 | 지원 마테리아 결합 | 유지("dual slot") [F11]; **소환은 청 마테리아와 결합 불가** [F10] | 유지; 같은 마테리아 여러 개를 각기 다른 지원과 연결해도 전부 작동 [F16] |
| All | 있음 | **Magnify로 개명** [F10] | Magnify — Lv1 **위력 -60%**, 레벨업으로 페널티 감소 [F22] |
| 성장률 | Normal/Double/Triple/None(장비 고유) [F5] | (미확인) | 위키·가이드에 성장률 배수 언급 없음(미확인) |
| 마스터 분열 | 있음 [F3] | **없음** — "You won't get a second, new Materia once you max one out anymore" [F10] | (미확인, Remake와 동일 추정) |
| 스탯 페널티 | 있음(§2-3) | 미확인 | 미확인(저품질 출처만 "없음") |
| 무기 성장 | 없음(장비는 고정) | SP 코어/서브코어 [F12] | 캐릭터 공유 무기 레벨 + 폴리오 [F13][F14] |

## 2. 각 개조 아이템 상세 (원작 기준)

### 2-1. 5색 분류와 역할 [F8][F3][F11]
- **마법(녹)**: 공격/회복 마법. 레벨업으로 상위 주문 해금(예: Restore Lv2 2,500AP, Lv4 40,000AP [F4]).
- **지원(청)**: 연결 슬롯에서 짝을 변형 — All(전체화), Elemental(속성 부여/내성), Added Effect(상태이상 부여/내성), MP Turbo, HP/MP Absorb, Added Cut, Steal as well, Counter, Sneak Attack, Final Attack, Quadra Magic, Magic Counter (목록은 일반 지식; 개별 수치 미확인).
- **커맨드(황)**: Steal, Throw, Enemy Skill, Mime, W-Item 등 새 커맨드.
- **독립(자)**: HP Plus, MP Plus, Counter Attack, Cover 등 스탯·패시브.
- **소환(적)**: 소환수. 사용 횟수가 레벨로 증가.

### 2-2. 소켓·연결·성장률 — 장비 가치의 핵심 [F5]
- 무기·방어구 각각 소켓 0~8, 단일 또는 **연결(linked)** 형태.
- **성장률**: Normal(Buster Sword — "if you earn 20 AP at the end of the battle, each Materia equipped to the Buster Sword will receive 20 AP"), **Double**(Force Stealer, Rune Blade, W Machine Gun, Drill Arm, Motor Drive, Platinum Fist, Powersoul, Wizard Staff, Wizer Staff, Magic Comb, Plus Barrette, Wind Slash, Twin Viper, Rising Sun, White/Black M-phone, Peacemaker, Buntline, Viper Halberd, Javelin), **Triple**(Apocalypse(Cloud), Scimitar(Cid) 단 2종), **None**(궁극 무기 전부).
- 즉 "최강 무기 = 성장 0"이라는 명시적 트레이드오프. 궁극 무기는 공격력 대신 마테리아 육성을 포기시킨다.

### 2-3. 스탯 페널티/보정 [F4][F6]
- rpgclassics 마법 마테리아 표(장착 시 고정 변동, 레벨 무관):
  - **패턴 A**(Fire, Ice, Lightning, Earth, Poison, Heal, Seal, Mystify, Transform, Exit, Gravity): **Str -1, Mag +1, MaxHP -2%, MaxMP +2%**
  - **패턴 B**(Barrier, Revive, Time, Destruct, Comet): Str ±2, Vit -1, Mag +2, MagDef +1, **MaxHP -5%, MaxMP +5%** (원문이 "+2 Strength"로 표기 — 다른 패턴과 모순되므로 전사 오류 의심, -2가 맞을 가능성 큼 → 미확인)
  - **패턴 C**(Contain, FullCure, Shield, Ultima): **Str -4, Vit -2, Mag +4, MagDef +2, MaxHP -10%, MaxMP +10%**
- jegged: Restore = "MaxHP (-02%), Strength (-01), MaxMP (+02%), and Magic (+01)" [F6]. 지침: "Avoid equipping unused Materia to prevent detrimental stat changes."
- 요약 규칙: **강한 마법일수록 HP/Str 페널티가 커진다** — 소켓템이 "무료"가 아니라 물리 캐릭터의 체력을 깎는 비용을 동반. 소환 마테리아는 "Magic and Summon Materia lowers the party member's HP and Strength, but they gain MP and Magic Power" (개별 수치 미확인).

### 2-4. 성장·분열·경제 [F3][F5][F7]
- AP로 Lv1→…→MASTER. "When you master a materia you get a second materia of the same type on its first level." [F3]
- 판매가는 AP(레벨) 기반. 커뮤니티: "Level up 'All' to master and they sell for 1.4m GIL. Mastered All materia have the highest gil to AP ratio (40 gil to 1 AP)" [F7]. 마스터 All(요구 AP 낮음, Double/Triple 무기로 빠름) → 1개 팔고 분열본으로 반복 = **무한 길 파밍**.
- **마스터 마테리아**: 한 종류의 모든 마테리아를 마스터해 Huge Materia에서 교환(녹=마법, 적=소환, 황=지원… 원문은 "Yellow for Support(7종만)"이라 표기 — 실제로는 커맨드 계열; 원문 오기 가능성) 또는 Earth Harp를 Kalm 상인에게. "The Master Materia allows you to use any spell you traded in for it just by equipping that one materia. Master Materia have no status effect" [F3] — 즉 마스터 마테리아는 **스탯 페널티 0**이 보상.

### 2-5. 캐릭터에 속하지 않는다 [F1][F2]
- Kitase(1997): "the materia system, where any weapon and armor can be equipped with any materia. Accordingly we knew the battles wouldn't be about characters with individual, innate skills, but rather that combat would change depending on the way materia was used." [F1]
- Sakaguchi 제안 배경(Wikipedia): "battles no longer revolved around characters with innate skills and roles in battle, as Materia could be reconfigured between battles." [F2]
- Nomura: "I also wanted to add limit breaks as a way to bring out the individual, innate personalities of each character" [F1] — **캐릭터 정체성은 리미트 브레이크(+ 무기 성장률·기본 스탯)로만 남김.**
- 명칭: 원안 "Sphere System"(Nomura) → Sakaguchi가 초등학생도 알 "Materia"로 [F9].

### 2-6. Remake / Rebirth 변경 [F10][F11][F12][F13][F14][F15][F16][F22]
- **Remake**: 5색 유지, 무기/방어구 슬롯 + 듀얼 슬롯; All → Magnify; Elemental은 **게임 내 1개**(6장); 소환은 청 마테리아와 결합 불가; **마스터 분열 삭제**. 무기 강화: 코어 1 + 서브코어 최대 5, 노드마다 SP, "New Materia Slot" 노드가 슬롯 추가 또는 **기존 두 슬롯 연결**, Lv6에서 전 무기 6슬롯·연결 3쌍 [F12]. 무기 어빌리티는 숙련도로 영구 습득(무기 교체해도 유지) — 즉 "무기가 캐릭터에게 스킬을 가르치는" FFIX식 요소가 들어옴.
- **Rebirth**: 코어 폐지 — "most of the old perks and additions were folded into the Folio system" [F13]; 무기 레벨은 캐릭터당 하나(SP 단일 풀), 모든 무기가 같은 레벨 [F13][F14]; 무기 레벨로 무기 스킬(장착식)·스탯·**마테리아 슬롯 자동 증가**("Materia slots are at a premium") [F14]; 최대 6슬롯(6×1 또는 3×2) [F13]; Magnify Lv1 위력 -60% → 레벨업으로 감소 [F22]; 소환 마테리아 무기 전용 [F15].

### 2-7. 대조 — FFIX / FFX (1문단씩)
- **FFIX** [F18][F19]: 스킬은 장비에 붙어 있고, 장비를 낀 채 AP를 모으면 **영구 습득**("Once the bar completely fills up, the character will no longer need to equip anything to access that specific Ability"). 지원 어빌리티는 캐릭터의 **마법석(Magic Stone)** 예산 안에서 장착(레벨업으로 증가). 즉 "장비 = 교사, 캐릭터 = 학습자, 석 = 슬롯 예산" — 마테리아와 반대로 스킬이 **캐릭터에 귀속**된다. 같은 어빌리티를 가르치는 장비를 여러 개 끼면 습득 가속.
- **FFX** [F20][F21]: 무기·방어구에 **1~4 오토어빌리티 슬롯**, 빈 슬롯에 아이템 N개로 어빌리티를 **영구 부여**(제거 불가). "You can purchase empty three and four-slot weapons and armor" — 빈 슬롯 장비가 더 비싸게 팔림. 무기용/방어구용 어빌리티 풀 분리(Wilds 무기/방어구 장식품 분리와 동형). 즉 "소켓 = 영구 각인"의 대표 사례로 FF7(탈착식)과 정반대.

## 3. 소켓/슬롯 규칙 (원작)
- 무기·방어구 각각 고정 소켓(0~8), 단일/연결 형태·성장률이 장비 고유. 뚫기/확장 **불가**(장비는 강화 없음). 액세서리에는 소켓 없음.
- 연결 슬롯: "any two materia can go in those slots, but a Support materia must be one of them for a combo effect, with the other slot filled with either a Magic, Summon, or Command materia."
- Remake는 강화로 소켓 추가/연결, Rebirth는 무기 레벨로 자동 확장(§2-6).

## 4. 트레이드오프·제약
- **스탯 페널티**: 마법/소환 장착 = HP/Str 감소(§2-3). 물리 캐릭터에 회복 마테리아를 끼우는 것조차 HP -2%.
- **성장률 vs 공격력**: 궁극 무기 = 성장 없음; Triple 성장 무기 2종만 [F5].
- **소켓 수 vs 연결**: 같은 소켓 수라도 연결 쌍이 있어야 지원 마테리아가 산다.
- **AP 배분**: 성장은 마테리아에 붙으므로 "누가 끼느냐"가 아니라 "어느 무기에 끼느냐"가 육성 속도를 결정.
- **소지 한도**: 최대 200개(기억 기반, 원문 미확인 → §9).
- **Remake의 제약**: Elemental 1개, 소환-지원 결합 불가, 분열 없음 → 희소성이 "굴림"이 아니라 "개수 고정"으로 관리됨.

## 5. 경제
- **분열 = 무한 파우셋**: 마스터 시 복제 → 잉여를 판매(All 1,400,000길) → 길 경제 붕괴급 파밍 루트 [F7]. 싱글 게임이라 허용된 설계이지만, 길이 후반에 의미를 잃는 원인.
- **마테리아 = 자산**: 판매가가 AP에 비례하므로 육성 자체가 화폐 가치.
- Remake/Rebirth: 분열 삭제로 파우셋 차단, 대신 SP(캐릭터 진행)로 슬롯을 열어 "슬롯이 진행 보상"이 됨.

## 6. 설계 원리 — 왜 작동하는가
- **그릇/내용물 분리**: 캐릭터·장비 = 그릇(소켓·성장률·리미트), 마테리아 = 내용물(스킬·성장). 파티 편성이 "누구를 데려가나"에서 "마테리아를 어디 꽂나"로 바뀌어 어떤 파티든 성립 [F1].
- **장비 가치의 다차원화**: 공격력 외에 소켓 수·연결 형태·성장률 세 축이 있어 "더 강한 무기"가 항상 정답이 아니다 [F5].
- **연결 슬롯 = 조합 문법**: 지원 마테리아가 짝을 변형하므로 N개 마테리아로 N² 조합. Remake도 이 문법만은 유지.
- **스탯 페널티 = 역할 분화 장치**: 자유 이동이 가능한데도 물리 캐릭터에 마법을 몰아넣지 못하게 하는 유일한 브레이크.
- **성장이 아이템에 붙음**: 캐릭터를 갈아도 육성이 남는다 → 편성 변경 비용 0(본작 "영웅 = 빌드 슬롯"과 동형).

## 7. 알려진 문제·비판 → 바뀐 것
- **캐릭터 동질화**: 개발진 스스로 인지("battles wouldn't be about characters with individual, innate skills")하고 리미트 브레이크로 보완 [F1]. 커뮤니티: "Carbon copy characters?" 논쟁, 실제 플레이는 "Barret, Cid, and Cloud due to their having the best limits and triple growth weapons" 같이 **리미트·성장률만으로 파티가 고착** [F17].
- **분열 경제 붕괴**: 마스터 All 140만 길 [F7] → Remake에서 분열 삭제 [F10].
- **All 만능**: 원작 All이 사실상 필수 → Remake Magnify 1개 희소화, Rebirth Lv1 -60% 페널티로 레벨 투자 강제 [F10][F22].
- **소환 폭주**: 원작 소환+지원(MP Turbo/HP Absorb 등) 결합 → Remake는 소환-청 결합 금지 [F10].
- **관리 부담**: 전 캐릭터 마테리아·무기 관리가 번거로워 3인 고정 파티 경향 [F17] → Rebirth는 무기 레벨을 캐릭터 단일 풀로, 슬롯 자동 확장으로 관리 부담 축소 [F13][F14].

## 8. 본작 관점 메모 (FF7)

**가져올 만한 것**
1. **"소켓 = 스킬 그릇, 영웅 = 그릇"의 동형** — 본작 스킬 카드를 마테리아처럼 **영웅 간 이동 가능한 아이템**으로 두면, 레어 영웅 무한 생성 구조에서 "영웅을 갈아도 육성이 남는" FF7의 장점이 그대로 온다. 액티브 슬롯 3 = 소켓 3.
2. **장비 가치의 다차원화** — 접사(숫자) 외에 "카드 소켓 수 / 연결 여부"를 희귀도 계단(크래프트·유니크)에 얹으면 "더 센 숫자"가 아닌 "더 좋은 그릇"이라는 두 번째 비교축이 생긴다. 성장률(Double/Triple)은 방치형에서 "이 장비를 낀 카드는 원정당 XP 2배"로 직역 가능 — 새 게이지 없이 기존 XP 축으로 표현됨(단순화 원칙 통과).
3. **연결 슬롯 문법** — 지원 카드가 짝을 변형(전체화·속성 부여·추가 효과)하는 구조는 카드 종류를 늘리지 않고 조합을 늘린다. "스킬 카드 합성"을 새 시스템으로 만들기 전에 **연결 = 합성**으로 표현 가능한지 먼저 검증할 가치.
4. **마스터 보상 = 페널티 제거**(마스터 마테리아 "no status effect") — 성장 완료의 보상을 "숫자 증가"가 아니라 "제약 해제"로 주는 방식은 숫자 인플레 없이 체이스를 만든다.

**피해야 할 것**
1. **분열 파우셋** — 거래 없는 싱글이지만 골드가 강화 재화이므로 마테리아 복제 판매 같은 무한 골드 루트는 강화 경제를 무너뜨린다. 카드 성장 완료 시 복제 대신 "카드 합성 재료화"로.
2. **스탯 페널티의 퍼센트 산식** — HP -2%/-5%/-10%는 방치형 리포트에서 읽기 어렵다. 역할 분화가 필요하면 MH식 "상한"이나 본작 "죄종 태그 불일치 시 효율 감소" 같은 **기존 축**으로. 새 페널티 수치 추가 금지(단순화 원칙).
3. **캐릭터 동질화 방치** — 본작 영웅은 메인 죄종·직업·기본 능력치 7종이 리미트 브레이크 역할을 해야 한다. 카드가 죄종을 무시하고 아무 영웅에나 완전 동일 효과면 유니크 15명의 존재 이유가 사라진다. **카드 효과에 영웅 메인 죄종 일치 보정**을 두는 것이 FF7이 리미트로 푼 문제의 본작식 해법.
4. **All 만능 카드** — 하나의 지원 카드가 모든 빌드에 필수가 되면 접사 풀 희석과 같은 효과. Rebirth처럼 초기 페널티+레벨 투자로 풀거나, 아예 만능 카드를 두지 않는다.
5. **성장 없음 = 최강 장비**(궁극 무기) 트레이드오프 자체는 좋지만, 방치형에서는 "유니크를 끼면 카드가 안 큰다"가 유니크 체이스 동기와 충돌한다. 유니크는 성장률을 깎지 말고 소켓 형태로 차별화.

---

## 부록 — 두 문법의 교차와 본작 스킬 카드

| | Monster Hunter | FF7 마테리아 | 본작 접점 |
|---|---|---|---|
| 2차 층의 단위 | 스킬 레벨 조각(+1) | 스킬 그 자체(+성장) | 스킬 카드가 "스킬 자체"면 FF7, "트리 노드 +1"이면 MH |
| 상한 | 스킬별 상한, 초과 무효 | 없음(대신 스탯 페널티·소켓 수) | 트리 상한 + 슬롯 3이 이미 있음 → MH식이 기존 축과 맞음 |
| 랜덤 위치 | 한 층에만(작품별 이동) | 없음(전부 확정, 성장만 시간) | 접사가 이미 랜덤 → 카드는 **확정**이 계단 논리에 맞음 |
| 세트 | 세트 2/4, 그룹 3(태그) | 없음 | 죄종 그룹 3부위가 3/6/9 대안 후보 |
| 경제 | 잉여→포인트→재굴림 | 분열→판매 | 분해→포인트→지정 제작(Wilds) 채택, 분열 배제 |
| 정체성 보호 | 무기종이 곧 플레이 | 리미트 브레이크·성장률 | 메인 죄종·직업·기본 능력치 7 |

**결론(고민에 대한 답)**: 두 사례 모두 "2차 층이 접사와 같은 통화(숫자)를 주지 않는다"는 점에서 일치한다. 본작에 룬/차암/주얼이 필요하다면 그 형태는 **"스킬 레벨 조각을 주는 탈착식 소켓템 + 단일 스킬은 확정 제작, 복합만 드롭"**이 두 게임의 실패·수정 이력이 수렴한 지점이며, 이것은 후속 예정인 스킬 카드 개념과 별개 시스템이 아니라 **같은 시스템의 아이템 형태**로 통합하는 것이 단순화 원칙에 맞는다.

---

## 9. 출처 목록

### Monster Hunter
| # | 출처 | 신뢰도 | 사용 항목 |
|---|---|---|---|
| M1 | Capcom MH Generations 공식 매뉴얼 p.73 (Skills) — game.capcom.com/manual/MH_Gen/en/page-73.html | ★★★ | 구작 포인트 임계 모델(10/15/-10, -9~+9 무효) |
| M2 | 동 매뉴얼 p.74 (Talismans/Decorations) — page-74.html | ★★★ | 장식품 제작·호석 퀘스트 감정·슬롯 규칙 |
| M3 | 동 매뉴얼 p.72 (Equipment Statuses) — page-72.html | ★★★ | 방어구 스킬 포인트/슬롯 표기 |
| M4 | fextralife MHW Decorations — monsterhunterworld.wiki.fextralife.com/Decorations | ★★ | 슬롯 Lv1~4, 페이스톤 확률표, Iceborne 복합 장식품, Attack Jewel |
| M5 | fextralife MHW Elder Melder — /Elder+Melder | ★★ | 의식 종류·비용 |
| M6 | fextralife MHW Skills — /Skills | ★★ | 스킬 합산·상한·시크릿·세트 보너스 예시 |
| M7 | fextralife MHW Augmentations and Upgrades — /Augmentations_and_Upgrades | ★★ | World/Iceborne 강화 수치 |
| M8 | 28gameslater 블로그 "Decoration Categories and Drop Rates"(2018) | ★ | Attack Jewel 0.27%, 엘더멜더 A/S 6/2% (데이터마인 인용 블로그) |
| M9 | Steam MHW 토론 "attack jewel drop rate?" | ★ | 커뮤니티 체감·0.1% |
| M10 | fextralife/game8/gamewith Safi'jiiva Awakened Abilities (검색 요약) | ★★ | 각성 5슬롯·tier 규칙·예리 |
| M11 | fextralife MHRise Melding — monsterhunterrise.wiki.fextralife.com/Melding | ★★ | 멜딩 종류·비용·Aurora/Cyclus/Vigor |
| M12 | fextralife MHRise Talismans — /Talismans | ★★ | 호석 규칙·희귀도 이름·업그레이드 불가 |
| M13 | fextralife MHRise Skills — /Skills | ★★ | 합산·상한, 세트 보너스 부재(간접) |
| M14 | fextralife MHRise Ramp-Up Skills — /Ramp-Up+Skills | ★★ | 백룡 슬롯 수·유지·Sunbreak 대체 |
| M15 | fextralife MHRise Rampage Decorations — /Rampage+Decorations | ★★ | 백룡 장식품 규칙·무기종 제한 |
| M16 | fextralife MHRise Qurious Armor Crafting — /Qurious+Armor+Crafting | ★★ | 랜덤 결과·마이너스·비용 |
| M17 | game8 Sunbreak Qurious Crafting Guide — game8.co/games/Monster-Hunter-Rise/archives/383478 | ★★ | 기이 무기 수치·에센스·TU 모드·리셋 |
| M18 | Steam MHRise "Talisman RNG is pretty depressing" | ★ | 1/60000, Aurora 반론 |
| M19 | Steam MHRise "Getting mad over charm editing is nonsense" | ★ | 참 에디터·1:390,000,000,000 |
| M20 | Steam MHRise "Qurio Crafting is awful..." | ★ | 기이 방어구 비판·옹호 |
| M21 | Automaton West "Sunbreak's Qurious Crafting failures draw attention"(2022-08-17) | ★★ | 헤드라인만 확인(본문 절단) |
| M22 | neoseeker "MH3U Charm Tables - Tutorial and help" | ★ | 17테이블·세이브 고정·table 10 |
| M23 | Yahoo Tech(GamesRadar 전재, IGN 인터뷰 인용) "Monster Hunter Wilds lead was also crushed by MHW's brutal decoration RNG" | ★★★(인용) | Tokuda/Fujioka 발언, World 제작 호석·Rise 랜덤 호석 대비 |
| M24 | fextralife MHWilds Decorations — monsterhunterwilds.wiki.fextralife.com/Decorations | ★★ | 무기/방어구 분리·슬롯·오브·멜딩 비용 |
| M25 | game8 MHWilds "How to Equip Decorations" — archives/503202 | ★★ | 슬롯 매칭 규칙 |
| M26 | fextralife MHWilds Melding Pot — /Melding_Pot | ★★ | 지정 멜딩 90/450pt, 오브 비용, 아티아 파츠 |
| M27 | game8 MHWilds "How to Use the Melding Pot" — archives/503115 | ★★ | 포인트 환산(1/3/6), 호석 환원(1/3/6/10) |
| M28 | fextralife MHWilds Talismans — /Talismans | ★★ | 제작 호석·감정 호석 Ver1.21 |
| M29 | game8 MHWilds "Appraised Talismans (RNG Talismans)" — archives/539844 | ★★ | 2025-08-12 추가, 희귀도 확률, 무기 스킬 규칙 |
| M30 | Kotaku "MH Wilds' Talismans Feel Convoluted To Upgrade" | ★★ | 제작 UI 비판 |
| M31 | Steam MHWilds "RNG TALISMANS, the way this was applied was a horrific mistake" | ★ | 0.04%, 인벤 혼재, 반론 |
| M32 | fextralife MHWilds Artian Weapons — /Artian_Weapons | ★★ | 파츠·속성 부여·TU4 고그마 |
| M33 | game8 MHWilds Artian Weapons Guide — archives/503103 | ★★ | 희귀도 표·강화 보너스 수치 |
| M34 | fextralife MHWilds Group Skills — /Group_Skills | ★★ | 3부위·1레벨 |
| M35 | fextralife MHWilds Skills — /Skills | ★★ | 무기 스킬/방어구 스킬 분리 |
| M36 | fextralife MHWilds Set Bonus Skills / game8 List of Set Bonus Skills (검색 요약) | ★★ | 2/4부위 |
| M37 | monsterhunter.fandom Athena's Armor Set Search (검색 요약) | ★★ | 시뮬레이터 문화 |
| M38 | GamingBolt "MH Wilds Update Adds Random Talismans…" (검색 요약) | ★★ | 감정 호석 업데이트 교차 확인 |
| M39 | game8 MHRise Rampage Skills (검색 요약) | ★★ | 백룡 스킬 되돌리기·MR 소멸 |

### Final Fantasy
| # | 출처 | 신뢰도 | 사용 항목 |
|---|---|---|---|
| F1 | shmuplations "Final Fantasy VII – 1997 Developer Interviews" — shmuplations.com/ff7/ | ★★★ | Kitase/Nomura 설계 의도, 리미트 브레이크 |
| F2 | Wikipedia "Final Fantasy VII" | ★★ | Sakaguchi 제안 배경, 마테리아 개요 |
| F3 | rpgclassics FF7 shrine — Materia hub (shrines.rpgclassics.com/psx/ff7/materia.shtml) | ★★ | 마스터 분열, 마스터 마테리아, Huge Materia |
| F4 | rpgclassics FF7 shrine — Magic materia (…/magic.shtml) | ★★ | 마법 마테리아 스탯 패턴 A/B/C, Restore AP |
| F5 | jegged FF7 "Materia Growth" | ★★ | Normal/Double/Triple/None 무기 목록 |
| F6 | jegged FF7 "Materia Stat Effects" | ★★ | Restore 수치, 장착 지침 |
| F7 | GameFAQs FF7 게시판(마스터 All 1.4M, 40 gil/AP) (검색 요약) | ★ | 판매가·분열 경제 |
| F8 | thefinalfantasy.net FF7 Materia | ★ | 5색 정의, 마스터 마테리아 획득 |
| F9 | GamesRadar "FF7's Materia almost had a very different name…" (검색 요약) | ★★ | Sphere → Materia 명칭 |
| F10 | Inverse "FF7 Remake Materia system: 5 key changes" | ★★ | Magnify, Elemental 1개, 분열 삭제, 소환 결합 불가 |
| F11 | RPG Site "FF7 Remake Materia guide" | ★★ | Remake 5색·듀얼 슬롯 |
| F12 | GameFAQs FF7 Remake FAQ "Skill Points and Weapon Upgrades" (검색 요약) | ★★ | 코어/서브코어, 슬롯 추가/연결, Lv6 6슬롯 3쌍 |
| F13 | RPG Site "FF7 Rebirth Weapons" | ★★ | 무기 레벨 공유, 6슬롯, 코어 폐지→폴리오 |
| F14 | TheGamer "FF7 Rebirth: Weapon Upgrade Guide" | ★★ | SP 단일 풀, 무기 스킬, 슬롯 증가 |
| F15 | game8 FF7 Rebirth Materia List | ★★ | Complete Materia, 소환 무기 슬롯 |
| F16 | finalfantasy.fandom "FF7 Rebirth gameplay changes" (검색 요약) | ★★ | 슬롯 구매 폐지, 동일 마테리아 다중 연결 |
| F17 | GameFAQs FF7 "Carbon copy characters?" 등 (검색 요약) | ★ | 동질화 비판·파티 고착 |
| F18 | jegged FFIX "Learning New Abilities" | ★★ | FFIX 대조 |
| F19 | finalfantasy.fandom FFIX abilities (검색 요약) | ★★ | 마법석 증가 |
| F20 | jegged FFX "Weapon and Armor Customization" | ★★ | 영구 부여, 빈 슬롯 장비 판매가 |
| F21 | game8/fandom/gamerguides FFX (검색 요약) | ★★ | 1~4슬롯, 제거 불가, 풀 분리 |
| F22 | gamerguides FF7 Rebirth Magnify (검색 요약) | ★★ | Magnify -60% |

### 미확인 항목 (추측을 확정으로 쓰지 않음)
1. **MHW 호석 제작·강화(I→II→III) 구체 규칙** — 원문 fetch 실패. "World = 제작 호석"은 IGN 인터뷰 기사[M23]로만 확인.
2. **Rise/Sunbreak 세트 보너스 부재** — 위키에 항목이 없다는 간접 증거만[M13]. 명시 문장 미확보.
3. **Sunbreak Lv4 슬롯/장식품 존재 여부** — 미확인.
4. **Wilds 이중 스킬 장식품 = 멜딩 불가** — 커뮤니티·가이드 공통 설명이나 fextralife 원문은 "Lv1 90pt/Lv2 450pt 목록"만 제공[M26]. Tokuda 발언은 "단일 스킬 제작 가능"까지만[M23].
5. **MHW 엘더멜더 A 6% / S 2%, Attack Jewel 0.27%** — 블로그[M8] 단일 출처.
6. **Rise 호석 확률(1/60,000, 1/10¹¹)** — 커뮤니티 계산.
7. **Rise 호석 랜덤 유지 이유에 대한 개발자 발언** — 검색 5회, 인터뷰 3건 확인했으나 해당 언급 없음(Capcom USA·Shacknews 인터뷰는 이동·밸런스만).
8. **Iceborne 4레벨 복합 장식품 전체 목록·확률** — 요약 수준만.
9. **MH3U 이후 호석 테이블 고정 폐지 시점** — 미확인.
10. **FF7 원작 소환·커맨드·지원·독립 마테리아 개별 스탯 수치**(KotR 등) — 마법 마테리아 표만 확보[F4]. 패턴 B의 "+2 Strength"는 전사 오류 의심.
11. **FF7 원작 마테리아 소지 한도 200개** — 원문 미확인.
12. **FF7 판매가 산식(40 gil/AP)** — 커뮤니티[F7].
13. **FF7 Remake·Rebirth 마테리아 장착 스탯 페널티 유무** — Remake 가이드[F11]는 언급 없음, Rebirth "없음" 주장은 배제 출처(esportsheaven)만.
14. **Rebirth 마스터 분열 없음** — Remake만 확인[F10], Rebirth 미확인(동일 추정).
15. **Remake/Rebirth 성장률(Double/Triple) 존재 여부** — 미확인.
16. **rpgclassics "Yellow for Support(7종)"** — 원문 색/종류 표기 오류 가능성(일반적으로 황=커맨드).
17. **Wilds 아티아 방어구** — 존재 미확인.
18. **Automaton 기이 크래프트 기사 본문** — 절단으로 헤드라인만.
