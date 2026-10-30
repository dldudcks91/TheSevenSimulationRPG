import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from smoke_ui import ROOT, OUT, setup, SNAPSHOT, SOURCE_SET_HASH

BATTLE=SNAPSHOT['ui/battle.js'].decode('utf-8')
MARK='    const dom = buildDom(state, stage, stageId, opts.shrine ?? null, !!opts.buffsOf, opts);'
assert BATTLE.count(MARK)==1
BATTLE=BATTLE.replace(MARK,'    window.__auditBattleState = state;\n'+MARK)
JS='''async () => {
 const s=__uiAudit.sys(),{makeRng}=await import('/game_logic/rng.js');
 let candidates;
 for(let seed=1;seed<=100;seed++){candidates=s.hero.rollStartParty(makeRng(seed),3);if(candidates.some(h=>h.cls==='warrior'))break;}
 const g=s.game.newGame(1,candidates,1793318400000);
 const caster=g.heroes.find(h=>h.cls==='warrior');caster.level=10;caster.bookSkill='pri_haste';
 const r=s.game.resolveBattle(g,1011,1793318400000);
 if(!r.ok) throw Error(JSON.stringify(r));
 const events=r.result.timeline.filter(e=>e.e==='stat' && e.v.action_period!==undefined);
 const casterKey=r.result.party.find(p=>p.uid===caster.uid).key;
 const chosen=events.find(e=>e.u===casterKey && e.v.action_period<r.result.party.find(u=>u.key===e.u).period);
 if(!chosen) throw Error('No haste event: '+JSON.stringify(events));
 // The first self-Haste leaves the already scheduled action intact. Sample the following action cycle.
 const laterAction=r.result.timeline.find(e=>e.t>chosen.t+.2 && ((e.e==='skill' && e.u===chosen.u && !e.trigger) || (['hit','dodge','evade'].includes(e.e) && e.a===chosen.u)));
 if(!laterAction)throw Error('No later physical action');
 const t=laterAction.t+.5;
 const {mountBattle}=await import('/ui/battle.js');
 document.querySelector('.main').replaceChildren();
 const host=document.createElement('div');document.querySelector('.main').appendChild(host);
 const stop=mountBattle(host,{result:r.result,heroes:g.heroes,stageId:1011,stage:__uiAudit.data().stages[1011],
  resume:{t,running:false,speed:1},combatOf:h=>s.game.heroCombat(g,h),onRetreat:()=>{},now:()=>Date.now()});
 const u=window.__auditBattleState.units.get(chosen.u);
 const stalled=(u.stalls??[]).reduce((sum,w)=>sum+Math.max(0,Math.min(w.to,t)-Math.max(w.from,u.lastAct)),0);
 const data={event:chosen,initialPeriod:r.result.party.find(p=>p.key===chosen.u).period,t,renderPeriod:u.period,
  livePeriod:u.live?.action_period,lastAct:u.lastAct,actionTitle:u.node.querySelector('.act-row').title,
  gauge:u.node.querySelector('.act-fill').style.transform,laterAction,stalled,
  expectedGaugeAtCurrentPeriod:Math.max(0,Math.min(1,(t-u.lastAct-stalled)/u.live.action_period)),html:u.node.outerHTML,
  changedEvents:events.filter(e=>e.u===chosen.u).slice(0,10)};
 stop();return data;
}'''
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True)
 ctx=b.new_context(viewport={'width':1440,'height':1000});setup(ctx)
 ctx.route('**/ui/battle.js',lambda route:route.fulfill(status=200,content_type='text/javascript',body=BATTLE))
 page=ctx.new_page();page.goto('http://127.0.0.1:8921/index.html?dev=newgame')
 page.wait_for_function('window.__uiAudit && __uiAudit.game() !== null')
 out=page.evaluate(JS)
 out['source_set_sha256']=SOURCE_SET_HASH
 (OUT/'repro_battle_live_display.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
 page.screenshot(path=str(OUT/'battle_live_display.png'))
 print(json.dumps({k:v for k,v in out.items() if k!='html'},ensure_ascii=True),flush=True)
 b.close()
