// 전사 전직 스킬 결투 측정 — 읽기 전용. 값 덮어쓰기는 이 판 안에서만이다(CSV 안 건드린다)
import { loadData, buildSystems, D } from '/src/ui/data.js';
import { makeRng } from '/src/game_logic/rng.js';

const clone = x => JSON.parse(JSON.stringify(x));
let SYS = null;
const cache = new Map();

function systemsFor(ov) {
    if (!ov) return SYS;
    const key = JSON.stringify(ov);
    if (cache.has(key)) return cache.get(key);
    const patch = (rows, id, map) => rows.map(r => (map?.[id(r)] ? { ...r, ...map[id(r)] } : r));
    const stId = r => r.status_id, efId = r => `${r.skill_id}#${r.seq}`;
    let st = patch(D.skillStatusRows, stId, ov.status);
    let ef = patch(D.skillEffectRows, efId, ov.effect);
    const sk = patch(D.skillRows, r => r.skill_id, ov.skill);
    for (const a of ov.addStatus ?? []) { const { like, ...rest } = a; st = [...st, { ...st.find(r => r.status_id === like), ...rest }]; }
    for (const a of ov.addEffect ?? []) { const { like, ...rest } = a; ef = [...ef, { ...ef.find(r => efId(r) === like), ...rest }]; }
    const out = buildSystems({ ...D, skillStatusRows: st, skillEffectRows: ef, skillRows: sk });
    cache.set(key, out);
    return out;
}

export async function setup() {
    await loadData('/src/data/');
    SYS = buildSystems(D);
    return { tiers: SYS.arena.tiers.map(t => ({ id: t.id, level: t.level, skillUp: t.skillUp })) };
}

const TANK_KNIGHT = ['kni_holyshield', 'kni_resistshield'];

function pairsFor(tier, n, cls, frontOnly, arrange = null) {
    const ok = new Set(SYS.item.groupsFor(cls).map(g => g.id));
    const pairs = [];
    for (let s = 1; pairs.length < n && s < n * 400; s++) {
        const A = SYS.arena.rollTierOpponent(tier.id, makeRng(1000 + s));
        const w = A.find(p => p.hero.cls === cls);
        if (!w || !ok.has(w.weaponGroup)) continue;
        if (arrange) {
            // 자리 강제 — 같은 팀을 전열 1 · 후열 2 로 다시 세운다(AI 팀의 진형 그대로)
            const knight = A.find(p => p.hero.cls === 'knight');
            if (!knight) continue;
            const up = tier.skillUp > 0 ? { up: tier.skillUp } : {};
            const kit = ids => ids.map((id, i) => ({ id, source: i ? 'book' : 'innate', ...up }));
            let front = arrange === 'wFront' ? w : knight;
            if (arrange === 'kTank') knight.actives = kit(TANK_KNIGHT);
            if (arrange === 'wwFront') {
                // 같은 등급 다른 팀의 전사를 데려와 기사 자리에 세운다 — AI 팀은 직업이 안 겹쳐 굴림으로는 안 나온다
                let mate = null;
                for (let k = 0; k < 200 && !mate; k++) mate = SYS.arena.rollTierOpponent(tier.id, makeRng(500000 + s + k * 1000)).find(p => p.hero.cls === cls) ?? null;
                if (!mate) continue;
                mate = clone(mate);
                mate.actives = kit(['war_ironskin', 'war_recovery']);
                A[A.indexOf(knight)] = mate;
                front = mate;
            }
            A.forEach(p => { p.rank = p === front ? 0 : 1; });
        } else if (frontOnly && (w.rank ?? 0) !== 0) continue;
        const B = SYS.arena.rollTierOpponent(tier.id, makeRng(70000 + s));
        pairs.push({ A, B, s });
    }
    return pairs;
}

const cap = lv => Math.floor((Math.min(lv, 50) - 30) / 5);   // 메인 up 상한 — Lv30 0 · 35 1 · 45 3 · 50 4

export function run(cfg) {
    const { cls = 'warrior', n = 120, hpx = 1, variants, tierIds, frontOnly = true, arrange = null } = cfg;
    const out = {};
    for (const tid of tierIds) {
        const tier = SYS.arena.tiers.find(t => t.id === tid);
        const pairs = pairsFor(tier, n, cls, frontOnly, arrange);
        const shape = { dur: 0, up: cap(tier.level), n: pairs.length, skillUp: tier.skillUp };
        out[tid] = { level: tier.level, shape, rows: {} };
        // 한 판 — kit: 고정한 기본 스킬 둘(없으면 그 영웅이 굴린 둘) · order: first 면 전직 칸이 맨 앞
        const one = ({ A, B, s }, v, FS) => {
            const A2 = clone(A), B2 = clone(B);
            const w = A2.find(p => p.hero.cls === cls && (arrange !== 'wwFront' || p.rank !== 0));
            const wi = A2.indexOf(w);
            const rolled = (w.actives ?? []).filter(a => a.source !== 'advance');
            const others = v.kit ? v.kit.map((id, i) => ({ id, source: i ? 'book' : 'innate', ...(tier.skillUp > 0 ? { up: tier.skillUp } : {}) })) : rolled;
            if (v.skill && others.some(a => a.id === v.skill)) return null;
            const up = v.up ?? (v.basic ? tier.skillUp : cap(tier.level));
            const adv = v.skill ? { id: v.skill, source: 'advance', ...(up > 0 ? { up } : {}) } : null;
            w.actives = !adv ? others : v.order === 'last' ? [...others, adv] : v.order === 'mid' ? [others[0], adv, ...others.slice(1)] : [adv, ...others];
            if (hpx !== 1) for (const p of [...A2, ...B2]) p.combat.hp_max *= hpx;
            globalThis.__MUT = v.mut ?? null; globalThis.__AUTO = v.auto ?? null;   // 자동 발동 측정 — run.py 가 틱 루프에 끼운다
            const r = FS.arena.fight(A2, B2, makeRng(90000 + s));
            const hpMax = {};
            A2.forEach((p, i) => { hpMax[`p${i}`] = p.combat.hp_max; });
            B2.forEach((p, i) => { hpMax[`e${i}`] = p.combat.hp_max; });
            const hp = { ...hpMax };
            const wk = `p${wi}`;
            const fk = `p${A2.findIndex(p => (p.rank ?? 0) === 0)}`;
            const o = { fDownT: null, swings: 0, casts: 0, wDmg: 0, skillDmg: 0, wTaken: 0, wPay: 0, dur: r.durationSec, won: r.won ? 1 : 0, turns: 0, downT: null, stag: 0 };
            for (const e of r.timeline) {
                const k = e.d ?? e.u;
                if (e.e === 'hit' && e.a === wk && v.skill && e.s === v.skill && e.d in hp) { o.sH = (o.sH ?? 0) + 1; o.sS = (o.sS ?? 0) + e.dmg / hpMax[e.d]; if (e.dhp <= 0 && hp[e.d] >= hpMax[e.d]) o.sF = (o.sF ?? 0) + 1; }
                if (e.dhp != null && k in hp) hp[k] = e.dhp;
                if (e.e === 'hit') {
                    if (e.a === wk) { o.wDmg += e.dmg; if (v.skill && e.s === v.skill) o.skillDmg += e.dmg; if (!e.s) { o.turns++; o.swings++; } }
                    if (e.d === wk) o.wTaken += e.dmg / hpMax[wk];
                } else if (e.e === 'dodge' && e.a === wk && !e.s) o.swings++;
                else if (e.e === 'skill' && e.u === wk && e.s === v.skill) o.casts++;
                else if (e.e === 'pay' && e.u === wk) o.wPay += e.amt / hpMax[wk];
                else if (e.e === 'down' && e.u === wk && o.downT === null) o.downT = e.t;
                if (e.e === 'down' && e.u === fk && o.fDownT === null) o.fDownT = e.t;
                else if (e.e === 'stagger' && e.u === wk) o.stag++;
            }
            const frac = side => Object.keys(hp).filter(x => x[0] === side).reduce((m, x) => m + Math.max(0, hp[x]) / hpMax[x], 0) / 3;
            o.m = frac('p') - frac('e');
            o.dead = (hp[wk] ?? 1) <= 0 ? 1 : 0;
            return o;
        };
        const base = new Map();
        const baseOf = kit => {
            const key = kit ? kit.join('+') : '*';
            if (!base.has(key)) base.set(key, pairs.map(p => one(p, { kit, skill: null }, SYS)));
            return base.get(key);
        };
        for (const v of [{ name: 'none', skill: null }, ...variants]) {
            const FS = systemsFor(v.ov);
            const b0 = baseOf(v.kit ?? null);
            const acc = { win: 0, d: 0, dSq: 0, half: [0, 0], cnt: [0, 0], dur: 0, casts: 0, wDmg: 0, skillDmg: 0, wTaken: 0, wDead: 0, wPay: 0, used: 0, m: 0, turns: 0, downT: 0, downN: 0, stag: 0, swings: 0, fDownT: 0, fDownN: 0, sH: 0, sS: 0, sF: 0 };
            pairs.forEach((p, pi) => {
                const o = one(p, v, FS);
                if (!o) return;
                const d = o.m - b0[pi].m;
                acc.used++;
                acc.d += d; acc.dSq += d * d;
                const h = pi < pairs.length / 2 ? 0 : 1;
                acc.half[h] += d; acc.cnt[h]++;
                acc.sH += o.sH ?? 0; acc.sS += o.sS ?? 0; acc.sF += o.sF ?? 0; acc.win += o.won; acc.dur += o.dur; acc.casts += o.casts; acc.wDmg += o.wDmg; acc.skillDmg += o.skillDmg;
                acc.wTaken += o.wTaken; acc.wPay += o.wPay; acc.wDead += o.dead; acc.m += o.m; acc.turns += o.turns; acc.stag += o.stag; if (o.downT !== null) { acc.downT += o.downT; acc.downN++; } acc.swings += o.swings; if (o.fDownT !== null) { acc.fDownT += o.fDownT; acc.fDownN++; }
            });
            const u = Math.max(1, acc.used), mean = acc.d / u;
            const se = Math.sqrt(Math.max(0, acc.dSq / u - mean * mean) / u);
            const f = (x, k = 3) => +x.toFixed(k);
            if (v.name === 'none') shape.dur = f(acc.dur / u, 1);
            out[tid].rows[v.name] = {
                hitShare: f(acc.sS / Math.max(1, acc.sH) * 100, 0), fullKill: f(acc.sF / Math.max(1, acc.sH) * 100, 0), d: f(mean), se: f(se), d1: f(acc.half[0] / Math.max(1, acc.cnt[0])), d2: f(acc.half[1] / Math.max(1, acc.cnt[1])),
                win: f(acc.win / u * 100, 1), used: acc.used, dur: f(acc.dur / u, 1), casts: f(acc.casts / u, 2),
                wDmgPerS: f(acc.wDmg / Math.max(1, acc.dur), 0), skillShare: f(acc.skillDmg / Math.max(1, acc.wDmg), 2),
                wTaken: f(acc.wTaken / u, 2), wPay: f(acc.wPay / u, 2), wDead: f(acc.wDead / u, 2), m: f(acc.m / u), turns: f(acc.turns / u, 2), stag: f(acc.stag / u, 2), downT: f(acc.downT / Math.max(1, acc.downN), 1), swings: f(acc.swings / u, 2), fDownT: f(acc.fDownT / Math.max(1, acc.fDownN), 1), fDead: f(acc.fDownN / u, 2),
            };
        }
    }
    return out;
}

export const sample = () => {
    const t = SYS.arena.tiers.find(x => x.id === 'diamond');
    const [p] = pairsFor(t, 1, 'warrior', true);
    const w = p.A.find(x => x.hero.cls === 'warrior');
    return { actives: w.actives, group: w.weaponGroup, rank: w.rank, adv: w.hero.advance, sk: w.hero.advanceSkill, up: w.hero.advanceUp,
        stats: w.hero.stats, atk: w.combat.atk_physical, hp: w.combat.hp_max, period: w.combat.action_period, def: w.combat.defense };
};
