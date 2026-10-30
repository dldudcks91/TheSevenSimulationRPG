"""Pair actual 60-minute saves: return without preparation vs legal logout preparation."""
import json
import mimetypes
from pathlib import Path
from urllib.parse import unquote, urlparse
from playwright.sync_api import sync_playwright

OUT=Path(__file__).resolve().parent
QA=OUT.parent
SRC=QA/'snapshot/src'
DATA={'/'+p.relative_to(SRC).as_posix():p.read_bytes() for p in SRC.rglob('*') if p.is_file() and p.suffix in ('.js','.csv','.json')}
SAVES=[{'name':p.name,'state':json.loads(p.read_text(encoding='utf-8'))} for p in sorted((QA/'simulation/checkpoints').glob('state_*_seed*_3600.json')) if p.name.startswith(('state_basic_','state_adaptive_'))]

def route_local(route):
    path=unquote(urlparse(route.request.url).path)
    if path=='/analysis.html':
        route.fulfill(content_type='text/html',body='<html><title>Daily return probe</title></html>')
    elif path in DATA:
        route.fulfill(content_type=mimetypes.guess_type(path)[0]or'application/octet-stream',body=DATA[path])
    else:
        route.fulfill(status=404,body='missing frozen module')

with sync_playwright() as p:
    browser=p.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page()
    page.route('**/*',route_local)
    page.goto('http://127.0.0.1:8896/analysis.html')
    result=page.evaluate('''async saves=>{
        const {loadData,buildSystems,D}=await import('/ui/data.js');
        await loadData('/data/');
        const game=buildSystems(D).game;
        const copy=x=>JSON.parse(JSON.stringify(x));
        const view=(g,at)=>({gold:g.resources.gold,materials:copy(g.materials),heroes:g.heroes.map(h=>({uid:h.uid,cls:h.cls,level:h.level,xp:h.xp})),joins:g.joins.length,explores:g.explores.length,completedCommissions:game.commissionState(g).cards.filter(c=>c.taken&&c.done).length,labNodes:copy(g.labNodes),labResearch:copy(g.labResearch),buildings:copy(g.buildings),bag:g.bags[0].length});
        const out=[];
        for(const save of saves){
            const start=save.state.savedAt,end=start+23*3600000,branches=[];
            for(const prepare of [false,true]){
                const g=game.deserialize(save.state),actions=[],blocked=[];
                const before=view(g,start);
                game.closeRun(g,start); // the real logout transition; both branches stop the same current run
                if(prepare){
                    if(!game.hasFeature(g,'hire')){
                        const next=game.constructionState(g).buildings.find(b=>b.id==='tavern')?.next;
                        if(next?.rank===2&&!next.err){const r=game.construct(g,'tavern',start);actions.push({kind:'constructTavern2',result:r,cost:next.cost});}
                        else blocked.push({kind:'hireUnlock',next});
                    }
                    const lab=game.labState(g,start);
                    const train=lab.lines.find(l=>l.line==='train');
                    const spare=g.heroes.find(h=>h.tier==='growth'&&!g.presets.some(p=>p.party.includes(h.uid)));
                    if(train?.open&&spare&&train.cap>spare.level&&train.seats.uids.length<train.seats.cap){actions.push({kind:'registerSpareTraining',uid:spare.uid,result:game.labRegister(g,spare.uid,'train',start)});}
                    else blocked.push({kind:'spareTraining',open:train?.open,cap:train?.cap,spareLevel:spare?.level,seats:train?.seats});
                    const choices=[['visit','interval'],['res','gather'],['res','mine'],['res','log'],['train','speed'],['gamble','income']];
                    if(!g.labResearch){
                        let started=false;
                        for(const [line,node]of choices){
                            if(line==='visit'&&(g.labNodes['visit:interval']??0)>0)continue;
                            const n=game.labState(g,start).lines.find(l=>l.line===line)?.nodes.find(n=>n.node===node);
                            if(n&&!n.err){actions.push({kind:'research',line,node,cost:n.next,result:game.labResearchStart(g,line,node,start)});started=true;break;}
                            if(n)blocked.push({kind:'research',line,node,err:n.err,next:n.next});
                        }
                        if(!started)blocked.push({kind:'noFundedResearch'});
                    }else actions.push({kind:'preserveExistingResearch',research:copy(g.labResearch)});
                    if(game.hasFeature(g,'explore')){
                        const ex=game.exploreState(g,start);
                        const squad=ex.squads.filter(s=>!s.err).sort((a,b)=>b.party.length-a.party.length)[0];
                        const spot=ex.spots.filter(s=>s.spot==='cave'&&s.open&&s.built&&!s.out).sort((a,b)=>b.chapter-a.chapter)[0];
                        if(squad&&spot){actions.push({kind:'sendCave',chapter:spot.chapter,preset:squad.no,heroes:squad.party.length,result:game.exploreSend(g,spot.chapter,'cave',squad.no,start)});}
                        else blocked.push({kind:'cave',squads:ex.squads,spots:ex.spots.filter(s=>s.spot==='cave').map(s=>({chapter:s.chapter,open:s.open,built:s.built,busy:!!s.out}))});
                    }else blocked.push({kind:'caveUnbuilt',next:game.constructionState(g).buildings.find(b=>b.id==='explore')?.next});
                }
                const afterPreparation=view(g,start);
                const settlement=game.labSettle(g,end);
                game.advanceSettle(g,end);
                const ready=game.exploreState(g,end).spots.filter(s=>s.out?.done).map(s=>({chapter:s.chapter,spot:s.spot,preset:s.out.preset,items:s.out.items?.map(it=>({slot:it.slot,rarity:it.rarity,ilvl:it.ilvl,group:it.group})),takeResult:game.exploreTake(g,s.chapter,s.spot,end,s.out.preset??1)}));
                branches.push({prepare,before,actions,blocked,afterPreparation,settlement,readyExplorations:ready,after:view(g,end),joins:game.joinState(g,end).list.map(j=>({no:j.no,src:j.src,cls:j.hero.cls,tier:j.hero.tier,level:j.hero.level,stats:j.hero.stats}))});
            }
            out.push({name:save.name,start,end,branches});
        }
        return{method:'Actual fresh60min saves cloned; identical logout,23h absence. Preparation spends actual funds, observes all normal gates, uses existing cave only; no injected ranks/currency/levels. Visit research first, otherwise first funded resource/training/gambling research; spare goblin training if already unlocked.',accounts:out};
    }''',SAVES)
    (OUT/'daily_return_pairs.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    compact=[]
    for account in result['accounts']:
        a,b=account['branches']
        compact.append({'name':account['name'],'goldAtLogout':a['before']['gold'],'actions':[x['kind']+((':'+x['line']+':'+x['node'])if x['kind']=='research'else'')for x in b['actions']],'goldSpent':a['before']['gold']-b['afterPreparation']['gold'],'newHeroes':[len(a['joins']),len(b['joins'])],'caveItems':[sum(len(x['items']or[])for x in a['readyExplorations']),sum(len(x['items']or[])for x in b['readyExplorations'])],'completedResearch':b['settlement']['done'],'trainingXP':[(h['uid'],h['level'],h['xp'])for h in b['after']['heroes']if h['uid']=='h4']})
    print(json.dumps(compact,ensure_ascii=True,indent=2))
    browser.close()
