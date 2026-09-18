async () => {
  const {__audit:A}=await import('/ui/app.js');
  const {D,SYS:S}=await import('/ui/data.js');
  const {mountBattle}=await import('/ui/battle.js');
  const {loadSave,writeSave,loadCloudLink,writeCloudLink,clearCloudLink}=await import('/ui/storage.js');
  const {createSkillRuntime,createHooks}=await import('/game_logic/skill_runtime.js');
  const results=[],assert=(v,d)=>{if(!v)throw new Error(JSON.stringify(d));};
  const test=(name,fn)=>{try{results.push({name,ok:true,detail:fn()});}catch(e){results.push({name,ok:false,detail:e.message});}};
  test('UI replay: maximum-HP buff displays updated current/max HP',()=>{
    const h=A.getG().heroes[0];const u=S.battle.makeEnemy('p0',1101,'normal',1,[]);
    Object.assign(u,{side:'party',uid:h.uid,hp:100,hpMax:100,hpMaxBase:100,buffs:{}});
    const timeline=[{t:0,e:'round',n:1,kind:'normal',enemies:[]}];
    const rt=createSkillRuntime({SK:S.skill,B:D.balance,rng:()=>0.5,timeline,out:{casts:{}},units:{party:[u],enemies:[]},r1:v=>v,EPS:1e-9,hooks:createHooks()});
    rt.castBuff(u,{id:'war_battleorders',target:'self',stat:'hp_max_pct',value:0.2,dur:10},1);
    const root=document.createElement('div');document.body.appendChild(root);
    const result={party:[{key:'p0',uid:h.uid,hpMax:100,period:2,actives:[],ready:[],atkMin:10,atkMax:10,atkType:'physical'}],timeline,potion:{max:0,slots:[]},rounds:[],durationSec:20};
    const stop=mountBattle(root,{result,stageId:101,heroes:[h],now:()=>1000,frozenMs:5000,resume:{t:1,running:false}});
    const shown=root.querySelector('.hp-text')?.textContent;stop();root.remove();
    assert(shown==='120 / 120',{expected:'120 / 120',actual:shown,runtime:{hp:u.hp,hpMax:u.hpMax},events:timeline});return shown;
  });
  test('UI replay: duplicate skill slots retain separate cooldowns',()=>{
    const h=A.getG().heroes[0],root=document.createElement('div');document.body.appendChild(root);
    const result={party:[{key:'p0',uid:h.uid,hpMax:100,period:2,actives:['war_bash','war_bash'],ready:[0,0],atkMin:10,atkMax:10,atkType:'physical'}],
      timeline:[{t:0,e:'round',n:1,kind:'normal',enemies:[]},{t:0.1,e:'skill',u:'p0',s:'war_bash',ready:12.1},{t:2.1,e:'skill',u:'p0',s:'war_bash',ready:14.1},{t:2.1,e:'regen',u:'p0',amt:0,dhp:100}],potion:{max:0,slots:[]},rounds:[],durationSec:20};
    const stop=mountBattle(root,{result,stageId:101,heroes:[h],now:()=>1000,frozenMs:5000,resume:{t:2.1,running:false}});
    const masks=[...root.querySelectorAll('.cd-mask')].map(e=>e.style.height);stop();root.remove();
    assert(masks[1] && masks[1]!=='0%',{expected:'both cooldown masks active after two casts',actual:masks});return masks;
  });
  test('storage failure: remote adoption must not advance cloud link if local write fails',()=>{
    clearCloudLink();A.getCloud().user={uid:'audit-local-only'};
    const local=loadSave(),remote={rev:42,savedAt:123456,save:{...structuredClone(local),savedAt:123456}};
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(k,v){if(k==='thesevensim.save')throw new DOMException('audit quota','QuotaExceededError');return original.call(this,k,v);};
    try{A.adoptRemote(remote,{booting:true});}finally{Storage.prototype.setItem=original;}
    const link=loadCloudLink(),same=JSON.stringify(local)===JSON.stringify(loadSave());clearCloudLink();
    assert(!(same&&link?.rev===42),{localUnchanged:same,cloudLink:link});
  });
  test('cloud comparison: different content at same timestamp is not an identical save',()=>{
    const local=loadSave(),remote=structuredClone(local);remote.resources.gold+=100;
    A.getState().modal=null;A.getCloud().user={uid:'audit-local-only'};clearCloudLink();
    A.linkAccount({rev:2,savedAt:local.savedAt,save:remote},{booting:true});
    const actual={modal:A.getState().modal,status:A.getCloud().status,link:loadCloudLink()};clearCloudLink();
    assert(actual.modal==='cloudPick',{expected:'cloudPick',actual});
  });
  return results;
}
