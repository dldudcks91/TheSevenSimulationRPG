import {loadData,buildSystems,D} from '../snapshot/src/ui/data.js';
import {makeRng} from '../snapshot/src/game_logic/rng.js';
import {paceAt,paceStep,paceCfg} from '../snapshot/src/ui/pace.js';

await loadData('/data/');
let SYS=buildSystems(D),Q=SYS.game;const START=Date.UTC(2026,9,30,0),CFG=paceCfg('off',true,1,1),BASE_DATA=structuredClone(D);
const r3=n=>Math.round(n*1000)/1000,sum=xs=>xs.reduce((s,x)=>s+x,0),avg=xs=>xs.length?sum(xs)/xs.length:0,clone=x=>JSON.parse(JSON.stringify(x));
const party=G=>Q.partyOf(G).map(u=>Q.heroById(G,u)),worth=i=>(i?.ilvl??0)*10+({normal:0,magic:1,rare:2,craft:2,epic:3,legendary:4,unique:5,set:5}[i?.rarity]??0);
const ARMOR=['helmet','armor','gloves','boots'],SPECIAL=new Set(['craft','unique','set']);
const potGold=Object.fromEntries(D.potions.map(p=>[p.id,p.shopGold??p.craftGold??0]));
const xpAt=new Map(D.levelXp.map(x=>[x.level,x.monsterXp]));
const totalXp=h=>sum(Array.from({length:h.level-1},(_,i)=>SYS.hero.xpNeeded(i+1)))+h.xp;
const might=c=>{const a=c.atk_physical??c.atk_magic;if(!a)return 0;const crit=1+Math.min(1,c.crit_rate??0)*((c.crit_damage??1)-1);const d=(a.min+a.max)/2*(c.main_attr_mult??1)*(1+(c.dmg_bonus_pct??0))*crit/(c.action_period||1);const keep=(1-SYS.formula.mitigation(c.defense??0))*(1-(c.damage_reduction??0));return d*(c.hp_max??0)/Math.max(keep,1e-12);};
const skillIds=h=>SYS.skill.activesFor(h).map(a=>a.id);
let CURRENT=null;
function first(c,key,t,detail={}){if(c.first[key]===undefined)c.first[key]={t:r3(t),...detail};}
function event(c,kind,t,detail={}){c.events.push({t:r3(t),...detail,kind});}
function action(c,kind,t,detail={}){const a=c.count.actions;a[kind]=(a[kind]??0)+1;event(c,kind,t,detail);c.actionTimes.push(t);first(c,kind,t,detail);}
function inspectSkills(c,t){for(const h of party(c.G)){const old=c.skills[h.uid]??=[];for(const id of skillIds(h))if(!old.includes(id)){old.push(id);first(c,'newActiveSkill',t,{hero:h.uid,id});event(c,'newActiveSkill',t,{hero:h.uid,id});c.count.newActiveSkills++;}}}
function rawLost(c,ru,s){
    if(s.cleared)return {kills:0,xp:0,unmapped:0};
    const killed=ru.handle.result.rounds.find(r=>r.n===s.n)?.killed??[],need=new Map();for(const id of killed)need.set(id,(need.get(id)??0)+1);
    let xp=0,used=0;const downed=new Set();
    for(const ev of ru.handle.result.timeline){if(ev.e!=='down'||downed.has(ev.u))continue;downed.add(ev.u);const e=ru.enemyMap.get(ev.u);if(!e||e.round!==s.n||!(need.get(e.monsterId)>0))continue;need.set(e.monsterId,need.get(e.monsterId)-1);const m=D.monsters[e.monsterId],lv=Math.min(D.balance.hero_level_cap,ru.handle.report.level+(m?.level_add??0));xp+=(xpAt.get(lv)??0)*(D.grades[e.grade]?.exp_mult??1)*(m?.exp_coef??1)*(1+(e.farmXp??0))*D.balance.xp_rate*(ru.diff==='normal'&&D.stages[ru.stage]?.chapter===1?(window.__qaVariant?.xp??1):1);used++;}
    return {kills:killed.length,xp:r3(xp),unmapped:killed.length-used};
}
function finishPending(c,ru){
    const p=ru.pending;if(!p||!ru.handle)return;ru.pending=null;const s=p.s,G=c.G,R=ru.handle.report;
    const t=ru.start+s.t/CFG.speed+Math.max(0,s.n-1)*CFG.gap/1000;
    const xp=sum(Object.values(R.xp))-p.xp,actualXp=sum(party(G).map(totalXp))-p.actualXp,gold=R.gold-p.gold;
    const ids=R.drops.slice(p.dropIndex,p.dropIndex+s.drops.length),rarities={};
    for(let i=0;i<s.drops.length;i++){
        const it=s.drops[i],uid=ids[i];rarities[it.rarity]=(rarities[it.rarity]??0)+1;c.count.drops++;c.count.rarities[it.rarity]=(c.count.rarities[it.rarity]??0)+1;
        first(c,'drop',t,{rarity:it.rarity,slot:it.slot,ilvl:it.ilvl});first(c,'drop_'+it.rarity,t,{slot:it.slot,ilvl:it.ilvl});c.dropTimes.push(t);
        if(uid)c.origins[uid]={kind:'drop',t,rarity:it.rarity,slot:it.slot,ilvl:it.ilvl};
        const held=G.items[uid];if(held)for(const h of party(G))if(!SYS.item.canEquip(h,held)&&SYS.item.fitsClass(held,h.cls)&&Q.equipTarget(h,held)){
            const before=might(Q.heroCombat(G,h)),after=might(Q.heroCombatIf(G,h,uid));
            if(after>before+1e-7){first(c,'usableGainDrop',t,{hero:h.uid,uid,rarity:it.rarity,ratio:r3(after/Math.max(before,1e-12))});break;}
        }
    }
    c.count.heroXp+=xp;c.count.actualXp+=Math.max(0,actualXp);c.count.battleGold+=gold;
    const bp=(s.blueprints??[]).length;c.count.blueprints+=bp;if(bp)first(c,'blueprint',t,{ids:s.blueprints});
    if(xp>0){first(c,'xp',t,{amount:xp});c.xpTimes.push(t);}if(gold>0)first(c,'gold',t,{amount:gold});
    if(xp>0||gold>0||s.drops.length||bp)c.rewardTimes.push(t);
    for(const h of party(G)){const old=p.levels[h.uid];if(h.level>old){c.count.levelUps+=h.level-old;first(c,'levelUp',t,{hero:h.uid,from:old,to:h.level});event(c,'levelUp',t,{hero:h.uid,from:old,to:h.level});c.levelTimes.push(t);}if((h.masteryPoints??0)>0)first(c,'masteryAvailable',t,{hero:h.uid,points:h.masteryPoints});}
    const units=sum(Object.values(s.potions??{})),cost=sum(Object.entries(s.potions??{}).map(([id,n])=>n*(potGold[id]??0)));
    c.count.potionsConsumed+=units;c.count.potionConsumedValue+=cost;ru.potionUnits+=units;ru.potionValue+=cost;
    if(units)first(c,'potionConsumed',t,{units});
    const lost=rawLost(c,ru,s);c.count.failedRoundKills+=lost.kills;c.count.failedRoundRawXp+=lost.xp;c.count.failedRoundUnmappedKills+=lost.unmapped;
    const overflow=R.discarded-p.overflow;c.count.overflow+=overflow;if(overflow)first(c,'overflow',t,{n:overflow});
    if(G.bags[0].length>=Q.limitsOf(G).bag)first(c,'bagFull',t,{n:G.bags[0].length});
    c.count.maxBag=Math.max(c.count.maxBag,G.bags[0].length);
    const newClear=s.ended&&R.won&&!p.wasClear;
    if(newClear){const row={t:r3(t),stage:ru.stage,diff:ru.diff,levels:party(G).map(h=>h.level)};c.clears.push(row);event(c,'firstClear',t,{stage:ru.stage,diff:ru.diff});c.count.firstClears++;first(c,'stageClear',t,{stage:ru.stage});}
    if(R.clearBox&&!ru.boxNoted){ru.boxNoted=true;c.count.boxesGranted++;first(c,'boxGranted',t,{...R.clearBox,stage:ru.stage});event(c,'boxGranted',t,{...R.clearBox,stage:ru.stage});}
    c.rounds.push({t:r3(t),stage:ru.stage,diff:ru.diff,n:s.n,clear:s.cleared,end:s.ended,xp:r3(xp),actualXp:r3(actualXp),gold,drops:s.drops.length,rarities,blueprints:bp,potionUnits:units,potionValue:cost,failedRoundKills:lost.kills,failedRoundRawXp:lost.xp,overflow,alive:s.alive.length});
    inspectSkills(c,t);
}
// Observation wrapper only: engine inputs, advance order, RNG and returned snapshots are unchanged.
function installObservation(){
const originalCreateRun=SYS.battle.createRun;
SYS.battle.createRun=(...args)=>{if(window.QA_SKIP_OBSERVATION)return originalCreateRun(...args);
    const c=CURRENT,ru=c.current,b=originalCreateRun(...args),advance=b.advance;
    ru.battle=b;
    b.advance=until=>{
        finishPending(c,ru);const i=b.result.timeline.length;const s=advance(until);
        for(const ev of b.result.timeline.slice(i))if(ev.e==='round'||ev.e==='call')for(const e of ev.enemies??ev.units??[]){
            ru.enemyMap.set(e.key,{...e,round:ev.n??b.status().round,farmXp:Q.codexLadder(c.G,e.monsterId)?.farm?.xp??0});
        }
        if(s){const G=c.G,R=ru.handle?.report;ru.pending={s,xp:R?sum(Object.values(R.xp)):0,actualXp:sum(party(G).map(totalXp)),gold:R?.gold??0,dropIndex:R?.drops.length??0,overflow:R?.discarded??0,wasClear:Q.stageCleared(G,ru.stage,ru.diff),levels:Object.fromEntries(party(G).map(h=>[h.uid,h.level]))};}
        return s;
    };return b;
};

}
installObservation();
function keepFuture(c){
    const G=c.G,keep=new Set();for(const uid of G.bags[0])if(SPECIAL.has(G.items[uid]?.rarity))keep.add(uid);
    for(const h of party(G))for(const pos of ['weapon',...ARMOR,'ring','amulet']){
        const candidates=G.bags[0].map(u=>G.items[u]).filter(i=>i&&!i.box&&i.slot===pos&&SYS.item.fitsClass(i,h.cls)&&SYS.item.canEquip(h,i)==='level').sort((a,b)=>worth(b)-worth(a));
        if(candidates[0])keep.add(candidates[0].uid);
    }return keep;
}
function masteryOrder(c,h,nodes){
    if(c.policy==='basic')return nodes;
    const magic=!Q.heroCombat(c.G,h).basic_attack;
    const preferred={mage:['cls_mage_t1_cdr','cls_mage_t1_castspeed','cls_mage_t1_atk'],priest:['cls_priest_t1_cdr','cls_priest_t1_castspeed'],knight:['cls_knight_t1_dr','cls_knight_t1_def','cls_knight_t1_hp'],warrior:['cls_warrior_t1_atk','cls_warrior_t1_resall','cls_warrior_t1_hp'],archer:['cls_archer_t1_atkspeed','cls_archer_t1_hitbonus','cls_archer_t1_critchance']}[h.cls]??[];
    const priority=magic?['cooldown_reduction','cast_speed_pct','atk_pct','res_reduction','crit_rate','crit_damage','res_all','damage_reduction','hp_flat','def_flat','buff_dur']
        :h.cls==='knight'&&Q.rankOf(c.G,h.uid)===0?['damage_reduction','def_flat','hp_flat','res_all','atk_pct','aspd_pct','crit_rate','crit_damage','hit_bonus','def_ignore']
        :h.cls==='archer'?['aspd_pct','hit_bonus','atk_pct','crit_rate','crit_damage','def_ignore','res_all','damage_reduction','hp_flat','def_flat']
        :['aspd_pct','atk_pct','def_ignore','crit_rate','crit_damage','hit_bonus','res_all','damage_reduction','hp_flat','def_flat'];
    const score=n=>{const fixed=preferred.indexOf(n.id);if(fixed>=0)return fixed-100;const i=priority.indexOf(n.stat);return (i<0?10000:i*10)+(n.treeKind==='class'?0:2)+(n.cond?4:0);};
    return nodes.filter(n=>n.on!==false&&!(magic&&['aspd_pct','def_ignore','life_steal','reflect_damage'].includes(n.stat))).sort((a,b)=>score(a)-score(b));
}
function legacyManage(c,t){
    const G=c.G,now=START+t*1000,beforeActions=c.actionTimes.length;
    const mail=Q.claimAllMail(G);if(mail.n>0)action(c,'mailClaim',t,{n:mail.n});
    for(let guard=0;guard<100;guard++){
        const uid=G.bags.flat().find(u=>G.items[u]?.box);if(uid==null)break;
        const kind=G.items[uid].box.kind,hs=party(G),v=h=>kind==='weapon'?(G.items[h.equipped.weapon]?.ilvl??0):avg(ARMOR.map(p=>G.items[h.equipped[p]]?.ilvl??0));
        const h=hs.reduce((a,b)=>v(b)<v(a)?b:a),before=new Set(Object.keys(G.items)),r=Q.openBox(G,uid,h.uid);
        if(!r.ok){c.failures.push({t,kind:'box',err:r.err});break;}
        const added=Object.keys(G.items).filter(u=>!before.has(u)).map(u=>G.items[u]);for(const i of added)c.origins[i.uid]={kind:'box',t,rarity:i.rarity,slot:i.slot,ilvl:i.ilvl};
        c.count.boxesOpened++;action(c,'boxOpened',t,{hero:h.uid,kind,items:added.map(i=>({uid:i.uid,rarity:i.rarity,slot:i.slot,ilvl:i.ilvl}))});
    }
    for(const h of party(G)){
        const before=might(Q.heroCombat(G,h)),a=Q.autoEquip(G,h.uid,1),after=might(Q.heroCombat(G,h));c.count.autoEquipCalls++;
        if(a.changes?.length){
            c.count.equipMoves+=a.changes.length;c.count.equipButtonsWithChanges++;
            const gain=after>before+1e-7;if(gain){c.count.mightImprovements++;c.equipGainTimes.push(t);first(c,'equipmentGain',t,{hero:h.uid,ratio:r3(after/Math.max(before,1e-12))});}
            if(after+1e-7<before)c.count.autoEquipMightDecreases++;
            for(const x of a.changes){const i=G.items[x.item];if(i){c.everEquipped.add(i.uid);if(c.origins[i.uid]?.kind==='drop')c.usefulDropUids.add(i.uid);}}
            action(c,'autoEquipChanged',t,{hero:h.uid,moves:a.changes.length,before:r3(before),after:r3(after),gain,changes:a.changes});
        }
        for(const pos of ['amulet','ring1','ring2']){
            const part=pos==='amulet'?'amulet':'ring',cur=G.items[h.equipped[pos]],best=G.bags[0].map(u=>G.items[u]).filter(i=>i&&!i.box&&i.slot===part&&!SYS.item.canEquip(h,i)).sort((a,b)=>worth(b)-worth(a))[0];
            if(best&&worth(best)>worth(cur)){const before=might(Q.heroCombat(G,h)),r=Q.equip(G,h.uid,best.uid,pos),after=might(Q.heroCombat(G,h));if(r.ok){c.count.equipMoves++;c.count.accessoryProxyChanges++;c.everEquipped.add(best.uid);if(c.origins[best.uid]?.kind==='drop')c.usefulDropUids.add(best.uid);action(c,'accessoryChanged',t,{hero:h.uid,pos,uid:best.uid,before:r3(before),after:r3(after),proxy:'item_level_then_rarity'});}}
        }
        const choices=masteryOrder(c,h,Q.masteryState(G,h.uid).nodes);let points=0;const spent={};
        for(let guard=0;guard<100;guard++){const node=choices.find(n=>Q.masteryState(G,h.uid).nodes.find(x=>x.id===n.id)?.canLearn);if(!node)break;const r=Q.learnMastery(G,h.uid,node.id);if(!r.ok){c.failures.push({t,kind:'mastery',err:r.err});break;}points++;spent[node.id]=(spent[node.id]??0)+1;}
        if(points){c.count.masterySpent+=points;action(c,'masterySpent',t,{hero:h.uid,points,nodes:spent});}
    }
    const keep=keepFuture(c);let salvaged=0;const rarities={};const matsBefore={...G.materials};
    for(const uid of [...G.bags[0]]){const i=G.items[uid];if(!i||i.box||i.locked||keep.has(uid))continue;const rarity=i.rarity,r=Q.salvage(G,uid);if(r.ok){salvaged++;rarities[rarity]=(rarities[rarity]??0)+1;}}
    if(salvaged){c.count.salvaged+=salvaged;action(c,'salvageBatch',t,{n:salvaged,rarities,materials:Object.fromEntries(Object.keys(G.materials).map(k=>[k,G.materials[k]-(matsBefore[k]??0)]))});}
    for(const id of ['shop','tavern','forge','storage','explore','command','resource','library']){
        const st=Q.constructionState(G).buildings.find(b=>b.id===id);if(!st||st.next.err)continue;const gold=G.resources.gold,r=Q.construct(G,id,now);if(r.ok){c.count.buildGold+=gold-G.resources.gold;action(c,'construct',t,{id,rank:r.rank,gold:gold-G.resources.gold});}
    }
    const lab=Q.labState(G,now),res=lab.lines.find(l=>l.line==='res');
    if(res?.open&&res.seats.uids.length<res.seats.cap){const h=G.heroes.filter(h=>!Q.labRegOf(G,h.uid)).sort((a,b)=>b.stats.str-a.stats.str)[0];if(h&&Q.labRegister(G,h.uid,'res',now).ok)action(c,'resourceRegister',t,{hero:h.uid});}
    if(!G.labResearch&&lab.lines.find(l=>l.line==='visit')?.open&&!G.labNodes['visit:interval']){const gold=G.resources.gold,r=Q.labResearchStart(G,'visit','interval',now);if(r.ok){c.count.researchGold+=gold-G.resources.gold;action(c,'research',t,{line:'visit',node:'interval',gold:gold-G.resources.gold});}}
    Q.commissionFill(G);
    for(const cm of Q.commissionState(G).cards)if(cm.taken&&cm.done){const r=Q.commissionClaim(G,cm.no);if(r.ok){c.count.commissionGold+=r.gold;action(c,'commissionClaim',t,{no:cm.no,gold:r.gold});}}
    Q.commissionFill(G);for(const cm of Q.commissionState(G).cards)if(cm.canTake&&Q.commissionTake(G,cm.no).ok)action(c,'commissionTake',t,{no:cm.no,kind:cm.kind,axis:cm.axis,ref:cm.ref,need:cm.need,gold:cm.gold});
    if(Q.hasFeature(G,'shop')){
        const id='minor_healing',want=Math.max(0,10-(G.potions[id]??0)),unit=Q.shopPotionGold(id,1),n=Math.min(want,Math.floor(G.resources.gold/unit));
        if(n>0){const r=Q.shopPotionBuy(G,id,n);if(r.ok){c.count.potionsBought+=n;c.count.potionBuyGold+=r.gold;action(c,'potionRefill',t,{id,units:n,gold:r.gold});}else c.failures.push({t,kind:'potionRefill',err:r.err});}
    }
    for(const h of party(G))for(const pos of ['weapon','armor','helmet','gloves','boots']){
        const uid=h.equipped[pos],i=G.items[uid];if(!i||i.up>=3)continue;const u=Q.upgradeState(G,uid);if(!u?.canUpgrade)continue;const r=Q.upgradeItem(G,uid);if(r.ok){c.count.upgradeAttempts++;c.count.upgradeGold+=r.cost;c.count.upgradeSuccesses+=Number(r.success);if(r.success)c.equipGainTimes.push(t);action(c,'upgrade',t,{hero:h.uid,pos,uid,up:r.up,success:r.success,gold:r.cost,mats:u.mats});}
    }
    if(c.actionTimes.length>beforeActions)c.count.meaningfulManagementSessions++;
    inspectSkills(c,t);
}
function gap(times,end,start=0){const xs=[start,...times.filter(t=>t>start&&t<=end),end].sort((a,b)=>a-b);let best={seconds:0,from:start,to:start};for(let i=1;i<xs.length;i++)if(xs[i]-xs[i-1]>best.seconds)best={seconds:r3(xs[i]-xs[i-1]),from:r3(xs[i-1]),to:r3(xs[i])};return best;}
function unused(c,t){const G=c.G,now=START+t*1000,builds=Q.constructionState(G).buildings,books=Q.bookState(G),lab=Q.labState(G,now);return {
    affordableBuildings:builds.filter(b=>!b.next.err).map(b=>({id:b.id,rank:b.next.rank,cost:b.next.cost})),buildingBlockers:builds.filter(b=>b.rank<b.maxRank).map(b=>({id:b.id,rank:b.rank,error:b.next.err,cost:b.next.cost})),
    craftableBooks:books.craft.filter(b=>!b.err),bookBlueprints:{...G.blueprints},skillbooks:{...G.books},bookStateOpen:books.open,
    eligibleAdvance:party(G).map(h=>({uid:h.uid,...Q.advanceState(G,h.uid,now)})).map(a=>({hero:a.uid,error:a.err,open:a.open,need:a.need,gold:a.gold})),
    unspentMastery:party(G).map(h=>({hero:h.uid,points:h.masteryPoints})),waitingHeroes:G.joins.length,
    resourceResearch:lab.lines.filter(l=>l.open).flatMap(l=>l.nodes.filter(n=>!n.err).map(n=>({line:l.line,node:n.node,level:n.lv,next:n.next}))),commission:Q.commissionState(G),guide:Q.notificationState(G,now).guide};}
function check(c,t){const G=c.G,errors=[];for(const[k,n]of Object.entries({...G.resources,...G.materials}))if(!Number.isFinite(n)||n<0)errors.push(`${k}:${n}`);const held=[...G.bags.flat(),...G.stash,...G.heroes.flatMap(h=>Object.values(h.equipped).filter(Boolean))];if(new Set(held).size!==held.length)errors.push('duplicate_holder');if(held.some(u=>!G.items[u]))errors.push('missing_item');if(G.bags.some(b=>b.length>Q.limitsOf(G).bag))errors.push('bag_overcap');for(const e of errors)c.failures.push({t,kind:'invariant',err:e});}
function snapshot(c,t){const G=c.G,hs=party(G),worn=hs.flatMap(h=>Object.values(h.equipped).map(u=>G.items[u]).filter(Boolean));const recent=c.runs.filter(r=>r.t>Math.max(0,t-3600)),ten=c.runs.slice(-10);return {seconds:t,seed:c.seed,policy:c.policy,stage:c.current?.stage??G.runs[0]?.stageId,difficulty:G.runs[0]?.difficulty??G.difficulty,classes:hs.map(h=>h.cls),levels:hs.map(h=>h.level),xp:hs.map(h=>h.xp),mastery:hs.map(h=>({uid:h.uid,points:h.masteryPoints,nodes:{...h.mastery}})),skills:hs.map(h=>({uid:h.uid,ids:skillIds(h)})),cleared:[...G.progress.cleared],clearedIn:clone(G.progress.clearedIn),gold:G.resources.gold,materials:{...G.materials},potions:{...G.potions},bags:G.bags.map(b=>b.length),bagCap:Q.limitsOf(G).bag,mail:G.mail.length,books:{...G.books},blueprints:{...G.blueprints},buildings:{...G.buildings},gear:{n:worn.length,ilvl:r3(avg(worn.map(i=>i.ilvl??0))),weapons:hs.map(h=>({uid:h.equipped.weapon,ilvl:G.items[h.equipped.weapon]?.ilvl,up:G.items[h.equipped.weapon]?.up})),upTotal:sum(worn.map(i=>i.up??0))},first:clone(c.first),count:clone(c.count),usefulDroppedItems:c.usefulDropUids.size,everEquippedItems:c.everEquipped.size,dropEquippedRatio:r3(c.usefulDropUids.size/Math.max(1,c.count.drops)),gaps:{newStage:gap(c.clears.map(x=>x.t),t),reward:gap(c.rewardTimes,t),xp:gap(c.xpTimes,t),usefulEquipment:gap(c.equipGainTimes,t)},recentHour:{runs:recent.length,wins:recent.filter(r=>r.won).length,losses:recent.filter(r=>!r.won).length,gold:sum(recent.map(r=>r.gold)),xp:sum(recent.map(r=>r.xp)),drops:sum(recent.map(r=>r.drops)),potionUnits:sum(recent.map(r=>r.potionUnits)),potionValue:sum(recent.map(r=>r.potionValue))},recentTen:{runs:ten.length,wins:ten.filter(r=>r.won).length,losses:ten.filter(r=>!r.won).length,roundsCleared:ten.map(r=>r.roundsCleared),seconds:sum(ten.map(r=>r.wallSec)),xp:sum(ten.map(r=>r.xp)),gold:sum(ten.map(r=>r.gold))},unused:unused(c,t),failures:clone(c.failures)};}

// Concatenated after observer.js. Rules fixed in PLAN.md before the first run.
const BOSS=1051;let MARKS=[5400];
const median=xs=>{const a=[...xs].sort((x,y)=>x-y);return (a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2;};
const classPlans={
    warrior:[['cls_warrior_t1_hp',2],['cls_warrior_t1_atk',3],['cls_warrior_t1_resall',2]],
    knight:[['cls_knight_t1_hp',3],['cls_knight_t1_dr',2],['cls_knight_t1_def',2]],
    mage:[['cls_mage_t1_cdr',3],['cls_mage_t1_castspeed',2],['cls_mage_t1_atk',2]],
    priest:[['cls_priest_t1_cdr',3],['cls_priest_t1_castspeed',2],['cls_priest_t1_buffdur',2]],
    archer:[['cls_archer_t1_atkspeed',3],['cls_archer_t1_hitbonus',2],['cls_archer_t1_critchance',2]],
};
const bookPreferences={warrior:['war_doubleswing','war_bash','war_recovery','war_shout'],
    knight:['kni_rush','kni_charge','kni_holyshield','kni_resistshield'],
    mage:['mag_fireball','mag_icebolt','mag_chainlightning'],
    priest:['pri_holybolt','pri_heal','pri_cure','pri_regen'],
    archer:['arc_rapid','arc_snipe']};
function chooseNode(c,h){
    const nodes=Q.masteryState(c.G,h.uid).nodes.filter(n=>n.canLearn&&n.on!==false);
    if(!nodes.length)return null;
    const mode=c.buildModes[h.uid]??(window.__qaVariant.mastery??'balanced'),magic=!Q.heroCombat(c.G,h).basic_attack;
    if(c.policy==='book_first'&&mode==='balanced')return masteryOrder(c,h,nodes)[0]??null;
    if(mode==='survival'){
        const wanted=[['hp_flat',3],['res_all',3],['damage_reduction',2]];
        for(const [stat,n]of wanted){const node=nodes.find(x=>x.stat===stat&&x.rank<n);if(node)return node;}
    }
    if(mode==='offense'){
        const stats=magic?['cooldown_reduction','cast_speed_pct','atk_pct','res_reduction']:['atk_pct','aspd_pct','hit_bonus','crit_rate'];
        const hit=nodes.filter(n=>stats.includes(n.stat)).sort((a,b)=>stats.indexOf(a.stat)-stats.indexOf(b.stat))[0];
        if(hit)return hit;
    }
    for(const [id,rank]of classPlans[h.cls]??[]){const n=nodes.find(n=>n.id===id&&n.rank<rank);if(n)return n;}
    return masteryOrder(c,h,nodes)[0]??null;
}
function allocate(c,t){
    for(const h of party(c.G)){
        const spent={};let points=0;
        for(let guard=0;guard<100;guard++){
            const n=chooseNode(c,h);if(!n)break;
            const r=Q.learnMastery(c.G,h.uid,n.id);if(!r.ok)throw Error('mastery '+JSON.stringify(r));
            spent[n.id]=(spent[n.id]??0)+1;points++;
        }
        if(points){c.count.masterySpent+=points;action(c,'masterySpent',t,{hero:h.uid,points,nodes:spent});}
    }
}
function equipAll(c,t){
    const G=c.G;
    for(const h of party(G)){
        const before=might(Q.heroCombat(G,h)),a=Q.autoEquip(G,h.uid,1),after=might(Q.heroCombat(G,h));
        c.count.autoEquipCalls++;
        if(a.changes?.length){
            c.count.equipMoves+=a.changes.length;c.count.equipButtonsWithChanges++;
            if(after>before+1e-7){c.count.mightImprovements++;c.equipGainTimes.push(t);first(c,'equipmentGain',t,{hero:h.uid});}
            for(const x of a.changes){c.everEquipped.add(x.item);if(c.origins[x.item]?.kind==='drop')c.usefulDropUids.add(x.item);}
            action(c,'autoEquipChanged',t,{hero:h.uid,changes:a.changes,before:r3(before),after:r3(after)});
        }
        // Public comparison includes actual ring target and the hero's current equipment.
        for(let pass=0;pass<3;pass++){
            const base=might(Q.heroCombat(G,h));
            const candidates=G.bags[0].map(u=>G.items[u]).filter(i=>i&&!i.box&&['ring','amulet'].includes(i.slot)&&!SYS.item.canEquip(h,i));
            const choice=candidates.map(i=>({i,value:might(Q.heroCombatIf(G,h,i.uid))})).sort((a,b)=>b.value-a.value)[0];
            if(!choice||choice.value<=base+1e-7)break;
            const r=Q.equip(G,h.uid,choice.i.uid);if(!r.ok)throw Error('accessory '+JSON.stringify(r));
            c.count.equipMoves++;c.everEquipped.add(choice.i.uid);
            if(c.origins[choice.i.uid]?.kind==='drop')c.usefulDropUids.add(choice.i.uid);
            action(c,'accessoryChanged',t,{hero:h.uid,uid:choice.i.uid,before:r3(base),after:r3(choice.value)});
        }
    }
}
function openBoxes(c,t){
    const G=c.G;
    for(let guard=0;guard<100;guard++){
        const uid=G.bags[0].find(u=>G.items[u]?.box);if(!uid)break;
        const boxKind=G.items[uid].box.kind,hs=party(G);
        const score=h=>boxKind==='weapon'?might(Q.heroCombat(G,h)):avg(ARMOR.map(p=>G.items[h.equipped[p]]?.ilvl??0));
        const h=[...hs].sort((a,b)=>score(a)-score(b))[0],before=new Set(Object.keys(G.items));
        const r=Q.openBox(G,uid,h.uid);if(!r.ok)throw Error('box '+JSON.stringify(r));
        const added=Object.values(G.items).filter(i=>!before.has(i.uid));
        for(const i of added)c.origins[i.uid]={kind:'box',t};
        c.count.boxesOpened++;action(c,'boxOpened',t,{boxKind,hero:h.uid,items:added.map(i=>i.uid)});
    }
}
function recycle(c,t){
    const keep=keepFuture(c),G=c.G;let n=0;
    for(const uid of [...G.bags[0]]){
        const i=G.items[uid];if(!i||i.box||i.locked||keep.has(uid))continue;
        const r=Q.salvage(G,uid);if(r.ok){n++;c.count.salvaged++;}
    }
    if(n)action(c,'salvageBatch',t,{n});
}
function construct(c,t,id,reserve=300){
    const G=c.G,s=Q.constructionState(G).buildings.find(b=>b.id===id);
    const cost=s?.next?.cost?.find(x=>x.res==='gold')?.need??0;
    if(!s||s.next.err||G.resources.gold-cost<reserve)return false;
    const before=G.resources.gold,r=Q.construct(G,id,START+t*1000);
    if(!r.ok)throw Error('build '+JSON.stringify(r));
    const gold=before-G.resources.gold;c.count.buildGold+=gold;action(c,'construct',t,{id,rank:r.rank,gold});return true;
}
function matchingBlueprints(G,h){
    return Q.bookState(G,h.uid).craft.filter(b=>{
        const d=SYS.skill.defs[b.id];return d&&(!d.needsWeapon||d.classId===h.cls);
    }).sort((a,b)=>{
        const score=id=>{const p=bookPreferences[h.cls]??[],i=p.indexOf(id);return i<0?100:i;};
        return score(a.id)-score(b.id);
    });
}
function wantsFirstBook(G){return party(G).some(h=>!h.bookSkill&&h.level>=8&&matchingBlueprints(G,h).some(b=>b.id!==h.innate));}
function savingBook(c){
    return (c.G.buildings.library??0)<2&&(wantsFirstBook(c.G)||c.policy==='book_first'&&party(c.G).some(h=>!h.bookSkill&&matchingBlueprints(c.G,h).some(b=>b.id!==h.innate)));
}
function books(c,t){
    const G=c.G,now=START+t*1000;
    for(const h of party(G)){
        if(Q.bookState(G,h.uid).hero.err)continue;
        const owned=Q.bookState(G,h.uid).books.filter(b=>{
            const d=SYS.skill.defs[b.id];
            return d&&(!d.needsWeapon||d.classId===h.cls)&&!b.plan.err&&(!h.bookSkill?b.id!==h.innate:b.id===h.innate);
        }).sort((a,b)=>Number(SYS.skill.defs[b.id].classId===h.cls)-Number(SYS.skill.defs[a.id].classId===h.cls));
        if(owned.length){
            const id=owned[0].id,beforeGold=G.resources.gold,beforeBooks=clone(G.books);
            const r=Q.learnBook(G,h.uid,id,now);if(!r.ok)throw Error('owned learn '+JSON.stringify(r));
            c.count.booksLearned++;c.count.ownedBooksLearned=(c.count.ownedBooksLearned??0)+1;
            action(c,'learnBook',t,{hero:h.uid,id,result:r,source:'owned',beforeGold,afterGold:G.resources.gold,beforeBooks,afterBooks:clone(G.books)});
        }
        let choices=matchingBlueprints(G,h).filter(b=>!b.err);
        // New class skill first, then one innate upgrade per management. No replacing learned skills.
        const b=!h.bookSkill?choices.find(b=>b.id!==h.innate):choices.find(b=>b.id===h.innate);
        if(!b||G.resources.gold-b.gold<300)continue;
        const before={gold:G.resources.gold,materials:clone(G.materials),blueprints:clone(G.blueprints)};
        const craft=Q.craftBook(G,b.id);if(!craft.ok)throw Error('craft '+JSON.stringify(craft));
        c.count.bookGold+=before.gold-G.resources.gold;c.count.booksCrafted++;
        action(c,'craftBook',t,{hero:h.uid,id:b.id,gold:before.gold-G.resources.gold,before,after:{gold:G.resources.gold,materials:clone(G.materials),blueprints:clone(G.blueprints)}});
        const r=Q.learnBook(G,h.uid,b.id,now);if(!r.ok)throw Error('learn '+JSON.stringify(r));
        c.count.booksLearned++;action(c,'learnBook',t,{hero:h.uid,id:b.id,result:r});
    }
    inspectSkills(c,t);
}
function stockPotions(c,t){
    const G=c.G,boss=c.target===BOSS&&!c.farm;
    const hp=median(party(G).map(h=>Q.heroCombat(G,h).hp_max));
    const available=Q.shopState(G,START+t*1000).potions;
    let id='minor_healing';
    if(boss)id=(available.find(p=>p.heal>=hp*.35)??available.at(-1)).id;
    if(c.farm)id=null;
    for(let i=0;i<Q.limitsOf(G).potionSlots;i++){
        const r=Q.setPotionSlot(G,i,id);if(!r.ok)throw Error('potion slot '+JSON.stringify(r));
    }
    if(!id||!Q.hasFeature(G,'shop'))return;
    const unit=Q.shopPotionGold(id,1),want=Math.max(0,10-(G.potions[id]??0));
    const n=Math.min(want,Math.floor(Math.max(0,G.resources.gold-300)/unit));
    if(n){const r=Q.shopPotionBuy(G,id,n);if(!r.ok)throw Error('buy potion '+JSON.stringify(r));
        c.count.potionsBought+=n;c.count.potionBuyGold+=r.gold;action(c,'potionRefill',t,{id,units:n,gold:r.gold});}
}
function shop(c,t,reserve){
    const G=c.G,now=START+t*1000;if(!Q.hasFeature(G,'shop'))return;
    let s=Q.shopState(G,now);
    const leader=[...party(G)].sort((a,b)=>b.level-a.level)[0];
    if(s.free&&s.level<leader.level){const r=Q.shopReroll(G,s.list,now,leader.uid);if(!r.ok)throw Error('reroll '+JSON.stringify(r));
        action(c,'shopFreeRefresh',t,{level:leader.level});s=Q.shopState(G,now);}
    const choices=[];
    for(let i=0;i<s.equip.length;i++){
        const e=s.equip[i];if(e.locked||e.sold||e.item.slot!=='weapon'||G.resources.gold-e.gold<reserve)continue;
        for(const h of party(G))if(SYS.item.fitsClass(e.item,h.cls)&&!SYS.item.canEquip(h,e.item)){
            const before=might(Q.heroCombat(G,h)),after=might(Q.heroCombatWith(G,h,e.item)),ratio=after/Math.max(1e-9,before);
            if(ratio>=1.15)choices.push({i,e,h,ratio});
        }
    }
    const best=choices.sort((a,b)=>b.ratio-a.ratio)[0];if(!best)return;
    const before=G.resources.gold,r=Q.shopBuy(G,best.i,s.list,now,1);if(!r.ok)throw Error('shop '+JSON.stringify(r));
    c.count.shopGold+=before-G.resources.gold;c.count.shopItems++;
    action(c,'shopBuy',t,{hero:best.h.uid,gold:before-G.resources.gold,item:r.uid??r.item?.uid,ratio:r3(best.ratio)});
    equipAll(c,t);
}
function activeManage(c,t){
    const G=c.G,now=START+t*1000,beforeActions=c.actionTimes.length;
    const mail=Q.claimAllMail(G);if(mail.n)action(c,'mailClaim',t,{n:mail.n});
    openBoxes(c,t);equipAll(c,t);allocate(c,t);recycle(c,t);
    for(const id of ['shop','tavern','forge','storage']){
        if((G.buildings[id]??0)===0)construct(c,t,id,id==='shop'?0:300);
    }
    const lab=Q.labState(G,now),res=lab.lines.find(l=>l.line==='res');
    if(res?.open&&res.seats.uids.length<res.seats.cap){
        const h=G.heroes.filter(h=>!Q.labRegOf(G,h.uid)).sort((a,b)=>b.stats.str-a.stats.str)[0];
        if(h&&Q.labRegister(G,h.uid,'res',now).ok)action(c,'resourceRegister',t,{hero:h.uid});
    }
    Q.commissionFill(G);
    for(const cm of Q.commissionState(G).cards)if(cm.taken&&cm.done){const r=Q.commissionClaim(G,cm.no);if(r.ok){c.count.commissionGold+=r.gold;action(c,'commissionClaim',t,{no:cm.no,gold:r.gold});}}
    Q.commissionFill(G);for(const cm of Q.commissionState(G).cards)if(cm.canTake&&Q.commissionTake(G,cm.no).ok)action(c,'commissionTake',t,{no:cm.no,commissionKind:cm.kind});
    if(wantsFirstBook(G)&&(G.buildings.library??0)<2)construct(c,t,'library',D.balance.book_craft_gold+300);
    books(c,t);stockPotions(c,t);
    const reserve=savingBook(c)?4300:300;
    shop(c,t,reserve);
    if(Q.hasFeature(G,'upgrade_item'))for(const h of party(G))for(const pos of ['weapon','armor','helmet','gloves','boots']){
        const uid=h.equipped[pos],i=G.items[uid];if(!i||i.up>=3)continue;
        const u=Q.upgradeState(G,uid);if(!u?.canUpgrade||G.resources.gold-u.cost<reserve)continue;
        const saving=savingBook(c);
        if(saving&&u.mats.some(m=>m.have-m.need<({iron_ore:30,timber:30,dust:10}[m.id]??0)))continue;
        const before=G.resources.gold,r=Q.upgradeItem(G,uid);if(!r.ok)throw Error('upgrade '+JSON.stringify(r));
        c.count.upgradeAttempts++;c.count.upgradeSuccesses+=Number(r.success);c.count.upgradeGold+=before-G.resources.gold;
        action(c,'upgrade',t,{hero:h.uid,pos,uid,success:r.success,up:r.up,gold:before-G.resources.gold});
    }
    if(c.actionTimes.length>beforeActions)c.count.meaningfulManagementSessions++;
    inspectSkills(c,t);check(c,t);
}
function farmStart(c,target,t){
    const place=D.stages[target].place??Math.floor(target/10);
    const earlier=D.stageOrder.filter(id=>id<target&&id<BOSS&&Q.stageCleared(c.G,id,'normal'));
    // CSV stage IDs encode place in the tens; all three cells repeat via nextRepeat.
    const previous=earlier.filter(id=>Math.floor(id/10)<Math.floor(target/10));
    const last=previous.at(-1),start=last==null?earlier[0]:Math.floor(last/10)*10+1;
    if(start==null)return false;
    c.farm={stage:start,target,wins:0,attempts:0,repeat:last!=null};
    c.count.guideResponses++;action(c,'farmResponse',t,{stage:start,target,repeat:c.farm.repeat});return true;
}
function afterLoss(c,t,R,stage){
    c.losses[stage]=(c.losses[stage]??0)+1;
    if(c.losses[stage]<(window.__qaVariant.lossTrigger??3))return false;
    if(!c.resetTargets.has(stage)){
        c.resetTargets.add(stage);
        for(const h of party(c.G)){
            const r=Q.resetMastery(c.G,h.uid);if(!r.ok)throw Error('reset '+JSON.stringify(r));
            c.buildModes[h.uid]=R.reason==='timeout'?'offense':'survival';
            c.count.respecs++;action(c,'freeMasteryReset',t,{hero:h.uid,points:r.refunded,mode:c.buildModes[h.uid],stage});
        }
    }
    return farmStart(c,stage,t);
}
function hashReport(s){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return(h>>>0).toString(16);}
window.runActiveQA=async function(seed,policy='active',save=true){
    MARKS=[window.QA_HORIZON??5400];const began=performance.now(),G=Q.newGame(seed,SYS.hero.rollStartParty(makeRng(1000+seed),D.balance.party_size_max),START);
    const count={runs:0,wins:0,losses:0,timeouts:0,downed:0,firstClears:0,drops:0,rarities:{},overflow:0,maxBag:0,heroXp:0,actualXp:0,battleGold:0,blueprints:0,failedRoundKills:0,failedRoundRawXp:0,failedRoundUnmappedKills:0,levelUps:0,newActiveSkills:0,boxesGranted:0,boxesOpened:0,autoEquipCalls:0,equipButtonsWithChanges:0,equipMoves:0,mightImprovements:0,autoEquipMightDecreases:0,accessoryProxyChanges:0,masterySpent:0,salvaged:0,buildGold:0,researchGold:0,commissionGold:0,potionsBought:0,potionBuyGold:0,potionsConsumed:0,potionConsumedValue:0,upgradeAttempts:0,upgradeSuccesses:0,upgradeGold:0,meaningfulManagementSessions:0,waitingSec:0,combatWallSec:0,farmingRuns:0,guideAppearances:0,guideResponses:0,respecs:0,bookGold:0,booksCrafted:0,booksLearned:0,shopGold:0,shopItems:0,actions:{}};
    const c={G,seed,policy,count,first:{},events:[],rounds:[],runs:[],clears:[],origins:{},skills:Object.fromEntries(party(G).map(h=>[h.uid,skillIds(h)])),everEquipped:new Set(),usefulDropUids:new Set(),rewardTimes:[],xpTimes:[],dropTimes:[],levelTimes:[],equipGainTimes:[],actionTimes:[],failures:[],current:null,buildModes:{},losses:{},resetTargets:new Set(),target:D.stageOrder[0],farm:null};
    CURRENT=c;
    const cadence=window.__qaVariant.management??(policy==='active_slow'?300:120),checkpoints=[],reportHashes=[];
    let t=0,nextTick=0,nextManagement=0,p=null,pending=null,won=false,arrival=null,iterations=0;
    const initial=Q.serialize(G,START);
    Q.labSettle(G,START);
    const checkpoint=async mark=>{
        Q.labSettle(G,START+t*1000);check(c,t);
        const snap=snapshot(c,t);snap.features={hire:Q.hasFeature(G,'hire'),bookCraft:Q.hasFeature(G,'book_craft')};
        checkpoints.push(snap);
        if(window.storeCheckpoint)await window.storeCheckpoint({seed,policy,mark,snapshot:snap,state:save?Q.serialize(G,START+t*1000):null});
    };
    for(const mark of MARKS){
        while(t<mark-1e-7&&!won){
            if(++iterations>100000)throw Error('loop guard '+JSON.stringify({t,nextTick,nextManagement,pending,p,current:c.current?.stage}));
            if(t>=nextTick-1e-7){Q.labSettle(G,START+t*1000);check(c,t);nextTick+=60;}
            if(t>=nextManagement-1e-7){activeManage(c,t);nextManagement+=cadence;}
            const stop=Math.min(mark,nextTick,nextManagement);
            if(!c.current){
                const departAt=pending?.at??START,wait=Math.max(0,Math.min(stop,(departAt-START)/1000)-t);
                count.waitingSec+=wait;t+=wait;
                if(START+stop*1000<departAt||t>=stop-1e-7)continue;
                const stage=pending?.stageId??D.stageOrder[0],from=pending?.from??null;
                const ru={stage,diff:'normal',start:t,enemyMap:new Map(),handle:null,pending:null,potionUnits:0,potionValue:0};c.current=ru;
                globalThis.__qaStage=stage;const d=Q.departRun(G,stage,START+t*1000,1,from,'normal');if(!d.ok)throw Error('depart '+JSON.stringify(d));
                ru.handle=d.run;
                if(c.farm&&c.farm.repeat)G.runs[0].repeat=true;
                else G.runs[0].repeat=false;
                p=paceAt(d.run.result.timeline,0);pending=null;first(c,'departure',t,{stage});
                if(stage===BOSS&&arrival==null){arrival=t;first(c,'bossArrival',t,{levels:party(G).map(h=>h.level)});}
            }
            if(t>=stop-1e-7)continue;
            const ru=c.current,oldP=p.t,left=paceStep(p,ru.handle.result.timeline,(stop-t)*1000,CFG,s=>{Q.stepRun(G,ru.handle,s);finishPending(c,ru);});
            const used=(stop-t)*1000-left;t+=used/1000;count.combatWallSec+=used/1000;Q.addExpTime(G,Math.max(0,p.t-oldP)*1000);
            if(p.done){
                const R=ru.handle.report;Q.noteRunEnd(G,ru.handle,START+t*1000);
                reportHashes.push(hashReport(JSON.stringify(R)));
                c.runs.push({t:r3(t),start:r3(ru.start),stage:ru.stage,diff:'normal',won:R.won,reason:R.reason,roundsCleared:R.roundsCleared,wallSec:r3(t-ru.start),combatSec:R.durationSec,xp:sum(Object.values(R.xp)),gold:R.gold,drops:R.drops.length,overflow:R.discarded,downed:R.downed.length,potionUnits:ru.potionUnits,potionValue:ru.potionValue,farming:!!c.farm});
                count.runs++;count.wins+=Number(R.won);count.losses+=Number(!R.won);count.timeouts+=Number(R.reason==='timeout');count.downed+=R.downed.length;
                if(!R.won)first(c,'defeat',t,{stage:ru.stage,reason:R.reason});
                if(ru.stage===BOSS&&R.won){won=true;first(c,'bossClear',t,{levels:party(G).map(h=>h.level)});}
                const nx=Q.nextRepeat(G,START+t*1000,1);pending=nx?{...nx,from:ru.handle}:null;
                if(!won){
                    const wasFarming=!!c.farm;
                    const restart=START+t*1000+D.balance.repeat_restart_sec*1000;
                    if(c.farm){
                        count.farmingRuns++;c.farm.attempts++;c.farm.wins+=Number(R.won);
                        if(!R.won){
                            const lower=Math.floor(c.farm.stage/10)*10-9;
                            if(lower>=1011&&Q.stageCleared(G,lower,'normal')){c.farm.stage=lower;c.farm.repeat=true;pending={stageId:lower,difficulty:'normal',at:restart,from:null};}
                        }
                        if(c.farm.wins>=(window.__qaVariant.farmWins??3)||c.farm.attempts>=((window.__qaVariant.farmWins??3)+2)){pending={stageId:c.farm.target,difficulty:'normal',at:restart,from:null};c.target=c.farm.target;c.farm=null;}
                        else if(!c.farm.repeat)pending={stageId:c.farm.stage,difficulty:'normal',at:restart,from:null};
                    }else if(!R.won&&afterLoss(c,t,R,ru.stage))pending={stageId:c.farm.stage,difficulty:'normal',at:restart,from:null};
                    else {c.target=pending?.stageId??ru.stage;if(R.won)c.losses[ru.stage]=0;}
                    // Respond to an observed defeat or a new reward immediately; no battle foresight.
                    if(!R.won||R.clearBox||wasFarming!==!!c.farm||c.target===BOSS)activeManage(c,t);
                }
                c.current=null;p=null;
                if(count.runs%100===0)await new Promise(r=>setTimeout(r,0));
            }else if(!(used>0))throw Error('no progress '+t);
        }
        if(won)break;
        await checkpoint(mark);
    }
    await checkpoint('end');
    return {seed,policy,wallSeconds:r3((performance.now()-began)/1000),metadata:{cadence,pace:CFG,initialParty:'first roll, no reroll',noOracle:true,firstBossStop:true},seconds:r3(t),arrivalSeconds:arrival==null?null:r3(arrival),clearSeconds:won?r3(t):null,won,initial,final:Q.serialize(G,START+t*1000),checkpoints,first:c.first,count,clears:c.clears,events:c.events,rounds:c.rounds,runs:c.runs,reportHashes,failures:c.failures};
};
window.qaReady=true;

    window.resetExperiment=function(v){
        globalThis.__qaVariant=v;globalThis.__qaStage=null;
        const fresh=structuredClone(BASE_DATA);for(const k of Object.keys(D))delete D[k];Object.assign(D,fresh);
        D.balance.skillbook_learn_level=v.bookLevel??10;D.balance.start_weapon_atk_pct=v.starter??1;
        if((v.rounds??9)!==9){
            const n=v.rounds,types=n===7?['normal','normal','elite','normal','normal','elite']:['normal','elite','normal','elite'];
            for(const [key,last]of [['qa_early_standard','boss'],['qa_early_elite','elite']])D.roundSets[key]=[...types,last].map((round_type,i)=>({round_set:key,round_num:i+1,round_type}));
            for(const s of [...Object.values(D.stages),...D.stageList])if(s.chapter===1&&s.stage_num<5)s.round_set=s.round_set==='standard'?'qa_early_standard':'qa_early_elite';
        }
        for(const c of D.classes){const add=c.startRow==='front'?(v.frontHp??0):(v.backHp??0);if(add&&c.hpBase!=null)c.hpBase+=add;}SYS=buildSystems(D);Q=SYS.game;installObservation();
    };
    window.readExperiment=()=>({data:structuredClone(D),balance:structuredClone(D.balance)});
    
window.scopeEvidence=function(){
 const out=[];
 for(const difficulty of ['normal','nightmare','hell'])for(const stage of [1011,1051,2011]){
   globalThis.__qaStage=stage;
   const s=D.stages[stage],id=stage===1051?s.boss_monster_idx:SYS.battle.stagePool(s)[0],grade=stage===1051?'chapter_boss':'normal';
   const unit=SYS.battle.makeEnemy('qa',id,grade,s.dlvl,[],{difficulty});
   out.push({stage,difficulty,monster:id,grade,hp:unit.sheet.hp_max,physical:unit.sheet.atk_physical,magic:unit.sheet.atk_magic,xp:unit.expReward});
 }
 const heroes=[];
 for(const cls of SYS.hero.mainClasses){
   const h=SYS.hero.rollHeroOf(makeRng(777),cls);
   for(const level of [1,10,50]){const c=SYS.hero.computeCombat({...h,level},[]);heroes.push({cls,level,hp:c.hp_max,physical:c.atk_physical,magic:c.atk_magic});}
 }
 globalThis.__qaStage=null;return{enemies:out,heroes};
};
