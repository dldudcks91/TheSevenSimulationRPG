/**
 * 스크래치 하네스 — 몬스터 스킬 레벨 A/B (2026-11-17 · R527). **저장소에 없다.**
 *   A = 모든 단 monster_skill_level 1(옛 동작) · B = CSV 그대로(노말 1 · 나이트메어 4 · 헬 7). 한 페이지에서 두 벌을 조립한다(같은 상태 객체를 두 규칙에 넘긴다).
 *
 * 시드마다:
 *   ① 노말 1~5장 캠페인(A — 노말은 A · B 가 같다) → 나이트메어 입구 상태 S_N
 *   ② S_N 에서 나이트메어 → 헬 캠페인을 A 로 한 번 · B 로 한 번(따로) — 단마다 걸린 시간 · 판 수 · 막힘
 *   ③ 탐침 — A 캠페인이 대표 칸(장마다 c-4 III · c-5 장 보스)에 **처음 도착한 순간**의 상태를 복사해 그 칸을 K 판씩 A · B 로 —
 *      판마다 복사본 · 전투 씨앗만 바꾼다(counters.battle · 덱 번호). 승률 · 판 시간 · 전투불능 수
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

/** 탐침 — 상태 G 에서 그 칸을 K 판 · 판마다 복사본 · 씨앗만 바꾼다 */
function probe(SYS, G, stageId, diff, K) {
    const out = [];
    const rounds = SYS.battle.stageRounds(D.stages[stageId]).length;
    for (let k = 0; k < K; k++) {
        const c = clone(G);
        c.counters.battle += 1 + 7919 * (k + 1);
        c.stageDecks ??= {};
        for (let r = 1; r <= rounds; r++) {
            const key = stageDeckKey(diff, stageId, r);
            const d = c.stageDecks[key] ?? { next: 0, free: [] };
            c.stageDecks[key] = { next: (d.next ?? 0) + 101 * (k + 1), free: [] };
        }
        // 그 단에서 그 칸까지 열어 둔다(앞 칸 깬 기록) — 도착 순간이라 이미 열려 있다
        let res;
        try { res = SYS.game.resolveBattle(c, stageId, NOW, c.preset, diff); } catch (e) { out.push({ err: 'throw ' + String(e?.message ?? e).slice(0, 120) }); continue; }
        if (!res.ok) { out.push({ err: res.err }); continue; }
        const rp = res.report;
        out.push({ won: rp.won ? 1 : 0, sec: r2(rp.durationSec), downed: rp.downed.length, rc: rp.roundsCleared });
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
        if (onArrive && REP.has(stageId)) onArrive(stageId, G);
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
    }
    tier.sec = r2(tier.sec); tier.exp = r2(tier.exp);
    return tier;
}

const head = document.getElementById('head');
try {
    await loadData('../data/');
    const B = D.balance;
    const SYS_B = buildSystems(D);
    const SYS_A = buildSystems({ ...D, difficultyList: D.difficultyList.map(x => ({ ...x, monsterSkillLevel: 1 })) });
    const seeds = parseList(q.get('seeds'), '1-2');
    const opt = { stall: Number(q.get('stall') ?? 400), cap: Number(q.get('cap') ?? 40000), K: Number(q.get('K') ?? 5),
        patience: Number(q.get('patience') ?? 10), farm: Number(q.get('farm') ?? 10), hell: q.get('hell') !== '0', skip: q.get('skip') !== '0' };
    const t0 = performance.now();
    const out = [];
    for (const seed of seeds) {
        for (const k of Object.keys(CNT)) CNT[k] = 0;
        const G = SYS_A.game.newGame(seed, SYS_A.hero.rollStartParty(makeRng(1000 + seed), B.party_size_max), NOW);
        for (const b of SYS_A.construction.list) G.buildings[b.id] = b.maxRank;
        const classes = partyHeroes(SYS_A, G).map(h => h.cls);
        const normal = runTier(SYS_A, B, G, 'normal', opt, null);   // 노말은 A · B 가 같다(레벨 1)
        const rec = { seed, classes, normal: { runs: normal.runs, sec: normal.sec, exp: normal.exp, stuck: normal.stuck, skips: normal.skips, end: gearOf(SYS_A, G) }, probes: [], A: {}, B: {} };
        if (!normal.stuck) {
            const SN = clone(G);
            // A 캠페인 — 대표 칸 도착마다 탐침(A · B 같은 상태)
            const onArrive = diff => (stageId, g) => {
                const pa = probe(SYS_A, g, stageId, diff, opt.K), pb = probe(SYS_B, g, stageId, diff, opt.K);
                rec.probes.push({ diff, stageId, arrive: gearOf(SYS_A, g), A: pa, B: pb });
            };
            for (const [tag, SYS] of [['A', SYS_A], ['B', SYS_B]]) {
                const g = clone(SN);
                const nm = runTier(SYS, B, g, 'nightmare', opt, tag === 'A' ? onArrive('nightmare') : null, 'normal');
                rec[tag].nightmare = { runs: nm.runs, sec: nm.sec, exp: nm.exp, wins: nm.wins, stuck: nm.stuck, skips: nm.skips, end: gearOf(SYS, g),
                    stages: nm.stages.map(s => ({ id: s.stageId, tries: s.tries, wins: s.wins, farm: s.farm, skip: !!s.skipped })) };
                if (!nm.stuck && opt.hell) {
                    const hl = runTier(SYS, B, g, 'hell', opt, tag === 'A' ? onArrive('hell') : null, 'nightmare');
                    rec[tag].hell = { runs: hl.runs, sec: hl.sec, exp: hl.exp, wins: hl.wins, stuck: hl.stuck, skips: hl.skips, end: gearOf(SYS, g),
                        stages: hl.stages.map(s => ({ id: s.stageId, tries: s.tries, wins: s.wins, farm: s.farm, skip: !!s.skipped })) };
                }
            }
        }
        rec.cnt = { ...CNT };
        out.push(rec);
        head.textContent = `MSLV … ${out.length}/${seeds.length}`;
        await new Promise(r => setTimeout(r, 0));
    }
    const meta = { seeds, opt, ms: Math.round(performance.now() - t0), levels: D.difficultyList.map(d => `${d.id}:${d.monsterSkillLevel}`) };
    document.getElementById('sim').textContent = JSON.stringify({ meta, out });
    head.textContent = `MSLV ok ${out.length}`;
    document.title = `MSLV ok ${out.length}`;
} catch (e) {
    head.textContent = 'MSLV FAIL';
    document.title = 'MSLV FAIL';
    const pre = document.createElement('pre');
    pre.id = 'err';
    pre.textContent = String(e && e.stack ? e.stack : e);
    document.body.appendChild(pre);
}
