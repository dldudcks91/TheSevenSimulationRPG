"""Second pass: survivorship-free stage difficulty, loss rounds, boss by level, 2-hour horizon, merchant variant."""
import json
import sys
import statistics as st
from collections import Counter, defaultdict
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
BASE = Path(__file__).resolve().parent.parent
P = BASE / 'simulation/pilot'


def load(folder):
    return {(r['policy'], r['seed']): r for r in (json.loads(p.read_text(encoding='utf-8')) for p in folder.glob('*_seed*.json'))}


ALL = {**load(P), **load(P / 'ext80')}
ALL = {k: v for k, v in ALL.items() if k[0] != 'passive'}
H2 = load(P / 'h2')
SHOP = load(P / 'shop') if (P / 'shop').exists() else {}
med = lambda xs: round(st.median(xs), 2) if xs else None
pct = lambda a, b: f'{a}/{b} ({100*a/b:.0f}%)' if b else '-'
cp = lambda r, m: next(c for c in r['checkpoints'] if c['seconds'] == m)
ch1 = lambda c: 1051 in c['cleared'] or 1051 in c['clearedIn'].get('normal', [])
score = lambda c: len(c['cleared']) + sum(len(v) for v in c['clearedIn'].values())


def first(r, s):
    return next((x for x in r['runs'] if x['stage'] == s), None)


print('=== 1. same accounts: first try on a stage vs the next segment (no survivorship) ===')
for policy in ('basic', 'adaptive'):
    rs = [r for k, r in ALL.items() if k[0] == policy]
    for a, b in ((1033, 1041), (1032, 1041), (1023, 1031), (1013, 1021), (1043, 1051), (1051, 2011)):
        pair = [(first(r, a), first(r, b)) for r in rs if first(r, a) and first(r, b)]
        A = sum(x['won'] for x, _ in pair)
        B = sum(y['won'] for _, y in pair)
        half = [(first(r, a), first(r, b)) for r in rs if first(r, a) and first(r, b) and r['seed'] <= 40]
        half2 = [(first(r, a), first(r, b)) for r in rs if first(r, a) and first(r, b) and r['seed'] > 40]
        print(policy, a, '->', b, 'n', len(pair), 'firstwin', pct(A, len(pair)), '->', pct(B, len(pair)),
              '| half1', sum(x['won'] for x, _ in half), sum(y['won'] for _, y in half), '/', len(half),
              '| half2', sum(x['won'] for x, _ in half2), sum(y['won'] for _, y in half2), '/', len(half2))

print('\n=== 2. where runs end: rounds cleared on losses (all attempts) ===')
for s in (1013, 1023, 1031, 1032, 1033, 1041, 1043, 1051, 2011):
    xs = [x for k, r in ALL.items() for x in r['runs'] if x['stage'] == s and not x['won']]
    c = Counter(x['roundsCleared'] for x in xs)
    print(s, 'losses', len(xs), 'timeouts', sum(x['reason'] == 'timeout' for x in xs), 'rounds', dict(sorted(c.items())), 'lostWall_med', med([x['wallSec'] for x in xs]), 'combat_med', med([x['combatSec'] for x in xs]))

print('\n=== 3. boss 1051: win rate by party median level (first attempt at each level per account) ===')


def levels_over_time(r):
    lv = {}
    start = 1
    ev = sorted((e for e in r['events'] if e['kind'] == 'levelUp'), key=lambda e: e['t'])
    return ev


for policy in ('basic', 'adaptive'):
    by = defaultdict(lambda: [0, 0]); byall = defaultdict(lambda: [0, 0])
    for k, r in ALL.items():
        if k[0] != policy:
            continue
        ev = levels_over_time(r)
        seen = set()
        for x in r['runs']:
            if x['stage'] != 1051:
                continue
            cur = {}
            for e in ev:
                if e['t'] <= x['start']:
                    cur[e['hero']] = e['to']
            ls = sorted(cur.values()) or [1]
            lv = ls[len(ls)//2]
            byall[lv][0] += x['won']; byall[lv][1] += 1
            if lv not in seen:
                seen.add(lv); by[lv][0] += x['won']; by[lv][1] += 1
            if x['won']:
                break
    print(policy, 'first at level', {l: f'{a}/{b}' for l, (a, b) in sorted(by.items())})
    print(policy, 'all attempts  ', {l: f'{a}/{b}' for l, (a, b) in sorted(byall.items())})

print('\n=== 4. boss attempts: win chance by attempt number (until first win) ===')
for policy in ('basic', 'adaptive'):
    w = Counter(); n = Counter()
    for k, r in ALL.items():
        if k[0] != policy:
            continue
        i = 0
        for x in r['runs']:
            if x['stage'] != 1051:
                continue
            i += 1
            b = i if i <= 5 else ('6-10' if i <= 10 else '11+')
            n[b] += 1; w[b] += x['won']
            if x['won']:
                break
    print(policy, {str(b): f'{w[b]}/{n[b]}' for b in (1, 2, 3, 4, 5, '6-10', '11+')})

print('\n=== 5. composition, both halves, with vs without (D60 ch1) ===')
for policy in ('basic', 'adaptive'):
    rs = [r for k, r in ALL.items() if k[0] == policy]
    for name, f in (('archer', lambda c: 'archer' in c), ('mage+priest', lambda c: 'mage' in c and 'priest' in c), ('warrior', lambda c: 'warrior' in c), ('knight', lambda c: 'knight' in c)):
        out = []
        for lo, hi in ((1, 40), (41, 80)):
            q = [r for r in rs if lo <= r['seed'] <= hi]
            y = [r for r in q if f(cp(r, 3600)['classes'])]; n = [r for r in q if not f(cp(r, 3600)['classes'])]
            out.append(f"{lo}-{hi} with {pct(sum(ch1(cp(r,3600)) for r in y), len(y))} without {pct(sum(ch1(cp(r,3600)) for r in n), len(n))}")
        print(policy, name, ' | '.join(out))

if H2:
    print('\n=== 6. two-hour horizon (80 seeds) ===')
    for policy in ('basic', 'adaptive'):
        rs = [r for k, r in H2.items() if k[0] == policy]
        ts = []
        for r in rs:
            t = next((c['t'] for c in r['clears'] if c['stage'] == 1051), None)
            ts.append(t)
        done = sorted(t for t in ts if t is not None)
        by = {m: sum(t is not None and t <= m*60 for t in ts) for m in (30, 45, 60, 90, 120)}
        c2 = [cp(r, 7200) for r in rs]
        print(policy, 'ch1 cleared by min', by, 'of', len(rs), 'median of all (censored at 120)', round(sorted((t if t is not None else 1e9) for t in ts)[len(ts)//2]/60, 1))
        print('  D120 lv', med([st.median(c['levels']) for c in c2]), 'clears', med([score(c) for c in c2]), 'gold', med([c['gold'] for c in c2]), 'runs', med([c['count']['runs'] for c in c2]))
        comb = [sum(x['combatSec'] for x in r['runs'] if x['t'] <= 3600) for r in rs]
        print('  combatSec/60min median', med(comb), 'share of wall', round(100*med(comb)/3600, 1), '%')
        rew = [cp(r, 7200)['gaps']['reward']['seconds']/60 for r in rs]
        print('  reward gap D120 median', med(rew), 'max', round(max(rew), 1), '>=20min', sum(x >= 20 for x in rew))
        stuck = [(r['seed'], cp(r, 7200)['classes'], cp(r, 7200)['levels'], score(cp(r, 7200)), cp(r, 7200)['stage'], cp(r, 7200)['count']['wins'], cp(r, 7200)['count']['runs']) for r in rs if not ch1(cp(r, 7200))]
        print('  not cleared at D120:', len(stuck), stuck[:12])
        for name, f in (('mage+priest', lambda c: 'mage' in c and 'priest' in c), ('archer', lambda c: 'archer' in c)):
            y = [r for r in rs if f(cp(r, 7200)['classes'])]
            print('  ', name, 'D120 ch1', pct(sum(ch1(cp(r, 7200)) for r in y), len(y)), 'median clear', med(sorted(next(c['t'] for c in r['clears'] if c['stage'] == 1051)/60 for r in y if ch1(cp(r, 7200)))))
    # consistency: the h2 and primary runs are the same engine and same seeds up to 60 minutes
    same = sum(score(cp(H2[k], 3600)) == score(cp(ALL[k], 3600)) for k in H2 if k in ALL)
    print('h2 vs primary same clears at D60:', same, '/', len(H2))

if SHOP:
    print('\n=== 7. merchant weapon variant vs adaptive (same seeds) ===')
    keys = [k for k in SHOP]
    for m in (600, 3600):
        a = [cp(ALL[('adaptive', k[1])], m) for k in keys]
        b = [cp(SHOP[k], m) for k in keys]
        d = [score(y)-score(x) for x, y in zip(a, b)]
        print(f'D{m//60}', 'lv', med([st.median(c['levels']) for c in a]), '->', med([st.median(c['levels']) for c in b]),
              'clears', med([score(c) for c in a]), '->', med([score(c) for c in b]), 'ahead/same/behind', sum(x > 0 for x in d), sum(x == 0 for x in d), sum(x < 0 for x in d),
              'ch1', sum(map(ch1, a)), '->', sum(map(ch1, b)), 'gold', med([c['gold'] for c in a]), '->', med([c['gold'] for c in b]))
        for lo, hi in ((1, 40), (41, 80)):
            sel = [k for k in keys if lo <= k[1] <= hi]
            print('   half', lo, hi, 'ch1', sum(ch1(cp(ALL[('adaptive', k[1])], m)) for k in sel), '->', sum(ch1(cp(SHOP[k], m)) for k in sel), '/', len(sel))
    c = [cp(SHOP[k], 3600)['count'] for k in keys]
    print('shopGold median', med([x.get('shopGold', 0) for x in c]), 'weapons bought median', med([x['actions'].get('shopWeapon', 0) for x in c]), 'accts with purchase', sum('shopWeapon' in x['actions'] for x in c), 'rerolls', med([x['actions'].get('shopReroll', 0) for x in c]))
    ev = [e for k in keys for e in SHOP[k]['events'] if e['kind'] == 'shopWeapon']
    print('purchase rarity', Counter(e['rarity'] for e in ev), 'first buy min', med([next(e['t'] for e in SHOP[k]['events'] if e['kind'] == 'shopWeapon')/60 for k in keys if any(e['kind'] == 'shopWeapon' for e in SHOP[k]['events'])]),
          'might ratio', med([e['after']/max(e['before'], 1e-9) for e in ev]))
    print('failures', sum(len(SHOP[k]['failures']) for k in keys))
