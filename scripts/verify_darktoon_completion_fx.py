"""Check complete dark-cartoon coverage, foil fallback, playback and settings."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src/assets/art/fx_source/darktoon_completion_20261024'


def verify(url):
    manifest = json.loads((SOURCE / 'manifest.json').read_text(encoding='utf-8'))
    added = [entry for sheet in manifest['sheets'] for entry in sheet['cells']]
    report = {'page_errors': [], 'fx_network_errors': [], 'styles': [], 'removed_preferences': {}}
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        page = browser.new_page(viewport={'width': 1600, 'height': 1080})
        page.on('pageerror', lambda error: report['page_errors'].append(str(error)))
        page.on('console', lambda message: print('Browser error:', message.text) if message.type == 'error' else None)
        page.on('response', lambda r: report['fx_network_errors'].append({'url': r.url, 'status': r.status})
                if '/assets/art/fx/' in r.url and r.status >= 400 else None)
        page.goto(url + '/index.html?dev=newgame&tab=codex&cx=fx&cxf=darktoon&lang=ko')
        assert not report['page_errors'], report['page_errors']
        try:
            page.wait_for_selector('.cx-fx-card, .main .down', timeout=60000)
            assert page.locator('.cx-fx-card').count(), page.locator('body').inner_text()
        except Exception:
            page.screenshot(path=str(SOURCE / 'startup_error.png'))
            print(json.dumps({'startup_errors': report['page_errors'], 'body': page.locator('body').inner_text()[:2500]}, ensure_ascii=False))
            raise
        assert page.evaluate("async () => (await import('./ui/skill_art.js')).ART_STYLES") == ['darktoon', 'foil']
        bar = page.locator('.sub-bar').filter(has=page.locator('.cx-fx-all'))
        report['ko_tabs'] = bar.locator('.segmented button').all_text_contents()
        assert len(report['ko_tabs']) == 2
        for index, style in enumerate(['darktoon', 'foil']):
            bar.locator('.segmented button').nth(index).click()
            result = page.evaluate('''async ({style, added}) => {
                const {SKILL_ART, artFile} = await import('./ui/skill_art.js');
                const {fxPreload, fxPreview} = await import('./ui/fx.js');
                await fxPreload(style);
                const files = new Set();
                const add = d => { if (!d) return; const f = artFile(d.file, style); if (f) files.add(f); add(d.then); };
                Object.values(SKILL_ART).forEach(events => Object.values(events).forEach(add));
                const errors = [];
                await Promise.all([...files].map(async f => {
                    const image = new Image(); image.src = `./assets/art/fx/skills/${f}.webp`;
                    try { await image.decode(); } catch { errors.push(f); }
                }));
                const newPlayback = added.map((entry, index) => {
                    const node = document.querySelector(`.cx-fx-card .unit[data-skill="${entry.skill}"]`);
                    if (!node) return {skill: entry.skill, missing_card: true};
                    node.querySelectorAll('.fx-layer').forEach(el => el.replaceChildren());
                    fxPreview(index + 1, {key: entry.skill, side: 'enemy', node}, entry.skill, entry.kind, 'physical', style);
                    return {skill: entry.skill, stamp: Boolean(node.querySelector('.fx-skill-stamp')),
                            pieces: node.querySelector('.fx-layer')?.childElementCount ?? 0,
                            file: artFile(entry.skill, style)};
                });
                return {style, skills: Object.keys(SKILL_ART).length, files: files.size, errors, newPlayback};
            }''', {'style': style, 'added': added})
            assert result['skills'] == 96 and result['files'] == (106 if style == 'darktoon' else 89), result
            assert not result['errors'], result
            for entry in result['newPlayback']:
                assert not entry.get('missing_card') and entry['pieces'] > 0, entry
                assert entry['stamp'] == (style == 'darktoon'), entry
                assert bool(entry['file']) == (style == 'darktoon'), entry
            page.locator('.cx-fx-all').click()
            page.wait_for_selector('.fx-skill-stamp', state='attached')
            report['styles'].append(result)
            page.screenshot(path=str(SOURCE / f'codex_{style}_ko.png'))
        page.locator('.dp-btn').click()
        panel = page.locator('.dp-panel')
        for name, style in [('금속박', 'foil'), ('다크 카툰', 'darktoon')]:
            panel.get_by_role('button', name=name, exact=True).click()
            assert page.evaluate("localStorage.getItem('thesevensim.fxArt')") == style
        page.locator('.dp-btn').click()
        page.reload()
        page.wait_for_selector('.cx-fx-card')
        assert page.evaluate("async () => (await import('./ui/fx.js')).fxArtStyle()") == 'darktoon'
        page.goto(url + '/index.html?dev=newgame&tab=codex&cx=fx&cxf=darktoon&lang=en')
        page.wait_for_selector('.cx-fx-card')
        report['en_tabs'] = bar.locator('.segmented button').all_text_contents()
        assert report['en_tabs'] == ['Dark Cartoon · In Battle', 'Metal Foil'], report['en_tabs']
        for removed in ['watercolor', 'glass', 'plasma', 'lowpoly', 'embroidery']:
            page.evaluate("style => localStorage.setItem('thesevensim.fxArt', style)", removed)
            page.reload()
            page.wait_for_selector('.cx-fx-card')
            actual = page.evaluate("async () => (await import('./ui/fx.js')).fxArtStyle()")
            assert actual == 'darktoon', actual
            report['removed_preferences'][removed] = actual
        browser.close()
    assert not report['page_errors'], report['page_errors']
    assert not report['fx_network_errors'], report['fx_network_errors']
    (SOURCE / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:8794')
    verify(parser.parse_args().url.rstrip('/'))
