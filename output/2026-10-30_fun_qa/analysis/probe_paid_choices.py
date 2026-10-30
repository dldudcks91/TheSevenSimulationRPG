"""Prove paid choice availability/costs on actual cohort saves; no injected resources."""
import json
import mimetypes
from pathlib import Path
from urllib.parse import unquote,urlparse
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent;QA=OUT.parent;SRC=QA/'snapshot/src'
DATA={'/'+p.relative_to(SRC).as_posix():p.read_bytes() for p in SRC.rglob('*')if p.is_file()and p.suffix in('.js','.csv','.json')}
payload={name:json.loads((QA/'simulation/checkpoints'/file).read_text(encoding='utf-8'))for name,file in [('hour','state_basic_seed1_3600.json'),('day','state_adaptive_seed1_86400.json')]}
def local(route):
    path=unquote(urlparse(route.request.url).path)
    if path=='/analysis.html':route.fulfill(content_type='text/html',body='<html></html>')
    elif path in DATA:route.fulfill(content_type=mimetypes.guess_type(path)[0]or'application/octet-stream',body=DATA[path])
    else:route.fulfill(status=404,body='missing')
with sync_playwright()as p:
    browser=p.chromium.launch(channel='msedge',headless=True);page=browser.new_page();page.route('**/*',local);page.goto('http://127.0.0.1:8896/analysis.html')
    result=page.evaluate('''async input=>{
        const{loadData,buildSystems,D}=await import('/ui/data.js');await loadData('/data/');const S=buildSystems(D),game=S.game;
        const s=game.deserialize(input.hour),before={gold:s.resources.gold,ore:s.materials.iron_ore,tier2:s.materials.iron_ore_2??0};
        const availability=game.synthState(s).list.find(r=>r.id==='iron_ore_2');
        const synthesis=game.synthesize(s,'iron_ore_2');
        const after={gold:s.resources.gold,ore:s.materials.iron_ore,tier2:s.materials.iron_ore_2??0};
        const d=game.deserialize(input.day),consumerIds=new Set(),recipes=[];
        for(const level of game.makeLevels(d))for(const part of D.slots){const r=game.makeState(d,part.id,level.level,1);if(r){recipes.push({part:part.id,level:level.level,open:level.open,cost:r.cost});r.cost.filter(c=>c.kind!=='gold').forEach(c=>consumerIds.add(c.id));}}
        for(const item of Object.values(d.items)){const u=game.upgradeState(d,item.uid);u?.mats.forEach(m=>consumerIds.add(m.id));}
        for(const row of game.potionState(d).list)if(row.herb)consumerIds.add(row.herb.id);
        for(const line of game.labState(d,d.savedAt).lines)for(const n of line.nodes)if(n.next?.mat)consumerIds.add(n.next.mat.id);
        for(const b of game.constructionState(d).buildings)for(const cost of b.next?.cost??[])if(cost.res!=='gold')consumerIds.add(cost.res);
        // Book/tactic material roots are explicit in their actual APIs/source, without tier selection.
        consumerIds.add('dust');consumerIds.add('herb');
        const outputs=game.materialLadder().filter(m=>m.tier>1).map(m=>m.id);
        const potions=[];
        for(const potion of ['minor_healing','light_healing','healing']){
            const buy=game.deserialize(input.day),make=game.deserialize(input.day);
            const base={gold:buy.resources.gold,herb:buy.materials.herb,n:buy.potions[potion]??0};
            const br=game.shopPotionBuy(buy,potion),mr=game.makePotion(make,potion);
            potions.push({potion,base,buy:br,craft:mr,buyGoldSpent:base.gold-buy.resources.gold,craftGoldSpent:base.gold-make.resources.gold,buyHerbSpent:base.herb-buy.materials.herb,craftHerbSpent:base.herb-make.materials.herb,buyStockIncrease:(buy.potions[potion]??0)-base.n,craftStockIncrease:(make.potions[potion]??0)-base.n});
        }
        const train=game.deserialize(input.day),trainee=train.heroes.find(h=>h.tier==='growth');
        const trainBefore={level:trainee.level,xp:trainee.xp,needed:S.hero.xpNeeded(trainee.level)};
        const registration=game.labRegister(train,trainee.uid,'train',train.savedAt);
        const trainingSettlement=game.labSettle(train,train.savedAt+23*3600000);
        const training={source:'Actual adaptive seed1 day save; legal registration of existing bench goblin into already unlocked training line, then23h absence.',before:trainBefore,registration,after:{level:trainee.level,xp:trainee.xp,carry:train.labClock.train?.carry[trainee.uid]},settlement:trainingSettlement};
        return{scope:'Actual saved60min/day states, normal APIs, isolated clones, no resources/ranks/levels injected.',synthesis:{availability,before,result:synthesis,after,delta:{gold:after.gold-before.gold,ore:after.ore-before.ore,tier2:after.tier2-before.tier2}},consumerMaterialIds:[...consumerIds],synthesisOutputsWithoutProgressionConsumers:outputs.filter(id=>!consumerIds.has(id)),craftRecipes:recipes,potions,training};
    }''',payload)
    (OUT/'paid_choices.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items()if k!='craftRecipes'},ensure_ascii=True,indent=2));browser.close()
