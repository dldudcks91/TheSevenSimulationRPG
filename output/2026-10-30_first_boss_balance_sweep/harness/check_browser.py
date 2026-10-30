"""Compare native Node results with isolated real Edge on identical inputs."""
import argparse
import asyncio
import hashlib
import http.server
import json
import threading
import time
from pathlib import Path
from playwright.async_api import async_playwright

BASE = Path(__file__).resolve().parent.parent
SNAP = BASE / 'snapshot/src'
JOBS = json.loads((BASE / 'pilot/jobs.json').read_text(encoding='utf-8'))
ENTRY = (BASE / 'harness/generated_entry.mjs').read_text(encoding='utf-8').replace("from '../snapshot/src/", "from '/").encode()
BATTLE = (SNAP / 'game_logic/battle.js').read_text(encoding='utf-8')
for old, new in [('* B.monster_hp_scale * hpMultOf(difficulty)', '* B.monster_hp_scale * hpMultOf(difficulty) * qaFactor(m, grade, difficulty, "hp")'),
                 ('const dmgScale = B.monster_atk_scale * dmgMultOf(difficulty);', 'const dmgScale = B.monster_atk_scale * dmgMultOf(difficulty) * qaFactor(m, grade, difficulty, "attack");'),
                 ('expReward: MONSTER_XP.get(lvl) * g.exp_mult * m.exp_coef,', 'expReward: MONSTER_XP.get(lvl) * g.exp_mult * m.exp_coef * qaFactor(m, grade, difficulty, "xp"),')]:
    assert BATTLE.count(old) == 1
    BATTLE = BATTLE.replace(old, new)
BATTLE += '''
function qaFactor(m,grade,difficulty,kind){
 const d=typeof difficulty==='string'?difficulty:difficulty?.id??'normal',v=globalThis.__qaVariant;
 if(!v||m.chapter!==1||d!=='normal'||(globalThis.__qaStage&&Math.floor(globalThis.__qaStage/1000)!==1))return 1;
 if(kind==='xp')return v.xp??1;
 if(grade==='chapter_boss')return kind==='hp'?v.bossHp??1:v.bossAttack??1;
 return kind==='hp'?v.enemyHp??1:v.enemyAttack??1;
}
'''
HERO=None


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SNAP), **kwargs)

    def log_message(self, *_args):
        pass

    def do_GET(self):
        key = self.path.split('?', 1)[0]
        if key == '/qa.html':
            body, mime = b'<script type="module" src="/entry.js"></script>', 'text/html'
        elif key == '/entry.js':
            body, mime = ENTRY, 'text/javascript'
        elif key == '/game_logic/battle.js':
            body, mime = BATTLE.encode(), 'text/javascript'
        elif key == '/game_logic/hero.js'and HERO is not None:
            body,mime=HERO,'text/javascript'
        elif key == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
            return
        else:
            return super().do_GET()
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 256


async def main(server):
    start = time.monotonic()
    errors, results = [], []
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='msedge', headless=True)

        async def run(job):
            context = await browser.new_context()
            base = f'http://127.0.0.1:{server.server_port}'
            await context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base) else route.abort())
            page = await context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            await page.goto(base + '/qa.html')
            await page.wait_for_function('window.qaReady===true', timeout=60000)
            await page.evaluate('(job)=>{window.QA_LIGHT=true;window.QA_HORIZON=job.horizon;window.resetExperiment(job.variant)}', job)
            rows = []
            for seed in job['seeds']:
                rows.append(await page.evaluate('seed=>window.runActiveQA(seed,"active",false)', seed))
            results.append({'id': job['id'], 'rows': rows})
            await context.close()

        await asyncio.gather(*(run(job) for job in JOBS))
        await browser.close()
    native = {r['id']: r for path in (BASE/'native_pilot').glob('results_*.jsonl') for r in [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines()]}
    comparisons = [{'id': r['id'], 'identical_rows': r['rows'] == native.get(r['id'], {}).get('rows'),
                    'mismatched_seeds': [x['seed'] for x, y in zip(r['rows'], native.get(r['id'], {}).get('rows', [])) if x != y]}
                   for r in results]
    result = {'wall_seconds': time.monotonic()-start, 'errors': errors, 'comparisons': comparisons, 'results': results}
    (BASE/'browser_parity.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in result.items() if k != 'results'}))
    if errors or not all(c['identical_rows'] for c in comparisons):
        raise SystemExit(1)


async def sweep(server,args):
    folder=BASE/args.phase
    folder.mkdir(exist_ok=True)
    jobs=json.loads(Path(args.jobs).read_text(encoding='utf-8'))
    (folder/'jobs.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2),encoding='utf-8')
    existing={}
    for file in folder.glob('results_*.jsonl'):
        for line in file.read_text(encoding='utf-8').splitlines():
            result=json.loads(line);existing[result['id']]=result
    queue=asyncio.Queue()
    for job in jobs:
        if job['id']not in existing:queue.put_nowait(job)
    errors=[];done=len(existing);start=time.monotonic();last=start
    metadata={'jobs':len(jobs),'accounts':sum(len(j['seeds'])for j in jobs),'workers':args.workers,
              'backend':'isolated Edge','entry_sha256':hashlib.sha256(ENTRY).hexdigest(),
              'battle_overlay_sha256':hashlib.sha256(BATTLE.encode()).hexdigest()}
    if HERO is not None:metadata['hero_overlay_sha256']=hashlib.sha256(HERO).hexdigest()
    (folder/'metadata.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
    async with async_playwright()as p:
        browser=await p.chromium.launch(channel='msedge',headless=True,args=['--disable-background-timer-throttling'])
        async def worker(index):
            nonlocal done,last
            context=await browser.new_context();base=f'http://127.0.0.1:{server.server_port}'
            await context.route('**/*',lambda route:route.continue_()if route.request.url.startswith(base)else route.abort())
            page=await context.new_page();page.on('pageerror',lambda error:errors.append({'worker':index,'error':str(error)}))
            await page.goto(base+'/qa.html');await page.wait_for_function('window.qaReady===true',timeout=90000)
            while not queue.empty():
                job=await queue.get()
                try:
                    result=await page.evaluate('''async job=>{
                        window.QA_LIGHT=true;window.QA_HORIZON=job.horizon??3600;window.QA_SKIP_OBSERVATION=!!job.unobserved;window.resetExperiment(job.variant);
                        const began=performance.now(),rows=[];
                        const scope=job.scope&&window.scopeEvidence?window.scopeEvidence():null;
                        for(const seed of job.seeds){
                            try{rows.push(await window.runActiveQA(seed,job.policy??'active',false));}
                            catch(error){rows.push({seed,error:String(error),stack:error.stack});}
                        }
                        return{id:job.id,variant:job.variant,policy:job.policy??'active',seeds:job.seeds,horizon:job.horizon??3600,rows,scope,wallSeconds:(performance.now()-began)/1000};
                    }''',job)
                    with(folder/f'results_{index}.jsonl').open('a',encoding='utf-8')as stream:stream.write(json.dumps(result,ensure_ascii=False)+'\n')
                    errors.extend({'id':job['id'],**x}for x in result['rows']if x.get('error')or x.get('failures'))
                    done+=1
                    if time.monotonic()-last>=20:
                        last=time.monotonic();print(json.dumps({'phase':args.phase,'completed':done,'total':len(jobs),'elapsed_seconds':round(last-start,1)}),flush=True)
                except Exception as error:
                    errors.append({'id':job['id'],'error':str(error)})
                queue.task_done()
            await context.close()
        await asyncio.gather(*(worker(i)for i in range(args.workers)))
        await browser.close()
    info={'completed':done,'total':len(jobs),'errors':errors,'wall_seconds':time.monotonic()-start}
    (folder/'run_info.json').write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(info,ensure_ascii=True),flush=True)
    if errors or done!=len(jobs):raise SystemExit(1)


if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--jobs');parser.add_argument('--phase',default='grid');parser.add_argument('--workers',type=int,default=6);parser.add_argument('--entry');parser.add_argument('--hero-overlay',action='store_true');args=parser.parse_args()
    if args.entry:
        ENTRY=Path(args.entry).read_text(encoding='utf-8').replace("from '../snapshot/src/", "from '/").encode()
    if args.hero_overlay:
        hero=(SNAP/'game_logic/hero.js').read_text(encoding='utf-8')
        assert hero.count('tier: tiers?.[i], starter')==1
        hero=hero.replace('tier: tiers?.[i], starter','tier: starter ? qaStartTier(classes,tiers,i) : tiers?.[i], starter')
        hero+='''
function qaStartTier(classes,tiers,i){
 const v=globalThis.__qaVariant??{},list=v.startFloor?tiers.map(x=>x==='normal'?'magic':x):tiers;
 if(!v.rareDps||v.rareDps==='off')return list?.[i];
 const order=v.rareDps==='archer'?['archer','mage','warrior','knight','priest']:['mage','archer','warrior','knight','priest'];
 const positions=classes.map((_,k)=>k).sort((a,b)=>order.indexOf(classes[a])-order.indexOf(classes[b]));
 return list[positions.indexOf(i)];
}
'''
        HERO=hero.encode()
    server = Server(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        asyncio.run(sweep(server,args)if args.jobs else main(server))
    finally:
        server.shutdown()
        server.server_close()
