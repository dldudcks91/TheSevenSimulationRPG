"""Boss 1051 probe summary -> probe_output.txt"""
import json, statistics as st, sys
from collections import Counter, defaultdict
from pathlib import Path
BASE = Path(__file__).resolve().parent
P = BASE / 'probe'; CP = BASE / 'simulation_wt/main/checkpoints'
out = []
def p(*a): out.append(' '.join(str(x) for x in a))
def med(xs): return round(st.median(xs), 3) if xs else None
acc = []
for pol in ('basic', 'adaptive'):
    skip = Counter()
    for s in range(1, 81):
        r = json.loads((P / f'boss_{pol}_seed{s}.json').read_text(encoding='utf-8'))
        if r.get('skip'): skip[r['skip']] += 1; continue
        cp = json.loads((CP / f'{pol}_seed{s}_3600.json').read_text(encoding='utf-8'))
        same = cp['levels'] == r['levels'] and 1043 in cp['cleared'] and 1051 not in cp['cleared']
        r['matchMain'] = same; acc.append(r)
    p(pol, 'at boss', sum(1 for a in acc if a['policy'] == pol), 'skip', dict(skip), 'state matches main D60', sum(a['matchMain'] for a in acc if a['policy'] == pol))

def wr(rows): rows = [x for x in rows if 'won' in x]; return sum(x['won'] for x in rows) / len(rows)
p('\n## per-account win rate, as-is (40 fights each)')
for pol in ('basic', 'adaptive', 'all'):
    A = [a for a in acc if pol == 'all' or a['policy'] == pol]
    w = [wr(a['variants']['0']) for a in A]
    m = st.mean(w); obs = st.pvariance(w); binom = m * (1 - m) / 40
    hist = Counter('0%' if x == 0 else '<=10%' if x <= .10 else '<=25%' if x <= .25 else '<=50%' if x <= .5 else '>50%' for x in w)
    p(pol, 'n', len(A), 'mean', round(m, 3), 'median', med(w), 'hist', dict(hist), '| between-account var share', round(max(0, obs - binom) / obs, 2) if obs else None)

p('\n## level raised (same gear) — mean win rate')
for pol in ('basic', 'adaptive', 'all'):
    A = [a for a in acc if pol == 'all' or a['policy'] == pol]
    p(pol, {k: round(st.mean(wr(a['variants'][k]) for a in A), 3) for k in ('0', '3', '6')},
      'accounts improved +6', sum(wr(a['variants']['6']) > wr(a['variants']['0']) + 0.1 for a in A), '/', len(A),
      'still <=10% at +6', sum(wr(a['variants']['6']) <= 0.10 for a in A))

p('\n## fight shape (as-is, all accounts)')
rows = [x for a in acc for x in a['variants']['0'] if 'won' in x]
W = [x for x in rows if x['won']]; L = [x for x in rows if not x['won']]
p('fights', len(rows), 'won', len(W), 'sec won/lost', med([x['sec'] for x in W]), med([x['sec'] for x in L]))
p('lost: escorts killed', dict(Counter(x['escortsKilled'] for x in L)), '| reached boss', sum(x['reachedBoss'] is not None for x in L), '/', len(L))
p('lost: boss HP left (of those that reached it) median', med([x['bossLeftPct'] for x in L if x['reachedBoss'] is not None]),
  '| boss <25% left', sum(x['bossLeftPct'] < .25 for x in L), '| boss untouched', sum(x['bossLeftPct'] >= .999 for x in L))
p('reached boss at sec: won/lost', med([x['reachedBoss'] for x in W if x['reachedBoss'] is not None]), med([x['reachedBoss'] for x in L if x['reachedBoss'] is not None]))
p('party miss rate won/lost', med([x['partyMiss'] / max(1, x['partySwings']) for x in W]), med([x['partyMiss'] / max(1, x['partySwings']) for x in L]))
p('party hero hp median', med([h for x in rows for h in x['heroHp']]))
for s in ('mag_inferno', 'mon_hellfire'):
    c1 = [x['casts'][s][0] for x in rows if x['casts'].get(s)]
    allc = [c for x in rows for c in x['casts'].get(s, [])]
    p(s, 'first cast sec median', med([c['t'] for c in c1]), '| dmg per cast median', med([c['dmg'] for c in allc]),
      'p10~p90', [round(q) for q in st.quantiles([c['dmg'] for c in allc], n=10)][::8], '| casts per fight won/lost', med([len(x['casts'].get(s, [])) for x in W]), med([len(x['casts'].get(s, [])) for x in L]))
    p('   first-cast dmg won/lost', med([x['casts'][s][0]['dmg'] for x in W if x['casts'].get(s)]), med([x['casts'][s][0]['dmg'] for x in L if x['casts'].get(s)]))
p('first hero down sec: lost', med([next(d['t'] for d in x['downs'] if d['who'] not in ('boss', 'escort')) for x in L]),
  '| won with 0 hero downs', sum(not any(d['who'] not in ('boss', 'escort') for d in x['downs']) for x in W), '/', len(W))
p('first hero down class (lost)', dict(Counter(next(d['who'] for d in x['downs'] if d['who'] not in ('boss', 'escort')) for x in L)))

p('\n## same account: wins vs losses (accounts with 4..36 wins of 40)')
mixed = [a for a in acc if 4 <= sum(x.get('won', 0) for x in a['variants']['0']) <= 36]
diff = defaultdict(list)
for a in mixed:
    R = a['variants']['0']; w = [x for x in R if x['won']]; l = [x for x in R if not x['won']]
    f = {'inferno1': lambda x: x['casts']['mag_inferno'][0]['dmg'] if x['casts'].get('mag_inferno') else 0,
         'hellfire1': lambda x: x['casts']['mon_hellfire'][0]['dmg'] if x['casts'].get('mon_hellfire') else 0,
         'missRate': lambda x: x['partyMiss'] / max(1, x['partySwings']), 'crits': lambda x: x['crit'],
         'reachBoss': lambda x: x['reachedBoss'] if x['reachedBoss'] is not None else 60}
    for k, fn in f.items(): diff[k].append((st.mean(map(fn, w)), st.mean(map(fn, l))))
p('mixed accounts', len(mixed))
for k, v in diff.items(): p(f'  {k:10s} win {med([a for a, _ in v])} | loss {med([b for _, b in v])}')

p('\n## account traits vs win rate (as-is)')
def g(f):
    A = [a for a in acc if f(a)]; return f"{round(st.mean(wr(a['variants']['0']) for a in A), 3) if A else '-'} (n{len(A)})"
for label, f in [('archer', lambda a: 'archer' in a['classes']), ('no archer', lambda a: 'archer' not in a['classes']),
                 ('priest', lambda a: 'priest' in a['classes']), ('no priest', lambda a: 'priest' not in a['classes']),
                 ('mage', lambda a: 'mage' in a['classes']), ('warrior', lambda a: 'warrior' in a['classes']), ('knight', lambda a: 'knight' in a['classes'])]:
    p(f'{label:10s}', g(f))
lv = sorted(acc, key=lambda a: st.median(a['levels']))
p('by party median level', {L: g(lambda a, L=L: st.median(a['levels']) == L) for L in sorted({st.median(a['levels']) for a in acc})})
mt = sorted(acc, key=lambda a: sum(h['might'] for h in a['gear']))
q = len(mt) // 4
p('by party might quartile (low->high)', [round(st.mean(wr(a['variants']['0']) for a in mt[i * q:(i + 1) * q if i < 3 else None]), 3) for i in range(4)])

text = '\n'.join(out)
(BASE / 'probe_output.txt').write_text(text, encoding='utf-8')
sys.stdout.buffer.write(text.encode('utf-8'))
