"""Compare observed paced first-run reports with untouched engine resolveBattle."""
import http.server
import json
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright
HERE=Path(__file__).resolve().parent
BASE=HERE.parent
OUT=BASE/'simulation'
script=(HERE/'fun_simulation.js').read_text(encoding='utf-8')+'''
window.compareOriginalEngine = async seed => {
    window.QA_MARKS=[600];
    await window.runFunQA(seed,'passive',false);
    const observed=clone(CURRENT.G.reports.find(r=>r.at===START));
    const observedFactory=SYS.battle.createRun;
    SYS.battle.createRun=originalCreateRun;
    const directG=Q.newGame(seed,SYS.hero.rollStartParty(makeRng(1000+seed),D.balance.party_size_max),START);
    const direct=clone(Q.resolveBattle(directG,D.stageOrder[0],START).report);
    SYS.battle.createRun=observedFactory;
    return {seed,identical:JSON.stringify(observed)===JSON.stringify(direct),observed,direct};
};
'''
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(BASE/'snapshot/src'),**kw)
    def log_message(self,*a):pass
    def do_GET(self):
        if self.path in ('/qa.html','/qa.js'):
            data=(b'<!doctype html><script type="module" src="/qa.js"></script>' if self.path=='/qa.html' else script.encode())
            self.send_response(200);self.send_header('Content-Type','text/html' if self.path=='/qa.html' else 'text/javascript');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
        elif self.path=='/favicon.ico':self.send_response(204);self.end_headers()
        else:super().do_GET()
class Server(http.server.ThreadingHTTPServer):request_queue_size=256
server=Server(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
results=[];errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}/qa.html')
    page.wait_for_function('window.qaReady',timeout=60000)
    for seed in range(1,11):results.append(page.evaluate('seed=>window.compareOriginalEngine(seed)',seed))
    browser.close()
server.shutdown()
(OUT/'engine_observation_parity.json').write_text(json.dumps({'seeds':len(results),'all_identical':all(x['identical']for x in results),'errors':errors,'results':results},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'seeds':len(results),'all_identical':all(x['identical']for x in results),'errors':errors}))
