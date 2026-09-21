# 방치형 파티 RPG 3종 — 전투 로그 · 누적 데미지 표시 조사

> 주제: 자동전투 관전 화면의 combat log · 누적 damage 표시
> 담당: Lootun · Dragon Cliff (龙崖) · Guild Master: Idle Dungeons (Paranoid Squirrels)
> 로컬 기존 조사(`docs/reference/{lootun,dragoncliff,idleguildmaster}/00_overview.md`)는 전투 **수치 모델**(피해 태그·ATB·EP 등)만 다루고 **로그/UI**는 다루지 않았다 — 이번 조사가 그 공백을 메운다.
> ⚠ 동명 게임 오염 주의: "Guild Master: Idle Dungeons"로 검색하면 무관한 동명작(`Guild Idle` by DannyL3tscher, itch.io / `Idle Guild Master` by Star Aureo, itch.io)이 섞여 나온다. 이 문서는 **Paranoid Squirrels 사(`it.paranoidsquirrels.idleguildmaster`, 공식 위키 `idleguildmaster.wiki.gg`) 것만** 인용했고, 섞여 나온 동명작 결과는 전부 버렸다.

---

## 1. Lootun

Lootun은 로컬 조사에서 이미 "전투가 실시간인지 라운드 턴제인지조차 1차 자료로 확정 못함"(00_overview.md §5-5)이라고 적었을 만큼 자료가 얕다. 이번 웹 조사도 **정식 위키·공략 사이트가 없고 itch.io 데브로그 + Steam 토론만 있다** — 그래서 스키마·verbosity 등 절반 이상이 N/F다.

### 1. 로그 한 줄의 데이터 스키마
확인된 실제 문구는 다음 정도뿐이다(모두 itch.io 데브로그 인용, 원문 그대로):
- "Skill Execute damage is now shown in a separate line in the damage meter." (v1.2 계열)
- "Reprisal Damage is now shown as a separate line in the Damage Meter."
- "The Death Log now shows the time since each attack." (v1.0.0.7, 2024-03-21)
- "Blessing would show up multiple times in the Damage Meter." (버그 리포트 문구, v1.0.0.3/1.0.0.8)

즉 확인된 필드는 **[출처(스킬/이펙트 이름)] + [피해량]** 뿐이고, 시각/판정(치명·빗나감·저항)·남은 HP가 로그 줄에 박히는지는 **N/F**다. Death Log 쪽은 "각 공격 이후 경과 시간"이 필드로 추가됐다는 것만 확인됐다.
⚠추정: "Skill Execute" "Reprisal" 처럼 **피해 원인(스킬/효과명) 단위로 줄을 쪼갠다**는 설계 방향은 문구로 뒷받침되지만, 실제 화면 캡처를 못 구해 정확한 줄 포맷(문장형인지 표인지)은 추정이다.

### 2. 줄을 얼마나 적나
N/F. verbosity 옵션이나 "모든 타격을 적는다"는 서술을 못 찾았다. 다만 "Added the ability to hide execute damage in the damage meter."(itch.io 데브로그)로 **최소 하나의 온/오프 필터는 존재**한다 — Execute(처형) 피해를 숨기는 옵션.

### 3. 필터 · 탭 · 정렬
확인:
- Damage Meter에 **Healing 탭 추가**: "Added a Healing tab to the Damage Meter." (v1.0.0.11, 2024-03-28)
- Execute 피해 숨김 토글 (위 인용)
- Death Log를 **파일로 저장하는 Advanced 설정**: "Added a new Advanced setting to save Character Death Logs to a file."
정렬 기준(내림차순 등)은 N/F.

### 4. 빠른 로그를 읽게 하는 장치
N/F에 가깝다. 색·아이콘·자동스크롤에 대한 1차 서술을 못 찾았다. 확인된 것은 딱 하나 — 스크롤 가능해야 한다는 사실을 역으로 보여주는 버그 수정: "Fixed a bug where the Damage meter could not be scrolled." (v0.5.13.1, 2022-06-28) → **Damage Meter는 스크롤 가능한 리스트 패널**이라는 것만 확정.
배속과 로그의 관계는 N/F. 전투 자체를 일시정지하는 기능은 있다: "Introduced the ability to pause each combat encounter." (v0.6.0.6) — 단 로그와의 연동 방식은 불명.

### 5. 누적 수치 판의 컬럼 구성
확인: Damage Meter는 **캐릭터별 딜량**을 기본으로 하고, 그 아래(또는 옆)에 **원인별 줄**(스킬 Execute / Reprisal / Blessing 등)을 쪼갠다. Healing 탭이 별도로 붙어 **딜과 힐이 탭으로 분리**된다. "Damage dealt by Blessing would not be saved... when loading / saving the game." → **세이브/로드에도 누적치가 영속**한다(즉 런 하나짜리 휘발 수치가 아니라 캐릭터 생애 누적으로 보인다 — ⚠추정, 정확한 리셋 시점은 N/F).
DPS·점유율·%막대·치명률 등 구체 컬럼명은 N/F.

### 6. 세그먼트 경계
N/F — 리셋이 미션 단위인지 캐릭터 생애 전체인지 불명. 위 5번의 세이브 영속 버그 리포트가 유일한 단서.

### 7. 인과 설명
- Death Log가 **사망 원인 규명용 로그**로 기능 — "시간 since 공격"을 보여줘 무엇이 언제 때렸는지 재구성하게 한다.
- 반례로 실패 사례(§9)에 있듯, 일반 사망(전멸 아님)에는 원인 표시가 부족하다는 유저 불만이 있다 — 즉 Death Log가 있어도 **평시 전투에는 "왜 이만큼 맞았나"를 보여주는 장치가 약하다**는 정황.

### 8. 화면 배치
N/F(정확한 위치·크기). 확인된 것은 "Combat Menu의 새 버튼으로 Damage Meter 진입"(v0.5.9) — 상시 노출 패널이 아니라 **버튼을 눌러 여는 별도 화면/모달**이라는 것. 기본 on/off, 접기 여부는 N/F.

### 9. 실패 사례
- ⚠품질 낮음(재확인 필요, 출처가 무관한 게임(우주선 슈팅 요소 언급)과 혼입된 페이지였음 — **이 인용은 폐기**했다. Lootun 고유 코멘트 페이지(`arrowsoft.itch.io/lootun/comments`)를 직접 재확인했으나 "combat이 너무 빨라 못 읽는다"류 불만은 못 찾았다.
- 확인된 유일한 관련 개발자 반응: Damage Meter가 "will correctly record the damage dealt"라는 긍정적 언급뿐, 불만 사례로 인용할 만한 유저 코멘트는 확보 실패.

---

## 2. Dragon Cliff (龙崖)

세 게임 중 **가장 구체적인 실제 로그 문장을 확보**했다. Steam 토론에 실제 인게임 텍스트를 그대로 옮긴 유저 글이 여럿 있었다.

### 1. 로그 한 줄의 데이터 스키마
원문 그대로 확보한 예:
1. `"paladin hit paladin (himself) for 17k real damage"` (Steam 토론 "Is reflect bugged?" 원문 인용)
2. `"the combat log says the source was him (paladin), doing real damage to himself"` (같은 스레드, 재서술이지만 "source"라는 필드명이 유저 어휘에 그대로 나타남)
3. `"In my thorns group the battle log allocates 90% of all kills to my tactician - by reflective damage of course."` (스레드 "Tactician Megakiller")

→ 재구성되는 스키마: **[공격자] hit [대상( + 자기 자신이면 "(himself)" 표기)] for [수치][k 단위] [피해 타입] damage**. 피해 타입은 8종(Physical/Fire/Ice/Shadow/Poison/Divine/Lightning/Real) 중 하나가 문장에 들어간다. Real 피해는 화면에서 **밝은 보라색(bright purple) 텍스트**로 구분된다는 것도 확인 — "real damage (bright purple in colored text) ignores any and all defenses".
치명타 관련: 패치노트 원문(2019-03-30) — "battle log has been updated to include skill/tactic/effects that triggered the final critical hit." → **로그 줄에 "무슨 스킬/택틱/이펙트가 최종 치명타를 유발했는가"가 명시적으로 박힌다.**
남은 HP·시각(timestamp) 표기 여부는 N/F.

### 2. 줄을 얼마나 적나
"battle log will post something like..." 식 서술로 볼 때 **타격마다 한 줄씩 찍는 것으로 보이나**(⚠추정), 명시적으로 "모든 타격을 적는다"는 1차 문장은 못 찾았다. 확인된 것은 **킬(처치) 전용 로그**가 별도로 존재: "A battle log for unit kills was added, making it possible to view damage logs on unit kills." → 일반 타격 로그와 별개로 **킬 순간의 피해 내역을 보여주는 서브 로그**가 있다.

### 3. 필터 · 탭 · 정렬
확인된 축 2개:
- **DPS 미터**: "There's a dps meter on the right side during an adventure." (Steam 토론 "Suggestion: Statistics for adventurers") — 화면 **오른쪽**에 원정 진행 중 상시 표시.
- 유저가 원했지만 **없는 것**(요청 사항이지 기능 아님): 최근 5전/15전 딜량·피해량 이력 추적, Mystic Dungeon 종료 후 "real hit rate" 표시 — 둘 다 **미구현으로 확인**(질문자가 "기존 DPS 미터로 충분했다"고 인정하며 마무리).
정렬·탭 구성 세부는 N/F.

### 4. 빠른 로그를 읽게 하는 장치
확인: **피해 타입별 색상 구분** — 최소 Real 피해가 보라색이라는 것은 확정. 다른 7종의 색은 N/F(로컬 조사에도 색상표는 없음).
배속-로그 연동, 자동스크롤, 아이콘, 들여쓰기는 N/F. 단 전투 길이가 실측으로 "대부분 3.5초 이내"([가이드E], 로컬 00_overview.md §7)라는 것을 고려하면, 로그가 실시간으로 읽히기보다는 **전투 종료 후 되짚어보는 용도**에 가까울 가능성이 있다(⚠추정).

### 5. 누적 수치 판의 컬럼 구성
확인: **DPS 미터**(원정 중 우측 상시 표시) — 컬럼명 세부는 N/F이나 "dps meter"라는 명칭 자체가 **DPS 단위 표기**를 강하게 시사(⚠추정: 총딜이 아니라 초당 딜일 가능성).
드릴다운: **킬 로그가 "이 킬에 얼마나 기여했는가"를 스킬 단위로 보여준다**는 정황(Thorns 그룹에서 택티션이 전체 킬의 90%를 "가져간다"고 유저가 불평 — 즉 유닛별 킬 기여도가 화면에서 읽힌다)까지는 확인, 그 이상 깊이는 N/F.
유저가 **원했지만 없는 것**(§3) 자체가 곧 "지금 없는 컬럼"의 목록이 된다 — 요약: 다전 누적, hit rate%, 받은 피해 누적은 전부 미구현으로 확인됨.

### 6. 세그먼트 경계
확인: DPS 미터는 **"원정 하나(during an adventure)" 단위**로만 동작하고 여러 전투를 넘어 누적하지 않는다(위 §3 인용). **오프라인 진행 자체가 없는 게임**(로컬 조사 확정 — "서버도 과금도 없는 대신 게임을 켜둬야 진행된다")이라 오프라인 리포트 형식은 **해당 없음**(N/A, N/F 아님).

### 7. 인과 설명
- **치명타 유발 원인 명시**(§1의 패치노트 인용)가 가장 직접적인 인과 설명 장치 — "무엇 때문에 이 치명타가 났는가"를 로그가 답한다.
- **Real 피해의 별도 색상**이 "왜 이만큼 맞았나"의 1차 단서 — 방어 전부 무시라는 게임적 사실을 색으로 미리 경고한다.
- 반례: "Occasional wipe" 스레드에서 파티가 순식간에 전멸해도 **원인 규명이 유저 자력으로 잘 안 됐다** — 631백만 강인도 + 반사막 4겹 + 4속성 면역을 갖춘 캐릭터가 한방에 죽었는데 로그만으로는 납득이 안 갔다는 사례(치명타 유발자는 보여도, "왜 그 방어를 뚫었는가"는 로그가 설명 못함 — ⚠추정 해석).

### 8. 화면 배치
확인: DPS 미터는 **화면 오른쪽**, 원정(전투) 진행 중 **상시 노출**. 온/오프·접기 여부는 N/F. 배틀로그 자체의 위치(오른쪽 미터와 같은 열인지 별도 탭인지)는 N/F.

### 9. 실패 사례
- 다전 누적 통계 부재에 대한 명시적 유저 요청(§3) — "최근 5~15전의 딜/피해를 못 본다"는 것이 곧 불만의 근거.
- "Occasional wipe" 스레드류 — 극단적 스탯에도 설명 안 되는 죽음에 대한 당혹감(원인 로그가 있어도 왜 그 방어를 뚫었는지까지는 안 보여줌).
- 화면이 바쁘다/읽기 힘들다는 명시적 리뷰 문구는 **확보 실패**(검색은 시도했으나 Dragon Cliff 고유의 그런 리뷰를 못 찾음 — 대신 무관한 게임(Clair Obscur: Expedition 33)의 비슷한 불만이 검색에 섞여 나왔을 뿐, 폐기).

---

## 3. Guild Master: Idle Dungeons (Paranoid Squirrels)

로컬 조사(00_overview.md §2-6)가 이미 "관전이 있는가 — 미확인. 위키에도 스토어에도 '전투를 지켜본다'는 서술이 없다"고 결론지었다. 이번 웹 조사(공식 위키 `idleguildmaster.wiki.gg`, Google Play, TapTap, NamuWiki 재확인)도 **같은 결론을 재확인했을 뿐 새로운 사실을 못 찾았다** — 9개 질문 전부 N/F다.

### 1~9. 전 항목 N/F
- 위키(`Enemies`, `Dungeons & Raids` 등 구조 문서 확인)에는 몬스터 스탯·드롭 테이블만 있고 **전투 화면/로그 UI 서술이 전혀 없다**.
- Google Play 설명 텍스트는 "let the Adventurers do the rest" "fight enemies, take their loot... camp to regain their energies"처럼 **결과를 요약**할 뿐 화면 구성을 묘사하지 않는다.
- TapTap 리뷰 페이지는 사실상 리뷰가 없었다(평점 1건, 텍스트 리뷰 0건 확인).
- NamuWiki(한국 커뮤니티 정리본)도 전투 화면 UI를 다루지 않는다.
- 오프라인 전투 리포트 형식(브리프가 "반드시 확보" 지시한 항목)도 **확보 실패** — "camp to regain energies"라는 결과 서술만 있고, 복귀 시 무엇을 보여주는지(로그·요약·팝업 여부)는 1차 자료가 전무하다.

이 공백 자체가 로컬 조사의 정황 추정("관전할 대상이 구조적으로 성립하기 어렵다 — 던전 9곳이 동시에 오프라인으로 돈다")을 **뒷받침하는 간접 증거**다. 즉 이 게임은 "볼 게 없어서 아무도 화면을 언급하지 않는다"는 가설과 정합적이다(⚠추정, 반증 자료도 없음).

---

## 출처

**Lootun**
- https://arrowsoft.itch.io/lootun/devlog/387213/lootun-059-update
- https://arrowsoft.itch.io/lootun/devlog/394279/lootun-0512-update
- https://arrowsoft.itch.io/lootun/devlog/422569/lootun-0606-update
- https://arrowsoft.itch.io/lootun/devlog (목록)
- https://www.incrementaldb.com/update/0ed832c0-edde-427e-a3f2-cd6d2acd3e56 (v1.2 계열 업데이트)
- https://www.incrementaldb.com/update/a83e6660-8ffe-4858-9a7a-6759f88d12cb (2024-05-11 업데이트 — Death Log/Healing 탭)
- https://steamcommunity.com/app/1960270/discussions/1/7056649947877379138/ (1.0 Beta Update Notes)
- https://arrowsoft.itch.io/lootun/comments
- https://store.steampowered.com/app/1960270/Lootun/

**Dragon Cliff (龙崖)**
- https://steamcommunity.com/app/758190/discussions/0/1693795812308268086/ ("Is reflect bugged?" — 실제 로그 문장 인용)
- https://steamcommunity.com/app/758190/discussions/0/1644290549118066421/ ("Tactician Megakiller")
- https://steamcommunity.com/app/758190/discussions/0/1693795812307189568/ ("Suggestion: Statistics for adventurers" — DPS 미터 위치·부재 기능)
- https://steamcommunity.com/app/758190/discussions/0/1693795812303139176 ("Occasional wipe")
- https://steamcommunity.com/app/758190/discussions/0/1850323802587826214/ (30/03 Update 패치노트 스레드)
- https://dragon-cliff.fandom.com/wiki/Version_History (2019-03-30 패치노트 — 치명타 유발자 명시)
- https://steamcommunity.com/app/758190/discussions/0/2828702373009444840/?ctp=3 (Common QnA — 오프라인 진행 없음 재확인)

**Guild Master: Idle Dungeons (Paranoid Squirrels)**
- https://play.google.com/store/apps/details?id=it.paranoidsquirrels.idleguildmaster
- https://idleguildmaster.wiki.gg/wiki/Enemies
- https://idleguildmaster.wiki.gg/wiki/Dungeons_&_Raids
- https://www.taptap.io/app/33707989/review
- https://en.namu.wiki/w/Guild%20master%20idle%20dungeons

**동명작(오염 확인 후 폐기 — 인용하지 않음)**
- https://dannyl3tscher.itch.io/guild-idle/ (별개 게임 "Guild Idle")
- https://staraureo.itch.io/idle-guild-master (별개 게임 "Idle Guild Master")

---
*작성: 2026-09-21*
