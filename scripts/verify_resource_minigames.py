"""Verify resource minigame rules, real browser input, touch and screenshots.

Requires the local development server (serve.py, port 8777), Playwright and Edge.
Full-suite failures are recorded separately from the minigame verification result.
"""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tmp/minigame_review'
OUT.mkdir(exist_ok=True)
HARNESS = '''
window.__mgReview = {
    run: () => mgRun,
    start: (post,tier=1) => mgStart(post,tier),
    stopClock: () => { cancelAnimationFrame(mgRun.raf); mgRun.at=null; },
    time: t => { cancelAnimationFrame(mgRun.raf); mgRun.t=t; mgRun.at=null; mgFrame(performance.now()); cancelAnimationFrame(mgRun.raf); },
    game: () => SYS.game,
    state: () => G,
    render: () => render(),
    tick: ts => { mgFrame(ts); cancelAnimationFrame(mgRun?.raf); },
};
'''

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000}, device_scale_factor=1)
    context.route('**/ui/app.js', lambda route: route.fulfill(status=200, content_type='text/javascript', body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+'\n'+HARNESS))
    page = context.new_page()
    errors=[]
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:8777/dev/test.html')
    page.wait_for_function("document.title.includes('PASS') || document.title.includes('FAIL')",timeout=120000)
    result={'suite':page.title(), 'failures':page.locator('#out li.fail').all_text_contents()}
    result['rule_checks'] = page.locator('#out li').evaluate_all("nodes => nodes.filter(n=>n.textContent.startsWith('minigame:')).map(n=>({name:n.textContent,ok:n.classList.contains('ok')}))")
    print(json.dumps({'suite':result['suite'], 'minigame_rules':len(result['rule_checks']), 'minigame_failures':[x for x in result['rule_checks'] if not x['ok']]},ensure_ascii=True),flush=True)
    checks=[]
    for post in ['mine','gather','log']:
        page.goto(f'http://127.0.0.1:8777/index.html?dev=mg&mg={post}&lang=ko')
        page.wait_for_selector('.mg-go',timeout=60000)
        page.locator('.mg-field').screenshot(path=str(OUT/f'{post}_intro.png'))
        page.locator('.mg-go').click()
        page.wait_for_selector('.mg-ready')
        checks.append({'name':post+'_countdown','ok':page.locator('.mg-ready').is_visible()})
        page.evaluate('__mgReview.stopClock()')
        page.mouse.click(700,500)
        checks.append({'name':post+'_countdown_ignores_input','ok':page.evaluate('__mgReview.run().input.length===0')})
        if post=='mine':
            data=page.evaluate('''() => {const r=__mgReview.run().round; return r.spawns.find(s=>s.kind!=='bad');}''')
            page.evaluate('(t)=>__mgReview.time(t)',data['at']+20)
            page.locator('.mg-field').screenshot(path=str(OUT/'mine_play.png'))
            page.locator(f'.mg-cell[data-cell="{data["cell"]}"]').click()
            page.evaluate('(t)=>__mgReview.time(t)',data['at']+21)
            checks.append({'name':'mine_one_click','ok':page.evaluate('__mgReview.run().snap.items>0 && __mgReview.run().phase==="play"')})
            page.locator(f'.mg-cell[data-cell="{data["cell"]}"]').click()
            page.evaluate('(t)=>__mgReview.time(t)',data['at']+22)
            checks.append({'name':'mine_empty_ends','ok':page.evaluate('__mgReview.run().phase==="done" && __mgReview.run().result.why==="mistake" && __mgReview.run().result.items>0')})
            page.locator('.mg-field').screenshot(path=str(OUT/'mine_result.png'))
            page.locator('.mg-go').click()
            page.evaluate('__mgReview.stopClock()')
            checks.append({'name':'mine_retry_resets','ok':page.evaluate('__mgReview.run().input.length===0 && __mgReview.run().t<0')})
            data=page.evaluate('__mgReview.run().round.spawns.find(s=>s.kind==="bad")')
            page.evaluate('(t)=>__mgReview.time(t)',data['at']+10)
            page.locator(f'.mg-cell[data-cell="{data["cell"]}"]').click()
            page.evaluate('(t)=>__mgReview.time(t)',data['at']+11)
            checks.append({'name':'mine_hazard_ends','ok':page.evaluate('__mgReview.run().result.why==="mistake" && __mgReview.run().result.items===0')})
        elif post=='gather':
            data=page.evaluate('__mgReview.run().round.plants[0]')
            start=data['at']+20
            page.evaluate('(t)=>__mgReview.time(t)',start)
            page.locator('.mg-pluck-action').hover()
            page.mouse.down()
            end=start+data['power']*(data['from']+data['to'])/2
            page.evaluate('(t)=>__mgReview.time(t)',end)
            page.locator('.mg-field').screenshot(path=str(OUT/'gather_play.png'))
            page.mouse.up()
            page.evaluate('(t)=>__mgReview.time(t)',end+1)
            checks.append({'name':'gather_perfect_release','ok':page.evaluate('__mgReview.run().snap.items===2 && __mgReview.run().snap.plants[0]==="perfect"')})
            # Keyboard hold, release and overpull use the same input path.
            data=page.evaluate('''() => {const ps=__mgReview.run().round.plants; const i=ps.findIndex((p,i)=>i>0&&p.kind!=='bad'); return {...ps[i],i};}''')
            page.evaluate('(t)=>__mgReview.time(t)',data['at']+20)
            page.keyboard.down('Space')
            end=data['at']+20+data['power']*(data['from']+data['to'])/2
            page.evaluate('(t)=>__mgReview.time(t)',end)
            page.keyboard.up('Space')
            page.evaluate('(t)=>__mgReview.time(t)',end+1)
            checks.append({'name':'gather_keyboard','ok':page.evaluate('(i)=>__mgReview.run().snap.plants[i]==="perfect"',data['i'])})
            page.evaluate('__mgReview.start("gather"); __mgReview.stopClock();')
            data=page.evaluate('__mgReview.run().round.plants[0]')
            start=data['at']+20
            page.evaluate('(t)=>__mgReview.time(t)',start)
            page.locator('.mg-pluck-action').hover()
            page.mouse.down()
            page.mouse.up()
            page.evaluate('(t)=>__mgReview.time(t)',start+1)
            checks.append({'name':'gather_early_release','ok':page.evaluate('__mgReview.run().snap.lives===2 && __mgReview.run().snap.items===0')})
            page.evaluate('__mgReview.start("gather"); __mgReview.stopClock();')
            data=page.evaluate('__mgReview.run().round.plants[0]')
            start=data['at']+20
            page.evaluate('(t)=>__mgReview.time(t)',start)
            page.keyboard.down('Space')
            page.evaluate('(t)=>__mgReview.time(t)',start+data['power']+10)
            page.keyboard.up('Space')
            checks.append({'name':'gather_overpull','ok':page.evaluate('__mgReview.run().snap.lives===2 && __mgReview.run().hold===null')})
            # A cancelled touch or a lost browser focus must not become a harvest.
            page.evaluate('__mgReview.start("gather"); __mgReview.stopClock();')
            data=page.evaluate('__mgReview.run().round.plants[0]')
            page.evaluate('(t)=>__mgReview.time(t)',data['at']+20)
            page.keyboard.down('Space')
            page.evaluate('window.dispatchEvent(new Event("blur"))')
            page.keyboard.up('Space')
            checks.append({'name':'gather_blur_cancels','ok':page.evaluate('__mgReview.run().hold===null && __mgReview.run().input.length===0')})
            checks.append({'name':'hidden_clock_pauses','ok':page.evaluate('''() => {const r=__mgReview.run(), before=r.t; Object.defineProperty(document,'hidden',{configurable:true,value:true}); __mgReview.tick(performance.now()+10000); delete document.hidden; return r.t===before && r.at===null;}''')})
        else:
            page.evaluate('__mgReview.time(0)')
            page.locator('.mg-chop-control.L').click()
            page.evaluate('__mgReview.time(10)')
            checks.append({'name':'log_pointer','ok':page.evaluate('__mgReview.run().snap.cut===1')})
            page.keyboard.press('ArrowRight')
            page.evaluate('__mgReview.time(20)')
            checks.append({'name':'log_keyboard','ok':page.evaluate('__mgReview.run().snap.cut===2')})
            page.locator('.mg-field').screenshot(path=str(OUT/'log_play.png'))
        # Rerendering a running modal must keep the same round and clock.
        if page.evaluate('__mgReview.run().phase==="play"'):
            before=page.evaluate('__mgReview.run().round.no')
            page.evaluate('__mgReview.render(); __mgReview.tick(performance.now())')
            checks.append({'name':post+'_rerender_preserves_round','ok':page.evaluate('__mgReview.run().round.no')==before})
        page.keyboard.press('Escape')
        page.wait_for_selector('.mg-modal',state='detached')
        checks.append({'name':post+'_escape_claim','ok':True})
        page.evaluate('__mgReview.tick(performance.now())')
        checks.append({'name':post+'_no_double_claim','ok':page.evaluate('__mgReview.game().mgClaim(__mgReview.state(),[]).err==="stale"')})
    for post in ['mine','gather','log']:
        page.goto(f'http://127.0.0.1:8777/index.html?dev=mg&mg={post}&lang=en')
        page.wait_for_selector('.mg-go')
        page.locator('.mg-field').screenshot(path=str(OUT/f'{post}_en.png'))
        checks.append({'name':post+'_en','ok':page.locator('.mg-go').inner_text().startswith('Play')})
        checks.append({'name':post+'_no_overflow','ok':page.locator('.mg-field').evaluate('e=>e.scrollWidth===e.clientWidth && e.scrollHeight===e.clientHeight')})
    # Native touch events use the same pointer capture and hold/release logic.
    touch_context=browser.new_context(viewport={'width':1024,'height':768},has_touch=True)
    touch_context.route('**/ui/app.js',lambda route:route.fulfill(status=200,content_type='text/javascript',body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+'\n'+HARNESS))
    touch=touch_context.new_page()
    touch.on('pageerror',lambda error:errors.append(str(error)))
    touch.goto('http://127.0.0.1:8777/index.html?dev=mg&mg=gather&lang=ko')
    touch.wait_for_selector('.mg-go')
    touch.locator('.mg-go').tap()
    touch.evaluate('__mgReview.stopClock()')
    plant=touch.evaluate('__mgReview.run().round.plants[0]')
    start=plant['at']+20
    touch.evaluate('(t)=>__mgReview.time(t)',start)
    box=touch.locator('.mg-pluck-action').bounding_box()
    cdp=touch_context.new_cdp_session(touch)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+box['width']/2,'y':box['y']+box['height']/2}]})
    end=start+plant['power']*(plant['from']+plant['to'])/2
    touch.evaluate('(t)=>__mgReview.time(t)',end)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    touch.evaluate('(t)=>__mgReview.time(t)',end+1)
    checks.append({'name':'gather_native_touch','ok':touch.evaluate('__mgReview.run().snap.plants[0]==="perfect"')})
    touch.locator('.mg-field').screenshot(path=str(OUT/'gather_touch.png'))
    touch_context.close()
    result.update(checks=checks,errors=errors)
    (OUT/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'suite':result['suite'],'other_failures':len(result['failures']),'rule_checks':result['rule_checks'],'checks':checks,'errors':errors},ensure_ascii=True),flush=True)
    browser.close()
    assert len(result['rule_checks'])>=4 and all(c['ok'] for c in result['rule_checks']) and all(c['ok'] for c in checks) and not errors
