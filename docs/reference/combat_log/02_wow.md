# WoW 참고작 조사 — 전투 로그 · 딜미터 데이터 설계

조사 범위: (1) 인게임 기본 전투 로그(채팅 탭) (2) COMBAT_LOG_EVENT_UNFILTERED 이벤트 스키마 (3) 딜미터 애드온(Details!/Recount/Skada) (4) 인게임 Death Recap. 기존 `docs/reference/wow/` 의 스킬·아이템 조사는 열지 않음.

---

## 1. 인게임 기본 전투 로그 (채팅창 탭)

**위치**: 기본 채팅창(General)에 「Combat Log」 탭이 기본 포함. 패치 2.4.0 부터 이 탭 자체가 필터 UI를 갖춘 형태로 개편됨. `/combatlog` 명령으로 파일 로깅(`WoWCombatLog.txt`)도 별도로 존재하지만 이건 애드온·외부 파서용이고 채팅창 텍스트와는 다른 파이프.

**필터 축 (2축 교차 구조)** — 탭 우클릭 → Settings → Categories - Combat 에서 조정:
- **Message Sources(주체/객체 축)**: `Done by: Me / My Pet / Party / Raid / Friendly Player / Friendly NPC / Neutral / Hostile Player / Hostile NPC` 와 `Done to: (동일 목록)` 을 **행위자×피행위자로 교차** 체크. 즉 "누가 → 누구에게" 를 소스와 타겟 양쪽에서 각각 켜고 끄는 구조 — 우리가 생각하는 "전체/우리/적" 탭보다 훨씬 세분화된 매트릭스다.
- **Message Types(내용 축)**: Damage / Healing / Misses(회피·저항·무효) / Auras(버프·디버프 부여·해제) / Powers(자원 획득·소모) / 기타(부활, 내구도 등)로 대분류, 각 대분류 안에 세부 체크박스.
- **프리셋 필터**: `Self`(나·내 펫에 관한 것만) · `Everything` · `What happened to me?`(나에게 온 것만) · `Kills` 등이 기본 제공되며 사용자 정의 필터 추가/삭제 가능(`Add Filter`).
- 기본값은 대체로 **좁게 시작**(예: `Self` 류) — "일부러 안 적는 것"이 큰 비중을 차지하는 설계: 파티 전체의 모든 이벤트를 다 켜면 텍스트가 감당 안 될 정도로 쏟아지므로, 초심자 기본값은 자기 위주다.
- N/F: 신규 캐릭터 최초 기본 프리셋이 정확히 무엇인지(Self vs Everything)는 버전마다 문서가 갈려 확정 못 함 — ⚠추정 「Self 계열」.

**줄 형식** — 완결된 영어 문장 스타일(요약형 아님):
```
Your Fireball hits Icy Guardian for 1234 Fire damage. (Critical)
Icy Guardian's Frost Bolt hits you for 512 Frost damage.
Your Heart Strike crits Icy Guardian for 9876. (양식은 소스에 따라 상이)
```
(SimpleCombatLog 같은 애드온의 존재 이유 자체가 "기본 로그는 단어가 많아 빨리 안 읽힌다" — 애드온이 `Hit`, `Heal`, `Miss`, `Cast`, `Gain`, `Drain` 같은 짧은 태그로 압축하고, 이름을 소속(자기/공대/파티/펫)별로 색칠하고, **원소별 피해 수치에 색을 입히는 것도 애드온이 추가하는 기능**이다.)

**중요한 반전 — 스쿨 색 규약은 "블리자드 기본"이 아니다**: 조사 결과 기본 전투 로그·기본 Floating Combat Text 모두 **원소(school)별 색 구분이 표준으로 존재하지 않는다**. 기본 콤뱃텍스트 색은 대체로 흰색/노란색/주황(치명타 강조) 중심이고, "Fire=주황, Frost=하늘색, Shadow=보라" 같은 스쿨 색 매핑은 **SimpleCombatLog, Scrolling Combat Text(SCT), MSBT 같은 애드온이 사용자 설정으로 추가**하는 관례다. 다만 스킬 아이콘·툴팁의 스쿨 아이콘 자체는 존재(Fire/Frost/Nature/Shadow/Holy/Arcane/Physical 7종). 반면 **클래스 색(RAID_CLASS_COLORS)** 은 블리자드가 공식 고정한 값이며 이름 색칠·미터 막대 색에 실제로 쓰이는 진짜 표준 색 규약이다.

출처: [Combat Log – Warcraft Wiki](https://warcraft.wiki.gg/wiki/Combat_Log), [Chat – Wowpedia](https://wowpedia.fandom.com/wiki/Chat)(내용 요약, 원문 fetch 402 실패 — 검색 스니펫 근거), [SimpleCombatLog – WoWInterface](https://www.wowinterface.com/downloads/info5008-SimpleCombatLog.html)

---

## 2. COMBAT_LOG_EVENT_UNFILTERED 스키마

### 2.1 공통 헤더 (모든 이벤트, 필드 0~8)

| # | 필드명 | 의미 |
|---|---|---|
| 0 | event | 이벤트 이름 (예: SPELL_DAMAGE) |
| 1 | sourceGUID | 행위자 GUID (Player-/Pet-/Creature-/Vehicle-/GameObject- 접두) |
| 2 | sourceName | 행위자 표시 이름 |
| 3 | sourceFlags | 소속·적대관계·조작주체·유닛타입 비트필드 (예 `0x511` = 내 소유+우호+플레이어조작+플레이어) |
| 4 | sourceRaidFlags | 공격대 표식(해골 등) |
| 5 | destGUID | 대상 GUID |
| 6 | destName | 대상 표시 이름 |
| 7 | destFlags | destination 쪽 동일 비트필드 |
| 8 | destRaidFlags | 대상 공격대 표식 |

`SPELL_` 접두 이벤트는 여기에 **spellId, spellName, spellSchool**(필드 9~11) 이 추가되고, 그 뒤로 이벤트별 페이로드가 붙는다. `SWING_` 계열은 스펠 프리픽스가 아예 없어 **필드 오프셋이 3칸 밀린다** — 파서 작성 시 실수하기 쉬운 지점.

### 2.2 이벤트별 페이로드 (자주 쓰는 것 위주)

| 이벤트 | 추가 필드 (공통헤더/스펠프리픽스 이후) | 의미 |
|---|---|---|
| **SWING_DAMAGE** | amount, overkill, school, resisted, blocked, absorbed, critical, glancing, crushing, isOffHand | 근접 평타 피해. school 없음(물리 고정이 아니라 실제로도 필드는 있으나 보통 physical) |
| **SPELL_DAMAGE** | (spellId,spellName,spellSchool +) amount, overkill, school, resisted, blocked, absorbed, critical, glancing, crushing, isOffHand | 스킬 직접 피해 |
| **SPELL_PERIODIC_DAMAGE** | 위와 동일 구조 | 도트(DoT) 틱 피해 |
| **SPELL_BUILDING**, **DAMAGE_SPLIT**, **DAMAGE_SHIELD**, **ENVIRONMENTAL** | 위와 동일 구조(+environmentalType 등) | 공성/피해분산/가시반사/낙사·용암 등 |
| **SWING_MISSED** | missType, isOffHand, amountMissed, critical | 근접 회피·저항·무적 등 |
| **SPELL_MISSED** | (spellId,spellName,spellSchool+) missType, isOffHand, amountMissed, critical | missType ∈ MISS/DODGE/PARRY/BLOCK/EVADE/IMMUNE/DEFLECT/ABSORB/REFLECT/RESIST |
| **SPELL_HEAL** | amount, overhealing, absorbed, critical | 즉시 회복 |
| **SPELL_PERIODIC_HEAL** | amount, overhealing, absorbed, critical | HoT 틱 회복 |
| **SPELL_HEAL_ABSORBED** | extraGUID/Name/Flags/RaidFlags, extraSpellID/Name/School, absorbedAmount, totalAmount | 회복 흡수(무효화) — 하리형 디버프 |
| **SPELL_ABSORBED** | (트리거원 spellId/Name/School 선택) + casterGUID/Name/Flags/RaidFlags, absorbSpellId/Name/School, amount, critical | 실제 흡수량 — SPELL_DAMAGE 와 별도 이벤트로 동반 발생 |
| **SPELL_ENERGIZE** | amount, overEnergize, powerType, maxPower | 자원 획득 |
| **SPELL_DRAIN / SPELL_LEECH** | amount, powerType, extraAmount(, maxPower) | 자원 흡수/전이 |
| **SPELL_INTERRUPT** | extraSpellId, extraSpellName, extraSchool | 시전 차단 — 무엇을 끊었는지 별도 필드 |
| **SPELL_DISPEL / SPELL_DISPEL_FAILED / SPELL_STOLEN** | extraSpellId/Name/School(, auraType) | 해제·강탈 대상 스펠 |
| **SPELL_AURA_APPLIED / REMOVED / APPLIED_DOSE / REMOVED_DOSE** | auraType(BUFF/DEBUFF), amount(스택) | 버프/디버프 부여·해제·중첩 |
| **SPELL_CAST_START/SUCCESS/FAILED** | (failedType) | 시전 시작/성공/실패 |
| **UNIT_DIED / UNIT_DESTROYED / UNIT_DISSIPATES** | recapID, unconsciousOnDeath | **recapID 가 죽음 직전 이벤트열을 묶는 키** — 클라이언트 Death Recap UI가 이 ID로 역추적 |
| **PARTY_KILL** | (없음) | 처치 확정 신호 |
| **SPELL_INSTAKILL** | unconsciousOnDeath | 즉사기 |
| **ENCHANT_APPLIED/REMOVED** | spellName, itemID, itemName | 인챈트 부여/해제 |

**필드 의미 요약(9번 질문 핵심)**:
- `resisted`/`blocked`/`absorbed` = 각각 원인이 다른 "깎인 양"(저항/방어/보호막), `overkill` = 처치에 필요했던 양을 넘어 낭비된 피해(HP 0 이하로 남는 초과분) — 넷 다 **amount 와 별도 필드로 나란히** 실려서, 로그 소비자가 "왜 이 숫자가 됐는지"를 가산식으로 재구성 가능하게 한다.
- `critical`/`glancing`/`crushing` 은 서로 배타적인 히트 등급 플래그.
- `missType` 은 SPELL_MISSED 한 이벤트 안에서 회피 종류(회피/받아넘김/막기/무적/반사/저항 등)를 **열거형 하나**로 표현 — SPELL_DAMAGE 의 "부분 감쇄" 필드들과 달리 "완전 무효"는 별도 이벤트·별도 필드 체계.

출처: [COMBAT_LOG_EVENT – Warcraft Wiki](https://warcraft.wiki.gg/wiki/COMBAT_LOG_EVENT), [Event:COMBAT_LOG_EVENT – Warcraft Wiki](https://warcraft.wiki.gg/wiki/Event:COMBAT_LOG_EVENT), [CombatLogGetCurrentEventInfo – Warcraft Wiki](https://warcraft.wiki.gg/wiki/API:CombatLogGetCurrentEventInfo), [Combat log format (classic-warrior wiki, GitHub)](https://github.com/magey/classic-warrior/wiki/Combat-log-format)

### 2.3 로그 파일(.txt) 원문 라인 포맷 — 참고용

```
COMBAT_LOG_VERSION,22,ADVANCED_LOG_ENABLED,1,BUILD_VERSION,12.0.0,PROJECT_ID,1
5/15 22:14:32.567  SPELL_DAMAGE,Player-1-0001,"Salmoche",0x511,0x0,Creature-0-1234,"The Lich King",0x10a48,0x0,49184,"Heart Strike",0x1,9876,0,1,nil,nil,nil,nil,nil,1,nil,nil,nil
```
- 타임스탬프(밀리초 포함) + **두 칸 공백** 구분자 + CSV.
- Advanced Combat Logging 옵션을 켜면 SPELL_DAMAGE 한 줄의 필드 수가 ~22개→40개+ 로 늘어남(유닛 스탯: 체력/최대체력/파워/좌표/아이템레벨/스펙 등 부가 정보 — 정확한 필드 나열은 확보 못함, N/F).

출처: [Line Format & Common Header – WowCoach.gg](https://wowcoach.gg/docs/combat-log/line-format), [Complete guide: analysing a WoW combat log – Skaldlogs](https://skaldlogs.com/blog/guide-log-combat-wow)

---

## 3. 딜미터 애드온 — Details! / Recount / Skada

### 3.1 표시 모드(창 상단 전환)

Damage Done · Damage Taken · Healing Done(및 Healing Taken/Overhealing) · Deaths · Dispels · Interrupts · Enemies(적 기준 뒤집어보기) 등을 **같은 창을 우클릭해 모드 전환**하거나(Details!), **여러 창을 동시에 띄워** 딜/힐을 나란히 보는(Skada 강점) 두 접근이 공존.

### 3.2 메인 창 한 줄 구성

| 요소 | 내용 |
|---|---|
| 순위(#) | 정렬 기준(보통 총량) 내림차순 |
| 아이콘 | 스펙 아이콘(직업+전문화) 또는 몬스터 초상 |
| 이름 | 클래스 색(RAID_CLASS_COLORS)으로 텍스트 색칠 |
| 총량 | 절대 수치(예: 12.3M) |
| DPS/HPS | 세그먼트 경과시간 기준 초당값 |
| 점유율(%) | 파티/공대 총합 대비 비중 |
| 막대(bar) | 1위 대비 상대 길이 — 총량 비례 게이지 |

표시할 컬럼(rank/name/total/dps/percent 등)은 **사용자가 텍스트 슬롯별로 커스터마이즈** 가능(Details! "Bars: Texts" 설정) — 즉 블리자드 표준이 아니라 애드온이 "몇 개까지 우겨넣을지"를 폭에 맞춰 사용자가 고르게 한 구조.

### 3.3 드릴다운 (한 줄 클릭 시)

플레이어 막대를 클릭하면 **스킬별 하위 목록**으로 펼쳐짐 — 스킬 아이콘·이름·총 피해·타격수·치명타율·평균·최대·점유율(그 플레이어 안에서의 비중)이 표 형태로 나열. 스펠 검색, 스펠 ID 조회, 툴팁 열람까지 지원(Details! Spell List 기능). 즉 **2단 드릴다운**: (전체 파티 랭킹) → (그 사람의 스킬별 랭킹). 스킬 한 줄을 더 파고들면 개별 타격 로그(hit-by-hit)까지 갈 수 있는 애드온도 있음(정확한 3단째 존재 여부는 버전 의존 — ⚠추정).

### 3.4 세그먼트 경계

"Segments" 버튼으로 전투 단위(현재 파이트) / 종합(overall, 여러 파이트 누적) / 특정 과거 파이트 재조회를 전환. **자동 분리 기준은 "전투 진입/이탈"**(플롯이 시작되면 새 세그먼트, 끝나면 확정) — 트래시(잡몹)와 보스전을 별도 세그먼트로 자동 구분하는 옵션도 존재. 즉 세그먼트 = **전투 하나 = 로그 구간 하나**가 기본 단위이고, "종합"은 그 구간들의 단순 합산 뷰.

### 3.5 좁은 폭에서의 축소

직접 문서화된 사양은 확보 못함(N/F). 다만 애드온 특성상 **막대 폭이 줄면 텍스트 슬롯을 순서대로 생략**(퍼센트→DPS→총량만 남기는 식)하는 것이 일반적 UX 관례이며 Details!도 텍스트 커스터마이즈 자체가 "공간이 없으면 뭘 버릴지 사용자가 미리 고르게" 하는 설계다. ⚠추정.

### 3.6 툴팁

막대 위에 마우스를 올리면 보통 그 항목의 상세 수치(정확한 총량, 초당값, 타격수 등 반올림 안 된 원본값)를 즉석 표시 — 표에는 축약 표기(12.3M 등)를, 툴팁에는 정밀값을 주는 **2단계 정밀도 원칙**이 흔한 패턴.

출처: [Details! Damage Meter Addon Guide – Warcraft Tavern](https://www.warcrafttavern.com/wow/guides/details-damage-meter-addon-guide/), [Details! Damage Meter – CurseForge](https://www.curseforge.com/wow/addons/details), [Addon Spotlight: Skada versus Recount – Engadget](https://www.engadget.com/2013-03-12-addon-spotlight-skada-versus-recount.html), [Recount versus Skada – MMO-Champion](https://www.mmo-champion.com/threads/1452260-Recount-versus-Skada)

---

## 4. Death Recap

### 4.1 블리자드 인게임 기본 (네이티브)

- 최초 도입: Patch 6.1.0 (2015-02-24).
- 캐릭터 사망 시 팝업으로 자동 표시. **표시 구간은 사망 직전 약 1.6초**로 매우 짧음 — 명시적 한계로 지적됨.
- 표시 내용: 가해 스킬 이름(아이콘), 피해량, 가해 소스 이름. 마우스오버 시 사망까지 남은 시간 등 툴팁.
- 12.0(Midnight) 패치에서 딜미터 시스템과 통합 개선(스킬명 표기 개선, 로그아웃 이후에도 유지) — 그러나 여전히 시간창이 짧음.
- **명시적 한계**: 방어 쿨다운 보유 여부 표시 없음 / 회피 가능한 피해 vs 불가피한 피해 구분 없음 / 공유(파티·공격대 채팅으로 전달) 불가 / 킬링블로우만 강조되고 그 앞의 누적 맥락은 부족.

출처: [WoW Death Recap: What Actually Killed You – WowCoach.gg](https://wowcoach.gg/blog/wow-death-recap-how-to-see-what-killed-you) (Wowpedia 원문 페이지는 fetch 402 실패 — 이 출처로 대체)

### 4.2 Details! 확장 (Death Log / Advanced Death Logs 플러그인)

- Details! 자체에 "Death Log" 표시 모드가 있어 사망자별 목록 제공, 색상 커스터마이즈 가능.
- **Recount 의 Death Log는 사망 10초 전부터** HP 그래프 + 들어온 피해/힐 목록을 함께 보여줌 — 네이티브(1.6초)보다 훨씬 긴 창.
- Advanced Death Logs(별도 플러그인, Tercioo 제작)는 공격대 전원의 사망·생존시간·부활을 누적 기록하고 차트로 시각화. 보스전 종료 후 아이콘 클릭으로 열람.
- 사망 직전 각 타격 시점의 **잔여 체력 %** 를 함께 보여주도록 커스터마이즈 가능 — "몇 대 맞고 죽었나"뿐 아니라 "그 타격이 체력을 몇 %에서 몇 %로 깎았나"까지 재구성.

출처: [Details! Damage Meter Addon Guide – Warcraft Tavern](https://www.warcrafttavern.com/wow/guides/details-damage-meter-addon-guide/), [Advanced Death Logs – GitHub(Tercioo)](https://github.com/Tercioo/AdvancedDeathLogs), [Addon Spotlight: Skada versus Recount – Engadget](https://www.engadget.com/2013-03-12-addon-spotlight-skada-versus-recount.html)

---

## 5. 실패 사례 · 비판 (9번 질문)

- **"딜미터가 공동체를 망친다" 계열 비판**: 공대·파티 모집에서 딜미터 수치를 근거로 즉시 추방(kick)하는 문화, 인터럽트·해제·산개 등 **미터에 안 잡히는 기여**(생존기, 유틸)를 평가절하하게 만든다는 비판이 반복됨. "내 미터가 형편없다" 류의 포럼 논쟁도 다수.
- **정보 과잉 비판**: 딜미터가 "숫자 하나로 실력을 환원"하면서 정작 왜 그 숫자가 나왔는지(회피/저항/방어cd 사용 여부)는 안 보여줘 **오귀인(misattribution)**을 유발한다는 것이 핵심 논지 — 즉 "많이 보여주는 것"이 아니라 "잘못된 것 하나만 보여주는 것"이 문제로 지적됨.
- **블리자드의 대응**: 딜미터 자체를 공식 제공한 적은 없고(계속 애드온 영역), 대신 **Death Recap 을 기본 기능으로 자체 제공**해 "부분적 인과 설명"만 네이티브로 흡수 — 완전한 딜미터 기능은 여전히 서드파티에 위임. 최근(12.0) 에는 네이티브 Death Recap을 딜미터 데이터와 통합하는 절충을 시도 중.
- 참고로 타 게임(ESO)은 그룹 데이터 접근 자체를 API에서 막아 딜미터 자체를 무력화하는 반대 방향 대응을 택함(WoW는 안 그럼) — 커뮤니티 문화 차이를 보여주는 대조 사례.

출처: [Damage Meters Have Done More Harm Than Good – WoW Forums](https://us.forums.blizzard.com/en/wow/t/damage-meters-have-done-more-harm-than-good/2343946), [Your "damage meter" is pathetic & you should feel bad – WoW Forums](https://us.forums.blizzard.com/en/wow/t/your-damage-meter-is-pathetic-you-should-feel-bad/2231698)

---

## 6. 본작 맥락 필터링 — 무엇이 다른가

본작은 **관전형**(조작 없음, 배속/일시정지/철수만)이라는 점이 WoW의 전제(플레이어가 자기 플레이를 실시간으로 고치기 위해 미터를 본다)와 근본적으로 다르다. WoW의 정보 설계 중 상당수는 "그 순간 내가 뭘 바꿀 것인가"에 최적화되어 있는데, 본작에서 "그 순간의 개입"은 없다 — 정보는 오직 **다음 판의 빌드·편성·배분** 의사결정 재료로만 쓰인다. 이 차이가 아래 3장(가져올 것)과 5장(버릴 것) 판단의 근거다.

---

## 7. 확보 실패 항목 (N/F)

- 신규 캐릭터의 Combat Log 탭 최초 기본 프리셋 정확한 값(Self vs Everything) — ⚠추정만 확보
- Message Sources/Message Types 체크박스의 완전한 리터럴 목록(정확한 라벨 전수) — 구조(2축 교차)는 확인했으나 항목 전수는 스크린샷 원문 없이는 확정 불가
- 기본 Floating Combat Text/전투 로그의 "스쿨 색" 공식 헥스값 — 애초에 그런 공식 규약이 없다는 것까지만 확인(클래스 색은 존재하나 스쿨 색은 애드온 영역)
- Details! 좁은 폭(narrow width)에서의 정확한 컬럼 생략 규칙 — 공식 문서 부재, 일반 UX 관례로만 추정
- Advanced Combat Logging이 추가하는 40+ 필드의 전체 목록(체력/좌표/아이템레벨 등으로 추정되나 필드명 전수 미확보)
- Details! 드릴다운이 스킬별 아래로 개별 타격(hit-by-hit) 3단째까지 내려가는지 여부

---
*작성: 2026-09-21*
