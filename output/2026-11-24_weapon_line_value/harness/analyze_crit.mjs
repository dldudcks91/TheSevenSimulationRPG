// 집계 — top_crit.mjs 출력 · analyze.mjs 와 같은 지표(그 영웅 가한 피해 합 ÷ 판 시간 합 · 기준 대비 · 판 단위 부트스트랩 95%)
// 더하는 것: 「치명 몰빵 한 벌」 = base ÷ nocrit · 시트 평균(치명 확률 · 치명 피해) · 시트로 계산한 치명 기대 배수 비
import fs from 'node:fs';
const DIR = process.argv[2];
const rows = [];
for (const f of fs.readdirSync(DIR)) if (f.startsWith('top_') && f.endsWith('.jsonl'))
    for (const l of fs.readFileSync(`${DIR}/${f}`, 'utf8').trim().split('\n')) if (l) rows.push(JSON.parse(l));
const sum = a => a.reduce((x, y) => x + y, 0);
for (const r of rows) {
    const ps = Object.keys(r.v).filter(k => k.includes('@'));
    const by = {};
    for (const k of ps) (by[k.split('@')[0]] ??= []).push(k);
    for (const [stat, ks] of Object.entries(by)) {
        const n = ks.length, K = r.v[ks[0]].dealt.length;
        r.v[`${stat}(평균)`] = { val: r.v[ks[0]].val,
            dealt: Array.from({ length: K }, (_, i) => sum(ks.map(k => r.v[k].dealt[i])) / n),
            dur: Array.from({ length: K }, (_, i) => sum(ks.map(k => r.v[k].dur[i])) / n),
            won: Array.from({ length: K }, (_, i) => sum(ks.map(k => r.v[k].won[i])) / n) };
    }
}
function stat(rs, key, ref = 'base') {
    const ratio = sel => {
        let d = 0, t = 0, d0 = 0, t0 = 0, w = 0, w0 = 0, n = 0;
        for (const r of sel) { const v = r.v[key], b = r.v[ref]; d += sum(v.dealt); t += sum(v.dur); d0 += sum(b.dealt); t0 += sum(b.dur); w += sum(v.won); w0 += sum(b.won); n += v.won.length; }
        return { dmg: (d / t) / (d0 / t0) - 1, win: (w - w0) / n };
    };
    const pt = ratio(rs);
    const bs = [];
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let b = 0; b < 400; b++) bs.push(ratio(rs.map(() => rs[Math.floor(rnd() * rs.length)])).dmg);
    bs.sort((a, b) => a - b);
    return { ...pt, lo: bs[10], hi: bs[389], n: rs.length };
}
const pct = x => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%`;
const avg = a => sum(a) / a.length;
const E = s => 1 + Math.min(1, s.cr) * (s.cd - 1);
for (const kind of ['physical', 'magic']) {
    const rs = rows.filter(r => r.kind === kind);
    if (!rs.length) continue;
    console.log(`\n## ${kind} — 판 ${rs.length} × K`);
    const sh = k => `치명 확률 ${(avg(rs.map(r => r.sheet[k].cr)) * 100).toFixed(0)}% · 치명 피해 ×${avg(rs.map(r => r.sheet[k].cd)).toFixed(2)}`;
    console.log(`- 시트 평균 — 치명 줄 없음: ${sh('nocrit')} / 치명 몰빵(기준): ${sh('crit')} / + 무기 치명 두 줄: ${sh('both')}`);
    console.log(`- 100% 넘은 판(기준): ${rs.filter(r => r.sheet.crit.cr >= 1).length}/${rs.length} · (+ 무기 두 줄): ${rs.filter(r => r.sheet.both.cr >= 1).length}/${rs.length}`);
    console.log(`- 시트로 계산한 치명 기대 배수 비 — 몰빵 한 벌: ${pct(avg(rs.map(r => E(r.sheet.crit) / E(r.sheet.nocrit))) - 1)} · 무기 두 줄: ${pct(avg(rs.map(r => E(r.sheet.both) / E(r.sheet.crit))) - 1)}`);
    const m = stat(rs, 'base', 'nocrit');
    console.log(`- **치명 몰빵 한 벌(무기 외 부위)의 결투 값** = ${pct(m.dmg)} (${pct(m.lo)} ~ ${pct(m.hi)}) · 승률 ${pct(m.win)}p`);
    const keys = new Set(); rs.forEach(r => Object.keys(r.v).forEach(k => keys.add(k)));
    keys.delete('base'); keys.delete('nocrit');
    const out = [];
    for (const key of keys) {
        const sel = rs.filter(r => r.v[key]);
        out.push({ key, val: sel[0].v[key].val, ...stat(sel, key) });
    }
    out.sort((a, b) => b.dmg - a.dmg);
    console.log('\n| 변형 | 값 | 피해 | 95% | 승률 | 판 |');
    console.log('|---|---|---|---|---|---|');
    for (const o of out) console.log(`| ${o.key} | ${o.val} | ${pct(o.dmg)} | ${pct(o.lo)} ~ ${pct(o.hi)} | ${pct(o.win)}p | ${o.n} |`);
}
