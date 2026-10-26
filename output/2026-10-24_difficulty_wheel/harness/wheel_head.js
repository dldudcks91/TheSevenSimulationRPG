/**
 * 스크래치 하네스 — 난이도 바퀴(노말 → 나이트메어 → 헬) 캠페인. **저장소에 없다** (qa-fun 2026-10-24 야간 측정).
 * sim.js `campaign` 과 같은 봇 · 같은 시간 셈(판마다 durationSec + repeat_restart_sec)에 단을 잇는다:
 *   한 단의 1~5장 칸을 순서대로 다 깨면 다음 단 1-1 부터. 같은 칸에서 `stall` 판 연속으로 못 이기면 그 시드는 거기서 멈춘다(= 막힌 칸).
 *   ?seeds=1-5&bot=greedy|off&mastery=1&potion=1&build=max&stall=800&cap=30000&diffs=normal,nightmare,hell
 */
import { loadData, buildSystems, D } from '../ui/data.js';
import { makeRng } from '../game_logic/rng.js';

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

const partyHeroes = (SYS, G) => SYS.game.partyOf(G).map(uid => SYS.game.heroById(G, uid));

/* 봇 — sim.js 에서 그대로 베꼈다(2026-10-23 HEAD 33b9bf1) */
const atkOf = c => c.atk_physical ?? c.atk_magic ?? { min: 0, max: 0 };
const scoreOf = (c, slot) => slot === 'weapon' ? (atkOf(c).min + atkOf(c).max) / 2 / (c.action_period || 1) : c.defense;
function botEquip(SYS, G) {
    let n = 0;
    for (const uid of G.bags.flat()) if (G.items[uid]?.box) SYS.game.openBox(G, uid);
    for (const uid of G.bags.flat()) {
        const it = G.items[uid];
        if (!it || SYS.game.holderOf(G, uid) !== 'bag') continue;
        let best = null;
        for (const h of partyHeroes(SYS, G)) {
            const pos = SYS.game.equipTarget(h, it);
            if (!pos) continue;
            if (SYS.item.canEquip(h, it)) continue;
            if (it.slot === 'weapon' && ![].concat(D.weaponGroups[it.group]?.classes ?? []).includes(h.cls)) continue;
            const now = SYS.game.heroCombat(G, h), next = SYS.game.heroCombatIf(G, h, uid);
            if (it.slot === 'weapon' && next.basic_attack !== now.basic_attack) continue;
            const gain = scoreOf(next, it.slot) - scoreOf(now, it.slot);
            if ((gain > 0 || (gain === 0 && !h.equipped[pos])) && (!best || gain > best.gain)) best = { h, gain };
        }
        if (best && SYS.game.equip(G, best.h.uid, uid).ok) n++;
    }
    return n;
}
/* 봇 auto — 게임의 자동 장착(영웅 세기 · R313)을 파티 영웅마다 + 반지 · 목걸이는 더 높은 아이템 레벨(같으면 더 높은 등급)이면 바꾼다 */
const RAR = { normal: 0, magic: 1, rare: 2, unique: 3, set: 3 };
const accKey = it => (it.ilvl ?? 0) * 10 + (RAR[it.rarity] ?? 0);
function botAuto(SYS, G) {
    for (const uid of G.bags.flat()) if (G.items[uid]?.box) SYS.game.openBox(G, uid);
    for (const h of partyHeroes(SYS, G)) SYS.game.autoEquip(G, h.uid, 1);
    for (const h of partyHeroes(SYS, G)) for (const pos of ['amulet', 'ring1', 'ring2']) {
        const part = pos === 'amulet' ? 'amulet' : 'ring';
        const cur = G.items[h.equipped[pos]];
        let best = null;
        for (const uid of G.bags[0] ?? []) {
            const it = G.items[uid];
            if (!it || it.box || it.slot !== part || SYS.item.canEquip(h, it)) continue;
            if ((!cur || accKey(it) > accKey(cur)) && (!best || accKey(it) > accKey(best))) best = it;
        }
        if (best) SYS.game.equip(G, h.uid, best.uid, pos);
    }
}
const salvageBag = (SYS, G) => { for (const uid of G.bags.flat()) SYS.game.salvage(G, uid); };
function botMastery(SYS, G) {
    for (const h of partyHeroes(SYS, G)) for (;;) {
        const node = SYS.game.masteryState(G, h.uid)?.nodes.find(x => x.canLearn);
        if (!node || !SYS.game.learnMastery(G, h.uid, node.id).ok) break;
    }
}
function botPotion(SYS, G) {
    const list = (SYS.game.shopState(G, NOW)?.potions ?? []).slice().sort((a, b) => b.tier - a.tier);
    for (const p of list) while (SYS.game.shopPotionBuy(G, p.id).ok);
}

/** 파티 장비 사진 — 낀 칸 수 · 평균 ilvl · 무기 ilvl(영웅별) · 희귀도 개수 · 강화 합 */
function gearOf(SYS, G) {
    const hs = partyHeroes(SYS, G);
    const items = hs.flatMap(h => Object.values(h.equipped).filter(Boolean).map(uid => G.items[uid]).filter(Boolean));
    const rar = {};
    for (const it of items) rar[it.rarity] = (rar[it.rarity] ?? 0) + 1;
    return {
        lv: r2(avg(hs, h => h.level)), worn: items.length, ilvl: r2(avg(items, it => it.ilvl ?? 0)),
        ilvlMin: items.length ? Math.min(...items.map(it => it.ilvl ?? 0)) : 0,
        wpn: hs.map(h => G.items[h.equipped.weapon]?.ilvl ?? 0), rar,
    };
}

function runWheel(SYS, B, seed, opt) {
    const G = SYS.game.newGame(seed, SYS.hero.rollStartParty(makeRng(1000 + seed), B.party_size_max), NOW);
    for (const b of SYS.construction.list) if (opt.build === 'max' || opt.build?.includes(b.id)) G.buildings[b.id] = b.maxRank;
    const classes = partyHeroes(SYS, G).map(h => h.cls);
    const order = D.stageOrder.filter(id => D.stages[id].chapter <= opt.chapters);
    let t = 0, n = 0;
    const stages = [];        // 칸마다 한 줄 — {diff, stageId, tries, wins, t0, tClear, arrive, clear, last100}
    const tiers = [];         // 단마다 — {diff, t0, t1, runs}
    const marks = [];         // 500판마다 체크포인트
    let stuck = null;
    outer:
    for (const diff of opt.diffs) {
        const tier = { diff, t0: r2(t), n0: n, t1: null, runs: 0 };
        tiers.push(tier);
        /** 한 판 + 판 뒤 봇 — 리포트 또는 거절 사유 */
        const play = stageId => {
            let r;
            try { r = SYS.game.resolveBattle(G, stageId, NOW, G.preset, diff); } catch (e) { return { err: 'throw ' + String(e?.message ?? e).slice(0, 160) }; }
            if (!r.ok) return { err: r.err };
            n++;
            t += r.report.durationSec + B.repeat_restart_sec;
            if (opt.bot === 'greedy') botEquip(SYS, G);
            else if (opt.bot === 'auto') botAuto(SYS, G);
            salvageBag(SYS, G);
            if (opt.mastery) botMastery(SYS, G);
            if (opt.potion) botPotion(SYS, G);
            if (n % 500 === 0) marks.push({ n, t: r2(t), diff, stageId, ...gearOf(SYS, G) });
            return r.report;
        };
        for (const [idx, stageId] of order.entries()) {
            if (SYS.game.stageCleared(G, stageId, diff)) continue;
            const row = { diff, stageId, mlv: SYS.game.stageLevel(stageId, diff), tries: 0, wins: 0, farm: 0, farmSec: 0, t0: r2(t), tClear: null, arrive: gearOf(SYS, G), clear: null, recent: [] };
            stages.push(row);
            // 파밍 칸 = 순서상 앞의 깬 칸 중 챕터보스가 아닌 가장 가까운 칸 (챕터보스는 시각 고정이라 재등장 대기에 걸린다)
            const farmAt = order.slice(0, idx).reverse().find(id => D.stages[id].boss_grade !== 'chapter_boss' && SYS.game.stageCleared(G, id, diff)) ?? null;
            let streak = 0;
            while (!SYS.game.stageCleared(G, stageId, diff)) {
                if (n >= opt.cap) { stuck = { why: 'cap', diff, stageId, mlv: row.mlv, tries: row.tries, gear: gearOf(SYS, G), t: r2(t) }; break outer; }
                if (row.tries >= opt.stall) { stuck = { why: 'stall', diff, stageId, mlv: row.mlv, tries: row.tries, farm: row.farm, gear: gearOf(SYS, G), t: r2(t) }; break outer; }
                const rp = play(stageId);
                if (rp.err) { stuck = { why: 'err:' + rp.err, diff, stageId, tries: row.tries, gear: gearOf(SYS, G), t: r2(t) }; break outer; }
                row.tries++;
                if (rp.won) { row.wins++; streak = 0; } else streak++;
                row.recent.push(rp.roundsCleared);
                if (row.recent.length > 50) row.recent.shift();
                // 사람처럼 — `patience` 판 연속 지면 앞 칸을 `farm` 판 돌고 다시 온다 (레벨 · 장비를 쌓는다)
                if (!rp.won && streak >= opt.patience && farmAt != null && opt.farm > 0) {
                    const t1 = t;
                    for (let k = 0; k < opt.farm && n < opt.cap; k++) { if (play(farmAt).err) break; row.farm++; }
                    row.farmSec += t - t1;
                    streak = 0;
                }
            }
            row.tClear = r2(t);
            row.clear = gearOf(SYS, G);
            row.recentCleared = r2(avg(row.recent, x => x));
            delete row.recent;
        }
        tier.t1 = r2(t);
        tier.runs = n - tier.n0;
    }
    if (stuck) {
        const last = stages.at(-1);
        if (last) { last.recentCleared = r2(avg(last.recent ?? [], x => x)); delete last.recent; }
    }
    return { seed, classes, runs: n, t: r2(t), tiers, stages, marks, stuck, end: gearOf(SYS, G), gold: G.resources.gold };
}

const head = document.getElementById('head');
try {
    await loadData('../data/');
    const SYS = buildSystems(D);
    const B = D.balance;
    const seeds = parseList(q.get('seeds'), '1-5');
    const opt = {
        bot: q.get('bot') ?? 'greedy', mastery: q.get('mastery') === '1', potion: q.get('potion') === '1',
        build: q.get('build') === 'max' ? 'max' : q.get('build') ? q.get('build').split(',') : null,
        stall: Number(q.get('stall') ?? 800), cap: Number(q.get('cap') ?? 30000),
        patience: Number(q.get('patience') ?? 10), farm: Number(q.get('farm') ?? 10),
        diffs: (q.get('diffs') ?? 'normal,nightmare,hell').split(','), chapters: Number(q.get('chapters') ?? 5),
    };
    const t0 = performance.now();
    const out = [];
    for (const s of seeds) {
        out.push(runWheel(SYS, B, s, opt));
        head.textContent = `wheel … ${out.length}/${seeds.length}`;
        await new Promise(r => setTimeout(r, 0));
    }
    const meta = { seeds, opt, ms: Math.round(performance.now() - t0), restart: B.repeat_restart_sec, cap: B.hero_level_cap,
        bot: (opt.bot === 'auto' ? '게임 자동 장착(autoEquip · 영웅 세기 R313)을 파티 영웅마다 + 반지 · 목걸이는 아이템 레벨 → 등급이 높으면 바꾼다 · 첫 클리어 상자 연다' : 'sim.js greedy 베낌(무기 초당 세기 · 제 직업 무기군 · 그 밖 방어 · 첫 클리어 상자 연다)') + ' · 남은 가방 분해' + (opt.mastery ? ' · 마스터리 첫 칸 몰아 찍기' : '') + (opt.potion ? ' · 상단 물약 최고 단계 구매' : '') + (opt.build ? ' · 건물 ' + opt.build + ' 끝까지' : ''),
        assume: ['시작 파티 그대로 — 고용 · 해고 · 수색 없음', '강화 · 상점 장비 · 제작 · 크래프트 · 책 · 전직 · 전술 리롤 없음', '진형은 편성 순서 그대로', '시각 고정 · 즉시 정산 — 라운드 사이에 장비를 안 바꾼다', '한 단의 칸을 순서대로 다 깨면 다음 단', `한 칸에서 ${opt.patience}판 연속 지면 앞의 깬 칸(챕터보스 칸 제외)을 ${opt.farm}판 돌고 돌아온다 — 그 칸 도전 ${opt.stall}판(파밍 판 제외)에 못 깨면 막힘`] };
    document.getElementById('sim').textContent = JSON.stringify({ meta, out });
    head.textContent = `WHEEL ok ${out.length}`;
    document.title = `WHEEL ok ${out.length}`;
} catch (e) {
    head.textContent = 'WHEEL FAIL';
    document.title = 'WHEEL FAIL';
    const pre = document.createElement('pre');
    pre.id = 'err';
    pre.textContent = String(e && e.stack ? e.stack : e);
    document.body.appendChild(pre);
}
