"""Cross-check independent counters, state ownership, time and reproducibility."""
import csv
import json
from pathlib import Path
HERE=Path(__file__).resolve().parent
OUT=HERE.parent/'simulation'
def read(p):return json.loads(p.read_text(encoding='utf-8'))
rows=[read(p)for p in OUT.glob('*_seed*.json')]
checks=[]
def check(name,ok,detail=None):checks.append({'name':name,'ok':bool(ok),'detail':detail})
check('50 distinct primary accounts',len(rows)==50 and len({(r['seed'],r['policy'])for r in rows})==50)
for r in rows:
    c=r['checkpoints'][-1];n=r['count'];prefix=f"{r['policy']} seed {r['seed']}"
    check(prefix+' execution errors',not r['failures'],r['failures'])
    check(prefix+' online time budget',abs(n['waitingSec']+n['combatWallSec']-86400)<.001,n['waitingSec']+n['combatWallSec'])
    check(prefix+' potion units conserved',20+n['potionsBought']-n['potionsConsumed']==sum(c['potions'].values()))
    check(prefix+' every failed round paid no reward',all(x['xp']==0 and x['actualXp']==0 and x['gold']==0 and x['drops']==0 and x['blueprints']==0 for x in r['rounds']if not x['clear']))
    check(prefix+' raw failed-kill XP matched all killed monsters',n['failedRoundUnmappedKills']==0,n['failedRoundUnmappedKills'])
    check(prefix+' actual gained hero XP never negative',all(x['actualXp']>=0 for x in r['rounds']))
    check(prefix+' permanent frontier agrees with first clears',n['firstClears']==len(c['cleared'])+sum(len(ids)for ids in c['clearedIn'].values()))
    check(prefix+' initial level and level ups conserved',n['levelUps']==sum(c['levels'])-3)
    check(prefix+' round potion units agree with run totals',sum(x['potionUnits']for x in r['rounds'])==n['potionsConsumed'])

    # All resource additions are engine rewards. Remaining positive gold balance
    # after recorded sinks is laboratory income; no external credits are applied.
    inferredLab=c['gold']-600-n['battleGold']-n['commissionGold']+n['buildGold']+n['researchGold']+n['potionBuyGold']+n['upgradeGold']
    check(prefix+' gold sink closure not negative',inferredLab>=-1e-6,round(inferredLab,6))
    byId={}
    for e in r['events']:
        if e['kind']=='construct':
            expected=byId.get(e['id'],1 if e['id']in ('resource','library')else 0)+1
            check(prefix+' legal rank increment '+e['id']+str(e['rank']),e['rank']==expected)
            byId[e['id']]=e['rank']

for p in (OUT/'checkpoints').glob('state_*.json'):
    state=read(p);key=p.name.removeprefix('state_');snap=read(p.with_name(key));n=snap['count']
    actual=sum(not bool(i.get('box'))for i in state['items'].values())
    expected=6+n['drops']+n['boxesOpened']-n['salvaged']-n['overflow']
    check('owned gear conservation '+p.stem,actual==expected,{'actual':actual,'expected':expected})
info=read(OUT/'run_info.json')
check('frozen source unchanged',not info['frozen_source_changed'])
check('no browser exceptions',not info['errors'])
check('full day seed2 exact repeat',info['seed2_repeat_identical_except_runtime']is True)
parity=read(OUT/'loot_observer/main_parity.json')
check('six raw-loot observation reruns unchanged',all(x['identical_except_runtime_and_samples']for x in parity))
a=read(OUT/'basic_seed10.json');b=read(OUT/'critical_seed10/basic_seed10.json')
check('critical seed10 prefix exact repeat',a['runs'][:len(b['runs'])]==b['runs'])
result={'checks':len(checks),'passed':sum(x['ok']for x in checks),'failed':[x for x in checks if not x['ok']],'details':checks}
(OUT/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in result.items()if k!='details'},ensure_ascii=True))
