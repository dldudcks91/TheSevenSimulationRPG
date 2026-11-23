/**
 * 집계 — 줄마다 「점수 0 → 1」(줄의 lo → hi) · 베이스는 +50% → +150% 의
 *   점수 변화(게임 함수 · 그 영웅에게 안 먹는 줄은 0) · 그 영웅의 초당 가한 피해 변화(기준 대비 %) · 팀 승률 변화(%p)
 * 피해 = 판마다 가한 피해 ÷ 판 시간 → 변형마다 K 판 평균 → 판(씨앗 · 무기군) 합의 비. 95% 구간 = 판 단위 부트스트랩 1000회.
 * node analyze.mjs <glob prefix e.g. ../out/pvp_> [byTier|byKind|all]
 */
import fs from 'node:fs';
import path from 'node:path';

const [PREFIX, BY = 'all'] = process.argv.slice(2);
const dir = path.dirname(PREFIX), base = path.basename(PREFIX);
const rows = fs.readdirSync(dir).filter(f => f.startsWith(base) && f.endsWith('.jsonl'))
    .flatMap(f => fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse));

// 보정분(FIX=접두) — 색욕 최소 · 최대 데미지 줄은 1차 측정의 값이 틀렸다(범위를 풀 때 베이스 몫이 섞임) → 1차 값을 지우고 보정 측정으로 덮는다
const FIXED = ['dmg_min_flat', 'dmg_max_flat'];
if (process.env.FIX) {
    const fd = path.dirname(process.env.FIX), fb = path.basename(process.env.FIX);
    const fix = new Map(fs.readdirSync(fd).filter(f => f.startsWith(fb) && f.endsWith('.jsonl'))
        .flatMap(f => fs.readFileSync(path.join(fd, f), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse))
        .map(r => [`${r.seed}|${r.T}|${r.g}`, r]));
    for (const r of rows) {
        for (const s of FIXED) { delete r.v[`${s}_lo`]; delete r.v[`${s}_hi`]; }
        const f = fix.get(`${r.seed}|${r.T}|${r.g}`);
        if (!f) continue;
        if (f.v.base.dealt.join() !== r.v.base.dealt.join()) throw new Error(`기준판이 다르다 ${r.seed}|${r.T}|${r.g}`);
        for (const s of FIXED) if (f.v[`${s}_lo`]) { r.v[`${s}_lo`] = f.v[`${s}_lo`]; r.v[`${s}_hi`] = f.v[`${s}_hi`]; r.ranges[s] = f.ranges[s]; }
    }
}

const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const dpsOf = v => mean(v.dealt.map((d, i) => d / Math.max(1e-9, v.dur[i])));
const winOf = v => mean(v.won);

let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 2 ** 32; };

function effect(rs, lo, hi) {
    const ok = rs.filter(r => r.v[lo] && r.v[hi]);
    if (!ok.length) return null;
    const d = ok.map(r => ({ b: dpsOf(r.v.base), dd: dpsOf(r.v[hi]) - dpsOf(r.v[lo]), dw: winOf(r.v[hi]) - winOf(r.v[lo]), ds: r.v[hi].score - r.v[lo].score }));
    const rel = xs => xs.reduce((s, x) => s + x.dd, 0) / xs.reduce((s, x) => s + x.b, 0);
    const boots = [];
    for (let k = 0; k < 1000; k++) { const xs = d.map(() => d[Math.floor(rnd() * d.length)]); boots.push(rel(xs)); }
    boots.sort((a, b) => a - b);
    return { n: ok.length, ds: mean(d.map(x => x.ds)), dmg: rel(d), lo95: boots[25], hi95: boots[974], win: mean(d.map(x => x.dw)) };
}

const groupKey = r => BY === 'byTier' ? `${r.kind}·${r.T}(L${r.L})` : BY === 'byKind' ? r.kind : BY === 'byGroup' ? `${r.g}` : 'all';
const groups = {};
for (const r of rows) (groups[groupKey(r)] ??= []).push(r);

const pct = x => (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + '%';
for (const [key, rs] of Object.entries(groups)) {
    const stats = [...new Set(rs.flatMap(r => Object.keys(r.v)).filter(n => n.endsWith('_hi') && n !== 'base_hi').map(n => n.slice(0, -3)))];
    console.log(`\n## ${key} — 판 ${rs.length}`);
    console.log('| 줄 | 점수 변화 | 피해 변화 | 95% | 점수 1 당 피해 | 승률 변화 |');
    console.log('|---|---|---|---|---|---|');
    const lines = [['베이스 +50%→+150%', effect(rs, 'base_lo', 'base_hi')], ...stats.map(s => [s, effect(rs, `${s}_lo`, `${s}_hi`)])].filter(([, e]) => e);
    lines.sort((a, b) => b[1].dmg - a[1].dmg);
    for (const [name, e] of lines)
        console.log(`| ${name} | ${e.ds.toFixed(2)} | ${pct(e.dmg)} | ${pct(e.lo95)} ~ ${pct(e.hi95)} | ${e.ds > 0.01 ? pct(e.dmg / e.ds) : '—'} | ${(e.win * 100 >= 0 ? '+' : '') + (e.win * 100).toFixed(1)}%p |`);
}
