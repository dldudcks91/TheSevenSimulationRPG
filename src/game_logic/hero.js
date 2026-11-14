/**
 * 영웅 시스템 — 생성(반고정: 이름 + 메인 죄종 + 시작 특성 + 고유 스킬) / XP 성장 / 전투 능력치 계산.
 *
 * 순수 모듈 — DOM·저장소·시계·Math.random 접근 없음. 난수는 전부 rng 인자로 주입받는다.
 * 데이터(밸런스 수치·이름 풀·직업 정의)는 생성자에서 주입받는다 (CLAUDE.md 개발 규칙).
 *
 * 전투 능력치 = ( 장비(베이스 + Implicit + 접사) + 스킬 ) × 기본 능력치 계수 (battle_design §8).
 *   ~~곱셈이라 장비가 0이면 능력치도 0을 곱한다~~ — 2026-09-10 폐기(능력치가 스킬의 덧셈 항으로 옮겨갔다 · battle_design §9-1).
 *   계수는 `hero_attribute.csv` 의 `mult_base_pct + 능력치 × mult_per_point_pct`(비율 — 2026-09-17 R111)다.
 *   모든 계수는 CSV 의 ⚠제안 값이다 — 확정되면 이 파일이 아니라 CSV 를 고친다.
 *
 * **퍼센트는 비율이다** [2026-09-17 · R111] — 접사 · 마스터리 · 전술 · 도감이 넣는 % 채널과 여기서 내는 % 능력치가 전부 0.05 = 5% 눈금이다.
 *
 * `computeCombat` 은 Σ 상시 피해 %(`atk_pct_sum` — 무기 % 는 빠진다 · 2026-10-03)를 따로도 낸다 — 전투 중 스킬 버프가 **새 곱셈 층이 아니라
 *   같은 괄호에 덧셈**으로 들어가야 해서(battle_design §9-2) battle.js 가 그 괄호를 다시 쓸 수 있어야 한다.
 *
 * **마스터리(패시브 수치층)는 접사와 같은 채널에 더한다** (skill_design §3-1~§3-4 확정 2026-08-28).
 *   죄종 마스터리와 직업 마스터리는 **포인트 풀을 공유**하고(§1-4) 액티브를 주지 않는다 — 여기 들어오는 것은
 *   전부 수치 노드뿐이다. T3 는 「주요 옵션 극대화」(skill_design §3-3 · 2026-10-23)이고 지금 선 것은 **탐욕 T3** 하나 —
 *   제 몫 골드 · 드랍 · 매직의 합(탐욕 합)에 비례하는 수치라 여기서 센다(`*_per_greed` — `computeCombat` · R325).
 *   노드 정의는 `mastery_node.csv`, 랭크당 값은 `balance.csv` 다.
 *   직업 T2 세 칸은 **낀 장비가 켠다**(T2-1 · T2-2 = 든 무기군 · T2-3 = 갑옷 칸의 갑옷군 — `requires` · 2026-09-22 R138).
 *   죄종 T2 는 조건 없는 칸(2026-11-13 R463) · **죄종 T3(탐욕 밖)는 조건부**(`cond` · 죄종마다 조건 하나 · 랭크가 조건을 넓힌다 · 2026-11-13 R468)라
 *   상시 값에 안 더하고 `mastery_cond` 로 내보낸다 — 판정은 전투가 타격 · 틱마다 한다(battle.js `strikeOnce` · `timeSum`).
 *   ⚠ **포인트 지급 곡선은 기획 미확정**(skill_design §7) — `mastery_point_per_level` 은 임시 형태다.
 *
 * 전투 계수가 실제로 걸리는 축은 둘뿐 [개정 2026-09-10 · battle_design §8 · DEV_PLAN R72] — 민첩(행동 주기) ·
 *   건강(**레벨 성장분의 최대 HP**). ~~힘(물리 공격력) · 지능(마법 공격력)~~ 은 **스킬 계수**로 옮겨갔고(skill.js scaleDef ·
 *   battle_design §9-1) ~~건강(HP 재생)~~ 은 계수를 잃었다. 통솔·매력은 전투 스탯 계수 없음 · **운은 전투 계산 밖**이다
 *   (드랍률·골드 획득 계수 — hero_design §4-1 감각→운 개정 2026-08-26).
 */

import { createFormula } from './formula.js';
import { makeRng, deriveSeed } from './rng.js';
import { procSkillLevel } from './item.js';

/** 원소 4종 — combat_stat.csv 의 res_* 와 스킬의 원소 태그(`skill_effect.csv:element`)가 쓰는 같은 어휘 (battle_design §9-5) */
export const ELEMENTS = ['fire', 'cold', 'lightning', 'poison'];

/**
 * @param {object} data
 *   balance      — balance.csv 를 {key: value} 로 눕힌 것
 *   stats        — 기본 능력치 7종 정의 [{id}...] (순서 = 표시 순서)  ← hero_attribute.csv
 *   sins         — 죄종 id 목록
 *   sinAttrs     — {sinId: statId} ← sin_attr.csv — 죄종이 잘 붙게 미는 능력치 한 칸 (2026-10-22 · R308 · 능력치 굴림 비율)
 *   classes      — 직업 정의 [{id, keyAttr, subAttr, stage, hpBase}...] — `hpBase` = 레벨 1 최대 HP(null 이면 `hero_hp_base` · 2026-10-02) ·
 *                  `keyAttr` · `subAttr` = 능력치 굴림에서 그 직업이 미는 주력 · 보조 칸(`subAttr` null = 없음 · 2026-10-22 · R308)
 *   weaponGroups — {id: {period, damageKind, ...}}  ← weapon_group.csv. 무기가 행동 주기·피해 종류를 정한다
 *   armorGroups  — {slot: {groupId: {defMult, trait, ...}}} ← armor_group.csv — **부위 → 갈래** (2026-09-16 갑옷군 · R107 · 2026-09-18 네 부위).
 *                  **낀 방어구마다** 제 갈래의 공속 · 쿨감을 더한다 — 값이 있는 것은 갑옷군뿐이다. 투구 · 장갑 · 신발 갈래 특성(`trait`)은 드롭이 아이템 줄로 박아
 *                  접사 합산이 읽는다(2026-10-21 R303)
 *                  **무기군 특성** `trait` = `{stats:[stat], scale:'flat', min, max}` | null [2026-11-11 · R443 · weapon_group_draft §1] — **굴림 없음**(최소 = 최대 · 한 줄) ·
 *                  그 무기를 든 유닛(영웅 · 몬스터)의 접사 합산에 더한다(`computeCombat`). `skill_tag_value` = 반지 베이스 「태그 수치 증가」의 태그 전부에 `value` 몫
 *   ringBaseOptions — ring_base_option.csv 행 — `skill_tag_value` 특성이 닿는 태그(효과가 `value` 인 행의 태그 · 강화 · 축복 · 함성 · 오오라 · 저주)
 *   weaponBases  — {groupId: [{id, periodMult, …}]} ← weapon_base.csv — 든 무기(`item.baseId`)의 **계보 공속 배율**을 무기군에 먹인다
 *                  (`formula.weaponLine` — 주기와 한 방에 같은 배율 · 2026-11-11 · R445). 없거나 행이 없는 베이스는 배율 1
 *   namePool     — 레어 영웅 이름 풀 [{ko,en}...]
 *   traitPool    — 시작 특성 풀 [{ko,en}...] (효과 미작성 — 이름표만 굴린다)
 *   skillPool    — **직업별** 고유 스킬 후보 `{classId: [skillId...]}` ← skill.csv **행 순서**(순서가 굴림 결과를 정한다).
 *                  hero.js 는 skill 시스템을 모른다 — id 목록만 받는다. **1스킬 = 1직업**(skill_design §12-1
 *                  확정 2026-09-08)이라 ~~전 행에서 균등~~ 이 아니라 **제 직업 풀**에서 굴린다 —
 *                  「마법사가 배쉬를 드는 일은 없다」
 *   starterPool  — `skillPool` 과 같은 모양 ← 직업 풀 중 skill.csv:tier = 1 — **첫 파티의 고유만** 여기서 굴린다
 *                  [2026-10-16 · R271 · hero_design §1 — ~~직업 기본기 starter_pool(딜 · 힐)~~ 2026-09-29 R179 대체] · 그 직업이 비면 직업 풀 · 행 순서가 결정론 계약
 *   masteryNodes — mastery_node.csv 파싱 행. 랭크당 값·상한·해금 레벨은 **키 이름만** 들고 balance 에서 읽는다
 *   heroTiers    — 영웅 등급 표 [{id, weight, totalMin, totalMax, attrSd}...] ← `hero_tier.csv` (**행 순서가 굴림 결과를 정한다**).
 *                  `weight = 0` 인 행은 생성기가 안 뽑는다(유니크는 수작업). 등급을 가르는 것은 **총합 대역과 굴림의 폭 둘뿐**이다
 *                  (hero_design §1 확정 2026-09-07 · 폭 `attrSd` 2026-10-22 R308 — ~~분포 모양 `shape`~~). 생성 상한은 등급과 무관한 `[balance.csv:hero_attr_roll_max]` 다
 *   heroFaces    — **직업별** 초상 장수 `{classId: n}`. **영웅이 태어날 때 제 직업 풀에서 굴려 `face` 에 박는다**
 *                  (2026-09-07 — 구 `heroFaceMax` 정수 하나를 대체). `face` 는 `'<classId>_<k>'` 문자열이고
 *                  풀이 0장인 직업은 `null`(초상 없음)이다. 로직은 그림을 모른다 — 직업별 장수 객체만 받고
 *                  어느 파일인지는 화면이 정한다(`ui/mock.js:heroFace`)
 */
/** 전직 공통 줄의 새 능력치 [2026-11-13 · R471] — `computeCombat` 이 `advance_fx` 로 내고 battle.js 가 읽는다(`u.adv`). 여기 없는 키는 공통 줄에 못 쓴다 */
export const ADV_KEYS = ['vs_burn_dmg', 'freeze_power', 'lightning_proc_chance', 'basic_dmg_pct', 'skill_dmg_pct', 'skill_dmg_per_target', 'alone_front_dr',
    'final_dmg_bonus', 'fixed_dmg_share', 'charge_speed_pct', 'vs_full_hp_dmg', 'extra_shot_chance', 'party_onhit_pct', 'kill_party_haste', 'overheal_shield',
    'vs_buff_count_dmg', 'phys_dmg_pct', 'struck_dmg_store',
    // 직업 마스터리 T4 — 셋 중 하나 [2026-11-14 · R437 · skill_design §3-5 「새 T4」] — 같은 길(`advance_fx` → `u.adv`)로 전투가 읽는다 · 두 번째 화살(`extra_shot_chance`) · 넘치는 잔(`overheal_shield`)은 위 키를 같이 쓴다
    'basic_cleave', 'skill_repeat_chance', 'elem_to_phys', 'hit_stun_chance', 'aura_guard_share', 'crit_taken_cut', 'skill_fixed_share', 'cast_refill_chance',
    'round_barrier', 'sin_vuln', 'last_prayer', 'basic_cd_tick', 'dodge_chance',
    // 죄종 마스터리 T4 — 셋 중 하나 [2026-11-14 · skill_design §3-3 「죄종 T4」] — 조건 칸은 그 죄종 T3 조건(`computeCombat:t4_cond`)으로 켜진다
    'wrath_blood', 'wrath_party_crit', 'wrath_steady', 'envy_strip', 'envy_party_pierce', 'envy_return', 'greed_mark', 'greed_reroll', 'greed_barrier',
    'sloth_heavy', 'sloth_party_cdr', 'sloth_defer', 'glut_cull', 'glut_party_dmg', 'glut_absorb', 'lust_crit_vuln', 'lust_share_heal', 'lust_charm',
    'pride_nth', 'pride_party_haste', 'pride_cap'];
/** 전직 공통 줄이 쓸 수 있는 능력치 — 위 새 키 + 이미 읽히는 장비 어휘 몇 + 반지 태그 꼴(`skill_tag`) · 로드 검사 */
const COMMON_STATS = new Set([...ADV_KEYS, 'skill_tag', 'cast_speed_pct', 'aspd_pct', 'fire_dmg_pct', 'res_reduction_lightning', 'life_steal', 'cooldown_reduction',
    'damage_reduction', 'hp_pct', 'def_flat', 'res_max_bonus', 'heal_out_pct', 'atk_pct']);

export function createHeroSystem(data) {
    const B = data.balance;
    // 전직 공통 줄 — 갈래 → 칸 셋 · 랭크 → 값(skill.js 가 표를 풀고 검증한다 · 2026-11-13 R471) · 안 넘기면 공통 줄이 없다
    const advanceCommon = data.advanceCommon ?? null;
    const advanceCommonValue = data.advanceCommonValue ?? (() => 0);
    if (advanceCommon) for (const [id, cells] of advanceCommon) for (const c of cells)
        if (!COMMON_STATS.has(c.stat)) throw new Error(`advance_common: ${id}#${c.slot} — 능력치 '${c.stat}' 를 읽는 곳이 없다`);
    const F = createFormula(B);        // 성장 곡선(growthMult)을 시뮬과 같은 함수에서 읽는다
    const statIds = data.stats.map(s => s.id);
    const mainClasses = data.classes.filter(c => c.stage === 'main').map(c => c.id);
    const skillPool = data.skillPool ?? {};      // {classId: [skillId...]} — 직업 풀 (skill_design §12)
    const starterPool = data.starterPool ?? {};  // {classId: [skillId...]} — 직업 풀의 1티어 · 첫 파티 고유만 (2026-10-16 · R271)
    const facePools = data.heroFaces ?? {};        // {classId: [k…]} — 굴릴 초상 번호 목록 · 없거나 빈 직업 = 초상 없음 (2026-11-14 · 옛 장수 n)
    // 무기 베이스 id → 행 — 든 무기의 계보 공속 배율을 찾는다(`formula.weaponLine` · 2026-11-11 · R445). 행이 없는 베이스(옛 세이브의 퇴역 id)는 배율 1
    const weaponBaseById = Object.fromEntries(Object.values(data.weaponBases ?? {}).flat().map(b => [b.id, b]));
    // 무기군 특성 [2026-11-11 · R443 · weapon_group_draft §1 · INTERFACE §2-4] — 무기군마다 접사 모양의 줄 목록 `{stat, v}` · `{stat:'skill_tag', tag, effect:'value', v}`.
    //   **굴림이 없다** — 최소 = 최대 · 한 줄 · `flat`(비율) 이 아니면 생성 때 던진다(굴리는 특성이 서면 아이템 줄로 옮길 일이라 조용히 받지 않는다)
    const TAG_VALUE = 'skill_tag_value';
    const valueTags = [...new Set((data.ringBaseOptions ?? []).filter(r => r.effect === 'value').map(r => r.tag))];
    const weaponTraitLines = {};
    for (const [id, g] of Object.entries(data.weaponGroups ?? {})) {
        const tr = g?.trait;
        if (!tr) continue;
        if (tr.stats?.length !== 1 || tr.scale !== 'flat' || !(tr.min > 0) || tr.max !== tr.min)
            throw new Error(`hero: weapon_group.csv '${id}' 무기군 특성 ${tr.stats} ${tr.scale} ${tr.min}~${tr.max} — 한 줄 · flat · 최소 = 최대 > 0 (굴림 없음 · R443)`);
        const st = tr.stats[0];
        if (st === TAG_VALUE && !valueTags.length) throw new Error(`hero: weapon_group.csv '${id}' 특성 ${TAG_VALUE} — ring_base_option.csv 에 value 행이 없다`);
        weaponTraitLines[id] = st === TAG_VALUE ? valueTags.map(tag => ({ stat: 'skill_tag', tag, effect: 'value', v: tr.min })) : [{ stat: st, v: tr.min }];
    }
    // 레벨 1 최대 HP — **직업마다** [2026-10-02 사용자 「궁수 · 마법사 50 · 사제 70」] · 빈 칸이면 전역 `hero_hp_base`
    const hpBaseOf = id => data.classes.find(c => c.id === id)?.hpBase ?? B.hero_hp_base;
    // 새 게임 첫 진형의 랭크 — `class.csv:start_row` 가 `back` 이면 1(후열) · 그 밖은 0(전열) (INTERFACE §2-4 · 2026-10-21 사용자 지시)
    const startRankOf = id => data.classes.find(c => c.id === id)?.startRow === 'back' ? 1 : 0;

    /* ── 마스터리 노드 (skill_design §3) — 정의는 CSV · 값은 balance.csv · 랭크는 영웅이 든다 ── */

    const TREE_KINDS = ['sin', 'class'];
    const ANY = '*';                       // owner_id 가 `*` = 그 tree_kind 의 주인 전부 (죄종 T1 세 칸 — 일곱 죄종 공통 2026-11-13 R459 · 직업 T3-1 공통 무기 노드)
    // `requires` = 그 칸의 **낀 장비 갈래가 켜는 노드** [2026-09-22 · skill_design §3-5 · §3-6 · R138] — `<칸>:<갈래>|<갈래>` 또는 `-`.
    //   무기 칸은 무기군(`weapon_group.csv`) · 갑옷 칸은 갑옷군(`armor_group.csv` 의 armor 행)을 본다. 편성 시점에 정해져 전투 중 계산 · rng 가 없다
    //   **`sin_gear:<balance 키>`** [2026-11-12 · PLAN_mastery_tiers §0-1 — 죄종 T2 = 장비 수 단 셋] — 낀 장비 중 그 영웅 죄종 장비가 그 키의 수 이상일 때 켜진다
    //   (3 · 6 · 9 — 착용 칸이 여덟이라 9 는 아홉째 칸 「죄종 인장」이 열려야 닿는다 · ~~`sin_gear` 단독 + 문턱 하나~~ 10-05 판)
    const GATE_TABLES = { weapon: () => data.weaponGroups ?? {}, armor: () => data.armorGroups?.armor ?? {} };
    const SIN_GEAR = 'sin_gear';
    // `cond` = 전투가 판정하는 조건 [2026-10-05 · INTERFACE §2-6 「마스터리 조건부」 · **2026-11-13 R468 — 죄종마다 조건 하나 · 랭크가 조건을 넓힌다** · PLAN_mastery_tiers §0-1].
    //   견주는 상대 — 때리는 쪽 능력치(치명 · 치명 피해 · 방어 무시 · 데미지 % · 최대 데미지 · 강타 · 흡혈)는 그 타격의 대상 ·
    //   맞는 쪽 능력치(피해 감소 · 모든 저항 · 고정 피해 감소 · 타격 회복 · 반사)는 때린 쪽 · 틱 능력치(쿨감 · HP 재생)는 마지막으로 친 적(battle.js `lastFoe`) —
    //   여섯 조건 모두 모든 능력치를 쓴다
    const COND_ALL = ['crit_rate', 'crit_damage', 'def_ignore', 'atk_pct', 'dmg_max_flat', 'crushing_blow_pct', 'life_steal',
        'damage_reduction', 'res_all', 'dr_flat', 'fhr', 'reflect_damage', 'cooldown_reduction', 'hp_regen'];
    // **랭크가 조건을 넓힌다 · 값은 랭크와 상관없이 하나**(`value` 그대로) [2026-11-13 사용자 「ㅇㅇ그렇게가보자」 · R468 — 옛 풀려난 분노 · 손짓(R343)의 문법을 여섯 조건 전부에].
    //   분노 `hurt` = 내 HP 비율이 문턱 **미만**(랭크마다 +) · 시기 `higher` = 상대 HP 비율이 나보다 문턱 이상 높다(랭크마다 − · 0 이면 높기만 하면) ·
    //   오만 `lower` = 상대 HP 비율이 나보다 문턱 이상 낮다(거울) · 색욕 `fresh` = 상대 HP 비율이 문턱 **이상**(1 = 가득 · 랭크마다 −) ·
    //   나태 `opening` = 라운드가 열린 뒤 그 초 동안(랭크마다 +) · 폭식 `late` = 라운드가 열린 뒤 그 초부터(랭크마다 −). 전투가 `thr` · `sec` 를 읽는다(battle.js `condOn`)
    const WIDEN_KEYS = {
        hurt: ['mastery_wrath_t3_hp_pct', 'mastery_wrath_t3_hp_step_pct', 'thr', +1],
        higher: ['mastery_envy_t3_gap_pct', 'mastery_envy_t3_gap_step_pct', 'thr', -1],
        lower: ['mastery_pride_t3_gap_pct', 'mastery_pride_t3_gap_step_pct', 'thr', -1],
        fresh: ['mastery_lust_t3_hp_pct', 'mastery_lust_t3_hp_step_pct', 'thr', -1],
        opening: ['mastery_sloth_t3_sec', 'mastery_sloth_t3_sec_step', 'sec', +1],
        late: ['mastery_gluttony_t3_sec', 'mastery_gluttony_t3_sec_step', 'sec', -1],
    };
    const COND_STATS = Object.fromEntries(Object.keys(WIDEN_KEYS).map(c => [c, COND_ALL]));
    const RANK_WIDENS = Object.fromEntries(Object.entries(WIDEN_KEYS).map(([c, [base, step, field, dir]]) =>
        [c, r => ({ [field]: Math.max(0, B[base] + dir * B[step] * (r - 1)) })]));
    /** 그 조건이 랭크 r 에서 여는 문턱 — `{thr, step}` · `{sec, step}`(`step` = 랭크당 폭 · 화면 툴팁이 그린다) · 모르는 조건이면 null */
    const masteryWiden = (cond, r) => RANK_WIDENS[cond] ? { ...RANK_WIDENS[cond](r), step: B[WIDEN_KEYS[cond][1]] } : null;

    /** 로드 시 전수 검증 — 키가 balance 에 없으면 값이 undefined 로 조용히 새므로 즉시 던진다 */
    const masteryNodes = (data.masteryNodes ?? []).map(row => {
        const bad = why => { throw new Error(`mastery: ${row.node_id} — ${why}`); };
        const num = key => {
            if (typeof B[key] !== 'number') bad(`balance.csv 에 '${key}' 가 없다`);
            return B[key];
        };
        if (!row.node_id) bad('node_id 가 없다');
        if (!row.name_kr?.trim() || !row.name_en?.trim()) bad('표시 이름 ko/en 이 비었다');
        if (!TREE_KINDS.includes(row.tree_kind)) bad(`tree_kind '${row.tree_kind}'`);
        if (row.tree_kind === 'sin' && row.owner_id !== ANY && !data.sins.includes(row.owner_id)) bad(`죄종 '${row.owner_id}'`);
        if (row.tree_kind === 'class' && row.owner_id !== ANY && !data.classes.some(c => c.id === row.owner_id)) bad(`직업 '${row.owner_id}'`);
        if (!(row.tier >= 1)) bad(`tier ${row.tier}`);
        let gate = null;
        if (String(row.requires).split(':')[0] === SIN_GEAR) {
            if (row.tree_kind !== 'sin') bad('sin_gear 는 죄종 트리 노드만 쓴다');
            const key = String(row.requires).slice(SIN_GEAR.length + 1);
            if (!key) bad(`requires '${row.requires}' — sin_gear:<balance 키> 꼴이어야 한다`);
            gate = { slot: SIN_GEAR, need: num(key) };
        } else if (row.requires && row.requires !== '-') {
            const [slot, list = ''] = String(row.requires).split(':');
            if (!GATE_TABLES[slot]) bad(`requires 칸 '${slot}'`);
            const groups = list.split('|').filter(Boolean);
            if (!groups.length) bad(`requires '${row.requires}' 에 갈래가 없다`);
            for (const g of groups) if (!GATE_TABLES[slot]()[g]) bad(`requires ${slot} 갈래 '${g}'`);
            gate = { slot, groups };
        }
        // 공통 무기 노드의 표시 이름은 직업마다 정확히 한 무기군으로 풀려야 한다.
        const templated = row.name_kr.includes('{group}') || row.name_en.includes('{group}');
        if (templated) {
            if (!row.name_kr.includes('{group}') || !row.name_en.includes('{group}')
                || row.tree_kind !== 'class' || row.owner_id !== ANY || gate?.slot !== 'weapon')
                bad('무기군 이름 형식은 양 언어의 직업 공통 무기 노드에만 쓴다');
            for (const cls of mainClasses) {
                const usable = gate.groups.filter(id => data.weaponGroups[id].classes.includes(cls));
                if (usable.length !== 1) bad(`${cls} 직업의 표시 무기군 ${usable.length}개 (1개 필요)`);
            }
        }
        const cond = row.cond && row.cond !== '-' ? row.cond : null;
        if (cond) {
            if (!COND_STATS[cond]) bad(`cond '${cond}'`);
            if (!COND_STATS[cond].includes(row.stat)) bad(`cond '${cond}' 에 못 쓰는 능력치 '${row.stat}'`);
            if (gate) bad('cond 와 requires 를 같이 쓸 수 없다');
        }
        return {
            id: row.node_id, treeKind: row.tree_kind, ownerId: row.owner_id, tier: row.tier,
            stat: row.stat, name: { ko: row.name_kr, en: row.name_en },
            value: num(row.value_key), maxRank: num(row.max_rank_key),
            // 해금 없음(`-`)은 레벨 1 — 「T1 은 1레벨부터」(§1-4)를 숫자 하나로 표현한 것
            unlockLevel: row.unlock_key === '-' ? 1 : num(row.unlock_key),
            gate, cond,
        };
    });
    const masteryById = Object.fromEntries(masteryNodes.map(n => [n.id, n]));
    // 조건부 노드가 있으면 문턱 · 간격 키도 있어야 한다 — 없으면 문턱이 NaN 으로 조용히 샌다 (R468)
    for (const [cond, [base, step]] of Object.entries(WIDEN_KEYS))
        if (masteryNodes.some(n => n.cond === cond) && !(B[base] >= 0 && B[step] >= 0))
            throw new Error(`mastery: balance.csv 의 ${base} · ${step} 이 없거나 틀렸다 (cond '${cond}')`);
    // 탐욕 T3(`*_per_greed`)가 있으면 탐욕 합의 상한도 있어야 한다 — 없으면 `Math.min` 이 NaN 을 낸다 (R325)
    if (masteryNodes.some(n => n.stat.endsWith('_per_greed')) && !(B.mastery_greed_t3_input_cap >= 0))
        throw new Error('mastery: balance.csv 의 mastery_greed_t3_input_cap 이 없거나 틀렸다');

    /** 낀 장비 중 그 영웅 죄종을 가진 장비 수 — 장비당 같은 죄종 최대 1 이라 장비 수와 같다 (item_design §1 · 2026-10-05) */
    const sinGearCount = (hero, items) => (items ?? []).filter(it => hero?.sin && (it?.sins ?? []).includes(hero.sin)).length;

    /**
     * 레벨당 옵션 하나가 그 레벨에서 더하는 축과 값 — `{stat, v}` · 레벨당 옵션이 아니거나 레벨을 모르면 `null`
     * [2026-10-30 · SCREEN_DESIGN §6 · ADR-0954 — 아이템 툴팁 「데미지 +40% (레벨당 데미지 +1%)」].
     *   짝 · 반올림은 아래 `computeCombat` 이 더하는 것과 같다(최대 데미지만 정수로 반올림) — 그쪽을 고치면 여기도 고친다
     */
    const PER_LEVEL = {
        dmg_per_level_pct: 'atk_pct', dmg_max_per_level: 'dmg_max_flat', dmg_min_per_level: 'dmg_min_flat', hp_per_level: 'hp_flat', def_per_level: 'def_flat',
        aspd_per_level_pct: 'aspd_pct', cast_speed_per_level_pct: 'cast_speed_pct', res_all_per_level: 'res_all',
    };
    const levelScaled = (stat, v, level) => {
        const to = PER_LEVEL[stat];
        if (!to || !(level > 0)) return null;
        return { stat: to, v: stat === 'dmg_max_per_level' || stat === 'dmg_min_per_level' ? Math.round(v * level) : v * level };
    };

    /**
     * 그 노드가 **지금 낀 장비로 켜졌나** — 게이트 없는 노드는 언제나 켜져 있다. 랭크는 캐릭터에 쌓이고 켜는 것만 장비가 정한다(§3-5 「누적형」 소멸).
     * `items` 를 모르면(null) 게이트 노드는 꺼진 것으로 친다 — 맨몸과 같다 · `sin_gear` 는 `hero` 도 알아야 한다(모르면 꺼짐)
     */
    const gateOn = (n, items, hero = null) => !n.gate
        || (n.gate.slot === SIN_GEAR ? sinGearCount(hero, items) >= n.gate.need
            : (items ?? []).some(it => it?.slot === n.gate.slot && n.gate.groups.includes(it.group)));

    /** 이 영웅의 트리에 걸린 노드 — 죄종·직업 둘 다. 죄종도 직업도 생성 시 확정이라 목록은 안 바뀐다 (§1-4) */
    const masteryNodesFor = hero => masteryNodes.filter(n =>
        (n.treeKind === 'sin' && (n.ownerId === ANY || n.ownerId === hero?.sin))
        || (n.treeKind === 'class' && (n.ownerId === ANY || n.ownerId === hero?.cls)));

    /**
     * **줄마다 점수 합** [2026-11-13 사용자 「마스터리 찍는거를 가로줄 마다 5개씩 주면 딱 50개나오거든」 · skill_design §3 · R473] —
     *   한 줄 = 그 영웅 트리의 같은 탭(죄종 · 직업) · 같은 단의 칸들 · 그 칸들에 찍은 랭크 합이 `[balance.csv:mastery_row_points]` 를 못 넘는다(칸 상한은 그대로).
     *   찍기(`state.learnMastery`) · 화면 상태 · 세이브 정리 · AI 팀 · 팀 코드 검사기가 이것 하나를 본다
     */
    const masteryRowKey = n => `${n.treeKind}:${n.tier}`;
    const masteryRowUsed = (hero, n) => {
        const key = masteryRowKey(n);
        return masteryNodesFor(hero).reduce((s, x) => s + (masteryRowKey(x) === key ? (hero?.mastery?.[x.id] ?? 0) : 0), 0);
    };
    /**
     * **셋 중 하나** [2026-11-10 사용자 「3개중에 1개만 찍을 수 있게」 · skill_design §3-5 「새 T4」 · R437] — 4단(T4) 줄은 한 칸에만 찍는다.
     *   그 줄의 **다른 칸**에 랭크가 있으면 참(이 칸은 잠겼다) · 4단이 아니면 늘 거짓 — 찍기 · 화면 상태 · 세이브 정리 · AI 팀 · 팀 코드 검사기가 이것 하나를 본다
     */
    /** 죄종 T4 의 조건 — `{cond, thr|sec}` · 죄종 T4 랭크가 없거나 그 죄종 T3 에 조건이 없으면(탐욕) null (2026-11-14) */
    const t4CondOf = hero => {
        const own = masteryNodesFor(hero).filter(n => n.treeKind === 'sin');
        if (!own.some(n => n.tier >= 4 && (hero?.mastery?.[n.id] ?? 0) > 0)) return null;
        const t3 = own.filter(n => n.tier === 3 && n.cond && RANK_WIDENS[n.cond]);
        if (!t3.length) return null;
        const r = Math.max(1, ...t3.map(n => Math.min(hero?.mastery?.[n.id] ?? 0, n.maxRank)));
        return { cond: t3[0].cond, ...RANK_WIDENS[t3[0].cond](r) };
    };
    const masteryPickOneBlocked = (hero, n) => n.tier >= 4
        && masteryNodesFor(hero).some(x => x.id !== n.id && masteryRowKey(x) === masteryRowKey(n) && (hero?.mastery?.[x.id] ?? 0) > 0);
    if (masteryNodes.length && !(Number.isInteger(B.mastery_row_points) && B.mastery_row_points > 0))
        throw new Error('mastery: balance.csv 의 mastery_row_points 가 없거나 양의 정수가 아니다');

    /**
     * 찍은 랭크 → 접사와 **같은 채널**의 가산치. 새 곱셈 층을 만들지 않는다 (battle_design §9-2 「괄호는 둘뿐」).
     * 피해 감소만 따로 낸다 — 원천별 곱이라 합치면 안 된다(§9-3). **노드 하나 = 원천 하나**.
     * `items` = 낀 장비 — 무기 · 갑옷 · 죄종 장비 수가 켜는 노드(`gate`)를 가린다 (skill_design §3-5 · R138 · §3-2 2026-10-05)
     * **조건부 노드(`cond`)는 상시 값에 안 더한다** — `cond` 로 따로 내고 전투가 타격마다 판정한다 (2026-10-05 · INTERFACE §2-6 「마스터리 조건부」)
     */
    function masteryBonus(hero, items = null) {
        const flat = {}, dr = [], cond = [], tags = [];
        const ranks = hero?.mastery ?? {};
        for (const n of masteryNodesFor(hero)) {
            const r = Math.min(ranks[n.id] ?? 0, n.maxRank);   // 상한 초과는 세이브 손상 — 계산에선 잘라 쓴다
            if (!(r > 0) || !gateOn(n, items, hero)) continue;
            // 조건부 칸은 값을 랭크로 곱하지 않고 랭크가 연 문턱(`thr` · `sec`)을 싣는다 (R343 · R468 — 조건 여섯 모두)
            if (n.cond) cond.push({ cond: n.cond, stat: n.stat, v: n.value, ...RANK_WIDENS[n.cond](r) });
            else if (n.stat === 'damage_reduction') dr.push(n.value * r);
            else flat[n.stat] = (flat[n.stat] ?? 0) + n.value * r;
        }
        // 전직 공통 줄 [2026-11-13 · R471 · advance_tree_draft §1] — 마스터리와 같은 공용 포인트 · 같은 채널이다. 칸 = 원천 하나(피해 감소는 곱) ·
        //   반지 태그 보너스 꼴(`skill_tag` — 함성 · 오오라 · 축복 · 저주 · 냉기 스킬)은 `tags` 로 따로 낸다(`computeCombat` 이 `skillTags` 에 더한다)
        const cells = hero?.advance ? advanceCommon?.get(hero.advance) : null;
        if (cells && Array.isArray(hero.advanceCommon)) cells.forEach((c, i) => {
            const v = advanceCommonValue(c, hero.advanceCommon[i] ?? 0);
            if (!v) return;
            if (c.stat === 'skill_tag') tags.push({ tag: c.tag, effect: c.effect, v });
            else if (c.stat === 'damage_reduction') dr.push(v);
            else flat[c.stat] = (flat[c.stat] ?? 0) + v;
        });
        return { flat, dr, cond, tags };
    }

    /* ── 생성 ── */

    const drawDistinct = (rng, pool, n) => {
        const rest = pool.slice(), out = [];
        for (let i = 0; i < n && rest.length; i++)
            out.push(rest.splice(Math.floor(rng() * rest.length), 1)[0]);
        return out;
    };

    /**
     * 첫 파티의 직업 — **앞줄 직업(`startRankOf` = 0)이 하나는 든다** [2026-10-22 사용자 지시 「3개중에 전사나 기사가 한마리는 무조건」 · hero_design §1].
     *   `drawDistinct` 와 같은 굴림을 같은 수만큼 쓰고, **마지막 자리까지 앞줄이 없는데 그 자리도 뒷줄을 냈을 때만** 같은 굴림의 남은 몫(`x − k`)으로
     *   남은 앞줄 직업 중 하나를 고른다(추가 소비 없음 · 앞줄 직업끼리는 균등) — 앞줄 0명이던 판만 1명으로 옮겨 가고 2명 비율은 그대로다.
     *   앞줄이 이미 든 시드는 결과도 `drawDistinct` 와 같다 (INTERFACE §5-2)
     */
    function drawStartClasses(rng, n) {
        const rest = mainClasses.slice(), out = [];
        const m = Math.min(n, rest.length);
        for (let i = 0; i < m; i++) {
            const x = rng() * rest.length, k = Math.floor(x);
            let c = rest[k];
            const front = rest.filter(id => startRankOf(id) === 0);
            if (i === m - 1 && startRankOf(c) !== 0 && front.length && !out.some(id => startRankOf(id) === 0))
                c = front[Math.floor((x - k) * front.length)];
            out.push(c);
            rest.splice(rest.indexOf(c), 1);
        }
        return out;
    }

    /**
     * 얼굴 1회 — 태어날 때 **제 직업 풀에서** 굴려 영웅에 박고, 그 뒤로 안 바뀐다 (hero_design §1 의 고유 스킬과 같은 층).
     * **화면이 매번 다시 계산하지 않게** 하려고 저장한다 — 렌더러는 전체를 다시 그리므로 그때마다 굴리면 얼굴이 흔들린다.
     * 결과는 `'<classId>_<k>'` 문자열(k ≥ 1)이고, 그 직업의 그림이 하나도 없으면 `null` = 초상 없음(2026-09-07).
     */
    const rollFace = (rng, cls) => {
        const pool = facePools[cls] ?? [];
        const r = rng();               // 풀 0장이어도 1회 소비 — 직업이 소비 수를 바꾸면 같은 시드가 다른 파티가 된다
        return pool.length ? `${cls}_${pool[Math.floor(r * pool.length)]}` : null;   // 목록이 [1..n] 이면 옛 장수 n 과 같은 결과
    };

    /* ── 등급 (hero_design §1 — 3층 확정 2026-09-07 · SSOT: `hero_tier.csv`) ── */

    const tierRows = data.heroTiers ?? [];
    const rollable = tierRows.filter(t => t.weight > 0);      // 유니크(weight 0)는 수작업이라 굴림 대상이 아니다
    const tierById = id => tierRows.find(t => t.id === id) ?? null;
    const defaultTier = () => rollable[0] ?? tierRows[0] ?? null;

    /**
     * 등급 1회 — **소비는 언제나 정확히 1회다.**
     * ⚠ 이것이 계약이다 (INTERFACE §5-2) — 소비 수가 등급이나 호출 경로에 의존하면
     *   선술집에서 등급이 섞여 나올 때 **같은 시드가 다른 결과**를 낸다. 그래서 시작 파티처럼
     *   등급을 **지정**하는 경우에도 굴림은 그대로 태우고 결과만 버린다
     *   (`rollFace` 가 「풀이 0장이어도 1회 소비」로 막아 둔 것과 같은 함정).
     */
    function rollTier(rng, forced) {
        const total = rollable.reduce((s, t) => s + t.weight, 0);
        const x = rng() * total;                              // 강제 지정이어도 굴린다 — 위 계약
        if (forced) return tierById(forced) ?? defaultTier();
        let acc = 0;
        for (const t of rollable) { acc += t.weight; if (x < acc) return t; }
        return defaultTier();
    }

    /* ── 기본 능력치 굴림 (hero_design §4-3 · 2026-10-22 R308 — 칸마다 굴리고 합이 등급 대역 밖이면 다시) ── */

    const classOf = id => data.classes.find(c => c.id === id) ?? null;
    const sinAttrs = data.sinAttrs ?? {};
    // 생성 · 자동 성장 한도와 최종 한도를 분리한다 — 남은 구간은 만렙 이후 수동 성장용(2026-10-30).
    const attrRollMax = B.hero_attr_roll_max;
    if (!Number.isInteger(attrRollMax) || !(B.hero_attr_min <= attrRollMax && attrRollMax <= B.hero_attr_max))
        throw new Error('hero: balance.csv 의 hero_attr_roll_max 는 hero_attr_min 이상 hero_attr_max 이하의 정수여야 한다');
    // 로드 검증 — 직업 · 죄종이 미는 칸이 능력치 어휘 밖이면 그 칸의 비율이 조용히 1 로 떨어진다 → 생성 때 던진다
    for (const c of data.classes) for (const k of ['keyAttr', 'subAttr'])
        if (c[k] != null && !statIds.includes(c[k])) throw new Error(`hero: class.csv ${c.id} 의 ${k} '${c[k]}' 가 hero_attribute.csv 에 없다`);
    if (data.sinAttrs) for (const s of data.sins ?? [])
        if (!statIds.includes(sinAttrs[s])) throw new Error(`hero: sin_attr.csv 에 죄종 '${s}' 의 칸이 없거나 어휘 밖이다 (${sinAttrs[s]})`);
    // 대역 · 폭이 다 있는 등급 — 유니크(수작업 · 기획 미정)는 칸이 `-` 라 굴리는 첫 등급의 것을 빌린다
    const usableTier = t => !!t && Number.isFinite(t.totalMin) && Number.isFinite(t.totalMax) && t.totalMin <= t.totalMax && t.attrSd > 0;
    for (const t of rollable) if (!usableTier(t)) throw new Error(`hero: hero_tier.csv ${t.id} 의 대역 · 폭(attr_sd)이 비었다`);

    /** 등급 → 대역(일곱 칸 합의 범위) · 폭 — 대역은 칸 범위로 닿을 수 있는 곳 `[7 × 최소, 7 × 최대]` 안으로 자른다 */
    function bandOf(tier) {
        const t0 = typeof tier === 'string' ? tierById(tier) : tier;
        const t = usableTier(t0) ? t0 : defaultTier();
        if (!usableTier(t)) throw new Error('hero: 능력치를 굴릴 등급(대역 · 폭)이 없다 — hero_tier.csv');
        const n = statIds.length;
        const min = Math.max(B.hero_attr_min * n, Math.min(t.totalMin, attrRollMax * n));
        return { min, max: Math.max(min, Math.min(t.totalMax, attrRollMax * n)), sd: t.attrSd };
    }

    /**
     * 칸마다의 비율(`statIds` 순) — 1 에서 시작해 직업 주력 · 보조 · 죄종 칸에 손잡이를 곱한다. 능력치 굴림의 중심(`centersOf`)과
     *   성장 고블린이 레벨마다 자랄 칸의 확률(`growLevels` · 2026-11-14 R495)이 **같은 표**를 쓴다
     */
    function attrWeights(cls, sin) {
        const c = classOf(cls);
        const w = statIds.map(() => 1);
        const bump = (id, k) => { const i = statIds.indexOf(id); if (i >= 0) w[i] *= k; };
        bump(c?.keyAttr, B.hero_attr_key_weight);
        bump(c?.subAttr, B.hero_attr_sub_weight);
        if (sinAttrs[sin] !== c?.keyAttr && sinAttrs[sin] !== c?.subAttr) bump(sinAttrs[sin], B.hero_attr_sin_weight);
        return w;
    }

    /**
     * 칸마다의 중심 — 대역 가운데 × 그 칸 비율 ÷ 비율 합. 비율은 1 에서 시작해 직업 주력 · 보조 · 죄종 칸에 손잡이를 곱한다
     * (`hero_attr_key_weight` · `_sub_weight` · `_sin_weight`) — 죄종 칸이 직업 주력·보조와 겹치면 죄종 가중치는 생략한다(R389).
     * 직업 · 죄종은 「어느 칸이 크게」만 정하고 「얼마나」는 등급의 대역이 정한다 — 비율 표 하나로 세 등급을 다 쓴다
     */
    function centersOf(cls, sin, band) {
        const w = attrWeights(cls, sin);
        const sum = w.reduce((a, b) => a + b, 0), mid = (band.min + band.max) / 2;
        return w.map(x => mid * x / sum);
    }
    const toStats = v => Object.fromEntries(statIds.map((id, i) => [id, v[i]]));

    /** 표준정규 1개 — Box–Muller · rng 2회(u₁ → u₂ · INTERFACE §5-3). `1 − u₁` 이라 log(0) 이 안 나온다 */
    const gauss = r => { const u1 = r(), u2 = r(); return Math.sqrt(-2 * Math.log(1 - u1)) * Math.cos(2 * Math.PI * u2); };

    /**
     * 기본 능력치 굴림 — **칸마다 제 분포(중심 · 등급의 폭)에서 굴리고, 일곱 칸의 합이 등급 대역 밖이면 처음부터 다시** 굴린다.
     *   ~~합을 먼저 굴리고 가중치로 나눈 뒤 주력을 최고치 자리로 바꿔치기~~(09-08 · R48) 대체 — 바꿔치기는 보조 · 죄종 칸을 밀어도
     *   그 몫을 주력이 가져가 버려서(2026-10-22 실측) 뺐다. **주력 최고치 보장은 없다** — 주력은 중심이 가장 높아 대개 가장 높게 나올 뿐이다.
     * `hero_attr_reroll_max` 번째도 대역 밖이면 그 굴림을 **다듬어** 끝낸다 — 넘치면 가장 큰 칸 · 모자라면 가장 작은 칸부터 1씩(동률은 앞 칸).
     *   평소엔 몇 번 안에 든다 · 상한은 대역에 들 수 없는 데이터에서 멈추지 않게 하는 안전장치다.
     * ⚠ **바깥 rng 소비는 언제나 1회다** — 그 값을 씨앗으로 만든 보조 rng 안에서만 다시 굴린다. 다시 굴린 횟수가 바깥 수열을 밀면
     *   중심 · 폭을 고칠 때마다 같은 시드의 고유 · 얼굴 · 다음 영웅까지 바뀐다 (INTERFACE §5-2).
     * 몇 번째에 들었나(`tries`) · 다듬었나(`trimmed`)를 함께 낸다 — 단정 · 캘리브레이션용. 영웅에는 `stats` 만 박힌다(`rollAttributes`)
     */
    function rollAttributesTrace(rng, { cls = null, sin = null, tier = null } = {}) {
        const sub = makeRng(Math.floor(rng() * 2 ** 32));
        const band = bandOf(tier);
        const c = centersOf(cls, sin, band);
        const lo = B.hero_attr_min, hi = attrRollMax;
        let v = null, tries = 0;
        while (tries < Math.max(1, B.hero_attr_reroll_max)) {
            tries++;
            v = c.map(x => Math.max(lo, Math.min(hi, Math.round(x + band.sd * gauss(sub)))));
            const s = v.reduce((a, b) => a + b, 0);
            if (s >= band.min && s <= band.max) return { stats: toStats(v), tries, trimmed: false };
        }
        let s = v.reduce((a, b) => a + b, 0);
        const pick = (ok, better) => { let k = -1; for (let i = 0; i < v.length; i++) if (ok(v[i]) && (k < 0 || better(v[i], v[k]))) k = i; return k; };
        for (let k; s > band.max && (k = pick(x => x > lo, (a, b) => a > b)) >= 0; s--) v[k]--;
        for (let k; s < band.min && (k = pick(x => x < hi, (a, b) => a < b)) >= 0; s++) v[k]++;
        return { stats: toStats(v), tries, trimmed: true };
    }
    const rollAttributes = (rng, opts) => rollAttributesTrace(rng, opts).stats;

    /** 칸마다의 중심(rng 0) — 「이 직업 · 죄종 · 등급은 어느 칸이 크게 나오나」 · `tier` 는 등급 행이나 id */
    const attrCenters = (cls, sin, tier) => toStats(centersOf(cls, sin, bandOf(tier)));

    /**
     * 고유 스킬 1개 — 영웅이 태어날 때 딱 한 번 굴린다 (hero_design §1).
     * 풀은 **그 영웅의 직업 풀** 하나다 [개정 2026-09-09 · skill_design §12-1 규칙 1] —
     *   ~~`skill.csv` 전 행에서 균등~~(09-01)은 「1스킬 = 1직업」 확정으로 폐기됐다.
     * ⚠ **풀이 비어도 1회 소비한다** — 소비 수가 직업에 의존하면 같은 시드가 다른 파티를 낸다
     *   (초상 굴림이 09-07 에 같은 이유로 같은 규칙이 됐다 · INTERFACE §5-2).
     * `starter` = **첫 파티** — 직업 풀의 1티어(`starterPool`)에서 굴린다 [2026-10-16 · R271 · hero_design §1 — ~~직업 기본기(딜 · 힐)~~ 2026-09-29 R179 대체].
     *   무기가 스킬을 안 담게 되어 레벨 10(스킬북) 전엔 고유 한 칸뿐이다. **소비는 1회 그대로**(풀만 좁다) · 1티어가 비면 직업 풀
     */
    const rollInnate = (rng, cls, starter = false) => {
        const pool = (starter && starterPool[cls]?.length ? starterPool[cls] : skillPool[cls]) ?? [];
        const r = rng();
        return pool.length ? pool[Math.floor(r * pool.length)] : null;
    };

    /** 생성 영웅 1명 — 죄종·직업·특성을 겹침 없이 뽑는 건 rollParty 쪽의 일 · `starter` = 첫 파티(고유를 1티어에서 — rollInnate) */
    function rollHero(rng, { sin, cls, name, trait, tier, starter = false }) {
        // rng 소비 순서가 계약이다 (INTERFACE §5-2) — 등급 1 → 능력치 1 → 고유 1 = **언제나 3회**
        //   (2026-10-22 R308 — ~~총합 1 · 능력치 7 = 10회~~ · 총합은 굴리지 않고 일곱 칸의 합으로 나온다 · 다시 굴리기는 능력치의 보조 rng 안).
        // 객체 리터럴 안에서 부르면 평가 순서가 문장으로 안 보여 순서가 조용히 밀린다.
        // 개체별 히든 상한은 없다 — 생성 상한 `hero_attr_roll_max` 는 전 영웅 공통이다 (§4-3).
        const t = rollTier(rng, tier);
        const stats = rollAttributes(rng, { cls, sin, tier: t });
        const innate = rollInnate(rng, cls, starter);
        return {
            uid: null,               // uid 발급은 state 의 일 (카운터 소유자)
            name, tier: t?.id ?? 'rare', sin, cls, trait,
            face: null,              // 얼굴 id — **파티를 굴리는 쪽이 맨 마지막에 박는다** (rollStartParty · 아래 이유)
            level: 1, xp: 0,
            mastery: {}, masteryPoints: B.mastery_point_start,   // 찍은 랭크 {nodeId: rank} · 남은 포인트 (죄종·직업 공유 풀) — 레벨 1 에도 한 점(포인트 = 레벨 · 2026-11-10 · R435)
            innate,                  // 고유 스킬 — 생성 시 확정 · 이후 불변 (hero_design §1 · 풀 = 그 직업의 스킬 풀)
            stats,                   // ~~caps~~ 는 09-07 폐지 — 상한이 전 영웅 공통이라 개체가 들 것이 없다
            equipped: {},            // 슬롯 초기화는 state 가 slots 정의로 채운다
        };
    }

    /**
     * 시작 파티 — 죄종·직업·이름·특성이 셋 사이에서 겹치지 않는다 (같은 카드 3장 방지).
     * 얼굴은 **겹침 방지를 따로 안 한다** (2026-09-07) — 직업 풀에서 굴리는데 파티 안 직업이 이미 서로 다르므로
     *   (바로 위 `drawDistinct(mainClasses)` · 첫 파티는 `drawStartClasses` — 둘 다 겹침 없음) 다른 풀에서 나온 얼굴끼리는 id 가 겹칠 수 없다.
     *
     * ⚠ **얼굴은 맨 마지막에 굴린다** (2026-09-06) — 능력치·상한·고유 뒤에 두어야 **앞의 소비 순서가 안 밀린다**.
     *   영웅 안에서 굴리면 1번 영웅의 얼굴이 2번 영웅의 능력치를 밀어 **같은 시드가 다른 파티**를 낸다 (INTERFACE §5-2).
     */
    function rollParty(rng, n, tiers, starter = false) {
        const names = drawDistinct(rng, data.namePool, n);
        const sins = drawDistinct(rng, data.sins, n);
        const classes = starter ? drawStartClasses(rng, n) : drawDistinct(rng, mainClasses, n);   // 첫 파티만 앞줄 하나 보장 (2026-10-22)
        const traits = drawDistinct(rng, data.traitPool, n);
        const party = names.map((name, i) =>
            rollHero(rng, { name, sin: sins[i], cls: classes[i], trait: traits[i], tier: tiers?.[i], starter }));
        // 소비는 언제나 인원수만큼 1회씩이다 — 직업 풀이 비어도(마법사) 소비 수는 안 바뀐다
        party.forEach(h => { h.face = rollFace(rng, h.cls); });
        return party;
    }

    /**
     * 첫 파티의 등급 — **레어 1 + 매직 1 + 일반 1** [개정 2026-09-14 사용자 확정 · ~~레어 1 + 매직 2~~ 09-07] (hero_design §1).
     * 셋이 같은 등급이면 차이가 굴림 운으로만 나타나는데 등급이 갈리면 **첫 화면부터 로스터에 층이 보이고**
     * 「아래 둘을 언젠가 위로 갈아탄다」는 목표가 바로 생긴다. 인원이 늘면 나머지는 굴린다.
     */
    const START_TIERS = ['rare', 'magic', 'normal'];

    // 첫 파티만 고유를 직업 기본기 풀에서 굴린다 [2026-09-29 · R179 · hero_design §1] — 선술집 · 수색(`rollCandidates`)은 직업 풀 그대로
    const rollStartParty = (rng, n) => rollParty(rng, n, START_TIERS, true);

    /**
     * 선술집 후보 — 시작 파티와 같은 굴림이되 **등급도 굴린다** (첫 파티만 지정이다).
     * `tiers` 를 주면 그 등급으로 굳는다 — **수색이 줄 레벨로 등급을 미는 자리**다 (state.visitRoll · ~~수색~~ 2026-10-19).
     *   `rollTier` 가 지정이어도 굴림을 태우므로(위 계약) **소비 수는 지정 여부와 무관하게 같다**.
     */
    const rollCandidates = (rng, n, tiers = null) => rollParty(rng, n, tiers);

    /**
     * 이름 겹침 피하기 [2026-10-15 사용자 · PLAN_user_review 2-5 「노엘 → 노엘」 · hero_design §1] — 굴린 뒤 **이미 있는 이름(`taken`)과 겹치는 후보만** 이름을 바꾼다.
     *   **rng 를 안 쓴다** — 소비 순서 계약(INTERFACE §5-2)과 골든이 그대로다. 새 이름 = 이름 풀에서 **원래 이름 다음 자리부터** 돌며 처음 비는 이름.
     *   피하는 이름 = `taken` ∪ 이 목록의 이름 — 명단에서 한 명을 고용해도(그 이름이 후보 → 로스터로 옮겨 갈 뿐) 남은 후보의 이름이 안 흔들린다.
     *   `null` 칸(고용한 명단 칸)은 건너뛴다 · 풀이 다 차면 그대로 둔다. 목록의 영웅을 **고쳐 쓰고** 그 목록을 돌려준다
     */
    function avoidNames(list, taken) {
        const key = n => n?.ko ?? n;
        const hit = new Set((taken ?? []).map(key));
        if (!hit.size) return list;
        const used = new Set([...hit, ...list.filter(Boolean).map(h => key(h.name))]);
        const pool = data.namePool;
        for (const h of list) {
            if (!h || !hit.has(key(h.name))) continue;
            const at = pool.findIndex(n => key(n) === key(h.name));
            for (let k = 1; k <= pool.length; k++) {
                const n = pool[(at + k) % pool.length];
                if (!used.has(key(n))) { h.name = n; used.add(key(n)); break; }
            }
        }
        return list;
    }

    /**
     * 직업을 정한 영웅 1명 [2026-10-08 · 개발 장치 — 관리자 모드가 그 직업을 넣는 자리 · `state.adminHero`].
     * 이름 · 죄종 · 특성 · 등급은 선술집 후보처럼 굴리고(고유는 직업 풀) **얼굴은 맨 마지막**(`rollParty` 와 같은 이유).
     * 소비 = 이름 1 → 죄종 1 → 특성 1 → `rollHero` 3 → 얼굴 1 = 언제나 7회 · 메인 직업이 아니면 `null`(소비 0)
     * `tier` — 주면 그 등급으로 고정(실험실 결투 = 레어 · 2026-11-13 R472) · 등급 굴림 1회는 그대로 태운다(`rollTier` 계약 — 소비 수 그대로)
     */
    function rollHeroOf(rng, cls, tier = null) {
        if (!mainClasses.includes(cls)) return null;
        const [name] = drawDistinct(rng, data.namePool, 1);
        const [sin] = drawDistinct(rng, data.sins, 1);
        const [trait] = drawDistinct(rng, data.traitPool, 1);
        const h = rollHero(rng, { name, sin, cls, trait, tier });
        h.face = rollFace(rng, cls);
        return h;
    }

    /**
     * 새 게임의 고블린 1마리 [2026-10-27 사용자 · hero_design §1 「성장 영웅」] — 다섯 종(`kinds` — 직업마다 하나 · state 가 넘긴다) 중 하나를 고르고
     * 죄종 · 특성 · 고유를 굴린다. 고유는 **직업 풀 전체**(선술집과 같다 · 첫 파티의 1티어 규칙 밖). 등급 · 능력치 · 얼굴은 종류가 정한다(state 가 박는다).
     * 소비 = 종류 1 → 죄종 1 → 특성 1 → 고유 1 = 언제나 4회 (INTERFACE §5-2)
     */
    function rollGoblin(rng, kinds) {
        const kind = kinds[Math.floor(rng() * kinds.length)];
        const [sin] = drawDistinct(rng, data.sins, 1);
        const [trait] = drawDistinct(rng, data.traitPool, 1);
        const innate = rollInnate(rng, kind.cls);
        return { kind, sin, trait, innate };
    }

    /* ── 성장 ── */

    /**
     * 레벨업 필요 XP — **표 조회**다 (`level_xp.csv:xp_need` · 2026-09-28 · ~~hero_xp_base × level ^ hero_xp_exp~~).
     *   디아블로2 필요량의 모양을 따른다(PLAN_early_progression D1 · D2). 표가 1 ~ 상한 − 1 을 못 덮으면 생성 때 던진다 —
     *   빈 칸이 undefined 로 새면 `hero.xp >= undefined` 가 거짓이라 레벨이 조용히 멈춘다
     */
    const XP_NEED = new Map((data.levelXp ?? []).map(r => [r.level, r.xpNeed]));
    for (let l = 1; l < B.hero_level_cap; l++)
        if (!(XP_NEED.get(l) > 0)) throw new Error(`hero: level_xp.csv 에 레벨 ${l} 의 xp_need 가 없다 (상한 ${B.hero_level_cap})`);
    const xpNeeded = level => XP_NEED.get(level);

    /**
     * 만렙 뒤 별 [신설 2026-11-11 · hero_design §5 · INTERFACE §2-4] — 만렙에서 XP 를 버리지 않고 별을 하나씩 채운다.
     *   별을 `n` 개 채운 영웅의 다음 별 = 레벨 1 → 만렙의 필요 XP 합 × `hero_star_xp_first` × `hero_star_xp_growth` ^ n (정수로 반올림) ·
     *   `n` 이 `hero_star_max` 이상이면 `null`(더 찰 별이 없다). 레벨이 아니라 체력 · 적중 · 포인트는 안 바뀐다
     */
    if (!(Number.isInteger(B.hero_star_max) && B.hero_star_max >= 0)) throw new Error('hero: balance.csv 의 hero_star_max 가 0 이상 정수가 아니다');
    if (!(B.hero_star_xp_first > 0) || !(B.hero_star_xp_growth > 0)) throw new Error('hero: balance.csv 의 hero_star_xp_first · hero_star_xp_growth 가 없거나 0 이하다');
    let LEVEL_XP_TOTAL = 0;
    for (let l = 1; l < B.hero_level_cap; l++) LEVEL_XP_TOTAL += xpNeeded(l);
    const starXpNeeded = n => Number.isInteger(n) && n >= 0 && n < B.hero_star_max
        ? Math.round(LEVEL_XP_TOTAL * B.hero_star_xp_first * B.hero_star_xp_growth ** n) : null;

    /**
     * XP 지급 → 레벨업 처리.
     * **일반 영웅의 기본 능력치는 레벨업으로 안 바꾼다** [hero_design §4-3 · R83] — 만렙 이후 수동 성장분도 자동 지급하지 않는다.
     *   ~~레벨업마다 축별 [balance.csv:attr_growth_chance_pct]% 확률로 +1~~ 은 폐지됐다 — 7축을 공통 상한으로 모아
     *   만렙에서 개체차를 지웠다. 등급 차이는 이제 끝까지 간다.
     * `rng` 는 소비하지 않는다 — 계약 모양으로만 남는다 (INTERFACE §2-4 · §5-2).
     * **예외 — 등급 「성장」(고블린)** [2026-10-29 · R365 · hero_design §1] — 오른 레벨마다 상한 미만 칸 중 하나가
     *   [balance.csv:growth_attr_per_level] 자란다. 굴림은 영웅의 `growthSeed` 에서 레벨마다 따로 연다(§5-1 「고블린 성장」) —
     *   인자 rng 와 무관해 원정 · 연구소 · 관리자 어느 길로 올라도 같은 칸이다. 일반 영웅의 `gains` 는 `{}`.
     *   칸은 **직업 · 죄종 비율로** 고른다(`attrWeights` — 능력치 굴림과 같은 표 · 2026-11-14 사용자 · R495): 열린 칸의 비율을
     *   앞 칸부터 쌓은 줄 위에 레벨마다 한 번 던진다(굴림 수는 그대로 1회).
     */
    const GROWTH_TIER = 'growth';   // hero_tier.csv 의 성장 행 id (생성기가 안 뽑는다 · state.newGame 의 고블린만)
    if (!(B.growth_attr_per_level > 0)) throw new Error(`hero: balance.csv 의 growth_attr_per_level 이 없거나 0 이하다`);
    function growLevels(hero, from, to) {
        const gains = {};
        if (hero.tier !== GROWTH_TIER) return gains;
        if (!Number.isInteger(hero.growthSeed)) throw new Error(`hero: 성장 영웅 ${hero.uid} 에 growthSeed 가 없다`);
        const w = attrWeights(hero.cls, hero.sin);
        for (let lv = from + 1; lv <= to; lv++) {
            const open = statIds.map((id, i) => ({ id, w: w[i] })).filter(o => (hero.stats[o.id] ?? 0) < attrRollMax);
            if (!open.length) break;   // 일곱 칸이 다 찼다
            let r = makeRng(deriveSeed(hero.growthSeed, lv))() * open.reduce((a, o) => a + o.w, 0);
            let id = open.at(-1).id;   // 부동소수 끝자락 — 마지막 칸
            for (const o of open) { if (r < o.w) { id = o.id; break; } r -= o.w; }
            const add = Math.min(B.growth_attr_per_level, attrRollMax - (hero.stats[id] ?? 0));
            hero.stats[id] = (hero.stats[id] ?? 0) + add;
            gains[id] = (gains[id] ?? 0) + add;
        }
        return gains;
    }
    function grantXp(hero, amount, rng) {
        const from = hero.level;
        hero.xp += amount;
        while (hero.level < B.hero_level_cap && hero.xp >= xpNeeded(hero.level)) {
            hero.xp -= xpNeeded(hero.level);
            hero.level += 1;
        }
        // 만렙 뒤 별 [2026-11-11 · hero_design §5] — 만렙의 XP 는 다음 별로 쌓는다(이 지급의 남은 XP 도 이어진다) ·
        //   별이 다 차면 더 안 쌓는다(남겨 봐야 쓸 곳이 없다 · ~~상한에서 XP 를 버린다~~). 별은 반환에 안 적는다 — 레벨업 회복 · 책이 별에 안 걸린다
        if (hero.level >= B.hero_level_cap) {
            let stars = hero.stars ?? 0;
            for (let need = starXpNeeded(stars); need !== null && hero.xp >= need; need = starXpNeeded(stars)) {
                hero.xp -= need;
                stars += 1;
            }
            if (stars > 0) hero.stars = stars;
            if (starXpNeeded(stars) === null) hero.xp = 0;
        }
        // 공용 스킬 포인트 — 매 레벨업 지급. 죄종·직업 마스터리와 전직 메인·꼬리가 masteryPoints 지갑을 공유한다 (2026-11-01).
        const points = (hero.level - from) * B.mastery_point_per_level;
        if (points > 0) hero.masteryPoints = (hero.masteryPoints ?? 0) + points;
        return hero.level > from ? { uid: hero.uid, from, to: hero.level, gains: growLevels(hero, from, hero.level), points } : null;
    }

    /* ── 전투 능력치 (계수는 전부 balance.csv ⚠제안 키) ── */

    /**
     * 기본 능력치 계수 — **축마다 형태가 다르다** (2026-09-13 확정 · hero_design §4-1).
     *   계수 = `mult_base_pct` + 능력치 × `mult_per_point_pct` — 둘 다 **비율**이다(2026-09-17 R111 · ~~`/ 100`~~)
     *   대부분 축은 `1 + 0.01n` 이라 옛 `1 + n × attr_bonus_per_point` 과 같은 값을 낸다.
     *   **건강만 모양이 다르다** — 곱해지는 대상이 HP 레벨업 상승분이라 계수가 1 보다 작은 쪽에서 시작한다.
     *   **민첩은 이 선형을 안 쓴다** — 아래 `speedCoef`(복리 · 2026-10-17). hero_attribute.csv 민첩 행의 두 칸은 `-` 다.
     *   값은 전부 `hero_attribute.csv` 에 있다. 바꿀 때 이 파일이 아니라 CSV 를 고친다.
     */
    const attrCoef = Object.fromEntries(data.stats.map(s => [s.id, {
        base: Number(s.multBasePct ?? 1),
        per: Number(s.multPerPointPct ?? B.attr_bonus_per_point),
    }]));
    const attrMult = (id, v) => {
        const c = attrCoef[id];
        if (!c) throw new Error(`attrMult: 축 '${id}' 가 hero_attribute.csv 에 없다`);
        // 칸이 `-` 인 축(민첩)을 여기로 부르면 NaN 이 조용히 퍼진다 — 던진다
        if (!Number.isFinite(c.base) || !Number.isFinite(c.per)) throw new Error(`attrMult: 축 '${id}' 는 선형 계수가 없다 (hero_attribute.csv mult 칸)`);
        return c.base + (v ?? 0) * c.per;
    };
    /**
     * 민첩의 행동 주기 계수 — **복리** [2026-10-17 사용자 확정 · hero_design §4-1] — `(1 + attr_speed_step_pct) ^ (민첩 − attr_dmg_pivot)`.
     *   피해 계수(`formula.statCoef`)와 기준이 같고 비율은 절반이다 — 민첩 = 모든 직업의 속도 축. ~~`attrMult('agi')` 선형 1 + 0.01n~~ 대체.
     *   기준 아래면 1 보다 작다(주기가 무기 주기보다 길어진다) · 0 에 안 닿는다 · 능력치를 모르면 1 · 몬스터도 같은 길(`battle.makeEnemy`)
     */
    if (!(B.attr_speed_step_pct > 0)) throw new Error(`hero: balance.csv 의 attr_speed_step_pct 가 없거나 0 이하다`);
    // 매력의 받는 상태이상 · 디버프 시간 감소 [2026-10-24 · R346 · battle_design §2-4] — 능력치 상한에서 감소가 1 이상이면 시간이 0 이 돼 면역이 된다
    if (!(B.cha_debuff_dur_step_pct >= 0) || !(B.cha_debuff_dur_step_pct * (B.hero_attr_max - B.attr_dmg_pivot) < 1))
        throw new Error(`hero: balance.csv 의 cha_debuff_dur_step_pct 가 없거나 능력치 상한에서 감소가 100% 이상이다`);
    const speedCoef = v => (Number.isFinite(v) ? Math.pow(1 + B.attr_speed_step_pct, v - B.attr_dmg_pivot) : 1);

    /**
     * 최대 HP 의 레벨 성장 — **10레벨 구간마다 직선** [확정 2026-09-14 사용자 · hero_design §4-1 · battle_design §8 · R84].
     *   레벨 n 으로 오를 때 상승분 = `hero_hp_band{b}_unit` × 건강 계수 · 구간 b = floor((n−1) / `hero_hp_band_levels`) + 1
     *   구간 단위는 **건강 계수 1.0 기준** 상승분이다. HP 는 `power_growth_per_level` 을 **읽지 않는다** —
     *   ~~`hero_hp_base × (R^(N+1) − R²)`~~(R82) 는 곱셈이라 만렙을 늘리는 구간에서 불어났다.
     * `hpUnitSum[level]` = 레벨 1 에서 그 레벨까지 오른 단위의 합. **생성할 때 만렙까지 한 번** 만든다 —
     *   구간 키가 만렙을 못 덮으면 전투 중이 아니라 **여기서** 던진다.
     */
    if (!(B.hero_hp_band_levels > 0)) throw new Error(`hero: balance.csv 의 hero_hp_band_levels 가 없거나 0 이하다`);
    const hpUnitSum = [0, 0];
    for (let n = 2; n <= B.hero_level_cap; n++) {
        const band = Math.floor((n - 1) / B.hero_hp_band_levels) + 1;
        const unit = B[`hero_hp_band${band}_unit`];
        if (typeof unit !== 'number') throw new Error(`hero: balance.csv 에 'hero_hp_band${band}_unit' 이 없다 — 만렙 ${B.hero_level_cap} 까지 HP 구간을 덮어야 한다`);
        hpUnitSum[n] = hpUnitSum[n - 1] + unit;
    }

    /**
     * 기본 능력치 + 장비 + 도감 보너스 + 파티 전술 → 전투 능력치.
     * items = 착용 중 아이템 배열. codex = 도감 Lv4 옵션 `{flat: {stat: v}}` (`state.codexOptions` · 없으면 `{}` — 2026-10-18 · R286 · ~~{atk_pct, hp_pct, dmg_pct} 계열 보정~~).
     * party = 파티 전술의 가산치 `{flat, dr}` (없으면 null) — **파티에 든 영웅에게만** 넘어온다.
     *   판정(어느 칸이 켜졌나 · 이 영웅이 파티인가)은 state.js 가 하고 여기는 받은 값을 합류시키기만 한다.
     *
     * · **무기가 밑수다** (battle_design §9-1, 08-26 개정) — 다른 슬롯의 고정 공격력을 밑수에 더하지 않는다.
     *   `atk_flat` 은 무기 슬롯 접사만 합산하고, `+피해 %` 는 그 밑수 전체를 곱한다.
     *   **공격력은 범위 `{min, max}` 다** [2026-09-14 · R90] — 무기 피해 범위(`formula.weaponDamage` · 무기군 × ilvl × 강화)의 양끝이고 직격마다 전투가 굴린다.
     * · 공격 타입은 직업이 아니라 **무기군**이 정한다 (battle_design §2-1 — 스태프·오브 = magic). 맨손은 physical.
     *   ~~사제의 파워 출처 = 마법 공격력 = 지능~~ 은 09-10 에 깨졌다 — 공격력은 순수 무기 밑수이고 지능은 스킬 계수로 간다 (§9-1).
     * · ~~**원소는 무기 개체가 든다** — 마법 무기군이면 그 무기의 element 가 공격 타입이다~~ → **[폐기 2026-09-11 · 사용자 지시 · R80]**
     *   `attack_type` 은 **언제나 `physical`** 이다 — **평타는 언제나 물리, 원소 피해는 스킬만 낸다** [2026-10-02 · R198 · battle_design §2-1].
     * · **마법 무기는 평타를 치지 않는다** [2026-10-02 · 사용자 확정 · R198 · battle_design §3] — `basic_attack = false` 를 낸다.
     *   차례가 와도 준비된 스킬이 없으면 기다리는 것은 전투(battle.js)의 일이다. 맨손 · 물리 무기는 `true`.
     * · **저항은 소재값이 아니라 직접 %다** (§9-5) — `res_all` + 원소별 접사. 상한은 전투에서 적용된다
     *   (formula.appliedResist) — 여기서는 원값을 그대로 내고, 상한을 뚫는 `res_max_bonus` 를 따로 낸다.
     * · **최대 HP 는 레벨이 키운다** — ~~기하 곡선(§9-0)~~ 이 아니라 **10레벨 구간 직선의 누적합**이다 [2026-09-14 · R84]. 방어는 비율 축이라 레벨을 안 탄다.
 *   **그 성장분만 건강 계수를 탄다** [확정 2026-09-10 · hero_design §4-1] — 레벨 1 은 직업마다다(`class.csv:hp_base` · 2026-10-02 — 아래 `hpBaseOf`) · 몬스터는 `monster_hp_base`.
     * · **피해 감소는 원천별 곱**이라 (§9-3) 접사를 각각 곱해 **실효 %** 한 숫자로 낸다 — 시트에도 그 숫자가 찍힌다.
     * · **운은 전투 계산 밖**이다 — 드랍률·골드 획득에만 계수로 곱한다 (hero_design §4-1).
     *   접사가 0이면 운도 0을 곱한다(곱이다) · 결과는 1% 단위로 자른다(`formula.roundPct` · R111).
     * · **HP 재생만 밑수를 갖는다** [09-07] — 최대 HP 시작값과 같은 분류다(생존의 바닥이지 세기가 아니다).
     */
    function computeCombat(hero, items, codex = {}, party = null) {
        // ⚠ **몬스터도 이 함수를 지난다** [2026-09-11 · R79 · battle_design §8-1 · monster_design §5-1] — `battle.js:makeEnemy` 가
        //   `{stats, level: dlvl, cls, innate}` 모양을 넘긴다. `mastery` 가 없으면 랭크 0 이라 마스터리 몫은 0 이고,
        //   `codex`·`party` 도 안 넘어온다. 몬스터 전용으로 남는 것은 호출한 쪽의 두 줄(몸값 합류 · 전역 배율)뿐이다(~~attack_type 덮기~~ 2026-10-02 폐기 · R198).
        const A = hero.stats;
        const flat = {};                       // 접사 합산 {stat: v}
        const drList = [];                     // 피해 감소는 합치지 않고 원천별로 모은다 (§9-3)
        const ddrList = [];                    // 상태이상 · 디버프 시간 감소도 원천별로 모아 곱한다 (2026-11-13 R465 · battle_design §2-4 — 옛 덧셈 R451)
        const skillTags = {};
        // 무기군 특성 — 든 무기의 무기군 줄을 그 무기 접사 뒤에 이어 읽는다(같은 채널 · 2026-11-11 · R443) · 무기가 없거나 특성이 없으면 빈 줄
        const traitOf = it => (it?.slot === 'weapon' ? weaponTraitLines[it.group] ?? [] : []);
        for (const it of items) {
            if (it.implicit) {
                // 베이스 옵션 「방어력 +%」(`armor_def_pct`)는 **그 아이템 자신의 고유 방어력에만** 곱한다 [2026-09-18 · item_design §1 「갑옷 옵션」 · 네 부위 공통].
                //   고유값은 강화까지 먹은 값으로 온다(부르는 쪽이 `item.effective` 를 지난다) · 다른 부위 · 접사 · 오만의 더하기 값에는 안 곱한다 · 곱한 뒤 정수
                const own = (it.affixes ?? []).reduce((s, a) => s + (a.stat === 'armor_def_pct' ? a.v : 0), 0);
                const v = own ? Math.round(it.implicit.v * (1 + own)) : it.implicit.v;
                flat[it.implicit.stat] = (flat[it.implicit.stat] ?? 0) + v;
            }
            for (const a of [...(it.affixes ?? []), ...traitOf(it)]) {
                if (a.stat === 'skill_tag') {
                    if (a.tag && a.effect && Number.isFinite(a.v)) {
                        const bonuses = skillTags[a.tag] ??= {};
                        bonuses[a.effect] = (bonuses[a.effect] ?? 0) + a.v;
                    }
                    continue;
                }
                // 무기에 붙은 데미지 % 는 괄호에 안 섞는다 — 무기 양끝에만 따로 곱한다(아래 `weaponPct` · 2026-10-03 battle_design §9-1)
                if (it.slot === 'weapon' && a.stat === 'atk_pct') continue;
                // 특정 스킬 +n 은 전투 능력치가 아니라 스킬 레벨이다 — `item.skillPlusOf` → `skill.activesFor` 가 읽는다 (2026-10-08 · R225 · INTERFACE §2-5)
                if (a.stat === 'skill_plus') continue;
                flat[a.stat] = (flat[a.stat] ?? 0) + a.v;
                if (a.stat === 'damage_reduction') drList.push(a.v);
                if (a.stat === 'debuff_dur_reduction') ddrList.push(a.v);   // 장비 줄 하나 = 원천 하나 (R465)
            }
        }
        // 마스터리는 접사와 같은 채널로 합류한다 — 이 줄 아래로는 출처를 구분하지 않는다
        const mb = masteryBonus(hero, items);
        for (const k of Object.keys(mb.flat)) flat[k] = (flat[k] ?? 0) + mb.flat[k];
        for (const x of mb.tags) { const bz = skillTags[x.tag] ??= {}; bz[x.effect] = (bz[x.effect] ?? 0) + x.v; }   // 전직 공통 줄의 태그 칸 (R471)
        for (const v of mb.dr) drList.push(v);
        if (mb.flat.debuff_dur_reduction) ddrList.push(mb.flat.debuff_dur_reduction);   // 마스터리(기사 T2-3) = 원천 하나 (R465)
        // 파티 정산의 제 몫 — 파티 단위 출처(도감 · 전술 · 신단)를 더하기 **전**의 골드 · 드랍 · 매직 [2026-10-05 · INTERFACE §2-6 「파티 골드 · 드랍 · 매직 배율」].
        //   파티 몫은 전원에게 같은 값이라 합산하면 인원수만큼 불어난다 — 전투가 한 번만 더한다(`find_party`)
        const ownFind = { gold: flat.gold_find ?? 0, item: flat.item_find ?? 0, magic: flat.magic_find ?? 0 };
        // 도감 Lv4 옵션도 같은 채널이다 [2026-10-18 · R286 · monster_design §8-2] — 장비 옵션 어휘 그대로 · 피해 감소는 **도감 전체가 원천 하나**(몬스터마다 따로 곱하지 않는다).
        //   골드 · 아이템 · 매직 획득 줄(3장 탐욕 · 2026-10-22 R320)은 계정 몫이라 전원에게 같다 — 위 제 몫이 아니라 `find_party` 로 간다
        const cxFlat = codex.flat ?? {};
        for (const k of Object.keys(cxFlat)) flat[k] = (flat[k] ?? 0) + cxFlat[k];
        if (cxFlat.damage_reduction) drList.push(cxFlat.damage_reduction);
        if (cxFlat.debuff_dur_reduction) ddrList.push(cxFlat.debuff_dur_reduction);
        // 파티 전술도 같은 채널로 합류한다 — 새 곱셈 층을 만들지 않는다 (tactic_card_design §2-4)
        for (const k of Object.keys(party?.flat ?? {})) flat[k] = (flat[k] ?? 0) + party.flat[k];
        for (const v of party?.dr ?? []) drList.push(v);
        if (party?.flat?.debuff_dur_reduction) ddrList.push(party.flat.debuff_dur_reduction);
        const f = id => flat[id] ?? 0;
        // 제 몫 × 운 계수(1% 단위) — 아래 `find_own` 과 탐욕 T3 가 같은 값을 쓴다
        const luckMult = attrMult('luck', A.luck);
        const own = {
            gold: F.roundPct(ownFind.gold * luckMult), item: F.roundPct(ownFind.item * luckMult), magic: F.roundPct(ownFind.magic * luckMult),
        };
        // 탐욕 T3 [2026-10-23 · skill_design §3-3 · R325] — **탐욕 합**(제 몫 골드 획득 + 드랍률 + 매직아이템 획득확률 · 파티 합산 · 체감 전)에 비례해
        //   데미지 % · 체력 % · 쿨감이 오른다. 새 곱셈 층이 아니다 — 같은 칸에 더한다(오만 「레벨당 데미지」와 같은 꼴 · 레벨 대신 탐욕 합).
        //   합은 `[balance.csv:mastery_greed_t3_input_cap]` 에서 자른다 · 노드가 없으면 세 칸이 0 이라 종전과 같은 값이다
        const greed = Math.min(own.gold + own.item + own.magic, B.mastery_greed_t3_input_cap);
        for (const [from, to] of [['atk_pct_per_greed', 'atk_pct'], ['hp_pct_per_greed', 'hp_pct'], ['cdr_per_greed', 'cooldown_reduction']])
            if (f(from)) flat[to] = f(to) + f(from) * greed;
        // 탐욕 T4 ③ 황금 보호막 [2026-11-14] — 라운드 시작 보호막 = 최대 HP × 랭크 값 × 탐욕 합(T3 와 같은 합 · 같은 상한) · 전투가 `adv.greed_barrier` 로 읽는다
        if (f('greed_barrier')) flat.greed_barrier = f('greed_barrier') * greed;

        const weapon = items.find(it => it.slot === 'weapon');
        // 장비 발동은 부위와 무관하게 착용 · 접사 순서대로 보존한다. 능력치 합산 · 액티브 칸과 별개다.
        // 퇴역한 목걸이 item.proc 은 읽지 않는다 — 새 목걸이 베이스는 특정 스킬 +n 이다(R309).
        const procs = { hitProcs: [], castProcs: [], struckProcs: [] };
        const procChannels = {
            proc_hit_attack: 'hitProcs', proc_hit_buff: 'hitProcs',
            proc_cast_attack: 'castProcs', proc_cast_buff: 'castProcs', proc_cast_debuff: 'castProcs',
            proc_struck_buff: 'struckProcs', proc_struck_debuff: 'struckProcs', proc_struck_defense: 'struckProcs',   // 피격 시 방어 스킬(갑옷 나태 ② · R444)
        };
        for (const it of items) for (const a of it.affixes ?? []) {
            const channel = procChannels[a.stat];
            if (channel && typeof a.skill === 'string' && a.skill.length > 0 && Number.isFinite(a.v) && a.v > 0)
                procs[channel].push({ skill: a.skill, chance: Math.min(1, a.v), level: procSkillLevel(a.skillLv) });
        }
        // 무기군 × **계보 배율**(그 무기의 베이스 행 — 주기와 한 방에 같은 배율 · 평타 DPS 불변 · 2026-11-11 · R445). 배율이 1 이면 무기군 그대로다
        const group = weapon ? F.weaponLine(data.weaponGroups[weapon.group] ?? null, weaponBaseById[weapon.baseId] ?? null) : null;
        const magic = group?.damageKind === 'magic';
        // 밑수 = **무기 피해 범위**(양끝 · 무기군 × ilvl × 강화에서 파생 · R90) + 무기 슬롯 접사의 고정 공격력(양끝에 같이). 맨손이면 양끝 모두 unarmed_atk
        //   ⚠ 2026-09-11 R78 부터 새 무기에는 `atk_flat` 이 안 붙는다(최소/최대 피해 보류) — 옛 무기만 든다
        const range = weapon ? F.weaponDamage(weapon.ilvl, group, weapon.up) : { min: B.unarmed_atk, max: B.unarmed_atk };
        const atkFlat = (weapon?.affixes ?? []).reduce((s, a) => s + (a.stat === 'atk_flat' ? a.v : 0), 0);
        // 무기 % = **무기 슬롯 접사의 데미지 %**(베이스 옵션 「무기 데미지 +%」 — 화면 이름 2026-10-15 · ADR-0628) — 무기 양끝에만 곱하고 양끝마다 한 번 반올림한다
        //   [2026-10-03 · 사용자 확정 · battle_design §9-1 — D2 의 무기 ED]. `item.weaponDamageFixed` 와 같은 값이다(툴팁 표기 = 계산)
        //   **무기 밖 출처 「무기 데미지 +%」**(`weapon_atk_pct` — 목걸이 오만 · 2026-11-11 R453)는 베이스 옵션과 **더한다**(⚠제안 — 곱하면 세 층이 곱해진다)
        const weaponPct = (weapon?.affixes ?? []).reduce((s, a) => s + (a.stat === 'atk_pct' ? a.v : 0), 0) + (weapon ? f('weapon_atk_pct') : 0);
        // 데미지 % 괄호 = **무기 % 를 뺀** Σ 데미지 % + **오만 칸의 레벨당 데미지 × 영웅 레벨** [2026-09-11 · R78 · item_design §1 「무기 옵션」]
        //   (~~+ 도감 「데미지」~~ 2026-10-18 계열 보정 폐지 · R286). 조건부 % 는 타격마다 전투가 같은 괄호에 끼운다(formula.strike — 도감 Lv2 상대 피해도 거기다)
        const atkPctSum = f('atk_pct') + f('dmg_per_level_pct') * hero.level;
        // 공격력 = **순수 무기 밑수** [개정 2026-09-10 · battle_design §9-1] — ~~`attrMult(magic ? int : str) ×`~~ 는 걷었다.
        //   힘·지능은 스킬 쪽 **덧셈 항**으로 옮겨갔다(skill.js scaleDef) — 곱이면 무기가 약할 때 능력치까지 죽는다
        //   양끝마다 무기 % 를 곱해 반올림 → 고정 공격력을 더하고 데미지 % 괄호를 곱해 반올림 — 범위 안의 굴림은 전투(formula.strike)가 한다
        //   (R90 · 괄호 하나 2026-09-18 · 무기 % 를 따로 곱한다 2026-10-03)
        //   **색욕 최소 · 최대 데미지 · 오만 레벨당 최대 데미지**(고정 수치)는 무기 % 를 곱한 양끝 **뒤**, 괄호 **앞**에 더한다 — 고정 공격력과 같은 자리다.
        //   최소가 최대를 넘으면 최대 = 최소 + 1 [2026-10-05 · 사용자 확정 · R206 · item_design §1 — D2 방식]. 셋이 0 이면 종전과 같은 값이다
        //   **오만 레벨당 최소 데미지**(무기 오만 ① 의 짝 · 2026-11-11 R442)도 같은 자리 · 레벨당 최대와 같은 반올림
        const lo = Math.round(range.min * (1 + weaponPct)) + atkFlat + f('dmg_min_flat') + Math.round(f('dmg_min_per_level') * hero.level);
        const hi0 = Math.round(range.max * (1 + weaponPct)) + atkFlat + f('dmg_max_flat') + Math.round(f('dmg_max_per_level') * hero.level);
        const hi = lo > hi0 ? lo + 1 : hi0;
        const atk = { min: Math.round(lo * (1 + atkPctSum)), max: Math.round(hi * (1 + atkPctSum)) };

        // 최대 HP — 레벨 1 값은 ~~전 영웅 공통~~ **직업마다**(`class.csv:hp_base` · 2026-10-02)이고 **레벨 성장분만 건강을 탄다** [확정 2026-09-10 · hero_design §4-1].
        //   성장분 = **구간 단위의 누적합**(`hpUnitSum`) × 건강 계수 [확정 2026-09-14 · R84]. 레벨 1 에서 누적합이 0 이라
        //   몬스터 앵커링 기준점(`hero_hp_base`)이 안 흔들린다 (battle_design §8). 레벨업 팝업의 상승분은 hpMax(새)−hpMax(옛) 로 낸다(반올림 정합)
        //   ⚠ 몬스터도 여기를 지난다 — `stage.csv:dlvl` 이 만렙을 넘으면 구간이 없어 던진다
        //   ⚠ **레벨 1 바탕만 몬스터가 따로다** [2026-09-14 사용자 지시 · R91 · monster_design §5] — `battle.js:makeEnemy` 가
        //   `hpBase` 로 `monster_hp_base` 를 넘긴다. 영웅은 안 넘기므로 제 직업의 `class.csv:hp_base`(빈 칸이면 `hero_hp_base`)다. 성장분 · 장비 몫은 같은 식이다
        const units = hpUnitSum[hero.level];
        if (units === undefined) throw new Error(`hero: 레벨 ${hero.level} 은 HP 구간 밖이다(1 ~ 만렙 ${B.hero_level_cap}) — 몬스터면 stage.csv:dlvl 이 만렙을 넘었다`);
        // 방어구 갈래가 고정값을 낸다 [2026-09-16 사용자 확정 · R107 · item_design §1] — ~~갑옷 칸 하나만~~ → **낀 방어구마다 제 갈래 값을 더한다**
        //   [2026-09-18 — 네 부위가 갈래를 갖는다]. **갈래 고정값(공속 · 쿨감) 칸은 2026-11-12 삭제** — 2026-11-11 R446 에 경갑 공속 · 로브 쿨감이 특성 줄로 옮겨 전부 0 이었다.
        //   **네 부위 갈래 특성은 아이템의 `[베이스]` 줄이다**(굴림 · 2026-10-21 R303 — ~~갈래 값 `hpPct` · `castSpeedPct` 합산~~ R299 퇴역) — 아래 접사 합산이 그대로 읽는다.
        //   갈래 id 가 부위마다 겹쳐(`leather`) 부위와 함께 찾는다. 무기의 `group`(무기군)은 `weapon` 칸이라 여기 안 걸린다

        // 투구 오만 「레벨당 체력」은 **더하기**다 — 영웅 레벨 × 값이 체력 flat 과 같은 자리에 든다 [2026-09-17 · item_design §1 「투구 옵션」]
        const hpMax = Math.round(
            ((hero.hpBase ?? hpBaseOf(hero.cls)) + units * attrMult('vit', A.vit) + f('hp_flat') + f('hp_per_level') * hero.level)
            * (1 + f('hp_pct')));   // ~~× (1 + 도감 「체력」)~~ 2026-10-18 계열 보정 폐지 — 도감 Lv4 의 `hp_pct` 는 위 Σ 에 든다 (R286)
        // 신발 오만 「레벨당 공격 속도」 — 영웅 레벨 × 값이 공속 합에 더해진다 [2026-09-18 · item_design §1 신발 행] (합산은 더하기 — 원천별 곱 여부는 GAME_DESIGN §10)
        // **공격 속도와 캐스팅 속도는 별개 옵션이다** [2026-10-03 · 사용자 · R203 · battle_design §2] — 마법 무기는 `cast_speed_pct` 만, 물리 무기 · 맨손은 공격 속도 계열만
        //   주기를 줄인다. 민첩 계수는 둘 다(능력치) · 버프 · 상태이상의 주기 창은 battle 이 따로 건다. 원천 배분의 나머지는 GAME_DESIGN §10 「캐스팅 속도의 원천」
        //   마법 무기 오만 ② 「레벨당 캐스팅 속도」 — 영웅 레벨 × 값이 캐스팅 속도에 더해진다 [2026-10-05 · R208 · item_design §1 「마법사 · 사제 무기」]
        //   장갑 가죽 특성(공격 속도 / 캐스팅 속도 — 줄)도 같은 규칙이다 · 갑옷군 공속은 물리 무기 · 맨손만 (R303)
        const speed = magic ? f('cast_speed_pct') + f('cast_speed_per_level_pct') * hero.level : f('aspd_pct') + f('aspd_per_level_pct') * hero.level;
        // 공속은 「몇 % 더 치나」 [2026-10-29 · R386 · battle_design §2] — 주기 = 원값 ÷ (1 + 공속 합) · 바닥 [balance.csv:period_floor_sec].
        //   ~~× (1 − 공속 합) · 하한 0.4 상수~~ 대체 — 합이 1 에 가까워질수록 몇 %p 가 공격 수를 폭증시켰다. 원값 · 공속 합 · 무기 주기는 전투가 버프와 한 합으로 다시 쓴다(`period_raw` · `speed_pct` · `period_weapon`)
        //   **공격 속도 −n초**(궁수 직업 T1-2 · `period_minus_sec` · 2026-11-09 R432) — **든 무기의 공격 속도(초)에서 먼저 뺀다** · 물리 무기 · 맨손만 · 바닥 [balance.csv:period_floor_sec]
        const weaponPeriod = Math.max(B.period_floor_sec, (group ? group.period : B.unarmed_period) - (magic ? 0 : f('period_minus_sec')));
        const periodRaw = weaponPeriod / speedCoef(A?.agi);
        const period = Math.max(B.period_floor_sec, periodRaw / (1 + speed));

        // 신발 오만 「레벨당 모든 원소 저항」 — 영웅 레벨 × 값이 모든 원소 저항에 더해진다 [2026-10-21 · R303 · item_design §1 「10-21 방어구 개정」]
        const resAll = f('res_all') + f('res_all_per_level') * hero.level;
        // 무기 옵션이 여는 축 한 묶음 [2026-09-11 · R78 · item_design §1 「무기 옵션」] — **전투 능력치가 아니다**(combat_stat 행 없음 · 시트에 안 선다).
        //   소비자는 battle.js 뿐이다(조건부 % · 타격 시 창 · 강타 · 매직아이템 획득확률). 전부 0 이면 null 이라 전투가 한 번도 안 읽는다
        const fx = {
            ...(Object.keys(skillTags).length ? { skillTags } : {}),
            ...Object.fromEntries(Object.entries(procs).filter(([, rows]) => rows.length)),
            vs: { normal: f('vs_normal_dmg'), demon: f('vs_demon_dmg'), undead: f('vs_undead_dmg') },
            vsElite: f('vs_elite_dmg'), vsFront: f('vs_front_dmg'), vsBack: f('vs_back_dmg'),
            ele: Object.fromEntries(ELEMENTS.map(e => [e, f(`${e}_dmg_pct`)])),
            defDown: f('def_down_pct'), resDown: f('res_down_pct'),
            atkDownPhys: f('atk_down_phys_pct'), atkDownMag: f('atk_down_mag_pct'),
            crush: f('crushing_blow_pct'),
            // 운 계수는 드랍률 · 골드와 같은 취급이다 (⚠제안 — item_design §1 「무기 옵션」)
            magicFind: F.roundPct(f('magic_find') * luckMult),
            // ── 방어구 옵션이 여는 축 [2026-09-18 · item_design §1 「갑옷 옵션」 · 「투구 옵션」 · 신발 행] — 소비자는 battle.js(경험치만 state.js)
            //   받는 피해 감소 — **때린 쪽**의 종족 · 등급 · 열이 조건이다. 셋은 더한 뒤 한 원천으로 곱한다(battle.strikeOnce)
            vsDr: { normal: f('vs_normal_dr'), demon: f('vs_demon_dr'), undead: f('vs_undead_dr') },
            vsEliteDr: f('vs_elite_dr'), vsFrontDr: f('vs_front_dr'), vsBackDr: f('vs_back_dr'),
            drFlat: f('dr_flat'),                // 절대값 피해 감소 — 모든 감소 뒤에 뺀다(formula.strike)
            counter: f('counter_chance'),        // 반격 확률 — 맞으면 때린 적에게 덤 기본 공격 1회 · 차례는 안 쓴다 · 반격을 부르지 않는다(battle.strikeOnce · 2026-11-02 R426)
            recv: f('hp_recovery_pct'),          // 체력 회복 +% — 재생 · 회복 스킬 · 흡혈 · 물약 · 처치 시 회복에 곱한다(보호막 제외)
            killHeal: f('kill_heal_pct'),        // 처치 시 체력 회복 — 처치마다 제 최대 HP × 값(battle.killHeal · 투구 · 장갑 색욕 ① · 2026-10-21 R299)
            startGauge: f('start_gauge_pct'),    // 전투 시작 시 행동 게이지 +% — 빈 게이지를 그만큼 채운 채 세운다 · 원정은 라운드마다(battle.primeGauge · 가죽 신발 특성 · R303)
            cullNormal: f('cull_normal_pct'),    // 일반몹 처형 — 직격 뒤 등급 「일반」 몬스터의 체력이 최대 HP × 값 이하면 쓰러뜨린다(battle.strikeOnce · 장갑 폭식 ② · R303)
            xpGain: f('xp_gain_pct'),            // 경험치 획득 — **본인 몫**(state.advanceRun)
            // 상태이상 시간 감소 — **받는 쪽** 값(신발 · 반지 · 목걸이 공통옵션 · 2026-09-21 · R127). 결빙 · 중독 · 화상 · 스턴이 읽는다
            //   (battle.makeUnit → `rt.applyStatus` · 2026-09-28 · R177 · R178 · battle_design §2-4 ~ §2-7)
            freezeDur: f('freeze_dur_reduction'), poisonDur: f('poison_dur_reduction'),
            burnDur: f('burn_dur_reduction'), stunDur: f('stun_dur_reduction'),
            // 버프 지속시간 +% — **낀 영웅이 거는 버프 창**이 길어진다(적에게 거는 창 포함 · skill_runtime.castBuff) [2026-09-21 · 반지 · 목걸이 공통옵션 · R127]
            buffDur: f('buff_dur_pct'),
            // 명중률 — 적중률에 **(1 + 명중률)로 곱한다**(formula.hitChance) [2026-09-22 · 궁수 T1-3 · R138 · 곱 2026-10-06 R219 · battle_design §9-4 — ~~레벨 차 적중률에 더한다~~].
            //   08-26 에 폐지된 명중(`accuracy` — 회피와 짝)과 다른 축이라 id 를 따로 둔다
            hitBonus: f('hit_bonus'),
            // ── 죄종 계열 옵션이 여는 축 [2026-10-05 · R206 · R208 · item_design §1 「무기 옵션 — 죄종 계열」 · 「마법사 · 사제 무기」] — 소비자는 battle.js · skill_runtime
            // 원소 저항 감소 겹 — 원소마다 겹 하나의 값(마법 무기 시기 · 그 무기의 원소 · 2026-11-11 R442) · 대상의 그 원소 한 줄에 쌓인다(skill_effects.weaponOnHit · 최대 겹은 방어력 겹과 같은 키)
            resStack: Object.fromEntries(ELEMENTS.map(e => [e, f(`res_down_stack_${e}`)])),
            resStackAll: f('res_down_stack_pct'),   // 그 타격의 원소에 쌓는 겹(목걸이 시기 ③ · 2026-11-11 R453) — 원소별 값과 더한다
            defStack: f('def_down_stack_pct'),    // 방어력 감소 겹 하나의 값 — 대상 한 줄에 겹쳐 쌓인다(skill_effects.weaponOnHit · 상한 없음 — 2026-11-12 사용자)
            staggerDur: f('stagger_dur_pct'),     // 내가 건 경직 +% (battle.stagger)
            castRefund: f('cast_refund_chance'),  // 시전 시 칸 하나를 돌려받을 확률 (battle.chargeTick — rng 1회 · 옵션이 있을 때만)
            castStack: f('cast_stack_pct'),       // 시전 누적 겹 하나의 데미지 % — 라운드 동안 (battle.chargeTick · 최대 겹 [balance.csv:cast_stack_max])
            statusDur: f('status_dur_pct'),       // 내가 건 상태이상 +% (skill_runtime.applyStatus)
            debuffDur: f('debuff_dur_pct'),       // 내가 적에게 건 상태이상 아닌 창 +% (skill_runtime.applyStatus)
            healOut: f('heal_out_pct'),           // 내가 거는 회복 스킬 +% — 받는 쪽 체력 회복 +% 와 곱(⚠제안 · skill_runtime.castHeal)
            // 물약 효과 상승 — **낀 영웅이 마시는 물약의 수치**(반지 분노 ③ · 2026-10-29 R382 · battle_design §7-1). 체력 물약은 체력 회복 +% 와 한 괄호(battle.drinkPotions)
            potion: f('potion_effect_pct'),
            // 쿨타임 −n초(마법사 · 사제 직업 T1-2 · 2026-11-09 R432) — 표기 쿨에서 먼저 빼고 쿨감 % 를 곱한다 · 바닥은 표기 쿨 × skill_cd_floor_mult(`skill_runtime.cooldownSec`) · 시트 능력치가 아니다
            coolMinus: f('cool_minus_sec'),
        };
        const anyFx = Object.values(procs).some(rows => rows.length) || Object.keys(skillTags).length > 0 || [...Object.values(fx.vs), ...Object.values(fx.ele), fx.vsElite, fx.vsFront, fx.vsBack,
            fx.defDown, fx.resDown, fx.atkDownPhys, fx.atkDownMag, fx.crush, fx.magicFind,
            ...Object.values(fx.vsDr), fx.vsEliteDr, fx.vsFrontDr, fx.vsBackDr, fx.drFlat, fx.counter, fx.recv, fx.killHeal, fx.startGauge, fx.cullNormal, fx.xpGain,
            fx.freezeDur, fx.poisonDur, fx.burnDur, fx.stunDur, fx.buffDur, fx.hitBonus,
            fx.defStack, ...Object.values(fx.resStack), fx.resStackAll, fx.staggerDur, fx.castRefund, fx.castStack, fx.statusDur, fx.debuffDur, fx.healOut, fx.potion, fx.coolMinus].some(v => v !== 0);
        return {
            [magic ? 'atk_magic' : 'atk_physical']: atk,
            // **평타는 언제나 물리다** [2026-10-02 · 사용자 확정 · R198 · battle_design §2-1 — ~~원소 옵션이 없는 마법 무기의 기본 공격은 물리~~(09-11 · R80) 대체].
            //   마법 무기는 평타가 없으므로(아래 `basic_attack`) 마법 무기의 세기 채널(`atk_magic`)은 **스킬 · 회복의 밑수**로만 쓰이고,
            //   원소 피해는 스킬의 원소 태그만 낸다. 평타에 원소를 얹는 것은 **평타 부여 스킬**(인챈트 계열)의 몫이다.
            //   몬스터도 같다 — ~~스테이지 원소로 덮는다(`monster.csv:attack_type`)~~ 는 2026-10-02 컬럼째 폐기
            attack_type: 'physical',
            // 평타를 치나 [2026-10-02 · R198 · battle_design §3] — 마법 무기는 안 친다(차례에 준비된 스킬이 없으면 기다린다 · battle.js).
            //   **`combat_stat.csv` 행이 아니다**(시트에 안 선다) · 몬스터도 같은 값을 쓴다
            basic_attack: !magic,
            level: hero.level,                 // 적중률의 공격자 레벨 (§9-4)
            hp_max: hpMax,
            // 갑옷 오만 「레벨당 방어력」은 **더하기**다 — 영웅 레벨 × 값 [2026-09-16 · item_design §1 「갑옷 옵션」]. 베이스 옵션 % 는 위 아이템 루프에서 고유값에만 곱했다
            defense: f('def_flat') + f('def_per_level') * hero.level,
            ...Object.fromEntries(ELEMENTS.map(e => [`res_${e}`, resAll + f(`res_${e}`)])),
            res_max_bonus: f('res_max_bonus'),  // 저항 기본 상한을 뚫는 유일한 수단 (§9-5)
            // 원소별 최대 저항 증가 [2026-09-18 · 투구 시기 칸] — 그 원소의 상한에만 더한다. 시트 행이 아니라 저항 행의 상한 표기와 전투가 읽는다
            res_max_el: Object.fromEntries(ELEMENTS.map(e => [e, f(`res_max_${e}`)])),
            res_reduction: f('res_reduction'),  // 상대 저항을 비율만큼 깎는다 — 관통이 아니라 음수 가산
            // 원소별 저항 무시 [2026-09-21 · 반지 시기 칸 · R127] — **그 원소의 타격에만** `res_reduction` 위에 더한다(formula.strike). 시트 행이 아니다(`res_max_el` 과 같은 자리)
            res_reduction_el: Object.fromEntries(ELEMENTS.map(e => [e, f(`res_reduction_${e}`)])),
            def_ignore: f('def_ignore'),
            reflect_damage: f('reflect_damage'),
            // 원천별 곱의 실효값(비율) — 옛 %(소수 3자리)와 같은 정밀도라 5자리다
            damage_reduction: Number((1 - F.reductionMult(drList)).toFixed(5)),
            crit_rate: B.base_crit_pct + f('crit_rate'),
            // 치명타 피해 = 1 + (바탕 + 접사 · 마스터리 · 전술 − 1) × **운 계수** [2026-09-25 사용자 — C안 · battle_design §9-2] — **치명 보너스 몫에만** 곱한다.
            //   운이 기준(10)이면 바탕 그대로 · 계수는 평타 · 스킬과 같은 `formula.statCoef`(복리)라 보너스가 0 이 안 된다(치명이 평소 타격보다 약해지지 않는다).
            //   ~~D안(전체에 곱함 · 하한 1)~~ 은 같은 날 대체 · 몬스터도 같은 길을 지난다(makeEnemy — 특수 분기 없음). 시트가 이 값을 그대로 보여 준다
            crit_damage: Number((1 + (B.base_crit_damage_pct + f('crit_damage') - 1) * F.statCoef(A.luck)).toFixed(4)),
            life_steal: f('life_steal'),
            // 초당 회복 — 행동 주기와 무관한 실시간 (battle.js 가 틱마다 누산).
            // **밑수를 갖는 유일한 축**이다 [확정 2026-09-07 · battle_design §8] — 「장비가 0이면 능력치도 0」의 예외로,
            // 전 영웅이 레벨 곡선 밑수를 갖고(성장 축 = hero_hp_base 와 같은 기하) 그 위에 접사·마스터리가 얹힌다.
            // 밑수는 세기가 아니라 생존의 바닥이라 능력치와 무관하게 존재한다. ~~마지막에 건강 계수를 곱한다~~ 는
            // **2026-09-10 폐기** — 건강은 HP 성장분으로 옮겨갔다 (hero_design §4-1 · DEV_PLAN R72).
            hp_regen: Number(
                (B.hp_regen_base_per_level * F.growthMult(hero.level) + f('hp_regen'))
                    .toFixed(3)),
            cooldown_reduction: f('cooldown_reduction'),    // 표기 쿨을 줄인다 — 시전 시점에 곱한다 (battle.js) · 로브 특성 줄(R446 — ~~갈래 고정값~~ 2026-11-12 칸 삭제) · 투구 나태 ②(2026-10-21 R299 — ~~티아라 공통옵션~~)가 여기 얹힌다
            // 타격 회복 — 물리 경직 시간을 줄인다 (battle_design §2-3 · R110 · battle.js stagger). **비율**이다(0.5 = 50% · R111 단위 규약).
            //   출처는 갑옷 분노 칸(2026-09-18 — 첫 출처) · ⚠ 상한은 기획 미정(GAME_DESIGN §10)
            fhr: f('fhr'),
            // 상태이상 · 디버프 시간 감소(받는 쪽 · 비율) [2026-10-24 사용자 · R346 · battle_design §2-4 「털어내는 능력치」] — **매력이 낸다**:
            //   1점당 `cha_debuff_dur_step_pct` × (매력 − 기준) · 기준에서 0 · 낮으면 음수(길어진다) · 능력치를 모르면 0 · 몬스터도 같은 길(`battle.makeEnemy`)
            //   **출처마다 곱한다** [2026-11-13 사용자 「곱연산으로 수정해 합말고」 · R465 — 옛 덧셈 R451] — 1 − (1 − 매력 몫) × Π(1 − 장비 줄 · 마스터리 · 도감 · 전술) ·
            //   출처가 하나면 종전과 같은 값 · 합쳐도 1 에 닿지 않는다(면역 없음) · 원소별 시간 감소와는 곱 그대로
            debuff_dur_reduction: Number((1 - F.reductionMult([Number.isFinite(A?.cha) ? B.cha_debuff_dur_step_pct * (A.cha - B.attr_dmg_pivot) : 0, ...ddrList])).toFixed(4)),
            action_period: Number(period.toFixed(3)),
            // 주기의 재료 [2026-10-29 · R386 · INTERFACE §2-3] — **`combat_stat.csv` 행이 아니다**(시트에 안 선다). 전투가 버프 공속을 같은 합에 넣어 다시 쓴다:
            //   `period_raw` = 무기 주기 ÷ 민첩 계수 · `speed_pct` = 장비 · 마스터리 공속 합(마법 무기는 캐스팅 속도) · `period_weapon` = 무기 주기(고정 창 — 퀵 드로우 · 오버드로우)
            period_raw: periodRaw, speed_pct: speed, period_weapon: weaponPeriod,
            // 피해량 — 데미지 % 괄호와 합치지 않고 전투가 따로 곱한다 (2026-09-18 · battle_design §9-2). **지금 출처가 없어 언제나 0** —
            //   하나뿐이던 도감 「피해량」이 2026-10-18 계열 보정 폐지로 나갔다(R286 · 칸만 남았다 — DEV_PLAN §4 부채)
            dmg_bonus_pct: 0,
            // 평타 능력치 계수 [2026-09-18 · 사용자 확정 · battle_design §9-2] — **힘**의 `formula.statCoef`.
            //   ~~마법 무기 = 지능~~(2026-09-27) 은 2026-10-02 소멸 — 마법 무기는 평타가 없다(R198). 물리 무기 · 맨손 = 힘 [2026-09-27 — ~~직업 메인 스탯~~ 대체].
            //   능력치를 모르면 1. **`combat_stat.csv` 행이 아니다**(시트에 안 선다) · 몬스터도 같은 값을 쓴다(2026-09-22)
            main_attr_mult: F.statCoef(A?.str),
            gold_find: F.roundPct(f('gold_find') * luckMult),
            item_find: F.roundPct(f('item_find') * luckMult),
            // 파티 정산의 재료 [2026-10-05 · ~~파티 평균~~ → 합산 + 체감 · INTERFACE §2-4] — 위 둘은 표시값(파티 몫까지 더한 값)이다.
            //   `find_own` = 제 몫 × 운 계수(1% 단위) · `find_party` = 파티 단위 출처의 원값(운 계수 안 탄다 · 셋 다 0 이면 null). **`combat_stat.csv` 행이 아니다**
            find_own: own,
            find_party: (() => {
                const p = party?.flat ?? {};
                const v = { gold: (p.gold_find ?? 0) + (cxFlat.gold_find ?? 0), item: (p.item_find ?? 0) + (cxFlat.item_find ?? 0), magic: (p.magic_find ?? 0) + (cxFlat.magic_find ?? 0) };
                return v.gold || v.item || v.magic ? v : null;
            })(),
            // 죄종 T2 조건부 줄 [2026-10-05 · skill_design §3-2 · INTERFACE §2-4] — 전투가 타격마다 판정한다. 치명 피해 줄은 **치명 보너스 몫과 같은 운 계수**를 먹여 낸다
            //   (위 `crit_damage` 의 C안). **`combat_stat.csv` 행이 아니다**(시트에 안 선다) · 비면 null
            mastery_cond: mb.cond.length
                ? mb.cond.map(c => c.stat === 'crit_damage' ? { ...c, v: c.v * F.statCoef(A?.luck) } : { ...c })
                : null,
            // Σ 상시 피해(비율) — 이미 atk 에 곱해져 있지만, 전투 중 버프가 **같은 괄호에 덧셈**으로 들어가려면
            // (battle_design §9-2 "괄호는 둘뿐") 그 괄호 안의 합을 따로 알아야 한다 (battle.js atkBase/atkPct)
            atk_pct_sum: atkPctSum,
            option_fx: anyFx ? fx : null,
            // 전직 공통 줄의 새 능력치 [2026-11-13 · R471 · INTERFACE §2-6 「전직 트리 장치」] — **`combat_stat.csv` 행이 아니다**(시트에 안 선다) · 0 인 키는 빠진다 · 다 0 이면 null ·
            //   전투가 `u.adv` 로 든다(battle.makeUnit) — 읽는 자리는 키마다 하나(battle.js)
            advance_fx: (() => { const o = Object.fromEntries(ADV_KEYS.map(k => [k, f(k)]).filter(([, v]) => v)); return Object.keys(o).length ? o : null; })(),
            // 죄종 T4 의 조건 [2026-11-14 · skill_design §3-3 「죄종 T4」] — 그 죄종 T3 조건 · 문턱은 T3 칸 중 가장 높은 랭크(없으면 1랭크)가 연 값 · 죄종 T4 를 안 찍었으면 null
            t4_cond: t4CondOf(hero),
        };
    }

    return {
        rollAttributes, rollAttributesTrace, attrCenters, rollTier, rollInnate, rollFace, rollHero, rollStartParty, rollCandidates, avoidNames, rollHeroOf, rollGoblin, xpNeeded, starXpNeeded, grantXp, computeCombat,
        masteryNodes, masteryById, masteryNodesFor, masteryBonus, masteryWiden, masteryRowKey, masteryRowUsed, masteryPickOneBlocked, gateOn, sinGearCount, levelScaled,
        weaponTrait: groupId => (weaponTraitLines[groupId] ?? []).map(l => ({ ...l })),   // 무기군 특성 줄 — 전투 합산과 같은 모양(사본 · R443)
        classIds: data.classes.map(c => c.id),   // 「직업 순」 = `class.csv` 행 순서 — 책 정렬(`game.sortBooks`)이 읽는다 (2026-10-14 · ADR-0620)
        mainClasses: mainClasses.slice(),        // 본편 직업 — 결투장 등급 상대가 직업 셋을 여기서 뽑는다 (INTERFACE §2-17 · 2026-10-17)
        // 새 게임 첫 진형의 랭크 · 첫 파티 앞줄 보장의 기준 (위 `startRankOf` · INTERFACE §2-4)
        startRankOf,
    };
}
