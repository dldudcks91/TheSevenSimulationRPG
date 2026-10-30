import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tmp/heading_help_review'
OUT.mkdir(exist_ok=True)
HARNESS = '''
window.__headingReview = {
  show: (tab, extras = {}, modal = null) => {
    state.screen = 'game'; state.tab = tab; state.modal = modal;
    Object.assign(state, extras); render();
  },
  lang: value => { setLang(value); render(); },
  arenaHint: tab => {
    state.tab = tab; render();
    return document.querySelector('.arena-h .q-btn')._tipBuild().querySelector('.tip-effect-summary').textContent === t(`hint.${tab}`);
  },
};
'''
SELECTOR = '.main h2, .main .sub-h, .main .items-name, .main .sk-title, .main .ix-title, .main .dp-side-n, #modal h2, #modal .sub-h, #modal .sk-title'
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context(viewport={'width':1600,'height':900})
    context.route('**/ui/app.js', lambda route: route.fulfill(status=200, content_type='text/javascript', body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+'\n'+HARNESS))
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda err: errors.append(str(err)))
    page.goto('http://127.0.0.1:8777/index.html?dev=newgame&cn=max')
    page.wait_for_selector('.nav button', timeout=60000)
    checks = []
    tabs = ['party','character','research','tavern','shop','forge','library','resource','colosseum','arena','codex','help']
    for language in ['ko','en']:
        page.evaluate('(value) => __headingReview.lang(value)', language)
        for tab in tabs:
            page.evaluate('(tab) => __headingReview.show(tab)', tab)
            titles = page.locator(SELECTOR).evaluate_all('''nodes => nodes.filter(n=>n.getClientRects().length).map(n=>({
              name:n.textContent.trim(), help:n.querySelectorAll('.q-btn').length,
              missing:n.querySelector('.q-btn') ? !n.querySelector('.q-btn')._tipBuild().textContent.trim() : true,
              body:n.querySelector('.q-btn')?n.querySelector('.q-btn')._tipBuild().textContent:''
            }))''')
            bad = [n for n in titles if n['help'] != 1 or n['missing'] or 'hint.' in n['body']]
            checks.append({'lang':language,'tab':tab,'titles':len(titles),'failures':bad})
            if language == 'ko' and tab in ['party','character','research','resource','shop']:
                page.screenshot(path=str(OUT/f'{tab}.png'))
        for forge in ['make','up','synth','craft']:
            page.evaluate('(forge) => __headingReview.show("forge", {forgeTab:forge})', forge)
            q = page.locator('.main h2 .q-btn').first
            body = q.evaluate('n=>n._tipBuild().textContent')
            checks.append({'lang':language,'forge':forge,'ok':'hint.' not in body})
        for modal in ['skill','skillOrder','autoSalvage','gamble','arenaCode','mail','dismiss']:
            page.evaluate('(modal) => __headingReview.show("character", {}, modal)', modal)
            titles = page.locator('#modal h2, #modal .sub-h, #modal .sk-title').evaluate_all('nodes=>nodes.map(n=>({name:n.textContent.trim(),count:n.querySelectorAll(".q-btn").length}))')
            checks.append({'lang':language,'modal':modal,'titles':len(titles),'failures':[n for n in titles if n['count']!=1]})
    page.evaluate('__headingReview.show("character")')
    q = page.locator('.main h2 .q-btn').first
    q.hover()
    page.wait_for_selector('#tooltip.show .q-tip')
    checks.append({'hover':bool(page.locator('#tooltip .tip-effect-summary').inner_text())})
    page.mouse.move(10,10)
    q.focus()
    page.wait_for_selector('#tooltip.show .q-tip')
    page.keyboard.press('Escape')
    checks.append({'keyboard':not page.locator('#tooltip').evaluate('n=>n.classList.contains("show")')})
    page.evaluate('__headingReview.show("character", {}, "mail")')
    page.locator('#modal h2 .q-btn').focus()
    page.wait_for_selector('#tooltip.show .q-tip')
    page.keyboard.press('Escape')
    first = page.locator('#modal').is_visible() and not page.locator('#tooltip').evaluate('n=>n.classList.contains("show")')
    page.keyboard.press('Escape')
    checks.append({'modal_escape':first and not page.locator('#modal').is_visible()})
    for tab in ['colosseum','arena']:
        checks.append({'arena_hint':tab,'ok':page.evaluate('(tab)=>__headingReview.arenaHint(tab)',tab)})
    page.evaluate('__headingReview.show("help")')
    page.locator('.help-tab').nth(1).click()
    checks.append({'help_folder':page.locator('.help-panel > h2 .q-btn').count()==1})
    for codex in ['character','item','skill','fx','mastery']:
        page.evaluate('(seg) => __headingReview.show("codex", {codexSeg:seg})', codex)
        titles = page.locator('.main .ix-title, .main .sk-title').evaluate_all('nodes=>nodes.map(n=>({name:n.textContent.trim(),count:n.querySelectorAll(".q-btn").length}))')
        checks.append({'codex':codex,'titles':len(titles),'failures':[n for n in titles if n['count']!=1]})
    page.goto('http://127.0.0.1:8777/index.html?dev=battle&cn=max&lang=ko')
    page.wait_for_selector('.main h2 .q-btn',timeout=60000)
    missing = page.locator('.main h2, .main .sub-h').evaluate_all('nodes=>nodes.filter(n=>!n.querySelector(".q-btn")).map(n=>n.textContent)')
    checks.append({'reports_missing':missing})
    page.screenshot(path=str(OUT/'reports.png'))
    page.goto('http://127.0.0.1:8777/index.html?dev=colosseum&cn=max&lang=ko')
    page.wait_for_selector('.arena-fight',timeout=60000)
    page.locator('.arena-fight').click()
    page.wait_for_selector('.tdm-head .q-btn',timeout=60000)
    checks.append({'battle_totals':page.locator('.tdm-head .q-btn').count()==2 and page.locator('.tdm-head .q-btn').first.evaluate('n=>!n._tipBuild().textContent.includes("hint.")')})
    page.goto('http://127.0.0.1:8777/index.html?dev=form&cn=max')
    page.wait_for_selector('.depart-box',timeout=60000)
    missing = page.locator('#modal h2, #modal .sub-h, #modal .cp-h').evaluate_all('nodes=>nodes.filter(n=>!n.querySelector(".q-btn")).map(n=>n.textContent)')
    checks.append({'depart_missing':missing})
    page.screenshot(path=str(OUT/'depart.png'))
    result = {'checks':checks, 'page_errors':errors}
    (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    failures=[c for c in checks if c.get('failures') or c.get('ok') is False or c.get('depart_missing') or c.get('reports_missing')]
    print(json.dumps({'checks':len(checks),'failures':failures,'page_errors':errors},ensure_ascii=False))
    browser.close()
