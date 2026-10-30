"""Read frozen game systems in Edge; structural fixtures are not progression runs."""
import json
import hashlib
import mimetypes
from pathlib import Path
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent
QA = OUT.parent
SRC = QA / 'snapshot' / 'src'
DATA = {
    '/' + path.relative_to(SRC).as_posix(): path.read_bytes()
    for path in SRC.rglob('*')
    if path.is_file() and path.suffix in ('.js', '.csv', '.json')
}
REGISTRY_PATH = '/assets/art/faces/portrait_files.js'
if REGISTRY_PATH not in DATA:
    raise RuntimeError('Missing required shared frozen portrait registry')
CHECKPOINTS = [
    {'name': path.name, 'state': json.loads(path.read_text(encoding='utf-8'))}
    for path in sorted((QA / 'simulation' / 'checkpoints').glob('state_*.json'))
    if '_seed1_' in path.name or '_seed2_' in path.name or '_seed3_' in path.name
    or '_seed4_' in path.name or '_seed5_' in path.name
]

def route_local(route):
    path = unquote(urlparse(route.request.url).path)
    if path == '/analysis.html':
        route.fulfill(content_type='text/html', body='<html><title>Economy probe</title></html>')
    elif path in DATA:
        route.fulfill(content_type=mimetypes.guess_type(path)[0] or 'application/octet-stream', body=DATA[path])
    else:
        route.fulfill(status=404, body='missing frozen source')

with sync_playwright() as p:
    browser = p.chromium.launch(channel='msedge', headless=True)
    page = browser.new_page()
    page.route('**/*', route_local)
    page.goto('http://127.0.0.1:8896/analysis.html')
    result = page.evaluate('''async checkpoints => {
        const {loadData,buildSystems,D}=await import('/ui/data.js');
        const {makeRng}=await import('/game_logic/rng.js');
        const M=await import('/ui/mock.js');
        await loadData('/data/');
        const S=buildSystems(D), game=S.game, at=1700000000000;
        const seeds=[];
        for(let seed=1;seed<=20;seed++){
            const g=game.newGame(seed,S.hero.rollStartParty(makeRng(seed),D.balance.party_size_max),at);
            seeds.push({seed,party:g.heroes.slice(0,3).map(h=>{
                const c=game.heroCombat(g,h);
                return {uid:h.uid,cls:h.cls,sin:h.sin,tier:h.tier,innate:h.innate,hp:c.hp_max,stats:h.stats,minorHealFraction:50/c.hp_max};
            }),limits:game.limitsOf(g)});
        }
        // Structural HP fixture: same seed1 starters/equipment, differing hero levels.
        // Levels are explicitly assigned, so these are NOT timed progression results.
        const hpFixture=[];
        for(const level of [1,5,10,15,20,30,50]){
            const g=game.newGame(1,S.hero.rollStartParty(makeRng(1),3),at);
            for(const h of g.heroes.slice(0,3)){
                h.level=level;
                const c=game.heroCombat(g,h);
                hpFixture.push({level,cls:h.cls,hp:c.hp_max,minor50Fraction:50/c.hp_max,healing200Fraction:200/c.hp_max});
            }
        }
        const g=game.newGame(1,S.hero.rollStartParty(makeRng(1),3),at);
        const locks={makeLevels:game.makeLevels(g),potionState:game.potionState(g),labState:game.labState(g,at)};
        // Isolated stock-access fixture: only flags/ranks are set to expose shop and recipes.
        g.buildings.shop=1;g.buildings.forge=1;
        const entry={makeLevels:game.makeLevels(g),shop:game.shopState(g,at),potionState:game.potionState(g)};
        const current=[];
        for(const cp of checkpoints){
            const c=game.deserialize(cp.state), at=c.savedAt;
            const wornBy=uid=>c.heroes.filter(h=>Object.values(h.equipped).includes(uid)).map(h=>h.uid);
            const itemList=Object.values(c.items);
            const inert=itemList.filter(it=>(it.affixes??[]).some(a=>M.statInert(a.stat))||it.proc).map(it=>({uid:it.uid,slot:it.slot,ilvl:it.ilvl,rarity:it.rarity,wornBy:wornBy(it.uid),inert:(it.affixes??[]).filter(a=>M.statInert(a.stat)),amuletProc:it.proc??null}));
            const heroes=c.heroes.map(h=>{const cb=game.heroCombat(c,h),a=game.advanceState(c,h.uid,at);return{uid:h.uid,cls:h.cls,sin:h.sin,level:h.level,hp:cb.hp_max,minor50Fraction:50/cb.hp_max,healing200Fraction:200/cb.hp_max,innate:h.innate,book:h.bookSkill??null,mastery:h.mastery,advance:{open:a.open,need:a.need,gold:a.gold,err:a.err,points:a.hero.points,branches:a.branches.map(b=>({id:b.id,skills:b.skills}))},bookState:game.bookState(c,h.uid)};});
            const closed=game.closeRun(c,at+23*3600000);
            const before={gold:c.resources.gold,levels:c.heroes.map(h=>h.level),joins:c.joins.length};
            const next=game.labSettle(c,at+23*3600000);
            current.push({name:cp.name,seed:cp.state.seed,at,resources:cp.state.resources,materials:cp.state.materials,buildings:cp.state.buildings,potions:cp.state.potions,bag:cp.state.bags[0].length,heroes,ownedItems:itemList.length,inertItems:inert,ownedAffixLines:itemList.reduce((n,it)=>n+(it.affixes??[]).length,0),offline23h:{closed:!!closed,settlement:next,goldDelta:c.resources.gold-before.gold,levelsBefore:before.levels,levelsAfter:c.heroes.map(h=>h.level),joinsDelta:c.joins.length-before.joins,visit:c.visit,tavernFree:game.tavernState(c,at+23*3600000).free,shopFree:game.shopState(c,at+23*3600000).free}});
        }
        const costKeys=['start_gold','tavern_hire_cost','tavern_refresh_hours','book_craft_gold','book_craft_dust','book_craft_herb','shop_book_gold','skillbook_learn_level','advance_unlock_level','advance_gold','advance_hours','explore_hours','explore_cave_items_per_hero','dispatch_offline_cap_hours','train_level_per_hour','gamble_gold_per_hour'];
        return {snapshot:'../snapshot/src',notes:{seeds:'Direct RNG seeds 1..20 fresh games only, independent of cohort seed derivation; no elapsed time.',hpFixture:'Explicit level assignments with unchanged seed1 starter gear; use actual checkpoint HP separately.',entry:'Explicit shop1/forge1 stock-access fixture; not elapsed progression.',current:'Actual fresh fun-QA checkpoint saves; offline23h makes no preparation purchases or changes.'},costs:Object.fromEntries(costKeys.map(k=>[k,D.balance[k]])),seeds,hpFixture,locks,entry,current};
    }''', CHECKPOINTS)
    result['supplementalPortraitRegistry'] = {'path': '../snapshot/src/assets/art/faces/portrait_files.js', 'sha256': hashlib.sha256(DATA[REGISTRY_PATH]).hexdigest(), 'reason': 'Initial core capture omitted required asset module; root supplemented frozen snapshot and asset_module_manifest.json before this checkpoint probe.'}
    (OUT / 'economy_probe.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'checkpointCount': len(result['current']), 'firstBasicHourHP': [(h['cls'],h['level'],h['hp']) for x in result['current'] if x['name']=='state_basic_seed1_3600.json' for h in x['heroes'][:3]], 'registry': result['supplementalPortraitRegistry']}, ensure_ascii=True, indent=2))
    browser.close()
