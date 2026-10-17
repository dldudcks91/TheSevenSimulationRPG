"""Verify material-style files, preservation, selection, playback and settings.

Run a local `python serve.py 8792` first, then run this script.
Requires Pillow, numpy and Playwright with Microsoft Edge.
"""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src/assets/art/fx_source/material_20261017'
STYLES = ['darktoon', 'ink', 'pixel2d', 'papercut', 'pastel', 'foil', 'riso', 'clay']


def verify(url: str) -> None:
    manifest = json.loads((SOURCE / 'manifest.json').read_text(encoding='utf-8'))
    preserved = json.loads((SOURCE / 'preserved_sha256.json').read_text(encoding='utf-8'))
    for path, digest in preserved.items():
        assert hashlib.sha256((ROOT / path).read_bytes()).hexdigest() == digest, path
    runtime = ROOT / 'src/assets/art/fx/skills'
    counts = Counter(p.stem.rsplit('_', 1)[-1] for p in runtime.glob('*'))
    assert set(counts) == set(STYLES), counts
    for style in manifest['styles']:
        assert counts[style] == 88
        for file in manifest['active_files']:
            path = runtime / f'{file}_{style}.webp'
            sprite = Image.open(path).convert('RGBA')
            alpha = np.asarray(sprite)[..., 3]
            assert sprite.size == (256, 256) and alpha.min() == 0 and alpha.max() > 224, path
    report = {'preserved_unchanged': len(preserved), 'runtime_counts': dict(counts),
              'page_errors': [], 'fx_network_errors': [], 'styles': [], 'settings': [], 'removed_preferences': {}}
    review = ROOT / 'tmp/material_fx_review'
    review.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        context = browser.new_context(viewport={'width': 1600, 'height': 1080}, device_scale_factor=1)
        page = context.new_page()
        page.on('pageerror', lambda error: report['page_errors'].append(str(error)))
        page.on('response', lambda response: report['fx_network_errors'].append({'url': response.url, 'status': response.status}) if '/assets/art/fx/' in response.url and response.status >= 400 else None)
        page.goto(url + '/index.html?dev=newgame&tab=codex&cx=fx&cxf=papercut&lang=ko')
        page.wait_for_selector('.cx-fx-card', timeout=60000)
        styles = page.evaluate("async () => (await import('./ui/skill_art.js')).ART_STYLES")
        assert styles == STYLES, styles
        bar = page.locator('.sub-bar').filter(has=page.locator('.cx-fx-all'))
        report['ko_tabs'] = bar.locator('.segmented button').all_text_contents()
        assert len(report['ko_tabs']) == 8
        for index, style in enumerate(styles):
            bar.locator('.segmented button').nth(index).click()
            result = page.evaluate('''async style => {
                const {SKILL_ART, artFile} = await import('./ui/skill_art.js');
                const {fxPreload} = await import('./ui/fx.js');
                await fxPreload(style);
                const names = new Set();
                function add(d) { if (!d) return; names.add(artFile(d.file, style)); add(d.then); }
                Object.values(SKILL_ART).forEach(events => Object.values(events).forEach(add));
                const errors = [];
                await Promise.all([...names].map(async name => {
                    const image = new Image(); image.src = `./assets/art/fx/skills/${name}.webp`;
                    try { await image.decode(); } catch { errors.push(name); }
                }));
                return {style, files: names.size, errors};
            }''', style)
            assert result['files'] == 88 and not result['errors'], result
            page.locator('.cx-fx-all').click()
            page.wait_for_selector('.fx-skill-stamp', state='attached', timeout=5000)
            result['rendered_stamps'] = page.locator('.fx-skill-stamp').count()
            assert result['rendered_stamps'] > 0
            report['styles'].append(result)
            if style in manifest['styles']:
                page.screenshot(path=str(review / f'codex_{style}_ko.png'))
        page.locator('.dp-btn').click()
        panel = page.locator('.dp-panel')
        for style, spec in manifest['styles'].items():
            panel.get_by_role('button', name=spec['ko'], exact=True).click()
            assert page.evaluate("localStorage.getItem('thesevensim.fxArt')") == style
            report['settings'].append(style)
        page.locator('.dp-btn').click()
        page.reload()
        page.wait_for_selector('.cx-fx-card')
        assert page.evaluate("async () => (await import('./ui/fx.js')).fxArtStyle()") == 'clay'
        report['persisted_style'] = 'clay'
        page.goto(url + '/index.html?dev=newgame&tab=codex&cx=fx&cxf=clay&lang=en')
        page.wait_for_selector('.cx-fx-card')
        report['en_tabs'] = bar.locator('.segmented button').all_text_contents()
        assert report['en_tabs'] == ['Dark Cartoon', 'Ink', 'Clean Pixel', 'Paper Collage', 'Oil Pastel', 'Metal Foil', 'Riso Print', 'Clay · In Battle'], report['en_tabs']
        page.screenshot(path=str(review / 'codex_clay_en.png'))
        for removed in ['cel2d', 'comic2d', 'mobile2d', 'spirit2d', 'code']:
            page.evaluate("style => localStorage.setItem('thesevensim.fxArt', style)", removed)
            page.reload()
            page.wait_for_selector('.cx-fx-card')
            fallback = page.evaluate("async () => (await import('./ui/fx.js')).fxArtStyle()")
            assert fallback == 'darktoon', (removed, fallback)
            report['removed_preferences'][removed] = fallback
        browser.close()
    assert not report['page_errors'], report['page_errors']
    assert not report['fx_network_errors'], report['fx_network_errors']
    (SOURCE / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8792')
    verify(parser.parse_args().url.rstrip('/'))
