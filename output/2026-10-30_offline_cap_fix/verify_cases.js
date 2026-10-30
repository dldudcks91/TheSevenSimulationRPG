/* Independent arithmetic/control tests; artificial late-lab fixtures, not progression claims. */
export async function verify() {
    const {loadData,buildSystems,D}=await import('/ui/data.js');
    const {makeRng}=await import('/game_logic/rng.js');
    await loadData('/data/');
    const SYS=buildSystems(D),game=SYS.game,B=D.balance,HOUR=3600000,AT=1700000000000;
    const cap=B.dispatch_offline_cap_hours*HOUR;
    const checks=[];
    const check=(name,actual,expected)=>checks.push({name,ok:JSON.stringify(actual)===JSON.stringify(expected),actual,expected});
    const clone=g=>game.deserialize(game.serialize(g,AT));
    const tuple=g=>({resources:{...g.materials},gold:g.resources.gold,trainee:g.heroes.at(-1) && {level:g.heroes.at(-1).level,xp:g.heroes.at(-1).xp},carry:g.labClock.train?.carry});
    const fixture=()=>{
        const g=game.newGame(42,SYS.hero.rollStartParty(makeRng(42),B.party_size_max),AT);
        Object.assign(g.buildings,{storage:1,resource:4,tavern:3});
        g.resources.gold=100000000;
        for(const row of D.labMaterials)g.materials[row.id]=100000000;
        for(const h of g.heroes)for(const k of ['str','agi','int','vit','luck','ldr','cha'])h.stats[k]=0;
        g.heroes[0].level=30;g.heroes[0].xp=0;
        g.heroes.at(-1).level=1;g.heroes.at(-1).xp=0;
        game.labSettle(g,AT);
        const reg=game.labRegister(g,g.heroes.at(-1).uid,'train',AT);
        if(!reg.ok)throw Error('fixture train registration '+JSON.stringify(reg));
        return g;
    };
    const snapshot=g=>JSON.parse(JSON.stringify(g));
    for(const hrs of [5,24]) {
        const base=fixture(),control=clone(base),researched=clone(base);
        const start=game.labResearchStart(researched,'res','seats',AT);
        if(!start.ok)throw Error('fixture seats '+JSON.stringify(start));
        // Remove the already-paid cost from the control: compare gains rather than initial wallets.
        control.resources.gold=researched.resources.gold;
        game.labSettle(control,AT+cap);
        const result=game.labSettle(researched,AT+hrs*HOUR);
        check(`seats/${hrs}h materials-gold-training`,tuple(researched),tuple(control));
        check(`seats/${hrs}h research completed`,{level:researched.labNodes['res:seats'],research:researched.labResearch},{level:1,research:null});
        check(`seats/${hrs}h production clocks advanced`,researched.resourceProduction.map(c=>c.at),D.labMaterials.map(()=>AT+hrs*HOUR));
        check(`seats/${hrs}h gamble/train clocks advanced`,[researched.labClock.gamble.at,researched.labClock.train.at],[AT+hrs*HOUR,AT+hrs*HOUR]);
        const once=tuple(researched);
        game.labSettle(researched,AT+hrs*HOUR);
        check(`seats/${hrs}h idempotent`,tuple(researched),once);
        checks.at(-1).settlement=result;
    }
    for(const hrs of [5,24]) {
        const g=fixture(),before=snapshot(g.materials);
        const start=game.labResearchStart(g,'res','mine',AT);
        if(!start.ok)throw Error('fixture mine '+JSON.stringify(start));
        const paid=g.labResearch.paid;
        const old=D.labNodes.find(n=>n.line==='res'&&n.node==='mine');
        game.labSettle(g,AT+hrs*HOUR);
        const dur=Math.min(cap,start.until-AT)/HOUR;
        for(const row of D.labMaterials) {
            const rate=row.yieldPerHour;
            const want=Math.floor((row.post==='mine'?rate*(old.base*dur+(old.base+old.perLv)*(cap/HOUR-dur)):rate*cap/HOUR)+1e-9);
            const cost=paid.mat?.id===row.id?paid.mat.n:0;
            check(`rate-upgrade/${hrs}h/${row.post}`,g.materials[row.id]-before[row.id]+cost,want);
        }
    }
    for(const hrs of [5,24]) {
        const base=fixture();base.labNodes['res:mine']=9;
        const control=clone(base),g=clone(base),before=snapshot(g.materials);
        const start=game.labResearchStart(g,'res','mine',AT);
        if(!start.ok||!(start.until>AT+cap&&start.until<AT+hrs*HOUR))throw Error('fixture long research '+JSON.stringify(start));
        control.resources.gold=g.resources.gold;control.materials={...g.materials};
        game.labSettle(control,AT+cap);
        game.labSettle(g,AT+hrs*HOUR);
        check(`late-research/${hrs}h capped gains`,tuple(g),tuple(control));
        check(`late-research/${hrs}h completes on wall time`,{mine:g.labNodes['res:mine'],research:g.labResearch},{mine:10,research:null});
        const beforeResume=snapshot(g.materials);
        game.labSettle(g,AT+(hrs+1)*HOUR);
        const mine=D.labMaterials.find(m=>m.post==='mine'),node=D.labNodes.find(n=>n.line==='res'&&n.node==='mine');
        check(`late-research/${hrs}h next hour new rate`,g.materials[mine.id]-beforeResume[mine.id],Math.floor(mine.yieldPerHour*(node.base+10*node.perLv)+1e-9));
    }
    {
        const g=fixture();g.labNodes['visit:interval']=1;g.labNodes['visit:waiting']=4;
        const interval=B.visit_hours*HOUR;
        g.visit={nextAt:AT+interval,left:null};
        const control=clone(g);
        const start=game.labResearchStart(g,'res','seats',AT);
        if(!start.ok)throw Error('visit fixture seats');
        game.visitSettle(control,AT+24*HOUR);
        game.labSettle(g,AT+24*HOUR);
        check('visit remains uncapped across research split',g.joins.map(j=>({at:j.arrivedAt,src:j.src})),control.joins.map(j=>({at:j.arrivedAt,src:j.src})));
        check('visit has arrivals beyond production cap',g.joins.some(j=>j.arrivedAt>AT+cap),true);
    }
    for(const hrs of [5,24]) {
        const g=fixture(),control=clone(g);
        const start=game.labResearchStart(g,'res','seats',AT);
        if(!start.ok)throw Error('online fixture seats');
        control.resources.gold=g.resources.gold;
        for(let m=1;m<=hrs*60;m++) {
            game.labSettle(g,AT+m*60000);
            game.labSettle(control,AT+m*60000);
        }
        check(`online/${hrs}h all gains uncapped`,tuple(g),tuple(control));
        const row=D.labMaterials[0];
        check(`online/${hrs}h full resource hours`,g.materials[row.id]-100000000,Math.floor(row.yieldPerHour*hrs+1e-9));
    }
    return {capHours:B.dispatch_offline_cap_hours,at:AT,checks,passed:checks.filter(x=>x.ok).length,total:checks.length};
}
