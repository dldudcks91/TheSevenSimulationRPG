"""Aggregate paired fun QA; safe to rerun while accounts finish."""
import json
import statistics as st
from pathlib import Path
HERE=Path(__file__).resolve().parent
OUT=HERE.parent/'simulation'
def read(path):return json.loads(path.read_text(encoding='utf-8'))
def describe(xs):
    xs=sorted(x for x in xs if x is not None)
    if not xs:return {'n':0}
    return {'n':len(xs),'min':round(xs[0],3),'median':round(st.median(xs),3),'max':round(xs[-1],3),'mean':round(st.mean(xs),3)}
def score(c):return len(c['cleared'])+sum(len(v) for v in c['clearedIn'].values())
def blocks(runs,zero=False):
    best={'n':0,'seconds':0};cur=None
    for r in runs:
        target=(r['stage'],r['diff'])
        condition=(not r['won']) if not zero else r['xp']==0 and r['gold']==0 and r['drops']==0
        if condition:
            if cur is None or cur['target']!=target:cur={'n':0,'from':r['start'],'target':target}
            cur['n']+=1;cur['to']=r['t'];cur['seconds']=round(cur['to']-cur['from'],3)
            if cur['seconds']>best['seconds']:best=cur.copy()
        else:cur=None
    return best
def gap(times,end,start=0):
    xs=sorted([start,*[t for t in times if start<t<=end],end]);best={'seconds':0,'from':start,'to':start}
    for a,b in zip(xs,xs[1:]):
        if b-a>best['seconds']:best={'seconds':round(b-a,3),'from':a,'to':b}
    return best

rows=[read(p) for p in OUT.glob('*_seed*.json')]
for r in rows:
    for c in r['checkpoints']:
        c['gaps']['xp']=gap([x['t']for x in r['rounds']if x['actualXp']>0],c['seconds'])
        c['gaps']['reward']=gap([x['t']for x in r['rounds']if x['actualXp']>0 or x['gold']>0 or x['drops']>0 or x['blueprints']>0],c['seconds'])
summary={'accounts':len(rows),'completedExpeditions':sum(r['count']['runs'] for r in rows),'failedAccounts':[{'seed':r['seed'],'policy':r['policy'],'failures':r['failures']} for r in rows if r['failures']],'policies':{},'paired':{},'perAccount':[]}
for policy in ('basic','adaptive','passive'):
    rs=sorted((r for r in rows if r['policy']==policy),key=lambda r:r['seed'])
    if not rs:continue
    ps={'n':len(rs),'marks':{}}
    for mark in (600,3600,86400):
        cs=[next(c for c in r['checkpoints'] if c['seconds']==mark) for r in rs]
        countKeys=['runs','wins','losses','drops','heroXp','actualXp','failedRoundKills','failedRoundRawXp','levelUps','newActiveSkills','boxesGranted','boxesOpened','equipMoves','equipButtonsWithChanges','mightImprovements','accessoryProxyChanges','masterySpent','buildGold','commissionGold','potionsBought','potionBuyGold','potionsConsumed','potionConsumedValue','upgradeGold','meaningfulManagementSessions','guideAppearances','guideResponses','respecs','farmingRuns','overflow']
        q={'progressScore':describe([score(c) for c in cs]),'heroLevel':describe([v for c in cs for v in c['levels']]),'gold':describe([c['gold'] for c in cs]),'counters':{k:describe([c['count'][k] for c in cs]) for k in countKeys},'equippedDropFraction':describe([c['dropEquippedRatio'] for c in cs]),'recentHourWinFraction':describe([c['recentHour']['wins']/max(1,c['recentHour']['runs']) for c in cs]),'gapsSeconds':{k:describe([c['gaps'][k]['seconds'] for c in cs]) for k in ('newStage','reward','xp','usefulEquipment')},'firstMilestones':{},'fullBagAccounts':sum(c['bags'][0]>=c['bagCap'] for c in cs),'skillBookCraftableButUnusedAccounts':sum(bool(c['unused']['craftableBooks']) and not c['books'] for c in cs),'advanceAffordableButUnusedHeroes':sum(sum(a['error'] is None for a in c['unused']['eligibleAdvance']) for c in cs),'potionsEmptyAccounts':sum(not any(c['potions'].values()) for c in cs),'noNewActiveAccounts':sum(c['count']['newActiveSkills']==0 for c in cs),'stages':[{'seed':c['seed'],'diff':c['difficulty'],'stage':c['stage'],'levels':c['levels'],'score':score(c),'recent10wins':c['recentTen']['wins'],'recent10runs':c['recentTen']['runs']}for c in cs]}
        for k in ('xp','levelUp','drop','drop_magic','drop_rare','usableGainDrop','equipmentGain','boxGranted','boxOpened','masteryAvailable','masterySpent','construct','commissionTake','commissionClaim','blueprint','newActiveSkill','retryGuide','potionRefill','bagFull','overflow'):
            obs=[c['first'][k]['t'] for c in cs if k in c['first'] and c['first'][k]['t']<=mark]
            q['firstMilestones'][k]={**describe(obs),'unobservedByMark':len(cs)-len(obs)}
        previous=0 if mark==600 else 600 if mark==3600 else 3600
        delta={}
        for key in countKeys:
            values=[]
            for r,c in zip(rs,cs):
                old=next((x for x in r['checkpoints']if x['seconds']==previous),None)
                values.append(c['count'][key]-(old['count'][key]if old else 0))
            delta[key]=describe(values)
        q['phase']={'from':previous,'to':mark,'counters':delta,'newStageGap':describe([gap([x['t']for x in r['clears']],mark,previous)['seconds']for r in rs]),'actualXpGap':describe([gap([x['t']for x in r['rounds']if x['actualXp']>0],mark,previous)['seconds']for r in rs]),'rewardGap':describe([gap([x['t']for x in r['rounds']if x['actualXp']>0 or x['gold']>0 or x['drops']>0 or x['blueprints']>0],mark,previous)['seconds']for r in rs])}
        ps['marks'][mark]=q
    summary['policies'][policy]=ps

basic={r['seed']:r for r in rows if r['policy']=='basic'};adaptive={r['seed']:r for r in rows if r['policy']=='adaptive'}
paired=sorted(set(basic)&set(adaptive))
for mark in (600,3600,86400):
    comparisons=[]
    for seed in paired:
        a=next(c for c in basic[seed]['checkpoints'] if c['seconds']==mark);b=next(c for c in adaptive[seed]['checkpoints'] if c['seconds']==mark)
        comparisons.append({'seed':seed,'basicScore':score(a),'adaptiveScore':score(b),'scoreDifference':score(b)-score(a),'basicLosses':a['count']['losses'],'adaptiveLosses':b['count']['losses'],'basicNewStageGap':a['gaps']['newStage']['seconds'],'adaptiveNewStageGap':b['gaps']['newStage']['seconds'],'basicGearGainGap':a['gaps']['usefulEquipment']['seconds'],'adaptiveGearGainGap':b['gaps']['usefulEquipment']['seconds'],'basicPotionGold':a['count']['potionBuyGold'],'adaptivePotionGold':b['count']['potionBuyGold']})
    summary['paired'][mark]={'n':len(paired),'ahead':sum(c['scoreDifference']>0 for c in comparisons),'same':sum(c['scoreDifference']==0 for c in comparisons),'behind':sum(c['scoreDifference']<0 for c in comparisons),'scoreDifference':describe([c['scoreDifference'] for c in comparisons]),'comparisons':comparisons}

for r in rows:
    c=r['checkpoints'][-1];failed=[x for x in r['runs'] if not x['won']];last=r['checkpoints'][-1]
    summary['perAccount'].append({'seed':r['seed'],'policy':r['policy'],'seconds':c['seconds'],'frontier':{'diff':c['difficulty'],'stage':c['stage'],'score':score(c)},'maxSameStageLossBlock':blocks(r['runs']),'maxZeroRewardRunBlock':blocks(r['runs'],True),'failedRunPotionUnits':sum(x['potionUnits']for x in failed),'failedRunPotionValue':sum(x['potionValue']for x in failed),'failedRunGold':sum(x['gold']for x in failed),'failedRunXP':sum(x['xp']for x in failed),'rawXpOpportunityForfeitedInFailedRounds':r['count']['failedRoundRawXp'],'rawXpUnmappedKilledMonsters':r['count']['failedRoundUnmappedKills'],'first':r['first'],'goldSpent':{'potion':r['count']['potionBuyGold'],'upgrade':r['count']['upgradeGold'],'build':r['count']['buildGold'],'research':r['count']['researchGold']},'potionConservation':20+r['count']['potionsBought']-r['count']['potionsConsumed']-sum(c['potions'].values()),'income':{'battle':r['count']['battleGold'],'commission':r['count']['commissionGold']},'actualChangedEquipButtons':r['count']['equipButtonsWithChanges']+r['count']['accessoryProxyChanges'],'actualEquipMoves':r['count']['equipMoves'],'wornSlotFills':sum(sum(not x.get('back') for x in e.get('changes',[]))for e in r['events']if e['kind']=='autoEquipChanged'),'craftableBooksUnused':[b['id'] for b in last['unused']['craftableBooks']],'currentGuide':last['unused']['guide']})
(OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'accounts':len(rows),'runs':summary['completedExpeditions'],'policies':{k:v['n']for k,v in summary['policies'].items()},'pairs':len(paired),'violations':len(summary['failedAccounts'])},ensure_ascii=True))
