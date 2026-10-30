import json
from playwright.sync_api import sync_playwright
from smoke_ui import OUT, setup, SOURCE_SET_HASH

with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True);ctx=b.new_context(viewport={'width':1440,'height':1000});setup(ctx)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8921/index.html?dev=play');page.wait_for_function('window.__uiAudit && __uiAudit.state().battle!==null')
 page.locator('.dp-btn').click();page.locator('.dp-tab[data-tab="save"]').click()
 row=page.locator('.ds-row').nth(0)
 row.get_by_role('button',name='Save',exact=True).click()
 slot=page.evaluate('localStorage.getItem("thesevensim.slot.1")')
 baseline=page.evaluate('({party:__uiAudit.sys().game.partyOf(__uiAudit.game()),handles:Object.keys(__uiAudit.state().battles)})')
 page.locator('.nav [data-tab="party"]').click();page.locator('.hero-strip .hs-card').first.click()
 changed=page.evaluate('({party:__uiAudit.sys().game.partyOf(__uiAudit.game()),handles:Object.keys(__uiAudit.state().battles)})')
 page.locator('.ds-row').nth(0).get_by_role('button',name='Load',exact=True).click()
 first=page.evaluate('__uiAudit.sys().game.partyOf(__uiAudit.game())')
 page.locator('.ds-row').nth(0).get_by_role('button',name='Load?',exact=True).click()
 after=page.evaluate('''({party:__uiAudit.sys().game.partyOf(__uiAudit.game()),handles:Object.keys(__uiAudit.state().battles),
    battle:__uiAudit.state().battle,screen:__uiAudit.state().screen,exp:__uiAudit.state().exp,
    slot:localStorage.getItem('thesevensim.slot.1'),save:JSON.parse(localStorage.getItem('thesevensim.save'))})''')
 page.wait_for_timeout(1300)
 afterwait=page.evaluate('({handles:Object.keys(__uiAudit.state().battles),battle:__uiAudit.state().battle,battleCount:__uiAudit.game().counters.battle,reportCount:__uiAudit.game().reports.length})')
 page.locator('.ds-row').nth(0).get_by_role('button',name='Clear',exact=True).click()
 clearfirst=page.evaluate('!!localStorage.getItem("thesevensim.slot.1")')
 page.locator('.ds-row').nth(0).get_by_role('button',name='Clear?',exact=True).click()
 clearsecond=page.evaluate('localStorage.getItem("thesevensim.slot.1")')
 checks={
 'slot_saved_active_run':json.loads(slot)['runs'][0]['active'] is True,
 'actual_party_changed':baseline['party']!=changed['party'],
 'first_load_only_armed':first==changed['party'],
 'second_load_restored_party':after['party']==baseline['party'],
 'old_handles_cleared':after['handles']==[] and after['battle'] is None,
 'old_handles_stay_cleared':afterwait['handles']==[] and afterwait['battle'] is None,
 'snapshot_unchanged':after['slot']==slot,
 'resumed_save_closed_run':after['save']['runs'][0]['active'] is False,
 'clear_two_clicks':clearfirst is True and clearsecond is None,
 'no_pageerrors':errors==[],
 }
 data={'source_set_sha256':SOURCE_SET_HASH,'checks':checks,'before':baseline,'changed':changed,'after_first_load':first,'after_second_load':after,'after_wait':afterwait,'errors':errors}
 (OUT/'slot_restore.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'checks':checks,'errors':errors},ensure_ascii=True),flush=True)
 b.close()
