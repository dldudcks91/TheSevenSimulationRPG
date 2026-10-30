import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:8842'
checks, errors = [], []


def check(name, value):
    if not value:
        raise AssertionError(name)
    checks.append(name)


MEASURE = '''() => {
    const c=document.querySelector('#tooltip .tip-card.unit'), rect=n=>{
        const r=n.getBoundingClientRect(), s=getComputedStyle(n);
        return {x:r.x,y:r.y,w:r.width,h:r.height,width:parseFloat(s.width),bg:s.backgroundImage,padding:s.paddingTop};
    };
    const gear=c.querySelector('.tip-equipment');
    return {base:rect(c.querySelector('.base')),gear:rect(gear),
        rows:[...gear.children].filter((_,i)=>i%3===0).map(rect),
        skills:[...c.querySelectorAll('.tip-skill')].map(n=>({...rect(n),lv:n.querySelector('.sk-lv')?.textContent??null,
            src:n.querySelector('img')?.getAttribute('src')??null,vacant:n.classList.contains('vacant')})),
        detail:c.querySelectorAll('.d1,.d2').length,locks:c.querySelectorAll('.sk-lock').length};
}'''


def app_route(route):
    source = (ROOT / 'src/ui/app.js').read_text(encoding='utf-8')
    route.fulfill(status=200, content_type='text/javascript', body=source + '\n;globalThis.__monsterApp={get G(){return G},get SYS(){return SYS},D};')


def battle_route(route):
    source = (ROOT / 'src/ui/battle.js').read_text(encoding='utf-8')
    marker = '    container.appendChild(dom);'
    assert source.count(marker) == 1
    source = source.replace(marker, marker + '\n    globalThis.__monsterBattle={state,root:container,renderUnits,cdSlots,skillInfo};')
    route.fulfill(status=200, content_type='text/javascript', body=source)


with sync_playwright() as pw:
    browser = pw.chromium.launch(channel='msedge', headless=True)
    for skin, language in [('d2min', 'ko'), ('now', 'en')]:
        context = browser.new_context(viewport={'width': 1600, 'height': 800})
        context.route('https://**', lambda route: route.abort())
        context.route('**/ui/app.js', app_route)
        context.route('**/ui/battle.js', battle_route)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_default_timeout(15000)
        page.goto(f'{BASE}/index.html?dev=play&lang={language}&skin={skin}', wait_until='networkidle')
        page.wait_for_function('globalThis.__monsterBattle?.state.enemies.length>0')
        page.evaluate('''() => {
            const a=__monsterBattle;
            a.state.running=false; clearInterval(a.state.timer); clearTimeout(a.state.wake);
            document.querySelectorAll('.stage-intro').forEach(n=>n.remove());
        }''')
        enemy = page.locator('.side-enemy .unit.enemy').first
        enemy.locator('.sprite').hover()
        page.wait_for_selector('#tooltip.show .tip-gear-below.with-skills')
        actual = page.evaluate(MEASURE)
        visible = enemy.locator('.cd-slot').evaluate_all('ns=>ns.map(n=>({src:n.querySelector("img")?.getAttribute("src")??null,lv:n.querySelector(".sk-lv")?.textContent??null}))')
        check(f'{skin}: actual battle skills and levels match monster tooltip', [{'src':s['src'],'lv':s['lv']} for s in actual['skills']] == visible)
        check(f'{skin}: no hero advancement lock on monsters', actual['locks'] == 0)
        page.locator('#tooltip').screenshot(path=str(OUT / f'{skin}_actual_monster.png'))

        # Exercise empty slots, advance-last placement and level metadata on the live renderer.
        for grade, count in [('normal', 0), ('normal', 1), ('elite', 2), ('stage_boss', 3), ('chapter_boss', 3)]:
            page.mouse.move(1590, 790)
            page.evaluate('''({grade,count}) => {
                const a=__monsterBattle, defs=Object.values(__monsterApp.SYS.skill.defs);
                const ordinary=defs.filter(d=>d.ownerKind!=='advance').slice(0,2);
                const advance=defs.find(d=>d.ownerKind==='advance');
                const entries=[...ordinary,advance].slice(0,count);
                const u=a.state.enemies[0];
                u.grade=grade; u.skills=entries.map((d,i)=>({...a.skillInfo(d.id),up:i+1,lv:i+2,readyAt:0}));
                a.renderUnits(a.state,a.root);
            }''', {'grade':grade,'count':count})
            enemy = page.locator('.side-enemy .unit.enemy').first
            enemy.locator('.sprite').hover()
            page.wait_for_selector('#tooltip.show .tip-gear-below.with-skills')
            before = page.evaluate(MEASURE)
            slots = enemy.locator('.cd-slot').evaluate_all('ns=>ns.map(n=>({src:n.querySelector("img")?.getAttribute("src")??null,lv:n.querySelector(".sk-lv")?.textContent??null}))')
            check(f'{skin} {grade}/{count}: three slots retain card ordering and levels', len(before['skills']) == 3 and [{'src':s['src'],'lv':s['lv']} for s in before['skills']] == slots)
            check(f'{skin} {grade}/{count}: missing skills are empty without locks', sum(s['vacant'] for s in before['skills']) == 3-count and before['locks']==0)
            scale=before['base']['w']/278
            check(f'{skin} {grade}/{count}: layout shares hero dimensions', abs(before['base']['width']-278)<.1 and all(abs(s['width']-53)<.1 and abs(s['y']-r['y'])<.5 for s,r in zip(before['skills'],before['rows'])) and abs((before['skills'][0]['x']-before['gear']['x']-before['gear']['w'])/scale-20)<.1)
            if count:
                page.wait_for_function('''() => [...document.querySelectorAll('#tooltip .tip-skills img')].every(n=>n.complete&&n.naturalWidth>0)''')
            page.keyboard.down('Alt')
            page.wait_for_selector('#tooltip .tip-card.alt .d2')
            after=page.evaluate(MEASURE)
            check(f'{skin} {grade}/{count}: Alt keeps equipment and skills in place', after['detail']==2 and abs(before['gear']['x']-after['gear']['x'])<.5 and all(abs(s['x']-t['x'])<.5 and abs(s['y']-t['y'])<.5 and s['lv']==t['lv'] for s,t in zip(before['skills'],after['skills'])))
            if count==3:
                page.locator('#tooltip .pd-cell[data-equip-i]').first.hover()
                page.wait_for_selector('#equipment-item-tooltip.show')
                check(f'{skin} {grade}: equipped item hover opens its option card', page.locator('#equipment-item-tooltip.show').count()==1)
                if grade=='chapter_boss':
                    page.screenshot(path=str(OUT / f'{skin}_monster_alt.png'))
            page.keyboard.up('Alt')
            page.mouse.move(1590,790)
            check(f'{skin} {grade}/{count}: leave closes tooltip', page.locator('#tooltip.show').count()==0)

        # A two-skill monster with an advancement skill leaves its middle slot empty.
        page.evaluate('''() => {
            const a=__monsterBattle,u=a.state.enemies[0]; u.skills.splice(1,1); a.renderUnits(a.state,a.root);
        }''')
        page.locator('.side-enemy .unit.enemy .sprite').first.hover()
        check(f'{skin}: advance skill preserves empty middle slot', page.locator('#tooltip .tip-skill').nth(1).get_attribute('class').endswith(' vacant') and page.locator('#tooltip .tip-skill').nth(2).locator('.sk-lv').count()==1)
        if skin=='d2min':
            frame=page.locator('#tooltip .tip-skill').first.evaluate('n=>({bg:getComputedStyle(n).backgroundImage,padding:getComputedStyle(n).paddingTop})')
            check(f'{skin}: gray skill frame and icon inset match hero styling', 'url(' in frame['bg'] and frame['padding']=='6px')
        page.locator('#tooltip').screenshot(path=str(OUT / f'{skin}_monster_hover.png'))
        for width,height in [(1280,700),(1920,1080)]:
            page.mouse.move(1,1)
            page.set_viewport_size({'width':width,'height':height})
            page.locator('.side-enemy .unit.enemy .sprite').first.hover()
            m=page.evaluate(MEASURE)
            check(f'{skin}: equipment and skill rows align at {width}x{height}', all(abs(s['y']-r['y'])<.5 for s,r in zip(m['skills'],m['rows'])))
        context.close()
        print(f'{skin}: UI checks passed', flush=True)

    page=browser.new_page()
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(f'{BASE}/dev/test.html')
    page.wait_for_function('/PASS|FAIL/.test(document.title)',timeout=240000)
    suite=page.locator('#out li').evaluate_all('ns=>ns.map(n=>({ok:!n.classList.contains("fail"),text:n.textContent}))')
    failures=[s['text'] for s in suite if not s['ok']]
    result={'uiPassed':len(checks),'checks':checks,'suiteTitle':page.title(),'suiteFailures':failures,'errors':errors}
    (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'uiPassed':len(checks),'suiteTitle':page.title(),'failures':failures,'errors':errors},ensure_ascii=True),flush=True)
    check('no browser exceptions',not errors)
    check('full browser regression passes',not failures)
    browser.close()
