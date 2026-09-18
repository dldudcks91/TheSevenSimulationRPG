async () => {
  const {D, buildSystems} = await import('/ui/data.js');
  const {makeRng, deriveSeed} = await import('/game_logic/rng.js');
  const {refreshDerived} = await import('/game_logic/skill_effects.js');
  const {SAVE_VERSION} = await import('/game_logic/state.js');
  const S = buildSystems(D), B = D.balance, NOW = 1700000000000;
  const copy = x => structuredClone(x), eq = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const assert = (ok, detail) => {if(!ok) throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));};
  const results=[];
  const test=(name, fn)=>{try{results.push({name,ok:true,detail:fn()});}catch(e){results.push({name,ok:false,detail:e.message,stack:e.stack.split('\n').slice(0,3)});}};
  const fresh = (seed=1, sys=S) => {
    const g=sys.game.newGame(seed,sys.hero.rollStartParty(makeRng(1000+seed),B.party_size_max),NOW);
    for(const h of g.heroes) sys.game.toggleParty(g,h.uid,NOW);
    return g;
  };
  const finite=(x,path='root')=>{
    if(typeof x==='number') assert(Number.isFinite(x),path+' nonfinite '+x);
    else if(Array.isArray(x)) x.forEach((v,i)=>finite(v,`${path}[${i}]`));
    else if(x && typeof x==='object') for(const [k,v] of Object.entries(x)) finite(v,path+'.'+k);
  };
  const invariant=g=>{
    finite(g);
    for(const [k,v] of Object.entries(g.resources)) assert(v>=0,'negative '+k);
    const heroes=new Set(g.heroes.map(h=>h.uid));
    assert(heroes.size===g.heroes.length,'duplicate hero');
    assert(new Set(g.party).size===g.party.length,'duplicate party');
    assert(g.party.every(id=>heroes.has(id)),'dangling party');
    assert(g.bag.length<=B.inventory_cap && g.stash.length<=B.stash_cap,'capacity');
    const ownership=[...g.bag,...g.stash,...g.heroes.flatMap(h=>Object.values(h.equipped).filter(Boolean))];
    assert(ownership.length===new Set(ownership).size,'duplicate ownership');
    assert(ownership.every(id=>g.items[id]),'dangling item');
    assert(Object.keys(g.items).every(id=>ownership.includes(id)),'orphan item');
    for(const h of g.heroes) {
      assert(h.level>=1 && h.level<=B.hero_level_cap,'level range');
      assert(h.xp>=0 && h.masteryPoints>=0,'negative progression');
      const spent=Object.values(h.mastery??{}).reduce((a,b)=>a+b,0);
      assert(spent+h.masteryPoints===(h.level-1)*B.mastery_point_per_level,'mastery conservation');
      finite(S.game.heroCombat(g,h),'combat');
    }
    assert(g.reports.length<=B.report_keep,'report cap');
  };
  test('RNG: 100 seeds x 1000 draws deterministic and [0,1)',()=>{
    for(let seed=0;seed<100;seed++) {const a=makeRng(deriveSeed(seed,5)),b=makeRng(deriveSeed(seed,5)); for(let i=0;i<1000;i++){const v=a();assert(v>=0&&v<1&&v===b(),'seed '+seed);}}
    return 100000;
  });
  test('dependency injection: altered heroTiers must be used',()=>{
    const d=copy(D); d.heroTiers=d.heroTiers.map(t=>({...t,totalMin:70,totalMax:70}));
    const x=buildSystems(d).hero.rollStartParty(makeRng(1001),B.party_size_max);
    const totals=x.map(h=>Object.values(h.stats).reduce((a,b)=>a+b,0));
    assert(totals.every(n=>n===70),{expected:70,actual:totals});return totals;
  });
  test('formula: hand-calculated damage, reductions, negative resistance and RNG counts',()=>{
    const a={atkMin:100,atkMax:100,lvl:10,crit:0,atkType:'physical',skillMult:2,flat:10};
    let calls=0; const rng=()=>{calls++;return 0.1;};
    const d={lvl:10,def:B.def_curve_k,dr:0.2,res:{fire:-0.25}};
    assert(S.formula.strike(rng,a,d).dmg===84,'physical 210*0.5*0.8=84');assert(calls===3,'hit RNG');
    assert(S.formula.strike(rng,{...a,atkType:'fire'},d).dmg===210,'fire 210*1.25*0.8=210');
    assert(Math.abs(S.formula.reductionMult([0.2,0.3])-0.56)<1e-12,'multiplication');
    calls=0;const miss=S.formula.strike(()=>{calls++;return 0.999999;},{...a,lvl:1},{...d,lvl:80});
    assert(!miss.hit&&calls===1,'miss consumes one'); return {physical:84,fire:210};
  });
  test('skill damage reduction composes multiplicatively with equipment/mastery',()=>{
    const g=fresh(),h=g.heroes[0], c=S.game.heroCombat(g,h);
    const u=S.battle.makeEnemy('probe',1101,'normal',1,[]);
    u.drBase=0.2;u.dr=0.2;u.buffs={a:{stat:'dr_pct',v:0.3,until:10}};
    refreshDerived(u);
    assert(Math.abs(u.dr-0.44)<1e-12,{expected:0.44,actual:u.dr});
  });
  test('generation: 500 parties, tiers, skill ownership, attributes and fresh ownership',()=>{
    for(let seed=1;seed<=500;seed++){
      const g=fresh(seed);invariant(g);
      for(const h of g.heroes){const tier=D.heroTiers.find(t=>t.id===h.tier), total=Object.values(h.stats).reduce((a,b)=>a+b,0);
        assert(total>=tier.totalMin && total<=tier.totalMax,'tier total');
        assert(Object.values(h.stats).every(v=>Number.isInteger(v)&&v>=B.hero_attr_min&&v<=B.hero_attr_max),'attributes');
        assert(S.skill.defs[h.innate].ownerId===h.cls,'innate owner');
      }
    }return {parties:500};
  });
  test('all levels: combat and item growth finite, HP and weapon damage monotonic',()=>{
    const g=fresh();let count=0;
    for(const h of g.heroes){let hp=0;for(let level=1;level<=B.hero_level_cap;level++){
      const c=S.hero.computeCombat({...h,level},S.game.heroItems(g,h).map(S.item.effective)); finite(c);assert(c.hp_max>=hp,'HP decreases');hp=c.hp_max;count++;
    }}
    for(const group of D.weaponGroupList){let last=0;for(let level=1;level<=120;level++){const v=S.formula.weaponDamage(level,group);assert(v.min>=last&&v.max>=v.min,'weapon decreases');last=v.min;count++;}}
    return count;
  });
  test('all gear slots x 120 levels: generated gear/effects finite and known skill references',()=>{
    let count=0;const rng=makeRng(20260918),g=fresh();
    for(let level=1;level<=120;level++)for(const slot of D.slots){
      for(let n=0;n<3;n++){
        const it=S.item.rollGear(rng,{slots:[slot.id],ilvl:level})[0];finite(it);assert(it.slot===slot.id,'slot');
        if(it.skill) assert(S.skill.defs[it.skill],'unknown skill');
        if(it.implicit) assert(it.implicit.v>=1,'defense');
        assert(new Set(it.sins).size===it.sins.length,'sin duplicate');
        finite(S.hero.computeCombat({...g.heroes[0],level:Math.min(level,B.hero_level_cap)},[S.item.effective(it)]));count++;
      }
    }return count;
  });
  test('save roundtrip: 100 seeds, no mutation and stable serialization',()=>{
    for(let seed=1;seed<=100;seed++) {const g=fresh(seed),before=JSON.stringify(g),a=S.game.serialize(g,NOW),b=S.game.deserialize(a);assert(JSON.stringify(g)===before,'serialize mutated');assert(eq(a,S.game.serialize(b,NOW)),'roundtrip');invariant(b);}
    return 100;
  });
  for(const [label,change] of [
    ['missing party reference',g=>g.party.push('missingHero')],
    ['duplicate item ownership',g=>g.bag.push(g.heroes[0].equipped.weapon)],
    ['invalid level',g=>g.heroes[0].level=B.hero_level_cap+1],
    ['missing resources',g=>delete g.resources]
  ]) test('save validation: reject '+label,()=>{
    const g=fresh();change(g);assert(!S.game.canLoad(g),'canLoad returned true');
  });
  test('all 35 stages x 10 seeds: full timeline determinism, references, finite values, settlement',()=>{
    let runs=0, events=0, calls=0; const verdicts={};
    for(const stage of D.stageOrder)for(let seed=1;seed<=10;seed++) {
      const g=fresh(seed);g.progress.cleared=D.stageOrder.slice();const g2=copy(g);
      const r=S.game.resolveBattle(g,stage,NOW),r2=S.game.resolveBattle(g2,stage,NOW);
      assert(r.ok&&r2.ok,'depart '+stage);assert(eq(r,r2),'nondeterministic '+stage+'/'+seed);invariant(g);
      finite(r.result,'result');let time=-1,known=new Set(r.result.party.map(p=>p.key));
      for(const ev of r.result.timeline){
        assert(ev.t>=time,'timeline time reversed '+stage);time=ev.t;
        if(ev.e==='round'){known=new Set(r.result.party.map(p=>p.key));for(const e of ev.enemies)known.add(e.key);}
        if(ev.e==='call'){calls++;for(const e of ev.units)known.add(e.key);}
        if(ev.e==='summon')known.add(ev.d);
        for(const key of ['u','a','d']) if(ev[key]) assert(known.has(ev[key]),'unknown '+key+' '+ev[key]+' in '+ev.e);
        if(ev.dhp!==undefined)assert(ev.dhp>=0,'negative HP');events++;
      }
      assert(g.resources.gold===B.start_gold+r.report.gold,'gold settlement');
      const saved=S.game.serialize(g,NOW);assert(eq(saved,S.game.serialize(S.game.deserialize(saved),NOW)),'postcombat roundtrip');
      verdicts[r.report.reason]=(verdicts[r.report.reason]??0)+1;runs++;
    }return {runs,events,calls,verdicts};
  });
  test('run boundaries: departure no reward, closure idempotent, old handle rejected',()=>{
    for(let seed=1;seed<=50;seed++) {
      const g=fresh(seed),resources=copy(g.resources),r=S.game.departRun(g,101,NOW);
      assert(eq(resources,g.resources),'departure reward');
      const replacement=S.game.departRun(g,101,NOW+1);
      assert(!S.game.advanceRun(g,r.run,NOW+2).ok,'old handle accepted');
      S.game.closeRun(g,NOW+2);const before=JSON.stringify(g);
      assert(!S.game.advanceRun(g,replacement.run,NOW+3).ok,'closed handle accepted');
      S.game.closeRun(g,NOW+4);assert(JSON.stringify(g)===before,'close not idempotent');invariant(g);
    }return 50;
  });
  test('stateful action sequences: 30 seeds x 200 actions preserve ownership/resources/failure atomicity',()=>{
    let actions=0,failures=0;
    for(let seed=1;seed<=30;seed++){
      let g=fresh(seed);g.resources.gold=100000;g.resources.dust=10000;
      for(const b of S.game.makeBands()){g.materials[b.ore]=10000;g.materials[b.timber]=10000;}
      const rng=makeRng(seed*99),pick=a=>a[Math.floor(rng()*a.length)];
      for(let step=0;step<200;step++){
        const h=pick(g.heroes),bag=pick(g.bag)??'absent',stash=pick(g.stash)??'absent';
        const ops=[()=>S.game.equip(g,h.uid,bag),()=>S.game.unequip(g,h.uid,pick(D.equipSlots).id),
          ()=>S.game.moveToStash(g,bag),()=>S.game.moveToBag(g,stash),()=>S.game.salvage(g,bag),
          ()=>S.game.upgradeItem(g,pick(Object.keys(g.items))),()=>S.game.hire(g,Math.floor(rng()*B.tavern_candidates)),
          ()=>S.game.tavernReroll(g,NOW+step*1000),()=>S.game.toggleParty(g,h.uid,NOW),
          ()=>S.game.learnMastery(g,h.uid,pick(S.hero.masteryNodesFor(h)).id),()=>S.game.resetMastery(g,h.uid),
          ()=>S.game.rerollTactic(g,1),()=>S.game.makeItem(g,pick(D.slots).id,pick(S.game.makeBands()).band),
          ()=>S.game.dismiss(g,h.uid),()=>S.game.searchSend(g,h.uid,NOW),()=>S.game.searchDrop(g),
          ()=>S.game.resolveBattle(g,101,NOW+step*1000)];
        const op=pick(ops),before=JSON.stringify(g),r=op();
        if(r?.ok===false){failures++;assert(before===JSON.stringify(g),'failure changed state seed '+seed+' step '+step+' '+JSON.stringify(r));}
        invariant(g); if(step%25===0)g=S.game.deserialize(S.game.serialize(g,NOW));actions++;
      }
    }return {actions,failures};
  });
  test('search: snapshots, answer boundaries, one-time hire, resource conservation',()=>{
    for(let seed=1;seed<=30;seed++){
      const g=fresh(seed),h=g.heroes[0];S.game.toggleParty(g,h.uid,NOW);g.resources.gold=100000;
      assert(S.game.searchSend(g,h.uid,NOW).ok,'send');const early=copy(g);
      assert(!S.game.searchTake(g,NOW).ok&&eq(g,early),'early take');
      const end=NOW+B.tavern_search_hours*3600000,v=S.game.searchState(g,end);
      const loaded=S.game.deserialize(S.game.serialize(g,NOW));assert(eq(v,S.game.searchState(loaded,end)),'search replay');
      const before=g.resources.gold,count=g.heroes.length;
      const r=S.game.searchTake(g,end);assert(r.ok&&g.heroes.length===count+1,'take');
      assert(before-g.resources.gold===v.cost,'search cost');const once=copy(g);
      assert(!S.game.searchTake(g,end).ok&&eq(g,once),'repeat take');invariant(g);
    }return 30;
  });
  return {passed:results.filter(r=>r.ok).length,total:results.length,results};
}
