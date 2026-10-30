const fs=require('fs'),path=require('path');
const {pathToFileURL}=require('url');
const {performance}=require('perf_hooks');
const BASE=path.resolve(__dirname,'..'),SNAP=path.join(BASE,'snapshot','src');
const jobs=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),output=process.argv[3];
global.window=global;global.location={hostname:'127.0.0.1',search:''};global.localStorage={getItem:()=>null};
global.fetch=async url=>{
    const file=path.resolve(SNAP,String(url).replace(/^\//,''));
    if(!file.startsWith(SNAP+path.sep))throw Error('outside snapshot');
    const body=fs.readFileSync(file,'utf8');return{ok:true,status:200,text:async()=>body,json:async()=>JSON.parse(body)};
};
(async()=>{
    await import(pathToFileURL(path.join(__dirname,'generated_entry.mjs')).href);
    global.QA_LIGHT=true;
    for(const job of jobs){
        const began=performance.now();global.QA_HORIZON=job.horizon??3600;global.resetExperiment(job.variant);
        const rows=[];
        for(const seed of job.seeds){
            try{rows.push(await global.runActiveQA(seed,job.policy??'active',false));}
            catch(error){rows.push({seed,error:String(error),stack:error.stack});}
        }
        fs.appendFileSync(output,JSON.stringify({id:job.id,variant:job.variant,policy:job.policy??'active',seeds:job.seeds,horizon:job.horizon??3600,rows,wallSeconds:Math.round(performance.now()-began)/1000})+'\n');
    }
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
