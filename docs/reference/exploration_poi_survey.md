# 탐험 아이콘 — 4X · 맵 오브젝트 게임 교차 조사

> 목적: 본작 **탐험**([base_expedition_design.md §3-1](../game_design/base_expedition_design.md))에 넣을 아이콘 종류를 찾기 위해, 4X 와 그 이웃 게임에서 「맵 위에 놓여 있어 가서 건드리는 것」이 무엇이고 어떻게 생기고 무엇을 주는지 모은 **후보 창고**.
> 조사 방식: 2026-09-30 · 네 갈래 병렬 웹 조사 — ① PC 턴제 4X ② 영웅 · 서사가 붙는 4X ③ 영웅이 맵 오브젝트를 밟는 전략 게임 ④ 모바일 4X(월드맵 파견형).
> ⚠ **이 문서는 조사와 후보이지 결정이 아니다.** 확정은 [GAME_DESIGN.md §9](../game_design/GAME_DESIGN.md) 한 줄 + base_expedition_design.md 가 갖는다. §4 「본작에 비춰 본 후보」는 조사자 의견이다.
> ⚠ 인용된 수치는 **그 게임의 것**이다 — `src/data/*.csv` 로 옮기지 않는다.
> ⚠ **「미확인」은 「없다」가 아니다** — Fandom 계열 위키가 막혀 검색 발췌 · 공식 매뉴얼 · 가이드로 메운 곳이 많다(§0). 채택 전에 원작으로 재검증한다.

목차 — 0 조사 범위와 한계 · 1 게임별 요약 · 2 뽑은 패턴 · 3 본작 탐험의 전제 · 4 본작에 비춰 본 후보 · 5 넣지 않는 쪽이 맞는 것 · 6 출처

---

## 0. 조사 범위와 한계

| 갈래 | 게임 | 자료 상태 |
|---|---|---|
| PC 턴제 4X | Civilization V · VI · VII · Old World · Humankind · (Master of Orion 2016 · Galactic Civilizations 한두 줄) | Civ · Humankind 는 위키 원문(API)으로 확인. **Old World 는 얇다**(공식 위키 차단 — 매뉴얼 · 팬 위키) |
| 영웅 · 서사 4X | Endless Legend 1 · 2 · Endless Space 2 · Stellaris · Age of Wonders 4 | Stellaris · AoW4 는 Paradox 위키 확인. ES2 는 검색 발췌. **EL2 는 개발자 인터뷰 수준** |
| 맵 오브젝트형 | Heroes of Might and Magic III · Songs of Conquest · Total War: Warhammer II · III · Northgard · King's Bounty: Armored Princess | HoMM3 는 오브젝트별 페이지 확인. **TW:WH 는 검색 발췌 + 플레이어 보고** |
| 모바일 4X | Rise of Kingdoms · Whiteout Survival · State of Survival · Lords Mobile · Call of Dragons · (Age of Empires Mobile · Evony) | **출처 신뢰가 낮은 곳이 많다** — 재생 주기 · 소멸 여부에 미확인 다수. AoE Mobile 은 이름만 |

HoMM3 · Songs of Conquest · King's Bounty 는 엄밀히 4X 가 아니지만 「영웅이 맵 위 물건을 밟는다」의 원조라 넣었다. 모바일 4X 는 「아이콘이 뜨고 눌러서 보내고 타이머를 기다린다」에 가장 가깝다.

## 1. 게임별 요약

### 1-1. PC 턴제 4X

| 게임 | 탐험 대상 | 생기는 방식 | 주는 것 | 고르기 · 나쁜 결과 | 사라지나 |
|---|---|---|---|---|---|
| Civ V | Ancient Ruins | 맵 배치 | 지도 공개 · 기술 · 인구 · 유닛 업그레이드 · 금 · 문화 · 신앙 | 가중 굴림 · **직전 2개와 같은 결과는 제외** · 나쁜 결과 없음 | 소멸(나중에 고고학 자리가 된다) |
| Civ V · VI | Barbarian Encampment / Outpost | **게임 내내 다시 생긴다** | 금 소량 · 도시국가 퀘스트 보상. VI Clans 모드 — 흩기 / 약탈(쿨다운) / 매수 / 고용 | 행동 고르기 · 방치하면 습격 | 흩으면 소멸 |
| Civ V · VI | Antiquity Site(고고학) | **지난 사건(밟은 유적 · 부순 캠프 · 큰 전투)이 나중에 자리를 만든다** | 유물 또는 영구 개량 | 끝에 **택1** | 발굴하면 소멸 |
| Civ V · VI | City-State Quests | 간헐 부여 · 시대마다 갱신 | 영향력 · 사절 | 평소 활동 위에 얹는 목표 | 완료하면 끝 |
| Civ VI | Tribal Village | 시작 때 배치 | 7갈래(문화 · 금 · 신앙 · 과학 · 외교 · 군사 · 생존자) | 가중 굴림 · **큰 보상은 최소 턴 뒤에만** | 즉시 소멸 |
| Civ VII | Discoveries 9종(Cairn · Cave · Ruin · Shipwreck …) | 시작 때 배치 · 값은 시대마다 커진다 | 자원 · 인구 · 유닛 · 타일이 자원으로 변함 · 독립 세력 관계 | **이벤트 122개가 전부 2지선다** · 선택지에 비용(금 · 체력 · 유닛)이 붙기도 한다 | 소멸 |
| Civ VII | Independent Powers | **시대마다 새로 생긴다** | 흩기 = 자원 / 친구 되기 = 문턱을 채우면 도시국가 | 행동 고르기 · 적대 세력은 습격 | 흩으면 소멸 |
| Old World | Ancient Ruins | 배치 | 이벤트 — 금 · 문화 · 석재 · 과학 · 정통성 · 지도자 특성 · 기술 | 이벤트 안 2~3지선다 | 소진 — **20~25턴이면 바닥난다(매뉴얼 노트 — 반면교사)** |
| Humankind | Curiosities | 시대별 목록 · 랜덤 출현 | 영향력 · 식량 · 지식 · 돈 · 유닛 · 전초 | 선택지 없음 · **같은 이름이 시대가 오르면 값이 커진다** | 수집형(소멸 명시 미확인) |
| Humankind | Independent People | 시대 · 영토마다 자연 생성 · 수명 있음 | 후원 누적 문턱마다 조약 · 용병 | 행동 고르기 · 방치하면 폐허 | 수명이 다하면 |
| Civ · Humankind · Old World | Natural Wonders / Landmarks | 맵 고정 | **첫 발견 1회 보상** + 소유 산출 | 고정 | 영구 |
| MoO 2016 · GalCiv | Anomalies | 랜덤 핑 · 조사 모듈 | 크레딧 · 기술 · 함선 · 영구 소량 보너스 | 가중 굴림 · 「아무것도 없음」 칸 | 소멸 |

### 1-2. 영웅 · 서사 4X

| 게임 | 탐험 대상 | 생기는 방식 | 주는 것 | 보낸 인물의 영향 · 고르기 | 사라지나 |
|---|---|---|---|---|---|
| Endless Legend | Ruins | 맵 배치 | **굴림 60 전리품 / 20 퀘스트 / 20 꽝** | 기술 · 영웅 스킬이 그 표를 민다(꽝↓) | 1회 — 후반 기술이 「한 번 더 뒤지기」를 연다 |
| Endless Legend | Ruin side quests | 유적 굴림이 연다 | 기술 · 명성 · 아티팩트 · 영웅 | 평소 플레이 위에 얹는 기한 목표 | 완료하면 끝 |
| Endless Legend | Minor Faction Villages | 맵 고정 | 도시 인구 · 고유 유닛 · 제국 보너스 | **공격 / 뇌물 / 퀘스트 셋 중 고르기** | 도시에 편입 |
| Endless Legend 2 | Tidefall | 게임당 3회 | 바다가 물러나 **새 땅 · 새 자원 · 새 대상**이 드러난다 | 「초반 뒤 탐험이 멈추는 문제」를 겨냥(개발자 인터뷰) | — |
| Endless Space 2 | Curiosities(레벨 1~4) | 행성에 배치 · **기술이 오르면 같은 자리에서 새것이 보인다** | 이상현상 · 전략 / 사치 자원 · 전리품 · 꽝 · 퀘스트 시작 | 탐사선 재고 · 조사 가능 등급 | 미확인 |
| Stellaris | Anomalies(레벨 1~8) | 조사 중 발견 | 연구 · 기술 · 자원 · 유물 · 리더 특성 · 사건 사슬 | **실패 확률을 없애고 「과학자 레벨 대 이상현상 레벨 = 걸리는 시간」으로 바꿨다**(2.1 — 「성공률이 오를 때까지 미루게만 했다」) | 소진 |
| Stellaris | Archaeological Sites | 발견 · 시작 생성 · 사건 생성 | 챕터마다 보상 · 끝에 Relic | **단계마다 굴림 — 모자라도 단서가 쌓여 다음 굴림이 유리** · 중단 자유 | 완료 뒤 끝 |
| Stellaris | Astral Rifts | 주기적으로 열린다 · **마지막 출현 뒤 지난 시간이 확률에 더해진다** | Relic · 기술 · 특성 | 챕터마다 분기(쉬운 길은 안전 · 어려운 길은 보상 큼) | 미확인 |
| Stellaris | Guardians / Leviathans | 확률 배치 | 연구 · 기술 · Relic | 싸움 또는 **비폭력 경로**(성향 전용) | 해결하면 |
| Age of Wonders 4 | Ancient Wonders(Bronze · Silver · Gold) | 맵 배치 | 자원 · 전용 유닛 · 영구 개선 | **도입 이벤트 → 전투 → 결과 이벤트에서 보상 고르기** · 친화도가 난이도를 낮춘다 | 남는다 |
| Age of Wonders 4 | Pickups | 맵 배치 | 자원 · 장비 상자 · 유닛 · 경험 배너 · **지도 제작자(다른 대상의 위치 공개)** | 고정 | 1회 |
| Age of Wonders 4 | Infestations | 후반에도 새로 생긴다 | 격파하면 주변 자원지 접근 | 방치하면 커진다 | 격파하면 |

### 1-3. 맵 오브젝트형

| 게임 | 분류(대표) | 방문 제한 | 주는 것 | 고르기 · 나쁜 결과 |
|---|---|---|---|---|
| HoMM3 | 자원 더미 · Treasure Chest | 1회 · 소멸 | 자원 / **골드냐 경험치냐 택1**(낮은 확률로 아티팩트) | 3등급 굴림 |
| HoMM3 | Creature Banks(Dragon Utopia · Crypt · Dwarven Treasury …) | 털면 소진 | 골드 · 자원 · 아티팩트 · 병력 | **수호대 4단계 중 하나가 굴려지고 보상은 그 단계에 고정** · 미리 볼 수 있다 |
| HoMM3 | Artifact | 1회 | 아티팩트 | **등급이 수호대 세기를 정한다** |
| HoMM3 | 능력치 영구 상승(Learning Stone · Arena · Marletto Tower · Library …) | **영웅당 1회** · 오브젝트는 남는다 | 능력치 · 경험치 | Arena 는 공격 / 방어 택1 |
| HoMM3 | 스킬 · 주문(Witch Hut · University · Scholar · Shrine) | Scholar 는 사라진다 | 2차 스킬 · 주문 | 이미 알면 못 배운다 |
| HoMM3 | 주간 수확(Windmill · Water Wheel · Mystical Garden) | **주 1회 다시 찬다** | 자원 · 골드 | 종류 굴림 |
| HoMM3 | 다음 전투까지 버프(Fountain of Fortune · Idol of Fortune · Temple · Oasis …) | 방문마다 | 사기 · 운 · 이동력 | Fountain 은 −1 도 나온다 |
| HoMM3 | 정찰 · 지도(Cartographer · Redwood Observatory) | — | 지도 공개 | — |
| HoMM3 | 퀘스트 · 열쇠(Seer's Hut · Border Guard + Keymaster's Tent · Obelisk → Grail) | 조건을 채워 돌아온다 | 경험치 · 아티팩트 · 병력 · 능력치 | **한 오브젝트에서 얻은 것이 다른 오브젝트를 연다** |
| HoMM3 | 영웅 획득(Prison) | 풀어 주면 사라진다 | 영웅 1명 | — |
| HoMM3 | 열어 볼까(Pandora's Box · Warrior's Tomb · Corpse · Wagon) | 첫 방문자 | 자원 · 아티팩트 · 스킬 · 「없음」 | Tomb 은 결과와 무관하게 사기 −3 · **대부분 일시 페널티나 빈손 — 영구 손실은 드물다** |
| Songs of Conquest | 영웅당 1회 영구(Mystic Hermit · Monument …) | **영웅마다 같은 보상** | 스킬 · 능력치 | 영웅 수가 방문 횟수를 늘린다 |
| Songs of Conquest | 다음 전투까지 버프(Stone Altar · Shrine of Aurelia) · 교환형(Burning Rune Stone) | 방문마다 | 능력치 | **얻고 잃는 교환형** |
| Songs of Conquest | 반복 수확(Orchard · Granary) | 턴 간격으로 다시 준다 | 골드 · 자원 | — |
| TW: Warhammer II | Ruins 의 Treasure Hunt | 폐허마다 | 골드 · 아이템 | 퍼즐 + 선택지 · **「위험에 비해 보상이 약하다」는 플레이어 평 — 반면교사** |
| King's Bounty | 상자 · 석관 | 1회 | 골드 · 아이템 · 룬 | **화려할수록 값비싸다** — 겉모습이 등급 |

### 1-4. 모바일 4X

| 게임 | 대상 | 생기는 방식 | 보내는 것 · 시간 | 주는 것 | 제한 |
|---|---|---|---|---|---|
| Rise of Kingdoms | Resource Points | 늘 있다 | 채집 부대 — 적재량이 양 · 채집 속도가 시간 | 자원 | **노드 레벨 = 양 · 속도는 같다** |
| Rise of Kingdoms | Barbarians | **낮은 레벨은 근처에 없으면 즉시 옆에 생긴다** · 앞 레벨을 잡아야 다음이 열린다 | 부대 · 행동력 소모 | 경험치 · 아이템 굴림 | 행동력(연속 공격은 할인) |
| Rise of Kingdoms | Tribal Villages · Mysterious Caves | 안개를 걷으면 발견 | 정찰병 · 짧은 시간 | 소액 자원 · 병력 · 기술 / 보석 · 가속 | 1회성 · 위험 없음 |
| Whiteout Survival · State of Survival | **Intel 미션**(사냥 · 구조 · 영웅 여정 · 현상금 …) | **하루 3회 갱신 · 기본 8칸** | 종류마다 다르다 | 영웅 조각 · 경험치 · 장비 · 자원 · 병력 | 12~16시간 뒤 만료 · **완료할수록 좋은 등급이 자주 뜬다**(Searchlight · Radar) |
| Whiteout Survival | Exploration(메뉴) | 상시 | 영웅 5명 방치 | 경험치 · 장비 | **방치 누적 9시간 상한 · 가득 차면 표시** |
| Lords Mobile | Resource Tiles | **채집되면 같은 종류 · 같은 레벨이 근처에 다시 생긴다** | 채집 부대 | 자원 | 적재량 |
| Lords Mobile | Darknest · Labyrinth · Kingdom Tycoon | 24시간 유지 / 하루 무료 1회 | 랠리 / 메뉴 | 에센스 · 자원 · 보석 | 하루 횟수 |
| Call of Dragons | Caves | 정찰 중 발견 | 정찰병 | **카드 넷을 섞어 고르기** | 1회성 |
| Evony | Relics | **지도 아이템을 써서 내가 띄운다** | 부대를 넣어 두고 장시간 | 자원 · 보석 · 조각 | 동시 1개 · **부대 능력은 수익에 무관 — 유물 등급이 정한다** |

## 2. 뽑은 패턴

| # | 패턴 | 선례 | 「보내 놓고 받아 오는」 구조로 옮기면 |
|---|---|---|---|
| 1 | **가중 굴림 + 중복 회피 + 진행도 문턱** | Civ V 유적(직전 2개 제외) · Civ VI 부족 마을(큰 보상은 늦게) | 그대로 옮겨진다 |
| 2 | **받는 순간 둘 중 고르기** | HoMM3 상자 · Civ VII 발견 122개 · Old World · AoW4 결과 이벤트 | 리포트를 받을 때의 선택으로 옮겨진다. 체력 · 유닛을 내는 선택지는 못 쓴다 |
| 3 | **실패 대신 시간** | Stellaris 이상현상(2.1) | 실패 없는 계약과 맞다. 능력이 모자라면 오래 걸릴 뿐이다 |
| 4 | **겉모습 = 등급 = 보상** | HoMM3 뱅크 · 아티팩트 등급 · King's Bounty 상자 · RoK 노드 레벨 · Evony 유물 등급 | 아이콘 크기 · 모양이 보상 크기를 예고한다 |
| 5 | **다음 전투까지 버프** | HoMM3 샘 · 우상 · 사원 · SoC 제단 | 「다음 원정 한 번」 버프 아이콘 |
| 6 | **아이콘이 아이콘을 연다** | AoW4 지도 제작자 · Stellaris 선구자 사슬 · EL 유적 → 퀘스트 · HoMM3 열쇠 천막 · 오벨리스크 · Civ 고고학 | 새 종류 없이 사슬로 공급이 는다 |
| 7 | **단서 누적 다단 발굴** | Stellaris 고고학 · 균열 | 여러 번 보내 끝내는 큰 대상. 모자라도 다음이 유리해진다 |
| 8 | **영웅당 1회 영구 상승** | HoMM3 · Songs of Conquest | 아이콘이 사라지면 성립하지 않는다 — 남는 자리여야 한다 |
| 9 | **정시 갱신 + 칸 상한** | Whiteout Survival · State of Survival Intel | 게시판 리듬. **만료는 「자리 비워도 안전」과 부딪힌다** — 상한에서 멈추는 쪽이 맞다 |
| 10 | **완료할수록 다음 등급이 오른다** | Searchlight · Radar | 반복이 좋은 아이콘을 부른다. 성장 축이 하나 더 생긴다 |
| 11 | **같은 이름, 단계가 오르면 값이 커진다** | Humankind · Civ VII | 아이콘 종류를 안 늘리고 후반을 받친다. **Old World 는 초반에 바닥나는 반면교사** |
| 12 | **나쁜 결과는 일시 페널티나 빈손** | HoMM3 · EL 「꽝」 | 영구 손실 없이도 굴림의 긴장을 만든다 |
| 13 | **여러 번 투자해 문턱을 채우면 관계가 열린다** | Civ VII 독립 세력 · Humankind · EL 소수 파벌 · AoW4 자유 도시 | 여러 번 보내 게이지를 채우는 자리. 게이지가 하나 는다 |
| 14 | **다시 생기는 위협** | Civ 야만 캠프 · AoW4 Infestation | 방치하면 습격하는 부분은 방치형 계약과 부딪힌다 |

## 3. 본작 탐험의 전제 (2026-09-30 대화 기준)

- 지도 위에 아이콘이 **랜덤으로 뜨고** 다녀오면 사라진다(의뢰처럼)
- 꺼 둔 동안 진행 · 영웅을 잃지 않는다 · 기다리는 동안 개입을 요구하지 않는다(base_expedition_design.md §4)
- 찾아 온 것은 **이미 있는 시스템이 먹는다** — 새 재료를 만들지 않는다
- 골드는 원정에서만 · 경험치는 훈련장이 든다
- 보낸 영웅의 죄종이 결과의 죄종을 끌어온다 · 민첩 · 통솔의 비전투 역할이 비어 있다

## 4. 본작에 비춰 본 후보 (조사자 의견)

| 후보 | 다녀오면 | 받는 기존 시스템 | 선례(§2) | 걸리는 것 |
|---|---|---|---|---|
| 동굴 | 장비 상자 | 가방 · 분해 | 1 · 4 | 확정(09-24) |
| 자원 덩이 | 광석 · 목재 · 약초 한 덩이 | 건설 · 제작 · 물약 | RoK · Lords Mobile 노드 | 열린 단계의 재료만 |
| **옛 신단** | 다음 원정 한 번, 신단 효과 하나 | 신단(base_expedition_design.md §1-2) | 5 | 누가 받나 · 원정 신단과 겹칠 때 |
| **고문서** | 그 스테이지 몬스터의 스킬북 한 권 | 서고 | HoMM3 Shrine · Witch Hut · Scholar | 책 공급 속도(GAME_DESIGN §10) |
| 갇힌 영웅 | 선술집 수색 결과 칸에 영웅 하나 | 선술집 | HoMM3 Prison | 수색과 같은 기계 — 합칠지(GAME_DESIGN §10) |
| 전령 | 등급 높은 의뢰 하나 | 의뢰 | Seer's Hut · EL 유적 퀘스트 · Civ 도시국가 퀘스트 | 의뢰 게시판과 겹친다 · 명성 보류 |
| 망루 | 희귀 아이콘 하나를 띄운다 | 탐험 자체 | 6 | 간접 보상이라 체감이 약하다 |
| 둥지 | 다음 원정에 이스터에그 | 원정 | Civ 고고학(찾기 → 파기) | 이스터에그 몬스터가 아직 없다 |
| 요새 · 마차 | 적 영웅 파티와 전투 | 장비 · 상단 | 4(뱅크) | 적 영웅 파티 생성 |
| 파 들어가는 유적 | 여러 번 보내 끝에 큰 것 하나 | 히든 영웅 · 도감 이야기 | 7 | 랜덤 아이콘과 다른 「늘 있는 자리」 |

규칙으로 가져올 만한 것 — 실패 대신 시간(3) · 겉모습 = 등급(4) · 받을 때 둘 중 고르기(2) · 직전 결과 제외 굴림(1) · 만료 없는 게시판(9) · 건물 랭크가 좋은 아이콘을 더 자주 띄우기(10 — 새 축 없이 탐험 건물의 빈 랭크로).

## 5. 넣지 않는 쪽이 맞는 것

- **영구 능력치 상승**(HoMM3 Learning Stone 류) — 「기본 능력치는 태어날 때 굴린 값이 평생 간다」(09-14)와 부딪힌다
- **영웅 · 장비를 잃는 결과**(Stellaris 과학자 사망 · HoMM3 병력 손실 · Civ VII 유닛 비용) — 방치형 계약
- **만료되는 아이콘**(모바일 Intel) — 놓칠까 봐 접속하게 된다
- **방치하면 습격하는 캠프**(Civ · AoW4) — 「자리 비워도 안전」
- **골드 · 경험치 · 새 재료**

## 6. 출처 (주요)

- Civilization — civilization.fandom.com 의 Ancient ruins · Tribal village · Discovery · Narrative event · Independent Power · Antiquity Site · City-state · Barbarian Clans 항목 · [Civ VII 개발 일지 Emergent Narrative](https://civilization.2k.com/civ-vii/archive/dev-diary/emergent-narrative/)
- Old World — Steam 공식 매뉴얼 v1.65 · oldworld.fandom.com Sacred Tomb
- Humankind — humankind.fandom.com 의 Curiosity · Independent People · Natural Wonder
- Endless Legend — [endlesslegend.wiki.gg Ruins](https://endlesslegend.wiki.gg/wiki/Ruins) · [Side Quests](https://endlesslegend.wiki.gg/wiki/Side_Quests) · [Global Quests](https://endlesslegend.wiki.gg/wiki/Global_Quests) · [Endless Legend 2 — Xbox Wire 인터뷰](https://news.xbox.com/en-us/2025/09/11/how-endless-legend-2-raises-the-tide-on-turn-based-strategy-games/)
- Stellaris — [Anomalies](https://stellaris.paradoxwikis.com/Anomalies) · [Archaeological site](https://stellaris.paradoxwikis.com/Archaeological_site) · [Astral rift](https://stellaris.paradoxwikis.com/Astral_rift) · 개발 일지 #111(검색 발췌)
- Age of Wonders 4 — [Ancient Wonders](https://aow4.paradoxwikis.com/Ancient_Wonders) · [Map](https://aow4.paradoxwikis.com/Map) · [Dev Diary 6](https://www.paradoxinteractive.com/games/age-of-wonders-4/news/age-of-wonders-4-dev-diary-6)
- Heroes of Might and Magic III — [heroes.thelazy.net Category:Adventure Map](https://heroes.thelazy.net/index.php/Category:Adventure_Map) 와 오브젝트별 항목(Creature Banks · Treasure Chest · Learning Stone · Windmill · Fountain of Fortune · Seer's Hut · Prison · Pandora's Box …)
- Songs of Conquest — [Lavapotion RMG 문서](https://www.songsofconquest.com/modding/rmg) · Steam 가이드 「Map Locations in Detail」
- King's Bounty: Armored Princess — Steam 공식 매뉴얼
- Rise of Kingdoms — riseofkingdoms.fandom.com 의 Scouting · Barbarians · Resources · Expedition
- Whiteout Survival · State of Survival — [Theria Games Lighthouse](https://theriagames.com/guide/whiteout-survival-lighthouse-guide/) · state-of-survival.fandom.com Intel Post
- Lords Mobile — lordsmobile.fandom.com 의 Gathering · Darknest · Labyrinth · Monster Hunting
- Call of Dragons — [callofdragonsguides 마을 · 캠프 · 동굴](https://callofdragonsguides.com/villages-camps-and-caves-guide-call-of-dragons/)
- Evony — [Theria Games Relics](https://theriagames.com/guide/evony-relics/)

---

*마지막 업데이트: 2026-09-30*
