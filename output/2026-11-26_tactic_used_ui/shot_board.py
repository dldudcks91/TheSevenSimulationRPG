# -*- coding: utf-8 -*-
"""Tactic board (leader + seven sins bars) under the cards - screenshot + measured geometry.
Run from PowerShell:  python output/2026-11-26_tactic_used_ui/shot_board.py --port 8897 --tag before
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
MEASURE = '''b => {
  const r = n => n.getBoundingClientRect();
  const rows = [...b.querySelectorAll('.rs-bd-row')].map(row => {
    const bar = row.querySelector('.rs-bd-bar'), cells = [...bar.querySelectorAll('rect, :scope > i')].map(r);
    const gaps = cells.slice(1).map((c, i) => +(c.left - cells[i].right).toFixed(2));
    const widths = cells.map(c => +c.width.toFixed(2));
    return {txt: row.innerText.replace(/\\n/g, ' '), top: Math.round(r(row).top), h: +r(row).height.toFixed(1), barH: +r(bar).height.toFixed(1),
            cellH: +(cells[0]?.height ?? 0).toFixed(1), gapMin: Math.min(...gaps), gapMax: Math.max(...gaps), wMin: Math.min(...widths), wMax: Math.max(...widths)};
  });
  return {board: {h: Math.round(r(b).height), w: Math.round(r(b).width)}, rows};
}'''
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    for lang, size in [('ko', (1600, 800)), ('en', (1600, 800)), ('ko', (1366, 768)), ('ko', (1920, 1080))]:
        ctx = browser.new_context(viewport={'width': size[0], 'height': size[1]})
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(f'{lang}: {e}'))
        page.goto(f'{BASE}?dev=tactics&cards=1&lang={lang}')
        page.wait_for_selector('.rs-board'); page.wait_for_timeout(400)
        m = page.locator('.pt-tactics .rs-board').evaluate(MEASURE)
        geo = page.evaluate('''() => {
          const r = s => [...document.querySelectorAll(s)].map(n => { const b = n.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom)]; });
          return {col: r('.pt-tactics'), rows: r('.tc-row'), cards: r('.tc-row .tc-card'), board: r('.pt-tactics .rs-board'), left: r('.pt-mid > :first-child')};
        }''')
        print(lang, size, json.dumps(m['board']), json.dumps(geo))
        for row in m['rows']:
            print('   ', json.dumps(row, ensure_ascii=False))
        page.locator('.pt-tactics').screenshot(path=os.path.join(OUT, f'{lang}_{size[0]}_board_{args.tag}.png'))
        ctx.close()
    browser.close()
print('errors:', errors)
