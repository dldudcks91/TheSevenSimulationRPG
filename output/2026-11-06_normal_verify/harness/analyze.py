"""노말 칸별 집계 — python analyze.py <tag> → out/<tag>_summary.txt · out/<tag>_cells.json
시간 단위: e = 원정 플레이 시간(판 재생 시각 합 · 상단바 셈) · t = 재출발 5초 포함. 못 닿은 칸은 무한대로 셈(중앙값이 그 시드를 「느린 쪽」으로 센다)."""
import glob, json, math, statistics as st, sys
from collections import defaultdict
from pathlib import Path
OUT = Path(__file__).resolve().parent.parent / 'out'
tag = sys.argv[1]
rows, meta = [], None
for f in sorted(glob.glob(str(OUT / f'{tag}_*-*.txt'))):
    txt = Path(f).read_text(encoding='utf-8').strip()
    if not txt: continue
    d = json.loads(txt)
    meta = meta or d['meta']
    rows += d['rows']
rows.sort(key=lambda r: r['seed'])
order = meta['order']
INF = math.inf
NAMES = {'warrior': '전사', 'knight': '기사', 'archer': '궁수', 'mage': '마법사', 'priest': '사제'}
def label(sid):
    ch, sn, cell = sid // 1000, (sid // 10) % 100, sid % 10
    return f'{ch}-{sn} ' + (['', 'I', 'II', 'III'][cell] if sn < 5 else '보스')
def comp(r): return ' + '.join(NAMES[c] for c in sorted(r['cls'], key=lambda c: list(NAMES).index(c)))
def q(xs, p):
    xs = sorted(xs)
    if not xs: return None
    k = (len(xs) - 1) * p
    lo, hi = math.floor(k), math.ceil(k)
    if xs[lo] == INF or xs[hi] == INF: return INF if xs[hi] == INF and (k - lo > 0 or xs[lo] == INF) else xs[lo]
    return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)
def med(xs): return q(xs, 0.5)
def fm(v, unit=60, nd=0):
    if v is None: return '-'
    if v == INF: return '못 닿음'
    return f'{v / unit:.{nd}f}'
def cellmap(r): return {c['id']: c for c in r['cells']}
CM = {r['seed']: cellmap(r) for r in rows}
def cum(r, sid, key='ec'):
    c = CM[r['seed']].get(sid)
    return c[key] if c and c.get(key) is not None else INF
def spent(r, sid):
    c = CM[r['seed']].get(sid)
    if not c: return None           # 못 닿음 — 칸 체류 시간에서는 뺀다
    if c.get('ec') is None: return INF
    return c['ec'] - c['e0']
halves = [rows[:len(rows) // 2], rows[len(rows) // 2:]]
L = []
p = L.append
p(f'# {tag} — {len(rows)}시드 ({rows[0]["seed"]} ~ {rows[-1]["seed"]}) · 노말 완주 {sum(r["done"] for r in rows)} · 막힘 {sum(1 for r in rows if r["stuck"])}')
p(f'bot: {meta["bot"]}')
p(f'route: {meta["route"]}')
p(f'assume: {" / ".join(meta["assume"])}')
p(f'opt: {json.dumps(meta["opt"] | {"seeds": None}, ensure_ascii=False)}')
stuck = defaultdict(int)
for r in rows:
    if r['stuck']: stuck[(label(r['stuck']['stageId']), r['stuck']['why'])] += 1
if stuck: p('막힌 칸: ' + ' · '.join(f'{k[0]} {k[1]} {v}' for k, v in sorted(stuck.items(), key=lambda x: -x[1])))
cnt = defaultdict(float)
for r in rows:
    for k, v in r['cnt'].items(): cnt[k] += v
p('기능 횟수(합): ' + ' · '.join(f'{k} {int(v)}' for k, v in cnt.items()))
p('')
# 1 — 노말 끝 · 장 끝 누적
ends = [o for o in order if o % 100 == 51]
p('## 누적 — 새 게임부터 그 칸을 깬 때 (원정 플레이 시간 · 시간 h · 중앙 [사분위] · 절반 둘)')
p('| 칸 | 중앙 h | p25 ~ p75 | p10 ~ p90 | 절반 앞 / 뒤 | 재출발 포함 중앙 h | 깬 Lv 중앙 |')
p('|---|---:|---|---|---|---:|---:|')
for sid in ends:
    xs = [cum(r, sid) for r in rows]
    lv = [CM[r['seed']][sid]['lvC'] for r in rows if sid in CM[r['seed']] and CM[r['seed']][sid].get('lvC') is not None]
    p(f'| {label(sid)} | {fm(med(xs), 3600, 1)} | {fm(q(xs, .25), 3600, 1)} ~ {fm(q(xs, .75), 3600, 1)} | {fm(q(xs, .1), 3600, 1)} ~ {fm(q(xs, .9), 3600, 1)} | '
      f'{fm(med([cum(r, sid) for r in halves[0]]), 3600, 1)} / {fm(med([cum(r, sid) for r in halves[1]]), 3600, 1)} | {fm(med([cum(r, sid, "tc") for r in rows]), 3600, 1)} | {med(lv) if lv else "-"} |')
p('')
# 2 — 스테이지(3칸) 단위
p('## 스테이지별 — 그 스테이지(3칸 · 보스는 1칸)에 머문 시간과 누적 (원정 플레이 시간 · 분)')
p('| 스테이지 | 머문 시간 중앙 분 | p25 ~ p75 | p90 | 절반 앞 / 뒤 | 누적 중앙 분 | 누적 절반 앞 / 뒤 | 깬 Lv 중앙 | 첫 도전 승(칸별) |')
p('|---|---:|---|---:|---|---:|---|---:|---|')
stages = []
for sid in order:
    key = sid // 10
    if not stages or stages[-1][0] != key: stages.append((key, []))
    stages[-1][1].append(sid)
cell_rows = []
for key, sids in stages:
    def stay(r):
        cs = [CM[r['seed']].get(s) for s in sids]
        if cs[0] is None: return None
        if any(c is None or c.get('ec') is None for c in cs): return INF
        return cs[-1]['ec'] - cs[0]['e0']
    xs = [v for v in (stay(r) for r in rows) if v is not None]
    hs = [[v for v in (stay(r) for r in h) if v is not None] for h in halves]
    last = sids[-1]
    cu = [cum(r, last) for r in rows]
    lv = [CM[r['seed']][last]['lvC'] for r in rows if last in CM[r['seed']] and CM[r['seed']][last].get('lvC') is not None]
    ft = []
    for s in sids:
        f = [CM[r['seed']][s]['first'] for r in rows if s in CM[r['seed']] and CM[r['seed']][s].get('first') is not None]
        ft.append(f'{round(100 * sum(f) / len(f))}%' if f else '-')
    nm = f'{key // 100}-{key % 100}' + (' 보스' if key % 100 == 5 else '')
    p(f'| {nm} | {fm(med(xs), 60, 1)} | {fm(q(xs, .25), 60, 1)} ~ {fm(q(xs, .75), 60, 1)} | {fm(q(xs, .9), 60, 0)} | {fm(med(hs[0]), 60, 1)} / {fm(med(hs[1]), 60, 1)} | '
      f'{fm(med(cu), 60, 0)} | {fm(med([cum(r, last) for r in halves[0]]), 60, 0)} / {fm(med([cum(r, last) for r in halves[1]]), 60, 0)} | {med(lv) if lv else "-"} | {" · ".join(ft)} |')
p('')
# 3 — 칸(65) 단위 — json 으로도
p('## 칸별 (65칸) — 머문 시간 중앙 분 · 평균 분 · 누적 중앙 분 · 도전 수 중앙 / p90 · 앞 칸 판 평균 · 첫 도전 승')
p('| 칸 | 머문 중앙 | 머문 평균 | p90 | 누적 중앙 | 도전 중앙 / p90 | 앞 칸 판 평균 | 첫 도전 승 | 도착 Lv 중앙 |')
p('|---|---:|---:|---:|---:|---|---:|---:|---:|')
for sid in order:
    xs = [v for v in (spent(r, sid) for r in rows) if v is not None]
    fin = [v for v in xs if v != INF]
    cs = [CM[r['seed']][sid] for r in rows if sid in CM[r['seed']]]
    tr = [c['tries'] for c in cs]
    sd = [c['side'] for c in cs]
    f = [c['first'] for c in cs if c.get('first') is not None]
    lva = [c['lvA'] for c in cs]
    cu = [cum(r, sid) for r in rows]
    rec = {'id': sid, 'label': label(sid), 'stay_med_min': None if med(xs) in (None, INF) else round(med(xs) / 60, 2), 'stay_mean_min': round(st.mean(fin) / 60, 2) if fin else None,
           'cum_med_min': None if med(cu) == INF else round(med(cu) / 60, 1), 'first_win': round(sum(f) / len(f), 3) if f else None, 'n': len(cs)}
    cell_rows.append(rec)
    p(f'| {label(sid)} | {fm(med(xs), 60, 1)} | {fm(st.mean(fin) if fin else None, 60, 1)} | {fm(q(xs, .9), 60, 0)} | {fm(med(cu), 60, 0)} | {med(tr)} / {q(tr, .9):.0f} | {st.mean(sd):.1f} | {round(100 * sum(f) / len(f)) if f else "-"}% | {med(lva)} |')
p('')
# 4 — 시작 조합별
p('## 시작 조합별 — 장 끝 누적 중앙 h (원정 플레이 시간) · 절반 앞 / 뒤는 노말 끝')
p('| 조합 | 시드 | 1장 끝 | 2장 끝 | 3장 끝 | 4장 끝 | 노말 끝 | 노말 끝 p25 ~ p75 | 노말 끝 절반 앞 / 뒤 | 막힘 |')
p('|---|---:|---:|---:|---:|---:|---:|---|---|---:|')
by = defaultdict(list)
for r in rows: by[comp(r)].append(r)
def row_for(name, rs):
    hs = [[r for r in rs if r['seed'] <= rows[len(rows) // 2 - 1]['seed']], [r for r in rs if r['seed'] > rows[len(rows) // 2 - 1]['seed']]]
    cells = ' | '.join(fm(med([cum(r, s) for r in rs]), 3600, 1) for s in ends)
    last = ends[-1]
    xs = [cum(r, last) for r in rs]
    return (f'| {name} | {len(rs)} | {cells} | {fm(q(xs, .25), 3600, 1)} ~ {fm(q(xs, .75), 3600, 1)} | {fm(med([cum(r, last) for r in hs[0]]), 3600, 1)} / {fm(med([cum(r, last) for r in hs[1]]), 3600, 1)} | {sum(1 for r in rs if r["stuck"])} |')
for name, rs in sorted(by.items(), key=lambda kv: med([cum(r, ends[-1]) for r in kv[1]])):
    p(row_for(name, rs))
p(row_for('**사제 있음**', [r for r in rows if 'priest' in r['cls']]))
p(row_for('**사제 없음**', [r for r in rows if 'priest' not in r['cls']]))
p(row_for('**전체**', rows))
p('')
# 5 — 직업 하나 있음 / 없음
p('## 직업 있음 / 없음 — 노말 끝 누적 중앙 h')
for c, nm in NAMES.items():
    a = [cum(r, ends[-1]) for r in rows if c in r['cls']]
    b = [cum(r, ends[-1]) for r in rows if c not in r['cls']]
    p(f'- {nm} 있음 {fm(med(a), 3600, 1)} ({len(a)}) ↔ 없음 {fm(med(b), 3600, 1)} ({len(b)})')
# 6 — 고유(innate)별 노말 끝
inn = defaultdict(list)
for r in rows:
    for i in r['innate']: inn[i].append(cum(r, ends[-1]))
p('')
p('## 고유가 든 파티의 노말 끝 누적 중앙 h (시드 수)')
p(' · '.join(f'{k} {fm(med(v), 3600, 1)}({len(v)})' for k, v in sorted(inn.items(), key=lambda kv: med(kv[1]))))
# 7 — 시간이 몰린 칸
p('')
tot = defaultdict(float)
for r in rows:
    for c in r['cells']:
        if c.get('ec') is not None: tot[c['id']] += c['ec'] - c['e0']
allsum = sum(tot.values())
p('## 시간이 몰린 칸 (전체 시드 합 기준 몫) — ' + ' · '.join(f'{label(k)} {100 * v / allsum:.1f}%' for k, v in sorted(tot.items(), key=lambda kv: -kv[1])[:10]))
# 8 — 노말 끝 분포
xs = sorted(cum(r, ends[-1]) for r in rows)
p('노말 끝 분포 h — ' + ' · '.join(f'p{int(k * 100)} {fm(q(xs, k), 3600, 1)}' for k in (.05, .1, .25, .5, .75, .9, .95)) + f' · 최장 {fm(max(x for x in xs if x != INF), 3600, 1)}')
for lim in (4, 6, 8, 12, 24):
    p(f'  {lim}h 안 노말 끝: {sum(1 for x in xs if x <= lim * 3600)}/{len(xs)}')
p(f'끝 Lv 중앙 {med([r["lv"] for r in rows if r["done"]])} · 끝 착용 아이템 레벨 중앙 {med([r["ilvl"] for r in rows if r["done"]])} · 판 수 중앙 {med([r["runs"] for r in rows])}')
(OUT / f'{tag}_summary.txt').write_text('\n'.join(L), encoding='utf-8')
(OUT / f'{tag}_cells.json').write_text(json.dumps(cell_rows, ensure_ascii=False), encoding='utf-8')
print('\n'.join(L))
