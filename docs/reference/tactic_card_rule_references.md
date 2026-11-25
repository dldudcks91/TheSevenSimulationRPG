# 전술카드 규칙 — 다른 게임의 전술 · 진형 · 증강이 거는 규칙

> 조사: 2026-11-25. 웹 조사를 세 갈래로 나눠 했다.
> - 보드게임 · 미니어처: 14개 게임, 122장
> - 전략 · 전술 RPG · SLG · 모바일: 26개 게임, 178건
> - 오토배틀러 · 방치형: 16개 게임, 203건
>
> **이 문서에 넣은 것:** 카드 · 진형 그 자체가 거는 **규칙**이다. 우리 전투(3 대 3, 전열 · 후열, 자동, 전열 문, 도발, 9라운드 HP 이월, 리더 1명)로 옮길 수 있는 것(○ 그대로 / △ 손봐야)만 추려 갈래별로 다시 묶었다.
>
> **뺀 것:**
> - 순수 스탯 카드
> - 격자 이동 · 덱 구조 · 사거리 전제 카드 (×)
> - 붙는 옵션 줄 구조. 이건 [tactic_option_structure_references.md](tactic_option_structure_references.md)에 있다.
>
> **출처 주의:**
> - 나무위키 · Fandom · game8은 막혀(402 · 403) 공략 사이트 · 공식 매뉴얼 · 데이터 파일로 대신했다.
> - 중국어 · 일본어 문구는 요약기를 거쳐 한 글자 원문이 아닐 수 있다.
> - 한국어 이름은 비공식 번역이다.
> - 수치는 참고작의 것이다.
>
> **관련 문서:**
> - 겉 시스템: [tactic_system_references.md](tactic_system_references.md)
> - 보드게임 방식 약 100: [boardgame_tactic_references.md](boardgame_tactic_references.md)
> - 역사 전술 33: [historical_tactics.md](historical_tactics.md)

## 0. 요약

### 0-1. 지금 카드 후보와 선례

| 우리 카드 | 같은 규칙을 가진 다른 게임 | 거기 붙은 대가 · 조건 |
|---|---|---|
| 후열 피해를 전열이 대신 받는다 | 몽중시신(삼국지 전략판: 리더 피해 20→40%를 부장 1명이 분담) · Monk(도타 오토체스: 받는 피해 30%를 나머지 생존 아군 전원이 나눠 받음) · Defender · Guard Dog(다키스트 던전: 아군 1명을 3 · 2라운드 가드) · Damage Sharing(Mechabellum) · The Tankiest(Despot's Game) · 대대(FE 풍화설월: 피해 절반을 대대가 받음) | 초반 2라운드만 · 나눈 몫은 방어 무시 · 범위 공격은 못 막음 · 인접해야 함 |
| 친위대 (리더 보호) | 고지악래(왕도천하: 리더가 평타 대상이면 60% 확률로 대신 맞고 반격) · 무봉진(전략판: 리더가 적의 무작위 공격을 끌어옴) | 확률 · 3인 병종이 달라야 함 |
| 일기토 | Epic Challenge(워해머 40K: 캐릭터 공격이 캐릭터를 직접 지정) · Leader 전술(오우거 배틀: 적 부대의 리더를 친다) · 수이필고(전략판: 개전 시 적 리더를 **도발**, 방향이 반대) · Betrayal(TFT: 짝의 대상을 따라 침) · Superhero(매직 체스: 최다 딜러에 표식) | 1CP · 짝 한정 · 3초 뒤 |
| 방패벽 | Shield Wall(토탈 워 로마 2: 방어 ↑ · 이동 ↓) · Shieldwall(배틀 브라더스: 방패 방어 1턴 2배) · Block(DD: 다음 1타 −50%) · Twin Guardians(TFT: 전열이 정확히 2명이면 둘에게 HP · 방어 +) | 이동 ↓ · 피로 · 다음 1타만 |
| 거북 진형 (폭식) | Turtle(토탈 워 3K: 궁수에 거의 면역 · 공속 ↓) · 겐부(로맨싱 사가 3: 전원 속도 −75%, 턴 끝마다 전원 재생) · 타이거즈 케이브(RS3: 행동 전 방어 유지 · 속도 −75%) · Toranajin(사가 EB) | 속도 · 공속 ↓ |
| 쐐기진 | Wedge(라스트 리모넌트: 전열 공격 ↑, 후열 방어 크게 ↓) · Wedge(3K 기병: 돌격 ↑ · 방어 · 속도 ↓) · 봉시진(전략판: 리더 주는 +30% · 받는 +20%, 부장은 반대) | 뒤가 약해짐 |
| 거짓 후퇴 | 조야복 釣り野伏(노부나가: 적 행동 제한 + 사격 강화) · 쇼군 2 Feigned Retreat(원문 미확인) | **선례 문구가 약하다** |
| 트로이 목마 | **직접 선례 없음.** 가까운 것: Blink Dagger(언더로드: 개막에 적 후방 · 가장 먼 적 옆으로) · Divine Soldier(AFK 저니: 개막에 맨 앞 영웅을 적진에 던져 스턴) · Tinder Box · Door Head Ant(SAP: 전열이 비면 튀어나옴) · Phony Frontline(TFT: 미끼 2개) | 개막 1회 · 전열이 비어야 |
| 화살비 | Darken the Sky(C&C: 원거리 전원 2회 사격) | 이동 불가 · 인접 적이 있으면 불가 |
| 개막 돌격 | Stunning Attack(AFK 저니: 개막에 모든 적 최대 HP 10% + 3초 스턴) · Precision and Grace(TFT: 개막 3초 공속 + · 처치하면 다시) · 래피드 스트림(RS2: 항상 선공) | 래피드 스트림 = 속도 −2 · 행동 후 스턴 |

### 0-2. 조사에서 새로 보인 갈래

- **누가 맞나를 바꾸는 진형** (§2): 로맨싱 사가 진형은 칸마다 피격 확률을 정한다. 우리 대상 고르기는 「전열 생존자 중 무작위」라 가중치만 바꾸면 그대로 들어간다. 클로즈 델타는 3인 진형이고 50 / 25 / 25다.
- **라운드를 지정하는 규칙** (§5): 용무통신(2 · 4 · 6 · 8라운드에만) · 팔문금쇄진(초반 3라운드) · 의심소열(처음 30% 아래일 때 1번). 9라운드 구조에 그대로 맞는다.
- **「전열이 비면」 규칙** (§4 · §6 · §11): Door Head Ant · Drop Bear · Tinder Box. 우리 전열 문 규칙의 경계를 발동 조건으로 쓴다.
- **라운드 끝 성장** (§6): Battle Scars(가장 많이 맞은 유닛) · Ace(가장 많이 때린 유닛)가 웨이브마다 영구 성장한다. HP가 이월되는 9라운드에 맞는다.
- **양쪽에 똑같이 거는 판 규칙** (§10): 횡과약마 · Fatigue · 바자 Glass Cannon. 한쪽만 득을 보지 않아 PvP 기준에 공정하다.
- **마지막 1명 · 수적 열세** (§6 · §9): Lone Hero · Scrappy.

## 1. 누구를 치나 — 대상 선택

| 규칙 | 게임 | 대가 · 조건 | 옮김 |
|---|---|---|---|
| 캐릭터의 공격이 적 캐릭터를 직접 지정(PRECISION) | 워해머 40K Epic Challenge | 1CP · 근접 시작 때 | ○ |
| 적 부대의 리더를 친다 | 오우거 배틀 Leader | — | ○ |
| HP가 가장 많은 적 / 가장 적은 적을 친다 | 오우거 배틀 Strong · Weak | — | ○ |
| 가장 약한 적에 집중 | 도타 언더로드 Deadeye · 도타 오토체스 Dwarf | — | ○ |
| 대상을 바꿀 때 HP가 가장 높은 적부터 | Mechabellum Enhanced Target Lock | — | ○ |
| 한 영웅이 짝의 대상을 따라 친다 | TFT Betrayal | 짝 한정 | ○ |
| 표식 대상에게 여러 스킬이 추가 피해 | 다키스트 던전 Mark Target | 3라운드 | ○ |
| 3초 뒤 피해를 가장 많이 준 적에 표식 · 추가 피해, 그 적이 죽으면 처치자 회복 + 새 표식 | 매직 체스 Superhero | 3초 뒤 | ○ |
| 5초 뒤 HP 비율이 낮은 적 2명 표시, 표시 대상을 치면 공속 + | AFK 저니 Annihilation Mark | 5초 뒤 | ○ |
| 후열만 친다(엄격) / 후열 우선, 없으면 다른 적(선호) | 유니콘 오버로드 Back Row | 엄격형은 대상이 없으면 턴을 건너뜀 | ○ |
| 근접은 열의 맨 앞만, 원거리는 맨 뒤 | Faenora 열 규칙 | — | ○ |
| 도발 · 집중 사격 · 표적 회피(다른 선택지가 있으면 대상이 안 됨) | 브라운더스트 2 | — | ○ |
| 가드를 무시하는 공격 | 다키스트 던전 | 특정 스킬 | ○ |
| 지정한 적이 도발자를 친다 | 배틀 브라더스 Taunt · DD · 삼국지 13 · 14 · 노부나가 | — | ○ |
| 개전 시 적 리더를 도발 + 통솔 ↑ 4라운드 | 삼국지 전략판 수이필고 | 적 리더 한정 | ○ |
| 사거리 안 적 전체를 도발 + 아군 피해 −32% | 왕도천하 견약반석 | — | ○ |
| 2초마다 범위 안 적 전원 도발, 보호막을 친 적은 피해를 입음 | TFT Heroic Presence | — | ○ |
| 위장 중에는 지정 불가, 공격하면 드러남 | Mechabellum Optical Camouflage | — | ○ |
| 개막에 맨 뒤 적에게 피해 (전열 문 예외) | SAP Crocodile | 개막 1회 | ○ |
| HP 50% 이하 무작위 적 1명에게 큰 피해 | 언더로드 Dagon | 전투당 1회 | ○ |
| 아군 3명이 쓰러질 때마다 HP 최고 적에게 피해 | 하스스톤 전장 Boom Squad | 누적 | ○ |
| 적 하나가 오래 능력을 못 씀 | 토탈 워 로마 2 Intimidate | — | ○ |
| 무작위 적 하나가 추가 피해 / HP가 많은 적에게 더 큰 피해 | AFK 아레나 Voodoo Doll · Hunter's Grasp | — | ○ |
| 도주하는 적을 쫓지 않음 | 토탈 워 3K Guard mode | — | △ |

## 2. 누가 맞나 — 피격 분포

| 규칙 | 게임 | 대가 · 조건 | 옮김 |
|---|---|---|---|
| 칸별 피격 70 / 10 / 10 / 5 / 5, ②~⑤ 피해 ×1.25 | 로맨싱 사가 2 봉천무의 진 | ①이 70% 맞음 | ○ |
| 3인 피격 50 / 25 / 25, 보정 없음 | 로맨싱 사가 3 클로즈 델타 | — | ○ |
| 1번이 78% 맞음, 1번 방어 유지 · 속도 −25%, 나머지 속도 +25% | RS3 피닉스 댄스 | 1번이 느림 | ○ |
| 1번이 68.6% 맞음, 1번 방어 유지 · 속도 +25%, 나머지 속도 −25% | RS3 데저트 랜스 · 사가 EB · 리유니버스 | 나머지가 느려짐 | ○ |
| 리더가 더 맞고, 행동 후 방어 ↑ · 리더 속도 ↑ | RS2 리벤지 용신 | 리더 피격 ↑ | ○ |
| 리더가 더 맞고 앞 두 명 속도 · 근접 ↑ | RS2 리벤지 아마존 스트라이크 | 리더 쏠림 | ○ |
| 피격 균등 · 보정 없음 | RS2 프리 파이트 | — | ○ |
| 피격 34 / 32 / 32 / 1 / 1, ①~③ 자동 방어 | RS2 홀리 월 | — | △ |
| 피격 7 / 3 / 65 / 13 / 12 | RS2 임페리얼 크로스 | 한 칸에 몰림 | △ |
| 앞 셋이 더 맞고 방어 ↑ | RS2 리벤지 인페리얼 실드 | — | △ |
| 리더가 평타 대상이면 60% 확률로 대신 맞고 반격 | 왕도천하 고지악래 | 확률 | ○ |
| 적의 무작위 능력이 이 유닛을 우선 | SAP Blueberry | 무작위일 때만 | ○ |

## 3. 대신 맞기 · 분담 — 피해 재분배

| 규칙 | 게임 | 대가 · 조건 | 옮김 |
|---|---|---|---|
| 초반 2라운드, 부장 1명이 리더 피해 20→40%를 분담 | 삼국지 전략판 몽중시신 | 초반 2라운드 | ○ |
| 병력이 처음 30% 아래로 떨어지면 아군 전체가 피해 25→50%를 분담, 1라운드 | 삼국지 전략판 의심소열 | 문턱 1번 | ○ |
| 2턴까지 우군 2명이 받는 피해 15%를 분담 | 삼국지 전략판 병서 만반의 준비 | 2턴 | ○ |
| 아군이 받는 피해의 30%를 다른 생존 아군 전원이 나눠 받음 (나눈 몫은 방어 무시) | 도타 오토체스 Monk | — | ○ |
| 인접한 같은 유닛을 연결, HP +120%, 받는 피해를 균등 분배 | Mechabellum Damage Sharing | 인접 | ○ |
| 탱커가 연결된 파이터의 피해를 대신 받음 | Despot's Game The Tankiest | 세부 미확인 | ○ |
| 아군 1명을 3라운드 / 2라운드 가드 | 다키스트 던전 Defender · Guard Dog | 쓰는 턴 소모 | ○ |
| 3턴 동안 단일 공격을 수호자에게 돌림. 범위 공격은 그대로 맞음 | 다키스트 던전 2 Guarded | 단일 공격만 | ○ |
| 약한 쪽이 다른 영웅에게 자기를 가드하게 강제, 가드한 쪽은 표식 | 다키스트 던전 Protect Me | 전투당 3회 | △ |
| 받는 피해의 절반을 대대가 받음. 대대 내구도는 따로 | 파이어 엠블렘 풍화설월 대대 | 별도 풀 | ○ |
| 받는 피해를 공동으로 나눠 받고 감소 | 매직 체스 Nature Spirit | 방식 미확인 | ○ |
| 처음 10초, 한 적에게 준 피해의 15%가 다른 적에게도 | AFK 아레나 Pendant of Betrayal | 개막 10초 | ○ |
| 초과 피해의 50~80%가 가장 가까운 적에게 | TFT Charge Transfer | — | ○ |
| 1턴 피해 50% 감소 + 기절 · 밀침 면역 | 배틀 브라더스 Indomitable | 행동 · 피로 | ○ |
| 다음 1타 피해 −50% | 다키스트 던전 Block | 1타 | ○ |
| 원거리 물리 피해 0 | FE 풍화설월 Sacred Shield | 5회 | ○ |
| 시전 시 가장 약한 아군과 2초 연결, 피해 일부로 둘 다 회복 | 언더로드 Warlock | 2초 | △ |
| 피격 배정 전에 명중을 취소 | TI4 Shields Holding | 본문 미확인 | △ |

## 4. 열 · 위치

| 규칙 | 게임 | 대가 · 조건 | 옮김 |
|---|---|---|---|
| 적 또는 아군 1명을 뒤(기지선)로 보냄. 아군을 보내면 이번 턴 전투 불가 | C&C 나폴레옹 Short Supply | — | ○ |
| 적 전열과 후열을 바꿈 | 오우거 배틀 타로 Moon | 카드 소모 | ○ |
| 개막에 맨 뒤 적을 한 칸 앞으로 | SAP Seahorse | 개막 1회 | ○ |
| 아군이 쓰러지면 맨 뒤 적을 맨 앞으로 | SAP Donkey | 전투당 1회 | ○ |
| 적을 앞으로 2칸 끌어옴 (전열 문을 깸) | 다키스트 던전 Come Hither | 피해 −80% | △ |
| 당기기 · 밀치기 · 무작위 섞기 | 다키스트 던전 2 Pull · Knockback · Shuffle | 이동 저항 | ○ |
| 개막에 맨 앞으로 뛰어감 | SAP Tsuchinoko | 개막 | ○ |
| 공격 전에 한 번 맨 뒤로 빠짐 | SAP Onion | 1회 | ○ |
| 맨 앞이 비면 자신을 앞으로 밀고 HP + | SAP Door Head Ant | 빈 전열 발생 시 | ○ |
| 아직 확정되지 않은 줄의 내 카드 하나를 다른 줄로 옮김 | 배틀라인 Redeploy · 슈텐 토텐 Strategist | 확정 전만 | ○ |
| 인접한 두 파이터를 서로 교체 | 워해머 언더월드 Confusion | 인접 | ○ |
| 두 캐릭터가 자리 교환 | 배틀 브라더스 Rotation · FE Reversal | 행동 · 피로 | ○ |
| 전투 전 재배치. 상대의 같은 능력과 단계로 상쇄 | 히어로즈 3 Tactics | 상대와 비교 | ○ |
| 개막에 적 후방, 가장 먼 적 옆으로 순간이동 | 언더로드 Blink Dagger | 개막 | ○ |
| 개막에 맨 앞 영웅을 적이 가장 많은 곳으로 던져 근처 적 스턴 | AFK 저니 Divine Soldier | — | △ |
| 전열에서 시작한 아군 수만큼 후열 데미지 + | TFT Hold the Line | 전열 인원 비례 | ○ |
| 전열에서 시작한 아군 수만큼 팀 HP + | TFT Boxing Lessons | 전열 인원 비례 | ○ |
| 피해 감소, 같은 유닛과 인접하면 추가 감소 | 언더로드 Knight | 인접 | ○ |
| 후열 공격 · 치명 + / 전열 방어 · 에너지 + | AFK 아레나 War Flag | 열 한정 | ○ |
| 전열 공격 ↑, 후열 방어 크게 ↓ | 라스트 리모넌트 Wedge | 후열 약화 | ○ |
| 앞열 HP ↑, 중앙 공격 ↑ | 일기토삼국지 진법 | 세부 미확인 | ○ |
| 맞으면 순간이동으로 빠지고 근처 적 스턴 | Despot's Game Emergency Evac | — | △ |
| 뒤로 2칸, 은신 2라운드, 다음 공격 +80% | 다키스트 던전 Shadow Fade | — | △ |
| 진형을 바꿀 수 있지만 바꾸는 동안 약해짐 | 노부나가 진형 변경 | 변경 중 약화 | △ |

## 5. 시점 · 순서

| 규칙 | 게임 | 대가 · 조건 | 옮김 |
|---|---|---|---|
| 항상 선공 · 순서 고정 | 로맨싱 사가 2 래피드 스트림 | 전원 속도 −2 · 행동 후 스턴 | ○ |
| 항상 후공 · 행동 전 자동 방어 | RS2 무 펜스 | 후공 | ○ |
| 행동 순서 고정 2→3→4→5→1 | RS2 번개 · 사가 EB Procession | — | ○ |
| (50 + 레벨)% 확률로 선공, 실패하면 적이 선공 | RS3 사령관 모드 선제 | 확률 | ○ |
| 2 · 4 · 6 · 8라운드에만 적 2명에게 점점 커지는 피해 | 삼국지 전략판 용무통신 | 짝수 라운드 | ○ |
| 초반 3라운드 적 2명 피해 −30%, 리더 선공 | 삼국지 전략판 팔문금쇄진 | 봉시진과 중복 불가 | △ |
| 근접 선언 뒤 내 유닛이 먼저 침 | C&C First Strike | 반격 불가 | △ |
| 적이 근접전을 싸운 직후 내 유닛이 바로 싸움 | 40K Counter-offensive | 2CP | △ |
| 첫 25초 받는 피해 −30% | Mechabellum Photon Coating | 초반 한정 | ○ |
| 개막 3초 공속 +25%, 처치하면 다음 대상으로 돌진하며 다시 | TFT Precision and Grace | 개막 | ○ |
| 개막에 모든 적 최대 HP 10% 고정 피해 + 3초 스턴 | AFK 저니 Stunning Attack | 개막 | ○ |
| 아군 전원 첫 평타 5회 확정 치명 | AFK 저니 Furious Attack | 개막 | ○ |
| 전투 시작 25초 안에 모든 적 큰 피해 · 스턴 | AFK 아레나 Unmounted Heart | 개막 | ○ |
| 첫 10초 공속 +50% | 레기온 TD 2 Sniper | 원거리 | ○ |
| 개막에 전원 마나 가득 | 매직 체스 Northern Vale | — | ○ |
| 첫 개막 효과가 한 번 더 발동 | 하스스톤 전장 Promo Portrait | 개막 효과 한정 | ○ |
| 개막에 공격이 낮은 둘의 능력치 2배 | 하스스톤 전장 Training Certificate | 약한 쪽 | ○ |
| 개막 능력은 공격이 높은 쪽부터 / 같은 시점이면 먼저 · 나중 | SAP 개막 순서 · Churros · Macaron | — | ○ |
| 내 뒤에 움직이는 적 기술 −10% | 배틀 브라더스 Overwhelm | — | ○ |
| 행동이 라운드 끝으로 밀림 / 다음 행동을 잃음 | 다키스트 던전 Daze · Stun | 저항 | ○ |
| 공격 1회 추가 | 오우거 배틀 타로 Emperor | — | ○ |
| 부상 1을 받고 한 번 더 행동 | 스타워즈 레기온 Implacable | 자기 피해 | △ |
| 평타 위력 −30%, 평타 속도 2배 | 삼국지 13 연격 | 위력 ↓ | △ |

## 6. 조건이 오면 — 반응 · 반격

| 규칙 | 게임 | 대가 · 조건 | 옮김 |
|---|---|---|---|
| 마지막으로 남은 영웅 공속 +140%, 내구 +35% | TFT Lone Hero | 마지막 1명 | ○ |
| 영웅이 쓰러지면 가장 가까운 아군 보호막 + 공속 | TFT Inspiring Epitaph | 사망 시 | ○ |
| 아군이 쓰러질 때마다 가까운 적 4명 방어 · 저항 −30% | TFT Final Resistance | 사망 시 | ○ |
| 영웅마다 처음 HP 35% 아래로 떨어지면 20% 회복 | TFT Last Second Save | 1회 | ○ |
| 대상 HP 50% 미만이면 피해 +30% | TFT Execute | — | ○ |
| 쓰러지면 뒤 친구 1~3명에게 한 번 막는 방패 | SAP Turtle | 사망 시 | ○ |
| 앞 친구가 쓰러지면 방패 + 공격 | SAP Ox | — | ○ |
| 앞이 비면 앞으로 뛰어나와 적 맨 뒤 / 앞 둘에게 피해 | SAP Drop Bear · Tiger Bug | 전열이 비었을 때 | ○ |
| 처음 쓰러진 아군의 최대 능력치를 무작위 아군이 받음 | 하스스톤 전장 Alliance Keychain | 첫 사망 | ○ |
| 쓰러지면 무작위 아군 공격 +125% | 언더로드 Blood-Bound | — | ○ |
| 영웅이 죽으면 남은 영웅 강화 / 적을 처치할 때마다 아군 전체 강화 | AFK 아레나 Statue of Retribution · War Horn | — | ○ |
| 아군이 죽을 때마다 강화 (최대 10중첩) | 도타 오토체스 Ogre | — | ○ |
| 공격받으면 반격, 회피해도 발동 | 배틀 브라더스 · DD Riposte | 기절이면 불발 | ○ |
| 자기에게 표식 2라운드 + 반격 3라운드 | 다키스트 던전 Retribution | 표식이 대가 | ○ |
| 조건부 반격, 전원 공격 ↓ 방어 ↑ | 사가 EB Backwater Formation | 공격 ↓ | ○ |
| 적이 먼저 움직이게 두고 받아침 | RS3 사령관 모드 반격 | 선공 포기 | ○ |
| 적이 이기고 전진한 직후 인접 유닛이 강하게 근접 | C&C 중세 Ambush | 적이 안 죽으면 적도 보너스 | △ |
| 적이 피해를 막아 낸 직후 그 유닛 격파 | TI4 Direct Hit | — | △ |
| HP 85% · 55% 아래로 떨어질 때 큰 피해 | Mechabellum Rocket Punch | HP 문턱 | ○ |
| 4초간 피해 저항 + 지정 불가 | Mechabellum Vortex Emergency Armor | 4초 | ○ |
| 처음 HP 절반 아래로 떨어지면 무기 피해 2배 | 바자 Double Down | 1회 | ○ |
| 처음 HP 50% 아래면 5초 재생 | 레기온 TD 2 Wolverine | 1회 | ○ |
| **매 웨이브 뒤 가장 많이 맞은 유닛이 영구 성장** | 레기온 TD 2 Battle Scars | — | ○ |
| **매 웨이브 뒤 가장 많이 때린 유닛이 영구 성장** | 레기온 TD 2 Ace | — | ○ |
| HP 16% · 15% 미만 적 처형 | 레기온 TD 2 Executioner · AFK 아레나 Deathly Embrace | — | ○ |
| 받은 피해 일부 반사 | Despot's Thorn Armor · 언더로드 Blade Mail | — | ○ |
| 공격한 적 공속 −40% / 20% 확률 스턴 | Despot's Untouchable · Stunning Beauty | — | ○ |
| 쓰러질 때 상대 스턴 | 백팩 배틀 Black Queen | — | ○ |
| 적 궁극기가 끝나면 그 적 2초 스턴 | AFK 저니 Power Draining | — | ○ |

## 7. 리더 · 지휘

| 규칙 | 게임 | 대가 · 조건 | 옮김 |
|---|---|---|---|
| 리더 주는 피해 +30% · 받는 피해 +20%, 부장 주는 −15% · 받는 −25% | 삼국지 전략판 봉시진 | 리더가 더 맞음 | ○ |
| 리더 능력치 ↑ · 주는 피해 ↓, 전법의 리더 효과가 부장에게 넘어감 | 삼국지 전략판 잠룡진 | 딜을 부장이 맡음 | ○ |
| 리더 효율 42%, 나머지 강화 / 리더 ↑, 나머지 ↓ | 라스트 리모넌트 Casket · Comet | — | ○ |
| 장착 유닛 공 +50% · HP +100%, 이 유닛이 파괴되면 아군 전체 파괴 | Mechabellum Dominion Core | 리더 사망 = 전멸 | ○ |
| 리더가 죽으면 부대가 명령을 안 따르고 복귀 | 오우거 배틀 | 전멸하면 영구 소멸 | △ |
| 지휘관이 죽으면 부하 소멸 | 랑그릿사 | — | △ |
| 장군 영향 범위 안 사기 ↑, 장군이 죽으면 사기 급락 | 쇼군 2 · 로마 2 Raise Banner | 장군 사망 | ○ |
| 리더 공속 · 피해 감소 + | 레기온 TD 2 Kingsguard | — | ○ |
| 맨 앞(선두) 하나에 공격 몰아주기 | 하스스톤 전장 Windrunner Necklace | 위치 고정 | ○ |
| 게이지가 차면 리더가 특수 공격 | 라스트 리모넌트 유니온 M 게이지 | — | ○ |
| 지도자 대신 출전 | 듄 Cheap Hero | 지도자가 없을 때 | △ |

## 8. 내주고 얻기 — 희생 · 거래

| 규칙 | 게임 | 대가 · 조건 | 옮김 |
|---|---|---|---|
| 후열에서 시작한 아군은 HP 80%로 시작, 데미지 +16~25% | TFT Glass Cannon | 후열 HP ↓ | ○ |
| 출전 인원 +2, 대신 지면 플레이어 피해 2배 | TFT Cursed Crown | 패배 시 2배 | ○ |
| 주는 피해 +25%, 받는 피해도 +25% (전투 내내) | 다키스트 던전 Revenge | — | ○ |
| 자기를 표식(집중 피격 대상)으로 + 방어 +20% | 다키스트 던전 Bulwark of Faith · Withstand | — | ○ |
| 받는 피해 +20% | 레기온 TD 2 Villain | 자기 취약 | ○ |
| 개막에 HP 50% 잃음, 쓰러지기 직전 50%로 부활 + 1.5초 무적 | 백팩 배틀 Dark Lantern | — | ○ |
| 매 전투 시작에 자기 중독 | 바자 Insect Bite | 자해 | ○ |
| 개막에 HP 가장 높은 적과 자기에게 같은 피해 | SAP Sword Fish | — | ○ |
| 공격 ↑, 방어 ↓ · 피로 | 토탈 워 로마 2 Frenzied Charge · Use the Whip | — | ○ |
| 공속 +80%, 대신 침묵 · 방어 − | 도타 오토체스 Mask of Madness | — | ○ |
| 부상 1을 받고 무료 행동 1회 | 스타워즈 레기온 New Ways to Motivate Them | 자기 피해 | ○ |
| 공격 크게 ↑, 라운드를 지면 상대가 가져감 | 언더로드 Divine Rapier | 판돈 | ○ |
| 공격 ↑, 확률로 자기 자신을 공격 | Despot's Curse of Might | 5→10% | ○ |
| 공격한 적이 피해, 방을 옮길 때마다 팀이 현재 HP 일부를 잃음 | Despot's Cursed Armor | HP 손실 | ○ |
| 진형을 바꿀 수 없음 (대가로 이득) | 사가 EB Forced Formation | — | ○ |
| 자기 HP가 낮을수록 피해 + | AFK 아레나 Pearl Oath | — | ○ |
| 받는 피해 +16%, 우군이 주는 피해 +5% | 삼국지 전략판 병서 유인의 책 | — | ○ |
| 3칸 안에 아군이 없으면 능력치 +15% | 배틀 브라더스 Lone Wolf | 고립 | △ |
| 이번 전투 힘 5, 대신 전투 뒤 내 유닛 2기 파괴 | 케메트 확장 전투 카드 | 아군 손실 | △ |

## 9. 시간 · 소모 — 지구전

| 규칙 | 게임 | 대가 · 조건 | 옮김 |
|---|---|---|---|
| 10초 뒤 팀이 잃은 HP의 40% 회복 | TFT Second Wind | 10초 | ○ |
| 15초 뒤 팀 피해 +50% | TFT Ascension | 15초 | ○ |
| 적 앞 두 줄의 방어 · 저항이 2초마다 깎임 | TFT Corrosion | 적 전열 | ○ |
| 전원 속도 −75%, 턴 끝마다 전원 재생 | 로맨싱 사가 3 겐부 | 속도 | △ |
| 전원 행동 전 방어 유지, 속도 −75% | RS3 타이거즈 케이브 | 속도 | ○ |
| 전원 공격 ↓ 방어 ↑ | 사가 EB Toranajin | 공격 ↓ | ○ |
| 내구도 1/3 · 2/3 지점에서 그 라운드 추가 피해 차단 | FE 풍화설월 대대 | — | ○ |
| 이번 턴 아군이 주고받는 피해 모두 1 | FE 풍화설월 Impregnable Wall | 5회 | △ |
| 살아남은 수가 상대보다 적으면 방어 · HP 2배 | 언더로드 Scrappy | 수적 열세 | ○ |
| 이기면 살아남은 수만큼 상대 리더에 추가 피해 | 언더로드 Vicious Intent | 승리 시 | ○ |
| 10초마다 모든 적 최대 HP 10% 고정 피해 + 스턴 | AFK 저니 Monsoon Assault | — | ○ |
| 한 턴 쉬어 피로 회복 / 방어 +20% | 배틀 브라더스 Recover · 히어로즈 Defend | 행동 | ○ |
| 공격하면서 자신을 치유 / 가한 피해의 50% 회복 | 라스트 리모넌트 Keep your HP up · FE Absorption | — | ○ |
| 아군 HP 회복 (리더 인접) | C&C Rally | 리더 인접만 | △ |

## 10. 판 규칙 — 양쪽에 똑같이

| 규칙 | 게임 | 대가 · 조건 | 옮김 |
|---|---|---|---|
| 초반 3라운드 **양쪽 전원** 모략 피해 ↓ · 평타 · 돌격 피해 ↑ | 삼국지 전략판 횡과약마 | 양쪽 같음 | ○ |
| 17초부터 양쪽 모두 매초 늘어나는 피해 | 백팩 배틀 Fatigue | 양쪽 | ○ |
| 양쪽 무기 피해 2배 | 바자 Glass Cannon | 양쪽 | ○ |
| 모든 유닛 화상 · 치유 감소, 우리 팀만 흡혈 + | TFT The Floor is Lava | 양쪽 소모 | ○ |
| 모든 쿨다운 +1~3초 | 바자 Lethargy | 양쪽 느려짐 | △ |
| 조합을 무효로 하고 합계만 비교 | 배틀라인 Fog | — | △ |

## 11. 쓰러진 뒤 — 부활 · 대체

| 규칙 | 게임 | 대가 · 조건 | 옮김 |
|---|---|---|---|
| 처음 탈락할 때 HP 1로 남음 | TFT Boon of Resurrection | 1회 | ○ |
| 준비 단계에 아군 하나를 지정, 쓰러지면 한 번 30% HP로 부활 | 매직 체스 Bersi | 지정 1명 · 1회 | ○ |
| 전투당 1회, 죽을 영웅에게 보호막 + 회복 | AFK 아레나 Frozen Star | 1회 | ○ |
| 파괴되면 5초 뒤 HP 100%로 복귀 | Mechabellum Field Reassembly | 5초 공백 | ○ |
| 치명타를 받은 뒤 4초 더 생존 | 언더로드 Helm of the Undying | 4초 | ○ |
| HP가 1 아래로 안 감, 한 번 맞으면 해제 / 치명타에도 HP 1로 한 번 생존 | SAP Pepper · FE Blessing | 1회 | ○ |
| 맨 앞이 비면 앞에 소환 | SAP Tinder Box | 전투당 1회 | ○ |
| 쓰러지면 약한 것으로 돌아옴 | 언더로드 Primordial · SAP Mushroom | 약화 | ○ |
| 미끼 2개 | TFT Phony Frontline | — | △ |
| 지도자 1명 무료 부활 | 듄 Ghola | 다음 전투부터 | △ |

## 12. 편성 · 인원

| 규칙 | 게임 | 대가 · 조건 | 옮김 |
|---|---|---|---|
| 전열이 정확히 2명이면 그 둘에게 HP · 방어 + | TFT Twin Guardians | 정확히 2명 | ○ |
| 같은 줄에 3명 이상이면 방어 · 저항 + | TFT Unified Resistance | 한 줄 3명 | △ |
| 뒤 두 줄 사용 불가, 대신 팀 스탯 + | TFT Close Quarters | 후열 비움 | △ |
| 5판 동안 1명만 출전, 대신 크게 강화 | TFT Solo Leveling | 1명 | △ |
| 전원 다른 클래스면 공 · 방 +20% | AFK 저니 Division of Labor | — | ○ |
| 한 종류만 나오면 +50% | 언더로드 Demon | 순혈 | ○ |
| 특성이 안 켜진 영웅 HP · 공속 + | TFT Built Different | — | △ |
| 같은 종류 3개 상한 | Mechabellum Count to Three | — | ○ |

## 13. 사기 · 후퇴 · 기만

| 규칙 | 게임 | 대가 · 조건 | 옮김 |
|---|---|---|---|
| 도주 중 아군 복귀 + 근처 사기 유지 | 배틀 브라더스 Rally the Troops | 행동 · 피로 | ○ |
| 30초 동안 사기가 안 깨짐 + 방어 ↑ | 토탈 워 로마 2 Loyalty of the 10th | 판당 1번 | ○ |
| 실적에 따라 사기가 오르내리고, 높으면 주는 피해 ↑ · 받는 피해 ↓ | 라스트 리모넌트 사기 | — | ○ |
| 피해 없이 사기 막대만 유리하게 | 라스트 리모넌트 Bluff | — | ○ |
| 기습하면 항상 먼저 움직임 | 다키스트 던전 기습 | — | ○ |
| 리더를 빼고 적 부대 전원 도주 | 오우거 배틀 타로 Fool | 보스전 제외 | △ |
| 적끼리 공격 / 앞쪽 적끼리 싸우게 | 오우거 배틀 Lovers · 노부나가 이간 | — | △ |
| 적 행동 제한 + 사격 강화 | 노부나가 조야복 | 채배 1500 | △ |
| 상대 지도자가 내가 쥔 배신자면 즉시 승리 | 듄 Traitor | 숨긴 약점 | △ |
| 상대 병력 카드를 내 쪽으로 가져옴 / 상대 카드 하나 버림 | 배틀라인 Traitor · Deserter | 확정 전만 | △ |
| 엄폐 + 은신(원거리 명중 −1) | 40K Smokescreen | 연막 유닛만 | △ |
| 전투충격 판정 자동 통과 | 40K Insane Bravery | 1CP · 전투당 1회 | △ |

## 14. 출처

**보드게임**
- C&C: commandsandcolors.net (Ancients · Medieval · Napoleonics 카드 페이지)
- 배틀라인 · 슈텐 토텐: fgbradleys.com 배틀라인 룰북 PDF (검색 인용) · iellogames.com 슈텐 토텐 룰북
- 한니발: orderofgamers.com/downloads/HannibalandHamilcar_v2.pdf
- 메모아르 44: cdn.svc.asmodee.net (2024 룰북)
- 듄: curufea.com/games/dune/treachery.php
- 케메트: orderofgamers.com/downloads/Kemet_v3.4.pdf
- 40K: wahapedia.ru/wh40k10ed/the-rules/core-rules
- 레기온: brueckenkopf-online.com/2018/star-wars-legion-command-cards · spikeybits.com
- 언더월드: spikeybits.com/new-in-the-underworlds-nightvaults-universal-cards
- TI4: Living Rules v1.2
- 반지전쟁: 2판 룰북

**전략 · 전술 RPG · 모바일**
- 토탈 워: r2encv2.totalwar.com/en/manual (로마 2 공식 매뉴얼) · gamepressure.com (3K · 워해머 2) · feralinteractive.com (쇼군 2 매뉴얼)
- 배틀 브라더스: mejoress.com · steamah.com
- 마운트 앤 블레이드: alteredgamer.com · gamerempire.net
- 히어로즈: heroes.thelazy.net
- 다키스트 던전: darkestdungeon.wiki.gg · darkestdungeon2.wiki.fextralife.com
- 삼국지 전략판: gamersky.com/handbooksy (202203/1470283 외)
- 코에이 삼국지: gamecity.ne.jp/manual/sangokushi14-pk · 3dmgame.com · wikiwiki.jp/sangokushi14
- 노부나가: gamersky.com/handbook/201504/565641.shtml · gamecity.ne.jp/souzou
- 삼국 모바일: taptap.cn · gamemeca.com · gamewith.jp
- 오우거 배틀: shrines.rpgclassics.com
- 유니콘 오버로드: thegamer.com · gamesfuze.com · note.com
- 파이어 엠블렘: fireemblemwiki.org (Gambit · Battalion)
- 라스트 리모넌트: lparchive.org/The-Last-Remnant
- 로맨싱 사가: appmedia.jp · gameranbu.jp · romancing-saga-3.blogspot.com · samurai-gamers.com
- 기타 모바일: gamewith.net/sevenknights-rebirth · bluestacks.com (Idle Heroes) · pocketgamer.com (AFK Journey)

**오토배틀러 · 방치형**
- TFT: raw.communitydragon.org/latest/cdragon/tft/en_us.json (증강 원문)
- 하스스톤 전장: blizzardwatch.com · hearthstone.blizzard.com
- Mechabellum: wikiwiki.jp/mechabellum · mbwiki.dreamhaven.com · Steam 패치노트
- 언더로드: esportstales.com · pcgamesn.com · shacknews.com
- SAP: superautopets.wiki.gg
- 백팩 배틀: backpackbattles.wiki.gg
- 바자: thebazaar.wiki.gg
- 레기온 TD 2: legiontd2.wiki.gg
- Despot's Game: Steam 패치노트 · thegamer.com
- AFK 아레나: afk.guide
- AFK 저니: talkandroid.com · thenerdstash.com
- 도타 오토체스: esportstales.com
- 매직 체스: zathong.com · bluestacks.com
- Faenora: 2tg.gitbook.io/faenora
- 브라운더스트 2: botan14xd.github.io/BD2-Overview

## 15. 확인 못 한 것

- **원문 미확인 카드**
  - 쇼군 2 Feigned Retreat · Fire at Will · Schiltron
  - 전략판 혼비백산 · 백이 전법
  - 왕좌의 게임 가문 카드
  - 언매치드 · 블러드 레이지 · 라이징 선 · 사이클라데스 · 언돈티드 카드
  - TI4 Morale Boost · Maneuvering Jets
- **효과 문장 일부만 확인**
  - 하스스톤 전장: 이번 시즌 장신구 전체
  - 매직 체스: 지휘관 대부분
  - 랑그릿사: 클래스 진형
- **출처끼리 수치가 다름**
  - Despot's Game Stonewall: +60 vs +30
  - 매직 체스 Yuki: 희생 개수

---
*마지막 업데이트: 2026-11-25*
