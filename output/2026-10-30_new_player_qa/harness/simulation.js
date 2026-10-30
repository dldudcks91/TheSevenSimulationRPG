import { loadData, buildSystems, D } from '/ui/data.js';
import { makeRng } from '/game_logic/rng.js';
import { paceAt, paceStep, paceCfg } from '/ui/pace.js';

await loadData('/data/');
const SYS = buildSystems(D), Q = SYS.game;
const START = Date.UTC(2026, 9, 30, 0, 0, 0), cfg = paceCfg('off', true, 1, 1);
const rnd = n => Math.round(n * 1000) / 1000;
const avg = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0;
const party = G => Q.partyOf(G).map(uid=>Q.heroById(G,uid));
const ARMOR = ['helmet','armor','gloves','boots'];
const bad = [];
function invariant(G, t) {
    const errors = [];
    for (const [k,n] of Object.entries(G.resources)) if (!Number.isFinite(n)||n<0) errors.push(`resource:${k}:${n}`);
    for (const [k,n] of Object.entries(G.materials)) if (!Number.isFinite(n)||n<0) errors.push(`material:${k}:${n}`);
    const seen = [];
    for (const [n, bag] of G.bags.entries()) {
        if(bag.length>Q.limitsOf(G).bag)errors.push(`bag cap ${n}`);
        seen.push(...bag);
    }
    seen.push(...G.stash);
    for(const h of G.heroes)seen.push(...Object.values(h.equipped).filter(Boolean));
    if(new Set(seen).size!==seen.length)errors.push('duplicate item holder');
    for(const uid of seen)if(!G.items[uid])errors.push(`missing item:${uid}`);
    for(const h of G.heroes)if(h.level<1||h.level>D.balance.hero_level_cap)errors.push(`level:${h.uid}:${h.level}`);
    return errors.map(error=>({t,error}));
}
function manage(G, t, log, counters) {
    const now = START + t*1000;
    const act = (kind, detail) => { counters[kind]=(counters[kind]??0)+1; if(log.length<5000) log.push({t:rnd(t),kind,...detail}); };
    Q.claimAllMail(G);
    for(let guard=0;guard<100;guard++){
        const uid=G.bags.flat().find(u=>G.items[u]?.box); if(uid==null)break;
        const kind=G.items[uid].box.kind;
        const hs=party(G), val=h=>kind==='weapon'?(G.items[h.equipped.weapon]?.ilvl??0):avg(ARMOR.map(p=>G.items[h.equipped[p]]?.ilvl??0));
        const h=hs.reduce((a,b)=>val(b)<val(a)?b:a);
        const result=Q.openBox(G,uid,h.uid); if(!result.ok){act('boxFailure',{error:result.err});break;} act('box',{hero:h.uid});
    }
    for(const h of party(G)){
        const a=Q.autoEquip(G,h.uid,1); if(a.changes?.length)act('autoEquip',{hero:h.uid,n:a.changes.length});
        for(const pos of ['amulet','ring1','ring2']){
            const p=pos==='amulet'?'amulet':'ring';
            const rank=i=>(i?.ilvl??0)*10+({normal:0,magic:1,rare:2,epic:3,legendary:4,unique:5,set:5}[i?.rarity]??0);
            const candidates=G.bags[0].map(u=>G.items[u]).filter(i=>i&&!i.box&&i.slot===p&&!SYS.item.canEquip(h,i)).sort((a,b)=>rank(b)-rank(a));
            if(candidates[0]&&rank(candidates[0])>rank(G.items[h.equipped[pos]])){
                const r=Q.equip(G,h.uid,candidates[0].uid,pos); if(r.ok)act('accessory',{hero:h.uid});
            }
        }
        for(let guard=0;guard<100;guard++){
            const n=Q.masteryState(G,h.uid)?.nodes.find(x=>x.canLearn); if(!n)break;
            if(!Q.learnMastery(G,h.uid,n.id).ok)break; act('mastery',{hero:h.uid,node:n.id});
        }
    }
    for(const uid of G.bags.flat()){
        const i=G.items[uid]; if(!i||i.box||i.locked)continue;
        const r=Q.salvage(G,uid); if(r.ok)act('salvage',{});
    }
    // Legal construction only. One pass per minute; prerequisite chains can finish next minute.
    for(const id of ['shop','tavern','forge','storage','explore','command','resource','library']){
        const st=Q.constructionState(G).buildings.find(x=>x.id===id);
        if(st&&!st.next.err){const r=Q.construct(G,id,now);if(r.ok)act('construct',{id,rank:r.rank});}
    }
    // Resource registration is compatible with expedition duty. Keep the chosen hero fixed.
    const lab=Q.labState(G,now), res=lab.lines.find(x=>x.line==='res');
    if(res?.open&&res.seats.uids.length<res.seats.cap){
        const h=G.heroes.filter(h=>!Q.labRegOf(G,h.uid)).sort((a,b)=>b.stats.str-a.stats.str)[0];
        if(h&&Q.labRegister(G,h.uid,'res',now).ok)act('register',{hero:h.uid});
    }
    const visit=lab.lines.find(x=>x.line==='visit');
    if(!G.labResearch&&visit?.open&&!G.labNodes['visit:interval']){
        const r=Q.labResearchStart(G,'visit','interval',now);if(r.ok)act('research',{line:'visit',node:'interval'});
    }
    Q.commissionFill(G);
    for(const c of Q.commissionState(G).cards)if(c.taken&&c.done){const r=Q.commissionClaim(G,c.no);if(r.ok)act('commissionClaim',{no:c.no,gold:r.gold});}
    Q.commissionFill(G);
    for(const c of Q.commissionState(G).cards)if(c.canTake&&Q.commissionTake(G,c.no).ok)act('commissionTake',{no:c.no});
    // Keep a small stock of the first potion tier, rather than spending all gold.
    if(Q.hasFeature(G,'shop'))for(const p of Q.shopState(G,now).potions??[]){
        if(p.tier!==1)continue;
        while((G.potions[p.id]??0)<10){const r=Q.shopPotionBuy(G,p.id,1);if(!r.ok)break;act('potion',{id:p.id});}
    }
    // Upgrade actually worn gear, pay normal prices and respect failures; cap policy at +3.
    for(const h of party(G))for(const pos of ['weapon','armor','helmet','gloves','boots']){
        const uid=h.equipped[pos], it=G.items[uid];
        if(!it||it.up>=3)continue;const u=Q.upgradeState(G,uid);
        if(u?.canUpgrade){const r=Q.upgradeItem(G,uid);if(r.ok)act('upgrade',{hero:h.uid,pos,up:r.up});}
    }
}
function snapshot(G,t,current,stats){
    const hs=party(G), worn=hs.flatMap(h=>Object.values(h.equipped).filter(Boolean).map(u=>G.items[u]).filter(Boolean));
    return {seconds:t,stage:current?.stageId??G.runs[0]?.stageId,difficulty:G.difficulty,classes:hs.map(h=>h.cls),levels:hs.map(h=>h.level),xp:hs.map(h=>h.xp),freeMastery:hs.map(h=>h.masteryPoints),cleared:[...G.progress.cleared],clearedIn:JSON.parse(JSON.stringify(G.progress.clearedIn)),gold:G.resources.gold,materials:{...G.materials},potions:{...G.potions},bags:G.bags.map(b=>b.length),bagCap:Q.limitsOf(G).bag,mail:G.mail.length,books:G.books,blueprints:G.blueprints,buildings:{...G.buildings},gear:{n:worn.length,ilvl:rnd(avg(worn.map(i=>i.ilvl??0))),weaponIlvl:hs.map(h=>G.items[h.equipped.weapon]?.ilvl??0),upTotal:worn.reduce((s,i)=>s+(i.up??0),0)},labNodes:{...G.labNodes},joins:G.joins.length,commission:Q.commissionState(G),...JSON.parse(JSON.stringify(stats))};
}
window.runQA=async function(seed,policy,save){
    const began=performance.now(), G=Q.newGame(seed,SYS.hero.rollStartParty(makeRng(1000+seed),D.balance.party_size_max),START);
    const stats={runs:0,wins:0,losses:0,timeouts:0,downed:0,overflow:0,firstOverflow:null,firstBagFull:null,maxBag:0,actions:{},departErrors:[],violations:[]};
    const checkpoints=[],clears=[],log=[],stages={};let t=0,run=null,p=null,pending=null,nextMinute=0,lastEnd=0;
    let failureStreak=0,failedKey=null,farming=null;
    Q.labSettle(G,START);
    for(const mark of [600,3600,86400]){
        while(t<mark-1e-7){
            if(t>=nextMinute-1e-7){
                Q.labSettle(G,START+t*1000);
                if(policy!=='passive')manage(G,t,log,stats.actions);
                stats.violations.push(...invariant(G,rnd(t)));
                nextMinute+=60;
            }
            const stop=Math.min(mark,nextMinute);
            if(!run){
                const stageId=pending?.stageId??D.stageOrder[0], at=pending?.at??START;
                if(START+stop*1000<at){t=stop;continue;}
                t=Math.max(t,(at-START)/1000);
                const d=Q.departRun(G,stageId,START+t*1000,1,pending?.from??null,pending?.difficulty??'normal');
                if(!d.ok){stats.departErrors.push({t:rnd(t),stageId,error:d.err});t=stop;pending=null;continue;}
                run=d.run;p=paceAt(run.result.timeline,0);pending=null;
            }
            if(t>=stop-1e-7)continue;
            const before=new Set(G.progress.cleared), oldOverflow=run.report.discarded;
            const left=paceStep(p,run.result.timeline,(stop-t)*1000,cfg,s=>Q.stepRun(G,run,s));
            const used=(stop-t)*1000-left;t+=used/1000;
            Q.addExpTime(G,Math.max(0,p.t-(run.__lastP??0))*1000);run.__lastP=p.t;
            stats.maxBag=Math.max(stats.maxBag,G.bags[0].length);
            if(G.bags[0].length>=Q.limitsOf(G).bag&&stats.firstBagFull===null)stats.firstBagFull=rnd(t);
            const delta=run.report.discarded-oldOverflow;stats.overflow+=delta;
            if(delta>0&&stats.firstOverflow===null)stats.firstOverflow=rnd(t);
            for(const id of G.progress.cleared)if(!before.has(id))clears.push({id,t:rnd(t),levels:party(G).map(h=>h.level)});
            if(p.done){
                const rp=run.report;stats.runs++;stats.wins+=Number(rp.won);stats.losses+=Number(!rp.won);stats.timeouts+=Number(rp.reason==='timeout');stats.downed+=rp.downed.length;
                const key=`${run.difficulty}|${run.stageId}`,st=stages[key]??={runs:0,wins:0,losses:0,firstAt:rnd(t),lastAt:0,combatSec:0,wallSec:0,reasons:{}};
                st.runs++;st.wins+=Number(rp.won);st.losses+=Number(!rp.won);st.lastAt=rnd(t);st.combatSec+=rp.durationSec;st.wallSec+=(START+t*1000-rp.at)/1000;st.reasons[rp.reason]=(st.reasons[rp.reason]??0)+1;
                Q.noteRunEnd(G,run,START+t*1000);
                const nx=Q.nextRepeat(G,START+t*1000,1);
                pending=nx?{...nx,from:run}:null;
                if(policy==='farming'){
                    if(farming){
                        farming.left--;
                        const dest=farming.left>0?farming.stage:farming.target;
                        pending={stageId:dest,at:START+t*1000+D.balance.repeat_restart_sec*1000,difficulty:run.difficulty,from:null};
                        if(farming.left===0){farming=null;failureStreak=0;failedKey=null;}
                    }else{
                        if(!rp.won){failureStreak=failedKey===key?failureStreak+1:1;failedKey=key;}else{failureStreak=0;failedKey=null;}
                        if(failureStreak>=10){
                            const earlier=D.stageOrder.slice(0,D.stageOrder.indexOf(run.stageId)).reverse().find(id=>D.stages[id].boss_grade!=='chapter_boss'&&Q.stageCleared(G,id,run.difficulty));
                            if(earlier!=null){
                                farming={stage:earlier,target:run.stageId,left:10};
                                log.push({t:rnd(t),kind:'farmFallback',target:run.stageId,stage:earlier});
                                pending={stageId:earlier,at:START+t*1000+D.balance.repeat_restart_sec*1000,difficulty:run.difficulty,from:null};
                            }
                        }
                    }
                }
                run=null;p=null;lastEnd=t;
                if(stats.runs%100===0)await new Promise(r=>setTimeout(r,0));
            }else if(!(used>0))throw new Error(`no progress at ${t}`);
        }
        Q.labSettle(G,START+mark*1000);
        checkpoints.push(snapshot(G,mark,run,stats));
        console.log('MARK',seed,policy,JSON.stringify(checkpoints.at(-1)));
        if(save)window.savedStates??={};
        if(save)window.savedStates[`${policy}_${mark}`]=Q.serialize(G,START+mark*1000);
        if(window.storeCheckpoint)await window.storeCheckpoint({seed,policy,mark,snapshot:checkpoints.at(-1),state:save?window.savedStates[`${policy}_${mark}`]:null});
    }
    const result={seed,policy,wallSeconds:rnd((performance.now()-began)/1000),checkpoints,clears,stages,log,stats};
    console.log('DONE',seed,policy,result.wallSeconds,stats.runs);
    return result;
};
window.qaMeta={start:START,balance:{repeat_restart_sec:D.balance.repeat_restart_sec},pace:cfg,stageOrder:D.stageOrder};
window.qaReady=true;
