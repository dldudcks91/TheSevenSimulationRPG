"""UI-only full journey and save transfer test. Start serve.py --no-browser first."""
from pathlib import Path
import json
import time
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context(viewport={'width':1440,'height':1050}, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:8844/')
    page.screenshot(path=str(OUT/'00-home.png'),full_page=True)
    page.locator('[data-action="start"]').click()
    page.locator('[data-action="settings"]').click()
    page.locator('[data-setting="autoDecision"]').uncheck()
    page.locator('[data-action="close-modal"]').click()
    page.locator('[data-action="tab"][data-id="market"]').click()
    page.locator('[data-action="buy"][data-id="grain"][data-n="3"]').click()
    page.locator('[data-action="accept"]').first.click()
    page.locator('[data-action="accept"]').last.click() # Rowan's escort story
    page.locator('[data-action="tab"][data-id="decisions"]').click()
    page.locator('[data-action="decision"][data-id="meal"]').click()
    path = ['s-h','h-p','p-v','v-d']
    for edge in path:
        page.locator('[data-action="tab"][data-id="station"]').click()
        if page.locator('[data-action="landmark"][data-id="supplies"]').is_enabled():
            page.locator('[data-action="landmark"][data-id="supplies"]').click()
        page.locator(f'[data-action="route"][data-id="{edge}"]').click()
        page.locator('[data-action="depart"]').click()
        page.locator('[data-action="speed"][data-n="10"]').click()
        deadline = time.monotonic()+25
        while time.monotonic()<deadline:
            phase=page.evaluate('DustlineApp.run.phase')
            if phase=='station': break
            assert phase!='result', 'journey should survive'
            if phase=='event':
                choices=page.locator('[data-action="event"]:enabled')
                # No simulation mutation: make the visible last safe choice.
                choices.last.click()
            page.wait_for_timeout(150)
        else: raise AssertionError('arrival timeout')
        page.locator('[data-action="tab"][data-id="market"]').click()
        for _ in range(3):
            deliver=page.locator('[data-action="deliver"]:enabled')
            if deliver.count(): deliver.first.click()
    assert page.evaluate('DustlineApp.run.node')=='dawn'
    page.locator('[data-action="finish"]').click()
    assert page.evaluate('DustlineApp.run.result.victory')
    assert page.evaluate('DustlineApp.run.result.hiddenStory')
    assert page.evaluate('DustlineApp.meta.stats.victories')==1
    page.screenshot(path=str(OUT/'06-finish.png'), full_page=True)
    page.locator('[data-action="result-home"]').click()
    page.locator('[data-action="captain"][data-id="silas"]').click()
    page.locator('[data-action="unlock"][data-kind="captain"][data-id="silas"]').click()
    assert page.evaluate('DustlineApp.meta.captains.includes("silas")')
    page.locator('[data-action="meta-tab"][data-id="history"]').click()
    page.locator('[data-action="history"]').click()
    assert page.locator('[role="dialog"]').inner_text().find('여정 정산')>=0
    page.locator('[data-action="close-modal"]').click()
    page.locator('[data-action="settings"]').click()
    with page.expect_download() as download:
        page.locator('[data-action="export"]').click()
    exported=OUT/'roundtrip-save.json'
    download.value.save_as(str(exported))
    content=json.loads(exported.read_text(encoding='utf-8'))
    assert content['meta']['stats']['victories']==1
    assert 'silas' in content['meta']['captains']
    before=page.evaluate('JSON.stringify(DustlineApp.meta)')
    malformed=OUT/'invalid-save.json'
    malformed.write_text('{"version":1,"meta":{}}',encoding='utf-8')
    page.locator('#save-import').set_input_files(str(malformed))
    page.wait_for_timeout(300)
    assert page.evaluate('JSON.stringify(DustlineApp.meta)')==before
    page.locator('#save-import').set_input_files(str(exported))
    page.locator('[data-action="import-confirmed"]').click()
    assert page.evaluate('JSON.stringify(DustlineApp.meta)')==before
    # New sheriff run, actual risk view, keyboard and responsive layouts.
    page.locator('[data-action="captain"][data-id="silas"]').click()
    page.locator('[data-action="start"]').click()
    assert page.locator('#tab-body').inner_text().find('보안관의 긴장')>=0
    page.locator('[data-action="depart"]').click()
    page.keyboard.press('Space')
    assert page.evaluate('DustlineApp.run.paused')
    page.keyboard.press('c')
    assert page.locator('#tab-body').inner_text().find('열차 편성')>=0
    for width in [320,390,768,1024,1920]:
        page.set_viewport_size({'width':width,'height':900})
        page.wait_for_timeout(80)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'overflow at {width}'
    assert not errors, errors
    (OUT/'journey-summary.json').write_text(json.dumps({'passed':True,'page_errors':errors,'transport':'http://127.0.0.1:8844','journey':'UI-only 4-leg victory + escort ending','checks':['permanent captain unlock','history','download','invalid import','valid import','sheriff risk','keyboard','320/390/768/1024/1920 widths']},ensure_ascii=False,indent=2),encoding='utf-8')
    browser.close()
print('PASS: UI-only victory, story, unlock, history, download, invalid/valid import, risk, keyboard, five widths')
