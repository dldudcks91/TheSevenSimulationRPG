"""Restore full observation/accounting for finalist verification only."""
from pathlib import Path

BASE=Path(__file__).resolve().parent.parent
HERE=BASE/'harness'
observer=(HERE/'observer.js').read_text(encoding='utf-8')
observer=observer.replace("import {paceOf} from '/ui/battle.js';",'')
observer=observer.replace("import {paceAt,paceStep} from '/ui/pace.js';","import {paceAt,paceStep,paceCfg} from '/ui/pace.js';")
old='const SYS=buildSystems(D),Q=SYS.game,START=Date.UTC(2026,9,30,0),CFG=paceOf(1);'
assert observer.count(old)==1
observer=observer.replace(old,"let SYS=buildSystems(D),Q=SYS.game;const START=Date.UTC(2026,9,30,0),CFG=paceCfg('off',true,1,1),BASE_DATA=structuredClone(D);")
a=observer.index('const originalCreateRun=SYS.battle.createRun;')
b=observer.index('function keepFuture(c)')
observer=observer[:a]+'function installObservation(){\n'+observer[a:b]+'\n}\ninstallObservation();\n'+observer[b:]
observer=observer.replace('SYS.battle.createRun=(...args)=>{','SYS.battle.createRun=(...args)=>{if(window.QA_SKIP_OBSERVATION)return originalCreateRun(...args);')
observer=observer.replace('*D.balance.xp_rate;used++;',"*D.balance.xp_rate*(ru.diff==='normal'&&D.stages[ru.stage]?.chapter===1?(window.__qaVariant?.xp??1):1);used++;")
active=(HERE/'active.js').read_text(encoding='utf-8')
active=active.replace('const BOSS=1051, MARKS=[600,1200,1500,1800,2100,2400,2700,3600,5400];','const BOSS=1051;let MARKS=[5400];')
active=active.replace("const began=performance.now(),G=Q.newGame(seed,SYS.hero.rollStartParty(makeRng(1000+seed),D.balance.party_size_max),START);",
                      "MARKS=[window.QA_HORIZON??5400];const began=performance.now(),G=Q.newGame(seed,SYS.hero.rollStartParty(makeRng(1000+seed),D.balance.party_size_max),START);")
active=active.replace("const d=Q.departRun(G,stage,START+t*1000,1,from,'normal');","globalThis.__qaStage=stage;const d=Q.departRun(G,stage,START+t*1000,1,from,'normal');")
replacements={
    "const mode=c.buildModes[h.uid]??'balanced'":"const mode=c.buildModes[h.uid]??(window.__qaVariant.mastery??'balanced')",
    "const cadence=policy==='active_slow'?300:120":"const cadence=window.__qaVariant.management??(policy==='active_slow'?300:120)",
    'if(c.losses[stage]<3)return false;':'if(c.losses[stage]<(window.__qaVariant.lossTrigger??3))return false;',
    'c.farm.wins>=3||c.farm.attempts>=5':'c.farm.wins>=(window.__qaVariant.farmWins??3)||c.farm.attempts>=((window.__qaVariant.farmWins??3)+2)',
}
for old,new in replacements.items():
    assert active.count(old)==1,old
    active=active.replace(old,new)
compiled=(HERE/'generated_entry.mjs').read_text(encoding='utf-8')
reset=compiled[compiled.index('    window.resetExperiment=function(v){'):]
reset=reset.replace('SYS=buildSystems(D);Q=SYS.game;',"for(const c of D.classes){const add=c.startRow==='front'?(v.frontHp??0):(v.backHp??0);if(add&&c.hpBase!=null)c.hpBase+=add;}SYS=buildSystems(D);Q=SYS.game;installObservation();")
source=observer+'\n'+active+'\n'+reset
import re
source=re.sub(r"from '/(.*?)'",lambda m:"from '../snapshot/src/"+m[1]+"'",source)
source+='''
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
'''
(HERE/'generated_audit_entry.mjs').write_text(source,encoding='utf-8')
print('Full accounting entry prepared.')
