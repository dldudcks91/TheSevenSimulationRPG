"""Browser observation helpers. Product input comes only from the frozen baseline."""
import functools,hashlib,http.server,json,mimetypes,threading
from pathlib import Path
from urllib.parse import unquote,urlparse
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
RUN=OUT.parent
ROOT=RUN.parents[1]
SNAPSHOT=RUN/'snapshot/src'
SOURCE={'/'+p.relative_to(SNAPSHOT).as_posix():p.read_bytes() for p in SNAPSHOT.rglob('*') if p.is_file()}
ACCESSOR='''
window.__fun={get G(){return G},get SYS(){return SYS},D,state,render,runBattle,expTick,save,dropBattles,
 snapshot(){return SYS.game.serialize(G,Date.now())},
 read(){return G?{at:Date.now(),screen:state.screen,tab:state.tab,exp:state.exp,levels:G.heroes.map(h=>({uid:h.uid,level:h.level,xp:h.xp,points:h.masteryPoints,cls:h.cls,sin:h.sin,book:h.bookSkill,advance:h.advance})),gold:G.resources.gold,materials:G.materials,potions:G.potions,inventory:G.bags.map(b=>b.length),items:Object.keys(G.items).length,cleared:G.progress.cleared,buildings:G.buildings,report:G.reports[0]??null,guide:SYS.game.notificationState(G,Date.now()),clock:G.expMs}:null},
 restore(s){dropBattles();G=SYS.game.deserialize(s);state.screen='game';state.tab='expedition';state.exp='idle';state.modal=null;state.repSel=null;state.heroUid=G.heroes[0]?.uid;render();},
 hideTips(){hideTip();}
};
'''
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
class Server(http.server.ThreadingHTTPServer):
    request_queue_size=128
    def handle_error(self,*args):pass

def write(name,data):
    (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')

class Session:
    def __init__(self):
        self.server=Server(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT/'src')))
        threading.Thread(target=self.server.serve_forever,daemon=True).start()
        self.base=f'http://127.0.0.1:{self.server.server_port}'
        self.pw=sync_playwright().start()
        self.browser=self.pw.chromium.launch(channel='msedge',headless=True)
        self.errors=[];self.http_errors=[];self.external=[]
    def context(self,fixed_at=None,width=1600,height=900):
        c=self.browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1)
        c.set_default_timeout(20000)
        def route_file(route):
            parsed=urlparse(route.request.url);path=unquote(parsed.path)
            if parsed.hostname not in ['127.0.0.1','localhost']:
                self.external.append(route.request.url);return route.abort()
            if path=='/ui/cloud.js':return route.fulfill(content_type='text/javascript',body='export async function pushTrack(){return {ok:true};}')
            if path in SOURCE:
                body=SOURCE[path]
                if path=='/ui/app.js':body=body.decode('utf-8')+ACCESSOR
                return route.fulfill(content_type=mimetypes.guess_type(path)[0] or 'application/octet-stream',body=body)
            if path.startswith('/assets/') or path=='/favicon.ico':return route.continue_()
            return route.fulfill(status=404,body='not in frozen source '+path)
        c.route('**/*',route_file)
        if fixed_at is not None:c.add_init_script('window.__funNow='+str(fixed_at)+';Date.now=()=>window.__funNow;')
        page=c.new_page()
        page.on('pageerror',lambda e:self.errors.append(str(e)))
        page.on('response',lambda r:self.http_errors.append({'url':r.url,'status':r.status}) if r.status>=400 and '/favicon.ico' not in r.url else None)
        return c,page
    def close(self):
        self.browser.close();self.pw.stop();self.server.shutdown();self.server.server_close()

def take(page,label):
    page.screenshot(path=str(OUT/f'{label}.png'))
    return {'label':label,'screen_text':page.locator('body').inner_text(),'game':page.evaluate('__fun.read()'),'buttons':page.locator('button:visible').evaluate_all('nodes=>nodes.map(n=>({text:n.innerText,disabled:n.disabled,className:n.className}))')}

def boot(page,base):
    page.goto(base+'/index.html',wait_until='domcontentloaded')
    page.wait_for_selector('.mn-btn')
    page.wait_for_function('window.__fun && __fun.SYS')

if __name__=='__main__':
    print('Import this module from a specific observation runner.')
