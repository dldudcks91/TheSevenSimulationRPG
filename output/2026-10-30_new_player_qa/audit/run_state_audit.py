"""Run isolated state QA against current repository modules in headless Edge."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import hashlib
import json
import mimetypes
from pathlib import Path
import threading
import sys
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
SOURCE = {
    '/' + path.relative_to(ROOT / 'src').as_posix(): path.read_bytes()
    for path in (ROOT / 'src').rglob('*')
    if path.is_file() and path.suffix in ('.js', '.csv', '.json')
}

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT / 'src')))
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        page = browser.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda msg: print('BROWSER', msg.type, msg.text) if msg.type == 'error' else None)
        page.on('requestfailed', lambda req: print('FAILED REQUEST', req.url, req.failure))
        def local_file(route):
            path = unquote(urlparse(route.request.url).path)
            if path == '/audit-harness.html':
                route.fulfill(content_type='text/html', body='<html><title>State audit</title></html>')
                return
            if path not in SOURCE:
                print('MISSING SOURCE', path)
                route.fulfill(status=404, body='missing')
                return
            route.fulfill(content_type=mimetypes.guess_type(path)[0] or 'application/octet-stream', body=SOURCE[path])
        page.route('**/*', local_file)
        page.goto(f'http://127.0.0.1:{server.server_port}/audit-harness.html')
        result = page.evaluate('''async () => {
            const {loadData,buildSystems,D}=await import('/ui/data.js');
            const {makeRng}=await import('/game_logic/rng.js');
            await loadData('/data/');
            const SYS=buildSystems(D), game=SYS.game;
            const at=1700000000000, hour=3600000;
            const fresh=seed=>game.newGame(seed,SYS.hero.rollStartParty(makeRng(seed),D.balance.party_size_max),at);
            const clone=s=>JSON.parse(JSON.stringify(s));
            const records=[];
            const unlocked=seed=>{
                const s=fresh(seed);
                let runs=0;
                while(s.resources.gold<2900 && runs<500) {
                    const r=game.resolveBattle(s,D.stageOrder[0],at);
                    if(!r.ok)throw new Error('prerequisite battle '+JSON.stringify(r));
                    for(const h of s.heroes)game.autoEquip(s,h.uid);
                    for(const uid of [...s.bags[0]])game.salvage(s,uid);
                    runs++;
                }
                const builds=[];
                for(const id of ['shop','tavern','forge','storage']) {
                    const r=game.construct(s,id,at);builds.push({id,...r});
                    if(!r.ok)throw new Error('prerequisite construct '+id+JSON.stringify(r));
                }
                if(!game.hasFeature(s,'lab_res'))throw new Error('res not opened');
                s.auditSetup={runs,builds};
                return s;
            };
            for(const seed of [1,2,3,4,5]) {
                const plain=unlocked(seed);game.labSettle(plain,at);
                const withResearch=game.deserialize(game.serialize(plain,at));
                const start=game.labResearchStart(withResearch,'res','seats',at);
                const reload=game.deserialize(game.serialize(withResearch,at));
                game.closeRun(reload,at+24*hour);
                const research=clone(reload.labResearch);
                const baselineResult=game.labSettle(plain,at+24*hour);
                const researchResult=game.labSettle(reload,at+24*hour);
                records.push({name:'offline_cap_research',seed,setup:plain.auditSetup,start,research,capHours:D.balance.dispatch_offline_cap_hours,baseline:plain.materials,actual:reload.materials,baselineResult,researchResult,expectedEach:60*D.balance.dispatch_offline_cap_hours});
            }
            const online=unlocked(10);const onlineBefore=clone(online.materials);game.labSettle(online,at);
            for(let i=1;i<=24*60;i++)game.labSettle(online,at+i*60000);
            records.push({name:'online_24h_materials',before:onlineBefore,materials:online.materials,expectedAdditionalEach:24*60});
            const offline=unlocked(10);const offlineBefore=clone(offline.materials);game.labSettle(offline,at);game.labSettle(offline,at+24*hour);
            const once=clone(offline.materials);const twice=game.labSettle(offline,at+24*hour);
            records.push({name:'offline_baseline_no_duplicate',before:offlineBefore,once,twice,materials:offline.materials,expectedAdditionalEach:3*60});
            // Focused structural fixture for the later laboratory lines. These prerequisite
            // ranks/levels are explicitly set; this fixture is not a progression timing run.
            const later=unlocked(6);
            later.buildings.tavern=3;later.buildings.resource=2;
            SYS.hero.grantXp(later.heroes[0],1000000,null);
            const trainee=later.heroes.find(h=>h.tier==='growth');
            const reg=game.labRegister(later,trainee.uid,'train',at);
            const laterControl=game.deserialize(game.serialize(later,at));
            const laterResearch=game.deserialize(game.serialize(later,at));
            const laterStart=game.labResearchStart(laterResearch,'res','seats',at);
            const a0=clone(laterControl.heroes.find(h=>h.uid===trainee.uid));
            const normalLater=game.labSettle(laterControl,at+24*hour);
            const splitLater=game.labSettle(laterResearch,at+24*hour);
            records.push({name:'isolated_later_lines_cap_fixture',setupNote:'Explicit fixture sets tavern rank3/resource rank2 and grants leader XP; not used for new-player timing claims',reg,start:laterStart,goldUnit:D.balance.gamble_gold_unit,baseGoldPerHour:D.balance.gamble_gold_per_hour,baselineGoldGained:normalLater.gold,researchGoldGained:splitLater.gold,traineeBefore:{level:a0.level,xp:a0.xp},traineeBaseline:clone(laterControl.heroes.find(h=>h.uid===trainee.uid)),traineeWithResearch:clone(laterResearch.heroes.find(h=>h.uid===trainee.uid))});
            const active=fresh(4),dep=game.departRun(active,D.stageOrder[0],at);
            const before=clone({gold:active.resources.gold,materials:active.materials,potions:active.potions,levels:active.heroes.map(h=>h.level)});
            game.stepRun(active,dep.run,.05);
            const saved=game.serialize(active,at+50),restored=game.deserialize(saved);
            const notice=game.closeRun(restored,at+24*hour);
            records.push({name:'close_active_no_offline_combat_reward',before,after:{gold:restored.resources.gold,materials:restored.materials,potions:restored.potions,levels:restored.heroes.map(h=>h.level)},notice,slot:restored.runs[0],canDepart:game.canDepart(restored,D.stageOrder[0],at+24*hour),nextRepeat:game.nextRepeat(restored,at+24*hour,1)});
            return {at,records};
        }''')
        result['pageErrors'] = errors
        result['sourceSha256'] = {path: hashlib.sha256(body).hexdigest() for path, body in SOURCE.items()}
        result['sourceChangedDuringRun'] = [path for path, body in SOURCE.items() if (ROOT / 'src' / path.lstrip('/')).read_bytes() != body]
        result_name = sys.argv[1] if len(sys.argv) > 1 else 'state_results.json'
        if Path(result_name).name != result_name:
            raise ValueError('Result argument must be a filename inside the audit directory')
        (OUT / result_name).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
        print(json.dumps({k: v for k, v in result.items() if k != 'sourceSha256'}, ensure_ascii=True, indent=2))
        browser.close()
finally:
    server.shutdown()
    server.server_close()
