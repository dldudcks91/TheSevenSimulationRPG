import { loadData, buildSystems, D } from '/ui/data.js';
import { makeRng } from '/game_logic/rng.js';
import { paceAt, paceStep, paceCfg } from '/ui/pace.js';
await loadData('/data/');
const SYS = buildSystems(D), Q = SYS.game;
const NOW = Date.UTC(2026,9,30), HOUR = 3600000;
const fresh = seed => Q.newGame(seed,SYS.hero.rollStartParty(makeRng(seed+1000),D.balance.party_size_max),NOW);
const copy = (g,at=g.savedAt) => Q.deserialize(Q.serialize(g,at));
function overview(g) {
    const at=g.savedAt??NOW;
    const hs=Q.partyOf(g).map(uid=>Q.heroById(g,uid));
    return {
        seed:g.seed,at,elapsedSec:(at-NOW)/1000,stage:g.runs[0]?.stageId,difficulty:g.runs[0]?.difficulty??g.difficulty,
        gold:g.resources.gold,materials:g.materials,potions:g.potions,
        heroes:hs.map(h=>{const c=Q.heroCombat(g,h);return {uid:h.uid,cls:h.cls,sin:h.sin,level:h.level,
            innate:h.innate,bookSkill:h.bookSkill,advance:h.advance,advanceSkill:h.advanceSkill,
            hp:c.hp_max,physical:c.atk_physical,magic:c.atk_magic,defense:c.defense,actionPeriod:c.action_period,
            equipped:h.equipped,mastery:h.mastery,freeMastery:h.masteryPoints,
            minorHealingPct:100*D.potions.find(p=>p.id==='minor_healing').heal/c.hp_max,
            learnableMastery:Q.masteryState(g,h.uid)?.nodes.filter(x=>x.canLearn).map(x=>({id:x.id,stat:x.stat,value:x.value})),
            books:Q.bookState(g,h.uid),advanceState:Q.advanceState(g,h.uid,at)};}),
        construction:Q.constructionState(g).buildings.map(b=>({id:b.id,rank:b.rank,next:b.next})),
        shop:Q.shopState(g,at),potionCraft:Q.potionState(g),tavern:Q.tavernState(g,at),
        lab:Q.labState(g,at),guide:Q.notificationState(g,at).guide,
        inventory:g.bags.map(b=>b.map(id=>g.items[id])),items:g.items,
        blueprints:g.blueprints,books:g.books,commission:Q.commissionState(g),joins:g.joins,
    };
}
function potionChoice(g) {
    const out=[];
    for(const p of D.potions.filter(p=>p.tier<=3)) {
        const buy=copy(g),craft=copy(g),before=g.potions[p.id]??0;
        const bought=Q.shopPotionBuy(buy,p.id),made=Q.makePotion(craft,p.id);
        out.push({id:p.id,heal:p.heal,bought,made,
            purchaseGold:g.resources.gold-buy.resources.gold,craftGold:g.resources.gold-craft.resources.gold,
            purchasedStock:(buy.potions[p.id]??0)-before,craftedStock:(craft.potions[p.id]??0)-before});
    }
    return out;
}
async function respec(g) {
    const priority = await (await fetch('/mastery_priorities.json')).json();
    const log=[];
    for(const h of Q.partyOf(g).map(uid=>Q.heroById(g,uid))) {
        const reset=Q.resetMastery(g,h.uid), magic=!Q.heroCombat(g,h).basic_attack;
        const stats=priority.afterClassFirstByStat[magic?'magic':h.cls==='archer'?'physicalArcher':h.cls==='knight'?'frontKnight':'physicalWarrior'];
        const first=priority.classFirstIds[h.cls]??[];
        const avoid=magic?priority.avoidForMagicMode:[];
        let learned=0;
        for(let guard=0;guard<1000;guard++) {
            const nodes=Q.masteryState(g,h.uid).nodes.filter(n=>n.canLearn&&n.on!==false&&!avoid.includes(n.stat));
            const rank=n=>{const i=first.indexOf(n.id);if(i>=0)return i;
                const j=stats.indexOf(n.stat);return 100+(j>=0?j:100);};
            nodes.sort((a,b)=>rank(a)-rank(b)||(a.treeKind==='class'?0:1)-(b.treeKind==='class'?0:1));
            const n=nodes[0]; if(!n||!Q.learnMastery(g,h.uid,n.id).ok)break;
            learned++;
        }
        log.push({hero:h.uid,reset,learned,mastery:{...h.mastery}});
    }
    return log;
}
function learnUsefulBooks(g) {
    const prefer={mage:['mag_iceblast','mag_fireball','mag_ignite','mag_lightning'],
        priest:['pri_heal','pri_cure','pri_judgment'],warrior:['war_battleorders','war_recovery','war_bash'],
        knight:['kni_holyshield','kni_might','kni_fanaticism','kni_resistshield'],
        archer:['arc_multishot','arc_rapid','arc_guided','arc_coldarrow']};
    const log=[];
    for(const h of Q.partyOf(g).map(uid=>Q.heroById(g,uid))) {
        const id=(prefer[h.cls]??[]).find(id=>g.blueprints[id]>0&&id!==h.innate&&id!==h.bookSkill);
        if(!id){log.push({hero:h.uid,skipped:'no owned relevant blueprint'});continue;}
        const crafted=Q.craftBook(g,id);
        const learned=crafted.ok?Q.learnBook(g,h.uid,id):null;
        log.push({hero:h.uid,id,crafted,learned});
    }
    return log;
}
async function ablate(saved) {
    const at=saved.savedAt, stage=saved.runs[0]?.stageId, diff=saved.runs[0]?.difficulty??saved.difficulty;
    const critical=stage===1051&&saved.resources.gold<50;
    const policies=critical?['control','combat_respec','farm10_then_retry','respec_farm10_then_retry']:
        ['control','combat_respec','minor10','weapon_upgrade','books','respec_and_books','health_matched_potions','no_potions',
        ...(saved.savedAt-NOW>=12*HOUR?['budget1000_minor','budget1000_healing','budget1000_super']:[])];
    const branches=[];
    for(const name of policies) {
        const g=Q.deserialize(saved);
        Q.closeRun(g,at); // The same required save-restore closure for every branch, no invented continuation.
        const before={gold:g.resources.gold,materials:{...g.materials},potions:{...g.potions}},actions=[];
        if(name==='combat_respec'||name==='respec_and_books'||name==='respec_farm10_then_retry')actions.push({respec:await respec(g)});
        if(name==='books'||name==='respec_and_books')actions.push({books:learnUsefulBooks(g)});
        if(name==='minor10')actions.push({buy:Q.shopPotionBuy(g,'minor_healing',10)});
        if(name.startsWith('budget1000_')) {
            const id=name.endsWith('_minor')?'minor_healing':name.endsWith('_super')?'super_healing':'healing';
            const p=D.potions.find(p=>p.id===id),n=Math.floor(1000/(p.shopGold??p.craftGold));
            let result;
            if(p.shopGold!=null) result=Q.shopPotionBuy(g,id,n);
            else {result=[];for(let k=0;k<n;k++)result.push(Q.makePotion(g,id));}
            if((g.potions[id]??0)>0)for(let slot=0;slot<Q.limitsOf(g).potionSlots;slot++)Q.setPotionSlot(g,slot,id);
            actions.push({potion:id,result});
        }
        if(name==='weapon_upgrade') {
            const hs=Q.partyOf(g).map(uid=>Q.heroById(g,uid));
            const h=hs.filter(h=>Q.upgradeState(g,h.equipped.weapon)?.canUpgrade)
                .sort((a,b)=>(g.items[a.equipped.weapon]?.up??0)-(g.items[b.equipped.weapon]?.up??0))[0];
            actions.push(h?{hero:h.uid,upgrade:Q.upgradeItem(g,h.equipped.weapon)}:{skipped:'no affordable weapon upgrade'});
        }
        if(name==='health_matched_potions') {
            const hp=Q.partyOf(g).map(uid=>Q.heroCombat(g,Q.heroById(g,uid)).hp_max).sort((a,b)=>a-b);
            const desired=hp[Math.floor(hp.length/2)]*0.5;
            const p=D.potions.filter(p=>p.shopGold!=null).find(p=>p.heal>=desired)??D.potions.filter(p=>p.shopGold!=null).at(-1);
            const n=Math.min(10,Math.floor(g.resources.gold/p.shopGold));
            const bought=n>0?Q.shopPotionBuy(g,p.id,n):{ok:false,err:'gold'};
            if(bought.ok)for(let slot=0;slot<Q.limitsOf(g).potionSlots;slot++)Q.setPotionSlot(g,slot,p.id);
            actions.push({desiredMedianHeal:desired,potion:p.id,bought});
        }
        if(name==='no_potions')for(let slot=0;slot<Q.limitsOf(g).potionSlots;slot++)actions.push(Q.setPotionSlot(g,slot,null));
        const after={gold:g.resources.gold,materials:{...g.materials},potions:{...g.potions}};
        let now=at;
        const runs=[],cfg=paceCfg('off',true,1,1);
        let farmPreparation=null;
        if(name.includes('farm10_then_retry')) {
            const earlier=D.stageOrder.slice(0,D.stageOrder.indexOf(stage)).reverse()
                .find(id=>D.stages[id].boss_grade!=='chapter_boss'&&Q.stageCleared(g,id,diff));
            if(earlier!=null) {
                const started=now,gold0=g.resources.gold,prepared=[];
                for(let i=0;i<10;i++) {
                    const dep=Q.departRun(g,earlier,now,1,null,diff);
                    if(!dep.ok){prepared.push({err:dep.err});break;}
                    const r=dep.run,p=paceAt(r.result.timeline,0);
                    while(!p.done)now+=60000-paceStep(p,r.result.timeline,60000,cfg,s=>Q.stepRun(g,r,s));
                    Q.noteRunEnd(g,r,now);Q.labSettle(g,now);
                    let gearMoves=0;
                    for(const uid of Q.partyOf(g))gearMoves+=Q.autoEquip(g,uid,1).changes?.length??0;
                    prepared.push({won:r.report.won,gold:r.report.gold,gearMoves});
                    now+=D.balance.repeat_restart_sec*1000;
                }
                farmPreparation={stage:earlier,elapsedSec:(now-started)/1000,goldGain:g.resources.gold-gold0,
                    endLevels:Q.partyOf(g).map(uid=>Q.heroById(g,uid).level),runs:prepared};
            }
        }
        for(let n=0;n<10;n++) {
            const respawn=Q.bossRespawnAt(g,stage,diff);
            if(respawn>now)now=respawn;
            const dep=Q.departRun(g,stage,now,1,null,diff);
            if(!dep.ok){runs.push({error:dep.err});break;}
            const run=dep.run,p=paceAt(run.result.timeline,0),pots={...g.potions};
            let elapsed=0;
            while(!p.done) {
                const left=paceStep(p,run.result.timeline,60000,cfg,s=>Q.stepRun(g,run,s));
                elapsed+=60000-left;
                if(elapsed>HOUR)throw Error('targeted branch unexpectedly exceeds one hour per attempt');
            }
            now+=elapsed;
            Q.noteRunEnd(g,run,now);
            const rp=run.report;
            const used=Object.fromEntries(Object.keys(pots).map(k=>[k,pots[k]-(g.potions[k]??0)]).filter(([,n])=>n));
            runs.push({won:rp.won,reason:rp.reason,elapsedSec:elapsed/1000,combatSec:rp.durationSec,
                gold:rp.gold,xp:rp.xp,downed:rp.downed,roundsCleared:rp.roundsCleared,potionUse:used,
                casts:run.result.timeline.filter(e=>e.e==='skill').length});
            Q.labSettle(g,now);
            now+=D.balance.repeat_restart_sec*1000;
        }
        branches.push({name,actions,actionGoldCost:before.gold-after.gold,before,afterActions:after,farmPreparation,
            wins:runs.filter(r=>r.won).length,attempts:runs.length,elapsedSec:(now-at)/1000,
            totalGold:runs.reduce((s,r)=>s+(r.gold??0),0),endLevels:Q.partyOf(g).map(uid=>Q.heroById(g,uid).level),runs});
    }
    return {stage,difficulty:diff,checkpointAt:at,elapsedAtCheckpointSec:(at-NOW)/1000,
        method:'Paired legal interventions on identical saved checkpoint; common closeRun on restore, then next10 manual attempts at same stage. Actual costs, XP, loot, healing and clock; no free ranks/gold/levels/counter edits. This is a short controlled scenario, not a full day persona or optimal strategy.',branches};
}
export async function probe(input) {
    if(input?.mode==='ablate')return ablate(input.state);
    if(input?.mode==='native') {
        const o=input.state,s=o.final_save,report=s.reports[0];
        const g=Q.newGame(s.seed,o.candidates_after,s.createdAt);
        const dep=Q.departRun(g,report.stageId,report.at,1,null,report.difficulty??'normal');
        if(!dep.ok)throw Error(JSON.stringify(dep));
        Q.stepRun(g,dep.run,s.expMs/1000);
        const fields=x=>({gold:x.resources.gold,levels:x.heroes.map(h=>h.level),xp:x.heroes.map(h=>h.xp),
            potion:x.potions,items:Object.keys(x.items).length,bag:x.bags[0].length,
            rounds:x.reports[0].roundsCleared,kills:x.reports[0].kills});
        const expected=fields(s),actual=fields(g);
        return {method:'Reconstruct the exact actual browser onboarding candidates+game seed+departure time on frozen engine, advance to browser recorded expMs. No elapsed-walltime guess.',
            candidateCount:o.candidates_after.length,expSec:s.expMs/1000,expected,actual,identical:JSON.stringify(expected)===JSON.stringify(actual)};
    }
    const saved=input?.state??input;
    if(!saved) {
        const cases=[];
        for(let seed=1;seed<=20;seed++) cases.push(overview(fresh(seed)));
        return {initial_cases:cases,
            initial_summary:cases.map(c=>({seed:c.seed,classes:c.heroes.map(h=>h.cls),hp:c.heroes.map(h=>h.hp),
                healPct:c.heroes.map(h=>Math.round(h.minorHealingPct*100)/100),gold:c.gold,
                freeMastery:c.heroes.map(h=>h.freeMastery),booksAvailable:c.heroes.map(h=>h.books.hero?.err)})),
            potion_definition:D.potions,
            policy_note:'Fresh states use actual candidate+newGame APIs, no artificial levels/resources.'};
    }
    const g=Q.deserialize(saved);
    return {overview:overview(g),legal_potion_comparison:potionChoice(g)};
}
