"""D10 / D60 / D1 summary from simulation_wt/main. Numbers only - wording goes in REPORT.md."""
import json, statistics as st, sys
from collections import Counter, defaultdict
from pathlib import Path

BASE = Path(__file__).resolve().parent
SIM = BASE / 'simulation_wt' / 'main'
CP = SIM / 'checkpoints'
POL = ['basic', 'adaptive', 'passive']
SEEDS = {'basic': range(1, 81), 'adaptive': range(1, 81), 'passive': range(1, 11)}
MARKS = ['600', '3600', 'd1ret', 'd1']
out = []
def p(*a): out.append(' '.join(str(x) for x in a))
def med(xs): return round(st.median(xs), 1) if xs else None
def lab(sid): return f'{sid // 1000}-{sid // 10 % 100 % 10 if sid // 10 % 100 >= 10 else sid // 10 % 10}{" " + "I II III".split()[sid % 10 - 1] if sid % 10 <= 3 else ""}'
def name(sid):
    ch, place, cell = sid // 1000, (sid // 10) % 10, sid % 10
    return f'{ch}-{place} ' + ['I', 'II', 'III'][cell - 1] if place != 5 else f'{ch}-5 boss'

R = {pol: {s: json.loads((SIM / f'{pol}_seed{s}.json').read_text(encoding='utf-8')) for s in SEEDS[pol]} for pol in POL}
C = {pol: {s: {m: json.loads((CP / f'{pol}_seed{s}_{m}.json').read_text(encoding='utf-8')) for m in MARKS} for s in SEEDS[pol]} for pol in POL}

def plv(snap): return st.median(snap['levels'])
def ch1(snap): return 1051 in snap['cleared']

p('## per mark (median, [min~max])')
for pol in POL:
    for m in MARKS:
        ss = [C[pol][s][m] for s in SEEDS[pol]]
        cl = [len(x['cleared']) for x in ss]
        p(pol, m, 'lv', med([plv(x) for x in ss]), 'cleared', med(cl), f'[{min(cl)}~{max(cl)}]',
          'runs', med([x['count']['runs'] for x in ss]), 'wins', med([x['count']['wins'] for x in ss]),
          'drops', med([x['count']['drops'] for x in ss]), 'ilvl', med([x['gear']['ilvl'] for x in ss]),
          'ch1', f"{sum(ch1(x) for x in ss)}/{len(ss)}", 'gold', med([x['gold'] for x in ss]),
          'mastery', med([x['count']['masterySpent'] for x in ss]), 'up', med([x['gear']['upTotal'] for x in ss]),
          'bld', med([sum(x['buildings'].values()) for x in ss]))

p('\n## halves (seeds 1-40 | 41-80)')
for pol in ['basic', 'adaptive']:
    for m in ['600', '3600', 'd1']:
        h = []
        for rng in (range(1, 41), range(41, 81)):
            ss = [C[pol][s][m] for s in rng]
            h.append(f"lv {med([plv(x) for x in ss])} cl {med([len(x['cleared']) for x in ss])} ch1 {sum(ch1(x) for x in ss)}/40")
        p(pol, m, ' | '.join(h))

p('\n## first events (basic, seconds: median / max)')
for k in ['departure', 'xp', 'levelUp', 'drop', 'stageClear', 'equipmentGain', 'boxGranted', 'defeat', 'retryGuide', 'masterySpent', 'construct', 'upgrade']:
    ts = [R['basic'][s]['first'][k]['t'] for s in SEEDS['basic'] if k in R['basic'][s]['first']]
    p(k, len(ts), med(ts), max(ts) if ts else None)

p('\n## D60 frontier (furthest cleared stage) distribution')
def bucket(cl):
    if not cl: return '0 none'
    f = max(cl)
    if f >= 2011: return '6 ch2+'
    if f == 1043: return '5 at boss'
    if f >= 1041: return '4 1-4'
    if f >= 1031: return '3 1-3'
    if f >= 1021: return '2 1-2'
    return '1 1-1'
for pol in POL:
    for m in ['3600', 'd1']:
        cnt = Counter(bucket(C[pol][s][m]['cleared']) for s in SEEDS[pol])
        p(pol, m, dict(sorted(cnt.items())))

p('\n## gaps at D60 (minutes >= 20)')
for pol in POL:
    ss = [C[pol][s]['3600'] for s in SEEDS[pol]]
    ns = [x['gaps']['newStage']['seconds'] / 60 for x in ss]; rw = [x['gaps']['reward']['seconds'] / 60 for x in ss]
    p(pol, 'no-new-stage>=20m', sum(g >= 20 for g in ns), 'med', med(ns), '| no-reward>=20m', sum(g >= 20 for g in rw), 'max', round(max(rw), 1))

p('\n## stage funnel within D60 (first try win, accounts cleared, first clear min median)')
for pol in ['basic', 'adaptive']:
    first_try = defaultdict(list); clr = defaultdict(list)
    for s in SEEDS[pol]:
        seen = set()
        for r in R[pol][s]['runs']:
            if r['t'] > 3600: break
            if r['stage'] not in seen:
                seen.add(r['stage']); first_try[r['stage']].append(r['won'])
        for c in R[pol][s]['clears']:
            if c['t'] <= 3600: clr[c['stage']].append(c['t'] / 60)
    p('--', pol)
    for sid in sorted(set(first_try) | set(clr)):
        if sid > 2023: continue
        ft = first_try[sid]
        p(f'{name(sid):10s}', f'first {sum(ft)}/{len(ft)} = {round(100 * sum(ft) / len(ft)) if ft else "-"}%', 'cleared', len(clr[sid]), 'min', med(clr[sid]))

p('\n## boss 1051 attempts by index (whole session incl. D1)')
for pol in ['basic', 'adaptive']:
    b = defaultdict(lambda: [0, 0])
    for s in SEEDS[pol]:
        i = 0
        for r in R[pol][s]['runs']:
            if r['stage'] != 1051: continue
            i += 1; k = '1-5' if i <= 5 else '6-10' if i <= 10 else '11+'
            b[k][0] += r['won']; b[k][1] += 1
    p(pol, {k: f'{v[0]}/{v[1]}' for k, v in b.items()})

p('\n## D1 return (24h away, offline cap)')
for pol in POL:
    ds = [R[pol][s]['d1'] for s in SEEDS[pol]]
    mats = defaultdict(list)
    for d in ds:
        for k in ('iron_ore', 'timber', 'herb'): mats[k].append(d['onReturn']['materials'].get(k, 0))
    other = Counter(k for d in ds for k in d['onReturn']['materials'] if k not in ('iron_ore', 'timber', 'herb'))
    p(pol, 'notice', Counter((d['notice'] or {}).get('kind') for d in ds), 'midRun', sum(d['midRun'] for d in ds),
      'gold', med([d['onReturn']['gold'] for d in ds]), 'mats', {k: med(v) for k, v in mats.items()}, 'other', dict(other),
      'joins', sum(d['onReturn']['joins'] for d in ds), 'mail', sum(d['onReturn']['mail'] for d in ds),
      'labRegHeroes', med([len(d['onReturn']['labReg']) for d in ds]),
      'linesOpen', Counter(l['line'] for d in ds for l in d['onReturn']['labLines'] if l['open']),
      'research', sum(1 for d in ds if d['onReturn']['labResearchBefore']))
    p(pol, 'resume=closed stage', sum(d['resumeStage'] == d['closedStage'] for d in ds), '/', len(ds))
    pl = [d['play'] for d in ds]
    nc = [len(x['newClears']) for x in pl]
    p(pol, 'D1+10: runs', med([x['runs'] for x in pl]), 'wins', med([x['wins'] for x in pl]), 'newClears', med(nc),
      f'[{min(nc)}~{max(nc)}]', 'zeroNew', sum(n == 0 for n in nc), 'zeroWins', sum(x['wins'] == 0 for x in pl),
      'lvGain', med([st.median(C[pol][s]['d1']['levels']) - st.median(C[pol][s]['3600']['levels']) for s in SEEDS[pol]]),
      'gold', med([x['gold'] for x in pl]), 'drops', med([x['drops'] for x in pl]))
    for rng in ((range(1, 41), range(41, 81)) if pol != 'passive' else ()):
        sub = [R[pol][s]['d1']['play'] for s in rng]
        p('   half', rng.start, 'newClears', med([len(x['newClears']) for x in sub]), 'zeroNew', sum(len(x['newClears']) == 0 for x in sub), 'zeroWins', sum(x['wins'] == 0 for x in sub))

p('\n## D1 resume stage vs result (basic+adaptive)')
for pol in ['basic', 'adaptive']:
    g = defaultdict(list)
    for s in SEEDS[pol]:
        d = R[pol][s]['d1']; k = 'boss 1051' if d['resumeStage'] == 1051 else bucket([d['resumeStage']])
        g[k].append((d['play']['wins'], len(d['play']['newClears'])))
    p(pol, {k: f"n{len(v)} zeroWin {sum(w == 0 for w, _ in v)} zeroNew {sum(n == 0 for _, n in v)}" for k, v in sorted(g.items())})

p('\n## ch1 complete by minute (session 1)')
for pol in ['basic', 'adaptive']:
    ts = []
    for s in SEEDS[pol]:
        t = next((c['t'] for c in R[pol][s]['clears'] if c['stage'] == 1051), None)
        ts.append(t / 60 if t is not None and t <= 3600 else None)
    p(pol, {m: sum(1 for t in ts if t is not None and t <= m) for m in (30, 45, 60)}, 'median of finishers', med([t for t in ts if t is not None]))

p('\n## boss 1051 by party median level at attempt (whole session)')
def lv_at(res, t):
    lv = {}
    for e in res['events']:
        if e['kind'] == 'levelUp' and e['t'] <= t: lv[e['hero']] = e['to']
    xs = list(lv.values())
    return st.median(xs) if xs else 1
for pol in ['basic', 'adaptive']:
    b = defaultdict(lambda: [0, 0]); first = []
    for s in SEEDS[pol]:
        res = R[pol][s]; i = 0
        for r in res['runs']:
            if r['stage'] != 1051: continue
            L = lv_at(res, r['start']); k = '<=10' if L <= 10 else '11' if L <= 11 else '12' if L <= 12 else '13' if L <= 13 else '14+'
            b[k][0] += r['won']; b[k][1] += 1
            if i == 0: first.append(L)
            i += 1
    p(pol, {k: f'{v[0]}/{v[1]}' for k, v in sorted(b.items())}, 'first attempt lv median', med(first))

p('\n## class mix vs D60 ch1 (and D1)')
for pol in ['basic', 'adaptive']:
    for label, f in [('archer', lambda c: 'archer' in c), ('no archer', lambda c: 'archer' not in c),
                     ('mage+priest', lambda c: 'mage' in c and 'priest' in c), ('priest', lambda c: 'priest' in c), ('no priest', lambda c: 'priest' not in c)]:
        ss = [s for s in SEEDS[pol] if f(C[pol][s]['3600']['classes'])]
        p(pol, f'{label:12s}', f"D60 {sum(ch1(C[pol][s]['3600']) for s in ss)}/{len(ss)}", f"D1 {sum(ch1(C[pol][s]['d1']) for s in ss)}/{len(ss)}",
          'halves', f"{sum(ch1(C[pol][s]['3600']) for s in ss if s <= 40)}/{sum(1 for s in ss if s <= 40)}",
          f"{sum(ch1(C[pol][s]['3600']) for s in ss if s > 40)}/{sum(1 for s in ss if s > 40)}")

p('\n## features at D60 (basic/adaptive)')
for pol in ['basic', 'adaptive']:
    ss = [C[pol][s]['3600'] for s in SEEDS[pol]]
    bl = Counter(k for x in ss for k, v in x['buildings'].items() if v >= 1)
    p(pol, 'buildings r1+', dict(bl))
    p(pol, 'r2+', dict(Counter(k for x in ss for k, v in x['buildings'].items() if v >= 2)))
    p(pol, 'newActiveSkills', sum(x['count']['newActiveSkills'] for x in ss), 'boxes opened med', med([x['count']['boxesOpened'] for x in ss]),
      'pot used med', med([x['count']['potionsConsumed'] for x in ss]), 'upg med', med([x['count']['upgradeAttempts'] for x in ss]),
      'dropEquippedRatio med', med([x['dropEquippedRatio'] for x in ss]))
    adv = sum(1 for x in ss if any(a.get('open') for a in x['unused']['eligibleAdvance']))
    p(pol, 'advance open', adv, 'craftable books', sum(1 for x in ss if x['unused']['craftableBooks']))

text = '\n'.join(out)
(BASE / 'analysis_output.txt').write_text(text, encoding='utf-8')
sys.stdout.buffer.write(text.encode('utf-8'))
