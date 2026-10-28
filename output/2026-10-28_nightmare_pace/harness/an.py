"""Summarize wheel outputs (10-28): python an.py <tag> [x_user=1.04]
exp  = expedition playtime (top bar, ADR-0514 — sum of durationSec, restart wait excluded)
sim  = durationSec + repeat_restart_sec per run (sim.js campaign clock)
user = sim x X (10-24 evening human-mimic ratio, Focus Off)"""
import glob, json, statistics as st, sys
from collections import Counter, defaultdict
from pathlib import Path

tag = sys.argv[1]
X = float(sys.argv[2]) if len(sys.argv) > 2 else 1.04
OUT = Path(__file__).resolve().parent.parent / 'out'
OUT = OUT if OUT.exists() else OUT.parent / 'sim_out'   # output/ copy keeps results in sim_out
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
H = lambda sec: sec / 3600
def q(xs, p):
    if not xs:
        return None
    s = sorted(xs)
    return s[min(len(s) - 1, int(p * (len(s) - 1) + 0.5))]
f1 = lambda v: '-' if v is None else f'{v:.1f}'
med = lambda xs: f'{f1(q(xs, .5))} [{f1(q(xs, .25))} ~ {f1(q(xs, .75))}]'
CELL = lambda sid: f'{sid // 1000}-{sid // 10 % 100} {"I II III".split()[sid % 10 - 1] if 1 <= sid % 10 <= 3 else sid % 10}'
DIFFS = meta['opt']['diffs']

print(f'# {tag} — seeds {N} · bot: {meta["bot"]}')
print('assume: ' + ' / '.join(meta['assume']))
print(f'opt: {json.dumps(meta["opt"], ensure_ascii=False)} · harness ms {meta["ms"]} · user = sim x {X}')
print()
print('## per difficulty — finished · hours in that tier (median [q1 ~ q3]) · cumulative from new game · party Lv at its end')
for d in DIFFS:
    reached = [o for o in seeds if any(t['diff'] == d for t in o['tiers'])]
    tier = lambda o: next(t for t in o['tiers'] if t['diff'] == d)
    fin = [o for o in reached if tier(o)['t1'] is not None and not (o['stuck'] and o['stuck']['diff'] == d)]
    hf = [sum(1 for o in fin if half[o['seed']] == h) for h in (0, 1)]
    hn = [sum(1 for o in seeds if half[o['seed']] == h) for h in (0, 1)]
    print(f'  {d}: finished {len(fin)}/{len(reached)} (halves {hf[0]}/{hn[0]} · {hf[1]}/{hn[1]})')
    for lab, key0, key1, k in (('exp ', 'e0', 'e1', 1), ('sim ', 't0', 't1', 1), ('user', 't0', 't1', X)):
        tt = [H(tier(o)[key1] - tier(o)[key0]) * k for o in fin]
        ct = [H(tier(o)[key1]) * k for o in fin]
        hm = [f1(q([H(tier(o)[key1]) * k for o in fin if half[o['seed']] == h], .5)) for h in (0, 1)]
        print(f'    {lab}: tier {med(tt)} h · cumulative {med(ct)} h (halves med {hm[0]} / {hm[1]}) · min {f1(min(ct) if ct else None)} max {f1(max(ct) if ct else None)}')
    last = lambda o: [s for s in o['stages'] if s['diff'] == d][-1]['clear']
    lv = [last(o)['lv'] for o in fin]
    if lv:
        print(f'    Lv end {med(lv)} · min {f1(min(lv))} max {f1(max(lv))} · runs in tier {med([tier(o)["runs"] for o in fin])} · win rate {f1(100 * sum(tier(o)["wins"] for o in fin) / max(1, sum(tier(o)["runs"] for o in fin)))}%')
print()
print('## completion over ALL seeds (stuck = never) — cumulative exp h from new game when 10/25/50/75% of seeds had finished the tier')
for d in DIFFS:
    done = sorted(H(next(t for t in o['tiers'] if t['diff'] == d)['e1']) for o in seeds
                  if any(t['diff'] == d and t['e1'] is not None for t in o['tiers']) and not (o['stuck'] and o['stuck']['diff'] == d))
    at = lambda p: f1(done[int(p * N + 0.999) - 1]) if int(p * N + 0.999) <= len(done) else 'never'
    print(f'  {d}: finished {len(done)}/{N} · 10% {at(.1)} · 25% {at(.25)} · 50% {at(.5)} · 75% {at(.75)} h')
print()
print('## stuck cells (count)')
sc = Counter((o['stuck']['diff'], CELL(o['stuck']['stageId'])) for o in seeds if o['stuck'])
print('  ' + ' · '.join(f'{d} {c} {n}' for (d, c), n in sc.most_common()))
print()
print('## stuck / capped seeds')
for o in seeds:
    s = o['stuck']
    if s and s['diff'] in DIFFS:
        g = s['gear']
        print(f'  seed {o["seed"]:3} {"/".join(c[:4] for c in o["classes"])} {s["why"]} {s["diff"]} {CELL(s["stageId"])} mLv {s.get("mlv")} · party Lv {g["lv"]} ilvl {g["ilvl"]} · at exp {f1(H(o["tExp"]))} h')
print()
print('## where the time goes — median share of the tier (finished tiers)')
for d in DIFFS:
    share = defaultdict(list)
    for o in seeds:
        tier = next((t for t in o['tiers'] if t['diff'] == d), None)
        if not tier or tier['t1'] is None or (o['stuck'] and o['stuck']['diff'] == d):
            continue
        span = tier['t1'] - tier['t0']
        for s in o['stages']:
            if s['diff'] == d and s['tClear'] is not None:
                share[s['stageId']].append((s['tClear'] - s['t0']) / span if span else 0)
    top = sorted(share.items(), key=lambda kv: -st.median(kv[1]))[:6]
    if top:
        print(f'  {d}: ' + ' · '.join(f'{CELL(k)} {100 * st.median(v):.0f}%' for k, v in top))
print()
print('## level cap — first cell clear with party avg Lv >= cap-0.5')
cap = meta.get('cap', 50)
hit, hrs = Counter(), []
for o in seeds:
    s = next((s for s in o['stages'] if s['clear'] and s['clear']['lv'] >= cap - 0.5), None)
    if s:
        hit[(s['diff'], CELL(s['stageId']))] += 1
        hrs.append(H(s['tClear']) * X)
print('  ' + ' · '.join(f'{d} {c} {n}' for (d, c), n in hit.most_common(6)) + f' | reached {len(hrs)}/{N} · user h {med(hrs)}')
print()
print('## drops by rarity per tier (all seeds, all runs)')
for d in DIFFS:
    tot = Counter()
    for o in seeds:
        for t in o['tiers']:
            if t['diff'] == d:
                tot.update(t.get('drops', {}))
    print(f'  {d}: ' + ' · '.join(f'{k} {v}' for k, v in tot.most_common()))
print()
print('## feature counters (median per seed) — each must be > 0')
keys = list(seeds[0].get('cnt', {}).keys())
print('  ' + ' · '.join(f'{k} {f1(q([o["cnt"][k] for o in seeds], .5))} (min {min(o["cnt"][k] for o in seeds)})' for k in keys))
print(f'  end weapon/armor up: {Counter(u for o in seeds for u in o.get("ups", []))}')
