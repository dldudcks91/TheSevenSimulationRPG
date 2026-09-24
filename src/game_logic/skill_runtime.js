/**
 * 액티브 **실행** — 시전 · 쿨 · 창 · 배리어 · 회복 · 사건. 정의·배정·선택은 `skill.js`, 종류 표는 `skill_effects.js`.
 *
 * 순수 모듈 — DOM·저장소·시계·Math.random 접근 없음. 시각은 인자(`t`, 초), 난수는 주입(`ctx.rng`).
 * **전역 상태 없음** — `battle.simulate` 가 전투 하나마다 런타임을 새로 만든다. 유닛·타임라인은 만들어 준 쪽 것이고
 *   런타임은 그것을 **제자리에서** 바꾼다(HP·창·배리어·쿨은 전투 안에서만 사는 값이라 세이브에 안 들어간다 · INTERFACE §4).
 *
 * battle_design.md / skill_design.md 확정 규칙:
 *   · 한 차례에 하나 (battle_design §3) — 준비된 것이 없으면 기본 공격. 발동 선택은 rng 를 쓰지 않는다
 *   · 쿨은 실시간 초 (battle_design §6) — 시전 순간 `readyAt = t + cooldownSec`. **처음엔 준비 상태다**(전투 시작 · 등장 — battle.js 가 박는다 · R100) · 원정 도중 새로 생긴 스킬만 첫 준비 시각에 같은 식을 쓴다
 *   · 버프 창도 실시간 초 (battle_design §7) — 중첩 없이 재시전은 `until` 갱신, 다른 효과의 같은 stat 은 덧셈
 *   · 창 만료는 행동 순회 **앞에서** 한 번에 (rng 를 안 쓰므로 수열이 밀리지 않는다)
 *   · 회복 밑수는 마법 공격력 **범위** (battle_design §9-1 · §9-2) — **시전마다 양을 한 번 굴린다**(rng 1회 · R90). 능력치 계수(`statMult`)를 곱한다(2026-09-18 — ~~능력치 항 `flat` 을 더한다~~).
 *     받는 쪽의 **체력 회복 +%**(갑옷 나태 · 2026-09-18)가 그 대상만 늘린다
 *   · **스킬 계수** (skill_design §13 · 2026-09-10) — 시전 순간 `SK.scaleDef(def, u.stats)` 로 실효 정의를 한 번 만들고
 *     그 **하는 일 줄**(시전 단위 `x`)을 차례로 실행한다 — 대상 표·회복·버프·소환이 전부 `x` 를 읽는다. 쿨은 원값이다(`cool_sec` 은 슬롯이 못 민다 — §13-1)
 *   · **하는 일은 표가 실행한다** [2026-09-22 · R136 · PLAN_skill_structure] — `skill_effects.js:EFFECT_TYPES[x.effect].run`. ~~`kind` 로 가르던 if 사슬~~ 은 없다.
 *     `castHeal` · `castBuff` · `castSummon` · `castCall` 은 **시전 단위 하나**를 받는다(줄 + 스킬 id · 그 줄의 대상 + 걸린 효과를 푼 값) — 계산 · rng · 이벤트는 그대로다
 *   · **표준 모양** [2026-09-24 · R151 · PLAN_skill_structure 2단계] — 시전 한 번 = **하는 일 줄을 `seq` 순으로**(`cast` — 차례 · 사건이 같이 쓴다) ·
 *     창 열쇠 = **걸린 효과 id**(창이 건 스킬 id `s` 를 들어 이벤트는 그대로) · 사건 스킬은 `fire` 가 쏜다 · **스킬 id 전용 분기는 없다**
 *     (~~결투의 시전자 창 분기~~ → 결투의 둘째 줄 · ~~`battle.js:blast`~~ → `fire` + 하는 일 `fixed`)
 *
 * ⚠ 아직 미확정이라 이 파일이 임시로 두는 것:
 *   사건 훅(`reactions`)은 **발화 지점만** 있고 등록하는 소비자가 아직 없다 — 마스터리 T3 자리 (skill_design §5).
 */

import { createFormula } from './formula.js';
import { EFFECT_TYPES, EFFECTS, EVENT_TRIGGERS, PICK_TARGETS, refreshDerived, sumOf, stateOf } from './skill_effects.js';

/**
 * 사건 훅 — 유닛이 든 `reactions: [{on, fn}]` 를 **배열 순서대로** 부른다. 등록이 없으면 아무 일도 없다.
 * 핸들러가 rng 를 쓰면 **발화 지점에서** 소비한다 — 그래서 발화 위치가 곧 결정론 계약이다 (INTERFACE §5-2).
 * @returns {{emit: (name: string, unit: object, payload: object) => void}}
 */
export function createHooks() {
    const emit = (name, unit, payload) => {
        for (const r of unit?.reactions ?? []) if (r.on === name) r.fn(unit, payload);
    };
    return { emit };
}

/**
 * 쿨 한 바퀴의 길이(초) — 시전 뒤의 `readyAt` 과 **원정 도중 새로 생긴 스킬의 첫 준비 시각**(갈아입기)이 같은 식을 쓴다 [2026-09-14 · R89 · 개정 2026-09-15 R100 — 전투 시작 · 등장은 준비 상태로 출발해 안 쓴다].
 * 쿨감소는 **표기 쿨에 곱**하고(combat_stat:cooldown_reduction) [balance.csv:skill_cd_floor_mult] 배수 밑으로는 안 내려간다 —
 * 0 이면 스킬이 매 차례 나가 예산이 무너진다 (battle_design §6)
 */
export function cooldownSec(B, u, def) {
    return (def.cool ?? 0) * Math.max(B.skill_cd_floor_mult, 1 - (u.cdr ?? 0));      // 쿨감소는 비율 (R111)
}

/**
 * @param {object} ctx  전투 하나의 문맥 — 전부 `battle.simulate` 가 넘긴다
 *   SK          — skill.js (발동 선택 `pickReady` · 조건 `castable`). 없으면 액티브 없이 기본 공격만 돈다
 *   B           — balance.csv — [balance.csv:skill_cd_floor_mult] 쿨 바닥을 읽는다 · 제 `formula` 를 만든다(고정 피해의 `indirect`)
 *   rng         — 주입 난수. 이 파일이 쓰는 곳은 공격 대상 표의 시작점 굴림과 회복량 굴림(R90)이다
 *   timeline    — 재생용 이벤트 배열 (제자리에 push)
 *   out         — 전투 결과 (여기서는 `casts` 만 센다)
 *   units       — `{party, enemies}`. **`enemies` 는 라운드마다 갈아 끼워지는 속성**이라
 *                 런타임은 항상 `ctx.units.enemies` 를 읽는다(변수로 복사해 두면 옛 라운드를 가리킨다)
 *   strikeOnce  — `(u, target, mult, element, s, sk?)` 직격 1회. 기본 공격과 스킬 타격이 같은 함수를 쓴다.
 *                 `sk = {statMult, procChance, procMult}` 는 스킬 타격만 넘긴다(공격 대상 표) — 기본 공격은 안 넘긴다(메인 스탯 계수)
 *   pickTarget  — `(u, foes)` 단일 대상 선택 (도발·결투 규칙을 아는 쪽은 battle.js 다)
 *   makeSummon  — `(caster, def)` 소환 유닛 하나. **유닛 생성자는 battle.js 것**이라 만드는 일을 그쪽에 맡긴다
 *   callBand    — `(caster, t) → {units: [표시값], then: [이벤트]}` 불러내기 — 시전자의 무리 중 서 있지 않은 것을 전부 세운다(2026-09-18 · INTERFACE §2-13).
 *                 적 배열 · 오오라 · 보상 표식을 아는 쪽이 battle.js 라 세우는 일을 그쪽에 맡긴다
 *   dealIndirect — `(a, d, dmg, s)` 비직격 고정 피해 한 대상(하는 일 `fixed` · 2026-09-24 R151) — HP 차감 · `blast` 이벤트 · 기여 · 전투불능은
 *                 기여표와 전투불능을 아는 쪽이 battle.js 라 그쪽에 맡긴다
 *   r1          — 타임라인 시각 반올림 (소수 1자리 · INTERFACE §5-3)
 *   EPS         — 준비·만료 판정 허용 오차
 *   hooks       — createHooks() 결과
 */
export function createSkillRuntime(ctx) {
    const { SK, B, rng, timeline, out, units, r1, EPS, hooks } = ctx;
    const F = createFormula(B);      // 고정 피해의 `indirect` — 무상태 순수 함수라 battle.js 의 것과 같은 값을 낸다 (code_conventions §2)

    const alive = list => list.filter(u => u.hp > 0);
    const alliesOf = u => (u.side === 'party' ? units.party : units.enemies);
    const foesOf = u => (u.side === 'party' ? units.enemies : units.party);

    /** 창 만료 — 행동 순회 **앞에서** 처리한다. rng 를 쓰지 않으므로 수열이 밀리지 않는다 */
    function expire(u, at) {
        let changed = false;
        const wasMax = u.hpMax;     // 최대 HP 를 밀던 창이 닫히면 재생기에 새 값을 줘야 한다 (부채 #50)
        const shown = [];           // 이 틱에 낸 `buffEnd` 들 — 조용한 창(`quiet`)은 안 든다
        for (const id of Object.keys(u.buffs)) {
            const b = u.buffs[id];
            if (b.until <= at + EPS) {
                // `quiet` = 무기 옵션 창(타격 시 디버프 · R78) — 열 때 이벤트를 안 냈으므로 닫을 때도 안 낸다(재생기는 `s` 로 스킬 이름을 찾는다)
                delete u.buffs[id];
                // `s` = 그 창을 건 스킬 — 창 열쇠는 걸린 효과 id 다 (2026-09-24 · R151). 손으로 만든 창(`s` 없음)은 열쇠를 쓴다
                if (!b.quiet) { const ev = { t: r1(at), e: 'buffEnd', u: u.key, s: b.s ?? id }; shown.push(ev); timeline.push(ev); }
                changed = true;
            }
        }
        // 배리어도 같은 조건 — 창이 끝나면 남은 흡수량은 사라진다 (skill_design §9-3)
        if (u.barrier && u.barrier.until <= at + EPS) u.barrier = null;
        if (changed) refreshDerived(u);
        // 최대 HP 가 줄었으면 **마지막 `buffEnd`** 가 새 최대치와 잘린 현재 HP 를 싣는다 [2026-09-21 · 부채 #50 · INTERFACE §2-6 · §6].
        //   한 틱에 여러 창이 닫혀도 실린 값은 전부 닫힌 뒤의 상태라 마지막 하나면 족하다 — 재생기는 계산하지 않는다
        if (u.hpMax !== wasMax && shown.length) Object.assign(shown[shown.length - 1], { hpMax: u.hpMax, dhp: u.hp });
    }

    /**
     * 고르는 대상 — heal · apply(버프 · 적에게 거는 창 · 오오라) · 고정 피해가 쓴다(`x.target` — 그 줄의 대상).
     *   고르는 규칙은 등록표 `PICK_TARGETS` 가 든다(2026-09-24 · R151 — ~~여기 있던 switch~~) · **전부 결정론이라 rng 를 한 번도 안 쓴다**
     *   (INTERFACE §5-2 — 대상 선택이 굴림을 쓰는 것은 공격 표의 단일 · 순환 · 연쇄뿐이다). 모르는 대상은 시전자 하나다(로드가 막는다 — 손으로 만든 시전 단위만 온다)
     */
    function targetsOf(u, x) {
        const t = PICK_TARGETS[x.target];
        return t ? t.pick(rt, u) : [u];
    }

    /**
     * 회복 — 마법 공격력 **굴림** × 배율 **× 능력치 계수**. 대상은 `targetsOf` 가 정한다(결정론). **rng 1회** —
     * 시전 한 번에 한 번 굴려 대상 전원이 같은 양을 받는다 (battle_design §9-1 · §9-2 · R90).
     * `def` 는 `scaleDef` 가 낸 시전 단위(`heal` 줄)다 — `statMult` 가 없으면 1 로 읽는다 (2026-09-18 — ~~`+ flat`~~)
     */
    function castHeal(u, def, t) {
        const matk = u.matkMin + rng() * (u.matkMax - u.matkMin);   // 회복량 굴림 — 대상 선택 앞 · 양끝이 같아도 1회 (R90)
        const amt = Math.round(matk * def.mult * (def.statMult ?? 1));  // 배율은 비율 (R111) · 능력치 계수는 곱 (2026-09-18)
        const targets = targetsOf(u, def);
        for (const tgt of targets) {
            // 받는 쪽의 체력 회복 +%(갑옷 나태 · 2026-09-18) — 그 대상만 늘어난다 · 이벤트의 `amt` 가 받은 양이다. 0 이면 종전과 같다(rng 0)
            const got = tgt.recv ? Math.round(amt * (1 + tgt.recv)) : amt;
            tgt.hp = Math.min(tgt.hpMax, tgt.hp + got);
            timeline.push({ t: r1(t), e: 'heal', a: u.key, d: tgt.key, amt: got, dhp: tgt.hp, s: def.id });
        }
    }

    /**
     * 버프 창 — 중첩 없음, 같은 효과 재시전은 `until` 갱신. 창 밖에 만들 것이 있는 효과는 표의 `apply` 가 한다.
     * **적에게도 건다** — 대상이 적 쪽(`PICK_TARGETS[..].side = enemy`)이면 음수 값의 디버프다 [사용자 확정 2026-09-09].
     * 창에 함께 싣는 것 — `element`(평타 부여가 무슨 원소로 때리나) · `by`(지목한 자가 누구인가) · `s`(건 스킬 — 이벤트의 `s`) · `roundEnd`(라운드 경계 규칙).
     * `def` 는 `scaleDef` 가 낸 시전 단위(`apply` 줄)다 — **걸린 효과를 푼 값**이라 창의 `stat`·`v`·`until`·`element`·`roundEnd` 가 그 행이고(`v`·`until` 은 능력치로 민 값 · 2026-09-10),
     *   **창의 열쇠는 걸린 효과 id**(`def.status`)다 [2026-09-24 · R151 — ~~거는 스킬 id~~ 는 한 스킬이 한 유닛에 효과 둘을 걸면 뒤 줄이 앞 줄을 덮었다] —
     *   같은 효과 재시전 = 갱신 · 다른 효과의 같은 능력치 = 덧셈 (S2-a). 손으로 만든 시전 단위(`status` 없음)는 스킬 id 를 열쇠로 쓴다
     */
    function castBuff(u, def, t) {
        const targets = targetsOf(u, def);
        // 버프 지속시간 +%(반지 · 목걸이 공통옵션 · 2026-09-21 · R127) — **거는 쪽** 값이다. 적에게 거는 창도 같은 `until` 을 쓴다 · 0 이면 종전과 같다
        const until = t + def.dur * (1 + (u.buffDur ?? 0));
        const key = def.status ?? def.id;
        for (const tgt of targets) {
            const wasMax = tgt.hpMax;
            tgt.buffs[key] = { stat: def.stat, v: def.value, until, element: def.element ?? null, by: u.key, s: def.id, roundEnd: def.roundEnd ?? 'keep' };
            const ev = { t: r1(t), e: 'buff', u: tgt.key, s: def.id, stat: def.stat, v: def.value, until: r1(until) };
            EFFECTS[def.stat]?.apply?.(rt, tgt, def, until, ev);
            // **밀고 나서 싣는다** — 최대 HP 를 미는 창(`hp_max_pct`)은 `refreshDerived` 가 새 최대치를 쓰고 넘친 HP 를 자른 **뒤**의 값이어야 한다
            //   [2026-09-21 · 부채 #50 · INTERFACE §2-6 · §6]. 재생기는 계산하지 않으므로 안 실으면 옛 최대치를 든 채 현재 HP 만 갱신해 `118 / 103` 이 된다
            refreshDerived(tgt);
            if (tgt.hpMax !== wasMax) Object.assign(ev, { hpMax: tgt.hpMax, dhp: tgt.hp });
            timeline.push(ev);
        }
        // ~~결투면 시전자에게 같은 until 의 dr_pct 창을 연다~~ — 2026-09-24 R151 결투의 **둘째 줄**(`kni_duel_guard` · `self`)이 건다. 스킬 id 전용 분기는 없다
    }

    /**
     * 소환 — **HP 를 가진 유닛**을 아군 배열에 세운다 (skill_design §12-6 프로즌월).
     * 유닛은 행동하지 않고 **대상 풀에만 들어간다** — 그래서 적의 무작위 대상 굴림의 모집단이 커지고
     *   파티 각자의 피격 확률이 내려간다. 그 희석이 이 스킬의 파워다.
     * ⚠ 라운드가 끝나면 사라진다 — 걷어내는 쪽은 battle.js 의 `beginRound` 다.
     */
    function castSummon(u, def, t) {
        const unit = ctx.makeSummon(u, def);
        if (!unit) return;
        alliesOf(u).push(unit);
        timeline.push({ t: r1(t), e: 'summon', u: u.key, d: unit.key, s: def.id, hpMax: unit.hpMax });
    }

    /**
     * 불러내기 — **몬스터 전용** (skill_design §12-9 · INTERFACE §2-13 · 2026-09-18). 시전자의 무리(`band`) 중
     *   서 있지 않은 것(아직 안 나왔거나 쓰러진 것)을 **한 번에 전부** 세운다 — 벽(`castSummon`)과 달리 **진짜 몬스터**다.
     *   세우는 일은 battle.js(`callBand`)가 하고 여기는 이벤트만 남긴다. 발동 조건 `band_missing` 이 빈 부름을 막는다 · rng 0
     */
    function castCall(u, def, t) {
        const { units, then } = ctx.callBand(u, t);
        if (!units.length) return;
        timeline.push({ t: r1(t), e: 'call', u: u.key, s: def.id, units });
        // 새로 선 유닛의 오오라 창 — `call` 뒤에 낸다(재생기는 카드가 서야 창을 단다 · `round` 뒤의 오오라와 같은 규칙)
        for (const ev of then) timeline.push({ t: r1(t), ...ev });
    }

    /**
     * 기본 공격 — **평타 부여 창이 여기서 읽힌다** (skill_design §12-4·§12-5 인챈트 · 관통 사격 · 독화살).
     *   `attack_splash`  단일 → 광역. 그때 배율이 창 합(비율)이다 (창이 없으면 1배 단일)
     *   `onhit_element`  때린 대상마다 원소 추가타 1회 — 첫 창의 원소 · 값(둘을 겹쳐 든 경우는 먼저 걸린 것) · `s` = 그 창을 건 스킬. **스킬 타격에는 안 붙는다**
     * ⚠ 창이 켜지면 타격 수가 늘어 rng 소비도 는다 — 창이 없을 때의 수열은 종전과 **완전히 같다**
     * @param forced 대상을 정해 준다 — **반격**이 때린 쪽을 넘긴다(battle.strikeOnce · 2026-09-18). 주면 타겟 굴림(`pickTarget`)을 **안 쓴다** ·
     *   광역 창이 켜져 있으면 평타처럼 적 전원이다(「반격은 평타와 모든 로직이 같다」 · 사용자)
     */
    function basicAttack(u, t, foes, forced = null) {
        const splash = sumOf(u, 'attack_splash');
        const targets = splash > 0 ? foes.slice() : [forced ?? ctx.pickTarget(u, foes)];
        for (const tgt of targets) {
            if (u.hp <= 0 || tgt.hp <= 0) continue;
            ctx.strikeOnce(u, tgt, splash > 0 ? splash : 1, null);
        }
        const oh = stateOf(u, 'onhit_element');
        if (!oh) return;
        const [key, win] = oh;
        for (const tgt of targets) {
            if (u.hp <= 0 || tgt.hp <= 0) continue;
            ctx.strikeOnce(u, tgt, win.v, win.element, win.s ?? key);
        }
    }

    /**
     * **시전 한 번** [2026-09-24 · R151 · PLAN_skill_structure 2단계] — 시전자 능력치로 한 번 민 뒤(skill_design §13 · 2026-09-10 — 전투와 설명창이 같은 함수)
     *   **하는 일 줄을 `seq` 순으로** 실행한다. 차례(`act`)와 사건(`fire`)이 같이 쓴다 — `skill` 이벤트 · 시전 수 · 쿨은 부르는 쪽 몫이다.
     *   줄마다 살아 있는 적을 **다시 본다** — 앞 줄이 쓰러뜨린 적은 뒤 줄의 대상이 아니고, 적이 없으면 적을 쓰는 줄(`foes`)은 건너뛴다(굴림도 없다).
     *   능력치 계수는 영웅 · 몬스터가 같이 탄다 (2026-09-22 — 보류 해제 · battle_design §9-2)
     */
    function cast(u, def, t) {
        const eff = SK.scaleDef(def, u.stats ?? null);
        for (const x of eff.effects) {
            const type = EFFECT_TYPES[x.effect];
            const foes = alive(foesOf(u));
            if (type.foes && foes.length === 0) continue;
            type.run(rt, u, x, t, foes);
        }
    }

    /**
     * 사건 [2026-09-24 · R151 — ~~`battle.js:blast` 전용 함수~~] — 그 유닛의 칸에서 `cast = event` · `cast_condition = name` 인 스킬을 **칸 순서대로** 쏜다.
     *   `EVENT_TRIGGERS[name].once` 면 **한 유닛 한 번** — 쏘기 **전에** `u.fired` 에 세운다(되살아나도 안 풀린다 — 보상 `rewarded` 와 같은 규칙).
     *   차례가 아니라서 `skill` 이벤트 · 시전 수 · `cast` 훅 · 쿨을 안 남긴다(종전 그대로). 부르는 자리는 사건을 아는 쪽이다 — `on_death` = battle.js `downed` 끝
     */
    function fire(u, name, t) {
        const trig = EVENT_TRIGGERS[name];
        for (const a of u.actives ?? []) {
            if (a.def.cast !== 'event' || a.def.cond !== name) continue;
            if (trig?.once) {
                u.fired ??= {};
                if (u.fired[a.def.id]) continue;
                u.fired[a.def.id] = true;
            }
            cast(u, a.def, t);
        }
    }

    /** 한 차례 — 준비된 액티브 하나를 쓰고, 없으면 기본 공격 (battle_design §3) */
    function act(u, t) {
        const foes = alive(foesOf(u));
        if (foes.length === 0) return;
        // 발동 선택 — rng 를 쓰지 않는다. 조건이 거짓인 것은 준비된 것으로 치지 않는다 (skill_design §9-3)
        const sel = SK && u.actives.length
            ? SK.pickReady(u.actives, t, a => SK.castable(a.def, { self: u, allies: alive(alliesOf(u)) }))
            : null;
        if (!sel) {
            basicAttack(u, t, foes);
            return;
        }
        const def = sel.def;
        // 쿨은 실시간 초 — 시전 순간부터 (battle_design §6). 쿨감소는 **표기 쿨에 곱**한다 (combat_stat:cooldown_reduction)
        sel.readyAt = t + cooldownSec(B, u, def);
        out.casts[def.id] = (out.casts[def.id] ?? 0) + 1;
        // `ready` = 이 스킬이 다시 준비되는 시각. 재생기가 쿨을 **계산하지 않고** 그리게 하려고 함께 싣는다
        timeline.push({ t: r1(t), e: 'skill', u: u.key, s: def.id, ready: r1(sel.readyAt) });
        hooks.emit('cast', u, { t, def });
        // 쿨(`readyAt`)은 위에서 원값으로 이미 잡았다 — `cool_sec` 은 슬롯이 못 민다 (§13-1)
        cast(u, def, t);
    }

    /**
     * 등록표(`skill_effects.js`)의 핸들러가 `rt.strikeOnce`·`rt.pickTarget`·`rt.rng`·`rt.F`·`rt.dealIndirect` 를 부르므로 그것도 같이 싣는다 —
     * 표가 battle.js 를 직접 import 하지 않게 하는 이음매다(표는 상태를 모르고 런타임만 안다).
     */
    const rt = {
        rng, F, strikeOnce: ctx.strikeOnce, pickTarget: ctx.pickTarget, dealIndirect: ctx.dealIndirect,
        alive, alliesOf, foesOf, act, cast, fire, expire, castHeal, castBuff, castSummon, castCall, basicAttack, targetsOf,
    };
    return rt;
}
