"""D10/D60 breakdown: stage time, walls, party composition, buildings. Prints tables and writes deep.json."""
import json
import statistics as st
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = HERE.parent
ROOT = BASE.parents[1]
P = BASE / 'simulation/pilot'
OLD = ROOT / 'output/2026-10-30_early_d10_d60/simulation/pilot'


def load(folder):
    return {(r['policy'], r['seed']): r for r in (json.loads(p.read_text(encoding='utf-8')) for p in folder.glob('*_seed*.json'))}


cur = load(P)
ext = load(P / 'ext80')
old = load(OLD)
ALL = {**cur, **ext}
med = lambda xs: round(st.median(xs), 2) if xs else None
pct = lambda a, b: f'{a}/{b} ({100*a/b:.0f}%)' if b else '-'
cp = lambda r, m: next(c for c in r['checkpoints'] if c['seconds'] == m)
score = lambda c: len(c['cleared']) + sum(len(v) for v in c['clearedIn'].values())
ch1 = lambda c: 1051 in c['cleared'] or 1051 in c['clearedIn'].get('normal', [])
out = {}


def rows(policy, lo=1, hi=80, src=ALL):
    return [r for (p, s), r in sorted(src.items()) if p == policy and lo <= s <= hi]


def clear_t(r, stage):
    return next((c['t'] for c in r['clears'] if c['stage'] == stage), None)


print('=== A. D10/D60 by seed band (basic, adaptive) ===')
for policy in ('basic', 'adaptive'):
    for lo, hi in ((1, 20), (21, 50), (51, 80), (1, 80)):
        rs = rows(policy, lo, hi)
        for m in (600, 3600):
            cs = [cp(r, m) for r in rs]
            print(policy, f'{lo}-{hi}', f'D{m//60}', 'n', len(rs), 'lv', med([st.median(c['levels']) for c in cs]),
                  'clears', med([score(c) for c in cs]), 'range', min(score(c) for c in cs), max(score(c) for c in cs),
                  'ch1', pct(sum(ch1(c) for c in cs), len(cs)), 'drops', med([c['count']['drops'] for c in cs]),
                  'gold', med([c['gold'] for c in cs]), 'runs', med([c['count']['runs'] for c in cs]),
                  'wins', med([c['count']['wins'] for c in cs]))

print('\n=== B. stage funnel, basic+adaptive 1-80 ===')
stages = [1011, 1012, 1013, 1021, 1022, 1023, 1031, 1032, 1033, 1041, 1042, 1043, 1051, 2011, 2012, 2013, 2021]
fun = {}
for policy in ('basic', 'adaptive'):
    rs = rows(policy)
    for s in stages:
        ts = [clear_t(r, s) for r in rs]
        ok = [t for t in ts if t is not None]
        lv = [st.median(c['levels']) for r in rs for c in r['clears'] if c['stage'] == s]
        att = [x for r in rs for x in r['runs'] if x['stage'] == s]
        first = [next((x for x in r['runs'] if x['stage'] == s), None) for r in rs]
        first = [x for x in first if x]
        wall = sum(x['wallSec'] for x in att)
        fun[(policy, s)] = dict(reach=len(ok), med=med(ok), lv=med(lv), att=len(att), win=sum(x['won'] for x in att), first=len(first), firstwin=sum(x['won'] for x in first), wall=wall)
        print(policy, s, 'cleared', len(ok), '/', len(rs), 'median_min', round(med(ok)/60, 1) if ok else None, 'arrLv', med(lv), 'attempts', len(att),
              'winrate', pct(sum(x['won'] for x in att), len(att)), 'firstTry', pct(sum(x['won'] for x in first), len(first)), 'wallMin/acct', round(wall/60/len(rs), 1))

print('\n=== C. time share per segment (60 min, basic+adaptive) ===')
for policy in ('basic', 'adaptive'):
    rs = rows(policy)
    b = defaultdict(float)
    tot = 0
    for r in rs:
        for x in r['runs']:
            key = 'boss1051' if x['stage'] == 1051 else f"{x['stage']//10000 if x['stage']>9999 else x['stage']//1000}-{(x['stage']%100)//10}"
            b[key] += x['wallSec']
            tot += x['wallSec']
    print(policy, {k: f'{100*v/tot:.0f}%' for k, v in sorted(b.items())}, 'runWall_median', med([x['wallSec'] for r in rs for x in r['runs']]))
    print(' run length won/lost', med([x['wallSec'] for r in rs for x in r['runs'] if x['won']]), med([x['wallSec'] for r in rs for x in r['runs'] if not x['won']]),
          'wait share', round(100*med([r['count']['waitingSec']/3600 for r in rs]), 1), '%')

print('\n=== D. walls: where accounts stand at D60 ===')
for policy in ('basic', 'adaptive'):
    rs = rows(policy)
    last = Counter()
    for r in rs:
        c = cp(r, 3600)
        cl = set(c['cleared']) | set(c['clearedIn'].get('normal', []))
        nx = next((s for s in stages if s not in cl), 'beyond')
        last[nx] += 1
    print(policy, 'next-uncleared', sorted(last.items(), key=lambda k: str(k[0])))

print('\n=== E. boss 1051 ===')
for policy in ('basic', 'adaptive'):
    rs = rows(policy)
    atts = []; wins = []
    for r in rs:
        a = [x for x in r['runs'] if x['stage'] == 1051]
        if not a:
            continue
        w = next((i for i, x in enumerate(a) if x['won']), None)
        arr = next((c['t'] for c in r['clears'] if c['stage'] == 1043), None)
        cl = clear_t(r, 1051)
        atts.append(dict(seed=r['seed'], n=len(a), won=w is not None, firstWinAt=None if w is None else w+1, arr=arr, clear=cl,
                         roundsMed=med([x['roundsCleared'] for x in a]), reward0=sum(1 for x in a if x['xp'] == 0 and x['gold'] == 0 and x['drops'] == 0)))
    won = [x for x in atts if x['won']]
    print(policy, 'reached', len(atts), 'won', len(won), 'tries-to-win median', med([x['firstWinAt'] for x in won]), 'max', max((x['firstWinAt'] for x in won), default=None),
          'minutes arrive->clear', med([(x['clear']-x['arr'])/60 for x in won if x['arr']]),
          'lost-accts tries', med([x['n'] for x in atts if not x['won']]), 'reward-free tries share', pct(sum(x['reward0'] for x in atts), sum(x['n'] for x in atts)))
    # level on boss clear vs. stuck level at D60
    print('  clear levels', med([st.median(c['levels']) for r in rs for c in r['clears'] if c['stage'] == 1051]),
          'stuck levels D60', med([st.median(cp(r, 3600)['levels']) for r in rs if not ch1(cp(r, 3600)) and any(x['stage'] == 1051 for x in r['runs'])]))

print('\n=== F. gaps D60 ===')
for policy in ('basic', 'adaptive'):
    rs = rows(policy)
    g = [cp(r, 3600)['gaps'] for r in rs]
    for k in ('newStage', 'reward', 'usefulEquipment'):
        xs = sorted(x[k]['seconds']/60 for x in g)
        print(policy, k, 'median', round(st.median(xs), 1), 'p90', round(xs[int(len(xs)*.9)], 1), 'max', round(xs[-1], 1), '>=10min', sum(x >= 10 for x in xs), '>=20min', sum(x >= 20 for x in xs))

print('\n=== G. composition (1-80). half = 1-40 / 41-80 ===')
CLS = ['warrior', 'knight', 'archer', 'mage', 'priest']
comp = {}
for policy in ('basic', 'adaptive'):
    rs = rows(policy)
    print(policy, 'overall ch1', sum(ch1(cp(r, 3600)) for r in rs), '/', len(rs))
    for cls in CLS + ['frontline0', 'frontline1', 'frontline2+', 'mage+priest', 'no_physical']:
        def has(r):
            c = cp(r, 3600)['classes']
            front = sum(x in ('warrior', 'knight') for x in c)
            if cls in CLS:
                return cls in c
            if cls == 'frontline0':
                return front == 0
            if cls == 'frontline1':
                return front == 1
            if cls == 'frontline2+':
                return front >= 2
            if cls == 'mage+priest':
                return 'mage' in c and 'priest' in c
            if cls == 'no_physical':
                return all(x in ('mage', 'priest') for x in c)
        y = [r for r in rs if has(r)]
        n = [r for r in rs if not has(r)]
        A = [r for r in y if r['seed'] <= 40]
        B = [r for r in y if r['seed'] > 40]
        f = lambda q: pct(sum(ch1(cp(r, 3600)) for r in q), len(q))
        s = lambda q: med([score(cp(r, 3600)) for r in q])
        print(f' {cls:12s} with {f(y):16s} clears {s(y)}  | half1 {f(A):14s} half2 {f(B):14s} | without {f(n)}  clears {s(n)}')
    multi = defaultdict(list)
    for r in rs:
        multi['+'.join(sorted(cp(r, 3600)['classes']))].append(r)
    ranked = sorted(multi.items(), key=lambda kv: med([score(cp(r, 3600)) for r in kv[1]]))
    print(' worst comps', [(k, len(v), med([score(cp(r, 3600)) for r in v])) for k, v in ranked[:6]])
    print(' best comps', [(k, len(v), med([score(cp(r, 3600)) for r in v])) for k, v in ranked[-6:]])

print('\n=== H. buildings / unused at D60 (basic 1-80) ===')
for policy in ('basic', 'adaptive'):
    rs = rows(policy)
    for m in (600, 3600):
        cs = [cp(r, m) for r in rs]
        rank = {b: Counter(c['buildings'].get(b, 0) for c in cs) for b in ('shop', 'tavern', 'forge', 'storage', 'command', 'resource', 'library', 'explore')}
        print(policy, f'D{m//60}', {k: dict(sorted(v.items())) for k, v in rank.items()})
    cs = [cp(r, 3600) for r in rs]
    blockers = Counter()
    for c in cs:
        for b in c['unused']['buildingBlockers']:
            blockers[(b['id'], b['rank']+1, str(b['error']))] += 1
    print(' blockers top', [(k, v) for k, v in blockers.most_common(14)])
    print(' materials median', {k: med([c['materials'].get(k, 0) for c in cs]) for k in ('iron_ore', 'timber', 'herb', 'dust')})
    print(' unspent mastery', med([sum(h['points'] for h in c['mastery']) for c in cs]), ' waitingHeroes', sum(c['unused']['waitingHeroes'] > 0 for c in cs), '/', len(cs))
    print(' advance eligible', sum(any(a.get('open') for a in c['unused']['eligibleAdvance']) for c in cs), ' bookOpen', sum(c['unused']['bookStateOpen'] for c in cs), ' craftable', sum(bool(c['unused']['craftableBooks']) for c in cs))

print('\n=== I. gear ===')
for policy in ('basic', 'adaptive'):
    rs = rows(policy)
    for m in (600, 3600):
        cs = [cp(r, m) for r in rs]
        print(policy, f'D{m//60}', 'ilvl', med([c['gear']['ilvl'] for c in cs]), 'upTotal', med([c['gear']['upTotal'] for c in cs]),
              'starterWeapon', sum(w['uid'] in ('i1', 'i3', 'i5') for c in cs for w in c['gear']['weapons']), '/', 3*len(cs),
              'dropEquip', med([c['dropEquippedRatio'] for c in cs]), 'rar', dict(Counter({k: sum(c['count']['rarities'].get(k, 0) for c in cs) for k in ('normal', 'magic', 'rare', 'craft', 'epic', 'legendary', 'unique', 'set')})),
              'upGold', med([c['count']['upgradeGold'] for c in cs]), 'potGold', med([c['count']['potionBuyGold'] for c in cs]), 'buildGold', med([c['count']['buildGold'] for c in cs]), 'battleGold', med([c['count']['battleGold'] for c in cs]), 'commissionGold', med([c['count']['commissionGold'] for c in cs]))

print('\n=== J. early beat (first events, basic 1-80) ===')
for policy in ('basic', 'passive'):
    rs = rows(policy)
    cs = [cp(r, 3600) for r in rs]
    for k in ('xp', 'drop', 'levelUp', 'masteryAvailable', 'stageClear', 'boxGranted', 'boxOpened', 'equipmentGain', 'defeat', 'retryGuide', 'construct', 'upgrade', 'newActiveSkill', 'blueprint'):
        ts = [c['first'][k]['t'] for c in cs if k in c['first']]
        print(policy, k, 'n', len(ts), '/', len(cs), 'median_sec', med(ts), 'max', max(ts) if ts else None)

print('\n=== K. matched vs prior 10-30 18:34 (seeds 1-20 and passive 1-10) ===')
for policy in ('basic', 'adaptive', 'passive'):
    for m in (600, 3600):
        keys = sorted(k for k in cur if k[0] == policy)
        a = [cp(old[k], m) for k in keys]
        b = [cp(cur[k], m) for k in keys]
        d = [score(y)-score(x) for x, y in zip(a, b)]
        print(policy, f'D{m//60}', 'lv', med([st.median(c['levels']) for c in a]), '->', med([st.median(c['levels']) for c in b]),
              'clears', med([score(c) for c in a]), '->', med([score(c) for c in b]), 'ahead/same/behind', sum(x > 0 for x in d), sum(x == 0 for x in d), sum(x < 0 for x in d),
              'ch1', sum(map(ch1, a)), '->', sum(map(ch1, b)), 'gold', med([c['gold'] for c in a]), '->', med([c['gold'] for c in b]),
              'drops', med([c['count']['drops'] for c in a]), '->', med([c['count']['drops'] for c in b]))

print('\n=== L. worst cases 1-80 at D60 ===')
for policy in ('basic', 'adaptive'):
    rs = rows(policy)
    w = sorted(rs, key=lambda r: score(cp(r, 3600)))[:6]
    for r in w:
        c = cp(r, 3600)
        print(policy, 'seed', r['seed'], c['classes'], 'lv', c['levels'], 'clears', score(c), 'at', c['stage'], 'gold', c['gold'], 'newGap', round(c['gaps']['newStage']['seconds']/60, 1), 'rewardGap', round(c['gaps']['reward']['seconds']/60, 1), 'wins/runs', c['count']['wins'], c['count']['runs'], 'first1011win', next((x['won'] for x in r['runs'] if x['stage'] == 1011), None))
