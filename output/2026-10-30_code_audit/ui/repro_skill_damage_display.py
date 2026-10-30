import json
from playwright.sync_api import sync_playwright
from smoke_ui import OUT, setup, SOURCE_SET_HASH, SNAPSHOT
BATTLE=SNAPSHOT['ui/battle.js'].decode('utf-8')
MARK='    const dom = buildDom(state, stage, stageId, opts.shrine ?? null, !!opts.buffsOf, opts);'
assert BATTLE.count(MARK)==1
BATTLE=BATTLE.replace(MARK,'    window.__auditBattleState = state;\n'+MARK)

JS='''async () => {
 const s=__uiAudit.sys(),{makeRng}=await import('/game_logic/rng.js');
 let candidates;
 for(let seed=1;seed<=100;seed++){candidates=s.hero.rollStartParty(makeRng(seed),3);if(candidates.some(h=>h.cls==='warrior'))break;}
 const g=s.game.newGame(1,candidates,1793318400000);
 const caster=g.heroes.find(h=>h.cls==='warrior');
 if(!caster)throw Error('no warrior');
 caster.level=10;caster.innate='war_bash';caster.bookSkill='pri_grace';
 const r=s.game.resolveBattle(g,1011,1793318400000);
 const chosen=r.result.timeline.find(e=>e.e==='stat' && e.u===r.result.party.find(p=>p.uid===caster.uid).key && e.v.atk_physical?.min>0);
 if(!chosen)throw Error('No grace event');
 const {mountBattle}=await import('/ui/battle.js'),{skillTipCard}=await import('/ui/tip.js');
 document.querySelector('.main').replaceChildren();
 const host=document.createElement('div');document.querySelector('.main').appendChild(host);
 const stop=mountBattle(host,{result:r.result,heroes:g.heroes,stageId:1011,
  resume:{t:chosen.t+1,running:false,speed:1},combatOf:h=>s.game.heroCombat(g,h),onRetreat:()=>{},now:()=>Date.now()});
 const u=window.__auditBattleState.units.get(chosen.u),skill=u.skills.find(x=>x.id==='war_bash');
 const stale={period:u.period,atkMin:u.atkMin,atkMax:u.atkMax,matkMin:u.matkMin,matkMax:u.matkMax,hpMax:u.hpMax,atkType:u.atkType,stats:u.stats};
 const live={...stale,atkMin:u.live.atk_physical.min,atkMax:u.live.atk_physical.max};
 const actual=host.querySelectorAll('.side-party .unit')[r.result.party.findIndex(p=>p.key===u.key)].querySelector('.cd-slot')._tipBuild();
 const data={event:chosen,renderAtk:[u.atkMin,u.atkMax],liveAtk:u.live.atk_physical,
 actualTooltip:actual.textContent,expectedTooltip:skillTipCard(skill,live).textContent,
 stalePreview:s.skill.previewOf(s.skill.defs.war_bash,stale),livePreview:s.skill.previewOf(s.skill.defs.war_bash,live)};
 stop();return data;
}'''

if __name__=='__main__':
 with sync_playwright() as p:
  b=p.chromium.launch(channel='msedge',headless=True);ctx=b.new_context(viewport={'width':1440,'height':1000});setup(ctx)
  ctx.route('**/ui/battle.js',lambda route:route.fulfill(status=200,content_type='text/javascript',body=BATTLE))
  page=ctx.new_page();page.goto('http://127.0.0.1:8921/index.html?dev=newgame');page.wait_for_function('window.__uiAudit && __uiAudit.game()!==null')
  out=page.evaluate(JS);out['source_set_sha256']=SOURCE_SET_HASH
  (OUT/'repro_skill_damage_display.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
  print(json.dumps({k:v for k,v in out.items() if k not in ['stalePreview','livePreview']},ensure_ascii=True),flush=True)
  b.close()
