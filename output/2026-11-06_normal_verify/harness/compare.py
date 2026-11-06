"""갈래 나란히 — python compare.py > out/compare.md
B = 11-04 의 「+ 앞 칸 파밍」 갈래(같은 시드 · 같은 소스 — 시드 1 ~ 20 바이트 일치 확인) · 나머지는 이 폴더 out/.
짝 비교 = 같은 시드끼리 노말 끝 시간의 비(갈래 ÷ 대조)."""
import glob, json, math, sys
from collections import defaultdict
from pathlib import Path
HERE = Path(__file__).resolve().parent
OUT = HERE.parent / 'out'
OLD = HERE.parents[1] / '2026-11-04_normal_pace' / 'out'
INF = math.inf
NAMES = {'warrior': '전사', 'knight': '기사', 'archer': '궁수', 'mage': '마법사', 'priest': '사제'}

def load(tag, d):
    rows, meta = [], None
    for f in glob.glob(str(d / f'{tag}_*-*.txt')):
        t = Path(f).read_text(encoding='utf-8').strip()
        if not t: continue
        j = json.loads(t); meta = meta or j['meta']; rows += j['rows']
    rows.sort(key=lambda r: r['seed'])
    for r in rows: r['cm'] = {c['id']: c for c in r['cells']}
    return rows, meta

TAGS = [('B', OLD, '11-04 앞 칸 파밍 (물약 = 남은 골드 전부)'), ('P', OUT, 'B + 물약 재고 60 까지만 (대조)'),
        ('S', OUT, 'P + 상단 장비 (실제 골드)'), ('U', OUT, 'B + 늘 +6강 (비용 무시)'), ('SU', OUT, 'P + 상단 + 늘 +6강')]
DATA = {}
for t, d, nm in TAGS:
    rows, meta = load(t, d)
    if rows: DATA[t] = (rows, meta, nm)
order = next(iter(DATA.values()))[1]['order']
ends = [o for o in order if o % 100 == 51]
END = ends[-1]

def q(xs, p):
    xs = sorted(xs)
    if not xs: return None
    k = (len(xs) - 1) * p; lo, hi = math.floor(k), math.ceil(k)
    if xs[hi] == INF: return INF if (k - lo > 0 or xs[lo] == INF) else xs[lo]
    return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)
med = lambda xs: q(xs, .5)
def cum(r, sid):
    c = r['cm'].get(sid)
    return c['ec'] if c and c.get('ec') is not None else INF
def h(v, nd=1): return '-' if v is None else ('못 닿음' if v == INF else f'{v / 3600:.{nd}f}')
def m(v, nd=0): return '-' if v is None else ('못 닿음' if v == INF else f'{v / 60:.{nd}f}')
def stay(r, sids):
    c0 = r['cm'].get(sids[0])
    if c0 is None: return None
    cl = r['cm'].get(sids[-1])
    return INF if cl is None or cl.get('ec') is None else cl['ec'] - c0['e0']
S52 = [s for s in order if s // 10 == 502]
p = print
p('## 노말 끝 (원정 플레이 시간 h)\n')
p('| 갈래 | 시드 | 완주 | 중앙 | p25 ~ p75 | p10 ~ p90 | 절반 앞 / 뒤 | 4h 안 (앞 / 뒤) | 끝 Lv | 끝 착용 ilvl |')
p('|---|---:|---:|---:|---|---|---|---|---:|---:|')
for t, (rows, meta, nm) in DATA.items():
    xs = [cum(r, END) for r in rows]; n = len(rows); hf = n // 2
    a, b = xs[:hf], xs[hf:]
    w4 = lambda ys: f'{round(100 * sum(1 for y in ys if y <= 4 * 3600) / len(ys))}%'
    p(f'| {t} {nm} | {n} | {sum(r["done"] for r in rows)} | **{h(med(xs))}** | {h(q(xs, .25))} ~ {h(q(xs, .75))} | {h(q(xs, .1))} ~ {h(q(xs, .9))} | {h(med(a))} / {h(med(b))} | {w4(xs)} ({w4(a)} / {w4(b)}) | '
      f'{med([r["lv"] for r in rows if r["done"]])} | {med([r["ilvl"] for r in rows if r["done"]])} |')
p('\n## 장 끝 누적 중앙 h\n')
p('| 갈래 | ' + ' | '.join(f'{e // 1000}장' for e in ends) + ' | 5-2 머문 분 (절반 앞 / 뒤) | 5-2 I 첫 도전 승 | 5-2 I 도전 중앙 / p90 | 5-2 를 뺀 노말 끝 h |')
p('|---|' + '---:|' * len(ends) + '---|---:|---|---:|')
for t, (rows, meta, nm) in DATA.items():
    hf = len(rows) // 2
    st52 = lambda rs: [v for v in (stay(r, S52) for r in rs) if v is not None]
    c1 = [r['cm'][S52[0]] for r in rows if S52[0] in r['cm']]
    fw = [c['first'] for c in c1 if c.get('first') is not None]
    tr = [c['tries'] for c in c1]
    wo = [cum(r, END) - stay(r, S52) for r in rows if cum(r, END) != INF and stay(r, S52) not in (None, INF)]
    p(f'| {t} | ' + ' | '.join(h(med([cum(r, e) for r in rows])) for e in ends) +
      f' | {m(med(st52(rows)), 1)} ({m(med(st52(rows[:hf])), 1)} / {m(med(st52(rows[hf:])), 1)}) | {round(100 * sum(fw) / len(fw))}% | {med(tr)} / {q(tr, .9):.0f} | {h(med(wo), 2)} |')
p('\n## 사제 있음 / 없음 — 노말 끝 중앙 h (절반 앞 / 뒤)\n')
p('| 갈래 | 사제 없음 | 사제 있음 | 배 |')
p('|---|---|---|---:|')
for t, (rows, meta, nm) in DATA.items():
    hf = rows[len(rows) // 2 - 1]['seed']
    def g(f):
        rs = [r for r in rows if f(r)]
        return med([cum(r, END) for r in rs]), med([cum(r, END) for r in rs if r['seed'] <= hf]), med([cum(r, END) for r in rs if r['seed'] > hf])
    no, ye = g(lambda r: 'priest' not in r['cls']), g(lambda r: 'priest' in r['cls'])
    p(f'| {t} | {h(no[0])} ({h(no[1])} / {h(no[2])}) | {h(ye[0])} ({h(ye[1])} / {h(ye[2])}) | {ye[0] / no[0]:.2f} |')
p('\n## 짝 비교 — 같은 시드의 노말 끝 비 (갈래 ÷ 대조) · 1 보다 작으면 빨라짐\n')
p('| 갈래 ÷ 대조 | 짝 | 비 중앙 (절반 앞 / 뒤) | 비 p25 ~ p75 | 빨라진 시드 | 느려진 시드 |')
p('|---|---:|---|---|---:|---:|')
for t, c in [('P', 'B'), ('S', 'P'), ('U', 'B'), ('SU', 'P'), ('SU', 'U')]:
    if t not in DATA or c not in DATA: continue
    ci = {r['seed']: r for r in DATA[c][0]}
    pr = [(r['seed'], cum(r, END), cum(ci[r['seed']], END)) for r in DATA[t][0] if r['seed'] in ci]
    rat = [(s, x / y) for s, x, y in pr if x != INF and y != INF]
    hf = len(pr) // 2; cut = pr[hf - 1][0]
    rr = [v for _, v in rat]
    p(f'| {t} ÷ {c} | {len(pr)} | {med(rr):.2f} ({med([v for s, v in rat if s <= cut]):.2f} / {med([v for s, v in rat if s > cut]):.2f}) | {q(rr, .25):.2f} ~ {q(rr, .75):.2f} | '
      f'{sum(1 for v in rr if v < 0.98)} | {sum(1 for v in rr if v > 1.02)} |')
p('\n## 시간이 몰린 칸 (시드 합의 몫 · 상위 5)\n')
for t, (rows, meta, nm) in DATA.items():
    tot = defaultdict(float)
    for r in rows:
        for c in r['cells']:
            if c.get('ec') is not None: tot[c['id']] += c['ec'] - c['e0']
    s = sum(tot.values())
    lab = lambda sid: f'{sid // 1000}-{(sid // 10) % 100} ' + (['', 'I', 'II', 'III'][sid % 10] if (sid // 10) % 100 < 5 else '보스')
    p(f'- {t}: ' + ' · '.join(f'{lab(k)} {100 * v / s:.1f}%' for k, v in sorted(tot.items(), key=lambda kv: -kv[1])[:5]))
p('\n## 막힘 · 기능 횟수 (시드당 중앙)\n')
for t, (rows, meta, nm) in DATA.items():
    st = defaultdict(int)
    for r in rows:
        if r['stuck']: st[(r['stuck']['stageId'], r['stuck']['why'])] += 1
    keys = ['potionUsed', 'shopBuy', 'shopWeapon', 'shopGold', 'shopReroll', 'shopUnused', 'shopFail', 'farm', 'fallback']
    per = ' · '.join(f'{k} {med([r["cnt"].get(k, 0) for r in rows])}' for k in keys if any(r['cnt'].get(k) for r in rows))
    p(f'- {t}: 막힘 {sum(st.values())} ' + (('(' + ' · '.join(f'{k[0]} {k[1]} {v}' for k, v in st.items()) + ')') if st else '') + f' · 판 수 중앙 {med([r["runs"] for r in rows])} · {per}')
p('\n## 갈래 정의 (meta.bot)\n')
for t, (rows, meta, nm) in DATA.items():
    p(f'- **{t}** — {meta["bot"]} · 길: {meta["route"]} · 가정: {" / ".join(meta["assume"])}')
