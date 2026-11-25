/**
 * 분노 치명 빌드 위에서 무기 줄 하나의 결투 값어치 (2026-11-25 · 사용자 「재는법을 바꿔서 너무 정확한 수치는 아니더라도 분노빌드에서 치명타확률과 피해량을 얻었을때로 해야지」).
 * top.mjs(SINBUILD=1 · 분노)와 같은 판에 셋을 더한다 — 재는 영웅만 바꾸고 상대 팀은 차림 그대로
 *   ① 무기 외 부위의 분노 줄을 **치명 줄(Lv50 최고값)** 로 바꾼다 — 그 부위 분노 표에 있는 치명 줄만 · 아이템이 가진 분노 줄 수만큼(레어 1 · 레전더리 2) ·
 *      치명 확률이 먼저 · 남는 자리는 치명 피해 · 치명 줄이 없는 부위(갑옷 · 신발)는 그대로
 *   ② 마스터리를 다시 찍을 때 치명 노드(crit_rate · crit_damage)에 가중 CRITW 를 곱한다 — 치명을 노리는 사람의 찍기
 *   ③ 비교 팀 nocrit = ① 의 치명 줄을 다 뗀 같은 영웅(마스터리 그대로) — 「치명 몰빵 한 벌」의 값
 * 변형 = 기준(무기 베이스 한 줄 · 죄종 분노) · 무기 줄 하나(죄종 무관 — top.mjs 와 같은 견본 · Lv50 최고값) · crit_both(무기에 치명 두 줄 — 레전더리만 합법) · nocrit
 * KIT=1|2 [CRITW=20] [WV_SRC=스냅숏/src] node top_crit.mjs <out.jsonl> <groups,comma> <seedFrom> <seedTo> <K>
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
if (!['1', '2'].includes(KIT)) throw new Error(`KIT ${KIT}`);
const FULL = KIT === '2';
const CRITW = Number(process.env.CRITW ?? 20);
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
const BASE = FULL ? 2.0 : 1.0;
const S = 'wrath';
const CRIT = ['crit_rate', 'crit_damage'];
const TIER = A.tiers.find(t => t.id === T);
const KIT_W = FULL ? { legendary: 1 } : TIER.rarityWeights;
const KIT_UP = FULL ? UPMAX : Math.min(TIER.up ?? 0, UPMAX);
// 부위마다 분노 표의 치명 줄 최고값 — 둘 다 있는 부위(장갑 · 목걸이)는 **치명 피해가 먼저**(확률만 쌓으면 100% 를 넘어 버려진다 — 11-25 맛보기에서 도끼 103%),
//   확률만 있는 부위(투구 · 반지)는 확률
const WT = I.sinOptionTable(S);
const critRows = slot => {
    const rows = WT.slots.find(s => s.slot === slot)?.rows ?? [];
    return ['crit_damage', 'crit_rate'].map(st => rows.find(r => r.stat === st)).filter(Boolean).map(r => ({ stat: r.stat, v: r.ranges.at(-1).max }));
};
function pickIndex(rng, w) { const s = w.reduce((a, b) => a + b, 0); let r = rng() * s; for (let i = 0; i < w.length; i++) { if (r < w[i]) return i; r -= w[i]; } return w.length - 1; }
function respend(h, gear, rng) {
    const pts = Object.values(h.mastery ?? {}).reduce((a, b) => a + b, 0) + (h.masteryPoints ?? 0);
    const hh = { ...h, mastery: {}, masteryPoints: pts };
    const nodes = H.masteryNodesFor(hh);
    while (hh.masteryPoints > 0) {
        const open = nodes.filter(n => n.unlockLevel <= hh.level && H.masteryRowOpen(hh, n) && (hh.mastery[n.id] ?? 0) < n.maxRank
            && H.masteryRowUsed(hh, n) < D.balance.mastery_row_points && !H.masteryPickOneBlocked(hh, n) && H.gateOn(n, gear, hh));
        if (!open.length) break;
        const n = open[pickIndex(rng, open.map(x => (x.treeKind === 'sin' ? D.balance.arena_ai_main_tree_weight : 1)
            * ((hh.mastery[x.id] ?? 0) > 0 ? D.balance.arena_ai_continue_weight : 1) * (CRIT.includes(x.stat) ? CRITW : 1)))];
        hh.mastery[n.id] = (hh.mastery[n.id] ?? 0) + 1;
        hh.masteryPoints -= 1;
    }
    return hh;
}
// 아이템의 분노 줄을 치명 줄로 — 분노 줄 수만큼 · 치명 줄이 모자라면 남은 자리는 원래 분노 줄(치명 아닌 것)
function critify(it) {
    const cr = critRows(it.slot);
    const wr = it.affixes.filter(a => a.src === S);
    if (!cr.length || !wr.length) return it;
    const put = cr.slice(0, wr.length).map(c => ({ stat: c.stat, v: c.v, src: S }));
    const keep = wr.filter(a => !CRIT.includes(a.stat)).slice(0, wr.length - put.length);
    const rest = it.affixes.filter(a => a.src !== S);
    return { ...it, affixes: [...rest, ...put, ...keep] };
}
const uncrit = it => ({ ...it, affixes: it.affixes.filter(a => !(a.src === S && CRIT.includes(a.stat))) });
const gi = g => ALLG.indexOf(g);
function sheet(p, gear) { return H.computeCombat(p.hero, gear.map(I.effective), {}, null); }
function critBuild(team, seed, g) {
    const p0 = team[0];
    const rng = makeRng(deriveSeed(seed * 7919 + 17, 700000 + gi(g) * 10 + 0));
    const gear = p0.gear.map(it => {
        if (it.slot === 'weapon') return { ...it, sins: [S] };
        for (let k = 0; k < 400; k++) {
            const [x] = I.rollGear(rng, { slots: [it.slot], ilvl: it.ilvl ?? L, rarityWeights: KIT_W });
            if ((x.sins ?? []).includes(S)) return critify({ ...x, uid: it.uid, ...(KIT_UP > 0 && I.upgradeable(x) ? { up: KIT_UP } : {}) });
        }
        throw new Error(`critBuild: ${it.slot} 에 ${S} 가 안 붙는다`);
    });
    const hero = respend(p0.hero, gear, rng);
    const mk = gr => [{ ...p0, hero, gear: gr, combat: H.computeCombat(hero, gr.map(I.effective), {}, null), actives: SK.activesFor(hero, { skillPlus: I.skillPlusOf(gr) }) }, ...team.slice(1)];
    const lines = gear.filter(it => it.slot !== 'weapon').flatMap(it => it.affixes.filter(a => a.src === S && CRIT.includes(a.stat)).map(a => `${it.slot}:${a.stat}`));
    return { crit: mk(gear), nocrit: mk(gear.map(it => (it.slot === 'weapon' ? it : uncrit(it)))), lines };
}
const kindOf = g => WG[g].damageKind === 'magic' ? 'magic' : 'physical';
const NODE = Object.fromEntries(H.masteryNodes.map(n => [n.id, n]));
const TOP = {};
for (const sin of ['wrath', 'envy', 'pride', 'greed', 'sloth', 'gluttony', 'lust']) {
    const t = I.sinOptionTable(sin);
    const w = t?.slots.find(s => s.slot === 'weapon');
    for (const r of w?.rows ?? []) TOP[`${sin}:${r.stat}:${r.appliesTo}`] = { v: r.ranges.at(-1).max, level: !!r.level };
}
const topOf = (sin, stat, kind) => TOP[`${sin}:${stat}:${kind}`] ?? TOP[`${sin}:${stat}:all`];
function samples(g) {
    const m = {}, rng = makeRng(deriveSeed(4242, L * 100 + gi(g)));
    for (let k = 0; k < 6000; k++) {
        const [w] = I.rollGear(rng, { slots: ['weapon'], ilvl: L, weaponGroup: g, rarityWeights: { legendary: 1 } });
        for (const a of w.affixes) if (a.src !== 'fixed') m[`${a.src}:${a.stat}${a.skill ? '@' + a.skill : ''}`] ??= { ...a };
    }
    return m;
}
const strip = (w, base) => ({ ...w, sins: [S], words: [], affixes: [{ stat: 'atk_pct', src: 'fixed', v: base }] });
const withLine = (w0, aff, v) => ({ ...w0, sins: [aff.src], words: [0], affixes: [w0.affixes[0], { ...aff, v }] });
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
function withWeapon(team, w) {
    const p0 = team[0];
    const gear = p0.gear.map(it => it.slot === 'weapon' ? w : it);
    return [{ ...p0, gear, combat: sheet(p0, gear), actives: SK.activesFor(p0.hero, { skillPlus: I.skillPlusOf(gear) }), weaponGroup: w.group }, ...team.slice(1)];
}

const out = fs.createWriteStream(OUT, { flags: 'a' });
const t0 = Date.now();
const SMP = Object.fromEntries(GROUPS.map(g => [g, samples(g)]));
for (let seed = Number(S0); seed <= Number(S1); seed++) {
    for (const g of GROUPS) {
        const kind = kindOf(g);
        const team0 = teamFor(g, seed);
        const opp = maxOut(A.rollTierOpponent(T, makeRng(deriveSeed(seed * 7919 + 17, 900000 + gi(g))), team0.map(p => p.hero.name), rollOpts({})));
        const cb = critBuild(team0, seed, g);
        const kitW = cb.crit[0].gear.find(it => it.slot === 'weapon');
        const w0 = strip(kitW, BASE);
        const variants = [['base', cb.crit, w0, BASE], ['nocrit', cb.nocrit, w0, BASE]];
        const both = { ...w0, words: [0, 0], affixes: [w0.affixes[0], ...['crit_rate', 'crit_damage'].map(st => ({ stat: st, src: S, v: topOf(S, st, kind).v }))] };
        variants.push(['crit_both', cb.crit, both, 'both']);
        for (const [key, aff] of Object.entries(SMP[g])) {
            const tp = topOf(aff.src, aff.stat, kind);
            if (tp == null) continue;
            const line = tp.level ? withLine(w0, { ...aff, skillLv: tp.v }, D.balance[`${aff.stat}_chance`]) : withLine(w0, aff, tp.v);
            variants.push([key, cb.crit, line, tp.level ? `Lv${tp.v}` : tp.v]);
        }
        const sh = team => { const c = team[0].combat; return { cr: c.crit_rate, cd: c.crit_damage }; };
        const row = { kit: KIT, critBuild: true, seed, L, g, cls: team0[0].hero.cls, kind, lines: cb.lines,
            sheet: { crit: sh(withWeapon(cb.crit, w0)), nocrit: sh(withWeapon(cb.nocrit, w0)), both: sh(withWeapon(cb.crit, both)) },
            mastery: Object.entries(cb.crit[0].hero.mastery).filter(([id]) => CRIT.includes(NODE[id]?.stat)).map(([id, r]) => `${id}:${r}`), v: {} };
        // EXP=1 — 치명 새는 곳 실험: 기준 판의 치명 확률을 0 · 1 로 눌러 고정(시트 값만 덮는다) · 계측 사본(battle.js 의 globalThis.__CS)이 직격 몫을 센다
        const EXP = process.env.EXP === '1';
        const forceCrit = (team, cr) => [{ ...team[0], combat: { ...team[0].combat, crit_rate: cr } }, ...team.slice(1)];
        const runs = EXP ? [['c0', cb.crit, w0, 0, 0], ['c1', cb.crit, w0, 1, 1]] : variants;
        if (EXP) row.cd = withWeapon(cb.crit, w0)[0].combat.crit_damage;
        for (const [name, team, w, val, fc] of runs) {
            const tm0 = withWeapon(team, w);
            const tm = fc == null ? tm0 : forceCrit(tm0, fc);
            const rec = { val, dealt: [], dur: [], won: [] };
            if (EXP) globalThis.__CS = { direct: 0, ov: 0, n: 0, cb: 0, critN: 0, critReal: 0, critOv: 0, skill: 0, skillCrit: 0, skillN: 0 };
            for (let k = 0; k < K; k++) {
                const r = A.fight(tm, opp, makeRng(deriveSeed(seed * 7919 + 17, 500000 + k)));
                rec.dealt.push(r.contrib.find(c => c.uid === 'pA0')?.dealt ?? 0);
                rec.dur.push(r.durationSec); rec.won.push(r.won ? 1 : 0);
            }
            if (EXP) rec.cs = globalThis.__CS;
            row.v[name] = rec;
        }
        out.write(JSON.stringify(row) + '\n');
    }
    console.log(`seed ${seed} done · ${Math.round((Date.now() - t0) / 1000)}s`);
}
out.end();
