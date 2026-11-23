/**
 * 무기 줄 값어치 측정 (2026-11-23 · 사용자 「실제로 다른옵션 올라갔을때랑 베이스 올라갔을때랑 얼마나 차이가나는지」).
 * 게임 로직은 안 바꾼다 — 스냅숏(../snap/src)을 Node 로 돌린다.
 *
 * 판(trial) = (무기군 g · 등급 T · 씨앗 s):
 *   우리 팀 = 결투장 등급 차림(층 규칙) · 첫 칸 직업 = g 의 직업 · 첫 영웅이 g 무기를 든 차림이 나올 때까지 다시 굴린다(마스터리가 그 무기로 찍힌다)
 *   상대 팀 = 같은 등급 차림(층 규칙 · 직업 무작위)
 *   그 영웅 무기 = 차림의 무기(같은 베이스 · 강화) 에서 줄을 다 걷고 베이스 「무기 데미지 +%」 하나만 = 기준
 *   변형 = 기준 + 줄 하나(그 영웅 레벨에서 점수 0 이 되는 값 · 점수 1 이 되는 값) / 베이스 값만 바꾼 것
 *   변형마다 같은 씨앗 K 판(공통 난수) — 그 영웅이 가한 피해 · 판 시간 · 승패
 * 점수는 게임 함수 그대로(`item.autoEquipScore(무기, skill.equipFit(영웅, 종류), 영웅 레벨, 직업)`).
 *
 * node wv.mjs <out.jsonl> <groups,comma> <tiers,comma> <seedFrom> <seedTo> <K> [pvp|pve]
 */
import fs from 'node:fs';
import { D, SYS, rngMod } from './boot.mjs';

const { makeRng, deriveSeed } = rngMod;
const [OUT, GARG, TARG, S0, S1, KARG, MODE = 'pvp'] = process.argv.slice(2);
const GROUPS = GARG.split(','), TIERS = TARG.split(','), K = Number(KARG);
const A = SYS.arena, I = SYS.item, H = SYS.hero, SK = SYS.skill, BT = SYS.battle;
const WG = D.weaponGroups;
const TIER_LV = Object.fromEntries(A.tiers.map(t => [t.id, t.level]));

// 원정(PvE) — 등급 레벨 근처 스테이지 셋(종족 Demon · Normal · Undead 하나씩) · 50 은 나이트메어
const PVE = {
    bronze: { stages: [1041, 1021, 1031], difficulty: 'normal' },
    gold: { stages: [4041, 4031, 4011], difficulty: 'normal' },
    champion: { stages: [5033, 5023, 5013], difficulty: 'nightmare' },
};

const BASE_STATS = new Set(['atk_pct']);
const kindOf = g => WG[g].damageKind === 'magic' ? 'magic' : 'physical';
const linesFor = g => {
    const k = kindOf(g), seen = new Set(), out = [];
    for (const r of D.weaponSinOptions) {
        if (!(r.appliesTo === 'all' || r.appliesTo === k)) continue;
        const key = `${r.sin}:${r.stat}`;
        if (seen.has(key)) continue;
        seen.add(key); out.push({ sin: r.sin, stat: r.stat });
    }
    return out;
};

// 줄 모양 견본(발동 줄의 skill 같은 덧붙은 칸) — 그 무기군 · 그 레벨에서 굴려 줍는다
const sampleMemo = new Map();
function samples(g, L) {
    const key = `${g}@${L}`;
    if (sampleMemo.has(key)) return sampleMemo.get(key);
    const m = {}, rng = makeRng(deriveSeed(4242, L * 100 + GROUPS.indexOf(g)));
    for (let k = 0; k < 3000 && Object.keys(m).length < 40; k++) {
        const [w] = I.rollGear(rng, { slots: ['weapon'], ilvl: L, weaponGroup: g, rarityWeights: { legendary: 1 } });
        for (const a of w.affixes) if (a.src !== 'fixed') m[`${a.src}:${a.stat}`] ??= { ...a };
    }
    sampleMemo.set(key, m);
    return m;
}

const strip = (w, base) => ({ ...w, sins: [], words: [], affixes: [{ stat: 'atk_pct', src: 'fixed', v: base }] });
const withLine = (w0, aff, v) => ({ ...w0, sins: [aff.src], words: [0], affixes: [w0.affixes[0], { ...aff, v }] });

// 점수 0 · 1 이 되는 값 — 점수는 값에 1차(위끝 안 자름)라 큰 값 두 개로 기울기 · 절편을 푼다(게임 함수 그대로)
//   베이스 무게를 잠깐 0 으로 — 색욕 최소 · 최대 데미지 줄은 베이스 몫(weaponDamageFixed)에도 들어가 옵션 자리만 따로 풀어야 한다(item 은 D.balance 를 참조로 든다)
function lineRange(w0, aff, L, cls) {
    const wB = D.balance.auto_equip_base_weight;
    D.balance.auto_equip_base_weight = 0;
    try { return lineRange0(w0, aff, L, cls); } finally { D.balance.auto_equip_base_weight = wB; }
}
function lineRange0(w0, aff, L, cls) {
    const s0 = I.autoEquipScore(w0, null, L, cls);
    const q = v => I.autoEquipScore(withLine(w0, aff, v), null, L, cls) - s0;
    const v1 = 1000, v2 = 2000, q1 = q(v1), q2 = q(v2);
    if (!(q2 > q1)) return null;
    const w = (v2 - v1) / (q2 - q1), lo = v1 - q1 * w;
    const r = x => Math.round(x * 1e6) / 1e6;
    return { lo: r(lo), hi: r(lo + w) };
}

function teamFor(g, T, seed) {
    const cls = WG[g].classes[0];
    for (let t = 0; t < 200; t++) {
        const team = A.rollTierOpponent(T, makeRng(deriveSeed(seed * 7919 + 17, GROUPS.indexOf(g) * 1000 + t)), [], { floorRules: true, party: { heroes: [{ cls }], tactics: [] } });
        if (team[0].gear.find(it => it.slot === 'weapon')?.group === g) {
            team.forEach((p, i) => { p.uid = `pA${i}`; p.hero = { ...p.hero, uid: `pA${i}` }; });
            return team;
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
for (let seed = Number(S0); seed <= Number(S1); seed++) {
    for (const T of TIERS) for (const g of GROUPS) {
        const L = TIER_LV[T], kind = kindOf(g);
        const team = teamFor(g, T, seed);
        const hero = team[0].hero, cls = hero.cls;
        const opp = MODE === 'pvp' ? A.rollTierOpponent(T, makeRng(deriveSeed(seed * 7919 + 17, 900000 + GROUPS.indexOf(g))), team.map(p => p.hero.name), { floorRules: true }) : null;
        const kitW = team[0].gear.find(it => it.slot === 'weapon');
        const fit = SK.equipFit(hero, kind);
        const w0 = strip(kitW, 1.0);
        const variants = [['base', w0], ['base_lo', strip(kitW, 0.5)], ['base_hi', strip(kitW, 1.5)]];
        const ranges = {};
        const smp = samples(g, L);
        const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
        if (ONLY) variants.splice(1);   // 다시 잴 줄만 — 기준(base)은 남긴다
        for (const { sin, stat } of linesFor(g)) {
            if (ONLY && !ONLY.has(stat)) continue;
            const aff = smp[`${sin}:${stat}`];
            if (!aff) continue;
            const rg = lineRange(w0, aff, L, cls);
            if (!rg) continue;
            ranges[stat] = rg;
            variants.push([`${stat}_lo`, withLine(w0, aff, rg.lo)], [`${stat}_hi`, withLine(w0, aff, rg.hi)]);
        }
        const row = { seed, T, L, g, cls, kind, skills: team[0].actives.map(a => a.id), ranges, v: {} };
        for (const [name, w] of variants) {
            const tm = withWeapon(team, w);
            const rec = { score: Math.round(I.autoEquipScore(w, fit, L, cls) * 1e4) / 1e4, dealt: [], dur: [], won: [] };
            for (let k = 0; k < K; k++) {
                if (MODE === 'pvp') {
                    const r = A.fight(tm, opp, makeRng(deriveSeed(seed * 7919 + 17, 500000 + k)));
                    rec.dealt.push(r.contrib.find(c => c.uid === 'pA0')?.dealt ?? 0);
                    rec.dur.push(r.durationSec); rec.won.push(r.won ? 1 : 0);
                } else {
                    const P = PVE[T];
                    const stage = P.stages[k % P.stages.length];
                    const r = BT.simulate(structuredClone(tm), stage, makeRng(deriveSeed(seed * 7919 + 17, 600000 + k)), L, null, 0, P.difficulty);
                    rec.dealt.push(r.contrib.find(c => c.uid === 'pA0')?.dealt ?? 0);
                    rec.dur.push(r.durationSec); rec.won.push(r.won ? 1 : 0);
                }
            }
            row.v[name] = rec;
        }
        out.write(JSON.stringify(row) + '\n');
    }
    console.log(`seed ${seed} done · ${Math.round((Date.now() - t0) / 1000)}s`);
}
out.end();
