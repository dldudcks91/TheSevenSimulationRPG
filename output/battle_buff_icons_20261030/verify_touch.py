import json
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path(__file__).resolve().parent
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge',headless=True)
    context = browser.new_context(viewport={'width':1280,'height':720},has_touch=True)
    context.route('https://**', lambda route:route.abort())
    page = context.new_page()
    page.goto('http://127.0.0.1:8847/index.html?dev=play&skin=d2min&lang=ko',wait_until='networkidle')
    page.locator('.b-pause').click()
    box=page.locator('[data-buff=tactic]').bounding_box()
    x,y=box['x']+box['width']/2,box['y']+box['height']/2
    cdp=context.new_cdp_session(page)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
    page.wait_for_selector('#tooltip.show .run-buff-tip')
    assert '전술' in page.locator('.run-buff-tip').inner_text()
    assert '없음' in page.locator('.run-buff-tip').inner_text()
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    assert page.locator('#tooltip.show .run-buff-tip').count()==1
    page.screenshot(path=str(out/'d2min_touch.png'))
    page.touchscreen.tap(100,100)
    assert page.locator('#tooltip.show').count()==0
    browser.close()
(out/'touch_verification.json').write_text(json.dumps({'checks':['real touch long press opens tactic tooltip','releasing finger retains tooltip','outside tap closes tooltip']},indent=2),encoding='utf-8')
print('3 touch checks passed')
