"""Compare variants against the baseline (C5). python cmp.py C5 V1 V2 ..."""
import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'sim_out'
K = 1.04
STAGE_END = {1: 1013, 2: 1023, 3: 1033, 4: 1043, 5: 1051}


def q(xs, p):
    xs = sorted(xs)
    i = (len(xs) - 1) * p
    lo = int(i)
    hi = min(lo + 1, len(xs) - 1)
    return xs[lo] + (xs[hi] - xs[lo]) * (i - lo)


print('tag | 1-1 med [IQR] p90 | 1-2 | 1-3 | 1-4 | 1-5 | ch1 total med [IQR] p90 | halves | <=60 | <=120 | 1-1 I 1st-try | Lv@1-1 end | Lv@ch1 end | worst 1-1')
for tag in sys.argv[1:]:
    d = json.loads((OUT / f'{tag}.txt').read_text(encoding='utf-8'))
    out = d['out']
    seeds = sorted(o['seed'] for o in out)
    half = set(seeds[:len(seeds) // 2])
    cl = {o['seed']: {r['stageId']: r for r in o['stages'] if r['tClear'] is not None} for o in out}
    ok = [s for s in seeds if 1051 in cl[s]]
    t = lambda s, c: cl[s][c]['tClear'] / 60 * K
    inc = {}
    for n, c in STAGE_END.items():
        inc[n] = [t(s, c) - (t(s, STAGE_END[n - 1]) if n > 1 else 0) for s in ok]
    tot = [t(s, 1051) for s in ok]
    h1 = [t(s, 1051) for s in ok if s in half]
    h2 = [t(s, 1051) for s in ok if s not in half]
    first = sum(1 for s in ok if cl[s][1011]['tries'] == 1)
    lv11 = q([cl[s][1013]['clear']['lv'] for s in ok], .5)
    lv15 = q([cl[s][1051]['clear']['lv'] for s in ok], .5)
    print(f"{tag} | {q(inc[1], .5):.1f} [{q(inc[1], .25):.1f} ~ {q(inc[1], .75):.1f}] p90 {q(inc[1], .9):.0f} | "
          + ' | '.join(f'{q(inc[n], .5):.1f}' for n in (2, 3, 4, 5))
          + f" | {q(tot, .5):.1f} [{q(tot, .25):.1f} ~ {q(tot, .75):.1f}] p90 {q(tot, .9):.0f} | {q(h1, .5):.1f} / {q(h2, .5):.1f}"
          + f" | {sum(1 for x in tot if x <= 60)}/{len(seeds)} | {sum(1 for x in tot if x <= 120)}/{len(seeds)} | {first}/{len(ok)} | {lv11:.1f} | {lv15:.1f} | {max(inc[1]):.0f} · finished {len(ok)}/{len(seeds)}")
