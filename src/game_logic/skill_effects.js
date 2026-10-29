/**
 * 스킬 「종류」 등록표 — 나가는 방식 · 사건 · 하는 일 · 대상(공격 · 고르기) · 걸린 효과 · 능력치 파생 · 발동 조건. **어휘와 실행이 같은 표**에 산다.
 *
 * 순수 모듈 — DOM·저장소·시계·Math.random 접근 없음. **상태를 들지 않는다**(모듈 전역 가변 없음).
 *   난수가 필요한 항목은 런타임(`rt.rng`)을 인자로 받는다 — 이 파일이 시드를 만들지 않는다.
 *
 * **정의는 CSV · 종류는 코드** (skill_architecture_survey §8) — 스킬 표 셋(`skill.csv` · `skill_effect.csv` · `skill_status.csv` · 2026-09-22)이 값을 들고,
 *   그 값이 어느 종류인지는 여기 표의 **키**가 정한다. 종류 하나 = 여기 등록 한 번:
 *   어휘 배열을 따로 두면 표와 배열이 반드시 어긋나므로 **표의 키가 곧 어휘다**.
 *
 * **표준 모양** [2026-09-24 · R151 · PLAN_skill_structure 2단계] — 스킬(WoW Spell) → 하는 일 줄(SpellEffect — 줄마다 `EFFECT_TYPES` 하나 + 대상 하나)
 *   → 걸린 효과(Aura / Dota modifier — `EFFECTS` 하나). 대상은 **공격 대상**(누구를 · 몇 번 · 어떤 배율 — 굴림이 든다)과
 *   **고르는 대상**(고르기만 — 결정론) 두 표이고, 능력치 창은 **능력치마다 한 곳에서 모아** 파생한다(GAS attribute aggregator).
 *   스킬 id 전용 실행 코드는 **없다** — 전용 스크립트 탈출구를 두지 않는다(사용자 09-24).
 *
 * skill_design.md / battle_design.md 확정 규칙:
 *   · 공격 대상 4종(skill_design §9-3) — 단일 다단 · 광역 전원 · 순환 · 연쇄 감쇠.
 *     시작점을 굴리는 둘(순환·연쇄)은 rng 를 **정확히 1회** 쓴다 — 발화 순서가 곧 계약이다 (INTERFACE §5-2)
 *   · **스킬 타격은 능력치 계수·추가 피해를 싣는다** (skill_design §13 · 2026-09-10 · 계수 곱 2026-09-18) — 핸들러가 받는 `def` 는 `scaleDef` 가 낸
 *     **시전 단위**(`hit` 줄 하나 — 스킬 id · 대상 · 실효값 · 2026-09-22)이고 타격마다 `{statMult, procChance, procMult}` 를 `rt.strikeOnce` 에 넘긴다. 광역(`enemy_all`)은 `decay` 가 있으면 **주 대상 밖**이 약해진다
 *   · 버프 창(battle_design §7) — 중첩 없음. 같은 stat 의 서로 다른 창은 **덧셈**이고 파생값을 다시 쓴다
 *     예외 하나 — 받는 피해 감소(`dr_pct`)는 **창마다 곱**한다(원천별 곱 · battle_design §9-3 · 2026-09-22)
 *   · `atk_pct` 는 새 곱셈 층이 아니라 **데미지 % 괄호에 덧셈**이다 (battle_design §9-1 · 괄호 하나 2026-09-18).
 *     회복 밑수(`matkMin`·`matkMax`)도 같은 괄호를 탄다 — 공격 창이 회복만 비껴가면 같은 괄호가 아니다 · 범위 양끝마다 (R90)
 *   · `period_pct` 는 **다음 차례 예약부터** 걸린다 — 이미 잡힌 `next` 는 건드리지 않는다 (INTERFACE §2-6)
 *   · 발동 조건(skill_design §9-3) — 거짓이면 **준비된 것으로 치지 않는다**(쿨은 그대로, 그 차례엔 다른 것이 나간다)
 *   · **배율 · 감쇠 · 효과값 · 조건값은 비율이다** [2026-09-17 · R111] — 310% = `3.1` · 25% = `0.25`. 여기서 `/ 100` 을 하지 않는다
 *
 * ⚠ 아직 미확정이라 이 파일이 임시로 두는 것:
 *   `taunt` 는 파생값이 없는 **표식**이다 — 소비자가 battle.js 의 타겟팅(도발자 고정)이라
 *     여기서 할 일이 없다. 기본 타겟팅이 확정되면 그 임시 규칙과 함께 다시 본다 (skill_design §7).
 *   다단타·순환 중 대상이 쓰러지면 남은 타수를 **버린다**(재지정 없음) — 재지정 규칙 미확정.
 */

import { reductionMult } from './formula.js';

/**
 * 나가는 방식 — 이 표의 키가 곧 `skill.csv:cast` 어휘다 [2026-09-22 · R136 · 표 2026-09-24 R151 — ~~`['turn','aura','event']` 배열~~].
 *   `picked` — 차례에 고르나. 거짓이면 `skill.castable` 이 조건과 무관하게 거짓이다(발동 선택 `skill.pickReady` 가 안 고른다)
 *   `cooled` — `cool_sec > 0` 이어야 하나(거짓이면 0 이어야 한다 — 로드 검사)
 *   `turn`  — 차례가 와서 쓴다
 *   `aura`  — 쿨 없이 상시 · 한 번에 하나 · **행동을 안 먹는다** (skill_design §1-5). 액티브 칸에서 빠져
 *             전투 시작에 `until: Infinity` 창으로 걸린다 — 켜는 주체는 battle.js 다
 *   `event` — 차례가 아니라 **사건이 부른다**(`EVENT_TRIGGERS` · 사망 폭발 §9-6 · 2026-09-21 · §12-9). `cast_condition` 이 그 사건이다
 *   `channel` — **정신 집중** [2026-10-22 · R318 · battle_design §3-2] — 차례에 고르고, 열리면 `hit` 줄 타수만큼 **차례마다 한 방**을 친다(`chan`).
 *             그동안 게이지가 안 찬다 · 기본 공격 · 다른 스킬은 기다린다 · 쿨은 마지막 방 뒤부터 — 여닫는 것은 skill_runtime(`chanOpen` · `chanClose`)이다
 */
export const CASTS = {
    turn: { picked: true, cooled: true },
    aura: { picked: false, cooled: false },
    event: { picked: false, cooled: false },
    channel: { picked: true, cooled: true, chan: 'turn' },
    // 계속 닳기 [2026-10-22 · 사용자 「도트딜로」 · 「직격」 · 간격 「0.5초마다」] — 같은 정신 집중이고 방이 [balance.csv:channel_tick_sec] 마다다(타수 = 틱 수 · 배율 = 한 틱 몫 · 중독 틱과 따로)
    channel_tick: { picked: true, cooled: true, chan: 'tick' },
    // 모으기 [2026-10-26 · R357 · 사용자 「기모아서 마지막에 한발」 · 초 시계 R358 「그냥 n초로해」] — 계속 닳기와 같은 초 시계인데 **방이 둘**(여는 순간 · 쏘는 순간)이고
    //   **마지막 방에만 친다**(`burst`) · 그 사이 = 그 스킬의 `charge_sec`(공속과 상관없다 · 스킬마다 — 2026-10-28 R371) · `hit` 줄은 한 발(타수 1 — 로드 검사)
    channel_charge: { picked: true, cooled: true, chan: 'tick', burst: true },
};
export const CAST_IDS = Object.keys(CASTS);

/**
 * 사건 — 이 표의 키가 곧 `event` 스킬의 `cast_condition` 어휘다 [2026-09-24 · R151 — ~~`CONDITIONS.on_death` 「늘 거짓」 자물쇠~~].
 *   `once` — 한 유닛 한 번(`u.fired` · 되살아나도 안 풀린다 — 보상 `rewarded` 와 같은 규칙).
 *   쏘는 자리는 사건을 아는 쪽이다 — `on_death` = battle.js `downed` 끝의 `rt.fire` (INTERFACE §2-6 자폭 행)
 */
export const EVENT_TRIGGERS = {
    on_death: { once: true },
};
export const EVENT_IDS = Object.keys(EVENT_TRIGGERS);

/**
 * 스킬 타격이 `strike` 에 싣는 넷 — 능력치 계수 · 추가 피해 확률 · 배수 (battle_design §9-2 · 2026-09-10 · 계수 곱 2026-09-18) ·
 *   **맞은 대상에게 거는 걸린 효과**(`onHit` — 결빙 · 2026-09-28 R177 · battle_design §2-4 — 적중하면 `battle.strikeOnce` 가 `rt.applyStatus` 로 건다).
 * `def` 가 `scaleDef` 를 안 지난 원시 정의여도 `statMult` 는 1 로 읽는다. 기본 공격은 이것을 안 만든다(메인 스탯 계수를 쓴다 · 결빙도 안 건다)
 */
const skillHit = def => ({ statMult: def.statMult ?? 1, procChance: def.procChance ?? 0, procMult: def.procMult ?? 0, onHit: def.onHit ?? null, spread: SPREAD.has(def.target) });

/**
 * **여럿을 치는 공격 대상** [2026-10-29 · R380 · skill_design §12-9 스웜] — 이 대상의 타격은 `spread` 를 싣고, 맞는 쪽이 파리 떼(`swarm`)면
 *   **산 파리마다** 그 피해를 받는다(단일 · 순환 · 최고 방어 · HP 최대는 한 마리) — battle.js `swarmTake`. 파리 떼가 없으면 아무 뜻이 없다
 */
const SPREAD = new Set(['enemy_all', 'enemy_chain', 'enemy_front', 'enemy_back']);

/**
 * 전열만 남긴다 — battle.js `frontOf` 와 같은 규칙(랭크가 없으면 전열 · 전열 생존자가 없으면 받은 목록 그대로).
 * **「모두」·「후열」을 밝히지 않은 스킬은 전열부터다** [사용자 지시 2026-10-03 · battle_design §3-1] —
 *   순환 · 최고 방어 · HP 최대는 이 모집단 안에서 고르고, 연쇄는 전원을 돌되 전열을 먼저 돈다. 고르는 기준만 좁아져 rng 소비는 그대로다
 */
const frontOf = foes => {
    const front = foes.filter(f => (f.rank ?? 0) === 0);
    return front.length ? front : foes;
};

/**
 * **공격 대상** 8종(열 전원 둘 2026-10-16 · HP 최대 2026-10-26) —각 함수가 「누구를 몇 번 어떤 배율로」만 정하고, 타격 자체는 `rt.strikeOnce` 가 한다.
 * **돌려주는 값 = 기준 대상** [2026-10-22 · R317 · battle_design §3] — 그 스킬 뒤 기본 공격이 칠 적(`skill_runtime.act`). 맞기 전에 정한 적이라
 *   스킬에 쓰러져도 바뀌지 않는다(그러면 그 차례 기본 공격은 버려진다) · 고르는 데 rng 를 더 쓰지 않는다
 * @param rt   skill_runtime 이 만든 런타임 — `rng` · `strikeOnce` · `pickTarget` 을 쓴다
 * @param u    시전자 · @param def 시전 단위(`skill.scaleDef` 가 낸 `hit` 줄 — 스킬 id · 실효값) · @param foes **생존** 적 배열(호출자가 걸러 준다)
 */
export const ATTACK_TARGETS = {
    /**
     * 단일 다단 — 대상을 한 번 고르고 `hits` 회. 대상이 타수 도중에 쓰러지면 **남은 타수는 새로 고른 적에게**
     *   [2026-10-24 · R353 · battle_design §3-1 — ~~남은 타수는 버린다~~] — 다음 타격 앞에서 살아 있는 적 중 `pickTarget` 1회(평소 규칙 ·
     *   정신 집중의 단일 대상과 같다) · 또 쓰러지면 또 고른다 · 살아 있는 적이 없으면 버린다. 쓰러뜨리지 않은 시전은 rng 가 종전 그대로다 ·
     *   기준 = **첫 대상**(넘어가도 안 바뀐다 — R317)
     */
    enemy_single: (rt, u, def, foes) => {
        const first = rt.pickTarget(u, foes);
        const sk = skillHit(def);
        let tgt = first;
        for (let k = 0; k < def.hits; k++) {
            if (u.hp <= 0) break;
            if (tgt.hp <= 0) {
                const left = foes.filter(f => f.hp > 0);
                if (!left.length) break;
                tgt = rt.pickTarget(u, left);
            }
            rt.strikeOnce(u, tgt, def.mult, def.element, def.id, sk);
        }
        return first;
    },
    /**
     * 광역 — 생존 적 배열 순 전원에게 각 1회. 대상을 고르지 않으므로 **타겟 rng 를 쓰지 않는다**.
     * **광역 약화** [2026-09-10 · skill_design §13-5 멀티샷] — `decay > 0` 이면 **주 대상**만 배율 그대로이고 나머지는 `decay` 만큼 준다.
     *   주 대상 = 전열 생존자 중 배열 첫 번째(전열이 비면 생존자 첫 번째) — 고르는 굴림이 없어 **rng 0회** 그대로다.
     *   전열 판정은 battle.js `frontOf` 와 같은 규칙이다(랭크가 없으면 전열). `decay = 0` 이면 종전과 똑같다
     *   기준 = 주 대상과 같은 적(감쇠가 없어도 — R317)
     */
    enemy_all: (rt, u, def, foes) => {
        const sk = skillHit(def);
        const lead = foes.find(f => f.hp > 0 && (f.rank ?? 0) === 0) ?? foes.find(f => f.hp > 0) ?? null;
        // 후열 약화 [2026-10-29 · R383 · skill_design §12-5 멀티샷 — ~~주 대상 밖이 준다(09-10)~~ 대체] — **시전 순간 전열이 살아 있으면** 후열(문을 넘은 대상)이
        //   `decay` 만큼 약하다 · 전열이 비었으면 후열이 곧 전열이라 안 깎는다 · `decay` 0 이면 전원 같은 값 · rng 0
        const gate = def.decay > 0 && foes.some(f => f.hp > 0 && (f.rank ?? 0) === 0);
        const weak = def.mult * (1 - def.decay);
        for (const tgt of foes) {
            if (u.hp <= 0) break;
            if (tgt.hp > 0) rt.strikeOnce(u, tgt, gate && (tgt.rank ?? 0) !== 0 ? weak : def.mult, def.element, def.id, sk);
        }
        return lead;
    },
    /** 순환 — 시작점만 굴리고(rng 1회) **전열**을 배열 순으로 돌아가며 `hits` 회. 대상이 모자라면 같은 대상에 겹친다 · 기준 = 시작점 */
    enemy_rotate: (rt, u, def, foes) => {
        // 시작점은 `pickTarget` 의 굴림 1회 그대로다 (battle_design §3-1 개정 2026-09-09) —
        //   도는 것은 **전열**이다 [2026-10-03 · ~~배열 전체~~]. 지목 · 도발이 후열을 집었으면 그 하나를 고리 앞에 세운다(진형을 무시하는 좁은 계약)
        const first = rt.pickTarget(u, foes);
        const front = frontOf(foes);
        const ring = front.includes(first) ? front : [first, ...front];
        const start = ring.indexOf(first);
        const sk = skillHit(def);
        for (let k = 0; k < def.hits; k++) {
            if (u.hp <= 0) break;
            const tgt = ring[(start + k) % ring.length];
            if (tgt.hp > 0) rt.strikeOnce(u, tgt, def.mult, def.element, def.id, sk);
        }
        return first;
    },
    /**
     * 최고 방어 대상 다단 — **가장 방어값이 높은 적**을 골라 `hits` 회. 동률이면 배열 순 앞이라 **rng 를 안 쓴다**.
     * 타격마다 그 대상의 방어값이 `decay` 만큼 준다(누적 곱) — 가이드에로우 (skill_design §12-5).
     * 09-08 기본 타겟팅 확정의 **예외 둘째**다 — 대상 선택을 바꾸는 경로라 §7 이 늘리지 말라고 적어 둔 자리다.
     * 고르는 모집단은 **전열**이다 [2026-10-03 · ~~생존 적 전원~~] · 기준 = 그 대상
     */
    enemy_highest_def: (rt, u, def, foes) => {
        const pool = frontOf(foes);
        let tgt = pool[0];
        for (const f of pool) if (f.def > tgt.def) tgt = f;
        const sk = skillHit(def);
        for (let k = 0; k < def.hits; k++) {
            if (u.hp <= 0 || tgt.hp <= 0) break;
            rt.strikeOnce(u, tgt, def.mult, def.element, def.id, sk);
            // 방어 감소는 **밑수까지** 깎는다 — 창이 다시 파생돼도 되돌아오지 않게 (guard_pct 와 같은 축이다).
            //   % 로 깎으므로 **양수 밑수만** 깎고, 깎은 비율을 `defKeep` 에 곱한다 — 갈아입기가 이 비율로 잇는다(벗었다 입어도 안 씻긴다 · R130).
            //   `def` 도 같은 비율로 — 밑수 × 창 배수라 둘을 같이 곱하면 다시 파생한 것과 같다(0 밑으로 자르지 않는다 · 음수 방어 R130)
            //   **겹 상한** [2026-10-29 · R383 · battle_design §9-3 「쌓이는 방어 감소는 상한이 같다」] — 대상마다 깎은 횟수(`shredN`)가
            //   `rt.shredMax`([balance.csv:weapon_def_down_stack_max] — 무기 시기 ② 겹과 같은 값)에 닿으면 더 안 깎는다 · 감쇠가 0 인 줄은 세지 않는다
            if (tgt.defBase > 0 && def.decay > 0 && (tgt.shredN ?? 0) < rt.shredMax) {
                tgt.defBase = tgt.defBase * (1 - def.decay);
                tgt.defKeep = (tgt.defKeep ?? 1) * (1 - def.decay);
                tgt.def = tgt.def * (1 - def.decay);
                tgt.shredN = (tgt.shredN ?? 0) + 1;
            }
        }
        return tgt;
    },
    /**
     * 체력이 가장 많은 적 [2026-10-26 · R357 · skill_design §12-5 스나이프] — **남은 HP 절댓값**이 가장 큰 적 하나를 `hits` 회.
     *   동률이면 배열 순 앞이라 **rng 0** · 모집단은 **전열**이다(밝히지 않은 스킬은 전열부터 · 2026-10-03 — 고르는 대상 표의 같은 이름 · 결투 지목과 같은 규칙) · 기준 = 그 대상
     */
    enemy_hp_max: (rt, u, def, foes) => {
        const tgt = frontOf(foes).reduce((a, b) => (b.hp > a.hp ? b : a));
        const sk = skillHit(def);
        for (let k = 0; k < def.hits; k++) {
            if (u.hp <= 0 || tgt.hp <= 0) break;
            rt.strikeOnce(u, tgt, def.mult, def.element, def.id, sk);
        }
        return tgt;
    },
    /**
     * 연쇄 — 시작점만 굴리고(rng 1회 · **전열 우선**) 전원을 한 바퀴, 순서마다 배율이 `decay` 만큼 곱으로 준다.
     * 도는 순서는 **전열 먼저**다 [2026-10-03] — 시작점부터 전열을 한 바퀴 돈 뒤 나머지를 배열 순으로(센 앞 순번이 후열로 새지 않는다) · 기준 = 시작점
     */
    enemy_chain: (rt, u, def, foes) => {
        const first = rt.pickTarget(u, foes);                 // 시작점만 고른다 — 전열 우선 (§3-1)
        const front = frontOf(foes);
        const i = front.indexOf(first);
        const head = i < 0 ? [first] : [...front.slice(i), ...front.slice(0, i)];
        const order = [...head, ...foes.filter(f => !head.includes(f))];
        const sk = skillHit(def);
        for (let k = 0; k < order.length; k++) {
            if (u.hp <= 0) break;
            const tgt = order[k];
            if (tgt.hp > 0) rt.strikeOnce(u, tgt, def.mult * Math.pow(1 - def.decay, k), def.element, def.id, sk);
        }
        return first;
    },
    /**
     * 열 전원 둘 [2026-10-16 · R249 · R247 · skill_design §12-4 스윕 · §12-5 애로우 레인] — **전열** 전원 · **후열** 전원을 배열 순으로 1회씩.
     *   고르지 않으므로 **rng 0회**다. 후열은 `frontOf` 의 거울 — 후열 생존자가 없으면 받은 목록(생존 전원) 그대로다 · 기준 = 그 목록의 첫 번째
     */
    enemy_front: (rt, u, def, foes) => strikeEach(rt, u, def, frontOf(foes)),
    enemy_back: (rt, u, def, foes) => {
        const back = foes.filter(f => (f.rank ?? 0) !== 0);
        return strikeEach(rt, u, def, back.length ? back : foes);
    },
};

/** 목록 전원에게 1회씩 — 열 전원 둘이 쓴다. 시전자가 쓰러지면 멈추고 쓰러진 대상은 건너뛴다(광역과 같은 가드) · 기준 대상 = 목록의 첫 번째 */
function strikeEach(rt, u, def, list) {
    const sk = skillHit(def);
    for (const tgt of list) {
        if (u.hp <= 0) break;
        if (tgt.hp > 0) rt.strikeOnce(u, tgt, def.mult, def.element, def.id, sk);
    }
    return list[0] ?? null;
}

/**
 * 공격 대상이 `decay` 를 **무슨 뜻으로** 쓰나 [2026-09-24 · R151 — ~~`skill.js:usesDecayOf` 하드코딩~~]. 한 칸이 대상마다 뜻이 달라서
 *   어느 대상이 그 칸을 읽는지를 대상 곁에 적는다 — 여기 없는 대상의 `hit` 줄은 `decay_pct = 0` 이어야 한다(로드 검사 · skill.js)
 */
export const HIT_DECAY = {
    enemy_all: 'back',               // 전열이 살아 있는 동안 후열의 배율이 준다 (멀티샷 · 2026-10-29 R383 — ~~주 대상 밖 · 2026-09-10~~)
    enemy_chain: 'by_order',         // 순서마다 배율이 곱으로 준다
    enemy_highest_def: 'def_shred',  // 타격마다 대상 방어가 준다 (가이디드 애로우)
};

/**
 * **고르는 대상** — `{side, pick(rt, u) → 유닛[]}`. `heal` · `apply` · 고정 피해가 쓴다. **전부 결정론**이라 rng 를 한 번도 안 쓴다
 *   (INTERFACE §5-2 — 대상 선택이 굴림을 쓰는 것은 공격 대상의 단일 · 순환 · 연쇄뿐이다) [2026-09-24 · R151 —
 *   ~~`SUPPORT_TARGETS` · `DEBUFF_TARGETS` 배열 + `skill_runtime.targetsOf` 의 switch~~ 를 표 하나로].
 *   `side = ally`  — 회복 · 버프 · 오오라. `ally_single` = HP **비율** 최저 아군 [사용자 확정 2026-09-09] — 절대량이 아니라 비율이라 탱커가 안 독점한다 ·
 *                    `party_adjacent` = `party` 배열의 양 옆(자기 제외) — ⚠ 위치 개념은 미확정이고(§9-1 규칙 5) 배열 순서를 자리로 읽는 **임시 규칙**이다 (§7)
 *   `side = enemy` — **적에게 거는 창**(디버프 · 지목). 새 채널이 아니라 같은 창을 **음수 `effect_value`** 로 쓴다 [사용자 확정 2026-09-09].
 *                    몬스터도 같은 유닛 생성자를 지나 `buffs` 를 들기 때문에 성립한다 (battle.js:makeUnit).
 *                    `enemy_hp_max` = 생존 **전열** 중 **HP 최대** 하나(전열이 비면 생존자 전원 중 · 2026-10-03 · 결투의 지목 · skill_design §12-4 ⚠ 「rng 소비 0 유지」 조건) —
 *                    ~~`enemy_single` 이 공격(전열 우선 무작위)과 이 뜻 둘을 들었다~~ 2026-09-24 에 이름 하나에 뜻 하나로 갈랐다
 */
export const PICK_TARGETS = {
    self: { side: 'ally', pick: (rt, u) => [u] },
    party: { side: 'ally', pick: (rt, u) => rt.alive(rt.alliesOf(u)) },
    ally_single: {
        side: 'ally',
        pick: (rt, u) => {
            const list = rt.alive(rt.alliesOf(u));
            return list.length === 0 ? [] : [list.reduce((a, b) => (b.hp / b.hpMax < a.hp / a.hpMax ? b : a))];
        },
    },
    party_adjacent: {
        side: 'ally',
        pick: (rt, u) => {
            const list = rt.alliesOf(u);
            const i = list.indexOf(u);
            return [list[i - 1], list[i + 1]].filter(x => x && x.hp > 0);
        },
    },
    enemy_all: { side: 'enemy', pick: (rt, u) => rt.alive(rt.foesOf(u)) },
    enemy_hp_max: {
        side: 'enemy',
        pick: (rt, u) => {
            const foes = frontOf(rt.alive(rt.foesOf(u)));     // 전열 안에서 고른다 [2026-10-03]
            return foes.length === 0 ? [] : [foes.reduce((a, b) => (b.hp > a.hp ? b : a))];
        },
    },
};

/** `skill.csv:target` · `skill_effect.csv:target` 어휘 전체 — 공격 대상 7 ∪ 고르는 대상 6 (`enemy_all` 은 둘 다 — 공격이면 광역 타격, 창이면 적 전원) */
export const TARGETS = [...new Set([...Object.keys(ATTACK_TARGETS), ...Object.keys(PICK_TARGETS)])];

/**
 * 하는 일 — 이 표의 키가 곧 `skill_effect.csv:effect` 어휘다 [2026-09-22 · R136 · 옛 `kind` 의 「무엇을 하나」 절반].
 *   `casts`                  — 그 일을 싣는 나가는 방식. `skill.js` 가 로드 때 짝을 검증한다(옛 kind 일곱이 그대로 남는 짝이다)
 *   `foes`                   — 살아 있는 적이 없으면 그 줄을 건너뛴다(굴림도 없다 · `skill_runtime.cast` · 2026-09-24)
 *   `weapon`                 — **그 직업의 무기를 들어야 나간다** [2026-10-03 · R204 · skill_design §2-2] — 무기의 힘을 배율로 끌어다 쓰는 일(타격 · 회복 · 소환).
 *                              이런 줄이 하나라도 있는 스킬은 칸(고유 · 배운 · 전직)을 가리지 않고 무기를 본다 · 걸린 효과만 거는 스킬은 무기와 상관없다(`skill.fitsWeapon`)
 *   `run(rt, u, x, t, foes)` — 한 줄의 실행. `x` = 시전 단위(`skill.scaleDef` 가 낸 줄 하나 — 스킬 id · 그 줄의 대상 · 실효값 · 걸린 효과를 푼 값).
 *                              **`hit` 만 기준 대상을 돌려준다**(`ATTACK_TARGETS` · R317) — 나머지는 돌려주는 값이 없다
 *   `apply`  — 걸린 효과를 건다(버프 · 적에게 거는 창 · 오오라). 오오라(`cast = aura`)는 차례에 안 나가고 battle.js 가 전투 시작에 건다
 *   `summon` — **HP 를 가진 유닛**을 세운다 (skill_design §12-6 프로즌월). 행동하지 않고 대상 풀에만 들어간다
 *   `call`   — **불러내기** — 시전자의 무리(`band`) 중 서 있지 않은 것을 **한 번에 전부** 세운다 (skill_design §12-9 · 2026-09-18).
 *              벽과 달리 진짜 몬스터다 · **몬스터 전용**(`owner_kind = monster`) · 세우는 일은 battle.js(`callBand`)가 한다
 *   `fixed`  — **비직격 고정 피해**(자폭 · battle_design §9-6 · 2026-09-21). 세기 = 시전자 공격력 **중앙값**(굴리지 않는다 — rng 0) × 배율 × 능력치 계수.
 *              방어 · 저항 · 피해 감소 · 배리어를 안 빼고 · 흡혈 · 반사 · 경직 · 타격 훅을 안 부른다 — 맞히는 일은 battle.js 가 주는 `rt.dealIndirect` 다.
 *              `event` 스킬이라 사건(`rt.fire`)이 부른다 [`run` 2026-09-24 R151 — ~~`battle.js:blast` 전용 함수~~]
 */
export const EFFECT_TYPES = {
    hit: { casts: ['turn', 'channel', 'channel_tick', 'channel_charge'], foes: true, weapon: true, run: (rt, u, x, t, foes) => ATTACK_TARGETS[x.target](rt, u, x, foes) },
    heal: { casts: ['turn'], weapon: true, run: (rt, u, x, t) => rt.castHeal(u, x, t) },
    // 자기 회복 — 시전자 최대 HP 비율만큼 바로(리커버리 · 2026-10-16) · 굴리지 않는다(rng 0) · 무기의 힘을 안 끌어 쓰므로 `weapon` 이 없다
    mend: { casts: ['turn'], run: (rt, u, x, t) => rt.castMend(u, x, t) },
    apply: { casts: ['turn', 'aura'], run: (rt, u, x, t) => rt.castBuff(u, x, t) },
    summon: { casts: ['turn'], weapon: true, run: (rt, u, x, t) => rt.castSummon(u, x, t) },
    call: { casts: ['turn'], run: (rt, u, x, t) => rt.castCall(u, x, t) },
    fixed: {
        casts: ['event'],
        foes: true,
        run: (rt, u, x) => {
            const dmg = rt.F.indirect(((u.atkMin ?? 0) + (u.atkMax ?? 0)) / 2 * x.mult * (x.statMult ?? 1));
            if (dmg <= 0) return;
            for (const tgt of PICK_TARGETS[x.target].pick(rt, u)) rt.dealIndirect(u, tgt, dmg, x.id);
        },
    },
};

export const EFFECT_IDS = Object.keys(EFFECT_TYPES);

/**
 * 걸린 효과의 능력치 — `skill_status.csv:stat` 어휘가 곧 이 표의 키다 (옛 `skill.csv:effect_stat` · 2026-09-22). 셋 중 하나다 [2026-09-24 · R151]:
 *   `{}`             — **창 합이 능력치를 민다.** 어느 능력치를 어떻게 미나는 아래 `ATTRS`(능력치 표)가 든다 — 한 능력치를 여러 효과가 밀면 그 능력치 한 곳에서 모은다
 *   `state: true`    — **표식**. 파생값이 없고 읽는 쪽이 `stateOf` · `sumOf` 로 본다(`taunt` · `duel` = battle.js 타겟팅 · 평타 부여 둘 = runtime 기본 공격 · 원소 추가타는 물리 스킬 시전도 — R201)
 *   `apply(rt, tgt, def, until, ev)` — 시전 순간 한 번. 창 밖에 따로 만들 것이 있는 효과만 든다(`def` = 시전 단위 — 걸린 효과를 푼 `value`)
 */
export const EFFECTS = {
    // 상시 % 와 같은 괄호에 덧셈 — 새 곱셈 층이 아니다 (battle_design §9-2)
    atk_pct: {},
    // 주기는 다음 차례 예약부터 — 이미 잡힌 u.next 는 건드리지 않는다 (INTERFACE §2-6)
    period_pct: {},
    // HP 밖 흡수 풀 — 창이 끝나면 남은 흡수량은 사라진다 (skill_design §9-3)
    barrier_pct: {
        apply: (rt, tgt, def, until, ev) => {
            const amt = Math.round(tgt.hpMax * def.value);
            tgt.barrier = { amt, until, s: def.id };
            ev.amt = amt;
        },
    },
    // 방어값 비율 + 전 저항(같은 비율을 더한다)을 **함께** 민다 — 전사 외침. 한 행이 채널 하나만 들어서 둘을 한 효과로 묶었다
    guard_pct: {},
    // 전 원소 저항 %p — 레지스탕스 실드(2026-10-16). `guard_pct` 의 저항 몫과 같은 자리에 더하고 방어는 안 민다
    res_pct: {},
    // ── 무기 옵션 창 둘 [2026-09-11 · R78 · item_design §1 「무기 옵션」] — `battle.strikeOnce` 가 타격 시 건다.
    // 방어값 % — 물리 무기 통합옵션 「타격 시 대상 방어력 감소」(음수) · 스킬 행은 아이언 스킨 하나(2026-10-16 — ~~guard_pct~~ 에서 원소 저항을 뺐다)
    def_pct: {},
    // 원소 하나의 저항 %p — 마법 무기 통합옵션 「타격 시 그 원소의 대상 저항 감소」(음수). 창이 든 `element` 칸만 민다
    res_elem: {},
    // 최대 HP 창 — 열릴 때 늘어난 만큼 현재 HP 도 올리고(apply), 닫힐 때 넘친 HP 를 깎는다(능력치 표 `hpMax`)
    hp_max_pct: {
        apply: (rt, tgt, def, until, ev) => {
            const add = Math.round(tgt.hpMaxBase * def.value);
            tgt.hp += add;
            ev.amt = add;
        },
    },
    // HP 재생 창 — 09-07 확정 구조(레벨 곡선 밑수)에 **얹는다**. 밑수가 0 이면 아무 일도 없다
    regen_pct: {},
    // HP 재생 + 수치 — 장비 「체력 재생」과 같은 단위를 밑수 위에 **더한다**(프레이어 · 2026-10-29) · 밑수가 0 이어도 선다
    regen_flat: {},
    // 받는 피해 감소 — 감쇠 뒤 곱이고 원천별로 각각 곱한다 (battle_design §9-3). 방어·저항과 채널이 다르다
    dr_pct: {},
    // 평타 부여 둘 — 소비자는 skill_runtime 의 기본 공격이다
    //   onhit_element  원소 추가타 1회 (인챈트 · 독화살) — 창이 든 `element` 로 때린다 · 물리 스킬 시전도 겨눈 대상마다 1회(`cast` · 2026-10-02 R201)
    //   attack_splash  기본 공격이 단일 → 광역 (관통 사격) — 그때 배율이 창의 값(비율)이 된다
    onhit_element: { state: true },
    attack_splash: { state: true },
    // 지목 — 소비자는 battle.js 의 타겟팅이다. 창은 **지목당한 적**이 들고 `by` 에 시전자 key 가 실린다.
    //   시전자 자신의 피해 감소는 결투의 **둘째 줄**이 건다(`kni_duel_guard` · `dr_pct` · 2026-09-24 R151 — ~~`castBuff` 의 결투 분기~~)
    duel: { state: true },
    taunt: { state: true },
    // 상태이상 전용 셋 [2026-09-28 · R178 · battle_design §2-6 · §2-7] — `AILMENTS[..].stat` 의 짝이라 그 상태이상 행만 쓴다(로드 검사).
    //   burn    받는 피해 증가 · 받는 회복 감소 — 가장 센 창 하나가 `ATTRS`(dr · recv)에서 민다
    //   poison  초당 피해(절대값 · 거는 순간 굳힌다) — 소비자는 battle.js 의 중독 틱
    //   stun    행동 · 쿨 정지 — 소비자는 battle.js 의 `stun`(런타임이 창을 건 뒤 부른다)
    burn: {},
    poison: { state: true },
    stun: { state: true },
    // 기본 스킬 50 의 장치 일곱 [2026-10-16 · R246 · R247 · R249 · R250 · INTERFACE §2-6 「기본 스킬 50 의 장치」] — 전부 표식이고 읽는 쪽이 따로 있다:
    //   phys_pct   물리 타격의 데미지 % — battle.strikeOnce 가 그 타격의 condPct 에 더한다 · 쓰는 행 0(~~워 크라이~~ 2026-10-28 → final_phys_pct)
    //   basic_pct  평타 피해 % (퀵 드로우 · 오버드로우) — skill_runtime.basicAttack 이 배율에 곱한다
    //   frenzy     겹마다 공속 (프렌지) — 창이 겹 `n` 을 들고 적중마다 battle.strikeOnce 가 올린다 · 주기 파생(아래 능력치 표)이 `v × n` 을 읽는다
    //   evade      받는 직격 n 번 무효 (이베이드) — 창이 횟수 `n` 을 든다 · battle.strikeOnce 첫머리가 쓴다
    //   imbue      창 동안 그 원소 스킬 타격에 상태이상 (이그나이트 · 딥 프리즈 · 서지) — 창이 `hit`(거는 상태이상)를 든다 · battle.strikeOnce
    //   pulse      오오라 피해 (홀리 파이어) — battle.js 의 틱이 간격마다 적 전원에게 비직격
    //   echo       공격 스킬 한 번 더 (에코) — skill_runtime.cast 끝
    phys_pct: { state: true },
    // 적 데미지 감소 디버프 둘 [2026-10-28 · R368 · battle_design §9-3] — 때리는 쪽이 든 창 · battle.strikeOnce 가 **직격의 최종 피해**에 창마다 `1 + v` 를 곱한다
    //   (데미지 % 괄호 밖 · 적에게 음수 · 다른 스킬끼리 곱). final_dmg_pct = 모든 직격(페니턴스 · 일갈 · 사냥 표식 · 속죄) · final_phys_pct = 물리 직격만(워 크라이)
    final_dmg_pct: { state: true },
    final_phys_pct: { state: true },
    basic_pct: { state: true },
    frenzy: { state: true },
    evade: {
        state: true,
        // 횟수는 정수 — 능력치 · 레벨이 민 값을 반올림하고 1 밑으로 안 내린다
        apply: (rt, tgt, def, until, ev) => {
            const n = Math.max(1, Math.round(def.value));
            tgt.buffs[def.status ?? def.id].n = n;
            ev.n = n;
        },
    },
    imbue: { state: true },
    pulse: { state: true },
    echo: { state: true },
    // 2026-10-29 기본 스킬 개편 셋 [R383 · R385 · INTERFACE §2-6 「기본 스킬 50 의 장치」] — 전부 표식:
    //   def_ignore  방어 무시(피어싱 샷) — battle.strikeOnce 가 **물리 타격만** 그 타격 동안 `defIgnore` 에 창 합을 더한다
    //   shatter     딥 프리즈 — **이미 결빙된** 적을 창의 원소 스킬 타격이 맞히면 창이 든 상태이상(`hit` — 스턴)을 건다 · battle.strikeOnce
    //   period_fix  주기 고정(보우마스터 퀵 드로우 · 오버드로우) — 위 능력치 표의 주기가 무기 주기 × 값이 된다(공속 · 둔화 · 민첩 무시)
    def_ignore: { state: true },
    shatter: { state: true },
    period_fix: { state: true },
    // 장 보스 고유 넷 [2026-10-29 · R380 · skill_design §12-9 · INTERFACE §2-6 「장 보스 고유 넷의 장치」] — 전부 표식이고 읽는 쪽이 따로 있다:
    //   maiden     아이언 메이든 — 이 창을 든 유닛(적에게 건다)이 직격을 맞히면 그 피해 × 창 합을 **자기도** 받는다(반사 규칙 · battle.strikeOnce)
    //   transform  변신 — 창 동안 액티브를 못 고른다(skill_runtime.pick) · 값(초) > 0 이면 직격을 맞힐 때마다 **그 시전이 건 창**이 값만큼 늘고
    //              끝은 연 시각(`t0`) + [balance.csv:transform_max_sec] (battle.strikeOnce)
    //   delegate   델리게이트(오오라) — 제 차례에 행동하지 않고 공격력이 가장 높은 아군에게 넘긴다(battle.js 차례 순회)
    //   swarm      스웜 — 창 동안 한 자리 안에서 파리 [balance.csv:swarm_fly_count] 마리 · 마리마다 지금 HP × 값 · 닫힐 때(`end`) 뭉친다 ·
    //              피해를 파리로 나누는 일 · 여닫기는 battle.js(`rt.swarmOpen` · `rt.swarmClose`)
    //   `end(rt, u, b, at)` — 창이 **만료로** 닫힐 때 한 번(skill_runtime.expire) · 지금 쓰는 효과는 swarm 하나
    maiden: { state: true },
    transform: {
        state: true,
        apply: (rt, tgt, def, until, ev) => { tgt.buffs[def.status ?? def.id].t0 = ev.t; },
    },
    delegate: { state: true },
    swarm: {
        state: true,
        apply: (rt, tgt, def, until, ev) => rt.swarmOpen(tgt, def, ev),
        end: (rt, u, b, at) => rt.swarmClose(u, at),
    },
};

export const EFFECT_STATS = Object.keys(EFFECTS);

/**
 * 상태이상 [2026-09-28 · R177 · 넷 R178 · battle_design §2-4 ~ §2-7] — **이 표의 키가 `skill_status.csv:ailment` 어휘다.** 창은 버프 · 디버프와 같고
 *   다른 것은 받는 쪽 시간 감소 · 겹침 · 이벤트(`k`)다. 세기가 다른 행 여럿(약한 화상 · 강한 화상)이 같은 상태이상으로 선다.
 *   `cut`   — 받는 쪽 시간 감소가 든 **유닛 필드 이름**(비율 · battle.makeUnit ← `hero.computeCombat:option_fx`). `rt.applyStatus` 가 `× (1 − 대상[cut])` 를 곱한다
 *   `stack` — `one` = 창 하나(열쇠 = 상태이상 이름 · 다시 걸면 갱신) · `strongest` = 거는 것마다 창(열쇠 = `status_id@시전자`)이 제 시간으로 흐르고
 *             **가장 센 하나만 적용**된다(`strongestOf` — 사용자 09-28 「동시에 적용되는 건 센 놈만 · 센 놈이 끝나면 약한 놈 남은 시간으로」)
 *   `stat`  — 그 상태이상 전용 능력치(`EFFECTS`) — 있으면 행의 `stat` 이 같아야 하고, 그 능력치는 그 상태이상 행만 쓴다(로드 검사 · skill.js)
 *   `hold`  — 창을 건 뒤 런타임이 `ctx.stun` 을 부른다(행동 · 쿨 정지 — battle.js)
 */
export const AILMENTS = {
    freeze: { cut: 'freezeDur', stack: 'one' },                         // 결빙 — 공속 감소(`period_pct` 음수) · 「빙결 시간 감소」가 줄인다
    burn: { cut: 'burnDur', stack: 'strongest', stat: 'burn' },         // 화상 — 받는 피해 +값 · 받는 회복 −[balance.csv:burn_heal_cut]
    poison: { cut: 'poisonDur', stack: 'strongest', stat: 'poison' },   // 중독 — 초당 피해(거는 순간 굳힌다) · 독 저항만
    stun: { cut: 'stunDur', stack: 'one', stat: 'stun', hold: true },   // 스턴 — 행동 차례 · 스킬 쿨 정지 · 경직과 누적 안 함
};
export const AILMENT_IDS = Object.keys(AILMENTS);

/**
 * 적용 중인 상태이상 하나 [2026-09-28 · R178] — `u` 의 창 중 `ail` 이 같은 것에서 **가장 센 창**(`v` 최대 · 같으면 늦게 끝나는 쪽 · 그다음 삽입 순서) 또는 null.
 *   화상 파생(`ATTRS`) · 중독 틱(battle.js) · 이벤트 동기화(skill_runtime)가 같이 쓴다
 */
export function strongestOf(u, ail) {
    let best = null;
    for (const b of Object.values(u.buffs)) {
        if (b.ail !== ail) continue;
        if (!best || b.v > best.v || (b.v === best.v && b.until > best.until)) best = b;
    }
    return best;
}

/**
 * 한 유닛의 한 능력치 **창 합** — 같은 능력치의 창은 덧셈이다(창 순서대로 · 받는 피해 감소만 예외 — 곱). 평타 광역 · 능력치 표가 쓴다
 */
export function sumOf(u, stat) {
    let s = 0;
    for (const b of Object.values(u.buffs)) if (b.stat === stat) s += b.v;
    return s;
}

/** 겹 창의 합 — 창마다 `v × n`(겹 · 없으면 0) [2026-10-16 · 프렌지 · R246]. 주기 파생이 쓴다 */
export function stackSum(u, stat) {
    let s = 0;
    for (const b of Object.values(u.buffs)) if (b.stat === stat) s += b.v * (b.n ?? 0);
    return s;
}

/**
 * 표식 조회 — 그 능력치의 **첫 창** `[열쇠, 창]` 또는 null. 첫 창 = 삽입 순서(INTERFACE §8 항목 15) — 도발자 · 지목 · 원소 추가타가 이것을 읽는다
 */
export function stateOf(u, stat) {
    for (const e of Object.entries(u.buffs)) if (e[1].stat === stat) return e;
    return null;
}

/**
 * 방어 % 창이 민 방어값 [2026-09-21 · R130 · battle_design §9-3] — **양수 밑수에만 곱한다.** 밑수가 0 이하면 창이 안 민다 — 곱하면 버프가 음수를
 *   더 깊게 · 디버프가 얕게 만들어 뜻이 뒤집힌다(안전장치 — 깎인 방어는 비율 `defKeep` 이라 지금은 밑수가 음수로 가는 길이 없다). 양수 밑수라도 감소 합이 −100% 를 넘으면
 *   방어가 음수로 간다(`formula.mitigation` 의 거울식)
 */
function defScaled(base, pct) {
    return base > 0 ? base * (1 + pct) : base;
}

/**
 * 능력치 표 — 창이 미는 능력치마다 **한 곳에서** 모아 파생값을 다시 쓴다 [2026-09-24 · R151 · GAS attribute aggregator —
 *   ~~`EFFECTS` 의 stat 마다 `derive` 를 키 순서대로 · 순서가 계약~~(`def_pct` 가 `guard_pct` 뒤라야 둘을 다 들었다)].
 *   능력치끼리 서로 안 읽으므로 표 순서는 결과를 안 바꾼다. 식은 옛 stat 별 derive 와 **부동소수 연산 순서까지 같다**(골든이 잠근다).
 *   창이 하나도 없으면 합이 0 이라 밑수로 돌아온다 — 그래서 창이 사라질 때도 전부 다시 쓴다
 */
const ATTRS = [
    // 데미지 % 괄호 — 괄호 안의 지금 합(`dmgPct`)은 `strike` 가 타격마다 조건부 % 를 이 괄호에 끼울 때 읽는다 (battle_design §9-1 · 2026-09-18).
    //   공격력 · 회복 밑수는 **범위**다 — 양끝에 같은 배율을 곱한다 (R90). 회복 밑수(matkMin·matkMax)도 **같은 괄호**를 탄다 — 공격 창이 회복만 비껴가면 힐러의 창이 반쪽이 된다
    u => {
        u.dmgPct = u.atkPct + sumOf(u, 'atk_pct');
        const mult = 1 + u.dmgPct;
        u.atkMin = u.atkMinBase * mult; u.atkMax = u.atkMaxBase * mult;
        u.matkMin = u.matkMinBase * mult; u.matkMax = u.matkMaxBase * mult;
    },
    // 행동 주기 [2026-10-29 · R386 · battle_design §2 — ~~`basePeriod × (1 − Σperiod_pct − 프렌지)`~~ 대체] — 공속은 「몇 % 더 치나」다:
    //   주기 = 원값(`periodRaw` = 무기 주기 ÷ 민첩 계수) × (1 + 둔화 합) ÷ (1 + 공속 합) · 바닥 `periodFloor`([balance.csv:period_floor_sec]).
    //   공속 합 = 장비 · 마스터리(`speedBase`) + 양수 `period_pct` 창 + 프렌지 겹(`v × n`) · 둔화 합 = 음수 `period_pct` 창의 크기(결빙 · 바인드).
    //   **고정 창**(`period_fix` — 보우마스터 퀵 드로우 · 오버드로우)이 있으면 주기 = 무기 주기(`periodWeapon`) × 첫 창의 값 — 공속 · 둔화 · 민첩을 안 탄다.
    //   주기 창이 하나도 없으면 `basePeriod` 그대로 — 부동소수가 종전과 같다
    u => {
        const fix = stateOf(u, 'period_fix');
        if (fix) { u.period = Math.max(u.periodFloor ?? 0, (u.periodWeapon ?? u.basePeriod) * fix[1].v); return; }
        let fast = 0, slow = 0, any = false;
        for (const b of Object.values(u.buffs)) {
            if (b.stat === 'period_pct') { any = true; if (b.v >= 0) fast += b.v; else slow -= b.v; }
            else if (b.stat === 'frenzy' && (b.n ?? 0) > 0) { any = true; fast += b.v * b.n; }
        }
        if (!any) { u.period = u.basePeriod; return; }
        const base = u.speedBase ?? 0;
        u.period = Math.max(u.periodFloor ?? 0, (u.periodRaw ?? u.basePeriod) * (1 + slow) / (1 + base + fast));
    },
    // 방어 = 무기 옵션 방어 % + 외침(guard) — 같은 축을 미는 둘을 한 번에 모은다
    //   방어 감소(`def_pct` 음수 — 배틀 크라이 · 무기 옵션 한 창 · 겹 창)는 **창마다 곱**한다 [2026-10-28 · R370 · battle_design §9-3 — 10-12 「같은 수치를 깎는 디버프도 서로 곱한다」] ·
    //   버프(양수 · `guard_pct`)는 합 그대로 · 창마다 0 밑으로 안 간다 · 감소가 없으면 종전 식 그대로
    u => {
        let up = 0, down = 1;
        for (const b of Object.values(u.buffs)) if (b.stat === 'def_pct') { if (b.v < 0) down *= Math.max(0, 1 + b.v); else up += b.v; }
        u.def = u.defBase > 0 ? defScaled(u.defBase, up + sumOf(u, 'guard_pct')) * down : u.defBase;
    },
    // 저항 = 밑수 + 외침(guard · 전 원소) + 레지스탕스 실드(res_pct · 전 원소) 에 원소 하나의 창(무기 옵션 · `element` 칸만)을 **창 순서대로** 더한다
    u => {
        const guard = sumOf(u, 'guard_pct') + sumOf(u, 'res_pct');
        for (const k of Object.keys(u.res)) u.res[k] = u.resBase[k] + guard;
        for (const b of Object.values(u.buffs)) if (b.stat === 'res_elem' && b.element in u.res) u.res[b.element] += b.v;
    },
    // 최대 HP — 닫힐 때 넘친 HP 를 깎는다(열 때 늘어난 만큼 현재 HP 를 올리는 것은 `EFFECTS.hp_max_pct.apply`)
    u => {
        u.hpMax = Math.round(u.hpMaxBase * (1 + sumOf(u, 'hp_max_pct')));
        if (u.hp > u.hpMax) u.hp = u.hpMax;
    },
    // HP 재생 — 밑수 × (1 + % 창) + 수치 창
    u => { u.regen = u.regenBase * (1 + sumOf(u, 'regen_pct')) + sumOf(u, 'regen_flat'); },
    // 받는 피해 감소 — **창 하나 = 원천 하나** — 창 합을 안 쓰고 창마다 곱한다. 밑값(`drBase` — 장비 · 마스터리를 이미 곱으로 합친 값)도 원천 하나다.
    //   ~~`drBase + sum`~~ 은 2026-09-22 에 고쳤다 — 덧셈이라 장비 50% + 결투 20% 가 70%(곱이면 60%)였고 합이 100% 를 넘을 수 있었다.
    //   창이 없으면 밑값을 그대로 둔다(부동소수 왕복 없이 원값 복원) · 음수 창(받는 피해 증가)은 `1 − v` 가 1 보다 커져 그대로 곱해진다
    //   화상(가장 센 창 하나)은 **원천 하나**로 끝에 선다 — 받는 피해 증가라 `-v` (2026-09-28 · R178 · battle_design §2-6)
    u => {
        const wins = [];
        for (const b of Object.values(u.buffs)) if (b.stat === 'dr_pct') wins.push(b.v);
        const burn = strongestOf(u, 'burn');
        if (burn) wins.push(-burn.v);
        u.dr = wins.length ? 1 - (1 - u.drBase) * reductionMult(wins) : u.drBase;
    },
    // 받는 회복 — 화상이 걸려 있으면 장비의 체력 회복 +% 와 **곱**으로 줄인다(`cut` = 창에 굳힌 [balance.csv:burn_heal_cut]) [2026-09-28 · R178].
    //   회복 스킬 · 재생 · 물약 · 흡혈이 전부 `recv` 를 읽으므로 여기 한 곳이다. 밑값(`recvBase`)이 없는 유닛(손으로 만든 유닛)은 건드리지 않는다
    //   헬 장 디버프(탐욕)의 받는 회복 감소(`curseCut` — battle.js 가 런 내내 싣는다 · 2026-10-28 · R366)도 같은 곱이다 · 둘 다 없으면 밑값 그대로
    u => {
        if (u.recvBase === undefined) return;
        const burn = strongestOf(u, 'burn');
        const cut = u.curseCut ?? 0;
        u.recv = burn || cut ? (1 + u.recvBase) * (1 - (burn?.cut ?? 0)) * (1 - cut) - 1 : u.recvBase;
    },
];

/**
 * 발동 조건 — 거짓이면 **준비된 것으로 치지 않는다** (skill_design §9-3). `turn` · `aura` 스킬의 `cast_condition` 어휘다
 *   (`event` 스킬의 `cast_condition` 은 사건 이름 — `EVENT_TRIGGERS` · 2026-09-24).
 * @param ctx {self, allies} — allies = 생존 아군 배열(self 포함)
 */
export const CONDITIONS = {
    // 시전자에게 **이 스킬이 건** 창이 없다 — 창 열쇠가 걸린 효과 id 라서 창의 `s`(건 스킬)로 본다 (2026-09-24 · R151).
    //   `s` 가 없는 창(손으로 만든 창)은 열쇠를 `s` 로 읽는다
    buff_absent: (def, ctx) => !Object.entries(ctx.self.buffs ?? {}).some(([k, b]) => (b.s ?? k) === def.id),
    ally_hp_below: (def, ctx) => (ctx.allies ?? []).some(a => a.hp > 0 && a.hp / a.hpMax < def.condValue),
    // 무리 중 서 있지 않은 것(아직 안 나왔거나 쓰러진 것)이 있다 — 불러내기(`call`)의 조건 (2026-09-18 · INTERFACE §2-8).
    //   무리가 없는 유닛은 늘 거짓이다 — 소환사 규칙이 안 걸린 판에서는 이 스킬이 안 나간다
    band_missing: (def, ctx) => (ctx.self.band ?? []).some(m => !m.called || m.hp <= 0),
};

export const CONDITION_IDS = Object.keys(CONDITIONS);

/**
 * 파생값 재계산 — **능력치 표(`ATTRS`)를 순서대로** 다시 쓴다 (2026-09-24 · R151 — ~~`EFFECTS` 의 키 순서대로 derive~~).
 * 창이 하나도 없어도 전부 다시 쓴다 — 그래야 마지막 창이 사라진 자리에 원값이 돌아온다.
 */
export function refreshDerived(u) {
    for (const derive of ATTRS) derive(u);
}

/**
 * 무기 옵션의 타격 시 창 셋 [2026-09-11 · R78 · item_design §1 「무기 옵션」] — `battle.strikeOnce` 가 적중 직후 부른다.
 * **rng 0 · 타임라인 이벤트 없음** — 창에 `quiet` 을 달아 만료도 조용하다(`skill_runtime.expire`).
 *   방어력 감소 · 공격력 감소 = **겹치지 않는다** — 대상의 창 하나에 센 값만 남고 시간만 갱신된다
 *   원소 저항 감소 = **영웅끼리 중첩** — 공격자 · 원소마다 창이 따로 서고, 같은 영웅의 재타격은 시간만 갱신한다
 *   공격력 감소는 **든 무기의 피해 종류가 맞는 대상**에만 — 물리 감소 = 물리 무기 · 맨손 · 마법 감소 = 마법 무기(`noBasic`)
 *     [개정 2026-10-02 · R198 — ~~평타의 공격 타입(물리 · 원소)~~ — 평타가 언제나 물리라 마법 감소가 아무에게도 안 걸리게 됐다]
 * @param u 공격자 · @param fx 공격자의 무기 옵션 묶음(`hero.computeCombat:option_fx`) · @param d 대상 · @param type 그 타격의 공격 타입
 *   **방어력 감소 겹**(`fx.defStack` — 무기 시기 ② · 2026-10-05 R206 · item_design §1) = 대상의 창 `wx:def_stack` **하나에 겹이 쌓인다** —
 *     겹 수 `n` 은 `sec.stackMax` 까지 · 겹 값 `per` 는 지금까지 건 것 중 가장 센 값(⚠제안 — 여러 영웅의 겹이 한 줄에 함께 쌓인다) · 값 = `−per × n` ·
 *     **시간으로 안 풀린다**(`until = ∞`) — 적은 라운드마다 새로 서고 파티 유닛의 이 창은 `battle.beginRound` 가 지운다
 * @param t 지금 시각(초) · @param sec `{def, res, atk, stackMax}` 창 길이 — [balance.csv:weapon_def_down_sec] · `weapon_res_down_sec` · `weapon_atk_down_sec` ·
 *   최대 겹 [balance.csv:weapon_def_down_stack_max]
 * @returns 창이 하나라도 섰는가
 */
export function weaponOnHit(u, fx, d, type, t, sec) {
    let changed = false;
    // 매력 — 대상이 받는 디버프 시간 [2026-10-24 · R346 · battle_design §2-4] · `rt.applyStatus` 와 같은 값(`ddr`) · 0 이면 곱하지 않는다 · 시간으로 안 푸는 겹(∞)은 안 탄다
    const len = dur => (d.ddr ? dur * (1 - d.ddr) : dur);
    const strongest = (key, stat, pct, dur) => {
        const cur = d.buffs[key];
        d.buffs[key] = { stat, v: cur ? Math.min(cur.v, -pct) : -pct, until: t + len(dur), element: null, by: u.key, quiet: true };
        changed = true;
    };
    if (fx.defDown > 0) strongest('wx:def_down', 'def_pct', fx.defDown, sec.def);
    if (fx.defStack > 0) {
        const cur = d.buffs['wx:def_stack'];
        const n = Math.min(sec.stackMax ?? 1, (cur?.n ?? 0) + 1);
        const per = Math.max(cur?.per ?? 0, fx.defStack);
        d.buffs['wx:def_stack'] = { stat: 'def_pct', v: -per * n, n, per, until: Infinity, element: null, by: u.key, quiet: true };
        changed = true;
    }
    const atkDown = d.noBasic ? fx.atkDownMag : fx.atkDownPhys;
    // 데미지 감소 — 스킬 디버프와 같은 자리 · 직격의 최종 피해에 곱 (2026-10-28 R368 — ~~atk_pct 음수 · 데미지 % 괄호~~)
    if (atkDown > 0) strongest('wx:atk_down', 'final_dmg_pct', atkDown, sec.atk);
    if (fx.resDown > 0 && type !== 'physical' && type in d.res) {
        d.buffs[`wx:res_down:${u.key}:${type}`] = { stat: 'res_elem', v: -fx.resDown, until: t + len(sec.res), element: type, by: u.key, quiet: true };
        changed = true;
    }
    if (changed) refreshDerived(d);
    return changed;
}
