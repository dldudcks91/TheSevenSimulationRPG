"""Cross-check real states, balances, time and reproducibility for this experiment."""
import hashlib
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
OUT = BASE / 'simulation/owned_books'
read = lambda p: json.loads(p.read_text(encoding='utf-8'))
checks = []


def check(name, ok, detail=None):
    checks.append({'name': name, 'ok': bool(ok), 'detail': detail})


rows = [read(p) for p in OUT.glob('*_seed*.json')]
check('80 distinct conditions on20 starts', len(rows) == 80 and len({(r['seed'], r['policy']) for r in rows}) == 80)
for r in rows:
    label = f"{r['policy']} seed{r['seed']}"
    check(label + ' execution', not r['failures'], r['failures'])
    horizon = r.get('seconds', 5400)
    n = r['count']
    check(label + ' time budget at integer ms', round((n['waitingSec'] + n['combatWallSec']) * 1000) == round(horizon * 1000))
    check(label + ' failed rounds pay no rewards', all(not any(x[k] for k in ['xp', 'actualXp', 'gold', 'drops', 'blueprints']) for x in r['rounds'] if not x['clear']))
    check(label + ' all dead monster identities matched', n['failedRoundUnmappedKills'] == 0)
    check(label + ' completed runs agree with rows', n['runs'] == len(r['runs']))
    if r['policy'] != 'adaptive':
        final = r['final']
        expected = r['initial']['resources']['gold'] + n['battleGold'] + n['commissionGold'] - sum(n.get(k, 0) for k in ['buildGold', 'researchGold', 'potionBuyGold', 'upgradeGold', 'shopGold', 'bookGold'])
        check(label + ' exact gold accounting', final['resources']['gold'] == expected, {'expected': expected, 'actual': final['resources']['gold']})
        check(label + ' potion inventory conserved', sum(r['initial']['potions'].values()) + n['potionsBought'] - n['potionsConsumed'] == sum(final['potions'].values()))
        check(label + ' gear inventory conserved', sum(not bool(i.get('box')) for i in final['items'].values()) == 6+n['drops']+n['boxesOpened']+n['shopItems']-n['salvaged']-n['overflow'])
        check(label + ' normal book costs', all(e['before']['gold']-e['after']['gold'] == 1000 and e['before']['materials'].get('dust', 0)-e['after']['materials'].get('dust', 0) == 10 and e['before']['materials'].get('herb', 0)-e['after']['materials'].get('herb', 0) == 10 and e['before']['blueprints'][e['id']]-e['after']['blueprints'].get(e['id'], 0) == 1 for e in r['events'] if e['kind'] == 'craftBook'))
        check(label + ' owned book learning spends a real book without gold', all(e['beforeGold']==e['afterGold'] and sum(e['beforeBooks'].values())-sum(e['afterBooks'].values())>=1 for e in r['events'] if e['kind']=='learnBook' and e.get('source')=='owned'))
        check(label + ' book learning counter agrees with actions', n['booksLearned']==sum(e['kind']=='learnBook' for e in r['events']))
        wins = [run for run in r['runs'] if run['stage'] == 1051 and run['won']]
        check(label + ' boss clear agrees with real run and progress', bool(wins) == r['won'] == (1051 in final['progress']['cleared']))
        check(label + ' stops at actual first win', not wins or len(wins) == 1 and wins[0] == r['runs'][-1] and wins[0]['t'] == r['clearSeconds'])
        check(label + ' recruitment not artificially unlocked before boss', not any(e['kind'] == 'hire' for e in r['events']))
    for c in r['checkpoints']:
        check(label + ' checkpoint no resource underflow', c['gold'] >= 0 and all(v >= 0 for v in c['materials'].values()) and all(v >= 0 for v in c['potions'].values()))

states = list((OUT / 'checkpoints').glob('state_*.json'))
for path in states:
    g = read(path)
    held = [u for bag in g['bags'] for u in bag] + g['stash'] + [u for h in g['heroes'] for u in h['equipped'].values() if u]
    check(path.stem + ' ownership', len(held) == len(set(held)) and all(u in g['items'] for u in held))
    check(path.stem + ' all owned items have holder', set(held) == set(g['items']))

info = read(OUT / 'run_info.json')
check('runtime errors absent', not info['errors'], info['errors'])
check('frozen source unchanged', not info['frozen_source_changed'])
check('active seed2 exact repeat', info.get('active_seed2_exact_repeat') is True)
check('control seed2 exact repeat', info.get('adaptive_seed2_exact_repeat') is True)
manifest = read(BASE / 'source_manifest.json')
check('all232 frozen hashes preserved', all(hashlib.sha256((BASE / 'snapshot/src' / k).read_bytes()).hexdigest() == v['sha256'] for k, v in manifest['files'].items()))
parity_dir = OUT / 'engine_parity'
if parity_dir.exists():
    parity = []
    for path in parity_dir.glob('*_seed*.json'):
        plain, observed = read(path), read(OUT / path.name)
        same_state = plain['final'] == observed['final']
        same_reports = plain['reportHashes'] == observed['reportHashes']
        check(path.stem + ' uninstrumented engine parity', same_state and same_reports)
        parity.append({'policy': plain['policy'], 'seed': plain['seed'], 'sameFinalState': same_state, 'sameEveryReportHash': same_reports, 'runs': len(plain['reportHashes'])})
    (OUT / 'engine_parity.json').write_text(json.dumps(parity, ensure_ascii=False, indent=2), encoding='utf-8')
    check('all9 planned parity accounts completed', len(parity) == 9)
result = {'checks': len(checks), 'passed': sum(c['ok'] for c in checks), 'failed': [c for c in checks if not c['ok']], 'accounts': len(rows), 'savedStates': len(states), 'details': checks}
(BASE / 'validation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({k: v for k, v in result.items() if k != 'details'}, ensure_ascii=True))
if result['failed']:
    raise SystemExit(1)
