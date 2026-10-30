import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from smoke_ui import ROOT, OUT, setup

JS = '''() => {
 const s=__uiAudit.sys(), g=__uiAudit.game(), base=s.arena.exportTeam(s.game.partyOf(g).map(id=>g.heroes.find(h=>h.uid===id)),g.items);
 const cases = {
  baseline:p=>{}, stats_empty:p=>{p.heroes[0].hero.stats={}}, stats_missing_str:p=>{delete p.heroes[0].hero.stats.str},
  name_null:p=>{p.heroes[0].hero.name=null}, name_number:p=>{p.heroes[0].hero.name=42}, name_object:p=>{p.heroes[0].hero.name={ko:{toString:1}}},
  sin_missing:p=>{delete p.heroes[0].hero.sin}, sin_unknown:p=>{p.heroes[0].hero.sin='unknown'},
  tier_unknown:p=>{p.heroes[0].hero.tier='unknown'}, gear_null:p=>{p.heroes[0].gear=[null]},
  affixes_object:p=>{p.heroes[0].gear[0].item.affixes={}}, affixes_null_entry:p=>{p.heroes[0].gear[0].item.affixes=[null]},
  affixes_numeric_entry:p=>{p.heroes[0].gear[0].item.affixes=[42]}, affixes_missing_stat:p=>{p.heroes[0].gear[0].item.affixes=[{v:9999999}]},
  weapon_ilvl_huge:p=>{p.heroes[0].gear[0].item.ilvl=1e308}, level_missing:p=>{delete p.heroes[0].hero.level},
  skillLv_null:p=>{p.heroes[0].hero.skillLv=null}, mastery_null:p=>{p.heroes[0].hero.mastery=null},
  item_name_number:p=>{p.heroes[0].gear[0].item.name=42}, item_rarity_unknown:p=>{p.heroes[0].gear[0].item.rarity='unknown'},
  stats_extra:p=>{p.heroes[0].hero.stats.extra=99}, stats_string:p=>{p.heroes[0].hero.stats='x'},
 };
 const out=[];
 for(const [id,mutate] of Object.entries(cases)) {
  const p=structuredClone(base); mutate(p);
  try {
   const imported=s.arena.importTeam(p);
   out.push({id,ok:imported.ok,problems:imported.problems,combat:imported.ok?imported.team[0].combat:null});
  } catch(e) { out.push({id,throw:String(e),stack:e.stack}); }
 }
 return {base,out};
}'''
with sync_playwright() as p:
 browser=p.chromium.launch(channel='msedge', headless=True)
 ctx=browser.new_context(viewport={'width':1440,'height':1000}); setup(ctx)
 page=ctx.new_page(); page.goto('http://127.0.0.1:8921/index.html?dev=arena')
 page.wait_for_selector('.arena-fight')
 result=page.evaluate(JS)
 (OUT/'fuzz_team_input.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps([{'id':x['id'],'ok':x.get('ok'),'throw':x.get('throw'),'problems':x.get('problems')} for x in result['out']],ensure_ascii=True),flush=True)
 browser.close()
