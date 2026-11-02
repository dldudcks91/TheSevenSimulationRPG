// 동귀어진 한 방 — 대상 최대 HP 의 몇 % · 처치 · 만피 즉사 · 낸 HP (기사 앞 · 전사 뒤 · 맨 앞 칸 · 굴린 칸)
import { loadData, buildSystems, D } from '/src/ui/data.js';
import { makeRng } from '/src/game_logic/rng.js';

const clone = x => JSON.parse(JSON.stringify(x));
const cap = lv => Math.floor((Math.min(lv, 50) - 30) / 5);
const pct = (a, n) => +(100 * a / Math.max(1, n)).toFixed(1);

export async function mut(cfg) {
    await loadData('/src/data/');
    const SYS = buildSystems(D);
    const ok = new Set(SYS.item.groupsFor('warrior').map(g => g.id));
    const out = {};
    for (const mult of cfg.mults) {
        const FS = buildSystems({
            ...D,
            skillRows: D.skillRows.map(r => (r.skill_id === 'war_mutualruin' ? { ...r, hp_cost_pct: cfg.cost ?? 0.3 } : r)),
            skillEffectRows: D.skillEffectRows.map(r => (r.skill_id === 'war_mutualruin' ? { ...r, mult_pct: mult, level_step: mult / 10 } : r)),
        });
        for (const tid of cfg.tiers) {
            const tier = SYS.arena.tiers.find(t => t.id === tid);
            const up = cap(tier.level);
            const a = { fights: 0, casts: 0, hits: 0, share: 0, big: 0, kills: 0, fullKills: 0, pay: 0, dodge: 0, wins: 0, sharesS: [], dmg: 0, payAmt: 0, targetHp: 0, selfHp: 0 };
            for (let s = 1; a.fights < cfg.n && s < cfg.n * 400; s++) {
                const A = SYS.arena.rollTierOpponent(tier.id, makeRng(1000 + s));
                const w = A.find(p => p.hero.cls === 'warrior');
                const k = A.find(p => p.hero.cls === 'knight');
                if (!w || !k || !ok.has(w.weaponGroup)) continue;
                A.forEach(p => { p.rank = p === k ? 0 : 1; });
                const B = SYS.arena.rollTierOpponent(tier.id, makeRng(70000 + s));
                const A2 = clone(A), B2 = clone(B);
                const w2 = A2.find(p => p.hero.cls === 'warrior');
                w2.actives = [{ id: 'war_mutualruin', source: 'advance', ...(up > 0 ? { up } : {}) }, ...(w2.actives ?? []).filter(x => x.source !== 'advance' && x.id !== 'war_mutualruin')];
                const r = FS.arena.fight(A2, B2, makeRng(90000 + s));
                const key = `p${A2.indexOf(w2)}`;
                const hpMax = {}; A2.forEach((p, i) => { hpMax[`p${i}`] = p.combat.hp_max; }); B2.forEach((p, i) => { hpMax[`e${i}`] = p.combat.hp_max; });
                const hp = { ...hpMax };
                a.fights++; if (r.won) a.wins++;
                for (const e of r.timeline) {
                    const d = e.d ?? e.u;
                    const before = d in hp ? hp[d] : 0;
                    if (e.e === 'skill' && e.u === key && e.s === 'war_mutualruin') a.casts++;
                    if (e.e === 'dodge' && e.a === key && e.s === 'war_mutualruin') a.dodge++;
                    if (e.e === 'pay' && e.u === key && e.s === 'war_mutualruin') { a.pay += e.amt / hpMax[key]; a.payAmt += e.amt; a.selfHp += hpMax[key]; }
                    if (e.e === 'hit' && e.a === key && e.s === 'war_mutualruin') {
                        const sh = e.dmg / hpMax[e.d];
                        a.hits++; a.share += sh; a.sharesS.push(sh); a.dmg += e.dmg; a.targetHp += hpMax[e.d];
                        if (sh >= 0.5) a.big++;
                        if (e.dhp <= 0) { a.kills++; if (before >= hpMax[e.d]) a.fullKills++; }
                    }
                    if (e.dhp != null && d in hp) hp[d] = e.dhp;
                }
            }
            a.sharesS.sort((x, y) => x - y);
            out[`${mult}배 ${tid} Lv${tier.level}`] = {
                up, win: pct(a.wins, a.fights), castsPerFight: +(a.casts / a.fights).toFixed(2), dodgePct: pct(a.dodge, a.casts),
                meanSharePct: pct(a.share, a.hits), medianSharePct: +(100 * (a.sharesS[a.sharesS.length >> 1] ?? 0)).toFixed(1), over50Pct: pct(a.big, a.hits),
                killPct: pct(a.kills, a.hits), fullHpKillPct: pct(a.fullKills, a.hits), payPerFightPctMax: pct(a.pay, a.fights), meanDmg: Math.round(a.dmg / Math.max(1, a.hits)), meanTargetHp: Math.round(a.targetHp / Math.max(1, a.hits)), meanPay: Math.round(a.payAmt / Math.max(1, a.casts)), meanSelfHp: Math.round(a.selfHp / Math.max(1, a.casts)),
            };
        }
    }
    return out;
}
