"""Check the saved experiment's accounting, real outcomes and input provenance."""
import hashlib
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
checks = []


def check(name, passed, evidence=None):
    checks.append({'name': name, 'passed': bool(passed), 'evidence': evidence})


def read(name):
    return json.loads((OUT / name).read_text(encoding='utf-8'))


for baseline in ['archived', 'latest']:
    recovery = read(f'{baseline}_recover.json')
    initial = recovery['branches'][0]['initial']
    check(f'{baseline}: paired branches have identical input', all(b['initial'] == initial for b in recovery['branches']))
    check(f'{baseline}: control never clears boss', not recovery['branches'][0]['won'] and len(recovery['branches'][0]['runs']) == 400)
    for mode in ['recover', 'repeat_recover']:
        result = read(f'{baseline}_{mode}.json')
        check(f'{baseline}/{mode}: no browser exceptions or external requests', not result['page_errors'] and not result['external_requests'])
        for branch in result['branches']:
            label = f'{baseline}/{branch["policy"]}'
            potion_cost = sum(a['result']['gold'] for a in branch['actions'] if a['type'] == 'buyPotion')
            expected_gold = branch['initial']['gold'] + sum(r['gold'] for r in branch['runs']) - potion_cost
            check(label + ': gold accounts for actual rewards and purchases', branch['final']['gold'] == expected_gold,
                  {'expected': expected_gold, 'actual': branch['final']['gold'], 'potion_cost': potion_cost})
            check(label + ': elapsed time accounts for actual run pacing and restart delays',
                  abs(branch['elapsedSec'] - sum(r['elapsedSec'] + 5 for r in branch['runs'])) < 0.001)
            check(label + ': no new heroes or upgrades', all(branch['initial']['counters'][k] == branch['final']['counters'][k] for k in ['hero', 'upgrade', 'make', 'tavern']))
            if branch['won']:
                check(label + ': native completion agrees with paced winning report', branch['parity']['nativeWon'] and branch['parity']['identicalReport'])
                check(label + ': first chapter marked cleared', 1051 in branch['finalSave']['progress']['cleared'])
    repeated = read(f'{baseline}_repeat_recover.json')['branches'][0]
    check(f'{baseline}: practical place-repeat branch clears in three boss attempts and twenty farm attempts',
          repeated['won'] and repeated['bossAttempts'] == 3 and repeated['farmRuns'] == 20)
    check(f'{baseline}: actual place repetition traverses all three cells', {1021, 1022, 1023}.issubset({r['stage'] for r in repeated['runs']}))

ui = read('latest_ui_results.json')
check('latest: all twelve actual UI checks pass', len(ui['checks']) == 12 and all(c['passed'] for c in ui['checks']))
check('latest: UI has no exceptions or HTTP failures', not ui['page_errors'] and not ui['http_errors'])

manifest = read('latest_source_manifest.json')
changed, snapshot_mismatches = [], []
for key, expected in manifest.items():
    frozen = OUT / 'latest_snapshot/src' / key.lstrip('/')
    if not frozen.exists() or hashlib.sha256(frozen.read_bytes()).hexdigest() != expected:
        snapshot_mismatches.append(key)
    file = ROOT / 'src' / key.lstrip('/')
    if not file.exists() or hashlib.sha256(file.read_bytes()).hexdigest() != expected:
        changed.append(key)
check('latest: executed frozen input matches its recorded manifest', not snapshot_mismatches, snapshot_mismatches)
result = {'checks': checks, 'passed': sum(c['passed'] for c in checks), 'total': len(checks),
          'workspace_changes_after_freeze': changed,
          'provenance_note': 'All browser requests used the pinned source bytes. Subsequent shared-workspace edits are recorded separately and are not silently included in these results.'}
(OUT / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'passed': result['passed'], 'total': result['total'], 'failures': [c for c in checks if not c['passed']]}, ensure_ascii=True))
raise SystemExit(0 if all(c['passed'] for c in checks) else 1)
