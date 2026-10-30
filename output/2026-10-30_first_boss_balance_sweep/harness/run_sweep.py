"""Run every predeclared grid condition on paired starts using frozen modules."""
import argparse
import concurrent.futures
import hashlib
import itertools
import json
import os
import subprocess
import time
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
HERE = BASE / 'harness'
DEFAULT = {'enemyHp': 1, 'enemyAttack': 1, 'xp': 1, 'rounds': 9, 'bookLevel': 10, 'bossHp': 1, 'bossAttack': 1, 'starter': 1}
AXES = {'enemyHp': [1, .9, .8], 'enemyAttack': [1, .9], 'xp': [1, 1.25, 1.5], 'rounds': [9, 7],
        'bookLevel': [10, 9], 'bossHp': [1, .8], 'bossAttack': [1, .85], 'starter': [1, 1.25]}


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def main(args):
    folder = BASE / args.phase
    folder.mkdir(exist_ok=True)
    if args.jobs:
        jobs = json.loads(Path(args.jobs).read_text(encoding='utf-8'))
    elif args.phase == 'pilot':
        jobs = [{'id': 'baseline', 'variant': DEFAULT, 'seeds': list(range(1, 21)), 'horizon': 5400},
                {'id': 'hp80', 'variant': {**DEFAULT, 'enemyHp': .8}, 'seeds': list(range(1, 21)), 'horizon': 3600}]
    else:
        jobs = [{'id': f'g{i:04}', 'variant': dict(zip(AXES, values)), 'seeds': list(range(1, 21)), 'horizon': 3600}
                for i, values in enumerate(itertools.product(*AXES.values()))]
    manifest = json.loads((BASE / 'source_manifest.json').read_text(encoding='utf-8'))
    write(folder / 'jobs.json', jobs)
    write(folder / 'metadata.json', {'phase': args.phase, 'jobs': len(jobs), 'accounts': sum(len(j['seeds']) for j in jobs),
          'axes': AXES, 'workers': args.workers, 'snapshot_capture': manifest['captured_at_utc'],
          'harness_hashes': {n: hashlib.sha256((HERE/n).read_bytes()).hexdigest() for n in ['worker.cjs', 'observer.js', 'active.js']}})
    completed = {}
    for path in folder.glob('results_*.jsonl'):
        for line in path.read_text(encoding='utf-8').splitlines():
            row = json.loads(line)
            if row['id'] in completed and completed[row['id']] != row:
                raise ValueError('Duplicate nonidentical result '+row['id'])
            completed[row['id']] = row
    remaining = [j for j in jobs if j['id'] not in completed]
    chunks = [remaining[i::args.workers] for i in range(args.workers)]
    start = time.monotonic()

    def run(index, chunk):
        job_file = folder / f'worker_{index}.json'
        write(job_file, chunk)
        log = folder / f'worker_{index}.log'
        with log.open('w', encoding='utf-8') as stream:
            command = ['node', '--no-warnings', '--experimental-loader', (HERE/'loader.mjs').as_uri(), str(HERE/'worker_native.cjs'), str(job_file), str(folder/f'results_{index}.jsonl')]
            if args.vm:
                command = ['node', '--no-warnings', '--experimental-vm-modules', str(HERE/'worker.cjs'), str(job_file), str(folder/f'results_{index}.jsonl')]
            result = subprocess.run(command,
                                    cwd=BASE, stdin=subprocess.DEVNULL, stdout=stream, stderr=subprocess.STDOUT,
                                    creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        return index, result.returncode

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(run, i, c) for i, c in enumerate(chunks) if c]
        while futures and not all(f.done() for f in futures):
            done = sum(len(p.read_text(encoding='utf-8').splitlines()) for p in folder.glob('results_*.jsonl'))
            print(json.dumps({'phase': args.phase, 'completed_variants': done, 'total_variants': len(jobs), 'elapsed_seconds': round(time.monotonic()-start, 1)}), flush=True)
            time.sleep(10)
        exits = [f.result() for f in futures]
    results = {}
    for path in folder.glob('results_*.jsonl'):
        for line in path.read_text(encoding='utf-8').splitlines():
            result = json.loads(line)
            results[result['id']] = result
    errors = [{'id': r['id'], **x} for r in results.values() for x in r['rows'] if x.get('error') or x.get('failures')]
    info = {'jobs': len(jobs), 'completed': len(results), 'accounts': sum(len(r['rows']) for r in results.values()),
            'elapsed_seconds': time.monotonic()-start, 'worker_exits': exits, 'errors': errors,
            'missing': [j['id'] for j in jobs if j['id'] not in results]}
    write(folder/'run_info.json', info)
    print(json.dumps(info, ensure_ascii=True), flush=True)
    if errors or info['missing'] or any(code for _, code in exits):
        raise SystemExit(1)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--phase', default='grid')
    parser.add_argument('--workers', type=int, default=min(4, os.cpu_count() or 1))
    parser.add_argument('--jobs')
    parser.add_argument('--vm', action='store_true')
    main(parser.parse_args())
