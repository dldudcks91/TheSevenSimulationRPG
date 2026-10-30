async () => {
    const {loadData,buildSystems,D}=await import('/ui/data.js');
    const {makeRng}=await import('/game_logic/rng.js');
    await loadData('/data/');
    const S=buildSystems(D), issues=[],counts={battles:0,events:0,bossSkills:{},calls:0,summons:0,revives:0,exceptions:0,contribMismatch:0,partitionChecks:0};
    const add=(kind,obj)=>{if(issues.filter(x=>x.kind===kind).length<10)issues.push({kind,...obj});};
    const stages=D.stageOrder.filter(id=>D.stages[id].chapter<=5);
    const tier=S.arena.tiers[S.arena.tiers.length-1];
    for(const diff of D.difficultyList)for(const stage of stages)for(let s=1;s<=3;s++){
        const seed=stage*10+s, st=D.stages[stage], level=Math.min(D.balance.hero_level_cap,st[diff.levelCol]+diff.levelAdd);
        // Legal generated level50 party, with extra HP for path coverage in Hell boss rounds.
        const party=S.arena.rollTierOpponent(tier.id,makeRng(seed)).map(p=>({...p,combat:{...p.combat,hp_max:p.combat.hp_max*5}}));
        let r;
        try{r=S.battle.simulate(party,stage,makeRng(seed+90000),level,null,0,diff.id);}catch(e){counts.exceptions++;add('exception',{stage,difficulty:diff.id,seed,error:e.stack});continue;}
        counts.battles++;counts.events+=r.timeline.length;
        if(s===1&&st.stage_num===5){
            const run=S.battle.createRun(party,stage,makeRng(seed+90000),level,null,0,null,diff.id);
            let until=0,step=0;
            while(!run.ended&&step++<100000){until+=0.137+(step%7)*0.19;run.advance(until);if(step%11===0)run.refit(party);}
            counts.partitionChecks++;
            if(JSON.stringify(r)!==JSON.stringify(run.result))add('partition_mismatch',{stage,difficulty:diff.id,seed});
        }
        const seen=new Set(),dealt={},taken={},keyOf=Object.fromEntries(r.party.map(x=>[x.key,x.uid]));
        let n=0;
        for(const e of r.timeline){
            if(e.e==='round'){n=e.n;seen.clear();for(const m of e.enemies)seen.add(m.key);}
            if(e.e==='skill'&&e.s.startsWith('mon_'))counts.bossSkills[e.s]=(counts.bossSkills[e.s]??0)+1;
            if(e.e==='summon')counts.summons++;
            if(e.e==='call'){counts.calls++;for(const m of e.units){if(seen.has(m.key))counts.revives++;seen.add(m.key);}}
            if(['hit','blast','reflect','dot'].includes(e.e)){const v=e.dmg-(e.ov??0)+(e.cull??0);if(keyOf[e.a])dealt[keyOf[e.a]]=(dealt[keyOf[e.a]]??0)+v;if(keyOf[e.d])taken[keyOf[e.d]]=(taken[keyOf[e.d]]??0)+v;}
        }
        for(const c of r.contrib)if(c.dealt!==(dealt[c.uid]??0)||c.taken!==(taken[c.uid]??0)){counts.contribMismatch++;add('contribution_mismatch',{stage,difficulty:diff.id,seed,actual:c,expected:{dealt:dealt[c.uid]??0,taken:taken[c.uid]??0}});}
    }
    return {counts,issues};
}
