// 앞줄 전사의 결투 모양 — 첫 행동 · 쓰러지는 시각 · 그때까지 휘두른 수 · 명중률 · 무엇에 맞아 죽나
import { loadData, buildSystems, D } from '/src/ui/data.js';
import { makeRng } from '/src/game_logic/rng.js';

export async function life(cfg) {
    await loadData('/src/data/');
    const SYS = buildSystems(D);
    const out = {};
    const ok = new Set(SYS.item.groupsFor('warrior').map(g => g.id));
    for (const tid of cfg.tiers) {
        const tier = SYS.arena.tiers.find(t => t.id === tid);
        const a = { n: 0, first: 0, firstN: 0, downT: 0, downN: 0, swings: 0, hits: 0, period: 0, hp: 0, dur: 0, killer: {}, bigHit: 0, bigN: 0 };
        for (let s = 1; a.n < cfg.n && s < cfg.n * 400; s++) {
            const A = SYS.arena.rollTierOpponent(tier.id, makeRng(1000 + s));
            const w = A.find(p => p.hero.cls === 'warrior');
            if (!w || !ok.has(w.weaponGroup) || (w.rank ?? 0) !== 0) continue;
            const B = SYS.arena.rollTierOpponent(tier.id, makeRng(70000 + s));
            const A2 = JSON.parse(JSON.stringify(A));
            const w2 = A2.find(p => p.hero.cls === 'warrior');
            w2.actives = [];
            const r = SYS.arena.fight(A2, B, makeRng(90000 + s));
            const k = `p${A2.indexOf(w2)}`;
            a.n++; a.period += w2.combat.action_period; a.hp += w2.combat.hp_max; a.dur += r.durationSec;
            let first = null, down = null, lastHit = null;
            for (const e of r.timeline) {
                if (e.a === k && (e.e === 'hit' || e.e === 'dodge')) { if (first === null) first = e.t; a.swings++; if (e.e === 'hit') a.hits++; }
                if (e.e === 'hit' && e.d === k) {
                    lastHit = e;
                    a.bigHit += e.dmg / w2.combat.hp_max; a.bigN++;
                }
                if (e.e === 'down' && e.u === k && down === null) down = e.t;
            }
            if (first !== null) { a.first += first; a.firstN++; }
            if (down !== null) {
                a.downT += down; a.downN++;
                const by = lastHit ? `${(lastHit.a[0] === 'e' ? B[+lastHit.a.slice(1)] : A2[+lastHit.a.slice(1)]).hero.cls}` : '?';
                a.killer[by] = (a.killer[by] ?? 0) + 1;
            }
        }
        out[tid] = { level: tier.level, n: a.n, period: +(a.period / a.n).toFixed(2), hp: Math.round(a.hp / a.n), dur: +(a.dur / a.n).toFixed(1),
            firstAction: +(a.first / Math.max(1, a.firstN)).toFixed(1), downShare: +(a.downN / a.n).toFixed(2), downT: +(a.downT / Math.max(1, a.downN)).toFixed(1),
            swings: +(a.swings / a.n).toFixed(2), hitRate: +(a.hits / Math.max(1, a.swings)).toFixed(2), avgHitPctHp: +(a.bigHit / Math.max(1, a.bigN)).toFixed(3), killer: a.killer };
    }
    return out;
}
