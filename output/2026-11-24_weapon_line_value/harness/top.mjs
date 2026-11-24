/**
 * Lv50 최고값 무기 줄 하나의 결투 값어치 (2026-11-24 · 사용자 「레벨50 최고옵션기준 옵션풀이랑 결투에 미치는 영향」 · 「이거를 1번으로 하고 2번도 하나 저장해서 해볼래? 완전풀템으로」).
 * 11-23 output/2026-11-23_weapon_line_value/harness/wv.mjs 와 같은 판 · 결투장 「챔피언」 등급(arena_tier.csv champion — Lv50) 3 대 3 · 재는 영웅 = 내 팀 첫 자리(그 무기군 직업)
 *   변형 = 기준 무기(죄종 줄을 다 뗀 베이스 한 줄) → 기준 + 줄 하나를 **분노 단어 위끝(Lv50 최고값)** 으로 · 발동 줄은 풀의 스킬마다 따로
 *   지표 = 그 영웅이 가한 실제 피해 합 ÷ 판 시간 합 (analyze.mjs)
 * **KIT** — 차림 둘
 *   1 = 챔피언 AI 팀 그대로 — 7부위 · 아이템 레벨 50 · 매직 20 : 레어 80 · 강화 +6(arena_tier.csv gear_up) · 스킬 레벨 5(skill_up) · 전직 · 마스터리 다 씀(AI 가중 무작위) ·
 *       기준 무기 베이스 +100% · 비교 변형 base_top = +200%
 *   2 = 완전 풀템 — 1 과 같되 장비 전부 **레전더리** · 강화 = 건물 · 연구소를 다 지었을 때의 상한(`limitsOf().upgrade`) · 스킬 레벨 = 상한(`skillCapMax`) ·
 *       양쪽 팀 다 · 기준 무기 베이스 +200%(위끝) — base_top 변형 없음
 *   둘 다 전술 · 물약 없음 · 영웅 등급은 굴림대로
 * **SINBUILD=1** — 죄종 빌드(B · 2026-11-24 사용자 「그죄종으로 빌드를 좀 해봐 한번 B로」): 줄의 죄종마다 따로 — 재는 영웅 = 그 죄종 영웅 ·
 *   무기 외 장비를 부위마다 그 죄종 메인 줄이 붙을 때까지 다시 굴린다(희귀도 · 강화 = 차림 그대로) · 기준 무기도 그 죄종 장비로 센다(줄 하나로 「그 죄종 장비 n개」 조건이 새로 열리는 몫이 안 섞이게) ·
 *   마스터리 = 그 장비로 다시 찍는다(arena spendMastery 와 같은 가중 · 주력 트리 = 죄종 트리) · 기준은 죄종마다 따로 · base_top 없음 · 같은 편 둘 · 상대 팀은 그대로
 * KIT=1|2 [SINBUILD=1] [ONLY=stat,..] [WV_SRC=스냅숏/src] node top.mjs <out.jsonl> <groups,comma> <seedFrom> <seedTo> <K>
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
const UPMAX = SYS.game.limitsOf({ buildings: Object.fromEntries(SYS.construction.list.map(b => [b.id, b.maxRank])),
    labNodes: Object.fromEntries((D.labNodes ?? []).map(n => [`${n.line}:${n.node}`, n.max])) }).upgrade;
const SKMAX = SYS.game.skillCapMax();
const rollOpts = extra => ({ floorRules: true, ...(FULL ? { rarityWeights: { legendary: 1 } } : {}), ...extra });
// 차림 2 — 강화 · 스킬 레벨을 상한으로 올리고 전투 시트 · 액티브를 다시 잰다(전술 없음 — withWeapon 과 같은 부름)
function maxOut(team) {
    if (!FULL) return team;
    return team.map(p => {
        const gear = p.gear.map(it => (I.upgradeable(it) ? { ...it, up: UPMAX } : it));
        const hero = { ...p.hero, skillLv: Object.fromEntries([p.hero.innate, p.hero.bookSkill].filter(Boolean).map(id => [id, SKMAX])) };
        return { ...p, hero, gear, combat: H.computeCombat(hero, gear.map(I.effective), {}, null), actives: SK.activesFor(hero, { skillPlus: I.skillPlusOf(gear) }) };
    });
}
const BASE = FULL ? 2.0 : 1.0;
// ── 죄종 빌드(SINBUILD=1) ──
const SINBUILD = process.env.SINBUILD === '1';
const SINS = ['wrath', 'envy', 'pride', 'greed', 'sloth', 'gluttony', 'lust'];
const TIER = A.tiers.find(t => t.id === T);
const KIT_W = FULL ? { legendary: 1 } : TIER.rarityWeights;
const KIT_UP = FULL ? UPMAX : Math.min(TIER.up ?? 0, UPMAX);
function pickIndex(rng, w) { const s = w.reduce((a, b) => a + b, 0); let r = rng() * s; for (let i = 0; i < w.length; i++) { if (r < w[i]) return i; r -= w[i]; } return w.length - 1; }
// arena.spendMastery 와 같은 가중 무작위 · 주력 트리 = 죄종 트리 · 쓴 포인트를 모두 돌려받아 새 장비(그 죄종 장비 n개 조건)로 다시 찍는다
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
    if (process.env.DEBUG_BUILD) {
        const byId = Object.fromEntries(H.masteryNodes.map(n => [n.id, n]));
        const pts = k => Object.entries(hero.mastery).filter(([id]) => byId[id]?.treeKind === k).reduce((s, [, r]) => s + r, 0);
        const t3 = Object.entries(hero.mastery).filter(([id]) => byId[id]?.treeKind === 'sin' && byId[id]?.tier === 3).map(([id, r]) => `${byId[id].stat}:${r}`);
        const c0 = p0.combat, c1 = H.computeCombat(hero, gear.map(I.effective), {}, null);
        console.error(JSON.stringify({ crit0: c0.crit_rate, critD0: c0.crit_damage, crit1: c1.crit_rate, critD1: c1.crit_damage, S, heroSin: hero.sin, sinGear: gear.filter(x => (x.sins ?? []).includes(S)).length, sinPts: pts('sin'), clsPts: pts('class'), before: Object.values(p0.hero.mastery ?? {}).reduce((s, r) => s + r, 0), t3 }));
    }
    return [{ ...p0, hero, gear, combat: H.computeCombat(hero, gear.map(I.effective), {}, null), actives: SK.activesFor(hero, { skillPlus: I.skillPlusOf(gear) }) }, ...team.slice(1)];
}
const kindOf = g => WG[g].damageKind === 'magic' ? 'magic' : 'physical';
const gi = g => ALLG.indexOf(g);

// Lv50 최고값 — 게임 함수(도감 옵션 탭과 같은 표) · 맨 위 단(분노 단어)의 위끝
const TOP = {};
for (const sin of ['wrath', 'envy', 'pride', 'greed', 'sloth', 'gluttony', 'lust']) {
    const t = I.sinOptionTable(sin);
    const w = t?.slots.find(s => s.slot === 'weapon');
    for (const r of w?.rows ?? []) TOP[`${sin}:${r.stat}:${r.appliesTo}`] = { v: r.ranges.at(-1).max, level: !!r.level };
}
const topOf = (sin, stat, kind) => TOP[`${sin}:${stat}:${kind}`] ?? TOP[`${sin}:${stat}:all`];

// 줄 견본 — 발동 줄은 스킬마다 · 그 무기군 · Lv50 에서 굴려 줍는다
function samples(g) {
    const m = {}, rng = makeRng(deriveSeed(4242, L * 100 + gi(g)));
    for (let k = 0; k < 6000; k++) {
        const [w] = I.rollGear(rng, { slots: ['weapon'], ilvl: L, weaponGroup: g, rarityWeights: { legendary: 1 } });
        for (const a of w.affixes) if (a.src !== 'fixed') m[`${a.src}:${a.stat}${a.skill ? '@' + a.skill : ''}`] ??= { ...a };
    }
    return m;
}
const strip = (w, base, S = null) => ({ ...w, sins: S ? [S] : [], words: [], affixes: [{ stat: 'atk_pct', src: 'fixed', v: base }] });
const withLine = (w0, aff, v) => ({ ...w0, sins: [aff.src], words: [0], affixes: [w0.affixes[0], { ...aff, v }] });

function teamFor(g, seed, S = null) {
    const cls = WG[g].classes[0];
    for (let t = 0; t < 200; t++) {
        const team = A.rollTierOpponent(T, makeRng(deriveSeed(seed * 7919 + 17, gi(g) * 1000 + t)), [], rollOpts({ party: { heroes: [{ cls, ...(S ? { sin: S } : {}) }], tactics: [] } }));
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
    const combat = H.computeCombat(p0.hero, gear.map(I.effective), {}, null);
    const actives = SK.activesFor(p0.hero, { skillPlus: I.skillPlusOf(gear) });
    return [{ ...p0, gear, combat, actives, weaponGroup: w.group }, ...team.slice(1)];
}

const out = fs.createWriteStream(OUT, { flags: 'a' });
const t0 = Date.now();
const SMP = Object.fromEntries(GROUPS.map(g => [g, samples(g)]));
for (let seed = Number(S0); seed <= Number(S1); seed++) {
    for (const g of GROUPS) {
        const kind = kindOf(g);
        const team0 = teamFor(g, seed);
        const opp = maxOut(A.rollTierOpponent(T, makeRng(deriveSeed(seed * 7919 + 17, 900000 + gi(g))), team0.map(p => p.hero.name), rollOpts({})));
        for (const S of (SINBUILD ? SINS.filter(s => Object.values(SMP[g]).some(a => a.src === s)) : [null])) {
            const team = S ? sinBuild(teamFor(g, seed, S), S, seed, g) : team0;
            const kitW = team[0].gear.find(it => it.slot === 'weapon');
            const w0 = strip(kitW, BASE, S);
            const variants = [['base', w0, BASE], ...(FULL || S ? [] : [['base_top', strip(kitW, 2.0), 2.0]])];
            for (const [key, aff] of Object.entries(SMP[g])) {
                if (S && aff.src !== S) continue;
                if (process.env.ONLY && !process.env.ONLY.split(',').includes(aff.stat)) continue;
                const tp = topOf(aff.src, aff.stat, kind);
                if (tp == null) continue;
                // 발동 레벨 줄(R567) — 확률은 고정 키 · 최고값은 스킬 레벨
                const line = tp.level ? withLine(w0, { ...aff, skillLv: tp.v }, D.balance[`${aff.stat}_chance`]) : withLine(w0, aff, tp.v);
                variants.push([key, line, tp.level ? `Lv${tp.v}` : tp.v]);
            }
            const row = { kit: KIT, ...(S ? { sinBuild: S } : {}), seed, L, g, cls: team[0].hero.cls, kind, skills: team[0].actives.map(a => a.id), v: {} };
            for (const [name, w, val] of variants) {
                const tm = withWeapon(team, w);
                const rec = { val, dealt: [], dur: [], won: [] };
                for (let k = 0; k < K; k++) {
                    const r = A.fight(tm, opp, makeRng(deriveSeed(seed * 7919 + 17, 500000 + k)));
                    rec.dealt.push(r.contrib.find(c => c.uid === 'pA0')?.dealt ?? 0);
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
