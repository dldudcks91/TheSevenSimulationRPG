from pathlib import Path
import json

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'src/assets/art/fx_source/baekho_darktoon_20261031'
report = {'page_errors': [], 'fx_network_errors': [], 'preview': [], 'battle_hits': []}

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1600, 'height': 1080})
    page.on('pageerror', lambda error: report['page_errors'].append(str(error)))
    page.on('response', lambda response: report['fx_network_errors'].append({'url': response.url, 'status': response.status})
            if '/assets/art/fx/' in response.url and response.status >= 400 else None)
    page.goto('http://127.0.0.1:8777/index.html?dev=newgame&tab=codex&cx=fx&cxf=darktoon&lang=ko')
    page.wait_for_selector('.cx-fx-card', timeout=45000)
    page.evaluate('''async () => {
        window.reviewFx = await import('./ui/fx.js');
        reviewFx.setFxArtStyle('darktoon');
        reviewFx.setFxOn('skill', true);
        reviewFx.setFxTransparency(0);
        await reviewFx.fxPreload('darktoon', ['war_bash', 'war_doubleswing']);
        window.freezeSprites = node => [...node.querySelectorAll('.fx-skill-stamp')].map(im => {
            const css = getComputedStyle(im);
            for (const animation of im.getAnimations()) {
                animation.pause();
                animation.currentTime = parseFloat(css.animationDelay) * 1000 + 120;
            }
            return {src: new URL(im.src).pathname, mask: css.maskImage,
                    duration: css.animationDuration, delay: css.animationDelay,
                    decoded: im.complete && im.naturalWidth > 0,
                    size: [im.naturalWidth, im.naturalHeight]};
        });
    }''')
    report['active_style'] = page.evaluate('reviewFx.fxArtStyle()')
    for skill, count in [('war_bash', 1), ('war_doubleswing', 2)]:
        result = page.evaluate('''({skill}) => {
            const node = document.querySelector(`.unit[data-skill="${skill}"]`);
            node.querySelectorAll('.fx-layer').forEach(el => el.replaceChildren());
            reviewFx.fxPreview(1, {key: skill, node, side: 'enemy'}, skill, 'hit', 'physical', 'darktoon');
            return {skill, stamps: freezeSprites(node)};
        }''', {'skill': skill})
        assert len(result['stamps']) == count, result
        assert all(stamp['decoded'] and stamp['size'] == [384, 384]
                   and stamp['src'].endswith(f'/{skill}_darktoon.webp') for stamp in result['stamps']), result
        if count == 2:
            assert [stamp['delay'] for stamp in result['stamps']] == ['0s', '0.13s'], result
            assert result['stamps'][0]['mask'] != result['stamps'][1]['mask'], result
        report['preview'].append(result)
    page.screenshot(path=str(OUT / 'codex_in_game.png'))
    for skill, hit in [('war_bash', 0), ('war_doubleswing', 0), ('war_doubleswing', 1)]:
        result = page.evaluate('''({skill, hit}) => {
            const node = document.querySelector(`.unit[data-skill="${skill}"]`);
            node.querySelectorAll('.fx-layer').forEach(el => el.replaceChildren());
            const state = {idx: hit, speed: 1, catchUp: false, motion: false};
            reviewFx.fxHit(state, {key: 'a', node: null}, {key: skill, node, side: 'enemy'},
                           {s: skill, ty: 'physical', crit: false}, false, hit);
            return {skill, hit, stamps: freezeSprites(node)};
        }''', {'skill': skill, 'hit': hit})
        assert len(result['stamps']) == 1 and result['stamps'][0]['decoded'], result
        report['battle_hits'].append(result)
        card = page.locator(f'.unit[data-skill="{skill}"]').locator('..')
        card.screenshot(path=str(OUT / f'battle_{skill}_{hit}.png'), animations='allow')
    for speed in [1, 2, 4, 16]:
        duration = page.evaluate('''speed => {
            const node = document.querySelector('.unit[data-skill="war_doubleswing"]');
            node.querySelectorAll('.fx-layer').forEach(el => el.replaceChildren());
            reviewFx.fxHit({idx: 0, speed, catchUp: false, motion: false}, {key: 'a', node: null},
                          {key: 'd', node, side: 'enemy'}, {s: 'war_doubleswing', ty: 'physical'}, false, 1);
            return freezeSprites(node)[0].duration;
        }''', speed)
        report.setdefault('speed_durations', {})[str(speed)] = duration
    assert report['speed_durations'] == {'1': '0.4s', '2': '0.3s', '4': '0.22s', '16': '0.12s'}, report
    result = page.evaluate('''async () => {
        await reviewFx.fxPreload('foil', ['war_bash', 'war_doubleswing']);
        const node = document.querySelector('.unit[data-skill="war_doubleswing"]');
        node.querySelectorAll('.fx-layer').forEach(el => el.replaceChildren());
        reviewFx.fxPreview(1, {key: 'd', node, side: 'enemy'}, 'war_doubleswing', 'hit', 'physical', 'foil');
        return freezeSprites(node);
    }''')
    assert len(result) == 2 and all(s['decoded'] and s['src'].endswith('/war_doubleswing_foil.webp') for s in result), result
    report['foil_preview'] = result
    browser.close()

assert not report['page_errors'], report['page_errors']
assert not report['fx_network_errors'], report['fx_network_errors']
(OUT / 'browser_verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
