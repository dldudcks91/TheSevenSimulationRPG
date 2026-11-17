/**
 * 자동 장착 백테스트 — 3:3 결투 (2026-11-17 · 사용자 「아이템레벨+기본옵션+옵션점수를 합산한 점수 … 높은순으로」 · 「다양하게 3:3 으로」).
 * **게임에는 점수 방식이 없다** — 이 하네스 안에서만 고른다. 세기 방식은 state.autoEquip(R313)을 그대로 옮겼다(전투 능력치는 결투장과 같은 hero.computeCombat).
 *
 * 판(trial)마다: 결투장 등급 차림으로 영웅 셋(직업 무작위 · 스킬 · 마스터리 · 전직은 등급대로) → 장비를 다 벗긴다 →
 *   그 등급 레벨 근처(아이템 레벨 L-10 ~ L)의 장비 N 개짜리 가방 하나 → 방식마다 **같은 가방 사본**에서 영웅 1 → 2 → 3 순으로 자동 장착 →
 *   「방식 X 팀 vs 세기 팀」(같은 영웅 · 같은 가방)을 K 판 — 판마다 씨앗이 다르고 절반은 편을 바꾼다.
 *
 * node ae.mjs <out.jsonl> <seedFrom> <seedTo> [K]
 */
import fs from 'node:fs';
import { D, SYS, rngMod } from './boot.mjs';
import { scoreFn } from './ae_fns.mjs';

const { makeRng, deriveSeed } = rngMod;
const [OUT, S0, S1, KARG] = process.argv.slice(2);
const K = Number(KARG ?? 6);
const A = SYS.arena, I = SYS.item, H = SYS.hero, F = SYS.formula;
const B = D.balance;

const POS = D.equipSlots.map(r => ({ id: r.id ?? r.equip_slot_id, part: r.part }));
const PARTS = [...new Set(POS.map(p => p.part))];
const ARMOR = new Set(['armor', 'helmet', 'gloves', 'boots']);
const MIGHT_PARTS = new Set(['weapon', 'armor', 'helmet', 'gloves', 'boots']);
const RL = ['normal', 'magic', 'rare', 'craft', 'epic', 'legendary', 'unique'];
const rk = r => { const i = RL.indexOf(r); return i < 0 ? RL.length : i; };

/* ── 착용 판 ── */
const gearOf = (ctx, h) => Object.values(h.equipped).filter(Boolean).map(u => ctx.items[u]);
const combatOf = (ctx, h) => H.computeCombat(h, gearOf(ctx, h).map(I.effective), {}, null);
function combatIf(ctx, h, pos, uid) { const s = h.equipped[pos]; h.equipped[pos] = uid; const c = combatOf(ctx, h); h.equipped[pos] = s; return c; }
function equipTo(ctx, h, pos, uid) {
    const i = ctx.bag.indexOf(uid);
    if (i < 0) throw new Error('not in bag ' + uid);
    ctx.bag.splice(i, 1);
    const old = h.equipped[pos];
    h.equipped[pos] = uid;
    if (old) ctx.bag.push(old);
}
const cands = (ctx, h, part) => ctx.bag.map(u => ctx.items[u]).filter(it => it && !it.box && it.slot === part && !I.canEquip(h, it) && I.fitsClass(it, h.cls));
const better = (a, b) => ((a.ilvl ?? 0) - (b.ilvl ?? 0) || rk(a.rarity) - rk(b.rarity)) > 0;

// 세기 — state.js autoEquip(R313) 그대로
const dealtPerSec = c => {
    const a = c.atk_physical ?? c.atk_magic;
    if (!a) return 0;
    const crit = 1 + Math.min(1, c.crit_rate ?? 0) * ((c.crit_damage ?? 1) - 1);
    return (a.min + a.max) / 2 * (c.main_attr_mult ?? 1) * (1 + (c.dmg_bonus_pct ?? 0)) * crit / (c.action_period || 1);
};
const enduredHp = c => { const keep = (1 - F.mitigation(c.defense ?? 0)) * (1 - (c.damage_reduction ?? 0)); return keep > 0 ? (c.hp_max ?? 0) / keep : Infinity; };
const might = c => dealtPerSec(c) * enduredHp(c);
function equipMight(ctx, h) {
    for (const { id: pos, part } of POS) {
        if (MIGHT_PARTS.has(part) || h.equipped[pos]) continue;
        let best = null;
        for (const it of cands(ctx, h, part)) if (!best || better(it, best)) best = it;
        if (best) equipTo(ctx, h, pos, best.uid);
    }
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
// 점수 — 일곱 부위 모두 같은 규칙: 가장 높은 점수 · 지금 낀 것보다 높을 때만
function equipScore(score) {
    return (ctx, h) => {
        for (const { id: pos, part } of POS) {
            let best = null, top = h.equipped[pos] ? score(ctx.items[h.equipped[pos]]) : -Infinity;
            for (const it of cands(ctx, h, part)) { const v = score(it); if (v > top) { best = it; top = v; } }
            if (best) equipTo(ctx, h, pos, best.uid);
        }
    };
}
// 아이템 레벨 → 등급 — 지금 반지 규칙을 일곱 부위에
function equipIlvl(ctx, h) {
    for (const { id: pos, part } of POS) {
        let best = h.equipped[pos] ? ctx.items[h.equipped[pos]] : null, pick = null;
        for (const it of cands(ctx, h, part)) if (!best || better(it, best)) { best = it; pick = it; }
        if (pick) equipTo(ctx, h, pos, pick.uid);
    }
}
// 무작위 — 바닥선
function equipRandom(ctx, h) {
    for (const { id: pos, part } of POS) {
        const c = cands(ctx, h, part);
        if (c.length) equipTo(ctx, h, pos, c[Math.floor(ctx.rng() * c.length)].uid);
    }
}

const VARIANTS = [['M', equipMight], ['MM', equipMight]];
if (process.argv[6] === 'r2') {
    // 2차 — 전투와 무관한 줄(골드 · 매직 찾기 · 경험치)을 뺀 점수(`_nf`) · 1차 최상위 S_b5_o2 를 같이 다시 잰다
    VARIANTS.push(['S_b5_o2', equipScore(scoreFn(5, 2))]);
    for (const [wB, wO] of [[5, 1], [5, 2], [5, 4], [10, 2], [10, 4], [3, 2]]) VARIANTS.push([`S_b${wB}_o${wO}_nf`, equipScore(scoreFn(wB, wO, 'global', true))]);
} else {
    VARIANTS.push(['R', equipRandom], ['L', equipIlvl]);
    for (const wB of [0, 5, 10, 20]) for (const wO of [1, 2, 4]) VARIANTS.push([`S_b${wB}_o${wO}`, equipScore(scoreFn(wB, wO))]);
    VARIANTS.push(['Sg_b10_o2', equipScore(scoreFn(10, 2, 'group'))], ['Sg_b20_o2', equipScore(scoreFn(20, 2, 'group'))]);
}

/* ── 판 ── */
function buildTeam(heroes0, items, bag0, fn, tag, rngSeed) {
    const ctx = { items, bag: bag0.slice(), rng: makeRng(rngSeed) };
    const heroes = heroes0.map(h0 => { const h = structuredClone(h0); h.uid = `${h0.uid}-${tag}`; return h; });
    for (const h of heroes) fn(ctx, h);
    const anyFront = heroes.some(h => H.startRankOf(h.cls) === 0);
    const cs = heroes.map(h => combatOf(ctx, h));
    let front = 0;
    cs.forEach((c, i) => { if (c.hp_max > cs[front].hp_max) front = i; });
    const ranks = Object.fromEntries(heroes.map((h, i) => [h.uid, anyFront ? H.startRankOf(h.cls) : (i === front ? 0 : 1)]));
    const team = A.snapshotTeam(heroes, items, ranks);
    team.forEach(p => { p.startOrder = 'buffFirst'; });
    return { team, heroes, might: cs.map(might), eq: heroes.map(h => ({ ...h.equipped })) };
}

const TIERS = A.tiers;
const NS = [21, 63];
const MODES = ['tier', 'drop'];
const out = fs.createWriteStream(OUT, { flags: 'a' });
const t0 = Date.now();
let done = 0;
for (let seed = Number(S0); seed <= Number(S1); seed++) {
    for (const T of TIERS) for (const N of NS) for (const mode of MODES) {
        const key = `${seed}|${T.id}|${N}|${mode}`;
        const base = deriveSeed(seed * 7919 + 13, TIERS.indexOf(T) * 100 + N * 3 + (mode === 'tier' ? 1 : 2));
        const kit = A.rollTierOpponent(T.id, makeRng(base), [], { floorRules: true });
        const heroes0 = kit.map(p => { const h = structuredClone(p.hero); for (const k of Object.keys(h.equipped)) h.equipped[k] = null; return h; });
        const L = T.level;
        const rb = makeRng(base ^ 0x5bd1e995);
        const parts = Array.from({ length: N }, () => PARTS[Math.floor(rb() * PARTS.length)]);
        const gear = I.rollGear(rb, { slots: parts, ilvl: Math.max(1, L - 5), ilvlSpread: 5, ilvlMax: L, ...(mode === 'tier' ? { rarityWeights: T.rarityWeights } : {}) });
        const items = {};
        gear.forEach((it, j) => {
            it.uid = `b-${j}`;
            if ((T.up ?? 0) > 0 && I.upgradeable(it) && rb() < 0.5) it.up = Math.floor(rb() * (T.up + 1));
            items[it.uid] = it;
        });
        const bag0 = gear.map(it => it.uid);
        const built = {};
        for (const [name, fn] of VARIANTS) built[name] = buildTeam(heroes0, items, bag0, fn, name, base ^ 0x1234);
        const ref = built.M;
        const row = { key, seed, tier: T.id, L, N, mode, cls: heroes0.map(h => h.cls), v: {} };
        for (const [name] of VARIANTS) {
            if (name === 'M') continue;
            const X = built[name];
            let win = 0, draw = 0;
            for (let k = 0; k < K; k++) {
                const r = makeRng(deriveSeed(base, 1000 + k));
                const xFirst = k % 2 === 0;
                const res = xFirst ? A.fight(X.team, ref.team, r) : A.fight(ref.team, X.team, r);
                const xWon = xFirst ? res.won : !res.won;
                if (res.reason && res.reason !== 'wipe' && res.reason !== 'clear') draw++;
                else if (xWon) win++;
            }
            const same = X.eq.reduce((s, e, i) => s + POS.filter(p => e[p.id] === ref.eq[i][p.id]).length, 0) / (POS.length * 3);
            const mr = X.might.reduce((a, b) => a + b, 0) / Math.max(1e-9, ref.might.reduce((a, b) => a + b, 0));
            row.v[name] = { win, draw, n: K, same: Math.round(same * 1000) / 1000, mr: Math.round(mr * 1000) / 1000 };
        }
        out.write(JSON.stringify(row) + '\n');
        done++;
    }
    console.log(`seed ${seed} done · ${done} trials · ${Math.round((Date.now() - t0) / 1000)}s`);
}
out.end();
