// 집계 — 변형마다 (그 영웅 가한 피해 합 ÷ 판 시간 합) / 기준 − 1 · 승률 차 · 판(row) 단위 부트스트랩 95%
// 발동 줄은 행마다 풀 스킬 평균(무기 하나에 스킬 하나가 균등하게 박힌다) = `proc` · 스킬별도 따로
// 원소 줄(원소 % · 원소 관통)은 「효과가 있던 판」(기준과 결과가 하나라도 다른 판)만 따로 센다
import fs from 'node:fs';
const DIR = process.argv[2];
const rows = [];
for (const f of fs.readdirSync(DIR)) if (f.startsWith('top_') && f.endsWith('.jsonl'))
    for (const l of fs.readFileSync(`${DIR}/${f}`, 'utf8').trim().split('\n')) if (l) rows.push(JSON.parse(l));
const sum = a => a.reduce((x, y) => x + y, 0);
const ELEM = /(fire|cold|lightning)_dmg_pct|res_reduction_/;
// 행마다 발동 평균 변형을 만든다
for (const r of rows) {
    const ps = Object.keys(r.v).filter(k => k.includes('@'));
    const by = {};
    for (const k of ps) (by[k.split('@')[0]] ??= []).push(k);
    for (const [stat, ks] of Object.entries(by)) {
        const n = ks.length, K = r.v[ks[0]].dealt.length;
        r.v[`${stat}(평균)`] = {
            val: r.v[ks[0]].val,
            dealt: Array.from({ length: K }, (_, i) => sum(ks.map(k => r.v[k].dealt[i])) / n),
            dur: Array.from({ length: K }, (_, i) => sum(ks.map(k => r.v[k].dur[i])) / n),
            won: Array.from({ length: K }, (_, i) => sum(ks.map(k => r.v[k].won[i])) / n),
        };
    }
}
const same = (a, b) => a.dealt.every((x, i) => x === b.dealt[i]) && a.dur.every((x, i) => x === b.dur[i]);
function stat(rs, key) {
    const ratio = sel => {
        let d = 0, t = 0, d0 = 0, t0 = 0, w = 0, w0 = 0, n = 0;
        for (const r of sel) { const v = r.v[key], b = r.v.base; d += sum(v.dealt); t += sum(v.dur); d0 += sum(b.dealt); t0 += sum(b.dur); w += sum(v.won); w0 += sum(b.won); n += v.won.length; }
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
for (const kind of ['physical', 'magic']) {
    const rs = rows.filter(r => (r.kind === kind && (!process.env.CLS || r.cls === process.env.CLS)));
    const keys = new Set(); rs.forEach(r => Object.keys(r.v).forEach(k => keys.add(k)));
    keys.delete('base');
    const out = [];
    for (const key of keys) {
        let sel = rs.filter(r => r.v[key]);
        let note = '';
        if (ELEM.test(key)) { const eff = sel.filter(r => !same(r.v[key], r.v.base)); note = ` · 효과 있던 판 ${eff.length}/${sel.length}`; if (eff.length) sel = eff; }
        const s = stat(sel, key);
        const val = sel[0].v[key].val;
        out.push({ key, val, ...s, note });
    }
    out.sort((a, b) => b.dmg - a.dmg);
    console.log(`\n## ${kind} — 판 ${rs.length} × K`);
    console.log('| 변형 | 값 | 피해 | 95% | 승률 | 판 |');
    for (const o of out) console.log(`| ${o.key} | ${o.val} | ${pct(o.dmg)} | ${pct(o.lo)} ~ ${pct(o.hi)} | ${pct(o.win)}p | ${o.n}${o.note} |`);
}
