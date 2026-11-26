// top_maxres.mjs 출력 — 최대 원소 저항 변형의 승률 · 받은 피해 · 생존 · 상대에 그 원소 메이지가 있는 판 / 없는 판
import fs from 'node:fs';
const DIR = process.argv[2];
const rows = [];
for (const f of fs.readdirSync(DIR)) if (f.startsWith('top_') && f.endsWith('.jsonl'))
    for (const l of fs.readFileSync(`${DIR}/${f}`, 'utf8').trim().split('\n')) if (l) rows.push(JSON.parse(l));
const sum = a => a.reduce((x, y) => x + y, 0);
const pp = x => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}`;
const MAGE = { fire: 'fire_mage', cold: 'frost_mage', lightning: 'thunder_mage' };
const hasEl = (r, X) => (X === 'poison' ? r.opp.some(([c]) => c === 'archer') : r.opp.some(([, a]) => a === MAGE[X]));
function cmp(sel, key, ref) {
    let w = 0, w0 = 0, n = 0, tk = 0, tk0 = 0, t = 0, t0 = 0, al = 0, al0 = 0;
    for (const r of sel) {
        const v = r.v[key], b = r.v[ref];
        w += sum(v.won); w0 += sum(b.won); n += v.won.length;
        tk += sum(v.taken); t += sum(v.dur); tk0 += sum(b.taken); t0 += sum(b.dur);
        al += sum(v.alive); al0 += sum(b.alive);
    }
    if (!n) return '—';
    return `${pp((w - w0) / n)}%p · 받은 ${pp((tk / t) / (tk0 / t0) - 1)}% · 생존 ${pp(al / al0 - 1)}% (n ${sel.length})`;
}
const base = rows.length ? sum(rows.map(r => sum(r.v.base.won))) / sum(rows.map(r => r.v.base.won.length)) : 0;
const capW = rows.length ? sum(rows.map(r => sum(r.v.cap.won))) / sum(rows.map(r => r.v.cap.won.length)) : 0;
console.log(`행 ${rows.length} · 기준 승률 ${(base * 100).toFixed(1)}% · 상한 채운 기준 ${(capW * 100).toFixed(1)}%`);
console.log(`\n## 저항 없이 (기준 = base)`);
for (const X of ['fire', 'cold', 'lightning', 'poison']) console.log(`| max_${X} | ${cmp(rows, `max_${X}`, 'base')} |`);
console.log(`\n## 모든 원소 저항 상한(75%) 채우기 자체 (cap vs base)`);
console.log(`| cap | ${cmp(rows, 'cap', 'base')} |`);
console.log(`\n## 상한 채운 뒤 최대 저항 (기준 = cap) — 전체 | 상대에 그 원소 있음 | 없음`);
for (const X of ['fire', 'cold', 'lightning', 'poison']) for (const m of [1, 2, 3]) {
    const k = `cap+max_${X}x${m}`;
    const yes = rows.filter(r => hasEl(r, X)), no = rows.filter(r => !hasEl(r, X));
    console.log(`| ${X} ×${m} | ${cmp(rows, k, 'cap')} | ${cmp(yes, k, 'cap')} | ${cmp(no, k, 'cap')} |`);
}
