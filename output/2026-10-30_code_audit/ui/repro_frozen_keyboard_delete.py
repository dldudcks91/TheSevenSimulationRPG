import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from smoke_ui import ROOT, OUT, setup, SOURCE_SET_HASH

def tab_to(page, selector, limit=250):
    visited=[]
    for i in range(limit):
        page.keyboard.press('Tab')
        info=page.evaluate('''selector => ({tag:document.activeElement.tagName,cls:document.activeElement.className,
             text:document.activeElement.textContent.slice(0,70),match:document.activeElement.matches(selector)})''',selector)
        visited.append(info)
        if info['match']:
            return {'steps':i+1,'visited':visited}
    raise AssertionError(f'No keyboard focus for {selector}: {visited[-10:]}')

with sync_playwright() as p:
    b=p.chromium.launch(channel='msedge',headless=True)
    ctx=b.new_context(viewport={'width':1440,'height':1000}); setup(ctx)
    a=ctx.new_page();a.goto('http://127.0.0.1:8921/index.html?dev=newgame')
    a.wait_for_function('window.__uiAudit && __uiAudit.game()!==null')
    c=ctx.new_page();c.goto('http://127.0.0.1:8921/index.html?dev=newgame')
    c.wait_for_function('window.__uiAudit && __uiAudit.game()!==null')
    a.wait_for_function('__uiAudit.state().modal === "frozen"')
    data={'source_set_sha256':SOURCE_SET_HASH,'before':c.evaluate('JSON.parse(localStorage.getItem("thesevensim.save"))'), 'actions':[]}
    data['actions'].append({'tab_to_newgame':tab_to(a,'.b-newgame')})
    a.keyboard.press('Enter')
    data['after_open_newgame']=a.evaluate('({screen:__uiAudit.state().screen,modal:__uiAudit.state().modal,save:!!localStorage.getItem("thesevensim.save")})')
    data['actions'].append({'tab_to_start':tab_to(a,'.ng-actions .btn.lg')})
    a.keyboard.press('Enter')
    data['actions'].append({'tab_to_confirm':tab_to(a,'.ng-actions .btn.lg')})
    a.keyboard.press('Enter')
    a.wait_for_timeout(100)
    data['after']=a.evaluate('({screen:__uiAudit.state().screen,modal:__uiAudit.state().modal,save:localStorage.getItem("thesevensim.save")})')
    data['other_tab']=c.evaluate('({screen:__uiAudit.state().screen,modal:__uiAudit.state().modal,save:localStorage.getItem("thesevensim.save")})')
    a.screenshot(path=str(OUT/'frozen_keyboard_deleted_a.png'))
    c.screenshot(path=str(OUT/'frozen_keyboard_deleted_b.png'))
    a.wait_for_timeout(2100)
    data['after_2seconds_other_tab']=c.evaluate('({screen:__uiAudit.state().screen,modal:__uiAudit.state().modal,save:localStorage.getItem("thesevensim.save"),inMemoryHeroes:__uiAudit.game().heroes.length})')
    c.goto('http://127.0.0.1:8921/index.html')
    c.wait_for_selector('.mn-wrap')
    data['after_reload_other_tab']=c.evaluate('({screen:__uiAudit.state().screen,game:__uiAudit.game(),save:localStorage.getItem("thesevensim.save"),loadDisabled:document.querySelectorAll(".mn-btn")[1].disabled})')
    c.screenshot(path=str(OUT/'frozen_keyboard_deleted_after_reload.png'))
    (OUT/'repro_frozen_keyboard_delete.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'before_seed':data['before']['seed'],'after_open_newgame':data['after_open_newgame'],'after':data['after'],'other_tab':data['other_tab'],
        'after_2seconds_other_tab':data['after_2seconds_other_tab'],'after_reload_other_tab':data['after_reload_other_tab'],
        'source_set_sha256':SOURCE_SET_HASH,'tab_counts':[list(x.values())[0]['steps'] for x in data['actions']]},ensure_ascii=True),flush=True)
    b.close()
