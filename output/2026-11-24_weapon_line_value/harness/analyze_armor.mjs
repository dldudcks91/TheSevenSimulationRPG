// 집계 — top_armor.mjs 출력 · 줄마다 같은 판의 기준(base) 대비
//   승률 = (이긴 판 − 기준 이긴 판) ÷ 판 수(%p) · 생존 = 살아 있던 시간 합 ÷ 기준 − 1 · 쓰러짐 = 그 영웅이 쓰러진 판 비율 차(%p) ·
//   피해 = (가한 피해 합 ÷ 판 시간 합) ÷ 기준 − 1 · 95% = 행(씨앗 × 무기군 × 죄종) 단위 부트스트랩
//   발동 줄은 스킬마다 + (평균)
import fs from 'node:fs';
const DIR = process.argv[2];
const rows = [];
for (const f of fs.readdirSync(DIR)) if (f.startsWith('top_') && f.endsWith('.jsonl'))
    for (const l of fs.readFileSync(`${DIR}/${f}`, 'utf8').trim().split('\n')) if (l) rows.push(JSON.parse(l));
const sum = a => a.reduce((x, y) => x + y, 0);
const died = v => v.alive.map((a, i) => (a < v.dur[i] - 1e-9 ? 1 : 0));
for (const r of rows) for (const v of Object.values(r.v)) v.dead = died(v);
for (const r of rows) {
    const ps = Object.keys(r.v).filter(k => k.includes('@'));
    const by = {};
    for (const k of ps) (by[k.split('@')[0]] ??= []).push(k);
    for (const [stat, ks] of Object.entries(by)) {
        const n = ks.length, K = r.v[ks[0]].won.length;
        const avg = f => Array.from({ length: K }, (_, i) => sum(ks.map(k => r.v[k][f][i])) / n);
        r.v[`${stat}(평균)`] = { val: r.v[ks[0]].val, dealt: avg('dealt'), taken: avg('taken'), alive: avg('alive'), dur: avg('dur'), won: avg('won'), dead: avg('dead') };
    }
}
function stat(rs, key) {
    const m = sel => {
        let w = 0, w0 = 0, a = 0, a0 = 0, d = 0, t = 0, d0 = 0, t0 = 0, x = 0, x0 = 0, n = 0;
        for (const r of sel) {
            const v = r.v[key], b = r.v.base;
            w += sum(v.won); w0 += sum(b.won); a += sum(v.alive); a0 += sum(b.alive);
            d += sum(v.dealt); t += sum(v.dur); d0 += sum(b.dealt); t0 += sum(b.dur);
            x += sum(v.dead); x0 += sum(b.dead); n += v.won.length;
        }
        return { win: (w - w0) / n, alive: a / a0 - 1, dmg: (d / t) / (d0 / t0) - 1, dead: (x - x0) / n };
    };
    const pt = m(rs);
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const bw = [], ba = [];
    for (let b = 0; b < 400; b++) { const s = m(rs.map(() => rs[Math.floor(rnd() * rs.length)])); bw.push(s.win); ba.push(s.alive); }
    bw.sort((a, b) => a - b); ba.sort((a, b) => a - b);
    return { ...pt, wlo: bw[10], whi: bw[389], alo: ba[10], ahi: ba[389], n: rs.length };
}
const pct = x => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`;
const pp = x => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%p`;
const base = rows.map(r => r.v.base);
const wr = sum(base.map(b => sum(b.won))) / sum(base.map(b => b.won.length));
const dr = sum(base.map(b => sum(b.dead))) / sum(base.map(b => b.won.length));
console.log(`판 ${rows.length} 행 × K · 기준 승률 ${(wr * 100).toFixed(1)}% · 기준 쓰러진 판 ${(dr * 100).toFixed(1)}%`);
const keys = new Set(); rows.forEach(r => Object.keys(r.v).forEach(k => keys.add(k))); keys.delete('base');
const outRows = [];
for (const key of keys) { const sel = rows.filter(r => r.v[key]); outRows.push({ key, val: sel[0].v[key].val, ...stat(sel, key) }); }
outRows.sort((a, b) => b.win - a.win);
console.log('\n| 변형 | 값 | 승률 | 95% | 생존 시간 | 95% | 쓰러진 판 | 가한 피해 | 판 |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const o of outRows) console.log(`| ${o.key} | ${o.val} | ${pp(o.win)} | ${pp(o.wlo)} ~ ${pp(o.whi)} | ${pct(o.alive)} | ${pct(o.alo)} ~ ${pct(o.ahi)} | ${pp(o.dead)} | ${pct(o.dmg)} | ${o.n} |`);
