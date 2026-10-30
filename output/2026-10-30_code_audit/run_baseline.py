"""Read-only audit: freeze sources, run the real assertion suite and browser smoke cases."""
import hashlib
import json
import mimetypes
import time
from pathlib import Path
from urllib.parse import urlparse, unquote

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
BASE = 'http://127.0.0.1:8921'
EXTS = {'.js', '.csv', '.json', '.html', '.css'}


def capture():
    sources = {}
    for p in (ROOT / 'src').rglob('*'):
        if p.is_file() and p.suffix in EXTS:
            rel = p.relative_to(ROOT / 'src')
            data = p.read_bytes()
            sources['/' + rel.as_posix()] = data
            target = OUT / 'snapshot' / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
    manifest = {p: hashlib.sha256(b).hexdigest() for p, b in sources.items()}
    (OUT / 'source_manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    return sources


def main():
    sources = capture()
    started = time.time()
    results = {'suite': None, 'smoke': [], 'source_file_count': len(sources)}

    def save():
        results['elapsed_sec'] = round(time.time() - started, 2)
        (OUT / 'baseline.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')

    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='msedge', headless=True)

        def new_context():
            context = browser.new_context(viewport={'width': 1600, 'height': 1000})
            def route_file(route):
                url = urlparse(route.request.url)
                if url.hostname != '127.0.0.1':
                    return route.abort()
                path = unquote(url.path)
                if path in sources:
                    return route.fulfill(content_type=mimetypes.guess_type(path)[0] or 'text/plain', body=sources[path])
                return route.continue_()
            context.route('**/*', route_file)
            return context

        context = new_context()
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(BASE + '/dev/test.html', wait_until='domcontentloaded')
        page.wait_for_function("/^(PASS|FAIL)/.test(document.title)", timeout=240000)
        results['suite'] = {'title': page.title(), 'passed': page.locator('#out li.ok').count(), 'failed': page.locator('#out li.fail').count(), 'failures': page.locator('#out li.fail').all_text_contents(), 'page_errors': errors, 'checks': page.locator('#out li').all_text_contents()}
        print(json.dumps({k: v for k, v in results['suite'].items() if k != 'checks'}, ensure_ascii=True), flush=True)
        context.close()
        save()

        scenarios = [
            'dev=newgame', 'dev=battle&runs=3', 'dev=play', 'dev=play&stage=2051&lv=30',
            'dev=join', 'dev=visit', 'dev=gamble&spin=1', 'dev=gamble&hold=1',
            'dev=commission&done=1', 'dev=offline', 'dev=form&stage=1051',
            'dev=prologue', 'dev=book', 'dev=tree&adv=1', 'dev=arena&friendly=1',
            'dev=colosseum', 'dev=tactics', 'dev=tip&alt=1', 'dev=box&open=mail',
            'dev=frozen', 'dev=watch', 'dev=mg&mg=mine', 'dev=mg&mg=gather', 'dev=mg&mg=log',
        ]
        for language in ['ko', 'en']:
            for query in scenarios:
                context = new_context()
                page = context.new_page()
                errors, console_errors, missing = [], [], []
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('console', lambda m: console_errors.append(m.text) if m.type == 'error' and 'net::ERR_FAILED' not in m.text else None)
                page.on('response', lambda r: missing.append({'url': r.url, 'status': r.status}) if r.status >= 400 else None)
                result = {'query': query + '&lang=' + language}
                try:
                    page.goto(BASE + '/index.html?' + result['query'], wait_until='domcontentloaded')
                    page.wait_for_function("document.querySelector('#app:not(.booting)') && document.querySelector('.main').textContent.trim().length > 0", timeout=60000)
                    page.wait_for_timeout(350)
                    result.update(main_text=page.locator('.main').inner_text()[:400], broken_images=page.locator('img').evaluate_all('ns => ns.filter(n => n.complete && !n.naturalWidth).map(n => n.src)'))
                except Exception as e:
                    result['exception'] = str(e)
                result.update(page_errors=errors, console_errors=console_errors, missing=missing)
                results['smoke'].append(result)
                print(json.dumps({'query': result['query'], 'exception': result.get('exception'), 'page_errors': errors, 'console_errors': console_errors, 'missing_count': len(missing), 'broken_images': result.get('broken_images', [])}, ensure_ascii=True), flush=True)
                context.close()
                save()
        browser.close()
    results['source_changed_during_run'] = [p for p, b in sources.items() if (ROOT / 'src' / p.lstrip('/')).read_bytes() != b]
    save()


if __name__ == '__main__':
    main()
