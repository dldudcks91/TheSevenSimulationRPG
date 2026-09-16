# Diablo 4 몬스터 전수 조사

> 조사 범위: D4 베스티어리(Compendium)의 몬스터 계열(Monster Family) 19종 전수 + 월드보스·캠페인/엔드게임 보스·던전 보스·스트롱홀드 보스 + Elite 접두(Affix) 체계. 확장팩 **Vessel of Hatred**(나한투 지역·2024-10)·**Lord of Hatred**(2026-04)의 신규 지역·보스 포함.
> 출처: Maxroll(`monster-families`) · Fextralife(`Enemies`·`Bosses`·`Elites`) · WebSearch 종합. 상세 위키·가이드는 각주로 남기지 않고 표 안에 [출처유형]을 달지 않았다 — 이 문서는 D4 자체가 목적이 아니라 **몬스터 종류의 폭**을 확보하는 것이 목적이라 개별 수치·패턴은 얕게, 계열·외형·맥락은 넓게 훑었다.
> ⚠ **한글명은 공식 한국어 로컬라이즈 대조 없이 직역/음역했다.** D4는 한국 서비스 중이라 공식 한글명이 따로 있을 수 있으나 이번 조사에서 대조하지 못했다 — 전부 **작업역**이라고 보고 쓸 것. 본작 SSOT가 아니며 `src/data/*.csv`로 옮기지 말 것.

---

## 1. 계열 지도 — 한눈에

D4는 몬스터를 도감(Compendium) 상에서 **19개 "Monster Family"**로 분류한다 — 이 분류축은 본작이 쓰는 Normal/Demon/Undead 3분류보다 세분화돼 있고, **인간 파벌(도적·식인종·광신도·기사단)까지 하나의 "계열"로 묶는다**는 점이 특징이다. 그 위에 **보스 전용 계층**(월드보스 4종 순환·캠페인 필수 보스·엔드게임 소환 보스·던전/스트롱홀드 보스)이 따로 있고, 어느 계열 몬스터에나 얹힐 수 있는 **Elite 접두(Affix)** 체계가 수직으로 관통한다 — 이건 "몬스터 종류"가 아니라 "같은 종류를 더 위험하게 만드는 수식어"라 §2 표에 넣지 않고 부록(§5)으로 뺐다.

**19계열**(본작 타입 추정 포함): Bandit(도적·Human) · Cannibal(식인종·Human) · Cultist(광신도·Human) · Demon(악마) · Dregs(나한투 광인·Human, VoH) · Drowned(익사자·Undead) · Fallen(하급 악마 임프) · Ghost(유령·Undead) · Goatman/Khazra(염소인간) · Hollows(타락체·나한투, VoH) · Knight(기사단·Human) · Lacuni(고양이수인·Beast, VoH) · Skeleton(해골·Undead) · Snake/Nangari(뱀인간) · Spider(거미) · Vampire(흡혈귀·Undead) · Werewolf(늑대인간·Beast) · Wildlife(야생동물·Beast) · Zombie(좀비·Undead). 여기에 **정식 "계열"로 묶이진 않지만 반복 등장하는 하위 부류**로 Fly/곤충(폭식 후보로 중요) · Treasure Goblin(탐욕 후보로 중요) · 시즌 한정 Construct(오만 후보) · The Risen(리퍼처 유령개)를 §2 끝에 별도로 얹었다.

지역 축 — Fractured Peaks(설산, 출시 기본) · Scosglen(습한 숲·해안) · Dry Steppes(건조 초원·사막) · Kehjistan(사막·도시) · Hawezar(늪지·역병) · **Nahantu**(정글, VoH 신규). 계열마다 주 출몰 지역이 갈리므로 §2 표의 "등장 지역·맥락" 열이 이 축을 겸한다.

---

## 2. 전수 표

### 2-1. 인간 파벌 계열 (Bandit · Cannibal · Cultist · Dregs · Knight)

| 계열 | 몬스터 (원어/영문) | 한글명(작업역) | 등장 지역·맥락 | 생김새·특징 | 죄종 태그 |
|---|---|---|---|---|---|
| Bandit | Scrapper | 스크래퍼 | 케지스탄·드라이 스텝스, 노상 도적단 | 둔기(메이스)를 든 근접 불량배 | 탐욕 |
| Bandit | Throat-splitter | 목따기꾼 | 케지스탄·드라이 스텝스 | 작은 단검 두 자루로 근접 난도질 | 탐욕 |
| Bandit | Marksman | 마크스맨 | 케지스탄·드라이 스텝스 | 석궁 원거리 사수 | 탐욕 |
| Bandit | Arsonist | 방화범 | 케지스탄·드라이 스텝스 | 땅에 폭발형 화살을 박아 지연 폭발 | 탐욕 |
| Cannibal | (근접·대검형) | 식인종(대검) | 드라이 스텝스, 추방된 야만인 집단 | 양손 대검으로 전방 휩쓸기 | 폭식 |
| Cannibal | (근접·할버드형) | 식인종(할버드) | 드라이 스텝스 | 가벼운 할버드로 도약 돌진 | 폭식 |
| Cannibal | Gorger | 고저 | 드라이 스텝스 | 이 계열 최대 체구, 양손 가시곤봉으로 넉다운 | 폭식 |
| Cannibal | The Maniac & The Cleaver | 매니악과 클리버 | 드라이 스텝스 | 도끼 두 자루씩 든 2인조, 무리 지어 빠르게 습격 | 폭식 |
| Cultist | Mother's Disciple | 어머니의 사도 | 하웨자르·케지스탄, 광신 교단 | 지팡이 마법사, 화염구 투척 | — |
| Cultist | Mother's Chosen | 어머니의 선택받은 자 | 하웨자르·케지스탄 | 단검 들고 정면 돌진 | — |
| Cultist | Mother's Herald | 어머니의 사자 | 하웨자르·케지스탄 | 체구가 큰 개체, 소환 의식을 집전 | — |
| Dregs | Propagator | 전파자 | 나한투 정글(VoH) — 환각식물에 중독돼 광란에 빠진 인간 | 양손 도끼로 참수 공격, 육중한 근접 | 분노 |
| Dregs | Pestilent | 역병꾼 | 나한투 정글(VoH) | 라크로스채 모양 무기로 원거리 투사체 | 폭식(약) |
| Dregs | Grappler | 그래플러 | 나한투 정글(VoH) | 갈고리 도구로 순식간에 거리를 좁힘 | 분노 |
| Dregs | Cultivator | 재배자 | 나한투 정글(VoH) | 다른 생물체 위에 올라타 폭발형 반딧불을 투척 | — |
| Knight | Knight Penitent(창) | 참회 기사(창) | 케지스탄·프랙처드 피크스, 종교 기사단 | 창을 든 정예 기사, 큰 배리어로 방어 | 오만(약) |
| Knight | Knight Penitent(대형 메이스) | 참회 기사(대형 메이스) | 케지스탄·프랙처드 피크스 | 거대 메이스 3연타 후 넉다운 | 오만(약) |
| Knight | Inquisitor | 심문관 | 케지스탄·프랙처드 피크스 | 원거리 주문 시전 마법사 | 오만(약) |
| Knight | Adherent | 신봉자 | 케지스탄·프랙처드 피크스 | 소형 메이스를 든 하급 기사 | — |
| Knight | Revenant Knight | 잔영 기사 | 케지스탄 「빛의 대성당」(Cathedral of Light) 캡스톤 던전 — 처치 시 아니무스(Animus) 드롭 | 정예(엘리트) 표식이 붙은 갑주 기사 | — |

### 2-2. 언데드 계열 (Drowned · Ghost · Skeleton · Vampire · Zombie · 기타 언데드)

| 계열 | 몬스터 (원어/영문) | 한글명(작업역) | 등장 지역·맥락 | 생김새·특징 | 죄종 태그 |
|---|---|---|---|---|---|
| Drowned | Man-O-War | 만오워 | **프랙처드 피크스를 제외한 모든 해안 지역**(스코스글렌·하웨자르 해안 중심) — 바다에서 올라온 언데드 | 브루트, 통나무를 내리쳐 물의 범람을 일으킴 | **시기** |
| Drowned | Wretch | 레치 | 해안 지역 전역 | 물폭탄을 던지는 원거리 마법사 | **시기** |
| Drowned | Tide Walker | 타이드 워커 | 해안 지역 전역 | 빛나는 곤봉을 든 소형 근접 | **시기** |
| Drowned | Deckhand | 데크핸드 | 해안 지역 전역 | 갈고리를 무기로 쓰는 소형 근접 | **시기** |
| Drowned | Merinth, the Drowned Witch | 메린스(익사자 마녀) | 해안 지역 — Drowned 무리의 리더 격 엘리트 | 무리를 이끄는 마녀형 지휘관 | **시기** |
| Drowned | Drowned Juggernaut | 익사자 거구병 | 해안 지역, 중장갑 변종 | Man-O-War보다 더 무거운 돌진형 브루트(변종) | **시기** |
| Ghost | Phantom | 팬텀 | 프랙처드 피크스, 세계 전역 던전 | 붉은 유령 마법사, 소환수의 보호를 받음 | — |
| Ghost | Ghost Archer(적) | 유령 궁수(적) | 프랙처드 피크스, 세계 전역 | 차징형 광선 공격, 방심하면 치명적 | — |
| Ghost | Vengeful Spirit(녹) | 복수의 영혼(녹) | 프랙처드 피크스, 세계 전역 | 적 유령의 녹색 근접 대응 개체 | — |
| Skeleton | Skeleton(근접) | 스켈레톤(근접) | 프랙처드 피크스·케지스탄, 세계 전역 | 검·도끼를 든 표준 근접 | — |
| Skeleton | Skeleton Archer | 스켈레톤 궁수 | 프랙처드 피크스·케지스탄, 세계 전역 | 활을 쓰는 원거리 개체 | — |
| Skeleton | Skeleton Turret | 스켈레톤 터렛 | 프랙처드 피크스·케지스탄, 세계 전역 | 사거리가 매우 길고 잘 안 보이는 은신형 저격수 | — |
| Vampire | Revenant | 레버넌트 | 프랙처드 피크스, 던전 위주 | 양손검을 쓰는 브루트 | 색욕 |
| Vampire | Ghoul(뱀파이어계) | 구울(뱀파이어계) | 프랙처드 피크스, 던전 위주 | 매우 빠른 속도로 무리 지어 몰려옴 | 색욕 |
| Vampire | Vampire(변신형) | 뱀파이어(변신형) | 프랙처드 피크스, 던전 위주 | 박쥐 형태와 피의 마법사 형태를 오가며 회피 | **색욕** |
| Zombie | Bloated Corpse-fiend | 부푼 시체귀 | 드라이 스텝스·하웨자르·프랙처드 피크스 | 정면 돌진, 피격 시 큰 피해 | 폭식 |
| Zombie | Shambling Corpse | 비틀걸음 시체 | 드라이 스텝스·하웨자르·프랙처드 피크스 | 전형적 좀비 거동, 사망 시 폭발 | 폭식 |
| Zombie | Ghoul(좀비계, 별도 위키 표기) | 구울(좀비계) | 세계 전역, 대규모 무리로 등장 | 마법적 기원을 가진 좀비형 언데드, 큰 무리로 몰림 | 폭식(약) |
| 기타(시즌형) | The Risen | 리즌 | 균열(Rupture)에서 출현 — 무덤개(Gravehound) 형상 | 처치 시 강화 오브를 드롭하는 언데드 사냥개(미확인 — 시즌 콘텐츠라 상시 로스터 여부 불확실) | — |

### 2-3. 악마·임프 계열 (Demon · Fallen · Hollows)

| 계열 | 몬스터 (원어/영문) | 한글명(작업역) | 등장 지역·맥락 | 생김새·특징 | 죄종 태그 |
|---|---|---|---|---|---|
| Demon | The Annihilator | 절멸자 | 지옥·케지스탄·헬타이드 | 정통 악마형 근접 브루트(미확인 세부) | — |
| Demon | The Soul Burner | 영혼 태우는 자 | 지옥·케지스탄·헬타이드 | 화염 계열 악마(미확인 세부) | 분노(약) |
| Demon | The Balrog(D4 자체 명명) | 발로그 | 지옥·케지스탄·헬타이드 | 화염 대형 악마 | 분노(약) |
| Demon | The Sin Eater | 죄악을 먹는 자 | 지옥·케지스탄·헬타이드 | 이름 자체가 "죄"를 모티프로 함(미확인 세부) | — |
| Demon | The Hellion | 헬리온 | 지옥·케지스탄·헬타이드 | 화염 계열 악마(미확인 세부) | 분노(약) |
| Demon | The Pitlord | 구렁의 군주 | 지옥·케지스탄·헬타이드 | 대형 화염 악마(미확인 세부) | 분노(약) |
| Demon | Succubus | 서큐버스 | 지옥·케지스탄·헬타이드 | 유혹형 악마 — 우리 hero_base "Succubus"와 동일 계열 | **색욕** |
| Demon | The Vile One | 사악한 자 | 지옥·케지스탄·헬타이드 | 대형 악마(미확인 세부) | — |
| Demon | Inferno Sisters | 인페르노 자매 | 지옥·케지스탄·헬타이드 | 자매(복수) 형태로 등장하는 화염 악마 | 분노(약) |
| Fallen | Fallen(일반) | 폴른(하급) | 프랙처드 피크스·케지스탄 — 지옥 하급 임프 군단 | 총알받이형 소형 임프 | 분노(약) |
| Fallen | Fallen Overseer | 폴른 감독관 | 프랙처드 피크스·케지스탄 | 맷집 있는 브루트형 | 분노(약) |
| Fallen | Fallen Lunatic | 폴른 광인 | 프랙처드 피크스·케지스탄 | 근접 시 자폭해 범위 피해 | 분노(약) |
| Fallen | Fallen Shaman | 폴른 주술사 | 프랙처드 피크스·케지스탄 | 화염구 마법사, **쓰러진 폴른을 부활시키는 것으로 악명** | 분노(약) |
| Hollows | Languisher | 랭기셔 | 나한투 정글(VoH) — 메피스토의 타르형 부패에서 태어난 존재 | 키가 큰 기사형 실루엣, 촉수로 뒤덮인 거대 팔 + 방패 | 폭식(약, 부패) |
| Hollows | Frother | 프로더 | 나한투 정글(VoH) | 거미개 형상, 원거리에서 몸을 날려 돌진 | 폭식(약, 부패) |
| Hollows | Malice | 말리스 | 나한투 정글(VoH) | 주변 Hollows를 강화하는 버퍼 | 폭식(약, 부패) |
| Hollows | Pallulater | 팔룰레이터 | 나한투 정글(VoH) | 순수 물량으로 밀어붙이는 무리형 | 폭식(약, 부패) |

### 2-4. 짐승·염소인간·고양이수인 계열 (Goatman/Khazra · Lacuni · Werewolf · Wildlife)

| 계열 | 몬스터 (원어/영문) | 한글명(작업역) | 등장 지역·맥락 | 생김새·특징 | 죄종 태그 |
|---|---|---|---|---|---|
| Goatman/Khazra | Blood Clan Marauder | 혈족 약탈자 | 드라이 스텝스 — "혈족(Blood Clan)"이 이들의 부족명 | 가장 작은 개체, 도끼 들고 재빠르게 무리 습격 | — |
| Goatman/Khazra | Blood Clan Mauler | 혈족 훼손자 | 드라이 스텝스 | 큰 대형 도끼, 상단 공격으로 넉다운 | — |
| Goatman/Khazra | Blood Clan Impaler | 혈족 관통자 | 드라이 스텝스 | 창을 던지는 원거리 개체 | — |
| Goatman/Khazra | Blood Clan Shaman | 혈족 주술사 | 드라이 스텝스 | 동료를 버프 — "최우선 처치 대상"으로 통함 | — |
| Lacuni | Lacuni Conjurer | 라쿠니 소환사 | 나한투 정글·황무지(VoH) | 새 소환 + 강력한 번개 공격 | — |
| Lacuni | Lacuni Stalker | 라쿠니 추적자 | 나한투 정글·황무지(VoH) | 근접 위주 고양이수인 | — |
| Lacuni | Lacuni Gorefiend | 라쿠니 유혈귀 | 나한투 정글·황무지(VoH) | 복합 근접 콤보 공격 | — |
| Lacuni | Lacuni Goredancer | 라쿠니 유혈무희 | 나한투 정글·황무지(VoH) | 활 공격과 근접 도약을 번갈아 구사 | — |
| Werewolf | Werewolf(표준) | 웨어울프 | 스코스글렌·프랙처드 피크스 | 멀리서도 냄새로 플레이어를 감지해 선제 공격 | — |
| Werewolf | Firewalker | 파이어워커 | 스코스글렌·프랙처드 피크스 | 화염 돌진기 + 은신(비가시화) | — |
| Wildlife | Bear | 곰 | 스코스글렌·프랙처드 피크스 | 특수 능력 없는 근접 야생동물, 타격이 묵직함 | — |
| Wildlife | Thorned Beast(Quillrat) | 가시짐승(퀼래트) | 스코스글렌·프랙처드 피크스 | 가시(바늘)를 원거리로 발사 | — |
| Wildlife | Tuscan Charger | 투스칸 차저 | 스코스글렌·프랙처드 피크스 | 돌진형 야생동물 | — |
| Wildlife | Wildwood(Wood Wraith) | 우드레이스(나무정령) | 스코스글렌·프랙처드 피크스 | 나무 형상의 몬스터가 직접 공격 | — |

### 2-5. 뱀·거미·곤충 계열 (Snake/Nangari · Spider · Fly — Fly는 정식 계열 아님)

| 계열 | 몬스터 (원어/영문) | 한글명(작업역) | 등장 지역·맥락 | 생김새·특징 | 죄종 태그 |
|---|---|---|---|---|---|
| Snake/Nangari | Nangari Spitter | 낭가리 토출자 | 하웨자르 늪지 — "낭가리"는 변이한 뱀인간 부족명 | 독을 원거리 투사, 계열 중 가장 뱀에 가까운 외형 | **시기** |
| Snake/Nangari | Nangari Oracle | 낭가리 예언자 | 하웨자르 늪지 | 산성 폭탄 다중 투척 + 감시용 안구 소환 | **시기** |
| Snake/Nangari | Nangari Longfang | 낭가리 롱팽 | 하웨자르 늪지 | 거대한 송곳니를 가진 근접 브루트 | **시기** |
| Spider | Big Spider | 대형 거미 | 드라이 스텝스(희귀)·던전 위주 | 계열의 주력 개체 | **시기(약, 기생/증식)** |
| Spider | Spiderling | 새끼 거미 | 드라이 스텝스(희귀)·던전 위주 | 소형 변종, 무리로 증식 | 시기(약) |
| Spider | Spider Host | 거미 숙주 | 드라이 스텝스(희귀)·던전 위주 | **인간 숙주에 기생한 거미** — 처치 시 추가 거미를 낳음 | **시기(기생 정확히 일치)** |
| Fly(비정식) | Fly Host | 파리 숙주 | 케지스탄·하웨자르 | 걸어 다니며 몸에서 파리 떼를 낳아 공격시킴 | **폭식(정확히 일치)** |

### 2-6. 보물 도깨비(March of the Goblins 이벤트) — 탐욕 전용 후보군

| 계열 | 몬스터 (원어/영문) | 한글명(작업역) | 등장 지역·맥락 | 생김새·특징 | 죄종 태그 |
|---|---|---|---|---|---|
| Treasure Goblin | Treasure Goblin(기본) | 보물 도깨비 | 세계 전역(희귀 스폰) | 피격 시 포털로 도주, 처치하면 루팅 폭발 | **탐욕** |
| Treasure Goblin | Odious Ector | 오디어스 엑터 | 세계 전역(이벤트) | 처치 시 제작 재료(고난이도에서 Obducite) 드롭 | **탐욕** |
| Treasure Goblin | Gilded Baron | 도금 남작 | 세계 전역(이벤트) | 다량의 골드 드롭 — "황금 그 자체"인 변종 | **탐욕** |
| Treasure Goblin | Glittering Prym | 반짝이는 프림 | 세계 전역(이벤트) | 보석 조각·룬·언더시티 공물 드롭 | **탐욕** |
| Treasure Goblin | Curious Murl | 호기심 많은 멀 | 세계 전역(이벤트) | 오볼 주머니 드롭(최대치 넘어도 습득) | **탐욕** |
| Treasure Goblin | Gelatinous Syrus | 젤라틴 사이러스 | 세계 전역(이벤트) | 처치 시 여러 마리로 분열 | 탐욕 |
| Treasure Goblin | Fancy Old Fedric | 화려한 노년 페드릭 | 세계 전역(초희귀 스폰, "백만 분의 1") | 미식(Mythic) 유니크 + 광휘 조각(Resplendent Spark) 드롭 | **탐욕** |

### 2-7. 보스 계열 — 월드보스 · 캠페인/엔드게임 보스 · 던전 보스 · 스트롱홀드 보스

| 계열 | 몬스터 (원어/영문) | 한글명(작업역) | 등장 지역·맥락 | 생김새·특징 | 죄종 태그 |
|---|---|---|---|---|---|
| 월드보스 | Ashava, the Pestilent | 아샤바(역병의) | 스코스글렌 등, 최대 12인 협력 월드보스 | 역병을 두른 용형 거수 | **폭식(역병)** |
| 월드보스 | Avarice, the Gold Cursed | 아바리스(황금에 저주받은) | 케지스탄 동부, 월드보스 | 2족 악마, 오른손 황금 망치+왼손 사슬 보물상자 | **탐욕** |
| 월드보스 | Wandering Death, Death Given Life | 방황하는 죽음 | 월드보스 순환 | 죽음 광선·죽음 크레이터를 쓰는 거대 해골형 괴물 | — |
| 월드보스 | Azmodan, Lord of Sin | 아즈모단(죄악의 군주) | 월드보스 순환 | 고전 시리즈부터 이어진 대형 악마 — 이름이 "죄악" 총론이라 특정 죄종보다 상위 개념 | —(총론) |
| 캠페인 | Lilith | 릴리스 | 캠페인 최종보스 겸 엔드게임(Echo of Lilith/우버 릴리스) | 메인 빌런, 유혹적 실루엣 + "만물의 어머니"를 자처 | **색욕** |
| 캠페인 | Astaroth | 아스타로스 | 2막(스코스글렌), 캠페인 필수 보스 | 3두 지옥견을 타고 등장하는 악마 장수 | 분노 |
| 캠페인 | Andariel, Maiden of Anguish | 안다리엘(고뇌의 처녀) | 4막, 캠페인 필수 보스 | 나무 구조물에 결박된 4팔 거인형, 전 속성 공격 | — |
| 캠페인 | Duriel, Lord of Pain | 듀리엘(고통의 군주) | 캠페인 후반 필수 보스(지옥行 직전) | **거대 구더기(maggot) 형상**의 악마 | **폭식(벌레)** |
| 캠페인 | Elias | 엘리아스 | 1막, 타락한 인간 사도 | 인간에서 타락한 최초 보스 | — |
| 캠페인 | X'Fal, the Scarred Baron | 흉터의 남작 X'Fal | 캠페인 중반 | 악마 군주급 보스(미확인 세부) | — |
| VoH 캠페인 | Airidah, Keeper of the Dead | 아이리다(죽은 자의 수호자) | Vessel of Hatred 확장 캠페인 | 네크로맨서형 적대자 | — |
| VoH 캠페인 | Amalgam of Rage | 분노의 응집체 | Vessel of Hatred 확장 캠페인 | 이름 자체가 "분노"의 화신 | **분노(이름 일치)** |
| VoH 캠페인 | Genbar, the Shrine-Keeper | 사당지기 겐바르 | Vessel of Hatred 확장 캠페인 | 사당(신전)을 수호하는 보스(미확인 세부) | — |
| VoH 캠페인 | Ninsa, Blight of Hatred | 닌사(증오의 역병) | Vessel of Hatred 확장 캠페인 | "블라이트(역병)"라는 이름 | 폭식(약) |
| VoH 캠페인 | Harbinger of Hatred | 증오의 선구자 | Vessel of Hatred 확장 최종보스 | 나한투 서사의 절정부 보스(미확인 세부) | — |
| VoH 캠페인 | Urivar | 우리바르 | Vessel of Hatred 확장 캠페인 | 나한투 보스(미확인 세부) | — |
| LoH 캠페인 | Mephisto, Lord of Hatred | 메피스토(증오의 군주) | Lord of Hatred 확장 최종보스 — 인간 예언자로 위장해 있다가 본모습 노출 | 부패한 물웅덩이 전장, 타락한 손(Hands of Malice) 소환 | — |
| LoH 콘텐츠 | Rathma's Golem | 라스마의 골렘 | Lord of Hatred 확장 보스 | 거대 골렘/구조물형 보스 | 오만(약, 조각상·구조물) |
| 엔드게임 | Grigoire, the Galvanic Saint | 그리구아르(번개의 성인) | 엔드게임 소환 보스(재료 필요) | **번개 속성 + "성인" 모티프 + 거대 석상형 실루엣** | **오만(원소·결 모두 일치)** |
| 엔드게임 | Echo of Varshan | 바르샨의 메아리 | 엔드게임 소환 보스 | 언데드 켄타우로스형 지휘관 | — |
| 엔드게임 | Lord Zir | 로드 지르 | 엔드게임 소환 보스(Exquisite Blood 9개 필요) | 피를 다루는 뱀파이어 군주 콘셉트 | 색욕(약) |
| 엔드게임 | The Beast in the Ice | 얼음 속의 짐승 | 엔드게임 우버 보스 | 얼음에 봉인된 거대 짐승 | **나태(냉기 일치)** |
| 엔드게임 | Belial, Lord of Lies | 벨리알(거짓의 군주) | 엔드게임 엑절티드 티어 보스 | 기만·거짓 모티프 — 우리 7죄종 밖의 개념 | — |
| 엔드게임 | Echo of Andariel | 안다리엘의 메아리 | 엔드게임 소환 보스 | Andariel의 거미형 변형 | — |
| 시즌(Construct) | Malphas, Keeper of the Vaults | 말파스(금고의 수호자) | 시즌 한정 보스(Season of the Construct) | "금고 수호자"라는 이름 — 상시 로스터 여부 미확인 | **탐욕(이름 일치)** |
| 던전 보스 | The Butcher | 부처(도살자) | 랜덤 조우형 던전 보스(전 지역) | 정육점 도살자 모티프, 대형 고기갈고리+식칼 | 폭식(포식) |
| 던전 보스 | Blood Bishop | 피의 주교 | 던전 보스 | 언데드 성직자, 피의 마법 | — |
| 던전 보스 | High Council | 고위 의회 | 던전 보스(다수 개체 동시 조우) | 여러 마법사 개체가 동시에 등장 | — |
| 던전 보스 | Tomb Lord | 무덤의 군주 | 던전 보스 | 고대 언데드 수호자 | — |
| 던전 보스 | Khazra Abomination | 크하즈라 어보미네이션 | 던전 보스, Goatman/Khazra 계열 상위 개체 | 거대화된 염소인간 흉물 | — |
| 스트롱홀드 보스 | Baelgemoth, Infernal Tormentor | 바엘게모스(지옥의 고문자) | 스트롱홀드 해방전 보스 | 악마 우두머리 | 분노(약) |
| 스트롱홀드 보스 | High Priestess Hadar | 대여사제 하다르 | 스트롱홀드 해방전 보스 | 사교 지도자 | — |
| 스트롱홀드 보스 | Fionnir, the Mad Druid | 광인 드루이드 피오니르 | 스트롱홀드 해방전 보스, 스코스글렌 | 타락한 자연 드루이드 | — |
| 스트롱홀드 보스 | Dark Cardinal Maldul | 암흑 추기경 몰둘 | 스트롱홀드 해방전 보스 | 종교 권위자형 보스 | 오만(약, 성직자 권위) |

---

## 3. 죄종별 후보 — 우리 7보스에 바로 붙는 것

### 분노 (사탄 · 화염)
- **Dregs — Propagator/Grappler**: "환각식물에 중독돼 멈출 수 없는 광란에 빠진 인간"이라는 설정 자체가 폭주·전쟁 상태를 그대로 체현한다
- **Demon 계열 화염 악마군(Soul Burner·Balrog·Hellion·Pitlord·Inferno Sisters)**: 전부 화염 속성 대형 악마 — 사탄의 화염 원소와 직결
- **Fallen 전 계열**: "하급 악마 군단이 진형을 이뤄 싸운다"는 구도 자체가 전장·폭주 콘셉트에 바로 대응
- **Amalgam of Rage**(§3-부속 보스): 이름 자체가 "분노(Rage)의 응집체" — 가장 직접적인 이름 매치
- **Astaroth**: 3두 지옥견을 타고 등장하는 악마 장수 — 「전쟁·학살」 결에 부합

### 시기 (레비아탄 · 바다/심연)
- **Drowned 전 계열(Man-O-War·Wretch·Tide Walker·Deckhand·Merinth·Drowned Juggernaut)**: 바다에서 올라온 언데드, "무리로 나올 때 강력하다"는 특징까지 — 우리 시기=레비아탄 챕터에 **가장 직접적으로 맞는 기성 계열**
- **Snake/Nangari 전 계열**: 늪지에서 변이한 뱀인간 — "거대 뱀/용" 결과 직결, 하웨자르(늪지)라는 지역까지 우리 시기 지역(뒤틀린 숲)과 정서가 겹친다
- **Spider Host**: "인간 숙주에 기생해 몸을 차지하고, 죽으면 새끼를 퍼뜨린다" — 스펙의 "기생·모방·변형" 키워드와 정확히 일치하는 가장 강한 후보
- **Big Spider/Spiderling**: 거미줄 구속·증식이라는 특징이 기생·모방 결을 보강

### 탐욕 (맘몬 · 황금/보물)
- **Avarice, the Gold Cursed**(월드보스, §3-부속): 이름 자체가 "탐욕" — 황금 망치 + 사슬 달린 보물 상자를 무기로 쓰는 2족 악마. **가장 직접적인 챕터보스급 매치**
- **Treasure Goblin 전 변종(7종)**: "보물 수호자·상인·도굴" 결에 정확히 대응하는 기성 로스터 — 특히 Gilded Baron(골드 특화)·Fancy Old Fedric(초희귀+미식 드롭)은 "탐욕의 보상 구조" 자체를 몬스터화한 사례
- **Malphas, Keeper of the Vaults**(§3-부속 보스): "금고의 수호자"라는 이름 — 보물 수호자 결과 직결
- **Bandit 전 계열**: 노상강도라는 설정이 약하게나마 탐욕과 연결(도굴·강탈)

### 나태 (벨페고르 · 얼음/잠)
- **The Beast in the Ice**(§3-부속 보스): 얼음에 봉인된 우버 보스 — 벨페고르의 냉기 원소와 직결
- 그 외 D4 몬스터 계열 중 "잠·정체·무기력"을 직접 체현하는 계열은 **없음** — D4는 냉기를 소서러 스킬·파라곤 노드 태그로만 다루고, 냉기 전담 몬스터 계열을 만들지 않았다

### 폭식 (바알제붑 · 파리/벌레/부패)
- **Fly Host**: "걸어 다니며 파리 떼를 낳는다" — 바알제붑(파리대왕) 원전과 가장 직접적으로 일치하는 단일 몬스터
- **Cannibal 전 계열**: 식인이라는 설정 자체가 "포식·삼키기"에 정확히 대응
- **Zombie 전 계열(Bloated Corpse-fiend·Shambling Corpse·Ghoul)**: 부푼 시체·폭발형 시체라는 형상이 부패·역병 결과 맞음
- **Duriel, Lord of Pain**: 거대한 구더기(maggot) 형상의 악마 — "벌레" 키워드와 정확히 일치하는 캠페인 최종보스급 매치
- **The Butcher**: 정육점 도살자 모티프 — 갈고리·고기라는 소품이 "포식" 결과 잘 맞는다
- **Hollows 전 계열**: 메피스토의 타르형 부패에서 태어난 존재라는 설정이 부패·역병 결을 약하게 보강
- **Ashava, the Pestilent**(월드보스): "역병"이라는 이름 자체가 폭식의 「역병」 키워드와 직결

### 색욕 (아스모데우스 · 유혹/매혹/흡혈)
- **Vampire 전 계열(Revenant·Ghoul·변신형 Vampire)**: 흡혈이라는 형질 자체가 아스모데우스 원소(독)·결(흡혈)과 직결 — 우리 hero_base "Vampire"와 이름까지 같다
- **Succubus**(Demon 계열): 유혹형 악마 — 우리 hero_base "Succubus"와 완전히 동일한 존재
- **Lilith / Echo of Lilith(우버 릴리스)**: D4의 메인 빌런 — 유혹적 여성형 실루엣과 "어머니"를 자처하는 서사가 색욕의 「유혹」 결에 부합
- **Lord Zir**: 피를 다루는 뱀파이어 군주 콘셉트 보스 — 흡혈 결 보강

### 오만 (루시퍼 · 천사/심판/조각상)
- **Grigoire, the Galvanic Saint**: **전기 속성 + "성인(Saint)" 모티프 + 거대 석상형 실루엣** — 루시퍼의 원소(전기)·결(천사·조각상·심판) **세 가지가 동시에 일치**하는, 이번 조사에서 가장 정확한 단일 매치
- **Rathma's Golem**: 거대 골렘/구조물형 보스 — "조각상·왕좌" 결에 대응, 우리 hero_base "Golem"과도 연결
- **Knight 전 계열(Penitent·Inquisitor·Adherent)**: "참회(Penitent)"라는 이름 자체가 심판·신전 결과 약하게 연결, 큰 배리어(신성한 보호막)를 두르고 싸운다는 특징도 부합
- **Dark Cardinal Maldul**: 종교 지도자형 보스 — 신전·심판 결 보강
- **Cathedral of Light**(캡스톤 던전 자체): "빛의 대성당"이라는 이름과 그 안의 Revenant Knight(아니무스 수호자)는 신전 콘셉트의 장소성 참고 자료로 유효

---

## 4. 우리 로스터에 없는 것 — 신규 monster_base 후보

| 후보 베이스 | 원작 사례 | 우리 타입(Normal/Demon/Undead) | 어느 죄종에 쓰나 | 왜 필요한가 |
|---|---|---|---|---|
| **Drowned(익사자)** | Man-O-War·Wretch·Tide Walker·Deckhand(D4 Drowned 계열) | Undead | 시기 | 기존 "Ghost"·"Zombie" 베이스는 수생·해안 색이 전혀 없다. 레비아탄 챕터(시기=바다)에 필요한 "바다에서 올라온 언데드"라는 질감은 신규 베이스가 아니면 못 채운다 |
| **Snake-man(뱀인간, Nangari형)** | Nangari Spitter·Oracle·Longfang | Normal | 시기 | 기존 "Lizardman"은 도마뱀형이라 뱀의 "거대 뱀/용·변형" 결과 다르다. 늪지 변이 생물이라는 시기 스펙 키워드에 Lizardman보다 더 정확히 맞는다 |
| **Spider Host(거미 숙주)** | D4 Spider Host — 인간 숙주에 기생한 거미, 사망 시 증식 | Normal 또는 Demon(기생이라 판단 갈림) | 시기 | 스펙이 명시한 "기생·모방"을 몬스터 콘셉트로 직접 구현하는 유일한 후보 — 현재 로스터엔 대응 베이스가 없다 |
| **Cannibal(식인종)** | D4 Cannibal 계열 — 추방된 야만인, 사냥한 몬스터 갑주 착용 | Normal | 폭식 | 기존 "Human"은 범용이라 식인이라는 색을 못 낸다. 바알제붑의 "포식·삼키기" 결을 인간형으로 표현할 유일한 후보 |
| **Fly Swarm(파리 떼/숙주)** | D4 Fly Host — 파리를 낳는 숙주 | Normal 또는 Demon | 폭식 | 바알제붑(파리대왕) 원전과 가장 직접적으로 일치하는데, 현재 로스터엔 곤충 계열 자체가 없다 — 폭식 챕터보스의 상징 몬스터로 우선순위가 높다 |
| **Treasure Goblin(보물 도깨비)** | D4 Treasure Goblin 및 변종 7종 | Normal | 탐욕 | 기존 "Goblin"은 전투형이라 "보이면 도망가고, 죽이면 루팅이 터진다"는 탐욕 특유의 행동 패턴을 못 담는다. 맘몬 챕터의 "보물 수집" 결을 몬스터 행동으로 직접 구현하는 후보 |
| **조각상 수호자(Statue/Construct Guardian)** | D4 Grigoire·Rathma's Golem·Cathedral of Light 조각상 | Demon 또는 기존 "Golem" 베이스 확장 | 오만 | 루시퍼의 "천사·조각상·신전" 결을 담을 후보. 다만 기존 "Golem" 베이스를 그대로 확장(오만 전용 스킨/거동)하는 편이 신규 베이스 추가보다 가벼울 수 있어 **우선순위는 가장 낮다** — 신규가 아니라 확장 검토용으로 기록 |

---

## 5. 부록 — Elite 몬스터 접두(Affix)

계열과 별개로, D4는 아무 몬스터에나 얹을 수 있는 **Elite 접두**를 원소별로 묶어 관리한다. 몬스터 "종류"가 아니라 "같은 종류를 더 위험하게 만드는 수식어" 체계라 본작의 태그 대상은 아니지만, "기본 몬스터 + 위험 수식어"라는 구조 자체는 참고할 만해 짧게 남긴다.

| 계열 | 접두 | 효과 요지 |
|---|---|---|
| 냉기 | Cold Enchanted | 접촉 시 냉기 피해 + 오한 축적 |
| 냉기 | Frozen | 냉기 구체를 뿌리고, 3초 뒤 폭발 |
| 냉기 | Chilling Wind / Tempest | 통과하는 투사체를 감속시키는 얼음 기둥 / 끌어당기는 얼음 발톱 |
| 화염 | Explosive | 5초 뒤 광범위 폭발하는 화염구 2개 생성 |
| 화염 | Fire Enchanted | 화염 파동을 내뿜고, 사망 후에도 계속 생성 |
| 화염 | Mortar | 박격포 4발을 쏘아 목표 주변에 낙하 |
| 번개 | Electrified Obelisks | 번개 기둥을 소환해 계속 볼트 발사 |
| 번개 | Lightning Enchanted | 피격 시 빠른 번개 구체 3개 방출 |
| 번개 | Teleporter | 플레이어 위치로 순간이동해 착지 시 번개 피해 |
| 독 | Plaguebearer | 사망 시 폭발하는 독 웅덩이를 남김 |
| 독 | Poison Enchanted | 피격 시 발동하는 독 덩어리를 떨어뜨림 |
| 암흑 | Shadow Enchanted | 자신과 동일하게 공격하는 그림자 분신 소환 |
| 암흑 | Terrifying | 2초간 공포에 빠뜨리는 오망성 소환 |
| 유틸리티 | Summoner | 주변 몬스터 유형 기반으로 하수인 소환 |
| 유틸리티 | Suppressor | 외부 원거리 공격을 막는 보호막 전개 |
| 유틸리티 | Vampiric | 일반 공격으로 체력 흡수 |
| 유틸리티 | Waller | U자형 벽을 세워 이동 방해 |
| 유틸리티 | Multishot | 투사체 3연발 |
| 유틸리티 | Hellbound | 사슬로 플레이어를 구속하는 석상 소환 |

---
*마지막 업데이트: 2026-09-16*
