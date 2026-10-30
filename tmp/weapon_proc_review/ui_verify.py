import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page()
    page.route('**/proc-ui-review.html', lambda r: r.fulfill(content_type='text/html', body='<html><body></body></html>'))
    source = (ROOT / 'src/ui/battle.js').read_text(encoding='utf-8')
    page.route('**/ui/battle.js', lambda r: r.fulfill(content_type='text/javascript', body=source+'\nexport { apply, hitIndex };'))
    page.goto('http://127.0.0.1:8777/proc-ui-review.html')
    result = page.evaluate('''async () => {
        const {loadData}=await import('/ui/data.js'); await loadData('/data/');
        const {apply,hitIndex}=await import('/ui/battle.js');
        const slot={id:'war_bash',readyAt:40,firedAt:1};
        const u={key:'p0',skills:[slot],lastAct:1,acted:false,noBasic:true,charges:2,
          skillT:1,skillS:'war_doubleswing',skillN:1,node:null};
        const state={catchUp:true,units:new Map([['p0',u]])};
        apply(state,document.createElement('div'),{}, {e:'skill',t:2,u:'p0',s:'war_bash',trigger:'hit'});
        const independent=slot.readyAt===40 && slot.firedAt===1 && u.lastAct===1 && u.acted===false && u.charges===2;
        const kept=u.skillT===1 && u.skillS==='war_doubleswing' && u.skillN===1;
        const procIndices=[hitIndex(u,{s:'war_bash',t:2,i:0}), hitIndex(u,{s:'war_bash',t:2,i:1})];
        const normalIndex=hitIndex(u,{s:'war_doubleswing',t:1});
        apply(state,document.createElement('div'),{}, {e:'skill',t:3,u:'p0',s:'war_bash',ready:18,ch:1});
        const normalUpdated=slot.readyAt===18 && slot.firedAt===3 && u.charges===1;
        u.noBasic=false; u.lastAct=4; u.acted=true; u.stalls=[{from:4,to:5}];
        apply(state,document.createElement('div'),{}, {e:'skill',t:4,u:'p0',s:'war_bash',trigger:'hit'});
        apply(state,document.createElement('div'),{}, {e:'hit',t:4,a:'p0',d:'missing',s:'war_bash',i:0,dmg:1,dhp:1});
        const staggerKept=u.stalls.length===1 && u.stalls[0].to===5;
        return {cooldown_and_gauge_independent:independent, normal_cast_kept:kept,
          proc_indices:procIndices,normal_next_index:normalIndex,normal_cast_updates:normalUpdated,
          counter_stagger_kept:staggerKept};
    }''')
    (OUT / 'ui_verification.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result), flush=True)
    assert result['cooldown_and_gauge_independent'] and result['normal_cast_kept']
    assert result['proc_indices'] == [0, 1] and result['normal_next_index'] == 1 and result['normal_cast_updates']
    assert result['counter_stagger_kept']
    browser.close()
