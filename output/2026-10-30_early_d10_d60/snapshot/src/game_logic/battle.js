/**
 * 전투 시뮬레이터 — **헤드리스**. 파티·스테이지·시드를 받아 결과와 타임라인을 돌려준다.
 * **런은 라운드 단위로 계산한다** [2026-09-14 · R89 · base_expedition_design §1-1] — `createRun().next()` 한 번이 라운드 하나다.
 *   **걸음 단위로도 돈다** [2026-09-21 · R130 · base_expedition_design §1-5] — `advance(until)` 이 재생 시각까지만 틱을 돌고,
 *   부르는 쪽은 **틱 사이 어디서나** 그 순간의 파티(장비 · 레벨 · 스킬 트리)를 넣을 수 있다(`refit` — 보스 라운드 도중도 포함).
 *   보상(경험치 · 골드 · 도감 · 드롭)은 **이긴 라운드의 몫만** 결과에 들어간다.
 * 화면(ui/battle.js)은 이 타임라인을 시간에 맞춰 옮길 뿐이다 — 인자 없이 끝까지 이어 부르면 `simulate` 와 같고, 쪼개 걸어도 같다.
 * 같은 입력 + 같은 시드 = 같은 타임라인 (엔진 이식 후 대조 검증의 기준).
 *
 * battle_design.md 확정 규칙 (그대로 반영):
 *   · 라운드 구조는 **스테이지가 고르는 세트** — stage.csv:round_set → stage_round.csv. 보통 스테이지는 9라운드(정예 3·6 / 보스 9),
 *     챕터보스 스테이지는 **보스 1라운드**다 (base_expedition_design §1-2 개정 2026-09-11). 편성은 round_budget.csv ·
 *     스테이지 컨셉이 편성을 바꾸는 예외는 spawn_rule.js (monster_design §4 · 2026-09-18)
 *   · 행동 주기 단일 축 (공격/캐스팅 같은 시계), 한 차례에 스킬 하나 + 기본 공격 (2026-10-06 R218 · `skill_runtime.act`)
 *   · **마법 무기는 평타를 치지 않는다** [2026-10-02 · 사용자 확정 · R198 · battle_design §3] — 시전 게이지는 **칸 충전식**이다(R200 · `chargeTick`):
 *     한 바퀴에 칸 하나(상한 [balance.csv:cast_charge_max]) · 시전 한 번에 칸 하나 · 쌓인 칸만큼 틱마다 연달아. 영웅 · 몬스터 같은 규칙 · rng 0
 *   · **행동 게이지는 빈 채로 출발한다** [2026-10-02 · 사용자 확정 · R200 · battle_design §6] — 첫 차례(첫 칸)는 한 바퀴 뒤
 *   · **몬스터도 영웅과 같은 모양이다** — 직업 · 기본 능력치 7종 · 고유 스킬 · 장비 (monster_design §5-1 · 사용자 지시 2026-09-11).
 *     ~~몬스터 소재값(monster.csv) × 등급 배율(spawn_grade.csv)~~ 은 폐기 — `hp`·`attack`·`action_period` 컬럼이 없어졌다
 *   · 용어는 "사망"이 아니라 **전투불능** — 라운드 사이 회복 없음. 회복은 전투 안에서만 일어나고
 *     전투 밖으로 나오면 전원 즉시·무료 회복이다 [2026-09-06, base_expedition_design §1-1]
 *   · **물약** [2026-09-15 · R103 · 칸마다 물약 R104 · battle_design §7-1] — 파티가 같이 쓰는 칸이고 **런 하나 안에서만** 산다(`createRun` 의 `potions` —
 *     칸 하나에 물약 하나 · 앞 칸부터. 스테이지마다 다시 차는 것은 부르는 쪽이 런을 새로 열기 때문이다). HP 비율이 [balance.csv:potion_use_hp_pct] 밑인 영웅이
 *     **차례를 안 쓰고 앞 칸부터** 마신다 · 영웅마다 [balance.csv:potion_cooldown_sec] · 그 칸 물약의 정해진 양 · rng 0 · 몬스터는 안 마신다
 *
 *   · 피해 계산은 formula.js — battle_design §9 (적중 게이트 → 타격 피해 → 감소). 이 파일은 **누가 언제 때리는가**만 본다
 *   · **몬스터는 영웅과 같은 전투 능력치 체계를 쓴다** (§8-1) — 같은 `strike` 에 같은 모양의 유닛이 양쪽으로 들어간다.
 *     몬스터 방어 200과 영웅 방어 200은 정확히 같은 감쇠를 만든다. 저항은 양쪽 다 **4원소 객체 · 직접 %**
 *   · 적중은 **레벨 차 0/1 게이트** (§9-4) — 영웅은 자기 레벨, 몬스터는 스테이지 레벨(올린 레벨 · 기본 dlvl). 빗나가면 흡혈·반사도 유발되지 않는다
 *   · 원소: **평타는 언제나 물리, 원소 피해는 스킬만 낸다** [2026-10-02 · 사용자 확정 · R198 · §2-1 · §9-5] — 영웅 · 몬스터 같은 규칙.
 *     ~~몬스터는 스테이지 원소(monster.csv:attack_type)로 `computeCombat` 결과를 덮는다~~ 는 컬럼째 폐기
 *   · 반사는 비직격 — 감쇠·치명 없이 공격자 HP 를 직접 깎고 아무것도 유발하지 않는다 (§9-6)
 *   · **물리 경직** [2026-09-17 · R110 · §2-3] — 물리 직격으로 줄어든 HP 가 최대 HP 의 [balance.csv:stagger_hp_pct](비율) 이상이면
 *     [balance.csv:stagger_sec] × (1 − 타격 회복 비율) 만큼 **행동 차례만** 늦춘다(쿨은 돈다 · 다시 걸리면 끝 시각만 새로 · 양쪽 같은 규칙 · rng 0).
 *     타격 회복(`fhr`)의 출처는 갑옷 분노 칸이다(2026-09-18) · ⚠ 상한은 기획 미정이다 (GAME_DESIGN §10 「경직 · 상태이상 개편의 남은 칸」)
 *   · **방어구 옵션** [2026-09-18 · item_design §1 「갑옷 옵션」 · 「투구 옵션」] — 영웅 · 몬스터 같은 규칙(입은 장비대로):
 *     **반격**(맞으면 확률로 때린 적에게 기본 공격 1회 · 내 차례를 쓴다 · 평타와 같은 규칙 — **마법 무기는 평타가 없어 반격하지 않는다** · R198) · **조건부 받는 피해 감소**(때린 쪽의 종족 · 등급 · 열 —
 *     셋을 더해 한 원천으로 곱) · **절대값 피해 감소**(formula.strike) · **원소별 최대 저항**(formula.strike) · **체력 회복 +%**(재생 · 회복 스킬 · 흡혈 · 물약)
 *
 *   · **유닛 생성은 `makeUnit` 하나다** — 영웅도 몬스터도 같은 생성자를 지난다 (§8-1). 그리고 **전투 능력치를 만드는 함수도 하나다**
 *     [개정 2026-09-11 · R79] — ~~`combatFromMonster`~~ 는 삭제되고 몬스터도 `heroSystem.computeCombat` 을 지난다.
 *     필드 이름이 같아서가 아니라 **같은 함수라서** 같다 — 양쪽 유닛이 갈릴 수 없다.
 *     `atk_pct` 버프는 **새 곱셈 층이 아니라 상시 % 와 같은 괄호에 덧셈**이다 (§9-2 "괄호는 둘뿐") —
 *     그래서 유닛이 `atkMinBase`·`atkMaxBase`(괄호 앞 — 범위 양끝 · R90) 와 `atkPct`(괄호 안 Σ 상시 %) 를 따로 든다.
 *   · **액티브 스킬의 실행은 `skill_runtime.js`** (battle_design §3 · §6 · §7 · skill_design §9) — 정의·배정·선택은 skill.js.
 *     이 파일에 남는 것은 **전투 진행**이다: 직격 1회(`strikeOnce`) · 타겟팅 · 전투불능 · 라운드 편성 · 정산.
 *     배리어는 HP 밖 흡수 풀이고, 흡혈·반사는 **배리어가 먹은 몫을 포함한 dmg** 에 비례한다(직격이 들어간 사실은 같다).
 *   · **스킬 계수** (skill_design §13 · 2026-09-10) — 영웅 유닛은 기본 능력치(`stats`)를 들고, 런타임이 시전 순간 `skill.scaleDef` 로
 *     실효 정의를 만든다. 스킬 타격은 능력치 계수(`statMult`)·추가 피해(`procChance`/`procMult`)를 `strikeOnce` 에 싣는다 —
 *     기본 공격은 안 싣고 평타 계수(`mainMult` — 힘 · ~~마법 무기 = 지능~~(2026-09-27) 은 R198 로 소멸 — 마법 무기는 평타가 없다)를 쓴다 (battle_design §9-2 · 2026-09-18 — ~~능력치 항 `flat`~~ 폐기).
 *   · **사건 훅** — `strikeOnce` 가 `hit`/`hitTaken`/`kill` 을, `downed` 가 `down` 을, 런타임이 `cast` 를 발화한다.
 *     유닛의 `reactions` 가 비면 아무 일도 없다 — 발화 **지점**이 곧 rng 순서 계약이다 (INTERFACE §5-2).
 *   · **스킬 id 전용 코드가 없다** [2026-09-24 · R151 · PLAN_skill_structure 2단계] — 이 파일이 스킬에 대해 아는 것은 규칙뿐이다:
 *     오오라(`cast = aura`)를 창으로 건다 · 라운드가 바뀌면 `round_end = close` 창을 닫는다 · 쓰러지면 사건 `on_death` 를 쏜다(`rt.fire`) ·
 *     표식(`taunt` · `duel`)을 타겟팅이 읽는다. ~~결투 창 닫기 · 자폭 `blast`~~ 는 데이터(걸린 효과 · 하는 일 줄)로 갔다
 *
 * ⚠ 아직 미확정이라 이 파일이 임시로 두는 것:
 *   ~~타겟팅: 진형·어그로 미확정 → 랜덤~~ **확정 2026-09-09** — 대상 선택은 **전열 우선(하드 게이트)**이다:
 *     전열 생존자가 있으면 후열은 대상이 안 되고, 전열이 전멸해야 뒤가 열린다 (battle_design §3-1).
 *     우선순위는 **좁은 계약부터** — 지목(결투) → 도발 → 전열 → 무작위. 앞의 둘은 진형을 무시한다.
 *   유닛의 `reactions`(사건 훅 등록)는 **자리만** 있고 싣는 소비자가 없다 — 마스터리 T3 몫 (skill_design §5).
 *   상태이상은 **결빙 · 화상 · 중독 · 스턴** [2026-09-28 · R177 · R178 · battle_design §2-4 ~ §2-7] — 스킬 타격이 맞은 대상에게 건다(`strikeOnce` 의 `sk.onHit` → `rt.applyStatus`).
 *     화상은 받는 피해 · 받는 회복을 창 파생(`skill_effects`)으로 밀고, 중독은 틱(`poisonTick` — 창 만료 뒤 · 재생 앞), 스턴은 `stun` 이 행동 예약 · 쿨을 민다.
 *   전직·마스터리·패시브는 미구현 — 지금 도는 것은 직업 기본 액티브뿐이다 (프로토타입 §9-0).
 *   ~~몬스터의 치명·반사·피해 감소는 0~~ → **[폐기 2026-09-11 · D2 사용자 확정]** 몬스터도 **영웅과 같은 밑수**를 받는다
 *     (기본 치명 확률 · HP 재생 밑수) — 「몬스터를 영웅과 같은 구조로」가 목적이라 특수 분기를 두지 않는다.
 *     반사·피해 감소는 여전히 접사·정예 특성이 붙을 때만 값이 생긴다. ⚠ battle_design §8-1 출처 표의
 *     「치명·재생은 정예 특성이 얹는다」와 부딪히는 것을 알고 택했다 (DEV_PLAN R79).
 *   도감: 처치 수(`kills`)가 레벨의 출처다 (monster_design §8) — ~~처치마다 카드 판정~~ 은 2026-09-21 삭제(도감 카드 걷음 · 처치당 rng 1회가 빠졌다).
 *
 *   · **드롭 = 그 몬스터가 입고 있던 장비다** [개정 2026-09-11 · R79 · item_design §1 2단계]. **처치당 최대 1개**(08-27)는
 *     그대로이고 판정도 1회 · 등급은 확률 배율(`spawn_grade.csv:drop_chance_mult`)이다. 바뀐 것은 **무엇이 떨어지나** —
 *     판정 뒤 **입은 부위 중 하나**를 골라 그 아이템을 그대로 낸다. 파이프라인 3~6단계(ilvl · 희귀도 · 접사 · 개체 굴림)는
 *     **스폰으로 옮겨갔다**(`spawnRound`) — 그래서 등급 반영이 해소됐다(~~DEV_PLAN R20~~): ilvl = 가운데 `스테이지 레벨 + gear_ilvl_add` ± 반폭(부위마다 균등 · ~~굴림 없음~~ 2026-10-06) ·
 *     희귀도 = 그 등급 × 그 단의 한 행(`gearRarity` — `gear_rarity.csv` · 2026-10-24 R350 · 노말 일반몹은 레어 0) · 레어 이상 가중에 파티 평균 매직찬스. ⚠ 굴림 수가 **스폰 수**를 따라가고(몬스터마다 제 줄이라 전투 수열은 안 민다 · 2026-09-22), 파티의 매직찬스가 **적 장비도 좋게 한다**
 *     (사용자가 알고 택한 「이스터에그」). 적의 소환 벽은 처치가 아니다 — `onKill` 을 안 지난다.
 *   · **그 한 개는 장비 또는 스킬 도안이다** [2026-09-29 · R179 · item_design §1 드롭 1-2 · 2026-10-20 · R293 ~~스킬북~~] — 판정 뒤 종류 1회 · 도안은 그 몬스터가 든 칸의 스킬 도안(`result.blueprints`).
 *   · **처치는 재료를 뱉지 않는다** [2026-10-29 · R373 · item_design §1 — ~~처치 재료 판정 1회 → 종류 1회~~ 2026-10-06] — 원정의 재료는 떨어진 장비를 분해해서 나온다(state).
 */

import { createFormula, FIXED_DMG } from './formula.js';
// 원소 어휘만 가져온다 — 시스템 주입이 아니다 (skill.js 와 같은 취급 · INTERFACE §1)
import { ELEMENTS } from './hero.js';
import { cooldownSec, createHooks, createSkillRuntime } from './skill_runtime.js';
import { refreshDerived, weaponOnHit, stateOf, strongestOf, sumOf } from './skill_effects.js';
// 스테이지 편성 예외 — 규칙이 코드라서 주입이 아니라 import 다 (skill_effects.js 와 같은 취급 · INTERFACE §2-13)
import { STAGE_SPAWN_RULES, spawnRuleKey } from './spawn_rule.js';
// 만남 줄 — 라운드 씨앗을 용도 · 몬스터 자리 · 장비 부위로 나눈다 (INTERFACE §5-1).
import { makeRng, deriveSeed } from './rng.js';

/** 난수 용도 번호는 저장 · 서버 재현 계약이다. 표의 값이 바뀌면 같은 판의 내용도 바뀐다. */
export const ENCOUNTER_STREAMS = Object.freeze({
    formation: 0xF04D, gear: 0x6EA4, skill: 0x5C11, drop: 0xD40F,
    weapon: 0x6A00, wear: 0xC10F, part: 0x6E40,
});
/** 부위 번호는 선택 부위의 유무 · 순서와 무관하다. 새 부위는 뒤에 붙인다. */
export const MONSTER_GEAR_PARTS = Object.freeze(['weapon', 'helmet', 'armor', 'gloves', 'boots', 'amulet', 'ring']);

const TICK = 0.1;
/** 걸음을 끊는 자리의 부동소수 여유 — 시각은 0.1 을 거듭 더해 꼬리가 붙는다(`advance`). **틱을 몇 번 도느냐만** 정하고 틱 안의 계산에는
 *  안 들어가므로 결과를 안 바꾼다(끊는 자리만 옮긴다 · INTERFACE §5-3 · R130). 행동 차례 판정(`u.next`)도 같은 여유를 쓴다(2026-10-02 · #69) */
const STEP_EPS = 1e-6;
/** 공격력이 없는 쪽의 범위 — 소환 · 마법 무기가 아닌 쪽의 회복 밑수 (R90) */
const NO_DMG = Object.freeze({ min: 0, max: 0 });

/**
 * @param {object} data
 *   balance, monsters(byId), stages(byId), roundSets {round_set: [{round_num, round_type}]} (세트마다 round_num 순),
 *   budgets(byKey: normal/elite/stage_boss/chapter_boss), grades(byKey), sins [...],
 *   eliteTraits {sin: {sinId: [masteryNodeId]}, stat: [attrId], def: [defId]} — 정예 특성 칸의 풀 (2026-10-24 · R344 · monster_design §6 · 생성 시 검사), itemSystem,
 *   skillSystem — skill.js (정의·발동 선택). 없으면 액티브 없이 기본 공격만 돈다,
 *   heroSystem — hero.js. **몬스터도 `computeCombat` 을 지난다** (§8-1 「계산이 한 곳」 · 신설 2026-09-11 R79),
 *   classSkills {classId: [skillId]} — 보스의 한 칸 더의 후보 풀. item·hero 에 넘기는 **같은 표**다 (신설 2026-09-11 R79 · ⚠ 보스마다 정한 고유 스킬이 서기 전의 임시 · R269),
 *   slots [partId] — 장비 부위 어휘. 등급의 입는 부위(`spawn_grade.csv:wear_fixed` · `wear_optional`) 검증에만 쓴다 (신설 2026-09-11 R79 · 개정 2026-10-12 R245),
 *   levelXp [{level, monsterXp}] — `level_xp.csv`. 몬스터 레벨 → 처치 XP 기준값 (신설 2026-09-28 · 1 ~ 만렙을 덮어야 한다),
 *   difficulties [{id, wearChance, skillSlots, monsterDmgMult, monsterHpMult, eliteTraitSlots, gearIlvlFixed}] — (eliteTraitSlots = 정예 특성 칸 수 · 2026-10-24 R344 · ~~rarityMax~~ R342 → 2026-10-24 R350 `gearRarity` 의 0) —`difficulty_tier.csv` 순서대로. 몬스터가 **선택 부위**를 입을 확률 · 첫 단이 기본 · 없으면 확률 1 (신설 2026-10-12 R245) ·
 *     몬스터 **스킬 칸 수**(난이도가 연다 — 노말 1 · 나이트메어 2 · 헬 3 · 없으면 1 · 2026-10-18 R269), 몬스터 **데미지 · HP 배수**(전역 배율 위에 곱한다 · 없으면 1 · 2026-10-21 R301),
 *     몬스터 장비 **아이템 레벨 고정**(gearIlvlFixed 1 = 그 몬스터의 레벨 — 헬 · 없으면 굴림 · 2026-10-28 R366),
 *   gearRarity {grade: {difficultyId: {normal, magic, rare, epic, legendary}}} — `gear_rarity.csv`. 몬스터 장비 희귀도 가중치 **등급 × 단 한 장**
 *     (행마다 합 100 · 에픽 · 레전더리를 안 여는 단은 0 · 2026-10-24 R350 · item_design §1 희귀도). 주면 등급 × 단 칸이 다 있어야 한다 · 없으면 드롭 가중치,
 *   chapterDebuffs [{difficultyId, chapter, sin, effect, value, intervalSec, durationSec, cap}] — `chapter_debuff.csv`. 단 · 장마다 그 장 죄종의 디버프 한 줄
 *     (헬 · 2026-10-28 R366 · base_expedition_design §1-4 · 생성 시 검사). 없으면 디버프 없음,
 *   monsterRoles {role: {rank}} — `monster_role.csv`. **적의 자리**를 정한다 (진형 확정 2026-09-09).
 *     모르는 역할은 **전열(0)** 로 떨어뜨린다 — 빠뜨린 몬스터가 뒤에 숨어 무적이 되는 것보다 앞에 서는 편이 안전하다
 */
export function createBattleSystem(data) {
    const B = data.balance;
    if (!Number.isInteger(B.monster_gold_support_mid_level) || B.monster_gold_support_mid_level <= 1
        || !Number.isInteger(B.monster_gold_support_end_level) || B.monster_gold_support_end_level <= B.monster_gold_support_mid_level
        || !Number.isFinite(B.monster_gold_support_start_mult) || !Number.isFinite(B.monster_gold_support_mid_mult)
        || B.monster_gold_support_start_mult < B.monster_gold_support_mid_mult || B.monster_gold_support_mid_mult < 1)
        throw new Error('battle: 초반 골드 지원의 레벨 순서·배수가 잘못됐다');
    // 실제 몬스터 레벨(level_add 포함) 기준. 기존 보상 곡선은 그대로 두고 최종 반올림 전에 한 번 곱한다.
    const goldSupportMult = lvl => {
        const mid = B.monster_gold_support_mid_level, end = B.monster_gold_support_end_level;
        if (lvl >= end) return 1;
        if (lvl <= mid) return B.monster_gold_support_start_mult
            + (B.monster_gold_support_mid_mult - B.monster_gold_support_start_mult) * (lvl - 1) / (mid - 1);
        return 1 + (B.monster_gold_support_mid_mult - 1) * (end - lvl) / (end - mid);
    };
    const F = createFormula(B);
    const SK = data.skillSystem ?? null;
    const HS = data.heroSystem ?? null;            // 몬스터도 computeCombat 을 지난다 (R79)
    const CLASS_SKILLS = data.classSkills ?? {};   // 보스의 한 칸 더의 후보 풀 (R79 · ⚠ 보스마다 정한 고유 스킬 전의 임시 · R269)
    if (!HS) throw new Error('battle: heroSystem 이 없다 — 몬스터도 computeCombat 을 지난다 (INTERFACE §2-6)');
    // 정예 특성 칸의 풀 (R344 · monster_design §6) — 죄종마다 그 마스터리 T1 · 능력치 · 방어. 비면 그 칸 굴림이 undefined 를 싣는다
    const ET = data.eliteTraits ?? {};
    for (const s of data.sins ?? [])
        if (!ET.sin?.[s]?.length) throw new Error(`battle: eliteTraits.sin.${s} 가 비었다 — 그 죄종의 마스터리 T1 (mastery_node.csv · INTERFACE §2-6)`);
    for (const k of ['stat', 'def'])
        if (!ET[k]?.length) throw new Error(`battle: eliteTraits.${k} 가 비었다 (INTERFACE §2-6)`);
    // 파티 골드 · 드랍 · 매직의 체감 K [2026-10-05] — 없으면 정산이 NaN 으로 조용히 샌다
    for (const k of ['party_gold_find_k', 'party_item_find_k', 'party_magic_find_k'])
        if (!(B[k] > 0)) throw new Error(`battle: balance.csv 의 ${k} 가 없거나 0 이하다`);
    // 적의 랭크 — `monster.csv:role` → `monster_role.csv:rank` (0 전열 · 1 후열). 화면이 들고 있던 규칙을 CSV 로 올린 것이다
    const ROLES = data.monsterRoles ?? {};
    // 종족의 몸 · 부류의 기믹 [2026-10-29 · R388 · monster_design §3-1 · INTERFACE §2-6] — 표가 없는 조립(손으로 만든 검증 시스템)은 둘 다 비어
    //   몸 · 기믹이 없다(종전 그대로). 기믹의 **이름**(군대 · 거인 · 수호자 · 이형)은 코드의 어휘다 — 무엇을 하는지가 코드라서다(의뢰 `AXES` 와 같은 자리)
    const RACES = data.races ?? {};
    for (const [id, r] of Object.entries(RACES)) {
        for (const k of ['hp', 'regen', 'dmg', 'def']) if (!(typeof r[k] === 'number' && r[k] > 0)) throw new Error(`battle: 종족 ${id} 의 몸 ${k} '${r[k]}' — 양수여야 한다 (monster_type.csv)`);
        if (!(typeof r.res === 'number' && Number.isFinite(r.res))) throw new Error(`battle: 종족 ${id} 의 몸 res '${r.res}' (monster_type.csv)`);
    }
    const FAMILIES = data.families ?? {};
    for (const [id, f] of Object.entries(FAMILIES)) {
        if (!(typeof f.value === 'number' && f.value >= 0 && f.value < 1)) throw new Error(`battle: 부류 ${id} 의 gimmick_value '${f.value}' — 0 이상 1 미만 (monster_base.csv)`);
        if (!(Number.isInteger(f.n) && f.n >= 0)) throw new Error(`battle: 부류 ${id} 의 gimmick_n '${f.n}' — 0 이상 정수 (monster_base.csv)`);
    }
    const rankOfRole = role => ROLES[role]?.rank ?? 0;
    const EPS = SK ? SK.EPS : 0;                // 준비·만료 판정 허용 오차 (skill.js — INTERFACE §5-3)
    const r1 = v => Math.round(v * 10) / 10;
    /** 지금 값 자르기 — 소수 4자리 (INTERFACE §5-3 · R305). 괄호를 나눴다 곱한 공격력의 ULP 꼬리가 창 없이도 바뀐 것으로 읽히지 않게 · 표시값이라 전투는 안 읽는다 */
    const r4 = v => (Number.isFinite(v) ? Math.round(v * 1e4) / 1e4 : v);
    /**
     * 유닛의 지금 값 — **세부 옵션 줄 id** 로 [2026-10-21 · R305 · INTERFACE §2-6 `stat` · SCREEN_DESIGN §2 「유닛 툴팁 규격」].
     *   창 · 겹 · 깎인 방어 · 갈아입기가 민 뒤의 유닛 필드를 그대로 옮긴다(계산 없음). 공격력 두 줄은 그 유닛의 시트에 선 쪽(`liveAtk`)만 범위이고
     *   다른 쪽은 `null`(시트에 없는 줄 — 갈아입어 무기 종류가 바뀌면 옛 줄이 `null` 로 간다) · 받는 회복(`recv`)은 시트의 `option_fx.recv` 자리다
     */
    const liveRows = u => {
        const atk = { min: r4(u.atkMin), max: r4(u.atkMax) };
        return {
            atk_physical: u.liveAtk === 'atk_physical' ? atk : null, atk_magic: u.liveAtk === 'atk_magic' ? atk : null,
            action_period: r4(u.period), hp_max: u.hpMax, defense: r4(u.def), damage_reduction: r4(u.dr),
            res_fire: r4(u.res.fire), res_cold: r4(u.res.cold), res_lightning: r4(u.res.lightning), res_poison: r4(u.res.poison),
            hp_regen: r4(u.regen), cooldown_reduction: r4(u.cdr), recv: r4(u.recv),
        };
    };
    /** 두 줄 값이 같은가 — 범위(`{min, max}`)는 양끝 · 나머지는 `Object.is`(값이 없는 줄끼리도 같다) */
    const sameRow = (a, b) => (a && typeof a === 'object' ? a.min === b?.min && a.max === b?.max : Object.is(a, b));
    /**
     * 무기 판정 [2026-09-29 · R187 · 개정 2026-10-03 · R204 · skill_design §2-2] — **무기의 힘을 끌어다 쓰는 스킬**(타격 · 회복 · 소환)은
     *   칸을 가리지 않고 그 스킬 직업의 무기군을 들어야 나간다 · 걸린 효과만 거는 스킬은 무기를 안 본다(규칙은 `skill.fitsWeapon` 하나).
     *   ~~배운 스킬 칸만~~(10-02 · R197) 대체. 몬스터도 같은 규칙이다 — 지금 데이터는 전부 제 무기군과 맞아 꺼지는 칸이 없다.
     *   무기군 → 직업 목록은 여기서 푼다(skill.js 는 아이템을 모른다). 맨손 · 모르는 무기군 = `null` → 무기가 필요한 스킬이 안 맞는다.
     *   무기군 키가 **없는** 파티 유닛(`undefined` — 직업을 손으로 실은 검증 파티)은 판정하지 않는다 (INTERFACE §2-6)
     */
    const fitterOf = group => {
        if (group === undefined || !SK) return () => true;
        const classes = data.itemSystem.groupOf({ slot: 'weapon', group })?.classes ?? null;
        return def => SK.fitsWeapon(def, classes);
    };
    /**
     * 칸 하나를 전투에 세운다 — 정의를 풀고 준비 시각을 얹는다. **무기가 안 맞는 칸은 꺼진 채 선다**(R187 · R204 · battle_design §6):
     *   `readyAt = Infinity` 라 `pickReady` 가 안 고르고(차례를 안 먹는다) 쿨이 멈춘다 · 남은 쿨은 `frozen`(초).
     *   **출처를 안 본다** — 고유 · 배운 · 전직(몬스터 보스 셋째 칸 포함) 칸 모두 스킬이 정한다(2026-10-03 · R204 — ~~배운 칸(`source = book`)뿐~~ R197)
     * @param frozen 꺼질 때 멈춰 둘 쿨(초) — 전투 시작 · 등장은 0(준비 상태로 출발 · R100)
     */
    const slotOf = (a, def, fits, readyAt, frozen = 0) => (fits(def)
        ? { id: a.id, def, readyAt, source: a.source }
        : { id: a.id, def, readyAt: Infinity, source: a.source, off: true, frozen });
    // 처치 XP 기준값 — 몬스터 레벨 → `level_xp.csv:monster_xp` (2026-09-28 · ~~monster_xp_base × monster_xp_growth ^ (lvl − 1)~~).
    //   몬스터 레벨은 만렙을 안 넘으므로(`hero_level_cap`) 1 ~ 만렙을 못 덮으면 생성 때 던진다
    const MONSTER_XP = new Map((data.levelXp ?? []).map(r => [r.level, r.monsterXp]));
    for (let l = 1; l <= B.hero_level_cap; l++)
        if (!(MONSTER_XP.get(l) > 0)) throw new Error(`battle: level_xp.csv 에 레벨 ${l} 의 monster_xp 가 없다 (상한 ${B.hero_level_cap})`);

    /** 부위 목록 칸 — `|` 로 가른다. **이 순서가 장비 굴림 순서**다 (INTERFACE §5-2) */
    const partsOf = v => String(v ?? '').split('|').filter(Boolean);
    /**
     * 입는 부위는 **등급이 정한다** [2026-10-12 · R245 · monster_design §5-1 — ~~`monster.csv:wear_slots`~~ 몬스터마다] —
     *   `fixed` = 언제나 입는다(`spawn_grade.csv:wear_fixed` — 무기 · 갑옷) · `optional` = 부위마다 그 단의 확률로 입는다(`wear_optional`)
     */
    const wearOf = g => ({ fixed: partsOf(g.wear_fixed), optional: partsOf(g.wear_optional) });
    /** 난이도 단 — 선택 부위 착용 확률 `[difficulty_tier.csv:wear_chance]` · 안 준 단 · 표에 없는 단은 첫 단 · 표가 없는 조립은 1(다 입는다) */
    const DIFFS = data.difficulties ?? [];
    const diffOf = diff => DIFFS.find(d => d.id === diff) ?? DIFFS[0];
    const wearChanceOf = diff => diffOf(diff)?.wearChance ?? 1;
    /**
     * 몬스터 장비의 희귀도 가중치 — **그 등급 × 그 단의 한 행** `[gear_rarity.csv]` [2026-10-24 · 사용자 확정 · R350 · item_design §1 희귀도 —
     *   ~~등급의 `gear_rarity_w_*` · 단의 `rarity_max`~~(R342)]. 에픽은 나이트메어부터 · 레전더리는 헬에서만도 그 행의 0 이다.
     *   안 준 단 · 표에 없는 단은 첫 단(`diffOf`) · 표가 없는 조립은 `null`(= `rollGear` 의 드롭 가중치) · rng 0
     */
    const RARITY = data.gearRarity ?? null;
    const gearWeightsOf = (g, diff) => (RARITY ? RARITY[g.grade]?.[diffOf(diff)?.id] ?? null : null);
    /** 몬스터 장비 아이템 레벨 고정 — 그 단이 **그 몬스터의 레벨로** 고정하나 `[difficulty_tier.csv:gear_ilvl_fixed]` (헬 · 사용자 「ㅇㅇ장비 50고정」 2026-10-28 · R366) · 표가 없는 조립은 굴림 */
    const gearFixedOf = diff => diffOf(diff)?.gearIlvlFixed === 1;
    /**
     * 장 디버프 — **단 · 장마다 한 줄** `[chapter_debuff.csv]` [2026-10-28 · 사용자 · R366 · base_expedition_design §1-4 — ~~라운드 단계~~(10-24)].
     *   장 안의 칸은 같은 값이고 **챕터보스 칸만** 값에 `[balance.csv:chapter_debuff_boss_mult]` 를 곱한다(간격 · 시간 · 상한은 그대로).
     *   출정 창과 `createRun` 이 이것 하나를 읽는다 · 줄이 없는 단 · 장 · 없는 칸은 null · rng 0
     */
    const DEBUFFS = data.chapterDebuffs ?? [];
    const DEBUFF_EFFECTS = ['taken_pct', 'poison', 'heal_cut', 'freeze', 'feast'];
    function debuffOf(stageId, difficulty = null) {
        const stage = data.stages[stageId], d = diffOf(difficulty);
        if (!stage || !d) return null;
        const row = DEBUFFS.find(x => x.difficultyId === d.id && x.chapter === stage.chapter);
        if (!row) return null;
        const boss = stage.boss_grade === 'chapter_boss';
        return { sin: row.sin, effect: row.effect, value: boss ? row.value * B.chapter_debuff_boss_mult : row.value,
            intervalSec: row.intervalSec, durationSec: row.durationSec, cap: row.cap, boss };
    }
    /**
     * 몬스터 스킬 칸 — **난이도가 연다 · 보스는 한 칸 더** [2026-10-18 · R269 · monster_design §5-1 — ~~등급이 연다(일반 1 · 정예 2 · 보스 3)~~ 09-11].
     *   칸 수 = 그 단 `[difficulty_tier.csv:skill_slots]` + 등급 `[spawn_grade.csv:skill_slots_add]`. **칸은 출처 자리**다 —
     *   1칸 = 고유 · 2칸(단 ≥ 2) = `monster.csv:nightmare_skill`(2티어 · 몬스터마다 고정 · monster_design §5-2-1) · 보스의 한 칸 더 = 스폰 굴림(`thirdSkill`).
     *   ⚠ 헬 셋째 칸은 내용이 정해지지 않아 출처가 없다(빈다) · 보스의 한 칸 더는 보스마다 정한 고유 스킬이 서기 전까지 직업 풀 굴림(R133)이다.
     *   2칸은 영웅의 **배운 칸 자리**(`bookSkill` · source `book`)로 넘긴다 — 칸 순서 · 특정 스킬 +n 이 영웅과 같은 길을 탄다. 스폰 · 출정 창 · 획득처가 이 하나를 본다 · rng 0
     */
    const slotsOf = diff => diffOf(diff)?.skillSlots ?? 1;
    /** 정예 특성 칸 수 — **난이도가 연다** `[difficulty_tier.csv:elite_trait_slots]` (노말 죄종 · 나이트메어 + 능력치 · 헬 + 방어 · 2026-10-24 · R344 · monster_design §6) · 표가 없는 조립은 1 */
    const eliteSlotsOf = diff => diffOf(diff)?.eliteTraitSlots ?? 1;
    /**
     * 몬스터 데미지 · HP 배수 — **난이도 단이 든다** [2026-10-21 · R301 · base_expedition_design §1-4] `[difficulty_tier.csv:monster_dmg_mult · monster_hp_mult]`.
     *   전역 배율(`monster_atk_scale` · `monster_hp_scale`) 위에 곱한다 · 표가 없는 조립은 1 · rng 0
     */
    const dmgMultOf = diff => diffOf(diff)?.monsterDmgMult ?? 1;
    const hpMultOf = diff => diffOf(diff)?.monsterHpMult ?? 1;
    const slotPlan = (m, g, diff) => ({
        innate: m.innate_skill,
        second: slotsOf(diff) >= 2 && m.nightmare_skill && m.nightmare_skill !== '-' ? m.nightmare_skill : null,
        rolled: g.skill_slots_add >= 1,
    });
    /** 몬스터 장비 아이템 레벨의 반폭 — 가운데 × `[balance.csv:drop_ilvl_spread_pct]` 반올림 · 하한 `[balance.csv:drop_ilvl_spread_min]`
     *  [2026-10-06 · item_design §1 3단계 · 반올림 자릿수는 INTERFACE §5-3] */
    const ilvlSpreadOf = center => Math.max(B.drop_ilvl_spread_min, Math.round(center * B.drop_ilvl_spread_pct));
    /** 몬스터 레벨 = 스테이지 레벨 + `monster.csv:level_add` · 만렙 `[balance.csv:hero_level_cap]` 에서 자른다 [2026-10-24 · INTERFACE §2-6 `lvl`] —
     *  입은 장비 아이템 레벨의 위 끝도 이 값이다(`wearGear`) */
    const monsterLevelOf = (m, level) => Math.min(B.hero_level_cap, level + m.level_add);
    /**
     * 한 마리의 차림 — 스폰 2단과 실험실(`rollMonsterDrop`)이 **같은 이 함수**를 부른다.
     * 아이템 레벨 = 가운데(스테이지 레벨 + 등급 가산) ± 반폭 — **부위마다** `rollGear` 가 굴린다 [개정 2026-10-06 · 사용자 확정 · item_design §1 3단계 — ~~굴리지 않는다~~(09-11)].
     *   반폭 = 가운데 × 비율 반올림 · 하한 — 모든 등급이 같은 비율이라 평균은 종전과 같다. 몬스터가 입는 장비라 그 세기도 같이 흔들린다(사용자가 알고 택했다)
     *   **위 끝 = 그 몬스터의 레벨**(`monsterLevelOf`) — 넘친 값은 자른다 [2026-10-24 사용자 「몬스터가 장착중인 아이템은 본인의 레벨을 넘을 수 없다」 · 굴림 수 불변]
     * 무기군 · 선택 부위의 착용 여부 · 부위별 장비는 각각 독립 수열이다. 희귀도에 따라 한 부위의 굴림 수가 달라도 다른 부위를 안 민다.
     * 선택 부위의 확률이 0 · 1 이어도 같은 부위 씨앗에서 한 번 비교한다. 매직찬스는 각 부위의 희귀도 문턱만 옮긴다.
     * 무기군 `-` 는 그 직업 본편 무기군(`item.groupsFor` 순서) 중 하나를 전용 수열의 한 굴림으로 고른다.
     * @param seed 이 몬스터 차림의 uint32 씨앗
     * @param level 스테이지 레벨 — `level_add` 는 안 탄다(INTERFACE §2-6 `lvl`)
     * @param chance 선택 부위 착용 확률 — 그 런의 단(`wearChanceOf`)
     * @param weights 희귀도 가중치 — 그 등급 × 그 런의 단(`gearWeightsOf` · 2026-10-24 · R350) · `null` 이면 드롭 가중치 · 굴림 수 불변
     * @param ilvlFixed 그 런의 단이 아이템 레벨을 고정하나(`gearFixedOf` — 헬) — 참이면 아래 끝도 그 몬스터의 레벨이다(굴림은 소비만 · 2026-10-28 · R366)
     */
    const wearGear = (seed, m, g, level, magicFind, chance, weights, ilvlFixed = false) => {
        let weaponGroup = m.weapon_group;
        if (weaponGroup === '-') {
            const gs = data.itemSystem.groupsFor(m.cls);
            weaponGroup = gs[Math.floor(makeRng(deriveSeed(seed ^ ENCOUNTER_STREAMS.weapon, 0))() * gs.length)].id;
        }
        const { fixed, optional } = wearOf(g);
        const partNo = part => {
            const no = MONSTER_GEAR_PARTS.indexOf(part);
            if (no < 0) throw new Error(`battle: 차림 난수 부위 '${part}' 의 번호가 없다`);
            return no;
        };
        const worn = optional.filter(part => makeRng(deriveSeed(seed ^ ENCOUNTER_STREAMS.wear, partNo(part)))() < chance);
        const center = level + g.gear_ilvl_add;
        return [...fixed, ...worn].flatMap(part => data.itemSystem.rollGear(makeRng(deriveSeed(seed ^ ENCOUNTER_STREAMS.part, partNo(part))), {
            slots: [part],
            ilvl: center,
            ilvlSpread: ilvlSpreadOf(center),
            ilvlMax: monsterLevelOf(m, level),
            ...(ilvlFixed ? { ilvlMin: monsterLevelOf(m, level) } : {}),
            magicFind,
            // 희귀도 가중치는 **등급 × 단이 쥔다** — 노말 일반몹 = 일반 + 가끔 매직(레어 0) · 나이트메어 · 헬 일반몹은 레어까지 (2026-10-24 사용자 확정 · R350)
            rarityWeights: weights,
            weaponGroup,
        }));
    };

    /**
     * 그 몬스터가 그 등급 · 그 스테이지 레벨로 설 때 입는 장비의 조건 [신설 2026-10-10 · 실험실 · INTERFACE §2-6] —
     * `wearGear` 가 `rollGear` 에 넘기는 값 그대로다(아이템 레벨 아래 끝은 `rollGear` 와 같이 1 · 위 끝은 그 몬스터의 레벨 — 2026-10-24). 없는 몬스터 · 등급이면 null · rng 0.
     * 부위는 등급이 정한다 — `slots` = 입을 수 있는 부위(고정 → 선택) · 선택 부위는 `wearChance`(그 단 · 안 주면 첫 단)로 입는다 [2026-10-12 · R245]
     * 무기군 — `weaponGroups` = 들 수 있는 무기군(박힌 몬스터는 하나 · `-` 는 그 직업 본편 무기군 전부 · 2026-10-23 · R324) · `weaponGroup` = 박힌 것 또는 null
     * 희귀도 — `rarityWeights` = 그 등급 × 그 단의 한 행(표가 없는 조립은 null = 드롭 가중치) · `rarityMax` = 그 행에서 0 이 아닌 가장 높은 희귀도
     *   (표시용 — 실험실이 거기까지 보인다 · 행이 없으면 `rare` · 2026-10-24 · R350)
     */
    function monsterGearSpec(monsterId, grade, level, difficulty = null) {
        const m = data.monsters[monsterId], g = data.grades[grade];
        if (!m || !g) return null;
        const center = level + g.gear_ilvl_add, s = ilvlSpreadOf(center), top = monsterLevelOf(m, level);
        const { fixed, optional } = wearOf(g);
        const rolled = m.weapon_group === '-';
        const weights = gearWeightsOf(g, difficulty);
        const RARS = data.itemSystem.rarities;
        return {
            slots: [...fixed, ...optional], fixed, optional, wearChance: wearChanceOf(difficulty),
            weaponGroup: rolled ? null : m.weapon_group,
            weaponGroups: rolled ? data.itemSystem.groupsFor(m.cls).map(x => x.id) : [m.weapon_group],
            // 단이 고정하면(헬) 아래 끝도 그 몬스터의 레벨이다 (2026-10-28 · R366)
            ilvlMin: gearFixedOf(difficulty) ? top : Math.min(top, Math.max(1, center - s)), ilvlMax: Math.min(top, center + s), rarityWeights: weights,
            rarityMax: weights ? [...RARS].reverse().find(r => weights[r] > 0) ?? RARS[0] : 'rare',
        };
    }

    /**
     * 그 몬스터 한 마리의 차림 + 처치 드롭 하나 [신설 2026-10-10 · 실험실 아이템 생성기 · INTERFACE §2-6 · §5-2] —
     * 차림은 스폰과 같은 `wearGear` · 드롭은 `onKill` 의 장비 자리와 같은 식(입은 부위 중 하나 1회). **드롭이 났다고 치고 장비만 낸다** —
     * 판정 · 종류(도안)는 안 굴린다. 게임 경로는 안 부른다 — 제 rng 에서 씨앗 하나만 뽑고 차림과 부위 선택을 갈라 굴린다. 없는 몬스터 · 등급이면 null.
     * `difficulty` = 선택 부위 착용 확률을 고르는 단 — 안 주면 첫 단(스폰과 같은 뜻 · 2026-10-12 · R245)
     */
    function rollMonsterDrop(rng, monsterId, grade, level, magicFind = 0, difficulty = null) {
        const m = data.monsters[monsterId], g = data.grades[grade];
        if (!m || !g) return null;
        const seed = Math.floor(rng() * 4294967296);
        const worn = wearGear(seed, m, g, level, magicFind, wearChanceOf(difficulty), gearWeightsOf(g, difficulty), gearFixedOf(difficulty));
        const pick = makeRng(deriveSeed(seed ^ ENCOUNTER_STREAMS.drop, 0))();
        return { worn, drop: worn.length ? worn[Math.floor(pick * worn.length)] : null };
    }

    /*
     * 몬스터 모양 검증 — **로드에서 멈춘다** (`roundSets` 검사와 같은 이유 · 2026-09-11 R79). 오타가 조용히 새면
     *   빈 스킬 풀 · 없는 무기군 · 알 수 없는 부위가 되어 전투 도중에 터지거나 조용히 칸이 빈다.
     */
    {
        const PARTS = new Set(data.slots ?? []);
        for (const m of Object.values(data.monsters)) {
            const at = m.monster_idx;
            if (!(m.cls in CLASS_SKILLS)) throw new Error(`battle: 몬스터 ${at} 의 직업 '${m.cls}' 를 모른다`);
            // 무기군 `-` = 그 직업 본편 무기군 중에서 판마다 굴린다(`wearGear` · 2026-10-23 · R324) — 굴릴 무기군이 하나는 있어야 한다
            if (m.weapon_group === '-' ? !data.itemSystem.groupsFor(m.cls).length : !data.itemSystem.groupOf({ slot: 'weapon', group: m.weapon_group }))
                throw new Error(`battle: 몬스터 ${at} 의 무기군 '${m.weapon_group}' 를 모른다${m.weapon_group === '-' ? ` — 직업 ${m.cls} 의 본편 무기군이 없다` : ''}`);
            if (m.innate_skill !== '-' && SK && !SK.defs[m.innate_skill]) throw new Error(`battle: 몬스터 ${at} 의 고유 스킬 '${m.innate_skill}' 를 모른다`);
            // 2칸 = 그 직업의 2티어 (monster_design §5-1 「나이트메어 2칸 = 2티어」 · §5-2-1 · R269) — 칸이 비면 `-`
            const nm = m.nightmare_skill ?? '-', nd = SK?.defs[nm];
            if (nm !== '-' && SK && !(nd && nd.ownerKind === 'job' && nd.ownerId === m.cls && nd.tier === 2))
                throw new Error(`battle: 몬스터 ${at} 의 nightmare_skill '${nm}' — ${m.cls} 의 2티어 직업 스킬이어야 한다 (monster.csv)`);
        }
        for (const g of Object.values(data.grades)) {
            // 보스의 한 칸 더 — 칸 수는 난이도가 연다(R269 · ~~등급마다 skill_slots ≥ 1~~)
            if (!(Number.isInteger(g.skill_slots_add) && g.skill_slots_add >= 0)) throw new Error(`battle: 등급 ${g.grade} 의 skill_slots_add '${g.skill_slots_add}' — 0 이상 정수여야 한다 (spawn_grade.csv)`);
            // 입는 부위 — 등급이 정한다 (2026-10-12 · R245). 무기가 밑수라 고정 부위에 무기가 없으면 세기가 성립하지 않는다
            const { fixed, optional } = wearOf(g), all = [...fixed, ...optional];
            if (!fixed.includes('weapon')) throw new Error(`battle: 등급 ${g.grade} 의 wear_fixed 에 weapon 이 없다 — 무기가 밑수다 (spawn_grade.csv)`);
            if (new Set(all).size !== all.length) throw new Error(`battle: 등급 ${g.grade} 의 입는 부위에 같은 부위가 두 번 (spawn_grade.csv:wear_fixed · wear_optional)`);
            if (PARTS.size) for (const s of all) if (!PARTS.has(s)) throw new Error(`battle: 등급 ${g.grade} 의 입는 부위 '${s}' 를 모른다 (spawn_grade.csv)`);
        }
        for (const d of DIFFS) {
            if (!(typeof d.wearChance === 'number' && d.wearChance >= 0 && d.wearChance <= 1))
                throw new Error(`battle: 난이도 ${d.id} 의 wear_chance '${d.wearChance}' — 0 ~ 1 이어야 한다 (difficulty_tier.csv)`);
            if (!(Number.isInteger(d.skillSlots) && d.skillSlots >= 1))
                throw new Error(`battle: 난이도 ${d.id} 의 skill_slots '${d.skillSlots}' — 1 이상 정수여야 한다 (difficulty_tier.csv · R269)`);
            for (const [k, col] of [['monsterDmgMult', 'monster_dmg_mult'], ['monsterHpMult', 'monster_hp_mult']])
                if (d[k] !== undefined && !(typeof d[k] === 'number' && d[k] > 0))
                    throw new Error(`battle: 난이도 ${d.id} 의 ${col} '${d[k]}' — 양수여야 한다 (difficulty_tier.csv · R301)`);
            if (d.gearIlvlFixed !== undefined && d.gearIlvlFixed !== 0 && d.gearIlvlFixed !== 1)
                throw new Error(`battle: 난이도 ${d.id} 의 gear_ilvl_fixed '${d.gearIlvlFixed}' — 0 · 1 이어야 한다 (difficulty_tier.csv · R366)`);
        }
        // 장 디버프 — 아는 단 · 효과 다섯 · 단 · 장마다 한 줄 · 효과마다 쓰는 칸 (2026-10-28 · R366). 어긋난 줄이 조용히 새면 그 장에 디버프가 안 걸린다
        if (DEBUFFS.length && !(typeof B.chapter_debuff_boss_mult === 'number' && B.chapter_debuff_boss_mult > 0))
            throw new Error(`battle: chapter_debuff_boss_mult '${B.chapter_debuff_boss_mult}' — 양수여야 한다 (balance.csv · R366)`);
        const debuffSeen = new Set();
        const pos = v => typeof v === 'number' && v > 0;
        for (const x of DEBUFFS) {
            const at = `${x.difficultyId} ${x.chapter}장`;
            if (!DIFFS.some(d => d.id === x.difficultyId)) throw new Error(`battle: 장 디버프 ${at} — 모르는 단 (chapter_debuff.csv)`);
            if (debuffSeen.has(at)) throw new Error(`battle: 장 디버프 ${at} 이 두 줄 — 단 · 장마다 한 줄이다 (chapter_debuff.csv)`);
            debuffSeen.add(at);
            if (!DEBUFF_EFFECTS.includes(x.effect)) throw new Error(`battle: 장 디버프 ${at} 의 effect '${x.effect}' — ${DEBUFF_EFFECTS.join(' · ')} 중 하나 (chapter_debuff.csv)`);
            // 결빙은 행동 속도(`period_pct`)라 음수 · 나머지는 양수
            if (x.effect === 'freeze' ? !(typeof x.value === 'number' && x.value < 0) : !pos(x.value))
                throw new Error(`battle: 장 디버프 ${at} 의 value '${x.value}' — ${x.effect === 'freeze' ? '음수' : '양수'}여야 한다 (chapter_debuff.csv)`);
            if ((x.effect === 'poison' || x.effect === 'freeze') && !(pos(x.intervalSec) && pos(x.durationSec)))
                throw new Error(`battle: 장 디버프 ${at} — ${x.effect} 는 interval_sec · duration_sec 가 양수여야 한다 (chapter_debuff.csv)`);
            if (x.effect === 'feast' && !pos(x.cap)) throw new Error(`battle: 장 디버프 ${at} — feast 는 cap 이 양수여야 한다 (chapter_debuff.csv)`);
        }
        // 희귀도 표 — 주면 등급 × 단 칸이 다 있어야 한다 · 칸은 희귀도 다섯 · 음수 없음 · 합 > 0 (2026-10-24 · R350).
        //   빈 칸이 조용히 새면 그 등급 · 단의 몬스터가 드롭 가중치로 굴러 표가 안 먹는다
        if (RARITY) {
            const RARS = data.itemSystem?.rarities ?? [];
            for (const g of Object.values(data.grades)) for (const d of DIFFS) {
                const w = RARITY[g.grade]?.[d.id];
                if (!w) throw new Error(`battle: 희귀도 표에 ${g.grade} × ${d.id} 행이 없다 (gear_rarity.csv · R350)`);
                const ks = Object.keys(w);
                if (RARS.length && (ks.length !== RARS.length || ks.some(k => !RARS.includes(k))))
                    throw new Error(`battle: 희귀도 표 ${g.grade} × ${d.id} 의 칸 ${ks.join(' · ')} — ${RARS.join(' · ')} 이어야 한다 (gear_rarity.csv)`);
                if (ks.some(k => !(typeof w[k] === 'number' && w[k] >= 0)) || !(ks.reduce((a, k) => a + w[k], 0) > 0))
                    throw new Error(`battle: 희귀도 표 ${g.grade} × ${d.id} 의 가중치 ${JSON.stringify(w)} — 0 이상 숫자 · 합 > 0 (gear_rarity.csv)`);
            }
        }
    }

    const stageMonsters = stage => Object.values(data.monsters)
        .filter(m => m.chapter === stage.chapter && m.stage_num === stage.stage_num);

    const stagePool = stage => stageMonsters(stage)
        .filter(m => m.spawn_grade === 'normal')
        .map(m => m.monster_idx);

    /**
     * 스테이지 원소 — 그 스테이지 몬스터의 **고유 스킬이 든 원소** 중 첫 값 (없으면 'physical').
     *   [개정 2026-10-02 · R198 — ~~몬스터의 `attack_type` 중 physical 이 아닌 첫 값~~] 원소 피해는 스킬만 내므로(battle_design §2-1)
     *   원소의 출처도 스킬이다 — 고유 스킬의 하는 일 줄 중 원소 태그(`skill_effect.csv:element`)를 든 첫 줄. 보스 셋째 칸은 스폰 굴림이라 안 본다 ·
     *   2칸(`nightmare_skill`)도 안 본다 — 원소를 든 2티어는 화염 장소에만 두어 단마다 장소 원소가 안 바뀐다(monster_design §5-2-1 · R269).
     * 편성 화면이 "이 스테이지는 어느 저항을 요구하나"를 표시하려면 필요한데(§9-8),
     * 렌더러가 몬스터 테이블을 훑어 계산하면 규칙이 화면 층에 새므로 여기 둔다. rng 0
     */
    //   고정 피해(`fixed` · 사제 직격 — R221)는 원소가 아니라 저항을 요구하지 않으므로 건너뛴다
    const skillElement = id => (SK?.defs[id]?.effects ?? []).find(e => e.element && e.element !== FIXED_DMG)?.element ?? null;
    const stageElement = stage =>
        stageMonsters(stage).map(m => skillElement(m.innate_skill)).find(Boolean) ?? 'physical';

    /**
     * 스킬의 획득처 — 그 스킬을 **칸에 들고 나오는** 몬스터 [2026-10-17 · SCREEN_DESIGN §9-1 · ADR-0650 · monster_design §8-1].
     *   그 처치가 그 스킬의 도안을 준다(2026-10-20 · R293 — ~~스킬 도감 경험치 · 스킬북~~). 칸 규칙은 `makeEnemy` · `spawnRound` 와 같은 출처를 본다(`slotPlan`) —
     *   `fixed` = 정해진 칸이 그 스킬(고유 · 나이트메어 2칸 `nightmare_skill` — R269) · `roll` = 그렇지 않지만 보스의 한 칸 더(등급 `skill_slots_add` ≥ 1)의 직업 풀에 든다.
     *   `difficulty` = 그 칸이 처음 열리는 단 — 고유 · 보스 칸은 첫 단 · 2칸은 `skillSlots` ≥ 2 인 첫 단(단 표가 없으면 2칸 줄은 안 나온다 · R269).
     *   장소마다 일반몹 풀(`stagePool` — 정예도 여기서 승급한다) + 그 장소의 보스 · **열리는 장(`chapter_open_max`)까지만** ·
     *   칸 I · II · III 은 몬스터가 같아 장소 하나에 한 번. 렌더러가 몬스터 표를 훑어 칸 규칙을 다시 짜지 않게 여기 둔다(`stageElement` 와 같은 이유) · rng 0
     */
    function skillCarriers(skillId) {
        const fixed = [], roll = [], seen = new Set();
        const openMax = B.chapter_open_max ?? Infinity;
        const firstDiff = DIFFS[0]?.id ?? null, secondDiff = DIFFS.find(d => d.skillSlots >= 2)?.id ?? null;
        const places = Object.values(data.stages).filter(s => s.chapter <= openMax)
            .sort((a, b) => a.chapter - b.chapter || a.stage_num - b.stage_num);
        for (const st of places) {
            const place = `${st.chapter}-${st.stage_num}`;
            if (seen.has(place)) continue;
            seen.add(place);
            const seats = [...stagePool(st).map(id => [id, 'normal']), ...(st.boss_monster_idx ? [[st.boss_monster_idx, st.boss_grade]] : [])];
            for (const [id, grade] of seats) {
                const m = data.monsters[id];
                if (!m) continue;
                const at = difficulty => ({ monsterId: id, chapter: st.chapter, stageNum: st.stage_num, boss: grade !== 'normal', difficulty });
                if (m.innate_skill === skillId) fixed.push(at(firstDiff));
                else if (secondDiff && m.nightmare_skill === skillId) fixed.push(at(secondDiff));
                else if (data.grades[grade]?.skill_slots_add >= 1 && (CLASS_SKILLS[m.cls] ?? []).includes(skillId)) roll.push(at(firstDiff));
            }
        }
        return { fixed, roll };
    }

    /**
     * 그 몬스터가 그 등급 · 그 단으로 설 때의 스킬 칸 [신설 2026-10-18 · R269 · INTERFACE §2-6] — `fixed` = 정해진 칸의 인스턴스(칸 순서 · 고유 → 2칸) ·
     *   `rolled` = 보스의 한 칸 더(스폰 때 굴린다 — 출정 창의 「?」 칸). `makeEnemy` 와 같은 `slotPlan` 이다 — 출정 창이 칸 규칙을 다시 짜지 않게 여기 둔다.
     *   없는 몬스터 · 등급이면 null · 단을 안 주면 첫 단 · rng 0
     */
    function monsterSkillSlots(monsterId, grade, difficulty = null) {
        const m = data.monsters[monsterId], g = data.grades[grade];
        if (!m || !g) return null;
        const p = slotPlan(m, g, difficulty);
        return { fixed: SK ? SK.activesFor({ innate: p.innate, bookSkill: p.second }) : [], rolled: p.rolled };
    }

    /**
     * 스테이지의 라운드 줄 — `stage.csv:round_set` 이 `stage_round.csv` 의 세트 하나를 고른다 (base_expedition_design §1-2 · 2026-09-11).
     * **라운드 수 = 그 세트의 행 수**다 — 전역 라운드 수 키(~~`rounds_per_stage`~~)는 없다. 챕터보스 스테이지는 보스 한 줄뿐이다.
     * 화면(라운드 트랙 · 예상 소요 · 리포트 총수)도 이것을 부른다 — 렌더러가 세트를 고르면 규칙이 화면 층에 샌다 (`stageElement` 와 같은 이유)
     */
    const stageRounds = stage => data.roundSets[stage.round_set];
    // 세트가 없는 스테이지는 **로드에서 멈춘다** — 전투 도중에 라운드가 비면 원인이 안 읽힌다
    for (const st of Object.values(data.stages)) {
        if (!stageRounds(st)?.length) throw new Error(`battle: 스테이지 ${st.stage_id} 의 round_set '${st.round_set}' 가 stage_round.csv 에 없다`);
    }

    /**
     * 스테이지 편성 예외 [2026-09-18 · INTERFACE §2-13 · monster_design §4] — `spawn_rule.js` 의 규칙을 **배열 순서대로** 겹쳐
     *   n 라운드에서 뽑을 목록과 호위 수 범위를 낸다. rng 0 — 굴림은 `spawnRound` 가 한다.
     *   표에 없는 스테이지는 `roundPool` · `elitePool` 이 `pool` **그 배열**이고 소환사가 없다 — 수열이 예외 도입 전과 같다
     */
    const rulesOf = stage => STAGE_SPAWN_RULES[spawnRuleKey(stage)] ?? [];   // 키 = 장소 — 칸 I · II · III 이 같은 규칙 (2026-09-29)
    function roundDraw(stage, pool, n, bd) {
        const rules = rulesOf(stage);
        const roundPool = rules.reduce((ids, r) => (r.pool ? r.pool(ids, n) : ids), pool);
        const summoners = new Set(rules.flatMap(r => r.summoners ?? []));
        return {
            roundPool,
            elitePool: rules.reduce((ids, r) => (r.elitePool ? r.elitePool(ids) : ids), roundPool),
            plain: roundPool.filter(id => !summoners.has(id)),          // 소환사가 선 뒤의 뽑기 · 채움
            summoners,
            standing: new Set(rules.flatMap(r => r.standing ?? [])),    // 무리가 대기하지 않는 소환사 (2026-10-21)
            escorts: rules.reduce((lh, r) => (r.escorts ? r.escorts(...lh) : lh), [bd.escort_min, bd.escort_max]),
            guards: rules.reduce((gs, r) => r.guards ?? gs, null),        // 정예 호위 명단 — 있으면 호위 수 · 풀 굴림을 대신한다 (2026-10-23 · R329)
        };
    }
    // 예외 표도 **로드에서 멈춘다** — 번호가 틀리면 규칙이 조용히 헛돌고(풀에 없는 몬스터를 빼거나 좁혀도 아무 일도 없다),
    //   뽑을 목록이 비면 전투 도중에 없는 몬스터를 뽑는다
    for (const [sid, rules] of Object.entries(STAGE_SPAWN_RULES)) {
        const st = Object.values(data.stages).find(s => spawnRuleKey(s) === sid);   // 장소의 첫 칸 — 풀은 칸 전부가 같다
        if (!st) throw new Error(`battle: 편성 예외의 장소 ${sid} 가 stage.csv 에 없다 (spawn_rule.js)`);
        const pool = stagePool(st);
        for (const id of rules.flatMap(r => r.refs ?? [])) {
            if (!pool.includes(id)) throw new Error(`battle: 스테이지 ${sid} 편성 예외의 몬스터 ${id} 가 그 스테이지의 일반몹이 아니다 (spawn_rule.js)`);
        }
        // 소환사는 고유 스킬이 불러내기(`call` 줄)를 가져야 한다 [2026-09-18 · 줄 2026-09-22] — 아니면 채운 몫이 대기로 빠진 채 영영 안 선다
        for (const id of rules.flatMap(r => r.summoners ?? [])) {
            if (SK && !SK.defs[data.monsters[id].innate_skill]?.effects.some(e => e.effect === 'call'))
                throw new Error(`battle: 스테이지 ${sid} 의 소환사 ${id} 는 고유 스킬이 불러내기(call)가 아니다 — 대기 무리가 안 선다 (spawn_rule.js)`);
        }
        // 정예 호위 명단 [2026-10-23 · R329] — 그 장의 일반몹이어야 하고(장소 풀 밖이어도 된다) · 보스 라운드가 있는 장소에만 · 보스와 합쳐 라운드 상한 안
        const guards = rules.flatMap(r => r.guards ?? []);
        for (const id of guards) {
            const gm = data.monsters[id];
            if (!gm || gm.spawn_grade !== 'normal' || gm.chapter !== st.chapter) throw new Error(`battle: 스테이지 ${sid} 의 호위 ${id} 가 그 장의 일반몹이 아니다 (spawn_rule.js)`);
        }
        if (guards.length && !stageRounds(st).some(r => r.round_type === 'boss')) throw new Error(`battle: 스테이지 ${sid} 에 호위 명단이 있는데 보스 라운드가 없다 (spawn_rule.js)`);
        if (guards.length + 1 > B.wave_monster_max) throw new Error(`battle: 스테이지 ${sid} 의 호위 ${guards.length} — 보스와 합쳐 라운드 상한 ${B.wave_monster_max} 을 넘는다 (spawn_rule.js)`);
        for (const { round_num: n, round_type: type } of stageRounds(st)) {
            const bd = data.budgets[type === 'boss' ? st.boss_grade : type];
            const d = roundDraw(st, pool, n, bd);
            const at = `battle: 스테이지 ${sid} 라운드 ${n} 의`;
            const draws = type === 'boss' ? d.escorts[1] > 0 : bd.elite_count + bd.normal_max > 0;
            if (draws && !d.roundPool.length) throw new Error(`${at} 라운드 풀이 비었다 (spawn_rule.js)`);
            if (type !== 'boss' && bd.elite_count > 0 && !d.elitePool.length) throw new Error(`${at} 정예 후보가 비었다 (spawn_rule.js)`);
            if (type !== 'boss' && bd.elite_count > 1 && d.elitePool.every(id => d.summoners.has(id))) throw new Error(`${at} 정예 후보가 소환사뿐인데 정예가 둘 이상이다 (spawn_rule.js)`);
            if (draws && [...d.roundPool, ...d.elitePool].some(id => d.summoners.has(id)) && !d.plain.length) throw new Error(`${at} 소환사를 뺀 풀이 비었다 — 채울 몬스터가 없다 (spawn_rule.js)`);
        }
    }

    /**
     * 전투 유닛 하나 — **영웅도 몬스터도 여기를 지난다** (§8-1). 필드명은 `formula.strike` 가 읽는 이름 그대로다.
     * `c` 는 `hero.computeCombat` 결과다 — **몬스터도 같은 함수를 지난다**(2026-09-11 R79 · `makeEnemy`) —
     *   유닛 모양을 두 곳에 적으면 반드시 갈리므로 생성자는 하나뿐이어야 한다.
     * 버프 괄호 — 공격력 양끝(`atkMin`·`atkMax` · 범위 R90)은 이미 Σ 상시 %(`atk_pct_sum`)가 곱해진 값이라, 버프를 **같은 괄호에 더하려면**
     *   괄호 앞 밑수(`atkMinBase`·`atkMaxBase`)와 괄호 안 합(`atkPct`)을 분리해 둬야 한다 (§9-2).
     * @param extra 자리·출처가 정하는 것 — `key` · `uid`/`monsterId` · `next` · `actives` · 보상 축
     */
    function makeUnit(side, c, extra = {}) {
        // 공격력은 **범위 양끝**이다 [2026-09-14 · R90 · battle_design §9-1] — `formula.strike` 가 직격마다 그 사이를 굴린다
        const atk = c.atk_physical ?? c.atk_magic ?? NO_DMG;
        const atkPct = c.atk_pct_sum ?? 0;
        const matk = c.atk_magic ?? NO_DMG;
        const bracket = 1 + atkPct;                  // Σ 상시 피해는 비율 (R111)
        const u = {
            side,
            hp: c.hp_max, hpMax: c.hp_max,
            atkMin: atk.min, atkMax: atk.max, atkMinBase: atk.min / bracket, atkMaxBase: atk.max / bracket, atkPct,
            // 데미지 % 괄호 안의 **지금** 합 = 상시 + 창 [2026-09-18 · battle_design §9-1] — `refreshDerived` 가 `atkMin` 과 함께 다시 쓴다.
            //   `strike` 가 타격마다 조건부 % 를 이 괄호에 끼울 때 읽는다
            dmgPct: atkPct,
            // 평타 능력치 계수(든 무기의 피해 종류 — 물리 = 힘 · 마법 = 지능 · battle_design §9-2 · 2026-09-18 · 2026-09-27) — 소환 · 모름 = 1. 몬스터도 같다(2026-09-22)
            mainMult: c.main_attr_mult ?? 1,
            matkMin: matk.min, matkMax: matk.max,    // 회복량의 밑수 — 시전마다 그 사이를 굴린다 (battle_design §9-1 · skill_runtime.castHeal)
            // 회복 밑수도 공격력과 **같은 괄호**를 탄다 — atk_pct 창이 여기도 걸린다 (skill_effects:EFFECTS.atk_pct)
            matkMinBase: matk.min / bracket, matkMaxBase: matk.max / bracket,
            // 세부 옵션의 공격력 줄 — 시트에 선 쪽 하나(물리 무기 = 물리 · 마법 무기 = 마법) · `stat` 이벤트가 그 줄 id 로 싣는다 (R305). 갈아입으면 따라 바뀐다
            liveAtk: c.atk_physical ? 'atk_physical' : c.atk_magic ? 'atk_magic' : null,
            atkType: c.attack_type,                  // 평타의 공격 타입 — 언제나 physical (2026-10-02 · R198 · battle_design §2-1). 원소는 스킬 타격이 얹는다(`strikeOnce`)
            // 평타를 안 친다 — 마법 무기 [2026-10-02 · R198 · battle_design §3]. 차례에 준비된 스킬이 없으면 찬 채로 기다린다(틱 루프) · 반격도 없다.
            //   `basic_attack` 을 모르는 입력(소환 · 손으로 만든 검증 유닛)은 평타를 친다
            noBasic: c.basic_attack === false,
            // 적중을 굴리지 않는다 — **마법 무기를 든 시전자는 항상 맞는다** [2026-10-06 · 사용자 확정 · R219 · battle_design §9-4]. 판정은 무기(위 평타 여부와 같은 출처)이지
            //   타격의 원소가 아니다 — 물리 무기의 원소 추가타는 굴린다 · `formula.strike` 가 읽는다
            sureHit: c.basic_attack === false,
            // 창이 미는 축은 **밑수를 따로 든다** — `refreshDerived` 가 창 합으로 파생값을 다시 쓰고,
            //   창이 하나도 없을 때 원값으로 돌아갈 자리가 필요해서다 (skill_effects:EFFECTS.derive)
            def: c.defense, defBase: c.defense,
            // 깎인 방어의 **비율** — 가이디드 애로우가 양수 밑수를 깎을 때마다 곱해진다. 갈아입기가 `defBase = 새 밑수 × defKeep` 로 읽는다 (R130)
            defKeep: 1,
            hpMaxBase: c.hp_max,
            res: { fire: c.res_fire, cold: c.res_cold, lightning: c.res_lightning, poison: c.res_poison },
            resBase: { fire: c.res_fire, cold: c.res_cold, lightning: c.res_lightning, poison: c.res_poison },
            lvl: c.level,                            // 적중률의 레벨 — 몬스터는 스테이지 레벨 (§9-4 · R87)
            hitBonus: c.option_fx?.hitBonus ?? 0,     // 명중률 — 적중률에 (1 + 명중률)로 곱한다(궁수 T1-3 · 2026-09-22 R138 · 곱 2026-10-06 R219 · formula.hitChance). 없으면 0
            resMaxBonus: c.res_max_bonus, dr: c.damage_reduction, drBase: c.damage_reduction,
            // 방어구 옵션 [2026-09-18 · item_design §1 「갑옷 옵션」 · 「투구 옵션」] — 원소별 최대 저항 · 절대값 피해 감소 · 반격 확률 · 체력 회복 +%.
            //   `strike` 가 앞의 둘을 읽고(방어자) · 반격은 `strikeOnce` 끝 · 회복은 재생 · 회복 스킬 · 흡혈 · 물약이 읽는다. 없으면 0 — 종전과 같다
            resMaxEl: c.res_max_el ?? null, drFlat: c.option_fx?.drFlat ?? 0,
            // 받는 회복 — `recvBase` = 장비의 체력 회복 +% · `recv` = 화상이 민 파생값(skill_effects `ATTRS` · 2026-09-28 R178). 창이 없으면 둘이 같다
            counter: c.option_fx?.counter ?? 0, recv: c.option_fx?.recv ?? 0, recvBase: c.option_fx?.recv ?? 0,
            // 처치 시 체력 회복(비율 · 투구 색욕 ① · 2026-10-21 R299) — `killHeal` 이 처치마다 최대 HP × 이 값을 회복한다. 없으면 0
            killHeal: c.option_fx?.killHeal ?? 0,
            // 물약 효과 상승(비율 · 반지 분노 ③ · 2026-10-29 R382) — `drinkPotions` 가 체력 회복 +% 와 한 괄호에 더한다. 없으면 0 — 종전과 같다
            potionPct: c.option_fx?.potion ?? 0,
            defIgnore: c.def_ignore, resReduction: c.res_reduction,
            // 반지 · 목걸이 옵션 [2026-09-21 · R127] — 원소별 저항 무시(`strike` 가 그 타격 원소만 읽는다) · 버프 지속시간(`castBuff` 가 거는 쪽 값을 읽는다). 없으면 null · 0
            resReductionEl: c.res_reduction_el ?? null, buffDur: c.option_fx?.buffDur ?? 0,
            // 빙결 시간 감소 [2026-09-28 · R177 · battle_design §2-4] — **받는 쪽** 값(비율 · 신발 · 반지 · 목걸이). `rt.applyStatus` 가 `AILMENTS.freeze.cut` 으로 읽는다. 없으면 0
            freezeDur: c.option_fx?.freezeDur ?? 0,
            // 화상 · 중독 · 스턴 시간 감소 [2026-09-28 · R178 · battle_design §2-5] — 받는 쪽 값(비율 · 공통옵션). `AILMENTS[..].cut` 이 이 이름을 읽는다. 없으면 0
            burnDur: c.option_fx?.burnDur ?? 0, poisonDur: c.option_fx?.poisonDur ?? 0, stunDur: c.option_fx?.stunDur ?? 0,
            // 매력의 받는 시간 감소 [2026-10-24 · R346 · battle_design §2-4] — 상태이상 · 상대 편이 건 창에 `rt.applyStatus` 가 곱한다(장비 감소 다음). 없으면 0
            ddr: c.debuff_dur_reduction ?? 0,
            skillMult: 1, bonusPct: c.dmg_bonus_pct, // 피해량(도감) — 따로 곱한다(2026-09-18) · strike 가 읽는 이름과 같아야 한다
            crit: c.crit_rate, critDmg: c.crit_damage, ls: c.life_steal, reflect: c.reflect_damage,
            // sustain 두 축 중 재생 쪽 (battle_design §8) — 초당 회복이라 틱마다 누산한다
            regen: c.hp_regen ?? 0, regenBase: c.hp_regen ?? 0, regenAcc: 0,
            cdr: c.cooldown_reduction ?? 0,          // 표기 쿨 단축(비율) — 시전 시점에 곱한다
            // 나태 T2 겹이 미는 쿨감의 원값 [2026-10-05] — 겹이 있으면 틱마다 `cdr = cdrBase + 겹 몫`(advance) · 없으면 `cdr` 그대로
            cdrBase: c.cooldown_reduction ?? 0,
            // 죄종 마스터리 T2 조건부 [2026-10-05 · skill_design §3-2 · INTERFACE §2-6 「마스터리 조건부」] — `strikeOnce` 가 그 타격 동안만 얹는다 · 겹(`tick`) 줄은 따로 든다. 없으면 null
            mcond: c.mastery_cond ?? null,
            mtick: c.mastery_cond?.some(m => m.cond === 'tick') ? c.mastery_cond.filter(m => m.cond === 'tick') : null,
            // 폭식 T3 겹 [2026-10-24 · R343 · skill_design §3-3] — `mfeast` = 그 줄(`{v, cap}` — 상한은 랭크가 정한다) · `feast` = 지금 겹(직격이 맞을 때마다 +1 · 라운드를 열면 0). 없으면 null
            mfeast: c.mastery_cond?.find(m => m.cond === 'feast') ?? null, feast: 0,
            period: c.action_period, basePeriod: c.action_period,
            // 주기의 재료 [2026-10-29 · R386 · battle_design §2] — 버프 공속을 장비 공속과 **한 합**에 넣어 다시 쓴다(`skill_effects` 능력치 표) · 없으면(옛 전투 능력치) `basePeriod` 를 원값 · 장비 공속 0 으로 본다
            periodRaw: c.period_raw ?? c.action_period, speedBase: c.speed_pct ?? 0, periodWeapon: c.period_weapon ?? c.action_period, periodFloor: B.period_floor_sec,
            // 행동 게이지는 **빈 채로 출발한다** [2026-10-02 · 사용자 확정 · R200 · battle_design §6 — ~~`next: 0` 곧바로 차례~~] — 첫 차례(마법 무기는 첫 칸)는 한 바퀴 뒤.
            //   자리가 정하는 엇갈림(파티 편성 차례 · 적 등장 지연)은 부르는 쪽이 extra 로 더 얹는다 · `fillAt` = 그 게이지가 차기 시작하는 시각(재생기 표시값)
            next: c.action_period, fillAt: 0,
            // 마법 무기의 쌓인 칸 [2026-10-02 · R200 · battle_design §3] — `noBasic` 만 읽는다 · 상한 [balance.csv:cast_charge_max]
            charges: 0,
            // 물리 경직 (battle_design §2-3 · R110) — 타격 회복(비율)이 경직 시간을 줄이고, `stagUntil` 은 경직이 끝나는 시각이다(`stagger`)
            fhr: c.fhr ?? 0, stagUntil: 0,
            // 죄종 계열 옵션 [2026-10-05 · R206 · R208 · item_design §1] — 내가 건 경직 +% · 시전 칸 충전 확률 · 시전 누적 겹 값 · 내가 건 상태이상 / 디버프 +% · 회복량 +%.
            //   `combat.option_fx` 에서 온다(없으면 0 — 종전과 같다) · 몬스터도 든다 · `castStacks` 는 전투 안에서만 사는 겹 수(라운드가 바뀌면 0 · `beginRound`)
            staggerDur: c.option_fx?.staggerDur ?? 0, castRefund: c.option_fx?.castRefund ?? 0, castStack: c.option_fx?.castStack ?? 0,
            statusDur: c.option_fx?.statusDur ?? 0, debuffDur: c.option_fx?.debuffDur ?? 0, healOut: c.option_fx?.healOut ?? 0,
            castStacks: 0,
            // 스턴이 끝나는 시각(`stun` · battle_design §2-7) · 중독 틱 누산(`poisonTick` · §2-6) — 전투 안에서만 사는 값 (2026-09-28 · R178)
            stunUntil: 0, dotAcc: 0,
            actives: [], buffs: {}, barrier: null,
            reactions: [],                           // 사건 훅 등록 자리 (⚠ 지금은 아무도 싣지 않는다)
            // 파티 정산의 제 몫 [2026-10-05 · INTERFACE §2-6 「파티 골드 · 드랍 · 매직 배율」] — `find_own` 을 모르는 입력(손으로 만든 검증 유닛)은 표시값을 쓴다 ·
            //   `findParty` = 파티 단위 출처(도감 · 전술 · 신단)의 원값 — 정산이 한 번만 더한다
            goldFind: c.find_own?.gold ?? c.gold_find, itemFind: c.find_own?.item ?? c.item_find, findParty: c.find_party ?? null,
            // 무기 옵션 묶음 [2026-09-11 · R78] — 조건부 % · 타격 시 창 · 강타 · 매직아이템 획득확률. 없으면 null(몬스터·소환·옵션 없는 영웅)
            //   `strikeOnce` 는 `fx` 가 있을 때만 읽는다 — 타격마다 아이템을 훑지 않게 전투 시작에 한 번 묶어 둔다
            fx: c.option_fx ?? null, magicFind: c.find_own?.magic ?? c.option_fx?.magicFind ?? 0,
            // 기본 능력치 — 영웅은 `partyUnits[].stats`, **몬스터는 `monster.csv` 의 7컬럼**이 extra 로 들어온다 (2026-09-11 R79).
            //   기본값 null 은 **소환**의 몫이다 — null = 스킬 계수 0 (skill.js scaleDef · 2026-09-10)
            stats: null,
            // 타격 동안만 — `strikeOnce` 가 얹고 원복한다(능력치 계수 · 조건부 % · 스킬의 추가 피해 확률·배수). 평소 계수 1 · 나머지 0
            //   ~~`flat`(능력치 항 · 덧셈)~~ 은 2026-09-18 폐기 — 능력치는 곱이다(battle_design §9-2)
            statMult: 1, condPct: 0, procChance: 0, procMult: 0,
            ...extra,
        };
        // 지난번에 알린 지금 값 [R305 · INTERFACE §2-6 `stat`] — 처음 = 이 유닛을 만든 시트 그대로(창이 아직 없다). 갈아입어도 잇는다(`REFIT_FIELDS` 밖) · 소환물은 안 센다
        u.shown = u.summon ? null : liveRows(u);
        return u;
    }

    /* 갈아입기가 새로 받는 필드 [2026-09-14 · R89] — **전투 능력치에서 오는 것만**(위 `makeUnit` 의 필드). 전투 안에서 사는 것 —
       HP · 창 · 배리어 · 행동 예약 · 경직 끝 시각 · 스킬 칸 · 재생 누산 · 자리 · 훅 · 스킬 타격 임시 필드 — 은 여기 없고 이어진다 */
    const REFIT_FIELDS = ['hpMax', 'hpMaxBase', 'atkMin', 'atkMax', 'atkMinBase', 'atkMaxBase', 'atkPct', 'dmgPct', 'mainMult', 'matkMin', 'matkMax', 'matkMinBase', 'matkMaxBase', 'atkType', 'noBasic', 'sureHit',
        'def', 'defBase', 'res', 'resBase', 'lvl', 'hitBonus', 'resMaxBonus', 'resMaxEl', 'dr', 'drBase', 'drFlat', 'counter', 'recv', 'killHeal', 'defIgnore', 'resReduction',
        'resReductionEl', 'buffDur', 'freezeDur', 'recvBase', 'burnDur', 'poisonDur', 'stunDur', 'ddr',
        'staggerDur', 'castRefund', 'castStack', 'statusDur', 'debuffDur', 'healOut', 'potionPct',
        'bonusPct', 'crit', 'critDmg', 'ls', 'reflect', 'regen', 'regenBase', 'cdr', 'cdrBase', 'period', 'basePeriod', 'periodRaw', 'speedBase', 'periodWeapon', 'fhr',
        'goldFind', 'itemFind', 'findParty', 'fx', 'magicFind', 'stats', 'mcond', 'mtick', 'mfeast', 'liveAtk'];

    /**
     * 소환 유닛 — **HP 와 대상 풀 참여만** 있는 유닛 (skill_design §12-6 프로즌월).
     * 행동하지 않으므로 행동 주기도 AI 도 대상 선택도 없다 — `next: Infinity` 라 차례가 영원히 안 온다.
     * 공격·방어 축은 전부 0 이고 HP 만 든다: **펫 서브시스템을 여는 것이 아니다**(기획 §12-6 이 못박은 구분).
     * @param caster 시전자 · @param def 시전 단위(`summon` 줄 — `mult` = 시전자 최대 HP 의 비율 · `statMult` = 능력치 계수 — 런타임이 `scaleDef` 가 낸 것을 넘긴다 · 2026-09-18) · @param key 유닛 키
     */
    function makeSummon(caster, def, key) {
        const hp = Math.max(1, Math.round(caster.hpMax * def.mult * (def.statMult ?? 1)));
        const zero = {
            hp_max: hp, atk_physical: NO_DMG, atk_magic: NO_DMG, atk_pct_sum: 0, attack_type: 'physical',
            defense: 0, res_fire: 0, res_cold: 0, res_lightning: 0, res_poison: 0,
            level: caster.lvl, res_max_bonus: 0, damage_reduction: 0, def_ignore: 0, res_reduction: 0,
            dmg_bonus_pct: 0, crit_rate: 0, crit_damage: 0, life_steal: 0, reflect_damage: 0,
            hp_regen: 0, cooldown_reduction: 0, action_period: 0, gold_find: 0, item_find: 0,
        };
        // ⚠ **소환물은 전열에 선다** [임시 2026-09-09] — 벽의 목적이 대상 풀 희석인데 후열에 세우면
        //   전열 우선(§3-1) 아래에서 아무도 안 때려 존재가 사라진다. **자리는 기획 미확정**이다 (GAME_DESIGN §10 「소환 벽의 자리」)
        return makeUnit(caster.side, zero, { key, summon: true, summonOf: caster.key, next: Infinity, rank: 0 });
    }

    /**
     * 몬스터 → 전투 유닛. **영웅과 같은 함수를 지난다** [전면 개정 2026-09-11 · R79 · 사용자 지시 ·
     *   monster_design §5-1 · battle_design §8-1]. ~~`combatFromMonster`~~ 는 삭제됐다 —
     *   필드 이름을 맞추는 것이 아니라 **같은 `computeCombat` 을 부른다**. 그래서 「계산이 한 곳」이 문자 그대로 성립하고
     *   이식 대조도 한 함수로 양쪽을 검증한다.
     *
     * 입력 = **레벨과 무관한 모양**(직업 · 기본 능력치 7 · 고유 스킬) + **스폰 때 굴린 장비**.
     *   크기는 던전 레벨과 등급이 장비로 준다 — ~~소재값 × 등급 배율~~ 은 컬럼째 없어졌다(`hp`·`attack`·`action_period`).
     * 몬스터 전용으로 남는 것은 두 줄뿐이다:
     *   ① **몸값 합류** — `defense` · `res_*` 는 몸이 들고 장비가 그 **위에** 더한다 [사용자 확정 · monster_design §7].
     *      도감이 저항을 공략 정보로 적고(§8) 굴린 장비로 판마다 요동치면 「이 원소를 막았나」가 안 읽히기 때문이다(§9-5)
     *   ② **몬스터 전용 전역 배율** — 합계에 곱한다(캘리브레이션 조절값). 등급 세기는 `hp_mult` 하나만 남았다 —
     *      **HP 는 장비에서 안 오기 때문**이다(영웅 체계에서 HP 는 레벨이 준다). ~~`atk_mult`·`def_mult`·`res_add`~~ 퇴역
     *   ~~③ `attack_type` 덮기 — 원소를 정하는 것은 스테이지다~~ → **2026-10-02 폐기 · R198** — 평타는 언제나 물리, 원소는 스킬만 낸다(battle_design §2-1).
     *      `monster.csv:attack_type` 컬럼째 없다. 마법 무기를 낀 몬스터는 영웅과 같이 평타를 안 친다(`basic_attack`)
     *
     * ⚠ 치명·재생 **밑수도 영웅과 같이 받는다** [D2 사용자 확정 2026-09-11] — 특수 분기를 두지 않는 것이 목적이라
     *   `crit_rate`·`hp_regen` 을 0 으로 덮지 않는다. 마법 무기를 낀 몬스터는 `atk_magic`(= matkMin·matkMax)을 갖는다(monster_design §5-1 이 인정).
     * 보상 축(경험치·골드·드롭 배율)은 영웅에게 없는 필드라 등급에서 따로 얹는다.
     * @param gear 그 몬스터가 **입고 있는** 아이템 배열 (`item.rollGear` 결과). 비면 맨몸이다 — 검증에서 한 마리만 만들 때 쓴다
     * @param extra `thirdSkill`(보스의 한 칸 더 — 스폰 굴림) · `difficulty`(그 런의 단 — 스킬 칸 수 R269 · 몬스터 데미지 · HP 배수 R301)는 여기서 꺼내 쓰고 나머지는 유닛에 그대로 얹는다
     */
    function makeEnemy(key, monsterId, grade, lvl, gear = [], extra = {}) {
        const m = data.monsters[monsterId];
        const g = data.grades[grade];
        const { thirdSkill = null, difficulty = null, ...rest } = extra;
        // 몬스터 레벨 = 스테이지 레벨(인자 `lvl`) + 몬스터별 가산 [2026-09-28 · 사용자 「사탄만 13」 · monster_design §7 · INTERFACE §2-6] · 만렙에서 자른다(2026-10-24) —
        //   아래 전투 능력치 · 적중(`makeUnit` 의 `lvl`) · 처치 XP 가 더한 레벨을 읽는다. 입은 장비 ilvl 의 가운데는 `spawnRound` 가 스테이지 레벨로 굴려 안 타고 위 끝만 이 레벨이다
        const levelAdd = m.level_add;
        if (!Number.isInteger(levelAdd) || levelAdd < 0) throw new Error(`battle: 몬스터 ${monsterId} 의 level_add '${levelAdd}' — 0 이상 정수여야 한다 (monster.csv)`);
        lvl = monsterLevelOf(m, lvl);
        const stats = { str: m.str, agi: m.agi, int: m.int, vit: m.vit, luck: m.luck, ldr: m.ldr, cha: m.cha };
        // 영웅과 같은 경로 — `mastery` 가 없으니 마스터리 몫은 0 이고 `codex`·`party` 도 안 넘긴다
        // 입력에서 다른 것은 **레벨 1 HP 바탕** 하나다 — 영웅 `hero_hp_base` 대신 `monster_hp_base` [2026-09-14 사용자 지시 · R91 · monster_design §5]
        const c = HS.computeCombat({ stats, level: lvl, cls: m.cls, innate: m.innate_skill, hpBase: B.monster_hp_base }, gear);
        c.defense += m.defense;                                             // ①
        for (const el of ELEMENTS) c[`res_${el}`] += m[`res_${el}`];        // ①
        c.hp_max = Math.round(c.hp_max * g.hp_mult * B.monster_hp_scale * hpMultOf(difficulty));   // ② · 그 런 단의 배수 (R301)
        // 공격력은 범위다 — 전역 배율 · 단의 배수는 양끝에 같이 곱한다 (R90 · R301)
        const dmgScale = B.monster_atk_scale * dmgMultOf(difficulty);
        for (const k of ['atk_physical', 'atk_magic']) {
            if (c[k] !== undefined) c[k] = { min: c[k].min * dmgScale, max: c[k].max * dmgScale };
        }
        c.defense *= B.monster_def_scale;
        // 종족의 몸 [2026-10-29 · R388 · monster_design §3-1 — D1 ~ D3] — **일반몹 · 정예만**(⚠ Q2 — 보스는 대기) 그 종족 줄을 곱한다(원소 저항은 더한다).
        //   단 배수 · 전역 배율 뒤 · 아래 시트 복사본 앞이라 툴팁 Alt 값에 든다 · 줄이 없으면 안 건드린다 · rng 0
        const body = grade === 'normal' || grade === 'elite' ? RACES[m.monster_type] ?? null : null;
        if (body) {
            c.hp_max = Math.round(c.hp_max * body.hp);
            c.hp_regen *= body.regen;
            for (const k of ['atk_physical', 'atk_magic']) if (c[k] !== undefined) c[k] = { min: c[k].min * body.dmg, max: c[k].max * body.dmg };
            c.defense *= body.def;
            for (const el of ELEMENTS) c[`res_${el}`] += body.res;
        }
        // 능력치 계수는 **영웅과 같다** [2026-09-22 사용자 — 보류 해제 · battle_design §9-2] — 평타는 `computeCombat` 이 낸
        //   `main_attr_mult`(힘 · 마법 무기는 평타가 없다 — R198) 그대로 · 스킬의 데미지 슬롯은 시전 순간 `stats` 로 `scaleDef` 가 곱한다
        /*
         * 스킬 칸 — **난이도가 연다 · 보스는 한 칸 더** [2026-10-18 · R269 · monster_design §5-1 — ~~등급이 연다~~(일반 1 · 정예 빈 둘째 칸 · 보스 셋째 칸)].
         *   **칸은 출처 자리**라 「있는 것 중 앞에서 n개」가 아니다 — 열리지 않은 출처를 `activesFor` 에 **넘기지 않는다**(`slotPlan`).
         *   정예는 일반몹과 같다(정예는 장비와 특성으로 세다 — §6)
         */
        const plan = slotPlan(m, g, difficulty);
        // ⚠ `activesFor` 는 **인스턴스**(`{id, source}`)를 낸다 — 파티 경로와 같이 **정의를 풀고 `readyAt` 을 얹어야** 한다.
        //   안 풀면 `skill.castable(def, …)` 이 undefined 를 읽는다 (INTERFACE §2-6 「전투 유닛」 actives 행)
        //   무기 판정은 영웅과 같은 규칙이다 — 무기가 필요한 스킬이 **든 무기**의 무기군과 안 맞으면 꺼진다 · 지금 데이터는 전부 맞는다 (R204 · skill_design §2-2).
        //   든 무기군 = 입은 무기의 `group` — `monster.csv:weapon_group` 이 `-` 면 판마다 굴린 것이다(`wearGear` · 2026-10-23 · R324) · 맨몸이면 박힌 값
        const fits = fitterOf(gear.find(it => it.slot === 'weapon')?.group ?? m.weapon_group);
        //   낀 장비의 특정 스킬 +n 은 **영웅과 같은 규칙**으로 고유 · 2칸 레벨에 더해진다(보스의 한 칸 더는 안 받는다 · 2026-10-08 · R225)
        const acts = SK ? SK.activesFor({ innate: plan.innate, bookSkill: plan.second }, {
            thirdSkill: plan.rolled ? thirdSkill : null,
            skillPlus: data.itemSystem?.skillPlusOf?.(gear) ?? {},
        }).map(a => {
            const def = SK.resolve(a);
            if (!def) throw new Error(`battle: 몬스터 ${monsterId} 의 알 수 없는 스킬 ${a?.id ?? a}`);
            return slotOf(a, def, fits, 0);
        }) : [];
        // 세부 능력치 복사본 [2026-09-14 · R94 · INTERFACE §2-6 `round`] — 유닛 툴팁이 Alt 로 펴는 **표시값**이다(SCREEN_DESIGN §2).
        //   위 ①② 까지 먹은 값 그대로이고 전투 내부용(`option_fx` 묶음 · `atk_pct_sum` 괄호 합 · 평타 계수 · 평타 여부)만 뺀다.
        //   전투는 이것을 안 읽는다(유닛 필드가 따로 있다) · rng 0
        const sheet = { ...c };
        delete sheet.option_fx;
        delete sheet.atk_pct_sum;
        delete sheet.main_attr_mult;   // 평타 능력치 계수 — 시트 행이 아니다(2026-09-18)
        delete sheet.basic_attack;     // 평타 여부 — 시트 행이 아니다(2026-10-02 · R198)
        // 파티 정산 재료 · 마스터리 조건부 줄 — 시트 행이 아니다(2026-10-05) · 몬스터는 마스터리가 없어 `mastery_cond` 는 null 이다
        delete sheet.find_own; delete sheet.find_party; delete sheet.mastery_cond;
        for (const k of ['atk_physical', 'atk_magic']) if (sheet[k]) sheet[k] = { ...sheet[k] };
        return makeUnit('enemy', c, {
            key, monsterId, grade, gear, sheet,
            rank: rankOfRole(m.role),        // 진형 — 역할이 자리를 정한다 (battle_design §3-1)
            monsterType: m.monster_type,     // 종족(Normal/Demon/Undead) — 무기 옵션 vs 종족이 읽는다 (R78)
            family: FAMILIES[m.monster_base] ? m.monster_base : null,   // 부류 — 기믹이 읽는다(표에 있는 것만 · 보스 · 6 · 7장은 null — R388)
            cls: m.cls,                      // 직업 — 스킬 풀과 무기군을 정한다. 자리는 role 이 정한다 (monster_design §5-1)
            stats,                           // 기본 능력치 — 스킬 계수가 시전 순간 읽는다 (skill.js scaleDef · 영웅과 같다)
            actives: acts,
            // 처치 XP 는 몬스터 레벨이 정한다 — 레벨·등급이 같으면 몬스터가 달라도 같다. `exp_coef` 는 몬스터별 조정 칸 (monster_design §7 · R85)
            //   XP 는 레벨 표(`level_xp.csv`) · 골드는 옛 지수 곡선(`monster_gold_*`)을 따로 탄다 (2026-09-28 · PLAN_early_progression D3)
            //   골드는 등급의 `exp_mult` 를 안 탄다 — 등급은 `goldMult`(= `gold_mult`) 한 번만 곱한다 (2026-10-23 · R330 · monster_design §7)
            expReward: MONSTER_XP.get(lvl) * g.exp_mult * m.exp_coef,
            goldReward: B.monster_gold_base * B.monster_gold_growth ** (lvl - 1) * m.exp_coef,
            goldMult: g.gold_mult, dropChanceMult: g.drop_chance_mult,
            // **도안 후보** = 스폰 때 든 칸 중 책이 되는 것 [2026-10-16 · R266 · 2026-10-18 · R269 「쥔 스킬이면 어느 칸이든」 · 2026-10-20 · R293 — ~~`codexSkills` 스킬 도감이 세는 스킬~~] —
            //   영웅이 배울 수 있는 것만(몬스터 전용 · 불러내기는 책이 없다 — `skill.bookable` · R258) ·
            //   오오라는 라운드 시작에 `actives` 에서 빠지므로 **여기서** 적는다 · 꺼진 칸도 든다(썼는지는 안 본다) · 칸 순서 · 같은 id 는 하나 · rng 0
            blueprintSkills: SK ? [...new Set(acts.map(a => a.id))].filter(id => SK.bookable(id)) : [],
            ...rest,
        });
    }

    /**
     * 정예 특성 칸 [2026-10-24 · R344 · monster_design §6 · INTERFACE §5-2] — 죄종 칸(그 죄종 마스터리 T1) → 능력치 칸 → 방어 칸을 **각 1회**,
     *   **단과 무관하게 언제나 3회** 굴리고 그 단이 연 칸(`eliteSlotsOf` — 앞에서부터)만 싣는다. 소비 수가 단에 의존하면
     *   같은 시드가 단마다 다른 편성을 낸다(선택 부위 「입나」와 같은 이유). 효과는 아직 없다(값 미정 — 굴림 · 표시만)
     * @returns [{slot: 'sin'|'stat'|'def', id}]
     */
    const ELITE_SLOTS = ['sin', 'stat', 'def'];
    const rollEliteTraits = (rng, sin, difficulty) => {
        const at = list => list[Math.floor(rng() * list.length)];
        const all = [{ slot: 'sin', id: at(ET.sin[sin]) }, { slot: 'stat', id: at(ET.stat) }, { slot: 'def', id: at(ET.def) }];
        return all.slice(0, Math.min(ELITE_SLOTS.length, eliteSlotsOf(difficulty)));
    };

    /**
     * 라운드 편성 — 구조는 그 스테이지의 세트(stage_round), 내용물은 예산(round_budget) 안에서 랜덤.
     * 챕터보스 스테이지는 일반몹 풀이 비어 있다 — 1 ~ 5장은 정예 호위 명단(`spawn_rule.js` · 2026-10-23 · R329)이 서서 풀을 안 뽑고,
     *   6 · 7장은 호위 예산이 0 이라 `pick` 을 한 번도 안 부른다(호위 수 굴림 1회는 그대로 돈다)
     *
     * **2단이다** [개정 2026-09-11 · R79 · INTERFACE §5-2]:
     *   **1단 편성** — 누가 나오나. 스테이지 편성 예외(`spawn_rule.js`)가 뽑을 목록과 범위를 바꾸고, 소환사가 서면 상한까지 채운다 [2026-09-18].
     *     예외가 없는 스테이지는 굴림 순서·횟수가 **종전과 같다**
     *   **2단 장비·스킬** — 편성이 확정된 뒤 목록 자리마다 차림과 보스 셋째 스킬을 별도 수열에서 굴린다.
     *     편성 · 차림 · 스킬 · 처치 드롭은 만남 씨앗을 공유하되 서로의 소비 횟수에 영향받지 않는다.
     *
     * ⚠ **1단이 2단보다 앞인 것이 계약이다** — 장비 굴림이 편성 굴림을 밀면 같은 시드가 다른 편성을 낸다
     *   (`rollFace` 를 맨 뒤에 두는 것 · `searchRoll` 의 「결과를 먼저, 이야기를 뒤에」와 같은 규칙).
     * ⚠ **전역 상한도 1단에서 자른다** — 잘릴 유닛의 장비를 굴리면 수열이 편성 상한에 종속된다.
     * @param magicFind 파티 평균 매직아이템 획득확률(비율) — 장비 희귀도의 레어 가중치에 곱한다 (item_design §1 4단계)
     * @param level 몬스터 레벨 = **이번 런의 스테이지 레벨** — 안 주면 기본 레벨 `dlvl` (2026-09-14 · R87)
     * @param seed 이 라운드의 만남 씨앗 — 편성 · 차림 · 스킬 · 드롭 수열을 따로 파생한다
     * @param wearChance 선택 부위 착용 확률 — 그 런의 단 (2026-10-12 · R245 · `wearGear`)
     * @param difficulty 그 런의 단 id — 스킬 칸 수를 고른다(`makeEnemy` · `slotPlan` · 2026-10-18 · R269 · rng 0)
     * @param cxMagic 몬스터 id → 그 몬스터 종족의 도감 Lv1 매직 몫(`codexOf().farm.magic`) 또는 null — 그 한 마리의 차림 굴림 `magicFind` 에 체감 밖에서 더한다
     *   [2026-10-22 · R314 · INTERFACE §2-6 「도감 사다리」] · 차림 줄은 유닛마다 제 줄이라 전투 줄을 안 민다 · 0 이면 더해도 종전 값이다
     */
    function spawnRound(seed, stage, pool, n, magicFind = 0, level = stage.dlvl, wearChance = 1, difficulty = null, cxMagic = null) {
        const rng = makeRng(deriveSeed(seed ^ ENCOUNTER_STREAMS.formation, 0));
        const type = stageRounds(stage).find(r => r.round_num === n)?.round_type ?? 'normal';
        const budgetKey = type === 'boss' ? stage.boss_grade : type;
        const bd = data.budgets[budgetKey];
        // 스테이지 편성 예외 — 뽑을 목록과 범위 (INTERFACE §2-13). 예외가 없으면 목록이 `pool` 그 자체다
        const draw = roundDraw(stage, pool, n, bd);
        const specs = [];
        // 소환사가 섰나 — 서면 그 뒤의 뽑기는 소환사를 뺀 풀에서 한다(소환사는 라운드에 하나)
        const called = () => specs.some(s => draw.summoners.has(s.id));
        // `reserve` = **소환사 뒤에 뽑힌 몫**(채움 포함) — 라운드 시작에 서지 않고 소환사의 불러내기를 기다린다 (INTERFACE §2-13 · 2026-09-18).
        //   소환사가 라운드 시작에 먼저 서고 나머지를 부른다(사용자 지시) — 소환사보다 먼저 뽑힌 몬스터만 함께 선다.
        //   **무리와 함께 서는 소환사**(`standing` · 1-1 · 2026-10-21)는 대기를 안 만든다 — 채운 몫까지 라운드 시작에 선다 · 굴림은 같다
        const waits = () => specs.some(s => draw.summoners.has(s.id) && !draw.standing.has(s.id));
        const add = (id, grade, extra) => specs.push({ id, grade, extra, reserve: waits() });
        const usable = ids => (called() ? ids.filter(id => !draw.summoners.has(id)) : ids);
        const pick = (ids = draw.roundPool) => {
            const from = usable(ids);
            return from[Math.floor(rng() * from.length)];
        };
        const between = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

        /* ── 1단 편성 (예외가 없는 스테이지는 굴림 순서·횟수 불변) ── */
        if (type === 'boss') {
            add(stage.boss_monster_idx, stage.boss_grade);
            if (draw.guards) {
                // 정예 호위 명단 [2026-10-23 · R329 · monster_design §4] — 명단 순서대로 정예로 선다 · 호위 수 · 풀은 안 굴린다 ·
                //   정예마다 죄종 1 → 특성 3(정예 라운드의 정예와 같은 묶음 — 후보 뽑기만 없다 · R344)
                for (const id of draw.guards) {
                    const sin = data.sins[Math.floor(rng() * data.sins.length)];
                    add(id, 'elite', { sin, traits: rollEliteTraits(rng, sin, difficulty) });
                }
            } else {
                const escorts = between(...draw.escorts);
                for (let i = 0; i < escorts; i++) add(pick(), 'normal');
            }
        } else {
            for (let i = 0; i < bd.elite_count; i++) {
                // 정예 = 일반몹 1종 + 특성 칸(단이 연다 · R344 · monster_design §6). 죄종은 이 판에서 7 중 무작위 — 후보를 뽑은 뒤 특성 3회
                const sin = data.sins[Math.floor(rng() * data.sins.length)];
                const eid = pick(draw.elitePool);
                add(eid, 'elite', { sin, traits: rollEliteTraits(rng, sin, difficulty) });
            }
            const normals = between(bd.normal_min, bd.normal_max);
            // 반대 줄 보장 [2026-10-21 · R304 · 사용자 지시] — 정예가 섰으면 정예와 반대 줄(`monster_role.csv:rank`)이 하나는 선다:
            //   마지막 한 마리까지 반대 줄이 없으면 그 한 마리는 반대 줄 후보에서 뽑는다(굴림 1회 그대로).
            //   라운드 풀에 반대 줄이 없는 장소(5-4 — 「앞줄이 없는 판」 · 6-3 · 7-1 · 7-2)는 라운드 풀 그대로다
            const rankOf = id => rankOfRole(data.monsters[id].role);
            const elite = specs.find(s => s.grade === 'elite');
            const across = elite ? draw.roundPool.filter(id => rankOf(id) !== rankOf(elite.id)) : [];
            for (let i = 0; i < normals; i++) {
                const owed = elite && i === normals - 1 && !specs.some(s => rankOf(s.id) !== rankOf(elite.id));
                add(pick(owed && usable(across).length ? across : undefined), 'normal');
            }
        }
        // 소환 — 소환사가 섰으면 라운드를 상한 [balance.csv:wave_monster_max] 까지 채운다 · 채움마다 1회 (INTERFACE §5-2).
        //   소환사 뒤의 몫은 **대기**다(`add`) — 장비는 아래 2단에서 다른 유닛과 같은 순서로 굴리고(편성 수열 불변) 서는 것만 불러내기가 한다
        if (called()) while (specs.length < B.wave_monster_max) add(pick(), 'normal');
        // 전역 상한 [balance.csv:wave_monster_max] — 어떤 편성도 넘지 못한다
        const kept = specs.slice(0, B.wave_monster_max);

        /* ── 2단 장비·스킬 ── */
        const list = kept.map((s, k) => {
            const m = data.monsters[s.id];
            const g = data.grades[s.grade];
            // 차림 — 아이템 레벨 · 희귀도 가중치 규칙은 `wearGear` 한 곳이다(실험실이 같은 함수를 부른다 · 2026-10-10)
            // 제 줄 = (라운드 씨앗 · 용도 · 목록 자리) — 앞 몬스터나 부위의 굴림 수가 뒤 차림을 안 민다.
            const mf = cxMagic ? magicFind + cxMagic(s.id) : magicFind;   // 도감 Lv1 매직 — 그 종족 몫(R314)
            const gear = wearGear(deriveSeed(seed ^ ENCOUNTER_STREAMS.gear, k), m, g, level, mf, wearChance, gearWeightsOf(g, difficulty), gearFixedOf(difficulty));
            // 보스의 한 칸 더 — 보스만(`skill_slots_add` ≥ 1 · R269 — ~~`skill_slots` ≥ 3~~ 같은 유닛이라 순서 · 횟수 불변). ⚠ **풀이 비어도 1회 소비한다**(무기 베이스·스킬 굴림과 같은 규칙).
            //   2칸(나이트메어)은 굴리지 않는다 — `nightmare_skill` 이 정한다
            let thirdSkill = null;
            if (g.skill_slots_add >= 1) {
                const cp = CLASS_SKILLS[m.cls] ?? [];
                const tr = makeRng(deriveSeed(seed ^ ENCOUNTER_STREAMS.skill, k))();
                thirdSkill = cp.length ? cp[Math.floor(tr * cp.length)] : null;
            }
            const u = makeEnemy(`e${k}`, s.id, s.grade, level, gear, { ...s.extra, thirdSkill, difficulty });
            // 보상은 처치 순간 판정하되 굴림은 그 몬스터 자리로 정한다. 불러내기로 나중에 서도 같은 카드다.
            u.dropSeed = deriveSeed(seed ^ ENCOUNTER_STREAMS.drop, k);
            u.spawnNo = k;
            return u;
        });
        // 무리 [2026-09-18 · INTERFACE §2-13] — 소환사는 그 라운드의 다른 적 전부를 든다(대기 포함). `called` = 지금 서 있거나 한 번 선 적이 있다 —
        //   대기만 거짓으로 출발하고 라운드 시작의 적 배열에서 빠진다. 불러내기(`callBand`)가 무리 중 서 있지 않은 것을 세운다 · rng 0
        list.forEach((u, k) => { u.called = !kept[k].reserve; });
        const lead = list.find(u => draw.summoners.has(u.monsterId));
        if (lead) lead.band = list.filter(u => u !== lead);
        return { type, list: list.filter(u => u.called) };
    }

    /**
     * 런 하나 — **라운드 단위로 진행한다** [2026-09-14 · R89 · base_expedition_design §1-1].
     *   `next()` 한 번 = 라운드 하나를 끝까지 계산한다(이기거나 · 전멸하거나 · 시간이 끝나거나). 다음 라운드는 **부를 때 연다** —
     *   그래서 라운드와 라운드 사이에 부르는 쪽(정산)이 끼어들 자리가 생긴다. 이어서 부르기만 하면 한 번에 끝까지 돈 것과
     *   **한 글자도 안 다르다** — `simulate` 가 그렇게 돈다(rng 소비 순서 불변 · INTERFACE §5-2).
     *   **걸음** [2026-09-21 · R130] — `advance(until)` 은 재생 시각까지만 돈다. 원정은 이 길로 가고(`state.stepRun`), 원정 중 교체는
     *   다음 걸음 첫머리의 `refit` 으로 **그 시각에** 들어간다 — 미래를 미리 계산해 두지 않으므로 교체가 남은 라운드를 다시 굴리지 않는다.
     * @param partyUnits [{uid, combat:{...}, actives?: [{id, source}], reactions?: [{on, fn}]}] —
     *   combat = heroSystem.computeCombat 결과, actives = 그 영웅의 액티브 **인스턴스** 목록(skill.activesFor).
     *   없거나 비면 기본 공격만 돈다. reactions = 사건 훅 등록(⚠ 지금은 아무도 싣지 않는다)
     * @param level 이번 런의 몬스터 레벨 · 안 주면 기본 레벨 `dlvl`(출발은 늘 `dlvl` 을 넘긴다 — 위험도 폐지 2026-09-29 · ~~`state.stageLevelState` 의 올린 레벨~~)
     * @param potions 이 런의 물약 칸 `[{id, heal} | null]` — **자리 순**(0 = 앞 칸 · 칸의 `null` = 빈 칸 — R124) · 칸 수 [balance.csv:potion_slot_max] 이하 · 인자 `null` = 빈 목록. 첫 라운드의 칸이고 그 뒤 라운드는 `restock` 이 넘긴 목록으로 다시 찬다 (battle_design §7-1 · R104 · R315).
     *   찬 칸이 없으면(빈 목록 · 전부 null) 물약 단계가 아예 안 돌아 rng · 타임라인이 인자를 안 준 것과 같다
     * @returns `{ next, advance, refit, restock, status, result, ended }` — `next()` = 라운드 하나의 요약(이미 끝났으면 null) ·
     *   `advance(until)` = 그 시각까지만(라운드가 끝나면 그 요약 · 도중에 서면 null · R130) · `refit(partyUnits, fill?)` = 지금 시각에 갈아입기
     *   (`{locked: false, changed}` · `fill` = 가득 채울 영웅 uid — 레벨업 · R182) · `restock(potions)` = 다음 라운드의 물약 칸(R315) · `status()` = `{t, round, kind, inRound}` ·
     *   `result` = 걸음마다 자라는 결과 + 타임라인. 타임라인은 재생용이라 세이브에 넣지 않는다 (리포트만 남긴다)
     * @param slotMax 물약 칸 수 — 게임은 그 세이브의 상한(`state.limitsOf(state).potionSlots`)을 넘긴다 · 안 주면 CSV 기본값 [balance.csv:potion_slot_max] (2026-09-22)
     * @param difficulty 이번 런의 난이도 단 id — 몬스터가 선택 부위를 입을 확률만 고른다(레벨은 `level` 이 든다) · 안 주면 첫 단 (2026-10-12 · R245)
     * @param codexOf 도감 사다리 — 몬스터 id → 그 종족의 닿은 몫 `{race, farm, fight}` 또는 null(`state.codexLadder` · 안 주면 도감 없음 · 칸 없는 몬스터도 null).
     *   **라운드마다 스폰한 몬스터에** 그 순간 값을 `unit.codex` 로 얹는다 (2026-10-18 · R286 · 2026-10-22 · R314 그 종족 전체 · monster_design §8 · INTERFACE §2-6 「도감 사다리」) · rng 0
     * @param potionHp 물약을 마시는 HP 비율 — 이 비율 **미만**인 영웅이 마신다 · 게임은 굳힌 편성의 값을 넘긴다(`squad.potionHp`) · 안 주면 [balance.csv:potion_use_hp_pct] (2026-10-29 · R378)
     * @param encounterSeeds 원정이 발급받은 라운드별 uint32 만남 씨앗 배열 · 길이 = 스테이지 라운드 수 · 결투장에는 못 넘긴다.
     *   없으면 `rng` 첫 굴림에서 만남 루트를 만들어 라운드 번호로 파생한다. 있으면 그대로 복사하고 전투 rng 를 소비하지 않는다.
     */
    function createRun(partyUnits, stageId, rng, level, potions = null, slotMax = B.potion_slot_max, encounter = null, difficulty = null, codexOf = null, potionHp = null, rules = null, encounterSeeds = null) {
        const wearChance = wearChanceOf(difficulty);
        // 결투장은 스테이지 스폰 대신 영웅 팀 스냅샷을 받아 같은 전투 루프를 단판으로 돈다.
        const stage = encounter ? { dlvl: level ?? 1 } : data.stages[stageId];
        let potionSlots = potions ?? [];   // 둘째 라운드부터는 `restock` 이 받아 둔 목록으로 갈아 끼운다 (R315)
        // 칸은 **자리 순**이고 `null` = 빈 칸 — 재고가 모자랐거나 비워 둔 칸 (2026-09-21 · R124)
        if (!Array.isArray(potionSlots) || potionSlots.length > slotMax || potionSlots.some(p => p !== null && !(p?.id && p.heal >= 0)))
            throw new Error(`battle: 물약 칸 ${JSON.stringify(potions)} — [{id, heal} | null] 이고 칸 수 ${slotMax} 이하여야 한다 (INTERFACE §2-6)`);
        if (potionHp !== null && !(Number.isFinite(potionHp) && potionHp >= 0)) throw new Error(`battle: potionHp ${potionHp} — 0 이상 수여야 한다 (INTERFACE §2-6)`);
        const potionLine = potionHp ?? B.potion_use_hp_pct;   // 이 런 내내 같다 — 도중에 편성을 고쳐도 나갈 때의 값 (R378)
        // 몬스터 레벨 = **이번 런의 스테이지 레벨** [2026-09-14 · R87 · base_expedition_design §1-4] — 적 생성 · 장비 아이템 레벨 ·
        //   처치 XP · 적중이 전부 이 값 하나를 읽는다. 스폰의 굴림 횟수는 안 바꾸고, 전투 중 수열은 적중을 따라 갈린다 (INTERFACE §2 simulate)
        const stageLevel = level ?? stage.dlvl;
        const pool = encounter ? [] : stagePool(stage);
        const rounds = encounter ? 1 : stageRounds(stage).length;
        // 잘못된 외부 시드는 난수를 소비하거나 전투를 열기 전에 거절한다. 0 도 유효한 uint32 씨앗이다.
        if (encounterSeeds !== null && (encounter || !Array.isArray(encounterSeeds) || encounterSeeds.length !== rounds
            || !Array.from(encounterSeeds).every(s => Number.isInteger(s) && s >= 0 && s <= 0xFFFFFFFF)))
            throw new Error('battle: encounterSeeds 는 스테이지 라운드 수와 같은 길이의 uint32 배열이어야 한다');
        const suppliedSeeds = encounterSeeds?.slice() ?? null;   // 호출자가 뒤에 배열을 고쳐도 진행 중인 판은 불변
        // 장부 없는 시뮬 · 동굴은 기존처럼 런의 첫 굴림으로 만남 루트를 만든다. 외부 시드를 받은 원정은 전투 줄을 소비하지 않는다.
        const encounterRoot = suppliedSeeds ? null : Math.floor(rng() * 4294967296);
        const roundSeedOf = n => suppliedSeeds ? suppliedSeeds[n - 1] : deriveSeed(encounterRoot, n);

        // 파티 유닛 — 몬스터와 **같은 생성자**를 지난다 (§8-1). 자리가 정하는 것만 extra 로 얹는다
        const party = partyUnits.map((p, i) => makeUnit('party', p.combat, {
            key: `p${i}`, uid: p.uid, group: p.group,
            stats: p.stats ?? null,      // 기본 능력치 — 스킬 계수가 시전 순간 읽는다 (skill.js scaleDef · 2026-09-10)
            rank: p.rank ?? 0,           // 진형 — 편성이 정한 자리 (state.formationState · 배치가 없으면 전열)
            // 첫 차례를 살짝 엇갈리게 — 동시 발동 시각 차이만 준다. 빈 게이지 한 바퀴 **뒤에** 얹는다 (R200 · INTERFACE §5-3)
            next: p.combat.action_period + i * 0.3, fillAt: i * 0.3,
            reactions: p.reactions ?? [],   // ⚠ 싣는 소비자가 아직 없다 — 마스터리 T3 자리
            potionReadyAt: 0,            // 제 물약이 다시 준비되는 시각 — **준비 상태로 출발한다**(스킬과 같은 규칙 · R103). 갈아입기(`refit`)가 안 건드린다
            // 칸 순서 = 출처 자리. **준비 상태로 출발한다** [개정 2026-09-15 · R100 · battle_design §6] — 첫 준비 시각 0.
            //   동시 준비는 칸 순서라(`SK.pickReady`) 첫 차례는 1번 칸이다. rng 0
            //   든 무기가 안 맞는 칸(무기가 필요한 스킬 · 출처 무관)은 꺼진 채 선다 — 멈춘 쿨 0 (R187 · R204 · `slotOf`)
            actives: (fits => (SK ? p.actives ?? [] : []).map(a => {
                const def = SK.resolve(a);
                if (!def) throw new Error(`battle: 알 수 없는 스킬 ${a?.id ?? a}`);
                return slotOf(a, def, fits, 0);
            }))(fitterOf(p.weaponGroup)),
        }));
        /*
         * 전투 시작 시 행동 게이지 +% [2026-10-21 · 사용자 · R303 · item_design §1 「10-21 방어구 개정」 — 가죽 신발 특성 · battle_design §6] —
         *   빈 채로 출발하는 게이지(R200)를 그 비율만큼 채운 채 세운다: 남은 시간(`next`)을 `값 × 주기` 만큼 당기고, 재생기가 보는 시작 시각(`fillAt`)도 같이 당긴다.
         *   **상한은 한 바퀴 직전까지**(사용자 10-21) — 남은 시간이 한 틱 아래로는 안 줄어 시작과 동시에 행동하지 않는다 · 마법 무기는 다음 칸이 차는 게이지에 같다.
         *   부르는 자리 — 파티: 전투 시작(여기) + 원정은 라운드가 바뀔 때마다(`beginRound` · 차 있던 게이지에 더한다) / 적: 등장한 라운드에 한 번(`beginRound`).
         *   결투장은 한 판이 한 라운드라 시작 한 번이다. 당긴 초를 돌려준다 · rng 0
         */
        const primeGauge = u => {
            const g = u.fx?.startGauge ?? 0;
            if (!(g > 0) || u.hp <= 0 || u.summon) return 0;
            const shift = Math.min(g * u.period, u.next - TICK);
            if (!(shift > 0)) return 0;
            u.next -= shift;
            u.fillAt -= shift;
            return shift;
        };
        for (const p of party) primeGauge(p);
        /*
         * 오오라 — **쿨 없이 상시이고 행동을 안 먹는다** (skill_design §1-5). 그래서 액티브 칸에서 빼고
         *   전투 시작에 `until: Infinity` 창으로 건다: 창 만료가 영원히 안 걸리므로 상시가 되고,
         *   `pickReady` 가 안 보므로 차례를 안 먹는다.
         * **한 번에 하나만** — 켤 것을 고르는 화면이 없어 **칸 순서 첫 오오라**를 켠다 (⚠ 임시 · SCREEN_DESIGN 미작성).
         * ⚠ 파티원이 각자 다른 오오라를 들면 파티에 둘이 겹친다 — 「하나만」이 지금은 **시전자 단위**다 (기획 §7).
         */
        // **적도 같은 규칙이다** [2026-09-11 · R79] — 몬스터가 스킬 칸을 갖게 되어 오오라를 들 수 있다(기사 무기를 낀 정예 · 기사 고유).
        //   그래서 이 루프를 배열 하나를 받는 함수로 두고 파티는 여기서 한 번, 적은 **라운드마다** `beginRound` 가 부른다.
        //   안 빼면 오오라가 쿨 0 액티브가 되어 **매 차례 시전만 반복**한다. rng 를 안 쓴다
        // **보이게 한다** [2026-09-15 · R98 · SCREEN_DESIGN §4-2 · ADR-0127] — 창은 전투를 위해 여기서 걸고, 화면에 줄 것은 따로 남긴다:
        //   ① 칸 표시 — 빼기 **전** 칸 순서(`slotIds`)와 켠 오오라(`auraOn`)를 유닛에 남긴다(`slotView` 가 읽는다 · 전투는 안 읽는다)
        //   ② 창 이벤트 — 반환값(`buff` 이벤트 모양 · `t` 없음)을 부르는 쪽이 **다음 `round` 이벤트 바로 뒤**에 낸다(`auraQueue`).
        //      `round` 가 라운드의 첫 이벤트라는 순서 보장(INTERFACE §2-6 ②)을 지키고, 적 카드는 `round` 가 와야 재생기에 선다
        const applyAuras = side => {
            const applied = [];
            for (const p of side) {
                if (!p.actives.some(a => a.def.cast === 'aura')) continue;
                // **꺼진 오오라는 안 켠다** [2026-09-29 · R187] — 무기가 안 맞는 칸(`off`)이다 — 오오라는 걸린 효과만 걸어 지금은 무기를 안 보므로(R204) 꺼질 일이 없다. 칸에서 빼는 것은 켜진 오오라와 같다
                const aura = p.actives.find(a => a.def.cast === 'aura' && !a.off) ?? null;
                p.slotIds = p.actives.map(a => a.id);
                p.slotUps = p.actives.map(a => a.def.up ?? 0);   // 그 칸들의 레벨 — 빼기 전 칸 순서 그대로 (R302 · `slotView` 가 읽는다)
                p.auraOn = aura?.id ?? null;
                p.aura = aura;   // 켠 오오라 칸 — 칸에서 빠지므로 따로 든다. 쓰러졌다 되살아나거나 같은 창을 나눠 쓰던 시전자가 쓰러지면 이것으로 다시 건다 (R287)
                p.actives = p.actives.filter(a => a.def.cast !== 'aura');
                if (aura) castAura(p, side, applied);
            }
            for (const p of side) refreshDerived(p);
            return applied;
        };
        /**
         * 오오라 하나를 건다 — 세기도 **시전자 능력치로 민 값**이다(걸 때 한 번 · skill.js scaleDef · 2026-09-10).
         *   **`apply` 줄마다** 창 하나 — 창은 그 줄이 거는 걸린 효과(`stat` · `element`)이고 값은 계수 민 값이다.
         *   창 열쇠 = 걸린 효과 id · 창이 오오라 id(`s`)를 든다 — 이벤트의 `s` 는 오오라 id 그대로 (2026-09-24 · R151 · 줄 여럿).
         *   대상은 자기 아니면 **편 배열 전체**(쓰러진 유닛 포함 — 갈아입기가 `applyAuras` 를 다시 부른다) 둘뿐이다 — 로드가 `self` · `party` 만 받는다(skill.js).
         *   `applied` 에 `buff` 이벤트 모양(`t` 없음)을 쌓는다 · 파생값은 부르는 쪽이 다시 쓴다 · rng 0
         */
        function castAura(p, side, applied) {
            for (const x of SK.scaleDef(p.aura.def, p.stats, p.fx?.skillTags).effects) {
                if (x.effect !== 'apply') continue;
                const targets = x.target === 'self' ? [p] : rules?.partyScope && p.side === 'party' ? side.filter(u => u.group === p.group) : side;
                for (const tgt of targets) {
                    tgt.buffs[x.status] = { stat: x.stat, v: x.value, until: Infinity, element: x.element ?? null, by: p.key, s: p.aura.id, roundEnd: x.roundEnd };
                    applied.push({ e: 'buff', u: tgt.key, s: p.aura.id, stat: x.stat, v: x.value, until: null });
                }
            }
        }
        // 오오라 창 이벤트의 대기열 — 파티 것(전투 시작 · 갈아입기)이 쌓였다가 다음 `round` 바로 뒤에 나간다 (R98)
        const auraQueue = applyAuras(party);

        // 파티 합 → 체감 [2026-10-05 · 사용자 확정 · INTERFACE §2-6 「파티 골드 · 드랍 · 매직 배율」 — ~~파티 평균~~(09-11) 대체] — **라운드 경계에서 다시 잰다**(갈아입기 · R89).
        //   영웅마다 제 몫을 더하고 파티 단위 출처(도감 · 전술 · 신단 — 전원에게 같은 값)는 **한 번만**(최댓값) 더한 뒤 `s × K ÷ (s + K)` 로 체감시킨다.
        //   소환물은 안 센다(경계에는 벽이 아직 서 있을 수 있다 · 전투 시작에는 없다) · rng 0
        const partySum = (k, pk) => {
            const list = party.filter(p => !p.summon);
            return list.reduce((s, p) => s + (p[k] ?? 0), 0) + Math.max(0, ...list.map(p => p.findParty?.[pk] ?? 0));
        };
        const diminish = (s, K) => (s > 0 ? s * K / (s + K) : s);
        let goldMult, dropMult, magicFind;
        const measureParty = () => {
            goldMult = 1 + diminish(partySum('goldFind', 'gold'), B.party_gold_find_k);      // 셋 다 비율 (R111)
            dropMult = 1 + diminish(partySum('itemFind', 'item'), B.party_item_find_k);
            // 매직아이템 획득확률 — 드롭의 레어 가중치에 곱한다 (item_design §1 「무기 옵션」 · R78)
            magicFind = diminish(partySum('magicFind', 'magic'), B.party_magic_find_k);
        };
        measureParty();
        // 무기 옵션 타격 시 창의 길이 (R78) — 전투 시작에 한 번 묶는다
        // 타격 시 창 길이 + 방어력 감소 겹의 상한(무기 시기 ② · 2026-10-05 R206) — `weaponOnHit` 가 읽는다
        const windowSec = { def: B.weapon_def_down_sec, res: B.weapon_res_down_sec, atk: B.weapon_atk_down_sec, stackMax: B.weapon_def_down_stack_max };

        /** 칸 표시값 [2026-09-15 · R98 · INTERFACE §2-6] — 칸 순서 그대로의 스킬 id(`actives`)와 첫 준비 시각(`ready`) · 칸 레벨(`up` — R302).
         *  오오라도 제 칸에 선다: 켜진 오오라 `0`(쿨이 없다) · 안 켜진 오오라 `null`. 결과 `party[]` · `round` · `refit` 이 같이 쓴다 · 전투는 안 읽는다 */
        const slotView = u => {
            const ids = u.slotIds ?? u.actives.map(a => a.id);
            // **칸마다** 준비 시각 — 같은 스킬이 두 칸에 앉으면 앞 칸부터 하나씩 짝짓는다(id 로 묶으면 두 칸이 한 값으로 합쳐진다 · R130).
            //   칸에 없는 id 는 오오라다(전투 시작에 칸에서 뺐다) — 켜진 것 0 · 안 켜진 것 null
            const left = u.actives.slice();
            //   꺼진 칸(무기가 안 맞는 칸 · R187 · R204)은 안 켜진 오오라와 같은 `null` — 재생기가 「안 도는 칸」으로 그린다
            const ready = ids.map(id => {
                const i = left.findIndex(a => a.id === id);
                if (i >= 0) {
                    const a = left.splice(i, 1)[0];
                    return a.off ? null : r1(a.readyAt);
                }
                return id === u.auraOn ? 0 : null;
            });
            // 칸 레벨 [2026-10-21 · R302 · ADR-0701] — 쌓은 단계(`skill.resolve` 가 정의에 얹은 `def.up` · 칸 순서 · 오오라 칸도 제 자리).
            //   **오른 칸이 하나라도 있을 때만** 단다 — 안 오른 유닛의 기록은 그대로다. 몬스터도 낀 장비의 특정 스킬 +n 이 고유 · 2칸을 올리면 단다(R225) —
            //   `round` 적은 타임라인 안이라 그런 판은 골든 지문(`tl`)이 바뀐다(승패 · 보상은 그대로). 재생기의 `Lv.n` 과 관전 스킬 설명창 숫자가 읽는다 · 전투는 안 읽는다 · rng 0
            const ups = u.slotUps ?? u.actives.map(a => a.def.up ?? 0);
            return ups.some(n => n > 0) ? { actives: ids, ready, up: ups } : { actives: ids, ready };
        };
        /**
         * 적 하나의 표시값 — `round` 의 `enemies` 와 `call` 의 `units` 가 **같은 모양**을 쓴다 (INTERFACE §2-6 · 불러내기 2026-09-18).
         * 표시값 [2026-09-11 · R79 후속] — 재생기가 적 카드의 스킬 칸(`actives` = id · 칸 순서 = 출처 자리)과
         *   그 툴팁 문장(피해·회복량 · 스킬 계수)을 그린다. `out.party[]` 의 같은 이름 필드와 같은 모양이고 전투에는 안 쓰인다.
         *   ⚠ 파티 쪽과 달리 **타임라인 안**이라 골든 지문(`tl`)에 걸린다 — 키 순서도 지문이다 · rng 는 0
         */
        const enemyView = e => ({
            ...(e.hero ? { hero: e.hero, rank: e.rank } : {}),
            key: e.key, monsterId: e.monsterId, grade: e.grade, sin: e.sin ?? null,
            traits: e.traits ?? null, hpMax: e.hpMax, period: e.period,
            fillAt: r1(e.fillAt),   // 첫 게이지가 차기 시작하는 시각 — 빈 채로 출발한다 (R200 · INTERFACE §2-6)
            atkMin: e.atkMin, atkMax: e.atkMax, matkMin: e.matkMin, matkMax: e.matkMax, atkType: e.atkType, noBasic: e.noBasic,   // noBasic = 행동 게이지 색 (마법 무기 — R198 · SCREEN_DESIGN §4-2 · ADR-0476)
            stats: e.stats ? { ...e.stats } : null,
            ...slotView(e),   // 칸 순서의 스킬 id + 첫 준비 시각 — 재생기가 쿨 칸을 덮인 채로 세운다 (R89 · 오오라 칸 R98)
            sheet: { ...e.sheet },   // 세부 능력치 복사본 — 유닛 툴팁이 Alt 로 편다 (R94 · SCREEN_DESIGN §2 · 전투는 안 읽는다)
            // 입고 있는 한 벌 — 유닛 툴팁의 첫 장(장비 3×3)이 읽는다 [2026-09-21 · R119 · SCREEN_DESIGN §2 · ADR-0183].
            //   `rollGear` 가 낸 그 아이템들이고(처치 드롭이 이 중 하나로 나간다 · §5-2) 얕은 복사만 한다 — `sheet` 와 같은 취급이다(표시값 · 전투는 안 읽는다 · rng 0)
            gear: (e.gear ?? []).map(it => ({ ...it })),
        });
        const timeline = [];
        const out = {
            won: false, reason: null, durationSec: 0,
            // atkMin·atkMax·matkMin·matkMax·atkType 은 **툴팁이 읽는 표시값**이다(범위 R90) (SCREEN_DESIGN §4-2) — 재생기가 스킬 문장의 피해·회복량을 조립한다.
            // stats 는 기본 능력치의 **복사본**이다(설명창이 스킬 계수를 풀어 쓴다 · 2026-09-10). ~~정산(grantXp)이 전투 뒤에 능력치를 올린다~~ —
            // 09-14 로 레벨업이 능력치를 안 올려(R83) 복사의 원래 이유는 사라졌다.
            // 전투에는 안 쓰이고 타임라인에도 안 들어가므로 rng·골든 지문과 무관하다
            // noBasic 은 행동 게이지 색이다(마법 무기 = 파랑 · R198 · SCREEN_DESIGN §4-2 · ADR-0476)
            // fillAt = 첫 게이지가 차기 시작하는 시각 — 게이지가 빈 채로 출발한다 (R200)
            party: party.map(p => ({ key: p.key, uid: p.uid, hpMax: p.hpMax, period: p.period, fillAt: r1(p.fillAt),
                atkMin: p.atkMin, atkMax: p.atkMax, matkMin: p.matkMin, matkMax: p.matkMax, atkType: p.atkType, noBasic: p.noBasic, stats: p.stats ? { ...p.stats } : null,
                ...slotView(p) })),   // 칸 순서의 스킬 id + 첫 준비 시각 — 재생기가 쿨 칸을 덮인 채로 세운다 (R89 · 오오라 칸 R98)
            // 보상 칸(xpTotal · gold · kills · drops)은 **이긴 라운드의 몫만** 센다 — 처치 순간에는 라운드 몫(`loot`)에 모았다가 이기면 옮긴다 (R89)
            // killGrades = kills 를 처치 순간의 등급으로 가른 것 `{monsterId: {grade: n}}` — 의뢰 「정예 · 보스 n마리」가 읽는다 (R153 · 세는 것뿐이라 rng 0)
            // blueprints = 떨어진 스킬 도안의 스킬 id — 처치당 1개를 장비와 나눠 쓴다(onKill · 2026-09-29 R179 · 2026-10-20 R293 ~~books 스킬북~~) · drops 와 같이 이긴 라운드의 몫만
            // ~~materials 처치 재료~~ — 2026-10-29 R373 삭제(처치마다 굴림 둘이 빠져 같은 시드의 수열이 갈렸다 · INTERFACE §5-2)
            timeline, xpTotal: 0, gold: 0, kills: {}, killGrades: {}, drops: [], blueprints: [], downed: [],
            roundsCleared: 0, rounds: [], casts: {},
            // 빗나감 집계 — 레벨 부족의 전용 신호라 리포트에 따로 낸다 (§9-4·§9-8). 세는 것뿐이라 rng 소비 없음
            strikes: { party: { n: 0, miss: 0 }, enemy: { n: 0, miss: 0 } },
            // 기여 집계 — 영웅별 가한/받은 피해와 처치 수. 리포트가 「누가 얼마나 했나」를 그린다 (SCREEN_DESIGN §4-3).
            // 아래 `contrib` 맵이 세고 전투가 끝나면 여기로 옮긴다. **rng 를 안 쓰고 타임라인에도 안 들어간다** —
            // 세는 것뿐이라 전투 결과도 골든 수열도 안 건드린다 (`strikes` 와 같은 취급)
            contrib: [],
            // 진 런 · 시간 초과의 사실 — 쓰러진 순서 · 남은 적 · 레벨 차 (`finish` 가 클리어가 아니면 채운다 · 리포트 「왜 졌나」 · ADR-0623). 세는 것뿐이라 rng 0
            fall: null,
            // 이 런의 물약 칸 [2026-09-15 · R103 · 모양 R104 · 빈 칸 R124] — 재생기가 칸의 첫 상태를 그린다: `max` = 칸 수 · `slots` = 받은 칸 그대로(자리 순 · `null` = 빈 칸 · 목록 뒤도 빈 채 출발) ·
            //   `used` = 마신 수(`potion` 이벤트 수와 같다). 물약 없는 런도 칸은 선다(`slots: []`)
            potion: { max: slotMax, slots: potionSlots.map(p => (p ? { id: p.id, heal: p.heal } : null)), used: 0 },
        };

        /* 기여 — **전투 시작 시점의 파티 전원**으로 자리를 미리 잡는다. 0 인 영웅도 줄이 서야
           「안 나갔다」와 「못 때렸다」가 갈린다 (SCREEN_DESIGN §4-3).
           ⚠ **소환물은 안 센다** — 행동하지 않아 가한 피해가 없고(`next: Infinity`), 얼음 벽이 맞은 것을
              주인이 맞은 것으로 적으면 「받은 피해」가 그 영웅의 사실이 아니게 된다 (skill_design §12-6) */
        const contrib = new Map(party.map(p => [p.uid, { uid: p.uid, dealt: 0, taken: 0, kills: 0 }]));
        const credit = u => (u.side === 'party' && !u.summon) ? (contrib.get(u.uid) ?? null) : null;
        /** 지금까지의 기여 — 정수로 낸다(리포트가 그대로 찍는 값이고, 부동소수 꼬리는 이식 대조에서 잡음이 된다) */
        const contribNow = () => [...contrib.values()].map(c => ({ ...c, dealt: Math.round(c.dealt), taken: Math.round(c.taken) }));
        /* 쓰러짐 기록 — 진 런 리포트의 「언제 · 무엇에 · 얼마나」 [2026-10-14 · SCREEN_DESIGN §4-3 · ADR-0623] — 영웅마다 받은 피해를 **때린 몬스터 id 별로** 모으고
           쓰러지는 순간 가장 많이 때린 몬스터와 그 몫을 적는다(마지막 일격이 아니다). 세는 것뿐이라 rng 0 · 타임라인 무관 — 기여와 같은 취급 · 소환물은 안 센다 */
        const takenFrom = new Map();   // uid → Map(monsterId → 받은 피해)
        const noteTaken = (d, src, dmg) => {
            if (!credit(d) || !src?.monsterId) return;
            const m = takenFrom.get(d.uid) ?? new Map();
            takenFrom.set(d.uid, m);
            m.set(src.monsterId, (m.get(src.monsterId) ?? 0) + dmg);
        };
        const falls = [];
        const noteFall = u => {
            let by = null, top = 0, sum = 0;
            for (const [id, v] of takenFrom.get(u.uid) ?? []) { sum += v; if (v > top) { top = v; by = id; } }
            falls.push({ uid: u.uid, t: r1(t), round, by, dmg: Math.round(top), taken: Math.round(sum) });
        };

        /* 라운드 몫 — 처치의 보상은 여기에 모았다가 라운드를 이기면 결과로 옮긴다(`bank`). 진 라운드의 몫은 버린다.
           장비 · 도안 목록은 몬스터가 뽑힌 자리 순으로 묶어 처치 순서가 지급 순서나 아이템 uid 를 바꾸지 않게 한다. */
        // xpByLevel = xp 를 **몬스터 레벨**로 가른 것 `{lvl: xp}` — 정산이 영웅마다 레벨 차 감쇠를 건다 (2026-09-30 · hero_design §5 · 세는 것뿐이라 rng 0)
        // ~~skillKills 스킬 도감의 처치 수~~ — 2026-10-20 삭제(R293 · 세는 것뿐이라 rng 0 이었다)
        const newLoot = () => ({ xp: 0, xpByLevel: {}, gold: 0, kills: {}, killGrades: {}, drops: [], blueprints: [] });
        let loot = newLoot();
        let rewardCards = [];
        const bank = () => {
            for (const c of rewardCards.sort((a, b) => a.no - b.no)) {
                if (c.drop) loot.drops.push(c.drop);
                else loot.blueprints.push(c.blueprint);
            }
            out.xpTotal += loot.xp;
            out.gold += loot.gold;
            for (const [id, n] of Object.entries(loot.kills)) out.kills[id] = (out.kills[id] ?? 0) + n;
            for (const [id, byGrade] of Object.entries(loot.killGrades)) {
                const to = (out.killGrades[id] ??= {});
                for (const [g, n] of Object.entries(byGrade)) to[g] = (to[g] ?? 0) + n;
            }
            out.drops.push(...loot.drops);
            out.blueprints.push(...loot.blueprints);
        };

        let t = 0, round = 1;
        // 이 라운드가 열린 시각 — 나태 T2 겹(`tick`)이 여기서부터 잰다 [2026-10-05 · skill_design §3-2]. `beginRound` 가 쓴다
        let roundAt = 0;
        // 장 디버프 [2026-10-28 · R366 · base_expedition_design §1-4] — 이 칸 · 이 단의 한 줄(`debuffOf` · 결투장은 없다)이 런 내내 같다 —
        //   분노 · 폭식 = 직격(`strikeOnce`) · 탐욕 = 영웅의 받는 회복(`curseCut` → `ATTRS`) · 시기 · 나태 = 간격마다 거는 창(`curseCast`) · rng 0
        const curse = encounter ? null : debuffOf(stageId, difficulty);
        // 다음에 걸 시각 — 라운드를 열면 그 시각부터 간격마다(`beginRound`) · 거는 효과가 아니면 null
        let curseAt = null;
        // 거는 쪽 — 시전자가 없다(기여 · 처치 몫 없음) · 영웅의 「상대 편」이라 받는 쪽 시간 감소 · 매력이 줄인다
        const CURSE_SRC = { key: 'curse', side: 'enemy' };
        /** 몬스터가 때린 직격에서 맞는 영웅이 더 받는 비율 — 분노 = 값 · 폭식 = 라운드를 연 뒤 지난 초 × 값(상한) · 그 밖 0 */
        const curseTaken = () => curse?.effect === 'taken_pct' ? curse.value
            : curse?.effect === 'feast' ? Math.min(curse.cap, curse.value * (t - roundAt)) : 0;
        /** 시기 · 나태 — 살아 있는 영웅 전원에게 중독(초당 = 그 영웅 최대 HP × 값) · 결빙(행동 속도 = 값)을 그 시간만큼 건다 */
        const curseCast = () => {
            for (const u of party) {
                if (u.hp <= 0 || u.summon) continue;
                rt.applyStatus(CURSE_SRC, u, curse.effect === 'poison'
                    ? { status: 'curse_poison', stat: 'poison', value: curse.value, dps: u.hpMax * curse.value, dur: curse.durationSec, ailment: 'poison' }
                    : { status: 'curse_freeze', stat: 'period_pct', value: curse.value, dur: curse.durationSec, ailment: 'freeze' }, t);
            }
        };
        // 탐욕 — 받는 회복 감소를 영웅 유닛에 싣는다(갈아입어도 잇는다 — `REFIT_FIELDS` 밖) · 창이 없는 지금 값도 `ATTRS` 의 받는 회복과 같은 식으로 바로 쓴다
        if (curse?.effect === 'heal_cut') for (const u of party) {
            if (u.recvBase === undefined) continue;
            u.curseCut = curse.value;
            u.recv = (1 + u.recvBase) * (1 - curse.value) - 1;
        }
        // 적 배열은 라운드마다 **갈아 끼운다** — 런타임이 속성으로 읽어야 옛 라운드를 가리키지 않는다 (skill_runtime @param units)
        //   `codexRound` = 도감 Lv2 의 「그 종족이 나온 라운드 동안」 몫 `{speed, buff, regen, heal}` 또는 null — `beginRound` 가 쓰고 런타임(버프 시간 · 회복)도 읽는다 (R314)
        const units = { party, enemies: [], codexRound: null };
        let roundLog = null;
        const alive = list => list.filter(u => u.hp > 0);
        const hooks = createHooks();
        // 액티브 실행은 런타임 몫 — 전투 하나마다 새로 만든다(모듈 전역 상태 없음)
        // 소환 유닛 키 — `p0`(파티) · `e0`(적) 과 겹치지 않는 `s0` 대역. 전투 하나 안에서만 센다
        let summonSeq = 0;
        const rt = createSkillRuntime({
            SK, B, rng, timeline, out, units, partyScope: rules?.partyScope,
            strikeOnce, pickTarget, r1, EPS, hooks,
            makeSummon: (caster, def) => Object.assign(makeSummon(caster, def, `s${summonSeq++}`), { group: caster.group }),
            callBand: (caster, at) => callBand(caster, at),   // 불러내기 — 무리를 세우는 것은 적 배열 · 오오라 · 보상 표식을 아는 이쪽이다 (2026-09-18)
            // 비직격 고정 피해 한 대상 — 기여표와 전투불능을 아는 이쪽이다 (하는 일 `fixed` · 2026-09-24 R151 — ~~`blast` 전용 함수~~)
            dealIndirect: (a, d, dmg, s) => dealIndirect(a, d, dmg, s),
            // 스턴 — 행동 예약 · 스킬 칸을 아는 이쪽이 민다. 민 쿨 초를 돌려준다 (2026-09-28 · R178 · battle_design §2-7)
            stun: (u, end) => stun(u, end),
            // 파리 떼 여닫기 — 판 크기 · HP · 타임라인을 아는 이쪽이다 (스웜 · 2026-10-29 R380 · 아래 `swarmOpen`)
            swarmOpen: (u, x, ev) => swarmOpen(u, x, ev),
            swarmClose: (u, at) => swarmClose(u, at),
        });

        // Encounter-specific orchestration. Ordinary runs keep the same events and RNG stream.
        const ruleContext = () => ({ t: r1(t), party, enemies: units.enemies, timeline,
            attack: strikeOnce, pickTarget, downed });

        /* 물약 [2026-09-15 · R103 · battle_design §7-1] — 칸은 **파티가 같이 쓴다**: 여기서 차고, 둘째 라운드부터는 부르는 쪽이 `restock` 으로 넘긴 목록으로
           그 라운드를 열 때 다시 찬다(게임은 정산이 재고에서 채워 넘긴다 · 안 넘기면 줄어든 칸 그대로 · 2026-10-22 · R315).
           틱마다 HP 재생 **뒤** · 행동 순회 **앞**에 한 번 본다 — 조건에 걸린 영웅이 **차례를 안 쓰고** 마신다(`next` 불변).
           대상 = 살아 있는 파티 영웅(소환 제외) 중 HP 비율이 이 런의 기준(`potionLine` — 편성의 값 · 없으면 [balance.csv:potion_use_hp_pct] · R378) 밑이고 제 물약 쿨이 끝난 사람.
           순서 = HP 비율 낮은 순 · 같으면 **파티 배열 순** — 동점을 배열 순으로 명시 비교한다(엔진의 정렬 안정성에 기대지 않는다 · INTERFACE §5-3).
           **칸 하나에 물약 하나 · 앞 칸부터 마신다** [R104 사용자 지시] — 먼저 마시는 영웅이 앞의 찬 칸을 받는다. 칸은 라운드 안에서 다시 안 차므로
           「앞의 찬 칸」은 늘 방금 마신 칸 뒤의 첫 찬 칸이다(빈 칸 `null` 은 건너뛴다 · R124). 그 칸 물약의 정해진 양을 채우고(최대치에서 자른다) 쿨은 [balance.csv:potion_cooldown_sec] 이다. **rng 를 안 쓴다** ·
           화상의 회복 감소는 `u.recv`(창 파생 — 2026-09-28 R178)에 이미 들어 있다 */
        let potionLeft = potionSlots.filter(Boolean).length;
        let potionNext = 0;
        let potionRound = {};          // 이 라운드에 마신 물약 `{id: n}` — 요약이 싣고 정산이 재고에서 뺀다 (R124) · 세기만 한다
        let potionPending = null;      // 다음 라운드의 칸 — `restock` 이 받아 두고 그 라운드를 열 때(`beginRound`) 갈아 끼운다 · null = 받은 것 없음 (R315)
        const drinkPotions = () => {
            const want = party
                .map((u, i) => ({ u, i }))
                .filter(({ u }) => !u.summon && u.hp > 0 && u.hp / u.hpMax < potionLine && u.potionReadyAt <= t + EPS);
            want.sort((a, b) => (a.u.hp / a.u.hpMax - b.u.hp / b.u.hpMax) || (a.i - b.i));
            for (const { u } of want) {
                if (potionLeft <= 0) break;
                while (!potionSlots[potionNext]) potionNext++;   // 빈 칸은 건너뛴다 (R124) — 찬 칸이 남아 있으므로 끝을 안 넘는다
                const i = potionNext++;
                const slot = potionSlots[i];
                potionLeft -= 1;
                out.potion.used += 1;
                potionRound[slot.id] = (potionRound[slot.id] ?? 0) + 1;
                // 체력 회복 +%(갑옷 나태 · 2026-09-18)가 물약에도 곱한다 — 이벤트의 `amt` 가 늘어난 양이다. 0 이면 그 칸의 정해진 양 그대로.
                //   물약 효과 상승(반지 분노 ③ · 2026-10-29 R382)은 **체력 회복 +% 와 한 괄호** — `(1 + recvBase + potionPct)` 에 치유 감소 몫 `(1 + recv) / (1 + recvBase)` 를 곱한다.
                //   `potionPct` 가 0 이면 종전 식 그대로다(값 · 수열 불변)
                const base = u.recvBase ?? 0;
                const amt = u.potionPct ? Math.round(slot.heal * (1 + u.recv) * (1 + base + u.potionPct) / (1 + base))
                    : u.recv ? Math.round(slot.heal * (1 + u.recv)) : slot.heal;
                u.hp = Math.min(u.hpMax, u.hp + amt);
                u.potionReadyAt = t + B.potion_cooldown_sec;
                timeline.push({ t: r1(t), e: 'potion', u: u.key, s: slot.id, i, amt, dhp: u.hp, left: potionLeft });
            }
        };

        /**
         * 도감 Lv2 의 「그 종족이 나온 라운드 동안」 몫 [2026-10-22 · R314 · INTERFACE §2-6 「도감 사다리」] — 이 라운드에 스폰한 적(대기 무리 포함)의
         *   **종족마다 한 번** 더한다(같은 종족 둘이 서도 한 번). 속도는 파티 유닛(소환 제외)의 조용한 창 `codex:speed`(행동 주기 괄호 `period_pct` ·
         *   시간으로 안 풀린다 · 갈아입기에 남는다) · 버프 시간 · 재생 · 회복은 `units.codexRound` 를 재생 틱 · 런타임이 읽는다.
         *   다음 라운드를 열 때 다시 잰다 · 줄이 하나도 없으면 null 이고 창도 없다(종전과 같다) · 이벤트 없음 · rng 0
         */
        const codexRoundOpen = () => {
            const sum = { speed: 0, buff: 0, regen: 0, heal: 0 };
            const seen = new Set();
            for (const e of units.enemies) for (const u of [e, ...(e.band ?? [])]) {
                const c = u.codex;
                if (!c || seen.has(c.race)) continue;
                seen.add(c.race);
                sum.speed += c.fight.speed_pct ?? 0;
                sum.buff += c.fight.buff_dur_pct ?? 0;
                sum.regen += c.fight.hp_regen ?? 0;
                sum.heal += c.fight.heal_out_pct ?? 0;
            }
            units.codexRound = sum.speed || sum.buff || sum.regen || sum.heal ? sum : null;
            for (const p of party) {
                if (p.summon) continue;
                const had = 'codex:speed' in p.buffs;
                if (had) delete p.buffs['codex:speed'];
                if (sum.speed) p.buffs['codex:speed'] = { stat: 'period_pct', v: sum.speed, until: Infinity, element: null, by: 'codex', quiet: true };
                if (had || sum.speed) refreshDerived(p);
            }
        };

        const beginRound = () => {
            // 물약 칸 다시 채우기 [2026-10-22 · R315 · battle_design §7-1] — 받아 둔 목록이 있으면 이 라운드의 칸이 그것이 되고 앞 칸부터 다시 마신다 ·
            //   그 목록을 아래 `round` 이벤트의 `pots` 로 싣는다(재생기가 칸을 다시 그린다) · 첫 라운드는 `createRun` 이 이미 채웠다 · rng 0
            const pots = round > 1 && potionPending ? potionPending : null;
            if (pots) { potionSlots = pots; potionNext = 0; potionLeft = pots.filter(Boolean).length; potionPending = null; }
            roundAt = t;   // 나태 T2 겹이 0 으로 돌아간다 — 쿨감은 다음 틱이 원값으로 되쓴다(advance)
            // 장 디버프(시기 · 나태)도 라운드를 연 시각부터 다시 잰다 — 첫 틱에 걸린다 (R366) · 폭식은 `roundAt` 에서 0 부터
            curseAt = curse?.effect === 'poison' || curse?.effect === 'freeze' ? t : null;
            for (const u of [...party, ...units.enemies]) if (u.mfeast) u.feast = 0;   // 폭식 T3 겹도 라운드를 열면 비운다 (R343)
            // 정신 집중은 이전 라운드가 끝난 순간 이미 닫혔다 — 정산 · 경계 갈아입기도 절반만 남긴 쿨을 잇는다(2026-10-30).
            // 소환물은 **라운드가 끝나면 사라진다** (skill_design §12-6). 걷어내는 자리가 여기다 —
            //   적 배열이 갈리는 것과 같은 시점이라 결투 선언의 지목도 함께 사라진다(창이 적에게 붙어 있었다)
            for (let i = party.length - 1; i >= 0; i--) if (party[i].summon) party.splice(i, 1);
            // **라운드가 끝나면 닫히는 창**(걸린 효과 `round_end = close`)을 여기서 닫는다 [2026-09-24 · R151 · INTERFACE §2-6 「라운드 경계」 —
            //   ~~결투의 시전자 창만 알아보던 전용 코드~~(2026-09-10 사용자 원문 「라운드 끝까지 + 피해 감소」)를 데이터 규칙으로].
            //   **파티만 본다** — 적의 창은 바로 아래에서 적 배열과 함께 사라진다. 지금 쓰는 효과는 결투의 시전자 창(`kni_duel_guard` — 999초라 만료로는 안 닫힌다) 하나다.
            //   rng 를 안 쓴다. 닫을 때 **기존 `buffEnd`** 를 낸다 — 만료(`skill_runtime.expire`)와 같은 모양이라 재생기가 칩을 걷는다
            //   (새 이벤트 종류가 아니다 · 이 라운드의 `round` 이벤트보다 앞선다 · 최대 HP 가 바뀌면 그 유닛의 마지막 `buffEnd` 가 새 최대치를 싣는다 — 부채 #50)
            for (const p of party) {
                const wasMax = p.hpMax;
                let last = null;
                for (const [id, b] of Object.entries(p.buffs)) {
                    if (b.roundEnd !== 'close') continue;
                    delete p.buffs[id];
                    last = { t: r1(t), e: 'buffEnd', u: p.key, s: b.s ?? id };
                    timeline.push(last);
                }
                if (!last) continue;
                refreshDerived(p);
                if (p.hpMax !== wasMax) Object.assign(last, { hpMax: p.hpMax, dhp: p.hp });
            }
            // 라운드 동안만 사는 겹 둘을 **조용히** 지운다 [2026-10-05 · R206 · R208 · INTERFACE §2-6 「죄종 계열 옵션」] — 시전 누적(`cx:cast_stack`)은 라운드가 끝나면 0,
            //   적 무기가 파티에 쌓은 방어력 감소 겹(`wx:def_stack` — 시간으로 안 풀린다)도 라운드를 넘기지 않는다. 둘 다 `quiet` 창이라 이벤트가 없다 · rng 0
            for (const p of party) {
                p.castStacks = 0;
                if (!p.buffs['cx:cast_stack'] && !p.buffs['wx:def_stack']) continue;
                delete p.buffs['cx:cast_stack'];
                delete p.buffs['wx:def_stack'];
                refreshDerived(p);
            }
            // 이형 겹(R388 · D8)도 라운드를 넘기지 않는다 — 조용한 창이라 이벤트가 없다 · rng 0
            for (const p of party) if (p.buffs['fam:aberration']) { delete p.buffs['fam:aberration']; refreshDerived(p); }
            // 도감 사다리 — 그 몬스터 **종족 전체**의 닿은 몫 [2026-10-18 · R286 · 2026-10-22 · R314 · monster_design §8]. 라운드마다 한 번 읽어 둔다
            //   (스폰 전 매직 몫 · 스폰 뒤 유닛) — 라운드 사이에 오른 단계가 다음 라운드부터 먹는다 · 결투장 · 소환은 안 얹는다 · rng 0
            const cxMemo = new Map();
            const cxOf = codexOf && !encounter ? id => {
                if (!cxMemo.has(id)) cxMemo.set(id, codexOf(id) ?? null);
                return cxMemo.get(id);
            } : null;
            // 매직찬스는 **스폰 굴림**에 걸린다 [2026-09-11 · R79] — 장비 희귀도가 여기서 정해지기 때문이다.
            //   ⚠ 딸린 것 — 파티의 매직아이템 획득확률이 **적 장비도 좋게 한다**(사용자가 알고 택한 「이스터에그」)
            const sp = encounter ? { type: rules?.kind ?? 'normal', list: encounter.map((p, i) => makeUnit('enemy', p.combat, {
                key: `e${i}`, uid: p.uid, hero: p.hero, grade: 'normal', monsterType: 'Normal',
                rank: p.rank ?? 0, stats: p.stats, sheet: { ...p.combat }, gear: p.gear,
                reactions: p.reactions ?? [],
                actives: (p.actives ?? []).map(a => slotOf(a, SK.resolve(a), fitterOf(p.weaponGroup), 0)),
            })) } : spawnRound(roundSeedOf(round), stage, pool, round, magicFind, stageLevel, wearChance, difficulty,
                cxOf ? id => cxOf(id)?.farm.magic ?? 0 : null);
            units.enemies = sp.list;
            // 유닛에 얹는다 — 대기 무리(`band` · 불러내기가 세운다)도 같은 라운드의 몬스터다 · 칸이 없는 몬스터(보스 · 6 · 7장)는 null
            if (cxOf) for (const e of units.enemies) for (const u of [e, ...(e.band ?? [])]) u.codex = cxOf(u.monsterId);
            codexRoundOpen();
            // 적의 오오라 — 파티와 같은 규칙으로 **라운드 시작에** 창으로 건다 (R79 · 위 `applyAuras`). rng 0 이라 등장 지연 굴림 수열이 안 밀린다
            //   창 이벤트는 아래 `round` 이벤트 **뒤**에 낸다 — 파티 몫(`auraQueue`) 다음 (R98)
            const enemyAuras = applyAuras(units.enemies);
            // 적 스킬도 **준비 상태로 출발한다** [개정 2026-09-15 · R100 · battle_design §6] — 등장 라운드 시작 시각에 곧바로 쓴다. rng 0 이라 아래 등장 지연 굴림 수열이 안 밀린다
            //   꺼진 칸(무기가 안 맞는 칸 · R187 · R204 — 몬스터 데이터는 전부 맞아 지금은 없다)은 그대로 둔다 — 되돌리면 켜진다
            for (const e of units.enemies) for (const a of e.actives) if (!a.off) a.readyAt = t;
            // 적 등장 시각 = 라운드 시작 + 짧은 지연 (전 라운드 마지막 타격과 겹치지 않게) — 게이지는 등장한 순간부터 빈 채로 찬다 (R200)
            for (const e of units.enemies) {
                const lag = 0.4 + rng() * 0.6;
                e.next = e.period + lag;
                e.fillAt = t + lag;
            }
            // 전투 시작 시 행동 게이지 +%(R303 · 위 `primeGauge`) — 적은 등장한 라운드가 곧 시작이라 여기서 한 번(`fillAt` 이 `round` 이벤트에 실린다) ·
            //   파티는 **원정의 라운드가 바뀔 때마다** 차 있던 게이지에 더한다 — 당긴 초를 `round` 이벤트의 `pg` 로 재생기에 넘긴다(첫 라운드는 전투 시작이 이미 채웠다) · rng 0
            for (const e of units.enemies) primeGauge(e);
            const pg = {};
            if (round > 1) for (const p of party) { const s = primeGauge(p); if (s) pg[p.key] = r1(s); }
            roundLog = { n: round, kind: sp.type, killed: [], eliteSin: units.enemies.find(e => e.grade === 'elite')?.sin ?? null };
            out.rounds.push(roundLog);
            rules?.onStart?.(ruleContext());
            timeline.push({ t: r1(t), e: 'round', n: round, kind: sp.type, enemies: units.enemies.map(enemyView), ...(Object.keys(pg).length ? { pg } : {}),
                ...(pots ? { pots: pots.map(p => (p ? { id: p.id, heal: p.heal } : null)) } : {}) });
            // 오오라 창 이벤트 [2026-09-15 · R98] — `round` 바로 뒤 · 파티 몫(전투 시작 · 갈아입기) 먼저, 이 라운드 적의 것 다음.
            //   창은 이미 걸려 있다 — 이벤트만 낸다(rng 0 · 전투 결과 불변)
            for (const ev of [...auraQueue.splice(0), ...enemyAuras]) timeline.push({ t: r1(t), ...ev });
        };

        const onKill = e => {
            if (encounter) return;   // 연습 결투: XP·골드·드롭·도감 처치 없음
            // 이형 [2026-10-29 · R388 · D8] — 쓰러질 때마다 파티 전원(소환 제외)의 원소 저항 넷에 겹 +1(상한 `n` — 사용자 「5칸까지」).
            //   조용한 창 `fam:aberration`(`res_pct` = −값 × 겹 — 저항 합의 음수 항) · 라운드를 열면 지운다(`beginRound`) · rng 0
            if (e.family === 'Aberration') {
                const f = FAMILIES.Aberration;
                for (const p of f && f.n > 0 ? party : []) {
                    if (p.summon) continue;
                    const n = Math.min(f.n, (p.buffs['fam:aberration']?.n ?? 0) + 1);
                    p.buffs['fam:aberration'] = { stat: 'res_pct', v: -f.value * n, n, until: Infinity, element: null, by: 'fam', quiet: true };
                    refreshDerived(p);
                }
            }
            roundLog.killed.push(e.monsterId);                    // 사실의 기록 — 진 라운드에서 잡은 것도 남는다
            // 아래 보상은 전부 **라운드 몫**이다 — 이기면 결과로 옮기고 지면 버린다 (R89)
            loot.kills[e.monsterId] = (loot.kills[e.monsterId] ?? 0) + 1;
            const byGrade = (loot.killGrades[e.monsterId] ??= {});
            byGrade[e.grade] = (byGrade[e.grade] ?? 0) + 1;
            // 도감 Lv1 — 그 몬스터 **종족**의 파밍 몫(R286 · 2026-10-22 R314 그 종족 전체) · 0 이면 × 1 이라 종전 값과 한 비트도 안 다르다
            const farm = e.codex?.farm ?? null;
            const xp = e.expReward * (1 + (farm?.xp ?? 0));
            loot.xp += xp;
            loot.xpByLevel[e.lvl] = (loot.xpByLevel[e.lvl] ?? 0) + xp;
            loot.gold += Math.round(e.goldReward * goldSupportMult(e.lvl) * e.goldMult * B.gold_rate * goldMult * (1 + (farm?.gold ?? 0)));
            // ~~정예·보스 처치가 가루를 뱉던 두 줄~~ 은 2026-09-09 삭제 — **처치가 뱉는 재료는 없다**
            // (item_design §5-3 확정 · GAME_DESIGN §9 09-09). 처치의 산출은 **장비 · 골드**뿐이다.
            // 가루 자체는 남는다 — 공급원이 **분해** 하나로 줄었을 뿐이다(`item.salvageDust`)
            // ~~도감 카드 판정(rng 1회)~~ 은 2026-09-21 삭제 — 도감 레벨은 위 `loot.kills` 가 올린다 (monster_design §8 · 사용자 지시).
            //   카드는 나중에 드롭형으로 다시 설계한다. **처치마다 굴림 하나가 빠져 같은 시드의 수열이 갈렸다** (INTERFACE §5-2)
            // 드롭 판정 — **처치당 최대 1개** (item_design §1 확정 08-27). 등급은 굴림 횟수가 아니라
            // 확률 배율(spawn_grade.drop_chance_mult)이다 — 판정은 **1회**. 보스는 최소 1개 보장
            // 도감 Lv1 드롭 — 그 종족의 장비 · 도안 판정 확률 × (1 + drop) (R314 — ~~Lv3 그 몬스터의 drop~~ R286) · 판정 횟수는 그대로라 rng 순서가 안 밀린다 · 0 이면 × 1
            //   ⚠ 파밍 줄 `material`(재료 판정 확률)은 처치 재료가 걷혀(2026-10-29 · R373) 읽는 곳이 없다 — 대체를 정할 때까지 칸만 산다(DEV_PLAN §4)
            const cxDrop = 1 + (farm?.drop ?? 0);
            const dropRng = makeRng(e.dropSeed);
            let got = dropRng() < B.drop_chance_pct * e.dropChanceMult * dropMult * cxDrop ? 1 : 0;
            if ((e.grade === 'stage_boss' || e.grade === 'chapter_boss') && got < B.boss_guaranteed_drop) got = B.boss_guaranteed_drop;
            /*
             * **떨어지는 것은 그 몬스터가 입고 있던 장비다** [개정 2026-09-11 · R79 · 사용자 지시 · item_design §1 2단계].
             *   여기서 아이템을 만들지 않는다 — 부위 · ilvl · 희귀도 · 접사 · 개체 굴림은 **스폰 때** 이미 돌았다(`spawnRound`).
             *   남은 굴림은 **입은 부위 중 하나를 고르는 1회**뿐이고, 그것이 「드롭 부위 편향의 단위」의 답이다 — 단위는 **입은 것**이다.
             * ⚠ 맨몸 몬스터는 판정이 성공해도 낼 것이 없다 — 아무것도 굴리지 않고 넘어간다.
             * **그 한 개가 장비냐 스킬 도안이냐를 굴린다** [2026-09-29 · R179 · 사용자 「처치당 1개 · 장비냐 책이냐」 · item_design §1 드롭 1-2 · **2026-10-20 · R293 ~~책~~ → 도안**] —
             *   드롭이 나면 몬스터 전용 수열에서 종류 1회(`drop_book_pct`) → 선택 1회다. 같은 선택값으로 도안 후보 또는 입은 부위를 고른다.
             *   도안 후보 = 그 유닛이 **든 칸** 중 영웅이 배울 수 있는 스킬(`blueprintSkills` — 칸 순서 · 자폭 · 불러내기는 책이 없다) [개정 2026-10-18 · R269 · monster_design §5-1 「쥔 스킬이면 어느 칸이든」 ·
             *   ~~고유 스킬 하나 · 굴림 더 없음~~] · ⚠제안 같은 확률.
             *   후보가 없어도 · 하나여도 종류 · 선택은 1회씩이다. 도안 후보가 없어 장비로 가도 선택값을 다시 뽑지 않는다.
             *   찾기 스탯은 성공 문턱만 움직인다. 전투 수열 · 처치 순서 · 다른 몬스터의 후보 수는 이 몬스터의 카드를 안 민다.
             */
            const plans = e.blueprintSkills ?? [];
            for (let i = 0; i < got; i++) {
                const kind = dropRng(), selection = dropRng();
                const worn = e.gear ?? [];
                if (!worn.length && !plans.length) break;
                if (kind < B.drop_book_pct && plans.length) {
                    rewardCards.push({ no: e.spawnNo, blueprint: plans[Math.floor(selection * plans.length)] });
                    continue;
                }
                if (!worn.length) continue;
                rewardCards.push({ no: e.spawnNo, drop: worn[Math.floor(selection * worn.length)] });
            }
            // ~~처치 재료 판정 1회 → 종류 1회~~ — 2026-10-29 R373 삭제(item_design §1 「처치는 재료를 뱉지 않는다」 · INTERFACE §5-2 — 처치마다 굴림이 빠져 수열이 갈렸다)
        };

        /**
         * 비직격 고정 피해 한 대상 — 하는 일 `fixed` 가 부르는 이음매다 [2026-09-24 · R151 · PLAN_skill_structure 2단계 D6 — ~~자폭 전용 `blast` 함수~~].
         *   무엇을 · 얼마나는 스킬 쪽(`skill_effects.EFFECT_TYPES.fixed` — 세기 · 대상)이 정하고, 여기는 **기여표와 전투불능을 아는 쪽의 일**만 한다.
         *   자폭 [2026-09-21 · 사용자 확정 · skill_design §12-9 · battle_design §9-6] — 쓰러지는 순간(`downed` 끝의 `rt.fire(u, 'on_death')`) 적 전원에게 한 번 터진다.
         *   · **방어 · 저항 · 피해 감소 · 배리어를 하나도 빼지 않는 고정 피해**다 — 반사와 같은 비직격 처리(HP 직접 차감 · §9-6).
         *     대응 축을 HP 총량과 회복으로 묶는 확정의 연장이다
         *   · **rng 를 안 쓴다** · **흡혈 · 반사 · 경직 · 타격 훅을 유발하지 않는다** (§9-6 「아무것도 유발하지 않는다」)
         *   · 기여는 양쪽 다 센다 · 맞아서 쓰러지면 그 자리에서 `downed` 가 다시 돈다. **한 마리당 한 번**은 사건 규칙(`EVENT_TRIGGERS.on_death.once` · `u.fired`)이 든다 —
         *     지금 구조에서 연쇄는 안 생긴다(몬스터의 자폭은 파티만 때린다) — 그 규칙은 그 가정이 깨졌을 때의 잠금이다
         */
        const dealIndirect = (a, d, dmg, s) => {
            const ov = loseHp(d, dmg);
            const ev = { t: r1(t), e: 'blast', a: a.key, d: d.key, s, dmg, dhp: d.hp };
            if (ov) ev.ov = ov;
            timeline.push(ev);
            const ca = credit(a), cd = credit(d);
            if (ca) ca.dealt += dmg - ov;
            if (cd) cd.taken += dmg - ov;
            noteTaken(d, a, dmg - ov);
            if (d.hp <= 0) {
                if (ca && d.side !== 'party' && !d.summon && !d.rewarded) ca.kills += 1;
                killHeal(a, d);
                downed(d);
            }
        };

        /**
         * 처치 시 체력 회복 [2026-10-21 · 사용자 · R299 · item_design §1 「10-21 투구 개정」 — 투구 색욕 ①] — 상대 편 유닛을 쓰러뜨린 쪽이
         *   **제 최대 HP × 값 × (1 + 체력 회복 +%)** 를 회복한다(반올림은 흡혈과 같은 `F.leech`). 처치가 아닌 쓰러짐은 안 센다 —
         *   소환 벽 · 되살아난 무리의 두 번째 쓰러짐(보상 규칙과 같다 · 그래서 `downed` **앞**에서 부른다 — `rewarded` 가 거기서 선다).
         *   직격 · 반사 · 비직격 · 중독 · 오오라 피해 — 처치를 세는 자리 모두가 부른다 · 몬스터도 든다(입은 투구대로) · 쓰러진 쪽이 나를 쓰러뜨려도(반사) 산 쪽만.
         *   이벤트는 `regen` 이다(조용히 오른다 — 흡혈처럼 팝업 없음 · INTERFACE §2-6) · rng 0
         */
        const killHeal = (a, d) => {
            if (!a || !(a.killHeal > 0) || a.hp <= 0 || a.side === d.side || d.summon || d.rewarded) return;
            const amt = Math.min(a.hpMax - a.hp, F.leech(a.hpMax, a.killHeal, a.recv));
            if (!(amt > 0)) return;
            a.hp += amt;
            timeline.push({ t: r1(t), e: 'regen', u: a.key, amt, dhp: a.hp });
        };

        const downed = u => {
            if (u.swarm) u.swarm = null;     // 파리 떼는 몸과 함께 사라진다 (R380)
            timeline.push({ t: r1(t), e: 'down', u: u.key });
            // 적의 **소환 벽은 처치가 아니다** [2026-09-11 · R79] — 몬스터 행이 없어 골드·경험치·카드·드롭 어느 것도 정의되지 않는다.
            //   R79 로 몬스터가 스킬 칸을 갖게 되어 처음 생긴 경로다(챕터보스 고유 `mag_frozenwall` 등). onKill 을 안 지나므로 **rng 도 안 쓴다**.
            //   **파티 쪽 벽도 전투불능이 아니다** [2026-09-21 · 부채 #44 · INTERFACE §2-6 `downed`] — `makeSummon` 이 `uid` 를 안 주므로
            //   실으면 `undefined` 가 들어가 리포트의 「전투불능 N명」과 캘리브레이션 `avg downed` 열이 부푼다. 적 쪽 벽(위)과 같은 축이다
            //   **보상은 한 마리당 처음 쓰러질 때 한 번**이다 [2026-09-18 · INTERFACE §2-6 `rewarded`] — 불러내기로 되살아난 무리가 다시 쓰러지면
            //   onKill 을 안 지난다(경험치 · 골드 · 카드 · 드롭 · 처치 기록 없음 · rng 0). 같은 장비가 두 번 떨어지지 않는다
            if (u.side === 'enemy') { if (!u.summon && !u.rewarded) { u.rewarded = true; onKill(u); } }
            else if (!u.summon) { out.downed.push(u.uid); noteFall(u); }
            // 처치 정산(드롭 rng)이 **먼저** 돌아야 훅이 rng 를 써도 순서가 잠긴다 (INTERFACE §5-2)
            hooks.emit('down', u, { t });
            // 사건 `on_death` — 그 유닛의 사건 스킬(자폭)이 **죽음이 다 정산된 뒤에** 나간다. 자폭은 rng 0 이라 위 순서를 안 건드린다 (§9-6 · 2026-09-24 R151 — ~~`blast(u)`~~)
            rt.fire(u, 'on_death', t);
            // 오오라는 그 뒤에 꺼진다 — 자폭이 제 오오라를 입은 채 나가던 것은 그대로다 (R287)
            dropAuras(u);
        };

        /**
         * 쓰러지면 오오라가 꺼진다 [2026-10-18 · 사용자 지시 · R287 · skill_design §1-5 · INTERFACE §2-6 `buffs`] — 그 유닛이 건(`by`) 상시 창(`until: Infinity`)을
         *   **제 편 전원에게서** 걷는다. 창 열쇠가 걸린 효과라 같은 효과의 오오라를 든 **산 시전자**와 한 창을 나눠 쓰고 있었으면 그 오오라를 다시 건다 —
         *   안 걸면 산 기사의 오오라가 같이 사라진다. 이벤트는 그 자리에서 낸다: 다시 안 걸린 창의 `buffEnd` 가 먼저 · 다시 건 `buff` 가 뒤(갈아입기와 같은 문법 · R98).
         *   최대 HP 가 바뀐 유닛은 제 마지막 이벤트가 새 값을 싣는다(`expire` 와 같다 · 부채 #50) · 되살아나면 `callBand` 가 다시 건다 · rng 0
         */
        const dropAuras = u => {
            const side = u.side === 'party' ? party : units.enemies;
            const wasMax = new Map(side.map(x => [x, x.hpMax]));
            const removed = [];
            for (const x of side) for (const [id, b] of Object.entries(x.buffs)) {
                // `quiet` 상시 창(무기 옵션 방어력 감소 겹 `wx:def_stack` — 적에게 건다)은 오오라가 아니다
                if (b.by !== u.key || b.until !== Infinity || b.quiet) continue;
                delete x.buffs[id];
                removed.push({ x, id, s: b.s ?? id });
            }
            if (!removed.length) return;
            const lost = new Set(removed.map(r => r.id));
            const applied = [];
            for (const p of side) {
                if (p === u || p.hp <= 0 || !p.aura?.def.effects.some(x => x.effect === 'apply' && lost.has(x.status))) continue;
                castAura(p, side, applied);
            }
            const again = new Set(applied.map(a => `${a.u}|${a.s}`));
            const events = removed.filter(r => !again.has(`${r.x.key}|${r.s}`)).map(r => ({ t: r1(t), e: 'buffEnd', u: r.x.key, s: r.s }));
            for (const a of applied) events.push({ t: r1(t), ...a });
            const touched = new Set([...removed.map(r => r.x.key), ...applied.map(a => a.u)]);
            for (const x of side) {
                if (!touched.has(x.key)) continue;
                refreshDerived(x);
                if (x.hpMax === wasMax.get(x)) continue;
                for (let i = events.length - 1; i >= 0; i--) if (events[i].u === x.key) { Object.assign(events[i], { hpMax: x.hpMax, dhp: x.hp }); break; }
            }
            timeline.push(...events);
        };

        /**
         * 불러내기 [2026-09-18 · INTERFACE §2-13 · skill_design §12-9] — 시전자의 무리(`band`) 중 **서 있지 않은 것을 전부** 세운다.
         *   처음 서는 것(대기)은 적 배열 끝에 붙고, 쓰러진 것은 **그 자리에서 되살아난다** — HP 가득 · 창은 오오라만 남는다 · 경직 풀림.
         *   둘 다 첫 차례는 **제 행동 주기 한 바퀴 뒤**(등장 지연을 굴리지 않는다) · 스킬은 준비 상태(부른 시각 — 라운드 시작과 같은 규칙 · R100).
         *   새로 선 것의 오오라는 **지금** 건다(라운드 시작에 없었다) — 창 이벤트는 `call` 뒤에 나가도록 `then` 으로 돌려준다 · rng 0
         * @returns `{units: [표시값], then: [t 없는 이벤트]}` — 세운 것이 없으면 `units` 가 빈다
         */
        const callBand = (caster, at) => {
            const up = (caster.band ?? []).filter(m => !m.called || m.hp <= 0);
            let fresh = false;
            const revived = [];
            for (const m of up) {
                if (!m.called) {
                    m.called = true;
                    units.enemies.push(m);
                    fresh = true;
                } else {
                    revived.push(m);
                    m.hp = m.hpMax;
                    m.barrier = null;
                    m.stagUntil = 0;
                    m.stunUntil = 0;           // 스턴 · 중독 틱 · 알린 상태이상도 풀린다 (R178)
                    m.chan = null;             // 쓰러질 때 열려 있던 정신 집중도 걷힌다 — 칸 쿨은 아래에서 부른 시각에 준비 (R318)
                    m.dotAcc = 0;
                    m.ailShown = null;
                    m.regenAcc = 0;
                    for (const [id, b] of Object.entries(m.buffs)) if (b.until !== Infinity) delete m.buffs[id];
                    refreshDerived(m);
                }
                m.next = m.period;
                m.fillAt = at;                 // 빈 게이지가 이 시각부터 찬다 (R200)
                m.charges = 0;                 // 되살아나도 칸은 0 에서 (R200)
                for (const a of m.actives) if (!a.off) a.readyAt = at;   // 꺼진 칸은 그대로 (R187)
            }
            // 오오라 — 라운드 시작과 같은 함수다. 이미 걸린 유닛은 칸에서 오오라가 빠져 있어 다시 안 걸린다
            const then = fresh ? applyAuras(units.enemies) : [];
            // 되살아난 시전자는 제 오오라를 다시 건다 — 쓰러질 때 걷혔다(`dropAuras` · R287). HP 는 오오라를 입은 최대치로 가득
            const casters = revived.filter(m => m.aura);
            if (casters.length) {
                for (const m of casters) castAura(m, units.enemies, then);
                for (const x of units.enemies) refreshDerived(x);
                for (const m of revived) m.hp = m.hpMax;
            }
            return { units: up.map(enemyView), then };
        };

        /* ── 전투 진행 — 타겟팅 · 직격 1회 · 전투불능 (액티브 실행은 skill_runtime.js) ── */

        /**
         * 전열만 남긴다 — 전열 생존자가 없으면 받은 목록 그대로다(후열이 곧 최전선이 된다).
         * 랭크가 없는 유닛은 **전열(0)** 로 본다 — 자리를 못 받은 유닛이 뒤에 숨어 무적이 되면 안 된다.
         */
        const frontOf = foes => {
            const front = foes.filter(f => (f.rank ?? 0) === 0);
            return front.length ? front : foes;
        };
        const pickFrom = pool => pool[Math.floor(rng() * pool.length)];

        /** 도발자 — `taunt` 창(표식 — `skill_effects.stateOf`)이 켜진 생존 유닛 중 배열 순 첫 번째 (skill_design §9-2 기사 항) */
        const hasTaunt = list => list.find(p => p.hp > 0 && stateOf(p, 'taunt')) ?? null;

        /**
         * 단일 대상 선택 — 적 측은 **지목**(결투 선언) → **도발** 순으로 고정하고 그때는 **타겟 rng 를 쓰지 않는다**.
         * 결투가 먼저인 이유: 지목은 그 적 하나에게만 걸리는 개별 계약이고 도발은 적 전체에 거는 광역 규칙이라,
         *   좁은 쪽이 이기지 않으면 지목이 도발에 늘 먹혀 스킬이 죽는다 (skill_design §12-4).
         */
        function pickTarget(u, foes) {
            if (u.side === 'enemy') {
                const duel = stateOf(u, 'duel')?.[1];      // 지목 창(표식) — 첫 창의 건 자 `by`
                if (duel) {
                    const marked = party.find(p => p.key === duel.by && p.hp > 0);
                    if (marked) return marked;
                }
                const tn = hasTaunt(party);
                if (tn) return tn;
            }
            // **전열 우선 — 하드 게이트** [확정 2026-09-09 사용자 지시 · battle_design §3-1].
            //   전열(rank 0) 생존자가 하나라도 있으면 **후열은 대상이 되지 않는다**. 전열이 전멸해야 뒤가 열린다.
            //   굴림은 여전히 **1회**다 — 바뀐 것은 모집단뿐이라 rng 소비 수열이 안 밀린다 (INTERFACE §5-2)
            return pickFrom(frontOf(foes));
        }

        /** 피해 적용 — 배리어(HP 밖 흡수 풀)가 먼저 먹고 남은 몫만 HP 를 깎는다 */
        function applyDamage(target, dmg) {
            let absorbed = 0;
            if (target.barrier) {
                absorbed = Math.min(target.barrier.amt, dmg);
                target.barrier.amt -= absorbed;
            }
            target.hp = Math.max(0, target.hp - (dmg - absorbed));
            return { absorbed };
        }

        /** 비직격 피해 — HP 에서 바로 뺀다(배리어 없음 · §9-6). 돌려주는 것은 **넘친 몫**(남은 HP 밖으로 넘친 양 · 쓰러뜨렸을 때만 0 초과) —
         *  기여 · 쓰러짐 기록은 `dmg − 넘친 몫`(실제로 깎은 값)을 센다 [2026-10-23 · R326 · INTERFACE §2-6 `ov`] */
        function loseHp(d, dmg) {
            // 파리 떼면 첫 산 파리가 받는다 — 넘친 몫 = 그 파리 HP 밖으로 넘친 양(뭉칠 때 안 돌아온다) (2026-10-29 · R380)
            if (d.swarm) return swarmTake(d, dmg, false).ov;
            const ov = Math.max(0, dmg - d.hp);
            d.hp = Math.max(0, d.hp - dmg);
            return ov;
        }

        /**
         * 파리 떼 [2026-10-29 · R380 · skill_design §12-9 스웜 · INTERFACE §2-6 「장 보스 고유 넷의 장치」] — **한 자리 안에 몸이 여럿**.
         *   유닛은 하나 그대로(대상 · 자리 · 판 크기 불변)이고 `u.swarm = {key, v, hp: [마리마다], hp0}` 가 몸을 든다 · 창(`swarm`)이 열고 만료가 닫는다.
         *   여는 순간 마리마다 HP = 지금 HP × 값(반올림 · 1 이상) · 마리 수 = [balance.csv:swarm_fly_count]. 본체 HP 는 창 동안 그대로다.
         *   **받는 피해** — `spread`(여럿을 치는 공격 대상 · 평타 광역)면 산 파리마다 그 피해 · 아니면 첫 산 파리 하나(직격 · 비직격 같다).
         *   파리가 다 쓰러지면 본체 HP 가 0 이 되고 평소 쓰러짐을 지난다(보상 · 사건) · 닫히면 파리 HP 합 ÷ 연 순간 합의 비율로 본체가 닳는다(1 아래로는 안 간다).
         *   이벤트 `fly`(`u`, `hp`) — 파리 HP 가 바뀔 때마다 · `swarmEnd`(`u`, `dhp`) — 뭉쳤다. rng 0
         */
        const swarmOpen = (u, x, ev) => {
            const each = Math.max(1, Math.round(u.hp * x.value));
            const hp = Array.from({ length: B.swarm_fly_count }, () => each);
            u.swarm = { key: x.status ?? x.id, v: x.value, hp, hp0: each * hp.length };
            ev.fly = hp.slice();
        };
        const swarmClose = (u, at) => {
            const sw = u.swarm;
            if (!sw) return;
            u.swarm = null;
            const left = sw.hp.reduce((a, b) => a + b, 0);
            if (left > 0) u.hp = Math.max(1, Math.round(u.hp * left / sw.hp0));
            timeline.push({ t: r1(at), e: 'swarmEnd', u: u.key, dhp: u.hp });
        };
        /** 파리에게 피해 — `{absorbed: 0, took, ov}` · `took` = 실제로 깎은 파리 HP 합 · `ov` = 맞은 파리 HP 밖으로 넘친 양의 합 */
        function swarmTake(u, dmg, spread) {
            const sw = u.swarm;
            let took = 0, ov = 0;
            for (let i = 0; i < sw.hp.length; i++) {
                if (sw.hp[i] <= 0) continue;
                const cut = Math.min(sw.hp[i], dmg);
                took += cut;
                ov += dmg - cut;
                sw.hp[i] -= cut;
                if (!spread) break;
            }
            timeline.push({ t: r1(t), e: 'fly', u: u.key, hp: sw.hp.slice() });
            if (sw.hp.every(h => h <= 0)) { u.swarm = null; u.hp = 0; }
            return { absorbed: 0, took, ov };
        }

        /**
         * 물리 경직 [2026-09-17 · R110 · battle_design §2-3] — **행동 차례만** 늦춘다. 스킬 쿨(`readyAt` 은 절대 시각) · 창 · 재생 · 물약은 그대로 돈다
         *   (쿨까지 멈추는 것은 스턴이다). 길이는 [balance.csv:stagger_sec] 고정 × (1 − 타격 회복) — 피해에 비례하지 않고, 0 이하면 면역이다.
         *   타격 회복은 **비율**이다(0.5 = 50% · R111 단위 규약 — `/ 100` 을 붙이지 않는다).
         * 멈추는 방법은 **행동 예약(`next`)을 미는 것**이다 — 틱을 건너뛰면 같은 틱에 먼저 행동한 유닛과 아직 안 한 유닛의 경직이 한 틱 갈리지만,
         *   예약을 밀면 배열 순서와 무관하게 차례가 정확히 그만큼 늦는다.
         * 경직 중에 다시 걸리면 **끝나는 시각만 새로 잡는다**(남은 시간에 더하지 않는다) — 그래서 옛 끝과 새 끝의 차이만 민다 · 새 끝이 더 이르면 아무것도 안 한다(2026-10-17). rng 0
         * `a` = 경직을 건 쪽 — **경직 시간 증가**(`a.staggerDur` · 무기 시기 ③ · 2026-10-05 R206)가 길이에 곱해진다. 0 · 모름이면 ×1 이라 종전 값이다
         *   도감 Lv2 [2026-10-22 · R314] — 파티가 그 종족에 거는 경직 = 경직 시간 증가에 더하고 · 그 종족이 파티에 거는 경직 = 타격 회복에 더한다(종족 몫은 몬스터가 든다)
         */
        function stagger(u, a = null) {
            const sd = (a?.staggerDur ?? 0) + (a?.side === 'party' ? u.codex?.fight.stagger_dur_pct ?? 0 : 0);
            const fh = u.fhr + (u.side === 'party' ? a?.codex?.fight.fhr ?? 0 : 0);
            const dur = B.stagger_sec * (sd ? 1 + sd : 1) * Math.max(0, 1 - fh);
            if (!(dur > 0)) return;
            const end = t + dur;
            // 늦게 끝나는 쪽만 [2026-10-17] — 경직 시간 증가(R206)로 걸 때마다 길이가 달라져, 짧은 경직이 긴 경직을 덮으면 `end − from` 이 음수가 되어
            //   차례를 오히려 당기고 끝을 줄였다(경직 중에 마법 무기가 칸을 썼다). 스턴(`stun`)과 같은 규칙 — 더 일찍 끝나는 경직은 차례 · 끝을 안 건드린다.
            //   이벤트는 남긴다 — 「경직이 걸릴 피해면 그 hit 바로 뒤에 stagger」 계약 그대로이고 `until` 은 **지금 걸린 끝**이다(재생이 그 시각까지 경직으로 그린다).
            //   끝이 같으면 종전 그대로 — 0 만큼 밀고 이벤트를 남긴다(같은 틱에 여러 대 맞는 판)
            if (end < u.stagUntil) { timeline.push({ t: r1(t), e: 'stagger', u: u.key, until: r1(u.stagUntil) }); return; }
            // 스턴과 누적하지 않는다 [2026-09-28 · R178 · battle_design §2-7] — 스턴이 더 늦게 끝나면 그 뒤로 넘는 몫만 민다. 스턴이 없으면 종전 그대로
            const from = Math.max(u.stagUntil, t);
            u.next += u.stunUntil > from ? Math.max(0, end - u.stunUntil) : end - from;
            u.stagUntil = end;
            timeline.push({ t: r1(t), e: 'stagger', u: u.key, until: r1(end) });
        }

        /**
         * 스턴 [2026-09-28 · R178 · battle_design §2-7] — **행동 차례와 스킬 쿨을 함께 멈춘다**(경직은 차례만). 런타임이 스턴 창을 건 뒤 부른다(`ctx.stun`).
         *   · 또 걸리면 늦게 끝나는 쪽 — `end ≤ stunUntil` 이면 아무것도 안 민다
         *   · 행동 예약 — 경직 · 스턴 중 **더 늦게 끝나는 것 뒤로 넘는 몫만** 민다(누적하지 않는다 — 경직 1초 남은 유닛에 스턴 2초면 2초 뒤에 풀린다)
         *   · 스킬 쿨 — **아직 안 준비된 칸만** 스턴이 늘어난 만큼 민다(준비된 칸은 준비된 채 기다린다)
         *   재생 · 물약 · 창 시간은 그대로 흐른다 · rng 0
         * @returns 민 쿨 초 — `buff` 이벤트의 `cd`(재생기가 칸의 준비 시각에 더한다)
         */
        function stun(u, end) {
            const from = Math.max(u.stunUntil ?? 0, t);
            if (!(end > from)) return 0;
            const block = Math.max(from, u.stagUntil ?? 0);
            if (end > block) u.next += end - block;
            const cd = end - from;
            for (const a of u.actives) if (a.readyAt > t + EPS) a.readyAt += cd;
            u.stunUntil = end;
            return cd;
        }

        /**
         * 정신 집중의 한 틱 [2026-10-22 · 사용자 「도트딜로」 · 「직격」 · 간격 「0.5초마다」 · battle_design §3-2] — 열린 동안 그 유닛은 차례 · 칸 충전을 건너뛰고(`next` 가 선다)
         *   여기서 `acc` 를 쌓아 `iv`(끊어 치기 [balance.csv:channel_strike_sec] · 계속 닳기 [balance.csv:channel_tick_sec] · 모으기 그 스킬의 `chargeSec`)마다
         *   한 방(`rt.chanHit` — `chan` 이벤트 · 직격 굴림)을 친다. **경직 · 스턴 중엔 안 쌓는다**(빔이 선다) · 끊어 치기도 초 시계다(2026-10-30 R392 — ~~행동 주기~~).
         *   살아 있는 적이 없으면 치지 않는다(라운드가 끝나는 틱) · 마지막 방이면 `chanHit` 이 같은 틱에 닫는다 · rng 는 한 방의 직격 굴림뿐
         */
        function chanTick(u) {
            if (u.stagUntil > t + STEP_EPS || (u.stunUntil ?? 0) > t + STEP_EPS) return;
            const c = u.chan;
            c.acc += TICK;
            if (c.acc + STEP_EPS < c.iv) return;
            c.acc -= c.iv;
            if (rt.alive(rt.foesOf(u)).length) rt.chanHit(u, t);
        }

        /**
         * 마법 무기의 한 틱 — **칸 충전식** [2026-10-02 · 사용자 확정 · R200 · battle_design §3 — ~~찬 채로 기다렸다가 준비되는 틱에 시전~~(R198)].
         *   ① 채우기 — 칸이 상한([balance.csv:cast_charge_max]) 밑이면 게이지(`next`)가 돌고, 다 차면 칸 하나 · `charge` 이벤트 · 다음 칸을 새로 채운다.
         *      칸이 다 차면 게이지가 선다(`next` 를 안 줄인다 — 그 값은 시전이 다시 세운다)
         *   ② 시전 — 칸이 있고 · 경직 · 스턴이 아니고 · 고를 스킬이 있으면 칸 하나를 쓰고 시전한다. **틱 하나에 하나** — 쌓인 칸만큼 틱마다 연달아 나간다.
         *      다 찬 채 서 있던 게이지는 이 순간 다시 돈다 · 차던 게이지는 안 건드린다(충전식). `act` 가 아무것도 안 했으면(적이 없다) 칸을 되돌린다
         *   경직 · 스턴은 `next` 를 밀어 채우기를 멈춘다(`stagger` · `stun` 그대로) — 시전은 위 조건이 막는다.
         *   ③ 시전 뒤 [2026-10-05 · R208 · INTERFACE §2-6 「죄종 계열 옵션」] — **시전 칸 충전**(`castRefund > 0` 이면 **rng 1회** · 터지면 칸 +1 · `charge` 이벤트) →
         *      **시전 누적**(`castStack > 0` 이면 겹 +1 · 상한 [balance.csv:cast_stack_max] · 창 `cx:cast_stack` = 데미지 % 괄호의 덧셈 · rng 0).
         *      둘 다 옵션이 없으면 아무 일도 없다 — 그 밖에 rng 0
         */
        /**
         * 델리게이트 [2026-10-29 · R380 · skill_design §12-9 · INTERFACE §2-6 「장 보스 고유 넷의 장치」] — `delegate` 창(오오라)을 든 유닛의 차례가 오면
         *   **공격력(중앙값)이 가장 높은 아군** 하나가 그 차례를 받는다. 받을 수 없는 아군 — 자기 · 쓰러짐 · 소환 · 같은 창을 든 유닛 · 경직 · 스턴 중 · 정신 집중 중(셋 다 · 2026-10-30 R392 — 끊어 치기도 차례가 없다).
         *   동률이면 배열 순 앞 · 받을 아군이 없으면 null(제가 행동한다) · rng 0
         */
        function delegateTo(u) {
            let best = null, top = -Infinity;
            for (const x of rt.alliesOf(u)) {
                if (x === u || x.hp <= 0 || x.summon || stateOf(x, 'delegate') || x.chan
                    || x.stagUntil > t + STEP_EPS || (x.stunUntil ?? 0) > t + STEP_EPS) continue;
                const a = ((x.atkMin ?? 0) + (x.atkMax ?? 0)) / 2;
                if (a > top) { best = x; top = a; }
            }
            return best;
        }

        /**
         * 받은 차례 — `delegate` 이벤트 뒤 받은 아군이 **한 번 더** 행동한다(제 행동 예약 `next` 는 그대로). 마법 무기는 칸 하나가 찬다(가득이면 버린다 ·
         *   시전은 제 칸 틱이 평소처럼 고른다). 넘긴 유닛은 그 차례에 아무것도 안 한다 · rng = 받은 아군의 그 차례 굴림 그대로
         */
        function handOff(u, to) {
            timeline.push({ t: r1(t), e: 'delegate', u: u.key, d: to.key });
            if (!to.noBasic) { rt.act(to, t); return; }
            if (to.charges >= B.cast_charge_max) return;
            to.charges += 1;
            timeline.push({ t: r1(t), e: 'charge', u: to.key, ch: to.charges });
        }

        function chargeTick(u) {
            // 정신 집중이 열린 동안은 여기 안 온다 — 행동 순회가 `chanTick` 으로 돌린다(칸이 안 찬다 · 2026-10-30 R392 — ~~끊어 치기는 `next` 가 방 사이 시계~~)
            const max = B.cast_charge_max;
            if (u.charges < max) {
                u.next -= TICK;
                if (u.next <= STEP_EPS) {
                    u.next = u.period;
                    // 델리게이트 — 마법 무기는 칸이 차는 차례를 넘긴다(제 칸은 안 찬다) (2026-10-29 · R380)
                    const to = stateOf(u, 'delegate') ? delegateTo(u) : null;
                    if (to) handOff(u, to);
                    else {
                        u.charges += 1;
                        timeline.push({ t: r1(t), e: 'charge', u: u.key, ch: u.charges });
                    }
                }
            }
            // 멈춤 판정은 끝 시각과 같은 여유로 — `t += TICK` 의 누적 오차가 틱 하나를 더 막지 않게 (#69 와 같은 이유)
            if (u.charges <= 0 || u.stagUntil > t + STEP_EPS || (u.stunUntil ?? 0) > t + STEP_EPS || !rt.pick(u, t)) return;
            const full = u.charges >= max;
            u.charges -= 1;
            if (!rt.act(u, t)) { u.charges += 1; return; }
            if (full) u.next = u.period;
            if (u.castRefund > 0 && rng() < u.castRefund && u.hp > 0 && u.charges < max) {
                u.charges += 1;
                timeline.push({ t: r1(t), e: 'charge', u: u.key, ch: u.charges });
            }
            if (u.castStack > 0 && u.hp > 0) {
                u.castStacks = Math.min(B.cast_stack_max, (u.castStacks ?? 0) + 1);
                u.buffs['cx:cast_stack'] = { stat: 'atk_pct', v: u.castStack * u.castStacks, until: Infinity, element: null, by: u.key, quiet: true };
                refreshDerived(u);
            }
        }

        /**
         * 중독 틱 한 유닛 [2026-09-28 · R178 · battle_design §2-6] — 가장 센 중독 창(`strongestOf`)이 있으면 `dotAcc` 를 쌓고
         *   [balance.csv:dot_tick_sec] 에 닿을 때마다 `초당 피해 × 간격` 을 **독 저항만** 거쳐 HP 에서 바로 뺀다 —
         *   비직격(battle_design §9-6): 배리어 · 방어 · 피해 감소 · 적중 · 치명 · 흡혈 · 반사 · 경직 · 훅 없음. 중독이 없으면 누산을 비운다.
         *   기여 · 처치는 그 창을 건 유닛의 몫(자리에 없으면 없다) · 쓰러지면 `down`(처치 정산의 드롭 굴림이 이 자리 — INTERFACE §5-2). 그 밖에 rng 0
         */
        function poisonTick(u) {
            const w = strongestOf(u, 'poison');
            if (!w) { u.dotAcc = 0; return; }
            u.dotAcc = (u.dotAcc ?? 0) + TICK;
            if (u.dotAcc + EPS < B.dot_tick_sec) return;
            u.dotAcc -= B.dot_tick_sec;
            const resist = F.appliedResist(u.res?.poison ?? 0, u.resMaxBonus ?? 0, u.resMaxEl?.poison ?? 0);
            const dmg = F.indirect(w.v * B.dot_tick_sec * (1 - resist));
            const ov = loseHp(u, dmg);
            const ev = { t: r1(t), e: 'dot', a: w.by, d: u.key, k: 'poison', s: w.s, dmg, dhp: u.hp, ty: 'poison' };
            if (ov) ev.ov = ov;
            timeline.push(ev);
            const src = party.find(x => x.key === w.by) ?? units.enemies.find(x => x.key === w.by) ?? null;
            const ca = src ? credit(src) : null, cd = credit(u);
            if (ca) ca.dealt += dmg - ov;
            if (cd) cd.taken += dmg - ov;
            noteTaken(u, src, dmg - ov);
            if (u.hp <= 0) {
                if (ca && u.side !== 'party' && !u.summon && !u.rewarded) ca.kills += 1;
                killHeal(src, u);
                downed(u);
            }
        }

        /**
         * 오오라 피해 틱 한 유닛 [2026-10-16 · R249 · skill_design §12-4 홀리 파이어 · INTERFACE §2-6 「기본 스킬 50 의 장치」] — 첫 `pulse` 창이 있으면 `pulseAcc` 를 쌓고
         *   [balance.csv:aura_pulse_sec] 에 닿을 때마다 그 유닛의 생존 적마다(배열 순) `공격력 중앙값 × 창 값` 을 **그 원소의 저항만** 거쳐 HP 에서 바로 뺀다 —
         *   중독과 같은 비직격(배리어 · 방어 · 피해 감소 · 적중 · 치명 · 흡혈 · 반사 · 경직 · 훅 없음). 기여 · 처치는 이 유닛의 몫 · 쓰러지면 `down`.
         *   창이 없으면 누산을 비운다. 그 밖에 rng 0(처치 정산의 드롭 굴림만 — INTERFACE §5-2)
         */
        function pulseTick(u) {
            const w = stateOf(u, 'pulse')?.[1];
            if (!w) { u.pulseAcc = 0; return; }
            u.pulseAcc = (u.pulseAcc ?? 0) + TICK;
            if (u.pulseAcc + EPS < B.aura_pulse_sec) return;
            u.pulseAcc -= B.aura_pulse_sec;
            const el = w.element ?? 'fire';
            const base = ((u.atkMin ?? 0) + (u.atkMax ?? 0)) / 2 * w.v;
            const ca = credit(u);
            for (const d of alive(rt.foesOf(u))) {
                const resist = F.appliedResist(d.res?.[el] ?? 0, d.resMaxBonus ?? 0, d.resMaxEl?.[el] ?? 0);
                const dmg = F.indirect(base * (1 - resist));
                if (!(dmg > 0)) continue;
                const ov = loseHp(d, dmg);
                const ev = { t: r1(t), e: 'dot', a: u.key, d: d.key, k: 'pulse', s: w.s, dmg, dhp: d.hp, ty: el };
                if (ov) ev.ov = ov;
                timeline.push(ev);
                const cd = credit(d);
                if (ca) ca.dealt += dmg - ov;
                if (cd) cd.taken += dmg - ov;
                noteTaken(d, u, dmg - ov);
                if (d.hp <= 0) {
                    if (ca && d.side !== 'party' && !d.summon && !d.rewarded) ca.kills += 1;
                    killHeal(u, d);
                    downed(d);
                }
                if (u.hp <= 0) break;
            }
        }

        /**
         * 무기 옵션의 조건부 추가 피해 % — **데미지 % 괄호에 덧셈**이다 (battle_design §9-1 · item_design §1 「무기 옵션」 · R78 · ~~조건부 괄호~~ 2026-09-18 한 괄호).
         *   vs 종족(`monster.csv:monster_type`) · vs 등급(normal 이 아니면 정예 · 보스) · vs 열(`rank` 0 전열 · 1 후열) · 원소(그 타격의 공격 타입)
         */
        const condPct = (fx, d, type) =>
            (fx.vs[String(d.monsterType ?? '').toLowerCase()] ?? 0)
            + (d.grade && d.grade !== 'normal' ? fx.vsElite : 0)
            + (d.rank === 0 ? fx.vsFront : d.rank === 1 ? fx.vsBack : 0)
            + (type !== 'physical' ? (fx.ele[type] ?? 0) : 0);
        /**
         * 방어구 옵션의 조건부 **받는** 피해 감소 [2026-09-18 · item_design §1 「갑옷 옵션」 · 사용자 확정] — 무기 쪽 `condPct` 의 짝이다.
         *   조건은 **때린 쪽**(`a`)의 종족 · 등급 · 열이고, 셋을 **더한 뒤 한 원천으로** 곱한다(`strikeOnce`). 종족 · 등급이 없는 영웅이 때리면 열 몫만 선다. rng 0
         */
        const condDr = (fx, a) =>
            (fx.vsDr?.[String(a.monsterType ?? '').toLowerCase()] ?? 0)
            + (a.grade && a.grade !== 'normal' ? fx.vsEliteDr ?? 0 : 0)
            + (a.rank === 0 ? fx.vsFrontDr ?? 0 : a.rank === 1 ? fx.vsBackDr ?? 0 : 0);

        /*
         * 죄종 마스터리 T2 조건부 [2026-10-05 · 사용자 확정 · skill_design §3-2 · INTERFACE §2-6 「마스터리 조건부」] — 무기 `condPct` · 방어구 `condDr` 와 같은 자리다:
         *   `strikeOnce` 가 `F.strike` 직전에 판정해 **그 타격 동안만** 얹고 원복한다. HP 는 그 타격 직전 값 · rng 0 · 이벤트 없음.
         *   `self` = 노드 주인 · `other` = 상대(때리는 쪽이면 맞는 쪽 · 맞는 쪽이면 때린 쪽)
         */
        const condOn = (cond, self, other, m = null) => {
            switch (cond) {
                case 'wounded': return self.hp < self.hpMax * B.mastery_t2_hp_threshold_pct;    // 분노 — 문턱 **미만**
                case 'fury': return self.hp < self.hpMax * m.thr;                                 // 분노 T3 — 랭크가 올린 문턱 **미만** (R343)
                case 'sated': return self.hp >= self.hpMax * B.mastery_t2_hp_threshold_pct;     // 폭식 — 문턱 **이상**
                case 'stronger': return other.hp > self.hp;                                       // 시기 — 현재 HP **수치** 비교
                case 'weaker': return other.hp < self.hp;                                         // 오만
                case 'elite': return !!other.grade && other.grade !== 'normal';                   // 탐욕 — 정예 · 보스
                case 'ailing': return Object.values(other.buffs ?? {}).some(b => b.ail);          // 색욕 — 결빙 · 화상 · 중독 · 스턴 창
                default: return false;                                                            // `tick` · `feast` 는 겹으로 따로 잰다
            }
        };
        /** 나태 겹 — 라운드가 열린 뒤 [balance.csv:mastery_sloth_t2_tick_sec] 마다 하나 · 상한 [balance.csv:mastery_sloth_t2_max_stack]. 시각 꼬리는 걸음과 같은 여유로 판정한다 */
        const tickStacks = () => Math.min(B.mastery_sloth_t2_max_stack, Math.floor((t - roundAt) / B.mastery_sloth_t2_tick_sec + STEP_EPS));
        /** 그 유닛의 겹 줄 중 한 능력치의 지금 합(줄마다 `v × 겹`) */
        const tickSum = (u, stat) => {
            const n = tickStacks();
            return n > 0 ? u.mtick.reduce((s, m) => s + (m.stat === stat ? m.v * n : 0), 0) : 0;
        };
        // 때리는 쪽에서 얹는 능력치 — 나머지(피해 감소 · 모든 저항 · 반사)는 맞는 쪽에서 얹는다 · 쿨감은 틱이 되쓴다
        const COND_ATK = new Set(['crit_rate', 'crit_damage', 'def_ignore', 'atk_pct', 'crushing_blow_pct', 'life_steal']);
        /** 그 타격에 켜진 몫 — `{sum: {stat: v}, dr: [원천…]}` · `atk` 면 때리는 쪽 능력치만 · 아니면 맞는 쪽 능력치만. **노드 하나 = 피해 감소 원천 하나**(겹은 줄마다 하나) */
        const condSum = (self, other, atk) => {
            const out = { sum: {}, dr: [] };
            for (const m of self.mcond) {
                if (m.stat === 'cooldown_reduction' || COND_ATK.has(m.stat) !== atk) continue;
                const v = m.cond === 'tick' ? m.v * Math.max(0, tickStacks())
                    : m.cond === 'feast' ? m.v * (self.feast ?? 0)                  // 폭식 T3 — 이 타격 **전**까지 쌓인 겹 (R343)
                    : condOn(m.cond, self, other, m) ? m.v : 0;
                if (!(v > 0)) continue;
                if (m.stat === 'damage_reduction') out.dr.push(Math.min(1, v));   // 원천 하나가 100% 를 넘으면 피해가 회복으로 뒤집힌다 — 겹이 커도 1 에서 자른다
                else out.sum[m.stat] = (out.sum[m.stat] ?? 0) + v;
            }
            return out;
        };

        /**
         * 직격 1회 — 기본 공격과 스킬 타격이 **같은 함수**를 쓴다.
         * 스킬 배율·원소 태그·**스킬 타격 필드**(`sk`)는 `strike` 시그니처를 건드리지 않으려고 **그 타격 동안만** 유닛에 얹고 원복한다.
         * `s`(스킬 id)·`proc`(추가 피해가 터졌다)·`bar`(배리어 잔량)는 해당될 때만 붙는다 — 기본 공격의 이벤트 모양·rng 수열은 그대로다.
         * @param sk `{statMult, procChance, procMult}` — **스킬 타격만** 넘긴다(skill_effects 공격 대상 표). 기본 공격은 안 넘긴다 — 능력치 계수는 평타 계수(`mainMult`) · 추가 피해 0
         */
        /**
         * 부류의 기믹 [2026-10-29 · R388 · monster_design §3-1 — D4 · D6 · D7] — 그 직격 순간 **서 있는 적**(`hp > 0`)을 센다 · 창 · 이벤트 없음 · rng 0.
         *   `familyUp` = 때리는 쪽 데미지 몫 — 군대(서 있는 군대가 `n` 이상) · 거인(서 있는 적이 자기 하나 · ⚠ Q8 데미지만) ·
         *   `familyGuard` = 맞는 쪽 받는 피해 감소 몫 — 수호자(자기 아닌 수호자가 서 있으면 **후열** 몬스터) · 결투장 유닛은 `family` 가 없어 0
         */
        const familyUp = u => {
            const f = u.side === 'enemy' ? FAMILIES[u.family] : null;
            if (!f) return 0;
            const up = units.enemies.filter(e => e.hp > 0);
            if (u.family === 'Army') return up.filter(e => e.family === 'Army').length >= f.n ? f.value : 0;
            if (u.family === 'Giant') return up.length === 1 && up[0] === u ? f.value : 0;
            return 0;
        };
        const familyGuard = target => {
            const f = FAMILIES.Guardian;
            if (!f || target.side !== 'enemy' || target.monsterId == null || target.rank !== 1) return 0;
            return units.enemies.some(e => e !== target && e.hp > 0 && e.family === 'Guardian') ? f.value : 0;
        };

        function strikeOnce(u, target, mult, element, s, sk = null, spread = sk?.spread ?? false, afterStrike = null) {
            // 이베이드 [2026-10-16 · R247 · INTERFACE §2-6 「기본 스킬 50 의 장치」] — 횟수가 남은 창이 있으면 **굴리지 않고** 통째로 피한다.
            //   피해 · 경직 · 창 · 훅 · 반사 · 반격 · 집계 없음. 다 쓰면 그 창을 닫는다. 창이 없으면 아무 일도 없다(rng 불변)
            const ev0 = stateOf(target, 'evade');
            if (ev0 && ev0[1].n > 0) {
                const [key, w] = ev0;
                w.n -= 1;
                const dodge = { t: r1(t), e: 'evade', a: u.key, d: target.key, n: w.n };
                if (s) dodge.s = s;
                if (sk?.hitIndex != null) dodge.i = sk.hitIndex;
                timeline.push(dodge);
                if (w.n <= 0) {
                    delete target.buffs[key];
                    timeline.push({ t: r1(t), e: 'buffEnd', u: target.key, s: w.s ?? key });
                    refreshDerived(target);
                }
                afterStrike?.(false);
                return;
            }
            const mult0 = u.skillMult, type0 = u.atkType, stat0 = u.statMult, chance0 = u.procChance, pmult0 = u.procMult, cond0 = u.condPct;
            // 이 타격 **전에** 결빙돼 있었나 — 딥 프리즈 `shatter` 창이 읽는다(이 타격이 건 결빙은 안 친다 · 2026-10-29 · R385) · rng 0
            const frozen0 = (target.buffs?.freeze?.until ?? 0) > t;
            const fx = u.fx;                                 // 무기 옵션 묶음 — 없으면 null (R78)
            const hitType = element || u.atkType;            // 그 타격의 공격 타입 — 원소 조건 · 저항 감소 창이 읽는다
            u.skillMult = mult;
            if (element) u.atkType = element;               // 원소 태그가 있는 스킬은 무기 원소를 무시한다 (§9-5)
            // 능력치 계수 [2026-09-18 · battle_design §9-2] — 스킬 타격 = 그 스킬의 데미지 슬롯 능력치(`scaleDef` · 몬스터는 거기서 1) ·
            //   기본 공격(부여 원소 추가타 · 반격 포함) = 직업 메인 스탯. ~~능력치 항을 더한다(09-10)~~ 폐기
            u.statMult = sk ? (sk.statMult ?? 1) : u.mainMult;
            u.procChance = sk?.procChance ?? 0;              // 확률로 터지는 추가 피해 — 확률이 0 이면 strike 가 굴리지 않는다
            u.procMult = sk?.procMult ?? 0;
            // 조건부 추가 피해 — vs 종족 · 등급 · 열 · 원소를 그 타격 동안만 얹는다. strike 가 **데미지 % 괄호 안에** 더한다 (battle_design §9-1 · R78 · 2026-09-18). rng 0
            u.condPct = fx ? condPct(fx, target, hitType) : 0;
            if (sk?.tagDamage) u.condPct += sk.tagDamage;
            // 물리 데미지 % [2026-10-16 · R246 · 워 크라이 — 적에게 음수] — 물리 타격만 같은 괄호에 더한다. 창이 없으면 안 더한다(부동소수 그대로)
            if (hitType === 'physical') {
                const phys = sumOf(u, 'phys_pct');
                if (phys) u.condPct += phys;
            }
            // 도감 Lv2 「그 종족 상대」 [2026-10-18 · R286 · 2026-10-22 · R314 그 종족 전체 · 줄 열다섯 · monster_design §8 · INTERFACE §2-6 「도감 사다리」] —
            //   몬스터만 `codex` 를 든다(스폰 때 · 결투장 · 소환은 없다). `cxA` = 파티가 그 종족을 때릴 때 · `cxD` = 그 종족이 파티를 때릴 때의 줄 —
            //   **그 타격 동안만** 얹고 아래에서 되돌린다 · 줄이 없으면 안 건드린다(부동소수 그대로) · rng 0
            const cxA = u.side === 'party' ? target.codex?.fight ?? null : null;
            const cxD = target.side === 'party' ? u.codex?.fight ?? null : null;
            if (cxA?.vs_dmg) u.condPct += cxA.vs_dmg;   // 상대 데미지 — 무기 조건부 % 와 같은 괄호 · 무기 옵션 묶음이 없어도 붙는다
            // 죄종 마스터리 T2 조건부 [2026-10-05] — 둘 다 **때리기 전 HP** 로 판정한다. 때리는 쪽 몫은 치명 · 치명 피해 · 방어 무시 · 데미지 %(같은 괄호) ·
            //   강타 · 흡혈 · 맞는 쪽 몫은 피해 감소(노드마다 원천 하나) · 모든 저항 · 반사. 없으면 null 이라 종전과 같다 · rng 0
            const ma = u.mcond ? condSum(u, target, true) : null;
            const md = target.mcond ? condSum(target, u, false) : null;
            const crit0 = u.crit, critDmg0 = u.critDmg, defIgnore0 = u.defIgnore, res0 = target.res;
            if (ma) {
                const s = ma.sum;
                if (s.crit_rate) u.crit = (u.crit ?? 0) + s.crit_rate;
                if (s.crit_damage) u.critDmg = (u.critDmg ?? 1) + s.crit_damage;
                if (s.def_ignore) u.defIgnore = (u.defIgnore ?? 0) + s.def_ignore;
                if (s.atk_pct) u.condPct += s.atk_pct;
            }
            // 방어 무시 창 [2026-10-29 · R383 · skill_design §12-5 피어싱 샷] — **물리 타격만** 그 타격 동안 창 합을 더한다(아래 `defIgnore0` 로 되돌린다) · 창이 없으면 안 건드린다 · rng 0
            if (hitType === 'physical') {
                const di = sumOf(u, 'def_ignore');
                if (di) u.defIgnore = (u.defIgnore ?? 0) + di;
            }
            if (md?.sum.res_all) target.res = Object.fromEntries(Object.entries(res0 ?? {}).map(([e, v]) => [e, v + md.sum.res_all]));
            // 도감 Lv2 — 때리는 쪽(치명 · 명중 · 저항 감소) · 맞는 쪽(모든 원소 저항 · 절대값 피해 감소) (R314)
            const hitBonus0 = u.hitBonus, resRed0 = u.resReduction, drFlat0 = target.drFlat;
            if (cxA?.crit_rate) u.crit = (u.crit ?? 0) + cxA.crit_rate;
            if (cxA?.hit_bonus) u.hitBonus = (u.hitBonus ?? 0) + cxA.hit_bonus;
            if (cxA?.res_reduction) u.resReduction = (u.resReduction ?? 0) + cxA.res_reduction;
            if (cxD?.res_all) target.res = Object.fromEntries(Object.entries(target.res ?? {}).map(([e, v]) => [e, v + cxD.res_all]));
            if (cxD?.dr_flat) target.drFlat = (target.drFlat ?? 0) + cxD.dr_flat;
            // 조건부 받는 피해 감소 — 맞는 쪽의 방어구 옵션. 셋을 더한 합이 **원천 하나**로 그 타격 동안만 `dr` 에 곱해진다 (2026-09-18). 합이 0 이면 안 건드린다
            const dr0 = target.dr;
            const guard = target.fx ? condDr(target.fx, u) : 0;
            if (guard) target.dr = 1 - (1 - dr0) * (1 - guard);
            for (const v of md?.dr ?? []) target.dr = 1 - (1 - target.dr) * (1 - v);
            // 도감 Lv2 받는 피해 감소 — 도감 전체가 **원천 하나**(장비 Lv4 의 피해 감소와 같은 규칙 · R314)
            if (cxD?.damage_reduction) target.dr = 1 - (1 - target.dr) * (1 - cxD.damage_reduction);
            // 장 디버프 — 분노(받는 피해 증가) · 폭식(라운드 안에서 오르는 몬스터 데미지)은 **몬스터가 때린 직격**에서 맞는 영웅의 `dr` 에
            //   받는 피해 증가 원천 하나로 곱한다 · 아래에서 되돌린다 · 없으면 안 건드린다 (2026-10-28 · R366) · rng 0
            const taken = target.side === 'party' && u.side === 'enemy' ? curseTaken() : 0;
            if (taken) target.dr = 1 - (1 - target.dr) * (1 + taken);
            // 적 데미지 감소 디버프 [2026-10-28 · R368 · battle_design §9-3] — 때리는 쪽 창마다 `1 + v` 를 **최종 피해**에 곱한다(데미지 % 괄호 밖).
            //   `dr` 에 원천으로 얹어 위 둘과 같은 자리에서 되돌린다 · 물리 몫은 물리 직격만 · 0 밑으로 안 간다 · 창이 없으면 안 건드린다 · rng 0
            let dealt = 1;
            for (const b of Object.values(u.buffs ?? {})) {
                if (b.stat === 'final_dmg_pct' || (b.stat === 'final_phys_pct' && hitType === 'physical')) dealt *= Math.max(0, 1 + b.v);
            }
            // 부류의 기믹(R388 · 위 `familyUp` · `familyGuard`) — 군대 · 거인은 이 자리의 원천 하나 · 수호자는 맞는 쪽 원천 하나 · 0 이면 안 건드린다
            const famUp = u.family ? familyUp(u) : 0;
            if (famUp) dealt *= 1 + famUp;
            if (dealt !== 1) target.dr = 1 - (1 - target.dr) * dealt;
            const famGuard = familyGuard(target);
            if (famGuard) target.dr = 1 - (1 - target.dr) * (1 - famGuard);
            const { hit, dmg, crit, proc } = F.strike(rng, u, target);
            target.dr = dr0;
            target.res = res0;
            target.drFlat = drFlat0;
            u.crit = crit0;
            u.critDmg = critDmg0;
            u.defIgnore = defIgnore0;
            u.hitBonus = hitBonus0;
            u.resReduction = resRed0;
            u.skillMult = mult0;
            u.atkType = type0;
            u.statMult = stat0;
            u.procChance = chance0;
            u.procMult = pmult0;
            u.condPct = cond0;

            const tally = out.strikes[u.side === 'party' ? 'party' : 'enemy'];
            tally.n += 1;
            if (!hit) tally.miss += 1;
            if (!hit) {
                const miss = { t: r1(t), e: 'dodge', a: u.key, d: target.key };
                if (s) miss.s = s;
                if (sk?.hitIndex != null) miss.i = sk.hitIndex;
                timeline.push(miss);
                afterStrike?.(false);
                return;
            }
            const shield = target.barrier;
            // 강타 — **맞기 직전 대상의 현재 체력** × % 를 그 타격에 더한다. 치명 · 방어 · 저항을 받지 않는 고정 피해 (battle_design §9 · R78). rng 0
            //   마스터리 조건부 강타(폭식 T2-2 · 2026-10-05)는 같은 비율에 더한다
            //   **마법 무기를 든 유닛의 직격은 강타 · 흡혈을 안 받는다** [2026-10-04 사용자 · battle_design §9-6 · R207] — 출처 무관 · 영웅 · 몬스터 같다 · 치명은 받는다.
            //   마법 무기의 표지는 `noBasic`(평타가 없다 — R198)이다
            const spell = u.noBasic;
            const crush = spell ? 0 : (fx?.crush ?? 0) + (ma?.sum.crushing_blow_pct ?? 0);
            // 파리 떼(스웜 · 2026-10-29 R380)는 강타가 **첫 산 파리의 HP** 를 본다 — 본체 HP 는 창 동안 몸이 아니다
            const sw = target.swarm;
            const cb = crush > 0 ? Math.round((sw ? sw.hp.find(h => h > 0) ?? 0 : target.hp) * crush) : 0;
            const total = dmg + cb;
            const hpBefore = target.hp;
            const took = sw ? swarmTake(target, total, spread) : null;
            const { absorbed } = took ?? applyDamage(target, total);
            // 넘친 몫 [2026-10-23 · R326] — 배리어 · HP 밖으로 넘친 양(쓰러뜨린 타격에만 0 초과). 처형 판정 앞에서 잰다(처형은 남은 체력을 지울 뿐 넘치지 않는다)
            //   파리 떼는 쓰러뜨린 타격(마지막 파리)에만 그 파리 밖으로 넘친 몫 · 기여는 실제로 깎은 파리 HP 합(`took`)
            const ov = took ? (target.hp > 0 ? 0 : took.ov) : Math.max(0, total - absorbed - hpBefore);
            // 일반몹 처형 [2026-10-21 · R303 · 장갑 폭식 ② · item_design §1 「10-21 방어구 개정」 — 정의는 10-08 대화] — 이 직격이 맞은 뒤 **등급 「일반」 몬스터**의 체력이
            //   최대 HP × 값 이하면 그 자리에서 쓰러뜨린다 — 남은 체력이 `ev.cull` 이고 아래 처치 판정이 그대로 센다(기여 · 처치 시 회복 · 보상).
            //   영웅(결투장 상대 포함) · 정예 · 보스 · 소환은 아니다 · 도트 · 반사 · 비직격은 안 건다 · rng 0
            const cullR = fx?.cullNormal ?? 0;
            const cull = cullR > 0 && target.hp > 0 && target.grade === 'normal' && !target.hero && !target.summon && target.side !== u.side
                && target.hp <= target.hpMax * cullR ? target.hp : 0;
            if (cull) target.hp = 0;
            // 기여 — **실제로 깎은 값**을 센다 [2026-10-23 · R326]: 배리어가 먹은 몫 + 깎인 HP(넘친 몫 빼고) + 처형으로 지운 체력. 관전의 누적 데미지 판과 같은 값이다
            //   (이벤트의 `dmg` 는 넘친 몫까지 그대로 — 피해 숫자 · 로그 줄)
            const real = took ? took.took : total - ov + cull;
            const cA = credit(u), cD = credit(target);
            if (cA) cA.dealt += real;
            if (cD) cD.taken += real;
            noteTaken(target, u, real);
            // `ty` — 그 타격의 피해 종류(`hitType`). 표시용이다 — 관전 로그가 피해 숫자를 종류 색으로 칠한다 (INTERFACE §2-6 · SCREEN_DESIGN §4-2)
            const ev = { t: r1(t), e: 'hit', a: u.key, d: target.key, dmg: total, crit, dhp: target.hp, ty: hitType };
            if (cb) ev.cb = cb;                              // 강타 몫 — 강타가 들어간 타격에만 키가 선다(`dmg` 는 합 · 흡혈 · 반사는 강타 몫을 안 먹는다)
            if (cull) ev.cull = cull;                        // 처형으로 지운 체력 — 처형이 터진 타격에만 키가 선다(`dmg` 에는 안 든다 · R303)
            if (ov) ev.ov = ov;                              // 넘친 몫 — 쓰러뜨린 타격에만 키가 선다(`dmg` 에는 들었다 · R326)
            // 흡혈 — 직격의 최종 피해에만 비례 (§9-6). 배리어가 먹은 몫도 포함한다 (직격이 들어간 사실은 같다)
            //   마스터리 조건부 흡혈(색욕 T2-3 · 2026-10-05)은 그 타격의 흡혈에 더한다
            //   도감 Lv2 흡혈(그 종족을 때릴 때 · R314)도 같은 자리다
            const ls = spell ? 0 : (u.ls ?? 0) + (ma?.sum.life_steal ?? 0) + (cxA?.life_steal ?? 0);   // 마법 무기는 안 받는다(위 강타와 같다 · R207)
            if (ls > 0 && u.hp > 0) {
                u.hp = Math.min(u.hpMax, u.hp + F.leech(dmg, ls, u.recv));    // 체력 회복 +% 가 흡혈에도 곱한다 (2026-09-18)
                ev.ahp = u.hp;
            }
            if (s) ev.s = s;
            if (sk?.hitIndex != null) ev.i = sk.hitIndex;
            if (proc) ev.proc = true;                        // 추가 피해가 **터진 타격만** 키가 선다 (INTERFACE §2-6)
            if (shield) ev.bar = shield.amt;                // 흡수 후 잔량
            timeline.push(ev);
            // 폭식 T3 겹 [2026-10-24 · R343 · skill_design §3-3] — 직격이 맞을 때마다 +1 · 상한 = 그 줄의 `cap`(랭크 × 랭크당 겹). 빗나간 타격은 위에서 돌아갔다 · rng 0
            if (u.mfeast && u.feast < u.mfeast.cap) u.feast += 1;
            // 프렌지 겹 [2026-10-16 · R246] — 적중할 때마다 겹 +1(상한 [balance.csv:frenzy_stack_max]) · 주기는 다음 차례 예약부터 바뀐다. 창이 없으면 아무 일도 없다 · rng 0
            const fz = u.hp > 0 ? stateOf(u, 'frenzy') : null;
            if (fz && (fz[1].n ?? 0) < B.frenzy_stack_max) {
                fz[1].n = (fz[1].n ?? 0) + 1;
                refreshDerived(u);
            }
            // 변신 창 늘이기 [2026-10-29 · R380 · skill_design §12-9 골드 피버] — 때린 쪽의 `transform` 창 값(초)이 0 보다 크면 **그 시전이 건 창 전부**(`s` 가 같은 창)의
            //   끝을 값만큼 미룬다 · 끝은 연 시각(`t0`) + [balance.csv:transform_max_sec] 을 안 넘는다 · 늘어난 창마다 `buff`(+`ext`) · 적중한 직격만(빗나감은 위에서 돌아갔다) · rng 0
            const tf = u.hp > 0 ? stateOf(u, 'transform')?.[1] : null;
            if (tf && tf.v > 0) {
                const cap = (tf.t0 ?? t) + B.transform_max_sec;
                for (const w of Object.values(u.buffs)) {
                    if (w.s !== tf.s || w.until === Infinity) continue;
                    const nu = Math.min(cap, w.until + tf.v);
                    if (!(nu > w.until + EPS)) continue;
                    w.until = nu;
                    timeline.push({ t: r1(t), e: 'buff', u: u.key, s: w.s, stat: w.stat, v: w.v, until: r1(nu), ext: true });
                }
            }
            // 물리 경직 (battle_design §2-3 · R110) — **물리 직격으로 실제로 줄어든 HP**(배리어 몫 빼고 · 강타 몫 넣고)가 최대 HP 의 비율 이상일 때만.
            //   원소 타격은 경직 대신 상태이상의 몫이다. 소환은 차례가 없다 · 쓰러진 대상은 멈출 차례가 없다. 이벤트는 그 `hit` 바로 뒤다
            //   **고정 피해(사제 직격)도 건다** — 물리였을 때 걸던 것을 그대로 둔다(2026-10-06 R221 — 감소만 건너뛴다)
            if ((hitType === 'physical' || hitType === FIXED_DMG) && target.hp > 0 && !target.summon
                && hpBefore - target.hp >= target.hpMax * B.stagger_hp_pct) stagger(target, u);
            // 타격 시 창 — 무기 옵션의 방어력 · 저항 · 공격력 감소 (skill_effects.weaponOnHit · R78). rng 0 · 이벤트 없음(`quiet`)
            if (fx && target.hp > 0) weaponOnHit(u, fx, target, hitType, t, windowSec);
            // 맞은 대상에게 거는 걸린 효과 — 결빙 [2026-09-28 · R177 · battle_design §2-4]. **스킬 타격만**(`sk` — 기본 공격 · 반격 · 평타 부여 추가타는 없다) ·
            //   살아 있고 행동하는 대상에게만(벽은 차례가 없다) · 사건 훅 · 반사 · 전투불능 · 반격보다 앞. rng 0 — `buff` 이벤트는 그 `hit`(· `stagger`) 뒤
            if (sk?.onHit && target.hp > 0 && !target.summon) rt.applyStatus(u, target, sk.onHit, t);
            // 원소 부여 [2026-10-16 · R250 · 이그나이트 · 딥 프리즈 · 서지] — **스킬 타격**의 원소가 창의 원소와 같으면 창이 든 상태이상(`hit`)을 건다.
            //   창마다 삽입 순서 · 확률이 1 이면 굴리지 않는다 · 1 미만이면 **rng 1회**(INTERFACE §5-2). 결빙은 같은 열쇠라 센 쪽(나중 것)이 덮는다
            //   **`shatter`**(딥 프리즈 · 2026-10-29 · R385 · battle_design §2-4) — 같은 자리 · 같은 순서에서 **이 타격 전에 결빙돼 있던** 대상에게만 창이 든 상태이상(스턴)을 건다 ·
            //   굴림 규칙은 `imbue` 와 같다(1 이면 0회) · 결빙돼 있지 않았으면 굴리지 않는다
            if (sk && element && target.hp > 0 && !target.summon) {
                for (const w of Object.values(u.buffs)) {
                    if (w.element !== element || !w.hit) continue;
                    if (w.stat === 'imbue') { if (w.v >= 1 || rng() < w.v) rt.applyStatus(u, target, w.hit, t); }
                    else if (w.stat === 'shatter') { if (frozen0 && (w.v >= 1 || rng() < w.v)) rt.applyStatus(u, target, w.hit, t); }
                    else continue;
                    if (target.hp <= 0) break;
                }
            }
            // 사건 훅 — 등록된 반응이 없으면 아무 일도 없다. 핸들러가 rng 를 쓰면 **이 자리에서** 소비한다
            hooks.emit('hit', u, { t, d: target, dmg, crit, s, proc });
            hooks.emit('hitTaken', target, { t, a: u, dmg, crit, s, proc });
            // 반사 — 비직격. 감쇠·치명 없이 공격자 HP 를 직접 깎고 흡혈·반사를 유발하지 않는다 (§9-6)
            //   마스터리 조건부 반사(시기 T2-3 — 때린 적의 HP 가 나보다 높았다 · 2026-10-05)는 그 타격의 반사에 더한다 · 판정은 때리기 전 HP
            const refl = (target.reflect ?? 0) + (md?.sum.reflect_damage ?? 0);
            if (refl > 0 && u.hp > 0) {
                const back = F.indirect(dmg * refl);
                const bov = loseHp(u, back);
                const rev = { t: r1(t), e: 'reflect', a: target.key, d: u.key, dmg: back, ahp: u.hp };
                if (bov) rev.ov = bov;
                timeline.push(rev);
                if (cD) cD.dealt += back - bov;                 // 반사도 **가한 피해**다 — 때린 쪽이 아니라 되받은 쪽의 몫
                if (cA) cA.taken += back - bov;
                noteTaken(u, target, back - bov);
                if (u.hp <= 0) { if (cD && u.side !== 'party' && !u.rewarded) cD.kills += 1; killHeal(target, u); downed(u); }
            }
            // 아이언 메이든 [2026-10-29 · R380 · skill_design §12-9] — 때린 쪽이 든 `maiden` 창 합만큼 이 직격 피해(`dmg` — 강타 몫 빼고 · 반사와 같은 밑수)를 **자기도** 받는다.
            //   반사 규칙 그대로(비직격 — 방어 · 저항 · 배리어 · 흡혈 · 반사 · 경직 · 훅 없음 · 쓰러질 수 있다) · 몫은 그 창을 건 유닛(`by`)의 것 ·
            //   이벤트는 `reflect`(`a` = 건 유닛 · `s` = 건 스킬) · 반사 **뒤** · 창이 없으면 아무 일도 없다 · rng 0
            const mv = u.hp > 0 ? sumOf(u, 'maiden') : 0;
            if (mv > 0) {
                const w = stateOf(u, 'maiden')[1];
                const src = party.find(x => x.key === w.by) ?? units.enemies.find(x => x.key === w.by) ?? null;
                const back = F.indirect(dmg * mv);
                const bov = loseHp(u, back);
                const rev = { t: r1(t), e: 'reflect', a: w.by, d: u.key, dmg: back, ahp: u.hp, s: w.s };
                if (bov) rev.ov = bov;
                timeline.push(rev);
                const cS = src ? credit(src) : null;
                if (cS) cS.dealt += back - bov;
                if (cA) cA.taken += back - bov;
                noteTaken(u, src, back - bov);
                if (u.hp <= 0) { if (cS && u.side !== 'party' && !u.rewarded) cS.kills += 1; killHeal(src, u); downed(u); }
            }
            if (target.hp <= 0) {
                // **적을 쓰러뜨린 것**만 센다 — 적의 소환 벽은 몬스터가 아니다 (R79) · 되살아난 무리의 두 번째 쓰러짐도 처치가 아니다(보상과 같은 규칙 · 2026-09-18)
                if (cA && target.side !== 'party' && !target.summon && !target.rewarded) cA.kills += 1;
                killHeal(u, target);
                downed(target);
                hooks.emit('kill', u, { t, d: target });
            }
            /*
             * 반격 [2026-09-18 · 사용자 확정 · item_design §1 「투구 옵션」 · INTERFACE §2-6 「반격」] — 맞은 쪽이 확률로 **그 자리에서 때린 적에게 기본 공격 1회**.
             *   「그냥 평타 한 대와 모든 로직이 같다」(사용자) — 기본 공격 함수(`basicAttack`)를 그대로 지나고 **내 차례를 쓴다**(`next = period`).
             *   ⚠ 이 타격의 사건(경직 · 창 · 훅 · 반사 · 전투불능)이 다 끝난 뒤다. 경직 중이면(이 타격이 건 경직 포함) 차례가 없어 못 한다.
             *   조건이 안 맞으면 **굴리지 않는다** — 반격 옵션이 없는 판의 rng 수열은 종전과 같다(`&&` 가 판정 앞에서 끊는다).
             *   반격도 직격이라 맞은 쪽이 다시 반격할 수 있다 — 확률이 곱으로 줄어 끝난다(`counter_chance` 는 1 미만 — item.js 로드 검증)
             *   **마법 무기는 반격하지 않는다** [2026-10-02 · 사용자 확정 · R198] — 평타가 없어서다(`noBasic`). 판정 **앞**에서 끊으므로 굴리지도 않는다
             */
            if (target.counter > 0 && !target.noBasic && target.hp > 0 && !target.summon && u.hp > 0 && target.stagUntil <= t && (target.stunUntil ?? 0) <= t
                && rng() < target.counter) {
                timeline.push({ t: r1(t), e: 'counter', u: target.key, d: u.key });
                rt.basicAttack(target, t, alive(rt.foesOf(target)), u);
                target.next = target.period;
            }
            // 호출자가 붙인 후처리(추가타 결빙 · 대상 방어 감소)까지 끝낸 뒤 장비 발동을 판정한다.
            afterStrike?.(true);
            // 피격 → 타격 순서. 살아 있는 유닛만 발동하고 발동 안의 직격은 양쪽 모두 연쇄를 막는다.
            rt.procStruck(target, t);
            rt.procHit(u, t);
            // 적중한 직격 [2026-10-29 · R387] — 덤 창의 상태이상(콜드 애로우 결빙 · `skill_runtime.onhitExtra`)이 읽는다 · 피함 · 빗나감은 위에서 값 없이 돌아갔다
            return true;
        }

        // `between` = 이긴 라운드의 요약을 냈고 다음 라운드를 **아직 안 열었다**(라운드 사이) — 다음 걸음의 첫머리가 연다 (R130)
        let started = false, ended = false, between = false;
        /** 라운드 종료로 남은 방을 취소한다 — 살아 있는 양 진영 모두 쿨 절반 환급 · 마지막 라운드도 같다 · rng 0. */
        const closeRoundChannels = () => {
            for (const u of [...party, ...units.enemies]) if (u.hp > 0 && u.chan) rt.chanClose(u, t, 'round');
        };
        /** 진 런 · 시간 초과의 사실 — 쓰러진 순서 · 끝난 순간 서 있던 적 · 레벨 차(마지막 라운드 적 중 가장 높은 레벨 − 파티에서 가장 낮은 레벨 · 0 아래면 0) (ADR-0623) */
        const fallNow = () => {
            const foes = units.enemies.filter(e => !e.summon), heroes = party.filter(p => !p.summon);
            const gap = foes.length && heroes.length ? Math.max(0, Math.max(...foes.map(e => e.lvl)) - Math.min(...heroes.map(p => p.lvl))) : 0;
            return { downs: falls.map(f => ({ ...f })), foes: foes.filter(e => e.hp > 0).map(e => ({ id: e.monsterId, hp: Math.round(e.hp), max: e.hpMax })), gap };
        };
        /** 런을 닫는다 — 끝 시각 · 기여를 굳히고 `end` 이벤트를 낸다. 전멸 · 시간 초과 · 마지막 라운드 클리어 셋이 여기로 온다 */
        const finish = reason => {
            out.reason = reason;
            out.durationSec = r1(t);
            out.contrib = contribNow();
            if (reason !== 'clear') out.fall = fallNow();
            timeline.push({ t: r1(t), e: 'end', won: out.won, reason: out.reason });
            ended = true;
        };
        /**
         * 라운드 하나의 요약 — `n` 번째 라운드가 `t` 초에 끝났다 · 이겼나(`cleared`) · 런이 끝났나(`ended`) ·
         * **그 라운드의 몫**(`xp` · `xpByLevel` · `gold` · `kills` · `drops` · `blueprints` · `materials` — 이겼을 때만) · 그 순간 살아 있는 영웅(`alive` — 경험치를 받는 사람) · 기여
         */
        const summary = cleared => {
            const s = {
                n: round, t: r1(t), cleared, ended, ...(cleared ? loot : newLoot()),
                alive: party.filter(u => !u.summon && u.hp > 0).map(u => u.uid), contrib: contribNow(),
                potions: potionRound,        // 그 라운드에 마신 물약 — 이겼든 졌든 (R124)
            };
            loot = newLoot();
            rewardCards = [];
            potionRound = {};
            return s;
        };

        /* 갈아입기 [2026-09-14 · R89 · INTERFACE §2-6 createRun · **라운드 도중 2026-09-21 · R130**] — **그 순간의 파티**를 받아 **바뀐 영웅만** 다시 입힌다.
           부르는 자리가 둘이다 — **라운드 사이**(이긴 라운드의 요약 뒤 · 다음 라운드를 열기 전 — 옛 `next(partyUnits)` 의 자리)와
           **라운드 도중**(틱과 틱 사이 — 원정 중 교체가 그 순간 먹는다 · base_expedition_design §1-5). 보스 라운드도 같은 규칙이다.
           같은지는 입력(`combat` · `stats` · 스킬 칸)으로 가른다 — 같으면 손대지 않아야 인자 없이 이어 부른 것과 한 글자도 안 다르다.
           지키는 것: **현재 HP 의 비율**(R130 — ~~현재 HP · 새 최대치로 자른다~~ · **`fill` 에 든 영웅 = 레벨업은 가득** — R182) · 창 · 배리어 · 행동 예약 · 남은 스킬의 쿨(**칸마다** — R130) ·
           깎인 방어(`defKeep` — R130). **새로 생긴 스킬은 지금부터 한 바퀴** (battle_design §6) */
        // 스킬 칸 = 출처 자리 + id — 칸이 바뀌면 갈아입는다(같은 id 가 다른 칸으로 옮겨도) · 쿨을 잇는 열쇠와 같다 (R130)
        const slotKey = a => `${a.source}|${a.id}`;
        // 무기군도 입력이다 — 칸이 켜지고 꺼지는 것을 정한다 (R187)
        const sigOf = p => JSON.stringify([p.combat, p.stats ?? null, (SK ? p.actives ?? [] : []).map(slotKey), p.weaponGroup ?? null]);
        const worn = new Map(partyUnits.map(p => [p.uid, { sig: sigOf(p), combat: p.combat }]));
        /** 라운드 도중인가 — 열었고 아직 안 끝났다(끝났으면 `between` · 닫혔으면 `ended`) */
        const inRound = () => started && !between && !ended;
        /** 물약 칸 다시 채우기 [2026-10-22 · R315 · INTERFACE §2-6 `restock`] — **다음 라운드를 열 때** 칸을 이 목록으로 갈아 끼운다(`beginRound`).
         *  모양은 `potions` 인자와 같고 길이는 이 런의 칸 수에 맞춘다(넘치면 자르고 모자라면 빈 칸) · 다시 부르면 마지막 것 · 닫힌 런은 무시 · rng 0 */
        function restock(list) {
            if (ended) return;
            if (!Array.isArray(list) || list.some(p => p != null && !(p?.id && p.heal >= 0)))
                throw new Error(`battle: restock 물약 칸 ${JSON.stringify(list)} — [{id, heal} | null] 이어야 한다 (INTERFACE §2-6)`);
            potionPending = Array.from({ length: slotMax }, (_, i) => (list[i] ? { id: list[i].id, heal: list[i].heal } : null));
        }
        function refit(updates, fill) {
            if (ended) return { locked: false, changed: [] };
            const changed = [];
            const removed = [];   // 갈아입기로 걷힌 오오라 창 `{u, s}`(`s` = 건 오오라 id) — 다시 안 걸린 것은 다음 `round` 뒤에 `buffEnd` 로 닫는다 (R98)
            for (const p of updates) {
                const u = party.find(x => x.uid === p.uid && !x.summon);
                const was = worn.get(p.uid);
                // 쓰러진 영웅은 그 런 끝까지 빠진다 — 새로 입혀도 안 일어난다. 나간 인원 밖의 영웅은 안 읽는다(인원은 나갈 때 굳는다 — 원정 중에 편성을 바꿔도 도는 원정은 그대로다 · R92)
                if (!u || !was || u.hp <= 0) continue;
                const sig = sigOf(p);
                // 레벨업한 영웅(`fill`)은 입력이 같아도 갈아입는다 — 체력을 채우는 자리가 아래 비율 복원이다 (R182)
                if (sig === was.sig && !fill?.includes(p.uid)) continue;
                worn.set(p.uid, { sig, combat: p.combat });
                const fresh = makeUnit('party', p.combat, { stats: p.stats ?? null });
                // 현재 HP 는 **비율을 지킨다** [2026-09-21 · R130 · base_expedition_design §1-5] — 갈아입기 전 비율을 새 최대치에 곱한다(아래 파생 뒤).
                //   뺐다 끼워도 손익이 0 이라 회복 수단이 아니고, 잠깐 뺀 HP 장비가 그 런 끝까지 HP 를 깎아 두는 함정도 없다
                u.hpRatio = u.hpMax > 0 ? u.hp / u.hpMax : 1;
                for (const k of REFIT_FIELDS) u[k] = fresh[k];
                // 적이 깎은 영구 방어(가이디드 애로우)는 **깎인 비율(`defKeep`)로** 잇는다 [2026-09-21 · R130] — ~~옛 방어값으로 나눈 비율~~ 은
                //   방어가 0 이면 못 재서 장비를 다 벗었다 입으면 기록이 사라졌다. 깎인 **양**으로 들면 맞을 때 입은 방어가 손실을 정해
                //   가벼운 장비로 맞고 무거운 장비로 갈아입는 수법이 생긴다 — 비율은 어떤 장비로 맞았든 같다 (리뷰 · battle_design §9-3)
                u.defBase = fresh.defBase * u.defKeep;
                // 남은 스킬은 **칸마다** 쿨을 잇는다 [2026-09-21 · R130 — ~~스킬 id 로~~] — 고유와 무기 두 칸에 같은 스킬이 앉으면(칸이 둘이면 쿨도 둘 ·
                //   skill.activesFor) id 로 이을 때 두 칸의 쿨이 한 값으로 합쳐져, 갈아입을 때마다 쓴 칸이 다시 준비됐다
                //   **무기가 칸을 켜고 끈다** [2026-09-29 · R187 · battle_design §6 — 쿨은 멈춘 자리에서 잇는다]:
                //   켜짐 → 켜짐 = 준비 시각 그대로 · 켜짐 → 꺼짐 = 남은 쿨을 얼린다 · 꺼짐 → 켜짐 = 지금 + 얼린 쿨 · 꺼짐 → 꺼짐 = 얼린 쿨 그대로 ·
                //   새 칸 = 한 바퀴(꺼져 있으면 그 한 바퀴를 얼린다). 뺐다 끼워도 쿨이 되돌아가지 않는다
                // 열린 정신 집중은 갈아입기 전에 닫는다 [2026-10-22 · R318] — 칸을 다시 짓기 전에 쿨을 지금부터로 세워 둬야 아래가 그 쿨을 잇는다
                if (u.chan) rt.chanClose(u, t);
                const prev = new Map(u.actives.map(a => [slotKey(a), a]));
                const fits = fitterOf(p.weaponGroup);
                u.actives = (SK ? p.actives ?? [] : []).map(a => {
                    const def = SK.resolve(a);
                    if (!def) throw new Error(`battle: 알 수 없는 스킬 ${a?.id ?? a}`);
                    const was = prev.get(slotKey(a));
                    const lap = cooldownSec(B, u, def);
                    const left = !was ? lap : was.off ? was.frozen : Math.max(0, was.readyAt - t);
                    return slotOf(a, def, fits, !was ? t + lap : was.off ? t + was.frozen : was.readyAt, left);
                });
                // 칸 표시도 새로 잰다 — 새 칸에 오오라가 있으면 아래 `applyAuras` 가 다시 남긴다 (R98)
                u.slotIds = null;
                u.slotUps = null;
                u.auraOn = null;
                u.aura = null;   // 새 칸에 오오라가 없으면 비운 채 남는다 — 쓰러질 때 낡은 오오라를 다시 걸지 않게 (R287)
                // 오오라는 다시 건다 — 이 영웅이 건 상시 창(`until: Infinity`)을 먼저 걷는다
                for (const x of party) for (const [id, b] of Object.entries(x.buffs)) {
                    if (b.by !== u.key || b.until !== Infinity) continue;
                    delete x.buffs[id];
                    removed.push({ u: x.key, s: b.s ?? id });   // 창 열쇠는 걸린 효과 id · 이벤트는 건 오오라 id (2026-09-24 · R151)
                }
                changed.push(u);
            }
            if (!changed.length) return { locked: false, changed: [] };
            // 칸에 오오라가 남아 있는 것은 방금 갈아입은 영웅뿐이다 · 끝에서 전원의 파생값을 다시 쓴다
            const applied = applyAuras(party);
            // 비율 복원 — 파생(최대 HP 창 포함)이 끝난 새 최대치에 곱한다. 살아 있는 영웅만 오므로 최소 1 ·
            //   ⚠ 반올림이 뺐다 끼울 때마다 조금씩 회복시키는 구멍은 1차에서 받아들였다 (base_expedition_design §1-5)
            //   **레벨업한 영웅(`fill`)은 가득 찬다** [2026-09-29 · R182 · hero_design §5 — 디아블로2 방식] — 비율 대신 새 최대치로 선다
            for (const u of changed) {
                u.hp = fill?.includes(u.uid) ? u.hpMax : Math.max(1, Math.round(u.hpRatio * u.hpMax));
                delete u.hpRatio;
            }
            for (const u of changed) {
                timeline.push({
                    t: r1(t), e: 'refit', u: u.key, hpMax: u.hpMax, dhp: u.hp, period: u.period,
                    atkMin: u.atkMin, atkMax: u.atkMax, matkMin: u.matkMin, matkMax: u.matkMax, atkType: u.atkType,
                    noBasic: u.noBasic,   // 무기를 바꾸면 행동 게이지 색도 바뀐다 (REFIT_FIELDS · ADR-0476)
                    ch: u.charges,        // 쌓인 칸 — 갈아입기가 안 건드린다 · 마법 무기만 읽는다 (R200)
                    stats: u.stats ? { ...u.stats } : null,
                    ...slotView(u),
                });
            }
            // 오오라 창 이벤트 (R98) — 걷힌 것 중 다시 안 걸린 것은 닫고(`buffEnd`), 다시 건 것은 연다(`buff`) — 닫기가 먼저다.
            //   **라운드 사이면 다음 `round` 바로 뒤**(`auraQueue` · 순서 보장 ②) · **라운드 도중이면 이 `refit` 바로 뒤에 곧바로** 낸다 —
            //   다음 `round` 까지 칩이 낡은 채 서지 않게 (R130)
            const again = new Set(applied.map(a => `${a.u}|${a.s}`));
            const auraEvents = [];
            for (const r of removed) if (!again.has(`${r.u}|${r.s}`)) auraEvents.push({ e: 'buffEnd', u: r.u, s: r.s });
            auraEvents.push(...applied);
            if (inRound()) for (const ev of auraEvents) timeline.push({ t: r1(t), ...ev });
            else auraQueue.push(...auraEvents);
            measureParty();
            return { locked: false, changed: changed.map(u => u.key) };
        }

        /** 아직 안 연 라운드를 연다 — 첫 라운드 · 이긴 라운드의 다음. 시간 초과면 런을 닫고 그 요약을 낸다(아니면 null) */
        const openRound = () => {
            if (!started) { started = true; beginRound(); return null; }
            between = false;
            // 다음 라운드를 연다 — 한 번에 돌던 판의 「클리어 직후 같은 틱」 자리 그대로다(편성 → 시간 초과 판정 순서 불변)
            round += 1;
            beginRound();
            if (t >= B.battle_timeout_sec) { finish('timeout'); return summary(false); }
            return null;
        };

        /**
         * 걸음 [신설 2026-09-21 · R130 · INTERFACE §2-6] — 틱을 **`t + TICK ≤ until` 인 동안만** 돈다. 라운드가 끝나면 그 자리에서 멈추고
         * 요약을 낸다(다음 라운드는 다음 걸음이 연다) · `until` 에 닿으면 `null`(라운드 도중에 섰다). 아직 안 연 라운드는 첫머리에 연다 —
         * `advance(0)` 은 라운드를 열기만 한다. **쪼개 돌려도 틱 수열이 같다** — 끊는 자리만 다르므로 교체가 없으면 한 번에 돈 것과 같다
         */
        function advance(until) {
            if (ended) return null;
            if (!started || between) {
                const s = openRound();
                if (s) return s;
            }
            // 끊는 자리의 부동소수 여유 — 시각은 0.1 을 거듭 더해 꼬리가 붙는다. 이 값은 틱을 몇 번 도느냐만 정하고 틱 안의 계산에는 안 들어간다
            while (t + TICK <= until + STEP_EPS) {
                t += TICK;
                // 창 만료를 행동 **앞에서** 한 번에 처리한다 — 같은 틱에 만료와 행동이 섞이는 순서를 고정하기 위해서다
                for (const u of [...party, ...units.enemies]) if (u.hp > 0) rt.expire(u, t);
                rules?.beforeTick?.(ruleContext());
                // 장 디버프 — 시기 · 나태는 간격마다 영웅 전원에게 건다 — 창 만료 **뒤** · 중독 틱 **앞** (2026-10-28 · R366 · INTERFACE §5-2) · rng 0
                if (curseAt !== null && t + STEP_EPS >= curseAt) { curseCast(); curseAt += curse.intervalSec; }
                // 나태 T2 겹의 쿨감 [2026-10-05 · skill_design §3-2] — 행동 **앞**에서 그 틱의 겹으로 `cdr` 를 되쓴다(시전 순간 `cooldownSec` 이 읽는다). 겹 줄이 없는 유닛은 안 건드린다 · rng 0
                for (const u of [...party, ...units.enemies]) if (u.mtick) u.cdr = u.cdrBase + tickSum(u, 'cooldown_reduction');
                // 중독 틱 — 창 만료 **뒤** · 재생 **앞** (2026-09-28 · R178 · INTERFACE §5-2). 앞 유닛의 틱이 쓰러뜨려도 배열은 그대로 돈다
                for (const u of [...party, ...units.enemies]) if (u.hp > 0) poisonTick(u);
                // 오오라 피해 틱 — 중독 틱 **뒤** · 재생 **앞** (홀리 파이어 · 2026-10-16 · R249 · INTERFACE §5-2). 창이 없으면 누산만 비운다
                for (const u of [...party, ...units.enemies]) if (u.hp > 0) pulseTick(u);
                // HP 재생 — 행동 순회 **앞**. 초당 값이라 틱마다 누산하고 1 이상 쌓였을 때만 회복한다
                // (매 틱 소수점을 더하면 타임라인이 흘러넘치고 재생기가 정수 HP 와 어긋난다). rng 를 안 쓴다
                for (const u of [...party, ...units.enemies]) {
                    // 도감 Lv2 HP 재생 — 그 종족이 나온 라운드 동안 파티의 초당 재생에 더한다(R314 · `codexRound`) · 없으면 종전 값
                    const rg = u.side === 'party' && units.codexRound?.regen ? u.regen + units.codexRound.regen : u.regen;
                    if (u.hp <= 0 || !(rg > 0) || u.hp >= u.hpMax) continue;
                    // 체력 회복 +%(갑옷 나태 · 2026-09-18)가 재생(바탕값 포함)에 곱한다 — 0 이면 종전과 같은 누산
                    u.regenAcc += (u.recv ? rg * (1 + u.recv) : rg) * TICK;
                    const whole = Math.floor(u.regenAcc);
                    if (whole < 1) continue;
                    u.regenAcc -= whole;
                    const amt = Math.min(whole, u.hpMax - u.hp);
                    u.hp += amt;
                    timeline.push({ t: r1(t), e: 'regen', u: u.key, amt, dhp: u.hp });
                }
                // 물약 — 재생 **뒤** · 행동 **앞** (R103 · 위 `drinkPotions`). 물약이 없거나 칸이 빈 런은 안 돈다
                if (potionLeft > 0) drinkPotions();
                for (const u of [...party, ...units.enemies]) {
                    if (u.hp <= 0) continue;
                    if (rules?.skipActor?.(u)) continue;
                    if (u.chan) { chanTick(u); continue; }   // 정신 집중 — 차례 · 칸 충전 대신 방 사이 초 시계 (2026-10-22 · 끊어 치기도 2026-10-30 R392 · 위 `chanTick`)
                    if (u.noBasic) { chargeTick(u); continue; }
                    u.next -= TICK;
                    // 같은 여유로 판정한다 — `next -= TICK` 의 꼬리(5.0 − 0.1 × 50 > 0)가 틱 하나를 더 먹지 않게 (DEV_PLAN §4 #69)
                    if (u.next <= STEP_EPS) {
                        u.next = u.period;
                        // 델리게이트 — 넘길 아군이 있으면 그 아군이 행동한다 · 없으면 제가 한다 (2026-10-29 · R380 · 아래 `delegateTo`)
                        const to = stateOf(u, 'delegate') ? delegateTo(u) : null;
                        if (to) handOff(u, to);
                        else rt.act(u, t);
                    }
                }
                rules?.afterTick?.(ruleContext());
                // 지금 값 — 행동 처리 **뒤** · 전멸 · 클리어 판정 **앞** [2026-10-21 · R305 · INTERFACE §2-6 `stat`]. 지난번에 알린 값과 달라진 줄만 싣는다 —
                //   이벤트를 안 내는 창(무기 옵션 · 겹)과 깎인 방어 · 갈아입기까지 한 자리에서 잡는다. 표시값이라 전투는 안 읽는다 · rng 0
                for (const u of [...party, ...units.enemies]) {
                    if (u.hp <= 0 || !u.shown) continue;
                    const now = liveRows(u);
                    let v = null;
                    for (const k of Object.keys(now)) if (!sameRow(now[k], u.shown[k])) (v ??= {})[k] = now[k];
                    if (!v) continue;
                    u.shown = now;
                    timeline.push({ t: r1(t), e: 'stat', u: u.key, v });
                }
                // 귀환 룰 [개정 2026-09-03 — base_expedition_design §1-1] — **전멸일 때만 돌아온다.**
                // 하나가 쓰러져도 런을 접지 않고 남은 인원으로 계속 간다. 쓰러진 영웅은 `out.downed` 에 실려
                // 그 **출정** 동안 아웃되고(state.js), 마을로 돌아오면 낫는다.
                // ~~전투불능자가 하나라도 나오면 철수~~ 는 폐기 — 그 룰이 편성이 져야 할 무게를 대신 지고 있었다.
                // ⚠ 09-07 로 이것이 **최종형**이다 — 원정은 켜 놓고 자리를 뜨는 것이라 전멸까지 도는 것이 사양이고,
                //    추가 브레이크를 만들지 않는다. **결정은 편성이다** (base_expedition_design §1-1 · DEV_PLAN R42)
                // ⚠ 소환물은 **전멸 판정에서 뺀다** — 얼음 벽이 서 있다고 전투가 안 끝나면 파티가 전멸해도 안 돌아온다
                if (alive(party).filter(u => !u.summon).length === 0) { closeRoundChannels(); finish('wipe'); return summary(false); }
                // 적의 소환 벽도 **클리어 판정에서 뺀다** [2026-09-11 · R79] — 바로 위 전멸 판정과 같은 규칙이다: 행동하지 않는 벽이 서 있다고
                //   라운드가 안 끝나면 안 된다. 벽은 다음 라운드의 적 배열 교체(`units.enemies = sp.list`)로 함께 사라진다
                if (alive(units.enemies).filter(u => !u.summon).length === 0) {
                    closeRoundChannels();                // 정산 · 갈아입기 · 다음 라운드 전에 닫고 쿨 절반을 남긴다
                    out.roundsCleared = round;
                    bank();                              // 이긴 라운드의 몫 — 결과로 옮긴다 (R89)
                    if (round >= rounds) { out.won = true; finish('clear'); return summary(true); }
                    between = true;                  // 다음 라운드는 다음 걸음이 연다 — 그 사이에 정산 · 경계 갈아입기가 끼어든다
                    return summary(true);
                }
                if (rules ? t + STEP_EPS >= (rules.timeoutSec ?? B.battle_timeout_sec) : t >= B.battle_timeout_sec) { finish('timeout'); return summary(false); }
            }
            return null;                             // 라운드 도중에 섰다 — 다음 걸음이 이어 돈다
        }

        /**
         * 라운드 하나를 끝까지 — 이기면 **멈추고** 요약을 낸다. 다음 라운드는 다음 호출이 연다.
         * `advance(Infinity)` 에 경계 갈아입기를 얹은 것이다 — 인자 없이 이어 부르면 `simulate` 와 한 글자도 안 다르다
         * @param updates 둘째 호출부터 — **그 순간의 파티**(`partyUnits` 모양). 바뀐 영웅만 갈아입는다(`refit`) · 안 주면 그대로 잇는다
         */
        function next(updates) {
            if (ended) return null;
            if (started && updates) refit(updates);
            return advance(Infinity);
        }

        /** 지금 시각 · 라운드 · 그 종류 · 라운드 도중인가 — 표시 · 판정용 (R130 · rng 0) */
        const status = () => ({ t: r1(t), round, kind: started ? roundLog?.kind ?? null : null, inRound: inRound() });

        const abort = () => {
            if (ended) return null;
            closeRoundChannels(); finish('retreat');
            return summary(false);
        };
        return { next, advance, refit, restock, status, abort, result: out, get ended() { return ended; } };
    }

    /**
     * 런 하나를 **한 번에 끝까지** — `createRun` 을 끝날 때까지 이어 부른다. 전투 결과만 보는 쪽(단정 · 캘리브레이션)이 쓴다.
     * @returns 결과 + 타임라인 (`createRun` 의 `result` 와 같은 모양)
     */
    function simulate(partyUnits, stageId, rng, level, potions = null, slotMax = B.potion_slot_max, difficulty = null) {
        const run = createRun(partyUnits, stageId, rng, level, potions, slotMax, null, difficulty);
        while (run.next()?.ended === false);
        return run.result;
    }

    // makeEnemy 는 검증(dev/test.js)이 몬스터→유닛 변환 규칙을 직접 볼 수 있도록 함께 내보낸다 — stagePool 과 같은 이유
    // 결투장 단판 — 물약은 `createRun` 과 같은 칸(파티만 마신다 · 안 주면 물약 없음 · 2026-10-03)
    function simulateTeams(party, enemies, rng, potions = null, slotMax = B.potion_slot_max, potionHp = null) {
        if (!party.length || !enemies.length) throw new Error('battle: both teams must have units');
        const run = createRun(party, null, rng, 1, potions, slotMax, enemies, null, null, potionHp);
        while (run.next()?.ended === false);
        return { ...run.result, mode: 'arena' };
    }

    return { simulate, createRun, simulateTeams, stagePool, stageElement, stageRounds, skillCarriers, monsterSkillSlots, makeEnemy, monsterGearSpec, rollMonsterDrop, ilvlSpreadOf, debuffOf };
}
