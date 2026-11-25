# 보드게임 레퍼런스 약 100 — 전술(작전) 카드 · 가위바위보 맞물림

> 파티 전술(작전 카드)을 「한 편성 3장 · 공격 · 방어 · 유틸 한 장씩 · 서로 물고 물리는 싸움」으로 짜기 위한 참고 조사다. 진행 중 논의는 루트 [PLAN_tactic_reroll.md](../../PLAN_tactic_reroll.md) §0 · §2-6.
> 조사: 2026-11-25 · sonnet 조사자 넷이 갈래를 나눠 웹(공식 룰북 · 룰 요약 · 위키 · 리뷰)으로 확인. **BoardGameGeek 은 막혀서 못 열었다.** 확인 못 한 칸은 「미확인」, 요약 사이트만 본 칸은 「요약」이다 — 설계에 인용하기 전에 룰북 원문을 다시 본다. 수치 · 연도 · 디자이너 일부는 출처가 하나뿐이다.
> 갈래: §2 전략 · 영역 장악 게임의 전투 카드 · §3 역사 워게임 · 지휘 카드 · §4 미니어처 스커미시 · 영웅 전투 · §5 1:1 카드 대결 · 블러프

## 0. 전술 카드를 넣는 방식 — 방식별 정리

| 방식 | 대표 게임 | 어떻게 도나 | 우리 게임(실시간 자동전투 · 비동기 결투장 · 방치형)에 |
|---|---|---|---|
| 짝 맞추기 | Dune · Hannibal · Netrunner · Root · Sekigahara | 공격 카드의 종류에 맞는 방어 카드만 막는다 | 맞음 — 공격 ↔ 방어 짝 |
| 이득 + 제약 한 묶음 | Commands & Colors · Paths of Glory · Twilight Struggle | 카드 하나가 「이것을 얻는 대신 저것을 못 한다」 | 맞음 — 대가는 효과 안(③) |
| 반응 카드 | Warhammer Underworlds · Super Fantasy Brawl · Combat Commander · C&C Great War | 상대 행동 도중 조건이 맞으면 끼어든다 · 횟수 제한 | 맞음 — 손으로 내는 대신 조건이 오면 자동 발동 |
| 우선권 맞바꿈 | Star Wars: Legion · Gloomhaven · Mage Knight · Guild Ball | 빠르게 먼저 움직이면 하는 일이 적다 | 일부 — 개막 카드(돌격 · 거북 진형)의 틀 |
| 상시 자세 | Street Masters(전술 = 자세) · Marvel Champions(상성) | 앞에 두면 계속 유지되는 효과 | 맞음 — 유틸 칸 |
| 자리 · 편성에 따라 세기가 바뀜 | Pixel Tactics · StarCraft | 놓는 줄이나 유닛 종류와 맞으면 큰 효과 | 맞음 — 전열 · 후열 구성과 맞물림 |
| 숨김 배치 | Stratego · Air, Land & Sea · Battle for Rokugan | 방어 쪽 정체를 숨기고 · 가짜를 섞는다 | 맞음 — 결투장 방어 편성 |
| 상대(몬스터)의 행동 덱 | Kingdom Death: Monster | 몬스터가 무엇을 할지 카드로 정해 둔다 | 맞음 — PvE 리더가 작전 카드를 들고 나오는 틀 |
| 동시 공개 · 힘 합 비교 | Blood Rage · Kemet · Ankh · Game of Thrones · Scythe | 카드 힘 + 병력을 더해 큰 쪽이 이긴다 | 안 맞음 — 턴제 합산 |
| 비밀 입찰 | Rising Sun · Cyclades · L5R 결투 | 자원을 몰래 걸어 선택지를 가져간다 | 안 맞음 — 턴제 |
| 삼각 상성 + 보상 비대칭 | Yomi | 서로 이기는 삼각 · 이겼을 때 얻는 것이 다르다 | 순환은 안 쓴다 · 「보상 비대칭」만 가져온다 |

## 1. 우리 설계에 바로 쓸 것 (요약)

| 주제 | 가장 가까운 선례 | 우리에게 |
|---|---|---|
| 공격 종류 ↔ 그 종류를 막는 방어(짝 맞추기) | **Dune**(투사체 ↔ 방패 · 독 ↔ 스누퍼 · 동시 공개 · 쓸모없는 카드로 허세) · **Hannibal**(같은 종류 카드로만 막는다) · **Netrunner**(ICE 3종 ↔ 브레이커 3종 + 돈으로 힘 보정) · **Root**(같은 색 매복끼리 상쇄) · **StarCraft**(카드 아이콘이 전열 유닛 종류와 맞아야 큰 값) | 일기토 ↔ 친위대 · 트로이 목마 ↔ 방패벽 · 쐐기진 ↔ 거짓 후퇴 · 개막 ↔ 거북 진형 짝이 Dune 구조 그대로다 |
| 순수 가위바위보는 운이 된다 | **Yomi** — 이겼을 때 보상이 갈래마다 다르고(공격 = 콤보 · 잡기 = 막기 제거 · 회피 = 반격 · 막기 = 카드 뽑기) 그 값이 상황 따라 변해서 「읽기」가 된다 | 짝이 맞았을 때 얻는 것을 카드마다 다르게 · 지는 쪽 손해도 대칭이 아니게 |
| 상성을 전부 아니면 전무로 두지 않기 | **Exceed**(수치로 일부 흡수) · **Netrunner**(비용) · **Pokémon TCG**(약점 ×2 · 저항 −30) | 짝이 맞으면 「막는다」가 아니라 「크게 줄인다」 — 한 번 틀려도 끝나지 않게 |
| 대가가 효과 안에 | **C&C Ancients · Medieval**(이득 + 제약 한 묶음 · 제약이 이름에 — Mounted Charge = 근접 +1 · 원거리 불가) · **Star Wars: Legion**(우선권이 빠르면 명령 수가 적다) · **Gloomhaven**(강한 칸 = 느린 선제값 · 영구 손실) · **Rising Sun**(할복) · **Paths of Glory** Withdrawal(손실 1 막고 1칸 후퇴) | 이미 정한 ③ 「대가는 효과 안에」의 교과서 — 이름 · 효과 · 대가가 한 문장 |
| 비동기 결투장의 후출(상대 카드를 보고 고르는 쪽이 이김) | 숨김: **Stratego**(배치 비공개) · **Air, Land & Sea**(뒷면 카드) · **Marvel Snap**(장소 숨김) / 동시 공개: **Dune** 외 다수 / 후출 비용: **Battle Line**(동점이면 마지막에 놓은 쪽 패배 · 전술 카드 개수 상한) · **Sekigahara**(약자에게 주도권) / 공개 기록: **Ankh**(쓴 카드가 앞면으로 남음) | 방어 편성의 작전 카드는 숨기고 「공 · 방 · 유 한 장씩」만 공개 · 상성 이득을 2배 안팎으로 제한 · (아이디어) 방어 편성 여럿 중 무작위 — **비동기 대전에서 검증된 사례는 못 찾았다** |
| 칸 구성 강제 · 쿼터 | **Hanamikoji**(행동 4종 한 번씩) · **Air, Land & Sea**(3개 전역) · **Oathsworn**(쿨다운 값별 장수 고정) · **Legion**(핍 2/2/2 + 기본 1) · **Warhammer Underworlds**(계략 절반 이하 · 제한 카드 5장 이하) | 공 · 방 · 유 한 장씩 강제의 선례 |
| 공 · 방 · 유 3분할에 가장 가까운 카드 분류 | **Unmatched**(공격 · 방어 · 계략 · 만능 + 동시 공개) · **Street Masters**(공격 · 능력 · 전술(자세 — 앞에 두고 유지)) · **C&C The Great War**(Hand Grenade · Body Armour · Improved Logistics) · **Dungeon Mayhem** | 유틸 = 「앞에 두고 유지되는 자세」(Street Masters)가 우리 유틸 칸 모양 |
| 보호 카드의 상한 | **Super Fantasy Brawl** — 반응(보호) 카드는 영웅이 아니라 편성의 것 · 공격 한 번에 1장 · 맞은 영웅이 아니어도 씀 | 친위대 · 방패벽 같은 방어 카드의 선례 |
| 카드가 부딪힐 때 누가 먼저 | **War of the Ring 2판** — 우선순위 번호(정찰 후퇴(1)가 특수 공격(2)보다 먼저 → 공격 불발) | 작전 카드끼리 충돌하면 번호 한 줄로 정한다 |
| 진형 이름을 그대로 쓴 예 | **Battle Line** — 쐐기 > 팔랑크스 > 대대 > 산병선 > 무리(진형 등급) · **C&C** — Clash of Shields · Mounted Charge · Darken the Sky · First Strike · Counter Attack · **Hannibal** — Frontal Assault · Flank · Probe · Double Envelopment | 이름이 「짝 열쇠」로만 쓰이면(Hannibal) 이름과 효과가 따로 논다 — 우리는 이름 = 효과로 |

- 조사자 넷 모두 **「공 → 방 → 유 → 공」 3자 순환 상성을 그대로 쓴 게임은 못 찾았다** — 순환은 우리가 짠다. 대신 「공격 종류 ↔ 방어 종류 짝 맞추기」(Dune · Hannibal · Netrunner)가 넓게 쓰인다.
- 대부분 턴제라 「실시간 자동전투 한 판에 카드가 몇 번 발동하나」는 우리가 따로 정한다.

## 2. 전략 · 영역 장악 게임의 전투 카드 · 동시 공개 · 맞물림 (20 + 읽지 못한 5)

| 게임 | 연도 · 디자이너 | 장치 | 무엇이 무엇을 이기나 | 공·방·유 | 가져올 점 | 출처 |
|---|---|---|---|---|---|---|
| Dune 듄 | 1979 Eberle · Kittredge · Olotka · 2019 GF9 재간 | 병력 다이얼 + 리더 + 무기 + 방어 카드를 비밀로 정해 동시 공개 | 투사체는 방패가, 독은 스누퍼가 막는다 · 맞는 방어가 없으면 리더가 죽는다 · 레이저총 + 방패는 쌍방 전멸 · 숫자 큰 쪽 승 | 있음(무기 · 방어 · 숫자 · 리더) | 짝 맞추기의 원형 · 쓸모없는 카드로 허세 | [룰 요약](https://www.orderofgamers.com/downloads/Dune2019_v2.pdf) · [카드표](https://spotlightongames.com/summary/dunecards.html) · [Wikipedia](https://en.wikipedia.org/wiki/Dune_(board_game)) |
| Cosmic Encounter | 1977 Olotka 외 | 공격 · 협상 · 증원 카드 비밀 선택 후 동시 공개 | 공격 > 협상(협상 쪽은 잃은 함선만큼 손패를 뽑아 감) · 협상끼리 1분 안에 못 맺으면 양쪽 3척 손실 | 공 / 협상 / 증원 | 어긋났을 때의 대가가 카드 안에 | [Wikipedia](https://en.wikipedia.org/wiki/Cosmic_Encounter) |
| Blood Rage | Eric Lang(CMON) · 연도 미확인 | 전투 카드 한 장 동시 공개 · 일부 카드는 공개 뒤 추가 | 힘 합 큰 쪽 승 · 동점은 전원 패배 · 진 쪽은 카드 회수, 이긴 쪽은 버림 | 힘 / 기타 | 이기면 소모 — 같은 작전 반복 불가 · 공개 뒤 추가는 습격자부터 | [룰 요약](https://lehi-innovation.github.io/boardgame-rules/rules/blood-rage/) |
| Kemet: Blood & Sand | Bariot · Montiage(Matagot) | 2장을 골라 1장은 뒷면으로 버리고 1장만 동시 공개 | 힘 큰 쪽 승(동점은 수비) · 데미지 − 방어만큼 손실 · 8장 다 쓰면 회수 | 힘 / 데미지 / 방어(수치) | 「2장 중 1장 몰래 버리기」로 읽기 어렵게 | [룰 텍스트](https://lehi-innovation.github.io/boardgame-rules/extracted/kemet-blood-and-sand-rules.txt) |
| Ankh: Gods of Egypt | 미확인(CMON) | 신마다 전투 카드 7장 · 동시 공개 | 힘 보너스 합 큰 쪽이 상대 병력 전멸 · 카드마다 특수 효과 | 힘 + 특수 | 쓴 카드가 앞면으로 남아 모두에게 보이고 주기 사건 전엔 못 씀 | [룰북](https://www.cmon.com/wp-content/uploads/2023/06/Ankh_Rulebook.pdf) |
| Rising Sun | 2018 Eric Lang(CMON) | 전투마다 코인을 4개 「전쟁 이점」 칸에 비밀 배분 후 동시 공개 | 칸마다 최다 입찰자가 이점(할복 · 인질 · 낭인 · 시인) · 힘 큰 쪽이 전투 승 | 선택지 4칸 입찰 | 할복 = 내 병력을 잃는 대신 점수(대가가 효과 안) · 비밀 입찰이라 후출 이득 없음 | [룰북](https://resources.cmon.com/Rising_Sun_Rulebook.pdf) |
| A Game of Thrones: The Board Game 왕좌의 게임 | 2판 2011경 · FFG | 가문 카드 한 장 비밀 선택 · 동시 공개 + 명령 토큰 비밀 배치 | 칼 아이콘 1 = 적 1기 처치 · 방벽 아이콘이 칼 상쇄 · 약탈 명령이 지원 · 권력 집중 · 약탈을 지움 · 7장 다 쓰면 6장 회수 | 칼(공) / 방벽(방) / 지원 · 약탈(유) | 명령끼리 가위바위보 · 한 번 쓴 카드 재사용 불가 | [전투](https://ultraboardgames.com/game-of-thrones/combat.php) · [명령](https://ultraboardgames.com/game-of-thrones/orders.php) |
| War of the Ring 2판 반지전쟁 | Di Meglio · Maggi · Nepitello(Ares) | 전투 라운드마다 이벤트 카드를 전투 카드로 · 공격자 먼저 선언 · 동시 공개(뒷면은 보임) | 충돌하면 우선순위 번호가 낮은 쪽부터(정찰 후퇴(1) → 특수 공격(2) 불발) · 같으면 수비 먼저 · 지휘력 포기 같은 대가 | 구분 없음 | 카드끼리 부딪힐 때 순서를 번호로 | [룰북](https://tesera.ru/images/items/134461/WOTR001-Rulebook_EN_web.pdf) |
| Star Wars: Rebellion | FFG · 미확인 | 지휘관 수치만큼 전술 카드를 뽑아 주사위 뒤에 한 장씩 · 수비는 막기 카드 | 공격 효과를 막기 카드가 상쇄 · 동시 공개 여부 미확인 | 공격 / 막기 / 능력 | 카드를 쓰려면 주사위 하나를 버림 — 대가가 자원 | [전투](https://ultraboardgames.com/star-wars-rebellion/combat.php) |
| Forbidden Stars | 2015 FFG | 5장 중 라운드마다 1장 비밀 선택 · 동시 배치 · 공격자부터 처리(최대 3라운드) | 공격 · 방어 · 사기 아이콘이 쌓이고 방어가 피해를 깎음 · 마지막 사기 큰 쪽 승 | 공 / 방 / 사기 | 라운드마다 한 장씩 소모 · 앞 카드 효과가 다음 라운드까지 | [룰북](https://www.orderofgamers.com/downloads/ForbiddenStars_v1.2.pdf) |
| StarCraft: The Board Game | 2007(미확인) FFG | 유닛 1대1 교전마다 전투 카드 1장(+증원)을 뒷면으로 놓고 동시 공개 | 카드 아이콘이 전열 유닛 종류와 맞으면 큰 값 · 특수 능력, 안 맞으면 작은 값 | 공 · 방 수치 + 유닛 매칭 | 편성(전열 · 후열)에 따라 카드가 세지거나 약해짐 · 안 맞음이 대가 | [룰북](https://www.orderofgamers.com/downloads/Starcraft_v3.3.pdf) |
| Twilight Imperium 4 | 2017 FFG | 액션 카드를 숨겨 들고 타이밍 창에 사용 · 다른 카드로 취소 | 같은 이름은 같은 창에서 한 번 · 취소된 카드는 버림 | 약함 | 숨긴 대응 카드 정도 · 복잡해서 직접 가져올 것 적음 | [룰](https://www.orderofgamers.com/downloads/TwilightImperium4thEd_v1.pdf) |
| Inis | 2016(미확인) Christian Martinez | 행동 카드 드래프트 · 충돌은 순서대로(동시 공개 아님) | 공격받은 쪽이 「카드 1장 버리기 / 노출 부족 1개 제거」를 고르거나 철수 · 숨긴 트리스켈 카드가 상대 행동 취소 | 공 / 철수 / 서사 | 방어자가 대가를 직접 고른다 | [룰북](https://www.orderofgamers.com/downloads/Inis_v2.2.pdf) |
| Cyclades | 2009 Cathala · Maublanc | 신의 호의를 숨긴 코인으로 경매 · 한 사람은 신 하나 | 신마다 기능(군 · 해군 · 경제) 독점 | 신 = 기능 | 같은 역할을 둘이 못 가짐 | [Wikipedia](https://en.wikipedia.org/wiki/Cyclades_(game)) |
| Root | 2018 Cole Wehrle(Leder) · 확인 못 함 | 수비가 같은 구역 색의 매복 카드 1장 | 같은 색 매복끼리 상쇄 · 못 막으면 공격자 2피해 · 전투당 1장 | 매복 1종 | 같은 종류끼리 맞받는 가장 단순한 짝 | [Law of Root](https://cdn.shopify.com/s/files/1/0106/0162/7706/files/Root_Law_of_Root_09082021.pdf) |
| Dune: Imperium | 2020 Paul Dennen | 전투 때 병력 + 검 아이콘 합 · 음모 카드를 돌아가며 내고 모두 패스하면 정산 | 합 순위로 보상 · 마지막에 내는 쪽이 정보 이득 | 약함 | 후출 이득의 반면교사 | [룰 요약](https://lehi-innovation.github.io/boardgame-rules/rules/dune-imperium/) |
| Scythe | 2016 Jamey Stegmaier | 파워 다이얼 비밀 설정 + 전투 카드를 다이얼 뒤에(몇 장인지도 숨김) | 다이얼 + 카드 합 큰 쪽 승(동점은 공격자) · 건 파워는 이겨도 소모 | 수치 합 | 이겨도 건 만큼 손해 · 사용 여부 숨김 | [규칙](https://rules.dized.com/scythe/rule/combat/assigning-power-to-combat) |
| Diplomacy | 1959 Allan Calhamer | 모든 명령(이동 · 지원 · 호송)을 비밀로 적고 동시 공개 | 지원받은 이동이 이김 · 지원 중인 유닛이 공격받으면 지원이 끊김 | 이동 / 지원 · 방어 / 호송 | 명령 하나가 다른 명령을 무력화 | [Wikipedia](https://en.wikipedia.org/wiki/Diplomacy_(game)) |
| Battle for Rokugan | 2017 Glover · Jolly(FFG) | 군 · 해군 · 닌자 · 축복 · 외교 · 약탈 토큰을 뒷면 배치 · 가짜 토큰 | 토큰 힘 합 비교(동점은 수비) · 약탈은 조건부 · 가짜는 공개 때 회수 | 군(공) / 방어 보너스 / 닌자 · 약탈(유) | 가짜 작전을 섞는 허세 | [룰](https://ultraboardgames.com/battle-for-rokugan/game-rules.php) |
| Chaos in the Old World | 2009 Eric Lang | 신마다 24장 전용 덱 | 카드 타이밍 · 효과 미확인 · 전투는 주사위 | 약함 | 비교 가치 낮음 | [Wikipedia](https://en.wikipedia.org/wiki/Chaos_in_the_Old_World) |

- 읽지 못함: Eclipse · Oath · Shogun([규칙](https://fgbradleys.com/wp-content/uploads/rules/Shogun%20-%20rules.pdf)) · Lords of Hellas(Adam Kwapiński · [요약](https://orderofgamers.com/downloads/LordsofHellas_v2.pdf)) · Tyrants of the Underdark([룰](https://www.ultraboardgames.com/tyrants-of-the-underdark/game-rules.php))
- 이 갈래 참고 5: **Dune**(짝 맞추기 원형 · 일기토 ↔ 친위대가 이 구조) · **StarCraft**(편성이 카드 세기를 정함) · **Rising Sun**(대가가 효과 안 · 비밀 입찰) · **War of the Ring 2판**(충돌 순서 번호) · **Ankh**(쓴 카드 공개 기록 → 결투장 상대 이력) · 차점 **Root**

## 3. 역사 워게임 · 지휘 카드 · 전술 카드 (24 + 미조사 1)

| 게임 | 연도 · 디자이너 | 장치 | 무엇이 무엇을 이기나 | 공·방·유 | 가져올 점 | 출처 |
|---|---|---|---|---|---|---|
| Hannibal: Rome vs Carthage | 1996 Avalon Hill · 2007 Valley · Simonitch | 전투 카드 덱(장군 등급 + 병력 수만큼, 최대 20장) · 손패 비공개 | 공격자가 한 장 내면 방어자는 같은 종류를 정확히 내야 함 · 못 내면 패배 · 방어자는 라운드마다 반격 굴림 · 양익 포위를 같은 종류로 막으면 공수 역전 · 예비 카드는 만능 | 종류가 짝 열쇠 | 같은 종류로만 막기의 원형 · 손패(편성) 구성이 곧 전략 | [룰 요약](https://www.orderofgamers.com/downloads/Hannibal_v1.1.pdf) |
| Hannibal & Hamilcar | 2016경 Simonitch · Andruszkiewicz(Phalanx) | 위와 동일 + 1차 포에니 | 이긴 쪽이 마지막에 낸 카드 종류로 퇴각 손실을 정함(값 미확인) | 종류가 짝 열쇠 | 카드 종류가 승패 뒤 결과값까지 바꿈 | [룰 요약](https://www.orderofgamers.com/downloads/HannibalandHamilcar_v2.pdf) |
| Battle Line 배틀라인 | 2000 GMT · Knizia | 병력 카드 + 전술 카드 · 깃발 9개마다 3장 · 공개 · 번갈아 놓기 | 진형 등급 쐐기 > 팔랑크스 > 대대 > 산병선 > 무리 · 같으면 합 · 동점이면 마지막에 놓은 쪽 패배 · 깃발은 「어떤 카드로도 못 이긴다」를 증명해야 가져감 | 없음(전술 카드 별도) | 후출 이점을 규칙 셋으로 깎음 · 전술 카드는 상대보다 1장 넘게 못 씀 | [룰](https://ultraboardgames.com/battle-line/game-rules.php) |
| Schotten Totten | 1999 Knizia | Battle Line 원형 · 2004판 전술 카드 10장 | 3장 진형 비교 | 없음 | 전술 카드 효과 미확인 | [Wikipedia](https://en.wikipedia.org/wiki/Schotten_Totten) |
| Commands & Colors: Ancients | 2006 GMT · Borg 외 | 지휘 카드로 명령 · 섹션 카드 + 전술 카드 17장 | 승패가 아니라 행동 자격 — Clash of Shields(인접 전 유닛 근접 +2 · 먼저 이동 불가) · Mounted Charge(근접 +1 · 원거리 불가) · Counter Attack(상대 명령 따라하기) · First Strike(방어자 선타) | 없음 — 모든 카드가 이득 + 제약 한 묶음 | **대가가 효과 안의 교과서** · 반응 카드 | [카드](https://ultraboardgames.com/commands-and-colors-ancients/command-cards.php) |
| Commands & Colors: Medieval | 2014(미확인) Borg | 지휘 카드 + 공개 행동 토큰 | Mounted Charge(기병 반드시 돌격) · Foot Onslaught(원거리 불가) · Darken the Sky(원거리 병력 이동 불가) · Ambush · First Strike(방어자가 쓰고 교체 카드 먼저 뽑음) | 없음 | 제약이 이름에 · 토큰 공개로 상대가 대비 | [룰](https://gamers-hq.de/media/pdf/f6/97/49/CCMedieval_RULES-Final.pdf) |
| Commands & Colors: Napoleonics | Borg 계열 · 미확인 | 지휘 카드 21장 | 이름만: Counter Attack · Cavalry Charge · Bombard · First Strike · Bayonet Charge · Short Supply | 미확인 | 이름 ↔ 효과 예시 | [카드](https://www.commandsandcolors.net/napoleonics/the-game/main/command-cards.html) |
| Memoir '44 | 2004 Days of Wonder · Borg | 섹션 40 + 전술 20 · 턴마다 한 장 | 전술 이름: Ambush · Counter Attack · Barrage · Air Power 등 · Ambush 만 확인(상대 행동 중에 내는 예외) | 없음 | 반응 카드를 한 장 예외로 허용 | [룰 요약](https://www.orderofgamers.com/downloads/Memoir44_v4.2.pdf) |
| Commands & Colors: Tricorne | 미확인 | 섹션 + 전술 카드 | First Strike(낸 유닛은 반격 불가) · Line Volley(근접 불가 · 인접 적 있으면 사격도 불가) | 없음 | 제약이 효과 안 | [카드](https://www.commandsandcolors.net/tricorne/the-game/rules/command-cards.html) |
| Commands & Colors: The Great War | 2015 PSC | 전투 카드를 시점창별로 · HQ 토큰 · 일부는 상대 카드에 반응 | Hold at All Costs · Lost Messenger(상대 지휘 카드에) · Body Armour(상대 원거리 주사위 뒤) · Butt & Bayonet(상대 근접 뒤) | 공(Hand Grenade) · 방(Body Armour) · 유(Improved Logistics) | **공 · 방 · 유 분류와 가장 닮음** · 카드마다 쓸 수 있는 시점이 정해짐 | [카드](https://www.commandsandcolors.net/thegreatwar/the-game/rules/combat-cards-phase-of-play-and-effect.html) |
| Combat Commander: Europe | GMT · Chad Jensen | 운명 카드 한 장이 명령 · 행동 · 사건 · 주사위 겸용 | 행동은 양쪽이 아무 때나 · 동시에 내려 하면 비활성 쪽이 먼저 · Ambush(근접 주사위 전 상대 유닛 분쇄) | 명령 ≈ 공 · 행동 ≈ 방 · 사건 ≈ 유 | 반응하는 쪽이 먼저 쓰는 순서 규칙 | [룰북](https://nastol.io/storage/games/files/combat_commander_europe/657058/CC_Rulebook_v1.1.pdf) |
| Undaunted: Normandy | 2019 Osprey · Benjamin · Thompson | 덱 빌딩 · 4장 중 1장을 선공 입찰로 버림 · 동시 공개 | 입찰 카드는 그 턴에 못 씀 · Fog of War 카드가 덱을 막음 | 카드마다 역할 | 동시 공개 + 입찰 비용 | [설명](https://zatu.com/how-to-play-undaunted-normandy/) |
| Twilight Struggle | 2005 GMT · Gupta · Matthews | 카드 한 장을 사건 또는 작전 점수로 | 상대 사건 카드를 작전으로 쓰면 그 사건도 발동 · 헤드라인은 동시 공개 | 없음 | 이득을 챙기면 상대 이득도 발동 — 대가가 효과 안 | [Wikipedia](https://en.wikipedia.org/wiki/Twilight_Struggle) |
| Paths of Glory | 1999 GMT · Raicer | 조건 충족 시 전투 카드 | 공격자가 전부 낸 뒤 방어자 · 지면 버림 · 라운드당 한 번 · Withdrawal(손실 1단계 막고 한 칸 후퇴) | 없음 | 이름 · 효과 · 대가가 한 문장(Withdrawal) | [룰](https://c.tabletopia.com/games/paths-of-glory-deluxe/rules/pog-deluxe-rules-final-lo-res/en) |
| Sekigahara | GMT · Calkins | 가문 카드를 내야 같은 가문 블록 투입 · 낸 카드 공개 · 손패 비공개 | 같은 가문만 맞음 · 공격자 먼저 · 주도권은 영향력 낮은 쪽으로 · 충성 도전(못 보이면 블록이 상대 편으로) | 없음 | 짝 맞추기 + 블러프 + 약자 추격 | [룰](https://www.yucata.de/en/Rules/Sekigahara) |
| Hammer of the Scots | 2002 Columbia · Dalgliesh · Taylor | 이동 카드 + 사건 · 매 턴 한 장씩 비밀 동시 공개 | 전술 전투 카드 없음 · 블록 등급 + 주사위 · 방어 블록 먼저 | 없음 | 동시 공개로 선후 결정 | [룰](https://rally-the-troops.com/hammer-of-the-scots/info/rules.html) |
| Crusader Rex | 2005(요약) Columbia · Taylor · Dalgliesh | 카드로 이동 · 사건 · 블록 정보 비공개 | 전투 카드 미확인 | 미확인 | 거의 없음 | [제작사](https://columbiagames.com/crusader-rex/) |
| Richard III (Columbia) | 2009 Columbia | 전략 카드 · 전투 중 귀족 배신 | 전투 카드 미확인 | 미확인 | 전투 중 배신 장치 | [리뷰](https://theplayersaid.com/2016/09/20/review-richard-iii-by-columbia-games/) |
| Julius Caesar (Columbia) | 2000(요약) Thompson · Dalgliesh | 카드로 이동 · 징집 · 사건 | 전투 카드 없음 | 미확인 | 거의 없음 | [Wikipedia](https://en.wikipedia.org/wiki/Julius_Caesar_(block_wargame)) |
| Wars of the Roses: Lancaster vs York | 2010 Z-Man · Hawes | 4인 드래프트 · 영지 점령 | 전투 구조 미확인 | 미확인 | 이 갈래에 안 맞음 | [상점](https://www.nobleknight.com/P/2147426035) |
| Successors | 1993 Berg · Simonitch | 캠페인 카드 + 전투 카드 + 주사위 | 미확인 | 미확인 | 미확인 | [리뷰](https://www.meeplemountain.com/reviews/successors-fourth-edition/) |
| A Few Acres of Snow | 2011 Wallace | 덱 빌딩 · 영토 + 제국 카드 | 전투 카드 없음 · 덱 안의 카드가 할 수 있는 일 | 없음 | 편성 카드 수 제한의 약한 근거 | [룰](https://www.yucata.de/en/Rules/FewAcresOfSnow) |
| Men of Iron | GMT · Berg | 전투 카드 없음 · d10 | 유닛 상성은 유닛 규칙 | 없음 | 없음 | [룰](https://gamers-hq.de/media/pdf/06/c6/a2/MOI-NC_booklet_Series-Rules_FINAL_web-1.pdf) |
| Field Commander: Alexander | DVG · 솔로 | 카드 전술 없음 | 해당 없음 | 없음 | 없음 | [룰](https://c.tabletopia.com/games/field-commander-alexander/rules/alexander-rules/en) |

- 미조사: BattleLore
- 정정(조사자): Hannibal 의 「Withdraw」는 카드가 아니라 장군 굴림 행동 · 「탐색 공격」 = Probe · 좌 · 우 측면이 별개 종류인지는 룰북 재확인
- 이 갈래 참고 5: **Hannibal**(같은 종류로만 막기 · 반격 굴림 · 예비 = 만능) · **C&C Ancients · Medieval**(이득 + 제약 한 묶음 · 제약이 이름에) · **Battle Line**(공개 정보에서 후출을 규칙으로 깎음) · **Sekigahara**(짝 + 블러프 + 약자 추격) · **Combat Commander / C&C Great War**(반응 시점창 · 반응하는 쪽 먼저) · 차점 **Paths of Glory**(Withdrawal)
- 주의: 이름을 「짝 열쇠」로만 쓰면(Hannibal 의 Frontal Assault · Flank · Probe) 이름과 효과가 따로 논다 · 같은 이름도 게임마다 효과가 다르다(Counter Attack)

## 4. 미니어처 스커미시 · 영웅 · 파티 전투 (25)

| 게임 | 연도 · 디자이너 | 장치 | 무엇이 무엇을 이기나 | 공·방·유 | 가져올 점 | 출처 |
|---|---|---|---|---|---|---|
| Warhammer Underworlds | 2017 GW | 계략(ploy) · 주문 · 강화 · 목표 두 덱 · 반응은 상대 행동 도중 | 반응 카드가 상대 계략 · 공격을 되받음 · 연쇄면 직전 사용자의 상대가 우선 | 계략 / 강화 / 목표 · 힘 카드 20장 이상 · 계략 절반 이하 · 목표 12 · 제한 카드 5 이하 | 덱 구성 상한 · 강화가 영웅에 영구히 붙음(인챈트 옵션과 같은 구조) | [공식 가이드](https://tinmangames.com.au/warhammer-underworlds-rules-guide-part-three/) (요약) |
| Unmatched 언매치드 | Vol.1 2019 · Daviau · Jacobson | 영웅마다 고유 30장 · 공격 · 방어 · 계략 · 만능 · 공격자와 방어자가 엎어 동시 공개 | 공격 수치 − 방어 수치 = 피해 · 방어를 안 낼 수도 · 카드마다 쓸 영웅 지정 | **공 · 방 · 계략 · 만능** | 공 · 방 · 유 구분과 동시 공개의 가장 직접적인 선례 · 만능 카드로 칸 유연성 | [룰북](https://nastol.io/storage/games/files/unmatched_cobble_fog/923463/UM-CaF_rules.pdf) |
| Super Fantasy Brawl | 2020 ~ 21 Mythic Games | 챔피언 3명의 행동 덱을 합쳐 한 덱 · 코어 소모 | 반응 카드는 편성(플레이어)이 냄 · 공격 한 번에 1장 · 맞은 영웅이 아니어도 씀 | 행동 / 반응 / 도전 | **친위대 · 방패벽 같은 보호 카드의 선례** · 공격당 1장 상한 | [룰북](https://www.orderofgamers.com/downloads/SuperFantasyBrawl_v1.pdf) |
| Godtear | Steamforged | 대시보드 카드 뒤집기 · 주사위 · 배틀 래더 | 카드끼리 맞물림 없음 | 4직이 서로 다른 점수원 | 참고 가치 낮음 | [룰](https://ultraboardgames.com/godtear/game-rules.php) (요약) |
| Mythic Battles: Pantheon | Monolith | 유닛 활성화 카드 + 「전쟁의 기술」 카드 · 손패 3 | 움직일 때 그 유닛 카드를 버림 · 반격도 카드 소모 | 카드 = 행동 자원 | 카드를 내는 것 자체가 비용 | [룰 요약](https://www.orderofgamers.com/downloads/MythicBattlesPantheon_v2.1.pdf) |
| Krosmaster Arena | Ankama | 카드 없음 · AP · MP · 이탈 시 Lock vs Dodge | 이탈 실패면 AP · MP 상실 · 레벨 예산 편성 | 없음 | 이탈에 대가 · 레벨 예산 | [요약](https://lehi-innovation.github.io/boardgame-rules/rules/krosmaster-arena/) (오류 경고) |
| Summoner Wars | Plaid Hat | 덱 = 유닛 · 이벤트 · 마법 자원 | 쓰는 카드를 마법 더미에서 지불 | 유닛 / 이벤트 / 벽 | 종류별 고정 장수 | [룰](https://ultraboardgames.com/summoner-wars/game-rules.php) |
| Gloomhaven 글룸헤이븐 | 2017 Isaac Childres | 매 라운드 2장 비밀 선택 · 동시 공개 · 한 장의 선제값이 순서 · 위 칸 + 아래 칸 | 선제값 낮은 쪽 먼저 | 위 · 아래 칸에 섞임 · 일부는 쓰면 영구 손실 | 강한 효과 = 느린 선제값 · 영구 손실(대가 내장) | [Wikipedia](https://en.wikipedia.org/wiki/Gloomhaven) · [룰 요약](https://www.orderofgamers.com/downloads/Gloomhaven_v1.1.pdf) |
| Frosthaven · Jaws of the Lion | 미확인 | Gloomhaven 틀 | 미확인 | 미확인 | 미확인 | [요약](https://lehi-innovation.github.io/boardgame-rules/rules/gloomhaven-jaws-of-the-lion/) |
| Too Many Bones | Chip Theory | 스킬 · 공격 · 방어 주사위를 훈련으로 해금 · 4x4 격자 | 공격 주사위 vs 방어 주사위 · 선제값 눈금 | 공 · 방 · 스킬 주사위 | 영웅별 로드아웃 해금 · 전리품 캐릭터당 4장 상한 | [요약](https://lehi-innovation.github.io/boardgame-rules/rules/too-many-bones/) |
| Mage Knight | 2011 Vlaada Chvátil | 시작 덱 16 + 기본 · 고급 · 주문 · 유물 · 라운드마다 **전술 카드(12장) 한 장**으로 순서 · 보너스 | 숫자 낮은 전술이 먼저 · 카드마다 다른 보너스 | 카드를 어떤 용도로 쓸지 고름 · 눕혀서 기본 1 | 라운드에 한 번 고르는 우선권 카드 · 한 카드 여러 용도 | [Wikipedia](https://en.wikipedia.org/wiki/Mage_Knight_(board_game)) |
| Descent: Legends of the Dark | 2021(미확인) FFG | 영웅 · 무기 카드 양면(뒷면 = 강화) · 기술 카드 42 | 협동 · 앱 적 | 클래스 기술 | 양면 카드로 강화 표현 | [요약](https://lehi-innovation.github.io/boardgame-rules/rules/descent-legends-of-the-dark/) |
| Kingdom Death: Monster | 2015 Adam Poots | 몬스터 AI 덱 · 적중 부위 덱 · 장비 3x3 배치 | AI 카드가 몬스터가 누구를 어떻게 치는지 정함 | 없음 | 몬스터 행동을 카드 덱으로 — 우리의 「적 구성 = 상대 카드」와 닮음 | [Wikipedia](https://en.wikipedia.org/wiki/Kingdom_Death:_Monster) |
| Oathsworn | 2020 Jamie Jolly | 능력 카드 7장 · 쿨다운 0 1장 · 1 2장 · 2 2장 · 3 2장 고정 · 낸 카드는 쿨다운 칸에 | 0 칸에 돌아온 카드만 복귀 · 인터럽트 카드 | 쿨다운 값으로 가름 | **칸 구성 쿼터** · 레벨업 해금 · 편성은 전투마다 변경 | [룰북](https://www.orderofgamers.com/downloads/Oathsworn_v1.3.pdf) |
| Sword & Sorcery | Ares Games | 영웅 시트 + 능력 카드 · 영혼 토큰 부활 | 미확인 | 미확인 | 미확인 | [제작사](https://www.aresgames.eu/22263) |
| Star Wars: Legion | 2018 Alex Davy 외 | 지휘 카드 7장(1 · 2 · 3핍 각 2 + 기본 1) 비밀 선택 · 동시 공개 · 핍 낮을수록 우선 · 명령 수만큼 부대 | 빠르면 명령이 적다 · 어떤 라운드에 어떤 카드를 쓰나로 읽기 | 핍 구간 2/2/2(+1) · 캐릭터 전용 카드 | **가장 많이 가져갈 구조** · 강한 건 느리다가 카드 안 · 영웅 연동 전용 카드 | [Learn to Play](https://cdn.shopify.com/s/files/1/0024/8617/3749/files/swl01_learn_to_play_web_ready_engcompressed.pdf) |
| Star Wars: X-Wing | FFG | 기동 다이얼을 비밀로 돌려 동시 공개 | 상대가 어디로 갈지 읽는 맞추기 · 어려운 기동은 스트레스 | 난이도 색 | 동시 공개 맞추기 · 스트레스 = 대가가 효과 안 | [룰 요약](https://www.orderofgamers.com/downloads/StarWarsXWing_v2.4.pdf) |
| Blood Bowl: Team Manager (카드게임 — 미니어처판 아님) | 2011 FFG | 드래프트 · 스태프 카드는 뽑은 장수의 절반만 남김 · 시즌 이월 한도 | 하이라이트별 능력치 승부 | 선수 / 스태프 / 팀 업그레이드 | N장 뽑아 절반 남기기 · 이월 한도 | [룰북](https://how-to-play.s3.us-east-2.amazonaws.com/90137/rules/90137_rules.pdf) |
| Guild Ball | Steamforged | 게임 플랜 카드 18장 · 선제값과 영향력 보정이 짝 | 선제 높으면 영향력이 깎임 · 승리 경로 반응 카드 | 효과 · 반응형 | 선제 vs 자원 맞바꿈이 카드 안 · 상대 전략에 맞춘 카드 | [Update 11](https://steamforged.com/blogs/brands/guild-ball-update-11) |
| Malifaux | 2009 Caroland · Johns · Weber | 운명 덱 54장 · 손패로 운명 속이기 | 총합 낮은 쪽이 먼저 속일 기회(역전 장치) · 대결당 한 번 | 없음 | 중요한 순간을 위해 아껴 두기 · 진 쪽 역전 | [4E 룰 초안](https://static1.squarespace.com/static/54fe412ce4b0c449f7369857/t/68010d71de31be6f2b1a53a9/1744899453875/M4E-Comprehensive-Rules_DRAFT_4.16.2025.pdf) |
| Bushido | GCT Studios | 기 풀 · 기 비법 · 활성화 3단계 | 미확인 | 미확인 | 미확인 | [규칙](https://gctstudios.com/pages/rules) |
| Arena: The Contest | 2019 Aboud 외 | 전술 미니어처 · 카드 295장 | 미확인 | 미확인 | 미확인 | [Dicetower](https://dicetower.com/board-game/219217) |
| Tiny Epic Tactics | Scott Almes | 영웅 카드 + 전술 카드(역습 반응) | 미확인 | 미확인 | 반응으로 되받기 정도 | [Dized](https://rules.dized.com/game/_xLzk8vTTiulAj-vUHHAvg/TfovAwHMSF-53L2bqtj2zg/game-overview) |
| Street Masters | Sadler 형제 · Blacklist → Steamforged | 공격 카드 · 능력 카드 · 전술 카드(자세 — 앞에 두고 유지) | 방어 토큰으로 막음 · 보스는 AI 덱 | **공격 / 능력 / 전술(자세)** | 유틸 = 앞에 두고 지속되는 자세 | [소개](https://steamforged.com/blogs/brands/what-is-street-masters) |
| Marvel Champions | 2019 Boggs · French · Grace | 영웅 덱 = 필수 + 상성(Aspect) 1개 + 공용 · 영웅 / 평상 폼 | 영웅 폼 = 공 · 방 · 평상 폼 = 위협 줄이기 | 공격 / 보호 / 정의 / 리더십 | 덱 정체성을 한 상성으로 · 손패를 버려 값 지불 | [Wikipedia](https://en.wikipedia.org/wiki/Marvel_Champions:_The_Card_Game) |

- 이 갈래 참고 5: **Star Wars: Legion**(빠르면 명령이 적다 · 구간별 장수 제한 · 캐릭터 전용 카드) · **Oathsworn**(칸 쿼터 + 해금) · **Super Fantasy Brawl**(보호 카드는 편성의 것 · 공격당 1장) · **Warhammer Underworlds**(덱 상한 · 영구 강화) · **X-Wing**(비밀 결정 + 동시 공개) · 차점 Malifaux(진 쪽 먼저 속이기) · Guild Ball(선제 vs 자원)
- 이 갈래에도 공 · 방 · 유 3칸 가위바위보로 설계한 게임은 없다 · 「물고 물림」은 대부분 턴 안의 반응이다

## 5. 1:1 카드 대결 · 가위바위보 · 블러프 (27)

| 게임 | 연도 · 디자이너 | 장치 | 무엇이 무엇을 이기나 | 공·방·유 | 가져올 점 | 출처 |
|---|---|---|---|---|---|---|
| Yomi 요미 | 2011 David Sirlin | 한 장을 엎어 동시 공개 | 공격 > 잡기 · 잡기 > 막기 · 회피 · 막기 · 회피 > 공격 · 이긴 보상이 갈래마다 다름(콤보 / 막기 제거 / 반격 / 카드 뽑기) | 있음 | **삼각 상성 + 승리 보상 비대칭** — 운을 읽기로 바꿈 | [Designing Yomi](https://www.sirlin.net/articles/designing-yomi) · [Wikipedia](https://en.wikipedia.org/wiki/Yomi_(card_game)) |
| Flash Duel | Sirlin(En Garde 착안) | 숫자 카드 하나로 이동 · 공격 · 방어 | 거리와 숫자가 맞으면 한 방 · 방어는 같은 숫자 | 없음 | 한 장이 여러 역할 | [소개](https://sirlingames.com/flashduel) |
| BattleCON | 2013판 D. Brad Talton Jr. | 스타일 + 베이스 한 쌍 비밀 선택 · 동시 공개 | 우선도 높은 쪽 먼저(세부 미확인) | 한 쌍 안에 공 · 방 섞임 | 두 장 짝지어 내기 · 쓴 카드가 한동안 잠김 | [리뷰](https://miniaturemarket.com/reviewcorner/battlecondevastationindines) |
| Exceed | Level 99 | 공격 선언 시 양쪽 비밀 선택 · 동시 공개 | 속도 높은 쪽 먼저 · 방어 쪽은 선공 피해가 Armor / Guard 를 못 넘으면 발동 | 공격 · 부스트 · 방어값 | 수치로 부분 상쇄하는 부드러운 상성 | [미리보기](https://techraptor.net/content/exceed-preview-exceeding-expectations) |
| Pixel Tactics | Level 99 | 영웅 카드 한 장이 Vanguard / Flank / Rear / Order 네 효과 · 놓는 자리에 따라 하나 켜짐 | 근접은 앞줄이 살아 있으면 뒷줄을 못 침 | 자리 = 역할 | 전열 · 후열마다 같은 카드의 다른 면 — 우리 두 줄 구조와 직결 | [룰](https://rulespal.com/pixel-tactics/rulebook) |
| Air, Land & Sea | 2015(재판 2018) Jon Perry 외 | 공중 · 지상 · 해상 전역에 카드 · 뒷면으로 내면 힘 2 블러프 | 전역 합 큰 쪽 · 2개 전역이면 승 · 동률은 선공 · 일찍 철수할수록 점수 덜 잃음 | **3개 전역 = 3분류** | 3줄 강제 + 뒷면 블러프 + 일찍 포기하면 싼 대가 | [룰](https://officialgamerules.org/game-rules/air-land-and-sea/) |
| Hanamikoji 하나미코지 | 2013 Kota Nakayama | 행동 4종을 한 번씩 · 하나는 비밀 보관 | 게이샤별 카드 수 · 호감도로 귀속 | 행동 4종 한 번씩 강제 | 칸마다 서로 다른 행동을 한 번씩 강제(3종 내용 미확인) | [리뷰](https://www.tabletopgaming.co.uk/Reviews/hanamikoji-review) |
| Tash-Kalar | 2013 CGE | 말을 놓아 패턴을 만들면 소환 | 상성 없음 | 없음 | 패턴 조건으로 카드 사용 제한 | [소개](https://analog.games/gameItem/show/419cd83f9656f45d019657f8a09d6ef0/%7B%7B%20url_cookies%20%7D%7D) |
| Onitama | 2014 Shimpei Sato | 이동 카드 5장 중 2장씩 공개 · 쓴 카드가 상대에게 | 위치 싸움 | 없음 | 쓴 카드가 상대에게 넘어가는 순환 | [Wikipedia](https://en.wikipedia.org/wiki/Onitama) |
| The Duke | 2013 Holcomb · McLaughlin | 타일 양면 · 움직이면 뒤집힘 | 움직임이 매번 바뀜 | 없음 | 쓰고 나면 달라지는 카드 | [Wikipedia](https://en.wikipedia.org/wiki/The_Duke_(board_game)) |
| Dice Throne | Roxley | 주사위 조합이 공격 능력을 열고 공격받으면 방어 능력 | 공격(턴당 한 번) + 방어 + 궁극기 · 방어 불가 피해는 방어를 건너뜀 | 공 · 방 따로 | 공격 칸과 방어 칸 분리 · 방어 불가 예외 | [룰북](https://cdn.shopify.com/s/files/1/0045/4013/7562/files/Dice_Throne_Rulebook_-_v2.3.2_-_2022.07.04.pdf) |
| Radlands | 2021 Daniel Piechnick | 거점 + 인물 + 물 토큰 비용 | 물이 모자라 고르는 압박 | 약함 | 자원 부족이 고르는 압박 | [리뷰](https://www.meeplemountain.com/reviews/radlands) |
| Spartacus | 2012 Gale Force 9 | 음모 카드 · 검투 베팅 | 시합 밖 암투가 핵심 | 없음 | 시합 전 사전 개입이 승패를 바꿈 | [룰 요약](https://www.orderofgamers.com/downloads/Spartacus_v4.1.pdf) |
| Codex | Sirlin | 영웅 3 + 기술 단계 건물 | 맞물림 미확인 | 약함 | 3영웅 편성 | [리뷰](https://www.meeplemountain.com/reviews/codex-card-time-strategy-review-david-sirlin) |
| Magic: The Gathering | 1993 Garfield | 색 5개 원형 · 색마다 강점 · 약점 | 아키타입 삼각 상성 서술은 근거 못 찾음 | 없음 | 속성마다 못하는 것을 정해 둠 | [기사](https://dotesports.com/?p=150792) |
| Android: Netrunner | 2012 Garfield 외 | 기업 ICE 3종(Barrier · Code Gate · Sentry) ↔ 러너 브레이커 3종(Fracter · Decoder · Killer) | 종류가 맞는 브레이커만 깸 + 힘을 돈으로 올림 | 비대칭 진영 | **3종 짝 맞추기 + 비용 보정** | [Stimhack](https://stimhack.com/ice-and-icebreakers/) · [FFG](https://www.fantasyflightgames.com/en/news/2015/5/19/your-sysops-dirty-little-secret/) |
| KeyForge | 2018 Garfield | 덱에 하우스 3 · 매 턴 하나만 선언 | 하우스 선택이 매 턴 읽기 | 약함 | 「이번엔 이 계열만」 선언 | [Wikipedia](https://en.wikipedia.org/wiki/KeyForge) |
| Legend of the Five Rings LCG 결투 | FFG | 명예 다이얼 1 ~ 5 비밀 입찰 | 기술 값 낮은 쪽 패 · 동률 무승부 | 없음 | 몰래 걸고 동시 공개하는 입찰 | [FFG](https://www.fantasyflightgames.com/en/news/2018/12/10/an-imperial-edict/) |
| Star Realms · Hero Realms | 2014 · 2016 Dougherty · Kastle | 덱 빌딩 · 같은 파벌이 깔려 있으면 Ally 효과 | 파벌 시너지 | 없음 | 같은 계열이 둘 이상이어야 켜짐 | [룰](https://www.herorealms.com/base-game-rules/) |
| Dungeon Mayhem | WotC | 공격 · 방어(shield) · 회복 · 드로우 카드 | 공격은 방어 카드를 먼저 깎음 | 공 · 방 · 유 비슷 | 한 카드 = 공 / 방 / 유 중 하나 | [룰](https://ultraboardgames.com/dungeon-mayhem/game-rules.php) |
| Smash Up | 2012 Paul Peterson | 파벌 두 개를 섞어 한 덱 | 시너지 | 없음 | 두 계열 섞기 | [룰](https://smashup-rulebook.alderac.com) |
| Coup | 2012 Rikki Tahta | 캐릭터를 엎어 두고 「나는 ○○」 선언 · 의심하면 공개 | 도전에서 진 쪽이 목숨 하나 | 역할 = 행동 | 선언 + 의심 | [Wikipedia](https://en.wikipedia.org/wiki/Coup_(card_game)) |
| Skull | 2011 Hervé Marly | 꽃 3 + 해골 1 엎어 놓고 입찰 | 해골이 나오면 실패 | 없음 | 몰래 내놓고 횟수로 걸기 | [Wikipedia](https://en.wikipedia.org/wiki/Skull_(card_game)) |
| Sheriff of Nottingham | 2014 Halaban · Zatz | 가방에 물건 · 종류와 개수 선언 | 개수는 거짓 불가 · 종류는 거짓 가능 · 검사 / 통과 | 없음 | 선언을 일부만 거짓으로 | [Wikipedia](https://en.wikipedia.org/wiki/Sheriff_of_Nottingham_(board_game)) |
| Fight for Olympus | 2016 Matthias Cramer | 6칸 진영 · Olympus 부터 순서대로 전투 | 칸 순서대로 해결 | 칸 순서 | 칸 순서가 정해진 결투 | [룰](https://www.lookout-spiele.de/upload/de_olymp.html_Rules_FightForOlympus_EN.pdf) |
| Stratego | 연도 미확인 | 말 계급을 숨긴 채 배치 | 높은 계급 승 · Spy 는 Marshal 을 공격할 때만 · Bomb 은 Miner 만 해제 | 공격 말 / 폭탄 / 해제 | **방어 편성의 정체를 숨김** + 소수의 대응 말 — 비동기 결투장에 가장 가까움 | [룰](https://officialgamerules.org/game-rules/stratego/) |
| Marvel Snap | 2022 Second Dinner | 3개 장소에 동시 공개 · 장소 효과는 턴 1 ~ 3에 하나씩 공개 | 2개 장소 승 · 지난 턴 카드만 앎 | 약함 | 동시 공개 + 장소 숨김으로 후출 막기 | [기사](https://www.gamedeveloper.com/game-platforms/designers-don-t-sleep-on-marvel-snap-s-simultaneous-turns) |
| Battle Line (보강) | 2000 Knizia | §3 과 같음 | — | — | — | §3 |
| Pokémon TCG | 미확인 | 카드마다 약점 ×2 · 저항 −30 | 부드러운 상성 | 없음 | 상성을 배율로 카드마다 적음 | [Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Type_(TCG)) |

- 이 갈래 참고 5: **Yomi**(이긴 보상 비대칭) · **Air, Land & Sea**(3줄 강제 · 뒷면 블러프) · **Hanamikoji**(행동 한 번씩 강제) · **Netrunner**(3종 짝 + 비용 보정) · **Stratego**(방어 편성 숨김) · 대체 Marvel Snap
- 후출 해법 표(조사자 제안 — 비동기에서 검증된 사례 없음): 방어 편성의 작전 카드 숨김(「공 · 방 · 유 한 장씩」만 공개) · 공격자도 방어 편성을 보기 전에 확정 · 상성 이득 2배 안팎 · 카운터가 빗나가면 손해 · 방어 편성 2 ~ 3개 중 무작위(Gems of War 포럼 아이디어 — 검증 없음) · 카드별 채택률 공개로 메타 읽기

---
*마지막 업데이트: 2026-11-25*
