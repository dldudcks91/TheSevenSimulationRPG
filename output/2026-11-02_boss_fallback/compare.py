"""Old rule (samecell) vs new rule (fallback): same frozen source, same seeds, two hours."""
import json
import statistics as st
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
P = Path(__file__).resolve().parent / 'simulation/pilot'
BOSS = 1051


def load(arm):
    return {(r['policy'], r['seed']): r for r in (json.loads(p.read_text(encoding='utf-8')) for p in (P / arm).glob('*_seed*.json'))}


A = {'old': load('samecell'), 'new': load('fallback')}
cp = lambda r, m: next(c for c in r['checkpoints'] if c['seconds'] == m)
ch1 = lambda c: BOSS in c['cleared'] or BOSS in c['clearedIn'].get('normal', [])
score = lambda c: len(c['cleared']) + sum(len(v) for v in c['clearedIn'].values())
med = lambda xs: round(st.median(xs), 1) if xs else None


def clear_min(r):
    t = next((c['t'] for c in r['clears'] if c['stage'] == BOSS), None)
    return None if t is None else t / 60


def line(arm, policy, lo=1, hi=80):
    rs = [r for k, r in A[arm].items() if k[0] == policy and lo <= k[1] <= hi]
    out = {'n': len(rs)}
    for m, name in ((600, 'D10'), (3600, 'D60'), (7200, 'D120')):
        cs = [cp(r, m) for r in rs]
        out[name] = {'lv': med([st.median(c['levels']) for c in cs]), 'clears': med([score(c) for c in cs]), 'ch1': sum(map(ch1, cs)),
                     'runs': med([c['count']['runs'] for c in cs]), 'drops': med([c['count']['drops'] for c in cs]),
                     'gap20': sum(c['gaps']['reward']['seconds'] >= 1200 for c in cs), 'gapMax': round(max(c['gaps']['reward']['seconds'] for c in cs) / 60, 1),
                     'gapMed': round(st.median(c['gaps']['reward']['seconds'] for c in cs) / 60, 1)}
    ts = [clear_min(r) for r in rs]
    ordered = sorted(t if t is not None else 1e9 for t in ts)
    out['ch1_by_min'] = {m: sum(t is not None and t <= m for t in ts) for m in (30, 45, 60, 90, 120)}
    out['ch1_median_min'] = None if ordered[len(ordered) // 2] >= 1e9 else round(ordered[len(ordered) // 2], 1)
    tries = [sum(x['stage'] == BOSS for x in r['runs'] if clear_min(r) is None or x['t'] <= clear_min(r) * 60) for r in rs]
    out['bossTries_med'] = med(tries)
    out['guideAccounts'] = sum(r['count'].get('guideAppearances', 0) > 0 for r in rs) if 'count' in rs[0] else sum(cp(r, 7200)['count'].get('guideAppearances', 0) > 0 for r in rs)
    return out


for policy in ('basic', 'adaptive'):
    print('==', policy)
    for arm in ('old', 'new'):
        print(arm, json.dumps(line(arm, policy), ensure_ascii=False))
    for lo, hi in ((1, 40), (41, 80)):
        print(f' seeds {lo}-{hi}', 'ch1 D60/D120',
              *[f"{arm} {line(arm, policy, lo, hi)['D60']['ch1']}/{line(arm, policy, lo, hi)['D120']['ch1']} gap20@120 {line(arm, policy, lo, hi)['D120']['gap20']}" for arm in ('old', 'new')])
    # same seed paired
    for m, name in ((3600, 'D60'), (7200, 'D120')):
        d = [score(cp(A['new'][k], m)) - score(cp(A['old'][k], m)) for k in A['new'] if k[0] == policy]
        print(' paired clears', name, 'ahead/same/behind', sum(x > 0 for x in d), sum(x == 0 for x in d), sum(x < 0 for x in d), 'median', med(d))
    # boss win rate by attempt number under each rule, and what the runs in between earned
    for arm in ('old', 'new'):
        w = n = 0
        for k, r in A[arm].items():
            if k[0] != policy:
                continue
            for x in r['runs']:
                if x['stage'] == BOSS:
                    n += 1
                    w += x['won']
                    if x['won']:
                        break
        print(' boss attempts until first win', arm, f'{w}/{n}', f'{100*w/n:.0f}%' if n else '-')
print('failures', {a: sum(len(r['failures']) for r in A[a].values()) for a in A})
