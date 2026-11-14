"""Check both styles and preview controls in a browser; capture comparison sheets."""
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parent


def main():
    errors = []
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='chrome', headless=True)
        page = browser.new_page(viewport={'width': 1380, 'height': 1100}, device_scale_factor=1)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto((BASE / 'preview.html').as_uri(), wait_until='load')
        for style in ['darktoon', 'foil']:
            page.select_option('#style', style)
            page.wait_for_function('Array.from(document.images).every(i => i.complete && i.naturalWidth > 0)')
            results[style] = page.evaluate('''() => ({
                cards: document.querySelectorAll('article').length,
                images: document.images.length,
                newSprites: document.querySelectorAll('.large[src^="exports/"]').length,
                oldCodeFallbacks: document.querySelectorAll('.missing').length
            })''')
            assert results[style]['cards'] == results[style]['newSprites'] == 6
            assert results[style]['oldCodeFallbacks'] == (2 if style == 'foil' else 0)
            page.screenshot(path=str(BASE / f'comparison_{style}.png'), full_page=True)
        page.select_option('#style', 'darktoon')
        page.click('#play')
        animations = page.locator('.overlay').evaluate_all('(nodes) => nodes.map(n => getComputedStyle(n).animationName)')
        assert set(animations) == {'wave', 'inward', 'orders'}, animations
        results['animation_names'] = sorted(set(animations))
        page.click('#play')
        assert page.locator('.overlay').first.evaluate('(n) => getComputedStyle(n).animationName') == 'none'
        page.uncheck('#portrait')
        assert page.locator('.portrait').first.evaluate('(n) => getComputedStyle(n).visibility') == 'hidden'
        page.check('#portrait')
        page.check('#light')
        assert 'light' in page.locator('body').get_attribute('class')
        page.uncheck('#light')
        page.set_viewport_size({'width': 390, 'height': 844})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        results['mobile_no_horizontal_overflow'] = True
        results['page_errors'] = errors
        assert not errors, errors
        browser.close()
    (BASE / 'browser_report.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(results, ensure_ascii=False))


if __name__ == '__main__':
    main()
