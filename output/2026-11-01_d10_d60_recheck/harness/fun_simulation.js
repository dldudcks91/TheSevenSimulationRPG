import {loadData,buildSystems,D} from '/ui/data.js';
import {makeRng} from '/game_logic/rng.js';
import {paceAt,paceStep} from '/ui/pace.js';
import {paceOf} from '/ui/battle.js';
await loadData('/data/');
const SYS=buildSystems(D),Q=SYS.game,START=Date.UTC(2026,9,30,0),CFG=paceOf(1);
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
function event(c,kind,t,detail={}){c.events.push({t:r3(t),kind,...detail});}
function action(c,kind,t,detail={}){const a=c.count.actions;a[kind]=(a[kind]??0)+1;event(c,kind,t,detail);c.actionTimes.push(t);first(c,kind,t,detail);}
function inspectSkills(c,t){for(const h of party(c.G)){const old=c.skills[h.uid]??=[];for(const id of skillIds(h))if(!old.includes(id)){old.push(id);first(c,'newActiveSkill',t,{hero:h.uid,id});event(c,'newActiveSkill',t,{hero:h.uid,id});c.count.newActiveSkills++;}}}
function rawLost(c,ru,s){
    if(s.cleared)return {kills:0,xp:0,unmapped:0};
    const killed=ru.handle.result.rounds.find(r=>r.n===s.n)?.killed??[],need=new Map();for(const id of killed)need.set(id,(need.get(id)??0)+1);
    let xp=0,used=0;const downed=new Set();
    for(const ev of ru.handle.result.timeline){if(ev.e!=='down'||downed.has(ev.u))continue;downed.add(ev.u);const e=ru.enemyMap.get(ev.u);if(!e||e.round!==s.n||!(need.get(e.monsterId)>0))continue;need.set(e.monsterId,need.get(e.monsterId)-1);const m=D.monsters[e.monsterId],lv=Math.min(D.balance.hero_level_cap,ru.handle.report.level+(m?.level_add??0));xp+=(xpAt.get(lv)??0)*(D.grades[e.grade]?.exp_mult??1)*(m?.exp_coef??1)*(1+(e.farmXp??0))*D.balance.xp_rate;used++;}
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
const originalCreateRun=SYS.battle.createRun;
SYS.battle.createRun=(...args)=>{
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
function manage(c,t){
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
window.runFunQA=async function(seed,policy,save=true,combatPriority={}){
    const began=performance.now(),G=Q.newGame(seed,SYS.hero.rollStartParty(makeRng(1000+seed),D.balance.party_size_max),START);
    const count={runs:0,wins:0,losses:0,timeouts:0,downed:0,firstClears:0,drops:0,rarities:{},overflow:0,maxBag:0,heroXp:0,actualXp:0,battleGold:0,blueprints:0,failedRoundKills:0,failedRoundRawXp:0,failedRoundUnmappedKills:0,levelUps:0,newActiveSkills:0,boxesGranted:0,boxesOpened:0,autoEquipCalls:0,equipButtonsWithChanges:0,equipMoves:0,mightImprovements:0,autoEquipMightDecreases:0,accessoryProxyChanges:0,masterySpent:0,salvaged:0,buildGold:0,researchGold:0,commissionGold:0,potionsBought:0,potionBuyGold:0,potionsConsumed:0,potionConsumedValue:0,upgradeAttempts:0,upgradeSuccesses:0,upgradeGold:0,meaningfulManagementSessions:0,waitingSec:0,combatWallSec:0,farmingRuns:0,guideAppearances:0,guideResponses:0,respecs:0,actions:{}};
    const c={G,seed,policy,combatPriority,count,first:{},events:[],rounds:[],runs:[],clears:[],origins:{},skills:Object.fromEntries(party(G).map(h=>[h.uid,skillIds(h)])),everEquipped:new Set(),usefulDropUids:new Set(),rewardTimes:[],xpTimes:[],dropTimes:[],levelTimes:[],equipGainTimes:[],actionTimes:[],failures:[],current:null};CURRENT=c;
    const checkpoints=[];let t=0,nextTick=0,nextManagement=0,p=null,pending=null,farm=null,lastGuideKey=null,respecced=false;
    Q.labSettle(G,START);
    for(const mark of window.QA_MARKS??[600,3600,86400]){
        while(t<mark-1e-7){
            if(t>=nextTick-1e-7){Q.labSettle(G,START+t*1000);check(c,t);nextTick+=60;}
            if(t>=nextManagement-1e-7){if(policy!=='passive')manage(c,t);nextManagement+=300;}
            const stop=Math.min(mark,nextTick,nextManagement);
            if(!c.current){
                const departAt=pending?.at??START;
                const wait=Math.max(0,Math.min(stop,(departAt-START)/1000)-t);c.count.waitingSec+=wait;t+=wait;
                if(START+stop*1000<departAt||t>=stop-1e-7)continue;
                const stage=pending?.stageId??D.stageOrder[0],diff=pending?.difficulty??'normal',from=pending?.from??null;
                const ru={stage,diff,start:t,enemyMap:new Map(),handle:null,pending:null,potionUnits:0,potionValue:0};c.current=ru;
                const d=Q.departRun(G,stage,START+t*1000,1,from,diff);
                if(!d.ok){c.failures.push({t,kind:'depart',stage,diff,err:d.err});c.current=null;pending={stageId:stage,difficulty:diff,from:null,at:START+stop*1000+1000};t=stop;continue;}
                ru.handle=d.run;p=paceAt(d.run.result.timeline,0);pending=null;first(c,'departure',t,{stage,diff});
            }
            if(t>=stop-1e-7)continue;
            const ru=c.current,oldP=p.t,left=paceStep(p,ru.handle.result.timeline,(stop-t)*1000,CFG,s=>{Q.stepRun(G,ru.handle,s);finishPending(c,ru);});
            const used=(stop-t)*1000-left;t+=used/1000;c.count.combatWallSec+=used/1000;Q.addExpTime(G,Math.max(0,p.t-oldP)*1000);
            if(p.done){
                const R=ru.handle.report;Q.noteRunEnd(G,ru.handle,START+t*1000);
                const row={t:r3(t),start:r3(ru.start),stage:ru.stage,diff:ru.diff,won:R.won,reason:R.reason,roundsCleared:R.roundsCleared,wallSec:r3(t-ru.start),combatSec:R.durationSec,xp:sum(Object.values(R.xp)),gold:R.gold,drops:R.drops.length,overflow:R.discarded,downed:R.downed.length,potionUnits:ru.potionUnits,potionValue:ru.potionValue,farming:!!farm};c.runs.push(row);
                count.runs++;count.wins+=Number(R.won);count.losses+=Number(!R.won);count.timeouts+=Number(R.reason==='timeout');count.downed+=R.downed.length;if(farm)count.farmingRuns++;
                if(!R.won)first(c,'defeat',t,{stage:ru.stage,reason:R.reason});
                const nx=Q.nextRepeat(G,START+t*1000,1);pending=nx?{...nx,from:ru.handle}:null;
                const guide=Q.notificationState(G,START+t*1000).guide,guideKey=guide?.id==='retryPreparation'?`${guide.target.difficulty}|${guide.target.stageId}`:null;
                if(guideKey&&guideKey!==lastGuideKey){count.guideAppearances++;first(c,'retryGuide',t,{...guide.target});event(c,'retryGuide',t,{...guide.target});}lastGuideKey=guideKey;
                if(policy==='adaptive'){
                    if(farm){farm.left--;const dest=farm.left>0?farm.stage:farm.target;pending={stageId:dest,difficulty:ru.diff,at:START+t*1000+D.balance.repeat_restart_sec*1000,from:null};if(farm.left===0)farm=null;}
                    else if(guideKey){
                        if(!respecced){for(const h of party(G)){const r=Q.resetMastery(G,h.uid);if(r.ok&&r.refunded>0){count.respecs++;action(c,'freeMasteryReset',t,{hero:h.uid,points:r.refunded});}}manage(c,t);respecced=true;}
                        const earlier=D.stageOrder.slice(0,D.stageOrder.indexOf(ru.stage)).reverse().find(id=>D.stages[id].boss_grade!=='chapter_boss'&&Q.stageCleared(G,id,ru.diff));
                        if(earlier!=null){farm={stage:earlier,target:ru.stage,left:10};count.guideResponses++;action(c,'farmResponse',t,{stage:earlier,target:ru.stage,runs:10,guideAttempts:guide.target.attempts});pending={stageId:earlier,difficulty:ru.diff,at:START+t*1000+D.balance.repeat_restart_sec*1000,from:null};}
                    }
                }
                c.current=null;p=null;if(count.runs%100===0)await new Promise(r=>setTimeout(r,0));
            }else if(!(used>0))throw new Error(`no_progress seed${seed} ${policy} t${t}`);
        }
        Q.labSettle(G,START+mark*1000);const snap=snapshot(c,mark);checkpoints.push(snap);
        if(window.storeCheckpoint)await window.storeCheckpoint({seed,policy,mark,snapshot:snap,state:save?Q.serialize(G,START+mark*1000):null});
    }
    const result={seed,policy,wallSeconds:r3((performance.now()-began)/1000),metadata:{pace:CFG,managementSeconds:300,labTickSeconds:60,checkpoint:'before_exact_mark_management',mastery:policy==='basic'?'CSV order (weak/default proxy)':policy==='adaptive'?'combat priority + first guide free reset':'unused',futureLoot:'keep best future-level candidate per hero/slot, all craft/unique/set',noActions:['hire','skillbook craft/learn','advance','explore','tactic reroll','higher tier potions']},checkpoints,first:c.first,count,clears:c.clears,events:c.events,rounds:c.rounds,runs:c.runs,failures:c.failures};
    return result;
};
window.qaReady=true;window.qaMeta={pace:CFG,balance:{retryGuideRuns:D.balance.expedition_retry_guide_runs,repeatRestart:D.balance.repeat_restart_sec},stageOrder:D.stageOrder};
