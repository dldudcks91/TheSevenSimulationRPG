"""50 frozen-source accounts: 20 paired default/adaptive builds, 10 passive.
Async isolated Edge pages; no player profile/save, no Firebase or port 8777.
Usage: python output/2026-10-30_fun_qa/harness/run_fun.py [paired=20] [passive=10] [workers=3]
Set FUN_QA_SHORT=1 for a 10/60 minute pilot. Existing complete data is skipped.
"""
import asyncio
import hashlib
import http.server
import json
import os
import threading
import time
from pathlib import Path
from playwright.async_api import async_playwright

HERE=Path(__file__).resolve().parent
BASE=HERE.parent
ROOT=BASE.parents[1]
SNAP=BASE/'snapshot/src'
OUT=BASE/'simulation'
OUT.mkdir(exist_ok=True)
SHORT=os.environ.get('FUN_QA_SHORT')=='1'
LOOT=os.environ.get('FUN_QA_LOOT')=='1'
if SHORT:
    OUT=OUT/'pilot'
    OUT.mkdir(exist_ok=True)
if LOOT:
    OUT=OUT/'loot_observer'
    OUT.mkdir(exist_ok=True)
TAG=os.environ.get('FUN_QA_TAG')
if TAG:
    if not TAG.replace('_','').isalnum():raise ValueError('FUN_QA_TAG must contain letters, digits and underscores')
    OUT=OUT/TAG
    OUT.mkdir(exist_ok=True)
JS=(HERE/'fun_simulation.js').read_bytes()
SPEED=int(os.environ.get('FUN_QA_SPEED','1'))
if SPEED not in (1,2):raise ValueError('Supported QA speed is 1 or 2')
if SPEED!=1:JS=JS.replace(b'CFG=paceOf(1)',f'CFG=paceOf({SPEED})'.encode())
if LOOT:
    JS=JS.replace(b'CURRENT=c;',b'CURRENT=c;c.itemDrops=[];')
    JS=JS.replace(b'const it=s.drops[i],uid=ids[i];',b"const it=s.drops[i],uid=ids[i];c.itemDrops.push({t:r3(t),source:'drop',uid,item:clone(it)});")
    JS=JS.replace(b'for(const i of added)c.origins[i.uid]=',b"for(const i of added)c.itemDrops.push({t:r3(t),source:'box',uid:i.uid,item:clone(i)});for(const i of added)c.origins[i.uid]=")
    JS=JS.replace(b'checkpoints,first:c.first,count,',b'checkpoints,dropSamples:c.itemDrops,first:c.first,count,')
JS_HASH=hashlib.sha256(JS).hexdigest()
MANIFEST=json.loads((BASE/'source_manifest.json').read_text(encoding='utf-8'))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(SNAP),**kw)
    def do_GET(self):
        key=self.path.split('?',1)[0]
        if key=='/qa.html':
            b=b'<!doctype html><title>Fun QA</title><script type="module" src="/qa.js"></script>'
            self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
        elif key=='/qa.js':
            self.send_response(200);self.send_header('Content-Type','text/javascript');self.send_header('Content-Length',str(len(JS)));self.end_headers();self.wfile.write(JS)
        elif key=='/favicon.ico':
            self.send_response(204);self.end_headers()
        elif key.startswith('/assets/') and not (SNAP/key.lstrip('/')).exists():
            path=ROOT/'src'/key.lstrip('/')
            if not path.is_file():self.send_error(404);return
            b=path.read_bytes();self.send_response(200);self.send_header('Content-Type',self.guess_type(str(path)));self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
        else:super().do_GET()
    def log_message(self,*a):pass
class Server(http.server.ThreadingHTTPServer):request_queue_size=256
server=Server(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()

def write(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')

async def main():
    import sys
    paired=int(sys.argv[1]) if len(sys.argv)>1 else 20
    passive=int(sys.argv[2]) if len(sys.argv)>2 else 10
    workers=int(sys.argv[3]) if len(sys.argv)>3 else 3
    jobs=[]
    for seed in range(1,paired+1):
        for policy in ('basic','adaptive'):jobs.append((seed,policy,False))
        if seed<=passive:jobs.append((seed,'passive',False))
    for seed in range(paired+1,passive+1):jobs.append((seed,'passive',False))
    jobs.append((2,'basic',True))
    if os.environ.get('FUN_QA_JOBS'):jobs=json.loads(os.environ['FUN_QA_JOBS'])
    queue=asyncio.Queue()
    for job in jobs:queue.put_nowait(job)
    errors=[];done=[];start=time.monotonic()
    write(OUT/'run_metadata.json',{'snapshot_capture':MANIFEST['captured_at_utc'],'source_manifest_sha256':hashlib.sha256((BASE/'source_manifest.json').read_bytes()).hexdigest(),'harness_sha256':JS_HASH,'paired':paired,'passive':passive,'workers':workers,'short':SHORT,'speed':SPEED,'marks':json.loads(os.environ.get('FUN_QA_MARKS','[600,3600]' if SHORT else '[600,3600,86400]')),'jobs':jobs})
    async with async_playwright() as p:
        browser=await p.chromium.launch(channel='msedge',headless=True,args=['--disable-background-timer-throttling'])
        async def worker(n):
            ctx=await browser.new_context()
            # Local source only; block accidental external app/analytics requests.
            await ctx.route('**/*',lambda route:route.continue_() if route.request.url.startswith(f'http://127.0.0.1:{server.server_port}/') else route.abort())
            page=await ctx.new_page()
            page.on('pageerror',lambda e:errors.append({'worker':n,'error':str(e)}))
            async def checkpoint(payload):
                label=f"{payload['policy']}_seed{payload['seed']}_{payload['mark']}"
                folder=OUT/('replicate' if getattr(page,'replicate',False) else 'checkpoints')
                folder.mkdir(exist_ok=True)
                write(folder/f'{label}.json',payload['snapshot'])
                if payload['state'] is not None:write(folder/f'state_{label}.json',payload['state'])
                print(json.dumps({'checkpoint':label,'worker':n,'stage':payload['snapshot']['stage'],'diff':payload['snapshot']['difficulty'],'lv':payload['snapshot']['levels'],'runs':payload['snapshot']['count']['runs'],'elapsed':round(time.monotonic()-start,1)},ensure_ascii=True),flush=True)
            await page.expose_function('storeCheckpoint',checkpoint)
            await page.goto(f'http://127.0.0.1:{server.server_port}/qa.html')
            await page.wait_for_function('window.qaReady===true',timeout=60000)
            if SHORT:await page.evaluate('window.QA_MARKS=[600,3600]')
            if os.environ.get('FUN_QA_MARKS'):await page.evaluate('(marks)=>window.QA_MARKS=marks',json.loads(os.environ['FUN_QA_MARKS']))
            write(OUT/f'meta_worker{n}.json',await page.evaluate('window.qaMeta'))
            while not queue.empty():
                seed,policy,replicate=await queue.get()
                dest=(OUT/'replicate' if replicate else OUT)
                dest.mkdir(exist_ok=True)
                file=dest/f'{policy}_seed{seed}.json'
                if file.exists():queue.task_done();continue
                page.replicate=replicate
                try:
                    result=await page.evaluate('args=>window.runFunQA(...args)',[seed,policy,seed<=5 or os.environ.get('FUN_QA_SAVE_ALL')=='1',{}])
                    write(file,result)
                    done.append({'seed':seed,'policy':policy,'replicate':replicate,'seconds':result['wallSeconds'],'failures':len(result['failures'])})
                    print(json.dumps({'done':done[-1],'wall':round(time.monotonic()-start,1)},ensure_ascii=True),flush=True)
                except Exception as e:
                    errors.append({'seed':seed,'policy':policy,'replicate':replicate,'error':str(e)})
                    print('JOBERROR',json.dumps(errors[-1]),flush=True)
                queue.task_done()
            await ctx.close()
        await asyncio.gather(*(worker(i) for i in range(workers)))
        await browser.close()
    current={str(p.relative_to(SNAP)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in SNAP.rglob('*') if p.is_file()}
    changed=[k for k,v in MANIFEST['files'].items() if current.get(k)!=v['sha256']]
    original=OUT/'basic_seed2.json';replica=OUT/'replicate/basic_seed2.json'
    deterministic=None
    if original.exists() and replica.exists():
        a=json.loads(original.read_text(encoding='utf-8'));b=json.loads(replica.read_text(encoding='utf-8'));a.pop('wallSeconds',None);b.pop('wallSeconds',None);deterministic=a==b
    info={'wall_seconds':time.monotonic()-start,'completed':done,'errors':errors,'frozen_source_changed':changed,'seed2_repeat_identical_except_runtime':deterministic}
    write(OUT/'run_info.json',info)
    print('FINISHED',json.dumps(info,ensure_ascii=True),flush=True)
asyncio.run(main())
server.shutdown()
