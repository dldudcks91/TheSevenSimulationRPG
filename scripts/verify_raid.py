"""Headless combat and browser checks for the three-party raid slice."""
import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/2026-10-30_raid'
BASE = 'http://127.0.0.1:8799'

HARNESS = '''
window.__raidQA = {
    ready: () => SYS.raid.entryState(G, 'wrath'),
    setLevel: level => {
        G.heroes.forEach(hero => { hero.level = 1; });
        if (G.heroes[0]) G.heroes[0].level = level;
        render();
        return SYS.raid.entryState(G, 'wrath');
    },
    view: () => raidSession?.run?.view(),
    advance: sec => { raidSession.run.advance(sec); render(); },
    tab: tab => { state.tab = tab; render(); },
    clockRefresh: () => { clockRender=true; expTick(); },
    session: () => ({source:raidSession?.source,paused:raidSession?.paused,tab:state.tab,tool:state.lab.tool}),
    save: () => JSON.stringify({heroes:G.heroes,items:G.items,progress:G.progress,potions:G.potions,resources:G.resources}),
};
'''


def verify_raid(browser, calibrate=False):
    context = browser.new_context(viewport={'width': 1600, 'height': 900})
    context.route('**/ui/app.js', lambda route: route.fulfill(status=200, content_type='text/javascript', body=(ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + HARNESS))
    page = context.new_page()
    errors, assets, checks = [], [], []
    def check(name, ok):
        checks.append({'name': name, 'ok': bool(ok)})
    page.on('pageerror', lambda error: (errors.append(str(error)), print('PAGE ERROR: ' + str(error).encode('ascii', 'backslashreplace').decode(), flush=True)))
    page.on('response', lambda response: assets.append({'status': response.status, 'url': response.url}) if response.status >= 400 and response.url.startswith(BASE) else None)
    page.goto(BASE + '/index.html?dev=raid&lang=ko', wait_until='domcontentloaded')
    page.wait_for_selector('.raid-page', timeout=60000)
    page.evaluate('__raidQA.setLevel(1)')
    page.wait_for_selector('.raid-page', timeout=60000)
    check('lab random training is available with owned heroes at level 1', page.evaluate('__raidQA.ready().have') == 1
          and page.locator('[data-lab-tools] button').nth(1).is_enabled()
          and page.locator('[data-raid-start]').is_enabled()
          and page.locator('[data-raid-locked]').count() == 0)
    page.evaluate('__raidQA.setLevel(29)')
    check('lab random training remains available below the real entry level', page.evaluate('__raidQA.ready().have') == 29
          and not page.evaluate('__raidQA.ready().open')
          and page.locator('[data-lab-tools] button').nth(1).is_enabled()
          and page.locator('[data-raid-start]').is_enabled()
          and page.locator('[data-raid-locked]').count() == 0)
    page.evaluate('__raidQA.setLevel(1)')
    check('raid is a lab tool, with no separate sidebar entry', page.locator('.nav [data-tab="raid"]').count() == 0
          and page.locator('.nav [data-tab="lab"].on').count() == 1)
    check('lab tools are ordered Item Generator then Raid', page.locator('[data-lab-tools] button').all_text_contents() == ['아이템 생성기', '레이드']
          and page.locator('[data-lab-tools] button.on').inner_text() == '레이드')
    page.screenshot(path=str(OUT / 'raid_ready_ko.png'))
    check('three parties and nine hero cards', page.locator('[data-raid-party]').count() == 3 and page.locator('[data-raid-hero]').count() == 9)
    check('raid has no tactical command buttons or auto command control', page.locator('[data-raid-command], [data-raid-auto], .raid-commands').count() == 0)
    roster_before = page.locator('[data-raid-hero]').evaluate_all('cards => cards.map(card => card.title)')
    page.locator('[data-raid-reroll]').click()
    roster_after = page.locator('[data-raid-hero]').evaluate_all('cards => cards.map(card => card.title)')
    check('reroll changes the nine random hero cards before combat', len(roster_after) == 9
          and all(roster_after) and roster_after != roster_before and page.locator('[data-raid-start]').is_enabled())
    page.locator('[data-raid-source="own"]').click()
    check('own party entry retains its real entry rules on a new save', not page.evaluate('__raidQA.ready().open')
          and page.locator('[data-raid-start]').is_disabled() and page.locator('.raid-readiness.locked').count() == 1)
    page.locator('[data-raid-source="practice"]').click()
    check('rapid normal battle FX replace their completion listener', page.evaluate('''async () => {
        const {fxHit}=await import('./ui/fx.js');
        const host=document.createElement('div'); host.style.cssText='position:absolute;left:-10000px;top:0';
        host.innerHTML='<div><div class="unit"><div class="sprite"></div></div></div>';
        document.body.append(host);
        const n=host.querySelector('.unit'), listeners=new Set();
        const add=n.addEventListener.bind(n), remove=n.removeEventListener.bind(n);
        n.addEventListener=(type,fn,...args)=>{if(type==='animationend')listeners.add(fn);return add(type,fn,...args)};
        n.removeEventListener=(type,fn,...args)=>{if(type==='animationend')listeners.delete(fn);return remove(type,fn,...args)};
        const unit={node:n,key:'fx-smoke',side:'enemy'};
        for(let idx=0;idx<30;idx++)fxHit({idx,speed:4},null,unit,{crit:false,ty:'physical'},false);
        const count=listeners.size;host.remove();return count===1;
    }'''))
    before_save = page.evaluate('__raidQA.save()')
    diagnostic = page.evaluate('''async calibrate => {
        const {SYS,D} = await import('./ui/data.js');
        const {makeRng} = await import('./game_logic/rng.js');
        const {checkRaid,calibrateRaid} = await import('./dev/raid_test.js');
        const teams = SYS.raid.practiceTeams('wrath');
        const metrics = [];
        for (let seed=1; seed<=10; seed++) {
            const run=SYS.raid.createRun(teams,'wrath',makeRng(seed));
            run.advance(Infinity);
            const v=run.view();
            metrics.push({seed,won:v.won,reason:v.reason,t:v.t,hp:v.boss.hp,breaks:v.breaks,failed:v.failedBreaks,parties:v.parties.map(p=>({alive:p.alive,dealt:p.dealt,healed:p.healed})),events:run.result.timeline.length});
        }
        return {checks:checkRaid(SYS,D), calibration:calibrate ? calibrateRaid(SYS,D) : null, teams:teams.map(t=>t.map(p=>({cls:p.hero.cls,hp:p.combat.hp_max,period:p.combat.action_period}))),metrics};
    }''', calibrate)
    (OUT / 'combat_diagnostic.json').write_text(json.dumps(diagnostic, ensure_ascii=False, indent=2), encoding='utf-8')
    page.evaluate('''() => {
        const root=document.querySelector('.raid-field');
        const p=window.__raidFXProbe={reads:0,added:0,before:root.querySelectorAll('*').length};
        const descriptor=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'offsetWidth');
        Object.defineProperty(HTMLElement.prototype,'offsetWidth',{...descriptor,get(){
            if(root.contains(this))p.reads++;
            return descriptor.get.call(this);
        }});
        p.observe=()=>{
            p.before=root.querySelectorAll('*').length;
            p.observer=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)p.added++});
            p.observer.observe(root,{childList:true,subtree:true});
        };
    }''')
    page.locator('[data-raid-start]').click()
    check('reroll is disabled while the random encounter is running', page.locator('[data-raid-reroll]').is_disabled())
    page.evaluate('__raidFXProbe.observe()')
    page.wait_for_function('__raidQA.view()?.t > 3', timeout=15000)
    check('raid effects reuse elements without forced width reads or new particle trees', page.evaluate('''() => {
        const p=__raidFXProbe,root=document.querySelector('.raid-field');p.observer.disconnect();
        return p.reads===0&&p.added===0&&p.before===root.querySelectorAll('*').length
            &&root.querySelectorAll('.raid-hit-mark').length===10&&root.querySelectorAll('.raid-float').length===30
            &&root.querySelectorAll('.fx-layer').length===0;
    }'''))
    check('raid animations avoid portrait filters', page.evaluate('''() => {
        const root=document.querySelector('.raid-field');
        return [...root.querySelectorAll('*')].every(n=>getComputedStyle(n).filter==='none')
            &&document.getAnimations().filter(a=>root.contains(a.effect?.target)).every(a=>a.effect.getKeyframes().every(f=>!f.filter));
    }'''))
    check('background clock refresh preserves the live battlefield', page.evaluate('''() => {
        const root=document.querySelector('.raid-page'),runTime=__raidQA.view().t;
        __raidQA.clockRefresh();
        return root===document.querySelector('.raid-page')&&root.isConnected&&__raidQA.view().t===runTime;
    }'''))
    page.screenshot(path=str(OUT / 'raid_warning_ko.png'))
    page.locator('[data-lab-tools] button').nth(0).click()
    tool_away_at = page.evaluate('__raidQA.view().t')
    page.wait_for_timeout(600)
    check('item generator remains available and switching tools pauses raid', page.locator('.lab-item').count() == 1
          and page.locator('.raid-page').count() == 0 and page.evaluate('__raidQA.view().t') == tool_away_at)
    page.screenshot(path=str(OUT / 'lab_item_with_raid_ko.png'))
    page.locator('[data-lab-tools] button').nth(1).click()
    check('returning to Raid resumes the same encounter', page.evaluate('__raidQA.view().t') >= tool_away_at
          and page.locator('[data-lab-tools] button.on').inner_text() == '레이드')
    page.locator('[data-raid-pause]').click()
    paused_at = page.evaluate('__raidQA.view().t')
    page.wait_for_timeout(800)
    check('pause freezes combat time', page.evaluate('__raidQA.view().t') == paused_at)
    page.locator('[data-raid-pause]').click()
    page.wait_for_function('__raidQA.view().t > ' + str(paused_at + .4))
    page.evaluate("__raidQA.tab('party')")
    away_at = page.evaluate('__raidQA.view().t')
    page.wait_for_timeout(600)
    check('leaving raid pauses the trial', page.evaluate('__raidQA.view().t') == away_at)
    page.evaluate("__raidQA.tab('lab')")
    page.wait_for_function('__raidQA.view().t > ' + str(away_at + .2))
    check('return resumes the same encounter', page.evaluate('__raidQA.view().t') > away_at)
    check('lab remembers its selected raid tool', page.evaluate('__raidQA.session().tool') == 'raid')
    page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true})")
    hidden_at = page.evaluate('__raidQA.view().t')
    page.wait_for_timeout(600)
    check('hidden document pauses the trial', page.evaluate('__raidQA.view().t') == hidden_at)
    page.evaluate("delete document.hidden")
    page.locator('.lang-btn').click()
    page.wait_for_timeout(200)
    check('language switch preserves encounter', page.locator('.raid-page').count() == 1 and page.evaluate('__raidQA.view().t') >= hidden_at)
    check('English labels are translated', 'Random parties' in page.locator('.raid-page').inner_text() and 'raid.' not in page.locator('.raid-page').inner_text())
    page.evaluate('__raidQA.advance(30)')
    page.get_by_role('button', name='Expand', exact=True).click()
    check('expanded battlefield uses the menu space', page.locator('#app.raid-expanded').count() == 1)
    page.screenshot(path=str(OUT / 'raid_expanded_en.png'))
    page.evaluate('__raidQA.advance(Infinity)')
    page.wait_for_selector('.raid-result:not([hidden])')
    check('completed encounter opens results', page.locator('.raid-result-rows > div').count() == 3)
    check('results show party damage healing and survivors without command totals', page.locator('.raid-result-rows > div').evaluate_all('rows => rows.every(row => row.children.length === 4)'))
    check('trial does not mutate hero equipment or progress', page.evaluate('__raidQA.save()') == before_save)
    page.screenshot(path=str(OUT / 'raid_result_en.png'))
    page.locator('[data-raid-retry]').click()
    check('retry starts a new encounter', not page.evaluate('__raidQA.view().ended') and page.locator('.raid-result').is_hidden())
    page.locator('[data-raid-retreat]').click()
    check('retreat exits a trial immediately', page.evaluate('__raidQA.view().reason') == 'retreat' and page.locator('.raid-result').is_visible())
    page.get_by_role('button', name='View battlefield', exact=True).click()
    page.locator('[aria-label="Raid help"]').click()
    check('raid help is inside the lab folder', page.locator('#help-lab').is_visible()
          and page.locator('#help-lab-raid_overview').is_visible()
          and page.locator('#help-lab-raid_commands').count() == 0
          and 'Guard, focus and support' not in page.locator('#help-lab').inner_text())
    route_context = browser.new_context(viewport={'width': 1600, 'height': 900})
    route_context.route('**/ui/app.js', lambda route: route.fulfill(status=200, content_type='text/javascript', body=(ROOT / 'src/ui/app.js').read_text(encoding='utf-8') + HARNESS))
    route_page = route_context.new_page()
    route_page.on('pageerror', lambda error: errors.append(str(error)))
    for query in ['dev=newgame&tab=lab&lab=raid', 'dev=newgame&tab=raid']:
        route_page.goto(BASE + '/index.html?' + query, wait_until='domcontentloaded')
        route_page.wait_for_selector('.raid-page', timeout=60000)
        route_page.evaluate('__raidQA.setLevel(29)')
        route_page.wait_for_selector('.raid-page', timeout=60000)
        check('direct route opens random training at level 29: ' + query, route_page.evaluate('__raidQA.ready().have') == 29
              and not route_page.evaluate('__raidQA.ready().open')
              and route_page.locator('[data-raid-locked]').count() == 0
              and route_page.locator('[data-lab-tools] button').nth(1).is_enabled()
              and route_page.locator('[data-raid-start]').is_enabled())
        check('lab route: ' + query, route_page.locator('[data-lab-tools] button.on').inner_text() == '레이드'
              and route_page.locator('.nav [data-tab="lab"].on').count() == 1)
        route_page.locator('[data-raid-start]').click()
        route_page.wait_for_function('__raidQA.view()?.t > 0', timeout=15000)
        check('direct route starts random training below level 30: ' + query, route_page.evaluate('__raidQA.session().source') == 'practice'
              and route_page.evaluate('__raidQA.view().t') > 0)
    route_context.close()
    check('local artwork loads', not assets)
    check('no browser exceptions', not errors)
    result = {'checks': checks, 'combat': diagnostic['checks'], 'calibration': diagnostic['calibration'], 'errors': errors, 'assets': assets}
    (OUT / 'verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=True))
    if any(not c['ok'] for c in checks + diagnostic['checks']['checks']):
        raise AssertionError('Raid verification failed; see output/2026-10-30_raid/verification.json')
    context.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--baseline', action='store_true')
    parser.add_argument('--raid', action='store_true')
    parser.add_argument('--calibrate', action='store_true')
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        if args.raid:
            verify_raid(browser, args.calibrate)
            browser.close()
            return
        page = browser.new_page(viewport={'width': 1600, 'height': 900})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE + '/dev/test.html')
        page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=180000)
        result = {'title': page.title(), 'failures': page.locator('#out li.fail').all_text_contents(), 'errors': errors}
        filename = 'baseline.json' if args.baseline else 'regression.json'
        (OUT / filename).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps(result, ensure_ascii=True))
        browser.close()


if __name__ == '__main__':
    main()
