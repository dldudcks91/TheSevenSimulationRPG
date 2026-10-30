export async function verify() {
  const {loadData,buildSystems,D}=await import('/ui/data.js');
  const {makeRng}=await import('/game_logic/rng.js');
  await loadData('/data/');
  const SYS=buildSystems(D),game=SYS.game,B=D.balance,AT=1700000000000,HOUR=3600000;
  const out=[];
  const fresh=(seed=42)=>game.newGame(seed,SYS.hero.rollStartParty(makeRng(seed),B.party_size_max),AT);
  const copy=g=>game.deserialize(game.serialize(g,AT));
  const fixture=(seed=42)=>{
    const g=fresh(seed);
    Object.assign(g.buildings,{storage:1,resource:4,tavern:3});
    g.resources.gold=100000000;
    for(const m of D.labMaterials)g.materials[m.id]=100000000;
    game.labSettle(g,AT);
    return g;
  };
  const arrival=g=>g.joins.map(j=>({hours:(j.arrivedAt-AT)/HOUR,tier:j.hero.tier,no:j.no}));
  {
    const g=fresh();
    Object.assign(g.buildings,{shop:1,tavern:1,forge:1});
    g.resources.gold=1000000;
    const built=game.construct(g,'storage',AT);
    const clocksAfterBuild=JSON.parse(JSON.stringify(g.resourceProduction));
    const delayed=copy(g),control=copy(g);
    game.labSettle(control,AT);
    const actual=game.labSettle(delayed,AT+HOUR),expected=game.labSettle(control,AT+HOUR);
    out.push({id:'storage-initial-production-clock',built,clocksAfterBuild,actual,expected});
  }
  for(const node of ['waiting','interval']) {
    const g=fixture();
    g.labNodes['visit:interval']=1;
    if(node==='interval')g.labNodes['visit:waiting']=4;
    g.visit={nextAt:AT+4*HOUR,left:null};
    const start=game.labResearchStart(g,'visit',node,AT);
    if(!start.ok)throw Error(node+' fixture '+JSON.stringify(start));
    const direct=copy(g),app=copy(g),end=AT+(node==='waiting'?10:7.8)*HOUR;
    game.labSettle(direct,end);
    game.visitSettle(app,end);
    game.labSettle(app,end);
    out.push({id:'visit-before-lab-'+node,researchHours:(start.until-AT)/HOUR,nowHours:(end-AT)/HOUR,
      expected:arrival(direct),actual:arrival(app),expectedVisit:direct.visit,actualVisit:app.visit});
  }
  {
    for(let seed=1;seed<=300;seed++) {
      const g=fixture(seed);
      g.labNodes['visit:interval']=1;
      g.labNodes['visit:quality']=0;
      g.visit={nextAt:AT+4*HOUR,left:null};
      const start=game.labResearchStart(g,'visit','quality',AT);
      if(!start.ok)throw Error('quality fixture');
      const end=AT+24*HOUR,direct=copy(g),app=copy(g);
      game.labSettle(direct,end);
      game.visitSettle(app,end);game.labSettle(app,end);
      if(JSON.stringify(arrival(direct))!==JSON.stringify(arrival(app))) {
        out.push({id:'visit-before-lab-quality',seed,researchHours:(start.until-AT)/HOUR,expected:arrival(direct),actual:arrival(app)});break;
      }
    }
  }
  {
    for(let seed=1;seed<=40;seed++) {
      const base=fresh(seed);
      for(const b of SYS.construction.list)base.buildings[b.id]=b.maxRank;
      const g=copy(base);
      g.progress.cleared=[1011,1012];
      g.potions={minor_healing:1};
      g.presets[0].party=[g.heroes[0].uid];
      g.presets[1].party=[g.heroes[1].uid];
      for(const p of g.presets){p.potionSlots=['minor_healing'];p.potionHp=0.9;}
      const a=game.departRun(g,1013,AT,1),b=game.departRun(g,1013,AT,2);
      if(!a.ok||!b.ok)throw Error('multi-potion fixture '+JSON.stringify([a.err,b.err]));
      const initial=g.potions.minor_healing;
      const ra=game.advanceRun(g,a.run,AT),afterA=g.potions.minor_healing??0;
      const rb=game.advanceRun(g,b.run,AT),afterB=g.potions.minor_healing??0;
      const usedA=ra.round.potions?.minor_healing??0,usedB=rb.round.potions?.minor_healing??0;
      if(usedA+usedB>initial) {
        out.push({id:'concurrent-potion-stock-overspend',seed,initial,afterA,afterB,usedA,usedB,
          classes:[g.heroes[0].cls,g.heroes[1].cls],aPotions:a.run.result.timeline.filter(e=>e.e==='potion'),bPotions:b.run.result.timeline.filter(e=>e.e==='potion')});
        break;
      }
    }
  }
  {
    const checks=[];
    const check=(name,actual,expected)=>checks.push({name,pass:JSON.stringify(actual)===JSON.stringify(expected),actual,expected});
    for(const edge of [-1,0,1]) {
      const g=fixture();g.buildings.tavern=2;
      const beforeGold=g.resources.gold;
      const started=game.labResearchStart(g,'res','mine',AT),paid=JSON.parse(JSON.stringify(g.labResearch.paid));
      const result=game.labResearchCancel(g,started.until+edge);
      check('research-cancel '+edge+'ms result',result.ok,edge<0);
      check('research-cancel '+edge+'ms node',g.labNodes['res:mine']??0,edge<0?0:1);
      check('research-cancel '+edge+'ms refund gold',g.resources.gold,beforeGold-(edge<0?0:paid.gold));
      check('research-cancel '+edge+'ms no pending',g.labResearch,null);
    }
    {
      const g=fixture();g.labNodes['visit:interval']=1;g.visit={nextAt:AT+4*HOUR,left:null};
      check('visit just before arrival',game.visitSettle(g,AT+4*HOUR-1).arrived.length,0);
      check('visit exact arrival',game.visitSettle(g,AT+4*HOUR).arrived.length,1);
      check('visit same instant idempotent',game.visitSettle(g,AT+4*HOUR).arrived.length,0);
      check('visit capacity',game.visitSettle(g,AT+24*HOUR).arrived.length,1);
      check('visit pause',g.visit,{nextAt:null,left:4*HOUR});
      game.joinDrop(g,g.joins[0].no,AT+24*HOUR);
      check('visit resume remaining time',g.visit,{nextAt:AT+28*HOUR,left:null});
    }
    {
      const g=fixture();for(const b of SYS.construction.list)g.buildings[b.id]=b.maxRank;
      const h=g.heroes[0],uid=Object.values(h.equipped).find(Boolean);
      game.unequip(g,h.uid,Object.keys(h.equipped).find(k=>h.equipped[k]===uid));
      game.setItemLock(g,uid,true);
      const stable=(name,fn)=>{const before=JSON.stringify(g);const result=fn();check(name+' rejected',result.ok,false);check(name+' unchanged',JSON.stringify(g),before);};
      stable('salvage locked',()=>game.salvage(g,uid));
      stable('shop stale',()=>game.shopBuy(g,0,100,AT));
      g.resources.gold=0;
      stable('shop insufficient gold',()=>game.shopBuy(g,0,g.counters.shop,AT));
      const synth=game.synthState(g).list[0];g.materials[synth.from]=0;
      stable('synth insufficient material',()=>game.synthesize(g,synth.id));
      stable('equip missing',()=>game.equip(g,h.uid,'i_missing'));
      stable('depart missing stage',()=>game.departRun(g,999999,AT));
    }
    out.push({id:'boundary-and-rejection-contracts',count:checks.length,passed:checks.filter(x=>x.pass).length,failures:checks.filter(x=>!x.pass)});
  }
  {
    const compared=[];
    const selected=g=>Object.fromEntries(['resources','materials','heroes','items','bags','progress','codexExp','books','blueprints','commissions','bonds','counters','reports'].map(k=>[k,g[k]]));
    const states=[1011,1013,1051,2013,3051,5051];
    for(let seed=1;seed<=20;seed++)for(const stage of states) {
      const base=fresh(seed);
      for(const b of SYS.construction.list)base.buildings[b.id]=b.maxRank;
      base.progress.cleared=D.stageOrder.filter(id=>id!==stage&&D.stages[id].chapter<=B.chapter_open_max);
      const level=[1,7,20,35,B.hero_level_cap][seed%5];
      for(const h of base.heroes)h.level=level;
      const a=copy(base),b=copy(base);
      const ra=game.resolveBattle(a,stage,AT),rb=game.departRun(b,stage,AT);
      if(!ra.ok||!rb.ok)throw Error('split fixture '+JSON.stringify([ra.err,rb.err]));
      let result;
      for(const t of [0,.17,.9,1.43,3.1,4.9,8.3,13.2,21.37,35.9,58.1,95.7,150.6,247.9,401.1,650.7,1100,Infinity]) {
        result=game.stepRun(b,rb.run,t);
        if(result.done)break;
      }
      if(!result?.done)throw Error('split did not end');
      game.noteRunEnd(b,rb.run,AT);
      const sa=selected(a),sb=selected(b),diff=Object.keys(sa).filter(k=>JSON.stringify(sa[k])!==JSON.stringify(sb[k]));
      compared.push({seed,stage,level,won:ra.report.won,diff});
    }
    out.push({id:'state-one-shot-vs-split-time',runs:compared.length,passed:compared.filter(x=>!x.diff.length).length,failures:compared.filter(x=>x.diff.length)});
  }
  {
    const checks=[];
    const check=(name,actual,expected)=>checks.push({name,pass:JSON.stringify(actual)===JSON.stringify(expected),actual,expected});
    const base=fresh(41);
    for(const b of SYS.construction.list)base.buildings[b.id]=b.maxRank;
    for(const h of base.heroes)h.level=B.hero_level_cap;
    base.progress.cleared=D.stageOrder.filter(id=>D.stages[id].chapter<=B.chapter_open_max&&id!==5051);
    const g=copy(base);
    const gearRng=makeRng(464646);
    for(const h of g.heroes)for(const part of ['weapon','armor','helmet','gloves','boots','ring','amulet']) {
      const opts={slots:[part],ilvl:B.hero_level_cap,rarityWeights:{rare:1}};
      if(part==='weapon')opts.weaponGroup=SYS.item.groupsFor(h.cls)[0].id;
      else {
        const pool=SYS.item.basesAt(part,B.hero_level_cap).filter(b=>SYS.item.fitsClass({slot:part,group:b.group},h.cls));
        opts.itemBase=pool[0].id;
      }
      const [it]=SYS.item.rollGear(gearRng,opts);it.uid='i'+(++g.counters.item);
      g.items[it.uid]=it;g.bags[0].push(it.uid);game.equip(g,h.uid,it.uid);
    }
    const d=game.departRun(g,1011,AT);
    while(!game.advanceRun(g,d.run,AT).done);
    check('normal first cell actually cleared',d.report.won,true);
    const nx=game.nextRepeat(g,AT,1);
    check('automatic next cell',nx.stageId,1012);
    const shrine=g.runs[0].shrine?.id??null;
    const next=game.departRun(g,nx.stageId,nx.at,1,d.run,nx.difficulty);
    check('continuation accepted',next.ok,true);
    check('continuation preserves shrine',next.run.fixed.shrine,shrine);
    check('old handle cannot continue',game.departRun(g,1012,nx.at+1,1,d.run).err,'stopped');
    const oldState=JSON.stringify(selectedForStop(g));
    check('old handle step rejected',game.stepRun(g,d.run,Infinity).err,'done');
    check('old handle gives no rewards',JSON.stringify(selectedForStop(g)),oldState);
    check('active retreat accepted',game.retreatRun(g,next.run,nx.at+1).ok,true);
    check('retreat disables automatic next',game.nextRepeat(g,nx.at+1,1),null);
    check('retreat releases party',game.runParty(g),[]);
    const boss=game.departRun(g,1051,AT+1000000);
    while(!game.advanceRun(g,boss.run,AT+1000000).done);
    check('normal chapter boss actually cleared',boss.report.won,true);
    game.noteRunEnd(g,boss.run,AT+1000000);
    const respawn=game.bossRespawnAt(g,1051);
    check('boss cooldown before exact boundary',game.canDepart(g,1051,respawn-1),'respawn');
    check('boss cooldown exact boundary',game.canDepart(g,1051,respawn),null);
    game.retreatRun(g,boss.run,AT+1000000);
    const last=game.departRun(g,5051,AT+2000000);
    while(!game.advanceRun(g,last.run,AT+2000000).done);
    check('normal final chapter boss actually cleared',last.report.won,true);
    const up=game.nextRepeat(g,AT+2000000,1);
    check('normal finish transitions first nightmare cell',[up.stageId,up.difficulty],[1011,'nightmare']);
    const climb=game.departRun(g,up.stageId,up.at,1,last.run,up.difficulty);
    check('nightmare continuation accepted',climb.ok,true);
    check('difficulty selection follows automatic climb',g.difficulty,'nightmare');
    out.push({id:'actual-run-continuation-boundaries',count:checks.length,passed:checks.filter(x=>x.pass).length,failures:checks.filter(x=>!x.pass)});
    function selectedForStop(g){return {resources:g.resources,heroes:g.heroes,items:g.items,reports:g.reports};}
  }
  {
    let steps=0,checked=0;
    const failures=[];
    const inspect=(g,seed,step,act)=>{
      const refs=g.bags.flat().concat(g.stash,g.heroes.flatMap(h=>Object.values(h.equipped).filter(Boolean)));
      const errors=[];
      for(const uid of refs)if(!g.items[uid])errors.push('dangling item '+uid);
      if(new Set(refs).size!==refs.length)errors.push('duplicate item location');
      if(refs.length!==Object.keys(g.items).length)errors.push('orphan item '+Object.keys(g.items).filter(u=>!refs.includes(u)));
      for(const [key,v]of Object.entries({...g.resources,...g.materials}))if(!Number.isFinite(v)||v<0)errors.push('invalid resource '+key+':'+v);
      const parties=g.presets.flatMap(p=>p.party);
      if(new Set(parties).size!==parties.length)errors.push('duplicate party membership');
      checked++;
      if(errors.length)failures.push({seed,step,act,errors});
    };
    for(let seed=1;seed<=12&&!failures.length;seed++) {
      const g=fixture(seed),rng=makeRng(seed^0x345678);
      for(const b of SYS.construction.list)g.buildings[b.id]=b.maxRank;
      for(const h of g.heroes)h.level=B.hero_level_cap;
      for(const row of game.materialLadder())g.materials[row.id]=100000;
      g.resources.gold=100000000;
      const pick=a=>a.length?a[Math.floor(rng()*a.length)]:null;
      const parts=['weapon','armor','helmet','gloves','boots','ring','amulet'];
      const trace=[];
      for(let step=0;step<500&&!failures.length;step++) {
        const act=Math.floor(rng()*14),h=pick(g.heroes),where=pick(['bag','stash']),uid=pick(where==='bag'?g.bags.flat():g.stash);
        let result;
        if(act===0) {
          const part=pick(parts),level=pick(game.makeLevels(g).filter(x=>x.open)).level,s=game.makeState(g,part,level);
          if(s)result=game.makeItem(g,part,level,pick(s.kinds)?.id);
        }
        if(act===1&&uid)result=game.equip(g,h.uid,uid);
        if(act===2)result=game.unequip(g,h.uid,pick(Object.keys(h.equipped)),pick(g.bags.map((_,i)=>i+1)));
        if(act===3&&uid)result=where==='bag'?game.moveToStash(g,uid):game.moveToBag(g,uid,pick(g.bags.map((_,i)=>i+1)));
        if(act===4&&uid)result=game.salvage(g,uid);
        if(act===5&&uid)result=game.setItemLock(g,uid,rng()<0.5);
        if(act===6) { const item=pick(Object.keys(g.items));if(item)result=game.upgradeItem(g,item); }
        if(act===7)result=game.autoEquip(g,h.uid,pick(g.bags.map((_,i)=>i+1)));
        if(act===8) {const s=pick(game.synthState(g).list);if(s)result=game.synthesize(g,s.id,Math.ceil(rng()*10));}
        if(act===9) {const s=game.shopState(g,AT);result=game.shopBuy(g,Math.floor(rng()*s.equip.length),s.list,AT,pick(g.bags.map((_,i)=>i+1)));}
        if(act===10) {game.selectPreset(g,pick(g.presets.map((_,i)=>i+1)));result=game.toggleParty(g,h.uid,AT);}
        if(act===11)result=game.sortStorage(g,where,pick(['rarity','slot','ilvl']));
        if(act===12) {const n=pick(game.masteryState(g,h.uid).nodes);if(n)result=game.learnMastery(g,h.uid,n.id);}
        if(act===13)result=game.resetMastery(g,h.uid);
        steps++;
        trace.push({step,act,result});if(trace.length>12)trace.shift();
        inspect(g,seed,step,act);
        if(failures.length)failures.at(-1).trace=trace;
      }
    }
    out.push({id:'legal-economy-state-sequences',steps,checked,failures});
  }
  return out;
}
