const fs = require('fs'); const D = process.argv[2];
const sum = a => a.reduce((x, y) => x + y, 0);
const rows = [];
for (const f of fs.readdirSync(D)) if (f.startsWith('top_')) for (const l of fs.readFileSync(D + '/' + f, 'utf8').trim().split('\n')) rows.push(JSON.parse(l));
for (const kind of ['physical', 'magic']) {
  const rs = rows.filter(r => r.kind === kind);
  const agg = k => { let d = 0, t = 0; const cs = {}; for (const r of rs) { d += sum(r.v[k].dealt); t += sum(r.v[k].dur); for (const [a, b] of Object.entries(r.v[k].cs)) cs[a] = (cs[a] ?? 0) + b; } return { dps: d / t, d, cs }; };
  const a0 = agg('c0'), a1 = agg('c1');
  const cd = sum(rs.map(r => r.cd)) / rs.length;
  const f = x => (x * 100).toFixed(1) + '%';
  console.log(`## ${kind} (판 ${rs.length})`);
  console.log(`시트 치명 피해 평균 ×${cd.toFixed(2)} · 치명 100% / 0% 의 판 시간당 피해 비 ×${(a1.dps / a0.dps).toFixed(2)}`);
  for (const [n, a] of [['치명 0%', a0], ['치명 100%', a1]]) {
    const c = a.cs;
    console.log(`${n}: 직격 몫 ${f(c.direct / a.d)} (나머지 ${f(1 - c.direct / a.d)} = 도트 · 폭발 · 반사 · 튐 등) · 강타 몫(직격 안) ${f(c.cb / c.direct)} · 넘친 몫 ÷ 직격 ${f(c.ov / (c.direct + c.ov))} · 직격 중 치명 ${f(c.critN / c.n)} · 스킬 직격 몫 ${f(c.skill / c.direct)}`);
  }
  console.log(`직격 피해 비 ×${(a1.cs.direct / a0.cs.direct).toFixed(2)} · 직격 수 비 ×${(a1.cs.n / a0.cs.n).toFixed(2)} · 직격 1회당 비 ×${((a1.cs.direct / a1.cs.n) / (a0.cs.direct / a0.cs.n)).toFixed(2)} · 넘침 포함 1회당 비 ×${(((a1.cs.direct + a1.cs.ov) / a1.cs.n) / ((a0.cs.direct + a0.cs.ov) / a0.cs.n)).toFixed(2)}`);
}
