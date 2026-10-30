import {loadData, buildSystems, D} from '/ui/data.js';
import {paceAt, paceStep, paceCfg} from '/ui/pace.js';
await loadData('/data/');
const SYS = buildSystems(D), Q = SYS.game;
const clone = x => JSON.parse(JSON.stringify(x));
const party = g => Q.partyOf(g).map(uid => Q.heroById(g, uid));
const summary = g => ({gold:g.resources.gold, materials:clone(g.materials), potions:clone(g.potions),
    counters:clone(g.counters), cleared:clone(g.progress), presets:clone(g.presets),
    heroes:g.heroes.map(h=>({uid:h.uid,cls:h.cls,name:h.name,level:h.level,xp:h.xp,innate:h.innate,
        equipped:clone(h.equipped),mastery:clone(h.mastery),free:h.masteryPoints,combat:Q.heroCombat(g,h)}))});

function allocate(g, reset, style='survival') {
    const logs=[];
    for(const h of party(g)) {
        const before=clone(h.mastery),gold=g.resources.gold;
        if(reset)Q.resetMastery(g,h.uid);
        const magic=!Q.heroCombat(g,h).basic_attack;
        const first=style==='survival' ? {
            warrior:['cls_warrior_t1_hp','cls_warrior_t1_resall','cls_warrior_t1_atk'],
            mage:['sin_sloth_t1_hp','cls_mage_t1_cdr','cls_mage_t1_castspeed','cls_mage_t1_atk'],
            priest:['cls_priest_t1_cdr','cls_priest_t1_castspeed','sin_envy_t1_resignore'],
        }[h.cls]??[] : {
            warrior:['cls_warrior_t1_atk','cls_warrior_t1_resall','cls_warrior_t1_hp'],
            mage:['cls_mage_t1_cdr','cls_mage_t1_castspeed','cls_mage_t1_atk'],
            priest:['cls_priest_t1_cdr','cls_priest_t1_castspeed'],
        }[h.cls]??[];
        const stats=magic?['hp_flat','cooldown_reduction','cast_speed_pct','res_all','atk_pct','res_reduction','damage_reduction']:
            ['hp_flat','res_all','atk_pct','aspd_pct','def_flat','damage_reduction','crit_rate'];
        for(let guard=0;guard<200;guard++){
            const score=n=>first.includes(n.id)?first.indexOf(n.id)-100:stats.includes(n.stat)?stats.indexOf(n.stat):100;
            const n=Q.masteryState(g,h.uid).nodes.filter(n=>n.canLearn&&n.on!==false&&
                !(magic&&['aspd_pct','def_ignore','life_steal','reflect_damage','buff_dur_pct'].includes(n.stat)))
                .sort((a,b)=>score(a)-score(b))[0];
            if(!n)break;
            const r=Q.learnMastery(g,h.uid,n.id);if(!r.ok)throw Error(JSON.stringify(r));
        }
        if(JSON.stringify(before)!==JSON.stringify(h.mastery))logs.push({hero:h.uid,before,after:clone(h.mastery),goldCost:gold-g.resources.gold});
    }
    return logs;
}

function maintain(g,now,actions,{spend=false}={}) {
    for(const h of party(g)){
        const eq=Q.autoEquip(g,h.uid,1);
        if(eq.changes?.length)actions.push({type:'autoEquip',hero:h.uid,changes:eq.changes});
    }
    const mastery=allocate(g,false);if(mastery.length)actions.push({type:'newMastery',mastery});
    if(spend){
        const stock=g.potions.minor_healing??0;
        const n=Math.min(Math.max(0,5-stock),Math.floor(Math.max(0,g.resources.gold-500)/50));
        if(n>0){const buy=Q.shopPotionBuy(g,'minor_healing',n);actions.push({type:'buyPotion',n,result:buy});}
    }
    for(let i=0;i<Q.limitsOf(g).potionSlots;i++)Q.setPotionSlot(g,i,spend?'minor_healing':null);
}

function one(g, stage, now, repeat=false, from=null) {
    const dep=Q.departRun(g,stage,now,1,from,'normal');
    if(!dep.ok)throw Error(JSON.stringify({stage,now,error:dep}));
    const run=dep.run, p=paceAt(run.result.timeline,0), cfg=paceCfg('off',true,1,1);
    // This is the same repeat flag written by the normal departure UI; no progression fields change.
    if(repeat)g.runs[0].repeat=true;
    let elapsed=0;
    while(!p.done){elapsed+=60000-paceStep(p,run.result.timeline,60000,cfg,s=>Q.stepRun(g,run,s));
        if(elapsed>3600000)throw Error('run exceeded 1h');}
    Q.noteRunEnd(g,run,now+elapsed);
    Q.labSettle(g,now+elapsed);
    return {handle:run,now:now+elapsed+D.balance.repeat_restart_sec*1000,next:Q.nextRepeat(g,now+elapsed,1),
        elapsedSec:elapsed/1000,report:clone(run.report),timeline:clone(run.result.timeline)};
}

export async function probe({mode,raw}) {
    const g=Q.deserialize(raw),now=raw.savedAt;
    if(mode==='inspect') {
        const guide=Q.notificationState(g,now);
        Q.closeRun(g,now);
        const before=summary(g), {handle,...battle}=one(g,1051,now);
        return {guide,before,after:summary(g),battle,
            mastery:party(g).map(h=>({uid:h.uid,nodes:Q.masteryState(g,h.uid).nodes})),
            inventory:g.bags.map(b=>b.map(uid=>g.items[uid])),
            construction:Q.constructionState(g),shop:Q.shopState(g,battle.now),
            heroItems:g.heroes.map(h=>({uid:h.uid,items:Q.heroItems(g,h)})),
            stage:D.stages[1051]};
    }
    if(mode==='recover'||mode==='repeat_recover') {
        const branches=[];
        for(const policy of mode==='repeat_recover'?['respec_and_place_repeat']:
            ['control','offensive_respec_only','survival_respec_only','farm_only','respec_and_farm']) {
            const g=Q.deserialize(raw),actions=[],runs=[],start=raw.savedAt;
            Q.closeRun(g,start);
            const initial=summary(g);
            let now=start,won=false,bossAttempts=0,farmRuns=0,farmStage=1031,farmSinceRetry=0,preWinSave=null,fromNext=null;
            const placeRepeat=policy==='respec_and_place_repeat';
            if(policy.includes('respec'))actions.push({type:'respec',style:policy.startsWith('offensive')?'offensive':'survival',
                changes:allocate(g,true,policy.startsWith('offensive')?'offensive':'survival')});
            const farms=policy==='farm_only'||policy==='respec_and_farm'||placeRepeat;
            const maxSec=policy.endsWith('_only')&&policy!=='farm_only'?3600:14400;
            let stage=1051;
            while((now-start)/1000<maxSec&&runs.length<400) {
                if(farms)maintain(g,now,actions,{spend:stage===1051});
                const before={gold:g.resources.gold,levels:party(g).map(h=>h.level),potions:clone(g.potions)};
                const preBoss=stage===1051?Q.serialize(g,now):null;
                const r=one(g,stage,now,placeRepeat&&stage!==1051,fromNext);now=r.now;
                fromNext=null;
                runs.push({stage,elapsedSec:r.elapsedSec,atSec:(now-start)/1000,
                    won:r.report.won,reason:r.report.reason,gold:r.report.gold,xp:r.report.xp,
                    rounds:r.report.roundsCleared,downed:r.report.downed,contrib:r.report.contrib,
                    before,after:{gold:g.resources.gold,levels:party(g).map(h=>h.level),potions:clone(g.potions)}});
                if(stage===1051){bossAttempts++;won=r.report.won;if(won){preWinSave=preBoss;break;}
                    if(!farms&&policy!=='control'&&bossAttempts>=10)break;
                    if(farms){stage=farmStage;farmSinceRetry=0;}
                }else{
                    farmRuns++;farmSinceRetry++;
                    let retreated=false;
                    if(!r.report.won&&farmStage>(placeRepeat?1011:1021)){
                        farmStage-=10;retreated=true;actions.push({type:'retreatFurther',atSec:(now-start)/1000,stage:farmStage});}
                    if(farmSinceRetry>=10)stage=1051;
                    else if(placeRepeat&&!retreated){stage=r.next.stageId;fromNext=r.handle;}
                    else stage=farmStage;
                }
            }
            let parity=null;
            if(preWinSave){
                const replay=Q.deserialize(preWinSave);
                const native=Q.resolveBattle(replay,1051,preWinSave.savedAt,1,'normal');
                const expected=g.reports.find(r=>r.stageId===1051&&r.won);
                parity={nativeWon:native.report?.won,identicalReport:JSON.stringify(native.report)===JSON.stringify(expected),
                    expected:clone(expected),native:clone(native.report??native)};
                if(!parity.nativeWon||!parity.identicalReport)throw Error('native resolveBattle disagrees with paced winning run');
            }
            branches.push({policy,won,bossAttempts,farmRuns,elapsedSec:(now-start)/1000,initial,final:summary(g),actions,runs,
                preWinSave,parity,finalSave:Q.serialize(g,now)});
        }
        return {method:'Same saved state and common closeRun; actual APIs, costs and RNG. Fixed policies chosen before results. '+
            (mode==='repeat_recover'?'Farm starts at1031 with the normal place repeat flag; nextRepeat chooses the next cell and departRun receives the actual previous run handle. After a farming defeat retreat one place. Retry boss after each ten farm attempts.':
            'Farm stage1031, fall back to1021 after a loss; ten manual fixed-cell farm attempts between boss retries.')+
            ' Farming branches auto-equip and allocate newly earned points; they conserve potions while farming, replenish at most five minor potions before boss attempts with a500-gold reserve. No added resources, ranks, levels, counters or forced outcome.',
            summary:branches.map(b=>({policy:b.policy,won:b.won,bossAttempts:b.bossAttempts,farmRuns:b.farmRuns,elapsedSec:b.elapsedSec,
                levels:b.final.heroes.slice(0,3).map(h=>h.level),gold:b.final.gold})),branches};
    }
    throw Error('unknown mode '+mode);
}
