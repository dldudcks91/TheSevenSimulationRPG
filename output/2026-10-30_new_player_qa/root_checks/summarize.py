"""Summarize measured QA JSON without rerunning the game."""
import json
from pathlib import Path
from statistics import median

ROOT = Path(__file__).resolve().parent.parent
records = [json.loads(p.read_text(encoding='utf-8'))
           for p in sorted((ROOT/'simulation').glob('*_seed*.json'))]
summary = {'cohorts': {}, 'cases': []}

def stage_label(c):
    n = c['stage']
    return f"{c['difficulty']} {n//1000}-{(n%1000)//10} {['','I','II','III'][n%10]}"

for policy in sorted({r['policy'] for r in records}):
    group = [r for r in records if r['policy'] == policy]
    marks = []
    for stamp in [600, 3600, 86400]:
        cs = [c for r in group for c in r['checkpoints'] if c['seconds'] == stamp]
        all_levels = [lv for c in cs for lv in c['levels']]
        marks.append({'elapsed_sec': stamp, 'seeds': len(cs),
            'level_min': min(all_levels), 'level_max': max(all_levels),
            'party_mean_level_median': median(sum(c['levels'])/len(c['levels']) for c in cs),
            'stages': [stage_label(c) for c in cs],
            'runs': sum(c['runs'] for c in cs), 'wins': sum(c['wins'] for c in cs),
            'losses': sum(c['losses'] for c in cs), 'overflow': sum(c['overflow'] for c in cs),
            'gold_min': min(c['gold'] for c in cs), 'gold_max': max(c['gold'] for c in cs)})
    summary['cohorts'][policy] = marks
    for r in group:
        summary['cases'].append({'seed': r['seed'], 'policy': policy,
            'elapsed_cpu_sec': r['wallSeconds'], 'violations': r['stats']['violations'],
            'depart_errors': r['stats']['departErrors'],
            'first_bag_full_sec': r['stats']['firstBagFull'],
            'first_discard_sec': r['stats']['firstOverflow'],
            'marks': [{k: c[k] for k in ['seconds', 'stage', 'difficulty', 'levels', 'runs', 'wins', 'losses', 'gold', 'bags', 'bagCap', 'mail', 'overflow']}
                      for c in r['checkpoints']],
            'worst_stalls': sorted([{'stage': key, **s} for key, s in r['stages'].items()],
                                  key=lambda s: s['wallSec'], reverse=True)[:3]})
(ROOT/'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(summary['cohorts'], ensure_ascii=True, indent=2))
