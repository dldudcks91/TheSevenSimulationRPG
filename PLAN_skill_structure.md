# PLAN — 스킬을 「스킬 · 하는 일 · 걸린 효과」 세 표로 나눈다

> **상태: 계획 확정 · 구현 전 [2026-09-22].** 구현은 다른 세션이 한다. 이 문서가 결정과 순서의 SSOT이고, 단계가 끝나면 계약(INTERFACE)과 데이터 README가 SSOT를 넘겨받는다.
> **실행 중에 사용자에게 되묻지 않는다** — 열린 질문은 전부 가안으로 정했다(§8 · 사용자 위임 「알아서 적고 진행해」 09-22). 가안이 막히는 새 사실이 나올 때만 멈춘다.
> **요청(사용자):** 전직 스킬(상태이상 · 설치물 · 노드)이 계속 들어올 테니, 전투 코드가 새 방식의 스킬을 **스킬별 예외 없이** 받는 구조로 바꾼다. 기준은 **확장성**이다. 전직 마법사 8개를 `skill.csv`에 넣으려다 구조 문제가 드러나서 구조부터 손본다.
> **줄 번호는 2026-09-22 14시 기준이다.** 병렬 세션이 같은 파일을 고치고 있으니 **함수 이름으로 찾아라**.

---

## 0. 한 장 요약

| | 지금 | 바꾼 뒤 |
|---|---|---|
| 데이터 | `skill.csv` 한 행 = 스킬 하나 = **하는 일 하나** (37칸) | **`skill.csv`**(스킬마다 하나뿐인 것 · 18칸) + **`skill_effect.csv`**(스킬이 하는 일 · 한 줄에 하나) + **`skill_status.csv`**(걸린 효과 — 버프 · 상태이상 · 설치물) |
| 전투 | `kind` 하나로 분기(`act`) · 결투 · 자폭 같은 스킬 전용 코드가 전투 파일 곳곳에 있음 | 스킬 = 하는 일 줄의 목록을 차례로 실행 · 걸린 효과는 부품 하나가 돌림 · 스킬 전용 코드 제거 |
| 목표 결과 | — | **기존 스킬의 전투 결과는 한 글자도 안 바뀐다**(골든 지문 불변) |

단계는 넷이다. **1단계(옮기기)만 동작 불변 리팩터**이고, 2~4단계는 기능을 늘린다. **새 기능은 그것을 처음 쓰는 스킬과 같이 들어온다**(아무도 안 읽는 칸 · 코드를 미리 만들지 않는다).

---

## 1. 조사에서 나온 사실

| | |
|---|---|
| **담을 수 있는 모양이 좁다** | 지금 구조가 담는 건 「차례가 와서 한 번 쓰고 끝나는 것」뿐이다. 없는 부품이 다섯이다 — ① 시간에 걸친 효과(틱마다 · n초마다) ② 한 스킬 = 여러 효과 ③ 상태이상 · 스택(`skill.csv:status` 칸은 **아무도 안 읽는다**) ④ 적의 자리 번호 ⑤ 노드 덧씌우기(`skill.resolve` 한 줄 자리만 있음) |
| **잘 늘어나는 곳도 있다** | 대상 표(`skill_effects.js:ATTACK_TARGETS` 5종) · 능력치 창 표(`EFFECTS` 13종) · 발동 조건 표(`CONDITIONS` 4종)는 「표의 키 = 어휘」라 한 줄 등록으로 는다. 이 뼈대는 유지한다 |
| **스킬 전용 분기 현황** | 결투(`skill_runtime.castBuff` 안 분기 + `battle.beginRound` 의 결투 창 닫기 + `pickTarget`) · 도발(`pickTarget`) · 자폭(`battle.js:blast`) · 불러내기(`callBand`) · 소환 정리(`beginRound`) · 인챈트/관통 사격(`basicAttack` 이 창 표식을 읽음) · 가이디드 애로우(대상 표 안에서 방어를 깎음) |
| **`kind` 가 퍼진 곳** | `skill.js`(validate · slotFits · derivedTagsOf · amulet 규칙 · previewOf 의 `AMOUNT_BASIS`) · `skill_runtime.act` · `battle.js`(192 소환사 검사 · 541/545 오오라 · 774 자폭) · `ui/tip.js`(`amountPhrase` · `skillLines` 711~792) |
| **`kind` 는 뜻이 둘 섞여 있다** | 「어떻게 나가나」(aura = 상시 · indirect = 사건이 부름)와 「무슨 일을 하나」(attack · heal · buff · summon · call) |
| **`enemy_single` 도 뜻이 둘이다** | 공격에서는 전열 우선 무작위(`pickTarget` — rng 1회), 버프(결투)에서는 생존 적 중 **HP 최대**(`targetsOf` — rng 0). `kind` 가 뜻을 가른다 |
| **뽑기 풀** | 고유 · 무기 · 보스 셋째 칸 = `innate_pool && owner_kind === 'job'`(`ui/data.js:429`). 목걸이 = `amulet_pool` 만 본다(`data.js:451`). `owner_kind = advance` 는 어휘에 **이미 있다**(`skill.js:64`) |
| **전직 층은 코드가 없다** | `hero.advance` 필드 없음 · 전직 칸은 영웅에게 늘 비어 있다(`skill.activesFor` · INTERFACE §2-8 · R16/R52) |
| **적의 자리** | 적은 라운드당 **최대 3**(`balance.csv:wave_monster_max = 3`)이고 자리는 전열/후열(`rank` 0/1)과 배열 순서뿐이다. 기획(skill_design §10-1)은 「**6자리**」 · 「전열 **가운데**」를 전제한다 — **기획 정의가 없다**(§8) |
| **테스트가 행 수를 잡고 있다** | `test.js` 의 단정 `csv: skill — 직업 풀 37행 …`(≈134행) — `job` 37행 · 직업별 개수 · 「job 아니면 monster(`innate_pool=0`)」. `createSkillSystem({rows, tagRows, attributes})` 호출이 test.js 에 **13곳**(2368 · 2375 · 2393 · 2401 · 2416 · 3183 · 5438 · 5448 · 5486 · 5521 · 5679 · 5702) |
| **세이브** | 세이브에는 스킬 **id** 만 들어간다고 보인다(영웅 `innate` · 무기 개체의 스킬 id). **1단계 착수 전에 확인할 것** — 스킬 정의 필드가 세이브에 들어가면 이 계획의 「세이브 무변동」 전제가 깨진다 |

---

## 2. 결정

### 2-1. 사용자 확정

| # | 결정 | 근거 |
|---|---|---|
| **D1** | 전직 스킬 행은 `owner_kind = advance` | 어느 뽑기에도 안 섞인다. 지금은 게임에 등장하지 않고, 넣기 위한 코드를 구성하는 중이다(사용자) |
| **S1** | `skill.csv` 를 둘로 나눈다 — 스킬(스킬마다 하나뿐인 것) + 하는 일(한 줄에 하나) | 한 스킬이 여러 일을 한다(사자후 = 때린다 + 적 공속↓ + 아군 공속↑). 전직 노드가 「줄 추가 / 값 바꾸기」로 들어간다. 합쳐서 칸을 3벌 붙이는 안은 60~80칸 · 대부분 빈칸 · 네 번째 일에서 다시 칸 추가라 버렸다 |
| **S1-a** | `kind` 를 둘로 가른다 — **「나가는 방식」**(`cast`) = skill.csv / **「하는 일」**(`effect`) = 하는 일 파일 | 한 칸에 뜻 둘이 섞여 있었다. ⚠ 뜻이 바뀌는 변경이라 사용자 승인을 받았다 |
| **S2** | 버프 · 상태이상 · 설치물을 **「걸린 효과」 한 표**로 (단순 버프 포함 전부) | 경계가 흐린 것이 이미 많다(슬로우 = 공속 창 = 상태이상 · 블리자드 구름 = 설치물 + 디버프 · 라그나로크 = 버프 + 액티브 봉인). 같은 효과를 여러 스킬이 쓴다(사자후 ② = 일갈 ④ · 화상 = 파이어 메이지 셋). 대가: 버프 하나를 보려면 파일 셋. **되돌리기 쉽다** — 단순 버프를 하는 일 줄로 되돌리는 건 데이터 이동뿐이고 전투 부품은 같다(사용자 질문에 답함) |
| **근거 정정** | 마스터리는 나누는 이유가 **아니다** | 마스터리(죄종 · 직업)는 영웅에 붙는 패시브이고 이미 따로 있다(`mastery_node.csv`). 스킬 id 에 직접 붙는 것은 **전직 트리 노드뿐**이다. 「영웅마다 찍은 노드」는 세이브에 살고, CSV 에는 노드의 **정의**만 산다 |

### 2-2. 위임받아 정한 것 (사용자: 「확장성 기준으로 알아서」)

| # | 결정 | 왜 이게 확장성에 맞나 |
|---|---|---|
| **S3** | **스킬 대상은 skill.csv 에 하나**(한 번만 고른다 · rng 소비 그대로) + **하는 일 줄마다 `target` 칸**(`-` = 스킬이 고른 대상 그대로 · 필요할 때만 `self` · `party` 등). **2단계에서 들어온다**(첫 사용자 = 결투) | 메테오 「때린다 + 화상」이 **같은 적**에게 간다(줄마다 따로 고르면 다른 적에게 갈 수 있다). 결투 · 사자후 ③ · 동귀어진(나의 HP)처럼 줄마다 대상이 다른 스킬을 전용 코드 없이 적는다 |
| **S3-a** | **대상 이름 하나에 뜻 하나** — 버프 쪽 `enemy_single`(HP 최대)을 **`enemy_hp_max`** 로 떼어 낸다(kni_duel 한 행 · 동작 동일). 2단계 | 대상 선택이 하는 일의 종류(`effect`)를 몰라도 되어야 여러 줄이 한 대상을 나눠 쓴다. 토르의 분노(체력이 가장 많은 적)가 같은 기준을 쓴다 |
| **S3-b** | 대상 표는 지금처럼 **「누구 + 타수를 어떻게 나누나」**를 같이 든다(순환 · 연쇄 · 광역 약화 · 최고 방어) | 모양이 대상에 붙어 있는 것이 이미 검증된 짜임이다. 여기를 가르면 1단계가 동작 불변을 못 지킨다 |
| **S5** | **능력치 계수 칸(`scale1~3_*`)은 하는 일 줄에 붙는다** — 줄마다 자기 값을 민다. 「건다」 줄의 `effect_value` · `duration_sec` 슬롯은 **그 줄이 거는 걸린 효과의 값 · 시간**을 민다 | 한 스킬의 여러 줄이 각자 다른 능력치를 탈 수 있다. 기존 스킬은 줄이 하나라 슬롯이 그대로 옮겨간다(수식 불변) |
| **S2-a** | **걸린 효과 행이 숫자(값 · 시간)를 든다**(S2 에서 보여 준 모양 그대로). 같은 효과를 다른 세기로 쓰면 행을 나눈다. 같은 효과를 여러 스킬이 걸면 **거는 스킬마다 따로 선다**(창의 열쇠 = 거는 스킬 id) | 지금 규칙 「같은 스킬 재시전 = 시간 갱신 · 다른 스킬의 같은 능력치 = 덧셈」을 그대로 잇는다(골든 불변). 「어느 스킬이 걸든 하나로 갱신」이 필요한 효과가 오면 걸린 효과에 겹침 규칙 칸을 더한다(3단계) |
| **S2-b** | **걸린 효과가 때가 되면 스킬을 실행한다** — 틱마다 · 가득 차면 · 끝날 때 = 「스킬 id 하나 실행」. **3단계** | 화상 틱 · 불벽 · 구름 · 히드라 · 썬더 스트라이크 ③ 자동 시전 · 냉기 스택 폭발 · 목걸이 「n초마다 발동」이 **전부 같은 한 모양**이다. 실행되는 스킬은 하는 일 줄 · 계수 · 대상 · 설명창을 전부 재사용한다. 표 둘이 서로를 부르므로 **로드 때 순환 검사** |
| **S6** | **노드 칸은 지금 안 만든다** | 노드 시스템(포인트 · 찍은 기록 · 트리 화면)이 기획 · 코드 둘 다 없다. 지금 칸을 만들면 아무도 안 읽는 칸이다(데이터 규칙 — 읽히지 않는 칸을 두지 않는다). 나눈 구조가 자리를 보장한다: 노드 = ① **하는 일 줄 추가** ② **스킬 · 하는 일 · 걸린 효과의 칸 값 바꾸기**. 나중에 `skill_node.csv` 를 붙여도 기존 줄이 안 깨지고, 덧씌우는 자리는 `skill.resolve` 다 |
| **S6-a** | 「언제」 칸(맞혔을 때 · 처치했을 때)도 **쓰는 날 추가** | 지금 스킬은 전부 「시전할 때」다. 칸은 뒤에 붙여도 기존 줄이 안 깨진다. 첫 사용자는 반응형 노드(동귀어진 ③ 처치 시 회수 · 토르의 분노 ③) |
| **S7** | 1단계는 **동작 불변 리팩터** — 골든 지문(시드 10 × 스테이지 5 = 50런 · 시작 파티 · 스폰)이 한 글자도 안 바뀌어야 한다 | 37개를 옮기는 동안 무엇이 틀렸는지 가르는 유일한 그물이다 |

---

## 3. 데이터 모양

**원칙:** 칸은 쓰는 단계에서 추가한다. 아래 표의 「단계」 열이 그 칸이 처음 생기는 단계다.

### 3-1. `skill.csv` — 스킬마다 하나뿐인 것 (줄어든 표)

| 칸 | 단계 | 뜻 | 지금 칸에서 |
|---|---|---|---|
| `skill_id` · `owner_kind` · `owner_id` · `name_kr` · `name_en` | 1 | 그대로 | 그대로 |
| **`cast`** | 1 | 나가는 방식 — `turn` 차례에 씀 / `aura` 상시(행동 안 먹음) / `event` 사건이 부름(`cast_condition` 이 사건 이름) | `kind` 에서: attack · heal · buff · summon · call → `turn` · aura → `aura` · indirect → `event` |
| `target` | 1 | 스킬 대상 | 그대로 (2단계에 `enemy_hp_max` 분리) |
| `cool_sec` · `cast_condition` · `cond_value` · `tags` · `priority` · `icon` · `desc_kr` · `desc_en` · `innate_pool` · `amulet_pool` · `note` | 1 | 그대로 | 그대로 |

빠지는 칸: `kind` · `hits` · `mult_pct` · `decay_pct` · `proc_chance_pct` · `proc_mult_pct` · `duration_sec` · `element` · `effect_stat` · `effect_value` · `status` · `scale1~3_*`.
⚠ `status`(결빙 등 — 아무도 안 읽는 칸)는 **버린다**. 결빙은 3~4단계에서 걸린 효과 행으로 다시 들어온다. 버리는 값은 `mag_iceblast` · `mag_frostnova` 의 `freeze` 둘이다 — 각 행 `note` 에 「결빙 = 걸린 효과(4단계)」를 남긴다.

### 3-2. `skill_effect.csv` — 스킬이 하는 일 (새 표)

| 칸 | 단계 | 뜻 |
|---|---|---|
| `skill_id` | 1 | skill.csv 의 id |
| `seq` | 1 | 순서(1부터) — 이 순서로 실행된다 |
| `effect` | 1 | 하는 일 — `hit` 때린다 · `heal` 회복 · `apply` 건다 · `summon` 소환 · `call` 불러내기 · `fixed` 고정 피해(자폭) |
| `target` | **2** | `-` = 스킬 대상 · 그 밖은 대상 어휘 |
| `hits` · `mult_pct` · `decay_pct` · `proc_chance_pct` · `proc_mult_pct` · `element` | 1 | 지금 칸 그대로 (`hit` · `heal` · `summon` · `fixed` 가 쓰는 것만 채움) |
| `status` | 1 | `apply` 가 거는 걸린 효과 id (다른 하는 일은 `-`) |
| `scale1~3_field/attr/coef` | 1 | 능력치 계수 — 이 줄의 값을 민다. `apply` 줄의 `effect_value` · `duration_sec` 은 거는 걸린 효과의 값 · 시간 |
| `note` | 1 | 설계 메모 |

2단계 이후 후보(쓰는 날 추가): `proc_repeat`(추가 피해가 터지면 다시 · 최대 n — 썬더 스트라이크 · 3단계) · 하는 일 `dot`(비직격 원소 피해 — 화상 틱 · 불벽 · 구름 · 4단계 · §8-2) · 「언제」(반응형 노드).

### 3-3. `skill_status.csv` — 걸린 효과 (새 표)

| 칸 | 단계 | 뜻 |
|---|---|---|
| `status_id` | 1 | 1단계는 기존 스킬마다 하나라 **스킬 id 와 같게** 둔다(`mag_focus`). 여러 스킬이 같이 쓰는 효과(화상 등)부터 자기 이름 |
| `stat` | 1 | 능력치 창 어휘 — `skill_effects.js:EFFECTS` 의 키(atk_pct · period_pct · barrier_pct · guard_pct · def_pct · res_elem · hp_max_pct · regen_pct · dr_pct · onhit_element · attack_splash · duel · taunt) |
| `value` | 1 | 지금 `effect_value` |
| `duration_sec` | 1 | 지금 `duration_sec` — **0 = 상시**(오오라가 거는 것) |
| `element` | 1 | 지금 `element`(인챈트 · 독화살의 원소 추가타가 쓴다) |
| `note` | 1 | 설계 메모 |
| `round_end` | **2** | `keep` 라운드를 넘어 유지 / `close` 라운드가 끝나면 닫힘 — 결투의 창이 첫 사용자(지금 `beginRound` 의 결투 전용 닫기를 대체) |
| `name_kr` · `name_en` | **3** | 여러 스킬이 거는 효과(화상)의 칩 이름 |
| `attach` · `tick_sec` · `tick_skill` · `max_stack` · `on_full_skill` · `on_end_skill` · `flags`(stun · seal_actives …) · 겹침 규칙 | **3** | S2-b · 스택 · 표식. **자리(`attach = slot`)는 4단계**(§8 자리 모델) |

### 3-4. 옮기기 예시 (지금 → 1단계)

```
지금 skill.csv (발췌)
mag_fireball,job,mage,파이어볼,Fireball,attack,enemy_single,1,3.1,0,0,0,15,0,fire,-,0,-,0,-,-,1,🔥,…,1,1,mult_pct,int,0,…
mag_focus,job,mage,포커스,Focus,buff,self,0,0,0,0,0,16,8,-,atk_pct,0.2,buff_absent,0,-,boost,7,🔮,…,1,1,effect_value,int,0,duration_sec,vit,0,…
kni_might,job,knight,마이트,Might,aura,party,0,0,0,0,0,0,0,-,atk_pct,0.15,-,0,-,aura,6,⚔,…,1,0,effect_value,ldr,0,…
mon_selfdestruct,monster,-,자폭,Self-Destruct,indirect,enemy_all,1,0.3,0,0,0,0,0,-,-,0,on_death,0,-,sacrifice,2,☠,…,0,0,…
```

| skill.csv (새) | skill_id | cast | target | cool_sec | cast_condition |
|---|---|---|---|---|---|
| | mag_fireball | turn | enemy_single | 15 | - |
| | mag_focus | turn | self | 16 | buff_absent |
| | kni_might | aura | party | 0 | - |
| | mon_selfdestruct | event | enemy_all | 0 | on_death |

| skill_effect.csv | skill_id | seq | effect | hits | mult_pct | element | status | scale1 | scale2 |
|---|---|---|---|---|---|---|---|---|---|
| | mag_fireball | 1 | hit | 1 | 3.1 | fire | - | mult_pct · int · 0 | - |
| | mag_focus | 1 | apply | 0 | 0 | - | mag_focus | effect_value · int · 0 | duration_sec · vit · 0 |
| | kni_might | 1 | apply | 0 | 0 | - | kni_might | effect_value · ldr · 0 | - |
| | mon_selfdestruct | 1 | fixed | 1 | 0.3 | - | - | - | - |

| skill_status.csv | status_id | stat | value | duration_sec | element |
|---|---|---|---|---|---|
| | mag_focus | atk_pct | 0.2 | 8 | - |
| | kni_might | atk_pct | 0.15 | 0 | - |

- 1단계 행 수: skill.csv **39**(직업 37 + 몬스터 2 — 행 수 불변) · skill_effect.csv **39**(스킬마다 정확히 1) · skill_status.csv **16**(버프 13 + 오오라 3)
- **변환은 파이썬 스크립트로 기계적으로** 하고, 옮긴 값을 원본과 칸마다 대조한 결과를 보고에 남긴다. CSV 는 CRLF · BOM 여부를 원본과 같게(memory: git-autocrlf · headless-verify-cache-and-bom). 셀 안의 `\n` 은 백슬래시 축약에 주의(memory: backslash-collapses)

### 3-5. 정의 객체 모양 (skill.js 가 내는 것)

```js
defs[id] = {
  id, ownerKind, ownerId, cast, target, cool, cond, condValue, tags, derived, priority,
  name: {ko, en}, icon, desc: {ko, en}, innatePool, amuletPool, note,
  effects: [ { seq, effect, hits, mult, decay, procChance, procMult, element, status, scales } ],
}
statuses[statusId] = { id, stat, value, dur, element, note }
```

- `scaleDef(def, stats)` → `effects[]` 를 줄마다 민 복사본. `apply` 줄은 거는 걸린 효과를 풀어 **실효 `stat` · `value` · `dur` · `element`** 를 그 줄에 싣는다(계수 · 부호 규칙은 지금 `scaleDef` 그대로)
- `previewOf(def, ctx)` → 1단계는 **지금과 같은 모양**을 `effects[0]` 에서 낸다. 2단계에 줄마다(`rows: [...]`)로 넓힌다
- 새 export: `statuses` (설명창이 걸린 효과 값을 읽는다)

---

## 4. 단계

### 1단계 — 옮기기 (동작 불변 · 화면 불변)

**제약:** 스킬마다 하는 일 줄은 **정확히 1개**다 — 로더가 검사해 2개 이상이면 던진다(2단계가 푼다). 그래서 이 단계의 「첫 줄만 읽는 곳」은 누락이 아니라 계약이다. 새 대상 · 새 하는 일 · 새 걸린 효과 칸은 **만들지 않는다**.

| # | 파일 | 할 일 |
|---|---|---|
| 1-0 | — | **착수 전:** ① 세이브에 스킬 정의 필드가 들어가는지 확인(§1 마지막 줄) ② 다른 세션이 아래 파일을 고치고 있지 않은지 `git status` · mtime 확인 ③ **`src` 스냅샷을 스크래치에 복사**(§5 검증의 기준 벌) |
| 1-1 | `docs/client/INTERFACE.md` | **먼저.** §2-8(skill.js — 입력 표 셋 · 정의 모양 §3-5 · `statuses` · `previewOf` 는 1단계 동안 첫 줄) · §2-11(대상 표 · 하는 일 표 · `EFFECTS` 는 걸린 효과의 능력치 어휘) · §2-12(`act` 가 줄을 차례로 실행 · 창을 거는 함수는 걸린 효과 행 + 거는 스킬 id) · §2-6 에 「타임라인 이벤트 무변동」 한 줄 |
| 1-2 | `src/data/` | skill.csv 줄이기 · `skill_effect.csv` · `skill_status.csv` 생성(§3-4 · 스크립트 변환 + 대조). `src/data/README.md` 표에 두 줄 · skill.csv 줄 갱신 |
| 1-3 | `src/ui/data.js` | 로드 목록(92행)에 `skill_effect` · `skill_status` · `D.skillEffectRows` · `D.skillStatusRows` · `createSkillSystem`(420행)에 넘김. 풀 필터(429 · 451)는 skill.csv 칸만 읽으므로 그대로인지 확인. `skillInfo`(380)는 skill.csv 에 남는 칸만 읽어 무변동 |
| 1-4 | `src/game_logic/skill.js` | `normalize` · `validate` 를 표 셋으로. **검증은 지금 규칙을 (cast, effect) 조합으로 옮긴다** — 예: `apply` 줄의 걸린 효과는 `cast=aura` 면 `duration_sec = 0`, `turn` 이면 `> 0` · `summon`/`call` 은 대상 `self` · `call` 은 몬스터 전용 + `band_missing` · `fixed` 는 몬스터 전용 + `cast=event` + 조건 필수 · `hit` 은 대상 표에 있는 대상 · 감쇠는 연쇄 · 최고 방어 · 광역 `hit` 만 · 목걸이 후보 금지(`cast` aura/event · `effect` summon/call · 몬스터) · 파생 태그는 `hit` 줄 + 스킬 대상에서. **표 사이 검사:** 모든 스킬에 줄 1개 · 없는 스킬 id 를 가리키는 줄 금지 · 없는 걸린 효과 금지 · 아무도 안 거는 걸린 효과 금지. `slotFits`(effect 기준) · `scaleDef`(줄 단위) · `previewOf`(`AMOUNT_BASIS` 를 effect 기준으로 — hit → atk · heal → matk · summon → hpMax · fixed → atk 중앙값) |
| 1-5 | `src/game_logic/skill_effects.js` | `ATTACK_TARGETS` 그대로. `KINDS` → 하는 일 어휘(`EFFECT_TYPES` 등)와 나가는 방식 어휘(`CASTS`)로. 어휘와 실행이 같은 표에 사는 원칙 유지 |
| 1-6 | `src/game_logic/skill_runtime.js` | `act`: `scaleDef` 뒤 `effects` 를 차례로 실행 — 하는 일 표에서 핸들러를 찾는다(지금 if 사슬 대체). 기존 `castHeal` · `castBuff` · `castSummon` · `castCall` 은 **줄 + 스킬 필드를 받아 같은 계산**을 한다(rng 소비 · 이벤트 모양 · 순서 불변). `castBuff` 의 결투 분기는 **이 단계에서 그대로 둔다**(2단계에서 데이터로) |
| 1-7 | `src/game_logic/battle.js` | 192 소환사 검사 → 「고유 스킬이 `call` 줄을 가졌나」 · 541/545 오오라 → `cast === 'aura'`(창은 그 줄의 걸린 효과 · 값은 계수 민 값) · 774 자폭 → `cast === 'event' && cond === 'on_death'` · 배율은 `fixed` 줄. 이벤트 이름 `blast` · 모양 그대로 |
| 1-8 | `src/ui/tip.js` · `app.js` · `ui/battle.js` | `def.kind` · `def.mult` · `def.stat` · `def.value` · `def.dur` · `def.hits` · `def.element` 을 읽는 곳을 `def.cast` + `def.effects[0]` + `statuses[...]` 로. `skillLines`(736~) · `amountPhrase`(709) · `effectPhrase`(726). **화면은 한 글자도 안 바뀐다** → SCREEN_DESIGN 은 호출 줄만 갱신(`/ui` 절차) |
| 1-9 | `src/dev/test.js` | `createSkillSystem` 13곳에 새 표 둘을 넘긴다 · 행을 망가뜨려 던지는지 보는 단정은 **그 칸이 옮겨간 표**를 망가뜨리게 · 「직업 풀 37행」 단정(≈134행)은 skill.csv 기준 유지 + 「job 아니면 monster」에 `advance` 허용(4단계가 쓴다 — 지금 허용해 두면 단정이 거짓 약속을 안 한다) · **새 단정**: 줄 정확히 1개 · 표 사이 검사 넷(각각 망가뜨린 행으로 던지는지) · 기존 39스킬의 정의가 옮기기 전과 같은 수치인가(대표 몇 개 고정값) · 골든 CSV 해시 목록에 새 표 둘 |
| 1-10 | 문서 | `docs/client/DEV_PLAN.md` §3-3 새 R 행 한 줄 · §3-1 현황 · `src/game_logic/README.md`(파일 역할이 바뀌면) · `docs/game_design/skill_design.md` §13-1 이 「skill.csv 의 scale 칸」을 가리키면 `skill_effect.csv` 로(포인터만 — 기획 내용은 안 건드린다) · `grep -rn "skill.csv" docs` 로 칸을 가리키는 다른 포인터도 |
| 1-11 | 검증 | §5 전부 |

### 2단계 — 여러 줄 (결투 · 자폭을 데이터로)

| 할 일 | 첫 사용자 |
|---|---|
| 「스킬마다 줄 1개」 제약을 푼다 · 하는 일 줄에 `target` 칸(S3) · 스킬 대상은 **시전 순간 한 번** 고르고 `-` 줄이 나눠 쓴다(rng 소비 순서를 INTERFACE §5-2 에 적는다) | 결투 |
| `enemy_single`(버프 뜻) → `enemy_hp_max` 분리(S3-a) — kni_duel 한 행 | 결투 |
| 걸린 효과에 `round_end`(keep/close) — `beginRound` 의 결투 닫기를 일반 규칙으로. **닫는 자리 · 순서 불변**(소환물 걷기 → 파티 순 · 창 순으로 `buffEnd` → 스폰 굴림 앞) | 결투 |
| 결투 = 줄 둘(① `apply` 지목 · 스킬 대상 ② `apply` 받는 피해 감소 · `self`) — `castBuff` 의 결투 분기 제거. 지목 창의 `value`(0.2)는 `buff` 이벤트의 `v` 로 골든 지문에 들어 있으므로 **그대로 둔다**(정리하지 않는다 — 골든을 흔들 이유가 없다) | 결투 |
| 자폭 → 「event 스킬이 자기 줄을 실행」 일반 경로 — `battle.js:blast` 의 스킬 전용 코드를 줄인다(credit · downed 는 battle.js 가 주는 이음매로) | 자폭 |
| `previewOf` 가 줄마다(`rows`) · 설명창이 **줄마다 문장** — **SCREEN_DESIGN §2 「스킬 설명창 규격」 먼저**(`/ui`). 규칙: 줄 하나 = 문장 하나 · 문장 틀이 없는 줄은 건너뛴다 · `round_end = close` 인 창은 초 대신 「라운드가 끝날 때까지」로 말한다. **결투는 두 문장이 된다** — 「적 하나를 지목해 라운드가 끝날 때까지 자기만 노리게 한다」 + 「라운드가 끝날 때까지 받는 피해 −20%」. 지금의 한 문장(`sk.line.duel`)에서 피해 감소 구절을 빼고 둘째 줄이 제 문장을 낸다(각 줄이 자기를 설명한다 — 사자후 ② ③ 이 같은 규칙을 탄다) | 결투 · (3단계의 사자후) |
| 검증: 골든 불변(결투 · 자폭이 나오는 런 포함 — 안 나오면 단정으로 직접) | |

### 3단계 — 새 부품 (기획 결정 없이 되는 것)

| 할 일 | 첫 사용자 |
|---|---|
| 걸린 효과 — 틱마다 스킬 실행(`tick_sec` · `tick_skill`) · 끝날 때 실행 · 스택(`max_stack` · 가득 차면 실행) · 표식(`flags`: 스턴 = 완전 정지 · 액티브 봉인) · 겹침 규칙 · 칩 이름(`name_*`) · 로드 때 **순환 검사**(걸린 효과 → 스킬 → 걸린 효과) | 불벽 · 블리자드 · 히드라 · 프로스트 버스트 · 라그나로크 |
| 대상 — 「전열 무시 무작위」(= 살아 있는 적 전체 중 무작위 · 메테오 · 히드라의 「6자리 중 무작위」 — **자리 모델 없이 된다**) · 「한 줄」(전열, 비면 후열 — `rank` 로 된다 · 파이어월) · 「체력 최대」(토르의 분노 · S3-a 의 `enemy_hp_max`) | 메테오 · 파이어월 · 토르의 분노 |
| 때린다 — `proc_repeat`(추가 피해가 터지면 다시 · 최대 n) · `strikeOnce` 가 추가 피해 여부를 돌려준다 | 썬더 스트라이크 |
| 목걸이 「n초마다 발동」을 전투에 건다(지금 설명에만 있음 — `skill.procIntervalSec`) — S2-b 와 같은 부품 | 목걸이 |
| 동작 규칙은 **§8-2 가안**을 따른다. **값**(틱 간격 · 스택 n · 스턴 시간 · 보스 배수)은 CSV 키로 두고 `⚠값 임시` 표기(프로젝트 관례) | |

### 4단계 — 기획이 먼저 필요한 것 + 전직 스킬 행

| 할 일 | 막는 것 |
|---|---|
| **가안을 기획서에 먼저 적는다** — §8 의 가안 셋을 battle_design §3-1(적 자리) · skill_design §7 · GAME_DESIGN §10(상태이상) · hero_design 또는 skill_design §4(전직 목록)에 `/game-design` 절차로 옮기고 결정 로그에 한 줄(「가안 — 사용자 위임 09-22」). 기획 문서가 코드보다 먼저다 | — |
| 적 자리 모델 — 6칸 · 배치 규칙 · 「전열 가운데」(프로즌 오브) · 「맞은 자리에 남는 불」(메테오 ③) · 자리에 붙는 걸린 효과(`attach = slot` / `row`) · 적 표시값에 칸 번호 | §8-1 가안 · ⚠ 골든 재촬영(아래) |
| 상태이상 — 화상 · 결빙 · 스턴(보스 배수) · 슬로우를 걸린 효과 행으로 · `mag_iceblast` · `mag_frostnova` 의 결빙을 줄로 되살린다(3-1 에서 버린 값) | §8-2 가안 |
| 전직 목록 표 `class_advance.csv` | §8-3 가안 |
| 전직 마법사 8 · 전사 9 행 추가(`owner_kind = advance` · `owner_id` = 전직 id) · 정전장은 기획 미정이라 제외 · 아이콘 파일명(`icons/skills/mag_meteor.png` 등 임시 id)을 발행 id 에 맞춘다 · 기획서의 노드 칸 중 **보류**인 것(파이어월 ③④ 등)은 행에 안 넣는다 | 위 셋 + 2~3단계 |
| 도감이 CSV 를 읽게 — `mock.js:SKILL_ADV_ICON_FILES` · `i18n:ix.adv.*` · `ix.sk.*` 를 걷고 전직 묶음을 `skill.csv`(advance 행) + `class_advance.csv` 에서 세운다(SCREEN_DESIGN §9-1 · ADR-0299 의 「그림이 데이터보다 먼저」 단락을 갱신) · 설명창이 붙는다 | 전직 행 |
| `skill_design.md` §10 서두의 「SSOT: 아직 없음」 갱신 | 전직 행 |
| **골든 재촬영** — 적 표시값(`round` 이벤트의 `enemies`)에 칸 번호가 붙으면 타임라인 지문이 바뀐다. 조건: `src` 에 다른 세션의 미커밋 변경이 없을 것(`git status`). 찍기 전 · 후 `runs` 의 차이가 **칸 번호 필드뿐**인지 확인한 뒤 `golden=write` | 적 자리 |

---

## 5. 검증 (1단계 · 2단계 공통)

1. **단정** — `dev/test.html` 덤프. **착수 전 실패 목록과 끝난 뒤 실패 목록이 같아야** 한다(「새로 깬 것 없음」). 2026-09-22 14시 기준 작업 폴더는 **403 중 4 실패**(골든 3 — CSV · 밸런스 값이 스냅샷과 다름 / 툴팁 Alt 식 1) — 다른 세션 작업이라 이 계획과 무관하다
2. **골든 불변** — 기준 벌(1-0 에서 복사한 `src`)과 작업 벌을 각자 서버로 띄워 `dev/test.html?golden=write` 덤프 → `<pre id="golden">` JSON 을 키별로 비교. **`meta.parties` · `runs` 가 같고** 입력 메타(`csvHash` · `balance`)만 다르면 통과. 그 사이 다른 세션이 같은 파일을 고쳤으면 기준 벌이 무효다 — memory `golden-verify-head-copies` 의 HEAD 두 벌 방식으로 다시 잰다. **`golden.json` 은 다시 찍지 않는다**(다른 세션의 변경이 같이 굳는다)
3. **화면 불변** — 스킬 설명창 ko/en 을 착수 전 · 후로 찍어 비교: 파이어볼(단일) · 체인 라이트닝(연쇄 + 추가 피해) · 멀티샷류(광역 약화) · 가이디드 애로우 · 포커스(자기 버프) · 은총(파티 버프) · 참회(디버프) · 마이트(오오라) · 결투 · 도발 · 힐링 라이트 · 프로즌 월(소환) · 자폭 · 고블린 소환. 도감 스킬 탭 · 캐릭터 탭 스킬 창 · 관전 카드 툴팁
4. 서버 · 헤드리스는 CLAUDE.md 작업 규칙 그대로 — `8777` 금지 · `serve.py <세션 포트>` · PowerShell 로 Edge · 로그인 게이트는 memory `headless-blocked-by-login-gate`

---

## 6. 위험 · 주의

- **병렬 세션이 같은 파일을 고치는 중이다** — 2026-09-22 에만 `battle.js`(14:23) · `test.js`(14:31) · `INTERFACE.md`(14:31) · `state.js`(14:12) · `skill_effects.js`(13:16) · `skill.js` · `skill_runtime.js`(12:52) · `skill.csv`(12:52 · **미커밋**)가 바뀌었다. 1단계는 이 파일들을 넓게 고친다 → **다른 세션이 쉬는 틈에 · 정확한 문자열로만 패치 · 파일마다 고치기 직전에 다시 읽기**. **`skill.csv` 의 미커밋 변경은 입력으로 쓴다** — 착수 시점 작업 폴더의 `skill.csv` 가 최신이고 다른 세션의 변경도 의도된 내용이다. 변환이 스크립트라 도중에 `skill.csv` 가 또 바뀌면 스크립트를 다시 돌린다(그때 골든 기준 벌도 다시 뜬다)
- **rng 소비 순서가 계약이다**(INTERFACE §5-2) — 공격 대상 굴림은 타격 앞 · 회복량 굴림은 대상 앞(대상은 결정론). 줄을 실행하는 순서가 이 둘을 안 밀어야 한다. 2단계에서 스킬 대상을 「시전 순간 한 번」으로 앞당길 때 특히
- **`Object.keys(u.buffs)` 순서가 `buffEnd` 이벤트 순서다** — 창의 열쇠(거는 스킬 id)와 넣는 순서를 바꾸면 같은 틱에 닫히는 창의 이벤트 순서가 바뀌어 골든이 깨진다
- `test.js` 는 8,100줄이다 — 스킬 정의 필드를 직접 읽는 단정이 많다. 필드 이름을 바꾸면 `grep` 으로 전부 찾는다
- 1단계의 「첫 줄만 읽는 곳」은 **로더가 줄 1개를 강제하는 동안만** 안전하다 — 2단계에서 제약을 풀 때 그 자리들을 전부 줄 목록으로 바꾼다(grep `effects[0]`)

---

## 7. 하지 않는 것

- 노드 시스템(포인트 · 찍은 기록 · 트리 화면 · `skill_node.csv`) — 기획이 없다(S6)
- 전직 시스템(`hero.advance` · 전직 화면) — R16 · 별건
- 1단계에서 새 대상 · 새 하는 일 · 새 걸린 효과 칸 · 새 메커니즘
- 1~3단계에서 기획 문서의 규칙 · 수치 변경 — 포인터(「skill.csv 의 scale 칸」 같은 것)만 고친다. 기획 문서에 규칙을 적는 것은 **4단계 첫 줄**(§8 가안 옮기기)뿐이다
- `golden.json` 재촬영 — **1~3단계는 금지**(동작 불변이 검증 기준이다). 4단계의 적 칸 번호에서만 §4 의 조건으로

---

## 8. 가안 — 열린 질문을 위임받아 정한 것 [2026-09-22 · 사용자 「알아서 적고 진행해」]

기준: ① 기획서에 **이미 확정된 규칙**을 넘지 않는다 ② 새 규칙을 만들기 전에 있는 장치로 표현한다(CLAUDE.md 기획 원칙 3) ③ 전부 **데이터(CSV)로 바꿀 수 있는 모양**으로 둔다 — 사용자가 뒤집어도 코드는 안 바뀐다. 4단계 첫 줄에서 기획서로 옮긴다. **사용자가 바꾸면 그 값으로 간다.**

### 8-1. 적의 자리

| | 가안 | 근거 |
|---|---|---|
| 칸 수 | 적 진영 = **전열 3칸 + 후열 3칸 = 6칸** | skill_design §10-1 의 「6자리」 · 「전열 가운데」가 이 모양을 전제한다. 라운드당 몬스터 상한(`wave_monster_max = 3`)은 **칸 수와 별개**로 그대로 — 6칸 중 최대 3칸이 찬다 |
| 줄 | 몬스터 역할(`monster_role.csv:rank`)이 줄을 정한다 — 지금 전열/후열 규칙 그대로 | 진형 확정(2026-09-09 · battle_design §3-1)을 안 건드린다 |
| 줄 안의 칸 | 등장 순서대로 **가운데 → 왼쪽 → 오른쪽** — 한 마리면 가운데 | 「전열 가운데」가 한두 마리일 때도 뜻을 갖는다. rng 0(스폰 수열 불변) |
| 줄이 찰 때 | 다른 줄의 빈칸으로(같은 순서) — 지금 상한 3 에선 안 생긴다 | 상한이 오를 때의 잠금 |
| 칸 고정 | 라운드 안에서 칸은 안 바뀐다 — 쓰러져도 옆 적이 안 옮긴다 · 불러내기로 서는 적은 빈칸에 같은 순서 · 되살아난 무리는 제 칸 | 자리에 붙은 효과가 뜻을 가지려면 칸이 움직이지 않아야 한다 |
| 「가운데 적」 | 전열 가운데 칸의 생존자 → 없으면 전열 생존자를 칸 순서(가운데 → 왼 → 오)로 첫째 → 전열 전멸이면 후열 가운데 → 후열 칸 순서 첫째. rng 0 | skill_design §10-1 프로즌 오브의 문장 그대로에 동률 규칙만 더했다 |
| 자리에 붙는 효과 | 칸(`slot`) 또는 줄(`row`)에 붙고, **지속 시간이 남으면 라운드가 바뀌어도 그 칸 · 줄에 새로 선 적에게 걸린다** | 파이어월 「라운드가 끝나도 사라지지 않고 시간이 다 될 때까지 남는다」 · 블리자드 「파이어월과 같은 방식」 · 메테오 ③ 「같은 기계(자리에 붙는 효과)」(skill_design §10-1) |
| 파티 쪽 | 칸 번호를 안 만든다 — 지금 쓰는 스킬이 없다 | 첫 사용자와 같이 들어온다 |

### 8-2. 상태이상

| | 가안 | 근거 |
|---|---|---|
| 공통 | 전부 **걸린 효과 한 행**(S2) · **확정으로 걸린다**(확률 없음) · 같은 스킬이 다시 걸면 시간 갱신 · 다른 스킬이 걸면 따로 선다(S2-a) · 영웅 · 몬스터 **같은 규칙** | battle_design §8 「확정으로 걸린다」(GAME_DESIGN §10 「상태이상과 운」) · 「몬스터를 영웅과 같은 구조로」 |
| **화상** | 유닛에 붙는다 · **n초마다(키) 화염 피해** — 새 하는 일 `dot`: 비직격 원소 피해 · **화염 저항만 받는다**(방어 · 적중 · 치명 · 흡혈 · 반사 · 경직 없음 · rng 0) · 세기 = **거는 순간 시전자 데미지 × 배율**(걸 때 고정 — 시전자가 쓰러져도 남는다) · 걸려 있는 동안 **받는 회복 −x%**(키 — 새 창 어휘 하나: 유닛의 `recv`(체력 회복 +%)를 미는 창. 회복 · 재생 · 흡혈 · 물약이 이미 `recv` 를 읽으므로 새 경로가 없다) | 화염 원소 정의 「강력한 피해 + 치유 감소」(skill_design §10-1) · 히드라 ④ 화염 저항 감소가 화상에도 먹어야 갈래가 닫힌다 · rng 0 이라 도트가 수열을 안 늘린다(skill_design §7 의 걱정을 피한다) |
| **결빙** | **공속 감소 창**(`period_pct` 음수) — 슬로우와 같은 장치이고 이름만 냉기 쪽 | 새 규칙을 안 만든다(원칙 3). 행동을 완전히 멈추는 것은 스턴이 맡는다 — 결빙까지 정지면 프로스트 메이지 셋(② 전부 결빙)이 보스를 묶어 방치형 가독성이 무너진다 |
| **스턴** | **완전 정지**(행동 차례 + 스킬 쿨 — 09-16 확정) · **보스(stage_boss · chapter_boss)는 지속 시간 × 배수(키)** · 몬스터가 영웅에게 거는 것도 **구조는 같게** 두되 지금 거는 몬스터 스킬은 없다 | 정의는 skill_design §7 확정. 보스 면역이면 프로스트 버스트 ③(「1인 극딜 — 보스 전용」의 노드)이 죽는다. 몬스터 → 영웅 스턴을 **데이터로 넣는 날** 방치형 계약(「자리 비워도 안전」)을 다시 본다 |
| **슬로우** | = 결빙과 같은 장치(공속 감소 창) — 새 상태이상이 아니다 | skill_design §10-2 딸린 메모 「적 공격 속도 감소와 같은 장치로 정의하면 새 상태이상이 하나 준다」 · 속박(`pri_bind`)이 이미 이 장치다 |
| 안 정하는 것 | 원소 기준 재편(GAME_DESIGN §10 ⚠제안) · 털어내는 능력치 · 오만 정예 면역 · 매혹 재정의 | 이 계획이 막히지 않는다 — 기획 과제로 남긴다 |

### 8-3. 전직 목록

| | 가안 |
|---|---|
| 표 | 새 표 **`class_advance.csv`** — `advance_id` · `class_id` · `seq` · `name_kr` · `name_en` · `note`. `skill.csv` 의 advance 행은 `owner_id = advance_id` · 로더가 존재를 검사한다 |
| 행 | **전직 스킬을 넣는 직업만** 넣는다(첫 사용자와 같이) — 4단계엔 마법사 3 · 전사 3 |
| 이름 | 마법사 `fire_mage` 파이어 메이지 / Fire Mage · `frost_mage` 프로스트 메이지 / Frost Mage · `thunder_mage` 썬더 메이지 / Thunder Mage (skill_design §4-1 확정 — 영어 원본) · 전사 `berserker` 광전사 · `barbarian` 바바리안 · `vanguard` 선봉장 — **영어 원본(Berserker · Barbarian · Vanguard)은 가안**(기획서에 영어 이름이 없다 · `note` 에 「⚠ 영어 가안」) |
| 도감 | 전직 묶음의 머리 · 순서를 이 표가 든다(지금 `i18n:ix.adv.*` 를 대체) |
| 훈련장 탭 | 전직 작업 탭(ADR-0297 · 목업)이 나중에 이 표를 읽는다 — 이 계획은 화면을 안 만든다 |

---
*마지막 업데이트: 2026-09-22*
