// 한 판을 사건 줄로 — 결과 숫자가 이상할 때 값이 실제로 걸리는지 본다
import { loadData, buildSystems, D } from '/src/ui/data.js';
import { makeRng } from '/src/game_logic/rng.js';

export async function trace(cfg) {
    await loadData('/src/data/');
    const SYS = buildSystems(D);
    const st = [...D.skillStatusRows.map(r => (r.status_id === 'war_ragnarok' ? { ...r, value: 1 } : r))];
    const base = D.skillStatusRows.find(r => r.status_id === 'war_ragnarok');
    st.push({ ...base, status_id: 'war_ragnarok_spd', stat: 'period_pct', value: 1 }, { ...base, status_id: 'war_ragnarok_tf', stat: 'transform', value: 0 });
    const e0 = D.skillEffectRows.find(r => r.skill_id === 'war_ragnarok');
    const ef = [...D.skillEffectRows, { ...e0, seq: 2, status: 'war_ragnarok_spd' }, { ...e0, seq: 3, status: 'war_ragnarok_tf' }];
    const FS = buildSystems({ ...D, skillStatusRows: st, skillEffectRows: ef });
    const out = [];
    const tier = SYS.arena.tiers.find(t => t.id === cfg.tier);
    const ok = new Set(SYS.item.groupsFor('warrior').map(g => g.id));
    let found = 0;
    for (let s = 1; found < cfg.n && s < 2000; s++) {
        const A = SYS.arena.rollTierOpponent(tier.id, makeRng(1000 + s));
        const w = A.find(p => p.hero.cls === 'warrior');
        if (!w || !ok.has(w.weaponGroup) || (w.rank ?? 0) !== 0) continue;
        found++;
        const B = SYS.arena.rollTierOpponent(tier.id, makeRng(70000 + s));
        for (const mode of ['none', 'ragnarok']) {
            const A2 = JSON.parse(JSON.stringify(A));
            const w2 = A2.find(p => p.hero.cls === 'warrior');
            const up = Math.floor((tier.level - 30) / 5);
            w2.actives = mode === 'none' ? [] : [{ id: 'war_ragnarok', source: 'advance', up }];
            const r = (mode === 'none' ? SYS : FS).arena.fight(A2, B, makeRng(90000 + s));
            const k = `p${A2.indexOf(w2)}`;
            const lines = r.timeline.filter(e => (e.a === k && e.e === 'hit') || (e.u === k && e.e !== 'regen') || (e.d === k && e.dhp <= 0))
                .slice(0, 40).map(e => `${e.t} ${e.e} ${e.s ?? ''} ${e.dmg ?? ''} ${e.a === k ? '->' + e.d : ''} ${e.d === k ? 'WARRIOR DOWN' : ''}`.trim());
            const teamRoles = { A: A2.map(p => `${p.hero.cls}/r${p.rank}/${p.combat.action_period?.toFixed(2)}`), B: B.map(p => `${p.hero.cls}/r${p.rank}/${p.combat.action_period?.toFixed(2)}`) };
            out.push({ s, mode, won: r.won, dur: r.durationSec, group: w2.weaponGroup, period: w2.combat.action_period, atk: w2.combat.atk_physical, hp: w2.combat.hp_max, def: w2.combat.defense, teamRoles, lines });
        }
    }
    return out;
}
