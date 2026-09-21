# Lootun — 거점 건물 전수 조사

> 상위 문서: [00_overview.md](00_overview.md)
> 짝 문서: [01_skills.md](01_skills.md)(스킬) · [02_items.md](02_items.md)(아이템)
> 상태: **26종 전수 · 랭크별 효과는 공개된 게임 텍스트로 채울 수 있는 데까지 채움** — 게임 언어 파일(툴팁 문구) · Steam 공식 뉴스 68건 전문 · 개발자 답변 전수 · 커뮤니티 기록을 문장 단위로 대조했다
> 목적: 본작의 **게임 형태 참고작**(CLAUDE.md)이 「거점」이라는 층을 실제로 무엇으로 채웠는지 — 본작은 **파견처의 건설·업그레이드를 폐기**했으므로(GAME_DESIGN.md §9 08-26), 이 문서는 **채택할 설계도가 아니라 안 가기로 한 길의 지도**다
> ⚠ **이 문서의 수치는 전부 Lootun의 수치다.** 본작 SSOT가 아니며 `src/data/*.csv`로 옮기지 말 것
> ⚠ Lootun에는 위키가 없다(나무위키 · fandom · wiki.gg · PCGamingWiki 모두 없음). **랭크별 수치는 게임 데이터 안에만 있다** — 공개된 것은 수치를 비운 문구 틀뿐이다

---

## 목차

| § | 내용 |
|---|---|
| 0 | 조사 방법 · 신뢰도 · 읽는 규칙 |
| 1 | **랭크별 효과 한 장 표** |
| 2 | 26종 분류 |
| 3 | 제작·개조·경제 (6) |
| 4 | 성장 상한 트랙 (4) |
| 5 | 자동화·로스터 (2) |
| 6 | 콘텐츠 게이트 (8) |
| 7 | 저장 (2) |
| 8 | 채집 (4) |
| 9 | 해금 의존 그래프 |
| 10 | 게이트와 랭크 보상의 분포 |
| 11 | 재화·비용 |
| 12 | 본작 시사점 — 안 가기로 한 길 |
| 13 | 정정 대장 |
| 14 | 출처 · 끝내 못 찾은 것 |
| 15 | 부록 — 언어 파일 랭크 문구 77줄 |

---

## 0. 조사 방법 · 신뢰도 · 읽는 규칙

### 0-1. 등급

| 표기 | 등급 | 뜻 |
|---|---|---|
| 무표시 | **[확정]** | 개발자(`arrowsoftgames`) 직접 답변 · 공식 패치노트 · Deep Dive 원문 |
| `‡` | **[언어 파일]** | 게임의 랭크 툴팁 문구(`{건물}_rankText_NN`). 1.0(2024-05) 판 — §0-3 |
| `†` | **[기록]** | 커뮤니티 가이드 · 플레이어 기록 원문 — 개발자 확인은 없다 |
| *기울임* | **[추정]** | 틀 재사용 · 순서 · 정황으로 끼워 맞춤 |
| `?` | **[없음]** | 공개 원문에서 찾지 못함 |

### 0-2. 출처

- **Steam 공식 뉴스 68건 전문** — 공개 뉴스 API(`ISteamNews/GetNewsForApp`, appid `1960270`). Deep Dive #1~#8(2022) → 1.3.0.14(2026-05)
- **Steam 토론 개발자 답변 전수** — 고정 스레드 「Lootun Developer Questions」 21페이지(315댓글) 전부 · 게시판 목록 323스레드 · 건물 이름 검색 35건+
- **게임 언어 파일** — AI 한글패치(`blog.naver.com/agmserver/223464035576`, 2024-05-31)의 `Korean.txt`(6,473줄) · 중국어판(`github.com/benqy/lootun-chinese-language`, 2024-05-12). 같은 영어 원본의 두 번역
- **커뮤니티 기록** — Steam 가이드 「Walkthrough 0.9 (but still useful in 1.1!)」(id=3044062918) · 「Endgame crafting: Nemesis Infusion」(id=2870906456) · 일본어 블로그 「積ゲの覚え書き」(`quo-gd.hatenablog.com`, 2024-06 — 필자가 「위키가 없어서」 직접 정리) · r/Lootun(Wayback Machine 스냅샷) · itch.io devlog 0.5.x(Steam 출시 전)
- **도전과제** — 145개 중 "Fully upgrade the X" **26개 = 이 문서의 목록과 1:1** (War Camp 만 "Warcamp")

### 0-3. 언어 파일 읽는 규칙 ⚠

1. **틀 번호 = 그 틀을 처음 쓰는 랭크.** 뒤 랭크가 같은 틀을 **다시 쓰면 번호가 빈다.** 원문으로 아는 랭크 17곳과 대조해 **어긋난 곳이 없다**:
   - Castle t01~t03 = r1~r3 · Scrapper t03 = r3(자동 분해) · Artisan's Hall t01 = r1(상자 자동 개봉) · t04 = r4(Transmute) · Community Project t01~t04 = r1~r4 · Alchemist's Hut t07 = r7(자동 보충) · Blacksmith t01 = r1 · Gemcutter's Cabin t02 = r2(소켓) · 채집 t01 = r1(도구 제작)
   - **Watchtower** — r3 = t03(최대 속성 3개), **r5(최대 랭크 8) = t02 「최대 랭크 {1}까지」 재사용** → t04 · t05 가 없다
   - **Bounty Board** — r2 = t02(자동 수령 + 슬롯), **r3 · r4 = t03 「슬롯 추가」 재사용** → 패치노트 「r2 · r3 · r4 각 +4칸」과 정확히 맞는다
2. **건설 = r1.** Scrapper t01(「분해 접근 해금」) · Bounty Board t01(「바운티 해금」)처럼 r1 문구가 곧 건물의 기본 기능이다
3. **`{0}` 자리는 수치 · 이름이 런타임에 채워진다.** 이 문서는 문맥으로 이름을 채웠고(예: Castle 의 `{0}` = Nemesis), 수치는 없다
4. AI 번역이라 뜻이 흐린 곳은 **한 · 중 두 번역을 맞대어** 읽었다 — 예: Hidden Vault t02 한글 「{0} 제작 해제」 · 중국어 「解锁 {0} 飞船」(우주선) → 영어 원문은 **「Unlocks {0} craft」**
5. 1.0 이후에 생긴 랭크(Item Vault r4 = 1.3)는 파일에 없다. 틀이 없는 랭크 = 재사용이거나 1.0 이후 추가

### 0-4. 함정 두 가지

- **「Fixed a bug where …」는 반대로 읽는다.** 묘사된 동작은 의도가 아니었다 — Hidden Vault 두 건 · Scrapper r2 가 이 함정이었다
- **요약 도구를 거친 인용은 쓰지 않았다.** 웹 요약이 원문에 없는 문장을 만든 사례가 두 건 나왔다. 이 문서의 인용은 전부 저장한 원문에서 문자열로 찾은 것이다
- 동명이물 — Lootbound · Lootify · Against the Storm · Nonograms Katana · Path of Exile 2(「Grand Expedition」) · The Mighty Quest for Epic Loot

---

## 1. 랭크별 효과 한 장 표

**표기** — 무표시 = [확정] · `‡` = [언어 파일] · `†` = [기록] · *기울임* = [추정] · `?` = 없음 · 빈칸 = 그 랭크가 있는지 모름. **r1 = 건설.** 수치는 전부 게임 데이터 안에 있다

| 건물 | 해금 조건 · 건설비 | r1 | r2 | r3 | r4 | r5 | r6 | r7 |
|---|---|---|---|---|---|---|---|---|
| **Scrapper** | 처음부터 · 50골드† | 분해 해금 (분해하면 레시피도 얻음) | 「모두 채우기」 옵션 추가‡ | 자동 분해 설정 | *자동 분해 확장 (틀 재사용)* | 분해 시 Rarity Core 추가 확률‡ | Artisan's Hall 해금 | |
| **Blacksmith** | Scrapper r1† · 100골드 + 재료† | 레시피로 장비 제작 | 개조 크래프트 1종‡ | *개조 크래프트 1종* | 개조 크래프트 + Legendary 제작 | 개조 크래프트 + Mythical 제작 | 제작품이 랭크를 더 받을 확률‡ | |
| **Artisan's Hall** | Scrapper r6 | 보스 상자 자동 개봉 | *상자 자동 개봉 확장* | 두 등급 아이템 자동 분해‡ | Blacksmith 에 Transmute‡† | Blacksmith 에 크래프트 2종‡ (*Imbue 포함*) | Imprint Attributes | |
| **Gemcutter's Cabin** | 소켓 달린 장비를 처음 분해† (Lv 50 무렵) | Blacksmith 에서 젬 세공‡† | Blacksmith 에서 소켓 추가 | 몬스터가 젬 드롭‡† · Item Vault 해금† | 젬 드롭 (상위 레벨)‡ | 장착 시 소켓 자동 최대화 | | |
| **Alchemist's Hut** | Lv 30 무렵† | 플라스크 제작‡ | 플라스크 위력 강화‡ | 플라스크 용량 강화‡ | 고급 플라스크 제작‡ | 플라스크 슬롯 추가‡ | *슬롯 추가 (틀 재사용)* | 자동 보충 (Lv 125 무렵) |
| **Community Project** | Profession Hall r2† | 재료 기부 → Donation Credits | Community Passives 구매 | 넘치는 재료 자동 기부 | 재료별 자동 기부 임계값 | | | |
| **Keep** | Bounty 단계† | Blacksmith 에서 Paragon 부여 (최대 레벨 제한)‡ | Paragon 최대 레벨 상향‡ | *Paragon 상한 상향 (틀 재사용)* | | | | |
| **Castle** | Bounty 단계† | Nemesis 최소 속성 2개 | 최소 속성 랭크 4 | Nemesis Infusion · Fortress 해금 조건 | | | | |
| **Watchtower** | Lv 50~100 무렵† | 몬스터가 Nemesis 로 나올 확률 +‡† | Nemesis 속성 최대 랭크 상향‡ | Nemesis 최대 속성 3개 | *r1·r2 틀 재사용* | 속성 최대 랭크 8 | Nemesis 보스가 보상 상자 드롭‡ | |
| **Fortress** | Castle r3 + Agony 보스 처치 | Nemesis 최소 속성 수 상향‡ | 최소 속성 랭크 상향‡ | 최대 속성 랭크 상향‡ | Blacksmith 크래프트 1종‡ | Blacksmith 크래프트 1종‡ | | |
| **Barracks** | 2번째 맵 보스 처치† · 400골드† | 전술(Tactics) 패널‡ | 설정 · 추가 옵션‡ | *2·3번째 스킬 자동 시전*† | | | | |
| **Armoury** | Lv 20† | 로드아웃 +2 | 로드아웃 +2 | | | | | |
| **Bounty Board** | 최대 레벨 150† | 바운티 해금 · 저장 8칸 · Hunt 2번째 슬롯 | 자동 수령 + 저장 +4 | 저장 +4 | 저장 +4 | | | |
| **War Camp** | Agony Level 4† · Donation Credits† | 팩션 콘텐츠‡ · Hunt 3번째 슬롯 | 특정 보상 % 증가‡ | *보상 증가 (틀 재사용)* | 보상 증가 + Blacksmith 에 Bless Equipment‡† | | | |
| **Domain of Agony** | Bounty 진행 뒤 | Agony 미션 · 맵 모디파이어‡ | Agony 미션 슬롯 추가‡ | *슬롯 추가 (틀 재사용)* | 흑요석 +50% (1.2 전엔 슬롯 +4) | | | |
| **Map Room** | Lv 100 (Ascendancy Challenge 2)† | 맵을 현재 최대 레벨로 스케일링 | 무언가 증가‡ | 보상이 좋아지는 새 업그레이드‡ | | | | |
| **Ancient Reliquary** | Lv 100† · T4 재료† | 보너스 단계 0.5% (Treasure Dummy) + 전문성 패시브 2종 | 보너스 단계 확률 추가‡ | Treasure Dummy 가 고품질 아이템 추가 드롭‡ | | | | |
| **Expedition** | Agony 미션 1회 완료 | 레이드 입장 (6인)‡ | 캐릭터별 2번째 *로드아웃* 슬롯‡ | 캐릭터별 3번째 *로드아웃* 슬롯‡ | | | | |
| **Grand Expedition** | ? | 레이드를 상위 모드로 클리어 가능‡ | 레이드 경험치 · 루비 · 재료 증가‡ (비용에 Soul Cloth) | | | | | |
| **Pinnacle** | Ancient Bastion 완료 | Endless 미션 입장‡ | Endless 미션 경험치 증가‡ | | | | | |
| **Item Vault** | Gemcutter r3† (0.9.4 신설) | 젬 대량 보관‡ | Ascendancy Relic 보관‡† | Divine 보관 탭 | Item Research (1.3) | | | |
| **Hidden Vault** | ? | 특정 조우가 드물게 *Overload Core* 보상‡ | 크래프트 1종 해금‡ | 무언가 더 찾기‡ | | | | |
| **Profession Hall** | Blacksmith 랭크업† · 1000골드† | Mine · Forest · Farm 해금 | 무언가 증가‡ · Community Project 해금† | ? | | | | |
| **Mine · Forest · Farm** | Profession Hall · 각 2000골드† | 직업 + 도구 제작 | 일꾼 슬롯 + 상위 재료 티어‡ | 직업 2종 + 도구 제작 2종‡ | 슬롯 2종 + 상위 재료 티어‡ | *슬롯·티어 (틀 재사용)* | 일꾼 슬롯 +1 | |

**한눈에**
- **r1~r3 가 비어 있는 건물은 없다.** 빈칸은 틀이 없는 상위 랭크와 **최대 랭크**다
- **끝까지 번호가 맞는 건물** — Bounty Board(r4) · Community Project(r4) · Item Vault(r4) · Alchemist's Hut(r7) · Gemcutter's Cabin(r5) · Fortress(r5) · Expedition(r3) · Blacksmith(r6) · Artisan's Hall(r6) · Scrapper(r6)
- **수치는 하나도 공개돼 있지 않다** — 공개 수치는 패치노트에 한 줄씩 나온 것뿐(Castle 2개 · 랭크 4 · Watchtower 3개 · 랭크 8 · Bounty 8칸 · +4 · Treasure Dummy 0.5% · 흑요석 +50% · 로드아웃 +2)
- **해금 조건 원문이 없는 건물** — Grand Expedition · Hidden Vault

---

## 2. 26종 분류

| 분류 | 건물 |
|---|---|
| **제작·개조·경제 (6)** | Scrapper · Blacksmith · Artisan's Hall · Gemcutter's Cabin · Alchemist's Hut · Community Project |
| **성장 상한 트랙 (4)** | Keep · Castle · Watchtower · Fortress |
| **자동화·로스터 (2)** | Barracks · Armoury |
| **콘텐츠 게이트 (8)** | Bounty Board · War Camp · Domain of Agony · Map Room · Ancient Reliquary · Expedition · Grand Expedition · Pinnacle |
| **저장 (2)** | Item Vault · Hidden Vault |
| **채집 (4)** | Profession Hall · Mine · Forest · Farm |

도전과제의 업데이트 묶음(Exophase)으로 본 **도입 시점** — Expedition · Grand Expedition · Hidden Vault = Update #3(0.9 레이드) · Item Vault = #4 · Pinnacle = #5(1.0).

---

## 3. 제작·개조·경제 (6)

### Scrapper — 분해가 모든 것의 재료원

| 랭크 | 효과 | 근거 |
|---|---|---|
| r1 | 분해 해금 — 가방에 「Scrap Contents」 버튼. **대부분의 아이템은 분해 시 레시피를 준다** · 50골드 | ‡ · † · 개발자 2022-08-19 "Most item drops will grant their recipe when you salvage them" |
| r2 | 「모두 채우기」 추가 옵션 | ‡ t02 |
| r3 | **자동 분해 설정** — 타입별 희귀도 문턱, 신규 드롭만 | ‡ t03 · † |
| r4 | *t02 · t03 재사용* | 추정 |
| r5 | 장비 분해 시 **Rarity Core 추가 획득 확률** | ‡ t05 |
| **r6** | **Artisan's Hall 해금** | 개발자 2024-02-11 "Once you have upgraded the Scrapper to Rank 6 you will unlock the Artisan's Hall" |

⚠ 0.7 *"Fixed a bug where the ability to Scrap Items was Locked until Scrapper Rank 2"* — 분해는 **r1 부터**다. 다음 랭크 100골드 + 재료 †.

### Blacksmith — 장비 제작·개조의 중추

| 랭크 | 효과 | 근거 |
|---|---|---|
| r1 | **레시피로 장비 제작** · 100골드 + 재료 | 개발자 2022-08-19 "you'll need to unlock the Blacksmith Rank 1 Upgrade" · ‡ t01 |
| r2~r5 | **기본 개조 크래프트**를 하나씩 — 어느 랭크가 어느 크래프트인지 ? | 개발자 "Blacksmith Ranks 2-5 will unlock some basic Equipment Modification recipes" · ‡ t02 |
| r4 · r5 | + **Legendary · Mythical 장비 제작** | 0.7(2022-12) "Blacksmith Ranks 4 and 5 now grant the ability to Craft Legendary and Mythical Rarity Equipment" · ‡ t04 「{0} 해금 + {1} 장비 제작」 |
| **r6** | 제작한 장비가 **랭크를 더 받을 확률** | ‡ t06 |

- 해금 — Scrapper r1 을 지으면 열린다 †
- 랭크업 재화 **Fragment** — 0.8 에 대폭 인하. 어느 Fragment 인지는 §11
- **다른 건물이 여는 Blacksmith 크래프트** — Artisan's Hall r4~r6(Transmute · Imbue · Imprint) · Castle r3(Nemesis Infusion) · Fortress r4 · r5 · War Camp r4(Bless) · Keep(Paragon) · Gemcutter's Cabin r1 · r2(젬 세공 · 소켓 추가) · Hidden Vault r2
- 소켓 규칙 — 소켓 추가는 소켓 조각을 소모하고 이미 있는 소켓 수에 비례해 비싸진다. **아이템 레벨 51+ 는 소켓이 자연 굴림**

### Artisan's Hall — 고급 개조의 게이트

| 랭크 | 효과 | 근거 |
|---|---|---|
| r1 | **보스 상자 자동 개봉**(가방 우클릭 → Bag Settings) | 개발자 2024-02-11 · ‡ t01 |
| r2 | *t01 재사용 — 자동 개봉 확장* | 추정 |
| r3 | 두 등급 아이템 **자동 분해** | ‡ t03 |
| r4 | Blacksmith 에서 **Transmute Attributes** — 무작위가 아니라 지정한 속성으로 교체 | ‡ t04 · † 일본어 블로그 "Rank:4の[Transmute Attributes]機能は必須" |
| r5 | Blacksmith 에서 **크래프트 2종 동시** | ‡ t05 「{2}에서 {0} 및 {1}」 · *하나는 Imbue*(플레이어 "infuse your gear … (Artisan's Hall rank 5)") |
| **r6** | **Imprint Attributes** | 0.7.1(2023-01-14) "unlocked from the Artisan's Hall Rank 6" |

> 가이드의 *"at least rank 5 and hopefully 6 … Transmute, Imbue and Imprint"* 가 셋을 묶어 적어서 「r5 인지 r6 인지」로 갈렸었다. **셋은 r4 · r5 · r6 에 나뉘어 있다.**

### Gemcutter's Cabin — 보석 세공

| 랭크 | 효과 | 근거 |
|---|---|---|
| 해금 | **소켓 달린 장비를 처음 분해할 때** (Lv 50 무렵 드롭 시작) | † 일본어 블로그 "該当装備をスクラップすると、[Gemcutter's Cabin]施設がアンロック" |
| r1 | Blacksmith 에서 **젬 세공** | ‡ t01 · † |
| r2 | Blacksmith 에서 **소켓 추가**(잠재 소켓 수까지) | 개발자 2024-05-30 "The Gemcutter's Cabin Rank 2 upgrade will unlock a Blacksmith Craft that allows you to add sockets" · ‡ t02 |
| r3 | **몬스터가 젬 드롭**(레벨 조건) · **Item Vault 해금** | ‡ t03 · † |
| r4 | 젬 드롭 (상위 레벨) | ‡ t04 |
| r5 | **장착 시 소켓 자동 최대화**(재료 있으면 · 캐릭터별 설정) | ‡ t05 · 0.6.6 "Added a new rank … sockets automatically crafted on to an item when it is equipped" |

⚠ **번호가 한 번 바뀌었다.** 0.8~0.9.3 에는 r3 = 젬 보관 탭이었고, 0.9.4(2023-11-30)에 그것이 Item Vault 건물로 빠졌다(기존 r3 보유자에게 Item Vault r1 자동 지급). 위 표는 1.0 기준이다.

### Alchemist's Hut — 플라스크(소모 버프) 제작

| 랭크 | 효과 | 근거 |
|---|---|---|
| 해금 | Lv 30 무렵, 6번째 맵이 열릴 즈음 (필자 스스로 「Blacksmith r4 가 트리거였을지도」라고 불확실) | † |
| r1 | **플라스크 제작** — 0.6 에 r1 비용에서 Dandelion 제외 | ‡ t01 · 0.6 |
| r2 | 플라스크 **위력** 강화 | ‡ t02 |
| r3 | 플라스크 **용량** 강화 | ‡ t03 |
| r4 | **고급 플라스크** 제작 | ‡ t04 |
| r5 | **플라스크 슬롯 추가** | ‡ t05 「추가 {0} 해금」 · Deep Dive #4 "with enough building upgrades constructed, you may take up to 4 flasks to each mission" |
| r6 | *t05 재사용 — 슬롯 추가* | 추정 |
| **r7** | **플라스크 자동 보충** — Lv 125 무렵 · 0.9 에 전투 메뉴 Ctrl+클릭 토글 | ‡ t07 · 개발자 2024-01-16 "an Auto Refill option that you can unlock from the Alchemist's Hut at around level 125" · itch.io 0.5.8(2022-05) |

### Community Project — 기부로 사는 영구 패시브

| 랭크 | 효과 | 근거 |
|---|---|---|
| 해금 | Profession Hall r2 | † 가이드 · 일본어 블로그 |
| r1 | 재료 기부 → **Donation Credits** | Deep Dive #5 · ‡ t01 |
| r2 | **Community Passives** 구매 | 개발자 2024-02-28 "If you upgrade the Community Project to Rank 2 you will gain access to Community Passives" · ‡ t02 |
| r3 | **넘치는 재료 자동 기부** | 개발자 2022-09-30 "If you have the Community Project Rank 3 upgrade then any overflow materials … converted into Donation Credits" · ‡ t03 |
| r4 | **재료별 자동 기부 임계값** | 0.8 · 1.0 "upgrading the Community Project to Rank 4 did not grant an Achievement" · ‡ t04 |
| 최대 | *4* — r4 가 풀업 도전과제를 줘야 했다는 버그 수정 | 추정 |

**Community Passives** (영구 · 리스펙 불가) — Material Storage(50,000 → 65,000 …) · Donation Credit Gain(1~50) · Faster Gathering(채집 20초 → 10초) · Tool Fortune / Tool Luck · Double Scrapping / Double Resources · Luck / Fate / Wealth / Fortune †

> **전부 경제·채집 축이다.** 전투 능력치가 하나도 없다.

⚠ 0.8 의 Faction Passives · Divine Favour 패시브와 통화를 공유하는지 원문 없음.

---

## 4. 성장 상한 트랙 (4)

**Lootun은 「상한 돌파」라는 하나의 파워크리프 축을 건물 넷에 나눠 심었다.** 그리고 **파워가 캐릭터가 아니라 아이템을 통과한다** — 건물은 아이템의 천장을 올릴 뿐이다.

⚠ Keep · Watchtower 는 공식 패치노트 68건에 건물 이름으로 한 번도 안 나온다 — 이 트랙은 언어 파일 · 가이드가 주 근거다.

### Keep — Paragon (희귀도 밖 수직 성장)

| 랭크 | 효과 | 근거 |
|---|---|---|
| 해금 | Bounty 단계에서 열린다 | † "If you construct and upgrade the newly unlocked Keep, you will be able to craft your own gear into Paragon items" |
| r1 | Blacksmith 에서 **Paragon 레벨 부여** — 최대 레벨 제한 있음 | ‡ t01 「{1}에서 최대 레벨 {2}까지 {0}」 |
| r2 | **Paragon 최대 레벨 상향** | ‡ t02 「{0} 아이템을 최대 레벨 {1}까지」 |
| r3+ | *t02 재사용 — 상한을 단계로 올린다* | 추정 |

- Paragon 시스템 — 아이템당 최대 10레벨(1.2 에 20까지) · 레벨당 속성 Max Rank +1 → P10 = 속성 랭크 20 [확정] Deep Dive #8. **Paragon 아이템은 바운티 드롭으로도 얻는다**(0.6) — Keep 은 「직접 만드는」 경로와 그 **상한**을 판다

### Castle — Nemesis 속성의 **하한** 보장

| 랭크 | 효과 |
|---|---|
| r1 | Nemesis 아이템 **최소 속성 개수 2개** |
| r2 | Nemesis 속성 **최소 랭크 4** |
| r3 | Blacksmith 에서 **Nemesis Infusion**(일반 → Nemesis) · **Fortress 해금 조건** |

[기록] Nemesis Infusion 가이드 원문 · [언어 파일] t01~t03 로 번호 일치. 언어 파일에 t04 가 없고, 「Castle 3 인데 **마지막 업그레이드**가 안 열린다」는 질문에 개발자가 Agony 보스를 안내했다 — 그 「마지막」은 Fortress 다. **Castle 은 r3 가 끝일 가능성이 높다** [추정].

### Watchtower — Nemesis **발생**과 **상한**

| 랭크 | 효과 | 근거 |
|---|---|---|
| 해금 | Lv 50~100 무렵 | † |
| r1 | 몬스터가 **Nemesis 로 나올 확률 +** | ‡ t01 · † "上位モンスターの出る確率が少し上がる程度" |
| r2 | Nemesis 속성 **최대 랭크 상향** | ‡ t02 |
| r3 | Nemesis 아이템 **최대 속성 3개** | † · ‡ t03 |
| r4 | *t01 · t02 재사용* | 추정 |
| r5 | 속성 **최대 랭크 8** | † · ‡ t02 재사용 |
| r6 | **Nemesis 보스가 보상 상자 드롭** | ‡ t06 · 1.2 베타 "Watchtower Rank 6 upgrade had the wrong material costs" |

> **Castle 은 바닥, Watchtower 는 천장.** 같은 아이템 카테고리의 **바닥과 천장을 별개 비용으로 판다.** Watchtower 는 거기에 **Nemesis 가 나오는 빈도**(r1)와 **Nemesis 보스 보상**(r6)까지 쥔다.

### Fortress — Nemesis 한 번 더

| 랭크 | 효과 | 근거 |
|---|---|---|
| 해금 | **Castle r3 + Agony 보스 처치** — 보스는 Mastermind 또는 Risen Goliath, **Agony Level 6+** 에서 나온다 | 0.9 "The Fortress upgrade should now correctly unlock after upgrading the Castle to Rank 3 if an Agony Boss has already been defeated" · 개발자 2022-12-18 |
| r1 | Nemesis **최소 속성 수 상향** (Castle r1 과 같은 틀) | ‡ t01 |
| r2 | Nemesis 속성 **최소 랭크 상향** | ‡ t02 |
| r3 | Nemesis 속성 **최대 랭크 상향** | ‡ t03 |
| r4 · r5 | Blacksmith 에서 **크래프트 1종씩** — *Reroll Nemesis Attributes · Randomise Nemesis Attribute Ranks 로 보인다*(0.9 에 두 크래프트 비용 조정) | ‡ t04 · t05 |

가이드 *"use the upgraded Fortress to customize your Nemesis rolls to nearly perfection, hitting the 30/20"* — 「30/20」은 가이드가 **Keep(Paragon) + Nemesis** 를 겹친 결과로 설명하는 수치다.

> **상한 돌파 축이 4단이다.** 하한(Castle) → 상한(Watchtower) → **하한·상한 재상향 + 정밀 크래프트(Fortress)**, 그리고 별축 Paragon(Keep) — [02_items.md §5](02_items.md)의 「통제권을 계단으로 판다」가 건물 층에서도 반복된다.

---

## 5. 자동화·로스터 (2)

### Barracks — 전투 자동화

| 랭크 | 효과 | 근거 |
|---|---|---|
| 해금 | **2번째 맵(Graveyard) 보스 처치** · 400골드 | † 일본어 블로그 · 가이드 |
| r1 | **전술(Tactics) 패널** — 캐릭터별 설정 | ‡ t01 · 0.7.2(2023-01-28) "The Characters Tactics panel is unlocked by the Barracks Upgrade" |
| r2 | 설정 확장 + 추가 옵션 | ‡ t02 |
| r3 | *2 · 3번째 스킬 자동 시전 체크박스* | † "Rank:3まで解放すると、2つめと3つめのスキルが自動戦闘で使用可能になる" |

- **스킬마다 자동 시전에 필요한 랭크가 따로 있다** — 1.2 베타 *"Fixed a bug where Skills could be set to auto cast without the relevant Barracks Rank"*
- 0.5.3 에 전 랭크 비용 인하(「자동화 기능에 더 쉽게 닿도록」) · 1.2 에 「Stunnable Targets」 옵션 추가

> ⚠ **어휘 주의** — Lootun에서 **Tactics는 타겟팅·자동 시전 설정**이다. 본작의 「파티 전술」(조건 → 효과)과 **같은 단어, 다른 뜻** ([tactic_card_design.md §5-1](../../game_design/tactic_card_design.md)).

### Armoury — 로드아웃

- 해금 — 캐릭터 **Lv 20** †
- **랭크마다 Mission Team 로드아웃 +2** — 1.0 베타(2024-03-15) *"Each Rank of the Armoury now grants 2 Mission Team loadouts (was 1)"* · ‡ t01 · t02
- 파티 장비 + 플라스크 세트를 통째로 저장했다 불러온다 · 최대 랭크 ?

---

## 6. 콘텐츠 게이트 (8)

### Bounty Board — 되돌릴 수 있는 난이도 다이얼의 입구

| 랭크 | 효과 | 근거 |
|---|---|---|
| 해금 | 캐릭터 **최대 레벨**(150) | † |
| r1 | 바운티 해금 · 저장 슬롯 **8개** · **Hunt 2번째 슬롯** | ‡ t01 · 0.9.5 · 개발자 2025-07-08 "Build the Bounty Board Rank: 1 to unlock this Hunt slot" |
| r2 | **보상 자동 수령** + 저장 **+4** | 0.6 · 0.9.5 · ‡ t02 |
| r3 · r4 | 저장 **+4** | 0.9.5 · ‡ t03 |
| 랭크업 재화 | **Favour** | 0.6 "Reduced the Favour cost of Bounty Board ranks" |

**Hunt** — 시스템은 Lv 101 에 열리고(1.0), **슬롯 1개 기본 · 2번째 Bounty Board r1 · 3번째 War Camp r1**. 레벨이 시스템을 열고, 건물이 슬롯을 판다.

**연결된 시스템** — 바운티 클리어 → **Fame** → Fame Passives 구매 → **Infamy 상승** → 모디파이어 개수·강도와 보상이 함께 오른다. **언제든 Fame Passives 를 해제해 Fame 을 환급받고 Infamy 를 내릴 수 있다** ([00_overview.md §8-2](00_overview.md)).

> **이 게임에서 가장 우아한 장치.** "더 어렵게 = 더 많이"를 플레이어가 스스로 돌리되, **되돌릴 수 있으므로 실수해도 벽에 갇히지 않는다.**

### War Camp — 팩션 진입점

| 랭크 | 효과 | 근거 |
|---|---|---|
| 해금 | **Agony Level 4** 도달 · 건설·랭크업에 **Donation Credits** | † "When you reach Agony 4, a new building is available. You need that to unlock the next part of the game, Factions" |
| r1 | **팩션 콘텐츠** — 추가 스킬 · 캐릭터 파워 · 새 던전(팩션 던전) · **Hunt 3번째 슬롯** | ‡ t01 · 개발자 2025-07-08 "Build the War Camp Rank: 1 to unlock this Hunt slot" |
| r2 | 특정 보상 **% 증가** | ‡ t02 「{2}에서 {1} {0} 더」 |
| r3 | *t02 재사용* | 추정 |
| r4 | 보상 증가 + Blacksmith 에 **Bless Equipment** — T3+ 팩션 미션에서 팩션 재료 4종, 비-Divine 장비 보너스 속성 최대 2배 | ‡ t04 「… {3} 제작을 {4}에서 해제」 · † |

「Agony Level」은 **건물 랭크가 아니라** Agony 미션에 붙인 모디파이어 수다(최대 10). ⚠ 건물 이름이 공식 패치노트에 한 번도 안 나온다.

### Domain of Agony — 모디파이어 적층

| 랭크 | 효과 | 근거 |
|---|---|---|
| 해금 | Bounty 를 어느 정도 진행한 뒤 | 0.7 Preview "Agony Missions can be unlocked after you have made some progression through the Bounty system" |
| r1 | **Agony 미션** 해금 + 맵에 **모디파이어** 적용 | ‡ t01 |
| r2 | Agony 미션 **슬롯 추가** | ‡ t02 |
| r3 | *t02 재사용* | 추정 |
| r4 | 흑요석(Obsidian) **+50%** — 1.2 전엔 「Agony 미션 슬롯 +4」(t02 재사용)였다 | 1.2 "Rank 4 no longer grants 4 additional Agony Mission slots and now grants 50% More Obsidian" |

- 모디파이어 하나당 **Agony Level +1, 최대 10** · Agony 보스는 6+ (0.7 Preview · 개발자)
- 1.2 *"Reduced the Material Costs of all Building Upgrades prior to the Domain of Agony"* — 재료비 구간의 기준점이 될 만큼 후반 건물

### Map Room — 구 맵 재파밍

| 랭크 | 효과 | 근거 |
|---|---|---|
| 해금 | **Lv 100** — Ascendancy Challenge 2 가 짓게 시킨다 · Ancient Reliquary 와 동시 · T4 재료 | † |
| r1 | **모든 맵을 현재 최대 레벨로 스케일링** — Lv 100 을 넘는 미션은 이것 없이 못 간다 | 개발자 2025-06-11 "You need to the build the Map Room upgrade in order to scale missions beyond level 100" · ‡ t01 |
| r2 | 무언가 증가 (*Map Expertise 관련으로 보임*) | ‡ t02 「{0} 증가 {1}」 |
| r3 | **보상이 좋아지는 새 업그레이드** 해금 | ‡ t03 |

### Ancient Reliquary — 보너스 단계

| 랭크 | 효과 | 근거 |
|---|---|---|
| 해금 | **Lv 100** · Map Room 과 동시 · T4 재료 | † |
| r1 | 미션 단계 뒤 **보너스 단계** 확률 **0.5%** — 제한 시간 안에 **Treasure Dummy** 를 잡으면 일정 품질 이상 아이템 · 전문성 패시브 2종(스폰 끄기 / 랭크당 +0.1%) | ‡ t01 · 0.6.4 |
| r2 | 보너스 단계 확률 **추가** | ‡ t02 |
| r3 | Treasure Dummy 처치 시 고품질 아이템 **추가 드롭** · 0.7 에 비용에서 Uncommon Rune · Glyph 제외 | ‡ t03 · 0.7 |

⚠ **「Reliquary」는 다른 것이다** — 0.9 에 생긴 유니크 아이템 전용 인벤토리 이름이고, 1.1 부터 그 버튼이 유니크 강화 메뉴(Heroic Upgrades)를 연다. 이 건물과는 이름만 비슷하다.

### Expedition — 레이드 진입점

| 랭크 | 효과 | 근거 |
|---|---|---|
| 해금 | **Agony 미션 1회 완료** | 0.9 베타 "Raids can be accessed after completing an Agony Mission by upgrading the new Expedition Building" |
| r1 | **레이드** 입장 — 6인 파티 | ‡ t01 |
| r2 | 캐릭터별 **2번째 *로드아웃* 슬롯** | ‡ t02 · 0.9.0.6 "Expedition Rank 2 and 3 have been enabled along with the Character Loadouts system" |
| r3 | 캐릭터별 **3번째 *로드아웃* 슬롯** | ‡ t03 |

난이도 — 0.9 도입 때 Normal · Heroic, **Mythic 은 1.2**. Spectral Construct 는 레이드 이름이다.

### Grand Expedition — 레이드 상위 모드

| 랭크 | 효과 | 근거 |
|---|---|---|
| r1 | 레이드를 **상위 모드에서 클리어** 가능 (*Heroic 으로 보임*) | ‡ t01 「{1} 모드에서 {0} 전투를 완료」 |
| r2 | 레이드 **경험치 · 루비 · 재료 보상 증가** · 비용에 **Soul Cloth** | ‡ t02 · 1.2.1 "the Grand Expedition Rank 2 upgrade had the wrong Soul Cloth cost" |

해금 조건 — 원문 없음. 1.1.0.6 *"Fixed a bug that caused the final Building Upgrade unlock to require completion of the Bonus Raid"* 가 이 건물일 **가능성**.

### Pinnacle — Endless Mode 게이트

| 랭크 | 효과 | 근거 |
|---|---|---|
| 해금 | **Ancient Bastion(팩션 던전) 완료** — 마스터리 수치가 아니라 완료 플래그(도감 금테두리) | 개발자 2024-03-18 "once you have completed the Ancient Bastion you should be able to build the new Pinnacle building which will unlock the Endless Mode" |
| r1 | **Endless 미션** 입장 | ‡ t01 |
| r2 | Endless 미션 **경험치 증가** | ‡ t02 |

- 업그레이드에 **Overload Core 25개** — 플레이어 증언(r/Lootun)
- ⚠ Ancient Bastion 완료로 **「새 건물 3개」**가 열린다(플레이어 2024-05-11). 이름이 확인된 것은 Pinnacle 뿐
- 공식 패치노트에 건물 이름 0건

---

## 7. 저장 (2)

### Item Vault — 저장에서 「확정 획득 경로」로

| 랭크 | 효과 | 근거 |
|---|---|---|
| 해금 | 1.0 기준 **Gemcutter r3** · 0.9.4 신설(구 Gemcutter r3 보유자에게 r1 자동 지급) | † · 0.9.4 |
| r1 | **젬 대량 보관** | 0.9.4 · ‡ t01 |
| r2 | 보관소 안에 **Ascendancy Relic** 보관 | ‡ t02 · 0.9.4 "can be further upgrade to allow for the storage and filtering of Ascendancy Relics" · 플레이어 "you can not take it out until you unlock the level 2 and 3" |
| r3 | **Divine Storage** 탭 | 0.9.5 "Added a new Rank 3 Upgrade for the Item Vault" |
| **r4** | **Item Research** — 드롭 전용 아이템을 줍거나 자동 분해 → 리서치 포인트 누적 → 그 아이템의 **사본 생성** 해금 → 희귀 재료로 생성 | 1.3(2026-03-21 베타 · 04-04 정식) |

> **파밍 게임이 4년 차에 도달한 결론** — 순수 확률 체이스만으로는 안 되고, **"헛걸음이 축적되어 결국 확정으로 바뀌는 경로"**(천장/피티)가 필요하다. 저장고였던 건물이 그 경로의 주인이 됐다.

### Hidden Vault — Overload Core

| 랭크 | 효과 | 근거 |
|---|---|---|
| r1 | 특정 조우가 **드물게 *Overload Core*** 를 보상으로 준다 | ‡ t01 「{0} {1} 조우는 이제 드물게 {2}을(를) 보상으로」 · 개발자(r/Lootun) "the Overload Core is bugged and won't actually start dropping until the Hidden Vault is Rank 2" |
| r2 | **크래프트 1종** 해금 (*Nemesis Overload 로 보임*) | ‡ t02 — 한 「{0} 제작 해제」 · 중 「解锁 {0} 飞船」 |
| r3 | 무언가를 **더 찾는다** | ‡ t03 |

- 버그 수정문 두 줄을 반대로 읽으면: **Overload Core 는 r1 부터 떨어지는 게 의도**(1.0.4) · **Spectral Construct(레이드) 완료는 해금 조건이 아니다**(1.3 베타). 진짜 해금 조건은 원문 없음
- Overload Core 는 1.2 의 「Nemesis Overload」 크래프트 재료 · Pinnacle 업그레이드 재료

---

## 8. 채집 (4)

```
Blacksmith 랭크업 → Profession Hall (1000골드) → Mine(광물) / Forest(목재·약초) / Farm(농작)   각 2000골드
```

| 건물 | 랭크 | 효과 | 근거 |
|---|---|---|---|
| Profession Hall | r1 | **Mine · Forest · Farm 해금** | Deep Dive #5 · ‡ t01 |
| Profession Hall | r2 | 무언가 증가 · **Community Project 해금** | ‡ t02 · † |
| Mine · Forest · Farm | r1 | **직업 해금 + 도구 제작** | 0.6.7 "Tool crafting unlocks after purchasing Rank 1 of the Mine, Forest, or Farm" · ‡ t01 |
| Mine · Forest · Farm | r2 | **일꾼 슬롯 + 상위 재료 티어** | ‡ t02 · 개발자(itch.io) "if you need Plain Planks to upgrade the forest to Rank 2 you will get them from 'Plain' and 'Iron' weapons … level 15-49 monsters" |
| Mine · Forest · Farm | r3 | **직업 2종 + 도구 제작 2종** 추가 | ‡ t03 |
| Mine · Forest · Farm | r4 | **슬롯 2종 + 상위 재료 티어** | ‡ t04 |
| Mine · Forest · Farm | r5 | *슬롯·티어 틀 재사용* | 추정 |
| Mine · Forest · Farm | **r6** | **일꾼 슬롯 +1** | 0.7 "The Mine, Forest, and Farm Rank 6 Upgrade now grants an additional Worker Slot" |

- **랭크업 비용 = 다음 티어 재료.** 재료 티어는 장비 레벨대로 갈린다 — T1 1–14 · T2 15–49 · T3 50–99 · T4 100–124 · T5 125–149 · T6 150+([00_overview.md §6-2](00_overview.md)). 채집 건물을 올리려면 **그 티어 장비를 먼저 분해해 재료를 받아야** 한다 — 분해가 채집의 게이트다
- 1.0 무렵 첫 Primary Task 보상 **Rubies** 로 채집 건물을 r4 까지 올린다 †
- 기본 **20초에 1회** 수확 → Community Passive(Faster Gathering)로 **10초**
- **플라스크 재료(약초)와 젬 재료(보석)는 채집으로 공급된다** — 전투와 무관한 축이 전투 버프의 공급원
- 도구 — 몬스터 처치로 드롭 · 희귀도 · 채집 보너스 속성 [Deep Dive #5] · Soul Tools(2배 보너스)는 Agony 미션 보상 [0.7 Preview]

---

## 9. 해금 의존 그래프

```
Scrapper(50g) ── r1 ─▶ Blacksmith(100g) ── 랭크업 ─▶ Profession Hall(1000g)
   │                                                   ├─ r1 ─▶ Mine / Forest / Farm (각 2000g)
   │                                                   └─ r2 ─▶ Community Project
   └─ r6 ─▶ Artisan's Hall ─ r4·r5·r6 ─▶ (Blacksmith 에 Transmute · Imbue · Imprint)

2번째 맵 보스 ─▶ Barracks(400g)          Lv 20 ─▶ Armoury          Lv 30 무렵 ─▶ Alchemist's Hut
소켓 장비 첫 분해(Lv 50 무렵) ─▶ Gemcutter's Cabin ─ r3 ─▶ Item Vault
Lv 50~100 무렵 ─▶ Watchtower
Lv 100 ─▶ Map Room · Ancient Reliquary (동시)

Lv 150 ─▶ Bounty Board
Bounty 진행 ─▶ Keep · Castle (가이드 서술 순서)
             └─▶ Domain of Agony
                   ├─ Agony 미션 1회 완료 ─▶ Expedition(레이드) ─?─▶ Grand Expedition
                   ├─ Agony Level 4 ─▶ War Camp ─▶ 팩션 ─▶ Ancient Bastion 완료 ─▶ 건물 3종
                   │                                                    (Pinnacle ─▶ Endless · 나머지 2종 ?)
                   └─ Agony Level 6+ 보스 처치 ┐
Castle r3 ────────────────────────────────────┴─▶ Fortress

Hidden Vault ─── 조건 원문 없음 (Spectral Construct 는 아니다)
```

⚠ Keep · Castle 의 해금은 가이드의 서술 순서에 기댄 것이다. 레벨 게이트(20 · 30 · 50 · 100 · 150)는 **플레이어 기록**이라 정확한 트리거가 레벨인지 그 무렵의 다른 사건인지 모른다.

---

## 10. 게이트와 랭크 보상의 분포

### 10-1. 게이트의 종류

| 종류 | 사례 | 비중 |
|---|---|---|
| **다른 건물 랭크** | Scrapper r1 → Blacksmith · Scrapper r6 → Artisan's Hall · Profession Hall r1 → 채집 3종 · r2 → Community Project · Gemcutter r3 → Item Vault · Castle r3 → Fortress | **초반의 주류** |
| **아이템 경험** | 소켓 장비 첫 분해 → Gemcutter's Cabin | 한 건 — 「처음 본 것이 건물을 연다」 |
| **콘텐츠 진행** | 2번째 맵 보스 → Barracks · Agony 미션 → Expedition · Agony Level 4 → War Camp · Agony 보스 → Fortress · Ancient Bastion → Pinnacle | **중후반의 주류** |
| **캐릭터 레벨** | Armoury(20) · Map Room · Ancient Reliquary(100) · Bounty Board(150) | 굵직한 전환점마다 하나씩 |
| **재화 축적** | Bounty Board 랭크(Favour) · War Camp(Donation Credits) · Blacksmith 랭크(Fragment) · 채집 랭크(Rubies · 티어 재료) | 랭크업 자체는 대부분 재료 + 골드/전용 재화 |

> **초반은 건물이 건물을 열고, 후반은 콘텐츠가 건물을 연다.**

### 10-2. 랭크업이 주는 것

| 성격 | 사례 |
|---|---|
| **기능 해금** | Blacksmith r1 · r2~r6 · Gemcutter r1 · r2 · Castle r3 · Artisan's Hall r4~r6 · Fortress r4 · r5 · War Camp r4 · Hidden Vault r2 · Item Vault r4 · Alchemist's Hut r1 · r4 · 채집 r1 · r3 |
| **콘텐츠 입장** | Bounty Board r1 · War Camp r1 · Domain of Agony r1 · Expedition r1 · Grand Expedition r1 · Pinnacle r1 · Map Room r1 |
| **등급 해금** | Blacksmith r4 · r5(Legendary · Mythical 제작) |
| **슬롯 확장** | Armoury · Bounty Board · Domain of Agony r2 · Expedition r2 · r3 · Alchemist's Hut r5 · 채집 r2 · r4 · r6 · Hunt(Bounty r1 · War Camp r1) |
| **수치 증가** | Castle · Watchtower · Fortress r1~r3(하한·상한) · Watchtower r1(Nemesis 확률) · Ancient Reliquary r1~r3 · Scrapper r5 · Blacksmith r6 · Gemcutter r3 · r4 · War Camp r2 · Grand Expedition r2 · Pinnacle r2 · Domain of Agony r4 · Keep r2 |
| **자동화** | Scrapper r3 · Artisan's Hall r1 · r3 · Barracks · Community Project r3 · r4 · Bounty Board r2 · Alchemist's Hut r7 · Gemcutter r5 |

> **한 건물의 랭크는 한 주제를 계단으로 판다** — Alchemist's Hut 은 제작 → 위력 → 용량 → 고급 → 슬롯 → 자동, Castle · Fortress 는 최소 속성 수 → 최소 랭크 → (최대 랭크) → 크래프트. 매 랭크를 새 기능으로 채우지 않고, **소수의 게이트 랭크**(Scrapper r6 · Castle r3 · Artisan's Hall r4~r6 · Alchemist's Hut r7 · Item Vault r4)에 핵심 기능을 둔다.
> **자동화 해금이 건물 아홉 곳에 흩어져 있다** — 방치형에서 「손이 덜 가는 것」 자체가 진행 보상이다.

---

## 11. 재화·비용

| 통화 | 획득처 | 소모처 |
|---|---|---|
| **골드** | 전투·판매 | 건설비 — Scrapper 50 · Blacksmith 100 · Barracks 400 · Profession Hall 1000 · Mine/Forest/Farm 각 2000 † · Scrapper 다음 랭크 100 + 재료 † · 0.5.3 에 Barracks 전 랭크 인하 |
| **Fragment** | ⚠ 두 종류 — 아래 | Blacksmith 랭크업 (0.8 에 대폭 인하) |
| **Favour** | 바운티 클리어 | **Bounty Board 랭크업** · 일부 다른 건물 · 바운티 리롤·포기 |
| **Donation Credits** | Community Project 재료 기부 | Community Passives · **War Camp 건설·랭크업** † |
| **Rubies** | Primary Task 등 | 채집 건물 랭크업 † |
| **Soul Cloth** | ? | **Grand Expedition r2** |
| **Overload Core** | Hidden Vault r1 이 여는 조우 | **Pinnacle 업그레이드(25개)** † · Nemesis Overload 크래프트 |
| 코어 / 파편 / 룬 / 글리프 | 하위 등급 아이템 분해 | Ancient Reliquary 랭크업 (0.7 에 Uncommon Rune · Glyph 제외) |
| **Obsidian** | Agony 미션 | Domain of Agony r4 가 획득량 +50% |
| **T1~T6 재료** | 그 티어 장비 분해 · 채집 | 건물 랭크업 전반 — 0.8 에 T4·T5 요구량 인하 · 1.0 베타에 T6 인하 · 1.2 에 Domain of Agony 이전 건물 전부 인하 |

**Fragment 는 둘이다** [확정 — 둘 다 개발자 답변]
- **Socket Fragment** — 소켓 달린 아이템을 분해해서 얻는다
- **Nemesis Fragment** — Nemesis 아이템이 가방 칸이 없거나 「Always Auto Scrap」으로 자동 분해되면 대신 나온다
- **Blacksmith 랭크업의 「Fragment」가 어느 쪽인지는 원문 없음**

⚠ **랭크업 비용의 체계적 목록은 없다.** 건설비 6건과 「티어 재료가 든다」는 구조, 인하 이력뿐이다.

---

## 12. 본작 시사점 — 안 가기로 한 길

**본작은 이 축을 이미 닫았다.**

> **파견처에 건설·업그레이드 없음** — 손잡이는 둘. 가짓수 = 챕터 해금 / 세기 = 배치된 영웅. 레벨을 두면 같은 결과를 미는 축이 둘이 되어 배치 결정이 흐려진다
> — [GAME_DESIGN.md §9](../../game_design/GAME_DESIGN.md) 08-26 확정

그래서 이 문서는 설계도가 아니라 **대조표**다. 그럼에도 옮길 값이 있는 것과 없는 것이 갈린다.

### 12-1. 옮길 값이 있는 것

| # | 원리 | 본작에서 이미 쓰이거나, 쓸 자리 |
|---|---|---|
| 1 | **한 건물의 랭크가 한 주제를 계단으로 판다 · 소수의 게이트 랭크에 기능을 몬다** (§10-2) | 성장 곡선 설계 일반. 「성장할 때마다 기능이 하나씩 열린다」(GAME_DESIGN §1)와 같은 사고 |
| 2 | **하한과 상한을 별개 비용으로 판다** (Castle ↔ Watchtower) | 아이템 개조 계단 — [item_design.md](../../game_design/item_design.md) 낙인 크래프트의 참고 |
| 3 | **체이스에 확정 경로를 붙인다** (Item Vault r4) | 유니크 수집의 천장. GAME_DESIGN §10 「긴 체이스」 |
| 4 | **되돌릴 수 있는 난이도 다이얼** (Bounty → Fame ↔ Infamy) | **접속 층을 두껍게 하는 후보** — GAME_DESIGN §10 「접속 층(§3-1 ①)의 두께」 |
| 5 | **자동화 해금이 곧 진행 보상** — 건물 아홉 곳에 흩어져 있다 (§10-2) | 본작은 처음부터 자동전투라 이 카드를 안 쥐고 시작한다 — 쓸 수 있는 자리가 남았는지 검토 대상 |
| 6 | **레벨이 시스템을 열고, 건물이 슬롯을 판다** (Hunt — Lv 101 · Bounty Board r1 · War Camp r1) | 기능 해금과 동시 가동 수를 다른 손잡이에 나눠 다는 사례 |
| 7 | **처음 본 것이 기능을 연다** (소켓 장비 첫 분해 → Gemcutter's Cabin) | 해금을 「보여 주고 나서 연다」 — 튜토리얼 없이 새 시스템을 소개하는 방법 |

### 12-2. 옮기면 안 되는 것

| # | 이유 |
|---|---|
| **건물에 랭크를 다는 것 자체** | 08-26 확정을 정면으로 뒤집는다. 「가짓수 = 챕터 / 세기 = 배치된 영웅」 두 손잡이가 셋이 된다 |
| **건물이 건물을 여는 연쇄** | 초반의 주류인데, 본작은 **해금 게이트를 챕터 클리어로 확정**했다(GAME_DESIGN §1). 게이트 주인이 둘이 된다 |
| **26종이라는 가짓수** | 본작 파견처는 다섯이고 「짓거나 올리는 개념이 없다」. 가짓수를 늘리는 압력의 근거로 이 문서를 인용하지 말 것 |

### 12-3. 가장 큰 대조 — 파워가 어디를 통과하나

**Lootun의 건물 26종 중 로스터 전원의 전투 능력치를 올리는 것은 하나도 없다.**

- Keep · Castle · Watchtower · Fortress 는 **아이템의 천장**을 올린다 — 캐릭터가 세지는 게 아니라 아이템이 더 세질 수 있게 된다
- Alchemist's Hut 의 위력 · 용량은 **소모품**을 통과한다
- Community Passives 는 **경제·채집만** 다룬다
- 나머지는 기능 해금 · 슬롯 · 자동화 · 콘텐츠 입장
- War Camp r1 의 「추가 스킬 · 캐릭터 파워」는 건물이 아니라 **팩션 콘텐츠**가 준다

> **Lootun의 파워는 전부 아이템을 통과한다. 건물은 아이템의 천장을 올릴 뿐이다.**

본작 [battle_design.md §9-4](../../game_design/battle_design.md)의 **「레벨 = 진입 자격 / 장비 = 세기」**와 같은 철학이다. 본작이 계정 단위로 **능력치를 직접 주는 시스템**(연구)을 두기로 했다면, **그건 Lootun에 선례가 없는 축**이라는 뜻이고 밸런스를 참고작에 기댈 수 없다.

---

## 13. 정정 대장

| # | 이전 서술 | 지금 | 근거 |
|---|---|---|---|
| 1 | 정체 미상 4종 | Expedition · Fortress · Pinnacle · Grand Expedition 모두 역할 확인 | 패치노트 · 개발자 · 언어 파일 |
| 2 | Gemcutter's Cabin r3 = 젬 보관 탭 | 0.9.4 에 Item Vault 로 분리 · 1.0 의 r3 = 몬스터 젬 드롭 | 0.9.4 · 언어 파일 |
| 3 | Domain of Agony r4 = 너프 | 슬롯 +4 를 흑요석 +50% 로 **교체** | 1.2 |
| 4 | Keep — P1~P10 이 속성 상한 10→20 | Paragon 최대 레벨 10 → 20 확장(1.2)과 속성 상한을 구분 | 1.2 |
| 5 | Fortress 해금 = War Camp 몇 랭크? | **Castle r3 + Agony 보스 처치** | 0.9 · 개발자 |
| 6 | Hidden Vault r2 = Overload Core 드롭 게이트 | 그 게이트는 **버그였다** — Overload Core 는 r1 부터 | 1.0.4 · 개발자 |
| 7 | War Camp 해금 = Domain of Agony 미션 마스터리 4 | **Agony Level 4**(모디파이어 수) | 가이드 · 0.7 Preview |
| 8 | Alchemist's Hut r1 = Dandelion 요구 제거 | r1 **비용**에서 Dandelion 제외 — r1 효과는 플라스크 제작 | 0.6 · 언어 파일 |
| 9 | Ancient Reliquary = 유니크 강화 메뉴 | 그건 0.9 의 유니크 인벤토리 「Reliquary」 — 건물은 **보너스 단계** | 0.9 · 1.1 · 언어 파일 |
| 10 | Community Project r2 = 자동 기부(추정) | r2 = Community Passives · **r3 = 자동 기부** | 개발자 · 언어 파일 |
| 11 | Artisan's Hall r5 또는 r6 (출처 갈림) | **Transmute r4 · 크래프트 2종 r5 · Imprint r6** | 0.7.1 · 언어 파일 · 일본어 블로그 |
| 12 | Map Room 해금 = Lv 100 부근 | **Lv 100 · Ascendancy Challenge 2** · r1 없으면 Lv 100+ 미션 불가 | 개발자 · 가이드 |
| 13 | Expedition 난이도 Normal/Heroic/Mythic | 0.9 도입 때 2종, Mythic 은 1.2 · r2 · r3 = 로드아웃 슬롯 | 0.9 · 0.9.0.6 · 1.2 |
| 14 | Alchemist's Hut r7 = 0.9 베타 신설 | 0.5.8(Steam 출시 전)부터 · 0.9 는 토글 UI | itch.io · 0.9 |
| 15 | 도전과제 「Upgrade Perfection」 대상 15종 ? | **아무 건물 15개** 풀업 | 도전과제 원문 |
| 16 | Blacksmith 건설 = 기본 개조 5종 | r1 = 레시피 제작 · r2~r5 = 개조 크래프트 · r6 = 추가 랭크 확률 | 개발자 · 언어 파일 |
| 17 | Fragment 획득처 ? | 두 종류(Socket · Nemesis) — 랭크업에 쓰는 쪽은 ? | 개발자 |
| 18 | Scrapper r2 가 분해를 연다 | 분해는 r1 부터 — r2 잠금은 버그였다 | 0.7 |
| 19 | Barracks 해금 = 첫 존 보스 | **2번째 맵(Graveyard) 보스** | 일본어 블로그 |
| 20 | Gemcutter's Cabin 해금 = Community Project 업그레이드와 동시 | **소켓 장비 첫 분해** (시기가 겹쳤을 뿐) | 일본어 블로그 |

---

## 14. 출처 · 끝내 못 찾은 것

### 14-1. 원문 위치

- Steam 공식 뉴스 — `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=1960270&count=1000&maxlength=0`
- Steam 토론 — 「Lootun Developer Questions」 `steamcommunity.com/app/1960270/discussions/0/3275816470981302593/`(21p) · Hunt 슬롯 `…/0/596279819757476771/` · 레시피 `…/0/3435703754810182355/` · Beta Feedback 「Final upgrade not unlocking?」 `…/discussions/1/6126615404783131966/`
- 언어 파일 — `blog.naver.com/agmserver/223464035576`(한) · `github.com/benqy/lootun-chinese-language`(중)
- 기록 — Steam 가이드 id=3044062918 · id=2870906456 · `quo-gd.hatenablog.com/entry/2024/06/13/025615` · `arrowsoft.itch.io/lootun/devlog` · r/Lootun(Wayback Machine)
- 도전과제 — `steamcommunity.com/stats/1960270/achievements/` · Exophase

**없거나 막힌 곳** — 나무위키(문서 없음) · 아카라이브 · 루리웹(0건) · 디시인사이드(빌드 글뿐) · 일본 공략 위키 jp.t-lcl.com(403) · bilibili · 小黑盒(빈 응답) · 百度贴吧(403) · 바하무트(개요뿐) · Reddit 직접 접속(차단 — Wayback 으로 우회) · SteamDB(403) · Steam 워크숍 번역 파일(최신 2026-07 판이 있으나 Steam 클라이언트로만 받는다)

### 14-2. 끝내 못 찾은 것

| 항목 | 상태 |
|---|---|
| **모든 수치** — 각 랭크의 `{0}` 값 · 랭크업 비용 | 게임 데이터 안에만 있다 |
| **대부분 건물의 최대 랭크** | 틀 재사용 때문에 언어 파일로도 셀 수 없다 · 도전과제는 「Fully upgrade」만 말한다 |
| Ancient Bastion 완료 시 열리는 **나머지 2종의 이름** | 질문자가 「3개」라고 적었을 뿐 |
| **Hidden Vault · Grand Expedition 의 해금 조건** | 버그 수정문의 반례뿐 |
| Blacksmith r2~r5 · Fortress r4 · r5 · Hidden Vault r2 가 여는 **크래프트 이름** | 틀에 `{0}` 로만 |
| 채집 r3 「직업 2종」이 무엇인지 | — |
| 1.0 이후 추가된 랭크 (Watchtower r6 의 1.2 판 등) | 언어 파일이 1.0 판 — 최신 번역본은 워크숍에만 있다 |
| **Blacksmith 랭크업 Fragment 가 Socket 인지 Nemesis 인지** | — |

⚠ 남은 경로는 **게임 클라이언트**뿐이다 — 툴팁을 직접 보거나, 워크숍의 최신 번역 파일(Steam 클라이언트 필요)을 받는 것.

---

## 15. 부록 — 언어 파일 랭크 문구 77줄

`Korean.txt`(AI 한글패치 · 1.0 · 2024-05) 원문 그대로. `{n}` 은 런타임에 채워진다. 번호 = 그 틀을 처음 쓰는 랭크(§0-3). 뜻이 흐린 줄은 중국어판으로 대조했다(§0-3 ④). `professionBuilding` 은 Mine · Forest · Farm 공통.

```
scrapper_rankText_01={0}에 대한 접근을 잠금 해제하여 아이템을 폐기하여 원자재로 사용할 수 있습니다.
scrapper_rankText_02={0}의 추가 모든 채우기 옵션을 잠금 해제합니다.
scrapper_rankText_03={0} 아이템을 자동으로 폐기할 수 있는 능력을 해제합니다.
scrapper_rankText_05=장비 폐기 시 {0} 확률로 희귀도 코어를 추가로 획득할 수 있습니다.
blacksmith_rankText_01={0} 접근을 해제하고 장비를 제작할 수 있는 능력을 얻습니다.
blacksmith_rankText_02={0} 능력 잠금 해제.
blacksmith_rankText_04={0} 및 {1} 장비를 제작할 수 있는 능력을 잠금 해제합니다.
blacksmith_rankText_06={1}이(가) 추가 랭크를 제공할 확률 {0}을(를) 부여합니다.
artisansHall_rankText_01={0} 자동으로 여는 기능을 잠금 해제합니다. 가방 설정 메뉴에서 설정할 수 있습니다.
artisansHall_rankText_03={0} 및 {1} 아이템을 자동으로 분해할 수 있는 능력을 해제합니다.
artisansHall_rankText_04={1}에서 {0}을(를) 사용할 수 있는 능력이 잠금 해제됩니다.
artisansHall_rankText_05={2}에서 {0} 및 {1}을(를) 할 수 있는 능력을 잠금 해제합니다.
gemcutters_rankText_01={1}에서 {0}을(를) 제작할 수 있는 능력을 잠금 해제합니다.
gemcutters_rankText_02={1}에서 {0}을(를) 실행할 수 있는 능력을 잠금 해제합니다.
gemcutters_rankText_03=레벨 {1}에서 처치된 각 {0}에게 {2}를 드롭할 확률을 부여합니다.
gemcutters_rankText_04=레벨 {1}에서 처치된 각 {0}에게 {2}를 드롭할 확률을 부여합니다.
gemcutters_rankText_05=장착하는 각 장비의 소켓을 자동으로 최대화하는 설정을 잠금 해제합니다. 필요한 자재가 있어야 하며, 이 설정은 {1}의 {0}에서 찾을 수 있으며 캐릭터별로 적용됩니다.
alchemistsHut_rankText_01={0}을(를) 제작할 수 있는 능력이 잠금 해제됩니다.
alchemistsHut_rankText_02={0}의 강도를 업그레이드할 수 있는 능력을 잠금 해제합니다.
alchemistsHut_rankText_03={0}의 용량을 업그레이드할 수 있는 능력을 잠금 해제합니다.
alchemistsHut_rankText_04=고급 {0}을(를) 제작할 수 있는 능력을 잠금 해제합니다.
alchemistsHut_rankText_05=추가 {0} 잠금 해제.
alchemistsHut_rankText_07={0}을(를) 자동으로 리필할 수 있는 능력을 잠금 해제합니다.
communityProject_rankText_01=여분의 자재를 {0}로 기부할 수 있는 능력을 해제합니다.
communityProject_rankText_02={1}으로 {0}을(를) 구매할 수 있는 능력을 잠금 해제합니다.
communityProject_rankText_03=초과 재료는 자동으로 기부됩니다.
communityProject_rankText_04=각 머티리얼에 대한 자동 기부 임계값을 설정하는 기능을 잠금 해제하십시오.
keep_rankText_01={1}에서 최대 레벨 {2}까지 {0}할 수 있는 능력을 해제합니다.
keep_rankText_02={0} 아이템을 최대 레벨 {1}까지 업그레이드할 수 있는 기능을 잠금 해제합니다.
castle_rankText_01={0} 아이템은 이제 최소 {1} {2} 속성으로 롤합니다.
castle_rankText_02={0} 속성은 이제 최소 랭크 {1}로 롤링됩니다.
castle_rankText_03={1}에서 항목을 {2} 항목으로 변환하는 {0} 수행할 수 있는 기능을 잠금 해제하십시오.
watchtower_rankText_01=각 몬스터가 {1}으로 생성될 추가 확률을 얻습니다.
watchtower_rankText_02=이제 {0} 속성이 최대 랭크 {1}까지 롤링될 수 있습니다.
watchtower_rankText_03={0} 아이템은 최대 {1} {2} 속성을 가질 수 있습니다.
watchtower_rankText_06=이제 {0} 보스가 {1} 보상 상자를 드롭할 수 있습니다.
fortress_rankText_01={0} 아이템은 이제 최소 {1} {0} 속성으로 롤합니다.
fortress_rankText_02={0} 속성은 이제 최소 랭크 {1}로 롤링됩니다.
fortress_rankText_03=이제 {0} 속성이 최대 랭크 {1}까지 롤링될 수 있습니다.
fortress_rankText_04={1}에서 {0}을(를) 실행할 수 있는 능력을 잠금 해제합니다.
fortress_rankText_05={1}에서 {0}을(를) 실행할 수 있는 능력을 잠금 해제합니다.
barracks_rankText_01=각 캐릭터의 {1} 설정할 수 있는 {0} 패널을 잠금 해제합니다.
barracks_rankText_02={1} 및 추가 {2} 옵션을 위한 {0} 설정을 잠금 해제합니다.
armoury_rankText_01={0} 미션 {1} 슬롯 잠금 해제.
armoury_rankText_02=추가 {1} 슬롯 {0} 잠금 해제.
bountyBoard_rankText_01=미션 메뉴에서 {0}를 실행할 수 있는 능력을 해제합니다.
bountyBoard_rankText_02=추가 {0} {1} 슬롯을 잠금 해제하고 보상 자동 수령 기능을 부여합니다. (자동 보상 수령 기능은 미션 준비 메뉴에서 찾을 수 있습니다.)
bountyBoard_rankText_03=추가 {1} 슬롯 {0} 잠금 해제.
warCamp_rankText_01=임무 메뉴에서 {0} 사용할 수 있는 권한을 부여합니다. {0} 추가 스킬, 캐릭터 파워 및 새로운 던전 이용 권한을 부여합니다.
warCamp_rankText_02={2}에서 {1} 더 많은 {0} 획득
warCamp_rankText_04={2}에서 {0}만큼 더 많은 {1}을 얻고 {3} 제작을 {4}에서 해제합니다.
domainOfAgony_rankText_01=임무 메뉴에서 {0} 실행할 수 있는 기능을 잠금 해제합니다. {2}에서 {1}할 수 있는 기능을 잠금 해제합니다.
domainOfAgony_rankText_02=추가 {1} 슬롯 {0} 잠금 해제.
mapRoom_rankText_01=모든 {0}을 현재의 최대 레벨로 조정할 수 있는 능력을 해제합니다.
mapRoom_rankText_02={0} 증가 {1}
mapRoom_rankText_03=향상된 보상을 제공하는 새로운 {0} 업그레이드를 해제합니다.
ancientReliquary_rankText_01=미션 단계를 완료한 후 보너스 단계를 찾을 {0} 확률을 부여합니다. 보너스 단계에는 시간 내에 처치하면 {2} 아이템을 {3} 이상의 품질로 떨어뜨리는 {1}이(가) 포함되어 있습니다. 새로운 미션 전문 지식 업그레이드를 잠금 해제합니다.
ancientReliquary_rankText_02=임무 스테이지 완료 후 보너스 스테이지를 찾을 수 있는 {0} 확률을 추가로 부여합니다.
ancientReliquary_rankText_03={0} 처치하면 {2} 이상의 {1} 아이템을 추가로 떨어뜨립니다.
expedition_rankText_01=임무 메뉴에서 {0} 사용할 수 있는 권한을 부여합니다. {0} 6명의 캐릭터로 구성된 팀이 필요한 도전적인 만남입니다.
expedition_rankText_02=각 캐릭터에 대해 두 번째 {0} 슬롯이 잠금 해제됩니다.
expedition_rankText_03=각 캐릭터에 대해 세 번째 {0} 슬롯이 잠금 해제됩니다.
grandExpedition_rankText_01={1} 모드에서 {0} 전투를 완료할 수 있는 능력을 잠금 해제합니다.
grandExpedition_rankText_02=레이드에서 {0}의 경험치, 루비, 재료 보상을 제공합니다.
pinnacle_rankText_01={0} 미션 접근 권한 부여.
pinnacle_rankText_02={2} 임무에서 {0} 더 많은 {1} 경험치를 획득합니다.
itemVault_rankText_01=많은 수의 {1}을 저장할 수 있는 {0}을 해제합니다.
itemVault_rankText_02={1} 내에서 {0}을(를) 저장할 수 있는 능력을 잠금 해제합니다.
hiddenVault_rankText_01={0} {1} 조우는 이제 드물게 {2}을(를) 보상으로 제공합니다.
hiddenVault_rankText_02={0} 제작 해제
hiddenVault_rankText_03={0} 더 찾기 {1}
professionHall_rankText_01={0}, {1}, 및 {2} 업그레이드 건물을 잠금 해제합니다.
professionHall_rankText_02={0}이(가) {1} 증가
professionBuilding_rankText_01={0} 전문 기술을 잠금 해제하고 {0} 도구를 제작할 수 있는 능력을 부여합니다.
professionBuilding_rankText_02=추가 {0} 슬롯을 잠금 해제하고 더 높은 등급의 재료를 사용할 수 있습니다.
professionBuilding_rankText_03={0} 및 {1} 전문 기술을 잠금 해제하고 {0} 및 {1} 도구를 제작할 수 있는 능력을 부여합니다.
professionBuilding_rankText_04=추가 {0} 및 {1} 슬롯을 잠금 해제하고 더 높은 등급의 재료를 사용할 수 있습니다.
```

(파일에는 `castle_rankText_03` · `gemcutters_rankText_05` 가 번역자 메모로 한 번 더 있다 — 위에서 뺐다.)

---

*마지막 업데이트: 2026-09-21*
