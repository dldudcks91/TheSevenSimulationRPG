/**
 * 대량 실행 — `qa` 스킬 기획 모드의 도구 (.claude/skills/qa · src/dev/README.md 「대량 실행」).
 *
 * 시드를 바꿔 같은 조건을 여러 번 돌리고 요약 표와 JSON 을 찍는다 — 헤드리스 `--dump-dom` 으로 읽는다.
 * 캘리브레이션 표(test.html)는 손잡이 조정용 **고정 표**이고 이쪽은 약속 검사용 **분포**다.
 * test.js 에 넣지 않은 이유 — 모든 세션의 검증이 대량 실행만큼 느려진다.
 *
 * ⚠ **이식 대상이 아니다** — `game_logic/` 을 읽기만 한다(golden.js 와 같은 자리).
 *   봇(장비 고르기)도 여기 산다 — `game_logic/` 에 넣으면 「자동 장착」이 게임 기능처럼 굳는다.
 *   봇 규칙과 가정은 결과의 `meta.bot` · `meta.assume` 에 글로 실린다 — 그것이 곧 결과의 한계다.
 *
 *   ?mode=stage&seeds=1-50&stages=101&strip=0|1
 *       시드마다 새 게임 → 앞 스테이지 해금만 → 그 스테이지 한 판. `strip=1` 이면 출발 전에 파티 장비를 전부 벗긴다
 *   ?mode=campaign&seeds=1-20&runs=30&bot=greedy|off[&until=105][&mastery=1][&potion=1][&build=expedition,shop|max]
 *       시드마다 게임 하나로 원정을 `runs` 번 잇는다 — 매번 아직 못 깬 첫 스테이지. 판이 끝날 때마다 봇이 장착하고 남은 가방은 분해한다.
 *       시간 = 판마다 `durationSec` + [balance.csv:repeat_restart_sec] 를 쌓는다 — 스테이지별 **첫 클리어 시각 · 도착 레벨**을 낸다.
 *       `until` = 그 스테이지를 깨면 그 시드를 멈춘다 · `mastery=1` = 판마다 포인트를 찍는다 · `potion=1` = 판마다 골드로 물약을 산다
 *       `build` = 그 건물을 **끝까지 지은 채** 시작한다(문턱 · 비용 없이 · `max` 면 전부) — 2장부터는 원정 건물이 장을 열어(R152) 안 주면 `locked` 로 멈춘다
 */

import { loadData, buildSystems, D } from '../ui/data.js';
import { makeRng } from '../game_logic/rng.js';
import { GOLDEN_KNOBS } from './golden.js';

const NOW = 1_700_000_000_000;      // 고정 시각 — test.js 와 같다. 시간이 드는 규칙은 안 밟는다
const q = new URLSearchParams(location.search);

/** `1-20` · `3,7,9` · 섞어서 `1-5,9` */
const parseList = (spec, fallback) => String(spec ?? fallback).split(',').flatMap(part => {
    const m = part.trim().match(/^(\d+)-(\d+)$/);
    if (m) return Array.from({ length: Math.max(0, Number(m[2]) - Number(m[1]) + 1) }, (_, i) => Number(m[1]) + i);
    return [Number(part)];
}).filter(Number.isFinite);

const sum = (xs, f) => xs.reduce((a, x) => a + f(x), 0);
const avg = (xs, f) => xs.length ? sum(xs, f) / xs.length : 0;
const r2 = v => Math.round(v * 100) / 100;

/** 시작 파티를 채운 새 게임 — 캘리브레이션 · 골든과 **같은 시작 파티**(시드 1000 + n)라 표끼리 서로를 설명한다 */
function newGameFull(SYS, B, seed) {
    const G = SYS.game.newGame(seed, SYS.hero.rollStartParty(makeRng(1000 + seed), B.party_size_max), NOW);
    return G;
}
const partyHeroes = (SYS, G) => SYS.game.partyOf(G).map(uid => SYS.game.heroById(G, uid));
const wornCount = (SYS, G) => sum(partyHeroes(SYS, G), h => Object.values(h.equipped).filter(Boolean).length);
const dealtOf = rp => sum(rp.contrib ?? [], c => c.dealt ?? 0);

/* ── 봇 — 규칙을 바꾸면 이 글도 같이 고친다(결과의 meta 로 나간다) ── */

const BOT = {
    greedy: '가방 순서대로 한 개씩 — 파티 영웅마다 「끼면」 전투 수치(heroCombatIf)를 지금과 비교한다: 무기 = 공격력 범위의 평균 ÷ 행동 주기(초당 세기) · **제 직업의 무기군만**(weapon_group.csv:classes) · 평타가 생기거나 없어지는 무기(물리 ↔ 마법)는 안 낀다 · 그 밖 = 방어. '
        + '가장 많이 오르는 영웅에게 끼고, 안 올라도 그 자리가 비어 있으면 낀다. 벗은 것 · 남은 가방은 분해한다',
    off: '장착하지 않는다 · 가방은 분해한다',
};
const BOT_MASTERY = '판마다 파티 영웅의 포인트를 masteryState 노드 순서대로 찍을 수 있는 첫 칸에 전부 찍는다';
const BOT_POTION = '판마다 상단 물약 중 살 수 있는 가장 높은 단계를 골드가 모자랄 때까지 산다(상단이 안 지어졌으면 안 산다)';
const BOT_BUILD = ids => `시작할 때 건물(${ids === 'max' ? '전부' : ids.join(' · ')})을 문턱 · 비용 없이 끝까지 지어 둔다 — 봇은 건설을 안 한다`;

function botMastery(SYS, G) {
    let n = 0;
    for (const h of partyHeroes(SYS, G)) {
        for (;;) {
            const node = SYS.game.masteryState(G, h.uid)?.nodes.find(x => x.canLearn);
            if (!node || !SYS.game.learnMastery(G, h.uid, node.id).ok) break;
            n++;
        }
    }
    return n;
}

function botPotion(SYS, G) {
    let n = 0;
    const list = (SYS.game.shopState(G, NOW)?.potions ?? []).slice().sort((a, b) => b.tier - a.tier);
    for (const p of list) while (SYS.game.shopPotionBuy(G, p.id).ok) n++;
    return n;
}
const ASSUME = [
    '시작 파티 그대로 — 고용 · 해고 · 수색 없음',
    '마스터리 포인트를 안 쓴다 · 전술 리롤 · 강화 · 제작 · 크래프트 없음',
    '스테이지 레벨은 기본값 · 진형은 편성 순서 그대로',
    '시각 고정 · 즉시 정산(resolveBattle) — 라운드 사이에 장비를 안 바꾼다',
];

const atkOf = c => c.atk_physical ?? c.atk_magic ?? { min: 0, max: 0 };
/* 무기는 **초당 세기**로 잰다 [2026-10-05] — 한 대 평균만 보면 느린 무기를 고른다(주기는 무기군이 정한다).
   **제 직업의 무기군만** 고른다(`botEquip`) — 장착은 직업을 안 가리는데(`item.canEquip`) 다른 직업 무기를 끼면 약해진다:
   옛 봇은 그걸 끼어 장비 낀 쪽이 안 낀 쪽보다 약했다(1-1 III 승률 12% vs 45% · 직업 무기만 끼면 80%). 평타 여부가 바뀌는 무기(R198)도 거른다 */
const scoreOf = (c, slot) => slot === 'weapon' ? (atkOf(c).min + atkOf(c).max) / 2 / (c.action_period || 1) : c.defense;

function botEquip(SYS, G) {
    let n = 0;
    for (const uid of G.bag.slice()) {
        const it = G.items[uid];
        if (!it || !G.bag.includes(uid)) continue;
        let best = null;
        for (const h of partyHeroes(SYS, G)) {
            const pos = SYS.game.equipTarget(h, it);
            if (!pos) continue;
            if (it.slot === 'weapon' && ![].concat(D.weaponGroups[it.group]?.classes ?? []).includes(h.cls)) continue;   // 다른 직업의 무기
            const now = SYS.game.heroCombat(G, h), next = SYS.game.heroCombatIf(G, h, uid);
            if (it.slot === 'weapon' && next.basic_attack !== now.basic_attack) continue;   // 물리 ↔ 마법 — 평타가 바뀐다
            const gain = scoreOf(next, it.slot) - scoreOf(now, it.slot);
            if ((gain > 0 || (gain === 0 && !h.equipped[pos])) && (!best || gain > best.gain)) best = { h, gain };
        }
        if (best && SYS.game.equip(G, best.h.uid, uid).ok) n++;
    }
    return n;
}

function salvageBag(SYS, G) {
    const before = G.bag.length;
    for (const uid of G.bag.slice()) SYS.game.salvage(G, uid);
    return before - G.bag.length;
}

function stripParty(SYS, G) {
    for (const h of partyHeroes(SYS, G))
        for (const [pos, uid] of Object.entries(h.equipped)) if (uid) SYS.game.unequip(G, h.uid, pos);
}

/* ── stage — 한 판씩 ── */

function runStage(SYS, B, seeds, stages, strip) {
    const rows = [];
    for (const stageId of stages) {
        const at = D.stageOrder.indexOf(stageId);
        if (at < 0) throw new Error(`sim: stage ${stageId} 이 stage.csv 에 없다`);
        for (const seed of seeds) {
            const G = newGameFull(SYS, B, seed);
            G.progress.cleared = D.stageOrder.slice(0, at);       // 해금만 풀어 준다(성장 없음) — 캘리브레이션과 같은 조건
            const classes = partyHeroes(SYS, G).map(h => h.cls);
            // 진형 — `[직업, 랭크]` (0 = 앞줄). 봇은 진형을 안 고르므로 편성 순서가 곧 자리다 — 직업 차이가 자리 탓인지 가를 때 본다
            const byUid = SYS.game.formationState(G).byUid;
            const lineup = partyHeroes(SYS, G).map(h => [h.cls, byUid[h.uid] ?? 0]);
            if (strip) stripParty(SYS, G);
            const worn = wornCount(SYS, G);
            const r = SYS.game.resolveBattle(G, stageId, NOW);
            if (!r.ok) throw new Error(`sim: seed ${seed} stage ${stageId} — ${r.err}`);
            const rp = r.report;
            rows.push({
                seed, stageId, classes, lineup, worn, won: rp.won, reason: rp.reason,
                cleared: rp.roundsCleared, rounds: rp.rounds.length, sec: rp.durationSec, downed: rp.downed.length,
                gold: rp.gold, drops: rp.drops.length, dealt: dealtOf(rp), taken: sum(rp.contrib ?? [], c => c.taken ?? 0),
            });
        }
    }
    return rows;
}

function stageSummary(rows, seeds) {
    const first = new Set(seeds.slice(0, Math.ceil(seeds.length / 2)));
    const pack = rs => ({
        n: rs.length, winPct: r2(100 * avg(rs, r => r.won ? 1 : 0)), cleared: r2(avg(rs, r => r.cleared)),
        sec: r2(avg(rs, r => r.sec)), downed: r2(avg(rs, r => r.downed)), dealt: r2(avg(rs, r => r.dealt)),
        drops: r2(avg(rs, r => r.drops)), worn: r2(avg(rs, r => r.worn)), timeouts: rs.filter(r => r.reason === 'timeout').length,
    });
    const out = {};
    for (const id of [...new Set(rows.map(r => r.stageId))]) {
        const rs = rows.filter(r => r.stageId === id);
        const classes = [...new Set(rs.flatMap(r => r.classes))].sort();
        out[id] = {
            all: pack(rs),
            halves: [pack(rs.filter(r => first.has(r.seed))), pack(rs.filter(r => !first.has(r.seed)))],
            // 직업이 든 판 vs 안 든 판 — 승률이 0 에 붙어 있으면 넘긴 라운드(cleared)로 본다
            byClass: Object.fromEntries(classes.map(c => {
                const w = pack(rs.filter(r => r.classes.includes(c))), wo = pack(rs.filter(r => !r.classes.includes(c)));
                return [c, { with: w.n, withWinPct: w.winPct, withCleared: w.cleared, without: wo.n, withoutWinPct: wo.winPct, withoutCleared: wo.cleared }];
            })),
        };
    }
    return out;
}

/* ── campaign — 한 게임으로 원정을 잇는다 ── */

function runCampaign(SYS, B, seeds, runs, bot, opt = {}) {
    const rows = [];
    for (const seed of seeds) {
        const G = newGameFull(SYS, B, seed);
        for (const b of SYS.construction.list) if (opt.build === 'max' || opt.build?.includes(b.id)) G.buildings[b.id] = b.maxRank;
        const classes = partyHeroes(SYS, G).map(h => h.cls);
        let t = 0;                                   // 누적 초 — 판 시간 + 재출발
        for (let n = 1; n <= runs; n++) {
            const stageId = D.stageOrder.find(id => !G.progress.cleared.includes(id)) ?? D.stageOrder[D.stageOrder.length - 1];
            const lvBefore = avg(partyHeroes(SYS, G), h => h.level);
            const r = SYS.game.resolveBattle(G, stageId, NOW);
            if (!r.ok) throw new Error(`sim: seed ${seed} run ${n} stage ${stageId} — ${r.err}`);
            const rp = r.report;
            t += rp.durationSec + B.repeat_restart_sec;
            const equips = bot === 'greedy' ? botEquip(SYS, G) : 0;
            const salvaged = salvageBag(SYS, G);
            const learned = opt.mastery ? botMastery(SYS, G) : 0;
            const potions = opt.potion ? botPotion(SYS, G) : 0;
            rows.push({
                seed, n, classes, stageId, won: rp.won, cleared: rp.roundsCleared, sec: rp.durationSec, t: r2(t), lvBefore: r2(lvBefore),
                gold: rp.gold, goldHave: G.resources.gold, dustHave: G.resources.dust, kills: sum(rp.contrib ?? [], c => c.kills ?? 0),
                drops: rp.drops.length, discarded: rp.discarded, equips, salvaged, learned, potions,
                reached: G.progress.cleared.length, levels: sum(partyHeroes(SYS, G), h => h.level), dealt: dealtOf(rp),
            });
            if (opt.until != null && G.progress.cleared.includes(opt.until)) break;
        }
    }
    return rows;
}

const pctl = (xs, p) => {
    if (!xs.length) return null;
    const s = xs.slice().sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))];
};

/** 스테이지별 — 첫 클리어 누적 분(중앙 · 빠른 1/4 · 느린 1/4) · 못 깬 시드 · 첫 도전 때 평균 레벨 · 판 수 · 한 판 승률 */
function stageTimes(rows, seeds) {
    const out = {};
    for (const id of D.stageOrder) {
        const tries = rows.filter(r => r.stageId === id);
        if (!tries.length) continue;
        const firstClear = seeds.map(s => tries.find(r => r.seed === s && r.won)).filter(Boolean);
        const firstTry = seeds.map(s => tries.find(r => r.seed === s)).filter(Boolean);
        const mins = firstClear.map(r => r.t / 60);
        out[id] = {
            tried: firstTry.length, clearedSeeds: firstClear.length,
            medMin: r2(pctl(mins, 0.5)), q1Min: r2(pctl(mins, 0.25)), q3Min: r2(pctl(mins, 0.75)),
            arriveLv: r2(avg(firstTry, r => r.lvBefore)), clearLv: r2(avg(firstClear, r => r.levels / 3)),
            runsPerSeed: r2(tries.length / Math.max(1, firstTry.length)), winPct: r2(100 * avg(tries, r => r.won ? 1 : 0)),
        };
    }
    return out;
}

function campaignSummary(rows, seeds, runs) {
    const first = new Set(seeds.slice(0, Math.ceil(seeds.length / 2)));
    const pack = rs => {
        const last = seeds.map(s => rs.filter(r => r.seed === s).at(-1)).filter(Boolean);
        const drops = sum(rs, r => r.drops), equips = sum(rs, r => r.equips);
        return {
            seeds: last.length, reached: r2(avg(last, r => r.reached)), winsPerSeed: r2(sum(rs, r => r.won ? 1 : 0) / Math.max(1, last.length)),
            levels: r2(avg(last, r => r.levels)), drops, equips, equipPct: drops ? r2(100 * equips / drops) : 0,
            discarded: sum(rs, r => r.discarded),
        };
    };
    const marks = [...new Set([Math.ceil(runs / 4), Math.ceil(runs / 2), Math.ceil(runs * 3 / 4), runs])];
    return {
        all: pack(rows),
        halves: [pack(rows.filter(r => first.has(r.seed))), pack(rows.filter(r => !first.has(r.seed)))],
        curve: marks.map(m => ({ run: m, reached: r2(avg(rows.filter(r => r.n === m), r => r.reached)) })),
        stages: stageTimes(rows, seeds),
    };
}

/* ── 출력 ── */

const table = (head, body) => `<table><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${
    body.map(r => `<tr>${r.map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</table>`;

function renderStage(summary) {
    return Object.entries(summary).map(([id, s]) => `<h2>stage ${id}</h2>` + table(
        ['', 'n', 'win %', 'cleared', 'sec', 'downed', 'dealt', 'drops', 'worn', 'timeouts'],
        [['all', s.all], ['seeds 1st half', s.halves[0]], ['seeds 2nd half', s.halves[1]]].map(([k, p]) =>
            [k, p.n, p.winPct, p.cleared, p.sec, p.downed, p.dealt, p.drops, p.worn, p.timeouts]),
    ) + table(
        ['class', 'with n', 'with win %', 'with cleared', 'without n', 'without win %', 'without cleared'],
        Object.entries(s.byClass).map(([c, v]) => [c, v.with, v.withWinPct, v.withCleared, v.without, v.withoutWinPct, v.withoutCleared]),
    )).join('');
}

function renderCampaign(s) {
    return '<h2>campaign</h2>' + table(
        ['', 'seeds', 'reached', 'wins/seed', 'levels', 'drops', 'equips', 'equip %', 'discarded'],
        [['all', s.all], ['seeds 1st half', s.halves[0]], ['seeds 2nd half', s.halves[1]]].map(([k, p]) =>
            [k, p.seeds, p.reached, p.winsPerSeed, p.levels, p.drops, p.equips, p.equipPct, p.discarded]),
    ) + table(['run', 'avg reached'], s.curve.map(c => [c.run, c.reached]))
      + '<h2>stage times (cumulative min to first clear)</h2>' + table(
        ['stage', 'tried', 'cleared', 'median', 'fast 1/4', 'slow 1/4', 'arrive Lv', 'clear Lv', 'runs/seed', 'win %'],
        Object.entries(s.stages).map(([id, v]) => [id, v.tried, v.clearedSeeds, v.medMin, v.q1Min, v.q3Min, v.arriveLv, v.clearLv, v.runsPerSeed, v.winPct]));
}

const head = document.getElementById('head');
try {
    await loadData('../data/');
    const SYS = buildSystems(D);
    const B = D.balance;
    const mode = q.get('mode') ?? 'stage';
    const seeds = parseList(q.get('seeds'), '1-20');
    if (!seeds.length) throw new Error('sim: seeds 가 비었다');
    let meta, rows, summary, html;
    if (mode === 'stage') {
        const stages = parseList(q.get('stages'), String(D.stageOrder[0]));
        const strip = q.get('strip') === '1';
        rows = runStage(SYS, B, seeds, stages, strip);
        summary = stageSummary(rows, seeds);
        html = renderStage(summary);
        meta = { mode, seeds: `${seeds[0]}..${seeds[seeds.length - 1]} (${seeds.length})`, stages, strip,
            bot: strip ? '출발 전에 파티 장비를 전부 벗긴다 — 그 밖에는 봇이 없다(한 판)' : '봇 없음 — 시작 장비 그대로 한 판' };
    } else if (mode === 'campaign') {
        const runs = Math.max(1, Number(q.get('runs') ?? 30) | 0);
        const bot = q.get('bot') ?? 'greedy';
        if (!BOT[bot]) throw new Error(`sim: bot=${bot} 은 없다 — ${Object.keys(BOT).join(' | ')}`);
        const opt = {
            until: q.get('until') != null ? Number(q.get('until')) : null,
            mastery: q.get('mastery') === '1', potion: q.get('potion') === '1',
            build: q.get('build') === 'max' ? 'max' : q.get('build') ? q.get('build').split(',') : null,
        };
        if (opt.until != null && !D.stageOrder.includes(opt.until)) throw new Error(`sim: until=${opt.until} 이 stage.csv 에 없다`);
        const noBuilding = opt.build && opt.build !== 'max' && opt.build.find(id => !SYS.construction.list.some(b => b.id === id));
        if (noBuilding) throw new Error(`sim: build=${noBuilding} 은 없다 — ${SYS.construction.list.map(b => b.id).join(' | ')}`);
        rows = runCampaign(SYS, B, seeds, runs, bot, opt);
        summary = campaignSummary(rows, seeds, runs);
        html = renderCampaign(summary);
        meta = { mode, seeds: `${seeds[0]}..${seeds[seeds.length - 1]} (${seeds.length})`, runs, botName: bot,
            bot: [BOT[bot], opt.mastery && BOT_MASTERY, opt.potion && BOT_POTION, opt.build && BOT_BUILD(opt.build)].filter(Boolean).join(' · '), until: opt.until,
            time: '판마다 durationSec + repeat_restart_sec 누적 — 편성 · 장착 · 화면 조작 시간은 0' };
    } else {
        throw new Error(`sim: mode=${mode} 은 없다 — stage | campaign`);
    }
    meta.assume = ASSUME;
    meta.knobs = Object.fromEntries(GOLDEN_KNOBS.map(k => [k, B[k]]));
    head.textContent = `SIM ok ${mode} · ${rows.length} rows`;
    document.getElementById('meta').textContent = JSON.stringify(meta, null, 1);
    document.getElementById('summary').innerHTML = html;
    document.getElementById('sim').textContent = JSON.stringify({ meta, summary, rows });
    document.title = `SIM ok ${mode} ${rows.length}`;
} catch (e) {
    head.textContent = 'SIM FAIL';
    document.title = 'SIM FAIL';
    const pre = document.createElement('pre');
    pre.id = 'err';
    pre.textContent = String(e && e.stack ? e.stack : e);
    document.body.appendChild(pre);
}
