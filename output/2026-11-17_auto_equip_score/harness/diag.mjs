/** 진단 — 점수(S_b5_o2)가 세기와 다른 걸 고른 칸: 부위별 빈도 · 그 한 칸만 점수 쪽 물건으로 바꿨을 때의 세기 손실 · 사례
 *  node diag.mjs <seedFrom> <seedTo>  — ae.mjs 와 같은 판 구성(같은 씨앗 → 같은 영웅 · 같은 가방) */
import { D, SYS, rngMod } from './boot.mjs';
import { scoreFn, baseFrac, optSum } from './ae_fns.mjs';

const { makeRng, deriveSeed } = rngMod;
const [S0, S1] = process.argv.slice(2).map(Number);
const A = SYS.arena, I = SYS.item, H = SYS.hero, F = SYS.formula;
const POS = D.equipSlots.map(r => ({ id: r.id ?? r.equip_slot_id, part: r.part }));
const PARTS = [...new Set(POS.map(p => p.part))];
const MIGHT_PARTS = new Set(['weapon', 'armor', 'helmet', 'gloves', 'boots']);
const RL = ['normal', 'magic', 'rare', 'craft', 'epic', 'legendary', 'unique'];
const rk = r => { const i = RL.indexOf(r); return i < 0 ? RL.length : i; };
const gearOf = (ctx, h) => Object.values(h.equipped).filter(Boolean).map(u => ctx.items[u]);
const combatOf = (ctx, h) => H.computeCombat(h, gearOf(ctx, h).map(I.effective), {}, null);
function combatIf(ctx, h, pos, uid) { const s = h.equipped[pos]; h.equipped[pos] = uid; const c = combatOf(ctx, h); h.equipped[pos] = s; return c; }
function equipTo(ctx, h, pos, uid) { const i = ctx.bag.indexOf(uid); ctx.bag.splice(i, 1); const old = h.equipped[pos]; h.equipped[pos] = uid; if (old) ctx.bag.push(old); }
const cands = (ctx, h, part) => ctx.bag.map(u => ctx.items[u]).filter(it => it && !it.box && it.slot === part && !I.canEquip(h, it) && I.fitsClass(it, h.cls));
const better = (a, b) => ((a.ilvl ?? 0) - (b.ilvl ?? 0) || rk(a.rarity) - rk(b.rarity)) > 0;
const dealtPerSec = c => { const a = c.atk_physical ?? c.atk_magic; if (!a) return 0; const crit = 1 + Math.min(1, c.crit_rate ?? 0) * ((c.crit_damage ?? 1) - 1); return (a.min + a.max) / 2 * (c.main_attr_mult ?? 1) * (1 + (c.dmg_bonus_pct ?? 0)) * crit / (c.action_period || 1); };
const enduredHp = c => { const keep = (1 - F.mitigation(c.defense ?? 0)) * (1 - (c.damage_reduction ?? 0)); return keep > 0 ? (c.hp_max ?? 0) / keep : Infinity; };
const might = c => dealtPerSec(c) * enduredHp(c);
function equipMight(ctx, h) {
    for (const { id: pos, part } of POS) { if (MIGHT_PARTS.has(part) || h.equipped[pos]) continue; let best = null; for (const it of cands(ctx, h, part)) if (!best || better(it, best)) best = it; if (best) equipTo(ctx, h, pos, best.uid); }
    const passMax = ctx.bag.length + 1;
    for (let pass = 0, moved = true; moved && pass < passMax; pass++) {
        moved = false;
        for (const { id: pos, part } of POS) {
            if (!MIGHT_PARTS.has(part)) continue;
            let best = null, top = h.equipped[pos] ? might(combatOf(ctx, h)) : -Infinity;
            for (const it of cands(ctx, h, part)) { const v = might(combatIf(ctx, h, pos, it.uid)); if (v > top) { best = it; top = v; } }
            if (best) { equipTo(ctx, h, pos, best.uid); moved = true; }
        }
    }
}
const SC = scoreFn(5, 2);
function equipScore(ctx, h) {
    for (const { id: pos, part } of POS) {
        let best = null, top = h.equipped[pos] ? SC(ctx.items[h.equipped[pos]]) : -Infinity;
        for (const it of cands(ctx, h, part)) { const v = SC(it); if (v > top) { best = it; top = v; } }
        if (best) equipTo(ctx, h, pos, best.uid);
    }
}
const desc = it => it ? `${it.name?.ko ?? it.slot} L${it.ilvl} ${it.rarity}${it.up ? ' +' + it.up : ''} [베이스 ${baseFrac(it).toFixed(2)} · 옵션 ${optSum(it).toFixed(1)} · 점수 ${SC(it).toFixed(1)}] ${(it.affixes ?? []).filter(a => !(a.src === 'fixed' && (a.stat === 'atk_pct' || a.stat === 'armor_def_pct'))).map(a => a.stat).join(',')}` : '(빈 칸)';

const TIERS = A.tiers;
const bySlot = {};
const examples = [];
let heroesSeen = 0;
for (let seed = S0; seed <= S1; seed++) for (const T of TIERS) for (const N of [21, 63]) for (const mode of ['tier', 'drop']) {
    const base = deriveSeed(seed * 7919 + 13, TIERS.indexOf(T) * 100 + N * 3 + (mode === 'tier' ? 1 : 2));
    const kit = A.rollTierOpponent(T.id, makeRng(base), [], { floorRules: true });
    const heroes0 = kit.map(p => { const h = structuredClone(p.hero); for (const k of Object.keys(h.equipped)) h.equipped[k] = null; return h; });
    const L = T.level, rb = makeRng(base ^ 0x5bd1e995);
    const parts = Array.from({ length: N }, () => PARTS[Math.floor(rb() * PARTS.length)]);
    const gear = I.rollGear(rb, { slots: parts, ilvl: Math.max(1, L - 5), ilvlSpread: 5, ilvlMax: L, ...(mode === 'tier' ? { rarityWeights: T.rarityWeights } : {}) });
    const items = {};
    gear.forEach((it, j) => { it.uid = `b-${j}`; if ((T.up ?? 0) > 0 && I.upgradeable(it) && rb() < 0.5) it.up = Math.floor(rb() * (T.up + 1)); items[it.uid] = it; });
    const bag0 = gear.map(it => it.uid);
    const run = fn => { const ctx = { items, bag: bag0.slice() }; const hs = heroes0.map(h0 => structuredClone(h0)); for (const h of hs) fn(ctx, h); return { ctx, hs }; };
    const M = run(equipMight), S = run(equipScore);
    M.hs.forEach((hm, i) => {
        heroesSeen++;
        const hsc = S.hs[i];
        const mAll = might(combatOf(M.ctx, hm));
        for (const { id: pos, part } of POS) {
            const a = hm.equipped[pos], b = hsc.equipped[pos];
            const row = (bySlot[pos] ??= { n: 0, diff: 0, loss: 0 });
            row.n++;
            if (a === b) continue;
            row.diff++;
            // 세기 쪽 몸에서 그 한 칸만 점수 쪽 물건으로 — 그 물건이 세기 쪽 다른 영웅에게 가 있으면 그래도 그 몸으로 잰다(근사)
            const c = combatIf(M.ctx, hm, pos, b ?? null);
            const loss = 1 - might(c) / mAll;
            row.loss += loss;
            if (MIGHT_PARTS.has(part) && loss > 0.08 && examples.length < 14 && T.id !== 'bronze')
                examples.push(`${T.id} ${hm.cls} ${pos} 손실 ${(loss * 100).toFixed(0)}%\n   세기: ${desc(items[a])}\n   점수: ${desc(items[b])}`);
        }
    });
}
console.log(`영웅 ${heroesSeen}명\n\n| 칸 | 세기와 다른 비율 | 다를 때 그 한 칸의 세기 손실(평균) |\n|---|---|---|`);
for (const { id } of POS) { const r = bySlot[id]; console.log(`| ${id} | ${(r.diff / r.n * 100).toFixed(0)}% | ${r.diff ? (r.loss / r.diff * 100).toFixed(1) : '-'}% |`); }
console.log('\n사례(손실 8% 넘는 것):\n' + examples.join('\n'));
