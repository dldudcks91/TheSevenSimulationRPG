import json, subprocess, hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
from smoke_ui import ROOT, OUT, setup, SOURCE_SET_HASH

paths=subprocess.check_output(['rg','--files','output','-g','*save*.json','-g','state_*.json'],cwd=ROOT,text=True).splitlines()
fixtures=[]
for filename in paths:
    path=ROOT/filename
    try: state=json.loads(path.read_text(encoding='utf-8-sig'))
    except (ValueError,OSError): continue
    if isinstance(state,dict) and isinstance(state.get('version'),int) and isinstance(state.get('heroes'),list):
        raw=json.dumps(state,ensure_ascii=False,separators=(',',':'))
        fixtures.append({'path':filename,'raw':raw,'bytes_file':path.stat().st_size,'chars_compact':len(raw),'version':state['version'],'savedAt':state['savedAt']})

selected=[f for f in fixtures if f['version']!=43]
for suffix in [
 'simulation/checkpoints/state_passive_seed1_86400.json',
 'simulation/checkpoints/state_adaptive_seed2_86400.json',
 'simulation/state_managed_86400.json',
 'simulation/farming/state_farming_86400.json',
 'browser/saved_before_reload.json',
 'browser/native_90s_save.json']:
    candidate=next((f for f in fixtures if f['path'].replace('\\','/').endswith(suffix)),None)
    if candidate and candidate not in selected:selected.append(candidate)

result={'source_set_sha256':SOURCE_SET_HASH,'fixtures':[{k:v for k,v in f.items() if k!='raw'} for f in fixtures],'roundtrips':[],'ui':[]}
with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    ctx=browser.new_context();setup(ctx)
    page=ctx.new_page();page.goto('http://127.0.0.1:8921/index.html');page.wait_for_selector('.mn-wrap')
    for f in fixtures:
        row=page.evaluate('''f => {
            const api=__uiAudit.sys().game,raw=JSON.parse(f.raw);
            try {
              const one=api.deserialize(raw),serialized=api.serialize(one,one.savedAt),two=api.deserialize(serialized);
              return {path:f.path,from:raw.version,to:two.version,canLoad:api.canLoad(raw),
                idempotent:JSON.stringify(one)===JSON.stringify(two),chars:JSON.stringify(serialized).length,
                reportCount:two.reports.length,itemCount:Object.keys(two.items).length,heroCount:two.heroes.length,
                hasTimeline:JSON.stringify(serialized).includes('"timeline"')};
            } catch(e){ return {path:f.path,from:raw.version,error:String(e),stack:e.stack}; }
        }''',f)
        result['roundtrips'].append(row)
    ctx.close()
    print(json.dumps({'roundtrips':len(result['roundtrips']),'errors':[x for x in result['roundtrips'] if x.get('error') or not x.get('idempotent')],
        'maxChars':max(x.get('chars',0) for x in result['roundtrips'])},ensure_ascii=True),flush=True)
    for f in selected:
        ctx=browser.new_context(viewport={'width':1440,'height':1000});setup(ctx)
        # Each historical save is seeded only inside a fresh, isolated browser context.
        ctx.add_init_script('localStorage.setItem("thesevensim.save",'+json.dumps(f['raw'])+');')
        page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto('http://127.0.0.1:8921/index.html');page.wait_for_selector('.mn-wrap')
        before=page.locator('.mn-btn').nth(1).is_enabled()
        page.locator('.mn-btn').nth(1).click()
        page.wait_for_function('__uiAudit.state().screen === "game"')
        tabs=[]
        for tab in ['expedition','explore','party','character','research','tavern','shop','forge','library','resource','colosseum','arena','codex','help']:
            button=page.locator(f'.nav [data-tab="{tab}"]')
            if button.count():
                button.click()
                tabs.append({'requested':tab,'actual':page.evaluate('__uiAudit.state().tab')})
        row={'path':f['path'],'from':f['version'],'loadEnabled':before,'loadedVersion':page.evaluate('__uiAudit.game().version'),'tabs':tabs,'errors':errors}
        result['ui'].append(row)
        print(json.dumps({'path':f['path'],'loadEnabled':before,'loadedVersion':row['loadedVersion'],'errors':errors},ensure_ascii=True),flush=True)
        ctx.close()
    browser.close()
(OUT/'saved_game_compatibility.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
