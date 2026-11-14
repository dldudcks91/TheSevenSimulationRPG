import json
import socket
import subprocess
import sys
import time
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).parent
PORT = 8867
HARNESS = r'''
window.__costReady = () => G?.heroes?.length > 0;
window.__costReview = () => {
    G.buildings.forge = 1; G.buildings.shop = 2;
    G.resources.gold = 1000000;
    G.materials = {...G.materials, iron_ore:6, timber:6, dust:6, herb:2};
    const read = html => { const n=document.createElement('div'); n.innerHTML=html; return n; };
    const enough=read(matTile({res:'iron_ore',need:3,have:6}));
    const short=read(matTile({res:'iron_ore',need:3,have:2}));
    const make=document.createElement('div');
    state.makePart=D.slots[0].id; state.makeLevel=1; forgeMake(make);
    const ms=SYS.game.makeState(G,state.makePart,1);
    const makeRows=[...make.querySelectorAll('.fg-kinds .fg-kmat')].slice(0,ms.cost.length);
    const it=Object.values(G.items).find(it=>SYS.game.upgradeState(G,it.uid)?.temper);
    if(!it) throw new Error('No upgradeable starter equipment');
    const us=SYS.game.upgradeState(G,it.uid);
    state.temperTier=1;
    const temper=forgeTemper(it,us), stake=us.temper.stakes[0];
    const upgrade=document.createElement('div'); state.forgeItem=it.uid; forgeUpgrade(upgrade);
    const expectedUpgrade=[String(us.cost),...us.mats.map(m=>`${m.need}/${m.have}`)];
    state.tab='shop'; state.shopTrade='iron_ore'; render();
    const trade=document.querySelector('[data-trade-pay="timber"] .td-price');
    const poor=document.querySelector('[data-trade-pay="herb"]');
    return {
        shared:enough.querySelector('b').textContent,
        sharedShort:short.querySelector('b').textContent,
        sharedColor:!enough.querySelector('.no') && !!short.querySelector('.no'),
        make:makeRows.map(n=>n.querySelector('b').textContent),
        expectedMake:ms.cost.map(c=>`${c.need}/${c.have}`),
        makeTitles:makeRows.map(n=>n.title),
        temper:temper.querySelector('.fg-tp-mat b').textContent,
        expectedTemper:`${stake.need}/${stake.have}`,
        upgrade:[...upgrade.querySelectorAll('.cn-mat-n')].map(n=>n.textContent),
        expectedUpgrade,
        trade:trade.textContent, tradeTitle:trade.title,
        shortTrade:poor.querySelector('.td-price').textContent,
        shortDisabled:poor.querySelector('button').disabled
    };
};
'''

with socket.socket() as s:
    s.bind(('127.0.0.1', PORT))
with (OUT/'server.log').open('w', encoding='utf-8') as log:
    server = subprocess.Popen([sys.executable, str(ROOT/'serve.py'), str(PORT)], cwd=ROOT,
                              stdout=log, stderr=log, creationflags=subprocess.CREATE_NO_WINDOW)
    try:
        for _ in range(30):
            try:
                urlopen(f'http://127.0.0.1:{PORT}/index.html', timeout=1).close()
                break
            except OSError:
                time.sleep(.1)
        results, errors = [], []
        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='msedge', headless=True)
            for lang in ['ko', 'en']:
                context = browser.new_context(viewport={'width':1600, 'height':900})
                context.route('https://**', lambda route: route.abort())
                context.route('**/ui/app.js', lambda route: route.fulfill(status=200, content_type='text/javascript', body=(ROOT/'src/ui/app.js').read_text(encoding='utf-8')+HARNESS))
                page = context.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(f'http://127.0.0.1:{PORT}/index.html?dev=newgame&lang={lang}&skin=d2min', wait_until='networkidle')
                page.wait_for_function('globalThis.__costReady?.()')
                result = page.evaluate('__costReview()')
                assert result['shared'] == '3/6', result
                assert result['sharedShort'] == '3/2' and result['sharedColor'], result
                assert result['make'] and result['make'] == result['expectedMake'], result
                assert all(text.replace('/', ' / ') in title for text, title in zip(result['make'], result['makeTitles'])), result
                assert result['temper'] == result['expectedTemper'], result
                assert result['upgrade'] == result['expectedUpgrade'], result
                assert result['trade'] == '3 / 6', result
                assert result['shortTrade'] == '3 / 2' and result['shortDisabled'], result
                assert result['tradeTitle'] == ('필요 3 · 보유 6' if lang == 'ko' else 'Cost 3 · Owned 6'), result
                results.append({'language':lang, **result})
                context.close()
            browser.close()
        assert not errors, errors
        (OUT/'verification.json').write_text(json.dumps({'results':results, 'errors':errors}, ensure_ascii=False, indent=2), encoding='utf-8')
        print('PASS: required/owned order across shared costs, smithing, upgrade, temper and trade in Korean and English; shortage colors and disabled purchases preserved.')
    finally:
        server.terminate()
        server.wait(timeout=10)
