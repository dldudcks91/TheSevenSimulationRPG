async () => {
    const {loadData,buildSystems,D}=await import('/ui/data.js');
    const {makeRng}=await import('/game_logic/rng.js');
    await loadData('/data/');
    const S=buildSystems(D), issues=[], counts={battles:0,determinism:0,events:0,skills:{},exceptions:0,lateHits:0,contributionMismatch:0,counterDuringChannel:0};
    const add=(kind,obj)=>{if(issues.filter(x=>x.kind===kind).length<12)issues.push({kind,...obj});};
    const invalidNumber=o=>{
        if(typeof o==='number')return !Number.isFinite(o);
        return o&&typeof o==='object'&&Object.values(o).some(invalidNumber);
    };
    for(let seed=1;seed<=600;seed++){
        const tier=S.arena.tiers[(seed-1)%S.arena.tiers.length];
        const party=S.arena.rollTierOpponent(tier.id,makeRng(seed*2));
        const enemy=S.arena.rollTierOpponent(tier.id,makeRng(seed*2+1));
        const before=JSON.stringify([party,enemy]);
        let result;
        try{result=S.battle.simulateTeams(party,enemy,makeRng(10000+seed));}catch(e){counts.exceptions++;add('exception',{seed,tier:tier.id,error:e.stack});continue;}
        counts.battles++;counts.events+=result.timeline.length;
        if(JSON.stringify([party,enemy])!==before)add('input_mutation',{seed,tier:tier.id});
        if(invalidNumber(result))add('nonfinite',{seed,tier:tier.id});
        if(seed<=30){counts.determinism++;const again=S.battle.simulateTeams(party,enemy,makeRng(10000+seed));if(JSON.stringify(result)!==JSON.stringify(again))add('nondeterminism',{seed,tier:tier.id});}
        const hp={},dealt={},taken={},channels={};
        for(const x of result.party)hp[x.key]=x.hpMax;
        const keyOf=Object.fromEntries(result.party.map(x=>[x.key,x.uid]));
        for(const e of result.timeline){
            if(e.e==='round')for(const x of e.enemies)hp[x.key]=x.hpMax;
            if(e.e==='call')for(const x of e.units)hp[x.key]=x.hpMax;
            if(e.e==='summon')hp[e.d]=e.hpMax;
            if(e.e==='skill'){counts.skills[e.s]=(counts.skills[e.s]??0)+1;if(e.chan)channels[e.u]={t:e.t,s:e.s};}
            if(e.e==='chanEnd'||e.e==='down')delete channels[e.u];
            if(e.e==='counter'&&channels[e.u]){counts.counterDuringChannel++;add('counter_during_channel',{seed,tier:tier.id,start:channels[e.u],event:e});}
            if(['hit','blast','dot','reflect'].includes(e.e)){
                if(hp[e.d]<=0){counts.lateHits++;add('hit_dead_target',{seed,tier:tier.id,event:e});}
                const real=e.dmg-(e.ov??0)+(e.cull??0),a=keyOf[e.a],d=keyOf[e.d];
                if(a)dealt[a]=(dealt[a]??0)+real;if(d)taken[d]=(taken[d]??0)+real;
                if(e.dhp!==undefined)hp[e.d]=e.dhp;
                if(e.ahp!==undefined)hp[e.e==='reflect'?e.d:e.a]=e.ahp;
            }
            if(e.e==='down')hp[e.u]=0;
            if(e.e==='heal')hp[e.d]=e.dhp;
            if(['buff','buffEnd','refit','regen','potion','pay','swarmEnd'].includes(e.e)&&e.dhp!==undefined)hp[e.u]=e.dhp;
        }
        for(const c of result.contrib){if(c.dealt!==(dealt[c.uid]??0)||c.taken!==(taken[c.uid]??0)){counts.contributionMismatch++;add('contribution_mismatch',{seed,tier:tier.id,actual:c,expected:{dealt:dealt[c.uid]??0,taken:taken[c.uid]??0}});}}
    }
    return {counts,issues};
}
