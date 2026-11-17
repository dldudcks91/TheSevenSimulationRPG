/**
 * 스크래치 하네스 — 무기 옵션 수치 백테스트 (2026-11-17 · PLAN.md D1 ~ D10). **저장소에 없다 · 측정만.**
 *
 * mode=camp   ?mode=camp&seed=N&stall=300&cap=40000&hell=1
 *   봇 캠페인(노말 → 나이트메어 → 헬 · `2026-11-17_res_penalty/harness/rpen.js` 와 같은 봇) — 대표 칸(장마다 c-4 III · c-5 장 보스)을
 *   **처음 깬 직후** 상태와 단 끝 상태를 `POST /__save/st_<seed>_<diff>_<stageId|end>.json` 으로 남긴다(serve_snap.py 가 dev/obt_states/ 에 쓴다)
 * mode=arena  ?mode=arena&seed=N&tier=normal&who=phys&n=200
 *   결투장 미러 매치(`arena.snapshotTeam` · `arena.fight` = `battle.simulateTeams`) — 단 끝 상태의 파티끼리 · 한쪽 영웅 하나에만 한 줄을 더한다 ·
 *   판마다 씨앗 k · 양쪽 자리(파티 / 적)를 바꿔 두 번 · 같은 씨앗 묶음을 모든 변형이 공유한다
 * mode=probe  ?mode=probe&seed=N&tier=nightmare&K=6
 *   원정 탐침 — 대표 칸을 처음 깬 직후 상태에서 그 칸을 변형마다 K 판(판마다 씨앗만 바꾼다 · 변형 사이에는 같은 씨앗)
 * mode=check  ?mode=check&seed=N&tier=normal — 도구 검증 셋(PLAN 절차 3)
 *
 * 값(D3) — 메인 줄 = 그 무기 아이템 레벨에서 열린 단어 중 위 셋의 **가운데 확률 단어**(6 : 3 : 1 의 3 · 후보가 둘이면 위 · 하나면 그것)의 범위 가운데 ·
 *   랜덤 줄 = 랜덤 줄 범위 가운데 — 둘 다 `SYS.item.optionRange` 를 합성 무기(영웅 무기 사본 · 그 줄 하나)로 불러 낸다(손 계산 없음)
 */
import { loadData, buildSystems, D } from '../ui/data.js';
import { makeRng } from '../game_logic/rng.js';
import { stageDeckKey } from '../game_logic/stage_seed.js';

const NOW = 1_700_000_000_000;
const q = new URLSearchParams(location.search);
const MODE = q.get('mode') ?? 'camp';
const sum = (xs, f = x => x) => xs.reduce((a, x) => a + f(x), 0);
const avg = (xs, f = x => x) => xs.length ? sum(xs, f) / xs.length : 0;
const r2 = v => Math.round(v * 100) / 100;
const r4 = v => Math.round(v * 1e4) / 1e4;
const clone = o => structuredClone(o);
const head = document.getElementById('head');
const say = t => { head.textContent = t; document.title = t; };

let SYS, B;
const partyHeroes = G => SYS.game.partyOf(G).map(uid => SYS.game.heroById(G, uid)).filter(Boolean);

/* ═════════════ 봇 (rpen.js 그대로) ═════════════ */
const CNT = { box: 0, autoMoves: 0, accSwap: 0, salvage: 0, mastery: 0, potion: 0, bookUp: 0, bookLearn: 0, mission: 0 };
const RAR = { normal: 0, magic: 1, rare: 2, craft: 2, epic: 3, legendary: 4, unique: 5, set: 5 };
const accKey = it => (it.ilvl ?? 0) * 10 + (RAR[it.rarity] ?? 0);
function botBoxes(G) {
    SYS.game.mainMissionSync(G);
    for (const m of SYS.game.mainMissionState(G).claimable) if (SYS.game.mainMissionClaim(G, m.id).ok) CNT.mission++;
    for (const uid of G.stash.slice()) if (G.items[uid]?.box) SYS.game.moveToBag(G, uid, 1);
    const party = partyHeroes(G);
    for (let k = 0; party.length && k < 200; k++) {
        const uid = G.bags.flat().find(u => G.items[u]?.box);
        if (!uid || !SYS.game.openBox(G, uid, party[k % party.length].uid).ok) break;
        CNT.box++;
    }
}
function botAuto(G) {
    botBoxes(G);
    for (const h of partyHeroes(G)) CNT.autoMoves += SYS.game.autoEquip(G, h.uid, 1).changes?.length ?? 0;
    for (const h of partyHeroes(G)) for (const pos of ['amulet', 'ring1', 'ring2']) {
        const part = pos === 'amulet' ? 'amulet' : 'ring';
        const cur = G.items[h.equipped[pos]];
        let best = null;
        for (const uid of G.bags.flat()) {
            const it = G.items[uid];
            if (!it || it.box || it.slot !== part || SYS.item.canEquip(h, it)) continue;
            if ((!cur || accKey(it) > accKey(cur)) && (!best || accKey(it) > accKey(best))) best = it;
        }
        if (best && SYS.game.equip(G, h.uid, best.uid, pos).ok) CNT.accSwap++;
    }
}
const salvageBag = G => { for (const uid of G.bags.flat()) if (SYS.game.salvage(G, uid).ok) CNT.salvage++; };
function botMastery(G) {
    for (const h of partyHeroes(G)) for (;;) {
        const node = SYS.game.masteryState(G, h.uid)?.nodes.find(x => x.canLearn);
        if (!node || !SYS.game.learnMastery(G, h.uid, node.id).ok) break;
        CNT.mastery++;
    }
}
function botPotion(G) {
    const list = (SYS.game.shopState(G, NOW)?.potions ?? []).slice().sort((a, b) => b.tier - a.tier);
    for (const p of list) while (SYS.game.shopPotionBuy(G, p.id).ok) CNT.potion++;
}
function botBooks(G) {
    for (const h of partyHeroes(G)) {
        for (const id of [h.innate, h.bookSkill].filter(Boolean)) {
            for (let k = 0; k < 20 && SYS.game.learnBook(G, h.uid, id).ok; k++) CNT.bookUp++;
        }
        if (h.bookSkill) continue;
        const have = Object.keys(G.books ?? {}).filter(id => G.books[id] > 0 && id !== h.innate)
            .map(id => SYS.skill.defs[id]).filter(d => d && d.ownerKind === 'job' && d.ownerId === h.cls);
        const pick = have.find(d => d.effects?.[0]?.effect === 'hit') ?? have[0];
        if (pick && SYS.game.learnBook(G, h.uid, pick.id).ok) CNT.bookLearn++;
    }
}
function afterRun(G) { botAuto(G); salvageBag(G); botMastery(G); botPotion(G); botBooks(G); }
function gearOf(G) {
    const hs = partyHeroes(G);
    const items = hs.flatMap(h => Object.values(h.equipped).filter(Boolean).map(uid => G.items[uid]).filter(Boolean));
    return { lv: r2(avg(hs, h => h.level)), worn: items.length, ilvl: r2(avg(items, it => it.ilvl ?? 0)),
        cls: hs.map(h => h.cls).join('/') };
}
let REP;
function runTier(G, diff, opt, onArrive, prevDiff = null) {
    const order = D.stageOrder.filter(id => D.stages[id].chapter <= 5);
    const tier = { diff, runs: 0, sec: 0, wins: 0, stuck: null, skips: [], stages: [] };
    const play = (stageId, d = diff) => {
        let r;
        try { r = SYS.game.resolveBattle(G, stageId, NOW, G.preset, d); } catch (e) { return { err: 'throw ' + String(e?.message ?? e).slice(0, 160) }; }
        if (!r.ok) return { err: r.err };
        tier.runs++; tier.sec += r.report.durationSec + B.repeat_restart_sec;
        if (r.report.won) tier.wins++;
        afterRun(G);
        return r.report;
    };
    for (const [idx, stageId] of order.entries()) {
        if (SYS.game.stageCleared(G, stageId, diff)) continue;
        const row = { stageId, tries: 0, wins: 0, farm: 0 };
        tier.stages.push(row);
        let farmAt = order.slice(0, idx).reverse().find(id => D.stages[id].boss_grade !== 'chapter_boss' && SYS.game.stageCleared(G, id, diff)) ?? null, farmDiff = diff;
        if (farmAt == null && prevDiff) { farmAt = order.slice().reverse().find(id => D.stages[id].boss_grade !== 'chapter_boss' && SYS.game.stageCleared(G, id, prevDiff)) ?? null; farmDiff = prevDiff; }
        let streak = 0;
        while (!SYS.game.stageCleared(G, stageId, diff)) {
            if (tier.runs >= opt.cap) { tier.stuck = { why: 'cap', stageId, tries: row.tries }; return tier; }
            if (row.tries >= opt.stall) {
                tier.skips.push({ stageId, tries: row.tries, wins: row.wins });
                const list = diff === 'normal' ? G.progress.cleared : ((G.progress.clearedIn ??= {})[diff] ??= []);
                list.push(stageId);
                row.skipped = true;
                break;
            }
            const rp = play(stageId);
            if (rp.err) { tier.stuck = { why: 'err:' + rp.err, stageId, tries: row.tries }; return tier; }
            row.tries++;
            if (rp.won) { row.wins++; streak = 0; } else streak++;
            if (!rp.won && streak >= opt.patience && farmAt != null && opt.farm > 0) {
                for (let k = 0; k < opt.farm; k++) { if (play(farmAt, farmDiff).err) break; row.farm++; }
                streak = 0;
            }
        }
        if (onArrive && REP.has(stageId) && !row.skipped) onArrive(stageId, G);
    }
    tier.sec = r2(tier.sec);
    return tier;
}

/* ═════════════ 상태 저장 · 읽기 ═════════════ */
const pending = [];
function saveState(name, G) {
    const body = JSON.stringify(SYS.game.serialize(G, NOW));
    pending.push(fetch(`/__save/${name}.json`, { method: 'POST', body }).then(r => { if (!r.ok) throw new Error('save ' + name + ' ' + r.status); return body.length; }));
}
async function flush() { const n = await Promise.all(pending.splice(0)); return sum(n); }
async function loadState(name) {
    const r = await fetch(`obt_states/${name}.json`, { cache: 'no-store' });
    if (!r.ok) return null;
    return SYS.game.deserialize(await r.json());
}

/* ═════════════ 변형 — 한 줄을 영웅 장비 사본에 더한다 ═════════════ */
const ELS = ['fire', 'cold', 'lightning'];
const kindOf = it => D.weaponGroups[it?.group]?.damageKind ?? null;
/** 대상 영웅 — 물리 = 파티 순서의 첫 물리 무기 영웅 · 마법 = 마법사 먼저(사제는 피해 스킬이 고정 피해라 색욕 ② · 시기가 안 먹는다 — item_design §1) · 없으면 null */
function targets(G) {
    const hs = partyHeroes(G);
    const w = h => G.items[h.equipped.weapon];
    const phys = hs.find(h => kindOf(w(h)) === 'physical') ?? null;
    const mags = hs.filter(h => kindOf(w(h)) === 'magic');
    const mag = mags.find(h => h.cls === 'mage') ?? mags[0] ?? null;
    return { phys, mag };
}
/** 기준 줄을 얹을 무기 밖 장비 — 갑옷 먼저 · 없으면 무기 밖 첫 장비 */
const refSlotUid = h => h.equipped.armor ?? Object.entries(h.equipped).find(([p, uid]) => uid && p !== 'weapon')?.[1] ?? null;

/** 메인 줄의 「가운데 확률 단어」 — 열린 단(아이템 레벨) 중 위 셋 · 아래 → 위 6 : 3 : 1 의 3 자리(후보 둘이면 위 · 하나면 그것) */
function midWord(sin, ilvl) {
    const lad = SYS.naming.wordLadder(sin).slice().sort((a, b) => a.tier - b.tier);
    let open = lad.filter(w => w.minIlvl <= ilvl);
    if (!open.length) open = [lad[0]];
    const c = open.slice(-3);
    return { word: (c.length >= 2 ? c[1] : c[0]).i, tier: (c.length >= 2 ? c[1] : c[0]).tier, cands: c.length };
}
/** 그 줄의 범위(게임 함수) — `tpl` = 그 부위의 실제 장비(무기 · 장갑 · 반지 · 목걸이) 사본 · which = main / random */
function bandOf(tpl, row, which) {
    const it = clone(tpl);
    const base = it.slot === 'weapon' ? [{ stat: 'atk_pct', v: 0.5, src: 'fixed' }] : [];
    if (which === 'main') { const mw = midWord(row.sin, it.ilvl); it.sins = [row.sin]; it.words = [mw.word]; }
    else { it.sins = []; it.words = []; }
    it.affixes = [...base, { stat: row.stat, v: 0, src: row.sin }];
    const r = SYS.item.optionRange(it, base.length);
    if (!r) return null;
    return { min: r.min, max: r.max, mid: (r.min + r.max) / 2, rank: which === 'main' ? SYS.item.wordRanks(it)[0] : null, ilvl: it.ilvl };
}
/** 발동 풀 — 게임의 굴림(`item.rollGear` 레전더리)으로 그 무기군에서 실제로 박히는 스킬을 모은다 */
const POOL = {};
function procPool(group, stat, ilvl) {
    const key = `${group}:${stat}`;
    if (POOL[key]) return POOL[key];
    const rng = makeRng(424242), seen = new Set();
    for (let i = 0; i < 4000; i++) {
        const [it] = SYS.item.rollGear(rng, { slots: ['weapon'], ilvl, weaponGroup: group, rarityWeights: { normal: 0, magic: 0, rare: 0, epic: 0, legendary: 1 } });
        for (const a of it.affixes) if (a.stat === stat && a.skill) seen.add(a.skill);
    }
    return (POOL[key] = [...seen].sort());
}

/**
 * 변형 목록 — {id, who, kind, lines:[{at:'weapon'|'ref'|slot, stat, v, src, skill?, skillLv?}], meta}
 * kind: base · dmg · hp · wbase · opt · prideB · pen
 * `arena` = 결투장에서 재나(종족 · 정예 · 탐욕은 결투장 0 — D7 · 원정만)
 */
function variantsFor(G, who, h, which = ['main', 'random']) {
    if (!h) return [];
    const wpn = G.items[h.equipped.weapon];
    const kind = kindOf(wpn);
    const out = [];
    const add = (id, k, lines, meta = {}) => out.push({ id: `${who}:${id}`, who, kind: k, lines, meta: { cls: h.cls, lv: h.level, ilvl: wpn.ilvl, group: wpn.group, ...meta } });
    for (const v of [0.02, 0.05, 0.1, 0.2]) add(`dmg${v}`, 'dmg', [{ at: 'ref', stat: 'atk_pct', v, src: 'ref' }], { v });
    for (const v of [0.02, 0.05, 0.1, 0.2]) add(`hp${v}`, 'hp', [{ at: 'ref', stat: 'hp_pct', v, src: 'ref' }], { v });
    add('wbase0.1', 'wbase', [{ at: 'weapon', stat: 'atk_pct', v: 0.1, src: 'fixed' }], { v: 0.1 });
    const rows = D.weaponSinOptions.filter(r => r.appliesTo === 'all' || r.appliesTo === kind);
    for (const row of rows) {
        const cell = `${row.sin}${row.option}`;
        const noArena = row.sin === 'greed' || (row.sin === 'gluttony' && row.option !== 1);
        for (const w of which) {
            if (w === 'random' && row.sin === 'pride') continue;     // 오만은 랜덤 줄 후보가 아니다(MAIN_ONLY)
            const b = bandOf(wpn, row, w);
            if (!b) { out.push({ id: `${who}:${cell}:${row.stat}:${w}`, who, kind: 'missing', lines: [], meta: { row } }); continue; }
            const meta = { sin: row.sin, option: row.option, stat: row.stat, which: w, band: b, noArena, cell };
            if (row.stat.startsWith('proc_')) {
                for (const sk of procPool(wpn.group, row.stat, wpn.ilvl))
                    add(`${cell}:${row.stat}:${sk}:${w}`, 'opt', [{ at: 'weapon', stat: row.stat, v: b.mid, src: row.sin, skill: sk, skillLv: B.item_proc_skill_level }], { ...meta, skill: sk });
            } else add(`${cell}:${row.stat}:${w}`, 'opt', [{ at: 'weapon', stat: row.stat, v: b.mid, src: row.sin }], meta);
        }
    }
    // 오만 ⓑ — 영웅 레벨의 무기 피해 가운데(formula.weaponMid) × n · 하네스 안에서만 · 같은 stat(dmg_*_flat) 으로 (D8)
    const wm = SYS.formula.weaponMid(h.level);
    for (const n of [0.1, 0.25, 0.5]) for (const st of ['max', 'min'])
        add(`prideB:${st}:${n}`, 'prideB', [{ at: 'weapon', stat: `dmg_${st}_flat`, v: Math.round(wm * n), src: 'pride' }], { n, st, wm, flat: Math.round(wm * n), noProbe: true });
    // 관통 합 (D7 ④) — 무기 · 장갑 · 반지 둘 · 목걸이의 시기 줄(메인 가운데) 을 한 영웅에게 · 물리는 석궁 특성(+표 값)을 따로 한 판 더
    const accTpl = pos => G.items[h.equipped[pos]] ?? null;
    const penRow = (tbl, slot, stat) => tbl.find(r => r.slot === slot && r.sin === 'envy' && r.stat === stat);
    const penLines = stat => {
        const ls = [];
        const wrow = rows.find(r => r.sin === 'envy' && r.stat === stat);
        if (wrow) ls.push({ at: 'weapon', stat, v: bandOf(wpn, wrow, 'main').mid, src: 'envy', part: 'weapon' });
        const gl = accTpl('gloves'), grow = penRow(D.armorSinOptions ?? [], 'gloves', stat);
        if (gl && grow) ls.push({ at: 'gloves', stat, v: bandOf(gl, grow, 'main')?.mid ?? 0, src: 'envy', part: 'gloves' });
        for (const pos of ['ring1', 'ring2']) {
            const it = accTpl(pos), rr = (D.accessorySinOptions ?? []).find(r => r.slot === 'ring' && r.sin === 'envy' && r.stat === stat);
            if (it && rr) ls.push({ at: pos, stat, v: bandOf(it, rr, 'main')?.mid ?? 0, src: 'envy', part: pos });
        }
        const am = accTpl('amulet');
        const arow = stat === 'def_ignore' ? (D.accessorySinOptions ?? []).find(r => r.slot === 'amulet' && r.sin === 'envy' && r.stat === 'def_ignore')
            : (D.accessorySinOptions ?? []).find(r => r.slot === 'amulet' && r.sin === 'envy' && r.stat === 'res_reduction');
        if (am && arow) ls.push({ at: 'amulet', stat: arow.stat, v: bandOf(am, arow, 'main')?.mid ?? 0, src: 'envy', part: 'amulet' });
        return ls;
    };
    if (kind === 'physical') {
        const ls = penLines('def_ignore');
        add('pen', 'pen', ls, { total: r4(sum(ls, l => l.v)), parts: ls.map(l => `${l.part}:${r4(l.v)}`), noProbe: true });
        const xb = D.weaponGroups.crossbow;
        const xv = Number(xb?.trait?.max ?? xb?.trait?.v ?? 0.2);
        add('pen+xbow', 'pen', [...ls, { at: 'ref', stat: 'def_ignore', v: xv, src: 'ref', part: 'crossbow' }], { total: r4(sum(ls, l => l.v) + xv), xbow: xv, noProbe: true });
    } else {
        for (const el of ELS) {
            const ls = penLines(`res_reduction_${el}`);
            add(`pen:${el}`, 'pen', ls, { el, total: r4(sum(ls, l => l.v)), parts: ls.map(l => `${l.part}:${l.stat}:${r4(l.v)}`), noProbe: true });
        }
    }
    return out;
}
/** 변형을 장비 사본(`items` = uid → item)에 적용 — 줄마다 그 자리 장비의 affixes 끝에 붙인다 */
function applyLines(items, h, lines) {
    for (const l of lines) {
        const uid = l.at === 'weapon' ? h.equipped.weapon : l.at === 'ref' ? refSlotUid(h) : h.equipped[l.at];
        if (!uid || !items[uid]) throw new Error(`apply: ${h.uid} 의 ${l.at} 장비가 없다`);
        const a = { stat: l.stat, v: l.v, src: l.src };
        if (l.skill) { a.skill = l.skill; a.skillLv = l.skillLv; }
        items[uid].affixes = [...(items[uid].affixes ?? []), a];
    }
}

/* ═════════════ 검증 ③ — 줄이 전투 능력치에 그대로 들어갔나 ═════════════ */
const fxOf = c => c.option_fx ?? {};
const atkOf = c => c.atk_physical ?? c.atk_magic;
function checkLine(c0, c1, l, hero) {
    const d = (a, b) => (b ?? 0) - (a ?? 0);
    const eq = (x, y) => Math.abs(x - y) < 1e-9;
    const st = l.stat, v = l.v;
    const f0 = fxOf(c0), f1 = fxOf(c1);
    const el = ELS.concat('poison').find(e => st === `${e}_dmg_pct` || st === `res_reduction_${e}`);
    switch (true) {
        case st === 'crit_rate': return eq(d(c0.crit_rate, c1.crit_rate), v);
        case st === 'crit_damage': return Math.abs(d(c0.crit_damage, c1.crit_damage) - v * SYS.formula.statCoef(hero.stats.luck)) < 1e-3;
        case st === 'aspd_pct' || st === 'cast_speed_pct': return eq(d(c0.speed_pct, c1.speed_pct), v);
        case st === 'cooldown_reduction': return eq(d(c0.cooldown_reduction, c1.cooldown_reduction), v);
        case st === 'hit_bonus': return eq(d(f0.hitBonus, f1.hitBonus), v);
        case st === 'buff_dur_pct': return eq(d(f0.buffDur, f1.buffDur), v);
        case st === 'life_steal': return eq(d(c0.life_steal, c1.life_steal), v);
        case st === 'def_ignore': return eq(d(c0.def_ignore, c1.def_ignore), v);
        case st.startsWith('res_reduction_'): return eq(d(c0.res_reduction_el?.[el], c1.res_reduction_el?.[el]), v);
        case st === 'res_reduction': return eq(d(c0.res_reduction, c1.res_reduction), v);
        case st.endsWith('_dmg_pct') && !!el: return eq(d(f0.ele?.[el], f1.ele?.[el]), v);
        case st === 'stagger_dur_pct': return eq(d(f0.staggerDur, f1.staggerDur), v);
        case st === 'crushing_blow_pct': return eq(d(f0.crush, f1.crush), v);
        case st === 'cast_refund_chance': return eq(d(f0.castRefund, f1.castRefund), v);
        case st === 'cast_stack_pct': return eq(d(f0.castStack, f1.castStack), v);
        case st === 'vs_elite_dmg': return eq(d(f0.vsElite, f1.vsElite), v);
        case /^vs_(normal|demon|undead)_dmg$/.test(st): { const k = st.split('_')[1]; return eq(d(f0.vs?.[k], f1.vs?.[k]), v); }
        case st === 'xp_gain_pct': return eq(d(f0.xpGain, f1.xpGain), v);
        case st === 'magic_find': return d(f0.magicFind, f1.magicFind) > 0;
        case st === 'gold_find': return d(c0.find_own?.gold, c1.find_own?.gold) > 0;
        case st.startsWith('proc_'): {
            const ch = st === 'proc_hit_attack' ? 'hitProcs' : 'castProcs';
            return (f1[ch] ?? []).filter(p => p.skill === l.skill && eq(p.chance, Math.min(1, v))).length === (f0[ch] ?? []).filter(p => p.skill === l.skill && eq(p.chance, Math.min(1, v))).length + 1;
        }
        case st === 'dmg_max_per_level' || st === 'dmg_max_flat': return atkOf(c1).max > atkOf(c0).max && atkOf(c1).min === atkOf(c0).min;
        case st === 'dmg_min_per_level' || st === 'dmg_min_flat': return atkOf(c1).min > atkOf(c0).min;
        case st === 'atk_pct': return atkOf(c1).max > atkOf(c0).max;
        case st === 'hp_pct': return c1.hp_max > c0.hp_max;
        default: return null;
    }
}
/** 변형 전체가 능력치에 들어갔나 — 줄이 여럿(관통 합)이면 같은 stat 끼리 합으로 본다 · 반환 {ok, why} */
function checkVariant(c0, c1, v, hero, gear) {
    const why = [];
    // (a) 넣은 값 그대로 장비 사본에 섰나
    for (const l of v.lines) if (!gear.some(it => (it.affixes ?? []).some(a => a.stat === l.stat && a.v === l.v && a.src === l.src && (a.skill ?? null) === (l.skill ?? null)))) why.push(`gear:${l.stat}`);
    // (b) 전투 능력치가 움직였나(선형 칸은 넣은 값 그대로)
    const byStat = {};
    for (const l of v.lines) (byStat[l.stat] ??= { ...l, v: 0 }).v += l.v;
    for (const l of Object.values(byStat)) { const r = checkLine(c0, c1, l, hero); if (r === false) why.push(`combat:${l.stat}`); if (r === null) why.push(`nocheck:${l.stat}`); }
    return { ok: why.length === 0, why };
}

/* ═════════════ 결투장 ═════════════ */
function arenaTeam(G, mod = null) {
    const heroes = partyHeroes(G);
    const items = {};
    for (const h of heroes) for (const uid of Object.values(h.equipped)) if (uid && G.items[uid]) items[uid] = clone(G.items[uid]);
    if (mod) applyLines(items, mod.h, mod.v.lines);
    return SYS.arena.snapshotTeam(heroes, items, SYS.game.formationState(G).byUid, SYS.game.arenaLoadout(G));
}
const mirrorOf = team => team.map((u, i) => ({ ...clone(u), uid: `mirror-${i}`, hero: { ...clone(u.hero), uid: `mirror-${i}` } }));
/** 남은 HP 비율 — 타임라인의 `dhp`(맞은 쪽) · `ahp`(흡혈 = 때린 쪽 · 반사 = d) 를 따라간다 · 처음 명단(파티 · 첫 라운드 적)만 · 소환 제외 */
function hpLeft(res) {
    const hp = {}, max = {}, side = {};
    for (const p of res.party ?? []) { hp[p.key] = p.hpMax; max[p.key] = p.hpMax; side[p.key] = 'P'; }
    const r1 = (res.timeline ?? []).find(ev => ev.e === 'round');
    for (const e of r1?.enemies ?? []) { hp[e.key] = e.hpMax; max[e.key] = e.hpMax; side[e.key] = 'E'; }
    for (const ev of res.timeline ?? []) {
        if (ev.dhp !== undefined) { const k = ev.d ?? ev.u; if (k in hp) { hp[k] = ev.dhp; if (ev.hpMax) max[k] = ev.hpMax; } }
        if (ev.ahp !== undefined) { const k = ev.e === 'reflect' ? ev.d : ev.a; if (k in hp) hp[k] = ev.ahp; }
    }
    const frac = s => { const ks = Object.keys(hp).filter(k => side[k] === s); const m = sum(ks, k => max[k]); return m ? sum(ks, k => Math.max(0, hp[k])) / m : 0; };
    return { P: frac('P'), E: frac('E') };
}
/** 한 판 — A 의 눈으로 승(1 · 0.5 · 0) · 차이(A 남은 HP − B 남은 HP · −1 ~ 1) */
/** 그 유닛(uid)이 준 피해를 종류별로 더한다(직격 · 지속) — 원소 줄의 「맞는 원소」를 바탕 판에서 고른다 */
function dealtByType(res, uid, acc) {
    const key = res.party.find(p => p.uid === uid)?.key
        ?? (res.timeline.find(ev => ev.e === 'round')?.enemies ?? []).find(e => e.hero?.uid === uid)?.key;
    if (!key) return;
    for (const ev of res.timeline) if ((ev.e === 'hit' || ev.e === 'dot') && ev.a === key) acc[ev.ty ?? 'other'] = (acc[ev.ty ?? 'other'] ?? 0) + (ev.dmg ?? 0) - (ev.ov ?? 0);
}
function duel(A, Bt, seed, flip, lo, collect = null) {
    const [P, E] = flip ? [Bt, A] : [A, Bt];
    const res = SYS.arena.fight(P, E, makeRng(seed), lo, lo);
    if (collect) dealtByType(res, collect.uid, collect.acc);
    const pWin = res.reason === 'clear' ? 1 : res.reason === 'timeout' ? 0.5 : 0;
    const hl = hpLeft(res);
    const bad = (res.reason === 'clear' && hl.E > 0) || (res.reason === 'wipe' && hl.P > 0) ? 1 : 0;
    const w = flip ? 1 - pWin : pWin;
    const m = flip ? hl.E - hl.P : hl.P - hl.E;
    return { w, m, sec: res.durationSec, to: res.reason === 'timeout' ? 1 : 0, bad };
}
const fightSeed = (seed, tierIdx, k) => (Math.imul(seed, 1_000_003) + Math.imul(tierIdx + 1, 7_919) + Math.imul(k + 1, 104_729)) >>> 0;
const TIERS = ['normal', 'nightmare', 'hell'];

async function modeArena() {
    const seed = Number(q.get('seed')), tier = q.get('tier') ?? 'normal', who = q.get('who') ?? 'phys', N = Number(q.get('n') ?? 200);
    const only = q.get('only') ? new RegExp(q.get('only')) : null;
    const G = await loadState(`st_${seed}_${tier}_end`);
    if (!G) return { seed, tier, who, missing: 'state' };
    const T = targets(G);
    const h = T[who];
    const meta = { seed, tier, who, N, party: partyHeroes(G).map(x => `${x.cls}:Lv${x.level}`), target: h ? { uid: h.uid, cls: h.cls, lv: h.level, wilvl: G.items[h.equipped.weapon].ilvl, group: G.items[h.equipped.weapon].group } : null };
    if (!h) return { meta, missing: 'target' };
    const lo = SYS.game.arenaLoadout(G);
    const base = arenaTeam(G), mirror = mirrorOf(base);
    const idx = base.findIndex(u => u.uid === h.uid);
    // 쪼개기 — `part=i&parts=n` 이면 변형 목록(바탕 제외)의 i 번째 몫만(번호 % n) · 바탕은 몫마다 다시 돈다(같은 씨앗이라 값이 같다)
    const part = Number(q.get('part') ?? 0), parts = Number(q.get('parts') ?? 1);
    const all = variantsFor(G, who, h).filter(v => v.kind !== 'missing' && !v.meta.noArena && (!only || only.test(v.id)));
    const vars = [{ id: `${who}:base`, who, kind: 'base', lines: [], meta: {} }, ...all.filter((_, i) => i % parts === part)];
    const t0 = performance.now();
    const res = [];
    for (const [vi, v] of vars.entries()) {
        const A = v.kind === 'base' ? base : arenaTeam(G, { h, v });
        let chk = { ok: true, why: [] };
        if (v.kind !== 'base') { chk = checkVariant(base[idx].combat, A[idx].combat, v, h, A[idx].gear); if (!chk.ok) throw new Error(`검증 ③ 실패 ${v.id}: ${chk.why.join(',')}`); }
        const W = [], M = [];
        let sec = 0, to = 0, bad = 0;
        const collect = v.kind === 'base' ? { uid: h.uid, acc: {} } : null;
        for (let k = 0; k < N; k++) for (const flip of [0, 1]) {
            const r = duel(A, mirror, fightSeed(seed, TIERS.indexOf(tier), k), flip, lo, collect);
            W.push(Math.round(r.w * 2)); M.push(Math.round(r.m * 1000)); sec += r.sec; to += r.to; bad += r.bad;   // W 칸 = 승 × 2(2 승 · 1 시간 초과 · 0 패)
        }
        res.push({ id: v.id, kind: v.kind, meta: v.meta, lines: v.lines.map(l => ({ at: l.at, stat: l.stat, v: r4(l.v), skill: l.skill })), W: W.join(''), M, sec: r2(sec / W.length), to, bad,
            ...(collect ? { dealt: Object.fromEntries(Object.entries(collect.acc).map(([k, x]) => [k, Math.round(x)])) } : {}) });
        say(`OBT … arena ${seed} ${tier} ${who} ${vi + 1}/${vars.length}`);
        await new Promise(r => setTimeout(r, 0));
    }
    return { meta: { ...meta, ms: Math.round(performance.now() - t0), nVar: vars.length }, res };
}

/* ═════════════ 원정 탐침 ═════════════ */
function probeOne(G, stageId, diff, k, v, collect = null) {
    const c = clone(G);
    c.counters.battle += 1 + 7919 * (k + 1);
    c.stageDecks ??= {};
    // 챕터보스 칸 — 처음 깬 직후라 재등장 대기(`bossDown` · boss_respawn_sec)에 걸린다. 탐침 사본에서만 지운다(= 1분 기다린 것과 같다 · 시계는 안 돈다)
    if (c.bossDown) delete c.bossDown[`${diff}|${stageId}`];
    const rounds = SYS.battle.stageRounds(D.stages[stageId]).length;
    for (let r = 1; r <= rounds; r++) {
        const key = stageDeckKey(diff, stageId, r);
        const d = c.stageDecks[key] ?? { next: 0, free: [] };
        c.stageDecks[key] = { next: (d.next ?? 0) + 101 * (k + 1), free: [] };
    }
    if (v && v.lines.length) {
        const h = SYS.game.heroById(c, v.uid);
        applyLines(c.items, h, v.lines);
    }
    const gold0 = c.resources.gold;
    let res;
    try { res = SYS.game.resolveBattle(c, stageId, NOW, c.preset, diff); } catch (e) { return { err: 'throw ' + String(e?.message ?? e).slice(0, 120) }; }
    if (!res.ok) return { err: res.err };
    const rp = res.report;
    const drops = (rp.drops ?? []).map(x => (typeof x === 'string' ? c.items[x] : x)).filter(Boolean);
    const dealt = collect ? Object.fromEntries(collect.map(uid => { const acc = {}; dealtByType(res.result, uid, acc); return [uid, Object.fromEntries(Object.entries(acc).map(([k, x]) => [k, Math.round(x)]))]; })) : undefined;
    return {
        ...(dealt ? { dealt } : {}),
        won: rp.won ? 1 : 0, sec: r2(rp.durationSec), downed: rp.downed.length, rc: rp.roundsCleared,
        gold: c.resources.gold - gold0, rgold: rp.gold ?? 0, xp: sum(Object.values(rp.xp ?? {})), xpT: v?.uid ? (rp.xp?.[v.uid] ?? 0) : 0,
        nd: drops.length, rare: drops.filter(it => (RAR[it.rarity] ?? 0) >= 2).length,
    };
}
async function modeProbe() {
    const seed = Number(q.get('seed')), tier = q.get('tier') ?? 'normal', K = Number(q.get('K') ?? 6);
    const only = q.get('only') ? new RegExp(q.get('only')) : null;
    const stages = [...REP].sort((a, b) => a - b);
    const out = [];
    const t0 = performance.now();
    for (const [si, stageId] of stages.entries()) {
        const G = await loadState(`st_${seed}_${tier}_${stageId}`);
        if (!G) { out.push({ stageId, missing: true }); continue; }
        const T = targets(G);
        const vars = [{ id: 'base', kind: 'base', lines: [], meta: {} }];
        for (const who of ['phys', 'mag']) {
            const h = T[who];
            if (!h) continue;
            for (const v of variantsFor(G, who, h, ['main'])) if (v.kind !== 'missing' && !v.meta.noProbe) vars.push({ ...v, uid: h.uid });
        }
        const use = vars.filter(v => !only || v.kind === 'base' || only.test(v.id));
        // 검증 ③ (원정 길 — `game.heroCombat`)
        for (const v of use) {
            if (v.kind === 'base') continue;
            const h0 = SYS.game.heroById(G, v.uid);
            const c1 = clone(G); applyLines(c1.items, SYS.game.heroById(c1, v.uid), v.lines);
            const h1 = SYS.game.heroById(c1, v.uid);
            const chk = checkVariant(SYS.game.heroCombat(G, h0), SYS.game.heroCombat(c1, h1), v, h1, Object.values(h1.equipped).filter(Boolean).map(u => c1.items[u]));
            if (!chk.ok) throw new Error(`검증 ③(원정) 실패 ${stageId} ${v.id}: ${chk.why.join(',')}`);
        }
        const rows = {};
        for (const v of use) {
            rows[v.id] = [];
            const col = v.kind === 'base' ? [T.phys?.uid, T.mag?.uid].filter(Boolean) : null;
            for (let k = 0; k < K; k++) rows[v.id].push(probeOne(G, stageId, tier, k, v, col));
        }
        out.push({ stageId, arrive: gearOf(G), targets: { phys: T.phys ? `${T.phys.cls}:Lv${T.phys.level}` : null, mag: T.mag ? `${T.mag.cls}:Lv${T.mag.level}` : null },
            uids: { phys: T.phys?.uid ?? null, mag: T.mag?.uid ?? null },
            vmeta: Object.fromEntries(use.map(v => [v.id, { kind: v.kind, who: v.who, meta: v.meta, lines: v.lines.map(l => ({ stat: l.stat, v: r4(l.v), skill: l.skill })) }])), rows });
        say(`OBT … probe ${seed} ${tier} ${si + 1}/${stages.length}`);
        await new Promise(r => setTimeout(r, 0));
    }
    return { meta: { seed, tier, K, ms: Math.round(performance.now() - t0) }, out };
}

/* ═════════════ 캠페인 ═════════════ */
async function modeCamp() {
    const seed = Number(q.get('seed'));
    const opt = { stall: Number(q.get('stall') ?? 300), cap: Number(q.get('cap') ?? 40000), patience: Number(q.get('patience') ?? 10), farm: Number(q.get('farm') ?? 10),
        nm: q.get('nm') !== '0', hell: q.get('hell') !== '0' };
    for (const k of Object.keys(CNT)) CNT[k] = 0;
    const t0 = performance.now();
    const G = SYS.game.newGame(seed, SYS.hero.rollStartParty(makeRng(1000 + seed), B.party_size_max), NOW);
    for (const b of SYS.construction.list) G.buildings[b.id] = b.maxRank;
    const rec = { seed, classes: partyHeroes(G).map(h => h.cls), tiers: {}, saved: [] };
    const arrive = diff => (stageId, g) => { saveState(`st_${seed}_${diff}_${stageId}`, g); rec.saved.push(`${diff}_${stageId}`); };
    const tierRec = (t, g) => ({ runs: t.runs, sec: t.sec, wins: t.wins, stuck: t.stuck, skips: t.skips, end: gearOf(g), ms: Math.round(performance.now() - t0) });
    const nt = runTier(G, 'normal', opt, arrive('normal'));
    rec.tiers.normal = tierRec(nt, G);
    if (!nt.stuck) { saveState(`st_${seed}_normal_end`, G); rec.saved.push('normal_end'); }
    rec.bytes = await flush();
    say(`OBT … camp ${seed} normal`);
    if (!nt.stuck && opt.nm) {
        const nm = runTier(G, 'nightmare', opt, arrive('nightmare'), 'normal');
        rec.tiers.nightmare = tierRec(nm, G);
        if (!nm.stuck) { saveState(`st_${seed}_nightmare_end`, G); rec.saved.push('nightmare_end'); }
        rec.bytes += await flush();
        say(`OBT … camp ${seed} nightmare`);
        if (!nm.stuck && opt.hell) {
            const hl = runTier(G, 'hell', opt, arrive('hell'), 'nightmare');
            rec.tiers.hell = tierRec(hl, G);
            if (!hl.stuck) { saveState(`st_${seed}_hell_end`, G); rec.saved.push('hell_end'); }
            rec.bytes += await flush();
        }
    }
    rec.cnt = { ...CNT };
    rec.ms = Math.round(performance.now() - t0);
    return rec;
}

/* ═════════════ 도구 검증 셋 (PLAN 절차 3) ═════════════ */
async function modeCheck() {
    const seed = Number(q.get('seed')), tier = q.get('tier') ?? 'normal', N = Number(q.get('n') ?? 150);
    const out = { seed, tier };
    const G = await loadState(`st_${seed}_${tier}_end`);
    if (!G) return { ...out, missing: 'state' };
    const T = targets(G);
    const lo = SYS.game.arenaLoadout(G);
    // ① 결정론 — 옵션 없는 판 둘(따로 세운 팀 · 같은 씨앗)이 같은 결과 · 원정도 같다
    const base1 = arenaTeam(G), base2 = arenaTeam(G);
    const sig = r => JSON.stringify({ won: r.won, reason: r.reason, d: r.durationSec, n: r.timeline.length, tl: r.timeline.slice(-30) });
    const det = [];
    for (let k = 0; k < 5; k++) {
        const s = fightSeed(seed, 0, 9000 + k);
        const a = SYS.arena.fight(base1, mirrorOf(base1), makeRng(s), lo, lo), b = SYS.arena.fight(base2, mirrorOf(base2), makeRng(s), lo, lo);
        det.push(sig(a) === sig(b));
    }
    const G2 = await loadState(`st_${seed}_${tier}_end`);   // 읽기도 두 번 — 저장 · 불러오기가 판을 안 바꾸나
    const base3 = arenaTeam(G2);
    det.push(sig(SYS.arena.fight(base1, mirrorOf(base1), makeRng(77), lo, lo)) === sig(SYS.arena.fight(base3, mirrorOf(base3), makeRng(77), lo, lo)));
    const rep = [...REP].sort((a, b) => a - b);
    let pg = null, pst = null;
    for (const st of rep) { pg = await loadState(`st_${seed}_${tier}_${st}`); if (pg) { pst = st; break; } }
    const pdet = [];
    if (pg) for (let k = 0; k < 3; k++) { const a = probeOne(pg, pst, tier, k, null), b = probeOne(pg, pst, tier, k, null); pdet.push(JSON.stringify(a) === JSON.stringify(b)); }
    out.c1 = { arena: det, probe: pdet, probeStage: pst, ok: det.every(Boolean) && pdet.every(Boolean) && pdet.length > 0 };
    // ② 데미지 +20% 가 +0% 보다 확실히 낫다 — 결투장(물리 · 마법 대상 각각) · 원정(그 탐침 칸 · 처치 시간 · 승률)
    out.c2 = {};
    for (const who of ['phys', 'mag']) {
        const h = T[who];
        if (!h) continue;
        const v = variantsFor(G, who, h).find(x => x.id === `${who}:dmg0.2`);
        const A = arenaTeam(G, { h, v }), mir = mirrorOf(base1);
        const d = [], dw = [];
        let bad = 0;
        for (let k = 0; k < N; k++) for (const flip of [0, 1]) {
            const s = fightSeed(seed, 0, 5000 + k);
            const x = duel(A, mir, s, flip, lo), y = duel(base1, mir, s, flip, lo);
            d.push(x.m - y.m); dw.push(x.w - y.w); bad += x.bad + y.bad;
        }
        const mean = avg(d), se = Math.sqrt(avg(d, x => (x - mean) ** 2) / d.length);
        const mw = avg(dw), sew = Math.sqrt(avg(dw, x => (x - mw) ** 2) / dw.length);
        // 통과 = 남은 HP 차이가 확실히(z > 3) 늘고 승률이 줄지 않았다 — 미러가 전부 시간 초과인 파티(승률이 못 움직인다)는 남은 HP 로만 갈린다
        out.c2[who] = { cls: h.cls, dMargin: r4(mean), z: r2(mean / se), dWin: r4(mw), zWin: sew ? r2(mw / sew) : null, n: d.length, hpBad: bad, ok: mean / se > 3 && mw >= 0 };
    }
    if (pg) {
        const T2 = targets(pg);
        out.c2.probe = {};
        for (const who of ['phys', 'mag']) {
            const h = T2[who];
            if (!h) continue;
            const v = { ...variantsFor(pg, who, h, ['main']).find(x => x.id === `${who}:dmg0.2`), uid: h.uid };
            const a = [], b = [];
            for (let k = 0; k < 12; k++) { a.push(probeOne(pg, pst, tier, k, null)); b.push(probeOne(pg, pst, tier, k, v)); }
            const win0 = avg(a, x => x.won), win1 = avg(b, x => x.won);
            const t0 = avg(a.filter(x => x.won), x => x.sec), t1 = avg(b.filter(x => x.won), x => x.sec);
            const rc0 = avg(a, x => x.rc), rc1 = avg(b, x => x.rc);
            out.c2.probe[who] = { cls: h.cls, win0: r2(win0), win1: r2(win1), sec0: r2(t0), sec1: r2(t1), rc0: r2(rc0), rc1: r2(rc1), ok: win1 > win0 || (win1 === win0 && (t1 < t0 || rc1 > rc0)) };
        }
    }
    // ③ 모든 변형이 전투 능력치에 넣은 값 그대로 들어갔나 — 결투장 길(snapshotTeam) · 원정 길(game.heroCombat)
    out.c3 = { arena: { n: 0, fail: [] }, probe: { n: 0, fail: [] }, values: {} };
    for (const who of ['phys', 'mag']) {
        const h = T[who];
        if (!h) continue;
        const idx = base1.findIndex(u => u.uid === h.uid);
        for (const v of variantsFor(G, who, h)) {
            if (v.kind === 'missing') { out.c3.arena.fail.push(`${v.id}:missing`); continue; }
            const A = arenaTeam(G, { h, v });
            const c = checkVariant(base1[idx].combat, A[idx].combat, v, h, A[idx].gear);
            out.c3.arena.n++;
            if (!c.ok) out.c3.arena.fail.push(`${v.id}:${c.why.join('+')}`);
            const c1 = clone(G); applyLines(c1.items, SYS.game.heroById(c1, h.uid), v.lines);
            const h1 = SYS.game.heroById(c1, h.uid);
            const cp = checkVariant(SYS.game.heroCombat(G, h), SYS.game.heroCombat(c1, h1), v, h1, Object.values(h1.equipped).filter(Boolean).map(u => c1.items[u]));
            out.c3.probe.n++;
            if (!cp.ok) out.c3.probe.fail.push(`${v.id}:${cp.why.join('+')}`);
            if (v.kind === 'opt' || v.kind === 'prideB' || v.kind === 'pen') out.c3.values[v.id] = { lines: v.lines.map(l => `${l.at}:${l.stat}=${r4(l.v)}${l.skill ? '@' + l.skill : ''}`), band: v.meta.band ? { min: v.meta.band.min, max: v.meta.band.max, rank: v.meta.band.rank, ilvl: v.meta.band.ilvl } : null };
        }
    }
    out.c3.ok = out.c3.arena.fail.length === 0 && out.c3.probe.fail.length === 0;
    out.targets = { phys: T.phys ? `${T.phys.cls}:Lv${T.phys.level}` : null, mag: T.mag ? `${T.mag.cls}:Lv${T.mag.level}` : null };
    out.ok = out.c1.ok && Object.values(out.c2).filter(x => 'ok' in x).every(x => x.ok) && Object.values(out.c2.probe ?? {}).every(x => x.ok) && out.c3.ok;
    return out;
}

/* ═════════════ 개발용 — 판 한두 개 들여다보기 ═════════════ */
async function modeDbg() {
    const seed = Number(q.get('seed')), tier = q.get('tier') ?? 'normal';
    const G = await loadState(`st_${seed}_${tier}_end`);
    const T = targets(G);
    const lo = SYS.game.arenaLoadout(G);
    const base = arenaTeam(G), mir = mirrorOf(base);
    const v = variantsFor(G, 'phys', T.phys).find(x => x.id === 'phys:dmg0.2');
    const A = arenaTeam(G, { h: T.phys, v });
    const out = { lo: { slotMax: lo.slotMax, potions: lo.potions, potionHp: lo.potionHp, tactic: lo.tactic }, units: base.map(u => ({ uid: u.uid, rank: u.rank, cls: u.hero.cls, startOrder: u.startOrder, actives: u.actives, atk: atkOf(u.combat), hp: u.combat.hp_max, period: u.combat.action_period, basic: u.combat.basic_attack })), modAtk: A.map(u => atkOf(u.combat)), fights: [] };
    for (const [nm, X] of [['base', base], ['mod', A]]) for (const flip of [0, 1]) {
        const [P, E] = flip ? [mir, X] : [X, mir];
        const res = SYS.arena.fight(P, E, makeRng(fightSeed(seed, 0, 0)), lo, lo);
        const cnt = {};
        for (const ev of res.timeline) cnt[ev.e] = (cnt[ev.e] ?? 0) + 1;
        out.fights.push({ nm, flip, reason: res.reason, won: res.won, sec: res.durationSec, hl: hpLeft(res), contrib: res.contrib, cnt, party: res.party.map(p => ({ key: p.key, uid: p.uid, hpMax: p.hpMax })), r1: res.timeline.find(e => e.e === 'round')?.enemies?.map(e => ({ key: e.key, hpMax: e.hpMax })), head: res.timeline.slice(0, 25), tail: res.timeline.slice(-12) });
    }
    return out;
}

/* ═════════════ 개발용 — 미러 판의 모습 (단 끝 상태마다) ═════════════ */
async function modeSurvey() {
    const tiers = (q.get('tiers') ?? 'normal,nightmare,hell').split(','), seeds = (q.get('seeds') ?? '1-8').split('-').map(Number);
    const N = Number(q.get('n') ?? 60), N2 = Number(q.get('n2') ?? 200);
    const out = [];
    for (let seed = seeds[0]; seed <= (seeds[1] ?? seeds[0]); seed++) for (const tier of tiers) {
        const G = await loadState(`st_${seed}_${tier}_end`);
        if (!G) { out.push({ seed, tier, missing: true }); continue; }
        const T = targets(G), lo = SYS.game.arenaLoadout(G);
        const base = arenaTeam(G), mir = mirrorOf(base);
        const heroes = base.map(u => ({ uid: u.uid, cls: u.hero.cls, lv: u.hero.level, rank: u.rank, hp: u.combat.hp_max, atk: atkOf(u.combat), dealt: 0, acted: 0, downT: [] }));
        let sec = 0, to = 0;
        const t0 = performance.now();
        for (let k = 0; k < N; k++) {
            const res = SYS.arena.fight(base, mir, makeRng(fightSeed(seed, 0, k)), lo, lo);
            sec += res.durationSec; to += res.reason === 'timeout' ? 1 : 0;
            const keyOf = Object.fromEntries(res.party.map(p => [p.key, p.uid]));
            const tot = sum(res.contrib, c => c.dealt) || 1;
            for (const c of res.contrib) { const hh = heroes.find(x => x.uid === c.uid); if (hh) { hh.dealt += c.dealt / tot; hh.acted += c.dealt > 0 ? 1 : 0; } }
            for (const ev of res.timeline) if (ev.e === 'down' && keyOf[ev.u]) heroes.find(x => x.uid === keyOf[ev.u]).downT.push(ev.t);
        }
        const msPer = (performance.now() - t0) / N;
        const eff = {};
        for (const who of ['phys', 'mag']) {
            const h = T[who];
            if (!h) continue;
            const v = variantsFor(G, who, h, []).find(x => x.id === `${who}:dmg0.2`);
            const A = arenaTeam(G, { h, v });
            const d = [], dw = [];
            for (let k = 0; k < N2; k++) for (const flip of [0, 1]) { const s = fightSeed(seed, 0, 5000 + k); const x = duel(A, mir, s, flip, lo), y = duel(base, mir, s, flip, lo); d.push(x.m - y.m); dw.push(x.w - y.w); }
            const m = avg(d), se = Math.sqrt(avg(d, x => (x - m) ** 2) / d.length);
            eff[who] = { cls: h.cls, dM: r4(m), seM: r4(se), z: r2(m / se), dW: r4(avg(dw)) };
        }
        out.push({ seed, tier, sec: r2(sec / N), to, msPer: r2(msPer), heroes: heroes.map(x => ({ ...x, dealt: r2(x.dealt / N), acted: r2(x.acted / N), downT: x.downT.length ? r2(avg(x.downT)) : null, downN: x.downT.length })), eff });
        say(`OBT … survey ${seed} ${tier}`);
        await new Promise(r => setTimeout(r, 0));
    }
    return out;
}

/* ═════════════ 시작 ═════════════ */
try {
    await loadData('../data/');
    B = D.balance;
    SYS = buildSystems(D);
    REP = new Set([1, 2, 3, 4, 5].flatMap(c => [(c * 100 + 4) * 10 + 3, (c * 100 + 5) * 10 + 1]).filter(id => D.stages?.[id]));
    const fn = { camp: modeCamp, arena: modeArena, probe: modeProbe, check: modeCheck, dbg: modeDbg, survey: modeSurvey }[MODE];
    if (!fn) throw new Error('mode? ' + MODE);
    const out = await fn();
    document.getElementById('sim').textContent = JSON.stringify(out);
    say(`OBT ok ${MODE}`);
} catch (e) {
    say('OBT FAIL');
    const pre = document.createElement('pre');
    pre.id = 'err';
    pre.textContent = String(e && e.stack ? e.stack : e);
    document.body.appendChild(pre);
}
