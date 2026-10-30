import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
checks, errors = [], []

def check(name, value):
    if not value:
        raise AssertionError(name)
    checks.append(name)

def instrument(route):
    response = route.fetch()
    route.fulfill(response=response, body=response.text() + '\n;globalThis.__buffTest={get SYS(){return SYS},D,state,render,get game(){return G}};')

with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='msedge', headless=True)
    for skin, language in [('now','ko'),('d2min','ko'),('now','en'),('d2min','en')]:
        context = browser.new_context(viewport={'width':1600,'height':900})
        context.route('https://**',lambda route:route.abort())
        context.route('**/ui/app.js',instrument)
        page=context.new_page()
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(f'http://127.0.0.1:8847/index.html?dev=play&skin={skin}&lang={language}',wait_until='networkidle')
        page.wait_for_selector('.run-buff-icon')
        page.locator('.b-pause').click()
        label=f'{skin}/{language}'
        check(label+': removed old buff button',page.locator('.b-buff,.buff-pop,.buff-back').count()==0)
        check(label+': fixed three icons',page.locator('.run-buff-icon').count()==3)
        check(label+': all new art loaded',page.locator('.run-buff-icon img').evaluate_all('(ns)=>ns.every(n=>n.complete&&n.naturalWidth===256)'))
        check(label+': natural empty icons dim',page.locator('.run-buff-icon.empty').count()==3)
        page.locator('[data-buff=shrine]').hover()
        page.wait_for_selector('#tooltip.show .run-buff-tip')
        none='없음' if language=='ko' else 'None'
        check(label+': empty tooltip only shows None',page.locator('.run-buff-tip .tip-effect-summary').inner_text()==none)
        page.mouse.move(900,50)
        if language=='ko': page.screenshot(path=str(OUT/f'{skin}_empty.png'))
        natural_positions=page.locator('.run-buff-icons').evaluate('(n)=>{const a=n.closest(".arena").getBoundingClientRect(),r=n.getBoundingClientRect();return {x:r.x-a.x,y:r.y-a.y}}')
        check(label+': anchored top-left wide',page.locator('.run-buff-icons').evaluate('(n)=>getComputedStyle(n).left==="12px"&&getComputedStyle(n).top==="10px"') and natural_positions['x']>0 and natural_positions['y']>0)
        page.evaluate("""() => {
            __buffTest.SYS.game.runBuffs=()=>globalThis.__buffValues;
            globalThis.__buffValues={shrine:'wrath',tactics:{flat:{atk_pct:.17},dr:[.11,.22]},codex:{hp_pct:.19}};
        }""")
        for key,title in [('shrine','신단' if language=='ko' else 'Shrine'),('tactic','전술' if language=='ko' else 'Tactics'),('codex','도감' if language=='ko' else 'Codex')]:
            page.locator(f'[data-buff={key}]').hover()
            page.wait_for_selector('#tooltip.show .run-buff-tip')
            text=page.locator('.run-buff-tip').inner_text()
            check(label+f': {key} heading',title in page.locator('.run-buff-tip .tip-name').inner_text())
            if key=='tactic':
                check(label+': tactics includes damage and separate reduction rows',page.locator('.run-buff-tip .run-buff-line').count()==3 and '17%' in text and '11%' in text and '22%' in text and '19%' not in text)
            elif key=='codex': check(label+': codex has only its source','19%' in text and '17%' not in text and '11%' not in text)
            else: check(label+': shrine includes actual name', '분노' in text if language=='ko' else 'Wrath' in text)
        check(label+': active icons become bright on hover',page.locator('.run-buff-icon.empty').count()==0)
        check(label+': no duplicate shrine in header',page.locator('.battle-head .shrine-chip').count()==0)
        if language=='ko': page.screenshot(path=str(OUT/f'{skin}_active_codex.png'))
        page.mouse.move(900,50)
        page.evaluate('() => {__buffValues.tactics={flat:{atk_pct:.31},dr:[]}}')
        page.locator('[data-buff=tactic]').hover()
        check(label+': tooltip reads fresh data on each hover','31%' in page.locator('.run-buff-tip').inner_text() and '17%' not in page.locator('.run-buff-tip').inner_text())
        page.mouse.move(900,50)
        page.keyboard.press('Tab')
        page.locator('[data-buff=shrine]').focus()
        page.wait_for_selector('#tooltip.show .run-buff-tip')
        check(label+': keyboard focus opens tooltip','신단' in page.locator('.run-buff-tip').inner_text() if language=='ko' else 'Shrine' in page.locator('.run-buff-tip').inner_text())
        page.keyboard.press('Escape')
        check(label+': Escape closes tooltip',page.locator('#tooltip.show').count()==0)
        page.locator('.b-pane[data-tab=log]').click()
        split_positions=page.locator('.run-buff-icons').evaluate('(n)=>{const a=n.closest(".arena").getBoundingClientRect(),r=n.getBoundingClientRect();return {x:r.x-a.x,y:r.y-a.y}}')
        check(label+': stable corner in split',abs(split_positions['x']-natural_positions['x'])<=1 and abs(split_positions['y']-natural_positions['y'])<=1)
        if language=='ko': page.screenshot(path=str(OUT/f'{skin}_split.png'))
        page.mouse.move(900,50)
        page.set_viewport_size({'width':1280,'height':720})
        page.evaluate('() => {__buffValues.codex=Object.fromEntries(__buffTest.D.codexOptions.filter(x=>x.stat).map(x=>[x.stat,x.value]));}')
        page.locator('[data-buff=codex]').hover()
        page.wait_for_selector('#tooltip.show .run-buff-tip')
        rect=page.locator('.run-buff-tip').bounding_box()
        if language=='ko': page.screenshot(path=str(OUT/f'{skin}_full_codex_1280.png'))
        print(label, 'full codex rect', rect, 'rows', page.locator('.run-buff-tip .run-buff-line').count(), flush=True)
        check(label+': full codex tooltip remains within 1280x720',rect['y']>=0 and rect['y']+rect['height']<=720 and rect['x']>=0 and rect['x']+rect['width']<=1280)
        context.close()
    browser.close()
check('no browser JavaScript exceptions',not errors)
(OUT/'verification.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps({'passed':len(checks),'errors':errors},ensure_ascii=False))
