import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent

HARNESS = r'''async () => {
    const {buildSystems, D} = await import('/ui/data.js');
    const {makeRng} = await import('/game_logic/rng.js');
    const SYS = buildSystems(D);
    const g = SYS.game.newGame(7, SYS.hero.rollCandidates(makeRng(7), 3), 0);
    const base = SYS.game.partyOf(g).map(uid => ({uid, combat: SYS.game.heroCombat(g, SYS.game.heroById(g, uid))}));
    const party = (atk, otherAtk = atk, period = null) => base.map((u, i) => ({
        ...u,
        combat: {...u.combat, atk_physical: {min:i ? otherAtk : atk, max:i ? otherAtk : atk}, atk_magic: undefined,
            attack_type:'physical', basic_attack:true, hp_max:100000, level:50,
            ...(period ? {attack_period:period} : {})},
        actives: i ? [] : [{id:'arc_snipe',source:'innate'}],
    }));
    const analyze = result => {
        const attempts = [];
        let current = null, round = 0;
        for (const ev of result.timeline) {
            if (ev.e === 'round') round = ev.n ?? ev.round;
            if (ev.e === 'skill' && ev.u === 'p0' && ev.s === 'arc_snipe' && !ev.trigger) {
                current = {round, open:ev, shots:[], stops:[]}; attempts.push(current);
            }
            if (!current) continue;
            if (['hit','dodge','evade'].includes(ev.e) && ev.a === 'p0' && ev.s === 'arc_snipe') current.shots.push(ev);
            if ((ev.e === 'stagger' && ev.u === 'p0') || (ev.e === 'buff' && ev.d === 'p0')) current.stops.push(ev);
            if (ev.e === 'chanEnd' && ev.u === 'p0' && ev.s === 'arc_snipe') {
                current.end = ev;
                current = null;
            }
        }
        return {won:result.won, duration:result.duration, attempts, party:result.party};
    };
    const summary = [];
    const traces = [];
    for (const [label, atk, other] of [['weak',1,1],['strong_all',2000,2000],['strong_allies',1,2000],['moderate',100,100]]) {
        for (let seed=1; seed<=10; seed++) {
            const result = SYS.battle.simulate(party(atk, other), 1013, makeRng(seed));
            const data = analyze(result);
            summary.push({label,seed,opens:data.attempts.length, fired:data.attempts.filter(a=>a.shots.length).length,
                canceled:data.attempts.filter(a=>a.end && !a.shots.length).length,
                unfinished:data.attempts.filter(a=>!a.end).length});
            if (seed===1) traces.push({label, ...data, timeline:result.timeline});
        }
    }
    return {skill:{cool:SYS.skill.defs.arc_snipe.cool,charge:SYS.skill.defs.arc_snipe.chargeSec}, summary, traces};
}'''

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:8791/dev/test.html')
    page.wait_for_function('/PASS|FAIL/.test(document.title)', timeout=180000)
    baseline = {'title':page.title(), 'failures':page.locator('#out li.fail').all_text_contents(),'errors':errors}
    data = page.evaluate(HARNESS)
    (OUT / 'evidence.json').write_text(json.dumps({'baseline':baseline, **data}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'baseline':baseline, 'skill':data['skill'], 'summary':data['summary']}, ensure_ascii=False))
    browser.close()
