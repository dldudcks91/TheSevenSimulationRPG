"""Run deterministic online QA in an isolated Edge context and random local port.
No repository source writes, no persistent profile, no use of player save/server.
python output/2026-10-30_new_player_qa/harness/run_simulation.py [seed_count]
"""
import hashlib
import http.server
import json
import sys
import threading
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
OUT=HERE.parent/'simulation'
OUT.mkdir(exist_ok=True)
SHORT=len(sys.argv)>2 and sys.argv[2]=='short'
FARM=len(sys.argv)>2 and sys.argv[2]=='farm'
if SHORT:
    OUT=OUT/'short'
    OUT.mkdir(exist_ok=True)
if FARM:
    OUT=OUT/'farming'
    OUT.mkdir(exist_ok=True)
if any(OUT.glob('*_seed*.json')):
    OUT=OUT/('rerun_'+time.strftime('%Y%m%d_%H%M%S'))
    OUT.mkdir(exist_ok=False)
def manifest():
    return {str(p.relative_to(ROOT)).replace('\\','/'):{'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'mtime_ns':p.stat().st_mtime_ns} for p in sorted((ROOT/'src').rglob('*')) if p.is_file() and p.suffix in ('.js','.csv')}
before=manifest()
frozen={str(p.relative_to(ROOT/'src')).replace('\\','/'):p.read_bytes() for p in (ROOT/'src').rglob('*') if p.is_file() and p.suffix in ('.js','.csv')}
(OUT/'served_source_hashes.json').write_text(json.dumps({k:hashlib.sha256(v).hexdigest() for k,v in frozen.items()},indent=2),encoding='utf-8')
(OUT/'source_before.json').write_text(json.dumps(before,indent=2),encoding='utf-8')
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT/'src'),**kw)
    def do_GET(self):
        key=self.path.split('?',1)[0].lstrip('/')
        if key in frozen:
            content=frozen[key]
            self.send_response(200);self.send_header('Content-Type','text/javascript' if key.endswith('.js') else 'text/csv');self.send_header('Content-Length',str(len(content)));self.end_headers();self.wfile.write(content)
        elif self.path=='/qa.html':
            content=b'<!doctype html><title>QA</title><script type="module" src="/qa.js"></script>'
            self.send_response(200);self.send_header('Content-Type','text/html');self.send_header('Content-Length',str(len(content)));self.end_headers();self.wfile.write(content)
        elif self.path=='/qa.js':
            content=(HERE/'simulation.js').read_bytes()
            if SHORT:content=content.replace(b'[600,3600,86400]',b'[600,3600]')
            self.send_response(200);self.send_header('Content-Type','text/javascript');self.send_header('Content-Length',str(len(content)));self.end_headers();self.wfile.write(content)
        else:super().do_GET()
    def log_message(self,*a):pass
class Server(http.server.ThreadingHTTPServer):
    request_queue_size=256
server=Server(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
t0=time.monotonic()
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    context=browser.new_context()
    page=context.new_page()
    page.on('pageerror',lambda e:(errors.append(str(e)),print('PAGEERROR',str(e),flush=True)))
    page.on('console',lambda msg:print('CONSOLE',msg.type,msg.text,flush=True) if not msg.text.startswith('MARK') else None)
    page.on('requestfailed',lambda r:print('REQUESTFAILED',r.url,r.failure,flush=True))
    def store_checkpoint(payload):
        stem=f"{payload['policy']}_seed{payload['seed']}_{payload['mark']}"
        (OUT/f'checkpoint_{stem}.json').write_text(json.dumps(payload['snapshot'],ensure_ascii=False,indent=2),encoding='utf-8')
        if payload['state'] is not None:(OUT/f"state_{payload['policy']}_{payload['mark']}.json").write_text(json.dumps(payload['state'],ensure_ascii=False),encoding='utf-8')
        print('CHECKPOINT',stem,flush=True)
    page.expose_function('storeCheckpoint',store_checkpoint)
    page.goto(f'http://127.0.0.1:{server.server_port}/qa.html')
    page.wait_for_function('window.qaReady===true',timeout=60000)
    (OUT/'meta.json').write_text(json.dumps(page.evaluate('window.qaMeta'),indent=2),encoding='utf-8')
    for policy in (('farming',) if FARM else ('managed','passive')):
        for seed in range(1,int(sys.argv[1] if len(sys.argv)>1 else 5)+1):
            dest=OUT/f'{policy}_seed{seed}.json'
            if dest.exists():
                print(f'skip {policy} {seed}',flush=True);continue
            result=page.evaluate('async args => await window.runQA(...args)',[seed,policy,seed==1])
            dest.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
            if seed==1:
                for key,state in page.evaluate('window.savedStates').items():
                    (OUT/f'state_{key}.json').write_text(json.dumps(state,ensure_ascii=False),encoding='utf-8')
            print(json.dumps({'policy':policy,'seed':seed,'seconds':result['wallSeconds'],'marks':[{k:c[k] for k in ('seconds','stage','levels','gold','bags','overflow','runs','wins','losses')} for c in result['checkpoints']]},ensure_ascii=True),flush=True)
    browser.close()
server.shutdown()
after=manifest()
(OUT/'source_after.json').write_text(json.dumps(after,indent=2),encoding='utf-8')
changed=[k for k in set(before)|set(after) if before.get(k,{}).get('sha256')!=after.get(k,{}).get('sha256')]
(OUT/'run_info.json').write_text(json.dumps({'wall_seconds':time.monotonic()-t0,'errors':errors,'source_changed':changed},indent=2),encoding='utf-8')
print('finished',time.monotonic()-t0,'source_changed',changed,'errors',errors,flush=True)
