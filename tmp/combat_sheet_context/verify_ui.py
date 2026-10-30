import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:8843'
HARNESS = r'''
import { withLive as reviewWithLive } from './tip.js';
globalThis.__sheetReview = {
    get G() { return G; },
    values(c) {
        const box = document.createElement('div');
        box.innerHTML = sheetRowsHtml(sheetPages().flat(), c);
        return Object.fromEntries([...box.querySelectorAll('.cs-row')].map(row => [row.dataset.stat, row.querySelector('.cs-v').textContent]));
    },
    setup() {
        for (const h of G.heroes) h.level = 30;
        const h = G.heroes[0];
        const party = G.heroes.slice(0,3).map(h=>h.uid);
        G.presets[0].party = party;
        G.presets[0].formation = {tpl:'0-3',ranks:[[],party.slice()]};
        G.buildings.command = 1;
        SYS.game.selectPreset(G,1);
        h.innate = 'war_berserk';
        G.presets[0].tactics.slots[1] = {id:'opt_march_atk', grade:'rare'};
        const uid = 'context-preview-armor';
        G.items[uid] = {uid, slot:'armor', rarity:'magic', ilvl:1, name:{ko:'검증 갑옷',en:'Review armor'},
            implicit:{stat:'def_flat',v:150}, affixes:[{stat:'hp_flat',v:100}], sins:['wrath']};
        G.bags[0].push(uid);
        state.heroUid = h.uid; state.tab = 'character'; state.invNo = 1;
        state.modal = null;
        writeTutorialSeen(tutorialOwner(), ['expedition', 'loot', 'mastery', 'potions', 'construction']);
        tutorial.reset(); render();
        return {own:this.values(combatOf(h)), party:this.values(SYS.game.heroCombat(G,h)),
            preview:this.values(combatWith(h,G.items[uid]))};
    },
    preview(on) {
        previewSheet(G.heroes[0], on ? G.items['context-preview-armor'] : null);
    },
    changePreset() { SYS.game.selectPreset(G,2); render(); },
    expedition() {
        SYS.game.selectPreset(G,1);
        const stage = 1051;
        const previous = D.stageOrder[D.stageOrder.indexOf(stage)-1];
        if (!G.progress.cleared.includes(previous)) G.progress.cleared.push(previous);
        runBattle(stage,{defer:true,resume:{t:0,running:false,speed:1}});
        const run = state.battle?.run;
        if (!run) throw Error('Expedition did not start');
        run.fixed.shrine = 'sloth';
        run.report.shrine = 'sloth';
        const h = G.heroes[0], unit = run.result.party.find(p => p.uid === h.uid);
        let buff = null;
        for (let i=1;i<=60 && !run.done;i++) {
            SYS.game.stepRun(G,run,i/10);
            buff = run.result.timeline.find(e => e.e === 'buff' && e.u === unit.key && e.stat === 'atk_pct' && e.s === 'war_berserk');
            if (buff) break;
        }
        if (!buff) throw Error('No attack buff from the real combat simulation');
        const time = run.battle.status().t;
        const live = Object.assign({},...run.result.timeline.filter(e => e.e==='stat' && e.u===unit.key && e.t<=time).map(e=>e.v));
        const base = SYS.game.runCombat(G,run,h);
        const own = combatOf(h);
        state.battle.resume = {t:time,running:false,speed:1};
        state.battle.introShown = true;
        state.tab = 'expedition'; state.exp = 'battle'; render();
        return {own:this.values(own), base:this.values(base), live:this.values(reviewWithLive(base,live)),
            buff, time, ownCdr:own.cooldown_reduction, expeditionCdr:base.cooldown_reduction,
            tactic:run.tactics.map(t=>t.id), heroIndex:run.result.party.indexOf(unit)};
    },
    character() { hideTip(); state.tab='character'; render(); return this.values(combatOf(G.heroes[0])); }
};
'''


def values(page, selector):
    return page.locator(selector).evaluate_all('rows => Object.fromEntries(rows.map(row => [row.dataset.stat,row.querySelector(".cs-v").textContent]))')


def main():
    report = {'checks': [], 'errors': []}

    def check(name, ok):
        report['checks'].append({'name': name, 'ok': bool(ok)})
        assert ok, name
        print(name + ': PASS', flush=True)

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='msedge', headless=True)
            for language in ['ko', 'en']:
                context = browser.new_context(viewport={'width': 1600, 'height': 1000})
                context.route('https://**', lambda route: route.abort())
                context.route('**/ui/app.js', lambda route: route.fulfill(status=200, content_type='text/javascript', body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8') + HARNESS))
                page = context.new_page()
                page.on('pageerror', lambda error: report['errors'].append(str(error)))
                page.goto(BASE + '/index.html?dev=newgame&tab=character&lang=' + language)
                page.wait_for_function('globalThis.__sheetReview?.G?.heroes?.length > 0', timeout=60000)
                fixture = page.evaluate('() => __sheetReview.setup()')
                panels = '.cs-scroll[data-sheet] .cs-row'
                report[language + '_fixture'] = {**fixture, 'shown': values(page, panels)}
                check(language + ' character excludes active tactics', values(page, panels) == fixture['own'] and fixture['own'] != fixture['party'])
                page.screenshot(path=str(OUT / ('character_' + language + '.png')))
                page.evaluate('() => __sheetReview.preview(true)')
                check(language + ' item preview uses permanent stats', values(page, panels) == fixture['preview'])
                page.evaluate('() => __sheetReview.preview(false)')
                check(language + ' leaving item restores permanent stats', values(page, panels) == fixture['own'])
                page.evaluate('() => __sheetReview.changePreset()')
                check(language + ' selected preset does not change character stats', values(page, panels) == fixture['own'])
                expedition = page.evaluate('() => __sheetReview.expedition()')
                report[language] = expedition
                check(language + ' expedition includes tactics and shrine', 'opt_march_atk' in expedition['tactic'] and expedition['expeditionCdr'] > expedition['ownCdr'] and expedition['base'] != expedition['own'])
                check(language + ' real combat buff changes detailed stats', expedition['live'] != expedition['base'])
                page.keyboard.down('Alt')
                page.locator('.side-party .unit').nth(expedition['heroIndex']).hover()
                page.wait_for_selector('#tooltip .tip-unit-col.d2', timeout=10000)
                shown = values(page, '#tooltip .tip-unit-col.d1 .cs-row, #tooltip .tip-unit-col.d2 .cs-row')
                report[language]['shown'] = shown
                check(language + ' expedition tooltip displays current buffed stats', shown == expedition['live'])
                page.screenshot(path=str(OUT / ('expedition_' + language + '.png')))
                page.keyboard.up('Alt')
                own = page.evaluate('() => __sheetReview.character()')
                check(language + ' returning to character excludes expedition buffs', values(page, panels) == own)
                context.close()
            browser.close()
        check('no browser errors', not report['errors'])
    finally:
        (OUT / 'ui_verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
