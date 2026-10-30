import json
from playwright.sync_api import sync_playwright
from smoke_ui import OUT, setup, SOURCE_SET_HASH

CHECK='''label => {
 const items=[];
 for(const [i,node] of [...document.querySelectorAll('[data-tip]')].entries()) {
  if(typeof node._tipBuild!=='function')continue;
  try {
    const result=node._tipBuild();
    const cards=Array.isArray(result)?result:[result];
    items.push({i,cls:node.className,ok:cards.every(card=>card===null || card===undefined || !!card.nodeType)});
  } catch(e){items.push({i,cls:node.className,error:String(e),stack:e.stack,outer:node.outerHTML.slice(0,1000)});}
 }
 return {label,n:items.length,failures:items.filter(x=>x.error||!x.ok)};
}'''
out={'source_set_sha256':SOURCE_SET_HASH,'checks':[]}
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True);ctx=b.new_context(viewport={'width':1440,'height':1000});setup(ctx)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8921/index.html?dev=battle&runs=20&cn=max&tab=character');page.wait_for_function('window.__uiAudit && __uiAudit.game()!==null')
 for tab in ['expedition','explore','party','character','research','tavern','shop','forge','library','resource','colosseum','arena','help','lab']:
  page.evaluate('tab=>__uiAudit.switchTab(tab)',tab)
  out['checks'].append(page.evaluate(CHECK,tab))
 for seg in ['monster','character','item','skill','fx','mastery']:
  for sub in (['normal','elite'] if seg=='monster' else ['weapon','armor'] if seg=='item' else ['basic','adv'] if seg=='skill' else ['sin','class','adv'] if seg=='mastery' else ['default']):
   page.evaluate('''({seg,sub})=>{
    const st=__uiAudit.state();st.tab='codex';st.codexSeg=seg;
    if(seg==='monster')st.codexGrade=sub;
    if(seg==='item')st.codexItemSeg=sub;
    if(seg==='skill')st.codexSkillSeg=sub;
    if(seg==='mastery')st.codexMasterySeg=sub;
    __uiAudit.render();
   }''',{'seg':seg,'sub':sub})
   out['checks'].append(page.evaluate(CHECK,f'codex:{seg}:{sub}'))
 out['pageerrors']=errors
 b.close()
(OUT/'tooltip_builders.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(out,ensure_ascii=True),flush=True)
