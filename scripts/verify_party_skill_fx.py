"""Run the actual FX module in headless Chrome without extra Python packages.

Creates validation.json and browser screenshots beside the generated sources.
Uses a temporary local server and isolated browser profiles; cloud is stubbed
only in this verification server, never in project files.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import subprocess
import threading
import uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/assets/art/fx_source/party_basic_20261006"
VIRTUAL_TIME_BUDGET = 12000
BROWSER = Path("C:/Program Files/Google/Chrome/Application/chrome.exe")
if not BROWSER.exists():
    BROWSER = Path("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe")

HARNESS = r"""<!doctype html><meta charset="utf-8"><base href="/">
<link rel="stylesheet" href="/ui/style.css">
<style>body{padding:20px;background:#161624;color:#d8d9e6}.arena{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.unit{width:340px;height:110px}.unit .sprite{width:101px;height:101px;position:absolute;left:0;top:0;background-size:contain}.label{position:absolute;left:110px;top:18px;font-size:15px}.pop-layer{position:absolute}</style>
<div class="arena" id="grid"></div><pre id="result"></pre>
<script type="module">
import * as F from '/ui/fx.js';
import { SKILL_ART } from '/ui/skill_art.js';
const entries = __ENTRIES__;
const fail = new URLSearchParams(location.search).has('fail');
const report = {runtime_checks:{}, events:[], errors:[]};
window.addEventListener('error', e => report.errors.push(e.message));
function check(name, ok){report.runtime_checks[name]=!!ok;if(!ok)throw Error(name);}
function unit(key='test', job='priest'){
 const slot=document.createElement('div'); slot.className='unit-slot';
 const node=document.createElement('div');node.className='unit enemy';
 node.innerHTML=`<div class="sprite" style="background-image:url('/assets/art/faces/gpt/hero/${job}_1.webp')"></div><div class="pop-layer"></div>`;
 slot.append(node);document.querySelector('#grid').append(slot);
 return {key,side:'enemy',node};
}
function clear(u){u.node.querySelector('.fx-layer')?.replaceChildren();}
const images=u=>[...u.node.querySelectorAll('.fx-skill-stamp')];
const st={idx:1,speed:1,catchUp:false}, no={key:'none',node:null};
try{
 await F.fxPreload();
 const u=unit();
 F.setFxOn('hit',false);F.setFxOn('lunge',false);F.setFxOn('skill',true);
 if(fail){
  F.fxHeal(st,u,{s:'pri_heal'});
  check('heal_load_failure_fallback',images(u).length===0&&u.node.querySelector('.fx-layer').childElementCount>0);clear(u);
  F.fxAppear(st,u,'mag_frozenwall');
  check('summon_load_failure_fallback',images(u).length===0&&u.node.querySelector('.fx-layer').childElementCount>0);
 }else{
  for(const e of entries){
   clear(u);F.fxPreview(1,u,e.id,e.kind);
   const im=images(u)[0];check(`image_${e.file}`,!!im&&im.src.endsWith(`/${e.file}.webp`));
   await im.decode();check(`format_${e.file}`,im.naturalWidth===384&&im.naturalHeight===384);
   const css=getComputedStyle(im);check(`motion_${e.file}`,css.animationName===`fx-skill-${e.motion}`&&parseFloat(css.animationDuration)>0);
   report.events.push({skill:e.id,kind:e.kind,file:e.file,motion:css.animationName,duration:css.animationDuration});
  }
  clear(u);F.setFxOn('skill',false);
  F.fxHeal(st,u,{s:'pri_heal'});F.fxBuff(st,u,{s:'pri_grace',until:1,v:1});F.fxAppear(st,u,'mag_frozenwall');F.fxHit(st,no,u,{s:'arc_snipe',ty:'physical'});
  check('skill_off_all_event_types',u.node.querySelector('.fx-layer').childElementCount===0);
  F.fxPreview(1,u,'pri_heal','heal');check('preview_overrides_setting',images(u).length===1);
  clear(u);F.setFxOn('skill',true);
  for(const state of [{...st,catchUp:true},st]){
   if(!state.catchUp)u.node.parentElement.remove();
   F.fxHeal(state,u,{s:'pri_heal'});F.fxBuff(state,u,{s:'pri_grace',until:1,v:1});F.fxAppear(state,u,'mag_frozenwall');F.fxHit(state,no,u,{s:'arc_snipe',ty:'physical'});
   check(state.catchUp?'catchup_suppressed':'disconnected_suppressed',images(u).length===0);
  }
  document.querySelector('#grid').append(u.node.parentElement);
  for(const s of ['kni_might','kni_fanaticism','kni_defiance'])F.fxBuff(st,u,{s,until:null,v:1});
  check('aura_suppressed_in_battle',images(u).length===0);
  F.fxBuff(st,u,{s:'kni_duel',stat:'duel',until:10,v:.2});check('duel_positive_enemy_mark',images(u)[0]?.src.endsWith('/kni_duel.webp'));clear(u);
  F.fxBuff(st,u,{s:'kni_duel',stat:'dr_pct',until:10,v:.2});check('duel_self_guard',images(u)[0]?.src.endsWith('/kni_duel_guard.webp'));clear(u);
  F.fxBuff(st,u,{s:'pri_penitence',stat:'atk_pct',until:10,v:-.25});check('negative_buff_uses_bad_image',images(u)[0]?.src.endsWith('/pri_penitence.webp'));clear(u);
  F.fxBuff(st,u,{s:'kni_holyshield',stat:'barrier_pct',until:10,v:.5});check('barrier_uses_protective_image',images(u)[0]?.src.endsWith('/kni_holyshield.webp'));clear(u);
  F.fxHeal({...st,speed:16},u,{s:'pri_heal'});check('speed16',Math.abs(parseFloat(getComputedStyle(images(u)[0]).animationDuration)-.192)<.001);clear(u);
  for(let i=0;i<3;i++)F.fxHit({...st,idx:i},no,u,{s:'arc_rapid',ty:'physical'});
  check('multiple_hits_have_independent_sprites',images(u).length===3);
  check('popup_above',u.node.querySelector('.fx-layer').nextElementSibling?.classList.contains('pop-layer'));clear(u);
  F.fxHit(st,no,u,{crit:false});check('basic_keeps_code',images(u).length===0&&u.node.querySelector('.fx-b-slash'));clear(u);
  F.fxHit(st,no,u,{s:'mag_meteor',ty:'fire'});check('advanced_keeps_code',images(u).length===0&&u.node.querySelector('.fx-layer').childElementCount>0);clear(u);
  const L=u.node.querySelector('.fx-layer');for(let i=0;i<61;i++)L.append(document.createElement('i'));
  F.fxHeal(st,u,{s:'pri_heal'});F.fxAppear(st,u,'mag_frozenwall');F.fxBuff(st,u,{s:'pri_grace',until:1,v:1});F.fxHit(st,no,u,{s:'arc_snipe',ty:'physical'});
  check('cap_all_event_types',L.childElementCount===61);clear(u);
  F.fxHeal(st,u,{s:'pri_heal'});images(u)[0].dispatchEvent(new Event('animationend'));
  check('animation_cleanup',images(u).length===0);
  F.fxHit(st,no,u,{s:'war_bash',ty:'physical'});check('warrior_image_preserved',images(u)[0]?.src.endsWith('/war_bash.webp'));
  document.querySelector('#grid').replaceChildren();
  for(const e of entries){
   const card=unit(e.file,e.job),label=document.createElement('span');label.className='label';label.textContent=e.name+(e.file==='kni_duel_guard'?' · 보호':'');card.node.append(label);
   F.fxPreview(1,card,e.id,e.kind);await images(card)[0].decode();
   for(const animation of images(card)[0].getAnimations()){animation.pause();animation.currentTime=e.duration*.45;}
  }
 }
 report.ok=true;
}catch(e){report.ok=false;report.errors.push(String(e.stack||e));}
document.querySelector('#result').textContent=JSON.stringify(report);
</script>"""

CLOUD = """const user={uid:'fx-local-review',email:'fx-review@example.com'};
export function warm(){};
export async function restoreUser(){return {ok:true,user}};
export async function signIn(){return {ok:true,user}};
export async function pullSave(){return {ok:true,remote:null}};
export async function pushSave(){return {ok:true,rev:1}};
export async function signOut(){return {ok:true}};
export async function watchUser(){return ()=>{}};
"""

APP_REVIEW = r"""
;(async()=>{
 const result=document.createElement('pre');result.id='result';result.style.display='none';document.body.append(result);
 try{
  const deadline=Date.now()+6000;
  while(!document.querySelector('.cx-fx-card')){if(Date.now()>deadline)throw Error('Codex did not render');await new Promise(r=>setTimeout(r,50));}
  await fxPreload();
  const entries=__ENTRIES__, ids=[...new Set(entries.map(e=>e.id))];
  const missing=ids.filter(id=>!document.querySelector(`.cx-fx-card .unit[data-skill="${id}"]`));
  if(missing.length)throw Error('Missing codex cards: '+missing.join(','));
  document.querySelectorAll('.ix-group').forEach(group=>{if(!group.querySelector('.unit[data-skill="kni_smite"],.unit[data-skill="mag_fireball"],.unit[data-skill="arc_snipe"],.unit[data-skill="pri_heal"]'))group.style.display='none';});
  for(const id of ids){
   const node=document.querySelector(`.cx-fx-card .unit[data-skill="${id}"]`),entry=entries.find(e=>e.id===id);
   fxPreview(1,{key:id,side:'enemy',node},id,entry.kind);
   const im=node.querySelector('.fx-skill-stamp');if(!im)throw Error('Missing image '+id);
   for(const a of im.getAnimations()){a.pause();a.currentTime=entry.duration*.45;}
  }
  result.textContent=JSON.stringify({ok:true,cards:ids.length,images:document.querySelectorAll('.fx-skill-stamp').length,aura_cards:ids.filter(id=>id==='kni_might'||id==='kni_fanaticism'||id==='kni_defiance').length});
 }catch(e){result.textContent=JSON.stringify({ok:false,error:String(e.stack||e)});}
})();
"""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--only', choices=('runtime', 'fallback', 'codex'))
    args = parser.parse_args()
    manifest = json.loads((OUT / "prompts.json").read_text(encoding="utf-8"))
    entries = json.dumps(manifest["skills"], ensure_ascii=True)

    class Handler(SimpleHTTPRequestHandler):
        block_effects = False

        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT / "src"), **kwargs)

        def log_message(self, *args):
            pass

        def do_GET(self):
            path = urlparse(self.path).path
            if self.block_effects and path in ("/assets/art/fx/skills/pri_heal.webp", "/assets/art/fx/skills/mag_frozenwall.webp"):
                self.send_error(404)
                return
            body = None
            content_type = "text/javascript"
            if path == "/dev/__party_fx_validation.html":
                body = HARNESS.replace("__ENTRIES__", entries)
                content_type = "text/html; charset=utf-8"
            elif path == "/ui/cloud.js":
                body = CLOUD
            elif path == "/ui/app.js":
                body = (ROOT / "src/ui/app.js").read_text(encoding="utf-8") + APP_REVIEW.replace("__ENTRIES__", entries)
            if body is None:
                return super().do_GET()
            data = body.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_address[1]}"
    previous = OUT / 'validation.json'
    results = json.loads(previous.read_text(encoding='utf-8')) if args.only and previous.exists() else {}
    try:
        for name, url in (("runtime", "/dev/__party_fx_validation.html"), ("fallback", "/dev/__party_fx_validation.html?fail=1"), ("codex", "/index.html?dev=battle&tab=codex&cx=skill&cxs=fx&lang=ko")):
            if args.only and name != args.only:
                continue
            Handler.block_effects = name == "fallback"
            profile = ROOT / "tmp" / "skill_fx_browser" / uuid.uuid4().hex
            profile.mkdir(parents=True)
            command = [str(BROWSER), "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--disable-sync", "--hide-scrollbars", "--window-size=1680,1400", f"--user-data-dir={profile}", f"--virtual-time-budget={VIRTUAL_TIME_BUDGET}", "--dump-dom", f"--screenshot={OUT / (name + '_browser.png')}", base + url]
            completed = subprocess.run(command, capture_output=True, timeout=60, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            dom = completed.stdout.decode("utf-8", errors="replace")
            found = re.search(r'<pre[^>]*id="result"[^>]*>(.*?)</pre>', dom, re.S)
            if not found or not found.group(1).strip():
                (OUT / f"{name}_failure.html").write_text(dom, encoding="utf-8")
                raise RuntimeError(f"No {name} browser result: " + completed.stderr.decode("utf-8", errors="replace")[-1200:])
            results[name] = json.loads(html.unescape(found.group(1)))
            (OUT / "validation.json").write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            if not results[name]["ok"]:
                raise RuntimeError(f"{name} failed: {results[name].get('errors', results[name].get('error'))}")
        print(json.dumps({"runtime_checks": len(results["runtime"]["runtime_checks"]), "fallback_checks": len(results["fallback"]["runtime_checks"]), "codex": results["codex"], "ok": True}))
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
