import argparse
import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:8834'


def campaign_source(managed=False):
    source = (ROOT / 'output/2026-10-28_nightmare_pace/harness/wheel.js').read_text(encoding='utf-8')
    source = source.replace('let stuck = null;', 'let stuck = null; const firstMilestones = {};')
    if managed:
        source = source.replace('const SYS = buildSystems(D);', 'D.codexLevels = [50000, 500000, 5000000, 50000000]; const SYS = buildSystems(D);')
        adaptive = (ROOT / 'output/2026-10-30_fun_qa/harness/fun_simulation.js').read_text(encoding='utf-8')
        adaptive = adaptive.split('function masteryOrder(c,h,nodes){', 1)[1].split('\nfunction manage(', 1)[0]
        adaptive = 'function masteryOrder(SYS,c,h,nodes){' + adaptive
        adaptive = adaptive.replace('Q.', 'SYS.game.')
        manager = r'''
function managedTraining(SYS, G) {
    for (const h of partyHeroes(SYS, G)) {
        const preferred = {warrior:'war_doubleswing', knight:'kni_charge', archer:'arc_multishot', mage:'mag_chain', priest:'pri_heal'}[h.cls];
        const options = SYS.game.bookState(G, h.uid);
        if (!options.hero?.err) {
            const ids = [h.innate, h.bookSkill || preferred].filter(Boolean);
            for (const id of ids) {
                if (!G.books?.[id]) SYS.game.craftBook(G, id);
                while (SYS.game.learnBook(G, h.uid, id, NOW).ok) {}
            }
            if (!h.bookSkill) {
                const free = SYS.game.bookState(G, h.uid).books.find(x => x.id !== h.innate && D.skillRows.find(s => s.skill_id === x.id)?.owner_id === h.cls);
                if (free) SYS.game.learnBook(G, h.uid, free.id, NOW);
            }
        }
        const a = SYS.game.advanceState(G, h.uid, NOW);
        if (!h.advance && a.branches[0]) SYS.game.advanceStart(G, h.uid, a.branches[0].id, NOW);
        const branch = SYS.game.advanceState(G, h.uid, NOW).branches.find(b => b.id === h.advance);
        if (branch?.skills?.[0]) SYS.game.advanceLearn(G, h.uid, branch.skills[0]);
        while (SYS.game.advanceLevelUp(G, h.uid).ok) {}
    }
}
'''
        adaptive = adaptive.replace('SYS.game.heroCombat(c.G,h)', 'SYS.game.heroCombat(c.G,h)')
        source = source.replace('function runWheel(SYS, B, seed, opt) {', adaptive + manager + '\nfunction runWheel(SYS, B, seed, opt) {')
        source = source.replace('SYS.game.masteryState(G, h.uid)?.nodes.find(x => x.canLearn)', "masteryOrder(SYS, {G,policy:'adaptive'}, h, SYS.game.masteryState(G,h.uid).nodes).find(x => x.canLearn)")
        source = source.replace('if (opt.potion) botPotion(SYS, G);', 'if (opt.potion) botPotion(SYS, G); if (n % 10 === 0) managedTraining(SYS, G);')
    source = source.replace('n++;\n            t +=', '''
            for (const need of [10000, 20000, 50000, 100000]) {
                if (!firstMilestones[need]) {
                    const entry = Object.entries(G.codexExp).find(([, exp]) => exp >= need);
                    if (entry) firstMilestones[need] = {diff, stageId, monster: entry[0], exp: entry[1], tExp};
                }
            }
            n++;
            t +=''')
    source = source.replace('tier.t1 = r2(t);', 'tier.codexExp = {...G.codexExp}; tier.t1 = r2(t);')
    source = source.replace('return { seed, classes, runs:', 'return { firstMilestones, codexExp: {...G.codexExp}, seed, classes, runs:')
    return source


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--label', default='verification')
    parser.add_argument('--campaign', action='store_true')
    parser.add_argument('--managed', action='store_true')
    parser.add_argument('--seeds', default='3,7,8')
    args = parser.parse_args()
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        page = browser.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        if args.campaign:
            page.route('**/dev/codex_pacing.html*', lambda route: route.fulfill(content_type='text/html', body='<title>running</title><h1 id="head"></h1><pre id="sim"></pre><script type="module" src="/dev/codex_pacing.js"></script>'))
            page.route('**/dev/codex_pacing.js', lambda route: route.fulfill(content_type='text/javascript', body=campaign_source(args.managed)))
            page.goto(BASE + '/dev/codex_pacing.html?bot=auto&mastery=1&potion=1&build=max&up=6&upAll=1&stall=800&cap=20000&seeds=' + args.seeds)
            page.wait_for_function('/WHEEL (ok|FAIL)/.test(document.title)', timeout=240000)
            if 'FAIL' in page.title():
                raise RuntimeError(page.locator('#err').inner_text())
            result = json.loads(page.locator('#sim').inner_text())
            result['errors'] = errors
            (OUT / (args.label + '.json')).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
            for row in result['out']:
                print(json.dumps({'seed': row['seed'], 'stuck': row['stuck'], 'hours': row['tExp'] / 3600, 'first': row['firstMilestones'], 'tiers': [{'diff': tier['diff'], 'maxExp': max(tier.get('codexExp', {}).values(), default=0)} for tier in row['tiers']], 'maxExp': max(row['codexExp'].values(), default=0)}, ensure_ascii=True), flush=True)
        else:
            page.goto(BASE + '/dev/test.html')
            page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=240000)
            checks = page.locator('#out li').evaluate_all('ns => ns.map(n => ({ok: !n.classList.contains("fail"), text: n.textContent}))')
            result = {'title': page.title(), 'checks': checks, 'failures': [x['text'] for x in checks if not x['ok']], 'errors': errors}
            (OUT / (args.label + '.json')).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
            print(json.dumps({key: value for key, value in result.items() if key != 'checks'}, ensure_ascii=True), flush=True)
        browser.close()


if __name__ == '__main__':
    main()
