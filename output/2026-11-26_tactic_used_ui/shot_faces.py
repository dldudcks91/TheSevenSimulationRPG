# -*- coding: utf-8 -*-
"""Party tab - hero strip portraits vs formation slot portraits (size), and the tactic card column width.
Run from PowerShell:  python output/2026-11-26_tactic_used_ui/shot_faces.py --port 8897 --tag before
"""
import argparse, json, os, sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ap = argparse.ArgumentParser()
ap.add_argument('--port', type=int, default=8897)
ap.add_argument('--tag', default='before')
args = ap.parse_args()
OUT = os.path.dirname(os.path.abspath(__file__))
BASE = f'http://127.0.0.1:{args.port}/index.html'
errors = []
MEASURE = '''() => {
  const sc = document.querySelector('#stage').getBoundingClientRect().width / 1600;   // one-sheet scale -> report in sheet px
  const box = n => { const b = n.getBoundingClientRect(); return {w: +(b.width / sc).toFixed(1), h: +(b.height / sc).toFixed(1)}; };
  const faces = root => [...document.querySelectorAll(root)].map(card => {
    const img = [...card.querySelectorAll('img')].find(i => /faces?\\//.test(i.src));
    if (!img) return null;
    let frame = img.parentElement;   // the clipping frame the face sits in
    return {card: box(card), frame: {cls: frame.className, ...box(frame)}, img: box(img), src: img.src.split('/').slice(-2).join('/')};
  }).filter(Boolean);
  return {scale: +sc.toFixed(3), strip: faces('.page > :first-child .hs-card'), form: faces('.pt-left .fm-cell'),
          tcCard: [...document.querySelectorAll('.tc-row .tc-card')].map(box)};
}'''
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for lang in ['ko']:
        ctx = browser.new_context(viewport={'width': 1600, 'height': 800})
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'{lang}: {e}'))
        page.goto(f'{BASE}?dev=tactics&cards=1&lang={lang}')
        page.wait_for_selector('.rs-board'); page.wait_for_timeout(500)
        m = page.evaluate(MEASURE)
        print('scale', m['scale'])
        print('strip:'); [print('  ', json.dumps(x, ensure_ascii=False)) for x in m['strip'][:4]]
        print('form:'); [print('  ', json.dumps(x, ensure_ascii=False)) for x in m['form'][:4]]
        print('tc-card:', json.dumps(m['tcCard']))
        page.screenshot(path=os.path.join(OUT, f'{lang}_1600_party_{args.tag}.png'))
        ctx.close()
    browser.close()
print('errors:', errors)
