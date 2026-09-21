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
 *   ?mode=campaign&seeds=1-20&runs=30&bot=greedy|off
 *       시드마다 게임 하나로 원정을 `runs` 번 잇는다 — 매번 아직 못 깬 첫 스테이지. 판이 끝날 때마다 봇이 장착하고 남은 가방은 분해한다
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
    greedy: '가방 순서대로 한 개씩 — 파티 영웅마다 「끼면」 전투 수치(heroCombatIf)를 지금과 비교한다: 무기 = 공격력 범위의 평균 · 그 밖 = 방어. '
        + '가장 많이 오르는 영웅에게 끼고, 안 올라도 그 자리가 비어 있으면 낀다. 벗은 것 · 남은 가방은 분해한다',
    off: '장착하지 않는다 · 가방은 분해한다',
};
const ASSUME = [
    '시작 파티 그대로 — 고용 · 해고 · 수색 없음',
    '마스터리 포인트를 안 쓴다 · 전술 리롤 · 강화 · 제작 · 크래프트 없음',
    '스테이지 레벨은 기본값 · 진형은 편성 순서 그대로',
    '시각 고정 · 즉시 정산(resolveBattle) — 라운드 사이에 장비를 안 바꾼다',
];

const atkOf = c => c.atk_physical ?? c.atk_magic ?? { min: 0, max: 0 };
const scoreOf = (c, slot) => slot === 'weapon' ? (atkOf(c).min + atkOf(c).max) / 2 : c.defense;

function botEquip(SYS, G) {
    let n = 0;
    for (const uid of G.bag.slice()) {
        const it = G.items[uid];
        if (!it || !G.bag.includes(uid)) continue;
        let best = null;
        for (const h of partyHeroes(SYS, G)) {
            const pos = SYS.game.equipTarget(h, it);
            if (!pos) continue;
            const gain = scoreOf(SYS.game.heroCombatIf(G, h, uid), it.slot) - scoreOf(SYS.game.heroCombat(G, h), it.slot);
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

function runCampaign(SYS, B, seeds, runs, bot) {
    const rows = [];
    for (const seed of seeds) {
        const G = newGameFull(SYS, B, seed);
        const classes = partyHeroes(SYS, G).map(h => h.cls);
        for (let n = 1; n <= runs; n++) {
            const stageId = D.stageOrder.find(id => !G.progress.cleared.includes(id)) ?? D.stageOrder[D.stageOrder.length - 1];
            const r = SYS.game.resolveBattle(G, stageId, NOW);
            if (!r.ok) throw new Error(`sim: seed ${seed} run ${n} stage ${stageId} — ${r.err}`);
            const rp = r.report;
            const equips = bot === 'greedy' ? botEquip(SYS, G) : 0;
            const salvaged = salvageBag(SYS, G);
            rows.push({
                seed, n, classes, stageId, won: rp.won, cleared: rp.roundsCleared,
                drops: rp.drops.length, discarded: rp.discarded, equips, salvaged,
                reached: G.progress.cleared.length, levels: sum(partyHeroes(SYS, G), h => h.level), dealt: dealtOf(rp),
            });
        }
    }
    return rows;
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
    ) + table(['run', 'avg reached'], s.curve.map(c => [c.run, c.reached]));
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
        rows = runCampaign(SYS, B, seeds, runs, bot);
        summary = campaignSummary(rows, seeds, runs);
        html = renderCampaign(summary);
        meta = { mode, seeds: `${seeds[0]}..${seeds[seeds.length - 1]} (${seeds.length})`, runs, botName: bot, bot: BOT[bot] };
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
