async () => {
    const {loadData,buildSystems,D}=await import('/ui/data.js');
    const {makeRng}=await import('/game_logic/rng.js');
    await loadData('/data/');
    const S=buildSystems(D),counts={battles:0,revives:0},samples=[];
    for(const diff of [...D.difficultyList].reverse())for(const stage of [5031,5032,5033])for(let seed=1;seed<=160;seed++){
        const tier=S.arena.tiers[(seed-1)%S.arena.tiers.length];
        const party=S.arena.rollTierOpponent(tier.id,makeRng(stage*10+seed));
        const st=D.stages[stage],level=Math.min(D.balance.hero_level_cap,st[diff.levelCol]+diff.levelAdd);
        const r=S.battle.simulate(party,stage,makeRng(seed+90000),level,null,0,diff.id);
        counts.battles++;
        let round=0,seen=new Set(),roster={},repeated=[];
        for(let i=0;i<r.timeline.length;i++){
            const e=r.timeline[i];
            if(e.e==='round'){round=e.n;seen=new Set();roster=Object.fromEntries(e.enemies.map(m=>[m.key,m.monsterId]));repeated=[];}
            if(e.e==='call')for(const m of e.units){if(seen.has(m.key))counts.revives++;roster[m.key]=m.monsterId;}
            if(e.e==='down'&&[5301,5302,5303].includes(roster[e.u])){
                if(seen.has(e.u))repeated.push({index:i,event:e,monsterId:roster[e.u]});
                seen.add(e.u);
            }
            if(repeated.length){
                samples.push({stage,difficulty:diff.id,seed,partySeed:stage*10+seed,battleSeed:seed+90000,tier:tier.id,round,repeated,party,
                    events:r.timeline.slice(Math.max(0,repeated[0].index-12),repeated[0].index+16),timeline:r.timeline});
                return {counts,samples};
            }
        }
    }
    return {counts,samples};
}
