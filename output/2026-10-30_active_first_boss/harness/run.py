"""Local frozen-source first-boss experiment. --pilot runs seeds 1, 2 and 15."""
import argparse
import asyncio
import hashlib
import http.server
import json
import threading
import time
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(__file__).resolve().parent.parent
SNAP = BASE / 'snapshot/src'
OUT = BASE / 'simulation'
OUT.mkdir(exist_ok=True)
MANIFEST = json.loads((BASE / 'source_manifest.json').read_text(encoding='utf-8'))
observer = (BASE / 'harness/observer.js').read_text(encoding='utf-8')
assert observer.count('SYS.battle.createRun=(...args)=>{') == 1
observer = observer.replace('SYS.battle.createRun=(...args)=>{', 'SYS.battle.createRun=(...args)=>{\nif(window.QA_UNOBSERVED)return originalCreateRun(...args);')
ACTIVE = (observer + '\n' + (BASE / 'harness/active.js').read_text(encoding='utf-8')).encode()
LEGACY = (BASE / 'harness/legacy_simulation.js').read_bytes()
MARKS = [600, 1200, 1500, 1800, 2100, 2400, 2700, 3600, 5400]


def write(path, data):
    path.parent.mkdir(exist_ok=True, parents=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SNAP), **kwargs)

    def log_message(self, *_args):
        pass

    def do_GET(self):
        key = self.path.split('?', 1)[0]
        if key in ['/active.html', '/legacy.html']:
            src = '/active.js' if key == '/active.html' else '/legacy.js'
            body = f'<!doctype html><script type="module" src="{src}"></script>'.encode()
            mime = 'text/html'
        elif key in ['/active.js', '/legacy.js']:
            body = ACTIVE if key == '/active.js' else LEGACY
            mime = 'text/javascript'
        elif key == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
            return
        elif key.startswith('/assets/') and not (SNAP / key.lstrip('/')).is_file():
            path = Path(MANIFEST['source']) / key.lstrip('/')
            if not path.is_file():
                self.send_error(404)
                return
            body = path.read_bytes()
            mime = self.guess_type(str(path))
        else:
            return super().do_GET()
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


async def main(args, server):
    seeds = [1, 2, 15] if args.pilot else list(range(1, 21))
    out = OUT / 'owned_books' if args.owned_books else OUT
    if args.pilot:
        out = out / 'pilot_final'
    jobs = [(seed, policy, False) for seed in seeds for policy in ['book_first', 'active', 'active_slow', 'adaptive']]
    jobs += [(2, 'active', True), (2, 'adaptive', True)]
    if args.parity:
        jobs = [(s, policy, False) for s in [2, 11, 15] for policy in ['active', 'active_slow', 'book_first']]
        out = out / 'engine_parity'
    queue = asyncio.Queue()
    for job in jobs:
        queue.put_nowait(job)
    info = {'errors': [], 'done': [], 'pilot': args.pilot, 'unobserved_parity': args.parity}
    out.mkdir(exist_ok=True, parents=True)
    write(out / 'run_metadata.json', {'snapshot_capture': MANIFEST['captured_at_utc'], 'jobs': jobs,
          'manifest_sha256': hashlib.sha256((BASE / 'source_manifest.json').read_bytes()).hexdigest(),
          'active_js_sha256': hashlib.sha256(ACTIVE).hexdigest(), 'legacy_js_sha256': hashlib.sha256(LEGACY).hexdigest(),
          'marks': MARKS, 'policies': {'book_first': '120s old combat-priority, reserve book funds/materials from first usable blueprint', 'active': '120s balanced class points plus observed defeats/new boxes', 'active_slow': '300s balanced plus observed defeats/new boxes', 'adaptive': 'previous combat-priority300s control'}})
    start = time.monotonic()
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='msedge', headless=True, args=['--disable-background-timer-throttling'])

        async def worker(index):
            ctx = await browser.new_context()
            await ctx.route('**/*', lambda route: route.continue_() if route.request.url.startswith(f'http://127.0.0.1:{server.server_port}/') else route.abort())
            page = await ctx.new_page()
            page.on('pageerror', lambda error: info['errors'].append({'worker': index, 'error': str(error)}))
            page.on('response', lambda response: info['errors'].append({'worker': index, 'status': response.status, 'url': response.url}) if response.status >= 400 else None)
            selected = {'replicate': False}

            async def checkpoint(payload):
                folder = out / ('replicate' if selected['replicate'] else 'checkpoints')
                label = f"{payload['policy']}_seed{payload['seed']}_{payload['mark']}"
                write(folder / (label + '.json'), payload['snapshot'])
                if payload['state'] is not None:
                    write(folder / ('state_' + label + '.json'), payload['state'])

            await page.expose_function('storeCheckpoint', checkpoint)
            while not queue.empty():
                seed, policy, replicate = await queue.get()
                selected['replicate'] = replicate
                target = out / ('replicate' if replicate else '') / f'{policy}_seed{seed}.json'
                if target.exists():
                    queue.task_done()
                    continue
                try:
                    await page.goto(f'http://127.0.0.1:{server.server_port}/' + ('legacy.html' if policy == 'adaptive' else 'active.html'))
                    await page.wait_for_function('window.qaReady===true', timeout=60000)
                    if policy == 'adaptive':
                        await page.evaluate('(marks)=>window.QA_MARKS=marks', MARKS)
                        result = await page.evaluate('seed=>window.runFunQA(seed,"adaptive",true,{})', seed)
                    else:
                        if args.parity:
                            await page.evaluate('window.QA_UNOBSERVED=true')
                        result = await page.evaluate('a=>window.runActiveQA(...a)', [seed, policy, True])
                    write(target, result)
                    record = {'seed': seed, 'policy': policy, 'replicate': replicate,
                              'arrival': result.get('arrivalSeconds'), 'clear': result.get('clearSeconds'),
                              'runs': result['count']['runs'], 'failures': len(result['failures'])}
                    info['done'].append(record)
                    print(json.dumps(record), flush=True)
                except Exception as error:
                    record = {'seed': seed, 'policy': policy, 'error': str(error)}
                    info['errors'].append(record)
                    print('JOBERROR ' + json.dumps(record), flush=True)
                queue.task_done()
            await ctx.close()

        await asyncio.gather(*(worker(i) for i in range(3)))
        await browser.close()
    info['wall_seconds'] = time.monotonic() - start
    info['frozen_source_changed'] = [key for key, value in MANIFEST['files'].items()
                                     if hashlib.sha256((SNAP / key).read_bytes()).hexdigest() != value['sha256']]
    for policy in ['active', 'adaptive']:
        a, b = out / f'{policy}_seed2.json', out / 'replicate' / f'{policy}_seed2.json'
        if a.exists() and b.exists():
            x, y = json.loads(a.read_text(encoding='utf-8')), json.loads(b.read_text(encoding='utf-8'))
            x.pop('wallSeconds', None)
            y.pop('wallSeconds', None)
            info[policy + '_seed2_exact_repeat'] = x == y
    write(out / 'run_info.json', info)
    print(json.dumps({key: value for key, value in info.items() if key != 'done'}), flush=True)
    if info['errors']:
        raise SystemExit(1)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--pilot', action='store_true')
    parser.add_argument('--parity', action='store_true')
    parser.add_argument('--owned-books', action='store_true')
    args = parser.parse_args()
    class Server(http.server.ThreadingHTTPServer):
        request_queue_size = 256

    server = Server(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        asyncio.run(main(args, server))
    finally:
        server.shutdown()
        server.server_close()
