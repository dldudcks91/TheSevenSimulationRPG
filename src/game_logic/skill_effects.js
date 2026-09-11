/**
 * 스킬 「종류」 등록표 — 공격 대상 · 버프 효과 · 발동 조건. **어휘와 실행이 같은 표**에 산다.
 *
 * 순수 모듈 — DOM·저장소·시계·Math.random 접근 없음. **상태를 들지 않는다**(모듈 전역 가변 없음).
 *   난수가 필요한 항목은 런타임(`rt.rng`)을 인자로 받는다 — 이 파일이 시드를 만들지 않는다.
 *
 * **정의는 CSV · 종류는 코드** (skill_architecture_survey §8) — `skill.csv` 가 값을 들고,
 *   그 값이 어느 종류인지는 여기 표의 **키**가 정한다. 종류 하나 = 여기 등록 한 번:
 *   어휘 배열을 따로 두면 표와 배열이 반드시 어긋나므로 **표의 키가 곧 어휘다**.
 *
 * skill_design.md / battle_design.md 확정 규칙:
 *   · 공격 대상 4종(skill_design §9-3) — 단일 다단 · 광역 전원 · 순환 · 연쇄 감쇠.
 *     시작점을 굴리는 둘(순환·연쇄)은 rng 를 **정확히 1회** 쓴다 — 발화 순서가 곧 계약이다 (INTERFACE §5-2)
 *   · **스킬 타격은 능력치 항·추가 피해를 싣는다** (skill_design §13 · 2026-09-10) — 핸들러가 받는 `def` 는 `scaleDef` 를 지난
 *     실효 정의이고 타격마다 `{flat, procChance, procMult}` 를 `rt.strikeOnce` 에 넘긴다. 광역(`enemy_all`)은 `decay` 가 있으면 **주 대상 밖**이 약해진다
 *   · 버프 창(battle_design §7) — 중첩 없음. 같은 stat 의 서로 다른 창은 **덧셈**이고 파생값을 다시 쓴다
 *   · `atk_pct` 는 새 곱셈 층이 아니라 상시 % 와 **같은 괄호에 덧셈**이다 (battle_design §9-2 「괄호는 둘뿐」).
 *     회복 밑수(`matk`)도 같은 괄호를 탄다 — 공격 창이 회복만 비껴가면 같은 괄호가 아니다
 *   · `period_pct` 는 **다음 차례 예약부터** 걸린다 — 이미 잡힌 `next` 는 건드리지 않는다 (INTERFACE §2-6)
 *   · 발동 조건(skill_design §9-3) — 거짓이면 **준비된 것으로 치지 않는다**(쿨은 그대로, 그 차례엔 다른 것이 나간다)
 *
 * ⚠ 아직 미확정이라 이 파일이 임시로 두는 것:
 *   `taunt` 는 derive 도 apply 도 없는 **표식**이다 — 소비자가 battle.js 의 타겟팅(도발자 고정)이라
 *     여기서 할 일이 없다. 기본 타겟팅이 확정되면 그 임시 규칙과 함께 다시 본다 (skill_design §7).
 *   다단타·순환 중 대상이 쓰러지면 남은 타수를 **버린다**(재지정 없음) — 재지정 규칙 미확정.
 */

/**
 * 스킬 종류 — 이 다섯이 곧 `skill.csv:kind` 어휘다.
 *   `aura`   — 쿨 없이 상시 · 한 번에 하나 · **행동을 안 먹는다** (skill_design §1-5). 액티브 칸에서 빠져
 *              전투 시작에 `until: Infinity` 창으로 걸린다 — 켜는 주체는 battle.js 다
 *   `summon` — **HP 를 가진 유닛**을 세운다 (skill_design §12-6 프로즌월). 행동하지 않고 대상 풀에만 들어간다
 */
export const KINDS = ['attack', 'heal', 'buff', 'aura', 'summon'];

/**
 * 스킬 타격이 `strike` 에 싣는 셋 — 능력치 항 · 추가 피해 확률 · 배수 (battle_design §9-2 · 2026-09-10).
 * `def` 가 `scaleDef` 를 안 지난 원시 정의여도 `flat` 은 0 으로 읽는다. 기본 공격은 이것을 안 만든다
 */
const skillHit = def => ({ flat: def.flat ?? 0, procChance: def.procChance ?? 0, procMult: def.procMult ?? 0 });

/**
 * 공격 대상 4종 — 각 함수가 「누구를 몇 번 어떤 배율로」만 정하고, 타격 자체는 `rt.strikeOnce` 가 한다.
 * @param rt   skill_runtime 이 만든 런타임 — `rng` · `strikeOnce` · `pickTarget` 을 쓴다
 * @param u    시전자 · @param def 스킬 정의 · @param foes **생존** 적 배열(호출자가 걸러 준다)
 */
export const ATTACK_TARGETS = {
    /** 단일 다단 — 대상을 한 번 고르고 `hits` 회. 대상이 쓰러지면 남은 타수는 버린다 */
    enemy_single: (rt, u, def, foes) => {
        const tgt = rt.pickTarget(u, foes);
        const sk = skillHit(def);
        for (let k = 0; k < def.hits; k++) {
            if (u.hp <= 0 || tgt.hp <= 0) break;
            rt.strikeOnce(u, tgt, def.mult / 100, def.element, def.id, sk);
        }
    },
    /**
     * 광역 — 생존 적 배열 순 전원에게 각 1회. 대상을 고르지 않으므로 **타겟 rng 를 쓰지 않는다**.
     * **광역 약화** [2026-09-10 · skill_design §13-5 멀티샷] — `decay > 0` 이면 **주 대상**만 배율 그대로이고 나머지는 `decay` 만큼 준다.
     *   주 대상 = 전열 생존자 중 배열 첫 번째(전열이 비면 생존자 첫 번째) — 고르는 굴림이 없어 **rng 0회** 그대로다.
     *   전열 판정은 battle.js `frontOf` 와 같은 규칙이다(랭크가 없으면 전열). `decay = 0` 이면 종전과 똑같다
     */
    enemy_all: (rt, u, def, foes) => {
        const sk = skillHit(def);
        const primary = def.decay > 0
            ? (foes.find(f => f.hp > 0 && (f.rank ?? 0) === 0) ?? foes.find(f => f.hp > 0) ?? null)
            : null;
        const weak = (def.mult / 100) * (1 - def.decay / 100);
        for (const tgt of foes) {
            if (u.hp <= 0) break;
            if (tgt.hp > 0) rt.strikeOnce(u, tgt, primary === null || tgt === primary ? def.mult / 100 : weak, def.element, def.id, sk);
        }
    },
    /** 순환 — 시작점만 굴리고(rng 1회) 배열 순으로 돌아가며 `hits` 회. 대상이 모자라면 같은 대상에 겹친다 */
    enemy_rotate: (rt, u, def, foes) => {
        // 시작점은 **고르는 행위**라 전열 우선을 탄다 (battle_design §3-1 개정 2026-09-09) —
        //   `pickTarget` 이 굴림 1회를 그대로 쓰므로 소비 수열은 안 밀린다. 도는 것은 배열 전체다
        const start = foes.indexOf(rt.pickTarget(u, foes));
        const sk = skillHit(def);
        for (let k = 0; k < def.hits; k++) {
            if (u.hp <= 0) break;
            const tgt = foes[(start + k) % foes.length];
            if (tgt.hp > 0) rt.strikeOnce(u, tgt, def.mult / 100, def.element, def.id, sk);
        }
    },
    /**
     * 최고 방어 대상 다단 — **가장 방어값이 높은 적**을 골라 `hits` 회. 동률이면 배열 순 앞이라 **rng 를 안 쓴다**.
     * 타격마다 그 대상의 방어값이 `decay` 만큼 준다(누적 곱) — 가이드에로우 (skill_design §12-5).
     * 09-08 기본 타겟팅 확정의 **예외 둘째**다 — 대상 선택을 바꾸는 경로라 §7 이 늘리지 말라고 적어 둔 자리다
     */
    enemy_highest_def: (rt, u, def, foes) => {
        let tgt = foes[0];
        for (const f of foes) if (f.def > tgt.def) tgt = f;
        const sk = skillHit(def);
        for (let k = 0; k < def.hits; k++) {
            if (u.hp <= 0 || tgt.hp <= 0) break;
            rt.strikeOnce(u, tgt, def.mult / 100, def.element, def.id, sk);
            // 방어 감소는 **밑수까지** 깎는다 — 창이 다시 파생돼도 되돌아오지 않게 (guard_pct 와 같은 축이다)
            tgt.defBase = Math.max(0, tgt.defBase * (1 - def.decay / 100));
            tgt.def = Math.max(0, tgt.def * (1 - def.decay / 100));
        }
    },
    /** 연쇄 — 시작점만 굴리고(rng 1회 · **전열 우선**) 전원을 한 바퀴, 순서마다 배율이 `decay` 만큼 곱으로 준다 */
    enemy_chain: (rt, u, def, foes) => {
        const start = foes.indexOf(rt.pickTarget(u, foes));   // 시작점만 고른다 — 전열 우선 (§3-1)
        const sk = skillHit(def);
        for (let k = 0; k < foes.length; k++) {
            if (u.hp <= 0) break;
            const tgt = foes[(start + k) % foes.length];
            if (tgt.hp > 0) rt.strikeOnce(u, tgt, (def.mult / 100) * Math.pow(1 - def.decay / 100, k), def.element, def.id, sk);
        }
    },
};

/**
 * heal · buff · aura 의 아군 대상 — 굴릴 것이 없다(전부 결정론).
 *   `ally_single`    — **HP 비율 최저 아군** 하나 [사용자 확정 2026-09-09]. 무작위가 아니라 rng 를 안 쓴다
 *   `party_adjacent` — **양 옆의 아군**(자기 제외) — `party` 배열의 인접 자리다.
 *                      ⚠ 위치 개념은 미확정이고(§9-1 규칙 5) 배열 순서를 자리로 읽는 **임시 규칙**이다 (§7)
 */
export const SUPPORT_TARGETS = ['self', 'party', 'ally_single', 'party_adjacent'];

/**
 * **적에게 거는 창**(디버프) — 참회 · 속박 · 결투 선언. 새 채널을 만들지 않고 같은 창을
 *   **음수 `effect_value`** 로 반대로 쓴다 [사용자 확정 2026-09-09]. 몬스터도 같은 유닛 생성자를 지나
 *   `buffs` 를 들기 때문에 성립한다 (battle.js:makeUnit).
 *   `enemy_single` 의 지목은 **생존 적 중 HP 최대** 하나라 rng 를 안 쓴다 (skill_design §12-4 ⚠ 조건)
 */
export const DEBUFF_TARGETS = ['enemy_single', 'enemy_all'];

/** `skill.csv:target` 어휘 전체 — 적 대상 5 + 아군 대상 4 (디버프 대상은 적 대상 표에 이미 있다) */
export const TARGETS = [...new Set([...Object.keys(ATTACK_TARGETS), ...SUPPORT_TARGETS])];

/**
 * 버프 효과 — `skill.csv:effect_stat` 어휘가 곧 이 표의 키다.
 *   `derive(u, sum)`             — 그 stat 의 **창 합**으로 파생값을 다시 쓴다(sum 0 이면 원값 복원)
 *   `apply(rt, tgt, def, until, ev)` — 시전 순간 한 번. 창 밖에 따로 만들 것이 있는 효과만 든다
 * 둘 다 없는 항목(`taunt`)은 **표식**이다 — 소비자는 battle.js 의 타겟팅이다.
 */
export const EFFECTS = {
    // 상시 % 와 같은 괄호에 덧셈 — 새 곱셈 층이 아니다 (battle_design §9-2).
    // 회복 밑수(matk)도 **같은 괄호**를 탄다 — 공격 창이 회복만 비껴가면 힐러의 창이 반쪽이 된다
    atk_pct: {
        derive: (u, sum) => {
            const mult = 1 + (u.atkPct + sum) / 100;
            u.atk = u.atkBase * mult;
            u.matk = u.matkBase * mult;
        },
    },
    // 주기는 다음 차례 예약부터 — 이미 잡힌 u.next 는 건드리지 않는다 (INTERFACE §2-6)
    period_pct: { derive: (u, sum) => { u.period = u.basePeriod * (1 - sum / 100); } },
    // HP 밖 흡수 풀 — 창이 끝나면 남은 흡수량은 사라진다 (skill_design §9-3)
    barrier_pct: {
        apply: (rt, tgt, def, until, ev) => {
            const amt = Math.round(tgt.hpMax * def.value / 100);
            tgt.barrier = { amt, until, s: def.id };
            ev.amt = amt;
        },
    },
    // 방어값 % + 전 저항 %p 를 **함께** 민다 — 전사 외침. 한 행이 채널 하나만 들어서 둘을 한 효과로 묶었다
    guard_pct: {
        derive: (u, sum) => {
            u.def = u.defBase * (1 + sum / 100);
            for (const k of Object.keys(u.res)) u.res[k] = u.resBase[k] + sum;
        },
    },
    // ── 무기 옵션 창 둘 [2026-09-11 · R78 · item_design §1 「무기 옵션」] — **스킬 행은 쓰지 않는다**(`battle.strikeOnce` 가 타격 시 건다).
    //   `guard_pct` 와 **같은 축**(방어값 · 저항)을 밀므로 guard 의 창 합까지 함께 다시 쓴다 — 표 순서상 guard 뒤라 마지막에 쓴 값이 둘을 다 든다
    // 방어값 % — 물리 무기 통합옵션 「타격 시 대상 방어력 감소」(음수)
    def_pct: {
        derive: (u, sum) => { u.def = u.defBase * (1 + (sum + buffSumOf(u, 'guard_pct')) / 100); },
    },
    // 원소 하나의 저항 %p — 마법 무기 통합옵션 「타격 시 그 원소의 대상 저항 감소」(음수). 창이 든 `element` 칸만 민다
    res_elem: {
        derive: u => {
            const guard = buffSumOf(u, 'guard_pct');
            for (const k of Object.keys(u.res)) u.res[k] = u.resBase[k] + guard;
            for (const b of Object.values(u.buffs)) if (b.stat === 'res_elem' && b.element in u.res) u.res[b.element] += b.v;
        },
    },
    // 최대 HP 창 — 열릴 때 늘어난 만큼 현재 HP 도 올리고(apply), 닫힐 때 넘친 HP 를 깎는다(derive)
    hp_max_pct: {
        derive: (u, sum) => {
            u.hpMax = Math.round(u.hpMaxBase * (1 + sum / 100));
            if (u.hp > u.hpMax) u.hp = u.hpMax;
        },
        apply: (rt, tgt, def, until, ev) => {
            const add = Math.round(tgt.hpMaxBase * def.value / 100);
            tgt.hp += add;
            ev.amt = add;
        },
    },
    // HP 재생 창 — 09-07 확정 구조(레벨 곡선 밑수)에 **얹는다**. 밑수가 0 이면 아무 일도 없다
    regen_pct: { derive: (u, sum) => { u.regen = u.regenBase * (1 + sum / 100); } },
    // 받는 피해 감소 — 감쇠 뒤 곱이고 원천별로 각각 곱한다 (battle_design §9-3). 방어·저항과 채널이 다르다
    dr_pct: { derive: (u, sum) => { u.dr = u.drBase + sum; } },
    // 평타 부여 둘 — derive 도 apply 도 없는 **표식**이다. 소비자는 skill_runtime 의 기본 공격 분기다
    //   onhit_element  원소 추가타 1회 (인챈트 · 독화살) — 창이 든 `element` 로 때린다
    //   attack_splash  기본 공격이 단일 → 광역 (관통 사격) — 그때 배율이 창의 값 % 가 된다
    onhit_element: {},
    attack_splash: {},
    // 지목 — 소비자는 battle.js 의 타겟팅이다. 창은 **지목당한 적**이 들고 `by` 에 시전자 key 가 실린다.
    //   시전자 쪽은 `skill_runtime.castBuff` 가 같은 until 의 `dr_pct` 창을 연다(effect_value = 받는 피해 감소 % · 2026-09-10)
    duel: {},
    taunt: {},
};

export const EFFECT_STATS = Object.keys(EFFECTS);

/**
 * 발동 조건 — 거짓이면 **준비된 것으로 치지 않는다** (skill_design §9-3).
 * @param ctx {self, allies} — allies = 생존 아군 배열(self 포함)
 */
export const CONDITIONS = {
    buff_absent: (def, ctx) => !(ctx.self.buffs && ctx.self.buffs[def.id]),
    ally_hp_below: (def, ctx) => (ctx.allies ?? []).some(a => a.hp > 0 && a.hp / a.hpMax * 100 < def.condValue),
};

export const CONDITION_IDS = Object.keys(CONDITIONS);

/**
 * 파생값 재계산 — `EFFECTS` 의 **키 순서대로** derive 를 부른다(지금은 atk_pct → period_pct).
 * 창이 하나도 없어도 전부 다시 쓴다 — 그래야 마지막 창이 사라진 자리에 원값이 돌아온다.
 */
export function refreshDerived(u) {
    for (const [stat, h] of Object.entries(EFFECTS)) {
        if (!h.derive) continue;
        let sum = 0;
        for (const b of Object.values(u.buffs)) if (b.stat === stat) sum += b.v;
        h.derive(u, sum);
    }
}

/** 한 유닛의 한 stat 창 합 — guard 와 같은 축을 미는 무기 옵션 창(`def_pct` · `res_elem`)이 guard 몫까지 함께 다시 쓸 때 쓴다 */
function buffSumOf(u, stat) {
    let s = 0;
    for (const b of Object.values(u.buffs)) if (b.stat === stat) s += b.v;
    return s;
}

/**
 * 무기 옵션의 타격 시 창 셋 [2026-09-11 · R78 · item_design §1 「무기 옵션」] — `battle.strikeOnce` 가 적중 직후 부른다.
 * **rng 0 · 타임라인 이벤트 없음** — 창에 `quiet` 을 달아 만료도 조용하다(`skill_runtime.expire`).
 *   방어력 감소 · 공격력 감소 = **겹치지 않는다** — 대상의 창 하나에 센 값만 남고 시간만 갱신된다
 *   원소 저항 감소 = **영웅끼리 중첩** — 공격자 · 원소마다 창이 따로 서고, 같은 영웅의 재타격은 시간만 갱신한다
 *   공격력 감소는 **공격 타입이 맞는 대상**에만 — 물리 감소 = 물리 공격 · 마법 감소 = 원소 공격
 * @param u 공격자 · @param fx 공격자의 무기 옵션 묶음(`hero.computeCombat:option_fx`) · @param d 대상 · @param type 그 타격의 공격 타입
 * @param t 지금 시각(초) · @param sec `{def, res, atk}` 창 길이 — [balance.csv:weapon_def_down_sec] · `weapon_res_down_sec` · `weapon_atk_down_sec`
 * @returns 창이 하나라도 섰는가
 */
export function weaponOnHit(u, fx, d, type, t, sec) {
    let changed = false;
    const strongest = (key, stat, pct, dur) => {
        const cur = d.buffs[key];
        d.buffs[key] = { stat, v: cur ? Math.min(cur.v, -pct) : -pct, until: t + dur, element: null, by: u.key, quiet: true };
        changed = true;
    };
    if (fx.defDown > 0) strongest('wx:def_down', 'def_pct', fx.defDown, sec.def);
    const atkDown = d.atkType === 'physical' ? fx.atkDownPhys : fx.atkDownMag;
    if (atkDown > 0) strongest('wx:atk_down', 'atk_pct', atkDown, sec.atk);
    if (fx.resDown > 0 && type !== 'physical' && type in d.res) {
        d.buffs[`wx:res_down:${u.key}:${type}`] = { stat: 'res_elem', v: -fx.resDown, until: t + sec.res, element: type, by: u.key, quiet: true };
        changed = true;
    }
    if (changed) refreshDerived(d);
    return changed;
}
