/** 집계 — node analyze.mjs <prefix>  (../out/<prefix>_*.jsonl) → 표준 출력 + ../out/<prefix>_summary.md
 *  승률 = 그 방식 팀이 세기 팀을 이긴 비율(무승부는 반) · 95% 구간은 판(trial) 단위 부트스트랩(같은 판 안의 결투는 서로 묶여 있다) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUTD = path.resolve(HERE, '../out');
const prefix = process.argv[2] ?? 'main';
const rows = fs.readdirSync(OUTD).filter(f => f.startsWith(prefix + '_') && f.endsWith('.jsonl'))
    .flatMap(f => fs.readFileSync(path.join(OUTD, f), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)));
const names = Object.keys(rows[0].v);
const pct = x => (x * 100).toFixed(1);

let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
function stat(rs, name) {
    const per = rs.map(r => r.v[name]).filter(Boolean);
    const sc = per.map(v => (v.win + v.draw / 2) / v.n);
    const mean = sc.reduce((a, b) => a + b, 0) / sc.length;
    const boots = [];
    for (let b = 0; b < 400; b++) { let s = 0; for (let i = 0; i < sc.length; i++) s += sc[Math.floor(rnd() * sc.length)]; boots.push(s / sc.length); }
    boots.sort((a, b) => a - b);
    const same = per.reduce((a, v) => a + v.same, 0) / per.length;
    const mr = per.reduce((a, v) => a + v.mr, 0) / per.length;
    const fights = per.reduce((a, v) => a + v.n, 0);
    return { mean, lo: boots[10], hi: boots[389], same, mr, fights, trials: per.length };
}

const lines = [];
const say = s => { lines.push(s); console.log(s); };
say(`# 자동 장착 백테스트 — ${rows.length} 판 구성\n`);
say('## 전체 — 세기 팀 상대 승률\n');
say('| 방식 | 승률 | 95% 구간 | 세기와 같은 칸 | 세기 합 대비 |');
say('|---|---|---|---|---|');
const all = names.map(n => [n, stat(rows, n)]).sort((a, b) => b[1].mean - a[1].mean);
for (const [n, s] of all) say(`| ${n} | ${pct(s.mean)}% | ${pct(s.lo)} ~ ${pct(s.hi)} | ${pct(s.same)}% | ${pct(s.mr)}% |`);
say(`\n결투 수(방식마다) ${all[0][1].fights} · 판 구성 ${all[0][1].trials}\n`);

const by = (label, keyFn, keys) => {
    say(`## ${label}별 승률\n`);
    say(`| 방식 | ${keys.join(' | ')} |`);
    say(`|---|${keys.map(() => '---').join('|')}|`);
    for (const [n] of all) say(`| ${n} | ${keys.map(k => pct(stat(rows.filter(r => keyFn(r) === k), n).mean) + '%').join(' | ')} |`);
    say('');
};
const tiers = [...new Set(rows.map(r => r.tier))];
by('등급(레벨)', r => r.tier, tiers);
by('가방 크기', r => String(r.N), [...new Set(rows.map(r => String(r.N)))]);
by('희귀도 분포', r => r.mode, [...new Set(rows.map(r => r.mode))]);
fs.writeFileSync(path.join(OUTD, `${prefix}_summary.md`), lines.join('\n') + '\n', 'utf8');
