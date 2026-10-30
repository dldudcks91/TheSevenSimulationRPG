"""Independent D10/D60 accounting, frozen-source and native-engine checks.

Run from the repository root. --engine also compares the observation wrapper's
first expedition with the untouched resolveBattle path for seeds 1 through 10.
Only this QA folder is written; no product files or golden inputs are changed.
"""
import argparse
import csv
import hashlib
import http.server
import json
import threading
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
SNAP = BASE / 'snapshot/src'
OUT = BASE / 'simulation/pilot'


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def csv_rows(name):
    with (SNAP / 'data' / name).open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))


def event_kind(event):
    # The existing observation helper spreads detail after {kind}; box kind
    # and commission kind consequently occupy that same field. Payloads retain
    # the information needed to identify these three distinct observation types.
    if event['kind'] in ('weapon', 'armor'):
        if 'items' in event and 'hero' in event:
            return 'boxOpened'
        if 'tier' in event and 'stage' in event:
            return 'boxGranted'
    if all(key in event for key in ('no', 'axis', 'ref', 'need', 'gold')):
        return 'commissionTake'
    return event['kind']


def native_parity():
    from playwright.sync_api import sync_playwright

    script = (BASE / 'harness/fun_simulation.js').read_text(encoding='utf-8') + '''
window.compareOriginalEngine = async seed => {
    window.QA_MARKS=[600];
    await window.runFunQA(seed,'passive',false);
    const observed=clone(CURRENT.G.reports.find(r=>r.at===START));
    const observedFactory=SYS.battle.createRun;
    let direct,initial;
    try {
        SYS.battle.createRun=originalCreateRun;
        const G=Q.newGame(seed,SYS.hero.rollStartParty(makeRng(1000+seed),D.balance.party_size_max),START);
        initial={gear:Object.values(G.items).filter(i=>!i.box).length,gold:G.resources.gold,
          potions:clone(G.potions),buildings:clone(G.buildings),party:clone(Q.partyOf(G))};
        direct=clone(Q.resolveBattle(G,D.stageOrder[0],START).report);
    } finally {SYS.battle.createRun=observedFactory;}
    return {seed,identical:JSON.stringify(observed)===JSON.stringify(direct),initial,observed,direct};
};
'''

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(SNAP), **kwargs)

        def log_message(self, *_args):
            pass

        def do_GET(self):
            key = self.path.split('?', 1)[0]
            if key in ('/qa.html', '/qa.js'):
                body = (b'<!doctype html><script type="module" src="/qa.js"></script>'
                        if key == '/qa.html' else script.encode('utf-8'))
                self.send_response(200)
                self.send_header('Content-Type', 'text/html' if key.endswith('.html') else 'text/javascript')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            elif key == '/favicon.ico':
                self.send_response(204)
                self.end_headers()
            else:
                super().do_GET()

    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    results, errors = [], []
    origin = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(channel='msedge', headless=True)
            context = browser.new_context()
            context.route('**/*', lambda route: route.continue_()
                          if route.request.url.startswith(origin + '/') else route.abort())
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(origin + '/qa.html')
            page.wait_for_function('window.qaReady===true', timeout=60000)
            for seed in range(1, 11):
                results.append(page.evaluate('seed=>window.compareOriginalEngine(seed)', seed))
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    value = {'seeds': len(results), 'all_identical': all(row['identical'] for row in results),
             'errors': errors, 'results': results,
             'harness_sha256': hashlib.sha256((BASE / 'harness/fun_simulation.js').read_bytes()).hexdigest()}
    write(OUT / 'engine_observation_parity.json', value)
    return value


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--engine', action='store_true')
    args = parser.parse_args()
    if args.engine:
        native_parity()

    checks = []

    def check(name, ok, detail=None):
        entry = {'name': name, 'ok': bool(ok)}
        if detail is not None:
            entry['detail'] = detail
        checks.append(entry)

    manifest_path = BASE / 'source_manifest.json'
    manifest = read(manifest_path)
    metadata = read(OUT / 'run_metadata.json')
    info = read(OUT / 'run_info.json')
    balance = {row['key']: float(row['value']) for row in csv_rows('balance.csv')}
    start_potions = {row['potion_id']: int(row['start_owned']) for row in csv_rows('potion.csv')}
    start_ranks = {row['building_id']: int(row['start_rank']) for row in csv_rows('building.csv')
                   if int(row['start_rank'])}
    initial_gear = int(balance['party_size_max']) * 2
    changed = [key for key, value in manifest['files'].items()
               if not (SNAP / key).is_file()
               or hashlib.sha256((SNAP / key).read_bytes()).hexdigest() != value['sha256']]
    check('all frozen product files retain manifest hashes', not changed, changed)
    check('execution source manifest hash agrees', metadata['source_manifest_sha256'] == hashlib.sha256(manifest_path.read_bytes()).hexdigest())
    harness_hash = hashlib.sha256((BASE / 'harness/fun_simulation.js').read_bytes()).hexdigest()
    check('executed observation harness hash agrees', metadata['harness_sha256'] == harness_hash)
    check('exact D10 and D60 marks', metadata['marks'] == [600, 3600] and metadata['short'] is True)
    check('default speed one', metadata['speed'] == 1)
    check('runner browser errors absent', not info['errors'], info['errors'])
    check('runner frozen source changes absent', not info['frozen_source_changed'])

    rows = [read(path) for path in OUT.glob('*_seed*.json')]
    expected = {(seed, policy) for seed in range(1, 21) for policy in ('basic', 'adaptive')}
    expected.update((seed, 'passive') for seed in range(1, 11))
    check('all 50 distinct primary accounts present', len(rows) == 50 and {(row['seed'], row['policy']) for row in rows} == expected)
    save_files = list((OUT / 'checkpoints').glob('state_*.json'))
    check('100 primary checkpoint saves present', len(save_files) == 100)
    time_residuals, inferred_lab_gold = [], []
    total_runs = 0
    for row in rows:
        prefix = f"{row['policy']} seed {row['seed']}"
        check(prefix + ' engine/action/invariant failures absent', not row['failures'], row['failures'])
        check(prefix + ' checkpoint order', [c['seconds'] for c in row['checkpoints']] == [600, 3600])
        check(prefix + ' final counter snapshot identical', row['count'] == row['checkpoints'][-1]['count'])
        check(prefix + ' timing metadata', row['metadata']['checkpoint'] == 'before_exact_mark_management'
              and row['metadata']['managementSeconds'] == 300 and row['metadata']['labTickSeconds'] == 60
              and row['metadata']['pace'] == {'speed': 1, 'rise': 0, 'focus': 0, 'gap': 950})
        check(prefix + ' completed-run counters', len(row['runs']) == row['count']['runs']
              and sum(run['won'] for run in row['runs']) == row['count']['wins']
              and sum(not run['won'] for run in row['runs']) == row['count']['losses'])
        total_runs += row['count']['runs']
        check(prefix + ' every failed round has no paid reward', all(
            all(round_[key] == 0 for key in ('xp', 'actualXp', 'gold', 'drops', 'blueprints'))
            for round_ in row['rounds'] if not round_['clear']))
        check(prefix + ' failed-kill observation maps every kill', row['count']['failedRoundUnmappedKills'] == 0)
        check(prefix + ' gained hero XP never negative', all(round_['actualXp'] >= 0 for round_ in row['rounds']))
        check(prefix + ' round potion counts close', sum(round_['potionUnits'] for round_ in row['rounds']) == row['count']['potionsConsumed'])
        check(prefix + ' round drop counts close', sum(round_['drops'] for round_ in row['rounds']) == row['count']['drops'])
        check(prefix + ' round gold counts close', sum(round_['gold'] for round_ in row['rounds']) == row['count']['battleGold'])
        ranks = dict(start_ranks)
        for event in row['events']:
            if event['kind'] == 'construct':
                ranks[event['id']] = ranks.get(event['id'], 0) + 1
                check(prefix + f" legal {event['id']} rank {event['rank']}", ranks[event['id']] == event['rank'])
        for snapshot in row['checkpoints']:
            mark, count = snapshot['seconds'], snapshot['count']
            name = prefix + f' at {mark}s'
            budget = count['waitingSec'] + count['combatWallSec']
            time_residuals.append({'account': prefix, 'mark': mark, 'raw_seconds_error': budget - mark})
            # Product wall clocks are integer milliseconds. Verify at their
            # resolution instead of adding an arbitrary epsilon to the result.
            check(name + ' full online millisecond time budget', round(count['waitingSec'] * 1000)
                  + round(count['combatWallSec'] * 1000) == mark * 1000)
            check(name + ' potion inventory conserved', sum(start_potions.values()) + count['potionsBought']
                  - count['potionsConsumed'] == sum(snapshot['potions'].values()))
            check(name + ' first clears conserved', count['firstClears'] == len(snapshot['cleared'])
                  + sum(map(len, snapshot['clearedIn'].values())))
            check(name + ' level ups conserved', count['levelUps'] == sum(snapshot['levels']) - int(balance['party_size_max']))
            check(name + ' no future first events', all(event['t'] <= mark for event in snapshot['first'].values()))
            # Counter prefixes tell apart before-mark events from regular
            # management at exactly the mark, which happens after this save.
            for kind, number in count['actions'].items():
                events = [event for event in row['events'] if event_kind(event) == kind]
                check(name + ' action counter prefix ' + kind, len(events) >= number
                      and all(event['t'] < mark for event in events[:number]))
            if row['policy'] == 'basic':
                check(name + ' scheduled management before mark', count['autoEquipCalls']
                      == int(balance['party_size_max']) * (mark // 300))
            if row['policy'] == 'passive':
                check(name + ' no management actions', not count['actions'] and count['autoEquipCalls'] == 0)
            lab_gold = snapshot['gold'] - balance['start_gold'] - count['battleGold'] - count['commissionGold'] \
                + count['buildGold'] + count['researchGold'] + count['potionBuyGold'] + count['upgradeGold']
            inferred_lab_gold.append({'account': prefix, 'mark': mark, 'gold': lab_gold})
            check(name + ' gold sources and sinks close without credits', lab_gold >= 0 and lab_gold.is_integer(), lab_gold)
            standalone = read(OUT / 'checkpoints' / f"{row['policy']}_seed{row['seed']}_{mark}.json")
            check(name + ' standalone checkpoint identical', standalone == snapshot)
            state = read(OUT / 'checkpoints' / f"state_{row['policy']}_seed{row['seed']}_{mark}.json")
            check(name + ' save timestamp matches exact mark', state['savedAt'] - state['createdAt'] == mark * 1000)
            held = state['stash'] + [uid for bag in state['bags'] for uid in bag] \
                + [uid for hero in state['heroes'] for uid in hero['equipped'].values() if uid]
            check(name + ' every held UID is unique', len(set(held)) == len(held))
            check(name + ' item ownership has no missing or orphan UID', set(held) == set(state['items']))
            check(name + ' owned gear count conserved', sum(not item.get('box') for item in state['items'].values())
                  == initial_gear + count['drops'] + count['boxesOpened'] - count['salvaged'] - count['overflow'])
            check(name + ' unconsumed box stack quantities conserved', sum(item['box'].get('n', 1)
                  for item in state['items'].values() if item.get('box'))
                  + sum(mail.get('n', 1) for mail in state['mail']) == count['boxesGranted'] - count['boxesOpened'])
            check(name + ' saved inventories agree', [len(bag) for bag in state['bags']] == snapshot['bags']
                  and state['resources']['gold'] == snapshot['gold'] and state['potions'] == snapshot['potions']
                  and state['buildings'] == snapshot['buildings'])
            check(name + ' bag capacity respected', all(len(bag) <= snapshot['bagCap'] for bag in state['bags']))

    original, replica = read(OUT / 'basic_seed2.json'), read(OUT / 'replicate/basic_seed2.json')
    original.pop('wallSeconds')
    replica.pop('wallSeconds')
    check('seed2 entire result repeats exactly except runtime', original == replica)
    check('runner independently reports exact seed2 repeat', info['seed2_repeat_identical_except_runtime'] is True)
    parity_path = OUT / 'engine_observation_parity.json'
    check('native engine comparison exists', parity_path.is_file())
    if parity_path.is_file():
        parity = read(parity_path)
        check('native first expedition equals wrapped engine in all 10 seeds', parity['seeds'] == 10
              and {row['seed'] for row in parity['results']} == set(range(1, 11))
              and parity['all_identical'] and not parity['errors'])
        check('native parity used same harness bytes', parity['harness_sha256'] == harness_hash)
        for row in parity['results']:
            initial = row['initial']
            check(f"seed {row['seed']} native initial resources agree with independent CSV", initial['gear'] == initial_gear
                  and initial['gold'] == balance['start_gold']
                  and initial['potions'] == {key: value for key, value in start_potions.items() if value}
                  and initial['buildings'] == start_ranks)
    value = {'checks': len(checks), 'passed': sum(check_['ok'] for check_ in checks),
             'failed': [check_ for check_ in checks if not check_['ok']],
             'primary_accounts': len(rows), 'checkpoint_saves': len(save_files), 'completed_expeditions': total_runs,
             'provenance': {'source_manifest_sha256': metadata['source_manifest_sha256'], 'harness_sha256': harness_hash},
             'initial_values': {'gear': initial_gear, 'gold': balance['start_gold'], 'potions': start_potions, 'buildings': start_ranks},
             'time_accounting': {'resolution': 'integer product-clock milliseconds',
                                 'max_raw_seconds_error': max(abs(row['raw_seconds_error']) for row in time_residuals)},
             'gold_accounting': {'inferred_laboratory_gold': inferred_lab_gold,
                                 'interpretation': 'nonnegative integer residual; no external resources were added by harness'},
             'details': checks}
    write(OUT / 'validation.json', value)
    print(json.dumps({key: value[key] for key in ('checks', 'passed', 'failed', 'primary_accounts', 'checkpoint_saves', 'completed_expeditions')}, ensure_ascii=True))
    return 0 if not value['failed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
