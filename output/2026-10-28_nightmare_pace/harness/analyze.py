"""Summarize wheel outputs: python analyze.py <tag> [x_user=1.55]
Reads out/<tag>_*.txt, prints tables (sim minutes are converted to user hours with the 10-21 ratio)."""
import glob
import json
import statistics as st
import sys
from collections import Counter, defaultdict
from pathlib import Path

tag = sys.argv[1]
X = float(sys.argv[2]) if len(sys.argv) > 2 else 1.55
OUT = Path(__file__).resolve().parent.parent / 'out'
seeds, meta = [], None
for f in sorted(glob.glob(str(OUT / f'{tag}_[0-9]*-[0-9]*.txt'))):
    try:
        d = json.loads(Path(f).read_text(encoding='utf-8'))
    except Exception:
        continue
    meta = d['meta']
    seeds += d['out']
seeds.sort(key=lambda o: o['seed'])
if not seeds:
    sys.exit('no data')
N = len(seeds)
half = {o['seed']: (0 if i < (N + 1) // 2 else 1) for i, o in enumerate(seeds)}
uh = lambda sec: sec / 3600 * X          # user hours
def q(xs, p):
    if not xs:
        return None
    s = sorted(xs)
    return s[min(len(s) - 1, int(p * (len(s) - 1) + 0.5))]
def f1(v):
    return '-' if v is None else (f'{v:.1f}' if isinstance(v, float) else str(v))
DIFFS = ['normal', 'nightmare', 'hell']
CH = lambda sid: sid // 1000
PLACE = lambda sid: f'{sid // 1000}-{sid // 10 % 100}'
CELL = lambda sid: f'{PLACE(sid)} {"I II III".split()[sid % 10 - 1] if 1 <= sid % 10 <= 3 else sid % 10}'

print(f'# {tag} — seeds {N} · bot: {meta["bot"]}')
print('assume: ' + ' / '.join(meta['assume']))
print(f'opt: {json.dumps(meta["opt"], ensure_ascii=False)} · harness ms {meta["ms"]} · user time = sim time x {X}')
print()

# 1. where each seed ended
print('## 1. where seeds end (diff · cell) — stall = 800 tries on one cell without a clear (farm runs not counted)')
end = Counter()
for o in seeds:
    s = o['stuck']
    end[('done', '') if not s else (s['diff'], CELL(s['stageId']) + (' ' + s['why'] if s['why'] != 'stall' else ''))] += 1
for (d, c), n in sorted(end.items(), key=lambda kv: (-kv[1])):
    hs = [0, 0]
    for o in seeds:
        s = o['stuck']
        k = ('done', '') if not s else (s['diff'], CELL(s['stageId']) + (' ' + s['why'] if s['why'] != 'stall' else ''))
        if k == (d, c):
            hs[half[o['seed']]] += 1
    print(f'  {d:9} {c:16} {n:3}  (halves {hs[0]} / {hs[1]})')
print()

# 2. per tier
print('## 2. per difficulty — seeds that finished it · time spent in it (user h) · party Lv / gear ilvl at its end')
print('  diff       reached finished | tier time med [q1 q3] | cum time med | Lv end med [min max] | ilvl end med | halves finished')
for d in DIFFS:
    reached = [o for o in seeds if any(t['diff'] == d for t in o['tiers'])]
    fin = [o for o in reached if next(t for t in o['tiers'] if t['diff'] == d)['t1'] is not None and not (o['stuck'] and o['stuck']['diff'] == d)]
    tt = [uh(next(t for t in o['tiers'] if t['diff'] == d)['t1'] - next(t for t in o['tiers'] if t['diff'] == d)['t0']) for o in fin]
    ct = [uh(next(t for t in o['tiers'] if t['diff'] == d)['t1']) for o in fin]
    last = lambda o: [s for s in o['stages'] if s['diff'] == d][-1]['clear']
    lv = [last(o)['lv'] for o in fin]
    il = [last(o)['ilvl'] for o in fin]
    hf = [sum(1 for o in fin if half[o['seed']] == h) for h in (0, 1)]
    print(f'  {d:10} {len(reached):3} {len(fin):3}     | {f1(q(tt, .5))} [{f1(q(tt, .25))} {f1(q(tt, .75))}] | {f1(q(ct, .5))} | {f1(q(lv, .5))} [{f1(min(lv) if lv else None)} {f1(max(lv) if lv else None)}] | {f1(q(il, .5))} | {hf[0]} / {hf[1]}')
print()

# 3. stuck detail
print('## 3. stuck seeds — party Lv vs monster Lv · gear · rounds cleared in last 50 tries (of 9 / 6)')
for o in seeds:
    s = o['stuck']
    if not s:
        continue
    g = s['gear']
    row = [x for x in o['stages'] if x['diff'] == s['diff'] and x['stageId'] == s['stageId']][-1]
    print(f'  seed {o["seed"]:3} {"/".join(c[:4] for c in o["classes"]):16} {s["diff"]:9} {CELL(s["stageId"]):9} mLv {s.get("mlv")} | party Lv {g["lv"]} | worn {g["worn"]} ilvl {g["ilvl"]} min {g["ilvlMin"]} wpn {g["wpn"]} | rar {g["rar"]} | wins on cell {row["wins"]} / {row["tries"]} (+farm {row.get("farm", 0)}) | recent rounds {row.get("recentCleared")} | at {f1(uh(s["t"]))} user h')
print()

# 4. per cell table, per diff
for d in DIFFS:
    rows = defaultdict(list)
    for o in seeds:
        for s in o['stages']:
            if s['diff'] == d:
                rows[s['stageId']].append((o, s))
    if not rows:
        continue
    print(f'## 4. {d} — per cell: seeds tried / cleared · tries per clear (med, p90) · first clear cum user h (med) · mLv · arrive Lv · arrive ilvl · clear Lv')
    for sid in sorted(rows):
        rs = rows[sid]
        cl = [s for _, s in rs if s['tClear'] is not None]
        tries = [s['tries'] for s in cl]
        print(f'  {CELL(sid):9} {len(rs):3} {len(cl):3} | tries {f1(q(tries, .5))} p90 {f1(q(tries, .9))} farm {f1(q([s.get("farm", 0) for s in cl], .5))} | at {f1(q([uh(s["tClear"]) for s in cl], .5))} h | mLv {rs[0][1].get("mlv")} | arrive Lv {f1(st.mean(s["arrive"]["lv"] for _, s in rs))} ilvl {f1(st.mean(s["arrive"]["ilvl"] for _, s in rs))} | clear Lv {f1(st.mean(s["clear"]["lv"] for s in cl) if cl else None)}')
    print()

# 5. slowest cells (share of time)
print('## 5. where the time goes — cells with the largest median share of a tier (finished tiers only)')
for d in DIFFS:
    share = defaultdict(list)
    for o in seeds:
        ts = [s for s in o['stages'] if s['diff'] == d and s['tClear'] is not None]
        tier = next((t for t in o['tiers'] if t['diff'] == d), None)
        if not tier or tier['t1'] is None or (o['stuck'] and o['stuck']['diff'] == d):
            continue
        span = tier['t1'] - tier['t0']
        for s in ts:
            share[s['stageId']].append((s['tClear'] - s['t0']) / span if span else 0)
    top = sorted(share.items(), key=lambda kv: -st.median(kv[1]))[:6]
    if top:
        print(f'  {d}: ' + ' · '.join(f'{CELL(k)} {100 * st.median(v):.0f}%' for k, v in top))
print()

# 6. weapon drought — heroes whose weapon ilvl lags the party far behind
print('## 6. weapon lag at the end — heroes whose weapon ilvl < party avg ilvl - 10 (class: count)')
lag = Counter()
for o in seeds:
    g = o['end']
    for cls, w in zip(o['classes'], g['wpn']):
        if w < g['ilvl'] - 10:
            lag[cls] += 1
print('  ' + (' · '.join(f'{k} {v}' for k, v in lag.most_common()) or 'none'))

# 7. where the party hits the level cap (avg Lv >= cap - 0.5 at a cell clear)
print()
print('## 7. level cap — first cell whose clear leaves party avg Lv >= cap-0.5 · user h at that point')
cap = meta.get('cap', 50)
hit = Counter()
hrs = []
for o in seeds:
    s = next((s for s in o['stages'] if s['clear'] and s['clear']['lv'] >= cap - 0.5), None)
    if s:
        hit[(s['diff'], CELL(s['stageId']))] += 1
        hrs.append(uh(s['tClear']))
print('  ' + ' · '.join(f'{d} {c} {n}' for (d, c), n in hit.most_common(8)) + f' | reached by {len(hrs)}/{N} · user h med {f1(q(hrs, .5))} [{f1(q(hrs, .25))} {f1(q(hrs, .75))}]')

# 8. by class — hell finished / reached hell, and deepest normal-order index
print()
print('## 8. by class present in party — seeds · finished nightmare · finished hell · median cells cleared in total')
order_cells = lambda o: sum(1 for s in o['stages'] if s['tClear'] is not None)
for cls in sorted({c for o in seeds for c in o['classes']}):
    w = [o for o in seeds if cls in o['classes']]
    fin = lambda o, d: any(t['diff'] == d and t['t1'] is not None for t in o['tiers']) and not (o['stuck'] and o['stuck']['diff'] == d)
    print(f'  {cls:8} {len(w):3} | nm {sum(fin(o, "nightmare") for o in w):3} | hell {sum(fin(o, "hell") for o in w):3} | cells {f1(q([order_cells(o) for o in w], .5))}')
