"""Apply observable, legal farming alternatives to an experiment entry."""
def transform(source):
    old='if(c.farm)id=null;'
    assert source.count(old)==1
    source=source.replace(old,'if(c.farm&&!window.__qaVariant.farmPotions)id=null;')
    a=source.index('function farmStart(c,target,t){')
    b=source.index('function afterLoss(c,t,R,stage){')
    replacement='''function farmStart(c,target,t){
    const earlier=D.stageOrder.filter(id=>id<target&&id<BOSS&&Q.stageCleared(c.G,id,'normal'));
    const mode=window.__qaVariant.farmMode??'place';
    if(mode!=='place'){
        const eligible=earlier.filter(id=>D.stages[id].cell!==3);
        let start=eligible.at(-1)??earlier.at(-1);
        if(mode==='xp'){
            const choices=eligible.map(stage=>{
                const rows=c.runs.filter(r=>r.won&&r.stage===stage).slice(-3);
                const seconds=sum(rows.map(r=>r.wallSec));
                return{stage,score:seconds?sum(rows.map(r=>r.minHeroXp??r.xp))/seconds:-1};
            }).sort((a,b)=>b.score-a.score||b.stage-a.stage);
            if(choices[0]?.score>=0)start=choices[0].stage;
        }
        if(start==null)return false;
        c.farm={stage:start,target,wins:0,attempts:0,failed:0,repeat:false};
        c.count.guideResponses++;action(c,'farmResponse',t,{stage:start,target,mode});return true;
    }
    const previous=earlier.filter(id=>Math.floor(id/10)<Math.floor(target/10));
    const last=previous.at(-1),start=last==null?earlier[0]:Math.floor(last/10)*10+1;
    if(start==null)return false;
    c.farm={stage:start,target,wins:0,attempts:0,failed:0,repeat:last!=null};
    c.count.guideResponses++;action(c,'farmResponse',t,{stage:start,target,repeat:c.farm.repeat});return true;
}
'''
    source=source[:a]+replacement+source[b:]
    old="""if(!R.won){
                            const lower=Math.floor(c.farm.stage/10)*10-9;
                            if(lower>=1011&&Q.stageCleared(G,lower,'normal')){c.farm.stage=lower;c.farm.repeat=true;pending={stageId:lower,difficulty:'normal',at:restart,from:null};}
                        }"""
    assert source.count(old)==1
    new="""c.farm.failed=R.won?0:(c.farm.failed??0)+1;
                        if(!R.won&&c.farm.failed>=(window.__qaVariant.dropLosses??1)){
                            const mode=window.__qaVariant.farmMode??'place';
                            const pool=D.stageOrder.filter(id=>id<c.farm.stage&&D.stages[id].cell!==3&&Q.stageCleared(G,id,'normal'));
                            const lower=mode==='place'?Math.floor(c.farm.stage/10)*10-9:pool.at(-1);
                            if(lower>=1011&&Q.stageCleared(G,lower,'normal')){c.farm.stage=lower;c.farm.repeat=mode==='place';c.farm.failed=0;pending={stageId:lower,difficulty:'normal',at:restart,from:null};}
                        }"""
    source=source.replace(old,new)
    old='xp:sum(Object.values(R.xp)),gold:R.gold'
    assert source.count(old)==1
    return source.replace(old,'xp:sum(Object.values(R.xp)),minHeroXp:Math.min(...party(G).map(h=>R.xp[h.uid]??0)),gold:R.gold')
