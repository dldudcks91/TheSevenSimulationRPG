import json, hashlib, time
from urllib.parse import urlsplit, unquote
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
APP = (ROOT / 'src/ui/app.js').read_text(encoding='utf-8')
SNAPSHOT = {}
for folder,pattern in [('ui','*.js'),('game_logic','*.js'),('data','*.csv')]:
    for path in (ROOT/'src'/folder).glob(pattern):
        SNAPSHOT[path.relative_to(ROOT/'src').as_posix()] = path.read_bytes()
SOURCE_HASHES = {key:hashlib.sha256(value).hexdigest() for key,value in SNAPSHOT.items()}
SOURCE_SET_HASH = hashlib.sha256(json.dumps(SOURCE_HASHES,sort_keys=True).encode()).hexdigest()
SOURCE_DIR=OUT/'source_snapshots'/SOURCE_SET_HASH
SOURCE_DIR.mkdir(parents=True,exist_ok=True)
for key,data in SNAPSHOT.items():
    dest=SOURCE_DIR/key;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
(SOURCE_DIR/'manifest.json').write_text(json.dumps({'sha256':SOURCE_HASHES},indent=2),encoding='utf-8')
HARNESS = '''
window.__uiAudit = {
    game: () => G, sys: () => SYS, data: () => D, state: () => state,
    setGame: g => { G = g; }, render: () => render(), save: () => save(),
    startGame: () => startGame(), continueGame: s => continueGame(s),
    notifications: () => notifications, freeze: () => freeze(),
    tick: () => expTick(), closeModal: () => closeModal(),
    switchTab: name => { state.tab = name; state.modal = null; render(); },
};
'''

def setup(context):
    def source_route(route):
        key=unquote(urlsplit(route.request.url).path).lstrip('/')
        data=SNAPSHOT.get(key)
        if data is None:
            route.continue_();return
        route.fulfill(status=200,content_type='text/javascript' if key.endswith('.js') else 'text/csv',body=data)
    context.route('**/*.js',source_route)
    context.route('**/*.csv',source_route)
    context.route('**/ui/app.js', lambda route: route.fulfill(status=200, content_type='text/javascript', body=APP+'\n'+HARNESS))
    context.route('https://**/*', lambda route: route.abort())

if __name__ == '__main__':
    modes = ['newgame','battle','play','form','tree','book','arena','colosseum','tactics','mats','mg','join','visit','explore','gamble','commission','tip','offline','frozen','box']
    result={'app_sha256':hashlib.sha256(APP.encode()).hexdigest(),'modes':[]}
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge', headless=True)
        for mode in modes:
            context=browser.new_context(viewport={'width':1440,'height':1000})
            setup(context)
            page=context.new_page()
            errors=[]
            page.on('pageerror',lambda e: errors.append(str(e)))
            start=time.time()
            page.goto(f'http://127.0.0.1:8921/index.html?dev={mode}')
            page.wait_for_function('window.__uiAudit && __uiAudit.data().balance !== null', timeout=60000)
            page.wait_for_timeout(1100)
            row={'mode':mode,'seconds':round(time.time()-start,2),'errors':errors,'main':page.locator('.main').inner_text()[:150]}
            result['modes'].append(row)
            print(json.dumps(row,ensure_ascii=True),flush=True)
            context.close()
        browser.close()
    (OUT/'smoke_ui.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
