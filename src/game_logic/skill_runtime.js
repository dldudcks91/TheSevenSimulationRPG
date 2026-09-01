/**
 * 액티브 **실행** — 시전 · 쿨 · 창 · 배리어 · 회복 · 사건 훅. 정의·배정·선택은 `skill.js`, 종류 표는 `skill_effects.js`.
 *
 * 순수 모듈 — DOM·저장소·시계·Math.random 접근 없음. 시각은 인자(`t`, 초), 난수는 주입(`ctx.rng`).
 * **전역 상태 없음** — `battle.simulate` 가 전투 하나마다 런타임을 새로 만든다. 유닛·타임라인은 만들어 준 쪽 것이고
 *   런타임은 그것을 **제자리에서** 바꾼다(HP·창·배리어·쿨은 전투 안에서만 사는 값이라 세이브에 안 들어간다 · INTERFACE §4).
 *
 * battle_design.md / skill_design.md 확정 규칙:
 *   · 한 차례에 하나 (battle_design §3) — 준비된 것이 없으면 기본 공격. 발동 선택은 rng 를 쓰지 않는다
 *   · 쿨은 실시간 초 (battle_design §6) — 시전 순간 `readyAt = t + cool × 쿨감소`. 전투 시작 시 전부 준비 상태다
 *   · 버프 창도 실시간 초 (battle_design §7) — 중첩 없이 재시전은 `until` 갱신, 다른 스킬의 같은 stat 은 덧셈
 *   · 창 만료는 행동 순회 **앞에서** 한 번에 (rng 를 안 쓰므로 수열이 밀리지 않는다)
 *   · 회복 밑수는 마법 공격력 (battle_design §9-2) — rng 소비 없음
 *
 * ⚠ 아직 미확정이라 이 파일이 임시로 두는 것:
 *   사건 훅(`reactions`)은 **발화 지점만** 있고 등록하는 소비자가 아직 없다 — 마스터리 T3 자리 (skill_design §5).
 */

import { ATTACK_TARGETS, EFFECTS, refreshDerived } from './skill_effects.js';

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
 * @param {object} ctx  전투 하나의 문맥 — 전부 `battle.simulate` 가 넘긴다
 *   SK          — skill.js (발동 선택 `pickReady` · 조건 `castable`). 없으면 액티브 없이 기본 공격만 돈다
 *   B           — balance.csv — [balance.csv:skill_cd_floor_mult] 쿨 바닥을 읽는다
 *   rng         — 주입 난수. 이 파일이 쓰는 곳은 공격 대상 표의 시작점 굴림뿐이다
 *   timeline    — 재생용 이벤트 배열 (제자리에 push)
 *   out         — 전투 결과 (여기서는 `casts` 만 센다)
 *   units       — `{party, enemies}`. **`enemies` 는 라운드마다 갈아 끼워지는 속성**이라
 *                 런타임은 항상 `ctx.units.enemies` 를 읽는다(변수로 복사해 두면 옛 라운드를 가리킨다)
 *   strikeOnce  — `(u, target, mult, element, s)` 직격 1회. 기본 공격과 스킬 타격이 같은 함수를 쓴다
 *   pickTarget  — `(u, foes)` 단일 대상 선택 (도발 규칙을 아는 쪽은 battle.js 다)
 *   r1          — 타임라인 시각 반올림 (소수 1자리 · INTERFACE §5-3)
 *   EPS         — 준비·만료 판정 허용 오차
 *   hooks       — createHooks() 결과
 */
export function createSkillRuntime(ctx) {
    const { SK, B, rng, timeline, out, units, r1, EPS, hooks } = ctx;
    /** 쿨 바닥 — 표기 쿨의 이 배수 밑으로는 안 내려간다. 0 이면 스킬이 매 차례 나가 예산이 무너진다 (battle_design §6) */
    const cdFloor = B.skill_cd_floor_mult;

    const alive = list => list.filter(u => u.hp > 0);
    const alliesOf = u => (u.side === 'party' ? units.party : units.enemies);
    const foesOf = u => (u.side === 'party' ? units.enemies : units.party);

    /** 창 만료 — 행동 순회 **앞에서** 처리한다. rng 를 쓰지 않으므로 수열이 밀리지 않는다 */
    function expire(u, at) {
        let changed = false;
        for (const id of Object.keys(u.buffs)) {
            if (u.buffs[id].until <= at + EPS) {
                delete u.buffs[id];
                timeline.push({ t: r1(at), e: 'buffEnd', u: u.key, s: id });
                changed = true;
            }
        }
        // 배리어도 같은 조건 — 창이 끝나면 남은 흡수량은 사라진다 (skill_design §9-3)
        if (u.barrier && u.barrier.until <= at + EPS) u.barrier = null;
        if (changed) refreshDerived(u);
    }

    /** 회복 — 마법 공격력 × 배율을 생존 아군 전원에게. rng 소비 없음 (battle_design §9-2) */
    function castHeal(u, def, t) {
        const amt = Math.round(u.matk * def.mult / 100);
        const targets = def.target === 'self' ? [u] : alive(alliesOf(u));
        for (const tgt of targets) {
            tgt.hp = Math.min(tgt.hpMax, tgt.hp + amt);
            timeline.push({ t: r1(t), e: 'heal', a: u.key, d: tgt.key, amt, dhp: tgt.hp, s: def.id });
        }
    }

    /** 버프 창 — 중첩 없음, 같은 스킬 재시전은 `until` 갱신. 창 밖에 만들 것이 있는 효과는 표의 `apply` 가 한다 */
    function castBuff(u, def, t) {
        const targets = def.target === 'self' ? [u] : alive(alliesOf(u));
        const until = t + def.dur;
        for (const tgt of targets) {
            tgt.buffs[def.id] = { stat: def.stat, v: def.value, until };
            const ev = { t: r1(t), e: 'buff', u: tgt.key, s: def.id, stat: def.stat, v: def.value, until: r1(until) };
            EFFECTS[def.stat]?.apply?.(rt, tgt, def, until, ev);
            timeline.push(ev);
            refreshDerived(tgt);
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
            ctx.strikeOnce(u, ctx.pickTarget(u, foes), 1, null);
            return;
        }
        const def = sel.def;
        // 쿨은 실시간 초 — 시전 순간부터 (battle_design §6). 쿨감소는 **표기 쿨에 곱**한다 (combat_stat:cooldown_reduction)
        sel.readyAt = t + def.cool * Math.max(cdFloor, 1 - (u.cdr ?? 0) / 100);
        out.casts[def.id] = (out.casts[def.id] ?? 0) + 1;
        // `ready` = 이 스킬이 다시 준비되는 시각. 재생기가 쿨을 **계산하지 않고** 그리게 하려고 함께 싣는다
        timeline.push({ t: r1(t), e: 'skill', u: u.key, s: def.id, ready: r1(sel.readyAt) });
        hooks.emit('cast', u, { t, def });
        if (def.kind === 'attack') ATTACK_TARGETS[def.target](rt, u, def, foes);
        else if (def.kind === 'heal') castHeal(u, def, t);
        else castBuff(u, def, t);
    }

    /**
     * 등록표(`skill_effects.js`)의 핸들러가 `rt.strikeOnce`·`rt.pickTarget`·`rt.rng` 를 부르므로 그 셋도 같이 싣는다 —
     * 표가 battle.js 를 직접 import 하지 않게 하는 이음매다(표는 상태를 모르고 런타임만 안다).
     */
    const rt = { rng, strikeOnce: ctx.strikeOnce, pickTarget: ctx.pickTarget, alive, alliesOf, foesOf, act, expire, castHeal, castBuff };
    return rt;
}
