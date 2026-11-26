# -*- coding: utf-8 -*-
"""Why is the hero card box a bit larger than its portrait? - borders, padding and children of one strip card and one formation cell.
Run from PowerShell:  python output/2026-11-26_tactic_used_ui/probe_card_box.py --port 8897
"""
import argparse, json, sys
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
ap = argparse.ArgumentParser()
ap.add_argument('--port', type=int, default=8897)
args = ap.parse_args()
PROBE = '''sel => {
  const card = document.querySelector(sel);
  const cs = getComputedStyle(card), b = card.getBoundingClientRect();
  const side = k => ['Top', 'Right', 'Bottom', 'Left'].map(s => cs[k + s + (k === 'border' ? 'Width' : '')]).join(' ');
  return {cls: card.className, box: [+b.width.toFixed(1), +b.height.toFixed(1)], border: side('border'), padding: side('padding'),
          kids: [...card.children].map(k => { const r = k.getBoundingClientRect(), s = getComputedStyle(k);
            return {cls: k.className, pos: s.position, w: +r.width.toFixed(1), h: +r.height.toFixed(1), dy: +(r.top - b.top).toFixed(1), dx: +(r.left - b.left).toFixed(1)}; })};
}'''
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_context(viewport={'width': 1600, 'height': 800}).new_page()
    page.goto(f'http://127.0.0.1:{args.port}/index.html?dev=tactics&cards=1&lang=ko')
    page.wait_for_selector('.rs-board'); page.wait_for_timeout(500)
    for sel in ['.page > :first-child .hs-card', '.pt-left .fm-cell']:
        print(sel); print(json.dumps(page.evaluate(PROBE, sel), ensure_ascii=False, indent=1))
    browser.close()
