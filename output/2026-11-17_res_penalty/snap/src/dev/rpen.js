/**
 * 스크래치 하네스 — 영웅 원소 저항 페널티 크기 (2026-11-17 · 사용자 「영웅 저항 패널이 어느수준이 적당할지 시뮬레이션」). **저장소에 없다.**
 *   페널티 P = 영웅의 원소 저항 넷에서 **상한 적용 전에** 뺀다(디아블로 2 식 · battle_design §9-5 「저항 합의 음수 항」) —
 *   게임에는 아직 없다 · 탐침 판에서만 `battle.createRun` 을 감싸 파티 유닛의 `combat.res_*` 를 깎는다.
 *
 * 시드마다:
 *   ① 노말 1~5장 캠페인(페널티 0) → ② 나이트메어 캠페인(페널티 0) → ③ 헬 캠페인(페널티 0)
 *   ④ 탐침 — 캠페인이 대표 칸(장마다 c-4 III · c-5 장 보스)을 **처음 깬 직후**의 상태를 복사해 그 칸을 P 마다 K 판 —
 *      판마다 복사본 · 전투 씨앗만 바꾼다(P 사이에는 같은 씨앗). 승률 · 전투불능 · 받은 피해의 종류별 몫 · 도착 때 파티 저항
 *
 * 봇 = 10-28 wheel.js F 갈래(자동 장착 · 반지 · 목걸이 교체 · 분해 · 마스터리 · 물약 · 건물 전부) + sim.js 의 메인미션 상자 + **책**(가진 스킬의 같은 책으로 올리고 빈 배운 칸은 그 직업 책으로)
 *   막힘(`stall` 판) — `skip=1`(기본)이면 기록하고 그 칸을 깬 것으로 치고 넘어간다 · 파밍 칸이 같은 단에 없으면 앞 단의 마지막 일반 칸
 *   ?seeds=1-4&stall=300&cap=40000&K=5&patience=10&farm=10&skip=1
 */
import { loadData, buildSystems, D } from '../ui/data.js';
import { makeRng } from '../game_logic/rng.js';
import { stageDeckKey } from '../game_logic/stage_seed.js';

const NOW = 1_700_000_000_000;
const q = new URLSearchParams(location.search);
const parseList = (spec, fallback) => String(spec ?? fallback).split(',').flatMap(part => {
    const m = part.trim().match(/^(\d+)-(\d+)$/);
    if (m) return Array.from({ length: Math.max(0, Number(m[2]) - Number(m[1]) + 1) }, (_, i) => Number(m[1]) + i);
    return [Number(part)];
}).filter(Number.isFinite);
const sum = (xs, f) => xs.reduce((a, x) => a + f(x), 0);
const avg = (xs, f) => xs.length ? sum(xs, f) / xs.length : 0;
const r2 = v => Math.round(v * 100) / 100;
const clone = o => structuredClone(o);

const partyHeroes = (SYS, G) => SYS.game.partyOf(G).map(uid => SYS.game.heroById(G, uid)).filter(Boolean);
const CNT = { box: 0, autoMoves: 0, accSwap: 0, salvage: 0, mastery: 0, potion: 0, bookUp: 0, bookLearn: 0, mission: 0 };
const RAR = { normal: 0, magic: 1, rare: 2, craft: 2, epic: 3, legendary: 4, unique: 5, set: 5 };
const accKey = it => (it.ilvl ?? 0) * 10 + (RAR[it.rarity] ?? 0);

function botBoxes(SYS, G) {
    SYS.game.mainMissionSync(G);
    for (const m of SYS.game.mainMissionState(G).claimable) if (SYS.game.mainMissionClaim(G, m.id).ok) CNT.mission++;
    for (const uid of G.stash.slice()) if (G.items[uid]?.box) SYS.game.moveToBag(G, uid, 1);
    const party = partyHeroes(SYS, G);
    for (let k = 0; party.length && k < 200; k++) {
        const uid = G.bags.flat().find(u => G.items[u]?.box);
        if (!uid || !SYS.game.openBox(G, uid, party[k % party.length].uid).ok) break;
        CNT.box++;
    }
}
function botAuto(SYS, G) {
    botBoxes(SYS, G);
    for (const h of partyHeroes(SYS, G)) CNT.autoMoves += SYS.game.autoEquip(G, h.uid, 1).changes?.length ?? 0;
    for (const h of partyHeroes(SYS, G)) for (const pos of ['amulet', 'ring1', 'ring2']) {
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
const salvageBag = (SYS, G) => { for (const uid of G.bags.flat()) if (SYS.game.salvage(G, uid).ok) CNT.salvage++; };
function botMastery(SYS, G) {
    for (const h of partyHeroes(SYS, G)) for (;;) {
        const node = SYS.game.masteryState(G, h.uid)?.nodes.find(x => x.canLearn);
        if (!node || !SYS.game.learnMastery(G, h.uid, node.id).ok) break;
        CNT.mastery++;
    }
}
function botPotion(SYS, G) {
    const list = (SYS.game.shopState(G, NOW)?.potions ?? []).slice().sort((a, b) => b.tier - a.tier);
    for (const p of list) while (SYS.game.shopPotionBuy(G, p.id).ok) CNT.potion++;
}
/** 책 — 가진 스킬(고유 · 배운 칸)의 같은 책이면 올린다 · 배운 칸이 비면 그 직업 책 중 타격 스킬 먼저 하나를 배운다 */
function botBooks(SYS, G) {
    for (const h of partyHeroes(SYS, G)) {
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
function afterRun(SYS, G) { botAuto(SYS, G); salvageBag(SYS, G); botMastery(SYS, G); botPotion(SYS, G); botBooks(SYS, G); }

function gearOf(SYS, G) {
    const hs = partyHeroes(SYS, G);
    const items = hs.flatMap(h => Object.values(h.equipped).filter(Boolean).map(uid => G.items[uid]).filter(Boolean));
    return { lv: r2(avg(hs, h => h.level)), worn: items.length, ilvl: r2(avg(items, it => it.ilvl ?? 0)),
        skLv: hs.map(h => [h.innate, h.bookSkill].filter(Boolean).map(id => 1 + (h.skillLv?.[id] ?? 0)).join('/')).join(' ') };
}

/* 대표 칸 — 장마다 장의 마지막 일반 칸(c-4 III)과 장 보스 칸(c-5) */
const REP = new Set([1, 2, 3, 4, 5].flatMap(c => [(c * 100 + 4) * 10 + 3, (c * 100 + 5) * 10 + 1]).filter(id => D.stages?.[id] ?? true));

/* 페널티 — 탐침 판에서만 켠다(`PEN.v`). `battle.createRun` 을 감싸 파티 유닛(소환 제외 — 소환은 전투 안에서 선다)의 원소 저항 넷에서 뺀다 */
const PEN = { v: 0 };
const ELS = ['fire', 'cold', 'lightning', 'poison'];
function patchPenalty(SYS) {
    const orig = SYS.battle.createRun;
    const cut = (units, v) => units.map(p => p?.combat
        ? { ...p, combat: { ...p.combat, ...Object.fromEntries(ELS.map(el => [`res_${el}`, (p.combat[`res_${el}`] ?? 0) - v])) } } : p);
    // 라운드 경계 · 걸음마다 상태에서 새로 입히는 `refit` 도 같은 값으로 깎는다(안 감싸면 첫 걸음 뒤 페널티가 사라진다)
    SYS.battle.createRun = (units, ...rest) => {
        const v = PEN.v;
        const run = orig(v ? cut(units, v) : units, ...rest);
        if (v && typeof run?.refit === 'function') { const rf = run.refit.bind(run); run.refit = (u, ...r) => rf(cut(u, v), ...r); }
        return run;
    };
}
/** 파티 영웅의 원소 저항(그 원소 · 상한 전) 평균 · 최소 — 도착 상태 */
function resOf(SYS, G) {
    const cs = partyHeroes(SYS, G).map(h => SYS.game.heroCombat(G, h));
    return Object.fromEntries(ELS.map(el => [el, { avg: r2(avg(cs, c => c[`res_${el}`] ?? 0)), min: r2(Math.min(...cs.map(c => c[`res_${el}`] ?? 0))) }]));
}
/** 받은 피해(파티 쪽 · 실제로 깎은 값) 종류별 합 — 직격 `hit` · 지속 `dot` · 고정 `blast` · 반사류 `reflect` */
function takenOf(tl, partyKeys) {
    const out = { physical: 0, fire: 0, cold: 0, lightning: 0, poison: 0, fixed: 0, other: 0 };
    for (const ev of tl ?? []) {
        if (!partyKeys.has(ev.d)) continue;
        if (ev.e !== 'hit' && ev.e !== 'dot' && ev.e !== 'blast' && ev.e !== 'reflect') continue;
        const v = (ev.dmg ?? 0) - (ev.ov ?? 0);
        const ty = ev.e === 'blast' ? 'fixed' : ev.ty ?? (ev.k === 'poison' ? 'poison' : 'other');
        out[ty in out ? ty : 'other'] += v;
    }
    return out;
}

/** 탐침 — 상태 G 에서 그 칸을 페널티마다 K 판 · 판마다 복사본 · 씨앗만 바꾼다(페널티 사이에는 같은 씨앗) */
function probe(SYS, G, stageId, diff, K, pens) {
    const out = {};
    const rounds = SYS.battle.stageRounds(D.stages[stageId]).length;
    for (const pv of pens) {
        const rows = [];
        for (let k = 0; k < K; k++) {
            const c = clone(G);
            c.counters.battle += 1 + 7919 * (k + 1);
            c.stageDecks ??= {};
            for (let r = 1; r <= rounds; r++) {
                const key = stageDeckKey(diff, stageId, r);
                const d = c.stageDecks[key] ?? { next: 0, free: [] };
                c.stageDecks[key] = { next: (d.next ?? 0) + 101 * (k + 1), free: [] };
            }
            let res;
            PEN.v = pv;
            try { res = SYS.game.resolveBattle(c, stageId, NOW, c.preset, diff); } catch (e) { PEN.v = 0; rows.push({ err: 'throw ' + String(e?.message ?? e).slice(0, 120) }); continue; }
            PEN.v = 0;
            if (!res.ok) { rows.push({ err: res.err }); continue; }
            const rp = res.report;
            const tl = res.result?.timeline ?? [];
            const keys = new Set(tl.filter(ev => ev.e === 'round').flatMap(ev => (ev.party ?? []).map(p => p.key)));
            if (!keys.size) for (let i = 0; i < 8; i++) keys.add(`p${i}`);
            rows.push({ won: rp.won ? 1 : 0, sec: r2(rp.durationSec), downed: rp.downed.length, rc: rp.roundsCleared, taken: takenOf(tl, keys) });
        }
        out[pv] = rows;
    }
    return out;
}

/** 한 단의 캠페인 — 칸을 차례로 · `patience` 판 연속 지면 앞 칸 `farm` 판 · 그 칸 도전 `stall` 판에 못 깨면 막힘. `onArrive(stageId)` = 그 칸에 처음 도착 */
function runTier(SYS, B, G, diff, opt, onArrive, prevDiff = null) {
    const order = D.stageOrder.filter(id => D.stages[id].chapter <= 5);
    const tier = { diff, runs: 0, sec: 0, exp: 0, wins: 0, stuck: null, skips: [], stages: [] };
    const play = (stageId, d = diff) => {
        let r;
        try { r = SYS.game.resolveBattle(G, stageId, NOW, G.preset, d); } catch (e) { return { err: 'throw ' + String(e?.message ?? e).slice(0, 160) }; }
        if (!r.ok) return { err: r.err };
        tier.runs++; tier.sec += r.report.durationSec + B.repeat_restart_sec; tier.exp += r.report.durationSec;
        if (r.report.won) tier.wins++;
        afterRun(SYS, G);
        return r.report;
    };
    for (const [idx, stageId] of order.entries()) {
        if (SYS.game.stageCleared(G, stageId, diff)) continue;
        const row = { stageId, tries: 0, wins: 0, farm: 0, arrive: gearOf(SYS, G), firstWin: null };
        tier.stages.push(row);
        // 파밍 칸 — 같은 단의 앞 칸(챕터보스 칸 제외) · 없으면(그 단 첫 칸) 앞 단의 마지막 일반 칸 (2026-11-17 — 옛 하네스는 단 첫 칸에서 파밍을 못 해 막혔다)
        let farmAt = order.slice(0, idx).reverse().find(id => D.stages[id].boss_grade !== 'chapter_boss' && SYS.game.stageCleared(G, id, diff)) ?? null, farmDiff = diff;
        if (farmAt == null && prevDiff) { farmAt = order.slice().reverse().find(id => D.stages[id].boss_grade !== 'chapter_boss' && SYS.game.stageCleared(G, id, prevDiff)) ?? null; farmDiff = prevDiff; }
        let streak = 0;
        while (!SYS.game.stageCleared(G, stageId, diff)) {
            if (tier.runs >= opt.cap) { tier.stuck = { why: 'cap', stageId, tries: row.tries }; return tier; }
            if (row.tries >= opt.stall) {
                if (!opt.skip) { tier.stuck = { why: 'stall', stageId, tries: row.tries, gear: gearOf(SYS, G) }; return tier; }
                // 막힘 — 기록하고 그 칸을 깬 것으로 치고 넘어간다(뒤 칸 탐침을 얻으려고 · 그 칸의 보상은 못 받은 계정이다)
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
        // 탐침 — 그 칸을 **처음 깬 직후**(겨우 이길 만한 상태 · 막혀서 건너뛴 칸은 안 잰다)
        if (onArrive && REP.has(stageId) && !row.skipped) onArrive(stageId, G);
    }
    tier.sec = r2(tier.sec); tier.exp = r2(tier.exp);
    return tier;
}

const head = document.getElementById('head');
try {
    await loadData('../data/');
    const B = D.balance;
    const SYS = buildSystems(D);
    patchPenalty(SYS);
    const seeds = parseList(q.get('seeds'), '1-2');
    const opt = { stall: Number(q.get('stall') ?? 300), cap: Number(q.get('cap') ?? 40000), K: Number(q.get('K') ?? 5),
        patience: Number(q.get('patience') ?? 10), farm: Number(q.get('farm') ?? 10), hell: q.get('hell') !== '0', skip: q.get('skip') !== '0' };
    const pens = String(q.get('pens') ?? '0,0.1,0.2,0.3,0.5,0.75,1').split(',').map(Number);
    const t0 = performance.now();
    const out = [];
    for (const seed of seeds) {
        for (const k of Object.keys(CNT)) CNT[k] = 0;
        const G = SYS.game.newGame(seed, SYS.hero.rollStartParty(makeRng(1000 + seed), B.party_size_max), NOW);
        for (const b of SYS.construction.list) G.buildings[b.id] = b.maxRank;
        const classes = partyHeroes(SYS, G).map(h => h.cls);
        const normal = runTier(SYS, B, G, 'normal', opt, null);
        const rec = { seed, classes, normal: { runs: normal.runs, sec: normal.sec, stuck: normal.stuck, skips: normal.skips, end: gearOf(SYS, G) }, probes: [], tiers: {} };
        if (!normal.stuck) {
            const onArrive = diff => (stageId, g) => rec.probes.push({ diff, stageId, arrive: gearOf(SYS, g), res: resOf(SYS, g), P: probe(SYS, g, stageId, diff, opt.K, pens) });
            const nm = runTier(SYS, B, G, 'nightmare', opt, onArrive('nightmare'), 'normal');
            rec.tiers.nightmare = { runs: nm.runs, sec: nm.sec, wins: nm.wins, stuck: nm.stuck, skips: nm.skips, end: gearOf(SYS, G), res: resOf(SYS, G) };
            if (!nm.stuck && opt.hell) {
                const hl = runTier(SYS, B, G, 'hell', opt, onArrive('hell'), 'nightmare');
                rec.tiers.hell = { runs: hl.runs, sec: hl.sec, wins: hl.wins, stuck: hl.stuck, skips: hl.skips, end: gearOf(SYS, G), res: resOf(SYS, G) };
            }
        }
        rec.cnt = { ...CNT };
        out.push(rec);
        head.textContent = `RPEN … ${out.length}/${seeds.length}`;
        await new Promise(r => setTimeout(r, 0));
    }
    const meta = { seeds, opt, pens, ms: Math.round(performance.now() - t0), mult: D.difficultyList.map(d => `${d.id}:${d.monsterDmgMult}/${d.monsterHpMult}`) };
    document.getElementById('sim').textContent = JSON.stringify({ meta, out });
    head.textContent = `RPEN ok ${out.length}`;
    document.title = `RPEN ok ${out.length}`;
} catch (e) {
    head.textContent = 'RPEN FAIL';
    document.title = 'RPEN FAIL';
    const pre = document.createElement('pre');
    pre.id = 'err';
    pre.textContent = String(e && e.stack ? e.stack : e);
    document.body.appendChild(pre);
}
