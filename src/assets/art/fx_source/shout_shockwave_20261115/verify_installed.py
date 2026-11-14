"""Verify installed assets, actual battle FX playback, settings and the codex."""
import hashlib
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[4]
HARNESS = '''<!doctype html><meta charset="utf-8"><base href="/">
<link rel="stylesheet" href="/ui/style.css">
<style>body{height:auto;overflow:auto;padding:35px;background:#161820;color:#e7dfcf}
#grid{display:grid;grid-template-columns:repeat(3,340px);gap:60px 35px;padding:45px 35px}
.unit-slot{width:310px;min-height:155px;padding-top:20px}.unit{width:280px;height:112px;display:block}
.unit .sprite{width:90px;height:90px;position:absolute;left:7px;top:8px;background-size:cover}
.caption{position:absolute;left:105px;top:22px;font-size:16px}.pop-layer{position:absolute}</style>
<h1>게임 적용된 함성 이펙트</h1><div id="grid"></div>
<script type="module">
import * as F from '/ui/fx.js';
import {SKILL_ART, artFile} from '/ui/skill_art.js';
window.F=F;window.SKILL_ART=SKILL_ART;window.artFile=artFile;
window.makeUnit=(id)=>{
 const slot=document.createElement('div');slot.className='unit-slot';
 const node=document.createElement('div');node.className='unit enemy';
 node.innerHTML='<div class="sprite" style="background-image:url(/assets/art/faces/source/hero/warrior_samson.png)"></div><span class="caption"></span><div class="pop-layer"></div>';
 node.querySelector('.caption').textContent=id;slot.append(node);document.querySelector('#grid').append(slot);
 return {key:id,side:'enemy',node};
};
F.setFxOn('hit',false);F.setFxOn('lunge',false);F.setFxOn('skill',true);F.setFxTransparency(0);
window.ready=true;
</script>'''
CLOUD = '''const user={uid:'shout-local-review',email:'fx-review@example.com'};
export function warm(){};export async function restoreUser(){return {ok:true,user}};
export async function signIn(){return {ok:true,user}};export async function pullSave(){return {ok:true,remote:null}};
export async function pushSave(){return {ok:true,rev:1}};export async function signOut(){return {ok:true}};
export async function watchUser(){return ()=>{}};
'''


def main():
    specs = json.loads((BASE / 'manifest.json').read_text(encoding='utf-8'))['skills']
    report = {'page_errors': [], 'asset_errors': [], 'styles': []}
    for s in specs:
        installed = ROOT / 'src/assets/art/fx/skills' / s['game_file']
        assert hashlib.sha256(installed.read_bytes()).digest() == hashlib.sha256((BASE / s['output']).read_bytes()).digest()
        assert not (installed.parent / f"{s['id']}_{s['style']}.webp").exists()

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT / 'src'), **kwargs)

        def log_message(self, *args):
            pass

        def do_GET(self):
            path = urlparse(self.path).path
            body = HARNESS if path == '/dev/shout-installed.html' else CLOUD if path == '/ui/cloud.js' else None
            if body is None:
                return super().do_GET()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8' if path.endswith('.html') else 'text/javascript')
            self.end_headers()
            self.wfile.write(body.encode('utf-8'))

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel='chrome', headless=True)
            page = browser.new_page(viewport={'width': 1300, 'height': 900})
            page.on('pageerror', lambda e: report['page_errors'].append(str(e)))
            page.on('response', lambda r: report['asset_errors'].append(r.url) if '/assets/art/fx/skills/' in r.url and r.status >= 400 else None)
            page.goto(url + '/dev/shout-installed.html')
            page.wait_for_function('window.ready === true')
            for style in ['darktoon', 'foil']:
                entries = [s for s in specs if s['style'] == style]
                result = page.evaluate('''async ({style,entries})=>{
                    const F=window.F, defs=window.SKILL_ART;
                    F.setFxArtStyle(style);await F.fxPreload(style);
                    document.querySelector('#grid').replaceChildren();
                    const cards=[];
                    for(const entry of entries){
                        const u=makeUnit(entry.name),def=defs[entry.id][entry.event];
                        F.fxBuff({idx:1,speed:1,catchUp:false},u,{s:entry.id,until:1,v:entry.event==='bad'?-1:1});
                        const images=[...u.node.querySelectorAll('.fx-skill-stamp')];
                        if(images.length!==3)throw Error(entry.id+': expected three waves');
                        const delays=images.map(im=>parseFloat(getComputedStyle(im).animationDelay)*1000);
                        if(delays.some((d,i)=>Math.abs(d-i*entry.delay)>.1))throw Error('Wrong pulse delay '+entry.id);
                        for(const im of images){await im.decode();for(const a of im.getAnimations()){a.pause();a.currentTime=500;}}
                        const first=images[0],animation=first.getAnimations()[0];
                        animation.currentTime=100;const early=first.getBoundingClientRect().width;
                        animation.currentTime=700;const late=first.getBoundingClientRect().width;
                        if(late<=early)throw Error('Shout does not expand '+entry.id);
                        animation.currentTime=500;
                        const cs=getComputedStyle(first), portrait=u.node.querySelector('.sprite').getBoundingClientRect();
                        const box=first.getBoundingClientRect();
                        if(parseFloat(cs.width)!==entry.size||box.width<=portrait.width)throw Error('Shout stays inside portrait '+entry.id);
                        if(getComputedStyle(first.parentElement).overflow!=='visible')throw Error('Clipped shout '+entry.id);
                        if(images.some(im=>!im.src.endsWith('/'+entry.game_file)))throw Error('Wrong sprite '+entry.id);
                        if(u.node.querySelector('.fp-sweep'))throw Error('Extra buff sweep '+entry.id);
                        cards.push({id:entry.id,images:images.length,width:parseFloat(cs.width),delays,file:entry.game_file});
                    }
                    return {style,cards};
                }''', {'style': style, 'entries': entries})
                report['styles'].append(result)
                page.screenshot(path=str(BASE / f'installed_{style}.png'), full_page=True)

            report['runtime_checks'] = page.evaluate('''async ()=>{
                const F=window.F, checks={},u=makeUnit('settings'),state={idx:2,speed:1,catchUp:false};
                const images=()=>[...u.node.querySelectorAll('.fx-skill-stamp')];
                const clear=()=>u.node.querySelector('.fx-layer')?.replaceChildren();
                const shout=(st=state)=>F.fxBuff(st,u,{s:'war_shout',until:1,v:1});
                const check=(key,value)=>{checks[key]=!!value;if(!value)throw Error(key);};
                F.setFxOn('skill',false);shout();check('skill_toggle_suppresses_battle',images().length===0);
                F.fxPreview(1,u,'war_shout','buff','physical','foil');check('codex_preview_ignores_toggle',images().length===3);clear();
                F.setFxOn('skill',true);shout({...state,catchUp:true});check('catchup_suppresses_shout',images().length===0);
                F.setFxTransparency(50);shout();check('all_pulses_respect_transparency',images().every(im=>getComputedStyle(im).filter==='opacity(0.5)'));clear();F.setFxTransparency(0);
                shout({...state,speed:16});
                check('speed_scales_duration',Math.abs(parseFloat(getComputedStyle(images()[0]).animationDuration)-.33)<.001);
                check('speed_scales_pulse_gap',Math.abs(parseFloat(getComputedStyle(images()[1]).animationDelay)-.0255)<.001);
                await new Promise(resolve=>setTimeout(resolve,470));check('animation_cleans_all_pulses',images().length===0);
                F.setFxArtStyle('darktoon');await F.fxPreload('darktoon');
                F.fxHit(state,{node:null},u,{s:'war_bash',ty:'physical'});check('ordinary_strike_unchanged',images().length===1&&images()[0].classList.contains('fx-skill-slash'));clear();
                F.fxHit(state,{node:null},u,{s:'war_doubleswing',ty:'physical'});check('multi_hit_parts_unchanged',images().length===2&&images().every(im=>im.classList.contains('fx-skill-swing')));clear();
                F.fxHit(state,{node:null},u,{s:'mag_iceblast',ty:'cold'});check('two_stage_spell_unchanged',images().length===2&&images()[1].classList.contains('fx-skill-shatter'));clear();
                F.fxBuff(state,u,{s:'kni_holyshield',until:1,v:1});check('ordinary_buff_sweep_preserved',images().length===1&&!!u.node.querySelector('.fp-sweep'));clear();
                F.setFxArtStyle('foil');F.fxHeal(state,u,{s:'war_recovery'});check('unavailable_style_keeps_code_fallback',images().length===0&&u.node.querySelector('.fx-layer').childElementCount>0);clear();
                return checks;
            }''')
            for style in ['darktoon', 'foil']:
                page.goto(url + f'/index.html?dev=newgame&tab=codex&cx=fx&cxf={style}&lang=ko')
                page.wait_for_selector('.cx-fx-card', timeout=30000)
                results = page.evaluate('''async ({style,entries})=>{
                    const F=await import('./ui/fx.js');await F.fxPreload(style);
                    return entries.map((entry,i)=>{
                        const node=document.querySelector(`.cx-fx-card .unit[data-skill="${entry.id}"]`);
                        if(!node)throw Error('Missing codex card '+entry.id);
                        node.querySelector('.fx-layer')?.replaceChildren();
                        F.fxPreview(i+1,{key:entry.id,side:'enemy',node},entry.id,entry.event,'physical',style);
                        const images=[...node.querySelectorAll('.fx-skill-stamp')];
                        if(images.length!==3||images.some(im=>!im.src.endsWith('/'+entry.game_file)))throw Error('Codex playback '+entry.id);
                        return {id:entry.id,images:images.length};
                    });
                }''', {'style': style, 'entries': [s for s in specs if s['style'] == style]})
                report[f'codex_{style}'] = results
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    assert not report['page_errors'], report['page_errors']
    assert not report['asset_errors'], report['asset_errors']
    (BASE / 'runtime_verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'styles': len(report['styles']), 'checks': report['runtime_checks'],
                      'codex_cards': len(report['codex_darktoon']) + len(report['codex_foil']),
                      'page_errors': report['page_errors'], 'asset_errors': report['asset_errors']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
