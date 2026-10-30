"""Compare selected latest-source accounts with matching original QA accounts."""
import json
from pathlib import Path
HERE=Path(__file__).resolve().parent
BASE=HERE.parent
OUT=BASE/'simulation'
OLD=BASE.parent/'simulation'
def read(p):return json.loads(p.read_text(encoding='utf-8'))
def score(c):return len(c['cleared'])+sum(len(x)for x in c['clearedIn'].values())
def gap(rows,end):
    ts=[0]+[x['t']for x in rows if x['t']<=end and (x['actualXp']>0 or x['gold']>0 or x['drops']>0 or x['blueprints']>0)]+[end]
    a,b=max(zip(ts,ts[1:]),key=lambda pair:pair[1]-pair[0]);return {'seconds':round(b-a,3),'from':a,'to':b}
def zero(runs):
    best={'runs':0,'seconds':0};cur=None
    for r in runs:
        if r['xp']==0 and r['gold']==0 and r['drops']==0:
            key=(r['diff'],r['stage'])
            if cur is None or cur['target']!=key:cur={'target':key,'from':r['start'],'runs':0}
            cur['runs']+=1;cur['to']=r['t'];cur['seconds']=round(cur['to']-cur['from'],3)
            if cur['seconds']>best['seconds']:best=cur.copy()
        else:cur=None
    return best
def pack(r,c):return {'stage':c['stage'],'difficulty':c['difficulty'],'levels':c['levels'],'frontierScore':score(c),'runs':c['count']['runs'],'wins':c['count']['wins'],'losses':c['count']['losses'],'drops':c['count']['drops'],'battleGold':c['count']['battleGold'],'gold':c['gold'],'potionGold':c['count']['potionBuyGold'],'newStageGap':c['gaps']['newStage'],'battleRewardGap':gap(r['rounds'],c['seconds']),'skillbookLearningOpen':c['unused']['bookStateOpen'],'craftableBooks':len(c['unused']['craftableBooks'])}
comparisons=[]
for file in sorted(OUT.glob('*_seed*.json')):
    b=read(file);a=read(OLD/file.name)
    firstBoss=lambda r:next((x['t']for x in r['clears']if x['stage']==1051 and x['diff']=='normal'),None)
    cs=[]
    for sec in (600,3600,86400):
        x=next(c for c in a['checkpoints']if c['seconds']==sec);y=next(c for c in b['checkpoints']if c['seconds']==sec)
        old=pack(a,x);new=pack(b,y)
        observed=('stage','difficulty','levels','frontierScore','runs','wins','losses','drops','battleGold')
        cs.append({'seconds':sec,'sameCoreMetrics':all(old[k]==new[k]for k in observed),'old':old,'new':new})
    comparisons.append({'seed':a['seed'],'policy':a['policy'],'firstChapterBossClear':{'old':firstBoss(a),'new':firstBoss(b)},'longestZeroRewardBlock':{'old':zero(a['runs']),'new':zero(b['runs'])},'marks':cs,'newFailures':b['failures']})
info=read(OUT/'run_info.json')if(OUT/'run_info.json').exists()else None
result={'accounts':len(comparisons),'sourceTimes':{'old':read(BASE.parent/'source_manifest.json')['captured_at_utc'],'new':read(BASE/'source_manifest.json')['captured_at_utc']},'checks':{'sameCore10m':sum(c['marks'][0]['sameCoreMetrics']for c in comparisons),'sameCore60m':sum(c['marks'][1]['sameCoreMetrics']for c in comparisons),'sameCoreDay':sum(c['marks'][2]['sameCoreMetrics']for c in comparisons),'newCompletedExpeditions':sum(read(p)['count']['runs']for p in OUT.glob('*_seed*.json'))},'runInfo':info,'comparisons':comparisons}
(OUT/'version_comparison.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'accounts':len(comparisons),'checks':result['checks'],'runInfo':{'errors':info['errors'],'changed':info['frozen_source_changed'],'repeat':info['seed2_repeat_identical_except_runtime']}if info else None},ensure_ascii=True))
for c in comparisons:print(json.dumps({'seed':c['seed'],'policy':c['policy'],'firstBoss':c['firstChapterBossClear'],'dayOld':c['marks'][-1]['old'],'dayNew':c['marks'][-1]['new']},ensure_ascii=True))
