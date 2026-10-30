"""Summarize first-boss arrival/clear times without discarding censored starts."""
import json
import statistics
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
OUT = BASE / 'simulation/owned_books'
read = lambda p: json.loads(p.read_text(encoding='utf-8'))
rows = [read(p) for p in OUT.glob('*_seed*.json')]
summary = {'accounts': len(rows), 'completed_expeditions': sum(r['count']['runs'] for r in rows), 'policies': {}, 'pairs': []}
all_times = {}
for policy in ['book_first', 'active', 'active_slow', 'adaptive']:
    group = sorted([r for r in rows if r['policy'] == policy], key=lambda r: r['seed'])
    values = []
    for r in group:
        if policy == 'adaptive':
            arrival = next((run['start'] for run in r['runs'] if run['stage'] == 1051), None)
            clear = next((run['t'] for run in r['runs'] if run['stage'] == 1051 and run['won']), None)
        else:
            arrival, clear = r['arrivalSeconds'], r['clearSeconds']
        first_book = next((e['t'] for e in r['events'] if e['kind'] == 'learnBook'), None)
        first_library = next((e['t'] for e in r['events'] if e['kind'] == 'construct' and e.get('id') == 'library' and e.get('rank') == 2), None)
        boss_runs = [run for run in r['runs'] if run['stage'] == 1051 and (clear is None or run['t'] <= clear)]
        last = r['checkpoints'][-1]
        final = r.get('final')
        if final is None:
            final_path = OUT / 'checkpoints' / f'state_adaptive_seed{r["seed"]}_5400.json'
            final = read(final_path)
        value = {'seed': r['seed'], 'classes': [h['cls'] for h in final['heroes'][:3]],
                 'arrival_min': None if arrival is None else round(arrival / 60, 4),
                 'clear_min': None if clear is None else round(clear / 60, 4),
                 'arrival_to_clear_min': None if arrival is None or clear is None else round((clear-arrival) / 60, 4),
                 'first_book_min': None if first_book is None else round(first_book / 60, 4),
                 'library2_min': None if first_library is None else round(first_library / 60, 4),
                 'boss_attempts': len(boss_runs), 'farming_runs': r['count']['farmingRuns'],
                 'books_learned': r['count'].get('booksLearned', 0),
                 'end_gold': last['gold'], 'end_levels': last['levels'], 'end_stage': last['stage'],
                 'end_minutes': round(last['seconds'] / 60, 4), 'boss_earliest_lost_rounds': [x['roundsCleared'] for x in boss_runs[:3]]}
        values.append(value)
        all_times[(policy, r['seed'])] = value
    clears = sorted(v['clear_min'] for v in values if v['clear_min'] is not None)
    arrivals = sorted(v['arrival_min'] for v in values if v['arrival_min'] is not None)
    half = (len(values) + 1) // 2
    summary['policies'][policy] = {'n': len(values),
        'arrived_by': {str(m): sum(v['arrival_min'] is not None and v['arrival_min'] <= m for v in values) for m in [20, 25, 30, 40, 60, 90]},
        'cleared_by': {str(m): sum(v['clear_min'] is not None and v['clear_min'] <= m for v in values) for m in [30, 40, 45, 60, 90]},
        'cleared_30_to_40': sum(v['clear_min'] is not None and 30 <= v['clear_min'] <= 40 for v in values),
        'clear_time_for_half_of_all_starts_min': clears[half-1] if len(clears) >= half else None,
        'all_start_clear_time_median_min': (clears[(len(values)-1)//2]+clears[len(values)//2])/2 if len(clears)>len(values)//2 else None,
        'successful_clear_time_median_min': statistics.median(clears) if clears else None,
        'arrival_time_for_half_of_all_starts_min': arrivals[half-1] if len(arrivals) >= half else None,
        'all_start_arrival_time_median_min': (arrivals[(len(values)-1)//2]+arrivals[len(values)//2])/2 if len(arrivals)>len(values)//2 else None,
        'book_before_boss_clear': sum(v['first_book_min'] is not None and (v['clear_min'] is None or v['first_book_min'] <= v['clear_min']) for v in values),
        'values': values}
for seed in range(1, 21):
    values = {k: all_times.get((k, seed)) for k in summary['policies']}
    summary['pairs'].append({'seed': seed, 'times': {k: v['clear_min'] if v else None for k, v in values.items()}})
summary['notes'] = ['미클리어는90분에서 종료한다. 성공한 조건만의 중앙값을 전체 중앙값으로 부르지 않는다.',
    'book_first/active/active_slow share real starts; no policy is a measured human average.',
    'Current library2 gate Lv10 and material costs differ from prior 18:34 snapshot.',
    'Times start at first expedition, speed1/focusOff; real reading/click time excluded.']
(BASE / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({k: {a: b for a, b in v.items() if a != 'values'} for k, v in summary['policies'].items()}, ensure_ascii=True, indent=2))
