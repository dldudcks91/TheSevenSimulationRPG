/** 최대 원소 저항 — 갑옷 시기 ① (2026-11-26) · top_armor.mjs 와 같은 판 · 시기 빌드만
 *  변형: base · max_X(저항 없이 +TOP) · cap(모든 원소 저항 원값 +100% → 상한 75%) · cap+max_X×m(TOP × 1·2·3 = 부위 하나 · 둘 · 셋)
 *  기록에 상대 직업 · 전직을 넣는다 → analyze_maxres.mjs */
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
if (!['1', '2'].includes(KIT)) throw new Error(`KIT ${KIT}`);
const FULL = KIT === '2';
const SLOT = process.env.SLOT ?? 'armor';
if (SLOT === 'weapon') throw new Error('무기는 top.mjs');
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
// ── 죄종 빌드 — top.mjs 와 같은 식 ──
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
function sinBuild(team, S, seed, g) {
    const p0 = team[0];
    const rng = makeRng(deriveSeed(seed * 7919 + 17, 700000 + gi(g) * 10 + SINS.indexOf(S)));
    const gear = p0.gear.map(it => {
        if (it.slot === 'weapon') return { ...it, sins: [S] };
        for (let k = 0; k < 400; k++) {
            const [x] = I.rollGear(rng, { slots: [it.slot], ilvl: it.ilvl ?? L, rarityWeights: KIT_W });
            if ((x.sins ?? []).includes(S)) return { ...x, uid: it.uid, ...(KIT_UP > 0 && I.upgradeable(x) ? { up: KIT_UP } : {}) };
        }
        throw new Error(`sinBuild: ${it.slot} 에 ${S} 가 안 붙는다`);
    });
    const hero = respend(p0.hero, gear, rng);
    return [{ ...p0, hero, gear, ...sheetOf(hero, gear) }, ...team.slice(1)];
}

// Lv50 최고값 — 게임 함수(도감 옵션 탭과 같은 표) · 맨 위 단의 위끝
const TOP = {};
for (const sin of SINS) {
    const t = I.sinOptionTable(sin);
    for (const r of t?.slots.find(s => s.slot === SLOT)?.rows ?? []) TOP[`${sin}:${r.stat}`] = r.ranges.at(-1).max;
}
// 줄 견본 — 발동 줄은 스킬마다 · Lv50 레전더리로 굴려 줍는다
function samples() {
    const m = {}, rng = makeRng(deriveSeed(4243, L * 100 + 77));
    for (let k = 0; k < 6000; k++) {
        const [x] = I.rollGear(rng, { slots: [SLOT], ilvl: L, rarityWeights: { legendary: 1 } });
        for (const a of x.affixes) if (a.src !== 'fixed' && a.src === (x.sins ?? []).find(s => s === a.src)) m[`${a.src}:${a.stat}${a.skill ? '@' + a.skill : ''}`] ??= { ...a };
    }
    return m;
}
const strip = (it, S) => ({ ...it, sins: [S], words: [], affixes: it.affixes.filter(a => a.src === 'fixed') });
const withLine = (it0, aff, v) => ({ ...it0, words: [0], affixes: [...it0.affixes, { ...aff, v }] });

function teamFor(g, seed, S) {
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
function withItem(team, it) {
    const p0 = team[0];
    const gear = p0.gear.map(x => (x.uid === it.uid ? it : x));
    return [{ ...p0, gear, ...sheetOf(p0.hero, gear) }, ...team.slice(1)];
}

const EXTRA = (process.env.EXTRA ?? '').split(';').filter(Boolean).flatMap(s => {
    const [k, vs] = s.split('=');
    const [src, stat] = k.split(':');
    return vs.split('|').map(v => ({ src, stat, v: Number(v) }));
});
const SINS_ONLY = ['envy'];
const ELS = ['fire', 'cold', 'lightning', 'poison'];
const TOP_ENVY = I.sinOptionTable('envy').slots.find(s => s.slot === 'helmet').rows.find(r => r.stat === 'res_max_fire').ranges.at(-1).max;
console.log('TOP', TOP_ENVY);

const out = fs.createWriteStream(OUT, { flags: 'a' });
const t0 = Date.now();
const SMP = samples();
for (let seed = Number(S0); seed <= Number(S1); seed++) {
    for (const g of GROUPS) {
        const opp = maxOut(A.rollTierOpponent(T, makeRng(deriveSeed(seed * 7919 + 17, 900000 + gi(g))), [], rollOpts({})));
        for (const S of SINS.filter(s => Object.values(SMP).some(a => a.src === s) && (!SINS_ONLY || SINS_ONLY.includes(s)))) {
            const team = sinBuild(teamFor(g, seed, S), S, seed, g);
            const it = team[0].gear.find(x => x.slot === SLOT);
            const it0 = strip(it, S);
            const variants = [['base', it0, 0]];
            const TOPV = TOP_ENVY;
            for (const X of ELS) variants.push([`max_${X}`, withLine(it0, { stat: `res_max_${X}`, src: 'envy' }, TOPV), TOPV]);
            const cap = withLine(it0, { stat: 'res_all', src: 'envy' }, 1.0);
            variants.push(['cap', cap, 1]);
            for (const X of ELS) for (const m of [1, 2, 3]) variants.push([`cap+max_${X}x${m}`, { ...cap, affixes: [...cap.affixes, { stat: `res_max_${X}`, src: 'envy', v: TOPV * m }] }, TOPV * m]);
            const row = { kit: KIT, slot: SLOT, sinBuild: S, seed, L, g, cls: team[0].hero.cls, opp: opp.map(p => [p.hero.cls, p.hero.advance ?? null]), v: {} };
            for (const [name, x, val] of variants) {
                const tm = withItem(team, x);
                const rec = { val, dealt: [], taken: [], alive: [], dur: [], won: [] };
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
    }
    console.log(`seed ${seed} done · ${Math.round((Date.now() - t0) / 1000)}s`);
}
out.end();
