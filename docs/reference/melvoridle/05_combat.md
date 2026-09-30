# Melvor Idle — 전투 방식

> 상태: **조사 완료** (2026-09-30)
> 목적: Melvor Idle 의 전투가 실제로 어떻게 돌아가는지(타이머 · 상성 · 공식 · 버티는 수단 · 마법 · 상태 효과 · 몬스터 분포 · 슬레이어 · 사망)를 원본 데이터와 위키로 확보한다. Melvor 의 사실만 적는다.
> 짝 문서: [00_overview.md](00_overview.md)(§2-3 전투의 오프라인 진행 · §2-4 음식 고갈과 오프라인 사망) · [02_items.md](02_items.md)(§1 장비 칸 · §6 무기 특수공격 · §8 Enhancement 칸)
> ⚠ 이 문서의 수치는 전부 Melvor Idle 의 수치다

## 목차
| § | 내용 |
|---|---|
| 0 | 조사 방법과 신뢰도 · 수치 표시 규약(×10) |
| 1 | 전투 한 판의 흐름 — 타이머 · 리스폰 · 종료 · 장소 |
| 2 | 전투 상성(Combat Triangle) |
| 3 | 공식 — 명중 · 회피 · 최대 데미지 · 데미지 감소 · 전투 레벨 |
| 4 | 공격 스타일과 전투 경험치 |
| 5 | 버티는 수단 — 체력 재생 · 음식 · 자동 먹기 · 기도 · 포션 |
| 6 | 마법 — 일반 주문 · 저주 · 오라 · 룬 |
| 7 | 특수 요소 — 몬스터 패시브 · 상태 효과 · 특수공격 |
| 8 | 몬스터 분포와 대표 몬스터 |
| 9 | 슬레이어 |
| 10 | 사망과 하드코어 |
| 11 | 소환수 · 시너지 (전투에 끼는 방식) |
| 12 | 확장팩이 더한 것 |
| 13 | 출처 · 확인 못 한 것 |

## 0. 조사 방법과 신뢰도
- **쓴 데이터** (본편 = `melvorDemo` + `melvorFull`): `gamemodes` · `attackStyles` · `combatTriangleSets`(ItA) · `combatEffects` · `combatEffectTemplates` · `attacks` · `combatPassives` · `monsters`(171종, 자리표시자 `RandomITM` 제외) · `combatAreas` · `dungeons` · `strongholds` · `slayerAreas` · `slayerTaskCategories` · `prayers` · `attackSpells` · `curseSpells` · `auroraSpells` · `items` · `shopPurchases`.
- **연 위키 페이지** (`r.jina.ai`, 요청 12건 · 막힘 없음): `Combat` · `Combat_Triangle` · `Hitpoints` · `Slayer` · `Special_Attacks` · `Prayer` · `Magic` · `Green_Dragon`(공식 대조용).
- **표기**: **[데이터]** JSON 에서 직접 · **[데이터/계산]** JSON 값으로 내가 계산 · **[위키/jina]** 프록시 원문 직접 열람 · **[해석] [추정]** 내 읽기 · 짐작.

> ⚠ **공식 수집의 함정**: 위키 수식은 MathML 이라 프록시 마크다운에서 **빠지고**, WebFetch 요약기는 수식을 기억으로 채워 **틀리게** 낸다(유효 레벨 `+8`, `/8` 등). 그래서 프록시에 `X-Return-Format: html` 을 걸어 **MathML 을 직접 추출**했고, Green Dragon 페이지 표시값(명중 6,468 · 회피 8,008 · 최대 데미지 143)으로 대조해 **일치를 확인**했다. §3 은 이 경로의 것만 적었다. 상성 표(§2)는 요약과 HTML 원문이 일치했고 ItA 데이터 `Reversed` 세트(전치)와도 맞물린다.

### 수치 표시 규약 — 데이터 원값 × 10 = 화면 값 (Standard)
- 몬스터 `levels.Hitpoints` 75(Green Dragon) → 위키 표시 HP **750**. 음식 `healsFor` 3(Shrimp) → 화면 30. 기도 `flatHPRegen` 1(Rapid Heal) → 위키 「+10 Flat Hitpoints Regeneration」. 최대 데미지 공식의 `M` = 10 (Adventure 는 100) [위키/jina Combat · Hitpoints].
- 배수는 게임 모드 데이터의 `hitpointMultiplier`(Standard 10 · Hardcore 10 · Adventure 100). **이 문서는 특별한 말이 없으면 데이터 원값을 적고**, 「화면 값」이라 쓴 곳만 ×10 을 적용했다 [해석]. 퍼센트(회피 · DR · 확률)는 배수와 무관하다.

## 1. 전투 한 판의 흐름
### 1-1. 실시간 타이머 구조
- **플레이어와 몬스터는 각자의 공격 타이머를 따로 돈다.** 플레이어 = 무기의 `attackSpeed`(ms) · 몬스터 = 몬스터의 `equipmentStats.attackSpeed`(ms). 서로를 기다리지 않는다 [데이터]. 게임은 타이머 바(attack bar)를 그리고, **특수공격이 나가는 동안 바가 노랗게 바뀐다** [위키/jina Special_Attacks].
- 효과의 지속 시간은 초가 아니라 **「턴」** 으로 센다 — 그 캐릭터 자신의 공격 차례가 한 번 지나면 1턴이다(`SelfTurnCounting`). 상대의 차례로 세는 효과도 있다(`TargetTurnCounting`) [데이터 `combatEffectTemplates`]. 기절도 「대상의 공격 속도와 같은 주기의 타이머」로 줄어든다 [위키/jina Combat].
- **간격을 바꾸는 것**: Rapid 스타일 `flatAttackInterval -400`(0.4초 단축) [데이터 `attackStyles`] · 모드 규칙(Chaos −25% · 스피드런 −80%) [데이터 `gamemodes`].
- **다중 타격 특수공격은 타격 사이에 짧은 자체 간격**(데이터 `attackInterval` 50~500ms · 기본 50)을 쓰고 **무기 간격 감소의 영향을 받지 않는다**. 단타는 **발동 즉시** 맞는다. **음식을 수동으로 먹거나 장비를 바꾸면 진행 중인 특수공격이 취소된다** [위키/jina Special_Attacks].

### 1-2. 공격 간격의 분포
| 대상 | 간격(ms) 분포 | 출처 |
|---|---|---|
| **몬스터 171종** | 1800 ×1 · 2000 ×5 · 2100 ×1 · 2200 ×4 · **2400 ×26** · 2500 ×4 · **2600 ×28** · 2700 ×2 · 2800 ×18 · **3000 ×64** · 3200 ×6 · 3300 ×3 · 3400 ×2 · 3600 ×4 · 3900 ×1 · 4000 ×2 | [데이터] |
| **무기 148종**(근접·원거리·지팡이·완드) | 2000 ×9 · **2200 ×23 · 2400 ×23** · 2600 ×21 · **3000 ×28**(지팡이 15 포함) · 3100 ×9 · 3200 ×14 · 3300 ×1 · 3400 ×1 · 3600 ×15 · 3800 ×2 · 4000 ×2 | [데이터] |
| 종류별 | 지팡이 전부 3000 · 완드 전부 2600 · 활 2000~3200 · 근접 2000~4000(단검 2200 · 검 2400 · 배틀액스 3100 · 2H 3600) | [데이터] |

몬스터 최빈은 3초(37%) · **가장 빠른 1.8초 ~ 가장 느린 4초**. 플레이어 무기도 2~4초로 같은 범위다 [데이터/계산].

### 1-3. 몬스터가 죽은 뒤 · 멈추는 조건 · 도망
| 항목 | 규칙 | 출처 |
|---|---|---|
| 다음 몬스터 | 처치 후 **3초** 뒤 등장. 그동안 플레이어는 데미지를 못 주고 경험치도 못 얻는다(「확정 미스」). **최소 0.25초까지** 줄일 수 있다(Agility 기둥 · 사냥꾼 모자 · 몬스터 헌터 두루마리 등). 스피드런 모드는 `flatMonsterRespawnInterval -2000` | [위키/jina Combat] [데이터] |
| 시작 · 종료 | 지역을 고르면 몬스터 목록(HP · 전투 레벨 · 공격 유형)이 뜨고 「Fight」로 시작. 「플레이어가 도망(run)하거나, 죽거나, 던전을 깨면」 끝난다 — 일반 지역은 계속 이어진다. 오프라인은 [00_overview.md §2-3](00_overview.md) | [위키/jina Combat] |
| 자원 고갈 | 음식 · 화살 · 룬이 떨어져도 전투가 자동으로 멈춘다는 서술은 없다 — 위키는 「음식·화살·룬이 안 떨어지는 한 방치해도 안전」이라고만 적는다. 음식이 바닥나면 자동 먹기가 멈추고 사망할 수 있다([00_overview.md §2-4](00_overview.md)) | [위키/jina Combat] |
| 도망(run) | **규칙 서술을 못 찾았다**(쿨다운 · 확률 · 페널티 없음/있음 모두 미확인). 위키는 도망이 종료 조건 중 하나라는 사실만 적는다 | [위키/jina Combat] · §13 |

**보상 처리(전투 중에 일어나는 일)**
- 뼈는 거의 항상 떨어진다(167/171종에 `bones`). 나머지 장비 · 재료는 `lootChance`(%)로 판정해 `lootTable` 가중치로 뽑는다 — **171종 중 126종이 100%**, 11종은 0%(뼈 · GP 만) [데이터/계산].
- 드롭은 **전리품 상자에 쌓이고 수동으로 「Loot All」 해야 한다.** 상자는 100칸이 넘으면 **가장 오래된 것이 사라진다**(뼈는 시간 제한 없이 겹쳐 쌓임). 상점 업그레이드 「Loot Container Stacking」(GP 75,000,000 + 슬레이어 코인 250,000)이 있으면 전부 겹치고, **Amulet of Looting**(`autoLooting`)을 끼면 자동 습득 [위키/jina Combat] [데이터 `items` · `shopPurchases`].
- **던전 안의 몬스터는 개별 드롭이 없고**(신의 던전 4곳만 예외로 조각 지급) 슬레이어 임무에도 안 센다. 마지막 몬스터를 잡으면 **보상 상자가 은행으로 바로** 들어간다 [위키/jina Combat].

### 1-4. 싸우는 장소 4종
| 장소 | 수 (본편) | 입장 | 특징 | 출처 |
|---|---|---|---|---|
| **전투 지역** | 12 | **조건 없음** | 몬스터 2~6종. 지역 효과 없음. 초반 · 중반 구간(전투 레벨 1~120) | [데이터 `combatAreas`] |
| **슬레이어 지역** | 13 | 슬레이어 레벨 1~95 + (일부) 전용 아이템 · 던전 클리어 · 상점 구매 | **지역 효과**(플레이어 약화 · 몬스터 강화) 있음. §9 | [데이터 `slayerAreas`] |
| **던전** | 17 (Demo 8 + Full 9) | 대부분 없음. 신 던전 4곳은 앞 던전 1회 클리어를 사슬로 요구 · Miolite 슬레이어 40 · Infernal 슬레이어 75 · Into the Mist 슬레이어 90 · Impending Darkness 는 Into the Mist 1회 | 정해진 순서로 몬스터를 싸우고 **마지막이 보스**. 개별 드롭 없음 · 끝에 상자. **장비·음식 교체 불가**(상점 「Dungeon Equipment Swapping」 GP 30,000,000 으로 해금) | [데이터 `dungeons` · `shopPurchases`] [위키/jina Combat] |
| **스트롱홀드** | 4 | 슬레이어 10/45/85/95 + 던전 클리어 25/50/100/5회(각 Undead Graveyard · Hall of Wizards · Infernal Stronghold · Into the Mist) | 몬스터 47~72마리 연속 · **Pure 데미지**를 주는 몬스터 · 3단(Standard / Augmented / Superior)마다 버프 패시브 · `StrongholdDamageModifier`(`damageDealt` −15~85%) 패시브가 붙음 — **누구의 데미지를 깎는지는 확인 못 함**, Pure 데미지가 DR 을 무시하기 때문에 몬스터 쪽이 깎이는 것으로 **추정** [추정] · 보상은 Enhancement 계열([02_items.md §8](02_items.md)) | [데이터 `strongholds`] [위키/jina Combat] |

## 2. 전투 상성(Combat Triangle)
**근접 > 원거리 > 마법 > 근접.** 상성은 **플레이어에게만** 적용된다(몬스터에는 안 걸림). 플레이어가 상대 유형에 강하면 **최대 데미지에 보너스, 데미지 감소(DR)에 보너스**, 약하면 둘 다 깎인다. 같은 유형이면 변화 없음 [위키/jina Combat_Triangle]. 인게임에서는 지역 정보 → 「View Combat Triangle」로 확인한다.

**Standard 상성** (행 = 내 유형 · 열 = 상대 유형 · 칸 = `데미지 배율 / 데미지 감소 배율`, 위키의 DMG / R) [위키/jina Combat_Triangle · 데이터 `Reversed` 세트의 전치로 검증]

| 내가 → 상대 | vs 근접 | vs 원거리 | vs 마법 |
|---|---|---|---|
| **근접** | 1.00 / 1.00 | **1.10 / 1.25** | 0.85 / 0.75 |
| **원거리** | 0.85 / 0.95 | 1.00 / 1.00 | **1.10 / 1.25** |
| **마법** | **1.10 / 1.25** | 0.85 / 0.85 | 1.00 / 1.00 |

**Hardcore 상성** — 강할 때 보너스는 똑같고 **약할 때 페널티만 커진다**

| 내가 → 상대 | vs 근접 | vs 원거리 | vs 마법 |
|---|---|---|---|
| **근접** | 1.00 / 1.00 | 1.10 / 1.25 | **0.75 / 0.50** |
| **원거리** | **0.75 / 0.75** | 1.00 / 1.00 | 1.10 / 1.25 |
| **마법** | 1.10 / 1.25 | **0.75 / 0.75** | 1.00 / 1.00 |

- **게임 모드별** [데이터 `gamemodes.combatTriangle`]: Standard = **Standard** · Hardcore · Adventure · Ancient Relics(및 Chaos 등 이벤트 모드) = **Hardcore** 상성. Adventure 와 Ancient Relics 의 규칙 문구가 「Harsher penalties applied against you in Combat」인 것이 이것이다.
- **Abyssal(ItA) 영역은 삼각형 방향이 뒤집힌다**(근접 > 마법 > 원거리 > 근접) — 배율 표는 위 표의 전치이며 데이터 `combatTriangleSets` 에 `Reversed` 로 들어 있다(`Standard` / `Hardcore` / `InvertedHardcore` 세 가지). `InternalSuffering` 이벤트 모드는 뒤집힌 Hardcore 를 쓴다 [데이터] [위키/jina Combat_Triangle].
- **적용 순서**: 몬스터 패시브(예 Intimidation)가 플레이어 DR 을 깎아도 **상성은 그 뒤에 마지막으로 적용**된다 [위키/jina Combat_Triangle].
- 「R」(저항 배율)이 DR 에 어떤 형태로 곱해지는지는 위키가 적지 않는다(§13).

## 3. 공식
**출처는 전부 [위키/jina Combat] 의 HTML MathML 원문**이다(§0). 표기는 위키 그대로, 한국어 변수명만 붙였다. `⌊x⌋` = 내림.

### 3-1. 명중 · 회피
```
유효 레벨(Effective Skill Level) = 표준 레벨(사이드바 레벨, 99 상한 · TotH 120) + 히든 레벨

명중 수치(Accuracy Rating)
  = ⌊ (유효 레벨 + 9) × (기본 명중 보너스 + 64) × (1 + 명중 수정치 / 100) ⌋

회피 수치(Evasion Rating, 근접 · 원거리)
  = ⌊ (유효 방어 레벨 + 9) × (방어 보너스 + 64) × (1 + 회피 수정치 / 100) ⌋

마법 회피
  유효 레벨 = ⌊ 0.3 × 유효 방어 레벨 + 0.7 × 유효 마법 레벨 ⌋
  마법 회피 = ⌊ (유효 레벨 + 9) × (마법 방어 보너스 + 64) × (1 + 회피 수정치 / 100) ⌋
```
- **기본 명중 보너스** = 장비의 해당 공격 보너스 합(+ 시너지 조건 보너스). **명중 수정치** = 물약 · Agility · Astrology 의 전역 + 유형별 합이고 표준 마법 **Surge** 오라가 **+6%** 를 더한다. **히든 레벨**(Astrology · 펫 · 일부 아이템)은 **레벨 상한을 넘겨서도 계산에 들어간다**(99 + 5 = 유효 104) [위키/jina].

### 3-2. 명중 확률
```
명중 수치 < 상대 회피 수치일 때:   명중 확률 = 명중 수치 / (2 × 회피 수치) × 100
명중 수치 ≥ 상대 회피 수치일 때:   명중 확률 = (1 − 회피 수치 / (2 × 명중 수치)) × 100
```
같으면 50% · **회피의 2배 명중이면 75% · 3배면 83.3%**. 명중을 올릴수록 한 점의 가치가 줄어든다 [위키/jina]. 하한 · 상한 클램프는 서술이 없다 [추정: 위 식 자체가 0~100% 안이다].

### 3-3. 최대 데미지
```
근접 · 원거리
  기본 최대 데미지 = ⌊ M × ( 2.2 + 유효 레벨 / 10 + (유효 레벨 + 17) × 힘 보너스 / 640 ) ⌋
      유효 레벨 = 근접이면 Strength · 원거리면 Ranged (표준 + 히든)
      힘 보너스 = 장비의 meleeStrengthBonus 또는 rangedStrengthBonus 합
      M = 10 (Standard · Hardcore · Ancient Relics) · 100 (Adventure)
  최대 데미지 = ⌊ 기본 × (1 + % 최대 데미지 수정치 / 100) ⌋ + 고정 최대 데미지 수정치

표준 마법 (Standard · Archaic 주문)
  기본 최대 데미지 = ⌊ 주문 최대 데미지 × (1 + 마법 데미지 보너스 / 100)
                       × (1 + (유효 마법 레벨 + 1) / 200) ⌋
  최대 데미지 = ⌊ 기본 × (1 + % 수정치 / 100) ⌋ + 고정 수정치
              (같은 원소의 고정 증가 — 예 Cloudburst Staff — 도 고정 수정치에 합산)

Ancient Magicks
  최대 데미지 = 주문에 적힌 값 그대로. 마법 데미지 보너스 · 최대 데미지 수정치 무효.
              상성 데미지 배율만 적용
```
- **최소 데미지** = `min( max( ⌊1 + 최대 데미지 × (% 최소 데미지 수정치) ⌋ + 고정 최소 수정치, 1 ), 최대 데미지 )`. 기본은 1이고 최대를 넘지 못한다 [위키/jina].
- **데미지 굴림**: 명중하면 **최소~최대 사이 정수를 균등 분포**로 굴린다(양 끝 포함). **평균 = (최소 + 최대) / 2** · **DPS = 평균 ÷ 공격 간격(초) × 명중 확률** [위키/jina].
- **검증 예** (Green Dragon — Strength 68 · meleeStrengthBonus 40 · Attack 68 · stabAttackBonus 20 · Defence 68 · meleeDefenceBonus 40) [데이터/계산]: 최대 데미지 ⌊10×(2.2+6.8+85×40/640)⌋ = **143** · 명중 (68+9)×(20+64) = **6,468** · 근접 회피 (68+9)×(40+64) = **8,008** — 위키 표시값과 **세 개 모두 일치**. 마법 회피는 위키 4,544 · 내 계산 4,569 — 유효 레벨을 **먼저 내림**하면 일치한다(0.3×68+0.7×60 = 62.4 → 62 → (62+9)×64 = 4,544).

### 3-4. 데미지 감소(DR)와 굴림 뒤 보정
- **데미지 감소(DR)** 는 데미지를 굴린 **뒤에** 적용된다 — 그래서 최소 데미지보다 낮은 값이 나올 수 있다. 위키가 「게임에서 가장 중요한 스탯」이라 부르며 **HP · 자동 먹기 단계와 함께 「죽지 않고 받을 수 있는 데미지」를 정한다** [위키/jina Combat].
- DR 출처: 방어구 · 장신구 · 물약 · Agility · 기도(Stone Skin) · 펫. 적의 DR 을 깎는 것: 기도 Battleheart(−5%) · Ring of Power · 특정 방패 [위키/jina] [데이터].
- **몬스터 DR** 분포: 0% 73종 · 5% 30종 · 10% 13종 · 15% 8종 · 20% 17종 · 25% 22종 · 40% 7종 · 50% 1종(구간별은 §8-1) [데이터/계산].
- **치명타**는 특정 장비에만 있다(기본 0% · 적중 시 **+50%**). **반사(Reflect)** 는 받은 데미지 일부를 되돌리되 **적이나 플레이어를 죽일 수 없고 경험치도 없으며 2초 쿨다운**. 「모든/슬레이어/보스 몬스터에 데미지 +N%」류 보정은 굴림 뒤에 곱해져 **표시 최대 데미지를 넘길 수 있다** [위키/jina].

### 3-5. 전투 레벨 · HP
```
기본 전투 레벨 = 0.25 × (Defence + Hitpoints + ⌊0.5 × Prayer⌋)
근접  = Attack + Strength      원거리 = ⌊1.5 × Ranged⌋      마법 = ⌊1.5 × Magic⌋
전투 레벨 = ⌊ 기본 + 0.325 × max(근접, 원거리, 마법) ⌋
```
플레이어는 **3레벨에서 시작해 126(TotH 153)까지** 오른다. 몬스터는 위 식에 같은 레벨 필드를 넣은 값이 **1(Chicken)~1300(Bane, Instrument of Fear)** 이다 — 이 문서의 몬스터 전투 레벨은 전부 이 식으로 계산했고(§8), 최고값 1300 이 위키 서술과 일치한다 [위키/jina Combat] [데이터/계산].
- **플레이어 최대 HP** = **Hitpoints 레벨당 +10**(Adventure 는 100) + 장비 · Agility 등 [위키/jina Hitpoints].

## 4. 공격 스타일과 전투 경험치
### 4-1. 스타일 8종 [데이터 `attackStyles`]
| 유형 | 스타일 | 경험치가 가는 스킬 (비율) | 히든 레벨 | 기타 |
|---|---|---|---|---|
| 근접 | **Stab** | Attack (4) | Attack +6 | |
| 근접 | **Slash** | Strength (4) | Strength +6 | |
| 근접 | **Block** | Defence (4) | Defence +6 | |
| 원거리 | **Accurate** | Ranged (4) | Ranged +6 | |
| 원거리 | **Rapid** | Ranged (4) | — | **공격 간격 −0.4초**(`flatAttackInterval -400`) |
| 원거리 | **Longrange** | Ranged (2) + Defence (2) | Ranged +3 · Defence +3 | 혼합 |
| 마법 | **Magic** | Magic (4) | Magic +6 | |
| 마법 | **Defensive** | Magic (2) + Defence (2) | Magic +3 · Defence +3 | 혼합 |

- 쓸 수 있는 스타일은 든 무기 종류가 정한다(근접 3 · 활 3 · 지팡이/완드 2) [위키/jina Combat]. 「히든 레벨」 열은 데이터 `flatHiddenSkillLevel` — 위키는 스타일의 히든 레벨을 서술하지 않아 **식의 어느 항에 합산되는지는 확인 못 했다**(§13).

### 4-2. 경험치 산정 [위키/jina Combat · Prayer · Slayer · Hitpoints]
| 스킬 | 얼마나 | 언제 |
|---|---|---|
| **Hitpoints** | **가한 데미지 1당 0.133** | 어떤 스타일이든 항상 |
| 스타일의 전투 스킬 | 단일 스킬 스타일 **데미지 1당 0.4** · 혼합 스타일은 **각각 0.2** | 가한 데미지에 비례(받은 데미지는 무관). 데이터 `ratio` 4 / 2 와 일치 |
| **Prayer** | 데미지 1당 **(1/30) × 활성 기도의 기본 PP 비용 합**. 예: 3PP 기도(Steel Skin) → 데미지 1당 0.1 | 「추가 Prayer 경험치」가 붙는 기도만(Protect from Magic 류는 0). 비용 증감 수정치는 영향 없음 |
| **Slayer** | 임무 몬스터 처치 = 그 몬스터 최대 HP 의 **10%** · 슬레이어 지역에서 처치 = **5%** · 둘 다 = **15%** | **처치했을 때 한 번**(공격마다가 아님) |
| **Summoning** | 소환수가 공격할 때 | 태블릿을 소모하며 얻음 |

- Magic 저주 · 오라는 직접 경험치가 없다. 몬스터 최대 HP 는 화면 값이라 Green Dragon(750) 임무 처치 = Slayer 경험치 75 [해석].

## 5. 버티는 수단
### 5-1. 체력 재생
- **기본 재생**: **10초마다 최대 HP 의 1%** [위키/jina Hitpoints]. 공식:
  `재생량 = ⌊ (최대 HP / 100 + 고정 재생 보너스) × (1 + % 재생 보너스 / 100) ⌋` (% 보너스는 고정 보너스 뒤에 적용). 간격을 줄이는 수정치도 있다.
- **Hardcore 는 자연 재생이 없다**(`gamemodes.hasRegen: false`) — 음식으로만 회복 [데이터] [위키/jina].
- 재생 보너스 출처: 물약(Regeneration I~IV = +30/60/100/150%) · 기도(Rapid Heal +10 고정 · Rejuvenation +20 고정) · 망토 · 소환수(Unicorn +50%) · Agility 기둥 · 스킬케이프 등 [위키/jina] [데이터 `items`].
- 슬레이어 지역 Desolate Plains 는 재생을 **−100%** 로 만든다(§9). 초과 회복은 버려진다. **흡혈(Lifesteal)** 은 가한 데미지의 일부를 회복하는 것(추가 데미지 아님) — Fervor 오라 5/10/15% · 몬스터 패시브 Cursed Robes 25% [위키/jina Combat] [데이터].

### 5-2. 음식
- **음식 종류 64종**(`type: Food`). 회복량(데이터 원값 · 화면은 ×10) 범위 **0.1(Lemonade · Birthday Cake)~52.8(Whale (Perfect))**, 중앙값 9.9 · 하위 25% 3.6 · 상위 25% 18 · 상위 10% 27 이상 [데이터/계산].
- 대표: Shrimp 3 · Trout 7 · Salmon 9 · Lobster 11 · Swordfish 13 · Crab 15 · **Shark 20** · Cave Fish 22 · Carrot Cake 30 · **Manta Ray 40** · **Whale 48** · Whale (Perfect) 52.8. 「(Perfect)」는 완벽 요리로 **+10%** [데이터].
- 먹는 길은 **수동**(음식 버튼)과 **자동 먹기**(§5-3). 음식은 Fishing → Cooking · Farming · Township · 슬레이어 보급 상자(Basic/Standard/Generous, 5,000/10,000/20,000 SC — 음식 · 화살 · 룬 · 마법 뼈 묶음)로 얻는다. 상점 **AutoEquipFood**(GP 10,000,000 — 요리한 음식 자동 장착) · **AutoSwapFood**(GP 75,000,000 — 음식 슬롯이 비면 다른 슬롯으로 자동 전환) [위키/jina Combat] [데이터].

### 5-3. 자동 먹기(Auto Eat) — 상점 3단 [데이터 `shopPurchases` 3건 · 누적 수정치]
| 단계 | 가격 | **발동**(HP 가 이 % 이하) | **채움**(HP 를 이 %까지) | 음식 효율 |
|---|---|---|---|---|
| **Tier I** | GP 1,000,000 | **≤ 20%** | **≥ 40%** | **60%** |
| **Tier II** | GP 5,000,000 (I 필요) | **≤ 30%** | **≥ 60%** | **80%** |
| **Tier III** | GP 20,000,000 (II 필요) | **≤ 40%** | **≥ 80%** | **100%** |

- 자동 먹기는 **장착한 음식만** 소비하고 **채움 % 까지 필요한 만큼 먹으므로 회복량은 상관없다**(먹는 개수만 다름 — 위키: 「Potatoes 든 Whale 이든 안 떨어지는 한 같다」). **방치의 안전 조건**은 「**발동 HP 가 몬스터 최대 데미지(상성 · DR 반영)보다 높을 것**」 [위키/jina Combat].
- 수정 수단: 기도 **Redemption** = 채움 한계 +20% · 「Wasteful Ring」(Wicked Greater Dragon 드롭)이 발동 HP 를 바꾼다 · 슬레이어 지역 Arid Plains 는 효율 **−30%** [위키/jina] [데이터].

### 5-4. 기도(Prayer)
- **동시 활성 최대 2개.** 포인트(PP)가 모자라면 그 기도는 꺼진다. **PP 는 뼈 묻기(bury) · 에너지 항아리로 얻는다** — Bones 1 · Big Bones 3 · Dragon Bones 5 · Magic Bones 10 · Small/Medium Urn 150/500 [위키/jina Prayer] [데이터 `items.prayerPoints`].
- 총 31종(본편), 레벨 1~95. **소모는 세 종류**(데이터 `pointsPerPlayer` / `pointsPerEnemy` / `pointsPerRegen`): ① **내가 공격할 때마다**(공격 · 명중 계열) ② **적이 나를 공격할 때마다**(방어 · 보호 계열) ③ **HP 가 재생될 때마다**(재생 계열). 대표 5종:

| 기도 | 레벨 | PP 비용 (언제) | 효과 |
|---|---|---|---|
| **Thick Skin** | 1 | 1 (내 공격마다) | 근접 회피 +10% |
| **Protect Item** | 26 | 2 (적 공격마다) | **사망 시 장비를 잃지 않는다**(§10) |
| **Protect from Melee** (Magic · Ranged 도 같은 형) | 50 | 10 (적 공격마다) | 그 유형의 공격을 **80% 확률로 회피**(데이터 `meleeProtection` 80) |
| **Redemption** | 60 | 6 (적 공격마다) | 자동 먹기 채움 한계 +20% |
| **Piety** | 83 | 7 (내 공격마다) | 근접 명중 +15% · 근접 최대 데미지 +25% |

- 그 밖에 Rapid Heal(24 · 재생 +10, 4PP/재생) · Chivalry(66) · Stone Skin(80 · DR +3%) · Battleheart(95 · 회피 +35% · 최소 데미지 +15% · 적 DR −5%). 슬레이어 지역 Holy Isles 는 PP 비용을 **+20%** 로 올린다 [데이터].

### 5-5. 포션
- **약초학 포션 120종 중 60종이 전투용**(`action: Combat`). 각 계열이 **I~IV 4단계**이고 단계가 오를수록 효과 · 충전 횟수가 커진다 [데이터 `items`].
- **충전 횟수는 시간이 아니라 사건으로 줄어든다** — 데이터 `consumesOn`: **PlayerAttack**(내 공격) · **EnemyAttack**(적의 공격) · **PlayerHitpointRegeneration**(재생 발동) · **PrayerPointConsumption**(기도 소모).

| 계열 | I → IV 효과 | 충전 횟수 | 줄어드는 시점 |
|---|---|---|---|
| Melee Accuracy | 근접 명중 +8 / 12 / 15 / 25% | 20 / 20 / 20 / 30 | 내 공격 |
| Melee Strength | 근접 최대 데미지 +1 / 3 / 6 / 10% | 5 / 5 / 5 / 10 | 내 공격 |
| Damage Reduction | DR +2 / 4 / 6 / 10% | 10 / 15 / 20 / 30 | 적 공격 |
| Regeneration | HP 재생 +30 / 60 / 100 / 150% | 15 / 25 / 40 / 60 | 재생 발동 |
| Divine | 기도 PP 소모 보존 10 / 15 / 20 / 35% | 15 / 20 / 25 / 30 | PP 소모 |

- 그 밖에 Ranged/Magic Assistance(명중 · 회피 + 상태이상 무시) · Melee Evasion(+ 기절 무시 10%) · Ranged Strength · Magic Damage. 오프라인 자동 재사용은 설정 「Auto Re-use Potion」([00_overview.md §2-3](00_overview.md)).

## 6. 마법
### 6-1. 구조 — 셋의 역할 구분 [위키/jina Magic]
| 종류 | 역할 | 언제 나가나 | 시간을 쓰나 | 룬 |
|---|---|---|---|---|
| **일반(공격) 주문** | 데미지를 준다. **모든 플레이어 공격이 이 주문**으로 나간다 | **공격마다** | 공격 타이머 | 매 시전 소모 |
| **저주(Curse)** | 적에게 **디버프** | 활성 주문과 함께 **3번의 공격 턴마다** 자동 | 추가 시간 없음 | 소모 |
| **오라(Aurora)** | 플레이어에게 **버프** | **모든 공격 턴마다** 자동 | 추가 시간 없음 | 소모 |

- **마법 무기(완드/지팡이)를 들고 주문을 골라야 쓴다.** 주문은 레벨 · 특수 조건(아이템 · 던전 횟수)으로 해금되고 저주 · 오라는 **선택 사항**. 저주는 **한 번에 하나** · 지속 **3턴**(데이터 `Curse` 템플릿) · **Ancient Magicks 와 못 쓴다.** 오라는 어떤 공격 주문과도 쓰나 데미지를 바꾸는 오라는 Ancient 에 효과가 없다. Miolite Sceptre = 근접에서도 저주 · 오라 · Voodoo Trinket = 어떤 스타일에서든 저주 [위키/jina Magic].
- 세 종류 모두 **룬을 소모하고, 룬은 은행에 있으며 장착하지 않는다**(Runecrafting · 몬스터 드롭). 「Use Combination Runes」는 대체 룬 비용을 쓴다. **원소 지팡이는 그 원소 룬을 대신 공급**한다(`providedRunes` — Staff 3 · Battlestaff 5 · Mystic 7 · Cloudburst 7 · 자연 지팡이는 Nature 1) [위키/jina Magic] [데이터].
- **룬 보존**(소모하지 않을 확률)은 **상한 80%** · 룬 비용 감소 수정치가 별도로 있다 [위키/jina Magic].

### 6-2. 일반 주문 — 스펠북별 [데이터 `attackSpells`]
| 스펠북 | 종류 | 레벨 | 최대 데미지(원값) | 룬 |
|---|---|---|---|---|
| **Standard** (20+2) | Strike ×4원소 | 1~10 | 2 ~ 9.5 | 원소 1~2 + Mind 1 |
| | Bolt ×4 | 14~23 | 9 ~ 13.5 | 원소 2~4 + Chaos 1 |
| | Blast ×4 | 28~37 | 13 ~ 17.5 | 원소 + Death 1 |
| | Wave ×4 | 43~52 | 17 ~ 21.5 | 원소 + Blood 1 |
| | Surge ×4 | 57~68 | 21 ~ 25.5 | 원소 + Ancient 1 |
| | Nature's Call · Wrath | 40 · 65 | 21 · 32 | 4원소 각 2 · 4 + Nature 2 · 4 (+ 확률로 아이템 지급 표 `tableID`) |
| **Ancient** (7) | Slicing Winds · Icicle Volley · Ignite · Gust · Frostbite · Quake · Incinerate | 70~98 | 6.3 ~ 75 (고정 · 특수공격 형) | 원소 룬 20~30 + Ancient 5~10 (+ 후반은 Havoc 룬 5~10) |

- Ancient 주문은 데이터에서 `attacks` 특수공격 항목(chance 100 · 다중 타격 · Burn · Freeze · Stun · Slow)으로 정의된다. 「최대 데미지(원값)」는 화면 값의 1/10(Wind Strike 원값 2 = 화면 20) [해석].

### 6-3. 저주 14종 [데이터 `curseSpells` + `combatEffects`]
| 계열 | 효과 (I / II / III) | 레벨 |
|---|---|---|
| **Blinding** | 적 명중 **−5 / −10 / −15%** | 10 · 30 · 50 |
| **Soul Split** | 적 마법 회피 −5 / −10 / −15% | 15 · 35 · 55 |
| **Weakening** | 적 최대 데미지 −5 / −10 / −15% | 20 · 40 · 60 |
| **Anguish** | 적이 **받는 데미지 +5 / +10 / +15%** | 30 · 50 · 70 |
| **Confusion** | 데이터 수정치 `currentHPDamageTakenOnAttack 2` — 적이 공격할 때 현재 HP 의 2% 를 잃는 것으로 **읽었다** [해석] | 45 |
| **Decay** | 현재 HP 2.5% 자해 + 적 회피 −10% | 80 |

룬은 Mind · Body · Chaos · Death · Blood · Havoc 조합(Blinding I = Mind 2 + Body 1).

### 6-4. 오라 12종 [데이터 `auroraSpells`]
| 계열 | 효과 (I / II / III) | 레벨 |
|---|---|---|
| **Surge** | 공격 간격 **−0.1 / −0.2 / −0.3초** + 원거리 회피 +5/10/15% | 15 · 40 · 65 |
| **Fury** | 최대 데미지 **+2.5 / +5 / +7.5**(고정) + 마법 회피 +5/10/15% | 25 · 50 · 75 |
| **Fervor** | **흡혈 5 / 10 / 15%** + 근접 회피 +5/10/15% | 35 · 60 · 85 |
| **Charged** | **최소 데미지 +1 / +2 / +4** | 45 · 70 · 95 |

**III 단계는 Book of Eli** 를 껴야 쓴다 [위키/jina Magic]. 룬은 원소 3~5 + Light 1~3(Charged 는 Chaos · Death · Light).

## 7. 특수 요소
### 7-1. 몬스터 패시브(`combatPassives` 80종) — 크게 넷 [데이터]
| 묶음 | 수 | 내용 |
|---|---|---|
| **몬스터 고유 패시브** | 15 (실제로 쓰는 몬스터 17종) | 아래 표 |
| **임의 패시브 풀** | 20 (Demo 소속) | 이름 그대로 「Swing First」「Big Boi」「Stronk」「Rank 1 Ninja」…. **어느 몬스터 데이터도 안 쓴다.** 게임 모드 Chaos 규칙 「All Enemies have at least 1 random Passive」의 풀로 **추정**([추정]). 값은 ±10~300% 의 데미지 · 명중 · 회피 · HP · 간격 · DR 조합 — 예 Absolute Thickness(DR 95 · HP −90%), Rank1Ninja(회피 +300% · HP −90%) |
| **스트롱홀드 버프** | 32 (+ 이벤트 12 · Slimed 1) | `Standard/Augmented/SuperiorStrongholdBuff`(간격 −10/−20/−30% · HP +25/50/75%) · 보스 버프(HP +50%) · **`damageDealt` −N% 패시브**(20종, N = 15~85 · 대상 미확인) · 계열 패시브(Undead · Elementalist · Burning · Affliction I·II 8종). |

**몬스터 고유 패시브 (실사용)**

| 패시브 | 효과 | 쓰는 몬스터 |
|---|---|---|
| **Purity** | 화상 · 출혈 · 독 · **모든 플레이어 디버프**(스턴 · 프리즈 · 수면 · 저주 포함) **면역** | 미스터리 인물 · Ahrenia(보스) |
| **Melee / Ranged / Magic Proficiency** | **다른 두 유형의 공격을 전부 면역**(그 유형으로만 맞는다) | 미스터리 인물 1·2단계 · Ahrenia |
| **Rebirth** | 사망 시 **40% 확률로 HP 가득 부활** | Phoenix |
| **Fleeting Defence** | `globalEvasionHPScaling` 1.3 (뜻은 확인 못 함 — 이름과 값으로 보아 HP 가 줄수록 회피가 변하는 식으로 **추정**) | Pegasus |
| **Toxic Glands · Poisonous Hide** | 독 무시 100% | 독 계열(Noxious Serpent · Venomous Snake · Giant Moth · Legaran Wurm) |
| **Cursed Robes** | 화상 · Frostburn 무시 + **흡혈 25%** | Cursed Lich |
| **Spiked Armour** | **반사 20%** · Slow 무시 · DR +20 | Spiked Red Claw |
| **Bone Plate** | 스턴 계열 · 출혈 무시 · 저주 면역 · DR +15 | Greater Skeletal Dragon |
| **Afflicted Might** | 스턴 · 수면 · 저주 · Slow **면역** | Bane 계열(최종 보스) |

슬레이어 지역 효과도 사실상 패시브다 → §9.

### 7-2. 상태 효과(`combatEffects` · 템플릿) [데이터 `combatEffectTemplates` · `combatEffects` · `combatEffectGroups`]
| 종류 | 규칙 | 지속 |
|---|---|---|
| **Stun** | 대상의 **턴을 즉시 중단** · **공격 · 회피 불가** · **받는 데미지 +30%**. 건 뒤 **3턴 동안 Stun 면역** | 기본 1턴 |
| **Freeze** | Stun 과 같음(+30%). **면역을 주지 않는다** | 1턴 |
| **Crystallize** | Stun 과 같으나 **받는 데미지 +50%** | 1턴 |
| **Sleep** | 공격 · 회피 불가 · **받는 데미지 +20%**. 끝나면 **Drowsy**(공격 간격 +10%) 를 받는다. 수면 · Drowsy 중에는 수면이 다시 걸리지 않는다(`exclusiveGroups`) | 1턴 |
| **Slow** | 공격 간격 **+N%**(N = `magnitude`, 예 +30%) | N턴 |
| **Frostburn** | 대상의 공격 간격 +10% + **현재 HP 의 3%**(상한 200)를 피해로 준다(턴마다인지는 [해석]) | 2턴 |
| **Burn** | 대상 **현재 HP 의 15%** 를 **250ms 간격 10회(2.5초)** 로 나눠 피해. 상한 1000 | 2.5초 |
| **Poison** | 대상 **최대 HP 의 10%** 를 **2.5초 간격 4회(10초)**. 상한 1000 | 10초 |
| **Deadly Poison** | 같은 형으로 **최대 HP 의 25%** | 10초 |
| **Bleed** | 가한 데미지의 **100 / 200 / 400%** 를 **0.5초 간격 20회(10초)** 로 나눠 피해(무기별 3형 · 반사형 300% · Deadly Cut 은 최대 HP 4% + 고정) | 10초 |
| **Fear** | 턴 중단 + 다음 턴의 공격 간격이 늘어남 + Fear 면역 3턴. (템플릿 설명 「+30%」 · 데이터 수정치는 `attackInterval 100` — **어긋난다**) | 1턴 |
| **Curse** | §6-3. 한 번에 1개 · 3턴 | 3턴 |
| **버프 / 디버프 / 회복** | 회피 · 명중 · 최대 데미지 · 간격 · DR 을 N턴간 증감(`StaticSelfCountingModifier` 26종 · Combo 5종 · Stacking 5종 등) · 최대 HP % 를 나눠 회복(Regen) | 효과별 |

**공통 규칙**
- 효과는 **효과 그룹**으로 묶여 면역 · 무시 판정을 받는다: `StunLike`(Stun · Freeze · Crystallize) · `Sleep` · `Slow` · `Frostburn` · `BurnDOT` · `BleedDOT` · `PoisonDOT` · `Curse` · `Buff` · `Debuff` · `Fear`. 패시브 · 포션이 **면역(`effectImmunity`)** 이나 **무시 확률(`effectIgnoreChance`)** 을 준다(예 Melee Evasion 포션 = 스턴 무시 +10%).
- **DoT 는 1틱당 최소 1**(`max(⌊총량/횟수⌋,1)`) · 피해 배율/저항을 받는다(`applyDamageModifiers` · `applyResistance`).
- 스턴이 걸리면 **진행 중이던 공격(특수공격 포함)이 끊기고**, 이미 스턴 상태면 다시 걸리지 않는다 [위키/jina Combat].

### 7-3. 특수공격 — 발동 방식과 종류별 분류 [데이터 `attacks` 157종 · `items` · `monsters`]
**발동 방식**
- **플레이어**: 특수공격이 있는 **무기 · 장신구를 끼면 일반 공격 대신 확률로 특수공격이 나간다**. 확률은 아이템의 `defaultChance`. 여러 개를 끼워 확률 합이 100%를 넘으면 **비례로 줄여 합을 100%로 맞춘다**(Blade Echoes 100% + Infernal Claw 15% → 86.96% · 13.04%) [위키/jina Special_Attacks · Combat]. 특수공격은 **Ancient Magicks 와 같이 못 쓴다**(Archaic 은 장비 특수공격만 못 쓴다).
- **몬스터**: 공격 시도마다 특수공격 확률을 굴리고 **나머지는 일반 공격**(예 Green Dragon = 일반 90% · Lesser Dragonbreath 10%). 몬스터 8종은 `overrideSpecialChances` 로 확률을 덮어쓴다. **확률 합이 100 이면 일반 공격이 없다**(Malcs 70+30 · Aeris 30+25+20+15+10 · Bane 40+25+15+20) [데이터] [위키/jina Green_Dragon].
- **다중 타격**: 첫 타 뒤 타격은 짧은 자체 간격(데이터 `attackInterval` 50~500ms). `cantMiss: true` 인 공격은 회피 불가(위키 표기 「unavoidable」), 아니면 「avoidable」 [데이터] [위키/jina Special_Attacks].
- 데미지 표기: `Normal` 형은 **평소 데미지의 %**(예 Brute Force 200% · Triple Damage 300%) · `Custom` 형은 **최대 데미지(MaxHit)의 % 또는 고정값**(고정값은 화면에서 ×10 — Lesser Dragonbreath 데이터 3 = 「30×20」).

**분류표 (157종 · 한 공격이 여러 칸에 걸침)** [데이터/계산 — 위 규칙으로 직접 분류]

| 분류 | 수 | 대표 |
|---|---|---|
| **쓰는 쪽** — 몬스터 전용 | 86 | Dragonbreath · Frostburn · Cyclone · Mark of Death |
| 무기/장신구(플레이어) | 60 | Brute Force · Life Leech · Flurry · Ice Prison · Blade Echoes |
| 주문/기타 | 11 | Ancient 주문 7 · Nature's Call/Wrath · Split · Infinity Dragonbreath |
| **다중 타격** | 60 | Volley(3타) · Triple Swipe · Infernum · Blade Echoes |
| **회피 불가**(`cantMiss`) | 57 | Piercing Arrow · Crushing Blow · Dragonbreath 류 |
| **자기/상대 능력치 수정** | 41 | Rapid Fire · Onslaught · Elusiveness · Shadowstep |
| **Slow** | 17 | Frozen Wind · Winterland · Grasping Roots |
| **Burn** | 16 | Fireball · Firebreathing · Ignite |
| **데미지 없는 특수**(상태 · 버프 · 회복 전용) | 14 | Stone Barrier · Winterland · Shadowstep · Sealing |
| **Stun / Freeze / Sleep** | 10 / 5 / 5 | Pebble Shot · Whirlwind · Shockwave / Ice Prison · Icy Chill / Drowsy Spores · Spores |
| **Poison / Frostburn / Bleed** | 9 / 6 / 4 | Venom · Toxic Bite / Frostburn / Sunset Stab · Ram · Deadly Cut · Rend |
| **흡혈** | 4 | Life Leech · Ruby Shots · Drain |

- **발동 확률(`defaultChance`) 분포**: 40% 38종 · 20% 26종 · 100% 24종 · 30% 19종 · 15% 13종 · 50% 9종 · 5%/25% 각 7종. 특수공격 보유 아이템은 69종(전투 46 · Golbin Raid 22 · 이벤트 1) — 무기 쪽 정리는 [02_items.md §6](02_items.md) [데이터/계산].

## 8. 몬스터 분포와 대표 몬스터
### 8-1. 본편 몬스터 171종 [데이터/계산 — 전투 레벨은 §3-5 식]
- **공격 유형**: 근접 **97**(57%) · 마법 **39**(23%) · 원거리 **33**(19%) · random **2**(1% — Bane 계열). 보스 27종 · 슬레이어 임무 대상 99종 · 특수공격 보유 **89종**(52%) · 고유 패시브 17종 [데이터].
- **전투 레벨 분위**: 최소 1 · 하위 10% 23 · 25% 54 · **중앙값 120** · 75% 335 · 90% 666 · 최대 1300. **HP(원값) 중앙값 105** · 25% 41 · 75% 300 · 90% 810 · 최대 1600(화면 16,000).

**구간별 분포** (구간 = 슬레이어 등급의 전투 레벨 구간 · §9와 같은 자르기)

| 구간(전투 레벨) | 마리 | 근접 · 원거리 · 마법 | HP 최소 / 중앙 / 최대 (원값) | 간격 중앙(ms) | 몬스터 DR 중앙 (범위) | 특수공격 보유 | 슬레이어 임무 대상 |
|---|---|---|---|---|---|---|---|
| **1~9** | 9 | 7 · 2 · 0 | 2 / 6 / 10 | 2400 | 0% (0) | 0 | 8 |
| **10~49** (Easy) | 30 | 24 · 4 · 2 | 10 / 28 / 60 | 2500 | 0% (0~20) | 1 | 27 |
| **50~99** (Normal) | 36 | 23 · 6 · 7 | 25 / 60 / 105 | 3000 | 0% (0~20) | 15 | 26 |
| **100~199** (Hard) | 37 | 17 · 6 · 14 | 55 / 125 / 300 | 2800 | 5% (5~20) | 18 | 18 |
| **200~374** (Elite) | 19 | 10 · 5 · 4 | 140 / 240 / 580 | 2800 | 10% (10~20) | 15 | 10 |
| **375~789** (Master) | 29 | 13 · 8 · 8 | 250 / 600 / 1000 | 3000 | 25% (15~25) | 29 (전부) | 10 |
| **790~999** (Legendary) | 9 | 3 · 2 · 4 | 1000 / 1000 / 1200 | 2600 | 40% (25~40) | 9 (전부) | 0 (전부 보스) |
| **1000+** (Mythical) | 2 | random 2 | 1400 / 1600 / 1600 | 3000 | 45% (40~50) | 2 | 0 (Bane) |

**읽는 법**: 초반은 **근접이 대다수 · 특수공격이 거의 없고**, **100 레벨부터 마법이 늘고**(14/37), **Master 이후는 모든 몬스터가 특수공격**을 가진다(특수공격 보유율 3%(1~49) → 42% → 49% → 79% → 100%(375+)). 「1~9」 구간과 「10~49」를 합치면 Easy 등급 구간(39종 · 슬레이어 대상 35종)이다. TotH 몬스터 58종은 이 표에 없고 Legendary/Mythical 구간을 채운다(전투 레벨 370~3945) [데이터/계산].

### 8-2. 대표 몬스터 10종 (초반 · 중반 · 후반) [데이터 · 계산]
레벨 = **A**ttack / **S**trength / **D**efence / **R**anged / **M**agic · HP = 화면 값(원값 × 10) · 명중 · 최대 데미지 = §3 식에 데이터 값을 넣은 계산(**Green Dragon 한 마리만 위키 표시값과 대조·일치**, 나머지는 [추정] · 마법은 `selectedSpell` 의 최대 데미지 × 몬스터 마법 데미지 보너스).

| 몬스터 | 전투 레벨 | HP | A / S / D / R / M | 유형 · 간격 | DR | 명중 | 최대 데미지 | 특기 |
|---|---|---|---|---|---|---|---|---|
| **Chicken** | 1 | 30 | 1 / 1 / 1 / 1 / 1 | 근접 · 2.4초 | 0% | 640 | 11 | 스탯 음수 보정으로 약함 |
| **Black Knight** | 23 | 200 | 20 / 20 / 20 / 1 / 1 | 근접 · 2.6초 | 0% | 2,146 | 42 | 장비 드롭(10%) |
| **Wizard** | 32 | 300 | 20 / 20 / 20 / 20 / 40 | **마법** · 2.4초 | 0% | 4,116 | 118 (Water Bolt) | 마법 회피가 높음 |
| **Bandit** | 44 | 400 | 20 / 20 / 20 / 60 / 10 | **원거리** · 2.0초 | 0% | 6,486 | 82 | 간격이 짧다 |
| **Green Dragon** | 79 | 750 | 68 / 68 / 68 / 60 / 60 | 근접 · 3.0초 | 0% | 6,468 | **143** (위키 143) | 일반 90% · Lesser Dragonbreath 10%(회피 불가 다중 · 화상) · 뼈 Dragon Bones |
| **Black Dragon** | 120 | 1,200 | 100 / 100 / 100 / 90 / 90 | 근접 · 3.0초 | 5% | 13,516 | 268 | 같은 특수 40% |
| **Elder Dragon** (보스) | 272 | 2,400 | 200 / 300 / 200 / 180 / 180 | 근접 · 3.0초 | 20% | 25,916 | 470 | Burning Fireball 40% · GP 3,000~10,000 |
| **Malcs, the Guardian of Melvor** (보스) | 677 | 2,500 | 640 / 960 / 380 / 960 / 480 | 근접 · 3.0초 | 25% | 41,536 | 982 | Razor-Sharp Claws 70% + Dragonbreath 30% — **일반 공격 없음** |
| **Aeris** (보스 · 공기 신) | 752 | 10,000 | 500 / 500 / 450 / 800 / 500 | **원거리** · 3.0초 | 25% | 51,776 | 847 | 특수 5종(확률 30/25/20/15/10) — 일반 공격 없음 |
| **Bane** (최종 보스) | 1250 | 14,000 | 1000 ×5 | random · 3.0초 | 40% | — | — | Afflicted Might(스턴 · 수면 · 저주 · Slow 면역) · 특수 4종(Fragile Mind 등) |

## 9. 슬레이어
### 9-1. 과제 등급 7종(본편 5 + TotH 2) [데이터 `slayerTaskCategories`]
| 등급 | 필요 슬레이어 레벨 | 몬스터 전투 레벨 | 새 임무 비용 | 연장 비용 | 연장 배수 | 기본 길이 | 구간 몬스터 수 / 임무 대상(본편) |
|---|---|---|---|---|---|---|---|
| **Easy** | 1 | 1~49 | **0** (무료) | 100 SC | ×1 | 10 | 39 / 35 |
| **Normal** | 25 | 50~99 | 2,000 SC | 800 SC | ×2 | 20 | 36 / 26 |
| **Hard** | 50 | 100~199 | 5,000 SC | 2,700 SC | ×3 | 30 | 37 / 18 |
| **Elite** | 75 | 200~374 | 15,000 SC | 6,400 SC | ×4 | 40 | 19 / 10 |
| **Master** | 85 | 375~789 | 25,000 SC | 12,500 SC | ×5 | 50 | 29 / 10 |
| **Legendary** (TotH) | 102 (위키 표는 100 — §13) | 790~999 | 50,000 SC | 21,600 SC | ×6 | 60 | 9 / 0 (본편은 전부 보스 · TotH 몬스터가 채움) |
| **Mythical** (TotH) | 110 | 1000+ | 100,000 SC | 34,300 SC | ×7 | 70 | 2 / 0 (Bane · TotH 몬스터가 채움) |

(SC = 슬레이어 코인) 위키의 **등급별 최대 데미지**(근접 / 원거리 / 마법 순으로 보이나 프록시가 아이콘을 지웠다): Easy 74·92·169 · Normal 168·177·188 · Hard 268·260·242 · Elite 455·850·600 · Master 1,180·970·1,070 · Legendary 1,286·1,250·1,200 · Mythical 1,340·1,260·1,600 [위키/jina Slayer].

**임무 규칙** [위키/jina Slayer]
- 임무 몬스터는 **그 등급의 전투 레벨 구간에서 무작위**로 뽑힌다. **슬레이어 지역의 몬스터는 레벨 · 일회성 해금 · 필수 장비 소유 조건을 만족할 때만** 후보에 든다.
- **임무를 다 채우면 같은 등급의 새 임무가 자동으로 무료 시작**된다. 다른 임무를 원하면 「New Task」(위 비용). **Easy 는 비용 없이 바꿀 수 있다.**
- **연장**: 아직 안 끝난 임무의 목표 횟수를 늘린다. 위키는 「새 임무 비용의 **절반**」이라 적지만 표 수치는 새 임무 비용의 40~54% 다(Normal 800/2,000 · Hard 2,700/5,000 · Elite 6,400/15,000 · Master 12,500/25,000) [위키/jina Slayer] [데이터/계산].
- **목표 몬스터 수**: `C = 등급 × 10 + 4 × ⌊ r × 슬레이어 레벨 + 1 ⌋`(r = 0 이상 1 미만 난수). 표로는 Easy 14~110 · Normal 24~220 · Hard 34~330 · Elite 44~380 · Master 54~450 · Legendary 64~500 · Mythical 74~554. **연장 증가량** `E = 등급 × 10 + ⌊슬레이어 레벨 / 5⌋` [위키/jina Slayer].
- **Auto Slayer**(슬레이어 코인 150,000): 체크하면 임무가 끝날 때 같은 등급의 새 임무를 **자동으로 시작**한다. **현재 접근 가능한 지역의 몬스터만** 뽑는다(예: Mirror Shield 를 안 끼고 있으면 Strange Eyed Monster 는 안 뽑힘). 방치하려면 그 등급의 **모든 후보를 상성 · DR 반영 후 견딜 수 있어야** 한다 [위키/jina Slayer] [데이터 `shopPurchases`].

### 9-2. 슬레이어 코인(SC)
- **임무 몬스터를 잡았을 때만** 나온다 — 그 몬스터 **최대 HP 의 10%**(데이터 `currencyRewards percent 10`). **임무가 아닌 몬스터는 슬레이어 지역에서도 코인을 주지 않는다** [위키/jina Slayer].
- 지급 표: 임무 대상 + 슬레이어 지역 = **경험치 15% · 코인 10%** / 임무 대상 + 일반 지역 = 10% · 10% / 임무 아님 + 슬레이어 지역 = 5% · 0% / 그 외 = 0. Township 과제도 코인을 준다. 위키의 조언은 「Auto Slayer 로 **견딜 수 있는 가장 높은 등급**을 돌려라」 [위키/jina Slayer].
- **쓰는 곳** [데이터 `shopPurchases` · 위키]: 슬레이어 장비(Slayer Helmet/Platebody/Cowl/Leather Body/Wizard Hat/Robes Basic 각 10,000 SC + Strong/Elite/Master 업그레이드 킷 50,000/200,000/1,000,000 SC) · 지역 입장 아이템(Mirror Shield 2,000 · Desert Hat 25,000 · Magical Ring 50,000 · Confetti Crossbow 150,000 · Blazing Lantern 250,000 · Climbing Boots 500,000 SC) · **Map to the Unhallowed Wasteland 3,000,000 SC** · Auto Slayer 150,000 · 보급 상자 5,000~20,000 · 장비 세트 확장(300,000) · 전리품 상자 겹치기 · Skull Cape 400,000 · Necromancer 세트(GP + SC 혼합).

### 9-3. 슬레이어 지역 13곳(본편) [데이터 `slayerAreas` · 위키/jina Slayer]
지역 입장 = **슬레이어 레벨 + (일부) 전용 아이템 · 던전 클리어 · 상점 구매**. **전용 아이템을 안 끼면 입장은 되지만 그 지역의 어떤 몬스터에게도 데미지를 못 준다**(슬레이어 스킬케이프가 이 요구를 우회한다) [위키/jina Slayer]. **지역 효과**는 플레이어를 약하게 하거나 몬스터를 강하게 하는데, 「슬레이어 지역 효과 무효화(`Slayer Area Effect Negation`)」 스탯으로 줄일 수 있다 [위키/jina Combat].

| 지역 | 슬레이어 레벨 | 추가 조건 | **지역 효과** | 몬스터 |
|---|---|---|---|---|
| **Penumbra** | 1 | — | 플레이어 **명중 −10%** | 6종(Mummy · Statue · Vampire …) |
| **Forest of Goo** | 1 | — | 플레이어 **공격 간격 +10%** | 4종(Goo Monster 류) |
| **Strange Cave** | 10 | Mirror Shield | 플레이어 **전역 회피 −15%** | 6종(Eye 류) |
| **Holy Isles** | 30 | — | 기도 **PP 비용 +20%** | 6종(Angel · Paladin …) |
| **Runic Ruins** | 45 | — | 스타일이 마법이 아니면 **마법 회피 −50%** | 5종(Druid · Necromancer …) |
| **Arid Plains** | 50 | Desert Hat | 자동 먹기 **효율 −30%** | 6종(Turkul 류 · Sand Beast) |
| **High Lands** | 60 | Magical Ring | **적이 5턴마다 현재 HP 의 20% 회복** | 2종(Griffin · Pegasus) |
| **Toxic Swamps** | 65 | — | 적이 공격 시 **독 확률 +100%** | 3종(뱀 · 나방) |
| **Desolate Plains** | 70 | — | 플레이어 **HP 재생 −100%** | 4종(Horned Elite 류) |
| **Shrouded Badlands** | 80 | Blazing Lantern | 플레이어 **명중 −40%** | 4종 |
| **Perilous Peaks** | 85 | Climbing Boots | 플레이어 **회피 −60%** | 3종(Greater Dragon) |
| **Dark Waters** | 90 | Into the Mist 클리어 | 플레이어 **공격 간격 +40%** | 3종 |
| **Unhallowed Wasteland** | 95 | 지도(3,000,000 SC) | **적이 2턴마다 현재 HP 의 100% 회복**(= 2턴마다 HP 가 2배 · 슬레이어 효과 무효화로 줄어듦) | 4종(Cursed Lich 등) |

**읽는 법**: 효과는 **명중 · 회피 · 간격 · 재생 · 자동 먹기 · 기도 비용 · 적 회복 · 독** 여덟 가지 축에서 나오고, **자동 먹기 효율 · 재생을 깎는 지역(Arid Plains · Desolate Plains)은 방치형의 안전 계약을 직접 겨냥**한다. 위키는 이 지역들을 「짜증나는 것에서 **진행을 막는 것**(Dark Waters · Unhallowed Wasteland)까지」로 묘사한다 [위키/jina Combat] [해석].

## 10. 사망과 하드코어
### 10-1. 죽으면 무엇을 잃나 [위키/jina Combat]
- HP 가 0 이하가 되면 **사망**. **장비 칸 하나가 무작위로(모든 칸 같은 확률) 골라지고 그 칸의 장비가 영원히 사라진다.** 골라진 칸이 비어 있으면(예: 근접인데 탄약 칸이 빔) **「운이 좋았다, 아무것도 잃지 않았다」**.
- **탄약이나 소환 태블릿이 골라지면 스택 전체**를 잃는다. **잃을 수 있는 것은 활성 칸에 장착된 비음식 아이템뿐** — 은행 · 음식은 안전.
- **면제**: 기도 **Protect Item**(PP 2/적 공격) · Decoy Idol(AoD 확장 — 데이터 「항상 이 아이템이 사망 시 잃는 물건으로 고정」) [위키/jina Combat] [데이터].
- 경험치 · 골드 손실은 서술이 없다. 오프라인 사망도 같은 규칙([00_overview.md §2-4](00_overview.md)).

### 10-2. 게임 모드별 차이 [데이터 `gamemodes` · 위키/jina Combat]
| 모드 | 사망 | 자연 재생 | HP 배수(`hitpointMultiplier`) | 상성 |
|---|---|---|---|---|
| **Standard** | 위 규칙 | 있음 | 10 | Standard |
| **Hardcore** | **캐릭터 영구 삭제**(단 Impending Darkness 이벤트 동안만 일반 사망 규칙) | **없음**(`hasRegen: false`) | 10 | **Hardcore** |
| **Adventure** | 위 규칙 | 있음 | **100** (최대 데미지 식의 M 도 100 — 위키) | Hardcore |
| **Ancient Relics** | 위 규칙 | 있음 | 10 | Hardcore |
| Chaos · 스피드런 (이벤트) | Chaos = **장착 아이템 전부 소실**(간격 −25% · 적은 항상 패시브 1개+) · Hardcore 계 스피드런은 `isPermaDeath` 영구 삭제 | Chaos 있음 · 스피드런 모드별 | 10,000 · 10~1,000 | Hardcore(Internal Suffering 은 뒤집힘) |

「위 규칙」 = §10-1 의 장비 1칸 소실. Hardcore 는 은행 확장도 88칸까지로 제한된다 [데이터 `rules`].

## 11. 소환수 · 시너지 — 전투에 끼는 방식
- 장비 칸 `Summon1` · `Summon2` 에 **소환수(Familiar 20종 본편)** 를 낀다. 소환수는 **자체 최대 데미지**(`summoningMaxhit` 2.1~) 로 **공격에 가담**하고, **공격할 때마다 태블릿이 소모**(`consumesOn: PlayerSummonAttack`)되며 그때 Summoning 경험치가 든다 [데이터] [위키/jina Combat].
- 소환수는 전투 수정치를 주고(예: Golbin Thief = 적을 맞힐 때 GP 획득 · Centaur = 원거리 명중 · 최대 데미지 +3 · Unicorn = 재생 +50%), 소환수 공격이 플레이어 타이머와 묶이는지는 확인 못 했다(§13).
- **시너지**는 **특정 소환수 두 종류를 같이 끼면** 켜지는 추가 효과(데이터 `itemSynergies` 는 아이템 ID 두 개의 쌍 — 본편 23 · TotH 8 · AoD 3 · ItA 2쌍. 예: Minotaur/Centaur 시너지 = 원거리 몬스터를 상대할 때 근접 명중 +15) [데이터] [위키/jina Combat].

## 12. 확장팩이 더한 것 (짧게) [데이터]
| 확장팩 | 전투 관련 추가 |
|---|---|
| **Throne of the Herald** (TotH) | 몬스터 58 · 슬레이어 지역 8 · 던전 7 · 슬레이어 등급 **Legendary · Mythical** · **Archaic Magicks**(주문 10) · 저주 3 · 오라 4(Fury/Fervor/Charged/Surge **IV**) · 기도 8 · **스킬 레벨 상한 99 → 120** |
| **Atlas of Discovery** (AoD) | 몬스터 46 · 전투 지역 8 · 슬레이어 지역 3 · 던전 5 · 기도 17(Unholy 계열 추정 [추정]) · 저주 2(Fatigue · Petrified) · 오라 2(Crystallization · Crystal Sanction) · Decoy Idol · 고대 유물(Ancient Relics 모드) |
| **Into the Abyss** (ItA) | **Abyssal Realm**(별도 영역 · **삼각형 방향 반전** · Abyssal 데미지/저항 · **Soul Points** · Unholy/Abyssal 기도 31) · 몬스터 101 · 전투 지역 12 · 슬레이어 지역 14 · **Abyss 깊이 9층** · 스트롱홀드 4 · 주문 28 · 슬레이어 등급 7(Woe~Resolution — **Abyssal Slayer Coins**) · 특수공격 204 · 상태 효과 157(방벽 Barrier 계열 포함) · Eternal Realm(더 위) |

## 13. 출처 · 확인 못 한 것
### 13-1. 출처
- **원본 데이터** `melvorDemo` · `melvorFull` · `melvorTotH` · `melvorExpansion2` · `melvorItA` · **위키**(`r.jina.ai` · 2026-09-30 · v1.3.1 기준, §0 목록). 공식은 HTML 응답의 MathML 에서 추출(§0).

### 13-2. 확인 못 한 것 · 어긋난 곳
| 항목 | 상태 |
|---|---|
| **도망(run)의 규칙** · 소환수 공격 주기 | 도망의 쿨다운 · 확률 · 페널티는 서술을 못 찾음(종료 조건 중 하나로만 적힘). 소환수 공격이 플레이어 타이머와 묶이는지도 확인 못 함 |
| **스타일의 히든 레벨(+6/+3)이 명중 · 최대 데미지 식 어디에 합산되는지** | 데이터에는 `flatHiddenSkillLevel` 로 있으나 위키 식에는 스타일 항이 없다 |
| 상성 「R」(저항 배율)이 DR 을 곱하는지 최대 데미지 감소인지 **계산 형태** | 위키 서술 없음 |
| Fear 의 간격 증가폭 | 템플릿 설명 「+30%」 vs 데이터 수정치 `attackInterval 100` — **어긋남**(어느 쪽이 최신인지 미확인) |
| 슬레이어 Legendary 필요 레벨 · 임무 몬스터 수 식 | 데이터 102 vs 위키 표 100 — **어긋남**(데이터가 최신 빌드일 수 있음). 식 `등급×10 + 4×⌊r×레벨+1⌋` 의 상한이 표의 상한(Easy 110)과 정확히 안 맞는다 — 프록시가 식의 문자를 잃었을 수 있다 [추정] |
| 스트롱홀드 `damageDealt −N%` 패시브의 대상 | 확인 못 함 |
| 기도 경험치 표기 | Combat 페이지 「per damage per prayer point 0.1」 vs Prayer 페이지 「1/30 × 총 PP」 — 「3PP 기도 = 0.1」 예시로 후자가 맞다고 **읽었다** [해석] |
| 몬스터 전투 레벨 · 명중 · 최대 데미지 | 데이터에 없어 위키 공식으로 **계산**. Green Dragon(전투 레벨 79 · 143 · 6,468 · 8,008)과 최대 전투 레벨 1300 만 위키와 대조했다. 마법 몬스터 계산은 [추정] |
| 임의 패시브 풀 20종 = Chaos 「랜덤 패시브」의 풀 · 슬레이어 등급 최대 데미지 표(§9-1)의 열 순서 | 이름 · 개수 일치와 아이콘이 지워진 열 순서를 **짐작**했다 [추정] |
| 특수공격 분류표 | 데이터 필드(`cantMiss` · `attackCount` · `onhitEffects` · `lifesteal` · `damage`)로 내가 직접 분류 — 게임의 공식 분류가 아니다 |
| TotH · AoD · ItA 의 상세 | 요약만 함(§12) |
