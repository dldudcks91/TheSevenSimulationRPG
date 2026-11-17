// 점수 재료 점검 — 아이템 몇 개의 베이스 몫 · 옵션 점수 합을 찍는다
import { D, SYS, rngMod } from './boot.mjs';
const { makeRng } = rngMod;
const I = SYS.item;
const mod = await import('./ae_fns.mjs');
const r = makeRng(99);
const T = SYS.arena.tiers.find(t => t.id === 'platinum');
const gear = I.rollGear(r, { slots: ['weapon', 'weapon', 'armor', 'helmet', 'gloves', 'boots', 'ring', 'amulet', 'weapon', 'armor'], ilvl: 30, ilvlSpread: 5, ilvlMax: 35, rarityWeights: T.rarityWeights });
for (const it of gear) {
    if (I.upgradeable(it) && r() < 0.5) it.up = 2;
    console.log(it.slot.padEnd(7), (it.group ?? '').padEnd(8), String(it.ilvl).padStart(2), it.rarity.padEnd(9), 'up', it.up ?? 0,
        '| base', mod.baseFrac(it, 'global').toFixed(3), 'grp', mod.baseFrac(it, 'group').toFixed(3), '| opt', mod.optSum(it).toFixed(2),
        '| lines', (it.affixes ?? []).map(a => `${a.stat}:${a.src}`).join(' '));
}
console.log('REFW 1/10/30/50', [1, 10, 30, 50].map(l => mod.REFW[l]?.toFixed(1)).join(' '));
console.log('REFA armor 1/30/50', [1, 30, 50].map(l => mod.REFA.armor[l]).join(' '), 'helmet', [1, 30, 50].map(l => mod.REFA.helmet[l]).join(' '), 'gloves', [1, 30, 50].map(l => mod.REFA.gloves[l]).join(' '));
