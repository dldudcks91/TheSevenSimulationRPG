import json
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
STUB = '''
const user={uid:'test-google',email:'test@example.com'};
export function warm(){}
export async function restoreUser(){return sessionStorage.failRestore ? {ok:false,err:'network'} : {ok:true,user:sessionStorage.auth ? user : null};}
export async function signIn(){if(window.cancelLogin)return {ok:false,err:'signIn'};sessionStorage.auth='1';return {ok:true,user};}
export async function pullSave(){return window.failPull ? {ok:false,err:'network'} : {ok:true,remote:null};}
export async function pushSave(){return {ok:true,rev:1};}
export async function signOut(){sessionStorage.removeItem('auth');return {ok:true};}
export async function watchUser(cb){window.loseAuth=()=>{sessionStorage.removeItem('auth');cb(null);};return ()=>{};}
'''
server=subprocess.Popen(['python',str(ROOT/'serve.py'),'8879'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
rows=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',headless=True)
        context=browser.new_context()
        context.route('**/ui/cloud.js',lambda r:r.fulfill(content_type='text/javascript',body=STUB))
        context.route('**/ui/app.js',lambda r:r.fulfill(content_type='text/javascript',body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+'\nwindow.authTest={getG:()=>G,startGame,continueGame,cloudSignOut};'))
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        def check(name, condition):
            rows.append({'name':name,'ok':bool(condition)})
            assert condition,name
        def gate():
            page.wait_for_selector('.login-required:enabled')
        page.goto('http://127.0.0.1:8879/index.html?dev=newgame&tab=character')
        gate()
        page.screenshot(path=str(OUT/'login_gate.png'))
        page.goto('http://127.0.0.1:8879/index.html?dev=newgame&lang=en')
        gate()
        page.screenshot(path=str(OUT/'login_gate_en.png'))
        check('english login layout fits',page.evaluate("""()=>{const p=document.querySelector('.login-page').getBoundingClientRect(),c=document.querySelector('.login-card').getBoundingClientRect();return c.left>=p.left&&c.right<=p.right&&c.top>=p.top&&c.bottom<=p.bottom;}"""))
        page.goto('http://127.0.0.1:8879/index.html?dev=newgame&lang=ko')
        gate()
        check('guest dev route blocked',page.evaluate('authTest.getG()===null && !localStorage.getItem("thesevensim.save")'))
        check('direct start and continue blocked',page.evaluate('()=>{authTest.startGame();return !authTest.continueGame() && authTest.getG()===null;}'))
        page.evaluate('window.cancelLogin=true')
        page.click('.login-required')
        gate()
        check('cancel stays gated',page.evaluate('authTest.getG()===null'))
        page.evaluate('window.cancelLogin=false;window.failPull=true')
        page.click('.login-required')
        gate()
        check('cloud failure stays gated',page.evaluate('authTest.getG()===null'))
        page.evaluate('window.failPull=false')
        page.click('.login-required')
        page.wait_for_function('window.authTest.getG()!==null')
        check('successful login unlocks game',page.locator('.login-required').count()==0)
        page.goto('http://127.0.0.1:8879/index.html')
        page.wait_for_function('window.authTest?.getG()!==null && window.authTest!==undefined')
        check('existing session restored',page.locator('.login-required').count()==0)
        page.evaluate('authTest.cloudSignOut()')
        gate()
        check('signout blocks saved game',page.evaluate('authTest.getG()===null && !!localStorage.getItem("thesevensim.save")'))
        page.click('.login-required')
        page.wait_for_function('window.authTest.getG()!==null')
        page.evaluate('window.loseAuth()')
        gate()
        check('external signout blocks game',page.evaluate('authTest.getG()===null'))
        page.evaluate('sessionStorage.failRestore="1"')
        page.reload()
        gate()
        check('restore network failure blocks local save',page.evaluate('authTest.getG()===null'))
        page.screenshot(path=str(OUT/'login_error.png'))
        check('no browser exceptions',not errors)
        browser.close()
finally:
    server.terminate()
    server.wait(timeout=10)
    (OUT/'login_results.json').write_text(json.dumps({'checks':rows},indent=2),encoding='utf-8')
print(json.dumps(rows))
