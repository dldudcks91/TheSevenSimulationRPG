"""Open a page on the snapshot server headless, wait until <title> starts with a prefix, save a selector's text.
python run_page.py <out_name> <path?query> <title_prefix,...> [selector] [port] [max_sec]
Stops early on a page error / failed request (module import failures leave the title unchanged forever).
"""
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

name, path, prefixes = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
sel = sys.argv[4] if len(sys.argv) > 4 else '#sim'
port = sys.argv[5] if len(sys.argv) > 5 else '8813'
max_sec = float(sys.argv[6]) if len(sys.argv) > 6 else 6 * 3600
OUT = Path(__file__).resolve().parent.parent / 'out'
OUT.mkdir(exist_ok=True)
t0 = time.time()
errs = []
with sync_playwright() as pw:
    b = pw.chromium.launch(channel='msedge', headless=True)
    p = b.new_page()
    p.set_default_timeout(0)
    p.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)[:500]))
    # 'Failed to load resource' carries no URL — the response hook below reports those with the URL (favicon filtered)
    p.on('console', lambda m: errs.append('console.' + m.type + ': ' + m.text[:500]) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    p.on('response', lambda r: errs.append(f'http {r.status}: {r.url}') if r.status >= 400 and 'favicon' not in r.url and '/assets/art/' not in r.url else None)
    p.goto(f'http://127.0.0.1:{port}/' + path)
    last = ''
    while True:
        tl = p.title()
        if any(tl.startswith(x) for x in prefixes):
            break
        if errs and time.time() - t0 > 20:
            tl = 'HARNESS ABORT (page error)'
            break
        if time.time() - t0 > max_sec:
            tl = 'HARNESS TIMEOUT ' + tl
            break
        if tl != last:
            print(round(time.time() - t0), tl, flush=True)
            last = tl
        time.sleep(3)
    if sel == 'fails':
        data = '\n'.join(x[:400] for x in p.locator('li.fail').all_inner_texts())
    else:
        data = p.locator(sel).inner_text() if p.locator(sel).count() else ''
    err = p.locator('#err').inner_text() if p.locator('#err').count() else ''
    (OUT / (name + '.txt')).write_text(data, encoding='utf-8')
    (OUT / (name + '.done')).write_text(json.dumps({'title': tl, 'sec': round(time.time() - t0, 1), 'err': err[:3000], 'page': errs[:30]}, ensure_ascii=False), encoding='utf-8')
    b.close()
print(tl, round(time.time() - t0, 1))
