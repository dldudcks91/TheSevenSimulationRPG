import argparse
import json
from analyze_sweep import records
from run_sweep import BASE


def main(args):
    checks=[]
    def check(name,ok,detail=None):checks.append({'name':name,'ok':bool(ok),'detail':detail})
    for batch in records(BASE/args.phase):
        for r in batch['rows']:
            label=f"{batch['id']}/{r['seed']}/{r['policy']}"
            if r.get('error'):
                check(label+'execution',False,r);continue
            n=r['count'];g=r['final'];initial=r['initial']
            check(label+'execution',not r['failures'],r['failures'])
            expected=initial['resources']['gold']+n['battleGold']+n['commissionGold']-sum(n.get(k,0)for k in ['buildGold','researchGold','potionBuyGold','upgradeGold','shopGold','bookGold'])
            check(label+'gold ledger',g['resources']['gold']==expected,{'actual':g['resources']['gold'],'expected':expected})
            check(label+'potion units',sum(initial['potions'].values())+n['potionsBought']-n['potionsConsumed']==sum(g['potions'].values()))
            initial_gear=sum(not bool(i.get('box'))for i in initial['items'].values())
            check(label+'gear conservation',sum(not bool(i.get('box'))for i in g['items'].values())==initial_gear+n['drops']+n['boxesOpened']+n['shopItems']-n['salvaged']-n['overflow'])
            held=[u for bag in g['bags']for u in bag]+g['stash']+[u for h in g['heroes']for u in h['equipped'].values()if u]
            check(label+'unique owners',len(held)==len(set(held))and set(held)==set(g['items']))
            check(label+'failed rounds no rewards',all(not any(x[k]for k in ['xp','actualXp','gold','drops','blueprints'])for x in r['rounds']if not x['clear']))
            check(label+'dead identities',n['failedRoundUnmappedKills']==0)
            check(label+'timing',round((n['combatWallSec']+n['waitingSec'])*1000)==round(r['seconds']*1000))
            check(label+'chapter progress',r['won']==(1051 in g['progress']['cleared']))
            check(label+'book learning actions',n['booksLearned']==sum(e['kind']=='learnBook'for e in r['events']))
            for e in r['events']:
                if e['kind']=='learnBook'and e.get('source')=='owned':
                    check(label+'owned book actual spend',e['beforeGold']==e['afterGold']and sum(e['beforeBooks'].values())>sum(e['afterBooks'].values()))
    result={'checks':len(checks),'passed':sum(c['ok']for c in checks),'failed':[c for c in checks if not c['ok']],'details':checks}
    (BASE/'audit_validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items()if k!='details'},ensure_ascii=True))
    if result['failed']:raise SystemExit(1)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--phase',default='audit');main(parser.parse_args())
