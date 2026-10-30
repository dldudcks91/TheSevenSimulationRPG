"""Bounded legal recruitment catch-up: five manual runs vs three hours training."""
import json
import mimetypes
from pathlib import Path
from urllib.parse import unquote,urlparse
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent;QA=OUT.parent;SRC=QA/'snapshot/src'
DATA={'/'+p.relative_to(SRC).as_posix():p.read_bytes()for p in SRC.rglob('*')if p.is_file()and p.suffix in('.js','.csv','.json')}
SAVE=json.loads((QA/'simulation/checkpoints/state_adaptive_seed4_86400.json').read_text(encoding='utf-8'))
def local(route):
    path=unquote(urlparse(route.request.url).path)
    if path=='/analysis.html':route.fulfill(content_type='text/html',body='<html></html>')
    elif path in DATA:route.fulfill(content_type=mimetypes.guess_type(path)[0]or'application/octet-stream',body=DATA[path])
    else:route.fulfill(status=404,body='missing')
with sync_playwright()as p:
    browser=p.chromium.launch(channel='msedge',headless=True);page=browser.new_page();page.route('**/*',local);page.goto('http://127.0.0.1:8896/analysis.html')
    result=page.evaluate('''async save=>{
        const{loadData,buildSystems,D}=await import('/ui/data.js');
        const{paceAt,paceStep,paceCfg}=await import('/ui/pace.js');
        await loadData('/data/');const S=buildSystems(D),game=S.game,at=save.savedAt;
        const g=game.deserialize(save);game.closeRun(g,at);
        const index=game.tavernCandidates(g).findIndex(Boolean);
        if(index<0)return{blocked:'No currently available actual tavern candidate'};
        const walletBefore=g.resources.gold,hire=game.hire(g,index);
        if(!hire.ok)return{blocked:'Actual hire refused',hire,walletBefore};
        const uid=hire.hero.uid,base=game.serialize(g,at);
        const team=game.partyOf(g,1).map(id=>game.heroById(g,id));
        const formation=game.formationState(g,1);
        const rank=id=>formation.byUid[id]??0;
        const power=h=>{const c=game.heroCombat(g,h),a=c.atk_magic??c.atk_physical;return a?(a.min+a.max)/2*(c.main_attr_mult??1)/(c.action_period||1):0;};
        const tank=team.find(h=>rank(h.uid)===0&&['warrior','knight'].includes(h.cls))??team.find(h=>rank(h.uid)===0)??team[0];
        const keeper=team.filter(h=>h.uid!==tank.uid).sort((a,b)=>power(b)-power(a))[0];
        const removed=team.find(h=>h.uid!==tank.uid&&h.uid!==keeper.uid);
        const modes=[];
        for(const stageId of [1011,2011]){
            const s=game.deserialize(base);game.selectPreset(s,1);game.selectDifficulty(s,'normal');
            const remove=game.toggleParty(s,removed.uid,at),add=game.toggleParty(s,uid,at),template=game.setFormation(s,'1-2');
            const placements=[game.placeFormation(s,tank.uid,0,0),game.placeFormation(s,keeper.uid,1,0),game.placeFormation(s,uid,1,1)];
            if(!remove.ok||!add.ok||!template.ok||placements.some(r=>!r.ok))return{blocked:'Legal party setup refused',remove,add,template,placements};
            if(!game.stageUnlocked(s,stageId,'normal')){modes.push({stageId,blocked:'Stage not unlocked'});continue;}
            const recruit=game.heroById(s,uid),runs=[],before={level:recruit.level,xp:recruit.xp,masteryPoints:recruit.masteryPoints},startFormation=game.formationState(s,1);
            let now=at,totalPaceMs=0;
            for(let i=0;i<5;i++){
                const depart=game.departRun(s,stageId,now,1,null,'normal');
                if(!depart.ok){runs.push({blocked:depart.err});break;}
                const p=paceAt(depart.run.result.timeline),budget=100000000;
                const left=paceStep(p,depart.run.result.timeline,budget,paceCfg('off',false,1,1),t=>game.stepRun(s,depart.run,t));
                if(!p.done)throw new Error('Pace did not finish');
                const ms=budget-left;now+=ms;totalPaceMs+=ms;game.noteRunEnd(s,depart.run,now);
                runs.push({i:i+1,won:depart.report.won,reason:depart.report.reason,battleSeconds:depart.report.durationSec,paceSeconds:ms/1000,recruitDowned:depart.report.downed.includes(uid),recruitXpGranted:depart.report.xp[uid]??0,recruitLevel:recruit.level,recruitXp:recruit.xp,roundsCleared:depart.report.roundsCleared,contrib:depart.report.contrib.find(c=>c.uid===uid)});
                game.retreatRun(s,depart.run,now);
                if(i<4)now+=D.balance.repeat_restart_sec*1000;
            }
            modes.push({stageId,party:game.partyOf(s,1),formation:startFormation,before,runs,totalPaceSeconds:totalPaceMs/1000,elapsedIncludingFourRestartGapsSeconds:(now-at)/1000,after:{level:recruit.level,xp:recruit.xp,masteryPoints:recruit.masteryPoints,equipped:recruit.equipped},walletAfter:s.resources.gold});
        }
        const t=game.deserialize(base),student=game.heroById(t,uid),trainingBefore={level:student.level,xp:student.xp,needed:S.hero.xpNeeded(student.level)};
        const register=game.labRegister(t,uid,'train',at),settled=game.labSettle(t,at+3*3600000);
        return{scope:'Actual adaptive seed4 24h checkpoint, frozen modules. All branches close active expeditions first, then same actual first available candidate hired for600gold. No free gold/XP/levels/gear; no additional purchases, respec, gear transfer, auto-equip, skill learning or optimization. Each combat branch legally removes one old back-row hero and keeps the front tank plus stronger remaining damage-range hero; recruit uses starter gear in rear row. Five manual same-stage runs, speed1/focusOff/950msroundgaps through actual paceStep, four normal5srestart waits reported separately.',source:'state_adaptive_seed4_86400.json',walletBefore,hireCost:walletBefore-g.resources.gold,candidateIndex:index,candidate:{uid,cls:hire.hero.cls,tier:hire.hero.tier,sin:hire.hero.sin,innate:hire.hero.innate,level:hire.hero.level,stats:hire.hero.stats,equipped:hire.hero.equipped},protectors:{tank:{uid:tank.uid,cls:tank.cls,level:tank.level},dps:{uid:keeper.uid,cls:keeper.cls,level:keeper.level,selection:'higher current weapon-range damage proxy'},removed:{uid:removed.uid,cls:removed.cls,level:removed.level}},modes,training:{before:trainingBefore,register,after:{level:student.level,xp:student.xp,carry:t.labClock.train?.carry[uid]},settled}};
    }''',SAVE)
    (OUT/'recruit_carry.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(result,ensure_ascii=True,indent=2));browser.close()
