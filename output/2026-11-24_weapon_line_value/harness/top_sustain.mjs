/**
 * 회복 조합의 결투 값어치 (2026-11-25 · 사용자 「받는체력회복을 어디에 넣을지 고민도 좀 해보자」).
 * top_armor.mjs 와 같은 판(챔피언 Lv50 3 대 3 · 색욕 빌드 — 장비 8칸 색욕 · 마스터리 다시 찍음)에서
 *   재는 영웅의 갑옷 · 신발 · 반지(첫째) · 목걸이를 베이스 줄만 남기고(죄종 표지는 색욕) → 조합마다 줄을 붙인다(Lv50 최고값)
 *   C0 = 넷 다 베이스만 · 나머지 = 아래 COMBOS · 기록은 top_armor 와 같다 → analyze_armor.mjs (base = C0)
 * KIT=1|2 [WV_SRC=스냅숏/src] node top_sustain.mjs <out.jsonl> <groups,comma> <seedFrom> <seedTo> <K>
 */
import fs from 'node:fs';
import { D, SYS, rngMod } from './boot.mjs';

const { makeRng, deriveSeed } = rngMod;
const [OUT, GARG, S0, S1, KARG] = process.argv.slice(2);
const GROUPS = GARG.split(','), K = Number(KARG);
const ALLG = ['axe', 'sword2h', 'mace', 'spear', 'bow', 'crossbow', 'staff', 'orb', 'crucifix', 'bible'];
const A = SYS.arena, I = SYS.item, H = SYS.hero, SK = SYS.skill;
const WG = D.weaponGroups;
const T = 'champion';
const L = Object.fromEntries(A.tiers.map(t => [t.id, t.level]))[T];
const KIT = process.env.KIT ?? '1';
const FULL = KIT === '2';
const UPMAX = SYS.game.limitsOf({ buildings: Object.fromEntries(SYS.construction.list.map(b => [b.id, b.maxRank])),
    labNodes: Object.fromEntries((D.labNodes ?? []).map(n => [`${n.line}:${n.node}`, n.max])) }).upgrade;
const SKMAX = SYS.game.skillCapMax();
const rollOpts = extra => ({ floorRules: true, ...(FULL ? { rarityWeights: { legendary: 1 } } : {}), ...extra });
function maxOut(team) {
    if (!FULL) return team;
    return team.map(p => {
        const gear = p.gear.map(it => (I.upgradeable(it) ? { ...it, up: UPMAX } : it));
        const hero = { ...p.hero, skillLv: Object.fromEntries([p.hero.innate, p.hero.bookSkill].filter(Boolean).map(id => [id, SKMAX])) };
        return { ...p, hero, gear, combat: H.computeCombat(hero, gear.map(I.effective), {}, null), actives: SK.activesFor(hero, { skillPlus: I.skillPlusOf(gear) }) };
    });
}
const SINS = ['wrath', 'envy', 'pride', 'greed', 'sloth', 'gluttony', 'lust'];
const TIER = A.tiers.find(t => t.id === T);
const KIT_W = FULL ? { legendary: 1 } : TIER.rarityWeights;
const KIT_UP = FULL ? UPMAX : Math.min(TIER.up ?? 0, UPMAX);
function pickIndex(rng, w) { const s = w.reduce((a, b) => a + b, 0); let r = rng() * s; for (let i = 0; i < w.length; i++) { if (r < w[i]) return i; r -= w[i]; } return w.length - 1; }
function respend(h, gear, rng) {
    const pts = Object.values(h.mastery ?? {}).reduce((a, b) => a + b, 0) + (h.masteryPoints ?? 0);
    const hh = { ...h, mastery: {}, masteryPoints: pts };
    const nodes = H.masteryNodesFor(hh);
    while (hh.masteryPoints > 0) {
        const open = nodes.filter(n => n.unlockLevel <= hh.level && H.masteryRowOpen(hh, n) && (hh.mastery[n.id] ?? 0) < n.maxRank
            && H.masteryRowUsed(hh, n) < D.balance.mastery_row_points && !H.masteryPickOneBlocked(hh, n) && H.gateOn(n, gear, hh));
        if (!open.length) break;
        const n = open[pickIndex(rng, open.map(x => (x.treeKind === 'sin' ? D.balance.arena_ai_main_tree_weight : 1) * ((hh.mastery[x.id] ?? 0) > 0 ? D.balance.arena_ai_continue_weight : 1)))];
        hh.mastery[n.id] = (hh.mastery[n.id] ?? 0) + 1;
        hh.masteryPoints -= 1;
    }
    return hh;
}
const gi = g => ALLG.indexOf(g);
const sheetOf = (hero, gear) => ({ combat: H.computeCombat(hero, gear.map(I.effective), {}, null), actives: SK.activesFor(hero, { skillPlus: I.skillPlusOf(gear) }) });
const S = 'lust';
function sinBuild(team, seed, g) {
    const p0 = team[0];
    const rng = makeRng(deriveSeed(seed * 7919 + 17, 700000 + gi(g) * 10 + SINS.indexOf(S)));
    const gear = p0.gear.map(it => {
        if (it.slot === 'weapon') return { ...it, sins: [S] };
        for (let k = 0; k < 400; k++) {
            const [x] = I.rollGear(rng, { slots: [it.slot], ilvl: it.ilvl ?? L, rarityWeights: KIT_W });
            if ((x.sins ?? []).includes(S)) return { ...x, uid: it.uid, ...(KIT_UP > 0 && I.upgradeable(x) ? { up: KIT_UP } : {}) };
        }
        throw new Error(`sinBuild: ${it.slot}`);
    });
    const hero = respend(p0.hero, gear, rng);
    return [{ ...p0, hero, gear, ...sheetOf(hero, gear) }, ...team.slice(1)];
}
function teamFor(g, seed) {
    const cls = WG[g].classes[0];
    for (let t = 0; t < 200; t++) {
        const team = A.rollTierOpponent(T, makeRng(deriveSeed(seed * 7919 + 17, gi(g) * 1000 + t)), [], rollOpts({ party: { heroes: [{ cls, sin: S }], tactics: [] } }));
        if (team[0].gear.find(it => it.slot === 'weapon')?.group === g) {
            team.forEach((p, i) => { p.uid = `pA${i}`; p.hero = { ...p.hero, uid: `pA${i}` }; });
            return maxOut(team);
        }
    }
    throw new Error(`no kit with ${g}`);
}
// Lv50 최고값 — 그 부위 색욕 표 맨 위 단 위끝
const TOP = {};
for (const s of I.sinOptionTable(S).slots) for (const r of s.rows) TOP[`${s.slot}:${r.stat}`] = r.ranges.at(-1).max;
const REGEN = TOP['armor:hp_regen'], RECV = TOP['amulet:hp_recovery_pct'];
const SLOTS = ['armor', 'boots', 'ring', 'amulet'];
// 조합 — 부위: 줄
const COMBOS = {
    armor_regen: { armor: 'hp_regen' },
    regen_x3: { armor: 'hp_regen', boots: 'hp_regen', ring: 'hp_regen' },
    amulet_recv: { amulet: 'hp_recovery_pct' },
    armor_regen_amulet_recv: { armor: 'hp_regen', amulet: 'hp_recovery_pct' },
    regen_x3_amulet_recv: { armor: 'hp_regen', boots: 'hp_regen', ring: 'hp_regen', amulet: 'hp_recovery_pct' },
    regen_x2_recv_x2: { armor: 'hp_regen', boots: 'hp_regen', ring: 'hp_recovery_pct', amulet: 'hp_recovery_pct' },
    regen_x1_recv_x3: { armor: 'hp_regen', boots: 'hp_recovery_pct', ring: 'hp_recovery_pct', amulet: 'hp_recovery_pct' },
};
const valOf = stat => (stat === 'hp_regen' ? REGEN : RECV);

const out = fs.createWriteStream(OUT, { flags: 'a' });
const t0 = Date.now();
for (let seed = Number(S0); seed <= Number(S1); seed++) {
    for (const g of GROUPS) {
        const opp = maxOut(A.rollTierOpponent(T, makeRng(deriveSeed(seed * 7919 + 17, 900000 + gi(g))), [], rollOpts({})));
        const team = sinBuild(teamFor(g, seed), seed, g);
        const p0 = team[0];
        const firstOf = slot => p0.gear.find(x => x.slot === slot);
        const clean = Object.fromEntries(SLOTS.map(slot => { const it = firstOf(slot); return [slot, { ...it, sins: [S], words: [], affixes: it.affixes.filter(a => a.src === 'fixed') }]; }));
        const build = combo => {
            const gear = p0.gear.map(x => {
                const slot = SLOTS.find(s => firstOf(s)?.uid === x.uid);
                if (!slot) return x;
                const c = clean[slot];
                const stat = combo[slot];
                return stat ? { ...c, words: [0], affixes: [...c.affixes, { stat, v: valOf(stat), src: S }] } : c;
            });
            return [{ ...p0, gear, ...sheetOf(p0.hero, gear) }, ...team.slice(1)];
        };
        const row = { kit: KIT, sinBuild: S, seed, L, g, cls: p0.hero.cls, regen: REGEN, recv: RECV, v: {} };
        for (const [name, combo] of [['base', {}], ...Object.entries(COMBOS)]) {
            const tm = build(combo);
            const rec = { val: name === 'base' ? 0 : Object.values(combo).join('+'), dealt: [], taken: [], alive: [], dur: [], won: [] };
            for (let k = 0; k < K; k++) {
                const r = A.fight(tm, opp, makeRng(deriveSeed(seed * 7919 + 17, 500000 + k)));
                const c = r.contrib.find(c => c.uid === 'pA0');
                const down = r.timeline.find(e => e.e === 'down' && e.u === 'p0');
                rec.dealt.push(c?.dealt ?? 0); rec.taken.push(c?.taken ?? 0);
                rec.alive.push(down ? down.t : r.durationSec);
                rec.dur.push(r.durationSec); rec.won.push(r.won ? 1 : 0);
            }
            row.v[name] = rec;
        }
        out.write(JSON.stringify(row) + '\n');
    }
    console.log(`seed ${seed} done · ${Math.round((Date.now() - t0) / 1000)}s`);
}
out.end();
