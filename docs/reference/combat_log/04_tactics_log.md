# 참고작 조사 — 전투 로그의 가독성과 인과 설명
대상: RimWorld · Battle Brothers · Darkest Dungeon (주) / Dwarf Fortress · 로그라이크 메시지 로그(DCSS·Caves of Qud) (보조)

조사 방법 한계 고지: 세 주력 게임 모두 **공식 위키가 Fandom 소유**인데, 이번 세션에서 Fandom 도메인(`battlebrothers.fandom.com`, `darkestdungeon.fandom.com`)에 대한 WebFetch 가 전부 **HTTP 402 / CAPTCHA 차단**으로 실패했다(`web.archive.org` 미러도 이 세션에서 fetch 불가). 따라서 아래 내용의 상당수는 **Steam 토론·Nexus 모드 설명·개발자 블로그·WebSearch 스니펫**에서 재구성한 것이며, Fandom 원문을 직접 인용하지 못한 항목은 각각 표기했다.

---

## 1. RimWorld

### 1-1. Battle Log(전투 기록) 창
- 폰 정보창의 **'Log' 탭**에서 열람. "The game keeps track of all combat actions done by a pawn... lets you review combat after the battle has finished or in the heat of it. Each action is accompanied by some flavor text." ([Steam 가이드: Everything About Combat in RimWorld](https://steamcommunity.com/sharedfiles/filedetails/?id=3154189813))
- **Social 로그와 Combat 로그가 별개 탭으로 분리**되어 있다는 것은 RimWorld 플레이어 사이에서 일반 상식으로 통용되며([Steam: Social and combat log empty](https://steamcommunity.com/app/294100/discussions/0/3114770279396273545/) 스레드가 이를 전제로 "내 로그가 비었다"는 버그를 보고), 알림/메시지 로그(우상단 Letter/Alert 스택)와도 물리적으로 분리된 별도 UI다. ⚠추정 — Fandom 위키 원문 확인 실패로 정확한 탭 이름·문구는 미확정.
- 과거 버전(B18)에는 전투 로그 줄에 **피격 부위가 직접 표기**됐으나, 현재 버전은 로그에서 빠지고 **신체 부위(Health) 탭에서 부상에 마우스를 올려야** "누가 쐈는지·무엇이 원인인지"가 나온다는 유저 지적이 있다 — 즉 인과 정보가 로그 한 곳에 있지 않고 **탭 간 분산**됐다는 회귀 사례. ([Steam: Combat Log Hit Locations](https://steamcommunity.com/app/294100/discussions/0/1735466157774581191/))

### 1-2. 명중률 분해 툴팁 — 항목표
사수를 선택하고 대상에 마우스를 올리면 뜨는 팝업. 유저가 실측 보고한 예시 문구(원문 그대로, [Steam 스레드](https://steamcommunity.com/app/294100/discussions/0/3057364785117297249/)):

```
Shoot by Gates: 33%
Shooter 81%
Weapon 83%
Target Size 50%
(no cover)
```

일반화된 구조는 아래 표([RimWorld Wiki: Shooting Accuracy](https://rimworldwiki.com/wiki/Shooting_Accuracy) 및 WebSearch 스니펫 종합, 항목명은 버전마다 문구가 조금씩 다를 수 있어 ⚠추정 포함):

| 표시 줄(순서) | 의미 | 표기 형식 |
|---|---|---|
| 1번째 줄 | **최종 명중률** (모든 항목 반영 후) | `XX%` |
| 2번째 줄 | 사수 스킬 × 거리 보정 (스킬 높을수록 원거리 페널티 완화) | `Shooter XX%` |
| 3번째 줄 | 해당 거리에서의 무기 정확도 (touch/short/medium/long 4구간 보간) | `Weapon XX%` |
| 4번째 줄 | 대상 크기 배율(0.5~2.0, bodySize 기준) | `Target Size XX%` |
| 5번째 줄 | 엄폐(cover) — 없으면 "no cover", 있으면 각도·등급별 배율 | `(no cover)` / 배율 표기 |
| (조건부) | 자세(누움/스탠딩), 조명(밝기), 이동 중 페널티 등 | ⚠추정 — 원문 미확보(N/F) |

- 근접 명중률(Melee Hit Chance)·회피(Melee Dodge Chance)도 별도 스탯 페이지가 있으며 "melee skill +1/레벨", "moving 1800% 가중치" 등 세부 계수가 위키에 정리되어 있으나, **툴팁에 몇 줄로 어떻게 쪼개 보여주는지 원문은 확보 실패(N/F)**. ([Melee Hit Chance](https://rimworldwiki.com/wiki/Melee_Hit_Chance), [Melee Dodge Chance](https://rimworldwiki.com/wiki/Melee_Dodge_Chance))

### 1-3. 신체 부위 피해 표기
- 현재는 전투 로그가 아니라 **Health(신체) 탭의 부상 항목에 마우스오버**해야 가해자·원인 무기가 나옴 (1-1 참조). 로그 자체의 부위 표기 원문 문장은 확보 실패(N/F).

### 1-4. 알림 로그와의 분리
- Letter/Alert(화면 우측 상단 스택, 클릭하면 일시정지+카메라 이동)와 캐릭터 단위 Log 탭은 **용도가 다르다** — 전자는 "지금 조치가 필요한 사건", 후자는 "이 폰에게 일어난 일의 누적 기록". 본작의 "라운드 시작/타격/처치" 실시간 스트림과는 성격이 다르며, RimWorld 쪽은 **사후 열람용 아카이브**에 가깝다는 점이 특징.

---

## 2. Battle Brothers

### 2-1. 전투 로그 패널
- 화면 하단(또는 지정 위치)에 있으나 유저 다수가 **찾기 어렵다**고 보고 — "I found it and expanded it"([Steam: Combat log?](https://steamcommunity.com/app/365360/discussions/0/530646080857646353/)). 확장하면 카메라가 전장에 자동으로 포커스되지 않는 부작용도 보고됨([Steam: Combat log? / Better Combat Log 모드 설명](https://www.nexusmods.com/battlebrothers/mods/105)).
- 기본 폰트/크기에 대한 강한 불만: "it needs to be much larger with clearer font. At the moment you have to squint at the screen to read it", "please make it a little larger with a clearer font. I'm going blind trying to read it" ([Steam: Combat log?](https://steamcommunity.com/app/365360/discussions/0/530646080857646353/)).
- 인게임 로그와 별개로 `C:\Users\<name>\Documents\Battle Brothers`에 **외부 텍스트 로그 파일**도 기록되지만, 여기에도 유저가 원하는 상세 정보(굴림 값 등)는 없다 — 모더레이터 turtle225 답변: "There is a log out of game that is written to, but it won't have the information you want." ([Steam: Is there a more in depth combat log hidden somewhere?](https://steamcommunity.com/app/365360/discussions/0/3820781363192237109/))

### 2-2. 줄 형식(원문/재구성)
공식 원문 그대로는 확보 실패(Fandom 차단)했으나, WebSearch 가 재구성한 템플릿과 모드 설명에서 드러난 형태는 다음과 같다 — **명명된 플레이스홀더(`<Target>`, `<Attacker>`, `<Wound>`) 방식**:

```
Bandit raider's head armor was hit for 20 damage
<Target> suffers <Wound> from <Attacker>'s attack!
<Target>'s [Head|Torso]'s armor is shredded by <Attacker>'s attack!
<Target> was killed by <Attacker>!
```
⚠추정 — 실제 게임 폰트/구두점까지 정확히 일치하는지는 미검증. 다만 "명명 태그 방식"이라는 구조 자체는 여러 독립 소스(모드 설명, 토론)에서 일관되게 나타난다.

### 2-3. 명중률 툴팁 분해 — 항목표
Battle Brothers Fandom 원문 직접 인용은 실패했으나, WebSearch 스니펫이 fandom `Hit_Chance`/`Combat_Mechanics` 문서를 요약한 결과와 Steam 토론을 종합하면:

| 항목 | 값/규칙 |
|---|---|
| **Base** | 공격자 Melee/Ranged Skill − 대상 Melee/Ranged Defense |
| 거리 페널티(원거리) | 타일당 −t (거리 1 기준 무보정, 멀수록 누적 감소) |
| 고저차 | 공격자가 높으면 **+10%**, 낮으면 레벨당 **−10%** |
| 방어측 디미니싱 리턴 | Defense 50 초과분은 **절반 가치**만 인정 |
| 방패 | 기본 방패 방어력 가산(방패 전문가 특성 시 ×1.25) |
| 포위(surround) | 인접 적 수만큼 근접 Defense 감소 |
| 저지당한 대상(피격 불가 자세 등) | 명중 페널티 **−75%** |
| 레벨 차이 | 최대 +10 보너스, 초과분 페널티 증가 |
| 하한/상한 | 5%~95% 범위로 정규화 |
| 플레이어 보정(밸런스용) | 플레이어 공격 −5 / 플레이어가 맞을 때 +5 |
| Lucky(행운) 특성 | 10% 확률 재판정 |

출처: [Steam: Hit Chance and Damage Formulas](https://steamcommunity.com/app/365360/discussions/0/1777136225026945777/), [Steam: Riposte and hit chance](https://steamcommunity.com/app/365360/discussions/0/1745641752339481412/), WebSearch 의 Fandom `Hit_Chance` 요약. **툴팁에 이 항목들이 실제로 몇 줄·어떤 문구로 나열되는지(예: "Base 70% + Elevation 10% − Surround 15%" 형태인지)는 Fandom 차단으로 원문 미확보(N/F)** — 다만 개발자 블로그 스레드([Detailed info about rolls, checks, etc.](https://battlebrothersgame.com/forums/topic/detailed-info-rolls-checks-etc/))에서 유저들이 "지금 로그는 데미지만 보여준다"며 Pillars of Eternity 식 툴팁 분해를 요청한 것으로 보아, **적어도 한 시점에는 항목별 분해가 게임 내에 없었고 요청 사항이었다**는 것은 확인됨.

### 2-4. 데미지 표기 — 체력 vs 방어구
- 체력(HP) 피해와 방어구(내구도) 피해가 **분리 표기**되며, 특히 방어구가 파괴되는 순간 그 초과분(overflow)이 로그 상 표시 데미지와 실제 적용 데미지가 어긋나 보이는 문제가 보고됨 — "damage numbers shown in the combat log can differ from actual damage because... damage to armor can 'overflow' and exceed the armor value when the armor gets destroyed." (WebSearch 요약, 원 출처 Fandom 추정 — 재확인 실패)
- 킬링 블로우의 경우 **데미지량 자체가 로그에 안 뜨는 결함**이 지적됨: "it won't show how much damage you did when you make a killing blow" ([Steam: Combat log?](https://steamcommunity.com/app/365360/discussions/0/530646080857646353/), 유저 Lampros).

### 2-5. 실패 사례 요약
1. 패널을 찾기 어렵고 펼치면 카메라 포커스가 깨짐
2. 폰트가 작아 "눈이 멀 것 같다"는 표현이 나올 정도의 가독성 불만
3. 킬링 블로우 데미지 미표시, 아군 오사(friendly fire) 정보 부족
4. "a full comprehensive combat log is essential"이라는 강한 요구가 커뮤니티에 반복 등장 — 즉 **로그가 있어도 "충분하지 않다"는 불만이 만성적**이었다.

---

## 3. Darkest Dungeon — "로그 없이 인과를 읽히는" 표본

### 3-1. 전투 중 정보 표시
- **공식 전투 로그가 없다.** Steam 토론에서 이 사실이 여러 번 확인됨: "The log would be nice but it would be pretty minimal with this game's system" — 즉 퍼센트 기반 판정이라 로그를 만들어도 정보량이 적을 것이라는 유저 진단. ([Steam: Combat Log?](https://steamcommunity.com/app/262060/discussions/0/1458455461495252840/))
- 대신 **호버형 정보 패널**이 인과를 담당: 스킬을 고르고 적에게 마우스를 올리면 우측 하단 패널에 그 공격이 줄 데미지 범위, 그리고 적을 호버하면 저항(RES)·행동·보유 효과가 뜬다. "when you pick an ability and hover your mouse over an enemy, the bottom panel on the far right side will give you stats on what that attack will do" (WebSearch 요약)
- 데미지 타입별 **아이콘 분리**: Physical(체력) / Stress(정신력) / Conditional(중독·질병 등) / Critical Hit — 아이콘으로 "무엇이 왜 깎였는지"를 즉시 구분되게 한다. ([Steam 가이드: The Darkest UI Guide](https://steamcommunity.com/sharedfiles/filedetails/?id=470786370)) 다만 MISS/RESISTED/CRIT 의 정확한 팝업 텍스트 원문은 확보 실패(N/F).
- 저항 판정에도 팝업이 뜨는 것은 확인됨 — 패치노트에 "Curse 'Resist' 팝업이 이미 저주 상태인 캐릭터에게도 뜨는 버그" 수정 기록이 있어, **저항 성공/실패가 화면에 짧은 팝업 텍스트로 즉시 노출**되는 것 자체는 사실로 확인. (WebSearch 요약, GOG 릴리즈 노트 계열)

### 3-2. "운이 나빴다"를 납득시키는 장치 — 스트레스/Resolve Check
- 로그 대신 **누적 게이지 + 임계 이벤트**로 인과를 설계한다: 스트레스가 0~200 게이지로 계속 쌓이다가 **100에서 Resolve Check**가 발동해 Affliction(악화) 또는 (낮은 확률로) Virtue(선화)로 갈린다. 이 순간 큰 배너/연출로 결과가 통지된다. ([Darkest Dungeon Wiki(wiki.gg): Stress](https://darkestdungeon.wiki.gg/wiki/Stress) 요약)
- 즉 다스트하는 방식이 "로그 줄로 서술"이 아니라 **게이지가 차오르는 걸 미리 보여주고, 임계점에서 눈에 띄는 1회성 이벤트로 결과를 못 박는** 방식이다 — 본작처럼 수십~수백 줄이 흐르는 상황에서는 참고할 만한 대안(로그가 아니라 게이지+피크 이벤트로 인과를 대체).

### 3-3. 전투 후 결과 표시
- 결과 화면에 루팅·경험치·습득한 quirk(기벽)·완치되지 않은 부상 등이 요약된다 — 로그의 축적이 아니라 **캐릭터 상태 변화의 스냅샷 비교(before/after)**로 인과를 보여주는 방식. 세부 화면 문구는 확보 실패(N/F).

### 3-4. 실패 사례 / 커뮤니티 반응
- "Combat Log?" 류의 요청 스레드가 Steam 토론에 다수 존재 — 로그가 없다는 것 자체가 불만 대상이긴 하나, 다른 유저들은 "퍼센트 기반 시스템이라 로그가 있어도 부실할 것"이라며 **로그보다 툴팁 강화**를 대안으로 제시. 즉 Darkest Dungeon 커뮤니티 내에서도 "로그 부재"가 완전한 성공으로 받아들여진 것은 아니고, 사후 복기(왜 파티가 전멸했는지 되짚기)가 어렵다는 불만은 존재한다. ⚠추정 — 정량적 불만 규모는 확인 못 함.

---

## 4. 보조 — Dwarf Fortress 전투 보고서(Combat Report)

- 개념: "Reading the combat reports will give you a gruesome blow-by-blow of the fighting, telling you exactly what each strike did." 전투 참여자별로 **누적 기록 리포트 1개**가 생성되며, 부상→도주→격퇴 같은 일련의 사건이 리포트 하나로 합쳐진다(사건마다 새 리포트가 생기지 않음). ([DF Wiki: Reports](https://dwarffortresswiki.org/index.php/DF2014:Reports))
- 부위 관통/타격불가 시 서사 처리: 무기가 갑옷보다 약하면 참격이 자동으로 둔기 판정으로 전환되어 "갑옷 아래 근육 타박상"이나 "투구 아래 뇌진탕" 같은 결과로 이어진다는 규칙은 확인되나, **실제 로그 문장 원문("strikes at ~", "bruising ~ through the ~" 등)은 이번 세션에서 확보 실패(N/F)** — 버그 트래커에 "Bruising combat report grammar issues"라는 항목이 있어 서사형 로그 특유의 **문법 조립 버그(단어를 갈아끼우다 문법이 깨지는 사례)**가 실존했음은 확인. ([Bug #244](http://www.bay12games.com/dwarves/mantisbt/print_bug_page.php?bug_id=244))
- 시사점: 서사형(문장형) 로그는 조립 실수가 "이상한 문장"으로 바로 드러나 유저가 버그 리포트를 낼 정도로 가시성이 높다 — 필드형 로그보다 조립 실패에 더 취약하다는 방증.

---

## 5. 보조 — 로그라이크 메시지 로그 (DCSS · Caves of Qud)

### 5-1. Dungeon Crawl Stone Soup(DCSS)
옵션 가이드 원문 인용 ([crawl.akrasiac.org/docs/options_guide.txt](https://crawl.akrasiac.org/docs/options_guide.txt)):

- **줄 묶기(반복 메시지)**: `msg_condense_repeats` — "If the same message is repeated multiple times during the same turn, then it will be output in a condensed format." 예시: **"The killer bee misses you. x5"**
- **짧은 메시지 병합**: `msg_condense_short` — "If set, short messages on the same channel don't all start a new line."
- **색 규약**: `message_colour` — "allows you to override colours for individual messages", 채널 필터까지 지정 가능 — 예: `message_colour += lightred:god:xom` (신 관련 메시지를 lightred로).
- **`--more--` 프롬프트**: `show_more`(기본 false) — 켜면 "prompt if more than a window-full of messages are output at once". `small_more = true`면 프롬프트가 화면 좌하단의 문자 하나로 축약되어 화면을 덜 가림.
- **히스토리 열람**: Ctrl-P(Show Previous Message) 단축키로 과거 메시지 확인.

### 5-2. Caves of Qud
- 공격 메시지 원문 예시 ([Steam: Attack message explained](https://steamcommunity.com/app/333640/discussions/0/598516772690248136/)):
  **"You hit (x3) for 6 damage with your iron long sword! [15]"**
  — `(x3)`은 반복 타격이 아니라 **관통 횟수(penetration count)**, `[15]`는 명중 판정 굴림값. 즉 Qud의 `(xN)` 표기는 DCSS의 반복 묶기와 **의미가 다르다** (관통 vs 중복) — 겉보기 비슷한 표기라도 게임마다 의미가 다를 수 있다는 주의점.
- 기본 화면에는 전투 중 표시되는 줄 수가 적어 "so many lines appear at once"인데 다 안 보인다는 불만이 있고, 개발자(AlphaBeard)는 "Try enabling the overlay status bar and message log in options"로 답변 — 즉 **기본값은 로그를 작게 두고, 필요하면 오버레이로 확장**하는 설계. ([Steam: How to get more text on screen for battles](https://steamcommunity.com/app/333640/discussions/0/1738886352901678227/))

---

## 6. 다국어 문장 조립 — 각 게임의 대응 방식 (핵심 관찰)

1. **RimWorld — GrammarResolver**: RimWorld는 단순 `%s` 삽입이 아니라 **이름 붙은 심볼(Symbol)**로 문장을 조립한다. "The grammar resolver is a RimWorld utility that customizes text strings based on in-game objects, such as pawns." 심볼은 `{KEY_subsymbol}` 구조(예: `{PAWN_nameDef}`)이며, 관사(a/an/the) 처리 같은 문법 규칙도 서브심볼이 담당한다. 위키가 명시: **"Because the resolver is designed to support multiple languages, not all of its features... will apply to English-language mods."** — 처음부터 **다국어 어순 대응을 전제로 설계**된 시스템이라는 뜻. ([RimWorld Wiki: GrammarResolver](https://rimworldwiki.com/wiki/Modding_Tutorials/GrammarResolver))
   - 반면 일반 Keyed 문자열(툴팁 등)은 여전히 `{0}{1}{2}` **인덱스 플레이스홀더**를 쓴다. 위키의 번역 가이드는 "플레이스홀더를 제거·추가하면 검증에서 거부된다"고만 하고 순서 변경 허용 여부는 명시하지 않음 — 즉 RimWorld 안에서도 **"고급 절차적 텍스트(GrammarResolver)"와 "단순 키 문자열({0} 삽입)"이 이원화**되어 있고, 후자는 어순이 다른 언어(한국어 포함)에 덜 친화적일 가능성이 있다.
2. **Battle Brothers — 명명 태그(`<Target>`, `<Attacker>`, `<Wound>`)**: 확보된 로그 템플릿은 위치 기반이 아니라 **역할 이름이 붙은 태그**를 쓴다. 이 방식은 번역자가 태그를 문장 아무 위치에나 재배치할 수 있어 한국어 어순(SOV)에도 대응 가능 — 다만 Battle Brothers 자체가 한국어 정식 지원 여부는 확인 못 함(N/F), 구조만 참고 가치가 있음.
3. **DCSS — gettext 기반, 문자열 연결 지양**: 개발자들이 명시적으로 "get rid of many string concatenation patterns that were used to build message content by substituting in verbs" — 즉 **"동사만 갈아끼우는 문자열 이어붙이기"를 버그의 근원으로 보고 없앴다**는 회고가 있다(WebSearch 요약, 원 출처 DCSS 인터널라이제이션 저장소). 한국어 번역판도 실존(`crawl-korean`, gettext 기반) — 문장형 로그를 다국어로 돌린 실제 사례.
4. **Caves of Qud**: 다국어 지원 여부 확인 못 함(N/F) — 영어 전용에 가까운 것으로 보이며 이 축에서는 참고 불가.
5. **Dwarf Fortress**: 서사형 문장을 부위·동사·상태별로 갈아끼우는 구조상 문법 붕괴 버그가 실제로 보고됨(`Bug #244`) — **문장형 로그의 다국어화는 원문(영어)조차 조립 실수를 완전히 피하지 못한다**는 반증 사례로 유용.

**종합**: 다섯 게임 모두 공통적으로, **"필드를 문장 뒤에 단순 삽입"하는 방식은 결국 어순·문법 문제를 일으키고**, 이를 피한 사례(RimWorld GrammarResolver, DCSS gettext 재작업, Battle Brothers 명명 태그)는 하나같이 **① 위치가 아니라 역할로 이름 붙인 슬롯을 쓰고 ② 슬롯을 문장 템플릿 안에서 언어별로 재배치 가능하게 하며 ③ 관사/조사 같은 문법 요소를 별도 규칙으로 뗀다**는 세 가지로 수렴한다.

---

## 7. 9개 질문에 대한 요약 답

| # | 질문 | 요약 답 |
|---|---|---|
| 1 | 형식 | RimWorld: 문장형(flavor text). Battle Brothers: 필드+문장 혼합(명명 태그 삽입형 템플릿). |
| 2 | 얼마나 적나 | RimWorld: 모든 blow/miss/swipe/block/fall 기록(Log 탭 누적). Battle Brothers: 실시간 전부 기록하되 UI가 좁아 체감상 부족하다는 불만 만성적. Darkest Dungeon: 로그 자체가 없음(요약 자체가 없음, 즉시성 있는 팝업만). |
| 3 | 필터·탭 | RimWorld: Social/Combat 탭 분리. Battle Brothers: 별도 필터 확인 못함(N/F). DCSS: 채널별 색 필터(`message_colour += 채널`). |
| 4 | 읽게 하는 장치 | DCSS의 `x5` 반복 묶기·`--more--`·`small_more`·Ctrl-P 히스토리가 가장 체계적. Battle Brothers는 반대로 "안 읽힌다"는 실패 사례가 강함. |
| 5 | 드릴다운 | RimWorld는 호버 팝업으로 **줄 단위 분해**(Shooter/Weapon/Target Size/Cover)가 실측 확인됨. Battle Brothers는 툴팁 분해 요청이 있었으나 원문 확보 실패, 데미지 계산 자체는 사후 로그에서 파악 어렵다는 불만이 있음. |
| 6 | 세그먼트 경계 | RimWorld: 폰 생애 전체 누적(전투 단위로 안 끊김, 스크롤로 과거 열람). Dwarf Fortress: 사건 단위가 아니라 "상태 유지되는 동안 리포트 1개"로 병합. Darkest Dungeon:애초에 로그가 없어 세그먼트 개념 자체가 없음. |
| 7 | 인과 설명 | RimWorld·Battle Brothers는 수치 분해 툴팁으로 "운"을 설명 시도. Darkest Dungeon은 로그 대신 **게이지(스트레스)+임계 이벤트(Resolve Check)**로 인과를 사건화. |
| 8 | 화면 배치 | Battle Brothers는 위치를 찾기 어렵다는 불만 자체가 실패 사례. RimWorld는 캐릭터창 하위 탭이라 상시 노출 아님(온디맨드). |
| 9 | 실패 사례 | Battle Brothers: 폰트 작음·정보 부족·킬링블로우 데미지 누락. RimWorld: 부위 정보가 로그에서 빠지고 탭 간 분산. Darkest Dungeon: 로그 없음 자체가 불만이나 대체재(툴팁) 존재. Dwarf Fortress: 서사 조립 문법 버그(#244). |

---

## 확보 실패(N/F) 목록
- Battle Brothers Fandom 위키(`Hit_Chance`, `Combat_Mechanics`) 원문 — 이번 세션 내내 402/CAPTCHA로 차단, `web.archive.org` 미러도 이 세션에서 fetch 불가
- Battle Brothers 명중률 툴팁의 실제 줄바꿈·문구(항목별 ± 리스트가 몇 줄로 나뉘는지)
- RimWorld 자세(누움/서기)·조명·이동 페널티 항목의 툴팁 정확한 표기 문구
- RimWorld 현재 버전 전투 로그의 신체 부위 피해 표기 원문 문장
- Darkest Dungeon MISS/RESISTED/CRIT 팝업의 정확한 텍스트·색상 규약, 전투 후 결과 화면의 정확한 문구
- Dwarf Fortress 실제 전투 보고서 문장 원문(예시 인용 실패, 개념 설명만 확보)
- Battle Brothers·Caves of Qud 의 한국어(ko) 정식 지원 여부

마지막 업데이트: 2026-09-21
