"""Real Edge smoke test. Run: python tests/browser_smoke.py"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'test-results'
OUTPUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1100}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto((ROOT / 'index.html').as_uri())
    page.locator('[data-action="start"]').click()
    page.wait_for_selector('#hud')
    page.screenshot(path=str(OUTPUT / '01-station.png'), full_page=True)
    page.locator('[data-action="tab"][data-id="market"]').click()
    page.locator('[data-action="buy"][data-id="grain"][data-n="3"]').click()
    page.locator('[data-action="accept"]').first.click()
    assert page.evaluate('DustlineApp.run.cargo.grain') == 5
    page.locator('[data-action="tab"][data-id="train"]').click()
    page.locator('[data-action="deploy"]').first.click()
    page.locator('[data-action="upgrade"]').first.click()
    assert page.evaluate('DustlineApp.run.cars[0].level') == 2
    page.locator('[data-action="tab"][data-id="decisions"]').click()
    page.locator('[data-action="decision"][data-id="meal"]').click()
    page.locator('[data-action="tab"][data-id="station"]').click()
    page.locator('[data-action="depart"]').click()
    page.locator('[data-action="speed"][data-n="10"]').click()
    page.wait_for_selector('[data-action="event"]', timeout=15000)
    page.screenshot(path=str(OUTPUT / '02-event.png'), full_page=True)
    page.locator('[data-action="event"]:enabled').last.click()
    # Decision completion may pause; explicitly resume once it finishes.
    page.wait_for_timeout(3000)
    if page.evaluate('DustlineApp.run.phase === "travel" && DustlineApp.run.paused'):
        page.locator('[data-action="pause"]').click()
    page.wait_for_function('DustlineApp.run.phase === "station"', timeout=15000)
    assert page.evaluate('DustlineApp.run.node') == 'harvest'
    page.locator('[data-action="tab"][data-id="market"]').click()
    page.locator('[data-action="deliver"]:enabled').click()
    assert page.evaluate('DustlineApp.run.stats.delivered') == 1
    page.locator('[data-action="tab"][data-id="train"]').click()
    page.screenshot(path=str(OUTPUT / '03-train.png'), full_page=True)
    page.locator('[data-action="save"]').click()
    previous = page.evaluate('JSON.stringify(DustlineApp.run)')
    page.reload()
    page.locator('[data-action="continue"]').click()
    assert page.evaluate('JSON.stringify(DustlineApp.run)') == previous
    page.locator('[data-action="settings"]').click()
    page.locator('[data-setting="sound"]').check()
    page.locator('[data-setting="autoDecision"]').uncheck()
    page.locator('[data-action="close-modal"]').click()
    assert page.evaluate('DustlineApp.meta.settings.sound')
    page.set_viewport_size({'width': 390, 'height': 844})
    page.screenshot(path=str(OUTPUT / '04-mobile.png'), full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.locator('[data-action="meta"]').click()
    page.screenshot(path=str(OUTPUT / '05-record-room.png'), full_page=True)
    assert page.locator('[role="dialog"]').count() == 1
    assert not errors, errors
    (OUTPUT / 'browser-summary.json').write_text(json.dumps({'passed': True, 'page_errors': errors, 'viewport': [1440,1100], 'mobile': [390,844], 'transport': 'file://'}, ensure_ascii=False, indent=2), encoding='utf-8')
    browser.close()
print('PASS: file launch, trade, contract, deploy, upgrade, decision, event, arrival, delivery, reload, settings, mobile, meta')
