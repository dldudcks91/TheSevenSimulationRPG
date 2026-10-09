"""Offline wall-time, blocked choices, key remapping and focus regression tests."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'
OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1280,'height':1000})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:8844/')
    page.locator('[data-action="start"]').click()
    page.locator('[data-action="settings"]').click()
    page.locator('[data-setting="offline"]').check()
    page.locator('[data-key="pause"]').select_option('KeyP')
    page.locator('[data-action="close-modal"]').click()
    page.locator('[data-action="depart"]').click()
    # Continuously updating progress must not remove focused buttons.
    pause=page.locator('[data-action="pause"]')
    pause.focus()
    page.wait_for_timeout(900)
    assert page.evaluate('document.activeElement.dataset.action')=='pause'
    page.keyboard.press('p')
    assert page.evaluate('DustlineApp.run.paused')
    page.keyboard.press('p')
    assert not page.evaluate('DustlineApp.run.paused')
    page.locator('[data-action="save"]').click()
    before=page.evaluate('DustlineApp.run.time')
    # Set only the external wall-clock input; do not mutate the game simulation.
    page.evaluate('''() => {const p=JSON.parse(localStorage.getItem('dustline.save.v1'));p.savedAt=Date.now()-60000;localStorage.setItem('dustline.save.v1',JSON.stringify(p));}''')
    # A normal reload would trigger beforeunload and overwrite the timestamp.
    # Remove that browser listener by creating a fresh context with the exported save.
    storage=page.context.storage_state()
    next_context=browser.new_context(storage_state=storage,viewport={'width':1280,'height':1000})
    next_page=next_context.new_page()
    next_page.on('pageerror',lambda e:errors.append(str(e)))
    next_page.goto('http://127.0.0.1:8844/')
    progressed=next_page.evaluate('DustlineApp.run.time')
    assert progressed>before+5
    assert progressed<before+60
    assert next_page.evaluate('DustlineApp.run.phase')=='event'
    assert next_page.evaluate('DustlineApp.run.paused')
    assert next_page.evaluate('DustlineApp.meta.settings.keys.pause')=='KeyP'
    next_page.locator('[data-action="continue"]').click()
    assert next_page.locator('[data-action="event"]').count()==3
    held=next_page.evaluate('DustlineApp.run.time')
    next_page.wait_for_timeout(600)
    assert next_page.evaluate('DustlineApp.run.time')==held
    next_page.locator('[data-action="event"]:enabled').last.click()
    next_page.keyboard.press('p')
    assert next_page.evaluate('DustlineApp.run.paused')
    assert not errors, errors
    (OUT/'offline-summary.json').write_text(json.dumps({'passed':True,'page_errors':errors,'before_time':before,'offline_time':progressed,'stopped_at':'event','checks':['button focus survives live progress','remapped pause key','elapsed wall-time replay','no automatic event choice','paused restore']},ensure_ascii=False,indent=2),encoding='utf-8')
    browser.close()
print('PASS: live button focus, key remap, offline replay, event stop, paused restore')
