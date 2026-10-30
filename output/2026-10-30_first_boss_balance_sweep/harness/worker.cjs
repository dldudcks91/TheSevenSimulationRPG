// Node VM runs the frozen repository ES modules; no package install or product edit.
const fs=require('fs'),path=require('path'),vm=require('vm');
const {performance}=require('perf_hooks');
const BASE=path.resolve(__dirname,'..'),SNAP=path.join(BASE,'snapshot','src');
const jobs=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const output=process.argv[3];
const cache=new Map();
const sandbox={performance,structuredClone,URL,URLSearchParams,TextEncoder,TextDecoder,console,
    setTimeout:(f,ms)=>setTimeout(f,ms),clearTimeout,
    location:{hostname:'127.0.0.1',search:'',href:'http://127.0.0.1/'},localStorage:{getItem:()=>null},
    fetch:async url=>{
        const relative=String(url).replace(/^\//,'');
        const file=path.resolve(SNAP,relative);
        if(!file.startsWith(SNAP+path.sep))throw Error('outside snapshot '+url);
        const body=fs.readFileSync(file,'utf8');
        return{ok:true,status:200,text:async()=>body,json:async()=>JSON.parse(body)};
    }};
sandbox.window=sandbox;
const context=vm.createContext(sandbox);
function replaceOnce(source,from,to){
    if(source.split(from).length!==2)throw Error('overlay anchor not unique: '+from);
    return source.replace(from,to);
}
function patchBattle(source){
    source=replaceOnce(source,'* B.monster_hp_scale * hpMultOf(difficulty)', '* B.monster_hp_scale * hpMultOf(difficulty) * qaFactor(m, grade, difficulty, "hp")');
    source=replaceOnce(source,'const dmgScale = B.monster_atk_scale * dmgMultOf(difficulty);','const dmgScale = B.monster_atk_scale * dmgMultOf(difficulty) * qaFactor(m, grade, difficulty, "attack");');
    source=replaceOnce(source,'expReward: MONSTER_XP.get(lvl) * g.exp_mult * m.exp_coef,','expReward: MONSTER_XP.get(lvl) * g.exp_mult * m.exp_coef * qaFactor(m, grade, difficulty, "xp"),');
    return source+`\nfunction qaFactor(m,grade,difficulty,kind){
        const d=typeof difficulty==='string'?difficulty:difficulty?.id??'normal';
        const v=globalThis.__qaVariant;
        if(!v||m.chapter!==1||d!=='normal'||(globalThis.__qaStage&&Math.floor(globalThis.__qaStage/1000)!==1))return 1;
        if(kind==='xp')return v.xp??1;
        if(grade==='chapter_boss')return kind==='hp'?v.bossHp??1:v.bossAttack??1;
        return kind==='hp'?v.enemyHp??1:v.enemyAttack??1;
    }\n`;
}
function moduleAt(file){
    file=path.resolve(file);
    if(cache.has(file))return cache.get(file);
    let source=fs.readFileSync(file,'utf8');
    if(file===path.join(SNAP,'game_logic','battle.js'))source=patchBattle(source);
    const mod=new vm.SourceTextModule(source,{context,identifier:file});cache.set(file,mod);return mod;
}
async function linker(spec,ref){return moduleAt(spec.startsWith('/')?path.join(SNAP,spec.slice(1)):path.resolve(path.dirname(ref.identifier),spec));}
async function main(){
    let observer=fs.readFileSync(path.join(__dirname,'observer.js'),'utf8');
    observer=observer.replace("import {paceOf} from '/ui/battle.js';",'');
    observer=observer.replace("import {paceAt,paceStep} from '/ui/pace.js';","import {paceAt,paceStep,paceCfg} from '/ui/pace.js';");
    observer=replaceOnce(observer,'const SYS=buildSystems(D),Q=SYS.game,START=Date.UTC(2026,9,30,0),CFG=paceOf(1);',
        "let SYS=buildSystems(D),Q=SYS.game;const START=Date.UTC(2026,9,30,0),CFG=paceCfg('off',true,1,1),BASE_DATA=structuredClone(D);");
    const start=observer.indexOf('const originalCreateRun=SYS.battle.createRun;'),end=observer.indexOf('function keepFuture(c)');
    if(start<0||end<start)throw Error('observer wrapper anchors');
    observer=observer.slice(0,start)+observer.slice(end);
    observer=observer.replace('function event(c,kind,t,detail={}){','function event(c,kind,t,detail={}){if(window.QA_LIGHT)return;');
    observer=observer.replace('function check(c,t){','function check(c,t){if(window.QA_LIGHT)return;');
    let active=fs.readFileSync(path.join(__dirname,'active.js'),'utf8');
    active=replaceOnce(active,'const BOSS=1051, MARKS=[600,1200,1500,1800,2100,2400,2700,3600,5400];','const BOSS=1051;let MARKS=[3600];');
    active=replaceOnce(active,"const began=performance.now(),G=Q.newGame(seed,SYS.hero.rollStartParty(makeRng(1000+seed),D.balance.party_size_max),START);",
        "MARKS=[window.QA_HORIZON??3600];const began=performance.now(),G=Q.newGame(seed,SYS.hero.rollStartParty(makeRng(1000+seed),D.balance.party_size_max),START);");
    active=active.replace('const initial=Q.serialize(G,START);','const initial=window.QA_LIGHT?null:Q.serialize(G,START);');
    active=active.replace('const snap=snapshot(c,t);','if(window.QA_LIGHT)return;const snap=snapshot(c,t);');
    active=active.replace("const d=Q.departRun(G,stage,START+t*1000,1,from,'normal');","globalThis.__qaStage=stage;const d=Q.departRun(G,stage,START+t*1000,1,from,'normal');");
    active=active.replace('reportHashes.push(hashReport(JSON.stringify(R)));','if(!window.QA_LIGHT)reportHashes.push(hashReport(JSON.stringify(R)));');
    active=active.replace('    return {seed,policy,wallSeconds:',`    if(window.QA_LIGHT)return {seed,policy,arrivalSeconds:arrival==null?null:r3(arrival),clearSeconds:won?r3(t):null,won,seconds:r3(t),runs:count.runs,losses:count.losses,farmingRuns:count.farmingRuns,booksLearned:count.booksLearned,ownedBooksLearned:count.ownedBooksLearned??0,gold:G.resources.gold,levels:party(G).map(h=>h.level),classes:party(G).map(h=>h.cls),stage:G.runs[0]?.stageId,bookIds:party(G).map(h=>h.bookSkill??null),timeBudgetMs:Math.round((count.waitingSec+count.combatWallSec)*1000),reportHashes,failures:c.failures};
    return {seed,policy,wallSeconds:`);
    const reset=`
    window.resetExperiment=function(v){
        globalThis.__qaVariant=v;globalThis.__qaStage=null;
        const fresh=structuredClone(BASE_DATA);for(const k of Object.keys(D))delete D[k];Object.assign(D,fresh);
        D.balance.skillbook_learn_level=v.bookLevel??10;D.balance.start_weapon_atk_pct=v.starter??1;
        if((v.rounds??9)!==9){
            const n=v.rounds,types=n===7?['normal','normal','elite','normal','normal','elite']:['normal','elite','normal','elite'];
            for(const [key,last]of [['qa_early_standard','boss'],['qa_early_elite','elite']])D.roundSets[key]=[...types,last].map((round_type,i)=>({round_set:key,round_num:i+1,round_type}));
            for(const s of [...Object.values(D.stages),...D.stageList])if(s.chapter===1&&s.stage_num<5)s.round_set=s.round_set==='standard'?'qa_early_standard':'qa_early_elite';
        }
        SYS=buildSystems(D);Q=SYS.game;
    };
    window.readExperiment=()=>({data:structuredClone(D),balance:structuredClone(D.balance)});
    `;
    const entrySource=observer+'\n'+active+'\n'+reset;
    if(process.argv.includes('--export')){
        const native=entrySource.replace(/from '\/(.*?)'/g,(_,relative)=>"from '../snapshot/src/"+relative+"'");
        fs.writeFileSync(path.join(__dirname,'generated_entry.mjs'),native);
        fs.writeFileSync(path.join(BASE,'snapshot','package.json'),JSON.stringify({type:'module'}));
        return;
    }
    const entry=new vm.SourceTextModule(entrySource,{context,identifier:path.join(SNAP,'entry.js')});
    await entry.link(linker);await entry.evaluate();
    context.QA_LIGHT=true;
    for(const job of jobs){
        const began=performance.now();context.QA_HORIZON=job.horizon??3600;
        context.resetExperiment(job.variant);
        const rows=[];
        for(const seed of job.seeds){
            try{
                const result=await context.runActiveQA(seed,job.policy??'active',false);
                rows.push(JSON.parse(JSON.stringify(result)));
            }catch(error){rows.push({seed,error:String(error),stack:error.stack});}
        }
        const result={id:job.id,variant:job.variant,policy:job.policy??'active',seeds:job.seeds,horizon:job.horizon??3600,rows,wallSeconds:Math.round((performance.now()-began))/1000};
        fs.appendFileSync(output,JSON.stringify(result)+'\n');
    }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
