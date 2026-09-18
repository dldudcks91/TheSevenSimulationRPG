async () => {
 const {D,buildSystems}=await import('/ui/data.js');
 const {makeRng}=await import('/game_logic/rng.js');
 const {createSkillRuntime,createHooks}=await import('/game_logic/skill_runtime.js');
 const {parseCsv}=await import('/game_logic/csv.js');
 const S=buildSystems(D),B=D.balance,NOW=1700000000000,results=[];
 const assert=(v,d)=>{if(!v)throw new Error(typeof d==='string'?d:JSON.stringify(d));};
 const test=(name,fn)=>{try{results.push({name,ok:true,detail:fn()});}catch(e){results.push({name,ok:false,detail:e.message});}};
 const fresh=(seed=1)=>{const g=S.game.newGame(seed,S.hero.rollStartParty(makeRng(1000+seed),B.party_size_max),NOW);g.heroes.forEach(h=>S.game.toggleParty(g,h.uid,NOW));return g;};
 const unit=(h,acts,extra={})=>({uid:h.uid,stats:h.stats,actives:acts,rank:0,combat:{...S.hero.computeCombat(h,[]),hp_max:1000000,atk_physical:{min:40,max:40},action_period:1,...extra}});
 test('dismiss: formation must not retain removed hero references',()=>{
   const g=fresh(),h=g.heroes[0];for(const [slot,id] of Object.entries(h.equipped))if(id)S.game.unequip(g,h.uid,slot);
   assert(S.game.dismiss(g,h.uid).ok,'dismiss');const form=S.game.formationState(g);
   assert(form.ranks.flat().every(id=>g.party.includes(id)),{party:g.party,ranks:form.ranks,removed:h.uid});
 });
 test('duplicate skill cooldowns survive refit independently',()=>{
   const h=fresh().heroes[0],acts=[{id:'war_bash',source:'innate'},{id:'war_bash',source:'weapon_group'}];
   const p=unit(h,acts),run=S.battle.createRun([p],102,makeRng(994),1,[]);
   const first=run.next(),casts=run.result.timeline.filter(e=>e.e==='skill'&&e.u==='p0');
   assert(first.cleared&&!first.ended&&casts.length>=2,{setup:first,casts});
   const expected=casts.slice(-2).map(e=>e.ready).sort((a,b)=>a-b);
   const cutoff=run.result.timeline.length;run.next([{...p,combat:{...p.combat,hp_max:1000001}}]);
   const refit=run.result.timeline.slice(cutoff).find(e=>e.e==='refit');
   assert(new Set(refit.ready).size===2,{expectedIndependent:expected,actual:refit.ready,lastCasts:casts.slice(-2)});return refit;
 });
 test('runtime HP buff renewals: unchanged buff value should not repeatedly grant HP',()=>{
   const u=S.battle.makeEnemy('p0',1101,'normal',1,[]);Object.assign(u,{side:'party',hp:50,hpMax:100,hpMaxBase:100,buffs:{}});
   const rt=createSkillRuntime({SK:S.skill,B,rng:()=>0.5,timeline:[],out:{casts:{}},units:{party:[u],enemies:[]},r1:v=>v,EPS:1e-9,hooks:createHooks()});
   const def={id:'war_battleorders',target:'self',stat:'hp_max_pct',value:0.2,dur:12};
   rt.castBuff(u,def,1);const once={hp:u.hp,max:u.hpMax};rt.castBuff(u,def,2);
   return {once,renewed:{hp:u.hp,max:u.hpMax},classification:'same-shout renewal semantics require design decision'};
 });
 test('CSV parser malformed widths are observable (robustness observation)',()=>({
   short:parseCsv('id,value\na\n'),long:parseCsv('id,value\na,1,2\n'),unclosed:parseCsv('id,value\na,"broken\n')
 }));
 test('all skills: execution at two attribute bounds, finite outputs, bounded duration',()=>{
   const coverage={},unexercised=[];let runs=0;
   for(const def of S.skill.list){
     if(def.ownerKind==='monster')continue;
     coverage[def.id]=0;
     for(const attr of [B.hero_attr_min,B.hero_attr_max]){
       const h=fresh().heroes[0];h.stats=Object.fromEntries(Object.keys(h.stats).map(k=>[k,attr]));h.level=20;
       const p=unit(h,[{id:def.id,source:'innate'}],{hp_max:1000,hp_regen:0,atk_magic:{min:40,max:40}});
       delete p.combat.atk_physical;
       const result=S.battle.simulate([p],202,makeRng(23),20,[]);
       assert(Number.isFinite(result.durationSec)&&result.durationSec<=B.battle_timeout_sec+0.2,def.id+' time');
       for(const ev of result.timeline)for(const [k,v] of Object.entries(ev))if(typeof v==='number')assert(Number.isFinite(v),def.id+' '+k);
       coverage[def.id]+=result.casts[def.id]??result.timeline.filter(e=>e.e==='buff'&&e.s===def.id).length;
       runs++;
     }
     if(!coverage[def.id])unexercised.push(def.id);
   }
   return {runs,coverage,unexercised};
 });
 test('all stages at intended level: five seeds with equipment, mastery and round continuity',()=>{
   let runs=0,events=0,clears=0;const reached={};
   for(const stageId of D.stageOrder)for(let seed=1;seed<=5;seed++){
     const g=fresh(seed);g.progress.cleared=D.stageOrder.slice();const lvl=D.stages[stageId].dlvl;
     const party=g.heroes.map(h=>{
       h.level=lvl;h.masteryPoints=(lvl-1)*B.mastery_point_per_level;
       for(const n of S.hero.masteryNodesFor(h))while(S.game.learnMastery(g,h.uid,n.id).ok){}
       const gear=S.item.rollGear(makeRng(seed+stageId),{slots:D.slots.map(s=>s.id),ilvl:lvl});
       return {uid:h.uid,stats:h.stats,rank:0,actives:S.skill.activesFor(h,{weaponSkill:gear.find(x=>x.slot==='weapon').skill}),combat:S.hero.computeCombat(h,gear)};
     });
     const result=S.battle.simulate(party,stageId,makeRng(seed),lvl,[]);
     assert(['clear','wipe','timeout'].includes(result.reason),'termination');
     assert(result.rounds.length<=S.battle.stageRounds(D.stages[stageId]).length,'round cap');
     const used=new Set();
     for(const ev of result.timeline){assert(Number.isFinite(ev.t),'time');if(ev.e==='round')ev.enemies.forEach(e=>used.add(e.monsterId));if(ev.e==='call')ev.units.forEach(e=>used.add(e.monsterId));}
     reached[stageId]=[...new Set([...(reached[stageId]??[]),...used])];
     events+=result.timeline.length;runs++;if(result.won)clears++;
   }return {runs,events,clears,reached};
 });
 test('migration v28 -> current: ratio conversion exactly once, flat values stable',()=>{
   const g=fresh();g.version=28;
   for(const it of Object.values(g.items))for(const a of it.affixes)if(S.item.pctStat(a.stat))a.v*=100;
   const up=S.game.deserialize(g),again=S.game.deserialize(S.game.serialize(up,NOW));
   assert(JSON.stringify(S.game.serialize(up,NOW))===JSON.stringify(S.game.serialize(again,NOW)),'double conversion');
   for(const it of Object.values(up.items))for(const a of it.affixes)assert(Number.isFinite(a.v),'migration finite');return {items:Object.keys(up.items).length,version:up.version};
 });
 test('data immutability: constructing and running systems does not mutate supplied tables',()=>{
   const d=structuredClone(D),before=JSON.stringify(d),s=buildSystems(d);
   const g=s.game.newGame(5,s.hero.rollStartParty(makeRng(1005),B.party_size_max),NOW);g.heroes.forEach(h=>s.game.toggleParty(g,h.uid,NOW));
   s.game.resolveBattle(g,101,NOW);assert(JSON.stringify(d)===before,'data mutated');
 });
 test('aura refit: removing one duplicate caster preserves the other caster aura',()=>{
   const hs=fresh().heroes, aura=[{id:'kni_defiance',source:'innate'}];
   const ps=hs.slice(0,2).map(h=>unit(h,aura));
   const run=S.battle.createRun(ps,102,makeRng(995),1,[]),first=run.next();assert(first.cleared&&!first.ended,'setup');
   const n=run.result.timeline.length;run.next([ps[0],{...ps[1],actives:[{id:'war_bash',source:'innate'}]}]);
   const events=run.result.timeline.slice(n).filter(e=>['buff','buffEnd'].includes(e.e)&&e.s==='kni_defiance');
   const removed=events.filter(e=>e.e==='buffEnd'),reapplied=events.filter(e=>e.e==='buff');
   assert(removed.length===0||reapplied.length>=removed.length,{remainingCaster:'p0',removed,reapplied});return events;
 });
 test('summon death: report.downed contains only actual hero UIDs',()=>{
   for(let seed=1;seed<=20;seed++)for(const stage of [101,102,103,104,105]){
     const g=fresh(seed);g.progress.cleared=D.stageOrder.slice();const r=S.game.resolveBattle(g,stage,NOW).result;
     const ids=g.heroes.map(h=>h.uid),summons=r.timeline.filter(e=>e.e==='summon');
     assert(r.downed.every(id=>ids.includes(id)),{seed,stage,party:ids,downed:r.downed,summons:summons.length});
   }return {runs:100};
 });
 return {passed:results.filter(x=>x.ok).length,total:results.length,results};
}
