import {S,D} from '/general_cases.js';
import {makeRng} from '/game_logic/rng.js';

export function batch(firstSeed=1,nSeeds=1) {
    const out={runs:0,events:0,failures:[],skills:[],monsters:[],stages:[],difficulties:[],determinismChecks:0};
    const skills=new Set(), monsters=new Set(), stages=new Set(), diffs=new Set();
    const interesting=['t','dmg','hp','amt','max','dhp','hpMax','action_period'];
    for(let seed=firstSeed;seed<firstSeed+nSeeds;seed++) {
        const tier=S.arena.tiers[(seed-1)%S.arena.tiers.length];
        const team=S.arena.rollTierOpponent(tier.id,makeRng(10000+seed));
        const before=JSON.stringify(team);
        for(const stageId of D.stageOrder.filter(id=>D.stages[id].chapter<=5)) {
            for(const diff of D.difficultyList) {
                try {
                    const r=S.battle.simulate(team,stageId,makeRng(seed),undefined,null,0,diff.id);
                    out.runs++; out.events+=r.timeline.length; stages.add(stageId); diffs.add(diff.id);
                    let last=-Infinity;
                    for(const [i,e] of r.timeline.entries()) {
                        if(e.s)skills.add(e.s);
                        if(e.e==='round')for(const u of e.enemies??[])if(u.monsterId)monsters.add(u.monsterId);
                        for(const k of interesting)if(typeof e[k]==='number'&&!Number.isFinite(e[k]))out.failures.push({seed,stageId,diff:diff.id,kind:'nonfinite',index:i,key:k,event:e});
                        if(e.dhp<0)out.failures.push({seed,stageId,diff:diff.id,kind:'negative_hp',index:i,event:e});
                        if(typeof e.t==='number') {
                            if(e.t<last-1e-8)out.failures.push({seed,stageId,diff:diff.id,kind:'time_reversal',index:i,previous:last,event:e});
                            last=e.t;
                        }
                    }
                    if(!Number.isFinite(r.durationSec))out.failures.push({seed,stageId,diff:diff.id,kind:'duration',duration:r.durationSec});
                    if(JSON.stringify(team)!==before)out.failures.push({seed,stageId,diff:diff.id,kind:'mutated_input'});
                    // One-shot and interrupted stepping must consume the same RNG stream.
                    if(stageId%10===1 && seed%2===0 && diff.id===D.difficultyList[0].id) {
                        const run=S.battle.createRun(team,stageId,makeRng(seed),undefined,null,0,null,diff.id);
                        for(let t=0;!run.ended&&t<2000;t+=0.7)run.advance(t);
                        out.determinismChecks++;
                        if(!run.ended||JSON.stringify(run.result)!==JSON.stringify(r))out.failures.push({seed,stageId,diff:diff.id,kind:'chunked_mismatch',ended:run.ended});
                    }
                }catch(e){out.failures.push({seed,stageId,diff:diff.id,kind:'exception',error:String(e),stack:e.stack});}
            }
        }
    }
    out.skills=[...skills];out.monsters=[...monsters];out.stages=[...stages];out.difficulties=[...diffs];
    return out;
}
