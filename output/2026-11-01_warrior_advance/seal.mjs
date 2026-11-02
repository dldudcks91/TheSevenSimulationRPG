// 라그나로크 봉인 확인 — 창 안에 다른 액티브가 정말 안 나가나 · 평타 몇 번 · 무엇을 잃나 (기사 앞 · 전사 뒤)
import { loadData, buildSystems, D } from '/src/ui/data.js';
import { makeRng } from '/src/game_logic/rng.js';

const clone = x => JSON.parse(JSON.stringify(x));
const cap = lv => Math.floor((Math.min(lv, 50) - 30) / 5);

function ragnarok(dmg, spd, seal) {
    let st = D.skillStatusRows.map(r => (r.status_id === 'war_ragnarok' ? { ...r, value: dmg } : r));
    const base = st.find(r => r.status_id === 'war_ragnarok');
    const e0 = D.skillEffectRows.find(r => r.skill_id === 'war_ragnarok');
    let ef = [...D.skillEffectRows];
    if (spd) { st = [...st, { ...base, status_id: 'war_ragnarok_spd', stat: 'period_pct', value: spd }]; ef = [...ef, { ...e0, seq: 2, status: 'war_ragnarok_spd' }]; }
    if (seal) { st = [...st, { ...base, status_id: 'war_ragnarok_tf', stat: 'transform', value: 0 }]; ef = [...ef, { ...e0, seq: 3, status: 'war_ragnarok_tf' }]; }
    return buildSystems({ ...D, skillStatusRows: st, skillEffectRows: ef });
}

export async function seal(cfg) {
    await loadData('/src/data/');
    const SYS = buildSystems(D);
    const VAR = [
        { name: '전직 없음', sys: SYS, skill: false },
        { name: '150/150 봉인 · 맨 앞', sys: ragnarok(1.5, 1.5, true), skill: true, order: 'first' },
        { name: '150/150 봉인 없음 · 맨 앞', sys: ragnarok(1.5, 1.5, false), skill: true, order: 'first' },
        { name: '150/150 봉인 · 맨 뒤', sys: ragnarok(1.5, 1.5, true), skill: true, order: 'last' },
    ];
    const ok = new Set(SYS.item.groupsFor('warrior').map(g => g.id));
    const out = {};
    for (const tid of cfg.tiers) {
        const tier = SYS.arena.tiers.find(t => t.id === tid);
        const pairs = [];
        for (let s = 1; pairs.length < cfg.n && s < cfg.n * 400; s++) {
            const A = SYS.arena.rollTierOpponent(tier.id, makeRng(1000 + s));
            const w = A.find(p => p.hero.cls === 'warrior');
            const k = A.find(p => p.hero.cls === 'knight');
            if (!w || !k || !ok.has(w.weaponGroup)) continue;
            A.forEach(p => { p.rank = p === k ? 0 : 1; });
            pairs.push({ A, B: SYS.arena.rollTierOpponent(tier.id, makeRng(70000 + s)), s });
        }
        const up = cap(tier.level);
        const dur = 10 + up;
        const rows = {};
        let base = null;
        for (const v of VAR) {
            const a = { n: 0, win: 0, d: 0, dSq: 0, fightT: 0, casts: 0, firstCast: 0, firstN: 0, other: 0, otherIn: 0, swings: 0, swingsIn: 0, inWin: 0, life: 0, dmg: 0, dmgOther: 0, dmgBasic: 0 };
            const ms = [];
            for (const { A, B, s } of pairs) {
                const A2 = clone(A), B2 = clone(B);
                const w = A2.find(p => p.hero.cls === 'warrior');
                const kit = (w.actives ?? []).filter(x => x.source !== 'advance');
                const adv = { id: 'war_ragnarok', source: 'advance', ...(up > 0 ? { up } : {}) };
                w.actives = !v.skill ? kit : v.order === 'last' ? [...kit, adv] : [adv, ...kit];
                const r = v.sys.arena.fight(A2, B2, makeRng(90000 + s));
                const key = `p${A2.indexOf(w)}`;
                const hpMax = {}; A2.forEach((p, i) => { hpMax[`p${i}`] = p.combat.hp_max; }); B2.forEach((p, i) => { hpMax[`e${i}`] = p.combat.hp_max; });
                const hp = { ...hpMax };
                let start = null, end = null, down = null;
                for (const e of r.timeline) if (e.e === 'skill' && e.u === key && e.s === 'war_ragnarok' && start === null) { start = e.t; end = e.t + dur; }
                const inside = t => start !== null && t > start && t < end;
                for (const e of r.timeline) {
                    const k2 = e.d ?? e.u;
                    if (e.dhp != null && k2 in hp) hp[k2] = e.dhp;
                    if (e.e === 'down' && e.u === key && down === null) down = e.t;
                    if (e.e === 'skill' && e.u === key) {
                        if (e.s === 'war_ragnarok') a.casts++;
                        else {
                            a.other++;
                            if (inside(e.t)) {
                                a.otherIn++;
                                const tag = `${e.s}${kit.some(x => x.id === e.s) ? '(칸)' : '(칸 밖)'}`;
                                a.ids ??= {};
                                a.ids[tag] = (a.ids[tag] ?? 0) + 1;
                                if (kit.some(x => x.id === e.s) && v.name.includes('봉인 · 맨 앞')) {
                                    // 칸 스킬이 창 안에 나왔다 — 그 사건 원본 · 그 시각에 라그나로크 창이 살아 있었나 · 장비 발동을 갖고 있나
                                    const buffs = r.timeline.filter(x => x.u === key && /buff|expire|purge|dispel/.test(x.e) && Math.abs(x.t - e.t) <= (end - start)).map(x => `${x.t}:${x.e}:${x.s ?? ''}:${x.id ?? ''}`).slice(0, 8);
                                    (a.leak ??= []).push({ ev: e, start, end, down, tl: buffs });
                                }
                            }
                        }
                    }
                    if ((e.e === 'hit' || e.e === 'dodge') && e.a === key && !e.s) { a.swings++; if (inside(e.t)) a.swingsIn++; }
                    if (e.e === 'hit' && e.a === key) { a.dmg += e.dmg; if (e.s) a.dmgOther += e.dmg; else a.dmgBasic += e.dmg; }
                }
                const life = down ?? r.durationSec;
                a.life += life;
                if (start !== null) { a.firstCast += start; a.firstN++; a.inWin += Math.max(0, Math.min(end, life) - start); }
                const frac = c => Object.keys(hp).filter(x => x[0] === c).reduce((m, x) => m + Math.max(0, hp[x]) / hpMax[x], 0) / 3;
                ms.push(frac('p') - frac('e'));
                a.n++; a.win += r.won ? 1 : 0; a.fightT += r.durationSec;
            }
            if (!base) base = ms;
            const diffs = ms.map((m, i) => m - base[i]);
            const mean = diffs.reduce((x, y) => x + y, 0) / a.n;
            const se = Math.sqrt(diffs.reduce((x, y) => x + (y - mean) ** 2, 0) / a.n / a.n);
            const f = (x, k = 2) => +(x / a.n).toFixed(k);
            rows[v.name] = { leak: a.leak ?? [], ids: a.ids ?? {}, n: a.n, d: +mean.toFixed(3), se: +se.toFixed(3), win: f(a.win * 100, 0), fightT: f(a.fightT, 1), life: f(a.life, 1), casts: f(a.casts), firstCast: +(a.firstCast / Math.max(1, a.firstN)).toFixed(1),
                otherCasts: f(a.other), otherInWindow: f(a.otherIn), swings: f(a.swings, 1), swingsInWindow: f(a.swingsIn, 1), windowSec: f(a.inWin, 1), dmg: f(a.dmg, 0), dmgBasic: f(a.dmgBasic, 0), dmgSkill: f(a.dmgOther, 0) };
        }
        out[tid] = { level: tier.level, windowSec: dur, rows };
    }
    return out;
}
