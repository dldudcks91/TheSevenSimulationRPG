"""Latest frozen baseline validation, kept separate from historical FUN cohorts."""
import csv,hashlib,json,runpy,sys
from pathlib import Path

OUT=Path(__file__).resolve().parent
CURRENT=OUT.parent
FUN=CURRENT.parent
sys.path.insert(0,str(FUN/'browser'))
import fun_browser as b
b.OUT=OUT;b.RUN=CURRENT;b.SNAPSHOT=CURRENT/'snapshot/src'
b.SOURCE={'/'+p.relative_to(b.SNAPSHOT).as_posix():p.read_bytes() for p in b.SNAPSHOT.rglob('*') if p.is_file()}

def rows(name):
    with (b.SNAPSHOT/'data'/name).open(encoding='utf-8-sig',newline='') as f:return list(csv.DictReader(f))

def main():
    # Run the unmodified complete assertion page once against this version.
    runpy.run_path(str(FUN/'browser/check_baseline.py'),run_name='__main__')
    s=b.Session();c,page=s.context()
    try:
        b.boot(page,s.base)
        runtime=page.evaluate('''async()=>{
            const M=await import('/ui/mock.js');
            const {SYS,D}=__fun,g=SYS.game;
            const party=SYS.hero.rollStartParty((await import('/game_logic/rng.js')).makeRng(1),D.balance.party_size_max);
            const state=g.newGame(1,party,1700000000000),h=state.heroes[0];
            const initial={buildings:state.buildings,book:g.bookState(state,h.uid),lab:g.labState(state,1700000000000),advance:g.advanceState(state,h.uid,1700000000000),hasHire:g.hasFeature(state,'hire'),hasExplore:g.hasFeature(state,'explore')};
            h.level=10;const level10=g.bookState(state,h.uid);
            const procFlags=Object.fromEntries(['proc_hit_attack','proc_hit_buff','proc_cast_attack','proc_cast_buff','proc_cast_debuff','proc_struck_buff','proc_struck_debuff'].map(k=>[k,M.statInert(k)]));
            const later=g.newGame(2,party,1700000000000);
            Object.assign(later.buildings,{shop:1,tavern:1,forge:1,storage:1});
            for(const x of later.heroes)for(const k of ['str','agi','int','vit','luck','ldr','cha'])x.stats[k]=0;
            g.labSettle(later,1700000000000);
            const before={gold:later.resources.gold,materials:{...later.materials},levels:later.heroes.map(x=>x.level)};
            g.labSettle(later,1700000000000+23*3600000);
            const after={gold:later.resources.gold,materials:{...later.materials},levels:later.heroes.map(x=>x.level)};
            return {initial,level10,procFlags,offlineUnregistered:{before,after,capHours:D.balance.dispatch_offline_cap_hours,expectedEach:D.labMaterials.map(m=>({id:m.id,n:Math.floor(m.yieldPerHour*D.balance.dispatch_offline_cap_hours+1e-9)}))}};
        }''')
        effects=rows('building_effect.csv');ranks=rows('building_rank.csv');synth=rows('material_synth.csv')
        higher={r['material_id'] for r in synth if r['from_id']!='-'}
        consumers=[]
        # Dedicated synthesis from_id chains are not progression consumers. Check exact CSV cells,
        # including structured cost/require tokens, throughout all other gameplay data.
        for path in (b.SNAPSHOT/'data').glob('*.csv'):
            if path.name in ['material_synth.csv','lab_material.csv']:continue
            with path.open(encoding='utf-8-sig',newline='') as f:
                for number,row in enumerate(csv.DictReader(f),2):
                    for key,value in row.items():
                        if key is None or key.startswith('description') or key.endswith('_kr') or key.endswith('_en'):continue
                        for token in str(value).replace('|',':').replace(';',':').replace(',',':').split(':'):
                            if token in higher:consumers.append({'file':path.name,'line':number,'column':key,'material':token})
        amulet_line=b.SOURCE['/ui/app.js'].decode('utf-8').split('const procLine = item => {',1)[1].split('\n};',1)[0]
        result={'scope':'Current validation snapshot only. Historical50-account baseline is unchanged. Explicit fixture is used for level10 gate and neutral offline laboratory arithmetic, not progression timing.','runtime':runtime,'higherMaterialConsumers':consumers,'higherMaterialCount':len(higher),'amuletProcLineAlwaysInertTag':'${inertTag()}' in amulet_line,'gates':{'effects':[r for r in effects if r.get('target') in ['skillbook','book_craft','hire','explore','lab_res','potion']],'ranks':[r for r in ranks if (r['building_id'],r['rank']) in [('library','2'),('tavern','2'),('explore','1'),('forge','2')]]},'page_errors':s.errors,'http_errors':s.http_errors,'source_manifest':'../source_manifest.json','criticalSha256':{k:hashlib.sha256(b.SOURCE[k]).hexdigest() for k in ['/game_logic/state.js','/game_logic/battle.js','/game_logic/skill_runtime.js','/data/building_effect.csv']}}
        b.write('targeted_sanity.json',result)
        print(json.dumps({'learning_r1':runtime['initial']['book']['open'],'craft_gate_r2':[r for r in effects if r.get('target')=='book_craft'],'level10_error':runtime['level10']['hero']['err'],'procFlags':runtime['procFlags'],'higher_consumers':len(consumers),'neutral_offline':runtime['offlineUnregistered'],'page_errors':s.errors},ensure_ascii=True),flush=True)
    finally:c.close();s.close()

if __name__=='__main__':main()
