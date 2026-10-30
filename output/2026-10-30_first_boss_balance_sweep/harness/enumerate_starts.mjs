import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath}from'node:url';
const BASE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),SNAP=path.join(BASE,'snapshot','src');
globalThis.location={hostname:'127.0.0.1',search:''};globalThis.localStorage={getItem:()=>null};
globalThis.fetch=async url=>({ok:true,status:200,text:async()=>fs.readFileSync(path.join(SNAP,String(url).replace(/^\//,'')),'utf8')});
const {D,loadData,buildSystems}=await import('../snapshot/src/ui/data.js');
const {makeRng}=await import('../snapshot/src/game_logic/rng.js');
await loadData('/data/');const SYS=buildSystems(D),groups={};
for(let seed=501;seed<=20000;seed++){
    const party=SYS.hero.rollStartParty(makeRng(1000+seed),D.balance.party_size_max);
    const key=party.map(h=>h.cls).join('|');
    const list=groups[key]??=[];
    if(list.length<4)list.push({seed,classes:party.map(h=>h.cls),innates:party.map(h=>h.innate),sins:party.map(h=>h.sin),stats:party.map(h=>h.stats)});
    if(Object.keys(groups).length===54&&Object.values(groups).every(x=>x.length>=4))break;
}
const unordered=[...new Set(Object.keys(groups).map(k=>k.split('|').sort().join('|')))];
const result={orderedClassRarityGroups:Object.keys(groups).length,unorderedClassGroups:unordered.length,groups,seeds:Object.values(groups).flat().map(x=>x.seed).sort((a,b)=>a-b)};
fs.writeFileSync(path.join(BASE,'class_coverage.json'),JSON.stringify(result,null,2));
if(result.orderedClassRarityGroups!==54||result.seeds.length!==216)throw Error('Missing legal class combinations');
process.stdout.write(JSON.stringify({ordered:54,unordered:unordered.length,seeds:result.seeds.length})+'\n');
