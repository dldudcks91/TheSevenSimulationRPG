# 전직 트리 구현 계획 — advance_tree_draft.md 를 코드로

> 기획 근거: [docs/game_design/advance_tree_draft.md](docs/game_design/advance_tree_draft.md) (2026-11-13)
> 사용자 승인: 2026-11-13 「ㅇㅇ 모두 구현해 진행」 — 세이브 47 → 48 · 데이터 표 교체 · 전직 판 화면 · 전투 규칙 · 새 장치 전부
> 2026-11-13 사용자 「여기까지만 하고 PLAN 에 남겨줘」 — **중단 지점 = 3b 전사 · 3c 기사 표(CSV)만 바꾸고 엔진은 안 씀**
> DEV_PLAN R471(🔧 진행 중) · 세션 서버 포트 8863(에이전트용 — 사용자 8777 아님)

## 결정 목록 (구현자가 정한 것 — 보고 때 알린다)

| # | 결정 |
|---|---|
| D1 | `hero.advanceUp` = 스킬 줄 **크기** 랭크(Lv = 1 + up) · 새 `hero.advanceVar = [변형1, 변형2]` · `hero.advanceCommon = [칸1, 칸2, 칸3]` (0 이면 키 없음) |
| D2 | 전직 스킬 학습 = 전직 포인트(무료) — 되돌리면 크기 · 변형만 환급 · 공통 줄은 갈래 몫이라 그대로 |
| D3 | v47 → v48: v45~47 배운 영웅에게 배움 1포인트 환급(크기 = 옛 advanceUp → 세기 같음) · 퇴역 스킬은 같은 자리 새 스킬로 |
| D4 | 줄마다 합 ≤ `advance_row_points`(5) · 칸마다 ≤ 5 · 공통 줄 5랭크 = `advance_common.csv:rank5` · 스킬 줄 5랭크 = 덤 |
| D5 | `advance_skill_level_interval` 퇴역 |
| D6 | 공통 줄 = `advance_common.csv` → 마스터리 채널(`hero.masteryBonus`) · 새 능력치 18개는 `combat.advance_fx` → `u.adv` |
| D7 | `advance_node.csv` 새 모양(skill_id · slot size/var1/var2 · fx · per_rank · arg · unit · 설명 · bonus_fx · bonus_v · 덤 설명) |
| D8 | 퇴역 → 새: firewall→mag_ember · frostburst→mag_frostarmor · staticfield→mag_thundergod · unyieldingoath→kni_cleansing · holywar→kni_offenseaura · vow→kni_elemconvert · showdown→kni_fallingstrike · aegis→pri_endure · benediction→pri_purify |
| D9 | 크루세이더 (1)(2) = 응징 · 단죄 id 그대로(⚠가칭) |
| D10 | `auto` 나가는 방식 = 전투 시작 + 쿨마다 · 차례 안 먹음 (battle `autoTick` — 있음) |
| D11 | 신성한 심판 크기 덤 「반사가 보호막에 안 막힘」→ **「되돌린 피해의 일부 회복」(`judg_heal`)** — 반사는 원래 비직격이라 보호막을 안 거친다(덤이 하는 일이 없었다) · 기획서 초안 §5 반영(11-14) |
| D12 | 버서크 HP 지불 = 창 동안 **맞힌 직격마다**(평타 포함) 지금 HP × [balance.csv:berserk_hp_cost_pct] · 쓰러지지 않는다(1 남김) · 덤 「되돌려 받기」 = 창이 닫힐 때 쓴 HP × 값 |
| D13 | 헌신 — 몫은 **상대 편 직격**만 · 가디언은 배리어를 거쳐 받는다 · 변형 1 = 쿨 중에도 다른 아군 HP 비율 < 값이면 **라운드에 한 번** 저절로 · 변형 2 값 = 창 동안 가디언이 받는 피해 감소(「버틸 때 감소」) + HP 1 바닥 |
| D14 | 꺾을 수 없는 의지 — 겹 × 값 = 받는 피해 감소 원천 하나(상한 0.9) · 변형 1 = 창이 닫히면 값(초)마다 겹 하나씩 빠짐(덤 = 간격 두 배) · 변형 2 = 가득 차면 다른 아군에게 겹 × 값 × 변형 값의 받는 피해 감소(그 창 끝까지 · 덤 = 남은 시간 두 배) |
| D15 | 신성한 심판 — 변형 1 = 되돌릴 양 × (1 + 값)을 적 전원에게 나눈다(덤 = 나누지 않고 전원 같은 양) · 변형 2 = 창이 닫힐 때 되돌린 합 × 값을 적 전원(비직격) · 덤 = 합이 최대 HP × 값을 넘으면 그때 |
| D16 | 원소 전환 — 몫은 `formula.strike` 안에서 따로 깎는다(방어 없음 · 그 원소 저항 · 관통) · 변형 2 = 파티 화염 관통(전환 몫 + 화염 타격) · 덤 「방어가 높을수록」 = 몫 += 대상 방어 × 값 · 크기 덤 = 마법 무기 아군 직격 × 값의 화염 비직격 |
| D17 | 크루세이더 (1) 변형 1 = 번개 몫 터짐 확률 = 값 · 배수 = 인자 · 덤 = 터지면 같은 줄 옆 적에게 피해 × 몫 × 값(비직격) · 변형 2 = 처치마다 그 시전의 창 + 값(초) · 합 ≤ 인자 · 덤 = 처치마다 공속 겹 |
| D18 | 단죄 — 기본 직격 뒤 대상이 잃은 체력 × [balance.csv:condemn_missing_pct] 고정 몫(비직격) · 변형 1 = 넘친 몫 × 값(≤ 1)을 다음 적(전열 첫) · 변형 2 = 대상 = 체력 비율 최저(전열 · 덤 = 후열까지) + 데미지 % 값 |
| D19 | 일격 변형 2 = 이 라운드에 쓰러진 적 수 × 값 · 퀵 드로우 변형 1 값 = 흩어진 평타 데미지 % · 오버드로우 변형 1 값 = HP 최다(전열) 대상 데미지 % · 체인 드로우 변형 2 덤 = 연쇄 평타는 나머지도 1배 |
| D20 | 사냥 표식 · 속죄 옮기기 = 다음 HP 최다(전열 먼저) · 값 += 변형 값 · 덤 = 시간 새로 · 변형 2 = 나머지 적에게 변형 값(덤 두 배) · 속죄 회복 = 살아 있는 아군에게 나눠(덤 = 가장 다친 아군) |
| D21 | 덫 — 자리 = 적 배열의 칸 · 행동하려 할 때(`rt.act` 앞) · 변형 1 값 = 덫 피해 % + 전열 모든 자리(덤 = 전원) · 변형 2 = 스턴(값 초) · 덤 = 옆 칸에 덫 하나 |
| D22 | 천벌 = 하나마다 [balance.csv:pun_per] · 같은 상태이상 창 여럿은 하나 · 상한 [balance.csv:pun_cap] + 덤 · 변형 2 = 지우고(다음 틱 닫힘) 하나마다 (pun_per + 값) × 덤 · 상한 없음 |
| D23 | 파문 — 대상 = 전열에서 버프 최다 · 버프 = 끝없는 창 · 상태이상 · 상대 편 창 · 조용한 창 뺀 것 · 하나마다 [balance.csv:exc_per] · 변형 1 값 = 전원일 때 배율(덤 = 1) · 변형 2 = 창 동안 버프를 못 받는다(덤 = 걸려 하면 그 시전자 피해) · 크기 덤 = 벗긴 창을 시전자에게 |
| D24 | 리저렉션 — 런당 [balance.csv:resurrection_per_run] · 대상 = 쓰러진 첫 아군 · HP = 최대 × 배율(크기) · 변형 2 = 전원 × min(1, 값) · 쿨은 지금부터 한 바퀴(변형 1 = 전부 준비) · `rise` 사건 · 결과 `downed` 에서 뺀다 |
| D25 | 몽크 반격 — 창 값 배율 **물리** 직격 · 변형 1 = 전열 아군이 맞아도(배율 × 값 · 덤 = 후열도) · 변형 2 = 때린 적의 줄(배율 × 값 · 덤 = 적 전원) · 반격은 반격을 안 부른다 |
| D26 | **소탕 = 물리**(기획 §7 「몽크 2 = 물리」대로 · 배율은 고정 피해로 바꾸기 전 값 · 11-14 「모두진행해」) · 천벌 · 파문 = 사제 직격 고정 피해 · K3 「오오라는 하나」 — 전직 오오라도 칸 순서 첫 오오라 규칙 그대로(앞 칸에 기본 오오라가 있으면 안 켜진다 · 그대로 둔다) |

## 단계

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 구조 — 세이브 v48 · 두 표 · state 찍기/되돌리기 · 공통 줄 능력치 · 변형 랭크 · 전직 판 화면 · INTERFACE · SCREEN_DESIGN(ADR-1081) · 단정 | ✅ |
| 2 | 전투 규칙 — 결빙 가장 센 하나 · 냉기 = 결빙 · 스턴 한 시전 한 번 · 화상 = 받는 회복 감소만 · 이그나이트 둘째 줄 · 공통 줄 새 키 18 | ✅ (test 866/867 — 골든만) |
| 3a | 마법사 9 — 엔진 · 표 다 넣음 | ✅ 11-14 |
| 3b | 전사 9 | ✅ 11-14 |
| 3c | 기사 9 | ✅ 11-14 |
| 3d | 궁수 9 — 표(정조준 둘째 줄 · 재장전 늘 켜짐 · 체인 드로우 · 사냥 표식 · 지원 사격 · 덫) · 엔진 | ✅ 11-14 |
| 3e | 사제 9 — 표(리저렉션 `revive` · 속죄 · 파문 · 금강 둘째 줄 · 소탕 · 반격) · 엔진 | ✅ 11-14 |
| 4 | 수치 — 결투 하네스 세 바퀴 · 골든 재촬영 · DEV_PLAN R471 ✅ · 기획서 반영 | 🔧 단정 · 화면(`rise` · `cd` · `cdPush` · 창 뱃지 문장) · INTERFACE · SCREEN_DESIGN · 기획서 반영 · 수치 세 바퀴 ✅(11-14) — **골든 · 값으로 못 맞추는 칸 결정 남음** |

## 지금 상태 (2026-11-14 — 다음 세션이 먼저 볼 것)

- **엔진 · 표 45 스킬 다 섰다** — test.html **870/871**(골든만 — 다른 세션의 CSV 변경과 섞여 커밋 때 재촬영) · 단정 신설 「3b ~ 3e 장치가 판에 흔적을 남긴다」(헌신을 끄면 빨강 — 깨뜨려 봄 확인)
- 칸 135개(45 × 크기 · 변형 1 · 변형 2) 중 **125개가 같은 시드 판을 바꾼다**(스크래치 탐침 · 3시드). 안 바꾼 10개는 그 판에 조건이 없었다 — 의지 변형 1 · 2(기사가 안 맞음) · 심판 변형 2 · 불씨 변형 1 · 2 · 정조준 변형 2(스나이프 없음) · 재장전 변형 1 · 버티기 변형 2 · 리저렉션 변형 2(쓰러진 아군 하나) · 금강 변형 1(상태이상 없음)
- 11-14 「모두진행해」 — 소탕 = 물리(D26) · 기획서 반영(battle_design §2-4 ~ §2-7 · skill_design §4 · §10 머리 · §12-6 · advance_tree_draft D11 · GAME_DESIGN §9) · 관전 창 뱃지 문장 · 값 결투 측정 세 바퀴(공통 줄 · 변형 — [output/2026-11-14_t4_advance_balance](output/2026-11-14_t4_advance_balance/README.md)) · 새 스킬 아홉 그림 들어옴(다른 세션)
- 남은 것 — ① 골든 재촬영(커밋 때) ② **값으로 못 맞추는 칸**(휠윈드 변형 1 정수 · 헌신 변형 2 안 쓰러짐 · 리저렉션 변형 1 · 금강 변형 2 · 조건이 결투에 없는 칸 — 측정 기록 「값으로 못 맞추는 칸」) ③ **크기가 너무 센 스킬**(썬더 스트라이크 · 노바 · 심판 · 프로즌 오브 · 토르 — 레벨 걸음을 줄일지) ④ D12 ~ D26 해석 확인

## 엔진 구조 (3a 에서 섰다 — 3b ~ 3e 는 여기에 붙인다)

- `skill.js` — `tails` · `commons` · `commonValue` · `resolve` 가 `def.tf`(장치 → 값) · `def.ta`(장치 → 인자)를 얹는다 · 원소 의사 태그 `elTags`
- `battle.js` 「전직 트리 장치」 블록(strikeOnce 바로 위): `advOf/tfOf/taOf` · `advHit`(장치 직격) · `advBefore`(타격 직전 데미지 % · 반드시 터짐) · `advAfterHit`(맞힌 뒤) · `emberStack` · `advDot/advDotTick`(장치 지속 피해) · `advAfterCast` · `advShield/advShieldTake`(원소 보호막) · `advTick`(틱마다 — 자동 시전 · 히드라 · 블리자드 · 썬더 스트라이크) · `autoTick` · `advRoundStart` · `lastStrike`
- `skill_runtime.js` — `cast` 끝 `ctx.advAfterCast` · `spend`(쌓인 칸 전부 · `u.advCast` 벼락 장부) · `applyStatus` 의 `elem_shield` → `ctx.advShield` · 스턴 장부 · 결빙 세기 · `castCleanse` · `overheal` · `castTargets`
- `formula.strike` — `a.fixedShare`(고정 피해 몫) 있음 · **전환 몫(`convShare` · `convEl` · `convAmp`)은 아직 없음**

## 남은 일 — 스킬마다 (fx 이름 = advance_node.csv)

### 3b 전사
- **라그나로크** — 표 끝(atk_pct + period_pct + transform 0). 엔진: `rag_cleave`(창 동안 평타 같은 줄 튐 · 덤 전원 — `basicAttack` 끝에 `ctx.advAfterBasic` 훅 새로) · `rag_debuff_cut` / `rag_immune`(받는 상태이상 · 상대 창 — `applyStatus` 에 `ctx.advStatusGate` 훅 새로) · `rag_afterglow`(창 끝 뒤 공속 절반 `advance_after_sec`)
- **버서크(auto)** — 표 끝(`berserk` 값 = 다른 액티브 데미지 %). 엔진: 스킬 타격 condPct += v(+ `berserk_low` × 잃은 HP 비율) · 직격마다 HP 지불 `berserk_hp_cost_pct` × (1 − `berserk_cost_cut` · `berserk_free` 면 0) · `berserk_reset`(HP 문턱 아래로 처음 → 다른 액티브 쿨 초기화) · `berserk_refund`(창 끝 쓴 HP 일부 회복)
- **동귀어진** — 표 끝(hp_cost 0.3). 엔진: `ruin_double`/`ruin_triple`(advAfterCast 추가 타격) · `ruin_stun` · `ruin_stun_row` · `ruin_overflow`(처치 넘친 몫 → 다음 적). ⚠ `advAfterCast` 를 `struck = outer` **앞**으로 옮겨야 스턴 장부가 덧타격까지 덮는다
- **휠윈드** — `hits_add`(skill.js resolve 변환) · `ww_shred`(방어 깎기 겹 · 덤 라운드 끝까지) · `ww_steady`(stagger · 스턴 시간 감소) · `ww_two`(방마다 대상 둘)
- **토르의 분노** — resolve 변환: `thor_splash`(decay −v) · `thor_stun_long`(onHit 시간 lvAdd) · `thor_quick`(chargeSec ×) · `thor_stun_equal`(줄에 `stunFull` → `enemy_hp_max_splash` 가 splashStunMult 무시) · `thor_overflow`
- **쇼크웨이브** — `shock_break_long`(둘째 줄 시간 lvAdd) · `shock_pulled_vuln`(새 표식 `phys_taken_pct` — strikeOnce 물리면 dr 에 원천) · `shock_pulled_stagger` · `shock_twice` · `shock_end_hit`(붕괴 끝 시각 예약)
- **강신** — `descent_regen_low` · `descent_regen_front` · `descent_steady` / `descent_unstaggerable`(stagger) · `descent_shield`(expire 에서 최대 HP 창이 닫혀 잘린 HP → 배리어 — `ctx.advHpCut` 훅 새로)
- **호령** — 표 끝(레벨 = 증가량). 엔진: 시전 뒤 아군 창 `crit_pct` · `crit_dmg_pct` · `lifesteal_pct` · `period_pct`(cmd_haste) · `ls_shield` — 새 표식 넷을 strikeOnce 가 읽게
- **사자후** — 표 끝(레벨 = 감소량). 엔진: `roar_stagger`(stagger 에 시간 인자) / `roar_stun` · `roar_buff_cut`(새 표식 `buff_cut` — 그 적이 제 편에 거는 창 시간 ×) · `roar_linger`

### 3c 기사
- **헌신(auto)** — 표 끝. 엔진: strikeOnce 피해 적용 직전 같은 편 가디언이 `devotion` 몫을 대신(× (1 − devotion_dr)) · `devotion_more` · `devotion_lowest` · `devotion_auto`(autoTick 조건 = 아군 HP < v) · `devotion_undying`(창 동안 HP 1 바닥 · 버틸 때 감소) · `devotion_end_heal`
- **꺾을 수 없는 의지(auto)** — 표 끝. 엔진: 맞을 때마다 겹(`will_stack_max` + `will_more_stacks`) · 겹 × v 를 dr 원천 · `will_decay`/`will_decay_slow` · `will_share`/`will_share_long`
- **신성한 심판(auto)** — 표 끝. 엔진: 반사 자리에 `reflect_win` 더하기 · 되돌린 합 장부 · `judg_split`/`judg_split_full` · `judg_burst`/`judg_early` · `judg_heal`(D11)
- **클렌징(오오라)** — `ailment_cut` 을 `applyStatus` 시간에(받는 상태이상 · 상대 창) · `cleanse_chance` · `cleanse_heal`/`cleanse_heal_party` · `cleanse_chain` · `cleanse_block`(라운드마다 첫 상태이상)
- **공세 오오라** — 표 끝(atk_pct + period_pct). 엔진: castAura 뒤 `oa_caster`/`oa_fighter`(무기 종류별 추가 창) · `oa_self_double` · `oa_cast_charge`(u.chargeMax — chargeTick) · `oa_double_shot`
- **원소 전환 · 응징 (2)** — `formula.strike` 에 전환 몫(물리 v 중 몫만 원소 저항으로 따로 깎기 · `conv_amp`) — 그 뒤 `conv_burn` · `conv_pen` · `conv_caster` · `conv_burn_spread` · `conv_vs_def` · 응징 `ret_crit`(전환 몫 터짐) · `ret_crit_jump` · `ret_extend`(처치 연장 · 상한 arg) · `ret_kill_haste` · `ret_open_bolt`
- **단죄** — 잃은 체력 × `condemn_missing_pct` 고정 몫(advBefore 에 flat) · `cond_missing_more` · `cond_overflow`/`_two` · `cond_lowest`(새 공격 대상 「체력 비율 최저 전열」) · `cond_back_too`
- **낙하 검격** — 표 끝(enemy_back_one · 번개). 엔진: `fall_row`/`fall_row_crit` · `fall_stun`(확률 · arg 초) · `fall_stun_ramp` · `fall_guard`

### 3d 궁수
- **정조준** — 창 = 공속 느림(period_pct 음수) + 새 표식 `snipe_amp`(arc_snipe 타격에 데미지 %) · `aim_less_slow`/`aim_no_slow` · `aim_back`(스나이프 후열 먼저 — ATTACK_TARGETS.enemy_hp_max 에 rt 훅) · `aim_back_bonus` · `aim_ready`
- **일격** — `ss_follow`/`ss_follow_any` · `ss_few_left` · `ss_last_double` · `ss_refund`
- **재장전(passive)** — 새 표식 `reload`(라운드당 상한 = 값 · 크기) · 스킬 처치 → 그 칸 쿨 초기화 · `reload_empower`/`_two` · `reload_stagger`/`_long` · `reload_all`
- **퀵 드로우** — 레벨 = 고정 주기 값 감소(지금 시간) · `qd_scatter` · `qd_back_bonus` · `qd_onhit_again`/`qd_onhit_more` · `qd_finale`
- **오버드로우** — 레벨 = 평타 피해(둘째 줄) · `od_hp_max`/`od_hp_max_bonus` · `od_pierce`/`od_pierce_stagger` · `od_third`
- **체인 드로우** — 새 표식 `chain_splash`(주 대상은 그대로 · 나머지 v — 기본 피어싱 샷의 `attack_splash` 는 안 건드린다) · 레벨 = 비율 · `cd_onhit_all`/`_full` · `cd_kill_chain`/`cd_chain_full` · `cd_explode`
- **사냥 표식** — enemy_hp_max 에 dr_pct 음수 창(받는 피해 증가) · `mark_move`/`_refresh` · `mark_all`/`_double` · `mark_share`
- **지원 사격** — 창 `support_fire` · 아군 평타 뒤 레인저 화살(advAfterBasic) · `sf_skills`/`sf_skill_two` · `sf_counter`/`sf_counter_two` · `sf_two`
- **덫** — 자리(적 배열 칸)에 붙는 덫 목록(라운드를 넘긴다) · 그 자리 적이 행동하면 터짐 + 경직 · `trap_all_front`/`trap_back` · `trap_stun`/`trap_extra` · `trap_rearm`

### 3e 사제
- **버티기** — 피해 적용에서 죽을 피해면 HP = 최대 × v · 창 소비 · `endure_guard`/`_double` · `endure_heal_up`/`_double`(새 표식 `recv_pct`) · `endure_twice`
- **정화** — `castCleanse` 있음 · `purify_return`/`_row` · `purify_immune`(새 표식 `ail_immune` — statusGate) · `purify_immune_shield` · `purify_cool`
- **리저렉션** — 새 조건 `ally_down` · 새 하는 일 `revive`(쓰러진 아군 · 런당 상한 balance) · 화면 재생기 `rise` 이벤트(ui/battle.js) · `res_fresh` · `res_all`/`res_all_full` · `res_power` · `res_shield`
- **천벌** — 대상의 상태이상 · 상대 창 수 × 가산 · `pun_more` · `pun_cap` · `pun_consume`/`_double` · `pun_spread`
- **속죄** — enemy_hp_max 저주(`atone` 표식) → 그 적이 받은 직격 × v 파티 회복 · `aton_move`/`_refresh` · `aton_all`/`aton_focus` · `aton_kill_heal`
- **파문** — 새 공격 대상 「버프 최다」 · 버프(끝없는 창 제외) 벗기고 수만큼 가산 · `exc_all`/`_full` · `exc_lock`(새 표식 `buff_lock`)/`exc_lock_punish` · `exc_steal`
- **금강** — dr_pct + 자기 ailment_cut 줄 · `diamond_shake`/`_heal` · `diamond_share`/`_back` · `diamond_unstaggerable`
- **소탕** — 대상 enemy_front · `sweep_back`/`_full` · `sweep_twice`/`sweep_stagger` · `sweep_heal`
- **반격** — 창 `counter_win`(v = 반격 배율) · 맞으면 때린 적에게 직격(반격은 반격을 안 부른다) · `counter_front`/`_back` · `counter_row`/`counter_all` · `counter_stagger`

## 4단계 — 마무리

- 단정: 위 「깨질 것」 고치기 · 전직 45 점검 단정 통과 · 장치마다 최소 단정(fx 가 실제로 무엇을 바꾸나)
- 수치: `advance_node.csv` · `advance_common.csv` · 새 balance 키 전부 ⚠제안 → 결투 하네스(Lv50 3:3)로 세 바퀴 — 변형 1랭크 ≈ 크기 1랭크 · 공통 줄 셋이 골라지는 비율
- 골든 재촬영(의도한 변경 — HEAD 두 벌 방법) · DEV_PLAN R471 ✅ · 기획서: advance_tree_draft(D11) · skill_design §4 · §10 · battle_design §2-4 ~ §2-6(결빙 · 화상 규칙) · GAME_DESIGN §9 한 줄
- 화면: 새 이벤트(`cdPush` · `dot k:adv` · `pay` · 자동 `skill auto`) 재생기 표시 · 툴팁 문장(새 표식 값 표기) · 새 스킬 아홉 그림(지금은 옛 id 그림 없음)

## 진행 기록

- 11-13 1단계 — 세이브 v48 · `advance_common.csv` · `advance_node.csv` 새 모양 · 스킬 아홉 교체 · `game.advanceRank` · 전직 판 다섯 줄(ADR-1081) · 도감 전직 탭 · INTERFACE §2-4 · §2-7 · §2-8 · §4
- 11-13 2단계 — 결빙 strongest(열쇠 `freeze@시전자`) · 냉기 스킬 = 기본 결빙 · 스턴 장부 · 화상 = 받는 회복만 · 이그나이트 `vs_burn_pct` · 공통 줄 18키 · test 866/867(골든만)
- 11-13 3a — 마법사 엔진 블록 · 표(히드라 · 블리자드 창 · 프로즌 오브 계속 닳기 · 썬더 스트라이크 늘 켜짐 · 노바 터짐) · balance 7키 · 전직 45 점검 단정 추가(쿨감 · HP 키운 판)
- 11-13 3b · 3c — **표만**(라그나로크 셋 줄 · 버서크 auto · 동귀어진 HP 0.3 · 호령 · 사자후 레벨 = 크기 · 가디언 셋 auto · 응징 전환 · 단죄 고정 몫 · D11) · balance 4키 · 엔진 없음 → 중단
- 11-14 3b ~ 3e 엔진 · 3d · 3e 표 · balance 4키(`pun_per` · `pun_cap` · `exc_per` · `resurrection_per_run`) · 런타임 훅 · `formula.strike` 전환 몫 · 재생기 `rise` · `cd` · `cdPush` · 단정 · INTERFACE §2-6 · SCREEN_DESIGN §4-2 — test 870/871(골든만)
