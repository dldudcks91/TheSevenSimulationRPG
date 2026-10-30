"""Independently sweep stage seed retries, restored reservations and UI help.

Run against an existing serve.py process. Every test uses an isolated browser
context; the real browser profile and the user's save are never accessed.
"""
import argparse
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / '2026-10-30_stage_seed'

SETUP = r'''async () => {
    const data = await import('/ui/data.js');
    const random = await import('/game_logic/rng.js');
    await data.loadData('/data/');
    const D = data.D;
    const SYS = data.buildSystems(D, {openAll: () => true});
    const clone = value => JSON.parse(JSON.stringify(value));
    const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const enemies = result => result.timeline.filter(e => e.e === 'round').map(e => ({
        n:e.n, kind:e.kind,
        enemies:e.enemies.map(u => ({key:u.key, monsterId:u.monsterId, grade:u.grade,
            sin:u.sin, traits:u.traits, gear:u.gear, actives:u.actives})),
    }));
    const loot = result => ({
        drops:result.drops.map(it => JSON.stringify(it)).sort(),
        blueprints:[...result.blueprints].sort(),
    });
    const candidates = SYS.hero.rollCandidates(random.makeRng(6601), D.balance.party_size_max);
    const now = 1700000000000;
    window.__sweep = {D,SYS,clone,eq,enemies,loot,candidates,now,...random};
    return {stages:D.stageOrder.filter(id => D.stages[id].chapter <= 5),
        difficulties:D.difficultyList.map(d => d.id)};
}'''

RETRY_SWEEP = r'''({stages,difficulties,seeds}) => {
    const {D,SYS:S,clone,eq,enemies,candidates,now} = window.__sweep;
    const checks = [];
    const require = (condition, message) => {if (!condition) throw new Error(message);};
    for (const seed of seeds) for (const stageId of stages) for (const difficulty of difficulties) {
        const item = {seed,stageId,chapter:D.stages[stageId].chapter,difficulty,ok:false};
        try {
            const g = S.game.newGame(seed,candidates,now);
            const before = JSON.stringify(g);
            const request = S.game.stageSeedRequest(g,stageId,1,difficulty);
            require(JSON.stringify(g) === before, 'request mutated save');
            const first = S.game.departRun(g,stageId,now,1,null,difficulty);
            require(first.ok, 'first departure: ' + first.err);
            const grant = clone(first.run.stageSeeds);
            const firstEnemies = enemies(first.run.result);
            require(firstEnemies.length === 1 && firstEnemies[0].enemies.length > 0,
                'first round did not open any enemies');
            require(eq(request,grant), 'request and issued grant differ');
            require(S.game.retreatRun(g,first.run,now+1).ok, 'retreat rejected');
            require(g.runs[0].stageSeeds.rounds.every(r => r === null), 'retreat left ownership');
            const second = S.game.departRun(g,stageId,now+2,1,null,difficulty);
            require(second.ok, 'retry rejected: ' + second.err);
            require(eq(second.run.stageSeeds.rounds,grant.rounds), 'retry rerolled tickets');
            require(second.run.stageSeeds.combatSeed !== grant.combatSeed,
                'retry did not receive fresh combat seed');
            require(eq(enemies(second.run.result),firstEnemies), 'retry rerolled static enemies');
            const stored = S.game.serialize(g,now+3);
            const restored = S.game.deserialize(stored);
            require(eq(restored.stageDecks,g.stageDecks), 'deserialize changed ledger');
            require(eq(restored.runs[0].stageSeeds,g.runs[0].stageSeeds),
                'deserialize changed pending ownership');
            S.game.closeRun(restored,now+4);
            const closed = JSON.stringify(restored.stageDecks);
            S.game.closeRun(restored,now+5);
            require(JSON.stringify(restored.stageDecks) === closed, 'double close duplicated tickets');
            const third = S.game.departRun(restored,stageId,now+6,1,null,difficulty);
            require(third.ok, 'restored retry rejected: ' + third.err);
            require(eq(third.run.stageSeeds.rounds,grant.rounds), 'restore rerolled tickets');
            require(eq(enemies(third.run.result),firstEnemies), 'restore rerolled static enemies');
            item.rounds = grant.rounds.length;
            item.enemies = firstEnemies[0].enemies.length;
            item.grades = firstEnemies[0].enemies.map(e => e.grade);
            item.ok = true;
        } catch(error) {item.error = String(error.stack || error);}
        checks.push(item);
    }
    return checks;
}'''

FULL_RUN_SWEEP = r'''({difficulties,seeds}) => {
    const {D,SYS:S,makeRng,deriveSeed,enemies,loot,eq,candidates,now} = window.__sweep;
    const stages = D.stageOrder.filter(id => {
        const s = D.stages[id];
        return s.chapter <= 5 && (s.boss_grade === 'chapter_boss'
            || (s.cell === 3 && [1,4].includes(s.stage_num)));
    });
    const state = S.game.newGame(6601,candidates,now);
    const base = S.game.partyOf(state).map(uid => ({uid,
        combat:S.game.heroCombat(state,S.game.heroById(state,uid))}));
    const party = attack => base.map(u => ({uid:u.uid,combat:{...u.combat,
        atk_physical:{min:attack,max:attack},atk_magic:undefined,
        attack_type:'physical',basic_attack:true,hp_max:1000000000,level:50,
        find_own:{magic:0,item:0,gold:0},find_party:null}}));
    const checks = [];
    const require = (condition, message) => {if (!condition) throw new Error(message);};
    for (const seed of seeds) for (const stageId of stages) for (const difficulty of difficulties) {
        const item = {seed,stageId,chapter:D.stages[stageId].chapter,difficulty,ok:false};
        try {
            const rounds = S.battle.stageRounds(D.stages[stageId]);
            const seeds = rounds.map((_,i) => deriveSeed(seed,i+1));
            const run = (combatSeed,attack) => {
                const r = S.battle.createRun(party(attack),stageId,makeRng(combatSeed),
                    S.game.stageLevel(stageId,difficulty),null,D.balance.potion_slot_max,
                    null,difficulty,null,null,null,seeds);
                let step;
                for (let n=0; (step=r.next()) && !step.ended; n++)
                    if (n > rounds.length) throw new Error('run failed to terminate');
                return r.result;
            };
            const a=run(11,20000000), b=run(12,20000000), c=run(11,1000000);
            require(a.won && b.won && c.won,'powered party lost: ' + [a.reason,b.reason,c.reason]);
            require(a.rounds.length === rounds.length && b.rounds.length === rounds.length
                && c.rounds.length === rounds.length,'did not reach every round');
            require(eq(enemies(a),enemies(b)) && eq(enemies(a),enemies(c)),
                'combat seed or attack changed encounters');
            require(eq(loot(a),loot(b)) && eq(loot(a),loot(c)),
                'combat seed or attack changed equipment/blueprints');
            item.rounds = rounds.length;
            item.grades = [...new Set(enemies(a).flatMap(r=>r.enemies.map(e=>e.grade)))];
            item.drops = a.drops.length;
            item.blueprints = a.blueprints.length;
            item.events = [a.timeline.length,b.timeline.length,c.timeline.length];
            item.ok = true;
        } catch(error) {item.error = String(error.stack || error);}
        checks.push(item);
    }
    return {stages,checks};
}'''


def ui_smoke(browser, base):
    result = []
    for lang in ['ko', 'en']:
        context = browser.new_context(viewport={'width': 1600, 'height': 1000})
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        item = {'language': lang, 'ok': False}
        try:
            page.goto(f'{base}/index.html?dev=form&lang={lang}', wait_until='domcontentloaded')
            page.wait_for_selector('.dw-difficulty', timeout=60000)
            form_text = page.locator('.main').inner_text()
            if 'undefined' in form_text or 'NaN' in form_text:
                raise ValueError('invalid values in departure form')
            page.screenshot(path=str(OUT / f'seed_departure_{lang}.png'))
            page.goto(f'{base}/index.html?dev=newgame&tab=help&lang={lang}', wait_until='domcontentloaded')
            page.wait_for_selector('#help-expedition', timeout=60000)
            text = page.locator('#help-expedition').inner_text()
            required = ['철수', '미완료', '매직찬스'] if lang == 'ko' else ['unfinished rounds', 'Multiple parties', 'Magic Find']
            if not all(word in text for word in required):
                raise ValueError('new expedition help wording missing')
            if 'help.expedition.' in text or 'undefined' in text or 'NaN' in text:
                raise ValueError('unresolved help text')
            page.screenshot(path=str(OUT / f'seed_help_{lang}.png'))
            item['help_text'] = text
            item['ok'] = not errors
        except Exception as error:
            item['error'] = str(error)
        item['errors'] = errors
        result.append(item)
        context.close()
    return result


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8815)
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    base = f'http://127.0.0.1:{args.port}'
    result = {}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel='msedge', headless=True)
        context = browser.new_context()
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        context.route('**/__stage_seed_sweep.html', lambda route: route.fulfill(
            status=200, content_type='text/html', body='<!doctype html><title>Stage seed sweep</title>'))
        page.goto(base + '/__stage_seed_sweep.html')
        scope = page.evaluate(SETUP)
        print(json.dumps({'phase': 'loaded', **scope}), flush=True)
        result['scope'] = {**scope, 'retry_seeds': [1, 3401, 4294967295], 'full_run_seeds': [77, 98765]}
        result['retries'] = page.evaluate(RETRY_SWEEP, {**scope, 'seeds': result['scope']['retry_seeds']})
        print(json.dumps({'phase': 'retries', 'count': len(result['retries']),
            'failures': sum(not c['ok'] for c in result['retries'])}), flush=True)
        result['full_runs'] = page.evaluate(FULL_RUN_SWEEP,
            {'difficulties': scope['difficulties'], 'seeds': result['scope']['full_run_seeds']})
        print(json.dumps({'phase': 'full_runs', 'count': len(result['full_runs']['checks']),
            'failures': sum(not c['ok'] for c in result['full_runs']['checks'])}), flush=True)
        result['page_errors'] = errors
        context.close()
        result['ui'] = ui_smoke(browser, base)
        browser.close()
    checks = result['retries'] + result['full_runs']['checks'] + result['ui']
    result['summary'] = {'checks': len(checks), 'passed': sum(c['ok'] for c in checks),
        'failures': sum(not c['ok'] for c in checks), 'page_errors': len(result['page_errors'])}
    (OUT / 'sweep.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result['summary']), flush=True)
    if result['summary']['failures'] or result['page_errors']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
